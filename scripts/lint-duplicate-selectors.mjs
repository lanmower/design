#!/usr/bin/env node
// Duplicate-selector guard: the kit bundle is a straight concatenation of
// the cssParts list (see build.mjs) with no cascade-dedup step, so the same
// selector defined twice (same file or across files) with a DIFFERENT rule
// body is a live bug class — whichever declaration lands last in
// concatenation order silently wins and the other is dead weight or an
// active foot-gun (exactly the bug just hand-fixed for .ds-kbd/.ds-field-*/
// .ds-session-row/.cli). An IDENTICAL body repeated is not flagged: that is
// either an intentional @media-guarded override sharing a selector name, or
// harmless duplication, not a divergent-source-of-truth bug.
//
// Run standalone (`node scripts/lint-duplicate-selectors.mjs`) or via
// build.mjs, mirroring the other lint-*.mjs gates.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Mirrors build.mjs's cssParts list — the exact set of sheets concatenated
// into the published kit bundle. Kept in sync manually (same discipline as
// lint-all.mjs mirroring build.mjs's lint block); if build.mjs's cssParts
// changes, update this list too.
export const CSS_PARTS = [
  ['colors_and_type.css', path.join(root, 'colors_and_type.css')],
  ['app-shell.css', path.join(root, 'app-shell.css')],
  ['community.css', path.join(root, 'community.css')],
  ['chat.css', path.join(root, 'chat.css')],
  ['editor-primitives.css', path.join(root, 'editor-primitives.css')],
  ['community-app.css', path.join(root, 'community-app.css')],
  ['app-surfaces.css', path.join(root, 'app-surfaces.css')],
  ['gm-prose.css', path.join(root, 'gm-prose.css')],
  ['marketing.css', path.join(root, 'marketing.css')],
  ['spoint/loading-screen.css', path.join(root, 'src/kits/spoint/loading-screen.css')],
  ['spoint/game-hud.css', path.join(root, 'src/kits/spoint/game-hud.css')],
  ['spoint/host-join-lobby.css', path.join(root, 'src/kits/spoint/host-join-lobby.css')],
];

// prop -> normalized "value[ !important]" for one rule's own declarations.
function declMap(rule) {
  const map = new Map();
  for (const d of rule.nodes) {
    if (d.type !== 'decl') continue;
    const prop = d.prop.trim().toLowerCase();
    const val = d.value.trim().replace(/\s+/g, ' ') + (d.important ? ' !important' : '');
    map.set(prop, val);
  }
  return map;
}

// Build the at-rule ancestry key (e.g. "@media (max-width:900px)>@supports
// (...)") for a rule. Two identical selectors nested under DIFFERENT at-rule
// conditions (a base rule and a responsive/print/container override) are not
// a duplicate-source-of-truth bug — that's the normal cascade — so context is
// part of the identity we dedupe on, not just the bare selector text.
function atRuleContext(node) {
  const chain = [];
  let p = node.parent;
  while (p && p.type !== 'root') {
    if (p.type === 'atrule') chain.unshift(`@${p.name} ${p.params}`.trim());
    p = p.parent;
  }
  return chain.join(' > ');
}

export function lintDuplicateSelectorsOrThrow() {
  // "context||selector" -> [{ label, line, decls: Map<prop,value> }]
  //
  // This codebase legitimately re-touches the same selector many times in
  // one file to layer on ONE OR TWO extra properties further down the sheet
  // (progressive refinement — e.g. a base `.btn` rule, then a later `.btn`
  // rule that only adds `transition`). That is normal cascade-order CSS,
  // not a bug, and property-level diffing flags it constantly as noise.
  //
  // The actual bug class (the .ds-kbd/.ds-field-*/.ds-session-row/.cli
  // fixes) is a near-FULL duplicate rule BLOCK: the same selector appears
  // twice with an (almost) IDENTICAL set of property names — i.e. someone
  // copy-pasted the whole block — but one or more shared values diverged.
  // So: only flag a pair of rules for the same context+selector when their
  // property-name sets overlap heavily (>=70%, and share at least 3 props)
  // AND at least one shared property has a conflicting value. That signal
  // is unlikely for legitimate partial overrides but exactly matches a
  // stale copy-pasted block.
  const seen = new Map();
  const failures = [];
  const MIN_SHARED = 3;
  const MIN_OVERLAP_RATIO = 0.7;

  for (const [label, file] of CSS_PARTS) {
    if (!fs.existsSync(file)) continue;
    const css = fs.readFileSync(file, 'utf8');
    let root_;
    try {
      root_ = postcss.parse(css, { from: file });
    } catch (err) {
      failures.push(`${label}: parse error - ${err.message}`);
      continue;
    }
    root_.walkRules((rule) => {
      // Skip keyframe step selectors (from/to/N%) - not real selectors.
      if (/^(from|to|\d+%)$/.test(rule.selector.trim())) return;
      const decls = declMap(rule);
      if (!decls.size) return;
      const ctx = atRuleContext(rule);
      const line = rule.source?.start?.line;
      const parts = rule.selector.split(',').map((s) => s.trim()).filter(Boolean);
      // A comma-grouped rule (2+ selectors sharing one body) is how this kit
      // deliberately consolidates several legacy selectors under one later
      // rule (see chat.css's documented "Compact-button tiers" block) —
      // that is an intentional, commented override-by-source-order, not an
      // accidental duplicate. Only single-selector rules are compared for
      // the copy-paste-divergence signal.
      const grouped = parts.length > 1;
      for (const sel of parts) {
        const key = `${ctx}||${sel}`;
        let entries = seen.get(key);
        if (!entries) { entries = []; seen.set(key, entries); }
        if (!grouped) {
          for (const prior of entries) {
            if (prior.grouped) continue;
            const shared = [...decls.keys()].filter((p) => prior.decls.has(p));
            if (shared.length < MIN_SHARED) continue;
            const union = new Set([...decls.keys(), ...prior.decls.keys()]).size;
            if (shared.length / union < MIN_OVERLAP_RATIO) continue;
            const conflicts = shared.filter((p) => prior.decls.get(p) !== decls.get(p));
            if (!conflicts.length) continue;
            failures.push(
              `'${sel}'${ctx ? ` (under ${ctx})` : ''} looks like a duplicated block (${shared.length}/${union} properties shared) ` +
              `between ${prior.label}:${prior.line} and ${label}:${line}; conflicting: ${conflicts.map((p) => `${p} ('${prior.decls.get(p)}' vs '${decls.get(p)}')`).join(', ')}`
            );
          }
        }
        entries.push({ label, line, decls, grouped });
      }
    });
  }

  if (failures.length) {
    throw new Error('[lint-duplicate-selectors] selector(s) look like a duplicated CSS block with a conflicting value:\n  ' + failures.join('\n  '));
  }
  console.log('[lint-duplicate-selectors] OK — no selector looks like a stale duplicated block with a conflicting value.');
}

if (process.argv[1]?.endsWith('lint-duplicate-selectors.mjs')) {
  lintDuplicateSelectorsOrThrow();
}
