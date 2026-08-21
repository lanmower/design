# Accessibility

247420 automatically scans every shipped kit surface for axe-core's
WCAG-tagged rule set, live rather than asserted. That is a real, continuous
check and a genuinely useful floor -- it is **not** a WCAG 2.1 AA conformance
claim (see "What this does and doesn't cover" below).

## Current status

`node scripts/a11y-audit.mjs` runs the real axe-core engine against the live rendered DOM of every `ui_kits/*` surface with an `index.html` (a CDP session, not a static-HTML heuristic scan — computed style and contrast only exist post-render). As of this writing: **23/23 kits, 0 blocking (serious/critical) violations**. The full generated report lives at [`a11y-report.md`](./a11y-report.md); the check is a CI gate (the a11y step in `.github/workflows/ci.yml`), not a one-time audit — a regression fails the build.

The baseline is a ratchet: it can only go down. Raising it to pass a new violation is treated the same as disabling a lint.

## What this does and doesn't cover

axe-core's automated rules cover a real but partial slice of WCAG success
criteria -- industry estimates put automated coverage at roughly a third to
half of all criteria; the rest (focus order making logical sense, whether
alt text is actually meaningful, keyboard-operability of custom widgets,
screen-reader announcement quality) needs a human. This scan also runs
WCAG-tagged rules only, which explicitly excludes some best-practice checks
-- `bypass` (skip-link presence) and `page-has-heading-one` (a real `<h1>`)
are not gated here, so a kit can pass this scan with no skip link and no
`h1`. (`CHANGELOG.md` records a real instance: four kits shipped with no
`main` landmark or skip link, invisible to this gate by design, caught only
by a later manual pass.) "0 blocking violations" is accurate and means what
it says; it is not the same claim as "WCAG AA conformant," and this doc
should never be read as making that stronger claim. A real conformance
statement needs the manual passes in the next section, done and logged, not
just this automated gate.

## Manual verification (not yet done)

Not yet performed as a repeatable, dated, gated process: NVDA/JAWS/VoiceOver
screen-reader passes, full keyboard-only traversal per kit, focus-return
verification on every dialog close, 200% text zoom, 400% reflow (WCAG
1.4.10), target-size audit (2.5.8), and focus-not-obscured checks (2.4.11).
Until these exist and are logged with a date, treat the automated-only
result above as a floor, not a ceiling.

## Color contrast

Every color in the system is a token, not a literal (`colors_and_type.css` is the single source of truth, and `lint-tokens` fails the build on any raw color literal in a component sheet). Text-on-surface pairs are measured against WCAG's relative-luminance contrast formula and verified to clear 4.5:1 for normal text, 3:1 for large text and non-text UI (icons, focus rings, borders). Semantic tokens intended for small fills or backgrounds (`--success`, `--warn`) are not automatically safe as *text* color — several components in this codebase have specific text-context tokens (`--green`, `--danger`, `--*-deep`, `--*-on-ink`) chosen because the fill-tuned token measured under 4.5:1 as foreground text. When adding a new color relationship, measure it; don't assume a token that's fine as a 3:1 fill is fine as 4.5:1 text.

## Focus and keyboard navigation

Every interactive element — buttons, links, inputs, custom controls — shares one `:focus-visible` treatment via the `--focus-w`/`--focus-color`/`--focus-offset` tokens defined once in `colors_and_type.css`, so keyboard focus is visually consistent across the entire system rather than component-by-component. `AppShell` and `WorkspaceShell` both render a skip link (`.skip-link`, targeting `#app-main`) as the first focusable element, so a keyboard user reaches content without tabbing through the full navigation chrome.

Custom composite widgets follow the WAI-ARIA Authoring Practices roving-focus pattern: apps menus and dropdown menus use `role="menu"`/`role="menuitem"` with arrow-key roaming and `Home`/`End` support; a bar of mixed controls (buttons, a brand label, an instance switcher) uses `role="toolbar"`, not `role="menubar"`, since `menubar` requires every direct child to be a menuitem — a real bug this system's own OS-shell menubar had until it was caught by the live a11y audit.

## Screen reader and ARIA conventions

- Icon-only buttons get an `aria-label` derived from their semantic role (never left unnamed).
- Non-modal transient UI (window open/close/focus-change in the desktop-shell window manager) is announced via a visually-hidden `aria-live="polite"` region, since there is no page navigation to signal the change implicitly.
- Modal dialogs (`ConfirmDialog`, `PromptDialog`, `FileViewer`) trap focus, restore it to the triggering element on close, and carry `role="dialog"`/`aria-modal`.
- Security-sensitive user content (chat messages, note previews) is rendered via `textContent` or an escape-first markdown pass, never raw `innerHTML` of unescaped input.

## Motion

A global `@media (prefers-reduced-motion: reduce)` rule in `base.css` disables/shortens `animation-duration`, `animation-iteration-count`, `transition-duration`, and `scroll-behavior` system-wide as a backstop, in addition to the per-component overrides most animated surfaces (skeleton shimmer, deck slide transitions, collab-cursor flashes) already carry individually.

## Touch targets

Interactive controls under the ~32px comfortable-click floor (icon buttons, resize handles) widen to a 44px minimum under `@media (pointer: coarse)`, matching the touch-target guidance in WCAG 2.5.5 / the platform-standard 44×44pt floor.

## Responsive and mobile behavior

See [`responsive.md`](./responsive.md) for the documented breakpoint scale. Layered-surface and panel-on-panel patterns are verified to collapse to single-column, touch-friendly layouts at the `mobile` (480px) breakpoint rather than only being designed and tested at desktop widths.
