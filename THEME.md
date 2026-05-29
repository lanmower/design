# Theming the 247420 Design System

Every visual decision in this system flows from one place: the token layer in
`colors_and_type.css`. Component sheets (`app-shell.css`, `community.css`,
`chat.css`, `editor-primitives.css`, `community-app.css`, `src/kits/os/*.css`)
contain **zero raw color literals** — they consume `var(--token)` only. That is
what makes the project perfectly themable: change the token layer (or flip one
attribute on the root element) and the entire UI re-skins, with no component
edit. A build-time guard (`scripts/lint-tokens.mjs`, run by `npm run build`)
fails the build if any component sheet hard-codes a color, so this stays true.

## Token taxonomy (three layers)

1. **Palette** — the raw brand colors. `--paper`, `--ink`, `--green`,
   `--green-2`, `--purple`, `--mascot`, `--sun`, `--flame`, `--sky`, plus their
   `-2`/`-deep`/`-tint` variants. These are the only place hex values live.
2. **Semantic surfaces** — what the palette *means* in context. `--bg`,
   `--bg-2`, `--bg-3` (surfaces), `--fg`, `--fg-2`, `--fg-3` (text), `--accent`,
   `--accent-fg`, `--accent-bright`, `--accent-tint`, `--danger`, `--success`,
   `--warn`, `--rule`, `--rule-strong`. A theme rebinds these; components read
   them. Also: `--on-accent` / `--on-color` (foreground on a saturated fill),
   `--scrim` / `--scrim-strong` / `--scrim-media` (overlay backdrops),
   `--cat-green`...`--cat-sky` (category color-coding), `--shadow-1..3` /
   `--shadow-overlay` (elevation).
3. **Component tokens** — namespaced aliases a subsystem reads, themselves bound
   to semantic tokens. e.g. the OS shell's `--os-bg-0: var(--bg)`,
   `--os-accent: var(--accent)`. Never bound to a literal.

Type, spacing, radius, motion, and z-index tokens follow the same shape:
`--ff-body`/`--ff-display`/`--ff-mono`, `--fs-*`, `--space-*`, `--r-1..4`/
`--r-pill`, `--dur-*`/`--ease`, `--z-*`.

## The attribute contract

The root element (`<html class="ds-247420">` or the SDK render root) carries
attributes that select tokens. All are independent and composable:

| Attribute        | Values                                  | Effect |
|------------------|-----------------------------------------|--------|
| `data-theme`     | `auto` `paper` `ink` `thebird`          | Surface theme. `auto` follows OS `prefers-color-scheme`. |
| `data-accent`    | `green` `purple` `mascot`               | Accent hue. Absent = theme default (green). |
| `data-density`   | `compact` `comfortable` `spacious`      | Scales `--density` -> padding/gutters. |
| `data-typescale` | `sm` `lg`                               | Bumps body/lg/xl reading sizes. |

`color-scheme` is set per theme so native form controls and scrollbars match.

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
literal in a component sheet. Copy `[data-theme="paper"]`, rename the attribute,
retune the ~8 tokens:

```css
[data-theme="dusk"] {
  color-scheme: dark;
  --bg: #1a1626; --bg-2: #241d33; --bg-3: #2e2540;
  --fg: #efe9f5; --fg-2: #c9c0d6; --fg-3: #8f86a0;
  --accent: var(--mascot); --accent-fg: var(--ink);
}
```

Then add `'dusk'` to the `VALID` set in `src/theme.js`. That is the entire
change — every component re-skins automatically because they read the semantics.

`thebird` is the worked example: a warm-paper brand preset that overrides
`--paper` (and the surfaces derived from it) without globally mutating the base
theme for other consumers.

## Adding an accent

One `[data-accent="X"]` block setting `--accent`, `--accent-bright`,
`--accent-fg`, `--panel-accent`. Add the name to `VALID_ACCENT` in `theme.js`.

## The one rule for component CSS

No raw color literal — ever. If you need a color, it is either an existing
semantic token or a new one you add to `colors_and_type.css`. `npm run build`
enforces this; a hard-coded hex fails the build with the offending `file:line`.
Genuinely non-themable values (a true-black media letterbox, a fixed white
canvas for embedded external content) go in the audited `ALLOW` list in
`scripts/lint-tokens.mjs`, not inline.
