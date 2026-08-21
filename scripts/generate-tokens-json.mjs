#!/usr/bin/env node
// Generates tokens.json from colors_and_type.css — a flat, machine-readable
// snapshot of every design-system CSS custom property and its default value,
// grouped by the section comments already present in the source file.
//
// This is a standalone, read-only script: it does NOT participate in the
// `build` pipeline and does NOT touch dist/. Run manually (`npm run tokens`)
// whenever colors_and_type.css changes and a fresh tokens.json is wanted.
//
// Extraction is intentionally simple regex-based scanning, not a full CSS
// parser: colors_and_type.css's `:root { --token: value; }` declarations
// (plus the [data-theme=...]/[data-density=...]/[data-accent=...] override
// blocks) are line-oriented and consistent enough that a parser is not
// needed for this use case.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const SRC = path.join(root, 'colors_and_type.css');
const OUT = path.join(root, 'tokens.json');

const css = fs.readFileSync(SRC, 'utf8');

// Split into top-level blocks: `selector { ...body... }`. This is a simple
// brace-depth scan rather than a regex match so that values containing
// nested parens/functions (color-mix(), clamp(), var(), url()) never
// truncate the block early.
function splitBlocks(text) {
    const blocks = [];
    let i = 0;
    while (i < text.length) {
        const braceStart = text.indexOf('{', i);
        if (braceStart === -1) break;
        const selector = text.slice(i, braceStart).trim();
        let depth = 1;
        let j = braceStart + 1;
        while (j < text.length && depth > 0) {
            if (text[j] === '{') depth++;
            else if (text[j] === '}') depth--;
            j++;
        }
        const body = text.slice(braceStart + 1, j - 1);
        blocks.push({ selector, body, start: i, end: j });
        i = j;
    }
    return blocks;
}

// Strip comments first so a commented-out declaration or a selector inside
// a /* ... */ block never gets picked up.
function stripComments(text) {
    return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Pull out the section comment headers (the `/* === ... === */` banners) so
// each token can be attributed to the human-authored category it sits under.
// This walks the ORIGINAL (comment-intact) text and records, for each
// comment block, the char offset immediately after it — the category then
// applies to every declaration up to the next section banner.
function extractSections(text) {
    const sections = [];
    const re = /\/\*\s*=+[\s\S]*?=+\s*\*\//g;
    let m;
    while ((m = re.exec(text))) {
        const commentBody = m[0];
        // A section banner is a multi-line comment containing a title line
        // between two '====' rules; pull the first non-blank, non-'='-only
        // line as the label.
        const lines = commentBody
            .split('\n')
            .map((l) => l.replace(/^\s*\/?\*+\s?/, '').replace(/\*+\/\s*$/, '').trim())
            .filter((l) => l && !/^=+$/.test(l));
        if (!lines.length) continue;
        sections.push({ label: lines[0], offset: m.index + commentBody.length });
    }
    return sections;
}

function categoryFor(offset, sections) {
    let label = 'uncategorized';
    for (const s of sections) {
        if (s.offset <= offset) label = s.label;
        else break;
    }
    return label;
}

// Slugify a section label into a short JSON-friendly group key.
function slug(label) {
    return label
        .toLowerCase()
        .replace(/247420 design system\s*[-—]*\s*/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'root';
}

const sections = extractSections(css);
const noCommentCss = stripComments(css);
const blocks = splitBlocks(noCommentCss);

// Selectors we extract tokens from: :root and every themed/attribute
// override block. Media-query-wrapped blocks (prefers-color-scheme) are
// handled by re-splitting their body for nested selector blocks.
const DECL_RE = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;

const grouped = {};
const flat = {};

function recordToken(name, value, selectorLabel, charOffset) {
    const category = selectorLabel === ':root'
        ? categoryFor(charOffset, sections)
        : `override:${selectorLabel}`;
    const groupKey = slug(category === 'uncategorized' ? selectorLabel : category);
    if (!grouped[groupKey]) grouped[groupKey] = {};
    // Only the FIRST occurrence within :root's base categories is the
    // "default" value; override blocks are recorded under their own group
    // so :root defaults are never clobbered by a theme override.
    if (!(name in grouped[groupKey])) grouped[groupKey][name] = value;
    if (selectorLabel === ':root' && !(name in flat)) flat[name] = value;
}

for (const block of blocks) {
    const sel = block.selector.replace(/\s+/g, ' ').trim();
    // Only interested in blocks that are plain rule bodies containing `--`
    // declarations (skip @media wrapper blocks themselves; their nested
    // rule blocks were already split out by splitBlocks since it scans the
    // whole text linearly and re-enters on the next `{`).
    if (sel.startsWith('@media')) continue;
    if (!block.body.includes('--')) continue;

    let selectorLabel = sel;
    // `:root` and the nested-scope-guarded `:root:not(:where(.ds-247420
    // .ds-247420))` (see colors_and_type.css's token-bible/elevation blocks)
    // are the same logical root for extraction purposes -- the guard only
    // matters at render time, not to this token inventory.
    if (sel === ':root' || sel.startsWith(':root:not(')) selectorLabel = ':root';

    let m;
    DECL_RE.lastIndex = 0;
    while ((m = DECL_RE.exec(block.body))) {
        const name = `--${m[1]}`;
        const value = m[2].trim();
        recordToken(name, value, selectorLabel, block.start);
    }
}

const output = {
    generatedFrom: 'colors_and_type.css',
    generatedAt: new Date().toISOString(),
    tokenCount: Object.keys(flat).length,
    tokens: flat,
    groups: grouped,
};

fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n', 'utf8');

console.log(`tokens.json written: ${Object.keys(flat).length} root tokens, ${Object.keys(grouped).length} groups -> ${path.relative(root, OUT)}`);
