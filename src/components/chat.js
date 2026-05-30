// Chat surface — matches upstream signatures (parts, typing, reactions,
// receipts, aicat). Pure factories — props in, vnode out.
// Includes ChatMessage, ChatComposer, Chat, AICat, AICatPortrait.

import * as webjsx from '../../vendor/webjsx/index.js';
import { renderMarkdownCached, highlightCodeBlockCached, initializeCachesEagerly, getCacheStats } from '../markdown-cache.js';
import { register } from '../debug.js';
import { Icon } from './shell.js';

const h = webjsx.createElement;
let _stats = { messages: 0, lastKindCounts: {} };
let _cacheInitialized = false;

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

// Map file extension -> line-icon name (drawn SVG, not a decorative glyph).
const FILE_ICONS = { pdf: 'file-pdf', zip: 'file-zip', tar: 'file-zip', gz: 'file-zip', mp4: 'file-video', mov: 'file-video', mp3: 'file-audio', wav: 'file-audio', csv: 'file-sheet', json: 'file-code', js: 'file-code', ts: 'file-code', md: 'file-text', txt: 'file-text' };
function fileIconName(name) {
    const ext = String(name || '').split('.').pop().toLowerCase();
    return FILE_ICONS[ext] || 'file';
}

// Eagerly warm the markdown + Prism caches on first chat-surface mount, once.
function ensureCachesInit() {
    if (_cacheInitialized) return;
    _cacheInitialized = true;
    initializeCachesEagerly().catch((err) => console.warn('[247420] cache init error:', err));
}

// Build a ref callback that keeps a scroll container pinned to the bottom when
// new messages arrive AND the user is already at the bottom (sentinel visible).
// `getCount` returns the current message count so the observer compares against
// live state. Shared by Chat, AICat, and AgentChat.
export function makeThreadAutoScroll(getCount) {
    return (el) => {
        if (!el) return;
        let sentinel = el.querySelector('[data-scroll-sentinel]');
        if (!sentinel) {
            sentinel = document.createElement('div');
            sentinel.setAttribute('data-scroll-sentinel', '');
            sentinel.style.height = '1px';
            el.appendChild(sentinel);
        }
        const obs = new IntersectionObserver((entries) => {
            const count = String(getCount());
            if (entries[0]?.isIntersecting && el.dataset.msgCount !== count) {
                el.scrollTop = el.scrollHeight - el.clientHeight;
                el.dataset.msgCount = count;
            }
        }, { root: el, threshold: 0 });
        obs.observe(sentinel);
        el.dataset.msgCount = String(getCount());
        return () => obs.disconnect();
    };
}

function MdNode(p) {
    const refSink = (el) => {
        if (!el) return;
        if (el.dataset.mdSrc === p.text) return;
        el.dataset.mdSrc = p.text || '';
        renderMarkdownCached(p.text || '').then((html) => { el.innerHTML = html; });
    };
    return h('div', { class: 'chat-bubble chat-md', ref: refSink });
}

function CodeNode(p) {
    const refSink = (el) => {
        if (!el) return;
        if (el.dataset.codeKey === (p.lang || '') + '|' + (p.code || '').length) return;
        el.dataset.codeKey = (p.lang || '') + '|' + (p.code || '').length;
        highlightCodeBlockCached(el);
    };
    return h('div', { class: 'chat-bubble chat-code', ref: refSink },
        h('div', { class: 'chat-code-head' },
            h('span', { class: 'lang' }, p.lang || 'code'),
            p.filename ? h('span', { class: 'name' }, p.filename) : null
        ),
        h('pre', {}, h('code', { class: p.lang ? 'lang-' + p.lang + ' language-' + p.lang : '' }, p.code || ''))
    );
}

// Freddie-flavored agent parts: collapsible tool-call card, tool-result, and
// transient thinking indicator. Each renders as a `chat-bubble` variant so the
// surrounding ChatMessage chrome (avatar/meta/reactions) stays consistent.
function ToolCallNode(p) {
    const status = p.status || (p.error ? 'error' : (p.result != null ? 'done' : 'running'));
    const argsText = typeof p.args === 'string' ? p.args : JSON.stringify(p.args || {}, null, 2);
    const resultText = p.result == null ? '' : (typeof p.result === 'string' ? p.result : JSON.stringify(p.result, null, 2));
    return h('details', { class: 'chat-bubble chat-tool tool-' + status, open: !!p.open },
        h('summary', { class: 'chat-tool-head' },
            h('span', { class: 'chat-tool-icon', 'aria-hidden': 'true' }, status === 'running' ? '◌' : (status === 'error' ? '!' : '✓')),
            h('span', { class: 'chat-tool-name' }, p.name || 'tool'),
            p.label ? h('span', { class: 'chat-tool-label' }, p.label) : null,
            h('span', { class: 'chat-tool-status' }, status)
        ),
        h('div', { class: 'chat-tool-body' },
            h('div', { class: 'chat-tool-section' },
                h('div', { class: 'chat-tool-section-label' }, 'args'),
                h('pre', { class: 'chat-tool-pre' }, h('code', {}, argsText))),
            resultText ? h('div', { class: 'chat-tool-section' },
                h('div', { class: 'chat-tool-section-label' }, p.error ? 'error' : 'result'),
                h('pre', { class: 'chat-tool-pre' + (p.error ? ' is-error' : '') }, h('code', {}, resultText))) : null
        )
    );
}

function ThinkingNode(p) {
    return h('div', { class: 'chat-bubble chat-thinking', role: 'status', 'aria-live': 'polite' },
        h('span', { class: 'chat-thinking-dots', 'aria-hidden': 'true' }, h('span'), h('span'), h('span')),
        h('span', { class: 'chat-thinking-text' }, p.text || 'thinking…')
    );
}

const PART_RENDERERS = {
    text:  (p) => h('div', { class: 'chat-bubble' }, ...renderInline(p.text || '')),
    md:    (p) => MdNode(p),
    code:  (p) => CodeNode(p),
    tool:        (p) => ToolCallNode(p),
    tool_call:   (p) => ToolCallNode(p),
    tool_result: (p) => ToolCallNode({ ...p, name: p.name || 'tool_result', result: p.text != null ? p.text : p.result }),
    thinking:    (p) => ThinkingNode(p),
    image: (p) => h('a', { class: 'chat-image', href: p.href || p.src, target: '_blank', rel: 'noopener', 'aria-label': p.alt || `embedded image: ${p.src}` },
        h('img', { src: p.src, alt: p.alt || `embedded image from ${p.src}`, loading: 'lazy' }),
        p.caption ? h('span', { class: 'cap' }, p.caption) : null),
    pdf:   (p) => h('div', { class: 'chat-pdf' },
        h('div', { class: 'chat-pdf-head' },
            h('span', { class: 'glyph', 'aria-hidden': 'true' }, Icon('file-pdf', { size: 18 })),
            h('span', { class: 'name' }, p.name || 'document.pdf'),
            p.size != null ? h('span', { class: 'size' }, fmtBytes(p.size)) : null,
            h('a', { class: 'open', href: p.src, target: '_blank', rel: 'noopener', 'aria-label': `open PDF: ${p.name || 'document.pdf'}` }, 'open ->')
        ),
        h('embed', { src: p.src, type: 'application/pdf', 'aria-label': `PDF document: ${p.name || 'document.pdf'}` })),
    file:  (p) => h('a', { class: 'chat-file', href: p.src, target: '_blank', rel: 'noopener', download: p.name || true, 'aria-label': `download file: ${p.name || 'attachment'} (${p.kindLabel || (p.name || '').split('.').pop().toUpperCase()})` },
        h('span', { class: 'glyph', 'aria-hidden': 'true' }, Icon(fileIconName(p.name), { size: 22 })),
        h('span', { class: 'meta' },
            h('span', { class: 'name' }, p.name || 'attachment'),
            h('span', { class: 'size' }, [p.kindLabel || (p.name || '').split('.').pop().toUpperCase(), p.size != null ? fmtBytes(p.size) : null].filter(Boolean).join(' · '))
        ),
        h('span', { class: 'go', 'aria-hidden': 'true' }, Icon('arrow-down'))),
    link:  (p) => h('a', { class: 'chat-link', href: p.href, target: '_blank', rel: 'noopener', 'aria-label': `link: ${p.title || p.href}` },
        p.thumb ? h('img', { class: 'thumb', src: p.thumb, alt: `preview for ${p.title || p.href}` }) : null,
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

export function ChatMessage({ role, who = 'them', avatar, text, parts, time, typing, key, aicat, reactions, receipt, name }) {
    _stats.messages += 1;
    // Support legacy 'who' prop, prefer 'role' with mapping:
    //   'user'      -> 'you'   (right-aligned, accent bubble)
    //   'assistant' -> 'them'  (left-aligned, paper bubble)
    //   'system'    -> 'system' (centered, italic muted)
    //   'tool'      -> 'tool'   (centered, collapsible card chrome)
    //   'thinking'  -> 'thinking' (centered, transient typing dots)
    const resolvedWho = role
        ? (role === 'user' ? 'you'
            : role === 'assistant' ? 'them'
            : (role === 'system' || role === 'tool' || role === 'thinking') ? role
            : role)
        : who;
    const isCentered = resolvedWho === 'system' || resolvedWho === 'tool' || resolvedWho === 'thinking';
    const cls = 'chat-msg ' + resolvedWho + (aicat && resolvedWho === 'them' ? ' aicat' : '') + (isCentered ? ' centered' : '');
    const fallbackAvatar = avatar != null
        ? avatar
        : (resolvedWho === 'you' ? 'u' : (name ? String(name).trim().charAt(0).toUpperCase() || '?' : '?'));
    const av = h('span', { class: 'chat-avatar' }, fallbackAvatar);
    let bodyNodes;
    if (typing) bodyNodes = [h('div', { class: 'chat-bubble', key: 'typb' }, h('span', { class: 'chat-typing' }, h('span'), h('span'), h('span')))];
    else if (parts && parts.length) bodyNodes = parts.map((p, i) => renderPart(p, i));
    else bodyNodes = [h('div', { class: 'chat-bubble', key: 't' }, ...renderInline(text || ''))];
    const reactionRow = reactions && reactions.length
        ? h('div', { class: 'chat-reactions' },
            ...reactions.map((r, i) => h('span', { class: 'rxn' + (r.you ? ' you' : ''), key: 'r' + i, 'aria-label': `${r.emoji} reaction (${String(r.count)} ${String(r.count) === '1' ? 'reaction' : 'reactions'})${r.you ? ' - you reacted' : ''}` },
                h('span', { class: 'e', 'aria-hidden': 'true' }, r.emoji), h('span', { class: 'n', 'aria-hidden': 'true' }, String(r.count)))))
        : null;
    const tickNode = resolvedWho === 'you' && receipt
        ? h('span', { class: 'tick' + (receipt === 'read' ? ' read' : ''), role: 'img', 'aria-label': receipt === 'read' ? 'message read' : 'message sent' }, Icon(receipt === 'read' ? 'check-check' : 'check', { size: 14 }))
        : null;
    const metaItems = [];
    if (name && resolvedWho === 'them') metaItems.push(h('span', { class: 'who', key: 'w' }, name));
    if (time) metaItems.push(h('span', { class: 't', key: 'ti' }, time));
    if (tickNode) metaItems.push(tickNode);
    const meta = metaItems.length ? h('div', { class: 'chat-meta' }, ...metaItems) : null;
    const stack = h('div', { class: 'chat-stack' }, ...bodyNodes, reactionRow, meta);
    // Centered roles (system/tool/thinking) skip the avatar column entirely so
    // the bubble owns the full row — the chrome reads as out-of-band signal,
    // not a participant turn.
    if (isCentered) return h('div', { key, class: cls }, stack);
    return h('div', { key, class: cls }, resolvedWho === 'you' ? stack : av, resolvedWho === 'you' ? av : stack);
}

export function ChatComposer({ value, onInput, onSend, onAttach, onEmoji, onMenu, onCancel, busy, placeholder = 'message…', disabled }) {
    // Keep a handle to the live textarea so send() reads the actual DOM value
    // (not the possibly-lagging `value` prop) and so we can sync the DOM value
    // only when it genuinely differs — re-applying `value` on every parent
    // re-render otherwise resets the caret and drops fast keystrokes.
    let taEl = null;
    const send = () => {
        const v = ((taEl && taEl.value) || value || '').trim();
        if (!v || disabled) return;
        if (onSend) onSend(v);
    };
    let autoGrowScheduled = false;
    const autoGrow = (e) => {
        const ta = e.target;
        if (onInput) onInput(ta.value);
        // Debounce scrollHeight read with rAF to prevent sync reflow thrashing
        if (!autoGrowScheduled) {
            autoGrowScheduled = true;
            requestAnimationFrame(() => {
                ta.style.height = 'auto';
                ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
                autoGrowScheduled = false;
            });
        }
    };
    const taRef = (el) => {
        if (!el) return;
        taEl = el;
        // Sync the controlled value into the DOM only when it actually differs,
        // so a re-render mid-type does not clobber the caret or pending input.
        const next = value || '';
        if (el.value !== next) el.value = next;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    };
    return h('div', { class: 'chat-composer' },
        h('textarea', { ref: taRef, placeholder, rows: 1, 'aria-label': 'message input',
            oninput: autoGrow,
            onkeydown: (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                if (e.key === ';' && e.ctrlKey) { e.preventDefault(); onEmoji && onEmoji(e); }
            } }),
        h('div', { class: 'chat-composer-toolbar' },
            onAttach ? h('button', { type: 'button', class: 'composer-btn', onclick: (e) => { e.preventDefault(); onAttach(e); }, 'aria-label': 'attach file', title: 'attach file' }, Icon('paperclip')) : null,
            onEmoji ? h('button', { type: 'button', class: 'composer-btn', onclick: (e) => { e.preventDefault(); onEmoji(e); }, 'aria-label': 'emoji picker', title: 'emoji picker (Ctrl+;)' }, Icon('smile')) : null,
            onMenu ? h('button', { type: 'button', class: 'composer-btn', onclick: (e) => { e.preventDefault(); onMenu(e); }, 'aria-label': 'composer menu', title: 'more options' }, Icon('more-horizontal')) : null,
            busy && onCancel
                ? h('button', { type: 'button', class: 'send cancel', onclick: (e) => { e.preventDefault(); onCancel(e); }, 'aria-label': 'stop generating', title: 'stop generating (Esc)' }, Icon('square'))
                : h('button', { type: 'button', class: 'send', disabled: disabled || !(value && value.trim()), onclick: send, 'aria-label': 'send message', title: 'send message (Enter)' }, Icon('arrow-up'))
        )
    );
}

export function Chat({ title = 'chat', sub, messages = [], composer, header, suggestions, onSuggestionClick } = {}) {
    // Warm markdown/Prism caches once so library loading parallelizes.
    ensureCachesInit();
    const threadRef = makeThreadAutoScroll(() => messages.length);
    const msgCount = messages.length;
    return h('div', { class: 'chat' },
        header || h('div', { class: 'chat-head', role: 'banner' },
            h('span', { class: 'dot', 'aria-hidden': 'true' }),
            h('h2', { class: 'ds-chat-title' }, title),
            sub ? h('span', { class: 'sub', 'aria-label': `subtitle: ${sub}` }, ' · ' + sub) : null,
            h('span', { class: 'spread' }),
            msgCount > 0
                ? h('span', { class: 'sub', 'aria-live': 'polite' }, msgCount + (msgCount === 1 ? ' message' : ' messages'))
                : null
        ),
        h('div', { class: 'chat-thread', ref: threadRef, role: 'log', 'aria-label': 'chat messages' },
            messages.length === 0
                ? h('div', { key: '_empty', class: 'chat-empty', role: 'status' },
                    h('p', { class: 'chat-empty-title' }, 'start a conversation'),
                    h('p', { class: 'chat-empty-sub' }, sub || 'ask anything — i can search, read files, recall context, and call tools'),
                    (suggestions && suggestions.length)
                        ? h('div', { class: 'chat-empty-suggestions' },
                            ...suggestions.map((s, i) => h('button', { key: 'sug' + i, type: 'button', class: 'chat-empty-suggestion',
                                onclick: () => { if (onSuggestionClick) onSuggestionClick(typeof s === 'string' ? s : (s.prompt || s.text || '')); } },
                                typeof s === 'string' ? s : (s.label || s.text || s.prompt))))
                        : null)
                : null,
            ...messages.map((m, i) => ChatMessage({ ...m, key: m.key != null ? m.key : i }))
        ),
        composer || null
    );
}

export const AICAT_FACE = ` /\\_/\\\n( o.o )\n > ^ <`;

export function AICatPortrait({ name = 'aicat', status = 'idle', face } = {}) {
    return h('div', { class: 'aicat-portrait' },
        h('pre', { class: 'aicat-face', 'aria-label': `${name} portrait` }, face || AICAT_FACE),
        h('div', { class: 'aicat-meta' },
            h('span', { class: 'name' }, name),
            h('span', { class: 'status', 'aria-label': `status: ${status}` }, h('span', { class: 'dot ds-dot ds-dot-on', 'aria-hidden': 'true' }), ' ', status)
        )
    );
}

export function AICat({ name = 'aicat', messages = [], thinking, composer, status = 'online · purring' } = {}) {
    ensureCachesInit();
    const annotated = messages.map((m) =>
        m.who === 'them' ? { ...m, aicat: true, avatar: m.avatar || '=^.^=' } : m);
    const all = thinking
        ? [...annotated, { who: 'them', aicat: true, avatar: '=^.^=', typing: true, key: '_thinking' }]
        : annotated;
    const threadRef = makeThreadAutoScroll(() => all.length);
    return h('div', { class: 'chat' },
        h('div', { class: 'chat-head', role: 'banner' },
            h('span', { class: 'dot', 'aria-hidden': 'true' }),
            h('h2', { class: 'ds-chat-title' }, name),
            h('span', { class: 'sub', 'aria-label': `status: ${status}` }, ' · ' + status),
            h('span', { class: 'spread' }),
            messages.length > 0
                ? h('span', { class: 'sub', 'aria-live': 'polite' }, messages.length + (messages.length === 1 ? ' turn' : ' turns'))
                : null
        ),
        h('div', { class: 'chat-thread', ref: threadRef, role: 'log', 'aria-label': 'conversation turns' },
            ...all.map((m, i) => ChatMessage({ ...m, key: m.key != null ? m.key : i }))
        ),
        composer || null
    );
}

register('chat', () => ({
    messages: _stats.messages,
    lastKindCounts: { ..._stats.lastKindCounts },
    cacheStats: getCacheStats(),
}));
