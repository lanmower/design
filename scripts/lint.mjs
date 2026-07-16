#!/usr/bin/env node
// Merged lint runner: imports every rule module's exported check function and
// runs them all in one pass, aggregating pass/fail into one consistent report.
// The 5 original scripts (lint-tokens.mjs, lint-glyphs.mjs,
// lint-inline-styles.mjs, lint-null-children.mjs, lint-classes.mjs) keep their
// actual rule-checking LOGIC untouched — this file only imports and calls
// their existing exported `*OrThrow` functions, matching how build.mjs
// already consumes them. lint:tokens / lint:classes / lint:null-children
// remain independently runnable via their own scripts and via
// `node scripts/lint-tokens.mjs` etc directly.
//
// Run: `node scripts/lint.mjs` (also wired as `npm run lint`).
import { lintTokensOrThrow, lintRadiusOrThrow, lintSpacingOrThrow } from './lint-tokens.mjs';
import { lintGlyphsOrThrow } from './lint-glyphs.mjs';
import { lintNullChildrenOrThrow } from './lint-null-children.mjs';
import { lintClassesOrThrow } from './lint-classes.mjs';
import { lintInlineStylesOrThrow } from './lint-inline-styles.mjs';
import { lintDuplicateSelectorsOrThrow } from './lint-duplicate-selectors.mjs';
import { lintSwallowCommentsOrThrow } from './lint-swallow-comments.mjs';

// Each entry: a human label for the report, and the check function to run.
// lintSpacingOrThrow is report-only (never throws — see lint-tokens.mjs), so
// it is run but never counted as a failure; its own console.warn/log already
// carries the detail. Every other check throws on violation.
const CHECKS = [
    ['tokens', lintTokensOrThrow],
    ['radius', lintRadiusOrThrow],
    ['glyphs', lintGlyphsOrThrow],
    ['null-children', lintNullChildrenOrThrow],
    ['classes', lintClassesOrThrow],
    ['inline-styles', lintInlineStylesOrThrow],
    ['duplicate-selectors', lintDuplicateSelectorsOrThrow],
    ['swallow-comments', lintSwallowCommentsOrThrow],
];

const results = [];
for (const [name, fn] of CHECKS) {
    try {
        fn();
        results.push({ name, ok: true });
    } catch (e) {
        console.error(e.message);
        results.push({ name, ok: false, error: e.message });
    }
}

// Spacing is report-only (logs its own [lint-spacing] REPORT/OK line above,
// via console.warn/console.log inside lintSpacingOrThrow) — never throws, so
// it is not part of the pass/fail tally, matching build.mjs's existing
// non-fatal treatment of it.
lintSpacingOrThrow();

const failed = results.filter((r) => !r.ok);
const passed = results.filter((r) => r.ok);

console.log('');
console.log('[lint] summary: ' + passed.length + '/' + results.length + ' checks passed'
    + (failed.length ? ' — FAILED: ' + failed.map((r) => r.name).join(', ') : ''));

if (failed.length) {
    process.exitCode = 1;
}
