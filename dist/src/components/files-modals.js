// File modals — matches upstream signatures + class names.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Btn } from './shell.js';
import { fileGlyph, fmtFileSize } from './files.js';
const h = webjsx.createElement;

function Backdrop({ onClose, children, kind = '' } = {}) {
    return h('div', {
        class: 'ds-modal-backdrop',
        onclick: (e) => { if (e.target === e.currentTarget && onClose) onClose(); }
    },
        h('div', { class: 'ds-modal' + (kind ? ' ds-modal-' + kind : '') }, ...(Array.isArray(children) ? children : [children]))
    );
}

export function ConfirmDialog({ title = 'confirm', message, confirmLabel = 'confirm', cancelLabel = 'cancel', destructive, onConfirm, onCancel } = {}) {
    return Backdrop({
        onClose: onCancel,
        kind: 'small',
        children: [
            h('div', { class: 'ds-modal-head' }, title),
            h('div', { class: 'ds-modal-body' }, message || ''),
            h('div', { class: 'ds-modal-actions' },
                Btn({ onClick: onCancel, children: cancelLabel }),
                h('button', {
                    class: destructive ? 'btn-primary danger' : 'btn-primary',
                    onclick: onConfirm
                }, confirmLabel)
            )
        ]
    });
}

export function PromptDialog({ title = 'name', value = '', placeholder = '', confirmLabel = 'ok', cancelLabel = 'cancel', onConfirm, onCancel, onInput } = {}) {
    return Backdrop({
        onClose: onCancel,
        kind: 'small',
        children: [
            h('div', { class: 'ds-modal-head' }, title),
            h('div', { class: 'ds-modal-body' },
                h('input', {
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
                })
            ),
            h('div', { class: 'ds-modal-actions' },
                Btn({ onClick: onCancel, children: cancelLabel }),
                h('button', { class: 'btn-primary', onclick: () => onConfirm && onConfirm(value) }, confirmLabel)
            )
        ]
    });
}

export function FilePreviewMedia({ src, type = 'other', name } = {}) {
    if (type === 'image') return h('img', { class: 'ds-preview-media', src, alt: name || '' });
    if (type === 'video') return h('video', { class: 'ds-preview-media', src, controls: true });
    if (type === 'audio') return h('audio', { class: 'ds-preview-audio', src, controls: true });
    return h('div', { class: 'ds-preview-fallback' },
        h('span', { class: 'ds-preview-glyph' }, fileGlyph(type)),
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
    return Backdrop({
        onClose,
        kind: 'preview',
        children: [
            h('div', { class: 'ds-modal-head ds-preview-head', 'data-file-type': file.type || 'other' },
                h('span', { class: 'ds-preview-name' }, file.name || ''),
                h('span', { class: 'ds-preview-meta' }, meta),
                h('span', { class: 'ds-preview-actions' },
                    onAction ? h('button', { class: 'ds-file-act', title: 'download', onclick: () => onAction('download') }, '↓') : null,
                    h('button', { class: 'ds-file-act', title: 'close', onclick: onClose }, '✕')
                )
            ),
            h('div', { class: 'ds-preview-body', 'data-file-type': file.type || 'other' },
                ...(Array.isArray(body) ? body : [body])
            )
        ]
    });
}
