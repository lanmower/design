import * as webjsx from 'webjsx';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see aicat/app.js for the measured rationale (200+ serial unbundled
// module requests when every kit pulls the full 30+-submodule barrel).
import { Topbar, Crumb, Status, Side, AppShell, IconButton, Icon, Chip } from 'ds/components/shell.js';
import { Panel } from 'ds/components/content.js';
import { Chat, ChatComposer } from 'ds/components/chat.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const seed = [
    { who: 'them', avatar: 'jr', name: 'jordan', time: '14:02',
      parts: [{ kind: 'text', text: 'pushed v0.0.27, theme cleanup looks clean now. see the **release notes** in [the changelog](https://github.com/AnEntrypoint/design/releases).' }],
      reactions: [{ emoji: 'yay', count: 3, you: true }, { emoji: 'eyes', count: 1 }] },
    { who: 'them', avatar: 'mk', name: 'mai', time: '14:03',
      parts: [{ kind: 'text', text: 'nice. body-hide trick on first paint? share the diff?' }] },
    { who: 'you', avatar: 'me', time: '14:04', receipt: 'read',
      parts: [
        { kind: 'text', text: 'yeah — just hide `body` until styles+fonts+first paint ready. no flash.' },
        { kind: 'code', lang: 'css', filename: 'theme.css',
          code: 'html { visibility: hidden; }\nhtml.ready { visibility: visible; }\n\n@media (prefers-reduced-motion: reduce) {\n  * { animation-duration: 0ms !important; }\n}' }
      ] },
    { who: 'them', avatar: 'jr', name: 'jordan', time: '14:05',
      parts: [{ kind: 'md', text: '## review notes\n\nlooks solid. couple things:\n\n- short timeout fallback in case fonts hang\n- announce the `ready` class via `requestIdleCallback`\n- keep no-js fallback to `visibility: visible`\n\n> "ship the rough draft" — but not the broken one.\n\nwill review the rest tonight.' }],
      reactions: [{ emoji: 'done', count: 2, you: true }] },
    { who: 'them', avatar: 'mk', name: 'mai', time: '14:08',
      parts: [{ kind: 'image', src: './sample-svg.svg', alt: 'design system mascot', caption: 'spot the new mascot — final' }] },
    { who: 'you', avatar: 'me', time: '14:10', receipt: 'read',
      parts: [
        { kind: 'text', text: 'attaching the v0.0.27 token sheet for review:' },
        { kind: 'pdf', src: './sample.pdf', name: 'tokens-v0.0.27.pdf', size: 782 }
      ] },
    { who: 'them', avatar: 'jr', name: 'jordan', time: '14:12',
      parts: [{ kind: 'link', href: 'https://github.com/AnEntrypoint/design', host: 'github.com',
                title: 'AnEntrypoint/design — design system for 247420',
                desc: 'a coherent visual paradigm — layered surfaces, monospace labels, loud content inside quiet chrome.',
                thumb: './sample-square.png' }] },
    { who: 'them', avatar: 'mk', name: 'mai', time: '14:14',
      parts: [{ kind: 'file', src: './sample.pdf', name: 'meeting-notes-2026-05-01.pdf', size: 782 }],
      reactions: [{ emoji: 'pin', count: 1 }] },
    { who: 'them', avatar: 'jr', name: 'jordan', time: '14:15', typing: true,
      parts: [] }
];

// `phase` drives the thread. Chat() already owns the empty state (its
// .chat-empty block), so `empty` here just hands it zero messages plus the
// room-specific copy; loading and error are rendered by this kit around it.
// `detailOpen` gates the "this room" / participants rail — dismissible via
// its close button or Escape, same as the rest of the kit's dismissible
// surfaces (see the Popover component's onKey pattern in
// src/components/overlay-primitives/popover.js).
const state = { draft: '', room: 'general', messages: seed.slice(), phase: 'ready', detailOpen: true };
const PHASES = ['ready', 'loading', 'empty', 'error'];

// Message-shaped shimmer. Reuses .ds-event-row-skeleton + .ds-skel* from
// app-shell/files.css — the avatar/body/timestamp rhythm is the same shape.
function ThreadSkeleton() {
    return Panel({ title: 'loading #' + state.room, children: h('div', {},
        ...Array.from({ length: 6 }, (_, i) => h('div', { key: 'sk' + i, class: 'ds-event-row-skeleton' },
            h('span', { class: 'ds-skel ds-skel-icon' }),
            h('span', { class: 'ds-skel ds-skel-title' }),
            h('span', { class: 'ds-skel ds-skel-meta' })
        ))
    ) });
}

function ThreadError() {
    return Panel({ title: 'thread unavailable', children: h('div', { class: 'ds-alert ds-alert-error' },
        h('span', { class: 'ds-alert-icon' }, '!'),
        h('div', { class: 'ds-alert-content' },
            h('div', { class: 'ds-alert-title' }, 'lost the socket to #' + state.room),
            h('div', { class: 'ds-alert-message' }, 'the connection dropped mid-sync, so the last few messages may be missing and anything you send now would not leave this tab. reconnecting replays from the last message you saw.'),
            h('div', { class: 'ds-alert-retry' },
                h('button', { class: 'btn', onclick: () => { state.phase = 'ready'; kit.render(); } }, 'reconnect')
            )
        )
    ) });
}
// Room `count` is member count, not unread messages -- ariaLabel spells that
// out explicitly (the visible badge alone reads as ambiguous when scanning
// quickly, since it looks identical to an unread-count badge elsewhere in
// the system). glyph uses Icon() (hash/dot) instead of literal '#'/'·' per
// AGENTS.md's glyph ban -- applied where App() builds Side() items below.
const rooms = [
    { glyph: 'hash', label: 'general', count: 12, key: 'general' },
    { glyph: 'hash', label: 'design', count: 4, key: 'design' },
    { glyph: 'hash', label: 'releases', count: 1, key: 'releases' },
    { glyph: 'hash', label: 'lore', count: 0, key: 'lore' }
];
const dms = [
    { glyph: 'dot', label: 'jordan', key: 'jr' },
    { glyph: 'dot', label: 'mai', key: 'mk' },
    { glyph: 'dot', label: 'aicat', key: 'aicat' }
];
// One-line "what this room is for" -- gives the "this room" panel a third
// line of real content instead of stopping at the member count. DMs have no
// topic (there's no # room to describe), so state.room keys not listed here
// simply render no topic line.
const roomTopics = {
    general: 'ship talk, release notes, the odd screenshot',
    design: 'design system proposals and review threads',
    releases: 'version bumps and changelog links only',
    lore: 'anything goes'
};

// Pinned items for the "this room" rail's "pinned" panel -- whatever in the
// current thread carries a 'pin' reaction (mai's meeting-notes PDF in the
// seed thread), named by its file if it has one else its text. Derived from
// live state rather than hardcoded, so it stays accurate if `send()` or a
// future reaction toggle changes what's pinned.
function pinnedItems() {
    return state.messages
        .filter((m) => (m.reactions || []).some((r) => r.emoji === 'pin'))
        .map((m) => {
            const filePart = m.parts.find((p) => p.kind === 'file' || p.kind === 'pdf');
            const textPart = m.parts.find((p) => p.kind === 'text');
            return filePart ? filePart.name : (textPart ? textPart.text : 'message');
        });
}

const root = document.getElementById('root');
function timeNow() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

function send(text) {
    state.messages = [...state.messages, {
        who: 'you', avatar: 'me', time: timeNow(), receipt: 'delivered',
        parts: [{ kind: 'text', text }]
    }];
    state.draft = '';
    kit.render();
    setTimeout(() => {
        state.messages = [...state.messages, {
            who: 'them', avatar: 'jr', name: 'jordan', time: timeNow(),
            parts: [{ kind: 'text', text: 'noted. *' + text.split(' ').slice(0, 6).join(' ') + '…*' }]
        }];
        state.messages = state.messages.map((m) => m.who === 'you' ? { ...m, receipt: 'read' } : m);
        kit.render();
    }, 1100);
}

function App() {
    const pinned = pinnedItems();
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'chat', items: [['index', '../../'], ['aicat', '../aicat/'], ['source', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'chat' }),
        side: Side({
            sections: [
                { group: 'rooms', items: rooms.map(r => ({
                    ...r, glyph: Icon(r.glyph, { size: 14 }),
                    // Explicit "N members" accessible name -- the bare count
                    // badge alone (count-only, no unit) reads ambiguously as
                    // an unread indicator when scanning quickly.
                    ariaLabel: r.label + (r.count ? ', ' + r.count + ' members' : ''),
                    active: state.room === r.key, onClick: (e) => { e.preventDefault(); state.room = r.key; kit.render(); }
                })) },
                { group: 'direct', items: dms.map(r => ({ ...r, glyph: Icon(r.glyph, { size: 14 }), active: state.room === r.key, onClick: (e) => { e.preventDefault(); state.room = r.key; kit.render(); } })) },
                // Reachable state switcher for the thread.
                { group: 'thread state', items: PHASES.map((p) => ({
                    glyph: h('span', { class: state.phase === p ? 'ds-dot ds-dot-on' : 'ds-dot ds-dot-off' }),
                    label: p, key: 'ph-' + p, active: state.phase === p,
                    onClick: (e) => { e.preventDefault(); state.phase = p; kit.render(); }
                })) },
                // Reopen affordance for the dismissible "this room" rail — closing
                // it (its own close button, or Escape) must not be a dead end.
                { group: 'room details', items: [{
                    glyph: h('span', { class: state.detailOpen ? 'ds-dot ds-dot-on' : 'ds-dot ds-dot-off' }),
                    label: state.detailOpen ? 'shown' : 'show rail', key: 'detail-toggle', active: state.detailOpen,
                    onClick: (e) => { e.preventDefault(); state.detailOpen = true; kit.render(); }
                }] }
            ]
        }),
        main: [
            // Every other AppShell kit names its page with an h1; this one had
            // none, so the document went straight from <main> to the thread and
            // a screen reader's heading list came back empty. Visually hidden
            // rather than drawn, because Chat() already renders the room name as
            // its own visible title — a second visible copy would be redundant.
            h('h1', { class: 'sr-only' }, 'chat — #' + state.room),
            h('div', { class: 'ds-section chat-kit-page' },
                h('div', { class: 'ds-chat-layout' },
                    state.phase === 'loading' ? ThreadSkeleton()
                    : state.phase === 'error' ? ThreadError()
                    : Chat({
                        title: state.room,
                        // Chat()'s own empty block uses `sub` as its body line,
                        // so the empty phase gets copy that names what belongs
                        // here and what puts it here — not a bare "no messages".
                        sub: state.phase === 'empty'
                            ? 'nobody has posted in #' + state.room + ' yet. say something and it becomes the first message everyone sees on join.'
                            : 'public',
                        messages: state.phase === 'empty' ? [] : state.messages,
                        composer: ChatComposer({
                            value: state.draft,
                            placeholder: 'message #' + state.room + '…',
                            onInput: (v) => { state.draft = v; kit.render(); },
                            onSend: send
                        })
                    }),
                    // Persistent detail rail — only revealed once .ds-chat-layout has
                    // room to spare (>=1100px, see app-shell.css). On mobile/tablet
                    // this is display:none rather than reflowed below the thread, so
                    // the composer stays the last on-screen element there. Dismissible:
                    // the close button and Escape both clear detailOpen, matching every
                    // other dismissible surface in this codebase (Popover's onKey).
                    // tabindex/role/aria-label: the rail can now scroll its own
                    // overflow (kits-appended.css's .ds-chat-detail max-height +
                    // overflow-y, added so its content never bleeds into the
                    // pattern-notes panel below it in the DOM), so it needs the
                    // same keyboard-reachable-scroll-region treatment as that
                    // panel's own body and Table's scroll wrapper.
                    state.detailOpen ? h('div', { class: 'ds-chat-detail', tabindex: '0', role: 'group', 'aria-label': 'room details, scrollable' },
                        // panel-flush: .ds-chat-detail itself now owns the gap
                        // between these panels (flex column + --space-4), so each
                        // panel's own default --space-6 margin-bottom would double
                        // up on top of that gap -- same pairing .ds-panel-flush
                        // already uses elsewhere for a gap-owning container.
                        Panel({
                            title: 'this room',
                            class: 'panel-flush',
                            right: IconButton({
                                icon: Icon('x', { size: 14 }), size: 'sm', variant: 'ghost',
                                title: 'close room details',
                                onClick: () => { state.detailOpen = false; kit.render(); }
                            }),
                            // topic + pinned are real content (roomTopics below;
                            // pinnedItems() reads whatever in the thread actually
                            // carries a 'pin' reaction), not filler -- the rail used
                            // to end at "N members" with a big stretch of blank space
                            // down to the sticky rail's own natural-height ceiling.
                            // Both fold into THIS panel's existing .ds-pattern-notes
                            // block (cheap: one more ~23px line each) rather than each
                            // getting its own Panel -- a whole extra Panel's chrome
                            // (title row + --space-4 padding + --space-6 margin, ~150px)
                            // for one pinned chip previously pushed the rail's total
                            // content past the grid row's height and got clipped/
                            // overlapped by the "pattern notes" panel below the grid.
                            children: h('div', { class: 'ds-pattern-notes' },
                                h('p', {}, h('strong', {}, '#' + state.room)),
                                h('p', {}, rooms.find(r => r.key === state.room)?.count ?? dms.find(r => r.key === state.room)?.count ?? 0, ' members'),
                                roomTopics[state.room] ? h('p', {}, 'topic: ' + roomTopics[state.room]) : null,
                                pinned.length
                                    ? h('p', {}, 'pinned: ', Chip({ size: 'sm', children: pinned[0] }))
                                    : null
                            )
                        }),
                        // Single .ds-pattern-notes wrapper (was one per participant,
                        // each a separate .panel-body child) so consecutive names
                        // share the same --space-2 line rhythm "this room" and
                        // "pinned" above already use, instead of falling back to
                        // .panel-body's own --space-3 default sibling gap -- three
                        // different spacing rules for three stacked panels of the
                        // same kind of content read as arbitrary, not as rhythm.
                        Panel({ title: 'participants', class: 'panel-flush', children: h('div', { class: 'ds-pattern-notes' },
                            [{ glyph: '·', label: 'jordan' }, { glyph: '·', label: 'mai' }].map((p, i) =>
                                h('p', { key: 'p' + i }, p.glyph + ' ' + p.label)
                            )
                        ) })
                    ) : null
                ),
                Panel({
                    title: 'pattern notes',
                    // panel-docs (kits-appended.css) is the system's existing
                    // "this is a caption ABOUT the UI above it, not the UI
                    // itself" treatment -- dashed border, quiet tinted fill, a
                    // "docs ·" title prefix -- built for exactly this problem
                    // (its own comment cites this kit's sibling, aicat, for
                    // the same "identical card chrome on both made the
                    // meta-explanation read as part of the product" issue).
                    // Was a plain .panel, chrome-identical to Chat's own
                    // composer/panels above it, so this reference block
                    // visually fused with the live chat UI instead of reading
                    // as a separate annotation layer.
                    class: 'panel-docs',
                    // .panel-body here is capped to 45vh with its own scroll
                    // (kits-appended.css, ".chat-kit-page > .panel > .panel-body")
                    // so the chat surface above it always keeps a usable height
                    // instead of this reference panel eating the whole page --
                    // tabindex/role/aria-label make that scroll region keyboard-
                    // reachable, same pattern as Table's scroll wrapper.
                    bodyAttrs: { tabindex: '0', role: 'group', 'aria-label': 'pattern notes, scrollable' },
                    children: h('div', { class: 'ds-pattern-notes' },
                        h('p', {}, '· bubble corner-cut on the originating side (4–6px) gives directional read without arrows.'),
                        h('p', {}, '· own messages take the accent fill so the eye lands on what you said last; [x] delivered, [x][x] read.'),
                        h('p', {}, '· markdown is parsed by ', h('code', {}, 'marked'), ' and sanitized by ', h('code', {}, 'DOMPurify'), '; code blocks lit by ', h('code', {}, 'prism.js'), '.'),
                        h('p', {}, '· >=1100px viewport reveals a persistent "this room" + participants rail beside the thread instead of just widening the message column.'),
                        h('p', {}, '· the rail is dismissible — its close button and Escape both hide it; "room details" in the sidebar brings it back.')
                    )
                })
            )
        ],
        status: Status({ left: ['main', '- ' + (state.phase === 'ready' ? state.messages.length : 0) + ' messages', '- ' + rooms.length + ' rooms', '- ' + state.phase], right: ['247420 / mmxxvi'] })
    });
}

const kit = mountKit({ root, view: App, screen: '06 Chat' });
window.__chat = { state, render: kit.render };

// Escape-to-close for the "this room" rail — same dismissal contract as the
// Popover/menu overlays elsewhere in this codebase (see onKey in
// src/components/overlay-primitives/popover.js), scoped to document since
// the rail is a persistent docked panel rather than a focus-trapped overlay:
// Escape should close it regardless of which element currently has focus.
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !state.detailOpen) return;
    e.preventDefault();
    state.detailOpen = false;
    kit.render();
});
