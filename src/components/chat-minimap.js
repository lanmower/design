// ChatMinimap — a compact scroll-position overview for a long chat thread.
//
// Ported from pi-web's ChatMinimap.tsx (github.com/agegr/pi-web) behavior,
// reimplemented as a pure webjsx factory over this kit's own DOM-ref pattern
// (no React refs/hooks — a single `ref` callback owns measurement + listeners,
// matching makeThreadAutoScroll's shape in chat.js).
//
// What it does:
//   - Renders one dot per message that has visible text, positioned/spaced
//     proportionally to that message's real position within the thread's
//     scrollHeight (a message-density map, not a fixed-step list).
//   - Color-codes dots by role: user vs assistant (two tones, tokens only).
//   - Draws a viewport-position box (drag to scroll) reflecting scrollTop/
//     scrollHeight ratios, updated on the thread's own scroll events.
//   - Click (or drag) anywhere in the strip scrolls the thread so that point
//     maps to the equivalent scroll ratio.
//   - Hover reveals collision-resolved preview tooltips (message text, first
//     ~200 chars) to the left of the strip; the nearest dot to the cursor is
//     highlighted (scaled) while hovering.
//   - Re-measures on ResizeObserver (thread container + content) and on
//     message-count change (debounced), never synchronously in the scroll
//     handler — scroll only updates the (cheap) viewport ratio.
//
// Usage: mount inside the same flex row as the scrollable thread, e.g.
//   h('div', { class: 'chat-minimap-row' },
//     h('div', { class: 'chat-thread', ref: threadRef, ... }, ...),
//     ChatMinimap({ getThreadEl: () => threadEl, messages }))
//
// Props:
//   messages     : [{ role: 'user'|'assistant'|..., text?, content?, parts? }]
//                  — same shape chat.js/agent-chat.js already carry. Only
//                  'user'/'assistant' roles get a node; others are skipped
//                  (matches upstream, which only maps user/assistant).
//   getThreadEl  : () => HTMLElement | null — returns the live scroll
//                  container to observe/scroll. A getter (not the element
//                  itself) so the minimap can be built before the thread ref
//                  fires and still resolve the container lazily on measure.
//   getMessageEl : optional (index) => HTMLElement | null — returns the DOM
//                  node for message `index` (its top/height inside the
//                  thread drive the dot's position). Falls back to querying
//                  '[data-msg-index]' children of the thread element when
//                  omitted, so a host that tags its message rows with
//                  data-msg-index="N" needs no extra wiring.
//   width        : minimap strip width in px (default 36, matches upstream).
export const CHAT_MINIMAP_WIDTH = 36;
const MEASURE_THROTTLE_MS = 150;
const TOOLTIP_HEIGHT = 22;
const TOOLTIP_GAP = 2;
const TOOLTIP_WIDTH = 200;
const PREVIEW_CHARS = 200;
const MIN_SCROLLABLE_PX = 20;

import * as webjsx from '../../vendor/webjsx/index.js';
const h = webjsx.createElement;

// Extract a short preview string the same way upstream's getMessagePreview
// does: prefer flat `text`, then `content` (string or array-of-parts), then
// `parts` (this kit's structured shape) joined and trimmed.
function messagePreview(m) {
    if (!m) return '';
    if (typeof m.text === 'string' && m.text) return m.text.slice(0, PREVIEW_CHARS);
    if (typeof m.content === 'string' && m.content) return m.content.slice(0, PREVIEW_CHARS);
    const partsSrc = Array.isArray(m.content) ? m.content : (Array.isArray(m.parts) ? m.parts : null);
    if (partsSrc) {
        const joined = partsSrc
            .map((p) => (typeof p === 'string' ? p : (p && (p.text || (p.type === 'text' && p.text)) || '')))
            .filter(Boolean)
            .join(' ');
        if (joined) return joined.slice(0, PREVIEW_CHARS);
    }
    return '';
}

// True when a message carries any renderable text (dots skip empty/tool-only
// turns the way upstream's hasTextContent does).
function hasTextContent(m) {
    return !!messagePreview(m);
}

function isMappedRole(role) {
    return role === 'user' || role === 'assistant';
}

// Resolve the DOM node for message index `i`, via the host's getter or the
// data-msg-index fallback.
function resolveMessageEl(threadEl, getMessageEl, i) {
    if (typeof getMessageEl === 'function') return getMessageEl(i) || null;
    return threadEl.querySelector('[data-msg-index="' + i + '"]') || null;
}

export function ChatMinimap({ messages = [], getThreadEl, getMessageEl, width = CHAT_MINIMAP_WIDTH } = {}) {
    // All mutable state lives on the container element itself (webjsx factories
    // are pure-render; the ref callback owns the imperative lifecycle, same
    // pattern as makeThreadAutoScroll in chat.js).
    const state = {
        scrollRatio: 0,
        viewportRatio: 1,
        visible: false,
        nodes: /** @type {Array<{topRatio:number, heightRatio:number, msg:any, index:number}>} */ ([]),
        hovered: false,
        mouseYRatio: null,
    };

    const containerRef = (el) => {
        if (!el) return;
        if (el._dsMinimapCleanup) return; // already wired for this DOM node
        let measureTimer = null;
        let ro = null;
        let threadEl = null;
        let scrollListenerEl = null;

        const render = () => paintMinimap(el, state, messages, width);

        const updateScroll = () => {
            const t = typeof getThreadEl === 'function' ? getThreadEl() : null;
            if (!t) return;
            const totalH = t.scrollHeight;
            const clientH = t.clientHeight;
            const scrollable = totalH - clientH;
            state.visible = scrollable > MIN_SCROLLABLE_PX;
            if (scrollable <= 0) {
                state.scrollRatio = 0;
                state.viewportRatio = 1;
            } else {
                state.scrollRatio = t.scrollTop / scrollable;
                state.viewportRatio = clientH / totalH;
            }
            render();
        };

        const measureNodes = () => {
            if (measureTimer) return; // throttled — one pending pass at a time
            measureTimer = setTimeout(() => {
                measureTimer = null;
                const t = typeof getThreadEl === 'function' ? getThreadEl() : null;
                if (!t) return;
                const totalH = t.scrollHeight;
                if (totalH <= 0) return;
                const containerRect = t.getBoundingClientRect();
                const newNodes = [];
                for (let i = 0; i < messages.length; i++) {
                    const msg = messages[i];
                    if (!isMappedRole(msg && msg.role)) continue;
                    if (!hasTextContent(msg)) continue;
                    const msgEl = resolveMessageEl(t, getMessageEl, i);
                    if (!msgEl) continue;
                    const elRect = msgEl.getBoundingClientRect();
                    const top = elRect.top - containerRect.top + t.scrollTop;
                    newNodes.push({
                        topRatio: top / totalH,
                        heightRatio: elRect.height / totalH,
                        msg,
                        index: newNodes.length,
                    });
                }
                state.nodes = newNodes;
                render();
            }, MEASURE_THROTTLE_MS);
        };

        const syncLayout = () => { updateScroll(); measureNodes(); };

        // Rebinds scroll listener + ResizeObserver to whichever thread element
        // getThreadEl currently resolves to (it may be null on first paint and
        // become available once the thread's own ref fires).
        const rebind = () => {
            const t = typeof getThreadEl === 'function' ? getThreadEl() : null;
            if (t === threadEl) return;
            if (scrollListenerEl) scrollListenerEl.removeEventListener('scroll', updateScroll);
            if (ro) { ro.disconnect(); ro = null; }
            threadEl = t;
            scrollListenerEl = t;
            if (!t) return;
            t.addEventListener('scroll', updateScroll, { passive: true });
            ro = new ResizeObserver(syncLayout);
            ro.observe(t);
            if (t.firstElementChild) ro.observe(t.firstElementChild);
            syncLayout();
        };
        rebind();
        // Thread element may not exist yet on first mount; poll briefly (mirrors
        // upstream's 50ms post-message-change settle) until it appears, then the
        // ResizeObserver takes over for everything after.
        const rebindPoll = setInterval(rebind, 200);

        // Drag-to-scroll + click-to-jump on the strip itself.
        let dragging = false;
        const scrollToRatio = (viewportTopRatio) => {
            const t = typeof getThreadEl === 'function' ? getThreadEl() : null;
            if (!t) return;
            const scrollable = t.scrollHeight - t.clientHeight;
            if (scrollable <= 0) return;
            const clamped = Math.max(0, Math.min(1 - state.viewportRatio, viewportTopRatio));
            t.scrollTop = (clamped / (1 - state.viewportRatio)) * scrollable;
        };
        const ratioFromEvent = (ev) => {
            const rect = el.getBoundingClientRect();
            return (ev.clientY - rect.top) / rect.height;
        };
        const onMouseDown = (ev) => {
            if (!state.visible) return;
            dragging = true;
            const clickRatio = ratioFromEvent(ev);
            const grabOffset = clickRatio - state.scrollRatio * (1 - state.viewportRatio);
            const insideBox = grabOffset >= 0 && grabOffset <= state.viewportRatio;
            const offset = insideBox ? grabOffset : state.viewportRatio / 2;
            scrollToRatio(clickRatio - offset);
            const onMove = (mv) => { if (dragging) scrollToRatio(ratioFromEvent(mv) - offset); };
            const onUp = () => { dragging = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        };
        const onMouseEnter = () => { state.hovered = true; render(); };
        const onMouseLeave = () => { state.hovered = false; state.mouseYRatio = null; render(); };
        const onMouseMove = (ev) => { state.mouseYRatio = ratioFromEvent(ev); render(); };
        el.addEventListener('mousedown', onMouseDown);
        el.addEventListener('mouseenter', onMouseEnter);
        el.addEventListener('mouseleave', onMouseLeave);
        el.addEventListener('mousemove', onMouseMove);

        el._dsMinimapCleanup = () => {
            clearInterval(rebindPoll);
            if (measureTimer) clearTimeout(measureTimer);
            if (scrollListenerEl) scrollListenerEl.removeEventListener('scroll', updateScroll);
            if (ro) ro.disconnect();
            el.removeEventListener('mousedown', onMouseDown);
            el.removeEventListener('mouseenter', onMouseEnter);
            el.removeEventListener('mouseleave', onMouseLeave);
            el.removeEventListener('mousemove', onMouseMove);
        };

        render();
    };

    return h('div', {
        class: 'chat-minimap',
        ref: containerRef,
        role: 'navigation',
        'aria-label': 'conversation scroll overview',
        style: 'width:' + width + 'px',
    });
}

// Pure DOM paint: rebuilds the minimap's children from current `state`. Kept
// outside webjsx's own vdom diff (this subtree is imperative, like a canvas)
// because dot count/positions and hover/tooltip visibility change far more
// often than a full component re-render is warranted for.
function paintMinimap(el, state, messages, width) {
    el.style.display = state.visible ? '' : 'none';
    el.innerHTML = '';
    if (!state.visible) return;

    const viewportBox = document.createElement('div');
    viewportBox.className = 'chat-minimap-viewport';
    viewportBox.style.top = (state.scrollRatio * (1 - state.viewportRatio) * 100) + '%';
    viewportBox.style.height = (state.viewportRatio * 100) + '%';
    el.appendChild(viewportBox);

    const centerLine = document.createElement('div');
    centerLine.className = 'chat-minimap-centerline';
    el.appendChild(centerLine);

    const nodes = state.nodes;
    let nearestIndex = null;
    if (state.mouseYRatio != null && nodes.length) {
        let best = 0;
        for (let i = 1; i < nodes.length; i++) {
            if (Math.abs(nodes[i].topRatio - state.mouseYRatio) < Math.abs(nodes[best].topRatio - state.mouseYRatio)) best = i;
        }
        nearestIndex = nodes[best].index;
    }

    for (const node of nodes) {
        const dot = document.createElement('div');
        const isUser = node.msg && node.msg.role === 'user';
        dot.className = 'chat-minimap-dot ' + (isUser ? 'is-user' : 'is-assistant') + (state.hovered && nearestIndex === node.index ? ' is-nearest' : '');
        dot.style.top = (node.topRatio * 100) + '%';
        el.appendChild(dot);
    }

    if (state.hovered && nodes.length) {
        const minimapHeightPx = el.clientHeight || 600;
        const positions = nodes.map((n) => Math.round(n.topRatio * minimapHeightPx - TOOLTIP_HEIGHT / 2));
        for (let pass = 0; pass < 10; pass++) {
            for (let i = 1; i < positions.length; i++) {
                const minTop = positions[i - 1] + TOOLTIP_HEIGHT + TOOLTIP_GAP;
                if (positions[i] < minTop) positions[i] = minTop;
            }
            for (let i = positions.length - 2; i >= 0; i--) {
                const maxTop = positions[i + 1] - TOOLTIP_HEIGHT - TOOLTIP_GAP;
                if (positions[i] > maxTop) positions[i] = maxTop;
            }
        }
        for (let i = 0; i < positions.length; i++) {
            positions[i] = Math.max(0, Math.min(minimapHeightPx - TOOLTIP_HEIGHT, positions[i]));
        }
        nodes.forEach((node, i) => {
            const preview = messagePreview(node.msg);
            if (!preview) return;
            const isNearest = nearestIndex === node.index;
            const tip = document.createElement('div');
            tip.className = 'chat-minimap-tooltip' + (isNearest ? ' is-nearest' : '') + (node.msg.role === 'user' ? ' is-user' : ' is-assistant');
            tip.style.top = positions[i] + 'px';
            tip.style.width = TOOLTIP_WIDTH + 'px';
            tip.textContent = preview;
            el.appendChild(tip);
        });
    }
}
