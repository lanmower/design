import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, Side, AppShell, Panel, Heading, Lede, Chip } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const swatchTokens = [
    { name: 'panel-0',     hint: 'paper · root surface' },
    { name: 'panel-1',     hint: 'one shade up · panel bg' },
    { name: 'panel-2',     hint: 'two shades up · row bg' },
    { name: 'panel-3',     hint: 'three shades up · header strip' },
    { name: 'panel-accent',hint: 'green ink · primary cta' },
    { name: 'panel-select',hint: 'mint hover/select tone' }
];

const items = [
    { id: 'a', label: 'mascot · cat',      caption: '/\\_/\\\n( o.o )',         tone: 'panel-1', glyph: '(=)' },
    { id: 'b', label: 'panel · stack',     caption: 'panel-on-panel rhythm',     tone: 'panel-2', glyph: '[#]' },
    { id: 'c', label: 'rail · indicator',  caption: 'color-coded inset',         tone: 'panel-1', glyph: '|' },
    { id: 'd', label: 'mono · label',      caption: 'all caps · letter-spaced',  tone: 'panel-2', glyph: 'Aa' },
    { id: 'e', label: 'cli · prompt',      caption: '$ ship it',                 tone: 'panel-3', glyph: '$' },
    { id: 'f', label: 'pill · radius 999', caption: 'sidebar fab tone',          tone: 'panel-1', glyph: '(o)' },
    { id: 'g', label: 'badge · chip',      caption: 'meta pill, dim/accent',     tone: 'panel-2', glyph: '<>' },
    { id: 'h', label: 'glyph · unicode',   caption: 'no svgs in chrome',         tone: 'panel-1', glyph: '*' },
    { id: 'i', label: 'manifesto · prose', caption: 'long-form, max 64ch',       tone: 'panel-2', glyph: '¶' },
    { id: 'j', label: 'fade · in',         caption: 'visibility-driven only',    tone: 'panel-3', glyph: '.' },
    { id: 'k', label: 'rule · divider',    caption: '1px panel-2 hairline',      tone: 'panel-1', glyph: '—' },
    { id: 'l', label: 'stamp · seal',      caption: 'editorial mark',            tone: 'panel-2', glyph: 'O' }
];

const state = { open: null, density: 'comfy' };

function Tile(it) {
    return h('button', {
        key: it.id,
        onclick: () => { state.open = it.id; kit.render(); },
        class: 'ds-gallery-tile' + (state.density === 'tight' ? ' ds-gallery-tile--tight' : ''),
        // custom-property-only inline: carries the per-tile tone, no layout
        style: '--tile-tone:var(--' + it.tone + ')'
    },
        h('div', { class: 'ds-tile-cap' }, it.caption),
        h('div', { class: 'ds-tile-meta' },
            h('span', { class: 'ds-tile-glyph' }, it.glyph),
            h('span', { class: 'ds-tile-label' }, it.label)
        )
    );
}

function Swatch(t) {
    return h('div', { key: t.name, class: 'ds-swatch-col' },
        // custom-property-only inline: carries the per-swatch tone, no layout
        h('div', { class: 'ds-gal-swatch', style: '--swatch:var(--' + t.name + ')' }),
        h('div', { class: 'ds-gal-swatch-meta' },
            h('span', { class: 'ds-gal-swatch-name' }, t.name),
            h('span', { class: 'ds-gal-swatch-hint' }, t.hint)
        )
    );
}

function Lightbox() {
    if (!state.open) return null;
    const it = items.find((i) => i.id === state.open);
    return h('div', {
        onclick: () => { state.open = null; kit.render(); },
        class: 'ds-lightbox'
    },
        h('div', { onclick: (e) => e.stopPropagation(), class: 'ds-lightbox-card' },
            h('div', { class: 'ds-lightbox-head' },
                h('span', { class: 'ds-lightbox-tag' }, 'tile · ' + it.id),
                h('button', { class: 'btn', onclick: () => { state.open = null; kit.render(); } }, 'close')
            ),
            h('div', { class: 'ds-lightbox-preview', style: '--tile-tone:var(--' + it.tone + ')' }, it.caption),
            h('p', { class: 'ds-m0' }, h('strong', {}, it.label)),
            h('p', { class: 'ds-m0 ds-text-2' }, 'this lightbox uses the same tonal panel — no extra components, no shadow. backdrop is fixed inset, click outside dismisses.')
        )
    );
}

function App() {
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'gallery', items: [['index', '../../'], ['source ->', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'gallery', right: items.length + ' tiles' }),
        side: Side({
            sections: [
                { group: 'density', items: [
                    { glyph: h('span', { class: state.density === 'comfy' ? 'ds-dot ds-dot-on' : 'ds-dot ds-dot-off' }), label: 'comfy', key: 'd1', onClick: (e) => { e.preventDefault(); state.density = 'comfy'; kit.render(); } },
                    { glyph: h('span', { class: state.density === 'tight' ? 'ds-dot ds-dot-on' : 'ds-dot ds-dot-off' }), label: 'tight', key: 'd2', onClick: (e) => { e.preventDefault(); state.density = 'tight'; kit.render(); } }
                ] },
                { group: 'jump', items: [
                    { glyph: '·', label: 'tiles',    key: 'j1', href: '#tiles' },
                    { glyph: '·', label: 'swatches', key: 'j2', href: '#swatches' }
                ] }
            ]
        }),
        main: [
            h('div', { class: 'ds-section ds-section-pad' },
                Heading({ level: 1, children: 'gallery' }),
                Lede({ children: 'visual grid of tonal cards. tiles use the same panel tokens the rest of the system does — no bespoke tile component, no shadows, no borders.' }),
                Panel({ title: 'tiles', count: items.length, class: 'ds-panel-gap', children:
                    h('div', { class: 'ds-tile-grid' + (state.density === 'tight' ? ' ds-tile-grid--tight' : '') }, ...items.map(Tile))
                }),
                Panel({ title: 'swatches', count: swatchTokens.length, class: 'ds-panel-gap', children:
                    h('div', { class: 'ds-swatch-grid' }, ...swatchTokens.map(Swatch))
                }),
                Panel({ title: 'about this kit', class: 'ds-panel-gap', children: h('div', { class: 'ds-pattern-notes' },
                    h('p', {}, '· tiles are tonal panels stacked into a css grid — ', Chip({ tone: 'accent', children: 'auto-fill minmax' }), ' for the responsive default.'),
                    h('p', {}, '· lightbox reuses the panel surface; no extra component, no transitions, no z-stack circus.'),
                    h('p', {}, '· density toggle drops min tile size — same tokens, different rhythm.')
                ) })
            ),
            Lightbox()
        ],
        status: Status({
            left: ['gallery', '- ' + items.length + ' tiles', '- density=' + state.density],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '14 Gallery' });

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) { state.open = null; kit.render(); }
});
