// Shared i18n module for Class Management Tools.
// Reads language from cmt-lang-{page} (per-page override) or cmt-general-config.language (default: 'fr').
// Loads per-language dictionaries from js/i18n/{lang}.js on demand (en + active language synchronously at startup).
(function () {
  'use strict';

  var SUPPORTED_LANGS = ['en', 'fr', 'de', 'it'];
  var LOCALE_MAP = {
    fr: 'fr-FR',
    en: 'en-GB',
    de: 'de-DE',
    it: 'it-IT'
  };

  if (typeof document !== 'undefined' && document.head && typeof document.createElement === 'function') {
    (function injectHmLangStyles() {
      var s = document.createElement('style');
      s.textContent = '.hm-lang-row{display:flex;gap:4px;padding:6px 12px}.hm-lang-btn{flex:1;background:none;border:1px solid #444;color:#aaa;padding:3px 2px;border-radius:3px;cursor:pointer;font-size:.76rem;font-weight:700;transition:border-color .12s,background .12s,color .12s;min-width:0}.hm-lang-btn:hover{border-color:#999;color:#eee}.hm-lang-btn.active{background:#3a3a3a;color:#fff;border-color:#888}';
      document.head.appendChild(s);
    })();
  }

  var STRINGS = (typeof window !== 'undefined')
    ? (window.__I18N_STRINGS__ = window.__I18N_STRINGS__ || {})
    : {};

  function _pageKey() {
    try {
      return (location.pathname.split('/').pop() || 'launcher').replace('.html', '') || 'launcher';
    } catch (e) { return 'launcher'; }
  }

  function _getBaseJsDir() {
    try {
      if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) {
        return document.currentScript.src.replace(/(?:shared[/\\])?[^/\\]+$/, '');
      }
      if (typeof location !== 'undefined' && /\/pages\//.test(location.pathname)) {
        return '../js/';
      }
    } catch (e) {}
    return 'js/';
  }

  var _baseJsDir = _getBaseJsDir();

  var _getLang = function () {
    try {
      if (typeof localStorage === 'undefined') return 'fr';
      var override = localStorage.getItem('cmt-lang-' + _pageKey());
      if (override) return override;
      var cfg = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
      return cfg.language || 'fr';
    } catch (e) { return 'fr'; }
  };

  // Load dictionaries synchronously in Node, or via synchronous document.write during initial HTML parse.
  if (typeof require === 'function' && typeof module === 'object' && module.exports) {
    SUPPORTED_LANGS.forEach(function (l) {
      try { STRINGS[l] = require('../i18n/' + l + '.js'); } catch (e) {}
    });
  } else if (typeof document !== 'undefined' && document.readyState === 'loading') {
    var _initialLang = _getLang();
    if (!STRINGS.en) {
      document.write('<script src="' + _baseJsDir + 'i18n/en.js"><\/script>');
    }
    if (_initialLang && _initialLang !== 'en' && SUPPORTED_LANGS.indexOf(_initialLang) !== -1 && !STRINGS[_initialLang]) {
      document.write('<script src="' + _baseJsDir + 'i18n/' + _initialLang + '.js"><\/script>');
    }
  }

  function _ensureLangLoaded(lang, cb) {
    if (!lang || SUPPORTED_LANGS.indexOf(lang) === -1 || STRINGS[lang]) {
      if (cb) cb();
      return;
    }
    if (typeof document === 'undefined') return;
    var s = document.createElement('script');
    s.src = _baseJsDir + 'i18n/' + lang + '.js';
    s.onload = function () { if (cb) cb(); };
    s.onerror = function () { if (cb) cb(); };
    document.head.appendChild(s);
  }

  var _getLocale = function () {
    try {
      var l = _getLang();
      return LOCALE_MAP[l] || l || 'fr-FR';
    } catch (e) { return 'fr-FR'; }
  };

  var _updateLangButtons = function () {
    if (typeof document === 'undefined' || typeof localStorage === 'undefined') return;
    var override = localStorage.getItem('cmt-lang-' + _pageKey());
    document.querySelectorAll('.hm-lang-btn').forEach(function (btn) {
      var dl = btn.getAttribute('data-lang');
      btn.classList.toggle('active', dl === 'auto' ? !override : dl === override);
    });
  };

  var _t = function (key, fallback, langOverride) {
    var lang = (langOverride && typeof langOverride === 'string')
      ? langOverride.toLowerCase()
      : _getLang();
    var map = STRINGS[lang] || STRINGS.en;
    if (map && map[key] !== undefined) return map[key];
    if (STRINGS.en && STRINGS.en[key] !== undefined) return STRINGS.en[key];
    return fallback !== undefined ? fallback : key;
  };

  // Replace {name} placeholder in a template string.
  var _tFmt = function (key, vars) {
    var s = _t(key);
    if (vars && typeof vars === 'object') {
      Object.keys(vars).forEach(function (k) {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return s;
  };

  var _applyTranslations = function () {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var iconPath = el.getAttribute('data-icon');
      var img = el.querySelector('img');
      var existingClass = img ? img.className : (el.getAttribute('data-icon-class') || 'btn-icon');
      var txt = _t(el.getAttribute('data-i18n'));
      if (img || iconPath) {
        if (!iconPath && img) {
          iconPath = img.getAttribute('src');
          if (iconPath) el.setAttribute('data-icon', iconPath);
        }
        if (!img && iconPath) {
          img = document.createElement('img');
          img.src = iconPath;
          img.className = existingClass;
          img.alt = '';
        }
        txt = txt.replace(/^(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|[\p{Extended_Pictographic}\u200d\ufe0f])+\s*/u, '').trim();
        el.innerHTML = '';
        if (img) el.appendChild(img);
        el.appendChild(document.createTextNode(' ' + txt));
      } else {
        el.textContent = txt;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = _t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = _t(el.getAttribute('data-i18n-title'));
    });
    document.querySelectorAll('[data-i18n-help]').forEach(function (el) {
      el.setAttribute('data-hover-help', _t(el.getAttribute('data-i18n-help')));
    });
    document.querySelectorAll('[data-i18n-help-title]').forEach(function (el) {
      el.setAttribute('data-hover-help-title', _t(el.getAttribute('data-i18n-help-title')));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', _t(el.getAttribute('data-i18n-aria')));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = _t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-label]').forEach(function (el) {
      el.setAttribute('label', _t(el.getAttribute('data-i18n-label')));
    });
    _updateLangButtons();
  };

  var _setPageLang = function (lang) {
    if (typeof localStorage !== 'undefined') {
      if (lang) {
        localStorage.setItem('cmt-lang-' + _pageKey(), lang);
      } else {
        localStorage.removeItem('cmt-lang-' + _pageKey());
      }
    }
    var target = _getLang();
    _ensureLangLoaded(target, function () {
      _applyTranslations();
    });
  };

  if (typeof window !== 'undefined') {
    window.getLang = _getLang;
    window.getLocale = _getLocale;
    window.setPageLang = _setPageLang;
    window.updateLangButtons = _updateLangButtons;
    window.t = _t;
    window.tFmt = _tFmt;
    window.i18nT = _t;
    window.I18N = STRINGS;
    window.applyTranslations = _applyTranslations;
    window.i18n = {
      t: _t,
      tFmt: _tFmt,
      getLang: _getLang,
      getCurrentLanguage: _getLang,
      getLocale: _getLocale,
      setPageLang: _setPageLang,
      applyTranslations: _applyTranslations,
      ensureLangLoaded: _ensureLangLoaded,
      STRINGS: STRINGS
    };
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = {
      t: _t,
      tFmt: _tFmt,
      getLang: _getLang,
      getCurrentLanguage: _getLang,
      getLocale: _getLocale,
      setPageLang: _setPageLang,
      applyTranslations: _applyTranslations,
      ensureLangLoaded: _ensureLangLoaded,
      STRINGS: STRINGS
    };
  }
})();
