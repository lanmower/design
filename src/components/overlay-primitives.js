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

// Clamp a fixed-position box to the viewport given desired top-left coords.
function _clampToViewport(x, y, w, h, margin = 8) {
    const vw = (typeof window !== 'undefined' ? window.innerWidth : 1024);
    const vh = (typeof window !== 'undefined' ? window.innerHeight : 768);
    return {
        left: Math.max(margin, Math.min(vw - w - margin, x)),
        top: Math.max(margin, Math.min(vh - h - margin, y)),
    };
}

// CommandPalette — centered Cmd+K palette with live filter + keyboard nav.
export function CommandPalette({ open, items = [], onSelect, onClose } = {}) {
    if (!open) return null;
    const list = Array.isArray(items) ? items : [];
    const labelOf = (it) => String(it.label || it.title || it.name || '');
    let active = 0, filterText = '';

    const matches = () => {
        const q = filterText.trim().toLowerCase();
        return q ? list.filter(it => labelOf(it).toLowerCase().includes(q)) : list.slice();
    };

    const rowsFor = (filtered) => {
        const out = [];
        let lastGroup = null, flatIdx = 0;
        for (const it of filtered) {
            const grp = it.group != null ? String(it.group) : null;
            if (grp && grp !== lastGroup) {
                out.push(h('div', { class: 'ov-cmd-group', role: 'presentation' }, grp));
                lastGroup = grp;
            }
            const idx = flatIdx++;
            const glyph = it.icon != null ? it.icon : (it.glyph != null ? it.glyph : null);
            const hint = it.hint != null ? it.hint : (it.shortcut != null ? it.shortcut : null);
            out.push(h('button', {
                type: 'button', role: 'option',
                'data-idx': String(idx),
                'aria-selected': idx === active ? 'true' : 'false',
                class: 'ov-cmd-item' + (idx === active ? ' is-active' : ''),
                onclick: () => choose(it),
                onmousemove: () => { if (active !== idx) { active = idx; renderInner(); } },
            },
                glyph != null ? h('span', { class: 'ov-cmd-glyph', 'aria-hidden': 'true' }, glyph) : null,
                h('span', { class: 'ov-cmd-label' }, labelOf(it)),
                hint != null ? h('span', { class: 'ov-cmd-hint' }, hint) : null
            ));
        }
        return out;
    };

    let rootEl = null, inputEl = null, listEl = null, flat = [];
    const close = () => onClose && onClose();
    const choose = (it) => { if (it && onSelect) onSelect(it); };

    const renderInner = () => {
        if (!listEl) return;
        const filtered = matches();
        flat = filtered;
        if (active >= filtered.length) active = Math.max(0, filtered.length - 1);
        webjsx.applyDiff(listEl, h('div', { class: 'ov-cmd-list-inner' },
            filtered.length ? rowsFor(filtered) : h('div', { class: 'ov-cmd-empty' }, 'No results')));
        const sel = listEl.querySelector('.ov-cmd-item.is-active');
        if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
    };

    const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); if (flat.length) { active = (active + 1) % flat.length; renderInner(); } }
        else if (e.key === 'ArrowUp') { e.preventDefault(); if (flat.length) { active = (active - 1 + flat.length) % flat.length; renderInner(); } }
        else if (e.key === 'Enter') { e.preventDefault(); if (flat[active]) choose(flat[active]); }
    };

    return h('div', {
        class: 'ov-cmd-backdrop', role: 'presentation',
        ref: (el) => {
            if (!el || el._ovCmd) return; el._ovCmd = true; rootEl = el;
            el.addEventListener('mousedown', (e) => {
                const panel = el.querySelector('.ov-cmd-panel');
                if (panel && !panel.contains(e.target)) close();
            });
        },
    },
        h('div', { class: 'ov-cmd-panel', role: 'dialog', 'aria-label': 'Command palette', onkeydown: onKey },
            h('input', {
                type: 'text', class: 'ov-cmd-input', placeholder: 'Type a command…',
                'aria-label': 'Filter commands',
                oninput: (e) => { filterText = e.target.value; active = 0; renderInner(); },
                ref: (el) => { if (!el || el._ovCmdIn) return; el._ovCmdIn = true; inputEl = el; queueMicrotask(() => el.focus()); },
            }),
            h('div', { class: 'ov-cmd-list', role: 'listbox',
                ref: (el) => { if (!el) return; listEl = el; queueMicrotask(renderInner); } })
        )
    );
}

const EMOJI_CATEGORIES = [
    { id: 'smileys', label: '😀', emoji: ['😀','😁','😂','🤣','😊','😍','😘','😎','🤔','😅','😉','🙂','😇','🥳','😴','🤩','😜','😢','😭','😡','😱','🥺','😤','😬'] },
    { id: 'gestures', label: '👍', emoji: ['👍','👎','👌','✌️','🤞','🙏','👏','🙌','💪','👀','🤝','✋','🤙','👋','🤟','☝️'] },
    { id: 'hearts', label: '❤️', emoji: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💖','💗'] },
    { id: 'symbols', label: '✅', emoji: ['🔥','💯','✅','❌','⭐','🎉','🎊','✨','💡','⚡','💢','💀','🚀','🏆'] },
];

// EmojiPicker — fixed popover near (anchorX, anchorY) with category tabs + grid.
export function EmojiPicker({ open, anchorX = 0, anchorY = 0, onSelect, onClose } = {}) {
    if (!open) return null;
    let cat = EMOJI_CATEGORIES[0].id;
    let rootEl = null, gridEl = null;
    const close = () => onClose && onClose();

    const renderGrid = () => {
        if (!gridEl) return;
        const c = EMOJI_CATEGORIES.find(x => x.id === cat) || EMOJI_CATEGORIES[0];
        webjsx.applyDiff(gridEl, h('div', { class: 'ov-emoji-grid-inner' },
            ...c.emoji.map((ch) => h('button', {
                type: 'button', class: 'ov-emoji-cell', 'aria-label': ch,
                onclick: () => { if (onSelect) onSelect(ch); },
            }, ch))));
    };

    return h('div', {
        class: 'ov-emoji-root', role: 'dialog', 'aria-label': 'Emoji picker',
        tabindex: '-1',
        onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } },
        ref: (el) => {
            if (!el || el._ovEmoji) return; el._ovEmoji = true; rootEl = el;
            const place = () => {
                const r = el.getBoundingClientRect();
                const { left, top } = _clampToViewport(anchorX, anchorY, r.width || 260, r.height || 240);
                el.style.left = left + 'px'; el.style.top = top + 'px';
            };
            queueMicrotask(() => { place(); el.focus(); });
            const onDown = (e) => { if (!el.contains(e.target)) close(); };
            queueMicrotask(() => document.addEventListener('mousedown', onDown, true));
            el._ovEmojiCleanup = () => document.removeEventListener('mousedown', onDown, true);
        },
    },
        h('div', { class: 'ov-emoji-tabs', role: 'tablist' },
            ...EMOJI_CATEGORIES.map((c) => h('button', {
                type: 'button', class: 'ov-emoji-tab', role: 'tab',
                'aria-selected': c.id === cat ? 'true' : 'false',
                onclick: (e) => {
                    cat = c.id;
                    const tabs = rootEl.querySelectorAll('.ov-emoji-tab');
                    tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
                    e.currentTarget.setAttribute('aria-selected', 'true');
                    renderGrid();
                },
            }, c.label))),
        h('div', { class: 'ov-emoji-grid',
            ref: (el) => { if (!el) return; gridEl = el; queueMicrotask(renderGrid); } })
    );
}

// BootOverlay — full-screen brand/progress overlay with error state.
export function BootOverlay({ progress = 0, phase = '', errored = false, visible = false } = {}) {
    if (!visible) return null;
    let pct = Number(progress) || 0;
    if (pct <= 1) pct = pct * 100;
    pct = Math.max(0, Math.min(100, pct));
    return h('div', { class: 'ov-boot' + (errored ? ' is-error' : ''), role: errored ? 'alert' : 'status', 'aria-live': 'polite' },
        h('div', { class: 'ov-boot-inner' },
            errored
                ? h('div', { class: 'ov-boot-mark ov-boot-mark-error', 'aria-hidden': 'true' }, '⚠')
                : h('div', { class: 'ov-boot-spinner', 'aria-hidden': 'true' }),
            !errored ? h('div', { class: 'ov-boot-bar', role: 'progressbar',
                'aria-valuenow': String(Math.round(pct)), 'aria-valuemin': '0', 'aria-valuemax': '100' },
                h('div', { class: 'ov-boot-bar-fill', style: 'width:' + pct + '%' })) : null,
            h('div', { class: 'ov-boot-phase' }, String(phase || (errored ? 'Error' : 'Loading…')))
        )
    );
}

// SettingsPopover — fixed popover with generic section/row control rendering.
export function SettingsPopover({ title = 'Settings', open, anchorX = 0, anchorY = 0, sections = [], onClose } = {}) {
    if (!open) return null;
    const close = () => onClose && onClose();
    const secs = Array.isArray(sections) ? sections : [];

    const renderRow = (row, i) => {
        const label = row.label != null ? row.label : (row.title != null ? row.title : '');
        const kind = row.kind;
        const labelNode = h('span', { class: 'ov-set-row-label' }, String(label));
        let control = null;
        if (kind === 'select') {
            const opts = Array.isArray(row.options) ? row.options : [];
            control = h('select', {
                class: 'ov-set-control', value: row.value != null ? String(row.value) : undefined,
                onchange: (e) => row.onChange && row.onChange(e.target.value),
            }, ...opts.map(o => {
                const v = (o && typeof o === 'object') ? o.value : o;
                const l = (o && typeof o === 'object') ? (o.label != null ? o.label : o.value) : o;
                return h('option', { value: String(v), selected: String(v) === String(row.value) ? 'selected' : undefined }, String(l));
            }));
        } else if (kind === 'toggle') {
            control = h('input', {
                type: 'checkbox', class: 'ov-set-toggle',
                checked: row.value ? 'checked' : undefined,
                onchange: (e) => row.onChange && row.onChange(e.target.checked),
            });
        } else if (kind === 'range') {
            control = h('input', {
                type: 'range', class: 'ov-set-control',
                min: String(row.min != null ? row.min : 0),
                max: String(row.max != null ? row.max : 100),
                step: String(row.step != null ? row.step : 1),
                value: String(row.value != null ? row.value : 0),
                oninput: (e) => row.onChange && row.onChange(Number(e.target.value)),
            });
        } else if (kind === 'button') {
            control = h('button', { type: 'button', class: 'ov-set-btn',
                onclick: () => row.onClick && row.onClick() }, String(label || 'Action'));
            return h('div', { class: 'ov-set-row', key: i }, control);
        } else {
            control = h('span', { class: 'ov-set-row-value' }, String(row.value != null ? row.value : ''));
        }
        return h('div', { class: 'ov-set-row', key: i }, labelNode, control);
    };

    return h('div', {
        class: 'ov-set-root', role: 'dialog', 'aria-label': String(title), tabindex: '-1',
        onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } },
        ref: (el) => {
            if (!el || el._ovSet) return; el._ovSet = true;
            const place = () => {
                const r = el.getBoundingClientRect();
                const { left, top } = _clampToViewport(anchorX, anchorY, r.width || 280, r.height || 200);
                el.style.left = left + 'px'; el.style.top = top + 'px';
            };
            queueMicrotask(() => { place(); el.focus(); });
            const onDown = (e) => { if (!el.contains(e.target)) close(); };
            queueMicrotask(() => document.addEventListener('mousedown', onDown, true));
        },
    },
        h('div', { class: 'ov-set-head' }, String(title)),
        h('div', { class: 'ov-set-body' },
            ...secs.map((sec, si) => {
                const slabel = sec.label != null ? sec.label : (sec.title != null ? sec.title : '');
                const rows = Array.isArray(sec.rows) ? sec.rows : (Array.isArray(sec.items) ? sec.items : []);
                return h('div', { class: 'ov-set-section', key: si },
                    slabel ? h('div', { class: 'ov-set-section-head' }, String(slabel)) : null,
                    ...rows.map((r, ri) => renderRow(r, ri)));
            }))
    );
}

// AuthModal — centered login dialog: extension / generate / import (nsec) modes.
export function AuthModal({ mode = 'extension', error = '', busy = false, open = false, onModeChange, onConnectExtension, onGenerate, onImport, onClose } = {}) {
    if (!open) return null;
    const close = () => onClose && onClose();
    const modes = [
        { id: 'extension', label: 'Extension' },
        { id: 'generate', label: 'Generate' },
        { id: 'import', label: 'Import key' },
    ];
    let nsec = '';
    const body = () => {
        if (mode === 'generate') {
            return [
                h('p', { class: 'ov-auth-hint' }, 'Create a fresh Nostr identity. Back up the key after.'),
                h('button', { type: 'button', class: 'ov-auth-primary', disabled: busy ? true : null,
                    onclick: () => onGenerate && onGenerate() }, busy ? 'Working…' : 'Generate new key'),
            ];
        }
        if (mode === 'import') {
            return [
                h('p', { class: 'ov-auth-hint' }, 'Paste an existing nsec / hex secret key.'),
                h('input', {
                    type: 'password', class: 'ov-auth-input', placeholder: 'nsec1…',
                    'aria-label': 'secret key', disabled: busy ? true : null,
                    oninput: (e) => { nsec = e.target.value; },
                    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); onImport && onImport(nsec); } },
                }),
                h('button', { type: 'button', class: 'ov-auth-primary', disabled: busy ? true : null,
                    onclick: () => onImport && onImport(nsec) }, busy ? 'Working…' : 'Import'),
            ];
        }
        return [
            h('p', { class: 'ov-auth-hint' }, 'Connect a NIP-07 browser extension (Alby, nos2x…).'),
            h('button', { type: 'button', class: 'ov-auth-primary', disabled: busy ? true : null,
                onclick: () => onConnectExtension && onConnectExtension() }, busy ? 'Connecting…' : 'Connect extension'),
        ];
    };
    return h('div', {
        class: 'ov-auth-backdrop', role: 'presentation',
        ref: (el) => {
            if (!el || el._ovAuth) return; el._ovAuth = true;
            el.addEventListener('mousedown', (e) => {
                const panel = el.querySelector('.ov-auth-panel');
                if (panel && !panel.contains(e.target)) close();
            });
        },
    },
        h('div', {
            class: 'ov-auth-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Sign in',
            onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } },
        },
            h('div', { class: 'ov-auth-head' },
                h('h2', { class: 'ov-auth-title' }, 'Sign in'),
                h('button', { type: 'button', class: 'ov-auth-x', 'aria-label': 'close', onclick: close }, '×')
            ),
            h('div', { class: 'ov-auth-tabs', role: 'tablist' },
                ...modes.map(m => h('button', {
                    type: 'button', role: 'tab', key: 'am-' + m.id,
                    class: 'ov-auth-tab' + (m.id === mode ? ' is-active' : ''),
                    'aria-selected': m.id === mode ? 'true' : 'false',
                    onclick: () => onModeChange && onModeChange(m.id),
                }, m.label))
            ),
            h('div', { class: 'ov-auth-body' }, ...body()),
            error ? h('div', { class: 'ov-auth-error', role: 'alert' }, String(error)) : null
        )
    );
}

// VideoLightbox — fullscreen video player overlay with backdrop dismiss.
export function VideoLightbox({ src, label = '', open = false, onClose } = {}) {
    if (!open || !src) return null;
    const close = () => onClose && onClose();
    return h('div', {
        class: 'ov-lightbox-backdrop', role: 'dialog', 'aria-modal': 'true', 'aria-label': label || 'Video',
        tabindex: '-1',
        onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } },
        ref: (el) => { if (el && !el._ovLb) { el._ovLb = true; queueMicrotask(() => el.focus()); } },
        onmousedown: (e) => { if (e.target === e.currentTarget) close(); },
    },
        h('button', { type: 'button', class: 'ov-lightbox-x', 'aria-label': 'close', onclick: close }, '×'),
        h('div', { class: 'ov-lightbox-stage' },
            h('video', { class: 'ov-lightbox-video', src, controls: true, autoplay: true, playsinline: true }),
            label ? h('div', { class: 'ov-lightbox-label' }, label) : null
        )
    );
}
