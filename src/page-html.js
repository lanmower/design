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

// Single source of HTML escaping lives in markdown.js (full entity set). Kept
// the `escape` export name for backward compatibility with any consumer.
import { escapeHtml } from './markdown.js';
export const escape = escapeHtml;

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

    // Theme attribute co-location is CORRECT here: dist/247420.css keys every
    // theme block off the COMPOUND selector `.ds-247420[data-theme="X"]`
    // (verified in dist/247420.css ~L229). That selector requires BOTH the class
    // and the data-theme on the SAME node, so `<html class="ds-247420"
    // data-theme=...>` is what the CSS expects for SSR. The AGENTS.md
    // "descendant-selector" warning is about the dashboard's RUNTIME controller,
    // which splits them (.ds-247420 on <html>, data-theme on <body>) and relies
    // on inheritance — a different mechanism. Do NOT move data-theme to <body>
    // here or the theme blocks stop matching.
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
.app-stage { width: 100%; max-width: var(--measure-wide, 940px); margin-inline: auto; padding: var(--space-6, 48px) var(--space-4, 24px) var(--space-8, 96px); display: grid; gap: var(--space-6, 48px); box-sizing: border-box }
@media (max-width: 768px) { .app-stage { padding: var(--space-4, 24px) var(--space-3, 16px) var(--space-6, 48px); gap: var(--space-5, 32px) } }
.page-body > :first-child { margin-top: 0 }
.page-body h1 { margin-top: 0 } .page-body h2 { margin-top: var(--space-5, 32px) } .page-body h3 { margin-top: var(--space-4, 24px) }
.page-body > * + * { margin-top: var(--space-3, 16px) }
.page-body pre { margin: var(--space-3, 16px) 0; background: var(--panel-2); padding: var(--space-3, 16px); border-radius: var(--r-1, 10px); overflow-x: auto }
/* .app-stage owns inter-block rhythm via grid gap; sections/hero must not double it.
   These selectors carry !important because this inline block loads before the
   unpkg CSS bundle, which would otherwise win on load-order for equal specificity. */
.ds-247420 .app-stage > .ds-hero { margin: 0 !important; padding: var(--space-4, 24px) 0 0 !important; max-width: none !important; gap: var(--space-4, 24px) !important }
.ds-247420 .app-stage > .ds-section { margin: 0 !important }
.app-stage .row + .row { margin-top: var(--space-1, 4px) }
.app-stage .ds-section .row { margin-top: var(--space-2, 8px) }
.app-stage .ds-section > p.ds-lede { margin: 0 0 var(--space-3, 16px); max-width: var(--measure, 68ch); color: var(--fg-2) }
.row-benefit { font-style: italic; color: var(--fg-3); font-size: var(--fs-sm); margin-top: var(--space-1, 4px) }
.ds-row-arrow { margin-left: auto; opacity: .5; transition: opacity var(--dur-snap, 80ms) var(--ease) }
a.row:hover .ds-row-arrow { opacity: 1 }
/* hero stat strip — all badges as a wrapping inline rhythm, not one empty panel */
.ds-hero-stats { display: flex; flex-wrap: wrap; gap: var(--space-3, 16px) var(--space-5, 32px); margin-top: var(--space-2, 8px) }
.ds-hero-stat { display: flex; align-items: baseline; gap: var(--space-2, 8px) }
.ds-hero-stat-n { font-family: var(--ff-body); font-weight: 700; font-size: var(--fs-lg, 18px); color: var(--fg) }
.ds-hero-stat-l { font-size: var(--fs-sm, 15px); color: var(--fg-3) }
/* accent sits on its own line, muted, so it reads as a distinct aside instead
   of running on from the hero body sentence. */
.ds-hero-accent { display: block; margin-top: var(--space-2, 8px); color: var(--fg-3) }
/* feature rows — single-column stack with a rail accent (the dashboard .row grid
   forces a 3-col code/title/meta layout that mangles title+desc+benefit) */
/* background uses a theme-neutral panel token (resolves per data-theme) so dark
   mode doesn't flash a literal white card before/independent of the bundle. */
.ds-feature { position: relative; padding: var(--space-3, 16px) var(--space-4, 24px); background: var(--panel-1, var(--bg)); border-radius: var(--r-2, 14px); display: grid; gap: var(--space-1, 4px) }
.ds-feature::before { content: ''; position: absolute; left: 0; top: var(--space-2, 8px); bottom: var(--space-2, 8px); width: 3px; border-radius: 3px; background: var(--rail-color, var(--rule-strong)) }
.ds-feature.rail-green { --rail-color: var(--green) } .ds-feature.rail-purple { --rail-color: var(--purple) } .ds-feature.rail-mascot { --rail-color: var(--mascot) }
.ds-feature.rail-sun { --rail-color: var(--sun) } .ds-feature.rail-flame { --rail-color: var(--flame) } .ds-feature.rail-sky { --rail-color: var(--sky) }
.ds-feature + .ds-feature { margin-top: var(--space-2, 8px) }
.ds-feature-title { font-weight: 600; font-size: var(--fs-lg, 18px); color: var(--fg) }
.ds-feature-desc { font-size: var(--fs-sm, 15px); color: var(--fg-2); line-height: 1.5; overflow-wrap: anywhere }
.ds-feature-benefit { font-style: italic; font-size: var(--fs-sm, 15px); color: var(--fg-3); margin-top: var(--space-1, 4px) }
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
  const rail = RAILS[idx % RAILS.length];
  const features = sec.features || sec.items || [];
  const rows = features.map((f, i) => {
    const kids = [h('div', { key: 't', class: 'ds-feature-title' }, String(f.name || ''))];
    if (f.desc) kids.push(h('div', { key: 'd', class: 'ds-feature-desc', innerHTML: String(f.desc).replace(/\`([^\`]+)\`/g, '<code>$1</code>') }));
    if (f.benefit) kids.push(h('div', { key: 'b', class: 'ds-feature-benefit' }, String(f.benefit)));
    return h('div', { key: i, class: 'ds-feature ' + rail }, ...kids);
  });
  return C.Section({
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
      const rail = RAILS[(i + 1) % RAILS.length];
      const kids = [
        h('span', { key: 'c', class: 'code' }, String(i + 1).padStart(2, '0')),
        h('span', { key: 't', class: 'title' }, String(e.label || e.name || e.href || '')),
      ];
      if (e.desc) kids.push(h('span', { key: 'm', class: 'meta dim' }, ' — ' + e.desc));
      kids.push(h('span', { key: 'a', class: 'ds-row-arrow' }, '->'));
      return h('a', { key: i, class: 'row ' + rail, href: e.href || '#' }, ...kids);
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
