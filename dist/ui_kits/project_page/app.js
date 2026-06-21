import * as webjsx from 'webjsx';
const h = webjsx.createElement;

const state = { copied: false, tab: 'readme' };
const root = document.getElementById('root');

const sideSections = [
    { group: 'project', items: [
        ['◆', 'overview', 'readme', true],
        ['§', 'readme', 'readme', false],
        ['§', 'docs', 'docs', false],
        ['§', 'changelog', 'changelog', false]
    ]},
    { group: 'reference', items: [
        ['›', 'executenodejs', 'ref', false],
        ['›', 'executedeno', 'ref', false],
        ['›', 'astgrep_*', 'ref', false],
        ['›', 'batch_execute', 'ref', false]
    ]},
    { group: 'links', items: [
        ['↗', 'source', 'ext', false],
        ['↗', 'npm', 'ext', false],
        ['↗', 'releases', 'ext', false]
    ]}
];

function Topbar() {
    return h('header', { class: 'app-topbar' },
        h('span', { class: 'brand' }, '247420', h('span', { class: 'slash' }, ' / '), 'gm'),
        h('nav', {},
            h('a', { href: '../homepage/' }, '← all projects'),
            h('a', { href: '#', class: state.tab==='readme'?'active':'' , onclick:(e)=>{e.preventDefault();state.tab='readme';render();}}, 'readme'),
            h('a', { href: '#', class: state.tab==='docs'?'active':'' , onclick:(e)=>{e.preventDefault();state.tab='docs';render();}}, 'docs'),
            h('a', { href: '#' }, 'source ↗')
        )
    );
}

function Crumb() {
    return h('div', { class: 'app-crumb' },
        h('span', {}, '247420'), h('span', { class: 'sep' }, '›'),
        h('span', {}, 'gm'), h('span', { class: 'sep' }, '›'),
        h('span', { class: 'leaf' }, state.tab),
        h('span', { style: 'margin-left:auto;display:flex;gap:10px;align-items:center' },
            h('span', { class: 'chip accent' }, '● live'),
            h('span', { class: 'chip dim' }, 'v0.4.1')
        )
    );
}

function Side() {
    return h('aside', { class: 'app-side' }, ...sideSections.flatMap(sec => [
        h('div', { class: 'group', key: sec.group }, sec.group),
        ...sec.items.map(([glyph, label, kind, active], i) =>
            h('a', { key: sec.group + i, href: '#', class: active ? 'active' : '' },
                h('span', { class: 'glyph' }, glyph),
                h('span', {}, label)
            )
        )
    ]));
}

function Overview() {
    return [
        h('h1', {}, 'gm'),
        h('p', { class: 'lede' }, 'state machine for coding agents. it thinks, so you don\'t have to (as much).'),

        h('h3', {}, 'install'),
        Install({ cmd: 'npx -y @anentrypoint/mcp-gm' }),

        h('h3', {}, 'receipt'),
        Receipt({ rows: [
            ['status','live · ships tuesdays'],
            ['stars','3,124'],
            ['license','MIT'],
            ['lang','typescript · deno'],
            ['size','2.1mb'],
            ['deps','0 runtime'],
            ['authors','the collective'],
            ['first commit','2024.09.03']
        ]}),

        h('h3', {}, 'changelog'),
        Changelog({ entries: [
            { date:'2026.04.20', ver:'v0.4.1', msg:'ship it. fixed the thing everyone complained about.' },
            { date:'2026.03.22', ver:'v0.4.0', msg:'new state machine runtime. broke everything on purpose. read the postmortem.' },
            { date:'2026.02.09', ver:'v0.3.7', msg:'astgrep_search is now astgrep_enhanced_search. you will adapt.' },
            { date:'2025.12.11', ver:'v0.3.0', msg:'first public release. gm, world.' }
        ]})
    ];
}

function Install({ cmd }) {
    return h('div', { class: 'cli' },
        h('span', { class: 'prompt' }, '$'),
        h('span', { class: 'cmd' }, cmd),
        h('span', {
            class: 'copy',
            onclick: () => { navigator.clipboard?.writeText(cmd); state.copied = true; render(); setTimeout(() => { state.copied = false; render(); }, 1200); }
        }, state.copied ? 'copied' : 'copy')
    );
}

function Receipt({ rows }) {
    return h('table', { class: 'kv' },
        h('tbody', {}, ...rows.map(([k, v], i) =>
            h('tr', { key: i },
                h('td', {}, k),
                h('td', {}, v)
            )
        ))
    );
}

function Changelog({ entries }) {
    return h('div', { class: 'panel', style: 'max-width:900px' },
        h('div', { class: 'panel-body' }, ...entries.map((e, i) =>
            h('div', { key: i, class: 'row', style: 'grid-template-columns:100px 70px 1fr' },
                h('span', { class: 'code' }, e.date),
                h('span', { style: 'color:var(--panel-accent);font-family:var(--ff-mono);font-size:14px' }, e.ver),
                h('span', { class: 'title' }, e.msg)
            )
        ))
    );
}

function Status() {
    return h('footer', { class: 'app-status' },
        h('span', { class: 'item' }, 'main'),
        h('span', { class: 'item' }, '• typescript'),
        h('span', { class: 'item' }, '• 0 errors'),
        h('span', { class: 'item' }, '• 0 warnings'),
        h('span', { class: 'spread' }),
        h('span', { class: 'item' }, 'v0.4.1'),
        h('span', { class: 'item' }, '• MIT')
    );
}

function App() {
    return h('div', { class: 'app' },
        Topbar(),
        Crumb(),
        h('div', { class: 'app-body' },
            Side(),
            h('main', { class: 'app-main narrow' }, ...Overview())
        ),
        Status()
    );
}

function render() {
    webjsx.applyDiff(root, App());
}
render();
