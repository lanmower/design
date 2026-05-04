import * as webjsx from '../../vendor/webjsx/index.js';
import { Btn, Heading, Lede } from './shell.js';
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

export function Row({ code, title, sub, meta, active, onClick, key, style }) {
    return h('div', {
        key,
        class: 'row' + (active ? ' active' : ''),
        onclick: onClick,
        style
    },
        code != null ? h('span', { class: 'code' }, code) : null,
        h('span', { class: 'title' }, title, sub ? h('span', { class: 'sub' }, sub) : null),
        meta != null ? h('span', { class: 'meta' }, meta) : null
    );
}

export function RowLink({ code, title, sub, meta, href = '#', key }) {
    return h('a', { key, class: 'row', href },
        code != null ? h('span', { class: 'code' }, code) : null,
        h('span', { class: 'title' }, title, sub ? h('span', { class: 'sub' }, sub) : null),
        meta != null ? h('span', { class: 'meta' }, meta) : null
    );
}

export function Hero({ title, body, accent, badge, badgeCount }) {
    return h('div', { class: 'ds-hero' },
        h('h1', { class: 'ds-hero-title' }, title),
        body ? h('p', { class: 'ds-hero-body' },
            body,
            accent ? h('span', { class: 'ds-hero-accent' }, ' ' + accent) : null
        ) : null,
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
        title: `works · ${String(works.length).padStart(2, '0')} of ~${works.length}`,
        right: h('a', { class: 'ds-link-accent', href: 'https://github.com/AnEntrypoint' }, 'all repos ↗'),
        children: works.map((w, i) => {
            const isOpen = openedIndex === i;
            return h('div', { key: i },
                Row({
                    code: w.code, title: w.title, sub: w.sub,
                    meta: w.meta + '  ' + (isOpen ? '−' : '+'),
                    active: isOpen,
                    onClick: () => onToggle && onToggle(isOpen ? -1 : i)
                }),
                isOpen ? h('div', {
                    class: 'work-detail',
                    'data-work-index': String(i)
                },
                    h('p', { class: 'ds-work-body' }, w.body),
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
            RowLink({ key: i, code: p.date, title: p.title, meta: '§ ' + p.tag, href: p.href || '#' })
        )
    });
}

export function Manifesto({ paragraphs = [], maxWidth = 820 }) {
    return Panel({
        kind: 'manifesto',
        style: `max-width:${maxWidth}px`,
        children: h('div', { class: 'ds-manifesto' },
            ...paragraphs.map((p, i) => h('p', {
                key: i,
                class: 'ds-manifesto-para' + (p.dim ? ' dim' : '')
            }, p.text || p))
        )
    });
}

export function Kpi({ items = [] }) {
    return h('div', { class: 'kpi' }, ...items.map(([n, l]) =>
        h('div', { class: 'kpi-card' },
            h('div', { class: 'num' }, String(n)),
            h('div', { class: 'lbl' }, l))));
}

export function Table({ headers = [], rows = [], onRowClick, emptyText = 'no rows' }) {
    if (!rows || rows.length === 0) {
        return h('div', { class: 'empty' }, emptyText);
    }
    return h('table', {},
        h('thead', {}, h('tr', {}, ...headers.map(hd => h('th', {}, hd)))),
        h('tbody', {}, ...rows.map((row, i) => h('tr', {
            class: onRowClick ? 'clickable' : '',
            onclick: onRowClick ? () => onRowClick(i) : null
        }, ...row.map(c => h('td', {}, c == null ? '' : String(c)))))));
}

export function Section({ title, children }) {
    return h('div', { class: 'ds-section' },
        title ? h('h3', {}, title) : null,
        ...(Array.isArray(children) ? children : [children])
    );
}

export function HomeView({ state, onNav, onToggleWork, works, posts, manifesto, currentlyShipping }) {
    return [
        Hero({
            title: 'the creative department of the internet.',
            body: '247420 is a collective of mercurials. we ship fast, break things on purpose, and document honestly.',
            accent: 'humor is load-bearing.'
        }),
        currentlyShipping ? h('div', { class: 'ds-section' },
            Panel({
                title: 'currently shipping',
                count: currentlyShipping.length,
                kind: 'inline',
                children: currentlyShipping.map((row, i) =>
                    Row({
                        key: i,
                        code: h('span', { class: row.live ? 'ds-dot-live' : 'ds-dot-idle' }, row.live ? '●' : '○'),
                        title: row.title, sub: row.sub, meta: row.meta
                    })
                )
            })
        ) : null,
        Section({ title: '// works', children: WorksList({ works, openedIndex: state.opened, onToggle: onToggleWork }) }),
        Section({ title: '// recent writing', children: WritingList({ posts }) }),
        Section({ title: '// manifesto · rough draft', children: Manifesto({ paragraphs: manifesto }) })
    ];
}

export function ProjectView({ project, copied, onCopy }) {
    return [
        Heading({ level: 1, children: project.name }),
        Lede({ children: project.tagline }),
        Heading({ level: 3, children: 'install' }),
        Install({ cmd: project.install, copied, onCopy }),
        Heading({ level: 3, children: 'receipt' }),
        Receipt({ rows: project.receipt }),
        Heading({ level: 3, children: 'changelog' }),
        Changelog({ entries: project.changelog })
    ];
}
