export const STORAGE_PREFIX = 'deck-stage:slide:';
const VALIDATE_ATTR = 'no_overflowing_text,no_overlapping_text,slide_sized_text';
const pad2 = (n) => String(n).padStart(2, '0');

export function loadNotes(deckEl) {
    const tag = document.getElementById('speaker-notes');
    if (!tag) return [];
    try {
        const parsed = JSON.parse(tag.textContent || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('[deck-stage] Failed to parse #speaker-notes JSON:', e);
        return [];
    }
}

export function restoreIndex(deckEl, slides) {
    const storageKey = STORAGE_PREFIX + (location.pathname || '/');
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw == null) return 0;
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n >= 0 && n < slides.length) return n;
    } catch (e) { /* ignore */ }
    return 0;
}

export function persistIndex(deckEl, index) {
    const storageKey = STORAGE_PREFIX + (location.pathname || '/');
    try { localStorage.setItem(storageKey, String(index)); } catch (e) {}
}

export function collectSlides(deckEl, slot) {
    const assigned = slot.assignedElements({ flatten: true });
    const slides = assigned.filter((el) => {
        const tag = el.tagName;
        return tag !== 'TEMPLATE' && tag !== 'SCRIPT' && tag !== 'STYLE';
    });
    slides.forEach((slide, i) => {
        const n = i + 1;
        let label = slide.getAttribute('data-label');
        if (!label) {
            const existing = slide.getAttribute('data-screen-label');
            if (existing) label = existing.replace(/^\s*\d+\s*/, '').trim() || existing;
        }
        if (!label) {
            const heading = slide.querySelector('h1, h2, h3, [data-title]');
            if (heading) label = (heading.textContent || '').trim().slice(0, 40);
        }
        if (!label) label = 'Slide';
        slide.setAttribute('data-screen-label', `${pad2(n)} ${label}`);
        if (!slide.hasAttribute('data-om-validate')) slide.setAttribute('data-om-validate', VALIDATE_ATTR);
        slide.setAttribute('data-deck-slide', String(i));
    });
    return slides;
}

export function applyIndex(deckEl, { index, prevIndex, slides, countEl, showOverlay = true, broadcast = true, reason = 'init', flashFn = null } = {}) {
    if (!slides.length) return;
    const prev = prevIndex == null ? -1 : prevIndex;
    const curr = index;
    slides.forEach((s, i) => {
        if (i === curr) s.setAttribute('data-deck-active', '');
        else s.removeAttribute('data-deck-active');
    });
    if (countEl) countEl.textContent = String(curr + 1);
    persistIndex(deckEl, curr);
    if (broadcast) {
        try { window.postMessage({ slideIndexChanged: curr }, '*'); } catch (e) {}
        deckEl.dispatchEvent(new CustomEvent('slidechange', {
            detail: {
                index: curr, previousIndex: prev, total: slides.length,
                slide: slides[curr] || null,
                previousSlide: prev >= 0 ? (slides[prev] || null) : null,
                reason
            },
            bubbles: true, composed: true
        }));
    }
    if (showOverlay && flashFn) flashFn();
}
