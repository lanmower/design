// os ui kit demo — mounts createDesktopShell() from src/kits/os against a
// minimal self-contained window manager + app registry. Real hosts (thebird)
// own the full wm/registry state machine (per-instance fs/worker/shell); this
// demo only proves the visual kit renders and opens/focuses/closes windows.
import { createDesktopShell, renderWindow, renderAboutApp, renderMonitorApp, themeUrl } from 'ds/kits/os/index.js';

function createDemoWm(root) {
    const wins = new Map();
    let nextId = 1;
    let zTop = 1;
    return {
        get count() { return wins.size; },
        list() { return [...wins.values()].map(w => ({ id: w.id, title: w.title, focused: w.focused })); },
        open({ title, body, width = 480, height = 320, x = 60, y = 60, maximized = false }) {
            const id = 'w' + nextId++;
            const handle = renderWindow({
                title, body, bounds: { x, y, w: width, h: height }, focused: true, maximized,
                callbacks: {
                    onClose: () => { handle.dispose(); wins.delete(id); },
                    onFocus: () => this.focus(id),
                    onMinimize: () => handle.setMinimized(true),
                    onMaximize: () => handle.setMaximized(!handle.el.classList.contains('wm-max')),
                },
            });
            root.appendChild(handle.el);
            handle.setZIndex(++zTop);
            const entry = { id, title, focused: true, handle };
            wins.set(id, entry);
            this.focus(id);
            return handle;
        },
        focus(id) {
            for (const [wid, w] of wins) {
                w.focused = wid === id;
                w.handle.setFocused(w.focused);
                if (w.focused) w.handle.setZIndex(++zTop);
            }
        },
    };
}

function createDemoRegistry(apps) {
    const byId = new Map(apps.map(a => [a.id, a]));
    return {
        list() { return apps; },
        get(id) { return byId.get(id); },
    };
}

const canvas = document.getElementById('root');
canvas.classList.add('wm-root', 'ds-app-surface');

const wm = createDemoWm(canvas);

// renderAboutApp() defaults to a sibling project's ("thebird") own brand,
// tagline, bullets, and source link -- this kit's two call sites used to
// pass no overrides at all, so the "about" window showed thebird's content
// under a menubar reading "247420 / os", two different products described
// in one screen. Real content for this kit's own demo, not a leftover
// generic default.
const ABOUT_CONTENT = {
    brand: '247420 / os',
    tagline: 'browser-native desktop-shell demo for the 247420 design system. window manager, taskbar, and menubar -- no server.',
    bullets: [
        '302 components across 23 working kits',
        'One token file drives every surface',
        'axe-core WCAG-tagged scan gated in CI',
        'webjsx + custom elements, no framework',
        'buildless: plain HTML + an import map',
    ],
    footer: 'click apps menu for more.',
    links: [{ href: 'https://github.com/AnEntrypoint/design', text: 'source' }],
};

const registry = createDemoRegistry([
    {
        id: 'about', name: 'about', icon: 'info', defaultSize: { w: 420, h: 320 },
        factory() {
            return { node: renderAboutApp(ABOUT_CONTENT).node };
        },
    },
    {
        id: 'monitor', name: 'monitor', icon: 'activity', defaultSize: { w: 360, h: 220 },
        factory() {
            return {
                node: renderMonitorApp({
                    getStats: () => ({
                        instanceId: 'demo', frames: 0, shells: 0,
                        windows: wm.count, appsRegistered: registry.list().length,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
                    }),
                }).node,
            };
        },
    },
]);

createDesktopShell({ root: document.body, wm, registry, brand: '247420 / os', themeUrl });

// Open one window on load so the demo isn't a blank desktop.
wm.open({ title: 'about', body: renderAboutApp(ABOUT_CONTENT).node, width: 420, height: 320, x: 80, y: 80 });
