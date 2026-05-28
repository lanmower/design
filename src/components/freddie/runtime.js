// Freddie page runtime — gives each page a self-contained state + fetch +
// rerender loop so the consumer's thin router (e.g. freddie src/web/app.js)
// only has to call `page(host)` and mount the returned vnode. No router
// changes required downstream: each page boots its own micro render loop via
// a ref callback that uses the SDK's own applyDiff.

import * as webjsx from '../../../vendor/webjsx/index.js';
const h = webjsx.createElement;
const applyDiff = webjsx.applyDiff;

// Same-origin JSON fetch helper. Returns parsed JSON or throws with a
// readable message carrying the HTTP status so page error states can show it.
export async function api(path, opts = {}) {
    const res = await fetch(path, {
        headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
        ...opts,
        body: opts.body != null && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body,
    });
    let json = null;
    const text = await res.text();
    try { json = text ? JSON.parse(text) : null; } catch { json = { _raw: text }; }
    if (!res.ok) {
        const msg = (json && (json.error?.message || json.error || json.message)) || text || ('HTTP ' + res.status);
        const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        err.status = res.status;
        err.body = json;
        throw err;
    }
    return json;
}

// makePage(setup) -> (host) => vnode
//   setup(ctx) is called once per mount with:
//     ctx.state    — mutable page state object (seeded from initial)
//     ctx.set(p)   — shallow-merge into state and rerender
//     ctx.rerender()— force a rerender
//     ctx.host     — the consumer host object passed by the router
//     ctx.api      — the fetch helper above
//   setup MUST return a render() function: () => vnode (sync) using ctx.state.
//   Optionally setup may kick off async loads that call ctx.set(...) on arrival
//   and may register intervals via ctx.interval(fn, ms) (auto-cleared on unmount).
export function makePage(setup, { initial = {} } = {}) {
    return function pageRenderer(host) {
        const state = { loading: true, error: null, ...initial };
        const timers = [];
        let elRef = null;
        let render = () => h('div', {});
        const ctx = {
            state, host, api,
            set(patch) { Object.assign(state, patch); ctx.rerender(); },
            rerender() { if (elRef) { try { applyDiff(elRef, wrap()); } catch (e) { console.warn('[freddie page rerender]', e); } } },
            interval(fn, ms) { const id = setInterval(fn, ms); timers.push(id); return id; },
            cleanup() { for (const id of timers) clearInterval(id); timers.length = 0; },
        };
        function wrap() {
            let body;
            try { body = render(); }
            catch (e) {
                body = h('div', { class: 'ds-alert ds-alert-error', role: 'alert' },
                    h('span', { class: 'ds-alert-icon' }, '✕'),
                    h('div', { class: 'ds-alert-content' },
                        h('div', { class: 'ds-alert-title' }, 'page render error'),
                        h('pre', { class: 'fd-pre' }, String(e && e.stack || e))));
            }
            return h('div', { class: 'fd-page-inner' }, ...(Array.isArray(body) ? body : [body]));
        }
        const ref = (el) => {
            if (!el) { ctx.cleanup(); return; }
            if (elRef === el) return;
            elRef = el;
            const r = setup(ctx);
            if (typeof r === 'function') render = r;
            ctx.rerender();
        };
        return h('div', { class: 'fd-page-root', ref });
    };
}

// Standard loading + error scaffolding helpers so every page is consistent.
export function loadingState(label = 'loading…') {
    return h('div', { class: 'fd-loading', role: 'status', 'aria-live': 'polite' },
        h('div', { class: 'ds-spinner tone-accent', 'aria-hidden': 'true' },
            h('span'), h('span'), h('span')),
        h('span', { class: 'dim' }, label));
}

export function errorState(err, onRetry) {
    const msg = String(err && err.message || err);
    return h('div', { class: 'ds-alert ds-alert-error', role: 'alert' },
        h('span', { class: 'ds-alert-icon' }, '✕'),
        h('div', { class: 'ds-alert-content' },
            h('div', { class: 'ds-alert-title' }, 'failed to load'),
            h('div', { class: 'ds-alert-message' }, msg),
            onRetry ? h('button', { class: 'btn', onclick: onRetry, style: 'margin-top:8px' }, 'retry') : null));
}

export function emptyState(text = 'nothing here yet', glyph = '◌') {
    return h('div', { class: 'fd-empty', role: 'status' },
        h('div', { class: 'fd-empty-glyph', 'aria-hidden': 'true' }, glyph),
        h('div', { class: 'dim' }, text));
}
