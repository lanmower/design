// Content blocks: Panel, Row, RowLink, Section, Hero, Install, Receipt,
// Changelog, WorksList, WritingList, Manifesto, Kpi, Table, HomeView,
// ProjectView, Form. Pure factories.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Btn, Heading, Lede, Dot, Icon } from './shell.js';
const h = webjsx.createElement;

export function Panel({ title, count, right, style = '', children, kind }) {
    const cls = 'panel' + (kind ? ' panel-' + kind : '');
    return h('div', { class: cls, style },
        title != null ? h('div', { class: 'panel-head' },
            h('span', {}, title),
            right != null ? right : (count != null ? h('span', {}, String(count)) : null)
        ) : null,
        h('div', { class: 'panel-body' }, ...(Array.isArray(children) ? children : [children]))
    );
}

// Card — semantic alias of Panel; behaves identically.
export const Card = Panel;

export function Row({ code, rank, title, sub, meta, active, state = 'default', onClick, key, style, href, kind, cols, leading, trailing, target, selected, rail }) {
    // `rank` is an alias for `code` (the leading monospace index); callers use
    // either name. `rail` renders a thin colour bar at the row's leading edge as
    // a status indicator (tone: green | purple | flame | <any token>).
    const codeVal = code != null ? code : rank;
    // Support legacy active/selected props for backward compatibility
    const isActive = state === 'active' || (state === 'default' && (active || selected));
    const isLink = kind === 'link' || (href != null && !onClick);
    const isButton = !isLink && !!onClick;
    const stateCls = state === 'disabled' ? ' row-state-disabled' : (state === 'error' ? ' row-state-error' : '');
    const cls = 'row' + (isActive ? ' active' : '') + stateCls + (cols ? ' row-grid' : '') + (rail ? ' rail-' + rail : '');
    const isDisabled = state === 'disabled';
    const props = { key, class: cls, style: cols ? `${style ? style + ';' : ''}grid-template-columns:${cols}` : style };
    if (isLink) {
        props.href = href || '#';
        if (target) props.target = target;
    } else if (isButton && !isDisabled) {
        // Clickable div needs button semantics + keyboard activation for a11y parity.
        // A disabled row is inert: no click, no button role, no tab stop.
        props.onclick = onClick;
        props.role = 'button';
        props.tabindex = '0';
        props.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); }
        };
    }
    if (isDisabled) props['aria-disabled'] = 'true';
    if (isActive && (isLink || isButton)) props['aria-current'] = isActive ? 'page' : null;
    return h(isLink ? 'a' : 'div', props,
        leading != null ? leading : (codeVal != null ? h('span', { class: 'code' }, codeVal) : null),
        h('span', { class: 'title' }, title, sub ? h('span', { class: 'sub' }, sub) : null),
        trailing != null ? trailing : (meta != null ? h('span', { class: 'meta' }, meta) : null));
}

export function RowLink({ code, title, sub, meta, href = '#', key, target }) {
    return Row({ code, title, sub, meta, href, kind: 'link', key, target });
}

export function Section({ title, eyebrow, children }) {
    return h('section', { class: 'ds-section' },
        eyebrow ? h('span', { class: 'eyebrow' }, eyebrow) : null,
        title ? h('h3', {}, title) : null,
        ...(Array.isArray(children) ? children : [children])
    );
}

export function Hero({ eyebrow, title, body, accent, badge, badgeCount, actions }) {
    return h('div', { class: 'ds-hero' },
        eyebrow ? h('span', { class: 'eyebrow' }, eyebrow) : null,
        h('h1', { class: 'ds-hero-title' }, title),
        body ? h('p', { class: 'ds-hero-body' },
            body,
            accent ? h('span', { class: 'ds-hero-accent' }, ' ' + accent) : null
        ) : null,
        actions ? h('div', { class: 'ds-hero-actions' }, ...(Array.isArray(actions) ? actions : [actions])) : null,
        badge ? Panel({ title: badge, count: badgeCount, kind: 'inline', children: [] }) : null
    );
}

export function Install({ cmd, copied, onCopy }) {
    return h('div', { class: 'cli' },
        h('span', { class: 'prompt' }, '$'),
        h('span', { class: 'cmd' }, cmd),
        h('span', { class: 'copy', onclick: () => onCopy && onCopy(cmd) }, copied ? 'copied' : 'copy')
    );
}

export function Receipt({ rows = [] }) {
    return h('table', { class: 'kv' },
        h('tbody', {}, ...rows.map(([k, v], i) =>
            h('tr', { key: i }, h('td', {}, k), h('td', {}, v))
        ))
    );
}

export function Changelog({ entries = [] }) {
    return Panel({
        kind: 'wide',
        children: entries.map((e, i) =>
            h('div', { key: i, class: 'row ds-changelog-row' },
                h('span', { class: 'code' }, e.date),
                h('span', { class: 'ds-changelog-ver' }, e.ver),
                h('span', { class: 'title' }, e.msg)
            )
        )
    });
}

export function WorksList({ works = [], openedIndex = -1, onToggle }) {
    return Panel({
        children: works.map((w, i) => {
            const isOpen = openedIndex === i;
            return h('div', { key: i },
                Row({
                    code: w.code,
                    title: w.title, sub: w.sub,
                    // Expand affordance: a chevron icon (down when open, right when
                    // collapsed) separated from the meta text by a CSS gap, not a
                    // literal +/- with a double-space.
                    meta: h('span', { class: 'ds-works-meta', style: 'display:inline-flex;align-items:center;gap:.4em' },
                        w.meta != null ? h('span', {}, w.meta) : null,
                        Icon(isOpen ? 'chevron-down' : 'chevron-right')),
                    active: isOpen,
                    onClick: () => onToggle && onToggle(isOpen ? -1 : i)
                }),
                isOpen ? h('div', { class: 'work-detail', 'data-work-index': String(i) },
                    h('div', { class: 'ds-prose' },
                        h('p', { class: 'ds-work-body' }, w.body)
                    ),
                    h('div', { class: 'ds-work-actions' },
                        Btn({ primary: true, href: w.href || '#', children: 'open ->' }),
                        Btn({ href: w.source || '#', children: 'source' })
                    )
                ) : null
            );
        })
    });
}

export function WritingList({ posts = [] }) {
    return Panel({
        children: posts.map((p, i) =>
            RowLink({ key: i, code: p.date, title: p.title, meta: p.tag, href: p.href || '#' })
        )
    });
}

export function Manifesto({ paragraphs = [], maxWidth }) {
    return h('div', {
        class: 'ds-prose ds-manifesto',
        'data-max-width': maxWidth ? String(maxWidth) : null
    },
        ...paragraphs.map((p, i) => h('p', {
            key: i,
            class: 'ds-manifesto-para' + (p.dim ? ' dim' : '')
        }, p.text || p))
    );
}

export function Kpi({ items = [] }) {
    return h('div', { class: 'kpi' }, ...items.map(([n, l], i) =>
        h('div', { key: i, class: 'kpi-card' },
            h('div', { class: 'num' }, String(n)),
            h('div', { class: 'lbl' }, l))));
}

export function Table({ headers = [], rows = [], onRowClick, emptyText = 'nothing here yet', rowLabels }) {
    if (!rows || rows.length === 0) return h('div', { class: 'empty' }, emptyText);
    // rowLabels lets callers supply a plain-text label per row when the first
    // cell is a vnode (so the aria-label is meaningful, not the literal 'row').
    const labelFor = (row, i) => {
        if (Array.isArray(rowLabels) && rowLabels[i] != null) return String(rowLabels[i]);
        const c = row[0];
        return c == null ? 'row' : (typeof c === 'object' ? 'row' : String(c));
    };
    // Native <table>/<tr>/<th>/<td> already carry the correct implicit ARIA
    // roles — explicit role="table"/row/columnheader/cell is redundant and only
    // risks overriding native semantics, so it is omitted.
    return h('table', {},
        h('thead', {}, h('tr', {}, ...headers.map((hd, i) => h('th', { key: i, scope: 'col' }, hd)))),
        h('tbody', {}, ...rows.map((row, i) => h('tr', {
            key: i,
            class: onRowClick ? 'clickable' : '',
            onclick: onRowClick ? () => onRowClick(i) : null,
            // Space scrolls by default — preventDefault on Space (and Enter) so
            // keyboard activation matches click without page jump.
            ...(onRowClick ? { tabindex: '0', role: 'button', 'aria-label': 'open ' + labelFor(row, i), onkeydown: (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onRowClick(i); } } } : {})
        }, ...row.map((c, j) => h('td', { key: j }, c == null ? '' : (typeof c === 'object' ? c : String(c))))))));
}

export function HomeView({ state = {}, onNav, onToggleWork, works = [], posts = [], manifesto = [], currentlyShipping } = {}) {
    return [
        Hero({
            eyebrow: 'an entrypoint',
            title: 'Small, weird, useful tools — built in public.',
            body: '247420 is a creative collective of eight, scattered across three timezones. We have been shipping open-source tools for the web since 2018.',
            accent: 'Some become the future. Most don\'t. That\'s the deal.'
        }),
        currentlyShipping ? Section({
            eyebrow: 'currently shipping',
            children: Panel({
                kind: 'wide',
                children: currentlyShipping.map((row, i) => {
                    const dotNode = Dot({ tone: row.live ? 'live' : 'idle' });
                    dotNode.props = { ...dotNode.props, 'aria-label': row.live ? 'live status' : 'idle status' };
                    return Row({
                        key: i,
                        code: dotNode,
                        title: row.title, sub: row.sub, meta: row.meta
                    });
                })
            })
        }) : null,
        works.length ? Section({
            eyebrow: 'works', title: 'Everything else.',
            children: WorksList({ works, openedIndex: state.opened ?? -1, onToggle: onToggleWork })
        }) : null,
        posts.length ? Section({
            eyebrow: 'writing', title: 'When we have something to say.',
            children: WritingList({ posts })
        }) : null,
        manifesto.length ? Section({
            eyebrow: 'who\'s here', title: 'Eight people, three timezones, one ongoing conversation.',
            children: Manifesto({ paragraphs: manifesto })
        }) : null
    ].filter(Boolean);
}

export function ProjectView({ project = {}, copied, onCopy } = {}) {
    return [
        h('div', { class: 'ds-prose' },
            Heading({ level: 1, children: project.name }),
            Lede({ children: project.tagline })
        ),
        project.install ? [
            Heading({ level: 3, children: 'install' }),
            Install({ cmd: project.install, copied, onCopy }),
        ] : null,
        project.receipt ? [
            Heading({ level: 3, children: 'by the numbers' }),
            Receipt({ rows: project.receipt }),
        ] : null,
        project.changelog ? [
            Heading({ level: 3, children: 'recent releases' }),
            Changelog({ entries: project.changelog })
        ] : null
    ].filter(Boolean).flat();
}

export function PageHeader({ title, lede, eyebrow, right }) {
    return h('section', { class: 'ds-section' },
        eyebrow ? h('span', { class: 'eyebrow' }, eyebrow) : null,
        title != null ? h('h1', {}, title) : null,
        lede != null ? h('p', { class: 'lede' }, lede) : null,
        right != null ? h('div', { class: 'ds-page-header-right' }, ...(Array.isArray(right) ? right : [right])) : null
    );
}

export function SearchInput({ value = '', placeholder = 'search…', onInput, onSubmit, name = 'q', key, label }) {
    return h('input', {
        key,
        type: 'search',
        name,
        class: 'ds-search-input',
        placeholder,
        'aria-label': label || placeholder,
        value,
        oninput: onInput ? (e) => onInput(e.target.value, e) : null,
        onkeydown: onSubmit ? (e) => { if (e.key === 'Enter') onSubmit(e.target.value, e); } : null
    });
}

export function TextField({ label, value = '', type = 'text', placeholder = '', onInput, onChange, name, key, hint, multiline, rows = 4, maxLength, min, max, 'aria-label': ariaLabel }) {
    const input = multiline
        ? h('textarea', {
            key: 'i', name, rows, placeholder, value,
            maxlength: maxLength != null ? maxLength : null,
            'aria-label': ariaLabel || null,
            oninput: onInput ? (e) => onInput(e.target.value, e) : null,
            onchange: onChange ? (e) => onChange(e.target.value, e) : null
        })
        : h('input', {
            key: 'i', type, name, placeholder, value,
            maxlength: maxLength != null ? maxLength : null,
            min: min != null ? String(min) : null,
            max: max != null ? String(max) : null,
            'aria-label': ariaLabel || null,
            oninput: onInput ? (e) => onInput(e.target.value, e) : null,
            onchange: onChange ? (e) => onChange(e.target.value, e) : null
        });
    return h('label', { key, class: 'ds-field' },
        label != null ? h('span', { key: 'l', class: 'ds-field-label' }, label) : null,
        input,
        maxLength != null ? h('span', { key: 'c', class: 'ds-field-count' }, String(value.length) + '/' + maxLength) : null,
        hint != null ? h('span', { key: 'h', class: 'ds-field-hint' }, hint) : null
    );
}

export function Select({ label, value = '', options = [], onChange, name, key, placeholder, hint, title, 'aria-label': ariaLabel }) {
    const opts = [];
    if (placeholder != null) opts.push(h('option', { key: '_ph', value: '', disabled: true, selected: value === '' || value == null }, placeholder));
    for (const o of options) {
        const id = typeof o === 'string' ? o : (o.value != null ? o.value : o.id);
        const lab = typeof o === 'string' ? o : (o.label != null ? o.label : (o.id || o.value));
        opts.push(h('option', { key: 'o-' + id, value: id, selected: id === value }, lab));
    }
    const select = h('select', {
        key: 'i', name, class: 'ds-select',
        // Guarantee an accessible name even when rendered without a visible label.
        'aria-label': ariaLabel || (label == null ? (title || placeholder || name) : null),
        title,
        onchange: onChange ? (e) => onChange(e.target.value, e) : null
    }, ...opts);
    if (label == null && hint == null) return select;
    return h('label', { key, class: 'ds-field' },
        label != null ? h('span', { key: 'l', class: 'ds-field-label' }, label) : null,
        select,
        hint != null ? h('span', { key: 'h', class: 'ds-field-hint' }, hint) : null
    );
}

export function EventList({ items, events, emptyText = 'no events', rankPad = 3 }) {
    const list = items || events || [];
    if (!list.length) return h('p', { class: 'lede' }, emptyText);
    return h('section', { class: 'ds-section ds-event-list' },
        ...list.map((it, i) => Row({
            key: it.key || ('ev' + i),
            code: it.code != null ? it.code : (it.rank != null ? it.rank : String(i + 1).padStart(rankPad, '0')),
            title: it.title || '(empty)',
            sub: it.sub || '',
            active: it.active,
            onClick: it.onClick,
            kind: it.kind
        }))
    );
}

export function Form({ fields = [], submit = 'submit', onSubmit, columns = 1 }) {
    const cols = columns > 1 ? String(columns) : null;
    return h('form', { class: 'row-form', 'data-columns': cols, onsubmit: (ev) => { ev.preventDefault(); onSubmit && onSubmit(ev); } },
        ...fields.map((f, i) => {
            // Each control gets a stable id and an associated <label> so the
            // placeholder is no longer the only (inaccessible) name. The label
            // text falls back to label -> placeholder -> name.
            const fieldId = 'ds-form-' + (f.name || 'field') + '-' + i;
            const labelText = f.label != null ? f.label : (f.placeholder || f.name || '');
            const control = f.kind === 'textarea'
                ? h('textarea', { key: 'i', id: fieldId, name: f.name, placeholder: f.placeholder || '', rows: f.rows || 4, required: f.required ? true : null })
                : h('input', { key: 'i', id: fieldId, name: f.name, type: f.type || 'text', placeholder: f.placeholder || '', value: f.value || '', required: f.required ? true : null });
            return h('label', { key: i, class: 'ds-field', for: fieldId },
                labelText !== '' ? h('span', { key: 'l', class: 'ds-field-label' }, labelText) : null,
                control);
        }),
        h('button', { type: 'submit', class: 'btn-primary' }, submit));
}

export function Spinner({ size = 'base', tone = 'accent', label = 'loading', key } = {}) {
    const SIZE_CLASS = { xs: 'ds-spinner-xs', sm: 'ds-spinner-sm', base: '', lg: 'ds-spinner-lg', xl: 'ds-spinner-xl' };
    const sizeClass = SIZE_CLASS[size] != null ? SIZE_CLASS[size] : '';
    return h('div', {
        key, class: 'ds-spinner ' + sizeClass + ' tone-' + tone,
        role: 'status', 'aria-live': 'polite', 'aria-label': label
    },
        h('span', { key: '1', 'aria-hidden': 'true' }),
        h('span', { key: '2', 'aria-hidden': 'true' }),
        h('span', { key: '3', 'aria-hidden': 'true' })
    );
}

// Clamp a caller-supplied CSS length to a sane range so a raw prop like
// height="9999px" can't blow out the layout. Accepts a CSS length string
// (px/em/rem/%/vh/vw) or a bare number (treated as px); rejects anything else
// back to the default. Numeric values are clamped to [2, 600] (px-equivalent).
function clampLen(v, fallback) {
    if (v == null) return fallback;
    const s = String(v).trim();
    const m = /^(\d+(?:\.\d+)?)(px|em|rem|%|vh|vw)?$/.exec(s);
    if (!m) return fallback;
    const unit = m[2] || 'px';
    let n = parseFloat(m[1]);
    if (unit === '%' || unit === 'vh' || unit === 'vw') n = Math.min(100, Math.max(0, n));
    else n = Math.min(600, Math.max(2, n));
    return n + unit;
}

export function Skeleton({ height = '1em', width = '100%', count = 1, label = 'loading content', key } = {}) {
    const h_ = clampLen(height, '1em');
    const w_ = clampLen(width, '100%');
    return h('div', {
        key, class: 'ds-skeleton-group',
        role: 'status', 'aria-busy': 'true', 'aria-label': label
    },
        ...Array(count).fill(0).map((_, i) =>
            h('div', { key: String(i), class: 'ds-skeleton', style: `height:${h_};width:${w_};`, 'aria-hidden': 'true' })
        )
    );
}

export function Alert({ kind = 'info', children, onDismiss, title, key } = {}) {
    const icons = { info: 'info', success: 'check', warn: 'warn', error: 'x' };
    const cls = 'ds-alert ds-alert-' + kind;
    return h('div', { key, class: cls, role: 'alert' },
        h('span', { key: 'icon', class: 'ds-alert-icon' }, Icon(icons[kind] || 'info')),
        h('div', { key: 'content', class: 'ds-alert-content' },
            title ? h('div', { key: 'title', class: 'ds-alert-title' }, title) : null,
            h('div', { key: 'msg', class: 'ds-alert-message' }, ...(Array.isArray(children) ? children : [children]))
        ),
        onDismiss ? h('button', { key: 'dismiss', class: 'ds-alert-dismiss', 'aria-label': 'dismiss', onclick: onDismiss }, Icon('x')) : null
    );
}
