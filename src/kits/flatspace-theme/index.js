// Public entry point for the flatspace-theme kit. Re-exports the shared
// escaping + opt-in article-extraction utilities every known flatspace
// theme.mjs (rs-codeinsight, rs-plugkit, gm) needs. Each site's own
// page-composition logic (component layout, data contract) stays local to
// its own site/theme.mjs -- that part legitimately differs per site (single-
// page Hero/Features/Quickstart vs gm's multi-page article/landing split)
// and is not force-unified here.
export { escapeHtml, escapeJson, extractArticle, rewriteLegacyLinks } from './html-utils.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { version } = require('../../../package.json');

// Canonical unpkg URLs every theme.mjs's importmap/<link> points at, kept in
// one place so a future SDK CDN path change is a single-file edit instead of
// a 3-repo grep-and-replace. Pinned to the exact installed package version
// (not @latest) so a consumer site's build serves what it actually built
// against, immune to unpkg's alias-level cache TTL.
export const SDK_CSS_URL = `https://unpkg.com/anentrypoint-design@${version}/dist/247420.css`;
export const SDK_JS_URL = `https://unpkg.com/anentrypoint-design@${version}/dist/247420.js`;
