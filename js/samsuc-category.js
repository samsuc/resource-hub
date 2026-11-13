/* Renders a category grid from the Worker catalog. Static cards stay if the request fails. */
(function () {
  'use strict';
  var grid = document.querySelector('[data-category]');
  var catalog = window.SAMSUC_CATALOG;
  if (!grid || !catalog) return;
  var category = grid.getAttribute('data-category');
  var prefix = grid.getAttribute('data-prefix') || '';
  var empty = document.getElementById('catEmpty');

  function card(product) {
    var href = product.detailPath ? catalog.detailHref(product, prefix) : '';
    var name = catalog.escapeHtml(product.name);
    var title = href ? '<a href="' + catalog.escapeHtml(href) + '">' + name + '</a>' : name;
    var media = catalog.coverImg(product, {
      prefix: prefix,
      lazy: true,
      sizes: '(max-width: 720px) calc(100vw - 48px), 340px'
    });
    return '<article class="card">' +
      (href ? '<a href="' + catalog.escapeHtml(href) + '">' + media + '</a>' : media) +
      '<div class="body"><h3>' + title + '</h3>' +
      '<p>' + catalog.escapeHtml(product.desc || '') + '</p>' +
      '<div class="price" data-price-usd="' + catalog.escapeHtml(String(Number(product.price) || 0)) + '">' +
      catalog.escapeHtml(catalog.money(product)) + '</div>' +
      '<div class="actions">' +
      (href ? '<a class="btn-sm gold" href="' + catalog.escapeHtml(href) + '">View details</a>' : '') +
      '<a class="btn-sm" href="' + catalog.escapeHtml(product.gumroadUrl) + '">' +
      (Number(product.price) === 0 ? 'Get free' : 'Buy') + '</a></div></div></article>';
  }

  catalog.load().then(function (result) {
    var items = (result.products || []).filter(function (product) {
      return product.category === category;
    });
    if (result.source === 'live' && !items.length) {
      grid.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }
    if (!items.length) return;
    if (empty) empty.hidden = true;
    grid.hidden = false;
    grid.innerHTML = items.map(card).join('');
    if (window.SAMSUC_LOCALE) window.SAMSUC_LOCALE.applyPrices();
  });
})();
