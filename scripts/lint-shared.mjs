#!/usr/bin/env node
// Shared file-walking helper for the lint-*.mjs rule modules. Three of the
// six rules (lint-glyphs, lint-inline-styles, lint-null-children) recursively
// scan a directory tree for files with a given extension set; this was
// duplicated near-verbatim in each. Extracted here so the rule modules keep
// only their actual check LOGIC (the part that varies) and share the
// directory-walk mechanics (the part that doesn't).
//
// The three original walkers differed only in which directories they skip
// (glyphs/inline-styles skip nothing extra; null-children skips
// node_modules/vendor) — both are supported via the optional `skipDirs` set.
import fs from 'node:fs';
import path from 'node:path';

// Recursively collects absolute file paths under `dir` whose extension is in
// `extSet`, skipping any directory whose basename is in `skipDirs`.
// Non-existent `dir` is silently treated as empty (matches every original
// walker's try/catch-and-return-acc behavior).
export function walkFiles(dir, extSet, { skipDirs } = {}) {
    const acc = [];
    walkInto(dir, extSet, skipDirs, acc);
    return acc;
}

function walkInto(dir, extSet, skipDirs, acc) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (skipDirs && skipDirs.has(e.name)) continue;
            walkInto(full, extSet, skipDirs, acc);
        } else if (extSet.has(path.extname(e.name))) {
            acc.push(full);
        }
    }
}

// Collects files across several root-relative dirs in one call (the common
// SCAN_DIRS.map(walk) pattern each rule module repeated).
export function walkManyDirs(baseDirs, extSet, opts) {
    const acc = [];
    for (const dir of baseDirs) acc.push(...walkFiles(dir, extSet, opts));
    return acc;
}
