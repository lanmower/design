#!/usr/bin/env node
// generate-ui-kit-scaffolds.mjs -- regenerates the index.html shell for every
// "thin" kit under ui_kits/ from ui_kits/_template/index.html + the per-kit
// config in ui_kits/kits.config.mjs.
//
// "Thin" kits are the ones whose index.html is nothing but: the standard
// <head> (theme-color metas + data-theme, colors_and_type.css + app-shell.css
// [+ 0-1 extra sheets], an importmap, optional SEO extras) wrapping an empty
// `<div id="root"></div>` mount consumed by ./app.js. 16 of the 20 ui_kits/
// directories fit this shape as of the audit that produced this script
// (2026-07-16): aicat, error_404, gallery, search, settings, slide_deck,
// system_primer, terminal, chat, gm_inspector, dashboard, signin, homepage,
// project_page, file_browser, community.
//
// The other 5 (blog, docs, community-app, workspace, os) have genuinely
// custom index.html markup -- hand-authored bodies or bespoke stylesheet/
// theme wiring -- and are deliberately NOT in kits.config.mjs, so this script
// never touches them.
//
// Run: node scripts/generate-ui-kit-scaffolds.mjs
// Add --check to verify the working tree already matches generated output
// (exits 1 on drift) instead of writing -- useful as a CI/lint gate.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kits } from '../ui_kits/kits.config.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
// .tmpl, not .html: this file is a build input full of unsubstituted {{VAR}}
// placeholders and a <script src="./app.js"> pointing at a file that does not
// exist in _template. As index.html it was served at 200 alongside the real
// kits, rendering raw "{{TITLE}} / 247420" text and 404-ing its own script —
// a broken page sitting among the reference implementations. The extension is
// what keeps it un-servable while it stays the source this generator reads.
const templatePath = join(root, 'ui_kits/_template/index.html.tmpl');

// Normalize CRLF -> LF on read. This repo's working tree checks files out
// with CRLF (core.autocrlf=true on this Windows checkout) while git's blobs
// -- and every string literal in this script -- are LF. Comparing/splicing
// against a CRLF-read string silently fails to match (an og-block splice
// dropped a whole block the first time this bit us), so every read in this
// script normalizes first; output is written as LF and left to git/checkout
// to re-normalize, matching how every other tracked text file here behaves.
function readNormalized(path) {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

const template = readNormalized(templatePath);

const CHECK = process.argv.includes('--check');

function seoBlock(kit) {
  const seo = kit.seo;
  if (!seo) return '';
  const title = titleFor(kit);
  const canonical = `https://anentrypoint.github.io/design/ui_kits/${kit.id}/`;
  const lines = [];
  if (seo.author) lines.push(`  <meta name="author" content="${seo.author}">`);
  if (seo.keywords) lines.push(`  <meta name="keywords" content="${seo.keywords}">`);
  // author/keywords land before <link rel="canonical"> (handled by caller
  // splitting pre/post blocks); og:*/twitter:*/robots land after the favicon
  // <link rel="icon"> and before the stylesheets -- see postIconBlock below.
  return lines.length ? lines.join('\n') + '\n' : '';
}

function postIconBlock(kit) {
  const seo = kit.seo;
  if (!seo) return '';
  const title = titleFor(kit);
  const canonical = `https://anentrypoint.github.io/design/ui_kits/${kit.id}/`;
  const lines = [];
  lines.push(`  <meta property="og:type" content="website">`);
  lines.push(`  <meta property="og:title" content="${title}">`);
  lines.push(`  <meta property="og:description" content="${kit.description}">`);
  lines.push(`  <meta property="og:url" content="${canonical}">`);
  lines.push(`  <meta property="og:site_name" content="247420 / design">`);
  // og-card.png has never existed in this repo -- seo.ogImage used to emit
  // og:image/twitter:image tags pointing at it unconditionally, so every
  // social share of these 2 kits rendered with a 404 card image. Dropped
  // the image-specific tags until a real asset exists; og:locale moved out
  // from under the dead `if` so it still ships.
  lines.push(`  <meta property="og:locale" content="en_US">`);
  if (seo.twitter) {
    lines.push(`  <meta name="twitter:card" content="summary">`);
    lines.push(`  <meta name="twitter:title" content="${title}">`);
    lines.push(`  <meta name="twitter:description" content="${kit.description}">`);
    lines.push(`  <meta name="twitter:site" content="@AnEntrypoint">`);
  }
  lines.push(`  <meta name="robots" content="index, follow">`);
  return lines.join('\n') + '\n';
}

function titleFor(kit) {
  return kit.titleSuffixed ? `${kit.title} 247420` : `${kit.title} / 247420`;
}

function render(kit) {
  const title = titleFor(kit);
  const htmlThemeAttr = kit.htmlTheme ? ' data-theme="auto"' : '';
  const themeColorMetas = kit.themeColorMetas
    ? '  <meta name="theme-color" content="#247420" media="(prefers-color-scheme: light)">\n  <meta name="theme-color" content="#3A9A34" media="(prefers-color-scheme: dark)">\n'
    : '';

  // Kits carrying a full SEO block (og:*/twitter:*/robots) have an extra
  // blank line between the stylesheets and the importmap script in the
  // original hand-authored files; plain thin kits don't. Preserve that so
  // regenerated output is byte-identical.
  const stylesheetLines = [
    '  <link rel="stylesheet" href="../../colors_and_type.css">',
    '  <link rel="stylesheet" href="../../app-shell.css">',
    ...kit.stylesheets.map(s => `  <link rel="stylesheet" href="../../${s}">`),
  ];
  const stylesheets = stylesheetLines.join('\n') + (kit.seo ? '\n' : '');

  const importExtra = kit.importExtra.length
    ? ',\n' + kit.importExtra.map(s => `  "${s}": "${s === 'ds/' ? '../../src/' : '../../vendor/webjsx-router.js'}"`).join(',\n')
    : '';

  // seoMetas (author/keywords) go before <link rel="canonical">; ogBlock
  // (og:*/twitter:*/robots) goes after <link rel="icon"> and before the
  // stylesheets. The template only exposes one {{SEO_METAS}} slot ahead of
  // canonical, so the post-icon block is spliced in after render below.
  const seoMetas = seoBlock(kit);

  let html = template
    .replaceAll('{{KIT_ID}}', kit.id)
    .replaceAll('{{TITLE}}', kit.titleSuffixed ? kit.title.replace(/ \·?$/, '') : kit.title)
    .replaceAll('{{DESCRIPTION}}', kit.description)
    .replaceAll('{{SCREEN_LABEL}}', kit.screenLabel)
    .replace('{{HTML_THEME_ATTR}}', htmlThemeAttr)
    .replace('{{THEME_COLOR_METAS}}', themeColorMetas)
    .replace('{{SEO_METAS}}', seoMetas)
    .replace('{{STYLESHEETS}}', stylesheets)
    .replace('{{IMPORTMAP_EXTRA}}', importExtra);

  // kit.titleSuffixed (project_page) already includes the trailing "247420"
  // in its literal title text ("project / gm ·"), so {{TITLE}} substitution
  // above must NOT also get " / 247420" appended by the template's literal
  // "{{TITLE}} / 247420" text. Handle that one case directly.
  if (kit.titleSuffixed) {
    html = html.replace(`<title>${kit.title.replace(/ \·?$/, '')} / 247420</title>`, `<title>${kit.title} 247420</title>`);
  }

  // Splice the og:*/twitter:*/robots block in after the favicon <link>, only
  // for kits that carry one (file_browser, homepage, project_page).
  const ogBlock = postIconBlock(kit);
  if (ogBlock) {
    html = html.replace(
      '  <link rel="icon" type="image/svg+xml" href="../../favicon.svg">\n',
      `  <link rel="icon" type="image/svg+xml" href="../../favicon.svg">\n${ogBlock}`
    );
  }

  return html;
}

let drift = 0;
for (const kit of kits) {
  const outPath = join(root, 'ui_kits', kit.id, 'index.html');
  const rendered = render(kit);
  if (CHECK) {
    const current = readNormalized(outPath);
    if (current !== rendered) {
      console.error(`[generate-ui-kit-scaffolds] DRIFT: ui_kits/${kit.id}/index.html does not match generated output`);
      drift++;
    }
    continue;
  }
  writeFileSync(outPath, rendered);
  console.log(`[generate-ui-kit-scaffolds] wrote ui_kits/${kit.id}/index.html`);
}

if (CHECK) {
  if (drift) {
    console.error(`[generate-ui-kit-scaffolds] ${drift} kit(s) drifted from template -- run 'node scripts/generate-ui-kit-scaffolds.mjs' to regenerate`);
    process.exit(1);
  }
  console.log(`[generate-ui-kit-scaffolds] all ${kits.length} thin kits match generated output`);
} else {
  console.log(`[generate-ui-kit-scaffolds] regenerated ${kits.length} thin kit shells`);
}
