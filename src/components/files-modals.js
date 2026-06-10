// File modals — matches upstream signatures + class names.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Btn, Icon } from './shell.js';
import { fileGlyph, fmtFileSize } from './files.js';
const h = webjsx.createElement;

// Monotonic id source for aria-labelledby wiring between a modal and its head.
let _modalSeq = 0;

function Backdrop({ onClose, children, kind = '', labelledBy } = {}) {
    // webjsx invokes a ref callback with the element on mount and with null on
    // unmount. We stash the per-element keydown teardown on the node itself so
    // the null branch can run it — otherwise the document/element listener leaks
    // once the modal is removed.
    const backdropRef = (el) => {
        if (!el) return;            // unmount (ref(null)) handled by wrapper below
        const modal = el.querySelector('.ds-modal');
        if (!modal) return;

        // Focus trap: handle Tab key to cycle focus within modal
        const focusables = modal.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusables[0];
        const lastFocusable = focusables[focusables.length - 1];

        const handleKeydown = (e) => {
            // Escape closes the modal
            if (e.key === 'Escape') {
                e.preventDefault();
                if (onClose) onClose();
                return;
            }
            // Tab trapping
            if (e.key === 'Tab') {
                if (focusables.length === 0) {
                    e.preventDefault();
                    return;
                }
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

        el.addEventListener('keydown', handleKeydown);
        el._dsModalTeardown = () => el.removeEventListener('keydown', handleKeydown);
        // Auto-focus on open — always, not only when focus sits on <body>.
        // Prefer an element explicitly marked [autofocus].
        const preferred = modal.querySelector('[autofocus]') || firstFocusable;
        if (preferred) preferred.focus();
    };

    return h('div', {
        class: 'ds-modal-backdrop',
        ref: (el) => {
            if (el) backdropRef(el);
            else if (Backdrop._last && Backdrop._last._dsModalTeardown) { Backdrop._last._dsModalTeardown(); Backdrop._last = null; }
            if (el) Backdrop._last = el;
        },
        onclick: (e) => { if (e.target === e.currentTarget && onClose) onClose(); }
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
function Modal({ onClose, kind = '', head, headClass = '', headAttrs = {}, body, bodyClass = 'ds-modal-body', bodyAttrs = {}, actions } = {}) {
    // Give the head a stable id so the dialog can point aria-labelledby at it,
    // exposing the title as the dialog's accessible name to screen readers.
    const headId = head != null ? ('ds-modal-head-' + (++_modalSeq)) : null;
    return Backdrop({
        onClose,
        kind,
        labelledBy: headId,
        children: [
            head != null ? h('div', { id: headId, class: ('ds-modal-head' + (headClass ? ' ' + headClass : '')), ...headAttrs }, ...(Array.isArray(head) ? head : [head])) : null,
            body != null ? h('div', { class: bodyClass, ...bodyAttrs }, ...(Array.isArray(body) ? body : [body])) : null,
            actions != null ? h('div', { class: 'ds-modal-actions' }, ...(Array.isArray(actions) ? actions : [actions])) : null,
        ].filter(Boolean)
    });
}

export function ConfirmDialog({ title = 'confirm', message, confirmLabel = 'confirm', cancelLabel = 'cancel', destructive, onConfirm, onCancel } = {}) {
    return Modal({
        onClose: onCancel,
        kind: 'small',
        head: title,
        body: message || '',
        actions: [
            Btn({ onClick: onCancel, children: cancelLabel }),
            Btn({ primary: true, danger: !!destructive, onClick: onConfirm, children: confirmLabel })
        ]
    });
}

export function PromptDialog({ title = 'name', value = '', placeholder = '', confirmLabel = 'ok', cancelLabel = 'cancel', onConfirm, onCancel, onInput } = {}) {
    return Modal({
        onClose: onCancel,
        kind: 'small',
        head: title,
        body: h('input', {
            class: 'input ds-modal-input',
            type: 'text',
            value,
            placeholder,
            autofocus: true,
            oninput: (e) => onInput && onInput(e.target.value),
            onkeydown: (e) => {
                if (e.key === 'Enter') { e.preventDefault(); onConfirm && onConfirm(e.target.value); }
                if (e.key === 'Escape') { e.preventDefault(); onCancel && onCancel(); }
            }
        }),
        actions: [
            Btn({ onClick: onCancel, children: cancelLabel }),
            Btn({
                primary: true,
                // Read the live input value, not the closed-over `value` prop:
                // consumers update their state in oninput without re-rendering
                // (to avoid caret jump), so the prop is stale at click time.
                onClick: (e) => {
                    if (!onConfirm) return;
                    const inp = e.currentTarget.closest('.ds-modal')?.querySelector('.ds-modal-input');
                    onConfirm(inp ? inp.value : value);
                },
                children: confirmLabel
            })
        ]
    });
}

export function FilePreviewMedia({ src, type = 'other', name } = {}) {
    if (type === 'image') return h('img', { class: 'ds-preview-media', src, alt: name || '' });
    if (type === 'video') return h('video', { class: 'ds-preview-media', src, controls: true });
    if (type === 'audio') return h('audio', { class: 'ds-preview-audio', src, controls: true });
    return h('div', { class: 'ds-preview-fallback' },
        h('span', { class: 'ds-preview-glyph', 'aria-hidden': 'true' }, Icon(fileGlyph(type))),
        h('span', {}, 'no inline preview for ' + (type || 'this file'))
    );
}

export function FilePreviewCode({ content = '', lang, filename } = {}) {
    // A filename/lang header matching the chat CodeNode's .chat-code-head, plus
    // the same copy control (chat A1/A2 ship this run, so preview matches for
    // full cross-surface consistency).
    const onCopy = (e) => {
        const btn = e.currentTarget;
        const done = () => { btn.textContent = 'copied'; btn.classList.add('is-copied'); setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('is-copied'); }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(content).then(done).catch(() => {});
        else { try { const t = document.createElement('textarea'); t.value = content; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); done(); } catch {} }
    };
    return h('div', { class: 'ds-preview-code-wrap' },
        h('div', { class: 'chat-code-head ds-preview-code-head' },
            h('span', { class: 'lang' }, lang || 'text'),
            filename ? h('span', { class: 'name' }, filename) : null,
            h('span', { class: 'spread' }),
            h('button', { type: 'button', class: 'chat-code-copy chat-code-copy-head', 'aria-label': 'copy code', onclick: onCopy }, 'copy')),
        h('pre', { class: 'ds-preview-code' + (lang ? ' lang-' + lang : '') },
            h('code', { class: lang ? 'language-' + lang : '' }, content))
    );
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

export function FileViewer({ file, body, onClose, onAction, onPrev, onNext } = {}) {
    if (!file) return null;
    return Modal({
        onClose,
        kind: 'preview',
        headClass: 'ds-preview-head',
        headAttrs: { 'data-file-type': file.type || 'other', onkeydown: previewKeyNav(onPrev, onNext) },
        head: previewHead({ file, onClose, onAction, onPrev, onNext }),
        bodyClass: 'ds-preview-body',
        bodyAttrs: { 'data-file-type': file.type || 'other' },
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
