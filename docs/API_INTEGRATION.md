# API 연동

## 연결 상태

| 대상            | 현재 상태                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 화면 데이터     | `previewDataSource`의 동기 샘플 사용                                                                                                         |
| FE HTTP adapter | 미구현. `DiscoveryDataSource` 교체 경계 준비                                                                                                 |
| BE 초기 옵션    | `GET /api/v1/meta` main 반영, [PR #35](https://github.com/SW-odyssey/BE/pull/35) 병합                                                        |
| BE 추천과 상세  | main 미반영. [추천 #30](https://github.com/SW-odyssey/BE/issues/30), [상세 #31](https://github.com/SW-odyssey/BE/issues/31)의 연결 명세 사용 |
| 지도            | 카카오 기반 프리뷰. 서비스 연결은 Google Maps로 전환                                                                                         |

규격: [공통 응답 #28](https://github.com/SW-odyssey/BE/issues/28), [선택 옵션 #29](https://github.com/SW-odyssey/BE/issues/29), [추천 #30](https://github.com/SW-odyssey/BE/issues/30), [장소 상세 #31](https://github.com/SW-odyssey/BE/issues/31).

## 화면과 요청

| 화면                           | 요청                          | 사용처                                   |
| ------------------------------ | ----------------------------- | ---------------------------------------- |
| 첫 진입, 지역과 방문 시간 선택 | `GET /api/v1/meta`            | 선택지, 기본값, 서울 날짜 범위           |
| 추천 목록과 검색               | `GET /api/v1/recommendations` | 장소와 추천 순서                         |
| 필터                           | `GET /api/v1/recommendations` | 임시 조건의 `total`, 적용 후 목록과 지도 |
| 지도와 선택 구역 목록          | 추천 응답 재사용              | 장소 좌표, 셀 경계와 구역별 장소         |
| 장소 상세와 직접 링크          | `GET /api/v1/places/{id}`     | 서버 기본 정보와 주소                    |
| 카드 사진과 상세 사진          | Google Places                 | 추천 또는 상세의 `googlePlaceId`로 조회  |
| 언어 선택                      | FE 사전 전환                  | 같은 서버 응답 재사용                    |

`meta`는 파라미터가 없다. `areas`, `categories`, `foodTypes`, `since`, `slots`, `densities`의 각 옵션은 `id`, `label`, `isDefault`다. `timeZone=Asia/Seoul`, `supportedLanguages=[ko]`, `visitDate.min/max`, `maxResults=200`도 받는다. 선택지와 초기값을 이 응답에 연결할 meta loader가 필요하다.

## 추천 요청 8개

| query       | 허용값                                                         | 생략 기본값 |
| ----------- | -------------------------------------------------------------- | ----------- |
| `areaId`    | `all`, `jongno`, `ikseon`, `insadong`, `euljiro`, `myeongdong` | `all`       |
| `category`  | `all`, `food`, `cafe`                                          | `all`       |
| `foodType`  | `any`, `korean`, `bar`                                         | `any`       |
| `since`     | `any`, `20`, `30`, `40`                                        | `any`       |
| `visitDate` | 서울 오늘부터 6일 뒤까지 `YYYY-MM-DD`                          | 서울 오늘   |
| `slot`      | `lunch`, `afternoon`, `dinner`, `late_night`                   | `afternoon` |
| `density`   | `any`, `less_busy`, `lively`                                   | `any`       |
| `q`         | 가게 이름 부분 일치, 대소문자 무시, 최대 80자                  | 빈 값       |

`foodType`과 `since`는 음식점에서 표시하고 전송한다. `since=20`은 개업 후 20년 이상인 가게의 조건이고, 응답 `since=1995`는 개업 연도다. 사람의 나이 필터와 구분한다.

## UI 값 변환

변환 코드는 `src/features/discovery/data/api-mapping.ts`에 있다. 순수 변환 함수이며 HTTP 호출은 수행하지 않는다.

| UI 값             | HTTP 값                | 연결 작업                                           |
| ----------------- | ---------------------- | --------------------------------------------------- |
| `insa`, `eulji`   | `insadong`, `euljiro`  | 응답 지역의 역변환도 추가                           |
| `evening`, `late` | `dinner`, `late_night` | URL과 시간 휠은 UI 값 유지                          |
| `activity=quiet`  | `density=less_busy`    | `any`, `lively`도 대응                              |
| 문자열 장소 ID    | 숫자 `id`              | `mapApiIdToDiscovery`, `mapDiscoveryIdToApi`로 왕복 |
| 상대 날짜 `day`   | 절대 날짜 `visitDate`  | `visitDate(clock, day)` 사용, 자동 시간은 `day=0`   |
| 기기 시각         | 서울 시각              | `seoulHour(clock)`으로 현재 슬롯 계산               |
| UI 언어 4개       | 서버 `ko`              | UI 사전과 장소 원문을 분리                          |

샘플의 `cheongsudang` 같은 slug와 실제 서버 ID의 대응은 별도다. URL에는 실제 응답 ID를 보존하고, DB마다 달라질 수 있는 예제 번호를 고정값으로 쓰지 않는다.

북촌은 mapper의 `UNMAPPED_AREA` 대상이다. 명동은 서버 옵션에 있으므로 UI 지역 타입, 표시명과 URL 처리에 추가해야 한다. 두 지역의 범위를 확인한 뒤 연결한다.

컨셉 칩의 한옥, 마당, 아늑함, 레트로는 현재 샘플 필터다. 선택된 컨셉은 mapper가 `UNSUPPORTED_CONCEPT_FILTER`로 반환한다. 음식점 종류와 개업 연수의 화면 배치 및 상태를 추가하고, 컨셉의 실제 데이터와 요청 규격은 별도로 정한다.

샘플 검색은 이름, 주소와 소개를 함께 검색한다. HTTP 연결 후 검색 범위는 서버의 가게 이름이다. `origin`과 UI 언어는 추천 query에 포함하지 않는다.

## 서버 응답에서 UI 모델로

성공은 `success=true`, `data=객체`, `error=null`이다. 실패는 `success=false`, `data=null`, `error={code,message}`다.

| 서버 데이터                                         | UI 연결                                                     |
| --------------------------------------------------- | ----------------------------------------------------------- |
| 추천 `data.applied`                                 | 서버 적용 `visitDate`, `dayType`, `slot` 대조               |
| 추천 `data.total`, `items`                          | `DiscoveryQueryResult.total`, `items`                       |
| 카드 `id`, `name`, `category`                       | 문자열 UI ID, 장소 이름과 유형                              |
| 카드 `areaId`, `point`                              | UI 지역, 평탄화한 `lat`, `lng`                              |
| 카드 `foodType`, `since`, `googlePlaceId`, `cellId` | 실제 응답을 보존하도록 UI 모델 확장                         |
| 추천 `data.cells`                                   | 실제 셀 ID와 GeoJSON 보존 경로 추가                         |
| 상세 `data`                                         | 카드 필드와 `address`를 `DiscoveryPlaceDetail.place`로 변환 |
| 외부 사진과 출처                                    | `photos`, `photoCredits`, `sourceUrl` 구성                  |

추천 응답의 필드는 `applied`, `total`, `items`, `cells`다. `applied`는 날짜, 요일 묶음과 슬롯만 담는다. `items`의 순서가 추천 순서이고, `total`은 항목 수다. `cells`는 숫자 ID 오름차순이다.

상세의 HTTP `data` 자체가 장소 객체다. 포트 반환값의 `place`는 FE 내부 모델이며 adapter에서 만든다. 카드와 상세의 필수 필드를 나누고, 주소는 상세 응답에서 채운다. 서버 이름과 주소는 한국어 원문으로 표시한다.

현재 `DiscoveryQueryResult`는 `items`, `total`만 담는다. HTTP adapter 연결 시 `applied`와 `cells`를 함께 보존할 타입과 상태가 필요하다. `LocalPlace`의 샘플 사진, 소개와 요약은 실제 응답과 외부 콘텐츠에 맞춰 공급한다.

## 사진과 지도

| 항목             | 연결 방법                                             |
| ---------------- | ----------------------------------------------------- |
| 카드 사진        | `items[].googlePlaceId`로 Google Places 조회          |
| 상세 콘텐츠      | 상세의 `googlePlaceId`로 사진, 리뷰와 영업시간 조회   |
| Google ID `null` | 사진과 외부 정보의 대체 영역 표시                     |
| 사진 0장         | `PhotoGallery`의 빈 상태 사용                         |
| 사진 목록 변경   | 현재 사진 유지와 인덱스 보정, 실제 출처 표시          |
| 장소 위치        | `point={lat,lng}`, WGS84                              |
| 셀 경계          | `cells[].geometry`의 닫힌 Polygon, 좌표는 `[lng,lat]` |
| 셀 장소 목록     | `items` 중 같은 `cellId`인 장소를 추천 순서로 표시    |

실제 지도 경로는 서버의 셀 ID와 geometry를 사용한다. 현재 `src/features/map/geometry.ts`의 `previewCell`은 샘플용 좌표 계산이다. `DiscoveryQueryResult`와 지도 세션 입력을 확장한 뒤 `features/map/controller.ts` 경계에 Google 구현을 연결한다.

셀과 군집에 표시할 수는 추천 장소 수다. LG U+ 지표는 구역 단위의 추천 근거이며, 개별 가게 방문자 수나 현재 실시간 인원으로 해석하지 않는다.

요약은 현재 편집 샘플 문구다. 실제 요약의 공급 방식과 미제공 표시, 외부 사진의 유형 미확인 표시를 정해야 한다. `sourceUrl`은 확인된 출처로 채우고 미제공 링크의 표시도 처리한다.

## adapter 연결 순서

1. 서버 주소와 CORS를 확인하고 `meta` loader를 선택지 및 날짜 범위에 연결.
2. `DiscoveryDataSource.query/getPlace`의 HTTP 구현 추가. `AbortSignal` 전달, 공통 응답 해제, 숫자 ID와 UI 모델 변환.
3. 클라이언트 경계에서 `DiscoveryPreview`의 `source`에 HTTP 공급자 주입. 동기 `snapshot`은 preview 전용으로 유지.
4. 추천 결과의 `applied`, 실제 셀과 Google ID를 보존하고 지도 및 사진 공급 연결.
5. 정상, 0건, 오류와 외부 정보 누락을 같은 입력으로 검증.

`useDiscoveryData`는 applied, draft와 상세의 상태를 분리한다. 조건 변경과 화면 이탈 때 요청 취소, 늦은 응답 무시, `retry()`를 통한 활성 요청 재실행을 처리한다. 같은 applied와 draft 조건은 응답을 공유한다. `snapshot` 공급자는 첫 렌더부터 값을 주고 재시도에서도 비동기 호출을 생략한다.

| HTTP 또는 상태                         | 연결할 처리                            |
| -------------------------------------- | -------------------------------------- |
| 200, `total=0`, `items=[]`, `cells=[]` | 요청 조건 유지, 빈 결과와 초기화       |
| 400 `INVALID_INPUT`                    | 해당 입력 수정                         |
| 400 `QUERY_SCOPE_TOO_WIDE`             | 200곳 상한에 맞춰 지역이나 조건 좁히기 |
| 404 `PLACE_NOT_FOUND`                  | 장소 없음 안내와 목록 복귀             |
| 503 `DATA_UNAVAILABLE`                 | 같은 조건 재시도                       |
| 500 `INTERNAL_ERROR`                   | 일반 오류와 재시도                     |

현재 화면의 `ResourceNotice`는 공통 로딩, 실패와 상세 누락을 구분한다. HTTP adapter는 서버 오류 코드를 보존하고 코드별 입력 복구와 안내를 연결해야 한다.
