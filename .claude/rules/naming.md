---
description: 파일·변수 네이밍 규칙
paths:
---

# 파일 네이밍 규칙

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
