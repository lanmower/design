// Chat page — dashboard surface for the agent. Renders via the kit's
// Chat + ChatComposer primitives so the dashboard tab and the OS chat panel
// share the same bubble / tool-call / empty-state chrome. The bespoke
// cwd/skill/provider/model selectors live in a collapsible config strip
// above the thread (mirror of the OS panel cc-strip pattern).

import * as webjsx from '../../../../vendor/webjsx/index.js';
import * as components from '../../../components.js';
import { getRecentPaths, saveRecentPath, skillLabel } from './helpers.js';
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
            try { events.push({ event: curEvent, data: JSON.parse(curData) }); } catch {}
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
        const providers = await fetch('/api/providers').then(r => r.json()).catch(() => []);
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
            if (chatState.abort) { try { chatState.abort.abort(); } catch {} chatState.abort = null; }
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
            chatState.abort = new AbortController();
            saveRecentPath(chatState.cwd);
            syncMessages();
            renderPage();
            try {
                const body = { prompt: trimmed, cwd: chatState.cwd || undefined, skill: chatState.skill || undefined, provider: chatState.provider || undefined, model: chatState.model || undefined, sessionId: chatState.sessionId || undefined };
                const resp = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: chatState.abort.signal });
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
                host.placeholder = chatState.busy ? 'agent working…' : 'describe what you want to do in the working directory…';
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
