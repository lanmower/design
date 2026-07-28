import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, Side, AppShell, Panel, Heading, Lede, Chip, Kpi, BarChart, Table, Receipt, Changelog, Row } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const kpis = [
    ['24,891', 'requests · 24h', { delta: '+12.4%', tone: 'up',   spark: [8, 11, 9, 14, 16, 15, 19, 22, 20, 24] }],
    ['184ms',  'avg latency · p50', { delta: '-6.1%', tone: 'up',  spark: [220, 210, 205, 198, 190, 188, 184, 186, 182, 184] }],
    ['0.42%',  'error rate · 5xx+4xx', { delta: '+0.08%', tone: 'down', spark: [0.2, 0.25, 0.3, 0.28, 0.35, 0.3, 0.38, 0.4, 0.36, 0.42] }],
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

const receipt = [
    ['environment', 'production'],
    ['region',      'eu-west-1'],
    ['build',       'v0.4.12-7a3f9'],
    ['deployed',    '2026-05-10 14:22'],
    ['commit',      '8799035'],
    ['by',          'lanmower']
];

const changelog = [
    { date: '2026-05-10', ver: 'v0.4.12', msg: 'fix homepage kit motion ref · add dashboard kit · tune panel shadows' },
    { date: '2026-05-09', ver: 'v0.4.11', msg: 'cache warmup on cold start · lower retry interval' },
    { date: '2026-05-07', ver: 'v0.4.10', msg: 'migrate session store · add p99 to /metrics' }
];

const events = [
    { code: '01', title: 'deploy succeeded',  sub: 'v0.4.12 · all regions',     meta: '2m' },
    { code: '02', title: 'cache flushed',     sub: 'edge-cache · eu-west-1',    meta: '14m' },
    { code: '03', title: 'p95 spike',         sub: '/api/upload · 1.4s',        meta: '38m' },
    { code: '04', title: 'cron ran',          sub: 'reindex-search · ok',       meta: '1h' },
    { code: '05', title: 'config reloaded',   sub: 'feature flags',             meta: '3h' }
];

function App() {
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'dashboard', items: [['index', '../../'], ['docs', '../docs/'], ['source ->', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'dashboard' }),
        side: Side({
            sections: [
                { group: 'views', items: [
                    { glyph: '*', label: 'overview', count: '·', key: 'o' },
                    { glyph: '-', label: 'requests', count: 5,    key: 'r' },
                    { glyph: '-', label: 'errors',   count: 2,    key: 'e' },
                    { glyph: '-', label: 'cron',     count: 7,    key: 'c' }
                ] },
                { group: 'env', items: [
                    { glyph: h('span', { class: 'ds-dot' }), label: 'production', count: 'eu', key: 'p', color: 'var(--panel-accent)' },
                    { glyph: h('span', { class: 'ds-dot' }), label: 'staging',    count: 'us', key: 's', color: 'var(--mascot)' }
                ] }
            ]
        }),
        main: [
            h('div', { class: 'ds-app-surface ds-section-pad' },
                Heading({ level: 1, children: 'dashboard' }),
                Lede({ children: 'kpis, tables, receipts, changelog — every content primitive in one operations surface.' }),
                // Reading order: headline counters lead (the glance), then the
                // paired analysis, then the three reference panels. Each tier is
                // separated by the .ds-panel-gap/.ds-panel-duo outer rhythm,
                // which is deliberately wider than any panel's inner gap.
                Panel({ title: 'live metrics', count: kpis.length, class: 'ds-panel-gap', children: Kpi({ items: kpis }) }),
                h('div', { class: 'ds-panel-duo' },
                    Panel({ title: 'traffic by channel', count: channelBreakdown.length, class: 'ds-panel-flush', children: BarChart({ items: channelBreakdown }) }),
                    Panel({ title: 'top endpoints', count: tableRows.length, class: 'ds-panel-flush', children: h('div', { class: 'ds-scroll-x' }, Table({ headers: tableHeaders, rows: tableRows })) })
                ),
                // Three equal reference panels. A real 3-track grid, not
                // percentage flex-basis: with basis+gap the three tracks
                // overflow 100% and the last one wraps to its own row.
                // .ds-panel-flush drops each panel's own bottom margin so the
                // grid gap is the single source of separation in the row.
                h('div', { class: 'ds-panel-trio' },
                    Panel({ title: 'environment', class: 'ds-panel-flush', children: Receipt({ rows: receipt }) }),
                    Panel({ title: 'recent events', count: events.length, class: 'ds-panel-flush', children: events.length
                        ? events.map((e, i) => Row({ key: 'ev' + i, code: e.code, title: e.title, sub: e.sub, meta: e.meta }))
                        : h('div', { class: 'empty' }, 'no events yet') }),
                    Panel({ title: 'changelog', count: changelog.length, class: 'ds-panel-flush', children: Changelog({ entries: changelog }) })
                ),
                Panel({ title: 'about this kit', class: 'ds-panel-gap', children: h('div', { class: 'ds-pattern-notes' },
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'Kpi' }), ' for headline counters with trend delta + sparkline.'),
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'BarChart' }), ' for a category breakdown, ', Chip({ tone: 'accent', children: 'Table' }), ' for tabular metrics, ', Chip({ tone: 'accent', children: 'Row' }), ' for event lists.'),
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'Receipt' }), ' for kv environment manifest, ', Chip({ tone: 'accent', children: 'Changelog' }), ' for release log.'),
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'ds-panel-trio' }), '/', Chip({ tone: 'accent', children: 'ds-panel-duo' }), ' for multi-panel rows — real grid tracks that step down on container width, not the viewport.'),
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'ds-panel-flush' }), ' on any panel inside a gap-owning row, so the container is the single source of separation.')
                ) })
            )
        ],
        status: Status({
            left: ['dashboard', '- ' + kpis.length + ' kpis', '- ' + tableRows.length + ' endpoints'],
            right: ['247420 / mmxxvi', '- live']
        })
    });
}

mountKit({ root, view: App, screen: '08 Dashboard' });
