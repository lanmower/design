// Chat page — its own module because of SSE plumbing weight.
import * as webjsx from '../../../../vendor/webjsx/index.js';
import * as components from '../../../components.js';
import { getRecentPaths, saveRecentPath, skillLabel, renderChatMessages } from './helpers.js';

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

export function makeChatPage(ctx) {
    return async function chat(h0) {
        const root = ctx.root;
        const skills = [...h0.pi.skills.values()];
        const providers = await fetch('/api/providers').then(r => r.json()).catch(() => []);
        const configuredProviders = providers.filter(p => p.configured);

        const chatState = window.__fd_chatState = window.__fd_chatState || {
            cwd: '', skill: '', provider: '', model: '', messages: [], busy: false, sessionId: null,
        };
        if (!chatState.cwd) chatState.cwd = (getRecentPaths()[0] || '');

        const getMsgsContainer = () => root.querySelector('#fd-chat-msgs');

        const newSession = () => {
            if (chatState.busy) return;
            chatState.messages = [];
            chatState.sessionId = null;
            renderChatMessages(getMsgsContainer(), chatState.messages);
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
                    if (event === 'done' && data.result) { if (!assistantContent) assistantContent = data.result; }
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

        const selSkill = h('select', { name: 'skill', onchange: (ev) => { chatState.skill = ev.target.value; } },
            h('option', { value: '' }, '— no skill —'),
            ...Object.entries(byCat).map(([cat, ss]) =>
                h('optgroup', { label: cat },
                    ...ss.map(s => h('option', { value: s.name, selected: chatState.skill === s.name ? 'true' : null, title: s.description || s.name }, skillLabel(s)))
                )));

        const selProv = h('select', { name: 'provider', onchange: (ev) => { chatState.provider = ev.target.value; } },
            h('option', { value: '' }, configuredProviders.length ? '— auto —' : '— no providers configured —'),
            ...configuredProviders.map(p => h('option', { value: p.name, selected: chatState.provider === p.name ? 'true' : null }, (p.available ? '(on) ' : '(off) ') + p.name)));

        return [
            Panel({
                title: 'chat',
                right: h('button', { class: 'btn-primary fd-btn-mini', onclick: (ev) => { ev.preventDefault(); newSession(); }, disabled: chatState.busy ? 'true' : null }, '+ new session'),
                children: [
                    h('datalist', { id: datalistId }, ...recentPaths.map(p => h('option', { value: p }))),
                    h('form', { class: 'row-form fd-chat-form', onsubmit: sendChat },
                        h('div', { class: 'fd-chat-field' },
                            h('label', {}, 'working directory'),
                            h('input', { name: 'cwd', type: 'text', placeholder: 'e.g. C:/dev/myproject or /home/user/project', value: chatState.cwd, list: datalistId, oninput: (ev) => { chatState.cwd = ev.target.value; } })),
                        h('div', { class: 'fd-chat-row' },
                            h('div', { class: 'fd-chat-field fd-chat-field-grow' }, h('label', {}, 'skill'), selSkill),
                            h('div', { class: 'fd-chat-field fd-chat-field-grow' }, h('label', {}, 'provider'), selProv),
                            h('div', { class: 'fd-chat-field fd-chat-field-grow' }, h('label', {}, 'model (optional)'),
                                h('input', { name: 'model', type: 'text', placeholder: configuredProviders.find(p => p.name === chatState.provider)?.defaultModel || 'default', value: chatState.model, oninput: (ev) => { chatState.model = ev.target.value; } }))),
                        h('div', { class: 'fd-chat-submit' },
                            h('textarea', { name: 'prompt', placeholder: 'describe what you want to do in the working directory…', rows: 4,
                                oninput: (ev) => { ev.target.style.height = 'auto'; ev.target.style.height = Math.min(ev.target.scrollHeight, 240) + 'px'; } }),
                            h('button', { type: 'submit', class: 'btn-primary', disabled: chatState.busy ? 'true' : null }, chatState.busy ? '…' : 'send'))),
                    h('div', { id: 'fd-chat-msgs', class: 'fd-chatlog' }),
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
