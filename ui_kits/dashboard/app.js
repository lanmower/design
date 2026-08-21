import * as webjsx from 'webjsx';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see aicat/app.js for the measured rationale (200+ serial unbundled
// module requests when every kit pulls the full 30+-submodule barrel).
import { Topbar, Crumb, Status, Side, AppShell, Heading, Lede, Chip, Btn, Icon } from 'ds/components/shell.js';
import { Panel, Kpi, BarChart, Table, Receipt, Changelog, Row } from 'ds/components/content.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

// Error rate only reads as danger above this line -- ties the KPI's
// red/green polarity to a real, stated signal instead of a bare stylistic
// default (any positive delta = red).
const ERROR_RATE_DANGER_PCT = 1;

const kpis = [
    ['24,891', 'requests · 24h', { delta: '+12.4%', tone: 'up',   spark: [8, 11, 9, 14, 16, 15, 19, 22, 20, 24] }],
    // tone was hardcoded 'up' despite a negative delta -- the arrow pointed
    // the wrong way relative to the -6.1% figure beside it. tone now
    // follows the real arithmetic sign (down), and invert:true marks
    // latency as a "lower is better" metric (same pattern as error rate
    // below) so a falling latency still renders in the good/success color,
    // not the down/bad one the raw arrow direction alone would imply.
    ['184ms',  'avg latency · p50', { delta: '-6.1%', tone: 'down', invert: true, spark: [220, 210, 205, 198, 190, 188, 184, 186, 182, 184] }],
    // tone follows delta's own arithmetic sign (the arrow direction always
    // matches the figure: error rate rose, so the arrow points up), but this
    // is a "lower is better" metric — a rising error rate isn't automatically
    // bad news at any value, only above a documented threshold (1% — the
    // level at which 5xx+4xx starts indicating a real reliability problem,
    // not noise). At 0.42% the color stays neutral/good; `invert` only flips
    // to red/danger once the figure itself crosses that line, so color
    // communicates a real signal instead of "any positive delta is bad".
    ['0.42%',  'error rate · 5xx+4xx', { delta: '+0.08%', tone: 'up', invert: 0.42 > ERROR_RATE_DANGER_PCT, spark: [0.2, 0.25, 0.3, 0.28, 0.35, 0.3, 0.38, 0.4, 0.36, 0.42] }],
    ['94.7%',  'cache hit · edge', { delta: '+1.2%', tone: 'up', spark: [90, 91, 92, 91, 93, 92, 94, 93, 95, 94.7] }]
];

const channelBreakdown = [
    { label: 'edge cache', value: 412, display: '412 rps' },
    { label: 'origin fetch', value: 187, display: '187 rps' },
    { label: 'feed api', value: 1200, display: '1.2k rps' },
    { label: 'upload api', value: 24, display: '24 rps' }
];

const tableHeaders = ['endpoint', 'rps', 'p95', 'errors', 'status'];
const tableRows = [
    ['GET /api/users',     '412', '92ms',  '0',  'ok'],
    ['POST /api/sessions', '187', '218ms', '2',  'ok'],
    ['GET /api/feed',      '1.2k','144ms', '0',  'ok'],
    ['POST /api/upload',   '24',  '1.4s',  '11', 'warn'],
    ['DELETE /api/cache',  '3',   '38ms',  '0',  'ok']
];

// Copy affordance for the commit hash -- a bare hash is dead text where a
// user expects to copy or open it. Self-contained (not importing the chat
// module's copyToClipboardWithFeedback) since that lives behind chat.js's
// full barrel and this kit has no other reason to pull it in.
function fallbackCopy(text) {
    const t = document.createElement('textarea');
    t.value = text; document.body.appendChild(t); t.select();
    document.execCommand('copy'); document.body.removeChild(t);
}
function copyCommit(e) {
    const btn = e.currentTarget;
    const text = btn.dataset.commit;
    const done = () => {
        btn.textContent = 'copied';
        setTimeout(() => { btn.textContent = text; }, 1400);
    };
    // Falls back to execCommand whenever the async Clipboard API is either
    // absent OR rejects (permission denied, an unfocused document -- a real
    // failure mode, not just an old-browser one) -- the prior copy() helpers
    // this was modeled on only fell back when navigator.clipboard didn't
    // exist at all, silently doing nothing on a live rejection.
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => { try { fallbackCopy(text); done(); } catch { /* swallow: no copy mechanism available */ } });
    } else {
        try { fallbackCopy(text); done(); } catch { /* swallow: no copy mechanism available */ }
    }
}
const COMMIT_HASH = '8799035';
const receipt = [
    ['environment', 'production'],
    ['region',      'eu-west-1'],
    ['build',       'v0.4.12-7a3f9'],
    ['deployed',    '2026-05-10 14:22'],
    ['commit',      h('button', { type: 'button', class: 'btn-link', 'data-commit': COMMIT_HASH, 'aria-label': 'copy commit hash ' + COMMIT_HASH, onclick: copyCommit },
        Icon('copy', { size: 12 }), COMMIT_HASH)],
    ['by',          'lanmower']
];

const changelog = [
    { date: '2026-05-10', ver: 'v0.4.12', msg: 'fix homepage kit motion ref · add dashboard kit · tune panel shadows' },
    { date: '2026-05-09', ver: 'v0.4.11', msg: 'cache warmup on cold start · lower retry interval' },
    { date: '2026-05-07', ver: 'v0.4.10', msg: 'migrate session store · add p99 to /metrics' }
];

// No 01/02/03 index: the feed is already ordered by the `meta` age column, so a
// counter would carry no information and would read as a ranking that isn't one.
// The rail tone is the real signal — it says what KIND of event this was, which
// is what an operator scans for.
const events = [
    { title: 'deploy succeeded',  sub: 'v0.4.12 · all regions',  meta: '2m',  rail: 'green' },
    { title: 'cache flushed',     sub: 'edge-cache · eu-west-1', meta: '14m' },
    { title: 'p95 spike',         sub: '/api/upload · 1.4s',     meta: '38m', rail: 'flame' },
    { title: 'cron ran',          sub: 'reindex-search · ok',    meta: '1h',  rail: 'green' },
    { title: 'config reloaded',   sub: 'feature flags',          meta: '3h' }
];

// Every data panel below reads its state from here rather than assuming the
// happy path. FeedStateSwitcher (collapsed kit-controls drawer, end of main)
// flips it, so each state is a real reachable surface in the kit, not dead
// code behind a flag nobody sets.
const state = { feed: 'ready', density: 'comfy' };
const FEED_STATES = ['ready', 'loading', 'empty', 'error'];
const DENSITIES = ['comfy', 'tight'];

// Loading placeholder for the events feed. Reuses the .ds-event-row-skeleton
// primitive (app-shell/files.css) — the row shape it was cut for is the same
// icon/title/meta rhythm Row() renders, so no new skeleton CSS is needed.
function EventsSkeleton() {
    return h('div', {},
        ...[0, 1, 2, 3, 4].map((i) => h('div', { key: 'sk' + i, class: 'ds-event-row-skeleton' },
            h('span', { class: 'ds-skel ds-skel-icon' }),
            h('span', { class: 'ds-skel ds-skel-title' }),
            h('span', { class: 'ds-skel ds-skel-meta' })
        ))
    );
}

function EventsEmpty() {
    return h('div', { class: 'ds-empty-state' },
        h('div', { class: 'ds-empty-state-glyph' }, '[ ]'),
        h('p', { class: 'ds-empty-state-msg' }, 'no events in the last 24h'),
        h('p', { class: 'ds-empty-state-hint' }, 'deploys, cache flushes and cron runs land here as they happen. a quiet feed means production is quiet.')
    );
}

function EventsError() {
    return h('div', { class: 'ds-alert ds-alert-error' },
        h('span', { class: 'ds-alert-icon' }, '!'),
        h('div', { class: 'ds-alert-content' },
            h('div', { class: 'ds-alert-title' }, 'event stream disconnected'),
            h('div', { class: 'ds-alert-message' }, 'the eu-west-1 collector stopped answering 38s ago, so this feed is stale. metrics above still come from the edge and are current.'),
            h('div', { class: 'ds-alert-retry' },
                h('button', { class: 'btn', onclick: () => { state.feed = 'ready'; kit.render(); } }, 'reconnect')
            )
        )
    );
}

function EventsPanel() {
    if (state.feed === 'loading') return EventsSkeleton();
    if (state.feed === 'error') return EventsError();
    if (state.feed === 'empty') return EventsEmpty();
    return h('div', {}, ...events.map((e, i) => Row({ key: 'ev' + i, title: e.title, sub: e.sub, meta: e.meta, rail: e.rail })));
}

const feedCountOf = () => (state.feed === 'ready' ? events.length : 0);

// Dev/demo state toggles for the events feed — reachable reference surface
// for its other phases (loading/empty/error), but not part of the "live"
// Recent Events content it simulates. Collapsed by default behind a
// <details> disclosure (see .ds-kit-controls, kits-appended.css) — the same
// pattern the aicat kit uses for its transcript reference-state toggles —
// so it reads as scaffolding you can open, not live panel content.
function FeedStateSwitcher() {
    return h('details', { class: 'ds-kit-controls' },
        h('summary', {}, 'kit controls — recent events reference state, panel density'),
        h('div', { class: 'ds-kit-controls-body' },
            h('div', { class: 'ds-btn-row', 'aria-label': 'events panel demo state' },
                h('span', { class: 'eyebrow' }, 'demo:'),
                ...FEED_STATES.map((s) => Btn({
                    key: 'fs-' + s,
                    size: 'sm',
                    variant: state.feed === s ? 'primary' : 'ghost',
                    'aria-label': 'show events panel ' + s + ' state',
                    onClick: () => { state.feed = s; kit.render(); },
                    children: s
                }))
            ),
            h('div', { class: 'ds-btn-row', 'aria-label': 'panel density' },
                h('span', { class: 'eyebrow' }, 'density:'),
                ...DENSITIES.map((d) => Btn({
                    key: 'ds-' + d,
                    size: 'sm',
                    variant: state.density === d ? 'primary' : 'ghost',
                    'aria-label': 'switch to ' + d + ' panel density',
                    onClick: () => { state.density = d; kit.render(); },
                    children: d
                }))
            )
        )
    );
}

function App() {
    const feedCount = feedCountOf();
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'dashboard', items: [['index', '../../'], ['docs', '../docs/'], ['source', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'dashboard' }),
        side: Side({
            sections: [
                // Every entry anchors to the panel it names. These were four
                // inert rows styled exactly like working nav; the counts were
                // also invented, so they now read off the data each panel draws.
                { group: 'views', items: [
                    { glyph: '*', label: 'overview',      count: kpis.length,             key: 'o', href: '#p-metrics' },
                    { glyph: '-', label: 'endpoints',     count: tableRows.length,        key: 'r', href: '#p-endpoints' },
                    { glyph: '-', label: 'events',        count: feedCountOf(),           key: 'e', href: '#p-events' },
                    { glyph: '-', label: 'changelog',     count: changelog.length,        key: 'c', href: '#p-changelog' }
                ] },
                // Environment is a READOUT, not navigation — there is no
                // per-environment view in this kit to switch to. It anchors to
                // the environment receipt, which is the panel that actually
                // carries this information, rather than promising a filter it
                // cannot perform.
                { group: 'env', items: [
                    { glyph: h('span', { class: 'ds-dot ds-dot-on' }), label: 'production', count: 'eu', key: 'p', color: 'var(--panel-accent)', href: '#p-environment' },
                    { glyph: h('span', { class: 'ds-dot ds-dot-off' }), label: 'staging',   count: 'us', key: 's', color: 'var(--mascot)', href: '#p-environment' }
                ] }
                // The feed-state switcher used to live here as its own sidebar
                // group, styled identically to every real nav row above it —
                // a first-time viewer has no way to tell "reachable panel
                // anchor" from "kit-demo control that reassigns local state"
                // when both render as the same .app-side link. It later moved
                // to a control strip inside "recent events", but that still
                // put demo scaffolding inside the panel it was simulating as
                // live content. It now lives collapsed behind a
                // <details class="ds-kit-controls"> disclosure at the end of
                // main (see FeedStateSwitcher below) — reachable, but never
                // mistaken for the events feed itself.
            ]
        }),
        main: [
            h('div', { class: 'ds-app-surface ds-section-pad', 'data-density': state.density === 'tight' ? 'compact' : 'comfortable' },
                Heading({ level: 1, children: 'dashboard' }),
                Lede({ children: 'kpis, tables, receipts, changelog — every content primitive in one operations surface.' }),
                // Reading order: headline counters lead (the glance), then the
                // paired analysis, then the three reference panels. Each tier is
                // separated by the .ds-panel-gap/.ds-panel-duo outer rhythm,
                // which is deliberately wider than any panel's inner gap.
                Panel({ id: 'p-metrics', title: 'live metrics', count: kpis.length, class: 'ds-panel-gap', children: Kpi({ items: kpis }) }),
                h('div', { class: 'ds-panel-duo' },
                    Panel({ title: 'traffic by channel', count: channelBreakdown.length, class: 'ds-panel-flush', children: BarChart({ items: channelBreakdown }) }),
                    // Table() already wraps itself in .ds-table-wrap, its own
                    // overflow-x:auto + tabindex/role="group" scroll container
                    // (table.js) — an outer .ds-scroll-x here nested a second,
                    // redundant scroll region with no purpose of its own.
                    Panel({ id: 'p-endpoints', title: 'top endpoints', count: tableRows.length, class: 'ds-panel-flush', children: Table({ headers: tableHeaders, rows: tableRows, striped: true }) })
                ),
                // Three equal reference panels. A real 3-track grid, not
                // percentage flex-basis: with basis+gap the three tracks
                // overflow 100% and the last one wraps to its own row.
                // .ds-panel-flush drops each panel's own bottom margin so the
                // grid gap is the single source of separation in the row.
                h('div', { class: 'ds-panel-trio' },
                    Panel({ id: 'p-environment', title: 'environment', class: 'ds-panel-flush', children: Receipt({ rows: receipt }) }),
                    Panel({ id: 'p-events', title: 'recent events', count: feedCount, class: 'ds-panel-flush', children: EventsPanel() }),
                    Panel({ id: 'p-changelog', title: 'changelog', count: changelog.length, class: 'ds-panel-flush', children: Changelog({ entries: changelog }) })
                ),
                Panel({ title: 'about this kit', class: 'ds-panel-gap', children: h('div', { class: 'ds-pattern-notes' },
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'Kpi' }), ' for headline counters with trend delta + sparkline.'),
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'BarChart' }), ' for a category breakdown, ', Chip({ tone: 'accent', children: 'Table' }), ' for tabular metrics, ', Chip({ tone: 'accent', children: 'Row' }), ' for event lists.'),
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'Receipt' }), ' for kv environment manifest, ', Chip({ tone: 'accent', children: 'Changelog' }), ' for release log.'),
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'ds-panel-trio' }), '/', Chip({ tone: 'accent', children: 'ds-panel-duo' }), ' for multi-panel rows — real grid tracks that step down on container width, not the viewport.'),
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'ds-panel-flush' }), ' on any panel inside a gap-owning row, so the container is the single source of separation.')
                ) }),
                // Dev/demo state toggles for the events feed — reachable
                // reference surface for the panel's other phases, but not
                // part of the "about this kit" documentation prose and not
                // sitting inside "recent events" pretending to be live
                // content. Collapsed by default (see FeedStateSwitcher).
                FeedStateSwitcher()
            )
        ],
        status: Status({
            left: ['dashboard', '- ' + kpis.length + ' kpis', '- ' + tableRows.length + ' endpoints', '- feed ' + state.feed],
            right: ['247420 / mmxxvi', '- live']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '08 Dashboard' });
