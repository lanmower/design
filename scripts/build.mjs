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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

const SCOPE = '.ds-247420';
const TAILWIND_CDN = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';

const cssParts = [
    ['vendor/fonts.css', path.join(root, 'vendor/fonts.css')],
    ['colors_and_type.css', path.join(root, 'colors_and_type.css')],
    ['app-shell.css', path.join(root, 'app-shell.css')],
];

async function fetchTailwind() {
    try {
        const res = await fetch(TAILWIND_CDN);
        if (!res.ok) throw new Error('tailwind cdn ' + res.status);
        return await res.text();
    } catch (err) {
        console.warn('[247420] tailwind fetch failed:', err.message);
        return '';
    }
}

const tailwindCss = await fetchTailwind();

let raw = '';
if (tailwindCss) raw += `/* tailwind */\n${tailwindCss}\n`;
for (const [label, file] of cssParts) {
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

// Rewrite local font URLs to absolute unpkg URLs. The SDK CSS is injected
// via <style> at runtime so relative ./fonts/ paths resolve against the
// consumer's page (404). Anchoring at unpkg keeps the SDK self-contained.
const FONT_BASE = 'https://unpkg.com/anentrypoint-design@latest/dist/fonts/';
raw = raw.replace(/url\(\.?\/?fonts\//g, `url(${FONT_BASE}`);

// Prefix every selector with .ds-247420 so consumers add the class on a root
// element to opt in. Skip @-rules and :root (which we rewrite to the scope).
const prefixed = (await postcss([
    prefixer({
        prefix: SCOPE,
        transform: (prefix, selector, prefixedSelector) => {
            if (!selector || /^@/.test(selector)) return selector;
            // Map :root and html/body to the scope itself so design tokens land
            // on the consumer's wrapping element.
            if (/^:root\b/.test(selector)) return prefix;
            // <html class="ds-247420"> — body is a child, needs descendant selector.
            if (/^html\b/.test(selector)) return selector.replace(/^html\b/, prefix);
            if (/^body\b/.test(selector)) return selector.replace(/^body\b/, prefix + ' body');
            // Keep @keyframes, @font-face, ::-pseudo selectors untouched
            if (/^(from|to|\d+%)$/.test(selector)) return selector;
            // Attribute / class selectors at the start mean "same element as scope"
            // (e.g. <html class="ds-247420" data-theme="auto">), so produce a
            // compound selector without the descendant-space.
            if (/^\[/.test(selector)) return prefix + selector;
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
