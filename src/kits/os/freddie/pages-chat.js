// Chat page — dashboard surface for the agent. Renders via the kit's
// Chat + ChatComposer primitives so the dashboard tab and the OS chat panel
// share the same bubble / tool-call / empty-state chrome. The bespoke
// cwd/skill/provider/model selectors live in a collapsible config strip
// above the thread (mirror of the OS panel cc-strip pattern).

import * as webjsx from '../../../../vendor/webjsx/index.js';
import * as components from '../../../components.js';
import { getRecentPaths, saveRecentPath, skillLabel } from '../../../components/freddie/helpers.js';
import { Chat, ChatComposer } from '../../../components/chat.js';

const h = webjsx.createElement;
const { Panel, Receipt, Chip, Icon } = components;

function parseSseEvents(text) {
    const events = [];
    let curEvent = null, curData = '';
    for (const line of text.split('\n')) {
        if (line.startsWith('event: ')) { curEvent = line.slice(7).trim(); }
        else if (line.startsWith('data: ')) { curData = line.slice(6).trim(); }
        else if (line === '' && curEvent) {
            try { events.push({ event: curEvent, data: JSON.parse(curData) }); } catch { /* swallow: a malformed SSE event is dropped, the stream continues */ }
            curEvent = null; curData = '';
        }
    }
    return events;
}

// Convert the dashboard message shape into the kit ChatMessage shape:
//   { role:'user', content:string }   -> { role:'user', text }
//   { role:'assistant', content:string } -> { role:'assistant', parts:[{kind:'md', text}] }
//   { role:'tool', name, argsSummary, content } ->
//       { role:'tool', parts:[{kind:'tool_call', name, label, args, result, status}] }
//   { role:'thinking' } -> { role:'thinking', parts:[{kind:'thinking', text}] }
function toKitMessage(m) {
    if (m.role === 'tool') {
        const status = m.status || (m.error ? 'error' : (m.content != null ? 'done' : 'running'));
        return { role: 'tool', parts: [{ kind: 'tool_call', name: m.name || 'tool', label: m.argsSummary || '', args: m.args || m.input || {}, result: m.content, status, error: !!m.error, open: status !== 'done' }] };
    }
    if (m.role === 'thinking') return { role: 'thinking', parts: [{ kind: 'thinking', text: m.content || 'thinking…' }] };
    if (m.role === 'assistant' && m.content) return { role: 'assistant', parts: [{ kind: 'md', text: String(m.content) }] };
    return { role: m.role, text: m.content || '' };
}

export function makeChatPage(ctx) {
    return async function chat(h0) {
        const root = ctx.root;
        const skills = [...h0.pi.skills.values()];
        let providers = await fetch('/api/providers').then(r => r.json()).catch(() => []);
        if (!Array.isArray(providers)) providers = [];
        // Static deploy (no freddie-server, so /api/providers 404s): probe the
        // acptoapi gateway directly and, when it answers, surface it as a real
        // configured provider with its model list. Without this the dashboard
        // tells the user to "run a gateway" even though one is live and chat works.
        if (!providers.some(p => p.configured)) {
            try {
                const cfg = (window.__debug?.instances?.i1?.host?.fs?.readJson?.('/etc/freddie/freddie.json', null)) || {};
                const baseUrl = (cfg?.providers?.openai?.baseUrl || 'http://localhost:4800').replace(/\/+$/, '');
                const ac = new AbortController();
                const t = setTimeout(() => ac.abort(), 4000);
                const r = await fetch(baseUrl + '/v1/models', { signal: ac.signal }).catch(() => null);
                clearTimeout(t);
                if (r && r.ok) {
                    const j = await r.json().catch(() => null);
                    const models = Array.isArray(j?.data) ? j.data.map(m => m.id) : [];
                    providers = [{ id: 'acptoapi', name: 'acptoapi gateway (' + baseUrl + ')', configured: true, models: ['auto', ...models] }, ...providers];
                }
            } catch { /* swallow: probing the local acptoapi gateway is opt-in best-effort, absence just means no providers shown */ }
        }
        const configuredProviders = providers.filter(p => p.configured);

        const chatState = window.__fd_chatState = window.__fd_chatState || {
            cwd: '', skill: '', provider: '', model: '', messages: [], busy: false, sessionId: null, draft: '', abort: null,
        };
        if (!chatState.cwd) chatState.cwd = (getRecentPaths()[0] || '');

        // Find the chat container in the live DOM (set on the rendered <ds-chat>).
        const getChatHost = () => root.querySelector('ds-chat.fd-dashboard-chat');
        const syncMessages = () => {
            const host = getChatHost();
            if (host) host.messages = chatState.messages.map(toKitMessage);
        };

        const newSession = () => {
            if (chatState.busy) return;
            chatState.messages = [];
            chatState.sessionId = null;
            syncMessages();
        };

        const cancelInFlight = () => {
            if (chatState.abort) { try { chatState.abort.abort(); } catch { /* swallow: the in-flight request may already be settled, abort() is a no-op then */ } chatState.abort = null; }
            chatState.busy = false;
            syncMessages();
            renderPage();
        };

        const sendChat = async (prompt) => {
            if (chatState.busy) return;
            const trimmed = String(prompt || '').trim();
            if (!trimmed) return;
            chatState.messages.push({ role: 'user', content: trimmed });
            chatState.busy = true;
            chatState.progress = 'agent thinking…';
            chatState.abort = new AbortController();
            saveRecentPath(chatState.cwd);
            syncMessages();
            renderPage();
            try {
                const body = { prompt: trimmed, cwd: chatState.cwd || undefined, skill: chatState.skill || undefined, provider: chatState.provider || undefined, model: chatState.model || undefined, sessionId: chatState.sessionId || undefined };
                let resp;
                try {
                    resp = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: chatState.abort.signal });
                } catch (fetchErr) {
                    resp = null;
                }
                let text = '';
                let events = [];
                if (resp && resp.ok) {
                    text = await resp.text();
                    events = parseSseEvents(text);
                } else if (typeof window !== 'undefined' && typeof window.__thebirdRunAgent === 'function') {
                    // Static deploy with an in-page agent runtime (e.g. thebird): drive
                    // the REAL multi-step agent loop (host tools + acptoapi gateway +
                    // tool execution) instead of a single bare completion, so the model
                    // emits tool_calls, the loop executes them, feeds results back, and
                    // iterates. We synthesize the same {event:'message'} stream the
                    // server path produces so the render loop below is unchanged. The
                    // window global is the opt-in: hosts without it keep single-shot.
                    try {
                        let stepN = 0;
                        const onUpdate = (snap) => {
                            try {
                                const msgs = (snap && snap.context && snap.context.messages) || [];
                                const toolMsgs = msgs.filter(m => m.role === 'tool');
                                const lastAssist = [...msgs].reverse().find(m => m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length);
                                const running = lastAssist && lastAssist.tool_calls[0] && (lastAssist.tool_calls[0].function?.name || lastAssist.tool_calls[0].name);
                                stepN = toolMsgs.length;
                                chatState.progress = running
                                    ? ('agent: ' + running + ' (step ' + (stepN + 1) + ')…')
                                    : ('agent thinking' + (stepN ? ' (step ' + stepN + ')' : '') + '…');
                                renderPage();
                            } catch { /* swallow: progress-indicator update failing must not abort the agent run */ }
                        };
                        const out = await window.__thebirdRunAgent({ prompt: trimmed, onUpdate });
                        const turnMsgs = (out && Array.isArray(out.messages)) ? out.messages : [];
                        for (const m of turnMsgs) {
                            if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length) {
                                const parts = [];
                                if (m.content) parts.push({ type: 'text', text: String(m.content) });
                                for (const tc of m.tool_calls) {
                                    const rawArgs = tc.function?.arguments ?? tc.arguments;
                                    let input = {};
                                    if (rawArgs && typeof rawArgs === 'object') input = rawArgs;
                                    else if (typeof rawArgs === 'string') { try { input = JSON.parse(rawArgs || '{}'); } catch { input = {}; } }
                                    parts.push({ type: 'tool_use', name: tc.function?.name || tc.name, input });
                                }
                                events.push({ event: 'message', data: { role: 'assistant', content: parts } });
                            } else if (m.role === 'tool') {
                                events.push({ event: 'message', data: { role: 'tool', content: [{ content: String(m.content ?? '') }] } });
                            }
                        }
                        const finalText = (out && out.result) || (out && out.error ? 'error: ' + out.error : '');
                        if (finalText) events.push({ event: 'message', data: { role: 'assistant', content: [{ type: 'text', text: String(finalText) }] } });
                        if (!events.length) events.push({ event: 'message', data: { role: 'assistant', content: [{ type: 'text', text: '' }] } });
                    } catch (e) {
                        events = [{ event: 'error', data: { error: e?.message || String(e) } }];
                    }
                } else {
                    // Static deploy without an in-page agent runtime: single direct
                    // acptoapi /v1/chat/completions call (no tool loop — one shot).
                    const cfg = (window.__debug?.instances?.i1?.host?.fs?.readJson?.('/etc/freddie/freddie.json', null)) || {};
                    const baseUrl = cfg?.providers?.openai?.baseUrl || 'http://localhost:4800';
                    try {
                        const url = baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
                        const reqBody = { model: chatState.model || cfg?.providers?.openai?.model || 'auto', messages: [{ role: 'user', content: trimmed }] };
                        const r2 = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(reqBody), signal: chatState.abort.signal });
                        if (!r2.ok) {
                            const errText = await r2.text().catch(() => '');
                            events = [{ event: 'error', data: { error: 'acptoapi ' + r2.status + ': ' + errText.slice(0, 200) } }];
                        } else {
                            const j = await r2.json();
                            const content = j?.choices?.[0]?.message?.content || '';
                            const tool_calls = j?.choices?.[0]?.message?.tool_calls;
                            const parts = [];
                            if (content) parts.push({ type: 'text', text: content });
                            if (Array.isArray(tool_calls)) {
                                for (const tc of tool_calls) parts.push({ type: 'tool_use', name: tc.function?.name, input: (() => { try { return JSON.parse(tc.function?.arguments || '{}'); } catch { return {}; } })() });
                            }
                            events = [{ event: 'message', data: { role: 'assistant', content: parts.length ? parts : [{ type: 'text', text: '' }] } }];
                        }
                    } catch (e) {
                        events = [{ event: 'error', data: { error: e?.message || String(e) } }];
                    }
                }
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
                                    chatState.messages.push({ role: 'tool', name: block.name, argsSummary, content: JSON.stringify(block.input || {}, null, 2), status: 'running' });
                                    syncMessages();
                                }
                            }
                        } else if (role === 'tool') {
                            const tc = Array.isArray(data.content) ? data.content[0] : data;
                            // Resolve the last running tool call to done with this result.
                            for (let i = chatState.messages.length - 1; i >= 0; i--) {
                                const m = chatState.messages[i];
                                if (m.role === 'tool' && m.status === 'running') {
                                    m.content = String(tc?.content || tc?.text || JSON.stringify(tc));
                                    m.status = 'done';
                                    break;
                                }
                            }
                            syncMessages();
                        }
                    }
                    if (event === 'done' && data.result) { if (!assistantContent) assistantContent = data.result; }
                    if (event === 'error') {
                        const msg = 'error: ' + (data.error || 'unknown');
                        // Mark any running tool as errored; record assistant error.
                        for (let i = chatState.messages.length - 1; i >= 0; i--) {
                            const m = chatState.messages[i];
                            if (m.role === 'tool' && m.status === 'running') { m.status = 'error'; m.error = true; m.content = msg; break; }
                        }
                        if (!assistantContent) assistantContent = msg;
                    }
                }
                if (assistantContent) chatState.messages.push({ role: 'assistant', content: assistantContent });
                if (!events.length) chatState.messages.push({ role: 'assistant', content: '(no response)' });
            } catch (e) {
                if (e.name === 'AbortError') chatState.messages.push({ role: 'assistant', content: '[cancelled]' });
                else chatState.messages.push({ role: 'assistant', content: 'error: ' + e.message });
            }
            chatState.abort = null;
            chatState.busy = false;
            chatState.progress = '';
            syncMessages();
            renderPage();
        };

        const recentPaths = getRecentPaths();
        const datalistId = 'fd-cwd-list';
        const byCat = skills.reduce((a, s) => { const c = s.category || 'other'; (a[c] = a[c] || []).push(s); return a; }, {});

        const renderPage = () => {
            const host = getChatHost();
            if (host) {
                host.busy = chatState.busy;
                host.placeholder = chatState.busy
                    ? (chatState.progress || 'agent working…')
                    : 'describe what you want to do in the working directory…';
            }
            // Refresh disabled state on header buttons.
            const newBtn = root.querySelector('.fd-chat-new');
            if (newBtn) newBtn.disabled = !!chatState.busy;
            const cancelBtn = root.querySelector('.fd-chat-cancel');
            if (cancelBtn) cancelBtn.style.display = chatState.busy ? '' : 'none';
        };

        // After mount, seed messages onto the ds-chat element + wire the send event.
        setTimeout(() => {
            const host = getChatHost();
            if (host && !host._fdBound) {
                host._fdBound = true;
                host.addEventListener('send', (e) => { sendChat(e.detail && e.detail.text); });
                host.messages = chatState.messages.map(toKitMessage);
                host.placeholder = 'describe what you want to do in the working directory…';
                host.sub = chatState.sessionId ? ('session ' + chatState.sessionId.slice(0, 8)) : 'agent';
            }
            renderPage();
        }, 50);

        const selSkill = h('select', { name: 'skill', onchange: (ev) => { chatState.skill = ev.target.value; } },
            h('option', { value: '' }, 'no skill'),
            ...Object.entries(byCat).map(([cat, ss]) =>
                h('optgroup', { label: cat },
                    ...ss.map(s => h('option', { value: s.name, selected: chatState.skill === s.name ? 'true' : null, title: s.description || s.name }, skillLabel(s)))
                )));

        const selProv = h('select', { name: 'provider', onchange: (ev) => { chatState.provider = ev.target.value; } },
            h('option', { value: '' }, configuredProviders.length ? 'auto' : 'no providers configured'),
            ...configuredProviders.map(p => h('option', { value: p.name, selected: chatState.provider === p.name ? 'true' : null }, (p.available ? '(on) ' : '(off) ') + p.name)));

        return [
            Panel({
                title: 'chat',
                right: h('div', { class: 'fd-chat-actions' },
                    h('button', { class: 'btn-secondary fd-btn-mini fd-chat-cancel', style: chatState.busy ? '' : 'display:none', onclick: (ev) => { ev.preventDefault(); cancelInFlight(); } }, 'cancel'),
                    h('button', { class: 'btn-primary fd-btn-mini fd-chat-new', onclick: (ev) => { ev.preventDefault(); newSession(); }, disabled: chatState.busy ? 'true' : null }, 'new session')
                ),
                children: [
                    h('datalist', { id: datalistId }, ...recentPaths.map(p => h('option', { value: p }))),
                    h('div', { class: 'fd-chat-config' },
                        h('div', { class: 'fd-chat-field fd-chat-field-grow' },
                            h('label', {}, 'working directory'),
                            h('input', { name: 'cwd', type: 'text', placeholder: 'e.g. C:/dev/myproject or /home/user/project', value: chatState.cwd, list: datalistId, oninput: (ev) => { chatState.cwd = ev.target.value; } })),
                        h('div', { class: 'fd-chat-row' },
                            h('div', { class: 'fd-chat-field fd-chat-field-grow' }, h('label', {}, 'skill'), selSkill),
                            h('div', { class: 'fd-chat-field fd-chat-field-grow' }, h('label', {}, 'provider'), selProv),
                            h('div', { class: 'fd-chat-field fd-chat-field-grow' }, h('label', {}, 'model (optional)'),
                                h('input', { name: 'model', type: 'text', placeholder: configuredProviders.find(p => p.name === chatState.provider)?.defaultModel || 'default', value: chatState.model, oninput: (ev) => { chatState.model = ev.target.value; } })))),
                    // Live chat surface — the kit's ds-chat web component handles
                    // layout, scroll, empty state, bubble chrome, tool-call cards,
                    // composer focus rings, send/cancel button swap, etc.
                    h('ds-chat', { class: 'fd-dashboard-chat ds-247420', title: 'chat', placeholder: 'describe what you want to do in the working directory…' }),
                ],
            }),
            configuredProviders.length === 0
                ? Panel({ title: 'no providers configured', children: Receipt({ rows: [
                    ['set API key', 'go to keys tab, click a provider chip to set its key'],
                    ['then reload', 'refresh this page to see providers here'],
                    ['or use a gateway', 'run a gateway server on localhost:4800 for local LLMs'],
                ] }) })
                : Panel({ title: 'configured providers', children: h('div', { class: 'fd-chip-wrap' },
                    ...providers.map(p => Chip({ tone: p.configured ? (p.available ? 'ok' : 'warn') : 'miss', children: p.configured ? [p.name, ' ', p.available ? Icon('circle-dot') : Icon('circle')] : p.name }))) }),
        ];
    };
}
