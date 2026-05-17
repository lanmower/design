// Static-site page HTML renderer. Consumes structured page YAML
// (hero/sections/examples/body) and emits a complete <!doctype html>
// scaffold with rail-coloured sections and SDK styles loaded from unpkg.
// Used by 247420-flavoured doc sites (e.g. flatspace consumers).

const RAILS = ['rail-green', 'rail-purple', 'rail-mascot', 'rail-sun', 'rail-flame', 'rail-sky'];
const DOTS = ['green', 'purple', 'mascot', 'sun', 'flame', 'sky'];

export function escape(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function inlineMd(s) {
    return s
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

export function renderMarkdown(md) {
    const lines = String(md || '').split('\n');
    const out = [];
    let inCode = false, inList = false;
    for (const line of lines) {
        if (line.startsWith('```')) { if (inCode) { out.push('</pre>'); inCode = false; } else { out.push('<pre>'); inCode = true; } continue; }
        if (inCode) { out.push(escape(line)); continue; }
        if (line.startsWith('# ')) out.push(`<h1>${escape(line.slice(2))}</h1>`);
        else if (line.startsWith('## ')) out.push(`<h2>${escape(line.slice(3))}</h2>`);
        else if (line.startsWith('### ')) out.push(`<h3>${escape(line.slice(4))}</h3>`);
        else if (line.startsWith('- ')) { if (!inList) { out.push('<ul>'); inList = true; } out.push(`<li>${inlineMd(escape(line.slice(2)))}</li>`); }
        else { if (inList) { out.push('</ul>'); inList = false; } if (line.trim()) out.push(`<p>${inlineMd(escape(line))}</p>`); }
    }
    if (inList) out.push('</ul>');
    if (inCode) out.push('</pre>');
    return out.join('\n');
}

function heroBlock(hero, title) {
    if (!hero) return '';
    const badges = Array.isArray(hero.badges) && hero.badges.length
        ? `<div class="ds-hero-badges">${hero.badges.map(b => `<span class="chip"><strong>${escape(b.label || '')}</strong>${b.desc ? `<span class="dim"> ${escape(b.desc)}</span>` : ''}</span>`).join(' ')}</div>` : '';
    const ctas = Array.isArray(hero.ctas) && hero.ctas.length
        ? `<div class="ds-hero-ctas">${hero.ctas.map((c, i) => `<a class="${i === 0 ? 'btn-primary' : 'btn'}" href="${escape(c.href || '#')}">${escape(c.label || c.cta || 'go')}</a>`).join('')}</div>` : '';
    return `<div class="ds-hero">
  <h1 class="ds-hero-title">${escape(hero.heading || hero.title || title)}</h1>
  ${hero.subheading ? `<p class="ds-hero-body">${escape(hero.subheading)}${hero.accent ? ` <span class="ds-hero-accent">${escape(hero.accent)}</span>` : ''}</p>` : ''}
  ${hero.body ? `<p class="ds-hero-body">${escape(hero.body)}</p>` : ''}
  ${badges}
  ${ctas}
</div>`;
}

function sectionBlocks(sections) {
    return (Array.isArray(sections) ? sections : []).map((sec, idx) => {
        const rail = RAILS[idx % RAILS.length];
        const dot = DOTS[idx % DOTS.length];
        const items = (sec.features || sec.items || []).map((f) => {
            const benefit = f.benefit ? `<div class="row-benefit">${escape(f.benefit)}</div>` : '';
            return `<div class="row ${rail}">
  <span class="dot dot-${dot}" aria-hidden="true"></span>
  <span class="title">${escape(f.name)}</span>
  ${f.desc ? `<div class="sub">${inlineMd(escape(f.desc))}</div>` : ''}
  ${benefit}
</div>`;
        }).join('\n');
        const lede = sec.lede || (sec.body && sec.body.length < 240 ? sec.body : '');
        return `<section class="ds-section ${rail}" id="${escape(sec.id || '')}">
  <h2 class="ds-section-title">${escape(sec.name || sec.title || sec.id)}</h2>
  ${lede ? `<p class="ds-lede">${escape(lede)}</p>` : ''}
  ${items}
  ${sec.body && sec.body.length >= 240 ? renderMarkdown(sec.body) : ''}
</section>`;
    }).join('\n');
}

function examplesBlock(examples) {
    if (!Array.isArray(examples) || !examples.length) return '';
    return `<section class="ds-section">
  <h2 class="ds-section-title">explore</h2>
  ${examples.map((e, i) => {
        const rail = RAILS[(i + 1) % RAILS.length];
        return `<a class="row ${rail}" href="${escape(e.href || '#')}">
  <span class="code">${String(i + 1).padStart(2, '0')}</span>
  <span class="title">${escape(e.label || e.name || e.href)}</span>
  ${e.desc ? `<span class="meta dim"> — ${escape(e.desc)}</span>` : ''}
  <span class="ds-row-arrow">↗</span>
</a>`;
    }).join('\n')}
</section>`;
}

export function renderPageHtml({ title = '247420', slug = 'index', hero, sections, examples, body, navItems = [], siteName = '247420', theme = 'auto', cssHref, headExtra = '' } = {}) {
    const main = heroBlock(hero, title) + sectionBlocks(sections) + examplesBlock(examples)
        + (body ? `<section class="ds-section page-body">${renderMarkdown(body)}</section>` : '');
    const cssLink = cssHref
        ? `<link rel="stylesheet" href="${cssHref}">`
        : `<link rel="stylesheet" href="https://unpkg.com/anentrypoint-design@latest/dist/247420.css">`;
    return `<!doctype html>
<html lang="en" class="ds-247420" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} — ${escape(siteName)}</title>
${cssLink}
<script type="importmap">
{ "imports": { "anentrypoint-design": "https://unpkg.com/anentrypoint-design@latest/dist/247420.js" } }
</script>
<style>
.app-stage { max-width: 1100px; margin: 0 auto; padding: 24px }
.page-body h1 { margin-top: 0 } .page-body h2 { margin-top: 32px } .page-body h3 { margin-top: 24px }
.page-body pre { margin: 12px 0; background: var(--panel-2); padding: 12px; border-radius: 8px; overflow-x: auto }
</style>
${headExtra}
</head>
<body>
<div id="app"></div>
<script type="module">
import { mount, components as C } from 'anentrypoint-design';
const navItems = ${JSON.stringify(navItems)};
mount(document.getElementById('app'), () => C.AppShell({
  topbar: C.Topbar({ brand: ${JSON.stringify(siteName)}, items: navItems, active: ${JSON.stringify(title)} }),
  crumb: C.Crumb({ leaf: ${JSON.stringify(title)} }),
  main: C.h('div', { class: 'app-stage', innerHTML: ${JSON.stringify(main)} }),
  status: C.Status({ left: [${JSON.stringify(siteName.toLowerCase())}, ${JSON.stringify(slug)}], right: ['live'] })
}));
</script>
</body>
</html>`;
}
