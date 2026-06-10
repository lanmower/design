// Markdown — lazy-loads marked + DOMPurify on first call. Stub-safe:
// if loading fails, we fall back to a simple escape-and-linebreak pass so
// the chat doesn't go blank.

let _ready = null;
let _marked = null;
let _purify = null;
// A failed load is NOT cached forever: we drop _ready so a later render retries,
// guarded by a small backoff so an offline session doesn't hammer the CDN.
let _failedAt = 0;
const RETRY_BACKOFF_MS = 30000;

const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@15/+esm';
const PURIFY_URL = 'https://cdn.jsdelivr.net/npm/dompurify@3/+esm';

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

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
}

export async function renderMarkdown(src) {
    const ok = await ensureReady();
    if (!ok) return escapeHtml(src).replace(/\n/g, '<br>');
    const raw = _marked.parse(String(src));
    return _purify.sanitize(raw);
}
