## 247420.xyz Portfolio — Unified gh-pages Pattern

Every repo in the 247420.xyz portfolio (33 projects, source-of-truth: C:/dev/247420/lib/projects.js) MUST follow this pattern:
- No package.json in repo root (CI/CD-only build)
- GitHub Actions: `npx --yes flatspace@latest build` -> deploys `./dist` via peaceiris/actions-gh-pages (or actions/deploy-pages)
- Site source: flatspace.config.mjs + config/globals/*.yaml + config/pages/*.yaml + src/theme.mjs
- theme.mjs MUST render via AnEntrypoint design system SDK (anentrypoint-design at `unpkg.com/anentrypoint-design@latest/dist/247420.js`), importmap-loaded, `installStyles()` + `class="ds-247420"` on the SDK render root (the `#app` div, not `<html>`), components from `window.ds`/webjsx `h()` factory
- SDK pin policy: every consumer (theme.mjs, index.html, importmap, installStyles bootstrap) MUST use `anentrypoint-design@latest` so any CI/CD build of any portfolio project picks up the newest published design without redeploying the consumer. Never pin a fixed version (`@0.0.16`) in portfolio repos.
- Replace ANY other framework chrome (Tailwind, etc.) with SDK
- EXCEPTION: c:\dev\flatspace-demo stays as-is (Tailwind reference)
- Earlier hand-rolled docs/index.html sites (floosie, rs-exec) are NOT going-forward — migrate to flatspace+SDK as part of sweep

## Design System — Non-Obvious Caveats

For Design System policy (zero-border aesthetic, panel-shadow source-strip, pill radius scale, sidebar floating-pill margin, surface tokens, hermes-theme reference, list-row primitives, row/input rules) — query rs-learn (e.g. "list bg borders", "pill radius scale", "box-shadow stripped", "list primitives", "fab cta sidebar").

## Icons — Line-Icon Component, Never Glyphs (build-guarded)

Decorative unicode glyphs are banned in source (the machine-shaped tell). Use the `Icon(name, {size})` line-icon SVG component in `src/components/shell.js` — extend `ICON_PATHS` to add a name (an out-of-set name renders an EMPTY span, a silent bug). Status dots are CSS circles: `<span class="ds-dot ds-dot-on|ds-dot-off">` (the `Dot()` component; `.ds-dot` in app-shell.css), never a `●`/`○` text glyph. ASCII stands in where no icon fits (`->`, `[x]`, `-`). Exempt: the `·` middle-dot separator and the `⌘` Mac Command-key symbol; `<option>` children are string-only (no SVG → use words). The build-time guard `scripts/lint-glyphs.mjs` (wired into `build.mjs` next to `lint-tokens`) fails the build on any banned glyph in `src/ui_kits/slides/site` — this is what stops the sweep regressing. Companion to the vocabulary ban below.

- Vocabulary ban: never write the words `gmail`, `mailbox`, `inbox`, or `compose` in source (CSS classes, HTML copy, JS identifiers, comments, or commit messages). The aesthetic is encouraged but the words are forbidden — use visual-function names: `.list`, `.list-row`, `.tabs`, `.list-toolbar`, `.btn-fab`, `.app-search`, `.label`; sidebar bins are `everything / starred / shipped / drafts`. This is non-obvious because the aesthetic itself channels that inspiration; only the lexicon is scrubbed.

## gm-* Plugin Ecosystem — Force-Push Pattern

The gm-* plugin family (gm-cc, gm-oc, gm-vscode, gm-zed, gm-cursor, gm-codex, gm-jetbrains, gm-kilo, gm-qwen, gm-gc, gm-copilot-cli, gm-antigravity, gm-hermes) are **downstream-generated, not human-edited**. All are FORCE-PUSHED by the `gm` package's `publish.yml` workflow on every gm release. Never push directly to those repos — your changes will be wiped on the next gm release. To modify them: edit `C:/dev/gm/platforms/<name>.js` or `C:/dev/gm/lib/template-builder.js` (especially `getCliGenericFiles`, `generatePagesWorkflow`, `generateGitHubPage`) and push to gm. The `publish.yml` will regenerate and force-push to all downstream repos.

## GitHub Actions Pages Deployment — Environment Branch Policy

GitHub Actions Pages deploy requires both `build_type=workflow` AND branch protection policy. Set Pages config via `gh api repos/OWNER/REPO/pages -X POST/PUT -f build_type=workflow`. If the repo's github-pages environment has `protection_rules` with `custom_branch_policies`, you MUST add the deploying branch (e.g., main) via `gh api repos/OWNER/REPO/environments/github-pages/deployment-branch-policies -X POST -f name=main -f type=branch`. Without this step, the deploy job fails: "Branch X is not allowed to deploy to github-pages due to environment protection rules." This is non-obvious because the error only surfaces at deploy time, and the API endpoint is not discoverable from the UI.

## flatspace v1.0.17 — Dual-Mode Build Pattern

flatspace v1.0.17 switches behavior based on file presence: when `flatspace.config.mjs` exists in cwd, it runs **theme mode** (calls `theme.render(ctx)` returning `Array<{path,html}>`, writes to `outDir` default `docs`, reads YAML from `contentDir` default `content`). When the config file is absent, it runs **legacy bun build mode**. The theme contract includes: `ctx.read('pages').docs`, `ctx.readGlobal(slug)`, `ctx.writeFile(rel, data)`. CI builds via `npx --yes flatspace@latest build` without requiring local node_modules.

## Portfolio Aggregation Contract

247420.xyz aggregates per-project content via `scripts/fetch-showcase.mjs`, which scrapes `<script id="__site__">{site,nav,home}</script>` from each project's gh-pages URL into `lib/showcase.json`. Any project that emits this script tag (the standard flatspace theme contract from the Design SDK sweep) becomes auto-aggregable. Theme authors must keep emitting it — removing the tag silently downgrades the project's expo card to bare `p.body`/`p.install` fallback. Deploy uses `continue-on-error: true` so stale cache survives upstream outages.

## anentrypoint-design SDK Consumer Pattern

Static-site consumers (no bundler, no Node build) load the SDK from unpkg: `<link rel="stylesheet" href="https://unpkg.com/anentrypoint-design@latest/dist/247420.css">` + `<script type="module">` importing from `https://unpkg.com/anentrypoint-design@latest/dist/247420.js` to populate `window.ds`. The SDK exports: `h`, `applyDiff`, `components`, `mount`, `installStyles`, `scope`, `webjsx`, `registerDeckStage`, `getDeckStage`, `loadCss`. Render pattern: `ds.applyDiff(rootEl, viewFn())` where `viewFn` returns `ds.components.AppShell({topbar, crumb, side, main, status})`. **Non-obvious caveat**: must add `class="ds-247420"` (NOT `app247420` — that string appears nowhere in the SDK) to the render root element BEFORE calling `applyDiff` — every CSS rule in `dist/247420.css` is selector-prefixed with `.ds-247420`, so without it the page falls back to user-agent defaults (Times New Roman, transparent panels). 247420.xyz hides this because it ships its own local `styles.css` instead of relying on the SDK CSS. The truth lives in `src/styles.js`: `export const scope = '.ds-247420'`. Confirmed working on AnEntrypoint/dispipe (gh-pages live at https://anentrypoint.github.io/dispipe/).

## Legacy Interactive Page Wrap — Iframe vs Article Extraction

When a portfolio repo has legacy `docs/*.html` pages with their own `<style>`/`<script>`/importmap, wrapping them as gm-style article extraction (body unwrap) breaks interactivity. Use **iframe embed inside SDK shell** instead: flatspace `theme.mjs` `assets:` map copies `../docs/<page>` to `_legacy/<page>` (plus sibling deps like `vendor/`, `css/`, `js/`); theme `render` emits a wrapper page at the original URL with SDK Topbar+Crumb+Footer and `main: C.Panel({ children: h('iframe', { src: '<rel-path-to-_legacy>', style: 'width:100%;height:calc(100vh - 180px);min-height:520px;border:0' }) })`. embedSrc resolves relative to wrapper path: `./_legacy/foo.html` for top-level, `../_legacy/foo/index.html` for nested. Trade-off: loses content height auto-sizing. Use article extraction only for static prose papers. Applied 2026-04-30 to thebird/todo, thebird/preview, agentgui/demo, zellous/nostr-chat.

## Re-architecture caveats — added 2026-05-01

- **Component layout**: `src/components.js` is a barrel; do not extend it. Add new components under `src/components/<group>.js` and re-export from the barrel. Chat-related code in `src/components/chat.js`; chrome (Topbar/Crumb/Side/AppShell) in `src/components/shell.js`; content blocks (Panel/Row/Hero/Manifesto/HomeView/ProjectView) in `src/components/content.js`. The 200-line cap applies per-module.
- **Markdown stack**: `src/markdown.js` lazy-loads `marked@15` + `DOMPurify@3` from jsDelivr ESM at first call. Block markdown lands in `.chat-md` via the `MdNode` ref-callback in chat.js, which sets `innerHTML` from the sanitized output. Never bypass `renderMarkdown` to set chat HTML directly — DOMPurify is the only XSS gate.
- **Highlight stack**: `src/highlight.js` injects Prism core + per-language scripts on first use. The `CodeNode` ref-callback waits for prism then calls `highlightAllUnder`. Adding a new language: add to `LANGS` array; loader idempotency-checks `Prism.languages[lang]`.
- **Bootstrap pattern**: every ui_kit goes through `mountKit({ root, view, screen })` from `src/bootstrap.js`. Do not roll new motion/CDN/applyDiff loops in kit `app.js` files.
- **Web component**: `<ds-chat>` registers automatically when `src/index.js` loads in a browser. Consumers set `el.messages = […]` (or pass JSON via the `messages` attribute) and listen for the bubbling/composed `send` event with `{detail:{text}}`.
- **Observability**: `window.__debug` is the single client-side registry; modules register snapshot fns at load time. New subsystems must register; `console.log` does not count.
- **Inline styles ban**: no new inline `style="..."` strings in components. Add a `.ds-<thing>` class to `app-shell.css` instead — the build prefixes with `.ds-247420`.
- **marked v15 + html-passthrough**: lines that contain raw HTML tags become text-passthrough — markdown emphasis around an inline `<script>` tag won't parse. Security holds (DOMPurify still strips dangerous tags); cosmetic blast on mixed input is expected.

## file-browser primitives — non-obvious caveats

- File-type values are the canonical seven plus three: `dir`, `image`, `video`, `audio`, `code`, `text`, `archive`, `document`, `symlink`, `other`. Anything outside that set falls through to the neutral rail and the `◌` glyph.
- Rail color comes from `data-file-type` on the row. Never hand-apply `.rail-green`, `.rail-sun`, etc. to file rows — the CSS owns the mapping and applying both makes one rule silently lose to the other.
- `FileViewer` portal-renders to `<body>` via `Backdrop` (z-index above the topbar). The viewer's head AND body both carry `data-file-type` so the rail color propagates inside the modal — set both, not just one, or the inside of the viewer falls back to neutral.
- `DropZone` only previews local-file UI; the real upload still needs `preventDefault` registered on `document`, not just on the zone, or the browser will navigate to the dropped file the moment it hits any non-zone region.
- `UploadProgress` reads `data-pct` on `.ds-upload-fill` to drive the bar width — write a string number 0–100, not a percent string.
- `BreadcrumbPath` calls `onNav(0)` for the root and `onNav(i+1)` for each segment after; the index is "how many segments to keep", not "which segment was clicked".

## webjsx applyDiff — Mixed Keyed/Primitive Children Crash

The vendored webjsx `applyDiff` (vendor/webjsx/applyDiff.js:43) throws `Cannot read properties of undefined (reading 'key')` when a parent's children array mixes keyed VElements with primitive (string) siblings. The keyed-map iteration assumes every oldVNode has `.props`. Fix: wrap raw text segments in a keyed `<span>` so all children are VElements. Affects every SDK consumer that interleaves text fragments with keyed component children.

## Learning audit

- 2026-04-26..04-30: design-policy items (zero-border, row zebra, input focus, hermes tokens, surface tokens, pill radius, box-shadow strip, no-serifs, dark-mode grey, list-row category colors, density) migrated to rs-learn; project facts ingested (showcase aggregator/runtime, site-script contract, sdk-iframe-wrap, iframe-vs-article); caveats added (Portfolio Aggregation Contract, Legacy Interactive Page Wrap, webjsx mixed-keyed crash). [drained to rs-learn — query there for detail]
- 2026-05-29: glyph jank sweep — banned all decorative unicode glyphs across src/ui_kits/slides/site, routed to `Icon()`/`ds-dot`/ASCII, added build-guard `scripts/lint-glyphs.mjs`, fixed Tooltip/EmojiPicker listener leaks + Status mixed-keyed span + community empty-states/clamp + community-app/markdown-cache `__debug` registration, deduped chat threadRef. Added "Icons — Line-Icon Component" caveat above. Substance memorize-fired to rs-learn.

@.gm/next-step.md
