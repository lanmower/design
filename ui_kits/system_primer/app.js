import * as webjsx from 'webjsx';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see aicat/app.js for the measured rationale (200+ serial unbundled
// module requests when every kit pulls the full 30+-submodule barrel). This
// kit is the primer/showcase for the whole system so it legitimately touches
// many submodules -- the point is each import still names its real owner
// instead of routing everything through the all-encompassing barrel.
import { Topbar, Crumb, Status, Side, AppShell, Chip, Btn } from 'ds/components/shell.js';
import { Panel, PageHeader, InputOTP } from 'ds/components/content.js';
import { ThemeToggle } from 'ds/components/theme-toggle.js';
import { Slider } from 'ds/components/slider.js';
import { Progress } from 'ds/components/data-density.js';
import { HoverCard, Menubar } from 'ds/components/overlay-primitives.js';
import { DatePicker, formatDate, DateRangePicker } from 'ds/components/calendar.js';
import { Carousel } from 'ds/components/carousel.js';
import { AspectRatio } from 'ds/components/editor-primitives.js';
import { LiveCursorOverlay, RemoteSelectionRings, RecentEditHighlightFlash, AgentPresenceChip, PresenceBar } from 'ds/components/collab.js';
import { ContextMeter, ContextTreemap, ContextXRayPanel } from 'ds/components/context-pane.js';
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
    return Panel({ id: 'palette', title: 'lore palette', count: PALETTE.length + ' colors', class: 'ds-panel-gap', children: [
        h('p', { class: 'ds-panel-caption' }, 'fixed brand colors — the same hex in light and dark theme.'),
        h('div', { class: 'ds-swatch-grid-sm' },
            ...PALETTE.map(p => Swatch(p.name, p.v, false))
        )
    ] });
}

function SemanticGrid() {
    // count reads off the array — it was the hardcoded string '7', which would
    // have silently gone stale the first time a token was added or removed.
    return Panel({ id: 'semantic', title: 'semantic tokens', count: SEMANTIC.length + ' tokens', class: 'ds-panel-gap', children: [
        h('p', { class: 'ds-panel-caption' }, 'contextual roles — same name, different color per theme; these invert on toggle while the lore palette above holds.'),
        h('div', { class: 'ds-swatch-grid-sm ds-swatch-grid-lg' },
            ...SEMANTIC.map(p => Swatch(p.name, p.v, true))
        )
    ] });
}

function TypeScalePanel() {
    return Panel({ id: 'type-scale', title: 'type scale', count: TYPE_SCALE.length + ' steps', class: 'ds-panel-gap', children:
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

// The three button specimens are the only controls on this reference page that
// look pressable, so pressing one has to do something. Each reports which
// variant was last pressed, which is the one fact a primer's button row can
// truthfully demonstrate — the alternative was three buttons that swallow every
// click, on the page whose whole job is showing how controls behave.
const primState = { pressed: null };

// Same interactive-demonstration standard as primState above, for the 2026
// restyle's new primitives (Calendar/DatePicker/Slider/InputOTP/HoverCard):
// each control is genuinely wired to state and re-renders on change, not a
// static screenshot of the component.
const restyleState = {
    sliderValue: 40,
    otpValue: '',
    otpComplete: null,
    datePickerValue: null,
    datePickerOpen: false,
    hoverCardOpen: false,
};

// The remaining backfilled primitives. Same live-wired standard: every control
// that looks interactive owns real state and re-renders on change. The three
// collab-ui overlays and the context-pane trio are DATA-driven rather than
// input-driven, so their specimens supply representative fixture data — the
// honest demonstration for a component whose input is a remote peer's cursor
// position or a token accounting breakdown, neither of which a primer page can
// manufacture by being clicked.
const moreState = {
    rangeValue: { from: null, to: null },
    rangeOpen: false,
    menuOpenIndex: null,
    menuPicked: null,
    xrayOpenId: null,
};

// Scroll-spy: the sidebar is the only nav on this single-continuous-scroll
// page, so it must reflect which of the 6 sections is actually in view —
// otherwise every row looks equally (in)active no matter how far you've
// scrolled. IntersectionObserver over each panel id, re-render on change.
const NAV_SECTION_IDS = ['palette', 'semantic', 'type-scale', 'primitives', 'restyle', 'backfill'];
const navState = { activeId: NAV_SECTION_IDS[0] };

function observeSections() {
    const observer = new IntersectionObserver((entries) => {
        // Pick the entry closest to the top of the viewport among those
        // currently intersecting, so scrolling past a short section doesn't
        // leave the sidebar pointing at a section no longer on screen.
        const visible = entries.filter(e => e.isIntersecting);
        if (!visible.length) return;
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const nextId = visible[0].target.id;
        if (nextId !== navState.activeId) {
            navState.activeId = nextId;
            kit.render();
        }
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
    NAV_SECTION_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    });
}

const COLLAB_USERS = [
    { userId: 'u1', label: 'ana',    color: 'var(--purple)', status: 'active' },
    { userId: 'u2', label: 'blake',  color: 'var(--green)',  status: 'idle' },
    { userId: 'u3', label: 'agent',  color: 'var(--mascot)', status: 'active' },
];

// `value` (not `tokens`) and a `tone` class suffix are the real field names
// ContextMeter/ContextTreemap/ContextXRayPanel all read — a `tokens` key renders
// zero-width bars and an empty treemap rather than erroring, so it has to match.
const CONTEXT_SEGMENTS = [
    { id: 'sys',   label: 'system',    value: 1840, tone: 'system' },
    { id: 'files', label: 'files',     value: 7320, tone: 'files' },
    { id: 'chat',  label: 'chat',      value: 4210, tone: 'chat' },
    { id: 'tools', label: 'tool defs', value: 1130, tone: 'other' },
];

function PrimitivesPanel() {
    return Panel({ id: 'primitives', title: 'primitives', class: 'ds-panel-gap', children:
        h('div', { class: 'ds-prim-panel' },
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'chips'),
                Chip({ tone: 'accent', children: 'accent' }),
                Chip({ tone: 'dim',    children: 'dim' }),
                Chip({ tone: '',       children: 'plain' })
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'buttons'),
                Btn({ primary: true, children: 'primary', onClick: () => { primState.pressed = 'primary'; kit.render(); } }),
                Btn({ children: 'default', onClick: () => { primState.pressed = 'default'; kit.render(); } }),
                Btn({ ghost: true, children: 'ghost', onClick: () => { primState.pressed = 'ghost'; kit.render(); } }),
                h('span', { class: 'ds-prim-label ds-prim-label-status' },
                    primState.pressed ? 'last pressed: ' + primState.pressed : 'none pressed yet')
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'theme'),
                ThemeToggle(),
                ThemeToggle({ compact: true })
            )
        )
    });
}

// New primitives added in the 2026 webjsx-toolkit-look restyle. Live-wired
// (not static screenshots), same standard as PrimitivesPanel above.
function RestylePanel() {
    return Panel({ id: 'restyle', title: 'restyle 2026 — new primitives', class: 'ds-panel-gap', children:
        h('div', { class: 'ds-prim-panel' },
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'slider'),
                Slider({
                    value: restyleState.sliderValue, min: 0, max: 100,
                    onChange: (v) => { restyleState.sliderValue = v; kit.render(); },
                    label: 'demo slider',
                }),
                h('span', { class: 'ds-prim-label' }, String(restyleState.sliderValue))
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'progress'),
                Progress({ value: restyleState.sliderValue, max: 100, label: 'demo progress' })
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'otp input'),
                InputOTP({
                    length: 6, value: restyleState.otpValue,
                    onChange: (v) => { restyleState.otpValue = v; kit.render(); },
                    onComplete: (v) => { restyleState.otpComplete = v; kit.render(); },
                    label: 'demo code',
                }),
                h('span', { class: 'ds-prim-label' },
                    restyleState.otpComplete ? 'complete: ' + restyleState.otpComplete : 'type 6 digits')
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'hover card'),
                HoverCard({
                    trigger: Btn({ children: 'hover me' }),
                    content: h('div', {}, 'HoverCard content — composes Popover with a delayed hover trigger.'),
                    open: restyleState.hoverCardOpen,
                    onOpenChange: (v) => { restyleState.hoverCardOpen = v; kit.render(); },
                })
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'date picker'),
                DatePicker({
                    value: restyleState.datePickerValue,
                    onChange: (v) => { restyleState.datePickerValue = v; kit.render(); },
                    open: restyleState.datePickerOpen,
                    onOpenChange: (v) => { restyleState.datePickerOpen = v; kit.render(); },
                    placeholder: 'pick a date',
                }),
                h('span', { class: 'ds-prim-label ds-prim-label-status' },
                    restyleState.datePickerValue ? formatDate(restyleState.datePickerValue) : 'none selected')
            )
        )
    });
}

// Distinguishes rows a visitor can actually operate (input-driven — pick a
// range, open a menu, drag a carousel) from rows that only render supplied
// fixture data (collab cursors, context accounting) — both are legitimate
// specimens, but they look identical otherwise inside the same row shell.
function RowTag(kind) {
    return Chip({ tone: kind === 'live' ? 'accent' : 'dim', size: 'sm', children: kind });
}

// The rest of the backfilled surface: range picking, the two overlay
// compositions, the aspect-ratio wrapper, the collab-ui overlays and the
// context-pane trio. Split from RestylePanel rather than appended to it to keep
// each function a single readable specimen group.
function BackfillPanel() {
    const totalTokens = CONTEXT_SEGMENTS.reduce((n, s) => n + s.value, 0);
    return Panel({ id: 'backfill', title: 'backfill — range, overlays, collab, context', class: 'ds-panel-gap', children:
        h('div', { class: 'ds-prim-panel' },
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'date range'), RowTag('live'),
                DateRangePicker({
                    value: moreState.rangeValue,
                    onChange: (v) => { moreState.rangeValue = v; kit.render(); },
                    open: moreState.rangeOpen,
                    onOpenChange: (v) => { moreState.rangeOpen = v; kit.render(); },
                    placeholder: 'pick a range',
                    name: 'primer-drp',
                }),
                h('span', { class: 'ds-prim-label ds-prim-label-status' },
                    moreState.rangeValue.from
                        ? formatDate(moreState.rangeValue.from) + ' -> ' + (moreState.rangeValue.to ? formatDate(moreState.rangeValue.to) : '...')
                        : 'none selected')
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'menubar'), RowTag('live'),
                Menubar({
                    openIndex: moreState.menuOpenIndex,
                    onOpenIndexChange: (i) => { moreState.menuOpenIndex = i; kit.render(); },
                    ariaLabel: 'primer demo menubar',
                    menus: [
                        { id: 'file', label: 'file', items: [{ id: 'new', label: 'new' }, { id: 'open', label: 'open' }], onSelect: (id) => { moreState.menuPicked = 'file/' + id; kit.render(); } },
                        { id: 'edit', label: 'edit', items: [{ id: 'copy', label: 'copy' }, { separator: true }, { id: 'del', label: 'delete', danger: true }], onSelect: (id) => { moreState.menuPicked = 'edit/' + id; kit.render(); } },
                    ],
                }),
                h('span', { class: 'ds-prim-label ds-prim-label-status' },
                    moreState.menuPicked ? 'chose: ' + moreState.menuPicked : 'nothing chosen yet')
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'carousel'), RowTag('live'),
                Carousel({
                    label: 'primer demo carousel',
                    items: ['one', 'two', 'three', 'four'],
                    renderItem: (item) => h('div', { class: 'ds-prim-label' }, item),
                })
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'aspect ratio'), RowTag('fixture'),
                AspectRatio({ ratio: '16 / 9', children: h('div', { class: 'ds-prim-label' }, '16 / 9') })
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'presence'), RowTag('fixture'),
                PresenceBar({ users: COLLAB_USERS }),
                AgentPresenceChip({ userId: 'u9', label: 'solo agent', color: 'var(--purple-2)', status: 'active' })
            ),
            h('div', { class: 'ds-prim-row ds-prim-row-collab' },
                h('span', { class: 'ds-prim-label' }, 'collab overlays'), RowTag('fixture'),
                // LiveCursorOverlay takes flat x/y, but the ring and flash
                // overlays read a NESTED `rect` ({top,left,width,height}) --
                // passing flat coords there throws on `s.rect.left`, taking the
                // whole kit's mount down rather than just blanking one specimen.
                LiveCursorOverlay({ cursors: [{ userId: 'u1', label: 'ana', color: 'var(--purple)', x: 40, y: 18 }, { userId: 'u3', label: 'agent', color: 'var(--mascot)', x: 120, y: 44 }] }),
                RemoteSelectionRings({ selections: [{ userId: 'u2', color: 'var(--green)', rect: { left: 20, top: 12, width: 90, height: 18 } }] }),
                RecentEditHighlightFlash({ edits: [{ timestamp: 1, color: 'var(--purple)', rect: { left: 12, top: 60, width: 70, height: 16 } }] })
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'context meter'), RowTag('fixture'),
                ContextMeter({ used: totalTokens, total: 32000, segments: CONTEXT_SEGMENTS })
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'context treemap'), RowTag('fixture'),
                ContextTreemap({ items: CONTEXT_SEGMENTS, width: 280, height: 160 })
            ),
            h('div', { class: 'ds-prim-row' },
                h('span', { class: 'ds-prim-label' }, 'context x-ray'), RowTag('fixture'),
                ContextXRayPanel({
                    segments: CONTEXT_SEGMENTS,
                    openId: moreState.xrayOpenId,
                    onOpenIdChange: (id) => { moreState.xrayOpenId = id; kit.render(); },
                })
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
        // Every entry anchors to the panel it names. These were four inert
        // rows styled exactly like working nav — the only sidebar on the page
        // and none of it went anywhere.
        side: Side({
            sections: [
                { group: 'sections', items: [
                    { glyph: '-', label: 'palette',    key: 'p', href: '#palette',    active: navState.activeId === 'palette' },
                    { glyph: '-', label: 'semantic',   key: 's', href: '#semantic',   active: navState.activeId === 'semantic' },
                    { glyph: '-', label: 'type scale', key: 't', href: '#type-scale', active: navState.activeId === 'type-scale' },
                    { glyph: '-', label: 'primitives', key: 'r', href: '#primitives', active: navState.activeId === 'primitives' },
                    { glyph: '-', label: 'restyle 2026', key: 'x', href: '#restyle',  active: navState.activeId === 'restyle' },
                    { glyph: '-', label: 'backfill', key: 'b', href: '#backfill',     active: navState.activeId === 'backfill' }
                ] }
            ]
        }),
        main: [
            // Dense header: this is a reference surface people scroll to look
            // something up, not a landing page. The display H1 + wrapped lede
            // spent most of the first fold on an intro, and the lede's narrow
            // measure sat ragged against the full-width heading above it.
            PageHeader({
                dense: true,
                title: 'system primer',
                lede: 'palette, semantic tokens, type scale, primitives',
                right: ThemeToggle({ compact: true })
            }),
            h('div', { class: 'ds-section ds-section-pad' },
                PaletteGrid(),
                SemanticGrid(),
                TypeScalePanel(),
                PrimitivesPanel(),
                RestylePanel(),
                BackfillPanel()
            )
        ],
        status: Status({
            left: ['system primer', '- ' + PALETTE.length + ' lore colors', '- ' + SEMANTIC.length + ' semantic'],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '16 System Primer' });
// One-time observer setup after the first real DOM paint — the panel ids
// don't exist until mountKit's initial applyDiff has run.
queueMicrotask(observeSections);
