import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, Side, AppShell, Panel, Heading, Lede, Chip, Btn, ThemeToggle } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const PALETTE = [
    { name: 'paper',     v: 'var(--paper)' },
    { name: 'paper-2',   v: 'var(--paper-2)' },
    { name: 'paper-3',   v: 'var(--paper-3)' },
    { name: 'ink',       v: 'var(--ink)' },
    { name: 'ink-2',     v: 'var(--ink-2)' },
    { name: 'ink-3',     v: 'var(--ink-3)' },
    { name: 'green',     v: 'var(--green)' },
    { name: 'green-2',   v: 'var(--green-2)' },
    { name: 'purple',    v: 'var(--purple)' },
    { name: 'purple-2',  v: 'var(--purple-2)' },
    { name: 'mascot',    v: 'var(--mascot)' },
    { name: 'mascot-2',  v: 'var(--mascot-2)' },
    { name: 'sun',       v: 'var(--sun)' },
    { name: 'flame',     v: 'var(--flame)' },
    { name: 'sky',       v: 'var(--sky)' },
    { name: 'warn',      v: 'var(--warn)' }
];

const SEMANTIC = [
    { name: '--bg',     v: 'var(--bg)' },
    { name: '--bg-2',   v: 'var(--bg-2)' },
    { name: '--bg-3',   v: 'var(--bg-3)' },
    { name: '--fg',     v: 'var(--fg)' },
    { name: '--fg-2',   v: 'var(--fg-2)' },
    { name: '--fg-3',   v: 'var(--fg-3)' },
    { name: '--accent', v: 'var(--accent)' }
];

const TYPE_SCALE = [
    { name: 'mega',  cls: 't-hero', size: 'var(--fs-mega)' },
    { name: 'hero',  cls: 't-hero', size: 'var(--fs-hero)' },
    { name: 'h1',    cls: '',       size: 'var(--fs-h1)' },
    { name: 'h2',    cls: '',       size: 'var(--fs-h2)' },
    { name: 'h3',    cls: '',       size: 'var(--fs-h3)' },
    { name: 'h4',    cls: '',       size: 'var(--fs-h4)' },
    { name: 'lede',  cls: 't-lede', size: 'var(--fs-xl)' },
    { name: 'body',  cls: '',       size: 'var(--fs-body)' },
    { name: 'sm',    cls: '',       size: 'var(--fs-sm)' },
    { name: 'micro', cls: 't-micro', size: 'var(--fs-micro)' }
];

function Swatch(name, v, big) {
    return h('div', { class: 'ds-swatch ds-swatch-col' },
        // custom-property-only inline: carries the swatch tone, no layout
        h('div', { class: 'ds-swatch-chip' + (big ? ' ds-swatch-chip--big' : ''), style: '--swatch:' + v }),
        h('div', { class: 'ds-swatch-name' }, name)
    );
}

function PaletteGrid() {
    return Panel({ title: 'lore palette', class: 'ds-panel-gap', children:
        h('div', { class: 'ds-swatch-grid-sm' },
            ...PALETTE.map(p => Swatch(p.name, p.v, false))
        )
    });
}

function SemanticGrid() {
    return Panel({ title: 'semantic tokens — invert with theme', count: '7', class: 'ds-panel-gap', children:
        h('div', { class: 'ds-swatch-grid-sm ds-swatch-grid-lg' },
            ...SEMANTIC.map(p => Swatch(p.name, p.v, true))
        )
    });
}

function TypeScalePanel() {
    return Panel({ title: 'type scale', class: 'ds-panel-gap', children:
        h('div', { class: 'ds-type-panel' },
            ...TYPE_SCALE.map(t =>
                h('div', { class: 'ds-type-row' },
                    h('span', { class: 'ds-type-row-label' }, t.name),
                    // custom-property-only inline: picks the sampled size token
                    h('div', { class: (t.cls ? t.cls + ' ' : '') + 'ds-type-sample', style: '--sample-size:' + t.size }, 'two-four-seven four-twenty')
                )
            )
        )
    });
}

function PrimitivesPanel() {
    return Panel({ title: 'primitives', class: 'ds-panel-gap', children:
        h('div', { class: 'ds-prim-panel' },
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'chips'),
                Chip({ tone: 'accent', children: 'accent' }),
                Chip({ tone: 'dim',    children: 'dim' }),
                Chip({ tone: '',       children: 'plain' })
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'buttons'),
                Btn({ primary: true, children: 'primary' }),
                Btn({ children: 'default' }),
                Btn({ ghost: true, children: 'ghost' })
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'theme'),
                ThemeToggle(),
                ThemeToggle({ compact: true })
            )
        )
    });
}

function App() {
    return AppShell({
        topbar: Topbar({
            brand: '247420',
            leaf: 'system primer',
            items: [['index', '../../'], ['terminal', '../terminal/']]
        }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'system primer' }),
        side: Side({
            sections: [
                { group: 'sections', items: [
                    { glyph: '-', label: 'palette',    key: 'p' },
                    { glyph: '-', label: 'semantic',   key: 's' },
                    { glyph: '-', label: 'type scale', key: 't' },
                    { glyph: '-', label: 'primitives', key: 'r' }
                ] }
            ]
        }),
        main: [
            h('div', { class: 'ds-section ds-section-pad' },
                h('div', { class: 'ds-kit-head' },
                    h('div', {}, Heading({ level: 1, children: 'system primer' })),
                    ThemeToggle()
                ),
                Lede({ children: 'one page showing palette, semantic tokens, type scale, and primitives. flip the theme toggle — semantic tokens invert, lore palette stays put.' }),
                PaletteGrid(),
                SemanticGrid(),
                TypeScalePanel(),
                PrimitivesPanel()
            )
        ],
        status: Status({
            left: ['system primer', '- ' + PALETTE.length + ' lore colors', '- ' + SEMANTIC.length + ' semantic'],
            right: ['247420 / mmxxvi']
        })
    });
}

mountKit({ root, view: App, screen: '16 System Primer' });
