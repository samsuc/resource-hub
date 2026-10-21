/**
 * Shared catalog loader.
 * Live source: Cloudflare Worker.
 * FALLBACK is a recovery snapshot only — not proof of current inventory.
 */
(function () {
  'use strict';

  var API = 'https://samsuc-products.samsuc34.workers.dev/';
  var TIMEOUT_MS = 8000;

  /** permalink -> site-relative detail path (no leading slash) */
  var DETAIL = {
    PaleHours: 'products/pale-hours/',
    fteadt: 'products/noctis-room/',
    FuturisticPortfolio: 'products/portfolio-template/',
    FuturisticSaaS: 'products/saas-landing/',
    media: 'products/church-media-manual/',
    LivestreamChecklist: 'products/livestream-checklist/',
    'maths-mastery-kit': 'products/jamb-mastery-kit/'
  };

  /**
   * Official store categories. Gumroad's public product JSON does not send a
   * section name, so published permalinks are assigned here from product purpose.
   * ids stay stable for collection/?c= links.
   */
  var CATEGORIES = [
    { id: 'students', label: 'Student Resources', path: 'students-resources/' },
    { id: 'churches', label: 'Church Resources', path: 'church-media/' },
    { id: 'creators', label: 'Creators Resources', path: 'creators-resources/' },
    { id: 'templates', label: 'Website & Developer Templates', path: 'website-templates/' }
  ];
  var CATEGORY_BY_ID = {};
  CATEGORIES.forEach(function (item) { CATEGORY_BY_ID[item.id] = item; });

  var ASSIGN = {
    'maths-mastery-kit': 'students',
    media: 'churches',
    LivestreamChecklist: 'churches',
    PaleHours: 'creators',
    fteadt: 'creators',
    FuturisticPortfolio: 'templates',
    FuturisticSaaS: 'templates'
  };

  /**
   * Recovery catalog. Verified against the product Worker and Gumroad product JSON on 2026-10-17.
   * Prices and Gumroad URLs can go stale. Do not treat this as live inventory.
   */
  var FALLBACK = [
    { id: 'maths-mastery-kit', name: 'JAMB Mastery Kit 2027 | Mathematics UTME Preparation', desc: 'Structured mathematics study resource for 2027 JAMB UTME preparation, with a practice bank, mock examinations, a formula vault, a revision timetable, and a mistake tracker.', price: 10, category: 'students', image: 'https://public-files.gumroad.com/03c6r1x70c6pgl7e8ourgya409kx', gumroadUrl: 'https://samsuchub.gumroad.com/l/maths-mastery-kit', detailPath: 'products/jamb-mastery-kit/' },
    { id: 'PaleHours', name: 'Pale Hours — Cinematic Photographer Portfolio Website', desc: 'Cinematic photographer portfolio website with editorial presentation.', price: 15, category: 'creators', image: 'https://public-files.gumroad.com/wngmgzqe3disex3e6y37sfwimood', gumroadUrl: 'https://samsuchub.gumroad.com/l/PaleHours', detailPath: 'products/pale-hours/' },
    { id: 'fteadt', name: 'NOCTIS ROOM — CINEMATIC PHOTOGRAPHER WEBSITE', desc: 'Dark-mode cinematic photographer portfolio website.', price: 12, category: 'creators', image: 'https://public-files.gumroad.com/dbmmwkpw3l6tdq1q1m2nleectc8f', gumroadUrl: 'https://samsuchub.gumroad.com/l/fteadt', detailPath: 'products/noctis-room/' },
    { id: 'FuturisticPortfolio', name: 'Futuristic Portfolio Template — HTML, CSS & JavaScript', desc: 'Premium dark-mode portfolio template in HTML, CSS & JavaScript.', price: 29, category: 'templates', image: 'https://public-files.gumroad.com/t81cnby2ockh0nef8o9o464dcmrw', gumroadUrl: 'https://samsuchub.gumroad.com/l/FuturisticPortfolio', detailPath: 'products/portfolio-template/' },
    { id: 'FuturisticSaaS', name: 'Futuristic SaaS Landing Page — HTML, CSS & JavaScript', desc: 'Conversion-focused SaaS landing page in HTML, CSS & JavaScript.', price: 22, category: 'templates', image: 'https://public-files.gumroad.com/r2u3pd7w6afm4kkn3sh4pxc2sqsk', gumroadUrl: 'https://samsuchub.gumroad.com/l/FuturisticSaaS', detailPath: 'products/saas-landing/' },
    { id: 'media', name: 'Church Media Standard Operations Manual', desc: 'Operations manual for church media teams.', price: 12, category: 'churches', image: 'https://public-files.gumroad.com/tndj2u5fspb4yta7p6e7q5xsml1q', gumroadUrl: 'https://samsuchub.gumroad.com/l/media', detailPath: 'products/church-media-manual/' },
    { id: 'LivestreamChecklist', name: 'Church Livestream Setup Checklist', desc: 'Free pre-service livestream checklist for church media teams.', price: 0, category: 'churches', image: 'https://public-files.gumroad.com/yh2o3ieh2f7o6a9vu3o5j87fzbm7', gumroadUrl: 'https://samsuchub.gumroad.com/l/LivestreamChecklist', detailPath: 'products/livestream-checklist/' }
  ];

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function safeHttps(url, host) {
    var value = String(url || '');
    if (value.indexOf('https://' + host + '/') === 0) return value;
    return '';
  }

  function inferCategory(name, permalink) {
    if (permalink && ASSIGN[permalink]) return ASSIGN[permalink];
    var s = ((name || '') + ' ' + (permalink || '')).toLowerCase();
    if (/jamb|student|mathematics|maths|utme|exam|study/.test(s)) return 'students';
    if (/church|livestream|worship/.test(s)) return 'churches';
    if (/saas|javascript|html|css|landing|developer template/.test(s)) return 'templates';
    return 'creators';
  }

  function categoryLabel(id) {
    var item = CATEGORY_BY_ID[id];
    return item ? item.label : 'Resource';
  }

  function mapWorker(product) {
    var url = safeHttps(product && product.url, 'samsuchub.gumroad.com');
    var permalink = product && product.permalink ? String(product.permalink) : '';
    if (!permalink && url) {
      var match = url.match(/\/l\/([^/?#]+)/);
      if (match) permalink = match[1];
    }
    if (!url && permalink && /^[A-Za-z0-9_-]+$/.test(permalink)) {
      url = 'https://samsuchub.gumroad.com/l/' + permalink;
    }
    var cents = product && typeof product.price_cents === 'number' ? product.price_cents : 0;
    var desc = String((product && product.description) || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    var image = safeHttps(product && product.thumbnail_url, 'public-files.gumroad.com');
    return {
      id: permalink || 'item',
      name: String((product && product.name) || permalink || 'Product'),
      desc: desc.slice(0, 180),
      price: Math.round(cents) / 100,
      category: inferCategory(product && product.name, permalink),
      image: image,
      gumroadUrl: url,
      detailPath: DETAIL[permalink] || ''
    };
  }

  function money(product) {
    var price = product ? Number(product.price) : NaN;
    if (!isFinite(price) || price === 0) return 'Free';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(price);
    } catch (err) {
      return '$' + price.toFixed(2);
    }
  }

  function detailHref(product, prefix) {
    if (!product || !product.detailPath) return product && product.gumroadUrl ? product.gumroadUrl : '#';
    return (prefix || '') + product.detailPath;
  }

  function load() {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, TIMEOUT_MS);
    var options = { credentials: 'omit', cache: 'no-store' };
    if (controller) options.signal = controller.signal;
    return fetch(API, options).then(function (response) {
      if (!response.ok) throw new Error('http ' + response.status);
      return response.json();
    }).then(function (data) {
      clearTimeout(timer);
      if (!data || data.success !== true || !Array.isArray(data.products)) {
        throw new Error('unexpected shape');
      }
      var products = data.products.map(mapWorker).filter(function (item) { return item.gumroadUrl; });
      if (!products.length) {
        return { source: 'empty', products: [], note: 'No products are published in the store right now.' };
      }
      return { source: 'live', products: products, note: '' };
    }).catch(function () {
      clearTimeout(timer);
      return {
        source: 'fallback',
        products: FALLBACK.map(function (item) { return Object.assign({}, item); }),
        note: 'Live catalog could not be loaded. Showing a saved recovery list verified on 2026-10-17, not freshly verified inventory.'
      };
    });
  }

  window.SAMSUC_CATALOG = {
    load: load,
    escapeHtml: escapeHtml,
    money: money,
    detailHref: detailHref,
    inferCategory: inferCategory,
    categoryLabel: categoryLabel,
    categories: CATEGORIES,
    fallback: FALLBACK
  };
})();
