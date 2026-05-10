import * as webjsx from '../../../vendor/webjsx/index.js';
import { Panel, Row, Hero, Receipt, Kpi, Table, Form } from '../content.js';
import { Chip } from '../shell.js';
import { EmptyState } from '../files.js';
import { skillLabel, renderConfigSections } from './helpers.js';
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
        else if (ms && ms.length > 0) probedPanels.push(Panel({ title: p.name + (p.available ? ' ●' : ' ○'), count: ms.length, children: Table({ headers: ['model id'], rows: ms.map(m => [m]) }) }));
        else unprobedRows.push([p.name, p.available ? 'available' : 'unavailable', p.modelsError ? 'error: '+p.modelsError : 'click "probe all"']);
    }
    const modelPanels = [
        ...probedPanels,
        unprobedRows.length ? Panel({ title: 'unprobed providers', count: unprobedRows.length, children: Table({ headers: ['provider','status','note'], rows: unprobedRows }) }) : null
    ].filter(Boolean);
    return [
        Hero({ title: 'models', body: 'pick a provider, pick a model. probe to list available models.', accent: configured.length+' configured' }),
        Kpi({ items: [[configured.length,'configured'],[providers.filter(p => p.available).length,'available']] }),
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
        Kpi({ items: [[list.length,'jobs']] }),
        Panel({ title: 'add job', children: Form({ fields: [
            { name: 'cron', placeholder: '* * * * *', required: true },
            { name: 'prompt', placeholder: 'prompt', required: true }
        ], submit: 'create', onSubmit: async ev => { await h0.pi.cron.create({ cron: ev.target.elements.cron.value, prompt: ev.target.elements.prompt.value }); } }) }),
        Panel({ title: 'jobs', count: list.length, children: list.length === 0 ? EmptyState({ text: 'no cron jobs', glyph: '◷' }) : Table({ headers: ['id','cron','prompt','enabled'], rows: list.map(j => [j.id, j.cron, (j.prompt||'').slice(0,40), j.enabled ? 'yes' : 'no']) }) })
    ];
}

export async function skills(h0) {
    const list = [...h0.pi.skills.values()];
    const byCat = list.reduce((a, s) => { (a[s.category||'other'] = a[s.category||'other'] || []).push(s); return a; }, {});
    return [
        Hero({ title: 'skills', body: 'SKILL.md bundles loaded from ~/.freddie/skills + plugins.', accent: list.length+' loaded' }),
        Kpi({ items: [[list.length,'skills'],[Object.keys(byCat).length,'categories']] }),
        list.length === 0 ? EmptyState({ text: 'no skills — add SKILL.md files to ~/.freddie/skills/', glyph: '◈' }) : null,
        ...Object.entries(byCat).map(([cat, ss]) => Panel({ title: cat, count: ss.length, children: Table({ headers: ['name','description'], rows: ss.map(s => [skillLabel(s), (s.description||'').slice(0,120)]) }) }))
    ].filter(Boolean);
}

export async function config(h0) {
    const cfg = typeof h0.pi.config?.load === 'function' ? await h0.pi.config.load() : {};
    const commands = typeof h0.pi.cli?.values === 'function' ? [...h0.pi.cli.values()] : [];
    return [
        Hero({ title: 'config', body: 'live ~/.freddie/config.yaml. dotted keys, json or string values.', accent: 'v'+(cfg._config_version||0) }),
        Kpi({ items: [[commands.length,'commands'],[cfg._config_version||0,'config version']] }),
        Panel({ title: 'set config value', children: Form({ fields: [
            { name: 'key', placeholder: 'dotted.key', required: true },
            { name: 'value', placeholder: 'value (json or string)', required: true }
        ], submit: 'save', onSubmit: async ev => {
            let v = ev.target.elements.value.value;
            try { v = JSON.parse(v); } catch {}
            await h0.pi.config.saveValue(ev.target.elements.key.value, v);
        } }) }),
        Panel({ title: 'commands', count: commands.length, children: Table({ headers: ['name','description'], rows: commands.map(c => [c.name, c.description||'']) }) }),
        ...renderConfigSections(cfg)
    ];
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
    const bySet = list.reduce((a, t) => { (a[t.toolset||'core'] = a[t.toolset||'core'] || []).push(t); return a; }, {});
    return [
        Hero({ title: 'tools', body: 'every tool the agent can call. param count + required env per row.', accent: list.length+' tools' }),
        Kpi({ items: [[list.length,'tools'],[Object.keys(bySet).length,'toolsets']] }),
        ...Object.entries(bySet).map(([ts, items]) => Panel({ title: 'toolset · '+ts, count: items.length, children: items.map(t => {
            const params = t.schema?.parameters?.properties ? Object.keys(t.schema.parameters.properties).length : 0;
            const reqEnv = Array.isArray(t.requiresEnv) ? t.requiresEnv : [];
            const meta = h('span', { class: 'fd-tool-meta' },
                params > 0 ? Chip({ tone: 'neutral', children: params+' params' }) : null,
                ...reqEnv.map(k => Chip({ tone: envIsSet(k) ? 'ok' : 'miss', children: k }))
            );
            return Row({ key: t.name, code: '⚒', title: t.name, sub: (t.description || (t.schema && t.schema.description) || '').slice(0,80), meta });
        }) }))
    ];
}

export async function batch(h0) {
    const results = window.__fd_batchResults = window.__fd_batchResults || [];
    const status = window.__fd_batchStatus = window.__fd_batchStatus || { running: false, error: null };
    const onSubmit = async ev => {
        const prompts = ev.target.elements.prompts.value.split('\n').map(s => s.trim()).filter(Boolean);
        if (!prompts.length) return;
        status.running = true; status.error = null; window.__fd_batchResults = [];
        if (typeof window.__fd_nav === 'function') window.__fd_nav('batch');
        try {
            const r = await h0.pi.batch.run(prompts, Number(ev.target.elements.concurrency.value) || 4);
            const arr = Array.isArray(r) ? r : (r && typeof r === 'object' ? Object.entries(r).map(([k, v]) => ({ prompt: k, result: v })) : []);
            window.__fd_batchResults = arr;
        } catch (e) { status.error = e.message || String(e); }
        status.running = false;
        if (typeof window.__fd_nav === 'function') window.__fd_nav('batch');
    };
    const resPanel = status.running ? Panel({ title: 'results', children: h('span', {}, 'running…') })
        : status.error ? Panel({ title: 'results', children: h('span', { class: 'fd-muted' }, 'error: '+status.error) })
        : results.length === 0 ? Panel({ title: 'results', children: EmptyState({ text: 'no results yet', glyph: '⊞' }) })
        : Panel({ title: 'results', count: results.length, children: Table({ headers: ['#','prompt','result','status'], rows: results.map((it, i) => [String(i+1), (it.prompt||'').slice(0,60), (it.result||it.error||'').slice(0,120), it.error ? 'error' : 'ok']) }) });
    return [
        Hero({ title: 'batch', body: 'run many prompts in parallel. one per line.', accent: results.length ? results.length+' results' : 'idle' }),
        Panel({ title: 'run batch', children: Form({ fields: [
            { name: 'prompts', kind: 'textarea', placeholder: 'one prompt per line', rows: 6 },
            { name: 'concurrency', type: 'number', value: '4' }
        ], submit: 'run', onSubmit }) }),
        resPanel
    ];
}

export async function gateway(h0) {
    const platforms = typeof h0.pi.gateway?.platforms === 'function' ? h0.pi.gateway.platforms() : [];
    const active = platforms.filter(p => p.enabled);
    const envIsSet = k => typeof h0.pi.env?.isSet === 'function' ? h0.pi.env.isSet(k) : false;
    return [
        Hero({ title: 'gateway', body: 'webhook + bot platforms. each adapter declares required env keys.', accent: active.length+' / '+platforms.length+' active' }),
        Kpi({ items: [[platforms.length,'platforms'],[active.length,'active']] }),
        Panel({ title: 'platforms', count: platforms.length, right: active.length > 0 ? Chip({ tone: 'ok', children: active.length+' active' }) : Chip({ tone: 'miss', children: 'none active' }),
            children: platforms.length === 0 ? EmptyState({ text: 'no platforms registered', glyph: '⇌' }) : platforms.map(p => {
                const reqEnv = Array.isArray(p.requiresEnv) ? p.requiresEnv : [];
                const setN = reqEnv.filter(envIsSet).length;
                const envSummary = reqEnv.length === 0 ? '' : setN === reqEnv.length ? '✓ env ready' : 'missing '+(reqEnv.length-setN)+' / '+reqEnv.length;
                return Row({ key: p.name, code: p.enabled ? '●' : '○', title: p.name, sub: p.note || '', meta: [p.enabled ? 'enabled' : '', envSummary].filter(Boolean).join(' · ') });
            })
        })
    ];
}
