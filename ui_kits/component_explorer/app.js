import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, Side, AppShell, Chip, Btn, Badge } from 'ds/components/shell.js';
import { Panel, Table } from 'ds/components/content.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const manifest = await (await fetch('./manifest.json')).json();
const components = manifest.components;

// Group by source file so the sidebar reads as a real module map, matching
// how the generated docs/component-props.md is already organized -- one
// explorer, one grouping convention, instead of a second taxonomy.
const byFile = new Map();
for (const c of components) {
    if (!byFile.has(c.file)) byFile.set(c.file, []);
    byFile.get(c.file).push(c);
}
const files = [...byFile.keys()].sort();

const state = { q: '', selected: components[0].name };

function matches(c, q) {
    if (!q) return true;
    const hay = (c.name + ' ' + c.file + ' ' + c.description).toLowerCase();
    return hay.includes(q);
}

// Live specimens for the components this session's homepage showcase already
// mounts real instances of (Btn/Chip/Badge/Table) -- proving the props table
// against an actually-rendered component, not just prose. Every other symbol
// still gets its full generated prop table; only the live-render panel is
// conditional on having a known-safe, side-effect-free specimen to mount.
const SPECIMENS = {
    Btn: () => h('div', { class: 'ds-explorer-specimen-row' },
        Btn({ variant: 'primary', children: 'Primary' }),
        Btn({ variant: 'default', children: 'Default' }),
        Btn({ variant: 'ghost', children: 'Ghost' }),
        Btn({ variant: 'danger', children: 'Danger' }),
    ),
    Chip: () => h('div', { class: 'ds-explorer-specimen-row' },
        Chip({ tone: 'green', children: 'Live' }),
        Chip({ tone: 'blue', children: 'Beta' }),
        Chip({ tone: 'purple', children: 'New' }),
    ),
    Badge: () => h('div', { class: 'ds-explorer-specimen-row' },
        Badge({ tone: 'success', children: '0 violations' }),
        Badge({ tone: 'neutral', children: 'draft' }),
    ),
    Table: () => Table({
        headers: ['Kit', 'Status'],
        rows: [['chat', 'shipped'], ['os', 'shipped']],
        compact: true,
    }),
};

function propRow(p) {
    return h('tr', { key: p.name },
        h('td', {}, h('code', {}, p.name + (p.alias ? ' (local: ' + p.alias + ')' : ''))),
        h('td', {}, p.default ? h('code', {}, p.default) : h('span', { class: 'dim' }, '—')),
    );
}

function detailPane(c) {
    const specimen = SPECIMENS[c.name];
    return h('div', { class: 'ds-explorer-detail' },
        h('div', { class: 'ds-explorer-detail-head' },
            h('h2', {}, c.name),
            h('span', { class: 'ds-explorer-detail-file' }, c.file),
        ),
        c.description ? h('p', { class: 'ds-lede' }, c.description) : null,
        specimen ? h('div', { class: 'ds-explorer-live' },
            h('span', { class: 'ds-showcase-label' }, 'Live specimen'),
            specimen(),
        ) : null,
        h('table', { class: 'ds-explorer-props-table' },
            h('thead', {}, h('tr', {}, h('th', {}, 'Prop'), h('th', {}, 'Default'))),
            h('tbody', {}, ...(c.props.length ? c.props.map(propRow) : [
                h('tr', {}, h('td', { colspan: '2', class: 'dim' }, 'no props')),
            ])),
        ),
    );
}

function sideNode(rerender) {
    const groups = files.map((f) => {
        const items = byFile.get(f).filter((c) => matches(c, state.q));
        if (!items.length) return null;
        return {
            group: f,
            items: items.map((c) => ({
                glyph: '',
                label: c.name,
                active: c.name === state.selected,
                onClick: (e) => { e.preventDefault(); state.selected = c.name; rerender(); },
                href: '#' + c.name,
            })),
        };
    }).filter(Boolean);
    return Side({ sections: groups });
}

function view(rerender) {
    const selected = components.find((c) => c.name === state.selected) || components[0];
    const filteredCount = components.filter((c) => matches(c, state.q)).length;
    return AppShell({
        topbar: Topbar({
            brand: '247420', leaf: 'component explorer',
            items: [['back to design', '../../']],
        }),
        crumb: Crumb({ leaf: selected.name, right: h('span', { class: 'dim' }, filteredCount + ' / ' + components.length + ' components') }),
        side: sideNode(rerender),
        main: h('div', { class: 'ds-explorer-main ds-app-surface' },
            h('input', {
                type: 'search', class: 'input ds-explorer-search',
                placeholder: 'search ' + components.length + ' components…',
                value: state.q,
                'aria-label': 'search components',
                oninput: (e) => { state.q = e.target.value.toLowerCase(); rerender(); },
            }),
            Panel({ title: null, children: detailPane(selected) }),
        ),
        status: Status({
            left: ['component explorer', 'buildless'],
            right: [components.length + ' components', 'no bundler'],
        }),
    });
}

let kit;
const rerender = () => kit.schedule();
kit = mountKit({ root, screen: 'component explorer', view: () => view(rerender) });
