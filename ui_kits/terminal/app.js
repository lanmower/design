import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, Side, AppShell, Panel, Heading, Lede, Chip } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const transcript = [
    { kind: 'cmt', text: '# build pipeline · main' },
    { kind: 'cmd', text: 'npm install' },
    { kind: 'out', text: 'added 412 packages in 6.2s' },
    { kind: 'cmd', text: 'npm run build' },
    { kind: 'out', text: '> 247420-design@0.0.79 build' },
    { kind: 'out', text: '> node scripts/build.mjs' },
    { kind: 'out', text: '[247420] css gzip+base64: 18.4kb (raw 96.1kb)' },
    { kind: 'ok',  text: '✓ bundle written to dist/247420.js (84.0 kb)' },
    { kind: 'cmd', text: 'npm test' },
    { kind: 'out', text: '116 assertions, 0 failures' },
    { kind: 'ok',  text: '✓ all tests passed' },
    { kind: 'cmd', text: 'git push' },
    { kind: 'out', text: 'remote: Deploying to gh-pages…' },
    { kind: 'ok',  text: '✓ deploy in 11s' },
    { kind: 'cmt', text: '# session · live tail' },
    { kind: 'log', text: '[14:22:01] GET / 200 18ms' },
    { kind: 'log', text: '[14:22:01] GET /preview/buttons.html 200 7ms' },
    { kind: 'log', text: '[14:22:02] GET /ui_kits/dashboard/ 200 11ms' },
    { kind: 'warn',text: '[14:22:02] GET /favicon.png 404 — strip alternate icon' },
    { kind: 'log', text: '[14:22:03] GET /ui_kits/terminal/ 200 9ms' }
];

const state = { input: '', cwd: '~/dev/design' };

function Line(l, i) {
    if (l.kind === 'cmt')  return h('div', { key: 'l' + i, class: 'cli' }, h('span', { class: 'prompt' }, '#'), h('span', { class: 'cmd', style: 'color:var(--panel-text-3)' }, l.text));
    if (l.kind === 'cmd')  return h('div', { key: 'l' + i, class: 'cli' }, h('span', { class: 'prompt' }, '$'), h('span', { class: 'cmd' }, l.text));
    if (l.kind === 'out')  return h('div', { key: 'l' + i, class: 'cli' }, h('span', { class: 'prompt' }, '·'), h('span', { class: 'cmd', style: 'color:var(--panel-text-2)' }, l.text));
    if (l.kind === 'ok')   return h('div', { key: 'l' + i, class: 'cli' }, h('span', { class: 'prompt', style: 'color:var(--panel-accent)' }, '✓'), h('span', { class: 'cmd', style: 'color:var(--panel-accent)' }, l.text));
    if (l.kind === 'warn') return h('div', { key: 'l' + i, class: 'cli' }, h('span', { class: 'prompt', style: 'color:var(--mascot,#e0a200)' }, '!'), h('span', { class: 'cmd', style: 'color:var(--mascot,#e0a200)' }, l.text));
    if (l.kind === 'log')  return h('div', { key: 'l' + i, class: 'cli' }, h('span', { class: 'prompt', style: 'color:var(--panel-text-3)' }, '·'), h('span', { class: 'cmd', style: 'color:var(--panel-text-2);font-family:var(--ff-mono)' }, l.text));
    return null;
}

function App() {
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'terminal', items: [['index', '../../'], ['dashboard', '../dashboard/']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'terminal' }),
        side: Side({
            sections: [
                { group: 'sessions', items: [
                    { glyph: '◆', label: 'main',     count: 'live', key: 'm' },
                    { glyph: '◇', label: 'build',    count: 'idle', key: 'b' },
                    { glyph: '◇', label: 'deploy',   count: 'idle', key: 'd' }
                ] },
                { group: 'shortcuts', items: [
                    { glyph: '·', label: 'clear (⌘k)',     key: 'c' },
                    { glyph: '·', label: 'paste (⌘v)',     key: 'p' },
                    { glyph: '·', label: 'history (↑)',    key: 'h' }
                ] }
            ]
        }),
        main: [
            h('div', { class: 'ds-section', style: 'padding:8px' },
                Heading({ level: 1, children: 'terminal' }),
                Lede({ children: 'cli surface — prompt + cmd + output rows on a tonal panel. monospace for everything legible by computers, sans for everything legible by humans.' }),
                Panel({
                    title: 'session · ' + state.cwd,
                    count: transcript.length,
                    style: 'margin:8px 0',
                    children: h('div', { style: 'padding:14px 18px;display:flex;flex-direction:column;gap:4px;background:var(--panel-1);border-radius:10px' },
                        ...transcript.map(Line),
                        h('div', { class: 'cli', style: 'margin-top:6px' },
                            h('span', { class: 'prompt' }, '$'),
                            h('input', {
                                value: state.input,
                                placeholder: 'type a command and press enter…',
                                style: 'flex:1;background:transparent;border:0;outline:0;font-family:var(--ff-mono);font-size:13px;color:var(--panel-text)',
                                oninput: (e) => { state.input = e.target.value; },
                                onkeydown: (e) => { if (e.key === 'Enter' && state.input.trim()) { transcript.push({ kind: 'cmd', text: state.input }); transcript.push({ kind: 'out', text: '(stub) ran: ' + state.input }); state.input = ''; kit.render(); } }
                            })
                        )
                    )
                }),
                Panel({ title: 'about this kit', style: 'margin:8px 0', children: h('div', { class: 'ds-pattern-notes' },
                    h('p', {}, '· ', Chip({ tone: 'accent', children: '.cli' }), ' rows pair ', h('code', {}, '.prompt'), ' + ', h('code', {}, '.cmd'), ' — same pattern as the index quickstart.'),
                    h('p', {}, '· five line kinds: ', Chip({ tone: 'dim', children: 'cmt' }), ' ', Chip({ tone: 'dim', children: 'cmd' }), ' ', Chip({ tone: 'dim', children: 'out' }), ' ', Chip({ tone: 'accent', children: 'ok' }), ' ', Chip({ tone: '', children: 'warn' }), '.'),
                    h('p', {}, '· input row appends to the transcript on enter — no separate submit button, terminal-true.')
                ) })
            )
        ],
        status: Status({
            left: ['terminal', '• ' + transcript.length + ' lines', '• live'],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '09 Terminal' });
