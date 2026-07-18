// Public entry point for the flatspace-theme kit. Re-exports the shared
// escaping + opt-in article-extraction utilities every known flatspace
// theme.mjs (rs-codeinsight, rs-plugkit, gm) needs. Each site's own
// page-composition logic (component layout, data contract) stays local to
// its own site/theme.mjs -- that part legitimately differs per site (single-
// page Hero/Features/Quickstart vs gm's multi-page article/landing split)
// and is not force-unified here.
export { escapeHtml, escapeJson, extractArticle, rewriteLegacyLinks } from './html-utils.js';

// Canonical unpkg URLs every theme.mjs's importmap/<link> points at, kept in
// one place so a future SDK CDN path change is a single-file edit instead of
// a 3-repo grep-and-replace.
export const SDK_CSS_URL = 'https://unpkg.com/anentrypoint-design@latest/dist/247420.css';
export const SDK_JS_URL = 'https://unpkg.com/anentrypoint-design@latest/dist/247420.js';
