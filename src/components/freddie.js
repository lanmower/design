// Freddie page registry — REAL renderers (not stubs). Each page is a
// self-contained micro-app (see ./freddie/runtime.js) wired to freddie's
// gui-* plugin HTTP endpoints (/api/*). Consumers mount FREDDIE_PAGES[id]
// through their thin router; no per-page wiring needed downstream. This is
// the single maintenance point for freddie GUI per the dynamic-stack contract.

import * as webjsx from '../../vendor/webjsx/index.js';
import { makePage, api, loadingState, errorState, emptyState, refreshError } from './freddie/runtime.js';
import { getRecentPaths, saveRecentPath, skillLabel, renderChatMessages } from './freddie/helpers.js';
import { Panel, Row, Table, Kpi, PageHeader, SearchInput, TextField, Select } from './content.js';
import { Chip, Btn, Icon } from './shell.js';
import { formatTime } from '../locale.js';
import { register as registerDebug, unregister as unregisterDebug } from '../debug.js';
import { queueMessage, watchReconnect, isOnline } from '../idb-outbox.js';
import { ChatMessage, ChatComposer } from './chat.js';
import { fmtTime, fmtAgo } from './sessions.js';
import { ModelsConfig } from './models-config.js';
import { SkillsConfig } from './skills-config.js';
import { PluginsConfig } from './plugins-config.js';
import { GitStatusPanel, GitDiffView } from './git-status.js';
import { WorktreeSwitcher } from './worktree-switcher.js';
import { AgentChat } from './agent-chat.js';

const h = webjsx.createElement;

// ---- shared bits -----------------------------------------------------------

const section = (title, ...children) => Panel({ title, children: children.flat().filter(Boolean) });
const noteAlert = (note) => note ? h('div', { class: 'ds-alert ds-alert-' + note.kind, role: 'alert' },
    h('span', { class: 'ds-alert-icon' }, '!'),
    h('div', { class: 'ds-alert-content' }, note.msg)) : null;
// Manual refresh button for non-polling pages — parity with auto-refreshing ones.
const refreshBtn = (onClick, busy) => Btn({ children: busy ? 'refreshing…' : [Icon('refresh'), ' refresh'], disabled: !!busy, onClick, 'aria-label': 'refresh' });
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

// Parse a fetch Response body as a Server-Sent-Events frame stream. There is
// no EventSource-over-POST in browsers (EventSource only does GET, no custom
// headers/body), so a POST-based SSE consumer has to manually decode the
// ReadableStream and split on blank-line-terminated `event: X\ndata: Y\n\n`
// frames. No existing SSE-parsing utility exists elsewhere in this SDK
// (checked idb-outbox.js and grepped src/ for `text/event-stream`) -- this is
// the first, generic enough (event name + JSON.parse'd data) to reuse for any
// future SSE endpoint, not freddie-chat-specific in shape.
async function* parseSseStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            // Frames are separated by a blank line; a frame may itself contain
            // multiple `field: value` lines (event/data/id/retry) but this
            // server only ever emits one `event:` + one `data:` line per frame.
            let sep;
            while ((sep = buf.indexOf('\n\n')) !== -1) {
                const frame = buf.slice(0, sep);
                buf = buf.slice(sep + 2);
                let event = 'message', dataLines = [];
                for (const line of frame.split('\n')) {
                    if (line.startsWith('event:')) event = line.slice(6).trim();
                    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
                }
                if (!dataLines.length) continue;
                let data;
                try { data = JSON.parse(dataLines.join('\n')); } catch { data = dataLines.join('\n'); }
                yield { event, data };
            }
        }
    } finally {
        try { reader.releaseLock(); } catch { /* stream already closed/errored */ }
    }
}

// Map a freddie tool_progress SSE payload ({name, args, partial}) to an
// AgentChat tool part. There is no matching id to correlate a later
// "done" state (freddie's stream has no discrete tool-start/tool-end pair --
// tool_progress fires zero-or-more times per call while it runs, and the
// authoritative role:'tool' result only arrives batched in the final
// `message`/`done` events) so every progress part renders as 'running'; the
// turn-settle pass below promotes matching parts to 'done'/'error' once the
// real tool_call_id/content pairs are known.
function toolProgressPart(payload) {
    return { kind: 'tool', name: payload.name || 'tool', args: payload.args || {}, status: 'running' };
}

// After `done`, freddie's persisted message list is the source of truth:
// walk it and rebuild the assistant turn's parts as interleaved
// text/tool/tool_result, replacing the provisional tool_progress-only parts
// accumulated during streaming. assistant messages with tool_calls become
// running tool parts (by call id); role:'tool' messages settle the matching
// part to done/error by tool_call_id.
function partsFromMessages(assistantAndToolMessages) {
    const parts = [];
    const byId = new Map();
    for (const m of assistantAndToolMessages) {
        if (m.role === 'assistant') {
            if (m.content) parts.push({ kind: 'md', text: m.content });
            for (const tc of (m.tool_calls || [])) {
                const part = { kind: 'tool', _id: tc.id, name: tc.name || tc.function?.name || 'tool', args: tc.arguments || tc.function?.arguments || {}, status: 'running' };
                parts.push(part);
                if (tc.id) byId.set(tc.id, part);
            }
        } else if (m.role === 'tool') {
            const target = m.tool_call_id ? byId.get(m.tool_call_id) : null;
            let content = m.content;
            let isError = false;
            try { const parsed = JSON.parse(content); if (parsed && parsed.error) { isError = true; } } catch { /* not JSON, leave as-is */ }
            if (target) { target.result = content; target.status = isError ? 'error' : 'done'; target.error = isError || undefined; }
            else parts.push({ kind: 'tool_result', name: 'result', result: content, error: isError || undefined, status: isError ? 'error' : 'done' });
        }
    }
    return parts;
}

export const chat = makePage((ctx) => {
    Object.assign(ctx.state, { loading: false, messages: [], draft: '', busy: false, error: null, abort: null });

    // Offline outbox: a prompt sent while genuinely offline queues to
    // IndexedDB and auto-flushes on the real 'online' event, rather than
    // surfacing a hard error the user can't act on. True offline LLM
    // response generation is impossible by definition -- a queued message
    // only gets a reply once connectivity actually returns. Reconnect-flush
    // still goes through the single-shot JSON path (no live UI to stream
    // into for a message sent while this page may not even be mounted).
    async function sendQueuedToServer(body) {
        const r = await api('/api/chat', { method: 'POST', body });
        const reply = r.result || r.content || r.message || (r.messages && r.messages.at(-1)?.content) || JSON.stringify(r);
        ctx.state.messages.push({ id: 'a' + Date.now(), role: 'assistant', content: String(reply), time: formatTime(Date.now()) });
        ctx.rerender();
    }
    watchReconnect('chat', sendQueuedToServer);

    async function send(text) {
        const t = (typeof text === 'string' ? text : ctx.state.draft || '').trim();
        if (!t || ctx.state.busy) return;
        const userMsg = { id: 'u' + Date.now(), role: 'user', content: t, time: formatTime(Date.now()) };
        const curMsg = { id: 'a' + (Date.now() + 1), role: 'assistant', content: '', time: formatTime(Date.now()), parts: [] };
        ctx.state.messages = [...ctx.state.messages, userMsg, curMsg];
        ctx.set({ draft: '', busy: true, error: null });

        if (!isOnline()) {
            await queueMessage('chat', { prompt: t });
            ctx.state.messages = ctx.state.messages.slice(0, -1);
            ctx.state.messages.push({ id: curMsg.id, role: 'assistant', content: '(offline -- queued, will send when connection returns)', time: formatTime(Date.now()) });
            ctx.set({ busy: false });
            return;
        }

        const ctrl = new AbortController();
        ctx.state.abort = ctrl;
        const cur = ctx.state.messages[ctx.state.messages.length - 1];
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
                body: JSON.stringify({ prompt: t, sessionId: ctx.state.sessionId || undefined }),
                signal: ctrl.signal,
            });
            if (!res.ok || !res.body) {
                const txt = await res.text().catch(() => '');
                throw new Error(txt || ('HTTP ' + res.status));
            }
            let finalMessages = null;
            for await (const { event, data } of parseSseStream(res)) {
                if (ctrl.signal.aborted) break;
                if (event === 'start') {
                    if (data && data.sessionId) ctx.state.sessionId = data.sessionId;
                } else if (event === 'tool_progress') {
                    cur.parts.push(toolProgressPart(data || {}));
                    ctx.rerender();
                } else if (event === 'message') {
                    // Buffered per-message events land right before `done` -- accumulate
                    // rather than rerender per-message; the final rebuild below is O(1)
                    // extra work and avoids a flurry of rerenders in the same tick.
                    (finalMessages || (finalMessages = [])).push(data);
                } else if (event === 'error') {
                    cur.error = String((data && data.error) || 'stream error');
                    ctx.rerender();
                } else if (event === 'done') {
                    if (finalMessages && finalMessages.length) {
                        cur.parts = partsFromMessages(finalMessages);
                        // Prefer the settled assistant text as plain content when the
                        // rebuilt parts carry exactly one md part (the common no-tool-call
                        // case) -- keeps AgentChat's md-vs-content dedup path simple.
                        cur.content = '';
                    } else if (data && data.result) {
                        cur.content = String(data.result);
                    }
                    ctx.rerender();
                }
            }
        } catch (e) {
            if (e && e.name === 'AbortError') {
                cur.stopped = true;
            } else {
                cur.error = String(e && e.message || e);
            }
        } finally {
            ctx.state.abort = null;
            ctx.set({ busy: false });
        }
    }

    function stop() {
        if (ctx.state.abort) { try { ctx.state.abort.abort(); } catch { /* already settled */ } }
    }

    return () => {
        const s = ctx.state;
        return h('div', { class: 'fd-chat' },
            AgentChat({
                messages: s.messages,
                busy: s.busy,
                draft: s.draft,
                status: s.busy ? 'streaming…' : 'ready',
                agentName: 'freddie',
                placeholder: s.busy ? 'waiting for reply…' : 'message…',
                showMinimap: true,
                banners: s.error ? [noteAlert({ kind: 'error', msg: s.error })] : [],
                onInput: (v) => { s.draft = v; },
                onSend: send,
                onStop: stop,
                onNewChat: () => ctx.set({ messages: [], draft: '', error: null, sessionId: null }),
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
    Object.assign(ctx.state, { rebuilding: false, selectedProviderId: null, selectedModel: null });
    // GET /api/models/availability — the real per-(provider x model x mode)
    // availability matrix (plugins/gui-models-discover), per freddie's AGENTS.md
    // "Model availability matrix" section. 404 with {error,hint} when the
    // matrix file hasn't been built yet — ModelsConfig itself renders that
    // as an empty state with a "build availability matrix" action.
    async function load() {
        try { ctx.set({ loading: false, data: await api('/api/models/availability'), error: null }); }
        catch (e) { ctx.set({ loading: false, data: null, error: (e && e.body) || e }); }
    }
    async function rebuild() {
        if (ctx.state.rebuilding) return;
        ctx.set({ rebuilding: true, rebuildError: null });
        try { await api('/api/models/availability/rebuild', { method: 'POST', body: {} }); await load(); }
        catch (e) { ctx.set({ rebuildError: e }); }
        ctx.set({ rebuilding: false });
    }
    load();
    return () => {
        const s = ctx.state;
        return [
            PageHeader({ eyebrow: 'freddie', title: 'models', lede: s.data ? (s.data.summary?.total_models ?? 0) + ' models across ' + (s.data.summary?.total_providers ?? 0) + ' providers' : 'model availability matrix' }),
            ModelsConfig({
                data: s.data, loading: s.loading, error: s.error,
                selectedProviderId: s.selectedProviderId, onSelectProvider: (id) => ctx.set({ selectedProviderId: id, selectedModel: null }),
                selectedModel: s.selectedModel, onSelectModel: (m) => ctx.set({ selectedModel: m }),
                onRefresh: load, onRebuild: rebuild, rebuilding: s.rebuilding, rebuildError: s.rebuildError,
            }),
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
    Object.assign(ctx.state, { selected: null, query: '', busyName: null });
    async function load() { try { ctx.set({ loading: false, list: await api('/api/skills'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        // GET /api/skills returns {home:[...], bundled:[...], skillState} —
        // two source lists (user ~/.freddie/skills vs bundled skills/ dirs)
        // plus a per-skill enabled/disabled state map, not a flat array.
        // Concat both sources (home overrides bundled on name collision,
        // matching src/skills/index.js's own findSkill() precedence) and
        // resolve enabled state from skillState (default true when absent).
        const raw = s.list && typeof s.list === 'object' ? s.list : {};
        const rawList = Array.isArray(raw) ? raw : [...(raw.bundled || []), ...(raw.home || [])];
        const skillState = raw.skillState || {};
        const mapped = rawList.map((sk) => ({
            file: sk.file || sk.path || sk.name,
            name: sk.name,
            description: sk.description || (sk.frontmatter && sk.frontmatter.description) || '',
            platforms: sk.platforms || (sk.frontmatter && sk.frontmatter.platforms),
            enabled: skillState[sk.name] !== false,
        }));
        return [
            PageHeader({ eyebrow: 'freddie', title: 'skills', lede: mapped.length + ' skills' }),
            SkillsConfig({
                skills: mapped, selected: s.selected, loading: s.loading, error: s.error,
                busyName: s.busyName, query: s.query, onQuery: (q) => ctx.set({ query: q }),
                onSelect: (name) => ctx.set({ selected: s.selected === name ? null : name }),
            }),
        ];
    };
});

// ---- plugins -----------------------------------------------------------------

export const plugins = makePage((ctx) => {
    Object.assign(ctx.state, { selected: null });
    // GET /api/plugins — flat {name,version,surfaces,requires,source,enabled}
    // list, per plugins/gui-plugins-list/plugin.js (distinct from
    // /api/plugin-graph's D3 {nodes,edges} shape built for the dependency
    // visualization, not a flat list UI).
    async function load() { try { ctx.set({ loading: false, list: await api('/api/plugins'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        const list = Array.isArray(s.list) ? s.list : (s.list?.plugins || []);
        return [
            PageHeader({ eyebrow: 'freddie', title: 'plugins', lede: list.length + ' plugins loaded' }),
            PluginsConfig({
                plugins: list, selected: s.selected, loading: s.loading, error: s.error,
                onSelect: (name) => ctx.set({ selected: s.selected === name ? null : name }),
                onReload: load,
            }),
        ];
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
        catch (e) { /* swallow: non-fatal, subsystem list is a filter convenience, not required for the stream */ }
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
        try { currentWs?.close(); } catch { /* swallow: teardown-only close, socket may already be closed/closing */ }
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

// ---- git ---------------------------------------------------------------

export const git = makePage((ctx) => {
    Object.assign(ctx.state, { cwd: null, status: null, log: null, worktrees: null, diff: null, activeFile: null, diffLoading: false, note: null });
    async function load() {
        try {
            const proj = await api('/api/projects').catch(() => null);
            const active = proj && proj.active;
            const cwd = (active && typeof active === 'object' ? active.path : null) || ctx.state.cwd || '';
            const qs = '?cwd=' + encodeURIComponent(cwd);
            const [status, log, worktrees] = await Promise.all([
                api('/api/git/status' + qs).catch((e) => ({ _err: e })),
                api('/api/git/log' + qs + '&limit=20').catch((e) => ({ _err: e })),
                api('/api/worktree' + qs).catch((e) => ({ _err: e })),
            ]);
            ctx.set({ loading: false, cwd, status, log, worktrees, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function openDiff(file) {
        ctx.set({ activeFile: file.path, diffLoading: true, diff: null });
        try {
            const qs = '?cwd=' + encodeURIComponent(ctx.state.cwd || '') + '&file=' + encodeURIComponent(file.path);
            const res = await api('/api/git/diff' + qs);
            ctx.set({ diff: res, diffLoading: false });
        } catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) }, diffLoading: false }); }
    }
    async function createWorktree() {
        const path = (ctx.state.newWtPath || '').trim();
        const branch = (ctx.state.newWtBranch || '').trim();
        if (!path) { ctx.set({ note: { kind: 'warn', msg: 'path required' } }); return; }
        ctx.set({ busy: true, note: null });
        try {
            await api('/api/worktree', { method: 'POST', body: { cwd: ctx.state.cwd || '', path, branch: branch || undefined } });
            ctx.state.newWtPath = ''; ctx.state.newWtBranch = '';
            await load();
        } catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading git status…');
        if (s.error && !s.status) return errorState(s.error, load);
        const statusFailed = s.status && s.status._err;
        const logFailed = s.log && s.log._err;
        const wtFailed = s.worktrees && s.worktrees._err;
        const files = statusFailed ? [] : (s.status && s.status.files) || [];
        const commits = logFailed ? [] : (s.log && s.log.commits) || s.log || [];
        const worktrees = wtFailed ? [] : (s.worktrees && s.worktrees.worktrees) || s.worktrees || [];
        const current = Array.isArray(worktrees) ? (worktrees.find(w => w.path === s.cwd) || {}).path : undefined;
        return [
            PageHeader({ eyebrow: 'freddie', title: 'git', lede: s.cwd || 'active project' }),
            noteAlert(s.note),
            statusFailed ? refreshError(statusFailed) : null,
            section('worktrees',
                WorktreeSwitcher({
                    worktrees: Array.isArray(worktrees) ? worktrees : [],
                    current,
                    onSwitch: () => {},
                    onCreate: () => ctx.set({ showWtForm: !s.showWtForm }),
                }),
                s.showWtForm ? h('div', { class: 'fd-row-actions' },
                    TextField({ label: 'path', value: s.newWtPath, onInput: (v) => { s.newWtPath = v; }, placeholder: '/path/to/worktree' }),
                    TextField({ label: 'branch (optional)', value: s.newWtBranch, onInput: (v) => { s.newWtBranch = v; }, placeholder: 'feature/x' }),
                    Btn({ variant: 'primary', disabled: s.busy, children: s.busy ? 'working…' : 'create', onClick: createWorktree })) : null),
            section('changed files',
                statusFailed ? errorState(statusFailed) : GitStatusPanel({ files, onFileClick: openDiff, active: s.activeFile })),
            section('diff' + (s.activeFile ? ' · ' + s.activeFile : ''),
                s.diffLoading ? loadingState('loading diff…')
                    : s.diff ? GitDiffView({ diff: s.diff.diff || s.diff, filename: s.activeFile })
                        : emptyState('select a file to view its diff')),
            section('log',
                logFailed ? errorState(logFailed)
                    : commits.length
                        ? Table({ headers: ['sha', 'message', 'author', 'date'], rows: commits.slice(0, 20).map(c => [String(c.sha || c.hash || '').slice(0, 8), truncSpan(c.message || c.subject, TRUNC_SUB), c.author || '', c.date ? fmtAgo(c.date) : ''])})
                        : emptyState('no commits')),
        ].filter(Boolean);
    };
});

// ---- registry --------------------------------------------------------------

export const FREDDIE_PAGES = {
    home, chat, voice, sessions, projects, agents, analytics,
    models, cron, skills, plugins, config, env, tools, batch, gateway, chains,
    machines, health, debug, logs, git,
};

export { skillLabel, getRecentPaths, saveRecentPath, renderChatMessages };
