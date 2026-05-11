import * as webjsx from '../../../vendor/webjsx/index.js';
import { Panel, Hero, Kpi, Form } from '../content.js';
import { Chip } from '../shell.js';
import { EmptyState } from '../files.js';
const h = webjsx.createElement;

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
        : Panel({ title: 'results', count: results.length, children: h('div', { class: 'fd-list' }, ...results.map((it, i) => h('div', { key: i, class: 'fd-list-row', 'data-cat': it.error ? 'external' : 'kit' },
            h('span', { class: 'fd-list-code' }, String(i+1).padStart(2,'0')),
            h('div', { class: 'fd-list-main' },
                h('div', { class: 'fd-list-title' }, (it.prompt||'').slice(0,80)),
                h('div', { class: 'fd-list-sub' }, (it.result||it.error||'').slice(0,160))
            ),
            h('div', { class: 'fd-list-meta' }, h('span', { class: 'fd-list-meta-mono' }, it.error ? 'error' : 'ok'))
        ))) });
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
            children: platforms.length === 0 ? EmptyState({ text: 'no platforms registered', glyph: '⇌' }) : h('div', { class: 'fd-list' }, ...platforms.map(p => {
                const reqEnv = Array.isArray(p.requiresEnv) ? p.requiresEnv : [];
                const setN = reqEnv.filter(envIsSet).length;
                const envSummary = reqEnv.length === 0 ? '' : setN === reqEnv.length ? '✓ env ready' : 'missing '+(reqEnv.length-setN)+' / '+reqEnv.length;
                return h('div', { key: p.name, class: 'fd-list-row', 'data-cat': p.enabled ? 'kit' : 'external' },
                    h('span', { class: 'fd-list-code' }, p.enabled ? '●' : '○'),
                    h('div', { class: 'fd-list-main' },
                        h('div', { class: 'fd-list-title' }, p.name),
                        h('div', { class: 'fd-list-sub' }, p.note || '—')
                    ),
                    h('div', { class: 'fd-list-meta' },
                        h('span', { class: 'fd-list-meta-mono' }, p.enabled ? 'enabled' : 'disabled'),
                        envSummary ? h('span', { class: 'fd-list-meta-rel' }, envSummary) : null
                    ));
            }))
        })
    ];
}
