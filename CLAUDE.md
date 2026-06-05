# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build      # Production build → dist/
npm run watch      # Development build with file watching
npm start          # Dev server on http://localhost:3000 with live reload
```

No linting or test suite is configured.

## Architecture

This is a static website for **Aqualign Swim & Ice** (aqualign.de), built with Webpack. Pushing to `main` triggers a GitHub Actions workflow that builds and deploys to GitHub Pages via the `gh-pages` branch.

### Build pipeline

- **Entry**: `src/js/main.js` — imports SCSS and JS modules
- **HTML**: Each `.ejs` file in `src/html/` becomes a standalone HTML page via `HtmlWebpackPlugin`. EJS-style `<%= require('...') %>` expressions are resolved by the custom `template-loader.js`, enabling HTML partials (in `src/html/partials/`).
- **Assets**: `CopyPlugin` copies only the `public/` assets that are actually referenced in `src/` (scanned at build time via regex) into `dist/public/`.
- **CSS**: SCSS compiled via `sass-loader` and injected as style tags by `style-loader`.
- **Fonts**: Century Gothic loaded via `src/css/fonts.scss` from the `fonts/` directory.

### Two-mode UI (warm / cold)

The site has a toggle switch that switches between a **Schwimmtraining** (warm, yellow palette) mode and an **Eisbaden** (cold, blue palette) mode. This is implemented by adding/removing `warm` and `cold` CSS classes on `<body>`:

- CSS variables in `global.scss` define the two color palettes under `body.warm` and `body.cold`
- `display: none` rules hide `.warm` sections in cold mode and `.cold` sections in warm mode
- `SiteState` class in `site-state.js` manages transitions and syncs state to the URL hash (`#schwimmtraining` / `#eisbaden`)
- The toggle is a styled CSS checkbox (`#switch`); `navigation.js` closes the mobile nav menu on link click

### Pages

| File | Output |
|------|--------|
| `index.ejs` | Landing page with both Schwimmtraining and Eisbaden sections |
| `about-me.ejs` | About page |
| `about.ejs` | Secondary about page |
| `imprint.ejs` | Legal imprint (Impressum) |
