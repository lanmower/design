#!/usr/bin/env node
// Visual regression gate: screenshots every preview/*.html page in each theme
// via CDP `Page.captureScreenshot`, diffs pixel-by-pixel against the committed
// baseline under visual-baselines/, fails on any delta above threshold.
//
// No browser-automation package and no image library (AGENTS.md ban + the same
// no-new-dependency spirit): ./cdp.mjs talks to an already-running Chrome over
// the built-in WebSocket, and ./png-diff.mjs decodes the PNG bytes itself using
// only node:zlib. Nothing here installs or launches a browser.
//
// Usage:
//   node scripts/visual-baseline.mjs check    -- diff against baseline (default)
//   node scripts/visual-baseline.mjs update   -- re-capture the baseline PNGs
//   BASE_URL / CDP_BASE override the endpoints.
import { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withPage, cdpAvailable, CDP_BASE } from './cdp.mjs';
import { diffPngBuffers } from './png-diff.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const previewDir = join(root, 'preview');
const baselineDir = join(root, 'visual-baselines');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8899';

const THEMES = ['paper', 'ink', 'auto'];
// `data-theme="auto"` defers to `prefers-color-scheme`, so an unpinned capture
// renders light on one machine and dark on another and the baseline can never
// match both. Pin the emulated preference to `light` — that is what the
// committed --auto baselines were captured under (they are byte-identical to
// their --paper siblings), so pinning keeps them valid instead of forcing a
// machine-specific re-freeze. Real dark rendering is still covered by --ink.
const EMULATED_COLOR_SCHEME = 'light';
// Baselines were captured at this size; changing it invalidates every one of
// them (the diff would be a pure size mismatch), so it is fixed here.
const VIEWPORT = { width: 1280, height: 900 };

// Fraction of pixels allowed to differ before a page is flagged. Antialiasing
// and sub-pixel font rendering jitter is real and non-deterministic even on the
// same machine, so a 0% threshold false-positives on noise rather than signal.
// 0.5% still catches a real regression (a moved panel, a broken token).
const DIFF_THRESHOLD_RATIO = 0.005;
// Per-channel 0-255 delta below which a pixel is considered unchanged.
const CHANNEL_TOLERANCE = 24;

function listPreviewFiles() {
    return readdirSync(previewDir)
        .filter((f) => f.endsWith('.html') && f !== 'index.html' && f !== 'theme-map.html')
        .sort();
}

const baselineName = (file, theme) => `${file.replace(/\.html$/, '')}--${theme}.png`;

async function captureAll(onShot) {
    const files = listPreviewFiles();
    const shots = [];
    for (const file of files) {
        const url = `${BASE_URL}/preview/${file}`;
        // One page load per file; themes are swapped in-page so the three
        // captures are guaranteed to be of identical layout+content.
        await withPage(url, async (page) => {
            await page.setColorScheme(EMULATED_COLOR_SCHEME);
            for (const theme of THEMES) {
                await page.setTheme(theme);
                const png = await page.screenshot();
                shots.push({ file, theme, name: baselineName(file, theme), png });
                if (onShot) onShot(file, theme);
            }
        }, VIEWPORT);
    }
    return shots;
}

async function main() {
    const mode = process.argv[2] || 'check';
    if (!['check', 'update'].includes(mode)) {
        console.error('[visual-baseline] usage: node scripts/visual-baseline.mjs check|update');
        process.exit(1);
    }

    if (!(await cdpAvailable())) {
        console.error(`[visual-baseline] no CDP endpoint at ${CDP_BASE}.`);
        console.error('[visual-baseline] start Chrome with --headless --remote-debugging-port=9333 (a workflow step or your own browser; this script never launches one) and serve the repo at ' + BASE_URL);
        process.exit(1);
    }

    mkdirSync(baselineDir, { recursive: true });
    const shots = await captureAll();

    if (mode === 'update') {
        for (const s of shots) writeFileSync(join(baselineDir, s.name), s.png);
        console.log(`[visual-baseline] wrote ${shots.length} baseline PNG(s) to visual-baselines/.`);
        return;
    }

    const failures = [];
    const missing = [];
    for (const s of shots) {
        const path = join(baselineDir, s.name);
        if (!existsSync(path)) {
            missing.push(s.name);
            continue;
        }
        const d = diffPngBuffers(readFileSync(path), s.png, { channelTolerance: CHANNEL_TOLERANCE });
        if (d.sizeMismatch) {
            failures.push(`${s.name}: size mismatch (${d.detail})`);
        } else if (d.diffRatio > DIFF_THRESHOLD_RATIO) {
            failures.push(`${s.name}: ${(d.diffRatio * 100).toFixed(3)}% of pixels differ (${d.diffCount}/${d.totalPixels}, max channel delta ${d.maxDelta}), threshold ${(DIFF_THRESHOLD_RATIO * 100).toFixed(1)}%`);
        }
    }

    console.log(`[visual-baseline] ${shots.length} capture(s) compared against visual-baselines/.`);

    if (missing.length) {
        console.error(`[visual-baseline] FAIL — ${missing.length} capture(s) have no committed baseline:`);
        for (const m of missing.slice(0, 10)) console.error(`  - ${m}`);
        console.error('[visual-baseline] Run: node scripts/visual-baseline.mjs update');
    }
    if (failures.length) {
        console.error(`[visual-baseline] FAIL — ${failures.length} page(s) drifted from baseline:`);
        for (const f of failures) console.error(`  - ${f}`);
        console.error('[visual-baseline] If the change is intended, re-capture: node scripts/visual-baseline.mjs update');
    }
    if (missing.length || failures.length) process.exit(1);
    console.log('[visual-baseline] OK — every page matches its baseline.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
