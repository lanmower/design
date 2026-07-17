// generate-sitemap.mjs -- builds sitemap.xml by enumerating the same
// filesystem surfaces the site actually publishes, instead of a hand-listed
// <url> block that silently drifts as ui_kits/preview pages are added or
// removed. Run: node scripts/generate-sitemap.mjs
//
// Same enumeration pattern as generate-preview-index.mjs (directory listing
// is the source of truth, not a maintained list) — extended to cover
// ui_kits/*, slides/, and preview/*.html, the three page kinds that show up
// as <url> entries in the previous hand-maintained sitemap.xml.
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const BASE = 'https://anentrypoint.github.io/design'
const OUT = join(root, 'sitemap.xml')

function isDir(p) {
  try { return statSync(p).isDirectory() } catch { return false }
}
function hasFile(p) {
  try { return statSync(p).isFile() } catch { return false }
}

const urls = []

// Root — the flatspace-built home page.
urls.push({ loc: `${BASE}/`, changefreq: 'weekly', priority: '1.0' })

// ui_kits/* — every subdirectory with an index.html is a published kit page.
const uiKitsDir = join(root, 'ui_kits')
const uiKits = readdirSync(uiKitsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && hasFile(join(uiKitsDir, e.name, 'index.html')))
  .map((e) => e.name)
  .sort()
for (const kit of uiKits) {
  // homepage/project_page are the two flagship kits; keep them at the higher
  // priority tier the previous sitemap gave them, everything else at 0.8
  // (matches the previous docs/blog/chat/aicat tier).
  const priority = (kit === 'homepage' || kit === 'project_page') ? '0.9' : '0.8'
  urls.push({ loc: `${BASE}/ui_kits/${kit}/`, changefreq: 'weekly', priority })
}

// slides/ — the deck template, single published route.
if (hasFile(join(root, 'slides', 'index.html'))) {
  urls.push({ loc: `${BASE}/slides/`, changefreq: 'monthly', priority: '0.6' })
}

// preview/*.html — every component preview except the generated index.
const previewDir = join(root, 'preview')
const previews = readdirSync(previewDir)
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .sort()
for (const f of previews) {
  urls.push({ loc: `${BASE}/preview/${f}`, priority: '0.5' })
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}<priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`

writeFileSync(OUT, xml)
console.log(`[generate-sitemap] wrote sitemap.xml with ${urls.length} urls (1 root, ${uiKits.length} ui_kits, ${hasFile(join(root, 'slides', 'index.html')) ? 1 : 0} slides, ${previews.length} previews)`)
