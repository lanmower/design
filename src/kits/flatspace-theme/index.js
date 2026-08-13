export { escapeHtml, escapeJson, extractArticle, rewriteLegacyLinks } from './html-utils.js';

// raw.githack.com, not jsDelivr: jsDelivr caches a GitHub @main branch
// reference for up to 12h regardless of purge — see scripts/build.mjs.
export const SDK_CSS_URL = `https://raw.githack.com/AnEntrypoint/design/main/dist/247420.css`;
export const SDK_JS_URL = `https://raw.githack.com/AnEntrypoint/design/main/dist/247420.js`;
