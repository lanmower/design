# 247420

The 247420 / AnEntrypoint design system, packaged as a single-file ESM SDK.
(`247420` is this project's internal bundle/codename -- it appears as the dist
filename `dist/247420.js`/`dist/247420.css` and in a few package.json fields;
the published npm package name is `anentrypoint-design`. Both names refer to
the same single system.)

shadcn-neutral: a grayscale accent system on paper or near-black ink, system-font stack (no web-font request), monospace only on real code, tonal surfaces over borders, indicator rails for color-coded separation, centered layout.

## install (the only step)

You have two choices. Both are one line.

**npm** (when you already have a bundler):

```bash
npm install github:AnEntrypoint/design
```

**jsDelivr GitHub CDN** (when you don't, and you don't want one):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/AnEntrypoint/design@<commit-sha>/dist/247420.css">
<script type="importmap">
  { "imports": { "anentrypoint-design": "https://cdn.jsdelivr.net/gh/AnEntrypoint/design@<commit-sha>/dist/247420.js" } }
</script>
```

Pin to a specific commit SHA (the default above) so your UI only changes when
you choose to bump it. jsDelivr also serves an unpinned `@main`, which tracks
the default branch and updates on every push with no separate publish step —
useful for always-latest experimentation, but it means your consumers' UI can
change on someone else's push, and jsDelivr's own edge cache for a floating
branch reference is not instant or fully consistent (a purge does not always
resolve immediately), so treat it as approximate even for that use case:

```html
<script type="importmap">
  { "imports": { "anentrypoint-design": "https://cdn.jsdelivr.net/gh/AnEntrypoint/design@main/dist/247420.js" } }
</script>
```

CSP note: both install paths above load `marked`/`DOMPurify`/`Prism` from
`cdn.jsdelivr.net` at first render (not bundled) -- if you deploy behind a
strict Content-Security-Policy or air-gapped environment, read the "Network
dependency" section below before you ship.

Add the scope class on a wrapping element and you are done:

```html
<html class="ds-247420" data-theme="paper">
  <body><div id="app"></div></body>
</html>
```

## use it (3-line app)

```js
import { mount, components as C } from 'anentrypoint-design';

mount(document.getElementById('app'), () => C.AppShell({
  topbar: C.Topbar({ brand: '247420', leaf: 'gm', items: [['works','#/works']] }),
  main:   C.HomeView({ /* hero, features, examples — see ./site/content/pages/home.yaml */ }),
  status: C.Status({ left: ['main'], right: ['live'] })
}));
```

`mount` automatically adds `.ds-247420` to your root.

## Framework integration

The SDK is framework-free (webjsx + custom elements), so React/Vue integration
means treating `<ds-chat>` (see below) as an imperative DOM element rather than
a native component.

**React** — set props/attributes on the element via `ref`, after import registers it:

```jsx
import { useRef, useEffect } from 'react';
import 'anentrypoint-design'; // registers <ds-chat>

function ChatWidget({ messages, onSend }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    el.messages = messages;
    const handleSend = (e) => onSend(e.detail.text);
    el.addEventListener('send', handleSend);
    return () => el.removeEventListener('send', handleSend);
  }, [messages, onSend]);

  return <ds-chat ref={ref} />;
}
```

**Vue** — tell the compiler `ds-chat` is a custom element (not a Vue component)
so it isn't warned about / resolved against your component registry, then use
it directly in a template. In `vite.config.js`:

```js
import vue from '@vitejs/plugin-vue';

export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'ds-chat',
        },
      },
    }),
  ],
};
```

Then in a Vue SFC:

```vue
<script setup>
import 'anentrypoint-design'; // registers <ds-chat>
import { ref, onMounted } from 'vue';

const el = ref(null);
onMounted(() => {
  el.value.messages = [{ role: 'assistant', text: 'gm.' }];
  el.value.addEventListener('send', (e) => console.log(e.detail.text));
});
</script>

<template>
  <ds-chat ref="el" />
</template>
```

## what's in the box

- **chrome** — `Topbar`, `Crumb`, `Side`, `Status`, `AppShell`, `Brand`, `Chip`, `Btn`, `Glyph`, `Heading`, `Lede`
- **content** — `Panel`, `Row`, `RowLink`, `Hero`, `Install`, `Receipt`, `Changelog`, `WorksList`, `WritingList`, `Manifesto`, `Section`, `Kpi`, `Table`, `HomeView`, `ProjectView`
- **chat** — `Chat`, `ChatMessage`, `ChatComposer`, `AICat`, `AICatPortrait`
- **multi-agent chat shell** — `WorkspaceShell`, `WorkspaceRail`, `ConversationList`, `AgentChat`, `SessionDashboard` — the flagship desktop-class chat-agent product surface (persistent rail + resizable columns + full turn/tool-call thread + live multi-session dashboard). See `COMPONENT_API.md` for the full prop contract; a runnable mock-data demo lives at `ui_kits/workspace/`; the canonical real-world wiring ships at [`agentgui`](https://github.com/AnEntrypoint/agentgui).
- **file browser** — `FileRow`, `FileGrid`, `FileToolbar`, `FileIcon`, `DropZone`, `UploadProgress`, `EmptyState`, `BreadcrumbPath`, plus modal pieces `FileViewer`, `FilePreviewMedia`, `FilePreviewCode`, `FilePreviewText`, `ConfirmDialog`, `PromptDialog`
- **desktop-shell (os kit)** — `createDesktopShell`, `renderWindow`, `renderDock`, plus paint surfaces `renderAboutApp`, `renderBrowserPane`, `renderFilesApp`, `renderMonitorApp`, `renderTerminal`, `createFreddieDashboard` (`src/kits/os/`, package export `ds/kits/os/index.js`). Pure visual/DOM-rendering layer — window-manager state (z-order, focus stack, drag/resize math) and app lifecycle are owned by the consumer. A runnable demo (self-contained window manager + 2 apps) lives at `ui_kits/os/`; the canonical real-world wiring — the full multi-instance web OS (per-instance filesystem/worker/POSIX-shell, the complete app catalog) — ships at [`thebird`](https://github.com/AnEntrypoint/thebird), which vendors this kit via `scripts/refresh-design.mjs`.
- **ui_kits** — 23 fully-working buildless examples loading the SDK from this repo: `homepage`, `project_page`, `docs`, `blog`, `chat`, `aicat`, `file_browser`, `dashboard`, `settings`, `search`, `terminal`, `gm_inspector`, `workspace`, `community-app`, `gallery`, `signin`, `error_404`, `slide_deck`, `system_primer`, `os`, `component_explorer`, `buttons`, `dynamic-accent`. (`_template` is the scaffold source, not a kit: it holds `index.html.tmpl` — a build input full of `{{VAR}}` placeholders — and deliberately serves no page. The standalone `community` kit was folded into `community-app` upstream during this same window — a live example of exactly the count-drift this note warns about.) Each kit's stylesheet `<link>` set is declared in `ui_kits/kits.config.mjs` and emitted by the scaffold generator (`npm run generate:ui-kits`) — never hand-edit a kit's generated `index.html`; `npm run lint:ui-kits` checks them against generated output. This count (like the component count below) is still hand-set in this prose, not generated from a manifest -- verify against `find ui_kits -maxdepth 1 -type d ! -name _template | wc -l` if it looks stale.
- **component explorer** — an interactive, searchable, buildless alternative to Storybook (`ui_kits/component_explorer/`): lists all 302 exported components, grouped by source file, with a real generated prop table per component and a live-mounted specimen for the 4 components already proven safe to render standalone (`Btn`, `Chip`, `Badge`, `Table`) -- not yet a live specimen for all 302; that gap is tracked in `PRD-remediation-2026-08-20.md`. Reads `manifest.json`, generated by `npm run manifest:components` from the same `extractComponentSurface()` model `docs/component-props.md` and `types/*.d.ts` already share — a CI gate (`npm run lint:component-manifest`) fails the build if it drifts from the real signatures.

The file-browser surface (rails by file type, drop-zone upload, modal preview) ships its canonical real-world wiring at [`fsbrowse`](https://github.com/AnEntrypoint/fsbrowse) — Express + busboy backend, the SDK frontend.

## use it from a buildless flatspace project

A "buildless flatspace project" in this sense has **no `package.json`**. It has a `flatspace.config.mjs`, YAML pages under `config/`, and a `src/theme.mjs` that turns each page into HTML at build-time. CI runs `npx --yes flatspace@latest build` and deploys `dist/`.

To plug 247420 into that shape, do exactly three things:

### 1. Reference the SDK from `<head>` in `src/theme.mjs`

```js
export default function render({ site, page }) {
  return `<!doctype html>
<html lang="en" class="ds-247420" data-theme="paper">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${page.title} — ${site.title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/AnEntrypoint/design@main/dist/247420.css">
  <script type="importmap">
    { "imports": { "anentrypoint-design": "https://cdn.jsdelivr.net/gh/AnEntrypoint/design@main/dist/247420.js" } }
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { mount, components as C } from 'anentrypoint-design';
    const data = ${JSON.stringify({ site, page })};
    mount(document.getElementById('app'), () => C.AppShell({
      topbar: C.Topbar({ brand: data.site.title, items: data.site.nav }),
      crumb:  C.Crumb({ leaf: data.page.title }),
      main:   data.page.template === 'home' ? C.HomeView(data.page) : C.Section(data.page),
      status: C.Status({ left: ['main'], right: ['live'] }),
    }));
  </script>
</body>
</html>`;
}
```

### 2. Author pages in YAML

```yaml
# config/pages/home.yaml
id: home
title: home
template: home
hero:
  heading: tigers
  subheading: large striped cats
  body: a flatspace site, styled by 247420.
  badges: [ { label: encyclopedic }, { label: lowercase }, { label: 100% YAML } ]
features:
  heading: why tigers
  items:
    - { name: stripes, desc: structurally redundant, semiotically loud. }
    - { name: silence, desc: we like ambush as a design pattern. }
examples:
  heading: pages
  items:
    - { name: about,   href: ./about.html,   cta: open }
    - { name: species, href: ./species.html, cta: open }
```

### 3. CI workflow (`.github/workflows/build.yml`)

```yaml
name: Deploy
on: { push: { branches: [main] }, workflow_dispatch: }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npx --yes flatspace@latest build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

That is the whole integration. No `package.json`, no install, no bundler, no copy step. Push a YAML change to `main`, GH Actions builds, GH Pages serves.

## components

Primitives: `Brand`, `Chip`, `Btn`, `Glyph`, `Heading`, `Lede`, `Dot`, `Rail`.
Chrome: `Topbar`, `Crumb`, `Side`, `Status`, `AppShell`.
Surfaces: `Panel`, `Row`, `RowLink`, `Section`, `Install`, `Receipt`, `Changelog`.
Pages: `Hero`, `WorksList`, `WritingList`, `Manifesto`, `HomeView`, `ProjectView`.
Chat: `Chat`, `ChatMessage`, `ChatComposer`, `AICat`, `AICatPortrait`. Helpers: `renderInline`, `fmtBytes`.
Files: `FileIcon`, `FileRow`, `FileGrid`, `FileToolbar`, `DropZone`, `UploadProgress`, `EmptyState`, `BreadcrumbPath`, `FileViewer` (+ `ConfirmDialog` / `PromptDialog` / `FilePreviewMedia` / `FilePreviewCode` / `FilePreviewText`). Helpers: `fileGlyph`, `fmtFileSize`.

All factories are pure: props in, WebJSX tree out. Component source is split per group under `src/components/<group>.js`; `src/components.js` is a re-export barrel. A group that outgrows the 200-line-per-module cap becomes a thin barrel of its own over single-responsibility submodules in a sibling directory of the same name (`src/components/editor-primitives.js` over `src/components/editor-primitives/*.js`) — the public export surface never moves, so no consumer import changes. `COMPONENT_API.md` and `docs/component-props.md` (regenerate with `npm run docs:components`) are the generated prop reference.

## chat stack layering

The chat stack has four layers, and a consumer's entry point depends on how much they want to own. At the bottom, `chat-basic.css` and `chat-polish.css` (concatenated, in that order, into the published `app-shell.css` / bundled into `dist/247420.css`) supply all `.chat-*`/`.ds-chat-*` styling for the basic Chat/ChatMessage/ChatComposer/AICat components; a separate, standalone `chat.css` at the repo root carries only the `.agentchat-*` styles for the more advanced AgentChat surface and must be linked explicitly by anyone using it (only `ui_kits/workspace` does today). One level up, `src/components/chat-message-parts.js` is the shared, transport-agnostic renderer for a single message's `parts` array (text/code/image/markdown/tool-call parts) — it exists purely so `chat.js` and `agent-chat.js` never duplicate part-kind rendering logic; nobody consumes it directly. `src/components/chat.js` is the entry point for a simple, single-thread chat UI: it exports pure `Chat`/`ChatMessage`/`ChatComposer`/`AICat` factories (props in, vnode out, no transport) and is the right layer for any app that just needs a message thread and composer. `src/components/agent-chat.js` is the entry point for anyone building a multi-agent/tool-use orchestration UI (agent+model picker, streamed tool_use/tool_result parts, resume/cwd controls) — it wraps `chat.js`'s composer/message primitives and adds orchestration chrome, still holding zero transport itself (the host wires WebSocket/fetch/SSE via callbacks). Finally, `src/web-components/ds-chat.js` is the framework-free entry point: a self-registering `<ds-chat>` custom element wrapping `Chat`/`ChatComposer` behind a plain DOM API (`el.messages =`, a bubbling `send` event) for anyone who wants chat UI without touching webjsx or the factory API directly. In short: use `ds-chat.js` for a drop-in custom element, `chat.js` for webjsx-level control of a simple thread, `agent-chat.js` for orchestration UIs, and touch `chat-message-parts.js`/the CSS layers only when extending part-kinds or fixing visual rules.

## chat / markdown / code-highlight

`Chat({ messages, onSend })` renders the bubble timeline; `ChatComposer({ onSend })` is the input row. Block markdown inside messages is sanitized through `renderMarkdown` (`marked@15.0.12` + `DOMPurify@3.2.6`, lazy-loaded from jsDelivr ESM on first call) and code blocks are highlighted by Prism (`prismjs@1.30.0`, lazy-loaded core + per-language scripts via `ensurePrism` / `highlightAllUnder`). Direct `innerHTML` from chat content is forbidden — DOMPurify is the only XSS gate.

**Network dependency — read this before deploying behind a strict CSP or air-gapped environment.** The chat/markdown pipeline fetches three packages from `cdn.jsdelivr.net` **at runtime, on first render**, not at build/install time: `marked`, `DOMPurify`, and (for fenced code blocks) Prism core + per-language grammars. This means a consumer's Content-Security-Policy must allowlist `cdn.jsdelivr.net` for `script-src`/`connect-src` or the fallback below fires on every render. Both dependencies are **fail-closed**: any failure to load the CDN modules — network error, timeout, CSP block, a malformed/empty response, or even a crash inside the loaded library's own `parse()`/`sanitize()` call — makes `renderMarkdown` return the input as **HTML-entity-escaped plain text** (never raw/unsanitized HTML, never a throw). `isDegraded()` reports this state so a consumer can show a subtle "plain text" affordance if desired; `isMarkdownDegraded` is also exported from the SDK root. The default URLs pin an exact semver (`marked@15.0.12`, `dompurify@3.2.6`, `prismjs@1.30.0`) rather than a floating tag, so the CDN cannot silently swap code under a running app; genuine Subresource Integrity (`integrity="sha384-..."` + `crossorigin`) is **not applied** here because these load via dynamic `import()` (marked/DOMPurify) and injected `<script src>` (Prism components), and neither browser dynamic-`import()` nor an auto-injected script tag currently has a standardized SRI attachment point the way a static `<script integrity>` tag does — version-pinning is the mitigation in place today. A consumer that wants to self-host, mirror-pin with real SRI on their own `<script integrity>` wrapper, or route through an internal proxy can override every URL before first render:

```js
import { configureMarkdownCdn, configurePrismCdn } from 'anentrypoint-design';

// Optional. Zero-config consumers keep hitting the pinned jsDelivr defaults
// above, byte-for-byte -- this is purely additive.
configureMarkdownCdn({
  markedUrl: 'https://your-mirror.example/marked@15.0.12/+esm',
  purifyUrl: 'https://your-mirror.example/dompurify@3.2.6/+esm',
});
configurePrismCdn({ baseUrl: 'https://your-mirror.example/prismjs@1.30.0/components/' });
```

`getMarkdownCdnConfig()` / `getPrismCdnConfig()` return the URLs currently in effect (defaults or override) for a consumer's own audit tooling. Calling either configure function forces the next render to (re)load from the new URL, so an override can also be applied at runtime (e.g. after detecting the default CDN is unreachable) — a render already in flight still completes against whatever it already loaded.

```js
import { components as C } from 'anentrypoint-design';

C.Chat({
  messages: [
    { role: 'user', text: 'hello' },
    { role: 'assistant', text: '```js\nconsole.log(1)\n```' }
  ],
  onSend: text => /* push to your store, re-render */ null
});
```

## `<ds-chat>` web component

`src/index.js` auto-registers `<ds-chat>` in any browser context. Set `el.messages = [...]` (or pass JSON via the `messages` attribute) and listen for the bubbling, composed `send` event:

```html
<ds-chat id="c"></ds-chat>
<script type="module">
  import 'https://cdn.jsdelivr.net/gh/AnEntrypoint/design@main/dist/247420.js';
  const el = document.getElementById('c');
  el.messages = [{ role: 'assistant', text: 'gm.' }];
  el.addEventListener('send', e => console.log(e.detail.text));
</script>
```

## ui-kit bootstrap

`mountKit({ root, view, screen })` is the single entry point every kit uses — it installs styles, scopes the root, runs the WebJSX render loop, and registers the kit on the `window.__debug` registry. Do not roll your own motion / applyDiff / CDN loop in a kit's `app.js`.

```js
import { mountKit } from 'anentrypoint-design';
mountKit({ root: document.getElementById('app'), view: () => myView(), screen: 'aicat' });
```

## DeckStage

```js
import { registerDeckStage } from 'anentrypoint-design';
await registerDeckStage();
// <deck-stage width="1920" height="1080">…<section>…</section></deck-stage>
```

## tokens (override anywhere)

The system runs entirely on CSS custom properties under `.ds-247420`. To rebrand a single surface, declare overrides at any level:

```html
<div class="ds-247420" style="
  --panel-accent: #6FA9FF;
  --panel-select: #DCE8FF;
  --green: #6FA9FF;
">
  …same components, sky-blue accent…
</div>
```

The full token list lives in `colors_and_type.css`; `THEME.md` documents the taxonomy and the `data-theme`/`data-accent`/`data-density`/`data-typescale` attribute contract. The voice rules and the storytelling pass live in `SKILL.md`. `docs/usage-guidelines.md` covers primitive selection, layout composition, form patterns, and error/empty-state patterns.

Layout primitives worth knowing: `.ds-app-surface` is the Operate-mode page root that switches a kit onto the app typescale (without it, page titles render at the marketing display ceiling), and `.ds-panel-trio` / `.ds-panel-duo` / `.ds-panel-flush` are panel-row grids that step down on container width.

## lint gates

`npm run lint` runs 16 gates over 30 component sheets. Four are hard zero-tolerance — no raw color literal (`lint-tokens`), no raw `border-radius` (`lint-radius`), no raw `z-index` (`lint-zindex`), no `transition: all` (`lint-transition-all`). Four are ratchets frozen against a baseline that may only move down — `lint-spacing`, `lint-fontsize`, `lint-important`, and `lint-dead-controls` (a control that renders but cannot act: an empty handler body, or a bare `href="#"`). The rest guard decorative glyphs, unfiltered conditional children, class prefixes, inline layout styles and duplicated selectors.

`npm run a11y` is the runtime companion: axe-core against the live rendered DOM of every kit, blocking on serious/critical WCAG violations. It needs a Chrome already listening on `CDP_BASE` and a server on `BASE_URL` — it never launches a browser, and it pulls in no browser-automation dependency (`scripts/cdp.mjs` speaks CDP over Node's global `WebSocket`). Because it runs WCAG-tagged rules only, best-practice rules like `page-has-heading-one` and `bypass` are outside its scope.

The scanned set is computed, not listed: `COMPONENT_SHEETS` in `scripts/lint-tokens.mjs` names entry points and `expandSheets()` resolves each one's `@import` graph transitively, because the root `app-shell.css` is a barrel with no declarations of its own. A companion guard requires every `.css` file under `src/css/app-shell/` to appear in that expanded set, so a split sheet cannot be bundled into `dist/247420.css` while remaining invisible to both the linters and any consumer that `<link>`s `app-shell.css` directly.

## Visual regression testing

`npm run visual` (`node scripts/visual-baseline.mjs check`) screenshots every
`preview/*.html` page (except `index.html`/`theme-map.html`) in three theme
states — `paper`, `ink`, `auto` (with `auto` pinned to an emulated `light`
color-scheme preference, so it captures deterministically) — via Chrome DevTools
Protocol `Page.captureScreenshot` at a fixed 1280×900 viewport, then diffs each
capture pixel-by-pixel against the matching committed PNG under
`visual-baselines/`. It needs no browser-automation package and no image
library: `scripts/cdp.mjs` drives an already-running Chrome over Node's built-in
`WebSocket` (it never launches a browser itself — start one with
`--headless --remote-debugging-port=9333`, or your own workflow step) and
`scripts/png-diff.mjs` decodes PNG bytes using only `node:zlib`.

A page fails the check when either: it has no committed baseline for a given
file+theme combination, or its diff ratio exceeds `DIFF_THRESHOLD_RATIO`
(0.5% of pixels), where a pixel only counts as differing once its per-channel
delta exceeds `CHANNEL_TOLERANCE` (24/255) — this tolerance absorbs
antialiasing/font-rendering jitter rather than flagging it as a regression. A
size mismatch between capture and baseline is always a failure regardless of
threshold.

To (re-)freeze the current rendering as the new baseline, run
`npm run visual:update` (`node scripts/visual-baseline.mjs update`), which
overwrites every `visual-baselines/*.png` with a fresh capture — no diffing,
no pass/fail, just a straight re-write.

## why scope-prefixed

Every selector in the bundle is namespaced under `.ds-247420` via PostCSS. The bundle ships a system-font stack (`--ff-body`/`--ff-display`/`--ff-mono`, no web-font `@import`/`@font-face` -- see `colors_and_type.css`) + the design tokens **without** colliding with whatever the host app already runs. Add the class to a root element to opt in. The font tokens are fully overridable: set `--ff-body`/`--ff-display`/`--ff-mono` on any scope to swap typography without touching component code.

## CSS only (no JS)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/AnEntrypoint/design@main/dist/247420.css">
<div class="ds-247420">…</div>
```

You get the tokens, primitives, and utility classes. You write the markup.

## publishing

Every push to `main` runs `.github/workflows/publish.yml`:

1. Resolves max(local, remote) version, bumps **patch**.
2. Builds with `scripts/build.mjs` (esbuild + postcss-prefix-selector).
3. Publishes to npm with `NPM_TOKEN`.
4. Commits the bump back to `main` and pushes a `vX.Y.Z` tag.

Skip publish for any commit by including `[skip publish]` in the message; release commits use that automatically to prevent loops.

## links

- live: <https://anentrypoint.github.io/design/>
- npm: <https://www.npmjs.com/package/anentrypoint-design>
- skill: see `SKILL.md` for the full visual paradigm and storytelling rules.
