---
description: 프론트엔드 컴포넌트·아이콘 작성 규칙
paths: "src/**"
---

# 컴포넌트 작성

- 폴더 구조: `src/components/<Name>/<Name>.tsx` + `<Name>.module.css` + (프리미티브의 경우) `<Name>.stories.tsx`
- CSS Modules: `localsConvention: camelCaseOnly` — `s.btnPrimary` 식.
- Storybook 스토리는 디자인 시스템 프리미티브 위주. 페이지·앱 화면은 생략.
- React Router 링크는 `<Link>` / `<NavLink>`. `Button` 은 `as="link" to="..."`.

# 아이콘

- `public/icons/<name>.svg` 단색 SVG(Lucide), `<Icon name="bell" />` 사용.
- 색상은 `--icon-filter` / `--icon-filter-accent` 의 `filter: invert(...)` 로 런타임 적용 → SVG 자체는 색을 갖지 않는 단색 마스터.
