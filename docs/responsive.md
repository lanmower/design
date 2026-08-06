# Responsive breakpoints

This is the documented breakpoint scale actually in use across the kit surfaces
(sourced from `@media` rules in `src/css/app-shell/responsive.css` and
`src/css/app-shell/responsive2-workspace.css`). There is no separate token
file for these — breakpoints are expressed as raw `px` values in `@media`
queries, consistent with the rest of the codebase's CSS.

| name | px value | intended use |
|---|---|---|
| `xs` | `max-width: 360px` | smallest phones; tightest chrome, hide secondary controls |
| `mobile` | `max-width: 480px` | phone breakpoint; single-column layouts, collapsed navigation, hamburger/bottom-sheet chrome |
| `tablet` | `min-width: 481px` and `max-width: 1024px` | tablet / narrow-desktop band; adjusted grid columns, condensed rails |
| `narrow-desktop` | `max-width: 768px` | secondary narrow cutoff used by a subset of kits for row/stack behavior |
| `workspace-md` | `max-width: 900px` | workspace shell: hides desktop-only toggles, collapses resizers |
| `workspace-lg` | `max-width: 1100px` | workspace shell: hides session-pane resizer |
| `workspace-xl` | `max-width: 1480px` | workspace shell: hides pane resizer, adjusts pane toggle visibility |
| `desktop` | `min-width: 1025px` | default desktop layout, multi-column grids |
| `wide` | `min-width: 1920px` | ultra-wide displays; expanded workspace spacing |

Two additional media features are used alongside width breakpoints:

- `(pointer: coarse)` — touch-input detection, used to enlarge hit targets
  (e.g. resizer handles) independent of viewport width.
- `(prefers-reduced-motion: reduce|no-preference)` — motion-safety, not a
  layout breakpoint but co-located with the same `@media` mechanism.

## Canonical mobile breakpoint

For any new narrow-viewport fallback (collapsing nav to a hamburger, stacking
a grid to single column, etc.), use **`max-width: 480px`** as the standard
mobile cutoff — it's the value already established in
`src/css/app-shell/responsive.css` and reused by
`src/css/app-shell/responsive2-workspace.css`. This is the breakpoint reused
by the OS-shell, file-browser, dashboard, terminal, and sidebar responsive
fixes documented in this repo.
