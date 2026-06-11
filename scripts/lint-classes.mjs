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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
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
  'kpi-card', 'active', 'show']);

export function lintClassesOrThrow() {
  const failures = [];
  for (const fn of fs.readdirSync(SCAN_DIR)) {
    if (!fn.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(SCAN_DIR, fn), 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, idx) => {
      for (const m of line.matchAll(/class:\s*'([^']*)'/g)) {
        for (const tok of m[1].split(/\s+/)) {
          if (!tok) continue;
          if (PREFIXES.some((p) => tok.startsWith(p))) continue;
          if (FROZEN.has(tok)) continue;
          failures.push(`src/components/${fn}:${idx + 1} '${tok}'`);
        }
      }
    });
  }
  if (failures.length) {
    throw new Error('[lint-classes] unprefixed class token(s) - new classes need a family prefix:\n  ' + failures.join('\n  '));
  }
  console.log('[lint-classes] OK — every emitted class token is prefixed, public, or frozen-legacy.');
}

if (process.argv[1]?.endsWith('lint-classes.mjs')) {
  lintClassesOrThrow();
}
