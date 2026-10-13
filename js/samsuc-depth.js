/**
 * SAMSUC Resource Hub — immersive scroll depth
 * Premium motion: reveal, parallax, soft 3D card response
 * Respects prefers-reduced-motion
 */
(function () {
  'use strict';
  if (window.__samsucDepthInit) return;
  window.__samsucDepthInit = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function markDepthTargets() {
    var hero = document.querySelector('.page-hero, .hero, .cat-hero, section.hero');
    if (hero) {
      hero.classList.add('depth-hero');
      var inner = hero.querySelector('.page-hero-inner, .hero-content, .hero-inner') || hero.firstElementChild;
      if (inner) inner.classList.add('depth-hero-inner');
    }
    var selectors = [
      '.section-header', '.page-hero h1', '.page-hero p',
      'main h1', 'main h2', 'main .lead',
      '.product-card', '.product-item', '.card', '.cat-card',
      '.post-card', '.article-card', '.faq-item',
      '.trust-item', '.how-step', '.about-inner',
      '.content-block', '.grid > *', '.products-grid > *',
      'article', '.feature', '.cta-block'
    ];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (el.closest('header, footer, nav, .header, .nav')) return;
        if (el.classList.contains('depth-reveal')) return;
        // avoid nesting reveal on children of already-marked parents of same type
        el.classList.add('depth-reveal');
      });
    });
    document.querySelectorAll('.product-card, .product-item, .cat-card, .card, .post-card').forEach(function (el) {
      el.classList.add('depth-card');
    });
  }

  function revealOnScroll() {
    if (reduce) {
      document.querySelectorAll('.depth-reveal').forEach(function (el) {
        el.classList.add('is-in');
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    document.querySelectorAll('.depth-reveal').forEach(function (el, i) {
      // staggered delay via transition-delay
      el.style.transitionDelay = Math.min(i % 6, 5) * 0.06 + 's';
      io.observe(el);
    });
  }

  function parallaxHero() {
    if (reduce) return;
    var hero = document.querySelector('.depth-hero');
    var inner = document.querySelector('.depth-hero-inner');
    if (!hero || !inner) return;
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var rect = hero.getBoundingClientRect();
        var h = hero.offsetHeight || 1;
        // progress while hero in view
        var p = Math.min(1, Math.max(0, -rect.top / h));
        inner.style.transform =
          'translateY(' + p * 36 + 'px) translateZ(' + p * -40 + 'px) scale(' + (1 - p * 0.04) + ')';
        inner.style.opacity = String(1 - p * 0.35);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function cardTilt() {
    if (reduce || !fine) return;
    document.querySelectorAll('.depth-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        var rx = (0.5 - y) * 10;
        var ry = (x - 0.5) * 12;
        card.style.transform =
          'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(8px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  function run() {
    markDepthTargets();
    revealOnScroll();
    parallaxHero();
    cardTilt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
