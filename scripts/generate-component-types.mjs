#!/usr/bin/env node
// generate-component-types.mjs -- generates types/components.d.ts from the
// SAME extraction that produces docs/component-props.md
// (scripts/component-surface.mjs). Hand-written declarations for 193
// components would drift from the real signatures within a week; a generator
// reading the real destructured parameter list cannot, because there is no
// second copy of the truth to fall out of sync.
//
// Type fidelity, in descending order of evidence strength. Every rung is a
// REAL fact read out of the source -- none of it is a guess about what a
// prop "probably" is:
//
//   1. A JSDoc `{Type}` annotation on the matching @param. This is the
//      author's own explicit statement, including real enum unions like
//      `'default'|'primary'|'ghost'|'danger'`, so it wins outright. JSDoc
//      type syntax is translated to TS (`*` -> `any`, `Function` -> a
//      callable, `Array<X>` -> `X[]`, `Set<*>` -> `Set<any>`).
//   2. The prop's actual default value literal. `false` proves boolean,
//      `'list'` proves string (and is emitted as a widened `string` unless
//      rung 3 finds sibling values), `[]` proves an array, `0`/`24` number.
//      A default is a load-bearing fact: the prop cannot be typed narrower
//      than a value the component itself assigns.
//   3. For a string-defaulted prop, the enumerated sibling values the
//      component's own body compares it against (`density === 'thumb'`,
//      `mode === 'ptt'`). Scanned per-component out of the real function
//      body, so the union is that component's real accepted set plus its
//      default, never a global guess pooled across unrelated components.
//      Emitted as `'a' | 'b' | (string & {})` -- the `(string & {})` tail
//      keeps autocomplete listing the known values WITHOUT rejecting a
//      value the scan did not see, since a comparison scan proves values
//      are accepted, never that others are refused.
//   4. Failing all of the above, a name-shape rule with a real convention
//      behind it: `on*` is a handler, `key`/`children` are webjsx's own
//      well-known slots. Everything else is `any` -- honestly unknown
//      beats a fabricated type that would reject valid calls.
//
// Run: node scripts/generate-component-types.mjs
// Add --check to verify types/components.d.ts already matches generated
// output (exits 1 on drift) -- the CI gate, matching
// generate-component-docs.mjs's own --check convention.
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { extractComponentSurface, root, readNormalized } from './component-surface.mjs';

const CHECK = process.argv.includes('--check');

let surface;
try {
    surface = extractComponentSurface();
} catch (e) {
    console.error(e.message);
    process.exit(1);
}
const { components, driftWarnings, fileOrder } = surface;

// ---- JSDoc type -> TypeScript type -------------------------------------
// Deliberately conservative: anything this does not confidently understand
// falls through to `any` rather than being half-translated into a type that
// would reject a valid call. A wrong type is worse than a wide one -- it
// makes a working consumer fail to compile.
function jsdocTypeToTs(t) {
    if (!t) return null;
    let s = t.trim();
    if (!s || s === '*' || s === 'any') return 'any';
    // Union of the form A|B|C -- recurse per member so `'a'|'b'` (a real
    // string-literal enum) survives intact and mixed unions still translate.
    if (s.includes('|') && !/[<{]/.test(s)) {
        const parts = s.split('|').map((p) => jsdocTypeToTs(p)).filter(Boolean);
        return parts.length ? [...new Set(parts)].join(' | ') : 'any';
    }
    // A quoted string literal is already valid TS.
    if (/^'[^']*'$/.test(s)) return s;
    if (/^Array<(.+)>$/.test(s)) {
        const inner = jsdocTypeToTs(s.replace(/^Array<(.+)>$/, '$1'));
        // Object-shaped members can contain `|` at depth; wrap so `A|B[]`
        // does not mis-associate.
        return `Array<${inner}>`;
    }
    if (/^Set<(.+)>$/.test(s)) return `Set<${jsdocTypeToTs(s.replace(/^Set<(.+)>$/, '$1'))}>`;
    if (s === 'Function') return '(...args: any[]) => any';
    if (s === 'boolean' || s === 'string' || s === 'number') return s;
    if (s === 'Object' || s === 'object') return 'Record<string, any>';
    if (s === 'Element' || s === 'HTMLElement' || s === 'Node') return s;
    // An inline object shape `{value:string, onInput:Function}` -- the
    // members are real, so translate them rather than collapsing to `any`.
    if (/^\{[\s\S]*\}$/.test(s)) {
        const inner = s.slice(1, -1);
        const members = splitTopLevel(inner, ',');
        const out = [];
        for (const mem of members) {
            const ci = mem.indexOf(':');
            if (ci === -1) { return 'Record<string, any>'; }
            const rawKey = mem.slice(0, ci).trim();
            const val = mem.slice(ci + 1).trim();
            const optional = rawKey.endsWith('?');
            const key = optional ? rawKey.slice(0, -1) : rawKey;
            if (!/^[A-Za-z_$][\w$]*$/.test(key)) return 'Record<string, any>';
            out.push(`${key}${optional ? '?' : ''}: ${jsdocTypeToTs(val) || 'any'}`);
        }
        return `{ ${out.join('; ')} }`;
    }
    return 'any';
}

// Split on a separator at brace/bracket/paren depth 0 only -- an inline
// object type's own nested commas must not split its parent.
function splitTopLevel(s, sep) {
    const out = [];
    let cur = '', d = 0;
    for (const ch of s) {
        if (ch === '{' || ch === '[' || ch === '(' || ch === '<') d++;
        else if (ch === '}' || ch === ']' || ch === ')' || ch === '>') d--;
        if (ch === sep && d === 0) { out.push(cur); cur = ''; }
        else cur += ch;
    }
    if (cur.trim()) out.push(cur);
    return out.map((x) => x.trim()).filter(Boolean);
}

// ---- default-value literal -> TypeScript type --------------------------
function defaultToTs(def) {
    if (def == null) return null;
    const d = def.trim();
    if (d === 'false' || d === 'true') return 'boolean';
    if (d === 'null' || d === 'undefined') return null; // proves nothing
    if (/^-?\d+(\.\d+)?$/.test(d) || d === 'Infinity' || d === '-Infinity') return 'number';
    if (/^'([^']*)'$/.test(d) || /^"([^"]*)"$/.test(d)) return 'string';
    if (/^\[\s*\]$/.test(d)) return 'any[]';
    if (/^\[/.test(d)) return 'any[]';
    if (/^\{/.test(d)) return 'Record<string, any>';
    if (/^\(/.test(d) || d.includes('=>')) return '(...args: any[]) => any';
    if (/^new\s+Set\b/.test(d)) return 'Set<any>';
    // An identifier default (`FILE_ROW_ACTIONS`, `CHAT_MINIMAP_WIDTH`,
    // `selected`) references another binding whose type this scan does not
    // resolve -- honestly unknown.
    return null;
}

// A string-literal default only proves the prop is a string. Whether it is a
// closed keyword set is answered by the component's OWN body: the literals it
// compares this exact prop against. Scanned per-component from real source.
function enumValuesFor(body, prop) {
    if (!/^[A-Za-z_$][\w$]*$/.test(prop)) return [];
    const vals = new Set();
    // `typeof prop === 'number'` compares the prop's TYPE, not its value --
    // harvesting 'number'/'string'/'function' out of it invented a bogus
    // `'50%' | 'number'` union for SplitPanel.initial on the first run. The
    // negative lookbehind drops exactly that shape while leaving every real
    // value comparison intact.
    const cmp = new RegExp(`(?<!typeof\\s)\\b${prop}\\s*===?\\s*'([^']*)'|'([^']*)'\\s*===?\\s*(?<!typeof\\s)\\b${prop}\\b`, 'g');
    let m;
    while ((m = cmp.exec(body))) vals.add(m[1] !== undefined ? m[1] : m[2]);
    // `['a','b'].includes(prop)` — same proof shape, different spelling.
    const inc = new RegExp(`\\[([^\\]]*)\\]\\s*\\.includes\\(\\s*${prop}\\s*\\)`, 'g');
    while ((m = inc.exec(body))) {
        for (const q of m[1].matchAll(/'([^']*)'/g)) vals.add(q[1]);
    }
    return [...vals];
}

// ---- name-shape fallback -----------------------------------------------
function nameToTs(name) {
    if (name === 'key') return 'string | number';
    if (name === 'children') return 'any';
    if (/^on[A-Z]/.test(name) || /^on[a-z]+$/.test(name)) return '(...args: any[]) => any';
    return 'any';
}

// ---- per-component function body, for the enum scan --------------------
// Read each source file once; find the component's own body by a
// balanced-brace scan from its definition, so an enum comparison in a
// NEIGHBOURING component in the same file cannot leak into this one's union.
const fileCache = new Map();
function sourceOf(relFile) {
    if (!fileCache.has(relFile)) {
        const p = join(root, 'src', relFile);
        fileCache.set(relFile, existsSync(p) ? readNormalized(p) : '');
    }
    return fileCache.get(relFile);
}

function bodyOf(relFile, name) {
    const src = sourceOf(relFile);
    if (!src) return '';
    const re = new RegExp(`(?:export\\s+)?function\\s+${name}\\s*\\(`);
    const m = re.exec(src);
    if (!m) {
        // Symbol lives in a sub-file reached by the surface extractor's
        // one-hop re-export resolution. Scan every sibling under the group
        // directory rather than guessing which one -- but still anchor on
        // THIS symbol's own definition, so the per-component isolation the
        // balanced-brace scan provides is preserved.
        const dir = relFile.replace(/\.js$/, '');
        const im = new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*'([^']+)'`).exec(src);
        if (im) {
            const sub = join(root, 'src', dir, '..', im[1]);
            const subPath = existsSync(sub) ? sub : sub + '.js';
            if (existsSync(subPath)) {
                const subSrc = readNormalized(subPath);
                const sm = re.exec(subSrc);
                if (sm) return braceBody(subSrc, sm.index);
            }
        }
        return '';
    }
    return braceBody(src, m.index);
}

function braceBody(src, from) {
    const open = src.indexOf('{', src.indexOf(')', from));
    if (open === -1) return '';
    let d = 0;
    for (let i = open; i < src.length; i++) {
        if (src[i] === '{') d++;
        else if (src[i] === '}') { d--; if (d === 0) return src.slice(open, i + 1); }
    }
    return src.slice(open);
}

// ---- emit ---------------------------------------------------------------
function tsPropName(name) {
    return /^[A-Za-z_$][\w$]*$/.test(name) ? name : `'${name.replace(/'/g, "\\'")}'`;
}

function typeForProp(c, p, docTypes, body) {
    // 1. JSDoc type -- the author's own explicit statement.
    const fromDoc = jsdocTypeToTs(docTypes[p.name]);
    if (fromDoc && fromDoc !== 'any') return fromDoc;
    // 2/3. Default value, widened by the component's own comparison set.
    const fromDefault = defaultToTs(p.default);
    if (fromDefault === 'string') {
        const lit = (p.default || '').trim().replace(/^['"]|['"]$/g, '');
        const found = enumValuesFor(body, p.name).filter((v) => v !== lit);
        if (found.length) {
            const union = [lit, ...found].filter((v) => v !== '').map((v) => `'${v.replace(/'/g, "\\'")}'`);
            // `(string & {})` keeps the literals in autocomplete without
            // closing the set -- the scan proves these values ARE accepted,
            // never that any other value is refused.
            return union.length ? `${[...new Set(union)].join(' | ')} | (string & {})` : 'string';
        }
        return 'string';
    }
    if (fromDefault) return fromDefault;
    if (fromDoc) return fromDoc; // an explicit `*`/`any` still beats guessing
    // 4. Name-shape convention.
    return nameToTs(p.name);
}

let out = '';
out += `// types/components.d.ts -- GENERATED, do not hand-edit.\n`;
out += `//\n`;
out += `// Produced by \`node scripts/generate-component-types.mjs\` from the same\n`;
out += `// extraction that produces docs/component-props.md, so the declarations\n`;
out += `// and the prose reference can never disagree. Re-run after any component\n`;
out += `// signature change; \`npm run lint:component-types\` fails CI when this\n`;
out += `// file is stale.\n`;
out += `//\n`;
out += `// ${components.length} exported symbols across ${fileOrder.length} source files.\n`;
out += `\n`;
out += `/** A webjsx virtual node, as returned by every component in this SDK. */\n`;
out += `export type VNode = any;\n\n`;

for (const file of fileOrder) {
    const inFile = components.filter((c) => c.file === file);
    if (!inFile.length) continue;
    out += `// ---- src/${file} ${'-'.repeat(Math.max(0, 60 - file.length))}\n\n`;
    for (const c of inFile) {
        const docTypes = {};
        if (c.jsdoc) {
            for (const p of c.jsdoc.params) {
                const bare = p.name
                    .replace(/^props\[['"]([^'"]+)['"]\]$/, '$1')
                    .replace(/^props\./, '');
                if (!bare.includes('.')) docTypes[bare] = p.type;
            }
        }
        const desc = c.jsdoc && c.jsdoc.description ? c.jsdoc.description : '';

        if (c.kind !== 'component') {
            // A const: emit the value's real type. An alias (`Card = Panel`)
            // is declared as the same props interface its target uses, so
            // `Card({...})` type-checks identically to `Panel({...})`.
            const d = c.props[0] ? c.props[0].default : null;
            if (desc) out += `/** ${desc.replace(/\*\//g, '*\\/')} */\n`;
            if (c.kind === 'const (alias)' && d && /^[A-Z]\w*$/.test(d.replace(/;$/, ''))) {
                const target = d.replace(/;$/, '');
                out += `export declare const ${c.name}: typeof ${target};\n\n`;
                continue;
            }
            if (c.kind === 'const (factory-wrapped)') {
                // makePage(...) -- a page component taking a host context.
                out += `export declare const ${c.name}: (...args: any[]) => VNode;\n\n`;
                continue;
            }
            const t = defaultToTs(d) || 'any';
            out += `export declare const ${c.name}: ${t};\n\n`;
            continue;
        }

        const body = bodyOf(c.file, c.name);
        const positional = c.props.filter((p) => p.positional);
        if (positional.length) {
            // A plain positional-arg function, not a props component.
            if (desc) out += `/** ${desc.replace(/\*\//g, '*\\/')} */\n`;
            const args = positional[0].name
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean)
                .map((a, i) => {
                    const bare = a.split('=')[0].trim().replace(/^\{[\s\S]*\}$/, `arg${i}`);
                    const nm = /^[A-Za-z_$][\w$]*$/.test(bare) ? bare : `arg${i}`;
                    return `${nm}?: any`;
                });
            out += `export declare function ${c.name}(${args.join(', ')}): VNode;\n\n`;
            continue;
        }

        const propsName = `${c.name}Props`;
        out += `/**\n`;
        if (desc) out += ` * ${desc.replace(/\*\//g, '*\\/')}\n *\n`;
        out += ` * Props for {@link ${c.name}} (src/${c.file}).\n`;
        out += ` */\n`;
        if (!c.props.length) {
            out += `export interface ${propsName} {}\n\n`;
        } else {
            out += `export interface ${propsName} {\n`;
            for (const p of c.props) {
                const t = typeForProp(c, p, docTypes, body);
                const docParam = c.jsdoc && c.jsdoc.params.find((x) => {
                    const bare = x.name.replace(/^props\[['"]([^'"]+)['"]\]$/, '$1').replace(/^props\./, '');
                    return bare === p.name;
                });
                const notes = [];
                if (docParam && docParam.desc) notes.push(docParam.desc);
                if (p.default != null) notes.push(`@default ${p.default.replace(/\*\//g, '*\\/').replace(/\s+/g, ' ')}`);
                if (notes.length) out += `    /** ${notes.join(' ').replace(/\*\//g, '*\\/')} */\n`;
                // Every prop is optional: every component destructures with
                // `= {}` or tolerates a missing key, and marking one required
                // would reject calls the runtime accepts today.
                out += `    ${tsPropName(p.name)}?: ${t};\n`;
            }
            out += `}\n`;
        }
        out += `export declare function ${c.name}(props?: ${propsName}): VNode;\n\n`;
    }
}

if (driftWarnings.length) {
    out += `// ---- drift warnings from the shared extraction -------------------\n`;
    for (const w of driftWarnings) out += `// ! ${w}\n`;
    out += `\n`;
}

// ---- root entry declarations (types/index.d.ts) -------------------------
// The package entry (dist/247420.js, built from src/index.js) re-exports far
// more than the component barrel: the render loop, theme/motion/i18n, the
// markdown+highlight stack, the router, the spoint kit surfaces. Those are
// enumerated from src/index.js's REAL export statements for the same reason
// the components are -- a hand-kept list of ~90 names is a list that silently
// goes stale. Each name's shape is read from its own defining module (a
// `function` -> a callable, a `const` -> its value's type), so the entry
// declaration tracks the source rather than restating it.
const indexSrc = readNormalized(join(root, 'src', 'index.js'));

function collectIndexExports(src) {
    const named = []; // { name, from }  -- from is null for local definitions
    for (const m of src.matchAll(/export\s*\{([^}]*)\}\s*from\s*'([^']+)';/g)) {
        for (const raw of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
            const [orig, alias] = raw.includes(' as ') ? raw.split(' as ').map((s) => s.trim()) : [raw, raw];
            named.push({ name: alias, orig, from: m[2] });
        }
    }
    for (const m of src.matchAll(/export\s*\{([^}]*)\};/g)) {
        if (/\bfrom\b/.test(m[0])) continue;
        for (const raw of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
            const [orig, alias] = raw.includes(' as ') ? raw.split(' as ').map((s) => s.trim()) : [raw, raw];
            // Resolve the local binding to the module it was imported from.
            const im = new RegExp(`import\\s*(?:\\*\\s*as\\s+${orig}|\\{[^}]*\\b${orig}\\b[^}]*\\})\\s*from\\s*'([^']+)'`).exec(src);
            const ns = new RegExp(`import\\s*\\*\\s*as\\s+${orig}\\s*from\\s*'([^']+)'`).test(src);
            named.push({ name: alias, orig, from: im ? im[1] : null, namespace: ns });
        }
    }
    for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(/g)) {
        named.push({ name: m[1], orig: m[1], from: null, local: 'function', async: /async/.test(m[0]) });
    }
    for (const m of src.matchAll(/export\s+const\s+(\w+)\s*=/g)) {
        named.push({ name: m[1], orig: m[1], from: null, local: 'const' });
    }
    // De-dupe by exported name, first occurrence wins (matches ESM: a
    // duplicate export name is a syntax error, so there is no ambiguity).
    const seen = new Set();
    return named.filter((e) => (seen.has(e.name) ? false : (seen.add(e.name), true)));
}

// Resolve a re-exported name's real declaration kind in its own module, so a
// function is declared callable rather than flattened to `any`.
function shapeOfExport(entry) {
    if (entry.namespace) return { kind: 'namespace' };
    let modPath = entry.from;
    if (!modPath) {
        if (entry.local === 'function') return { kind: 'function', async: !!entry.async };
        // A local `export const X = <rhs>` in index.js.
        const m = new RegExp(`export\\s+const\\s+${entry.orig}\\s*=\\s*([^;\\n]+)`).exec(indexSrc);
        const rhs = m ? m[1].trim() : '';
        if (/^webjsx\./.test(rhs)) return { kind: 'function' };
        return { kind: 'value', ts: defaultToTs(rhs) || 'any' };
    }
    const p = join(root, 'src', modPath.replace(/^\.\//, ''));
    const real = existsSync(p) ? p : (existsSync(p + '.js') ? p + '.js' : null);
    if (!real) return { kind: 'value', ts: 'any' };
    const src = readNormalized(real);
    if (new RegExp(`export\\s+(?:async\\s+)?function\\s+${entry.orig}\\s*\\(`).test(src)) {
        return { kind: 'function', async: new RegExp(`export\\s+async\\s+function\\s+${entry.orig}\\s*\\(`).test(src) };
    }
    if (new RegExp(`export\\s+class\\s+${entry.orig}\\b`).test(src)) return { kind: 'class' };
    const cm = new RegExp(`export\\s+(?:const|let)\\s+${entry.orig}\\s*=\\s*([^;\\n]+)`).exec(src);
    if (cm) {
        const rhs = cm[1].trim();
        if (/^(?:async\s*)?\(/.test(rhs) || rhs.includes('=>') || /^function\b/.test(rhs)) return { kind: 'function' };
        return { kind: 'value', ts: defaultToTs(rhs) || 'any' };
    }
    // Re-exported onward from this module (a barrel) -- callable is the
    // overwhelmingly common shape here and is what every such name in this
    // entry actually is; but only claim it when the name is not obviously a
    // constant (SCREAMING_CASE).
    if (/^[A-Z0-9_]+$/.test(entry.orig)) return { kind: 'value', ts: 'any' };
    return { kind: 'function' };
}

const indexExports = collectIndexExports(indexSrc);

let idx = '';
idx += `// types/index.d.ts -- GENERATED, do not hand-edit.\n`;
idx += `//\n`;
idx += `// The package entry surface, enumerated from src/index.js's real export\n`;
idx += `// statements by \`node scripts/generate-component-types.mjs\`. Component\n`;
idx += `// props live in ./components.d.ts, generated from the same extraction as\n`;
idx += `// docs/component-props.md. \`npm run lint:component-types\` fails CI when\n`;
idx += `// either file is stale.\n`;
idx += `\n`;
idx += `export * from './components.js';\n`;
idx += `import type { VNode } from './components.js';\n`;
idx += `export type { VNode };\n\n`;
idx += `/** Every component in the SDK, keyed by name (\`components.AppShell({...})\`). */\n`;
idx += `export declare const components: typeof import('./components.js');\n\n`;

// `export * from './components.js'` above already provides every component-
// barrel name. src/index.js ALSO re-exports a convenience subset of those
// same names (FREDDIE_PAGES, fmtBytes, the freddie pages) directly from
// './components.js' -- re-declaring them here would be a duplicate-identifier
// error, and the star export already gives the consumer the better-typed
// version. Skip exactly the names the star already covers.
const fromComponentBarrel = new Set(components.map((c) => c.name));

for (const e of indexExports) {
    if (e.name === 'components') continue; // declared explicitly above
    if (e.name === 'scope') continue; // declared explicitly below
    if (fromComponentBarrel.has(e.name)) continue;
    const shape = shapeOfExport(e);
    if (shape.kind === 'namespace') {
        idx += `export declare const ${e.name}: Record<string, any>;\n`;
    } else if (shape.kind === 'class') {
        idx += `export declare class ${e.name} { constructor(...args: any[]); [key: string]: any; }\n`;
    } else if (shape.kind === 'function') {
        idx += `export declare function ${e.name}(...args: any[]): ${shape.async ? 'Promise<any>' : 'any'};\n`;
    } else {
        idx += `export declare const ${e.name}: ${shape.ts};\n`;
    }
}

idx += `\n/** The scope class every SDK stylesheet rule is prefixed with. */\n`;
idx += `export declare const scope: string;\n`;
idx += `\ndeclare const _default: Record<string, any>;\nexport default _default;\n`;

const outPath = join(root, 'types', 'components.d.ts');
const idxPath = join(root, 'types', 'index.d.ts');

if (CHECK) {
    const stale = [];
    if ((existsSync(outPath) ? readNormalized(outPath) : null) !== out) stale.push('types/components.d.ts');
    if ((existsSync(idxPath) ? readNormalized(idxPath) : null) !== idx) stale.push('types/index.d.ts');
    if (stale.length) {
        console.error(`[component-types] ${stale.join(' and ')} ${stale.length > 1 ? 'are' : 'is'} stale -- run \`node scripts/generate-component-types.mjs\` and commit the result`);
        process.exit(1);
    }
    console.log(`[component-types] types/*.d.ts up to date (${components.length} component symbols, ${indexExports.length} entry exports, 0 drift)`);
    process.exit(0);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, out);
writeFileSync(idxPath, idx);
console.log(`[component-types] wrote types/components.d.ts (${components.length} symbols across ${fileOrder.length} files, ${driftWarnings.length} drift warning(s))`);
console.log(`[component-types] wrote types/index.d.ts (${indexExports.length} entry exports)`);
