import * as webjsx from '../../../vendor/webjsx/index.js';
import { Panel, Hero, Kpi, Form, Table } from '../content.js';
import { Chip } from '../shell.js';
import { renderConfigSections } from './helpers.js';
const h = webjsx.createElement;

const KNOWN_FIELDS = [
    { key: 'display.skin', label: 'skin', kind: 'skin' },
    { key: 'display.tool_progress_command', label: 'tool progress command', kind: 'bool' },
    { key: 'display.background_process_notifications', label: 'bg notifications', kind: 'enum', options: ['all','errors','none'] },
    { key: 'providers.freddie.baseUrl', label: 'freddie URL (thebird → freddie)', kind: 'string', nullable: true },
    { key: 'providers.openai.baseUrl', label: 'acptoapi URL (freddie → acptoapi)', kind: 'string', nullable: true },
    { key: 'providers.openai.model', label: 'default LLM model', kind: 'string', nullable: true },
    { key: 'agent.provider', label: 'agent provider', kind: 'string' },
    { key: 'agent.model', label: 'agent model', kind: 'modelDropdown' },
    { key: 'agent.max_iterations', label: 'max iterations', kind: 'number' },
    { key: 'agent.fallback_model', label: 'fallback model', kind: 'string', nullable: true },
    { key: 'agent.save_trajectories', label: 'save trajectories', kind: 'bool' },
    { key: 'agent.model_preference', label: 'model preference (json array)', kind: 'json' },
    { key: 'memory.provider', label: 'memory provider', kind: 'string', nullable: true },
    { key: 'gateway.timeout', label: 'gateway timeout (s)', kind: 'number' },
    { key: 'terminal.cwd', label: 'terminal cwd', kind: 'string', nullable: true },
];

function getDot(o, p) { return p.split('.').reduce((c, k) => (c && k in c) ? c[k] : undefined, o); }

function registerPicker(key, modelCount) {
    const reg = window.__fd_modelPickers = window.__fd_modelPickers || {};
    reg[key] = { key, modelCount, mountedAt: Date.now() };
    if (typeof window !== 'undefined') {
        window.__debug = window.__debug || {};
        window.__debug.modelPickers = () => Object.values(window.__fd_modelPickers || {});
    }
}

function commit(h0, key, value) {
    const prev = window.__fd_cfg_status = window.__fd_cfg_status || {};
    prev[key] = 'saving…';
    Promise.resolve(h0.pi.config.saveValue(key, value))
        .then(() => { prev[key] = 'saved ✓'; rerender(); setTimeout(() => { delete prev[key]; rerender(); }, 1500); })
        .catch(e => { prev[key] = 'err: ' + (e.message || e); rerender(); });
}

function rerender() { if (typeof window.__fd_nav === 'function') window.__fd_nav('config'); }

function editor(field, cur, defVal, h0, skins, v1Models, sampler) {
    const status = (window.__fd_cfg_status || {})[field.key];
    let control;
    if (field.kind === 'modelDropdown') {
        const models = Array.isArray(v1Models) ? v1Models : [];
        const grouped = models.reduce((a, m) => { const idx = String(m.id || '').indexOf('/'); const g = idx > 0 ? m.id.slice(0, idx) : (m.owned_by || 'other'); (a[g] = a[g] || []).push(m); return a; }, {});
        const samplerStatus = sampler && sampler.status ? sampler.status : {};
        const isUnavailable = id => { const s = samplerStatus[id]; return s && s.available === false; };
        control = h('select', { onchange: ev => commit(h0, field.key, ev.target.value === '' && field.nullable ? null : ev.target.value) },
            h('option', { value: '', selected: !cur ? 'true' : null }, '— auto —'),
            ...Object.entries(grouped).map(([g, ms]) => h('optgroup', { label: g + ' · ' + ms.length },
                ...ms.map(m => h('option', { value: m.id, selected: cur === m.id ? 'true' : null, disabled: isUnavailable(m.id) ? 'true' : null }, m.id + (isUnavailable(m.id) ? ' ✕' : ''))))));
        registerPicker(field.key, models.length);
    } else if (field.kind === 'skin') {
        const list = skins.length ? skins : ['default'];
        control = h('select', { onchange: ev => commit(h0, field.key, ev.target.value) },
            ...list.map(s => h('option', { value: s, selected: s === cur ? 'true' : null }, s)));
    } else if (field.kind === 'bool') {
        control = h('select', { onchange: ev => commit(h0, field.key, ev.target.value === 'true') },
            h('option', { value: 'false', selected: !cur ? 'true' : null }, 'false'),
            h('option', { value: 'true', selected: cur ? 'true' : null }, 'true'));
    } else if (field.kind === 'enum') {
        control = h('select', { onchange: ev => commit(h0, field.key, ev.target.value) },
            ...field.options.map(o => h('option', { value: o, selected: o === cur ? 'true' : null }, o)));
    } else if (field.kind === 'number') {
        control = h('input', { type: 'number', value: cur == null ? '' : String(cur),
            onchange: ev => commit(h0, field.key, ev.target.value === '' ? null : Number(ev.target.value)) });
    } else if (field.kind === 'json') {
        const text = cur == null ? '[]' : JSON.stringify(cur);
        control = h('input', { type: 'text', value: text, placeholder: '[] or [{"provider":"…"}]',
            onchange: ev => { try { commit(h0, field.key, JSON.parse(ev.target.value || 'null')); } catch (e) { (window.__fd_cfg_status = window.__fd_cfg_status || {})[field.key] = 'invalid json'; rerender(); } } });
    } else {
        control = h('input', { type: 'text', value: cur == null ? '' : String(cur), placeholder: field.nullable ? '(empty = unset)' : '',
            onchange: ev => commit(h0, field.key, ev.target.value === '' && field.nullable ? null : ev.target.value) });
    }
    const isDefault = JSON.stringify(cur) === JSON.stringify(defVal);
    const meta = h('span', { class: 'fd-cfg-meta' },
        status ? Chip({ tone: status.startsWith('err') || status === 'invalid json' ? 'miss' : status === 'saved ✓' ? 'ok' : 'warn', children: status }) : null,
        !isDefault && defVal !== undefined ? h('span', { class: 'fd-muted', title: 'default: ' + JSON.stringify(defVal) }, ' default: ' + (defVal === '' ? '""' : JSON.stringify(defVal))) : null);
    return h('div', { class: 'fd-cfg-row', key: field.key },
        h('label', { class: 'fd-cfg-label' }, field.label, h('code', { class: 'fd-cfg-key' }, field.key)),
        h('div', { class: 'fd-cfg-control' }, control, meta));
}

function prefRow(h0, idx, pref, providers, cached, total) {
    const provider = pref.provider || '';
    const model = pref.model || '';
    const models = (cached[provider] && cached[provider].models) || [];
    const onProv = ev => { const list = getPrefList(); list[idx] = { ...list[idx], provider: ev.target.value, model: '' }; commit(h0, 'agent.model_preference', list); };
    const onModel = ev => { const list = getPrefList(); list[idx] = { ...list[idx], model: ev.target.value }; commit(h0, 'agent.model_preference', list); };
    const onMove = dir => { const list = getPrefList(); const j = idx + dir; if (j < 0 || j >= list.length) return; const t = list[idx]; list[idx] = list[j]; list[j] = t; commit(h0, 'agent.model_preference', list); };
    const onDel = () => { const list = getPrefList(); list.splice(idx, 1); commit(h0, 'agent.model_preference', list); };
    return h('div', { class: 'fd-cfg-row', key: 'pref-' + idx, 'data-idx': idx },
        h('label', { class: 'fd-cfg-label' }, '#' + (idx+1) + ' / ' + total),
        h('div', { class: 'fd-cfg-control' },
            h('select', { onchange: onProv },
                h('option', { value: '' }, '(select provider)'),
                ...providers.map(p => h('option', { value: p, selected: p === provider ? 'true' : null }, p))),
            models.length > 0
                ? h('select', { onchange: onModel },
                    h('option', { value: '' }, '(any/default)'),
                    ...models.map(m => h('option', { value: m, selected: m === model ? 'true' : null }, m)))
                : h('input', { type: 'text', placeholder: 'model (run discover for dropdown)', value: model, onchange: onModel }),
            h('button', { class: 'btn', onclick: ev => { ev.preventDefault(); onMove(-1); } }, '↑'),
            h('button', { class: 'btn', onclick: ev => { ev.preventDefault(); onMove(1); } }, '↓'),
            h('button', { class: 'btn', onclick: ev => { ev.preventDefault(); onDel(); } }, '✕')));
}

function getPrefList() {
    return (window.__fd_cfg_pref || []).slice();
}

function modelPrefPanel(h0, cfg, providers, cached) {
    const list = Array.isArray(cfg?.agent?.model_preference) ? cfg.agent.model_preference : [];
    window.__fd_cfg_pref = list.slice();
    const rows = list.map((p, i) => prefRow(h0, i, p, providers, cached, list.length));
    const addBtn = h('button', { class: 'btn-primary', onclick: ev => { ev.preventDefault(); const next = getPrefList(); next.push({ provider: '', model: '' }); commit(h0, 'agent.model_preference', next); } }, '+ add row');
    const discoverBtn = h('button', { class: 'btn', onclick: async ev => {
        ev.preventDefault();
        (window.__fd_cfg_status = window.__fd_cfg_status || {})['agent.discovered_models'] = 'discovering…'; rerender();
        try { await fetch('/api/models/discover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); window.__fd_cfg_status['agent.discovered_models'] = 'discovered ✓'; }
        catch (e) { window.__fd_cfg_status['agent.discovered_models'] = 'err: ' + (e.message || e); }
        rerender();
    } }, 'discover models');
    const status = (window.__fd_cfg_status || {})['agent.discovered_models'];
    return Panel({ title: 'model preference (ordered fallback chain)', count: list.length,
        right: h('span', {}, discoverBtn, ' ', addBtn, status ? Chip({ tone: status.startsWith('err') ? 'miss' : status === 'discovered ✓' ? 'ok' : 'warn', children: status }) : null),
        children: list.length === 0
            ? h('div', { class: 'fd-muted' }, 'no preferences — first available provider key will be used. add a row to override.')
            : h('div', { class: 'fd-cfg-prefs' }, ...rows) });
}

export async function config(h0) {
    const cfg = typeof h0.pi.config?.load === 'function' ? await h0.pi.config.load() : {};
    const defaults = await fetch('/api/config/defaults').then(r => r.json()).catch(() => ({}));
    const skins = await fetch('/api/skins').then(r => r.json()).catch(() => ['default']);
    const provInfo = await fetch('/api/models/providers').then(r => r.json()).catch(() => ({ providers: [] }));
    const cached = await fetch('/api/models/cached').then(r => r.json()).catch(() => ({}));
    const v1Models = await fetch('/v1/models').then(r => r.json()).then(j => j.data || []).catch(() => []);
    const sampler = await fetch('/api/models/sampler').then(r => r.json()).catch(() => ({ status: {} }));
    const commands = typeof h0.pi.cli?.values === 'function' ? [...h0.pi.cli.values()] : [];
    const settingsPanel = Panel({ title: 'settings', count: KNOWN_FIELDS.length,
        children: KNOWN_FIELDS.filter(f => f.key !== 'agent.model_preference').map(f => editor(f, getDot(cfg, f.key), getDot(defaults, f.key), h0, skins, v1Models, sampler)) });
    const prefPanel = modelPrefPanel(h0, cfg, provInfo.providers || [], cached || {});
    const rawForm = Panel({ title: 'set arbitrary key (power-user)', children: Form({ fields: [
        { name: 'key', placeholder: 'dotted.key', required: true },
        { name: 'value', placeholder: 'value (json or string)', required: true }
    ], submit: 'save', onSubmit: async ev => {
        let v = ev.target.elements.value.value;
        try { v = JSON.parse(v); } catch {}
        await h0.pi.config.saveValue(ev.target.elements.key.value, v);
        rerender();
    } }) });
    const allRaw = h('details', { class: 'fd-cfg-details' },
        h('summary', {}, 'all config (read-only)'),
        ...renderConfigSections(cfg));
    const cmds = h('details', { class: 'fd-cfg-details' },
        h('summary', {}, 'commands · ' + commands.length),
        Table({ headers: ['name','description'], rows: commands.map(c => [c.name, c.description||'']) }));
    return [
        Hero({ title: 'config', body: 'inline editors for known keys. raw setter is the fallback.', accent: 'v'+(cfg._config_version||0) }),
        Kpi({ items: [[KNOWN_FIELDS.length,'editable'],[(cfg?.agent?.model_preference||[]).length,'pref-rows'],[commands.length,'commands'],[cfg._config_version||0,'version']] }),
        settingsPanel,
        prefPanel,
        rawForm,
        allRaw,
        cmds,
    ];
}
