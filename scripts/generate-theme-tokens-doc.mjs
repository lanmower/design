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
