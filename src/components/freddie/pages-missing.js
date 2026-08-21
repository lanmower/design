// Freddie pages for sidebar routes that don't yet have dedicated page modules.
// Each page is a minimal but functional renderer over the existing /api/* endpoints.
// These fill the gap between sidebar links and the FREDDIE_PAGES registry.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { makePage, api, loadingState, errorState, emptyState, refreshError } from './runtime.js';
import { Table, PageHeader } from '../content.js';
import { Chip, Btn } from '../shell.js';
import { section, truncSpan, TRUNC_TITLE } from './shared.js';

const h = webjsx.createElement;

// ---- terminal ---------------------------------------------------------------
// Backend: GET /api/terminal/status (plugins/gui-terminal) — {available,cwd}
// probe, not a session list; POST /api/terminal/exec is the actual command
// runner, invoked from elsewhere (there is no persisted "session" concept).

export const terminal = makePage((ctx) => {
    // No inner .catch(()=>null) -- a real fetch failure must reach the outer
    // catch and set s.error, or it renders identically to "not available"
    // with the error-state/retry path never firing (dead code otherwise).
    async function load() { try { ctx.set({ loading: false, data: await api('/api/terminal/status'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
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
// absent here); GET /api/files/read?path=... returns a single file's preview
// content. Directory navigation reissues /api/files/tree with the clicked
// path, rather than flattening the whole tree client-side, since deeper
// levels are lazy-loaded server-side and not present in the first response.

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
        // A successful, genuinely-empty/unreadable directory (load() resolved,
        // tree: []) is a different state from the endpoint never having
        // answered (s.error set) — collapsing both into the same message
        // would misreport a real empty result as a failure.
        if (s.error && !s.tree.length) return errorState(s.error, () => load(s.dir));
        const parent = s.dir ? s.dir.replace(/[\\/][^\\/]+$/, '') : '';
        return [
            PageHeader({ title: 'files', lede: s.dir || 'file browser' }),
            // A failure with a still-populated tree (e.g. clicking "parent"
            // at a project root, which the server correctly 400s as outside
            // the allowed sandbox) previously hit neither branch above nor
            // any banner below -- the click silently did nothing. load()
            // never clears s.tree on failure, so the prior listing is still
            // valid to keep showing; surface the error alongside it instead
            // of swallowing it.
            s.error && s.tree.length ? refreshError(s.error) : null,
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
    // No inner .catch(()=>null) -- swallowing it here would render a real
    // fetch failure as "no providers configured", which reads as "you have
    // no API keys" rather than "the request failed".
    async function load() { try { ctx.set({ loading: false, data: await api('/api/auth'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
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
    // No inner .catch(()=>null) -- see the `auth`/`terminal` pages above for why.
    async function load() { try { ctx.set({ loading: false, data: await api('/api/config'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
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
    // No inner .catch(()=>null) -- see the `auth`/`terminal` pages above for why.
    async function load() { try { ctx.set({ loading: false, data: await api('/api/worktree'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
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
// Backend: GET /api/sessions (plugins/gui/gui-sessions/plugin.js) — the
// route ignores any query string entirely and always returns the flat
// listSessions() array (most-recent-first, default limit 50); there is no
// real hierarchy endpoint. `parent_id` is a genuine stored column, so this
// still shows real per-session lineage, but it's a flat recency list with
// that column added, not an actual tree/grouped-by-ancestor view -- the
// (removed) `?tree=1` param did nothing server-side, so drop it rather than
// imply a hierarchy request that was never real.

export const sessionTree = makePage((ctx) => {
    // No inner .catch(()=>null) -- see the `auth`/`terminal` pages above for why.
    async function load() { try { ctx.set({ loading: false, data: await api('/api/sessions'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading sessions…');
        if (s.error && !s.data) return errorState(s.error, load);
        const sessions = Array.isArray(s.data) ? s.data : [];
        return [
            PageHeader({ title: 'session tree', lede: 'recent sessions with parent lineage' }),
            sessions.length
                ? section('sessions', Table({ headers: ['id', 'title', 'parent'], rows: sessions.slice(0, 20).map(x => [x.id || '—', truncSpan(x.title || x.id, TRUNC_TITLE), x.parent_id || '—']) }))
                : emptyState('no sessions'),
        ];
    };
});

// ---- notifications ---------------------------------------------------------
// Backend: GET /api/notifications (plugins/gui-notifications) — array of
// {id,type,message,severity,timestamp,delivered} per NotificationManager.getAll()
// (src/agent/notifications.js), not a {time} field.

export const notifications = makePage((ctx) => {
    // No inner .catch(()=>null) -- see the `auth`/`terminal` pages above for why.
    async function load() { try { ctx.set({ loading: false, data: await api('/api/notifications'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading notifications…');
        if (s.error && !s.data) return errorState(s.error, load);
        const items = Array.isArray(s.data) ? s.data : [];
        return [
            PageHeader({ title: 'notifications', lede: 'alerts & notices' }),
            items.length
                ? section('notifications', Table({ headers: ['type', 'severity', 'message', 'time'], rows: items.map(n => [n.type || '—', n.severity || '—', truncSpan(n.message || '', 100), n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : '—']) }))
                : emptyState('no notifications'),
        ];
    };
});