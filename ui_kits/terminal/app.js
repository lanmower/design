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
const live = { input: '', cwd: '~/dev/design', phase: 'ready' };
const PHASES = ['ready', 'loading', 'empty', 'error'];

// Line-shaped shimmer for scrollback still being read off disk. Reuses
// .ds-event-row-skeleton + .ds-skel* (app-shell/files.css); a cli row is the
// same prompt-mark / text rhythm the primitive was cut for.
function ScrollbackSkeleton() {
    return h('div', {},
        ...Array.from({ length: 5 }, (_, i) => h('div', { key: 'sk' + i, class: 'ds-event-row-skeleton' },
            h('span', { class: 'ds-skel ds-skel-rank' }),
            h('span', { class: 'ds-skel ds-skel-title' })
        ))
    );
}

function ScrollbackEmpty() {
    return h('div', { class: 'ds-empty-state' },
        h('div', { class: 'ds-empty-state-glyph' }, '$'),
        h('p', { class: 'ds-empty-state-msg' }, 'nothing run in this shell yet'),
        h('p', { class: 'ds-empty-state-hint' }, 'commands and their output land here in order. type one below and press enter — scrollback survives until you clear it.')
    );
}

function ScrollbackError() {
    return h('div', { class: 'ds-alert ds-alert-error' },
        h('span', { class: 'ds-alert-icon' }, '!'),
        h('div', { class: 'ds-alert-content' },
            h('div', { class: 'ds-alert-title' }, 'shell exited (code 137)'),
            h('div', { class: 'ds-alert-message' }, 'the pty was killed by the OOM reaper, so scrollback is frozen and nothing you type now would reach a shell. a new session starts in the same working directory.'),
            h('div', { class: 'ds-alert-retry' },
                h('button', { class: 'btn', onclick: () => { live.phase = 'ready'; kit.render(); } }, 'start new session')
            )
        )
    );
}

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

const LINE_PROMPTS = { cmt: '#', cmd: '$', out: '·', ok: '+', warn: '!', log: '·' };
function Line(l, i, opts = {}) {
    const prompt = LINE_PROMPTS[l.kind];
    if (!prompt) return null;
    return h('div', { key: 'l' + i, class: 'cli ds-cli-' + l.kind },
        h('span', { class: 'prompt' }, prompt),
        h('span', { class: 'cmd' }, l.text),
        opts.cursor ? h('span', { class: 'cursor-blink' }, '') : null
    );
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
                    { glyph: '*', label: 'live',     count: 'on', key: 'l' },
                    { glyph: '-', label: 'demo loop', count: demo.looping ? 'play' : 'still', key: 'd' }
                ] },
                // Reachable state switcher for the live shell panel.
                { group: 'shell state', items: PHASES.map((p) => ({
                    glyph: h('span', { class: live.phase === p ? 'ds-dot ds-dot-on' : 'ds-dot ds-dot-off' }),
                    label: p, key: 'ph-' + p, active: live.phase === p,
                    onClick: (e) => { e.preventDefault(); live.phase = p; kit.render(); }
                })) },
                { group: 'shortcuts', items: [
                    { glyph: '·', label: 'clear (⌘k)',  key: 'c' },
                    { glyph: '·', label: 'history (up)', key: 'h' }
                ] }
            ]
        }),
        main: [
            h('div', { class: 'ds-app-surface ds-section-pad-sm' },
                h('div', { class: 'ds-kit-head-row' },
                    h('div', {}, Heading({ level: 1, children: 'terminal' })),
                    ThemeToggle()
                ),
                Lede({ children: 'two surfaces — a live shell (instant, no fake reveal) and a decorative demo loop that plays the .cli row primitives. respects prefers-reduced-motion.' }),

                // Live terminal — usable, no reveal delays.
                Panel({
                    title: 'live · ' + live.cwd,
                    count: live.phase === 'ready' ? liveTranscript.length : 0,
                    class: 'ds-panel-gap',
                    children: live.phase === 'loading' ? ScrollbackSkeleton()
                    : live.phase === 'error' ? ScrollbackError()
                    : live.phase === 'empty' ? ScrollbackEmpty()
                    : h('div', { class: 'ds-term-body' },
                        ...liveTranscript.map((l, i) => Line(l, i)),
                        h('div', { class: 'cli ds-term-input-row' },
                            h('span', { class: 'prompt' }, '$'),
                            h('input', {
                                value: live.input,
                                placeholder: 'type a command and press enter…',
                                class: 'ds-term-input',
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
                    class: 'ds-panel-gap',
                    children: h('div', { class: 'ds-term-body ds-term-body--tall' },
                        ...demo.visible.map((l, i) => Line(l, i, { cursor: i === demo.visible.length - 1 && demo.looping }))
                    )
                }),

                Panel({ title: 'about this kit', class: 'ds-panel-gap', children: h('div', { class: 'ds-pattern-notes' },
                    h('p', {}, '· ', Chip({ tone: 'accent', children: '.cli' }), ' rows pair ', h('code', {}, '.prompt'), ' + ', h('code', {}, '.cmd'), '.'),
                    h('p', {}, '· six line kinds: ', Chip({ tone: 'dim', children: 'cmt' }), ' ', Chip({ tone: 'dim', children: 'cmd' }), ' ', Chip({ tone: 'dim', children: 'out' }), ' ', Chip({ tone: 'accent', children: 'ok' }), ' ', Chip({ tone: '', children: 'warn' }), ' ', Chip({ tone: 'dim', children: 'log' }), '.'),
                    h('p', {}, '· live panel is instant; demo panel reveals lines on a loop for the showcase only — never fake-animate output a user is waiting on.')
                ) })
            )
        ],
        status: Status({
            left: ['terminal', '- live ' + (live.phase === 'ready' ? liveTranscript.length : 0) + ' lines', '- shell ' + live.phase, demo.looping ? '- demo playing' : '- demo still'],
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
