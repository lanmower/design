import * as webjsx from 'webjsx';
import { mountKit } from 'ds/bootstrap.js';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see ui_kits/aicat/app.js for the measured rationale (200+ serial
// unbundled module requests when every kit pulls the full 30+-submodule
// barrel).
import { AppShell, Topbar, Crumb, Side, Status, Chip, Heading, Lede } from 'ds/components/shell.js';
import { Section, Install, Receipt, Changelog } from 'ds/components/content.js';

const h = webjsx.createElement;
const root = document.getElementById('root');
// `phase` drives the changelog — this page's one remote-fed data surface.
// Toggled from the sidebar so its loading / empty / error readings are
// reachable here rather than only against a live registry.
const state = { copied: false, phase: 'ready' };

// Every entry goes somewhere: `anchor` items scroll to a real section on this
// page, `href` items leave. There used to be a `readme`/`docs` tab pair here
// switching a `state.tab` that nothing downstream branched on — a fake IA
// node — plus a `reference` group pointing at ids that were never rendered.
// Both were removed rather than stubbed with placeholder content; the single
// `main` render below is the only "tab" this page has.
const sideSections = [
    { group: 'project', items: [
        { glyph: '-', label: 'install', anchor: 'install' },
        { glyph: '-', label: 'receipt', anchor: 'receipt' },
        { glyph: '-', label: 'changelog', anchor: 'changelog' }
    ] },
    { group: 'links', items: [
        { glyph: '->', label: 'source', href: 'https://github.com/AnEntrypoint' },
        { glyph: '->', label: 'npm', href: 'https://www.npmjs.com/package/@anentrypoint/mcp-gm' },
        { glyph: '->', label: 'releases', href: 'https://github.com/AnEntrypoint/releases' }
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

// Topbar's nav items are derived from the `project` sideSections group —
// previously this was a second, hand-written `readme`/`docs` list with its
// own `onNav` wiring that could (and did) drift from the sidebar's actual
// entries. One list, one source of truth.
const projectNavItems = sideSections[0].items.map((it) => [it.label, '#' + it.anchor]);

function App() {
    return AppShell({
        topbar: Topbar({
            brand: '247420', leaf: 'gm',
            items: [
                ['<- all projects', '../homepage/'],
                ...projectNavItems,
                ['source', 'https://github.com/AnEntrypoint']
            ]
        }),
        crumb: Crumb({
            trail: ['247420', 'gm'], leaf: 'readme',
            right: [Chip({ tone: 'dim', children: 'shipping' }), Chip({ tone: 'dim', children: 'v0.4.1' })]
        }),
        side: Side({
            sections: [
                ...sideSections.map((sec) => ({
                    group: sec.group,
                    items: sec.items.map((it, i) => ({
                        key: sec.group + i, glyph: it.glyph, label: it.label,
                        href: it.href || '#' + it.anchor
                    }))
                })),
                // Demo switcher for the changelog's states. Marked with a
                // glyph, never the active fill — it is not a location.
                { group: 'release feed', items: PHASES.map((p) => ({
                    glyph: p === state.phase ? '*' : '-',
                    label: p, key: 'ph-' + p, href: '#feed-' + p,
                    onClick: (e) => { e.preventDefault(); state.phase = p; kit.render(); }
                })) }
            ]
        }),
        main: [
            h('div', { class: 'ds-section ds-section-pad' },
                Heading({ level: 1, children: 'gm' }),
                Lede({ children: 'state machine for coding agents. it thinks, so you don\'t have to (as much).' }),
                Section({ id: 'install', title: 'install',
                    children: Install({ cmd: 'npx -y @anentrypoint/mcp-gm', copied: state.copied, onCopy: copyInstall }) }),
                Section({ id: 'receipt', title: 'receipt', children: Receipt({ rows: receiptRows }) }),
                Section({ id: 'changelog', title: 'changelog', children: ChangelogBody() })
            )
        ],
        // Describes this page, not a compiler. The previous left side read
        // "typescript · 0 errors · 0 warnings" — an editor status bar borrowed
        // onto a package readme, reporting on a build that is not running here.
        status: Status({
            left: ['gm', '- releases ' + state.phase],
            right: ['v0.4.1', 'MIT']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '14 Project page' });
