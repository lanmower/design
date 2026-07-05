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
            h('div', { class: 'ds-section ds-section-pad' },
                Panel({ class: 'ds-panel-gap', children: h('div', { class: 'ds-err-hero' },
                    h('div', { class: 'ds-err-numeral' }, '404'),
                    Heading({ level: 1, class: 'ds-m0', children: 'route not found' }),
                    Lede({ children: 'we looked. we asked the cat. there is nothing at this url. probably emerging.' }),
                    path ? h('div', { class: 'ds-err-path' },
                        h('span', { class: 'ds-text-3' }, 'requested'),
                        h('span', {}, path)
                    ) : null,
                    h('div', { class: 'ds-err-actions' },
                        h('a', { href: '../../', class: 'btn btn-primary' }, '<- back to index'),
                        h('a', { href: '../search/', class: 'btn' }, 'search instead'),
                        h('button', { class: 'btn', onclick: () => history.back() }, 'go back')
                    ),
                    h('div', { class: 'ds-err-chips' },
                        Chip({ tone: 'dim', children: 'empty' }),
                        Chip({ tone: 'dim', children: '· status 404' }),
                        Chip({ tone: 'dim', children: '· no body' })
                    )
                ) }),
                Panel({ title: 'try one of these', count: suggestions.length, class: 'ds-panel-gap',
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
