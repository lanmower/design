#!/usr/bin/env node
// Standalone aggregate lint entry point — runs every lint gate build.mjs
// invokes, without paying for the full esbuild+postcss bundle pass. Useful
// for a fast `npm run lint` in CI/pre-commit contexts that only care about
// the source-hygiene gates, not the bundled output.
//
// Mirrors build.mjs's lint block exactly (same imports, same order); if a
// new gate is added there, add it here too. Some gates throw on the first
// violation (hard gates); others (e.g. the spacing lint) are report-only by
// design — see build.mjs's own comments for the ratchet-not-mass-fix
// rationale per gate. This script does not change that behavior: it just
// runs each gate and additionally tracks pass/fail so a single non-zero
// exit code reflects whether ANY gate threw.
import { lintTokensOrThrow, lintRadiusOrThrow, lintSpacingOrThrow } from './lint-tokens.mjs';
import { lintGlyphsOrThrow } from './lint-glyphs.mjs';
import { lintNullChildrenOrThrow } from './lint-null-children.mjs';
import { lintClassesOrThrow } from './lint-classes.mjs';
import { lintInlineStylesOrThrow } from './lint-inline-styles.mjs';
import { lintDuplicateSelectorsOrThrow } from './lint-duplicate-selectors.mjs';
import { lintSwallowCommentsOrThrow } from './lint-swallow-comments.mjs';

const gates = [
  ['tokens', lintTokensOrThrow],
  ['radius', lintRadiusOrThrow],
  ['spacing', lintSpacingOrThrow],
  ['glyphs', lintGlyphsOrThrow],
  ['null-children', lintNullChildrenOrThrow],
  ['classes', lintClassesOrThrow],
  ['inline-styles', lintInlineStylesOrThrow],
  ['duplicate-selectors', lintDuplicateSelectorsOrThrow],
  ['swallow-comments', lintSwallowCommentsOrThrow],
];

let failed = 0;
for (const [name, fn] of gates) {
  try {
    fn();
    console.log(`[lint-all] PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`[lint-all] FAIL  ${name}`);
    console.error(err && err.message ? err.message : err);
  }
}

console.log(`[lint-all] ${gates.length - failed}/${gates.length} gates passed`);
if (failed > 0) {
  console.error(`[lint-all] ${failed} gate(s) failed`);
  process.exit(1);
}
