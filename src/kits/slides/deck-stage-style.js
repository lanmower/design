export const STYLESHEET = `
    :host {
      position: fixed;
      inset: 0;
      display: block;
      background: var(--panel-0, #000);
      color: var(--panel-text, #fff);
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      overflow: hidden;
    }
    .stage { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .canvas {
      position: relative;
      transform-origin: center center;
      flex-shrink: 0;
      background: var(--panel-1, #fff);
      will-change: transform;
    }
    ::slotted(*) {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    ::slotted([data-deck-active]) { opacity: 1; pointer-events: auto; visibility: visible; }
    /* These stack only against each other: :host is position:fixed, so the
       shadow root is its own stacking context and the old max-int values
       bought nothing over the scale's rungs. Controls sit above tap zones. */
    .tapzones {
      position: fixed; inset: 0; display: flex; z-index: var(--z-raised); pointer-events: none;
    }
    .tapzone { flex: 1; pointer-events: auto; -webkit-tap-highlight-color: transparent; }
    @media (hover: hover) and (pointer: fine) { .tapzones { display: none; } }
    .overlay {
      position: fixed;
      left: 50%; bottom: 22px;
      transform: translate(-50%, 6px) scale(0.92);
      filter: blur(6px);
      display: flex; align-items: center;
      gap: 4px; padding: 4px;
      background: var(--scrim-media, rgba(19,19,24,0.85)); color: var(--on-color, #fff);
      border-radius: 999px;
      font-size: 14px;
      font-feature-settings: "tnum" 1;
      letter-spacing: 0.01em;
      opacity: 0; pointer-events: none;
      transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
      transform-origin: center bottom;
      z-index: var(--z-sticky);
      user-select: none;
    }
    .overlay[data-visible] {
      opacity: 1; pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
      filter: blur(0);
    }
    .btn {
      appearance: none; -webkit-appearance: none;
      background: transparent; border: 0; margin: 0; padding: 0;
      color: inherit; font: inherit; cursor: default;
      display: inline-flex; align-items: center; justify-content: center;
      height: 28px; min-width: 28px;
      border-radius: 999px;
      color: color-mix(in oklab, var(--on-color, #fff) 72%, transparent);
      transition: background 140ms ease, color 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover { background: color-mix(in oklab, var(--on-color, #fff) 12%, transparent); color: var(--on-color, #fff); }
    .btn:active { background: color-mix(in oklab, var(--on-color, #fff) 18%, transparent); }
    .btn:focus, .btn:focus-visible { outline: none; }
    .btn::-moz-focus-inner { border: 0; }
    .btn svg { width: 14px; height: 14px; display: block; }
    .btn.reset {
      font-size: 13px; font-weight: 500; letter-spacing: 0.02em;
      padding: 0 10px 0 12px; gap: 6px;
      color: color-mix(in oklab, var(--on-color, #fff) 72%, transparent);
    }
    .btn.reset .kbd {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 16px; height: 16px; padding: 0 4px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 12px; line-height: 1;
      color: color-mix(in oklab, var(--on-color, #fff) 88%, transparent);
      background: color-mix(in oklab, var(--on-color, #fff) 12%, transparent);
      border-radius: 4px;
    }
    .count {
      font-variant-numeric: tabular-nums;
      color: var(--on-color, #fff); font-weight: 500;
      padding: 0 8px; min-width: 42px;
      text-align: center; font-size: 14px;
    }
    .count .sep { color: color-mix(in oklab, var(--on-color, #fff) 45%, transparent); margin: 0 3px; font-weight: 400; }
    .count .total { color: color-mix(in oklab, var(--on-color, #fff) 55%, transparent); }
    .divider { width: 1px; height: 14px; background: color-mix(in oklab, var(--on-color, #fff) 18%, transparent); margin: 0 2px; }
    @media print {
      :host { position: static; inset: auto; background: none; overflow: visible; color: inherit; }
      .stage { position: static; display: block; }
      .canvas { transform: none !important; width: auto !important; height: auto !important; background: none; will-change: auto; }
      ::slotted(*) {
        position: relative !important;
        inset: auto !important;
        width: var(--deck-design-w) !important;
        height: var(--deck-design-h) !important;
        box-sizing: border-box !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto;
        break-after: page; page-break-after: always; break-inside: avoid;
        overflow: hidden;
      }
      ::slotted(*:last-child) { break-after: auto; page-break-after: auto; }
      .overlay, .tapzones { display: none !important; }
    }
`;
