#!/usr/bin/env node
// Minimal Chrome DevTools Protocol client over the built-in global WebSocket.
//
// WHY THIS EXISTS / WHY IT IS NOT THE BANNED THING (AGENTS.md, "no
// Chrome/Puppeteer/Playwright dependency anywhere in this repo"): that rule
// bans two specific things — adding `puppeteer`/`puppeteer-core`/`playwright`/
// `playwright-core` as a package dependency, and hand-rolling a raw
// headless-Chrome LAUNCH inside a script. This module does neither. It adds no
// package (Node >= 22 ships a global `WebSocket`; the only other import is
// `node:fs`) and it never spawns a browser — it CONNECTS to a CDP endpoint that
// something else already started (a CI workflow step, or a developer's own
// browser). Starting Chrome stays the caller's job, outside this repo's code.
// This is the same "direct CDP, no relay" shape AGENTS.md already names as the
// approved live-verification path for this kit.
//
// Consumers: scripts/a11y-audit.mjs, scripts/visual-baseline.mjs.
import fs from 'node:fs';

// Endpoint of an ALREADY-RUNNING Chrome. Never launched from here.
export const CDP_BASE = process.env.CDP_BASE || 'http://127.0.0.1:9333';

const CALL_TIMEOUT_MS = 30000;
const LOAD_TIMEOUT_MS = 20000;

/** Probe the endpoint so callers can fail with a useful message, not a raw
 *  ECONNREFUSED stack, when nobody started a browser. */
export async function cdpAvailable(base = CDP_BASE) {
    try {
        const r = await fetch(`${base}/json/version`, { signal: AbortSignal.timeout(3000) });
        return r.ok;
    } catch {
        return false;
    }
}

async function newTarget(base) {
    const r = await fetch(`${base}/json/new?about:blank`, { method: 'PUT' });
    if (!r.ok) throw new Error(`CDP /json/new failed: ${r.status} ${r.statusText}`);
    return r.json();
}

async function closeTarget(base, id) {
    await fetch(`${base}/json/close/${id}`).catch(() => { });
}

/**
 * Open a fresh tab, run `fn(api)` against it, always clean the tab up.
 * A tab per call (rather than one reused tab) keeps injected script state —
 * notably axe-core — from leaking between pages.
 */
export async function withPage(url, fn, opts = {}) {
    const { width = 1280, height = 900, dsf = 1, base = CDP_BASE, settleMs = 500, emulate } = opts;
    const target = await newTarget(base);
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let nextId = 0;
    const pending = new Map();
    const events = [];

    await new Promise((res, rej) => {
        ws.addEventListener('open', res, { once: true });
        ws.addEventListener('error', () => rej(new Error('CDP websocket error')), { once: true });
    });

    ws.addEventListener('message', (ev) => {
        const raw = typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString();
        const m = JSON.parse(raw);
        if (m.id && pending.has(m.id)) {
            const { res, rej } = pending.get(m.id);
            pending.delete(m.id);
            if (m.error) rej(new Error(JSON.stringify(m.error)));
            else res(m.result);
        } else if (m.method) {
            events.push(m);
        }
    });

    const send = (method, params = {}) => new Promise((res, rej) => {
        const id = ++nextId;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
        setTimeout(() => {
            if (pending.has(id)) {
                pending.delete(id);
                rej(new Error(`CDP timeout: ${method}`));
            }
        }, CALL_TIMEOUT_MS);
    });

    const api = {
        send,
        /** Evaluate in the page; rejects (never silently resolves undefined) on
         *  a page-side throw, so a broken check cannot pass as "no findings". */
        async evaluate(expression) {
            const { result, exceptionDetails } = await send('Runtime.evaluate', {
                expression, returnByValue: true, awaitPromise: true,
            });
            if (exceptionDetails) {
                const d = exceptionDetails.exception?.description || exceptionDetails.text;
                throw new Error(`page evaluate threw: ${d}`);
            }
            return result.value;
        },
        /** Inject a local file as a classic script and await its evaluation.
         *  Used to get vendored axe-core into the page with no network fetch
         *  and no page dependency. */
        async addScriptFile(filePath) {
            const src = fs.readFileSync(filePath, 'utf8');
            const { exceptionDetails } = await send('Runtime.evaluate', {
                expression: src, returnByValue: false, awaitPromise: false,
            });
            if (exceptionDetails) {
                throw new Error(`script injection threw: ${exceptionDetails.exception?.description || exceptionDetails.text}`);
            }
        },
        /** Raw PNG bytes (Buffer) of the current viewport or full page. */
        async screenshot({ full = false } = {}) {
            const { data } = await send('Page.captureScreenshot', {
                format: 'png', captureBeyondViewport: !!full,
            });
            return Buffer.from(data, 'base64');
        },
        /** Pin the emulated `prefers-color-scheme`. Without this, a page whose
         *  theme defers to the OS preference renders differently on machines
         *  that report light vs dark — a screenshot baseline captured under one
         *  can never match the other. */
        async setColorScheme(scheme) {
            await send('Emulation.setEmulatedMedia', {
                features: [{ name: 'prefers-color-scheme', value: scheme }],
            });
        },
        /** Pin several emulated media features at once. Emulation.setEmulatedMedia
         *  REPLACES the whole feature list per call, so anything that needs more
         *  than one pin must set them together — calling setColorScheme() and
         *  then a separate reduced-motion call would silently drop the first. */
        async setEmulatedPrefs({ colorScheme, reducedMotion } = {}) {
            const features = [];
            if (colorScheme) features.push({ name: 'prefers-color-scheme', value: colorScheme });
            if (reducedMotion) features.push({ name: 'prefers-reduced-motion', value: reducedMotion });
            if (features.length) await send('Emulation.setEmulatedMedia', { features });
        },
        async setTheme(theme) {
            await api.evaluate(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})`);
            // Let the custom-property cascade and any transition settle; a
            // capture mid-transition is a false positive waiting to happen.
            await new Promise((r) => setTimeout(r, 200));
        },
        pageErrors: () => events
            .filter((e) => e.method === 'Runtime.exceptionThrown')
            .map((e) => e.params?.exceptionDetails?.text || ''),
    };

    try {
        await send('Page.enable');
        await send('Runtime.enable');
        await send('Network.enable');
        // Disabled BEFORE the first navigation, same reasoning as the emulated-
        // media pin below: a stylesheet/script served with a real cache-control
        // header (e.g. any local http-server's default max-age) is otherwise
        // read from this Chrome profile's disk cache on a repeat navigation to
        // the same URL, silently returning the PRE-edit bytes even though the
        // file on disk (and a fresh fetch() from inside the page) already has
        // the new content -- caught live via colors_and_type.css appearing
        // correct to curl and to an in-page fetch() but stale via the <link>
        // tag's resolved computed style, until this call was added.
        await send('Network.setCacheDisabled', { cacheDisabled: true });
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dsf, mobile: false });
        // Pin emulated media BEFORE the first navigation. Applying it after the
        // page has already painted leaves the initial render (and any theme the
        // page resolves at load) sampled under the browser's own default
        // preference, which is exactly the cross-environment flap being pinned.
        if (emulate) await api.setEmulatedPrefs(emulate);
        await send('Page.navigate', { url });

        const t0 = Date.now();
        for (;;) {
            const state = await api.evaluate('document.readyState');
            if (state === 'complete') break;
            if (Date.now() - t0 > LOAD_TIMEOUT_MS) throw new Error(`page load timeout: ${url}`);
            await new Promise((r) => setTimeout(r, 100));
        }
        // ui_kits mount via ES modules after load; give the first render a beat.
        await new Promise((r) => setTimeout(r, settleMs));

        return await fn(api);
    } finally {
        try { ws.close(); } catch { /* already closed */ }
        await closeTarget(base, target.id);
    }
}
