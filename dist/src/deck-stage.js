// deck-stage — lazy registration. Consumer calls registerDeckStage() in a
// browser context; we side-effect import the upstream slides/deck-stage.js
// (the starter-component web component that handles scaling + nav).

let _registered = false;
export async function registerDeckStage() {
    if (_registered) return (typeof customElements !== 'undefined') ? customElements.get('deck-stage') : null;
    if (typeof customElements === 'undefined' || typeof HTMLElement === 'undefined') return null;
    try {
        await import('../slides/deck-stage.js');
    } catch (err) {
        console.warn('[247420] deck-stage import failed:', err);
        return null;
    }
    _registered = true;
    return customElements.get('deck-stage');
}

export function getDeckStage() {
    return (typeof customElements !== 'undefined') ? customElements.get('deck-stage') : null;
}
