const fs = require('fs'), path = require('path');
const roots = ['ui_kits', 'preview'];
const rows = [];
for (const root of roots) {
  let entries = [];
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (e) { continue; }
  for (const e of entries) {
    const p = e.isDirectory() ? path.join(root, e.name, 'index.html') : path.join(root, e.name);
    if (!p.endsWith('.html') || !fs.existsSync(p)) continue;
    const h = fs.readFileSync(p, 'utf8');
    rows.push({
      page: p.split(path.sep).join('/'),
      h1: /<h1[\s>]/i.test(h),
      skip: /skip-link|skip to main|skip to content/i.test(h),
      main: /<main[\s>]/i.test(h),
      appSurface: /ds-app-surface/.test(h),
      lang: /<html[^>]*\blang=/i.test(h),
    });
  }
}
const short = (r) => r.page.split('/').slice(-2).join('/');
const noH1 = rows.filter(r => !r.h1);
const noSkip = rows.filter(r => !r.skip);
const noMain = rows.filter(r => !r.main);
console.log('pages scanned:', rows.length);
console.log('missing h1   :', noH1.length, noH1.slice(0, 14).map(short).join(' '));
console.log('missing skip :', noSkip.length, noSkip.slice(0, 14).map(short).join(' '));
console.log('missing main :', noMain.length, noMain.slice(0, 12).map(short).join(' '));
console.log('missing lang :', rows.filter(r => !r.lang).length);
