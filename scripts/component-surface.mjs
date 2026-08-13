#!/usr/bin/env node
// component-surface.mjs -- the SINGLE extraction of this package's real
// exported component surface, shared by every generator that has to describe
// it. Today that is two consumers:
//
//   scripts/generate-component-docs.mjs  -> docs/component-props.md
//   scripts/generate-component-types.mjs -> types/components.d.ts
//
// Both used to be able to drift from each other (two parsers, one truth).
// They cannot now: there is one parser, and both generators render the same
// in-memory model. A signature change moves BOTH artifacts or neither, and
// both have a --check gate, so a stale one fails CI rather than shipping.
//
// The extraction itself is unchanged from the original in-line implementation
// in generate-component-docs.mjs -- see that file's header for the two
// independent, both-real sources it pulls (a JSDoc block if the author wrote
// one, plus the ACTUAL destructured signature scanned out of the real source
// text) and why the signature, not the JSDoc's claim about it, is the
// authority.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = dirname(dirname(fileURLToPath(import.meta.url)));

// CRLF -> LF on read: this repo's Windows checkout has core.autocrlf=true,
// so tracked files check out CRLF while git blobs (and every literal in this
// script) are LF -- normalize on read or line/offset math silently
// misaligns (see generate-ui-kit-scaffolds.mjs's own readNormalized note).
export function readNormalized(p) {
    return readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}

// ---- Step 1: parse the barrel's real `export { A, B, C } from './x.js'`
// blocks into an ordered list of { file, symbols: [name...] } groups. This
// is the authoritative "what's actually shipped" list -- deliberately not a
// re-scan of every export in src/components/*.js, since components.js is
// the curated public surface (some source-file exports are internal helpers
// never re-exported).
function parseBarrel(barrelPath) {
    const barrelSrc = readNormalized(barrelPath);
    const exportBlockRe = /export\s*\{([^}]*)\}\s*from\s*'([^']+)';/g;
    const groups = [];
    let m;
    while ((m = exportBlockRe.exec(barrelSrc))) {
        const symbols = m[1]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            // strip `X as Y` aliasing down to the real exported-from-source name
            .map((s) => (s.includes(' as ') ? s.split(' as ')[0].trim() : s));
        const relFile = m[2].replace(/^\.\//, '');
        groups.push({ file: relFile, symbols });
    }
    return groups;
}

function findJSDocBefore(src, defStart) {
    // Walk backwards from defStart over blank lines / line comments to see
    // if a /** ... */ block ends immediately above the definition.
    let i = defStart;
    while (i > 0 && /\s/.test(src[i - 1])) i--;
    if (src.slice(Math.max(0, i - 2), i) !== '*/') return null;
    const end = i;
    const start = src.lastIndexOf('/**', end);
    if (start === -1) return null;
    return src.slice(start, end);
}

export function parseJSDoc(block) {
    if (!block) return null;
    const lines = block
        .split('\n')
        .map((l) => l.replace(/^\s*\/?\*+\/?/, '').replace(/\*\/\s*$/, '').trim())
        .filter((l, idx, arr) => !(l === '' && (idx === 0 || idx === arr.length - 1)));
    const description = [];
    const params = [];
    let returns = null;
    let example = null;
    let inExample = false;
    for (const line of lines) {
        if (line.startsWith('@param')) {
            // Standard JSDoc shapes: `@param {Type} name - desc` and the
            // optional-param bracket form `@param {Type} [name=default] -
            // desc`. `{Type}` itself may contain nested braces (e.g.
            // `{Array<{sid:*, title?:string}>}`), so it is extracted with a
            // balanced-brace scan rather than a `[^}]*` regex, which would
            // stop at the FIRST inner `}` and corrupt both the type and
            // every token after it. The bracket form's inner `name=default`
            // is unwrapped (both the surrounding [...] and the =default) so
            // downstream drift-checking compares the bare dotted prop path,
            // not the raw bracketed JSDoc token.
            const rest0 = line.slice('@param'.length).trimStart();
            let type = '', afterType = rest0;
            if (rest0.startsWith('{')) {
                let depth = 0, i = 0;
                for (; i < rest0.length; i++) {
                    if (rest0[i] === '{') depth++;
                    else if (rest0[i] === '}') { depth--; if (depth === 0) { i++; break; } }
                }
                type = rest0.slice(1, i - 1);
                afterType = rest0.slice(i).trimStart();
            }
            // The name token itself may be `[props.x='a default with spaces']`
            // -- a plain \S+ match stops at the first space inside the
            // string default, so a bracketed name is located by its own
            // matching `]` first; only a bare (non-bracket) name falls back
            // to a \S+ match.
            let rawName, desc;
            if (afterType.startsWith('[')) {
                // Balanced-bracket scan, not "first ]" -- a bracket-indexed
                // prop name like `[props['aria-label']]` nests its own `]`
                // (closing the string-literal index) before the outer
                // optional-wrapper `]`.
                let bdepth = 0, bi = 0;
                for (; bi < afterType.length; bi++) {
                    if (afterType[bi] === '[') bdepth++;
                    else if (afterType[bi] === ']') { bdepth--; if (bdepth === 0) { bi++; break; } }
                }
                rawName = afterType.slice(0, bi);
                desc = afterType.slice(bi).replace(/^\s*-?\s*/, '');
            } else {
                const nm = afterType.match(/^(\S+)\s*-?\s*(.*)$/);
                rawName = nm ? nm[1] : '';
                desc = nm ? nm[2] : '';
            }
            if (rawName) {
                const bracketMatch = rawName.match(/^\[(.+)\]$/);
                const inner = bracketMatch ? bracketMatch[1] : rawName;
                const name = inner.split('=')[0].trim();
                params.push({ type, name, desc, optional: !!bracketMatch });
            }
            inExample = false;
        } else if (line.startsWith('@returns') || line.startsWith('@return')) {
            returns = line.replace(/^@returns?\s*/, '');
            inExample = false;
        } else if (line.startsWith('@example')) {
            example = '';
            inExample = true;
        } else if (inExample) {
            example += (example ? '\n' : '') + line;
        } else if (!line.startsWith('@')) {
            description.push(line);
        }
    }
    return { description: description.join(' ').trim(), params, returns, example };
}

// Balanced-paren scan starting at the `(` right after `function Name`. Also
// handles the `= {}` default-object suffix that follows the closing `)` on
// destructured-props components. Returns the raw signature text between the
// outer parens (still containing nested `{...}` prop-default braces).
function extractSignature(src, parenStart) {
    let depth = 0;
    let i = parenStart;
    for (; i < src.length; i++) {
        if (src[i] === '(') depth++;
        else if (src[i] === ')') { depth--; if (depth === 0) { i++; break; } }
    }
    const raw = src.slice(parenStart + 1, i - 1);
    // Grab a trailing `= { ... }` (the whole-object default) so `= {}` reads
    // as "no props required" rather than being silently dropped.
    const restMatch = src.slice(i).match(/^\s*=\s*(\{\s*\})/);
    return { raw: raw.trim(), hasDefault: !!restMatch };
}

function stripLineComments(raw) {
    // Multi-line destructured signatures sometimes carry an explanatory `//`
    // comment on its own line between prop groups (e.g. FileGrid's
    // multi-select-contract note) -- strip full-line `//...` comments before
    // depth-tracked splitting, or the comment text gets parsed as prop
    // tokens. Line-based (not a `//` substring strip) so a legitimate
    // `'//'`-containing default value on an otherwise-real prop line is left
    // alone; only lines that are ENTIRELY a comment (after trimming) are
    // dropped, since no real prop declaration in this codebase starts a
    // line with `//`.
    return raw
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
}

// Extract top-level (depth-1) destructured prop names + their default
// values from a `{ a, b = 1, c: { x } = {}, 'aria-label': d }`-shaped raw
// signature. Depth-tracking (not a flat split on ',') is required because
// prop defaults themselves contain object/array literals with their own
// commas (e.g. `actions = FILE_ROW_ACTIONS`, `sessions = []`).
function parseDestructuredProps(raw) {
    raw = stripLineComments(raw).trim();
    if (!raw.startsWith('{')) {
        // Not a destructured single-object param (rare: a couple of
        // components take a plain positional arg, e.g. iconMarkup(name, opts)).
        return raw ? [{ name: raw, positional: true }] : [];
    }
    // Strip outer { }
    let depth = 0, start = -1, end = -1;
    for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '{') { if (depth === 0) start = i; depth++; }
        else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (start === -1 || end === -1) return [];
    const inner = raw.slice(start + 1, end);
    const parts = [];
    let cur = '', d = 0;
    for (const ch of inner) {
        if (ch === '{' || ch === '[' || ch === '(') d++;
        else if (ch === '}' || ch === ']' || ch === ')') d--;
        if (ch === ',' && d === 0) { parts.push(cur); cur = ''; }
        else cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    return parts
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
            const [namePart, ...defParts] = p.split('=');
            const def = defParts.length ? defParts.join('=').trim() : null;
            let name = namePart.trim();
            // rename destructure (`class: className`) -> show as `class` (the
            // real prop key callers pass), noting the local alias.
            let alias = null;
            if (name.includes(':')) {
                const [key, local] = name.split(':').map((s) => s.trim());
                name = key.replace(/^['"]|['"]$/g, '');
                alias = local;
            }
            return { name, default: def, alias };
        });
}

function defRegexFor(name) {
    // Matches: export function Name(  |  export const Name = (  |  const Name = (...) => ...
    return new RegExp(`(?:export\\s+)?function\\s+${name}\\s*\\(|(?:export\\s+)?const\\s+${name}\\s*=`);
}

// One-hop re-export resolution: some barrel-target files (freddie.js) don't
// define a symbol themselves -- they `import { X } from './sub/file.js'`
// then `export { X };` bare (no `from`, so the earlier `export {} from ''`
// regex never sees it). Real shape, not a guess: found live via the drift
// warnings this script itself produces. Resolves the sub-file path relative
// to the importing file's own directory.
function resolveReExportSource(src, name, fromDir) {
    const importRe = new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*'([^']+)'`);
    const im = importRe.exec(src);
    if (!im) return null;
    return join(fromDir, im[1]);
}

/**
 * Extract the whole exported component surface.
 * @returns {{groups: Array, components: Array, driftWarnings: string[], fileOrder: string[]}}
 */
export function extractComponentSurface() {
    const barrelPath = join(root, 'src', 'components.js');
    const groups = parseBarrel(barrelPath);
    if (!groups.length) {
        throw new Error('[component-surface] parsed zero export groups from src/components.js -- barrel shape changed, update the parser');
    }

    const components = [];
    const driftWarnings = [];

    for (const group of groups) {
        const filePath = join(root, 'src', group.file);
        if (!existsSync(filePath)) {
            driftWarnings.push(`components.js re-exports from '${group.file}' but that file does not exist`);
            continue;
        }
        const src = readNormalized(filePath);
        for (const name of group.symbols) {
            const re = defRegexFor(name);
            let dm = re.exec(src);
            let defSrc = src;
            if (!dm) {
                // Try one-hop re-export resolution before giving up.
                const subPath = resolveReExportSource(src, name, dirname(filePath));
                if (subPath && (existsSync(subPath) || existsSync(subPath + '.js'))) {
                    const realSubPath = existsSync(subPath) ? subPath : subPath + '.js';
                    const subSrc = readNormalized(realSubPath);
                    const subMatch = defRegexFor(name).exec(subSrc);
                    if (subMatch) {
                        dm = subMatch;
                        defSrc = subSrc;
                    }
                }
            }
            if (!dm) {
                driftWarnings.push(`'${name}' exported by components.js but no definition found in src/${group.file}`);
                continue;
            }
            const defStart = dm.index;
            const jsdocBlock = findJSDocBefore(defSrc, defStart);
            const jsdoc = parseJSDoc(jsdocBlock);

            let props = [];
            let kind = 'value';
            const isFn = /function\s+\w+\s*\(/.test(dm[0]);
            if (isFn) {
                kind = 'component';
                const parenStart = defSrc.indexOf('(', defStart + dm[0].indexOf(name));
                const { raw } = extractSignature(defSrc, parenStart);
                props = parseDestructuredProps(raw);
            } else {
                // `export const Name = ...` -- could be a factory-wrapped
                // component (`makePage((ctx) => {...})`), a re-export alias
                // (`Card = Panel`), or a plain constant/string. Record the RHS
                // literally so aliases/constants are documented as themselves
                // rather than silently skipped.
                const eqIdx = defSrc.indexOf('=', defStart);
                let rhsEnd = defSrc.indexOf('\n', eqIdx);
                const rhs = defSrc.slice(eqIdx + 1, rhsEnd === -1 ? undefined : rhsEnd).trim();
                if (/^\w+\s*\(/.test(rhs) && !rhs.startsWith('(')) kind = 'const (factory-wrapped)';
                else if (/^[A-Z]\w*;?$/.test(rhs.replace(/;$/, ''))) kind = 'const (alias)';
                else kind = 'const';
                props = [{ name: '(value)', default: rhs.replace(/;$/, ''), alias: null }];
            }

            // Drift check: JSDoc @param names that don't match any real prop.
            if (jsdoc && jsdoc.params.length && isFn) {
                const realNames = new Set(props.map((p) => p.name));
                for (const p of jsdoc.params) {
                    const bare = p.name
                        .replace(/^props\[['"]([^'"]+)['"]\]$/, '$1') // props['aria-label'] -> aria-label
                        .replace(/^props\./, '')
                        .split('.')[0];
                    if (bare && bare !== 'props' && !realNames.has(bare)) {
                        driftWarnings.push(`${name}: JSDoc @param '${p.name}' not found in the real destructured signature (file: src/${group.file})`);
                    }
                }
            }

            components.push({ name, file: group.file, kind, props, jsdoc });
        }
    }

    const fileOrder = [...new Set(groups.map((g) => g.file))];
    return { groups, components, driftWarnings, fileOrder };
}
