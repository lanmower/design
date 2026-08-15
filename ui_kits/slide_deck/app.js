import * as webjsx from 'webjsx';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see aicat/app.js for the measured rationale (200+ serial unbundled
// module requests when every kit pulls the full 30+-submodule barrel).
import { Topbar, Crumb, Status, Side, AppShell } from 'ds/components/shell.js';
import { PageHeader } from 'ds/components/content.js';
import { ThemeToggle } from 'ds/components/theme-toggle.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

// No slide sets `accent`. It fed `--slide-accent`, which the stylesheet reads
// as a `color:` on .ds-slide-hero and .ds-slide-bullet-key — so passing a raw
// lore fill ('green', 'mascot') put a background tone into a text slot, the
// exact --accent vs --accent-ink split AGENTS.md warns about, and rendered the
// title slides in a muted mid-green against near-black. Unset, both rules fall
// through to their `var(--accent-ink)` default, which is the readable tone and
// inverts correctly with the theme.
//
// Eyebrows here are reserved for the two slides that are a DIFFERENT KIND of
// slide from the body of the deck: the opening masthead and the closing marker.
// The interior slides deliberately carry none. Their eyebrows were the bare
// numbers 01-04, which is a position indicator, not a category label — and the
// deck already shows position twice (the `ds-deck-count` "n / 6" readout and
// the numbered sidebar list), so a third copy named nothing new. If you add a
// slide, it gets no eyebrow unless it genuinely names a new section.
const slides = [
    {
        kind: 'title',
        eyebrow: '247420 · mmxxvi',
        title: 'the deck',
        sub: 'a 16:9 slide template built from the SDK chrome.'
    },
    {
        kind: 'lede',
        title: 'no fonts to load.',
        body: 'display, narrow and body all resolve to system-ui; mono resolves to the platform ui-monospace. nothing is fetched, so nothing reflows. the rhythm is 8pt all the way down.'
    },
    {
        kind: 'bullets',
        title: 'three modes for theme',
        items: [
            ['auto',  'follow the OS — re-renders live when you flip dark mode'],
            ['paper', 'force light — for daylight, demos, projection screens'],
            ['ink',   'force dark — for night, low-light reads, oled']
        ]
    },
    {
        kind: 'quote',
        body: '"the surface should never lie about what the program is doing."',
        cite: '— 247420 design principle'
    },
    {
        kind: 'split',
        title: 'usable terminals are instant.',
        left: 'output appears the moment it exists. no reveal animation, no typewriter — the user is waiting on real work.',
        right: 'showcase terminals can play a loop. they are clearly labelled "demo" and pause on prefers-reduced-motion.'
    },
    {
        kind: 'title',
        eyebrow: 'fin',
        title: 'two-four-seven · four-twenty',
        sub: 'always open, always a little high.'
    }
];

const state = { i: 0 };

function Slide(s) {
    // custom-property-only inline: carries the per-slide accent tone, no layout
    const accentStyle = s.accent ? `--slide-accent:var(--${s.accent})` : '';
    // null, not an empty div — an empty .ds-slide-eyebrow still paints its
    // margin-bottom, leaving an unexplained gap above the eyebrow-less slides.
    const eyebrow = s.eyebrow ? h('div', { class: 'ds-slide-eyebrow' }, s.eyebrow) : null;

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

function Progress() {
    return h('div', { class: 'ds-deck-progress', role: 'tablist', 'aria-label': 'slide progress' },
        ...slides.map((s, i) => h('span', {
            key: 'dot' + i,
            class: 'ds-deck-dot' + (i === state.i ? ' ds-deck-dot--active' : ''),
            role: 'tab',
            'aria-selected': i === state.i ? 'true' : 'false',
            'aria-label': 'slide ' + (i + 1) + ' of ' + slides.length
        }))
    );
}

function Controls() {
    // Disabled at the ends rather than silently no-op: a button that looks
    // live and does nothing when pressed reads as a broken deck, not as "you
    // are on the last slide".
    const atStart = state.i === 0;
    const atEnd = state.i === slides.length - 1;
    return h('div', { class: 'ds-deck-controls' },
        h('button', {
            class: 'btn', disabled: atStart, 'aria-disabled': atStart ? 'true' : null,
            onclick: () => { if (state.i > 0) { state.i--; kit.render(); } }
        }, 'prev'),
        h('span', { class: 'ds-deck-count' }, (state.i + 1) + ' / ' + slides.length),
        h('button', {
            class: 'btn', disabled: atEnd, 'aria-disabled': atEnd ? 'true' : null,
            onclick: () => { if (state.i < slides.length - 1) { state.i++; kit.render(); } }
        }, 'next')
    );
}

function App() {
    return AppShell({
        topbar: Topbar({
            brand: '247420',
            leaf: 'slide deck',
            items: [['index', '../../'], ['system primer', '../system_primer/']],
            // This kit renders its own ThemeToggle in the PageHeader below —
            // without this, both it and the Topbar's default toggle render,
            // stacking two identical "theme: auto" pills.
            themeToggle: false
        }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'slide deck' }),
        side: Side({
            sections: [
                // The slide list IS this deck's navigation — every entry jumps
                // to its slide. It was previously a static readout, which left
                // the only way to reach slide 5 as four presses of `next`.
                { group: 'slides', items: slides.map((s, i) => ({
                    glyph: i === state.i ? '*' : '-',
                    label: (i + 1) + ' · ' + (s.title || s.eyebrow || s.kind),
                    key: 's' + i,
                    active: i === state.i,
                    href: '#slide-' + (i + 1),
                    onClick: (e) => { e.preventDefault(); state.i = i; kit.render(); }
                })) }
            ]
        }),
        main: [
            // Dense page header, not a display H1 over a lede: the stage below
            // is the content, and a full-scale kit title above it made the
            // page's chrome read heavier than the slide it frames.
            PageHeader({
                dense: true,
                title: 'slide deck',
                lede: '16:9 stage · arrow keys, space and home/end navigate · six slide kinds',
                right: ThemeToggle({ compact: true })
            }),
            h('div', { class: 'ds-section ds-section-pad' },
                Stage(),
                Progress(),
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
