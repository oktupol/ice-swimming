# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build      # Production build → dist/
npm run watch      # Development build with file watching
npm start          # Dev server on http://localhost:3000 with live reload
npm run images     # Regenerate AVIF/WebP variants + image-manifest.json (runs automatically
                   # via the prebuild/prewatch/prestart hooks)
npm run og-image   # Rebuild public/og-image.jpg, the social share image (manual — see below)
npm run lint       # ESLint + Stylelint, no build needed
npm test           # All checks below, against an existing build — run `npm run build` first
npm run check:dist # Invariants of the built HTML in dist/ (scripts/check-dist.js)
npm run check:html # html-validate on dist/*.html (.htmlvalidate.cjs)
npm run test:browser # Playwright tests in tests/ against dist/ (first run: npx playwright install chromium)
```

### Checks

The `Check` workflow runs these on every pull request; `deploy.yml` runs them before
publishing, so a failing check blocks the deploy.

- **`lint:js`** — ESLint (`eslint.config.js`), warnings fail too. In `src/js/` it enforces the
  JSDoc convention below (a `@file` overview and JSDoc on every function, arrow function, class
  and method) and a global `"use strict"`; tests may use browser globals inside
  `page.evaluate()`.
- **`lint:css`** — Stylelint (`stylelint.config.js`), correctness rules only. Raw `min-width` /
  `max-width` media queries are rejected outside `viewports.scss`; use the mixins.

- **`check:dist`** inspects the built pages for the things that break silently: every internal
  link, asset and `#fragment` resolves (404.html is resolved from a nested URL, since GitHub
  Pages serves it at any depth — so its URLs must be root-absolute), the hero preloads match the
  AVIF entries of the `image-set()`, every page but 404 has canonical/`og:url` matching its
  filename and an absolute `og:image`, 404 is `noindex`, the JSON-LD parses, `_headers` still
  sets `noindex`, plus `lang="de"`, `alt` on every `<img>` and no duplicate ids.
- **`check:html`** validates the built pages against the HTML content model and html-validate's
  a11y rules — e.g. no `<div>` inside `<h1>`/`<label>` (use `<span>`), and every landmark
  distinguishable by its `aria-label`.
- **`test:browser`** runs Playwright (`playwright.config.js`) against the production build, served
  GitHub-Pages-style by `scripts/serve-dist.js` (unknown paths answer with `404.html`), in a
  desktop and a mobile project with reduced motion. `tests/a11y.spec.js` runs axe (WCAG 2.1 AA)
  on every page, the landing page in both modes, and the open hamburger menu.
  `mode-switch.spec.js`, `navigation.spec.js` and `gallery.spec.js` cover the behaviour of the
  three JS modules; the menu and gallery specs only run in the mobile project, where the
  hamburger menu exists and every gallery overflows.

To verify a change visually, start the dev server (`npm start`) and drive
http://localhost:3000 with Claude in Chrome.

## Architecture

This is a static website for **Aqualign Swim & Ice** (aqualign.de), built with Webpack. Pushing to `main` triggers a GitHub Actions workflow that builds, copies `CNAME` alongside `dist/`, and deploys to GitHub Pages via the `gh-pages` branch.

**Preview deployments** are built by Cloudflare Pages (project `ice-swimming`, build command
`npm run build`, output `dist`) and served at `<branch>.ice-swimming.pages.dev`. Only branches
matching `feature/*`, `fix/*` or `claude/*` are built — **a branch named anything else silently
gets no preview**. The include-list also keeps Cloudflare off `gh-pages`, which holds built
output with no `package.json` and would fail every build.

`main` builds on Cloudflare too, at `ice-swimming.pages.dev` — but that is only a mirror; the
live site is the GitHub Pages deploy above. So *no* Cloudflare deployment should ever be indexed,
which is why the root `_headers` file (copied into `dist/` by `CopyPlugin`) marks everything
`X-Robots-Tag: noindex` unconditionally. GitHub Pages ignores `_headers`, so production stays
crawlable.

⚠️ **If `aqualign.de` is ever moved to Cloudflare Pages, delete `_headers` in the same change** —
otherwise the noindex header follows the custom domain and silently deindexes the live site.

All user-facing content is **German** (`<html lang="de">`); keep new copy, `alt` text, and ARIA labels in German.

### Build pipeline

- **Entry**: `src/js/main.js` — imports `src/css/_index.scss` and the behavioural JS modules.
- **HTML**: Each `.ejs` file in `src/html/` becomes a standalone page via `HtmlWebpackPlugin`, rendered by `ejs.renderFile` directly in `webpack.config.js` (there is no custom loader). Partials live in `src/html/partials/` and are pulled in with EJS `<%- include('./partials/_nav') %>`; `root` is set to `src/html`.
- **Template helpers** — both injected as `templateParameters` and always used with `<%- %>` (unescaped):
  - `md('../content/foo.md')` → renders a Markdown file to HTML (`src/utils/markdown.js`, path relative to `src/utils/`).
  - `picture('name.jpg', { alt, sizes, loading, className })` → builds a responsive `<picture>` (AVIF `<source>` + WebP `<img srcset>`) from the manifest (`src/utils/images.js`). Throws at build time if the image has no generated variants. The `<picture>` is `display: contents`, so CSS and `gallery.js` address the `<img>` directly. `sizes` must match the CSS layout, or browsers fetch the wrong variant: `.image-aside` is `(min-width: 801px) 350px, (min-width: 601px) 250px, 100vw`. A `.gallery` is full-width below 601px; above it, its images share the row but never shrink below their width at `max-height: 70vh`, so their `sizes` depend on aspect ratio and image count (see the two mode partials) — update them if those rules change.
- **Assets**: `CopyPlugin` copies only the `public/` assets actually referenced in `src/` (scanned at build time via regex on `.ejs/.js/.ts/.scss/.css/.html`) into `dist/public/`.
- **CSS**: SCSS compiled via `sass-loader`, injected as style tags by `style-loader`. `css-loader`'s `url.filter` deliberately skips URLs starting with `/public/` so the hero backgrounds resolve at runtime instead of being bundled.
- **Fonts**: Century Gothic loaded via `src/css/fonts.scss` from the `fonts/` directory.

**Watch-mode caveat**: `.md` and `.ejs` files are read at render time (by `md()` and `ejs.renderFile`), not imported through the webpack module graph, so editing one *alone* does **not** trigger a rebuild under `npm start` / `npm run watch` — the dev server keeps serving the previous HTML and the change looks like it silently failed. Touch a tracked file (any `.scss` or `.js`) or restart the server. `npm run build` is always correct; when the browser and `dist/` disagree, trust `dist/`.

### Images

`scripts/generate-images.js` (Sharp) runs before every webpack invocation:

1. Scans `src/` for any JPG basename mentioned in a text file — this catches both `picture('portrait.jpg')` in EJS and `url("/public/hero-eisbaden.jpg")` in SCSS.
2. Emits `dist/public/<name>-<width>.{avif,webp}` for widths `[480, 768, 1024, 1440, 1920]` smaller than the source, plus a full-size `dist/public/<name>.{avif,webp}`. The hero `image-set()` in `header.scss` lists AVIF → WebP → JPG, and `partials/_hero-preload.ejs` (included in every page's `<head>`) preloads both hero AVIFs — the CSS arrives via the deferred bundle, so the browser would otherwise discover them late. If a hero image is renamed or its format changes, update the preload URLs to match the `image-set()` exactly, or the image is downloaded twice (`check:dist` fails if they drift apart).
3. Writes `image-manifest.json` (gitignored, generated — never edit by hand) which `picture()` reads. AVIF encoding is slow (a cold run takes minutes), so an image is only re-encoded when its source size/mtime, the encoder settings, or one of its outputs changed; the manifest records all three. Because `dist/` is never wiped by webpack, the generator deletes outputs no longer in the manifest so renamed/removed images don't leave stale files behind. To force a full rebuild, delete `image-manifest.json`.

**To add an image**: drop the JPG in `public/`, reference it by basename from an `.ejs` or `.scss`, and rebuild. No config change needed. Unreferenced images in `public/` are skipped entirely.

**Share image**: `public/og-image.jpg` (1200×630) is built by `scripts/generate-og-image.js` — the hero photo, the logo rasterised from `Logo.svg`, and the wordmark, composited by Sharp. It is committed and regenerated **manually** via `npm run og-image`, deliberately not wired into the prebuild hooks: the wordmark is rendered through fontconfig, and a CI runner's font set differs from a developer machine, so building it there would silently substitute a fallback for Century Gothic. `generate-images.js` skips it by name, since a fixed-size social asset needs no responsive variants. Social crawlers do not render SVG, so the logo cannot be used as `og:image` directly.

### Metadata

**Page metadata** lives in `src/html/partials/_meta.ejs`, included with `path`, `ogTitle` and `description`. It emits the description, canonical, Open Graph and Twitter-card tags together, so every page stays consistent. `og:image` and `og:url` must be absolute — crawlers do not resolve relative paths. `404.ejs` is the exception: it hand-rolls its own `<head>` with `robots: noindex`.

`index.ejs` additionally carries a JSON-LD block (`Person`, `WebSite`, two `Service` entries) inline in its `<head>` — keep it in sync when service descriptions or the Über-mich copy change.

### Two-mode UI (warm / cold)

The site has a toggle switch that switches between a **Schwimmtraining** (warm, yellow palette) mode and an **Eisbaden** (cold, blue palette) mode. This is implemented by adding/removing `warm` and `cold` CSS classes on `<body>`:

- CSS variables in `tokens.scss` define the two color palettes under `body.warm` and `body.cold`; bare `body` carries the warm values too, so pages without the switch still get a full palette
- `display: none` rules hide `.warm` sections in cold mode and `.cold` sections in warm mode
- The two hero backgrounds are stacked as `header::before` (cold) and `header::after` (warm), cross-faded by opacity — likewise the snowflake in the logo
- `SiteState` class in `site-state.js` manages transitions and syncs state to the URL hash (`#schwimmtraining` / `#eisbaden`), including deep links and back/forward navigation
- Every mode change scrolls back to the top of the page: the content area is swapped wholesale, so the old scroll position is meaningless. That means suppressing the browser's own jump to the `#schwimmtraining` / `#eisbaden` section — hence `focus({preventScroll: true})` and the `load`-time correction in `holdPageStartUntilLoaded()`
- The toggle is a styled CSS checkbox (`#switch`), only present on `index.ejs`; the JS no-ops on other pages
- The two mode sections themselves live in `partials/schwimmtraining.ejs` and `partials/eisbaden.ejs` (no `_` prefix, unlike the site-chrome partials) — edit those, not `index.ejs`

### Conventions

- **Accessibility is load-bearing** — preserve it when editing markup: skip link, `.sr-only` helper, `aria-expanded`/`aria-checked` syncing, the `#mode-announcement` live region, the nav focus trap and Escape handler in `navigation.js`, `:focus-visible` outlines, and the `prefers-reduced-motion` block in `global.scss`.
- **JS modules** are side-effect scripts (no exports; wired up by `require()` in `main.js`) with `"use strict"` and JSDoc on every file, function, and field. Match that density.
- **Two modules rewrite the DOM at runtime**, so the markup stays plain: `gallery.js` wraps every `.gallery` in a `.gallery-wrapper` and injects a `.gallery-dots` row of `.gallery-dot` buttons (hidden when the gallery doesn't overflow); `footer.js` tags the first `.content-footer ul` item of each wrapped row with `row-start` via a `ResizeObserver`. Don't author those classes by hand.
- **SCSS**: use the mobile-first `@include xsmall/small/medium/large` mixins from `viewports.scss` (401/451/601/801 px) (`@use 'viewports' as *;`) rather than raw media queries. New stylesheets must be registered in `_index.scss`.
- **Layout classes** for content: `.image-aside` (optionally `.right`) for text wrapped beside an image, `.gallery` for a horizontally scroll-snapping row of images, `.cta` for a call-to-action button, `.mode-crosslink` for the link over to the other mode.
- **Content** lives as Markdown fragments in `src/content/`, grouped per section (`eisbaden/`, `schwimmtraining/`) — prefer editing those over inlining prose into `.ejs`.

### Pages

| File | Output | Notes |
|------|--------|-------|
| `index.ejs` | `index.html` | Landing page: full-height hero header, mode switch, both Schwimmtraining and Eisbaden sections, JSON-LD structured data |
| `about-me.ejs` | `about-me.html` | "Über mich" — Franziska Partheymüller |
| `about.ejs` | `about.html` | "Über Aqualign" — what the name means |
| `imprint.ejs` | `imprint.html` | Legal imprint (Impressum) |
| `404.ejs` | `404.html` | Not-found page served by GitHub Pages; own `<head>`, no `_meta` |

All pages except `index.ejs` use the `_compact-header` partial. Adding a page is just dropping an `.ejs` into `src/html/` — `webpack.config.js` picks up every file in that directory automatically.
