#!/usr/bin/env node
// Decorative-glyph guard: fail the build if any source file hard-codes a
// decorative unicode glyph (arrows, bullets, checks, stars, status dots, etc.).
// The design system bans these — chrome must read as one coherent line-icon set
// (the Icon() SVG component) or industry-standard ASCII, never machine-shaped
// ornament. This is the durable companion to lint-tokens.mjs: without it, the
// next hand-edit silently re-introduces a glyph the sweep removed.
//
// Run standalone (`node scripts/lint-glyphs.mjs`) or as part of build.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Directories scanned recursively for source files. dist/ is generated,
// node_modules/ is vendored, vendor/ is third-party (webjsx), .gm/ is the
// plugkit spool — none are hand-authored design surfaces.
const SCAN_DIRS = ['src', 'ui_kits', 'slides', 'site'];
const SCAN_EXT = new Set(['.js', '.mjs', '.css', '.html']);
// The bundled root CSS files (app-shell.css, chat.css, etc.) are the design
// system's shipped styling but live at the repo root, outside SCAN_DIRS — they
// previously escaped the glyph lint entirely (box-drawing comment dividers
// slipped through). Scan them explicitly so a decorative glyph in shipped CSS
// fails the build.
const SCAN_ROOT_FILES = [
    'app-shell.css', 'chat.css', 'colors_and_type.css', 'community.css',
    'community-app.css', 'editor-primitives.css', 'app-surfaces.css',
];

// Files that are DELIBERATE glyph showcases or documentation of the unicode
// surface itself — exempt wholesale.
const EXEMPT_FILES = new Set([
    'preview/icons-unicode.html', // a deliberate catalog of unicode icons
]);

// The banned decorative-glyph class. NOT included (intentionally allowed):
//   ⌘ ⇧ ⌥ ⌃ ⇪ ⏎ ⌫ (Mac/keyboard key symbols — industry-standard, not decorative)
//   · (middle-dot separator), — (em-dash), … (ellipsis), › ‹ » « (text seps left to authors)
//   functional JS operators (=>, ??, ?., >=, <=) — those are ASCII, never matched here
const GLYPH_RE = /[●○◆◉◈▸▾▴◀▶★☆✓✗✕✖✔⟶⇒•◦‣◔↓↑→←⏸⏭ℹ⚠⚒◈▷▭▰◎◐▢↗◌▤▦♪§◫⊞❖✷✢⟳↻↺⥁⟲⌛⏳♻]/;

// Per-file allowlist: a line is exempt if it contains the substring AND the
// file matches. Keep tiny and audited.
const ALLOW = {
    // (currently none — the sweep left zero intentional decorative glyphs)
};

function isAllowed(rel, line) {
    const list = ALLOW[rel] || [];
    return list.some((s) => line.includes(s));
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
export function findGlyphViolations() {
    const violations = [];
    const files = [];
    for (const d of SCAN_DIRS) walk(path.join(root, d), files);
    for (const f of SCAN_ROOT_FILES) { const p = path.join(root, f); if (fs.existsSync(p)) files.push(p); }
    for (const file of files) {
        const rel = path.relative(root, file).split(path.sep).join('/');
        if (EXEMPT_FILES.has(rel)) continue;
        const src = fs.readFileSync(file, 'utf8');
        src.split(/\r?\n/).forEach((line, i) => {
            if (GLYPH_RE.test(line) && !isAllowed(rel, line)) {
                violations.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`);
            }
        });
    }
    return violations;
}

// Throws on violation; build.mjs calls this so a regression fails the build
// even under runners (flatspace) that skip npm lifecycle hooks.
export function lintGlyphsOrThrow() {
    const violations = findGlyphViolations();
    if (violations.length) {
        const msg = '[lint-glyphs] FAIL — decorative unicode glyphs in source '
            + '(use the Icon() SVG component or industry-standard ASCII like -> [x] *):\n  '
            + violations.join('\n  ')
            + `\n[lint-glyphs] ${violations.length} violation(s). If a glyph is a genuine product-design icon, route it through Icon() or add the file to EXEMPT_FILES / the audited ALLOW list in scripts/lint-glyphs.mjs.`;
        throw new Error(msg);
    }
    console.log('[lint-glyphs] OK — no decorative glyphs in ' + SCAN_DIRS.join('/') + ' (all icons via Icon()/ASCII).');
}

// CLI entry: `node scripts/lint-glyphs.mjs`.
if (process.argv[1] && process.argv[1].endsWith('lint-glyphs.mjs')) {
    try { lintGlyphsOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
}
