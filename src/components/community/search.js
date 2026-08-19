// SearchBar / SearchResults — a genuine SDK-completeness surface (neither
// for-web nor design had one). Matches the Material-3-influenced shape
// language established across the community/overlay ports: rounded input,
// subtle dividers, hover highlight rows, --accent-tint highlighted matches.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { Icon } from '../shell.js';
import { avatarInitial, avatarContrastFg } from '../content.js';
const h = webjsx.createElement;

function avatarStyle(color) {
    if (!color) return null;
    const fg = avatarContrastFg(color);
    return fg ? `--avatar-bg:${color};--avatar-fg:${fg}` : `--avatar-bg:${color}`;
}

export function SearchBar({ value = '', placeholder = 'Search…', onChange, onClear, onSubmit, autofocus = false } = {}) {
    return h('form', {
        class: 'cm-search-bar',
        onsubmit: (e) => { e.preventDefault(); onSubmit && onSubmit(value); },
    },
        h('span', { class: 'cm-search-bar-icon' }, Icon('search', { size: 16 })),
        h('input', {
            type: 'search', class: 'cm-search-bar-input', value, placeholder,
            autofocus: autofocus ? true : null, 'aria-label': placeholder,
            oninput: (e) => onChange && onChange(e.target.value),
        }),
        value ? h('button', {
            type: 'button', class: 'cm-search-bar-clear', 'aria-label': 'Clear search',
            onclick: () => onClear && onClear(),
        }, Icon('x', { size: 14 })) : null
    );
}

function highlight(text, query) {
    if (!query) return [text];
    const t = String(text || '');
    const q = String(query);
    const parts = [];
    let i = 0;
    const lowT = t.toLowerCase(), lowQ = q.toLowerCase();
    while (i < t.length) {
        const idx = lowT.indexOf(lowQ, i);
        if (idx < 0 || !lowQ) { parts.push(t.slice(i)); break; }
        if (idx > i) parts.push(t.slice(i, idx));
        parts.push(h('mark', { class: 'cm-search-hit-mark', key: 'm' + idx }, t.slice(idx, idx + q.length)));
        i = idx + q.length;
    }
    return parts;
}

export function SearchResultMessage({ author, avatarColor, text, time, channelName, query, onClick } = {}) {
    return h('button', { type: 'button', class: 'cm-search-result cm-search-result-message', onclick: onClick },
        h('span', { class: 'cm-search-result-avatar', style: avatarStyle(avatarColor) }, avatarInitial(author)),
        h('span', { class: 'cm-search-result-body' },
            h('span', { class: 'cm-search-result-head' },
                h('span', { class: 'cm-search-result-author' }, author),
                channelName ? h('span', { class: 'cm-search-result-channel' }, '#' + channelName) : null,
                time ? h('span', { class: 'cm-search-result-time' }, time) : null
            ),
            h('span', { class: 'cm-search-result-snippet' }, ...highlight(text, query))
        )
    );
}

export function SearchResultEntity({ kind = 'channel', name, icon, color, subtitle, onClick } = {}) {
    return h('button', { type: 'button', class: 'cm-search-result cm-search-result-entity', onclick: onClick },
        h('span', { class: 'cm-search-result-icon', style: color ? `--avatar-bg:${color}` : null },
            icon != null ? icon : Icon(kind === 'user' ? 'user' : kind === 'voice' ? 'speaker' : 'hash', { size: 16 })
        ),
        h('span', { class: 'cm-search-result-body' },
            h('span', { class: 'cm-search-result-author' }, name),
            subtitle ? h('span', { class: 'cm-search-result-snippet' }, subtitle) : null
        )
    );
}

export function SearchResults({ query = '', groups = [], busy = false, emptyText = 'No results' } = {}) {
    const total = groups.reduce((n, g) => n + (g.items ? g.items.length : 0), 0);
    return h('div', { class: 'cm-search-results' },
        busy
            ? h('div', { class: 'cm-search-empty' }, 'Searching…')
            : (total === 0
                ? h('div', { class: 'cm-search-empty' }, query ? emptyText : 'Type to search')
                : groups.map((g, gi) => h('div', { class: 'cm-search-group', key: g.label || gi },
                    g.label ? h('div', { class: 'cm-search-group-title' }, g.label) : null,
                    ...(g.items || []).map((item) => h('div', { key: item.id },
                        item.type === 'message'
                            ? SearchResultMessage({ ...item, query, onClick: item.onClick })
                            : SearchResultEntity({ ...item, onClick: item.onClick })
                    ))
                )))
    );
}
