import * as webjsx from '../vendor/webjsx/index.js';
import { loadCss, scope } from './styles.js';
import { registerDeckStage, getDeckStage } from './deck-stage.js';
import * as components from './components.js';
import * as motion from './motion.js';
import * as debug from './debug.js';
import { renderMarkdown, ensureReady as ensureMarkdownReady } from './markdown.js';
import { ensurePrism, highlightAllUnder } from './highlight.js';
import { renderPageHtml } from './page-html.js';
import { mountKit } from './bootstrap.js';
import { registerChatElement } from './web-components/ds-chat.js';

let _installed = false;
export async function installStyles(target) {
    if (_installed && !target) return;
    const css = await loadCss();
    const root = target || document.head;
    const tag = document.createElement('style');
    tag.setAttribute('data-247420', '');
    tag.textContent = css;
    root.appendChild(tag);
    if (!target) motion.installMotion();
    if (!target) _installed = true;
}

export function mount(rootEl, viewFn, { autoScope = true } = {}) {
    if (autoScope && rootEl && rootEl.classList && !rootEl.classList.contains(scope.slice(1))) {
        rootEl.classList.add(scope.slice(1));
    }
    const render = () => {
        webjsx.applyDiff(rootEl, viewFn(render));
        requestAnimationFrame(() => motion.animateTree(rootEl));
    };
    render();
    return render;
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
    registerChatElement();
}

export {
    webjsx, loadCss, scope, registerDeckStage, getDeckStage,
    components, motion, debug, mountKit,
    renderMarkdown, ensureMarkdownReady,
    ensurePrism, highlightAllUnder,
    registerChatElement,
    renderPageHtml
};
export const h = webjsx.createElement;
export const applyDiff = webjsx.applyDiff;
export default {
    webjsx, loadCss, scope, installStyles, mount, h, applyDiff,
    registerDeckStage, getDeckStage, components, motion, debug, mountKit,
    renderMarkdown, ensurePrism, registerChatElement, renderPageHtml
};
