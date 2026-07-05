#!/usr/bin/env node
// Inline-style guard: fail the build if a source file hard-codes layout
// properties in a style="..." attribute string. Layout belongs in classes
// (app-shell.css et al., prefixed at build time) so density/responsive rules
// stay in one sheet; inline layout silently escapes every media query and
// touch-target floor. Dynamic NON-layout styles (custom-property writes,
// background swatches, transforms) are allowed via WHITELIST_RE.
//
// Scope is currently ui_kits/ + site/ only (src/components has known
// violations mid-sweep); widen SCAN_DIRS once that sweep lands.
//
// Run standalone (`node scripts/lint-inline-styles.mjs`) or as part of build.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SCAN_DIRS = ['ui_kits', 'site'];
const SCAN_EXT = new Set(['.js', '.mjs', '.html']);

// Layout properties banned inside style= attribute strings.
const LAYOUT_RE = /grid-template|display:\s*grid|display:\s*flex|width:|height:|padding:|margin:|font-size:/;

// A style= value is exempt when EVERY declaration in it matches one of these
// dynamic non-layout patterns (data-driven, cannot live in a static sheet).
const WHITELIST_RE = [
    /^--[\w-]+:/,            // custom-property write (e.g. --ws-pct, --tone)
    /^background:\s*var\(/,  // token-driven swatch fill
    /^background-color:\s*var\(/,
    /^transform:/,           // motion/positioning driven by runtime state
    /^color:\s*var\(/,
];

// Matches style="..." / style='...' in HTML strings and style: '...' props in JS.
const STYLE_ATTR_RE = /style\s*[=:]\s*("([^"]*)"|'([^']*)')/g;

function declarationsAllowed(value) {
    return value.split(';').map((d) => d.trim()).filter(Boolean)
        .every((d) => WHITELIST_RE.some((re) => re.test(d)));
}

function walk(dir, acc) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return acc; }
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full, acc);
        else if (SCAN_EXT.has(path.extname(e.name))) acc.push(full);
    }
    return acc;
}

// Returns the array of violation strings (empty == clean). Pure; no exit/log.
export function findInlineStyleViolations() {
    const violations = [];
    const files = [];
    for (const d of SCAN_DIRS) walk(path.join(root, d), files);
    for (const file of files) {
        const rel = path.relative(root, file).split(path.sep).join('/');
        const src = fs.readFileSync(file, 'utf8');
        src.split(/\r?\n/).forEach((line, i) => {
            for (const m of line.matchAll(STYLE_ATTR_RE)) {
                const value = m[2] ?? m[3] ?? '';
                if (LAYOUT_RE.test(value) && !declarationsAllowed(value)) {
                    violations.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`);
                }
            }
        });
    }
    return violations;
}

// Throws on violation; build.mjs calls this so a regression fails the build
// even under runners (flatspace) that skip npm lifecycle hooks.
export function lintInlineStylesOrThrow() {
    const violations = findInlineStyleViolations();
    if (violations.length) {
        const msg = '[lint-inline-styles] FAIL — layout properties in inline style= '
            + '(add a .ds-<thing> class to the relevant sheet instead):\n  '
            + violations.join('\n  ')
            + `\n[lint-inline-styles] ${violations.length} violation(s). Dynamic non-layout styles (custom-property writes, var() swatches, transform) are whitelisted in scripts/lint-inline-styles.mjs.`;
        throw new Error(msg);
    }
    console.log('[lint-inline-styles] OK — no inline layout styles in ' + SCAN_DIRS.join('/') + '.');
}

// CLI entry: `node scripts/lint-inline-styles.mjs`.
if (process.argv[1] && process.argv[1].endsWith('lint-inline-styles.mjs')) {
    try { lintInlineStylesOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
}
