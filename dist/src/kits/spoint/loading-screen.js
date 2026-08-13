// Loading-screen paint surface for the spoint game client.
// renderLoadingScreen({brand, label}) -> { node, setLabel, setDownload,
// setProcessing, setDetail, hide, dispose }. The consumer (spoint
// LoadingManager) owns progress events; this module owns layout + classes.
// Two progress bars (download, processing), a label, and a detail line.

export function renderLoadingScreen(opts = {}) {
  const { brand = 'spoint', label = 'Connecting...' } = opts;

  const node = document.createElement('div');
  node.className = 'sp-loading ds-247420';
  node.dataset.component = 'loading-screen';

  const container = document.createElement('div');
  container.className = 'sp-loading-container';

  const header = document.createElement('div');
  header.className = 'sp-loading-header';
  const title = document.createElement('h1');
  title.textContent = brand;
  const labelEl = document.createElement('p');
  labelEl.className = 'sp-loading-label';
  labelEl.textContent = label;
  header.append(title, labelEl);

  const bars = document.createElement('div');
  bars.className = 'sp-loading-bars';

  const mkBar = (name) => {
    const row = document.createElement('div');
    row.className = 'sp-loading-bar-row';
    const nameEl = document.createElement('span');
    nameEl.className = 'sp-loading-bar-name';
    nameEl.textContent = name;
    const track = document.createElement('div');
    track.className = 'sp-loading-bar-track';
    const fill = document.createElement('div');
    fill.className = 'sp-loading-bar-fill';
    track.appendChild(fill);
    const pct = document.createElement('span');
    pct.className = 'sp-loading-bar-pct';
    pct.textContent = '0%';
    row.append(nameEl, track, pct);
    return { row, fill, pct };
  };

  const dl = mkBar('Download');
  const proc = mkBar('Processing');
  bars.append(dl.row, proc.row);

  const detail = document.createElement('div');
  detail.className = 'sp-loading-detail';

  container.append(header, bars, detail);
  node.appendChild(container);

  const setBar = (bar, percent) => {
    bar.fill.style.width = percent + '%';
    bar.pct.textContent = Math.round(percent) + '%';
  };

  return {
    node,
    setLabel: (text) => { labelEl.textContent = text; },
    setDownload: (percent) => setBar(dl, percent),
    setProcessing: (percent) => setBar(proc, percent),
    setDetail: (text) => { detail.textContent = text; },
    hide: async () => {
      node.classList.add('sp-loading-fade');
      await new Promise((r) => setTimeout(r, 500));
      node.remove();
    },
    dispose: () => node.remove(),
  };
}
