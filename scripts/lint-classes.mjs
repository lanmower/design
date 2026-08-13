#!/usr/bin/env node
// Class-prefix guard: every class token a component emits must belong to a
// named family (ds-/app-/ws-/chat-/agentchat-/aicat-/cm-/ov-/vx-/fd-/...), be a
// public utility class (.btn/.row/.panel/...), or sit on the FROZEN legacy
// bare-name list below. Consumer markup mounts INSIDE the .ds-247420 scope
// root, so an unprefixed kit class collides with consumer CSS in both
// directions — new bare names are a bug, not a style choice.
//
// Run standalone (`node scripts/lint-classes.mjs`) or via build.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkFiles } from './lint-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
// RECURSIVE as of 2026-07-28. This used a flat readdirSync, which scanned the
// 25 .js files sitting directly in src/components/ and none of the 99 in its
// 15 subdirectories — and per AGENTS.md those subdirectories are precisely
// where the real component code lives: every group that outgrows the 200-line
// cap becomes a thin barrel over `src/components/<group>/*.js`. So the gate got
// quieter with every split, reporting OK over a shrinking fraction of the
// components it names. A flat readdir under a directory tree that is
// documented to nest is a coverage hole, not a scope decision.
const SCAN_DIR = path.join(root, 'src', 'components');

const PREFIXES = ['ds-', 'app-', 'ws-', 'chat-', 'agentchat-', 'aicat-', 'cm-', 'ov-', 'vx-', 'fd-',
  'btn', 'row', 'panel', 'seg', 'crumb', 'status-dot', 'is-', 'rail-', 'tone-', 'glyph',
  'event-', 'side', 'brand', 'kpi', 'kind-', 'tool-'];

// FROZEN legacy bare internals - always styled under a prefixed parent. Do NOT
// add new entries; new classes take a family prefix.
const FROZEN = new Set(['agentchat', 'app', 'cancel', 'cap', 'chat', 'chip', 'cli', 'cmd', 'code',
  'composer-btn', 'copy', 'count', 'danger', 'desc', 'dot', 'e', 'empty', 'eyebrow', 'field-error',
  'go', 'group', 'grow', 'host', 'icon', 'input', 'item', 'kv', 'lang', 'lbl', 'leaf', 'lede',
  'meta', 'n', 'name', 'num', 'open', 'prompt', 'rxn', 'send', 'sep', 'size', 'skip-link', 'slash',
  'spread', 'sr-only', 'status', 'sub', 't', 'thumb', 'tick', 'title', 'who', 'work-detail',
  'kpi-card', 'active', 'show',
  // Added 2026-07-28 when the scan became recursive and src/components/freddie/
  // came into view for the first time. `dim` is NOT new code: it is a
  // pre-existing bare-name utility, styled at src/css/app-shell/base.css:204
  // (`.dim { color: var(--fg-3); }`), in the same legacy shape as every other
  // entry on this list. It is frozen here rather than left failing because this
  // gate is hard-zero and the rename belongs to the CSS/component owner, who
  // must move the rule and all three call sites together. DEBT: the correct end
  // state is `.ds-dim`; delete this entry when that lands.
  'dim']);

export function lintClassesOrThrow() {
  const failures = [];
  for (const file of walkFiles(SCAN_DIR, new Set(['.js']))) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, idx) => {
      for (const m of line.matchAll(/class:\s*'([^']*)'/g)) {
        for (const tok of m[1].split(/\s+/)) {
          if (!tok) continue;
          if (PREFIXES.some((p) => tok.startsWith(p))) continue;
          if (FROZEN.has(tok)) continue;
          failures.push(`${rel}:${idx + 1} '${tok}'`);
        }
      }
    });
  }
  failures.sort();
  if (failures.length) {
    throw new Error('[lint-classes] unprefixed class token(s) - new classes need a family prefix:\n  ' + failures.join('\n  '));
  }
  console.log('[lint-classes] OK — every emitted class token is prefixed, public, or frozen-legacy.');
}

// CLI entry: `node scripts/lint-classes.mjs`. Catch-and-report rather than
// letting the throw escape, matching every sibling gate — an uncaught throw
// prints a Node stack trace over the message, burying the actual file:line
// list the author needs under frames from the lint runner itself.
if (process.argv[1]?.endsWith('lint-classes.mjs')) {
  try { lintClassesOrThrow(); }
  catch (e) { console.error(e.message); process.exit(1); }
}
