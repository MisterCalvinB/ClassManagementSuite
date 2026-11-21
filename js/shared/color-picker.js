// Unified Light Neobrutalist Colour Picker with Opacity, Presets, Saved Colours & Recent Colours.
// Automatically upgrades all <input type="color"> elements and exposes window.UnifiedColorPicker.
(function () {
  'use strict';

  var RECENT_STORAGE_KEY = 'cmt_recent_colors';
  var SAVED_STORAGE_KEY = 'cmt_saved_colors';
  var MAX_RECENT = 8;

  var DEFAULT_PRESETS = [
    '#222222', '#475569', '#94a3b8', '#ffffff',
    '#c96b6b', '#d4895a', '#e2c96e', '#6abf8e',
    '#4aabac', '#5b8fcc', '#8b7cc2', '#d97fa8',
    '#e53935', '#f59e0b', '#16a34a', '#2563eb',
    '#7c3aed', '#db2777', '#fef08a', '#dbeafe'
  ];

  function t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      var res = window.i18n.t(key);
      if (res && res !== key) return res;
    }
    return fallback;
  }

  function getIconBase() {
    var links = document.querySelectorAll('link[href*="neo-ui.css"], script[src*="dialogs.js"]');
    for (var i = 0; i < links.length; i++) {
      var ref = links[i].getAttribute('href') || links[i].getAttribute('src') || '';
      if (ref.indexOf('../') === 0) return '../assets/icons/';
    }
    return (typeof location !== 'undefined' && /\/pages\//i.test(location.pathname))
      ? '../assets/icons/'
      : 'assets/icons/';
  }

  // ── Colour Math & Parsing ───────────────────────────────────────────────────
  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function toHexByte(n) {
    var h = clamp(Math.round(n), 0, 255).toString(16);
    return h.length === 1 ? '0' + h : h;
  }

  function rgbToHex(r, g, b) {
    return '#' + toHexByte(r) + toHexByte(g) + toHexByte(b);
  }

  function formatCssColor(r, g, b, a) {
    var alpha = Math.round(clamp(a, 0, 1) * 100) / 100;
    if (alpha >= 1) {
      return rgbToHex(r, g, b);
    }
    return 'rgba(' + Math.round(r) + ', ' + Math.round(g) + ', ' + Math.round(b) + ', ' + alpha + ')';
  }

  function parseColor(str) {
    if (!str || typeof str !== 'string') return { r: 34, g: 34, b: 34, a: 1 };
    var s = str.trim().toLowerCase();
    if (s === 'transparent' || s === 'none' || s === '') {
      return { r: 255, g: 255, b: 255, a: 0 };
    }
    // #rgb
    var m3 = /^#([0-9a-f]{3})$/i.exec(s);
    if (m3) {
      var c3 = m3[1];
      return {
        r: parseInt(c3[0] + c3[0], 16),
        g: parseInt(c3[1] + c3[1], 16),
        b: parseInt(c3[2] + c3[2], 16),
        a: 1
      };
    }
    // #rrggbb
    var m6 = /^#([0-9a-f]{6})$/i.exec(s);
    if (m6) {
      var c6 = m6[1];
      return {
        r: parseInt(c6.slice(0, 2), 16),
        g: parseInt(c6.slice(2, 4), 16),
        b: parseInt(c6.slice(4, 6), 16),
        a: 1
      };
    }
    // #rrggbbaa
    var m8 = /^#([0-9a-f]{8})$/i.exec(s);
    if (m8) {
      var c8 = m8[1];
      return {
        r: parseInt(c8.slice(0, 2), 16),
        g: parseInt(c8.slice(2, 4), 16),
        b: parseInt(c8.slice(4, 6), 16),
        a: Math.round((parseInt(c8.slice(6, 8), 16) / 255) * 100) / 100
      };
    }
    // rgb(...) / rgba(...)
    var mRgb = /^rgba?\(\s*([0-9.]+)\s*[,\s]\s*([0-9.]+)\s*[,\s]\s*([0-9.]+)(?:\s*[,/]\s*([0-9.]+%?))?\s*\)$/i.exec(s);
    if (mRgb) {
      var aVal = 1;
      if (mRgb[4] !== undefined) {
        aVal = mRgb[4].endsWith('%') ? parseFloat(mRgb[4]) / 100 : parseFloat(mRgb[4]);
      }
      return {
        r: clamp(Math.round(parseFloat(mRgb[1])), 0, 255),
        g: clamp(Math.round(parseFloat(mRgb[2])), 0, 255),
        b: clamp(Math.round(parseFloat(mRgb[3])), 0, 255),
        a: clamp(isNaN(aVal) ? 1 : aVal, 0, 1)
      };
    }
    // Fallback via canvas for named CSS colors
    try {
      var ctx = document.createElement('canvas').getContext('2d');
      ctx.fillStyle = '#000001';
      ctx.fillStyle = s;
      var computed = ctx.fillStyle;
      if (computed && computed !== '#000001') {
        return parseColor(computed);
      }
    } catch (e) {}
    return { r: 34, g: 34, b: 34, a: 1 };
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    var s = max === 0 ? 0 : d / max;
    var v = max;
    if (d !== 0) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s, v: v };
  }

  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    var c = v * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = v - c;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  function isValidColorString(str) {
    if (!str || typeof str !== 'string') return false;
    var s = str.trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return true;
    if (/^rgba?\(\s*[0-9.]+\s*[,\s]\s*[0-9.]+\s*[,\s]\s*[0-9.]+(?:\s*[,/]\s*[0-9.]+%?)?\s*\)$/i.test(s)) return true;
    if (s.toLowerCase() === 'transparent') return true;
    return false;
  }

  // ── Storage (Recent & Saved Colours) ────────────────────────────────────────
  function loadRecentColors() {
    try {
      var raw = localStorage.getItem(RECENT_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
    } catch (e) {
      return [];
    }
  }

  function pushRecentColor(cssColor) {
    if (!cssColor || cssColor === 'transparent') return;
    try {
      var list = loadRecentColors().filter(function (c) {
        return c.toLowerCase() !== cssColor.toLowerCase();
      });
      list.unshift(cssColor);
      if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function loadSavedColors() {
    try {
      var raw = localStorage.getItem(SAVED_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function persistSavedColors(list) {
    try {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  // ── Popover Singleton State ─────────────────────────────────────────────────
  var popoverEl = null;
  var svCanvas = null;
  var svCtx = null;
  var svThumb = null;
  var hueTrack = null;
  var hueThumb = null;
  var alphaTrack = null;
  var alphaFill = null;
  var alphaThumb = null;
  var alphaNumInput = null;
  var previewFill = null;
  var hexInput = null;
  var presetsContainer = null;
  var savedContainer = null;
  var saveFormRow = null;
  var saveNameInput = null;
  var recentContainer = null;
  var clearBtn = null;

  var activeSession = null;
  var state = { h: 0, s: 1, v: 1, a: 1 };
  var escapeEntry = null;
  var dragRaf = null;
  var pendingDragFn = null;

  function buildPopover() {
    if (popoverEl) return popoverEl;
    var iconBase = getIconBase();

    var el = document.createElement('div');
    el.id = 'cmt-color-picker-popover';
    el.className = 'cmt-color-popover';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', t('colorPickerTitle', 'Colour Picker'));

    el.innerHTML = [
      '<div class="cmt-cp-header">',
        '<span class="cmt-cp-title">',
          '<img src="' + iconBase + 'palette.svg" class="cmt-cp-icon" alt="" />',
          '<span class="cmt-cp-title-text">' + escapeHtmlSafe(t('colorPickerTitle', 'Colour Picker')) + '</span>',
        '</span>',
        '<button type="button" class="cmt-cp-close" title="' + escapeHtmlSafe(t('close', 'Close')) + '">',
          '<img src="' + iconBase + 'close.svg" class="cmt-cp-icon" alt="" />',
        '</button>',
      '</div>',
      '<div class="cmt-cp-sv-wrap">',
        '<canvas class="cmt-cp-sv-canvas" width="228" height="132"></canvas>',
        '<div class="cmt-cp-sv-thumb"></div>',
      '</div>',
      '<div class="cmt-cp-sliders">',
        '<div class="cmt-cp-slider-row">',
          '<div class="cmt-cp-track cmt-cp-hue-track">',
            '<div class="cmt-cp-thumb cmt-cp-hue-thumb"></div>',
          '</div>',
        '</div>',
        '<div class="cmt-cp-slider-row cmt-cp-alpha-row">',
          '<div class="cmt-cp-track cmt-cp-alpha-track cmt-cp-checker">',
            '<div class="cmt-cp-alpha-fill"></div>',
            '<div class="cmt-cp-thumb cmt-cp-alpha-thumb"></div>',
          '</div>',
          '<div class="cmt-cp-alpha-num-wrap">',
            '<input type="number" class="cmt-cp-alpha-num" min="0" max="100" step="1" value="100" aria-label="' + escapeHtmlSafe(t('colorPickerOpacity', 'Opacity')) + '" />',
            '<span class="cmt-cp-alpha-pct">%</span>',
          '</div>',
        '</div>',
      '</div>',
      '<div class="cmt-cp-input-row">',
        '<div class="cmt-cp-preview cmt-cp-checker"><div class="cmt-cp-preview-fill"></div></div>',
        '<input type="text" class="cmt-cp-hex-input" spellcheck="false" aria-label="' + escapeHtmlSafe(t('colorPickerHexLabel', 'Hex / RGBA')) + '" />',
        '<button type="button" class="cmt-cp-clear-btn" title="' + escapeHtmlSafe(t('colorPickerClear', 'Clear')) + '">',
          '<img src="' + iconBase + 'clear.svg" class="cmt-cp-icon" alt="" />',
        '</button>',
      '</div>',
      '<div class="cmt-cp-section">',
        '<div class="cmt-cp-section-hdr">',
          '<span class="cmt-cp-section-label">' + escapeHtmlSafe(t('colorPickerPresets', 'Presets')) + '</span>',
        '</div>',
        '<div class="cmt-cp-swatches cmt-cp-presets-grid"></div>',
      '</div>',
      '<div class="cmt-cp-section">',
        '<div class="cmt-cp-section-hdr">',
          '<span class="cmt-cp-section-label">' + escapeHtmlSafe(t('colorPickerSaved', 'Saved Colours')) + '</span>',
          '<button type="button" class="cmt-cp-save-toggle">',
            '<img src="' + iconBase + 'plus.svg" class="cmt-cp-icon-xs" alt="" />',
            '<span>' + escapeHtmlSafe(t('colorPickerSaveBtn', 'Save')) + '</span>',
          '</button>',
        '</div>',
        '<div class="cmt-cp-save-form" style="display:none;">',
          '<input type="text" class="cmt-cp-save-name" maxlength="28" placeholder="' + escapeHtmlSafe(t('colorPickerSaveNamePlaceholder', 'Colour name...')) + '" />',
          '<button type="button" class="cmt-cp-save-confirm">' + escapeHtmlSafe(t('save', 'Save')) + '</button>',
        '</div>',
        '<div class="cmt-cp-saved-list"></div>',
      '</div>',
      '<div class="cmt-cp-section cmt-cp-recent-section">',
        '<div class="cmt-cp-section-hdr">',
          '<span class="cmt-cp-section-label">' + escapeHtmlSafe(t('colorPickerRecent', 'Recent')) + '</span>',
        '</div>',
        '<div class="cmt-cp-swatches cmt-cp-recent-grid"></div>',
      '</div>'
    ].join('');

    document.body.appendChild(el);
    popoverEl = el;

    svCanvas = el.querySelector('.cmt-cp-sv-canvas');
    svCtx = svCanvas.getContext('2d');
    svThumb = el.querySelector('.cmt-cp-sv-thumb');
    hueTrack = el.querySelector('.cmt-cp-hue-track');
    hueThumb = el.querySelector('.cmt-cp-hue-thumb');
    alphaTrack = el.querySelector('.cmt-cp-alpha-track');
    alphaFill = el.querySelector('.cmt-cp-alpha-fill');
    alphaThumb = el.querySelector('.cmt-cp-alpha-thumb');
    alphaNumInput = el.querySelector('.cmt-cp-alpha-num');
    previewFill = el.querySelector('.cmt-cp-preview-fill');
    hexInput = el.querySelector('.cmt-cp-hex-input');
    presetsContainer = el.querySelector('.cmt-cp-presets-grid');
    savedContainer = el.querySelector('.cmt-cp-saved-list');
    saveFormRow = el.querySelector('.cmt-cp-save-form');
    saveNameInput = el.querySelector('.cmt-cp-save-name');
    recentContainer = el.querySelector('.cmt-cp-recent-grid');
    clearBtn = el.querySelector('.cmt-cp-clear-btn');

    wirePopoverEvents(el);
    return el;
  }

  function escapeHtmlSafe(str) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function wirePopoverEvents(el) {
    el.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
    });
    el.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    el.querySelector('.cmt-cp-close').addEventListener('click', function () {
      closePopover(true);
    });

    // SV Square dragging
    bindDrag(el.querySelector('.cmt-cp-sv-wrap'), function (rect, clientX, clientY) {
      state.s = clamp((clientX - rect.left) / rect.width, 0, 1);
      state.v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
      renderPickerUI();
      emitColor('input');
    }, function () {
      emitColor('change');
    });

    // Hue slider dragging
    bindDrag(hueTrack, function (rect, clientX) {
      state.h = clamp((clientX - rect.left) / rect.width, 0, 1) * 360;
      drawSvCanvas();
      renderPickerUI();
      emitColor('input');
    }, function () {
      emitColor('change');
    });

    // Alpha slider dragging
    bindDrag(alphaTrack, function (rect, clientX) {
      state.a = Math.round(clamp((clientX - rect.left) / rect.width, 0, 1) * 100) / 100;
      renderPickerUI();
      emitColor('input');
    }, function () {
      emitColor('change');
    });

    // Numeric opacity input
    alphaNumInput.addEventListener('input', function () {
      var pct = parseInt(alphaNumInput.value, 10);
      if (isNaN(pct)) return;
      state.a = clamp(pct, 0, 100) / 100;
      renderPickerUI(true);
      emitColor('input');
    });
    alphaNumInput.addEventListener('change', function () {
      var pct = parseInt(alphaNumInput.value, 10);
      state.a = clamp(isNaN(pct) ? 100 : pct, 0, 100) / 100;
      renderPickerUI();
      emitColor('change');
    });

    // Hex / RGBA text input
    hexInput.addEventListener('input', function () {
      var val = hexInput.value.trim();
      if (!isValidColorString(val)) return;
      setStateFromCss(val);
      drawSvCanvas();
      renderPickerUI(false, true);
      emitColor('input');
    });
    hexInput.addEventListener('change', function () {
      var val = hexInput.value.trim();
      if (isValidColorString(val)) {
        setStateFromCss(val);
        drawSvCanvas();
        renderPickerUI();
        emitColor('change');
      } else {
        renderPickerUI();
      }
    });

    // Clear / Transparent
    clearBtn.addEventListener('click', function () {
      if (!activeSession) return;
      if (activeSession.clearValue === '') {
        if (activeSession.inputEl) {
          syncBackingInput(activeSession.inputEl, '');
        }
        if (typeof activeSession.onInput === 'function') activeSession.onInput('', null);
        if (typeof activeSession.onChange === 'function') activeSession.onChange('', null);
        closePopover(false);
      } else {
        state.a = 0;
        renderPickerUI();
        emitColor('input');
        emitColor('change');
      }
    });

    // Save colour toggle & confirm
    el.querySelector('.cmt-cp-save-toggle').addEventListener('click', function () {
      var open = saveFormRow.style.display === 'none';
      saveFormRow.style.display = open ? 'flex' : 'none';
      if (open) {
        saveNameInput.value = '';
        saveNameInput.focus();
      }
    });

    function commitSaveColor() {
      var name = saveNameInput.value.trim();
      var info = getCurrentColorInfo();
      if (!name) name = info.css;
      var saved = loadSavedColors();
      saved.push({
        id: 'sc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: name,
        color: info.css
      });
      persistSavedColors(saved);
      saveFormRow.style.display = 'none';
      saveNameInput.value = '';
      renderSavedColors();
    }

    el.querySelector('.cmt-cp-save-confirm').addEventListener('click', commitSaveColor);
    saveNameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitSaveColor();
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        saveFormRow.style.display = 'none';
      }
    });
  }

  function bindDrag(targetEl, onMoveCb, onEndCb) {
    targetEl.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var rect = targetEl.getBoundingClientRect();
      onMoveCb(rect, e.clientX, e.clientY);

      function onMove(ev) {
        pendingDragFn = function () {
          onMoveCb(targetEl.getBoundingClientRect(), ev.clientX, ev.clientY);
        };
        if (!dragRaf) {
          dragRaf = requestAnimationFrame(function () {
            dragRaf = null;
            if (pendingDragFn) {
              var fn = pendingDragFn;
              pendingDragFn = null;
              fn();
            }
          });
        }
      }

      function onUp(ev) {
        if (dragRaf) {
          cancelAnimationFrame(dragRaf);
          dragRaf = null;
        }
        if (pendingDragFn) {
          pendingDragFn = null;
        }
        onMoveCb(targetEl.getBoundingClientRect(), ev.clientX, ev.clientY);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        if (onEndCb) onEndCb();
      }

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }

  function setStateFromCss(cssColor) {
    var rgba = parseColor(cssColor);
    var hsv = rgbToHsv(rgba.r, rgba.g, rgba.b);
    // Preserve hue if grayscale and state already has a meaningful hue
    if (hsv.s > 0.001 || (rgba.r === 0 && rgba.g === 0 && rgba.b === 0 && state.s === 0)) {
      state.h = hsv.h;
    } else if (hsv.s > 0) {
      state.h = hsv.h;
    }
    state.s = hsv.s;
    state.v = hsv.v;
    state.a = rgba.a;
  }

  function getCurrentColorInfo() {
    var rgb = hsvToRgb(state.h, state.s, state.v);
    var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    var alpha = Math.round(clamp(state.a, 0, 1) * 100) / 100;
    var css = formatCssColor(rgb.r, rgb.g, rgb.b, alpha);
    var rgbaStr = 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + alpha + ')';
    return {
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      a: alpha,
      hex: hex,
      rgba: rgbaStr,
      css: css
    };
  }

  function drawSvCanvas() {
    if (!svCtx || !svCanvas) return;
    var w = svCanvas.width;
    var h = svCanvas.height;
    var pure = hsvToRgb(state.h, 1, 1);

    svCtx.fillStyle = rgbToHex(pure.r, pure.g, pure.b);
    svCtx.fillRect(0, 0, w, h);

    var whiteGrad = svCtx.createLinearGradient(0, 0, w, 0);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    svCtx.fillStyle = whiteGrad;
    svCtx.fillRect(0, 0, w, h);

    var blackGrad = svCtx.createLinearGradient(0, 0, 0, h);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
    blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
    svCtx.fillStyle = blackGrad;
    svCtx.fillRect(0, 0, w, h);
  }

  function renderPickerUI(skipAlphaNum, skipHexInput) {
    if (!popoverEl) return;
    var info = getCurrentColorInfo();

    svThumb.style.left = (state.s * 100) + '%';
    svThumb.style.top = ((1 - state.v) * 100) + '%';
    svThumb.style.backgroundColor = info.hex;

    hueThumb.style.left = ((state.h / 360) * 100) + '%';
    var huePure = hsvToRgb(state.h, 1, 1);
    hueThumb.style.backgroundColor = rgbToHex(huePure.r, huePure.g, huePure.b);

    alphaFill.style.background = 'linear-gradient(to right, rgba(' + info.r + ',' + info.g + ',' + info.b + ',0), rgba(' + info.r + ',' + info.g + ',' + info.b + ',1))';
    alphaThumb.style.left = (state.a * 100) + '%';
    alphaThumb.style.backgroundColor = info.css;

    if (!skipAlphaNum) {
      alphaNumInput.value = Math.round(state.a * 100);
    }

    previewFill.style.backgroundColor = info.css;
    if (!skipHexInput) {
      hexInput.value = info.css;
    }
  }

  function renderPresets(presets) {
    var list = (Array.isArray(presets) && presets.length) ? presets : DEFAULT_PRESETS;
    presetsContainer.innerHTML = '';
    list.forEach(function (col) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cmt-cp-swatch cmt-cp-checker';
      btn.title = col;
      var fill = document.createElement('span');
      fill.className = 'cmt-cp-swatch-fill';
      fill.style.backgroundColor = col;
      btn.appendChild(fill);
      btn.addEventListener('click', function () {
        setStateFromCss(col);
        drawSvCanvas();
        renderPickerUI();
        emitColor('input');
        emitColor('change');
      });
      presetsContainer.appendChild(btn);
    });
  }

  function renderSavedColors() {
    var saved = loadSavedColors();
    savedContainer.innerHTML = '';
    if (!saved.length) {
      var empty = document.createElement('span');
      empty.className = 'cmt-cp-saved-empty';
      empty.textContent = t('colorPickerNoSaved', 'No saved colours yet');
      savedContainer.appendChild(empty);
      return;
    }
    var iconBase = getIconBase();
    saved.forEach(function (item) {
      var chip = document.createElement('div');
      chip.className = 'cmt-cp-saved-chip';
      chip.title = item.name + ' (' + item.color + ')';

      var pickBtn = document.createElement('button');
      pickBtn.type = 'button';
      pickBtn.className = 'cmt-cp-saved-pick';

      var sw = document.createElement('span');
      sw.className = 'cmt-cp-saved-swatch cmt-cp-checker';
      var swFill = document.createElement('span');
      swFill.className = 'cmt-cp-swatch-fill';
      swFill.style.backgroundColor = item.color;
      sw.appendChild(swFill);

      var lbl = document.createElement('span');
      lbl.className = 'cmt-cp-saved-name';
      lbl.textContent = item.name;

      pickBtn.appendChild(sw);
      pickBtn.appendChild(lbl);
      pickBtn.addEventListener('click', function () {
        setStateFromCss(item.color);
        drawSvCanvas();
        renderPickerUI();
        emitColor('input');
        emitColor('change');
      });

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'cmt-cp-saved-del';
      delBtn.title = t('delete', 'Delete');
      var delImg = document.createElement('img');
      delImg.src = iconBase + 'close.svg';
      delImg.alt = '';
      delBtn.appendChild(delImg);
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var next = loadSavedColors().filter(function (x) { return x.id !== item.id; });
        persistSavedColors(next);
        renderSavedColors();
      });

      chip.appendChild(pickBtn);
      chip.appendChild(delBtn);
      savedContainer.appendChild(chip);
    });
  }

  function renderRecentColors() {
    var recent = loadRecentColors();
    var section = popoverEl.querySelector('.cmt-cp-recent-section');
    recentContainer.innerHTML = '';
    if (!recent.length) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';
    recent.forEach(function (col) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cmt-cp-swatch cmt-cp-checker';
      btn.title = col;
      var fill = document.createElement('span');
      fill.className = 'cmt-cp-swatch-fill';
      fill.style.backgroundColor = col;
      btn.appendChild(fill);
      btn.addEventListener('click', function () {
        setStateFromCss(col);
        drawSvCanvas();
        renderPickerUI();
        emitColor('input');
        emitColor('change');
      });
      recentContainer.appendChild(btn);
    });
  }

  function emitColor(eventType) {
    if (!activeSession) return;
    var info = getCurrentColorInfo();
    if (activeSession.inputEl) {
      syncBackingInput(activeSession.inputEl, info.css, info);
      var ev = new Event(eventType, { bubbles: true });
      activeSession.inputEl.dispatchEvent(ev);
    }
    if (eventType === 'input' && typeof activeSession.onInput === 'function') {
      activeSession.onInput(info.css, info);
    } else if (eventType === 'change') {
      pushRecentColor(info.css);
      if (typeof activeSession.onChange === 'function') {
        activeSession.onChange(info.css, info);
      }
    }
  }

  function positionPopover(anchor) {
    if (!popoverEl) return;
    popoverEl.style.display = 'flex';
    var pw = popoverEl.offsetWidth || 260;
    var ph = popoverEl.offsetHeight || 380;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var left = Math.max(8, (vw - pw) / 2);
    var top = Math.max(8, (vh - ph) / 2);

    if (anchor && typeof anchor.getBoundingClientRect === 'function') {
      var rect = anchor.getBoundingClientRect();
      left = rect.left;
      top = rect.bottom + 6;
      if (top + ph > vh - 8) {
        var above = rect.top - ph - 6;
        top = above >= 8 ? above : Math.max(8, vh - ph - 8);
      }
      if (left + pw > vw - 8) {
        left = Math.max(8, vw - pw - 8);
      }
      if (left < 8) left = 8;
    }

    popoverEl.style.left = Math.round(left) + 'px';
    popoverEl.style.top = Math.round(top) + 'px';
  }

  function onOutsidePointerDown(e) {
    if (!popoverEl || popoverEl.style.display === 'none') return;
    if (popoverEl.contains(e.target)) return;
    if (activeSession && activeSession.anchor && activeSession.anchor.contains && activeSession.anchor.contains(e.target)) {
      return;
    }
    closePopover(true);
  }

  function closePopover(commitRecent) {
    if (!popoverEl || popoverEl.style.display === 'none') return;
    if (commitRecent && activeSession) {
      var info = getCurrentColorInfo();
      pushRecentColor(info.css);
    }
    popoverEl.style.display = 'none';
    if (saveFormRow) saveFormRow.style.display = 'none';
    document.removeEventListener('pointerdown', onOutsidePointerDown, true);
    if (escapeEntry && typeof window.cmtRemoveEscapeHandler === 'function') {
      window.cmtRemoveEscapeHandler(escapeEntry);
      escapeEntry = null;
    }
    if (activeSession && typeof activeSession.onClose === 'function') {
      activeSession.onClose(getCurrentColorInfo());
    }
    activeSession = null;
  }

  function openPopover(options) {
    var opts = options || {};
    buildPopover();
    if (activeSession && opts.anchor && activeSession.anchor === opts.anchor && popoverEl.style.display !== 'none') {
      closePopover(true);
      return;
    }
    closePopover(false);

    var initial = opts.value || '#222222';
    setStateFromCss(initial);
    activeSession = {
      anchor: opts.anchor || null,
      inputEl: opts.inputEl || null,
      onInput: opts.onInput || null,
      onChange: opts.onChange || null,
      onClose: opts.onClose || null,
      clearValue: opts.clearValue !== undefined ? opts.clearValue : null
    };

    var alphaRow = popoverEl.querySelector('.cmt-cp-alpha-row');
    alphaRow.style.display = opts.showAlpha === false ? 'none' : 'flex';
    clearBtn.style.display = opts.allowClear ? 'inline-flex' : 'none';

    drawSvCanvas();
    renderPickerUI();
    renderPresets(opts.presets);
    renderSavedColors();
    renderRecentColors();
    positionPopover(opts.anchor);

    setTimeout(function () {
      document.addEventListener('pointerdown', onOutsidePointerDown, true);
    }, 0);

    if (typeof window.cmtPushEscapeHandler === 'function') {
      escapeEntry = window.cmtPushEscapeHandler(function () {
        closePopover(true);
      });
    }
  }

  // ── Automatic <input type="color"> Upgrade ──────────────────────────────────
  function syncBackingInput(inputEl, cssColor, parsedInfo) {
    if (!inputEl) return;
    var val = String(cssColor == null ? '' : cssColor).trim();
    if (!val) {
      inputEl.dataset.colorCss = '';
      inputEl.dataset.alpha = '0';
      if (inputEl._cmtTriggerFill) {
        inputEl._cmtTriggerFill.style.backgroundColor = 'transparent';
      }
      return;
    }
    var info = parsedInfo || parseColor(val);
    var hex = info.hex || rgbToHex(info.r, info.g, info.b);
    var alpha = info.a !== undefined ? info.a : 1;
    var css = formatCssColor(info.r, info.g, info.b, alpha);

    // Keep native .value valid (#rrggbb) for any legacy listener
    try {
      var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (desc && desc.set) desc.set.call(inputEl, hex);
      else inputEl.value = hex;
    } catch (e) {
      inputEl.value = hex;
    }
    inputEl.dataset.colorCss = css;
    inputEl.dataset.alpha = String(alpha);

    if (inputEl._cmtTriggerFill) {
      inputEl._cmtTriggerFill.style.backgroundColor = css;
    }
  }

  function upgradeColorInput(inputEl) {
    if (!inputEl || inputEl._cmtUpgraded || inputEl.hasAttribute('data-native-color')) return;
    if (inputEl.tagName !== 'INPUT' || inputEl.type !== 'color') return;
    inputEl._cmtUpgraded = true;

    // Preserve any inline dimensions/classes on a sleek trigger button
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cmt-color-trigger cmt-cp-checker';
    if (inputEl.title) trigger.title = inputEl.title;
    if (inputEl.getAttribute('data-hover-help')) {
      trigger.setAttribute('data-hover-help', inputEl.getAttribute('data-hover-help'));
    }
    if (inputEl.getAttribute('aria-label')) {
      trigger.setAttribute('aria-label', inputEl.getAttribute('aria-label'));
    }

    // Copy explicit width/height/flex-shrink if set on input
    var cs = inputEl.style;
    if (cs.width) trigger.style.width = cs.width;
    if (cs.height) trigger.style.height = cs.height;
    if (cs.flexShrink) trigger.style.flexShrink = cs.flexShrink;
    if (cs.display === 'none') trigger.style.display = 'none';

    var fill = document.createElement('span');
    fill.className = 'cmt-color-trigger-fill';
    trigger.appendChild(fill);

    inputEl._cmtTrigger = trigger;
    inputEl._cmtTriggerFill = fill;

    var initialCss = inputEl.dataset.colorCss || inputEl.getAttribute('data-color-css') || inputEl.value || '#222222';
    syncBackingInput(inputEl, initialCss);

    // Hide native input without breaking layout or programmatic clicks
    inputEl.classList.add('cmt-color-input-hidden');
    if (inputEl.parentNode) {
      inputEl.parentNode.insertBefore(trigger, inputEl.nextSibling);
    }

    // Intercept programmatic .value = ... sets so the visual swatch stays in sync
    try {
      var protoDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (protoDesc && protoDesc.get && protoDesc.set) {
        Object.defineProperty(inputEl, 'value', {
          configurable: true,
          get: function () {
            return protoDesc.get.call(this);
          },
          set: function (v) {
            if (isValidColorString(v)) {
              syncBackingInput(this, v);
            } else {
              protoDesc.set.call(this, v);
            }
          }
        });
      }
    } catch (e) {}

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openForInput(inputEl, trigger);
    });
  }

  function openForInput(inputEl, anchorEl) {
    var currentVal = inputEl.dataset.colorCss || inputEl.value || '#222222';
    openPopover({
      anchor: anchorEl || inputEl._cmtTrigger || inputEl,
      inputEl: inputEl,
      value: currentVal,
      allowClear: inputEl.hasAttribute('data-allow-clear'),
      clearValue: inputEl.hasAttribute('data-allow-clear') ? '' : undefined
    });
  }

  function scanAndUpgrade(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var inputs = scope.querySelectorAll('input[type="color"]');
    for (var i = 0; i < inputs.length; i++) {
      upgradeColorInput(inputs[i]);
    }
  }

  // Global capture-phase guard: native OS colour picker must never open
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (target && target.tagName === 'INPUT' && target.type === 'color' && !target.hasAttribute('data-native-color')) {
      e.preventDefault();
      upgradeColorInput(target);
      openForInput(target, target._cmtTrigger || target);
    }
  }, true);

  function initAutoUpgrade() {
    scanAndUpgrade(document);
    if (typeof MutationObserver !== 'undefined' && document.body) {
      var mo = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === 'childList' && m.addedNodes.length) {
            for (var j = 0; j < m.addedNodes.length; j++) {
              var node = m.addedNodes[j];
              if (node.nodeType !== 1) continue;
              if (node.tagName === 'INPUT' && node.type === 'color') {
                upgradeColorInput(node);
              } else if (node.querySelector && node.querySelector('input[type="color"]')) {
                scanAndUpgrade(node);
              }
            }
          } else if (m.type === 'attributes' && m.target && m.target.tagName === 'INPUT' && m.target.type === 'color') {
            if (m.attributeName === 'style' && m.target._cmtTrigger) {
              m.target._cmtTrigger.style.display = m.target.style.display === 'none' ? 'none' : '';
            } else if (!m.target._cmtUpgraded) {
              upgradeColorInput(m.target);
            }
          }
        }
      });
      mo.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['type', 'style']
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoUpgrade);
  } else {
    initAutoUpgrade();
  }

  var api = {
    open: openPopover,
    close: function () { closePopover(true); },
    openForInput: openForInput,
    upgradeAll: scanAndUpgrade,
    getValue: function (el) {
      if (!el) return '';
      return el.dataset.colorCss || el.value || '';
    },
    setValue: function (el, cssColor) {
      if (!el) return;
      if (!el._cmtUpgraded && el.tagName === 'INPUT' && el.type === 'color') {
        upgradeColorInput(el);
      }
      syncBackingInput(el, cssColor);
    },
    parseColor: parseColor,
    formatCssColor: formatCssColor,
    isValidColor: isValidColorString,
    DEFAULT_PRESETS: DEFAULT_PRESETS
  };

  window.UnifiedColorPicker = api;
  window.cmtColorPicker = api;
})();
