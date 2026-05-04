import { icons } from './icons.js';

const THEME_CSS_URL = new URL('./theme.css', import.meta.url).href;

function ensureCss() {
    if (document.querySelector('link[data-os-theme]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = THEME_CSS_URL;
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
    if (role) b.dataset.role = role;
    if (svg) b.append(ic(svg));
    if (label) b.append(Object.assign(document.createElement('span'), { textContent: label }));
    return b;
}

export function createDesktopShell({ root = document.body, wm, registry, brand = 'desktop', themeUrl, onNewInstance, autoBoot = false } = {}) {
    if (!wm) throw new Error('createDesktopShell: wm is required');
    if (!registry) throw new Error('createDesktopShell: registry is required');
    if (themeUrl) {
        if (!document.querySelector('link[data-os-theme]')) {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = themeUrl;
            l.dataset.osTheme = '1';
            document.head.appendChild(l);
        }
    } else {
        ensureCss();
    }

    const osRoot = document.createElement('div');
    osRoot.className = 'os-root';
    osRoot.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;pointer-events:none;z-index:8000';
    root.appendChild(osRoot);

    const menubar = document.createElement('div');
    menubar.className = 'os-menubar';

    const brandEl = document.createElement('span');
    brandEl.className = 'os-brand';
    brandEl.textContent = brand;

    const appsBtn = makeBtn(icons.apps, 'apps', 'apps');
    const newInstBtn = onNewInstance ? makeBtn(icons.plus, 'instance', 'add') : null;

    const instSwitch = document.createElement('div');
    instSwitch.className = 'os-instances';
    instSwitch.style.cssText = 'display:flex;gap:6px;margin-left:8px';

    const spacer = document.createElement('div');
    spacer.style.cssText = 'flex:1';

    const tray = document.createElement('div');
    tray.style.cssText = 'display:flex;align-items:center;gap:6px';
    const clock = document.createElement('span');
    clock.className = 'os-clock';
    tray.appendChild(clock);

    menubar.append(brandEl, appsBtn);
    if (newInstBtn) menubar.append(newInstBtn);
    menubar.append(instSwitch, spacer, tray);

    const appsMenu = document.createElement('div');
    appsMenu.className = 'os-menu';
    appsMenu.style.cssText = 'position:absolute;display:none;flex-direction:column;pointer-events:auto';

    const sideRail = document.createElement('div');
    sideRail.className = 'os-side-rail';

    const sheet = document.createElement('div');
    sheet.className = 'os-mobile-sheet';
    const sheetHandle = document.createElement('div');
    sheetHandle.className = 'os-mobile-handle';
    const sheetGrid = document.createElement('div');
    sheetGrid.className = 'os-mobile-grid';
    sheet.append(sheetHandle, sheetGrid);
    sheet.addEventListener('click', e => {
        if (e.target === sheet || e.target === sheetHandle) sheet.classList.toggle('open');
    });

    const apps = typeof registry.list === 'function' ? registry.list() : [...registry.values()];

    for (const app of apps) {
        const iconSvg = app.icon || icons[app.id] || '';
        const menuBtn = makeBtn(iconSvg, app.name);
        menuBtn.addEventListener('click', () => { appsMenu.style.display = 'none'; openApp(app.id); });
        appsMenu.appendChild(menuBtn);

        const railBtn = document.createElement('button');
        railBtn.className = 'os-rail-btn';
        railBtn.title = app.name;
        railBtn.append(ic(iconSvg));
        railBtn.addEventListener('click', () => openApp(app.id));
        sideRail.appendChild(railBtn);

        const tile = document.createElement('button');
        tile.className = 'os-mobile-tile';
        tile.append(ic(iconSvg), Object.assign(document.createElement('span'), { className: 'lbl', textContent: app.name }));
        tile.addEventListener('click', () => { sheet.classList.remove('open'); openApp(app.id); });
        sheetGrid.appendChild(tile);
    }

    const taskbar = document.createElement('div');
    taskbar.className = 'os-taskbar';
    taskbar.style.cssText = 'margin-top:auto;display:flex;align-items:center;gap:6px;flex-wrap:wrap';

    osRoot.append(menubar, appsMenu, taskbar);
    document.body.appendChild(sideRail);
    document.body.appendChild(sheet);

    appsBtn.addEventListener('click', e => {
        e.stopPropagation();
        appsMenu.style.display = appsMenu.style.display === 'flex' ? 'none' : 'flex';
    });
    document.addEventListener('click', e => {
        if (!appsMenu.contains(e.target) && !appsBtn.contains(e.target)) appsMenu.style.display = 'none';
    });

    function tickClock() { clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    tickClock();
    const clockTimer = setInterval(tickClock, 30000);

    let activeContext = null;
    function setContext(ctx) { activeContext = ctx; }

    function refreshTaskbar() {
        taskbar.innerHTML = '';
        for (const w of wm.list()) {
            const t = document.createElement('button');
            t.className = 'os-task' + (w.focused ? ' focused' : '');
            t.textContent = w.title;
            t.addEventListener('click', () => wm.focus(w.id));
            taskbar.appendChild(t);
        }
    }

    function openApp(appId) {
        const app = (typeof registry.get === 'function') ? registry.get(appId) : registry[appId];
        if (!app) throw new Error('unknown app: ' + appId);
        const ctx = { ...(activeContext || {}), registry, openApp, wm };
        const result = app.factory(ctx);
        const finish = (r) => {
            const sz = app.defaultSize || { w: 520, h: 360 };
            const titlePrefix = (activeContext && activeContext.titlePrefix) ? activeContext.titlePrefix + ' · ' : '';
            const win = wm.open({ title: titlePrefix + app.name, body: r.node, kind: appId, width: sz.w, height: sz.h, x: 100 + (wm.count * 28) % 240, y: 80 + (wm.count * 22) % 180 });
            win._app = { id: appId, dispose: r.dispose };
            refreshTaskbar();
            return win;
        };
        return (result && typeof result.then === 'function') ? result.then(finish) : finish(result);
    }

    if (newInstBtn) newInstBtn.addEventListener('click', () => onNewInstance && onNewInstance({ instSwitch, setContext, openApp }));

    const taskTimer = setInterval(refreshTaskbar, 500);

    const api = {
        wm, registry, openApp, setContext, refreshTaskbar,
        toggleSheet() { sheet.classList.toggle('open'); },
        elements: { osRoot, menubar, taskbar, appsMenu, sideRail, sheet, instSwitch },
        dispose() { clearInterval(clockTimer); clearInterval(taskTimer); osRoot.remove(); sideRail.remove(); sheet.remove(); },
    };

    if (autoBoot && typeof autoBoot === 'string') openApp(autoBoot);
    return api;
}
