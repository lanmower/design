// Freddie configuration pages: `models` (availability matrix + rebuild),
// `skills`, `plugins`, `config` (runtime settings + skin), and `env`
// (provider api keys, write-only, never echoed back).

import * as webjsx from '../../../vendor/webjsx/index.js';
import { makePage, api, loadingState, errorState, emptyState } from './runtime.js';
import { Row, Table, PageHeader, TextField, Select } from '../content.js';
import { Chip, Btn } from '../shell.js';
import { ModelsConfig } from '../models-config.js';
import { SkillsConfig } from '../skills-config.js';
import { PluginsConfig } from '../plugins-config.js';
import { section, noteAlert, liveRegion } from './shared.js';

const h = webjsx.createElement;

export const models = makePage((ctx) => {
    Object.assign(ctx.state, { rebuilding: false, selectedProviderId: null, selectedModel: null });
    // GET /api/models/availability — the real per-(provider x model x mode)
    // availability matrix (plugins/gui-models-discover), per freddie's AGENTS.md
    // "Model availability matrix" section. 404 with {error,hint} when the
    // matrix file hasn't been built yet — ModelsConfig itself renders that
    // as an empty state with a "build availability matrix" action.
    async function load() {
        try { ctx.set({ loading: false, data: await api('/api/models/availability'), error: null }); }
        catch (e) { ctx.set({ loading: false, data: null, error: (e && e.body) || e }); }
    }
    async function rebuild() {
        if (ctx.state.rebuilding) return;
        ctx.set({ rebuilding: true, rebuildError: null });
        try { await api('/api/models/availability/rebuild', { method: 'POST', body: {} }); await load(); }
        catch (e) { ctx.set({ rebuildError: e }); }
        ctx.set({ rebuilding: false });
    }
    load();
    return () => {
        const s = ctx.state;
        return [
            PageHeader({ title: 'models', lede: s.data ? (s.data.summary?.total_models ?? 0) + ' models across ' + (s.data.summary?.total_providers ?? 0) + ' providers' : 'model availability matrix' }),
            ModelsConfig({
                data: s.data, loading: s.loading, error: s.error,
                selectedProviderId: s.selectedProviderId, onSelectProvider: (id) => ctx.set({ selectedProviderId: id, selectedModel: null }),
                selectedModel: s.selectedModel, onSelectModel: (m) => ctx.set({ selectedModel: m }),
                onRefresh: load, onRebuild: rebuild, rebuilding: s.rebuilding, rebuildError: s.rebuildError,
            }),
        ];
    };
});

export const skills = makePage((ctx) => {
    Object.assign(ctx.state, { selected: null, query: '', busyName: null });
    async function load() { try { ctx.set({ loading: false, list: await api('/api/skills'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        // GET /api/skills returns {home:[...], bundled:[...], skillState} —
        // two source lists (user ~/.freddie/skills vs bundled skills/ dirs)
        // plus a per-skill enabled/disabled state map, not a flat array.
        // Concat both sources (home overrides bundled on name collision,
        // matching src/skills/index.js's own findSkill() precedence) and
        // resolve enabled state from skillState (default true when absent).
        const raw = s.list && typeof s.list === 'object' ? s.list : {};
        const rawList = Array.isArray(raw) ? raw : [...(raw.bundled || []), ...(raw.home || [])];
        const skillState = raw.skillState || {};
        const mapped = rawList.map((sk) => ({
            file: sk.file || sk.path || sk.name,
            name: sk.name,
            description: sk.description || (sk.frontmatter && sk.frontmatter.description) || '',
            platforms: sk.platforms || (sk.frontmatter && sk.frontmatter.platforms),
            enabled: skillState[sk.name] !== false,
        }));
        return [
            PageHeader({ title: 'skills', lede: mapped.length + ' skills' }),
            SkillsConfig({
                skills: mapped, selected: s.selected, loading: s.loading, error: s.error,
                busyName: s.busyName, query: s.query, onQuery: (q) => ctx.set({ query: q }),
                onSelect: (name) => ctx.set({ selected: s.selected === name ? null : name }),
            }),
        ];
    };
});

export const plugins = makePage((ctx) => {
    Object.assign(ctx.state, { selected: null });
    // GET /api/plugins — flat {name,version,surfaces,requires,source,enabled}
    // list, per plugins/gui-plugins-list/plugin.js (distinct from
    // /api/plugin-graph's D3 {nodes,edges} shape built for the dependency
    // visualization, not a flat list UI).
    async function load() { try { ctx.set({ loading: false, list: await api('/api/plugins'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        const list = Array.isArray(s.list) ? s.list : (s.list?.plugins || []);
        return [
            PageHeader({ title: 'plugins', lede: list.length + ' plugins loaded' }),
            PluginsConfig({
                plugins: list, selected: s.selected, loading: s.loading, error: s.error,
                onSelect: (name) => ctx.set({ selected: s.selected === name ? null : name }),
                onReload: load,
            }),
        ];
    };
});

export const config = makePage((ctx) => {
    Object.assign(ctx.state, { edited: {}, busy: false, note: null });
    async function load() {
        try {
            const [cfg, skins] = await Promise.all([api('/api/config'), api('/api/skins').catch(() => null)]);
            ctx.set({ loading: false, cfg, skins, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function save() {
        ctx.set({ busy: true, note: null });
        try { await api('/api/config', { method: 'POST', body: ctx.state.edited }); ctx.state.edited = {}; await load(); ctx.set({ note: { kind: 'success', msg: 'saved' } }); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    async function setSkin(name) {
        ctx.set({ busy: true, note: null });
        try { await api('/api/config', { method: 'POST', body: { skin: name } }); await load(); ctx.set({ note: { kind: 'success', msg: 'skin -> ' + name } }); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading config…');
        if (s.error) return errorState(s.error, load);
        const cfg = s.cfg || {};
        const flat = Object.entries(cfg).filter(([, v]) => typeof v !== 'object' || v === null);
        const nested = Object.entries(cfg).filter(([, v]) => typeof v === 'object' && v !== null);
        const skinList = Array.isArray(s.skins) ? s.skins : (s.skins?.skins || s.skins?.available || []);
        const activeSkin = cfg.skin || s.skins?.active || '';
        return [
            PageHeader({ title: 'config', lede: 'runtime configuration' }),
            noteAlert(s.note),
            liveRegion(s.busy ? 'saving configuration' : ''),
            nested.length ? h('div', { class: 'ds-alert ds-alert-info', role: 'note' },
                h('span', { class: 'ds-alert-icon' }, 'i'),
                h('div', { class: 'ds-alert-content' }, nested.length + ' nested config ' + (nested.length === 1 ? 'object is' : 'objects are') + ' read-only here (' + nested.map(([k]) => k).join(', ') + ') — edit via the config file or raw view below.')) : null,
            skinList.length ? section('skin',
                Select({ label: 'active skin', value: activeSkin, options: skinList, onChange: (v) => setSkin(v) })
            ) : null,
            section('settings', flat.length ? flat.map(([k, v], i) =>
                TextField({ key: i, label: k, value: String(ctx.state.edited[k] ?? v ?? ''), onInput: (val) => { ctx.state.edited[k] = val; } })
            ) : emptyState('no scalar config keys')),
            section('raw', h('pre', { class: 'fd-pre' }, JSON.stringify(cfg, null, 2))),
            section('actions',
                Btn({ variant: 'primary', disabled: s.busy || !Object.keys(s.edited).length, children: s.busy ? 'saving…' : 'save changes', onClick: save })),
        ].filter(Boolean);
    };
});

export const env = makePage((ctx) => {
    Object.assign(ctx.state, { auth: null, vars: null, draft: {}, busy: '', note: null });
    async function load() {
        try {
            const [auth, vars] = await Promise.all([api('/api/auth').catch(() => null), api('/api/env').catch(() => null)]);
            ctx.set({ loading: false, auth, vars, error: null });
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
    async function removeKey(provider) {
        ctx.set({ busy: provider, note: null });
        try { await api('/api/auth/' + encodeURIComponent(provider), { method: 'DELETE' }); await load(); ctx.set({ note: { kind: 'success', msg: 'removed ' + provider } }); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: '' });
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
                        (a.set && a.source === 'stored') ? Btn({ variant: 'danger', disabled: s.busy === a.provider, children: 'remove', onClick: () => removeKey(a.provider) }) : null),
                })) : emptyState('no providers')),
            otherRows.length ? section('other environment', Table({ headers: ['key', 'status'], rows: otherRows })) : null,
        ].filter(Boolean);
    };
});
