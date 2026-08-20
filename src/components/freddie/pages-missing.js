// Freddie pages for sidebar routes that don't yet have dedicated page modules.
// Each page is a minimal but functional renderer over the existing /api/* endpoints.
// These fill the gap between sidebar links and the FREDDIE_PAGES registry.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { makePage, api, loadingState, errorState, emptyState } from './runtime.js';
import { Table, PageHeader, TextField } from '../content.js';
import { Btn } from '../shell.js';
import { section, truncSpan, TRUNC_TITLE } from './shared.js';

const h = webjsx.createElement;

export const terminal = makePage((ctx) => {
    async function load() {
        try { ctx.set({ loading: false, list: await api('/api/sessions'), error: null }); }
        catch (e) { ctx.set({ loading: false, error: e }); }
    }
    function openTty(id) {
        try { sessionStorage.setItem('fd_open_session', id); } catch { /* best-effort */ }
        location.hash = '#fd-chat';
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading session ttys…');
        if (s.error && !s.list) return errorState(s.error, load);
        const list = Array.isArray(s.list) ? s.list : [];
        return [
            PageHeader({ title: 'terminal', lede: 'session mux — pick a conversation TTY' }),
            list.length
                ? section('sessions', Table({
                    headers: ['session', 'updated'],
                    rowLabels: list.map(x => x.title || x.id),
                    onRowClick: (i) => list[i] && list[i].id && openTty(list[i].id),
                    rows: list.map(x => [truncSpan(x.title || x.id, TRUNC_TITLE), x.updated_at || x.time || '—']),
                }))
                : emptyState('no sessions — open chat to start a mux'),
        ];
    };
});

export const files = makePage((ctx) => {
    Object.assign(ctx.state, { dir: '', tree: [], preview: null });
    async function load(p) {
        try {
            const q = p ? ('?path=' + encodeURIComponent(p)) : '';
            const data = await api('/api/files/tree' + q);
            ctx.set({ loading: false, dir: data.path, tree: Array.isArray(data.tree) ? data.tree : [], preview: null, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function openFile(filePath) {
        try {
            const data = await api('/api/files/read?path=' + encodeURIComponent(filePath));
            ctx.set({ preview: data });
        } catch (e) { ctx.set({ preview: { error: String(e.message || e) } }); }
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading files…');
        if (s.error && !s.tree.length) return errorState(s.error, () => load(s.dir));
        const parent = s.dir ? s.dir.replace(/[\\/][^\\/]+$/, '') : '';
        return [
            PageHeader({ title: 'files', lede: s.dir || 'file browser' }),
            parent && parent !== s.dir ? section('up', Btn({ children: 'parent', onClick: () => load(parent) })) : null,
            section('tree',
                s.tree.length
                    ? Table({
                        headers: ['name', 'type', 'size'],
                        rowLabels: s.tree.map(f => f.name),
                        onRowClick: (i) => {
                            const f = s.tree[i];
                            if (!f) return;
                            const fp = f.path || (s.dir + '/' + f.name);
                            if (f.type === 'dir' || f.children) load(fp);
                            else openFile(fp);
                        },
                        rows: s.tree.map(f => [f.name || '—', f.type || '—', f.size ?? '—']),
                    })
                    : emptyState('empty directory')),
            s.preview ? section('preview',
                s.preview.error ? errorState(s.preview.error)
                    : h('pre', { class: 'fd-pre' }, s.preview.binary ? '(binary)' : String(s.preview.content || ''))) : null,
        ].filter(Boolean);
    };
});

// ---- auth -----------------------------------------------------------------
// Backend: GET /api/auth — per-provider key status

export const auth = makePage((ctx) => {
    async function load() { try { ctx.set({ loading: false, data: await api('/api/auth').catch(() => null), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading auth…');
        if (s.error && !s.data) return errorState(s.error, load);
        const providers = s.data || [];
        return [
            PageHeader({ title: 'auth', lede: 'API keys & credentials' }),
            providers.length
                ? section('providers', Table({ headers: ['provider', 'status'], rows: providers.map(p => [p.provider || p.key || '—', p.set ? 'configured' : 'not set']) }))
                : emptyState('no providers configured'),
        ];
    };
});

// ---- settings --------------------------------------------------------------
// Backend: GET /api/config — configuration values

export const settings = makePage((ctx) => {
    async function load() { try { ctx.set({ loading: false, data: await api('/api/config').catch(() => null), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading settings…');
        if (s.error && !s.data) return errorState(s.error, load);
        const entries = s.data ? Object.entries(s.data) : [];
        return [
            PageHeader({ title: 'settings', lede: 'configuration' }),
            entries.length
                ? section('config', Table({ headers: ['key', 'value'], rows: entries.map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]) }))
                : emptyState('no config values'),
        ];
    };
});

// ---- theme ----------------------------------------------------------------
// Client-side only: theme preference selector

export const themePage = makePage((ctx) => {
    return () => {
        return [
            PageHeader({ title: 'theme', lede: 'theme preference' }),
            section('current', Table({ headers: ['setting', 'value'], rows: [
                ['theme', (typeof window !== 'undefined' && document.documentElement.getAttribute('data-theme')) || 'github-dark'],
                ['density', (typeof window !== 'undefined' && document.documentElement.getAttribute('data-density')) || 'compact'],
                ['accent', (typeof window !== 'undefined' && document.documentElement.getAttribute('data-accent')) || 'default'],
            ] })),
        ];
    };
});

// ---- worktree --------------------------------------------------------------
// Backend: GET /api/worktree — git worktrees

export const worktree = makePage((ctx) => {
    async function load() { try { ctx.set({ loading: false, data: await api('/api/worktree').catch(() => null), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading worktrees…');
        if (s.error && !s.data) return errorState(s.error, load);
        const trees = Array.isArray(s.data) ? s.data : [];
        return [
            PageHeader({ title: 'worktrees', lede: 'git worktrees' }),
            trees.length
                ? section('worktrees', Table({ headers: ['path', 'branch', 'hash'], rows: trees.map(t => [t.path || '—', t.branch || '—', t.hash || '—']) }))
                : emptyState('no worktrees'),
        ];
    };
});

// ---- session-tree ----------------------------------------------------------
// Backend: GET /api/sessions?tree=1 — session tree

export const sessionTree = makePage((ctx) => {
    async function load() { try { ctx.set({ loading: false, data: await api('/api/sessions?tree=1').catch(() => null), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading session tree…');
        if (s.error && !s.data) return errorState(s.error, load);
        const sessions = Array.isArray(s.data) ? s.data : [];
        return [
            PageHeader({ title: 'session tree', lede: 'session hierarchy' }),
            sessions.length
                ? section('sessions', Table({ headers: ['id', 'title', 'parent'], rows: sessions.slice(0, 20).map(x => [x.id || '—', truncSpan(x.title || x.id, TRUNC_TITLE), x.parent_id || '—']) }))
                : emptyState('no sessions'),
        ];
    };
});

// ---- notifications ---------------------------------------------------------
// Backend: GET /api/notifications — notification list

export const notifications = makePage((ctx) => {
    async function load() { try { ctx.set({ loading: false, data: await api('/api/notifications').catch(() => null), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading notifications…');
        if (s.error && !s.data) return errorState(s.error, load);
        const items = Array.isArray(s.data) ? s.data : [];
        return [
            PageHeader({ title: 'notifications', lede: 'alerts & notices' }),
            items.length
                ? section('notifications', Table({ headers: ['type', 'message', 'time'], rows: items.map(n => [n.type || '—', truncSpan(n.message || '', 100), n.time || '—']) }))
                : emptyState('no notifications'),
        ];
    };
});