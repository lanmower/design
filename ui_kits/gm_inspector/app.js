import * as webjsx from 'webjsx';
import { Topbar, Crumb, Side, Status, AppShell, Panel, Heading, Lede, Chip } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
import {
    PhaseWalk, TreeNode, BarRow, StatsGrid, SessionRow, DevRow, LiveLog
} from 'ds/components/data-density.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const kpis = [
    { val: '26,357', lbl: 'total events' },
    { val: '45',      lbl: 'days' },
    { val: '61',      lbl: 'prd rows' },
    { val: '0',       lbl: 'unresolved mutables', cls: 'err-rate' }
];

const sessions = [
    { sessId: 'sess-a1f9c2e0', events: 512, verbs: 88, prd: 24, muts: 3, resid: 0, deviations: 0,
      firstTs: '2026-06-30 09:12', lastTs: '2026-06-30 11:04',
      phaseWalkProps: { reached: [true, true, true, true, true] } },
    { sessId: 'sess-77b3d81a', events: 204, verbs: 41, prd: 9, muts: 1, resid: 0, deviations: 2,
      firstTs: '2026-07-01 14:20', lastTs: '2026-07-01 15:02',
      phaseWalkProps: { reached: [true, true, true, false, false] } },
    { sessId: 'sess-0c44e9f1', events: 96, verbs: 18, prd: 4, muts: 0, resid: 0, deviations: 0,
      firstTs: '2026-07-02 08:44', lastTs: '2026-07-02 08:58',
      phaseWalkProps: { reached: [true, true, false, false, false] } },
    { sessId: 'sess-de201aa3', events: 733, verbs: 112, prd: 31, muts: 5, resid: 1, deviations: 4,
      firstTs: '2026-07-03 10:01', lastTs: '2026-07-03 13:47',
      phaseWalkProps: { reached: [true, true, true, true, true], gapKinds: ['VERIFY'] } },
    { sessId: 'sess-9f0b6c22', events: 58, verbs: 11, prd: 2, muts: 0, resid: 0, deviations: 0,
      firstTs: '2026-07-04 16:30', lastTs: '2026-07-04 16:41',
      phaseWalkProps: { reached: [true, false, false, false, false] } }
];

const treeNodes = [
    { ts: '09:12:03', kind: 'phase.transitioned', variant: 'phase', phase: 'PLAN' },
    { ts: '09:14:41', kind: 'prd.added', variant: 'prd-add', id: 'add-project-registry' },
    { ts: '09:15:02', kind: 'prd.added', variant: 'prd-add', id: 'add-lifecycle-endpoint' },
    { ts: '09:22:18', kind: 'phase.transitioned', variant: 'phase', phase: 'EXECUTE' },
    { ts: '09:31:55', kind: 'mutable.resolved', variant: 'mutable-resolve', keyLabel: 'ds-primitives-port' },
    { ts: '09:44:07', kind: 'deviation.gate-deny', variant: 'deviation', deviationLabel: 'client-edit-no-witness', reason: 'browser dispatch missing for edited .js file' },
    { ts: '09:44:52', kind: 'browser', reason: 'witnessed edit invariant, zero pageErrors' },
    { ts: '10:02:30', kind: 'phase.transitioned', variant: 'phase', phase: 'EMIT' },
    { ts: '10:41:19', kind: 'phase.transitioned', variant: 'phase', phase: 'VERIFY' },
    { ts: '11:03:44', kind: 'phase.transitioned', variant: 'phase', phase: 'COMPLETE' }
];

const deviations = [
    { ts: '09:44:07', event: 'deviation.gate-deny', sess: 'sess-a1f9c2e0', operation: 'client-edit-no-witness' },
    { ts: '14:31:52', event: 'deviation.long-gap-retry-without-instruction', sess: 'sess-77b3d81a', operation: 'blind-verb-retry' }
];

const liveEntries = [
    { ts: '11:03:40', sub: 'plugkit', tone: 'var(--accent)', event: 'phase.transitioned', preview: 'phase=COMPLETE' },
    { ts: '11:03:41', sub: 'rs_learn', tone: 'var(--sun)', event: 'recall', preview: 'query="gm inspector kit" hit=true score=0.61' },
    { ts: '11:03:42', sub: 'hook', tone: 'var(--success)', event: 'dispatch.end', preview: 'verb=git_finalize ms=166' }
];

function App() {
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'gm inspector', items: [['index', '../../'], ['docs', '../docs/'], ['source ->', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'gm_inspector' }),
        side: Side({
            sections: [
                { group: 'views', items: [
                    { glyph: '*', label: 'overview', count: '·', key: 'o' },
                    { glyph: '-', label: 'sessions', count: sessions.length, key: 's' },
                    { glyph: '-', label: 'process tree', count: treeNodes.length, key: 't' },
                    { glyph: '-', label: 'deviations', count: deviations.length, key: 'd' }
                ] },
                { group: 'phase', items: [
                    { glyph: h('span', { class: 'ds-dot' }), label: 'COMPLETE', count: '5/5', key: 'p', color: 'var(--success)' }
                ] }
            ]
        }),
        main: [
            h('div', { class: 'ds-section ds-section-pad' },
                Heading({ level: 1, children: 'gm inspector' }),
                Lede({ children: 'session list, process tree, deviations, live stream -- the data-density component family (PhaseWalk, TreeNode, BarRow, StatsGrid, SessionRow, DevRow, LiveLog) composed into one observability surface.' }),
                Panel({ title: 'overview', count: kpis.length, class: 'ds-panel-gap', children: StatsGrid({ items: kpis }) }),
                Panel({ title: 'sessions', count: sessions.length, class: 'ds-panel-gap', children: sessions.length
                    ? h('div', { class: 'ds-scroll-x' }, ...sessions.map((s, i) => h('div', { key: 'sr' + i }, SessionRow(s))))
                    : h('div', { class: 'empty' }, 'no sessions recorded yet') }),
                h('div', { class: 'ds-panel-duo' },
                    Panel({ title: 'process tree', count: treeNodes.length, children: treeNodes.length
                        ? h('div', { class: 'ds-scroll-x' }, ...treeNodes.map((n, i) => h('div', { key: 'tn' + i }, TreeNode(n))))
                        : h('div', { class: 'ds-stat-lbl' }, 'no tree nodes yet') }),
                    Panel({ title: 'deviations', count: deviations.length, children: deviations.length
                        ? h('div', {}, ...deviations.map((d, i) => h('div', { key: 'dv' + i }, DevRow(d))))
                        : h('div', { class: 'ds-stat-lbl' }, 'no deviations') })
                ),
                Panel({ title: 'recall score histogram', class: 'ds-panel-gap', children: h('div', {},
                    BarRow({ label: '0.5-0.6', value: '12', pct: 40, tone: 'var(--accent)' }),
                    BarRow({ label: '0.6-0.7', value: '31', pct: 100, tone: 'var(--accent)' }),
                    BarRow({ label: '0.7-0.8', value: '18', pct: 58, tone: 'var(--accent)' }),
                    BarRow({ label: '0.8-0.9', value: '6',  pct: 19, tone: 'var(--accent)' })
                ) }),
                Panel({ title: 'live stream', class: 'ds-panel-gap', children: h('div', { class: 'ds-scroll-x' }, LiveLog({ entries: liveEntries })) }),
                Panel({ title: 'about this kit', class: 'ds-panel-gap', children: h('div', { class: 'ds-pattern-notes' },
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'StatsGrid' }), ' for dense KPI tiles.'),
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'SessionRow' }), ' + ', Chip({ tone: 'accent', children: 'PhaseWalk' }), ' for per-session phase progress at a glance.'),
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'TreeNode' }), ' for a chronological dispatch/verb timeline, variant-colored by kind.'),
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'DevRow' }), ' for deviation callouts, ', Chip({ tone: 'accent', children: 'BarRow' }), ' for inline histograms.'),
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'LiveLog' }), ' for a dense scrollable event stream.')
                ) })
            )
        ],
        status: Status({
            left: ['gm inspector', '- ' + sessions.length + ' sessions', '- ' + treeNodes.length + ' tree nodes'],
            right: ['247420 / mmxxvi', '- static sample data']
        })
    });
}

mountKit({ root, view: App, screen: 'gm inspector' });
