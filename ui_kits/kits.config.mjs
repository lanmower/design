// ui_kits/kits.config.mjs -- per-kit config consumed by
// scripts/generate-ui-kit-scaffolds.mjs to regenerate the ~16 "thin" kit
// index.html shells (colors_and_type.css + app-shell.css [+ a couple extra
// sheets], empty #root mount, no hand-authored body markup) from
// ui_kits/_template/index.html.
//
// Kits NOT listed here are outliers with genuinely custom index.html markup
// (full inline SEO suites with hand-authored bodies, extra stylesheets tied
// to bespoke components, non-standard theme wiring) and must stay hand-edited:
//   blog            -- hand-authored body (topbar/breadcrumb/article), no importmap block
//   docs            -- hand-authored body (topbar/breadcrumb/sidebar nav), no importmap block
//   community-app   -- data-theme="ink" on <body> (not <html data-theme="auto">), 5 stylesheets
//   workspace       -- links chat.css + app-surfaces.css (AgentChat), not in this shape
//
// Each entry maps 1:1 to the template's {{...}} placeholders. `htmlTheme`
// controls whether <html> gets data-theme="auto"; `themeColorMetas` controls
// whether the two theme-color <meta> tags are emitted. These are independent:
// community omits both, chat omits only the html attr (keeps the metas), and
// every other thin kit carries both. `stylesheets`
// is the ordered list of extra .css files linked after the base
// colors_and_type.css + app-shell.css pair (both always present). `seo` is an
// optional block of extra <meta>/<link> tags emitted between the description
// and the canonical link, verbatim, for the couple of kits that carry a
// fuller SEO suite than the plain thin shell. `importExtra` appends extra
// importmap entries (ds/, webjsx-router) after the always-present
// webjsx/webjsx-jsx-runtime trio.

export const kits = [
  {
    id: 'aicat',
    title: 'aicat',
    description: 'aicat ui kit — ai assistant chat with cat persona, ascii portrait, thinking dots.',
    screenLabel: '07 AICat',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'error_404',
    title: '404',
    description: '404 ui kit — empty-state hero with suggested routes.',
    screenLabel: '13 404',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'gallery',
    title: 'gallery',
    description: 'gallery ui kit — visual grid, lightbox, tonal cards.',
    screenLabel: '14 Gallery',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'search',
    title: 'search',
    description: 'search ui kit — query bar, faceted filters, ranked results.',
    screenLabel: '12 Search',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'settings',
    title: 'settings',
    description: 'settings ui kit — sectioned forms, toggles, inputs, save bar.',
    screenLabel: '10 Settings',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'slide_deck',
    title: 'slide deck',
    description: '16:9 slide deck template — keyboard nav, slide counter, SDK chrome.',
    screenLabel: '17 Slide Deck',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'system_primer',
    title: 'system primer',
    description: 'design system showcase — palette swatches, type scale, primitives in one page.',
    screenLabel: '16 System Primer',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'terminal',
    title: 'terminal',
    description: 'terminal ui kit — cli prompt, command lines, log viewer.',
    screenLabel: '09 Terminal',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'chat',
    title: 'chat',
    description: 'chat ui kit — message thread + composer, tonal pill bubbles, monospace meta.',
    screenLabel: '06 Chat',
    htmlTheme: false, // no data-theme attr, but DOES carry theme-color metas — unique combo, unlike community which omits both
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'gm_inspector',
    title: 'gm inspector',
    description: 'gm inspector ui kit -- session list, process tree, deviations, PRD/mutable editors, query builder, built from AppShell + the data-density component family.',
    screenLabel: 'gm inspector',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: ['editor-primitives.css'],
    importExtra: ['ds/'],
  },
  {
    id: 'dashboard',
    title: 'dashboard',
    description: 'dashboard ui kit — kpis, tables, receipts, changelog, panels.',
    screenLabel: '08 Dashboard',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: ['editor-primitives.css'],
    importExtra: ['ds/'],
  },
  {
    id: 'signin',
    title: 'signin',
    description: 'signin ui kit — authentication panel, providers, tone-on-tone form.',
    screenLabel: '11 Sign in',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: ['editor-primitives.css'],
    importExtra: ['ds/'],
  },
  {
    id: 'homepage',
    title: 'homepage',
    description: 'landing surface for the 247420 collective — works, writing, manifesto.',
    screenLabel: '01 Homepage',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['webjsx-router', 'ds/'],
    seo: {
      author: '247420 / AnEntrypoint',
      keywords: '247420, anentrypoint, design system, webjsx, rippleui, creative collective',
      ogImage: true,
      twitter: true,
    },
  },
  {
    id: 'project_page',
    title: 'project / gm ·',
    titleSuffixed: true, // title already reads "project / gm · 247420" verbatim, don't append " / 247420" again
    description: 'generic project landing template — install, receipt, changelog, docs sidebar.',
    screenLabel: '02 Project Page',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['webjsx-router', 'ds/'],
    seo: {
      author: '247420 / AnEntrypoint',
      keywords: '247420, anentrypoint, design system, webjsx, rippleui, creative collective',
      ogImage: true,
      twitter: true,
    },
  },
  {
    id: 'file_browser',
    title: 'file browser',
    description: 'file-browser surface — rails by file type, drop-zone upload, modal preview.',
    screenLabel: '08 File Browser',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: [],
    seo: {
      author: '247420 / AnEntrypoint',
      ogSimple: true, // og:type/title/description/url/site_name + robots, no image/twitter
    },
  },
  {
    id: 'community',
    title: 'community',
    description: 'community shell — server rail, channel sidebar, member list, voice strip.',
    screenLabel: '07 Community',
    htmlTheme: false, // no data-theme attr — one of two thin kits that omit it
    themeColorMetas: false, // no theme-color metas either — community omits both
    stylesheets: [],
    importExtra: ['ds/'],
  },
];
