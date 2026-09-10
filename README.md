# Paperstock — 진짜 시장에서 연습하세요

한국어 모의투자 서비스 **Paperstock** 의 프론트엔드 + REST API 모노레포입니다.
마케팅 사이트, 로그인 이후의 앱 대시보드(`/app/*`), 시세·거래 체결을 담당하는 Express 백엔드를 한 저장소에서 관리합니다.

---

## 📖 프로젝트 소개 (Project Overview)

실제 주식 시세를 그대로 가져와 가상 자금으로 매매를 연습하는 모의투자 서비스입니다.
사용자는 회원가입·로그인 후 **Portfolio · Markets · Watchlist · History** 화면에서 종목을 탐색하고, 시드 캐시로 매수·매도를 체결하며, 보유 자산과 손익 추이를 실시간으로 확인합니다.

체결·시세 같은 무결성이 중요한 로직은 전부 백엔드를 거치고, 보유 종목·거래 내역·관심 종목 같은 사용자 데이터는 Firestore 실시간 구독으로 화면에 즉시 반영되도록 **데이터 출처를 분리**한 것이 핵심 설계입니다.

---

## ✨ 핵심 기능 (Key Features)

- **Portfolio**: 보유 종목·평단가·평가손익, 시드 캐시 대비 총자산 추이를 스냅샷 차트로 표시.
- **Markets**: 종목 검색(yahoo-finance2 어댑터), 실시간 시세, 캔들/라인 차트, 매수·매도 모달을 통한 주문.
- **Watchlist**: 관심 종목 추가·삭제를 Firestore 로 즉시 동기화, 목록에서 바로 시세 확인.
- **History**: 체결된 거래 내역을 시간순으로 조회.

---

## 🏗️ 아키텍처 (Architecture)

```
┌─────────────┐   Firestore SDK (onSnapshot / getDoc)   ┌──────────────┐
│   Web (SPA) │ ─────────────────────────────────────▶  │  Firestore   │
│ React+Vite  │                                         │  (user data) │
│             │   fetch  Authorization: Bearer <idToken> └──────────────┘
│             │ ─────────────────────────────────────▶  ┌──────────────┐
└─────────────┘   /api/v1/*  (envelope 응답)             │ Express API  │
                                                        │ Firebase     │
                                                        │ Admin + Yahoo│
                                                        └──────────────┘
```

- **사용자 데이터** (holdings · trades · watchlist · profile) → Firestore SDK 직접 구독. 자체 캐시·실시간성으로 충분하므로 React Query 로 감싸지 않음.
- **시세 · 검색 · 거래 체결** → Express 백엔드 `/api/v1/*` 호출. 응답은 `{ status_code, message, data }` envelope, 요청은 `Authorization: Bearer <idToken>` 헤더.
- **데이터 fetching 도구**: `@tanstack/react-query` v5 — 백엔드 호출에만 사용.


---

## 🛠️ 기술 스택 (Tech Stack)

### Frontend

| 역할 | 종류 | 선정 근거 |
|---|---|---|
| Language & Framework | TypeScript · React  · Vite  | TypeScript 로 타입 안정성 확보, React 컴포넌트로 UI 구성, Vite 의 빠른 번들링·HMR 로 개발 생산성 확보 |
| Routing | React Router | SPA 라우팅으로 마케팅 영역과 앱 영역을 분리하고, `<RequireAuth>` 로 보호 라우트를 구성 |
| Styling | CSS Modules · Design Tokens | 컴포넌트 단위로 스코프된 스타일 + `tokens.css` 한 파일에서 라이트/다크 테마 토큰을 일원화 |
| Server State | TanStack Query | 백엔드 `/api/v1/*` 호출의 캐싱·재검증·로딩 상태를 선언적으로 관리 (Firestore 는 실시간 구독으로 별도 관리) |
| Realtime Data & Auth | Firebase SDK (Firestore · Auth) | 사용자 데이터를 `onSnapshot` 으로 실시간 구독, Email/Password 인증의 ID 토큰을 SDK 가 자동 보관·갱신 |
| Charts | lightweight-charts · Recharts | 시세 캔들/라인 차트와 대시보드 손익·자산 추이 시각화 |
| Component Docs | Storybook  | 공용 프리미티브(Button · Pill · Icon …)를 화면과 분리해 개발·문서화 |
| Tooling | ESLint (flat config) · Prettier | 코드 규칙 통일 + 포맷 자동화로 일관된 스타일 유지 |

### Backend (`server/`)

| 역할 | 종류 | 선정 근거 |
|---|---|---|
| Framework | Express  | 시세 프록시·검색·거래 체결 REST API 를 가볍게 구성 |
| Admin | Firebase Admin SDK | ID 토큰 검증(`verifyAuth`)과 Firestore 트랜잭션 기반 거래 체결 처리 |
| Market Data | yahoo-finance2 | 실시간 시세·종목 검색 어댑터 |
| Validation | Zod | 요청 본문과 외부 응답을 스키마 기반으로 검증해 런타임 오류 축소 |
| Logging | pino · pino-pretty | 구조적 로깅으로 요청 흐름 추적 |

### Dev & Infra

| 역할 | 종류 | 선정 근거 |
|---|---|---|
| Monorepo 실행 | concurrently | root(web) 와 `server`(api) 두 패키지를 한 명령으로 동시 실행 |
| Container | Docker · docker-compose | 프론트(nginx 정적 서빙)와 백엔드를 각각 컨테이너화 |
| CI/CD | GitHub Actions → Cloud Run · Firebase Hosting | API 는 Cloud Run, web 은 Firebase Hosting 으로 자동 배포 |
| Package Manager | npm | 표준 패키지 매니저로 의존성 설치·관리 (`postinstall` 이 `server` 의존성까지 설치) |


---

## 🧭 작업 원칙 (Working Principles)

`.claude/CLAUDE.md` 에 정리된 메타 규칙. AI 보조 코딩 시에도 동일하게 적용합니다.

- **코딩 전 먼저 생각하기** — 가정을 명시하고, 해석이 갈리면 먼저 질문. 더 단순한 방법이 있으면 짚고 넘어간다.
- **단순성 우선** — 요청된 것만. 투기적 유연성·발생 불가능한 에러 처리 금지.
- **외과적 변경** — 요청 범위만 수정. 깨지지 않은 것은 리팩터하지 않고, 기존 스타일을 유지한다.
- **목표 기반 실행** — 작업을 검증 가능한 성공 기준으로 바꾸고(`tsc -b` + `npm run lint` 통과 등) 충족될 때까지 반복.

### Git

- `git commit` · `git push` 는 직접 관리. 읽기 전용 git 명령만 사용.
