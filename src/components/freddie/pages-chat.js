import * as webjsx from '../../../vendor/webjsx/index.js';
import { Panel, Hero, Receipt } from '../content.js';
import { skillLabel, getRecentPaths, saveRecentPath, renderChatMessages } from './helpers.js';
const h = webjsx.createElement;

function parseSse(text) {
    const evs = []; let ev = null, data = '';
    for (const line of text.split('\n')) {
        if (line.startsWith('event: ')) ev = line.slice(7).trim();
        else if (line.startsWith('data: ')) data = line.slice(6).trim();
        else if (line === '' && ev) { try { evs.push({ event: ev, data: JSON.parse(data) }); } catch {} ev = null; data = ''; }
    }
    return evs;
}

export async function chat(h0) {
    const skills = [...h0.pi.skills.values()];
    const providers = await fetch('/api/providers').then(r => r.json()).catch(() => []);
    const configured = providers.filter(p => p.configured);
    const cs = window.__fd_chatState = window.__fd_chatState || { cwd: '', skill: '', provider: '', model: '', messages: [], busy: false, sessionId: null };
    if (!cs.cwd) cs.cwd = (getRecentPaths()[0] || '');
    const root = document.getElementById('app');
    const getMsgs = () => root.querySelector('#fd-chat-msgs');
    const newSession = () => { if (cs.busy) return; cs.messages = []; cs.sessionId = null; renderChatMessages(getMsgs(), cs.messages); };
    const sendChat = async ev => {
        ev.preventDefault();
        if (cs.busy) return;
        const promptEl = ev.target.elements.prompt;
        const prompt = promptEl.value.trim();
        if (!prompt) return;
        cs.messages.push({ role: 'user', content: prompt });
        promptEl.value = ''; promptEl.style.height = 'auto';
        cs.busy = true;
        saveRecentPath(cs.cwd);
        renderChatMessages(getMsgs(), cs.messages);
        try {
            const body = { prompt, cwd: cs.cwd || undefined, skill: cs.skill || undefined, provider: cs.provider || undefined, model: cs.model || undefined, sessionId: cs.sessionId || undefined };
            const resp = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
            const text = await resp.text();
            const events = parseSse(text);
            let ac = '';
            for (const { event, data } of events) {
                if (event === 'start' && data.sessionId) cs.sessionId = data.sessionId;
                if (event === 'done' && data.sessionId) cs.sessionId = data.sessionId;
                if (event === 'message') {
                    if (data.role === 'assistant') {
                        const content = Array.isArray(data.content) ? data.content : [{ type: 'text', text: String(data.content || '') }];
                        for (const block of content) {
                            if (block.type === 'text') ac += block.text;
                            if (block.type === 'tool_use') {
                                if (ac) { cs.messages.push({ role: 'assistant', content: ac }); ac = ''; }
                                const argSummary = Object.keys(block.input || {}).slice(0, 3).map(k => k+'='+String(block.input[k]).slice(0,20)).join(' ');
                                cs.messages.push({ role: 'tool', name: block.name, argsSummary: argSummary, content: JSON.stringify(block.input || {}, null, 2) });
                            }
                        }
                    } else if (data.role === 'tool') {
                        const tc = Array.isArray(data.content) ? data.content[0] : data;
                        cs.messages.push({ role: 'tool', name: 'result', argsSummary: '', content: String(tc?.content || tc?.text || JSON.stringify(tc)) });
                    }
                }
                if (event === 'done' && data.result && !ac) ac = data.result;
                if (event === 'error') ac = 'error: ' + (data.error || 'unknown');
            }
            if (ac) cs.messages.push({ role: 'assistant', content: ac });
            if (!events.length) cs.messages.push({ role: 'assistant', content: '(no response)' });
        } catch (e) { cs.messages.push({ role: 'assistant', content: 'error: '+e.message }); }
        cs.busy = false;
        renderChatMessages(getMsgs(), cs.messages);
    };
    const byCat = skills.reduce((a, s) => { const c = s.category || 'other'; (a[c] = a[c] || []).push(s); return a; }, {});
    setTimeout(() => renderChatMessages(getMsgs(), cs.messages), 50);
    return [
        Hero({ title: 'chat', body: 'talk to the agent. pick a working dir, optional skill, optional provider.', accent: cs.sessionId ? 'session '+cs.sessionId.slice(0,8) : 'new session' }),
        Panel({ title: 'chat', right: h('button', { class: 'btn-primary', onclick: ev => { ev.preventDefault(); newSession(); } }, '+ new'), children: [
            h('form', { class: 'fd-chat-form', onsubmit: sendChat },
                h('label', { class: 'fd-label' }, 'working directory'),
                h('input', { name: 'cwd', type: 'text', placeholder: 'e.g. C:/dev/myproject', value: cs.cwd, oninput: ev => { cs.cwd = ev.target.value; } }),
                h('div', { class: 'fd-row' },
                    h('div', { class: 'fd-col' },
                        h('label', { class: 'fd-label' }, 'skill'),
                        h('select', { name: 'skill', onchange: ev => { cs.skill = ev.target.value; } },
                            h('option', { value: '' }, '— no skill —'),
                            ...Object.entries(byCat).map(([cat, ss]) => h('optgroup', { label: cat }, ...ss.map(s => h('option', { value: s.name, selected: cs.skill === s.name ? 'true' : null }, skillLabel(s)))))
                        )
                    ),
                    h('div', { class: 'fd-col' },
                        h('label', { class: 'fd-label' }, 'provider'),
                        h('select', { name: 'provider', onchange: ev => { cs.provider = ev.target.value; } },
                            h('option', { value: '' }, configured.length ? '— auto —' : '— none configured —'),
                            ...configured.map(p => h('option', { value: p.name, selected: cs.provider === p.name ? 'true' : null }, (p.available ? '● ' : '○ ') + p.name))
                        )
                    ),
                    h('div', { class: 'fd-col' },
                        h('label', { class: 'fd-label' }, 'model'),
                        h('input', { name: 'model', type: 'text', placeholder: 'default', value: cs.model, oninput: ev => { cs.model = ev.target.value; } })
                    )
                ),
                h('div', { class: 'fd-chat-send-row' },
                    h('textarea', { name: 'prompt', placeholder: 'describe what you want…', rows: 4, oninput: ev => { ev.target.style.height = 'auto'; ev.target.style.height = Math.min(ev.target.scrollHeight, 240)+'px'; } }),
                    h('button', { type: 'submit', class: 'btn-primary', disabled: cs.busy ? 'true' : null }, cs.busy ? '…' : 'send')
                )
            ),
            h('div', { id: 'fd-chat-msgs', class: 'fd-chat-thread' })
        ] }),
        configured.length === 0
            ? Panel({ title: 'no providers configured', children: Receipt({ rows: [['set API key', 'keys tab → click chip'], ['or use acptoapi', 'run acptoapi server on localhost:4800']] }) })
            : null
    ];
}
