// The client-side mount script the SSR document embeds, as a string. It is
// NOT module code in this file's own scope: it ships verbatim inside the
// emitted <script type="module"> and runs in the browser against the SDK's
// `mount`/`components`/`h` exports plus the `__site__` JSON payload.
//
// It stays a template literal (not a real module compiled and inlined) because
// it must reach the browser as source with its own escaping intact — every
// backslash/backtick sequence below is written for the emitted output, not for
// this file. `clientScriptExtra` is appended raw after the mount() call.

export const CLIENT_SCRIPT = `import { mount, components as C, h } from 'anentrypoint-design';
const data = JSON.parse(document.getElementById('__site__').textContent);

function heroNode(hero) {
  if (!hero) return null;
  const badges = Array.isArray(hero.badges) ? hero.badges.filter(Boolean) : [];
  const badgeRow = badges.length
    ? h('div', { class: 'ds-hero-stats' }, ...badges.map((b, i) =>
        h('span', { key: i, class: 'ds-hero-stat' },
          h('strong', { class: 'ds-hero-stat-n' }, String(b.label != null ? b.label : b)),
          b.desc ? h('span', { class: 'ds-hero-stat-l' }, String(b.desc)) : null,
        )))
    : null;
  return h('div', { class: 'ds-hero' },
    hero.eyebrow ? h('span', { class: 'eyebrow' }, hero.eyebrow) : null,
    h('h1', { class: 'ds-hero-title' }, hero.heading || hero.title || data.title),
    (hero.body || hero.subheading) ? h('p', { class: 'ds-hero-body' },
      hero.body || hero.subheading,
      hero.accent ? h('span', { class: 'ds-hero-accent' }, ' ' + hero.accent) : null,
    ) : null,
    Array.isArray(hero.ctas) && hero.ctas.length
      ? h('div', { class: 'ds-hero-actions' }, ...hero.ctas.map((c, i) =>
          h('a', { key: i, class: i === 0 ? 'btn btn-accent' : 'btn btn-ghost', href: c.href || '#' }, c.label || c.cta || 'go')))
      : null,
    badgeRow,
  );
}

function sectionNode(sec, idx) {
  const features = sec.features || sec.items || [];
  const rows = features.map((f, i) => {
    const kids = [h('div', { key: 't', class: 'ds-feature-title' }, String(f.name || ''))];
    if (f.desc) kids.push(h('div', { key: 'd', class: 'ds-feature-desc', innerHTML: String(f.desc).replace(/\`([^\`]+)\`/g, '<code>$1</code>') }));
    if (f.benefit) kids.push(h('div', { key: 'b', class: 'ds-feature-benefit' }, String(f.benefit)));
    return h('div', { key: i, class: 'ds-feature' }, ...kids);
  });
  return C.Section({
    id: sec.id || null,
    title: sec.name || sec.title || sec.id,
    children: [
      sec.lede ? h('p', { class: 'ds-lede' }, sec.lede) : null,
      ...rows,
      sec.body && String(sec.body).trim() ? h('div', { class: 'page-body', innerHTML: __md(sec.body) }) : null,
    ].filter(Boolean),
  });
}

function examplesNode(examples) {
  if (!examples || !examples.length) return null;
  return C.Section({
    title: 'explore',
    children: examples.map((e, i) => {
      const kids = [
        h('span', { key: 'c', class: 'code' }, String(i + 1).padStart(2, '0')),
        h('span', { key: 't', class: 'title' }, String(e.label || e.name || e.href || '')),
      ];
      if (e.desc) kids.push(h('span', { key: 'm', class: 'meta dim' }, ' — ' + e.desc));
      kids.push(h('span', { key: 'a', class: 'ds-row-arrow' }, '->'));
      return h('a', { key: i, class: 'row', href: e.href || '#' }, ...kids);
    }),
  });
}

function panelNode(panel, idx) {
  const items = Array.isArray(panel.items) ? panel.items : [];
  if (!items.length) return null;
  const rows = items.map((it, i) => {
    const kids = [
      h('span', { key: 'c', class: 'code' }, String(it.code || String(i + 1).padStart(2, '0'))),
      h('span', { key: 't', class: 'title' }, String(it.title || it.name || '')),
    ];
    if (it.sub || it.desc) kids.push(h('span', { key: 'm', class: 'meta dim' }, ' — ' + (it.sub || it.desc)));
    kids.push(h('span', { key: 'a', class: 'ds-row-arrow' }, it.meta || '->'));
    return h('a', { key: i, class: 'row', href: it.href || '#' }, ...kids);
  });
  return C.Panel({ id: panel.id || null, title: panel.title || panel.name || '', count: panel.count || items.length, children: rows });
}

function marqueeNode(marquee) {
  if (!marquee || !Array.isArray(marquee.items) || !marquee.items.length) return null;
  return C.Marquee ? C.Marquee({ items: marquee.items, sep: marquee.sep || '/' }) : null;
}

function quickstartNode(quickstart) {
  if (!quickstart || !Array.isArray(quickstart.lines) || !quickstart.lines.length) return null;
  const lineNodes = quickstart.lines.map((l, i) => h('div', { key: 'q' + i, class: 'cli' },
    h('span', { class: 'prompt' }, l.kind === 'cmt' ? '#' : '$'),
    h('span', { class: 'cmd' }, l.text)
  ));
  return C.Panel({ title: quickstart.heading || 'quick start', children: h('div', { class: 'ds-quickstart' }, ...lineNodes) });
}

function sideNode(sidebar) {
  if (!sidebar || !Array.isArray(sidebar.sections) || !sidebar.sections.length || !C.Side) return null;
  return C.Side({ sections: sidebar.sections });
}

// minimal client-side markdown renderer matching server-side renderer (idempotent for already-html bodies)
function __slug(s) { return String(s || '').trim().toLowerCase().replace(/[^\\w\\s-]/g, '').replace(/\\s+/g, '-'); }
function __md(md) {
  const lines = String(md || '').split('\\n');
  const out = []; let inCode = false, inList = false;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inl = (s) => s.replace(/\`([^\`]+)\`/g, '<code>$1</code>').replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>').replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>');
  for (const line of lines) {
    if (line.startsWith('\`\`\`')) { if (inCode) { out.push('</pre>'); inCode = false; } else { out.push('<pre>'); inCode = true; } continue; }
    if (inCode) { out.push(esc(line)); continue; }
    if (line.startsWith('# ')) { const t = line.slice(2); out.push('<h1 id="' + __slug(t) + '">' + esc(t) + '</h1>'); }
    else if (line.startsWith('## ')) { const t = line.slice(3); out.push('<h2 id="' + __slug(t) + '">' + esc(t) + '</h2>'); }
    else if (line.startsWith('### ')) { const t = line.slice(4); out.push('<h3 id="' + __slug(t) + '">' + esc(t) + '</h3>'); }
    else if (line.startsWith('- ')) { if (!inList) { out.push('<ul>'); inList = true; } out.push('<li>' + inl(esc(line.slice(2))) + '</li>'); }
    else { if (inList) { out.push('</ul>'); inList = false; } if (line.trim()) out.push('<p>' + inl(esc(line)) + '</p>'); }
  }
  if (inList) out.push('</ul>');
  if (inCode) out.push('</pre>');
  return out.join('\\n');
}

const bodyNode = data.bodyHtml ? C.Section({ children: h('div', { class: 'page-body', innerHTML: data.bodyHtml }) }) : null;

const mainChildren = [
  heroNode(data.hero),
  marqueeNode(data.marquee),
  ...data.sections.map(sectionNode),
  ...(data.panels || []).map(panelNode),
  quickstartNode(data.quickstart),
  examplesNode(data.examples),
  bodyNode,
].filter(Boolean);

mount(document.getElementById('app'), () => C.AppShell({
  topbar: C.Topbar({ brand: data.siteName, items: data.navItems, active: data.title }),
  crumb: C.Crumb({ leaf: data.title }),
  side: sideNode(data.sidebar),
  main: h('div', { class: 'app-stage' }, ...mainChildren),
  status: C.Status({
    left: data.statusLeft || [data.siteName.toLowerCase(), data.slug],
    right: data.statusRight || ['live'],
  }),
}));
`;
