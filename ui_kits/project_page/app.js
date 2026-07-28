import * as webjsx from 'webjsx';
import { mountKit } from 'ds/bootstrap.js';
import {
    AppShell, Topbar, Crumb, Side, Status, Chip,
    Heading, Lede, Section, Install, Receipt, Changelog
} from 'ds/components.js';

const h = webjsx.createElement;
const root = document.getElementById('root');
// `phase` drives the changelog — this page's one remote-fed data surface.
// Toggled from the sidebar so its loading / empty / error readings are
// reachable here rather than only against a live registry.
const state = { copied: false, tab: 'readme', phase: 'ready' };

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

const PHASES = ['ready', 'loading', 'empty', 'error'];

// Release-row shimmer. Reuses .ds-event-row-skeleton + .ds-skel*
// (app-shell/files.css) — a Changelog entry is the same date / message /
// version rhythm the primitive was cut for.
function ChangelogSkeleton() {
    return h('div', {},
        ...Array.from({ length: 4 }, (_, i) => h('div', { key: 'sk' + i, class: 'ds-event-row-skeleton' },
            h('span', { class: 'ds-skel ds-skel-rank' }),
            h('span', { class: 'ds-skel ds-skel-title' }),
            h('span', { class: 'ds-skel ds-skel-meta' })
        ))
    );
}

function ChangelogEmpty() {
    return h('div', { class: 'ds-empty-state' },
        h('div', { class: 'ds-empty-state-glyph' }, '[ ]'),
        h('p', { class: 'ds-empty-state-msg' }, 'no releases tagged yet'),
        h('p', { class: 'ds-empty-state-hint' }, 'every tagged build shows up here with its date and notes. tag a commit and the first entry appears on the next publish.')
    );
}

function ChangelogError() {
    return h('div', { class: 'ds-alert ds-alert-error' },
        h('span', { class: 'ds-alert-icon' }, '!'),
        h('div', { class: 'ds-alert-content' },
            h('div', { class: 'ds-alert-title' }, 'release feed rate-limited'),
            h('div', { class: 'ds-alert-message' }, 'the registry capped this page at 60 requests an hour and the window resets in about 4 minutes. the install command and receipt above are cached and still accurate.'),
            h('div', { class: 'ds-alert-retry' },
                h('button', { class: 'btn', onclick: () => { state.phase = 'ready'; kit.render(); } }, 'retry now')
            )
        )
    );
}

function ChangelogBody() {
    if (state.phase === 'loading') return ChangelogSkeleton();
    if (state.phase === 'error') return ChangelogError();
    if (state.phase === 'empty') return ChangelogEmpty();
    return Changelog({ entries: changelog });
}

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
            sections: [
                ...sideSections.map((sec) => ({
                    group: sec.group,
                    items: sec.items.map((it, i) => ({
                        key: sec.group + i, glyph: it.glyph, label: it.label,
                        active: !!it.active,
                        href: '#' + (it.tab || it.label),
                        onClick: it.tab ? (e) => { e.preventDefault(); state.tab = it.tab; kit.render(); } : null
                    }))
                })),
                // Reachable state switcher for the changelog section.
                { group: 'release feed', items: PHASES.map((p) => ({
                    glyph: p === state.phase ? '*' : '-',
                    label: p, key: 'ph-' + p, active: state.phase === p, href: '#' + p,
                    onClick: (e) => { e.preventDefault(); state.phase = p; kit.render(); }
                })) }
            ]
        }),
        main: [
            h('div', { class: 'ds-section ds-section-pad' },
                Heading({ level: 1, children: 'gm' }),
                Lede({ children: 'state machine for coding agents. it thinks, so you don\'t have to (as much).' }),
                Section({ title: 'install',
                    children: Install({ cmd: 'npx -y @anentrypoint/mcp-gm', copied: state.copied, onCopy: copyInstall }) }),
                Section({ title: 'receipt', children: Receipt({ rows: receiptRows }) }),
                Section({ title: 'changelog', children: ChangelogBody() })
            )
        ],
        status: Status({
            left: ['main', 'typescript', '0 errors', '0 warnings'],
            right: ['v0.4.1', 'MIT']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '14 Project page' });
