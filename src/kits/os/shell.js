import { icons } from './icons.js';

const THEME_CSS_URL = new URL('./theme.css', import.meta.url).href;

// Small-viewport threshold: below this, a floating window (with drag/resize
// chrome meant for a pointer+large-canvas paradigm) is awkward — spawn apps
// maximized instead of as a small floating rect. Matches the coarse-pointer
// tablet/phone class, not just narrow desktop windows.
const SMALL_VIEWPORT_W = 768;

// Scale a fixed-px default spawn size against the actual desktop area so a
// 4K/ultrawide viewport doesn't cage every window at the same handful of
// pixels: the requested size is nudged toward a fraction of the available
// area, clamped between the app's own default (floor) and a generous
// multiple of it (ceiling) so windows still cascade/overlap sensibly instead
// of each spawning full-bleed.
function scaleSpawnSize(sz, vw, vh) {
    const targetW = Math.round(vw * 0.42);
    const targetH = Math.round(vh * 0.52);
    const w = Math.max(sz.w, Math.min(targetW, sz.w * 2, vw));
    const h = Math.max(sz.h, Math.min(targetH, sz.h * 2, vh));
    return { w, h };
}

function ensureCss(href) {
    if (document.querySelector('link[data-os-theme]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href || THEME_CSS_URL;
    l.dataset.osTheme = '1';
    document.head.appendChild(l);
}

function ic(svg) {
    const s = document.createElement('span');
    s.className = 'ic';
    s.innerHTML = svg;
    return s;
}

function makeBtn(svg, label, role) {
    const b = document.createElement('button');
    b.className = 'os-btn';
    b.type = 'button';
    if (role) b.dataset.role = role;
    if (svg) b.append(ic(svg));
    if (label) b.append(Object.assign(document.createElement('span'), { textContent: label }));
    // Icon-only buttons (no visible label text) need an accessible name from
    // somewhere; `role` ('home'/'add'/etc) is already a short human-readable
    // word, so reuse it as aria-label rather than leaving the button unnamed.
    if (!label && role) b.setAttribute('aria-label', role);
    return b;
}

export function createDesktopShell({ root = document.body, wm, registry, brand = 'desktop', themeUrl, onNewInstance, autoBoot = false } = {}) {
    if (!wm) throw new Error('createDesktopShell: wm is required');
    if (!registry) throw new Error('createDesktopShell: registry is required');
    ensureCss(themeUrl);

    const osRoot = document.createElement('div');
    osRoot.className = 'os-root';
    root.appendChild(osRoot);

    const menubar = document.createElement('div');
    menubar.className = 'os-menubar';
    menubar.setAttribute('role', 'menubar');
    menubar.setAttribute('aria-label', 'Desktop menu bar');

    const homeBtn = makeBtn(icons.home, '', 'home');
    homeBtn.title = 'apps';

    const brandEl = document.createElement('span');
    brandEl.className = 'os-brand';
    brandEl.textContent = brand;

    const appsBtn = makeBtn(icons.apps, 'apps', 'apps');
    appsBtn.setAttribute('aria-haspopup', 'menu');
    appsBtn.setAttribute('aria-expanded', 'false');
    const newInstBtn = onNewInstance ? makeBtn(icons.plus, 'instance', 'add') : null;

    const instSwitch = document.createElement('div');
    instSwitch.className = 'os-instances';

    const spacer = document.createElement('div');
    spacer.className = 'os-spacer';

    const tray = document.createElement('div');
    tray.className = 'os-tray';
    const clock = document.createElement('span');
    clock.className = 'os-clock';
    tray.appendChild(clock);

    menubar.append(homeBtn, brandEl, appsBtn);
    if (newInstBtn) menubar.append(newInstBtn);
    menubar.append(instSwitch, spacer, tray);

    const appsMenu = document.createElement('div');
    appsMenu.className = 'os-menu';
    appsMenu.setAttribute('role', 'menu');
    appsMenu.setAttribute('aria-label', 'Apps');

    const sideRail = document.createElement('div');
    sideRail.className = 'os-side-rail';
    sideRail.setAttribute('role', 'navigation');
    sideRail.setAttribute('aria-label', 'App launcher rail');

    const drawer = document.createElement('div');
    drawer.className = 'os-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    // Full-screen overlay that traps the user's attention while open — the
    // dialog role + aria-modal + aria-labelledby give a screen reader the
    // same "you are now in a dialog named X" announcement a sighted user
    // gets from the visual takeover.
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'os-drawer-title');
    const drawerHeader = document.createElement('div');
    drawerHeader.className = 'os-drawer-head';
    const drawerTitle = document.createElement('span');
    drawerTitle.className = 'os-drawer-title';
    drawerTitle.id = 'os-drawer-title';
    drawerTitle.textContent = 'apps';
    const drawerClose = document.createElement('button');
    drawerClose.className = 'os-drawer-close';
    drawerClose.type = 'button';
    drawerClose.setAttribute('aria-label', 'Close apps drawer');
    drawerClose.append(ic(icons.close));
    drawerHeader.append(drawerTitle, drawerClose);
    const drawerGrid = document.createElement('div');
    drawerGrid.className = 'os-drawer-grid';
    drawer.append(drawerHeader, drawerGrid);

    const apps = typeof registry.list === 'function' ? registry.list() : [...registry.values()];

    for (const app of apps) {
        const iconSvg = app.icon || icons[app.id] || '';
        const menuBtn = makeBtn(iconSvg, app.name);
        menuBtn.setAttribute('role', 'menuitem');
        menuBtn.addEventListener('click', () => { closeMenu(); openApp(app.id); });
        appsMenu.appendChild(menuBtn);

        const railBtn = document.createElement('button');
        railBtn.className = 'os-rail-btn';
        railBtn.type = 'button';
        railBtn.title = app.name;
        railBtn.setAttribute('aria-label', app.name);
        railBtn.append(ic(iconSvg));
        railBtn.addEventListener('click', () => openApp(app.id));
        sideRail.appendChild(railBtn);

        const tile = document.createElement('button');
        tile.className = 'os-drawer-tile';
        tile.type = 'button';
        tile.append(ic(iconSvg), Object.assign(document.createElement('span'), { className: 'lbl', textContent: app.name }));
        tile.addEventListener('click', () => { closeDrawer(); openApp(app.id); });
        drawerGrid.appendChild(tile);
    }

    const taskbar = document.createElement('div');
    taskbar.className = 'os-taskbar';
    // Taskbar contents are rebuilt on a 500ms poll whenever windows open/
    // close/gain focus (refreshTaskbar below); aria-live announces those
    // additions/removals to a screen reader, which otherwise gets no signal
    // that the running-window list changed. "polite" so it never interrupts.
    taskbar.setAttribute('role', 'toolbar');
    taskbar.setAttribute('aria-label', 'Open windows');
    taskbar.setAttribute('aria-live', 'polite');
    taskbar.setAttribute('aria-relevant', 'additions removals');

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
        const sig = items.map(w => w.id + ' ' + w.title + ' ' + (w.focused ? 1 : 0)).join('');
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
            // Clamp spawn bounds to the desktop area so cascaded windows never
            // open with their chrome (titlebar/resize grip) off-screen.
            const host = document.querySelector('.wm-root');
            const vw = host ? host.clientWidth : window.innerWidth;
            const vh = host ? host.clientHeight : window.innerHeight;
            // Below the tablet breakpoint a floating window is awkward (no
            // room to drag/resize around it) — spawn maximized instead of a
            // small floating rect. Above it, scale the default size toward
            // the available desktop area so 4K/ultrawide viewports don't
            // cage every window at the same fixed handful of pixels.
            const small = vw < SMALL_VIEWPORT_W;
            const scaled = small ? sz : scaleSpawnSize(sz, vw, vh);
            const w = Math.min(scaled.w, vw);
            const h = Math.min(scaled.h, vh);
            const x = Math.max(0, Math.min(100 + (wm.count * 28) % 240, vw - w));
            const y = Math.max(0, Math.min(80 + (wm.count * 22) % 180, vh - h));
            const titlePrefix = (activeContext && activeContext.titlePrefix) ? activeContext.titlePrefix + ' · ' : '';
            const win = wm.open({ title: titlePrefix + app.name, body: r.node, kind: appId, width: w, height: h, x, y, maximized: small });
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

    // Keep open windows reachable when the viewport shrinks (rotation, browser
    // resize): pull any window whose titlebar left the desktop back in range.
    const onViewportResize = () => {
        for (const w of wm.list()) {
            const el = document.querySelector('.wm-win[data-id="' + w.id + '"]');
            if (!el) continue;
            const p = el.offsetParent;
            if (!p) continue;
            const nx = Math.min(el.offsetLeft, Math.max(0, p.clientWidth - 60));
            const ny = Math.min(el.offsetTop, Math.max(0, p.clientHeight - 36));
            if (nx === el.offsetLeft && ny === el.offsetTop) continue;
            if (typeof wm.setBounds === 'function') wm.setBounds(w.id, { x: nx, y: ny });
            else if (w.handle && typeof w.handle.setBounds === 'function') w.handle.setBounds({ x: nx, y: ny });
        }
    };
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
