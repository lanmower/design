// Markdown — lazy-loads marked + DOMPurify on first call. Stub-safe:
// if loading fails, we fall back to a simple escape-and-linebreak pass so
// the chat doesn't go blank.

let _ready = null;
let _marked = null;
let _purify = null;

const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@15/+esm';
const PURIFY_URL = 'https://cdn.jsdelivr.net/npm/dompurify@3/+esm';

export async function ensureReady() {
    if (_ready) return _ready;
    _ready = (async () => {
        try {
            const [{ marked }, DOMPurifyMod] = await Promise.all([import(MARKED_URL), import(PURIFY_URL)]);
            _marked = marked;
            _purify = DOMPurifyMod.default || DOMPurifyMod;
            return true;
        } catch (err) {
            console.warn('[247420] markdown loader failed:', err);
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
