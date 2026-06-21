// 247420 design system — theme controller.
//
// Three modes:
//   'auto'  — follow OS (prefers-color-scheme). Live-updates on OS change.
//   'paper' — force light.
//   'ink'   — force dark.
//
// Writes the chosen mode to <html data-theme="..."> so CSS rules in
// system.css / colors_and_type.css resolve correctly. Persists to
// localStorage under '247420:theme'. Auto-initializes on import in a
// browser context; safe no-op on server.

const KEY = '247420:theme';
const VALID = new Set(['auto', 'paper', 'ink']);
const listeners = new Set();
let _mq = null;
let _current = 'auto';

function isBrowser() {
    return typeof document !== 'undefined' && typeof window !== 'undefined';
}

function readStored() {
    try {
        const v = window.localStorage.getItem(KEY);
        return VALID.has(v) ? v : null;
    } catch { return null; }
}

function writeStored(mode) {
    try { window.localStorage.setItem(KEY, mode); } catch {}
}

function writeAttr(mode) {
    if (!isBrowser()) return;
    document.documentElement.setAttribute('data-theme', mode);
}

function ensureMq() {
    if (_mq || !isBrowser() || !window.matchMedia) return;
    _mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
        if (_current === 'auto') {
            // Re-emit so listeners can re-render derived UI even though
            // data-theme stays "auto" — the CSS @media handles the swap.
            for (const cb of listeners) {
                try { cb({ mode: 'auto', resolved: _mq.matches ? 'ink' : 'paper' }); } catch {}
            }
        }
    };
    if (_mq.addEventListener) _mq.addEventListener('change', onChange);
    else if (_mq.addListener) _mq.addListener(onChange);
}

export function applyTheme(mode) {
    if (!VALID.has(mode)) mode = 'auto';
    _current = mode;
    writeAttr(mode);
    writeStored(mode);
    ensureMq();
    const resolved = mode === 'auto'
        ? (_mq && _mq.matches ? 'ink' : 'paper')
        : mode;
    for (const cb of listeners) {
        try { cb({ mode, resolved }); } catch {}
    }
    return mode;
}

export function getTheme() {
    return _current;
}

export function resolvedTheme() {
    if (_current !== 'auto') return _current;
    ensureMq();
    return _mq && _mq.matches ? 'ink' : 'paper';
}

export function onThemeChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

// Auto-init on browser import. Picks stored value, else falls back to
// whatever data-theme is already on <html> (set by page-html.js), else 'auto'.
export function initTheme() {
    if (!isBrowser()) return 'auto';
    const stored = readStored();
    const fromAttr = document.documentElement.getAttribute('data-theme');
    const initial = stored || (VALID.has(fromAttr) ? fromAttr : 'auto');
    applyTheme(initial);
    return initial;
}

if (isBrowser()) {
    // Run on next microtask so SSR-injected attributes settle first.
    Promise.resolve().then(() => { try { initTheme(); } catch {} });
}
