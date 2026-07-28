// Root real-services witness. Mock-free: runs the actual build + lint
// scripts as child processes and imports the actual component modules via
// node's real ESM loader, asserting on their real output shape. No test
// framework, no assertion library — plain Node, thrown Error on failure.
//
// Run: node test.js

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.dirname(fileURLToPath(import.meta.url));
let failures = 0;

function check(name, fn) {
    try {
        fn();
        console.log('[pass]', name);
    } catch (e) {
        failures++;
        console.error('[FAIL]', name, '-', e && e.message || e);
    }
}

// spawnSync (not execFileSync) so stderr is captured into the return value
// regardless of exit code — several scripts/*.mjs report via console.warn
// (stderr), which execFileSync silently drops on success (inherits stderr to
// the terminal instead of returning it), making REPORT-only warnings
// unwitnessable from a captured string.
function run(cmd, args) {
    const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
    if (r.error) throw r.error;
    return (r.stdout || '') + (r.stderr || '');
}

// -- Build + lint scripts (real child-process execution, real filesystem) --
check('scripts/build.mjs succeeds and reports lint OK', () => {
    const out = run(process.execPath, ['scripts/build.mjs']);
    if (!/js minified bundle/.test(out)) throw new Error('build did not report a minified bundle: ' + out.slice(-400));
    if (/\[lint-tokens\] FAIL/.test(out)) throw new Error('lint-tokens FAIL present in build output');
    if (!/\[lint-radius\] OK/.test(out)) throw new Error('lint-radius did not report OK');
    if (!/\[lint-glyphs\] OK/.test(out)) throw new Error('lint-glyphs did not report OK');
    if (!/\[lint-null-children\] OK/.test(out)) throw new Error('lint-null-children did not report OK');
});

check('scripts/lint-classes.mjs passes standalone', () => {
    const out = run(process.execPath, ['scripts/lint-classes.mjs']);
    if (!/OK/.test(out)) throw new Error('lint-classes did not report OK: ' + out);
});

check('scripts/lint-inline-styles.mjs passes standalone', () => {
    const out = run(process.execPath, ['scripts/lint-inline-styles.mjs']);
    // Accepts either report shape. The gate started as a hard zero ("OK") and
    // became a ratchet ("PASS — n <= baseline n") when its scan widened from
    // ui_kits/site to also cover preview, slides and src, which exposed real
    // pre-existing debt that was frozen rather than hidden. Matching only /OK/
    // failed on a gate that was passing correctly. FAIL still throws, so this
    // does not weaken the check — the spacing test below uses the same shape.
    if (!/\bOK\b|\bPASS\b/.test(out)) throw new Error('lint-inline-styles did not pass: ' + out);
});

check('scripts/lint-tokens.mjs spacing report does not exceed session baseline', () => {
    const out = run(process.execPath, ['scripts/lint-tokens.mjs']);
    const m = out.match(/\[lint-spacing\] (?:REPORT — (\d+) raw|PASS — (\d+) <= baseline (\d+))/);
    if (!m) throw new Error('lint-spacing report line not found: ' + out.slice(0, 200));
    const count = Number(m[1] ?? m[2]);
    const baseline = m[3] ? Number(m[3]) : 641;
    if (count > baseline) throw new Error('spacing violation count regressed: ' + count + ' > ' + baseline + ' baseline');
});

// -- New components: real ESM import, real invocation, real vnode shape --
const { Pill } = await import('./src/components/shell.js');
const { Pager, JsonViewer, ToolbarRow, PropertyGridRow, InlineEditableField, Grid, GridItem, Collapse, CollapseGroup, Divider } = await import('./src/components/editor-primitives.js');
const { Table } = await import('./src/components/content.js');

check('Pill renders a span.ds-pill with tone class', () => {
    const v = Pill({ tone: 'accent', children: 'PLAN' });
    if (v.type !== 'span') throw new Error('expected span, got ' + v.type);
    if (!v.props.class.includes('ds-pill')) throw new Error('missing ds-pill class: ' + v.props.class);
    if (!v.props.class.includes('tone-accent')) throw new Error('missing tone-accent class: ' + v.props.class);
});

check('Pill with no children renders empty pill, no crash', () => {
    const v = Pill({});
    if (v.type !== 'span') throw new Error('expected span, got ' + v.type);
});

check('Pager renders prev/next buttons with correct page label', () => {
    const v = Pager({ page: 2, pageCount: 5, total: 42 });
    const [prev, label, next] = v.props.children;
    if (prev.props.disabled) throw new Error('prev should be enabled mid-range');
    if (next.props.disabled) throw new Error('next should be enabled mid-range');
    const labelText = label.props.children[0];
    if (!/page 2 \/ 5/.test(labelText)) throw new Error('bad label: ' + labelText);
    if (!/42 items/.test(labelText)) throw new Error('missing total: ' + labelText);
});

check('Pager degenerate pageCount<=1 disables both buttons, no divide-by-zero', () => {
    const v = Pager({ page: 1, pageCount: 1 });
    const [prev, label, next] = v.props.children;
    if (prev.props.disabled !== 'disabled') throw new Error('prev should be disabled at single page');
    if (next.props.disabled !== 'disabled') throw new Error('next should be disabled at single page');
    const labelText = label.props.children[0];
    if (!/page 1 \/ 1/.test(labelText)) throw new Error('bad single-page label: ' + labelText);
});

check('Pager clamps out-of-range page without throwing', () => {
    const v = Pager({ page: 99, pageCount: 3 });
    const labelText = v.props.children[1].props.children[0];
    if (!/page 3 \/ 3/.test(labelText)) throw new Error('did not clamp to pageCount: ' + labelText);
});

check('JsonViewer stringifies an object with indentation', () => {
    const v = JsonViewer({ value: { a: 1, b: [2, 3] } });
    if (v.type !== 'pre') throw new Error('expected pre, got ' + v.type);
    if (!v.props.children[0].includes('\n')) throw new Error('expected indented JSON, got single line');
});

check('JsonViewer accepts a pre-stringified string unchanged', () => {
    const v = JsonViewer({ value: 'raw text' });
    if (v.props.children[0] !== 'raw text') throw new Error('string input should pass through verbatim');
});

check('JsonViewer null/undefined renders empty-state text, not the literal "undefined"', () => {
    const vNull = JsonViewer({ value: null, emptyText: 'no data' });
    const vUndef = JsonViewer({ value: undefined, emptyText: 'no data' });
    if (vNull.props.children[0] !== 'no data') throw new Error('null did not render empty text: ' + vNull.props.children[0]);
    if (vUndef.props.children[0] !== 'no data') throw new Error('undefined did not render empty text: ' + vUndef.props.children[0]);
    if (String(vNull.props.children[0]).includes('undefined')) throw new Error('leaked literal "undefined"');
});

check('JsonViewer highlight mode tokenizes keys/strings/numbers/booleans/null into ds-ep-json-* spans', () => {
    const v = JsonViewer({ value: { a: 1, ok: true, s: 'x', z: null }, mode: 'highlight' });
    if (v.type !== 'pre') throw new Error('expected pre, got ' + v.type);
    if (!v.props.class.includes('ds-ep-json-hl')) throw new Error('missing ds-ep-json-hl class: ' + v.props.class);
    const kinds = new Set(v.props.children.filter(c => c && c.props).map(c => c.props.class));
    for (const cls of ['ds-ep-json-k', 'ds-ep-json-s', 'ds-ep-json-n', 'ds-ep-json-b', 'ds-ep-json-z']) {
        if (!kinds.has(cls)) throw new Error('missing token span ' + cls + '; got ' + [...kinds].join(','));
    }
});

check('JsonViewer highlight mode never falsely tokenizes non-JSON prose', () => {
    const v = JsonViewer({ value: 'plain prose, not json', mode: 'highlight' });
    if (v.props.class.includes('ds-ep-json-hl')) throw new Error('non-JSON string was tokenized');
    if (v.props.children[0] !== 'plain prose, not json') throw new Error('string not passed through verbatim');
});

check('JsonViewer tree mode renders collapsible details, open above treeDepth', () => {
    const v = JsonViewer({ value: { a: { b: 2 }, c: [1, 2, 3] }, mode: 'tree' });
    if (v.type !== 'div') throw new Error('expected div, got ' + v.type);
    if (!v.props.class.includes('ds-ep-json-tree')) throw new Error('missing tree class: ' + v.props.class);
    const rootNode = v.props.children[0];
    if (rootNode.type !== 'details') throw new Error('root not details: ' + rootNode.type);
    if (rootNode.props.open !== true) throw new Error('depth 0 should default open');
});

check('JsonViewer copyable wraps viewer with a copy button', () => {
    const v = JsonViewer({ value: { a: 1 }, copyable: true });
    if (v.props.class !== 'ds-ep-json-wrap') throw new Error('missing wrap: ' + v.props.class);
    if (v.props.children[0].type !== 'button') throw new Error('copy button missing');
    if (v.props.children[1].type !== 'pre') throw new Error('viewer body missing');
});

check('JsonViewer plain default stays byte-compatible (children[0] is the raw string)', () => {
    const v = JsonViewer({ value: { a: 1 } });
    if (typeof v.props.children[0] !== 'string') throw new Error('plain default no longer raw text');
});

check('ToolbarRow accepts varargs and renders a flat wrapping row', () => {
    const a = { type: 'button' }, b = { type: 'button' };
    const v = ToolbarRow(a, b);
    if (v.props.class !== 'ds-ep-toolbar-row') throw new Error('bad class: ' + v.props.class);
    if (v.props.children.length !== 2) throw new Error('expected 2 children, got ' + v.props.children.length);
});

check('ToolbarRow accepts a single array argument (flattened, not double-nested)', () => {
    const items = [{ type: 'button' }, { type: 'button' }, { type: 'button' }];
    const v = ToolbarRow(items);
    if (v.props.children.length !== 3) throw new Error('expected 3 flattened children, got ' + v.props.children.length);
});

check('PropertyGridRow wraps children in a bordered-row div', () => {
    const v = PropertyGridRow({ children: [{ type: 'span' }] });
    if (v.type !== 'div') throw new Error('expected div, got ' + v.type);
    if (v.props.class !== 'ds-ep-propgrid-row') throw new Error('bad class: ' + v.props.class);
});

check('InlineEditableField renders a single-line input by default', () => {
    const v = InlineEditableField({ value: 'hello', placeholder: 'type...' });
    if (v.type !== 'input') throw new Error('expected input, got ' + v.type);
    if (v.props.value !== 'hello') throw new Error('value not passed through');
    if (v.props['aria-invalid']) throw new Error('aria-invalid should be absent with no error');
});

check('InlineEditableField multiline renders a textarea', () => {
    const v = InlineEditableField({ value: 'hi', multiline: true, rows: 5 });
    if (v.type !== 'textarea') throw new Error('expected textarea, got ' + v.type);
    if (v.props.rows !== 5) throw new Error('rows not passed through');
});

check('InlineEditableField error state sets aria-invalid + has-error class', () => {
    const v = InlineEditableField({ value: '', error: true });
    if (v.props['aria-invalid'] !== 'true') throw new Error('aria-invalid not set on error');
    if (!v.props.class.includes('has-error')) throw new Error('has-error class missing: ' + v.props.class);
});

check('InlineEditableField empty string value renders empty input with placeholder', () => {
    const v = InlineEditableField({ value: '', placeholder: 'witness evidence...' });
    if (v.props.value !== '') throw new Error('expected empty string value, got ' + JSON.stringify(v.props.value));
    if (v.props.placeholder !== 'witness evidence...') throw new Error('placeholder missing');
});

check('Pager numbered mode renders numbered buttons + ellipsis + current-page marker', () => {
    const v = Pager({ page: 5, pageCount: 20, numbered: true });
    const kids = v.props.children;
    const buttons = kids.filter(c => c && c.props && c.props.class && c.props.class.includes('ds-ep-pager-num'));
    const ellipses = kids.filter(c => c && c.props && c.props.class === 'ds-ep-pager-ellipsis');
    const current = buttons.find(b => b.props.class.includes('is-current'));
    if (buttons.length === 0) throw new Error('expected numbered page buttons');
    if (ellipses.length === 0) throw new Error('expected at least one ellipsis for a 20-page range at page 5');
    if (!current || current.props.children[0] !== '5') throw new Error('current page button not marked/labeled correctly');
});

check('Pager default (non-numbered) contract is unchanged by the numbered-mode addition', () => {
    const v = Pager({ page: 2, pageCount: 5, total: 42 });
    if (v.props.class !== 'ds-ep-pager') throw new Error('default class changed: ' + v.props.class);
});

check('Grid renders a flex wrapper; GridItem span sets --{tier}-basis custom properties', () => {
    const item = GridItem({ xs: true, sm: 6, md: 4, children: 'x' });
    if (!item.props.style.includes('--xs-basis:100%')) throw new Error('xs:true should be full-width: ' + item.props.style);
    if (!item.props.style.includes('--sm-basis:25%')) throw new Error('sm:6 of 24 should be 25%: ' + item.props.style);
    const grid = Grid({ children: [item] });
    if (grid.props.class !== 'ds-ep-grid') throw new Error('expected ds-ep-grid class: ' + grid.props.class);
});

check('GridItem span=0 at a tier sets --{tier}-display:none (hide-at-breakpoint)', () => {
    const item = GridItem({ xs: 12, sm: 0 });
    if (!item.props.style.includes('--sm-display:none')) throw new Error('sm:0 should hide at sm: ' + item.props.style);
});

check('Collapse renders only the header when collapsed, header+body when expanded', () => {
    const collapsed = Collapse({ title: 'T', expanded: false, children: 'body' });
    const expanded = Collapse({ title: 'T', expanded: true, children: 'body' });
    if (collapsed.props.children.length !== 1) throw new Error('collapsed should render 1 child (header only)');
    if (expanded.props.children.length !== 2) throw new Error('expanded should render 2 children (header+body)');
});

check('Collapse onToggle fires with the inverted expanded state on header click', () => {
    let toggledTo = null;
    const v = Collapse({ title: 'T', expanded: false, onToggle: (next) => { toggledTo = next; } });
    v.props.children[0].props.onclick();
    if (toggledTo !== true) throw new Error('expected onToggle(true) from collapsed state, got ' + toggledTo);
});

check('CollapseGroup accordion mode expands only openId, onOpenChange fires with clicked item id', () => {
    let openChangedTo;
    const v = CollapseGroup({
        accordion: true, openId: 'b',
        items: [{ id: 'a', title: 'A', children: 'a' }, { id: 'b', title: 'B', children: 'b' }],
        onOpenChange: (id) => { openChangedTo = id; },
    });
    const [itemA, itemB] = v.props.children;
    if (itemA.props.children.length !== 1) throw new Error('item a should be collapsed (not openId)');
    if (itemB.props.children.length !== 2) throw new Error('item b should be expanded (is openId)');
    itemA.props.children[0].props.onclick();
    if (openChangedTo !== 'a') throw new Error('expected onOpenChange("a"), got ' + openChangedTo);
});

check('Divider default renders a real <hr>; label mode wraps a label span; vertical mode sets orientation', () => {
    const plain = Divider();
    if (plain.type !== 'hr') throw new Error('expected hr, got ' + plain.type);
    const labeled = Divider({ label: 'OR' });
    if (labeled.props.children[0].props.class !== 'ds-ep-divider-label') throw new Error('missing label span');
    const vertical = Divider({ vertical: true });
    if (vertical.props['aria-orientation'] !== 'vertical') throw new Error('missing vertical aria-orientation');
});

check('Table striped/compact are opt-in and default false (existing contract byte-unchanged)', () => {
    const plain = Table({ headers: ['a'], rows: [['1']] });
    if (plain.props.class !== 'ds-table-wrap') throw new Error('default class changed: ' + plain.props.class);
    const striped = Table({ headers: ['a'], rows: [['1']], striped: true });
    if (!striped.props.class.includes('is-striped')) throw new Error('missing is-striped class: ' + striped.props.class);
    const compact = Table({ headers: ['a'], rows: [['1']], compact: true });
    if (!compact.props.class.includes('is-compact')) throw new Error('missing is-compact class: ' + compact.props.class);
    const both = Table({ headers: ['a'], rows: [['1']], striped: true, compact: true });
    if (!both.props.class.includes('is-striped') || !both.props.class.includes('is-compact')) throw new Error('missing combined classes: ' + both.props.class);
});

// -- Regression guards: dead/replaced markup must not creep back in --
// ds-panel-trio was originally a dead class -- applied in markup with zero
// matching CSS -- and this guard asserted its absence. It now has a real rule
// (src/css/app-shell/kits-appended.css): three grid tracks stepping 3->2->1 on
// CONTAINER width. So the guard inverts: the class is legitimate, and what must
// not regress is the defect it replaced. The dashboard previously built that row
// from GridItem md:8 spans on a 24-column system, which is 33.33% each; three of
// those plus two gaps exceed 100%, so the third panel wrapped to its own row and
// the "3-up" was really a 2+1. Percentage flex-basis cannot express an equal
// N-up with gaps -- real grid tracks can.
check('ds-panel-trio has a real CSS rule and the dashboard uses it instead of percentage flex-basis spans', () => {
    const src = fs.readFileSync(path.join(root, 'ui_kits/dashboard/app.js'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'src/css/app-shell/kits-appended.css'), 'utf8');
    if (!/\.ds-panel-trio\s*\{/.test(css)) throw new Error('ds-panel-trio is applied but has no CSS rule -- the original dead-class defect');
    if (!/grid-template-columns:\s*repeat\(3/.test(css)) throw new Error('ds-panel-trio must declare three real grid tracks');
    if (!/class:\s*['"]ds-panel-trio['"]/.test(src)) throw new Error('dashboard no longer uses ds-panel-trio for its 3-up row');
    if (/GridItem\(\{[^}]*md:\s*8/.test(src)) throw new Error('dashboard regressed to md:8 percentage spans, which wrap the third panel onto its own row');
});

check('ui_kits/signin/app.js uses Divider component, not the hand-rolled ds-auth-divider markup', () => {
    const src = fs.readFileSync(path.join(root, 'ui_kits/signin/app.js'), 'utf8');
    if (src.includes('ds-auth-divider')) throw new Error('hand-rolled ds-auth-divider markup regressed back into signin app.js');
    if (!src.includes("Divider({ label: 'or' })")) throw new Error('Divider({label:\'or\'}) no longer used in signin app.js');
});

check('app-shell.css no longer defines the dead ds-auth-divider/-line rules', () => {
    const src = fs.readFileSync(path.join(root, 'app-shell.css'), 'utf8');
    if (/\.ds-auth-divider\b/.test(src)) throw new Error('dead .ds-auth-divider CSS rule regressed back into app-shell.css');
});

check('every ui_kit using an editor-primitives.js component links editor-primitives.css (real bug found+fixed this session: dashboard/signin used Grid/Divider but never linked the stylesheet, so the components rendered completely unstyled)', () => {
    // Word-boundary-anchored so 'Grid(' does not false-positive-match
    // 'FileGrid(' (a distinct, unrelated content.js component).
    const EP_PATTERNS = [/\bPager\b/, /\bJsonViewer\b/, /\bToolbarRow\b/, /\bPropertyGridRow\b/, /\bPropertyGrid\b/, /\bPropertyField\b/, /\bInlineEditableField\b/, /\bGrid\(/, /\bGridItem\(/, /\bCollapse\(/, /\bCollapseGroup\(/, /\bDivider\(/];
    const kitsDir = path.join(root, 'ui_kits');
    const missing = [];
    for (const kit of fs.readdirSync(kitsDir)) {
        const appPath = path.join(kitsDir, kit, 'app.js');
        const htmlPath = path.join(kitsDir, kit, 'index.html');
        if (!fs.existsSync(appPath) || !fs.existsSync(htmlPath)) continue;
        const appSrc = fs.readFileSync(appPath, 'utf8');
        const usesEp = EP_PATTERNS.some((re) => re.test(appSrc));
        if (!usesEp) continue;
        const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
        if (!htmlSrc.includes('editor-primitives.css')) missing.push(kit);
    }
    if (missing.length) throw new Error('ui_kits missing editor-primitives.css despite using its components: ' + missing.join(', '));
});

check('every CSS file referenced by a ui_kit index.html is included in the gh-pages.yml deploy copy list (real bug: editor-primitives.css/app-surfaces.css/chat.css/community.css/community-app.css were all linked in real HTML but never shipped to production, silently 404ing)', () => {
    const kitsDir = path.join(root, 'ui_kits');
    const referenced = new Set();
    for (const kit of fs.readdirSync(kitsDir)) {
        const htmlPath = path.join(kitsDir, kit, 'index.html');
        if (!fs.existsSync(htmlPath)) continue;
        const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
        for (const m of htmlSrc.matchAll(/href="\.\.\/\.\.\/([a-zA-Z0-9_-]+\.css)"/g)) referenced.add(m[1]);
    }
    const workflowSrc = fs.readFileSync(path.join(root, '.github/workflows/gh-pages.yml'), 'utf8');
    const missing = [...referenced].filter((f) => !workflowSrc.includes(f));
    if (missing.length) throw new Error('CSS files referenced by ui_kits but missing from gh-pages.yml copy list: ' + missing.join(', '));
});

if (failures > 0) {
    console.error(`\n${failures} failure(s).`);
    process.exit(1);
}
console.log('\nAll checks passed.');
