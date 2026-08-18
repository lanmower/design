# Stoat for-web visual-parity restyle — follow-up plan

Grounded in a direct read of `stoatchat/for-web/packages/client` (SolidJS,
Material 3 theme engine, Revolt-derived) against `mountCommunityApp`'s current
webjsx components (`src/components/community/*`, `community-app.css`,
`community.css`, `chat.css`). Concrete diffs observed, not assumed. Each pass
below is scoped to land as its own small, independently reviewable commit
against this repo's CI-gated lint/a11y pipeline — no pass attempts the whole
surface at once.

## Pass 1 — message layout shape (chat.css)

**Diff observed:** design's `.chat-msg`/`.chat-bubble` renders DM-style
rounded bubbles, right-aligned for `.you` (`chat.css:53-98`). Stoat's
`TextChannel`/message components render flat message ROWS (avatar + stacked
name/timestamp/body, no bubble container, no right-alignment for the current
user) — a Discord/Revolt convention, not a messaging-app one.
**Scope:** rework `.chat-msg`/`.chat-bubble`/`.chat-stack` to a flat-row
layout; drop the `.you` right-alignment/reverse-flex rule. Token-only colors
(existing `--fg-*`/`--bg-*` ramp already covers this, no new tokens
expected).

## Pass 2 — server/channel rail sizing

**Diff observed:** stoat's `ServerList` is a fixed `56px` icon rail
(`ServerList.tsx:367`); its `ServerSidebar`/`MemberSidebar` channel/member
columns read `var(--layout-width-channel-sidebar)`, which `Sidebar.tsx:25`
sets to `"auto"` (content-sized, not a fixed px). design's rail
(`community-app.css:110-111`) is a fixed `220px` column for BOTH
server-icons and channel-list combined — stoat splits these into two visually
distinct columns (narrow icon rail + separate auto-width channel list),
design has one.
**Scope:** split design's single rail into a narrow (~56-64px, pick a
`--r-*`/spacing-scale-anchored value, never a bare stoat literal) server-icon
strip plus a separate channel-list column; re-check the `900px` mobile
breakpoint override at `community-app.css:219-224` still makes sense once
split.

## Pass 3 — member sidebar width token

**Diff observed:** stoat's `MemberSidebar.tsx:268` explicitly reads
`var(--layout-width-channel-sidebar)` for its own width — the SAME token as
the channel sidebar, i.e. stoat deliberately keeps both side columns in sync
via one token. design has no equivalent shared width variable between its
member list and channel rail.
**Scope:** introduce one shared width custom property (spacing-scale value)
consumed by both design's channel rail and member list, mirroring stoat's
single-token-drives-both-columns convention, instead of two independently
hardcoded widths.

## Pass 4 — Material 3 radius/shape parity

**Diff observed:** stoat's theme (`stoatWebTheme.ts:66`) derives its corner
radii from the [Material 3 shape scale](https://m3.material.io/styles/shape/corner-radius-scale)
(a named small/medium/large/full ladder). design's existing `--r-*` scale
(`colors_and_type.css:328-333`: hair 2px, 0:4px, 1:8px, 2:10px, 3:14px, pill)
is a DIFFERENT numeric ladder with no per-role naming.
**Scope:** audit which `--r-*` rung each community-app component currently
uses against which M3 shape role stoat uses for the equivalent element
(cards vs. chips vs. avatars vs. modals), and re-point mismatches — this is a
mapping/re-point pass, not a token-scale rewrite (the existing ladder stays;
CI's `lint-radius` already forces `--r-*`-only, so this pass is low-risk).

## Pass 5 — voice view + overlays

Not yet diffed in this session (out of scope for this plan's research pass —
stoat's LiveKit-based voice package, `packages/solid-livekit-components`, is
a separate package from `packages/client` and needs its own read). Scope
this pass only after a dedicated comparison read of that package against
design's `cm-voice-*` components; do not guess ahead of that read.

## Explicitly out of scope for all passes above

Stoat's Material-You HCT dynamic-color engine (per-user/per-server generated
accent palettes) is a fundamentally different color model from design's
fixed-token Signals palette (`--green`/`--amber`/`--flame`/`--sky`/etc, see
`colors_and_type.css`). Adopting dynamic HCT generation would invalidate
every hand-tuned WCAG contrast derivation this repo's `npm run a11y` ratchet
currently protects (see AGENTS.md "shadcn-neutral restyle" notes on exactly
this failure mode happening once already). Not recommended as a follow-up
pass without a separate, explicit decision — flagged here so it isn't
silently attempted piecemeal inside Pass 1-5.
