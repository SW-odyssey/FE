# LOCAL 프론트엔드

추천 목록, 조건 선택, 장소 상세와 지도 탐색을 제공하는 모바일 퍼스트 웹 UI. 로컬 장소와 사진, 편집 설명 및 조건별 샘플로 실행한다.

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

개발 주소는 `http://localhost:3000`이다. `/`는 화면 너비와 안전 영역에 맞춰 표시되는 웹 앱이다. `/guide/`와 `/design/tools/place-recommendation/`은 같은 화면을 기기 프레임에 넣어 보여준다.

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

GitHub Actions는 PR에서 린트, 테스트, 타입 검사와 Pages 정적 빌드를 실행한다. `main`에 변경이 들어오면 검사를 통과한 `out/`을 Cloudflare Pages의 `local-odyssey` 프로젝트에 올린다. 운영 주소는 [local.hrxlou.com](https://local.hrxlou.com)이다. `/guide/`와 기존 시안 경로도 함께 배포된다.

배포에는 GitHub Actions의 `local-production` 환경을 사용한다. 이 환경은 `main`만 허용하며, `CLOUDFLARE_ACCOUNT_ID` 변수와 Pages 편집 권한을 가진 `CLOUDFLARE_API_TOKEN` 시크릿을 사용한다. 지도 키를 포함할 경우 저장소 변수 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`에 브라우저 공개 키를 등록한다.

같은 `main` 커밋을 다시 배포하려면 Actions에서 **FE CI/CD** 워크플로를 `main`으로 실행한다. GitHub Actions를 사용할 수 없을 때의 수동 배포 명령은 다음과 같다.

```sh
LOCAL_PAGES_BUILD=1 npm run build
wrangler pages deploy out --project-name local-odyssey --branch feat/mobile-first-ui
```

여기서 `--branch feat/mobile-first-ui`는 Cloudflare Pages의 운영 배포 이름이다. GitHub에서 리뷰에 사용하는 브랜치와는 별개다.

`check:format`은 코드와 문서의 서식만 검사한다. 기존 스타일시트는 이 명령의 검사 대상에서 제외된다.

## 스타일 편집 위치

`src/app/globals.css`가 공통 레이아웃과 유리 표면, 최신 시안 보정 스타일을 적용한다. `discovery-app*.css`는 웹 앱의 화면 크기와 안전 영역에 맞춰 배치를 조정한다.

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
| `src/styles/discovery-app*.css`      | `/`의 반응형 배치와 안전 영역               |

기본 조각은 원래 연속 구간과 선언 순서를 보존한다. 같은 선택자의 실제 표시를 바꿀 때는 뒤에 적용되는 glass와 refined의 선언도 함께 확인한다.

## 확인할 흐름

1. 장소 목록에서 검색, 지역, 카테고리와 조건 변경.
2. 필터의 밀도 캡슐과 컨셉 칩 선택, 방문 시간 변경 후 한 번에 적용.
3. 상세에서 사진 탐색과 주소 확인, 지도 이동 후 이전 위치 복귀.
4. 넓은 지도 숫자 묶음은 확대, 가까운 50m 셀은 해당 장소 목록, 개별 핀은 장소 강조.
5. 지도 상단 카테고리와 목록의 조건 공유, 탐색 시트 조절.
6. 언어 버튼에서 한국어, 영어, 일본어와 중국어 UI 전환.

지도 시트의 기준 높이는 접힘 88px, 중간 320px, 전체 500px다. 웹 앱에서는 화면이 짧을 때 시트 높이를 조정한다. 핀 이름은 위아래 중앙에 최대 세 개를 표시하며 선택 장소를 우선한다. 필터 경유 시간 선택의 뒤로가기는 기존 필터 선택을 보존한다.

대표 추천은 최대 5곳의 캐러셀이다. 장소 카드와 목록에는 한옥 같은 조건 태그를 덧붙이지 않는다. 사진 전체로 상세에 진입하며 사진 안의 점과 스와이프로 전환한다. 적용한 필터는 기존 2줄 상단의 필터 버튼의 작은 점으로 표시한다. 방문 날짜는 월간 달력, 시간대는 한 줄 4구간 세그먼트에서 고른다.

상세의 AI 추천 분석은 선택한 공간 조건과 시간대, 동네 분위기를 비교한 근거를 보조 안내 문구 없이 짧은 문장으로 표시한다. 현재는 예시 데이터이며 실제 인구 밀도나 영업 여부를 분석한 결과가 아니다. 실제 공급부의 근거가 없으면 임의의 이유를 생성하지 않는다. 원래 매장 소개와 출처는 장소 정보에 보존한다.

```text
/?view=discover&area=jongno&lang=ko
/?view=map&area=jongno&category=cafe&lang=ko
/?place=cheongsudang&lang=ko
```

## 코드 편집 위치

`/`는 `DiscoveryApp`을 직접 렌더링한다. 시안 경로는 `DiscoveryPreview`로 같은 앱을 감싼다. 화면 컴포넌트는 렌더링을, controller는 조건과 화면 전환을, data source는 조회를 담당한다.

| 파일 또는 폴더                                                        | 편집할 내용                                         |
| --------------------------------------------------------------------- | --------------------------------------------------- |
| `src/features/discovery/DiscoveryApp.tsx`                             | 목록, 지도, 상세와 오버레이의 화면 조합             |
| `src/features/discovery/DiscoveryPreview.tsx`                         | 시안 경로의 기기 프레임                             |
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

HTTP 연결은 `data/`에서 `DiscoveryDataSource`를 구현하고, `src/app/page.tsx` 아래의 작은 `"use client"` 진입 컴포넌트에서 같은 공급부 인스턴스를 `DiscoveryApp`의 `source` prop으로 넘기는 방식으로 진행한다. controller가 이 공급부를 데이터 hook에 전달한다. 서버 응답은 공급부에서 화면 모델로 변환한다. 첫 요청과 필터 요청을 보내는 조건, 운영 환경의 API 주소와 CORS는 [API 연결 순서](docs/API_INTEGRATION.md#adapter-연결-순서)를 확인한다.

`api-mapping.ts`는 요청 변환과 직렬화까지 제공한다. 네트워크 호출과 meta 선택지 초기화는 연결할 작업이다. 북촌, 컨셉 등 합의가 필요한 선택은 반환된 `issues`로 확인하며, UI 슬러그와 서버 숫자 ID는 변환 함수를 통해 연결한다. 지원 값과 필드는 최신 서버 명세로 대조한다.

서버 연결 기준: [공통 규약 #28](https://github.com/SW-odyssey/BE/issues/28), [meta #29](https://github.com/SW-odyssey/BE/issues/29), [추천 #30](https://github.com/SW-odyssey/BE/issues/30), [상세 #31](https://github.com/SW-odyssey/BE/issues/31).
