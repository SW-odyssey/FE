# Odyssey - Frontend

유동인구 빅데이터 처리 및 분석 기반 웹 서비스 (SW기업연계 프리캡스톤)

## 기술 스택

- Next.js 16.3.4 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui (Base UI, Nova preset)

## 시작하기

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 결과를 확인할 수 있습니다.

`src/app/page.tsx`를 수정하면 자동으로 반영됩니다.

## 폴더 구조

src/
app/ # 라우팅 (App Router)
components/
ui/ # shadcn 컴포넌트
common/ # 직접 만든 공통 컴포넌트
lib/ # api.ts, utils.ts
types/ # 타입 정의
hooks/

## 환경 변수

`.env.local.example`을 참고하여 `.env.local` 파일을 생성하세요.

NEXT_PUBLIC_API_URL=http://localhost:8080

## 커밋 컨벤션

- `feat:` 기능 추가
- `fix:` 버그 수정
- `refactor:` 기능 변경 없는 코드 구조 개선
- `chore:` 설정/빌드 관련

## 배포

[Vercel](https://vercel.com)을 통해 배포되며, `main` 브랜치에 push하면 자동으로 재배포됩니다.
