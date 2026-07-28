#!/usr/bin/env node
// Themability guard: fail the build if any COMPONENT stylesheet hard-codes a
// raw color literal. The single source of truth for color values is
// colors_and_type.css (the token layer); every other sheet must consume
// var(--token), never a baked hex/rgb/hsl/oklch.
//
// This is what keeps "perfectly themable" true over time — without it, the
// next hand-edit silently re-introduces a literal that ignores the active
// theme. Run standalone (`node scripts/lint-tokens.mjs`) or as part of build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findTokensDrift, findSiteYamlDrift } from './generate-tokens-css.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Sheets that MUST be literal-free (every color comes from a token).
//
// NOTE: entries here are ENTRY POINTS, not necessarily leaf stylesheets. A
// barrel sheet (one whose entire body is `@import url(...)` re-exports, e.g.
// the root app-shell.css re-exporting src/css/app-shell/*.css) contains no
// declarations of its own, so scanning the barrel alone lints nothing. See
// expandSheets() below: every entry is expanded transitively through its
// @import graph so the real leaf sheets are what actually get scanned.
const COMPONENT_SHEETS = [
    'app-shell.css',
    'community.css',
    'chat.css',
    'editor-primitives.css',
    'community-app.css',
    'gm-prose.css',
    'src/kits/os/theme.css',
    'src/kits/os/freddie-dashboard.css',
    'src/kits/spoint/loading-screen.css',
    // Split app-shell sheets that build.mjs bundles into dist (see its
    // appShellSplitFiles list) but that the root app-shell.css barrel does NOT
    // @import — so the @import expansion cannot reach them. Listed directly so
    // they are linted; the FULL_COVERAGE_DIRS guard below is what surfaced the
    // omission. (The barrel gap itself is a separate, real defect: a consumer
    // that <link>s app-shell.css directly gets none of these rules, while the
    // bundled dist/247420.css does include them.)
    'src/css/app-shell/git-status.css',
    'src/css/app-shell/plugins-config.css',
    'src/css/app-shell/models-config.css',
    'src/css/app-shell/skills-config.css',
];

// Directories whose EVERY .css file must end up in the expanded scan set.
// This is the anti-regression guard for the class of bug where a new split
// sheet is dropped into src/css/app-shell/ but never wired into the root
// app-shell.css barrel — it would then be built into dist (build.mjs keeps its
// own appShellSplitFiles list) while remaining invisible to all three
// scanners. The guard makes that divergence a hard lint failure instead of a
// silent hole.
const FULL_COVERAGE_DIRS = ['src/css/app-shell'];

// Resolve a sheet's `@import url('...')` / `@import "..."` targets to
// repo-relative POSIX paths, ignoring remote (http/protocol-relative) imports.
function importTargets(rel, src) {
    const dir = path.posix.dirname(rel.split(path.sep).join('/'));
    const out = [];
    const re = /@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const spec = m[1];
        if (/^(?:[a-z]+:)?\/\//i.test(spec)) continue; // remote import — not ours to lint
        out.push(path.posix.normalize(path.posix.join(dir, spec)));
    }
    return out;
}

// Expand COMPONENT_SHEETS through their @import graph (depth-first, cycle- and
// duplicate-safe), then assert FULL_COVERAGE_DIRS are fully covered. Returns
// the repo-relative leaf paths every scanner iterates. A barrel that imports
// only other sheets contributes no lines of its own, but is kept in the set —
// harmless, and it keeps a stray declaration in a barrel from escaping.
let _expandedCache = null;
export function expandSheets() {
    if (_expandedCache) return _expandedCache;
    const seen = new Set();
    const order = [];
    const visit = (rel) => {
        const key = rel.split(path.sep).join('/');
        if (seen.has(key)) return;
        seen.add(key);
        const file = path.join(root, key);
        if (!fs.existsSync(file)) { console.warn('[lint-tokens] missing:', key); return; }
        order.push(key);
        const src = fs.readFileSync(file, 'utf8');
        for (const t of importTargets(key, src)) visit(t);
    };
    for (const rel of COMPONENT_SHEETS) visit(rel);

    // Coverage guard — every .css in a FULL_COVERAGE_DIRS directory must have
    // been reached by the expansion above.
    const uncovered = [];
    for (const dir of FULL_COVERAGE_DIRS) {
        const abs = path.join(root, dir);
        if (!fs.existsSync(abs)) continue;
        for (const name of fs.readdirSync(abs)) {
            if (!name.endsWith('.css')) continue;
            const key = `${dir}/${name}`;
            if (!seen.has(key)) uncovered.push(key);
        }
    }
    if (uncovered.length) {
        throw new Error('[lint-tokens] FAIL — stylesheet(s) in a full-coverage directory are not reachable from any COMPONENT_SHEETS entry, so they are unlinted:\n  '
            + uncovered.join('\n  ')
            + '\n[lint-tokens] Add an @import for each to the owning barrel sheet (e.g. app-shell.css), or add it directly to COMPONENT_SHEETS in scripts/lint-tokens.mjs.');
    }

    _expandedCache = order;
    return order;
}

// The token source — allowed to define raw values (that IS its job).
// Listed for clarity; simply not scanned.
const TOKEN_SOURCE = 'colors_and_type.css';

// Color-literal matcher: #hex (3/4/6/8), rgb()/rgba(), hsl()/hsla(), oklch()/oklab().
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\bokl(?:ch|ab)\(/;

// Spacing-literal matcher: a bare numeric length (px/em/rem) on a
// margin/padding/gap (or row-gap/column-gap, or any -top/-right/-bottom/-left/
// -inline/-block/-inline-start/-inline-end/-block-start/-block-end logical
// variant) declaration — the raw-literal bypass of the --space-0..--space-10
// 8pt scale defined in colors_and_type.css. The digit must be followed by a
// unit so it never matches a digit inside a --space-3 token NAME referenced
// via var(...) on the same declaration. `%` is deliberately excluded (unlike
// RADIUS_RE): a percentage margin/padding is relative to the containing
// block's size, not a fixed rhythm value, so there is no --space-N it could
// ever equal — flagging it would demand a token that structurally cannot
// exist for that value, the same reasoning RADIUS_RE uses to exempt bare `0`.
const SPACING_RE = /\b(?:margin|padding|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?\s*:\s*[^;}]*?\d[\d.]*(?:px|em|rem)\b/;

// Radius-literal matcher: a bare numeric length/percentage (px/%/em/rem/vw/
// vh/ch/vmin/vmax) on a border-radius (or -webkit-/-moz-prefixed)
// declaration — the raw-literal bypass of the --r-hair/--r-0/--r-1/--r-2/
// --r-3/--r-4/--r-pill scale defined in colors_and_type.css. The digit must
// be followed by a unit so it never matches a digit inside a --r-1/--r-pill
// token NAME referenced via var(...) on the same declaration.
//
// `border-radius: 0` (bare, no unit) is INTENTIONALLY not matched: zero is
// the deliberate absence of rounding (a square-corner reset, e.g. undoing a
// pill/tab shape on hover or in a flattened variant), not a point on the
// rounding scale — there is no --r-* token that means "no radius", so
// flagging it would force a fake token or a force-fit onto the smallest
// real rung (--r-hair, 2px), which is a visible size change, not a
// value-preserving substitution. Same reasoning class as stripThemableLiterals
// treating a var(...) fallback as non-literal: a structural non-bypass,
// not a per-line ALLOW entry.
const RADIUS_RE = /(?:-webkit-|-moz-)?border-radius\s*:\s*[^;}]*?\d[\d.]*(?:px|%|em|rem|vw|vh|vmin|vmax|ch)\b/;

// Per-file allowlist of intentional, justified literals. A line is exempt if it
// contains the substring AND the file matches. Keep this list tiny and audited —
// every entry is a deliberate non-themable value (true-black media frames, etc).
const ALLOW = {
    'src/kits/os/theme.css': [
        '#0b0d10', // intentional: CRT/terminal canvas — a fake black screen
        '#ffffff', // intentional: .app-iframe.web — white canvas for embedded external web content
        '#F5F0E4', // thebird named-theme preset token definition (now also in colors_and_type.css; kept harmless)
        '#EFE9DB',
        '#E3DAC7',
    ],
    'editor-primitives.css': [
        'background: #000', // intentional: lightbox video letterbox — true black media frame
    ],
    // DEBT, not intentional (added 2026-07-28, when the @import expansion below
    // first made src/css/app-shell/*.css visible to this gate at all). A 22px-
    // tall toggle track with `border-radius: 11px` is a pill; the correct value
    // is var(--r-pill). It is ALLOW-listed only so the newly-widened scan does
    // not hard-fail the build on a pre-existing literal that the CSS owner —
    // not this script — must fix. Delete this entry the moment the declaration
    // moves onto var(--r-pill); it must not become a permanent exemption.
    'src/css/app-shell/plugins-config.css': [
        'border-radius: 11px',
    ],
};

function isAllowed(rel, line) {
    const list = ALLOW[rel] || [];
    return list.some((s) => line.includes(s));
}

// Blank out every /* ... */ comment (including multi-line) while preserving
// line numbers, so a hex inside comment prose is never flagged. Each char of a
// comment becomes a space; newlines inside the comment are kept.
function stripComments(src) {
    return src.replace(/\/\*[^]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

// Themable literals to neutralize before scanning — each is NOT a baked theme
// color, so flagging it is a false positive that the cascade already proves safe:
//
//   var(--token, #fallback)  the active theme drives the var; the literal only
//                            applies when the token is undefined (a safety
//                            default). The token IS the themable surface.
//   box-shadow ... rgba(...) shadow tints are depth, not theme color; they ride
//                            on every theme unchanged (true-black ambient).
//
// We blank ONLY the literal characters (keeping length) so a BARE literal
// elsewhere on the same line is still caught and line numbers stay exact.
function stripThemableLiterals(code) {
    const blank = (m) => m.replace(/[^\n]/g, ' ');
    return code
        // var(--token, <literal>) — neutralize the fallback literal only.
        .replace(/var\(\s*--[\w-]+\s*,\s*([^()]*?)\s*\)/g, (whole, fallback) =>
            whole.replace(fallback, blank(fallback)))
        // box-shadow / text-shadow rgba|hsla shadow tints.
        .replace(/(?:box|text)-shadow\s*:[^;}]*/g, blank);
}

// Returns the array of violation strings (empty == clean). Pure; no exit/log,
// so build.mjs can call it inline and decide how to fail.
export function findTokenViolations() {
    const violations = [];
    for (const rel of expandSheets()) {
        const file = path.join(root, rel);
        if (!fs.existsSync(file)) { console.warn('[lint-tokens] missing:', rel); continue; }
        const src = fs.readFileSync(file, 'utf8');
        const codeLines = stripThemableLiterals(stripComments(src)).split(/\r?\n/);
        const rawLines = src.split(/\r?\n/);
        codeLines.forEach((code, i) => {
            if (COLOR_RE.test(code) && !isAllowed(rel, rawLines[i])) {
                violations.push(`${rel}:${i + 1}: ${rawLines[i].trim()}`);
            }
        });
    }
    return violations;
}

// Same collection pattern as findTokenViolations, scanning the identical
// COMPONENT_SHEETS list for a raw border-radius px/%/em/rem literal bypassing
// the --r-hair/--r-0/--r-1/--r-2/--r-3/--r-4/--r-pill scale in
// colors_and_type.css. HEAD is clean (0 violations) as of the migration that
// added this gate to build.mjs — lintRadiusOrThrow() is a hard build gate,
// mirroring lintTokensOrThrow, so a raw-radius regression fails the build the
// moment it lands.
export function findRadiusViolations() {
    const violations = [];
    for (const rel of expandSheets()) {
        const file = path.join(root, rel);
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        // var(--r-N, <fallback>px) fallback literals are exempt — same reasoning
        // as stripThemableLiterals for colors: the token drives the live value,
        // the literal is only a safety default when the token is undefined.
        // calc(var(--r-N) <op> <literal>) is exempt too — the expression still
        // scales off the token (a derived value, not a bypass), the same way
        // color-mix(in oklab, var(--danger) 15%, transparent) is not a raw-color
        // violation even though it contains a bare percentage literal.
        const codeLines = stripThemableLiterals(stripComments(src))
            .replace(/calc\([^()]*var\(\s*--r-[\w-]+\s*\)[^()]*\)/g, (m) => m.replace(/[^\n]/g, ' '))
            .split(/\r?\n/);
        const rawLines = src.split(/\r?\n/);
        codeLines.forEach((code, i) => {
            // Honors the same audited ALLOW list as findTokenViolations /
            // findSpacingViolations — previously this scanner ignored it, so a
            // justified (or explicitly debt-tracked) radius literal had no way
            // to be exempted short of weakening RADIUS_RE itself.
            if (RADIUS_RE.test(code) && !isAllowed(rel, rawLines[i])) {
                violations.push(`${rel}:${i + 1}: ${rawLines[i].trim()}`);
            }
        });
    }
    return violations;
}

// Same collection pattern again, scanning COMPONENT_SHEETS for a raw
// margin/padding/gap px/em/rem literal bypassing the --space-0..--space-10
// scale in colors_and_type.css. REPORT-ONLY for now (not wired into
// build.mjs's hard gate, unlike lintTokensOrThrow/lintRadiusOrThrow): a first
// real run against HEAD found 639 hits across 9 sheets — a large one-off
// corpus (many are `em`-relative micro-adjustments, e.g. `.4em`/`.3em` line-
// height nudges, or shorthand pairs like `padding: 8px 16px` that don't
// individually collapse onto a single --space-N without visual judgment
// call). Forcing that into an ALLOW-list or a mass rounding-substitution in
// one pass would either bloat the audited exemption list past the point of
// being audited, or silently change visual rhythm across the whole SDK.
// Mirrors how lintRadiusOrThrow itself started (report-only) before its
// migration landed and it became a hard gate — same trajectory expected here
// once the corpus is triaged file-by-file.
export function findSpacingViolations() {
    const violations = [];
    for (const rel of expandSheets()) {
        const file = path.join(root, rel);
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        // var(--space-N, <fallback>px) fallback literals are exempt — same
        // reasoning as stripThemableLiterals for colors and lintRadiusOrThrow
        // for --r-N: the token drives the live value, the literal is only a
        // safety default when the token is undefined.
        // calc(var(--space-N) <op> <literal>) is exempt too — the expression
        // still scales off the token (a derived value, not a bypass), the
        // same way RADIUS_RE exempts calc(var(--r-N) ...).
        const codeLines = stripThemableLiterals(stripComments(src))
            .replace(/calc\([^()]*var\(\s*--space-[\w-]+\s*\)[^()]*\)/g, (m) => m.replace(/[^\n]/g, ' '))
            .split(/\r?\n/);
        const rawLines = src.split(/\r?\n/);
        codeLines.forEach((code, i) => {
            if (SPACING_RE.test(code) && !isAllowed(rel, rawLines[i])) {
                violations.push(`${rel}:${i + 1}: ${rawLines[i].trim()}`);
            }
        });
    }
    return violations;
}

// Ratchet baseline file — same pattern as thebird's scripts/lint-i18n-ratchet.mjs:
// freeze the CURRENT violation count as a snapshot; the gate only fails if a
// future run's count exceeds that snapshot. This lets the corpus (356 hits as
// of the pass that added this gate, across 9 component sheets — mostly `em`-
// relative micro-adjustments and shorthand pairs like `padding: 8px 16px` that
// don't individually collapse onto a single --space-N without visual judgment)
// stay un-migrated for now without silently growing. Promote to a hard zero
// (delete the ratchet, require the ALLOW list instead) once the corpus is
// triaged down, matching lintRadiusOrThrow's own trajectory.
//
// BASELINE JUMPED 362 -> 649 on 2026-07-28. This is NOT 287 new literals: it
// is 287 literals that were always there and were never being counted. The
// root app-shell.css is an @import barrel over src/css/app-shell/*.css, so
// listing 'app-shell.css' in COMPONENT_SHEETS scanned 24 lines of @import
// statements and zero declarations — all ~5,500 lines of the 21 split sheets
// were invisible to all three scanners. expandSheets() now follows the import
// graph (plus a FULL_COVERAGE_DIRS guard for split files the barrel forgot),
// so 649 is the first honest measurement of the corpus.
//
// 649 is a DEBT FIGURE TO DRIVE DOWN, never a budget to spend. The ratchet only
// enforces "no worse"; every triage pass that migrates declarations onto
// --space-N should re-run with --write-spacing-baseline so the number falls and
// the gate tightens behind it. Do not re-freeze upward to make a failing run
// pass — a rising count means new raw literals landed, which is exactly what
// this gate exists to catch.
const SPACING_BASELINE_FILE = path.join(root, 'scripts', 'lint-spacing.baseline.json');

// Report-only counterpart — logs the violation count instead of throwing.
// Not called from build.mjs; kept for manual inspection.
export function lintSpacingReport() {
    const violations = findSpacingViolations();
    if (violations.length) {
        console.warn('[lint-spacing] REPORT — ' + violations.length + ' raw margin/padding/gap literal(s) bypassing the --space-* scale from '
            + TOKEN_SOURCE + ':\n  ' + violations.slice(0, 20).join('\n  ')
            + (violations.length > 20 ? `\n  ...and ${violations.length - 20} more` : ''));
        return;
    }
    console.log('[lint-spacing] OK — ' + expandSheets().length + ' component sheets use only the --space-* spacing scale.');
}

// Ratchet gate: fails only if the CURRENT violation count exceeds the frozen
// baseline in scripts/lint-spacing.baseline.json. Does not require fixing the
// pre-existing corpus in one pass — it just prevents new raw-spacing
// literals from being added silently to the same 9 sheets. Called from
// build.mjs (replacing the old report-only lintSpacingOrThrow) and the CLI
// entry below. Pass `--write-spacing-baseline` to (re-)freeze the current
// count after a reviewed, intentional change to the corpus.
export function lintSpacingOrThrow() {
    const violations = findSpacingViolations();
    const count = violations.length;

    if (process.argv.includes('--write-spacing-baseline')) {
        fs.writeFileSync(SPACING_BASELINE_FILE, JSON.stringify({ count, updated: new Date().toISOString() }, null, 2) + '\n');
        console.log(`[lint-spacing] wrote baseline count=${count} to ${path.relative(root, SPACING_BASELINE_FILE)}`);
        return;
    }

    let baseline;
    if (fs.existsSync(SPACING_BASELINE_FILE)) {
        baseline = JSON.parse(fs.readFileSync(SPACING_BASELINE_FILE, 'utf8'));
    } else {
        fs.writeFileSync(SPACING_BASELINE_FILE, JSON.stringify({ count, updated: new Date().toISOString() }, null, 2) + '\n');
        console.log(`[lint-spacing] no baseline found, wrote initial baseline count=${count}`);
        return;
    }

    if (count > baseline.count) {
        const msg = '[lint-spacing] FAIL — ' + count + ' raw margin/padding/gap literal(s) bypassing the --space-* scale from '
            + TOKEN_SOURCE + ' exceeds frozen baseline ' + baseline.count + ':\n  ' + violations.join('\n  ')
            + `\n[lint-spacing] Use --space-N tokens for new declarations, or re-run with --write-spacing-baseline if this growth is reviewed/intentional.`;
        throw new Error(msg);
    }
    console.log('[lint-spacing] PASS — ' + count + ' <= baseline ' + baseline.count + ' (' + expandSheets().length + ' component sheets).');
}

// Throws on violation, mirroring lintTokensOrThrow's shape exactly. Called
// from build.mjs (hard gate) and the CLI entry below.
export function lintRadiusOrThrow() {
    const violations = findRadiusViolations();
    if (violations.length) {
        const msg = '[lint-radius] FAIL — raw border-radius literals in component sheets (use var(--r-hair/--r-0/--r-1/--r-2/--r-3/--r-4/--r-pill) from '
            + TOKEN_SOURCE + '):\n  ' + violations.join('\n  ')
            + `\n[lint-radius] ${violations.length} violation(s). If a literal is genuinely non-scale (e.g. a one-off outside every rung), add it to the audited ALLOW list in scripts/lint-tokens.mjs.`;
        throw new Error(msg);
    }
    console.log('[lint-radius] OK — ' + expandSheets().length + ' component sheets use only the --r-* radius scale.');
}

// Throws on violation; build.mjs calls this so a regression fails the build
// even under runners (flatspace) that skip npm lifecycle hooks.
export function lintTokensOrThrow() {
    const violations = findTokenViolations();
    if (violations.length) {
        const msg = '[lint-tokens] FAIL — raw color literals in component sheets (use var(--token) from '
            + TOKEN_SOURCE + '):\n  ' + violations.join('\n  ')
            + `\n[lint-tokens] ${violations.length} violation(s). If a literal is genuinely non-themable, add it to the audited ALLOW list in scripts/lint-tokens.mjs.`;
        throw new Error(msg);
    }
    console.log('[lint-tokens] OK — ' + expandSheets().length + ' component sheets are literal-free (all color from tokens).');
}

// tokens.json <-> colors_and_type.css / site.yaml sync gate: tokens.json is
// the single source of truth for :root token VALUES (generate-tokens-css.mjs
// is the reverse generator); this throws if the committed colors_and_type.css
// or site/content/globals/site.yaml has drifted from it — i.e. it VERIFIES
// the generated output is in sync, it does not police a human-authored
// convention the way lintTokensOrThrow/lintRadiusOrThrow do. Run
// `node scripts/generate-tokens-css.mjs` to re-sync before re-running this.
export function lintTokensJsonInSyncOrThrow() {
    const { cssEdits } = findTokensDrift();
    const { edits: yamlEdits } = findSiteYamlDrift();
    if (cssEdits.length || yamlEdits.length) {
        const lines = [
            ...cssEdits.map((e) => `colors_and_type.css: ${e.name}: "${e.oldValue}" (committed) != "${e.newValue}" (tokens.json)`),
            ...yamlEdits.map((e) => `site.yaml: ${e.key}: "${e.current}" (committed) != "${e.wanted}" (tokens.json)`),
        ];
        throw new Error(`[lint-tokens-json] FAIL — colors_and_type.css / site.yaml out of sync with tokens.json:\n  ${lines.join('\n  ')}\n[lint-tokens-json] Run \`node scripts/generate-tokens-css.mjs\` to re-sync (or \`npm run tokens\` first if the CSS was the one intentionally retuned).`);
    }
    console.log('[lint-tokens-json] OK — colors_and_type.css and site.yaml match tokens.json.');
}

// CLI entry: `node scripts/lint-tokens.mjs`.
if (process.argv[1] && process.argv[1].endsWith('lint-tokens.mjs')) {
    try { lintTokensOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
    try { lintRadiusOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
    lintSpacingOrThrow();
    try { lintTokensJsonInSyncOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
}
