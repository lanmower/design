// Syntax highlighting — lazy-loads Prism + common language grammars on first call. No-op safe.

let _prism = null;
let _ready = null;

const PRISM_BASE = 'https://cdn.jsdelivr.net/npm/prismjs@1.30.0/components/';
const PRISM_CORE = PRISM_BASE + 'prism-core.min.js';
const PRISM_LANGS = [
    'prism-markup.min.js',
    'prism-css.min.js',
    'prism-clike.min.js',
    'prism-javascript.min.js',
    'prism-typescript.min.js',
    'prism-json.min.js',
    'prism-bash.min.js',
    'prism-yaml.min.js',
    'prism-markdown.min.js',
    'prism-python.min.js',
    'prism-rust.min.js',
    'prism-go.min.js',
    'prism-jsx.min.js',
    'prism-tsx.min.js',
    'prism-diff.min.js',
    'prism-sql.min.js',
    'prism-toml.min.js',
];

async function loadIntoGlobal(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('http ' + res.status);
        const code = await res.text();
        // eslint-disable-next-line no-new-func
        new Function('window', code)(window);
    } catch (err) {
        console.warn('[247420] prism part failed:', url, err.message);
    }
}

export async function ensurePrism() {
    if (_prism) return _prism;
    if (_ready) return _ready;
    _ready = (async () => {
        try {
            await loadIntoGlobal(PRISM_CORE);
            _prism = window.Prism || null;
            if (_prism) {
                for (const f of PRISM_LANGS) {
                    await loadIntoGlobal(PRISM_BASE + f);
                }
            }
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
