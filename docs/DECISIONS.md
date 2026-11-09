# LOCAL 개발 결정과 연결 작업

## 현재 코드 기준

| 항목             | 기준                                                     | 확인 위치                                           |
| ---------------- | -------------------------------------------------------- | --------------------------------------------------- |
| 화면             | 모바일 추천 목록에서 상세와 지도로 이어지는 LOCAL 프리뷰 | `src/features/discovery/DiscoveryPreview.tsx`       |
| 데이터 경계      | `DiscoveryDataSource`의 query와 상세 조회                | `src/features/discovery/data/types.ts`              |
| 기본 공급부      | 로컬 샘플과 동기 snapshot을 제공하는 `previewDataSource` | `src/features/discovery/data/preview.ts`            |
| 요청 상태        | 적용값과 임시값 분리, 최신 요청 결과 반영                | `src/features/discovery/hooks/useDiscoveryData.ts`  |
| 필터             | 밀도 단일 선택, 컨셉 복수 선택, 필터 경유 일시 보존      | `src/features/discovery/components/FilterSheet.tsx` |
| 언어             | 한국어, 영어, 일본어, 중국어 UI 사전                     | `src/features/discovery/localization.ts`            |
| 날짜와 자동 시간 | Asia/Seoul 날짜와 시간 슬롯                              | `src/features/discovery/visit-date.ts`              |
| URL              | 복원과 직렬화 순수 함수, 뒤로가기와 재진입 상태          | `src/features/discovery/state/preview-url.ts`       |
| 지도             | 현재 Kakao SDK의 지도와 미니 지도                        | `src/features/map/kakao/session.ts`                 |
| 배율별 표시      | 지역 묶음, 예시 셀, 장소 핀                              | `src/features/map/geometry.ts`                      |
| 시트             | 접힘, 중간, 전체 높이와 선택 셀 목록                     | `src/features/map/PlaceSheet.tsx`                   |
| 숫자 의미        | 그룹과 셀에 포함된 추천 장소 수                          | `src/features/map/geometry.ts`                      |

## 실제 API 연결 작업

| 항목      | 준비된 코드 또는 계약                                              | 남은 연결                                              |
| --------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| 초기 옵션 | [BE #29](https://github.com/SW-odyssey/BE/issues/29), BE main 반영 | meta 응답의 지역, 카테고리, 밀도와 날짜 범위 반영      |
| 추천      | [BE #30](https://github.com/SW-odyssey/BE/issues/30), OPEN         | HTTP 공급부, 목록과 cells 및 total 연결                |
| 상세      | [BE #31](https://github.com/SW-odyssey/BE/issues/31), OPEN         | 숫자 ID 조회, 서버 기본 정보와 googlePlaceId 연결      |
| 공통 응답 | [BE #28](https://github.com/SW-odyssey/BE/issues/28)               | success/data/error 처리와 오류별 복구 검증             |
| 요청 변환 | `mapDiscoveryQueryToApi()`                                         | 변환 결과와 미해결 선택을 HTTP 공급부에 연결           |
| ID 변환   | `mapDiscoveryIdToApi()`, `mapApiIdToDiscovery()`                   | 서버 ID와 화면 ID의 일관된 대응                        |
| 응답 기준 | `applied`, `total`, `items`, `cells`                               | `applied.visitDate/dayType/slot` 적용과 셀별 장소 묶기 |

현재 앱의 기본값은 샘플 공급부다. 세 GET의 실제 HTTP 연결과 Google 콘텐츠 조회는 별도 구현 작업이다.

## 연결 전 확정할 범위

| 항목             | 확정할 내용                                             | 확인할 코드와 계약                             |
| ---------------- | ------------------------------------------------------- | ---------------------------------------------- |
| 지역             | 북촌 UI와 명동 API의 노출, 지원 영역과 좌표 판정        | `data/api-mapping.ts`, BE #29와 #30            |
| 컨셉             | 한옥, 마당, 아늑함, 레트로의 데이터와 적용 범위         | `filters.ts`, BE #30                           |
| 음식점 조건      | foodType와 since 선택 UI, 카테고리 전환 시 기본값       | BE #29와 #30                                   |
| 일시             | meta 날짜 범위, 심야와 슬롯 경계                        | `visit-date.ts`, `visit-time.ts`, BE #29와 #30 |
| 지도             | Google Maps의 키와 허용 도메인, 배율별 묶음 및 셀 표시  | `src/features/map/`, BE #28과 #30              |
| 사진과 외부 정보 | Google Place ID 대응, 미제공 값과 조회 실패의 대체 상태 | BE #31, `PlaceDetail.tsx`                      |
| 소개와 요약      | 샘플 문구를 대체할 본문, 출처와 공급 경로               | `data/preview/copy.ts`, `PlaceDetail.tsx`      |
| 실제 자료        | LG U+ 필드와 지역 단위, 셀 대응 및 집계 검수            | 실제 수령 명세와 BE 데이터 공급부              |

## 자료와 설정 규칙

| 항목             | 적용 기준                                                 |
| ---------------- | --------------------------------------------------------- |
| 샘플과 실제 자료 | 공급부와 데이터 버전으로 구분                             |
| 인구 지표        | 지역 단위, 관측 기간과 출처 유지                          |
| 장소 수          | 목록과 선택 셀의 장소 개수로 계산                         |
| 사진과 소개      | 파일, 원문 링크와 저작자 출처 유지                        |
| 키와 도메인      | 기존 로컬 설정 보존, 브라우저 공개 키의 허용 도메인 확인  |
| 비밀 값          | 서버 환경변수 관리, 공유 파일은 빈 예시값 사용            |
| 변경 검수        | 화면 조작, query 변환, URL 복원과 데이터 해석을 함께 대조 |
