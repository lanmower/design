---
key: mem-2cdcea68e385ee6f-930
ns: default
created: 1783327176915
updated: 1783327176915
---

247420-family project fact: Legacy Interactive Page Wrap pattern -- when a portfolio repo has legacy docs/*.html pages with their own <style>/<script>/importmap, wrapping them as gm-style article extraction (body unwrap) breaks interactivity. Use iframe embed inside SDK shell instead: flatspace theme.mjs assets: map copies ../docs/<page> to _legacy/<page> (plus sibling deps like vendor/, css/, js/); theme render emits a wrapper page at the original URL with SDK Topbar+Crumb+Footer and main: C.Panel({ children: h('iframe', { src: '<rel-path-to-_legacy>', style: 'width:100%;height:calc(100vh - 180px);min-height:520px;border:0' }) }). embedSrc resolves relative to wrapper path: ./_legacy/foo.html for top-level, ../_legacy/foo/index.html for nested. Trade-off: loses content height auto-sizing. Use article extraction only for static prose papers. Applied to thebird/todo, thebird/preview, agentgui/demo, zellous/nostr-chat.
