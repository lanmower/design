// ContextPane — a compact right-hand context panel for the chat surface.
//
// Surfaces the current conversation's agent, model, working directory, and a
// live count of running tool calls in the in-flight turn. Built from the kit's
// Panel + Row primitives so it inherits the design tokens and rail semantics.
//
// Usage (consumer wires its own state):
//   ContextPane({ agent, model, cwd, toolCount, onSetCwd })
//
// Props:
//   agent     : display name of the active agent (string) or falsy for "none"
//   model     : model id/name (string) or falsy
//   cwd       : the chat working directory (string) or falsy for server default
//   toolCount : number of tool calls running in the current live turn (>=0)
//   usage     : OPTIONAL last-turn usage { inputTokens, outputTokens, costUsd, turns, durationMs }
//   session   : OPTIONAL session metadata { id, messages, startedAt } shown as a block
//   onSetCwd  : optional callback for the "set working directory" affordance
//
// No decorative glyphs — words + the kit's Icon SVGs only.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Panel, Row } from './content.js';
import { Btn } from './shell.js';

const h = webjsx.createElement;

function fmtTok(n) {
    if (n == null) return null;
    if (n < 1000) return String(n);
    if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'k';
    return (n / 1000000).toFixed(1) + 'M';
}

export function ContextPane({ agent, model, cwd, toolCount = 0, usage, session, onSetCwd } = {}) {
    const running = Number(toolCount) > 0;
    // Each Panel's children array is all-unkeyed (no key prop on any sibling),
    // so webjsx never sees a mixed keyed/unkeyed array here.
    const panels = [
        Panel({
            title: 'context',
            children: [
                Row({ title: 'agent', meta: agent || 'none' }),
                Row({ title: 'model', meta: model || '—' }),
                Row({
                    title: 'working dir',
                    sub: cwd || 'server default',
                    // Use the rail tone consistently with the GUI-wide semantics:
                    // green = active/ok. A default cwd carries no rail (neutral).
                    rail: cwd ? 'green' : null,
                }),
                Row({
                    title: 'running tools',
                    meta: running ? String(toolCount) : 'idle',
                    rail: running ? 'purple' : null,
                }),
            ],
        }),
    ];
    // Usage block: surface the last turn's token/cost/turn/duration so the
    // result event is no longer silently dropped.
    if (usage && (usage.inputTokens != null || usage.outputTokens != null || usage.costUsd != null)) {
        const tokRows = [];
        if (usage.inputTokens != null) tokRows.push(Row({ title: 'input', meta: fmtTok(usage.inputTokens) + ' tok' }));
        if (usage.outputTokens != null) tokRows.push(Row({ title: 'output', meta: fmtTok(usage.outputTokens) + ' tok' }));
        if (usage.costUsd != null) tokRows.push(Row({ title: 'cost', meta: '$' + usage.costUsd.toFixed(4) }));
        if (usage.turns != null) tokRows.push(Row({ title: 'turns', meta: String(usage.turns) }));
        if (usage.durationMs != null) tokRows.push(Row({ title: 'duration', meta: (usage.durationMs / 1000).toFixed(1) + 's' }));
        panels.push(Panel({ title: 'last turn', children: tokRows }));
    }
    return h('div', { class: 'ds-context' },
        ...panels,
        onSetCwd
            ? h('div', { class: 'ds-context-actions' },
                Btn({ onClick: onSetCwd, children: 'set working dir' }))
            : null,
    );
}
