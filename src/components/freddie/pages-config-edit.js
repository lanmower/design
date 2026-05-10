import * as webjsx from '../../../vendor/webjsx/index.js';
import { Panel, Hero, Kpi, Form, Table } from '../content.js';
import { Chip } from '../shell.js';
import { renderConfigSections } from './helpers.js';
const h = webjsx.createElement;

const KNOWN_FIELDS = [
    { key: 'display.skin', label: 'skin', kind: 'skin' },
    { key: 'display.tool_progress_command', label: 'tool progress command', kind: 'bool' },
    { key: 'display.background_process_notifications', label: 'bg notifications', kind: 'enum', options: ['all','errors','none'] },
    { key: 'agent.provider', label: 'agent provider', kind: 'string' },
    { key: 'agent.model', label: 'agent model', kind: 'string' },
    { key: 'agent.max_iterations', label: 'max iterations', kind: 'number' },
    { key: 'agent.fallback_model', label: 'fallback model', kind: 'string', nullable: true },
    { key: 'agent.save_trajectories', label: 'save trajectories', kind: 'bool' },
    { key: 'agent.model_preference', label: 'model preference (json array)', kind: 'json' },
    { key: 'memory.provider', label: 'memory provider', kind: 'string', nullable: true },
    { key: 'gateway.timeout', label: 'gateway timeout (s)', kind: 'number' },
    { key: 'terminal.cwd', label: 'terminal cwd', kind: 'string', nullable: true },
];

function getDot(o, p) { return p.split('.').reduce((c, k) => (c && k in c) ? c[k] : undefined, o); }

function commit(h0, key, value) {
    const prev = window.__fd_cfg_status = window.__fd_cfg_status || {};
    prev[key] = 'saving…';
    Promise.resolve(h0.pi.config.saveValue(key, value))
        .then(() => { prev[key] = 'saved ✓'; rerender(); setTimeout(() => { delete prev[key]; rerender(); }, 1500); })
        .catch(e => { prev[key] = 'err: ' + (e.message || e); rerender(); });
}

function rerender() { if (typeof window.__fd_nav === 'function') window.__fd_nav('config'); }

function editor(field, cur, defVal, h0, skins) {
    const status = (window.__fd_cfg_status || {})[field.key];
    let control;
    if (field.kind === 'skin') {
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

export async function config(h0) {
    const cfg = typeof h0.pi.config?.load === 'function' ? await h0.pi.config.load() : {};
    const defaults = await fetch('/api/config/defaults').then(r => r.json()).catch(() => ({}));
    const skins = await fetch('/api/skins').then(r => r.json()).catch(() => ['default']);
    const commands = typeof h0.pi.cli?.values === 'function' ? [...h0.pi.cli.values()] : [];
    const settingsPanel = Panel({ title: 'settings', count: KNOWN_FIELDS.length,
        children: KNOWN_FIELDS.map(f => editor(f, getDot(cfg, f.key), getDot(defaults, f.key), h0, skins)) });
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
        Kpi({ items: [[KNOWN_FIELDS.length,'editable'],[commands.length,'commands'],[cfg._config_version||0,'version'],[skins.length,'skins']] }),
        settingsPanel,
        rawForm,
        allRaw,
        cmds,
    ];
}
