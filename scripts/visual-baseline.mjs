#!/usr/bin/env node
// Visual regression: screenshots every real preview/*.html page in
// light/dark/auto themes via the real playwright devDependency (already
// installed for a11y-audit.mjs), diffs pixel-by-pixel against a committed
// baseline under visual-baselines/, flags deltas above a threshold. Explicit
// CLI invocation only (AGENTS.md: one test.js, no visual-regression test
// infra folder -- this is a script, never wired into test.js).
//
// Usage:
//   node scripts/visual-baseline.mjs update   -- (re)writes the baseline PNGs
//   node scripts/visual-baseline.mjs check    -- diffs current renders against
//                                                  the committed baseline, exits
//                                                  non-zero on any delta above
//                                                  DIFF_THRESHOLD_RATIO
import { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const previewDir = path.join(root, 'preview');
const baselineDir = path.join(root, 'visual-baselines');

const MODE = process.argv[2] || 'check';
if (!['update', 'check'].includes(MODE)) {
    console.error(`[visual-baseline] usage: node scripts/visual-baseline.mjs update|check`);
    process.exit(1);
}

const THEMES = ['paper', 'ink', 'auto'];
// Fraction of pixels allowed to differ before a page is flagged. Anti-aliasing
// / sub-pixel font rendering jitter is real and non-deterministic across runs
// on the same machine -- a 0% threshold would false-positive on noise, not
// signal. 0.5% is tight enough to catch a real visual regression (a moved
// panel, a broken token) while tolerant of rendering noise.
const DIFF_THRESHOLD_RATIO = 0.005;

function listPreviewFiles() {
    return readdirSync(previewDir)
        .filter((f) => f.endsWith('.html') && f !== 'index.html' && f !== 'theme-map.html')
        .sort();
}

// Pixel-diff two same-sized PNGs. Returns {diffRatio, diffCount, totalPixels}.
// Hand-rolled (no pixelmatch dep) -- exact per-channel delta over a tolerance
// band, which is all a byte-identical-render regression check needs; no
// perceptual/anti-aliasing-aware comparison required for this use case.
function diffPngs(a, b) {
    if (a.width !== b.width || a.height !== b.height) {
        return { diffRatio: 1, diffCount: a.width * a.height, totalPixels: a.width * a.height, sizeMismatch: true };
    }
    const totalPixels = a.width * a.height;
    let diffCount = 0;
    const TOLERANCE = 12; // per-channel 0-255 delta tolerance for anti-aliasing noise
    for (let i = 0; i < a.data.length; i += 4) {
        const dr = Math.abs(a.data[i] - b.data[i]);
        const dg = Math.abs(a.data[i + 1] - b.data[i + 1]);
        const db = Math.abs(a.data[i + 2] - b.data[i + 2]);
        if (dr > TOLERANCE || dg > TOLERANCE || db > TOLERANCE) diffCount++;
    }
    return { diffRatio: diffCount / totalPixels, diffCount, totalPixels, sizeMismatch: false };
}

async function screenshotPage(page, file, theme) {
    await page.goto(pathToFileURL(path.join(previewDir, file)).href, { waitUntil: 'networkidle' });
    await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
    // Let the theme's CSS custom-property cascade + any transition settle
    // before capturing -- a screenshot mid-transition is a false positive
    // waiting to happen.
    await page.waitForTimeout(150);
    return page.screenshot({ fullPage: true });
}

async function main() {
    const files = listPreviewFiles();
    mkdirSync(baselineDir, { recursive: true });
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    const results = [];
    for (const file of files) {
        for (const theme of THEMES) {
            const key = `${file.replace(/\.html$/, '')}--${theme}.png`;
            const buf = await screenshotPage(page, file, theme);
            const baselinePath = path.join(baselineDir, key);

            if (MODE === 'update') {
                writeFileSync(baselinePath, buf);
                results.push({ key, status: 'updated' });
                continue;
            }

            if (!existsSync(baselinePath)) {
                results.push({ key, status: 'no-baseline' });
                continue;
            }
            const current = PNG.sync.read(buf);
            const baseline = PNG.sync.read(readFileSync(baselinePath));
            const { diffRatio, sizeMismatch } = diffPngs(current, baseline);
            const flagged = sizeMismatch || diffRatio > DIFF_THRESHOLD_RATIO;
            results.push({ key, status: flagged ? 'CHANGED' : 'ok', diffRatio: Number(diffRatio.toFixed(4)), sizeMismatch });
        }
    }

    await browser.close();

    if (MODE === 'update') {
        console.log(`[visual-baseline] wrote ${results.length} baseline screenshots to ${path.relative(root, baselineDir)}/`);
        return;
    }

    const changed = results.filter((r) => r.status === 'CHANGED');
    const noBaseline = results.filter((r) => r.status === 'no-baseline');
    console.log(`[visual-baseline] ${results.length} screenshots checked (${THEMES.length} themes x ${files.length} pages)`);
    if (noBaseline.length) {
        console.log(`[visual-baseline] ${noBaseline.length} page(s) with no committed baseline (run 'update' first):`);
        for (const r of noBaseline) console.log(`  - ${r.key}`);
    }
    if (changed.length) {
        console.log(`[visual-baseline] ${changed.length} page(s) exceeded the ${(DIFF_THRESHOLD_RATIO * 100).toFixed(1)}% diff threshold:`);
        for (const r of changed) console.log(`  - ${r.key}: ${r.sizeMismatch ? 'SIZE MISMATCH' : (r.diffRatio * 100).toFixed(2) + '% pixels changed'}`);
        process.exit(1);
    }
    console.log('[visual-baseline] no regressions detected');
}

main().catch((e) => { console.error('[visual-baseline] fatal:', e); process.exit(1); });
