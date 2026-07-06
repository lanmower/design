#!/usr/bin/env node
// Themability guard: fail the build if any COMPONENT stylesheet hard-codes a
// raw color literal. The single source of truth for color values is
// colors_and_type.css (the token layer); every other sheet must consume
// var(--token), never a baked hex/rgb/hsl/oklch.
//
// This is what keeps "perfectly themable" true over time — without it, the
// next hand-edit silently re-introduces a literal that ignores the active
// theme. Run standalone (`node scripts/lint-tokens.mjs`) or as part of build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Sheets that MUST be literal-free (every color comes from a token).
const COMPONENT_SHEETS = [
    'app-shell.css',
    'community.css',
    'chat.css',
    'editor-primitives.css',
    'community-app.css',
    'gm-prose.css',
    'src/kits/os/theme.css',
    'src/kits/os/freddie-dashboard.css',
    'src/kits/spoint/loading-screen.css',
];

// The token source — allowed to define raw values (that IS its job).
// Listed for clarity; simply not scanned.
const TOKEN_SOURCE = 'colors_and_type.css';

// Color-literal matcher: #hex (3/4/6/8), rgb()/rgba(), hsl()/hsla(), oklch()/oklab().
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\bokl(?:ch|ab)\(/;

// Radius-literal matcher: a bare numeric length/percentage (px/%/em/rem/vw/
// vh/ch/vmin/vmax) on a border-radius (or -webkit-/-moz-prefixed)
// declaration — the raw-literal bypass of the --r-hair/--r-0/--r-1/--r-2/
// --r-3/--r-4/--r-pill scale defined in colors_and_type.css. The digit must
// be followed by a unit so it never matches a digit inside a --r-1/--r-pill
// token NAME referenced via var(...) on the same declaration.
//
// `border-radius: 0` (bare, no unit) is INTENTIONALLY not matched: zero is
// the deliberate absence of rounding (a square-corner reset, e.g. undoing a
// pill/tab shape on hover or in a flattened variant), not a point on the
// rounding scale — there is no --r-* token that means "no radius", so
// flagging it would force a fake token or a force-fit onto the smallest
// real rung (--r-hair, 2px), which is a visible size change, not a
// value-preserving substitution. Same reasoning class as stripThemableLiterals
// treating a var(...) fallback as non-literal: a structural non-bypass,
// not a per-line ALLOW entry.
const RADIUS_RE = /(?:-webkit-|-moz-)?border-radius\s*:\s*[^;}]*?\d[\d.]*(?:px|%|em|rem|vw|vh|vmin|vmax|ch)\b/;

// Per-file allowlist of intentional, justified literals. A line is exempt if it
// contains the substring AND the file matches. Keep this list tiny and audited —
// every entry is a deliberate non-themable value (true-black media frames, etc).
const ALLOW = {
    'src/kits/os/theme.css': [
        '#0b0d10', // intentional: CRT/terminal canvas — a fake black screen
        '#ffffff', // intentional: .app-iframe.web — white canvas for embedded external web content
        '#F5F0E4', // thebird named-theme preset token definition (now also in colors_and_type.css; kept harmless)
        '#EFE9DB',
        '#E3DAC7',
    ],
    'editor-primitives.css': [
        'background: #000', // intentional: lightbox video letterbox — true black media frame
    ],
};

function isAllowed(rel, line) {
    const list = ALLOW[rel] || [];
    return list.some((s) => line.includes(s));
}

// Blank out every /* ... */ comment (including multi-line) while preserving
// line numbers, so a hex inside comment prose is never flagged. Each char of a
// comment becomes a space; newlines inside the comment are kept.
function stripComments(src) {
    return src.replace(/\/\*[^]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

// Themable literals to neutralize before scanning — each is NOT a baked theme
// color, so flagging it is a false positive that the cascade already proves safe:
//
//   var(--token, #fallback)  the active theme drives the var; the literal only
//                            applies when the token is undefined (a safety
//                            default). The token IS the themable surface.
//   box-shadow ... rgba(...) shadow tints are depth, not theme color; they ride
//                            on every theme unchanged (true-black ambient).
//
// We blank ONLY the literal characters (keeping length) so a BARE literal
// elsewhere on the same line is still caught and line numbers stay exact.
function stripThemableLiterals(code) {
    const blank = (m) => m.replace(/[^\n]/g, ' ');
    return code
        // var(--token, <literal>) — neutralize the fallback literal only.
        .replace(/var\(\s*--[\w-]+\s*,\s*([^()]*?)\s*\)/g, (whole, fallback) =>
            whole.replace(fallback, blank(fallback)))
        // box-shadow / text-shadow rgba|hsla shadow tints.
        .replace(/(?:box|text)-shadow\s*:[^;}]*/g, blank);
}

// Returns the array of violation strings (empty == clean). Pure; no exit/log,
// so build.mjs can call it inline and decide how to fail.
export function findTokenViolations() {
    const violations = [];
    for (const rel of COMPONENT_SHEETS) {
        const file = path.join(root, rel);
        if (!fs.existsSync(file)) { console.warn('[lint-tokens] missing:', rel); continue; }
        const src = fs.readFileSync(file, 'utf8');
        const codeLines = stripThemableLiterals(stripComments(src)).split(/\r?\n/);
        const rawLines = src.split(/\r?\n/);
        codeLines.forEach((code, i) => {
            if (COLOR_RE.test(code) && !isAllowed(rel, rawLines[i])) {
                violations.push(`${rel}:${i + 1}: ${rawLines[i].trim()}`);
            }
        });
    }
    return violations;
}

// Same collection pattern as findTokenViolations, scanning the identical
// COMPONENT_SHEETS list for a raw border-radius px/%/em/rem literal bypassing
// the --r-hair/--r-0/--r-1/--r-2/--r-3/--r-4/--r-pill scale in
// colors_and_type.css. HEAD is clean (0 violations) as of the migration that
// added this gate to build.mjs — lintRadiusOrThrow() is a hard build gate,
// mirroring lintTokensOrThrow, so a raw-radius regression fails the build the
// moment it lands.
export function findRadiusViolations() {
    const violations = [];
    for (const rel of COMPONENT_SHEETS) {
        const file = path.join(root, rel);
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        // var(--r-N, <fallback>px) fallback literals are exempt — same reasoning
        // as stripThemableLiterals for colors: the token drives the live value,
        // the literal is only a safety default when the token is undefined.
        // calc(var(--r-N) <op> <literal>) is exempt too — the expression still
        // scales off the token (a derived value, not a bypass), the same way
        // color-mix(in oklab, var(--danger) 15%, transparent) is not a raw-color
        // violation even though it contains a bare percentage literal.
        const codeLines = stripThemableLiterals(stripComments(src))
            .replace(/calc\([^()]*var\(\s*--r-[\w-]+\s*\)[^()]*\)/g, (m) => m.replace(/[^\n]/g, ' '))
            .split(/\r?\n/);
        const rawLines = src.split(/\r?\n/);
        codeLines.forEach((code, i) => {
            if (RADIUS_RE.test(code)) {
                violations.push(`${rel}:${i + 1}: ${rawLines[i].trim()}`);
            }
        });
    }
    return violations;
}

// Throws on violation, mirroring lintTokensOrThrow's shape exactly. Called
// from build.mjs (hard gate) and the CLI entry below.
export function lintRadiusOrThrow() {
    const violations = findRadiusViolations();
    if (violations.length) {
        const msg = '[lint-radius] FAIL — raw border-radius literals in component sheets (use var(--r-hair/--r-0/--r-1/--r-2/--r-3/--r-4/--r-pill) from '
            + TOKEN_SOURCE + '):\n  ' + violations.join('\n  ')
            + `\n[lint-radius] ${violations.length} violation(s). If a literal is genuinely non-scale (e.g. a one-off outside every rung), add it to the audited ALLOW list in scripts/lint-tokens.mjs.`;
        throw new Error(msg);
    }
    console.log('[lint-radius] OK — ' + COMPONENT_SHEETS.length + ' component sheets use only the --r-* radius scale.');
}

// Throws on violation; build.mjs calls this so a regression fails the build
// even under runners (flatspace) that skip npm lifecycle hooks.
export function lintTokensOrThrow() {
    const violations = findTokenViolations();
    if (violations.length) {
        const msg = '[lint-tokens] FAIL — raw color literals in component sheets (use var(--token) from '
            + TOKEN_SOURCE + '):\n  ' + violations.join('\n  ')
            + `\n[lint-tokens] ${violations.length} violation(s). If a literal is genuinely non-themable, add it to the audited ALLOW list in scripts/lint-tokens.mjs.`;
        throw new Error(msg);
    }
    console.log('[lint-tokens] OK — ' + COMPONENT_SHEETS.length + ' component sheets are literal-free (all color from tokens).');
}

// CLI entry: `node scripts/lint-tokens.mjs`.
if (process.argv[1] && process.argv[1].endsWith('lint-tokens.mjs')) {
    try { lintTokensOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
    try { lintRadiusOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
}
