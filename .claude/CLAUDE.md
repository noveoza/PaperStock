# Paperstock 프로젝트 가이드

## 프로젝트 개요

한국어 모의투자 서비스 **"Paperstock — 진짜 시장에서 연습하세요"** 의 마케팅 사이트 + 앱 대시보드 + REST API 모노레포.
사용자는 회원가입·로그인 후 `/app/*` 의 Portfolio · Markets · Watchlist · History 화면에서 모의투자를 진행한다.

## 행동 원칙

> Andrej Karpathy의 LLM 코딩 실수 관찰에서 도출한 메타 규칙. 사소한 작업엔 판단하여 적용.

### 1. 코딩 전 먼저 생각하기

**가정하지 않는다. 혼란을 숨기지 않는다. 트레이드오프를 드러낸다.**

구현 전:
- 가정을 명시적으로 표현. 불확실하면 먼저 질문.
- 해석이 여러 가지라면 모두 제시하고 선택 요청 — 혼자 결정하지 않는다.
- 더 단순한 방법이 있으면 말한다. 필요하면 반박.
- 불명확한 부분은 멈추고 이름 붙여 질문. (e.g. "거래 체결 실패 시 프론트에서 재시도 여부가 불명확합니다")

### 2. 단순성 우선

**문제를 해결하는 최소한의 코드. 투기적 코드 금지.**

- 요청된 것 외 기능 추가 금지.
- 단일 사용 코드에 추상화 도입 금지.
- 요청하지 않은 "유연성" / "설정가능성" 금지.
- 발생 불가능한 시나리오의 에러 처리 금지.
- 200줄로 썼는데 50줄로 가능하면 다시 작성.

"시니어 엔지니어가 이걸 보면 과하다고 할까?" — Yes라면 단순화.

### 3. 외과적 변경

**요청된 것만 수정. 내 변경이 만든 잔해만 정리.**

기존 코드 수정 시:
- 인접 코드, 주석, 포맷 "개선" 금지.
- 깨지지 않은 것 리팩터 금지.
- 내 스타일과 달라도 기존 스타일 유지.
- 관련 없는 dead code 발견 시 — 삭제하지 않고 언급만.

내 변경이 orphan을 만들면:
- **내 변경으로** 사용되지 않게 된 import / 변수 / 함수만 제거.
- 기존 dead code는 요청 없으면 건드리지 않는다.

기준: **변경된 모든 줄이 사용자의 요청으로 직접 추적 가능해야 한다.**

### 4. 목표 기반 실행

**성공 기준 정의. 검증될 때까지 반복.**

작업을 검증 가능한 목표로 변환:
- "버그 수정" → "재현 테스트 작성 → 통과시키기"
- "유효성 검사 추가" → "잘못된 입력 테스트 작성 → 통과시키기"
- "리팩터" → "`tsc -b` + `npm run lint` 전후 모두 통과 확인"

다단계 작업은 간략한 계획을 먼저 명시:
```
1. [단계] → 검증: [확인 방법]
2. [단계] → 검증: [확인 방법]
```

명확한 성공 기준은 독립 반복 실행을 가능하게 한다. "작동하게 만들기" 같은 모호한 기준은 중간 확인을 계속 요구한다.

- 마케팅 페이지의 "get started" → `/signup`, "log in" → `/login` (`Nav.tsx` 의 기존 `href="#"` 교체).
- 마케팅 `<Nav/>` / `<Footer/>` 는 `/app/*`, `/login`, `/signup` 에서 노출하지 않는다.

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

키 목록은 `.env.example` (루트) · `server/.env.example` 참조. 서비스 계정 키 git 커밋 금지.

## 참조 문서

작업 전 반드시 확인.

| 문서 | 용도 | 언제 참조 |
|---|---|---|
| `docs/api-spec.md` | Express 엔드포인트 요청/응답 | be-api 작업 / fe-app 호출 / 응답 변경 시 |
| `docs/db-schema.md` | Firestore 컬렉션·필드·인덱스·보안 규칙 요약 | 데이터 구조 변경 / 쿼리 작성 시 |
| `docs/auth-flow.md` | Firebase Auth 시퀀스 + 보안 규칙 본문 | 인증 변경 / 보호 라우트 추가 시 |

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

- 보호 페이지는 `<RequireAuth>` (프론트) + `verifyAuth` (백엔드) + Firestore 규칙 **셋 다** 적용.
- 거래 체결은 반드시 백엔드 `/api/v1/trade` 통해서만.
- 마케팅 `<Nav/>` / `<Footer/>` 가 `/app/*`, `/login`, `/signup` 으로 새지 않게.

