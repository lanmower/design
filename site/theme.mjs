// AnEntrypoint design-system theme for flatspace — thin delegate over this
// repo's OWN renderPageHtml (../src/page-html.js). The SDK owns all 247420
// page scaffolding (hero, sections, panels, sidebar, marquee, quickstart,
// SEO meta); this file only maps site/content YAML -> renderPageHtml's data
// shape. Same repo, so this imports the source module directly (no npm
// package-boundary round-trip needed).

import { renderPageHtml } from '../src/page-html.js';

// A row `code` is a type tag (md, css, fb, os, wc, api), never a position.
// Bare ordinals carry no information the row order does not already show, so
// a numeric code is dropped rather than rendered as decoration.
const isOrdinal = (c) => /^\d+$/.test(String(c).trim());

function rows(items) {
  return (items || []).map((it) => ({
    code: it.code && !isOrdinal(it.code) ? it.code : '',
    title: it.title || it.name,
    sub: it.sub || it.desc || '',
    meta: it.cta || it.meta || 'open ->',
    href: it.href || '#',
  }));
}

function panel(section, id, itemsKey = 'items') {
  if (!section || !section[itemsKey] || !section[itemsKey].length) return null;
  return {
    id: section.id || id,
    title: section.heading,
    count: section.count || section[itemsKey].length,
    items: rows(section[itemsKey]),
  };
}

// A sidebar row's `count` is never hand-typed: it is looked up here from the
// same content arrays theme.mjs builds real panels from, so a badge can never
// drift out of sync with the panel header/row-count it points at. `countFor`
// resolves a row's destination href against a small table of real sources —
// add a source here whenever a new href needs a count-backed row.
function realCount(home, key) {
  const src = {
    all: () => (home.kits?.items?.length || 0) + (home.decks?.items?.length || 0) + (home.previews?.items?.length || 0) + (home.docs?.items?.length || 0),
    kits: () => home.kits?.items?.length || 0,
    decks: () => home.decks?.items?.length || 0,
    previews: () => home.previews?.items?.length || 0,
    docs: () => home.docs?.items?.length || 0,
  }[key];
  return src ? src() : null;
}

// href -> realCount key. Every bin/label href that should carry a live count
// is listed once here; a row whose href isn't in this table keeps whatever
// count its yaml source provides (or none).
const COUNT_SOURCE_BY_HREF = { '#all': 'all', '#kits': 'kits', '#decks': 'decks', '#previews': 'previews', '#docs': 'docs' };

function withRealCounts(home, items) {
  return items.map((it) => {
    const key = COUNT_SOURCE_BY_HREF[it.href];
    const count = key ? realCount(home, key) : it.count;
    return { ...it, count };
  });
}

function buildSidebar(home) {
  const sb = home.sidebar || {};
  const sections = [];
  if (sb.fab) sections.push({ group: 'open', items: [{ glyph: sb.fab.glyph || '+', label: sb.fab.label || 'open', href: sb.fab.href || '#' }] });
  if (sb.bins && sb.bins.length) sections.push({ group: 'bins', items: withRealCounts(home, sb.bins) });
  if (sb.labels && sb.labels.length) sections.push({ group: sb.labels_group || 'labels', items: withRealCounts(home, sb.labels) });
  if (sb.more && sb.more.length) sections.push({ group: sb.more_group || 'more', items: sb.more });
  return sections.length ? { sections } : null;
}

export default {
  render: async (ctx) => {
    const site = ctx.readGlobal('site') || {};
    const nav = ctx.readGlobal('navigation') || { links: [] };
    const homeDoc = ctx.read('pages').docs.find(p => p.id === 'home');
    if (!homeDoc) throw new Error('site/content/pages/home.yaml missing or has no id: home');
    const home = homeDoc;
    const hero = home.hero || null;

    const panels = [
      panel(home.kits, 'kits'),
      panel(home.file_browser, 'file_browser'),
      panel(home.desktop_os, 'desktop_os'),
      panel(home.web_components, 'web_components'),
      panel(home.api_exports, 'api_exports'),
      panel(home.decks, 'decks'),
      panel(home.docs, 'docs'),
      panel(home.features, 'features'),
    ].filter(Boolean);

    if (home.previews && home.previews.items && home.previews.items.length) {
      const base = home.previews.base || './preview/';
      panels.push({
        id: 'previews',
        title: home.previews.heading || 'previews',
        count: home.previews.items.length,
        items: home.previews.items.map((name) => ({
          code: '',
          title: String(name).replace(/-/g, ' '),
          sub: 'preview · ' + name + '.html',
          meta: 'open ->',
          href: base + name + '.html',
        })),
      });
    }

    const html = renderPageHtml({
      title: site.title || home.title || '247420',
      slug: 'index',
      siteName: site.siteName || site.title || '247420',
      navItems: (nav.links || []).map(l => [String(l.label || ''), l.href]),
      hero: hero ? {
        heading: hero.heading, subheading: hero.subheading || site.tagline,
        body: hero.body, badges: hero.badges,
        ctas: hero.ctas,
      } : null,
      panels,
      examples: home.examples && home.examples.items ? home.examples.items.map((e) => ({
        label: e.name || e.title, desc: e.desc, href: e.href,
      })) : null,
      marquee: { items: ['open source', 'design tokens', 'buildless components', 'zero raw color literals'], sep: '/' },
      quickstart: home.quickstart && home.quickstart.lines ? { heading: home.quickstart.heading, lines: home.quickstart.lines } : null,
      sidebar: buildSidebar(home),
      statusLeft: home.status_left || ['main', '- utf-8', '- lf'],
      // Real facts, not filler: the SDK version this page actually loads
      // (pageHtml pins every consumer to @latest, so 'latest' is the honest
      // answer, not a placeholder) and the live kit count already computed
      // for the kits panel above — never a hand-typed vanity string.
      statusRight: [
        'anentrypoint-design@latest',
        (home.kits && home.kits.items ? home.kits.items.length : 0) + ' kits',
      ],
      seo: {
        description: site.description || site.tagline || site.title,
        keywords: site.keywords || ['247420', 'anentrypoint', 'design system'],
        author: site.author || '247420 · a design system by AnEntrypoint',
        twitter: site.twitter || '@AnEntrypoint',
        locale: site.locale || 'en_US',
        lang: site.lang || 'en',
        image: site.image || (site.url ? site.url.replace(/\/$/, '') + '/og-card.png' : ''),
        url: site.url || '',
      },
      faviconGlyph: site.glyph || (site.title ? site.title.trim().charAt(0).toUpperCase() : '2'),
      headExtra: `<style>html,body{margin:0;padding:0}body{background:var(--bg,#F6F5F1);color:var(--fg,#131318);font-family:var(--ff-body,system-ui,sans-serif)}</style>`,
    });

    return [{ path: 'index.html', html }];
  }
};
