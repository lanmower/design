import * as webjsx from '../../vendor/webjsx/index.js';
import * as components from '../components.js';

const h = webjsx.createElement;
const {
    AppShell, Topbar, Side, Crumb, Status, Brand, Glyph,
    Panel, Row, RowLink, Hero, Receipt, Kpi, Table, Section,
    EmptyState, Chip,
} = components;

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

const OS_ROUTE_DEFS = [
    { path: 'os-instances', label: 'instances', glyph: '◫' },
    { path: 'os-windows',   label: 'windows',   glyph: '▭' },
    { path: 'os-x',         label: 'x-server',  glyph: '✕' },
    { path: 'os-fs',        label: 'fs',        glyph: '📁' },
];

function pre(obj) {
    return h('pre', { class: 'fd-pre' }, typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
}

function form(opts) {
    const { fields = [], submit = 'submit', onSubmit } = opts;
    return h('form', { class: 'row-form', onsubmit: (ev) => { ev.preventDefault(); onSubmit && onSubmit(ev); } },
        ...fields.map(f => f.kind === 'textarea'
            ? h('textarea', { name: f.name, placeholder: f.placeholder || '', rows: f.rows || 4 })
            : h('input', { name: f.name, type: f.type || 'text', placeholder: f.placeholder || '', value: f.value || '', required: f.required ? 'true' : null })),
        h('button', { type: 'submit', class: 'btn-primary' }, submit));
}

export function createFreddieDashboard({ instance, bootHost, osSurfaces }) {
    const root = document.createElement('div');
    root.className = 'app-fd ds-247420';
    root.style.cssText = 'height:100%;overflow:hidden;display:flex;flex-direction:column;';

    const state = {
        active: 'home',
        ts: new Date().toLocaleTimeString(),
        body: null,
        error: null,
    };
    let host = instance.host || null;

    const allRoutes = osSurfaces ? [...ROUTES, ...OS_ROUTE_DEFS] : ROUTES;

    async function ensureHost() {
        if (host) return host;
        if (typeof bootHost !== 'function') throw new Error('createFreddieDashboard: instance.host or bootHost required');
        host = instance.host = await bootHost({ fs: instance.fs });
        return host;
    }

    function setActive(p) {
        state.active = p;
        rerender();
    }

    function buildSide() {
        const sections = [{
            group: 'FREDDIE',
            items: ROUTES.map(r => ({
                glyph: r.glyph, label: r.label, href: '#fd-' + r.path,
                active: state.active === r.path,
                onClick: (ev) => { ev.preventDefault(); setActive(r.path); },
            })),
        }];
        if (osSurfaces) sections.push({
            group: 'OS',
            items: OS_ROUTE_DEFS.map(r => ({
                glyph: r.glyph, label: r.label, href: '#fd-' + r.path,
                active: state.active === r.path,
                onClick: (ev) => { ev.preventDefault(); setActive(r.path); },
            })),
        });
        return Side({ sections });
    }

    function view() {
        const route = allRoutes.find(r => r.path === state.active) || ROUTES[1];
        return AppShell({
            topbar: Topbar({ brand: 'freddie', leaf: 'dashboard', items: [], active: '' }),
            crumb: Crumb({ trail: ['freddie', instance.id], leaf: route.path, right: state.error ? Chip({ tone: 'miss', children: 'error' }) : Chip({ tone: 'ok', children: 'live' }) }),
            side: buildSide(),
            main: state.body || EmptyState({ text: 'loading…', glyph: '◌' }),
            status: Status({ left: ['ds-247420 · webjsx · ' + allRoutes.length + ' routes', 'instance=' + instance.id], right: [state.ts] }),
        });
    }

    function rerender() {
        webjsx.applyDiff(root, view());
        loadActive();
    }

    async function loadActive() {
        try {
            const h0 = await ensureHost();
            const page = PAGES[state.active] || PAGES.home;
            state.body = await page(h0, instance);
            state.error = null;
        } catch (e) {
            state.error = String(e && e.stack || e);
            state.body = Panel({ title: 'error', children: pre(state.error) });
        }
        state.ts = new Date().toLocaleTimeString();
        webjsx.applyDiff(root, view());
    }

    const PAGES = {
        async projects(h0) {
            const list = h0.pi.projects.list();
            const activeProj = (typeof h0.pi.projects.active === 'function') ? h0.pi.projects.active() : null;
            const rows = list.map(p => Row({
                key: p.name,
                code: p.name === activeProj?.name ? '●' : '○',
                title: p.name + (p.name === activeProj?.name ? '  (active)' : ''),
                meta: p.path,
                onClick: () => { if (p.name !== activeProj?.name) try { h0.pi.projects.setActive(p.name); rerender(); } catch (e) { alert(e.message); } },
            }));
            return [
                Hero({ title: 'projects', body: 'each project is its own ~/.freddie home: separate sessions, agents, skills, config, env, cron, batches.', accent: activeProj ? 'active · ' + activeProj.name : 'no active project' }),
                Kpi({ items: [[list.length, 'projects'], [activeProj?.name || '—', 'active'], [activeProj?.path?.length > 30 ? '…' + activeProj.path.slice(-28) : (activeProj?.path || '—'), 'path']] }),
                Panel({ title: 'add a project', children: form({
                    fields: [{ name: 'name', placeholder: 'project name', required: true }, { name: 'path', placeholder: '/abs/path' }],
                    submit: 'add',
                    onSubmit: (ev) => { try { h0.pi.projects.create({ name: ev.target.elements.name.value, path: ev.target.elements.path.value }); rerender(); } catch (e) { alert(e.message); } },
                }) }),
                Panel({ title: 'all projects', count: list.length, children: rows.length ? rows : EmptyState({ text: 'no projects', glyph: '◆' }) }),
                Panel({ title: 'how encapsulation works', children: Receipt({ rows: [
                    ['sessions db', '<project>/sessions.db'],
                    ['config', '<project>/config.json'],
                    ['skills', '<project>/skills/'],
                    ['plugins', '<project>/plugins/'],
                    ['cron', '<project>/cron.db'],
                    ['batches', '<project>/batches/'],
                    ['logs', '<project>/logs/'],
                    ['auth', '<project>/auth.json'],
                ] }) }),
            ];
        },
        async home(h0) {
            const sessions = await h0.pi.sessions.list();
            const tools = h0.pi.tools.size;
            const skills = h0.pi.skills.size;
            const health = (typeof h0.pi.health === 'function') ? h0.pi.health() : { ok: true };
            return [
                Hero({ title: 'freddie', body: 'open js agent harness — pi-mono · xstate · floosie · anentrypoint-design.', accent: h0.version || 'web' }),
                Kpi({ items: [[sessions.length, 'sessions'], [tools, 'tools'], [skills, 'skills']] }),
                Panel({ title: 'quick start', children: Receipt({ rows: [
                    ['open chat',   "click 'chat' in sidebar"],
                    ['list tools',  '/tools in chat → tools tab'],
                    ['list skills', '/skills → skills tab'],
                    ['set api key', 'keys tab → click chip'],
                    ['add cron',    'cron tab → form'],
                ] }) }),
                Panel({ title: 'host', children: Receipt({ rows: Object.entries(health).map(([k, v]) => [k, String(v)]) }) }),
            ];
        },
        async chat(h0) {
            const skills = [...h0.pi.skills.values()];
            const chatState = window.__fd_chatState = window.__fd_chatState || { cwd: 'C:/dev/penguins', skill: '', messages: [], busy: false };

            function renderMessages() {
                const container = root.querySelector('#fd-chat-msgs');
                if (!container) return;
                container.innerHTML = '';
                for (const m of chatState.messages) {
                    const el = document.createElement('div');
                    el.style.cssText = 'padding:6px 10px;border-bottom:1px solid rgba(128,128,128,0.15);white-space:pre-wrap;word-break:break-word;';
                    el.style.color = m.role === 'assistant' ? 'var(--color-accent,#7c9)' : 'inherit';
                    el.textContent = (m.role === 'assistant' ? '◈ ' : '▷ ') + m.content;
                    container.appendChild(el);
                }
                container.scrollTop = container.scrollHeight;
            }

            const msgs = h('div', { id: 'fd-chat-msgs', style: 'max-height:360px;overflow-y:auto;background:rgba(0,0,0,0.12);border-radius:4px;padding:4px;' });

            const sendChat = async (ev) => {
                ev.preventDefault();
                if (chatState.busy) return;
                const form = ev.target;
                const promptEl = form.elements.prompt;
                const prompt = promptEl.value.trim();
                if (!prompt) return;
                chatState.messages.push({ role: 'user', content: prompt });
                promptEl.value = '';
                chatState.busy = true;
                renderMessages();
                try {
                    const resp = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, cwd: chatState.cwd, skill: chatState.skill || undefined }) });
                    const text = await resp.text();
                    const lines = text.split('\n');
                    let content = '';
                    for (const line of lines) {
                        if (!line.startsWith('data:')) continue;
                        try {
                            const d = JSON.parse(line.slice(5).trim());
                            if (d.result) content = d.result;
                            if (d.content) content = (content ? content + '\n' : '') + d.content;
                        } catch {}
                    }
                    if (!content) content = text.slice(0, 500);
                    chatState.messages.push({ role: 'assistant', content: content || '(no response)' });
                } catch (e) {
                    chatState.messages.push({ role: 'assistant', content: 'error: ' + e.message });
                }
                chatState.busy = false;
                renderMessages();
            };

            setTimeout(renderMessages, 50);

            return [
                Panel({ title: 'chat', children: [
                    h('form', { class: 'row-form', style: 'display:flex;flex-direction:column;gap:8px;', onsubmit: sendChat },
                        h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;' },
                            h('input', { name: 'cwd', type: 'text', placeholder: 'working directory', value: chatState.cwd, style: 'flex:2;', oninput: (ev) => { chatState.cwd = ev.target.value; } }),
                            h('select', { name: 'skill', style: 'flex:1;', onchange: (ev) => { chatState.skill = ev.target.value; } },
                                h('option', { value: '' }, '— no skill —'),
                                ...skills.map(s => h('option', { value: s.name, selected: chatState.skill === s.name ? 'true' : null }, s.name))
                            )
                        ),
                        h('div', { style: 'display:flex;gap:8px;' },
                            h('textarea', { name: 'prompt', placeholder: 'send a message…', rows: 3, style: 'flex:1;resize:vertical;' }),
                            h('button', { type: 'submit', class: 'btn-primary', style: 'align-self:flex-end;', disabled: chatState.busy ? 'true' : null }, chatState.busy ? '…' : 'send')
                        )
                    ),
                    msgs,
                ] }),
                Panel({ title: 'cli surface', count: h0.pi.cli.size,
                    children: Table({ headers: ['command', 'description'], rows: [...h0.pi.cli.values()].map(c => [c.name, c.description || '']) }) }),
            ];
        },
        async sessions(h0) {
            const list = await h0.pi.sessions.list();
            return [
                Kpi({ items: [[list.length, 'sessions']] }),
                Panel({ title: 'recent sessions', count: list.length, children: list.length === 0
                    ? EmptyState({ text: 'no sessions yet — start a chat', glyph: '✉' })
                    : Table({ headers: ['id', 'title', 'platform', 'model', 'turns'],
                        rows: list.map(s => [(s.id || '').slice(0, 8), s.title || '—', s.platform || '—', s.model || '—', s.turn_count || 0]) }) }),
            ];
        },
        async agents(h0) {
            const a = (typeof h0.pi.agents === 'function') ? await h0.pi.agents() : { count: 0, turns: 0, active: null };
            return [
                Kpi({ items: [[a.count || 0, 'active'], [a.turns || 0, 'turns']] }),
                Panel({ title: 'agent overview', children: Receipt({ rows: [
                    ['total turns', String(a.turns || 0)],
                    ['active session', a.active || '(none)'],
                    ['last activity', a.last_activity ? new Date(a.last_activity).toLocaleString() : '—'],
                ] }) }),
            ];
        },
        async analytics(h0) {
            const list = await h0.pi.sessions.list();
            const tools = [...h0.pi.tools.values()];
            const byPlatform = list.reduce((a, s) => { const k = s.platform || '?'; a[k] = (a[k] || 0) + 1; return a; }, {});
            const byModel = list.reduce((a, s) => { const k = s.model || '?'; a[k] = (a[k] || 0) + 1; return a; }, {});
            const byToolset = tools.reduce((a, t) => { (a[t.toolset || 'core'] = a[t.toolset || 'core'] || []).push(t.name); return a; }, {});
            return [
                Kpi({ items: [[list.length, 'sessions'], [tools.length, 'tools']] }),
                Panel({ title: 'sessions by platform', children: Object.keys(byPlatform).length === 0
                    ? EmptyState({ text: 'no data', glyph: '◉' })
                    : Table({ headers: ['platform', 'count'], rows: Object.entries(byPlatform).sort((a, b) => b[1] - a[1]) }) }),
                Panel({ title: 'sessions by model', children: Object.keys(byModel).length === 0
                    ? EmptyState({ text: 'no data', glyph: '◎' })
                    : Table({ headers: ['model', 'count'], rows: Object.entries(byModel).sort((a, b) => b[1] - a[1]) }) }),
                Panel({ title: 'tool distribution', children: Table({ headers: ['toolset', 'count', 'tools'],
                    rows: Object.entries(byToolset).map(([k, v]) => [k, v.length, v.slice(0, 4).join(', ') + (v.length > 4 ? '…' : '')]) }) }),
            ];
        },
        async models(h0) {
            const cfg = (typeof h0.pi.config?.load === 'function') ? await h0.pi.config.load() : {};
            const agent = cfg.agent || {};
            return [
                Kpi({ items: [[agent.provider || '—', 'provider'], [agent.model || '—', 'model']] }),
                Panel({ title: 'active model', children: Receipt({ rows: [
                    ['provider', agent.provider || '(unset)'],
                    ['model', agent.model || '(unset)'],
                    ['max_iterations', String(agent.max_iterations || '—')],
                    ['max_tokens', String(agent.max_tokens || '—')],
                    ['temperature', String(agent.temperature ?? '—')],
                ] }) }),
                Panel({ title: 'change model', children: form({
                    fields: [{ name: 'provider', placeholder: 'provider', value: agent.provider || '' }, { name: 'model', placeholder: 'model id', value: agent.model || '' }],
                    submit: 'update',
                    onSubmit: async (ev) => {
                        await h0.pi.config.saveValue('agent.provider', ev.target.elements.provider.value);
                        await h0.pi.config.saveValue('agent.model', ev.target.elements.model.value);
                        rerender();
                    },
                }) }),
            ];
        },
        async logs(h0) {
            const dbg = (typeof h0.pi.debug === 'function') ? h0.pi.debug() : { note: 'no debug surface' };
            return [Panel({ title: 'host debug snapshot', children: pre(dbg) })];
        },
        async cron(h0) {
            const list = await h0.pi.cron.list();
            return [
                Kpi({ items: [[list.length, 'cron jobs']] }),
                Panel({ title: 'add job', children: form({
                    fields: [{ name: 'cron', placeholder: '* * * * *', required: true }, { name: 'prompt', placeholder: 'prompt', required: true }],
                    submit: 'create',
                    onSubmit: async (ev) => { try { await h0.pi.cron.create({ cron: ev.target.elements.cron.value, prompt: ev.target.elements.prompt.value }); rerender(); } catch (e) { alert(e.message); } },
                }) }),
                Panel({ title: 'scheduled jobs', count: list.length, children: list.length === 0
                    ? EmptyState({ text: 'no cron jobs — add one above', glyph: '◷' })
                    : Table({ headers: ['id', 'cron', 'prompt', 'enabled'],
                        rows: list.map(j => [j.id, j.cron, (j.prompt || '').slice(0, 40), j.enabled ? 'yes' : 'no']) }) }),
            ];
        },
        async skills(h0) {
            const list = [...h0.pi.skills.values()];
            const byCat = list.reduce((a, s) => { (a[s.category || 'other'] = a[s.category || 'other'] || []).push(s); return a; }, {});
            return [
                Kpi({ items: [[list.length, 'skills'], [Object.keys(byCat).length, 'categories']] }),
                ...Object.entries(byCat).map(([cat, ss]) => Panel({ title: cat, count: ss.length,
                    children: ss.length === 0 ? EmptyState({ text: 'none', glyph: '◈' })
                        : Table({ headers: ['name', 'description'], rows: ss.map(s => [s.shortName || s.name, (s.description || '').slice(0, 100)]) }) })),
            ];
        },
        async config(h0) {
            const cfg = (typeof h0.pi.config?.load === 'function') ? await h0.pi.config.load() : {};
            const profiles = (typeof h0.pi.profiles?.list === 'function') ? h0.pi.profiles.list() : [];
            const commands = (typeof h0.pi.commands?.list === 'function') ? h0.pi.commands.list() : [];
            return [
                Kpi({ items: [[profiles.length, 'profiles'], [commands.length, 'commands'], [cfg._config_version || 0, 'config version']] }),
                Panel({ title: 'set config value', children: form({
                    fields: [{ name: 'key', placeholder: 'dotted.key (e.g. agent.model)', required: true }, { name: 'value', placeholder: 'value (json or string)', required: true }],
                    submit: 'save',
                    onSubmit: async (ev) => {
                        let v = ev.target.elements.value.value;
                        try { v = JSON.parse(v); } catch {}
                        await h0.pi.config.saveValue(ev.target.elements.key.value, v);
                        rerender();
                    },
                }) }),
                Panel({ title: 'commands', count: commands.length,
                    children: Table({ headers: ['name', 'category', 'description'], rows: commands.map(c => [c.name, c.category || '', c.description || '']) }) }),
                Panel({ title: 'active config', children: pre(cfg) }),
            ];
        },
        async env(h0) {
            const list = (typeof h0.pi.env?.list === 'function') ? h0.pi.env.list() : [];
            const setCount = list.filter(k => k.set).length;
            const chipNodes = list.map(k => h(
                'span',
                {
                    key: k.key,
                    onclick: () => {
                        const v = prompt('set ' + k.key + ' (empty to unset):');
                        if (v == null) return;
                        if (typeof h0.pi.env.set === 'function') { h0.pi.env.set(k.key, v); rerender(); }
                    },
                    style: 'cursor:pointer',
                },
                Chip({ tone: k.set ? 'ok' : 'miss', children: k.key + (k.set ? ' ✓' : ' ·') })
            ));
            return [
                Kpi({ items: [[setCount, 'set'], [list.length - setCount, 'missing'], [list.length, 'total known']] }),
                Panel({
                    title: 'environment variables',
                    right: h('span', {}, Chip({ tone: 'ok', children: setCount + ' set' }), ' ', Chip({ tone: 'miss', children: (list.length - setCount) + ' missing' })),
                    children: h('div', { style: 'padding:8px 4px;display:flex;flex-wrap:wrap;gap:6px' }, ...chipNodes),
                }),
            ];
        },
        async tools(h0) {
            const list = [...h0.pi.tools.values()];
            const byToolset = list.reduce((a, t) => { (a[t.toolset || 'core'] = a[t.toolset || 'core'] || []).push(t); return a; }, {});
            return [
                Kpi({ items: [[list.length, 'tools'], [Object.keys(byToolset).length, 'toolsets']] }),
                ...Object.entries(byToolset).map(([ts, items]) => Panel({ title: 'toolset · ' + ts, count: items.length,
                    children: items.map(t => Row({ key: t.name, code: '⚒', title: t.name, sub: (t.description || (t.schema && t.schema.description) || '').slice(0, 80) })) })),
            ];
        },
        async batch(h0) {
            const out = h('div', { id: 'fd-batch-out' });
            return [
                Section({ title: '// batch runner', children: [
                    Panel({ title: 'run prompts', children: form({
                        fields: [{ name: 'prompts', kind: 'textarea', placeholder: 'one prompt per line' }, { name: 'concurrency', type: 'number', value: '4' }],
                        submit: 'run',
                        onSubmit: async (ev) => {
                            const prompts = ev.target.elements.prompts.value.split('\n').map(s => s.trim()).filter(Boolean);
                            if (!prompts.length) return;
                            const node = root.querySelector('#fd-batch-out');
                            if (node) node.textContent = 'running…';
                            try {
                                const r = await h0.pi.batch.run({ prompts, concurrency: Number(ev.target.elements.concurrency.value) || 4 });
                                if (node) { node.innerHTML = ''; node.appendChild(document.createTextNode(JSON.stringify(r, null, 2))); }
                            } catch (e) { if (node) node.textContent = 'error: ' + (e.message || e); }
                        },
                    }) }),
                    Panel({ title: 'results', children: out }),
                    Panel({ title: 'cli usage', children: Receipt({ rows: [
                        ['run batch file', 'freddie batch prompts.txt'],
                        ['set concurrency', 'freddie batch prompts.txt --concurrency 8'],
                        ['jsonl output', 'freddie batch prompts.txt > out.jsonl'],
                    ] }) }),
                ] }),
            ];
        },
        async gateway(h0) {
            const platforms = (typeof h0.pi.gateway?.platforms === 'function') ? h0.pi.gateway.platforms() : [];
            const active = platforms.filter(p => p.enabled);
            return [
                Kpi({ items: [[platforms.length, 'platforms'], [active.length, 'active']] }),
                Panel({ title: 'platforms', count: platforms.length,
                    right: active.length > 0 ? Chip({ tone: 'ok', children: active.length + ' active' }) : Chip({ tone: 'miss', children: 'none active' }),
                    children: platforms.length === 0 ? EmptyState({ text: 'no platforms registered', glyph: '⇌' })
                        : platforms.map(p => Row({ key: p.name, code: p.enabled ? '●' : '○', title: p.name, sub: p.note || '', meta: p.enabled ? 'enabled' : '' })) }),
                Panel({ title: 'start gateway', children: Receipt({ rows: [
                    ['webhook + api_server', 'freddie gateway --port 3000'],
                    ['specific platform', 'TELEGRAM_BOT_TOKEN=… freddie gateway'],
                    ['all platforms', 'set env vars per platform, then freddie gateway'],
                ] }) }),
            ];
        },
        async ['os-instances']() {
            const list = (osSurfaces && osSurfaces.instances && osSurfaces.instances()) || [];
            const activeId = osSurfaces && osSurfaces.activeInstanceId && osSurfaces.activeInstanceId();
            return [
                Kpi({ items: [[list.length, 'instances'], [activeId || '—', 'active']] }),
                Panel({ title: 'instances', count: list.length, children: list.length === 0
                    ? EmptyState({ text: 'no instances', glyph: '◫' })
                    : Table({ headers: ['id', 'active', 'shells', 'windows'],
                        rows: list.map(i => [i.id, i.id === activeId ? '●' : '', String((i.shells || []).length), String((i.windows || []).length)]) }) }),
            ];
        },
        async ['os-windows']() {
            const wins = (osSurfaces && osSurfaces.wm && osSurfaces.wm.list && osSurfaces.wm.list()) || [];
            const focused = osSurfaces && osSurfaces.wm && osSurfaces.wm.focused;
            return [
                Kpi({ items: [[wins.length, 'windows'], [focused ? (focused.id || focused.title || '?') : '—', 'focused']] }),
                Panel({ title: 'windows', count: wins.length, children: wins.length === 0
                    ? EmptyState({ text: 'no windows open', glyph: '▭' })
                    : Table({ headers: ['id', 'title', 'min', 'max', 'pos'],
                        rows: wins.map(w => [w.id || '?', w.title || '', w.min ? '●' : '', w.max ? '●' : '',
                            (w.el ? `${w.el.offsetLeft},${w.el.offsetTop} ${w.el.offsetWidth}×${w.el.offsetHeight}` : '')]) }) }),
            ];
        },
        async ['os-x']() {
            const x = osSurfaces && osSurfaces.xServer && osSurfaces.xServer();
            if (!x) return [Panel({ title: 'x-server', children: EmptyState({ text: 'x-server not running in this instance', glyph: '✕' }) })];
            return [
                Kpi({ items: [[x.windows, 'windows'], [x.pixmaps, 'pixmaps'], [x.gcs, 'gcs'], [x.atoms, 'atoms'], [x.cursors, 'cursors']] }),
                Panel({ title: 'display', children: pre(x) }),
            ];
        },
        async ['os-fs']() {
            const list = await instance.fs.list('/');
            return [
                Kpi({ items: [[list.length, 'paths'], [instance.id, 'instance']] }),
                Panel({ title: 'paths', count: list.length, children: list.length === 0
                    ? EmptyState({ text: 'empty fs', glyph: '📁' })
                    : pre(list.join('\n')) }),
            ];
        },
    };

    rerender();

    if (typeof window !== 'undefined') {
        window.__debug = window.__debug || {};
        window.__debug.instances = window.__debug.instances || {};
        window.__debug.instances[instance.id] = window.__debug.instances[instance.id] || {};
        window.__debug.instances[instance.id].dashboard = {
            root,
            routes: allRoutes.map(r => r.path),
            setActive,
            get active() { return state.active; },
        };
    }

    return { node: root, dispose() {} };
}
