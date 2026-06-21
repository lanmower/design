// Browser-pane paint surface — URL bar + iframe slot + status row. Consumer owns iframe.
// renderBrowserPane({initialUrl, callbacks: {onNavigate, onReload, onBack, onForward}})
//   -> {node, slot, setUrl, setStatus, dispose}.
// slot is the container the consumer should append its iframe to.

export function renderBrowserPane(opts = {}) {
    const { initialUrl = 'about:blank', callbacks = {} } = opts;
    const node = document.createElement('div');
    node.className = 'app-pane browser-app';
    node.dataset.component = 'browser-app';

    const bar = document.createElement('div');
    bar.className = 'browser-app-bar';

    const mkBtn = (label, role) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'browser-app-btn';
        b.dataset.role = role;
        b.textContent = label;
        return b;
    };
    const backBtn = mkBtn('<', 'back');
    const fwdBtn = mkBtn('>', 'forward');
    const reloadBtn = mkBtn('reload', 'reload');

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'browser-app-url';
    urlInput.value = initialUrl;
    urlInput.spellcheck = false;
    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && callbacks.onNavigate) callbacks.onNavigate(urlInput.value);
    });
    backBtn.addEventListener('click', () => callbacks.onBack && callbacks.onBack());
    fwdBtn.addEventListener('click', () => callbacks.onForward && callbacks.onForward());
    reloadBtn.addEventListener('click', () => callbacks.onReload && callbacks.onReload());

    bar.append(backBtn, fwdBtn, reloadBtn, urlInput);

    const slot = document.createElement('div');
    slot.className = 'browser-app-slot';
    slot.dataset.role = 'iframe-mount';

    const status = document.createElement('div');
    status.className = 'browser-app-status';
    status.textContent = '';

    node.append(bar, slot, status);

    return {
        node,
        get slot() { return slot; },
        setUrl(u) { urlInput.value = u; },
        setStatus(s) { status.textContent = s; },
        dispose() {},
    };
}
