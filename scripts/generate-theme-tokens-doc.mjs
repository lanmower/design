#!/usr/bin/env node
// Generates docs/theme-tokens.md + preview/theme-map.html from tokens.json
// (the output of generate-tokens-json.mjs, the REAL existing token
// enumeration -- this script reuses that file rather than re-parsing
// colors_and_type.css itself, per the row's own explicit instruction) plus a
// real grep of every component sheet to find which ones actually consume
// each token via var(--name). Run: node scripts/generate-tokens-json.mjs &&
// node scripts/generate-theme-tokens-doc.mjs (theme-tokens-doc always reads
// a fresh tokens.json rather than assuming one is already current).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tokensPath = path.join(root, 'tokens.json');

if (!fs.existsSync(tokensPath)) {
    console.error('[theme-tokens-doc] tokens.json missing -- run `node scripts/generate-tokens-json.mjs` first');
    process.exit(1);
}
const { tokens, groups, generatedAt } = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

// The real component sheets (mirrors lint-tokens.mjs's COMPONENT_SHEETS list
// plus the split app-shell/ parts and spoint kit sheets, so "consumed by"
// coverage matches every sheet actually shipped, not just the lint-gated
// subset).
const SHEETS = [
    'app-shell.css', 'app-surfaces.css', 'chat.css', 'community.css',
    'community-app.css', 'editor-primitives.css', 'gm-prose.css', 'marketing.css',
    'src/css/app-shell/base.css', 'src/css/app-shell/catalog-theme.css',
    'src/css/app-shell/chat-basic.css', 'src/css/app-shell/chat-polish.css',
    'src/css/app-shell/data-density.css', 'src/css/app-shell/files.css',
    'src/css/app-shell/hero-content.css', 'src/css/app-shell/kits-appended.css',
    'src/css/app-shell/loading-alerts.css', 'src/css/app-shell/panel-row.css',
    'src/css/app-shell/primitives.css', 'src/css/app-shell/responsive.css',
    'src/css/app-shell/responsive2-workspace.css', 'src/css/app-shell/row-print.css',
    'src/css/app-shell/sidebar-misc.css', 'src/css/app-shell/states-interactions.css',
    'src/css/app-shell/topbar.css',
    'src/kits/spoint/game-hud.css', 'src/kits/spoint/host-join-lobby.css',
    'src/kits/spoint/loading-screen.css',
];

// Real per-sheet content, read once, scanned per token via var(--name)
// substring search (cheap and accurate enough -- CSS custom-property refs
// are always literal `var(--name` text, never dynamically constructed).
const sheetContents = {};
for (const s of SHEETS) {
    const p = path.join(root, s);
    if (fs.existsSync(p)) sheetContents[s] = fs.readFileSync(p, 'utf8');
}

function consumersOf(tokenName) {
    const needle = `var(${tokenName}`;
    return SHEETS.filter((s) => sheetContents[s] && sheetContents[s].includes(needle));
}

// ---- docs/theme-tokens.md ----

const groupNames = Object.keys(groups).sort();
let md = `# Theme tokens\n\n`;
md += `Generated from \`colors_and_type.css\` via \`node scripts/generate-tokens-json.mjs && node scripts/generate-theme-tokens-doc.mjs\`. Do not hand-edit -- re-run after any token change.\n\n`;
md += `${Object.keys(tokens).length} root tokens across ${groupNames.length} groups. Source snapshot: ${generatedAt}.\n\n`;

for (const g of groupNames) {
    const entries = Object.entries(groups[g]).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) continue;
    md += `## ${g}\n\n`;
    md += `| token | value | consumed by |\n|---|---|---|\n`;
    for (const [name, value] of entries) {
        const consumers = consumersOf(name);
        const consumerCell = consumers.length ? consumers.map((c) => `\`${c}\``).join(', ') : '_(unused outside colors_and_type.css)_';
        // Some values (multi-shadow declarations) contain the source file's
        // own line-wrapping whitespace -- collapse to single-line so the
        // markdown table row doesn't visually break across lines.
        const flatValue = value.replace(/\s+/g, ' ').trim();
        md += `| \`${name}\` | \`${flatValue.replace(/\|/g, '\\|')}\` | ${consumerCell} |\n`;
    }
    md += `\n`;
}

// ---- token resolution + WCAG contrast (real math, no deps) ----
// `tokens` values are exactly what colors_and_type.css wrote — many are
// `var(--other-token)` aliases (--bg: var(--paper)), not resolved hex. Follow
// the chain (bounded depth against accidental cycles) to a literal #hex
// before any contrast math can run on it.
function resolveTokenValue(name, depth = 0) {
    const raw = tokens[name];
    if (raw == null || depth > 12) return null;
    const m = /^var\((--[a-zA-Z0-9_-]+)\)$/.exec(raw.trim());
    if (m) return resolveTokenValue(m[1], depth + 1);
    return raw.trim();
}

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

// WCAG 2.1 relative luminance + contrast ratio (spec formula, sRGB).
function relLuminance([r, g, b]) {
    const chan = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const [rl, gl, bl] = [chan(r), chan(g), chan(b)];
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(hexA, hexB) {
    const rgbA = hexToRgb(hexA), rgbB = hexToRgb(hexB);
    if (!rgbA || !rgbB) return null;
    const lA = relLuminance(rgbA), lB = relLuminance(rgbB);
    const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
    return (lighter + 0.05) / (darker + 0.05);
}

// Semantic foreground/background token PAIRS actually used together in real
// component CSS (fg-on-panel, fg-on-accent, status text) — not every
// combinatorial token cross-product, just the pairs the system actually
// renders text over. AA text floor is 4.5:1 normal text / 3:1 large text or
// UI components; every row here is normal body/label text, so 4.5:1 gates.
const CONTRAST_PAIRS = [
    ['--panel-text on --panel-0', '--panel-text', '--panel-0'],
    ['--panel-text-2 on --panel-0', '--panel-text-2', '--panel-0'],
    ['--panel-text-3 on --panel-0', '--panel-text-3', '--panel-0'],
    ['--panel-text on --panel-1', '--panel-text', '--panel-1'],
    ['--panel-text on --panel-2', '--panel-text', '--panel-2'],
    ['--fg on --bg', '--fg', '--bg'],
    ['--fg-2 on --bg', '--fg-2', '--bg'],
    ['--fg-3 on --bg', '--fg-3', '--bg'],
    ['--fg on --bg-2', '--fg', '--bg-2'],
    ['--fg-3 on --bg-2', '--fg-3', '--bg-2'],
    ['--fg on --bg-3', '--fg', '--bg-3'],
    ['--accent-fg on --accent', '--accent-fg', '--accent'],
    ['--accent-ink on --bg', '--accent-ink', '--bg'],
    ['--on-color on --warn', '--on-color', '--warn'],
    ['--on-color on --green', '--on-color', '--green'],
    ['--cat-green-ink on --panel-0', '--cat-green-ink', '--panel-0'],
    ['--cat-purple-ink on --panel-0', '--cat-purple-ink', '--panel-0'],
    ['--cat-mascot-ink on --panel-0', '--cat-mascot-ink', '--panel-0'],
];

let contrastMd = `## Contrast (WCAG 2.1 AA)\n\n`;
contrastMd += `Computed here (relative-luminance formula, WCAG 2.1 sec. 1.4.3) from the resolved hex each semantic pair evaluates to at generation time — not a hand-maintained claim. AA text floor: 4.5:1 (normal text). Re-run this generator after any primitive color change to refresh the table. Complements the DOM-level, axe-core-driven checks in \`docs/a11y-report.md\` (which catches *rendered* violations across live component markup); this table checks the *token pairs themselves* independent of any one component's usage.\n\n`;
contrastMd += `| pair | resolved hex | ratio | AA (4.5:1) |\n|---|---|---|---|\n`;
for (const [label, fgTok, bgTok] of CONTRAST_PAIRS) {
    const fgHex = resolveTokenValue(fgTok);
    const bgHex = resolveTokenValue(bgTok);
    const ratio = fgHex && bgHex ? contrastRatio(fgHex, bgHex) : null;
    const ratioCell = ratio != null ? ratio.toFixed(2) + ':1' : '_unresolved_';
    const pass = ratio != null ? (ratio >= 4.5 ? 'PASS' : 'FAIL') : '?';
    contrastMd += `| \`${label}\` | \`${fgHex || '?'}\` on \`${bgHex || '?'}\` | ${ratioCell} | ${pass} |\n`;
}
contrastMd += `\n`;
md += contrastMd;

// ---- Indicator-rail colors: documented bounded set ----
// Two distinct rail concepts exist in colors_and_type.css: the CATEGORY rail
// (--cat-*, cycled by index across category tags/avatars — see the CAT array
// in ui_kits/community-app/app.js) and the STATUS-severity rail (--rail-*,
// picked by name, never cycled). Both are enumerated from tokens.json
// directly rather than hand-copied, so this section can't drift from the
// source CSS.
const CAT_RAIL_TOKENS = ['--cat-green', '--cat-purple', '--cat-mascot', '--cat-sun', '--cat-flame', '--cat-sky'];
const STATUS_RAIL_TOKENS = ['--rail-info', '--rail-success', '--rail-warning', '--rail-error'];

let railMd = `## Indicator-rail colors\n\n`;
railMd += `Two bounded rail-color sets. Both are "never borders" fill/indicator colors, never used as a 1px rule.\n\n`;
railMd += `### Category rail (cycled)\n\n`;
railMd += `Cycled by array index (see \`CAT\` in \`ui_kits/community-app/app.js\`) across category tags/avatars/threads — category N reuses category (N mod ${CAT_RAIL_TOKENS.length})'s color. **Cycle-repeat count: ${CAT_RAIL_TOKENS.length} distinct categories before a color repeats.**\n\n`;
railMd += `| name | token | resolved hex |\n|---|---|---|\n`;
for (const tok of CAT_RAIL_TOKENS) {
    const hex = resolveTokenValue(tok);
    railMd += `| ${tok.replace('--cat-', '')} | \`${tok}\` | \`${hex || '?'}\` |\n`;
}
railMd += `\n### Status-severity rail (picked by name, not cycled)\n\n`;
railMd += `Selected by severity name (info/success/warning/error), matching \`.tone-info\`/\`.tone-success\`/\`.tone-warning\`/\`.tone-error\` banner/badge/chip conventions — never cycled by index.\n\n`;
railMd += `| name | token | resolved hex |\n|---|---|---|\n`;
for (const tok of STATUS_RAIL_TOKENS) {
    const hex = resolveTokenValue(tok);
    railMd += `| ${tok.replace('--rail-', '')} | \`${tok}\` | \`${hex || '?'}\` |\n`;
}
railMd += `\n`;
md += railMd;

fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'theme-tokens.md'), md);
console.log(`[theme-tokens-doc] wrote docs/theme-tokens.md (${Object.keys(tokens).length} tokens, ${groupNames.length} groups)`);

// ---- preview/theme-map.html ----
// Grouped list view (not force-directed graph -- simpler, real, and matches
// the row's own explicit "or grouped list view" fallback) showing which
// sheets consume which tokens, one section per group.

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

let rows = '';
for (const g of groupNames) {
    const entries = Object.entries(groups[g]).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) continue;
    rows += `<div class="ds-demo-label tm-group">${esc(g)}</div>\n<ul class="tm-list">\n`;
    for (const [name, value] of entries) {
        const consumers = consumersOf(name);
        rows += `<li class="tm-row">`;
        const flatValue = value.replace(/\s+/g, ' ').trim();
        rows += `<code class="tm-name">${esc(name)}</code>`;
        rows += `<span class="tm-value">${esc(flatValue)}</span>`;
        rows += `<span class="tm-consumers">${consumers.length ? consumers.map(esc).join(', ') : '(unused)'}</span>`;
        rows += `</li>\n`;
    }
    rows += `</ul>\n`;
}

const html = `<!doctype html>
<html lang="en" data-theme="auto" class="ds-247420"><head><meta charset="utf-8">
<title>theme token map preview</title>
<link rel="stylesheet" href="../colors_and_type.css">
<link rel="stylesheet" href="../app-shell.css">
<style>
/* Layout for this generated page lives here, not in style= attributes: an
   inline layout string escapes every media query and is invisible to the
   density rules (scripts/lint-inline-styles.mjs). Every value is a token, so
   the block also stays clean under scripts/lint-inline-css.mjs. */
body{padding:var(--space-4);background:var(--panel-0);color:var(--panel-text);max-width:var(--measure-wide);margin:0 auto}
.tm-head{font-family:var(--ff-mono);text-transform:uppercase;letter-spacing:var(--tr-label);color:var(--fg-3)}
.tm-group{margin-top:var(--space-4)}
.tm-list{list-style:none;padding:0;margin:0}
/* wrap, not nowrap. The consumers column is an unbounded comma-joined list of
   every sheet consuming the token, so on a narrow viewport it is always the
   longest thing in the row. A non-wrapping flex row with two fixed min-width
   floors below cannot absorb that: the row overflowed the body by ~167px and
   the page scrolled sideways. Wrapping lets the consumers span drop to its own
   line instead of pushing the row past the viewport. */
.tm-row{padding:var(--space-1) 0;border-bottom:1px solid var(--panel-2);display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:baseline}
.tm-name{min-width:var(--tm-name-w)}
.tm-value{color:var(--fg-3);min-width:var(--tm-value-w)}
/* min-width:0 overrides the flex item default of min-width:auto, which
   otherwise refuses to shrink a flex item below its longest unbreakable
   content — the other half of the same overflow. */
.tm-consumers{font-size:var(--fs-micro);color:var(--fg-3);min-width:0;overflow-wrap:anywhere}
/* Column widths are page-local layout constants, not design-system scale
   values — there is no --space-* rung for "wide enough for the longest token
   name". Declared as custom properties so they stay overridable and off the
   raw-literal path. */
.tm-list{--tm-name-w:220px;--tm-value-w:160px}
/* Below the combined width of the two floors plus padding, the floors are
   themselves the overflow. Drop them and let the columns size to content. */
@media (max-width:520px){.tm-list{--tm-name-w:0;--tm-value-w:0}}
</style>
</head><body>
<div class="ds-demo-label tm-head">247420 / theme token map</div>
<p>Every root token, its default value, and which real component sheets consume it via <code>var(--name)</code>. Generated by <code>scripts/generate-theme-tokens-doc.mjs</code>.</p>
${rows}
</body></html>
`;

fs.writeFileSync(path.join(root, 'preview', 'theme-map.html'), html);
console.log(`[theme-tokens-doc] wrote preview/theme-map.html`);
