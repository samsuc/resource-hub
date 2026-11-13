/* Applies the live Worker record (Gumroad public fields) onto a product detail page. */
(function () {
  'use strict';
  var catalog = window.SAMSUC_CATALOG;
  if (!catalog) return;
  var buy = document.querySelector('a[href*="samsuchub.gumroad.com/l/"]');
  if (!buy) return;
  var match = buy.getAttribute('href').match(/\/l\/([^/?#]+)/);
  if (!match) return;
  var slug = decodeURIComponent(match[1]);

  catalog.load().then(function (result) {
    if (result.source !== 'live') return;
    var product = (result.products || []).filter(function (item) { return item.id === slug; })[0];
    var details = document.querySelector('.product-details') || document.querySelector('main');
    if (!product) {
      if (!details || details.querySelector('[data-unavailable]')) return;
      var note = document.createElement('p');
      note.setAttribute('data-unavailable', 'true');
      note.className = 'lead';
      note.textContent = 'This product is not in the current published catalog.';
      details.appendChild(note);
      return;
    }
    var heading = document.querySelector('main h1');
    if (heading) heading.textContent = product.name;
    var price = document.querySelector('.product-details .price, main .price');
    if (price) {
      price.setAttribute('data-price-usd', String(Number(product.price) || 0));
      price.textContent = catalog.money(product);
    }
    var blurb = document.querySelector('.product-details .desc');
    if (blurb && product.descriptionHtml) {
      blurb.innerHTML = product.descriptionHtml;
    }
    var image = document.querySelector('.product-visual img');
    if (image && product.image) {
      image.alt = product.name;
      image.setAttribute('data-full', product.image);
      image.removeAttribute('srcset');
      image.src = product.image;
    }
    if (window.SAMSUC_LOCALE) window.SAMSUC_LOCALE.applyPrices();
  });
})();
