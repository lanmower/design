import * as webjsx from 'webjsx';
import { AICat, AICatPortrait, ChatComposer, Topbar, Crumb, Status, Side, AppShell, Panel, Heading, Lede, Chip } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
import 'ds/index.js';
const h = webjsx.createElement;

const FACES = {
    idle:    ` /\\_/\\\n( o.o )\n > ^ <`,
    happy:   ` /\\_/\\\n( ^.^ )\n > ~ <`,
    think:   ` /\\_/\\\n( -.- )\n > ? <`,
    pounce:  ` /\\_/\\\n( O.O )\n > ! <`
};

const PRESETS = [
    { q: 'show me a small react component', k: 'code-react' },
    { q: 'show python prime sieve', k: 'code-py' },
    { q: 'explain prefers-reduced-motion', k: 'md-rm' },
    { q: 'send the v0.0.27 token sheet', k: 'pdf' },
    { q: 'paste the mascot art', k: 'image' },
    { q: 'link the design repo', k: 'link' },
    { q: 'attach a config file', k: 'file' },
    { q: 'tell me a joke about garbage collection', k: 'text' }
];

const REPLIES = {
    'code-react': () => ({ parts: [
        { kind: 'text', text: 'sure — here\'s a tiny one:' },
        { kind: 'code', lang: 'jsx', filename: 'Greet.jsx',
          code: 'export function Greet({ name }) {\n  return <p>hi, {name} =^.^=</p>;\n}\n\nexport default Greet;' }
    ] }),
    'code-py': () => ({ parts: [
        { kind: 'text', text: 'classic sieve, no imports:' },
        { kind: 'code', lang: 'python', filename: 'sieve.py',
          code: 'def primes(n):\n    sieve = [True] * (n + 1)\n    sieve[0] = sieve[1] = False\n    for i in range(2, int(n ** 0.5) + 1):\n        if sieve[i]:\n            for j in range(i * i, n + 1, i):\n                sieve[j] = False\n    return [i for i, p in enumerate(sieve) if p]\n\nprint(primes(50))' }
    ] }),
    'md-rm': () => ({ parts: [{ kind: 'md', text: '## prefers-reduced-motion\n\nmedia query that signals the user wants less animation. honour it:\n\n- short-circuit fade-ins\n- drop big translates\n- keep opacity-only if anything\n\n```css\n@media (prefers-reduced-motion: reduce) {\n  * { animation-duration: 0ms !important; }\n}\n```\n\n> opt out of motion, not out of feedback.' }] }),
    pdf: () => ({ parts: [
        { kind: 'text', text: 'here you go — `tokens-v0.0.27.pdf`:' },
        { kind: 'pdf', src: './sample.pdf', name: 'tokens-v0.0.27.pdf', size: 782 }
    ] }),
    image: () => ({ parts: [
        { kind: 'text', text: 'mascot, fresh from the loom:' },
        { kind: 'image', src: './sample-svg.svg', alt: '247420 mascot', caption: 'mascot · svg · favicon-derived' }
    ] }),
    link: () => ({ parts: [
        { kind: 'link', href: 'https://github.com/AnEntrypoint/design', host: 'github.com',
          title: 'AnEntrypoint/design',
          desc: 'design system for 247420 — layered surfaces, mono labels, pill radii.',
          thumb: './sample-square.png' }
    ] }),
    file: () => ({ parts: [
        { kind: 'text', text: 'config attached — drop it in `~/.config/aicat/config.json`.' },
        { kind: 'file', src: './sample.pdf', name: 'aicat.config.json', size: 412, kindLabel: 'JSON' }
    ] }),
    text: () => ({ parts: [{ kind: 'text', text: 'a generational gc walks into a bar. the bartender says, *you again?* gc says, **don\'t worry, I\'ll be young forever.**' }] })
};

function classifyAndReply(text) {
    const t = text.toLowerCase();
    const map = [
        [/python|sieve|prime/, 'code-py'],
        [/code|react|component|function|jsx/, 'code-react'],
        [/reduced.motion|animat|motion/, 'md-rm'],
        [/pdf|token sheet|spec/, 'pdf'],
        [/image|mascot|picture|art/, 'image'],
        [/link|repo|github/, 'link'],
        [/file|config|attach/, 'file']
    ];
    for (const [re, k] of map) if (re.test(t)) return REPLIES[k]();
    return REPLIES.text();
}

const state = {
    draft: '', thinking: false, mood: 'idle',
    messages: [
        { who: 'them', name: 'aicat', text: 'hi. I am **aicat**. I read fast and I knock things off shelves.', time: '·' },
        { who: 'them', name: 'aicat', parts: [{ kind: 'md', text: 'try one of these:\n\n- ask for `code` (react/python — pick a flavour)\n- ask for the **token pdf** or the **mascot image**\n- ask me to attach a *config file*\n- or just chat — I respond in markdown.' }], time: '·' }
    ]
};

const root = document.getElementById('root');
function timeNow() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

function send(text) {
    state.messages = [...state.messages, { who: 'you', avatar: 'u', time: timeNow(), receipt: 'delivered', parts: [{ kind: 'text', text }] }];
    state.draft = '';
    state.thinking = true;
    state.mood = 'think';
    kit.render();
    setTimeout(() => {
        state.thinking = false;
        state.mood = 'happy';
        const reply = classifyAndReply(text);
        state.messages = state.messages.map((m) => m.who === 'you' ? { ...m, receipt: 'read' } : m);
        state.messages = [...state.messages, { who: 'them', name: 'aicat', time: timeNow(), ...reply }];
        kit.render();
        setTimeout(() => { state.mood = 'idle'; kit.render(); }, 1400);
    }, 1100);
}

function App() {
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'aicat', items: [['index', '../../'], ['chat', '../chat/'], ['source ↗', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'aicat' }),
        side: Side({
            sections: [
                { group: 'session', items: [
                    { glyph: '◆', label: 'new chat', key: 'new', onClick: (e) => { e.preventDefault(); state.messages = state.messages.slice(0, 2); kit.render(); } },
                    { glyph: '◇', label: 'history', count: 7, key: 'h' }
                ] },
                { group: 'try', items: PRESETS.map((p, i) => ({
                    glyph: '·', label: p.q.length > 22 ? p.q.slice(0, 22) + '…' : p.q, key: 'p' + i,
                    onClick: (e) => { e.preventDefault(); send(p.q); }
                })) }
            ]
        }),
        main: [
            h('div', { class: 'ds-section' },
                Heading({ level: 1, children: 'aicat' }),
                Lede({ children: 'an ai assistant with a cat persona. she replies in text, code (highlighted), markdown, images, pdfs, file attachments, or link cards — depending on what you ask.' }),
                AICatPortrait({
                    name: 'aicat',
                    status: state.thinking ? 'thinking…' : (state.mood === 'happy' ? 'online · purring' : 'online · idle'),
                    face: FACES[state.mood] || FACES.idle
                }),
                AICat({
                    name: 'aicat',
                    status: state.thinking ? 'thinking…' : 'online · purring',
                    messages: state.messages, thinking: state.thinking,
                    composer: ChatComposer({
                        value: state.draft,
                        placeholder: 'ask aicat anything…',
                        disabled: state.thinking,
                        onInput: (v) => { state.draft = v; kit.render(); },
                        onSend: send
                    })
                }),
                Panel({
                    title: 'about this kit',
                    children: h('div', { class: 'ds-pattern-notes' },
                        h('p', {}, '· portrait swaps with mood — ', Chip({ tone: 'dim', children: 'idle' }), ' ', Chip({ tone: 'dim', children: 'think' }), ' ', Chip({ tone: 'accent', children: 'happy' }), '.'),
                        h('p', {}, '· thinking-state appends a typing bubble, disables the composer, blocks pre-emptive multi-sends.'),
                        h('p', {}, '· classifier in ', h('code', {}, 'classifyAndReply()'), ' is deterministic — wire it to your model, replies stay shaped as ', h('code', {}, '{parts:[…]}'), '.')
                    )
                })
            )
        ],
        status: Status({
            left: ['aicat', '• ' + state.messages.length + ' turns', state.thinking ? '• thinking' : '• idle'],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '07 AICat' });
window.__aicat = { state, render: kit.render, send };
