# LOCAL 프론트엔드 개발 기준

## 실행 기준

| 항목          | 현재 상태                                           |
| ------------- | --------------------------------------------------- |
| 서비스        | LOCAL, 팀 오디세이                                  |
| 용도          | 승인된 모바일 UI 프리뷰와 개발 인계                 |
| 클라이언트    | Next.js, React, TypeScript                          |
| 시작 화면     | 추천 목록, 기본 지역 종로                           |
| 데이터 공급부 | `previewDataSource`, 로컬 장소와 사진 및 소개 샘플  |
| 조회 경계     | `DiscoveryDataSource.query()`와 `getPlace()`        |
| HTTP          | 세 GET의 요청과 응답을 연결할 공급부 구현 단계      |
| 지도          | 현재 Kakao Maps SDK, 브라우저 키와 도메인 설정 사용 |

`/`, `/guide`, `/design/tools/place-recommendation`은 같은 프리뷰로 진입한다.

## 화면과 상태

| 화면             | 동작                                                    | 코드                                                |
| ---------------- | ------------------------------------------------------- | --------------------------------------------------- |
| 추천 목록과 검색 | 같은 검색어, 지역과 조건으로 장소 탐색                  | `DiscoverScreen.tsx`, `SearchHeader.tsx`            |
| 필터             | 밀도 단일 선택, 컨셉 복수 선택, 결과 수 미리보기        | `FilterSheet.tsx`                                   |
| 지역             | 전체, 종로, 익선동, 인사동, 을지로, 북촌 선택           | `AreaSheet.tsx`                                     |
| 방문 시간        | 날짜와 슬롯 선택, 조건 바 진입과 필터 경유 구분         | `VisitTimeSheet.tsx`                                |
| 장소 상세        | 사진, 소개, 주소와 출처, 지도에서 보기                  | `PlaceDetail.tsx`, `PhotoGallery.tsx`               |
| 지도와 셀 목록   | 배율별 묶음, 50m 예시 셀과 장소 핀, 선택 셀의 장소 목록 | `MapScreen.tsx`, `ExploreMap.tsx`, `PlaceSheet.tsx` |
| 언어             | 한국어, 영어, 일본어, 중국어 UI 사전                    | `LanguageSheet.tsx`, `localization.ts`              |
| 복귀             | 적용 조건, 읽던 위치와 지도 탐색 상태 복원              | `useDiscoveryController.ts`, `preview-url.ts`       |

컴포넌트는 `src/features/discovery/components/`, 지도는 `src/features/map/`에 있다.

| 상태                  | 사용처                                                                          |
| --------------------- | ------------------------------------------------------------------------------- |
| 적용 조건             | 목록, 지도와 결과 수                                                            |
| 필터 임시값           | 필터와 필터에서 연 방문 시간, 개수 미리보기                                     |
| 최종 적용             | 장소 N곳 보기에서 조건을 함께 반영                                              |
| URL                   | 화면, 지역, 장소 ID, 언어, 검색어, 카테고리, 일시, 밀도, 컨셉, 패널과 시트 높이 |
| 언어 우선순위         | URL, 유효한 저장값, 영어 기본값                                                 |
| 요청 날짜와 자동 슬롯 | `visitDate()`와 `seoulHour()`의 Asia/Seoul 기준                                 |
| 지도 시트             | 접힘 88px, 중간 320px, 전체 500px                                               |

내 위치 버튼은 현재 프리뷰의 종로 기본 영역으로 이동한다.

## 샘플과 데이터 해석

| 항목        | 해석과 연결 기준                                                  |
| ----------- | ----------------------------------------------------------------- |
| 추천 목록   | 로컬 장소 fixture에 검색, 지역, 카테고리와 샘플 추천 조건 적용    |
| 방문 날짜   | 조회 모델에 전달, 샘플 추천 순서는 시간 슬롯과 샘플 조건으로 재현 |
| 사진과 소개 | 로컬 사진 manifest, 준비된 소개와 요약 문구 및 출처               |
| 지도 숫자   | 현재 조건에 맞는 장소 수                                          |
| 50m 예시 셀 | `previewCell()`이 장소 좌표로 생성한 예시 격자                    |
| LG U+ 자료  | 지역 단위 인구 지표, 실제 제공 필드와 집계 단위 확인 후 연결      |
| 원본 자료   | 출처, 관측 기간, 좌표계, 원해상도와 결측 구분 유지                |
| 매장 정보   | 장소별 출처와 좌표로 연결, 매장 방문량 표시는 별도 근거 확보      |

샘플 공급부와 실제 데이터 공급부를 구분하고, 연결 검수에는 사용한 데이터 버전을 기록한다.

## BE 연결 기준

| 근거                                                 | 용도                          | 연결 상태                       |
| ---------------------------------------------------- | ----------------------------- | ------------------------------- |
| [BE #28](https://github.com/SW-odyssey/BE/issues/28) | 공통 응답과 요청 값 규약      | 계약 참조                       |
| [BE #29](https://github.com/SW-odyssey/BE/issues/29) | `GET /api/v1/meta`            | BE main 반영, FE HTTP 연결 작업 |
| [BE #30](https://github.com/SW-odyssey/BE/issues/30) | `GET /api/v1/recommendations` | OPEN, HTTP 연결 작업            |
| [BE #31](https://github.com/SW-odyssey/BE/issues/31) | `GET /api/v1/places/{id}`     | OPEN, HTTP 연결 작업            |

`data/api-mapping.ts`에는 query와 ID 변환 함수가 있다. 실제 HTTP 호출과 응답 모델 연결은 공급부에서 구현할 작업이다.

| 항목          | UI 프리뷰                    | BE 계약                                    | 연결할 작업                                                      |
| ------------- | ---------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| 지역          | `insa`, `eulji`, `bukchon`   | `insadong`, `euljiro`, `myeongdong`        | 앞의 두 코드 변환 사용, 북촌과 명동 노출 및 범위 확정            |
| 밀도와 컨셉   | `activity`, `spaces`         | `density`, 음식점의 `foodType`과 `since`   | 밀도 변환 사용, 컨셉의 데이터 및 적용 범위와 음식점 선택 UI 확정 |
| 일시          | `day`, `evening`, `late`     | `visitDate`, `dinner`, `late_night`        | 서울 날짜와 슬롯 변환, meta 날짜 범위 검증                       |
| 언어          | UI 사전 4언어                | 한국어 응답                                | UI 문구 전환과 서버 기본 정보 표시 연결                          |
| 장소 ID       | `cheongsudang` 같은 slug     | 숫자 ID                                    | 서버 ID 대응과 상세 경로 연결                                    |
| 셀            | 좌표로 만든 예시 셀          | `cells[].id`, `geometry`, `items[].cellId` | 서버 셀 경계 적용, `items[].cellId`로 장소 묶기                  |
| 지도와 콘텐츠 | Kakao 지도, 로컬 사진과 소개 | Google Maps, 추천과 상세의 googlePlaceId   | 지도 전환, Google Places 사진과 리뷰 및 영업시간 연결            |

추천 요청의 지원 키는 `areaId`, `category`, `foodType`, `since`, `visitDate`, `slot`, `density`, `q`다. 음식점의 `foodType`과 `since`는 `category=food`에서 사용한다.
