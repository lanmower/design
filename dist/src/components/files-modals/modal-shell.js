// The shared modal shell every file dialog funnels through: Backdrop (focus
// trap, document-level Escape, invoker focus restore, backdrop dismiss),
// Modal (head/body/actions slots + a stable aria-labelledby id), and the
// in-body error line.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { shortUid } from '../../uid.js';
const h = webjsx.createElement;

// Full focusable set for the modal Tab trap — omitting textarea/select/a[href]
// lets Tab escape behind the fixed backdrop (fully obscured at mobile sizes).
const FOCUSABLE_SEL = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function Backdrop({ onClose, children, kind = '', labelledBy, busy = false } = {}) {
    // webjsx invokes a ref callback with the element on mount and with null on
    // unmount. We stash the per-element keydown teardown on the node itself so
    // the null branch can run it — otherwise the document/element listener leaks
    // once the modal is removed.
    const backdropRef = (el) => {
        if (!el) return;            // unmount (ref(null)) handled by wrapper below
        // webjsx's createDOMElement invokes ref callbacks BEFORE appending the
        // element's children (vendor/webjsx/createDOMElement.js), so on first
        // mount el is still empty and `.ds-modal` cannot be found yet — every
        // wire-up below (Tab trap, Escape, autofocus, invoker tracking)
        // silently no-op'd on the branch that returns early here, and nothing
        // ever re-invoked the ref with children present to give it a second
        // chance. Deferring to a microtask lets the children-append loop that
        // already ran synchronously after this callback finish first.
        queueMicrotask(() => wireBackdrop(el));
    };

    function wireBackdrop(el) {
        if (!el.isConnected) return; // unmounted again before the microtask ran
        const modal = el.querySelector('.ds-modal');
        if (!modal) return;

        const handleKeydown = (e) => {
            // Escape closes the modal — unless a mutation is in flight (the live
            // busy state is read off the data-busy attribute, which re-renders;
            // this handler's closure is bound once at mount).
            if (e.key === 'Escape') {
                e.preventDefault();
                if (el.dataset.busy === '1') return;
                if (onClose) onClose();
                return;
            }
            // Focus trap: re-query focusables on each Tab press so that buttons
            // disabled mid-flight (busy state) are excluded from the cycle and
            // do not break tab navigation.
            if (e.key === 'Tab') {
                const focusables = modal.querySelectorAll(FOCUSABLE_SEL);
                if (focusables.length === 0) {
                    e.preventDefault();
                    return;
                }
                const firstFocusable = focusables[0];
                const lastFocusable = focusables[focusables.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        };

        // Escape must close the modal no matter where focus sits (re-renders
        // can bounce focus out of the dialog), so listen at document level
        // for the modal's lifetime.
        document.addEventListener('keydown', handleKeydown, true);
        // Record the invoker BEFORE the modal steals focus, so close (confirm,
        // cancel, Escape, backdrop click) restores keyboard/AT focus to where
        // the user was (e.g. the FileGrid row button) instead of <body>.
        // Re-mounts mid-lifetime (every app render re-runs this ref) keep the
        // ORIGINAL invoker and never re-steal focus from the user.
        const invoker = el.contains(document.activeElement) ? (Backdrop._invoker || document.activeElement) : document.activeElement;
        if (!Backdrop._invoker) Backdrop._invoker = invoker;
        el._dsModalTeardown = (removed) => {
            document.removeEventListener('keydown', handleKeydown, true);
            // Only restore focus when the modal is genuinely going away (not a
            // re-render remount) and focus is not already somewhere useful.
            if (removed && Backdrop._invoker && Backdrop._invoker.focus && Backdrop._invoker.isConnected) {
                try { Backdrop._invoker.focus(); } catch { /* swallow: restoring focus on close is best-effort, teardown still completes */ }
            }
            if (removed) Backdrop._invoker = null;
        };
        // Auto-focus on open - only when focus is not already inside the modal
        // (re-renders must not yank the caret around).
        if (!el.contains(document.activeElement)) {
            const preferred = modal.querySelector('[autofocus]') || modal.querySelector(FOCUSABLE_SEL);
            if (preferred) preferred.focus();
        }
    };

    return h('div', {
        class: 'ds-modal-backdrop',
        // Live busy flag read by the mount-bound Escape handler + backdrop click.
        'data-busy': busy ? '1' : '0',
        ref: (el) => {
            if (el) {
                // A remount in the same tick (render churn) is not a close:
                // cancel the pending removal teardown before re-binding.
                Backdrop._pendingRemoval = false;
                backdropRef(el);
                Backdrop._last = el;
            } else if (Backdrop._last && Backdrop._last._dsModalTeardown) {
                const t = Backdrop._last._dsModalTeardown;
                Backdrop._last = null;
                Backdrop._pendingRemoval = true;
                t(false); // always unhook the document listener now
                queueMicrotask(() => {
                    // Still gone next microtask -> genuine close: restore focus.
                    if (Backdrop._pendingRemoval) { t(true); Backdrop._pendingRemoval = false; }
                });
            }
        },
        onclick: (e) => {
            if (e.target !== e.currentTarget) return;
            if (e.currentTarget.dataset.busy === '1') return; // no mid-flight close
            if (onClose) onClose();
        }
    },
        h('div', {
            class: 'ds-modal' + (kind ? ' ds-modal-' + kind : ''),
            role: 'dialog', 'aria-modal': 'true',
            ...(labelledBy ? { 'aria-labelledby': labelledBy } : {})
        }, ...(Array.isArray(children) ? children : [children]))
    );
}

// Shared modal shell: head + body + actions row. ConfirmDialog/PromptDialog/
// FileViewer all funnel through this so the ds-modal markup is authored once.
// `actions` is an array of vnodes (already using the Btn primitive). Any of the
// slots may be omitted.
export function Modal({ onClose, kind = '', head, headClass = '', headAttrs = {}, body, bodyClass = 'ds-modal-body', bodyAttrs = {}, actions, busy = false } = {}) {
    // Give the head a stable id so the dialog can point aria-labelledby at it,
    // exposing the title as the dialog's accessible name to screen readers.
    // The id is minted once per Modal() call with a short random suffix so it
    // stays constant across re-renders of the same dialog instance — an
    // incrementing counter advances on every render, leaving the previous
    // aria-labelledby reference pointing at a now-absent element.
    const headId = head != null ? ('ds-modal-head-' + shortUid(6)) : null;
    return Backdrop({
        onClose,
        kind,
        busy,
        labelledBy: headId,
        children: [
            head != null ? h('div', { id: headId, class: ('ds-modal-head' + (headClass ? ' ' + headClass : '')), ...headAttrs }, ...(Array.isArray(head) ? head : [head])) : null,
            body != null ? h('div', { class: bodyClass, ...bodyAttrs }, ...(Array.isArray(body) ? body : [body])) : null,
            actions != null ? h('div', { class: 'ds-modal-actions' }, ...(Array.isArray(actions) ? actions : [actions])) : null,
        ].filter(Boolean)
    });
}

// A role=alert error line rendered INSIDE the modal body (so a 409/403 from a
// mutation is visible at the point of action, inside the focus trap — not a
// sibling stuck in page flow behind the fixed backdrop).
export function modalError(error) {
    return error ? h('p', { class: 'ds-modal-error', role: 'alert' }, String(error)) : null;
}
