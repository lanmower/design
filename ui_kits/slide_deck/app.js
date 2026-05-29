import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, Side, AppShell, Heading, Lede, Chip, ThemeToggle } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const slides = [
    {
        kind: 'title',
        eyebrow: '247420 · mmxxvi',
        title: 'the deck',
        sub: 'a 16:9 slide template built from the SDK chrome.',
        accent: 'green'
    },
    {
        kind: 'lede',
        eyebrow: '01',
        title: 'one tool, one font, one rhythm.',
        body: 'space grotesk for prose, jetbrains mono for tokens. nothing else. the rhythm is 8pt all the way down.'
    },
    {
        kind: 'bullets',
        eyebrow: '02',
        title: 'three modes for theme',
        items: [
            ['auto',  'follow the OS — re-renders live when you flip dark mode'],
            ['paper', 'force light — for daylight, demos, projection screens'],
            ['ink',   'force dark — for night, low-light reads, oled']
        ]
    },
    {
        kind: 'quote',
        eyebrow: '03',
        body: '"the surface should never lie about what the program is doing."',
        cite: '— 247420 design principle'
    },
    {
        kind: 'split',
        eyebrow: '04',
        title: 'usable terminals are instant.',
        left: 'output appears the moment it exists. no reveal animation, no typewriter — the user is waiting on real work.',
        right: 'showcase terminals can play a loop. they are clearly labelled "demo" and pause on prefers-reduced-motion.'
    },
    {
        kind: 'title',
        eyebrow: 'fin',
        title: 'two-four-seven · four-twenty',
        sub: 'always open, always a little high.',
        accent: 'mascot'
    }
];

const state = { i: 0 };

function Slide(s) {
    const accentVar = s.accent ? `var(--${s.accent})` : 'var(--accent)';
    const eyebrow = h('div', {
        style: 'font-family:var(--ff-mono);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--fg-3);margin-bottom:24px'
    }, s.eyebrow || '');

    if (s.kind === 'title') {
        return h('div', { style: 'display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:24px' },
            eyebrow,
            h('div', { style: `font-size:var(--fs-hero);line-height:var(--lh-tight);color:${accentVar};letter-spacing:var(--tr-tight);font-weight:600` }, s.title),
            s.sub ? h('div', { class: 't-lede' }, s.sub) : null
        );
    }
    if (s.kind === 'lede') {
        return h('div', { style: 'display:flex;flex-direction:column;justify-content:center;gap:18px;max-width:38ch' },
            eyebrow,
            h('div', { style: 'font-size:var(--fs-h1);line-height:var(--lh-snug);color:var(--fg);font-weight:500' }, s.title),
            h('div', { class: 't-lede' }, s.body)
        );
    }
    if (s.kind === 'bullets') {
        return h('div', { style: 'display:flex;flex-direction:column;justify-content:center;gap:18px' },
            eyebrow,
            h('div', { style: 'font-size:var(--fs-h1);line-height:var(--lh-snug);color:var(--fg);font-weight:500;margin-bottom:12px' }, s.title),
            ...s.items.map(([k, v]) =>
                h('div', { style: 'display:flex;gap:18px;align-items:baseline;border-bottom:1px solid var(--rule);padding:12px 0' },
                    h('span', { style: `flex:0 0 100px;font-family:var(--ff-mono);font-size:var(--fs-sm);color:${accentVar}` }, k),
                    h('span', { style: 'color:var(--fg-2);font-size:var(--fs-lg)' }, v)
                )
            )
        );
    }
    if (s.kind === 'quote') {
        return h('div', { style: 'display:flex;flex-direction:column;justify-content:center;gap:18px;max-width:42ch' },
            eyebrow,
            h('div', { style: 'font-size:var(--fs-h2);line-height:var(--lh-snug);color:var(--fg);font-weight:400;font-style:italic' }, s.body),
            h('div', { style: 'font-family:var(--ff-mono);font-size:var(--fs-sm);color:var(--fg-3)' }, s.cite)
        );
    }
    if (s.kind === 'split') {
        return h('div', { style: 'display:flex;flex-direction:column;justify-content:center;gap:24px' },
            eyebrow,
            h('div', { style: 'font-size:var(--fs-h1);line-height:var(--lh-snug);color:var(--fg);font-weight:500' }, s.title),
            h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:12px' },
                h('div', { style: 'padding:18px;background:var(--bg-2);border-radius:14px;color:var(--fg-2);font-size:var(--fs-lg);line-height:var(--lh-base)' }, s.left),
                h('div', { style: `padding:18px;background:var(--bg-2);border-radius:14px;color:var(--fg-2);font-size:var(--fs-lg);line-height:var(--lh-base);border-left:3px solid ${accentVar}` }, s.right)
            )
        );
    }
    return null;
}

function Stage() {
    const s = slides[state.i];
    return h('div', {
        class: 'ds-deck-stage',
        style: 'aspect-ratio:16/9;width:100%;max-width:1100px;margin:24px auto;background:var(--bg-2);border-radius:18px;padding:64px;box-sizing:border-box;display:flex;'
    }, h('div', { style: 'flex:1;display:flex' }, Slide(s)));
}

function Controls() {
    return h('div', { style: 'display:flex;align-items:center;justify-content:center;gap:14px;padding:8px;font-family:var(--ff-mono);font-size:var(--fs-sm)' },
        h('button', {
            class: 'btn',
            onclick: () => { if (state.i > 0) { state.i--; kit.render(); } }
        }, '<- prev'),
        h('span', { style: 'color:var(--fg-3)' }, (state.i + 1) + ' / ' + slides.length),
        h('button', {
            class: 'btn',
            onclick: () => { if (state.i < slides.length - 1) { state.i++; kit.render(); } }
        }, 'next ->')
    );
}

function App() {
    return AppShell({
        topbar: Topbar({
            brand: '247420',
            leaf: 'slide deck',
            items: [['index', '../../'], ['system primer', '../system_primer/']]
        }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'slide deck' }),
        side: Side({
            sections: [
                { group: 'slides', items: slides.map((s, i) => ({
                    glyph: i === state.i ? '*' : '-',
                    label: (i + 1) + ' · ' + (s.title || s.eyebrow || s.kind),
                    key: 's' + i
                })) }
            ]
        }),
        main: [
            h('div', { class: 'ds-section', style: 'padding:8px' },
                h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap' },
                    h('div', {}, Heading({ level: 1, children: 'slide deck' })),
                    ThemeToggle()
                ),
                Lede({ children: '16:9 stage, keyboard arrow keys for nav, six slide kinds: title / lede / bullets / quote / split / fin.' }),
                Stage(),
                Controls()
            )
        ],
        status: Status({
            left: ['slide deck', '- slide ' + (state.i + 1) + '/' + slides.length, '- </> to nav'],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '17 Slide Deck' });

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        if (state.i < slides.length - 1) { state.i++; kit.render(); e.preventDefault(); }
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (state.i > 0) { state.i--; kit.render(); e.preventDefault(); }
    } else if (e.key === 'Home') { state.i = 0; kit.render(); }
    else if (e.key === 'End') { state.i = slides.length - 1; kit.render(); }
});
