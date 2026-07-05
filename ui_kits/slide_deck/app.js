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
    // custom-property-only inline: carries the per-slide accent tone, no layout
    const accentStyle = s.accent ? `--slide-accent:var(--${s.accent})` : '';
    const eyebrow = h('div', { class: 'ds-slide-eyebrow' }, s.eyebrow || '');

    if (s.kind === 'title') {
        return h('div', { class: 'ds-slide-col ds-slide-col--start', style: accentStyle },
            eyebrow,
            h('div', { class: 'ds-slide-hero' }, s.title),
            s.sub ? h('div', { class: 't-lede' }, s.sub) : null
        );
    }
    if (s.kind === 'lede') {
        return h('div', { class: 'ds-slide-col ds-slide-col--narrow', style: accentStyle },
            eyebrow,
            h('div', { class: 'ds-slide-h1' }, s.title),
            h('div', { class: 't-lede' }, s.body)
        );
    }
    if (s.kind === 'bullets') {
        return h('div', { class: 'ds-slide-col', style: accentStyle },
            eyebrow,
            h('div', { class: 'ds-slide-h1 ds-slide-h1--lead' }, s.title),
            ...s.items.map(([k, v]) =>
                h('div', { class: 'ds-slide-bullet' },
                    h('span', { class: 'ds-slide-bullet-key' }, k),
                    h('span', { class: 'ds-slide-bullet-val' }, v)
                )
            )
        );
    }
    if (s.kind === 'quote') {
        return h('div', { class: 'ds-slide-col ds-slide-col--quote', style: accentStyle },
            eyebrow,
            h('div', { class: 'ds-slide-quote-body' }, s.body),
            h('div', { class: 'ds-slide-cite' }, s.cite)
        );
    }
    if (s.kind === 'split') {
        return h('div', { class: 'ds-slide-col', style: accentStyle },
            eyebrow,
            h('div', { class: 'ds-slide-h1' }, s.title),
            h('div', { class: 'ds-slide-split' },
                h('div', { class: 'ds-slide-split-cell' }, s.left),
                h('div', { class: 'ds-slide-split-cell ds-slide-split-cell--accent' }, s.right)
            )
        );
    }
    return null;
}

let touchX = null;

function Stage() {
    const s = slides[state.i];
    return h('div', {
        class: 'ds-deck-stage',
        ontouchstart: (e) => { touchX = e.touches[0].clientX; },
        ontouchend: (e) => {
            if (touchX == null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            touchX = null;
            if (dx < -40 && state.i < slides.length - 1) { state.i++; kit.render(); }
            else if (dx > 40 && state.i > 0) { state.i--; kit.render(); }
        }
    }, h('div', { class: 'ds-deck-slide' }, Slide(s)));
}

function Controls() {
    return h('div', { class: 'ds-deck-controls' },
        h('button', {
            class: 'btn',
            onclick: () => { if (state.i > 0) { state.i--; kit.render(); } }
        }, '<- prev'),
        h('span', { class: 'ds-deck-count' }, (state.i + 1) + ' / ' + slides.length),
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
            h('div', { class: 'ds-section ds-section-pad' },
                h('div', { class: 'ds-kit-head' },
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
