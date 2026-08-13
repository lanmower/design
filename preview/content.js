// Rendered specimens for the content.js family.
//
// These are the REAL components, imported and rendered — not hand-written
// markup that imitates their output. That distinction is the whole point: a
// hand-copied specimen silently drifts the moment the component changes, and
// then documents something the SDK no longer does. Anything on this page is by
// construction what the component actually emits today.
import * as webjsx from 'webjsx';
import {
    Panel, Row, RowLink, Hero, Marquee, Install, CliBlock, Receipt,
    Changelog, WorksList, WritingList, Manifesto, Section, PageHeader,
    Kpi, Sparkline, BarChart, Table, EventList, Form, Spinner, Skeleton,
    Alert, FilterPills, Avatar,
} from '../src/components/content.js';

const h = webjsx.createElement;
const root = document.getElementById('root');

// Each specimen states what it is, so the page reads as a catalogue rather
// than a wall of anonymous widgets.
function spec(name, note, ...children) {
    return h('section', { key: name },
        h('h2', {}, name),
        note ? h('p', { class: 'spec-note' }, note) : null,
        ...children);
}

const view = () => h('div', { class: 'spec-page' },
    spec('PageHeader', 'Page title + optional lede.',
        PageHeader({ title: 'content primitives', lede: 'every export of content.js, rendered.' })),

    spec('Hero', 'Left-inset single-column lead. badges fill a full-width card below the body.',
        Hero({
            title: 'the creative department of the internet.',
            body: 'ships fast, breaks things on purpose, documents honestly.',
            accent: 'humor is load-bearing.',
            badges: ['35 exports', '1 module', 'live'],
        })),

    spec('Marquee', 'Signature ticker.', Marquee({ items: ['gm', 'zellous', 'spoint', 'flatspace'] })),

    spec('Panel + Row + RowLink', 'Panel is the surface; Row is a static line, RowLink navigates.',
        Panel({
            title: 'rows',
            children: [
                Row({ key: 'a', code: '001', title: 'static row', sub: 'no handler', meta: 'inert' }),
                Row({ key: 'b', code: '002', title: 'clickable row', sub: 'has onClick', meta: 'button',
                    onClick: () => { /* specimen: the affordance is the subject, not the destination */ } }),
                RowLink({ key: 'c', code: '003', title: 'link row', meta: 'anchor', href: './index.html' }),
            ],
        })),

    spec('Section', 'Titled content block with an anchor id.',
        Section({ id: 'spec-section', title: 'a section', children: h('p', {}, 'section body copy.') })),

    spec('Kpi + Sparkline + BarChart', 'The three numeric displays.',
        Panel({ children: [
            Kpi({ key: 'k1', label: 'requests', value: '1.2k', delta: '+4%' }),
            Sparkline({ key: 's1', values: [3, 7, 4, 9, 6, 11, 8] }),
            BarChart({ key: 'b1', items: [{ label: 'a', value: 8 }, { label: 'b', value: 3 }, { label: 'c', value: 5 }] }),
        ] })),

    spec('Table', 'Column-defined data table.',
        Table({
            columns: ['name', 'state', 'age'],
            rows: [['gm', 'live', '2y'], ['zellous', 'live', '3y'], ['thebird', 'wip', '—']],
        })),

    spec('EventList', 'Ranked event rows, with its own loading state.',
        EventList({ items: [
            { rank: 1, title: 'first event', meta: 'now' },
            { rank: 2, title: 'second event', meta: '2m ago' },
        ] })),

    spec('WorksList', 'Disclosure list: clicking a row expands its detail.',
        WorksList({
            works: [
                { code: '001', title: 'gm', sub: 'state machine', meta: '2025', body: 'expands on click.', href: '#', source: '#' },
                { code: '002', title: 'zellous', sub: 'push-to-talk', meta: '2024', body: 'so does this one.', href: '#', source: '#' },
            ],
            openedIndex: 0,
            onToggle: () => { /* specimen: static at index 0 so the open state is visible on load */ },
        })),

    spec('WritingList', 'Dated post rows.',
        WritingList({ posts: [
            { date: '2026.04.14', title: 'we were here first', tag: 'lore', href: './index.html' },
            { date: '2026.03.22', title: 'why state machines', tag: 'gm', href: './index.html' },
        ] })),

    spec('Manifesto', 'Numbered statement paragraphs.',
        Manifesto({ paragraphs: [
            { text: 'ship the rough draft.' },
            { text: 'document honestly.' },
            { text: 'humor is load-bearing.', dim: true },
        ] })),

    spec('Install + CliBlock', 'Copyable command surfaces.',
        Panel({ children: [
            Install({ key: 'i', command: 'npm i anentrypoint-design' }),
            CliBlock({ key: 'c', lines: ['$ gm start', '-> state: idle', '-> tools: 19'] }),
        ] })),

    spec('Receipt + Changelog', 'Key/value receipt and versioned entries.',
        Panel({ children: [
            Receipt({ key: 'r', rows: [['version', '0.0.375'], ['built', 'today'], ['size', '528kb']] }),
            Changelog({ key: 'g', entries: [
                { version: '0.0.375', date: '2026-07-28', items: ['fixed dead controls'] },
                { version: '0.0.374', date: '2026-07-27', items: ['a11y landmarks'] },
            ] }),
        ] })),

    spec('Form', 'Declarative field spec.',
        Form({
            fields: [
                { name: 'project', label: 'project', placeholder: 'gm' },
                { name: 'kind', label: 'kind', type: 'select', options: ['tool', 'site', 'library'] },
            ],
            submit: 'create',
            onSubmit: () => { /* specimen: submit is prevented by Form itself; nothing to post */ },
        })),

    spec('FilterPills', 'Single-select pill row.',
        FilterPills({ options: [{ id: 'all', label: 'all' }, { id: 'live', label: 'live' }, { id: 'wip', label: 'wip' }], selected: 'all',
            onSelect: () => { /* specimen: the resting appearance is the subject */ } })),

    spec('Alert', 'All four tones.',
        Panel({ children: [
            Alert({ key: 'a1', tone: 'info', message: 'informational.' }),
            Alert({ key: 'a2', tone: 'success', message: 'it worked.' }),
            Alert({ key: 'a3', tone: 'warning', message: 'check this.' }),
            Alert({ key: 'a4', tone: 'danger', message: 'it did not work.' }),
        ] })),

    spec('Avatar', 'Initial-derived colour.',
        Panel({ children: [
            Avatar({ key: 'v1', name: 'lanmower' }),
            Avatar({ key: 'v2', name: 'an entrypoint' }),
            Avatar({ key: 'v3', name: 'gm' }),
        ] })),

    spec('Spinner + Skeleton', 'The two loading placeholders.',
        Panel({ children: [Spinner({ key: 'sp' }), Skeleton({ key: 'sk', count: 3 })] })),
);

webjsx.applyDiff(root, view());
