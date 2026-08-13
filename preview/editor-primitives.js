// Rendered specimens for the editor-primitives.js family.
//
// Real imported components, not markup that imitates them — see preview/
// content.js for why that distinction is the whole point of these pages.
//
// Overlay components (Dialog, Drawer, Toast, ContextMenu) render in their OPEN
// state here on purpose: their closed state is nothing, and a specimen of
// nothing documents nothing. The hooks (useContextMenu, useMediaQuery,
// useLongPress) have no visual form and are covered by docs/component-props.md
// instead.
import * as webjsx from 'webjsx';
import {
    Toolbar, ToolbarRow, Tabs, TreeView, TreeItem, PropertyGrid, PropertyField,
    PropertyGridRow, InlineEditableField, Dock, IconButtonGroup, SplitPanel,
    Dialog, Toast, Pager, JsonViewer, Grid, GridItem, Collapse, CollapseGroup,
    Divider, InfoRow, InfoSection, DiagnosticsPanel, Drawer,
} from '../src/components/editor-primitives.js';
import { Btn, Icon } from '../src/components/shell.js';

const h = webjsx.createElement;
const root = document.getElementById('root');

function spec(name, note, ...children) {
    return h('section', { key: name },
        h('h2', {}, name),
        note ? h('p', { class: 'spec-note' }, note) : null,
        ...children);
}

// A bounded box for the specimens that fill their container (SplitPanel, Dock,
// Drawer), so they do not collapse to zero height on a plain page.
function box(...children) {
    return h('div', { class: 'spec-box' }, ...children);
}

const view = () => h('div', { class: 'spec-page' },
    spec('Toolbar + ToolbarRow', 'Leading/trailing action strip. ToolbarRow groups actions.',
        Toolbar({
            leading: [Btn({ key: 't1', children: 'open' }), Btn({ key: 't2', ghost: true, children: 'save' })],
            trailing: [Btn({ key: 't3', ghost: true, children: 'settings' })],
        }),
        ToolbarRow(Btn({ key: 'r1', children: 'one' }), Btn({ key: 'r2', children: 'two' }))),

    spec('Tabs', 'Active tab is driven by `active`, not internal state.',
        Tabs({ items: [{ id: 'a', label: 'source' }, { id: 'b', label: 'output' }, { id: 'c', label: 'diff' }],
            active: 'a', 'aria-label': 'view',
            onChange: () => { /* specimen: the resting appearance is the subject */ } })),

    spec('TreeView + TreeItem', 'depth drives the indent; hasChildren draws the twisty.',
        TreeView({ children: [
            TreeItem({ key: 'i1', label: 'src', depth: 0, hasChildren: true, expanded: true }),
            TreeItem({ key: 'i2', label: 'components', depth: 1, hasChildren: true, expanded: true }),
            TreeItem({ key: 'i3', label: 'shell.js', depth: 2, selected: true, tag: 'js' }),
            TreeItem({ key: 'i4', label: 'content.js', depth: 2, tag: 'js' }),
        ] })),

    spec('PropertyGrid + PropertyField + PropertyGridRow', 'Label/control pairs.',
        PropertyGrid({ children: [
            PropertyField({ key: 'p1', label: 'name', hint: 'used as the display title',
                children: InlineEditableField({ value: 'gm', ariaLabel: 'name' }) }),
            PropertyField({ key: 'p2', label: 'inline', inline: true,
                children: InlineEditableField({ value: 'compact form', ariaLabel: 'mode' }) }),
            PropertyGridRow({ key: 'p3', children: h('span', {}, 'a full-width row') }),
        ] })),

    spec('InlineEditableField', 'Plain, multiline, and error states.',
        h('div', { class: 'spec-stack' },
            InlineEditableField({ key: 'e1', value: 'editable text', ariaLabel: 'plain field' }),
            InlineEditableField({ key: 'e2', value: 'multiline\nsecond line', multiline: true, rows: 3, ariaLabel: 'multiline field' }),
            InlineEditableField({ key: 'e3', value: 'bad value', error: 'must be lowercase', ariaLabel: 'field with error' }))),

    spec('IconButtonGroup', 'Single-select icon segment.',
        IconButtonGroup({ items: [
            { id: 'left', icon: Icon('menu'), label: 'left' },
            { id: 'split', icon: Icon('columns'), label: 'split' },
            { id: 'right', icon: Icon('menu'), label: 'right' },
        ], value: 'split', onChange: () => { /* specimen: resting appearance */ } })),

    spec('SplitPanel', 'Two panes with a draggable divider.',
        box(SplitPanel({ orientation: 'horizontal', initial: '40%', children: [
            h('div', { key: 'l', class: 'spec-pane' }, 'left pane'),
            h('div', { key: 'r', class: 'spec-pane' }, 'right pane'),
        ] }))),

    spec('Dock', 'Edge-anchored regions around a centre.',
        box(Dock({
            top: h('div', { class: 'spec-pane' }, 'top'),
            left: h('div', { class: 'spec-pane' }, 'left'),
            center: h('div', { class: 'spec-pane' }, 'center'),
            right: h('div', { class: 'spec-pane' }, 'right'),
        }))),

    spec('Grid + GridItem', 'Responsive span per breakpoint.',
        Grid({ gap: 'var(--space-2)', children: [
            GridItem({ key: 'g1', xs: 12, md: 6, children: h('div', { class: 'spec-pane' }, 'xs12 md6') }),
            GridItem({ key: 'g2', xs: 12, md: 6, children: h('div', { class: 'spec-pane' }, 'xs12 md6') }),
            GridItem({ key: 'g3', xs: 12, md: 4, children: h('div', { class: 'spec-pane' }, 'md4') }),
        ] })),

    spec('Collapse + CollapseGroup', 'Standalone disclosure, and an accordion.',
        h('div', { class: 'spec-stack' },
            Collapse({ key: 'c1', title: 'an open section', expanded: true,
                children: h('p', {}, 'body of the open section.') }),
            CollapseGroup({ key: 'c2', accordion: true, openId: 'two', items: [
                { id: 'one', title: 'first', children: h('p', {}, 'first body.') },
                { id: 'two', title: 'second (open)', children: h('p', {}, 'second body.') },
            ] }))),

    spec('Divider', 'Plain and labelled.',
        h('div', { class: 'spec-stack' }, Divider({ key: 'd1' }), Divider({ key: 'd2', label: 'or' }))),

    spec('InfoRow + InfoSection', 'Key/value readouts.',
        InfoSection({ title: 'build', rows: [
            { label: 'version', value: '0.0.375' },
            { label: 'bundle', value: '528.5kb' },
        ] }),
        InfoRow({ key: 'ir', label: 'standalone row', value: 'a value' })),

    spec('Pager', 'Prev/next, and the numbered form.',
        h('div', { class: 'spec-stack' },
            Pager({ key: 'pg1', page: 2, pageCount: 7, total: 68, itemLabel: 'rows',
                onPage: () => { /* specimen: resting appearance */ } }),
            Pager({ key: 'pg2', page: 3, pageCount: 9, numbered: true,
                onPage: () => { /* specimen: resting appearance */ } }))),

    spec('JsonViewer', 'Plain and tree modes.',
        h('div', { class: 'spec-stack' },
            JsonViewer({ key: 'j1', value: { name: 'gm', live: true, tools: 19 } }),
            JsonViewer({ key: 'j2', mode: 'tree', treeDepth: 2, copyable: true,
                value: { kit: { id: 'docs', thin: false }, tags: ['a', 'b'] } }))),

    spec('DiagnosticsPanel', 'Grouped diagnostic readouts with a refresh action.',
        DiagnosticsPanel({ title: 'diagnostics', sections: [
            { title: 'runtime', rows: [{ label: 'node', value: '24.15.0' }, { label: 'chrome', value: '150' }] },
            { title: 'gates', rows: [{ label: 'lint', value: '16/16' }, { label: 'a11y', value: '0 blocking' }] },
        ], onRefresh: () => { /* specimen: resting appearance */ } })),

    spec('Dialog', 'Shown open — the closed state renders nothing.',
        Dialog({ title: 'confirm', open: true, dismissible: true,
            children: h('p', {}, 'dialog body copy.'),
            actions: [{ label: 'cancel', kind: 'ghost' }, { label: 'confirm', kind: 'primary' }],
            onClose: () => { /* specimen: stays open so the specimen is visible */ } })),

    spec('Drawer', 'Shown open, anchored left.',
        box(Drawer({ side: 'left', open: true, ariaLabel: 'example drawer',
            children: h('p', {}, 'drawer body.'),
            onClose: () => { /* specimen: stays open so the specimen is visible */ } }))),

    spec('Toast', 'All four kinds.',
        h('div', { class: 'spec-stack' },
            Toast({ key: 'k1', message: 'informational', kind: 'info', duration: 0 }),
            Toast({ key: 'k2', message: 'it worked', kind: 'success', duration: 0 }),
            Toast({ key: 'k3', message: 'check this', kind: 'warning', duration: 0 }),
            Toast({ key: 'k4', message: 'it failed', kind: 'error', duration: 0 }))),
);

webjsx.applyDiff(root, view());
