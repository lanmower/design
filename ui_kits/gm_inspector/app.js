import * as webjsx from 'webjsx';
import {
    Topbar, Crumb, Side, Status, AppShell, Panel, Heading, Lede, Chip, Pill,
    Pager, JsonViewer, ToolbarRow, PropertyGrid, PropertyGridRow, PropertyField, InlineEditableField,
    Grid, GridItem, Collapse, CollapseGroup, Divider
} from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
import {
    PhaseWalk, TreeNode, BarRow, StatsGrid, SessionRow, DevRow, LiveLog
} from 'ds/components/data-density.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

// Live demo state for the "editor primitives" showcase panel below --
// exercises Pager/InlineEditableField as genuinely interactive widgets (not
// static markup), same pattern the rest of this kit already uses for
// sessions/treeNodes/deviations sample data.
const demoState = { page: 1, pageCount: 6, prdText: 'audit gmsniff GUI consumer surface', prdTextError: false };

// Live demo state for the "screen-real-estate primitives" panel (Grid,
// Collapse/CollapseGroup, Divider, Pager numbered mode) -- the gap set found
// porting webgeist's space-optimized components into this SDK.
const densityState = { numberedPage: 4, numberedCount: 22, openSettingsId: 'general' };

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
            h('div', { class: 'ds-app-surface ds-section-pad' },
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
                Panel({ title: 'editor primitives', count: '6', class: 'ds-panel-gap', children: h('div', {},
                    h('p', { class: 'ds-stat-lbl' }, 'Pill (tag-like annotations):'),
                    ToolbarRow(
                        Pill({ children: 'PLAN' }),
                        Pill({ tone: 'accent', children: 'add-pager-component' }),
                        Pill({ tone: 'muted', children: 'sess-a1f9c2e0' })
                    ),
                    h('p', { class: 'ds-stat-lbl' }, 'Pager (live, click to page through a demo PRD list):'),
                    Pager({
                        page: demoState.page, pageCount: demoState.pageCount, total: 16,
                        itemLabel: 'prd rows',
                        onPage: (p) => { demoState.page = p; render(); },
                    }),
                    h('p', { class: 'ds-stat-lbl' }, 'InlineEditableField (live, edit the text below):'),
                    PropertyGrid({ children: [
                        PropertyGridRow({ children: [
                            PropertyField({ label: 'id', inline: true, children: h('span', { class: 'ds-stat-lbl' }, 'add-pager-component') }),
                            PropertyField({ label: 'text', children: InlineEditableField({
                                value: demoState.prdText,
                                placeholder: 'prd row text...',
                                error: demoState.prdTextError,
                                onInput: (v) => { demoState.prdText = v; demoState.prdTextError = v.trim() === ''; render(); },
                            }) }),
                        ] }),
                    ] }),
                    h('p', { class: 'ds-stat-lbl' }, 'JsonViewer (raw dispatch payload preview):'),
                    JsonViewer({ value: { verb: 'prd-resolve', id: 'add-pager-component', witness_evidence: 'test.js: 3 Pager checks pass' } })
                ) }),
                Panel({ title: 'screen-real-estate primitives', count: '5', class: 'ds-panel-gap', children: h('div', {},
                    h('p', { class: 'ds-stat-lbl' }, 'Grid / GridItem (24-column responsive layout):'),
                    Grid({ children: [
                        GridItem({ xs: true, sm: 6, md: 4, children: Panel({ title: 'xs:auto sm:6 md:4', children: h('p', {}, 'resizes down to a third-width column at md+') }) }),
                        GridItem({ xs: true, sm: 6, md: 4, children: Panel({ title: 'xs:auto sm:6 md:4', children: h('p', {}, 'stacks 2-up at sm, 3-up at md') }) }),
                        GridItem({ xs: true, sm: 12, md: 4, children: Panel({ title: 'xs:auto sm:12 md:4', children: h('p', {}, 'full-width until md') }) }),
                    ] }),
                    h('p', { class: 'ds-stat-lbl' }, 'Pager numbered mode (live, click a page number):'),
                    Pager({
                        page: densityState.numberedPage, pageCount: densityState.numberedCount, numbered: true,
                        total: 210, itemLabel: 'events',
                        onPage: (p) => { densityState.numberedPage = p; render(); },
                    }),
                    h('p', { class: 'ds-stat-lbl' }, 'Divider (plain / labeled / vertical):'),
                    Divider(),
                    Divider({ label: 'OR' }),
                    h('div', { class: 'ds-inline-row' },
                        h('span', {}, 'left'), Divider({ vertical: true }), h('span', {}, 'right')),
                    h('p', { class: 'ds-stat-lbl' }, 'CollapseGroup (live, accordion mode -- click a header):'),
                    CollapseGroup({
                        accordion: true,
                        openId: densityState.openSettingsId,
                        onOpenChange: (id) => { densityState.openSettingsId = id; render(); },
                        items: [
                            { id: 'general', title: 'General', children: h('p', {}, 'Theme, density, notification preferences.') },
                            { id: 'advanced', title: 'Advanced', children: h('p', {}, 'API keys, webhook endpoints, rate limits.') },
                            { id: 'danger', title: 'Danger zone', children: h('p', {}, 'Delete workspace, transfer ownership.') },
                        ],
                    })
                ) }),
                Panel({ title: 'about this kit', class: 'ds-panel-gap', children: h('div', { class: 'ds-pattern-notes' },
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'StatsGrid' }), ' for dense KPI tiles.'),
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'SessionRow' }), ' + ', Chip({ tone: 'accent', children: 'PhaseWalk' }), ' for per-session phase progress at a glance.'),
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'TreeNode' }), ' for a chronological dispatch/verb timeline, variant-colored by kind.'),
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'DevRow' }), ' for deviation callouts, ', Chip({ tone: 'accent', children: 'BarRow' }), ' for inline histograms.'),
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'LiveLog' }), ' for a dense scrollable event stream.'),
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'Pill' }), '/', Chip({ tone: 'accent', children: 'Pager' }), '/', Chip({ tone: 'accent', children: 'JsonViewer' }), '/', Chip({ tone: 'accent', children: 'ToolbarRow' }), '/', Chip({ tone: 'accent', children: 'InlineEditableField' }), ' - the gap set found auditing gmsniff\'s GUI, which already builds on this SDK directly.'),
                    h('p', {}, '- ', Chip({ tone: 'accent', children: 'Grid' }), '/', Chip({ tone: 'accent', children: 'Collapse' }), '/', Chip({ tone: 'accent', children: 'Divider' }), '/', Chip({ tone: 'accent', children: 'Pager numbered mode' }), ' - the space-optimization gap set found porting webgeist\'s screen-density patterns into this SDK.')
                ) })
            )
        ],
        status: Status({
            left: ['gm inspector', '- ' + sessions.length + ' sessions', '- ' + treeNodes.length + ' tree nodes'],
            right: ['247420 / mmxxvi', '- static sample data']
        })
    });
}

const { render } = mountKit({ root, view: App, screen: 'gm inspector' });
