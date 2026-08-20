// renderDashboardShell / buildNavPaletteActions / openCommandPalette —
// the freddie dashboard's top-level chrome composition. This is the single
// place a "freddie-shaped" host (routeGroups + a sampler/health status bar +
// a Cmd+K palette) is assembled from the generic Topbar/Side/Status/AppShell
// primitives in ./shell.js — freddie's own src/web/app.js is a thin mount
// that calls this and nothing else, per AGENTS.md's "no inline components"
// rule for that consumer.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Topbar, Side, Status, AppShell, Chip, Icon } from './shell.js';
import { CommandPalette } from './overlay-primitives.js';

const h = webjsx.createElement;

// ---- renderDashboardShell --------------------------------------------------
//
// renderDashboardShell({
//   active,        // current route path (e.g. 'chat')
//   body,          // already-rendered page vnode/array for <main>
//   routeGroups,   // [{ group, items: [{ path, label, icon }] }]
//   onNavigate,    // (path) => void
//   sampler,       // { ok, bad, total, error }
//   degraded,      // bool — backend boot had failures
//   error,         // string|null — last page-load error (page body already
//                  // shows its own errorState; this surfaces a small status
//                  // chip so a passing glance at the status bar still shows it)
//   project,       // active project name
//   toolsCount, skillsCount, // integers for the status bar
//   ts,            // last-refreshed timestamp string
//   fullBleed,     // bool — chat wants edge-to-edge, no shell padding
// })
//
// Chat is the one page that needs the full available height/width with no
// shell chrome padding around it (its own internal thread scroll owns the
// scrollbar) — every other page scrolls inside the shell's normal padded
// .app-main. `fullBleed` threads straight through to AppShell's own prop
// (see app-shell.js) rather than this module reimplementing layout.
export function renderDashboardShell({
    active = 'home', body = null, routeGroups = [], onNavigate,
    sampler = { ok: 0, bad: 0, total: 0, error: false },
    degraded = false, error = null,
    project = 'default', toolsCount = 0, skillsCount = 0, ts = '',
    fullBleed = false,
} = {}) {
    const navigate = (path) => { if (onNavigate) onNavigate(path); };

    const sections = routeGroups.map((g) => ({
        group: g.group,
        items: (g.items || []).map((item) => ({
            glyph: item.icon ? Icon(item.icon, { size: 15 }) : null,
            label: item.label || item.path,
            href: '#fd-' + item.path,
            active: item.path === active,
            onClick: (e) => { e.preventDefault(); navigate(item.path); },
        })),
    }));

    const topbar = Topbar({ brand: 'freddie', leaf: project });

    const samplerChip = sampler && sampler.total
        ? Chip({ tone: sampler.bad ? 'warn' : 'ok', children: sampler.ok + '/' + sampler.total + ' models' })
        : null;
    const degradedChip = degraded
        ? Chip({ tone: 'error', children: 'backend degraded' })
        : null;
    const errorChip = error
        ? Chip({ tone: 'error', children: 'page error' })
        : null;

    const status = Status({
        left: [
            h('span', {}, project),
            h('span', { class: 'dim' }, toolsCount + ' tools · ' + skillsCount + ' skills'),
        ].filter(Boolean),
        right: [samplerChip, degradedChip, errorChip, ts ? h('span', { class: 'dim' }, ts) : null].filter(Boolean),
    });

    return AppShell({
        topbar,
        side: Side({ sections }),
        main: body,
        status,
        fullBleed,
    });
}

// ---- buildNavPaletteActions -------------------------------------------------
//
// buildNavPaletteActions(routes, { onNavigate }) -> palette items
// routes: flat [{ path, label, icon }] (freddie's ROUTES = ROUTE_GROUPS.flatMap(...))
export function buildNavPaletteActions(routes = [], { onNavigate } = {}) {
    return routes.map((r) => ({
        id: 'nav-' + r.path,
        label: r.label || r.path,
        group: 'navigate',
        icon: r.icon ? Icon(r.icon, { size: 14 }) : null,
        run: () => { if (onNavigate) onNavigate(r.path); },
    }));
}

// ---- openCommandPalette / closeCommandPalette ------------------------------
//
// Imperative singleton mount over the CommandPalette component, mirroring
// the toast() pattern in editor-primitives/toast.js: one host element
// lazily appended to <body>, applyDiff'd in place rather than requiring the
// consumer to own palette open/closed state in their own render loop.
let _paletteHost = null;
function ensurePaletteHost() {
    if (typeof document === 'undefined') return null;
    if (_paletteHost && document.body.contains(_paletteHost)) return _paletteHost;
    _paletteHost = document.createElement('div');
    _paletteHost.className = 'ds-command-palette-host';
    document.body.appendChild(_paletteHost);
    return _paletteHost;
}

export function closeCommandPalette() {
    const host = ensurePaletteHost();
    if (host) webjsx.applyDiff(host, null);
}

// openCommandPalette({ actions, onSelect })
//   actions: palette items — [{ id, label, group?, icon?, hint?, run? }]
//   onSelect(item): optional override; default behavior calls item.run()
export function openCommandPalette({ actions = [], onSelect } = {}) {
    const host = ensurePaletteHost();
    if (!host) return;
    const handleSelect = (item) => {
        closeCommandPalette();
        if (onSelect) onSelect(item);
        else if (item && typeof item.run === 'function') item.run();
    };
    webjsx.applyDiff(host, CommandPalette({
        open: true, items: actions,
        onSelect: handleSelect,
        onClose: closeCommandPalette,
    }));
}
