# LOCAL 작업 안내

@AGENTS.md
@docs/PROJECT_CONTEXT.md
@docs/DECISIONS.md

| 확인할 내용 | 기준                                                               |
| ----------- | ------------------------------------------------------------------ |
| 실행 화면   | `src/app/page.tsx`와 `src/features/discovery/DiscoveryPreview.tsx` |
| 기본 데이터 | `src/features/discovery/data/preview.ts`의 샘플 공급부             |
| 실제 API    | BE #29~31의 세 GET, HTTP 공급부 연결 작업                          |
| 상태와 복귀 | 적용값과 임시값, URL, 읽던 위치와 지도 상태                        |
| 시간과 언어 | Asia/Seoul 날짜와 자동 슬롯, FE UI 사전 4언어                      |
| 데이터 해석 | 지역 단위 인구 지표, 화면의 숫자는 추천 장소 수                    |
| 키와 출처   | 기존 환경 설정과 공개 자료 출처 보존, 비밀 값은 서버에서 관리      |

구현 전 AGENTS.md의 실제 소스 경로를 확인한다. UI와 API의 차이는 docs/DECISIONS.md의 작업에 연결하고, 코드 변경 후 관련 테스트와 화면 조작을 대조한다.
