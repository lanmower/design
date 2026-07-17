// Freddie page registry — REAL renderers (not stubs). Each page is a
// self-contained micro-app (see ./freddie/runtime.js) wired to freddie's
// gui-* plugin HTTP endpoints (/api/*). Consumers mount FREDDIE_PAGES[id]
// through their thin router; no per-page wiring needed downstream. This is
// the single maintenance point for freddie GUI per the dynamic-stack contract.

import * as webjsx from '../../vendor/webjsx/index.js';
import { makePage, api, loadingState, errorState, emptyState } from './freddie/runtime.js';
import { getRecentPaths, saveRecentPath, skillLabel, renderChatMessages } from './freddie/helpers.js';
import { Panel, Row, Table, Kpi, PageHeader, SearchInput, TextField, Select } from './content.js';
import { Chip, Btn, Icon } from './shell.js';
import { formatTime } from '../locale.js';
import { register as registerDebug, unregister as unregisterDebug } from '../debug.js';
import { queueMessage, watchReconnect, isOnline } from '../idb-outbox.js';
import { ChatMessage, ChatComposer } from './chat.js';
import { fmtTime, fmtAgo } from './sessions.js';
import { createVirtualizer, measureRef } from '../virtual-scroll.js';

const h = webjsx.createElement;

// ---- shared bits -----------------------------------------------------------

const section = (title, ...children) => Panel({ title, children: children.flat().filter(Boolean) });
const noteAlert = (note) => note ? h('div', { class: 'ds-alert ds-alert-' + note.kind, role: 'alert' },
    h('span', { class: 'ds-alert-icon' }, '!'),
    h('div', { class: 'ds-alert-content' }, note.msg)) : null;
// Manual refresh button for non-polling pages — parity with auto-refreshing ones.
const refreshBtn = (onClick, busy) => Btn({ children: busy ? 'refreshing…' : [Icon('refresh'), ' refresh'], disabled: !!busy, onClick, 'aria-label': 'refresh' });
// Non-blocking refresh-error banner: keep last-good content, surface the failure.
const refreshError = (err) => err ? h('div', { class: 'ds-alert ds-alert-warn', role: 'status', 'aria-live': 'polite' },
    h('span', { class: 'ds-alert-icon' }, '!'),
    h('div', { class: 'ds-alert-content' }, 'refresh failed: ' + String(err.message || err))) : null;
// Polite live region announcing async busy/done state to screen readers.
const liveRegion = (msg) => h('div', { class: 'fd-sr-live', role: 'status', 'aria-live': 'polite' }, msg || '');
// Truncate with a title tooltip carrying the full text.
const trunc = (s, n = 90) => { const str = String(s || ''); return str.length > n ? { text: str.slice(0, n) + '…', title: str } : { text: str, title: null }; };
// Named truncation widths so list pages cap display consistently (and any
// raw .slice(0,N) on user text routes through trunc() for ellipsis + tooltip).
const TRUNC_TITLE = 60;   // session/skill/tool titles
const TRUNC_SUB = 80;     // row sub-text (prompts, descriptions)
const TRUNC_OUTPUT = 70;  // batch output cells
const TRUNC_DESC = 90;    // long descriptions
const TRUNC_PROMPT = 50;  // batch prompt cells
// Render trunc() result as a span carrying the full text in its title tooltip.
const truncSpan = (s, n) => { const t = trunc(s, n); return h('span', { title: t.title }, t.text); };
// Cap a raw JSON dump for an inline table cell without losing the data via tooltip.
const truncJson = (v, n = TRUNC_TITLE) => truncSpan(JSON.stringify(v), n);
// Autoscroll a thread only when the user is already near the bottom, so
// scrolling up to read history is not yanked back down on the next render.
const stickyScroll = (el) => { if (!el) return; const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80; if (nearBottom) el.scrollTop = el.scrollHeight; };

// ---- home ------------------------------------------------------------------

export const home = makePage((ctx) => {
    async function load() {
        try {
            // tools/skills counts come from the host when injected; otherwise
            // fall back to the same /api/* endpoints the tools/skills pages use
            // so the home KPIs never render an em-dash placeholder.
            const needTools = ctx.host?.pi?.tools?.size == null;
            const needSkills = ctx.host?.pi?.skills?.size == null;
            const [health, agents, sessions, toolsList, skillsList] = await Promise.all([
                api('/api/health').catch(() => null),
                api('/api/agents').catch(() => null),
                api('/api/sessions').catch((e) => ({ _err: e })),
                needTools ? api('/api/tools').catch(() => null) : Promise.resolve(null),
                needSkills ? api('/api/skills').catch(() => null) : Promise.resolve(null),
            ]);
            const toolsCount = needTools ? (Array.isArray(toolsList) ? toolsList.length : (toolsList?.tools?.length ?? null)) : null;
            const skillsCount = needSkills ? (Array.isArray(skillsList) ? skillsList.length : (skillsList?.skills?.length ?? null)) : null;
            const sessFailed = sessions && sessions._err;
            ctx.set({ loading: false, health, agents, sessions: Array.isArray(sessions) ? sessions : [], sessFailed, toolsCount, skillsCount, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    load();
    ctx.interval(load, 15000);
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading dashboard…');
        if (s.error) return errorState(s.error, load);
        const sessions = s.sessions || [];
        const agents = s.agents || {};
        const tools = ctx.host?.pi?.tools?.size ?? s.toolsCount ?? '—';
        const skills = ctx.host?.pi?.skills?.size ?? s.skillsCount ?? '—';
        return [
            PageHeader({ eyebrow: 'freddie', title: 'dashboard', lede: 'agent harness · live overview' }),
            Kpi({ items: [
                [tools, 'tools'],
                [skills, 'skills'],
                [sessions.length, 'sessions'],
                [agents.count ?? 0, 'active agents'],
            ] }),
            section('recent sessions',
                s.sessFailed
                    ? errorState(new Error('could not load sessions'))
                    : sessions.length
                        ? Table({
                            headers: ['session', 'platform', 'updated'],
                            rows: sessions.slice(0, 8).map(x => [truncSpan(x.title || x.id, TRUNC_TITLE), x.platform || '—', fmtAgo(x.updated_at)]),
                        })
                        : emptyState('no sessions yet')),
            section('health',
                s.health ? Table({ headers: ['check', 'status'], rows: Object.entries(s.health).map(([k, v]) => [k, typeof v === 'object' ? truncJson(v) : String(v)]) })
                    : emptyState('health endpoint unavailable')),
        ];
    };
});

// ---- chat ------------------------------------------------------------------

// Below this thread length, mount every message directly -- virtualization's
// scroll-listener + spacer-div overhead only pays for itself once the DOM
// node count it would otherwise mount is large enough to matter.
const VIRTUALIZE_THRESHOLD = 60;

export const chat = makePage((ctx) => {
    Object.assign(ctx.state, { loading: false, messages: [], draft: '', sending: false });
    const virtualizer = createVirtualizer();
    let threadEl = null;
    let range = { startIndex: 0, endIndex: 0, topSpacerPx: 0, bottomSpacerPx: 0 };
    function recomputeRange() {
        if (!threadEl) return;
        virtualizer.setCount(ctx.state.messages.length);
        range = virtualizer.computeRange(threadEl.scrollTop, threadEl.clientHeight);
    }
    // Offline outbox: a prompt sent while genuinely offline queues to
    // IndexedDB and auto-flushes on the real 'online' event, rather than
    // surfacing a hard error the user can't act on. True offline LLM
    // response generation is impossible by definition -- a queued message
    // only gets a reply once connectivity actually returns.
    async function sendToServer(body) {
        const r = await api('/api/chat', { method: 'POST', body });
        const reply = r.result || r.content || r.message || (r.messages && r.messages.at(-1)?.content) || JSON.stringify(r);
        ctx.state.messages.push({ role: 'assistant', text: String(reply), time: formatTime(Date.now()) });
    }
    watchReconnect('chat', sendToServer);
    async function send(text) {
        const t = (text || ctx.state.draft || '').trim();
        if (!t || ctx.state.sending) return;
        ctx.state.messages.push({ role: 'user', text: t, time: formatTime(Date.now()) });
        ctx.set({ draft: '', sending: true });
        if (!isOnline()) {
            await queueMessage('chat', { prompt: t });
            ctx.state.messages.push({ role: 'assistant', text: '(offline -- queued, will send when connection returns)', time: formatTime(Date.now()) });
            ctx.set({ sending: false });
            return;
        }
        try {
            await sendToServer({ prompt: t });
        } catch (e) {
            ctx.state.messages.push({ role: 'assistant', text: 'Error: ' + String(e.message || e), time: formatTime(Date.now()) });
        }
        ctx.set({ sending: false });
    }
    // Combines the existing bottom-pin auto-scroll ref (stickyScroll) with the
    // virtualizer's range recompute on every scroll tick. Both run off the
    // SAME element -- one ref callback wiring both keeps a single listener
    // registration instead of two refs fighting over the same node.
    function threadRef(el) {
        if (!el) { threadEl = null; return; }
        threadEl = el;
        stickyScroll(el);
        if (!el.__vsScrollWired) {
            el.__vsScrollWired = true;
            el.addEventListener('scroll', () => { recomputeRange(); ctx.rerender(); }, { passive: true });
        }
        recomputeRange();
    }

    return () => {
        const s = ctx.state;
        const virtualized = s.messages.length > VIRTUALIZE_THRESHOLD;
        let threadChildren;
        if (!s.messages.length) {
            threadChildren = [emptyState('send a prompt to start', Icon('forum'))];
        } else if (!virtualized) {
            threadChildren = s.messages.map((m, i) => ChatMessage({ ...m, key: i }));
        } else {
            recomputeRange();
            const { startIndex, endIndex, topSpacerPx, bottomSpacerPx } = range;
            threadChildren = [
                h('div', { key: '_top_spacer', style: `height:${topSpacerPx}px` }),
                ...s.messages.slice(startIndex, endIndex).map((m, i) => {
                    const realIndex = startIndex + i;
                    return h('div', { key: 'vm' + realIndex, ref: measureRef(virtualizer, realIndex) }, ChatMessage({ ...m, key: realIndex }));
                }),
                h('div', { key: '_bottom_spacer', style: `height:${bottomSpacerPx}px` }),
            ];
        }
        return h('div', { class: 'fd-chat' },
            PageHeader({ eyebrow: 'freddie', title: 'chat', lede: 'one-shot agent turns · POST /api/chat' }),
            liveRegion(s.sending ? 'waiting for assistant reply' : ''),
            h('div', { class: 'chat-thread fd-chat-thread', role: 'log', 'aria-label': 'chat messages',
                ref: threadRef },
                ...threadChildren,
                s.sending ? ChatMessage({ role: 'assistant', typing: true, key: '_typing' }) : null),
            ChatComposer({
                value: s.draft,
                placeholder: s.sending ? 'waiting for reply…' : 'message…',
                disabled: s.sending,
                onInput: (v) => { s.draft = v; },
                onSend: send,
            }));
    };
});

// ---- voice -----------------------------------------------------------------

export const voice = makePage((ctx) => {
    async function load() {
        // Probe for a voice backend; the endpoint is optional, so a 404/!ok
        // means "not wired" rather than an error to surface.
        try { const v = await api('/api/voice').catch(() => null); ctx.set({ loading: false, voice: v, error: null }); }
        catch (e) { ctx.set({ loading: false, error: e }); }
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading voice config…');
        const v = s.voice;
        const enabled = v && (v.enabled || v.transcription || v.tts);
        return [
            PageHeader({ eyebrow: 'freddie', title: 'voice', lede: 'voice surfaces', right: enabled ? Chip({ tone: 'ok', children: 'enabled' }) : Chip({ tone: 'neutral', children: 'not configured' }) }),
            enabled
                ? section('backends', Table({ headers: ['capability', 'status'], rows: [['transcription', v.transcription ? Chip({ tone: 'ok', children: 'on' }) : Chip({ tone: 'neutral', children: 'off' })], ['tts', v.tts ? Chip({ tone: 'ok', children: 'on' }) : Chip({ tone: 'neutral', children: 'off' })]] }))
                : section('status', emptyState('no voice backend wired in this build. configure a transcription/tts plugin to enable.')),
        ];
    };
});

// ---- sessions --------------------------------------------------------------

export const sessions = makePage((ctx) => {
    Object.assign(ctx.state, { q: '', selected: null, messages: [], msgLoading: false });
    async function load() {
        try { ctx.set({ loading: false, list: await api('/api/sessions'), error: null }); }
        catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function search(q) {
        if (!q) return load();
        try { ctx.set({ loading: false, list: await api('/api/search?q=' + encodeURIComponent(q)), error: null }); }
        catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function refresh() { ctx.set({ refreshing: true }); try { ctx.set({ list: await api('/api/sessions'), error: null }); } catch (e) { ctx.set({ error: e }); } ctx.set({ refreshing: false }); }
    async function open(id) {
        ctx.set({ selected: id, msgLoading: true });
        try { ctx.set({ messages: await api('/api/sessions/' + encodeURIComponent(id) + '/messages'), msgLoading: false }); }
        catch (e) { ctx.set({ messages: [], msgLoading: false, error: e }); }
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading sessions…');
        if (s.error && !s.list) return errorState(s.error, load);
        const list = Array.isArray(s.list) ? s.list : [];
        return [
            PageHeader({ eyebrow: 'freddie', title: 'sessions', lede: list.length + ' sessions', right: refreshBtn(refresh, s.refreshing) }),
            s.error && s.list ? refreshError(s.error) : null,
            SearchInput({ value: s.q, label: 'search sessions', placeholder: 'search messages…', onInput: (v) => { s.q = v; }, onSubmit: (v) => search(v) }),
            section('sessions',
                list.length
                    ? Table({ headers: ['session', 'platform', 'updated'], onRowClick: (i) => open(list[i].id),
                        rowLabels: list.map(x => x.title || x.id),
                        rows: list.map(x => [truncSpan(x.title || x.id, TRUNC_TITLE), x.platform || '—', fmtAgo(x.updated_at)]) })
                    : emptyState('no sessions match')),
            s.selected ? section('messages · ' + s.selected,
                s.msgLoading ? loadingState('loading messages…')
                    : (s.messages || []).length ? (s.messages).map((m, i) => ChatMessage({ role: m.role, text: m.content || m.text || '', time: m.ts ? fmtTime(m.ts) : '', key: i }))
                        : emptyState('no messages')) : null,
        ].filter(Boolean);
    };
});

// ---- projects --------------------------------------------------------------

export const projects = makePage((ctx) => {
    Object.assign(ctx.state, { newName: '', newPath: '', busy: false, note: null });
    async function load() {
        try { ctx.set({ loading: false, data: await api('/api/projects'), error: null }); }
        catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function create() {
        const name = (ctx.state.newName || '').trim();
        if (!name) { ctx.set({ note: { kind: 'warn', msg: 'name required' } }); return; }
        ctx.set({ busy: true, note: null });
        try { await api('/api/projects', { method: 'POST', body: { name, path: ctx.state.newPath || undefined } }); ctx.state.newName = ''; ctx.state.newPath = ''; await load(); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    async function activate(name) { ctx.set({ busy: true }); try { await api('/api/projects/active', { method: 'POST', body: { name } }); await load(); } catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); } ctx.set({ busy: false }); }
    async function del(name) { ctx.set({ busy: true }); try { await api('/api/projects/' + encodeURIComponent(name), { method: 'DELETE' }); await load(); } catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); } ctx.set({ busy: false }); }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading projects…');
        if (s.error && !s.data) return errorState(s.error, load);
        const d = s.data || {}; const list = d.projects || [];
        const activeName = (d.active && d.active.name) || d.active || 'default';
        return [
            PageHeader({ eyebrow: 'freddie', title: 'projects', lede: 'isolated workspaces · active: ' + activeName }),
            noteAlert(s.note),
            section('projects',
                list.length ? list.map((p, i) => Row({
                    key: i, code: h('span', { class: 'ds-dot ' + (p.name === activeName ? 'ds-dot-on' : 'ds-dot-off'), 'aria-hidden': 'true' }), title: p.name, sub: p.path || '',
                    active: p.name === activeName,
                    trailing: h('span', { class: 'fd-row-actions' },
                        p.name !== activeName ? Btn({ children: 'activate', onClick: () => activate(p.name) }) : Chip({ tone: 'ok', children: 'active' }),
                        p.name !== 'default' ? Btn({ variant: 'danger', children: 'delete', onClick: () => del(p.name) }) : null),
                })) : emptyState('no projects')),
            section('new project',
                TextField({ label: 'name', value: s.newName, onInput: (v) => { s.newName = v; }, placeholder: 'my-project' }),
                TextField({ label: 'path (optional)', value: s.newPath, onInput: (v) => { s.newPath = v; }, placeholder: 'C:/path/to/dir' }),
                Btn({ variant: 'primary', disabled: s.busy, children: s.busy ? 'working…' : 'create', onClick: create })),
        ].filter(Boolean);
    };
});

// ---- agents ----------------------------------------------------------------

export const agents = makePage((ctx) => {
    async function load() { try { ctx.set({ loading: false, data: await api('/api/agents'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load(); ctx.interval(load, 5000);
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading agents…');
        if (s.error && !s.data) return errorState(s.error, load);
        const d = s.data || {};
        return [
            PageHeader({ eyebrow: 'freddie', title: 'agents', lede: 'live agent activity' }),
            s.error && s.data ? refreshError(s.error) : null,
            Kpi({ items: [[d.count ?? 0, 'active'], [d.turns ?? 0, 'total turns'], [d.last_activity ? fmtAgo(d.last_activity) : '—', 'last activity']] }),
            section('detail', Table({ headers: ['field', 'value'], rows: Object.entries(d).map(([k, v]) => [k, String(v)]) })),
        ].filter(Boolean);
    };
});

// ---- analytics -------------------------------------------------------------

export const analytics = makePage((ctx) => {
    async function load() {
        try {
            const [sampler, avail] = await Promise.all([
                api('/api/models/sampler').catch(() => null),
                api('/api/models/availability/summary').catch(() => null),
            ]);
            ctx.set({ loading: false, sampler, avail, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    load(); ctx.interval(load, 15000);
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading analytics…');
        if (s.error && !s.sampler && !s.avail) return errorState(s.error, load);
        const samp = s.sampler?.status ? Object.values(s.sampler.status) : [];
        const ok = samp.filter(x => x && x.available !== false).length;
        const sum = s.avail?.summary || {};
        return [
            PageHeader({ eyebrow: 'freddie', title: 'analytics', lede: 'provider availability & sampler health' }),
            s.error && (s.sampler || s.avail) ? refreshError(s.error) : null,
            Kpi({ items: [[ok + '/' + samp.length, 'providers up'], [sum.total_models ?? '—', 'models'], [sum.usable_in_any_mode ?? '—', 'usable']] }),
            section('sampler', samp.length ? Table({ headers: ['provider', 'available', 'fails'], rows: Object.entries(s.sampler.status).map(([k, v]) => [k, v.available === false ? 'no' : 'yes', String(v.failCount ?? 0)]) }) : emptyState('no sampler data')),
        ].filter(Boolean);
    };
});

// ---- models ----------------------------------------------------------------

export const models = makePage((ctx) => {
    Object.assign(ctx.state, { discovering: false });
    async function load() {
        try {
            const [providers, cached, sampler] = await Promise.all([
                api('/api/models/providers').catch(() => []),
                api('/api/models/cached').catch(() => ({})),
                api('/api/models/sampler').catch(() => ({})),
            ]);
            ctx.set({ loading: false, providers, cached, sampler, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function discover() {
        if (ctx.state.discovering) return;
        ctx.set({ discovering: true });
        try { await api('/api/models/discover', { method: 'POST', body: {} }); await load(); }
        catch (e) { ctx.set({ error: e }); }
        ctx.set({ discovering: false });
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading models…');
        if (s.error && !s.providers) return errorState(s.error, load);
        const providers = Array.isArray(s.providers) ? s.providers : [];
        const cached = s.cached || {};
        const status = s.sampler?.status || {};
        return [
            PageHeader({ eyebrow: 'freddie', title: 'models', lede: providers.length + ' providers', right: Btn({ variant: 'primary', disabled: s.discovering, children: s.discovering ? 'discovering…' : 'discover', onClick: discover }) }),
            liveRegion(s.discovering ? 'discovering models' : ''),
            section('providers', providers.length ? Table({
                headers: ['provider', 'sampler', 'cached models'],
                rows: providers.map(p => {
                    const name = typeof p === 'string' ? p : p.id || p.provider;
                    const st = status[name];
                    const cm = (cached[name] || []);
                    return [name, st ? (st.available === false ? Chip({ tone: 'miss', children: 'down' }) : Chip({ tone: 'ok', children: 'up' })) : '—', Array.isArray(cm) ? cm.length : '—'];
                }),
            }) : emptyState('no providers; set provider API keys')),
        ];
    };
});

// ---- cron ------------------------------------------------------------------

export const cron = makePage((ctx) => {
    Object.assign(ctx.state, { expr: '', prompt: '', busy: false, note: null });
    async function load() { try { ctx.set({ loading: false, list: await api('/api/cron'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    async function add() {
        const expr = (ctx.state.expr || '').trim(); const prompt = (ctx.state.prompt || '').trim();
        if (!expr || !prompt) { ctx.set({ note: { kind: 'warn', msg: 'cron expression and prompt required' } }); return; }
        ctx.set({ busy: true, note: null });
        try { await api('/api/cron', { method: 'POST', body: { cron: expr, prompt } }); ctx.state.expr = ''; ctx.state.prompt = ''; await load(); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    async function del(id) { ctx.set({ busy: true }); try { await api('/api/cron/' + id, { method: 'DELETE' }); await load(); } catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); } ctx.set({ busy: false }); }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading cron jobs…');
        if (s.error && !s.list) return errorState(s.error, load);
        const list = Array.isArray(s.list) ? s.list : [];
        return [
            PageHeader({ eyebrow: 'freddie', title: 'cron', lede: list.length + ' scheduled jobs' }),
            noteAlert(s.note),
            section('jobs', list.length ? list.map((j, i) => Row({
                key: i, code: j.enabled ? Icon('play') : Icon('pause'), title: j.cron, sub: trunc(j.prompt, TRUNC_SUB).text,
                trailing: Btn({ variant: 'danger', children: 'delete', onClick: () => del(j.id) }),
            })) : emptyState('no cron jobs')),
            section('new job',
                TextField({ label: 'cron expression', value: s.expr, onInput: (v) => { s.expr = v; }, placeholder: '0 9 * * *' }),
                TextField({ label: 'prompt', value: s.prompt, multiline: true, onInput: (v) => { s.prompt = v; }, placeholder: 'what to run…' }),
                Btn({ variant: 'primary', disabled: s.busy, children: s.busy ? 'working…' : 'add job', onClick: add })),
        ];
    };
});

// ---- skills ----------------------------------------------------------------

export const skills = makePage((ctx) => {
    Object.assign(ctx.state, { open: null });
    async function load() { try { ctx.set({ loading: false, list: await api('/api/skills'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading skills…');
        if (s.error) return errorState(s.error, load);
        const list = Array.isArray(s.list) ? s.list : (s.list?.skills || []);
        return [
            PageHeader({ eyebrow: 'freddie', title: 'skills', lede: list.length + ' skills' }),
            section('skills', list.length ? list.map((sk, i) => h('div', { key: i },
                Row({ code: (sk.source || 'fs').slice(0, 3), title: sk.name, sub: trunc(sk.description, TRUNC_DESC).text,
                    onClick: () => ctx.set({ open: s.open === i ? null : i }), active: s.open === i }),
                s.open === i ? h('pre', { class: 'fd-pre fd-skill-body' }, sk.body || sk.content || '(no body)') : null,
            )) : emptyState('no skills')),
        ].filter(Boolean);
    };
});

// ---- config ----------------------------------------------------------------

export const config = makePage((ctx) => {
    Object.assign(ctx.state, { edited: {}, busy: false, note: null });
    async function load() {
        try {
            const [cfg, skins] = await Promise.all([api('/api/config'), api('/api/skins').catch(() => null)]);
            ctx.set({ loading: false, cfg, skins, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function save() {
        ctx.set({ busy: true, note: null });
        try { await api('/api/config', { method: 'POST', body: ctx.state.edited }); ctx.state.edited = {}; await load(); ctx.set({ note: { kind: 'success', msg: 'saved' } }); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    async function setSkin(name) {
        ctx.set({ busy: true, note: null });
        try { await api('/api/config', { method: 'POST', body: { skin: name } }); await load(); ctx.set({ note: { kind: 'success', msg: 'skin -> ' + name } }); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading config…');
        if (s.error) return errorState(s.error, load);
        const cfg = s.cfg || {};
        const flat = Object.entries(cfg).filter(([, v]) => typeof v !== 'object' || v === null);
        const nested = Object.entries(cfg).filter(([, v]) => typeof v === 'object' && v !== null);
        const skinList = Array.isArray(s.skins) ? s.skins : (s.skins?.skins || s.skins?.available || []);
        const activeSkin = cfg.skin || s.skins?.active || '';
        return [
            PageHeader({ eyebrow: 'freddie', title: 'config', lede: 'runtime configuration' }),
            noteAlert(s.note),
            liveRegion(s.busy ? 'saving configuration' : ''),
            nested.length ? h('div', { class: 'ds-alert ds-alert-info', role: 'note' },
                h('span', { class: 'ds-alert-icon' }, 'i'),
                h('div', { class: 'ds-alert-content' }, nested.length + ' nested config ' + (nested.length === 1 ? 'object is' : 'objects are') + ' read-only here (' + nested.map(([k]) => k).join(', ') + ') — edit via the config file or raw view below.')) : null,
            skinList.length ? section('skin',
                Select({ label: 'active skin', value: activeSkin, options: skinList, onChange: (v) => setSkin(v) })
            ) : null,
            section('settings', flat.length ? flat.map(([k, v], i) =>
                TextField({ key: i, label: k, value: String(ctx.state.edited[k] ?? v ?? ''), onInput: (val) => { ctx.state.edited[k] = val; } })
            ) : emptyState('no scalar config keys')),
            section('raw', h('pre', { class: 'fd-pre' }, JSON.stringify(cfg, null, 2))),
            section('actions',
                Btn({ variant: 'primary', disabled: s.busy || !Object.keys(s.edited).length, children: s.busy ? 'saving…' : 'save changes', onClick: save })),
        ].filter(Boolean);
    };
});

// ---- env -------------------------------------------------------------------

export const env = makePage((ctx) => {
    Object.assign(ctx.state, { auth: null, vars: null, draft: {}, busy: '', note: null });
    async function load() {
        try {
            const [auth, vars] = await Promise.all([api('/api/auth').catch(() => null), api('/api/env').catch(() => null)]);
            ctx.set({ loading: false, auth, vars, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    // Set a provider key through the dashboard (POST /api/auth). The key is sent
    // once and never echoed back — GET /api/auth returns only a masked fingerprint.
    async function setKey(provider) {
        const key = (ctx.state.draft[provider] || '').trim();
        if (!key) { ctx.set({ note: { kind: 'warn', msg: 'key required for ' + provider } }); return; }
        ctx.set({ busy: provider, note: null });
        try { await api('/api/auth', { method: 'POST', body: { provider, key } }); ctx.state.draft[provider] = ''; await load(); ctx.set({ note: { kind: 'success', msg: 'stored ' + provider } }); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: '' });
    }
    async function removeKey(provider) {
        ctx.set({ busy: provider, note: null });
        try { await api('/api/auth/' + encodeURIComponent(provider), { method: 'DELETE' }); await load(); ctx.set({ note: { kind: 'success', msg: 'removed ' + provider } }); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: '' });
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading keys…');
        if (s.error && !s.auth) return errorState(s.error, load);
        const auth = Array.isArray(s.auth) ? s.auth : [];
        const vars = Array.isArray(s.vars) ? s.vars : [];
        // Non-provider env vars (platform tokens etc) stay a read-only presence table.
        const providerEnvs = new Set(auth.map(a => a.env));
        const otherRows = vars.filter(v => !providerEnvs.has(v.key)).map(v => [v.key, v.set ? Chip({ tone: 'ok', children: v.source || 'set' }) : Chip({ tone: 'neutral', children: 'unset' })]);
        return [
            PageHeader({ eyebrow: 'freddie', title: 'keys', lede: 'provider api keys · stored locally, never displayed' }),
            noteAlert(s.note),
            section('provider keys',
                auth.length ? auth.map((a, i) => Row({
                    key: i, title: a.provider, sub: a.env + (a.set ? '  ·  ' + a.source + (a.fingerprint ? '  ·  ' + a.fingerprint : '') : ''),
                    trailing: h('span', { class: 'fd-row-actions' },
                        a.set ? Chip({ tone: 'ok', children: 'set' }) : Chip({ tone: 'neutral', children: 'unset' }),
                        TextField({ type: 'password', value: s.draft[a.provider] || '', onInput: (v) => { s.draft[a.provider] = v; }, placeholder: 'paste key', 'aria-label': 'key for ' + a.provider }),
                        Btn({ variant: 'primary', disabled: s.busy === a.provider, children: s.busy === a.provider ? '…' : 'save', onClick: () => setKey(a.provider) }),
                        (a.set && a.source === 'stored') ? Btn({ variant: 'danger', disabled: s.busy === a.provider, children: 'remove', onClick: () => removeKey(a.provider) }) : null),
                })) : emptyState('no providers')),
            otherRows.length ? section('other environment', Table({ headers: ['key', 'status'], rows: otherRows })) : null,
        ].filter(Boolean);
    };
});

// ---- tools -----------------------------------------------------------------

export const tools = makePage((ctx) => {
    Object.assign(ctx.state, { open: null, q: '' });
    async function load() { try { ctx.set({ loading: false, list: await api('/api/tools'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading tools…');
        if (s.error) return errorState(s.error, load);
        let list = Array.isArray(s.list) ? s.list : (s.list?.tools || []);
        if (s.q) list = list.filter(t => (t.name || '').includes(s.q));
        const groups = {};
        for (const t of list) { const g = t.toolset || 'core'; (groups[g] = groups[g] || []).push(t); }
        return [
            PageHeader({ eyebrow: 'freddie', title: 'tools', lede: list.length + ' tools' }),
            SearchInput({ value: s.q, label: 'filter tools', placeholder: 'filter tools…', onInput: (v) => ctx.set({ q: v }) }),
            ...Object.entries(groups).map(([g, ts]) => section(g + ' · ' + ts.length, ts.map((t, i) => h('div', { key: i },
                Row({ title: t.name, sub: trunc(t.schema?.description || t.description, TRUNC_DESC).text, onClick: () => ctx.set({ open: ctx.state.open === t.name ? null : t.name }), active: ctx.state.open === t.name }),
                ctx.state.open === t.name ? h('pre', { class: 'fd-pre' }, JSON.stringify(t.schema || t, null, 2)) : null,
            )))),
            list.length ? null : emptyState('no tools match'),
        ].filter(Boolean);
    };
});

// ---- batch -----------------------------------------------------------------

export const batch = makePage((ctx) => {
    Object.assign(ctx.state, { loading: false, prompts: '', concurrency: 4, busy: false, result: null, note: null });
    async function run() {
        const prompts = (ctx.state.prompts || '').split('\n').map(x => x.trim()).filter(Boolean);
        if (!prompts.length) { ctx.set({ note: { kind: 'warn', msg: 'enter at least one prompt (one per line)' } }); return; }
        ctx.set({ busy: true, note: null, result: null });
        try { const r = await api('/api/batch', { method: 'POST', body: { prompts, concurrency: Number(ctx.state.concurrency) || 4 } }); ctx.set({ result: r }); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    return () => {
        const s = ctx.state;
        return [
            PageHeader({ eyebrow: 'freddie', title: 'batch', lede: 'parallel prompt runner' }),
            noteAlert(s.note),
            section('prompts',
                TextField({ label: 'prompts (one per line)', value: s.prompts, multiline: true, rows: 6, onInput: (v) => { s.prompts = v; } }),
                TextField({ label: 'concurrency', type: 'number', min: 1, 'aria-label': 'batch concurrency', value: String(s.concurrency), onInput: (v) => { s.concurrency = v; } }),
                Btn({ variant: 'primary', disabled: s.busy, children: s.busy ? 'running…' : 'run batch', onClick: run })),
            s.result ? section('result', (() => {
                const r = s.result;
                const items = Array.isArray(r.results) ? r.results : (Array.isArray(r) ? r : null);
                if (!items) return h('pre', { class: 'fd-pre' }, JSON.stringify(r, null, 2));
                return [
                    Kpi({ items: [[items.length, 'prompts'], [items.filter(x => !x.error).length, 'ok'], [items.filter(x => x.error).length, 'errors']] }),
                    Table({ headers: ['#', 'prompt', 'status', 'output'], rows: items.map((x, i) => {
                        return [String(i + 1), truncSpan(x.prompt || x.input || '', TRUNC_PROMPT), x.error ? Chip({ tone: 'miss', children: 'error' }) : Chip({ tone: 'ok', children: 'ok' }), truncSpan(x.error || x.result || x.content || x.output || '', TRUNC_OUTPUT)];
                    }) }),
                ];
            })()) : null,
        ].filter(Boolean);
    };
});

// ---- gateway ---------------------------------------------------------------

export const gateway = makePage((ctx) => {
    async function load() { try { ctx.set({ loading: false, data: await api('/api/gateway'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load(); ctx.interval(load, 10000);
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading gateway…');
        if (s.error && !s.data) return errorState(s.error, load);
        const d = s.data || {};
        const platforms = d.platforms || d;
        const rows = Object.entries(platforms).map(([k, v]) => [k, typeof v === 'object' ? (v.running || v.up ? Chip({ tone: 'ok', children: 'up' }) : Chip({ tone: 'miss', children: 'down' })) : String(v)]);
        return [
            PageHeader({ eyebrow: 'freddie', title: 'gateway', lede: 'messaging platform status' }),
            s.error && s.data ? refreshError(s.error) : null,
            section('platforms', rows.length ? Table({ headers: ['platform', 'status'], rows }) : emptyState('no platforms configured')),
        ].filter(Boolean);
    };
});

// ---- chains (acptoapi) -----------------------------------------------------

export const chains = makePage((ctx) => {
    Object.assign(ctx.state, { name: '', links: '', busy: false, note: null });
    async function load() {
        try {
            const [health, list, cfg] = await Promise.all([
                api('/api/acptoapi/health').catch(() => null),
                api('/api/acptoapi/chains').catch(() => null),
                api('/api/acptoapi/config').catch(() => null),
            ]);
            ctx.set({ loading: false, health, list, cfg, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function create() {
        const name = (ctx.state.name || '').trim();
        const links = (ctx.state.links || '').split(',').map(x => x.trim()).filter(Boolean);
        if (!name || !links.length) { ctx.set({ note: { kind: 'warn', msg: 'name and comma-separated links required' } }); return; }
        ctx.set({ busy: true, note: null });
        try { await api('/api/acptoapi/chains', { method: 'POST', body: { name, links } }); ctx.state.name = ''; ctx.state.links = ''; await load(); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    async function del(name) { ctx.set({ busy: true }); try { await api('/api/acptoapi/chains/' + encodeURIComponent(name), { method: 'DELETE' }); await load(); } catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); } ctx.set({ busy: false }); }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading chains…');
        if (s.error && !s.cfg && !s.health) return errorState(s.error, load);
        const chainsList = s.list?.chains || s.list || [];
        const up = s.health && (s.health.ok || s.health.status === 'ok' || s.health.healthy);
        return [
            PageHeader({ eyebrow: 'freddie', title: 'chains', lede: 'acptoapi fallback chains', right: up ? Chip({ tone: 'ok', children: 'acptoapi up' }) : Chip({ tone: 'miss', children: 'acptoapi down' }) }),
            noteAlert(s.note),
            section('chains', Array.isArray(chainsList) && chainsList.length ? chainsList.map((c, i) => Row({
                key: i, title: c.name || c, sub: Array.isArray(c.links) ? c.links.join(' -> ') : '',
                trailing: Btn({ variant: 'danger', children: 'delete', onClick: () => del(c.name || c) }),
            })) : emptyState('no chains defined')),
            section('new chain',
                TextField({ label: 'name', value: s.name, onInput: (v) => { s.name = v; } }),
                TextField({ label: 'links (comma-separated models)', value: s.links, onInput: (v) => { s.links = v; }, placeholder: 'mistral/large, openrouter/auto' }),
                Btn({ variant: 'primary', disabled: s.busy, children: s.busy ? 'working…' : 'create chain', onClick: create })),
            s.cfg ? section('config', h('pre', { class: 'fd-pre' }, JSON.stringify(s.cfg, null, 2))) : null,
        ].filter(Boolean);
    };
});

// ---- machines --------------------------------------------------------------

export const machines = makePage((ctx) => {
    async function load() { try { ctx.set({ loading: false, data: await api('/api/machines'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load(); ctx.interval(load, 8000);
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading machines…');
        if (s.error && !s.data) return errorState(s.error, load);
        const d = s.data || {};
        const list = Array.isArray(d) ? d : (d.machines || Object.entries(d).map(([kind, v]) => ({ kind, ...(typeof v === 'object' ? v : { value: v }) })));
        return [
            PageHeader({ eyebrow: 'freddie', title: 'machines', lede: 'persisted xstate machine census' }),
            s.error && s.data ? refreshError(s.error) : null,
            section('machines', list.length ? Table({
                headers: ['kind', 'key', 'state'],
                rows: list.map(m => [m.kind || '—', m.key || m.machine_id || '—', m.state || m.value || truncJson(m)]),
            }) : emptyState('no live machines')),
        ].filter(Boolean);
    };
});

// ---- health ----------------------------------------------------------------

export const health = makePage((ctx) => {
    async function load() {
        try {
            const [health, providers] = await Promise.all([
                api('/api/health').catch(() => null),
                api('/api/providers').catch(() => null),
            ]);
            ctx.set({ loading: false, health, providers, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    load(); ctx.interval(load, 15000);
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading health…');
        if (s.error && !s.health && !s.providers) return errorState(s.error, load);
        const hd = s.health || {};
        const provs = Array.isArray(s.providers) ? s.providers : (s.providers?.providers || []);
        return [
            PageHeader({ eyebrow: 'freddie', title: 'health', lede: 'system & provider health', right: hd.ok ? Chip({ tone: 'ok', children: 'healthy' }) : Chip({ tone: 'miss', children: 'degraded' }) }),
            s.error && (s.health || s.providers) ? refreshError(s.error) : null,
            section('checks', Object.keys(hd).length ? Table({ headers: ['check', 'status'], rows: Object.entries(hd).map(([k, v]) => [k, typeof v === 'object' ? truncJson(v) : (v === true ? Chip({ tone: 'ok', children: 'ok' }) : v === false ? Chip({ tone: 'miss', children: 'no' }) : String(v))]) }) : emptyState('no health data')),
            provs.length ? section('providers', Table({ headers: ['provider', 'status'], rows: provs.map(p => { const n = typeof p === 'string' ? p : p.name || p.id; const ok = typeof p === 'object' ? (p.ok ?? p.available) : null; return [n, ok == null ? '—' : (ok ? Chip({ tone: 'ok', children: 'up' }) : Chip({ tone: 'miss', children: 'down' }))]; }) })) : null,
        ].filter(Boolean);
    };
});

// ---- debug -----------------------------------------------------------------

// ---- logs --------------------------------------------------------------

const LOG_SEVERITY_TONE = { error: 'error', warning: 'warning', info: 'accent', debug: 'muted' };

export const logs = makePage((ctx) => {
    Object.assign(ctx.state, { lines: [], subsystems: [], activeSubsystem: '', activeSeverity: '', q: '', connected: false, wsError: null });
    const MAX_LINES = 500;

    async function loadSubsystems() {
        try { ctx.set({ subsystems: await api('/api/logs') }); }
        catch (e) { /* non-fatal: subsystem list is a filter convenience, not required for the stream */ }
    }

    let unmounted = false;
    let reconnectTimer = null;
    function connect() {
        if (unmounted) return;
        if (typeof WebSocket === 'undefined') { ctx.set({ wsError: new Error('WebSocket not available in this environment') }); return }
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(proto + '//' + location.host + '/api/logs/stream');
        ws.onopen = () => ctx.set({ connected: true, wsError: null });
        ws.onerror = () => ctx.set({ connected: false, wsError: new Error('log stream connection error') });
        ws.onclose = () => { ctx.set({ connected: false }); if (!unmounted) reconnectTimer = setTimeout(connect, 3000); };
        ws.onmessage = (ev) => {
            let rec; try { rec = JSON.parse(ev.data); } catch { return; }
            const next = [rec, ...ctx.state.lines].slice(0, MAX_LINES);
            ctx.set({ lines: next });
        };
        currentWs = ws;
    }
    let currentWs = null;

    loadSubsystems();
    connect();
    registerDebug('logs', () => ({ connected: ctx.state.connected, lineCount: ctx.state.lines.length, activeSubsystem: ctx.state.activeSubsystem, activeSeverity: ctx.state.activeSeverity }));
    ctx.onCleanup(() => {
        unmounted = true;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        try { currentWs?.close(); } catch {}
        unregisterDebug('logs');
    });

    function filtered() {
        const s = ctx.state;
        return s.lines.filter((l) => {
            if (s.activeSubsystem && l.subsystem !== s.activeSubsystem) return false;
            if (s.activeSeverity && l.severity !== s.activeSeverity) return false;
            if (s.q && !String(l.msg || '').toLowerCase().includes(s.q.toLowerCase())) return false;
            return true;
        });
    }

    return () => {
        const s = ctx.state;
        const rows = filtered();
        const severities = ['error', 'warning', 'info', 'debug'];
        return [
            PageHeader({
                eyebrow: 'freddie', title: 'logs', lede: 'live JSONL log tail — /api/logs/stream',
                right: s.connected ? Chip({ tone: 'ok', children: 'live' }) : Chip({ tone: 'miss', children: 'reconnecting…' }),
            }),
            s.wsError ? refreshError(s.wsError) : null,
            h('div', { class: 'ds-toolbar' },
                SearchInput({ value: s.q, placeholder: 'filter by message…', onInput: (v) => ctx.set({ q: v }), resultCount: rows.length }),
                Select({
                    label: 'subsystem', value: s.activeSubsystem, placeholder: 'all subsystems',
                    options: (s.subsystems || []).map((name) => ({ value: name, label: name })),
                    onChange: (v) => ctx.set({ activeSubsystem: v }),
                }),
                Select({
                    label: 'severity', value: s.activeSeverity, placeholder: 'all severities',
                    options: severities.map((sv) => ({ value: sv, label: sv })),
                    onChange: (v) => ctx.set({ activeSeverity: v }),
                }),
            ),
            rows.length ? section('lines · ' + rows.length,
                Table({
                    headers: ['time', 'subsystem', 'severity', 'message'],
                    rows: rows.map((l) => [
                        formatTime(l.ts ? Date.parse(l.ts) : Date.now()),
                        l.subsystem || '—',
                        Chip({ tone: LOG_SEVERITY_TONE[l.severity] || 'dim', children: l.severity || 'info' }),
                        truncSpan(l.msg, TRUNC_DESC),
                    ]),
                }),
            ) : emptyState(s.connected ? 'no log lines yet — waiting for activity' : 'connecting to log stream…'),
        ].filter(Boolean);
    };
});

// ---- debug -----------------------------------------------------------------

export const debug = makePage((ctx) => {
    Object.assign(ctx.state, { sub: null, logs: null });
    async function load() { try { ctx.set({ loading: false, data: await api('/api/debug'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    async function loadLogs(name) {
        ctx.set({ sub: name });
        try { ctx.set({ logs: await api('/api/logs/' + encodeURIComponent(name)) }); }
        catch (e) { ctx.set({ logs: { error: String(e.message || e) } }); }
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading debug snapshots…');
        if (s.error) return errorState(s.error, load);
        const d = s.data || {};
        const subsystems = d.subsystems || Object.keys(d);
        return [
            PageHeader({ eyebrow: 'freddie', title: 'debug', lede: 'subsystem snapshots & logs' }),
            section('subsystems', subsystems.length ? subsystems.map((name, i) => Row({
                key: i, title: name, onClick: () => loadLogs(name), active: s.sub === name,
            })) : emptyState('no debug subsystems')),
            s.sub ? section('logs · ' + s.sub, h('pre', { class: 'fd-pre' }, JSON.stringify(s.logs, null, 2))) : null,
        ].filter(Boolean);
    };
});

// ---- registry --------------------------------------------------------------

export const FREDDIE_PAGES = {
    home, chat, voice, sessions, projects, agents, analytics,
    models, cron, skills, config, env, tools, batch, gateway, chains,
    machines, health, debug, logs,
};

export { skillLabel, getRecentPaths, saveRecentPath, renderChatMessages };
