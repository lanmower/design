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

export function Btn({ href = '#', primary, ghost, children, onClick }) {
    const cls = primary ? 'btn-primary' : (ghost ? 'btn-ghost' : 'btn');
    return h('a', { class: cls, href, onclick: onClick }, children);
}

export function Glyph({ children, color }) {
    return h('span', { class: 'glyph', style: color ? `color:${color}` : '' }, children);
}

export function Topbar({ brand = '247420', leaf = '', items = [], active = '', onNav, search } = {}) {
    return h('header', { class: 'app-topbar' },
        Brand({ name: brand, leaf }),
        search ? h('label', { class: 'app-search' },
            h('span', { class: 'icon' }, '⌕'),
            h('input', { type: 'search', placeholder: search, 'aria-label': 'search' })
        ) : h('span', {}),
        h('nav', {}, ...items.map(([label, href]) =>
            h('a', {
                key: label,
                href,
                class: active === String(label).replace(' ↗', '') ? 'active' : '',
                onclick: (e) => {
                    if (!String(href).startsWith('http') && onNav) {
                        e.preventDefault();
                        onNav(String(label).replace(' ↗', ''));
                    }
                }
            }, label)
        ))
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
    return h('aside', { class: 'app-side' }, ...sections.flatMap(sec => [
        h('div', { class: 'group', key: sec.group }, sec.group),
        ...sec.items.map((item, i) => {
            const { glyph, label, href = '#', active, count, color, onClick } = item;
            return h('a', {
                key: sec.group + i,
                href,
                class: active ? 'active' : '',
                onclick: onClick
            },
                glyph != null ? Glyph({ children: glyph, color }) : h('span', { class: 'glyph' }),
                h('span', {}, label),
                (count != null && count !== 0 && count !== '0') ? h('span', { class: 'count' }, String(count)) : null
            );
        })
    ]));
}

export function Status({ left = [], right = [] } = {}) {
    return h('footer', { class: 'app-status' },
        ...left.map((t, i) => h('span', { key: 'l' + i, class: 'item' }, t)),
        h('span', { class: 'spread' }),
        ...right.map((t, i) => h('span', { key: 'r' + i, class: 'item' }, t))
    );
}

export function AppShell({ topbar, crumb, side, main, status, narrow } = {}) {
    const hasSide = Boolean(side);
    const sideNode = hasSide ? side : h('aside', { class: 'app-side', 'aria-hidden': 'true' });
    return h('div', { class: 'app' },
        topbar || null,
        crumb || null,
        h('div', { class: 'app-body' + (hasSide ? '' : ' no-side') },
            h('div', { class: 'app-side-shell' }, sideNode),
            h('main', { class: 'app-main' + (narrow ? ' narrow' : '') }, ...(Array.isArray(main) ? main : [main]))
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

export function Dot({ tone = 'live' }) {
    const cls = tone === 'live' ? 'ds-dot-live' : 'ds-dot-idle';
    return h('span', { class: cls }, tone === 'live' ? '●' : '○');
}

export function Rail({ tone = 'green' }) {
    return h('span', { class: 'ds-rail tone-' + tone, 'aria-hidden': 'true' });
}
