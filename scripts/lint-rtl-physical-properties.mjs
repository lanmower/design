#!/usr/bin/env node
// RTL-mirroring guard: fail if any real stylesheet uses a PHYSICAL left/right
// property (padding-left, margin-right, border-left, left:, right:,
// text-align: left/right) where the logical equivalent
// (padding-inline-start/end, margin-inline-start/end, border-inline-start/
// end, inset-inline-start/end, text-align: start/end) would automatically
// mirror under [dir="rtl"] (see src/theme.js's applyDirection/getDirection).
// A physical property never flips for RTL locales — it silently produces a
// mirrored-wrong layout instead of a correctly-mirrored one.
//
// Run standalone (`node scripts/lint-rtl-physical-properties.mjs`) or wire
// into CI alongside the other scripts/lint-*.mjs gates.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Every real stylesheet this repo ships as a themable component sheet —
// mirrors scripts/lint-tokens.mjs's COMPONENT_SHEETS list plus the kit
// sheets discovered live via grep this session.
const SHEETS = [
    'colors_and_type.css',
    'app-shell.css',
    'chat.css',
    'community.css',
    'editor-primitives.css',
    'gm-prose.css',
    'src/kits/os/app-panes.css',
    'src/kits/os/theme.css',
];

// Physical property -> logical replacement, keyed by the exact CSS property
// name matched (declaration-level, not selector-level — a `left:`/`right:`
// used as a bare positioning offset on an absolutely/fixed-positioned
// element maps to inset-inline-start/end).
const PHYSICAL_RE = /(^|[\s;{])(padding-left|padding-right|margin-left|margin-right|border-left|border-right|border-left-width|border-right-width|border-left-color|border-right-color|left|right)\s*:/gm;
const TEXT_ALIGN_RE = /text-align\s*:\s*(left|right)\b/g;

const LOGICAL_MAP = {
    'padding-left': 'padding-inline-start', 'padding-right': 'padding-inline-end',
    'margin-left': 'margin-inline-start', 'margin-right': 'margin-inline-end',
    'border-left': 'border-inline-start', 'border-right': 'border-inline-end',
    'border-left-width': 'border-inline-start-width', 'border-right-width': 'border-inline-end-width',
    'border-left-color': 'border-inline-start-color', 'border-right-color': 'border-inline-end-color',
    left: 'inset-inline-start', right: 'inset-inline-end',
};

function lineNumberAt(src, index) {
    return src.slice(0, index).split('\n').length;
}

function scanFile(relPath) {
    const abs = path.join(root, relPath);
    if (!fs.existsSync(abs)) return [];
    const src = fs.readFileSync(abs, 'utf8');
    const findings = [];
    let m;
    PHYSICAL_RE.lastIndex = 0;
    while ((m = PHYSICAL_RE.exec(src))) {
        const prop = m[2];
        findings.push({ file: relPath, line: lineNumberAt(src, m.index), property: prop, suggest: LOGICAL_MAP[prop] });
    }
    TEXT_ALIGN_RE.lastIndex = 0;
    while ((m = TEXT_ALIGN_RE.exec(src))) {
        const dir = m[1];
        findings.push({ file: relPath, line: lineNumberAt(src, m.index), property: `text-align: ${dir}`, suggest: `text-align: ${dir === 'left' ? 'start' : 'end'}` });
    }
    return findings;
}

function main() {
    const all = SHEETS.flatMap(scanFile);
    console.log(`lint-rtl-physical-properties: scanned ${SHEETS.length} sheets, found ${all.length} physical left/right declaration(s)`);
    const byFile = {};
    for (const f of all) (byFile[f.file] ||= []).push(f);
    for (const [file, findings] of Object.entries(byFile)) {
        console.log(`\n${file} (${findings.length}):`);
        for (const f of findings) console.log(`  line ${f.line}: ${f.property}  ->  ${f.suggest}`);
    }
    if (all.length) {
        console.log(`\n[FAIL] ${all.length} physical left/right declaration(s) found — these will not mirror correctly under RTL locales`);
        process.exitCode = 1;
    } else {
        console.log('\n[ok] no physical left/right declarations found');
    }
}

main();
