// Freddie conversational pages: the streaming `chat` page (SSE over POST,
// offline outbox queueing, abortable turns) and the `voice` backend probe.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { makePage, api, loadingState, emptyState } from './runtime.js';
import { Table, PageHeader } from '../content.js';
import { Chip } from '../shell.js';
import { formatTime } from '../../locale.js';
import { queueMessage, watchReconnect, isOnline } from '../../idb-outbox.js';
import { AgentChat } from '../agent-chat.js';
import { section, noteAlert } from './shared.js';
import { parseSseStream, toolProgressPart, partsFromMessages } from './sse.js';

const h = webjsx.createElement;

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
        if (ctx.state.abort) { try { ctx.state.abort.abort(); } catch { /* swallow: already settled */ } }
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
            PageHeader({ title: 'voice', lede: 'voice surfaces', right: enabled ? Chip({ tone: 'ok', children: 'enabled' }) : Chip({ tone: 'neutral', children: 'not configured' }) }),
            enabled
                ? section('backends', Table({ headers: ['capability', 'status'], rows: [['transcription', v.transcription ? Chip({ tone: 'ok', children: 'on' }) : Chip({ tone: 'neutral', children: 'off' })], ['tts', v.tts ? Chip({ tone: 'ok', children: 'on' }) : Chip({ tone: 'neutral', children: 'off' })]] }))
                : section('status', emptyState('no voice backend wired in this build. configure a transcription/tts plugin to enable.')),
        ];
    };
});
