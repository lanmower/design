// MentionAutocomplete — dropdown shown above/below the composer while typing
// a trigger char (@user, #channel). Imperative row diffing, same shape as
// CommandPalette's list repaint: only the row list ever repaints on
// selection/query change, never the anchor.
//
// Row shape per for-web's floating/AutoComplete.tsx: an avatar + display
// name for a user match, a hash glyph + name for a channel match, plain
// name for a role match (color swatch via inline style, same convention
// content/avatar.js's avatarContrastFg already uses for hashed identity
// colors elsewhere in this kit).

import * as webjsx from '../../../vendor/webjsx/index.js';
import { avatarInitial } from '../content/avatar.js';
const h = webjsx.createElement;

export function MentionAutocomplete({ open, kind = 'user', matches = [], selection = 0, onSelect, onHover } = {}) {
    if (!open || !Array.isArray(matches) || !matches.length) return null;

    const rowFor = (m, idx) => {
        const active = idx === selection;
        const common = {
            type: 'button', role: 'option',
            id: 'ov-mention-item-' + idx,
            'data-idx': String(idx),
            'aria-selected': active ? 'true' : 'false',
            class: 'ov-mention-item' + (active ? ' is-active' : ''),
            onclick: () => onSelect && onSelect(m, idx),
            onmousemove: () => onHover && onHover(idx),
        };
        if (kind === 'user') {
            const name = m.displayName || m.name || m.username || '';
            const sub = m.username && m.username !== name ? '@' + m.username : null;
            return h('button', common,
                m.avatarUrl
                    ? h('img', { class: 'ov-mention-avatar', src: m.avatarUrl, alt: '' })
                    : h('span', { class: 'ov-mention-avatar ov-mention-avatar-fallback' }, avatarInitial(name)),
                h('span', { class: 'ov-mention-name' }, name),
                sub ? h('span', { class: 'ov-mention-sub' }, sub) : null
            );
        }
        if (kind === 'channel') {
            return h('button', common,
                h('span', { class: 'ov-mention-glyph', 'aria-hidden': 'true' }, '#'),
                h('span', { class: 'ov-mention-name' }, m.name || '')
            );
        }
        if (kind === 'role') {
            return h('button', common,
                h('span', {
                    class: 'ov-mention-swatch', 'aria-hidden': 'true',
                    style: m.colour || m.color ? `background:${m.colour || m.color}` : null,
                }),
                h('span', { class: 'ov-mention-name' }, m.name || '')
            );
        }
        if (kind === 'emoji') {
            return h('button', common,
                h('span', { class: 'ov-mention-glyph', 'aria-hidden': 'true' }, m.codepoint || ''),
                h('span', { class: 'ov-mention-name' }, ':' + (m.shortcode || '') + ':')
            );
        }
        return h('button', common, h('span', { class: 'ov-mention-name' }, m.name || m.label || ''));
    };

    return h('div', { class: 'ov-mention-list', id: 'ov-mention-list', role: 'listbox', 'aria-label': kind + ' suggestions' },
        ...matches.map((m, idx) => rowFor(m, idx))
    );
}
