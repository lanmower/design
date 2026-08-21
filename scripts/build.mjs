#!/usr/bin/env node
// Bundles the 247420 SDK into a single minified, scope-prefixed ESM file.
// CSS is namespaced under `.ds-247420` so it cannot leak into consumer
// styles or fight other optimized bundles (Tailwind, RippleUI, etc.).
import { build } from 'esbuild';
import postcss from 'postcss';
import prefixer from 'postcss-prefix-selector';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { lintTokensOrThrow, lintRadiusOrThrow, lintSpacingOrThrow, lintFontSizeOrThrow, lintZIndexOrThrow, lintTransitionAllOrThrow, lintImportantOrThrow, lintTokensJsonInSyncOrThrow } from './lint-tokens.mjs';
import { lintGlyphsOrThrow } from './lint-glyphs.mjs';
import { lintNullChildrenOrThrow } from './lint-null-children.mjs';
import { lintClassesOrThrow } from './lint-classes.mjs';
import { lintInlineStylesOrThrow } from './lint-inline-styles.mjs';
import { lintDuplicateSelectorsOrThrow } from './lint-duplicate-selectors.mjs';
import { lintInlineCssOrThrow } from './lint-inline-css.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

// Themability gate: refuse to build if any component sheet hard-codes a raw
// color literal. Runs unconditionally (not via npm prebuild hook) so it holds
// under flatspace/CI runners that skip lifecycle scripts.
lintTokensOrThrow();

// Radius gate: refuse to build if any component sheet hard-codes a raw
// border-radius literal bypassing the --r-hair/--r-0/--r-1/--r-2/--r-3/
// --r-4/--r-pill scale. Same unconditional placement as the other lints.
lintRadiusOrThrow();

// z-index gate: refuse to build if any component sheet hard-codes a raw
// z-index integer bypassing the --z-below..--z-top stacking scale. A HARD zero
// (not a ratchet) — the migration that introduced the scale left the corpus
// clean, so any hit is a fresh regression. Same unconditional placement.
lintZIndexOrThrow();

// `transition: all` gate: refuse to build on `transition: all` /
// `transition-property: all`, which animates every changed property including
// layout ones (forcing layout+paint per frame) and silently picks up whatever
// property the next edit adds to the same rule. HARD zero; the corpus is clean
// and a named property list always expresses the intent better.
lintTransitionAllOrThrow();

// Spacing gate (ratchet): fails the build only if raw margin/padding/gap
// literals bypassing the --space-0..--space-10 8pt scale INCREASE beyond the
// frozen baseline in scripts/lint-spacing.baseline.json (356 hits across 9
// component sheets as of the pass that froze it — same ratchet mechanism as
// thebird's scripts/lint-i18n-ratchet.mjs). Prevents new bypasses from being
// added silently without requiring the whole pre-existing corpus to be
// triaged in one sitting; promote to a hard zero (matching
// lintRadiusOrThrow's own trajectory) once it is.
lintSpacingOrThrow();

// Font-size gate (ratchet): fails the build only if raw font-size literals
// bypassing the --fs-pico..--fs-mega type scale INCREASE beyond the frozen
// baseline in scripts/lint-fontsize.baseline.json. Ratchet rather than hard
// zero because the residual corpus is icon sizes set via font-size and
// deliberately em-relative inline elements — per-declaration judgment calls,
// each carrying a justifying comment in its sheet. Drive the baseline DOWN.
lintFontSizeOrThrow();

// `!important` gate (ratchet): fails the build only if the count INCREASES
// beyond the frozen baseline in scripts/lint-important.baseline.json. Each
// `!important` is a permanent hole in the themability the token gates above
// protect — a consumer cannot beat one without another. The standing corpus is
// load-bearing (utility resets, print/forced-colors/reduced-motion overrides);
// what the ratchet stops is a NEW one landing silently.
lintImportantOrThrow();

// Inline-<style> gate (ratchet): the four token scanners above read .css files
// only, so CSS inside an HTML <style> block was never scanned by any gate — a
// coverage hole, not a rule failure, exactly like the @import barrel that made
// ~5,500 lines of split sheets invisible while the gate said OK. This runs the
// SAME color/radius/spacing/font-size matchers over those blocks. A ratchet
// rather than a hard zero because several of these pages are SPECIMENS whose
// job is demonstrating a value; the survivors each carry a comment at their own
// site saying why they are off-scale. Drive the baseline DOWN.
lintInlineCssOrThrow();

// tokens.json sync gate: refuse to build if colors_and_type.css's :root
// values or site.yaml's accent_from/accent_to have drifted from tokens.json
// (the single source of truth — see scripts/generate-tokens-css.mjs).
lintTokensJsonInSyncOrThrow();

// Glyph gate: refuse to build if any source hard-codes a decorative unicode
// glyph (the machine-shaped tell the design system bans). Same unconditional
// placement so the regression guard holds under any runner.
lintGlyphsOrThrow();

// Null-children gate: webjsx applyDiff crashes (reading 'key') on a bare null
// among VElement siblings - every conditional-children array must be
// .filter(Boolean)'d. Two live crashes are on record; this lint makes the
// discipline durable instead of comment-maintained.
lintNullChildrenOrThrow();

// Class-prefix gate: components emit only family-prefixed (or frozen-legacy)
// class tokens, so kit internals never collide with consumer CSS inside the
// .ds-247420 mount scope.
lintClassesOrThrow();

// Inline-style gate: no layout properties in style= attributes (ui_kits/site
// scope for now) — layout lives in classes so responsive rules stay in-sheet.
lintInlineStylesOrThrow();

// Duplicate-selector gate: refuse to build if any selector in the concatenated
// cssParts bundle is redefined elsewhere (same file or another) with a
// DIFFERENT rule body — the exact bug class hand-fixed for .ds-kbd/
// .ds-field-*/.ds-session-row/.cli. Runs after cssParts below is only used
// for the bundle itself, but the lint owns its own mirrored file list so it
// can run standalone via lint-all.mjs too.
lintDuplicateSelectorsOrThrow();

const SCOPE = '.ds-247420';

// Fonts: system-font stack only, no @import/@font-face in colors_and_type.css.
// There is no local vendor/fonts.css — the earlier cssParts entry referenced a
// file that never existed and logged "missing css" every build. The font-URL
// rewrite below (url(./fonts/) -> unpkg) is retained as a guard for any future
// self-hosted @font-face but is a no-op today.
//
// app-shell.css itself was split into src/css/app-shell/*.css (by component
// family: topbar, panel/row, files, chat polish, workspace shell, etc) so no
// single source sheet is thousands of lines. The root app-shell.css stays a
// real, working file (it is a published package export consumed directly via
// <link> by preview/*.html and ui_kits/*/index.html, never through this
// build) — it now just re-exports the split files via @import, in the same
// order, so a direct-link consumer sees identical rules. For the BUNDLED
// dist output, this build reads the split files directly and concatenates
// them with NO per-file header inserted between them (unlike every other
// cssPart below) — that concatenation is byte-identical to the original
// monolithic app-shell.css, which is what keeps dist/247420.css unchanged.
const appShellSplitDir = path.join(root, 'src/css/app-shell');
const appShellSplitFiles = [
    'base.css',
    'topbar.css',
    'primitives.css',
    'panel-row.css',
    'hero-content.css',
    'responsive.css',
    'chat-basic.css',
    'files.css',
    'catalog-theme.css',
    'chat-polish.css',
    'sidebar-misc.css',
    'states-interactions.css',
    'loading-alerts.css',
    'responsive2-workspace.css',
    'row-print.css',
    'data-density.css',
    'kits-appended.css',
    'git-status.css',
    'plugins-config.css',
    'models-config.css',
    'skills-config.css',
    'slider.css',
    'otp-input.css',
    'carousel.css',
    'calendar.css',
    'collab.css',
];
let appShellContent = '';
for (const name of appShellSplitFiles) {
    const file = path.join(appShellSplitDir, name);
    if (!fs.existsSync(file)) { console.warn('[247420] missing app-shell split part:', name); continue; }
    appShellContent += fs.readFileSync(file, 'utf8');
}

const cssParts = [
    ['colors_and_type.css', path.join(root, 'colors_and_type.css')],
    ['app-shell.css', null], // content supplied directly below (split-file reassembly)
    ['community.css', path.join(root, 'community.css')],
    ['chat.css', path.join(root, 'chat.css')],
    ['editor-primitives.css', path.join(root, 'editor-primitives.css')],
    ['community-app.css', path.join(root, 'community-app.css')],
    ['app-surfaces.css', path.join(root, 'app-surfaces.css')],
    ['gm-prose.css', path.join(root, 'gm-prose.css')],
    ['marketing.css', path.join(root, 'marketing.css')],
    ['spoint/loading-screen.css', path.join(root, 'src/kits/spoint/loading-screen.css')],
    ['spoint/game-hud.css', path.join(root, 'src/kits/spoint/game-hud.css')],
    ['spoint/host-join-lobby.css', path.join(root, 'src/kits/spoint/host-join-lobby.css')],
];

let raw = '';
for (const [label, file] of cssParts) {
    if (label === 'app-shell.css') {
        // Reassembled from the split source files above (see appShellContent) —
        // same label/header shape as every other part, so byte order in the
        // final bundle is unaffected by the source-file reorganization.
        raw += `\n/* ${label} */\n${appShellContent}`;
        continue;
    }
    if (!fs.existsSync(file)) { console.warn('[247420] missing css:', label); continue; }
    raw += `\n/* ${label} */\n${fs.readFileSync(file, 'utf8')}`;
}

// Copy fonts/ into dist/fonts/ so font URLs (rewritten to dist/fonts/ below)
// resolve at unpkg against the published package.
const fontsSrc = path.join(root, 'vendor/fonts');
const fontsDst = path.join(dist, 'fonts');
if (fs.existsSync(fontsSrc)) {
    fs.mkdirSync(fontsDst, { recursive: true });
    for (const name of fs.readdirSync(fontsSrc)) {
        fs.copyFileSync(path.join(fontsSrc, name), path.join(fontsDst, name));
    }
    console.log('[247420] copied fonts:', fs.readdirSync(fontsDst).length, 'files');
}

// raw.githack.com, not jsDelivr: jsDelivr caches a GitHub @main branch
// reference for up to 12h regardless of purge (confirmed by direct
// investigation, 2026-08-13 — a purge forces a real edge cache MISS but
// jsDelivr's own backend re-serves its still-stale resolution of what
// commit "main" points to). githack fetches straight from GitHub with a
// 60s max-age and was confirmed byte-identical to the GitHub source
// immediately after a fix landed.
const FONT_BASE = 'https://raw.githack.com/AnEntrypoint/design/main/dist/fonts/';
raw = raw.replace(/url\(\.?\/?fonts\//g, `url(${FONT_BASE}`);

// Prefix every selector with .ds-247420 so consumers add the class on a root
// element to opt in. Skip @-rules and :root (which we rewrite to the scope).
const prefixed = (await postcss([
    prefixer({
        prefix: SCOPE,
        transform: (prefix, selector, prefixedSelector) => {
            if (!selector || /^@/.test(selector)) return selector;
            // Map :root and html/body to the scope itself so design tokens land
            // on the consumer's wrapping element. Preserve any trailing
            // pseudo-class chain (e.g. `:root:not(:is(.ds-247420 .ds-247420))`,
            // used to keep a nested scope from re-triggering the base token
            // rule) instead of discarding it -- a bare `return prefix` here
            // would silently strip that guard at build time.
            if (/^:root\b/.test(selector)) return selector.replace(/^:root\b/, prefix);
            // <html class="ds-247420"> — body is a child, needs descendant selector.
            if (/^html\b/.test(selector)) return selector.replace(/^html\b/, prefix);
            if (/^body\b/.test(selector)) return selector.replace(/^body\b/, prefix + ' body');
            // Keep @keyframes, @font-face, ::-pseudo selectors untouched
            if (/^(from|to|\d+%)$/.test(selector)) return selector;
            // Attribute / class selectors at the start mean "same element as scope"
            // (e.g. <html class="ds-247420" data-theme="auto">), so produce a
            // compound selector without the descendant-space.
            if (/^\[/.test(selector)) return prefix + selector;
            // Selectors that already start with the scope class (descendant
            // combinator) are self-scoped — don't double-prefix.
            if (selector.startsWith(prefix + ' ') || selector === prefix) return selector;
            return prefixedSelector;
        },
    }),
]).process(raw, { from: undefined })).css;

fs.writeFileSync(path.join(dist, '247420.css'), prefixed);
console.log('[247420] css scoped+bundled:', (prefixed.length / 1024).toFixed(1) + 'kb under', SCOPE);

// gzip the scoped CSS once; ship as base64. The runtime decoder uses the
// browser-native DecompressionStream (streaming, bounded RAM — never holds
// more than one chunk at a time).
const gz = zlib.gzipSync(Buffer.from(prefixed, 'utf8'), { level: 9 });
const b64 = gz.toString('base64');
console.log('[247420] css gzip+base64:', (b64.length / 1024).toFixed(1) + 'kb (raw',
    (prefixed.length / 1024).toFixed(1) + 'kb, ratio',
    (b64.length / prefixed.length * 100).toFixed(1) + '%)');

// Inject the compressed payload into src/styles.js for the JS bundle, then
// restore. Runtime decoder is small and library-free.
const stylesPath = path.join(root, 'src/styles.js');
const stylesOriginal = fs.readFileSync(stylesPath, 'utf8');
const decoderRuntime = `
export const scope = ${JSON.stringify(SCOPE)};
const cssGzB64 = ${JSON.stringify(b64)};

function b64ToBytes(b64) {
    if (typeof atob === 'function') {
        const bin = atob(b64);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }
    return Uint8Array.from(Buffer.from(b64, 'base64'));
}

let _cssPromise = null;
export function loadCss() {
    if (_cssPromise) return _cssPromise;
    _cssPromise = (async () => {
        const bytes = b64ToBytes(cssGzB64);
        // DecompressionStream is browser-native and streaming — never holds
        // more than one chunk, so RAM stays bounded regardless of CSS size.
        const stream = new Response(
            new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
        );
        return await stream.text();
    })();
    return _cssPromise;
}

// Lazy getter — kept for back-compat with code that read \`css\` directly.
// Resolves to the decoded string after first \`loadCss()\` / \`installStyles()\`.
export let css = '';
loadCss().then(s => { css = s; });
`;
fs.writeFileSync(stylesPath, decoderRuntime);

try {
    await build({
        entryPoints: [
            path.join(root, 'src/index.js'),
        ],
        outdir: dist,
        entryNames: '247420.[name]',
        bundle: true,
        // game-editor-kit modules import the kit by its bare specifier; alias
        // that to the source entry so bundling resolves instead of recursing
        // through the published dist file.
        alias: { 'anentrypoint-design': path.join(root, 'src/index.js') },
        format: 'esm',
        platform: 'browser',
        target: ['es2022'],
        minify: true,
        sourcemap: false,
        legalComments: 'none',
        logLevel: 'info',
    });
    // Rename 247420.index.js -> 247420.js for the public entry.
    const idx = path.join(dist, '247420.index.js');
    if (fs.existsSync(idx)) fs.renameSync(idx, path.join(dist, '247420.js'));
} finally {
    fs.writeFileSync(stylesPath, stylesOriginal);
}

const sz = fs.statSync(path.join(dist, '247420.js')).size;
console.log('[247420] js minified bundle:', (sz / 1024).toFixed(1) + 'kb');

// TypeScript declarations: regenerate types/*.d.ts from the same extraction
// that produces docs/component-props.md, so a build can never publish a
// bundle whose shipped `types` entry describes a stale component surface.
// Generated (not merely checked) here because the .d.ts is a BUILD ARTIFACT
// of the source signatures, exactly like dist/247420.js is — the CI staleness
// gate is `npm run lint:component-types`, which fails when a committed
// declaration no longer matches the source it claims to describe.
const typesGen = spawnSync(process.execPath, [path.join(__dirname, 'generate-component-types.mjs')], {
    cwd: root, encoding: 'utf8',
});
if (typesGen.status !== 0) {
    console.error(typesGen.stdout || '', typesGen.stderr || '');
    throw new Error('[247420] component type generation failed');
}
process.stdout.write(typesGen.stdout || '');
