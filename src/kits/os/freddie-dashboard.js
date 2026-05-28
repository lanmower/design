import * as webjsx from '../../../vendor/webjsx/index.js';
import * as components from '../../components.js';
import { ROUTES, OS_ROUTE_DEFS } from './freddie/routes.js';
import { makeCorePages } from './freddie/pages-core.js';
import { makeChatPage } from './freddie/pages-chat.js';
import { makeToolsPages } from './freddie/pages-tools.js';
import { makeOsPages } from './freddie/pages-os.js';

const { AppShell, Topbar, Side, Crumb, Status, Panel, Chip, EmptyState } = components;

function pre(obj) {
    return webjsx.createElement('pre', { class: 'fd-pre' }, typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
}

export function createFreddieDashboard({ instance, bootHost, osSurfaces, loadingText }) {
    const root = document.createElement('div');
    root.className = 'app-fd ds-247420 fd-root';

    const state = { active: 'home', ts: new Date().toLocaleTimeString(), body: null, error: null };
    let host = instance.host || null;
    const allRoutes = osSurfaces ? [...ROUTES, ...OS_ROUTE_DEFS] : ROUTES;

    async function ensureHost() {
        if (host) return host;
        if (typeof bootHost !== 'function') throw new Error('createFreddieDashboard: instance.host or bootHost required');
        host = instance.host = await bootHost({ fs: instance.fs });
        return host;
    }

    function setActive(p) { state.active = p; rerender(); }
    if (typeof window !== 'undefined') window.__fd_nav = setActive;

    function rerender() { webjsx.applyDiff(root, view()); loadActive(); }

    const ctx = { instance, osSurfaces, root, state, rerender, get host() { return host; } };
    const PAGES = {
        ...makeCorePages(ctx),
        chat: makeChatPage(ctx),
        ...makeToolsPages(ctx),
        ...(osSurfaces ? makeOsPages(ctx) : {}),
    };

    function buildSide() {
        const sections = [{
            group: 'ASSISTANT',
            items: ROUTES.map(r => ({
                glyph: r.glyph, label: r.label, href: '#fd-' + r.path,
                active: state.active === r.path,
                onClick: (ev) => { ev.preventDefault(); setActive(r.path); },
            })),
        }];
        if (osSurfaces) sections.push({
            group: 'OS',
            items: OS_ROUTE_DEFS.map(r => ({
                glyph: r.glyph, label: r.label, href: '#fd-' + r.path,
                active: state.active === r.path,
                onClick: (ev) => { ev.preventDefault(); setActive(r.path); },
            })),
        });
        return Side({ sections });
    }

    function view() {
        const route = allRoutes.find(r => r.path === state.active) || ROUTES[1];
        return AppShell({
            topbar: Topbar({ brand: 'assistant', leaf: 'dashboard', items: [], active: '' }),
            crumb: Crumb({ trail: ['assistant', instance.id], leaf: route.path, right: state.error ? Chip({ tone: 'miss', children: 'error' }) : Chip({ tone: 'ok', children: 'live' }) }),
            side: buildSide(),
            main: state.body || EmptyState({ text: loadingText || 'loading…', glyph: '◌' }),
            status: Status({ left: ['ds-247420 · webjsx · ' + allRoutes.length + ' routes', 'instance=' + instance.id], right: [state.ts] }),
        });
    }

    async function loadActive() {
        try {
            const h0 = await ensureHost();
            const page = PAGES[state.active] || PAGES.home;
            state.body = await page(h0, instance);
            state.error = null;
        } catch (e) {
            state.error = String(e && e.stack || e);
            state.body = Panel({ title: 'error', children: pre(state.error) });
        }
        state.ts = new Date().toLocaleTimeString();
        webjsx.applyDiff(root, view());
    }

    rerender();

    if (typeof window !== 'undefined') {
        window.__debug = window.__debug || {};
        window.__debug.instances = window.__debug.instances || {};
        window.__debug.instances[instance.id] = window.__debug.instances[instance.id] || {};
        window.__debug.instances[instance.id].dashboard = {
            root, routes: allRoutes.map(r => r.path), setActive,
            get active() { return state.active; },
        };
    }

    return { node: root, dispose() {} };
}
