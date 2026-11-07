# LOCAL 개발 작업 기준

## 먼저 확인할 자료

| 내용               | 경로                                                                |
| ------------------ | ------------------------------------------------------------------- |
| 제품과 화면 범위   | `docs/PROJECT_CONTEXT.md`                                           |
| 결정과 연결할 작업 | `docs/DECISIONS.md`                                                 |
| 실행 버전과 명령   | `package.json`, `.nvmrc`                                            |
| 진입 화면          | `src/app/page.tsx`                                                  |
| 화면 조합          | `src/features/discovery/DiscoveryPreview.tsx`                       |
| 상태와 이동        | `src/features/discovery/hooks/useDiscoveryController.ts`            |
| URL 복원           | `src/features/discovery/state/preview-url.ts`                       |
| 데이터 경계        | `src/features/discovery/data/types.ts`                              |
| 샘플 공급부        | `src/features/discovery/data/preview.ts`                            |
| API 변환           | `src/features/discovery/data/api-mapping.ts`                        |
| 서울 날짜와 슬롯   | `src/features/discovery/visit-date.ts`                              |
| 지도와 예시 셀     | `src/features/map/geometry.ts`, `src/features/map/kakao/session.ts` |

현재 화면 동작은 코드와 테스트로 확인하고, API 요청 값은 [BE #28](https://github.com/SW-odyssey/BE/issues/28)과 [#29](https://github.com/SW-odyssey/BE/issues/29), [#30](https://github.com/SW-odyssey/BE/issues/30), [#31](https://github.com/SW-odyssey/BE/issues/31)을 대조한다.

## 구현 기준

| 영역        | 유지할 기준                                                         |
| ----------- | ------------------------------------------------------------------- |
| UI          | 추천 목록, 필터와 일시, 지역, 상세, 지도와 셀 목록의 연결           |
| 데이터      | 기본 공급부는 previewDataSource, 실제 HTTP 공급부는 연결 작업       |
| API 경계    | query와 응답 변환은 데이터 공급부에 배치, 컴포넌트는 화면 모델 사용 |
| 적용 상태   | 필터 임시값과 확정값 분리, 최종 적용 때 목록과 지도 함께 갱신       |
| 복귀        | URL, 읽던 위치, 선택 셀과 지도 카메라 상태 대조                     |
| 언어와 시간 | UI 사전 4언어, 서버 한국어 응답, Asia/Seoul 날짜와 자동 슬롯        |
| 지도 숫자   | 추천 장소 수, 50m 예시 셀과 실제 제공 격자의 출처 구분              |
| 자료 해석   | LG U+ 지역 단위 지표, 장소별 정보는 해당 출처로 연결                |
| 공용 함수   | 목적, 인자와 반환을 JSDoc `/** */`로 기록                           |
| 변경 범위   | 화면, 데이터, 지도와 스타일의 기존 모듈 경계 사용                   |

북촌과 명동, 컨셉과 음식점 전용 조건, slug와 숫자 ID의 차이는 `docs/DECISIONS.md`의 연결 작업에 반영한다. 샘플 추천 조건은 샘플 공급부 안에서 관리하고 실제 추천 기준은 BE 계약과 데이터 근거에 연결한다.

## 설정과 출처

1. 기존 로컬 키와 환경 설정 보존.
2. 브라우저 공개 지도 키는 허용 도메인으로 제한.
3. DB 접속정보, 서버 인증값과 REST 비밀 키는 서버 환경변수로 관리.
4. 공유 파일에는 변수명과 빈 예시값, 출처를 확인한 공개 자료만 기록.
5. 사진, 지도와 소개의 원문 및 저작자 출처 유지.
6. 실제 데이터 전환 시 필드, 단위, 원해상도, 결측과 데이터 버전 확인.

## 검수

`package.json`의 test, typecheck, lint와 build 명령을 변경 범위에 맞춰 실행한다. URL, 서울 날짜, 필터와 지도 상태는 `tests/`의 관련 테스트로 확인하고 화면 변경은 브라우저에서도 검수한다.

Next.js 동작은 설치된 버전의 안내를 먼저 확인한다.

| 내용                    | 로컬 안내                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| 클라이언트 경계         | `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` |
| URL과 브라우저 기록     | `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`       |
| 공개 키와 서버 환경변수 | `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`                    |
