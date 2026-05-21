// Editor primitives — generic chrome for in-engine editors, inspectors,
// IDEs, debug HUDs. Pure factories, h-based, theme-token driven. All
// visuals route through CSS classes defined in editor-primitives.css;
// no hex/rgba literals appear in this file. Theme switching happens
// via the kit's data-theme attribute on the .ds-247420 scope root.

import * as webjsx from '../../vendor/webjsx/index.js';
const h = webjsx.createElement;

function kids(c) { return c == null ? [] : (Array.isArray(c) ? c : [c]); }

export function Toolbar({ leading = [], trailing = [], dense = false, children } = {}) {
    const cls = 'ds-ep-toolbar' + (dense ? ' dense' : '');
    return h('div', { class: cls, role: 'toolbar' },
        h('div', { class: 'ds-ep-toolbar-leading' }, ...kids(leading)),
        children != null ? h('div', { class: 'ds-ep-toolbar-center' }, ...kids(children)) : null,
        h('div', { class: 'ds-ep-toolbar-trailing' }, ...kids(trailing))
    );
}

export function Tabs({ items = [], active, onChange, children } = {}) {
    return h('div', { class: 'ds-ep-tabs' },
        h('div', { class: 'ds-ep-tabs-head', role: 'tablist' },
            ...items.map((it) => h('button', {
                key: it.id,
                type: 'button',
                class: 'ds-ep-tab' + (it.id === active ? ' active' : ''),
                role: 'tab',
                'aria-selected': it.id === active ? 'true' : 'false',
                onclick: () => onChange && onChange(it.id)
            }, it.label))
        ),
        h('div', { class: 'ds-ep-tabs-body', role: 'tabpanel' }, ...kids(children))
    );
}

export function TreeView({ children } = {}) {
    return h('div', { class: 'ds-ep-tree', role: 'tree' }, ...kids(children));
}

export function TreeItem({ label, glyph, tag, depth = 0, selected = false, expanded = false, onSelect, onToggle, children, hasChildren } = {}) {
    // Support legacy 'hasChildren' prop for future; infer from children param
    const hasKids = hasChildren != null ? hasChildren : (children != null);
    return h('div', {
        class: 'ds-ep-tree-item' + (selected ? ' selected' : ''),
        role: 'treeitem',
        'aria-selected': selected ? 'true' : 'false',
        'aria-expanded': hasKids ? String(!!expanded) : null
    },
        h('div', {
            class: 'ds-ep-tree-row',
            style: 'padding-left:' + (depth * 12 + 6) + 'px',
            onclick: () => onSelect && onSelect()
        },
            h('span', {
                class: 'ds-ep-tree-twist' + (expanded ? ' open' : ''),
                onclick: (e) => { e.stopPropagation(); if (hasKids && onToggle) onToggle(); }
            }, hasKids ? '▸' : ''),
            glyph != null ? h('span', { class: 'ds-ep-tree-glyph' }, glyph) : null,
            h('span', { class: 'ds-ep-tree-label' }, label),
            tag != null ? h('span', { class: 'ds-ep-tree-tag' }, tag) : null
        ),
        hasKids && expanded ? h('div', { class: 'ds-ep-tree-children', role: 'group' }, ...kids(children)) : null
    );
}

export function PropertyGrid({ children } = {}) {
    return h('div', { class: 'ds-ep-propgrid', role: 'group' }, ...kids(children));
}

export function PropertyField({ label, hint, inline = false, children } = {}) {
    return h('label', { class: 'ds-ep-propfield' + (inline ? ' inline' : '') },
        h('span', { class: 'ds-ep-propfield-label' }, label),
        h('span', { class: 'ds-ep-propfield-value' }, ...kids(children)),
        hint != null ? h('span', { class: 'ds-ep-propfield-hint' }, hint) : null
    );
}

export function Dock({ top, left, right, bottom, center } = {}) {
    return h('div', { class: 'ds-ep-dock' },
        top    != null ? h('div', { class: 'ds-ep-dock-top' },    ...kids(top))    : null,
        left   != null ? h('div', { class: 'ds-ep-dock-left' },   ...kids(left))   : null,
        h('div', { class: 'ds-ep-dock-center' }, ...kids(center)),
        right  != null ? h('div', { class: 'ds-ep-dock-right' },  ...kids(right))  : null,
        bottom != null ? h('div', { class: 'ds-ep-dock-bottom' }, ...kids(bottom)) : null
    );
}

// ---------------------------------------------------------------------------
// Breakpoints + useMediaQuery
// ---------------------------------------------------------------------------
export const BP_SM = 480;
export const BP_MD = 768;
export const BP_LG = 1024;
export const BP_XL = 1440;

export function useMediaQuery(query) {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return { matches: false, addListener: () => {}, removeListener: () => {} };
    }
    const mql = window.matchMedia(query);
    return {
        get matches() { return mql.matches; },
        addListener(fn) { mql.addEventListener ? mql.addEventListener('change', fn) : mql.addListener(fn); },
        removeListener(fn) { mql.removeEventListener ? mql.removeEventListener('change', fn) : mql.removeListener(fn); },
    };
}

// ---------------------------------------------------------------------------
// FocusTrap — wraps subtree, traps Tab/Shift+Tab. Mount/unmount lifecycle is
// managed via DOM-level keydown listener attached when first focused.
// ---------------------------------------------------------------------------
const FOCUSABLE_SEL = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function trapTabKey(rootEl, e) {
    if (e.key !== 'Tab') return;
    const nodes = rootEl.querySelectorAll(FOCUSABLE_SEL);
    if (!nodes.length) { e.preventDefault(); return; }
    const first = nodes[0], last = nodes[nodes.length - 1];
    const active = (rootEl.getRootNode && rootEl.getRootNode().activeElement) || document.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}

export function FocusTrap({ children } = {}) {
    return h('div', {
        class: 'ds-ep-focustrap',
        tabindex: '-1',
        ref: (el) => {
            if (!el || el._dsTrap) return;
            el._dsTrap = true;
            el.addEventListener('keydown', (e) => trapTabKey(el, e));
            // Auto-focus first focusable
            queueMicrotask(() => {
                const first = el.querySelector(FOCUSABLE_SEL);
                if (first) first.focus();
                else el.focus();
            });
        }
    }, ...kids(children));
}

// ---------------------------------------------------------------------------
// ResizeHandle — splitter, axis = 'horizontal' (vertical bar, horiz drag)
// or 'vertical' (horizontal bar, vertical drag). onResize(delta:px).
// ---------------------------------------------------------------------------
export function ResizeHandle({ axis = 'horizontal', onResize, ariaLabel } = {}) {
    const isH = axis === 'horizontal';
    let dragOrigin = null;
    const step = 8;
    const emit = (dx, dy) => { if (onResize) onResize(isH ? dx : dy); };
    const onPointerDown = (e) => {
        e.preventDefault();
        dragOrigin = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
        if (!dragOrigin) return;
        const dx = e.clientX - dragOrigin.x;
        const dy = e.clientY - dragOrigin.y;
        dragOrigin = { x: e.clientX, y: e.clientY };
        emit(dx, dy);
    };
    const onPointerUp = (e) => {
        dragOrigin = null;
        try { e.currentTarget.releasePointerCapture && e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    };
    const onKeyDown = (e) => {
        const k = e.key;
        if (isH) {
            if (k === 'ArrowLeft') { e.preventDefault(); emit(-step, 0); }
            else if (k === 'ArrowRight') { e.preventDefault(); emit(step, 0); }
            else if (k === 'Home') { e.preventDefault(); emit(-1e6, 0); }
            else if (k === 'End') { e.preventDefault(); emit(1e6, 0); }
        } else {
            if (k === 'ArrowUp') { e.preventDefault(); emit(0, -step); }
            else if (k === 'ArrowDown') { e.preventDefault(); emit(0, step); }
            else if (k === 'Home') { e.preventDefault(); emit(0, -1e6); }
            else if (k === 'End') { e.preventDefault(); emit(0, 1e6); }
        }
    };
    return h('div', {
        class: 'ds-ep-resize ' + (isH ? 'axis-h' : 'axis-v'),
        role: 'separator',
        tabindex: '0',
        'aria-orientation': isH ? 'vertical' : 'horizontal',
        'aria-label': ariaLabel || 'Resize',
        onpointerdown: onPointerDown,
        onpointermove: onPointerMove,
        onpointerup: onPointerUp,
        onpointercancel: onPointerUp,
        onkeydown: onKeyDown,
    });
}

// ---------------------------------------------------------------------------
// SplitPanel — two children separated by a ResizeHandle. Stateful via DOM.
// ---------------------------------------------------------------------------
export function SplitPanel({ orientation = 'horizontal', initial = '50%', min = 80, max = Infinity, children } = {}) {
    const isH = orientation === 'horizontal';
    const ks = kids(children);
    const first = ks[0] || null;
    const second = ks[1] || null;
    const sizeProp = isH ? 'width' : 'height';
    const initStyle = typeof initial === 'number' ? initial + 'px' : initial;
    let rootEl = null;
    const onResize = (delta) => {
        if (!rootEl) return;
        const a = rootEl.firstChild;
        if (!a) return;
        const rect = a.getBoundingClientRect();
        const curr = isH ? rect.width : rect.height;
        const total = isH ? rootEl.getBoundingClientRect().width : rootEl.getBoundingClientRect().height;
        const next = Math.max(min, Math.min(max === Infinity ? total - min : max, curr + delta));
        a.style[sizeProp] = next + 'px';
        a.style.flex = '0 0 auto';
    };
    return h('div', {
        class: 'ds-ep-split ' + (isH ? 'horiz' : 'vert'),
        ref: (el) => { rootEl = el; }
    },
        h('div', { class: 'ds-ep-split-pane', style: sizeProp + ':' + initStyle + ';flex:0 0 auto' }, first),
        ResizeHandle({ axis: isH ? 'horizontal' : 'vertical', onResize }),
        h('div', { class: 'ds-ep-split-pane grow', style: 'flex:1 1 0;min-' + sizeProp + ':0' }, second)
    );
}

// ---------------------------------------------------------------------------
// ContextMenu — items, anchor {x,y}, onClose. Viewport-clamped. Keyboard nav.
// ---------------------------------------------------------------------------
export function ContextMenu({ items = [], anchor = { x: 0, y: 0 }, onClose } = {}) {
    let rootEl = null;
    const close = () => { if (onClose) onClose(); };
    const select = (it) => {
        if (it.disabled || it.separator) return;
        if (it.onSelect) it.onSelect();
        close();
    };
    const onKey = (e) => {
        const btns = rootEl ? [...rootEl.querySelectorAll('button[data-ix]')] : [];
        const active = document.activeElement;
        const idx = btns.indexOf(active);
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); (btns[(idx + 1) % btns.length] || btns[0])?.focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (btns[(idx - 1 + btns.length) % btns.length] || btns[0])?.focus(); }
        else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); btns[idx].click(); }
    };
    return h('div', {
        class: 'ds-ep-ctxmenu-backdrop',
        onmousedown: (e) => { if (e.target === e.currentTarget) close(); },
        oncontextmenu: (e) => { e.preventDefault(); close(); },
    },
        h('div', {
            class: 'ds-ep-ctxmenu',
            role: 'menu',
            tabindex: '-1',
            onkeydown: onKey,
            ref: (el) => {
                if (!el) return;
                rootEl = el;
                // Clamp to viewport
                const vw = window.innerWidth, vh = window.innerHeight;
                let x = anchor.x || 0, y = anchor.y || 0;
                el.style.left = '0px'; el.style.top = '0px';
                const r = el.getBoundingClientRect();
                if (x + r.width > vw) x = Math.max(0, vw - r.width - 4);
                if (y + r.height > vh) y = Math.max(0, vh - r.height - 4);
                el.style.left = x + 'px';
                el.style.top = y + 'px';
                queueMicrotask(() => { el.querySelector('button[data-ix]')?.focus(); });
            }
        },
            ...items.map((it, i) => it.separator
                ? h('div', { key: 'sep' + i, class: 'ds-ep-ctxmenu-sep', role: 'separator' })
                : h('button', {
                    key: i, type: 'button', role: 'menuitem',
                    'data-ix': String(i),
                    class: 'ds-ep-ctxmenu-item' + (it.danger ? ' danger' : '') + (it.disabled ? ' disabled' : ''),
                    disabled: it.disabled ? 'disabled' : null,
                    onclick: () => select(it),
                },
                    it.icon != null ? h('span', { class: 'ds-ep-ctxmenu-icon' }, it.icon) : null,
                    h('span', { class: 'ds-ep-ctxmenu-label' }, it.label)
                ))
        )
    );
}

// Helper: wires right-click + long-press to a target ref. Caller manages state.
export function useContextMenu(targetEl, items, openCb) {
    if (!targetEl) return () => {};
    let touchTimer = null;
    const open = (x, y) => { if (openCb) openCb({ x, y, items }); };
    const onCtx = (e) => { e.preventDefault(); open(e.clientX, e.clientY); };
    const onTouchStart = (e) => {
        const t = e.touches && e.touches[0]; if (!t) return;
        touchTimer = setTimeout(() => { open(t.clientX, t.clientY); }, 500);
    };
    const cancel = () => { if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; } };
    targetEl.addEventListener('contextmenu', onCtx);
    targetEl.addEventListener('touchstart', onTouchStart, { passive: true });
    targetEl.addEventListener('touchmove', cancel, { passive: true });
    targetEl.addEventListener('touchend', cancel);
    targetEl.addEventListener('touchcancel', cancel);
    return () => {
        targetEl.removeEventListener('contextmenu', onCtx);
        targetEl.removeEventListener('touchstart', onTouchStart);
        targetEl.removeEventListener('touchmove', cancel);
        targetEl.removeEventListener('touchend', cancel);
        targetEl.removeEventListener('touchcancel', cancel);
        cancel();
    };
}

// ---------------------------------------------------------------------------
// Drawer — slide-in from side. side='left'|'right'|'bottom'.
// ---------------------------------------------------------------------------
export function Drawer({ side = 'left', open = false, onClose, children, ariaLabel } = {}) {
    if (!open) return null;
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose && onClose(); } };
    return h('div', {
        class: 'ds-ep-drawer-backdrop',
        onmousedown: (e) => { if (e.target === e.currentTarget) onClose && onClose(); },
    },
        h('div', {
            class: 'ds-ep-drawer side-' + side,
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': ariaLabel || 'Drawer',
            tabindex: '-1',
            onkeydown: onKey,
            ref: (el) => {
                if (!el || el._dsTrap) return;
                el._dsTrap = true;
                el.addEventListener('keydown', (e) => trapTabKey(el, e));
                queueMicrotask(() => {
                    const f = el.querySelector(FOCUSABLE_SEL);
                    (f || el).focus();
                });
            },
        }, ...kids(children))
    );
}

// ---------------------------------------------------------------------------
// Dialog — modal. actions = [{label, onClick, kind?}], dismissible (backdrop).
// ---------------------------------------------------------------------------
export function Dialog({ title, open = false, onClose, children, actions = [], dismissible = false, ariaLabel } = {}) {
    if (!open) return null;
    const opener = (typeof document !== 'undefined') ? document.activeElement : null;
    const close = () => {
        if (onClose) onClose();
        if (opener && opener.focus) queueMicrotask(() => opener.focus());
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    return h('div', {
        class: 'ds-ep-dialog-backdrop',
        onmousedown: (e) => { if (dismissible && e.target === e.currentTarget) close(); },
    },
        h('div', {
            class: 'ds-ep-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': ariaLabel || title || 'Dialog',
            tabindex: '-1',
            onkeydown: onKey,
            ref: (el) => {
                if (!el || el._dsTrap) return;
                el._dsTrap = true;
                el.addEventListener('keydown', (e) => trapTabKey(el, e));
                queueMicrotask(() => {
                    const f = el.querySelector(FOCUSABLE_SEL);
                    (f || el).focus();
                });
            },
        },
            title != null ? h('div', { class: 'ds-ep-dialog-head' }, h('h2', { class: 'ds-ep-dialog-title' }, title)) : null,
            h('div', { class: 'ds-ep-dialog-body' }, ...kids(children)),
            actions && actions.length ? h('div', { class: 'ds-ep-dialog-actions' },
                ...actions.map((a, i) => h('button', {
                    key: i, type: 'button',
                    class: 'ds-ep-dialog-btn' + (a.kind ? (' kind-' + a.kind) : ''),
                    onclick: (e) => { if (a.onClick) a.onClick(e); if (a.close !== false) close(); }
                }, a.label))
            ) : null
        )
    );
}

// ---------------------------------------------------------------------------
// Toast — Toast({message,kind,duration}) component + imperative toast(opts).
// ---------------------------------------------------------------------------
export function Toast({ message, kind = 'info', duration = 3000, onClose } = {}) {
    return h('div', {
        class: 'ds-ep-toast kind-' + kind,
        role: 'status',
        'aria-live': 'polite',
        ref: (el) => {
            if (!el || el._dsToast) return;
            el._dsToast = true;
            if (duration > 0) setTimeout(() => { onClose && onClose(); el.classList.add('leaving'); }, duration);
        }
    }, message);
}

let _toastHostEl = null;
function ensureToastHost() {
    if (typeof document === 'undefined') return null;
    if (_toastHostEl && document.body.contains(_toastHostEl)) return _toastHostEl;
    _toastHostEl = document.createElement('div');
    _toastHostEl.className = 'ds-ep-toast-host';
    document.body.appendChild(_toastHostEl);
    return _toastHostEl;
}

export function toast({ message, kind = 'info', duration = 3000 } = {}) {
    const host = ensureToastHost();
    if (!host) return () => {};
    const el = document.createElement('div');
    el.className = 'ds-ep-toast kind-' + kind;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = message;
    host.appendChild(el);
    const dismiss = () => {
        if (!el.parentNode) return;
        el.classList.add('leaving');
        setTimeout(() => { el.parentNode && el.parentNode.removeChild(el); }, 200);
    };
    if (duration > 0) setTimeout(dismiss, duration);
    return dismiss;
}

export function IconButtonGroup({ items = [], value, onChange, dense = false } = {}) {
    return h('div', { class: 'ds-ep-btngrp' + (dense ? ' dense' : ''), role: 'group' },
        ...items.map((it) => h('button', {
            key: it.id,
            type: 'button',
            class: 'ds-ep-btngrp-btn' + (it.id === value ? ' active' : ''),
            title: it.title || it.label || it.id,
            'aria-pressed': it.id === value ? 'true' : 'false',
            disabled: it.disabled ? 'disabled' : null,
            onclick: () => { if (!it.disabled && onChange) onChange(it.id); }
        }, it.glyph != null ? it.glyph : it.label))
    );
}
