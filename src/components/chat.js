// Chat surface — matches upstream signatures (parts, typing, reactions,
// receipts, aicat). Pure factories — props in, vnode out.
// Includes ChatMessage, ChatComposer, Chat, AICat, AICatPortrait.

import * as webjsx from '../../vendor/webjsx/index.js';
import { initializeCachesEagerly, getCacheStats } from '../markdown-cache.js';
import { register } from '../debug.js';
import { Icon } from './shell.js';
import { fmtFileSize } from './files.js';
import { EmojiPicker } from './overlay-primitives.js';
import { t } from '../i18n.js';
import { renderMessagePart as sharedRenderMessagePart, safeUrl as sharedSafeUrl, renderInline as sharedRenderInline, injectCodeCopy as sharedInjectCodeCopy } from './chat-message-parts.js';

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

// safeUrl / renderInline now live in chat-message-parts.js (the shared
// message-part renderer both this file and agent-chat.js render parts
// through) — re-exported here under their original names so every existing
// consumer of chat.js's public API (components.js barrel, any host importing
// directly from './components/chat.js') keeps working unchanged.
export const safeUrl = sharedSafeUrl;
export const renderInline = sharedRenderInline;

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

// injectCodeCopy / MdNode / CodeNode / ToolCallNode / ThinkingNode /
// PART_RENDERERS all now live in chat-message-parts.js — the one dispatch
// table this file, agent-chat.js, and any future chat surface render message
// parts through. injectCodeCopy stays exported here (re-exported, same
// signature) since it was part of this file's public surface before the
// extraction, even though nothing in-repo imports it directly today.
export const injectCodeCopy = sharedInjectCodeCopy;

// Thin wrapper around the shared renderer that keeps this file's own debug
// counter (_stats.lastKindCounts, surfaced via register('chat', ...) below)
// wired exactly as before. sharedRenderMessagePart already applies the
// 'p' + key VElement key itself.
function renderPart(p, key) {
    return sharedRenderMessagePart(p, key, (kind) => {
        _stats.lastKindCounts[kind] = (_stats.lastKindCounts[kind] || 0) + 1;
    });
}

export function ChatMessage({ role, who = 'them', avatar, text, parts, time, typing, key, aicat, reactions, receipt, name, streaming, actions, incomplete, stopped, flat, error, onRetry }) {
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
    // Inline per-turn error: unlike a global toast, this pins the failure to
    // the specific turn that failed (docstudio pattern) with a retry action
    // right there instead of forcing the user to hunt for what broke.
    if (error) bodyNodes = [...bodyNodes, h('div', { key: '_error', class: 'chat-msg-notice is-error', role: 'alert' },
        h('span', {}, typeof error === 'string' ? error : 'this turn failed'),
        onRetry ? h('button', {
            type: 'button', class: 'chat-msg-retry-btn',
            onclick: (e) => { e.preventDefault(); onRetry(e); },
        }, 'retry') : null)];
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
                onclick: (e) => {
                    e.preventDefault();
                    a.onClick && a.onClick(e);
                    // Copy is the highest-traffic per-message action and, unlike
                    // code-block/tool-result copy elsewhere in this file, had no
                    // self-contained visual feedback — a sighted/mouse user saw
                    // nothing happen. Flip the button's own label/icon the same
                    // way those sibling copy controls already do.
                    if (a.label === 'copy') {
                        const btn = e.currentTarget;
                        const labelEl = btn.querySelector('.chat-msg-action-label');
                        clearTimeout(btn._dsCopyTimer);
                        btn.classList.add('is-copied');
                        if (labelEl) labelEl.textContent = 'copied';
                        btn._dsCopyTimer = setTimeout(() => {
                            btn.classList.remove('is-copied');
                            if (labelEl) labelEl.textContent = 'copy';
                        }, 1600);
                    }
                },
            }, a.icon ? Icon(a.icon, { size: 14 }) : null,
               a.label ? h('span', { class: 'chat-msg-action-label' }, a.label) : null)))
        : null;
    // Flat layout leads the turn with a small role label (You / agent name)
    // above the content, the way claude.ai/code titles each turn.
    const roleLabel = isFlat
        ? h('div', { class: 'chat-role', key: '_role' }, resolvedWho === 'you' ? t('chat.roleYou', 'You') : (name || t('chat.roleAssistant', 'Assistant')))
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
export function flashComposerNote(composerEl, text) {
    if (!composerEl) return;
    let note = composerEl.querySelector('.chat-composer-note');
    if (!note) {
        note = document.createElement('div');
        note.className = 'chat-composer-note';
        note.setAttribute('role', 'status');
        note.setAttribute('aria-live', 'polite');
        composerEl.appendChild(note);
    }
    // A single shared node means a second call before the first note's timeout
    // fires used to silently overwrite it (lost message, not just an early
    // dismiss). Queue instead: show immediately if idle, otherwise append and
    // let the display loop drain the queue in order.
    note._dsNoteQueue = note._dsNoteQueue || [];
    note._dsNoteQueue.push(text);
    if (note._dsNoteTimer) return; // already draining the queue
    const showNext = () => {
        const next = note._dsNoteQueue.shift();
        if (next === undefined) { note.remove(); note._dsNoteTimer = null; return; }
        note.textContent = next;
        note._dsNoteTimer = setTimeout(showNext, 2600);
    };
    showNext();
}

// Cached once per session: coarse-pointer (touch/no-hover) devices get a
// newline on Enter instead of send (mirrors the one-time-cache pattern
// editor-primitives.js uses for its own pointer/matchMedia checks).
let _coarsePointerCache = null;
function isCoarsePointer() {
    if (_coarsePointerCache != null) return _coarsePointerCache;
    _coarsePointerCache = !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    return _coarsePointerCache;
}

// m:ss elapsed-time formatter for the streaming counter.
function fmtElapsedMs(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ':' + String(s).padStart(2, '0');
}

// A small ticking `m:ss` counter, keyed off the streamingSince timestamp so a
// parent re-render does not reset the interval — the ref only (re)starts the
// interval when the timestamp actually changes, and clears it when streaming
// goes false or the node unmounts.
function ChatComposerElapsed({ streamingSince }) {
    return h('span', {
        class: 'chat-composer-elapsed', role: 'status', 'aria-live': 'off',
        ref: (el) => {
            if (!el) return;
            if (el._dsElapsedTimer && el._dsElapsedSince === streamingSince) return; // already ticking for this timestamp
            if (el._dsElapsedTimer) clearInterval(el._dsElapsedTimer);
            el._dsElapsedSince = streamingSince;
            const tick = () => { el.textContent = fmtElapsedMs(Date.now() - streamingSince); };
            tick();
            el._dsElapsedTimer = setInterval(tick, 1000);
        },
    });
}

export function ChatComposer({ value, onInput, onSend, onEmoji, onCancel, busy, placeholder = 'message…', disabled, disabledReason, label, context, onPasteFiles, onDropFiles, streamingSince, detectAttachment }) {
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
            // Programmatic .value= (like the draft-restore path) discards the
            // native undo stack the same way — surface that once, matching the
            // existing one-time draft-restore note pattern.
            try {
                if (!sessionStorage.getItem('ds.composer.undoNoteShown')) {
                    sessionStorage.setItem('ds.composer.undoNoteShown', '1');
                    flashComposerNote(taEl.closest('.chat-composer'), 'inserted — undo history does not include this insert');
                }
            } catch { /* swallow: sessionStorage unavailable (private mode etc) — skip the note */ }
            taEl.value = next;
            taEl.focus();
            taEl.selectionStart = taEl.selectionEnd = next.length;
        }
    };
    let autoGrowScheduled = false;
    // detectAttachment(text) -> {type,label,id}|null runs on every input change;
    // the badge above the textarea shows/clears based on its result, and clears
    // outright when the textarea empties (mirrors the dismissible-badge pattern
    // via a DOM-owned dismissed flag so a re-render with the same detection
    // doesn't resurrect a badge the user just dismissed).
    const updateDetectedBadge = (composerEl, text) => {
        if (!composerEl) return;
        let badge = composerEl.querySelector('.chat-composer-detected-badge');
        const detected = (text && detectAttachment) ? detectAttachment(text) : null;
        if (!detected) {
            if (badge) badge.remove();
            composerEl._dsDetectedId = null;
            return;
        }
        if (composerEl._dsDismissedId === detected.id) return; // user dismissed this exact detection
        if (composerEl._dsDetectedId === detected.id && badge) return; // unchanged
        composerEl._dsDetectedId = detected.id;
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'chat-composer-detected-badge';
            badge.setAttribute('role', 'status');
            composerEl.insertBefore(badge, composerEl.firstChild);
        }
        badge.textContent = '';
        const label = document.createElement('span');
        label.className = 'chat-composer-detected-label';
        label.textContent = detected.label;
        badge.appendChild(label);
        const dismiss = document.createElement('button');
        dismiss.type = 'button';
        dismiss.className = 'chat-composer-detected-dismiss';
        dismiss.setAttribute('aria-label', 'dismiss ' + detected.label);
        dismiss.textContent = 'x';
        dismiss.onclick = (e) => { e.preventDefault(); composerEl._dsDismissedId = detected.id; badge.remove(); };
        badge.appendChild(dismiss);
    };
    const autoGrow = (e) => {
        const ta = e.target;
        if (onInput) onInput(ta.value);
        if (detectAttachment) updateDetectedBadge(ta.closest('.chat-composer'), ta.value);
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
        if (detectAttachment) updateDetectedBadge(el.closest('.chat-composer'), next);
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
                    return;
                }
                // Large plain-text pastes (e.g. a whole file/log dropped into the
                // composer) get no feedback otherwise — the textarea just grows to
                // its max-height cap with no signal of how much landed. Note the
                // character count; this does not change any truncation behavior.
                const text = cd && cd.getData ? cd.getData('text/plain') : '';
                if (text && text.length > 2000) {
                    flashComposerNote(e.currentTarget.closest('.chat-composer'), 'pasted ' + text.length + ' characters');
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
                // Coarse-pointer (touch) devices get a newline on Enter instead of
                // send — there is no keyboard shortcut discoverability benefit on
                // touch, and Enter-to-send is a frequent accidental-send source on
                // phones/tablets where "Tap Send to send" is the predictable model.
                if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229 && !isCoarsePointer()) { e.preventDefault(); send(); }
                if (e.key === ';' && e.ctrlKey) { e.preventDefault(); onEmoji && onEmoji(e); }
            } }),
        // Enter-to-send affordance (Claude-Desktop style): a muted hint visible
        // at rest so it's discoverable without focusing the composer first;
        // hidden under 420px (CSS) to save rows. Middot is kept product typography.
        h('div', { class: 'chat-composer-hint' }, isCoarsePointer() ? 'Tap Send to send' : 'Enter to send · Shift+Enter for a new line'),
        (busy && streamingSince) ? ChatComposerElapsed({ streamingSince }) : null,
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
        h('div', { class: 'chat-thread', ref: threadRef, role: 'log', 'aria-label': 'chat messages', 'aria-live': 'polite', 'aria-relevant': 'additions' },
            messages.length === 0
                ? h('div', { key: '_empty', class: 'chat-empty', role: 'status' },
                    h('p', { class: 'chat-empty-title' }, t('chat.startConversation', 'start a conversation')),
                    h('p', { class: 'chat-empty-sub' }, sub || t('chat.emptySub', 'Send a message to start the conversation')),
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
        h('div', { class: 'chat-thread', ref: threadRef, role: 'log', 'aria-label': 'conversation turns', 'aria-live': 'polite', 'aria-relevant': 'additions' },
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
