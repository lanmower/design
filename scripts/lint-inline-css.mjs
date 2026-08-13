#!/usr/bin/env node
// Inline-<style> coverage gate: the SAME token scanners lint-tokens.mjs runs
// over .css files, run over the CSS that lives inside <style> blocks in HTML.
//
// WHY THIS EXISTS. lint-tokens.mjs scans .css files only. Its scan set is
// expandSheets() — COMPONENT_SHEETS plus their transitive @import graph — and
// every entry in that graph is, by construction, a file ending in .css. An
// HTML file carrying a <style> block therefore contained real, declaration-
// bearing CSS that NO gate had ever looked at: raw px literals bypassing the
// --space-*/--fs-* scales, raw hex bypassing the token layer, raw border-radius
// bypassing --r-*. The gate reported green over ground it never scanned.
//
// This is the same defect shape as the @import barrel hole: `app-shell.css`
// listed in COMPONENT_SHEETS scanned 24 lines of @import statements and zero
// declarations, so ~5,500 lines of split sheets were invisible while the gate
// said OK. Both are coverage holes, not rule failures — the rules were correct,
// they were simply pointed at less ground than the reader believed. The fix in
// both cases is to widen the scan set, not to loosen the rule.
//
// Run: `node scripts/lint-inline-css.mjs`. Also wired into lint-css.mjs's
// CHECKS list and build.mjs alongside the .css gates.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    COLOR_RE,
    SPACING_RE,
    RADIUS_RE,
    FONTSIZE_RE,
    stripComments,
    stripThemableLiterals,
    ratchetOrThrow,
} from './lint-tokens.mjs';
import { walkManyDirs } from './lint-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Directories whose .html files are scanned for inline <style> blocks. These
// are the two trees that carry hand-authored demo/specimen pages; src/ emits
// its CSS through the real stylesheets and has no inline <style> to scan.
const SCAN_DIRS = ['preview', 'ui_kits'].map((d) => path.join(root, d));

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

// Blank every character of `s` except newlines, so a replacement preserves both
// the byte offsets and the line numbering of what it replaced. Every masking
// step below uses this — line numbers in a violation must point at the real
// line in the real file, or the report is worse than no report.
const blank = (s) => s.replace(/[^\n]/g, ' ');

// Returns a string the same length and line-count as `html`, in which ONLY the
// contents of <style>...</style> survive; everything else is spaces.
//
// Three things are masked out, and each one is a false-positive source that a
// naive `match(/<style>([^]*?)<\/style>/)` would walk straight into:
//
//   1. Markup outside <style>. Body text on a swatch page legitimately PRINTS
//      `#247420` as its own visible content — that is the page's entire job —
//      and `<meta name="theme-color" content="#247420">` is required markup.
//      Neither is a CSS declaration and neither is themable through a token.
//
//   2. HTML comments (<!-- ... -->). A comment is not CSS even when it sits
//      between <style> tags, and comment prose in these files DOES discuss
//      literal values ("--on-color (#fff) fails WCAG AA"). The color scanner
//      already had a comment-desync bug once; masking comments BEFORE the
//      <style> scan, in the same length-preserving way, is what keeps line
//      numbers exact instead of drifting by the comment's length.
//
//   3. style="..." attributes. These are inline styles, not stylesheet CSS.
//      They are governed by lint-inline-styles.mjs (a different rule with a
//      different remedy), and several carry deliberate literals — e.g.
//      colors-semantic.html's `color:#000`, which is there because a comment
//      on the line proves both --on-color and --ink FAIL WCAG AA against
//      --sky and only true black clears 4.5:1. Flagging that would push an
//      author toward a token that is measurably inaccessible. Masking them
//      also prevents an attribute's `>` or a quoted `</style>` from being
//      mistaken for markup structure.
//
// Order matters: comments and attributes are masked first, so a <style> tag
// that appears INSIDE a comment or inside an attribute string is already gone
// by the time we look for style blocks.
export function extractStyleBlocks(html) {
    const masked = html
        .replace(/<!--[^]*?-->/g, blank)
        .replace(/\bstyle\s*=\s*"[^"]*"/g, blank)
        .replace(/\bstyle\s*=\s*'[^']*'/g, blank);

    let out = blank(masked);
    const re = /<style\b[^>]*>([^]*?)<\/style\s*>/gi;
    let m;
    while ((m = re.exec(masked)) !== null) {
        // m[1] is the block body; splice it back in at its true offset so the
        // surviving CSS sits on exactly the lines it occupies in the file.
        const start = m.index + m[0].indexOf('>', m[0].indexOf('<style')) + 1;
        out = out.slice(0, start) + m[1] + out.slice(start + m[1].length);
    }
    return out;
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

// Per-file allowlist, same contract as lint-tokens.mjs's ALLOW: a line is exempt
// if it contains the substring AND the file matches. Keep tiny and audited.
//
// EMPTY BY DESIGN. Every literal in the corpus was either migrated onto a token
// or is genuinely off-scale, and the off-scale ones are handled by the ratchet
// with a comment at the site (see the mechanism note below) rather than by an
// exemption here. An entry added later must say WHY, in the entry.
const ALLOW = {};

function isAllowed(rel, line) {
    return (ALLOW[rel] || []).some((s) => line.includes(s));
}

// Collect the repo-relative HTML files in scan scope, sorted for stable output.
export function inlineStyleFiles() {
    return walkManyDirs(SCAN_DIRS, new Set(['.html']), { skipDirs: new Set(['node_modules', 'vendor', 'dist']) })
        .map((f) => path.relative(root, f).split(path.sep).join('/'))
        .sort();
}

// The four scanners, sharing one driver. Each mirrors its .css counterpart in
// lint-tokens.mjs exactly — same regex, same var()-fallback and calc() exemptions
// — because a literal is no more acceptable inside a <style> block than inside a
// .css file, and a rule that differs by file extension is a rule authors cannot
// hold in their head.
const SCANNERS = [
    {
        key: 'color',
        re: COLOR_RE,
        // stripThemableLiterals already neutralizes var(--t, #fallback) and
        // box-shadow/text-shadow tints.
        pre: (code) => code,
    },
    {
        key: 'radius',
        re: RADIUS_RE,
        pre: (code) => code.replace(/calc\([^()]*var\(\s*--r-[\w-]+\s*\)[^()]*\)/g, blank),
    },
    {
        key: 'spacing',
        re: SPACING_RE,
        pre: (code) => code.replace(/calc\([^()]*var\(\s*--space-[\w-]+\s*\)[^()]*\)/g, blank),
    },
    {
        key: 'fontsize',
        re: FONTSIZE_RE,
        pre: (code) => code.replace(/(?:calc|max|min|clamp)\([^()]*var\(\s*--fs-[\w-]+\s*\)[^()]*\)/g, blank),
    },
];

// Returns violation strings across every scanner, tagged with which rule fired.
// Pure; no exit/log, so build.mjs and lint-css.mjs can both drive it.
export function findInlineCssViolations() {
    const violations = [];
    for (const rel of inlineStyleFiles()) {
        const src = fs.readFileSync(path.join(root, rel), 'utf8');
        const rawLines = src.split(/\r?\n/);
        // <style> bodies only, then the SAME two strip passes the .css scanners
        // run: CSS /* */ comments, then themable var() fallbacks and shadow
        // tints. Both are length-preserving, so `i` still indexes rawLines.
        const css = stripThemableLiterals(stripComments(extractStyleBlocks(src)));
        for (const { key, re, pre } of SCANNERS) {
            pre(css).split(/\r?\n/).forEach((code, i) => {
                if (re.test(code) && !isAllowed(rel, rawLines[i])) {
                    violations.push(`${rel}:${i + 1}: [${key}] ${rawLines[i].trim()}`);
                }
            });
        }
    }
    return violations.sort();
}

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

// MECHANISM: RATCHET, not a hard zero, and not a blanket per-file allowlist.
//
// A hard zero is wrong here for a reason specific to this corpus: several of
// these pages are SPECIMENS whose job is to demonstrate a value. A swatch page
// showing `--green` legitimately needs a fixed swatch box; a type-scale page
// legitimately renders a size that is not on the ladder in order to show what
// being off the ladder looks like. Forcing those onto tokens would change the
// thing the page exists to demonstrate.
//
// A per-file allowlist is also wrong: it would exempt those files WHOLESALE,
// so the next genuinely-wrong literal added to a specimen page would land
// silently — which is the precise failure the gate is being built to stop. The
// pages most likely to accumulate raw CSS are exactly the ones an allowlist
// would stop watching.
//
// The ratchet keeps every file under watch while allowing individually-justified
// off-scale values to remain, each carrying a comment at its own site saying why
// (the same treatment findFontSizeViolations gives icon sizes). And per AGENTS.md
// it is a DEBT FIGURE TO DRIVE DOWN, never a budget: re-freeze DOWNWARD with
// --write-inline-css-baseline after any triage pass, never upward to make a
// failing run pass.
const BASELINE_FILE = path.join(root, 'scripts', 'lint-inline-css.baseline.json');

export function lintInlineCssOrThrow() {
    const files = inlineStyleFiles();
    ratchetOrThrow({
        label: 'lint-inline-css',
        flag: '--write-inline-css-baseline',
        baselineFile: BASELINE_FILE,
        violations: findInlineCssViolations(),
        scope: `${files.length} HTML files with inline <style>`,
        noun: 'raw color/radius/spacing/font-size literal(s) inside inline <style> blocks bypassing the token scales in colors_and_type.css',
        fix: 'Use the token (var(--space-N) / var(--fs-N) / var(--r-N) / a color token) — an inline <style> block is ordinary CSS and gets no exemption for living in an HTML file. If the value is genuinely off-scale because the page is a SPECIMEN demonstrating that exact value (a swatch box dimension, a deliberately off-ladder type size), leave the literal and add a comment at the site saying so, and re-freeze the baseline DOWNWARD to whatever you reached.',
    });
}

// CLI entry: `node scripts/lint-inline-css.mjs`.
if (process.argv[1]?.endsWith('lint-inline-css.mjs')) {
    try { lintInlineCssOrThrow(); }
    catch (e) { console.error(e.message); process.exit(1); }
}
