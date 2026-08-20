# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build      # Production build → dist/
npm run watch      # Development build with file watching
npm start          # Dev server on http://localhost:3000 with live reload
npm run images     # Regenerate WebP variants + image-manifest.json (runs automatically
                   # via the prebuild/prewatch/prestart hooks)
```

No linting or test suite is configured.

## Architecture

This is a static website for **Aqualign Swim & Ice** (aqualign.de), built with Webpack. Pushing to `main` triggers a GitHub Actions workflow that builds, copies `CNAME` alongside `dist/`, and deploys to GitHub Pages via the `gh-pages` branch.

All user-facing content is **German** (`<html lang="de">`); keep new copy, `alt` text, and ARIA labels in German.

### Build pipeline

- **Entry**: `src/js/main.js` — imports `src/css/_index.scss` and the behavioural JS modules.
- **HTML**: Each `.ejs` file in `src/html/` becomes a standalone page via `HtmlWebpackPlugin`, rendered by `ejs.renderFile` directly in `webpack.config.js` (there is no custom loader). Partials live in `src/html/partials/` and are pulled in with EJS `<%- include('./partials/_nav') %>`; `root` is set to `src/html`.
- **Template helpers** — both injected as `templateParameters` and always used with `<%- %>` (unescaped):
  - `md('../content/foo.md')` → renders a Markdown file to HTML (`src/utils/markdown.js`, path relative to `src/utils/`).
  - `picture('name.jpg', { alt, sizes, loading, className })` → builds a responsive WebP `<img srcset>` from the manifest (`src/utils/images.js`). Throws at build time if the image has no generated variants.
- **Assets**: `CopyPlugin` copies only the `public/` assets actually referenced in `src/` (scanned at build time via regex on `.ejs/.js/.ts/.scss/.css/.html`) into `dist/public/`.
- **CSS**: SCSS compiled via `sass-loader`, injected as style tags by `style-loader`. `css-loader`'s `url.filter` deliberately skips URLs starting with `/public/` so the hero backgrounds resolve at runtime instead of being bundled.
- **Fonts**: Century Gothic loaded via `src/css/fonts.scss` from the `fonts/` directory.

**Watch-mode caveat**: `.md` and `.ejs` files are read at render time (by `md()` and `ejs.renderFile`), not imported through the webpack module graph, so editing one *alone* does **not** trigger a rebuild under `npm start` / `npm run watch` — the dev server keeps serving the previous HTML and the change looks like it silently failed. Touch a tracked file (any `.scss` or `.js`) or restart the server. `npm run build` is always correct; when the browser and `dist/` disagree, trust `dist/`.

### Images

`scripts/generate-images.js` (Sharp) runs before every webpack invocation:

1. Scans `src/` for any JPG basename mentioned in a text file — this catches both `picture('portrait.jpg')` in EJS and `url("/public/hero-eisbaden.jpg")` in SCSS.
2. Emits `dist/public/<name>-<width>.webp` for widths `[480, 768, 1024, 1440, 1920]` smaller than the source, plus a full-size `dist/public/<name>.webp`.
3. Writes `image-manifest.json` (gitignored, generated — never edit by hand) which `picture()` reads.

**To add an image**: drop the JPG in `public/`, reference it by basename from an `.ejs` or `.scss`, and rebuild. No config change needed. Unreferenced images in `public/` are skipped entirely.

Because `dist/` is never wiped by webpack, the generator deletes the previous manifest's outputs itself so renamed/removed images don't leave stale files behind.

### Two-mode UI (warm / cold)

The site has a toggle switch that switches between a **Schwimmtraining** (warm, yellow palette) mode and an **Eisbaden** (cold, blue palette) mode. This is implemented by adding/removing `warm` and `cold` CSS classes on `<body>`:

- CSS variables in `global.scss` define the two color palettes under `body.warm` and `body.cold`
- `display: none` rules hide `.warm` sections in cold mode and `.cold` sections in warm mode
- The two hero backgrounds are stacked as `header::before` (cold) and `header::after` (warm), cross-faded by opacity — likewise the snowflake in the logo
- `SiteState` class in `site-state.js` manages transitions and syncs state to the URL hash (`#schwimmtraining` / `#eisbaden`), including deep links and back/forward navigation
- The toggle is a styled CSS checkbox (`#switch`), only present on `index.ejs`; the JS no-ops on other pages

### Conventions

- **Accessibility is load-bearing** — preserve it when editing markup: skip link, `.sr-only` helper, `aria-expanded`/`aria-checked` syncing, the `#mode-announcement` live region, the nav focus trap and Escape handler in `navigation.js`, `:focus-visible` outlines, and the `prefers-reduced-motion` block in `global.scss`.
- **JS modules** are side-effect scripts (no exports; wired up by `require()` in `main.js`) with `"use strict"` and JSDoc on every file, function, and field. Match that density.
- **SCSS**: use the mobile-first `@include xsmall/small/medium/large` mixins from `viewports.scss` (`@use 'viewports' as *;`) rather than raw media queries. New stylesheets must be registered in `_index.scss`.
- **Layout classes** for content: `.image-aside` (optionally `.right`) for text wrapped beside an image, `.gallery` for a horizontally scroll-snapping row of images.
- **Content** lives as Markdown fragments in `src/content/`, grouped per section (`eisbaden/`, `schwimmtraining/`) — prefer editing those over inlining prose into `.ejs`.

### Pages

| File | Output | Notes |
|------|--------|-------|
| `index.ejs` | `index.html` | Landing page: full-height hero header, mode switch, both Schwimmtraining and Eisbaden sections, JSON-LD structured data |
| `about-me.ejs` | `about-me.html` | "Über mich" — Franziska Partheymüller |
| `about.ejs` | `about.html` | "Über Aqualign" — what the name means |
| `imprint.ejs` | `imprint.html` | Legal imprint (Impressum) |

All pages except `index.ejs` use the `_compact-header` partial.
