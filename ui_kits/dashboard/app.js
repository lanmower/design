import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, Side, AppShell, Panel, Heading, Lede, Chip, Kpi, Table, Receipt, Changelog, Row, RowLink } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const kpis = [
    { label: 'requests', value: '24,891', delta: '+12.4%', meta: 'last 24h' },
    { label: 'avg latency', value: '184ms', delta: '-8ms', meta: 'p50' },
    { label: 'error rate', value: '0.42%', delta: '-0.06%', meta: '5xx + 4xx' },
    { label: 'cache hit', value: '94.7%', delta: '+1.2%', meta: 'edge' }
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
    { v: 'v0.4.12', date: '2026-05-10', notes: ['fix homepage kit motion ref', 'add dashboard kit', 'tune panel shadows'] },
    { v: 'v0.4.11', date: '2026-05-09', notes: ['cache warmup on cold start', 'lower retry interval'] },
    { v: 'v0.4.10', date: '2026-05-07', notes: ['migrate session store', 'add p99 to /metrics'] }
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
        topbar: Topbar({ brand: '247420', leaf: 'dashboard', items: [['index', '../../'], ['docs', '../docs/'], ['source ↗', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'dashboard' }),
        side: Side({
            sections: [
                { group: 'views', items: [
                    { glyph: '◆', label: 'overview', count: '·', key: 'o' },
                    { glyph: '◇', label: 'requests', count: 5,    key: 'r' },
                    { glyph: '◇', label: 'errors',   count: 2,    key: 'e' },
                    { glyph: '◇', label: 'cron',     count: 7,    key: 'c' }
                ] },
                { group: 'env', items: [
                    { glyph: '●', label: 'production', count: 'eu', key: 'p', color: 'var(--panel-accent)' },
                    { glyph: '●', label: 'staging',    count: 'us', key: 's', color: 'var(--mascot,#e0a200)' }
                ] }
            ]
        }),
        main: [
            h('div', { class: 'ds-section', style: 'padding:8px' },
                Heading({ level: 1, children: 'dashboard' }),
                Lede({ children: 'kpis, tables, receipts, changelog — every content primitive in one operations surface.' }),
                Panel({ title: 'live metrics', count: kpis.length, style: 'margin:8px 0', children: Kpi({ items: kpis }) }),
                Panel({ title: 'top endpoints', count: tableRows.length, style: 'margin:8px 0', children: Table({ headers: tableHeaders, rows: tableRows }) }),
                h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0' },
                    Panel({ title: 'environment', children: Receipt({ rows: receipt }) }),
                    Panel({ title: 'recent events', count: events.length, children: events.map((e, i) =>
                        Row({ key: 'ev' + i, code: e.code, title: e.title, sub: e.sub, meta: e.meta })
                    ) })
                ),
                Panel({ title: 'changelog', count: changelog.length, style: 'margin:8px 0', children: Changelog({ entries: changelog }) }),
                Panel({ title: 'about this kit', style: 'margin:8px 0', children: h('div', { class: 'ds-pattern-notes' },
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'Kpi' }), ' for headline counters with delta + meta.'),
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'Table' }), ' for tabular metrics, ', Chip({ tone: 'accent', children: 'Row' }), ' for event lists.'),
                    h('p', {}, '· ', Chip({ tone: 'accent', children: 'Receipt' }), ' for kv environment manifest, ', Chip({ tone: 'accent', children: 'Changelog' }), ' for release log.')
                ) })
            )
        ],
        status: Status({
            left: ['dashboard', '• ' + kpis.length + ' kpis', '• ' + tableRows.length + ' endpoints'],
            right: ['247420 / mmxxvi', '• live']
        })
    });
}

mountKit({ root, view: App, screen: '08 Dashboard' });
