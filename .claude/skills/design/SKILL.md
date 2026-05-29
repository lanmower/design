---
name: 247420-design
description: 247420 / AnEntrypoint design system — friendly rounded sans body, mono only on code, soft tonal surfaces, indicator rails for color-coded separation, generous negative space, terminal-flavoured rhythm. Use this skill to consume the SDK from any project (typical example\: a buildless flatspace site at c\:\\dev\\flatspace-demo).
user-invocable: true
---

we are 247420. the creative department of the internet. always open (24/7), always a little high on possibility (420). we ship fast, document honestly, and humor is load-bearing.

this is the visual paradigm. read it once, then go.

## one-screen tour

- **Surfaces over lines.** Separation is tonal. We never draw a border for layout; we let the panel sit a half-tone differently from the canvas and the eye does the rest. Indicator rails (a 4px inline-start tonal stripe) carry category meaning instead.
- **Friendly type, terminal rhythm.** Nunito is the body voice — rounded humanist sans, easy to absorb at 14–15px. Archivo Black holds the headlines. JetBrains Mono is reserved for **code, pre, kbd, numeric ranks, install blocks** — anywhere the monospace meaning is doing real work, not signalling "I am a developer".
- **Round, flat, soft.** Radii: `6px` chips, `10px` controls, `18–20px` panels and lists, full pill on tabs/buttons. **Zero drop shadows.** The only shadows in the system are `inset 4px 0 0 <hue>` rails and `inset 0 -3px 0` underline accents — both tonal, never elevation.
- **Negative space as a content primitive.** Pages breathe. List rows are 36–44px tall, panel padding is generous, sections are separated by gap not by lines. If two things look like one thing, add space — never a divider.
- **Lateral humor, deep lore, flat delivery.** The voice is lowercase, internet-native, occasionally cryptic, never lame. The visual dial stays understated; the writing is where the personality goes loud.
- **One acid moment per surface.** A single live pip, a single primary CTA, a single rail of accent — never a parade.

## tokens (the only colors and fonts you should ever name)

```
/* fonts */
--ff-display  Archivo Black     /* once per page, headlines */
--ff-ui       Nunito            /* body, chrome, controls, labels */
--ff-prose    Nunito            /* long-form reading */
--ff-mono     JetBrains Mono    /* code, pre, kbd, numeric ranks */

/* canvas */
--paper       #F5F0E4           /* warm, calm, never pure white */
--ink         #1F1B16           /* warm near-black */

/* tonal surface ladder (light) — layered list-surface feel */
--panel-0     #F5F0E4           /* canvas / shell */
--panel-1     #FBF6EB           /* primary content surface */
--panel-2     #F0E9DA           /* zebra / hover-quiet */
--panel-3     #E3DAC7           /* deepest tonal step */
--panel-hover #EBE1CD           /* hoverable surface */
--panel-select #D8ECCB          /* selected — mint, accent-keyed */

/* category palette — one rail / one dot per row */
--green       #3F8A4A           /* live work, ui kits, "go" */
--purple      #6B3A78           /* writing, decks, "think" */
--mascot      #F07AA8           /* docs, brand, "talk" */
--sun         #FFD86B           /* slides, energy, "play" */
--flame       #FF8454           /* warn-soft, "watch out" */
--sky         #6FA9FF           /* external, link, "elsewhere" */

/* state, never decoration */
--live        #2BB07F           /* a pip, a status word */
--warn        #FF6B4A           /* destructive confirm only */
--link        #3A66FF           /* in-prose links only */
```

Dark mode flips the panel ladder to warm-neutral greys (`#1A1B1E -> #36383E`). Same hues, lighter on dark. Validate every page in both.

## the four primitives

1. **Rail.** A 4px tonal stripe on the inline-start edge of any block. Apply with `.rail` (neutral) or `.rail-green` / `.rail-purple` / `.rail-mascot` / `.rail-sun` / `.rail-flame` / `.rail-sky`. Use it on list rows, panels, sections — anywhere the eye should know "this is _this_ category" without reading the label.
2. **Dot.** An 8px tonal pip. `.dot.live` next to "shipping". `.dot.green` next to "ready". One dot per row, never a row of pips.
3. **Panel.** Soft tonal surface, `border-radius: 20px`, `var(--panel-1)` background, `panel-head` for the label strip. No border. No shadow. Separated from siblings by gap, not by line.
4. **Row.** 36–44px tall, generous gutters, optional rail, optional dot. Active = mint `--panel-select` background. Hover = `--panel-hover`. Never bold-on-hover; never translate-on-hover; never shadow-on-hover. Tonal swap, that's it.

## type rhythm — the chatgpt-ish reading feel

- **Body** 14–15px Nunito 400, line-height 1.55. Comfortable at a normal reading distance, no squint.
- **Lede** 15–17px Nunito 400, `--panel-text-2`, max-width 60ch. The "shoulder text" under a heading.
- **h1** 28–32px Nunito 600, `letter-spacing: -0.01em`. Page titles. (Marketing-grade hero uses Archivo Black at clamp(64px, 12vw, 120px).)
- **h2** 18–20px Nunito 600. Section titles. Generous top margin (32px).
- **h3** 13px Nunito 600 in accent color (`--panel-accent`). The "label heading" — used like `// works`, `// recent writing`. Lowercase + accent + small + sans absolutely sings here.
- **Code** 12.5–13px JetBrains Mono on `--panel-2` background, 6px radius. Inline `<code>` and `<pre>` only.
- **Mono ranks** `01`, `02`, `001`. JetBrains Mono, 11–13px, dim. The "list item number" voice — keeps the row's right edge anchored.

Rule of thumb: if you want to feel professional and quiet, write in Nunito. If you want to feel like a terminal output, use JetBrains Mono. **Never both in the same paragraph.**

## terminal-flavoured spacing

The 4px base scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Use it like a monospace grid:

- Row-internal gap: 12px
- Row vertical padding: 6–10px
- Panel padding: 14px 22px (head), then content
- Section vertical break: 32px above an h2, 24px above an h3
- Stage padding: 16–20px on mobile, 24–28px on desktop

When a page feels noisy, the answer is almost always "add 8px more gap". When it feels empty, "tighten one nested element by 4px". Move in 4s.

## indicator rails — the heart of the system

Categories are the spine of every list. The rail communicates category without printing the word. Map your domain to hues once, then apply:

```css
[data-cat="kit"]      .rail-green   /* primary work product */
[data-cat="deck"]     .rail-sun     /* presentations */
[data-cat="preview"]  .rail-purple  /* design samples */
[data-cat="doc"]      .rail-mascot  /* prose */
[data-cat="external"] .rail-sky     /* links elsewhere */
```

Pair the rail with a dot of the same hue inside the row, and a chip with `color-mix(in oklab, <hue> 22%, var(--panel-2))` background for the type label. Three signals (rail, dot, chip), one hue — the reader builds the mental model on the second row and never has to read the legend.

## hard rules

- No gradients. Anywhere. Ever.
- No drop shadows. The system has no elevation. (Inset rails and inset underlines are not shadows; they are paint.)
- No borders for layout chrome. Tonal surfaces + gap + rail.
- No ALL CAPS for chrome. Lowercase by default. Uppercase only for `01 / OF / 28` style numeric tickers.
- One acid accent per page, max. One stamp per page, max.
- Never a `<b>` tag — use `font-weight: 600` on a span.
- Never `system-ui` on a primary surface. Nunito-or-bust on chrome, Archivo Black on display.
- Two-tone hover only. Never translate, never scale, never shadow-fade.

## stack (non-negotiable)

- **Client:** [webjsx.org](https://webjsx.org) + customised [ripple-ui.com](https://ripple-ui.com). React/Vue/Svelte/Next/Nuxt are banned org-wide.
- **Build:** GitHub Actions for everything. Building on a laptop is banned.
- **Vendored, never CDN runtime.** webjsx, ripple, fonts — committed under `vendor/`. (The 247420 SDK itself ships from npm + unpkg as the single allowed CDN dependency — see workflow below.)
- **CMS sites** -> flatspace, run as a CI step.
- **Database** -> busybase from npm.
- **Otherwise** -> static HTML + vendored JS, deployed via GitHub Pages.

## consuming the SDK from a buildless flatspace project

Canonical worked example: `c:\\dev\\flatspace-demo`. **No `package.json`.** A `flatspace.config.mjs`, a `config/` tree of YAML pages, and a `src/theme.mjs` that turns each YAML page into HTML. CI runs `npx --yes flatspace@latest build` and deploys `dist/`.

The 247420 SDK plugs into that shape in three steps.

### 1. Reference the SDK from `<head>`

In `src/theme.mjs`, when you build the document `<head>`, drop the scope class on `<html>` and pull the SDK's CSS + JS from unpkg. No install step, no bundler:

```js
// src/theme.mjs (excerpt)
export default function render({ site, page }) {
  return \`<!doctype html>
<html lang="en" class="ds-247420" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>\${page.title} — \${site.title}</title>
  <link rel="stylesheet" href="https://unpkg.com/anentrypoint-design@latest/dist/247420.css">
  <script type="importmap">
    { "imports": { "anentrypoint-design": "https://unpkg.com/anentrypoint-design@latest/dist/247420.js" } }
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { mount, components as C } from 'anentrypoint-design';
    const data = \${JSON.stringify({ site, page })};
    mount(document.getElementById('app'), () => C.AppShell({
      topbar: C.Topbar({ brand: data.site.title, items: data.site.nav }),
      crumb:  C.Crumb({ leaf: data.page.title }),
      main:   data.page.template === 'home' ? C.HomeView(data.page) : C.Section(data.page),
      status: C.Status({ left: ['main'], right: ['live'] }),
    }));
  </script>
</body>
</html>\`;
}
```

### 2. Keep your YAML in the 247420 shape

Each page YAML in `config/pages/` becomes the `data.page` object the SDK consumes:

```yaml
# config/pages/home.yaml
id: home
title: Home
template: home
hero:
  heading: tigers
  subheading: large striped cats
  body: a flatspace site, styled by 247420.
  badges: [ { label: encyclopedic }, { label: lowercase }, { label: 100% YAML } ]
features:
  heading: why tigers
  items:
    - { name: stripes,  desc: structurally redundant, semiotically loud. }
    - { name: silence,  desc: we like ambush as a design pattern. }
    - { name: orange,   desc: the only colour we'll allow on a header. }
examples:
  heading: pages
  items:
    - { name: about,        href: ./about.html,        cta: open }
    - { name: species,      href: ./species.html,      cta: open }
    - { name: behavior,     href: ./behavior.html,     cta: open }
    - { name: conservation, href: ./conservation.html, cta: open }
```

`C.HomeView` reads `hero / features / examples` and lays them out as: editorial hero on top, indicator-railed feature panel underneath, dense row-list of examples below that.

### 3. CI workflow

`.github/workflows/build.yml`:

```yaml
name: Deploy
on:
  push: { branches: [main] }
  workflow_dispatch:
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
    environment: { name: github-pages, url: \${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

That's the entire integration. No `package.json`, no install, no bundler, no copy step. Theme imports the SDK from unpkg, flatspace renders to `dist/`, GH Pages deploys. **New pages = new YAML files. New colors = override `--panel-*` tokens in a `<style>` at the top of theme.mjs's output. New components = open a PR against the SDK.**

### what to put on each page (the storytelling pass)

A page is a sequence of beats:

- **Home / hero** — `C.Hero({ heading, subheading, body, badges, ctas })`. One sentence of who, one sentence of what, three badges of self-tag, one primary CTA. Optional `currently shipping` panel below — three rows max, mono ranks, dots in `--green`/`--mascot`/`--sun`. Story-beat: "this is who we are, this is what's live."
- **Index / works** — `C.WorksList(items)`. Numeric mono code on the left, name-with-sub in the middle, meta on the right. Open one row inline to reveal `body + ctas`. Story-beat: "here's the catalogue, pull a thread to read more."
- **Project page** — `C.ProjectView({ overview, install, receipt, changelog })`. Hero pill (`live · v0.4.1`), then a railed panel sequence: overview prose -> install CLI block (`.cli`) -> receipt (kv table) -> changelog rows (each rail-tagged by category). Story-beat: "here's a thing in detail, in the order you'd actually need it."
- **Writing index** — `C.WritingList(posts)`. Date code in mono on the left, title in Nunito middle, `// tag` mono meta on the right. No rails — writing is one category. Story-beat: "we're saying things in time."
- **Manifesto** — `C.Manifesto({ paragraphs })`. Single panel, generous padding, max-width 64ch, paragraphs separated by 12–16px not by rules. One bolded `humor is load-bearing.` somewhere in the middle. Story-beat: "here's what we believe, in five small breaths."

Avoid: marketing-speak, three-column "feature grids" with stock icons, gradient hero text, "trusted by" logo carousels, `<hr>` between paragraphs, headings in ALL CAPS, emoji as bullets in body copy. (Emoji in prose is fine — rare, intentional, never substituting for punctuation.)

## semiotics cheat-sheet

| signal                        | mechanism                              | meaning                          |
| ----------------------------- | -------------------------------------- | -------------------------------- |
| green rail + green dot        | `.rail-green` + `.dot.green`           | a kit / thing that ships         |
| sun rail                      | `.rail-sun`                            | a deck or presentation           |
| purple rail                   | `.rail-purple`                         | writing, lore, manifesto         |
| mascot rail                   | `.rail-mascot`                         | docs, prose-first surfaces       |
| sky rail + ext-link           | `.rail-sky` + `Icon('external-link')`  | external link / off-site         |
| flame chip                    | chip with `--flame` background         | "watch out" / soft warn          |
| live dot in metadata          | `.dot.live` left of "live"             | currently shipping               |
| mono numeric on right         | `.row .code` with `--ff-mono`          | rank / position / "this is item N" |
| pill with `--panel-select` bg | tabs/sidebar `.active`                | "you are here"                   |

Three signals, one meaning. Always.

## icons

Line-icons via the `Icon(name, {size})` component — monochrome inline SVG, `stroke=currentColor`, 24-box, 1.6 stroke — so chrome reads as one coherent set. NEVER decorative unicode glyphs in source (they are a machine-shaped tell and are banned; a build-time guard, `scripts/lint-glyphs.mjs`, fails the build on any). The mapping:

```
status dot      -> CSS circle: <span class="ds-dot ds-dot-on|ds-dot-off"> (Dot() component)
active / partial -> Icon('circle-dot') / Icon('circle')
external link    -> the ASCII 'open ->' or Icon('external-link')
breadcrumb sep   -> Icon('chevron-right')  (or '/' in Crumb)
check / receipt  -> Icon('check') / Icon('check-check')
close / cancel   -> Icon('x')
play / pause     -> Icon('play') / Icon('pause')
file type        -> Icon('file-pdf'|'file-zip'|'file-video'|'file-audio'|'file-sheet'|'file-code'|'file-text'|'file')
warn / info      -> Icon('warn') / Icon('info')
the 247420 corner-> Icon('square')
```

Add new icons by extending `ICON_PATHS` in `src/components/shell.js` (an out-of-set name renders an empty span — a bug). ASCII stands in where no icon fits: `->` for arrows, `[x]`/`[ ]` for checkboxes, `-`/`*` for bullets. Exempt: the `·` middle-dot separator and the `⌘` Mac Command-key symbol (industry-standard). No font-awesome, no material-icons, no svg sprite sheets, no unicode-glyph icon canon.

## files in this repo

- `colors_and_type.css` — every token, every semantic class, every rail and dot.
- `app-shell.css` — topbar, breadcrumb, sidebar, panel, list, tabs, status, kv, cards, chat bubbles.
- `vendor/fonts.css` — Archivo, JetBrains Mono, Space Grotesk (legacy), Nunito via Google Fonts CDN.
- `preview/` — one concept per page (buttons, stamps, rails, dots, manifesto, type-display, …).
- `ui_kits/homepage` — editorial home with hero + works.
- `ui_kits/project_page` — project shell with overview/receipt/install/changelog.
- `ui_kits/docs` — sidebar nav + prose reading view.
- `ui_kits/blog` — dated index + reading view.
- `ui_kits/chat`, `ui_kits/aicat` — chat surfaces (timeline + composer + AICat portrait).
- `slides/deck-stage.js` — the 16:9 web component (split into `deck-stage-style.js` + `deck-stage-overlay.js`).
- `src/components.js` — re-export barrel; do not extend.
- `src/components/{shell,content,chat,files,files-modals}.js` — component groups, 200-line cap each. Chrome (Topbar/Crumb/Side/AppShell) lives in `shell.js`; surfaces/pages (Panel/Row/Hero/HomeView/ProjectView/…) in `content.js`; chat (Chat/ChatMessage/ChatComposer/AICat) in `chat.js`; file-explorer surface (FileGrid/FileRow/DropZone/UploadProgress/BreadcrumbPath/EmptyState/…) in `files.js`; modal/preview parts (ConfirmDialog/PromptDialog/FilePreviewMedia/FilePreviewCode/FilePreviewText/FileViewer) in `files-modals.js`.
- `src/markdown.js` — lazy `marked@15` + `DOMPurify@3` from jsDelivr ESM. Block markdown in chat lands via the `MdNode` ref-callback that `innerHTML`s the sanitized output. **Never bypass `renderMarkdown` to set chat HTML** — DOMPurify is the only XSS gate.
- `src/highlight.js` — lazy Prism core + per-language scripts on first use; `CodeNode` ref-callback waits for prism then calls `highlightAllUnder`. Adding a language: append to the `LANGS` array.
- `src/bootstrap.js` — `mountKit({ root, view, screen })`. Every ui_kit goes through this. No new motion / CDN / applyDiff loops in kit `app.js`.
- `src/web-components/ds-chat.js` — auto-registers `<ds-chat>` on browser load. Consumers set `el.messages = […]` (or pass JSON via the `messages` attribute) and listen for the bubbling/composed `send` event with `{ detail: { text } }`.
- `src/debug.js` — `window.__debug` registry; subsystems register snapshot fns at load time. `console.log` is not observability.
- `src/motion.js` — `installMotion()` + `animateTree(rootEl)`; called once from `installStyles` + on every render tick by `mount`.
- `scripts/build.mjs` — esbuild + postcss-prefix-selector, scoped under `.ds-247420`.

## hard rules added 2026-05-01 (re-architecture)

- **No new inline `style="…"` strings** in components — add a `.ds-<thing>` class to `app-shell.css`; the build prefixes with `.ds-247420`.
- **No new files in `src/components.js`.** New components go under `src/components/<group>.js` and re-export from the barrel.
- **No parallel observability surfaces.** `window.__debug` is THE in-page registry; new subsystems must register on mount. `console.log` does not count.
- **webjsx applyDiff caveat.** Children arrays that mix keyed VElements with raw text crash inside `vendor/webjsx/applyDiff.js`. Wrap raw text in a keyed `<span>` so all siblings are VElements.
- **marked v15 + html-passthrough.** Lines containing raw HTML tags pass through as text — markdown emphasis around an inline `<script>` won't parse. Security holds (DOMPurify still strips dangerous tags); cosmetic blast on mixed input is expected.

## one-liner for any new surface

```html
<html class="ds-247420" data-theme="light">
  <head>
    <link rel="stylesheet" href="https://unpkg.com/anentrypoint-design@latest/dist/247420.css">
  </head>
  <body><div id="app"></div></body>
</html>
```

Add the importmap, mount the components, write your YAML. That is the whole onboarding.

we fart in its general direction.
