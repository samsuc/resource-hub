/**
 * SAMSUC shared locale — keeps country / language / currency in sync across pages.
 * Reads/writes localStorage key: samsuc_locale_v2
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'samsuc_locale_v2';
  var REGIONS = [
    { code: 'US', name: 'United States', lang: 'en', currency: 'USD', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', lang: 'en', currency: 'GBP', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', lang: 'en', currency: 'CAD', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', lang: 'en', currency: 'AUD', flag: '🇦🇺' },
    { code: 'IE', name: 'Ireland', lang: 'en', currency: 'EUR', flag: '🇮🇪' },
    { code: 'NG', name: 'Nigeria', lang: 'en', currency: 'NGN', flag: '🇳🇬' },
    { code: 'GH', name: 'Ghana', lang: 'en', currency: 'GHS', flag: '🇬🇭' },
    { code: 'KE', name: 'Kenya', lang: 'en', currency: 'KES', flag: '🇰🇪' },
    { code: 'ZA', name: 'South Africa', lang: 'en', currency: 'ZAR', flag: '🇿🇦' },
    { code: 'IN', name: 'India', lang: 'hi', currency: 'INR', flag: '🇮🇳' },
    { code: 'PK', name: 'Pakistan', lang: 'en', currency: 'PKR', flag: '🇵🇰' },
    { code: 'FR', name: 'France', lang: 'fr', currency: 'EUR', flag: '🇫🇷' },
    { code: 'DE', name: 'Germany', lang: 'de', currency: 'EUR', flag: '🇩🇪' },
    { code: 'ES', name: 'Spain', lang: 'es', currency: 'EUR', flag: '🇪🇸' },
    { code: 'PT', name: 'Portugal', lang: 'pt', currency: 'EUR', flag: '🇵🇹' },
    { code: 'IT', name: 'Italy', lang: 'en', currency: 'EUR', flag: '🇮🇹' },
    { code: 'NL', name: 'Netherlands', lang: 'en', currency: 'EUR', flag: '🇳🇱' },
    { code: 'BR', name: 'Brazil', lang: 'pt', currency: 'BRL', flag: '🇧🇷' },
    { code: 'MX', name: 'Mexico', lang: 'es', currency: 'MXN', flag: '🇲🇽' },
    { code: 'AE', name: 'United Arab Emirates', lang: 'ar', currency: 'AED', flag: '🇦🇪' },
    { code: 'SA', name: 'Saudi Arabia', lang: 'ar', currency: 'SAR', flag: '🇸🇦' },
    { code: 'CN', name: 'China', lang: 'zh', currency: 'CNY', flag: '🇨🇳' },
    { code: 'JP', name: 'Japan', lang: 'ja', currency: 'JPY', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', lang: 'en', currency: 'KRW', flag: '🇰🇷' },
    { code: 'SG', name: 'Singapore', lang: 'en', currency: 'SGD', flag: '🇸🇬' },
    { code: 'PH', name: 'Philippines', lang: 'en', currency: 'PHP', flag: '🇵🇭' },
    { code: 'MY', name: 'Malaysia', lang: 'en', currency: 'MYR', flag: '🇲🇾' },
    { code: 'NZ', name: 'New Zealand', lang: 'en', currency: 'NZD', flag: '🇳🇿' }
  ];

  var FX = {
    USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.53, NZD: 1.67,
    NGN: 1550, GHS: 15.5, KES: 129, ZAR: 18.2, INR: 83.5, PKR: 278,
    BRL: 5.1, MXN: 17.2, AED: 3.67, SAR: 3.75, CNY: 7.25, JPY: 149,
    SGD: 1.34, KRW: 1350, PHP: 58, MYR: 4.7
  };

  var state = { country: 'US', lang: 'en', currency: 'USD', localeTag: 'en-US', langOverride: false };

  function regionByCountry(code) {
    for (var i = 0; i < REGIONS.length; i++) {
      if (REGIONS[i].code === code) return REGIONS[i];
    }
    return REGIONS[0];
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var s = JSON.parse(raw);
      if (!s || !s.country) return false;
      var r = regionByCountry(s.country);
      state.country = s.country;
      state.currency = s.currency || r.currency;
      if (s.langOverride && s.lang) {
        state.lang = s.lang;
        state.langOverride = true;
      } else {
        state.lang = r.lang || s.lang || 'en';
        state.langOverride = false;
      }
      state.localeTag = state.lang + '-' + state.country;
      return true;
    } catch (e) {
      return false;
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        country: state.country,
        lang: state.lang,
        currency: state.currency,
        langOverride: !!state.langOverride
      }));
    } catch (e) {}
  }

  function formatMoney(usdAmount) {
    var n = Number(usdAmount);
    if (!isFinite(n)) return '';
    if (n === 0) return 'Free';
    var rate = FX[state.currency] || 1;
    var value = n * rate;
    var zeroDec = { JPY: 1, NGN: 1, KRW: 1, VND: 1 };
    try {
      return new Intl.NumberFormat(state.localeTag || state.lang, {
        style: 'currency',
        currency: state.currency,
        maximumFractionDigits: zeroDec[state.currency] ? 0 : 2
      }).format(value);
    } catch (e) {
      return state.currency + ' ' + value.toFixed(zeroDec[state.currency] ? 0 : 2);
    }
  }

  function applyPrices() {
    document.querySelectorAll('[data-price-usd]').forEach(function (el) {
      var usd = parseFloat(el.getAttribute('data-price-usd'));
      if (isNaN(usd)) return;
      el.textContent = formatMoney(usd);
    });
  }

  function applyDocLang() {
    document.documentElement.lang = state.lang || 'en';
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  }

  function fetchRates() {
    return fetch('https://api.frankfurter.app/latest?from=USD')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.rates) {
          FX = Object.assign({ USD: 1 }, data.rates, {
            NGN: FX.NGN, GHS: FX.GHS, KES: FX.KES, AED: FX.AED, SAR: FX.SAR,
            PKR: FX.PKR, KRW: FX.KRW, PHP: FX.PHP, MYR: FX.MYR
          });
          // prefer live rates when present
          Object.keys(data.rates).forEach(function (k) { FX[k] = data.rates[k]; });
          FX.USD = 1;
          applyPrices();
        }
      })
      .catch(function () {});
  }

  function wirePicker() {
    var btn = document.getElementById('localeBtn');
    var panel = document.getElementById('localePanel');
    var picker = document.getElementById('localePicker');
    var countrySel = document.getElementById('localeCountry');
    var currencySel = document.getElementById('localeCurrencySelect');
    var langSel = document.getElementById('localeLang');
    if (!btn || !panel) return;

    // populate countries
    if (countrySel && !countrySel.options.length) {
      REGIONS.forEach(function (r) {
        var o = document.createElement('option');
        o.value = r.code;
        o.textContent = r.flag + ' ' + r.name;
        countrySel.appendChild(o);
      });
    }
    if (currencySel && !currencySel.options.length) {
      var curs = {};
      REGIONS.forEach(function (r) { curs[r.currency] = 1; });
      Object.keys(curs).sort().forEach(function (c) {
        var o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        currencySel.appendChild(o);
      });
    }

    function syncControls() {
      if (countrySel) countrySel.value = state.country;
      if (currencySel) currencySel.value = state.currency;
      if (langSel) langSel.value = state.lang;
      var flagEl = document.getElementById('localeFlag');
      var labelEl = document.getElementById('localeLabel');
      var curEl = document.getElementById('localeCurrency');
      var r = regionByCountry(state.country);
      if (flagEl) flagEl.textContent = r.flag || '🌐';
      if (labelEl) labelEl.textContent = (state.lang || 'en').toUpperCase();
      if (curEl) curEl.textContent = state.currency;
    }

    function refresh() {
      applyDocLang();
      applyPrices();
      syncControls();
      save();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !panel.classList.contains('open');
      panel.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (picker && !picker.contains(e.target)) {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    if (countrySel) {
      countrySel.addEventListener('change', function () {
        var r = regionByCountry(countrySel.value);
        state.country = r.code;
        state.currency = r.currency;
        state.lang = r.lang || 'en';
        state.langOverride = false;
        state.localeTag = state.lang + '-' + r.code;
        refresh();
      });
    }
    if (currencySel) {
      currencySel.addEventListener('change', function () {
        state.currency = currencySel.value;
        refresh();
      });
    }
    if (langSel) {
      langSel.addEventListener('change', function () {
        state.lang = langSel.value;
        state.langOverride = true;
        state.localeTag = state.lang + '-' + state.country;
        refresh();
      });
    }
    syncControls();
  }

  function init() {
    if (!load()) {
      // browser detect
      try {
        var nav = (navigator.language || 'en-US').replace('_', '-');
        var parts = nav.split('-');
        var lang = (parts[0] || 'en').toLowerCase();
        var region = (parts[1] || '').toUpperCase();
        var match = regionByCountry(region);
        if (region && match.code === region) {
          state.country = match.code;
          state.currency = match.currency;
          state.lang = match.lang;
        } else {
          for (var i = 0; i < REGIONS.length; i++) {
            if (REGIONS[i].lang === lang) {
              state.country = REGIONS[i].code;
              state.currency = REGIONS[i].currency;
              state.lang = REGIONS[i].lang;
              break;
            }
          }
        }
        state.localeTag = state.lang + '-' + state.country;
      } catch (e) {}
    }
    applyDocLang();
    applyPrices();
    wirePicker();
    fetchRates();
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) {
        load();
        applyDocLang();
        applyPrices();
        wirePicker();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SAMSUC_LOCALE = {
    formatMoney: formatMoney,
    getState: function () { return Object.assign({}, state); },
    applyPrices: applyPrices
  };
})();
