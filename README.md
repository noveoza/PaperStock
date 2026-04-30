# Paperstock — Web App

Production-ready Vite + React + TypeScript port of the Paperstock landing page and design system.

## Stack

- Vite 5
- React 18 + React Router 6
- TypeScript (strict)
- CSS Modules with shared tokens (`src/styles/tokens.css`)
- Storybook 8
- ESLint flat config + Prettier

## Structure

```
src/
  components/        Per-component folder (TSX + .module.css + .stories.tsx)
  pages/             Route components
  styles/
    tokens.css       Design tokens (dark + light themes via [data-theme])
    useTheme.ts      Theme hook (localStorage-persisted)
public/
  logo.svg, logo-mark.svg
  icons/             Lucide icons (recolored at runtime via filter tokens)
.storybook/          Storybook config
```

## Theming

Light + dark are driven by `[data-theme="light" | "dark"]` on `<html>`. All tokens (color, type, spacing, motion, icon filters) live in `tokens.css`. Add a new theme by adding another selector block.

## Run

```sh
npm install
npm run dev          # vite dev server
npm run storybook    # storybook on :6006
npm run build        # production build
npm run lint
```

## Routes

- `/`           Landing
- `/pricing`    Pricing
- `/docs`       Docs
- `/changelog`  Changelog
