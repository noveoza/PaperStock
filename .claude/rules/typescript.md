---
description: TypeScript strict 모드 규칙
paths: "**/*.ts,**/*.tsx"
---

# TypeScript

- `strict` + `noUnusedLocals` + `noUnusedParameters` — 미사용 변수는 빌드 오류.
- 의도적 무시 시 `_` prefix (예: `const { as: _as, ... } = props`).
- `tsc -b` 가 빌드 첫 단계 → 타입 에러 = 빌드 실패.
