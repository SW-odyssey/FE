# LOCAL UI 프리뷰

추천 목록, 조건 선택, 장소 상세와 지도 탐색을 확인하는 개발용 UI 프리뷰. 로컬 장소와 사진, 편집 설명 및 조건별 샘플로 실행한다.

개발 기준은 [화면과 데이터 범위](docs/PROJECT_CONTEXT.md), [결정과 연결 작업](docs/DECISIONS.md), [API 연결 명세](docs/API_INTEGRATION.md) 순서로 확인한다.

## 실행

Node.js는 `24.19.0`으로 맞춘다. Next `16.3.6`, React와 React DOM `19.2.8`은 현재 버전을 유지한다.

```sh
nvm install
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Windows에서는 Node.js 24.19.0을 설치한 뒤 PowerShell에서 `Copy-Item .env.example .env.local`로 빈 환경 파일을 만든다.

개발 주소는 `http://localhost:3000`이다. `/`, `/guide/`, `/design/tools/place-recommendation/`은 같은 최신 시안을 연다.

## 지도 키

`.env.local`의 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`에 본인 Kakao JavaScript 키를 넣고 개발 서버를 다시 실행한다. Kakao 앱의 웹 도메인에도 개발 주소를 등록한다.

키를 비워 둬도 목록, 조건 선택, 사진과 상세를 확인할 수 있다. 지도는 연결 안내와 장소 목록을 제공하고 상세의 미니 지도는 대체 영역으로 표시한다. `.env.example`에는 변수 이름과 빈 값만 포함된다. 공개 브라우저 키를 변경하면 프로덕션 빌드도 다시 생성한다.

같은 Wi-Fi의 휴대전화에서는 `npm run dev:network`를 실행하고 컴퓨터의 LAN 주소로 접속한다. 그 주소도 Kakao 웹 도메인에 등록한다.

## 명령

| 명령                   | 결과                                           |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | 로컬 개발 서버, 3000 포트                      |
| `npm run dev:network`  | 휴대전화 접속용 개발 서버, 3000 포트           |
| `npm run build`        | 프로덕션 빌드를 `.next/`에 생성                |
| `npm start`            | 프로덕션 서버, 3000 포트                       |
| `npm run lint`         | ESLint 검사                                    |
| `npm run typecheck`    | TypeScript 검사                                |
| `npm test`             | 조건, 언어, 지도와 시트의 순수 기능 테스트     |
| `npm run format`       | 소스, 테스트와 개발 문서 정리                  |
| `npm run check:format` | TypeScript, JSON, 테스트와 개발 문서 서식 확인 |

프로덕션 실행은 다음 순서다.

```sh
npm run build
npm start
```

`http://localhost:3000`에서 빌드 결과를 확인한다. 이 설정은 Next.js 서버 실행 방식이며 별도 백엔드 API는 연결할 작업이다.

`check:format`은 코드와 문서의 서식만 검사한다. 기존 스타일시트는 이 명령의 검사 대상에서 제외된다.

## 스타일 편집 위치

스타일 적용 순서는 기본 레이아웃, 유리 표면, 최신 시안 보정이다. `src/app/globals.css`가 `local-discovery.css`와 `local-glass.css`를 순서대로 읽고, 페이지에서 `local-refined.css`를 추가한다.

| 파일                                 | 편집할 내용                                 |
| ------------------------------------ | ------------------------------------------- |
| `src/styles/local-discovery.css`     | 아래 기본 조각의 import 순서                |
| `src/styles/preview/foundation.css`  | 폰트, 공통 초기값, 폰 프레임과 상태바       |
| `src/styles/preview/discovery.css`   | 검색, 조건, 추천 목록과 하단 탭의 기본 배치 |
| `src/styles/preview/detail.css`      | 장소 상세, 주소와 출처의 기본 배치          |
| `src/styles/preview/dialogs.css`     | 필터, 지역, 시간 선택과 언어 사이드바       |
| `src/styles/preview/map.css`         | 지도, 핀, 도구와 탐색 시트의 기본 배치      |
| `src/styles/preview/interaction.css` | 원본 후반의 입력 보강, 컨트롤 보정과 모션   |
| `src/styles/local-glass.css`         | 유리 표면, 투명도와 색감                    |
| `src/styles/local-refined.css`       | 현재 시안의 최종 배치와 상태 표현           |

기본 조각은 원래 연속 구간과 선언 순서를 보존한다. 같은 선택자의 실제 표시를 바꿀 때는 뒤에 적용되는 glass와 refined의 선언도 함께 확인한다.

## 확인할 흐름

1. 장소 목록에서 검색, 지역, 카테고리와 조건 변경.
2. 필터의 밀도 캡슐과 컨셉 칩 선택, 방문 시간 변경 후 한 번에 적용.
3. 상세에서 사진 탐색과 주소 확인, 지도 이동 후 이전 위치 복귀.
4. 넓은 지도 숫자 묶음은 확대, 가까운 50m 셀은 해당 장소 목록, 개별 핀은 장소 강조.
5. 지도 상단 카테고리와 목록의 조건 공유, 탐색 시트 조절.
6. 언어 버튼에서 한국어, 영어, 일본어와 중국어 UI 전환.

지도 시트의 기준 높이는 접힘 88px, 중간 320px, 전체 500px다. 핀 이름은 위아래 중앙에 최대 세 개를 표시하며 선택 장소를 우선한다. 필터 경유 시간 선택의 뒤로가기는 기존 필터 선택을 보존한다.

```text
/?view=discover&area=jongno&lang=ko
/?view=map&area=jongno&category=cafe&lang=ko
/?place=cheongsudang&lang=ko
```

## 코드 편집 위치

`src/app/`의 세 진입 페이지는 같은 `DiscoveryPreview`를 사용한다. 화면 컴포넌트는 렌더링을, controller는 조건과 화면 전환을, data source는 조회를 담당한다.

| 파일 또는 폴더                                                        | 편집할 내용                                         |
| --------------------------------------------------------------------- | --------------------------------------------------- |
| `src/features/discovery/DiscoveryPreview.tsx`                         | 폰 프레임, 목록과 지도 및 상세의 화면 조합          |
| `src/features/discovery/components/`                                  | 검색 헤더, 목록, 상세, 필터와 시간 선택의 화면 요소 |
| `src/features/discovery/hooks/useDiscoveryController.ts`              | 적용값과 임시값, 화면 이동, 상세 복귀와 읽던 위치   |
| `src/features/discovery/hooks/useDiscoveryData.ts`                    | 적용된 결과, 필터 임시 개수와 상세의 조회 상태      |
| `src/features/discovery/model.ts`                                     | 장소와 조건의 공통 화면 타입                        |
| `src/features/discovery/state/`                                       | URL 상태 복원과 직렬화                              |
| `src/features/discovery/filters.ts`, `visit-time.ts`, `visit-date.ts` | 조건과 방문 시간 계산                               |
| `src/features/discovery/localization.ts`, `presentation.ts`           | 번역 문구와 화면 라벨                               |
| `src/features/map/ExploreMap.tsx`, `useExploreMap.ts`                 | 지도 화면과 지도 수명 관리                          |
| `src/features/map/MiniMap.tsx`                                        | 상세의 미니 지도                                    |
| `src/features/map/PlaceSheet.tsx`, `sheet-motion.ts`                  | 지도 위 장소 목록과 시트 제스처                     |
| `src/features/map/clusters.ts`                                        | 장소 묶음과 핀 이름 배치                            |
| `src/features/map/kakao/`                                             | SDK 로드, 지도 세션, 셀과 핀 오버레이               |
| `src/components/ui/LocalIcon.tsx`                                     | 공통 아이콘                                         |

`useDiscoveryController`의 적용값과 필터 임시값을 구분해서 편집한다. 필터에서 방문 시간으로 들어갔다가 돌아오는 경우에는 임시값을 보존하며, 바깥 필터 적용 버튼에서 목록 조건을 확정한다. 지도는 같은 추천 결과를 사용하고 상세에서 복귀할 때 카메라와 목록 위치를 보존한다.

## 샘플과 API 연결

사진과 폰트는 `public/assets/`에 있고 사진 출처와 폰트 라이선스도 같은 경로에 보존한다. 상태바 SVG의 원본 출처는 [Apple 디자인 리소스](https://developer.apple.com/design/resources/)다. 현재 시안의 장소와 조건은 프론트엔드 샘플이다. 편집 설명과 인구 자료의 단위는 각 데이터의 원래 의미로 유지한다.

| 파일                                               | 데이터 연결 역할                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| `src/features/discovery/data/types.ts`             | `DiscoveryDataSource.query()`와 `getPlace()`의 화면 모델 및 취소 신호 |
| `src/features/discovery/data/preview.ts`           | 현재 로컬 장소, 사진과 편집 문구를 제공하는 기본 source               |
| `src/features/discovery/data/preview/`             | 로컬 장소, 사진 출처, 설명과 추천 계산의 샘플 fixture                 |
| `src/features/discovery/data/api-mapping.ts`       | 시안 값과 서버 query 8개, 숫자 ID의 변환                              |
| `src/features/discovery/data/query.ts`             | 같은 조건을 식별하는 안정적인 요청 키                                 |
| `src/features/discovery/data/latest-request.ts`    | 이전 요청 취소와 늦은 응답 차단                                       |
| `src/features/discovery/hooks/useDiscoveryData.ts` | 확정 결과, 임시 개수와 상세의 요청 상태 및 재시도                     |

HTTP 연결은 `DiscoveryDataSource`를 구현한 source를 만들고 `DiscoveryPreview`의 `source` prop으로 주입하는 지점에서 진행한다. controller가 이 source를 데이터 hook에 전달한다. 서버 응답은 이 인터페이스의 화면 모델로 변환한다. 목록과 지도는 같은 추천 결과를 사용하고 조건 변경 및 상세 복귀 상태를 함께 검증한다.

`api-mapping.ts`는 요청 변환과 직렬화까지 제공한다. 네트워크 호출과 meta 선택지 초기화는 연결할 작업이다. 북촌, 컨셉 등 합의가 필요한 선택은 반환된 `issues`로 확인하며, UI 슬러그와 서버 숫자 ID는 변환 함수를 통해 연결한다. 지원 값과 필드는 최신 서버 명세로 대조한다.

서버 연결 기준: [공통 규약 #28](https://github.com/SW-odyssey/BE/issues/28), [meta #29](https://github.com/SW-odyssey/BE/issues/29), [추천 #30](https://github.com/SW-odyssey/BE/issues/30), [상세 #31](https://github.com/SW-odyssey/BE/issues/31).
