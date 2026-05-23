// Chrome: Topbar, Crumb, Side, Status, AppShell, plus primitives
// (Brand, Chip, Btn, Glyph, Heading, Lede). Pure factories — props in,
// webjsx vnode out. CSS in app-shell.css uses these class names.

import * as webjsx from '../../vendor/webjsx/index.js';
const h = webjsx.createElement;

export function Brand({ name = '247420', leaf } = {}) {
    return h('span', { class: 'brand' }, name,
        leaf ? h('span', { class: 'slash' }, ' / ') : null,
        leaf || null);
}

export function Chip({ tone = '', children }) {
    return h('span', { class: 'chip' + (tone ? ' tone-' + tone : '') }, children);
}

export function Btn({ href = '#', variant = 'default', children, onClick, 'aria-label': ariaLabel, primary, ghost, danger, disabled }) {
    // Support legacy primary/ghost props for backward compatibility, but prefer variant
    const resolvedVariant = variant !== 'default' ? variant : (primary ? 'primary' : (ghost ? 'ghost' : (danger ? 'danger' : 'default')));
    const cls = (resolvedVariant === 'primary' ? 'btn-primary' : (resolvedVariant === 'ghost' ? 'btn-ghost' : (resolvedVariant === 'danger' ? 'btn-primary danger' : 'btn')))
        + (disabled ? ' is-disabled' : '');
    // Anchor with role=button needs explicit Space/Enter activation for keyboard parity with <button>.
    // Browsers fire click on Enter for anchors with href, but Space does nothing — and href="#"
    // synthesizes navigation if onclick doesn't preventDefault.
    const onkeydown = (e) => {
        if (disabled) { e.preventDefault(); return; }
        if (e.key === ' ' || (e.key === 'Enter' && (!href || href === '#'))) {
            e.preventDefault();
            if (onClick) onClick(e);
        }
    };
    const onclick = (e) => {
        if (disabled) { e.preventDefault(); return; }
        if (onClick) onClick(e);
    };
    return h('a', {
        class: cls, href, role: 'button',
        tabindex: disabled ? '-1' : '0',
        'aria-label': ariaLabel || (typeof children === 'string' ? children : undefined),
        'aria-disabled': disabled ? 'true' : null,
        onclick, onkeydown
    }, children);
}

export function Glyph({ children, color }) {
    return h('span', { class: 'glyph', style: color ? `color:${color}` : '' }, children);
}

export function Topbar({ brand = '247420', leaf = '', items = [], active = '', onNav, search } = {}) {
    return h('header', { class: 'app-topbar', role: 'banner' },
        Brand({ name: brand, leaf }),
        search ? h('label', { class: 'app-search' },
            h('span', { class: 'icon', 'aria-hidden': 'true' }, '⌕'),
            h('input', { type: 'search', placeholder: search, 'aria-label': `search ${search}` })
        ) : h('span', {}),
        h('nav', { 'aria-label': 'main navigation' }, ...items.map(([label, href]) => {
            const cleanLabel = String(label).replace(' ↗', '');
            return h('a', {
                key: label,
                href,
                class: active === cleanLabel ? 'active' : '',
                'aria-current': active === cleanLabel ? 'page' : null,
                onclick: (e) => {
                    if (!String(href).startsWith('http') && onNav) {
                        e.preventDefault();
                        onNav(cleanLabel);
                    }
                }
            }, label);
        }))
    );
}

export function Crumb({ trail = [], leaf = '', right } = {}) {
    const parts = [];
    trail.forEach((t, i) => {
        parts.push(h('span', { key: 't' + i }, t));
        parts.push(h('span', { key: 's' + i, class: 'sep' }, '›'));
    });
    parts.push(h('span', { key: 'leaf', class: 'leaf' }, leaf));
    if (right) parts.push(h('span', { key: 'r', class: 'crumb-right' }, ...(Array.isArray(right) ? right : [right])));
    return h('div', { class: 'app-crumb' }, ...parts);
}

export function Side({ sections = [] } = {}) {
    return h('aside', { class: 'app-side', role: 'navigation', 'aria-label': 'sidebar navigation' }, ...sections.flatMap(sec => [
        h('div', { class: 'group', key: sec.group, role: 'heading', 'aria-level': '2' }, sec.group),
        ...sec.items.map((item, i) => {
            const { glyph, label, href = '#', active, count, color, onClick } = item;
            const countLabel = (count != null && count !== 0 && count !== '0') ? ` (${count})` : '';
            return h('a', {
                key: sec.group + i,
                href,
                class: active ? 'active' : '',
                'aria-current': active ? 'page' : null,
                'aria-label': label + countLabel,
                onclick: onClick
            },
                glyph != null ? Glyph({ children: glyph, color }) : h('span', { class: 'glyph', 'aria-hidden': 'true' }),
                h('span', {}, label),
                (count != null && count !== 0 && count !== '0') ? h('span', { class: 'count', 'aria-hidden': 'true' }, String(count)) : null
            );
        })
    ]));
}

export function Status({ left = [], right = [] } = {}) {
    return h('footer', { class: 'app-status', role: 'contentinfo' },
        ...left.map((t, i) => h('span', { key: 'l' + i, class: 'item' }, t)),
        h('span', { class: 'spread', 'aria-hidden': 'true' }),
        ...right.map((t, i) => h('span', { key: 'r' + i, class: 'item' }, t))
    );
}

export function AppShell({ topbar, crumb, side, main, status, narrow } = {}) {
    const hasSide = Boolean(side);
    const sideNode = hasSide ? side : h('aside', { class: 'app-side', 'aria-hidden': 'true' });
    return h('div', { class: 'app' },
        h('a', { href: '#app-main', class: 'skip-link' }, 'skip to main content'),
        topbar || null,
        crumb || null,
        h('div', { class: 'app-body' + (hasSide ? '' : ' no-side') },
            h('div', { class: 'app-side-shell' }, sideNode),
            h('main', { class: 'app-main' + (narrow ? ' narrow' : ''), id: 'app-main' }, ...(Array.isArray(main) ? main : [main]))
        ),
        status || null
    );
}

export function Heading({ level = 1, children, style = '' }) {
    return h('h' + level, { style }, children);
}

export function Lede({ children }) {
    return h('p', { class: 'lede' }, children);
}

export function Dot({ tone = 'on' }) {
    const isOn = tone === 'on' || tone === 'live';
    const cls = isOn ? 'ds-dot-on' : 'ds-dot-off';
    const statusLabel = isOn ? 'on status indicator' : 'off status indicator';
    return h('span', { class: cls, role: 'img', 'aria-label': statusLabel }, isOn ? '●' : '○');
}

export function Rail({ tone = 'green' }) {
    return h('span', { class: 'ds-rail tone-' + tone, 'aria-hidden': 'true' });
}
