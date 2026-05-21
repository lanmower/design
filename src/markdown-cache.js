// Markdown & Prism cache layer with performance tracking.
// Ensures libraries are loaded once globally, reused for all subsequent renders.
// Tracks initialization status and render timings.

import { renderMarkdown, ensureReady as ensureMarkdownReady } from './markdown.js';
import { highlightAllUnder, ensurePrism } from './highlight.js';

// Global cache state
let _markdownInitialized = false;
let _prismInitialized = false;
let _initPromise = null;
let _stats = {
    markdownInitMs: 0,
    prismInitMs: 0,
    renderCount: 0,
    renderTimes: [],
};

/**
 * Initialize markdown and Prism in parallel on first Chat component mount.
 * Subsequent calls return cached state (0ms).
 * @returns {Promise<{ markdown: boolean, prism: boolean }>}
 */
export async function initializeCachesEagerly() {
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        const startTime = performance.now();

        // Parallel initialization
        const [mdOk, prismOk] = await Promise.all([
            (async () => {
                const t0 = performance.now();
                const ok = await ensureMarkdownReady();
                _stats.markdownInitMs = performance.now() - t0;
                _markdownInitialized = true;
                return ok;
            })(),
            (async () => {
                const t0 = performance.now();
                const ok = await ensurePrism();
                _stats.prismInitMs = performance.now() - t0;
                _prismInitialized = true;
                return ok;
            })(),
        ]);

        const totalMs = performance.now() - startTime;
        console.debug(`[247420] markdown/prism caches initialized in ${totalMs.toFixed(1)}ms (markdown: ${_stats.markdownInitMs.toFixed(1)}ms, prism: ${_stats.prismInitMs.toFixed(1)}ms)`);

        return { markdown: mdOk, prism: prismOk };
    })();

    return _initPromise;
}

/**
 * Render markdown with cached loader (ensures markdown is ready first).
 * @param {string} text - Markdown source
 * @returns {Promise<string>} - Sanitized HTML
 */
export async function renderMarkdownCached(text) {
    const t0 = performance.now();

    // Ensure markdown is ready (cached after first init)
    if (!_markdownInitialized) {
        await ensureMarkdownReady();
        _markdownInitialized = true;
    }

    const html = await renderMarkdown(text);

    const renderMs = performance.now() - t0;
    _stats.renderCount += 1;
    _stats.renderTimes.push(renderMs);
    // Keep only last 100 samples
    if (_stats.renderTimes.length > 100) _stats.renderTimes.shift();

    return html;
}

/**
 * Highlight code block with cached Prism (ensures Prism is ready first).
 * @param {HTMLElement} el - DOM element containing <code> blocks
 * @returns {Promise<void>}
 */
export async function highlightCodeBlockCached(el) {
    // Ensure Prism is ready (cached after first init)
    if (!_prismInitialized) {
        await ensurePrism();
        _prismInitialized = true;
    }

    await highlightAllUnder(el);
}

/**
 * Get cache initialization and performance stats.
 * @returns {Object} - { markdownInitialized, prismInitialized, initMs, renderStats }
 */
export function getCacheStats() {
    return {
        markdownInitialized: _markdownInitialized,
        prismInitialized: _prismInitialized,
        initMs: {
            markdown: _stats.markdownInitMs,
            prism: _stats.prismInitMs,
        },
        renderStats: {
            count: _stats.renderCount,
            avgTimeMs: _stats.renderTimes.length
                ? (_stats.renderTimes.reduce((a, b) => a + b, 0) / _stats.renderTimes.length).toFixed(2)
                : 0,
            minTimeMs: _stats.renderTimes.length ? Math.min(..._stats.renderTimes).toFixed(2) : 0,
            maxTimeMs: _stats.renderTimes.length ? Math.max(..._stats.renderTimes).toFixed(2) : 0,
        },
    };
}

/**
 * Reset cache state (for testing only).
 */
export function resetCacheState() {
    _markdownInitialized = false;
    _prismInitialized = false;
    _initPromise = null;
    _stats = {
        markdownInitMs: 0,
        prismInitMs: 0,
        renderCount: 0,
        renderTimes: [],
    };
}
