// Freddie helpers — minimal stubs. Real freddie surfaces ship downstream
// (gm-cc, foph, hermes-fork). The SDK exposes the registry shape and
// localStorage helpers so consumer pages can wire to existing patterns.

import * as webjsx from '../../../vendor/webjsx/index.js';
const h = webjsx.createElement;

export function renderPageStub({ id, title }) {
    return h('div', { class: 'ds-freddie-stub' },
        h('span', { class: 'eyebrow' }, 'freddie · ' + id),
        h('h2', {}, title || id),
        h('p', { class: 'dim' }, 'this page renderer is a stub. consumers override it on their own freddie router.')
    );
}

const SKILL_LABELS = {
    transcribe: 'transcribe',
    summarize:  'summarize',
    translate:  'translate',
    extract:    'extract',
    classify:   'classify',
};

export function skillLabel(slug) {
    return SKILL_LABELS[slug] || slug;
}

const RECENT_KEY = 'ds247420.recent.paths';

export function getRecentPaths() {
    if (typeof localStorage === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch { return []; }
}

export function saveRecentPath(path) {
    if (typeof localStorage === 'undefined' || !path) return;
    const list = getRecentPaths().filter(p => p !== path);
    list.unshift(path);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10))); } catch {}
}

// Helper used by consumers that want to render chat-message arrays with
// our ChatMessage factory but pre-formatted for freddie's data shape.
export function renderChatMessages(messages = [], opts = {}) {
    // Import lazily to keep this module light.
    return import('../chat.js').then(({ ChatMessage }) =>
        messages.map((m, i) => ChatMessage({ ...m, key: m.key != null ? m.key : i, ...opts }))
    );
}
