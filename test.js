#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 4173;
const ROOT = path.resolve('.');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.pdf':'application/pdf', '.json':'application/json' };

function bootServer() {
    return new Promise((resolve) => {
        const srv = http.createServer((req, res) => {
            try {
                let p = decodeURIComponent(req.url.split('?')[0]);
                if (p.endsWith('/')) p += 'index.html';
                const fp = path.join(ROOT, p);
                const data = fs.readFileSync(fp);
                res.setHeader('Content-Type', MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(data);
            } catch (e) { res.statusCode = 404; res.end(String(e.message)); }
        });
        srv.listen(PORT, '127.0.0.1', () => resolve(srv));
    });
}

let failures = 0;
const log = (ok, name, detail) => {
    process.stdout.write((ok ? '\x1b[32m✓\x1b[0m ' : '\x1b[31m✗\x1b[0m ') + name + (detail ? '  ' + detail : '') + '\n');
    if (!ok) failures += 1;
};
const eq = (name, a, b) => log(a === b, name, a === b ? '' : `expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`);
const ge = (name, a, b) => log(a >= b, name, a >= b ? `(${a})` : `expected >=${b} got ${a}`);
const ok = (name, v) => log(!!v, name);

async function probe(url, evalFn) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('fetch ' + url + ' ' + r.status);
    return r.status;
}

async function runBrowser() {
    let pw;
    try { pw = await import('playwright'); }
    catch { console.log('  (skip browser group — playwright not in node_modules)'); return; }
    const browser = await pw.chromium.launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

    await page.goto(`http://127.0.0.1:${PORT}/ui_kits/chat/`, { waitUntil: 'load' });
    await page.waitForSelector('.chat-msg', { timeout: 6000 });
    await page.waitForTimeout(2200);
    const chat = await page.evaluate(() => ({
        msgs: document.querySelectorAll('.chat-msg').length,
        bubble: document.querySelectorAll('.chat-bubble').length,
        md: document.querySelectorAll('.chat-md').length,
        mdH2: document.querySelectorAll('.chat-md h2').length,
        mdLi: document.querySelectorAll('.chat-md ul li').length,
        code: document.querySelectorAll('.chat-code').length,
        tokens: document.querySelectorAll('.chat-code pre code .token').length,
        image: document.querySelectorAll('.chat-image').length,
        pdf: document.querySelectorAll('.chat-pdf').length,
        file: document.querySelectorAll('.chat-file').length,
        link: document.querySelectorAll('.chat-link').length,
        rxn: document.querySelectorAll('.chat-reactions .rxn').length,
        debug: window.__debug ? window.__debug.list() : [],
        chatSnap: window.__debug ? window.__debug.snapshot('chat') : null,
        mdSnap: window.__debug ? window.__debug.snapshot('markdown') : null,
        hlSnap: window.__debug ? window.__debug.snapshot('highlight') : null
    }));
    eq('chat: kit loads', 1, 1);
    ge('chat: messages rendered',     chat.msgs, 8);
    ge('chat: bubbles',                chat.bubble, 5);
    ge('chat: markdown blocks',        chat.md, 1);
    ge('chat: marked produced h2',     chat.mdH2, 1);
    ge('chat: marked produced bullets',chat.mdLi, 3);
    ge('chat: code attachment',        chat.code, 1);
    ge('chat: prism tokens',           chat.tokens, 10);
    ge('chat: image attachment',       chat.image, 1);
    ge('chat: pdf attachment',         chat.pdf, 1);
    ge('chat: file attachment',        chat.file, 1);
    ge('chat: link attachment',        chat.link, 1);
    ge('chat: reactions',              chat.rxn, 3);
    ge('debug: subsystem count',       chat.debug.length, 4);
    ok('debug: chat snapshot',         chat.chatSnap && chat.chatSnap.messages > 0);
    ok('debug: marked loaded',         chat.mdSnap && chat.mdSnap.loaded.marked);
    ok('debug: dompurify loaded',      chat.mdSnap && chat.mdSnap.loaded.dompurify);
    ok('debug: prism loaded',          chat.hlSnap && chat.hlSnap.loaded);

    await page.goto(`http://127.0.0.1:${PORT}/ui_kits/aicat/`, { waitUntil: 'load' });
    await page.waitForSelector('.chat-msg', { timeout: 6000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__aicat.send('show python prime sieve'));
    await page.waitForTimeout(1700);
    const aicat = await page.evaluate(() => ({
        codeTokens: document.querySelectorAll('.chat-code pre code .token').length
    }));
    ge('aicat: python prism tokens',   aicat.codeTokens, 10);

    const xss = await page.evaluate(async () => {
        const s = window.__aicat.state;
        s.messages.push({ who: 'them', name: 'aicat', parts: [{ kind: 'md', text: '<script>window.__pwn=1<\/script>**hi** [link](javascript:alert(1)) <img src=x onerror=alert(2)>' }] });
        window.__aicat.render();
        await new Promise(r => setTimeout(r, 1500));
        return {
            scripts: document.querySelectorAll('.chat-thread script').length,
            pwn: !!window.__pwn,
            jsLink: [...document.querySelectorAll('.chat-thread a')].some(a => /^javascript:/i.test(a.getAttribute('href') || '')),
            onErr: [...document.querySelectorAll('.chat-thread img')].some(i => i.hasAttribute('onerror'))
        };
    });
    eq('xss: <script> stripped',       xss.scripts, 0);
    eq('xss: window.__pwn unset',      xss.pwn, false);
    eq('xss: javascript: stripped',    xss.jsLink, false);
    eq('xss: onerror stripped',        xss.onErr, false);

    const wc = await page.evaluate(async () => {
        const el = document.createElement('ds-chat');
        el.setAttribute('title', 'wctest');
        el.messages = [{ who: 'them', text: 'wc-hi', name: 'x' }];
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 200));
        let received = null;
        el.addEventListener('send', (e) => { received = e.detail.text; });
        const ta = el.querySelector('textarea');
        ta.value = 'go'; ta.dispatchEvent(new Event('input', { bubbles: true }));
        el.querySelector('.send').click();
        return { defined: !!customElements.get('ds-chat'), msgs: el.querySelectorAll('.chat-msg').length, received };
    });
    eq('ds-chat: defined',              wc.defined, true);
    eq('ds-chat: rendered messages',    wc.msgs, 1);
    eq('ds-chat: send event',           wc.received, 'go');

    await page.goto(`http://127.0.0.1:${PORT}/slides/`, { waitUntil: 'load' });
    await page.waitForSelector('deck-stage', { timeout: 6000 });
    await page.waitForTimeout(600);
    const deck = await page.evaluate(() => {
        const ds = document.querySelector('deck-stage');
        return { slides: ds.length, index: ds.index, hasOverlay: !!ds.shadowRoot.querySelector('.overlay') };
    });
    ge('slides: count',                 deck.slides, 4);
    eq('slides: starts at 0',           deck.index, 0);
    eq('slides: shadow overlay',        deck.hasOverlay, true);

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
    const idx = await page.evaluate(() => ({
        chatRow: !!document.querySelector('a.list-row[href="./ui_kits/chat/"]'),
        aicatRow: !!document.querySelector('a.list-row[href="./ui_kits/aicat/"]')
    }));
    eq('index: chat row',               idx.chatRow, true);
    eq('index: aicat row',              idx.aicatRow, true);

    await page.goto(`http://127.0.0.1:${PORT}/ui_kits/file_browser/`, { waitUntil: 'load' });
    await page.waitForSelector('.ds-file-row', { timeout: 6000 });
    const fb = await page.evaluate(() => ({
        rows: document.querySelectorAll('.ds-file-row').length,
        types: new Set([...document.querySelectorAll('.ds-file-row')].map(r => r.getAttribute('data-file-type'))).size,
        dz: !!document.querySelector('.ds-dropzone'),
        tb: !!document.querySelector('.ds-file-toolbar'),
        cr: !!document.querySelector('.ds-crumb-path')
    }));
    ge('file_browser: rows',  fb.rows, 6);
    ge('file_browser: types', fb.types, 6);
    ok('file_browser: dropzone+toolbar+crumb', fb.dz && fb.tb && fb.cr);

    eq('console errors clean',          errors.filter(e => !/x:1.*404|404.*\/x\b/.test(e)).length, 0);

    await browser.close();
}

const srv = await bootServer();
try {
    eq('http: chat 200',  await probe(`http://127.0.0.1:${PORT}/ui_kits/chat/`),  200);
    eq('http: aicat 200', await probe(`http://127.0.0.1:${PORT}/ui_kits/aicat/`), 200);
    eq('http: slides 200',await probe(`http://127.0.0.1:${PORT}/slides/`),        200);
    eq('http: index 200', await probe(`http://127.0.0.1:${PORT}/`),               200);
    eq('http: file_browser 200', await probe(`http://127.0.0.1:${PORT}/ui_kits/file_browser/`), 200);
    const distJs = fs.readFileSync(path.join(ROOT, 'dist/247420.js'), 'utf8');
    const distCss = fs.readFileSync(path.join(ROOT, 'dist/247420.css'), 'utf8');
    ok('dist: FileRow exported',     distJs.includes('FileRow'));
    ok('dist: FileGrid exported',    distJs.includes('FileGrid'));
    ok('dist: DropZone exported',    distJs.includes('DropZone'));
    ok('dist: FileViewer exported',  distJs.includes('FileViewer'));
    ok('dist: ds-file-row scoped',   distCss.includes('.ds-247420 .ds-file-row'));
    await runBrowser();
} finally {
    srv.close();
}

if (failures) { console.log('\n\x1b[31m' + failures + ' failure(s)\x1b[0m'); process.exit(1); }
console.log('\n\x1b[32mall green\x1b[0m');
