# API 연동

2026-11-27 기준. 운영 앱(`/`)은 Odyssey v2 API를 직접 호출하는 `liveDiscoveryDataSource`를 쓰고, `/guide`·디자인 도구만 동기 샘플 `previewDataSource`를 씁니다. 응답 필드는 [BE 응답 계약 #104](https://github.com/SW-odyssey/BE/pull/104)를 따르며, FE가 지금 읽지 않는 공개 필드도 삭제를 전제로 하지 않습니다.

후속 작업 추적: [FE #76](https://github.com/SW-odyssey/FE/issues/76). 아래 표의 「PR」은 이 문서 기준 변경이 들어간 PR입니다.

## 연결 상태

| 화면·기능                     | 요청                                                      | 코드                                                      | PR             |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------------------- | -------------- |
| 서비스 메타(배치·지역·시간대) | `GET /api/v2/meta` 1회 공유                               | `data/service-meta.ts`, `hooks/useServiceMeta.ts`         | #90            |
| 지역 전체 탐색                | `GET /api/v2/area-recommendations` (페이지)               | `data/live-recommendations.ts`                            | #91            |
| 목록 카드 추천 이유           | `GET /api/v2/cells/reasons` (페이지당 1회)                | `data/live-recommendations.ts`, `cell-reasons.ts`         | #103           |
| 지도 중심·내 위치 주변 추천   | `GET /api/v2/recommendations` (반경 300m, 최대 30곳)      | `data/live-recommendations.ts`                            | #91, #93       |
| 상호 검색·자동완성            | `GET /api/v2/place-search`                                | `data/place-search.ts`                                    | #92            |
| 장소 상세                     | `GET /api/v2/places/{id}?lang`                            | `data/course-api.ts` `getCoursePlaceDetail`               | #97            |
| 방문 그래프                   | `GET /api/v2/cells/{id}/visit-pattern`                    | `data/visit-pattern.ts`                                   | 기존           |
| 코스                          | `GET /api/v2/course-recommendations`                      | `data/course-api.ts`, `hooks/useCourseRecommendations.ts` | #95, #96       |
| 사진·영업정보                 | FE 서버 `GET /api/place-photos` → Google Places           | `server/place-photos.ts`                                  | #98, #99, #100 |
| AI 요약                       | FE 서버 `POST /api/place-summary` → Gemini Maps Grounding | `server/place-summary.ts`                                 | #98, #99, #100 |
| 추천 검토 화면                | FE 서버 `/api/recommendation-review` → 외부 Sites         | `functions/api/recommendation-review.ts`                  | #101           |

v1 경로(`/api/v1/*`)는 BE에서 제거됐고([BE #99](https://github.com/SW-odyssey/BE/pull/99)), FE의 v1 전용 변환도 제거했습니다(#89).

## 메타와 배치

- 목록·코스·상세가 같은 로더(`loadServiceMeta`)를 공유합니다. 진행 중 요청과 성공 응답을 재사용하고 실패하면 다음 호출이 다시 요청합니다. 배치 404를 받으면 공유 메타를 무효화합니다.
- 첫 진입은 `defaultDatasetId`. 기본값이 없으면 `referenceMonth`가 가장 늦은 배치를 고르며 `datasets` 배열 순서에 의존하지 않습니다. 공개 배치가 없으면 오류 화면과 다시 시도.
- 코스 링크(`courseDataset`)의 배치가 메타에 없으면 seed·교체 이력을 재생하지 않고 기본 배치로 새 코스를 만듭니다.
- 선택 배치의 `referenceMonth`를 목록·코스·방문 그래프에 「LG U+ 2025년 12월 데이터 기준」으로 표시합니다.

## 지역

- ID와 중심 좌표는 `areas`에서 읽습니다: `jongno`, `ikseon`, `insadong`, `euljiro`, `myeongdong`. 네 언어 표기는 `presentation.ts`의 `areaLabels`이고, 사전에 없는 새 ID는 서버 한국어 이름으로 표시합니다.
- `전체 지역`(`all`)은 논리 옵션입니다. 지역 탐색에서는 `areaId`를 보내지 않고, 코스 출발점은 공개 지역 중심의 평균입니다.
- 이전 URL: `insa`→`insadong`, `eulji`→`euljiro`, `bukchon`과 알 수 없는 값→`all`.
- 장소 응답의 `areaId`를 `LocalPlace.area`로 보존해 카드·상세에 지역명을 표시합니다(법정동 기준 BE 매핑을 그대로 따름).

## 시간대와 요일

- 자동 시간은 메타 `slotWindows`로 판단합니다(11~13, 14~17, 18~21, 22~익일 01시, 시작 포함·끝 제외). 메타 전과 미리보기만 같은 값의 기본 창을 씁니다(`visit-time.ts`).
- 창 사이(예: 07:00, 13:00~14:00, 01:00 이후)는 「다음 · 점심 11:00」과 자료 없음 안내를 표시하고 다음 창으로 요청합니다.
- 자동 현재 시각의 자정~01:00은 전날 심야로 요청합니다. 토요일 00:30 → `weekday=fri&slot=late_night`. 사용자가 고른 날짜·시간대는 그날 그대로입니다.
- 화면 슬롯 `evening`·`late`는 API `dinner`·`late_night`입니다(`v2Time`).

## 목록 두 경로

| 경로                   | 언제                      | `total`                       | 페이지                                                          |
| ---------------------- | ------------------------- | ----------------------------- | --------------------------------------------------------------- |
| `area-recommendations` | 좌표 없이 지역 탐색       | 지역·조건·종류의 전체 일치 수 | `page`(0부터)·`size=30`·`hasNext`, 「장소 더 보기」로 이어 붙임 |
| `recommendations`      | 지도 재검색 좌표, 내 위치 | 이번에 받은 수(≤30)           | 없음                                                            |

- 목록 카드의 추천 이유: 지역·주변 목록의 한 페이지마다 `GET /api/v2/cells/reasons`를 1회(서로 다른 `cellId` 최대 30개) 요청하고, 목록과 같은 `datasetId`·`weekday`·`slot`을 보냅니다. `AVAILABLE` 칸의 알려진 코드만 서버 순서대로 최대 두 개 표시하고(`cell-reasons.ts`), 「더 보기」에서는 새로 나온 칸만 묻습니다. 이유 조회가 실패하면 목록은 그대로 두고 이유만 생략합니다. 상호 검색은 시간과 무관해 이유를 붙이지 않으며, 장소 상세에도 표시하지 않습니다.
- 문구는 BE 안내를 따릅니다: 비교 대상은 주변이 아니라 전체 칸이고, 연령 코드는 매장 손님 연령 비율이 아니라고 함께 적습니다.
- 탭: 전체 `categories=food,cafe`(주점은 food), 음식점 `food`, 카페 `cafe`. 지역 경로는 서버가 쇼핑·놀거리를 빼고, 주변 경로는 FE가 뺍니다.
- 지역·카테고리·시간·언어가 바뀌면 누적 페이지를 버리고 진행 중인 요청을 abort합니다. 늦은 응답은 `createLatestRequest`로 무시합니다.
- 지도 재검색은 지도에서 가려지지 않은 영역의 중심 좌표를 보내며, 버튼과 결과 문구에 「지도 중심 300m」를 표시합니다. 화면 영역 전체 조회는 별도 BE 계약이 필요합니다.

## 상호 검색

- `q`·`lang`·`limit`으로 서버를 조회하고 서버 순서와 ID를 그대로 씁니다. 위치·시간·점수를 적용하지 않아 주점·쇼핑·놀거리도 나옵니다. 카페·음식점 탭만 종류를 좁힙니다.
- 입력 250ms 정지 후 요청, IME 조합 중에는 대기, 공백은 요청하지 않음. 자동완성은 같은 응답의 앞 6개를 써서 검색어당 1회 요청입니다.
- 정적 상호 사전(`public/data/place-search.json`)은 제거했습니다.

## 장소 상세와 샘플 분리

- 운영 상세는 서버 필드만 씁니다. 숫자가 아닌 ID(샘플 slug)는 「장소 정보를 찾을 수 없어요」입니다.
- 샘플 소개·출처를 Google Place ID로 붙이는 동작은 `/guide` 전용 `getPreviewCoursePlaceDetail`에만 있습니다.

## 코스

- 정류장의 `position`·`slot`·`walkMinutes`·`hoursUnknown`·`place.distanceMeters`와 `reasons`를 보존합니다. 이유는 서버 순서의 앞 두 개를 네 언어로 표시하고, 알 수 없는 코드는 버립니다(`course-reasons.ts`).
- 언어만 바꾸면 코스를 다시 요청하지 않고 `places/{id}?lang`으로 이름만 바꿉니다. 지도 SDK 때문에 페이지를 다시 불러오는 경우에도 history 상태로 코스를 넘겨 다시 요청하지 않습니다.

## FE 서버(사진·요약)

| 변수                                                      | 위치                   | 설명                                                                   |
| --------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_ODYSSEY_API_BASE_URL`                        | 브라우저 빌드          | 비우면 운영 API. 값이 잘못되면 운영으로 대체하지 않음                  |
| `ODYSSEY_API_BASE_URL`                                    | Next 서버·Pages 런타임 | 사진·요약의 장소 조회. 없으면 위 값, 그것도 없으면 운영                |
| `PLACE_ALLOWED_HOSTS`                                     | Next 서버·Pages 런타임 | 쉼표 구분, `*.프로젝트.pages.dev` 허용. 비우면 운영 도메인과 localhost |
| `GOOGLE_PLACES_API_KEY`, `GEMINIAI_API_KEY`               | 서버 비밀              | 공유 파일에는 이름과 빈 값만                                           |
| `PLACE_PHOTOS_RATE_LIMITER`, `PLACE_SUMMARY_RATE_LIMITER` | Pages 바인딩(선택)     | 인스턴스 사이에 공유되는 요청 한도                                     |
| `REVIEW_ACCESS_TEAM_DOMAIN`, `REVIEW_ACCESS_AUD`          | Pages 런타임(선택)     | 검토 화면·API의 Cloudflare Access 토큰 검증                            |

- 요청 한도: Odyssey 조회와 Google·Gemini 호출 전에 확인하고 초과 시 429·`Retry-After`. 바인딩이 없으면 인스턴스별 한도만 동작합니다(#98).
- 장소 기본 정보 조회는 origin·ID별로 60초 공유하고, Pages에서는 위치별 Cache API에도 저장합니다. Google·Gemini 응답은 저장하지 않습니다(#100).
- Gemini 요약은 해당 Google Place ID를 인용한 결과만 원문·출처와 함께 표시합니다.

## 확인 중인 항목

| 항목                                                                       | 상태             | 이슈 |
| -------------------------------------------------------------------------- | ---------------- | ---- |
| Cloudflare 요청 한도 규칙·바인딩, Google·Gemini 일일 한도와 비용 알림      | 운영 적용 미확인 | #81  |
| 스테이징 빌드·런타임 변수가 같은 BE·호스트를 가리키는지                    | 미확인           | #82  |
| 검토 화면·API의 Access 정책, 외부 Sites 직접 접근 제한, 중계 503 원인 확정 | 미적용·미확인    | #84  |
| 원본 U+ 데이터의 자정 이후 요일 집계 근거                                  | 분석 범위        | #76  |

## 검수 방법

- `npm test`, `npm run typecheck`, `npm run lint`, `LOCAL_PAGES_BUILD=1 npm run build` 후 `out/index.html`·`out/manifest.webmanifest`.
- 요청 흐름은 브라우저 Resource Timing 또는 fetch 래퍼로 경로·횟수·순서와 abort 여부를 대조합니다. 각 PR 본문에 사용한 URL과 결과를 남겼습니다.
- `mock/v2/mappings/`는 BE 계약 비교용 WireMock 응답(메타·장소 상세·방문 그래프)입니다. 앱 코드와 테스트는 이 목을 읽지 않으며, 운영 배치 ID를 구현에 고정하지 않습니다.
