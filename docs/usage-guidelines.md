# Usage guidelines

Previously missing entirely: guidance for *when* to reach for which
primitive, beyond the stamp/badge/rail split already documented in
`THEME.md`. This is a real first draft synthesized from how the shipped
kits actually use these primitives (`ui_kits/*`, `preview/*`), not an
abstract ideal — expand it as real inconsistencies get caught, the same way
the lint ratchets in `CONTRIBUTING.md` track real debt rather than an
aspirational zero.

## Primitive selection

- **Stamp / Badge / Rail** — see `THEME.md`'s "Stamp vs badge vs rail"
  section. Do not re-derive this here.
- **Chip vs Pill vs Badge** — three more "small labeled surface" primitives,
  also easy to confuse:
  - `Chip` (`atoms.js`) — a status-tone indicator that can carry a remove
    action (`onRemove`); use for a filter/facet the user applied, or a
    removable tag.
  - `Pill` (`atoms.js`) — a plain, non-interactive label; use for a static
    annotation (a phase name, an id) that carries no state and no action.
  - `Badge` (`atoms.js`) — a compact count/variant marker attached to other
    content (an unread count, a "new" flag); can repeat as many times per
    page as there are things to badge, unlike `Stamp`.
- **Toggle vs Switch, Accordion vs CollapseGroup, Pagination vs Pager** —
  these already exist under names that don't match what a consumer searching
  for the common web-UI term would type: `Toggle({ kind: 'switch' })` is the
  switch, `CollapseGroup({ accordion: true })` is the accordion,
  `Pager`/`PagerNumbered` are pagination. `COMPONENT_API.md` cross-references
  these; check there before assuming a primitive doesn't exist.

## Layout composition

- Reach for `--panel-0`/`--panel-1`/`--panel-2` tonal steps to build up
  visual hierarchy on a dense screen (dashboards, settings) rather than
  adding borders or shadows on top of a flat fill — see the "Depth
  language" note above `--shadow-*` in `colors_and_type.css` for which of
  tone / rule / shadow a given surface should use, and why not more than one
  at once.
- `--pad-y`/`--pad-x`/`--gutter` are the section-level spacing tokens (they
  scale with `--density`); `--space-*` is the fine-grained scale for
  everything inside a component. Don't hand-pick a raw px value where one of
  these already fits — `lint-spacing` ratchets this.
- Prefer container queries (`container-type: inline-size` + `cqi`-based
  sizing, as `.app`/`.ds-stage` already establish — see the comment at the
  `--fs-h1`..`--fs-mega` block in `colors_and_type.css`) over a new viewport
  breakpoint when a component's size should respond to its own container
  rather than the whole page.

## Form patterns

- Every form field needs a real `<label>` (or `aria-label`) associated via
  `for`/`id`, not just placeholder text — see `docs/accessibility.md`'s
  ARIA conventions section.
- Use `Form`/`TextField` (`content/fields.js`) for standard field shapes
  (including `{ multiline: true }` for a textarea) rather than hand-rolling
  a bare `<input>`/`<textarea>` — the shared component already wires label
  association, error text, and the right input type.
- Buttons default to `type="button"` (see `Btn`'s implementation) — a submit
  button inside a `<form>` needs an explicit `type="submit"`; don't rely on
  the browser default.

## Error and empty-state patterns

- An error state names the real problem and, where possible, a next step —
  see `preview/dropzone.html`'s own caption for the tone: plain, specific,
  bold only on the load-bearing constraint, never vague ("something went
  wrong").
- An empty state explains *why* it's empty and what would fill it (see the
  404 kit's "oversized mono code with three recovery calls to action" for
  the pattern), rather than a bare "no results."
- Loading states use the shared skeleton/shimmer treatment already wired to
  `prefers-reduced-motion`, not a bespoke spinner per component.

## Content and capitalisation rules

See `SKILL.md`'s "Content patterns" section — sentence case by default,
`.dateline`-style mono labels are the one deliberate UPPERCASE convention,
and every number in copy must trace back to a real generator or measurement.
