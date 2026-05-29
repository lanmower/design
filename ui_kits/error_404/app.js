import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, AppShell, Panel, Heading, Lede, Chip, RowLink } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const suggestions = [
    { code: '*', title: 'index',         sub: 'design system home',                 href: '../../',                meta: 'open ->' },
    { code: '-', title: 'kits',          sub: 'every ui kit in the portfolio',      href: '../../#kits',           meta: 'jump ->' },
    { code: '//', title: 'previews',      sub: 'every primitive isolated',           href: '../../preview/buttons.html', meta: 'browse ->' },
    { code: 'md',title: 'readme',        sub: 'overview, manifesto, conventions',   href: 'https://github.com/AnEntrypoint/design/blob/main/README.md', meta: 'readme ->' },
    { code: '->', title: 'github',        sub: 'source repo · 247420/anentrypoint',  href: 'https://github.com/AnEntrypoint/design',                     meta: 'source ->' }
];

const path = (typeof location !== 'undefined' && location.search) ? new URLSearchParams(location.search).get('p') : null;

function App() {
    return AppShell({
        narrow: true,
        topbar: Topbar({ brand: '247420', leaf: '404', items: [['index', '../../']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: '404', right: path ? 'requested: ' + path : '' }),
        main: [
            h('div', { class: 'ds-section', style: 'padding:8px' },
                Panel({ style: 'margin:8px 0', children: h('div', { style: 'padding:36px 22px;text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center' },
                    h('div', { style: 'font-family:var(--ff-mono);font-size:120px;line-height:1;color:var(--panel-text-3);letter-spacing:-0.03em' }, '404'),
                    Heading({ level: 1, style: 'margin:0', children: 'route not found' }),
                    Lede({ children: 'we looked. we asked the cat. there is nothing at this url. probably emerging.' }),
                    path ? h('div', { style: 'display:inline-flex;gap:6px;align-items:center;font-family:var(--ff-mono);font-size:13px;color:var(--panel-text-2);background:var(--panel-1);padding:6px 12px;border-radius:8px' },
                        h('span', { style: 'color:var(--panel-text-3)' }, 'requested'),
                        h('span', {}, path)
                    ) : null,
                    h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:6px' },
                        h('a', { href: '../../', class: 'btn btn-primary' }, '<- back to index'),
                        h('a', { href: '../search/', class: 'btn' }, 'search instead'),
                        h('button', { class: 'btn', onclick: () => history.back() }, 'go back')
                    ),
                    h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:4px' },
                        Chip({ tone: 'dim', children: 'empty' }),
                        Chip({ tone: 'dim', children: '· status 404' }),
                        Chip({ tone: 'dim', children: '· no body' })
                    )
                ) }),
                Panel({ title: 'try one of these', count: suggestions.length, style: 'margin:8px 0',
                    children: suggestions.map((s, i) => RowLink({ key: 's' + i, code: s.code, title: s.title, sub: s.sub, meta: s.meta, href: s.href }))
                })
            )
        ],
        status: Status({
            left: ['error', '- 404', '- ' + (path || 'unknown')],
            right: ['247420 / mmxxvi']
        })
    });
}

mountKit({ root, view: App, screen: '13 404' });
