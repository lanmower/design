import { DsChat, registerChatElement } from './ds-chat.js';
import { register } from '../debug.js';

let _stats = { mounts: 0, sends: 0 };

class FreddieChat extends DsChat {
    constructor() {
        super();
        this._title = 'freddie';
        this._sub = '';
        this._placeholder = 'message freddie · /tools · /tool name {json} · /run …';
    }

    connectedCallback() {
        _stats.mounts += 1;
        super.connectedCallback();
    }
}

let _registered = false;
export function registerFreddieChatElement() {
    registerChatElement();
    if (_registered) return;
    if (!customElements.get('freddie-chat')) customElements.define('freddie-chat', FreddieChat);
    _registered = true;
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
    registerFreddieChatElement();
}

register('freddie-chat', () => ({ registered: _registered, ..._stats, instances: document.querySelectorAll('freddie-chat').length }));

export { FreddieChat };
