// Static-site page HTML renderer. Emits a thin SDK-shell document that mounts
// the page using the SDK's own kit components (Hero, Section, Panel, Row, etc.)
// — the kit is the single source of truth for visual design; this file only
// declares the data shape and the mount entry point.
//
// Consumer contract:
//   renderPageHtml({
//     title, slug, siteName,
//     navItems: [[label, href], ...],          // hrefs are joined with basePath
//     basePath: '/freddie/',                    // prefix for relative nav hrefs
//     hero: { heading, body, accent, badges, ctas },
//     sections: [{ id, name, lede, body, features: [{name, desc, benefit}] }, ...],
//     examples: [{ label, desc, href }, ...],
//     body: markdown-string,
//     theme: 'auto' | 'light' | 'ink',
//     cssHref, headExtra,
//   })

export function escape(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function inlineMd(s) {
    return s
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

export function renderMarkdown(md) {
    const lines = String(md || '').split('\n');
    const out = [];
    let inCode = false, inList = false;
    for (const line of lines) {
        if (line.startsWith('```')) { if (inCode) { out.push('</pre>'); inCode = false; } else { out.push('<pre>'); inCode = true; } continue; }
        if (inCode) { out.push(escape(line)); continue; }
        if (line.startsWith('# ')) out.push(`<h1>${escape(line.slice(2))}</h1>`);
        else if (line.startsWith('## ')) out.push(`<h2>${escape(line.slice(3))}</h2>`);
        else if (line.startsWith('### ')) out.push(`<h3>${escape(line.slice(4))}</h3>`);
        else if (line.startsWith('- ')) { if (!inList) { out.push('<ul>'); inList = true; } out.push(`<li>${inlineMd(escape(line.slice(2)))}</li>`); }
        else { if (inList) { out.push('</ul>'); inList = false; } if (line.trim()) out.push(`<p>${inlineMd(escape(line))}</p>`); }
    }
    if (inList) out.push('</ul>');
    if (inCode) out.push('</pre>');
    return out.join('\n');
}

// Join a basePath prefix to a nav href. Absolute URLs and hash links pass
// through unchanged; leading-slash paths get the prefix.
function joinHref(basePath, href) {
    if (!href) return '#';
    const h = String(href);
    if (/^([a-z]+:|#|\/\/)/i.test(h)) return h;
    if (!basePath) return h;
    const base = basePath.replace(/\/+$/, '');
    if (h.startsWith('/')) return base + h;
    return base + '/' + h.replace(/^\.?\//, '');
}

export function renderPageHtml({
    title = '247420', slug = 'index', siteName = '247420',
    navItems = [], basePath = '',
    hero, sections, examples, body,
    theme = 'auto', cssHref, headExtra = ''
} = {}) {
    const cssLink = cssHref
        ? `<link rel="stylesheet" href="${cssHref}">`
        : `<link rel="stylesheet" href="https://unpkg.com/anentrypoint-design@latest/dist/247420.css">`;

    // Resolve nav hrefs server-side against basePath. Client receives final URLs.
    const navResolved = (Array.isArray(navItems) ? navItems : []).map(([label, href]) =>
        [label, joinHref(basePath, href)]
    );

    // Data the client mount needs. Markdown body is parsed server-side into
    // HTML so the client can innerHTML it inside a Section.
    const pageData = {
        title, slug, siteName, navItems: navResolved, theme,
        hero: hero || null,
        sections: Array.isArray(sections) ? sections : [],
        examples: Array.isArray(examples) ? examples : [],
        bodyHtml: body ? renderMarkdown(body) : '',
    };

    return `<!doctype html>
<html lang="en" class="ds-247420" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} — ${escape(siteName)}</title>
${cssLink}
<script type="importmap">
{ "imports": { "anentrypoint-design": "https://unpkg.com/anentrypoint-design@latest/dist/247420.js" } }
</script>
<style>
.app-stage { max-width: 1100px; margin: 0 auto; padding: 24px; display: grid; gap: 24px }
.page-body h1 { margin-top: 0 } .page-body h2 { margin-top: 32px } .page-body h3 { margin-top: 24px }
.page-body pre { margin: 12px 0; background: var(--panel-2); padding: 12px; border-radius: 8px; overflow-x: auto }
</style>
<script id="__site__" type="application/json">${JSON.stringify(pageData).replace(/</g, '\\u003c')}</script>
${headExtra}
</head>
<body>
<div id="app"></div>
<script type="module">
import { mount, components as C, h } from 'anentrypoint-design';
const data = JSON.parse(document.getElementById('__site__').textContent);
const RAILS = ['rail-green', 'rail-purple', 'rail-mascot', 'rail-sun', 'rail-flame', 'rail-sky'];

function heroNode(hero) {
  if (!hero) return null;
  return C.Hero({
    eyebrow: hero.eyebrow,
    title: hero.heading || hero.title || data.title,
    body: hero.body || hero.subheading || '',
    accent: hero.accent,
    badge: Array.isArray(hero.badges) && hero.badges[0] ? hero.badges[0].label : undefined,
    actions: Array.isArray(hero.ctas) ? hero.ctas.map(c => ({ label: c.label || c.cta || 'go', href: c.href || '#' })) : [],
  });
}

function sectionNode(sec, idx) {
  const rail = RAILS[idx % RAILS.length];
  const features = sec.features || sec.items || [];
  const rows = features.map((f, i) => h('div', { key: i, class: 'row ' + rail },
    h('span', { class: 'title' }, f.name),
    f.desc ? h('div', { class: 'sub', innerHTML: f.desc.replace(/\`([^\`]+)\`/g, '<code>$1</code>') }) : null,
    f.benefit ? h('div', { class: 'row-benefit' }, f.benefit) : null,
  ));
  return C.Section({
    title: sec.name || sec.title || sec.id,
    children: [
      sec.lede ? h('p', { class: 'ds-lede' }, sec.lede) : null,
      ...rows,
      sec.body && sec.body.length >= 240 ? h('div', { class: 'page-body', innerHTML: __md(sec.body) }) : null,
    ].filter(Boolean),
  });
}

function examplesNode(examples) {
  if (!examples || !examples.length) return null;
  return C.Section({
    title: 'explore',
    children: examples.map((e, i) => {
      const rail = RAILS[(i + 1) % RAILS.length];
      return h('a', { key: i, class: 'row ' + rail, href: e.href || '#' },
        h('span', { class: 'code' }, String(i + 1).padStart(2, '0')),
        h('span', { class: 'title' }, e.label || e.name || e.href),
        e.desc ? h('span', { class: 'meta dim' }, ' — ' + e.desc) : null,
        h('span', { class: 'ds-row-arrow' }, '↗'),
      );
    }),
  });
}

// minimal client-side markdown renderer matching server-side renderer (idempotent for already-html bodies)
function __md(md) {
  const lines = String(md || '').split('\\n');
  const out = []; let inCode = false, inList = false;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inl = (s) => s.replace(/\`([^\`]+)\`/g, '<code>$1</code>').replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>').replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>');
  for (const line of lines) {
    if (line.startsWith('\`\`\`')) { if (inCode) { out.push('</pre>'); inCode = false; } else { out.push('<pre>'); inCode = true; } continue; }
    if (inCode) { out.push(esc(line)); continue; }
    if (line.startsWith('# ')) out.push('<h1>' + esc(line.slice(2)) + '</h1>');
    else if (line.startsWith('## ')) out.push('<h2>' + esc(line.slice(3)) + '</h2>');
    else if (line.startsWith('### ')) out.push('<h3>' + esc(line.slice(4)) + '</h3>');
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
  ...data.sections.map(sectionNode),
  examplesNode(data.examples),
  bodyNode,
].filter(Boolean);

mount(document.getElementById('app'), () => C.AppShell({
  topbar: C.Topbar({ brand: data.siteName, items: data.navItems, active: data.title }),
  crumb: C.Crumb({ leaf: data.title }),
  main: h('div', { class: 'app-stage' }, ...mainChildren),
  status: C.Status({ left: [data.siteName.toLowerCase(), data.slug], right: ['live'] }),
}));
</script>
</body>
</html>`;
}
