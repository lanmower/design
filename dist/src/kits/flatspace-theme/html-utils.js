// Shared HTML/JSON escaping + raw-HTML article extraction utilities for
// flatspace `theme.mjs` renderers (rs-codeinsight, rs-plugkit, gm, and any
// future flatspace site consuming the AnEntrypoint design system).
//
// escapeHtml/escapeJson are used by every known theme.mjs verbatim (byte-
// identical across rs-codeinsight and rs-plugkit prior to this extraction).
// extractArticle/rewriteLegacyLinks are OPT-IN: only sites with
// layout:'article' pages sourced from raw pre-existing HTML docs (gm's
// docs/*.html papers) need them. A single-page or YAML-only site never calls
// them, so importing this module carries no cost for sites that don't.

export const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const escapeJson = (obj) => JSON.stringify(obj)
  .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
  .replace(new RegExp('\\u2028', 'g'), '\\u2028').replace(new RegExp('\\u2029', 'g'), '\\u2029');

// Strips <header>/<footer> chrome and the <html>/<head>/<body> wrapper from a
// raw standalone HTML document, returning just the body's inner content for
// re-hosting inside a flatspace-rendered article shell. Opt-in: only called
// by sites with layout:'article' pages whose `source` field points at a raw
// pre-existing .html file (gm's docs/paper.html etc).
export function extractArticle(html) {
  const bodyOpen = html.search(/<body[^>]*>/i);
  if (bodyOpen < 0) return html;
  const bodyStart = html.indexOf('>', bodyOpen) + 1;
  const bodyEnd = html.lastIndexOf('</body>');
  let body = html.slice(bodyStart, bodyEnd >= 0 ? bodyEnd : html.length);
  body = body.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  body = body.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
  return body.trim();
}

// Rewrites legacy same-site relative .html links (paper.html, distribution.html,
// etc) found inside extracted article HTML into flatspace's route paths
// (/paper/, /distribution/, ...), given the caller's own slug->path map.
// Opt-in, same scope as extractArticle: only needed when article HTML
// predates the flatspace multi-page routing and still uses .html-relative
// hrefs. `slugToPath` defaults to gm's known page set but callers with a
// different page inventory pass their own map.
const DEFAULT_SLUGS = ['index', 'paper', 'distribution', 'made-with', 'stats', 'crates', 'skills'];
const DEFAULT_SLUG_TO_PATH = {
  index: '/', paper: '/paper/', distribution: '/distribution/',
  'made-with': '/made-with/', stats: '/stats/', crates: '/crates/', skills: '/skills/',
};

export function rewriteLegacyLinks(html, basePath, opts = {}) {
  const slugs = opts.slugs || DEFAULT_SLUGS;
  const slugToPath = opts.slugToPath || DEFAULT_SLUG_TO_PATH;
  return html.replace(/href="([^"]+)"/g, (full, hrefRaw) => {
    const href = hrefRaw.trim();
    if (/^(https?:)?\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('/')) return full;
    let path = href, hash = '';
    const hi = path.indexOf('#');
    if (hi >= 0) { hash = path.slice(hi); path = path.slice(0, hi); }
    path = path.replace(/^\.\//, '').replace(/\.html$/, '').replace(/\/$/, '');
    if (slugs.includes(path)) return `href="${basePath}${slugToPath[path]}${hash}"`;
    return full;
  });
}
