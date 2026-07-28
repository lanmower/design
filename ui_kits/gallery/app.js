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

// `phase` drives the tiles panel. A gallery is the surface where a blank grid
// is most ambiguous (still loading? nothing uploaded? request failed?), so all
// three readings get distinct, reachable copy instead of one blank box.
const state = { open: null, density: 'comfy', phase: 'ready' };
const PHASES = ['ready', 'loading', 'empty', 'error'];

// Tile-shaped shimmer. Reuses the .ds-skeleton primitive (app-shell/
// loading-alerts.css) inside the existing .ds-tile-grid so the placeholders
// occupy exactly the tracks the real tiles will.
function TilesSkeleton() {
    return h('div', { class: 'ds-tile-grid' + (state.density === 'tight' ? ' ds-tile-grid--tight' : '') },
        ...Array.from({ length: 8 }, (_, i) => h('div', { key: 'sk' + i, class: 'ds-gallery-tile' },
            h('div', { class: 'ds-skeleton ds-skel-title' }),
            h('div', { class: 'ds-skeleton ds-skel-meta' })
        ))
    );
}

function TilesEmpty() {
    return h('div', { class: 'ds-empty-state' },
        h('div', { class: 'ds-empty-state-glyph' }, '[ ]'),
        h('p', { class: 'ds-empty-state-msg' }, 'no tiles in this set'),
        h('p', { class: 'ds-empty-state-hint' }, 'a tile is one tonal card plus a caption. add entries to the items array and they land in this grid at whichever density is selected.')
    );
}

function TilesError() {
    return h('div', { class: 'ds-alert ds-alert-error' },
        h('span', { class: 'ds-alert-icon' }, '!'),
        h('div', { class: 'ds-alert-content' },
            h('div', { class: 'ds-alert-title' }, 'tile set failed to decode'),
            h('div', { class: 'ds-alert-message' }, 'four of the twelve captions came back as malformed utf-8, so the whole set was rejected rather than rendered with holes in it. re-export the set as utf-8 and reload.'),
            h('div', { class: 'ds-alert-retry' },
                h('button', { class: 'btn', onclick: () => { state.phase = 'ready'; kit.render(); } }, 'reload set')
            )
        )
    );
}

function TilesBody() {
    if (state.phase === 'loading') return TilesSkeleton();
    if (state.phase === 'error') return TilesError();
    if (state.phase === 'empty') return TilesEmpty();
    return h('div', { class: 'ds-tile-grid' + (state.density === 'tight' ? ' ds-tile-grid--tight' : '') }, ...items.map(Tile));
}

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
    const close = () => { state.open = null; kit.render(); };
    return h('div', {
        onclick: close,
        onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } },
        tabindex: '-1',
        ref: (el) => { if (el && !el._dsLbFocused) { el._dsLbFocused = true; el.focus(); } },
        class: 'ds-lightbox'
    },
        h('div', { onclick: (e) => e.stopPropagation(), class: 'ds-lightbox-card' },
            h('div', { class: 'ds-lightbox-head' },
                h('span', { class: 'ds-lightbox-tag' }, 'tile · ' + it.id),
                h('button', { class: 'btn', onclick: close }, 'close')
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
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'gallery', right: state.phase === 'ready' ? items.length + ' tiles' : state.phase }),
        side: Side({
            sections: [
                { group: 'density', items: [
                    { glyph: h('span', { class: state.density === 'comfy' ? 'ds-dot ds-dot-on' : 'ds-dot ds-dot-off' }), label: 'comfy', key: 'd1', onClick: (e) => { e.preventDefault(); state.density = 'comfy'; kit.render(); } },
                    { glyph: h('span', { class: state.density === 'tight' ? 'ds-dot ds-dot-on' : 'ds-dot ds-dot-off' }), label: 'tight', key: 'd2', onClick: (e) => { e.preventDefault(); state.density = 'tight'; kit.render(); } }
                ] },
                // Reachable state switcher for the tiles panel.
                { group: 'tile state', items: PHASES.map((p) => ({
                    glyph: h('span', { class: state.phase === p ? 'ds-dot ds-dot-on' : 'ds-dot ds-dot-off' }),
                    label: p, key: 'ph-' + p, active: state.phase === p, href: '#' + p,
                    onClick: (e) => { e.preventDefault(); state.phase = p; kit.render(); }
                })) },
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
                Panel({ title: 'tiles', count: state.phase === 'ready' ? items.length : 0, class: 'ds-panel-gap', children: TilesBody() }),
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
            left: ['gallery', '- ' + (state.phase === 'ready' ? items.length : 0) + ' tiles', '- density=' + state.density, '- ' + state.phase],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '14 Gallery' });

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) { state.open = null; kit.render(); }
});
