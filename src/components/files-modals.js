// File modals — matches upstream signatures + class names.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Btn, Icon } from './shell.js';
import { fileGlyph, fmtFileSize } from './files.js';
const h = webjsx.createElement;

function Backdrop({ onClose, children, kind = '' } = {}) {
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
        h('div', { class: 'ds-modal' + (kind ? ' ds-modal-' + kind : '') }, ...(Array.isArray(children) ? children : [children]))
    );
}

// Shared modal shell: head + body + actions row. ConfirmDialog/PromptDialog/
// FileViewer all funnel through this so the ds-modal markup is authored once.
// `actions` is an array of vnodes (already using the Btn primitive). Any of the
// slots may be omitted.
function Modal({ onClose, kind = '', head, headClass = '', headAttrs = {}, body, bodyClass = 'ds-modal-body', bodyAttrs = {}, actions } = {}) {
    return Backdrop({
        onClose,
        kind,
        children: [
            head != null ? h('div', { class: ('ds-modal-head' + (headClass ? ' ' + headClass : '')), ...headAttrs }, ...(Array.isArray(head) ? head : [head])) : null,
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

export function FilePreviewCode({ content = '', lang } = {}) {
    return h('pre', { class: 'ds-preview-code' + (lang ? ' lang-' + lang : '') },
        h('code', { class: lang ? 'language-' + lang : '' }, content)
    );
}

export function FilePreviewText({ content = '', truncated } = {}) {
    return h('pre', { class: 'ds-preview-text' },
        h('code', {}, content),
        truncated ? h('div', { class: 'ds-preview-truncated' }, '… (truncated)') : null
    );
}

export function FileViewer({ file, body, onClose, onAction } = {}) {
    if (!file) return null;
    const meta = [file.type, file.size != null ? fmtFileSize(file.size) : null, file.modified || null]
        .filter(Boolean).join(' · ');
    return Modal({
        onClose,
        kind: 'preview',
        headClass: 'ds-preview-head',
        headAttrs: { 'data-file-type': file.type || 'other' },
        head: [
            h('span', { class: 'ds-preview-name' }, file.name || ''),
            h('span', { class: 'ds-preview-meta' }, meta),
            h('span', { class: 'ds-preview-actions' },
                onAction ? h('button', { class: 'ds-file-act', title: 'download', 'aria-label': 'download', onclick: () => onAction('download') }, Icon('arrow-down')) : null,
                h('button', { class: 'ds-file-act', title: 'close', 'aria-label': 'close', onclick: onClose }, Icon('x'))
            )
        ],
        bodyClass: 'ds-preview-body',
        bodyAttrs: { 'data-file-type': file.type || 'other' },
        body: Array.isArray(body) ? body : [body],
    });
}
