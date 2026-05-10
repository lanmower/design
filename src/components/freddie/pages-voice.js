import * as webjsx from '../../../vendor/webjsx/index.js';
import { Panel, Hero, Receipt, Kpi } from '../content.js';
import { Chip } from '../shell.js';
import { EmptyState } from '../files.js';
const h = webjsx.createElement;

function getState() {
    return window.__fd_voice = window.__fd_voice || {
        listening: false, supported: null, transcript: [], partial: '',
        ttsText: '', ttsBusy: false, ttsErr: null, voice: 'alloy', recogn: null
    };
}

function rerender() { if (typeof window.__fd_nav === 'function') window.__fd_nav('voice'); }

function ensureRecognizer(s) {
    if (s.recogn) return s.recogn;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { s.supported = false; return null; }
    s.supported = true;
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = 'en-US';
    r.onresult = ev => {
        let finals = '', partial = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const t = ev.results[i][0].transcript;
            if (ev.results[i].isFinal) finals += t; else partial += t;
        }
        if (finals) s.transcript.push({ text: finals.trim(), ts: Date.now() });
        s.partial = partial.trim();
        rerender();
    };
    r.onend = () => { if (s.listening) { try { r.start(); } catch {} } };
    r.onerror = e => { s.partial = '(' + (e.error || 'mic error') + ')'; rerender(); };
    s.recogn = r; return r;
}

function toggleListen(s) {
    const r = ensureRecognizer(s);
    if (!r) return;
    s.listening = !s.listening;
    if (s.listening) { try { r.start(); } catch {} } else { try { r.stop(); } catch {} }
    rerender();
}

async function speakText(s) {
    const text = s.ttsText.trim(); if (!text) return;
    s.ttsBusy = true; s.ttsErr = null; rerender();
    try {
        if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(text);
            u.onend = () => { s.ttsBusy = false; rerender(); };
            u.onerror = e => { s.ttsBusy = false; s.ttsErr = String(e.error || 'tts error'); rerender(); };
            window.speechSynthesis.speak(u);
        } else { s.ttsBusy = false; s.ttsErr = 'no speechSynthesis API in this browser'; rerender(); }
    } catch (e) { s.ttsBusy = false; s.ttsErr = e.message || String(e); rerender(); }
}

function clearLog(s) { s.transcript = []; s.partial = ''; rerender(); }

export async function voice(h0) {
    const s = getState();
    const supported = ('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window);
    const ttsSupported = 'speechSynthesis' in window;
    const lines = s.transcript.slice(-50);
    const tones = { listening: 'ok', idle: 'neutral', off: 'miss' };

    const micPanel = !supported
        ? Panel({ title: 'microphone', children: EmptyState({ text: 'this browser does not expose Web Speech API. try chrome or edge.', glyph: '⏚' }) })
        : Panel({ title: 'microphone', right: Chip({ tone: s.listening ? tones.listening : tones.idle, children: s.listening ? 'listening ●' : 'idle ○' }),
            children: [
                h('div', { class: 'fd-voice-controls' },
                    h('button', { class: s.listening ? 'btn-primary' : 'btn-primary', 'aria-label': s.listening ? 'stop listening' : 'start listening', onclick: ev => { ev.preventDefault(); toggleListen(s); } }, s.listening ? 'stop' : 'start'),
                    h('button', { class: 'btn', 'aria-label': 'clear transcript', onclick: ev => { ev.preventDefault(); clearLog(s); }, disabled: lines.length === 0 ? 'true' : null }, 'clear'),
                    s.partial ? h('span', { class: 'fd-voice-partial' }, '… ' + s.partial) : null
                ),
                lines.length === 0 && !s.partial
                    ? EmptyState({ text: s.listening ? 'listening — speak into your mic' : 'press start to capture speech', glyph: '◌' })
                    : h('div', { class: 'fd-voice-log', role: 'log', 'aria-live': 'polite' },
                        ...lines.map((it, i) => h('div', { key: i, class: 'fd-voice-line' },
                            h('span', { class: 'fd-voice-ts' }, new Date(it.ts).toLocaleTimeString()),
                            h('span', { class: 'fd-voice-text' }, it.text))))
            ] });

    const ttsPanel = !ttsSupported
        ? Panel({ title: 'speak', children: EmptyState({ text: 'no speechSynthesis API in this browser.', glyph: '⏚' }) })
        : Panel({ title: 'speak', right: s.ttsErr ? Chip({ tone: 'miss', children: 'error' }) : Chip({ tone: s.ttsBusy ? 'warn' : 'neutral', children: s.ttsBusy ? 'speaking' : 'idle' }),
            children: h('form', { class: 'fd-voice-tts', onsubmit: ev => { ev.preventDefault(); speakText(s); } },
                h('label', { class: 'fd-label', for: 'fd-tts-text' }, 'text to speak'),
                h('textarea', { id: 'fd-tts-text', name: 'tts', rows: 3, placeholder: 'type something…', value: s.ttsText, oninput: ev => { s.ttsText = ev.target.value; } }),
                h('div', { class: 'fd-voice-controls' },
                    h('button', { type: 'submit', class: 'btn-primary', disabled: s.ttsBusy ? 'true' : null }, s.ttsBusy ? '…' : 'speak'),
                    s.ttsErr ? h('span', { class: 'fd-muted' }, s.ttsErr) : null
                )) });

    return [
        Hero({ title: 'voice', body: 'speak in, hear out. browser-native speech recognition + synthesis.', accent: s.listening ? 'listening' : (lines.length ? lines.length+' utterances' : 'idle') }),
        Kpi({ items: [[lines.length,'utterances'],[supported ? '●' : '○','recognition'],[ttsSupported ? '●' : '○','synthesis']] }),
        micPanel,
        ttsPanel,
        Panel({ title: 'how this works', children: Receipt({ rows: [
            ['recognition', 'webkit Speech API · client-side, no server'],
            ['synthesis', 'speechSynthesis API · client-side, OS voice'],
            ['server tts tool', 'plugins/tts (OpenAI tts-1 / ElevenLabs) · runs in agent context'],
            ['voice_mode tool', 'plugins/voice_mode · toggles full-duplex on a session']
        ] }) })
    ];
}
