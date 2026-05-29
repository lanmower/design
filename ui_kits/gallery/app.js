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
    { id: 'a', label: 'mascot · cat',      caption: '/\\_/\\\n( o.o )',         tone: 'panel-1', glyph: '◐' },
    { id: 'b', label: 'panel · stack',     caption: 'panel-on-panel rhythm',     tone: 'panel-2', glyph: '◫' },
    { id: 'c', label: 'rail · indicator',  caption: 'color-coded inset',         tone: 'panel-1', glyph: '▰' },
    { id: 'd', label: 'mono · label',      caption: 'all caps · letter-spaced',  tone: 'panel-2', glyph: '§' },
    { id: 'e', label: 'cli · prompt',      caption: '$ ship it',                 tone: 'panel-3', glyph: '◆' },
    { id: 'f', label: 'pill · radius 999', caption: 'sidebar fab tone',          tone: 'panel-1', glyph: '●' },
    { id: 'g', label: 'badge · chip',      caption: 'meta pill, dim/accent',     tone: 'panel-2', glyph: '◇' },
    { id: 'h', label: 'glyph · unicode',   caption: 'no svgs in chrome',         tone: 'panel-1', glyph: '✦' },
    { id: 'i', label: 'manifesto · prose', caption: 'long-form, max 64ch',       tone: 'panel-2', glyph: '¶' },
    { id: 'j', label: 'fade · in',         caption: 'visibility-driven only',    tone: 'panel-3', glyph: '◌' },
    { id: 'k', label: 'rule · divider',    caption: '1px panel-2 hairline',      tone: 'panel-1', glyph: '—' },
    { id: 'l', label: 'stamp · seal',      caption: 'editorial mark',            tone: 'panel-2', glyph: '◯' }
];

const state = { open: null, density: 'comfy' };

function Tile(it) {
    const size = state.density === 'tight' ? '120px' : '160px';
    return h('button', {
        key: it.id,
        onclick: () => { state.open = it.id; kit.render(); },
        style: 'all:unset;cursor:pointer;display:flex;flex-direction:column;gap:6px;background:var(--' + it.tone + ');padding:12px;border-radius:10px;min-height:' + size
    },
        h('div', { style: 'flex:1;display:flex;align-items:center;justify-content:center;font-family:var(--ff-mono);white-space:pre-line;color:var(--panel-text-2);font-size:18px' }, it.caption),
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:12px' },
            h('span', { style: 'font-family:var(--ff-mono);color:var(--panel-text-3)' }, it.glyph),
            h('span', { style: 'color:var(--panel-text)' }, it.label)
        )
    );
}

function Swatch(t) {
    return h('div', { key: t.name, style: 'display:flex;flex-direction:column;gap:6px' },
        h('div', { style: 'height:64px;border-radius:8px;background:var(--' + t.name + ')' }),
        h('div', { style: 'display:flex;justify-content:space-between;font-family:var(--ff-mono);font-size:11px' },
            h('span', { style: 'color:var(--panel-text)' }, t.name),
            h('span', { style: 'color:var(--panel-text-3)' }, t.hint)
        )
    );
}

function Lightbox() {
    if (!state.open) return null;
    const it = items.find((i) => i.id === state.open);
    return h('div', {
        onclick: () => { state.open = null; kit.render(); },
        style: 'position:fixed;inset:0;background:var(--scrim);display:flex;align-items:center;justify-content:center;padding:32px;z-index:50'
    },
        h('div', { onclick: (e) => e.stopPropagation(),
            style: 'background:var(--panel-0);border-radius:14px;padding:28px;min-width:320px;max-width:520px;display:flex;flex-direction:column;gap:14px' },
            h('div', { style: 'display:flex;justify-content:space-between;align-items:center' },
                h('span', { style: 'font-family:var(--ff-mono);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--panel-text-3)' }, 'tile · ' + it.id),
                h('button', { class: 'btn', onclick: () => { state.open = null; kit.render(); } }, 'close')
            ),
            h('div', { style: 'background:var(--' + it.tone + ');padding:36px;border-radius:10px;text-align:center;font-family:var(--ff-mono);white-space:pre-line;font-size:24px' }, it.caption),
            h('p', { style: 'margin:0' }, h('strong', {}, it.label)),
            h('p', { style: 'margin:0;color:var(--panel-text-2)' }, 'this lightbox uses the same tonal panel — no extra components, no shadow. backdrop is fixed inset, click outside dismisses.')
        )
    );
}

function App() {
    const cols = state.density === 'tight' ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))';
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'gallery', items: [['index', '../../'], ['source ->', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'gallery', right: items.length + ' tiles' }),
        side: Side({
            sections: [
                { group: 'density', items: [
                    { glyph: state.density === 'comfy' ? '●' : '○', label: 'comfy', key: 'd1', onClick: (e) => { e.preventDefault(); state.density = 'comfy'; kit.render(); } },
                    { glyph: state.density === 'tight' ? '●' : '○', label: 'tight', key: 'd2', onClick: (e) => { e.preventDefault(); state.density = 'tight'; kit.render(); } }
                ] },
                { group: 'jump', items: [
                    { glyph: '·', label: 'tiles',    key: 'j1', href: '#tiles' },
                    { glyph: '·', label: 'swatches', key: 'j2', href: '#swatches' }
                ] }
            ]
        }),
        main: [
            h('div', { class: 'ds-section', style: 'padding:8px' },
                Heading({ level: 1, children: 'gallery' }),
                Lede({ children: 'visual grid of tonal cards. tiles use the same panel tokens the rest of the system does — no bespoke tile component, no shadows, no borders.' }),
                Panel({ title: 'tiles', count: items.length, style: 'margin:8px 0', children:
                    h('div', { style: 'padding:16px;display:grid;grid-template-columns:' + cols + ';gap:8px' }, ...items.map(Tile))
                }),
                Panel({ title: 'swatches', count: swatchTokens.length, style: 'margin:8px 0', children:
                    h('div', { style: 'padding:16px;display:grid;grid-template-columns:repeat(auto-fill, minmax(160px, 1fr));gap:12px' }, ...swatchTokens.map(Swatch))
                }),
                Panel({ title: 'about this kit', style: 'margin:8px 0', children: h('div', { class: 'ds-pattern-notes' },
                    h('p', {}, '· tiles are tonal panels stacked into a css grid — ', Chip({ tone: 'accent', children: 'auto-fill minmax' }), ' for the responsive default.'),
                    h('p', {}, '· lightbox reuses the panel surface; no extra component, no transitions, no z-stack circus.'),
                    h('p', {}, '· density toggle drops min tile size — same tokens, different rhythm.')
                ) })
            ),
            Lightbox()
        ],
        status: Status({
            left: ['gallery', '• ' + items.length + ' tiles', '• density=' + state.density],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '14 Gallery' });
