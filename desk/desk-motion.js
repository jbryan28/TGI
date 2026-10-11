(() => {
  'use strict';
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window) || !('animate' in Element.prototype)) return;

  // Content remains visible without JavaScript or if observation fails.
  const selectors = [
    '.desk-hero-copy > .eyebrow', '.desk-hero-copy > h1', '.desk-hero-copy > .desk-lead', '.desk-preview',
    '.desk-section:not(.desk-disclaimer) > .eyebrow', '.desk-section:not(.desk-disclaimer) > h2', '.desk-intro',
    '.desk-grid article', '.desk-coverage-heading', '.desk-market-groups li',
    '.desk-workflow > div', '.desk-workflow li', '.desk-founder > img', '.desk-founder > div',
    '.desk-fit article', '.desk-pricing > div', '.desk-pricing > aside'
  ];
  const elements = [...document.querySelectorAll(selectors.join(','))];
  const running = new Map();
  const groups = new WeakMap();
  let observer;
  const stop = () => {
    observer?.disconnect();
    running.forEach(animation => animation.cancel());
    running.clear();
  };

  try {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (preference.matches || entry.target.contains(document.activeElement)) return;
        const element = entry.target;
        const animation = element.animate([
          { opacity: 0.08, transform: 'translateY(20px)' },
          { opacity: 1, transform: 'none' }
        ], {
          duration: 620,
          delay: Number(element.dataset.deskMotionDelay || 0),
          easing: 'cubic-bezier(.22,1,.36,1)',
          fill: 'backwards'
        });
        running.set(element, animation);
        const clean = () => running.delete(element);
        animation.finished.then(clean, clean);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

    elements.forEach(element => {
      const order = groups.get(element.parentElement) || 0;
      groups.set(element.parentElement, order + 1);
      element.dataset.deskMotion = '';
      element.dataset.deskMotionDelay = String(Math.min(order, 2) * 75);
      observer.observe(element);
    });

    // Keyboard users get an immediate, stable target.
    document.addEventListener('focusin', event => {
      running.forEach((animation, element) => {
        if (element.contains(event.target)) animation.cancel();
      });
    });
    preference.addEventListener?.('change', event => { if (event.matches) stop(); });
    window.addEventListener('pagehide', stop, { once: true });
  } catch {
    stop();
  }
})();
