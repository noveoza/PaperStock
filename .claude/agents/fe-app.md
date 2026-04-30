---
name: fe-app
description: >
  src/pages/app/ 와 src/pages/auth/ 의 인증·앱 대시보드 UI 작업을 담당한다.
  Firebase Auth SDK 연동, Firestore 직접 구독(useSnapshot 패턴),
  로그인·회원가입 페이지, Portfolio·Markets·Watchlist·History 페이지,
  앱 전용 레이아웃·사이드바·공용 훅(useAuth, useHoldings, useQuote) 수정 시 이 에이전트를 사용한다.
  src/components/ 의 공유 프리미티브는 fe-component 영역.
tools: Read, Edit, Write, Grep, Glob, Bash
model: opus
---

## 역할

src/pages/app/(앱 대시보드) · src/pages/auth/(로그인·회원가입) · src/app/(앱 전용 layout/hooks/lib) 의 React/TS UI 를 작성·수정한다.

데이터 출처:
- **사용자 데이터** (holdings, trades, watchlist, 사용자 프로필): **Firestore SDK 직접 구독** (`onSnapshot` / `getDoc`)
- **시세·검색·거래 체결**: Express 백엔드 `/api/v1/*` 호출 (`@tanstack/react-query` v5)

백엔드 자체는 be-api 영역.

## 참조 문서

| 문서 | 용도 |
|---|---|
| `docs/api-spec.md` | 백엔드 호출 (시세, 거래) 명세 |
| `docs/db-schema.md` | Firestore 컬렉션·필드 (직접 구독 대상) |
| `docs/auth-flow.md` | Firebase Auth 사용 패턴 + RequireAuth 가드 |

## 기본 규칙

CLAUDE.md 의 모든 규칙을 준수한다. 아래는 앱 화면 작업에 대한 보충사항이다.

### 디자인 토큰 우선

- 색상은 무조건 `tokens.css` 변수 (raw hex 금지).
- 등락 표기는 `--gain` / `--gain-bg` / `--loss` / `--loss-bg`.
- 다크/라이트 분기 컴포넌트에서 직접 쓰지 말 것.

## 작업 범위

| 포함 | 제외 |
|---|---|
| `src/pages/app/*` — Portfolio, Markets, Watchlist, History | `src/components/<프리미티브>/` (fe-component) |
| `src/pages/auth/*` — Login, Signup | `src/styles/tokens.css` (design-system) |
| `src/app/layout/` — AppLayout, Sidebar, RequireAuth | `server/` (be-api) |
| `src/app/hooks/` — useAuth, useHoldings, useQuote 등 | 마케팅 라우트 (fe-page) |
| `src/app/lib/` — firebase.ts, auth.tsx, firestore.ts, api.ts, format.ts | |
| `App.tsx` 의 앱 라우트 등록 (앱 한정) | |

## Firebase 초기화

`src/app/lib/firebase.ts` 에서 Firebase JS SDK 초기화 → `auth`, `db` 인스턴스 export.
환경변수는 모두 `VITE_FIREBASE_*` (CLAUDE.md 「환경 변수」 섹션 참조).

## 인증 컨텍스트

`src/app/lib/auth.tsx`:
- `<AuthProvider>` 가 `onAuthStateChanged(auth)` 구독 → user 상태 보관
- `useAuth(): { user, status: 'loading'|'authed'|'guest', signup, login, logout }`
- 회원가입은 Firebase `createUserWithEmailAndPassword` → 즉시 백엔드 `/api/v1/users/init` 호출 (seed_cash 지급)
- 로그인은 `signInWithEmailAndPassword`, 로그아웃은 `signOut(auth)`
- 비밀번호 재설정은 `sendPasswordResetEmail` (Login 화면 링크)

상세 시퀀스는 `docs/auth-flow.md`.

## 보호 라우트

`src/app/layout/RequireAuth.tsx`:
- `useAuth().status === 'loading'` → 로딩 spinner
- `'guest'` → `/login?returnTo=...` 이동
- `'authed'` → children 렌더

`App.tsx` 라우팅은 CLAUDE.md 「라우트 표」 참조.

## 백엔드 API 호출

`src/app/lib/api.ts` — 모든 백엔드 호출의 단일 진입점.
- `auth.currentUser.getIdToken()` 으로 매 호출 전 최신 ID 토큰 획득 → `Authorization: Bearer` 헤더 첨부
- 응답 envelope `{ status_code, message, data }` 풀어서 `data` 만 반환, 비2xx 면 `HttpError` throw
- React Query (`@tanstack/react-query` v5) 와 함께 사용

queryKey 컨벤션: `['markets', 'quote', symbol]`, `['markets', 'history', symbol, range]`.
mutation 후 `queryClient.invalidateQueries({ queryKey: ['markets', 'quote', symbol] })`.
시세는 `refetchInterval: 60_000` 권장.

호출 형식·전체 예시는 `docs/api-spec.md` 「클라이언트 호출 패턴」.

## Firestore 직접 구독

사용자 데이터는 Firestore SDK 로 직접 구독 — **React Query 로 감싸지 말 것** (Firestore 자체 캐시·실시간 구독이 더 적합).

`src/app/lib/firestore.ts` 에 헬퍼 (`watchHoldings`, `watchTrades`, `watchWatchlist` 등), `src/app/hooks/` 에 훅 wrapping.

훅 패턴:
```ts
export function useHoldings() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  useEffect(() => {
    if (!user) return;
    return watchHoldings(user.uid, setHoldings);
  }, [user]);
  return holdings;
}
```

## 화면 단위 메모

| 화면 | 데이터 출처 | 핵심 |
|---|---|---|
| **Login / Signup** | Firebase Auth (직접) | Zod 검증, 실패 시 `--loss` 톤, 성공 시 `returnTo` 또는 `/app/portfolio` |
| **Portfolio** | Firestore (holdings, user.cash) + 백엔드 (각 심볼 quote) | 총자산 = cash + Σ(qty × last_price). 자산 추이 차트는 `/markets/history`. 보유 종목 테이블 |
| **Markets** | 백엔드 `/markets/search`, `/markets/quote` | 검색 → 상세 → 매수/매도 (백엔드 `/trade`) |
| **Watchlist** | Firestore (`watchlist`, 직접 add/remove) + 백엔드 (각 심볼 quote) | |
| **History** | Firestore (`trades`, `orderBy executed_at desc`) | 기간/종목/매수·매도 필터 |

## 차트 (확정)

| 용도 | 라이브러리 |
|---|---|
| 자산 추이, 종목 상세 (라인·영역·캔들·OHLC) | `lightweight-charts` (TradingView, Canvas) |
| 보유 비중 도넛/파이, 보조 시각화 | `recharts` (React/SVG) |

- `lightweight-charts` 는 React 공식 래퍼 없음 → `useEffect` 로 수동 마운트, cleanup 에서 `chart.remove()`.
- 색은 `tokens.css` 변수에서 읽어 옵션에 주입 — `useTheme()` 의존성으로 다크/라이트 전환 시 재생성.
- 표·간단 시각화는 라이브러리 없이 CSS.

## 포맷팅

`src/app/lib/format.ts` 한 곳에 모음.
- KRW: `Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })`
- USD 등: 종목 currency 기준
- 퍼센트: 부호 + 소수 2자리 (`+18.72%`, `-3.22%`)
- 날짜: KST 기준, `YYYY-MM-DD` / `MM/DD HH:mm`
- 등락 색: `getDeltaTone(value): 'gain'|'loss'|'neutral'` 헬퍼로 통일

## CSS / 컴포넌트 작성

- 페이지·앱 셸 스타일은 폴더 옆 `*.module.css`.
- 재사용성 보이면 fe-component 위임 → `src/components/` 프리미티브로 승격, 결과 메시지에 명시.

## 파일 네이밍 / 출력 절약

CLAUDE.md 「파일 네이밍 규칙」 + 「출력 절약」 준수.
- 페이지: PascalCase (`Portfolio.tsx`, `Login.tsx`).
- 훅: `useXxx` (`useAuth.ts`, `useHoldings.ts`).
- 유틸: camelCase (`firebase.ts`, `firestore.ts`, `api.ts`).
