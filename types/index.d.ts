// types/index.d.ts -- GENERATED, do not hand-edit.
//
// The package entry surface, enumerated from src/index.js's real export
// statements by `node scripts/generate-component-types.mjs`. Component
// props live in ./components.d.ts, generated from the same extraction as
// docs/component-props.md. `npm run lint:component-types` fails CI when
// either file is stale.

export * from './components.js';
import type { VNode } from './components.js';
export type { VNode };

/** Every component in the SDK, keyed by name (`components.AppShell({...})`). */
export declare const components: typeof import('./components.js');

export declare function applyTheme(...args: any[]): any;
export declare function getTheme(...args: any[]): any;
export declare function resolvedTheme(...args: any[]): any;
export declare function onThemeChange(...args: any[]): any;
export declare function initTheme(...args: any[]): any;
export declare function applyAccent(...args: any[]): any;
export declare function getAccent(...args: any[]): any;
export declare function applyDensity(...args: any[]): any;
export declare function getDensity(...args: any[]): any;
export declare function extractAtQuery(...args: any[]): any;
export declare function buildEntriesFromFiles(...args: any[]): any;
export declare function filterFileEntries(...args: any[]): any;
export declare function buildAtInsertText(...args: any[]): any;
export declare function buildAtMentionText(...args: any[]): any;
export declare function buildFileAtMentionsText(...args: any[]): any;
export declare function renderLoadingScreen(...args: any[]): any;
export declare function renderGameHud(...args: any[]): any;
export declare function Crosshair(...args: any[]): any;
export declare function AmmoCounter(...args: any[]): any;
export declare function HealthBar(...args: any[]): any;
export declare function BoostIndicator(...args: any[]): any;
export declare function renderHostJoinLobby(...args: any[]): any;
export declare function createDamageNumbers(...args: any[]): any;
export declare function ResetButton(...args: any[]): any;
export declare function UndoHistoryPanel(...args: any[]): any;
export declare function LivePreviewControls(...args: any[]): any;
export declare const webjsx: Record<string, any>;
export declare function loadCss(...args: any[]): any;
export declare function registerDeckStage(...args: any[]): Promise<any>;
export declare function getDeckStage(...args: any[]): any;
export declare class Router { constructor(...args: any[]); [key: string]: any; }
export declare function createRouter(...args: any[]): any;
export declare const motion: Record<string, any>;
export declare function mountKit(...args: any[]): any;
export declare function renderMarkdown(...args: any[]): Promise<any>;
export declare function ensureMarkdownReady(...args: any[]): any;
export declare function sanitizeHtml(...args: any[]): Promise<any>;
export declare function isMarkdownDegraded(...args: any[]): any;
export declare function configureMarkdownCdn(...args: any[]): any;
export declare function getMarkdownCdnConfig(...args: any[]): any;
export declare function ensurePrism(...args: any[]): Promise<any>;
export declare function highlightAllUnder(...args: any[]): Promise<any>;
export declare function configurePrismCdn(...args: any[]): any;
export declare function getPrismCdnConfig(...args: any[]): any;
export declare function ensureMermaid(...args: any[]): Promise<any>;
export declare function renderMermaid(...args: any[]): Promise<any>;
export declare function renderMermaidBlocksUnder(...args: any[]): Promise<any>;
export declare function configureMermaidCdn(...args: any[]): any;
export declare function getMermaidCdnConfig(...args: any[]): any;
export declare function ensureKatex(...args: any[]): Promise<any>;
export declare function renderMathBlocksUnder(...args: any[]): Promise<any>;
export declare function configureKatexCdn(...args: any[]): any;
export declare function getKatexCdnConfig(...args: any[]): any;
export declare function registerChatElement(...args: any[]): any;
export declare function DsChat(...args: any[]): any;
export declare function registerFreddieChatElement(...args: any[]): any;
export declare function FreddieChat(...args: any[]): any;
export declare function renderPageHtml(...args: any[]): any;
export declare function escapeHtml(...args: any[]): any;
export declare function escapeJson(...args: any[]): any;
export declare function uid(...args: any[]): any;
export declare function shortUid(...args: any[]): any;
export declare const theme: Record<string, any>;
export declare function t(...args: any[]): any;
export declare function registerLocale(...args: any[]): any;
export declare function getLocale(...args: any[]): any;
export declare function setLocale(...args: any[]): any;
export declare function availableLocales(...args: any[]): any;
export declare function formatTime(...args: any[]): any;
export declare function formatDateTime(...args: any[]): any;
export declare function formatNumber(...args: any[]): any;
export declare function formatRelativeTime(...args: any[]): any;
export declare function queueMessage(...args: any[]): Promise<any>;
export declare function listQueued(...args: any[]): Promise<any>;
export declare function flushQueue(...args: any[]): Promise<any>;
export declare function watchReconnect(...args: any[]): any;
export declare function isOnline(...args: any[]): any;
export declare function createVirtualizer(...args: any[]): any;
export declare function measureRef(...args: any[]): any;
export declare function applyMotion(...args: any[]): any;
export declare function getMotion(...args: any[]): any;
export declare function isMotionReduced(...args: any[]): any;
export declare function onMotionChange(...args: any[]): any;
export declare function initMotion(...args: any[]): any;
export declare function installStyles(...args: any[]): Promise<any>;
export declare function mount(...args: any[]): any;
export declare function h(...args: any[]): any;
export declare function applyDiff(...args: any[]): any;

/** The scope class every SDK stylesheet rule is prefixed with. */
export declare const scope: string;

declare const _default: Record<string, any>;
export default _default;
