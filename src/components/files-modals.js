// File modals — matches upstream signatures + class names.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Btn, Icon } from './shell.js';
import { fileGlyph, fmtFileSize } from './files.js';
import { highlightAllUnder } from '../highlight.js';
import { shortUid } from '../uid.js';
const h = webjsx.createElement;

// Full focusable set for the modal Tab trap — omitting textarea/select/a[href]
// lets Tab escape behind the fixed backdrop (fully obscured at mobile sizes).
const FOCUSABLE_SEL = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Stable per-call-site id source for aria-labelledby: we want one fixed id per
// logical dialog instance (rename, confirm, prompt, preview), NOT a monotonic
// counter that advances on every render and leaves the old aria-labelledby
// reference dangling. A WeakMap keyed on the options object would not survive
// re-renders, so we use a short random suffix minted ONCE per Modal() call
// inside the function body — the closure keeps it stable for that render tree.
// _modalSeq is retained only for external callers that may import it; it is no
// longer used internally.
let _modalSeq = 0;

function Backdrop({ onClose, children, kind = '', labelledBy, busy = false } = {}) {
    // webjsx invokes a ref callback with the element on mount and with null on
    // unmount. We stash the per-element keydown teardown on the node itself so
    // the null branch can run it — otherwise the document/element listener leaks
    // once the modal is removed.
    const backdropRef = (el) => {
        if (!el) return;            // unmount (ref(null)) handled by wrapper below
        const modal = el.querySelector('.ds-modal');
        if (!modal) return;

        const handleKeydown = (e) => {
            // Escape closes the modal — unless a mutation is in flight (the live
            // busy state is read off the data-busy attribute, which re-renders;
            // this handler's closure is bound once at mount).
            if (e.key === 'Escape') {
                e.preventDefault();
                if (el.dataset.busy === '1') return;
                if (onClose) onClose();
                return;
            }
            // Focus trap: re-query focusables on each Tab press so that buttons
            // disabled mid-flight (busy state) are excluded from the cycle and
            // do not break tab navigation.
            if (e.key === 'Tab') {
                const focusables = modal.querySelectorAll(FOCUSABLE_SEL);
                if (focusables.length === 0) {
                    e.preventDefault();
                    return;
                }
                const firstFocusable = focusables[0];
                const lastFocusable = focusables[focusables.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        };

        // Escape must close the modal no matter where focus sits (re-renders
        // can bounce focus out of the dialog), so listen at document level
        // for the modal's lifetime.
        document.addEventListener('keydown', handleKeydown, true);
        // Record the invoker BEFORE the modal steals focus, so close (confirm,
        // cancel, Escape, backdrop click) restores keyboard/AT focus to where
        // the user was (e.g. the FileGrid row button) instead of <body>.
        // Re-mounts mid-lifetime (every app render re-runs this ref) keep the
        // ORIGINAL invoker and never re-steal focus from the user.
        const invoker = el.contains(document.activeElement) ? (Backdrop._invoker || document.activeElement) : document.activeElement;
        if (!Backdrop._invoker) Backdrop._invoker = invoker;
        el._dsModalTeardown = (removed) => {
            document.removeEventListener('keydown', handleKeydown, true);
            // Only restore focus when the modal is genuinely going away (not a
            // re-render remount) and focus is not already somewhere useful.
            if (removed && Backdrop._invoker && Backdrop._invoker.focus && Backdrop._invoker.isConnected) {
                try { Backdrop._invoker.focus(); } catch { /* swallow: restoring focus on close is best-effort, teardown still completes */ }
            }
            if (removed) Backdrop._invoker = null;
        };
        // Auto-focus on open - only when focus is not already inside the modal
        // (re-renders must not yank the caret around).
        if (!el.contains(document.activeElement)) {
            const preferred = modal.querySelector('[autofocus]') || modal.querySelector(FOCUSABLE_SEL);
            if (preferred) preferred.focus();
        }
    };

    return h('div', {
        class: 'ds-modal-backdrop',
        // Live busy flag read by the mount-bound Escape handler + backdrop click.
        'data-busy': busy ? '1' : '0',
        ref: (el) => {
            if (el) {
                // A remount in the same tick (render churn) is not a close:
                // cancel the pending removal teardown before re-binding.
                Backdrop._pendingRemoval = false;
                backdropRef(el);
                Backdrop._last = el;
            } else if (Backdrop._last && Backdrop._last._dsModalTeardown) {
                const t = Backdrop._last._dsModalTeardown;
                Backdrop._last = null;
                Backdrop._pendingRemoval = true;
                t(false); // always unhook the document listener now
                queueMicrotask(() => {
                    // Still gone next microtask -> genuine close: restore focus.
                    if (Backdrop._pendingRemoval) { t(true); Backdrop._pendingRemoval = false; }
                });
            }
        },
        onclick: (e) => {
            if (e.target !== e.currentTarget) return;
            if (e.currentTarget.dataset.busy === '1') return; // no mid-flight close
            if (onClose) onClose();
        }
    },
        h('div', {
            class: 'ds-modal' + (kind ? ' ds-modal-' + kind : ''),
            role: 'dialog', 'aria-modal': 'true',
            ...(labelledBy ? { 'aria-labelledby': labelledBy } : {})
        }, ...(Array.isArray(children) ? children : [children]))
    );
}

// Shared modal shell: head + body + actions row. ConfirmDialog/PromptDialog/
// FileViewer all funnel through this so the ds-modal markup is authored once.
// `actions` is an array of vnodes (already using the Btn primitive). Any of the
// slots may be omitted.
function Modal({ onClose, kind = '', head, headClass = '', headAttrs = {}, body, bodyClass = 'ds-modal-body', bodyAttrs = {}, actions, busy = false } = {}) {
    // Give the head a stable id so the dialog can point aria-labelledby at it,
    // exposing the title as the dialog's accessible name to screen readers.
    // The id is minted once per Modal() call with a short random suffix so it
    // stays constant across re-renders of the same dialog instance — an
    // incrementing counter advances on every render, leaving the previous
    // aria-labelledby reference pointing at a now-absent element.
    const headId = head != null ? ('ds-modal-head-' + shortUid(6)) : null;
    return Backdrop({
        onClose,
        kind,
        busy,
        labelledBy: headId,
        children: [
            head != null ? h('div', { id: headId, class: ('ds-modal-head' + (headClass ? ' ' + headClass : '')), ...headAttrs }, ...(Array.isArray(head) ? head : [head])) : null,
            body != null ? h('div', { class: bodyClass, ...bodyAttrs }, ...(Array.isArray(body) ? body : [body])) : null,
            actions != null ? h('div', { class: 'ds-modal-actions' }, ...(Array.isArray(actions) ? actions : [actions])) : null,
        ].filter(Boolean)
    });
}

// A role=alert error line rendered INSIDE the modal body (so a 409/403 from a
// mutation is visible at the point of action, inside the focus trap — not a
// sibling stuck in page flow behind the fixed backdrop).
function modalError(error) {
    return error ? h('p', { class: 'ds-modal-error', role: 'alert' }, String(error)) : null;
}

// `error` renders inside .ds-modal-body (role=alert, error tone). `busy`
// disables both action buttons AND the Escape/backdrop close paths; the confirm
// label flips to `busyLabel` (default 'working…') so the in-flight state reads.
export function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'confirm', cancelLabel = 'cancel', destructive, onConfirm, onCancel, error, busy = false, busyLabel = 'working…' } = {}) {
    return Modal({
        onClose: onCancel,
        kind: 'small',
        busy,
        head: title,
        body: [message || '', modalError(error)].filter(Boolean),
        actions: [
            Btn({ onClick: onCancel, disabled: busy, children: cancelLabel }),
            Btn({ variant: destructive ? 'danger' : 'primary', disabled: busy, onClick: onConfirm, children: busy ? busyLabel : confirmLabel })
        ]
    });
}

export function PromptDialog({ title = 'Enter a name', value = '', placeholder = '', confirmLabel = 'ok', cancelLabel = 'cancel', onConfirm, onCancel, onInput, error, busy = false, busyLabel = 'working…', roots, onPickRoot } = {}) {
    // Optional one-click starting-point chips (e.g. a destination-path prompt
    // for a filesystem with more than one allowed root) - a user typing a
    // path has no way to discover what a second disjoint root even looks
    // like otherwise. Each { path, label } fills the input via the same
    // onInput callback a manual keystroke would.
    const rootsRow = (roots && roots.length)
        ? h('div', { class: 'ds-prompt-roots', role: 'group', 'aria-label': 'accessible folders' },
            ...roots.map((r, i) => h('button', {
                key: 'pr' + i, type: 'button', class: 'ds-prompt-root-chip',
                onclick: () => { const p = r.path || r; if (onPickRoot) onPickRoot(p); else if (onInput) onInput(p); },
            }, r.label || r.path || r)))
        : null;
    return Modal({
        onClose: onCancel,
        kind: 'small',
        busy,
        head: title,
        body: [h('input', {
            class: 'input ds-modal-input',
            type: 'text',
            value,
            placeholder,
            autofocus: true,
            disabled: busy ? true : null,
            'aria-invalid': error ? 'true' : null,
            oninput: (e) => onInput && onInput(e.target.value),
            onkeydown: (e) => {
                // IME guard: the Enter that commits a CJK composition must not confirm.
                if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); if (!busy) onConfirm && onConfirm(e.target.value); }
                if (e.key === 'Escape') { e.preventDefault(); if (!busy) onCancel && onCancel(); }
            }
        }), rootsRow, modalError(error)].filter(Boolean),
        actions: [
            Btn({ onClick: onCancel, disabled: busy, children: cancelLabel }),
            Btn({
                primary: true,
                disabled: busy,
                // Read the live input value, not the closed-over `value` prop:
                // consumers update their state in oninput without re-rendering
                // (to avoid caret jump), so the prop is stale at click time.
                onClick: (e) => {
                    if (!onConfirm) return;
                    const inp = e.currentTarget.closest('.ds-modal')?.querySelector('.ds-modal-input');
                    onConfirm(inp ? inp.value : value);
                },
                children: busy ? busyLabel : confirmLabel
            })
        ]
    });
}

// CountdownDialog — a modal with a role=status line ticking down from
// `seconds` to 0 once per second, auto-firing onExpire at zero. Composes on
// top of the same Modal() shell ConfirmDialog/PromptDialog use, so it
// inherits Backdrop's focus-trap + Escape/backdrop-dismiss handling for free
// rather than reimplementing dialog plumbing.
export function CountdownDialog({ title = 'Are you sure?', message, seconds = 10, onExpire, actions } = {}) {
    const startSeconds = Math.max(0, Math.floor(seconds));
    return Modal({
        onClose: undefined, // no implicit dismiss path unless the caller supplies one via `actions`
        kind: 'small',
        head: title,
        body: [
            message || '',
            h('p', {
                class: 'ds-countdown-status', role: 'status', 'aria-live': 'polite',
                ref: (el) => {
                    if (!el || el._dsCountdownTimer) return;
                    let remaining = startSeconds;
                    const render = () => { el.textContent = remaining + (remaining === 1 ? ' second' : ' seconds') + ' remaining'; };
                    render();
                    el._dsCountdownTimer = setInterval(() => {
                        remaining -= 1;
                        if (remaining <= 0) {
                            clearInterval(el._dsCountdownTimer);
                            el._dsCountdownTimer = null;
                            remaining = 0;
                            render();
                            if (onExpire) onExpire();
                            return;
                        }
                        render();
                    }, 1000);
                },
            }),
            modalError(null),
        ].filter(Boolean),
        actions: actions || [],
    });
}

export function FilePreviewMedia({ src, type = 'other', name } = {}) {
    if (type === 'image') {
        // Fit-to-pane (default) vs actual-size (1:1) toggle + a checkerboard so
        // transparency reads. The toggle flips a class on the img in-place and
        // reports the natural pixel dimensions into its own caption on load.
        const onToggle = (e) => {
            const wrap = e.currentTarget.closest('.ds-preview-media-wrap');
            const img = wrap && wrap.querySelector('.ds-preview-media');
            if (!img) return;
            const actual = img.classList.toggle('is-actual');
            e.currentTarget.textContent = actual ? 'fit to pane' : 'actual size';
        };
        const onLoad = (e) => {
            const img = e.currentTarget;
            const cap = img.closest('.ds-preview-media-wrap');
            const dim = cap && cap.querySelector('.ds-preview-media-dim');
            if (dim && img.naturalWidth) dim.textContent = img.naturalWidth + ' x ' + img.naturalHeight + ' px';
        };
        return h('div', { class: 'ds-preview-media-wrap' },
            h('img', { class: 'ds-preview-media ds-preview-media-alpha', src, alt: name || '', onload: onLoad }),
            h('div', { class: 'ds-preview-media-controls' },
                h('span', { class: 'ds-preview-media-dim', 'aria-live': 'polite' }, ''),
                h('button', { type: 'button', class: 'chat-code-copy', onclick: onToggle }, 'actual size')));
    }
    if (type === 'video') return h('video', { class: 'ds-preview-media', src, controls: true });
    if (type === 'audio') return h('audio', { class: 'ds-preview-audio', src, controls: true });
    return h('div', { class: 'ds-preview-fallback' },
        h('span', { class: 'ds-preview-glyph', 'aria-hidden': 'true' }, Icon(fileGlyph(type))),
        h('span', {}, 'no inline preview for ' + (type || 'this file'))
    );
}

// FilePreviewCode — the code/source pane. Two additive, opt-in affordances
// ported from pi-web's FileViewer (behavior only, not its React/SSE plumbing):
//   wrap        : host-controlled wrap-lines toggle. Pass `wrap` (current
//                 state) + `onWrapToggle` to show the control; omitted host
//                 keeps the old always-'pre' behavior (no regression).
//   previewHtml : when the host has already rendered markdown/HTML to a safe
//                 HTML string (e.g. via markdown-cache.js's
//                 renderMarkdownCached, or a sanitized srcDoc for raw HTML
//                 files) it passes it here + `previewLabel` (defaults
//                 'preview') to get a source/preview mode switcher, mirroring
//                 pi-web's DisplayMode tabs. This component never renders
//                 unsanitized markdown itself — that stays the host's job
//                 (chat.js already owns the sanitize+render pipeline).
export function FilePreviewCode({ content = '', lang, filename, wrap, onWrapToggle, previewHtml, previewLabel = 'preview', mode, onModeChange } = {}) {
    // A filename/lang header matching the chat CodeNode's .chat-code-head, plus
    // the same copy control (chat A1/A2 ship this run, so preview matches for
    // full cross-surface consistency).
    const onCopy = (e) => {
        const btn = e.currentTarget;
        const done = () => { btn.textContent = 'copied'; btn.classList.add('is-copied'); setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('is-copied'); }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(content).then(done).catch(() => {});
        else { try { const t = document.createElement('textarea'); t.value = content; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); done(); } catch { /* swallow: legacy execCommand copy fallback unsupported, nothing more to try */ } }
    };
    const hasPreview = previewHtml != null && onModeChange;
    const activeMode = hasPreview ? (mode || 'source') : 'source';
    const modeSwitch = hasPreview ? h('div', { class: 'ds-preview-mode-switch', role: 'group', 'aria-label': 'file view mode' },
        h('button', { type: 'button', class: 'ds-preview-mode-btn' + (activeMode === 'source' ? ' active' : ''),
            'aria-pressed': activeMode === 'source' ? 'true' : 'false', onclick: () => onModeChange('source') }, 'source'),
        h('button', { type: 'button', class: 'ds-preview-mode-btn' + (activeMode === 'preview' ? ' active' : ''),
            'aria-pressed': activeMode === 'preview' ? 'true' : 'false', onclick: () => onModeChange('preview') }, previewLabel)
    ) : null;
    const wrapCtl = (onWrapToggle && activeMode === 'source') ? h('button', {
        type: 'button', class: 'chat-code-copy ds-preview-wrap-toggle' + (wrap ? ' active' : ''),
        title: wrap ? 'disable word wrap' : 'enable word wrap',
        'aria-label': wrap ? 'disable word wrap' : 'enable word wrap',
        'aria-pressed': wrap ? 'true' : 'false',
        onclick: () => onWrapToggle(!wrap),
    }, 'wrap') : null;
    return h('div', { class: 'ds-preview-code-wrap' },
        h('div', { class: 'chat-code-head ds-preview-code-head' },
            h('span', { class: 'lang' }, lang || 'text'),
            filename ? h('span', { class: 'name' }, filename) : null,
            h('span', { class: 'spread' }),
            modeSwitch,
            wrapCtl,
            h('button', { type: 'button', class: 'chat-code-copy chat-code-copy-head', 'aria-label': 'copy code', onclick: onCopy }, 'copy')),
        activeMode === 'preview'
            // webjsx has no innerHTML prop — set it imperatively via ref, same
            // pattern as chat-message-parts.js/community.js. `previewHtml` is
            // the HOST's already-sanitized HTML (e.g. via markdown-cache.js's
            // renderMarkdownCached, which owns its own sanitize step); this
            // component never sanitizes or fetches on its own.
            ? h('div', { class: 'ds-preview-html', ref: (el) => { if (el) el.innerHTML = previewHtml; } })
            : codeBody({ content, lang, wrap })
    );
}

// The code body: a non-selectable line-number gutter + the highlighted code.
// A ref triggers Prism over the <code> after mount (the bundle only auto-runs
// Prism in the chat path), so the file preview is token-colored like Claude
// Code's file pane. lineNumbers defaults on for code, off for plaintext.
function codeBody({ content = '', lang, wrap = false } = {}) {
    const wantGutter = !!lang;
    const lineCount = content ? content.split('\n').length : 1;
    const gutter = wantGutter
        ? h('div', { class: 'ds-preview-gutter', 'aria-hidden': 'true' },
            Array.from({ length: lineCount }, (_, i) => String(i + 1)).join('\n'))
        : null;
    const highlightRef = (el) => {
        if (!el) return;
        try { highlightAllUnder(el); } catch { /* swallow: syntax highlighting is a progressive enhancement, plain code still renders */ }
    };
    // wrap: ported from pi-web's wrapLines toggle — pre-wrap + anywhere-break
    // instead of the default horizontal-scroll 'pre', for long unbroken lines
    // (minified JS, long log lines) that are easier to read wrapped.
    return h('pre', { class: 'ds-preview-code' + (lang ? ' lang-' + lang : '') + (wantGutter ? ' has-gutter' : '') + (wrap ? ' is-wrapped' : ''), ref: highlightRef },
        gutter,
        h('code', { class: lang ? 'language-' + lang : '' }, content));
}

export function FilePreviewText({ content = '', truncated } = {}) {
    return h('pre', { class: 'ds-preview-text' },
        h('code', {}, content),
        truncated ? h('div', { class: 'ds-preview-truncated' }, '… (truncated)') : null
    );
}

// Shared preview-head children for both the modal FileViewer and the inline
// FilePreviewPane: name + meta + prev/next stepper + download + close. ASCII
// prev/next words (no glyph arrows). onPrev/onNext are omitted when there is no
// previewable neighbour in that direction.
function previewHead({ file, onClose, onAction, onPrev, onNext } = {}) {
    const meta = [file.type, file.size != null ? fmtFileSize(file.size) : null, file.modified || null]
        .filter(Boolean).join(' · ');
    return [
        h('span', { class: 'ds-preview-name', title: file.path || file.name || '' }, file.name || ''),
        h('span', { class: 'ds-preview-meta' }, meta),
        h('span', { class: 'ds-preview-actions' },
            (onPrev || onNext) ? h('span', { class: 'ds-preview-step', role: 'group', 'aria-label': 'step files' },
                h('button', { class: 'ds-file-act', title: 'previous file', 'aria-label': 'previous file', disabled: onPrev ? null : true, onclick: () => onPrev && onPrev() }, 'prev'),
                h('button', { class: 'ds-file-act', title: 'next file', 'aria-label': 'next file', disabled: onNext ? null : true, onclick: () => onNext && onNext() }, 'next')) : null,
            onAction ? h('button', { class: 'ds-file-act', title: 'download', 'aria-label': 'download', onclick: () => onAction('download') }, Icon('arrow-down')) : null,
            onClose ? h('button', { class: 'ds-file-act', title: 'close', 'aria-label': 'close', onclick: onClose }, Icon('x')) : null
        )
    ];
}

// ArrowLeft/Right step the preview when focus is inside it (both pane + modal).
function previewKeyNav(onPrev, onNext) {
    return (e) => {
        if (e.key === 'ArrowLeft' && onPrev) { e.preventDefault(); onPrev(); }
        else if (e.key === 'ArrowRight' && onNext) { e.preventDefault(); onNext(); }
    };
}

// Touch stepping: horizontal swipe on the preview body steps prev/next. Skips
// when the gesture starts inside a horizontally-scrollable child (code <pre>)
// so panning wide code never flips files.
function previewSwipe(onPrev, onNext) {
    if (!onPrev && !onNext) return {};
    let sx = null, sy = null;
    return {
        onpointerdown: (e) => {
            const scroller = e.target.closest && e.target.closest('pre');
            if (scroller && scroller.scrollWidth > scroller.clientWidth) { sx = null; return; }
            sx = e.clientX; sy = e.clientY;
        },
        onpointerup: (e) => {
            if (sx == null) return;
            const dx = e.clientX - sx, dy = e.clientY - sy;
            sx = null;
            if (Math.abs(dx) < 48 || Math.abs(dy) > Math.abs(dx)) return;
            if (dx < 0 && onNext) onNext();
            else if (dx > 0 && onPrev) onPrev();
        },
        onpointercancel: () => { sx = null; },
    };
}

export function FileViewer({ file, body, onClose, onAction, onPrev, onNext } = {}) {
    if (!file) return null;
    const keyNav = previewKeyNav(onPrev, onNext);
    return Modal({
        onClose,
        kind: 'preview',
        headClass: 'ds-preview-head',
        headAttrs: { 'data-file-type': file.type || 'other', onkeydown: keyNav },
        head: previewHead({ file, onClose, onAction, onPrev, onNext }),
        bodyClass: 'ds-preview-body',
        bodyAttrs: { 'data-file-type': file.type || 'other', onkeydown: keyNav, ...previewSwipe(onPrev, onNext) },
        body: Array.isArray(body) ? body : [body],
    });
}

// FilePreviewPane — the SAME preview, but as a persistent, non-modal side pane
// for the WorkspaceShell's pane slot (the split-view, claude-Desktop file-pane
// feel). Distinct from the overlay FileViewer (kept as the <900px fallback).
// Not focus-trapped (it is not modal); ArrowLeft/Right step files when focused.
export function FilePreviewPane({ file, body, onClose, onAction, onPrev, onNext } = {}) {
    if (!file) {
        return h('div', { class: 'ds-preview-pane ds-preview-pane-empty', role: 'status' },
            h('span', {}, 'Select a file to preview'));
    }
    return h('div', { class: 'ds-preview-pane', role: 'region', 'aria-label': 'file preview: ' + (file.name || ''),
                      tabindex: '0', onkeydown: previewKeyNav(onPrev, onNext) },
        h('div', { class: 'ds-preview-head', 'data-file-type': file.type || 'other' },
            ...previewHead({ file, onClose, onAction, onPrev, onNext })),
        h('div', { class: 'ds-preview-body', 'data-file-type': file.type || 'other' },
            ...(Array.isArray(body) ? body : [body]))
    );
}
