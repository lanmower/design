#!/usr/bin/env node
// Inline-style guard: fail the build if a source file hard-codes layout
// properties in a style="..." attribute string. Layout belongs in classes
// (app-shell.css et al., prefixed at build time) so density/responsive rules
// stay in one sheet; inline layout silently escapes every media query and
// touch-target floor. Dynamic NON-layout styles (custom-property writes,
// background swatches, transforms) are allowed via WHITELIST_RE.
//
// MECHANISM: RATCHET, because widening the scan set to the whole shipped
// surface exposed real pre-existing debt that a hard zero would demand fixing
// in one pass. Same reasoning as lint-inline-css.mjs's ratchet: the rule was
// always correct, it was simply pointed at less ground than the reader
// believed. Per AGENTS.md the baseline is a DEBT FIGURE TO DRIVE DOWN, never a
// budget — re-freeze DOWNWARD with --write-inline-styles-baseline after any
// triage pass, never upward to make a failing run pass.
//
// Run standalone (`node scripts/lint-inline-styles.mjs`) or as part of build.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkManyDirs } from './lint-shared.mjs';
import { ratchetOrThrow } from './lint-tokens.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Every hand-authored tree that ships. `dist/` is deliberately absent: it is
// generated output, and linting it would double-count each violation (once at
// its source, once in the bundle) while making the count unfixable in place.
//
// COVERAGE HISTORY — this is why the gate is a ratchet now. This list read
// ['ui_kits', 'site'] for months behind a comment promising to widen it "once
// that sweep lands". It never landed, so `npm run lint` reported green over
// preview/ (1381 violations), slides/ (5) and src/ (3) — ground no gate had
// ever looked at. Same defect shape as the @import barrel hole and the inline
// <style> hole: the rule was correct, its scan set was smaller than the report
// implied. Widening the perimeter is the fix; loosening the rule is not.
const SCAN_DIRS = ['ui_kits', 'site', 'preview', 'slides', 'src'];
const SCAN_EXT = new Set(['.js', '.mjs', '.html']);
// Generated artifacts inside an otherwise hand-authored SCAN_DIR. A violation
// here cannot be fixed at the file — it must be fixed in the generator — so
// counting it in the ratchet would freeze generator debt as a hand-editable
// budget and make the baseline undrivable from the file it names.
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist']);
// src/components/game-editor-kit is exempt as a tree: these are self-contained
// CDN-served components whose layout must survive with zero host-sheet context
// (they render inside spoint and other consumers that own no ds-* sheets), so
// they carry their full layout inline with token fallbacks by design. Counting
// them would freeze nearly every kit line as unfixable-from-the-file debt.
const SKIP_FILES_RE = /^src\/components\/game-editor-kit\//;

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

// Returns the array of violation strings (empty == clean). Pure; no exit/log.
export function findInlineStyleViolations() {
    const violations = [];
    const files = walkManyDirs(SCAN_DIRS.map((d) => path.join(root, d)), SCAN_EXT, { skipDirs: SKIP_DIRS });
    for (const file of files) {
        const rel = path.relative(root, file).split(path.sep).join('/');
        if (SKIP_FILES_RE.test(rel)) continue;
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
    return violations.sort();
}

// Ratchet baseline. Frozen 2026-07-28 at the REAL count the widened scan set
// measured, which is DEBT TO DRIVE DOWN and not a budget to spend. It is not
// zero only because widening the perimeter exposed pre-existing violations
// that belong to the CSS/kit owners, not to this script; each one wants a
// .ds-<thing> class in the relevant sheet. Re-freeze DOWNWARD with
// --write-inline-styles-baseline after any triage pass. Never raise it.
const BASELINE_FILE = path.join(root, 'scripts', 'lint-inline-styles.baseline.json');

// Throws when the count EXCEEDS the frozen baseline; build.mjs calls this so a
// regression fails the build even under runners (flatspace) that skip npm
// lifecycle hooks.
export function lintInlineStylesOrThrow() {
    ratchetOrThrow({
        label: 'lint-inline-styles',
        flag: '--write-inline-styles-baseline',
        baselineFile: BASELINE_FILE,
        violations: findInlineStyleViolations(),
        scope: `${SCAN_DIRS.join('/')} (${walkManyDirs(SCAN_DIRS.map((d) => path.join(root, d)), SCAN_EXT, { skipDirs: SKIP_DIRS }).length} source files)`,
        noun: 'layout propert(ies) hard-coded in an inline style= attribute',
        fix: 'Add a .ds-<thing> class to the relevant sheet and use it instead — an inline layout string escapes every media query, every [data-density] rule and every touch-target floor, none of which can reach a style= attribute. If the value is genuinely DYNAMIC and non-layout (a custom-property write, a var() swatch fill, a transform), express it that way so WHITELIST_RE covers it.',
    });
}

// CLI entry: `node scripts/lint-inline-styles.mjs`.
if (process.argv[1] && process.argv[1].endsWith('lint-inline-styles.mjs')) {
    try { lintInlineStylesOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
}
