// dynamic-accent ui kit — swatches proving src/theme/dynamic-accent.js's
// HCT tone-locked per-server accent generation holds AA contrast across a
// spread of representative source hues, in both light and dark. This is
// what makes `npm run a11y` actually exercise the dynamic-accent module
// (a scoped inline-style override, never a global token rewrite) instead of
// it going unchecked the way a prior full-palette restyle once did.
import * as webjsx from 'webjsx';
import { Topbar, Crumb, Heading, Lede, Status, AppShell } from 'ds/components/shell.js';
import { Panel } from 'ds/components/content.js';
import { mountKit } from 'ds/bootstrap.js';
import { dynamicAccentStyleVars } from 'ds/theme/dynamic-accent.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

// Representative source hues: the design accent, primary/secondary/tertiary
// RGB extremes, and a low-chroma gray -- the same spread used to verify
// contrast in the module's own dev check.
const SOURCES = [
    { label: 'design accent', hex: '#a5d6ff' },
    { label: 'red', hex: '#ff0000' },
    { label: 'green', hex: '#00ff00' },
    { label: 'blue', hex: '#0000ff' },
    { label: 'yellow', hex: '#ffff00' },
    { label: 'magenta', hex: '#ff00ff' },
    { label: 'cyan', hex: '#00ffff' },
    { label: 'gray (low chroma)', hex: '#808080' },
];

function Swatch(source, dark) {
    const vars = dynamicAccentStyleVars(source.hex, dark);
    const style = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
    return h('div', { class: 'ds-dyn-swatch', style },
        h('div', {
            class: 'ds-dyn-swatch-primary',
            style: 'background:var(--dyn-accent);color:var(--dyn-accent-fg)'
        }, `${source.label} — primary / on-primary`),
        h('div', {
            class: 'ds-dyn-swatch-container',
            style: 'background:var(--dyn-accent-container);color:var(--dyn-accent-container-fg)'
        }, `${source.label} — container / on-container`),
        h('div', { class: 'ds-hint-sm' }, `source ${source.hex}`)
    );
}

function SwatchGrid(dark) {
    return Panel({
        title: dark ? 'dark tones' : 'light tones', children:
            h('div', { class: 'ds-dyn-grid' }, ...SOURCES.map(s => Swatch(s, dark)))
    });
}

function App() {
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'dynamic accent', items: [['index', '../../'], ['source', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'dynamic accent' }),
        main: [
            h('div', { class: 'ds-app-surface ds-section-pad' },
                Heading({ level: 1, children: 'dynamic accent' }),
                Lede({ children: 'HCT hue+chroma extracted from a source color, rendered at fixed M3-role tones so contrast holds regardless of the source. Additive to --accent/--accent-ink; never a global token rewrite — see src/theme/dynamic-accent.js.' }),
                SwatchGrid(false),
                SwatchGrid(true)
            )
        ],
        status: Status({ left: ['dynamic accent', '- 8 source hues', '- light + dark'], right: ['247420 / mmxxvi'] })
    });
}

mountKit({ root, view: App, screen: 'Dynamic Accent' });
