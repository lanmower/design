#!/usr/bin/env node
// generate-component-manifest.mjs -- generates ui_kits/component_explorer/manifest.json
// from the same extractComponentSurface() model generate-component-docs.mjs and
// generate-component-types.mjs already share, so the interactive explorer, the
// prose doc, and the TypeScript declarations describe one identical component
// list rather than a fourth parser that can drift from the other three.
//
// Run: node scripts/generate-component-manifest.mjs
// Add --check to verify the manifest already matches generated output
// (exits 1 on drift) instead of writing -- CI/lint-gate usage.
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractComponentSurface, root } from './component-surface.mjs';

const CHECK = process.argv.includes('--check');
const outPath = join(root, 'ui_kits', 'component_explorer', 'manifest.json');

let surface;
try {
    surface = extractComponentSurface();
} catch (e) {
    console.error('[component-manifest] extraction failed:', e.message);
    process.exit(1);
}

const manifest = {
    generatedNote: 'Generated from src/components.js + src/components/*.js via node scripts/generate-component-manifest.mjs. Do not hand-edit.',
    components: surface.components.map((c) => ({
        name: c.name,
        file: c.file,
        kind: c.kind,
        props: c.props,
        description: c.jsdoc ? c.jsdoc.description : '',
    })),
};

const json = JSON.stringify(manifest, null, 2) + '\n';

if (CHECK) {
    if (!existsSync(outPath)) {
        console.error(`[component-manifest] FAIL -- ${outPath} does not exist. Run: node scripts/generate-component-manifest.mjs`);
        process.exit(1);
    }
    const current = readFileSync(outPath, 'utf8');
    if (current !== json) {
        console.error(`[component-manifest] FAIL -- ${outPath} is stale. Run: node scripts/generate-component-manifest.mjs`);
        process.exit(1);
    }
    console.log(`[component-manifest] ${outPath} is up to date (${manifest.components.length} components)`);
    process.exit(0);
}

writeFileSync(outPath, json);
console.log(`[component-manifest] wrote ${outPath} (${manifest.components.length} components)`);
