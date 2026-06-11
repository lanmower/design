import * as webjsx from 'webjsx';
import { mountKit } from 'ds/bootstrap.js';
import {
    AppShell, Topbar, Crumb, Side, Status, Chip,
    Heading, Lede, Section, Install, Receipt, Changelog
} from 'ds/components.js';

const h = webjsx.createElement;
const root = document.getElementById('root');
const state = { copied: false, tab: 'readme' };

const sideSections = [
    { group: 'project', items: [
        { glyph: '*', label: 'overview', tab: 'readme', active: true },
        { glyph: '//', label: 'readme', tab: 'readme' },
        { glyph: '//', label: 'docs', tab: 'docs' },
        { glyph: '//', label: 'changelog', tab: 'readme' }
    ] },
    { group: 'reference', items: [
        { glyph: '>', label: 'executenodejs' },
        { glyph: '>', label: 'executedeno' },
        { glyph: '>', label: 'astgrep_*' },
        { glyph: '>', label: 'batch_execute' }
    ] },
    { group: 'links', items: [
        { glyph: '->', label: 'source' },
        { glyph: '->', label: 'npm' },
        { glyph: '->', label: 'releases' }
    ] }
];

const receiptRows = [
    ['status', 'live · ships tuesdays'],
    ['stars', '3,124'],
    ['license', 'MIT'],
    ['lang', 'typescript · deno'],
    ['size', '2.1mb'],
    ['deps', '0 runtime'],
    ['authors', 'the collective'],
    ['first commit', '2024.09.03']
];

const changelog = [
    { date: '2026.04.20', ver: 'v0.4.1', msg: 'ship it. fixed the thing everyone complained about.' },
    { date: '2026.03.22', ver: 'v0.4.0', msg: 'new state machine runtime. broke everything on purpose. read the postmortem.' },
    { date: '2026.02.09', ver: 'v0.3.7', msg: 'astgrep_search is now astgrep_enhanced_search. you will adapt.' },
    { date: '2025.12.11', ver: 'v0.3.0', msg: 'first public release. gm, world.' }
];

function copyInstall(cmd) {
    navigator.clipboard?.writeText(cmd);
    state.copied = true; kit.render();
    setTimeout(() => { state.copied = false; kit.render(); }, 1200);
}

function App() {
    return AppShell({
        topbar: Topbar({
            brand: '247420', leaf: 'gm',
            items: [
                ['<- all projects', '../homepage/'],
                ['readme', '#readme'],
                ['docs', '#docs'],
                ['source ->', 'https://github.com/AnEntrypoint']
            ],
            active: state.tab,
            onNav: (label) => { if (label === 'readme' || label === 'docs') { state.tab = label; kit.render(); } }
        }),
        crumb: Crumb({
            trail: ['247420', 'gm'], leaf: state.tab,
            right: [Chip({ tone: 'dim', children: 'shipping' }), Chip({ tone: 'dim', children: 'v0.4.1' })]
        }),
        side: Side({
            sections: sideSections.map((sec) => ({
                group: sec.group,
                items: sec.items.map((it, i) => ({
                    key: sec.group + i, glyph: it.glyph, label: it.label,
                    active: !!it.active,
                    href: '#' + (it.tab || it.label),
                    onClick: it.tab ? (e) => { e.preventDefault(); state.tab = it.tab; kit.render(); } : null
                }))
            }))
        }),
        main: [
            Heading({ level: 1, children: 'gm' }),
            Lede({ children: 'state machine for coding agents. it thinks, so you don\'t have to (as much).' }),
            Section({ title: 'install',
                children: Install({ cmd: 'npx -y @anentrypoint/mcp-gm', copied: state.copied, onCopy: copyInstall }) }),
            Section({ title: 'receipt', children: Receipt({ rows: receiptRows }) }),
            Section({ title: 'changelog', children: Changelog({ entries: changelog }) })
        ],
        status: Status({
            left: ['main', 'typescript', '0 errors', '0 warnings'],
            right: ['v0.4.1', 'MIT']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '14 Project page' });
