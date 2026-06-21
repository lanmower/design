// mountKit — single entry every ui_kit uses. Installs motion, runs
// applyDiff, registers a debug snapshot.

import * as webjsx from '../vendor/webjsx/index.js';
import * as motion from './motion.js';
import { register } from './debug.js';

export function mountKit({ root, view, screen, animateOnMount = true } = {}) {
    if (!root) throw new Error('mountKit: root required');
    if (typeof view !== 'function') throw new Error('mountKit: view fn required');
    if (screen && typeof document !== 'undefined') document.body.dataset.screenLabel = screen;
    motion.installMotion();
    let scheduled = false;
    const render = () => {
        scheduled = false;
        webjsx.applyDiff(root, view());
        if (animateOnMount) requestAnimationFrame(() => motion.animateTree(root));
    };
    const schedule = () => { if (scheduled) return; scheduled = true; queueMicrotask(render); };
    register('bootstrap', () => ({ screen: screen || null, mounted: !!root.firstChild, root: root.id || root.tagName }));
    render();
    return { render, schedule };
}

export { webjsx };
