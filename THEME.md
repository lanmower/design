# Theming the 247420 Design System

Every visual decision in this system flows from one place: the token layer in
`colors_and_type.css`. Component sheets contain **zero raw color literals** —
they consume `var(--token)` only. That is what makes the project perfectly
themable: change the token layer (or flip one attribute on the root element) and
the entire UI re-skins, with no component edit. Build-time guards
(`scripts/lint-tokens.mjs`, run by `npm run build`) fail the build if any
component sheet hard-codes a color, radius or `z-index`, so this stays true.

The scanned set is 30 sheets, computed rather than listed: `COMPONENT_SHEETS`
names entry points (`app-shell.css`, `community.css`, `chat.css`,
`editor-primitives.css`, `community-app.css`, `gm-prose.css`,
`src/kits/os/*.css`, …) and `expandSheets()` walks each one's `@import` graph,
because the root `app-shell.css` is an `@import` barrel over
`src/css/app-shell/*.css` and contains no declarations of its own. Every file in
that directory must be reachable from the barrel — an unreachable sheet is a
hard lint failure, because it would otherwise ship inside `dist/247420.css`
while being invisible to both these gates and to any consumer that `<link>`s
`app-shell.css` directly.

## Token taxonomy (three layers)

1. **Palette** — the raw brand colors. `--paper`, `--ink`, `--green`,
   `--green-2`, `--purple`, `--mascot`, `--sun`, `--flame`, `--sky`, plus their
   `-2`/`-deep`/`-tint` variants. These are the only place hex values live.
2. **Semantic surfaces** — what the palette *means* in context. `--bg`,
   `--bg-2`, `--bg-3` (surfaces), `--fg`, `--fg-2`, `--fg-3` (text), `--accent`,
   `--accent-fg`, `--accent-bright`, `--accent-tint`, `--danger`, `--success`,
   `--warn`, `--rule` (8% currentColor, ambient dividers only), `--rule-strong`
   (28%, a visible seam), `--rule-control` (alias of `--rule-strong` --
   interactive-element boundaries need >=3:1, WCAG 1.4.11, which `--rule`
   alone can't clear), `--border`/`--border-w` (aliases of `--rule-control`/
   `--bw-hair` -- real tokens some component sheets already consumed with no
   fallback and no definition anywhere; now defined). A theme rebinds these;
   components read them. Also: `--on-accent` / `--on-color` (foreground on a
   saturated fill), `--scrim` / `--scrim-strong` / `--scrim-media` (overlay
   backdrops), `--cat-green`...`--cat-sky` (category color-coding),
   `--shadow-1..3` / `--shadow-overlay` (elevation, derived from `--fg` via
   `color-mix()` so it retints automatically per theme rather than needing
   separate per-theme shadow tokens).
3. **Component tokens** — namespaced aliases a subsystem reads, themselves bound
   to semantic tokens. e.g. the OS shell's `--os-bg-0: var(--bg)`,
   `--os-accent: var(--accent)`. Never bound to a literal.

Type, spacing, radius, motion, and stacking tokens follow the same shape:
`--ff-body`/`--ff-display`/`--ff-mono`, `--fs-*`, `--space-*`, `--r-1..4`/
`--r-pill`, `--dur-*`/`--ease`, `--z-*`.

**Type scale floor.** `--fs-nano` (11px) and `--fs-pico` (10px) sit below the
12px body floor, for glanceable secondary non-prose material only — never prose,
never a control label a user has to read carefully. `--fs-pico` is the floor;
there is deliberately no tier below it.

**Stacking is a scale, not a number.** `--z-*` is one 13-rung ladder, each rung
carrying a stated meaning rather than an arbitrary value: `--z-below` (-1,
decorative texture under its own content), `--z-base` (0, in-flow content),
then at 100-step intervals `--z-raised`, `--z-sticky`, `--z-header`,
`--z-drawer`, `--z-window`, `--z-dock`, `--z-dropdown`, `--z-modal`,
`--z-toast`, `--z-tooltip`, and `--z-top` (1100, boot/loading veils only). Pick
the rung whose meaning matches; if none does, add a rung rather than a literal.
`lint-zindex` fails the build on any raw `z-index` number in a component sheet.

## The attribute contract

The root element (`<html class="ds-247420">` or the SDK render root) carries
attributes that select tokens. All are independent and composable:

| Attribute        | Values                                              | Effect |
|------------------|------------------------------------------------------|--------|
| `data-theme`     | `auto` `paper` `ink` `dark` `thebird` `github-dark`   | Surface theme. `auto` follows OS `prefers-color-scheme`. `dark` is a full alias of `ink` (same CSS block, both names accepted for it). `light` is **not** a valid value -- it has never existed and silently no-ops to the root default (which happens to look like `paper`); use `paper`. |
| `data-accent`    | `acid` `green` `purple` `mascot`                      | Accent hue. Absent = theme default (green). |
| `data-density`   | `compact` `comfortable` `spacious`                    | Scales `--density` -> padding/gutters/spacing, and switches control heights to a discrete per-tier px table. |
| `data-typescale` | `sm` `lg`                                             | Bumps body/lg/xl reading sizes. |

`color-scheme` is set per theme so native form controls and scrollbars match.
An unrecognised value on any of these logs a `console.warn` naming the bad
value and the fallback applied (see `src/theme.js`) instead of silently
no-opping.

## Driving themes from JS

The theme controller (`src/theme.js`, re-exported from the SDK root) persists
choices to `localStorage` and writes the attributes:

```js
import { applyTheme, applyAccent, applyDensity,
         getTheme, getAccent, getDensity,
         resolvedTheme, onThemeChange } from 'anentrypoint-design';

applyTheme('ink');        // force dark
applyTheme('auto');       // follow OS
applyAccent('purple');    // applyAccent(null) clears back to default
applyDensity('compact');
onThemeChange(({ mode, resolved }) => { /* re-render derived UI */ });
```

A ready-made `ThemeToggle()` component (segmented auto/light/dark, or
`ThemeToggle({ compact: true })` for a cycling button) is exported too.

## Adding a theme

A theme is **one `[data-theme="X"]` block** in `colors_and_type.css` that
overrides only the semantic surface tokens — never component rules, never a raw
literal in a component sheet. Copy the nearest existing preset and rename the
attribute. The retune count genuinely depends on which kind of theme:

- A **light-on-light preset** (`[data-theme="paper"]`, `[data-theme="thebird"]`)
  retunes 8-14 tokens — this is the small, quick case.
- A **real dark theme** (`[data-theme="ink"]`, mirrored by
  `[data-theme="auto"]` under `prefers-color-scheme: dark`) retunes **~36**
  tokens: `--bg/-2/-3`, `--fg/-2/-3`, every `--panel-*`, `--accent/-fg/-ink/
  -bright/-tint`, `--danger`/`--flame`/`--amber`/`--warn`/`--warn-fg`/`--sky`,
  `--mascot-deep`, `--purple-2`, `--green`, both `--cat-*-ink` pairs, and all
  five `--code-*` syntax tokens. Every one of those needs its own AA-contrast
  check against the new dark surface, not just the four in the example below.
  `lint-dark-parity` (run by `npm run lint`) fails the build if the
  `[data-theme="ink"/"dark"]` block and the `[data-theme="auto"]` dark-scheme
  block ever declare a different set of tokens, so a real dark theme can't
  ship half-retuned without the CI catching it.

```css
[data-theme="dusk"] {
  color-scheme: dark;
  --bg: #1a1626; --bg-2: #241d33; --bg-3: #2e2630;
  --fg: #efe9f5; --fg-2: #c9c0d6; --fg-3: #8f86a0;
  --accent: var(--mascot); --accent-fg: var(--ink);
  /* ...and the other ~31 dark-context tokens listed above, each hand-verified
     against this specific --bg/--bg-2/--bg-3, not copied from --ink's values. */
}
```

Then add `'dusk'` to the `VALID` set in `src/theme.js`. There is currently no
generator or CI validator that authors this for you from just a surface +
brand hue — every dark theme today is hand-tuned and hand-measured (tracked
as backlog in `TOKENS-CHANGELOG.md`).

`thebird` is the worked *light-preset* example: a warm-paper brand preset
that overrides `--paper` (and the surfaces derived from it) without globally
mutating the base theme for other consumers. `[data-theme="ink"]` is the
worked *dark-theme* example — read that block directly for the real token
list and its measured contrast ratios.

## Adding an accent

One `[data-accent="X"]` block setting `--accent`, `--accent-bright`,
`--accent-fg`, `--panel-accent`. Add the name to `VALID_ACCENT` in `theme.js`
(`acid`/`green`/`purple`/`mascot` today — `theme.js`'s own list previously
omitted `acid` despite the CSS defining it, so setting that accent silently
cleared back to default instead of applying; fixed).
An accent preset that hardcodes a light-tuned fill needs its own
`[data-theme="ink"][data-accent="X"]` (and `[data-theme="dark"][data-accent="X"]`)
companion too — see the comment above those blocks in `colors_and_type.css`
for why (a light fill can drop under the 3:1 non-text contrast floor on a
dark page).

## Stamp vs badge vs rail

Three different "small marked surface" primitives exist and are easy to
reach for interchangeably — they are not interchangeable:

- **Stamp** (`.stamp`, `preview/stamps.html` / `preview/stamps-lore.html`) —
  decorative, rotated rubber-stamp motif. Editorial flourish only: a one-off
  "approved" / "live · vX" / "do not ship" mark on a hero or receipt-style
  surface. Never used for live/repeating UI state, never more than one per
  page (per the existing note in `preview/stamps.html`), and never the only
  way a piece of state is conveyed — it is decoration layered on top of real
  content, not a status indicator itself.
- **Badge** (`Badge` component, `variant`/`tone`/`size` props) — compact
  inline status/count marker attached to a specific piece of content (an
  unread count, a "new" flag, a tone-coded label next to a title). Not
  rotated, not decorative — its tone/variant is meaningful and can repeat as
  many times per page as there are things to badge.
- **Rail** (`Rail`/`ServerRail`/`WorkspaceRail`, indicator rails in
  `panel-row.css`) — a persistent color-coded inset edge used for
  category/channel separation across a list of rows (file-type rails,
  server-list rails). Structural, not decorative: it is a layout-level
  grouping cue for a set of rows, never a single standalone mark the way a
  stamp or badge is.

Rule of thumb: reaching for a stamp on live app state, or a rail for a single
one-off mark, is a sign the wrong primitive was picked.

## Typography scale exceptions

Component type should snap to a `--fs-*` step from `preview/type-scale.html` /
`preview/type-display.html`. `.ds-hero-title` used to run a bespoke
`clamp(40px, 9cqi, 116px)` outside the ladder because neither `--fs-hero` nor
`--fs-mega`'s slope/floor fit a two-line 16ch title in a narrow column — that
gap between the two is now the `--fs-hero-2xl` scale step, so `.ds-hero-title`
reads off the token like everything else. If a future off-scale value shows
up, that is how it should be resolved: add the missing scale step, not leave
a bespoke inline clamp with a comment explaining why.

## Reduced-motion and reduced-transparency

Two distinct accessibility media queries, honored separately because they
answer different needs (vestibular-motion sensitivity vs. low-vision/
legibility or a GPU/battery preference for opaque chrome):

- **`prefers-reduced-motion: reduce`** — driven by `src/motion.js` /
  `src/motion-toggle.js` (an in-app override on top of the OS-level media
  query) and consumed directly as `@media (prefers-reduced-motion: reduce)`
  throughout the component sheets (`colors_and_type.css`,
  `src/css/app-shell/*.css`, `app-surfaces.css`, `community.css`,
  `editor-primitives.css`, `chat.css`, etc.) to cut transition/animation
  durations to near-zero and drop scroll-snap/parallax/marquee motion.
- **`prefers-reduced-transparency: reduce`** — a real OS-level media query
  (Windows/macOS/GNOME all expose it) with no in-app toggle counterpart yet.
  Every backdrop-blur or translucent-panel effect in the system drops to a
  fully opaque backing fill under this query instead of a see-through one,
  since the blur adds nothing once nothing shows through it:
  - `.os-menubar` / `.os-taskbar` (`src/kits/os/theme.css`) — translucent
    blurred bar -> solid `--os-bg-2` fill.
  - `.tb-sess-overlay` (`src/kits/os/theme.css`) — blurred session overlay ->
    solid `--scrim-strong` fill (same rule this selector already applies
    under `prefers-reduced-motion`, extended to this query too).
  - `.ds-ep-dock` (`editor-primitives.css`, the floating editor
    hierarchy/inspector docks) — translucent blurred card -> solid
    `--panel-1` fill, same layout.

  A future translucent/blurred surface must add its own
  `@media (prefers-reduced-transparency: reduce)` fallback next to its
  `backdrop-filter` rule, following the pattern above — do not assume
  `prefers-reduced-motion` alone covers it; a user can want full animation
  with zero see-through chrome, or vice versa.

## The one rule for component CSS

No raw color literal — ever. If you need a color, it is either an existing
semantic token or a new one you add to `colors_and_type.css`. `npm run build`
enforces this; a hard-coded hex fails the build with the offending `file:line`.
Genuinely non-themable values (a true-black media letterbox, a fixed white
canvas for embedded external content) go in the audited `ALLOW` list in
`scripts/lint-tokens.mjs`, not inline.
