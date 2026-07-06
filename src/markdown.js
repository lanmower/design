// Markdown — lazy-loads marked + DOMPurify on first call. Stub-safe:
// if loading fails, we fall back to a simple escape-and-linebreak pass so
// the chat doesn't go blank.

import { escapeHtml } from './html-escape.js';

let _ready = null;
let _marked = null;
let _purify = null;
// A failed load is NOT cached forever: we drop _ready so a later render retries,
// guarded by a small backoff so an offline session doesn't hammer the CDN.
let _failedAt = 0;
const RETRY_BACKOFF_MS = 30000;

// Pin to exact semver so the CDN cannot silently swap code under us.
// SRI cannot be applied to dynamic ESM imports in browsers (no importmap
// integrity support at design time); pinning the version is the best available
// mitigation for CDN-supply-chain risk on these two dependencies.
const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@15.0.12/+esm';
const PURIFY_URL = 'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/+esm';

// True while the markdown stack is unavailable (escaped-fallback rendering).
// Consumers (markdown-cache) use this to avoid caching degraded output.
export function isDegraded() {
    return !_marked || !_purify;
}

export async function ensureReady() {
    if (_ready) return _ready;
    if (_failedAt && Date.now() - _failedAt < RETRY_BACKOFF_MS) return false;
    _ready = (async () => {
        try {
            const [{ marked }, DOMPurifyMod] = await Promise.all([import(MARKED_URL), import(PURIFY_URL)]);
            _marked = marked;
            _purify = DOMPurifyMod.default || DOMPurifyMod;
            _failedAt = 0;
            return true;
        } catch (err) {
            console.warn('[247420] markdown loader failed:', err);
            // Reset the cached promise so a later render retries (after backoff).
            _ready = null;
            _failedAt = Date.now();
            return false;
        }
    })();
    return _ready;
}

// The single HTML-entity escape for the whole SDK now lives in html-escape.js
// (full set incl. quotes, so it is safe in attribute contexts too).
// Re-exported here for backward compatibility with existing importers of
// escapeHtml from this module. page-html.js re-exports this as `escape`.
export { escapeHtml };

export async function renderMarkdown(src) {
    const ok = await ensureReady();
    if (!ok) return escapeHtml(src).replace(/\n/g, '<br>');
    const raw = _marked.parse(String(src));
    return _purify.sanitize(raw, { FORCE_BODY: true });
}

// Sanitize already-rendered HTML before it touches innerHTML. For any surface
// that injects host/user-authored HTML (e.g. a wiki page body), this is the
// single XSS gate — DOMPurify strips scripts/handlers. If the purifier hasn't
// loaded, we safe-fail by escaping (raw tags show as text, never execute).
export async function sanitizeHtml(html) {
    const ok = await ensureReady();
    if (!ok) return escapeHtml(html);
    return _purify.sanitize(String(html), { FORCE_BODY: true });
}
