// Global Window Reorder Helper (Ctrl+Shift+W / Cmd+Shift+W)
// Reorders and arranges Main View tool windows and Mirrored/Presentation View windows,
// with persisted custom layout presets.
(function () {
  'use strict';

  if (window._cmtWindowHelper) return;
  window._cmtWindowHelper = true;

  var _isPresMode = typeof location !== 'undefined' &&
    /[?&](mirror|presentation|ltPresentation|wwPresentation|oralPresenter)=1/i.test(location.search);

  function _t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      var val = window.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _assetPrefix() {
    return (typeof location !== 'undefined' && /\/pages\//.test(location.pathname))
      ? '../assets/icons/'
      : 'assets/icons/';
  }

  function _icon(name, cls) {
    return '<img src="' + _assetPrefix() + name + '.svg" alt=""' + (cls ? ' class="' + cls + '"' : '') + ' />';
  }

  var _backdrop = null;
  var _modal = null;
  var _unsubWindows = null;
  var _state = { displays: [], windows: [] };
  var _mainOrder = [];
  var _mirrorOrder = [];
  var _presets = [];
  var _openMissing = false;
  var _snapRatio = 50;
  var _splitLayout = 'horizontal';
  var _layoutGap = 0;
  var _layoutDisplayId = null;
  var _showPresetForm = false;
  var _openMoreId = null;
  var _dragInfo = null; // { role, id }

  function _injectStyles() {
    if (document.getElementById('cmt-wh-styles')) return;
    var s = document.createElement('style');
    s.id = 'cmt-wh-styles';
    s.textContent = [
      '.cmt-wh-backdrop{position:fixed;inset:0;background:rgba(20,20,20,0.45);z-index:100600;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}',
      '.cmt-wh-backdrop.open{display:flex}',
      '.cmt-wh-modal{width:min(640px,95vw);max-height:85vh;display:flex;flex-direction:column;background:#f5f5f0;border:2px solid #333333;border-radius:10px;box-shadow:4px 4px 0 #555555;overflow:hidden;font-family:"Lexend",system-ui,-apple-system,sans-serif;color:#222222}',
      '.cmt-wh-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;background:#ffffff;border-bottom:2px solid #333333}',
      '.cmt-wh-title-wrap{display:flex;align-items:center;gap:10px;min-width:0}',
      '.cmt-wh-title-wrap img{width:20px;height:20px;flex-shrink:0}',
      '.cmt-wh-title{font-size:1rem;font-weight:800;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.cmt-wh-head-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}',
      '.cmt-wh-body{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px}',
      '.cmt-wh-section{background:#ffffff;border:2px solid #333333;border-radius:8px;box-shadow:3px 3px 0 #555555;padding:12px;display:flex;flex-direction:column;gap:10px}',
      '.cmt-wh-sec-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}',
      '.cmt-wh-sec-title{display:flex;align-items:center;gap:8px;font-size:0.84rem;font-weight:800;text-transform:uppercase;letter-spacing:0.03em}',
      '.cmt-wh-pill{font-size:0.7rem;font-weight:800;padding:2px 7px;border:1.5px solid #333333;border-radius:4px;background:#e2c96e;color:#222222}',
      '.cmt-wh-pill.mirror{background:#8b7cc2;color:#ffffff}',
      '.cmt-wh-pill.count{background:#f5f5f0}',
      '.cmt-wh-list{display:flex;flex-direction:column;gap:6px}',
      '.cmt-wh-row{display:flex;align-items:center;gap:8px;padding:7px 9px;background:#f5f5f0;border:2px solid #333333;border-radius:6px;transition:transform 0.12s ease,background-color 0.12s ease}',
      '.cmt-wh-row.is-current{background:#fffdf0}',
      '.cmt-wh-row.dragging{opacity:0.55}',
      '.cmt-wh-row.drag-over{border-style:dashed;background:#eef5fc}',
      '.cmt-wh-grip{cursor:grab;display:inline-flex;align-items:center;padding:2px;flex-shrink:0}',
      '.cmt-wh-grip img{width:15px;height:15px}',
      '.cmt-wh-idx{font-size:0.74rem;font-weight:800;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid #333333;border-radius:4px;background:#ffffff;flex-shrink:0}',
      '.cmt-wh-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}',
      '.cmt-wh-row-title{font-size:0.85rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.cmt-wh-row-meta{font-size:0.71rem;color:#555555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.cmt-wh-row-btns{display:flex;align-items:center;gap:4px;flex-shrink:0;position:relative}',
      '.cmt-wh-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;font-family:inherit;font-size:0.76rem;font-weight:700;color:#222222;background:#ffffff;border:2px solid #333333;border-radius:6px;box-shadow:2px 2px 0 #555555;cursor:pointer;transition:transform 0.1s ease,background-color 0.12s ease}',
      '.cmt-wh-btn:hover{background:#f0f0ea;transform:translate(-1px,-1px)}',
      '.cmt-wh-btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #555555}',
      '.cmt-wh-btn.icon-only{padding:4px 6px}',
      '.cmt-wh-btn.active{background:#e2c96e}',
      '.cmt-wh-btn.primary{background:#6abf8e;color:#111111}',
      '.cmt-wh-btn.accent{background:#5b8fcc;color:#ffffff}',
      '.cmt-wh-btn.danger{background:#c96b6b;color:#ffffff}',
      '.cmt-wh-btn img{width:14px;height:14px;flex-shrink:0}',
      '.cmt-wh-btn.accent img,.cmt-wh-btn.danger img{filter:brightness(0) invert(1)}',
      '.cmt-wh-more-wrap{position:relative;display:inline-flex}',
      '.cmt-wh-more-menu{position:absolute;right:0;top:calc(100% + 4px);z-index:20;min-width:148px;background:#ffffff;border:2px solid #333333;border-radius:6px;box-shadow:3px 3px 0 #555555;padding:4px;display:flex;flex-direction:column;gap:2px}',
      '.cmt-wh-more-item{display:flex;align-items:center;gap:7px;width:100%;padding:5px 8px;border:none;border-radius:4px;background:transparent;font-family:inherit;font-size:0.76rem;font-weight:700;color:#222222;text-align:left;cursor:pointer}',
      '.cmt-wh-more-item:hover{background:#f0f0ea}',
      '.cmt-wh-more-item img{width:14px;height:14px;flex-shrink:0}',
      '.cmt-wh-bar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding-top:6px;border-top:1.5px dashed #cccccc}',
      '.cmt-wh-split-group{display:inline-flex;align-items:center;gap:4px}',
      '.cmt-wh-preset-form{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px;background:#f5f5f0;border:2px solid #333333;border-radius:6px}',
      '.cmt-wh-input{flex:1;min-width:160px;padding:6px 9px;font-family:inherit;font-size:0.82rem;font-weight:600;border:2px solid #333333;border-radius:6px;background:#ffffff;color:#222222}',
      '.cmt-wh-preset-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:#f5f5f0;border:2px solid #333333;border-radius:6px;flex-wrap:wrap}',
      '.cmt-wh-preset-info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}',
      '.cmt-wh-preset-name{font-size:0.85rem;font-weight:800}',
      '.cmt-wh-preset-chips{display:flex;flex-wrap:wrap;gap:4px}',
      '.cmt-wh-chip{font-size:0.68rem;font-weight:700;padding:1px 6px;border:1.5px solid #333333;border-radius:4px;background:#ffffff}',
      '.cmt-wh-chip.is-mirror{background:#ebe6fa}',
      '.cmt-wh-empty{font-size:0.82rem;color:#555555;padding:8px 4px;text-align:center}',
      '.cmt-wh-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;background:#ffffff;border-top:2px solid #333333;font-size:0.75rem;color:#555555;flex-wrap:wrap}',
      '.cmt-wh-check{display:inline-flex;align-items:center;gap:6px;font-size:0.76rem;font-weight:700;cursor:pointer;color:#222222}',
      '.cmt-wh-select{padding:4px 7px;font-family:inherit;font-size:0.76rem;font-weight:700;border:2px solid #333333;border-radius:6px;background:#ffffff;color:#222222;cursor:pointer}',
      '.cmt-wh-lbl{font-size:0.72rem;font-weight:700;color:#555555}',
      '.cmt-wh-snapbar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:6px 8px;background:#f5f5f0;border:1.5px solid #333333;border-radius:6px}',
      '.cmt-wh-snapbar-group{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.cmt-wh-pill-btn{padding:3px 8px;font-family:inherit;font-size:0.72rem;font-weight:700;border:1.5px solid #333333;border-radius:4px;background:#ffffff;color:#222222;cursor:pointer;transition:background-color 0.1s ease}',
      '.cmt-wh-pill-btn:hover{background:#f0f0ea}'
    ].join('');
    document.head.appendChild(s);
  }

  async function _loadPresets() {
    var list = [];
    try {
      if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.getWindowPresets === 'function') {
        var res = await window.Desktop.getWindowPresets();
        if (res && res.ok && Array.isArray(res.presets)) {
          list = res.presets;
        }
      }
      if (list.length === 0) {
        var ls = localStorage.getItem('cmt-window-presets');
        if (ls) {
          var p2 = JSON.parse(ls);
          if (p2 && Array.isArray(p2.presets)) list = p2.presets;
        }
      }
    } catch (_) {}
    _presets = Array.isArray(list) ? list : [];
    return _presets.slice();
  }

  async function _savePresets() {
    var payload = { version: 1, presets: _presets };
    try {
      localStorage.setItem('cmt-window-presets', JSON.stringify(payload));
    } catch (_) {}
    try {
      if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.saveWindowPresets === 'function') {
        await window.Desktop.saveWindowPresets(_presets);
      }
    } catch (_) {}
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('cmt-wh-presets-changed', { detail: { presets: _presets.slice() } }));
      }
    } catch (_) {}
  }

  async function applyPreset(presetOrId, options) {
    var opts = options || {};
    var openMissing = opts.openMissing !== undefined ? !!opts.openMissing : _openMissing;
    var preset = (presetOrId && typeof presetOrId === 'object') ? presetOrId : null;
    if (!preset && presetOrId) {
      var list = _presets.length > 0 ? _presets : await _loadPresets();
      preset = list.find(function (p) { return p && p.id === String(presetOrId); }) || null;
    }
    if (!preset || !Array.isArray(preset.slots) || preset.slots.length === 0) {
      return { ok: false, error: 'preset-not-found' };
    }
    if (window.Desktop && typeof window.Desktop.applyWindowPreset === 'function') {
      return window.Desktop.applyWindowPreset({ slots: preset.slots, openMissing: openMissing });
    }
    return { ok: false, error: 'not-electron' };
  }

  function _capturePresetSlots() {
    var dispMap = {};
    (_state.displays || []).forEach(function (d) { dispMap[d.id] = d; });

    var allOrdered = _orderedWindows('main').concat(_orderedWindows('mirror'));
    return allOrdered.map(function (w) {
      var d = dispMap[w.displayId] || (_state.displays && _state.displays[0]) || null;
      var wa = (d && d.workArea) ? d.workArea : { x: 0, y: 0, width: 1280, height: 800 };
      var b = w.bounds || { x: wa.x, y: wa.y, width: 800, height: 600 };
      var rw = wa.width > 0 ? Number((b.width / wa.width).toFixed(4)) : 0.5;
      var rh = wa.height > 0 ? Number((b.height / wa.height).toFixed(4)) : 0.5;
      var rx = wa.width > 0 ? Number(((b.x - wa.x) / wa.width).toFixed(4)) : 0;
      var ry = wa.height > 0 ? Number(((b.y - wa.y) / wa.height).toFixed(4)) : 0;
      var pctW = wa.width > 0 ? Math.max(1, Math.min(100, Number(((b.width / wa.width) * 100).toFixed(1)))) : 50;
      var pctH = wa.height > 0 ? Math.max(1, Math.min(100, Number(((b.height / wa.height) * 100).toFixed(1)))) : 100;
      var pctX = wa.width > 0 ? Math.max(0, Math.min(100, Number((((b.x - wa.x) / wa.width) * 100).toFixed(1)))) : 0;
      var pctY = wa.height > 0 ? Math.max(0, Math.min(100, Number((((b.y - wa.y) / wa.height) * 100).toFixed(1)))) : 0;
      return {
        pageFile: w.pageFile,
        title: w.title,
        role: w.role === 'mirror' ? 'mirror' : 'main',
        displayIndex: typeof w.displayIndex === 'number' ? w.displayIndex : 0,
        snap: w.isMaximized ? 'full' : 'custom',
        unit: '%',
        bounds: { x: pctX, y: pctY, width: pctW, height: pctH },
        relBounds: { rx: rx, ry: ry, rw: rw, rh: rh },
        isMaximized: !!w.isMaximized,
        isAlwaysOnTop: !!w.isAlwaysOnTop
      };
    });
  }

  function _capturePreset(name) {
    var trimmed = String(name || '').trim();
    if (!trimmed) return false;
    var slots = _capturePresetSlots();
    if (slots.length === 0) return false;
    _presets.push({
      id: 'preset-' + Date.now(),
      name: trimmed,
      createdAt: new Date().toISOString(),
      slots: slots
    });
    _savePresets();
    return true;
  }

  function _syncOrdersFromState() {
    var mainWins = (_state.windows || []).filter(function (w) { return w.role !== 'mirror'; });
    var mirrorWins = (_state.windows || []).filter(function (w) { return w.role === 'mirror'; });

    var mainIds = mainWins.map(function (w) { return w.id; });
    _mainOrder = _mainOrder.filter(function (id) { return mainIds.indexOf(id) !== -1; });
    mainIds.forEach(function (id) {
      if (_mainOrder.indexOf(id) === -1) _mainOrder.push(id);
    });

    var mirrorIds = mirrorWins.map(function (w) { return w.id; });
    _mirrorOrder = _mirrorOrder.filter(function (id) { return mirrorIds.indexOf(id) !== -1; });
    mirrorIds.forEach(function (id) {
      if (_mirrorOrder.indexOf(id) === -1) _mirrorOrder.push(id);
    });
  }

  function _orderedWindows(role) {
    var order = role === 'mirror' ? _mirrorOrder : _mainOrder;
    var byId = {};
    (_state.windows || []).forEach(function (w) { byId[w.id] = w; });
    return order.map(function (id) { return byId[id]; }).filter(Boolean);
  }

  function _reorderToTarget(role, srcId, dstId) {
    if (srcId === dstId) return;
    var arr = role === 'mirror' ? _mirrorOrder : _mainOrder;
    var srcIdx = arr.indexOf(srcId);
    var dstIdx = arr.indexOf(dstId);
    if (srcIdx === -1 || dstIdx === -1) return;
    arr.splice(srcIdx, 1);
    arr.splice(dstIdx, 0, srcId);
    _render();
  }

  function _renderWindowRow(w, idx, total, role, multiDisplay) {
    var dispLabel = _t('wh_display_n', 'D{n}').replace('{n}', String((w.displayIndex || 0) + 1));
    var dims = w.bounds ? (w.bounds.width + 'x' + w.bounds.height) : '';
    var cls = 'cmt-wh-row' + (w.isCurrent ? ' is-current' : '');
    var nextDisplayId = null;
    if (multiDisplay && _state.displays.length > 1) {
      var curIdx = _state.displays.findIndex(function (d) { return d.id === w.displayId; });
      var nextDisp = _state.displays[(curIdx + 1) % _state.displays.length];
      if (nextDisp) nextDisplayId = nextDisp.id;
    }
    var pctTag = ' (' + _snapRatio + '%)';
    var isMoreOpen = _openMoreId === w.id;

    return [
      '<div class="' + cls + '" draggable="true" data-wh-id="' + w.id + '" data-wh-role="' + role + '">',
      '  <span class="cmt-wh-grip" title="' + _esc(_t('wh_drag_reorder', 'Drag to reorder')) + '">' + _icon('grip') + '</span>',
      '  <span class="cmt-wh-idx">' + (idx + 1) + '</span>',
      '  <div class="cmt-wh-row-main">',
      '    <div class="cmt-wh-row-title">' + _esc(w.title || w.pageFile) + '</div>',
      '    <div class="cmt-wh-row-meta">' + _esc(w.pageFile) + (dims ? ' · ' + dims : '') + (w.isCurrent ? ' · ' + _esc(_t('wh_current', 'Current')) : '') + '</div>',
      '  </div>',
      '  <div class="cmt-wh-row-btns">',
      multiDisplay && nextDisplayId !== null
        ? '    <button type="button" class="cmt-wh-btn" data-wh-act="move-display" data-wh-id="' + w.id + '" data-wh-display="' + nextDisplayId + '" title="' + _esc(_t('wh_move_display', 'Move to next display')) + '">' + _icon('monitor') + '<span>' + _esc(dispLabel) + '</span></button>'
        : '    <span class="cmt-wh-pill count">' + _esc(dispLabel) + '</span>',
      '    <button type="button" class="cmt-wh-btn icon-only" data-wh-act="snap-left" data-wh-id="' + w.id + '" title="' + _esc(_t('wh_snap_left', 'Snap left') + pctTag) + '">' + _icon('align-left') + '</button>',
      '    <button type="button" class="cmt-wh-btn icon-only" data-wh-act="snap-right" data-wh-id="' + w.id + '" title="' + _esc(_t('wh_snap_right', 'Snap right') + pctTag) + '">' + _icon('align-right') + '</button>',
      '    <button type="button" class="cmt-wh-btn icon-only" data-wh-act="focus" data-wh-id="' + w.id + '" title="' + _esc(_t('wh_focus', 'Focus')) + '">' + _icon('eye') + '</button>',
      '    <button type="button" class="cmt-wh-btn icon-only' + (w.isAlwaysOnTop ? ' active' : '') + '" data-wh-act="toggle-pin" data-wh-id="' + w.id + '" title="' + _esc(_t('wh_pin', 'Always on top')) + '">' + _icon('pin') + '</button>',
      '    <button type="button" class="cmt-wh-btn icon-only' + (w.isMaximized ? ' active' : '') + '" data-wh-act="maximize" data-wh-id="' + w.id + '" title="' + _esc(_t('wh_maximize', 'Maximize')) + '">' + _icon('maximize') + '</button>',
      '    <div class="cmt-wh-more-wrap">',
      '      <button type="button" class="cmt-wh-btn icon-only' + (isMoreOpen ? ' active' : '') + '" data-wh-more="' + w.id + '" title="' + _esc(_t('wh_more_actions', 'More actions')) + '">' + _icon('dots') + '</button>',
      isMoreOpen ? [
        '      <div class="cmt-wh-more-menu">',
        '        <button type="button" class="cmt-wh-more-item" data-wh-act="snap-top" data-wh-id="' + w.id + '">' + _icon('align-top') + '<span>' + _esc(_t('wh_snap_top', 'Snap top') + pctTag) + '</span></button>',
        '        <button type="button" class="cmt-wh-more-item" data-wh-act="snap-bottom" data-wh-id="' + w.id + '">' + _icon('align-bottom') + '<span>' + _esc(_t('wh_snap_bottom', 'Snap bottom') + pctTag) + '</span></button>',
        '        <button type="button" class="cmt-wh-more-item" data-wh-act="center" data-wh-id="' + w.id + '">' + _icon('align-center-h') + '<span>' + _esc(_t('wh_snap_center', 'Center')) + '</span></button>',
        '        <button type="button" class="cmt-wh-more-item" data-wh-act="minimize" data-wh-id="' + w.id + '">' + _icon('minimize') + '<span>' + _esc(_t('wh_minimize', 'Minimize')) + '</span></button>',
        '      </div>'
      ].join('') : '',
      '    </div>',
      (role === 'mirror' || total > 1)
        ? '    <button type="button" class="cmt-wh-btn icon-only danger" data-wh-act="close" data-wh-id="' + w.id + '" title="' + _esc(_t('wh_close_window', 'Close')) + '">' + _icon('close') + '</button>'
        : '',
      '  </div>',
      '</div>'
    ].join('');
  }

  function _renderSnapBar() {
    var ratios = [25, 33, 50, 67, 75, 80];
    var anyPinned = (_state.windows || []).some(function (w) { return !!w.isAlwaysOnTop; });
    var hasMultiple = (_state.windows || []).length > 1;
    return [
      '<div class="cmt-wh-snapbar">',
      '  <div class="cmt-wh-snapbar-group">',
      '    <span class="cmt-wh-lbl">' + _esc(_t('wh_snap_ratio', 'Snap %')) + '</span>',
      '    <select class="cmt-wh-select" id="cmt-wh-snap-select" title="' + _esc(_t('wh_snap_ratio', 'Snap %')) + '">',
      ratios.map(function (r) {
        return '<option value="' + r + '"' + (_snapRatio === r ? ' selected' : '') + '>' + r + '%</option>';
      }).join(''),
      '    </select>',
      '  </div>',
      '  <div class="cmt-wh-snapbar-group">',
      hasMultiple ? '    <button type="button" class="cmt-wh-pill-btn" data-wh-act="minimize-others">' + _esc(_t('wh_minimize_others', 'Minimize Others')) + '</button>' : '',
      anyPinned ? '    <button type="button" class="cmt-wh-pill-btn" data-wh-act="unpin-all">' + _esc(_t('wh_unpin_all', 'Unpin All')) + '</button>' : '',
      '  </div>',
      '</div>'
    ].join('');
  }

  function _renderLayoutBar(role, count) {
    if (count === 0) return '';
    var displays = _state.displays || [];
    var dispSelect = '';
    if (displays.length > 1) {
      dispSelect = '<select class="cmt-wh-select" id="cmt-wh-layout-display" title="' + _esc(_t('wh_target_display', 'Target display')) + '">' +
        '<option value=""' + (_layoutDisplayId === null ? ' selected' : '') + '>' + _esc(_t('wh_display_auto', 'Auto')) + '</option>' +
        displays.map(function (d, i) {
          return '<option value="' + d.id + '"' + (_layoutDisplayId === d.id ? ' selected' : '') + '>' + _esc(_t('wh_display_n', 'D{n}').replace('{n}', String(i + 1))) + '</option>';
        }).join('') +
        '</select>';
    }
    var splitOptions = [
      { id: 'horizontal', label: _t('wh_layout_split', '50 / 50') },
      { id: 'split-30-70', label: '30 / 70' },
      { id: 'split-70-30', label: '70 / 30' },
      { id: 'split-20-80', label: _t('wh_layout_20_80', '20 / 80') },
      { id: 'split-80-20', label: _t('wh_layout_80_20', '80 / 20') },
      { id: 'split-25-75', label: '25 / 75' },
      { id: 'split-75-25', label: '75 / 25' }
    ];
    return [
      '<div class="cmt-wh-bar">',
      '  <div class="cmt-wh-split-group">',
      '    <button type="button" class="cmt-wh-btn primary" data-wh-layout="' + _esc(count >= 2 ? _splitLayout : 'horizontal') + '" data-wh-role="' + role + '">' + _icon('split') + '<span>' + _esc(_t('wh_layout_split_btn', 'Split')) + '</span></button>',
      count >= 2 ? (
        '<select class="cmt-wh-select" id="cmt-wh-split-select">' +
        splitOptions.map(function (opt) {
          return '<option value="' + opt.id + '"' + (_splitLayout === opt.id ? ' selected' : '') + '>' + _esc(opt.label) + '</option>';
        }).join('') +
        '</select>'
      ) : '',
      '  </div>',
      count >= 2 ? '  <button type="button" class="cmt-wh-btn" data-wh-layout="main-stack" data-wh-role="' + role + '">' + _esc(_t('wh_layout_main_stack', 'Main + Stack')) + '</button>' : '',
      '  <button type="button" class="cmt-wh-btn" data-wh-layout="grid" data-wh-role="' + role + '">' + _icon('grid') + '<span>' + _esc(_t('wh_layout_grid', 'Grid')) + '</span></button>',
      '  <button type="button" class="cmt-wh-btn" data-wh-layout="vertical" data-wh-role="' + role + '">' + _icon('layout') + '<span>' + _esc(_t('wh_layout_stack', 'Stack')) + '</span></button>',
      count >= 2 ? '  <button type="button" class="cmt-wh-btn" data-wh-layout="cascade" data-wh-role="' + role + '">' + _esc(_t('wh_layout_cascade', 'Cascade')) + '</button>' : '',
      '  <span class="cmt-wh-lbl" style="margin-left:auto">' + _esc(_t('wh_gap', 'Gap')) + '</span>',
      '  <select class="cmt-wh-select" id="cmt-wh-layout-gap">',
      '    <option value="0"' + (_layoutGap === 0 ? ' selected' : '') + '>0px</option>',
      '    <option value="8"' + (_layoutGap === 8 ? ' selected' : '') + '>8px</option>',
      '    <option value="16"' + (_layoutGap === 16 ? ' selected' : '') + '>16px</option>',
      '  </select>',
      dispSelect,
      '</div>'
    ].join('');
  }

  function _render() {
    if (!_modal) return;
    var body = _modal.querySelector('.cmt-wh-body');
    if (!body) return;

    var isElectron = !!(window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron());
    if (!isElectron) {
      body.innerHTML = '<div class="cmt-wh-section"><div class="cmt-wh-empty">' + _esc(_t('wh_web_fallback', 'Multi-window arrangement is available in the Electron desktop app.')) + '</div></div>';
      return;
    }

    var multiDisplay = (_state.displays || []).length > 1;
    var mainWins = _orderedWindows('main');
    var mirrorWins = _orderedWindows('mirror');

    var html = [];

    // Section 1: Main View
    html.push('<div class="cmt-wh-section">');
    html.push('  <div class="cmt-wh-sec-head">');
    html.push('    <div class="cmt-wh-sec-title"><span class="cmt-wh-pill">' + _esc(_t('wh_main_view', 'Main View')) + '</span><span class="cmt-wh-pill count">' + mainWins.length + '</span></div>');
    html.push('  </div>');
    if (mainWins.length === 0) {
      html.push('  <div class="cmt-wh-empty">' + _esc(_t('wh_no_windows', 'No open windows found.')) + '</div>');
    } else {
      html.push(_renderSnapBar());
      html.push('  <div class="cmt-wh-list">' + mainWins.map(function (w, i) { return _renderWindowRow(w, i, mainWins.length, 'main', multiDisplay); }).join('') + '</div>');
      html.push(_renderLayoutBar('main', mainWins.length));
    }
    html.push('</div>');

    // Section 2: Mirrored / Presentation View (only when existing)
    if (mirrorWins.length > 0) {
      var firstMirror = mirrorWins[0];
      var pairId = firstMirror.sourceWindowId || (mainWins[0] ? mainWins[0].id : null);
      html.push('<div class="cmt-wh-section">');
      html.push('  <div class="cmt-wh-sec-head">');
      html.push('    <div class="cmt-wh-sec-title"><span class="cmt-wh-pill mirror">' + _esc(_t('wh_mirror_view', 'Mirrored View')) + '</span><span class="cmt-wh-pill count">' + mirrorWins.length + '</span></div>');
      if (pairId) {
        html.push('    <button type="button" class="cmt-wh-btn accent" data-wh-act="swap-pair" data-wh-id="' + firstMirror.id + '" data-wh-pair="' + pairId + '">' + _icon('swap') + '<span>' + _esc(_t('wh_swap_main_mirror', 'Swap Main & Mirror')) + '</span></button>');
      }
      html.push('  </div>');
      html.push('  <div class="cmt-wh-list">' + mirrorWins.map(function (w, i) { return _renderWindowRow(w, i, mirrorWins.length, 'mirror', multiDisplay); }).join('') + '</div>');
      html.push(_renderLayoutBar('mirror', mirrorWins.length));
      html.push('</div>');
    }

    // Section 3: Persisted Custom Presets
    html.push('<div class="cmt-wh-section">');
    html.push('  <div class="cmt-wh-sec-head">');
    html.push('    <div class="cmt-wh-sec-title"><span>' + _esc(_t('wh_custom_presets', 'Custom Presets')) + '</span><span class="cmt-wh-pill count">' + _presets.length + '</span></div>');
    html.push('    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">');
    html.push('      <label class="cmt-wh-check"><input type="checkbox" id="cmt-wh-open-missing"' + (_openMissing ? ' checked' : '') + ' /><span>' + _esc(_t('wh_open_missing', 'Open missing apps')) + '</span></label>');
    html.push('      <button type="button" class="cmt-wh-btn primary" data-wh-preset-act="toggle-form">' + _esc(_t('wh_save_preset', 'Save Current Layout')) + '</button>');
    html.push('    </div>');
    html.push('  </div>');

    if (_showPresetForm) {
      html.push('  <div class="cmt-wh-preset-form">');
      html.push('    <input type="text" class="cmt-wh-input" id="cmt-wh-preset-name" placeholder="' + _esc(_t('wh_preset_name_prompt', 'Preset name (e.g. Board + Class Mgmt)...')) + '" />');
      html.push('    <button type="button" class="cmt-wh-btn primary" data-wh-preset-act="confirm-save">' + _esc(_t('wh_save', 'Save')) + '</button>');
      html.push('    <button type="button" class="cmt-wh-btn" data-wh-preset-act="cancel-save">' + _esc(_t('wh_cancel', 'Cancel')) + '</button>');
      html.push('  </div>');
    }

    if (_presets.length === 0) {
      html.push('  <div class="cmt-wh-empty">' + _esc(_t('wh_no_presets', 'No saved presets yet. Arrange your windows and click Save Current Layout.')) + '</div>');
    } else {
      html.push('  <div class="cmt-wh-list">');
      var sortedPresets = _presets.slice().sort(function (a, b) {
        return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      });
      sortedPresets.forEach(function (p) {
        var chips = (p.slots || []).map(function (sl) {
          var label = (sl.title || sl.pageFile || '').replace(/\s*[–-]\s*Presentation.*$/i, '');
          var u = sl.unit === '%' ? '%' : '';
          var dims = sl.snap === 'full'
            ? _t('wh_maximize', 'Maximize')
            : (sl.bounds ? (sl.bounds.width + u + 'x' + sl.bounds.height + u) : '');
          var dTag = 'D' + ((typeof sl.displayIndex === 'number' ? sl.displayIndex : 0) + 1);
          return '<span class="cmt-wh-chip' + (sl.role === 'mirror' ? ' is-mirror' : '') + '">' + _esc(label) + (sl.role === 'mirror' ? ' [M]' : '') + (dims ? ' · ' + _esc(dims) : '') + ' · ' + dTag + '</span>';
        }).join('');
        html.push('    <div class="cmt-wh-preset-row">');
        html.push('      <div class="cmt-wh-preset-info">');
        html.push('        <div class="cmt-wh-preset-name">' + _esc(p.name) + '</div>');
        html.push('        <div class="cmt-wh-preset-chips">' + chips + '</div>');
        html.push('      </div>');
        html.push('      <div class="cmt-wh-row-btns">');
        html.push('        <button type="button" class="cmt-wh-btn primary" data-wh-preset-act="apply" data-wh-preset-id="' + _esc(p.id) + '">' + _esc(_t('wh_apply_preset', 'Apply')) + '</button>');
        html.push('        <button type="button" class="cmt-wh-btn icon-only' + (p.pinned ? ' active' : '') + '" data-wh-preset-act="toggle-preset-pin" data-wh-preset-id="' + _esc(p.id) + '" title="' + _esc(_t('wh_pin', 'Always on top')) + '">' + _icon('pin') + '</button>');
        html.push('        <button type="button" class="cmt-wh-btn icon-only danger" data-wh-preset-act="delete" data-wh-preset-id="' + _esc(p.id) + '" title="' + _esc(_t('wh_delete_preset', 'Delete')) + '">' + _icon('close') + '</button>');
        html.push('      </div>');
        html.push('    </div>');
      });
      html.push('  </div>');
    }
    html.push('</div>');

    body.innerHTML = html.join('');
    if (_showPresetForm) {
      var inp = document.getElementById('cmt-wh-preset-name');
      if (inp) inp.focus();
    }
  }

  async function _refreshState() {
    if (window.Desktop && typeof window.Desktop.getWindowsState === 'function') {
      var res = await window.Desktop.getWindowsState();
      if (res && res.ok) {
        _state = { displays: res.displays || [], windows: res.windows || [] };
        _syncOrdersFromState();
      }
    }
    _render();
  }

  function _ensureDom() {
    if (_backdrop) return;
    _injectStyles();
    _backdrop = document.createElement('div');
    _backdrop.id = 'cmt-wh-backdrop';
    _backdrop.className = 'cmt-wh-backdrop';
    _backdrop.setAttribute('role', 'dialog');
    _backdrop.setAttribute('aria-modal', 'true');
    _backdrop.setAttribute('aria-label', _t('wh_title', 'Window Reorder Helper'));

    _backdrop.innerHTML = [
      '<div class="cmt-wh-modal">',
      '  <div class="cmt-wh-head">',
      '    <div class="cmt-wh-title-wrap">' + _icon('layout') + '<h2 class="cmt-wh-title">' + _esc(_t('wh_title', 'Window Reorder Helper')) + '</h2></div>',
      '    <div class="cmt-wh-head-actions">',
      '      <button type="button" class="cmt-wh-btn icon-only" data-wh-head-act="refresh" title="' + _esc(_t('wh_refresh', 'Refresh')) + '">' + _icon('refresh') + '</button>',
      '      <button type="button" class="cmt-wh-btn icon-only" data-wh-head-act="close" title="' + _esc(_t('wh_close', 'Close')) + '">' + _icon('close') + '</button>',
      '    </div>',
      '  </div>',
      '  <div class="cmt-wh-body"></div>',
      '  <div class="cmt-wh-foot">',
      '    <span>' + _esc(_t('wh_hint', 'Drag rows to set order, then pick a layout or save a preset.')) + '</span>',
      '    <span>Ctrl+Shift+W</span>',
      '  </div>',
      '</div>'
    ].join('');

    _modal = _backdrop.querySelector('.cmt-wh-modal');
    document.body.appendChild(_backdrop);

    _backdrop.addEventListener('click', function (e) {
      if (e.target === _backdrop) close();
    });

    _modal.addEventListener('click', async function (e) {
      var moreBtn = e.target.closest('[data-wh-more]');
      if (moreBtn) {
        var mId = Number(moreBtn.getAttribute('data-wh-more'));
        _openMoreId = _openMoreId === mId ? null : mId;
        _render();
        return;
      }

      if (_openMoreId !== null && !e.target.closest('.cmt-wh-more-menu')) {
        _openMoreId = null;
        if (!e.target.closest('[data-wh-act]')) _render();
      }

      var headBtn = e.target.closest('[data-wh-head-act]');
      if (headBtn) {
        var ha = headBtn.getAttribute('data-wh-head-act');
        if (ha === 'close') close();
        else if (ha === 'refresh') await _refreshState();
        return;
      }

      var layoutBtn = e.target.closest('[data-wh-layout]');
      if (layoutBtn) {
        var layout = layoutBtn.getAttribute('data-wh-layout');
        var role = layoutBtn.getAttribute('data-wh-role');
        var wins = _orderedWindows(role);
        if (wins.length > 0 && window.Desktop && typeof window.Desktop.reorderWindows === 'function') {
          await window.Desktop.reorderWindows({
            scope: role,
            displayId: _layoutDisplayId !== null ? _layoutDisplayId : wins[0].displayId,
            orderedIds: wins.map(function (w) { return w.id; }),
            layout: layout,
            gap: _layoutGap
          });
          await _refreshState();
        }
        return;
      }

      var actBtn = e.target.closest('[data-wh-act]');
      if (actBtn) {
        var act = actBtn.getAttribute('data-wh-act');
        var winId = Number(actBtn.getAttribute('data-wh-id'));
        _openMoreId = null;
        if (window.Desktop && typeof window.Desktop.windowAction === 'function') {
          var req = { windowId: winId, action: act };
          if (act === 'snap-left' || act === 'snap-right' || act === 'snap-top' || act === 'snap-bottom') {
            req.ratio = _snapRatio;
          } else if (act === 'move-display') {
            req.action = 'move-to-display';
            req.targetDisplayId = Number(actBtn.getAttribute('data-wh-display'));
          } else if (act === 'swap-pair') {
            req.pairWindowId = Number(actBtn.getAttribute('data-wh-pair'));
          }
          await window.Desktop.windowAction(req);
          await _refreshState();
        }
        return;
      }

      var pBtn = e.target.closest('[data-wh-preset-act]');
      if (pBtn) {
        var pa = pBtn.getAttribute('data-wh-preset-act');
        if (pa === 'toggle-form') {
          _showPresetForm = !_showPresetForm;
          _render();
        } else if (pa === 'toggle-preset-pin') {
          var ppId = pBtn.getAttribute('data-wh-preset-id');
          var pp = _presets.find(function (p) { return p.id === ppId; });
          if (pp) {
            pp.pinned = !pp.pinned;
            await _savePresets();
            _render();
          }
        } else if (pa === 'cancel-save') {
          _showPresetForm = false;
          _render();
        } else if (pa === 'confirm-save') {
          var inp = document.getElementById('cmt-wh-preset-name');
          if (inp && _capturePreset(inp.value)) {
            await _savePresets();
            _showPresetForm = false;
            _render();
          }
        } else if (pa === 'apply') {
          var pid = pBtn.getAttribute('data-wh-preset-id');
          var preset = _presets.find(function (p) { return p.id === pid; });
          if (preset && window.Desktop && typeof window.Desktop.applyWindowPreset === 'function') {
            await window.Desktop.applyWindowPreset({ slots: preset.slots || [], openMissing: _openMissing });
            await _refreshState();
          }
        } else if (pa === 'delete') {
          var delId = pBtn.getAttribute('data-wh-preset-id');
          _presets = _presets.filter(function (p) { return p.id !== delId; });
          await _savePresets();
          _render();
        }
      }
    });

    _modal.addEventListener('change', function (e) {
      if (!e.target) return;
      if (e.target.id === 'cmt-wh-open-missing') {
        _openMissing = !!e.target.checked;
      } else if (e.target.id === 'cmt-wh-snap-select') {
        _snapRatio = Math.max(10, Math.min(95, Number(e.target.value) || 50));
        _render();
      } else if (e.target.id === 'cmt-wh-split-select') {
        _splitLayout = e.target.value || 'horizontal';
        _render();
      } else if (e.target.id === 'cmt-wh-layout-gap') {
        _layoutGap = Math.max(0, Math.min(48, Number(e.target.value) || 0));
      } else if (e.target.id === 'cmt-wh-layout-display') {
        _layoutDisplayId = e.target.value ? Number(e.target.value) : null;
      }
    });

    _modal.addEventListener('keydown', async function (e) {
      if (e.target && e.target.id === 'cmt-wh-preset-name' && e.key === 'Enter') {
        e.preventDefault();
        if (_capturePreset(e.target.value)) {
          await _savePresets();
          _showPresetForm = false;
          _render();
        }
      }
    });

    // Delegated HTML5 drag-and-drop for window rows
    _modal.addEventListener('dragstart', function (e) {
      var row = e.target.closest('.cmt-wh-row[data-wh-id]');
      if (!row) return;
      _dragInfo = {
        id: Number(row.getAttribute('data-wh-id')),
        role: row.getAttribute('data-wh-role')
      };
      row.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(_dragInfo.id));
      }
    });

    _modal.addEventListener('dragover', function (e) {
      if (!_dragInfo) return;
      var row = e.target.closest('.cmt-wh-row[data-wh-id]');
      if (!row || row.getAttribute('data-wh-role') !== _dragInfo.role) return;
      e.preventDefault();
      _modal.querySelectorAll('.cmt-wh-row.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
      row.classList.add('drag-over');
    });

    _modal.addEventListener('drop', function (e) {
      if (!_dragInfo) return;
      var row = e.target.closest('.cmt-wh-row[data-wh-id]');
      if (!row || row.getAttribute('data-wh-role') !== _dragInfo.role) return;
      e.preventDefault();
      var dstId = Number(row.getAttribute('data-wh-id'));
      _reorderToTarget(_dragInfo.role, _dragInfo.id, dstId);
      _dragInfo = null;
    });

    _modal.addEventListener('dragend', function () {
      _dragInfo = null;
      _modal.querySelectorAll('.cmt-wh-row.dragging,.cmt-wh-row.drag-over').forEach(function (el) {
        el.classList.remove('dragging', 'drag-over');
      });
    });
  }

  async function open() {
    if (_isPresMode) return;
    _ensureDom();
    if (window.CmtModal && typeof window.CmtModal.open === 'function') {
      window.CmtModal.open(_backdrop, {
        onClose: function () {
          _showPresetForm = false;
          _openMoreId = null;
          if (_unsubWindows) {
            try { _unsubWindows(); } catch (_) {}
            _unsubWindows = null;
          }
        }
      });
    } else {
      _backdrop.classList.add('open');
    }
    await _loadPresets();
    await _refreshState();
    if (!_unsubWindows && window.Desktop && typeof window.Desktop.onWindowsChanged === 'function') {
      _unsubWindows = window.Desktop.onWindowsChanged(function (snapshot) {
        if (!_backdrop || !_backdrop.classList.contains('open')) return;
        if (snapshot && Array.isArray(snapshot.windows)) {
          _state = { displays: snapshot.displays || [], windows: snapshot.windows || [] };
          _syncOrdersFromState();
          _render();
        }
      });
    }
  }

  function close() {
    if (window.CmtModal && typeof window.CmtModal.close === 'function' && _backdrop) {
      window.CmtModal.close(_backdrop);
      return;
    }
    if (_backdrop) _backdrop.classList.remove('open');
    _showPresetForm = false;
    _openMoreId = null;
    if (_unsubWindows) {
      try { _unsubWindows(); } catch (_) {}
      _unsubWindows = null;
    }
  }

  function toggle() {
    if (_backdrop && _backdrop.classList.contains('open')) close();
    else open();
  }

  if (!_isPresMode && typeof document !== 'undefined') {
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && String(e.key || '').toLowerCase() === 'w') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && _backdrop && _backdrop.classList.contains('open')) {
        e.preventDefault();
        if (_openMoreId !== null) {
          _openMoreId = null;
          _render();
        } else {
          close();
        }
      }
    });
    window.addEventListener('beforeunload', function () {
      if (_unsubWindows) {
        try { _unsubWindows(); } catch (_) {}
        _unsubWindows = null;
      }
    });
  }

  window.WindowHelper = Object.freeze({
    open: open,
    close: close,
    toggle: toggle,
    loadPresets: _loadPresets,
    applyPreset: applyPreset
  });
})();
