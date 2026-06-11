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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const SCAN_DIRS = ['src'];
const SCAN_EXT = new Set(['.js', '.mjs']);

// Per-file allowlist of line numbers or substrings audited as safe.
const ALLOW = {};

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'vendor') continue;
      yield* walk(p);
    } else if (SCAN_EXT.has(path.extname(e.name))) yield p;
  }
}

function findViolations(src) {
  const out = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '[') continue;
    // bracket-match this array literal, tracking element-level segments
    let depth = 0, j = i, inStr = null, elemStart = i + 1;
    const elems = [];
    for (; j < src.length; j++) {
      const c = src[j];
      if (inStr) {
        if (c === '\\') j++;
        else if (c === inStr) inStr = null;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
      if (c === '[' || c === '(' || c === '{') depth++;
      else if (c === ']' || c === ')' || c === '}') {
        depth--;
        if (depth === 0 && c === ']') { elems.push(src.slice(elemStart, j)); break; }
      } else if (c === ',' && depth === 1) { elems.push(src.slice(elemStart, j)); elemStart = j + 1; }
    }
    if (j >= src.length) continue;
    const after = src.slice(j + 1, j + 24);
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
    for (const file of walk(abs)) {
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
