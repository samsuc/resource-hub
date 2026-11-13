/* Compact header menu for pages that do not already have the homepage menu. */
(function () {
  'use strict';
  var header = document.querySelector('header.header');
  if (!header || header.querySelector('#menuToggle') || header.querySelector('.hub-menu-btn')) return;
  header.classList.add('hub-nav');
  var btn = document.createElement('button');
  btn.className = 'hub-menu-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'hubDrawer');
  btn.innerHTML = '<span></span><span></span><span></span>';
  header.appendChild(btn);
  var drawer = document.createElement('div');
  drawer.className = 'hub-drawer';
  drawer.id = 'hubDrawer';
  var nav = header.querySelector('nav');
  if (nav) {
    nav.querySelectorAll('a').forEach(function (a) {
      drawer.appendChild(a.cloneNode(true));
    });
  }
  var cta = header.querySelector('a.btn-gold');
  if (cta) drawer.appendChild(cta.cloneNode(true));
  document.body.appendChild(drawer);
  function closeMenu() {
    drawer.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }
  btn.addEventListener('click', function () {
    var open = drawer.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  drawer.addEventListener('click', function (event) {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });
})();
