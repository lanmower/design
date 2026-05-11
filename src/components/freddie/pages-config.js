import * as webjsx from '../../../vendor/webjsx/index.js';
import { Panel, Hero, Receipt, Kpi, Table, Form } from '../content.js';
import { Chip } from '../shell.js';
import { EmptyState } from '../files.js';
import { skillLabel } from './helpers.js';
const h = webjsx.createElement;

export async function models(h0) {
    const cfg = typeof h0.pi.config?.load === 'function' ? await h0.pi.config.load() : {};
    const providers = await fetch('/api/providers').then(r => r.json()).catch(() => []);
    const configured = providers.filter(p => p.configured);
    const probeState = window.__fd_probeState = window.__fd_probeState || {};
    async function probeAll() {
        await Promise.allSettled(configured.map(async p => {
            probeState[p.name] = 'loading';
            try { const r = await fetch('/api/providers/'+p.name+'/probe', { method: 'POST' }).then(x => x.json()); probeState[p.name] = r.models || r.error || '?'; }
            catch (e) { probeState[p.name] = 'error: '+e.message; }
        }));
        if (typeof window.__fd_nav === 'function') window.__fd_nav('models');
    }
    const probedPanels = [];
    const unprobedRows = [];
    for (const p of configured) {
        const ms = Array.isArray(probeState[p.name]) ? probeState[p.name] : p.models;
        const loading = probeState[p.name] === 'loading';
        if (loading) probedPanels.push(Panel({ title: p.name + ' ⏳', children: h('span', { class: 'fd-muted' }, 'probing…') }));
        else if (ms && ms.length > 0) probedPanels.push(Panel({ title: p.name + (p.available ? ' ●' : ' ○'), count: ms.length, children: h('div', { class: 'fd-list fd-list-compact' }, ...ms.map((m, i) => h('div', { key: m, class: 'fd-list-row', 'data-cat': 'preview' },
            h('span', { class: 'fd-list-code' }, String(i+1).padStart(2,'0')),
            h('div', { class: 'fd-list-main' }, h('div', { class: 'fd-list-title fd-mono' }, m))
        ))) }));
        else unprobedRows.push([p.name, p.available ? 'available' : 'unavailable', p.modelsError ? 'error: '+p.modelsError : '—']);
    }
    const modelPanels = [
        ...probedPanels,
        unprobedRows.length ? Panel({ title: 'unprobed providers', count: unprobedRows.length, children: Table({ headers: ['provider','status','note'], rows: unprobedRows }) }) : null
    ].filter(Boolean);
    return [
        Hero({ title: 'models', body: 'pick a provider, pick a model. probe to list available models.', accent: configured.length+' configured' }),
        Kpi({ items: [[configured.length,'configured'],[probedPanels.length,'probed'],[providers.length-configured.length,'unconfigured']] }),
        Panel({ title: 'change active model', children: Form({ fields: [
            { name: 'provider', placeholder: 'provider', value: cfg.agent?.provider || '' },
            { name: 'model', placeholder: 'model id', value: cfg.agent?.model || '' }
        ], submit: 'update', onSubmit: async ev => {
            await h0.pi.config.saveValue('agent.provider', ev.target.elements.provider.value);
            await h0.pi.config.saveValue('agent.model', ev.target.elements.model.value);
        } }) }),
        Panel({ title: 'providers', right: h('button', { class: 'btn-primary', onclick: ev => { ev.preventDefault(); probeAll(); } }, 'probe all'),
            children: h('div', { class: 'fd-chips' }, ...providers.map(p => Chip({ tone: p.configured ? (p.available ? 'ok' : 'warn') : 'miss', children: p.name + (p.configured ? (p.available ? ' ●' : ' ○') : ' ·') })))
        }),
        ...modelPanels
    ];
}

export async function cron(h0) {
    const list = await h0.pi.cron.list();
    return [
        Hero({ title: 'cron', body: 'scheduled prompts. cron syntax, fired by freddie.', accent: list.length+' jobs' }),
        Kpi({ items: [[list.length,'jobs'],[list.filter(j => j.enabled).length,'enabled']] }),
        Panel({ title: 'add job', children: Form({ fields: [
            { name: 'cron', placeholder: '0 * * * *  (m h dom mon dow)', required: true },
            { name: 'prompt', placeholder: 'prompt to run', required: true }
        ], submit: 'create', onSubmit: async ev => { await h0.pi.cron.create({ cron: ev.target.elements.cron.value, prompt: ev.target.elements.prompt.value }); if (typeof window.__fd_nav === 'function') window.__fd_nav('cron'); } }) }),
        Panel({ title: 'cron syntax', children: Receipt({ rows: [
            ['every minute', '* * * * *'],
            ['every hour (top)', '0 * * * *'],
            ['daily 09:00', '0 9 * * *'],
            ['weekdays 18:00', '0 18 * * 1-5'],
            ['every 15 min', '*/15 * * * *']
        ] }) }),
        Panel({ title: 'jobs', count: list.length, children: list.length === 0
            ? EmptyState({ text: 'no cron jobs — add one with the form above', glyph: '◷' })
            : h('div', { class: 'fd-list' }, ...list.map(j => h('div', { key: j.id, class: 'fd-list-row', 'data-cat': j.enabled ? 'kit' : 'external' },
                h('span', { class: 'fd-list-code' }, j.enabled ? '●' : '○'),
                h('div', { class: 'fd-list-main' },
                    h('div', { class: 'fd-list-title' }, (j.prompt||'(no prompt)').slice(0,80)),
                    h('div', { class: 'fd-list-sub' }, j.cron + ' · ' + j.id)
                ),
                h('div', { class: 'fd-list-meta' }, h('span', { class: 'fd-list-meta-mono' }, j.enabled ? 'enabled' : 'disabled'))
            ))) })
    ];
}

export async function skills(h0) {
    const list = [...h0.pi.skills.values()];
    const byCat = list.reduce((a, s) => { (a[s.category||'other'] = a[s.category||'other'] || []).push(s); return a; }, {});
    return [
        Hero({ title: 'skills', body: 'SKILL.md bundles loaded from ~/.freddie/skills + plugins.', accent: list.length+' loaded' }),
        Kpi({ items: [[list.length,'skills'],[Object.keys(byCat).length,'categories']] }),
        list.length === 0 ? EmptyState({ text: 'no skills — add SKILL.md files to ~/.freddie/skills/', glyph: '◈' }) : null,
        ...Object.entries(byCat).map(([cat, ss]) => Panel({ title: cat, count: ss.length, children: h('div', { class: 'fd-list' }, ...ss.map((s, i) => h('div', { key: s.name, class: 'fd-list-row', 'data-cat': cat === 'creative' ? 'preview' : cat === 'software-development' ? 'kit' : cat === 'planning' ? 'doc' : cat === 'ops' ? 'external' : 'doc' },
            h('span', { class: 'fd-list-code' }, String(i+1).padStart(2,'0')),
            h('div', { class: 'fd-list-main' },
                h('div', { class: 'fd-list-title' }, skillLabel(s)),
                s.description ? h('div', { class: 'fd-list-sub' }, (s.description||'').slice(0,140)) : null
            )
        ))) }))
    ].filter(Boolean);
}

export async function env(h0) {
    const list = typeof h0.pi.env?.list === 'function' ? h0.pi.env.list() : [];
    const setCount = list.filter(k => k.set).length;
    const groups = {};
    for (const k of list) {
        const idx = k.key.indexOf('_');
        const g = idx > 0 ? k.key.slice(0, idx) : 'OTHER';
        (groups[g] = groups[g] || []).push(k);
    }
    const sortedGroups = Object.entries(groups).sort((a,b) => b[1].length - a[1].length);
    return [
        Hero({ title: 'keys', body: 'env vars freddie reads. grouped by service prefix. click a chip to set.', accent: setCount+' / '+list.length+' set' }),
        Kpi({ items: [[setCount,'set'],[list.length-setCount,'missing'],[list.length,'total'],[sortedGroups.length,'groups']] }),
        list.length === 0 ? EmptyState({ text: 'no env keys registered', glyph: '⚿' }) : null,
        ...sortedGroups.map(([g, keys]) => {
            const setN = keys.filter(k => k.set).length;
            return Panel({ title: g.toLowerCase(), count: keys.length, right: setN === keys.length ? Chip({ tone: 'ok', children: 'all set' }) : setN === 0 ? Chip({ tone: 'miss', children: 'none set' }) : Chip({ tone: 'warn', children: setN+'/'+keys.length }),
                children: h('div', { class: 'fd-chips' }, ...keys.map(k => h('span', { key: k.key, onclick: () => { const v = prompt('set '+k.key+' (empty to unset):'); if (v == null) return; if (typeof h0.pi.env.set === 'function') { h0.pi.env.set(k.key, v); } }, class: 'fd-chip-wrap' }, Chip({ tone: k.set ? 'ok' : 'miss', children: k.key + (k.set ? ' ✓' : ' ·') }))))
            });
        })
    ].filter(Boolean);
}

export async function tools(h0) {
    const list = [...h0.pi.tools.values()];
    const envIsSet = k => typeof h0.pi.env?.isSet === 'function' ? h0.pi.env.isSet(k) : false;
    const f = window.__fd_toolFilter = window.__fd_toolFilter || { q: '' };
    const q = (f.q || '').toLowerCase();
    const filtered = q ? list.filter(t => (t.name||'').toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q) || (t.toolset||'').toLowerCase().includes(q)) : list;
    const bySet = filtered.reduce((a, t) => { (a[t.toolset||'core'] = a[t.toolset||'core'] || []).push(t); return a; }, {});
    const search = h('input', { type: 'search', placeholder: 'filter tools…', value: f.q, oninput: ev => { f.q = ev.target.value; if (typeof window.__fd_nav === 'function') window.__fd_nav('tools'); }, class: 'fd-search' });
    return [
        Hero({ title: 'tools', body: 'every tool the agent can call. param count + required env per row.', accent: list.length+' tools' }),
        Kpi({ items: [[list.length,'tools'],[filtered.length,'shown'],[Object.keys(bySet).length,'toolsets']] }),
        Panel({ title: 'filter', right: search, children: filtered.length === 0 ? EmptyState({ text: 'no matches for "'+f.q+'"', glyph: '⌕' }) : h('span', { class: 'fd-muted' }, filtered.length+' / '+list.length+' tools shown') }),
        ...Object.entries(bySet).map(([ts, items]) => Panel({ title: 'toolset · '+ts, count: items.length, children: h('div', { class: 'fd-list' }, ...items.map(t => {
            const params = t.schema?.parameters?.properties ? Object.keys(t.schema.parameters.properties).length : 0;
            const reqEnv = Array.isArray(t.requiresEnv) ? t.requiresEnv : [];
            return h('div', { key: t.name, class: 'fd-list-row', 'data-cat': 'kit' },
                h('span', { class: 'fd-list-code' }, '⚒'),
                h('div', { class: 'fd-list-main' },
                    h('div', { class: 'fd-list-title fd-mono' }, t.name),
                    h('div', { class: 'fd-list-sub' }, (t.description || (t.schema && t.schema.description) || '').slice(0,120))
                ),
                h('div', { class: 'fd-list-meta' },
                    params > 0 ? Chip({ tone: 'neutral', children: params+' params' }) : null,
                    ...reqEnv.map(k => Chip({ tone: envIsSet(k) ? 'ok' : 'miss', children: k }))
                ));
        })) }))
    ];
}

