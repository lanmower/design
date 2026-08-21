#!/usr/bin/env node
// Reverse of generate-tokens-json.mjs: makes tokens.json the SOURCE for
// colors_and_type.css's `:root` custom-property VALUES (and the two
// hand-synced hex scalars in site/content/globals/site.yaml), instead of the
// CSS being hand-edited and the JSON being a downstream snapshot.
//
// Why this is a surgical value-splice, not a full-file regenerate from JSON:
// tokens.json's `groups` keys are LOSSY slugs of selector text (e.g.
// "override-data-theme-ink-data-theme-dark" collapses the two-selector list
// `[data-theme="ink"],\n[data-theme="dark"]` into one string that cannot be
// deterministically un-slugged back to valid CSS in the general case), and
// tokens.json stores no comments at all -- colors_and_type.css carries load-
// bearing inline rationale (WCAG contrast-ratio notes) on many declarations
// that a from-scratch regenerate would silently drop, plus non-custom-
// property rules (:focus-visible, .with-grid-overlay, the reduced-motion
// media query) that tokens.json never captured in the first place. Given
// that, "tokens.json is the source of truth" is implemented here as: walk
// colors_and_type.css's own `:root { }` blocks (there are three, all
// selector `:root`, matched in file order so plain-object drift can't
// misattribute across the different override blocks) and correct only a
// `--name: value;` VALUE when it differs from tokens.json.tokens[name] --
// indentation, trailing comments, and every other rule/selector in the file
// stay exactly as authored. Override blocks ([data-theme=...], [data-
// density=...], [data-accent=...], [data-typescale=...]) are intentionally
// NOT reconciled here -- tokens.json's flat `tokens` map only ever holds
// :root values (see generate-tokens-json.mjs's recordToken), so there is no
// single authoritative value per override token to diff against; they stay
// hand-authored, same as the non-variable CSS rules.
//
// Run: node scripts/generate-tokens-css.mjs           -- writes corrected values
//      node scripts/generate-tokens-css.mjs --check    -- reports drift, exit 1 on any, no write
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const CSS_FILE = path.join(root, 'colors_and_type.css');
const TOKENS_FILE = path.join(root, 'tokens.json');
const SITE_YAML = path.join(root, 'site', 'content', 'globals', 'site.yaml');

// Blanks /* ... */ comments in place (same length, newlines preserved) so
// declaration offsets stay 1:1 aligned with the ORIGINAL raw text -- unlike
// generate-tokens-json.mjs's stripComments (which shortens the string and is
// fine there since it only feeds a category-label lookup), here we need to
// splice corrected values back into the untouched raw string by index.
function blankComments(text) {
    return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

// Same brace-depth block scan as generate-tokens-json.mjs's splitBlocks, run
// on the blanked (offset-preserving) text so comments never confuse brace
// counting, but positions still index into the real `raw` string.
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
        blocks.push({ selector, bodyStart: braceStart + 1, bodyEnd: j - 1 });
        i = j;
    }
    return blocks;
}

const DECL_RE = /(--[a-zA-Z0-9-]+)(\s*:\s*)([^;]+)(;)/g;

// Whitespace-insensitive equality for a CSS declaration value. CSS collapses
// any run of whitespace (including newlines) to a single separator, so two
// values differing only in wrapping or indentation are the same declaration.
// Also normalises the space after a comma so a wrapped comma-separated list
// compares equal to the single-line form of itself.
function sameCssValue(a, b) {
    const norm = (v) => String(v).replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
    return norm(a) === norm(b);
}

// Returns { cssEdits, yamlEdits } -- neither applied. Pure, so lint-tokens.mjs
// can call it inline to gate the build without duplicating this logic.
export function findTokensDrift() {
    const raw = fs.readFileSync(CSS_FILE, 'utf8');
    const tokensDoc = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    const flat = tokensDoc.tokens || {};

    const blanked = blankComments(raw);
    // `:root` and the nested-scope-guarded `:root:not(:where(.ds-247420
    // .ds-247420))` (see colors_and_type.css's token-bible/elevation
    // blocks) are the same logical root for drift-detection purposes.
    const isRootSelector = (sel) => sel === ':root' || sel.startsWith(':root:not(');
    const blocks = splitBlocks(blanked).filter(
        (b) => isRootSelector(b.selector) && blanked.slice(b.bodyStart, b.bodyEnd).includes('--')
    );

    const cssEdits = [];
    for (const block of blocks) {
        const bodyRaw = raw.slice(block.bodyStart, block.bodyEnd);
        let m;
        DECL_RE.lastIndex = 0;
        while ((m = DECL_RE.exec(bodyRaw))) {
            const name = m[1];
            const oldValue = m[3].trim();
            if (!(name in flat)) continue; // token no longer in JSON -- leave CSS alone; forward generator will re-pick it up
            const newValue = flat[name];
            // Multi-line token values (the --shadow-* stack pairs two comma-
            // separated layers across two lines) carry the CSS file's own
            // newline + continuation indent, which tokens.json does not
            // reproduce byte-for-byte. A strict compare therefore reported
            // three shadow tokens as permanently drifted even though the
            // values are character-identical once whitespace runs collapse --
            // it passed on CRLF checkouts and failed CI on LF ones, which is
            // exactly the shape of a whitespace-sensitive comparison. Compare
            // semantically; CSS treats any whitespace run as one separator.
            if (sameCssValue(newValue, oldValue)) continue;
            const absStart = block.bodyStart + m.index + m[1].length + m[2].length;
            const absEnd = absStart + m[3].length;
            cssEdits.push({ start: absStart, end: absEnd, name, oldValue, newValue });
        }
    }

    return { cssEdits, raw, tokensDoc };
}

// site.yaml's accent_from/accent_to are hand-synced hex scalars (see the
// "keep in sync with colors_and_type.css" comment above them) mirroring
// --green/--green-2. YAML is not parsed generically here (no yaml dep in
// this package) -- these two are simple `key: "value"` scalar lines, so a
// targeted line regex is enough and avoids adding a parsing dependency for
// two fields.

export function findSiteYamlDrift() {
    if (!fs.existsSync(SITE_YAML)) return [];
    const yaml = fs.readFileSync(SITE_YAML, 'utf8');
    const tokensDoc = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    const flat = tokensDoc.tokens || {};
    const edits = [];
    const map = { accent_from: '--green', accent_to: '--green-2' };
    for (const [key, tokenName] of Object.entries(map)) {
        const wanted = flat[tokenName];
        if (!wanted) continue;
        const re = new RegExp(`^(${key}:\\s*")([^"]*)(")`, 'm');
        const m = yaml.match(re);
        if (!m) continue;
        const current = m[2];
        if (current.toLowerCase() !== wanted.toLowerCase()) {
            edits.push({ key, tokenName, current, wanted, re });
        }
    }
    return { yaml, edits };
}

function applyCssEdits(raw, edits) {
    const sorted = [...edits].sort((a, b) => b.start - a.start);
    let out = raw;
    for (const e of sorted) out = out.slice(0, e.start) + e.newValue + out.slice(e.end);
    return out;
}

function main() {
    const checkOnly = process.argv.includes('--check');
    const { cssEdits, raw } = findTokensDrift();
    const { yaml, edits: yamlEdits } = findSiteYamlDrift();

    console.log(`[generate-tokens-css] scanned :root declarations against tokens.json.`);
    if (!cssEdits.length) {
        console.log('[generate-tokens-css] colors_and_type.css :root values already match tokens.json.');
    } else {
        console.log(`[generate-tokens-css] ${cssEdits.length} value(s) differ from tokens.json:`);
        for (const e of cssEdits) console.log(`  ${e.name}: "${e.oldValue}" -> "${e.newValue}"`);
    }

    if (!yamlEdits.length) {
        console.log('[generate-tokens-css] site.yaml accent_from/accent_to already match tokens.json.');
    } else {
        console.log(`[generate-tokens-css] ${yamlEdits.length} site.yaml value(s) differ from tokens.json:`);
        for (const e of yamlEdits) console.log(`  ${e.key}: "${e.current}" -> "${e.wanted}"`);
    }

    if (!cssEdits.length && !yamlEdits.length) {
        process.exit(0);
    }

    if (checkOnly) {
        console.error(`[generate-tokens-css] FAIL (--check): drift found between tokens.json and its generated targets.`);
        process.exit(1);
    }

    if (cssEdits.length) {
        fs.writeFileSync(CSS_FILE, applyCssEdits(raw, cssEdits), 'utf8');
        console.log(`[generate-tokens-css] wrote ${cssEdits.length} corrected value(s) to colors_and_type.css`);
    }
    if (yamlEdits.length) {
        let out = yaml;
        for (const e of yamlEdits) {
            out = out.replace(e.re, `$1${e.wanted}$3`);
        }
        fs.writeFileSync(SITE_YAML, out, 'utf8');
        console.log(`[generate-tokens-css] wrote ${yamlEdits.length} corrected value(s) to site.yaml`);
    }
}

if (process.argv[1] && process.argv[1].endsWith('generate-tokens-css.mjs')) {
    main();
}
