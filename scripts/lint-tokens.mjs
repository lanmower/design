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
    // Shipped-but-unscanned sheets (added 2026-07-28). build.mjs's cssParts
    // list concatenates TWELVE sheets into dist/247420.css; this list reached
    // only eight of them, so 479 lines of published CSS had never been seen by
    // any token scanner while the report said "30 component sheets ... OK".
    // Same coverage-hole shape as the @import barrel and the inline-<style>
    // hole: the rules were right, the scan set was smaller than the report
    // implied. Cross-checked against generate-theme-tokens-doc.mjs's own SHEETS
    // list, which already included all four — this list was the outlier.
    // colors_and_type.css is deliberately still absent: it is the token SOURCE,
    // so its literals are definitions, not bypasses.
    'app-surfaces.css',
    'marketing.css',
    'src/kits/spoint/game-hud.css',
    'src/kits/spoint/host-join-lobby.css',
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

// Extra standalone .css files a consuming project registers via
// DS_LINT_EXTRA_CSS_FILES (comma-separated, absolute or cwd-relative paths).
// COMPONENT_SHEETS above and its @import expansion cover only this repo's own
// tree; a consumer's own stylesheets (e.g. casey's src/dashboard/public/*.css)
// sit entirely outside that graph, so no @import from any barrel here can
// ever reach them. Listed directly rather than expanded through @import,
// since a consumer's sheet is a leaf the consumer's own build already
// resolves, not part of this repo's barrel graph.
function extraCssFiles() {
    const raw = process.env.DS_LINT_EXTRA_CSS_FILES;
    if (!raw) return [];
    return raw.split(',').map((s) => s.trim()).filter(Boolean).map((f) => path.resolve(process.cwd(), f));
}

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
    for (const abs of extraCssFiles()) {
        if (seen.has(abs)) continue;
        seen.add(abs);
        if (!fs.existsSync(abs)) { console.warn('[lint-tokens] missing extra sheet:', abs); continue; }
        order.push(abs);
    }

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

// Resolves a scan-set entry to an absolute path. Every entry produced by
// expandSheets() from COMPONENT_SHEETS/@import is repo-relative; every entry
// contributed by extraCssFiles() is already absolute (it lives outside root
// entirely, so there is no repo-relative form). path.isAbsolute() tells the
// two apart without needing a separate marker on each entry.
export function resolveSheet(rel) {
    return path.isAbsolute(rel) ? rel : path.join(root, rel);
}

// The token source — allowed to define raw values (that IS its job).
// Listed for clarity; simply not scanned.
const TOKEN_SOURCE = 'colors_and_type.css';

// Color-literal matcher: #hex (3/4/6/8), rgb()/rgba(), hsl()/hsla(), oklch()/oklab().
export const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\bokl(?:ch|ab)\(/;

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
export const SPACING_RE = /\b(?:margin|padding|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?\s*:\s*[^;}]*?\d[\d.]*(?:px|em|rem)\b/;

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
export const RADIUS_RE = /(?:-webkit-|-moz-)?border-radius\s*:\s*[^;}]*?\d[\d.]*(?:px|%|em|rem|vw|vh|vmin|vmax|ch)\b/;

// Font-size-literal matcher: a bare numeric length (px/em/rem) on a font-size
// declaration — the raw-literal bypass of the --fs-pico..--fs-mega type scale
// in colors_and_type.css. Same digit-then-unit shape as SPACING_RE/RADIUS_RE so
// it never matches a digit inside a --fs-h3/--fs-h1-app token NAME referenced
// via var(...) on the same declaration.
//
// Units deliberately included:
//   px   the common case; every non-fluid --fs-* rung is a px value
//   em   an em font-size is relative to the PARENT's size, which is a real
//        pattern (inline <code> tracking its paragraph) but also the common
//        shape of un-migrated drift. It is counted, not exempted, so the
//        ratchet forces each one to be justified in a comment rather than
//        silently multiplying — the same treatment SPACING_RE gives `em`.
//   rem  relative to root, i.e. an absolute size in disguise; a --fs-* rung
//        almost always exists for it.
// `%` and viewport units are excluded: a percentage/vw font-size is a
// deliberately fluid relationship with no fixed rung it could ever equal, the
// same reasoning SPACING_RE uses to exclude `%`.
export const FONTSIZE_RE = /\bfont-size\s*:\s*[^;}]*?\d[\d.]*(?:px|em|rem)\b/;

// z-index-literal matcher: any bare integer on a z-index declaration — the
// raw-literal bypass of the --z-below..--z-top stacking scale in
// colors_and_type.css. Unlike every other scanner here there is no unit to
// anchor on (z-index is unitless), so the pattern matches a digit run directly;
// `var(--z-modal)` contains no digit after the colon outside the token name,
// and the token name is inside var(...) which the digit-run cannot reach
// because `-` and letters break the match before any digit in `--z-...` — the
// scale names are all alphabetic, deliberately, so this stays unambiguous.
const ZINDEX_RE = /\bz-index\s*:\s*-?\d/;

// `transition: all` matcher (also `transition-property: all`). This is not a
// token bypass like the others — it is a defect class in its own right: `all`
// makes the browser animate EVERY animatable property that changes, including
// layout-affecting ones (width/height/top/padding), which forces layout+paint
// per frame instead of a compositor-only transform/opacity animation. It also
// silently animates properties a later edit adds to the same rule, so the jank
// appears with no change to the transition itself. The fix is always to name
// the properties actually being animated.
const TRANSITION_ALL_RE = /\btransition(?:-property)?\s*:\s*[^;}]*\ball\b/;

// `!important` matcher. Also not a token bypass: an `!important` wins over the
// cascade regardless of specificity, so a consumer theming or overriding the
// SDK cannot beat it without another `!important`, and the next one after that
// escalates again. Each one is a small permanent loss of themability — the
// exact property this whole lint file exists to protect. A handful are genuinely
// load-bearing (utility resets, print rules, forced-colors/reduced-motion
// overrides that MUST beat component rules), which is why this is a ratchet and
// not a hard zero.
const IMPORTANT_RE = /!\s*important/;

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
        '--accent-primary: #247420', // intentional: brand-lead literal for non-.ds-247420 consumers, see comment above the declaration
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
    // Print-media re-assertion of the paper-tuned signal palette. These are
    // token DEFINITIONS, not consumption: under auto-dark the signal tokens
    // resolve to dark-theme values, and a printed page is paper, so the block
    // re-declares the light-theme values it must print with. There is no token
    // to point at — these ARE the values colors_and_type.css defines for the
    // light theme, restated in a @media print context that cannot reach them.
    // Intentional and non-themable; keep.
    'app-surfaces.css': [
        '--flame:#C53E00', '--amber:#7C570F', '--warn:#E0241A', '--sky:#3A6EFF',
    ],
};

// Radius-scale ALLOW, same per-line contract as ALLOW above.
//
// DEBT, not intentional (added 2026-07-28, when app-surfaces.css and the spoint
// kit sheets were added to COMPONENT_SHEETS and became visible to this gate at
// all — they ship in dist/247420.css and had never been scanned). Every entry
// here has an obvious correct token and belongs to the CSS owner, not to this
// script; they are listed only so widening the perimeter does not hard-fail the
// build on pre-existing literals. This list is DEBT TO DRIVE DOWN: delete each
// entry the moment its declaration moves onto the token. It must not become a
// permanent exemption, and nothing may be added to it to make new code pass.
const RADIUS_ALLOW = {
    // 999px IS var(--r-pill) exactly — a pure find-and-replace.
    'app-surfaces.css': [
        'border-radius: 999px',
    ],
    // 4px IS var(--r-0) exactly. 6px is genuinely off-scale (between --r-0 4px
    // and --r-1 10px) and needs a judgment call from the kit owner: snap to a
    // rung, or keep and comment per the off-scale policy in AGENTS.md.
    'src/kits/spoint/game-hud.css': [
        'border-radius: 4px',
        'border-radius: 6px',
    ],
};

function isRadiusAllowed(rel, line) {
    return (RADIUS_ALLOW[rel] || []).some((s) => line.includes(s));
}

function isAllowed(rel, line) {
    const list = ALLOW[rel] || [];
    return list.some((s) => line.includes(s));
}

// Blank out every /* ... */ comment (including multi-line) while preserving
// line numbers, so a hex inside comment prose is never flagged. Each char of a
// comment becomes a space; newlines inside the comment are kept.
export function stripComments(src) {
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
export function stripThemableLiterals(code) {
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
        const file = resolveSheet(rel);
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
        const file = resolveSheet(rel);
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
            // Honors the audited ALLOW list (shared with findTokenViolations /
            // findSpacingViolations) plus the radius-specific RADIUS_ALLOW.
            // The two lists are kept SEPARATE on purpose: ALLOW entries are
            // matched as substrings of the raw line, so a color entry like
            // '--flame:#C53E00' and a radius entry like 'border-radius: 999px'
            // sharing one list would let either rule's exemption silently
            // exempt the other rule on any line that happened to contain both.
            if (RADIUS_RE.test(code) && !isAllowed(rel, rawLines[i]) && !isRadiusAllowed(rel, rawLines[i])) {
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
        const file = resolveSheet(rel);
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

// Same collection pattern, scanning COMPONENT_SHEETS for a raw font-size
// px/em/rem literal bypassing the --fs-pico..--fs-mega type scale in
// colors_and_type.css. RATCHET-gated (see lintFontSizeOrThrow) rather than a
// hard zero: the residual corpus is dominated by ICON sizes set via font-size
// (a 24px mark inside a 34px chip is matched to its box, not to the type
// ladder, which tops out at --fs-xl/21px before every remaining rung becomes a
// fluid heading clamp) and by deliberately em-relative inline elements
// (<code>/<table> inside a chat bubble must track the bubble's own size, not an
// absolute tier). Both are real judgment calls per declaration, so they carry a
// justifying comment in the sheet instead of a blanket regex exemption.
export function findFontSizeViolations() {
    const violations = [];
    for (const rel of expandSheets()) {
        const file = resolveSheet(rel);
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        // var(--fs-N, <fallback>px) fallback literals are exempt — same
        // reasoning as stripThemableLiterals for colors, lintRadiusOrThrow for
        // --r-N and lintSpacingOrThrow for --space-N: the token drives the live
        // value, the literal only applies if the token is undefined.
        // calc(var(--fs-N) <op> <literal>) is exempt for the same derived-value
        // reason the radius and spacing scanners exempt their own calc() forms.
        // max()/min()/clamp() anchored to an --fs-* token are exempt for the same
        // derived-value reason as calc(). `font-size: max(16px, var(--fs-body))`
        // is not a scale bypass -- it is the iOS auto-zoom guard, where 16px is a
        // platform threshold rather than a type size, and the token still drives
        // the value whenever it is the larger of the two. Flagging it would push
        // authors toward a bare 16px literal, which is strictly worse.
        const codeLines = stripThemableLiterals(stripComments(src))
            .replace(/(?:calc|max|min|clamp)\([^()]*var\(\s*--fs-[\w-]+\s*\)[^()]*\)/g, (m) => m.replace(/[^\n]/g, ' '))
            .split(/\r?\n/);
        const rawLines = src.split(/\r?\n/);
        codeLines.forEach((code, i) => {
            if (FONTSIZE_RE.test(code) && !isAllowed(rel, rawLines[i])) {
                violations.push(`${rel}:${i + 1}: ${rawLines[i].trim()}`);
            }
        });
    }
    return violations;
}

// Same collection pattern, scanning COMPONENT_SHEETS for a raw z-index integer
// bypassing the --z-below..--z-top stacking scale in colors_and_type.css.
// HEAD is clean (0 violations) — every literal was migrated in the pass that
// introduced the scale — so unlike font-size/spacing/!important this one is a
// HARD ZERO gate (lintZIndexOrThrow throws on the first violation), matching
// lintRadiusOrThrow. A raw z-index is exactly the failure mode the scale
// exists to prevent: two unrelated components each picking `9999` and then
// racing on source order, with no way to reason about which layer wins.
export function findZIndexViolations() {
    const violations = [];
    for (const rel of expandSheets()) {
        const file = resolveSheet(rel);
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        // var(--z-N, <fallback>) fallbacks exempt, same reasoning as every
        // other scanner here. calc(var(--z-N) + 1) is exempt too: a derived
        // stacking value still anchored to a rung, not a free-floating number.
        const codeLines = stripThemableLiterals(stripComments(src))
            .replace(/calc\([^()]*var\(\s*--z-[\w-]+\s*\)[^()]*\)/g, (m) => m.replace(/[^\n]/g, ' '))
            .split(/\r?\n/);
        const rawLines = src.split(/\r?\n/);
        codeLines.forEach((code, i) => {
            if (ZINDEX_RE.test(code) && !isAllowed(rel, rawLines[i])) {
                violations.push(`${rel}:${i + 1}: ${rawLines[i].trim()}`);
            }
        });
    }
    return violations;
}

// Scans COMPONENT_SHEETS for `transition: all` / `transition-property: all`.
// HEAD is clean (0 violations), so this is a HARD ZERO gate — and unlike the
// token scanners it can stay one permanently, because there is no legitimate
// use of `all` that a named property list does not express better. See
// TRANSITION_ALL_RE for why it is a defect rather than a style preference.
export function findTransitionAllViolations() {
    const violations = [];
    for (const rel of expandSheets()) {
        const file = resolveSheet(rel);
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        const codeLines = stripComments(src).split(/\r?\n/);
        const rawLines = src.split(/\r?\n/);
        codeLines.forEach((code, i) => {
            if (TRANSITION_ALL_RE.test(code) && !isAllowed(rel, rawLines[i])) {
                violations.push(`${rel}:${i + 1}: ${rawLines[i].trim()}`);
            }
        });
    }
    return violations;
}

// Scans COMPONENT_SHEETS for `!important`. RATCHET-gated: the standing corpus
// is small and most of it is genuinely load-bearing (utility resets that must
// beat component rules, print/forced-colors/prefers-reduced-motion overrides,
// third-party-embed neutralizers), and each surviving one carries its own
// justifying comment. A hard zero would demand rewriting those into
// specificity wars, which is strictly worse. What the ratchet buys is that a
// NEW `!important` — the "I could not work out why my rule lost, so I hammered
// it" case, which is the one that actually erodes themability — cannot land
// silently.
export function findImportantViolations() {
    const violations = [];
    for (const rel of expandSheets()) {
        const file = resolveSheet(rel);
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        const codeLines = stripComments(src).split(/\r?\n/);
        const rawLines = src.split(/\r?\n/);
        codeLines.forEach((code, i) => {
            if (IMPORTANT_RE.test(code) && !isAllowed(rel, rawLines[i])) {
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
// so 649 was the first honest measurement of that corpus. (649 was then driven
// down to 227 by triage passes before the widening recorded below — the exact
// DOWNWARD re-freeze this mechanism is for.)
//
// BASELINE MOVED 227 -> 262 on 2026-07-28, for the SAME reason and by the same
// mechanism: not 35 new literals, but 35 literals that were always shipping and
// were never counted. COMPONENT_SHEETS listed 8 of the 12 sheets build.mjs
// concatenates into dist/247420.css, so app-surfaces.css, marketing.css and the
// two spoint kit sheets (479 lines of published CSS) had never been scanned
// while the report read "30 component sheets ... OK". Adding them to the list
// makes 262 the first honest measurement over the full shipped corpus.
//
// This is the one and only legitimate reason a ratchet number may rise: the
// SCAN SET grew, so previously-uncounted pre-existing debt became visible. A
// rise caused by new code is a regression and must be fixed, not re-frozen.
// Both times the number moved, it moved because the perimeter widened.
//
// 262 is a DEBT FIGURE TO DRIVE DOWN, never a budget to spend. The ratchet only
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

// Shared ratchet driver, factored out of the three ratchet gates so they cannot
// drift apart in behaviour. Semantics are exactly lintSpacingOrThrow's, which
// was hand-rolled first and is left as-is to avoid churning a working gate:
//
//   - `--write-<flag>-baseline` on argv freezes the current count and returns.
//   - a missing baseline file writes an initial one and returns (bootstrap).
//   - count > baseline.count throws; count <= baseline.count passes.
//
// IMPORTANT: a baseline is a DEBT FIGURE TO DRIVE DOWN, never a budget to
// spend. `count <= baseline` passing is a floor, not a target — every triage
// pass that removes violations should re-freeze with the flag so the number
// falls and the gate tightens behind it. Re-freezing UPWARD to make a failing
// run pass defeats the gate entirely: a risen count means new violations
// landed, which is precisely what this exists to catch. The only legitimate
// upward re-freeze is a widened SCAN SET (more sheets now visible), and that
// must be stated in the commit, not assumed.
export function ratchetOrThrow({ label, flag, baselineFile, violations, noun, fix, scope }) {
    const count = violations.length;

    if (process.argv.includes(flag)) {
        fs.writeFileSync(baselineFile, JSON.stringify({ count, updated: new Date().toISOString() }, null, 2) + '\n');
        console.log(`[${label}] wrote baseline count=${count} to ${path.relative(root, baselineFile)}`);
        return;
    }

    if (!fs.existsSync(baselineFile)) {
        fs.writeFileSync(baselineFile, JSON.stringify({ count, updated: new Date().toISOString() }, null, 2) + '\n');
        console.log(`[${label}] no baseline found, wrote initial baseline count=${count}`);
        return;
    }

    const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    if (count > baseline.count) {
        throw new Error(`[${label}] FAIL — ${count} ${noun} exceeds frozen baseline ${baseline.count}:\n  `
            + violations.join('\n  ')
            + `\n[${label}] ${fix} Re-run with ${flag} ONLY if this growth is reviewed and intentional — the baseline is debt to drive down, not a budget to raise.`);
    }
    // `scope` describes WHAT was scanned. It defaults to the component-sheet
    // count because every original caller scans expandSheets(), but the driver
    // is also used by lint-inline-css.mjs, whose scan set is HTML files with
    // inline <style> blocks — printing "N component sheets" there would be a
    // false claim about coverage in the one message a reader trusts to tell
    // them what the gate actually looked at.
    console.log(`[${label}] PASS — ${count} <= baseline ${baseline.count} (${scope || `${expandSheets().length} component sheets`}).`);
}

// Ratchet baseline for raw font-size literals. Frozen at the post-migration
// count; see findFontSizeViolations for why the residual corpus (icon sizes set
// via font-size, and deliberately em-relative inline elements) is a per-
// declaration judgment call rather than a mechanical migration, and see
// ratchetOrThrow for why this number must only ever go DOWN.
//
// BASELINE MOVED 55 -> 64 on 2026-07-28: the four shipped-but-unscanned sheets
// added to COMPONENT_SHEETS (see the note on SPACING_BASELINE_FILE) contributed
// 9 pre-existing literals — a perimeter widening, not a regression. 64 is debt
// to drive down; re-freeze DOWNWARD after any triage pass.
const FONTSIZE_BASELINE_FILE = path.join(root, 'scripts', 'lint-fontsize.baseline.json');

export function lintFontSizeOrThrow() {
    ratchetOrThrow({
        label: 'lint-fontsize',
        flag: '--write-fontsize-baseline',
        baselineFile: FONTSIZE_BASELINE_FILE,
        violations: findFontSizeViolations(),
        noun: `raw font-size literal(s) bypassing the --fs-* type scale from ${TOKEN_SOURCE}`,
        fix: 'Use a --fs-pico/--fs-nano/--fs-micro/--fs-tiny/--fs-xs/--fs-sm/--fs-body/--fs-lg/--fs-xl (or --fs-h*/--fs-hero/--fs-mega) token. If the value is genuinely off-scale — an ICON size matched to its chip box, or an em-relative inline size that must track its parent — leave the literal and add a comment in the sheet saying which, so the next reader does not "fix" it.',
    });
}

// Ratchet baseline for `!important`. See findImportantViolations for why the
// standing corpus is load-bearing and a hard zero would be worse than the
// ratchet, and ratchetOrThrow for why this number must only ever go DOWN.
//
// BASELINE MOVED 38 -> 43 on 2026-07-28: the four shipped-but-unscanned sheets
// added to COMPONENT_SHEETS (see the note on SPACING_BASELINE_FILE) contributed
// 5 pre-existing declarations, all in app-surfaces.css and all in @media print
// or a focus reset — a perimeter widening, not a regression. 43 is debt to
// drive down; re-freeze DOWNWARD after any triage pass.
const IMPORTANT_BASELINE_FILE = path.join(root, 'scripts', 'lint-important.baseline.json');

export function lintImportantOrThrow() {
    ratchetOrThrow({
        label: 'lint-important',
        flag: '--write-important-baseline',
        baselineFile: IMPORTANT_BASELINE_FILE,
        violations: findImportantViolations(),
        noun: '`!important` declaration(s)',
        fix: 'Beat the losing rule on specificity or source order instead — an `!important` cannot be overridden by a consumer theming the SDK without another `!important`, so each one is a permanent hole in the themability this lint file exists to protect. If it is genuinely load-bearing (a utility reset, a print/forced-colors/reduced-motion override that must win), say so in a comment on the line.',
    });
}

// HARD ZERO gate — the --z-* scale migration left the corpus clean, so any
// violation is a genuine regression, not inherited debt. Mirrors
// lintRadiusOrThrow's shape exactly.
export function lintZIndexOrThrow() {
    const violations = findZIndexViolations();
    if (violations.length) {
        throw new Error('[lint-zindex] FAIL — raw z-index literals in component sheets (use var(--z-below/--z-base/--z-raised/--z-sticky/--z-header/--z-drawer/--z-window/--z-dock/--z-dropdown/--z-modal/--z-toast/--z-tooltip/--z-top) from '
            + TOKEN_SOURCE + '):\n  ' + violations.join('\n  ')
            + `\n[lint-zindex] ${violations.length} violation(s). Pick the rung that names what the element IS (a dropdown is --z-dropdown, not "800-ish"); a bare number races on source order against every other bare number in the SDK. If a layer genuinely has no rung, add one to ${TOKEN_SOURCE} rather than a literal here.`);
    }
    console.log('[lint-zindex] OK — ' + expandSheets().length + ' component sheets use only the --z-* stacking scale.');
}

// HARD ZERO gate — the corpus is clean and there is no legitimate `all` that a
// named property list does not express better, so this one never needs a
// ratchet phase.
export function lintTransitionAllOrThrow() {
    const violations = findTransitionAllViolations();
    if (violations.length) {
        throw new Error('[lint-transition-all] FAIL — `transition: all` in component sheets:\n  '
            + violations.join('\n  ')
            + `\n[lint-transition-all] ${violations.length} violation(s). Name the properties you are actually animating (e.g. \`transition: background var(--dur-base) var(--ease), color var(--dur-base) var(--ease)\`). \`all\` animates every changed property including layout ones (width/height/padding/top), forcing layout+paint per frame instead of a compositor-only transform/opacity animation — and it silently starts animating whatever property the NEXT edit adds to the same rule.`);
    }
    console.log('[lint-transition-all] OK — ' + expandSheets().length + ' component sheets animate named properties, never `all`.');
}

// The dark palette is declared TWICE in the token source: once for the explicit
// [data-theme="ink"], [data-theme="dark"] opt-in, and once inside
// @media (prefers-color-scheme: dark) for data-theme="auto". They must define
// the same token set or a token added to one renders its paper-tuned value in
// the other mode. That is not hypothetical: --mascot-deep, --purple-2 and
// --green existed only in the root paper block, so three components rendered
// dark-on-dark and axe-core caught six contrast failures across four kits.
// A comment in the file asks for hand-parity; this makes it a gate instead.
function findDarkBlockParityViolations() {
    const src = fs.readFileSync(path.join(root, TOKEN_SOURCE), 'utf8');
    const bodyAfter = (idx) => {
        if (idx < 0) return null;
        const open = src.indexOf('{', idx);
        if (open < 0) return null;
        let i = open + 1, depth = 1;
        while (i < src.length && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            i++;
        }
        return src.slice(open + 1, i - 1);
    };
    const explicit = bodyAfter(src.indexOf('[data-theme="ink"],'));
    const auto = bodyAfter(src.indexOf('@media (prefers-color-scheme: dark)'));
    if (explicit == null || auto == null) {
        return ['could not locate both dark blocks in ' + TOKEN_SOURCE + ' — the parity gate needs the [data-theme="ink"], selector and the @media (prefers-color-scheme: dark) block'];
    }
    const names = (body) => new Set([...body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    const a = names(explicit), b = names(auto);
    const onlyExplicit = [...a].filter((t) => !b.has(t));
    const onlyAuto = [...b].filter((t) => !a.has(t));
    const out = [];
    for (const t of onlyExplicit) out.push(t + ': in [data-theme=ink|dark] but NOT in @media (prefers-color-scheme: dark) — renders its paper value under data-theme="auto" on a dark OS');
    for (const t of onlyAuto) out.push(t + ': in @media (prefers-color-scheme: dark) but NOT in [data-theme=ink|dark] — renders its paper value when the theme is set explicitly');
    return out;
}

export function lintDarkParityOrThrow() {
    const violations = findDarkBlockParityViolations();
    if (violations.length) {
        throw new Error('[lint-dark-parity] FAIL — the two dark palette blocks in ' + TOKEN_SOURCE + ' declare different token sets:\n  '
            + violations.join('\n  ')
            + `\n[lint-dark-parity] ${violations.length} token(s) out of parity. Add the missing declaration to the other block. Both blocks must stay token-for-token identical: one serves the explicit ink/dark opt-in and one serves data-theme="auto" on a dark OS, and a token present in only one renders its paper-tuned value in the other mode — which is invisible until someone opens that specific combination.`);
    }
    console.log('[lint-dark-parity] OK — both dark palette blocks declare the same ' + names0() + ' tokens.');
}
function names0() {
    const src = fs.readFileSync(path.join(root, TOKEN_SOURCE), 'utf8');
    const i = src.indexOf('[data-theme="ink"],');
    const open = src.indexOf('{', i);
    let j = open + 1, depth = 1;
    while (j < src.length && depth > 0) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
    return new Set([...src.slice(open + 1, j - 1).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])).size;
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
    try { lintZIndexOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
    try { lintDarkParityOrThrow(); }
    catch (e) { console.error(String(e.message || e)); failed = true; }
    try { lintTransitionAllOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
    try { lintSpacingOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
    try { lintFontSizeOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
    try { lintImportantOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
    try { lintTokensJsonInSyncOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
}
