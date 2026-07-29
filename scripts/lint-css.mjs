#!/usr/bin/env node
// CSS lint orchestrator: imports every rule module's exported check function
// and runs them all in one pass, aggregating pass/fail into one consistent
// report. Each lint-*.mjs (lint-tokens, lint-glyphs, lint-inline-styles,
// lint-null-children, lint-classes, lint-duplicate-selectors,
// lint-swallow-comments) keeps its own rule-checking LOGIC as a plain
// exported function — this file owns only the shared "run every rule, print
// one report" driver, and (via lint-shared.mjs) the shared directory-walk
// helper the file-scanning rules use. scripts/lint.mjs is now a thin wrapper
// around runLintCss() below.
//
// Run: `node scripts/lint-css.mjs` (also wired as `npm run lint`, via lint.mjs).
import {
    lintTokensOrThrow,
    lintRadiusOrThrow,
    lintSpacingOrThrow,
    lintFontSizeOrThrow,
    lintZIndexOrThrow,
    lintTransitionAllOrThrow,
    lintDarkParityOrThrow,
    lintImportantOrThrow,
    lintTokensJsonInSyncOrThrow,
} from './lint-tokens.mjs';
import { lintGlyphsOrThrow } from './lint-glyphs.mjs';
import { lintNullChildrenOrThrow } from './lint-null-children.mjs';
import { lintClassesOrThrow } from './lint-classes.mjs';
import { lintInlineStylesOrThrow } from './lint-inline-styles.mjs';
import { lintDuplicateSelectorsOrThrow } from './lint-duplicate-selectors.mjs';
import { lintSwallowCommentsOrThrow } from './lint-swallow-comments.mjs';
import { lintInlineCssOrThrow } from './lint-inline-css.mjs';
import { lintDeadControlsOrThrow } from './lint-dead-controls.mjs';

// Each entry: a human label for the report, and the check function to run.
// EVERY check here throws on violation and is counted in the pass/fail tally.
//
// The three token RATCHET gates (spacing, fontsize, important) throw only when
// the count EXCEEDS their frozen baseline — they carry inherited debt that a
// hard zero would demand fixing in one pass. They are otherwise ordinary
// members of this list: a ratchet that never throws is not a gate, and
// `spacing` was previously called outside the loop under a stale "report-only,
// never throws" comment, which meant a real spacing regression escaped as an
// unhandled exception out of runLintCss() instead of being reported as a
// failed check. Anything that can fail belongs in CHECKS.
const CHECKS = [
    ['tokens', lintTokensOrThrow],
    // colors_and_type.css and tokens.json are two sources of truth for the same
    // custom properties, so changing one alone is a half-change. This ran only
    // from build.mjs, which let `npm run lint` report every check green while
    // the build was broken -- a layout fix sat on main unpublished for an hour
    // because the failing Build step also failed the publish workflow. Same
    // coverage-hole shape as the rest of this list: a gate nothing invokes.
    ['tokens-json', lintTokensJsonInSyncOrThrow],
    ['radius', lintRadiusOrThrow],
    ['zindex', lintZIndexOrThrow],
    ['transition-all', lintTransitionAllOrThrow],
    ['dark-parity', lintDarkParityOrThrow],
    ['spacing', lintSpacingOrThrow],
    ['fontsize', lintFontSizeOrThrow],
    ['important', lintImportantOrThrow],
    // Fourth ratchet, and the only one whose scan set is HTML rather than .css:
    // the token scanners above are blind to CSS living inside a <style> block,
    // so those declarations were never linted at all. Same coverage-hole shape
    // as the @import barrel (a gate reporting green over ground it never
    // scanned), same remedy: widen the scan set, do not loosen the rule.
    ['inline-css', lintInlineCssOrThrow],
    ['glyphs', lintGlyphsOrThrow],
    ['null-children', lintNullChildrenOrThrow],
    ['classes', lintClassesOrThrow],
    ['inline-styles', lintInlineStylesOrThrow],
    ['duplicate-selectors', lintDuplicateSelectorsOrThrow],
    ['swallow-comments', lintSwallowCommentsOrThrow],
    // A rendered control that cannot act — an empty handler body, or an
    // href="#" that goes nowhere. Both shipped in quantity (6 no-op handlers
    // across three kits, 24 placeholder links across blog and docs) precisely
    // because nothing checked: the affordance renders either way, so the defect
    // is invisible until someone clicks.
    ['dead-controls', lintDeadControlsOrThrow],
];

// Runs every rule module's check, prints one aggregated report, and returns
// { results, failed, passed } so a caller (lint.mjs, or a future test
// runner) can inspect the outcome instead of relying on process.exitCode.
export function runLintCss() {
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

    const failed = results.filter((r) => !r.ok);
    const passed = results.filter((r) => r.ok);

    console.log('');
    console.log('[lint] summary: ' + passed.length + '/' + results.length + ' checks passed'
        + (failed.length ? ' — FAILED: ' + failed.map((r) => r.name).join(', ') : ''));

    if (failed.length) {
        process.exitCode = 1;
    }
    return { results, failed, passed };
}

// CLI entry: `node scripts/lint-css.mjs`.
if (process.argv[1]?.endsWith('lint-css.mjs')) {
    runLintCss();
}
