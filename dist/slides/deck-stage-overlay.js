const ICON_PREV = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>';
const ICON_NEXT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>';

export function buildOverlay({ onPrev, onNext, onReset }) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay export-hidden';
    overlay.setAttribute('role', 'toolbar');
    overlay.setAttribute('aria-label', 'Deck controls');
    overlay.innerHTML = `
        <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">${ICON_PREV}</button>
        <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
        <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">${ICON_NEXT}</button>
        <span class="divider"></span>
        <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
    `;
    overlay.querySelector('.prev').addEventListener('click', onPrev);
    overlay.querySelector('.next').addEventListener('click', onNext);
    overlay.querySelector('.reset').addEventListener('click', onReset);
    return overlay;
}

export function buildTapzones({ onBack, onForward }) {
    const tapzones = document.createElement('div');
    tapzones.className = 'tapzones export-hidden';
    tapzones.setAttribute('aria-hidden', 'true');
    const tzBack = document.createElement('div');
    tzBack.className = 'tapzone tapzone--back';
    const tzMid = document.createElement('div');
    tzMid.className = 'tapzone tapzone--mid';
    tzMid.style.pointerEvents = 'none';
    const tzFwd = document.createElement('div');
    tzFwd.className = 'tapzone tapzone--fwd';
    tzBack.addEventListener('click', onBack);
    tzFwd.addEventListener('click', onForward);
    tapzones.append(tzBack, tzMid, tzFwd);
    return tapzones;
}

const KEY_HANDLERS = {
    ArrowRight: (deck) => deck._go(deck._index + 1, 'keyboard'),
    PageDown:   (deck) => deck._go(deck._index + 1, 'keyboard'),
    ' ':        (deck) => deck._go(deck._index + 1, 'keyboard'),
    Spacebar:   (deck) => deck._go(deck._index + 1, 'keyboard'),
    ArrowLeft:  (deck) => deck._go(deck._index - 1, 'keyboard'),
    PageUp:     (deck) => deck._go(deck._index - 1, 'keyboard'),
    Home:       (deck) => deck._go(0, 'keyboard'),
    End:        (deck) => deck._go(deck._slides.length - 1, 'keyboard'),
    r:          (deck) => deck._go(0, 'keyboard'),
    R:          (deck) => deck._go(0, 'keyboard')
};

export function handleDeckKey(deck, e) {
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return false;
    if (e.metaKey || e.ctrlKey || e.altKey) return false;
    const fn = KEY_HANDLERS[e.key];
    if (fn) { fn(deck); return true; }
    if (/^[0-9]$/.test(e.key)) {
        const n = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
        if (n < deck._slides.length) { deck._go(n, 'keyboard'); return true; }
    }
    return false;
}
