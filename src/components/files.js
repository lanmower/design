// File primitives — matches upstream signatures.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Btn } from './shell.js';
const h = webjsx.createElement;

const FILE_TYPES = ['dir', 'image', 'video', 'audio', 'code', 'text', 'archive', 'document', 'symlink', 'other'];
const TYPE_GLYPH = {
    dir: '▣', image: '◰', video: '▰', audio: '◎', code: '⌘',
    text: '§', archive: '◐', document: '▢', symlink: '↗', other: '◌'
};

const TYPE_LABELS = {
    dir: 'folder',
    image: 'image file',
    video: 'video file',
    audio: 'audio file',
    code: 'code file',
    text: 'text file',
    archive: 'archive file',
    document: 'document file',
    symlink: 'symbolic link',
    other: 'file'
};

export function fileGlyph(type) {
    return TYPE_GLYPH[type] || TYPE_GLYPH.other;
}

export function fmtFileSize(bytes) {
    if (bytes == null || bytes === 0) return '—';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0, n = bytes;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return n.toFixed(i === 0 ? 0 : 1) + ' ' + u[i];
}

export function FileIcon({ type = 'other' } = {}) {
    return h('span', { class: 'ds-file-icon', 'data-file-type': type, 'aria-label': TYPE_LABELS[type] || 'file', role: 'img' }, fileGlyph(type));
}

export function FileRow({ name, type = 'other', size, modified, code, onOpen, onAction, active, key } = {}) {
    const meta = [type === 'dir' ? null : fmtFileSize(size), modified || null].filter(Boolean).join(' · ');
    const typeLabel = TYPE_LABELS[type] || 'file';
    const accessibleLabel = `${typeLabel}: ${name}${meta ? ` (${meta})` : ''}`;
    return h('div', {
        key,
        class: 'ds-file-row row' + (active ? ' active' : ''),
        'data-file-type': type,
        onclick: onOpen,
        role: 'button',
        tabindex: '0',
        'aria-label': accessibleLabel,
        'aria-pressed': active ? 'true' : 'false',
        onkeydown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen && onOpen();
            }
        }
    },
        code != null ? h('span', { class: 'code', 'aria-label': `code: ${code}` }, code) : null,
        FileIcon({ type }),
        h('span', { class: 'title' }, name),
        h('span', { class: 'ds-file-meta meta', 'aria-label': meta ? `metadata: ${meta}` : null }, meta || '—'),
        onAction ? h('span', { class: 'ds-file-actions', onclick: (e) => e.stopPropagation(), role: 'group', 'aria-label': `actions for ${name}` },
            h('button', { class: 'ds-file-act', title: 'download', 'aria-label': `download ${name}`, onclick: () => onAction('download') }, '↓'),
            h('button', { class: 'ds-file-act', title: 'rename', 'aria-label': `rename ${name}`, onclick: () => onAction('rename') }, '✎'),
            h('button', { class: 'ds-file-act ds-file-act-warn', title: 'delete', 'aria-label': `delete ${name}`, onclick: () => onAction('delete') }, '✕')
        ) : null
    );
}

export function FileGrid({ files = [], onOpen, onAction, emptyText = 'no files here yet', columns = 'auto' } = {}) {
    if (!files.length) return EmptyState({ text: emptyText });
    const gridAttrs = {};
    if (columns !== 'auto' && columns > 0) {
        const col = Math.max(1, Math.min(4, Math.floor(columns)));
        gridAttrs['data-columns'] = String(col);
        gridAttrs.style = {
            display: 'grid',
            gridTemplateColumns: `repeat(${col}, minmax(240px, 1fr))`,
            gap: 'var(--space-3)'
        };
    }
    return h('div', { class: 'ds-file-grid', ...gridAttrs },
        ...files.map((f, i) => FileRow({
            key: f.path || f.name + i,
            name: f.name, type: f.type, size: f.size, modified: f.modified, code: f.code, active: f.active,
            onOpen: onOpen ? () => onOpen(f) : null,
            onAction: onAction ? (act) => onAction(act, f) : null
        }))
    );
}

export function FileToolbar({ left = [], right = [] } = {}) {
    return h('div', { class: 'ds-file-toolbar' },
        h('div', { class: 'ds-file-toolbar-left' }, ...left),
        h('div', { class: 'ds-file-toolbar-right' }, ...right)
    );
}

export function DropZone({ children, dragover, onDrop, onDragOver, onDragLeave, label = 'drop files here', onPick } = {}) {
    return h('div', {
        class: 'ds-dropzone' + (dragover ? ' dragover' : ''),
        ondragover: (e) => { e.preventDefault(); onDragOver && onDragOver(e); },
        ondragleave: (e) => { onDragLeave && onDragLeave(e); },
        ondrop: (e) => { e.preventDefault(); onDrop && onDrop(e.dataTransfer.files); }
    },
        h('div', { class: 'ds-dropzone-inner' },
            h('span', { class: 'ds-dropzone-glyph' }, '⇪'),
            h('span', { class: 'ds-dropzone-label' }, label),
            onPick ? Btn({ onClick: onPick, children: 'pick files' }) : null
        ),
        ...(Array.isArray(children) ? children : children ? [children] : [])
    );
}

export function UploadProgress({ items = [] } = {}) {
    if (!items.length) return null;
    return h('div', { class: 'ds-upload-progress' },
        ...items.map((it, i) => {
            const status = it.error ? 'error' : (it.done ? 'complete' : `uploading ${it.pct || 0}%`);
            return h('div', {
                key: it.name + i,
                class: 'ds-upload-item' + (it.done ? ' done' : '') + (it.error ? ' error' : ''),
                role: 'progressbar',
                'aria-valuenow': String(Math.max(0, Math.min(100, it.pct || 0))),
                'aria-valuemin': '0',
                'aria-valuemax': '100',
                'aria-label': `${it.name}: ${status}`,
                'aria-busy': it.done || it.error ? 'false' : 'true'
            },
                h('span', { class: 'ds-upload-name' }, it.name),
                h('span', { class: 'ds-upload-bar' },
                    h('span', { class: 'ds-upload-fill', 'data-pct': String(Math.max(0, Math.min(100, it.pct || 0))), 'aria-hidden': 'true' })
                ),
                h('span', { class: 'ds-upload-pct', 'aria-hidden': 'true' }, (it.error ? 'err' : (it.done ? 'ok' : (it.pct || 0) + '%')))
            );
        })
    );
}

export function EmptyState({ text = 'nothing here', glyph = '◌' } = {}) {
    return h('div', { class: 'ds-file-empty' },
        h('span', { class: 'ds-file-empty-glyph' }, glyph),
        h('span', { class: 'ds-file-empty-text' }, text)
    );
}

export function BreadcrumbPath({ segments = [], onNav, root = 'root' } = {}) {
    const parts = [h('button', { key: 'root', class: 'ds-crumb-seg', onclick: () => onNav && onNav(0) }, root)];
    segments.forEach((seg, i) => {
        parts.push(h('span', { key: 'sep' + i, class: 'ds-crumb-sep' }, '›'));
        parts.push(h('button', {
            key: 'seg' + i,
            class: 'ds-crumb-seg' + (i === segments.length - 1 ? ' leaf' : ''),
            onclick: () => onNav && onNav(i + 1)
        }, seg));
    });
    return h('div', { class: 'ds-crumb-path' }, ...parts);
}
