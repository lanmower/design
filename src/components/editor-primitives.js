// Editor primitives — generic chrome for in-engine editors, inspectors,
// IDEs, debug HUDs. Pure factories, h-based, theme-token driven. All
// visuals route through CSS classes defined in editor-primitives.css;
// no hex/rgba literals appear in this file. Theme switching happens
// via the kit's data-theme attribute on the .ds-247420 scope root.

import * as webjsx from '../../vendor/webjsx/index.js';
const h = webjsx.createElement;

function kids(c) { return c == null ? [] : (Array.isArray(c) ? c : [c]); }

export function Toolbar({ leading = [], trailing = [], dense = false, children } = {}) {
    const cls = 'ds-ep-toolbar' + (dense ? ' dense' : '');
    return h('div', { class: cls, role: 'toolbar' },
        h('div', { class: 'ds-ep-toolbar-leading' }, ...kids(leading)),
        children != null ? h('div', { class: 'ds-ep-toolbar-center' }, ...kids(children)) : null,
        h('div', { class: 'ds-ep-toolbar-trailing' }, ...kids(trailing))
    );
}

export function Tabs({ items = [], active, onChange, children } = {}) {
    return h('div', { class: 'ds-ep-tabs' },
        h('div', { class: 'ds-ep-tabs-head', role: 'tablist' },
            ...items.map((it) => h('button', {
                key: it.id,
                type: 'button',
                class: 'ds-ep-tab' + (it.id === active ? ' active' : ''),
                role: 'tab',
                'aria-selected': it.id === active ? 'true' : 'false',
                onclick: () => onChange && onChange(it.id)
            }, it.label))
        ),
        h('div', { class: 'ds-ep-tabs-body', role: 'tabpanel' }, ...kids(children))
    );
}

export function TreeView({ children } = {}) {
    return h('div', { class: 'ds-ep-tree', role: 'tree' }, ...kids(children));
}

export function TreeItem({ label, glyph, tag, depth = 0, selected = false, expanded = false, onSelect, onToggle, children, hasChildren } = {}) {
    // Support legacy 'hasChildren' prop for future; infer from children param
    const hasKids = hasChildren != null ? hasChildren : (children != null);
    return h('div', {
        class: 'ds-ep-tree-item' + (selected ? ' selected' : ''),
        role: 'treeitem',
        'aria-selected': selected ? 'true' : 'false',
        'aria-expanded': hasKids ? String(!!expanded) : null
    },
        h('div', {
            class: 'ds-ep-tree-row',
            style: 'padding-left:' + (depth * 12 + 6) + 'px',
            onclick: () => onSelect && onSelect()
        },
            h('span', {
                class: 'ds-ep-tree-twist' + (expanded ? ' open' : ''),
                onclick: (e) => { e.stopPropagation(); if (hasKids && onToggle) onToggle(); }
            }, hasKids ? '▸' : ''),
            glyph != null ? h('span', { class: 'ds-ep-tree-glyph' }, glyph) : null,
            h('span', { class: 'ds-ep-tree-label' }, label),
            tag != null ? h('span', { class: 'ds-ep-tree-tag' }, tag) : null
        ),
        hasKids && expanded ? h('div', { class: 'ds-ep-tree-children', role: 'group' }, ...kids(children)) : null
    );
}

export function PropertyGrid({ children } = {}) {
    return h('div', { class: 'ds-ep-propgrid', role: 'group' }, ...kids(children));
}

export function PropertyField({ label, hint, inline = false, children } = {}) {
    return h('label', { class: 'ds-ep-propfield' + (inline ? ' inline' : '') },
        h('span', { class: 'ds-ep-propfield-label' }, label),
        h('span', { class: 'ds-ep-propfield-value' }, ...kids(children)),
        hint != null ? h('span', { class: 'ds-ep-propfield-hint' }, hint) : null
    );
}

export function Dock({ top, left, right, bottom, center } = {}) {
    return h('div', { class: 'ds-ep-dock' },
        top    != null ? h('div', { class: 'ds-ep-dock-top' },    ...kids(top))    : null,
        left   != null ? h('div', { class: 'ds-ep-dock-left' },   ...kids(left))   : null,
        h('div', { class: 'ds-ep-dock-center' }, ...kids(center)),
        right  != null ? h('div', { class: 'ds-ep-dock-right' },  ...kids(right))  : null,
        bottom != null ? h('div', { class: 'ds-ep-dock-bottom' }, ...kids(bottom)) : null
    );
}

export function IconButtonGroup({ items = [], value, onChange, dense = false } = {}) {
    return h('div', { class: 'ds-ep-btngrp' + (dense ? ' dense' : ''), role: 'group' },
        ...items.map((it) => h('button', {
            key: it.id,
            type: 'button',
            class: 'ds-ep-btngrp-btn' + (it.id === value ? ' active' : ''),
            title: it.title || it.label || it.id,
            'aria-pressed': it.id === value ? 'true' : 'false',
            disabled: it.disabled ? 'disabled' : null,
            onclick: () => { if (!it.disabled && onChange) onChange(it.id); }
        }, it.glyph != null ? it.glyph : it.label))
    );
}
