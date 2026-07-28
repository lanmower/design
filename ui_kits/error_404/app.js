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

// The suggestions panel is this page's one data surface — on a real site it is
// fed by a "did you mean" lookup against the sitemap, which can be slow, come
// back empty, or fail. The page is already the error state for the ROUTE; these
// are the states of the recovery list itself, which is the part that has to
// keep working when the rest of the page has already failed.
const state = { phase: 'ready' };
const PHASES = ['ready', 'loading', 'empty', 'error'];

// Row shimmer. Reuses .ds-event-row-skeleton + .ds-skel* (app-shell/files.css)
// — RowLink is the same code / title / meta rhythm.
function SuggestSkeleton() {
    return h('div', {},
        ...Array.from({ length: 5 }, (_, i) => h('div', { key: 'sk' + i, class: 'ds-event-row-skeleton' },
            h('span', { class: 'ds-skel ds-skel-rank' }),
            h('span', { class: 'ds-skel ds-skel-title' }),
            h('span', { class: 'ds-skel ds-skel-meta' })
        ))
    );
}

function SuggestEmpty() {
    return h('div', { class: 'ds-empty-state' },
        h('div', { class: 'ds-empty-state-glyph' }, '( )'),
        h('p', { class: 'ds-empty-state-msg' }, 'nothing on this site looks like that url'),
        h('p', { class: 'ds-empty-state-hint' }, 'the sitemap has no page with a similar name. the index and search links above still work — search is the better bet when the path was a guess.')
    );
}

function SuggestError() {
    return h('div', { class: 'ds-alert ds-alert-error' },
        h('span', { class: 'ds-alert-icon' }, '!'),
        h('div', { class: 'ds-alert-content' },
            h('div', { class: 'ds-alert-title' }, 'could not look up alternatives'),
            h('div', { class: 'ds-alert-message' }, 'the sitemap this page checks for near-matches is itself missing, so there is nothing to suggest. the back-to-index link above does not depend on it and still works.'),
            h('div', { class: 'ds-alert-retry' },
                h('button', { class: 'btn', onclick: () => { state.phase = 'ready'; kit.render(); } }, 'try lookup again')
            )
        )
    );
}

function SuggestBody() {
    if (state.phase === 'loading') return SuggestSkeleton();
    if (state.phase === 'error') return SuggestError();
    if (state.phase === 'empty') return SuggestEmpty();
    return h('div', {}, ...suggestions.map((s, i) => RowLink({ key: 's' + i, code: s.code, title: s.title, sub: s.sub, meta: s.meta, href: s.href })));
}

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
                        h('button', { class: 'btn', onclick: () => history.back() }, 'go back'),
                        // Cycles the suggestions panel below through its
                        // states so each one is reachable on this page.
                        h('button', { class: 'btn', onclick: () => {
                            state.phase = PHASES[(PHASES.indexOf(state.phase) + 1) % PHASES.length];
                            kit.render();
                        } }, 'suggestions: ' + state.phase)
                    ),
                    h('div', { class: 'ds-err-chips' },
                        Chip({ tone: 'dim', children: 'empty' }),
                        Chip({ tone: 'dim', children: '· status 404' }),
                        Chip({ tone: 'dim', children: '· no body' })
                    )
                ) }),
                Panel({ title: 'try one of these', count: state.phase === 'ready' ? suggestions.length : 0, class: 'ds-panel-gap',
                    children: SuggestBody()
                })
            )
        ],
        status: Status({
            left: ['error', '- 404', '- ' + (path || 'unknown'), '- suggest ' + state.phase],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '13 404' });
