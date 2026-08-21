// Freddie conversational pages: the `chat` agent-workspace page (WebSocket
// over the freddie wire protocol — replay + live turn events + prompt/steer/
// cancel/approve, no more 120s POST ceiling) and the `voice` backend probe.
//
// Transport: WS /api/agent/stream?sessionId=<id> (plugins/gui/gui-agent).
// The page owns the session id (generated client-side so the socket can
// subscribe BEFORE the first prompt) and rebuilds its transcript from the
// server's wire log on (re)connect, so a refresh mid-turn loses nothing.
// The legacy POST /api/chat path remains only for the offline outbox flush.
//
// Event -> transcript mapping (freddie wire envelope {v,event,sessionId,ts,data}):
//   message.append(user|assistant)  -> thread messages
//   tool.start / tool.end           -> interleaved tool cards (running -> done/error)
//   approval.request / .resolved    -> ApprovalNode cards (approve/always/reject)
//   steer.append                    -> user message (mid-turn injection)
//   session.error                   -> error pinned to the live assistant turn

import * as webjsx from '../../../vendor/webjsx/index.js';
import { makePage, api, loadingState, emptyState } from './runtime.js';
import { Table, PageHeader } from '../content.js';
import { Chip } from '../shell.js';
import { formatTime } from '../../locale.js';
import { queueMessage, watchReconnect, isOnline } from '../../idb-outbox.js';
import { AgentChat } from '../agent-chat.js';
import { WorkspaceShell, WorkspaceRail } from '../shell/workspace-shell.js';
import { ConversationList } from '../sessions/conversation-list.js';
import { section, noteAlert } from './shared.js';

const h = webjsx.createElement;

function newSessionId() {
    return (crypto.randomUUID ? crypto.randomUUID() : 's' + Date.now().toString(36) + Math.random().toString(16).slice(2));
}

// Persist the active chat session id across a page reload. Without this, a
// refresh always minted a brand-new random sessionId (newSessionId() has no
// memory of what came before), so "a refresh mid-turn loses nothing" — this
// module's own header comment — was never actually true: the WS replay this
// page relies on to rebuild the transcript only has anything to replay when
// it reconnects under the SAME id the prior page load was using.
const CHAT_SESSION_KEY = 'fd-chat-session-id';
function readStoredSessionId() {
    try { return localStorage.getItem(CHAT_SESSION_KEY) || null; } catch { return null; }
}
function storeSessionId(id) {
    try { if (id) localStorage.setItem(CHAT_SESSION_KEY, id); } catch { /* persistence is best-effort */ }
}

// Apply one wire envelope to a messages array (shared by replay rebuild and
// the live stream). `sendApprove` is only needed for live approval cards.
function applyEnvelope(msgs, env, sendApprove, sendAnswer) {
    const { event, data } = env;
    const ts = new Date(env.ts).getTime();
    const lastAssistant = () => { for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'assistant') return msgs[i]; return null; };
    // The page echoes its own sends into the thread optimistically; the server
    // then emits the SAME user/steer text as an authoritative event. The local
    // echo is followed by the placeholder assistant bubble, so scan back past
    // it (and any parts) for a matching user message before appending a dupe.
    const isDupUser = (text) => {
        for (let i = msgs.length - 1; i >= 0 && i >= msgs.length - 3; i--) {
            if (msgs[i].role === 'user' && msgs[i].content === (text || '')) return true;
        }
        return false;
    };
    if (event === 'message.append') {
        if (data.role === 'user') { if (!isDupUser(data.content)) msgs.push({ id: 'u' + msgs.length + env.ts, role: 'user', content: data.content || '', time: formatTime(ts) }); }
        else if (data.role === 'assistant') {
            // A new assistant turn starts after a user message; consecutive
            // assistant appends within one turn update the SAME bubble. Scan
            // back to the last ASSISTANT message rather than assuming it's
            // literally last in the array -- a mid-turn queue/steer push
            // appends a user message after the live bubble, and array-end
            // would then miss it and spawn a duplicate, orphaned bubble.
            const last = lastAssistant();
            if (last && last._live) { if (data.content) last.content = data.content; }
            else msgs.push({ id: 'a' + msgs.length + env.ts, role: 'assistant', content: data.content || '', parts: [], time: formatTime(ts), _live: true });
        }
    } else if (event === 'steer.append') {
        if (!isDupUser(data.text)) msgs.push({ id: 'u' + msgs.length + env.ts, role: 'user', content: data.text || '', time: formatTime(ts) });
    } else if (event === 'queue.append') {
        if (!isDupUser(data.text)) msgs.push({ id: 'u' + msgs.length + env.ts, role: 'user', content: data.text || '', time: formatTime(ts) });
    } else if (event === 'assistant.delta') {
        // Progressive text mid-turn: accumulate into the live bubble; the
        // settled message.append at turn end overwrites with the authoritative
        // full content, so a dropped delta never corrupts the transcript.
        const a = lastAssistant(); if (a && a._live) a.content = (a.content || '') + (data.text || '');
    } else if (event === 'tool.start') {
        const a = lastAssistant(); if (a) (a.parts || (a.parts = [])).push({ kind: 'tool', name: data.name || 'tool', args: data.args || {}, status: 'running', _tcid: data.toolCallId });
    } else if (event === 'tool.end') {
        const a = lastAssistant(); if (a) {
            const p = (a.parts || []).find(p => p.kind === 'tool' && p._tcid === data.toolCallId);
            if (p) {
                p.status = data.denied ? 'error' : 'done';
                p.result = data.denied ? 'denied by user' : (typeof data.result === 'string' ? data.result : JSON.stringify(data.result ?? '', null, 2));
                if (data.denied) p.error = true;
            }
        }
    } else if (event === 'approval.request') {
        const a = lastAssistant(); if (a) (a.parts || (a.parts = [])).push({ kind: 'approval', id: data.id, name: data.name, args: data.args || {}, status: 'pending', onResolve: sendApprove ? (d) => sendApprove(data.id, d) : null });
    } else if (event === 'approval.resolved') {
        const a = lastAssistant(); if (a) {
            const p = (a.parts || []).find(p => p.kind === 'approval' && p.id === data.id);
            if (p) { p.status = data.approved ? 'approved' : 'rejected'; p.always = !!data.always; p.onResolve = null; }
        }
    } else if (event === 'question.request') {
        const a = lastAssistant(); if (a) (a.parts || (a.parts = [])).push({ kind: 'question', id: data.id, questions: data.questions || [], status: 'pending', onResolve: sendAnswer ? (d) => sendAnswer(data.id, d) : null });
    } else if (event === 'question.resolved') {
        const a = lastAssistant(); if (a) {
            const p = (a.parts || []).find(p => p.kind === 'question' && p.id === data.id);
            if (p) { p.status = data.rejected ? 'rejected' : 'answered'; p.answers = data.answers || {}; p.onResolve = null; }
        }
    } else if (event === 'session.end') {
        // Turn-boundary marker, emitted once per completed turn
        // (src/agent/turn_driver.js's emitTurnEvent) and persisted to the
        // wire log this function replays. Clearing _live HERE (as the loop
        // reaches it) rather than only once after the whole loop is what
        // keeps the message.append merge check above turn-scoped during
        // replay: without it, a still-`_live`-flagged bubble from an
        // earlier, already-finished turn would wrongly absorb a LATER
        // turn's reply (lastAssistant() finds it regardless of how many
        // intervening user/steer/queue messages sit between them).
        const a = lastAssistant(); if (a) delete a._live;
    } else if (event === 'session.error') {
        const a = lastAssistant();
        const err = data.error || 'session error';
        if (a && a._live) { a.error = err; delete a._live; }
        else msgs.push({ id: 'e' + env.ts, role: 'assistant', content: '', error: err, time: formatTime(ts) });
    }
}

function noteTty(st, env) {
    const event = env.event, data = env.data || {};
    if (event === 'tool.start') {
        const args = data.args != null ? ' ' + JSON.stringify(data.args).slice(0, 240) : '';
        st.tty = [...(st.tty || []), '$ ' + (data.name || 'tool') + args];
    } else if (event === 'tool.end') {
        const out = data.denied ? 'denied' : (typeof data.result === 'string' ? data.result : JSON.stringify(data.result ?? ''));
        st.tty = [...(st.tty || []), String(out).slice(0, 4000)];
    }
}

export const chat = makePage((ctx) => {
    Object.assign(ctx.state, { loading: false, messages: [], draft: '', busy: false, error: null, sessionId: readStoredSessionId(), ws: null, conn: 'closed', sessions: [], staged: [], workspaceFiles: [], stagedFiles: [], searchOpen: false, searchQuery: '', searchHit: 0, cwd: '', cwdEditing: false, cwdDraft: '', model: '', models: [], tty: [] });
    let unmounted = false;
    try {
        const bootSid = sessionStorage.getItem('fd_open_session');
        if (bootSid) { ctx.state.sessionId = bootSid; sessionStorage.removeItem('fd_open_session'); }
    } catch { /* sessionStorage may be unavailable */ }

    // Session picker (kimi web's sessions sidebar, compact form): recent
    // conversations from /api/sessions, needsInput badges included. Picking
    // one reconnects the WS under that id and rebuilds from server replay.
    api('/api/sessions').then(rows => { ctx.state.sessions = Array.isArray(rows) ? rows : []; ctx.rerender(); }).catch(() => { /* swallow: picker degrades to new-chat-only */ });
    Promise.all([api('/api/models/cached').catch(() => ({})), api('/api/config').catch(() => ({}))]).then(([cached, cfg]) => {
        const models = []; const seen = new Set();
        for (const p of (cfg.agent && cfg.agent.model_preference) || []) {
            const id = [p.provider, p.model].filter(Boolean).join('/');
            if (id && !seen.has(id)) { seen.add(id); models.push({ id, name: id }); }
        }
        for (const [prov, rec] of Object.entries(cached || {})) {
            for (const m of rec.models || []) {
                const id = prov + '/' + m;
                if (!seen.has(id)) { seen.add(id); models.push({ id, name: id }); }
            }
        }
        ctx.state.models = models.slice(0, 40);
        if (!ctx.state.model && models[0]) ctx.state.model = models[0].id;
        ctx.rerender();
    });

    // @-mention file autocomplete (kimi web parity): workspace file list for
    // the active session's cwd, feeding AgentChat's existing mentionFiles prop.
    // Re-fetched on session switch since each session may have a different cwd.
    function loadWorkspaceFiles(sid) {
        if (!sid) { ctx.state.workspaceFiles = []; return; }
        api('/api/sessions/' + encodeURIComponent(sid) + '/workspace-files').then(r => {
            ctx.state.workspaceFiles = (r && Array.isArray(r.files)) ? r.files : [];
            ctx.rerender();
        }).catch(() => { /* swallow: mention autocomplete degrades to no suggestions */ });
    }

    // File upload (kimi web parity): files are staged to disk via the gui-agent
    // endpoint and ride the next prompt frame as path references — the agent
    // reads them with its file tools, so no model-capability negotiation here.
    async function attachFiles(fileList) {
        const st = ctx.state;
        if (!st.sessionId) st.sessionId = newSessionId();
        for (const file of fileList || []) {
            try {
                const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
                const base64 = String(dataUrl).split(',')[1] || '';
                const r = await api('/api/sessions/' + encodeURIComponent(st.sessionId) + '/files', { method: 'POST', body: { name: file.name, contentBase64: base64 } });
                if (r && r.path) { st.staged = [...st.staged, { name: r.name || file.name, path: r.path }]; }
            } catch (e) { ctx.set({ error: 'upload failed: ' + (e && e.message || e) }); }
        }
        loadStagedFiles(st.sessionId);
        ctx.rerender();
    }

    // Staged (uploaded) files, read half of the same store attachFiles writes
    // to — GET /api/sessions/:id/staged-files (plugins/gui/gui-agent), listed
    // in the pane with a download link per file (kimi web session-files-panel
    // parity: upload, see it listed, download it back).
    function loadStagedFiles(sid) {
        if (!sid) { ctx.state.stagedFiles = []; return; }
        api('/api/sessions/' + encodeURIComponent(sid) + '/staged-files').then(r => {
            ctx.state.stagedFiles = (r && Array.isArray(r.files)) ? r.files : [];
            ctx.rerender();
        }).catch(() => { /* swallow: panel degrades to empty */ });
    }

    function switchSession(id) {
        const st = ctx.state;
        if (!id || id === st.sessionId) return;
        try { st.ws && st.ws.close(); } catch { /* already closed */ }
        ctx.set({ sessionId: id, messages: [], ws: null, conn: 'closed', busy: false, error: null });
        storeSessionId(id);
        ensureWs();
        loadWorkspaceFiles(id);
        loadStagedFiles(id);
    }

    // Offline outbox: a prompt sent while genuinely offline queues to
    // IndexedDB and auto-flushes on the real 'online' event via the legacy
    // single-shot POST path (no live UI to stream into for a message sent
    // while this page may not even be mounted).
    async function sendQueuedToServer(body) {
        const r = await api('/api/chat', { method: 'POST', body });
        const reply = r.result || r.content || r.message || (r.messages && r.messages.at(-1)?.content) || JSON.stringify(r);
        ctx.state.messages.push({ id: 'a' + Date.now(), role: 'assistant', content: String(reply), time: formatTime(Date.now()) });
        ctx.rerender();
    }
    watchReconnect('chat', sendQueuedToServer);

    // Cmd/Ctrl+F opens the in-conversation search overlay instead of the
    // browser's own find-in-page (kimi web message-search-dialog parity) —
    // distinct from the existing Cmd+K command palette (a different surface).
    const onKeydown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
            e.preventDefault();
            ctx.state.searchOpen = true;
            ctx.rerender();
        }
    };
    document.addEventListener('keydown', onKeydown);

    ctx.onCleanup(() => {
        unmounted = true;
        document.removeEventListener('keydown', onKeydown);
        try { ctx.state.ws && ctx.state.ws.close(); } catch { /* already closed */ }
    });

    const s = () => ctx.state;
    // The "current" message for turn-lifecycle handlers (prompt.done/error/
    // onclose/stop) is the live assistant bubble, not literally the array's
    // last element -- a mid-turn queue/steer push appends a user message
    // after it, and array-end would then target the wrong message (or none).
    const cur = () => { const msgs = s().messages; for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'assistant') return msgs[i]; return null; };

    function sendFrame(obj) {
        const ws = s().ws;
        if (!ws) return false;
        if (ws.readyState === 1) { ws.send(JSON.stringify(obj)); return true; }
        if (ws.readyState === 0) { ws.addEventListener('open', () => ws.send(JSON.stringify(obj)), { once: true }); return true; }
        return false;
    }

    // Built once so both the replay rebuild and the live event stream wire up
    // the SAME resolve behavior -- a replayed approval.request/question.request
    // with no matching .resolved later in the same replay is a genuinely
    // still-pending decision (e.g. the page reloaded mid-turn), and its
    // Approve/Reject/Submit buttons must actually work, not silently no-op.
    const sendApprove = (id, d) => { ensureWs(); return sendFrame({ type: 'approve', id, approved: d.approved, always: !!d.always }); };
    const sendAnswer = (id, d) => { ensureWs(); return sendFrame({ type: 'answer', id, answers: d.answers || {}, rejected: !!d.rejected }); };

    function ensureWs() {
        if (unmounted) return null;
        const st = s();
        if (!st.sessionId) st.sessionId = newSessionId();
        storeSessionId(st.sessionId);
        if (st.ws && (st.ws.readyState === 1 || st.ws.readyState === 0)) return st.ws;
        try {
            const proto = location.protocol === 'https:' ? 'wss' : 'ws';
            const ws = new WebSocket(proto + '://' + location.host + '/api/agent/stream?sessionId=' + encodeURIComponent(st.sessionId));
            st.ws = ws;
            // switchSession/onNew/onNewChat close the old socket then install a
            // new one synchronously; close() is async, so the OLD socket's
            // onclose/onopen/onmessage/onerror can still fire after a newer
            // socket already replaced it in state. Every handler below bails
            // out if it's no longer the socket ctx.state actually holds, so a
            // late event from a superseded connection can't corrupt the
            // current session's busy/conn/message state.
            const isCurrent = () => s().ws === ws;
            ws.onopen = () => { if (!isCurrent()) return; st.conn = 'open'; ctx.rerender(); };
            ws.onmessage = (e) => {
                if (!isCurrent()) return;
                let f; try { f = JSON.parse(e.data); } catch { return; }
                if (f.type === 'replay') {
                    // Rebuild from the server's wire log only when the local
                    // thread is empty (first mount / refresh), never clobber a
                    // live thread with a reconnect's replay.
                    if (!st.messages.length && f.events && f.events.length) {
                        const msgs = [];
                        st.tty = [];
                        for (const env of f.events) { applyEnvelope(msgs, env, sendApprove, sendAnswer); noteTty(st, env); }
                        // applyEnvelope's session.end/session.error cases already
                        // clear _live per completed turn as the loop reaches them
                        // (see there for why that must happen INSIDE the loop, not
                        // after it). Do NOT blanket-strip _live here: doing so
                        // would make lastAssistant()'s merge check above match a
                        // stale bubble from an earlier turn instead of correctly
                        // starting a new one. Deliberately NOT inferring st.busy
                        // from a leftover _live bubble here -- this file has no
                        // verified guarantee that every turn-termination path
                        // (e.g. a user-initiated stop()) writes a session.end/
                        // .error to the wire log, and wrongly forcing busy=true
                        // with no live turn left to resolve it would permanently
                        // stick the composer in queue-only mode with no way back.
                        st.messages = msgs;
                    }
                    ctx.rerender();
                } else if (f.type === 'event') {
                    applyEnvelope(st.messages, f, sendApprove, sendAnswer);
                    noteTty(st, f);
                    ctx.rerender();
                } else if (f.type === 'prompt.done') {
                    const c = cur();
                    if (c && c.role === 'assistant') {
                        delete c._live;
                        if (f.error && !c.error) c.error = f.error;
                    }
                    ctx.set({ busy: false });
                    // New turns can create/rename sessions — refresh the picker.
                    api('/api/sessions').then(rows => { ctx.state.sessions = Array.isArray(rows) ? rows : []; ctx.rerender(); }).catch(() => { /* swallow: picker refresh is best-effort */ });
                } else if (f.type === 'error') {
                    const c = cur();
                    if (c && c.role === 'assistant') { c.error = f.error; delete c._live; }
                    ctx.set({ busy: false });
                }
            };
            ws.onclose = () => {
                if (!isCurrent()) return;
                st.conn = 'closed';
                if (st.busy) {
                    const c = cur();
                    if (c && c.role === 'assistant') { delete c._live; c.incomplete = true; }
                    ctx.set({ busy: false });
                }
                ctx.rerender();
            };
            ws.onerror = () => { if (!isCurrent()) return; st.conn = 'closed'; };
            return ws;
        } catch { return null; }
    }

    async function send(text) {
        const t = (typeof text === 'string' ? text : s().draft || '').trim();
        if (!t) return;

        // Mid-turn send = QUEUE for after the turn (kimi 1.31's Enter channel);
        // injection mid-turn is /steer in the REPL or a wire steer frame.
        if (s().busy) {
            if (sendFrame({ type: 'queue', text: t })) {
                s().messages = [...s().messages, { id: 'u' + Date.now(), role: 'user', content: t, time: formatTime(Date.now()) }];
                ctx.set({ draft: '' });
            }
            return;
        }

        const userMsg = { id: 'u' + Date.now(), role: 'user', content: t, time: formatTime(Date.now()) };
        const curMsg = { id: 'a' + (Date.now() + 1), role: 'assistant', content: '', time: formatTime(Date.now()), parts: [], _live: true };
        s().messages = [...s().messages, userMsg, curMsg];
        ctx.set({ draft: '', busy: true, error: null });

        if (!isOnline()) {
            await queueMessage('chat', { prompt: t });
            s().messages = s().messages.slice(0, -1);
            s().messages.push({ id: curMsg.id, role: 'assistant', content: '(offline -- queued, will send when connection returns)', time: formatTime(Date.now()) });
            ctx.set({ busy: false });
            return;
        }

        if (!ensureWs() || !sendFrame({ type: 'prompt', text: t, cwd: s().cwd || undefined, model: s().model || undefined, attachments: s().staged.map(f => ({ name: f.name, path: f.path })) })) {
            curMsg.error = 'agent workspace connection unavailable';
            delete curMsg._live;
            ctx.set({ busy: false });
            return;
        }
        ctx.set({ staged: [] });
    }

    function stop() {
        ensureWs();
        const sent = sendFrame({ type: 'cancel' });
        // Only claim "stopped" when the cancel frame actually went out --
        // otherwise the bubble falsely reads as stopped while the turn (and
        // busy state) keeps running server-side with no cancel ever received.
        if (sent) {
            const c = cur();
            if (c && c.role === 'assistant') c.stopped = true;
        }
        ctx.rerender();
    }

    // Session files panel (kimi web parity): read-only listing of the active
    // session's workspace files, reusing the same workspaceFiles state the
    // composer's @-mention feature already fetches — one fetch, two consumers.
    function sessionFilesPanel() {
        const st = s();
        if (!st.sessionId) return h('div', { class: 'fd-session-files fd-session-files-empty' }, 'No session selected.');
        const staged = st.stagedFiles.length ? h('div', { key: 'staged', class: 'fd-session-files-section' },
            h('div', { class: 'fd-session-files-head' }, 'attached (' + st.stagedFiles.length + ')'),
            h('ul', { class: 'fd-session-files-list' },
                ...st.stagedFiles.map(f => h('li', { key: 'sf-' + f.name, class: 'fd-session-files-row' },
                    h('a', { href: '/api/sessions/' + encodeURIComponent(st.sessionId) + '/staged-files/' + encodeURIComponent(f.name), download: f.name, title: f.name }, f.name))))) : null;
        const workspace = st.workspaceFiles.length ? h('div', { key: 'ws', class: 'fd-session-files-section' },
            h('div', { class: 'fd-session-files-head' }, 'workspace (' + st.workspaceFiles.length + ')'),
            h('ul', { class: 'fd-session-files-list' },
                ...st.workspaceFiles.map(f => h('li', { key: 'wf-' + f, class: 'fd-session-files-row', title: f }, f)))) : null;
        if (!staged && !workspace) return h('div', { class: 'fd-session-files fd-session-files-empty' }, 'No files in this session\'s workspace.');
        return h('div', { class: 'fd-session-files' }, staged, workspace);
    }

    function sessionMuxPanel() {
        const st = s();
        const lines = st.tty || [];
        const sid = (st.sessionId || '').slice(0, 8);
        const tty = h('div', { key: 'mux', class: 'fd-tty' },
            h('div', { class: 'fd-tty-head' },
                h('span', { class: 'fd-tty-title' }, 'mux · ' + (sid || 'session')),
                h('span', { class: 'fd-tty-status' }, st.busy ? 'live' : 'idle')),
            h('pre', { class: 'fd-tty-slot fd-pre' },
                lines.length ? lines.join('\n') : 'waiting for tool I/O on this session…'));
        return h('div', { class: 'fd-session-mux' }, tty, sessionFilesPanel());
    }

    // In-conversation message search (kimi web message-search-dialog parity):
    // Cmd/Ctrl+F while the chat page is focused opens a client-side filter over
    // the currently loaded thread (st.messages is already the full replay for
    // this session — no new endpoint needed, unlike GET /api/search which is
    // global-across-sessions and serves a different surface). Enter jumps to
    // (scrolls + flashes) the next match; Escape closes.
    function messageSearchMatches() {
        const st = s();
        const q = st.searchQuery.trim().toLowerCase();
        if (!q) return [];
        // Indices into st.messages, not ids — ChatMessage (design/src/components/
        // chat/message.js) renders no per-message DOM id, but its root .chat-msg
        // nodes land in the SAME order as st.messages, so position is the stable
        // join key between the two.
        const out = [];
        st.messages.forEach((m, i) => { if ((m.content || '').toLowerCase().includes(q)) out.push(i); });
        return out;
    }
    function scrollToMessage(index) {
        const nodes = document.querySelectorAll('.chat-msg');
        const el = nodes[index];
        if (!el) return;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('fd-msg-flash');
        setTimeout(() => el.classList.remove('fd-msg-flash'), 900);
    }
    function messageSearchOverlay() {
        const st = s();
        if (!st.searchOpen) return null;
        const matches = messageSearchMatches();
        return h('div', { class: 'fd-msg-search', role: 'search' },
            h('input', {
                class: 'fd-msg-search-input', type: 'text', placeholder: 'search this conversation…',
                value: st.searchQuery, autofocus: true,
                oninput: (e) => { st.searchQuery = e.target.value; st.searchHit = 0; ctx.rerender(); },
                onkeydown: (e) => {
                    if (e.key === 'Escape') { e.preventDefault(); st.searchOpen = false; st.searchQuery = ''; st.searchHit = 0; ctx.rerender(); }
                    else if (e.key === 'Enter' && matches.length) {
                        e.preventDefault();
                        scrollToMessage(matches[st.searchHit % matches.length]);
                        st.searchHit = (st.searchHit + 1) % matches.length;
                    }
                },
            }),
            h('span', { class: 'fd-msg-search-count' }, st.searchQuery ? (matches.length + ' match' + (matches.length === 1 ? '' : 'es')) : ''),
            h('button', { type: 'button', class: 'fd-msg-search-close', 'aria-label': 'close search', onclick: () => { st.searchOpen = false; st.searchQuery = ''; ctx.rerender(); } }, '×'));
    }

    // Connect proactively on mount (this module's own header comment: "the
    // socket can subscribe BEFORE the first prompt") rather than lazily on
    // first send/switch -- this is also what makes the persisted sessionId
    // (readStoredSessionId() above) actually resume anything: replay only
    // has something to rebuild from once the WS reconnects under that id.
    // ensureWs() itself mints a sessionId if one wasn't persisted/restored,
    // so it's guaranteed set by the time the file/cwd loads below run.
    ensureWs();
    loadWorkspaceFiles(ctx.state.sessionId);
    loadStagedFiles(ctx.state.sessionId);
    api('/api/terminal/status').then(st => { if (st && st.cwd && !ctx.state.cwd) { ctx.state.cwd = st.cwd; ctx.rerender(); } }).catch(() => { /* cwd optional */ });

    return () => {
        const st = s();
        const attachRow = h('div', { class: 'fd-chat-attach-row' },
            h('label', { class: 'fd-chat-attach', title: 'attach files to the next message' },
                'attach',
                h('input', { type: 'file', multiple: true, style: 'display:none', onchange: (e) => { attachFiles(e.target.files); e.target.value = ''; } })),
            ...st.staged.map((f, i) => h('span', { key: 'st' + i, class: 'fd-chat-staged' },
                f.name,
                h('button', { type: 'button', class: 'fd-chat-staged-x', 'aria-label': 'remove ' + f.name, onclick: () => { st.staged = st.staged.filter((_, j) => j !== i); ctx.rerender(); } }, '×'))));
        return WorkspaceShell({
            stableFrame: true,
            rail: WorkspaceRail({
                brand: 'freddie',
                action: { label: 'Sessions', icon: 'thread', onClick: () => { location.hash = '#fd-sessions'; } },
                items: [{ key: 'chat', label: 'Chat', icon: 'forum', active: true }],
            }),
            sessions: ConversationList({
                sessions: st.sessions.map(row => ({ sid: row.id, title: row.title, time: row.time, rail: row.needsInput ? 'flame' : null })),
                selected: st.sessionId,
                onSelect: (row) => switchSession(row.sid),
                onNew: () => {
                    try { st.ws && st.ws.close(); } catch { /* already closed */ }
                    st.messages = []; st.draft = ''; st.error = null; st.busy = false;
                    st.ws = null; st.conn = 'closed'; st.sessionId = newSessionId(); st.staged = [];
                    ensureWs();
                    loadWorkspaceFiles(st.sessionId);
                    loadStagedFiles(st.sessionId);
                    ctx.rerender();
                },
                newLabel: 'New chat',
                emptyText: 'No conversations yet',
            }),
            main: [
                messageSearchOverlay(),
                attachRow,
                AgentChat({
                    messages: st.messages,
                    busy: st.busy,
                    draft: st.draft,
                    status: st.busy ? 'streaming…' : (st.conn === 'open' ? 'ready' : 'connecting…'),
                    agentName: 'freddie',
                    selectedAgent: 'freddie',
                    models: st.models,
                    selectedModel: st.model,
                    onSelectModel: (v) => { st.model = v; ctx.rerender(); },
                    cwd: st.cwd,
                    cwdEditing: st.cwdEditing,
                    cwdDraft: st.cwdDraft,
                    onCwdEdit: () => { st.cwdEditing = true; st.cwdDraft = st.cwd; ctx.rerender(); },
                    onCwdDraft: (v) => { st.cwdDraft = v; },
                    onCwdSave: () => { st.cwd = (st.cwdDraft || '').trim(); st.cwdEditing = false; ctx.rerender(); },
                    onCwdCancel: () => { st.cwdEditing = false; ctx.rerender(); },
                    onCwdClear: () => { st.cwd = ''; st.cwdEditing = false; ctx.rerender(); },
                    placeholder: st.busy ? 'queue a follow-up… (or stop)' : 'message…',
                    mentionFiles: st.workspaceFiles,
                    showMinimap: true,
                    banners: st.error ? [noteAlert({ kind: 'error', msg: st.error })] : [],
                    onInput: (v) => { st.draft = v; },
                    onSend: send,
                    onStop: stop,
                    onNewChat: () => {
                        try { st.ws && st.ws.close(); } catch { /* already closed */ }
                        st.messages = []; st.draft = ''; st.error = null; st.busy = false;
                        st.ws = null; st.conn = 'closed'; st.sessionId = newSessionId(); st.staged = []; st.tty = [];
                        ensureWs();
                        loadWorkspaceFiles(st.sessionId);
                        loadStagedFiles(st.sessionId);
                        ctx.rerender();
                    },
                }),
            ],
            pane: sessionMuxPanel(),
            paneLabel: 'session mux',
        });
    };
});

export const voice = makePage((ctx) => {
    async function load() {
        // GET /api/voice/status (plugins/gui-voice) — the endpoint is
        // optional, so a 404/!ok means "not wired" rather than an error to
        // surface. Response shape: {tts:{available,provider}, stt:{available,provider}}.
        try { const v = await api('/api/voice/status').catch(() => null); ctx.set({ loading: false, voice: v, error: null }); }
        catch (e) { ctx.set({ loading: false, error: e }); }
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading voice config…');
        const v = s.voice;
        const tts = v && v.tts;
        const stt = v && v.stt;
        const enabled = !!((tts && tts.available) || (stt && stt.available));
        return [
            PageHeader({ title: 'voice', lede: 'voice surfaces', right: enabled ? Chip({ tone: 'ok', children: 'enabled' }) : Chip({ tone: 'neutral', children: 'not configured' }) }),
            enabled
                ? section('backends', Table({
                    headers: ['capability', 'status', 'provider'],
                    rows: [
                        ['transcription (stt)', stt && stt.available ? Chip({ tone: 'ok', children: 'on' }) : Chip({ tone: 'neutral', children: 'off' }), (stt && stt.provider) || 'none'],
                        ['speech (tts)', tts && tts.available ? Chip({ tone: 'ok', children: 'on' }) : Chip({ tone: 'neutral', children: 'off' }), (tts && tts.provider) || 'none'],
                    ],
                }))
                : section('status', emptyState('no voice backend wired in this build. set OPENAI_API_KEY or ELEVENLABS_API_KEY to enable.')),
        ];
    };
});
