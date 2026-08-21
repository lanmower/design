#!/usr/bin/env node
// WCAG 2.1 AA guard over every ui_kits/*/index.html, run against the LIVE
// rendered DOM by the real axe-core engine — computed style and contrast only
// exist post-render, so a static-HTML heuristic scan cannot substitute.
//
// No browser-automation package (AGENTS.md ban): the CDP client in ./cdp.mjs
// talks to an already-running Chrome over the built-in WebSocket, and axe-core
// is a pinned vendored copy under vendor/axe-core/ (same practice the repo
// already uses for vendor/webjsx). Nothing here installs or launches a browser.
//
// Usage:
//   node scripts/a11y-audit.mjs                      -- check against baseline
//   node scripts/a11y-audit.mjs --write-baseline     -- re-freeze the baseline
//   BASE_URL=http://127.0.0.1:8899 CDP_BASE=http://127.0.0.1:9333 ...
//
// RATCHET SEMANTICS (matching the repo's other ratchet gates): the baseline is
// a per-kit count of serious/critical violations and it is a DEBT FIGURE TO
// DRIVE DOWN, never a budget to spend. Over baseline fails. Under baseline
// fails too, with an instruction to re-freeze DOWNWARD — slack in a baseline
// silently absorbs the next regression.
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withPage, cdpAvailable, CDP_BASE } from './cdp.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const kitsDir = join(root, 'ui_kits');
const axePath = join(root, 'vendor', 'axe-core', 'axe.min.js');
const baselinePath = join(root, 'scripts', 'a11y.baseline.json');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8899';

// The gate's severity floor. axe's minor/moderate findings are reported but do
// not gate — serious/critical is what the removed Playwright gate enforced.
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// DETERMINISM PINS — the same class of fix scripts/visual-baseline.mjs already
// applies, for the same root cause.
//
// Every kit ships `data-theme="auto"`, which defers to `prefers-color-scheme`.
// Chrome's default for that preference is NOT stable across environments: a
// developer's headless Chrome commonly reports `dark`, while the ubuntu-latest
// CI runner reports `light`. Unpinned, the audit therefore samples a different
// THEME per machine — which is precisely how 4 real light-theme contrast
// defects passed locally and failed only in CI. `light` matches the CI runner
// and is the stricter of the two for this palette (the paper surfaces are
// where the tier-3 text tones sit closest to the 4.5:1 floor).
const EMULATED_COLOR_SCHEME = 'light';
// The entry animation in src/motion.js fades panels in via opacity, and axe
// composites a mid-fade element against its backdrop — sampling a blended
// colour that matches no committed token and flapping purely on render timing
// (measured: the same page alternating 0 and 30 violations across settle
// delays). Pinning reduced-motion makes motion.js's `[data-motion]` path skip
// the transition entirely, so axe always samples the settled, real colours.
const EMULATED_REDUCED_MOTION = 'reduce';

// A kit is auditable if it has an index.html to serve. _template holds only
// index.html.tmpl (a generator input, deliberately not servable), so it drops
// out here structurally rather than via a name it could later be renamed out
// of — one rule instead of a hardcoded exclusion sitting beside it.
function listKits() {
    return readdirSync(kitsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .filter((n) => existsSync(join(kitsDir, n, 'index.html')))
        .sort();
}

async function auditKit(kit) {
    // Trailing slash, not `/index.html`: http-server 301s a direct
    // `/index.html` request to the extensionless directory URL (no trailing
    // slash), which then resolves this page's own relative `./app.js`/`<link>`
    // one directory too high and silently serves a near-empty DOM — axe then
    // audits nothing and reports a false-clean 0 violations. Witnessed live:
    // `curl -sI .../os/index.html` -> `301 Location: /ui_kits/os/index`.
    const url = `${BASE_URL}/ui_kits/${kit}/`;
    return withPage(url, async (page) => {
        await page.addScriptFile(axePath);
        // Serialised through returnByValue, so project down to plain data in
        // the page rather than shipping axe's full (circular, huge) result.
        const raw = await page.evaluate(`
            window.axe.run(document, { runOnly: { type: 'tag', values: ${JSON.stringify(WCAG_TAGS)} } })
                .then((r) => ({
                    passes: r.passes.length,
                    violations: r.violations.map((v) => ({
                        id: v.id,
                        impact: v.impact,
                        help: v.help,
                        helpUrl: v.helpUrl,
                        nodes: v.nodes.length,
                        sample: v.nodes.slice(0, 5).map((n) => ({
                            target: String(n.target),
                            // failureSummary carries axe's per-node "why" —
                            // for color-contrast that includes the exact
                            // sampled fg/bg colours and the computed ratio,
                            // which is the only way to tell a real defect
                            // from an environment-dependent sample.
                            why: String(n.failureSummary || '').replace(/\\s+/g, ' ').trim(),
                            html: String(n.html || '').slice(0, 200),
                        })),
                    })),
                }))
        `);
        return { kit, ...raw };
    }, { emulate: { colorScheme: EMULATED_COLOR_SCHEME, reducedMotion: EMULATED_REDUCED_MOTION } });
}

/** Print every blocking rule + node to stdout. docs/a11y-report.md is not
 *  uploaded as a CI artifact, so a failure that only lands there is a failure
 *  nobody can diagnose from the log. */
function printBlockingDetail(results) {
    for (const r of results) {
        const blocking = r.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact));
        if (!blocking.length) continue;
        console.error(`[a11y-audit] --- ${r.kit} ---`);
        for (const v of blocking) {
            console.error(`  rule=${v.id} impact=${v.impact} nodes=${v.nodes} :: ${v.help}`);
            for (const s of v.sample) {
                console.error(`    node: ${s.target}`);
                if (s.why) console.error(`      why: ${s.why}`);
                if (s.html) console.error(`      html: ${s.html}`);
            }
        }
    }
}

function blockingCount(result) {
    return result.violations
        .filter((v) => BLOCKING_IMPACTS.has(v.impact))
        .reduce((sum, v) => sum + v.nodes, 0);
}

function readBaseline() {
    if (!existsSync(baselinePath)) return null;
    return JSON.parse(readFileSync(baselinePath, 'utf8'));
}

function writeReport(results) {
    const lines = ['# a11y audit report', ''];
    lines.push(`Generated ${new Date().toISOString().slice(0, 10)} by \`node scripts/a11y-audit.mjs\` against the live rendered DOM via axe-core, WCAG-tagged rules only: \`${WCAG_TAGS.join(', ')}\`.`);
    lines.push('');
    lines.push('**This is not a WCAG AA conformance statement.** Automated rules cover a real but partial slice of WCAG success criteria, and this run explicitly excludes best-practice checks outside the WCAG tag set above -- notably `bypass` (skip-link presence) and `page-has-heading-one` (a real `<h1>`), so a kit can score 0 here with no skip link and no `h1`. See `docs/accessibility.md` for what manual verification (screen readers, keyboard-only traversal, zoom/reflow, target size) has and has not been done.');
    lines.push('');
    const totalBlocking = results.reduce((s, r) => s + blockingCount(r), 0);
    lines.push(`${results.length} kit(s) scanned, ${totalBlocking} blocking (serious/critical) node-level violation(s).`);
    lines.push('');
    for (const r of results) {
        if (!r.violations.length) continue;
        lines.push(`## ${r.kit}`);
        for (const v of r.violations) {
            lines.push(`- **${v.id}** (${v.impact}): ${v.help} — ${v.nodes} node(s)`);
            lines.push(`  - ${v.helpUrl}`);
            for (const s of v.sample) {
                lines.push(`  - \`${s.target}\``);
                if (s.why) lines.push(`    - ${s.why}`);
            }
        }
        lines.push('');
    }
    mkdirSync(join(root, 'docs'), { recursive: true });
    writeFileSync(join(root, 'docs', 'a11y-report.md'), lines.join('\n'));
}

export async function auditAllKits({ onProgress } = {}) {
    const results = [];
    for (const kit of listKits()) {
        const r = await auditKit(kit);
        results.push(r);
        if (onProgress) onProgress(r);
    }
    return results;
}

async function main() {
    const write = process.argv.includes('--write-baseline');

    if (!(await cdpAvailable())) {
        console.error(`[a11y-audit] no CDP endpoint at ${CDP_BASE}.`);
        console.error('[a11y-audit] start Chrome with --headless --remote-debugging-port=9333 (a workflow step or your own browser; this script never launches one) and serve the repo at ' + BASE_URL);
        process.exit(1);
    }

    const results = await auditAllKits({
        onProgress: (r) => console.log(`[a11y-audit] ${r.kit}: ${blockingCount(r)} blocking, ${r.violations.length} rule(s), ${r.passes} pass(es)`),
    });
    writeReport(results);

    const counts = Object.fromEntries(results.map((r) => [r.kit, blockingCount(r)]));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    if (write) {
        writeFileSync(baselinePath, JSON.stringify({ total, kits: counts }, null, 2) + '\n');
        console.log(`[a11y-audit] baseline written: ${total} blocking violation(s) across ${results.length} kit(s).`);
        return;
    }

    const baseline = readBaseline();
    if (!baseline) {
        console.error('[a11y-audit] no baseline. Run: node scripts/a11y-audit.mjs --write-baseline');
        process.exit(1);
    }

    const regressed = [];
    const improved = [];
    for (const [kit, count] of Object.entries(counts)) {
        const base = baseline.kits[kit];
        if (base === undefined) {
            // A new kit starts at zero tolerance — a ratchet cannot be
            // silently widened by adding a page.
            if (count > 0) regressed.push(`${kit}: ${count} blocking violation(s) (new kit, baseline 0)`);
            continue;
        }
        if (count > base) regressed.push(`${kit}: ${count} blocking violation(s), baseline ${base}`);
        else if (count < base) improved.push(`${kit}: ${count} < baseline ${base}`);
    }

    console.log(`[a11y-audit] ${results.length} kit(s), ${total} blocking violation(s) (baseline ${baseline.total}). Report: docs/a11y-report.md`);

    if (regressed.length) {
        console.error('[a11y-audit] FAIL — a11y regression:');
        for (const r of regressed) console.error(`  - ${r}`);
        printBlockingDetail(results);
        console.error('[a11y-audit] Fix the violation. Never raise the baseline to make it pass.');
        process.exit(1);
    }
    if (improved.length) {
        console.error('[a11y-audit] FAIL — violations dropped below baseline; re-freeze it DOWNWARD:');
        for (const i of improved) console.error(`  - ${i}`);
        console.error('[a11y-audit] Run: node scripts/a11y-audit.mjs --write-baseline');
        process.exit(1);
    }
    console.log('[a11y-audit] OK — no regression against baseline.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
