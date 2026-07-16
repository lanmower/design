# Architecture map

One page, high level. Detailed caveats live in AGENTS.md / component docs — this file is only the map.

## What this repo owns

`anentrypoint-design` (published as `247420.xyz`'s design system) is the **sole owner of all
visual/GUI code** shared by thebird and freddie: the OS window-manager chrome, the freddie
dashboard (`AppShell`, `Side`, `FREDDIE_PAGES`), `<freddie-chat>`, and every themed CSS surface
(`src/kits/os/theme.css` — brand tokens, window controls, chat config, files browser, todo app,
etc). It ships as a plain npm package (webjsx-based components + CSS), built with esbuild/postcss,
with no framework runtime dependency of its own.

It also owns this repo's own portfolio/marketing site (`site/`, `slides/`, community app) built
with `flatspace`.

## How it fits with thebird and freddie

```
design  --publish to npm (always-latest)-->  thebird  (docs/vendor/ via refresh-design.mjs)
   |                                             ^
   `--consumed as npm dep-------------------->  freddie (src/web/app.js thin-mounts the
                                                   same createFreddieDashboard/AppShell)
```

- design has **no dependency on thebird or freddie** — it is the leaf/upstream node. It knows
  nothing about IndexedDB filesystems, acptoapi, or LLM providers.
- **thebird** pulls design in via `scripts/refresh-design.mjs`, which fetches the published npm
  package and vendors its CSS/JS into `docs/vendor/`, stamping a `.version` file. thebird's own
  code only ever applies class names / calls the exported component functions — it writes zero
  CSS of its own for these surfaces.
- **freddie** depends on design directly as an npm package; its `src/web/app.js` is a thin mount
  point around `createFreddieDashboard`, so the SAME dashboard GUI renders both standalone
  (freddie's own web server) and embedded in a thebird WM window. Shell-size-aware responsive
  rules in the dashboard use CSS `@container`, not `@media`, because the embedded case has no
  useful viewport of its own.
- Any new visual rule for either downstream consumer is authored HERE, never as inline styles or
  ad hoc CSS in thebird/freddie.

## Boot / build sequence

**Dev:** `npm install`, then edit `src/*` — components are plain JS/webjsx, no dev server required
for iteration (consumers hot-reload via their own dev flow after a `refresh-design.mjs` pull, or
via `link-local-design.mjs`-style local linking during active cross-repo work).

**Build** (`npm run build`, `scripts/build.mjs`): runs the lint gate block (9 gates —
`scripts/lint-all.mjs`: tokens, radius, spacing, glyphs, null-children, classes, inline-styles,
duplicate-selectors, swallow-comments), then bundles with esbuild + postcss into `dist/`.

**Publish** (`.github/workflows/publish.yml`, on push to `main`): installs, syncs the local
`package.json` version with whatever's on the npm registry (never goes backwards), builds, runs
`npm publish --access public`, then commits the version bump and tags the release. This is the
"always-latest" mechanism thebird's and freddie's vendor-refresh scripts rely on — there is no
manual version-bump step for consumers to coordinate.

**CI** (`.github/workflows/ci.yml`): lint (9 gates) + build + `npm publish --dry-run` on every
push/PR, as a side-effect-free correctness gate distinct from the real publish workflow.
