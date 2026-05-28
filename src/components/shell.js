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

export function Btn({ href, variant = 'default', children, onClick, 'aria-label': ariaLabel, primary, ghost, danger, disabled }) {
    // Support legacy primary/ghost props for backward compatibility, but prefer variant
    const resolvedVariant = variant !== 'default' ? variant : (primary ? 'primary' : (ghost ? 'ghost' : (danger ? 'danger' : 'default')));
    const cls = (resolvedVariant === 'primary' ? 'btn-primary' : (resolvedVariant === 'ghost' ? 'btn-ghost' : (resolvedVariant === 'danger' ? 'btn-primary danger' : 'btn')))
        + (disabled ? ' is-disabled' : '');
    const onclick = (e) => {
        if (disabled) { e.preventDefault(); return; }
        if (onClick) onClick(e);
    };
    const ariaName = ariaLabel || (typeof children === 'string' ? children : undefined);

    // A real navigational href renders an anchor; everything else is an action
    // button and renders a native <button> (correct semantics + keyboard
    // activation for free, no role=button / href="#" scroll-jump hack).
    const isLink = href != null && href !== '' && href !== '#';
    if (isLink) {
        return h('a', {
            class: cls, href,
            'aria-label': ariaName,
            'aria-disabled': disabled ? 'true' : null,
            tabindex: disabled ? '-1' : null,
            onclick
        }, children);
    }
    return h('button', {
        type: 'button', class: cls,
        disabled: disabled ? true : null,
        'aria-label': ariaName,
        onclick
    }, children);
}

export function IconButton({ icon, onClick, title, size = 'base', variant = 'ghost', disabled = false }) {
    const cls = 'ds-icon-btn ds-icon-btn-' + variant + ' ds-icon-btn-' + size + (disabled ? ' is-disabled' : '');
    return h('button', {
        type: 'button',
        class: cls,
        title,
        'aria-label': title,
        disabled: disabled ? true : null,
        onclick: (e) => { if (disabled) { e.preventDefault(); return; } if (onClick) onClick(e); }
    }, Glyph({ children: icon, size }));
}

export function Badge({ children, variant = 'default', tone = 'neutral' }) {
    return h('span', { class: 'ds-badge ds-badge-' + variant + ' tone-' + tone }, children);
}

export function Glyph({ children, color, size = 'base' }) {
    const fontSize = size === 'sm' ? '11px' : (size === 'lg' ? '16px' : '13px');
    const style = `font-size:${fontSize}` + (color ? `;color:${color}` : '');
    return h('span', { class: 'glyph', style }, children);
}

// Monochrome inline-SVG icons (stroke=currentColor) so chrome reads as one
// coherent line-icon set instead of multicolor OS emoji. 16px box, 1.6 stroke.
const ICON_PATHS = {
    mic: '<path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    'mic-off': '<path d="M9 9v2a3 3 0 0 0 4.5 2.6M15 11V6a3 3 0 0 0-5.9-.8"/><path d="M5 11a7 7 0 0 0 11.5 5.4M12 18v3"/><path d="m4 4 16 16"/>',
    speaker: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    'speaker-off': '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m17 9 4 6M21 9l-4 6"/>',
    camera: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
    screen: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    phone: '<path d="M5 4h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    members: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.7"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    paperclip: '<path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0"/><path d="M9 9h.01M15 9h.01"/>',
    'more-horizontal': '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    'arrow-up': '<path d="M12 19V5M5 12l7-7 7 7"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'
};
export function Icon(name, { size = 16 } = {}) {
    const inner = ICON_PATHS[name];
    if (!inner) return h('span', { class: 'glyph', 'aria-hidden': 'true' }, '');
    return h('svg', {
        class: 'ds-icon ds-icon-' + name,
        width: String(size), height: String(size), viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6',
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
        dangerouslySetInnerHTML: { __html: inner }
    });
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
        parts.push(h('span', { key: 's' + i, class: 'sep' }, '/'));
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

// Toggle the mobile sidebar drawer. Pure-DOM because AppShell is stateless
// chrome; the class lives on .app-body and is read by the ≤900px media query.
function toggleSide(open) {
    const body = document.querySelector('.app-body');
    if (!body) return;
    const next = open != null ? open : !body.classList.contains('side-open');
    body.classList.toggle('side-open', next);
    const btn = document.querySelector('.app-side-toggle');
    if (btn) btn.setAttribute('aria-expanded', next ? 'true' : 'false');
}

export function AppShell({ topbar, crumb, side, main, status, narrow } = {}) {
    const hasSide = Boolean(side);
    const sideNode = hasSide ? side : h('aside', { class: 'app-side', 'aria-hidden': 'true' });
    return h('div', { class: 'app' },
        h('a', { href: '#app-main', class: 'skip-link' }, 'skip to main content'),
        hasSide ? h('button', {
            class: 'app-side-toggle', type: 'button',
            'aria-label': 'toggle navigation', 'aria-expanded': 'false', 'aria-controls': 'app-main',
            onclick: () => toggleSide(),
        }, Icon('menu')) : null,
        topbar || null,
        crumb || null,
        h('div', { class: 'app-body' + (hasSide ? '' : ' no-side') },
            h('div', { class: 'app-side-scrim', 'aria-hidden': 'true', onclick: () => toggleSide(false) }),
            h('div', { class: 'app-side-shell', onclick: (e) => { if (e.target.closest('a')) toggleSide(false); } }, sideNode),
            h('main', { class: 'app-main' + (narrow ? ' narrow' : ''), id: 'app-main' }, ...(Array.isArray(main) ? main : [main]))
        ),
        status || null
    );
}

export function Heading({ level = 1, children, style = '', 'aria-level': ariaLevel }) {
    return h('h' + level, { style, 'aria-level': ariaLevel != null ? String(ariaLevel) : null }, children);
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
