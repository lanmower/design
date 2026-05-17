// Server-side / static rendering helper. Generates a full HTML document
// using the SDK scope and the prefixed CSS bundle.

const SCOPE = 'ds-247420';

export function renderPageHtml({ title = '247420', body = '', headExtra = '', theme = 'light', cssHref } = {}) {
    const cssLink = cssHref
        ? `<link rel="stylesheet" href="${cssHref}">`
        : `<link rel="stylesheet" href="https://unpkg.com/anentrypoint-design@latest/dist/247420.css">`;
    return `<!doctype html>
<html lang="en" class="${SCOPE}" data-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${cssLink}
  ${headExtra}
</head>
<body>
  <div id="app">${body}</div>
</body>
</html>`;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
