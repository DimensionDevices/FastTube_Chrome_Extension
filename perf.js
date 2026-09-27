(function () {
  'use strict';

  // --- 1. Kill heavy CSS effects (keeps background colours intact) ---
  const injectStyle = () => {
    if (document.getElementById('__ytf_perf__')) return;
    const s = document.createElement('style');
    s.id = '__ytf_perf__';
    s.textContent = `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        filter: none !important;
        -webkit-filter: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        box-shadow: none !important;
        text-shadow: none !important;
        will-change: auto !important;
        mix-blend-mode: normal !important;
      }
      html { scroll-behavior: auto !important; }
    `;
    (document.head || document.documentElement).appendChild(s);
  };
  injectStyle();

  // Re-inject if YouTube wipes <head> during SPA navigation
  new MutationObserver(injectStyle).observe(document.documentElement, {
    childList: true, subtree: false
  });

  // --- 2. Clear inline heavy styles on all elements ---
  const PROPS = [
    'animation', 'animationName', 'transition',
    'filter', 'webkitFilter', 'backdropFilter',
    'boxShadow', 'textShadow', 'willChange', 'mixBlendMode'
  ];

  const cleanElement = (el) => {
    const st = el.style;
    if (!st || !st.cssText) return;
    for (const p of PROPS) {
      if (st[p]) st[p] = 'none';
    }
  };

  const cleanAll = (root) => {
    if (root.nodeType === 1) cleanElement(root);
    root.querySelectorAll?.('*').forEach(cleanElement);
  };

  cleanAll(document.documentElement);

  // Watch for new nodes (YouTube constantly re-renders)
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) cleanAll(n);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  // --- 3. Cancel running Web Animations (once DOM is ready) ---
  const killAnimations = () => {
    if (document.getAnimations) {
      document.getAnimations().forEach((a) => {
        try { a.cancel(); } catch (e) {}
      });
    }
  };
  document.addEventListener('DOMContentLoaded', killAnimations, { once: true });

  // --- 4. Neutralise background/ambient videos ---
  const killAmbientVideo = () => {
    document.querySelectorAll('video').forEach((v) => {
      // Leave the main player alone
      if (v.closest('#movie_player')) return;
      try { v.pause(); } catch (e) {}
    });
  };
  document.addEventListener('DOMContentLoaded', () => {
    killAmbientVideo();
    new MutationObserver(killAmbientVideo).observe(document.body, {
      childList: true, subtree: true
    });
  }, { once: true });

  // --- 5. Disable smooth scrolling behaviour on SPA nav ---
  const origScrollTo = window.scrollTo;
  window.scrollTo = function (...args) {
    if (typeof args[0] === 'object' && args[0].behavior === 'smooth') {
      args[0].behavior = 'auto';
    }
    return origScrollTo.apply(this, args);
  };
})();