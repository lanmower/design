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
//   community-app   -- data-theme="ink" on <body> (not <html data-theme="auto">), 5 stylesheets.
//                      The sole community/chat-application kit -- demos the real
//                      mountCommunityApp adapter-driven product (the same function
//                      zellous consumes). A standalone ui_kits/community kit that
//                      hand-composed CommunityShell + fake message data was merged
//                      away here since it only duplicated a subset of this kit's
//                      real, working reference adapter.
//   workspace       -- links chat.css + app-surfaces.css (AgentChat), not in this shape
//   os              -- desktop-shell demo (createDesktopShell + wm + registry), links
//                      src/kits/os/theme.css + app-panes.css directly, not app-shell.css
//   component_explorer -- interactive props reference, fetches manifest.json at runtime,
//                      carries its own inline <style> block for explorer-specific classes
//
// Each entry maps 1:1 to the template's {{...}} placeholders. `htmlTheme`
// controls whether <html> gets data-theme="auto"; `themeColorMetas` controls
// whether the two theme-color <meta> tags are emitted. These are independent:
// chat omits only the html attr (keeps the metas), and every other thin kit
// carries both. `stylesheets`
// is the ordered list of extra .css files linked after the base
// colors_and_type.css + app-shell.css pair (both always present). `seo` is an
// optional block of extra <meta>/<link> tags emitted between the description
// and the canonical link, verbatim, for the couple of kits that carry a
// fuller SEO suite than the plain thin shell. `importExtra` appends extra
// importmap entries (ds/, webjsx-router) after the always-present
// webjsx/webjsx-jsx-runtime trio.

export const kits = [
  {
    id: 'buttons',
    title: 'Buttons',
    description: 'buttons ui kit — every variant, size, and state: primary, secondary, ghost, link, danger, loading, disabled.',
    screenLabel: '17 Buttons',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'aicat',
    title: 'AICat',
    description: 'aicat ui kit — ai assistant chat with cat persona, ascii portrait, thinking dots.',
    screenLabel: '07 AICat',
    htmlTheme: true,
    themeColorMetas: true,
    // AICat renders through ChatComposer + the chat-message-parts tool/stream
    // blocks, whose .chat-tool-*/.chat-stream-*/.chat-thinking-*/
    // .chat-composer-toolbar rules live only in chat.css (app-shell's
    // chat-basic/chat-polish cover the bubble/thread layer, not these).
    // ChatComposer also mounts EmojiPicker + CommandPalette from
    // overlay-primitives, styled by editor-primitives.css's .ov-emoji-*/
    // .ov-cmd-* families.
    stylesheets: ['chat.css', 'editor-primitives.css'],
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
    title: 'Gallery',
    description: 'gallery ui kit — visual grid, lightbox, tonal cards.',
    screenLabel: '14 Gallery',
    htmlTheme: true,
    themeColorMetas: true,
    // Lightbox is Dialog (editor-primitives/modals.js), whose .ds-ep-dialog*
    // chrome (backdrop, card, head/body/actions) lives only in
    // editor-primitives.css.
    stylesheets: ['editor-primitives.css'],
    importExtra: ['ds/'],
  },
  {
    id: 'search',
    title: 'Search',
    description: 'search ui kit — query bar, faceted filters, ranked results.',
    screenLabel: '12 Search',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'settings ui kit — sectioned forms, toggles, inputs, save bar.',
    screenLabel: '10 Settings',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'slide_deck',
    title: 'Slide Deck',
    description: '16:9 slide deck template — keyboard nav, slide counter, SDK chrome.',
    screenLabel: '17 Slide Deck',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'system_primer',
    title: 'System Primer',
    description: 'design system showcase — palette swatches, type scale, primitives in one page.',
    screenLabel: '16 System Primer',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'terminal',
    title: 'Terminal',
    description: 'terminal ui kit — cli prompt, command lines, log viewer.',
    screenLabel: '09 Terminal',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: [],
    importExtra: ['ds/'],
  },
  {
    id: 'chat',
    title: 'Chat',
    description: 'chat ui kit — message thread + composer, tonal pill bubbles, monospace meta.',
    screenLabel: '06 Chat',
    htmlTheme: false, // no data-theme attr, but DOES carry theme-color metas — unique combo, unlike community which omits both
    themeColorMetas: true,
    // Same pair as aicat: Chat()/ChatComposer emit the chat.css-only
    // tool/stream/thinking/composer-toolbar families, and ChatComposer's
    // EmojiPicker/CommandPalette need editor-primitives' .ov-* rules.
    stylesheets: ['chat.css', 'editor-primitives.css'],
    importExtra: ['ds/'],
  },
  {
    id: 'gm_inspector',
    title: 'GM Inspector',
    description: 'gm inspector ui kit — session list, process tree, deviations, PRD/mutable editors, query builder, built from AppShell + the data-density component family.',
    screenLabel: 'gm inspector',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: ['editor-primitives.css'],
    importExtra: ['ds/'],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'dashboard ui kit — kpis, tables, receipts, changelog, panels.',
    screenLabel: '08 Dashboard',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: ['editor-primitives.css'],
    importExtra: ['ds/'],
  },
  {
    id: 'signin',
    title: 'Sign in',
    description: 'signin ui kit — authentication panel, providers, tone-on-tone form.',
    screenLabel: '11 Sign in',
    htmlTheme: true,
    themeColorMetas: true,
    stylesheets: ['editor-primitives.css'],
    importExtra: ['ds/'],
  },
  {
    id: 'homepage',
    title: 'Homepage',
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
    title: 'File Browser',
    description: 'file-browser surface — rails by file type, drop-zone upload, modal preview.',
    screenLabel: '08 File Browser',
    htmlTheme: true,
    themeColorMetas: true,
    // Most file-browser primitives live in app-shell's files.css, but eight
    // classes this kit renders sit only in chat.css: .ds-file-more/-count/
    // -btn (FileGrid's overflow footer) and .ds-preview-step/-gutter/
    // -code-wrap/-code-head/-media-alpha (FileViewer + FilePreviewCode/Media).
    stylesheets: ['chat.css'],
    importExtra: [],
    seo: {
      author: '247420 / AnEntrypoint',
      ogSimple: true, // og:type/title/description/url/site_name + robots, no image/twitter
    },
  },
];
