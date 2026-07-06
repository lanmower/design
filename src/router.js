// Hash-based SPA router over webjsx applyDiff. Registers named page
// components, dispatches on '#/<name>/<params...>', re-renders on
// popstate/hashchange. No framework-specific routing lib — direct
// history/hash manipulation, matching how every ui_kit already drives
// itself off window.ds.applyDiff.

import * as webjsx from '../vendor/webjsx/index.js';
import { register as registerDebug } from './debug.js';

const MAX_SDK_WAIT_FRAMES = 120; // ~2s at 60fps before giving up

export class Router {
    constructor({ fallback } = {}) {
        this.routes = new Map();
        this.fallback = fallback || null;
        this.currentRoute = null;
        this.state = { page: null, params: [], sdkWaitFrames: 0, lastError: null };
        registerDebug('router', () => ({
            currentRoute: this.currentRoute,
            registeredRoutes: [...this.routes.keys()],
            params: this.state.params,
            lastError: this.state.lastError,
        }));
    }

    parseHash() {
        const raw = (window.location.hash.slice(2) || '').split('?')[0];
        const parts = raw.split('/').filter(Boolean);
        return { name: parts[0] || '', params: parts.slice(1) };
    }

    register(name, component) {
        this.routes.set(name, component);
        return this;
    }

    async navigate(name, ...params) {
        if (!this.routes.has(name) && !this.fallback) return;
        this.currentRoute = this.routes.has(name) ? name : null;
        this.state.page = name;
        this.state.params = params;
        window.history.pushState({ page: name }, '', '#/' + [name, ...params].filter(Boolean).join('/'));
        this.render();
    }

    render() {
        const root = document.getElementById('app');
        if (!root) throw new Error('Router: #app root element not found');
        const component = this.routes.get(this.currentRoute) || this.fallback;
        if (!component) {
            this.state.lastError = 'no route registered for "' + this.currentRoute + '" and no fallback set';
            return;
        }
        if (window.ds && window.ds.applyDiff) {
            this.state.sdkWaitFrames = 0;
            this.state.lastError = null;
            const tree = component(this.state);
            window.ds.applyDiff(root, tree);
        } else if (this.state.sdkWaitFrames < MAX_SDK_WAIT_FRAMES) {
            this.state.sdkWaitFrames += 1;
            requestAnimationFrame(() => this.render());
        } else {
            this.state.lastError = 'window.ds.applyDiff never became available after ' + MAX_SDK_WAIT_FRAMES + ' frames';
        }
    }

    handlePopState() {
        const { name, params } = this.parseHash();
        this.currentRoute = this.routes.has(name) ? name : null;
        this.state.page = name;
        this.state.params = params;
        this.render();
    }

    start() {
        window.addEventListener('popstate', () => this.handlePopState());
        window.addEventListener('hashchange', () => this.handlePopState());
        const { name, params } = this.parseHash();
        this.currentRoute = this.routes.has(name) ? name : null;
        this.state.page = name;
        this.state.params = params;
        this.render();
        return this;
    }
}

export function createRouter(opts) {
    return new Router(opts);
}
