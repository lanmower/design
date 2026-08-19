// SettingsShell — full-screen two-pane settings surface: a category sidebar
// (grouped sections, active-item highlight) beside a breadcrumb-titled
// content pane, matching stoat for-web's settings/_layout (Sidebar.tsx +
// Content.tsx) shape. SettingsPopover stays the small anchored quick-settings
// popover for a single flat control list; this is for a real multi-category
// settings app where a flat popover would misrepresent the surface.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { Icon } from '../shell.js';
import { trapTab } from './floating.js';
const h = webjsx.createElement;

export function SettingsShell({ title = 'Settings', open, groups = [], activeId, onSelect, onClose, children } = {}) {
    if (!open) return null;
    let rootEl = null;
    const close = () => onClose && onClose();
    const gs = Array.isArray(groups) ? groups : [];

    const itemFor = (item) => {
        const selected = item.id === activeId;
        return h('button', {
            type: 'button',
            class: 'ov-stgs-item' + (selected ? ' is-active' : ''),
            'aria-selected': selected ? 'true' : 'false',
            onclick: () => onSelect && onSelect(item.id),
        },
            item.icon ? h('span', { class: 'ov-stgs-item-icon', 'aria-hidden': 'true' }, Icon(item.icon)) : null,
            h('span', { class: 'ov-stgs-item-label' }, String(item.label || item.id || ''))
        );
    };

    const activeItem = (() => {
        for (const g of gs) {
            const found = (Array.isArray(g.items) ? g.items : []).find(it => it.id === activeId);
            if (found) return found;
        }
        return null;
    })();

    return h('div', {
        class: 'ov-stgs-root', role: 'dialog', 'aria-modal': 'true', 'aria-label': String(title), tabindex: '-1',
        onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); return; } if (rootEl) trapTab(rootEl, e); },
        ref: (el) => { if (el && !el._ovStgs) { el._ovStgs = true; rootEl = el; setTimeout(() => el.focus(), 0); } },
    },
        h('nav', { class: 'ov-stgs-sidebar', 'aria-label': String(title) },
            h('div', { class: 'ov-stgs-sidebar-title' }, String(title)),
            ...gs.map((g, gi) => h('div', { class: 'ov-stgs-group', key: gi },
                g.label ? h('div', { class: 'ov-stgs-group-title' }, String(g.label)) : null,
                ...(Array.isArray(g.items) ? g.items : []).map(itemFor)
            ))
        ),
        h('div', { class: 'ov-stgs-content' },
            h('div', { class: 'ov-stgs-content-head' },
                h('div', { class: 'ov-stgs-crumb' }, activeItem ? String(activeItem.label || activeItem.id) : ''),
                h('button', { type: 'button', class: 'ov-stgs-close', 'aria-label': 'close', onclick: close }, Icon('x'))
            ),
            h('div', { class: 'ov-stgs-content-body' }, children || null)
        )
    );
}
