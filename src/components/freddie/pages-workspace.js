// Freddie workspace pages: `sessions` (searchable transcript browser),
// `projects` (isolated-workspace CRUD + activation), and `git` (status /
// diff / log / worktree management for the active project's cwd).

import * as webjsx from '../../../vendor/webjsx/index.js';
import { makePage, api, loadingState, errorState, emptyState, refreshError } from './runtime.js';
import { Row, Table, PageHeader, SearchInput, TextField } from '../content.js';
import { Chip, Btn } from '../shell.js';
import { ChatMessage } from '../chat.js';
import { fmtTime, fmtAgo } from '../sessions.js';
import { GitStatusPanel, GitDiffView } from '../git-status.js';
import { WorktreeSwitcher } from '../worktree-switcher.js';
import { ConfirmDialog } from '../files-modals.js';
import { section, noteAlert, refreshBtn, truncSpan, TRUNC_TITLE, TRUNC_SUB } from './shared.js';

const h = webjsx.createElement;

export const sessions = makePage((ctx) => {
    Object.assign(ctx.state, { q: '', selected: null, messages: [], msgLoading: false });
    async function load() {
        try { ctx.set({ loading: false, list: await api('/api/sessions'), error: null }); }
        catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function search(q) {
        if (!q) return load();
        try {
            const hits = await api('/api/search?q=' + encodeURIComponent(q));
            // GET /api/search (src/sessions.js::search) returns MESSAGE rows
            // {id, session_id, content} -- not session rows. Remap to the
            // session-shaped rows the table below renders and open() below
            // navigates by, so a hit shows its matched text (not a meaningless
            // message-row id masquerading as a title) and clicking it opens
            // the real conversation (session_id) instead of a session id that
            // doesn't exist.
            const list = (Array.isArray(hits) ? hits : []).map(x => ({ id: x.session_id, title: x.content, platform: null, updated_at: null }));
            ctx.set({ loading: false, list, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function refresh() { ctx.set({ refreshing: true }); try { ctx.set({ list: await api('/api/sessions'), error: null }); } catch (e) { ctx.set({ error: e }); } ctx.set({ refreshing: false }); }
    async function open(id) {
        ctx.set({ selected: id, msgLoading: true });
        try { ctx.set({ messages: await api('/api/sessions/' + encodeURIComponent(id) + '/messages'), msgLoading: false }); }
        catch (e) { ctx.set({ messages: [], msgLoading: false, error: e }); }
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading sessions…');
        if (s.error && !s.list) return errorState(s.error, load);
        const list = Array.isArray(s.list) ? s.list : [];
        return [
            PageHeader({ title: 'sessions', lede: list.length + ' sessions', right: refreshBtn(refresh, s.refreshing) }),
            s.error && s.list ? refreshError(s.error) : null,
            SearchInput({ value: s.q, label: 'search sessions', placeholder: 'search messages…', onInput: (v) => { s.q = v; }, onSubmit: (v) => search(v) }),
            section('sessions',
                list.length
                    ? Table({ headers: ['session', 'platform', 'updated'], onRowClick: (i) => open(list[i].id),
                        rowLabels: list.map(x => x.title || x.id),
                        rows: list.map(x => [truncSpan(x.title || x.id, TRUNC_TITLE), x.platform || '—', fmtAgo(x.updated_at)]) })
                    : emptyState('no sessions match')),
            s.selected ? section('messages · ' + s.selected,
                s.msgLoading ? loadingState('loading messages…')
                    : (s.messages || []).length ? (s.messages).map((m, i) => ChatMessage({ role: m.role, text: m.content || m.text || '', time: m.ts ? fmtTime(m.ts) : '', key: i }))
                        : emptyState('no messages')) : null,
        ].filter(Boolean);
    };
});

export const projects = makePage((ctx) => {
    Object.assign(ctx.state, { newName: '', newPath: '', busy: false, note: null, confirmDelete: null });
    async function load() {
        try { ctx.set({ loading: false, data: await api('/api/projects'), error: null }); }
        catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function create() {
        const name = (ctx.state.newName || '').trim();
        const path = (ctx.state.newPath || '').trim();
        if (!name) { ctx.set({ note: { kind: 'warn', msg: 'name required' } }); return; }
        // src/projects.js::createProject hard-requires an absolute path
        // ("name and path are required" / "path must be absolute") -- this
        // field is not actually optional server-side, so fail the same way
        // the backend would rather than let a blank submit round-trip to a
        // generic backend error.
        if (!path) { ctx.set({ note: { kind: 'warn', msg: 'path required (must be an absolute path)' } }); return; }
        ctx.set({ busy: true, note: null });
        try { await api('/api/projects', { method: 'POST', body: { name, path } }); ctx.state.newName = ''; ctx.state.newPath = ''; await load(); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    async function activate(name) { ctx.set({ busy: true }); try { await api('/api/projects/active', { method: 'POST', body: { name } }); await load(); } catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); } ctx.set({ busy: false }); }
    // Removing a project is instant with no undo affordance in this UI (it
    // only drops the registry entry -- src/projects.js::deleteProject does
    // NOT delete the project's files on disk -- but re-adding it later still
    // needs the user to remember/re-enter its real path). Gate behind
    // ConfirmDialog rather than a single click.
    async function del(name) {
        ctx.set({ busy: true });
        try { await api('/api/projects/' + encodeURIComponent(name), { method: 'DELETE' }); await load(); }
        catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false, confirmDelete: null });
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading projects…');
        if (s.error && !s.data) return errorState(s.error, load);
        const d = s.data || {}; const list = d.projects || [];
        const activeName = (d.active && d.active.name) || d.active || 'default';
        return [
            PageHeader({ title: 'projects', lede: 'isolated workspaces · active: ' + activeName }),
            noteAlert(s.note),
            section('projects',
                list.length ? list.map((p, i) => Row({
                    key: i, code: h('span', { class: 'ds-dot ' + (p.name === activeName ? 'ds-dot-on' : 'ds-dot-off'), 'aria-hidden': 'true' }), title: p.name, sub: p.path || '',
                    active: p.name === activeName,
                    trailing: h('span', { class: 'fd-row-actions' },
                        p.name !== activeName ? Btn({ children: 'activate', onClick: () => activate(p.name) }) : Chip({ tone: 'ok', children: 'active' }),
                        p.name !== 'default' ? Btn({ variant: 'danger', children: 'delete', onClick: () => ctx.set({ confirmDelete: p }) }) : null),
                })) : emptyState('no projects')),
            section('new project',
                TextField({ label: 'name', value: s.newName, onInput: (v) => { s.newName = v; }, placeholder: 'my-project' }),
                TextField({ label: 'path (absolute)', value: s.newPath, onInput: (v) => { s.newPath = v; }, placeholder: 'C:/path/to/dir' }),
                Btn({ variant: 'primary', disabled: s.busy, children: s.busy ? 'working…' : 'create', onClick: create })),
            s.confirmDelete ? ConfirmDialog({
                title: 'Remove project?',
                message: 'This removes "' + s.confirmDelete.name + '" from the project list (does not delete its files on disk at ' + (s.confirmDelete.path || '?') + ').',
                destructive: true, confirmLabel: 'remove', busy: s.busy, busyLabel: 'removing…',
                onConfirm: () => del(s.confirmDelete.name),
                onCancel: () => ctx.set({ confirmDelete: null }),
            }) : null,
        ].filter(Boolean);
    };
});

export const git = makePage((ctx) => {
    Object.assign(ctx.state, { cwd: null, status: null, log: null, worktrees: null, diff: null, activeFile: null, diffLoading: false, note: null });
    async function load(explicitCwd) {
        try {
            const proj = await api('/api/projects').catch(() => null);
            const active = proj && proj.active;
            const list = (proj && proj.projects) || [];
            if (explicitCwd) {
                // An explicit switch (WorktreeSwitcher's onSwitch below) must land
                // on THAT cwd or show an error for it -- falling into the
                // multi-candidate fallback below would let "switch worktree"
                // silently redirect to a different project's git state instead of
                // surfacing a real failure for the one the user actually picked.
                const qs = '?cwd=' + encodeURIComponent(explicitCwd);
                const [status, log, worktrees] = await Promise.all([
                    api('/api/git/status' + qs).catch((e) => ({ _err: e })),
                    api('/api/git/log' + qs + '&limit=20').catch((e) => ({ _err: e })),
                    api('/api/worktree' + qs).catch((e) => ({ _err: e })),
                ]);
                ctx.set({ loading: false, cwd: explicitCwd, status, log, worktrees, error: null });
                return;
            }
            const preferred = ctx.state.cwd || (active && typeof active === 'object' ? active.path : null) || '';
            const seen = new Set();
            const candidates = [];
            for (const c of [preferred, ...list.map(p => p.path)]) {
                if (c && !seen.has(c)) { seen.add(c); candidates.push(c); }
            }
            let cwd = preferred, status = { _err: new Error('no git cwd') }, log = status, worktrees = status;
            for (const c of candidates) {
                const qs = '?cwd=' + encodeURIComponent(c);
                const st = await api('/api/git/status' + qs).catch((e) => ({ _err: e }));
                if (!st || st._err) continue;
                cwd = c;
                status = st;
                log = await api('/api/git/log' + qs + '&limit=20').catch((e) => ({ _err: e }));
                worktrees = await api('/api/worktree' + qs).catch((e) => ({ _err: e }));
                break;
            }
            ctx.set({ loading: false, cwd, status, log, worktrees, error: null });
        } catch (e) { ctx.set({ loading: false, error: e }); }
    }
    async function openDiff(file) {
        ctx.set({ activeFile: file.path, diffLoading: true, diff: null });
        try {
            const qs = '?cwd=' + encodeURIComponent(ctx.state.cwd || '') + '&file=' + encodeURIComponent(file.path);
            const res = await api('/api/git/diff' + qs);
            ctx.set({ diff: res, diffLoading: false });
        } catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) }, diffLoading: false }); }
    }
    async function createWorktree() {
        const path = (ctx.state.newWtPath || '').trim();
        const branch = (ctx.state.newWtBranch || '').trim();
        if (!path) { ctx.set({ note: { kind: 'warn', msg: 'path required' } }); return; }
        ctx.set({ busy: true, note: null });
        try {
            await api('/api/worktree', { method: 'POST', body: { cwd: ctx.state.cwd || '', path, branch: branch || undefined } });
            ctx.state.newWtPath = ''; ctx.state.newWtBranch = '';
            await load();
        } catch (e) { ctx.set({ note: { kind: 'error', msg: String(e.message || e) } }); }
        ctx.set({ busy: false });
    }
    load();
    return () => {
        const s = ctx.state;
        if (s.loading) return loadingState('loading git status…');
        if (s.error && !s.status) return errorState(s.error, load);
        const statusFailed = s.status && s.status._err;
        const logFailed = s.log && s.log._err;
        const wtFailed = s.worktrees && s.worktrees._err;
        // GET /api/git/status (plugins/gui/gui-git/handler.js gitStatus)
        // returns {cwd,staged:[{file,status}],unstaged:[{file,status}],
        // untracked:[string,...]} — never a unified .files array. Build the
        // {path,status,staged} shape GitStatusPanel expects, deduping a file
        // that appears in both staged and unstaged into one row (staged wins,
        // since that reflects what would actually be committed).
        const files = statusFailed ? [] : (() => {
            const st = s.status || {};
            const byPath = new Map();
            for (const f of st.staged || []) byPath.set(f.file, { path: f.file, status: f.status, staged: true });
            for (const f of st.unstaged || []) if (!byPath.has(f.file)) byPath.set(f.file, { path: f.file, status: f.status, staged: false });
            for (const p of st.untracked || []) if (!byPath.has(p)) byPath.set(p, { path: p, status: '?', staged: false });
            return [...byPath.values()];
        })();
        const commits = logFailed ? [] : (s.log && s.log.commits) || s.log || [];
        const rawWorktrees = wtFailed ? [] : (s.worktrees && s.worktrees.worktrees) || s.worktrees || [];
        // parseWorktreeList (plugins/gui/gui-worktree/handler.js) names the
        // path field `worktree`, not `path` — WorktreeSwitcher expects
        // {path,branch,current?}, so remap before handing it the list.
        const worktrees = (Array.isArray(rawWorktrees) ? rawWorktrees : []).map(w => ({ path: w.worktree, branch: w.branch, detached: w.detached }));
        const current = (worktrees.find(w => w.path === s.cwd) || {}).path;
        return [
            PageHeader({ title: 'git', lede: s.cwd || 'active project' }),
            noteAlert(s.note),
            statusFailed ? refreshError(statusFailed) : null,
            section('worktrees',
                WorktreeSwitcher({
                    worktrees: Array.isArray(worktrees) ? worktrees : [],
                    current,
                    // No backend "switch active worktree" verb exists (gui-worktree
                    // is list/create/delete only) — switching here means pointing
                    // this page's own git calls at the picked worktree's cwd, the
                    // same client-side cwd override `load()`/`openDiff()` already
                    // thread through every /api/git/* and /api/worktree call.
                    // Clearing activeFile/diff avoids showing a stale diff from the
                    // PREVIOUS worktree while the new one's status is still loading.
                    onSwitch: (wt) => { if (wt && wt.path) { ctx.set({ activeFile: null, diff: null }); load(wt.path); } },
                    onCreate: () => ctx.set({ showWtForm: !s.showWtForm }),
                }),
                s.showWtForm ? h('div', { class: 'fd-row-actions' },
                    TextField({ label: 'path', value: s.newWtPath, onInput: (v) => { s.newWtPath = v; }, placeholder: '/path/to/worktree' }),
                    TextField({ label: 'branch (optional)', value: s.newWtBranch, onInput: (v) => { s.newWtBranch = v; }, placeholder: 'feature/x' }),
                    Btn({ variant: 'primary', disabled: s.busy, children: s.busy ? 'working…' : 'create', onClick: createWorktree })) : null),
            section('changed files',
                statusFailed ? errorState(statusFailed) : GitStatusPanel({ files, onFileClick: openDiff, active: s.activeFile })),
            section('diff' + (s.activeFile ? ' · ' + s.activeFile : ''),
                s.diffLoading ? loadingState('loading diff…')
                    : s.diff ? GitDiffView({ diff: s.diff.diff || s.diff, filename: s.activeFile })
                        : emptyState('select a file to view its diff')),
            section('log',
                logFailed ? errorState(logFailed)
                    : commits.length
                        ? Table({ headers: ['sha', 'message', 'author', 'date'], rows: commits.slice(0, 20).map(c => [String(c.sha || c.hash || '').slice(0, 8), truncSpan(c.message || c.subject, TRUNC_SUB), c.author || '', c.date ? fmtAgo(c.date) : ''])})
                        : emptyState('no commits')),
        ].filter(Boolean);
    };
});
