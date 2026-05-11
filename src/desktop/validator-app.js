// Validator-app paint surface — status banner + counts + iframe slot. Consumer mounts iframe.
// renderValidator({src, results, callbacks: {onRerun}}) -> {node, slot, setResults, dispose}.
// results shape: {allGreen, passed, total, ms} — banner updates colors + counts.

export function renderValidator(opts = {}) {
    const { src = '', results = null, callbacks = {} } = opts;
    const node = document.createElement('div');
    node.className = 'app-pane validator-app';
    node.dataset.component = 'validator-app';

    const head = document.createElement('div');
    head.className = 'validator-app-head';
    const banner = document.createElement('span');
    banner.className = 'validator-app-banner';
    banner.dataset.state = 'pending';
    banner.textContent = 'pending';
    const counts = document.createElement('span');
    counts.className = 'validator-app-counts';
    counts.textContent = '0 / 0';
    const rerun = document.createElement('button');
    rerun.type = 'button';
    rerun.className = 'validator-app-rerun';
    rerun.textContent = 'rerun';
    rerun.addEventListener('click', () => callbacks.onRerun && callbacks.onRerun());
    head.append(banner, counts, rerun);

    const slot = document.createElement('div');
    slot.className = 'validator-app-slot';
    slot.dataset.role = 'validator-mount';

    if (src) {
        const f = document.createElement('iframe');
        f.className = 'validator-app-frame';
        f.src = src;
        slot.appendChild(f);
    }

    node.append(head, slot);

    function setResults(r) {
        if (!r) { banner.dataset.state = 'pending'; banner.textContent = 'pending'; counts.textContent = '0 / 0'; return; }
        const state = r.allGreen ? 'pass' : 'fail';
        banner.dataset.state = state;
        banner.textContent = state;
        counts.textContent = (r.passed ?? 0) + ' / ' + (r.total ?? 0) + (r.ms != null ? ' · ' + r.ms + 'ms' : '');
    }
    if (results) setResults(results);

    return {
        node,
        get slot() { return slot; },
        setResults,
        dispose() {},
    };
}
