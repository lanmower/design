// Freddie capability-catalogue pages, each a thin state wrapper over its own
// dedicated config component: `models` (availability matrix + rebuild),
// `skills`, and `plugins`.

import { makePage, api } from './runtime.js';
import { PageHeader } from '../content.js';
import { ModelsConfig } from '../models-config.js';
import { SkillsConfig } from '../skills-config.js';
import { PluginsConfig } from '../plugins-config.js';

export const models = makePage((ctx) => {
    Object.assign(ctx.state, { rebuilding: false, selectedProviderId: null, selectedModel: null });
    let unmounted = false;
    ctx.onCleanup(() => { unmounted = true; });
    // GET /api/models/availability — the real per-(provider x model x mode)
    // availability matrix (plugins/gui-models-discover), per freddie's AGENTS.md
    // "Model availability matrix" section. 404 with {error,hint} when the
    // matrix file hasn't been built yet — ModelsConfig itself renders that
    // as an empty state with a "build availability matrix" action.
    async function load() {
        try { ctx.set({ loading: false, data: await api('/api/models/availability'), error: null }); }
        catch (e) { ctx.set({ loading: false, data: null, error: (e && e.body) || e }); }
    }
    // POST /api/models/availability/rebuild spawns a DETACHED background
    // process and returns 202 immediately ({ok, pid, jobId}) -- the real
    // probe sweep (every provider x model x mode cell, up to
    // PER_CELL_TIMEOUT_MS=15s each per freddie's AGENTS.md) is still running
    // long after that response lands. Poll the matrix file itself until its
    // timestamp advances past the moment the rebuild was kicked off, rather
    // than declaring done the instant the spawn request is acknowledged.
    async function rebuild() {
        if (ctx.state.rebuilding) return;
        const startedAt = ctx.state.data?.timestamp || null;
        ctx.set({ rebuilding: true, rebuildError: null });
        try {
            await api('/api/models/availability/rebuild', { method: 'POST', body: {} });
            const POLL_MS = 3000, MAX_POLLS = 60; // ~3 minutes ceiling
            let landed = false;
            for (let i = 0; i < MAX_POLLS; i++) {
                await new Promise(r => setTimeout(r, POLL_MS));
                if (unmounted) return;
                let fresh;
                try { fresh = await api('/api/models/availability'); } catch { continue; }
                if (fresh && fresh.timestamp && fresh.timestamp !== startedAt) { ctx.set({ data: fresh, error: null }); landed = true; break; }
            }
            // The poll ceiling elapsing is NOT the same as "nothing happened" --
            // the rebuild is a detached background process that keeps running
            // past this loop's ~3 minute window regardless. Say so explicitly
            // rather than silently reverting the button to idle, which would
            // read as "rebuild had no effect" when it may simply still be
            // running (or may have genuinely failed server-side with nothing
            // for this poll to observe).
            if (!landed) ctx.set({ rebuildError: new Error('still running after 3 min of polling -- the rebuild continues in the background; refresh this page in a bit to check for a newer result') });
        } catch (e) { ctx.set({ rebuildError: e }); }
        if (!unmounted) ctx.set({ rebuilding: false });
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
    // POST /api/skills/:name {enabled} (plugins/gui/gui-skills/plugin.js) is
    // real and implemented, but nothing here ever called it -- the toggle in
    // SkillsConfig's detail pane had no onToggle wired at all.
    async function toggle(skill) {
        ctx.set({ busyName: skill.name });
        try { await api('/api/skills/' + encodeURIComponent(skill.name), { method: 'POST', body: { enabled: skill.enabled === false } }); await load(); }
        catch (e) { ctx.set({ error: e }); }
        ctx.set({ busyName: null });
    }
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
            // POST /api/skills/:name stores {enabled: bool} PER skill (see
            // its handler), not a bare boolean at skillState[name] directly
            // -- reading skillState[sk.name] itself as the flag makes it an
            // object, which is always truthy and never === false, so a
            // disabled skill would always still show as enabled.
            enabled: (skillState[sk.name] && skillState[sk.name].enabled) !== false,
        }));
        return [
            PageHeader({ title: 'skills', lede: mapped.length + ' skills' }),
            SkillsConfig({
                skills: mapped, selected: s.selected, loading: s.loading, error: s.error,
                busyName: s.busyName, query: s.query, onQuery: (q) => ctx.set({ query: q }),
                onSelect: (name) => ctx.set({ selected: s.selected === name ? null : name }),
                onToggle: toggle,
            }),
        ];
    };
});

export const plugins = makePage((ctx) => {
    Object.assign(ctx.state, { selected: null, busyName: null });
    // GET /api/plugins — flat {name,version,surfaces,requires,source,enabled}
    // list, per plugins/gui-plugins-list/plugin.js (distinct from
    // /api/plugin-graph's D3 {nodes,edges} shape built for the dependency
    // visualization, not a flat list UI).
    async function load() { try { ctx.set({ loading: false, list: await api('/api/plugins'), error: null }); } catch (e) { ctx.set({ loading: false, error: e }); } }
    // POST /api/plugins/:name {enabled} (plugins/gui/gui-plugins-list/plugin.js)
    // is real: it drives host.disablePlugin()/host.enablePlugin() (immediate
    // tool/route/hook unregister-or-reregister, persisted via flags.js so a
    // restart honors it) -- same wiring shape as skills' toggle() above.
    async function toggle(plugin) {
        ctx.set({ busyName: plugin.name });
        try { await api('/api/plugins/' + encodeURIComponent(plugin.name), { method: 'POST', body: { enabled: !plugin.enabled } }); await load(); }
        catch (e) { ctx.set({ error: e }); }
        ctx.set({ busyName: null });
    }
    load();
    return () => {
        const s = ctx.state;
        const list = Array.isArray(s.list) ? s.list : (s.list?.plugins || []);
        // list now includes disabled plugins alongside loaded ones (see
        // plugins/gui/gui-plugins-list/plugin.js) so a bare "N loaded" lede
        // would overcount once any plugin is disabled.
        const enabledCount = list.filter((p) => p.enabled).length;
        const lede = enabledCount === list.length ? list.length + ' plugins loaded' : enabledCount + ' of ' + list.length + ' plugins enabled';
        return [
            PageHeader({ title: 'plugins', lede }),
            PluginsConfig({
                plugins: list, selected: s.selected, loading: s.loading, error: s.error,
                busyName: s.busyName,
                onSelect: (name) => ctx.set({ selected: s.selected === name ? null : name }),
                onToggle: toggle,
                onReload: load,
            }),
        ];
    };
});
