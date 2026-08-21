## 247420.xyz Portfolio — Unified gh-pages Pattern

Every repo in the 247420.xyz portfolio (33 projects; the portfolio list is
maintained privately, not in this repo) MUST follow this pattern:
- No package.json in repo root (CI/CD-only build); GitHub Actions runs `npx --yes flatspace@latest build` and deploys `./dist`
- Site source: flatspace.config.mjs + config/globals/*.yaml + config/pages/*.yaml + src/theme.mjs, rendering via the AnEntrypoint design system SDK (importmap-loaded, `installStyles()` + `class="ds-247420"` on the `#app` div, never `<html>`)
- SDK pin policy: every consumer (theme.mjs, index.html, importmap, installStyles bootstrap) MUST use `anentrypoint-design@latest` so any CI/CD build picks up the newest published design without redeploying the consumer. Never pin a fixed version in portfolio repos.
- Replace ANY other framework chrome (Tailwind, etc.) with SDK. EXCEPTION: the maintainer's private local Tailwind-reference demo project stays as-is (not part of this repo)
- Workflow/deploy-step detail — query rs-learn ("portfolio flatspace gh-pages workflow shape").

## CRITICAL — no Chrome/Puppeteer/Playwright dependency anywhere in this repo

Never add `puppeteer`/`puppeteer-core`/`playwright`/`playwright-core` as a dependency, and never hand-roll a raw headless-Chrome launch in a script. The ban is on the DEPENDENCY, not on live-browser verification: `scripts/cdp.mjs` is a zero-dependency CDP client (Node's global `WebSocket`) that drives an already-running Chrome, and it never launches one — the caller supplies `CDP_BASE`.

`scripts/a11y-audit.mjs` is built on it: axe-core (vendored, `vendor/axe-core/`) run against the live rendered DOM of every `ui_kits/*/index.html`, CI-blocking via ci.yml, ratcheted at 0 serious/critical violations. It gates on WCAG-tagged rules only, so best-practice rules (`page-has-heading-one`, `bypass`) are NOT covered — a kit can pass this audit with no `h1` and no skip link. Check those directly when they matter.

`scripts/lint-dead-controls.mjs` is the static counterpart: a control that renders but cannot act (an empty handler body, or `href="#"`) fails the build. Wired into the lint runner; escape hatches require stating a reason in source.

## Design System — Non-Obvious Caveats

**Visual north-star: shadcn-neutral (2026-07-30 restyle, system-font-only as of 2026-07-06). This REPLACED the former "Acid Editorial" look — that name and its electric-lime lead are historical, see CHANGELOG "Unreleased".** Typography policy is unchanged and still true: `--ff-display`/`--ff-narrow`/`--ff-body` resolve to `system-ui, sans-serif`; `--ff-mono` resolves to `ui-monospace, Menlo, Consolas, monospace` — no `@import`/`@font-face`, no web-font network request, `colors_and_type.css` is the single source for all four tokens. What changed: the palette is a neutral grayscale — `--acid` is now `#262626` and `--acid-deep` `#171717` (the token NAMES were deliberately kept so every consumer reference keeps working; do not read "acid" as lime anymore), and the derivation formulas (`color-mix()`/`oklch()`) are unchanged. The Hero is now a **centered flex stack** (`display:flex; flex-direction:column; align-items:center`), reversing the former "asymmetric two-column grid, never a centered stack" rule. Print texture is inert: `--grain-opacity` is `0`, so `.ds-grain`/`.ds-halftone` render nothing (machinery left defined for an explicit future opt-in). Motion gained restrained cubic-bezier curves — `--ease-drawer`/`--ease-collapse`/`--ease-out-strong` — alongside `--ease-spring`, which is retained and still referenced by real component sheets. **The `--accent` / `--accent-ink` split still stands, and still for a contrast reason, but the ratios are different now:** `--accent` is the FILL (behind `--accent-fg` text) and `--accent-ink` is the readable TEXT tone. Any new `color:` accent usage MUST use `--accent-ink`, not `--accent`; only `background`/`border-color` use the bare lead. In dark/ink themes `--accent` retunes to `#BFBFBF` with `--accent-ink` becoming `--paper`. A restyle that swaps base values invalidates every hand-tuned contrast derivation, so re-verify with `npm run a11y` (axe-core against all 20 live-rendered kits) rather than by eyeballing hex — that run is what caught `--accent-fg` sitting at 1.15:1 dark-on-dark after the swap.

For older Design System policy (zero-border aesthetic, panel-shadow source-strip, pill radius scale, sidebar floating-pill margin, surface tokens, hermes-theme reference, list-row primitives, row/input rules) — query rs-learn (e.g. "list bg borders", "pill radius scale", "box-shadow stripped", "list primitives", "fab cta sidebar").

**Stacking is a token scale, not a number.** `--z-*` is one 13-rung ladder in `colors_and_type.css` (`--z-below` -1, `--z-base` 0, then `raised`/`sticky`/`header`/`drawer`/`window`/`dock`/`dropdown`/`modal`/`toast`/`tooltip`/`top` at 100-step intervals). Never write a raw `z-index` number in a component sheet — pick the rung whose stated meaning matches, or add a rung. `lint-zindex` is a hard zero-tolerance gate.

**Sub-12px type has two tiers, deliberately.** `--fs-pico` (10px) and `--fs-nano` (11px) are the floor of the type scale, for glanceable secondary non-prose material only. Do not add further sub-12px rungs — the distribution does not support them, and a scale with a tier per outlier is a scale in name only.

**`transition: all` is banned outright** (`lint-transition-all`, hard zero). Name the properties: `all` silently animates layout properties like padding and border-width, which resizes a control under the pointer mid-interaction.

**`.ds-app-surface` is the Operate-mode root.** Any kit that is an application (dashboard, inspector, terminal, file browser, settings, search) puts `.ds-app-surface` on its page root to opt into the app typescale — otherwise page titles render at the marketing display ceiling. Its heading rules are DESCENDANT selectors on purpose: a kit that wraps its `h1` in a head row beside a theme toggle must still get the scale. `.ds-panel-trio` / `.ds-panel-duo` / `.ds-panel-flush` are the panel-row primitives; they declare real grid tracks that step down on CONTAINER width. Never express an equal N-up with percentage flex-basis or column spans — three 33.33% spans plus two gaps exceed 100% and the last one wraps.

**Panel rhythm is outer 2:1 inner.** Outer panel separation is `--space-5`, inner sibling gap `--space-3`, both density-scaled, so unrelated panels never read as more tightly grouped than related content. `[data-density]` must reach control internals (panels, fields, bars, rows), not only `--pad-x`.

## CSS Lint Gates — Coverage, Barrels, and Ratchets

`npm run lint` runs 13 gates (`scripts/lint.mjs`; `CHECKS` list and shared reporting in `lint-css.mjs`) over 30 component sheets. Four are hard zero-tolerance — `lint-tokens` (no raw color), `lint-radius` (`--r-*` only), `lint-zindex` (`--z-*` only), `lint-transition-all`. Three are ratchets with a frozen baseline file — `lint-spacing`, `lint-fontsize`, `lint-important`. The rest guard glyphs, null children, class prefixes, inline styles, and duplicate selectors.

- **A barrel sheet lints nothing on its own.** The root `app-shell.css` is an `@import` barrel over ~5,300 lines in `src/css/app-shell/*.css`. `COMPONENT_SHEETS` in `lint-tokens.mjs` lists ENTRY POINTS; `expandSheets()` resolves the `@import` graph transitively (cycle- and duplicate-safe) and that expansion is what every scanner iterates. Adding an entry point without expansion, or scanning a barrel directly, lints zero declarations.
- **Barrel completeness is a hard gate.** `FULL_COVERAGE_DIRS` requires EVERY `.css` file in `src/css/app-shell/` to end up in the expanded scan set. A new split sheet dropped into that directory must be `@import`ed by the root barrel (or listed explicitly in `COMPONENT_SHEETS` with a comment saying why). `build.mjs` keeps its own `appShellSplitFiles` bundling list, so a sheet can otherwise be in `dist/247420.css` while a consumer `<link>`ing `app-shell.css` renders those components unstyled — the divergence is invisible without this guard.
- **A ratchet baseline is a debt figure to drive DOWN, never a budget to spend.** `count <= baseline` passing is a floor, not a target. Slack in a baseline silently absorbs the next regression, so re-freeze the baseline DOWNWARD (`--write-<flag>-baseline`) whenever the count drops. Never raise a baseline to make a new violation pass.
- **Off-scale values are kept and commented, never snapped blind.** A wrong snap is worse than a documented literal: the `-1px` margin in the visually-hidden idiom, UA-arrow clearance on a `select`, one term of a `calc()`, and micro-type chips inside a line of prose are all deliberate. Comment the reason at the site.
- **Token-anchored derived values are not scale bypasses.** `max(16px, var(--fs-body))` and `calc()` forms anchored to an `--fs-*` token pass `lint-fontsize` by design — 16px is the iOS auto-zoom threshold, not a type size, and flagging it pushes authors toward a bare `16px`, which is strictly worse. `max()`/`clamp()` with NO token in them still FAIL.
- **Every gate must be proven to FAIL, not merely to pass.** Inject a violation, confirm the FAIL and exit 1, then confirm a negative control (a legitimate `var(--token, fallback)` form) does not false-positive. A gate that has only ever been seen green is unverified.
- **Token value comparison is whitespace-insensitive.** `lint-tokens-json` collapses whitespace runs before diffing, because CSS treats any whitespace run as a single separator — a byte-for-byte compare makes multi-line token values (the `--shadow-*` pairs) report permanent drift, and passes on CRLF while failing CI on LF.

## Icons — Line-Icon Component, Never Glyphs (build-guarded)

Decorative unicode glyphs are banned in source (the machine-shaped tell). Use the `Icon(name, {size})` line-icon SVG component in `src/components/shell.js` — extend `ICON_PATHS` to add a name (an out-of-set name renders an EMPTY span, a silent bug). Status dots are CSS circles: `<span class="ds-dot ds-dot-on|ds-dot-off">` (the `Dot()` component; `.ds-dot` in app-shell.css), never a `●`/`○` text glyph. ASCII stands in where no icon fits (`->`, `[x]`, `-`). Exempt: the `·` middle-dot separator and the `⌘` Mac Command-key symbol; `<option>` children are string-only (no SVG → use words). The build-time guard `scripts/lint-glyphs.mjs` (wired into `build.mjs` next to `lint-tokens`) fails the build on any banned glyph in `src/ui_kits/slides/site` — this is what stops the sweep regressing. Companion to the vocabulary ban below.

- Vocabulary ban: never write the words `gmail`, `mailbox`, `inbox`, or `compose` in source (CSS classes, HTML copy, JS identifiers, comments, or commit messages). The aesthetic is encouraged but the words are forbidden — use visual-function names: `.list`, `.list-row`, `.tabs`, `.list-toolbar`, `.btn-fab`, `.app-search`, `.label`; sidebar bins are `everything / starred / shipped / drafts`. This is non-obvious because the aesthetic itself channels that inspiration; only the lexicon is scrubbed.

## gm-* Plugin Ecosystem — Force-Push Pattern

The gm-* plugin family (gm-cc, gm-oc, gm-vscode, gm-zed, gm-cursor, gm-codex, gm-jetbrains, gm-kilo, gm-qwen, gm-gc, gm-copilot-cli, gm-antigravity, gm-hermes) are **downstream-generated, not human-edited**. All are FORCE-PUSHED by the `gm` package's `publish.yml` workflow on every gm release. Never push directly to those repos — your changes will be wiped on the next gm release. To modify them: edit `C:/dev/gm/platforms/<name>.js` or `C:/dev/gm/lib/template-builder.js` (especially `getCliGenericFiles`, `generatePagesWorkflow`, `generateGitHubPage`) and push to gm. The `publish.yml` will regenerate and force-push to all downstream repos.

## GitHub Actions Pages Deployment — Environment Branch Policy

GitHub Pages deploy needs `build_type=workflow` AND a deployment-branch-policy for the deploying branch — query rs-learn ("pages deploy branch policy") for the exact `gh api` calls.

## flatspace v1.0.17 — Dual-Mode Build Pattern

flatspace v1.0.17 dual-mode build (theme mode vs legacy bun mode, theme contract shape) — query rs-learn ("flatspace dual-mode build") for detail.

## Portfolio Aggregation Contract

247420.xyz aggregates per-project content via `scripts/fetch-showcase.mjs`, which scrapes `<script id="__site__">{site,nav,home}</script>` from each project's gh-pages URL into `lib/showcase.json`. Any project that emits this script tag (the standard flatspace theme contract from the Design SDK sweep) becomes auto-aggregable. Theme authors must keep emitting it — removing the tag silently downgrades the project's expo card to bare `p.body`/`p.install` fallback. Deploy uses `continue-on-error: true` so stale cache survives upstream outages.

## anentrypoint-design SDK Consumer Pattern

Static-site consumers (no bundler, no Node build) load the SDK from unpkg: the `dist/247420.css` stylesheet plus a module import of `dist/247420.js` to populate `window.ds`. Render pattern: `ds.applyDiff(rootEl, viewFn())` where `viewFn` returns `ds.components.AppShell({topbar, crumb, side, main, status})`. **Non-obvious caveat**: must add `class="ds-247420"` (NOT `app247420` — that string appears nowhere in the SDK) to the render root element BEFORE calling `applyDiff`, because every CSS rule in `dist/247420.css` is selector-prefixed with `.ds-247420`; without it the page falls back to user-agent defaults. The truth lives in `src/styles.js`: `export const scope = '.ds-247420'`. Full export list and the worked consumer example — query rs-learn ("SDK unpkg consumer exports ds-247420 scope").

**SDK-owned hash router (`src/router.js`).** Consumers use `new ds.Router({ fallback })` rather than a private hand-rolled copy — an unregistered route renders `fallback` instead of silently desyncing. Full API/state shape — query rs-learn ("SDK hash router Router register navigate").

## Legacy Interactive Page Wrap

Legacy `docs/*.html` pages with their own script/style wrap as an iframe inside the SDK shell, never gm-style article extraction (breaks interactivity) — query rs-learn ("legacy interactive page wrap iframe") for the asset-map/embedSrc detail.

## Re-architecture caveats — added 2026-05-01

- **Component layout**: `src/components.js` is a barrel; do not extend it. Add new components under `src/components/<group>.js` and re-export from the barrel. Chat-related code in `src/components/chat.js`; chrome (Topbar/Crumb/Side/AppShell) in `src/components/shell.js`; content blocks (Panel/Row/Hero/Manifesto/HomeView/ProjectView) in `src/components/content.js`. The 200-line cap applies per-module.
- **Two barrel levels, and the second one has a required shape.** A group that outgrows the cap becomes a thin barrel over single-responsibility submodules in a sibling directory of the same name (`src/components/editor-primitives.js` over `src/components/editor-primitives/*.js`; same for shell, content, chat, chat-message-parts, chat-minimap, agent-chat, sessions, files, files-modals, community, interaction-primitives, voice, freddie, page-html). The public export surface must not move — no consumer import changes. **Group barrels MUST use import-then-bare-export (`import { X } from './sub.js'` … `export { X }`), never a pure `export { X } from './sub.js'`.** `scripts/generate-component-docs.mjs` resolves each symbol by regex against the barrel with a one-hop re-export fallback; a pure `export … from` rewrites `docs/component-props.md` with drift warnings. Re-run `npm run docs:components` after any split — `lint:component-docs` gates it in CI, and a split moves the recorded source path of every symbol it touches.
- **Symbol resolution is first-match**: the doc generator matches the first `const <name> =` in a barrel-target file, so a local variable sharing a page/component name earlier in the file wins over the real definition. Keep modules single-responsibility and this cannot arise.
- **One extraction, two artifacts.** `scripts/component-surface.mjs` is the ONLY parser of the exported component surface; `generate-component-docs.mjs` (-> `docs/component-props.md`) and `generate-component-types.mjs` (-> `types/*.d.ts`) both render that one model. Never add a third parser or hand-edit either artifact — both are regenerated by `scripts/build.mjs` and gated in CI by `lint:component-docs` / `lint:component-types`, so a stale one fails the build rather than shipping a `types` entry that lies about the runtime surface. **A JSDoc `{Type}` on a prop is the highest-fidelity input the type generator has** (it is the only source of a real closed enum union like `'default'|'primary'|'ghost'|'danger'`); a default value literal is the next rung, then the component's own `prop === 'literal'` comparisons (emitted open, as `'a' | 'b' | (string & {})`, because a comparison scan proves values are ACCEPTED, never that others are refused), then `any`. Adding a JSDoc `@param` to a prop is therefore how you improve consumer types — nothing else narrows them.
- **`busy` and `loading` are orthogonal states, never converge them** (nor `emptyText` with the `emptyState` helper function) — query rs-learn ("busy loading orthogonal props") for which owns shape vs interactivity.
- **Markdown stack**: never bypass `renderMarkdown` to set chat HTML directly — DOMPurify is the only XSS gate, and the whole pipeline is fail-closed (any CDN/module/parse failure yields HTML-entity-escaped plaintext, never raw HTML and never a throw). Exact pins, `configureMarkdownCdn`/`configurePrismCdn` overrides and the CSP/air-gap writeup live in README's "chat / markdown / code-highlight" section.
- **Highlight stack**: `src/highlight.js` injects Prism core + per-language scripts on first use; adding a language means adding to `LANGS` — query rs-learn ("prism highlight loader CodeNode") for the loader detail.
- **Bootstrap pattern**: every ui_kit goes through `mountKit({ root, view, screen })` from `src/bootstrap.js`. Do not roll new motion/CDN/applyDiff loops in kit `app.js` files.
- **Web component**: `<ds-chat>` registers automatically when `src/index.js` loads in a browser. Consumers set `el.messages = […]` (or pass JSON via the `messages` attribute) and listen for the bubbling/composed `send` event with `{detail:{text}}`.
- **Observability**: `window.__debug` is the single client-side registry; modules register snapshot fns at load time. New subsystems must register; `console.log` does not count.
- **Inline styles ban**: no new inline `style="..."` strings in components. Add a `.ds-<thing>` class to `app-shell.css` instead — the build prefixes with `.ds-247420`.
- **A rule only exists where its consumer links it.** Before adding a CSS rule, check which sheets the kit that needs it actually `<link>`s. Most kits link only `colors_and_type.css` + `app-shell.css`; a rule placed in a separately-published sheet (`community.css`, `gm-prose.css`, `chat.css`, `editor-primitives.css`) is as undefined as no rule at all for a kit that never links it. Shared a11y/utility rules (`.sr-only`, prose utilities) belong in `app-shell.css`. Kit `<link>` sets are changed through `kits.config.mjs` + the scaffold generator, never by hand-editing generated `index.html` — `lint:ui-kits` checks the kits match generated output. The `.github/workflows/gh-pages.yml` static-CSS copy list must also carry any newly-referenced root sheet, or it 404s on the deployed site.
- **Before shipping a page, grep every class it uses against the stylesheets that page links.** A class with no matching rule falls back to browser defaults and renders silently wrong, not visibly broken — the single most-recurring defect shape in this repo.
- **Verify against the real accessibility tree and rendered geometry, not computed style.** `.sr-only` correctness means PRESENT in the AX tree and clipped to 1x1; a touch target means measured under coarse-pointer emulation, not a CSS read. The `.skip-link` 44px floor is unconditional, not behind `pointer:coarse` — switch and head-pointer users are not reported as coarse.
- **Every animation sits inside a `prefers-reduced-motion` block.** No exceptions, including background-only attention flashes.
- **Scrollbar treatment is one root rule**, not per-component; any scroller added later inherits it. A UA-default scrollbar reads as a bright seam on a near-black panel.
- **marked v15 + html-passthrough**: lines that contain raw HTML tags become text-passthrough — markdown emphasis around an inline `<script>` tag won't parse. Security holds (DOMPurify still strips dangerous tags); cosmetic blast on mixed input is expected.

## file-browser primitives — non-obvious caveats

File-row rails are owned by `data-file-type` (never hand-apply `.rail-*`); FileViewer needs `data-file-type` on head AND body; DropZone needs `preventDefault` on `document`; UploadProgress reads `data-pct`; BreadcrumbPath `onNav(i)` is segments-to-keep — query rs-learn ("file-browser primitives caveats") for the full set.

## webjsx applyDiff — Mixed Keyed/Primitive Children Crash

The vendored webjsx `applyDiff` (vendor/webjsx/applyDiff.js:43) throws `Cannot read properties of undefined (reading 'key')` when a parent's children array mixes keyed VElements with primitive (string) siblings. The keyed-map iteration assumes every oldVNode has `.props`. Fix: wrap raw text segments in a keyed `<span>` so all children are VElements. Affects every SDK consumer that interleaves text fragments with keyed component children.

Two more webjsx behaviours that fail silently rather than loudly:

- **A `null` prop value renders the string `"null"`, it does not omit the attribute.** `updateAttributesCore` (shared by the initial and update paths) stringifies it, so `id: id || null` emits `id="null"` and `href: cond ? x : null` emits `href="null"` — still a link, still tab-stopped. To actually leave an attribute off, spread the key in conditionally: `...(id ? { id } : {})`.
- **A component that returns a bare element on one branch must carry the caller's `key` on THAT element.** An internal key (`key: 'i'`) is only unique among the component's own children; when the element is returned unwrapped it becomes the node the caller keys, and two siblings then collide and get collapsed into one by the keyed diff.

## Probing whether a control actually works

Both of the obvious approaches report working controls as dead. Verify **behaviour**, never handler presence:

- `el.onclick` is **always** `false` here — webjsx binds through `addEventListener` (vendor/webjsx/attributes.js:15), never inline assignment.
- Re-renders are **asynchronous**: kit `render()` calls `kit.schedule()`, which defers through `queueMicrotask` (src/bootstrap.js:28). A click followed by a synchronous `document.body.innerHTML` diff reads the DOM before the re-render lands.

Correct probe: click → `await` ~60-80ms → **re-query** the element (the re-render replaces the node, so a held reference is stale) → compare. Exclude real external `http(s)` links, which cannot navigate in-page and otherwise read as dead. An audit that skips this reports ~100% false positives: one such pass claimed "20 of 20 homepage controls inert" where the real figure was 0 of 22.

Past sweep narratives live in `git log` and `CHANGELOG.md`.
