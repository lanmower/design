import * as webjsx from 'webjsx';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see aicat/app.js for the measured rationale (200+ serial unbundled
// module requests when every kit pulls the full 30+-submodule barrel).
import { Topbar, Crumb, Status, Side, AppShell, Heading, Chip } from 'ds/components/shell.js';
import { Panel } from 'ds/components/content.js';
import { Carousel } from 'ds/components/carousel.js';
import { Dialog } from 'ds/components/editor-primitives.js';
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

// Specimens, not captions. Each tile shows an actual piece of ascii art at
// display size — the thing a gallery is for. The previous set was twelve
// equal cards whose captions were design-system documentation ("panel-on-panel
// rhythm", "1px panel-2 hairline"), so every tile read at one weight and the
// grid was a lecture wearing a gallery's layout. One of them ("no svgs in
// chrome") had also gone stale — chrome icons are Icon() line SVGs now.
//
// One tone across the whole set. The tiles previously alternated panel-1 /
// panel-2 / panel-3, which produced a checkerboard the reader has to try to
// decode — the tone changed but meant nothing, and because the grid reflows
// to the container (5-up here, 3-up narrower) any index-based tone pattern
// lands differently at every width. With the frame constant the specimen is
// the only thing that varies, which is what a gallery is for.
// The whimsical register here (mascot, seal, spark...) is an intentional,
// documented tone choice for this one demo kit -- a gallery showcasing
// ascii-as-specimen -- not an accidental drift from the system's otherwise
// plain component voice; no repo-wide tone/voice policy exists to conflict
// with it (checked AGENTS.md).
//
// Captions are kept to a consistent 2-3 line, similar-width visual weight so
// no tile reads as a lone glyph adrift in the fixed aspect-ratio box next to
// a dense neighbor (.ds-gallery-tile centers the caption via .ds-tile-cap's
// flex alignment, so a 1-line mark and a 3-line mark occupy the same box at
// very different fill). Each specimen still reads as the thing it's named
// for -- only the padding/framing lines were added or trimmed.
const items = [
    { id: 'a', label: 'the mascot',   caption: '/\\_/\\\n( o.o )\n > ^ <',      tone: 'panel-2', glyph: '(=)' },
    { id: 'b', label: 'the prompt',   caption: '> run\n$ _',                    tone: 'panel-2', glyph: '$' },
    { id: 'c', label: 'the seal',     caption: '(( 247 ))\n(( 420 ))',          tone: 'panel-2', glyph: 'O' },
    { id: 'd', label: 'the arrow',    caption: '- - ->\n---->\n----->',         tone: 'panel-2', glyph: '->' },
    { id: 'e', label: 'the rule',     caption: '---------\n---------',         tone: 'panel-2', glyph: '-' },
    { id: 'f', label: 'the corner',   caption: '+------\n|\n|',                tone: 'panel-2', glyph: '[#]' },
    { id: 'g', label: 'the stack',    caption: '[###]\n [##]\n  [#]',          tone: 'panel-2', glyph: '[]' },
    { id: 'h', label: 'the wave',     caption: '~~~~~~~\n~~~~~~~',              tone: 'panel-2', glyph: '~' },
    { id: 'i', label: 'the target',   caption: '. . .\n.(o).\n. . .',          tone: 'panel-2', glyph: '(o)' },
    { id: 'j', label: 'the ladder',   caption: '|- - -|\n|- - -|',             tone: 'panel-2', glyph: '=' },
    { id: 'k', label: 'the spark',    caption: '\\ | /\n-- * --\n/ | \\',       tone: 'panel-2', glyph: '*' },
    { id: 'l', label: 'the terminus', caption: '[ x ]\n[ x ]',                  tone: 'panel-2', glyph: '[x]' }
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
        // Names the tile by its human label first — without this the accessible
        // name falls back to the button's text content, which reads the raw
        // ascii caption before the label a non-visual user actually needs.
        'aria-label': it.label,
        // custom-property-only inline: carries the per-tile tone, no layout
        style: '--tile-tone:var(--' + it.tone + ')'
    },
        h('div', { class: 'ds-tile-cap', 'aria-hidden': 'true' }, it.caption),
        h('div', { class: 'ds-tile-meta' },
            h('span', { class: 'ds-tile-glyph', 'aria-hidden': 'true' }, it.glyph),
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

// Real Carousel adoption: browsing between tiles inside the lightbox without
// closing and reopening. All 12 items go into the track; the carousel scrolls
// the opened tile into view on open via a ref (Carousel exposes no imperative
// scroll-to-index API, so this reaches its own rendered track element the
// same way editor-primitives/split-panel.js reaches its own root).
function LightboxTile(it) {
    return h('div', { class: 'ds-lightbox-preview', style: '--tile-tone:var(--' + it.tone + ')' },
        h('div', {}, it.caption),
        h('p', { class: 'ds-m0' }, h('strong', {}, it.label))
    );
}

// Lightbox is `Dialog` (editor-primitives/modals.js), not a hand-rolled
// overlay: the previous version had its own scrim/keydown/ref plumbing and
// none of Dialog's role="dialog"/aria-modal, Tab-trap (trapTabKey), or
// focus-restore-to-opener on close, so a keyboard user could Tab out of the
// open lightbox into the topbar/sidebar behind the scrim, and closing it
// dropped focus to <body> instead of back to the tile that opened it.
function Lightbox() {
    if (!state.open) return null;
    const openIndex = items.findIndex((i) => i.id === state.open);
    const close = () => { state.open = null; kit.render(); };
    return Dialog({
        open: true,
        onClose: close,
        dismissible: true,
        ariaLabel: 'tile ' + (openIndex + 1) + ' of ' + items.length,
        children: [
            h('div', { class: 'ds-lightbox-head' },
                h('span', { class: 'ds-lightbox-tag' }, 'tile · ' + (openIndex + 1) + ' of ' + items.length),
                // Dispatches a synthetic Escape on the dialog root rather than
                // calling `close` directly: Dialog's own keydown handler owns
                // the opener-focus-restore (queueMicrotask(() => opener.focus()))
                // built around ITS internal close(), which this button has no
                // access to. Calling the raw `close` callback here bypassed that
                // restore entirely — closing via this button left focus on
                // <body> instead of returning it to the tile that opened the
                // lightbox, while Escape/backdrop-dismiss (which route through
                // Dialog's internal handler) always restored it correctly.
                h('button', {
                    class: 'btn', onclick: (e) => {
                        const dialogEl = e.currentTarget.closest('[role="dialog"]');
                        if (dialogEl) dialogEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                        else close();
                    }
                }, 'close')
            ),
            h('div', {
                class: 'ds-lightbox-card--carousel',
                ref: (el) => {
                    if (!el || el._dsLbScrolled === state.open) return;
                    el._dsLbScrolled = state.open;
                    const track = el.querySelector('.ds-carousel-track');
                    const item = track && track.children[openIndex];
                    if (item) item.scrollIntoView({ inline: 'start', behavior: 'instant' });
                }
            }, Carousel({ items, renderItem: LightboxTile, label: 'gallery tiles' })),
            // Tells the reader how to leave, which is the one thing they need
            // from a lightbox. It previously described its own implementation.
            h('p', { class: 'ds-m0 ds-text-2' }, 'use the carousel arrows to browse tiles, esc or click outside to close.')
        ]
    });
}

function App() {
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'gallery', items: [['index', '../../'], ['source', 'https://github.com/AnEntrypoint/design']] }),
        // Tile count already shows once, in the 'tiles' panel header pill
        // below -- avoid the same number rendered twice on one screen.
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'gallery', right: state.phase === 'ready' ? null : state.phase }),
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
                Panel({ title: 'tiles', count: state.phase === 'ready' ? items.length : 0, class: 'ds-panel-gap', children: TilesBody() }),
                Panel({ title: 'swatches', count: swatchTokens.length, class: 'ds-panel-gap', children:
                    h('div', { class: 'ds-swatch-grid' }, ...swatchTokens.map(Swatch))
                }),
                // Two notes that say something the page does not already show.
                // The third ("density toggle drops min tile size") described a
                // control the reader can just press, and the second claimed the
                // lightbox has "no transitions" while .ds-gallery-tile animates
                // transform and box-shadow on hover.
                Panel({ title: 'about this kit', class: 'ds-panel-gap', children: h('div', { class: 'ds-pattern-notes' },
                    h('p', {}, '· the grid is ', Chip({ tone: 'accent', children: 'auto-fill minmax' }), ' — tiles reflow to the container, never to a breakpoint list.'),
                    h('p', {}, '· the lightbox is the same tonal panel at a larger size, so there is one surface to theme, not two.')
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
