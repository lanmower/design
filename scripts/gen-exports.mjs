#!/usr/bin/env node
// Generates package.json's "exports" map from the actual file tree instead of
// a hand-maintained list. File existence is the ground truth — a hand-edited
// entry pointing at a file that no longer exists (e.g. the former
// "./system.css": "./system.css" orphan) cannot silently linger once this is
// the source of the map.
//
// Two surfaces are covered:
//   1. src/kits/** — every kit's public index + individually-exported files,
//      derived by walking the directory tree (see KIT rules below).
//   2. A small set of root-level entries (the dist bundle, root CSS files
//      meant as standalone public imports, and the handful of src/*.js
//      "flat" surfaces) that live outside src/kits and are declared explicitly
//      below — these are a product decision (which root files are public
//      API vs. internal build input), not something derivable purely from
//      "the file exists on disk", so they are a small hand-list rather than
//      a directory walk. Every declared path is still verified to exist.
//
// Run: `node scripts/gen-exports.mjs` to write package.json in place.
//      `node scripts/gen-exports.mjs --check` to diff against package.json
//      and exit non-zero on drift (the lint mode), matching the
//      `node scripts/lint-tokens.mjs` / `lint-classes.mjs` CLI convention.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const exists = (rel) => fs.existsSync(path.join(root, rel));

// ---------------------------------------------------------------------------
// Root-level entries outside src/kits/**. Hand-declared because "which root
// file is public API" is a product decision (e.g. chat.css/marketing.css/
// editor-primitives.css/community-app.css/app-surfaces.css/gm-prose.css are
// bundled into dist/247420.css by scripts/build.mjs but are NOT meant to be
// imported standalone — see build.mjs's SHEETS list), not something that can
// be inferred from "the file exists on disk". Each is still verified below.
// ---------------------------------------------------------------------------
const ROOT_EXTRAS = {
    '.': { types: './types/index.d.ts', import: './dist/247420.js', default: './dist/247420.js' },
    './css': './dist/247420.css',
    // Root CSS files deliberately published as standalone granular imports
    // (in addition to being folded into dist/247420.css). Everything else in
    // build.mjs's SHEETS list (chat.css, editor-primitives.css,
    // community-app.css, app-surfaces.css, gm-prose.css, marketing.css) is
    // bundle-only and intentionally has no standalone export.
    './colors_and_type.css': './colors_and_type.css',
    './app-shell.css': './app-shell.css',
    './community.css': './community.css',
    './page-html': { import: './src/page-html.js', default: './src/page-html.js' },
    './src/page-html.js': './src/page-html.js',
    './html-escape.js': './src/html-escape.js',
    './components/shell.js': './src/components/shell.js',
    './components/files.js': './src/components/files.js',
    './components/files-modals.js': './src/components/files-modals.js',
    './components/overlay-primitives.js': './src/components/overlay-primitives.js',
    './components/git-status.js': './src/components/git-status.js',
    './components/worktree-switcher.js': './src/components/worktree-switcher.js',
    // game-editor-kit ships its own multi-file public surface (AssetBrowser,
    // ModelBrowser, UploadProgress, etc.) meant to be reachable as individual
    // subpaths, same intent as the `spoint` KIT_WILDCARD kit below -- just
    // rooted under src/components/ instead of src/kits/, so it is declared
    // here rather than picked up by walkKit().
    './components/game-editor-kit': { import: './src/components/game-editor-kit/index.js', default: './src/components/game-editor-kit/index.js' },
    './components/game-editor-kit/*': './src/components/game-editor-kit/*',
    './web-components/ds-chat.js': './src/web-components/ds-chat.js',
    './web-components/freddie-chat.js': './src/web-components/freddie-chat.js',
    './lint': { import: './src/lint.js', default: './src/lint.js' },
    './package.json': './package.json',
};

// ---------------------------------------------------------------------------
// src/kits/** policy. Each kit directory's public surface is derived by
// walking its files, with two documented exceptions where a top-level file
// is implementation-internal to another public file in the same directory
// (verified by grep: nothing outside the directory imports them directly):
//   - slides: deck-stage-overlay.js / deck-stage-state.js / deck-stage-style.js
//     are only imported by deck-stage.js itself.
//   - os/freddie/*: only imported by os/freddie-dashboard.js itself (this one
//     falls out of the walk naturally since it's a nested subdirectory, not
//     a top-level file — kits are not walked recursively past their own
//     top-level files, see walkKit()).
// ---------------------------------------------------------------------------
const KIT_INTERNAL_ONLY = new Set([
    'slides/deck-stage-overlay.js',
    'slides/deck-stage-state.js',
    'slides/deck-stage-style.js',
]);

// Kits whose per-file surface is exposed via a single wildcard subpath
// instead of one export entry per file (spoint: every file under it is
// meant to be reachable, current and future, without an exports.mjs re-run).
const KIT_WILDCARD = new Set(['spoint']);

const kitsDir = path.join(root, 'src/kits');

function walkKit(kitName) {
    const kitPath = path.join(kitsDir, kitName);
    const entries = {};
    const files = fs.readdirSync(kitPath, { withFileTypes: true })
        .filter((d) => d.isFile())
        .map((d) => d.name)
        .sort();

    if (files.includes('index.js')) {
        const p = `./src/kits/${kitName}/index.js`;
        entries[`./kits/${kitName}`] = { import: p, default: p };
    }

    if (KIT_WILDCARD.has(kitName)) {
        entries[`./kits/${kitName}/*`] = `./src/kits/${kitName}/*`;
        return entries;
    }

    for (const file of files) {
        if (file === 'index.js') continue;
        if (KIT_INTERNAL_ONLY.has(`${kitName}/${file}`)) continue;
        entries[`./kits/${kitName}/${file}`] = `./src/kits/${kitName}/${file}`;
    }
    return entries;
}

function genExports() {
    const out = {};

    for (const [key, value] of Object.entries(ROOT_EXTRAS)) {
        // A trailing `/*` target is a glob subpath (game-editor-kit's own
        // per-file surface, same intent as KIT_WILDCARD below) -- it maps to
        // a directory, not a single file, so `exists()` doesn't apply; only
        // check that the directory itself is there.
        if (key.endsWith('/*') && typeof value === 'string' && value.endsWith('/*')) {
            const dir = value.slice(0, -2);
            if (!exists(dir)) {
                throw new Error(`[gen-exports] ROOT_EXTRAS wildcard entry "${key}" -> "${dir}" directory does not exist on disk`);
            }
            out[key] = value;
            continue;
        }
        const targets = typeof value === 'string' ? [value] : Object.values(value);
        for (const t of targets) {
            if (!exists(t)) {
                throw new Error(`[gen-exports] ROOT_EXTRAS entry "${key}" -> "${t}" does not exist on disk`);
            }
        }
        out[key] = value;
    }

    const kitNames = fs.readdirSync(kitsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();

    for (const kitName of kitNames) {
        Object.assign(out, walkKit(kitName));
    }

    return out;
}

function sortedStringify(exportsMap) {
    // Preserve stable, readable ordering: root extras' own insertion order
    // first (they're hand-declared above in a deliberate order), then kits
    // in directory order, matching genExports()'s own construction order —
    // i.e. no re-sorting, so diffs against the hand-written map stay small.
    return exportsMap;
}

function main() {
    const check = process.argv.includes('--check');
    const generated = sortedStringify(genExports());

    const pkgPath = path.join(root, 'package.json');
    const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgRaw);

    if (check) {
        const current = JSON.stringify(pkg.exports ?? {}, null, 2);
        const next = JSON.stringify(generated, null, 2);
        if (current !== next) {
            console.error('[gen-exports] FAIL — package.json "exports" is out of date with the file tree.');
            console.error('[gen-exports] Run `node scripts/gen-exports.mjs` to regenerate it.');
            console.error('--- current ---');
            console.error(current);
            console.error('--- generated ---');
            console.error(next);
            process.exit(1);
        }
        console.log('[gen-exports] OK — package.json "exports" matches the generated map (' + Object.keys(generated).length + ' entries).');
        return;
    }

    pkg.exports = generated;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('[gen-exports] wrote ' + Object.keys(generated).length + ' export entries to package.json.');
}

main();
