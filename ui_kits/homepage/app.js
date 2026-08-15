import * as webjsx from 'webjsx';
import { mountKit } from 'ds/bootstrap.js';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see ui_kits/aicat/app.js for the measured rationale (200+ serial
// unbundled module requests when every kit pulls the full 30+-submodule
// barrel).
import { AppShell, Topbar, Crumb, Status, Dot } from 'ds/components/shell.js';
import { Hero, Panel, Row, Section, WorksList, WritingList, Manifesto } from 'ds/components/content.js';

const h = webjsx.createElement;
const root = document.getElementById('root');

const navItems = [
    ['works', '#works'],
    ['writing', '#writing'],
    ['manifesto', '#manifesto'],
    ['source', 'https://github.com/AnEntrypoint']
];

const shipping = [
    { name: 'gm', sub: 'state machine v0.4.1', live: true },
    { name: 'zellous', sub: 'push-to-talk', live: true },
    { name: 'thebird', sub: '—', live: false }
];

// `href` (the "open ->" button) and `source` (the "source" button) are the two
// destinations WorksList renders inside an expanded work. Both are required:
// WorksList falls back to '#' when they are absent, which renders the buttons
// as real, pressable affordances that lead nowhere. Every entry below points at
// a repo that actually exists under the AnEntrypoint org.
const GH = 'https://github.com/AnEntrypoint/';
const works = [
    { code: '001', title: 'gm', sub: 'state machine for coding agents', meta: '2025 · 3k', body: 'a tiny deterministic state machine that lets llms code without losing their minds. it thinks so you don\'t have to (as much).', href: GH + 'gm', source: GH + 'gm' },
    { code: '002', title: 'zellous', sub: 'production push-to-talk', meta: '2024 · shipped', body: 'hold the button. talk. someone on the other side hears you. opus codec, dynamic rooms, 50-message replay.', href: GH + 'zellous', source: GH + 'zellous' },
    { code: '003', title: 'spoint', sub: 'spawnpoint', meta: '2024 · shipped', body: 'the directory for "where should we start?" one url, one room, everyone lands in the same place.', href: GH + 'spoint', source: GH + 'spoint' },
    { code: '004', title: 'flatspace', sub: 'flat-file cms', meta: 'wip', body: 'still figuring out what to say about this one. come back tuesday.', href: GH + 'flatspace', source: GH + 'flatspace' },
    { code: '005', title: 'thebird', sub: '—', meta: 'wip', body: 'yes, the name is a reference. no, we won\'t tell you to what.', href: GH + 'thebird', source: GH + 'thebird' },
    { code: '006', title: 'mcp-repl', sub: 'repl for mcp', meta: '2024 · live', body: 'executenodejs, executedeno, executebash, astgrep_search. if you don\'t know what those are, this one isn\'t for you.', href: GH + 'mcp-repl', source: GH + 'mcp-repl' },
    { code: '007', title: 'mutagen', sub: 'adaptogen server', meta: '2024 · live', body: 'everything to do with a dapp deg3n. read the source.', href: GH + 'mutagen', source: GH + 'mutagen' },
    { code: '008', title: 'techshaman', sub: 'member site', meta: 'ongoing', body: 'the official website for the techshaman. an entrypoint probably emerging.', href: GH + 'techshaman', source: GH + 'techshaman' }
];

// There is no posts backend behind this kit, so these link to the blog kit —
// which renders the first entry below as a full post — rather than to invented
// per-post URLs that would 404. href:'#' (the previous value) rendered five
// anchors that looked like article links and did nothing when clicked.
const POST_HREF = '../blog/';
const posts = [
    { date: '2026.04.14', title: 'we were here first', tag: 'lore', href: POST_HREF },
    { date: '2026.03.22', title: 'gm v0.4 postmortem, or: why state machines', tag: 'gm', href: POST_HREF },
    { date: '2026.02.09', title: 'push-to-talk is a protocol, not a feature', tag: 'zellous', href: POST_HREF },
    { date: '2025.12.11', title: 'against the vibe-coded interface', tag: 'manifesto', href: POST_HREF },
    { date: '2025.10.03', title: 'notes on shipping weird', tag: 'notes', href: POST_HREF }
];

const manifesto = [
    { text: 'we are the creative department of the internet. always open (24/7). always a little bit high on possibility (420).' },
    { text: 'move fast. break things. document honestly. ship the rough draft. humor is load-bearing.' },
    { text: 'we will not tolerate simpleton design patterns, trifectas, gradients, or anything silly. nothing lame. we\'re internet natives and not easily pleased.', dim: true }
];

// `phase` drives the three content lists (shipping / works / writing). Cycled
// from the topbar so each reading is reachable in the kit — a portfolio page
// that only ever renders a full grid has never shown what a cold or failed
// fetch looks like.
const state = { route: 'works', opened: 0, phase: 'ready' };
const PHASES = ['ready', 'loading', 'empty', 'error'];

// Row shimmer. Reuses .ds-event-row-skeleton + .ds-skel* (app-shell/files.css).
function ListSkeleton(n, prefix) {
    return h('div', {},
        ...Array.from({ length: n }, (_, i) => h('div', { key: prefix + i, class: 'ds-event-row-skeleton' },
            h('span', { class: 'ds-skel ds-skel-rank' }),
            h('span', { class: 'ds-skel ds-skel-title' }),
            h('span', { class: 'ds-skel ds-skel-meta' })
        ))
    );
}

function ListEmpty(msg, hint) {
    return h('div', { class: 'ds-empty-state' },
        h('div', { class: 'ds-empty-state-glyph' }, '[ ]'),
        h('p', { class: 'ds-empty-state-msg' }, msg),
        h('p', { class: 'ds-empty-state-hint' }, hint)
    );
}

function ListError(title, msg) {
    return h('div', { class: 'ds-alert ds-alert-error' },
        h('span', { class: 'ds-alert-icon' }, '!'),
        h('div', { class: 'ds-alert-content' },
            h('div', { class: 'ds-alert-title' }, title),
            h('div', { class: 'ds-alert-message' }, msg),
            h('div', { class: 'ds-alert-retry' },
                h('button', { class: 'btn', onclick: () => { state.phase = 'ready'; render(); } }, 'refetch')
            )
        )
    );
}

function ShippingBody() {
    const p = state.phase;
    if (p === 'loading') return ListSkeleton(3, 'sk-ship-');
    if (p === 'error') return ListError('build status unavailable',
        'the status endpoint timed out, so live and wip cannot be told apart right now. the projects below are still real; only their badges are unknown.');
    if (p === 'empty') return ListEmpty('nothing in flight this week',
        'projects appear here while they are actively being worked on. everything currently shipped is in works below.');
    return h('div', {}, ...shipping.map((s) => Row({
        key: s.name, leading: Dot({ tone: s.live ? 'on' : 'off' }),
        title: s.name, sub: s.sub, meta: s.live ? 'live' : 'wip'
    })));
}

function WorksBody() {
    const p = state.phase;
    if (p === 'loading') return ListSkeleton(6, 'sk-work-');
    if (p === 'error') return ListError('works index failed to load',
        'the projects manifest returned malformed json at entry 4, so the list was rejected rather than shown with a hole in it. a refetch usually picks up the corrected file.');
    if (p === 'empty') return ListEmpty('no works published yet',
        'each entry is one shipped project with its year, size and a paragraph on what it does. the first one lands here as soon as it is tagged.');
    return WorksList({ works, openedIndex: state.opened, onToggle: (i) => { state.opened = i; render(); } });
}

function WritingBody() {
    const p = state.phase;
    if (p === 'loading') return ListSkeleton(5, 'sk-post-');
    if (p === 'error') return ListError('writing feed unreachable',
        'the posts feed is served from a different origin and that origin is down. the works list above is local and unaffected.');
    if (p === 'empty') return ListEmpty('nothing written lately',
        'posts land here newest first, tagged by which project they belong to. quiet here usually means loud somewhere else.');
    return WritingList({ posts });
}

function App() {
    return AppShell({
        // The nav carries destinations only. The phase cycler used to ride
        // here as a fifth item, which made a demo control a peer of works /
        // writing / manifesto and let it take the `active` highlight away from
        // the section the reader is actually in. It moved onto the first panel
        // it governs.
        topbar: Topbar({
            brand: '247420', leaf: 'an entrypoint',
            items: navItems,
            active: state.route,
            onNav: (label) => { state.route = label; render(); }
        }),
        crumb: Crumb({ trail: ['247420'], leaf: state.route }),
        main: [
            // badges fill the Hero's full-width card below the body copy —
            // without them the aside is simply absent (Hero omits it when
            // both badges and actions are empty), rather than an empty column.
            // They are counts this page already knows, not invented metrics.
            Hero({
                title: 'the creative department of the internet.',
                body: '247420 is a collective of mercurials. we ship fast, break things on purpose, and document honestly.',
                accent: 'humor is load-bearing.',
                badges: state.phase === 'ready'
                    ? [works.length + ' works', posts.length + ' posts', shipping.filter((s) => s.live).length + ' live']
                    : null
            }),
            Panel({
                title: 'currently shipping',
                right: h('button', { class: 'btn', onclick: () => {
                    state.phase = PHASES[(PHASES.indexOf(state.phase) + 1) % PHASES.length];
                    render();
                } }, state.phase === 'ready' ? shipping.length + ' in flight' : state.phase),
                children: ShippingBody()
            }),
            // No eyebrow: '08 of ~61' was a position indicator over a section
            // that is not part of any sequence, and the ~61 contradicted the
            // eight works actually listed. The count belongs in the status bar,
            // which already carries it.
            Section({ id: 'works', title: 'works', children: WorksBody() }),
            Section({ id: 'writing', title: 'recent writing',
                children: WritingBody() }),
            Section({ id: 'manifesto', title: 'manifesto · rough draft',
                children: Manifesto({ paragraphs: manifesto }) })
        ],
        // 'source' already lives in the topbar nav (navItems above) — a
        // second identical link in the status bar added nothing but a
        // duplicate destination, so the right cluster is dropped rather than
        // repeating either that link or the phase already shown on the left.
        status: Status({
            left: ['main', state.phase === 'ready' ? '8 works' : '0 works', state.phase === 'ready' ? '5 posts' : '0 posts', state.phase],
            right: []
        })
    });
}

const kit = mountKit({ root, view: App, screen: '01 Homepage' });
function render() { kit.schedule(); }
