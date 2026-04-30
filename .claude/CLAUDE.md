# Paperstock 프로젝트 가이드

## 프로젝트 개요

한국어 모의투자 서비스 **"Paperstock — 진짜 시장에서 연습하세요"** 의 마케팅 사이트 + 앱 대시보드 + REST API 모노레포.
사용자는 회원가입·로그인 후 `/app/*` 의 Portfolio · Markets · Watchlist · History 화면에서 모의투자를 진행한다.

## 스택

- **프론트**: Vite 5 + React 18 + TypeScript(strict) + React Router 6 + CSS Modules + Storybook 8
- **백엔드**: Node.js 20+ + Express 4 + TypeScript(strict) + Firebase Admin SDK + Zod + pino
- **인증·DB**: Firebase Authentication + Cloud Firestore (asia-northeast3, 서울 리전)
- **데이터 fetching**: `@tanstack/react-query` v5 (백엔드 호출 한정)
- **시세**: `yahoo-finance2` (Yahoo 비공식, 무료) — `QuoteProvider` 인터페이스 추상화
- **차트**: `lightweight-charts` (자산·종목) + `recharts` (보조 시각화)
- **테마**: 다크/라이트 — `<html data-theme>` + localStorage
- **폰트**: Geist(라틴) + Pretendard(한글), `tokens.css` 에서 CDN import
- **import alias**: `@/*` → `src/*`

## 디렉토리 구조

```
src/                        프론트엔드 (Vite/React)
  pages/
    Landing.tsx             /
    Pricing.tsx             /pricing
    Docs.tsx                /docs
    Changelog.tsx           /changelog
    auth/                   /login, /signup
    app/                    /app/{portfolio,markets,watchlist,history}
  app/                      앱 전용
    layout/                 AppLayout, Sidebar, RequireAuth
    hooks/                  useAuth, useHoldings, useQuote 등
    lib/
      firebase.ts           Firebase 초기화 (auth, db export)
      auth.tsx              AuthProvider, useAuth (onAuthStateChanged)
      firestore.ts          Firestore 헬퍼 (watchHoldings 등)
      api.ts                백엔드 호출 wrapper (ID 토큰 자동 첨부)
      format.ts
  components/<Name>/        공유 프리미티브 (Button, Pill, Icon, Hero ...)
  styles/
    tokens.css              디자인 토큰 SSoT
    useTheme.ts
  App.tsx, main.tsx
server/                     REST API (Node/Express/TS, Firebase Admin)
  src/
    index.ts
    env.ts                  Zod 환경변수 검증
    firebase-admin.ts       Admin SDK 초기화
    middleware/             verifyAuth, errorHandler, cors, requestLog
    routes/                 users, markets, trade
    services/               tradeService, marketService
    lib/quote/yahoo.ts
    lib/money.ts
  .env.example
docs/
  api-spec.md               REST 엔드포인트 명세
  db-schema.md              Firestore 컬렉션 스키마
  auth-flow.md              Firebase Auth 흐름 + 보안 규칙
firestore.rules             Firestore 보안 규칙 (Firebase CLI 로 배포)
firestore.indexes.json      복합 인덱스 (Firebase CLI 로 배포)
public/
  logo.svg, logo-mark.svg, icons/
.claude/
  CLAUDE.md, agents/
```

## 답변 스타일

- 코드 관련 설명 시 **파일 경로와 라인 번호** 함께 표기 (예: `src/app/lib/api.ts:24`)
- import 경로는 alias(`@/components/Button/Button`) 또는 상대 경로 어느 쪽이든 — 코드베이스 실제 사용 형태에 맞춤

## 스크립트

```sh
npm run dev          # 프론트 + 백엔드 동시 실행 (concurrently)
npm run dev:web      # vite dev server (5173)
npm run dev:api      # express dev server (4000)
npm run build        # 프론트 + 백엔드 동시 빌드
npm run lint
npm run format
npm run storybook    # storybook on :6006
npm run firebase     # Firebase CLI (rules, indexes deploy)
```

## 라우트 표

| Path | 컴포넌트 | 비고 |
|---|---|---|
| `/` | `Landing` | 마케팅 |
| `/pricing` | `Pricing` | 마케팅 |
| `/docs` | `Docs` | 마케팅 |
| `/changelog` | `Changelog` | 마케팅 |
| `/login` | `AuthPage mode="login"` | Nav/Footer 미노출 |
| `/signup` | `AuthPage mode="signup"` | Nav/Footer 미노출 |
| `/app` | `<RequireAuth><AppLayout/>` | `/app/portfolio` 로 redirect |
| `/app/portfolio` | `Portfolio` | 사이드바 첫 항목 |
| `/app/markets` | `Markets` | |
| `/app/watchlist` | `Watchlist` | |
| `/app/history` | `History` | |

- 마케팅 페이지의 "get started" → `/signup`, "log in" → `/login` (`Nav.tsx` 의 기존 `href="#"` 교체).
- 마케팅 `<Nav/>` / `<Footer/>` 는 `/app/*`, `/login`, `/signup` 에서 노출하지 않는다.

## 디자인 토큰 / 테마 규칙

- 모든 색·타입·스페이싱·모션 토큰은 `src/styles/tokens.css` 한 곳. raw hex 금지 — `var(--token)` 만.
- 다크가 default. 라이트는 `[data-theme="light"]` 셀렉터에서 같은 토큰 키 재정의 → 컴포넌트 CSS 에서 분기 직접 쓰지 않는다.
- 등락 표기는 `--gain` / `--gain-bg` / `--loss` / `--loss-bg`.
- 새 색/간격/타이포 추가 시 **토큰부터 등록**, 컴포넌트는 변수 참조.

## 아이콘 규칙

- `public/icons/<name>.svg` 단색 SVG(Lucide), `<Icon name="bell" />` 사용.
- 색상은 `--icon-filter` / `--icon-filter-accent` 의 `filter: invert(...)` 로 런타임 적용 → SVG 자체는 색을 갖지 않는 단색 마스터.

## 컴포넌트 작성 규칙

- 폴더 구조: `src/components/<Name>/<Name>.tsx` + `<Name>.module.css` + (프리미티브의 경우) `<Name>.stories.tsx`
- CSS Modules: `localsConvention: camelCaseOnly` — `s.btnPrimary` 식.
- Storybook 스토리는 디자인 시스템 프리미티브 위주. 페이지·앱 화면은 생략.
- React Router 링크는 `<Link>` / `<NavLink>`. `Button` 은 `as="link" to="..."`.

## 인증 / 데이터 (요약)

상세는 `docs/auth-flow.md` · `docs/api-spec.md` · `docs/db-schema.md`.

- **인증**: Firebase Auth (Email/Password). SDK 가 ID 토큰 자동 보관·갱신.
- **3층 보호**: 프론트 `<RequireAuth>` + 백엔드 `verifyAuth` + Firestore 보안 규칙. 각 층 독립 적용.
- **데이터 출처 분리**:
  - **사용자 데이터** (holdings, trades, watchlist, profile) → Firestore SDK 직접 구독 (`onSnapshot`/`getDoc`).
  - **시세·검색·거래 체결** → Express 백엔드 `/api/v1/*` 호출.
- **백엔드 호출 규약**: `Authorization: Bearer <idToken>` 헤더, 응답 envelope `{ status_code, message, data }`.
- **데이터 fetching 도구**: `@tanstack/react-query` v5 — **백엔드 호출에만**. Firestore 는 자체 캐시·실시간 구독으로 충분, RQ 로 감싸지 말 것.
- **거래 체결**: 반드시 백엔드 `/api/v1/trade` 통해서만. 프론트에서 holdings/trades 직접 쓰기 금지 (보안 규칙로도 차단).

## 환경 변수

상세 키와 값은 `.env.example` (root + `server/`) 참조.

**프론트** (`.env.local`, Vite 는 `VITE_` prefix 필수):
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- `VITE_API_BASE` (기본 `http://localhost:4000`)

**백엔드** (`server/.env`):
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (서비스 계정, 줄바꿈 `\n` 보존)
- `QUOTE_PROVIDER=yahoo`
- `CORS_ORIGIN=http://localhost:5173`, `PORT=4000`, `NODE_ENV=development`

> 서비스 계정 키 JSON 은 **절대 git 커밋 금지**. `.gitignore` 에 `**/.env*`, `*-firebase-adminsdk-*.json` 추가.

## TypeScript

- `strict` + `noUnusedLocals` + `noUnusedParameters` — 미사용 변수는 빌드 오류.
- 의도적 무시 시 `_` prefix (예: `Button.tsx:36` 의 `const { as: _as, ... } = props`).
- `tsc -b` 가 빌드 첫 단계 → 타입 에러 = 빌드 실패.

## 참조 문서

작업 전 반드시 확인.

| 문서 | 용도 | 언제 참조 |
|---|---|---|
| `docs/api-spec.md` | Express 엔드포인트 요청/응답 | be-api 작업 / fe-app 호출 / 응답 변경 시 |
| `docs/db-schema.md` | Firestore 컬렉션·필드·인덱스·보안 규칙 요약 | 데이터 구조 변경 / 쿼리 작성 시 |
| `docs/auth-flow.md` | Firebase Auth 시퀀스 + 보안 규칙 본문 | 인증 변경 / 보호 라우트 추가 시 |

영향 범위 grep:
```sh
grep -rn "/api/v1/" src/                   # 백엔드 엔드포인트 호출처
grep -rn "queryKey:" src/                  # React Query key 사용처
grep -rn "collection(\|doc(" src/          # Firestore 사용처
```

## 에이전트 라우팅

코드 수정 작업은 메인 세션이 직접 수행하지 않고 해당 에이전트 디스패치.

### 디렉토리 기반

| 작업 대상 | 에이전트 |
|---|---|
| `src/pages/` (Landing, Pricing, Docs, Changelog) | fe-page |
| `src/pages/auth/`, `src/pages/app/`, `src/app/` | fe-app |
| `src/components/` | fe-component |
| `src/styles/`, `tokens.css`, `useTheme.ts` | design-system |
| `public/icons/`, `public/*.svg` | assets |
| `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `package.json` | build-config |
| `*.stories.tsx`, `.storybook/` | fe-component |
| `server/src/` | be-api |
| `firestore.rules`, `firestore.indexes.json` | be-api |
| `docs/api-spec.md`, `docs/db-schema.md`, `docs/auth-flow.md` | be-api (스펙 갱신) |

### 작업 유형 기반

| 작업 유형 | 에이전트 |
|---|---|
| 마케팅 페이지 수정·추가 | fe-page |
| 로그인/회원가입/앱 대시보드 페이지 | fe-app |
| 새 컴포넌트 / 기존 컴포넌트 / 스토리 | fe-component |
| 토큰·테마·폰트 변경 | design-system |
| Express REST API · 거래 체결 · Yahoo 어댑터 | be-api |
| Firestore 스키마·보안 규칙·인덱스 변경 | be-api |
| 인증·세션 로직 | be-api (서버 검증) + fe-app (SDK 사용) |
| 빌드/타입/린트 설정 | build-config |
| 버그 원인 추적 | 메인 세션 직접 |

### 순차 의존성

| 작업 흐름 | 순서 |
|---|---|
| Firestore 스키마 변경 | be-api(`db-schema.md` + `firestore.rules` 갱신) → 사용자 콘솔 배포 → be-api / fe-app (코드 반영) |
| 새 백엔드 엔드포인트 | be-api(`api-spec.md` 작성) → be-api(라우트/서비스 구현) → fe-app(호출) |
| 새 토큰 도입 | design-system → fe-component / fe-page / fe-app (병렬) |
| 새 공용 컴포넌트 | fe-component → fe-page / fe-app |
| 새 시세 provider | be-api(어댑터) → fe-app (응답 변경 있으면) |
| 버그 수정 | 메인 세션 원인 분석 → 원인 위치 에이전트 디스패치 |

### 메인 세션 역할

코드를 직접 수정하지 않는다.
- 에이전트 선택·디스패치
- 사전 조사 (호출처 grep, 토큰 사용처, queryKey 검색, Firestore 경로 검색)
- 버그 원인 분석 (코드 읽기·추적)
- 에이전트 결과 수신·통합 보고

> **필수**: 코드 수정 작업은 분량과 무관하게 반드시 에이전트 디스패치. CSS 한 줄, 텍스트 한 단어도 예외 없음.

## 작업 시 주의

- 기존 토큰으로 표현 가능한 색/간격을 raw 값으로 박지 말 것.
- 컴포넌트 CSS 에서 다크/라이트 분기 직접 쓰지 말 것.
- Firestore 사용자 데이터는 SDK 로 직접 read — React Query 로 감싸지 말 것.
- 백엔드 호출에서 `Authorization` 헤더 빼먹지 말 것 — `api.ts` wrapper 통해 일관 처리.
- 보호 페이지는 `<RequireAuth>` (프론트) + `verifyAuth` (백엔드) + Firestore 규칙 **셋 다** 적용.
- 거래 체결은 반드시 백엔드 `/api/v1/trade` 통해서만.
- 마케팅 `<Nav/>` / `<Footer/>` 가 `/app/*`, `/login`, `/signup` 으로 새지 않게.

## 파일 네이밍 규칙

**프론트엔드:**
- 컴포넌트 폴더·파일: PascalCase (`Button/Button.tsx`, `Button.module.css`).
- 페이지 컴포넌트: PascalCase (`Landing.tsx`, `Portfolio.tsx`, `Login.tsx`).
- 훅: `useXxx` (`useAuth.ts`, `useHoldings.ts`).
- 유틸: camelCase (`format.ts`, `api.ts`, `firebase.ts`).
- 아이콘 SVG: kebab-case (`arrow-right.svg`).
- 토큰 변수명: 기존 패턴 유지 (`--bg-2`, `--s-4`, `--r-pill`).

**백엔드:**
- 라우트 파일: 도메인 단어 (`markets.ts`, `trade.ts`, `users.ts`).
- 서비스/유틸: camelCase (`tradeService.ts`, `marketService.ts`).
- 환경 변수: SCREAMING_SNAKE_CASE.

**Firestore:**
- 컬렉션: 복수 소문자 (`users`, `holdings`, `trades`, `watchlist`, `market_cache`).
- 필드: snake_case (`avg_price`, `executed_at`, `seed_cash`).
- 문서 ID: 의미 있는 키(`symbol`) 또는 자동 생성 — `docs/db-schema.md` 참조.

## 출력 절약

- 작업 예고("~를 하겠습니다") 금지 — 바로 실행
- 파일 전체 내용 출력 금지 — 변경 부분만
- 도구 호출 결과 재요약 금지
