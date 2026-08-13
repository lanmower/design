#!/usr/bin/env node
// Thin CLI entry: delegates to the lint-css.mjs orchestrator, which imports
// every rule module's exported check function and runs them all in one pass
// (see lint-css.mjs for the CHECKS list and shared reporting).
//
// Run: `node scripts/lint.mjs` (also wired as `npm run lint`).
import { runLintCss } from './lint-css.mjs';

runLintCss();
