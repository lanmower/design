// Chat surface — matches upstream signatures (parts, typing, reactions,
// receipts, aicat). Pure factories — props in, vnode out.
// Includes ChatMessage, ChatComposer, Chat, AICat, AICatPortrait.

import * as webjsx from '../../vendor/webjsx/index.js';
import { renderMarkdownCached, highlightCodeBlockCached, initializeCachesEagerly, getCacheStats } from '../markdown-cache.js';
import { isDegraded as isMarkdownDegraded } from '../markdown.js';
import { register } from '../debug.js';
import { Icon } from './shell.js';
import { fmtFileSize } from './files.js';
import { EmojiPicker } from './overlay-primitives.js';

// Matches a trailing `:keyword` at the end of the composer draft (optionally
// preceded by whitespace/start-of-string) so typing `:smile` opens an inline
// filtered EmojiPicker without requiring the toolbar button or Ctrl+;.
const EMOJI_TRIGGER_RE = /(?:^|\s)(:([a-zA-Z0-9_+-]{0,24}))$/;

const h = webjsx.createElement;
let _stats = { messages: 0, lastKindCounts: {} };
let _cacheInitialized = false;

// ONE byte format across the kit: fmtFileSize (files.js) is canonical; the old
// divergent fmtBytes ('0.0 KB' for zero, no B tier) is gone — this alias keeps
// existing imports working while rendering the same string as the Files grid.
export const fmtBytes = fmtFileSize;

// Reject dangerous URL schemes (javascript:, data:, vbscript:, file:) so an
// inline markdown link or an image src built from untrusted text can't smuggle a
// script-executing or data-exfiltrating URL past the inline renderer (which does
// NOT pass through DOMPurify the way the full md path does). http(s), mailto,
// protocol-relative, root/relative, and anchor links are allowed.
export function safeUrl(url) {
    const s = String(url == null ? '' : url).trim();
    if (!s) return null;
    // Allow relative / anchor / protocol-relative without a scheme.
    if (/^(\/|\.|#|\?)/.test(s) || s.startsWith('//')) return s;
    const scheme = (s.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/) || [])[1];
    if (!scheme) return s; // schemeless relative
    return /^(https?|mailto|tel)$/i.test(scheme) ? s : null;
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
        else if (m[5] != null) {
            const safe = safeUrl(m[6]);
            // A link with a rejected (unsafe) scheme degrades to its plain label
            // text rather than a clickable, scheme-smuggling anchor.
            if (safe) push(h('a', { key: 's' + i, href: safe, target: '_blank', rel: 'noopener noreferrer' }, m[5]));
            else push(h('span', { key: 's' + i }, m[5]));
        }
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

// True when the user has a non-collapsed text selection anchored inside `el`.
// Used to pause auto-scroll (and by hosts to pause streaming re-renders) so
// select-and-copy from a still-streaming message is not wiped every frame.
export function hasSelectionInside(el) {
    const sel = typeof document !== 'undefined' && document.getSelection ? document.getSelection() : null;
    return !!(sel && !sel.isCollapsed && sel.anchorNode && el && el.contains(sel.anchorNode));
}

// Build a ref callback that keeps a scroll container pinned to the bottom when
// new messages arrive AND the user is already at the bottom (sentinel visible).
// `getCount` returns the current message count so the observer compares against
// live state. Shared by Chat, AICat, and AgentChat.
// CONTRACT: auto-scroll pauses while the user holds a non-collapsed selection
// inside the thread (hasSelectionInside) — the same guard hosts apply to their
// streaming re-render pass — and resumes once the selection collapses.
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
            if (hasSelectionInside(el)) return; // don't fight an active selection
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

// Inject a per-block copy button into every <pre> inside a rendered-markdown
// container. claude.ai/code and Claude Desktop give EVERY fenced block a hover
// copy affordance; the chat surface had only a whole-message copy. Idempotent:
// marks each <pre> with data-copy-wired so re-renders don't stack buttons. The
// button reveals on .chat-code-block:hover/:focus-within (CSS) and flips its
// label copy -> copied for ~1.6s. Drawn with a real icon + word, no glyph.
export function injectCodeCopy(container) {
    if (!container) return;
    container.querySelectorAll('pre').forEach((pre) => {
        if (pre.dataset.copyWired === '1') return;
        pre.dataset.copyWired = '1';
        // Wrap the <pre> in a position:relative shell so the button can sit
        // top-right without disturbing code layout.
        const shell = document.createElement('div');
        shell.className = 'chat-code-block';
        pre.parentNode.insertBefore(shell, pre);
        shell.appendChild(pre);
        // Surface the fenced language as a small header tab (claude.ai/code
        // shows the language on every block, not just the structured CodeNode).
        // The highlighter sets language-xx / lang-xx on the inner <code>.
        const codeEl = pre.querySelector('code');
        const langCls = codeEl && (codeEl.className || '').match(/(?:language|lang)-([a-z0-9+#]+)/i);
        if (langCls && langCls[1]) {
            const lang = document.createElement('span');
            lang.className = 'chat-code-lang';
            lang.setAttribute('aria-hidden', 'true');
            lang.textContent = langCls[1];
            shell.appendChild(lang);
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chat-code-copy';
        btn.setAttribute('aria-label', 'copy code');
        btn.textContent = 'copy';
        btn.addEventListener('click', () => {
            const code = pre.innerText;
            const done = () => { btn.textContent = 'copied'; btn.classList.add('is-copied'); setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('is-copied'); }, 1600); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done).catch(() => {});
            else { try { const t = document.createElement('textarea'); t.value = code; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); done(); } catch {} }
        });
        shell.appendChild(btn);
    });
}

const MD_STREAM_THROTTLE_MS = 120;
const MD_STREAM_MIN_DELTA_CHARS = 40;

function MdNode(p) {
    const refSink = (el) => {
        if (!el) return;
        // Version the per-element source key with a degraded marker: a bubble
        // rendered while the markdown loader was down re-renders (real markdown)
        // once the loader recovers, instead of staying plain-escaped forever.
        const srcKey = (isMarkdownDegraded() ? '~degraded~' : '') + (p.text || '');
        if (el.dataset.mdSrc === srcKey) return;
        // While streaming (text still growing, not the final settle), a full
        // re-parse of the WHOLE accumulated text on every rAF tick is the
        // dominant cost of a long stream. Throttle: skip the parse unless
        // enough time or enough new characters landed since the last one.
        // p.streamingCaret (already threaded by the host for the stream-head
        // caret) marks "still streaming"; its absence forces the final parse
        // so nothing is left un-parsed once the turn settles.
        const parsedLen = el.dataset.mdParsedLen ? Number(el.dataset.mdParsedLen) : 0;
        const lastParseAt = el.dataset.mdLastParseAt ? Number(el.dataset.mdLastParseAt) : 0;
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (p.streamingCaret && parsedLen > 0 &&
            (now - lastParseAt) < MD_STREAM_THROTTLE_MS &&
            (srcKey.length - parsedLen) < MD_STREAM_MIN_DELTA_CHARS) {
            // Not enough new content/time yet — paint raw text so the latest
            // characters are visible, but defer the expensive re-parse.
            el.textContent = p.text || '';
            return;
        }
        el.dataset.mdSrc = srcKey;
        el.dataset.mdParsedLen = String(srcKey.length);
        el.dataset.mdLastParseAt = String(now);
        // Markdown stack still loading (or down): paint the raw text
        // synchronously so streamed tokens are visible the same frame they
        // arrive (an empty bubble until the CDN import resolves reads as a
        // hang); the resolved render swaps in sanitized markdown in place.
        if (isMarkdownDegraded()) el.textContent = p.text || '';
        renderMarkdownCached(p.text || '').then((html) => { el.innerHTML = html; injectCodeCopy(el); });
    };
    return h('div', { class: 'chat-bubble chat-md', ref: refSink });
}

function CodeNode(p) {
    const refSink = (el) => {
        if (!el) return;
        // Key on the full code, not its length: two different blocks of the same
        // length (e.g. an edit that swaps a line) would otherwise share a key and
        // skip re-highlighting, leaving stale syntax coloring.
        const codeKey = (p.lang || '') + '|' + (p.code || '');
        if (el.dataset.codeKey === codeKey) return;
        el.dataset.codeKey = codeKey;
        highlightCodeBlockCached(el);
    };
    // Copy the raw code (not the highlighted DOM) for the structured CodeNode.
    const onCopy = (e) => {
        const btn = e.currentTarget;
        const code = p.code || '';
        const done = () => { btn.textContent = 'copied'; btn.classList.add('is-copied'); setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('is-copied'); }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done).catch(() => {});
        else { try { const t = document.createElement('textarea'); t.value = code; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); done(); } catch {} }
    };
    return h('div', { class: 'chat-bubble chat-code', ref: refSink },
        h('div', { class: 'chat-code-head' },
            h('span', { class: 'lang' }, p.lang || 'code'),
            p.filename ? h('span', { class: 'name' }, p.filename) : null,
            h('span', { class: 'spread' }),
            h('button', { type: 'button', class: 'chat-code-copy chat-code-copy-head', 'aria-label': 'copy code', onclick: onCopy }, 'copy')
        ),
        h('pre', {}, h('code', { class: p.lang ? 'lang-' + p.lang + ' language-' + p.lang : '' }, p.code || ''))
    );
}

// Freddie-flavored agent parts: collapsible tool-call card, tool-result, and
// transient thinking indicator. Each renders as a `chat-bubble` variant so the
// surrounding ChatMessage chrome (avatar/meta/reactions) stays consistent.
function ToolCallNode(p) {
    const status = p.status || (p.error ? 'error' : (p.result != null ? 'done' : 'running'));
    // Args/result are re-stringified on every rAF re-render while any part of
    // the turn is streaming, even for collapsed cards whose own args/result
    // haven't changed since the last frame. Cache by identity on the part
    // object itself so an unchanged args/result skips the stringify.
    if (p._argsCache !== p.args) {
        p._argsTextCache = typeof p.args === 'string' ? p.args : JSON.stringify(p.args || {}, null, 2);
        p._argsCache = p.args;
    }
    const argsText = p._argsTextCache;
    if (p._resultCache !== p.result) {
        p._resultTextCache = p.result == null ? '' : (typeof p.result === 'string' ? p.result : JSON.stringify(p.result, null, 2));
        p._resultCache = p.result;
    }
    const resultText = p._resultTextCache;
    const hasArgs = p.args != null && argsText !== '{}' && argsText.trim() !== '';
    // Default-open while running or on error so the user sees live progress / failure detail;
    // collapse on success unless the caller explicitly overrides with open:true.
    const defaultOpen = p.open != null ? !!p.open : (status === 'running' || status === 'error');
    const iconName = status === 'running' ? 'refresh' : (status === 'error' ? 'warn' : 'check');
    const copyText = (txt) => (e) => {
        const b = e.currentTarget;
        const done = () => {
            b.textContent = 'copied';
            b.classList.add('is-copied');
            setTimeout(() => { b.textContent = 'copy'; b.classList.remove('is-copied'); }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(() => {});
        else { try { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); done(); } catch {} }
    };
    const sectionLabel = (text, txt) => h('div', { class: 'chat-tool-section-label' },
        h('span', {}, text),
        h('button', { type: 'button', class: 'chat-code-copy chat-tool-copy', 'aria-label': 'copy ' + text, onclick: copyText(txt) }, 'copy'));
    return h('details', { class: 'chat-bubble chat-tool tool-' + status, open: defaultOpen },
        h('summary', { class: 'chat-tool-head' },
            h('span', { class: 'chat-tool-icon', 'aria-hidden': 'true' }, Icon(iconName, { size: 14 })),
            h('span', { class: 'chat-tool-name' }, p.name || 'tool'),
            p.label ? h('span', { class: 'chat-tool-label' }, p.label) : null,
            h('span', { class: 'chat-tool-status' }, status)
        ),
        h('div', { class: 'chat-tool-body' },
            ...[
                hasArgs ? h('div', { class: 'chat-tool-section' },
                    sectionLabel('args', argsText),
                    h('pre', { class: 'chat-tool-pre' }, h('code', {}, argsText))) : null,
                resultText ? h('div', { class: 'chat-tool-section' },
                    sectionLabel(p.error ? 'error' : 'result', resultText),
                    h('pre', { class: 'chat-tool-pre' + (p.error ? ' is-error' : '') }, h('code', {}, resultText)))
                    // A finished tool with no output would otherwise render no result
                    // section, reading identically to a still-running tool. Show an
                    // explicit placeholder so "done, empty" is distinguishable.
                    : (status === 'done' ? h('div', { class: 'chat-tool-section' },
                        h('div', { class: 'chat-tool-section-label' }, 'result'),
                        h('pre', { class: 'chat-tool-pre chat-tool-empty' }, h('code', {}, '(no output)'))) : null)
            ].filter(Boolean)
        )
    );
}

function ThinkingNode(p) {
    if (p.settled) {
        return h('details', { class: 'chat-bubble chat-thinking-settled' },
            h('summary', {}, 'View thinking'),
            h('div', { class: 'chat-thinking-body' }, p.text)
        );
    }
    return h('div', { class: 'chat-bubble chat-thinking', role: 'status', 'aria-live': 'polite' },
        h('span', { class: 'chat-thinking-dots', 'aria-hidden': 'true' }, h('span'), h('span'), h('span')),
        h('span', { class: 'chat-thinking-text' }, p.text || 'thinking…')
    );
}

const PART_RENDERERS = {
    text:  (p) => p.preShell
        // Streaming prose that already contains a code fence (or a huge tail
        // window) renders as a plain monospaced <pre> so it does not reflow from
        // prose to a styled block on settle (no Prism mid-stream). The settled
        // turn renders real markdown. `streamHead` is an optional head line for
        // the tail-window path ('streaming · N KB so far').
        ? h('div', { class: 'chat-bubble chat-md chat-stream-pre' },
            ...[p.streamHead ? h('div', { key: 'sh', class: 'chat-stream-head', role: 'status', 'aria-live': 'polite' }, p.streamHead) : null,
               h('pre', { key: 'pre' }, h('code', {}, p.text || '')),
               p.streamingCaret ? h('span', { key: '_caret', class: 'chat-stream-caret', 'aria-hidden': 'true' }) : null].filter(Boolean))
        : h('div', { class: 'chat-bubble' + (p.mdShell ? ' chat-md' : '') },
            ...renderInline(p.text || ''),
            p.streamingCaret ? h('span', { key: '_caret', class: 'chat-stream-caret', 'aria-hidden': 'true' }) : null),
    md:    (p) => MdNode(p),
    code:  (p) => CodeNode(p),
    tool:        (p) => ToolCallNode(p),
    tool_call:   (p) => ToolCallNode(p),
    tool_result: (p) => ToolCallNode({ ...p, name: p.name || 'tool_result', result: p.text != null ? p.text : p.result }),
    thinking:    (p) => ThinkingNode(p),
    image: (p) => {
        // Guard both the wrapping link and the img src against unsafe schemes
        // (e.g. a data:text/html src) so an embedded-image part from untrusted
        // markdown can't smuggle an active payload.
        const imgSrc = safeUrl(p.src);
        const linkHref = safeUrl(p.href || p.src);
        if (!imgSrc) return h('span', { class: 'chat-image-blocked' }, p.alt || 'image blocked (unsafe url)');
        return h('a', { class: 'chat-image', href: linkHref || imgSrc, target: '_blank', rel: 'noopener noreferrer', 'aria-label': p.alt || `embedded image: ${imgSrc}` },
            h('img', { src: imgSrc, alt: p.alt || `embedded image from ${imgSrc}`, loading: 'lazy' }),
            p.caption ? h('span', { class: 'cap' }, p.caption) : null);
    },
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
    link:  (p) => h('a', { class: 'chat-link', href: safeUrl(p.href) || '#', target: '_blank', rel: 'noopener noreferrer', 'aria-label': `link: ${p.title || p.href}` },
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

export function ChatMessage({ role, who = 'them', avatar, text, parts, time, typing, key, aicat, reactions, receipt, name, streaming, actions, incomplete, stopped, flat }) {
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
    // Flat layout (Claude-Code-web): full-width, avatar-less turns with a role
    // label above the content and a faint assistant background, instead of the
    // messenger avatar-disc + colored-bubble layout (kept for the chat demo).
    const isFlat = flat && !isCentered;
    const cls = 'chat-msg ' + resolvedWho + (aicat && resolvedWho === 'them' ? ' aicat' : '') + (isCentered ? ' centered' : '') + (isFlat ? ' chat-msg-flat' : '');
    const fallbackAvatar = avatar != null
        ? avatar
        : (resolvedWho === 'you' ? 'u' : (name ? String(name).trim().charAt(0).toUpperCase() || '?' : '?'));
    const av = h('span', { class: 'chat-avatar' }, fallbackAvatar);
    let bodyNodes;
    if (typing) bodyNodes = [h('div', { class: 'chat-bubble', key: 'typb' }, h('span', { class: 'chat-typing' }, h('span'), h('span'), h('span')))];
    else if (parts && parts.length) bodyNodes = parts.map((p, i) => renderPart(p, i));
    else bodyNodes = [h('div', { class: 'chat-bubble', key: 't' }, ...renderInline(text || ''))];
    // A blinking caret at the stream head: while an assistant turn is streaming
    // AND already shows content (so the inline typing dots have stopped), append
    // a thin caret so the live edge reads as "still writing", not "done". Drawn as
    // a CSS element, not a glyph character.
    // Only append the caret as a sibling if the last part did not already embed
    // it inline (streamingCaret flag on the last text/md part in parts array).
    const lastPartHasCaret = parts && parts.length && parts[parts.length - 1] && parts[parts.length - 1].streamingCaret;
    if (streaming && !typing && !lastPartHasCaret) bodyNodes = [...bodyNodes, h('span', { key: '_caret', class: 'chat-stream-caret', 'aria-hidden': 'true' })];
    // Out-of-band turn notices, plain copy in a NEUTRAL tone (not error red):
    //   stopped    — the turn was cancelled (locally or remotely); truncated
    //                output must not read as a finished answer.
    //   incomplete — the connection dropped mid-turn and events were not
    //                replayed; the response may be missing content.
    // Pass true for the default copy or a string to override it. Retry rides
    // the existing per-message actions row.
    if (stopped) bodyNodes = [...bodyNodes, h('div', { key: '_stopped', class: 'chat-msg-notice is-stopped', role: 'status' },
        typeof stopped === 'string' ? stopped : 'stopped — this turn was cancelled before it finished')];
    if (incomplete) bodyNodes = [...bodyNodes, h('div', { key: '_incomplete', class: 'chat-msg-notice is-incomplete', role: 'status' },
        typeof incomplete === 'string' ? incomplete : 'connection dropped mid-turn — the response may be incomplete')];
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
    // Per-message actions (copy / retry / edit) — a hover-revealed control row
    // below the bubble, the way Claude-Desktop surfaces message-level actions.
    // Each action is { label, icon, onClick, title }. Kept icon-only with an
    // accessible name; no decorative glyphs (the Icon set is line-SVG).
    const actionRow = (actions && actions.length)
        ? h('div', { class: 'chat-msg-actions', role: 'group', 'aria-label': 'message actions' },
            ...actions.filter(Boolean).map((a, i) => h('button', {
                key: 'ma' + i, type: 'button', class: 'chat-msg-action',
                title: a.title || a.label, 'aria-label': a.label || a.title,
                onclick: (e) => { e.preventDefault(); a.onClick && a.onClick(e); },
            }, a.icon ? Icon(a.icon, { size: 14 }) : null,
               a.label ? h('span', { class: 'chat-msg-action-label' }, a.label) : null)))
        : null;
    // Flat layout leads the turn with a small role label (You / agent name)
    // above the content, the way claude.ai/code titles each turn.
    const roleLabel = isFlat
        ? h('div', { class: 'chat-role', key: '_role' }, resolvedWho === 'you' ? 'You' : (name || 'Assistant'))
        : null;
    const stack = h('div', { class: 'chat-stack' }, roleLabel, ...bodyNodes, reactionRow, actionRow, meta);
    // Centered roles (system/tool/thinking) skip the avatar column entirely so
    // the bubble owns the full row — the chrome reads as out-of-band signal,
    // not a participant turn.
    if (isCentered) return h('div', { key, class: cls }, stack);
    // Flat turns drop the avatar column entirely (full-width content).
    if (isFlat) return h('div', { key, class: cls }, stack);
    return h('div', { key, class: cls }, resolvedWho === 'you' ? stack : av, resolvedWho === 'you' ? av : stack);
}

// Transient, non-blocking composer note (aria-live polite): e.g. a pasted image
// when no onPasteFiles handler is wired. Pure-DOM, auto-clears.
function flashComposerNote(composerEl, text) {
    if (!composerEl) return;
    let note = composerEl.querySelector('.chat-composer-note');
    if (!note) {
        note = document.createElement('div');
        note.className = 'chat-composer-note';
        note.setAttribute('role', 'status');
        note.setAttribute('aria-live', 'polite');
        composerEl.appendChild(note);
    }
    note.textContent = text;
    clearTimeout(note._dsNoteTimer);
    note._dsNoteTimer = setTimeout(() => { note.remove(); }, 2600);
}

export function ChatComposer({ value, onInput, onSend, onEmoji, onCancel, busy, placeholder = 'message…', disabled, disabledReason, label, context, onPasteFiles, onDropFiles }) {
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
    const triggerMatch = EMOJI_TRIGGER_RE.exec(value || '');
    // taEl is only assigned by taRef during DOM diffing, which happens AFTER
    // this render function returns — so on first paint of a trigger it is
    // still null here. Fall back to the live DOM textarea from the previous
    // paint (same composer, content patched in place) so the picker anchors
    // near the input instead of the viewport origin.
    const anchorEl = taEl || (typeof document !== 'undefined' ? document.querySelector('.chat-composer textarea') : null);
    const insertEmoji = (ch) => {
        const v = (taEl && taEl.value) || value || '';
        const m = EMOJI_TRIGGER_RE.exec(v);
        const next = m ? (v.slice(0, m.index) + (m[0].startsWith(':') ? '' : v[m.index]) + ch + ' ') : (v + ch);
        if (onInput) onInput(next);
        if (taEl) {
            taEl.value = next;
            taEl.focus();
            taEl.selectionStart = taEl.selectionEnd = next.length;
        }
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
                // Respect the CSS max-height cap (120px in short-landscape via
                // app-shell.css) instead of a hardcoded 200px.
                const cap = parseFloat(getComputedStyle(ta).maxHeight) || 200;
                ta.style.height = Math.min(ta.scrollHeight, cap) + 'px';
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
        const cap = parseFloat(getComputedStyle(el).maxHeight) || 200;
        el.style.height = Math.min(el.scrollHeight, cap) + 'px';
    };
    // Optional context line shown above the textarea: agent / model / cwd at the
    // point of typing (the way Claude-Desktop surfaces the active target inline).
    // `context` is { bits:[...], onClick? }. Bits may be plain strings (inert
    // text) or { text, onClick, title } objects — a bit with its own onClick
    // renders as an inline button (.chat-composer-context-bit) so e.g. the cwd
    // segment routes to the cwd editor WITHOUT making the whole line one giant
    // click target. Legacy whole-line context.onClick is honored only when no
    // bit carries its own handler. All children are keyed VElements.
    // Normalize FIRST (a bit may carry `text` or `label`), then drop empties -
    // separators must only ever sit between bits that actually render. An
    // object bit whose text resolved empty used to leave a dangling trailing
    // middot AND an invisible zero-width button.
    const ctxBits = ((context && context.bits) ? context.bits : [])
        .map((b) => {
            if (b == null) return null;
            if (typeof b === 'object') {
                const text = b.text || b.label || '';
                return text ? { text, onClick: b.onClick, title: b.title } : null;
            }
            const text = String(b);
            return text ? { text } : null;
        })
        .filter(Boolean);
    const hasBitClicks = ctxBits.some((b) => b.onClick);
    let contextLine = null;
    if (ctxBits.length && hasBitClicks) {
        const kids = [];
        ctxBits.forEach((b, i) => {
            if (i) kids.push(h('span', { key: 'csep' + i, class: 'chat-composer-context-sep', 'aria-hidden': 'true' }, ' · '));
            if (b.onClick) kids.push(h('button', {
                key: 'cbit' + i, type: 'button', class: 'chat-composer-context-bit',
                title: b.title || null, 'aria-label': b.title || b.text,
                onclick: (e) => { e.preventDefault(); b.onClick(e); },
            }, b.text));
            else kids.push(h('span', { key: 'cbit' + i, class: 'chat-composer-context-text' }, b.text));
        });
        contextLine = h('div', { class: 'chat-composer-context', role: 'group', 'aria-label': 'active session: ' + ctxBits.map((b) => b.text).join(', ') }, ...kids);
    } else if (ctxBits.length) {
        const joined = ctxBits.map((b) => b.text).join(' · ');
        contextLine = h(context.onClick ? 'button' : 'div', {
            class: 'chat-composer-context', type: context.onClick ? 'button' : null,
            'aria-label': context.onClick ? ('change target: ' + joined) : null,
            onclick: context.onClick ? (e) => { e.preventDefault(); context.onClick(e); } : null,
        }, joined);
    }
    const hasDraft = !!(value && value.trim());
    // Clamp the picker anchor to the visual viewport: with the on-screen
    // keyboard open the composer sits near the visual-viewport bottom, and on
    // narrow screens the picker width can overflow the right edge.
    const anchorRect = (anchorEl && anchorEl.getBoundingClientRect) ? anchorEl.getBoundingClientRect() : null;
    const vvWidth = (typeof window !== 'undefined')
        ? ((window.visualViewport && window.visualViewport.width) || window.innerWidth)
        : 0;
    const triggerPicker = triggerMatch ? EmojiPicker({
        open: true,
        anchorX: anchorRect ? Math.max(0, Math.min(anchorRect.left, vvWidth - 280)) : 0,
        anchorY: anchorRect ? Math.max(8, anchorRect.top - 8) : 0,
        query: triggerMatch[2] || '',
        onSelect: (ch) => insertEmoji(ch),
        onClose: () => { if (taEl) { const v = taEl.value.replace(EMOJI_TRIGGER_RE, (full, tail) => full.slice(0, full.length - tail.length)); if (onInput) onInput(v); taEl.value = v; taEl.focus(); } },
    }) : null;
    return h('div', {
        class: 'chat-composer' + (hasDraft ? ' has-draft' : '') + (disabled ? ' is-disabled' : ''),
        // A drop on the composer must NEVER navigate the browser away from the
        // live session: preventDefault on both dragover and drop, route files to
        // the optional onDropFiles handler, ring via .dragover.
        ondragover: (e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); },
        ondragleave: (e) => { e.currentTarget.classList.remove('dragover'); },
        ondrop: (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('dragover');
            const files = e.dataTransfer && e.dataTransfer.files;
            if (files && files.length) {
                if (onDropFiles) onDropFiles(files);
                else flashComposerNote(e.currentTarget, 'dropped files are not supported here yet');
            }
        },
    },
        contextLine,
        triggerPicker,
        h('textarea', { ref: taRef, placeholder, rows: 1,
            'aria-label': label || (disabled && disabledReason ? 'message input — ' + disabledReason : 'message input'),
            disabled: !!disabled, 'aria-disabled': disabled ? 'true' : null,
            oninput: autoGrow,
            onpaste: (e) => {
                const cd = e.clipboardData;
                // If the clipboard contains files, always route them — even when
                // text is also present (some apps attach a filename as text).
                if (cd && cd.files && cd.files.length) {
                    e.preventDefault();
                    if (onPasteFiles) onPasteFiles(cd.files);
                    else flashComposerNote(e.currentTarget.closest('.chat-composer'), 'images are not supported yet');
                }
            },
            onkeydown: (e) => {
                // Escape blurs the textarea when idle; stops generation when busy.
                if (e.key === 'Escape') {
                    if (!busy) { e.currentTarget.blur(); return; }
                    if (onCancel) { e.preventDefault(); onCancel(e); return; }
                }
                // IME guard: the Enter that commits a CJK composition must never
                // send (isComposing; keyCode 229 covers older engines).
                if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); send(); }
                if (e.key === ';' && e.ctrlKey) { e.preventDefault(); onEmoji && onEmoji(e); }
            } }),
        // Enter-to-send affordance (Claude-Desktop style): a muted hint visible
        // while the composer is focused or carries a draft; hidden under 420px
        // (CSS) to save rows. Middot is kept product typography.
        h('div', { class: 'chat-composer-hint', 'aria-hidden': 'true' }, 'Enter to send · Shift+Enter for a new line'),
        h('div', { class: 'chat-composer-toolbar' },
            onEmoji ? h('button', { type: 'button', class: 'composer-btn', onclick: (e) => { e.preventDefault(); onEmoji(e); }, 'aria-label': 'emoji picker', title: 'emoji picker (Ctrl+;)' }, Icon('smile')) : null,
            busy && onCancel
                ? h('button', { type: 'button', class: 'send cancel', onclick: (e) => { e.preventDefault(); onCancel(e); }, 'aria-label': 'stop generating', title: 'stop generating (Esc)' }, Icon('square'))
                : h('button', { type: 'button', class: 'send', disabled: disabled || !(value && value.trim()), onclick: send,
                    'aria-label': disabled && disabledReason ? 'send message (' + disabledReason + ')' : 'send message',
                    title: disabled && disabledReason ? 'send message (' + disabledReason + ')' : 'send message (Enter)' }, Icon('arrow-up'))
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
                    h('p', { class: 'chat-empty-sub' }, sub || 'Send a message to start the conversation'),
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
