import { STYLESHEET } from './deck-stage-style.js';
import { buildOverlay, buildTapzones, handleDeckKey } from './deck-stage-overlay.js';
import { loadNotes, restoreIndex, persistIndex, collectSlides, applyIndex, STORAGE_PREFIX } from './deck-stage-state.js';

const DESIGN_W_DEFAULT = 1920;
const DESIGN_H_DEFAULT = 1080;
const OVERLAY_HIDE_MS = 1800;

class DeckStage extends HTMLElement {
    static get observedAttributes() { return ['width', 'height', 'noscale']; }

    constructor() {
        super();
        this._root = this.attachShadow({ mode: 'open' });
        this._index = 0;
        this._slides = [];
        this._notes = [];
        this._hideTimer = null;
        this._mouseIdleTimer = null;
        this._storageKey = STORAGE_PREFIX + (location.pathname || '/');
        this._onKey = this._onKey.bind(this);
        this._onResize = this._onResize.bind(this);
        this._onSlotChange = this._onSlotChange.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
    }

    get designWidth()  { return parseInt(this.getAttribute('width'), 10)  || DESIGN_W_DEFAULT; }
    get designHeight() { return parseInt(this.getAttribute('height'), 10) || DESIGN_H_DEFAULT; }

    connectedCallback() {
        this._render();
        this._notes = loadNotes(this);
        this._syncPrintPageRule();
        window.addEventListener('keydown', this._onKey);
        window.addEventListener('resize', this._onResize);
        window.addEventListener('mousemove', this._onMouseMove, { passive: true });
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._onKey);
        window.removeEventListener('resize', this._onResize);
        window.removeEventListener('mousemove', this._onMouseMove);
        if (this._hideTimer) clearTimeout(this._hideTimer);
        if (this._mouseIdleTimer) clearTimeout(this._mouseIdleTimer);
    }

    attributeChangedCallback() {
        if (!this._canvas) return;
        this._canvas.style.width = this.designWidth + 'px';
        this._canvas.style.height = this.designHeight + 'px';
        this._canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        this._canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        this._fit();
        this._syncPrintPageRule();
    }

    _render() {
        const style = document.createElement('style');
        style.textContent = STYLESHEET;
        const stage = document.createElement('div');
        stage.className = 'stage';
        const canvas = document.createElement('div');
        canvas.className = 'canvas';
        canvas.style.width = this.designWidth + 'px';
        canvas.style.height = this.designHeight + 'px';
        canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        const slot = document.createElement('slot');
        slot.addEventListener('slotchange', this._onSlotChange);
        canvas.appendChild(slot);
        stage.appendChild(canvas);

        const tapzones = buildTapzones({
            onBack: (e) => { e.preventDefault(); this._go(this._index - 1, 'tap'); },
            onForward: (e) => { e.preventDefault(); this._go(this._index + 1, 'tap'); }
        });
        const overlay = buildOverlay({
            onPrev: () => this._go(this._index - 1, 'click'),
            onNext: () => this._go(this._index + 1, 'click'),
            onReset: () => this._go(0, 'click')
        });

        this._root.append(style, stage, tapzones, overlay);
        this._canvas = canvas;
        this._slot = slot;
        this._overlay = overlay;
        this._countEl = overlay.querySelector('.current');
        this._totalEl = overlay.querySelector('.total');
    }

    _syncPrintPageRule() {
        const id = 'deck-stage-print-page';
        let tag = document.getElementById(id);
        if (!tag) {
            tag = document.createElement('style');
            tag.id = id;
            document.head.appendChild(tag);
        }
        tag.textContent =
            '@page { size: ' + this.designWidth + 'px ' + this.designHeight + 'px; margin: 0; } ' +
            '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } ' +
            '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }';
    }

    _onSlotChange() {
        this._slides = collectSlides(this, this._slot);
        this._index = restoreIndex(this, this._slides);
        applyIndex(this, {
            index: this._index, prevIndex: this._prevIndex, slides: this._slides,
            countEl: this._countEl, showOverlay: false, broadcast: true, reason: 'init',
            flashFn: () => this._flashOverlay()
        });
        this._fit();
    }


    _flashOverlay() {
        if (!this._overlay) return;
        this._overlay.setAttribute('data-visible', '');
        if (this._hideTimer) clearTimeout(this._hideTimer);
        this._hideTimer = setTimeout(() => this._overlay.removeAttribute('data-visible'), OVERLAY_HIDE_MS);
    }

    _fit() {
        if (!this._canvas) return;
        if (this.hasAttribute('noscale')) { this._canvas.style.transform = 'none'; return; }
        const s = Math.min(window.innerWidth / this.designWidth, window.innerHeight / this.designHeight);
        this._canvas.style.transform = `scale(${s})`;
    }

    _onResize() { this._fit(); }
    _onMouseMove() { this._flashOverlay(); }
    _onKey(e) { if (handleDeckKey(this, e)) { e.preventDefault(); this._flashOverlay(); } }

    _go(i, reason = 'api') {
        if (!this._slides.length) return;
        const clamped = Math.max(0, Math.min(this._slides.length - 1, i));
        if (clamped === this._index) { this._flashOverlay(); return; }
        this._index = clamped;
        applyIndex(this, {
            index: this._index, prevIndex: this._prevIndex, slides: this._slides,
            countEl: this._countEl, showOverlay: true, broadcast: true, reason,
            flashFn: () => this._flashOverlay()
        });
    }

    get index() { return this._index; }
    get length() { return this._slides.length; }
    goTo(i) { this._go(i, 'api'); }
    next()   { this._go(this._index + 1, 'api'); }
    prev()   { this._go(this._index - 1, 'api'); }
    reset()  { this._go(0, 'api'); }
}

if (typeof customElements !== 'undefined' && !customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
}

export { DeckStage };
