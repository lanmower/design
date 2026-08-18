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

## Pass 4 — Material 3 radius/shape parity ✅ done (`5794066`)

**Diff observed:** stoat's theme (`stoatWebTheme.ts:66`) derives its corner
radii from the [Material 3 shape scale](https://m3.material.io/styles/shape/corner-radius-scale)
(a named small/medium/large/full ladder). design's existing `--r-*` scale
(`colors_and_type.css:328-333`: hair 2px, 0:4px, 1:8px, 2:10px, 3:14px, pill)
is a DIFFERENT numeric ladder with no per-role naming.

**What shipped:** auditing the full component set against stoat's actual
per-element radius usage found the ladders already map cleanly (channel rows
at `--r-0`≈stoat's `xs` 4px, panels/modals at `--r-3`≈stoat's `lg` 16px,
badges/pills already `--r-pill`≈stoat's `full`) — the one real mismatch was
`.ca-rail-servers a`'s hover/active state, which shrank the avatar's own
`--r-2`→`--r-1` radius on hover. Stoat's `ServerList` (`entryContainer`,
`ServerList.tsx:363-390`) does NOT touch the avatar radius at all; it signals
hover/selected via a separate left-edge pill indicator (`::before`, fixed
4px radius, 0→16px height on hover, →32px selected). Replaced the
radius-morph (which had no stoat equivalent) with that same pill-indicator
pattern, keeping the avatar's `--r-2` fixed.

## Pass 5 — voice view + overlays ✅ done (`96e4c80`)

**Diff observed:** design's `VoiceControls` (mic/deafen/camera/screen/
settings/leave) already matched stoat's `VoiceCallCardActions` action set.
One real gap: stoat's `VoiceCallCardActions.tsx` renders an additional xs
"return to voice channel" affordance when its call card is collapsed/
floating (`props.size === "xs"` branch) — design had no equivalent.

**What shipped:** `VoiceControls` now accepts an optional `collapsed`/
`onReturn` pair (default `collapsed=false`, fully backward-compatible) that
renders the same return-to-channel button using a new `arrow-top-left` icon,
following the existing `.vx-vc-*`/`btn()` pattern rather than introducing new
naming. Overlay set (context-menu/emoji-picker/command-palette/auth-modal/
boot-overlay/settings-popover/voice-settings-modal/video-lightbox/
audio-queue/thread-panel) was compared category-by-category against stoat's
menu/modal set (`components/app/menus/*`, `components/modal/*`) and found
already at structural parity — no unmatched category, so no changes made
there beyond what Pass 5's voice-controls diff already covered.

## Material-You HCT dynamic-color engine ✅ done (`0404a9d`)

Previously flagged as "needs a separate explicit decision" because a full
base-palette swap once broke `npm run a11y` (1.15:1 contrast, see AGENTS.md
"shadcn-neutral restyle"). Decision made and implemented: `src/theme/
dynamic-accent.js` extracts HCT hue+chroma from a source color and renders
it at FIXED M3-role tones (mirroring stoat's `createMaterialColourVariables`
in `materialTheme.ts`), which is what gives the contrast guarantee — never
derived from the source's own lightness. Applied additively as scoped
`--dyn-accent*` CSS vars a caller sets inline on one subtree (e.g. a single
server's rail item), never as a rewrite of the document-wide `--accent`/
`--accent-ink` tokens, so this failure mode cannot recur even if a future
pass gets it wrong for one hue — the blast radius stays scoped to whichever
subtree opted in.

Verified: dev contrast check across 8 representative hues (RGB primaries/
secondaries, the existing design accent, and a low-chroma gray), light and
dark — worst case 4.77:1 on primary/on-primary (AA floor 4.5:1), 6.08-13.30:1
on container/on-container. `ui_kits/dynamic-accent/` exercises the module so
`npm run a11y` (live axe-core, not a static heuristic) actually covers it:
0 blocking violations, 21 passes, unchanged 0-violation baseline across all
24 kits. Not wired to `@material/material-color-utilities` — its current npm
release ships a broken ESM subpath import; the HCT tone-at-hue-chroma math
was reimplemented directly instead, matching this repo's existing
vendor-small-and-targeted convention (`vendor/axe-core`, `vendor/webjsx`).

## Live verification (all passes above)

Rebuilt `dist/`, served zellous's real `docs/nostr-chat/index.html` locally
with its importmap pointed at the fresh local build (not the 12-24h-lagged
jsdelivr CDN), loaded it via `scripts/cdp.mjs`, and confirmed: zero console
errors, `mountCommunityApp` rendering zellous's actual chat UI, computed
`.ca-rail-servers` width `56px` / `.ca-rail-channels` width `220px` (Pass
2/3 live), flat message-row layout visible (Pass 1 live). No zellous code
changes were needed — the adapter boundary held throughout.
