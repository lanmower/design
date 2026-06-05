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
//   onSetCwd  : optional callback for the "set working directory" affordance
//
// No decorative glyphs — words + the kit's Icon SVGs only.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Panel, Row } from './content.js';
import { Btn } from './shell.js';

const h = webjsx.createElement;

export function ContextPane({ agent, model, cwd, toolCount = 0, onSetCwd } = {}) {
    const running = Number(toolCount) > 0;
    // Each Panel's children array is all-unkeyed (no key prop on any sibling),
    // so webjsx never sees a mixed keyed/unkeyed array here.
    return h('div', { class: 'ds-context' },
        Panel({
            title: 'context',
            children: [
                Row({ title: 'agent', meta: agent || 'none' }),
                Row({ title: 'model', meta: model || '—' }),
                Row({
                    title: 'working dir',
                    sub: cwd || 'server default',
                    rail: cwd ? 'green' : null,
                }),
                Row({
                    title: 'running tools',
                    meta: running ? String(toolCount) : 'idle',
                    rail: running ? 'purple' : null,
                }),
            ],
        }),
        onSetCwd
            ? h('div', { class: 'ds-context-actions' },
                Btn({ onClick: onSetCwd, children: 'set working dir' }))
            : null,
    );
}
