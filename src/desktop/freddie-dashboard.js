const ROUTES = [
    { path: 'projects',  label: 'projects',  glyph: '◆' },
    { path: 'home',      label: 'home',      glyph: '⌂' },
    { path: 'chat',      label: 'chat',      glyph: '⌨' },
    { path: 'sessions',  label: 'sessions',  glyph: '✉' },
    { path: 'agents',    label: 'agents',    glyph: '◈' },
    { path: 'analytics', label: 'analytics', glyph: '◉' },
    { path: 'models',    label: 'models',    glyph: '◎' },
    { path: 'logs',      label: 'logs',      glyph: '☰' },
    { path: 'cron',      label: 'cron',      glyph: '◷' },
    { path: 'skills',    label: 'skills',    glyph: '◈' },
    { path: 'config',    label: 'config',    glyph: '⚙' },
    { path: 'env',       label: 'keys',      glyph: '⚿' },
    { path: 'tools',     label: 'tools',     glyph: '⚒' },
    { path: 'batch',     label: 'batch',     glyph: '⊞' },
    { path: 'gateway',   label: 'gateway',   glyph: '⇌' },
];

function el(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (const k of Object.keys(attrs)) {
        if (k === 'on' && attrs.on) for (const ev of Object.keys(attrs.on)) e.addEventListener(ev, attrs.on[ev]);
        else if (k === 'html') e.innerHTML = attrs.html;
        else if (k === 'text') e.textContent = attrs.text;
        else e.setAttribute(k, attrs[k]);
    }
    return e;
}

function ensureStyles() {
    if (document.getElementById('freddie-dashboard-style')) return;
    const s = document.createElement('style');
    s.id = 'freddie-dashboard-style';
    s.textContent = `
.fdash { display: flex; height: 100%; font-family: var(--ff-ui, Nunito, sans-serif); color: var(--ink, #1F1B16); }
.fdash-side { flex: 0 0 180px; background: var(--panel-1, #ECE6D5); border-right: 1px solid var(--panel-2, #DDD3BC); padding: 8px 0; overflow-y: auto; }
.fdash-nav { display: flex; flex-direction: column; gap: 2px; }
.fdash-nav button { text-align: left; padding: 6px 12px; background: transparent; color: inherit; border: 0; cursor: pointer; font-family: inherit; font-size: 12px; border-left: 4px solid transparent; }
.fdash-nav button:hover { background: var(--panel-hover, rgba(0,0,0,0.04)); }
.fdash-nav button.active { background: var(--panel-select, #C8E4CA); border-left-color: var(--panel-accent, #3F8A4A); font-weight: 600; }
.fdash-nav .glyph { display: inline-block; width: 16px; opacity: 0.7; font-family: var(--ff-mono, JetBrains Mono, monospace); }
.fdash-main { flex: 1; padding: 12px 16px; overflow: auto; min-width: 0; }
.fdash-h { font-size: 14px; font-weight: 700; margin: 0 0 8px; }
.fdash-kpi { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.fdash-kpi .k { background: var(--panel-2, #DDD3BC); padding: 6px 12px; border-radius: var(--r-1, 6px); min-width: 80px; }
.fdash-kpi .k .v { font-size: 18px; font-weight: 700; font-family: var(--ff-mono, JetBrains Mono, monospace); }
.fdash-kpi .k .l { font-size: 10px; opacity: 0.7; text-transform: uppercase; }
.fdash-panel { background: var(--panel-1, #ECE6D5); border-radius: var(--r-1, 6px); padding: 8px 12px; margin-bottom: 8px; }
.fdash-panel h3 { font-size: 12px; font-weight: 700; margin: 0 0 6px; opacity: 0.8; text-transform: uppercase; }
.fdash-panel pre { font-family: var(--ff-mono, JetBrains Mono, monospace); font-size: 11px; white-space: pre-wrap; word-break: break-all; margin: 0; max-height: 280px; overflow: auto; }
.fdash-panel table { width: 100%; border-collapse: collapse; font-size: 12px; }
.fdash-panel th, .fdash-panel td { padding: 4px 8px; text-align: left; border-bottom: 1px solid var(--panel-2, #DDD3BC); }
.fdash-panel th { font-weight: 600; opacity: 0.7; font-size: 10px; text-transform: uppercase; }
.fdash-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; }
.fdash-row .code { font-family: var(--ff-mono, JetBrains Mono, monospace); opacity: 0.6; }
.fdash-row .meta { margin-left: auto; opacity: 0.5; font-size: 11px; }
.fdash-form { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
.fdash-form input, .fdash-form textarea, .fdash-form select { font: inherit; padding: 4px 8px; border: 1px solid var(--panel-2, #DDD3BC); border-radius: var(--r-1, 6px); background: var(--panel-0, #F5F0E4); color: inherit; }
.fdash-form button { padding: 4px 12px; background: var(--panel-accent, #3F8A4A); color: #fff; border: 0; border-radius: var(--r-1, 6px); cursor: pointer; }
.fdash-form button.danger { background: #c44; }
.fdash-chip { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; margin: 2px; }
.fdash-chip.ok { background: var(--panel-select, #C8E4CA); }
.fdash-chip.miss { background: var(--panel-2, #DDD3BC); opacity: 0.6; }
.fdash-empty { padding: 20px; text-align: center; opacity: 0.5; font-size: 12px; }
@media (max-width: 600px) { .fdash-side { flex: 0 0 56px; } .fdash-nav button .label { display: none; } }
`;
    document.head.appendChild(s);
}

function kpi(items) {
    const c = el('div', 'fdash-kpi');
    for (const [v, l] of items) {
        const k = el('div', 'k');
        k.appendChild(el('div', 'v', { text: String(v) }));
        k.appendChild(el('div', 'l', { text: String(l) }));
        c.appendChild(k);
    }
    return c;
}

function panel(title, body, count) {
    const p = el('div', 'fdash-panel');
    const h = el('h3'); h.textContent = title + (count != null ? ' · ' + count : '');
    p.appendChild(h);
    if (body instanceof Node) p.appendChild(body);
    else if (Array.isArray(body)) for (const n of body) if (n) p.appendChild(n);
    else if (typeof body === 'string') { const pre = el('pre'); pre.textContent = body; p.appendChild(pre); }
    return p;
}

function row(opts) {
    const r = el('div', 'fdash-row');
    if (opts.code) r.appendChild(el('span', 'code', { text: opts.code }));
    r.appendChild(el('span', 'title', { text: opts.title || '' }));
    if (opts.sub) r.appendChild(el('span', 'sub', { text: ' — ' + opts.sub }));
    if (opts.meta) r.appendChild(el('span', 'meta', { text: opts.meta }));
    return r;
}

function table(headers, rows) {
    const t = el('table');
    const thead = el('thead'); const trh = el('tr');
    for (const h of headers) trh.appendChild(el('th', null, { text: h }));
    thead.appendChild(trh); t.appendChild(thead);
    const tb = el('tbody');
    for (const r of rows) {
        const tr = el('tr');
        for (const c of r) tr.appendChild(el('td', null, { text: String(c) }));
        tb.appendChild(tr);
    }
    t.appendChild(tb);
    return t;
}

function pre(obj) { return el('pre', null, { text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }); }

export function createFreddieDashboard({ instance, bootHost }) {
    ensureStyles();
    const root = el('div', 'fdash');
    const side = el('div', 'fdash-side');
    const nav = el('div', 'fdash-nav');
    const main = el('div', 'fdash-main');
    side.appendChild(nav);
    root.appendChild(side); root.appendChild(main);

    let active = 'home';
    let host = instance.host || null;

    function setActive(p) {
        active = p;
        for (const b of nav.querySelectorAll('button')) b.classList.toggle('active', b.dataset.path === p);
        render();
    }

    for (const r of ROUTES) {
        const b = el('button', null, { 'data-path': r.path, on: { click: () => setActive(r.path) } });
        b.appendChild(el('span', 'glyph', { text: r.glyph }));
        b.appendChild(document.createTextNode(' '));
        b.appendChild(el('span', 'label', { text: r.label }));
        nav.appendChild(b);
    }

    async function ensureHost() {
        if (host) return host;
        if (typeof bootHost !== 'function') throw new Error('createFreddieDashboard: instance.host or bootHost required');
        host = instance.host = await bootHost({ fs: instance.fs });
        return host;
    }

    async function render() {
        main.innerHTML = '';
        main.appendChild(el('h2', 'fdash-h', { text: 'freddie · ' + instance.id + ' · ' + active }));
        const h = await ensureHost();
        const page = PAGES[active] || PAGES.home;
        try {
            const body = await page(h, instance);
            const arr = Array.isArray(body) ? body : [body];
            for (const n of arr) if (n) main.appendChild(n);
        } catch (e) {
            main.appendChild(panel('error', el('pre', null, { text: String(e && e.stack || e) })));
        }
    }

    const PAGES = {
        async projects(h) {
            const list = h.pi.projects.list();
            const active = h.pi.projects.active();
            const form = el('form', 'fdash-form', { on: { submit: (ev) => {
                ev.preventDefault();
                try { h.pi.projects.create({ name: ev.target.elements.name.value, path: ev.target.elements.path.value }); render(); }
                catch (e) { alert(e.message); }
            } } });
            form.appendChild(el('input', null, { name: 'name', placeholder: 'project name', required: 'true' }));
            form.appendChild(el('input', null, { name: 'path', placeholder: '/path' }));
            form.appendChild(el('button', null, { type: 'submit', text: 'add' }));
            const rows = list.map(p => {
                const r = el('div', 'fdash-row');
                r.appendChild(el('span', 'code', { text: p.name === active?.name ? '●' : '○' }));
                r.appendChild(el('span', null, { text: p.name + (p.name === active?.name ? '  (active)' : '') }));
                r.appendChild(el('span', 'meta', { text: p.path }));
                if (p.name !== 'default') {
                    const del = el('button', null, { type: 'button', text: 'remove', on: { click: () => { try { h.pi.projects.remove(p.name); render(); } catch (e) { alert(e.message); } } } });
                    r.appendChild(del);
                }
                if (p.name !== active?.name) {
                    const sw = el('button', null, { type: 'button', text: 'switch', on: { click: () => { h.pi.projects.setActive(p.name); render(); } } });
                    r.appendChild(sw);
                }
                return r;
            });
            return [
                kpi([[list.length, 'projects'], [active?.name || '—', 'active'], [active?.path || '—', 'path']]),
                panel('add a project', form),
                panel('all projects', rows, list.length),
            ];
        },
        async home(h) {
            const sessions = await h.pi.sessions.list();
            const tools = h.pi.tools.size;
            const skills = h.pi.skills.size;
            const health = h.pi.health();
            return [
                kpi([[sessions.length, 'sessions'], [tools, 'tools'], [skills, 'skills']]),
                panel('quick start', table(['action', 'how'], [
                    ['open chat', "click 'chat' in sidebar"],
                    ['list tools', '/tools in chat or → tools tab'],
                    ['list skills', '/skills in chat or → skills tab'],
                    ['set api key', '→ keys tab → set ENV var'],
                ])),
                panel('host', table(['key', 'value'], Object.entries(health))),
            ];
        },
        async chat(h, instance) {
            const note = el('div', 'fdash-empty', { text: 'chat lives in its own thebird app — opening chat window…' });
            try {
                if (window.__debug?.shell?.openApp) window.__debug.shell.openApp('chat');
            } catch {}
            return [panel('chat', note), panel('cli surface', table(['command', 'description'], [...h.pi.cli.values()].map(c => [c.name, c.description])))];
        },
        async sessions(h) {
            const list = await h.pi.sessions.list();
            return [
                kpi([[list.length, 'total sessions']]),
                panel('recent sessions', list.length === 0
                    ? el('div', 'fdash-empty', { text: 'no sessions yet — start a chat' })
                    : table(['id', 'title', 'platform', 'model', 'turns'], list.map(s => [(s.id || '').slice(0, 8), s.title || '—', s.platform, s.model || '—', s.turn_count])), list.length),
            ];
        },
        async agents(h) {
            const a = await h.pi.agents();
            return [
                kpi([[a.count, 'active'], [a.turns, 'turns']]),
                panel('overview', table(['key', 'value'], [
                    ['total turns', String(a.turns)],
                    ['active session', a.active || '(none)'],
                    ['last activity', a.last_activity ? new Date(a.last_activity).toLocaleString() : '—'],
                ])),
            ];
        },
        async analytics(h) {
            const list = await h.pi.sessions.list();
            const tools = [...h.pi.tools.values()];
            const byPlatform = list.reduce((a, s) => { const k = s.platform || '?'; a[k] = (a[k] || 0) + 1; return a; }, {});
            const byModel = list.reduce((a, s) => { const k = s.model || '?'; a[k] = (a[k] || 0) + 1; return a; }, {});
            return [
                kpi([[list.length, 'sessions'], [tools.length, 'tools']]),
                panel('sessions by platform', Object.keys(byPlatform).length === 0 ? el('div', 'fdash-empty', { text: 'no data' }) : table(['platform', 'count'], Object.entries(byPlatform))),
                panel('sessions by model', Object.keys(byModel).length === 0 ? el('div', 'fdash-empty', { text: 'no data' }) : table(['model', 'count'], Object.entries(byModel))),
                panel('tools', table(['name', 'description'], tools.map(t => [t.name, (t.description || '').slice(0, 80)]))),
            ];
        },
        async models(h) {
            const cfg = h.pi.config.load();
            const agent = cfg.agent || {};
            const form = el('form', 'fdash-form', { on: { submit: (ev) => {
                ev.preventDefault();
                h.pi.config.saveValue('agent.provider', ev.target.elements.provider.value);
                h.pi.config.saveValue('agent.model', ev.target.elements.model.value);
                render();
            } } });
            form.appendChild(el('input', null, { name: 'provider', placeholder: 'provider', value: agent.provider || '' }));
            form.appendChild(el('input', null, { name: 'model', placeholder: 'model id', value: agent.model || '' }));
            form.appendChild(el('button', null, { type: 'submit', text: 'update' }));
            return [
                kpi([[agent.provider || '—', 'provider'], [agent.model || '—', 'model']]),
                panel('active model', table(['key', 'value'], [
                    ['provider', agent.provider || '(unset)'],
                    ['model', agent.model || '(unset)'],
                    ['max_iterations', String(agent.max_iterations || '—')],
                ])),
                panel('change model', form),
            ];
        },
        async logs(h) {
            const dbg = h.pi.debug();
            return [
                panel('host debug snapshot', pre(dbg)),
            ];
        },
        async cron(h) {
            const list = await h.pi.cron.list();
            const form = el('form', 'fdash-form', { on: { submit: async (ev) => {
                ev.preventDefault();
                try { await h.pi.cron.create({ cron: ev.target.elements.cron.value, prompt: ev.target.elements.prompt.value }); render(); }
                catch (e) { alert(e.message); }
            } } });
            form.appendChild(el('input', null, { name: 'cron', placeholder: '* * * * *', required: 'true' }));
            form.appendChild(el('input', null, { name: 'prompt', placeholder: 'prompt', required: 'true' }));
            form.appendChild(el('button', null, { type: 'submit', text: 'create' }));
            const tbl = list.length === 0
                ? el('div', 'fdash-empty', { text: 'no cron jobs' })
                : table(['id', 'cron', 'prompt', 'enabled'], list.map(j => [j.id, j.cron, (j.prompt || '').slice(0, 40), j.enabled ? 'yes' : 'no']));
            return [
                kpi([[list.length, 'cron jobs']]),
                panel('add job', form),
                panel('jobs', tbl, list.length),
            ];
        },
        async skills(h) {
            const list = [...h.pi.skills.values()];
            const byCat = list.reduce((a, s) => { (a[s.category || 'other'] = a[s.category || 'other'] || []).push(s); return a; }, {});
            const out = [kpi([[list.length, 'skills'], [Object.keys(byCat).length, 'categories']])];
            for (const [cat, ss] of Object.entries(byCat)) {
                out.push(panel(cat, table(['name', 'description'], ss.map(s => [s.shortName || s.name, (s.description || '').slice(0, 80)])), ss.length));
            }
            return out;
        },
        async config(h) {
            const cfg = h.pi.config.load();
            const profiles = h.pi.profiles.list();
            const commands = h.pi.commands.list();
            const form = el('form', 'fdash-form', { on: { submit: (ev) => {
                ev.preventDefault();
                let v = ev.target.elements.value.value;
                try { v = JSON.parse(v); } catch {}
                h.pi.config.saveValue(ev.target.elements.key.value, v);
                render();
            } } });
            form.appendChild(el('input', null, { name: 'key', placeholder: 'dotted.key', required: 'true' }));
            form.appendChild(el('input', null, { name: 'value', placeholder: 'value (json or string)', required: 'true' }));
            form.appendChild(el('button', null, { type: 'submit', text: 'save' }));
            return [
                kpi([[profiles.length, 'profiles'], [commands.length, 'commands'], [cfg._config_version || 0, 'config version']]),
                panel('set value', form),
                panel('commands', table(['name', 'category', 'description'], commands.map(c => [c.name, c.category, c.description])), commands.length),
                panel('active config', pre(cfg)),
            ];
        },
        async env(h) {
            const list = h.pi.env.list();
            const setCount = list.filter(k => k.set).length;
            const chips = el('div');
            for (const k of list) {
                const c = el('span', 'fdash-chip ' + (k.set ? 'ok' : 'miss'), { text: k.key + (k.set ? ' ✓' : '') });
                c.addEventListener('click', () => {
                    const v = prompt('set ' + k.key + ' (empty to unset):');
                    if (v == null) return;
                    h.pi.env.set(k.key, v);
                    render();
                });
                chips.appendChild(c);
            }
            return [
                kpi([[setCount, 'set'], [list.length - setCount, 'missing'], [list.length, 'total known']]),
                panel('environment variables (click to set/unset)', chips),
            ];
        },
        async tools(h) {
            const list = [...h.pi.tools.values()];
            return [
                kpi([[list.length, 'tools']]),
                panel('all tools', table(['name', 'description'], list.map(t => [t.name, (t.description || '').slice(0, 100)])), list.length),
            ];
        },
        async batch(h) {
            const out = el('div');
            const form = el('form', 'fdash-form', { on: { submit: async (ev) => {
                ev.preventDefault();
                const prompts = ev.target.elements.prompts.value.split('\n').map(s => s.trim()).filter(Boolean);
                if (!prompts.length) return;
                out.textContent = 'running…';
                try { const r = await h.pi.batch.run({ prompts, concurrency: Number(ev.target.elements.conc.value) || 4 });
                    out.innerHTML = ''; out.appendChild(pre(r));
                } catch (e) { out.textContent = 'error: ' + (e.message || e); }
            } } });
            const ta = el('textarea', null, { name: 'prompts', rows: '5', placeholder: 'one prompt per line' });
            form.appendChild(ta);
            form.appendChild(el('input', null, { name: 'conc', type: 'number', value: '4' }));
            form.appendChild(el('button', null, { type: 'submit', text: 'run' }));
            return [
                panel('run prompts', form),
                panel('results', out),
            ];
        },
        async gateway(h) {
            const platforms = h.pi.gateway.platforms();
            return [
                kpi([[platforms.length, 'platforms'], [platforms.filter(p => p.enabled).length, 'active']]),
                panel('platforms', table(['name', 'enabled', 'note'], platforms.map(p => [p.name, p.enabled ? 'yes' : 'no', p.note])), platforms.length),
            ];
        },
    };

    setActive('home');

    if (typeof window !== 'undefined') {
        window.__debug = window.__debug || {};
        window.__debug.instances = window.__debug.instances || {};
        window.__debug.instances[instance.id] = window.__debug.instances[instance.id] || {};
        window.__debug.instances[instance.id].dashboard = { root, routes: ROUTES.map(r => r.path), setActive, get active() { return active; } };
    }

    return { node: root, dispose() {} };
}
