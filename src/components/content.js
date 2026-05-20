// Content blocks: Panel, Row, RowLink, Section, Hero, Install, Receipt,
// Changelog, WorksList, WritingList, Manifesto, Kpi, Table, HomeView,
// ProjectView, Form. Pure factories.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Btn, Heading, Lede, Dot } from './shell.js';
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

export function Row({ code, title, sub, meta, active, onClick, key, style, href, kind, cols, leading, trailing, target }) {
    const isLink = kind === 'link' || (href != null && !onClick);
    const cls = 'row' + (active ? ' active' : '') + (cols ? ' row-grid' : '');
    const props = { key, class: cls, style: cols ? `${style ? style + ';' : ''}grid-template-columns:${cols}` : style };
    if (isLink) { props.href = href || '#'; if (target) props.target = target; }
    else if (onClick) { props.onclick = onClick; }
    return h(isLink ? 'a' : 'div', props,
        leading != null ? leading : (code != null ? h('span', { class: 'code' }, code) : null),
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
        actions ? h('div', { class: 'ds-hero-actions', style: 'display:flex;gap:10px;flex-wrap:wrap;margin-top:8px' }, ...(Array.isArray(actions) ? actions : [actions])) : null,
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
                    meta: w.meta + '  ' + (isOpen ? '−' : '+'),
                    active: isOpen,
                    onClick: () => onToggle && onToggle(isOpen ? -1 : i)
                }),
                isOpen ? h('div', { class: 'work-detail', 'data-work-index': String(i) },
                    h('div', { class: 'ds-prose' },
                        h('p', { class: 'ds-work-body' }, w.body)
                    ),
                    h('div', { class: 'ds-work-actions' },
                        Btn({ primary: true, href: w.href || '#', children: 'open ↗' }),
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

export function Table({ headers = [], rows = [], onRowClick, emptyText = 'nothing here yet' }) {
    if (!rows || rows.length === 0) return h('div', { class: 'empty' }, emptyText);
    return h('table', {},
        h('thead', {}, h('tr', {}, ...headers.map((hd, i) => h('th', { key: i }, hd)))),
        h('tbody', {}, ...rows.map((row, i) => h('tr', {
            key: i,
            class: onRowClick ? 'clickable' : '',
            onclick: onRowClick ? () => onRowClick(i) : null
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
                children: currentlyShipping.map((row, i) =>
                    Row({
                        key: i,
                        code: Dot({ tone: row.live ? 'live' : 'idle' }),
                        title: row.title, sub: row.sub, meta: row.meta
                    })
                )
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

export function SearchInput({ value = '', placeholder = 'search…', onInput, onSubmit, name = 'q', key }) {
    return h('input', {
        key,
        type: 'search',
        name,
        class: 'ds-search-input',
        placeholder,
        value,
        oninput: onInput ? (e) => onInput(e.target.value, e) : null,
        onkeydown: onSubmit ? (e) => { if (e.key === 'Enter') onSubmit(e.target.value, e); } : null
    });
}

export function TextField({ label, value = '', type = 'text', placeholder = '', onInput, onChange, name, key, hint, multiline, rows = 4 }) {
    const input = multiline
        ? h('textarea', {
            key: 'i', name, rows, placeholder, value,
            oninput: onInput ? (e) => onInput(e.target.value, e) : null,
            onchange: onChange ? (e) => onChange(e.target.value, e) : null
        })
        : h('input', {
            key: 'i', type, name, placeholder, value,
            oninput: onInput ? (e) => onInput(e.target.value, e) : null,
            onchange: onChange ? (e) => onChange(e.target.value, e) : null
        });
    return h('label', { key, class: 'ds-field' },
        label != null ? h('span', { key: 'l', class: 'ds-field-label' }, label) : null,
        input,
        hint != null ? h('span', { key: 'h', class: 'lede ds-field-hint' }, hint) : null
    );
}

export function Select({ label, value = '', options = [], onChange, name, key, placeholder, hint }) {
    const opts = [];
    if (placeholder != null) opts.push(h('option', { key: '_ph', value: '' }, placeholder));
    for (const o of options) {
        const id = typeof o === 'string' ? o : (o.value != null ? o.value : o.id);
        const lab = typeof o === 'string' ? o : (o.label != null ? o.label : (o.id || o.value));
        opts.push(h('option', { key: 'o-' + id, value: id, selected: id === value }, lab));
    }
    const select = h('select', {
        key: 'i', name, class: 'ds-select',
        onchange: onChange ? (e) => onChange(e.target.value, e) : null
    }, ...opts);
    if (label == null && hint == null) return select;
    return h('label', { key, class: 'ds-field' },
        label != null ? h('span', { key: 'l', class: 'ds-field-label' }, label) : null,
        select,
        hint != null ? h('span', { key: 'h', class: 'lede ds-field-hint' }, hint) : null
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

export function Form({ fields = [], submit = 'submit', onSubmit }) {
    return h('form', { class: 'row-form', onsubmit: (ev) => { ev.preventDefault(); onSubmit && onSubmit(ev); } },
        ...fields.map((f, i) => f.kind === 'textarea'
            ? h('textarea', { key: i, name: f.name, placeholder: f.placeholder || '', rows: f.rows || 4 })
            : h('input', { key: i, name: f.name, type: f.type || 'text', placeholder: f.placeholder || '', value: f.value || '', required: f.required ? 'true' : null })),
        h('button', { type: 'submit', class: 'btn-primary' }, submit));
}
