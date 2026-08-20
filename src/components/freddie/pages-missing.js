// Freddie pages for sidebar routes that don't yet have dedicated page modules.
// Each page is a minimal but functional renderer over the existing /api/* endpoints.
// These fill the gap between sidebar links and the FREDDIE_PAGES registry.

import { makePage, api, loadingState, errorState, emptyState } from './runtime.js';
import { Table, PageHeader, Kpi } from '../content.js';
import { Chip } from '../shell.js';
import { section, truncSpan, TRUNC_TITLE } from './shared.js';

// ---- terminal ---------------------------------------------------------------
// Backend: GET /api/terminal/status (plugins/gui-terminal) — {available,cwd}
// probe, not a session list; POST /api/terminal/exec is the actual command
// runner, invoked from elsewhere (there is no persisted "session" concept).

export const terminal = makePage((ctx) => {
    async function load() { try { ctx.set({ loading: false, data: await api('/api/terminal/status').catch(() => null), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading terminal…');
        if (s.error && !s.data) return errorState(s.error, load);
        const d = s.data || {};
        return [
            PageHeader({ title: 'terminal', lede: 'terminal status', right: d.available ? Chip({ tone: 'ok', children: 'available' }) : Chip({ tone: 'neutral', children: 'unavailable' }) }),
            d.available
                ? section('status', Table({ headers: ['field', 'value'], rows: [['cwd', d.cwd || '—'], ['exec endpoint', 'POST /api/terminal/exec']] }))
                : emptyState('terminal endpoint not available'),
        ];
    };
});

// ---- files ----------------------------------------------------------------
// Backend: GET /api/files/tree?path=... (plugins/gui-files) — returns a
// nested {path, tree:[{name,type,size,modified,children?}]} tree (first
// level auto-expanded; deeper levels are lazy-loaded server-side and simply
// absent here), not a flat file list.

function flattenFileTree(entries, prefix = '') {
    const rows = [];
    for (const e of entries || []) {
        const rel = prefix ? prefix + '/' + e.name : e.name;
        rows.push([rel, e.type === 'dir' ? '—' : (e.size ?? '—'), e.type || '—']);
        if (e.children) rows.push(...flattenFileTree(e.children, rel));
    }
    return rows;
}

export const files = makePage((ctx) => {
    async function load() { try { ctx.set({ loading: false, data: await api('/api/files/tree').catch(() => null), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading files…');
        if (s.error && !s.data) return errorState(s.error, load);
        const tree = (s.data && s.data.tree) || [];
        const rows = flattenFileTree(tree);
        return [
            PageHeader({ title: 'files', lede: (s.data && s.data.path) || 'file browser' }),
            rows.length ? section('files', Table({ headers: ['path', 'size', 'type'], rows })) : emptyState('files endpoint not available'),
        ];
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
// Backend: GET /api/worktree (plugins/gui/gui-worktree) — {cwd, worktrees:
// [{worktree,head,branch,bare?,detached?}]}, per handler.js parseWorktreeList
// (git worktree list --porcelain field names, not path/hash).

export const worktree = makePage((ctx) => {
    async function load() { try { ctx.set({ loading: false, data: await api('/api/worktree').catch(() => null), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading worktrees…');
        if (s.error && !s.data) return errorState(s.error, load);
        const trees = (s.data && Array.isArray(s.data.worktrees)) ? s.data.worktrees : [];
        return [
            PageHeader({ title: 'worktrees', lede: (s.data && s.data.cwd) || 'git worktrees' }),
            trees.length
                ? section('worktrees', Table({ headers: ['path', 'branch', 'head'], rows: trees.map(t => [t.worktree || '—', t.branch || (t.detached ? '(detached)' : '—'), (t.head || '').slice(0, 8) || '—']) }))
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