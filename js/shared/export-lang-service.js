/**
 * export-lang-service.js
 * Centralized service for selecting and applying an export language
 * (independent of the application's UI language) across all tool exports.
 *
 * Conforms to:
 * - neobrutalist-css: Light Neobrutalist dropdown styling
 * - i18n-key-manager: localized string support
 */
(function () {
  'use strict';

  var STORAGE_PREFIX = 'cmt-export-lang-';
  var SUPPORTED_LANGS = ['en', 'fr', 'de', 'it'];
  var LANG_OPTIONS = [
    { code: 'app', labelKey: 'exportLangSameAsApp', fallback: 'Same as app' },
    { code: 'en', labelKey: 'langNameEn', fallback: 'English' },
    { code: 'fr', labelKey: 'langNameFr', fallback: 'Français' },
    { code: 'de', labelKey: 'langNameDe', fallback: 'Deutsch' },
    { code: 'it', labelKey: 'langNameIt', fallback: 'Italiano' }
  ];

  function _tUi(key, fallback) {
    var uiLang = (window.i18n && typeof window.i18n.getUiLang === 'function')
      ? window.i18n.getUiLang()
      : undefined;
    if (window.i18n && typeof window.i18n.t === 'function') {
      var val = window.i18n.t(key, fallback, uiLang);
      if (val && val !== key) return val;
    }
    if (typeof window.t === 'function') {
      var v2 = window.t(key, fallback, uiLang);
      if (v2 && v2 !== key) return v2;
    }
    return fallback || key;
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var _stylesInjected = false;
  function _injectStyles() {
    if (_stylesInjected || typeof document === 'undefined' || !document.head) return;
    _stylesInjected = true;
    var style = document.createElement('style');
    style.id = 'cmt-export-lang-service-styles';
    style.textContent =
      '.exp-lang-selector-wrap{display:inline-flex;align-items:center;gap:8px;font-family:"Lexend",system-ui,sans-serif;}' +
      '.exp-lang-label{font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;color:var(--neo-dark,#222222);white-space:nowrap;}' +
      '.exp-lang-select{appearance:auto;background:#ffffff;color:var(--neo-dark,#222222);border:2px solid var(--neo-border-color,#333333);border-radius:6px;padding:5px 10px;font-family:inherit;font-size:0.82rem;font-weight:700;box-shadow:2px 2px 0 #888888;cursor:pointer;outline:none;transition:transform 0.12s ease,box-shadow 0.12s ease;}' +
      '.exp-lang-select:hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 #555555;}' +
      '.exp-lang-select:focus{border-color:#5b8fcc;}';
    document.head.appendChild(style);
  }

  function getSelectedLang(toolKey) {
    try {
      if (typeof localStorage !== 'undefined' && toolKey) {
        var saved = localStorage.getItem(STORAGE_PREFIX + toolKey);
        if (saved === 'app' || SUPPORTED_LANGS.indexOf(saved) !== -1) {
          return saved;
        }
      }
    } catch (e) {}
    return 'app';
  }

  function setSelectedLang(toolKey, lang) {
    var val = (lang === 'app' || SUPPORTED_LANGS.indexOf(lang) !== -1) ? lang : 'app';
    try {
      if (typeof localStorage !== 'undefined' && toolKey) {
        localStorage.setItem(STORAGE_PREFIX + toolKey, val);
      }
    } catch (e) {}
    return val;
  }

  function resolveLang(toolKeyOrLang) {
    if (toolKeyOrLang && SUPPORTED_LANGS.indexOf(String(toolKeyOrLang).toLowerCase()) !== -1) {
      return String(toolKeyOrLang).toLowerCase();
    }
    var selected = (toolKeyOrLang && toolKeyOrLang !== 'app')
      ? getSelectedLang(toolKeyOrLang)
      : 'app';
    if (selected && selected !== 'app' && SUPPORTED_LANGS.indexOf(selected) !== -1) {
      return selected;
    }
    if (window.i18n && typeof window.i18n.getUiLang === 'function') {
      return window.i18n.getUiLang();
    }
    if (typeof window.getLang === 'function') {
      return window.getLang();
    }
    return 'fr';
  }

  function getOptionLabel(opt) {
    if (opt.code === 'app') {
      var uiLang = (window.i18n && typeof window.i18n.getUiLang === 'function')
        ? window.i18n.getUiLang()
        : 'fr';
      var uiOpt = LANG_OPTIONS.find(function (o) { return o.code === uiLang; });
      var uiName = uiOpt ? _tUi(uiOpt.labelKey, uiOpt.fallback) : uiLang.toUpperCase();
      return _tUi(opt.labelKey, opt.fallback) + ' (' + uiName + ')';
    }
    return _tUi(opt.labelKey, opt.fallback);
  }

  function renderLangSelector(containerEl, options) {
    if (!containerEl) return null;
    _injectStyles();
    var opts = options || {};
    var toolKey = opts.toolKey || 'default';
    var current = opts.currentLang || getSelectedLang(toolKey);
    var selectId = opts.id || ('exp-lang-select-' + toolKey);

    var html =
      '<div class="exp-lang-selector-wrap">' +
        (opts.hideLabel ? '' : '<label class="exp-lang-label" for="' + _esc(selectId) + '">' + _esc(_tUi('exportLangLabel', 'Export Language:')) + '</label>') +
        '<select id="' + _esc(selectId) + '" class="exp-lang-select' + (opts.className ? ' ' + _esc(opts.className) : '') + '">' +
          LANG_OPTIONS.map(function (opt) {
            var sel = (opt.code === current) ? ' selected' : '';
            return '<option value="' + _esc(opt.code) + '"' + sel + '>' + _esc(getOptionLabel(opt)) + '</option>';
          }).join('') +
        '</select>' +
      '</div>';

    containerEl.innerHTML = html;
    var selectEl = containerEl.querySelector('select');
    if (selectEl) {
      selectEl.addEventListener('change', function () {
        var raw = selectEl.value;
        setSelectedLang(toolKey, raw);
        var resolved = resolveLang(raw === 'app' ? 'app' : raw);
        var preload = (window.i18n && typeof window.i18n.ensureLangLoadedAsync === 'function')
          ? window.i18n.ensureLangLoadedAsync(resolved, true)
          : Promise.resolve();
        preload.then(function () {
          if (typeof opts.onChange === 'function') {
            opts.onChange(resolved, raw);
          }
        });
      });
    }
    return selectEl;
  }

  async function withExportLang(toolKeyOrLang, fn) {
    var resolved = resolveLang(toolKeyOrLang);
    if (window.i18n && typeof window.i18n.withExportLang === 'function') {
      return await window.i18n.withExportLang(resolved, fn);
    }
    return await fn(resolved);
  }

  window.ExportLangService = {
    SUPPORTED_LANGS: SUPPORTED_LANGS,
    LANG_OPTIONS: LANG_OPTIONS,
    getSelectedLang: getSelectedLang,
    setSelectedLang: setSelectedLang,
    resolveLang: resolveLang,
    renderLangSelector: renderLangSelector,
    withExportLang: withExportLang
  };
})();
