// Markdown — lazy-loads marked + DOMPurify on first call. Stub-safe:
// if loading fails, we fall back to a simple escape-and-linebreak pass so
// the chat doesn't go blank. FAIL-CLOSED: on any doubt about whether the
// sanitizer is actually active (load failure, parse/sanitize throw, or a
// purifier that doesn't look like a real DOMPurify instance), the render
// path returns escaped plaintext rather than ever risking raw HTML reaching
// innerHTML.

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
// mitigation for CDN-supply-chain risk on these two dependencies. Both are
// overridable (see configureMarkdownCdn below) for a consumer that wants to
// self-host, mirror-pin, or route through a CSP-allowlisted proxy; the
// defaults below are byte-for-byte unchanged from before, so a zero-config
// consumer's behavior is untouched.
const DEFAULT_MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@15.0.12/+esm';
const DEFAULT_PURIFY_URL = 'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/+esm';

let _markedUrl = DEFAULT_MARKED_URL;
let _purifyUrl = DEFAULT_PURIFY_URL;

// Optional override for where marked/DOMPurify are fetched from. Additive:
// call before the first render() to take effect (ensureReady() reads these
// module-level vars lazily on first invocation only, same as before). Every
// existing consumer that never calls this keeps hitting the pinned jsDelivr
// URLs above, byte-for-byte. Passing null/undefined for a key resets that
// one URL back to its default without touching the other.
export function configureMarkdownCdn({ markedUrl, purifyUrl } = {}) {
    if (markedUrl !== undefined) _markedUrl = markedUrl || DEFAULT_MARKED_URL;
    if (purifyUrl !== undefined) _purifyUrl = purifyUrl || DEFAULT_PURIFY_URL;
    // Force a fresh load on the next render so a runtime override (e.g. a
    // consumer switching to a self-hosted mirror after boot) actually takes.
    _ready = null;
    _failedAt = 0;
}

// Read-only introspection of the URLs actually in effect (defaults or
// override) — useful for a consumer's own SRI/CSP audit tooling.
export function getMarkdownCdnConfig() {
    return { markedUrl: _markedUrl, purifyUrl: _purifyUrl };
}

// True while the markdown stack is unavailable (escaped-fallback rendering).
// Consumers (markdown-cache) use this to avoid caching degraded output.
export function isDegraded() {
    return !_marked || !_purify || typeof _purify.sanitize !== 'function';
}

export async function ensureReady() {
    if (_ready) return _ready;
    if (_failedAt && Date.now() - _failedAt < RETRY_BACKOFF_MS) return false;
    _ready = (async () => {
        try {
            const [{ marked }, DOMPurifyMod] = await Promise.all([import(_markedUrl), import(_purifyUrl)]);
            const purify = DOMPurifyMod.default || DOMPurifyMod;
            // Fail closed if either module didn't resolve to something usable —
            // a CDN that 200s with an empty/HTML error-page body can satisfy the
            // dynamic import yet hand back a shape with no .parse/.sanitize.
            if (!marked || typeof marked.parse !== 'function') throw new Error('marked module missing parse()');
            if (!purify || typeof purify.sanitize !== 'function') throw new Error('DOMPurify module missing sanitize()');
            // ||text|| click-to-reveal spoiler (stoat for-web's remarkSpoiler),
            // ported as a marked inline tokenizer extension rather than string
            // surgery on the parsed HTML -- the interactive class/attrs land on
            // the same span shape renderInline's own spoiler uses.
            marked.use({
                extensions: [{
                    name: 'spoiler',
                    level: 'inline',
                    start(src) { return src.match(/\|\|/)?.index; },
                    tokenizer(src) {
                        const match = /^\|\|([^|]+)\|\|/.exec(src);
                        if (!match) return undefined;
                        return { type: 'spoiler', raw: match[0], text: match[1].trim(), tokens: this.lexer.inlineTokens(match[1].trim()) };
                    },
                    renderer(token) { return `<span class="chat-spoiler" tabindex="0" role="button" aria-label="spoiler, click to reveal">${this.parser.parseInline(token.tokens)}</span>`; },
                }],
            });
            _marked = marked;
            _purify = purify;
            _failedAt = 0;
            return true;
        } catch (err) {
            console.warn('[247420] markdown loader failed:', err);
            // Reset the cached promise so a later render retries (after backoff).
            // Also drop any partial module refs so isDegraded()/renderMarkdown
            // never treat a half-initialized state as ready.
            _marked = null;
            _purify = null;
            _ready = null;
            _failedAt = Date.now();
            return false;
        }
    })();
    return _ready;
}

// Fail-closed plaintext fallback, always wrapped in the same safe container
// shape the real sanitized output would use (a plain block the caller can
// innerHTML directly) — never bare unwrapped text relying on caller discipline.
function escapedFallback(src) {
    return escapeHtml(src).replace(/\n/g, '<br>');
}

// The single HTML-entity escape for the whole SDK now lives in html-escape.js
// (full set incl. quotes, so it is safe in attribute contexts too).
// Re-exported here for backward compatibility with existing importers of
// escapeHtml from this module. page-html.js re-exports this as `escape`.
export { escapeHtml };

export async function renderMarkdown(src) {
    const ok = await ensureReady();
    if (!ok) return escapedFallback(src);
    // Fail-closed around the parse+sanitize call itself too, not just the
    // loader: a CDN module that resolved but throws mid-parse (a malformed
    // remote payload, a marked/DOMPurify version mismatch) must never let a
    // partially-produced `raw` string reach the caller unsanitized, and must
    // never propagate an unhandled rejection that a caller might swallow into
    // a raw-HTML fallback of their own.
    try {
        const raw = _marked.parse(String(src));
        if (typeof _purify.sanitize !== 'function') throw new Error('purifier unavailable mid-render');
        return _purify.sanitize(raw, { FORCE_BODY: true });
    } catch (err) {
        console.warn('[247420] markdown render failed, falling back to escaped text:', err);
        // Treat this exactly like a load failure: drop refs and start the
        // backoff so the next call retries a fresh load rather than re-hitting
        // whatever made this one throw.
        _marked = null;
        _purify = null;
        _ready = null;
        _failedAt = Date.now();
        return escapedFallback(src);
    }
}

// Sanitize already-rendered HTML before it touches innerHTML. For any surface
// that injects host/user-authored HTML (e.g. a wiki page body), this is the
// single XSS gate — DOMPurify strips scripts/handlers. If the purifier hasn't
// loaded, we safe-fail by escaping (raw tags show as text, never execute).
export async function sanitizeHtml(html) {
    const ok = await ensureReady();
    if (!ok) return escapeHtml(html);
    try {
        if (typeof _purify.sanitize !== 'function') throw new Error('purifier unavailable mid-sanitize');
        return _purify.sanitize(String(html), { FORCE_BODY: true });
    } catch (err) {
        console.warn('[247420] sanitizeHtml failed, falling back to escaped text:', err);
        _marked = null;
        _purify = null;
        _ready = null;
        _failedAt = Date.now();
        return escapeHtml(html);
    }
}
