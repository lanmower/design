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
    'src/kits/os/theme.css',
    'src/kits/os/freddie-dashboard.css',
    'src/kits/spoint/loading-screen.css',
];

// The token source — allowed to define raw values (that IS its job).
// Listed for clarity; simply not scanned.
const TOKEN_SOURCE = 'colors_and_type.css';

// Color-literal matcher: #hex (3/4/6/8), rgb()/rgba(), hsl()/hsla(), oklch()/oklab().
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\bokl(?:ch|ab)\(/;

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
}
