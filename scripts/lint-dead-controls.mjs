#!/usr/bin/env node
// Dead-control guard: a rendered control that cannot do anything.
//
// Two shapes ship a control that looks pressable and is not, and both were
// found live in this repo rather than hypothesised:
//
//   (a) a no-op handler — `onClick: () => {}` (or onclick/onSelect/onToggle…).
//       The component still renders the affordance whether or not the handler
//       does anything, so an empty arrow is indistinguishable from a working
//       button until you click it. Six shipped across three kits.
//
//   (b) a placeholder link — `href="#"` in kit HTML. It looks navigable, takes
//       a tab stop, and goes nowhere. 24 shipped across blog and docs.
//
// This gate is what stops the 25th. It is deliberately narrow: it flags only
// an EMPTY handler body and only a bare `#` href, so a real handler and a real
// in-page anchor (`href="#install"`) both pass untouched.
//
// Escape hatches, both requiring the author to say why in the source:
//   * a handler whose body is a comment (`() => { /* … */ }`) is intentional
//     and passes — the comment is the justification.
//   * `href="#"` on a line carrying `lint-dead-controls:allow` passes.
//
// RATCHET: BASELINE is a debt figure to drive DOWN, never a budget to spend.
// Over baseline fails; under baseline fails too, with an instruction to
// re-freeze downward, matching every other ratchet gate here.
//
// Run standalone (`node scripts/lint-dead-controls.mjs`) or via lint.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkFiles } from './lint-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const JS_DIRS = ['src', 'ui_kits', 'site', 'preview', 'slides'];
const HTML_DIRS = ['ui_kits', 'preview', 'slides'];
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist']);

// Every prop name that wires a user action. An empty body on any of these is a
// control that renders and does nothing.
const HANDLER_PROPS = [
    'onClick', 'onclick', 'onSelect', 'onToggle', 'onChange', 'onInput',
    'onSubmit', 'onOpen', 'onClose', 'onStop', 'onStopAll', 'onView',
    'onNav', 'onAction', 'onMute', 'onDeafen', 'onLeave', 'onSettings',
    'onRemove', 'onDelete', 'onSave', 'onCancel', 'onConfirm', 'onRetry',
];

// `() => {}` / `() => { }` / `(e) => {}` / `function () {}` — an empty body.
// A body containing anything at all (including a comment) does not match.
const EMPTY_BODY = new RegExp(
    '(' + HANDLER_PROPS.join('|') + ')\\s*:\\s*' +
    '(?:\\([^)]*\\)|[A-Za-z_$][\\w$]*)\\s*=>\\s*\\{\\s*\\}',
);
const EMPTY_FN = new RegExp(
    '(' + HANDLER_PROPS.join('|') + ')\\s*:\\s*function\\s*\\([^)]*\\)\\s*\\{\\s*\\}',
);

// A bare placeholder href. `href="#install"` and `href='#'` + allow both pass.
const PLACEHOLDER_HREF = /href\s*=\s*(["'])#\1/;
const ALLOW_MARK = 'lint-dead-controls:allow';

function stripLineComments(src) {
    // Keep length and newlines so reported line numbers stay accurate.
    return src.replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

export function findDeadControls() {
    const hits = [];

    for (const dir of JS_DIRS) {
        const abs = path.join(root, dir);
        if (!fs.existsSync(abs)) continue;
        for (const file of walkFiles(abs, new Set(['.js', '.mjs']), { skipDirs: SKIP_DIRS })) {
            const raw = fs.readFileSync(file, 'utf8');
            const src = stripLineComments(raw);
            src.split('\n').forEach((line, i) => {
                if (line.includes(ALLOW_MARK)) return;
                const m = EMPTY_BODY.exec(line) || EMPTY_FN.exec(line);
                if (m) {
                    hits.push({
                        file: path.relative(root, file).replace(/\\/g, '/'),
                        line: i + 1, kind: 'noop-handler', detail: m[1],
                    });
                }
            });
        }
    }

    for (const dir of HTML_DIRS) {
        const abs = path.join(root, dir);
        if (!fs.existsSync(abs)) continue;
        for (const file of walkFiles(abs, new Set(['.html']), { skipDirs: SKIP_DIRS })) {
            const src = fs.readFileSync(file, 'utf8');
            src.split('\n').forEach((line, i) => {
                if (line.includes(ALLOW_MARK)) return;
                if (PLACEHOLDER_HREF.test(line)) {
                    hits.push({
                        file: path.relative(root, file).replace(/\\/g, '/'),
                        line: i + 1, kind: 'placeholder-href', detail: 'href="#"',
                    });
                }
            });
        }
    }

    return hits;
}

// Frozen at the count standing after the 2026-07-28 sweep. DRIVE DOWN ONLY.
const BASELINE = 0;

export function lintDeadControlsOrThrow() {
    const hits = findDeadControls();
    if (hits.length > BASELINE) {
        const lines = hits.map((h) => `  ${h.file}:${h.line}  ${h.kind}  ${h.detail}`);
        throw new Error(
            `FAIL(dead-controls): ${hits.length} dead control(s), baseline ${BASELINE}.\n` +
            lines.join('\n') +
            '\n\nA control that renders but cannot act is worse than one that is absent:\n' +
            'it invites a click and answers nothing. Give it a real handler or a real\n' +
            'destination, or stop rendering it as a control (drop the href / the\n' +
            'button). If the no-op is genuinely intentional, say why in the handler\n' +
            `body as a comment, or mark the line ${ALLOW_MARK}.`,
        );
    }
    if (hits.length < BASELINE) {
        throw new Error(
            `FAIL(dead-controls): ${hits.length} found, below baseline ${BASELINE}. ` +
            'Re-freeze BASELINE DOWNWARD in scripts/lint-dead-controls.mjs — slack in ' +
            'a baseline silently absorbs the next regression.',
        );
    }
    return hits.length;
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') ||
    process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const n = lintDeadControlsOrThrow();
        console.log(`[lint-dead-controls] OK — ${n} dead control(s) (baseline ${BASELINE}).`);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
