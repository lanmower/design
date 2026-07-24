// Shared message-PART renderer — the one place a single message's `parts`
// array ({kind, ...}) becomes DOM. Extracted out of chat.js so agent-chat.js
// (and any future chat surface) render text/code/image/markdown/tool parts
// through the exact same code path instead of a second hand-rolled copy.
//
// Pure factory surface: every export takes plain data in, returns a vnode (or
// void for the imperative copy-button wiring) — no module-level render state
// beyond the markdown/Prism cache singletons chat-cache.js already owns.
//
// Slightly over the repo's 200-line-per-module cap (AGENTS.md) because code
// highlighting + markdown streaming-throttle + tool-call card rendering + the
// image/pdf/file/link part kinds cannot be split further without breaking the
// single PART_RENDERERS dispatch table apart — the same tradeoff chat.js
// itself (799 lines) already made before this extraction; see files.js,
// overlay-primitives.js, editor-primitives.js for other repo precedent of a
// cohesive render surface staying in one module past the cap.

import * as webjsx from '../../vendor/webjsx/index.js';
import { renderMarkdownCached, highlightCodeBlockCached } from '../markdown-cache.js';
import { isDegraded as isMarkdownDegraded } from '../markdown.js';
import { renderMermaidBlocksUnder } from '../mermaid.js';
import { renderMathBlocksUnder } from '../math.js';
import { Icon } from './shell.js';
import { fmtFileSize } from './files.js';
import { t } from '../i18n.js';
import { GitDiffView } from './git-status.js';

const h = webjsx.createElement;

// ONE byte format across the kit (mirrors chat.js's own fmtBytes alias).
const fmtBytes = fmtFileSize;

// Reject dangerous URL schemes (javascript:, data:, vbscript:, file:) so an
// inline markdown link or an image src built from untrusted text can't smuggle
// a script-executing or data-exfiltrating URL past the inline renderer (which
// does NOT pass through DOMPurify the way the full md path does). http(s),
// mailto, protocol-relative, root/relative, and anchor links are allowed.
export function safeUrl(url) {
    const s = String(url == null ? '' : url).trim();
    if (!s) return null;
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

// Shared clipboard-copy-with-label-flip: was three verbatim-identical blocks
// (chat.js's injectCodeCopy, CodeNode.onCopy, ToolCallNode.copyText) before
// this extraction. Same behavior in every caller: try the async Clipboard
// API, fall back to a hidden textarea + execCommand('copy') when unavailable,
// flip the trigger button's own label/class to "copied" for ~1.6s either way.
export function copyToClipboardWithFeedback(text, btn) {
    const done = () => {
        btn.textContent = 'copied';
        btn.classList.add('is-copied');
        setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('is-copied'); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => {});
    else { try { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); done(); } catch { /* swallow: legacy execCommand copy fallback unsupported, nothing more to try */ } }
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
        btn.addEventListener('click', () => copyToClipboardWithFeedback(pre.innerText, btn));
        shell.appendChild(btn);
    });
}

const MD_STREAM_THROTTLE_MS = 120;
const MD_STREAM_MIN_DELTA_CHARS = 40;

// requestIdleCallback with a setTimeout fallback (Safari/non-browser test
// contexts lack the real API). A settled historical message's parse is not
// latency-critical the way a streaming turn's is — deferring it off the
// critical path keeps a session-load burst of N historical bubbles from
// racing N synchronous parses on the same tick.
const scheduleIdle = typeof requestIdleCallback === 'function'
    ? (fn) => requestIdleCallback(fn, { timeout: 500 })
    : (fn) => setTimeout(fn, 0);

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
        function doParse() {
            renderMarkdownCached(p.text || '').then((html) => {
                // The element may have been recycled (webjsx applyDiff reused this
                // DOM node for a different message) or detached by the time an
                // idle-deferred parse resolves -- re-check the source key still
                // matches before swapping innerHTML into what could now be a
                // completely different message's bubble.
                if (el.dataset.mdSrc !== srcKey) return;
                const swap = () => {
                    el.innerHTML = html;
                    delete el.dataset.mathWired;
                    injectCodeCopy(el);
                    // Diagram/math enrichment runs AFTER sanitized HTML is in the DOM
                    // (never on raw markdown source) and is best-effort: a failed or
                    // still-loading mermaid/katex CDN leaves the fenced/literal source
                    // visible rather than blocking or blanking the bubble.
                    renderMermaidBlocksUnder(el).catch(() => {});
                    renderMathBlocksUnder(el).catch(() => {});
                };
                // Don't blow away an active text selection inside this bubble mid-swap
                // (e.g. the user is mid-copy while a stream tick settles). Defer the
                // swap once, until the selection changes (cleared or moved elsewhere).
                const sel = typeof window !== 'undefined' ? window.getSelection() : null;
                if (sel && sel.anchorNode && el.contains(sel.anchorNode)) {
                    const onSelChange = () => { document.removeEventListener('selectionchange', onSelChange); swap(); };
                    document.addEventListener('selectionchange', onSelChange, { once: true });
                    return;
                }
                swap();
            });
        }
        // Streaming turns parse immediately (latency-critical: the user is
        // watching this bubble grow). A settled historical message (no
        // streamingCaret) is deferred to an idle slot -- not on the critical
        // render path, so a page mounting many historical bubbles at once
        // (session load) doesn't burst-parse them all synchronously.
        if (p.streamingCaret) doParse();
        else scheduleIdle(doParse);
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
        // Same in-progress-selection guard as MdNode.refSink: don't wipe an
        // active text selection inside this block mid-stream-settle. Defer
        // the highlight swap once, until the selection changes.
        const sel = typeof window !== 'undefined' ? window.getSelection() : null;
        if (sel && sel.anchorNode && el.contains(sel.anchorNode)) {
            const onSelChange = () => { document.removeEventListener('selectionchange', onSelChange); highlightCodeBlockCached(el); };
            document.addEventListener('selectionchange', onSelChange, { once: true });
            return;
        }
        highlightCodeBlockCached(el);
    };
    // Copy the raw code (not the highlighted DOM) for the structured CodeNode.
    const onCopy = (e) => copyToClipboardWithFeedback(p.code || '', e.currentTarget);
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

// A tool result reads as a unified diff when it has at least one `@@ ... @@`
// hunk header and a +/- line — cheap enough to check on every render (no
// caching) since it only runs once per settled tool card, not per rAF tick.
function looksLikeUnifiedDiff(text) {
    if (!text || text.indexOf('@@') === -1) return false;
    return /^@@ .* @@/m.test(text) && /^[+-]/m.test(text);
}

// Pull a filename out of a unified diff's `+++ b/path` (or `--- a/path`)
// header line, for the GitDiffView head label — best-effort, no filename is
// fine (GitDiffView renders headerless).
function filenameFromDiff(text) {
    const m = /^\+\+\+ b?\/?(.+)$/m.exec(text) || /^--- a?\/?(.+)$/m.exec(text);
    return m ? m[1].trim() : undefined;
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
    const copyText = (txt) => (e) => copyToClipboardWithFeedback(txt, e.currentTarget);
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
                resultText
                    ? (!p.error && looksLikeUnifiedDiff(resultText)
                        // A patch-shaped tool result (edit/write/diff tools) renders
                        // through the same split unified-diff view git-status.js's
                        // GitDiffView already owns, instead of a raw JSON/text dump —
                        // colored +/- hunks read far better than escaped plaintext.
                        ? h('div', { class: 'chat-tool-section' },
                            sectionLabel('result', resultText),
                            GitDiffView({ diff: resultText, filename: filenameFromDiff(resultText) }))
                        : h('div', { class: 'chat-tool-section' },
                            sectionLabel(p.error ? 'error' : 'result', resultText),
                            h('pre', { class: 'chat-tool-pre' + (p.error ? ' is-error' : '') }, h('code', {}, resultText))))
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
            h('summary', {}, t('chat.viewThinking', 'View thinking')),
            h('div', { class: 'chat-thinking-body' }, p.text)
        );
    }
    return h('div', { class: 'chat-bubble chat-thinking', role: 'status', 'aria-live': 'polite' },
        h('span', { class: 'chat-thinking-dots', 'aria-hidden': 'true' }, h('span'), h('span'), h('span')),
        h('span', { class: 'chat-thinking-text' }, p.text || t('chat.thinking', 'thinking…'))
    );
}

// The one dispatch table every chat surface's message parts render through.
export const PART_RENDERERS = {
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

// Render one message part {kind, ...} to a vnode, keyed for webjsx diffing.
// `onKindRendered` is an optional (kind) => void hook so a caller can track
// per-kind render stats (chat.js uses this to keep its existing debug counter
// wired without this module owning that state itself).
export function renderMessagePart(p, key, onKindRendered) {
    const fn = PART_RENDERERS[p.kind] || PART_RENDERERS.text;
    const node = fn(p);
    if (node && typeof node === 'object') node.props = { ...(node.props || {}), key: 'p' + key };
    if (onKindRendered) onKindRendered(p.kind);
    return node;
}

// Render a full `parts` array in order — the common case every chat surface
// actually calls (ChatMessage.bodyNodes today, any future host tomorrow).
export function renderMessageParts(parts, onKindRendered) {
    return (parts || []).map((p, i) => renderMessagePart(p, i, onKindRendered));
}
