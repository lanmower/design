(function () {
  function reduced() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function loadAnimateCss() {
    if (document.getElementById('animate-style-cdn')) return;
    var link = document.createElement('link');
    link.id = 'animate-style-cdn';
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css';
    document.head.appendChild(link);
  }

  function installTokens() {
    if (document.getElementById('preview-motion-vars')) return;
    var style = document.createElement('style');
    style.id = 'preview-motion-vars';
    style.textContent = [
      ':root{--motion-fast:220ms;--motion-base:420ms;--motion-slow:720ms;--motion-step:70ms;}',
      '@media (prefers-reduced-motion: reduce){.animate__animated{animation-duration:1ms !important;animation-iteration-count:1 !important;transition-duration:1ms !important;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function animateEntry(el, cfg, i) {
    if (!el || !el.classList) return;
    var effect = cfg.effect || 'fadeInUp';
    var duration = cfg.duration || 'var(--motion-base)';
    var delay = cfg.stagger ? ('calc(' + i + ' * var(--motion-step))') : (cfg.delay || '0ms');

    el.classList.add('animate__animated', 'animate__' + effect);
    el.style.setProperty('--animate-duration', duration);
    if (delay && delay !== '0ms') el.style.setProperty('--animate-delay', delay);
  }

  function runList(selector, cfg) {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(selector));
    nodes.forEach(function (el, i) {
      animateEntry(el, cfg, i);
    });
  }

  function runAllChildren(cfg) {
    var nodes = Array.prototype.slice.call(document.body.children || []);
    var n = 0;
    nodes.forEach(function (el) {
      if (!el || !el.classList) return;
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      animateEntry(el, cfg, n);
      n += 1;
    });
  }

  function presetForPage(file) {
    var presets = {
      'buttons.html': [{ selector: 'button, .btn, .btn-primary, .btn-ghost', effect: 'fadeInUp', duration: 'var(--motion-fast)', stagger: true }],
      'colors-core.html': [{ selector: '.sw', effect: 'fadeIn', duration: 'var(--motion-base)', stagger: true }],
      'colors-lore.html': [{ selector: 'body > div:nth-of-type(2) > div', effect: 'zoomIn', duration: 'var(--motion-base)', stagger: true }],
      'colors-semantic.html': [{ selector: 'body > div:nth-of-type(2) > div', effect: 'fadeInUp', duration: 'var(--motion-fast)', stagger: true }],
      'dateline.html': [{ selector: '.dateline', effect: 'fadeInDown', duration: 'var(--motion-fast)', stagger: true }],
      'header.html': [
        { selector: '.app-topbar', effect: 'fadeInDown', duration: 'var(--motion-fast)' },
        { selector: '.app-crumb', effect: 'fadeIn', duration: 'var(--motion-base)', delay: '120ms' }
      ],
      'icons-unicode.html': [{ selector: 'body > div:nth-of-type(2) > div', effect: 'fadeIn', duration: 'var(--motion-fast)', stagger: true }],
      'index-row.html': [{ selector: '.row', effect: 'fadeInLeft', duration: 'var(--motion-fast)', stagger: true }],
      'inputs.html': [{ selector: '.input, .t-label', effect: 'fadeInUp', duration: 'var(--motion-fast)', stagger: true }],
      'manifesto.html': [{ selector: '.prin', effect: 'fadeInUp', duration: 'var(--motion-base)', stagger: true }],
      'rules.html': [{ selector: '.rule, .rule-double, .rule-dotted', effect: 'fadeIn', duration: 'var(--motion-fast)', stagger: true }],
      'spacing.html': [{ selector: 'body > div:nth-of-type(2) > div', effect: 'fadeInRight', duration: 'var(--motion-fast)', stagger: true }],
      'stamps-lore.html': [{ selector: '.stamp, .btn-stamp', effect: 'jackInTheBox', duration: 'var(--motion-base)', stagger: true }],
      'stamps.html': [{ selector: '.stamp', effect: 'jackInTheBox', duration: 'var(--motion-base)', stagger: true }],
      'theme-ink.html': [{ selector: 'body > *', effect: 'fadeIn', duration: 'var(--motion-base)', stagger: true }],
      'type-display.html': [{ selector: '.t-hero, .t-h1', effect: 'fadeInUp', duration: 'var(--motion-base)', stagger: true }],
      'type-mono.html': [{ selector: 'body > div:nth-of-type(2) > div', effect: 'fadeIn', duration: 'var(--motion-fast)', stagger: true }],
      'type-prose.html': [{ selector: '.prose p', effect: 'fadeIn', duration: 'var(--motion-base)', stagger: true }],
      'type-scale.html': [{ selector: 'body > div:nth-of-type(2) > div', effect: 'fadeIn', duration: 'var(--motion-fast)', stagger: true }],
      'wordmarks.html': [{ selector: 'body > div:nth-of-type(2) > div', effect: 'fadeInUp', duration: 'var(--motion-fast)', stagger: true }]
    };

    return presets[file] || null;
  }

  function applyDefaults() {
    if (reduced()) return;

    var file = (window.location.pathname.split('/').pop() || '').toLowerCase();
    var preset = presetForPage(file);

    if (!preset) {
      runAllChildren({ effect: 'fadeInUp', duration: 'var(--motion-base)', stagger: true });
      return;
    }

    preset.forEach(function (cfg) {
      runList(cfg.selector, cfg);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadAnimateCss();
    installTokens();
    applyDefaults();
  }, { once: true });
})();
