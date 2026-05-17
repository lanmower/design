// <ds-chat> custom element — auto-registers when SDK loads in a browser.
// Properties: el.messages = [{role,text}, ...]; el.placeholder = string.
// Emits a bubbling, composed 'send' event with { detail: { text } }.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Chat } from '../components/chat.js';

class DsChat extends HTMLElement {
    constructor() {
        super();
        this._messages = [];
        this._placeholder = 'type, then ⏎';
    }
    static get observedAttributes() { return ['messages', 'placeholder']; }
    attributeChangedCallback(name, _old, val) {
        if (name === 'messages') {
            try { this._messages = JSON.parse(val); } catch { this._messages = []; }
        } else if (name === 'placeholder') {
            this._placeholder = val || '';
        }
        this._render();
    }
    set messages(v) { this._messages = Array.isArray(v) ? v : []; this._render(); }
    get messages() { return this._messages; }
    set placeholder(v) { this._placeholder = v || ''; this._render(); }
    get placeholder() { return this._placeholder; }
    connectedCallback() { this.classList.add('ds-247420'); this._render(); }
    _send(text) { this.dispatchEvent(new CustomEvent('send', { detail: { text }, bubbles: true, composed: true })); }
    _render() {
        if (!this.isConnected) return;
        const node = Chat({ messages: this._messages, onSend: (t) => this._send(t) });
        webjsx.applyDiff(this, node);
    }
}

export { DsChat };

let _registered = false;
export function registerChatElement() {
    if (_registered) return;
    if (typeof customElements === 'undefined') return;
    if (customElements.get('ds-chat')) { _registered = true; return; }
    customElements.define('ds-chat', DsChat);
    _registered = true;
}
