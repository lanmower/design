import * as webjsx from 'webjsx';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see ui_kits/aicat/app.js for the measured rationale (200+ serial
// unbundled module requests when every kit pulls the full 30+-submodule
// barrel).
import { Topbar, Crumb, Side, Status, AppShell, Heading, Lede, Chip, Pill } from 'ds/components/shell.js';
import { Panel } from 'ds/components/content.js';
import {
    Pager, JsonViewer, ToolbarRow, PropertyGrid, PropertyGridRow, PropertyField, InlineEditableField,
    Grid, GridItem, Collapse, CollapseGroup, Divider
} from 'ds/components/editor-primitives.js';
import { ContextMeter, ContextTreemap, ContextXRayPanel } from 'ds/components/context-pane.js';
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

// Which state the three data surfaces (sessions / process tree / deviations)
// render in. Driven by the sidebar "store state" group so each one is a real
// reachable surface — an inspector that only ever draws a populated store has
// not shown what it looks like when the store is cold or unreachable.
const storeState = { phase: 'ready' };
const STORE_PHASES = ['ready', 'loading', 'empty', 'error'];

// Row-shaped shimmer. Reuses .ds-event-row-skeleton + .ds-skel* from
// app-shell/files.css — SessionRow/TreeNode/DevRow all share the same
// leading-mark / title / trailing-meta rhythm the primitive was cut for.
function RowSkeleton(n, prefix) {
    return h('div', {},
        ...Array.from({ length: n }, (_, i) => h('div', { key: prefix + i, class: 'ds-event-row-skeleton' },
            h('span', { class: 'ds-skel ds-skel-rank' }),
            h('span', { class: 'ds-skel ds-skel-title' }),
            h('span', { class: 'ds-skel ds-skel-meta' })
        ))
    );
}

function StoreError(what, detail, hint) {
    return h('div', { class: 'ds-alert ds-alert-error' },
        h('span', { class: 'ds-alert-icon' }, '!'),
        h('div', { class: 'ds-alert-content' },
            h('div', { class: 'ds-alert-title' }, what),
            h('div', { class: 'ds-alert-message' }, detail),
            h('div', { class: 'ds-alert-retry' },
                h('button', { class: 'btn', onclick: () => { storeState.phase = 'ready'; render(); } }, hint)
            )
        )
    );
}

function StoreEmpty(msg, hint) {
    return h('div', { class: 'ds-empty-state' },
        h('div', { class: 'ds-empty-state-glyph' }, '[ ]'),
        h('p', { class: 'ds-empty-state-msg' }, msg),
        h('p', { class: 'ds-empty-state-hint' }, hint)
    );
}

// Context-window budget for the currently-inspected session (sess-de201aa3,
// the one with the most events/verbs of the sample set) -- gm_inspector's
// whole purpose is inspecting a system whose core resource is context window
// usage, but until now it rendered no context/token-budget view at all.
const CONTEXT_TOTAL = 200000;
const contextSegments = [
    { id: 'system', label: 'system prompt + tools', value: 18400, tone: 'system' },
    { id: 'history', label: 'conversation history',  value: 96200, tone: 'user' },
    { id: 'output',  label: 'assistant output',       value: 41300, tone: 'assistant' },
    { id: 'other',   label: 'tool results + misc',    value: 12700, tone: 'other' }
];
const contextUsed = contextSegments.reduce((sum, s) => sum + s.value, 0);
const contextXrayState = { openId: 'history' };
const contextXraySegments = contextSegments.map((s) => ({
    ...s,
    items: {
        system:    [{ label: 'AGENTS.md / SKILL.md', value: 11200 }, { label: 'component API tool schemas', value: 7200 }],
        history:   [{ label: 'earlier turns (compacted)', value: 71000 }, { label: 'recent turns (full)', value: 25200 }],
        assistant: [{ label: 'code edits', value: 28900 }, { label: 'prose responses', value: 12400 }],
        other:     [{ label: 'browser/exec_js output', value: 9100 }, { label: 'file reads', value: 3600 }]
    }[s.id]
}));

const liveEntries = [
    { ts: '11:03:40', sub: 'plugkit', tone: 'var(--accent)', event: 'phase.transitioned', preview: 'phase=COMPLETE' },
    { ts: '11:03:41', sub: 'rs_learn', tone: 'var(--sun)', event: 'recall', preview: 'query="gm inspector kit" hit=true score=0.61' },
    { ts: '11:03:42', sub: 'hook', tone: 'var(--success)', event: 'dispatch.end', preview: 'verb=git_finalize ms=166' }
];

const countFor = (arr) => (storeState.phase === 'ready' ? arr.length : 0);

function SessionsBody() {
    const p = storeState.phase;
    if (p === 'loading') return RowSkeleton(5, 'sk-sess-');
    if (p === 'error') return StoreError(
        'session store unreachable',
        'the plugkit event store at ~/.gm/events.jsonl could not be opened -- the file is held by another writer. no session can be listed until that lock clears.',
        'retry read'
    );
    if (p === 'empty') return StoreEmpty(
        'no sessions recorded yet',
        'a session appears here the moment a gm chain dispatches its first verb. run `gm` in any repo on this machine and refresh.'
    );
    return h('div', { class: 'ds-scroll-x' }, ...sessions.map((s, i) => h('div', { key: 'sr' + i }, SessionRow(s))));
}

function TreeBody() {
    const p = storeState.phase;
    if (p === 'loading') return RowSkeleton(4, 'sk-tree-');
    if (p === 'error') return StoreError(
        'tree truncated mid-read',
        'the event log ends in a partial record, so the walk after 09:44 cannot be trusted and is withheld. the earlier nodes parsed cleanly.',
        'reparse log'
    );
    if (p === 'empty') return StoreEmpty(
        'no nodes for this session',
        'phase transitions, prd edits and deviations appear here in dispatch order. pick a session with events on the left.'
    );
    return h('div', { class: 'ds-scroll-x' }, ...treeNodes.map((n, i) => h('div', { key: 'tn' + i }, TreeNode(n))));
}

function DevBody() {
    const p = storeState.phase;
    if (p === 'loading') return RowSkeleton(2, 'sk-dev-');
    if (p === 'error') return StoreError(
        'deviation scan incomplete',
        'the gate-decision index is a version behind the event log, so a deviation landed after the last scan would be missed. showing nothing beats showing a false all-clear.',
        'rescan'
    );
    if (p === 'empty') return StoreEmpty(
        'no deviations on this walk',
        'this is the good outcome -- every dispatch cleared its admission gate. a denied gate or an unwitnessed edit would be listed here.'
    );
    return h('div', {}, ...deviations.map((d, i) => h('div', { key: 'dv' + i }, DevRow(d))));
}

function App() {
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'gm inspector', items: [['index', '../../'], ['docs', '../docs/'], ['source', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'gm_inspector' }),
        side: Side({
            sections: [
                // Every entry anchors to the panel it names. These were inert
                // rows styled exactly like working nav. The counts now track
                // storeState like the panel headings do, so the sidebar cannot
                // claim 5 sessions while the sessions panel draws its empty state.
                { group: 'views', items: [
                    { glyph: '*', label: 'overview',     count: kpis.length,          key: 'o', href: '#p-overview' },
                    { glyph: '-', label: 'sessions',     count: countFor(sessions),   key: 's', href: '#p-sessions' },
                    { glyph: '-', label: 'process tree', count: countFor(treeNodes),  key: 't', href: '#p-tree' },
                    { glyph: '-', label: 'deviations',   count: countFor(deviations), key: 'd', href: '#p-deviations' },
                    { glyph: '-', label: 'context budget', count: contextSegments.length, key: 'x', href: '#p-context' }
                ] },
                // Phase is a READOUT of where the inspected walk ended, not a
                // control — there is no other phase to switch to. It anchors to
                // the overview panel that carries the same summary rather than
                // sitting there as an anchor that goes nowhere.
                { group: 'phase', items: [
                    { glyph: h('span', { class: 'ds-dot ds-dot-on' }), label: 'COMPLETE', count: '5/5', key: 'p', color: 'var(--success)', href: '#p-overview' }
                ] },
                // Reachable state switcher for the three data surfaces above.
                { group: 'store state', items: STORE_PHASES.map((s) => ({
                    glyph: h('span', { class: storeState.phase === s ? 'ds-dot ds-dot-on' : 'ds-dot ds-dot-off' }),
                    label: s, key: 'st-' + s, active: storeState.phase === s, href: '#' + s,
                    onClick: (e) => { e.preventDefault(); storeState.phase = s; render(); }
                })) }
            ]
        }),
        main: [
            h('div', { class: 'ds-app-surface ds-section-pad' },
                Heading({ level: 1, children: 'gm inspector' }),
                Lede({ children: 'session list, process tree, deviations, live stream -- the data-density component family (PhaseWalk, TreeNode, BarRow, StatsGrid, SessionRow, DevRow, LiveLog) composed into one observability surface.' }),
                Panel({ id: 'p-overview', title: 'overview', count: kpis.length, class: 'ds-panel-gap', children: StatsGrid({ items: kpis }) }),
                Panel({ id: 'p-sessions', title: 'sessions', count: countFor(sessions), class: 'ds-panel-gap', children: SessionsBody() }),
                h('div', { class: 'ds-panel-duo' },
                    Panel({ id: 'p-tree', title: 'process tree', count: countFor(treeNodes), children: TreeBody() }),
                    Panel({ id: 'p-deviations', title: 'deviations', count: countFor(deviations), children: DevBody() })
                ),
                Panel({ title: 'recall score histogram', class: 'ds-panel-gap', children: h('div', {},
                    BarRow({ label: '0.5-0.6', value: '12', pct: 40, tone: 'var(--accent)' }),
                    BarRow({ label: '0.6-0.7', value: '31', pct: 100, tone: 'var(--accent)' }),
                    BarRow({ label: '0.7-0.8', value: '18', pct: 58, tone: 'var(--accent)' }),
                    BarRow({ label: '0.8-0.9', value: '6',  pct: 19, tone: 'var(--accent)' })
                ) }),
                Panel({ id: 'p-context', title: 'context budget · sess-de201aa3', class: 'ds-panel-gap', children: h('div', {},
                    ContextMeter({ used: contextUsed, total: CONTEXT_TOTAL, segments: contextSegments }),
                    h('div', { class: 'ds-panel-duo' },
                        h('div', {},
                            h('p', { class: 'ds-stat-lbl' }, 'breakdown (treemap, area = token share):'),
                            ContextTreemap({ items: contextSegments, width: 320, height: 180 })
                        ),
                        h('div', {},
                            h('p', { class: 'ds-stat-lbl' }, 'x-ray (live, click a segment to expand):'),
                            ContextXRayPanel({
                                segments: contextXraySegments,
                                openId: contextXrayState.openId,
                                onOpenIdChange: (id) => { contextXrayState.openId = id; render(); },
                            })
                        )
                    )
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
            left: ['gm inspector', '- ' + countFor(sessions) + ' sessions', '- ' + countFor(treeNodes) + ' tree nodes', '- store ' + storeState.phase],
            right: ['247420 / mmxxvi', '- static sample data']
        })
    });
}

const { render } = mountKit({ root, view: App, screen: 'gm inspector' });
