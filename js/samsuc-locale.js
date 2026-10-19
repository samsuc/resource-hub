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

  var FALLBACK_FX = {
    // Approximate saved rates. Used only when Frankfurter does not return a quote.
    USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.53, NZD: 1.67,
    NGN: 1550, GHS: 15.5, KES: 129, ZAR: 18.2, INR: 83.5, PKR: 278,
    BRL: 5.1, MXN: 17.2, AED: 3.67, SAR: 3.75, CNY: 7.25, JPY: 149,
    SGD: 1.34, KRW: 1350, PHP: 58, MYR: 4.7
  };
  var FX = Object.assign({}, FALLBACK_FX);
  var rateMeta = { source: 'fallback', date: '', missing: Object.keys(FALLBACK_FX).filter(function (code) { return code !== 'USD'; }) };

  var RATE_URL = 'https://api.frankfurter.dev/v2/rates?base=USD';
  var RATE_TIMEOUT_MS = 8000;

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
    var code = state.currency || 'USD';
    var rate = code === 'USD' ? 1 : FX[code];
    // Missing rate: keep the original USD amount. Never invent a 1:1 conversion.
    if (code !== 'USD' && (typeof rate !== 'number' || !isFinite(rate) || rate <= 0)) {
      code = 'USD';
      rate = 1;
    }
    var value = n * rate;
    var zeroDec = { JPY: 1, NGN: 1, KRW: 1, VND: 1 };
    try {
      return new Intl.NumberFormat(state.localeTag || state.lang || 'en', {
        style: 'currency',
        currency: code,
        maximumFractionDigits: zeroDec[code] ? 0 : 2
      }).format(value);
    } catch (e) {
      return code + ' ' + value.toFixed(zeroDec[code] ? 0 : 2);
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

  function rateNoteText() {
    if (rateMeta.source === 'live') {
      return 'Display only. Rates are from Frankfurter' + (rateMeta.date ? ' (' + rateMeta.date + ')' : '') + ', converted from the USD price. Gumroad checkout is not changed.';
    }
    if (rateMeta.source === 'mixed') {
      return 'Display only. Frankfurter rates' + (rateMeta.date ? ' dated ' + rateMeta.date : '') + ' are in use. Currencies it did not quote use an approximate saved table and may be stale. Gumroad checkout is not changed.';
    }
    return 'Display only. Live rates could not be loaded, so these amounts use an approximate saved table and may be stale. Gumroad checkout is not changed.';
  }

  function setRateNote() {
    var panel = document.getElementById('localePanel');
    if (!panel) return;
    var note = panel.querySelector('.locale-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'locale-note';
      panel.appendChild(note);
    }
    note.textContent = rateNoteText();
  }

  function applyRateRows(rows) {
    if (!Array.isArray(rows) || !rows.length) throw new Error('shape');
    var next = Object.assign({}, FALLBACK_FX);
    var dates = {};
    rows.forEach(function (row) {
      if (!row || (row.base && row.base !== 'USD')) return;
      var code = String(row.quote || '');
      var value = Number(row.rate);
      var date = String(row.date || '');
      if (!/^[A-Z]{3}$/.test(code) || !isFinite(value) || value <= 0) return;
      if (!dates[code] || date >= dates[code]) {
        dates[code] = date;
        next[code] = value;
      }
    });
    next.USD = 1;
    if (!dates.GBP && !dates.EUR) throw new Error('shape');
    var missing = Object.keys(FALLBACK_FX).filter(function (code) {
      return code !== 'USD' && !dates[code];
    });
    var quotedDates = Object.keys(dates).map(function (code) { return dates[code]; }).filter(Boolean).sort();
    FX = next;
    rateMeta = {
      source: missing.length ? 'mixed' : 'live',
      date: quotedDates.length ? quotedDates[quotedDates.length - 1] : '',
      missing: missing
    };
  }

  function fetchRates() {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, RATE_TIMEOUT_MS);
    var options = { credentials: 'omit', cache: 'no-store' };
    if (controller) options.signal = controller.signal;
    return fetch(RATE_URL, options).then(function (response) {
      clearTimeout(timer);
      if (!response.ok) throw new Error('http ' + response.status);
      return response.json();
    }).then(function (data) {
      applyRateRows(data);
      applyPrices();
      setRateNote();
    }).catch(function () {
      clearTimeout(timer);
      FX = Object.assign({}, FALLBACK_FX);
      rateMeta = {
        source: 'fallback',
        date: '',
        missing: Object.keys(FALLBACK_FX).filter(function (code) { return code !== 'USD'; })
      };
      applyPrices();
      setRateNote();
    });
  }

  function ensurePicker() {
    if (!document.getElementById('samsuc-locale-css')) {
      var style = document.createElement('style');
      style.id = 'samsuc-locale-css';
      style.textContent = '.locale-picker{position:relative;z-index:80}.locale-btn{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 10px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:#141b2d;color:#f0f2f8;font-size:.75rem;font-weight:600;cursor:pointer}.locale-btn .locale-code{color:#d4a017;font-weight:700}.locale-panel{position:absolute;top:calc(100% + 8px);right:0;width:min(300px,92vw);background:#141b2d;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;opacity:0;visibility:hidden;pointer-events:none;z-index:80}.locale-panel.open{opacity:1;visibility:visible;pointer-events:auto}.locale-panel label{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:#8b93a7;margin:10px 0 6px}.locale-panel select{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#0e1320;color:#f0f2f8;font:inherit}.locale-note{margin-top:10px;font-size:.72rem;line-height:1.4;color:#8b93a7}@media (max-width:900px){.locale-panel{position:fixed;top:72px;left:12px;right:12px;width:auto}}';
      document.head.appendChild(style);
    }
    if (document.getElementById('localePicker')) return;
    var header = document.querySelector('header.header') || document.querySelector('header');
    if (!header) return;
    var picker = document.createElement('div');
    picker.className = 'locale-picker';
    picker.id = 'localePicker';
    picker.innerHTML = '<button type="button" class="locale-btn" id="localeBtn" aria-expanded="false" aria-haspopup="true" aria-controls="localePanel"><span class="locale-flag" id="localeFlag">🌐</span><span class="locale-label" id="localeLabel">EN</span><span class="locale-code" id="localeCurrency">USD</span></button><div class="locale-panel" id="localePanel" role="dialog" aria-label="Language and currency"><label for="localeCountry">Country / region</label><select id="localeCountry"></select><label for="localeLang">Language</label><select id="localeLang"><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option><option value="pt">Português</option><option value="de">Deutsch</option><option value="zh">中文</option><option value="ja">日本語</option><option value="ar">العربية</option><option value="hi">हिन्दी</option></select><label for="localeCurrencySelect">Currency</label><select id="localeCurrencySelect"></select><p class="locale-note">Display only. Live rates could not be loaded, so these amounts use an approximate saved table and may be stale. Gumroad checkout is not changed.</p></div>';
    var toggle = header.querySelector('.menu-toggle');
    if (toggle) header.insertBefore(picker, toggle);
    else header.appendChild(picker);
  }

  function wirePicker() {
    ensurePicker();
    var btn = document.getElementById('localeBtn');
    var panel = document.getElementById('localePanel');
    var picker = document.getElementById('localePicker');
    var countrySel = document.getElementById('localeCountry');
    var currencySel = document.getElementById('localeCurrencySelect');
    var langSel = document.getElementById('localeLang');
    if (!btn || !panel) return;
    if (btn.getAttribute('data-wired') === '1') return;
    btn.setAttribute('data-wired', '1');

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

    function syncBoundControls() {
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
      syncBoundControls();
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
    syncBoundControls();
    setRateNote();
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
    getRateStatus: function () { return { source: rateMeta.source, date: rateMeta.date, missing: rateMeta.missing.slice() }; },
    applyPrices: applyPrices
  };
})();
