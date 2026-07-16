// Single source of quasi-unique id generation for the whole SDK and every
// static-site consumer, instead of each call site pasting its own
// Math.random().toString(36) one-liner. Prefers crypto.randomUUID() (both
// browser and modern Node have this); falls back to a Math.random-based
// id only when crypto.randomUUID is unavailable (older runtimes).
export function uid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Short id variant for call sites that just want a compact suffix (e.g.
// DOM ids, temp-file names) rather than a full UUID. `len` caps the
// random-part length (default 8, matching the common `.slice(2, 10)` idiom).
export function shortUid(len = 8) {
    return uid().replace(/-/g, '').slice(0, len);
}
