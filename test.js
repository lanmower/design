// Root real-services witness. Mock-free: runs the actual build + lint
// scripts as child processes and imports the actual component modules via
// node's real ESM loader, asserting on their real output shape. No test
// framework, no assertion library — plain Node, thrown Error on failure.
//
// Run: node test.js

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
    if (!/OK/.test(out)) throw new Error('lint-inline-styles did not report OK: ' + out);
});

check('scripts/lint-tokens.mjs spacing report does not exceed session baseline', () => {
    const out = run(process.execPath, ['scripts/lint-tokens.mjs']);
    const m = out.match(/\[lint-spacing\] REPORT — (\d+) raw/);
    if (!m) throw new Error('lint-spacing report line not found: ' + out.slice(0, 200));
    const count = Number(m[1]);
    if (count > 641) throw new Error('spacing violation count regressed: ' + count + ' > 641 baseline');
});

// -- New components: real ESM import, real invocation, real vnode shape --
const { Pill } = await import('./src/components/shell.js');
const { Pager, JsonViewer, ToolbarRow, PropertyGridRow, InlineEditableField } = await import('./src/components/editor-primitives.js');

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

if (failures > 0) {
    console.error(`\n${failures} failure(s).`);
    process.exit(1);
}
console.log('\nAll checks passed.');
