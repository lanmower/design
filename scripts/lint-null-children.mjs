#!/usr/bin/env node
// Null-children guard: webjsx applyDiff crashes ("Cannot read properties of
// undefined (reading 'key')") when a bare null sits among VElement siblings in
// a children array. The kit discipline is to .filter(Boolean) every children
// array that contains a conditional vnode — this lint makes the discipline
// durable instead of comment-maintained (two live crashes are on record: the
// agentgui 4th and 10th runs).
//
// Detection (kept narrow to avoid prop-object false positives): every
// top-level array literal is bracket-matched; it is flagged iff
//   (a) an ELEMENT-level member starts a vnode call (`h(` or `Component(`), AND
//   (b) an ELEMENT-level member token is `? null` / `: null` (conditional child), AND
//   (c) the closing `]` is not followed (whitespace-tolerant) by `.filter(`.
// Element-level means at the bracket depth of the array itself, so
// `{ tabindex: disabled ? '-1' : null }` props never match.
//
// Run standalone (`node scripts/lint-null-children.mjs`) or via build.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkFiles } from './lint-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
// `ui_kits`, `site`, `preview`, `slides` added 2026-07-28. The bug this gate
// catches is a webjsx applyDiff crash on a children array holding a null/false
// hole, so its true scope is "everywhere h() is called" — and h() is called in
// 20 files outside src/ (every ui_kits/*/app.js, site/theme.mjs,
// preview/data-density.js). Scanning only src/ meant the gate never looked at
// the consumer code most likely to hand-roll a conditional child.
const SCAN_DIRS = ['src', 'ui_kits', 'site', 'preview', 'slides'];
const SCAN_EXT = new Set(['.js', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', 'vendor']);

// Per-file allowlist of line numbers or substrings audited as safe.
const ALLOW = {};

// Blanks out `//` line-comment content (replacing with spaces, keeping
// newlines and length so reported line numbers stay accurate) before the
// bracket-matching pass below. Without this, an apostrophe inside ANY
// comment anywhere in the file (e.g. "the kit's own") is read as opening a
// string literal by the naive scanner, silently corrupting bracket-depth
// tracking for the rest of the file - a false positive here, or worse, a
// false NEGATIVE that hides a real missing .filter(Boolean) elsewhere.
// Comments living inside actual string/template literals (rare, but a `//`
// can appear in a URL string) are left alone via the same inStr tracking.
function stripLineComments(src) {
  const out = src.split('');
  let inStr = null;
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '/' && out[i + 1] === '/') {
      let j = i;
      while (j < out.length && out[j] !== '\n') out[j++] = ' ';
      i = j - 1;
    }
  }
  return out.join('');
}

function findViolations(src) {
  const scan = stripLineComments(src);
  const out = [];
  for (let i = 0; i < scan.length; i++) {
    if (scan[i] !== '[') continue;
    // bracket-match this array literal, tracking element-level segments
    let depth = 0, j = i, inStr = null, elemStart = i + 1;
    const elems = [];
    for (; j < scan.length; j++) {
      const c = scan[j];
      if (inStr) {
        if (c === '\\') j++;
        else if (c === inStr) inStr = null;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
      if (c === '[' || c === '(' || c === '{') depth++;
      else if (c === ']' || c === ')' || c === '}') {
        depth--;
        if (depth === 0 && c === ']') { elems.push(scan.slice(elemStart, j)); break; }
      } else if (c === ',' && depth === 1) { elems.push(scan.slice(elemStart, j)); elemStart = j + 1; }
    }
    if (j >= scan.length) continue;
    const after = scan.slice(j + 1, j + 24);
    if (/^\s*\.filter\(/.test(after)) continue;
    const hasVnode = elems.some((e) => /(^|\s|\(|,)(h\(|[A-Z][A-Za-z0-9]*\()/.test(e.trim()));
    // conditional-child tail: the ELEMENT itself ends in `: null` or `? ... : null`
    const hasCondNull = elems.some((e) => /[?:]\s*null\s*$/.test(e.trim()));
    if (hasVnode && hasCondNull) {
      const line = src.slice(0, i).split('\n').length;
      out.push(line);
      i = j; // skip past this array
    }
  }
  return out;
}

export function lintNullChildrenOrThrow() {
  const failures = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of walkFiles(abs, SCAN_EXT, { skipDirs: SKIP_DIRS })) {
      const rel = path.relative(root, file);
      const src = fs.readFileSync(file, 'utf8');
      const allow = ALLOW[rel] || [];
      for (const line of findViolations(src)) {
        if (allow.includes(line)) continue;
        failures.push(rel + ':' + line);
      }
    }
  }
  if (failures.length) {
    throw new Error('[lint-null-children] conditional null among vnode siblings without .filter(Boolean):\n  ' + failures.join('\n  '));
  }
  console.log('[lint-null-children] OK — every conditional-children array is filter(Boolean)\'d.');
}

if (import.meta.url === 'file://' + process.argv[1] || process.argv[1]?.endsWith('lint-null-children.mjs')) {
  lintNullChildrenOrThrow();
}
