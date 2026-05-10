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

function getRecentPaths() {
    try { return JSON.parse(localStorage.getItem('fd_recent_cwds') || '[]'); } catch { return []; }
}

function saveRecentPath(p) {
    if (!p) return;
    try {
        const prev = getRecentPaths().filter(x => x !== p);
        localStorage.setItem('fd_recent_cwds', JSON.stringify([p, ...prev].slice(0, 5)));
    } catch {}
}

function skillLabel(s) {
    if (s.shortName) return s.shortName;
    const n = s.name || '';
    return n.replace(/^gm:/, '').replace(/^software-development$/, 'software dev').replace(/-/g, ' ');
}

function renderChatMessages(container, messages) {
    if (!container) return;
    container.innerHTML = '';
    for (const m of messages) {
        if (m.role === 'tool') {
            const det = document.createElement('details');
            det.style.cssText = 'margin:4px 0;padding:4px 8px;background:rgba(0,0,0,0.18);border-radius:4px;font-family:monospace;font-size:0.85em;';
            const sum = document.createElement('summary');
            sum.style.cssText = 'cursor:pointer;color:var(--color-warn,#fc9);padding:2px 0;';
            sum.textContent = '⚒ ' + m.name + (m.argsSummary ? ' ' + m.argsSummary : '');
            det.appendChild(sum);
            const body = document.createElement('pre');
            body.style.cssText = 'margin:4px 0 0;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto;';
            body.textContent = m.content || '';
            det.appendChild(body);
            container.appendChild(det);
        } else {
            const el = document.createElement('div');
            el.style.cssText = 'padding:6px 10px;border-bottom:1px solid rgba(128,128,128,0.15);white-space:pre-wrap;word-break:break-word;';
            el.style.color = m.role === 'assistant' ? 'var(--color-accent,#7c9)' : 'inherit';
            el.textContent = (m.role === 'assistant' ? '◈ ' : '▷ ') + (m.content || '');
            container.appendChild(el);
        }
    }
    container.scrollTop = container.scrollHeight;
}

export function createFreddieDashboard({ instance, bootHost, osSurfaces }) {
    const root = document.createElement('div');
    root.className = 'app-fd ds-247420';
    root.style.cssText = 'height:100%;overflow:hidden;display:flex;flex-direction:column;';

    const state = { active: 'home', ts: new Date().toLocaleTimeString(), body: null, error: null };
    let host = instance.host || null;
    const allRoutes = osSurfaces ? [...ROUTES, ...OS_ROUTE_DEFS] : ROUTES;

    async function ensureHost() {
        if (host) return host;
        if (typeof bootHost !== 'function') throw new Error('createFreddieDashboard: instance.host or bootHost required');
        host = instance.host = await bootHost({ fs: instance.fs });
        return host;
    }

    function setActive(p) { state.active = p; rerender(); }

    if (typeof window !== 'undefined') window.__fd_nav = setActive;

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

    function rerender() { webjsx.applyDiff(root, view()); loadActive(); }

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
                    ['open chat',   "click 'chat' in sidebar — set a working directory and pick a skill"],
                    ['pick skill',  "software dev, research, planning — shown with descriptions"],
                    ['pick model',  "select a configured provider + model in the chat bar"],
                    ['list tools',  '/tools in chat → tools tab'],
                    ['set api key', 'keys tab → click chip to set value'],
                    ['add cron',    'cron tab → form'],
                ] }) }),
                Panel({ title: 'host', children: Receipt({ rows: Object.entries(health).map(([k, v]) => [k, String(v)]) }) }),
            ];
        },
        async chat(h0) {
            const skills = [...h0.pi.skills.values()];
            const providers = await fetch('/api/providers').then(r => r.json()).catch(() => []);
            const configuredProviders = providers.filter(p => p.configured);

            const chatState = window.__fd_chatState = window.__fd_chatState || {
                cwd: '', skill: '', provider: '', model: '', messages: [], busy: false, sessionId: null,
            };
            if (!chatState.cwd) chatState.cwd = (getRecentPaths()[0] || '');

            function getMsgsContainer() { return root.querySelector('#fd-chat-msgs'); }

            function newSession() {
                if (chatState.busy) return;
                chatState.messages = [];
                chatState.sessionId = null;
                renderChatMessages(getMsgsContainer(), chatState.messages);
            }

            const parseSseEvents = (text) => {
                const events = [];
                let curEvent = null, curData = '';
                for (const line of text.split('\n')) {
                    if (line.startsWith('event: ')) { curEvent = line.slice(7).trim(); }
                    else if (line.startsWith('data: ')) { curData = line.slice(6).trim(); }
                    else if (line === '' && curEvent) {
                        try { events.push({ event: curEvent, data: JSON.parse(curData) }); } catch {}
                        curEvent = null; curData = '';
                    }
                }
                return events;
            };

            const sendChat = async (ev) => {
                ev.preventDefault();
                if (chatState.busy) return;
                const promptEl = ev.target.elements.prompt;
                const prompt = promptEl.value.trim();
                if (!prompt) return;
                chatState.messages.push({ role: 'user', content: prompt });
                promptEl.value = '';
                promptEl.style.height = 'auto';
                chatState.busy = true;
                saveRecentPath(chatState.cwd);
                renderChatMessages(getMsgsContainer(), chatState.messages);
                try {
                    const body = { prompt, cwd: chatState.cwd || undefined, skill: chatState.skill || undefined, provider: chatState.provider || undefined, model: chatState.model || undefined, sessionId: chatState.sessionId || undefined };
                    const resp = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
                    const text = await resp.text();
                    const events = parseSseEvents(text);
                    let assistantContent = '';
                    for (const { event, data } of events) {
                        if (event === 'start' && data.sessionId) chatState.sessionId = data.sessionId;
                        if (event === 'done' && data.sessionId) chatState.sessionId = data.sessionId;
                        if (event === 'message') {
                            const role = data.role;
                            if (role === 'assistant') {
                                const content = Array.isArray(data.content) ? data.content : [{ type: 'text', text: String(data.content || '') }];
                                for (const block of content) {
                                    if (block.type === 'text') assistantContent += block.text;
                                    if (block.type === 'tool_use') {
                                        if (assistantContent) { chatState.messages.push({ role: 'assistant', content: assistantContent }); assistantContent = ''; }
                                        const argsSummary = JSON.stringify(block.input || {}).slice(0, 60);
                                        chatState.messages.push({ role: 'tool', name: block.name, argsSummary, content: JSON.stringify(block.input || {}, null, 2) });
                                    }
                                }
                            } else if (role === 'tool') {
                                const tc = Array.isArray(data.content) ? data.content[0] : data;
                                chatState.messages.push({ role: 'tool', name: 'result', argsSummary: '', content: String(tc?.content || tc?.text || JSON.stringify(tc)) });
                            }
                        }
                        if (event === 'done' && data.result) {
                            if (!assistantContent) assistantContent = data.result;
                        }
                        if (event === 'error') assistantContent = 'error: ' + (data.error || 'unknown');
                    }
                    if (assistantContent) chatState.messages.push({ role: 'assistant', content: assistantContent });
                    if (!events.length) chatState.messages.push({ role: 'assistant', content: '(no response)' });
                } catch (e) {
                    chatState.messages.push({ role: 'assistant', content: 'error: ' + e.message });
                }
                chatState.busy = false;
                renderChatMessages(getMsgsContainer(), chatState.messages);
            };

            const recentPaths = getRecentPaths();
            const datalistId = 'fd-cwd-list';
            const byCat = skills.reduce((a, s) => { const c = s.category || 'other'; (a[c] = a[c] || []).push(s); return a; }, {});

            setTimeout(() => renderChatMessages(getMsgsContainer(), chatState.messages), 50);

            return [
                Panel({
                    title: 'chat',
                    right: h('button', {
                        class: 'btn-primary', style: 'padding:2px 10px;font-size:0.8em;',
                        onclick: (ev) => { ev.preventDefault(); newSession(); },
                        disabled: chatState.busy ? 'true' : null,
                    }, '+ new session'),
                    children: [
                        h('datalist', { id: datalistId }, ...recentPaths.map(p => h('option', { value: p }))),
                        h('form', { class: 'row-form', style: 'display:flex;flex-direction:column;gap:8px;', onsubmit: sendChat },
                            h('div', { style: 'display:flex;flex-direction:column;gap:4px;' },
                                h('label', { style: 'font-size:0.75em;opacity:0.7;letter-spacing:0.05em;' }, 'WORKING DIRECTORY'),
                                h('input', {
                                    name: 'cwd', type: 'text', placeholder: 'e.g. C:/dev/myproject or /home/user/project',
                                    value: chatState.cwd, list: datalistId,
                                    style: 'width:100%;box-sizing:border-box;',
                                    oninput: (ev) => { chatState.cwd = ev.target.value; },
                                })
                            ),
                            h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;' },
                                h('div', { style: 'display:flex;flex-direction:column;gap:4px;flex:2;min-width:160px;' },
                                    h('label', { style: 'font-size:0.75em;opacity:0.7;letter-spacing:0.05em;' }, 'SKILL'),
                                    h('select', { name: 'skill', onchange: (ev) => { chatState.skill = ev.target.value; } },
                                        h('option', { value: '' }, '— no skill —'),
                                        ...Object.entries(byCat).map(([cat, ss]) =>
                                            h('optgroup', { label: cat },
                                                ...ss.map(s => h('option', {
                                                    value: s.name,
                                                    selected: chatState.skill === s.name ? 'true' : null,
                                                    title: s.description || s.name,
                                                }, skillLabel(s)))
                                            )
                                        )
                                    )
                                ),
                                h('div', { style: 'display:flex;flex-direction:column;gap:4px;flex:2;min-width:140px;' },
                                    h('label', { style: 'font-size:0.75em;opacity:0.7;letter-spacing:0.05em;' }, 'PROVIDER'),
                                    h('select', { name: 'provider', onchange: (ev) => { chatState.provider = ev.target.value; } },
                                        h('option', { value: '' }, configuredProviders.length ? '— auto —' : '— no providers configured —'),
                                        ...configuredProviders.map(p => h('option', {
                                            value: p.name,
                                            selected: chatState.provider === p.name ? 'true' : null,
                                        }, (p.available ? '● ' : '○ ') + p.name))
                                    )
                                ),
                                h('div', { style: 'display:flex;flex-direction:column;gap:4px;flex:2;min-width:120px;' },
                                    h('label', { style: 'font-size:0.75em;opacity:0.7;letter-spacing:0.05em;' }, 'MODEL (optional)'),
                                    h('input', {
                                        name: 'model', type: 'text',
                                        placeholder: configuredProviders.find(p => p.name === chatState.provider)?.defaultModel || 'default',
                                        value: chatState.model,
                                        oninput: (ev) => { chatState.model = ev.target.value; },
                                    })
                                )
                            ),
                            h('div', { style: 'display:flex;gap:8px;align-items:flex-end;' },
                                h('textarea', {
                                    name: 'prompt', placeholder: 'describe what you want to do in the working directory…',
                                    rows: 4, style: 'flex:1;resize:none;min-height:80px;',
                                    oninput: (ev) => {
                                        ev.target.style.height = 'auto';
                                        ev.target.style.height = Math.min(ev.target.scrollHeight, 240) + 'px';
                                    },
                                }),
                                h('button', {
                                    type: 'submit', class: 'btn-primary', style: 'align-self:flex-end;',
                                    disabled: chatState.busy ? 'true' : null,
                                }, chatState.busy ? '…' : 'send')
                            )
                        ),
                        h('div', { id: 'fd-chat-msgs', style: 'max-height:420px;overflow-y:auto;background:rgba(0,0,0,0.12);border-radius:4px;padding:4px;margin-top:8px;' }),
                    ],
                }),
                configuredProviders.length === 0
                    ? Panel({ title: 'no providers configured', children: Receipt({ rows: [
                        ['set API key', 'go to keys tab, click a provider chip to set its key'],
                        ['then reload', 'refresh this page to see providers here'],
                        ['or use acptoapi', 'run acptoapi server on localhost:4800 for local LLMs'],
                    ] }) })
                    : Panel({ title: 'configured providers', children: h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;padding:8px 4px;' },
                        ...providers.map(p => Chip({ tone: p.configured ? (p.available ? 'ok' : 'warn') : 'miss', children: p.name + (p.configured ? (p.available ? ' ●' : ' ○') : '') }))
                    ) }),
            ];
        },
        async sessions(h0) {
            const list = await h0.pi.sessions.list();
            const rows = list.map(s => {
                const cont = h('button', {
                    class: 'btn-primary', style: 'padding:2px 8px;font-size:0.8em;',
                    onclick: async () => {
                        const msgs = await h0.pi.sessions.getMessages(s.id);
                        const cs = window.__fd_chatState = window.__fd_chatState || { messages: [], busy: false, sessionId: null, cwd: '', skill: '', provider: '', model: '' };
                        cs.sessionId = s.id;
                        cs.messages = msgs.map(m => ({ role: m.role, content: String(m.content || '') }));
                        if (s.cwd) cs.cwd = s.cwd;
                        if (s.skill) cs.skill = s.skill;
                        if (typeof window.__fd_nav === 'function') window.__fd_nav('chat');
                    },
                }, 'continue');
                return [(s.id || '').slice(0, 8), s.title || '—', s.platform || '—', s.model || '—', s.cwd ? s.cwd.slice(-30) : '—', s.skill ? skillLabel({ name: s.skill }) : '—', cont];
            });
            return [
                Kpi({ items: [[list.length, 'sessions']] }),
                Panel({ title: 'recent sessions', count: list.length, children: list.length === 0
                    ? EmptyState({ text: 'no sessions yet — open chat and send a message', glyph: '✉' })
                    : Table({ headers: ['id', 'title', 'platform', 'model', 'cwd', 'skill', ''],
                        rows }) }),
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
            const providers = await fetch('/api/providers').then(r => r.json()).catch(() => []);
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
                Panel({ title: 'provider availability', children: h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;padding:8px 4px;' },
                    ...providers.map(p => Chip({ tone: p.configured ? (p.available ? 'ok' : 'warn') : 'miss', children: p.name + (p.configured ? (p.available ? ' ●' : ' ○') : ' ·') }))
                ) }),
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
                list.length === 0 ? EmptyState({ text: 'no skills loaded — add SKILL.md files to ~/.freddie/skills/', glyph: '◈' }) : null,
                ...Object.entries(byCat).map(([cat, ss]) => Panel({ title: cat, count: ss.length,
                    children: ss.length === 0 ? EmptyState({ text: 'none', glyph: '◈' })
                        : Table({ headers: ['name', 'description'], rows: ss.map(s => [skillLabel(s), (s.description || '').slice(0, 120)]) }) })),
            ].filter(Boolean);
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
