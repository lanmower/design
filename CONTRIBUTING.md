# Contributing

This is a guide for human contributors. AI agents working in this repo follow
`SKILL.md` instead — that file is the authoring/voice contract, not a
substitute for the setup steps below.

## Running things locally

This is a buildless, static-file repo: `ui_kits/`, `preview/`, and `site/`
pages are plain HTML/JS served as-is, with no dev server baked into
`package.json` (there is no `npm start`/`npm run dev`). Serve the repo root
with any static file server and open the kit/preview you want, e.g.:

```bash
npx http-server . -p 8899
# then open http://localhost:8899/ui_kits/homepage/
```

`8899` is not arbitrary — it's the default `BASE_URL` port the a11y
(`scripts/a11y-audit.mjs`) and visual-regression (`scripts/visual-baseline.mjs`)
tooling expect, so using it locally keeps those scripts' defaults working
without extra env vars.

To build the published bundle (`dist/247420.js` / `dist/247420.css`):

```bash
npm run build
```

Useful scripts (see `"scripts"` in `package.json` for the full list):

- `npm run lint` — full CSS/JS lint gate (see below)
- `npm run docs:components` — regenerate `docs/component-props.md`
- `npm run types:components` — regenerate `types/components.d.ts`
- `npm run tokens` / `npm run tokens:css` — regenerate token JSON/CSS
- `npm run a11y` — axe-core WCAG audit against a running kit server
- `npm run visual` / `npm run visual:update` — visual regression check/rebaseline

## Where things live

- **`src/components/`** — the component source, split into single-responsibility
  modules (`shell.js`, `content.js`, `chat.js`, `files.js`, etc.); `src/components.js`
  is the re-export barrel every consumer actually imports from. A module that
  outgrows ~200 lines becomes a thin barrel of its own over a sibling directory
  (e.g. `src/components/editor-primitives.js` over `editor-primitives/*.js`) —
  the public export surface never moves.
- **`preview/`** — one static HTML page per primitive/pattern, used for visual
  QA, the a11y audit, and visual regression baselines.
- **`ui_kits/`** — full working example apps (buildless, loading the SDK from
  this repo) — `homepage`, `chat`, `file_browser`, `dashboard`, etc. Each kit's
  generated `index.html` comes from `ui_kits/kits.config.mjs` via
  `npm run generate:ui-kits` — never hand-edit a kit's `index.html`.
- **`site/`** — the flatspace-driven marketing/docs site (`site/theme.mjs` +
  `site/content/pages/*.yaml`) that renders this repo's own homepage.

There is no separate `kits/` directory — kit examples live under `ui_kits/`.

## Adding a design token

Tokens live in `colors_and_type.css` (the single source of truth — every
component stylesheet must consume `var(--token-name)`, never a raw color/size
literal). To add or change a token:

1. Add the `--token-name: value;` declaration to the right section of
   `colors_and_type.css` (grouped by comment headers — colors, type scale,
   spacing, panel surfaces, etc.).
2. Regenerate the derived artifacts: `npm run tokens` (writes `tokens.json`,
   a flat machine-readable snapshot) and `npm run tokens:doc` (also refreshes
   the theme-tokens documentation).
3. Run `npm run lint:tokens` (part of `npm run lint`) to confirm no component
   sheet still hard-codes the value you just tokenized.

`tokens.json` and the token-doc generator are read-only reflections of
`colors_and_type.css` — never hand-edit the generated output.

## What the lint gates check

`npm run lint` runs `scripts/lint.mjs`, which delegates to
`scripts/lint-css.mjs` — an orchestrator that imports every rule module below
and aggregates one pass/fail report:

- **`lint-tokens.mjs`** — no raw color literal in any component stylesheet;
  every color must come from a `var(--token)` in `colors_and_type.css`.
- **`lint-classes.mjs`** — every class a component emits belongs to a named
  prefix family (`ds-`/`app-`/`ws-`/`chat-`/…), a public utility class, or the
  frozen legacy bare-name list — nothing new and unprefixed.
- **`lint-css.mjs`** — the shared driver described above; also home to the
  font-size, `!important`, and spacing ratchet checks bundled inline.
- **`lint-dead-controls.mjs`** — flags a rendered control that cannot act: an
  empty/no-op handler, or a bare `href="#"`.
- **`lint-duplicate-selectors.mjs`** — the same CSS selector defined twice with
  a *different* rule body (same file or across files), since the bundle is a
  straight concatenation with no cascade-dedup.
- **`lint-glyphs.mjs`** — no hard-coded decorative unicode glyph (arrows,
  bullets, stars, status dots); use the `Icon()` SVG set or plain ASCII.
- **`lint-inline-css.mjs`** — runs the same token/literal scanners over CSS
  living inside inline `<style>` blocks in HTML, closing the gap
  `lint-tokens.mjs` leaves (it only scans `.css` files).
- **`lint-inline-styles.mjs`** — no hard-coded layout property in a
  `style="..."` attribute; layout belongs in classes so responsive rules stay
  centralized. Dynamic non-layout style writes are allowed.
- **`lint-null-children.mjs`** — catches a bare `null` sitting among vnode
  siblings in a children array (a real webjsx `applyDiff` crash), enforcing
  the `.filter(Boolean)` discipline.
- **`lint-rtl-physical-properties.mjs`** — no physical `left`/`right`
  CSS property where a logical `inline-start`/`inline-end` equivalent would
  auto-mirror under `[dir="rtl"]`.
- **`lint-swallow-comments.mjs`** — every empty `catch {}` block must carry a
  `// swallow: <why>` comment or equivalent explanation — swallowing errors is
  allowed, but never silently.

Four gates are hard zero-tolerance (`lint-tokens`, plus raw `border-radius`,
raw `z-index`, and `transition: all` bans folded into `lint-css.mjs`). Four
are ratchets frozen against a baseline that may only move down
(`lint-spacing`, `lint-fontsize`, `lint-important`, `lint-dead-controls`).

`npm run a11y` is a separate, runtime companion — axe-core against the live
rendered DOM of every kit via CDP, blocking on serious/critical WCAG
violations; it needs a Chrome already listening on `CDP_BASE` and a server on
`BASE_URL`.

## Before opening a PR

- `npm run lint` and `npm run lint:component-docs` / `lint:component-types`
  (make sure any component signature change regenerated `docs/component-props.md`
  and `types/components.d.ts`).
- `npm run build` to confirm the bundle still compiles.
- If you touched anything under `preview/`, consider `npm run visual` against
  a locally-run server + headless Chrome (see the Visual regression testing
  section of `README.md`).
