// Freddie dashboard shell — the AppShell/Topbar/Side/Status composition, the
// Ctrl+K command-palette action list, and the nav-side builder that used to
// live inline in freddie's src/web/app.js. Per this repo's own contract (all
// GUI for freddie lives in anentrypoint-design; app.js is bootstrap-only),
// app.js now calls renderDashboardShell()/buildNavPaletteActions() instead of
// composing these components itself.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { AppShell, Topbar, Side, Status, Chip, Icon } from '../shell.js';
import { ThemeToggle } from '../theme-toggle.js';
import * as theme from '../../theme.js';

const h = webjsx.createElement;

// buildNavPaletteActions(routes, { onNavigate }) — the Ctrl+K command
// palette's action list: one "jump to route" entry per sidebar route, plus a
// handful of built-in actions (new chat, open terminal, toggle theme, reload).
export function buildNavPaletteActions(routes, { onNavigate } = {}) {
    const actions = (routes || []).map(r => ({
        id: 'nav-' + r.path,
        label: r.label || r.path,
        icon: r.icon || 'circle',
        group: 'Navigate',
        hint: null,
        action: () => onNavigate(r.path),
    }));
    actions.push(
        { id: 'cmd-new-chat', label: 'New Chat Session', icon: 'forum', group: 'Actions', hint: null, action: () => onNavigate('chat') },
        { id: 'cmd-terminal', label: 'Open Terminal', icon: 'more-horizontal', group: 'Actions', hint: null, action: () => onNavigate('terminal') },
        {
            id: 'cmd-toggle-theme', label: 'Toggle Theme', icon: 'contrast', group: 'Actions', hint: null, action: () => {
                const cur = theme.getTheme();
                const next = cur === 'github-dark' ? 'paper' : (cur === 'paper' ? 'ink' : (cur === 'ink' ? 'auto' : 'github-dark'));
                theme.applyTheme(next);
            },
        },
        { id: 'cmd-refresh', label: 'Refresh Data', icon: 'refresh', group: 'Actions', hint: null, action: () => location.reload() },
    );
    return actions;
}

// renderDashboardSide({ routeGroups, active, onNavigate }) — the sidebar
// nav, grouped per ROUTE_GROUPS, with the current route highlighted.
export function renderDashboardSide({ routeGroups, active, onNavigate }) {
    return Side({
        sections: (routeGroups || []).map(g => ({
            group: g.group,
            items: (g.items || []).map(r => ({
                glyph: Icon ? Icon(r.icon) : null,
                label: r.label,
                href: '#fd-' + r.path,
                active: active === r.path,
                onClick: ev => { ev.preventDefault(); onNavigate(r.path); },
            })),
        })),
    });
}

// renderDashboardShell(opts) — the full page frame: topbar (brand, sampler
// pill, theme toggle, Ctrl+K hint), sidebar, status bar (agent health,
// project, tool/skill counts), wrapping `body`. The chat page composes its
// own WorkspaceShell (rail+sessions+main) for kimi-cli-parity layout —
// wrapping it in another AppShell would nest two app frames, so pass
// `fullBleed: true` there and this returns `body` standalone instead.
export function renderDashboardShell({
    active, body, routeGroups, onNavigate,
    sampler = { ok: 0, bad: 0, total: 0, error: false },
    degraded = false, error = null, project = 'default',
    toolsCount = '—', skillsCount = '—', ts = '', brand = 'freddie',
    fullBleed = false,
}) {
    if (fullBleed) return body;
    const main = h('div', { key: active, class: 'fd-page' }, ...(Array.isArray(body) ? body : [body]));
    const samplerPill = sampler.error
        ? Chip({ tone: 'miss', children: 'sampler err' })
        : sampler.total > 0
            ? Chip({ tone: sampler.bad > 0 ? 'miss' : 'ok', children: 'sampler ' + sampler.ok + '/' + sampler.total })
            : Chip({ tone: 'neutral', children: 'sampler —' });
    // Layout lives in .fd-topbar-leaf (freddie's index.html reset block) — zero inline CSS.
    const leaf = h('span', { class: 'fd-topbar-leaf' }, samplerPill, ThemeToggle ? ThemeToggle({}) : null);
    const topbarItems = [['New Chat', '#fd-chat']];
    const searchHint = h('span', { class: 'fd-search-hint', 'aria-hidden': 'true' }, 'Ctrl+K');
    const healthChip = degraded
        ? Chip({ tone: 'miss', children: 'backend unreachable' })
        : error
            ? Chip({ tone: 'miss', children: 'page error' })
            : Chip({ tone: 'ok', children: 'agent running' });
    const statusLeft = [
        h('span', { class: 'fd-status-item' }, healthChip),
        h('span', { class: 'fd-status-item' }, 'project: ' + project),
        h('span', { class: 'fd-status-item' }, toolsCount + ' tools'),
        h('span', { class: 'fd-status-item' }, skillsCount + ' skills'),
    ];
    return AppShell({
        topbar: Topbar({ brand, leaf, items: topbarItems, active: '', search: searchHint }),
        side: renderDashboardSide({ routeGroups, active, onNavigate }),
        main,
        status: Status({ left: statusLeft, right: [ts] }),
    });
}
