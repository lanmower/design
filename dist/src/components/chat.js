// Chat surface — matches upstream signatures (parts, typing, reactions,
// receipts, aicat). Pure factories — props in, vnode out.
// Includes ChatMessage, ChatComposer, Chat, AICat, AICatPortrait.

import * as webjsx from '../../vendor/webjsx/index.js';
import { renderMarkdown, ensureReady as ensureMarkdownReady } from '../markdown.js';
import { highlightAllUnder, ensurePrism } from '../highlight.js';
import { register } from '../debug.js';

const h = webjsx.createElement;
let _stats = { messages: 0, lastKindCounts: {} };

export function fmtBytes(n) {
    if (n == null) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Inline-only markdown subset; safe for chat bubbles.
export function renderInline(text) {
    if (text == null) return [];
    const out = [];
    const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
    let last = 0; let m; let i = 0;
    const push = (n) => out.push(n);
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) push(h('span', { key: 's' + i + 'a' }, text.slice(last, m.index)));
        if (m[2] != null) push(h('strong', { key: 's' + i }, m[2]));
        else if (m[3] != null) push(h('em', { key: 's' + i }, m[3]));
        else if (m[4] != null) push(h('code', { key: 's' + i, class: 'chat-tick' }, m[4]));
        else if (m[5] != null) push(h('a', { key: 's' + i, href: m[6], target: '_blank', rel: 'noopener' }, m[5]));
        last = m.index + m[0].length; i += 1;
    }
    if (last < text.length) push(h('span', { key: 's' + i + 'a' }, text.slice(last)));
    return out;
}

const FILE_GLYPHS = { pdf: '▤', zip: '▦', tar: '▦', gz: '▦', mp4: '▶', mp3: '♪', wav: '♪', csv: '⊞', json: '{}', md: '§', txt: '§', default: '◫' };
function fileGlyph(name) {
    const ext = String(name || '').split('.').pop().toLowerCase();
    return FILE_GLYPHS[ext] || FILE_GLYPHS.default;
}

function MdNode(p) {
    const refSink = (el) => {
        if (!el) return;
        if (el.dataset.mdSrc === p.text) return;
        el.dataset.mdSrc = p.text || '';
        ensureMarkdownReady().then(() => renderMarkdown(p.text || '')).then((html) => { el.innerHTML = html; });
    };
    return h('div', { class: 'chat-bubble chat-md', ref: refSink });
}

function CodeNode(p) {
    const refSink = (el) => {
        if (!el) return;
        if (el.dataset.codeKey === (p.lang || '') + '|' + (p.code || '').length) return;
        el.dataset.codeKey = (p.lang || '') + '|' + (p.code || '').length;
        ensurePrism().then(() => highlightAllUnder(el));
    };
    return h('div', { class: 'chat-bubble chat-code', ref: refSink },
        h('div', { class: 'chat-code-head' },
            h('span', { class: 'lang' }, p.lang || 'code'),
            p.filename ? h('span', { class: 'name' }, p.filename) : null
        ),
        h('pre', {}, h('code', { class: p.lang ? 'lang-' + p.lang + ' language-' + p.lang : '' }, p.code || ''))
    );
}

const PART_RENDERERS = {
    text:  (p) => h('div', { class: 'chat-bubble' }, ...renderInline(p.text || '')),
    md:    (p) => MdNode(p),
    code:  (p) => CodeNode(p),
    image: (p) => h('a', { class: 'chat-image', href: p.href || p.src, target: '_blank', rel: 'noopener' },
        h('img', { src: p.src, alt: p.alt || '', loading: 'lazy' }),
        p.caption ? h('span', { class: 'cap' }, p.caption) : null),
    pdf:   (p) => h('div', { class: 'chat-pdf' },
        h('div', { class: 'chat-pdf-head' },
            h('span', { class: 'glyph' }, '▤'),
            h('span', { class: 'name' }, p.name || 'document.pdf'),
            p.size != null ? h('span', { class: 'size' }, fmtBytes(p.size)) : null,
            h('a', { class: 'open', href: p.src, target: '_blank', rel: 'noopener' }, 'open ↗')
        ),
        h('embed', { src: p.src, type: 'application/pdf' })),
    file:  (p) => h('a', { class: 'chat-file', href: p.src, target: '_blank', rel: 'noopener', download: p.name || true },
        h('span', { class: 'glyph' }, fileGlyph(p.name)),
        h('span', { class: 'meta' },
            h('span', { class: 'name' }, p.name || 'attachment'),
            h('span', { class: 'size' }, [p.kindLabel || (p.name || '').split('.').pop().toUpperCase(), p.size != null ? fmtBytes(p.size) : null].filter(Boolean).join(' · '))
        ),
        h('span', { class: 'go' }, '↓')),
    link:  (p) => h('a', { class: 'chat-link', href: p.href, target: '_blank', rel: 'noopener' },
        p.thumb ? h('img', { class: 'thumb', src: p.thumb, alt: '' }) : null,
        h('span', { class: 'meta' },
            h('span', { class: 'host' }, p.host || (() => { try { return new URL(p.href).host; } catch { return ''; } })()),
            h('span', { class: 'title' }, p.title || p.href),
            p.desc ? h('span', { class: 'desc' }, p.desc) : null
        ))
};

function renderPart(p, key) {
    const fn = PART_RENDERERS[p.kind] || PART_RENDERERS.text;
    const node = fn(p);
    if (node && typeof node === 'object') node.props = { ...(node.props || {}), key: 'p' + key };
    _stats.lastKindCounts[p.kind] = (_stats.lastKindCounts[p.kind] || 0) + 1;
    return node;
}

export function ChatMessage({ who = 'them', avatar, text, parts, time, typing, key, aicat, reactions, receipt, name }) {
    _stats.messages += 1;
    const cls = 'chat-msg ' + who + (aicat && who === 'them' ? ' aicat' : '');
    const av = h('span', { class: 'chat-avatar' }, avatar || (who === 'you' ? 'u' : '?'));
    let bodyNodes;
    if (typing) bodyNodes = [h('span', { class: 'chat-typing', key: 'typ' }, h('span'), h('span'), h('span'))];
    else if (parts && parts.length) bodyNodes = parts.map((p, i) => renderPart(p, i));
    else bodyNodes = [h('div', { class: 'chat-bubble', key: 't' }, ...renderInline(text || ''))];
    const reactionRow = reactions && reactions.length
        ? h('div', { class: 'chat-reactions' },
            ...reactions.map((r, i) => h('span', { class: 'rxn' + (r.you ? ' you' : ''), key: 'r' + i },
                h('span', { class: 'e' }, r.emoji), h('span', { class: 'n' }, String(r.count)))))
        : null;
    const tickNode = who === 'you' && receipt
        ? h('span', { class: 'tick' + (receipt === 'read' ? ' read' : '') }, receipt === 'read' ? '✓✓' : '✓')
        : null;
    const metaItems = [];
    if (name && who === 'them') metaItems.push(h('span', { class: 'who', key: 'w' }, name));
    if (time) metaItems.push(h('span', { class: 't', key: 'ti' }, time));
    if (tickNode) metaItems.push(tickNode);
    const meta = metaItems.length ? h('div', { class: 'chat-meta' }, ...metaItems) : null;
    const stack = h('div', { class: 'chat-stack' }, ...bodyNodes, reactionRow, meta);
    return h('div', { key, class: cls }, who === 'you' ? stack : av, who === 'you' ? av : stack);
}

export function ChatComposer({ value, onInput, onSend, placeholder = 'message…', disabled }) {
    const send = () => {
        const v = (value || '').trim();
        if (!v || disabled) return;
        if (onSend) onSend(v);
    };
    return h('div', { class: 'chat-composer' },
        h('textarea', { value: value || '', placeholder, rows: 1,
            oninput: (e) => onInput && onInput(e.target.value),
            onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } } }),
        h('button', { class: 'send', disabled: disabled || !(value && value.trim()), onclick: send }, '↑')
    );
}

export function Chat({ title = 'chat', sub, messages = [], composer, header } = {}) {
    return h('div', { class: 'chat' },
        header || h('div', { class: 'chat-head' },
            h('span', { class: 'dot' }),
            h('span', {}, title),
            sub ? h('span', { class: 'sub' }, ' · ' + sub) : null,
            h('span', { class: 'spread' }),
            h('span', { class: 'sub' }, String(messages.length).padStart(2, '0') + ' msgs')
        ),
        h('div', { class: 'chat-thread' },
            ...messages.map((m, i) => ChatMessage({ ...m, key: m.key != null ? m.key : i }))
        ),
        composer || null
    );
}

export const AICAT_FACE = ` /\\_/\\\n( o.o )\n > ^ <`;

export function AICatPortrait({ name = 'aicat', status = 'idle', face } = {}) {
    return h('div', { class: 'aicat-portrait' },
        h('pre', { class: 'aicat-face' }, face || AICAT_FACE),
        h('div', { class: 'aicat-meta' },
            h('span', { class: 'name' }, name),
            h('span', { class: 'status' }, h('span', { class: 'dot' }, '● '), status)
        )
    );
}

export function AICat({ name = 'aicat', messages = [], thinking, composer, status = 'online · purring' } = {}) {
    const annotated = messages.map((m) =>
        m.who === 'them' ? { ...m, aicat: true, avatar: m.avatar || '=^.^=' } : m);
    const all = thinking
        ? [...annotated, { who: 'them', aicat: true, avatar: '=^.^=', typing: true, key: '_thinking' }]
        : annotated;
    return h('div', { class: 'chat' },
        h('div', { class: 'chat-head' },
            h('span', { class: 'dot' }),
            h('span', {}, name),
            h('span', { class: 'sub' }, ' · ' + status),
            h('span', { class: 'spread' }),
            h('span', { class: 'sub' }, String(messages.length).padStart(2, '0') + ' turns')
        ),
        h('div', { class: 'chat-thread' },
            ...all.map((m, i) => ChatMessage({ ...m, key: m.key != null ? m.key : i }))
        ),
        composer || null
    );
}

register('chat', () => ({ messages: _stats.messages, lastKindCounts: { ..._stats.lastKindCounts } }));
