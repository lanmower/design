import * as webjsx from 'webjsx';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const state = { route: 'works', opened: 0 };
const root = document.getElementById('root');

const navItems = [['works','#works'],['writing','#writing'],['manifesto','#manifesto'],['source ->','https://github.com/AnEntrypoint']];

function Topbar() {
    return h('header', { class: 'app-topbar' },
        h('span', { class: 'brand' }, '247420', h('span', { class: 'slash' }, ' / '), 'an entrypoint'),
        h('nav', {}, ...navItems.map(([label, href]) =>
            h('a', {
                key: label,
                href,
                class: state.route === label.replace(' ->','') ? 'active' : '',
                onclick: (e) => { if (!href.startsWith('http')) { e.preventDefault(); state.route = label.replace(' ->',''); render(); } }
            }, label)
        ))
    );
}

function Crumb() {
    return h('div', { class: 'app-crumb' },
        h('span', {}, '247420'), h('span', { class: 'sep' }, '›'),
        h('span', { class: 'leaf' }, state.route)
    );
}

function Hero() {
    return h('div', { style: 'padding:32px 32px 24px 32px' },
        h('h1', { style: 'font-size:36px;font-weight:600;margin:0 0 4px 0;color:var(--panel-text);letter-spacing:-0.01em' },
            'the creative department of the internet.'
        ),
        h('p', { style: 'font-size:14px;line-height:1.55;color:var(--panel-text-2);max-width:64ch;margin:0 0 20px 0' },
            '247420 is a collective of mercurials. we ship fast, break things on purpose, and document honestly. ',
            h('span', { style: 'color:var(--panel-accent);font-weight:500' }, 'humor is load-bearing.')
        ),
        h('div', { class: 'panel', style: 'max-width:560px;margin:0' },
            h('div', { class: 'panel-head' }, h('span', {}, 'currently shipping'), h('span', {}, '3')),
            h('div', { class: 'panel-body' },
                h('div', { class: 'row' },
                    h('span', { class: 'code' }, h('span', { class: 'ds-dot ds-dot-on' })),
                    h('span', { class: 'title' }, 'gm', h('span', { class: 'sub' }, 'state machine v0.4.1')),
                    h('span', { class: 'meta' }, 'live')
                ),
                h('div', { class: 'row' },
                    h('span', { class: 'code' }, h('span', { class: 'ds-dot ds-dot-on' })),
                    h('span', { class: 'title' }, 'zellous', h('span', { class: 'sub' }, 'push-to-talk')),
                    h('span', { class: 'meta' }, 'live')
                ),
                h('div', { class: 'row' },
                    h('span', { class: 'code' }, h('span', { class: 'ds-dot ds-dot-off' })),
                    h('span', { class: 'title' }, 'thebird', h('span', { class: 'sub' }, '—')),
                    h('span', { class: 'meta' }, 'wip')
                )
            )
        )
    );
}

const works = [
    { code:'001', title:'gm', sub:'state machine for coding agents', meta:'2025 · 3k', body:'a tiny deterministic state machine that lets llms code without losing their minds. it thinks so you don\'t have to (as much).' },
    { code:'002', title:'zellous', sub:'production push-to-talk', meta:'2024 · shipped', body:'hold the button. talk. someone on the other side hears you. opus codec, dynamic rooms, 50-message replay.' },
    { code:'003', title:'spoint', sub:'spawnpoint', meta:'2024 · shipped', body:'the directory for "where should we start?" one url, one room, everyone lands in the same place.' },
    { code:'004', title:'flatspace', sub:'flat-file cms', meta:'wip', body:'still figuring out what to say about this one. come back tuesday.' },
    { code:'005', title:'thebird', sub:'—', meta:'wip', body:'yes, the name is a reference. no, we won\'t tell you to what.' },
    { code:'006', title:'mcp-repl', sub:'repl for mcp', meta:'2024 · live', body:'executenodejs, executedeno, executebash, astgrep_search. if you don\'t know what those are, this one isn\'t for you.' },
    { code:'007', title:'mutagen', sub:'adaptogen server', meta:'2024 · live', body:'everything to do with a dapp deg3n. read the source.' },
    { code:'008', title:'techshaman', sub:'member site', meta:'ongoing', body:'the official website for the techshaman. an entrypoint probably emerging.' }
];

function Works() {
    return h('div', { style: 'padding:20px 32px' },
        h('h3', {}, '// works'),
        h('div', { class: 'panel' },
            h('div', { class: 'panel-head' },
                h('span', {}, 'works · 08 of ~61'),
                h('a', { href: 'https://github.com/AnEntrypoint', style: 'color:var(--panel-accent);text-decoration:none' }, 'all repos ->')
            ),
            h('div', { class: 'panel-body' }, ...works.map((w, i) => {
                const isOpen = state.opened === i;
                return h('div', { key: i },
                    h('div', {
                        class: 'row' + (isOpen ? ' active' : ''),
                        onclick: () => { state.opened = isOpen ? null : i; render(); }
                    },
                        h('span', { class: 'code' }, w.code),
                        h('span', { class: 'title' }, w.title, h('span', { class: 'sub' }, w.sub)),
                        h('span', { class: 'meta' }, w.meta + '  ' + (isOpen ? '-' : '+'))
                    ),
                    isOpen ? h('div', { class: 'work-detail' },
                        h('p', { class: 'ds-prose ds-work-body' }, w.body),
                        h('div', { class: 'ds-work-actions' },
                            h('a', { class: 'btn-primary', href: '#' }, 'open ->'),
                            h('a', { class: 'btn', href: '#' }, 'source')
                        )
                    ) : null
                );
            }))
        )
    );
}

function Writing() {
    const posts = [
        { date:'2026.04.14', title:'we were here first', tag:'lore' },
        { date:'2026.03.22', title:'gm v0.4 postmortem, or: why state machines', tag:'gm' },
        { date:'2026.02.09', title:'push-to-talk is a protocol, not a feature', tag:'zellous' },
        { date:'2025.12.11', title:'against the vibe-coded interface', tag:'manifesto' },
        { date:'2025.10.03', title:'notes on shipping weird', tag:'notes' }
    ];
    return h('div', { style: 'padding:20px 32px' },
        h('h3', {}, '// recent writing'),
        h('div', { class: 'panel' },
            h('div', { class: 'panel-body' }, ...posts.map((p, i) =>
                h('a', { key: i, class: 'row', href: '#' },
                    h('span', { class: 'code' }, p.date),
                    h('span', { class: 'title' }, p.title),
                    h('span', { class: 'meta' }, '// ' + p.tag)
                )
            ))
        )
    );
}

function Manifesto() {
    return h('div', { class: 'ds-section ds-manifesto-section' },
        h('h3', {}, '// manifesto · rough draft'),
        h('div', { class: 'ds-prose ds-manifesto' },
            h('p', { class: 'ds-manifesto-para' }, 'we are the creative department of the internet. always open (24/7). always a little bit high on possibility (420).'),
            h('p', { class: 'ds-manifesto-para' }, 'move fast. break things. document honestly. ship the rough draft. ', h('strong', {}, 'humor is load-bearing.')),
            h('p', { class: 'ds-manifesto-para dim' }, 'we will not tolerate simpleton design patterns, trifectas, gradients, or anything silly. nothing lame. we\'re internet natives and not easily pleased.')
        )
    );
}

function Status() {
    return h('footer', { class: 'app-status' },
        h('span', { class: 'item' }, 'main'),
        h('span', { class: 'item' }, '- 8 works'),
        h('span', { class: 'item' }, '- 5 posts'),
        h('span', { class: 'spread' }),
        h('span', { class: 'item' }, 'probably emerging'),
        h('span', { class: 'item' }, h('a', { href: 'https://github.com/AnEntrypoint' }, 'source ->'))
    );
}

function App() {
    return h('div', { class: 'app' },
        Topbar(),
        Crumb(),
        h('div', { class: 'app-body no-side' },
            h('main', { class: 'app-main', style: 'padding:0' },
                Hero(),
                Works(),
                Writing(),
                Manifesto()
            )
        ),
        Status()
    );
}

const kit = mountKit({ root, view: App, screen: '01 Homepage' });
function render() { kit.schedule(); }
