// Chain editor — talks to freddie's /api/acptoapi/* bridge (which proxies
// to acptoapi /v1/chains). Renders builtins read-only and runtime chains
// fully editable. Used by both freddie's dashboard and thebird via the
// FREDDIE_PAGES registry.
import * as webjsx from '../../../vendor/webjsx/index.js';
import { Panel, Hero, Kpi, Form } from '../content.js';
import { Chip } from '../shell.js';
import { EmptyState } from '../files.js';
const h = webjsx.createElement;

async function fetchJson(url, init) {
    const r = await fetch(url, init);
    const ct = r.headers.get('content-type') || '';
    const body = ct.includes('json') ? await r.json() : await r.text();
    if (!r.ok) throw new Error(typeof body === 'string' ? body : (body.error?.message || JSON.stringify(body)));
    return body;
}

async function loadChains() {
    return await fetchJson('/api/acptoapi/chains');
}

async function saveChain(name, links) {
    return await fetchJson('/api/acptoapi/chains', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, links }),
    });
}

async function deleteChain(name) {
    return await fetchJson('/api/acptoapi/chains/' + encodeURIComponent(name), { method: 'DELETE' });
}

async function fetchProbe() {
    try { return await fetchJson('/api/acptoapi/probe'); }
    catch { return { results: [] }; }
}

export async function chains(h0) {
    // State stored on window to survive page-level re-renders
    const state = window.__fd_chains = window.__fd_chains || {
        loaded: false, error: null, chains: {}, builtin: [], runtime: [],
        probe: [], editing: null, draft: { name: '', links: [] }, newLink: '',
    };

    if (!state.loaded) {
        try {
            const cd = await loadChains();
            state.chains = cd.chains || {};
            state.builtin = cd.builtin || [];
            state.runtime = cd.runtime || [];
            const pl = await fetchProbe();
            state.probe = pl.results || [];
            state.loaded = true;
        } catch (e) {
            state.error = e.message;
            state.loaded = true;
        }
    }

    const nav = () => { if (typeof window.__fd_nav === 'function') window.__fd_nav('chains'); };

    const onEdit = (name) => () => {
        state.editing = name;
        state.draft = { name, links: [...(state.chains[name] || [])] };
        nav();
    };
    const onCancel = () => { state.editing = null; state.draft = { name: '', links: [] }; nav(); };
    const onNew = () => { state.editing = '__new__'; state.draft = { name: '', links: [] }; nav(); };
    const onAddLink = () => {
        if (!state.newLink.trim()) return;
        state.draft.links.push(state.newLink.trim());
        state.newLink = '';
        nav();
    };
    const onRemoveLink = (idx) => () => { state.draft.links.splice(idx, 1); nav(); };
    const onSave = async () => {
        try {
            await saveChain(state.draft.name.trim(), state.draft.links);
            state.loaded = false; state.editing = null;
            nav();
        } catch (e) { state.error = e.message; nav(); }
    };
    const onDelete = (name) => async () => {
        if (state.builtin.includes(name)) return;
        try { await deleteChain(name); state.loaded = false; nav(); }
        catch (e) { state.error = e.message; nav(); }
    };

    if (state.error && !state.loaded) {
        return [Hero({ title: 'chains', body: 'fallback chain editor', accent: 'error' }),
            Panel({ title: 'error', children: h('span', { class: 'fd-muted' }, state.error) })];
    }

    if (state.editing) {
        const isNew = state.editing === '__new__';
        const isBuiltin = !isNew && state.builtin.includes(state.editing);
        return [
            Hero({ title: isNew ? 'new chain' : 'edit ' + state.editing, body: 'links are tried top-to-bottom', accent: isBuiltin ? 'builtin read-only' : 'editable' }),
            Panel({ title: 'name', children: isNew
                ? h('input', { class: 'fd-input', value: state.draft.name, oninput: e => { state.draft.name = e.target.value; } })
                : h('code', {}, state.draft.name) }),
            Panel({ title: 'links', count: state.draft.links.length,
                children: state.draft.links.length === 0
                    ? EmptyState({ text: 'no links yet — add one below', glyph: '↳' })
                    : h('div', { class: 'fd-list' }, ...state.draft.links.map((link, i) =>
                        h('div', { key: i, class: 'fd-list-row', 'data-cat': 'kit' },
                            h('span', { class: 'fd-list-code' }, String(i + 1).padStart(2, '0')),
                            h('div', { class: 'fd-list-main' }, h('div', { class: 'fd-list-title' }, link)),
                            isBuiltin ? null : h('button', { class: 'fd-btn fd-btn-mini', onclick: onRemoveLink(i) }, 'remove')
                        )
                    )) }),
            isBuiltin ? null : Panel({ title: 'add link', children: h('div', { class: 'fd-form-row' },
                h('input', { class: 'fd-input', placeholder: 'provider/model (e.g. groq/llama-3.3-70b-versatile)',
                    value: state.newLink, oninput: e => { state.newLink = e.target.value; } }),
                h('button', { class: 'fd-btn', onclick: onAddLink }, 'add')
            ) }),
            Panel({ title: 'actions', children: h('div', { class: 'fd-form-row' },
                isBuiltin ? null : h('button', { class: 'fd-btn fd-btn-primary', onclick: onSave }, isNew ? 'create' : 'save'),
                h('button', { class: 'fd-btn', onclick: onCancel }, 'cancel')
            ) }),
        ];
    }

    const allNames = Object.keys(state.chains).sort();
    const builtinCount = state.builtin.length;
    const runtimeCount = state.runtime.length;
    const workingModels = state.probe.length;

    return [
        Hero({ title: 'chains', body: 'named fallback chains. callers send model=<name> to select one.', accent: allNames.length + ' total' }),
        Kpi({ items: [[builtinCount, 'builtin'], [runtimeCount, 'runtime'], [workingModels, 'working models']] }),
        Panel({ title: 'create', children: h('button', { class: 'fd-btn fd-btn-primary', onclick: onNew }, '+ new chain') }),
        Panel({ title: 'chains', count: allNames.length,
            children: allNames.length === 0
                ? EmptyState({ text: 'no chains configured', glyph: '⊞' })
                : h('div', { class: 'fd-list' }, ...allNames.map(name => {
                    const links = state.chains[name] || [];
                    const isBuiltin = state.builtin.includes(name);
                    return h('div', { key: name, class: 'fd-list-row', 'data-cat': isBuiltin ? 'external' : 'kit' },
                        h('span', { class: 'fd-list-code' }, isBuiltin ? '◆' : '○'),
                        h('div', { class: 'fd-list-main' },
                            h('div', { class: 'fd-list-title' }, name),
                            h('div', { class: 'fd-list-sub' }, links.slice(0, 3).join(' → ') + (links.length > 3 ? ` (+${links.length - 3})` : '')),
                        ),
                        h('div', { class: 'fd-list-meta' },
                            h('span', { class: 'fd-list-meta-mono' }, isBuiltin ? 'builtin' : 'runtime'),
                            h('button', { class: 'fd-btn fd-btn-mini', onclick: onEdit(name) }, isBuiltin ? 'view' : 'edit'),
                            isBuiltin ? null : h('button', { class: 'fd-btn fd-btn-mini', onclick: onDelete(name) }, 'delete'),
                        )
                    );
                })) }),
        Panel({ title: 'discovered models', count: workingModels,
            right: workingModels > 0 ? Chip({ tone: 'ok', children: 'fresh' }) : Chip({ tone: 'miss', children: 'no probe' }),
            children: workingModels === 0
                ? EmptyState({ text: 'run a probe to see working models', glyph: '✦' })
                : h('div', { class: 'fd-list' }, ...state.probe.slice(0, 12).map(m =>
                    h('div', { key: m.provider + '/' + m.model, class: 'fd-list-row', 'data-cat': 'kit' },
                        h('span', { class: 'fd-list-code' }, m.provider.slice(0, 3)),
                        h('div', { class: 'fd-list-main' },
                            h('div', { class: 'fd-list-title' }, m.provider + '/' + m.model),
                            h('div', { class: 'fd-list-sub' }, m.ms + 'ms')
                        )
                    )
                )) }),
    ];
}
