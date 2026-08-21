import * as webjsx from 'webjsx';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see aicat/app.js for the measured rationale (200+ serial unbundled
// module requests when every kit pulls the full 30+-submodule barrel).
import { Topbar, Crumb, Status, Side, AppShell, Heading, Lede, Chip } from 'ds/components/shell.js';
import { Panel } from 'ds/components/content.js';
import { ThemeToggle } from 'ds/components/theme-toggle.js';
import { mountKit } from 'ds/bootstrap.js';
import { run as runCommand, complete as completeLine } from 'ds/shell.js';
import { copyToClipboardWithFeedback } from 'ds/components/chat-message-parts/inline.js';
import { hasSelectionInside } from 'ds/components/chat/thread-scroll.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

// Live terminal — instant output, no fake reveal animation. This is the
// usable surface; anything typed appears immediately, anything emitted by
// the (stubbed) backend appears immediately.
// Seeded by really running the commands through the interpreter at load, not
// by hand-writing their output. A canned transcript would go stale the moment
// the filesystem or a command changed, and it would show a shell that cannot
// be told apart from one that executes nothing -- which is exactly what this
// kit used to be.
const liveTranscript = [
    // No leading '#' in the text: Line() renders the cmt prompt mark itself,
    // so writing one here produces a doubled '# #' on screen.
    { kind: 'cmt', text: 'live shell — really executes. type `help` for commands.' },
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

// Rendered ABOVE the live input row when the scrollback is empty (never in
// its place — see the `live.phase === 'empty'` branch below). Its own copy
// promises "type one below and press enter", so the input has to actually
// still be there; an earlier version swapped the whole term body for this
// panel, which removed .ds-term-input and made the real `clear` shell
// command (shellCtx.clear, not just the sidebar/Ctrl+K shortcuts) delete the
// only way to type another command — reachable via `help`, not a hidden path.
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

// Commands the live shell has run, newest last — what `history (up)` walks.
const history = [];
let historyIdx = -1;

// The scrollback's actual scroll container (.ds-term-body — max-height +
// overflow-y: auto, see kits-appended.css). webjsx re-invokes this ref on
// EVERY render (no identity check in vendor/webjsx/utils.js#assignRef), so it
// must stay a dumb assignment — anything that scrolls from inside it would
// yank the pane to the bottom on unrelated re-renders too (theme toggle, the
// demo loop's ~1x/second tick, sidebar phase previews). Scrolling only
// happens from the explicit call sites below, right after a render that
// actually appended a new line.
let liveBodyEl = null;

// Pins the live pane to its newest line after new output lands. A terminal
// always jumps to the new prompt (unlike the chat convention in
// thread-scroll.js, which only continues scrolling if the user was already
// pinned to the bottom) -- so this scrolls unconditionally, guarded only by
// an active text selection inside the pane (e.g. mid drag-to-copy), the same
// guard chat/thread-scroll.js uses for the same reason.
function scrollLiveToBottom() {
    if (!liveBodyEl || hasSelectionInside(liveBodyEl)) return;
    liveBodyEl.scrollTop = liveBodyEl.scrollHeight;
}

// The interpreter's session state. cwd is an array of path segments owned here
// and mutated in place by `cd`, so the prompt and the shell never disagree
// about where the session is.
const shellCwd = [];
const shellPath = () => '~/' + shellCwd.join('/');
const shellCtx = {
    cwd: shellCwd,
    clear: () => clearScrollback(),
    // `theme dark` drives the same data-theme attribute ThemeToggle writes, so
    // the command and the toggle stay one mechanism rather than two.
    setTheme: (t) => document.documentElement.setAttribute('data-theme', t),
};

// Run a line for real and append both the command and its output, so the
// opening scrollback is produced by the same path a typed command takes.
function seed(line) {
    liveTranscript.push({ kind: 'cmd', text: line });
    for (const out of runCommand(line, shellCtx)) liveTranscript.push(out);
}
seed('whoami');
seed('ls');

// Empties the scrollback and drops the shell into its own empty state, which is
// the honest reading of a cleared shell (the empty panel explains what lands
// there). Both the sidebar item and Cmd/Ctrl+K call this.
function clearScrollback() {
    liveTranscript.length = 0;
    live.phase = 'empty';
    historyIdx = -1;
    kit.render();
}

// Walks back through previously-run commands into the input, oldest-last like a
// real shell. With no history it says so in the scrollback instead of silently
// doing nothing — the whole point of this pass.
function recallHistory() {
    if (!history.length) {
        if (live.phase !== 'ready') live.phase = 'ready';
        liveTranscript.push({ kind: 'cmt', text: '# nothing in history yet — run a command first' });
        kit.render();
        scrollLiveToBottom();
        return;
    }
    historyIdx = historyIdx < 0 ? history.length - 1 : Math.max(0, historyIdx - 1);
    live.input = history[historyIdx];
    if (live.phase !== 'ready') live.phase = 'ready';
    kit.render();
}

// Walks forward from a recalled entry back toward the newest, then to a blank
// line once past it — the down-arrow counterpart `recallHistory` never had.
// A no-op outside an active recall (historyIdx < 0): there is nothing to walk
// forward from, matching a real shell's behavior at a fresh prompt.
function recallHistoryForward() {
    if (historyIdx < 0) return;
    if (historyIdx >= history.length - 1) {
        historyIdx = -1;
        live.input = '';
    } else {
        historyIdx += 1;
        live.input = history[historyIdx];
    }
    kit.render();
}

const LINE_PROMPTS = { cmt: '#', cmd: '$', out: '·', ok: '+', warn: '!', log: '·' };
function Line(l, i, opts = {}) {
    const prompt = LINE_PROMPTS[l.kind];
    if (!prompt) return null;
    // Copy affordance is command-lines only (kind === 'cmd'), not output --
    // copying a single output line out of context is rarely useful, and a
    // button on every line (including the blank/spacer kinds) would turn the
    // scrollback into a wall of hover targets. Hover/focus-reveal like the
    // chat surface's .chat-code-copy, reusing the same copy+feedback helper
    // rather than a second implementation.
    const copyable = l.kind === 'cmd';
    return h('div', { key: 'l' + i, class: 'cli ds-cli-' + l.kind + (copyable ? ' ds-term-line-copyable' : '') },
        h('span', { class: 'prompt' }, prompt),
        h('span', { class: 'cmd' }, l.text),
        opts.cursor ? h('span', { class: 'cursor-blink' }, '') : null,
        copyable ? h('button', {
            type: 'button', class: 'ds-term-line-copy',
            'aria-label': 'copy command',
            onclick: (e) => { e.preventDefault(); copyToClipboardWithFeedback(l.text, e.currentTarget); }
        }, 'copy') : null
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
                    // 'live' is a readout of which shell this kit is showing —
                    // there is only one, so it anchors to that panel rather
                    // than posing as a session picker.
                    { glyph: '*', label: 'live', count: live.phase === 'ready' ? liveTranscript.length : 0, key: 'l', href: '#p-live' },
                    // The demo loop control actually pauses and resumes the
                    // playback it names.
                    { glyph: '-', label: 'demo loop', count: demo.looping ? 'play' : 'still', key: 'd',
                      href: '#p-demo',
                      onClick: (e) => {
                          e.preventDefault();
                          demo.looping = !demo.looping;
                          if (demo.looping) tick();
                          kit.render();
                      } }
                ] },
                // Reachable state switcher for the live shell panel — previews
                // rendering states only, so the group name says so up front
                // rather than reading as real shell status a first-timer
                // could mistake for their own session crashing.
                { group: 'shell state (preview only)', items: PHASES.map((p) => ({
                    glyph: h('span', { class: live.phase === p ? 'ds-dot ds-dot-on' : 'ds-dot ds-dot-off' }),
                    label: p, key: 'ph-' + p, active: live.phase === p,
                    ariaLabel: 'preview ' + p + ' state (does not affect your session)',
                    onClick: (e) => {
                        e.preventDefault();
                        // Switching away from 'ready' hides the input row
                        // entirely, so anything typed there would otherwise
                        // vanish with no way back. Leaving it in place lets it
                        // survive the round trip back to 'ready'.
                        live.phase = p;
                        kit.render();
                    }
                })) },
                // These name real shell affordances, so they perform them
                // rather than documenting a keystroke and doing nothing when
                // clicked. Both are also bound to the keys they advertise.
                { group: 'shortcuts', items: [
                    // The handler binds metaKey OR ctrlKey, so the label names
                    // both. The Command symbol is also the one glyph the mono
                    // stack has no coverage for -- it rendered as tofu here.
                    { glyph: '·', label: 'clear (ctrl/cmd k)', key: 'c',
                      onClick: (e) => { e.preventDefault(); clearScrollback(); } },
                    { glyph: '·', label: 'history (up)', key: 'h',
                      onClick: (e) => { e.preventDefault(); recallHistory(); } }
                ] }
            ]
        }),
        main: [
            h('div', { class: 'ds-app-surface ds-section-pad-sm' },
                h('div', { class: 'ds-kit-head-row' },
                    h('div', {}, Heading({ level: 1, children: 'terminal' })),
                    ThemeToggle()
                ),
                Lede({ children: 'a working shell — ls, cd, cat, echo, theme and more run against a real in-memory tree, with tab completion and history. below it, a decorative demo loop plays the .cli row primitives. respects prefers-reduced-motion.' }),

                // Live terminal — usable, no reveal delays.
                Panel({
                    id: 'p-live',
                    title: 'live · ' + live.cwd,
                    count: live.phase === 'ready' ? liveTranscript.length : 0,
                    class: 'ds-panel-gap',
                    children: live.phase === 'loading' ? ScrollbackSkeleton()
                    : live.phase === 'error' ? ScrollbackError()
                    : h('div', { class: 'ds-term-body', role: 'log', 'aria-live': 'polite', ref: (el) => { liveBodyEl = el; } },
                        live.phase === 'empty' ? ScrollbackEmpty() : liveTranscript.map((l, i) => Line(l, i)),
                        h('div', { class: 'cli ds-term-input-row' },
                            h('span', { class: 'prompt' }, '$'),
                            h('input', {
                                type: 'text',
                                value: live.input,
                                placeholder: 'try `help`, `ls`, `cat readme.md`…',
                                'aria-label': 'shell command input',
                                class: 'ds-term-input',
                                oninput: (e) => { live.input = e.target.value; },
                                onkeydown: (e) => {
                                    if (e.key === 'Enter' && live.input.trim()) {
                                        const line = live.input;
                                        liveTranscript.push({ kind: 'cmd', text: line });
                                        // Real execution: the interpreter in
                                        // ds/shell.js owns the filesystem and the
                                        // command table, so an unknown command
                                        // reports a genuine error instead of the
                                        // old '(stub) ran: ...' echo that claimed
                                        // success for anything typed.
                                        for (const out of runCommand(line, shellCtx)) liveTranscript.push(out);
                                        live.cwd = shellPath();
                                        history.push(line);
                                        historyIdx = -1;
                                        live.input = '';
                                        // A command run right after `clear` left
                                        // live.phase stuck at 'empty' forever (nothing
                                        // reset it), so ScrollbackEmpty() kept showing
                                        // above every subsequent command's real output
                                        // instead of getting out of the way once the
                                        // scrollback is genuinely non-empty again. Gated
                                        // on a non-empty transcript so `clear` itself
                                        // (which wipes liveTranscript via ctx.clear()
                                        // inside runCommand, above) is not immediately
                                        // undone by this same handler flipping the phase
                                        // straight back to 'ready'.
                                        if (live.phase !== 'ready' && liveTranscript.length > 0) live.phase = 'ready';
                                        kit.render();
                                        // render() is synchronous (webjsx.applyDiff
                                        // runs inline, see bootstrap.js), so the new
                                        // lines are already in the DOM here -- the
                                        // pane can be scrolled without waiting a frame.
                                        scrollLiveToBottom();
                                    } else if (e.key === 'Tab') {
                                        // Completion has to pre-empt the browser's
                                        // focus move, so preventDefault comes first.
                                        e.preventDefault();
                                        live.input = completeLine(live.input, shellCwd);
                                        kit.render();
                                    } else if (e.key === 'ArrowUp') {
                                        // The sidebar advertises 'history (up)';
                                        // the key it names has to do it too.
                                        e.preventDefault();
                                        recallHistory();
                                    } else if (e.key === 'ArrowDown') {
                                        // Symmetric counterpart to ArrowUp: walk
                                        // back toward the newest entry, then to a
                                        // blank line once past it — a real shell's
                                        // down-arrow behavior.
                                        e.preventDefault();
                                        recallHistoryForward();
                                    }
                                }
                            })
                        )
                    )
                }),

                // Demo loop — decorative showcase only.
                Panel({
                    id: 'p-demo',
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
                    h('p', {}, '· live panel is instant and really executes — ', h('code', {}, 'help'), ' lists the commands, tab completes, up walks history.'),
                    h('p', {}, '· demo panel reveals lines on a loop for the showcase only — never fake-animate output a user is waiting on.')
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

// The sidebar advertises 'clear (⌘k)'; bind the keystroke it names so the label
// is true on both surfaces.
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        clearScrollback();
    }
});

// Demo loop animation. Stays off when prefers-reduced-motion is on, and the
// sidebar's 'demo loop' item pauses/resumes it — hence module scope with a
// `looping` guard on every step rather than a closure that cannot be stopped.
// `pending` is the guard against a paused-then-resumed loop running two
// interleaved timer chains over the same index.
let demoIdx = 0;
let demoPending = false;
function tick() {
    if (!demo.looping || demoPending) return;
    if (demoIdx >= demoScript.length) {
        demoPending = true;
        setTimeout(() => {
            demoPending = false;
            if (!demo.looping) return;
            demo.visible = []; demoIdx = 0; kit.render(); tick();
        }, 2500);
        return;
    }
    const step = demoScript[demoIdx++];
    demoPending = true;
    setTimeout(() => {
        demoPending = false;
        if (!demo.looping) return;
        demo.visible.push(step); kit.render(); tick();
    }, step.d);
}
tick();
