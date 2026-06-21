import * as webjsx from 'webjsx';
import { Chat, ChatComposer, Topbar, Crumb, Status, Side, AppShell, Panel } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
import 'ds/index.js';
const h = webjsx.createElement;

const seed = [
    { who: 'them', avatar: 'jr', name: 'jordan', time: '14:02',
      parts: [{ kind: 'text', text: 'pushed v0.0.27, theme cleanup looks clean now. see the **release notes** in [the changelog](https://github.com/AnEntrypoint/design/releases).' }],
      reactions: [{ emoji: '🎉', count: 3, you: true }, { emoji: '👀', count: 1 }] },
    { who: 'them', avatar: 'mk', name: 'mai', time: '14:03',
      parts: [{ kind: 'text', text: 'nice. body-hide trick on first paint? share the diff?' }] },
    { who: 'you', avatar: 'me', time: '14:04', receipt: 'read',
      parts: [
        { kind: 'text', text: 'yeah — just hide `body` until styles+fonts+first paint ready. no flash.' },
        { kind: 'code', lang: 'css', filename: 'theme.css',
          code: 'html { visibility: hidden; }\nhtml.ready { visibility: visible; }\n\n@media (prefers-reduced-motion: reduce) {\n  * { animation-duration: 0ms !important; }\n}' }
      ] },
    { who: 'them', avatar: 'jr', name: 'jordan', time: '14:05',
      parts: [{ kind: 'md', text: '## review notes\n\nlooks solid. couple things:\n\n- short timeout fallback in case fonts hang\n- announce the `ready` class via `requestIdleCallback`\n- keep no-js fallback to `visibility: visible`\n\n> "ship the rough draft" — but not the broken one.\n\nwill review the rest tonight.' }],
      reactions: [{ emoji: '✅', count: 2, you: true }] },
    { who: 'them', avatar: 'mk', name: 'mai', time: '14:08',
      parts: [{ kind: 'image', src: './sample-svg.svg', alt: 'design system mascot', caption: 'spot the new mascot — final ✨' }] },
    { who: 'you', avatar: 'me', time: '14:10', receipt: 'read',
      parts: [
        { kind: 'text', text: 'attaching the v0.0.27 token sheet for review:' },
        { kind: 'pdf', src: './sample.pdf', name: 'tokens-v0.0.27.pdf', size: 782 }
      ] },
    { who: 'them', avatar: 'jr', name: 'jordan', time: '14:12',
      parts: [{ kind: 'link', href: 'https://github.com/AnEntrypoint/design', host: 'github.com',
                title: 'AnEntrypoint/design — design system for 247420',
                desc: 'a coherent visual paradigm — layered surfaces, monospace labels, loud content inside quiet chrome.',
                thumb: './sample-square.png' }] },
    { who: 'them', avatar: 'mk', name: 'mai', time: '14:14',
      parts: [{ kind: 'file', src: './sample.pdf', name: 'meeting-notes-2026-05-01.pdf', size: 782 }],
      reactions: [{ emoji: '📌', count: 1 }] }
];

const state = { draft: '', room: 'general', messages: seed.slice() };
const rooms = [
    { glyph: '#', label: 'general', count: 12, key: 'general' },
    { glyph: '#', label: 'design', count: 4, key: 'design' },
    { glyph: '#', label: 'releases', count: 1, key: 'releases' },
    { glyph: '#', label: 'lore', count: 0, key: 'lore' }
];
const dms = [
    { glyph: '·', label: 'jordan', key: 'jr' },
    { glyph: '·', label: 'mai', key: 'mk' },
    { glyph: '·', label: 'aicat', key: 'aicat' }
];

const root = document.getElementById('root');
function timeNow() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

function send(text) {
    state.messages = [...state.messages, {
        who: 'you', avatar: 'me', time: timeNow(), receipt: 'delivered',
        parts: [{ kind: 'text', text }]
    }];
    state.draft = '';
    kit.render();
    setTimeout(() => {
        state.messages = [...state.messages, {
            who: 'them', avatar: 'jr', name: 'jordan', time: timeNow(),
            parts: [{ kind: 'text', text: 'noted. *' + text.split(' ').slice(0, 6).join(' ') + '…*' }]
        }];
        state.messages = state.messages.map((m) => m.who === 'you' ? { ...m, receipt: 'read' } : m);
        kit.render();
    }, 1100);
}

function App() {
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'chat', items: [['index', '../../'], ['aicat', '../aicat/'], ['source ↗', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'chat' }),
        side: Side({
            sections: [
                { group: 'rooms', items: rooms.map(r => ({ ...r, active: state.room === r.key, onClick: (e) => { e.preventDefault(); state.room = r.key; kit.render(); } })) },
                { group: 'direct', items: dms.map(r => ({ ...r, active: state.room === r.key, onClick: (e) => { e.preventDefault(); state.room = r.key; kit.render(); } })) }
            ]
        }),
        main: [
            h('div', { class: 'ds-section' },
                h('h1', {}, '# ' + state.room),
                h('p', { class: 'lede' }, 'thread of messages with rich attachments — text, code (prism-highlighted), image, pdf, file, link, markdown (marked + DOMPurify), reactions, read-receipts.'),
                Chat({
                    title: state.room, sub: 'public', messages: state.messages,
                    composer: ChatComposer({
                        value: state.draft,
                        placeholder: 'message #' + state.room + '…',
                        onInput: (v) => { state.draft = v; kit.render(); },
                        onSend: send
                    })
                }),
                Panel({
                    title: 'pattern notes',
                    children: h('div', { class: 'ds-pattern-notes' },
                        h('p', {}, '· bubble corner-cut on the originating side (4–6px) gives directional read without arrows.'),
                        h('p', {}, '· own messages take the accent fill so the eye lands on what you said last; ✓ delivered, ✓✓ read.'),
                        h('p', {}, '· markdown is parsed by ', h('code', {}, 'marked'), ' and sanitized by ', h('code', {}, 'DOMPurify'), '; code blocks lit by ', h('code', {}, 'prism.js'), '.')
                    )
                })
            )
        ],
        status: Status({ left: ['main', '• ' + state.messages.length + ' messages', '• ' + rooms.length + ' rooms'], right: ['247420 / mmxxvi'] })
    });
}

const kit = mountKit({ root, view: App, screen: '06 Chat' });
window.__chat = { state, render: kit.render };
