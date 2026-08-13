// generate-preview-index.mjs -- builds preview/index.html, a discovery page
// listing every preview/*.html demo with its title, so previews (the de
// facto component docs) don't require reading the directory to discover.
// Run: node scripts/generate-preview-index.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const previewDir = join(root, 'preview')

const files = readdirSync(previewDir)
  .filter(f => f.endsWith('.html') && f !== 'index.html')
  .sort()

// Other demo surfaces that live outside preview/ (slides/, ui_kits/) and are
// not part of the generated preview/*.html scan above. D5 (the merged
// gallery across preview/ui_kits/slides) hasn't landed yet -- it needs
// scripts/generate-ui-kit-scaffolds.mjs, which doesn't exist -- so this is an
// interim link-out from the existing preview index rather than a real merge:
// one more click to reach slides/index.html instead of a separate, undiscoverable
// demo surface. Remove this block once D5's real merged gallery subsumes it.
const EXTRA_LINKS = [
  { href: '../slides/index.html', label: 'slides deck (external demo surface)' },
]

function titleFor(file) {
  const src = readFileSync(join(previewDir, file), 'utf8')
  const m = src.match(/ds-demo-label[^>]*>([^<]+)</)
  if (m) return m[1].trim()
  const t = src.match(/<title>([^<]+)<\/title>/)
  if (t) return t[1].trim()
  return file.replace(/\.html$/, '').replace(/-/g, ' ')
}

const rows = files.map(f => {
  const title = titleFor(f)
  return `      <li><a href="./${f}">${title}</a></li>`
}).join('\n')

const extraRows = EXTRA_LINKS.map(({ href, label }) => `      <li><a href="${href}">${label}</a></li>`).join('\n')

const html = `<!doctype html>
<html lang="en" data-theme="auto" class="ds-247420"><head><meta charset="utf-8">
<title>247420 -- component preview index</title>
<link rel="stylesheet" href="../colors_and_type.css">
<link rel="stylesheet" href="../app-shell.css">
<style>body{padding:var(--space-4);background:var(--panel-0);color:var(--panel-text);max-width:640px;margin:0 auto}
ul{list-style:none;padding:0;margin:0}
li{padding:var(--space-2) 0;border-bottom:1px solid var(--panel-2)}
/* --accent-ink, never --panel-accent. The bare lead accent is a FILL: it
   measures 1.07:1 against paper, so every link on this page was effectively
   invisible in the light theme. --accent-ink is the readable text tone of the
   same accent (8.85:1 on paper, and the bright lime itself on ink). This is
   the exact split AGENTS.md documents, and this page was violating it on the
   SDK's own front door. */
a{color:var(--accent-ink);text-decoration:none;font-family:var(--ff-ui,var(--ff-body))}
a:hover{text-decoration:underline}
h1{font-size:var(--fs-h2);margin:var(--space-2) 0 var(--space-1)}
h2{font-size:var(--fs-h4);margin:var(--space-5) 0 var(--space-2);color:var(--fg-2)}
.idx-lede{color:var(--fg-2);margin:0 0 var(--space-4)}
/* Page-local rather than extending .ds-demo-label, which other demo pages
   share and which deliberately carries only size/weight/margin. This is the
   mono kicker treatment that used to sit in an inline style attribute here. */
.idx-kicker{font-family:var(--ff-mono);text-transform:uppercase;letter-spacing:var(--tr-label);color:var(--fg-3);font-size:var(--fs-tiny)}
</style>
</head><body>
<div class="ds-demo-label idx-kicker">247420 / preview index</div>
<h1>component previews</h1>
<p class="idx-lede">Every component specimen in the design system. Each page renders one primitive in isolation so you can see it, measure it, and copy its markup.</p>
<ul>
${rows}
</ul>
<h2>other demo surfaces</h2>
<ul>
${extraRows}
</ul>
</body></html>
`

writeFileSync(join(previewDir, 'index.html'), html)
console.log(`[generate-preview-index] wrote preview/index.html listing ${files.length} previews`)
