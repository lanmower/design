export { escapeHtml, escapeJson, extractArticle, rewriteLegacyLinks } from './html-utils.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { version } = require('../../../package.json');

export const SDK_CSS_URL = `https://unpkg.com/anentrypoint-design@${version}/dist/247420.css`;
export const SDK_JS_URL = `https://unpkg.com/anentrypoint-design@${version}/dist/247420.js`;
