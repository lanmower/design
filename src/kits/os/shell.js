// createDesktopShell — the desktop OS shell: assembles the menubar / apps
// menu / side rail / drawer / taskbar chrome (built by ./shell-chrome.js),
// owns the shared mutable state those surfaces read (active context, active
// instance, taskbar signature, drawer focus return), and drives window
// spawning through ./shell-geometry.js.

import {
    ensureCss, buildMenubar, buildAppsMenu, buildSideRail, buildDrawer,
    buildTaskbar, buildAppEntries,
} from './shell-chrome.js';
import { computeSpawnRect, reflowWindows } from './shell-geometry.js';

export function createDesktopShell({ root = document.body, wm, registry, brand = 'desktop', themeUrl, onNewInstance, autoBoot = false } = {}) {
    if (!wm) throw new Error('createDesktopShell: wm is required');
    if (!registry) throw new Error('createDesktopShell: registry is required');
    ensureCss(themeUrl);

    const osRoot = document.createElement('div');
    osRoot.className = 'os-root';
    root.appendChild(osRoot);

    const { menubar, homeBtn, appsBtn, newInstBtn, instSwitch, clock } =
        buildMenubar({ brand, withNewInstance: !!onNewInstance });
    const appsMenu = buildAppsMenu();
    const sideRail = buildSideRail();
    const { drawer, drawerClose, drawerGrid } = buildDrawer();
    const taskbar = buildTaskbar();

    const apps = typeof registry.list === 'function' ? registry.list() : [...registry.values()];

    for (const app of apps) {
        const { menuBtn, railBtn, tile } = buildAppEntries(app, {
            onMenuClick: () => { closeMenu(); openApp(app.id); },
            onRailClick: () => openApp(app.id),
            onTileClick: () => { closeDrawer(); openApp(app.id); },
        });
        appsMenu.appendChild(menuBtn);
        sideRail.appendChild(railBtn);
        drawerGrid.appendChild(tile);
    }

    osRoot.append(menubar, appsMenu, taskbar);
    document.body.append(sideRail, drawer);

    function openMenu() { appsMenu.classList.add('open'); appsBtn.setAttribute('aria-expanded', 'true'); }
    function closeMenu() { appsMenu.classList.remove('open'); appsBtn.setAttribute('aria-expanded', 'false'); }
    // Focus management: opening the drawer moves keyboard focus onto its
    // close button (the first reachable control inside the now-visible
    // dialog) so Tab starts inside it, not lost on a now-hidden ancestor;
    // closing restores focus to whichever element opened it (homeBtn is the
    // only trigger today) so the user's keyboard position isn't lost.
    let drawerReturnFocus = null;
    function openDrawer() {
        drawerReturnFocus = document.activeElement;
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        drawerClose.focus();
    }
    function closeDrawer() {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        if (drawerReturnFocus && typeof drawerReturnFocus.focus === 'function') drawerReturnFocus.focus();
        drawerReturnFocus = null;
    }

    appsBtn.addEventListener('click', e => { e.stopPropagation(); appsMenu.classList.contains('open') ? closeMenu() : openMenu(); });
    homeBtn.addEventListener('click', e => { e.stopPropagation(); drawer.classList.contains('open') ? closeDrawer() : openDrawer(); });
    drawerClose.addEventListener('click', closeDrawer);
    drawer.addEventListener('click', e => { if (e.target === drawer) closeDrawer(); });
    document.addEventListener('click', e => {
        if (!appsMenu.contains(e.target) && !appsBtn.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeMenu(); closeDrawer(); }
    });

    function tickClock() { clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    tickClock();
    const clockTimer = setInterval(tickClock, 30000);

    let activeContext = null;
    let activeInstanceId = null;
    function setContext(ctx) { activeContext = ctx; }

    function applyInstanceFilter() {
        if (!activeInstanceId) return;
        for (const wEl of document.querySelectorAll('.wm-win[data-instance-id]')) {
            const wInst = wEl.dataset.instanceId;
            wEl.classList.toggle('wm-inst-hidden', wInst !== activeInstanceId);
        }
    }

    let taskbarSig = null;
    function refreshTaskbar() {
        const items = [];
        for (const w of wm.list()) {
            const wEl = document.querySelector('.wm-win[data-id="' + w.id + '"]');
            const wInst = wEl && wEl.dataset.instanceId;
            if (activeInstanceId && wInst && wInst !== activeInstanceId) continue;
            items.push(w);
        }
        // Diff-aware rebuild: the 500ms poll must not reset the taskbar's
        // horizontal scroll (mobile scroll-snap) or button focus every tick.
        const sig = items.map(w => w.id + ' ' + w.title + ' ' + (w.focused ? 1 : 0)).join('');
        if (sig === taskbarSig) return;
        taskbarSig = sig;
        const sl = taskbar.scrollLeft;
        taskbar.innerHTML = '';
        if (!items.length) {
            const empty = document.createElement('span');
            empty.className = 'os-task-empty';
            empty.textContent = 'no windows';
            taskbar.appendChild(empty);
        }
        for (const w of items) {
            const t = document.createElement('button');
            t.className = 'os-task' + (w.focused ? ' focused' : '');
            t.type = 'button';
            t.textContent = w.title;
            t.dataset.winId = w.id;
            // aria-current announces which window is the active one; a
            // sighted user reads this from the .focused visual state alone.
            if (w.focused) t.setAttribute('aria-current', 'true');
            t.addEventListener('click', () => wm.focus(w.id));
            taskbar.appendChild(t);
        }
        taskbar.scrollLeft = sl;
    }

    function setActiveInstance(id) {
        activeInstanceId = id;
        for (const btn of instSwitch.querySelectorAll('.os-btn')) {
            btn.classList.toggle('active', btn.dataset.instanceId === id);
        }
        applyInstanceFilter();
        refreshTaskbar();
    }

    function openApp(appId) {
        const app = (typeof registry.get === 'function') ? registry.get(appId) : registry[appId];
        if (!app) throw new Error('unknown app: ' + appId);
        const ctx = { ...(activeContext || {}), registry, openApp, wm };
        const result = app.factory(ctx);
        const finish = (r) => {
            const sz = app.defaultSize || { w: 520, h: 360 };
            const { w, h, x, y, maximized } = computeSpawnRect(sz, wm.count);
            const titlePrefix = (activeContext && activeContext.titlePrefix) ? activeContext.titlePrefix + ' · ' : '';
            const win = wm.open({ title: titlePrefix + app.name, body: r.node, kind: appId, width: w, height: h, x, y, maximized });
            win._app = { id: appId, dispose: r.dispose };
            if (activeInstanceId && win.el) {
                win.el.dataset.instanceId = activeInstanceId;
                win.instanceId = activeInstanceId;
            }
            win.appId = appId;
            refreshTaskbar();
            return win;
        };
        return (result && typeof result.then === 'function') ? result.then(finish) : finish(result);
    }

    if (newInstBtn) newInstBtn.addEventListener('click', () => onNewInstance && onNewInstance({ instSwitch, setContext, openApp }));

    const taskTimer = setInterval(refreshTaskbar, 500);

    const onViewportResize = () => reflowWindows(wm);
    window.addEventListener('resize', onViewportResize);

    const api = {
        wm, registry, openApp, setContext, refreshTaskbar, setActiveInstance,
        openDrawer, closeDrawer, openMenu, closeMenu,
        get activeInstanceId() { return activeInstanceId; },
        elements: { osRoot, menubar, taskbar, appsMenu, sideRail, drawer, instSwitch, homeBtn, appsBtn },
        dispose() { clearInterval(clockTimer); clearInterval(taskTimer); window.removeEventListener('resize', onViewportResize); osRoot.remove(); sideRail.remove(); drawer.remove(); },
    };

    if (autoBoot && typeof autoBoot === 'string') openApp(autoBoot);
    return api;
}
