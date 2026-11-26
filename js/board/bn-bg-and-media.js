/**
 * Class Management Tools — Board Nodes, Edges & Canvas Layout Engine
 * Word nodes, connectors, arrow edges, timer nodes, media nodes, alignment, auto-spread, and styling.
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

  var CON_PALETTES = global.CON_PALETTES = global.CON_PALETTES || [];
  var conDrawingSelected = global.conDrawingSelected = global.conDrawingSelected || new Set();
  var conMultiSelected = global.conMultiSelected = global.conMultiSelected || new Set();
  var conNoteSelected = global.conNoteSelected = global.conNoteSelected || new Set();
  var _conShapeSelected = global._conShapeSelected = global._conShapeSelected || new Set();
  var conTableSelected = global.conTableSelected = global.conTableSelected || new Set();
  var AW_STORAGE_KEY = global.AW_STORAGE_KEY || 'custom_words';
  var AW_QUOTES_KEY = global.AW_QUOTES_KEY || 'custom_quotes';
  var AW_GAP_KEY = global.AW_GAP_KEY || 'custom_gap_fill';
  var AW_ERROR_KEY = global.AW_ERROR_KEY || 'custom_errors';
  var BOARD_SAVED_SESSIONS_KEY = global.BOARD_SAVED_SESSIONS_KEY || 'board_saved_sessions_v1';
  // Active session folder and file names are bound globally in board-state.js
  var conDrawings = global.conDrawings = global.conDrawings || [];
  var conShapes = global.conShapes = global.conShapes || [];
  var conTables = global.conTables = global.conTables || [];
  var conNotes = global.conNotes = global.conNotes || [];
  var conGroups = global.conGroups = global.conGroups || [];
  var conMasks = global.conMasks = global.conMasks || [];

  var getItemThemes = global.getItemThemes = window.getItemThemes = window.getItemThemes || function(item) {
    if (!item || !item.word) return [];
    var t = item.theme;
    if (!t) return [];
    return Array.isArray(t) ? t : String(t).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  };
  var getThemeIndex = global.getThemeIndex = window.getThemeIndex = window.getThemeIndex || function() { return {}; };
  var invalidateThemeIndex = global.invalidateThemeIndex = window.invalidateThemeIndex = window.invalidateThemeIndex || function() {};

    // ================================================================
    // CONSTELLATION PAGES STATE (shared globally via board-state.js descriptors)
    // ================================================================
    function board() { return document.getElementById('constellation-board'); }
    global.board = window.board = board;
    function svg() { return document.getElementById('constellation-svg'); }
    global.svg = window.svg = svg;
    let _conCopiedPages = []; // clipboard for copy/paste page(s)
    let _conPreviewSelectedIdx = new Set(); // checked page indices in Pages popup
    let _conAttachmentCounter = 0;
    // conAttachments is managed globally in board-state.js
    let _conMirrorAttachmentPreload = {}; // attachmentId -> dataUrl, populated by mirror mode
    window._conPdfDocCache = new Map(); // docCacheKey -> PDFDocumentProxy
    window._conAttachmentBufferCache = new Map(); // attachmentId/key -> ArrayBuffer
    window.conSetAttachmentPreloadMap = function (map) {
      if (map && typeof map === 'object') {
        Object.assign(_conMirrorAttachmentPreload, map);
        if (typeof conAttachments !== 'undefined' && Array.isArray(conAttachments)) {
          conAttachments.forEach(att => {
            if (!att) return;
            const src = (att.id && _conMirrorAttachmentPreload[att.id]) ||
              (att.attachmentId && _conMirrorAttachmentPreload[att.attachmentId]) ||
              (att.name && _conMirrorAttachmentPreload[att.name]) || '';
            if (src) {
              att._cachedDataUrl = src;
              if (!att.base64 && src.startsWith('data:')) {
                att.base64 = src.split(',')[1] || '';
              }
            }
          });
        }
        if (document.documentElement.classList.contains('con-mirror-mode') || location.search.includes('mirror=1') || window._isPageWindow || location.search.includes('pageWindow=1')) {
          document.querySelectorAll('.con-media-item.con-media-kind-pics').forEach(function (wrap) {
            var itemId = wrap.dataset.id;
            var item = (typeof conMediaItems !== 'undefined') ? conMediaItems.find(function (m) { return String(m.id) === String(itemId); }) : null;
            if (!item) return;
            var key = item.attachmentId || item.id || '';
            var preloadSrc = (key && _conMirrorAttachmentPreload[key])
              || (item.attachmentId && _conMirrorAttachmentPreload[item.attachmentId])
              || (item.id && _conMirrorAttachmentPreload[item.id])
              || (item.name && _conMirrorAttachmentPreload[item.name])
              || '';
            if (!preloadSrc) return;
            item._cachedDataUrl = preloadSrc;

            var content = wrap.querySelector('.con-media-content');
            var mediaEl = wrap.querySelector('img');
            if (!mediaEl && content) {
              content.textContent = '';
              mediaEl = document.createElement('img');
              mediaEl.alt = item.name || 'image';
              mediaEl.className = 'con-media-asset';
              content.appendChild(mediaEl);
            }
            if (content) {
              content.classList.remove('con-media-load-failed');
              var failMsg = content.querySelector('.con-media-error-msg');
              if (failMsg) failMsg.remove();
            }
            if (mediaEl && (!mediaEl.src || mediaEl.src.includes('undefined') || !mediaEl.complete || mediaEl.naturalWidth === 0 || mediaEl.src !== preloadSrc)) {
              mediaEl.style.display = '';
              mediaEl.src = preloadSrc;
            }
          });
        }
      }
    };
    // conMediaItems, conPageBackgroundPdf, _conBoardBg, _conBoardBgColor are managed globally in board-state.js
    let conMediaNextId = 0;
    const _BC_BOARD_BG_PRESET_DEFAULTS = ['#ffffff', '#f8fafc', '#f4f1de', '#ecfdf5', '#fff7ed', '#fee2e2', '#e0f2fe', '#ede9fe'];
    window._bcBoardBgPresets = _BC_BOARD_BG_PRESET_DEFAULTS.slice();

    function conNormalizeColorHex(value) {
      const v = String(value || '').trim();
      if (!v) return '';
      const m = v.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
      if (!m) return '';
      let h = m[1].toLowerCase();
      if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
      return '#' + h;
    }
    global.conNormalizeColorHex = window.conNormalizeColorHex = conNormalizeColorHex;

    function conNormalizeBoardBgPresetList(list) {
      const source = Array.isArray(list) ? list : [];
      const seen = new Set();
      const out = [];
      source.forEach(entry => {
        const hex = conNormalizeColorHex(entry);
        if (!hex || seen.has(hex)) return;
        seen.add(hex);
        out.push(hex);
      });
      return out.length ? out.slice(0, 20) : _BC_BOARD_BG_PRESET_DEFAULTS.slice();
    }

    function conExtractBoardBgPresetsFromConfig(bc) {
      const src = (bc && (
        bc.boardBackgroundPresets ||
        bc.boardBgPresets ||
        bc.boardBackgroundColors
      )) || window._bcBoardBgPresets || _BC_BOARD_BG_PRESET_DEFAULTS;
      let presets = conNormalizeBoardBgPresetList(src);
      const defaultColor = conNormalizeColorHex((bc && bc.boardDefaultBackgroundColor) || window._bcBoardDefaultBgColor || '');
      if (defaultColor) {
        presets = [defaultColor].concat(presets.filter(c => c !== defaultColor));
      }
      return presets.slice(0, 20);
    }

    function conGetBoardBgPresets() {
      let presets = conNormalizeBoardBgPresetList(window._bcBoardBgPresets);
      const current = conNormalizeColorHex(_conBoardBgColor || '');
      if (current && !presets.includes(current)) {
        presets = [current].concat(presets).slice(0, 20);
      }
      return presets;
    }

    function conRenderBoardBgPresetsInContextMenu() {
      const wrap = document.getElementById('con-board-bg-preset-btns');
      if (!wrap) return;
      const presets = conGetBoardBgPresets();
      window._bcBoardBgPresets = presets.slice();
      wrap.innerHTML = '';

      presets.forEach(color => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.title = color;
        btn.setAttribute('aria-label', 'Use background ' + color);
        btn.style.cssText = 'width:19px;height:19px;border-radius:999px;border:1.5px solid #bbb;background:' + color + ';cursor:pointer;padding:0;flex-shrink:0;';
        if (color === '#ffffff') btn.style.boxShadow = 'inset 0 0 0 1px #d4d4d4';
        if (_conBoardBgColor === color) {
          btn.style.borderColor = '#111';
          btn.style.transform = 'scale(1.08)';
          btn.style.boxShadow = '0 0 0 1px #111 inset';
        }
        btn.onclick = () => window.conSetBoardBackgroundColor(color);
        wrap.appendChild(btn);
      });
    }
    global.conRenderBoardBgPresetsInContextMenu = window.conRenderBoardBgPresetsInContextMenu = conRenderBoardBgPresetsInContextMenu;

    function conGetActiveBoardLayoutPreset() {
      if (window._bcBoardLayoutConfig && window._bcBoardLayoutConfig.preset) {
        return _bcNormalizeBoardLayoutPreset(window._bcBoardLayoutConfig.preset);
      }
      const cfg = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : {};
      return _bcNormalizeBoardLayoutPreset(cfg.boardLayoutPreset);
    }

    async function conPersistBoardLayoutConfig(layout) {
      const current = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : {};
      const next = Object.assign({}, current, {
        boardLayoutPreset: layout.preset,
        boardCustomOrientation: layout.customOrientation,
        boardCustomWidthPx: layout.customWidth,
        boardCustomHeightPx: layout.customHeight
      });
      window.BOARD_CONFIG = next;
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.saveText === 'function')) return;
      try {
        const lines = 'const BOARD_CONFIG = ' + JSON.stringify(next, null, 2) + ';\nwindow.BOARD_CONFIG = BOARD_CONFIG;\n';
        await Desktop.saveText('user', 'board-config.js', lines);
      } catch (e) {
        // Non-blocking: layout still applies in-memory even if persistence fails.
      }
    }

    window.conSetBoardLayoutPreset = function (preset, opts = {}) {
      const normalized = _bcNormalizeBoardLayoutPreset(preset);
      const current = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : {};
      const fromLayout = window._bcBoardLayoutConfig || {};
      const inputCfg = {
        boardLayoutPreset: normalized,
        boardCustomOrientation: current.boardCustomOrientation || fromLayout.customOrientation || 'landscape',
        boardCustomWidthPx: current.boardCustomWidthPx || fromLayout.customWidth || 1600,
        boardCustomHeightPx: current.boardCustomHeightPx || fromLayout.customHeight || 1000
      };
      const layout = _bcResolveBoardLayoutSettings(inputCfg);
      window._bcBoardLayoutConfig = layout;

      const pIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
      if (typeof conPageSnapshots !== 'undefined' && conPageSnapshots[pIdx]) {
        conPageSnapshots[pIdx].boardHeight = layout.dims ? layout.dims.h : null;
      }
      try {
        if (layout.dims) {
          sessionStorage.setItem('cmt-board-expanded-height-' + pIdx, String(layout.dims.h));
          sessionStorage.setItem('cmt-board-expanded-height', String(layout.dims.h));
        } else {
          sessionStorage.removeItem('cmt-board-expanded-height-' + pIdx);
          sessionStorage.removeItem('cmt-board-expanded-height');
        }
      } catch (_) { }

      _bcApplyBoardLayout(layout, { resetHeight: true });
      conRenderBoardLayoutOptionsInContextMenu();
      if (!opts || !opts.silent) {
        if (typeof mdbToast === 'function') mdbToast(' Board layout: ' + layout.preset);
      }
      if (!opts || opts.persist !== false) {
        conPersistBoardLayoutConfig(layout);
      }
      if (!opts || !opts.skipBroadcast) {
        if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
      }
    };

    function conRenderBoardLayoutOptionsInContextMenu() {
      const wrap = document.getElementById('con-board-layout-btns');
      if (!wrap) return;
      const options = [
        { value: 'flex', label: 'Flex' },
        { value: 'a4-landscape', label: 'A4 L' },
        { value: 'a4-portrait', label: 'A4 P' },
        { value: 'custom', label: 'Custom' }
      ];
      const active = conGetActiveBoardLayoutPreset();
      wrap.innerHTML = '';
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = opt.label;
        btn.title = 'Set layout: ' + opt.label;
        btn.style.cssText = 'padding:2px 8px;border:1.5px solid #333333;border-radius:4px;font-size:0.72rem;cursor:pointer;font-family:inherit;background:#f5f5f0;color:#111111;font-weight:600;box-shadow:1px 1px 0 #555555;transition:transform 0.1s ease;';
        if (opt.value === active) {
          btn.style.borderColor = '#111111';
          btn.style.background = '#111111';
          btn.style.color = '#ffffff';
          btn.style.fontWeight = '700';
          btn.style.boxShadow = 'none';
        }
        btn.onclick = () => window.conSetBoardLayoutPreset(opt.value);
        wrap.appendChild(btn);
      });
    }

    function conApplyBoardBgColor() {
      const board = document.getElementById('constellation-board');
      if (board) board.style.backgroundColor = _conBoardBgColor || '';
      const clip = document.getElementById('con-mirror-clip');
      if (clip) clip.style.backgroundColor = _conBoardBgColor || '#ffffff';
      conRenderBoardBgPresetsInContextMenu();
    }
    global.conApplyBoardBgColor = window.conApplyBoardBgColor = conApplyBoardBgColor;

    window.conSetBoardBackgroundColor = function (color, opts = {}) {
      const normalized = conNormalizeColorHex(color);
      _conBoardBgColor = normalized;
      conApplyBoardBgColor();
      if (!opts || !opts.silent) {
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
        if (typeof mdbToast === 'function') {
          mdbToast(normalized ? ' Board background updated.' : ' Board background reset.');
        }
      }
      if (!opts || !opts.skipBroadcast) {
        if (window._conMirrorBroadcast) window._conMirrorBroadcast();
      }
    };

    window.conResetBoardBackgroundColor = function (opts = {}) {
      window.conSetBoardBackgroundColor('', Object.assign({ silent: true }, opts || {}));
    };

    async function conEnsurePdfjsLib() {
      if (window._conPdfjsLib) return window._conPdfjsLib;
      if (window._cmtPdfjsLib) {
        window._conPdfjsLib = window._cmtPdfjsLib;
        return window._conPdfjsLib;
      }
      let mod = null;
      try {
        mod = await import('../../modules/pdf.min.mjs');
      } catch (_) {
        try {
          mod = await import(new URL('../modules/pdf.min.mjs', location.href).href);
        } catch (e2) {
          mod = await import('../modules/pdf.min.mjs');
        }
      }
      if (mod && mod.GlobalWorkerOptions) {
        try {
          mod.GlobalWorkerOptions.workerSrc = new URL('../modules/pdf.worker.min.mjs', location.href).href;
        } catch (_) {}
      }
      window._conPdfjsLib = mod;
      return window._conPdfjsLib;
    }

    function conPdfGetDocumentParams(loadSrc) {
      let fontUrl = '../modules/standard_fonts/';
      let wasmUrl = '../modules/wasm/';
      try {
        fontUrl = new URL('../modules/standard_fonts/', location.href).href;
        wasmUrl = new URL('../modules/wasm/', location.href).href;
      } catch (_) {}
      return Object.assign({
        standardFontDataUrl: fontUrl,
        wasmUrl: wasmUrl,
        disableFontFace: false,
        useSystemFonts: false
      }, loadSrc || {});
    }

    async function conRenderBoardBg(opts = {}) {
      const board = document.getElementById('constellation-board');
      if (!board) return;
      if (!_conBoardBg) {
        board.style.backgroundImage = '';
        board.style.backgroundSize = '';
        board.style.backgroundRepeat = '';
        board.style.backgroundPosition = '';
        return;
      }

      const bgState = {
        attachmentId: String(_conBoardBg.attachmentId || ''),
        pageNumber: Math.max(1, Number(_conBoardBg.pageNumber) || 1)
      };
      if (!bgState.attachmentId) {
        _conBoardBg = null;
        board.style.backgroundImage = '';
        board.style.backgroundSize = '';
        board.style.backgroundRepeat = '';
        board.style.backgroundPosition = '';
        return;
      }

      // If we already have a cached render, just re-apply at the stored pixel size.
      if (_conBoardBg._cachedDataUrl && _conBoardBg._cachedW && _conBoardBg._cachedH) {
        board.style.backgroundImage = 'url(' + JSON.stringify(_conBoardBg._cachedDataUrl) + ')';
        board.style.backgroundSize = _conBoardBg._cachedW + 'px ' + _conBoardBg._cachedH + 'px';
        board.style.backgroundRepeat = 'no-repeat';
        board.style.backgroundPosition = 'top left';
        return;
      }

      let att = conFindAttachmentById(bgState.attachmentId);
      if (!att) {
        // Mirror windows may only have preloaded data URLs (no attachment metadata list).
        const preloadId = bgState.attachmentId;
        if (preloadId && _conMirrorAttachmentPreload[preloadId]) {
          att = {
            id: preloadId,
            attachmentId: preloadId,
            name: 'background.pdf',
            mime: 'application/pdf',
            kind: 'pdf',
            relativePath: '',
            file: null
          };
        } else {
          _conBoardBg = null;
          board.style.backgroundImage = '';
          return;
        }
      }
      const pdfLike = {
        attachmentId: att.id, name: att.name, mime: att.mime || 'application/pdf',
        relativePath: att.relativePath || '', file: att.file || null,
        pageNumber: bgState.pageNumber
      };
      let pdfjsLib;
      try {
        pdfjsLib = await conEnsurePdfjsLib();
      } catch (e) { console.error('[PDF.js] Failed to load:', e); return; }
      const docCacheKey = String(pdfLike.attachmentId || pdfLike.name || '');
      let pdf = (docCacheKey && window._conPdfDocCache && window._conPdfDocCache.get(docCacheKey)) || null;
      if (!pdf) {
        const buf = await conGetAttachmentArrayBuffer(pdfLike);
        if (!buf) return;
        try {
          pdf = await pdfjsLib.getDocument(conPdfGetDocumentParams({ data: new Uint8Array(buf) })).promise;
          if (docCacheKey && window._conPdfDocCache) window._conPdfDocCache.set(docCacheKey, pdf);
        } catch (e) { console.error('[BG PDF] getDocument failed:', e); return; }
      }
      try {
        const page = await pdf.getPage(bgState.pageNumber);
        const boardW = board.clientWidth || 960;
        const scale = boardW / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        const cWidth = canvas.width;
        const cHeight = canvas.height;
        canvas.width = 0;
        canvas.height = 0;

        // If target background changed while rendering, discard stale output.
        if (!_conBoardBg
          || String(_conBoardBg.attachmentId || '') !== bgState.attachmentId
          || Math.max(1, Number(_conBoardBg.pageNumber) || 1) !== bgState.pageNumber) {
          return;
        }

        // Cache so subsequent page-switch restores reuse these exact dimensions.
        _conBoardBg._cachedDataUrl = dataUrl;
        _conBoardBg._cachedW = cWidth;
        _conBoardBg._cachedH = cHeight;
        board.style.backgroundImage = 'url(' + JSON.stringify(dataUrl) + ')';
        board.style.backgroundSize = cWidth + 'px ' + cHeight + 'px';
        board.style.backgroundRepeat = 'no-repeat';
        board.style.backgroundPosition = 'top left';
        if (!opts.silent && typeof mdbToast === 'function') mdbToast(' PDF set as page background.');
      } catch (e) {
        console.error('[BG PDF] render error:', e);
      }
    }

    window.conClearBoardBg = function () {
      _conBoardBg = null;
      const board = document.getElementById('constellation-board');
      if (board) {
        board.style.backgroundImage = '';
        board.style.backgroundSize = '';
        board.style.backgroundRepeat = '';
        board.style.backgroundPosition = '';
      }
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
      if (typeof mdbToast === 'function') mdbToast(' Page background cleared.');
    };

    window.conSetBoardBgCacheFromMirror = function (bg, render) {
      if (!bg || !render || !render.dataUrl) return;
      const attachmentId = String(bg.attachmentId || '');
      if (!attachmentId) return;
      const pageNumber = Math.max(1, Number(bg.pageNumber) || 1);
      const w = Math.max(1, Number(render.w) || 1);
      const h = Math.max(1, Number(render.h) || 1);
      _conBoardBg = {
        attachmentId,
        pageNumber,
        _cachedDataUrl: String(render.dataUrl),
        _cachedW: w,
        _cachedH: h
      };
      const board = document.getElementById('constellation-board');
      if (!board) return;
      board.style.backgroundImage = 'url(' + JSON.stringify(_conBoardBg._cachedDataUrl) + ')';
      board.style.backgroundSize = _conBoardBg._cachedW + 'px ' + _conBoardBg._cachedH + 'px';
      board.style.backgroundRepeat = 'no-repeat';
      board.style.backgroundPosition = 'top left';
    };
    global.conRenderBoardBg = window.conRenderBoardBg = conRenderBoardBg;
    let conManageMediaChooserPos = null;
    let conManageMediaChooserOutsideClick = null;
    let conManageMediaChooserKey = null;

    function conAttachmentKind(name, mime) {
      const lowerName = String(name || '').toLowerCase();
      const lowerMime = String(mime || '').toLowerCase();
      if (lowerMime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lowerName)) return 'pics';
      if (lowerMime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac|weba|opus)$/i.test(lowerName) || (/^rec-.*\.webm$/i.test(lowerName) && !lowerMime.startsWith('video/'))) return 'sounds';
      if (lowerMime.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(lowerName)) return 'videos';
      if (lowerMime === 'application/pdf' || /\.pdf$/i.test(lowerName)) return 'pdf';
      return null;
    }

    function conSanitizeAttachmentName(name, fallbackExt) {
      const raw = String(name || '').trim();
      const dot = raw.lastIndexOf('.');
      const base = dot > 0 ? raw.slice(0, dot) : raw;
      const ext = dot > 0 ? raw.slice(dot) : (fallbackExt || '');
      const safeBase = sanitizeFilenamePart(base || 'file') || 'file';
      const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
      return safeBase + safeExt;
    }

    function conAttachmentSummaryText() {
      if (!conAttachments.length) return 'No attachments';
      const labels = { pics: 'images', sounds: 'sounds', videos: 'videos', pdf: 'pdf' };
      const counts = { pics: 0, sounds: 0, videos: 0, pdf: 0 };
      conAttachments.forEach(item => {
        if (counts[item.kind] != null) counts[item.kind] += 1;
      });
      const parts = Object.keys(counts)
        .filter(k => counts[k] > 0)
        .map(k => counts[k] + ' ' + labels[k]);
      return parts.join(' · ') || (conAttachments.length + ' attachments');
    }

    function conRenderAttachmentSummary() {
      const el = document.getElementById('con-attachments-summary');
      if (!el) return;
      el.textContent = conAttachmentSummaryText();
      const details = conAttachments.map(item => item.name).join('\n');
      el.title = details || 'No attachments selected';
    }

    function conResetAttachments() {
      conAttachments.forEach(item => {
        if (item && item._cachedObjectUrl) {
          try { URL.revokeObjectURL(item._cachedObjectUrl); } catch { }
        }
      });
      conAttachments = [];
      _conAttachmentCounter = 0;
      conRenderAttachmentSummary();
    }

    function conSetAttachmentsFromSession(items, mediaMap) {
      const prevById = new Map((conAttachments || []).map(a => [String(a.id || ''), a]));
      const prevByName = new Map((conAttachments || []).map(a => [String(a.name || '').toLowerCase(), a]));

      conAttachments.forEach(item => {
        if (item && item._cachedObjectUrl) {
          try { URL.revokeObjectURL(item._cachedObjectUrl); } catch { }
        }
      });
      conAttachments = [];
      _conAttachmentCounter = 0;
      const list = Array.isArray(items) ? items : [];
      list.forEach(raw => {
        const kind = conAttachmentKind(raw && raw.name, raw && raw.mime) || raw.kind;
        if (!kind) return;
        const incomingId = String(raw && raw.id ? raw.id : '');
        const matchNum = incomingId.match(/(\d+)$/);
        if (matchNum) {
          _conAttachmentCounter = Math.max(_conAttachmentCounter, Number(matchNum[1]) || 0);
        }
        _conAttachmentCounter += 1;
        let base64 = raw.base64 || '';
        if (!base64 && mediaMap && typeof mediaMap === 'object') {
          const tryKeys = [
            kind + '/' + raw.name,
            'media/' + kind + '/' + raw.name,
            raw.name,
            raw.relativePath,
            raw.relativePath ? raw.relativePath.replace(/^[^/]+\//, '') : ''
          ].filter(Boolean);

          for (const k of tryKeys) {
            if (mediaMap[k] && mediaMap[k].base64) {
              base64 = mediaMap[k].base64;
              break;
            }
          }
          if (!base64) {
            const lowerName = String(raw.name || '').toLowerCase();
            for (const [k, v] of Object.entries(mediaMap)) {
              if (v && v.base64 && (k.toLowerCase().endsWith('/' + lowerName) || k.toLowerCase() === lowerName || (v.name && v.name.toLowerCase() === lowerName))) {
                base64 = v.base64;
                break;
              }
            }
          }
        }
        // Retain from previously loaded state if not found in mediaMap
        if (!base64) {
          const prev = prevById.get(incomingId) || prevByName.get(String(raw.name || '').toLowerCase());
          if (prev && prev.base64) {
            base64 = prev.base64;
          }
        }
        const mime = raw.mime || conGuessMimeByName(raw.name, kind) || (kind === 'pics' ? 'image/webp' : (kind === 'sounds' ? 'audio/wav' : (kind === 'videos' ? 'video/webm' : 'application/octet-stream')));
        const cleanB64 = base64.startsWith('data:') ? base64.split(',')[1] : base64;
        let cachedUrl = '';
        if (cleanB64) {
          try {
            const binary = atob(cleanB64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: mime });
            cachedUrl = URL.createObjectURL(blob);
          } catch {}
        }
        conAttachments.push({
          id: incomingId || ('att_' + _conAttachmentCounter),
          name: String(raw && raw.name ? raw.name : 'file'),
          mime: mime,
          kind,
          size: Number(raw && raw.size) || 0,
          file: null,
          base64: cleanB64 || '',
          _cachedObjectUrl: cachedUrl || '',
          _cachedDataUrl: cleanB64 ? ('data:' + mime + ';base64,' + cleanB64) : '',
          relativePath: String(raw && raw.relativePath ? raw.relativePath : ''),
          transcript: String(raw && raw.transcript ? raw.transcript : '')
        });
      });
      conRenderAttachmentSummary();
    }

    function conBuildAttachmentMetadata() {
      return conAttachments.map(item => ({
        id: item.id,
        name: item.name,
        mime: item.mime,
        kind: item.kind,
        size: Number(item.size) || 0,
        relativePath: item.relativePath || '',
        transcript: item.transcript || ''
      }));
    }

    window.conResolveAttachmentDiskPath = async function (att) {
      if (!att) return '';
      let diskPath = att.path || '';
      if (!diskPath && att.file && window.Desktop && typeof window.Desktop.getPathForFile === 'function') {
        try { diskPath = window.Desktop.getPathForFile(att.file) || ''; } catch (_) {}
      }
      if (!diskPath && att.file && att.file.path) {
        diskPath = att.file.path;
      }
      if (diskPath) return diskPath;

      if (att.relativePath && window.Desktop && typeof window.Desktop.resolvePath === 'function') {
        try {
          // Check mindmaps target first (where board files live)
          const resMm = await window.Desktop.resolvePath('mindmaps', att.relativePath);
          const pathMm = (typeof resMm === 'string') ? resMm : (resMm && resMm.path ? resMm.path : '');
          if (pathMm) return pathMm;

          const resUser = await window.Desktop.resolvePath('user', att.relativePath);
          const pathUser = (typeof resUser === 'string') ? resUser : (resUser && resUser.path ? resUser.path : '');
          if (pathUser) return pathUser;
        } catch (_) {}
      }

      // If in Electron and we only have base64 or a Blob in memory (e.g. from .cstz or embedded json), persist to temp_media
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.saveFile === 'function') {
        try {
          let mediaBlob = null;
          if (att.file && att.file instanceof Blob) {
            mediaBlob = att.file;
          } else if (att._cachedObjectUrl) {
            try {
              const r = await fetch(att._cachedObjectUrl);
              mediaBlob = await r.blob();
            } catch (_) {}
          }
          if (!mediaBlob && typeof conGetAttachmentDataUrl === 'function') {
            try {
              const dUrl = await conGetAttachmentDataUrl(att);
              if (dUrl) {
                const r = await fetch(dUrl);
                mediaBlob = await r.blob();
              }
            } catch (_) {}
          }

          let content = att.base64 || '';
          if (!content && mediaBlob) {
            const buf = await mediaBlob.arrayBuffer();
            const uint8 = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
            content = btoa(binary);
          }

          if (content) {
            const tempName = (att.name || 'temp_media').replace(/[^\w.-]/g, '_');
            const saveRes = await window.Desktop.saveFile({
              target: 'user',
              subdir: 'temp_media',
              filename: tempName,
              content: content,
              encoding: 'base64'
            });
            if (saveRes && (saveRes.file || saveRes.path)) {
              att.path = saveRes.file || saveRes.path;
              return att.path;
            }
          }
        } catch (saveErr) {
          console.warn('[Board] Could not save in-memory attachment to temp file for converter:', saveErr);
        }
      }

      return att.relativePath || att.name || '';
    };

    function conFindAttachmentById(id) {
      if (!id) return null;
      return conAttachments.find(item => item.id === id) || null;
    }
    window.conFindAttachmentById = conFindAttachmentById;

    function conResolvePdfBackgroundAttachment(bg) {
      if (!bg) return null;
      const bgId = String(bg.attachmentId || '').trim();
      if (bgId) {
        const byId = conFindAttachmentById(bgId);
        if (byId && byId.kind === 'pdf') return byId;
      }

      const bgPath = String(bg.relativePath || '').trim().replace(/\\/g, '/').toLowerCase();
      if (bgPath) {
        const byPath = conAttachments.find(item => item.kind === 'pdf' && String(item.relativePath || '').trim().replace(/\\/g, '/').toLowerCase() === bgPath);
        if (byPath) return byPath;
      }

      const bgName = String(bg.name || '').trim().toLowerCase();
      if (bgName) {
        const byName = conAttachments.find(item => item.kind === 'pdf' && String(item.name || '').trim().toLowerCase() === bgName);
        if (byName) return byName;
      }

      return null;
    }
    global.conResolvePdfBackgroundAttachment = window.conResolvePdfBackgroundAttachment = conResolvePdfBackgroundAttachment;

    function conAttachmentCandidateRelativePaths(att) {
      const out = [];
      const seen = new Set();
      function pushPath(value) {
        const p = String(value || '').trim().replace(/\\/g, '/');
        if (!p) return;
        const key = p.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(p);
      }

      pushPath(att && att.relativePath);

      const kind = String((att && att.kind) || '').trim();
      const name = String((att && att.name) || '').trim();
      if (kind && name) {
        const activeFolder = _conCurrentFolderName || (typeof window !== 'undefined' ? window._conPageWindowSourceFolder : '') || '';
        const activeFile = _conCurrentFileName || (typeof window !== 'undefined' ? window._conPageWindowSourceFile : '') || '';
        if (activeFolder) {
          pushPath(activeFolder + '/' + kind + '/' + name);
          if (kind === 'sounds') pushPath(activeFolder + '/audio/' + name);
          if (kind === 'videos') pushPath(activeFolder + '/video/' + name);
        }
        const fileBase = activeFile ? boardStripJsonExt(activeFile) : '';
        if (fileBase) {
          pushPath(fileBase + '/' + kind + '/' + name);
          if (kind === 'sounds') pushPath(fileBase + '/audio/' + name);
          if (kind === 'videos') pushPath(fileBase + '/video/' + name);
        }
      }

      return out;
    }

    function conGuessMimeByName(name, kind) {
      const lower = String(name || '').toLowerCase();
      if (/\.webp$/i.test(lower)) return 'image/webp';
      if (/\.png$/i.test(lower)) return 'image/png';
      if (/\.jpe?g$/i.test(lower)) return 'image/jpeg';
      if (/\.gif$/i.test(lower)) return 'image/gif';
      if (/\.svg$/i.test(lower)) return 'image/svg+xml';
      if (/\.mp3$/i.test(lower)) return 'audio/mpeg';
      if (/\.wav$/i.test(lower)) return 'audio/wav';
      if (/\.ogg$/i.test(lower)) return 'audio/ogg';
      if (/\.m4a$/i.test(lower)) return 'audio/mp4';
      if (/\.(webm|weba|opus)$/i.test(lower)) return (kind === 'sounds' ? 'audio/webm' : 'video/webm');
      if (/\.m4v$/i.test(lower)) return 'video/mp4';
      if (/\.avi$/i.test(lower)) return 'video/x-msvideo';
      if (/\.mkv$/i.test(lower)) return 'video/x-matroska';
      if (/\.aac$/i.test(lower)) return 'audio/aac';
      if (/\.flac$/i.test(lower)) return 'audio/flac';
      if (/\.mp4$/i.test(lower)) return 'video/mp4';
      if (/\.mov$/i.test(lower)) return 'video/quicktime';
      if (/\.pdf$/i.test(lower)) return 'application/pdf';
      if (kind === 'pics') return 'image/webp';
      if (kind === 'sounds') return 'audio/wav';
      if (kind === 'videos') return 'video/webm';
      if (kind === 'pdf') return 'application/pdf';
      return '';
    }

    async function conGetAttachmentDataUrl(att) {
      if (!att) return '';

      const masterAtt = (typeof conFindAttachmentById === 'function')
        ? (conFindAttachmentById(att.attachmentId || att.id) || att)
        : att;

      if (att._cachedObjectUrl) return att._cachedObjectUrl;
      if (masterAtt && masterAtt._cachedObjectUrl) return masterAtt._cachedObjectUrl;
      if (att._cachedDataUrl) return att._cachedDataUrl;
      if (masterAtt && masterAtt._cachedDataUrl) return masterAtt._cachedDataUrl;

      // Mirror mode: use preloaded data URLs sent from the main window
      if (typeof _conMirrorAttachmentPreload !== 'undefined' && _conMirrorAttachmentPreload) {
        const candidateKeys = [
          att.attachmentId,
          att.id,
          masterAtt && masterAtt.attachmentId,
          masterAtt && masterAtt.id,
          att.name,
          masterAtt && masterAtt.name
        ].filter(Boolean);
        for (const k of candidateKeys) {
          if (_conMirrorAttachmentPreload[k]) {
            att._cachedDataUrl = _conMirrorAttachmentPreload[k];
            if (masterAtt) masterAtt._cachedDataUrl = _conMirrorAttachmentPreload[k];
            return att._cachedDataUrl;
          }
        }
      }

      const mimeForBlob = att.mime || (masterAtt && masterAtt.mime) || conGuessMimeByName(att.name || (masterAtt && masterAtt.name), att.kind || (masterAtt && masterAtt.kind)) || ((att.kind === 'sounds' || (masterAtt && masterAtt.kind === 'sounds')) ? 'audio/wav' : ((att.kind === 'videos' || (masterAtt && masterAtt.kind === 'videos')) ? 'video/webm' : 'application/octet-stream'));

      const fileObj = att.file || (masterAtt && masterAtt.file);
      if (fileObj) {
        try {
          const objUrl = URL.createObjectURL(fileObj);
          att._cachedObjectUrl = objUrl;
          if (masterAtt) masterAtt._cachedObjectUrl = objUrl;
          return objUrl;
        } catch {
          try {
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result || ''));
              reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
              reader.readAsDataURL(fileObj);
            });
            att._cachedDataUrl = dataUrl;
            if (masterAtt) masterAtt._cachedDataUrl = dataUrl;
            return dataUrl;
          } catch {
            return '';
          }
        }
      }

      const base64 = att.base64 || (masterAtt && masterAtt.base64) || '';
      if (base64) {
        try {
          const cleanB64 = base64.startsWith('data:') ? base64.split(',')[1] : base64;
          let blob = null;
          try {
            const fetchRes = await fetch('data:' + mimeForBlob + ';base64,' + cleanB64);
            blob = await fetchRes.blob();
          } catch (_) {
            const binary = atob(cleanB64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            blob = new Blob([bytes], { type: mimeForBlob });
          }
          if (blob) {
            const objUrl = URL.createObjectURL(blob);
            att._cachedObjectUrl = objUrl;
            if (masterAtt) masterAtt._cachedObjectUrl = objUrl;
            return objUrl;
          }
        } catch (e) {
          console.error('[Attachment] Failed to convert base64 to object URL:', e);
        }
      }

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function') {
        const candidates = conAttachmentCandidateRelativePaths(masterAtt || att);
        for (const candidatePath of candidates) {
          try {
            const res = await Desktop.readByPath('mindmaps', candidatePath, { encoding: 'base64' });
            if (res && res.ok && res.content) {
              const cleanB64 = String(res.content).startsWith('data:') ? String(res.content).split(',')[1] : String(res.content);
              let blob = null;
              try {
                const fetchRes = await fetch('data:' + mimeForBlob + ';base64,' + cleanB64);
                blob = await fetchRes.blob();
              } catch (_) {
                const binary = atob(cleanB64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                blob = new Blob([bytes], { type: mimeForBlob });
              }
              if (blob) {
                const objUrl = URL.createObjectURL(blob);
                att._cachedObjectUrl = objUrl;
                if (masterAtt) masterAtt._cachedObjectUrl = objUrl;
                if (!att.relativePath) att.relativePath = candidatePath;
                if (masterAtt && !masterAtt.relativePath) masterAtt.relativePath = candidatePath;
                return objUrl;
              }
            }
          } catch { }
        }
      }

      return '';
    }
    global.conGetAttachmentDataUrl = window.conGetAttachmentDataUrl = conGetAttachmentDataUrl;

    // Returns {w, h} using the image's naturalWidth/naturalHeight, or null on failure.
    async function conGetImageNaturalSize(url) {
      if (!url) return null;
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            resolve({ w: img.naturalWidth, h: img.naturalHeight });
          } else {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    }

    async function conGetAttachmentArrayBuffer(att) {
      if (!att) return null;

      const masterAtt = (typeof conFindAttachmentById === 'function')
        ? (conFindAttachmentById(att.attachmentId || att.id) || att)
        : att;

      // Mirror mode: convert preloaded data URL to ArrayBuffer with memory caching
      const _abPreloadKey = (att.attachmentId || att.id || (masterAtt && (masterAtt.attachmentId || masterAtt.id))) || '';
      if (_abPreloadKey) {
        if (window._conAttachmentBufferCache && window._conAttachmentBufferCache.has(_abPreloadKey)) {
          return window._conAttachmentBufferCache.get(_abPreloadKey);
        }
        if (_conMirrorAttachmentPreload[_abPreloadKey]) {
          try {
            const dataUrl = _conMirrorAttachmentPreload[_abPreloadKey];
            const base64 = dataUrl.startsWith('data:') ? dataUrl.split(',')[1] : dataUrl;
            const binary = atob(base64);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
            const buf = bytes.buffer;
            if (window._conAttachmentBufferCache) window._conAttachmentBufferCache.set(_abPreloadKey, buf);
            return buf;
          } catch { }
        }
      }

      // 1. Check direct file object
      const fileObj = att.file || (masterAtt && masterAtt.file);
      if (fileObj && typeof fileObj.arrayBuffer === 'function') {
        try {
          return await fileObj.arrayBuffer();
        } catch { }
      }

      // 2. Check base64 data
      const base64 = att.base64 || (masterAtt && masterAtt.base64) || '';
      if (base64) {
        try {
          const cleanB64 = base64.startsWith('data:') ? base64.split(',')[1] : base64;
          const binary = atob(cleanB64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return bytes.buffer;
        } catch (e) {
          console.error('[Attachment] Failed to convert base64 to buffer:', e);
        }
      }

      // 3. Check cached object URL (blob:) or data URL
      const cachedUrl = att._cachedObjectUrl || (masterAtt && masterAtt._cachedObjectUrl) || att._cachedDataUrl || (masterAtt && masterAtt._cachedDataUrl) || '';
      if (cachedUrl) {
        try {
          const resp = await fetch(cachedUrl);
          if (resp.ok) return await resp.arrayBuffer();
        } catch { }
      }

      // 4. Check Desktop disk files
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function') {
        const candidates = conAttachmentCandidateRelativePaths(masterAtt || att);
        for (const candidatePath of candidates) {
          try {
            const res = await Desktop.readByPath('mindmaps', candidatePath, { encoding: 'base64' });
            if (res && res.ok && res.content) {
              const binary = atob(String(res.content));
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              if (!masterAtt.relativePath) masterAtt.relativePath = candidatePath;
              return bytes.buffer;
            }
          } catch { }
        }
      }

      return null;
    }

    function conEstimatePdfPageCountFromBytes(bytes) {
      try {
        let text = '';
        const chunkSize = 65536;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(bytes.length, i + chunkSize));
          text += String.fromCharCode.apply(null, chunk);
        }
        const matches = text.match(/\/Type\s*\/Page(?!s)\b/g);
        return Math.max(1, matches ? matches.length : 1);
      } catch {
        return 1;
      }
    }

    async function conGetPdfPageCount(att) {
      if (!att || att.kind !== 'pdf') return 1;
      if (Number.isFinite(att._cachedPdfPageCount) && att._cachedPdfPageCount > 0) {
        return att._cachedPdfPageCount;
      }

      try {
        const pdfjsLib = await conEnsurePdfjsLib();
        let pdfDoc = att._pdfDoc;
        if (!pdfDoc) {
          const buf = await conGetAttachmentArrayBuffer(att);
          if (!buf) return 1;
          pdfDoc = await pdfjsLib.getDocument(conPdfGetDocumentParams({ data: new Uint8Array(buf) })).promise;
          att._pdfDoc = pdfDoc;
        }
        const pageCount = (pdfDoc && Number(pdfDoc.numPages) > 0) ? pdfDoc.numPages : 1;
        att._cachedPdfPageCount = pageCount;
        return pageCount;
      } catch (e) {
        console.warn('[PDF] Could not get accurate page count with PDF.js:', e);
        try {
          const buf = await conGetAttachmentArrayBuffer(att);
          if (buf) {
            const bytes = new Uint8Array(buf);
            const pageCount = conEstimatePdfPageCountFromBytes(bytes);
            att._cachedPdfPageCount = pageCount;
            return pageCount;
          }
        } catch (_) {}
        return 1;
      }
    }

    function conBuildEmptyPageSnapshot() {
      return {
        nodes: [],
        edges: [],
        groups: [],
        masks: [],
        notes: [],
        drawings: [],
        shapes: [],
        tables: [],
        media: [],
        backgroundPdf: null,
        boardBg: null,
        boardBgColor: window._bcBoardDefaultBgColor || null,
        boardHeight: null
      };
    }
    window.conBuildEmptyPageSnapshot = global.conBuildEmptyPageSnapshot = conBuildEmptyPageSnapshot;

    async function conGetPdfPageAspectRatio(pdfLike, pageNum = 1) {
      if (!pdfLike) return null;
      try {
        const pdfjsLib = await conEnsurePdfjsLib();
        let pdfDoc = pdfLike._pdfDoc;
        if (!pdfDoc) {
          const buf = await conGetAttachmentArrayBuffer(pdfLike);
          if (!buf) return null;
          pdfDoc = await pdfjsLib.getDocument(conPdfGetDocumentParams({ data: new Uint8Array(buf) })).promise;
          pdfLike._pdfDoc = pdfDoc;
        }
        const pNum = Math.max(1, Math.min(pdfDoc.numPages, Number(pageNum) || 1));
        const page = await pdfDoc.getPage(pNum);
        const rotation = (((Number(pdfLike.pdfRotation) || 0) % 360) + 360) % 360;
        const vp = page.getViewport({ scale: 1, rotation });
        if (vp && vp.width > 0 && vp.height > 0) {
          return vp.height / vp.width;
        }
      } catch (e) {
        console.warn('[PDF] Could not get aspect ratio:', e);
      }
      return null;
    }

    function conGetDefaultPdfMediaRect(aspectRatio) {
      const board = document.getElementById('constellation-board');
      const boardW = board ? Math.max(320, board.clientWidth || 0) : 960;
      const boardH = board ? Math.max(320, board.clientHeight || 0) : 1400;
      const w = (window._bcPdfInsertWidth > 0) ? Math.max(260, window._bcPdfInsertWidth) : Math.max(260, Math.round(boardW * 0.8));
      const ratio = (Number.isFinite(aspectRatio) && aspectRatio > 0) ? aspectRatio : 1.35;
      const h = Math.max(180, Math.min(boardH - 24, Math.round(w * ratio)));
      const x = Math.max(12, Math.round((boardW - w) / 2));
      return { x, y: 12, w, h };
    }

    function conBuildPdfMediaItem(pdfLike, options = {}) {
      if (!pdfLike) return null;
      const linkedAttachment = conResolvePdfBackgroundAttachment(pdfLike);
      const ratio = options && Number.isFinite(options.aspectRatio) ? options.aspectRatio : null;
      const rect = conGetDefaultPdfMediaRect(ratio);
      const pageNumber = Math.max(1, Number(pdfLike.pageNumber) || 1);
      const item = {
        id: String(options.id || ('cm' + (conMediaNextId++))),
        kind: 'pdf',
        attachmentId: String((linkedAttachment && linkedAttachment.id) || pdfLike.attachmentId || ''),
        name: String((linkedAttachment && linkedAttachment.name) || pdfLike.name || 'document.pdf'),
        mime: String((linkedAttachment && linkedAttachment.mime) || pdfLike.mime || 'application/pdf'),
        relativePath: String((linkedAttachment && linkedAttachment.relativePath) || pdfLike.relativePath || ''),
        file: (linkedAttachment && linkedAttachment.file) || pdfLike.file || null,
        pageNumber,
        pdfFit: options.pdfFit || 'h',
        pdfZoom: options.pdfZoom != null ? options.pdfZoom : 1,
        pdfRotation: options.pdfRotation || 0,
        pdfScrollX: options.pdfScrollX || 0,
        pdfScrollY: options.pdfScrollY || 0,
        pdfLockSize: options.pdfLockSize !== undefined ? !!options.pdfLockSize : true,
        locked: options.locked !== undefined ? !!options.locked : true,
        x: Number.isFinite(options.x) ? Math.round(options.x) : rect.x,
        y: Number.isFinite(options.y) ? Math.round(options.y) : rect.y,
        w: Number.isFinite(options.w) ? Math.max(220, Math.round(options.w)) : rect.w,
        h: Number.isFinite(options.h) ? Math.max(180, Math.round(options.h)) : rect.h
      };
      if (ratio) item._ratioInitialized = true;
      return item;
    }

    function conRemoveInsertAttachmentChooser() {
      const el = document.getElementById('con-insert-attachment-chooser');
      if (el) el.remove();
      conRemoveManageMediaDeletePopup();

      if (conManageMediaChooserOutsideClick) {
        document.removeEventListener('mousedown', conManageMediaChooserOutsideClick, true);
        conManageMediaChooserOutsideClick = null;
      }
      if (conManageMediaChooserKey) {
        document.removeEventListener('keydown', conManageMediaChooserKey, true);
        conManageMediaChooserKey = null;
      }
    }

    function conRemoveManageMediaDeletePopup() {
      const pop = document.getElementById('con-media-delete-popover');
      if (pop) pop.remove();
    }

    function conOpenManageMediaDeletePopover(att, anchorBtn) {
      conRemoveManageMediaDeletePopup();
      if (!att) return;

      const pop = document.createElement('div');
      pop.id = 'con-media-delete-popover';
      pop.className = 'con-media-delete-popover';

      const msg = document.createElement('div');
      msg.className = 'con-media-delete-popover-msg';
      msg.textContent = 'Delete "' + att.name + '" from this constellation file? This also removes it from all pages.';

      const actions = document.createElement('div');
      actions.className = 'con-media-delete-popover-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'con-media-manage-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = () => {
        conRemoveManageMediaDeletePopup();
      };

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'con-media-manage-btn con-media-manage-btn-danger';
      confirmBtn.textContent = 'Delete';
      confirmBtn.onclick = async () => {
        await conDeleteAttachmentEverywhere(att.id);
        conRemoveManageMediaDeletePopup();
        window.conOpenManageMediaChooser({ keepPosition: true });
      };

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      pop.appendChild(msg);
      pop.appendChild(actions);
      document.body.appendChild(pop);

      const rect = anchorBtn && typeof anchorBtn.getBoundingClientRect === 'function'
        ? anchorBtn.getBoundingClientRect()
        : { left: window.innerWidth / 2, top: window.innerHeight / 2, bottom: window.innerHeight / 2 };

      const popRect = pop.getBoundingClientRect();
      let left = Math.round(rect.left);
      let top = Math.round(rect.bottom + 8);
      if (left + popRect.width > window.innerWidth - 8) {
        left = Math.max(8, Math.round(window.innerWidth - popRect.width - 8));
      }
      if (top + popRect.height > window.innerHeight - 8) {
        top = Math.max(8, Math.round(rect.top - popRect.height - 8));
      }

      pop.style.left = left + 'px';
      pop.style.top = top + 'px';

      const onOutside = ev => {
        if (!pop.contains(ev.target)) {
          conRemoveManageMediaDeletePopup();
          document.removeEventListener('mousedown', onOutside, true);
        }
      };

      setTimeout(() => {
        document.addEventListener('mousedown', onOutside, true);
      }, 0);
    }

    function conCountAttachmentPlacedOnCurrentPage(attachmentId) {
      const id = String(attachmentId || '');
      if (!id) return 0;
      let count = conMediaItems.filter(item => String(item.attachmentId || '') === id).length;
      if (conPageBackgroundPdf && String(conPageBackgroundPdf.attachmentId || '') === id) count += 1;
      return count;
    }

    function conRemoveAttachmentFromCurrentPage(attachmentId, options = {}) {
      const id = String(attachmentId || '');
      if (!id) return { removedMedia: 0, removedPdfBackground: false };

      const removeIds = new Set(
        conMediaItems
          .filter(item => String(item.attachmentId || '') === id)
          .map(item => String(item.id || ''))
      );
      const removedMedia = removeIds.size;
      if (removedMedia > 0) {
        conMediaItems = conMediaItems.filter(item => !removeIds.has(String(item.id || '')));
        document.querySelectorAll('.con-media-item').forEach(el => {
          if (removeIds.has(String(el.dataset.id || ''))) el.remove();
        });
      }

      let removedPdfBackground = false;
      if (conPageBackgroundPdf && String(conPageBackgroundPdf.attachmentId || '') === id) {
        conPageBackgroundPdf = null;
        conRenderPagePdfBackground();
        removedPdfBackground = true;
      }

      if (!(options && options.silent) && typeof mdbToast === 'function') {
        if (removedMedia > 0 || removedPdfBackground) {
          const parts = [];
          if (removedMedia > 0) parts.push(removedMedia + ' media item(s)');
          if (removedPdfBackground) parts.push('PDF background');
          mdbToast(' Removed from current page: ' + parts.join(' + ') + '.');
        } else {
          mdbToast('ℹ This attachment is not on the current page.');
        }
      }

      return { removedMedia, removedPdfBackground };
    }

    async function conDeleteAttachmentEverywhere(attachmentId, options = {}) {
      const id = String(attachmentId || '');
      if (!id) return false;

      conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();

      conPageSnapshots = conPageSnapshots.map(page => {
        const base = page && typeof page === 'object' ? page : conBuildEmptyPageSnapshot();
        const nextPage = {
          ...base,
          media: Array.isArray(base.media)
            ? base.media.filter(item => String((item && item.attachmentId) || '') !== id)
            : [],
          backgroundPdf: (base.backgroundPdf && String(base.backgroundPdf.attachmentId || '') === id)
            ? null
            : (base.backgroundPdf || null)
        };
        return nextPage;
      });

      _conRestorePageToBoard(conPageSnapshots[conCurrentPageIndex] || conBuildEmptyPageSnapshot());
      if (window.conUpdatePageBar) window.conUpdatePageBar();

      const idx = conAttachments.findIndex(item => String(item.id || '') === id);
      if (idx < 0) return false;
      const [removed] = conAttachments.splice(idx, 1);
      if (removed && removed._cachedObjectUrl) {
        try { URL.revokeObjectURL(removed._cachedObjectUrl); } catch { }
      }

      const removedRelativePath = String((removed && removed.relativePath) || '').trim();
      if (removedRelativePath
        && window.Desktop
        && Desktop.isElectron()
        && typeof Desktop.deleteByPath === 'function') {
        try {
          await Desktop.deleteByPath('mindmaps', removedRelativePath, { recursive: false, force: true });
        } catch (error) {
          console.warn('Could not delete attachment file from disk:', removedRelativePath, error);
        }
      }

      conRenderAttachmentSummary();
      if (!(options && options.silent) && typeof mdbToast === 'function') {
        mdbToast(' Deleted attachment: ' + (removed && removed.name ? removed.name : 'file'));
      }
      return true;
    }

    async function conDeleteAttachmentsBulk(categoryOrKind, options = {}) {
      if (!Array.isArray(conAttachments) || conAttachments.length === 0) return 0;

      const cat = String(categoryOrKind || 'all').toLowerCase();
      let toDelete = [];
      let label = 'all';

      if (cat === 'all') {
        toDelete = [...conAttachments];
        label = 'all';
      } else if (cat === 'pdf') {
        toDelete = conAttachments.filter(item => item && item.kind === 'pdf');
        label = 'PDF';
      } else if (cat === 'pics' || cat === 'images') {
        toDelete = conAttachments.filter(item => item && item.kind === 'pics');
        label = 'image';
      } else if (cat === 'sounds' || cat === 'audio') {
        toDelete = conAttachments.filter(item => item && item.kind === 'sounds');
        label = 'audio';
      } else if (cat === 'videos' || cat === 'video') {
        toDelete = conAttachments.filter(item => item && (item.kind === 'video' || item.kind === 'videos'));
        label = 'video';
      } else if (cat === 'other') {
        toDelete = conAttachments.filter(item => item && !['pdf', 'pics', 'sounds', 'videos'].includes(item.kind));
        label = 'other';
      } else {
        toDelete = conAttachments.filter(item => item && item.kind === cat);
        label = cat;
      }

      if (!toDelete.length) return 0;

      const deleteIds = new Set(toDelete.map(a => String(a.id || '')));

      conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();

      conPageSnapshots = conPageSnapshots.map(page => {
        const base = page && typeof page === 'object' ? page : conBuildEmptyPageSnapshot();
        return {
          ...base,
          media: Array.isArray(base.media)
            ? base.media.filter(item => !deleteIds.has(String((item && item.attachmentId) || '')))
            : [],
          backgroundPdf: (base.backgroundPdf && deleteIds.has(String(base.backgroundPdf.attachmentId || '')))
            ? null
            : (base.backgroundPdf || null),
          boardBg: (base.boardBg && deleteIds.has(String(base.boardBg.attachmentId || '')))
            ? null
            : (base.boardBg || null)
        };
      });

      _conRestorePageToBoard(conPageSnapshots[conCurrentPageIndex] || conBuildEmptyPageSnapshot());
      if (window.conUpdatePageBar) window.conUpdatePageBar();

      for (const item of toDelete) {
        if (item && item._cachedObjectUrl) {
          try { URL.revokeObjectURL(item._cachedObjectUrl); } catch { }
        }
        const removedRelativePath = String((item && item.relativePath) || '').trim();
        if (removedRelativePath
          && window.Desktop
          && Desktop.isElectron()
          && typeof Desktop.deleteByPath === 'function') {
          try {
            await Desktop.deleteByPath('mindmaps', removedRelativePath, { recursive: false, force: true });
          } catch (error) {
            console.warn('Could not delete attachment file from disk:', removedRelativePath, error);
          }
        }
      }

      conAttachments = conAttachments.filter(item => !deleteIds.has(String(item.id || '')));

      conRenderAttachmentSummary();
      if (!(options && options.silent) && typeof mdbToast === 'function') {
        mdbToast('Deleted ' + toDelete.length + ' ' + label + ' attachment' + (toDelete.length === 1 ? '' : 's') + '.');
      }
      return toDelete.length;
    }

    function conOpenRemoveAllAttachedPopover(anchorBtn) {
      conRemoveManageMediaDeletePopup();
      if (!Array.isArray(conAttachments) || conAttachments.length === 0) {
        if (typeof mdbToast === 'function') mdbToast('No attached documents to remove.');
        return;
      }

      const counts = { all: conAttachments.length, pdf: 0, pics: 0, sounds: 0, videos: 0, other: 0 };
      conAttachments.forEach(att => {
        const k = att && att.kind;
        if (k === 'pdf') counts.pdf += 1;
        else if (k === 'pics') counts.pics += 1;
        else if (k === 'sounds') counts.sounds += 1;
        else if (k === 'videos') counts.videos += 1;
        else counts.other += 1;
      });

      const pop = document.createElement('div');
      pop.id = 'con-media-delete-popover';
      pop.className = 'con-media-delete-popover';
      pop.style.width = '330px';
      pop.style.maxWidth = 'calc(100vw - 16px)';

      function renderCategoryChoices() {
        pop.innerHTML = '';

        const title = document.createElement('div');
        title.style.cssText = 'font-weight:800; font-size:0.82rem; color:#111; display:flex; align-items:center; gap:6px; margin-bottom:2px;';
        title.innerHTML = '<span>' + (t('conRemoveAllAttachedTitle') || 'Remove Attached Documents') + '</span>';
        pop.appendChild(title);

        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:0.75rem; color:#555; margin-bottom:8px; line-height:1.3;';
        hint.textContent = t('conRemoveAllAttachedHint') || 'Choose which attachments to permanently remove from this board:';
        pop.appendChild(hint);

        const list = document.createElement('div');
        list.style.cssText = 'display:flex; flex-direction:column; gap:5px; margin-bottom:8px;';

        const categories = [
          { key: 'all', label: t('conRemoveAllCategories') || 'All attached documents (All categories)', count: counts.all, danger: true },
          { key: 'pdf', label: t('conRemoveAllPdf') || 'All PDF documents', count: counts.pdf },
          { key: 'pics', label: t('conRemoveAllImages') || 'All Images', count: counts.pics },
          { key: 'sounds', label: t('conRemoveAllAudio') || 'All Sounds / Audio', count: counts.sounds },
          { key: 'videos', label: t('conRemoveAllVideos') || 'All Videos', count: counts.videos },
        ];
        if (counts.other > 0) {
          categories.push({ key: 'other', label: t('conRemoveAllOther') || 'Other Documents', count: counts.other });
        }

        categories.forEach(cat => {
          if (cat.count === 0 && cat.key !== 'all') return;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'con-media-manage-btn' + (cat.danger ? ' con-media-manage-btn-danger' : '');
          btn.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:6px 10px; font-size:0.76rem; border-radius:5px; text-align:left; gap:8px;' + (cat.danger ? ' font-weight:800;' : '');

          const labelSpan = document.createElement('span');
          labelSpan.textContent = cat.label;
          const badge = document.createElement('span');
          badge.style.cssText = 'font-weight:700; opacity:0.8; font-size:0.72rem; padding:1px 6px; border-radius:10px; background:rgba(0,0,0,0.06); flex-shrink:0;';
          badge.textContent = cat.count;

          btn.appendChild(labelSpan);
          btn.appendChild(badge);
          btn.onclick = () => renderConfirmation(cat);
          list.appendChild(btn);
        });

        pop.appendChild(list);

        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex; justify-content:flex-end;';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'con-media-manage-btn';
        cancelBtn.textContent = t('btnCancel') || 'Cancel';
        cancelBtn.onclick = () => conRemoveManageMediaDeletePopup();
        footer.appendChild(cancelBtn);
        pop.appendChild(footer);
      }

      function renderConfirmation(cat) {
        pop.innerHTML = '';

        const title = document.createElement('div');
        title.style.cssText = 'font-weight:800; font-size:0.82rem; color:#b91c1c; display:flex; align-items:center; gap:6px; margin-bottom:4px;';
        title.innerHTML = '<span>Confirm Removal</span>';
        pop.appendChild(title);

        const msg = document.createElement('div');
        msg.style.cssText = 'font-size:0.77rem; color:#222; line-height:1.4; margin-bottom:12px;';
        if (cat.key === 'all') {
          msg.textContent = 'Delete ALL ' + cat.count + ' attached document(s) across all categories? This will permanently remove them from all board pages and session files.';
        } else {
          msg.textContent = 'Delete all ' + cat.count + ' attached ' + cat.label.toLowerCase() + '? This will permanently remove them from all board pages and session files.';
        }
        pop.appendChild(msg);

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex; justify-content:flex-end; gap:6px;';

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'con-media-manage-btn';
        backBtn.textContent = 'Back';
        backBtn.onclick = () => renderCategoryChoices();

        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'con-media-manage-btn con-media-manage-btn-danger';
        confirmBtn.textContent = 'Delete ' + (cat.key === 'all' ? 'All' : cat.count);
        confirmBtn.onclick = async () => {
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Deleting...';
          await conDeleteAttachmentsBulk(cat.key);
          conRemoveManageMediaDeletePopup();
          window.conOpenManageMediaChooser({ keepPosition: true });
        };

        actions.appendChild(backBtn);
        actions.appendChild(confirmBtn);
        pop.appendChild(actions);
      }

      renderCategoryChoices();
      document.body.appendChild(pop);

      const rect = anchorBtn && typeof anchorBtn.getBoundingClientRect === 'function'
        ? anchorBtn.getBoundingClientRect()
        : { left: window.innerWidth / 2, top: window.innerHeight / 2, bottom: window.innerHeight / 2 };

      const popRect = pop.getBoundingClientRect();
      let left = Math.round(rect.left);
      let top = Math.round(rect.bottom + 8);
      if (left + popRect.width > window.innerWidth - 8) {
        left = Math.max(8, Math.round(window.innerWidth - popRect.width - 8));
      }
      if (top + popRect.height > window.innerHeight - 8) {
        top = Math.max(8, Math.round(rect.top - popRect.height - 8));
      }

      pop.style.left = left + 'px';
      pop.style.top = top + 'px';

      const onOutside = ev => {
        if (!pop.contains(ev.target)) {
          conRemoveManageMediaDeletePopup();
          document.removeEventListener('mousedown', onOutside, true);
        }
      };

      setTimeout(() => {
        document.addEventListener('mousedown', onOutside, true);
      }, 0);
    }

    window.conOpenManageMediaChooser = function (anchorOrOptions) {
      conRemoveInsertAttachmentChooser();

      const opts = (anchorOrOptions && !anchorOrOptions.getBoundingClientRect)
        ? anchorOrOptions
        : {};
      const keepPosition = !!(opts && opts.keepPosition);
      const anchorEl = (anchorOrOptions && anchorOrOptions.getBoundingClientRect)
        ? anchorOrOptions
        : (document.getElementById('con-manage-media-btn') || null);
      const rect = anchorEl ? anchorEl.getBoundingClientRect() : { left: 120, top: 100, height: 30 };

      const chooser = document.createElement('div');
      chooser.id = 'con-insert-attachment-chooser';
      chooser.className = 'con-insert-attachment-chooser';
      if (keepPosition && conManageMediaChooserPos) {
        chooser.style.left = conManageMediaChooserPos.left + 'px';
        chooser.style.top = conManageMediaChooserPos.top + 'px';
      } else {
        chooser.style.left = (rect.left + window.scrollX) + 'px';
        chooser.style.top = (rect.bottom + window.scrollY + 6) + 'px';
      }

      const title = document.createElement('div');
      title.className = 'con-insert-attachment-title';
      title.textContent = 'Manage Attached Media';
      chooser.appendChild(title);

      const quickActions = document.createElement('div');
      quickActions.className = 'con-media-manage-quick-actions';

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'con-media-manage-btn';
      addBtn.textContent = ' Attach';
      addBtn.onclick = () => {
        conRemoveInsertAttachmentChooser();
        window.conPickAttachments();
      };

      const recordBtn = document.createElement('button');
      recordBtn.type = 'button';
      recordBtn.className = 'con-media-manage-btn';
      recordBtn.textContent = t('recordAudio') || ' Record Audio';
      recordBtn.onclick = () => {
        conRemoveInsertAttachmentChooser();
        conOpenRecordPopup();
      };

      const removeAllBtn = document.createElement('button');
      removeAllBtn.type = 'button';
      removeAllBtn.className = 'con-media-manage-btn';
      removeAllBtn.textContent = ' Media';
      removeAllBtn.title = 'Remove all inserted image/audio/video objects';
      removeAllBtn.onclick = () => {
        window.conRemoveInsertedMedia();
        window.conOpenManageMediaChooser({ keepPosition: true });
      };

      const clearPdfBtn = document.createElement('button');
      clearPdfBtn.type = 'button';
      clearPdfBtn.className = 'con-media-manage-btn';
      clearPdfBtn.textContent = ' PDF';
      clearPdfBtn.title = 'Remove inserted PDF boxes from this page';
      clearPdfBtn.onclick = () => {
        window.conClearPagePdfBackground();
        window.conOpenManageMediaChooser({ keepPosition: true });
      };

      const removeAttachedBtn = document.createElement('button');
      removeAttachedBtn.type = 'button';
      removeAttachedBtn.className = 'con-media-manage-btn con-media-manage-btn-danger';
      removeAttachedBtn.textContent = (t('conRemoveAttachedDocs') || 'Attached Docs ▾');
      removeAttachedBtn.title = 'Remove attached documents (all categories, PDFs, images, etc.)';
      if (!conAttachments.length) {
        removeAttachedBtn.disabled = true;
        removeAttachedBtn.style.opacity = '0.5';
        removeAttachedBtn.style.cursor = 'not-allowed';
      } else {
        removeAttachedBtn.onclick = (e) => {
          e.stopPropagation();
          conOpenRemoveAllAttachedPopover(removeAttachedBtn);
        };
      }

      quickActions.appendChild(addBtn);
      quickActions.appendChild(recordBtn);
      quickActions.appendChild(removeAllBtn);
      quickActions.appendChild(clearPdfBtn);
      quickActions.appendChild(removeAttachedBtn);
      chooser.appendChild(quickActions);

      if (!conAttachments.length) {
        const empty = document.createElement('div');
        empty.className = 'con-media-manage-empty';
        empty.textContent = 'No attachments yet. Use Attach to add media files.';
        chooser.appendChild(empty);
      } else {
        const attachHeaderRow = document.createElement('div');
        attachHeaderRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:4px 4px 2px; font-size:0.72rem; color:#666; font-weight:700; border-top:1px dashed #e2e8f0; margin-top:2px;';

        const countLabel = document.createElement('span');
        countLabel.textContent = conAttachments.length + ' attached document' + (conAttachments.length === 1 ? '' : 's');
        attachHeaderRow.appendChild(countLabel);

        const removeAllLink = document.createElement('button');
        removeAllLink.type = 'button';
        removeAllLink.className = 'con-media-manage-btn con-media-manage-btn-danger';
        removeAllLink.style.fontSize = '0.68rem';
        removeAllLink.textContent = (t('conRemoveAttachedDocs') || 'Remove all attached...');
        removeAllLink.title = 'Remove all attached documents (all categories, PDFs, images, etc.)';
        removeAllLink.onclick = (e) => {
          e.stopPropagation();
          conOpenRemoveAllAttachedPopover(removeAllLink);
        };
        attachHeaderRow.appendChild(removeAllLink);
        chooser.appendChild(attachHeaderRow);
      }

      conAttachments.forEach(att => {
        const row = document.createElement('div');
        row.className = 'con-insert-attachment-item';
        if (att.kind === 'pics' || att.kind === 'pdf') {
          row.addEventListener('contextmenu', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const oldMenu = document.getElementById('con-media-row-ctx-menu');
            if (oldMenu) oldMenu.remove();
            const menu = document.createElement('div');
            menu.id = 'con-media-row-ctx-menu';
            menu.className = 'con-mini-thumb-menu';
            const addRowItem = (iconFile, text, fn) => {
              const b = document.createElement('button');
              b.type = 'button';
              b.className = 'con-mini-thumb-menu-item';
              b.style.display = 'flex';
              b.style.alignItems = 'center';
              b.style.gap = '6px';
              b.innerHTML = '<img src="../assets/icons/' + iconFile + '" style="width:13px;height:13px;flex-shrink:0;" alt="" /> <span></span>';
              b.querySelector('span').textContent = text;
              b.onclick = (ce) => {
                ce.stopPropagation();
                menu.remove();
                fn();
              };
              menu.appendChild(b);
            };
            addRowItem(
              'pdf-viewer.svg',
              (typeof t === 'function' ? t('fmOpenInPdfStudio') : '') || 'Open in PDF Viewer',
              () => {
                if (att.relativePath && window.Desktop && Desktop.isElectron()) {
                  Desktop.openTool('pdf-viewer.html', { query: { openTarget: 'mindmaps', openRelPath: att.relativePath } });
                } else if (att.dataUrl) {
                  const key = 'cmt_pdf_open_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                  try {
                    localStorage.setItem(key, JSON.stringify({ dataUrl: att.dataUrl, filename: att.name || 'image.png' }));
                    if (window.Desktop && Desktop.isElectron()) {
                      Desktop.openTool('pdf-viewer.html', { query: { openStorageKey: key } });
                    } else {
                      window.open('pdf-viewer.html?openStorageKey=' + encodeURIComponent(key), '_blank');
                    }
                  } catch (_) {}
                }
              }
            );
            if (att.relativePath && window.Desktop && Desktop.isElectron()) {
              addRowItem('saved-files.svg', (typeof t === 'function' ? t('fmOpenInSystem') : '') || 'Open file in system', () => {
                Desktop.openNative('mindmaps', att.relativePath);
              });
              addRowItem('file-manager.svg', (typeof t === 'function' ? t('fmOpenLocation') : '') || 'Open location', () => {
                Desktop.showInFolder('mindmaps', att.relativePath);
              });
            }
            document.body.appendChild(menu);
            const mw = menu.offsetWidth || 200;
            const mh = menu.offsetHeight || 120;
            menu.style.left = Math.min(ev.clientX, window.innerWidth - mw - 8) + 'px';
            menu.style.top = Math.min(ev.clientY, window.innerHeight - mh - 8) + 'px';
            setTimeout(() => {
              const closeFn = (ce) => {
                if (!menu.contains(ce.target)) {
                  menu.remove();
                  document.removeEventListener('click', closeFn);
                  document.removeEventListener('contextmenu', closeFn);
                }
              };
              document.addEventListener('click', closeFn);
              document.addEventListener('contextmenu', closeFn);
            }, 0);
          });
        }

        const label = document.createElement('div');
        label.className = 'con-media-manage-label';
        const icon = att.kind === 'pics' ? '' : att.kind === 'sounds' ? '' : att.kind === 'videos' ? '' : '';
        const placedCount = conCountAttachmentPlacedOnCurrentPage(att.id);
        label.textContent = icon + ' ' + att.name + (placedCount > 0 ? (' (' + placedCount + ' on page)') : '');

        const actions = document.createElement('div');
        actions.className = 'con-media-manage-actions';

        const insertBtn = document.createElement('button');
        insertBtn.type = 'button';
        insertBtn.className = 'con-media-manage-btn';
        insertBtn.textContent = att.kind === 'videos' ? (typeof t === 'function' ? t('conMediaInsertNodeBtn', 'Insert as Node') : 'Insert as Node') : (typeof t === 'function' ? t('conMediaInsertBtn', 'Insert') : 'Insert');
        insertBtn.onclick = async () => {
          await window.conInsertAttachmentById(att.id);
          window.conOpenManageMediaChooser({ keepPosition: true });
        };
        actions.appendChild(insertBtn);

        if (att.kind === 'videos') {
          const insertBoxBtn = document.createElement('button');
          insertBoxBtn.type = 'button';
          insertBoxBtn.className = 'con-media-manage-btn';
          insertBoxBtn.textContent = typeof t === 'function' ? t('conMediaInsertCanvasBoxBtn', 'Insert as Canvas Box') : 'Insert as Canvas Box';
          insertBoxBtn.onclick = async () => {
            await window.conInsertAttachmentById(att.id, { asCanvasBox: true });
            window.conOpenManageMediaChooser({ keepPosition: true });
          };
          actions.appendChild(insertBoxBtn);
        }

        if (att.kind === 'sounds' || att.kind === 'videos') {
          const convBtn = document.createElement('button');
          convBtn.type = 'button';
          convBtn.className = 'con-media-manage-btn';
          convBtn.innerHTML = '<img src="../assets/icons/media-converter.svg" style="width:11px;height:11px;vertical-align:-1px;margin-right:2px;" alt="" />' + (typeof t === 'function' ? t('conMediaConvertBtn', 'Convert') : 'Convert');
          convBtn.title = 'Open in Media Converter';
          convBtn.onclick = async () => {
            const targetPath = (typeof window.conResolveAttachmentDiskPath === 'function')
              ? await window.conResolveAttachmentDiskPath(att)
              : (att.path || (att.file && att.file.path) || att.relativePath || att.name || '');
            if (window.MediaConverterService && typeof window.MediaConverterService.openMediaConverter === 'function') {
              window.MediaConverterService.openMediaConverter(targetPath);
            }
          };
          actions.appendChild(convBtn);
        }

        if (att.kind === 'sounds') {
          const transBtn = document.createElement('button');
          transBtn.type = 'button';
          transBtn.className = 'con-media-manage-btn';
          transBtn.innerHTML = '<img src="../assets/icons/transcript.svg" style="width:11px;height:11px;vertical-align:-1px;margin-right:2px;" alt="" />' + (typeof t === 'function' ? t('conMediaTranscribeBtn', 'Transcript') : 'Transcript');
          transBtn.title = 'Audio Transcript Studio';
          transBtn.onclick = () => {
            if (typeof window.conOpenAudioTranscript === 'function') {
              window.conOpenAudioTranscript(att);
            }
          };
          actions.appendChild(transBtn);
        }

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'con-media-manage-btn';
        removeBtn.textContent = 'Remove from board';
        removeBtn.onclick = () => {
          conRemoveAttachmentFromCurrentPage(att.id);
          window.conOpenManageMediaChooser({ keepPosition: true });
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'con-media-manage-btn con-media-manage-btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => conOpenManageMediaDeletePopover(att, deleteBtn);

        actions.appendChild(insertBtn);
        actions.appendChild(removeBtn);
        actions.appendChild(deleteBtn);
        row.appendChild(label);
        row.appendChild(actions);
        chooser.appendChild(row);
      });

      document.body.appendChild(chooser);
      conManageMediaChooserPos = {
        left: chooser.offsetLeft,
        top: chooser.offsetTop
      };

      if (conManageMediaChooserOutsideClick) {
        document.removeEventListener('mousedown', conManageMediaChooserOutsideClick, true);
      }
      if (conManageMediaChooserKey) {
        document.removeEventListener('keydown', conManageMediaChooserKey, true);
      }

      function onOutsideClick(ev) {
        const deletePop = document.getElementById('con-media-delete-popover');
        if (!chooser.contains(ev.target) && !(deletePop && deletePop.contains(ev.target))) {
          conRemoveInsertAttachmentChooser();
        }
      }
      function onKey(ev) {
        if (ev.key === 'Escape') {
          conRemoveInsertAttachmentChooser();
        }
      }

      conManageMediaChooserOutsideClick = onOutsideClick;
      conManageMediaChooserKey = onKey;

      setTimeout(() => {
        if (conManageMediaChooserOutsideClick === onOutsideClick) {
          document.addEventListener('mousedown', onOutsideClick, true);
        }
        if (conManageMediaChooserKey === onKey) {
          document.addEventListener('keydown', onKey, true);
        }
      }, 0);
    };

    // Backward compatibility for previous button handler name.
    window.conOpenInsertAttachmentChooser = function () {
      window.conOpenManageMediaChooser();
    };

    function conEnsurePdfBackgroundLayer() {
      const existing = document.getElementById('con-page-pdf-bg');
      if (existing) existing.remove();
      return null;
    }

    async function conRenderPagePdfBackground(options = {}) {
      conEnsurePdfBackgroundLayer();
      if (!conPageBackgroundPdf) return;

      const legacyPdf = {
        attachmentId: String(conPageBackgroundPdf.attachmentId || ''),
        name: String(conPageBackgroundPdf.name || 'document.pdf'),
        mime: String(conPageBackgroundPdf.mime || 'application/pdf'),
        relativePath: String(conPageBackgroundPdf.relativePath || ''),
        pageNumber: Math.max(1, Number(conPageBackgroundPdf.pageNumber) || 1),
        file: conPageBackgroundPdf.file || null
      };

      const linked = conResolvePdfBackgroundAttachment(legacyPdf);
      if (linked) {
        legacyPdf.attachmentId = linked.id;
        if (linked.name) legacyPdf.name = linked.name;
        if (linked.mime) legacyPdf.mime = linked.mime;
        if (linked.relativePath) legacyPdf.relativePath = linked.relativePath;
        if (linked.file) legacyPdf.file = linked.file;
      }

      const duplicate = conMediaItems.some(item =>
        item &&
        item.kind === 'pdf' &&
        String(item.attachmentId || '') === String(legacyPdf.attachmentId || '') &&
        Math.max(1, Number(item.pageNumber) || 1) === legacyPdf.pageNumber
      );

      if (!duplicate) {
        const mediaItem = conBuildPdfMediaItem(legacyPdf);
        if (mediaItem) {
          conMediaItems.push(mediaItem);
          conBuildMediaWidget(mediaItem);
        }
      }

      conPageBackgroundPdf = null;
      if (!options.silent && typeof mdbToast === 'function') {
        mdbToast(' Inserted PDF as a resizable box.');
      }
    }
    global.conRenderPagePdfBackground = window.conRenderPagePdfBackground = conRenderPagePdfBackground;

    window.conClearPagePdfBackground = function () {
      const removeIds = new Set(
        conMediaItems
          .filter(item => item && item.kind === 'pdf')
          .map(item => String(item.id || ''))
      );
      if (removeIds.size) {
        conMediaItems = conMediaItems.filter(item => !removeIds.has(String(item.id || '')));
        document.querySelectorAll('.con-media-item').forEach(el => {
          if (removeIds.has(String(el.dataset.id || ''))) el.remove();
        });
      }
      conPageBackgroundPdf = null;
      conRenderPagePdfBackground({ silent: true });
      mdbToast(removeIds.size
        ? (' Cleared ' + removeIds.size + ' PDF box(es) from this page.')
        : 'ℹ No PDF boxes on this page.');
    };

    async function conRenderPdfCanvas(item, canvas, contentEl) {
      let pdfjsLib;
      try {
        pdfjsLib = await conEnsurePdfjsLib();
      } catch (e) {
        console.error('[PDF.js] Failed to load:', e);
        return;
      }
      if (!item._pdfDoc) {
        const buf = await conGetAttachmentArrayBuffer(item);
        if (!buf) return;
        try {
          item._pdfDoc = await pdfjsLib.getDocument(conPdfGetDocumentParams({ data: new Uint8Array(buf) })).promise;
        } catch (e) {
          console.error('[PDF.js] getDocument failed:', e);
          return;
        }
      }
      const pageNum = Math.max(1, Math.min(item._pdfDoc.numPages, Number(item.pageNumber) || 1));
      let page;
      try { page = await item._pdfDoc.getPage(pageNum); } catch (e) { return; }
      const contentW = contentEl.clientWidth || item.w;
      const contentH = contentEl.clientHeight || Math.max(1, item.h - 24);
      if (contentW < 2 || contentH < 2) return;
      if (!(Number.isFinite(item._pdfBaseW) && item._pdfBaseW > 1)) item._pdfBaseW = Math.max(1, contentW);
      if (!(Number.isFinite(item._pdfBaseH) && item._pdfBaseH > 1)) item._pdfBaseH = Math.max(1, contentH);
      const baseVp = page.getViewport({ scale: 1 });
      const fitScale = (item.pdfFit === 'v')
        ? (item._pdfBaseH / baseVp.height)
        : (item._pdfBaseW / baseVp.width);
      const scale = fitScale * (item.pdfZoom || 1);
      const viewport = page.getViewport({ scale });
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      canvas.style.width = canvas.width + 'px';
      canvas.style.height = canvas.height + 'px';
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      try { await page.render({ canvasContext: ctx, viewport }).promise; } catch (e) { /* ignore abort */ }
      // Resize widget to exactly fit the rendered canvas (no grey gap)
      const wrap = contentEl.closest('.con-media-item');
      if (wrap) {
        item.w = canvas.width;
        item.h = canvas.height + 24; // 24px = header height
        wrap.style.width = item.w + 'px';
        wrap.style.height = item.h + 'px';
      }
    }

    // Canvas-based PDF renderer: full control of zoom, rotation, scroll — can be synced to mirror.
    async function conRenderPdfForItem(item, canvas, scrollDiv, contentEl) {
      if (!item) return;
      // Cancel any previous active render task on this canvas / item to avoid concurrent GPU thread collision
      if (canvas && canvas._activePdfRenderTask) {
        try { canvas._activePdfRenderTask.cancel(); } catch (_) { }
        canvas._activePdfRenderTask = null;
      }
      if (item && item._activePdfRenderTask) {
        try { item._activePdfRenderTask.cancel(); } catch (_) { }
        item._activePdfRenderTask = null;
      }
      const renderTask = (async () => {
        let pdfjsLib;
        try { pdfjsLib = await conEnsurePdfjsLib(); } catch (e) { return; }
        const docCacheKey = String(item.attachmentId || item.id || item.relativePath || item.name || '');
        let pdfDoc = (docCacheKey && window._conPdfDocCache && window._conPdfDocCache.get(docCacheKey)) || item._pdfDoc || null;
        if (pdfDoc && (pdfDoc.destroyed || typeof pdfDoc.getPage !== 'function')) {
          pdfDoc = null;
          if (docCacheKey && window._conPdfDocCache) window._conPdfDocCache.delete(docCacheKey);
        }
        if (!pdfDoc) {
          const buf = await conGetAttachmentArrayBuffer(item);
          if (!buf) {
            console.warn('[conRenderPdfForItem] Could not obtain array buffer for item:', item.name || item.id);
            return;
          }
          try {
            pdfDoc = await pdfjsLib.getDocument(conPdfGetDocumentParams({ data: new Uint8Array(buf) })).promise;
            if (docCacheKey && window._conPdfDocCache) window._conPdfDocCache.set(docCacheKey, pdfDoc);
          } catch (e) {
            console.error('[conRenderPdfForItem] PDF getDocument failed:', e);
            return;
          }
        }
        item._pdfDoc = pdfDoc;
        const pageNum = Math.max(1, Math.min(item._pdfDoc.numPages, Number(item.pageNumber) || 1));
        let page;
        try { page = await item._pdfDoc.getPage(pageNum); } catch (e) {
          console.error('[conRenderPdfForItem] getPage failed:', e);
          return;
        }
        const rotation = (((Number(item.pdfRotation) || 0) % 360) + 360) % 360;
        let contentW = contentEl ? Math.max(10, contentEl.clientWidth || item.w) : item.w;
        let contentH = contentEl ? Math.max(10, contentEl.clientHeight || item.h) : item.h;
        if (item._fullscreen) {
          contentW = window.innerWidth;
          contentH = window.innerHeight;
        }
        const baseVp = page.getViewport({ scale: 1, rotation });

        if (baseVp && baseVp.width > 0 && baseVp.height > 0) {
          if (!item._ratioInitialized && !item._fullscreen) {
            item._ratioInitialized = true;
            const pdfAspect = baseVp.height / baseVp.width;
            const board = document.getElementById('constellation-board');
            const boardH = board ? Math.max(320, board.clientHeight || 0) : 1400;
            const targetH = Math.max(100, Math.min(boardH - 24, Math.round(item.w * pdfAspect)));
            if (Math.abs((item.h || 0) - targetH) > 2) {
              item.h = targetH;
              contentH = targetH;
              if (contentEl) {
                const wrapEl = contentEl.closest('.con-media-item');
                if (wrapEl) wrapEl.style.height = targetH + 'px';
              }
            }
          }
        }
        const fitScale = baseVp.width > 0 ? contentW / baseVp.width : 1;

        let scale;
        if (item.pdfLockSize || item._fullscreen) {
          const fitScaleH = baseVp.height > 0 ? contentH / baseVp.height : 1;
          scale = Math.min(fitScale, fitScaleH);
          if (!item._fullscreen) {
            item.pdfZoom = scale / fitScale;
          }
        } else {
          const zoom = item.pdfZoom != null ? Number(item.pdfZoom) : 1;
          scale = Math.max(0.05, fitScale * zoom);
        }

        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale: scale * dpr, rotation });
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        canvas.style.width = Math.round(viewport.width / dpr) + 'px';
        canvas.style.height = Math.round(viewport.height / dpr) + 'px';
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const currentActiveTask = page.render({
          canvasContext: ctx,
          viewport: viewport
        });
        if (canvas) canvas._activePdfRenderTask = currentActiveTask;
        if (item) item._activePdfRenderTask = currentActiveTask;

        try {
          await currentActiveTask.promise;
        } catch (e) {
          /* Render cancellation is expected when resizing/zooming rapidly */
        } finally {
          if (canvas && canvas._activePdfRenderTask === currentActiveTask) canvas._activePdfRenderTask = null;
          if (item && item._activePdfRenderTask === currentActiveTask) item._activePdfRenderTask = null;
        }

        if (scrollDiv) {
          if (item.pdfLockSize || item._fullscreen) {
            scrollDiv.style.overflow = 'hidden';
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.bottom = '0';
            canvas.style.left = '0';
            canvas.style.right = '0';
            canvas.style.margin = 'auto';
            scrollDiv.scrollLeft = 0;
            scrollDiv.scrollTop = 0;
          } else {
            scrollDiv.style.overflow = 'auto';
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.bottom = 'auto';
            canvas.style.left = '0';
            canvas.style.right = 'auto';
            canvas.style.margin = '0';
            scrollDiv.scrollLeft = Math.round(Number(item.pdfScrollX) || 0);
            scrollDiv.scrollTop = Math.round(Number(item.pdfScrollY) || 0);
          }
        }
      })();
      item._renderPromise = renderTask;
      if (canvas) canvas._renderPromise = renderTask;
      return renderTask;
    }

    async function conAwaitAllPdfRendersOnBoard() {
      const board = document.getElementById('constellation-board');
      if (!board) return;
      const pdfWraps = Array.from(board.querySelectorAll('.con-media-kind-pdf'));
      const promises = [];
      pdfWraps.forEach(wrap => {
        const canvas = wrap.querySelector('canvas');
        const itemId = wrap.dataset.id;
        const item = (typeof conMediaItems !== 'undefined') ? conMediaItems.find(m => String(m.id) === String(itemId)) : null;
        if (item && item._renderPromise) {
          promises.push(item._renderPromise);
        } else if (canvas && canvas._renderPromise) {
          promises.push(canvas._renderPromise);
        } else if (item && typeof conRenderPdfForItem === 'function' && canvas) {
          const scrollDiv = wrap.querySelector('.con-pdf-scroll-wrap');
          const contentEl = wrap.querySelector('.con-media-content');
          item._renderPromise = conRenderPdfForItem(item, canvas, scrollDiv, contentEl);
          promises.push(item._renderPromise);
        }
      });
      if (promises.length > 0) {
        try { await Promise.all(promises); } catch (e) { console.warn('[PDF Export] Error awaiting PDF renders:', e); }
      }
    }
    window.conAwaitAllPdfRendersOnBoard = global.conAwaitAllPdfRendersOnBoard = conAwaitAllPdfRendersOnBoard;

    async function conAwaitAllMediaRendersOnBoard() {
      const board = document.getElementById('constellation-board');
      if (!board) return;
      const mediaWraps = Array.from(board.querySelectorAll('.con-media-item'));
      const promises = [];
      const mItems = (typeof conMediaItems !== 'undefined' && Array.isArray(conMediaItems)) ? conMediaItems : [];
      mediaWraps.forEach(wrap => {
        const itemId = wrap.dataset.id;
        const item = mItems.find(m => String(m.id) === String(itemId));
        if (item && item._renderPromise) {
          promises.push(item._renderPromise);
        }
        const img = wrap.querySelector('img');
        if (img) {
          if (!img.complete && img.src) {
            promises.push(new Promise(r => {
              img.onload = r;
              img.onerror = r;
              setTimeout(r, 1500);
            }));
          }
        }
      });
      if (promises.length > 0) {
        try { await Promise.all(promises); } catch (e) { console.warn('[Media Await] Error awaiting media renders:', e); }
      }
    }
    window.conAwaitAllMediaRendersOnBoard = global.conAwaitAllMediaRendersOnBoard = conAwaitAllMediaRendersOnBoard;

    async function conRenderPdfNative(item, frameEl) {
      if (!item || !frameEl) return;
      const att = conFindAttachmentById(item.attachmentId) || item;
      const src = await conGetAttachmentDataUrl(att);
      if (!src) {
        frameEl.removeAttribute('src');
        return;
      }
      const pageNum = Math.max(1, Number(item.pageNumber) || 1);
      const zoom = Math.max(25, Math.min(400, Math.round(100 * (Number(item.pdfZoom) || 1))));
      const fallbackState = 'page=' + pageNum + '&zoom=' + zoom;
      const state = String(item._pdfViewerState || '').trim() || fallbackState;
      const nextSrc = src + '#' + state.replace(/^#/, '');
      if (frameEl.dataset.srcSignature !== nextSrc) {
        frameEl.dataset.srcSignature = nextSrc;
        frameEl.src = nextSrc;
      }
    }

    function conReadPdfIframeViewState(frameEl) {
      if (!frameEl) return '';
      // Prefer live viewer hash if accessible; otherwise fall back to iframe src hash.
      try {
        const liveHash = String((frameEl.contentWindow && frameEl.contentWindow.location && frameEl.contentWindow.location.hash) || '');
        if (liveHash && liveHash.length > 1) return liveHash.slice(1);
      } catch (e) { }
      try {
        const src = String(frameEl.src || '');
        const idx = src.indexOf('#');
        if (idx >= 0 && idx < src.length - 1) return src.slice(idx + 1);
      } catch (e) { }
      return '';
    }

    function conBuildMediaWidget(item) {
      const board = document.getElementById('constellation-board');
      if (!board || !item) return;
      const wrap = document.createElement('div');
      wrap.className = 'con-media-item con-media-kind-' + item.kind;
      wrap.dataset.id = item.id;
      wrap.style.left = item.x + 'px';
      wrap.style.top = item.y + 'px';
      wrap.style.width = item.w + 'px';
      wrap.style.height = item.h + 'px';
      if (item.locked) wrap.classList.add('con-media-locked');
      if (item.mediaNumber != null && typeof conApplyEntityBadge === 'function') {
        conApplyEntityBadge(wrap, item.mediaNumber, item.mediaNumberFormat, 'media');
      }
      wrap.addEventListener('contextmenu', function (e) { e.preventDefault(); e.stopPropagation(); window.conMediaCtxOpen(e, item); });

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'con-media-remove-btn';
      closeBtn.textContent = 'x';
      closeBtn.title = 'Remove media item';
      closeBtn.onclick = ev => {
        ev.preventDefault();
        ev.stopPropagation();
        if (item._pdfViewPoll) {
          clearInterval(item._pdfViewPoll);
          item._pdfViewPoll = null;
        }
        if (typeof conMediaSelected !== 'undefined') conMediaSelected.delete(item.id);
        const delMediaId = String(item.id);
        const _edgeList = (typeof window.conGetEdges === 'function') ? window.conGetEdges() : ((typeof conEdges !== 'undefined' && Array.isArray(conEdges)) ? conEdges : (window.conEdges || []));
        for (let i = _edgeList.length - 1; i >= 0; i--) {
          const e = _edgeList[i];
          if (e && (String(e.a) === delMediaId || String(e.b) === delMediaId)) {
            if (e.g && typeof e.g.remove === 'function') e.g.remove();
            _edgeList.splice(i, 1);
            if (window._conSelectedEdgeId === e.id) window._conSelectedEdgeId = null;
            if (typeof window._conMirrorSend === 'function') {
              window._conMirrorSend({ type: 'edge-remove', id: String(e.id) });
            }
          }
        }
        if (typeof conRedrawEdges === 'function') conRedrawEdges();
        conMediaItems = conMediaItems.filter(m => m.id !== item.id);
        if (typeof conGroups !== 'undefined') {
          conGroups.forEach(g => {
            if (g.mediaIds) g.mediaIds = g.mediaIds.filter(id => String(id) !== String(item.id));
          });
          if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
        }
        wrap.remove();
      };
      const content = document.createElement('div');
      content.className = 'con-media-content';

      let mediaEl = null;
      let pdfCanvas = null, pdfScrollDiv = null;
      if (item.kind === 'pics') {
        mediaEl = document.createElement('img');
        mediaEl.alt = item.name || 'image';
      } else if (item.kind === 'sounds') {
        mediaEl = document.createElement('audio');
        mediaEl.controls = true;
      } else if (item.kind === 'videos') {
        mediaEl = document.createElement('video');
        mediaEl.controls = true;
      } else if (item.kind === 'pdf') {
        // Canvas-based PDF renderer — gives full programmatic control for mirror sync
        pdfScrollDiv = document.createElement('div');
        pdfScrollDiv.className = 'con-media-pdf-scroll';
        pdfCanvas = document.createElement('canvas');
        pdfCanvas.className = 'con-media-pdf-canvas';
        pdfScrollDiv.appendChild(pdfCanvas);
        content.appendChild(pdfScrollDiv);

        const pdfToolbar = document.createElement('div');
        pdfToolbar.className = 'con-media-pdf-toolbar';
        const _pdfMkBtn = (text, title, fn) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'con-media-pdf-tb-btn';
          b.textContent = text; b.title = title;
          b.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
          b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); fn(); });
          return b;
        };
        const _pdfRerender = () => conRenderPdfForItem(item, pdfCanvas, pdfScrollDiv, content);
        const _pdfSync = () => {
          if (window._conMirrorBroadcast) window._conMirrorBroadcast();
          if (window._conMirrorSend) window._conMirrorSend({
            type: 'pdf-view-state', itemId: String(item.id),
            pdfZoom: item.pdfZoom || 1, pdfRotation: item.pdfRotation || 0,
            pdfScrollX: item.pdfScrollX || 0, pdfScrollY: item.pdfScrollY || 0,
            pdfLockSize: !!item.pdfLockSize
          });
        };
        pdfToolbar.appendChild(_pdfMkBtn('−', 'Zoom out', () => {
          item.pdfZoom = Math.max(0.1, (item.pdfZoom || 1) / 1.25);
          _pdfRerender().then(_pdfSync);
        }));
        pdfToolbar.appendChild(_pdfMkBtn('+', 'Zoom in', () => {
          item.pdfZoom = Math.min(8, (item.pdfZoom || 1) * 1.25);
          _pdfRerender().then(_pdfSync);
        }));
        pdfToolbar.appendChild(_pdfMkBtn('↔', 'Fit to width', () => {
          item.pdfZoom = 1; item.pdfScrollX = 0; item.pdfScrollY = 0;
          _pdfRerender().then(_pdfSync);
        }));
        pdfToolbar.appendChild(_pdfMkBtn('↺', 'Rotate anticlockwise', () => {
          item.pdfRotation = ((item.pdfRotation || 0) - 90 + 360) % 360;
          item.pdfScrollX = 0; item.pdfScrollY = 0;
          _pdfRerender().then(_pdfSync);
        }));
        // pdfToolbar buttons are moved to the hover mini-actions bar (below)

        pdfScrollDiv.addEventListener('scroll', () => {
          item.pdfScrollX = Math.round(pdfScrollDiv.scrollLeft);
          item.pdfScrollY = Math.round(pdfScrollDiv.scrollTop);
          if (window._conMirrorSend) window._conMirrorSend({
            type: 'pdf-view-state', itemId: String(item.id),
            pdfZoom: item.pdfZoom || 1, pdfRotation: item.pdfRotation || 0,
            pdfScrollX: item.pdfScrollX, pdfScrollY: item.pdfScrollY,
            pdfLockSize: !!item.pdfLockSize
          });
        }, { passive: true });

        item._lastRenderSignature = [item.pageNumber, item.w, item.h, item.pdfZoom || 1, item.pdfRotation || 0, !!item.pdfLockSize].join('|');
        item._renderPromise = conRenderPdfForItem(item, pdfCanvas, pdfScrollDiv, content);
      }

      if (mediaEl) {
        if (item.kind !== 'pdf') mediaEl.className = 'con-media-asset';
        content.appendChild(mediaEl);

        const isMirrorMode = document.documentElement.classList.contains('con-mirror-mode') || location.search.includes('mirror=1');
        if (isMirrorMode) {
          mediaEl.muted = true;
          if (item.kind === 'videos') mediaEl.playsInline = true;
          const applyMirrorMediaSync = function () {
            var st = item._mediaSyncState;
            if (!st) return;
            if (typeof st.playbackRate === 'number' && st.playbackRate > 0) {
              try { mediaEl.playbackRate = st.playbackRate; } catch (_) {}
            }
            if (typeof st.currentTime === 'number' && Number.isFinite(st.currentTime)) {
              if (Math.abs((mediaEl.currentTime || 0) - st.currentTime) > 0.3) {
                try { mediaEl.currentTime = st.currentTime; } catch (_) {}
              }
            }
            if (!st.paused && (st.action === 'play' || st.action === 'timeupdate')) {
              if (mediaEl.paused) {
                try {
                  var p = mediaEl.play();
                  if (p && typeof p.catch === 'function') p.catch(function () {});
                } catch (_) {}
              }
            } else if (st.paused) {
              try { mediaEl.pause(); } catch (_) {}
            }
          };
          mediaEl._applyMirrorMediaSync = applyMirrorMediaSync;
          mediaEl.addEventListener('loadedmetadata', applyMirrorMediaSync);
          mediaEl.addEventListener('canplay', applyMirrorMediaSync);
        } else if (item.kind === 'sounds' || item.kind === 'videos') {
          var _lastMediaSyncTime = 0;
          var _sendMediaSync = function (action, extra) {
            if (window._conMirrorSend) {
              var payload = {
                type: 'media-playback',
                id: String(item.id),
                action: action,
                currentTime: mediaEl.currentTime || 0,
                playbackRate: mediaEl.playbackRate || 1,
                paused: !!mediaEl.paused
              };
              if (extra) Object.assign(payload, extra);
              window._conMirrorSend(payload);
            }
          };
          mediaEl.addEventListener('play', function () { _sendMediaSync('play'); });
          mediaEl.addEventListener('pause', function () { _sendMediaSync('pause'); });
          mediaEl.addEventListener('seeked', function () { _sendMediaSync('seek'); });
          mediaEl.addEventListener('ratechange', function () { _sendMediaSync('ratechange'); });
          mediaEl.addEventListener('timeupdate', function () {
            if (mediaEl.paused) return;
            var now = Date.now();
            if (now - _lastMediaSyncTime >= 1000) {
              _lastMediaSyncTime = now;
              _sendMediaSync('timeupdate');
            }
          });
        }

        if (item.kind === 'sounds' || item.kind === 'videos') {
          const controls = document.createElement('div');
          controls.className = 'con-media-extra-controls';

          const timelineWrap = document.createElement('div');
          timelineWrap.className = 'con-media-timeline-wrap';
          const timelineInput = document.createElement('input');
          timelineInput.type = 'range';
          timelineInput.className = 'con-media-timeline';
          timelineInput.min = '0';
          timelineInput.max = '0';
          timelineInput.value = '0';
          timelineInput.step = '0.1';
          timelineInput.disabled = true;
          const timelineTime = document.createElement('span');
          timelineTime.className = 'con-media-time';
          timelineTime.textContent = '0:00 / 0:00';
          timelineWrap.appendChild(timelineInput);
          timelineWrap.appendChild(timelineTime);

          function conFmtMediaTime(sec) {
            const s = Math.max(0, Math.floor(Number(sec) || 0));
            const m = Math.floor(s / 60);
            const r = s % 60;
            return m + ':' + String(r).padStart(2, '0');
          }

          function syncTimelineFromMedia() {
            let duration = Number(mediaEl.duration);
            const current = Number(mediaEl.currentTime) || 0;
            if (!Number.isFinite(duration) || duration <= 0) {
              if (mediaEl.seekable && mediaEl.seekable.length > 0) {
                const end = mediaEl.seekable.end(mediaEl.seekable.length - 1);
                if (Number.isFinite(end) && end > 0) duration = end;
              }
            }
            if (Number.isFinite(duration) && duration > 0) {
              timelineInput.disabled = false;
              timelineInput.max = String(duration);
              if (!timelineInput.matches(':active')) {
                timelineInput.value = String(Math.max(0, Math.min(duration, current)));
              }
              timelineTime.textContent = conFmtMediaTime(current) + ' / ' + conFmtMediaTime(duration);
            } else {
              timelineInput.disabled = true;
              timelineInput.max = '0';
              timelineInput.value = '0';
              timelineTime.textContent = conFmtMediaTime(current) + ' / ' + (Number.isFinite(duration) ? '0:00' : '…');
            }
          }

          function makeCtrlBtn(iconName, title, onClick, extraText) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'con-media-ctrl-btn';
            btn.innerHTML = '<img src="../assets/icons/' + iconName + '.svg" class="btn-icon" alt="" />' + (extraText ? ' ' + extraText : '');
            btn.title = title;
            btn.addEventListener('mousedown', ev => {
              ev.preventDefault();
              ev.stopPropagation();
            });
            btn.addEventListener('click', ev => {
              ev.preventDefault();
              ev.stopPropagation();
              onClick();
            });
            return btn;
          }

          controls.appendChild(makeCtrlBtn('play', 'Play', () => {
            try {
              const playPromise = mediaEl.play();
              if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => { });
              }
            } catch { }
          }));
          controls.appendChild(makeCtrlBtn('pause', 'Pause', () => {
            try { mediaEl.pause(); } catch { }
          }));
          controls.appendChild(makeCtrlBtn('stop', 'Stop', () => {
            try {
              mediaEl.pause();
              mediaEl.currentTime = 0;
            } catch { }
          }));
          controls.appendChild(makeCtrlBtn('rewind', 'Back 10 seconds', () => {
            try {
              const current = Number(mediaEl.currentTime) || 0;
              mediaEl.currentTime = Math.max(0, current - 10);
            } catch { }
          }, '10s'));
          const fwdBtn = makeCtrlBtn('rewind', 'Forward 10 seconds', () => {
            try {
              const current = Number(mediaEl.currentTime) || 0;
              const duration = Number(mediaEl.duration);
              const maxTime = Number.isFinite(duration) && duration > 0 ? duration : (current + 10);
              mediaEl.currentTime = Math.min(maxTime, current + 10);
            } catch { }
          }, '10s');
          const fwdIcon = fwdBtn.querySelector('img');
          if (fwdIcon) fwdIcon.style.transform = 'scaleX(-1)';
          controls.appendChild(fwdBtn);

          if (item.kind === 'sounds') {
            const transcriptBtn = makeCtrlBtn('dictation', 'Transcript', () => {
              if (typeof window.conOpenAudioTranscript === 'function') {
                window.conOpenAudioTranscript(item);
              }
            });
            transcriptBtn.className += ' con-media-transcript-btn';
            if (item.transcript) transcriptBtn.className += ' con-media-has-transcript';
            controls.appendChild(transcriptBtn);
          }

          timelineInput.addEventListener('mousedown', ev => {
            ev.stopPropagation();
          });
          timelineInput.addEventListener('input', ev => {
            ev.stopPropagation();
            const next = Number(timelineInput.value);
            if (Number.isFinite(next)) {
              try { mediaEl.currentTime = next; } catch { }
            }
          });

          mediaEl.addEventListener('loadedmetadata', () => {
            if (!Number.isFinite(mediaEl.duration) || mediaEl.duration === Infinity) {
              const cur = mediaEl.currentTime;
              mediaEl.currentTime = 1e101;
              mediaEl.ontimeupdate = function () {
                this.ontimeupdate = null;
                mediaEl.currentTime = cur || 0;
                syncTimelineFromMedia();
              };
            }
            syncTimelineFromMedia();
          });
          mediaEl.addEventListener('durationchange', syncTimelineFromMedia);
          mediaEl.addEventListener('timeupdate', syncTimelineFromMedia);
          mediaEl.addEventListener('seeked', syncTimelineFromMedia);
          mediaEl.addEventListener('ended', syncTimelineFromMedia);

          syncTimelineFromMedia();

          content.appendChild(controls);
          content.appendChild(timelineWrap);
        }

        item._renderPromise = conGetAttachmentDataUrl(item).then(src => {
          if (!src) {
            if (isMirrorMode) {
              content.classList.add('con-media-load-failed');
              let failMsg = content.querySelector('.con-media-error-msg');
              if (!failMsg) {
                failMsg = document.createElement('div');
                failMsg.className = 'con-media-error-msg';
                failMsg.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#888;font-size:0.8rem;text-align:center;padding:8px;pointer-events:none;';
                failMsg.textContent = 'Could not load media source.';
                content.appendChild(failMsg);
              }
              if (mediaEl) mediaEl.style.display = 'none';
              if (typeof window._conMirrorRequestState === 'function') {
                window._conMirrorRequestState();
              }
              return;
            }
            content.textContent = 'Could not load media source.';
            return;
          }
          const failMsg = content.querySelector('.con-media-error-msg');
          if (failMsg) failMsg.remove();
          content.classList.remove('con-media-load-failed');
          if (mediaEl) {
            mediaEl.style.display = '';
            mediaEl.src = src;
            if (item.kind === 'pics') {
              mediaEl.onload = function () {
                if (!item.dataUrl && mediaEl.naturalWidth > 0) {
                  try {
                    const c = document.createElement('canvas');
                    c.width = mediaEl.naturalWidth;
                    c.height = mediaEl.naturalHeight;
                    c.getContext('2d').drawImage(mediaEl, 0, 0);
                    const dUrl = c.toDataURL(item.mime || 'image/png');
                    if (dUrl && dUrl.startsWith('data:')) {
                      item.dataUrl = dUrl;
                      const att = (typeof conFindAttachmentById === 'function') ? conFindAttachmentById(item.attachmentId) : null;
                      if (att && (!att._cachedDataUrl || !att._cachedDataUrl.startsWith('data:'))) {
                        att._cachedDataUrl = dUrl;
                      }
                    }
                  } catch (_) {}
                }
              };
              if (!mediaEl.complete) {
                return new Promise(resolve => {
                  const origOnload = mediaEl.onload;
                  mediaEl.onload = function (e) {
                    if (typeof origOnload === 'function') origOnload.call(this, e);
                    resolve();
                  };
                  mediaEl.onerror = resolve;
                  setTimeout(resolve, 1500);
                });
              }
            }
            if (isMirrorMode && typeof mediaEl._applyMirrorMediaSync === 'function') {
              mediaEl._applyMirrorMediaSync();
            }
          }
        });
      } else if (item.kind !== 'pdf') {
        content.textContent = 'Unsupported media type.';
      }

      const resizer = document.createElement('div');
      resizer.className = 'con-media-resizer';

      wrap.appendChild(content);
      wrap.appendChild(closeBtn);
      wrap.appendChild(resizer);

      // Hover mini-actions for visual media (not sounds/videos)
      if (item.kind === 'pics' || item.kind === 'pdf') {
        const miniActions = document.createElement('div');
        miniActions.className = 'con-media-mini-actions';
        const _mkMini = (iconSvg, titleText, action, handler) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'con-media-mini-btn';
          btn.dataset.action = action;
          btn.innerHTML = '<img src="../assets/icons/' + iconSvg + '.svg" class="btn-icon" alt="" />';
          btn.title = titleText;
          btn.addEventListener('mousedown', ev => { ev.preventDefault(); ev.stopPropagation(); });
          btn.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); handler(); });
          return btn;
        };
        const lockMiniBtn = _mkMini(item.locked ? 'unlock' : 'lock', 'Lock/Unlock', 'lock', () => {
          item.locked = !item.locked;
          if (typeof _conApplyMediaStyles === 'function') _conApplyMediaStyles(item, wrap);
        });
        const hideMiniBtn = _mkMini(item.hidden ? 'eye' : 'mask', item.hidden ? 'Reveal (Ctrl+H)' : 'Hide (Ctrl+H)', 'hide', () => {
          item.hidden = !item.hidden;
          if (typeof _conApplyMediaStyles === 'function') _conApplyMediaStyles(item, wrap);
          if (window._conMirrorSend) window._conMirrorSend({ type: 'media-hide', id: item.id, hidden: !!item.hidden });
        });
        const blinkMiniBtn = _mkMini('blink', 'Blink on/off', 'blink', () => {
          item.blink = !item.blink;
          if (typeof _conApplyMediaStyles === 'function') _conApplyMediaStyles(item, wrap);
          if (window._conMirrorSend) window._conMirrorSend({ type: 'media-blink', id: item.id, blink: !!item.blink });
        });
        const fullMiniBtn = _mkMini('fullscreen', 'Fullscreen', 'fullscreen', () => {
          window._conCtxItem = item;
          if (item.kind === 'pics' && typeof window.conImgSpToggleFullscreen === 'function') {
            window.conImgSpToggleFullscreen(item);
          } else if (item.kind === 'pdf' && typeof window.conPdfSpToggleFullscreen === 'function') {
            window.conPdfSpToggleFullscreen(item);
          }
        });
        const emojiMiniBtn = _mkMini('emoji-smile', 'Add emoji sticker', 'emoji', () => {
          if (typeof window._pickerOpenForMedia === 'function') window._pickerOpenForMedia(item);
        });
        const linkMiniBtn = _mkMini('zap', 'Link / Connect (Ctrl+J)', 'link', () => {
          if (typeof window._conStartLinkMode === 'function') window._conStartLinkMode(item.id);
        });
        miniActions.appendChild(lockMiniBtn);
        miniActions.appendChild(linkMiniBtn);
        miniActions.appendChild(hideMiniBtn);
        miniActions.appendChild(blinkMiniBtn);
        miniActions.appendChild(fullMiniBtn);
        miniActions.appendChild(emojiMiniBtn);

        // PDF-specific controls: zoom + rotate, appended right into the hover bar
        if (item.kind === 'pdf') {
          const pdfSep = document.createElement('span');
          pdfSep.className = 'con-pdf-only-btn';
          pdfSep.style.cssText = 'color:#bbb;padding:0 2px;font-size:11px;line-height:24px;pointer-events:none;';
          pdfSep.textContent = '|';
          const _pdfMiniMkBtn = (iconSvg, title, fn) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'con-media-mini-btn con-pdf-only-btn';
            b.innerHTML = '<img src="../assets/icons/' + iconSvg + '.svg" class="btn-icon" alt="" />';
            b.title = title;
            b.addEventListener('mousedown', ev => { ev.preventDefault(); ev.stopPropagation(); });
            b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); fn(); });
            return b;
          };
          const _pdfMiniRr = () => conRenderPdfForItem(item, pdfCanvas, pdfScrollDiv, content);
          const _pdfMiniSnc = () => {
            if (window._conMirrorBroadcast) window._conMirrorBroadcast();
            if (window._conMirrorSend) window._conMirrorSend({
              type: 'pdf-view-state', itemId: String(item.id),
              pdfZoom: item.pdfZoom || 1, pdfRotation: item.pdfRotation || 0,
              pdfScrollX: item.pdfScrollX || 0, pdfScrollY: item.pdfScrollY || 0,
              pdfLockSize: !!item.pdfLockSize
            });
          };
          miniActions.appendChild(pdfSep);
          const _updateLockBtnState = () => {
            if (lockSizeMiniBtn) {
              lockSizeMiniBtn.classList.toggle('active', !!item.pdfLockSize);
            }
          };
          miniActions.appendChild(_pdfMiniMkBtn('zoom-out', 'Zoom out', () => {
            item.pdfLockSize = false; _updateLockBtnState();
            if (window._conCtxItem && window._conCtxItem.id === item.id) {
              const menuBtn = document.getElementById('con-pdf-sp-lockfit-btn');
              if (menuBtn) menuBtn.classList.remove('active');
            }
            item.pdfZoom = Math.max(0.1, (item.pdfZoom || 1) / 1.25); _pdfMiniRr().then(_pdfMiniSnc);
          }));
          miniActions.appendChild(_pdfMiniMkBtn('zoom-in', 'Zoom in', () => {
            item.pdfLockSize = false; _updateLockBtnState();
            if (window._conCtxItem && window._conCtxItem.id === item.id) {
              const menuBtn = document.getElementById('con-pdf-sp-lockfit-btn');
              if (menuBtn) menuBtn.classList.remove('active');
            }
            item.pdfZoom = Math.min(8, (item.pdfZoom || 1) * 1.25); _pdfMiniRr().then(_pdfMiniSnc);
          }));
          miniActions.appendChild(_pdfMiniMkBtn('maximize', 'Fit width', () => {
            item.pdfLockSize = false; _updateLockBtnState();
            if (window._conCtxItem && window._conCtxItem.id === item.id) {
              const menuBtn = document.getElementById('con-pdf-sp-lockfit-btn');
              if (menuBtn) menuBtn.classList.remove('active');
            }
            item.pdfZoom = 1; item.pdfScrollX = 0; item.pdfScrollY = 0; _pdfMiniRr().then(_pdfMiniSnc);
          }));
          miniActions.appendChild(_pdfMiniMkBtn('refresh', 'Rotate', () => {
            item.pdfRotation = ((item.pdfRotation || 0) - 90 + 360) % 360;
            item.pdfScrollX = 0; item.pdfScrollY = 0; _pdfMiniRr().then(_pdfMiniSnc);
          }));
          const lockSizeMiniBtn = _pdfMiniMkBtn('snap', 'Lock size to container (no scroll)', () => {
            item.pdfLockSize = !item.pdfLockSize;
            lockSizeMiniBtn.classList.toggle('active', !!item.pdfLockSize);
            if (window._conCtxItem && window._conCtxItem.id === item.id) {
              const menuBtn = document.getElementById('con-pdf-sp-lockfit-btn');
              if (menuBtn) menuBtn.classList.toggle('active', !!item.pdfLockSize);
            }
            _pdfMiniRr().then(_pdfMiniSnc);
          });
          lockSizeMiniBtn.dataset.action = 'lockfit';
          if (item.pdfLockSize) lockSizeMiniBtn.classList.add('active');
          miniActions.appendChild(lockSizeMiniBtn);
        }

        wrap.appendChild(miniActions);
        wrap.addEventListener('mouseenter', () => miniActions.classList.add('con-media-mini-visible'));
        wrap.addEventListener('mouseleave', () => miniActions.classList.remove('con-media-mini-visible'));
      }

      wrap.addEventListener('dblclick', ev => {
        if (item.hidden && !ev.target.closest('.con-media-remove-btn, .con-media-resizer, .con-media-mini-btn')) {
          item.hidden = false;
          if (typeof _conApplyMediaStyles === 'function') _conApplyMediaStyles(item, wrap);
          if (window._conMirrorSend) window._conMirrorSend({ type: 'media-hide', id: item.id, hidden: false });
        }
      });

      if (item._fullscreen) {
        wrap.classList.add('con-media-fullscreen');
        if (document.documentElement.classList.contains('con-mirror-mode')) {
          document.body.appendChild(wrap);
        } else {
          board.appendChild(wrap);
        }
      } else {
        board.appendChild(wrap);
      }

      // Apply persisted visual styles and restore stickers
      if (typeof _conApplyMediaStyles === 'function') _conApplyMediaStyles(item, wrap);
      if (window.conMediaRebuildStickers) window.conMediaRebuildStickers(item, wrap);

      let dragStartX = 0, dragStartY = 0, baseX = 0, baseY = 0;
      let dragging = false;
      let _mediaMoveRaf = null, _pendingMediaMoveMsg = null;
      let _mediaJointSnapshots = [];
      let _nodeJointSnapshots = [];
      let _noteJointSnapshots = [];
      let _drawJointSnapshots = [];
      let _shapeJointSnapshots = [];
      let _tableJointSnapshots = [];
      let _mediaPreDragSnap = null;
      let _mediaUndoPushed = false;

      wrap.addEventListener('mousedown', ev => {
        if (ev.button !== 0) return;
        window._conActiveMediaItem = item;
        const isModifier = !!(ev.shiftKey || ev.ctrlKey || ev.metaKey);
        if (isModifier) {
          if (typeof conSelected !== 'undefined' && conSelected) {
            const prevEl = conNodes.find(n => n.id === conSelected);
            if (prevEl) {
              conMultiSelected.add(conSelected);
              prevEl.el.classList.remove('con-selected');
              prevEl.el.classList.add('con-multi-selected');
            }
            conSelected = null;
          }
          if (typeof conMediaSelected !== 'undefined') {
            if (conMediaSelected.has(item.id)) {
              conMediaSelected.delete(item.id);
              wrap.classList.remove('con-media-selected');
              return;
            } else {
              conMediaSelected.add(item.id);
              wrap.classList.add('con-media-selected');
            }
          } else {
            wrap.classList.toggle('con-media-selected');
          }
        } else {
          if (typeof conMediaSelected !== 'undefined' && !conMediaSelected.has(item.id)) {
            if (window.conMediaClearSelection) window.conMediaClearSelection();
            conMediaSelected.add(item.id);
            wrap.classList.add('con-media-selected');
            if (window.conNodeClearSelection) window.conNodeClearSelection();
            else if (typeof conSelect === 'function') conSelect(null);
            if (window.conNoteClearSelection) window.conNoteClearSelection();
            if (window.conDrawingClearSelection) window.conDrawingClearSelection();
            if (window.conShapeClearSelection) window.conShapeClearSelection();
            if (typeof window.conTableClearSelection === 'function') window.conTableClearSelection();
          } else if (typeof conMediaSelected === 'undefined') {
            document.querySelectorAll('.con-media-item.con-media-selected').forEach(el => {
              if (el !== wrap) el.classList.remove('con-media-selected');
            });
            wrap.classList.add('con-media-selected');
          }
        }
        if (window.conNumberingMode) {
          ev.preventDefault();
          ev.stopPropagation();
          if (typeof conHandleEntityClickForNumbering === 'function') {
            conHandleEntityClickForNumbering('media', item, wrap, ev);
          }
          return;
        }
        if (item.locked) return;
        if (ev.target.closest('.con-media-resizer')) return;
        if (ev.target.closest('.con-media-remove-btn')) return;
        if (ev.target.closest('.con-media-extra-controls')) return;
        if (ev.target.closest('.con-media-timeline-wrap')) return;
        if (ev.target.closest('audio,video,input,button,textarea,select,iframe')) return;
        dragging = true;
        window._conMirrorDragging = true;
        dragStartX = ev.clientX;
        dragStartY = ev.clientY;
        baseX = item.x;
        baseY = item.y;
        _mediaUndoPushed = false;
        _mediaPreDragSnap = typeof conBuildPageSnapshot === 'function' ? conBuildPageSnapshot() : null;

        // Snapshot other selected media items
        _mediaJointSnapshots = [];
        const liveMediaList = typeof window.conGetMediaItems === 'function' ? window.conGetMediaItems() : (typeof conMediaItems !== 'undefined' ? conMediaItems : []);
        const mediaSel = typeof window.conGetMediaSelected === 'function' ? window.conGetMediaSelected() : (typeof conMediaSelected !== 'undefined' ? conMediaSelected : new Set());
        if (mediaSel && mediaSel.size > 0 && mediaSel.has(item.id)) {
          mediaSel.forEach(mid => {
            if (mid === item.id || String(mid) === String(item.id)) return;
            const m = liveMediaList.find(x => x && (x.id === mid || String(x.id) === String(mid)));
            if (m && !m.locked) {
              const mEl = document.querySelector(`.con-media-item[data-id="${m.id}"]`) || (m.wrap || null);
              _mediaJointSnapshots.push({ m, sx: m.x, sy: m.y, el: mEl });
            }
          });
        }

        // Snapshot co-selected nodes
        _nodeJointSnapshots = [];
        const _allSelNodes = new Set(window.conGetMultiSelected ? window.conGetMultiSelected() : (typeof conMultiSelected !== 'undefined' ? conMultiSelected : []));
        if (typeof conSelected !== 'undefined' && conSelected) _allSelNodes.add(conSelected);
        if (window.conGetSelected && window.conGetSelected()) _allSelNodes.add(window.conGetSelected());
        const _allNodesList = window.conGetNodes ? window.conGetNodes() : (typeof conNodes !== 'undefined' ? conNodes : []);
        _allSelNodes.forEach(nid => {
          const nd = _allNodesList.find(n => n && (n.id === nid || String(n.id) === String(nid)));
          if (nd && !(typeof conIsNodeLocked === 'function' && conIsNodeLocked(nd))) {
            _nodeJointSnapshots.push({ nd, sx: nd.x, sy: nd.y });
          }
        });

        // Snapshot co-selected notes
        _noteJointSnapshots = [];
        const _noteSel = window.conGetNoteSelected ? window.conGetNoteSelected() : (typeof conNoteSelected !== 'undefined' ? conNoteSelected : new Set());
        const _allNotesList = window.conGetNotes ? window.conGetNotes() : (typeof conNotes !== 'undefined' ? conNotes : []);
        _noteSel.forEach(nid => {
          const nd = _allNotesList.find(n => n && (n.id === nid || String(n.id) === String(nid)));
          if (nd && !nd.locked) {
            const noteEl = (typeof window.wnGetNoteElementById === 'function')
              ? window.wnGetNoteElementById(nd.id)
              : ((typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nd.id) : document.querySelector(`.con-word-note[data-id="${nd.id}"]`));
            const sx = (nd.x != null) ? nd.x : (noteEl ? (parseInt(noteEl.style.left) || 0) : 0);
            const sy = (nd.y != null) ? nd.y : (noteEl ? (parseInt(noteEl.style.top) || 0) : 0);
            _noteJointSnapshots.push({ nd, sx, sy, el: noteEl });
          }
        });

        // Snapshot co-selected drawings
        _drawJointSnapshots = [];
        const _drawSel = window.conGetDrawingSelected ? window.conGetDrawingSelected() : (typeof conDrawingSelected !== 'undefined' ? conDrawingSelected : new Set());
        const _allDrawList = window.conGetDrawings ? window.conGetDrawings() : (typeof conDrawings !== 'undefined' ? conDrawings : []);
        _drawSel.forEach(did => {
          const dr = _allDrawList.find(d => d && (d.id === did || String(d.id) === String(did)));
          if (dr) {
            _drawJointSnapshots.push({ dr, sx: dr.x, sy: dr.y, pad: dr.pad || Math.max((dr.thickness || 2) + 4, 12) });
          }
        });

        // Snapshot co-selected shapes
        _shapeJointSnapshots = [];
        const _shapeSel = window.conGetShapeSelected ? window.conGetShapeSelected() : (typeof _conShapeSelected !== 'undefined' ? _conShapeSelected : new Set());
        const _allShapeList = window.conGetShapes ? window.conGetShapes() : (typeof conShapes !== 'undefined' ? conShapes : []);
        _shapeSel.forEach(sid => {
          const s = _allShapeList.find(x => x && (x.id === sid || String(x.id) === String(sid)));
          if (s) {
            _shapeJointSnapshots.push({
              s, sx: s.x, sy: s.y,
              slx1: s.lx1, sly1: s.ly1, slx2: s.lx2, sly2: s.ly2,
              spts: s.pts ? s.pts.map(p => ({ ...p })) : null,
              pad: s.pad || (typeof _conShapeGetPAD === 'function' ? _conShapeGetPAD(s) : 16)
            });
          }
        });

        // Snapshot co-selected tables
        _tableJointSnapshots = [];
        const _tableSel = window.conGetTableSelected ? window.conGetTableSelected() : (typeof conTableSelected !== 'undefined' ? conTableSelected : new Set());
        const _allTableList = window.conGetTables ? window.conGetTables() : (typeof conTables !== 'undefined' ? conTables : []);
        _tableSel.forEach(tid => {
          const tbl = _allTableList.find(t => t && (t.id === tid || String(t.id) === String(tid)));
          if (tbl && !tbl.locked) {
            _tableJointSnapshots.push({ tbl, sx: tbl.x, sy: tbl.y });
          }
        });

        ev.preventDefault();
        ev.stopPropagation();
      });

      let resizing = false, resizeStartX = 0, resizeStartY = 0, baseW = 0, baseH = 0, aspectRatio = 1;
      let _mediaResizeRaf = null, _pendingMediaResizeMsg = null;
      resizer.addEventListener('mousedown', ev => {
        if (item.locked) return;
        resizing = true;
        window._conMirrorDragging = true;
        resizeStartX = ev.clientX;
        resizeStartY = ev.clientY;
        baseW = item.w;
        baseH = item.h;
        aspectRatio = baseW / baseH;
        ev.preventDefault();
        ev.stopPropagation();
      });

      document.addEventListener('mousemove', ev => {
        if (dragging) {
          const dx = ev.clientX - dragStartX;
          const dy = ev.clientY - dragStartY;
          if (!_mediaUndoPushed && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
            _mediaUndoPushed = true;
            if (_mediaPreDragSnap && typeof conPushUndo === 'function') conPushUndo(_mediaPreDragSnap);
          }
          item.x = Math.max(0, baseX + dx);
          item.y = Math.max(0, baseY + dy);
          wrap.style.left = item.x + 'px';
          wrap.style.top = item.y + 'px';

          // Move other co-selected media items
          _mediaJointSnapshots.forEach(({ m, sx, sy, el: mEl }) => {
            m.x = Math.max(0, sx + dx);
            m.y = Math.max(0, sy + dy);
            const targetEl = mEl || document.querySelector(`.con-media-item[data-id="${m.id}"]`);
            if (targetEl) {
              targetEl.style.left = m.x + 'px';
              targetEl.style.top = m.y + 'px';
            }
          });

          // Move co-selected nodes
          if (_nodeJointSnapshots.length > 0) {
            _nodeJointSnapshots.forEach(({ nd, sx, sy }) => {
              nd.x = Math.max(0, sx + dx);
              nd.y = Math.max(0, sy + dy);
              if (nd.el) {
                nd.el.style.left = nd.x + 'px';
                nd.el.style.top = nd.y + 'px';
              }
            });
            if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          }
          if (typeof conRedrawEdges === 'function') conRedrawEdges();

          // Move co-selected notes
          if (_noteJointSnapshots.length > 0) {
            _noteJointSnapshots.forEach(({ nd, sx, sy, el: nEl }) => {
              nd.x = sx + dx;
              nd.y = sy + dy;
              const targetEl = nEl || (typeof window.wnGetNoteElementById === 'function' ? window.wnGetNoteElementById(nd.id) : document.querySelector(`.con-word-note[data-id="${nd.id}"]`));
              if (targetEl) {
                targetEl.style.left = nd.x + 'px';
                targetEl.style.top = nd.y + 'px';
              }
            });
          }

          // Move co-selected drawings
          if (_drawJointSnapshots.length > 0) {
            _drawJointSnapshots.forEach(({ dr, sx, sy, pad }) => {
              dr.x = sx + dx;
              dr.y = sy + dy;
              const p = pad != null ? pad : (dr.pad || 12);
              if (dr.el) {
                dr.el.style.left = (dr.x - p) + 'px';
                dr.el.style.top = (dr.y - p) + 'px';
              }
            });
          }

          // Move co-selected shapes
          if (_shapeJointSnapshots.length > 0) {
            _shapeJointSnapshots.forEach(({ s, sx, sy, slx1, sly1, slx2, sly2, spts, pad }) => {
              s.x = sx + dx;
              s.y = sy + dy;
              if (s.lx1 !== undefined && slx1 !== undefined) {
                s.lx1 = slx1 + dx; s.ly1 = sly1 + dy;
                s.lx2 = slx2 + dx; s.ly2 = sly2 + dy;
              }
              if (s.pts && spts) {
                s.pts = spts.map(p => ({ x: p.x + dx, y: p.y + dy }));
              }
              const p = pad != null ? pad : (s.pad || 16);
              if (s.el) {
                s.el.style.left = (s.x - p) + 'px';
                s.el.style.top = (s.y - p) + 'px';
              }
              if (typeof _conShapeUpdateHandles === 'function') _conShapeUpdateHandles(s);
            });
          }

          // Move co-selected tables
          if (_tableJointSnapshots.length > 0) {
            _tableJointSnapshots.forEach(({ tbl, sx, sy }) => {
              tbl.x = Math.max(0, sx + dx);
              tbl.y = Math.max(0, sy + dy);
              if (tbl.el) {
                tbl.el.style.left = tbl.x + 'px';
                tbl.el.style.top = tbl.y + 'px';
              }
            });
          }

          if (window._conMirrorSend) {
            const allMediaPositions = [{ id: item.id, x: item.x, y: item.y }];
            _mediaJointSnapshots.forEach(({ m }) => {
              allMediaPositions.push({ id: m.id, x: m.x, y: m.y });
            });
            _pendingMediaMoveMsg = { type: 'media-move', positions: allMediaPositions, id: item.id, x: item.x, y: item.y };
            if (!_mediaMoveRaf) {
              _mediaMoveRaf = requestAnimationFrame(function () {
                _mediaMoveRaf = null;
                if (window._conMirrorSend) {
                  if (_pendingMediaMoveMsg) window._conMirrorSend(_pendingMediaMoveMsg);
                  if (_nodeJointSnapshots.length > 0) {
                    window._conMirrorSend({ type: 'node-move', positions: _nodeJointSnapshots.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
                  }
                  if (_noteJointSnapshots.length > 0) {
                    window._conMirrorSend({ type: 'note-move', positions: _noteJointSnapshots.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
                  }
                  if (_drawJointSnapshots.length > 0) {
                    window._conMirrorSend({ type: 'drawing-move', positions: _drawJointSnapshots.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y })) });
                  }
                  if (_shapeJointSnapshots.length > 0) {
                    window._conMirrorSend({ type: 'shape-move', positions: _shapeJointSnapshots.map(({ s }) => ({ id: s.id, x: s.x, y: s.y, lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2, pts: s.pts ? s.pts.map(p => ({ ...p })) : undefined })) });
                  }
                  if (_tableJointSnapshots.length > 0) {
                    window._conMirrorSend({ type: 'table-move', positions: _tableJointSnapshots.map(({ tbl }) => ({ id: tbl.id, x: tbl.x, y: tbl.y })) });
                  }
                }
              });
            }
          }
        }
        if (resizing) {
          const minW = item.kind === 'sounds' ? 220 : (item.kind === 'pdf' ? 220 : 140);
          const minH = item.kind === 'sounds' ? 70 : (item.kind === 'pdf' ? 220 : 100);
          let newW = Math.max(minW, baseW + (ev.clientX - resizeStartX));
          let newH = Math.max(minH, baseH + (ev.clientY - resizeStartY));

          // Preserve aspect ratio for PDFs and images
          if ((item.kind === 'pdf' || item.kind === 'pics') && aspectRatio > 0) {
            const wDelta = Math.abs(ev.clientX - resizeStartX);
            const hDelta = Math.abs(ev.clientY - resizeStartY);
            if (wDelta > hDelta) {
              newH = Math.max(minH, Math.round(newW / aspectRatio));
            } else {
              newW = Math.max(minW, Math.round(newH * aspectRatio));
            }
          }

          item.w = newW;
          item.h = newH;
          wrap.style.width = item.w + 'px';
          wrap.style.height = item.h + 'px';
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
          if (window._conMirrorSend) {
            _pendingMediaResizeMsg = { type: 'media-resize', id: item.id, w: item.w, h: item.h };
            if (!_mediaResizeRaf) {
              _mediaResizeRaf = requestAnimationFrame(function () {
                _mediaResizeRaf = null;
                if (window._conMirrorSend && _pendingMediaResizeMsg) {
                  window._conMirrorSend(_pendingMediaResizeMsg);
                }
              });
            }
          }
        }
      });

      document.addEventListener('mouseup', () => {
        const wasDragging = dragging;
        const wasResizing = resizing;
        if (wasDragging) {
          if (_mediaMoveRaf) { cancelAnimationFrame(_mediaMoveRaf); _mediaMoveRaf = null; }
          if (window._conMirrorSend && _pendingMediaMoveMsg) {
            window._conMirrorSend(_pendingMediaMoveMsg);
            if (_nodeJointSnapshots.length > 0) {
              window._conMirrorSend({ type: 'node-move', positions: _nodeJointSnapshots.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
            }
            if (_noteJointSnapshots.length > 0) {
              window._conMirrorSend({ type: 'note-move', positions: _noteJointSnapshots.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
            }
            if (_drawJointSnapshots.length > 0) {
              window._conMirrorSend({ type: 'drawing-move', positions: _drawJointSnapshots.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y })) });
            }
            if (_shapeJointSnapshots.length > 0) {
              window._conMirrorSend({ type: 'shape-move', positions: _shapeJointSnapshots.map(({ s }) => ({ id: s.id, x: s.x, y: s.y, lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2, pts: s.pts ? s.pts.map(p => ({ ...p })) : undefined })) });
            }
            if (_tableJointSnapshots.length > 0) {
              window._conMirrorSend({ type: 'table-move', positions: _tableJointSnapshots.map(({ tbl }) => ({ id: tbl.id, x: tbl.x, y: tbl.y })) });
            }
            _pendingMediaMoveMsg = null;
          }
          _mediaJointSnapshots = [];
          _nodeJointSnapshots = [];
          _noteJointSnapshots = [];
          _drawJointSnapshots = [];
          _shapeJointSnapshots = [];
          _tableJointSnapshots = [];
          _mediaPreDragSnap = null;
          _mediaUndoPushed = false;
        }
        if (wasResizing) {
          if (_mediaResizeRaf) { cancelAnimationFrame(_mediaResizeRaf); _mediaResizeRaf = null; }
          if (window._conMirrorSend && _pendingMediaResizeMsg) {
            window._conMirrorSend(_pendingMediaResizeMsg);
            _pendingMediaResizeMsg = null;
          }
        }
        if (wasDragging || wasResizing) {
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
        }
        dragging = false;
        resizing = false;
        if (wasResizing && item.kind === 'pdf' && pdfCanvas) {
          conRenderPdfForItem(item, pdfCanvas, pdfScrollDiv, content);
        }
        if (wasDragging || wasResizing) {
          if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          else if (typeof window.conGroupOfMedia === 'function') {
            const parentGroup = window.conGroupOfMedia(item.id);
            if (parentGroup && typeof conGroupRefit === 'function') conGroupRefit(parentGroup);
          }
          setTimeout(() => {
            window._conMirrorDragging = false;
          }, 60);
        }
      });
    }

    window.conMediaClearSelection = function () {
      if (typeof conMediaSelected !== 'undefined') conMediaSelected.clear();
      window._conActiveMediaItem = null;
      const isImgActive = !!(document.getElementById('con-img-style-overlay') && document.getElementById('con-img-style-overlay').classList.contains('active'));
      const isPdfActive = !!(document.getElementById('con-pdf-style-overlay') && document.getElementById('con-pdf-style-overlay').classList.contains('active'));
      const isSndActive = !!(document.getElementById('con-sound-style-overlay') && document.getElementById('con-sound-style-overlay').classList.contains('active'));
      if (!isImgActive && !isPdfActive && !isSndActive) {
        window._conCtxItem = null;
      }
      document.querySelectorAll('.con-media-item.con-media-selected').forEach(el => el.classList.remove('con-media-selected'));
    };
    window.conGetMediaSelected = function () {
      return (typeof conMediaSelected !== 'undefined') ? conMediaSelected : (window.conMediaSelected || new Set());
    };

    window.conMediaClear = function () {
      if (window._conPdfDocCache) {
        window._conPdfDocCache.forEach(doc => {
          if (doc && typeof doc.destroy === 'function') {
            try { doc.destroy(); } catch (_) { }
          }
        });
        window._conPdfDocCache.clear();
      }
      if (window._conAttachmentBufferCache) window._conAttachmentBufferCache.clear();
      conMediaItems.forEach(item => {
        if (item && item._pdfViewPoll) {
          clearInterval(item._pdfViewPoll);
          item._pdfViewPoll = null;
        }
        item._pdfDoc = null;
      });
      conMediaItems = [];
      conMediaNextId = 0;
      document.querySelectorAll('.con-media-item').forEach(el => {
        el.querySelectorAll('audio, video').forEach(function (m) {
          try { m.pause(); m.src = ''; m.load(); } catch (_) { }
        });
        el.querySelectorAll('canvas').forEach(function (c) {
          c.width = 0; c.height = 0;
        });
        el.remove();
      });
    };

    window.conRemoveInsertedMedia = function () {
      const count = Array.isArray(conMediaItems) ? conMediaItems.length : 0;
      window.conMediaClear();
      if (typeof mdbToast === 'function') {
        mdbToast(count > 0
          ? (' Removed ' + count + ' inserted media object(s).')
          : 'ℹ No inserted media objects to remove.');
      }
    };

    window.conGetMediaItems = function () {
      return conMediaItems;
    };

    function conRestoreMediaItems(items) {
      const incoming = Array.isArray(items) ? items : [];
      const prevById = new Map((conMediaItems || []).map(it => [String(it.id || ''), it]));
      const prevElsById = new Map();
      document.querySelectorAll('.con-media-item').forEach(el => {
        const id = String((el && el.dataset && el.dataset.id) || '');
        if (id) prevElsById.set(id, el);
      });

      const nextItems = [];
      const keepIds = new Set();

      incoming.forEach(raw => {
        const kind = raw && raw.kind;
        if (kind !== 'pics' && kind !== 'sounds' && kind !== 'videos' && kind !== 'pdf') return;

        const defaultPdfRect = kind === 'pdf' ? conGetDefaultPdfMediaRect() : null;
        const id = String(raw.id || ('cm' + (conMediaNextId++)));
        const normalized = {
          id,
          kind,
          attachmentId: String(raw.attachmentId || ''),
          name: raw.name || '',
          mime: raw.mime || '',
          relativePath: raw.relativePath || '',
          pageNumber: Math.max(1, Number(raw.pageNumber) || 1),
          pdfFit: (kind === 'pdf' ? (raw.pdfFit || 'h') : undefined),
          pdfZoom: (kind === 'pdf' ? Math.max(0.1, Math.min(8, Number(raw.pdfZoom) || 1)) : undefined),
          pdfRotation: (kind === 'pdf' ? (((Number(raw.pdfRotation) || 0) % 360) + 360) % 360 : undefined),
          pdfScrollX: (kind === 'pdf' ? (Math.round(Number(raw.pdfScrollX) || 0)) : undefined),
          pdfScrollY: (kind === 'pdf' ? (Math.round(Number(raw.pdfScrollY) || 0)) : undefined),
          pdfLockSize: (kind === 'pdf' ? !!raw.pdfLockSize : undefined),
          x: (raw.x != null && Number.isFinite(Number(raw.x))) ? Number(raw.x) : 60,
          y: (raw.y != null && Number.isFinite(Number(raw.y))) ? Number(raw.y) : 60,
          w: Math.max(70, Number(raw.w) || (defaultPdfRect ? defaultPdfRect.w : 220)),
          h: Math.max(40, Number(raw.h) || (defaultPdfRect ? defaultPdfRect.h : 180)),
          hidden: !!raw.hidden,
          locked: !!raw.locked,
          blink: !!raw.blink,
          borderWidth: Number(raw.borderWidth) || 0,
          borderStyle: raw.borderStyle || 'solid',
          borderColor: raw.borderColor || '#111111',
          rotation: (kind === 'pics' ? (Number(raw.rotation) || 0) : undefined),
          opacity: (raw.opacity != null && Number.isFinite(Number(raw.opacity))) ? Number(raw.opacity) : 1,
          brightness: (kind === 'pics' && raw.brightness != null && Number.isFinite(Number(raw.brightness))) ? Number(raw.brightness) : 100,
          contrast: (kind === 'pics' && raw.contrast != null && Number.isFinite(Number(raw.contrast))) ? Number(raw.contrast) : 100,
          saturation: (kind === 'pics' && raw.saturation != null && Number.isFinite(Number(raw.saturation))) ? Number(raw.saturation) : 100,
          _fullscreen: raw._fullscreen ? true : undefined,
          _fsZoom: raw._fullscreen ? (Number(raw._fsZoom) || 1) : undefined,
          _fsPanX: raw._fullscreen ? (Number(raw._fsPanX) || 0) : undefined,
          _fsPanY: raw._fullscreen ? (Number(raw._fsPanY) || 0) : undefined,
          mediaNumber: raw.mediaNumber != null ? raw.mediaNumber : null,
          mediaNumberFormat: raw.mediaNumberFormat || null,
          transcript: raw.transcript || ''
        };

        const linkedAttachment = conFindAttachmentById(normalized.attachmentId);
        if (linkedAttachment) {
          normalized.file = linkedAttachment.file || null;
          normalized.base64 = linkedAttachment.base64 || '';
          normalized._cachedObjectUrl = linkedAttachment._cachedObjectUrl || '';
          normalized._cachedDataUrl = linkedAttachment._cachedDataUrl || '';
          if (linkedAttachment.relativePath) normalized.relativePath = linkedAttachment.relativePath;
          if (linkedAttachment.mime) normalized.mime = linkedAttachment.mime;
          if (linkedAttachment.name) normalized.name = linkedAttachment.name;
        }
        if (raw.dataUrl) normalized.dataUrl = raw.dataUrl;
        if (raw.base64 && !normalized.base64) normalized.base64 = raw.base64;

        const prev = prevById.get(id);
        const canReuse = !!(prev
          && prev.kind === normalized.kind
          && String(prev.attachmentId || '') === String(normalized.attachmentId || '')
          && Math.max(1, Number(prev.pageNumber) || 1) === normalized.pageNumber);

        if (!canReuse) {
          const staleEl = prevElsById.get(id);
          if (staleEl) staleEl.remove();
          nextItems.push(normalized);
          keepIds.add(id);
          conBuildMediaWidget(normalized);
        } else {
          const prevRenderSignature = prev._lastRenderSignature || '';
          Object.assign(prev, normalized);
          nextItems.push(prev);
          keepIds.add(id);

          const wrap = prevElsById.get(id);
          if (wrap) {
            wrap.style.left = prev.x + 'px';
            wrap.style.top = prev.y + 'px';
            wrap.style.width = prev.w + 'px';
            wrap.style.height = prev.h + 'px';
            if (typeof _conApplyMediaStyles === 'function') _conApplyMediaStyles(prev, wrap);
            if (window.conMediaRebuildStickers) window.conMediaRebuildStickers(prev, wrap);

            if (prev.kind === 'pdf') {
              const pdfCvs = wrap.querySelector('canvas.con-media-pdf-canvas');
              const pdfScrDiv = wrap.querySelector('.con-media-pdf-scroll');
              const cntEl = wrap.querySelector('.con-media-content');
              const nextRenderSignature = [
                prev.pageNumber, prev.w, prev.h, prev.pdfZoom || 1, prev.pdfRotation || 0, !!prev.pdfLockSize, !!prev._fullscreen
              ].join('|');
              if (pdfCvs && prevRenderSignature !== nextRenderSignature) {
                prev._lastRenderSignature = nextRenderSignature;
                conRenderPdfForItem(prev, pdfCvs, pdfScrDiv, cntEl).then(function () {
                  if (pdfScrDiv) {
                    if (prev.pdfLockSize || prev._fullscreen) {
                      pdfScrDiv.scrollLeft = 0;
                      pdfScrDiv.scrollTop = 0;
                    } else {
                      pdfScrDiv.scrollLeft = prev.pdfScrollX || 0;
                      pdfScrDiv.scrollTop = prev.pdfScrollY || 0;
                    }
                  }
                });
              }
            } else if (prev.kind === 'pics') {
              const img = wrap.querySelector('img');
              const contentEl = wrap.querySelector('.con-media-content');
              const key = prev.attachmentId || prev.id || '';
              const preloadSrc = (typeof _conMirrorAttachmentPreload !== 'undefined' && _conMirrorAttachmentPreload[key])
                ? _conMirrorAttachmentPreload[key]
                : (prev._cachedDataUrl || prev._cachedObjectUrl || '');
              if (preloadSrc) {
                if (!img && contentEl) {
                  contentEl.textContent = '';
                  const newImg = document.createElement('img');
                  newImg.alt = prev.name || 'image';
                  newImg.className = 'con-media-asset';
                  newImg.src = preloadSrc;
                  contentEl.appendChild(newImg);
                } else if (img && (!img.src || img.src.includes('undefined') || !img.complete || img.naturalWidth === 0 || img.src !== preloadSrc)) {
                  img.style.display = '';
                  img.src = preloadSrc;
                }
                const failMsg = wrap.querySelector('.con-media-error-msg');
                if (failMsg) failMsg.remove();
                if (contentEl) contentEl.classList.remove('con-media-load-failed');
              } else if (!img) {
                wrap.remove();
                conBuildMediaWidget(prev);
              }
            }
          } else {
            conBuildMediaWidget(prev);
          }
        }

        const _fsItem = !canReuse ? normalized : prev;
        const _fsWrap = document.querySelector('.con-media-item[data-id="' + id + '"]');
        if (_fsWrap) {
          if (_fsItem._fullscreen) {
            const isMirror = document.documentElement.classList.contains('con-mirror-mode');
            if (isMirror && _fsWrap.parentElement !== document.body) {
              document.body.appendChild(_fsWrap);
            }
            const wasFullscreen = _fsWrap.classList.contains('con-media-fullscreen');
            _fsWrap.classList.add('con-media-fullscreen');
            if (typeof _conFsApplyTransform === 'function') {
              _conFsApplyTransform(_fsItem, _fsWrap);
            }
            if (_fsItem.kind === 'pdf') {
              const _fsCvs = _fsWrap.querySelector('canvas.con-media-pdf-canvas');
              const _fsScrDiv = _fsWrap.querySelector('.con-media-pdf-scroll');
              const _fsCntEl = _fsWrap.querySelector('.con-media-content');
              if (_fsCvs && typeof conRenderPdfForItem === 'function' && (!wasFullscreen || !canReuse)) {
                conRenderPdfForItem(_fsItem, _fsCvs, _fsScrDiv, _fsCntEl);
              }
            }
          } else {
            // Clean up any leftover fullscreen state (e.g. mirror received _fullscreen:false)
            if (_fsWrap.classList.contains('con-media-fullscreen')) {
              _fsWrap.classList.remove('con-media-fullscreen');
              const boardEl = document.getElementById('constellation-board');
              if (boardEl && _fsWrap.parentElement !== boardEl) {
                boardEl.appendChild(_fsWrap);
              }
              _fsWrap.style.left = _fsItem.x + 'px';
              _fsWrap.style.top = _fsItem.y + 'px';
              _fsWrap.style.width = _fsItem.w + 'px';
              _fsWrap.style.height = _fsItem.h + 'px';
              var _fsExit = _fsWrap.querySelector('.con-media-fullscreen-exit-btn');
              if (_fsExit) _fsExit.remove();
              var _fsMini = _fsWrap.querySelector('.con-media-mini-actions');
              if (_fsMini) {
                _fsMini.querySelectorAll('.con-fs-zoom-btn,.con-fs-zoom-sep').forEach(function (el) { el.remove(); });
                _fsMini.classList.remove('con-media-mini-visible', 'con-fs-mini-pinned');
              }
              var _fsCnt = _fsWrap.querySelector('.con-media-content');
              if (_fsCnt) _fsCnt.style.transform = (_fsItem.kind === 'pics' && _fsItem.rotation) ? 'rotate(' + _fsItem.rotation + 'deg)' : '';
              if (_fsItem.kind === 'pdf') {
                const _fsCvs = _fsWrap.querySelector('canvas.con-media-pdf-canvas');
                const _fsScrDiv = _fsWrap.querySelector('.con-media-pdf-scroll');
                if (_fsCvs && typeof conRenderPdfForItem === 'function') {
                  conRenderPdfForItem(_fsItem, _fsCvs, _fsScrDiv, _fsCnt);
                }
              }
            }
          }
        }

        if (_fsWrap) {
          if (_fsItem.mediaNumber != null && typeof window.conApplyEntityBadge === 'function') {
            window.conApplyEntityBadge(_fsWrap, _fsItem.mediaNumber, _fsItem.mediaNumberFormat, 'media');
          } else if (typeof window.conRemoveEntityBadge === 'function') {
            window.conRemoveEntityBadge(_fsWrap);
          }
        }

        const num = parseInt(String(id).replace('cm', ''), 10);
        if (Number.isFinite(num)) conMediaNextId = Math.max(conMediaNextId, num + 1);
      });

      prevElsById.forEach((el, id) => {
        if (!keepIds.has(id)) {
          el.querySelectorAll('audio, video').forEach(function (m) {
            try { m.pause(); m.src = ''; m.load(); } catch (_) { }
          });
          el.querySelectorAll('canvas').forEach(function (c) {
            c.width = 0; c.height = 0;
          });
          el.remove();
        }
      });

      prevById.forEach((prev, id) => {
        if (!keepIds.has(id) && prev) {
          if (prev._pdfViewPoll) {
            clearInterval(prev._pdfViewPoll);
            prev._pdfViewPoll = null;
          }
          prev._pdfDoc = null;
        }
      });

      conMediaItems = nextItems;
    }

    function conFormatFileSize(bytes) {
      const b = Number(bytes) || 0;
      if (b <= 0) return '0 B';
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
      return (b / (1024 * 1024)).toFixed(2) + ' MB';
    }

    let _conImgConvertCurrentAtt = null;
    let _conImgConvertCurrentOptions = null;

    window.conImgUpdateFormatControls = function () {
      const fmt = (document.getElementById('con-img-conv-format') || {}).value;
      const qRow = document.getElementById('con-img-conv-quality-slider-row');
      if (qRow) {
        qRow.style.display = (fmt === 'png') ? 'none' : 'flex';
      }
    };

    async function conImgConvertOpen(att, options) {
      _conImgConvertCurrentAtt = att;
      _conImgConvertCurrentOptions = options || {};

      const hintEl = document.getElementById('con-img-convert-hint');
      const filenameEl = document.getElementById('con-img-convert-filename');
      const metaEl = document.getElementById('con-img-convert-meta');
      const thumbImg = document.getElementById('con-img-convert-thumb');
      const iconSpan = document.getElementById('con-img-convert-icon');

      window.conImgUpdateFormatControls();

      const name = att.name || 'image.png';
      if (filenameEl) filenameEl.textContent = name;
      if (hintEl) hintEl.textContent = (typeof t === 'function' ? t('conImgConvertHintSingle') : null) || 'Choose format and compression to optimize image size before adding.';

      const ext = (name.split('.').pop() || 'png').toUpperCase();
      const sizeStr = conFormatFileSize(att.size);
      if (metaEl) metaEl.textContent = `${ext} • ${sizeStr}`;

      if (thumbImg) thumbImg.style.display = 'none';
      if (iconSpan) iconSpan.style.display = 'block';

      try {
        const src = await conGetAttachmentDataUrl(att);
        if (src) {
          const img = new Image();
          img.onload = () => {
            if (metaEl) metaEl.textContent = `${ext} • ${sizeStr} • ${img.naturalWidth} × ${img.naturalHeight} px`;
            if (thumbImg) {
              thumbImg.src = src;
              thumbImg.style.display = 'block';
            }
            if (iconSpan) iconSpan.style.display = 'none';
          };
          img.src = src;
        }
      } catch (_) {}

      const overlay = document.getElementById('con-img-convert-overlay');
      if (overlay) overlay.classList.add('active');
    }

    window.conImgConvertClose = function () {
      const overlay = document.getElementById('con-img-convert-overlay');
      if (overlay) overlay.classList.remove('active');
      _conImgConvertCurrentAtt = null;
      _conImgConvertCurrentOptions = null;
    };

    window.conImgConvertKeepOriginal = function () {
      const att = _conImgConvertCurrentAtt;
      const opts = _conImgConvertCurrentOptions || {};
      window.conImgConvertClose();
      if (att && typeof window.conInsertAttachmentById === 'function') {
        window.conInsertAttachmentById(att.id, Object.assign({}, opts, { skipConvertModal: true }));
      }
    };

    window.conImgConvertConfirm = async function () {
      const att = _conImgConvertCurrentAtt;
      const opts = _conImgConvertCurrentOptions || {};
      if (!att) { window.conImgConvertClose(); return; }

      const chosenFmt = (document.getElementById('con-img-conv-format') || {}).value || 'webp';
      const chosenRes = (document.getElementById('con-img-conv-resolution') || {}).value || '1920';
      const chosenQualityVal = parseInt((document.getElementById('con-img-conv-quality') || {}).value, 10);
      const chosenQuality = Number.isFinite(chosenQualityVal) ? Math.max(0.2, Math.min(1.0, chosenQualityVal / 100)) : 0.82;

      window.conImgConvertClose();

      try {
        if (typeof mdbToast === 'function') mdbToast((typeof t === 'function' ? t('conImgConverting') : null) || 'Converting image...');
        const src = await conGetAttachmentDataUrl(att);
        if (!src) {
          mdbToast(' Could not load image data for conversion.');
          window.conInsertAttachmentById(att.id, Object.assign({}, opts, { skipConvertModal: true }));
          return;
        }

        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error('Failed to load image into memory'));
          i.src = src;
        });

        let targetW = img.naturalWidth;
        let targetH = img.naturalHeight;
        if (chosenRes !== 'original') {
          const maxDim = parseInt(chosenRes, 10);
          if (Number.isFinite(maxDim) && maxDim > 0 && Math.max(targetW, targetH) > maxDim) {
            const scale = maxDim / Math.max(targetW, targetH);
            targetW = Math.max(1, Math.round(targetW * scale));
            targetH = Math.max(1, Math.round(targetH * scale));
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);

        let mimeType = 'image/webp';
        let ext = 'webp';
        let q = chosenQuality;
        if (chosenFmt === 'jpeg') {
          mimeType = 'image/jpeg';
          ext = 'jpg';
        } else if (chosenFmt === 'png') {
          mimeType = 'image/png';
          ext = 'png';
          q = 1.0;
        }

        let imgDataUrl = canvas.toDataURL(mimeType, q);
        if (chosenFmt === 'webp' && !imgDataUrl.startsWith('data:image/webp')) {
          imgDataUrl = canvas.toDataURL('image/png');
          mimeType = 'image/png';
          ext = 'png';
        }
        canvas.width = 0;
        canvas.height = 0;

        const base64Data = imgDataUrl.split(',')[1];
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const imgBlob = new Blob([bytes], { type: mimeType });

        if (att._cachedObjectUrl) {
          try { URL.revokeObjectURL(att._cachedObjectUrl); } catch (_) {}
        }

        const baseName = (att.name || 'image').replace(/\.[^/.]+$/, '');
        const newName = `${baseName}.${ext}`;

        att.name = newName;
        att.mime = mimeType;
        att.size = imgBlob.size;
        att.file = new File([imgBlob], newName, { type: mimeType });
        att.base64 = base64Data;
        att._cachedDataUrl = imgDataUrl;
        att._cachedObjectUrl = null;
        att._alreadyOptimized = true;

        if (typeof conRenderAttachmentSummary === 'function') conRenderAttachmentSummary();
        window.conInsertAttachmentById(att.id, Object.assign({}, opts, { skipConvertModal: true }));
        mdbToast(' Converted: ' + newName + ' (' + conFormatFileSize(imgBlob.size) + ')');
      } catch (err) {
        console.error('[Image Conversion] Failed to convert image:', err);
        mdbToast(' Conversion failed, adding original image.');
        window.conInsertAttachmentById(att.id, Object.assign({}, opts, { skipConvertModal: true }));
      }
    };

    let _conPdfPagePickerAtt = null;

    window.conPdfToggleImageOptions = function () {
      const chk = document.getElementById('con-pdf-insert-as-png-check');
      const panel = document.getElementById('con-pdf-image-options-panel');
      if (panel) {
        panel.style.display = (chk && chk.checked) ? 'flex' : 'none';
      }
    };

    window.conPdfUpdateFormatControls = function () {
      const fmt = (document.getElementById('con-pdf-img-format') || {}).value;
      const qRow = document.getElementById('con-pdf-quality-slider-row');
      if (qRow) {
        qRow.style.display = (fmt === 'png') ? 'none' : 'flex';
      }
    };

    function conPdfPagePickerOpen(att, pageCount) {
      _conPdfPagePickerAtt = att;
      const hintEl = document.getElementById('con-pdf-page-picker-hint');
      const grid = document.getElementById('con-pdf-page-picker-grid');
      const pngCheck = document.getElementById('con-pdf-insert-as-png-check');
      if (pngCheck) pngCheck.checked = true;
      window.conPdfToggleImageOptions();
      window.conPdfUpdateFormatControls();
      if (hintEl) hintEl.textContent = '\u201c' + (att.name || 'document.pdf') + '\u201d \u2014 ' + pageCount + ' page' + (pageCount === 1 ? '' : 's') + '. Click to select/deselect. Each selected page becomes its own board page.';
      if (grid) {
        grid.innerHTML = '';
        for (let i = 1; i <= pageCount; i++) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'pdf-page-btn selected';
          btn.textContent = i;
          btn.dataset.page = String(i);
          btn.addEventListener('click', () => btn.classList.toggle('selected'));
          grid.appendChild(btn);
        }
      }
      const overlay = document.getElementById('con-pdf-page-picker-overlay');
      if (overlay) overlay.classList.add('active');
    }

    window.conPdfPagePickerClose = function () {
      const overlay = document.getElementById('con-pdf-page-picker-overlay');
      if (overlay) overlay.classList.remove('active');
      _conPdfPagePickerAtt = null;
    };

    window.conPdfPagePickerSelectAll = function () {
      document.querySelectorAll('#con-pdf-page-picker-grid .pdf-page-btn').forEach(b => b.classList.add('selected'));
    };

    window.conPdfPagePickerSelectNone = function () {
      document.querySelectorAll('#con-pdf-page-picker-grid .pdf-page-btn').forEach(b => b.classList.remove('selected'));
    };

    window.conPdfPagePickerConfirm = async function () {
      const att = _conPdfPagePickerAtt;
      if (!att) return;
      const btns = document.querySelectorAll('#con-pdf-page-picker-grid .pdf-page-btn.selected');
      const selectedPages = Array.from(btns).map(b => Number(b.dataset.page)).filter(n => n > 0);
      selectedPages.sort((a, b) => a - b);
      const asImage = !!(document.getElementById('con-pdf-insert-as-png-check') && document.getElementById('con-pdf-insert-as-png-check').checked);
      const chosenFmt = (document.getElementById('con-pdf-img-format') || {}).value || 'webp';
      const chosenScale = parseFloat((document.getElementById('con-pdf-img-scale') || {}).value) || 1.5;
      const chosenQualityVal = parseInt((document.getElementById('con-pdf-img-quality') || {}).value, 10);
      const chosenQuality = Number.isFinite(chosenQualityVal) ? Math.max(0.2, Math.min(1.0, chosenQualityVal / 100)) : 0.82;

      window.conPdfPagePickerClose();
      if (selectedPages.length === 0) { mdbToast('ℹ No pages selected.'); return; }

      const insertAfterIdx = conCurrentPageIndex;

      if (asImage) {
        try {
          if (typeof mdbToast === 'function') mdbToast(t('conPdfRenderingPng') || 'Converting PDF pages to images...');
          const pdfjsLib = await conEnsurePdfjsLib();
          let pdfDoc = att._pdfDoc;
          if (!pdfDoc) {
            const buf = await conGetAttachmentArrayBuffer(att);
            if (!buf) { mdbToast(' Could not load PDF file data.'); return; }
            pdfDoc = await pdfjsLib.getDocument(conPdfGetDocumentParams({ data: new Uint8Array(buf) })).promise;
            att._pdfDoc = pdfDoc;
          }

          let mimeType = 'image/webp';
          let ext = 'webp';
          let q = chosenQuality;
          if (chosenFmt === 'jpeg') {
            mimeType = 'image/jpeg';
            ext = 'jpg';
          } else if (chosenFmt === 'png') {
            mimeType = 'image/png';
            ext = 'png';
            q = 1.0;
          }

          const newSnaps = [];
          const baseName = (att.name || 'document').replace(/\.pdf$/i, '');

          for (const pageNum of selectedPages) {
            const page = await pdfDoc.getPage(pageNum);
            const unscaledVp = page.getViewport({ scale: 1 });
            const targetWidth = Math.max(900, Math.min(3200, Math.round(unscaledVp.width * chosenScale)));
            const renderScale = targetWidth / unscaledVp.width;
            const viewport = page.getViewport({ scale: renderScale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;

            let imgDataUrl = canvas.toDataURL(mimeType, q);
            if (chosenFmt === 'webp' && !imgDataUrl.startsWith('data:image/webp')) {
              imgDataUrl = canvas.toDataURL('image/png');
              mimeType = 'image/png';
              ext = 'png';
            }
            canvas.width = 0;
            canvas.height = 0;

            const base64Data = imgDataUrl.split(',')[1];
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const imgBlob = new Blob([bytes], { type: mimeType });

            _conAttachmentCounter += 1;
            const imgAttId = 'att_' + _conAttachmentCounter;
            const imgName = `${baseName}_p${pageNum}.${ext}`;
            const imgAtt = {
              id: imgAttId,
              name: imgName,
              mime: mimeType,
              kind: 'pics',
              size: imgBlob.size,
              file: new File([imgBlob], imgName, { type: mimeType }),
              base64: base64Data,
              _cachedDataUrl: imgDataUrl,
              relativePath: ''
            };
            conAttachments.push(imgAtt);

            const ratio = unscaledVp.height / unscaledVp.width;
            const rect = conGetDefaultPdfMediaRect(ratio);

            const snap = conBuildEmptyPageSnapshot();
            snap.media = [{
              id: 'cm' + (conMediaNextId++),
              kind: 'pics',
              attachmentId: imgAttId,
              name: imgName,
              mime: mimeType,
              relativePath: '',
              x: rect.x,
              y: rect.y,
              w: rect.w,
              h: rect.h,
              locked: true,
              _ratioInitialized: true
            }];
            newSnaps.push(snap);
          }

          // Do not actually integrate the PDF into the document: remove from conAttachments if not used elsewhere
          const sharedSnaps = window.conPageSnapshots || global.conPageSnapshots || conPageSnapshots;
          const isPdfUsedElsewhere = sharedSnaps.some((pageSnap, idx) => {
            if (!pageSnap) return false;
            const hasMedia = (pageSnap.media || []).some(m => m && m.attachmentId === att.id);
            const hasBg = pageSnap.backgroundPdf && (pageSnap.backgroundPdf.attachmentId === att.id || pageSnap.backgroundPdf.id === att.id);
            const hasNodes = (pageSnap.nodes || []).some(n => n && (n.pdfAttachmentId === att.id || n.attachmentId === att.id));
            return hasMedia || hasBg || hasNodes;
          }) || (conMediaItems || []).some(m => m && m.attachmentId === att.id)
            || (typeof conPageBackgroundPdf !== 'undefined' && conPageBackgroundPdf && conPageBackgroundPdf.attachmentId === att.id);

          if (!isPdfUsedElsewhere) {
            conAttachments = conAttachments.filter(a => a.id !== att.id);
            if (att._cachedObjectUrl) {
              try { URL.revokeObjectURL(att._cachedObjectUrl); } catch (_) {}
            }
            if (window._conPdfDocCache && att.id) {
              window._conPdfDocCache.delete(att.id);
            }
          }

          if (typeof window.conInsertPageSnapshots === 'function') {
            window.conInsertPageSnapshots(insertAfterIdx, newSnaps, { isImage: true });
          } else {
            const snapsTarget = window.conPageSnapshots || global.conPageSnapshots || conPageSnapshots;
            if (typeof _conCacheCurrentPageDom === 'function') {
              _conCacheCurrentPageDom();
            } else if (snapsTarget[insertAfterIdx]) {
              snapsTarget[insertAfterIdx] = conBuildPageSnapshot();
            }
            const insertIdx = insertAfterIdx + 1;
            if (typeof _conRemapPageDomCacheOnInsertCount === 'function') {
              _conRemapPageDomCacheOnInsertCount(insertIdx, newSnaps.length);
            }
            snapsTarget.splice(insertIdx, 0, ...newSnaps);
            const pngsTarget = window._conPageSnapshotPngs || global._conPageSnapshotPngs;
            if (Array.isArray(pngsTarget)) {
              pngsTarget.splice(insertIdx, 0, ...new Array(newSnaps.length).fill(null));
            }
            conCurrentPageIndex = insertIdx;
            _conRestorePageToBoard(snapsTarget[conCurrentPageIndex]);
            if (typeof conUpdatePageBar === 'function') conUpdatePageBar();
            if (typeof conRenderAttachmentSummary === 'function') conRenderAttachmentSummary();
            if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
            if (typeof conTriggerLivePageSnapshot === 'function') conTriggerLivePageSnapshot();
            if (!window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
              window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
            }
          }
          mdbToast(' Inserted ' + selectedPages.length + ' page' + (selectedPages.length === 1 ? '' : 's') + ' as compressed images.');
        } catch (err) {
          console.error('[PDF to Image] Failed to render PDF pages:', err);
          mdbToast(' Error converting PDF pages to images: ' + (err && err.message ? err.message : err));
        }
        return;
      }

      const pdfLike = {
        attachmentId: att.id,
        name: att.name,
        mime: att.mime || 'application/pdf',
        relativePath: att.relativePath || '',
        file: att.file || null
      };

      const ratio = await conGetPdfPageAspectRatio(pdfLike, selectedPages[0] || 1);
      const rect = conGetDefaultPdfMediaRect(ratio);

      const newSnaps = selectedPages.map(pageNum => {
        const snap = conBuildEmptyPageSnapshot();
        snap.media = [{
          id: 'cm' + (conMediaNextId++),
          kind: 'pdf',
          attachmentId: att.id,
          name: att.name,
          mime: att.mime || 'application/pdf',
          relativePath: att.relativePath || '',
          pageNumber: pageNum,
          pdfZoom: 1,
          pdfRotation: 0,
          pdfScrollX: 0,
          pdfScrollY: 0,
          pdfLockSize: true,
          locked: true,
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: rect.h,
          _ratioInitialized: true
        }];
        return snap;
      });

      if (typeof window.conInsertPageSnapshots === 'function') {
        window.conInsertPageSnapshots(insertAfterIdx, newSnaps, { isPdf: true });
      } else {
        const snapsTarget = window.conPageSnapshots || global.conPageSnapshots || conPageSnapshots;
        if (typeof _conCacheCurrentPageDom === 'function') {
          _conCacheCurrentPageDom();
        } else if (snapsTarget[insertAfterIdx]) {
          snapsTarget[insertAfterIdx] = conBuildPageSnapshot();
        }
        const insertIdx = insertAfterIdx + 1;
        if (typeof _conRemapPageDomCacheOnInsertCount === 'function') {
          _conRemapPageDomCacheOnInsertCount(insertIdx, newSnaps.length);
        }
        snapsTarget.splice(insertIdx, 0, ...newSnaps);
        const pngsTarget = window._conPageSnapshotPngs || global._conPageSnapshotPngs;
        if (Array.isArray(pngsTarget)) {
          pngsTarget.splice(insertIdx, 0, ...new Array(newSnaps.length).fill(null));
        }
        conCurrentPageIndex = insertIdx;
        _conRestorePageToBoard(snapsTarget[conCurrentPageIndex]);
        if (typeof conUpdatePageBar === 'function') conUpdatePageBar();
        if (typeof conRenderAttachmentSummary === 'function') conRenderAttachmentSummary();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
        if (typeof conTriggerLivePageSnapshot === 'function') conTriggerLivePageSnapshot();
        if (!window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        }
      }
      mdbToast(' Inserted ' + selectedPages.length + ' PDF page' + (selectedPages.length === 1 ? '' : 's') + ' as new board pages.');
    };

    // -------------------------------------------------------

    window.conInsertAttachmentById = async function (attachmentId, options = {}) {
      const att = conFindAttachmentById(attachmentId);
      if (!att) {
        mdbToast(' Attachment not found.');
        return;
      }

      if (att.kind === 'pdf') {
        const pageCount = await conGetPdfPageCount(att);
        conPdfPagePickerOpen(att, pageCount);
        return;
      }

      if (att.kind === 'pics' && !(options && options.skipConvertModal) && !att._alreadyOptimized) {
        conImgConvertOpen(att, options);
        return;
      }

      if (att.kind === 'sounds') {
        const customX = Number(options && options.x);
        const customY = Number(options && options.y);
        const hasCustomPos = Number.isFinite(customX) && Number.isFinite(customY);
        const boardEl = document.getElementById('constellation-board');
        const posX = hasCustomPos ? customX : Math.max(20, (boardEl ? (boardEl.scrollLeft || 0) + 120 : 120));
        const posY = hasCustomPos ? customY : Math.max(20, (boardEl ? (boardEl.scrollTop || 0) + 120 : 120));
        const pageNum = options && options.pageNum != null ? options.pageNum : null;
        const nodeId = conAddSoundNodeAt(att, posX, posY, pageNum);
        if (!options.silent) {
          if (typeof mdbToast === 'function') {
            const toastMsg = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('soundNodeAddedToast') : ' Sound node added to board.';
            mdbToast(toastMsg || ' Sound node added to board.');
          }
        }
        return nodeId;
      }

      if (att.kind === 'videos' && !(options && options.asCanvasBox)) {
        const customX = Number(options && options.x);
        const customY = Number(options && options.y);
        const hasCustomPos = Number.isFinite(customX) && Number.isFinite(customY);
        const boardEl = document.getElementById('constellation-board');
        const posX = hasCustomPos ? customX : Math.max(20, (boardEl ? (boardEl.scrollLeft || 0) + 120 : 120));
        const posY = hasCustomPos ? customY : Math.max(20, (boardEl ? (boardEl.scrollTop || 0) + 120 : 120));
        const pageNum = options && options.pageNum != null ? options.pageNum : null;
        const nodeId = conAddVideoNodeAt(att, posX, posY, pageNum);
        if (!options.silent) {
          if (typeof mdbToast === 'function') {
            const toastMsg = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('videoNodeAddedToast') : ' Video node added to board.';
            mdbToast(toastMsg || ' Video node added to board.');
          }
        }
        return nodeId;
      }

      if (att.kind !== 'pics' && att.kind !== 'videos') {
        mdbToast(' This attachment type cannot be inserted.');
        return;
      }

      const board = document.getElementById('constellation-board');
      if (!board) return;
      const baseW = att.kind === 'videos' ? (window._bcVideoInsertWidth || 260) : (window._bcImageInsertWidth || 260);
      const baseH = 200;
      const customX = Number(options && options.x);
      const customY = Number(options && options.y);
      const hasCustomPos = Number.isFinite(customX) && Number.isFinite(customY);

      // For images, resolve the natural aspect ratio so the container fits the image exactly.
      let resolvedH = baseH;
      if (att.kind === 'pics') {
        try {
          const imgUrl = await conGetAttachmentDataUrl(att);
          const nat = await conGetImageNaturalSize(imgUrl);
          if (nat && nat.w > 0 && nat.h > 0) {
            resolvedH = Math.max(40, Math.round(baseW * nat.h / nat.w));
          }
        } catch (_) {}
      }

      const maxX = Math.max(12, board.clientWidth - baseW - 12);
      const maxY = Math.max(12, board.clientHeight - resolvedH - 12);
      const item = {
        id: 'cm' + (conMediaNextId++),
        kind: att.kind,
        attachmentId: att.id,
        name: att.name,
        mime: att.mime || conGuessMimeByName(att.name, att.kind),
        relativePath: att.relativePath || '',
        file: att.file || null,
        base64: att.base64 || '',
        dataUrl: (att._cachedDataUrl && att._cachedDataUrl.startsWith('data:')) ? att._cachedDataUrl : '',
        x: hasCustomPos
          ? Math.max(12, Math.min(maxX, Math.round(customX)))
          : Math.max(12, Math.round((board.clientWidth - baseW) / 2 + Math.random() * 40 - 20)),
        y: hasCustomPos
          ? Math.max(12, Math.min(maxY, Math.round(customY)))
          : Math.max(12, Math.round((board.clientHeight - resolvedH) / 2 + Math.random() * 40 - 20)),
        w: baseW,
        h: resolvedH
      };
      conMediaItems.push(item);
      conBuildMediaWidget(item);
      if (!(options && options.silent)) {
        mdbToast(' Inserted: ' + att.name);
      }
      if (typeof window._conMirrorBroadcast === 'function') {
        window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
      }
    };

    async function conReadAttachmentFileBase64(file) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const commaIdx = result.indexOf(',');
          resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(reader.error || new Error('Could not read attachment file.'));
        reader.readAsDataURL(file);
      });
    }

    window.conPickAttachments = function () {
      const input = document.getElementById('con-attachments-input');
      if (!input) return;
      input.click();
    };

    window.conHandleAttachmentInput = function (event) {
      const input = event && event.target;
      const files = input && input.files ? Array.from(input.files) : [];
      if (input) input.value = '';
      if (!files.length) return;

      const rejected = [];
      let lastAudioAtt = null;
      files.forEach(file => {
        const kind = conAttachmentKind(file.name, file.type);
        if (!kind) {
          rejected.push(file.name || 'file');
          return;
        }
        _conAttachmentCounter += 1;
        let diskPath = '';
        if (window.Desktop && typeof window.Desktop.getPathForFile === 'function') {
          try { diskPath = window.Desktop.getPathForFile(file) || ''; } catch (_) {}
        } else if (file && file.path) {
          diskPath = file.path;
        }
        const attObj = {
          id: 'att_' + _conAttachmentCounter,
          name: conSanitizeAttachmentName(file.name),
          mime: String(file.type || ''),
          kind,
          size: Number(file.size) || 0,
          file,
          path: diskPath,
          relativePath: '',
          transcript: ''
        };
        conAttachments.push(attObj);
        if (kind === 'sounds') {
          lastAudioAtt = attObj;
        }
      });

      conRenderAttachmentSummary();
      conRemoveInsertAttachmentChooser();
      if (lastAudioAtt && typeof window.conShowAudioImportPill === 'function') {
        window.conShowAudioImportPill(lastAudioAtt);
      }
      if (rejected.length) {
        mdbToast(' Ignored unsupported files: ' + rejected.slice(0, 3).join(', ') + (rejected.length > 3 ? '…' : ''));
      } else {
        mdbToast(' Added ' + files.length + ' attachment(s).');
      }
    };

    window.conHandleBoardFileDrop = function (files, options = {}) {
      const dropped = Array.isArray(files) ? files : [];
      if (!dropped.length) return { inserted: 0, rejected: 0 };

      let rejected = 0;
      let inserted = 0;
      let placedOffset = 0;
      let lastAudioAtt = null;
      const dropX = Number(options.x);
      const dropY = Number(options.y);
      const hasDropPos = Number.isFinite(dropX) && Number.isFinite(dropY);

      dropped.forEach(file => {
        const kind = conAttachmentKind(file && file.name, file && file.type);
        if (!kind) {
          rejected += 1;
          return;
        }

        _conAttachmentCounter += 1;
        const attachmentId = 'att_' + _conAttachmentCounter;
        let diskPath = '';
        if (window.Desktop && typeof window.Desktop.getPathForFile === 'function') {
          try { diskPath = window.Desktop.getPathForFile(file) || ''; } catch (_) {}
        } else if (file && file.path) {
          diskPath = file.path;
        }
        const attObj = {
          id: attachmentId,
          name: conSanitizeAttachmentName(file.name),
          mime: String(file.type || ''),
          kind,
          size: Number(file.size) || 0,
          file,
          path: diskPath,
          relativePath: '',
          transcript: ''
        };
        conAttachments.push(attObj);
        if (kind === 'sounds') {
          lastAudioAtt = attObj;
        }

        if (kind === 'pdf') {
          window.conInsertAttachmentById(attachmentId, { silent: true });
        } else {
          const pos = hasDropPos
            ? {
              x: dropX + (placedOffset * 18),
              y: dropY + (placedOffset * 18),
              silent: true
            }
            : { silent: true };
          window.conInsertAttachmentById(attachmentId, pos);
          placedOffset += 1;
        }

        inserted += 1;
      });

      conRenderAttachmentSummary();
      conRemoveInsertAttachmentChooser();
      if (lastAudioAtt && typeof window.conShowAudioImportPill === 'function') {
        window.conShowAudioImportPill(lastAudioAtt);
      }

      if (inserted > 0) {
        const msg = ' Inserted ' + inserted + ' file(s) from drop.' + (rejected ? ' Ignored ' + rejected + ' unsupported file(s).' : '');
        if (typeof mdbToast === 'function') mdbToast(msg);
      } else if (rejected > 0) {
        if (typeof mdbToast === 'function') mdbToast(' No supported files dropped.');
      }

      return { inserted, rejected };
    };

    setTimeout(conRenderAttachmentSummary, 0);

  window.conResetAttachments = global.conResetAttachments = conResetAttachments;
  window.conRemoveAttachmentFromCurrentPage = global.conRemoveAttachmentFromCurrentPage = conRemoveAttachmentFromCurrentPage;
  window._conAttachmentCounter = global._conAttachmentCounter = _conAttachmentCounter;
  window.conRenderAttachmentSummary = global.conRenderAttachmentSummary = conRenderAttachmentSummary;
  window.conReadAttachmentFileBase64 = global.conReadAttachmentFileBase64 = conReadAttachmentFileBase64;
  window.conAttachmentCandidateRelativePaths = global.conAttachmentCandidateRelativePaths = conAttachmentCandidateRelativePaths;
  window.conAttachmentKind = global.conAttachmentKind = conAttachmentKind;
  window.conGuessMimeByName = global.conGuessMimeByName = conGuessMimeByName;
  window.conMediaNextId = global.conMediaNextId = conMediaNextId;
  window._conMirrorAttachmentPreload = global._conMirrorAttachmentPreload = _conMirrorAttachmentPreload;
  window.conBuildAttachmentMetadata = global.conBuildAttachmentMetadata = conBuildAttachmentMetadata;
  window.conSanitizeAttachmentName = global.conSanitizeAttachmentName = conSanitizeAttachmentName;
  window.conAwaitAllPdfRendersOnBoard = global.conAwaitAllPdfRendersOnBoard = conAwaitAllPdfRendersOnBoard;
  window.conAwaitAllMediaRendersOnBoard = global.conAwaitAllMediaRendersOnBoard = conAwaitAllMediaRendersOnBoard;
  window.conSetAttachmentsFromSession = global.conSetAttachmentsFromSession = conSetAttachmentsFromSession;
  window.conRestoreMediaItems = global.conRestoreMediaItems = conRestoreMediaItems;
  window.conRenderPdfForItem = global.conRenderPdfForItem = conRenderPdfForItem;
  window.conBuildMediaWidget = global.conBuildMediaWidget = conBuildMediaWidget;
  window.conEnsurePdfjsLib = global.conEnsurePdfjsLib = conEnsurePdfjsLib;
  window.conGetAttachmentArrayBuffer = global.conGetAttachmentArrayBuffer = conGetAttachmentArrayBuffer;
  window.conPdfGetDocumentParams = global.conPdfGetDocumentParams = conPdfGetDocumentParams;
  window.conGetPdfPageCount = global.conGetPdfPageCount = conGetPdfPageCount;
  window.conPdfPagePickerOpen = global.conPdfPagePickerOpen = conPdfPagePickerOpen;
  window.conExtractBoardBgPresetsFromConfig = global.conExtractBoardBgPresetsFromConfig = conExtractBoardBgPresetsFromConfig;
  window.conRenderBoardLayoutOptionsInContextMenu = global.conRenderBoardLayoutOptionsInContextMenu = conRenderBoardLayoutOptionsInContextMenu;

})(typeof window !== "undefined" ? window : this);
