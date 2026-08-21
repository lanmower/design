// Freddie settings pages: `config` (runtime configuration + active skin) and
// `env` (provider api keys — write-only, the server returns only a masked
// fingerprint, never the key itself).

import * as webjsx from '../../../vendor/webjsx/index.js';
import { makePage, api, loadingState, errorState, emptyState } from './runtime.js';
import { Row, Table, PageHeader, TextField, Select } from '../content.js';
import { Chip, Btn } from '../shell.js';
import { ConfirmDialog } from '../files-modals.js';
import { section, noteAlert, liveRegion } from './shared.js';

const h = webjsx.createElement;

// POST /api/config (plugins/gui/gui-config/plugin.js) only ever accepts a
// SINGLE {key, value} dot-path write at a time (it delegates straight to
// src/config.js::saveConfigValue(dotpath, value), which recursively creates
// nested objects along the path) -- it does not accept a bulk map body.
// Recursively flatten nested config OBJECTS (not arrays -- an array like
// agent.model_preference can't be safely round-tripped through a plain text
// field) into dot-path leaves so both (a) the save request shape actually
// matches what the backend accepts, and (b) settings that live one or more
// levels deep (almost everything in DEFAULT_CONFIG) are actually editable
// here instead of only true top-level scalars.
function flattenConfig(obj, prefix = '') {
    const out = [];
    for (const [k, v] of Object.entries(obj || {})) {
        const path = prefix ? prefix + '.' + k : k;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenConfig(v, path));
        else out.push([path, v]);
    }
    return out;
}

// TextField.onInput always yields a string; coerce back to the original
// value's real type before sending, or a numeric/boolean setting silently
// turns into its string form on save (e.g. agent.approval_timeout_ms
// becoming "120000" instead of 120000 would break any duration math
// downstream, and _config_version becoming a string would break the
// migration-version check that compares it numerically).
function coerceLike(original, raw) {
    if (typeof original === 'number') { const n = Number(raw); return Number.isNaN(n) ? original : n; }
    if (typeof original === 'boolean') return raw === 'true' || raw === true;
    return raw;
}

export const config = makePage((ctx) => {
    Object.assign(ctx.state, { edited: {}, busy: false, note: null });
    async function load() {
        try {
            const [cfg, skins] = await Promise.all([api('/api/config'), api('/api/skins').catch(() => null)]);
            ctx.set({ loading: false, cfg, skins, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function saveOne(key, value) {
        return api('/api/config', { method: 'POST', body: { key, value } });
    }
    async function save() {
        const entries = Object.entries(ctx.state.edited);
        if (!entries.length) return;
        ctx.set({ busy: true, note: null });
        try {
            for (const [key, value] of entries) await saveOne(key, value);
            ctx.state.edited = {};
            await load();
            ctx.set({ note: { kind: 'success', msg: 'saved' } });
        } catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    async function setSkin(name) {
        ctx.set({ busy: true, note: null });
        // The real, canonical path is display.skin -- src/skin/engine.js's
        // getSkin()/saveSkin() and src/cli/setup.js both read/write exactly
        // this dot-path. A bare 'skin' key writes to a location the skin
        // engine never reads, so the picker would "succeed" with zero real
        // effect on which skin is actually active.
        try { await saveOne('display.skin', name); await load(); ctx.set({ note: { kind: 'success', msg: 'skin -> ' + name } }); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading config…');
        if (s.error) return errorState(s.error, load);
        const cfg = s.cfg || {};
        // _config_version is migration-owned: src/config.js's migrate() runs
        // on every loadConfig() and unconditionally sets it to
        // DEFAULT_CONFIG._config_version regardless of what's stored --
        // editing it here would always silently no-op on the next load, so
        // don't offer it as an editable field. display.skin is covered by
        // the dedicated Select below (same real path, better UX) -- exclude
        // it from the generic list to avoid two controls racing on save.
        const flat = flattenConfig(cfg).filter(([k, v]) => k !== '_config_version' && k !== 'display.skin' && (v === null || typeof v !== 'object'));
        const arrayKeys = flattenConfig(cfg).filter(([, v]) => Array.isArray(v)).map(([k]) => k);
        // GET /api/skins (listBuiltinSkins()) returns a bare array of skin
        // NAME strings, not {skins,active} -- and the real active-skin value
        // lives at cfg.display.skin (see setSkin's comment), never cfg.skin.
        const skinList = Array.isArray(s.skins) ? s.skins : [];
        const activeSkin = (cfg.display && cfg.display.skin) || 'default';
        return [
            PageHeader({ title: 'config', lede: 'runtime configuration' }),
            noteAlert(s.note),
            liveRegion(s.busy ? 'saving configuration' : ''),
            arrayKeys.length ? h('div', { class: 'ds-alert ds-alert-info', role: 'note' },
                h('span', { class: 'ds-alert-icon' }, 'i'),
                h('div', { class: 'ds-alert-content' }, arrayKeys.length + ' array-valued config ' + (arrayKeys.length === 1 ? 'key is' : 'keys are') + ' read-only here (' + arrayKeys.join(', ') + ') — edit via the config file or raw view below.')) : null,
            skinList.length ? section('skin',
                Select({ label: 'active skin', value: activeSkin, options: skinList, onChange: (v) => setSkin(v) })
            ) : null,
            section('settings', flat.length ? flat.map(([k, v], i) =>
                TextField({ key: i, label: k, value: String(ctx.state.edited[k] ?? v ?? ''), onInput: (val) => { ctx.state.edited[k] = coerceLike(v, val); ctx.rerender(); } })
            ) : emptyState('no scalar config keys')),
            section('raw', h('pre', { class: 'fd-pre' }, JSON.stringify(cfg, null, 2))),
            section('actions',
                Btn({ variant: 'primary', disabled: s.busy || !Object.keys(s.edited).length, children: s.busy ? 'saving…' : 'save changes', onClick: save })),
        ].filter(Boolean);
    };
});

export const env = makePage((ctx) => {
    Object.assign(ctx.state, { auth: null, vars: null, draft: {}, busy: '', note: null, confirmRemove: null });
    async function load() {
        try {
            // No inner .catch(()=>null) on either call -- that would swallow a
            // real fetch failure before the outer try/catch could see it, so
            // s.error stayed permanently null and a genuine 500/network error
            // rendered identically to "no providers configured" (which reads
            // as "you have no API keys" -- actively misleading for a page
            // whose whole purpose is showing key status).
            const results = await Promise.allSettled([api('/api/auth'), api('/api/env')]);
            const [auth, vars] = results.map(r => r.status === 'fulfilled' ? r.value : null);
            const allFailed = results.every(r => r.status === 'rejected');
            ctx.set({ loading: false, auth, vars, error: allFailed ? (results[0].reason || new Error('key/env endpoints unreachable')) : null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    // Set a provider key through the dashboard (POST /api/auth). The key is sent
    // once and never echoed back — GET /api/auth returns only a masked fingerprint.
    async function setKey(provider) {
        const key = (ctx.state.draft[provider] || '').trim();
        if (!key) { ctx.set({ note: { kind: 'warn', msg: 'key required for ' + provider } }); return; }
        ctx.set({ busy: provider, note: null });
        try { await api('/api/auth', { method: 'POST', body: { provider, key } }); ctx.state.draft[provider] = ''; await load(); ctx.set({ note: { kind: 'success', msg: 'stored ' + provider } }); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: '' });
    }
    // Removing a stored key is instant and irreversible -- the raw value is
    // never retrievable once removed (GET /api/auth only ever returns a
    // masked fingerprint), so the user would have to re-obtain the real key
    // from wherever they originally got it. Gate behind ConfirmDialog like
    // the other three destructive actions in this page catalog.
    async function removeKey(provider) {
        ctx.set({ busy: provider, note: null });
        try { await api('/api/auth/' + encodeURIComponent(provider), { method: 'DELETE' }); await load(); ctx.set({ note: { kind: 'success', msg: 'removed ' + provider } }); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: '', confirmRemove: null });
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading keys…');
        if (s.error && !s.auth) return errorState(s.error, load);
        const auth = Array.isArray(s.auth) ? s.auth : [];
        const vars = Array.isArray(s.vars) ? s.vars : [];
        // Non-provider env vars (platform tokens etc) stay a read-only presence table.
        const providerEnvs = new Set(auth.map(a => a.env));
        const otherRows = vars.filter(v => !providerEnvs.has(v.key)).map(v => [v.key, v.set ? Chip({ tone: 'ok', children: v.source || 'set' }) : Chip({ tone: 'neutral', children: 'unset' })]);
        return [
            PageHeader({ title: 'keys', lede: 'provider api keys · stored locally, never displayed' }),
            noteAlert(s.note),
            section('provider keys',
                auth.length ? auth.map((a, i) => Row({
                    key: i, title: a.provider, sub: a.env + (a.set ? '  ·  ' + a.source + (a.fingerprint ? '  ·  ' + a.fingerprint : '') : ''),
                    trailing: h('span', { class: 'fd-row-actions' },
                        a.set ? Chip({ tone: 'ok', children: 'set' }) : Chip({ tone: 'neutral', children: 'unset' }),
                        TextField({ type: 'password', value: s.draft[a.provider] || '', onInput: (v) => { s.draft[a.provider] = v; }, placeholder: 'paste key', 'aria-label': 'key for ' + a.provider }),
                        Btn({ variant: 'primary', disabled: s.busy === a.provider, children: s.busy === a.provider ? '…' : 'save', onClick: () => setKey(a.provider) }),
                        (a.set && a.source === 'stored') ? Btn({ variant: 'danger', disabled: s.busy === a.provider, children: 'remove', onClick: () => ctx.set({ confirmRemove: a }) }) : null),
                })) : emptyState('no providers')),
            otherRows.length ? section('other environment', Table({ headers: ['key', 'status'], rows: otherRows })) : null,
            s.confirmRemove ? ConfirmDialog({
                title: 'Remove key?',
                message: 'This removes the stored ' + s.confirmRemove.provider + ' key (' + s.confirmRemove.env + '). The raw value is never retrievable once removed -- you would need to paste it in again from wherever you originally got it.',
                destructive: true, confirmLabel: 'remove', busy: s.busy === s.confirmRemove.provider, busyLabel: 'removing…',
                onConfirm: () => removeKey(s.confirmRemove.provider),
                onCancel: () => ctx.set({ confirmRemove: null }),
            }) : null,
        ].filter(Boolean);
    };
});
