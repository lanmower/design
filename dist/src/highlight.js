// Syntax highlighting — lazy-loads Prism on first call. No-op safe.

let _prism = null;
let _ready = null;

const PRISM_CORE = 'https://cdn.jsdelivr.net/npm/prismjs@1.30.0/components/prism-core.min.js';

export async function ensurePrism() {
    if (_prism) return _prism;
    if (_ready) return _ready;
    _ready = (async () => {
        try {
            // Prism is UMD; fetch & exec on the global.
            const res = await fetch(PRISM_CORE);
            const code = await res.text();
            // eslint-disable-next-line no-new-func
            new Function('window', code)(window);
            _prism = window.Prism || null;
            return _prism;
        } catch (err) {
            console.warn('[247420] prism loader failed:', err);
            return null;
        }
    })();
    return _ready;
}

export async function highlightAllUnder(root) {
    const Prism = await ensurePrism();
    if (!Prism || !root) return;
    if (typeof Prism.highlightAllUnder === 'function') Prism.highlightAllUnder(root);
}
