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
//
// This module is a barrel over ./page-html/: the server-side markdown+href
// helpers, the <head> tag builders, the inline <style> block, and the client
// mount script string. The public export surface here is unchanged — no
// consumer import needs to move.

import { escape, inlineMd, slugify, renderMarkdown, joinHref } from './page-html/markdown.js';
import { renderSeoTags, renderFaviconTags, renderCssLink } from './page-html/head-tags.js';
import { PAGE_INLINE_STYLES } from './page-html/page-styles.js';
import { CLIENT_SCRIPT } from './page-html/client-script.js';

export { escape, inlineMd, slugify, renderMarkdown };

export function renderPageHtml({
    title = '247420', slug = 'index', siteName = '247420',
    navItems = [], basePath = '',
    hero, sections, examples, body,
    theme = 'auto', cssHref, headExtra = '',
    // Extended affordances (all optional, all backward compatible — a call
    // site that omits them gets byte-identical output to before these were
    // added). See design/site/theme.mjs and thebird/site/theme.mjs for
    // consumers of the full surface.
    seo = null,               // { description, keywords, author, twitter, locale, lang, image, url, glyph, ldJson:boolean }
    sidebar = null,           // { sections: [{ group, items: [{glyph,label,href}] }] } -> C.Side
    marquee = null,           // { items: [...strings], sep }
    panels = null,            // [{ id, title, count, items: [{code,title,sub,meta,href}] }] -> C.Panel + RowLink rows
    quickstart = null,        // { heading, lines: [{ kind, text }] } -> cli block panel
    statusLeft = null,        // override the default [siteName.toLowerCase(), slug] status-bar left cluster
    statusRight = null,       // override the default ['live'] status-bar right cluster
    faviconHref = null,       // static favicon URL (e.g. './favicon.svg'); takes precedence over faviconGlyph
    faviconGlyph = null,      // single-character/emoji favicon rendered as an inline data: SVG
    clientScriptExtra = '',   // raw JS appended after the mount() call in the client <script type="module">
    version = null,           // pin BOTH the CSS href and the JS importmap to this exact version
                               // instead of @latest (e.g. '0.0.320'); omitted -> default @latest behavior.
} = {}) {
    const pkgVersion = version || 'latest';
    const cssLink = renderCssLink({ cssHref, pkgVersion });

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
        sidebar: sidebar || null,
        marquee: marquee || null,
        panels: Array.isArray(panels) ? panels : [],
        quickstart: quickstart || null,
        statusLeft: Array.isArray(statusLeft) ? statusLeft : null,
        statusRight: Array.isArray(statusRight) ? statusRight : null,
    };

    const seoTags = seo ? renderSeoTags({ title, siteName, seo }) : '';
    const faviconTags = renderFaviconTags({ faviconHref, faviconGlyph });

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
${seoTags}
${faviconTags}
${cssLink}
<script type="importmap">
{ "imports": { "anentrypoint-design": "https://unpkg.com/anentrypoint-design@${pkgVersion}/dist/247420.js" } }
</script>
<style>
${PAGE_INLINE_STYLES}
</style>
<script id="__site__" type="application/json">${JSON.stringify(pageData).replace(/</g, '\\u003c')}</script>
${headExtra}
</head>
<body>
<div id="app"></div>
<script type="module">
${CLIENT_SCRIPT}${clientScriptExtra}
</script>
</body>
</html>`;
}
