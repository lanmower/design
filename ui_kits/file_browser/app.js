import * as webjsx from 'webjsx';
import {
    Topbar, Crumb, AppShell, Status, Btn, Icon,
    FileGrid, FileToolbar, DropZone, UploadProgress, BreadcrumbPath,
    ConfirmDialog, PromptDialog, FileViewer,
    FilePreviewMedia, FilePreviewCode, FilePreviewText
} from '../../src/components.js';
const h = webjsx.createElement;

const SAMPLE = [
    { name: 'src',           type: 'dir',      size: null,    modified: '2026.04.21' },
    { name: 'design',        type: 'dir',      size: null,    modified: '2026.04.20' },
    { name: 'cover.png',     type: 'image',    size: 184320,  modified: '2026.04.18' },
    { name: 'reel.mp4',      type: 'video',    size: 2411724, modified: '2026.04.17' },
    { name: 'theme.mp3',     type: 'audio',    size: 4823100, modified: '2026.04.16' },
    { name: 'main.js',       type: 'code',     size: 4321,    modified: '2026.04.21' },
    { name: 'README.md',     type: 'text',     size: 2410,    modified: '2026.04.21' },
    { name: 'archive.zip',   type: 'archive',  size: 18234100,modified: '2026.04.10' },
    { name: 'spec.pdf',      type: 'document', size: 412300,  modified: '2026.04.04' },
    { name: 'link-out',      type: 'symlink',  size: null,    modified: '2026.04.02' },
    { name: '.config',       type: 'other',    size: 220,     modified: '2026.04.01' }
];

const PREVIEW_TEXT = `# 247420 file browser
this is a static demo wired to the design system.
no backend, no real files — just primitives in arrangement.`;

const PREVIEW_CODE = `export function FileRow({ name, type, size, modified, onOpen }) {
    return h('div', { class: 'ds-file-row', 'data-file-type': type, onclick: onOpen },
        FileIcon({ type }),
        h('span', { class: 'title' }, name),
        h('span', { class: 'meta' }, fmtFileSize(size))
    );
}`;

const state = {
    files: SAMPLE,
    crumbs: ['demo', 'tigers'],
    dragover: false,
    uploads: [],
    viewer: null,
    confirm: null,
    prompt: null,
    promptValue: '',
    // Which state the listing renders in. FileGrid already owns `loading`
    // (cold-load shimmer) and the empty copy; `error` is a directory-level
    // failure that has to sit above the grid because there is no listing at
    // all to decorate. Driven by the KitControls buttons below so every state
    // is reachable rather than only reproducible against a real broken mount.
    phase: 'ready'
};

const PHASES = ['ready', 'loading', 'empty', 'error'];

// Dev/demo state toggles for the listing — reachable reference surface for
// loading/empty/error, but not part of the toolbar a real FileBrowser would
// render. Collapsed by default behind a <details> disclosure (see
// .ds-kit-controls, kits-appended.css) — the same pattern the aicat and
// dashboard kits use for their reference-state toggles — so this reads as
// scaffolding around the component, not product chrome inside it.
function KitControls() {
    return h('details', { class: 'ds-kit-controls' },
        h('summary', {}, 'kit controls — listing reference state'),
        h('div', { class: 'ds-kit-controls-body' },
            h('div', { class: 'ds-btn-row', 'aria-label': 'listing demo state' },
                h('span', { class: 'eyebrow' }, 'demo:'),
                ...PHASES.map((p) => h('button', {
                    key: 'ph-' + p,
                    class: state.phase === p ? 'btn btn-primary' : 'btn',
                    onclick: () => { state.phase = p; render(); }
                }, p))
            )
        )
    );
}

// Directory-level failure. Names the problem AND the recovery: a bare "could
// not load" tells the user nothing they can act on.
function DirError() {
    return h('div', { class: 'ds-alert ds-alert-error' },
        h('span', { class: 'ds-alert-icon' }, '!'),
        h('div', { class: 'ds-alert-content' },
            h('div', { class: 'ds-alert-title' }, 'cannot read demo/tigers'),
            h('div', { class: 'ds-alert-message' }, 'the mount answered but refused the listing -- your account has write access to this path and not read. ask an owner for read, or open a folder you created.'),
            h('div', { class: 'ds-alert-retry' },
                h('button', { class: 'btn', onclick: () => { state.phase = 'ready'; render(); } }, 'retry listing')
            )
        )
    );
}

const root = document.getElementById('root');

function previewBody(file) {
    if (file.type === 'image' || file.type === 'video' || file.type === 'audio') {
        return FilePreviewMedia({
            type: file.type,
            name: file.name,
            src: file.type === 'image'
                ? 'data:image/svg+xml;utf8,' + encodeURIComponent(
                    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360"><rect width="600" height="360" fill="#3F8A4A"/><text x="300" y="200" text-anchor="middle" font-family="JetBrains Mono" font-size="48" fill="#F5F0E4">${file.name}</text></svg>`
                )
                : ''
        });
    }
    if (file.type === 'code') return FilePreviewCode({ content: PREVIEW_CODE, lang: 'js' });
    if (file.type === 'text' || file.type === 'document') return FilePreviewText({ content: PREVIEW_TEXT });
    return FilePreviewMedia({ type: file.type, name: file.name });
}

function openViewer(file) {
    if (file.type === 'dir') {
        state.crumbs = [...state.crumbs, file.name];
        render(); return;
    }
    state.viewer = file;
    render();
}

function rowAction(act, file) {
    if (act === 'download') {
        state.uploads = [{ name: 'downloading ' + file.name, pct: 100, done: true }];
        setTimeout(() => { state.uploads = []; render(); }, 1500);
        render(); return;
    }
    if (act === 'delete') {
        state.confirm = {
            title: 'delete ' + file.name + '?',
            message: 'this is a demo — nothing actually deletes.',
            destructive: true,
            onConfirm: () => {
                state.files = state.files.filter(f => f !== file);
                state.confirm = null; render();
            },
            onCancel: () => { state.confirm = null; render(); }
        };
        render(); return;
    }
    if (act === 'rename') {
        state.prompt = {
            title: 'rename ' + file.name,
            value: file.name,
            onConfirm: (v) => {
                if (v && v.trim()) file.name = v.trim();
                state.prompt = null; state.promptValue = ''; render();
            },
            onCancel: () => { state.prompt = null; state.promptValue = ''; render(); }
        };
        state.promptValue = file.name;
        render();
    }
}

function simulateUpload(files) {
    const items = Array.from(files).slice(0, 3).map(f => ({
        name: f.name || 'untitled',
        pct: 0, done: false
    }));
    state.uploads = items;
    render();
    items.forEach((it, i) => {
        let p = 0;
        const tick = () => {
            p += 20 + Math.random() * 30;
            it.pct = Math.min(100, Math.round(p));
            if (it.pct >= 100) { it.done = true; render(); return; }
            render();
            setTimeout(tick, 280 + i * 60);
        };
        setTimeout(tick, 200 + i * 200);
    });
    setTimeout(() => { state.uploads = []; render(); }, 4000);
}

function pickFiles() {
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true;
    input.onchange = () => simulateUpload(input.files);
    input.click();
}

function App() {
    // ds-files-stack owns the full-height scroll geometry; ds-app-surface adds
    // the Operate typescale so the page title sits at the app ceiling instead
    // of the 64px display size, which outweighs the file list it labels.
    const main = h('div', { class: 'ds-files-stack ds-app-surface' },
        h('h1', {}, 'file browser'),
        BreadcrumbPath({
            segments: state.crumbs,
            root: 'root',
            onNav: (i) => { state.crumbs = state.crumbs.slice(0, i); render(); }
        }),
        FileToolbar({
            left: [
                Btn({ onClick: pickFiles, 'aria-label': 'upload', children: [Icon('upload'), ' upload'] }),
                Btn({ onClick: () => {
                    state.prompt = {
                        title: 'new folder',
                        value: '',
                        onConfirm: (v) => {
                            if (v && v.trim()) state.files = [
                                { name: v.trim(), type: 'dir', size: null, modified: 'just now' },
                                ...state.files
                            ];
                            state.prompt = null; state.promptValue = ''; render();
                        },
                        onCancel: () => { state.prompt = null; state.promptValue = ''; render(); }
                    };
                    state.promptValue = '';
                    render();
                }, children: '+ folder' })
            ],
            right: [
                h('span', { class: 'meta ds-meta-mono' },
                    String(state.phase === 'ready' ? state.files.length : 0).padStart(2, '0') + ' items'
                )
            ]
        }),
        DropZone({
            label: 'drop files here to upload',
            dragover: state.dragover,
            onDragOver: () => { if (!state.dragover) { state.dragover = true; render(); } },
            onDragLeave: () => { state.dragover = false; render(); },
            onDrop: (files) => { state.dragover = false; simulateUpload(files); },
            onPick: pickFiles
        }),
        UploadProgress({ items: state.uploads }),
        state.phase === 'error' ? DirError() : FileGrid({
            files: state.phase === 'ready' ? state.files : [],
            loading: state.phase === 'loading',
            onOpen: openViewer,
            onAction: rowAction,
            emptyText: 'this folder is empty — drop files on the zone above, or use + folder to start a tree here.',
            emptyAction: Btn({ onClick: pickFiles, children: 'upload a file' })
        }),
        KitControls()
    );

    return h('div', {},
        AppShell({
            topbar: Topbar({
                brand: '247420',
                leaf: 'file browser',
                items: [
                    ['design', '../../'],
                    ['home', '../homepage/'],
                    ['docs', '../docs/'],
                    ['source', 'https://github.com/AnEntrypoint/Design']
                ]
            }),
            crumb: Crumb({ trail: ['247420', 'ui kits'], leaf: 'file browser' }),
            main,
            status: Status({ left: ['main', '- ' + (state.phase === 'ready' ? state.files.length : 0) + ' items', '- ' + state.phase], right: ['live', 'demo only'] })
        }),
        state.viewer ? FileViewer({
            file: state.viewer,
            body: previewBody(state.viewer),
            onClose: () => { state.viewer = null; render(); },
            onAction: (act) => { if (act === 'download') { state.viewer = null; render(); } }
        }) : null,
        state.confirm ? ConfirmDialog(state.confirm) : null,
        state.prompt ? PromptDialog({
            ...state.prompt,
            value: state.promptValue,
            onInput: (v) => { state.promptValue = v; }
        }) : null
    );
}

function render() { webjsx.applyDiff(root, App()); }
render();

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (state.viewer) { state.viewer = null; render(); return; }
    if (state.prompt) { state.prompt.onCancel && state.prompt.onCancel(); return; }
    if (state.confirm) { state.confirm.onCancel && state.confirm.onCancel(); }
});
