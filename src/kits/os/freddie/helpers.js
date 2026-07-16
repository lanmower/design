import * as webjsx from '../../../../vendor/webjsx/index.js';
const h = webjsx.createElement;

export function pre(obj) {
    return h('pre', { class: 'fd-pre' }, typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
}

export function form(opts) {
    const { fields = [], submit = 'submit', onSubmit } = opts;
    return h('form', { class: 'row-form', onsubmit: (ev) => { ev.preventDefault(); onSubmit && onSubmit(ev); } },
        ...fields.map(f => f.kind === 'textarea'
            ? h('textarea', { name: f.name, placeholder: f.placeholder || '', rows: f.rows || 4 })
            : h('input', { name: f.name, type: f.type || 'text', placeholder: f.placeholder || '', value: f.value || '', required: f.required ? 'true' : null })),
        h('button', { type: 'submit', class: 'btn-primary' }, submit));
}

export function getRecentPaths() {
    try { return JSON.parse(localStorage.getItem('fd_recent_cwds') || '[]'); } catch { return []; }
}

export function saveRecentPath(p) {
    if (!p) return;
    try {
        const prev = getRecentPaths().filter(x => x !== p);
        localStorage.setItem('fd_recent_cwds', JSON.stringify([p, ...prev].slice(0, 5)));
    } catch { /* swallow: persistence is best-effort, recent-path history is non-critical */ }
}

export function skillLabel(s) {
    if (s.shortName) return s.shortName;
    const n = s.name || '';
    return n.replace(/^gm:/, '').replace(/^software-development$/, 'software dev').replace(/-/g, ' ');
}
