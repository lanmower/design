import * as webjsx from 'webjsx';
import {
    PhaseWalk, TreeNode, BarRow, StatTile, StatsGrid, SubGrid,
    SessionRow, DevRow, LiveLog,
} from '../src/components/data-density.js';
import { Badge, Chip } from '../src/components/shell.js';

const h = webjsx.createElement;
const root = document.getElementById('root');

function section(title, ...children) {
    return h('section', {}, h('h2', {}, title), ...children);
}

function App() {
    return h('div', {},
        section('PhaseWalk',
            PhaseWalk({ reached: [true, true, true, false, false] }),
            h('div', { style: 'margin-top:16px' },
                PhaseWalk({ reached: [true, true, false, false, false], gapKinds: ['EMIT'] }))),

        section('TreeNode',
            TreeNode({ ts: '12:04:01', kind: 'phase', variant: 'phase', phase: 'EXECUTE', id: 'sess-19' }),
            TreeNode({ ts: '12:04:12', kind: 'deviation', variant: 'deviation', deviationLabel: 'complete-chain-poll', reason: 're-polled instruction on a terminal chain', residuals: ['stale watcher', 'orphaned mutable'] }),
            TreeNode({ ts: '12:04:20', kind: 'mutable-resolve', variant: 'mutable-resolve', keyLabel: 'shell.js:69' }),
            TreeNode({ ts: '12:04:33', kind: 'prd-add', variant: 'prd-add', id: 'livelog-component' })),

        section('BarRow',
            BarRow({ label: 'rs-plugkit', value: '412', pct: 82, tone: 'var(--accent-ink)' }),
            BarRow({ label: 'gm-log', value: '655', pct: 64, tone: 'var(--success)' }),
            BarRow({ label: 'deviations', value: '5', pct: 8, tone: 'var(--warn)' })),

        section('StatTile / StatsGrid',
            StatsGrid({ items: [
                { val: '413670', lbl: 'events' },
                { val: '70', lbl: 'recall dispatches' },
                { val: '220ms', lbl: 'avg latency' },
                { val: '1956', lbl: 'recall_count sum' },
            ] }),
            h('div', { style: 'margin-top:12px;display:flex;gap:24px' },
                StatTile({ val: '98.4%', lbl: 'success rate', cls: 'rate-big' }),
                StatTile({ val: '1.6%', lbl: 'error rate', cls: 'err-rate' })),
            h('div', { style: 'margin-top:12px' }, StatsGrid({ items: [] }))),

        section('SubGrid',
            SubGrid({ items: [
                { count: 12, label: 'rs-learn' },
                { count: 4, label: 'rs-plugkit' },
                { count: 31, label: 'gm-log' },
            ] }),
            h('div', { style: 'margin-top:12px' }, SubGrid({ items: [] }))),

        section('SessionRow',
            SessionRow({
                sessId: 'sess-9f3a7c21e8d4b6', events: 214, verbs: 37, prd: 12, muts: 3, resid: 1,
                deviations: 2, firstTs: '11:58:02', lastTs: '12:07:44',
                phaseWalkProps: { reached: [true, true, true, true, false] },
            }),
            SessionRow({
                sessId: 'sess-0021a', events: 40, verbs: 8, prd: 5, muts: 0, resid: 0,
                deviations: 0, firstTs: '10:12:00', lastTs: '10:14:31',
                phaseWalkProps: { reached: [true, true, true, true, true] },
            })),

        section('DevRow',
            DevRow({ ts: '12:04:12', event: 'complete-chain-poll', sess: 'sess-19', operation: 'instruction', residuals: ['stale watcher'] })),

        section('LiveLog',
            LiveLog({ entries: [
                { ts: '12:04:01', sub: 'rs-learn', tone: 'var(--accent-ink)', event: 'recall', preview: '{"hit":true,"score":0.44}' },
                { ts: '12:04:02', sub: 'plugkit', tone: 'var(--success)', event: 'dispatch', preview: '{"verb":"recall","ms":220}' },
                { ts: '12:04:03', sub: 'gm-log', tone: 'var(--warn)', event: 'deviation', preview: '{"kind":"complete-chain-poll"}' },
            ] }, ),
            h('div', { style: 'margin-top:12px' }, LiveLog({ entries: [] }))),

        section('Badge / Chip tones',
            h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' },
                Badge({ children: 'green', tone: 'green' }),
                Badge({ children: 'blue', tone: 'blue' }),
                Badge({ children: 'orange', tone: 'orange' }),
                Badge({ children: 'yellow', tone: 'yellow' }),
                Badge({ children: 'purple', tone: 'purple' }),
                Badge({ children: 'error', tone: 'error' })),
            h('div', { style: 'margin-top:8px;display:flex;gap:6px;flex-wrap:wrap' },
                Chip({ children: 'blue', tone: 'blue' }),
                Chip({ children: 'orange', tone: 'orange' }),
                Chip({ children: 'yellow', tone: 'yellow' }),
                h('span', { class: 'ds-pill' }, 'plain pill'))),
    );
}

webjsx.applyDiff(root, App());
window.__dataDensityMounted = true;
