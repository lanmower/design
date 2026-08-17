export { escapeHtml, escapeJson, extractArticle, rewriteLegacyLinks } from './html-utils.js';

// jsDelivr, not raw.githack: raw.githack/githubusercontent had a CORS/outage
// window (2026-08-17) that broke both design's own homepage and 247420.xyz.
// jsDelivr caches a GitHub @main branch reference for up to 12h regardless of
// purge, but that staleness is preferable to a hard CDN outage.
export const SDK_CSS_URL = `https://cdn.jsdelivr.net/gh/AnEntrypoint/design@main/dist/247420.css`;
export const SDK_JS_URL = `https://cdn.jsdelivr.net/gh/AnEntrypoint/design@main/dist/247420.js`;
