import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, Side, AppShell, Panel, Heading, Lede, Chip, ThemeToggle } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

// Live terminal — instant output, no fake reveal animation. This is the
// usable surface; anything typed appears immediately, anything emitted by
// the (stubbed) backend appears immediately.
const liveTranscript = [
    { kind: 'cmt', text: '# live session · ~/dev/design' },
    { kind: 'cmd', text: 'echo "ready"' },
    { kind: 'out', text: 'ready' }
];
const live = { input: '', cwd: '~/dev/design' };

// Demo loop — decorative showcase of the .cli row primitives playing back
// a build-pipeline transcript. Clearly separated from the live terminal.
// Honors prefers-reduced-motion: when the user opts out of motion we just
// show the full transcript statically.
const demoScript = [
    { d: 0,    kind: 'cmt', text: '# build pipeline · main' },
    { d: 280,  kind: 'cmd', text: 'npm install' },
    { d: 600,  kind: 'out', text: 'added 412 packages in 6.2s' },
    { d: 220,  kind: 'cmd', text: 'npm run build' },
    { d: 180,  kind: 'out', text: '> 247420-design build' },
    { d: 180,  kind: 'out', text: '[247420] css gzip+base64: 18.4kb (raw 96.1kb)' },
    { d: 220,  kind: 'ok',  text: 'bundle written to dist/247420.js (84.0 kb)' },
    { d: 280,  kind: 'cmd', text: 'npm test' },
    { d: 500,  kind: 'out', text: '116 assertions, 0 failures' },
    { d: 200,  kind: 'ok',  text: 'all tests passed' },
    { d: 320,  kind: 'cmd', text: 'git push' },
    { d: 240,  kind: 'out', text: 'remote: Deploying to gh-pages…' },
    { d: 900,  kind: 'ok',  text: 'deploy in 11s' }
];
const reduced = typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
const demo = { visible: reduced ? demoScript.slice() : [], looping: !reduced };

function Line(l, i, opts = {}) {
    const cursor = opts.cursor;
    const baseChildren = (prompt, text, promptStyle, textStyle) => [
        h('span', { class: 'prompt', style: promptStyle || '' }, prompt),
        h('span', { class: 'cmd', style: textStyle || '' }, text),
        cursor ? h('span', { class: 'cursor-blink' }, '') : null
    ];
    if (l.kind === 'cmt')  return h('div', { key: 'l' + i, class: 'cli' }, ...baseChildren('#', l.text, '', 'color:var(--fg-3)'));
    if (l.kind === 'cmd')  return h('div', { key: 'l' + i, class: 'cli' }, ...baseChildren('$', l.text));
    if (l.kind === 'out')  return h('div', { key: 'l' + i, class: 'cli' }, ...baseChildren('·', l.text, '', 'color:var(--fg-2)'));
    if (l.kind === 'ok')   return h('div', { key: 'l' + i, class: 'cli' }, ...baseChildren('✓', l.text, 'color:var(--accent)', 'color:var(--accent)'));
    if (l.kind === 'warn') return h('div', { key: 'l' + i, class: 'cli' }, ...baseChildren('!', l.text, 'color:var(--mascot)', 'color:var(--mascot)'));
    if (l.kind === 'log')  return h('div', { key: 'l' + i, class: 'cli' }, ...baseChildren('·', l.text, 'color:var(--fg-3)', 'color:var(--fg-2);font-family:var(--ff-mono)'));
    return null;
}

function App() {
    return AppShell({
        topbar: Topbar({
            brand: '247420',
            leaf: 'terminal',
            items: [['index', '../../'], ['dashboard', '../dashboard/']]
        }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'terminal' }),
        side: Side({
            sections: [
                { group: 'sessions', items: [
                    { glyph: '◆', label: 'live',     count: 'on', key: 'l' },
                    { glyph: '◇', label: 'demo loop', count: demo.looping ? 'play' : 'still', key: 'd' }
                ] },
                { group: 'shortcuts', items: [
                    { glyph: '·', label: 'clear (⌘k)',  key: 'c' },
                    { glyph: '·', label: 'history (↑)', key: 'h' }
                ] }
            ]
        }),
        main: [
            h('div', { class: 'ds-section', style: 'padding:8px' },
                h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap' },
                    h('div', {}, Heading({ level: 1, children: 'terminal' })),
                    ThemeToggle()
                ),
                Lede({ children: 'two surfaces — a live shell (instant, no fake reveal) and a decorative demo loop that plays the .cli row primitives. respects prefers-reduced-motion.' }),

                // Live terminal — usable, no reveal delays.
                Panel({
                    title: 'live · ' + live.cwd,
                    count: liveTranscript.length,
                    style: 'margin:8px 0',
                    children: h('div', { style: 'padding:14px 18px;display:flex;flex-direction:column;gap:4px;background:var(--bg-2);border-radius:10px' },
                        ...liveTranscript.map((l, i) => Line(l, i)),
                        h('div', { class: 'cli', style: 'margin-top:6px' },
                            h('span', { class: 'prompt' }, '$'),
                            h('input', {
                                value: live.input,
                                placeholder: 'type a command and press enter…',
                                style: 'flex:1;background:transparent;border:0;outline:0;font-family:var(--ff-mono);font-size:13px;color:var(--fg)',
                                oninput: (e) => { live.input = e.target.value; },
                                onkeydown: (e) => {
                                    if (e.key === 'Enter' && live.input.trim()) {
                                        liveTranscript.push({ kind: 'cmd', text: live.input });
                                        liveTranscript.push({ kind: 'out', text: '(stub) ran: ' + live.input });
                                        live.input = '';
                                        kit.render();
                                    }
                                }
                            })
                        )
                    )
                }),

                // Demo loop — decorative showcase only.
                Panel({
                    title: 'demo · build pipeline',
                    count: demo.visible.length + '/' + demoScript.length,
                    style: 'margin:8px 0',
                    children: h('div', { style: 'padding:14px 18px;display:flex;flex-direction:column;gap:4px;background:var(--bg-2);border-radius:10px;min-height:280px' },
                        ...demo.visible.map((l, i) => Line(l, i, { cursor: i === demo.visible.length - 1 && demo.looping }))
                    )
                }),

                Panel({ title: 'about this kit', style: 'margin:8px 0', children: h('div', { class: 'ds-pattern-notes' },
                    h('p', {}, '· ', Chip({ tone: 'accent', children: '.cli' }), ' rows pair ', h('code', {}, '.prompt'), ' + ', h('code', {}, '.cmd'), '.'),
                    h('p', {}, '· six line kinds: ', Chip({ tone: 'dim', children: 'cmt' }), ' ', Chip({ tone: 'dim', children: 'cmd' }), ' ', Chip({ tone: 'dim', children: 'out' }), ' ', Chip({ tone: 'accent', children: 'ok' }), ' ', Chip({ tone: '', children: 'warn' }), ' ', Chip({ tone: 'dim', children: 'log' }), '.'),
                    h('p', {}, '· live panel is instant; demo panel reveals lines on a loop for the showcase only — never fake-animate output a user is waiting on.')
                ) })
            )
        ],
        status: Status({
            left: ['terminal', '• live ' + liveTranscript.length + ' lines', demo.looping ? '• demo playing' : '• demo still'],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '09 Terminal' });

// Demo loop animation. Stays off when prefers-reduced-motion is on.
if (demo.looping) {
    let i = 0;
    function tick() {
        if (i >= demoScript.length) {
            setTimeout(() => { demo.visible = []; i = 0; kit.render(); tick(); }, 2500);
            return;
        }
        const step = demoScript[i++];
        setTimeout(() => { demo.visible.push(step); kit.render(); tick(); }, step.d);
    }
    tick();
}
