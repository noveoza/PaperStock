---
description: 디자인 토큰·테마 시스템 규칙
paths: "src/**"
---

# 디자인 토큰 / 테마

- 모든 색·타입·스페이싱·모션 토큰은 `src/styles/tokens.css` 한 곳. raw hex 금지 — `var(--token)` 만.
- 다크가 default. 라이트는 `[data-theme="light"]` 셀렉터에서 같은 토큰 키 재정의 → 컴포넌트 CSS 에서 분기 직접 쓰지 않는다.
- 등락 표기는 `--gain` / `--gain-bg` / `--loss` / `--loss-bg`.
- 새 색/간격/타이포 추가 시 **토큰부터 등록**, 컴포넌트는 변수 참조.
