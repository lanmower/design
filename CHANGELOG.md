
## [unreleased]
- Prose/tool rhythm refactor (v0.0.97). Add `--prose-stack-sm/md/lg` (12/24/56px), `--tool-gutter` (16px), and `--measure-prose` (68ch) to `colors_and_type.css`. New `.ds-prose` editorial surface — no chrome, capped measure, asymmetric heading margins (large above, small below — headings hug their own body). `Manifesto` no longer wraps in a `Panel`/`.panel-manifesto`; it returns a bare `.ds-prose .ds-manifesto` container so editorial copy reads on bare paper. `ProjectView` lede pair (Heading + Lede) now lives in a `.ds-prose` block. `work-detail` body paragraph moved into a `.ds-prose` region so expanded works inherit the 68ch measure and rhythm. `.panel-head` padding flipped to `10px 22px 18px 22px` (more space below the heading than above — heading hugs its panel body). Panel internals migrate ad-hoc gaps to `var(--tool-gutter)` (panel-head gap, panel-body horizontal padding, ds-work-actions gap). `.ds-section:has(> .ds-prose:only-child)` drops card chrome via `:has` — prose sections render on bare paper without changing the consumer's wrapping API.
- Strip `text-transform: uppercase` from `.kpi-card .lbl` and tighten letter-spacing — the bible forbids all-caps chrome and every freddie route was shouting via the Kpi component. Lowercase the four chat composer labels in `src/components/freddie/pages-chat.js` (working directory / skill / provider / model). Remove `border-bottom` from `.fd-cfg-row` and the static 1px border on `.fd-cfg-control input/select`; replace with tonal zebra (`panel-2` on even rows) and `panel-3` control fill. Loosen `.fd-label` letter-spacing now that labels read lowercase. Witnessed across all 14 freddie dashboard routes.
- Add base padding (8px 12px), border-radius 10px, Nunito font, and tonal background to bare input elements (text/email/password/search/number) in app-shell.css to match button and textarea styling
# Changelog

## Unreleased

### Flash of Unstyled Content (FOUC) fix

- **Added render-blocking stylesheet link** to `site/theme.mjs` — `<link rel="stylesheet" href="https://unpkg.com/anentrypoint-design@latest/dist/247420.css">` placed in `<head>` before `<div id="app"></div>`. Blocks initial page paint until SDK CSS loads, eliminating visible flash when flatspace portfolio projects load anentrypoint-design from unpkg.

### Claude Code skill registration

- **Enabled `npx skills add AnEntrypoint/design -g claude-code`** — copied `SKILL.md` (324L, user-invocable) from root to `.claude/skills/design/SKILL.md` following Agent Skills GitHub discovery convention. Skill documentation includes design tokens, consuming patterns, and SDK integration examples.

### Hygiene: split deck-stage.js

- **Split `slides/deck-stage.js`** (was 227L) into `deck-stage-state.js` (66L, state/lifecycle functions) + `deck-stage.js` (159L, custom element class). Extracted: `loadNotes`, `restoreIndex`, `persistIndex`, `collectSlides`, `applyIndex` + shared constants `STORAGE_PREFIX`, `VALIDATE_ATTR`. Main class now imports and delegates to state module. Acceptance criterion met: slides/deck-stage.js ≤200L. test.js passes.

### CDN elimination per AGENTS.md portfolio rule

- **Removed Prism.js CDN loader** from `src/highlight.js`. Syntax highlighting is optional showcase feature; disabled to align with "no CDN except SDK @latest" rule.
- **Removed animate.css CDN loader** from `src/motion.js` and both UI kits (`ui_kits/homepage/app.js`, `ui_kits/project_page/app.js`). Motion system disabled as showcase enhancement, not critical feature.
- **Added `scripts/bundle-markdown.mjs`** — fetch-at-build-time pattern for marked@15 + DOMPurify@3. Bundles locally instead of loading from jsDelivr CDN at runtime.
- Lazy-loaded markdown (src/markdown.js) remains unchanged — non-blocking deferred load acceptable per rule intent.

### Re-architecture pass

- **Modularized `src/components.js`** (was 524L) → barrel re-exporting `src/components/shell.js`, `src/components/content.js`, `src/components/chat.js`. The barrel itself is 21 lines.
- **Replaced hand-rolled markdown** with `marked@15` + `DOMPurify@3` loaded as ESM from jsDelivr at first use. Block markdown (h1–h4, lists, blockquote, hr, table, code fences) now renders inside `.chat-md`. Sanitization removes `<script>`, `<iframe>`, `javascript:` URLs, `onerror`/`onclick`/etc.
- **Added Prism.js syntax highlighting** for `.chat-code` parts. Languages preloaded: markup, css, clike, javascript, jsx, tsx, typescript, json, bash, python. Tokens witnessed live for jsx (27) and python (73) blocks.
- **Added `src/bootstrap.js`** with `mountKit({ root, view, screen })` — single entry point that wires animate.css link, prism CSS link, motion shim, applyDiff render loop, and `window.__debug` registration. Replaces per-kit copy-paste boot code.
- **Added `src/debug.js`** — `window.__debug` observability registry. Subsystems register a snapshot fn; `window.__debug.list()` and `.snapshotAll()` give live state. Active subsystems: `markdown`, `highlight`, `chat`, `ds-chat`, `bootstrap`.
- **Added `<ds-chat>` web component** (`src/web-components/ds-chat.js`). Custom element with `messages` setter, attribute reflection for `title`/`sub`/`placeholder`, dispatches a bubbling/composed `send` event with `{detail:{text}}` when the user submits.
- **Split `slides/deck-stage.js`** (was 621L) into `deck-stage-style.js` (CSS template literal) + `deck-stage-overlay.js` (overlay/tapzones DOM + keyboard handler dispatch table) + `deck-stage.js` (227L, custom element class). Now an ES module — slides/index.html updated to `type="module"`.
- **Replaced inline style attribute strings** in components with `.ds-*` CSS classes. Hero, section, manifesto, work-detail, changelog, link-accent, dot-live/idle, crumb-right, pattern-notes are now class-driven.
- **Removed `vendor/rippleui-1.12.1.css`** (was 0 bytes — dead). Build manifest updated.
- **Added `test.js`** (174L, ≤200 cap) — single integration test. Boots local static server, verifies HTTP 200 on chat/aicat/slides/index. Browser group skipped if playwright not in node_modules; the witness is provided by `exec:browser` during development.
- **`npm run test`** now wired to `test.js`.

### Witnessed in browser

- chat kit: 8 messages render across 7 attachment kinds (text/code/image/pdf/file/link/md) with reactions and read-receipts; marked produced h2 + bullet list + blockquote; prism produced 27 tokens.
- aicat kit: classifier triggers code (jsx, python), md with code fence, image, pdf, file, link, text replies. python sieve highlight produces 73 tokens.
- xss vector `<script>` + `javascript:` link + `<img onerror>` all stripped — `window.__pwn` never set; no script tags inside `.chat-thread`; no surviving `javascript:` href; no `onerror` attribute.
- `<ds-chat>` web component: registers, renders 1 seeded message, fires `send` event with `'go'` when programmatically submitted.
- slides: 6 sections collected; ArrowRight advances, Home returns to 0; shadow overlay present.
- homepage kit: still renders post-refactor; h1 reads "the creative department of the internet."
