# Accessibility

247420 targets WCAG 2.1 AA across every shipped kit surface, verified live rather than asserted.

## Current status

`node scripts/a11y-audit.mjs` runs the real axe-core engine against the live rendered DOM of all 21 `ui_kits/*` surfaces (a CDP session, not a static-HTML heuristic scan — computed style and contrast only exist post-render). As of this writing: **21/21 kits, 0 blocking (serious/critical) violations**. The full generated report lives at [`a11y-report.md`](./a11y-report.md); the check is a CI gate (`npm run lint:component-docs` and the a11y step in `.github/workflows/ci.yml`), not a one-time audit — a regression fails the build.

The baseline is a ratchet: it can only go down. Raising it to pass a new violation is treated the same as disabling a lint.

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
