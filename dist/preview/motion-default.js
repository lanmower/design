// Preview entrance motion — SDK-native, zero network.
//
// WHY THIS DOES NOT LOAD animate.css: it used to inject
// https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css at
// runtime and apply `animate__*` classes. That contradicted the SDK's own
// documented position (src/motion.js:1-2: "the SDK historically wired
// animate.css for entry flourishes. We tone this down: no animate.css"), made
// every preview page depend on a third-party CDN for decoration, and was the
// sole cause of a cross-origin SecurityError when reading document.styleSheets
// (the CDN sheet is opaque to same-origin cssRules access). Worse, the link was
// injected even under `prefers-reduced-motion: reduce`, where no animation
// would ever play — pure privacy and latency cost for zero benefit.
//
// The replacement uses the SAME mechanism as the real SDK: a `data-anim`
// in -> ready transition driven by --dur-reveal / --ease / --ease-spring,
// wrapped in `prefers-reduced-motion: no-preference` so the animated block
// simply does not exist for users who asked for less motion.
(function () {
  function reduced() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // The entrance rule. Mirrors src/motion.js's [data-anim] contract rather than
  // inventing a second one, so a preview animates exactly like a real SDK
  // surface. --anim-delay is a per-element custom property (the stagger), which
  // is why this is a stylesheet and not an inline transition string.
  function installMotionStyle() {
    if (document.getElementById('preview-motion-vars')) return;
    var style = document.createElement('style');
    style.id = 'preview-motion-vars';
    style.textContent = [
      '@media (prefers-reduced-motion: no-preference){',
      '[data-anim="in"]{opacity:0;transform:translateY(10px);',
      'transition:opacity var(--dur-reveal,560ms) var(--ease,cubic-bezier(.2,0,0,1)) var(--anim-delay,0ms),',
      'transform var(--dur-reveal,560ms) var(--ease-spring,cubic-bezier(.34,1.56,.64,1)) var(--anim-delay,0ms);}',
      '[data-anim="ready"]{opacity:1;transform:translateY(0);}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  // Stagger ceiling: past a handful of elements a per-index delay stops reading
  // as rhythm and starts reading as lag, so it clamps (same shape as
  // src/motion.js's Math.min(i, 6)).
  var STAGGER_MS = 40;
  var STAGGER_MAX = 8;

  function animateEntry(el, cfg, i) {
    if (!el || !el.dataset) return;
    if (el.dataset.anim) return;
    if (cfg.stagger) {
      el.style.setProperty('--anim-delay', (Math.min(i, STAGGER_MAX) * STAGGER_MS) + 'ms');
    }
    el.dataset.anim = 'in';
    // Flip on the next frame so the browser paints the `in` state first;
    // setting both in one frame yields no transition at all.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.dataset.anim = 'ready'; });
    });
  }

  function runList(selector, cfg) {
    Array.prototype.slice.call(document.querySelectorAll(selector))
      .forEach(function (el, i) { animateEntry(el, cfg, i); });
  }

  function runAllChildren(cfg) {
    var n = 0;
    Array.prototype.slice.call(document.body.children || []).forEach(function (el) {
      if (!el || !el.tagName) return;
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return;
      animateEntry(el, cfg, n);
      n += 1;
    });
  }

  // Per-page entrance targets. The effect vocabulary is gone: every entrance is
  // now the one house reveal (fade + spring rise), because a preview page's job
  // is to demonstrate the design system's motion, not a CDN library's presets.
  function presetForPage(file) {
    var presets = {
      'buttons.html': ['button, .btn, .btn-primary, .btn-ghost'],
      'colors-core.html': ['.sw'],
      'colors-lore.html': ['body > div:nth-of-type(2) > div'],
      'colors-semantic.html': ['body > div:nth-of-type(2) > div'],
      'dateline.html': ['.dateline'],
      'header.html': ['.app-topbar', '.app-crumb'],
      'icons-unicode.html': ['body > div:nth-of-type(2) > div'],
      'index-row.html': ['.row'],
      'inputs.html': ['.input, .t-label'],
      'manifesto.html': ['.prin'],
      'rules.html': ['.rule, .rule-double, .rule-dotted'],
      'spacing.html': ['body > div:nth-of-type(2) > div'],
      'stamps-lore.html': ['.stamp, .btn-stamp'],
      'stamps.html': ['.stamp'],
      'theme-ink.html': ['body > *'],
      'type-display.html': ['.t-hero, .t-h1'],
      'type-mono.html': ['body > div:nth-of-type(2) > div'],
      'type-prose.html': ['.prose p'],
      'type-scale.html': ['body > div:nth-of-type(2) > div'],
      'wordmarks.html': ['body > div:nth-of-type(2) > div']
    };
    return presets[file] || null;
  }

  function applyDefaults() {
    if (reduced()) return;

    var file = (window.location.pathname.split('/').pop() || '').toLowerCase();
    var preset = presetForPage(file);

    if (!preset) {
      runAllChildren({ stagger: true });
      return;
    }

    preset.forEach(function (selector) {
      runList(selector, { stagger: true });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    installMotionStyle();
    applyDefaults();
  }, { once: true });
})();
