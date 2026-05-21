// Overlay primitives — Tooltip, Popover, Dropdown + useLongPress, useFloating.
// Shared positioning (auto-flip + viewport clamp) in useFloating; consumed by
// all three. No inline styles except runtime left/top. CSS classes scoped to
// .ds-247420 (see editor-primitives.css).

import * as webjsx from '../../vendor/webjsx/index.js';
const h = webjsx.createElement;
const kids = (c) => c == null ? [] : (Array.isArray(c) ? c : [c]);
const FOCUSABLE_SEL = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// useFloating — compute left/top + auto-flip; re-runs on resize/scroll.
export function useFloating(anchorEl, contentEl, { placement = 'bottom-start', offset = 8 } = {}) {
    if (!anchorEl || !contentEl) return { update() {}, dispose() {}, finalPlacement: placement };
    let finalPlacement = placement;
    const compute = () => {
        const a = anchorEl.getBoundingClientRect(), c = contentEl.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        const [side, align = 'start'] = placement.split('-');
        let s = side;
        if (s === 'bottom' && a.bottom + offset + c.height > vh && a.top - offset - c.height >= 0) s = 'top';
        else if (s === 'top' && a.top - offset - c.height < 0 && a.bottom + offset + c.height <= vh) s = 'bottom';
        else if (s === 'right' && a.right + offset + c.width > vw && a.left - offset - c.width >= 0) s = 'left';
        else if (s === 'left' && a.left - offset - c.width < 0 && a.right + offset + c.width <= vw) s = 'right';
        let x = 0, y = 0;
        if (s === 'bottom' || s === 'top') {
            y = s === 'bottom' ? a.bottom + offset : a.top - offset - c.height;
            x = align === 'start' ? a.left : align === 'end' ? a.right - c.width : a.left + (a.width - c.width) / 2;
        } else {
            x = s === 'right' ? a.right + offset : a.left - offset - c.width;
            y = align === 'start' ? a.top : align === 'end' ? a.bottom - c.height : a.top + (a.height - c.height) / 2;
        }
        x = Math.max(4, Math.min(vw - c.width - 4, x));
        y = Math.max(4, Math.min(vh - c.height - 4, y));
        contentEl.style.left = x + 'px';
        contentEl.style.top = y + 'px';
        finalPlacement = s + '-' + align;
    };
    compute();
    const cb = () => compute();
    window.addEventListener('resize', cb);
    window.addEventListener('scroll', cb, true);
    return {
        update: compute,
        dispose() { window.removeEventListener('resize', cb); window.removeEventListener('scroll', cb, true); },
        get finalPlacement() { return finalPlacement; }
    };
}

// useLongPress — fire callback after ms held without movement.
export function useLongPress(targetEl, callback, { ms = 500 } = {}) {
    if (!targetEl) return () => {};
    let timer = null, sx = 0, sy = 0;
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const onDown = (e) => { sx = e.clientX || 0; sy = e.clientY || 0; cancel(); timer = setTimeout(() => { timer = null; callback(e); }, ms); };
    const onMove = (e) => { if (!timer) return; const dx = (e.clientX || 0) - sx, dy = (e.clientY || 0) - sy; if (dx * dx + dy * dy > 64) cancel(); };
    const evts = [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', cancel], ['pointerleave', cancel], ['pointercancel', cancel]];
    evts.forEach(([k, fn]) => targetEl.addEventListener(k, fn));
    return () => { cancel(); evts.forEach(([k, fn]) => targetEl.removeEventListener(k, fn)); };
}

// Tooltip — single shared bubble appended to <body>.
let _tipEl = null, _tipFloat = null, _tipTimer = null, _tipId = 0;
function _hideTip() {
    if (_tipTimer) { clearTimeout(_tipTimer); _tipTimer = null; }
    if (_tipFloat) { _tipFloat.dispose(); _tipFloat = null; }
    if (_tipEl) { _tipEl.hidden = true; _tipEl.className = 'ds-tooltip'; }
}
function _showTip(trigger, label, placement, kind) {
    if (typeof document === 'undefined') return;
    if (!_tipEl || !document.body.contains(_tipEl)) {
        _tipEl = document.createElement('div');
        _tipEl.className = 'ds-tooltip';
        _tipEl.setAttribute('role', 'tooltip');
        document.body.appendChild(_tipEl);
    }
    _tipEl.textContent = label;
    _tipEl.className = 'ds-tooltip kind-' + (kind || 'default');
    _tipEl.hidden = false;
    _tipEl.id = 'ds-tip-' + (++_tipId);
    trigger.setAttribute('aria-describedby', _tipEl.id);
    if (_tipFloat) _tipFloat.dispose();
    _tipFloat = useFloating(trigger, _tipEl, { placement, offset: 6 });
}

export function Tooltip({ children, label, placement = 'top', delay = 350, kind = 'default' } = {}) {
    const child = kids(children)[0];
    if (!child || !label) return child || null;
    const refFn = (el) => {
        if (!el || el._dsTip) return;
        el._dsTip = true;
        const schedule = () => { if (_tipTimer) clearTimeout(_tipTimer); _tipTimer = setTimeout(() => _showTip(el, label, placement, kind), delay); };
        const show = () => _showTip(el, label, placement, kind);
        el.addEventListener('pointerenter', schedule);
        el.addEventListener('pointerleave', _hideTip);
        el.addEventListener('focus', show);
        el.addEventListener('blur', _hideTip);
        el.addEventListener('keydown', (e) => { if (e.key === 'Escape') _hideTip(); });
        window.addEventListener('scroll', _hideTip, true);
        useLongPress(el, show, { ms: 500 });
    };
    const prevRef = child.props && child.props.ref;
    const wrap = (el) => { refFn(el); if (typeof prevRef === 'function') prevRef(el); };
    return webjsx.createElement(child.type, { ...(child.props || {}), ref: wrap }, ...(child.children || []));
}

// Popover — controlled, portaled to <body>.
const _popovers = new WeakMap();
export function Popover({ open, anchorEl, onClose, placement = 'bottom-start', children, ariaLabel } = {}) {
    if (typeof document === 'undefined') return null;
    const existing = anchorEl ? _popovers.get(anchorEl) : null;
    if (!open) {
        if (existing) { existing.dispose(); _popovers.delete(anchorEl); if (anchorEl && anchorEl.focus) anchorEl.focus(); }
        return null;
    }
    if (existing || !anchorEl) return null;
    const el = document.createElement('div');
    el.className = 'ds-popover';
    el.setAttribute('role', 'dialog');
    if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
    el.tabIndex = -1;
    document.body.appendChild(el);
    webjsx.applyDiff(el, h('div', { class: 'ds-popover-inner' }, ...kids(children)));
    const floating = useFloating(anchorEl, el, { placement, offset: 6 });
    const close = () => onClose && onClose();
    const onDown = (e) => { if (el.contains(e.target) || anchorEl.contains(e.target)) return; close(); };
    const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key !== 'Tab') return;
        const nodes = el.querySelectorAll(FOCUSABLE_SEL); if (!nodes.length) { e.preventDefault(); return; }
        const first = nodes[0], last = nodes[nodes.length - 1], a = document.activeElement;
        if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);
    queueMicrotask(() => { const f = el.querySelector(FOCUSABLE_SEL); (f || el).focus(); });
    _popovers.set(anchorEl, { dispose() {
        document.removeEventListener('mousedown', onDown, true);
        floating.dispose();
        if (el.parentNode) el.parentNode.removeChild(el);
    }});
    return null;
}

// Dropdown — button trigger + portaled menu.
export function Dropdown({ trigger, items = [], onSelect, placement = 'bottom-start', ariaLabel } = {}) {
    let triggerEl = null, open = false, menuEl = null, floating = null, typeBuf = '', typeTimer = null;
    const liveBtns = () => menuEl ? [...menuEl.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')] : [];
    const focusItem = (idx) => { const b = liveBtns(); if (!b.length) return; b[((idx % b.length) + b.length) % b.length].focus(); };
    const onDown = (e) => { if (menuEl && menuEl.contains(e.target)) return; if (triggerEl && triggerEl.contains(e.target)) return; close(false); };
    const close = (restore = true) => {
        if (!open) return; open = false;
        if (floating) { floating.dispose(); floating = null; }
        if (menuEl && menuEl.parentNode) menuEl.parentNode.removeChild(menuEl);
        menuEl = null;
        document.removeEventListener('mousedown', onDown, true);
        if (triggerEl) triggerEl.setAttribute('aria-expanded', 'false');
        if (restore && triggerEl) triggerEl.focus();
    };
    const select = (it) => { if (it.disabled || it.separator) return; if (onSelect) onSelect(it.id, it); close(); };
    const onMenuKey = (e) => {
        const b = liveBtns(), idx = b.indexOf(document.activeElement);
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(idx + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(idx - 1); }
        else if (e.key === 'Home') { e.preventDefault(); focusItem(0); }
        else if (e.key === 'End') { e.preventDefault(); focusItem(b.length - 1); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (idx >= 0) b[idx].click(); }
        else if (e.key.length === 1 && /\S/.test(e.key)) {
            typeBuf += e.key.toLowerCase();
            if (typeTimer) clearTimeout(typeTimer);
            typeTimer = setTimeout(() => { typeBuf = ''; }, 600);
            const m = items.findIndex(it => !it.separator && !it.disabled && (it.label || '').toLowerCase().startsWith(typeBuf));
            if (m >= 0) focusItem(items.slice(0, m).filter(it => !it.separator && !it.disabled).length);
        }
    };
    const openMenu = (focusFirst = true) => {
        if (open || !triggerEl) return;
        open = true;
        menuEl = document.createElement('div');
        menuEl.className = 'ds-popover ds-dropdown-menu';
        menuEl.setAttribute('role', 'menu');
        if (ariaLabel) menuEl.setAttribute('aria-label', ariaLabel);
        menuEl.tabIndex = -1;
        const tree = h('div', { class: 'ds-dropdown-list' },
            ...items.map((it, i) => it.separator
                ? h('div', { key: 'sep' + i, class: 'ds-dropdown-separator', role: 'separator' })
                : h('button', {
                    key: it.id || i, type: 'button', role: 'menuitem',
                    class: 'ds-dropdown-item' + (it.danger ? ' is-danger' : ''),
                    'aria-disabled': it.disabled ? 'true' : 'false',
                    tabindex: '-1', onclick: () => select(it),
                },
                    it.glyph != null ? h('span', { class: 'ds-dropdown-glyph', 'aria-hidden': 'true' }, it.glyph) : null,
                    h('span', { class: 'ds-dropdown-label' }, it.label)
                )));
        webjsx.applyDiff(menuEl, tree);
        document.body.appendChild(menuEl);
        menuEl.addEventListener('keydown', onMenuKey);
        floating = useFloating(triggerEl, menuEl, { placement, offset: 4 });
        document.addEventListener('mousedown', onDown, true);
        triggerEl.setAttribute('aria-expanded', 'true');
        if (focusFirst) queueMicrotask(() => focusItem(0));
    };
    const onTrigClick = () => { if (open) close(false); else openMenu(true); };
    const onTrigKey = (e) => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!open) openMenu(true); else focusItem(0); } };
    const refFn = (el) => {
        if (!el || el._dsDropdown) return;
        el._dsDropdown = true; triggerEl = el;
        el.addEventListener('click', onTrigClick);
        el.addEventListener('keydown', onTrigKey);
        el.setAttribute('aria-haspopup', 'menu');
        el.setAttribute('aria-expanded', 'false');
    };
    const child = (typeof trigger === 'function') ? trigger() : trigger;
    return (child && child.type)
        ? webjsx.createElement(child.type, { ...(child.props || {}), ref: refFn }, ...(child.children || []))
        : h('button', { type: 'button', class: 'ds-dropdown-trigger', ref: refFn }, child || 'Menu');
}
