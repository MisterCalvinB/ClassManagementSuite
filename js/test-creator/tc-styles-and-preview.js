'use strict';

// Test Creator — Resizers, Exercise Styles, Live Print Preview & Export
// Resizer Handle Logic
function setupResizer() {
  var handle = document.getElementById('drawerResizer');
  var drawer = document.getElementById('testDrawer');
  if (!handle || !drawer) return;
  var isDragging = false;

  handle.addEventListener('mousedown', function (e) {
    isDragging = true;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    var newWidth = window.innerWidth - e.clientX - 20;
    if (newWidth >= 300 && newWidth <= 750) {
      drawer.style.width = newWidth + 'px';
    }
  });

  window.addEventListener('mouseup', function () {
    if (isDragging) {
      isDragging = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// Main Center Split Resizer (Blocks Deck vs Live Preview)
function initMainSplitResizer() {
  var resizer = document.getElementById('mainSplitResizer');
  var blocksCol = document.getElementById('tcBlocksColumn');
  var previewCol = document.getElementById('tcPreviewColumn');
  var workspace = document.querySelector('.main-workspace');
  if (!resizer || !blocksCol || !previewCol || !workspace) return;

  var isDragging = false;

  // Restore saved ratio if available
  try {
    var savedRatio = localStorage.getItem('cmt_tc_split_ratio');
    if (savedRatio) {
      var r = parseFloat(savedRatio);
      if (r >= 0.25 && r <= 0.75) {
        blocksCol.style.flex = '0 0 ' + (r * 100) + '%';
        previewCol.style.flex = '1 1 auto';
      }
    }
    var savedZoom = localStorage.getItem('cmt_tc_preview_zoom');
    if (savedZoom && typeof tcSetPreviewZoom === 'function') {
      tcSetPreviewZoom(savedZoom);
    }
  } catch (_) {}

  resizer.addEventListener('mousedown', function (e) {
    isDragging = true;
    resizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    var rect = workspace.getBoundingClientRect();
    var offset = e.clientX - rect.left;
    var totalW = rect.width;
    if (totalW > 100) {
      var ratio = Math.max(0.25, Math.min(0.75, offset / totalW));
      blocksCol.style.flex = '0 0 ' + (ratio * 100) + '%';
      previewCol.style.flex = '1 1 auto';
      try { localStorage.setItem('cmt_tc_split_ratio', ratio.toFixed(3)); } catch (_) {}
    }
  });

  window.addEventListener('mouseup', function () {
    if (isDragging) {
      isDragging = false;
      resizer.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (typeof tcScheduleLivePreviewUpdate === 'function') {
        tcScheduleLivePreviewUpdate(150);
      }
    }
  });
}

// ── Style Customisation Controller Functions ─────────────────────────
var currentEditingExStyleId = null;

window.tcEnsurePdfjsLib = async function () {
  if (!window._tcPdfjsLib) {
    var mod = await import(new URL('../modules/pdf.min.mjs', location.href).href);
    mod.GlobalWorkerOptions.workerSrc = new URL('../modules/pdf.worker.min.mjs', location.href).href;
    window._tcPdfjsLib = mod;
  }
  return window._tcPdfjsLib;
};

window.tcHighlightMarginPresetBtn = function (preset) {
  ['normal', 'narrow', 'wide'].forEach(function (p) {
    var btn = document.getElementById('marginPreset' + p.charAt(0).toUpperCase() + p.slice(1));
    if (btn) {
      if (p === preset) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
};

window.tcSetMarginPreset = function (preset) {
  if (!TestCreatorService.MARGIN_PRESETS[preset]) return;
  var p = TestCreatorService.MARGIN_PRESETS[preset];
  if (!currentTest.exportStyle) currentTest.exportStyle = {};
  currentTest.exportStyle.margins = {
    preset: preset,
    top: p.top,
    right: p.right,
    bottom: p.bottom,
    left: p.left,
    unit: p.unit || 'mm'
  };
  var tIn = document.getElementById('globalMarginTop');
  var rIn = document.getElementById('globalMarginRight');
  var bIn = document.getElementById('globalMarginBottom');
  var lIn = document.getElementById('globalMarginLeft');
  if (tIn) tIn.value = p.top;
  if (rIn) rIn.value = p.right;
  if (bIn) bIn.value = p.bottom;
  if (lIn) lIn.value = p.left;

  tcHighlightMarginPresetBtn(preset);

  var prevSel = document.getElementById('previewMarginsSelect');
  if (prevSel) prevSel.value = preset;

  tcSaveCurrentTest(false);
  if (document.getElementById('printPreviewModal') && document.getElementById('printPreviewModal').classList.contains('open')) {
    tcUpdatePrintPreview();
  }
};

window.tcOnMarginInputChange = function () {
  if (!currentTest.exportStyle) currentTest.exportStyle = {};
  var t = parseFloat(document.getElementById('globalMarginTop').value) || 0;
  var r = parseFloat(document.getElementById('globalMarginRight').value) || 0;
  var b = parseFloat(document.getElementById('globalMarginBottom').value) || 0;
  var l = parseFloat(document.getElementById('globalMarginLeft').value) || 0;

  var detectedPreset = 'custom';
  ['normal', 'narrow', 'wide'].forEach(function (key) {
    var p = TestCreatorService.MARGIN_PRESETS[key];
    if (p && p.top === t && p.right === r && p.bottom === b && p.left === l) {
      detectedPreset = key;
    }
  });

  currentTest.exportStyle.margins = {
    preset: detectedPreset,
    top: t,
    right: r,
    bottom: b,
    left: l,
    unit: 'mm'
  };

  tcHighlightMarginPresetBtn(detectedPreset);

  var prevSel = document.getElementById('previewMarginsSelect');
  if (prevSel) prevSel.value = detectedPreset;

  tcSaveCurrentTest(false);
  if (document.getElementById('printPreviewModal') && document.getElementById('printPreviewModal').classList.contains('open')) {
    tcUpdatePrintPreview();
  }
};

window.tcOnPreviewMarginsChange = function (val) {
  if (val === 'custom') {
    tcOpenGlobalStyleModal();
    return;
  }
  tcSetMarginPreset(val);
};

window.tcRenderSampleLinesHtml = function (cfg) {
  var format = cfg.format || 'decimal';
  var size = cfg.size || '8pt';
  var color = cfg.color || '#64748b';
  var distance = cfg.distance || '8px';
  var weight = cfg.weight || '700';
  var italic = !!cfg.italic;
  var interval = Number(cfg.interval) || 1;
  var startAt = Number(cfg.startAt) || 1;

  var html = [];
  for (var i = 0; i < 3; i++) {
    var num = startAt + i;
    var isVis = (interval <= 1) || (num % interval === 0);
    var numTxt = isVis ? (window.TestCreatorService ? TestCreatorService.formatLineNumber(num, format) : String(num)) : '';
    html.push('<div class="line-num-preview-row" style="gap:' + distance + ';">' +
      '<span class="line-num-preview-indicator" style="font-size:' + size + ';color:' + color + ';font-weight:' + weight + ';font-style:' + (italic ? 'italic' : 'normal') + ';min-width:22px;text-align:right;' + (isVis ? '' : 'visibility:hidden;') + '">' + (numTxt || '&nbsp;') + '</span>' +
      '<div class="line-num-preview-stroke"></div>' +
      '</div>');
  }
  return html.join('');
};

window.tcUpdateGlobalLineSamplePreview = function () {
  var box = document.getElementById('globalLineSamplePreview');
  if (!box) return;
  var cfg = {
    format: document.getElementById('globalStyleNumFormat') ? document.getElementById('globalStyleNumFormat').value : 'decimal',
    size: document.getElementById('globalStyleNumSize') ? document.getElementById('globalStyleNumSize').value : '8pt',
    color: document.getElementById('globalStyleNumColor') ? document.getElementById('globalStyleNumColor').value : '#64748b',
    distance: document.getElementById('globalStyleNumDistance') ? document.getElementById('globalStyleNumDistance').value : '8px',
    weight: (document.getElementById('globalStyleNumBold') && document.getElementById('globalStyleNumBold').checked) ? '700' : '400',
    italic: document.getElementById('globalStyleNumItalic') ? document.getElementById('globalStyleNumItalic').checked : false,
    interval: document.getElementById('globalStyleNumInterval') ? Number(document.getElementById('globalStyleNumInterval').value) : 1,
    startAt: 1
  };
  box.innerHTML = tcRenderSampleLinesHtml(cfg);
};

window.tcToggleGlobalLineNumberingFields = function () {
  var chk = document.getElementById('globalStyleNumberedLines');
  var f = document.getElementById('globalLineNumberingOptions');
  if (f) f.style.display = (chk && chk.checked) ? 'flex' : 'none';
  if (chk && chk.checked) tcUpdateGlobalLineSamplePreview();
};

function tcMapLegacyFontSize(fs) {
  if (!fs) return '11pt';
  var n = parseFloat(fs);
  if (isNaN(n)) return '11pt';
  if (n <= 10) return '10pt';
  if (n >= 12.5) return '13pt';
  return '11pt';
}

function tcMapLegacyDensity(lh, pad) {
  var n = Number(lh);
  if (!isNaN(n) && n > 0) {
    if (n <= 1.35) return 'compact';
    if (n >= 1.7) return 'relaxed';
    return 'standard';
  }
  if (pad === '8px') return 'compact';
  if (pad === '18px' || pad === '24px') return 'relaxed';
  return 'standard';
}

window.tcOpenGlobalStyleModal = function () {
  currentTest.exportStyle = TestCreatorService.ensureExportStyle(currentTest);
  var st = currentTest.exportStyle;
  var tSel = document.getElementById('globalStyleTheme');
  var fSel = document.getElementById('globalStyleFontSize');
  var dSel = document.getElementById('globalStyleDensity');
  var bChk = document.getElementById('globalStyleShowBorders');
  var pChk = document.getElementById('globalStyleShowExPrefix');
  var nChk = document.getElementById('globalStyleNumberedLines');

  if (tSel) tSel.value = tcNormalizeThemeId(st.theme || currentTest.stylesheetTheme || (window.ExportStylesService && ExportStylesService.getSelectedStyle('testCreator')) || localStorage.getItem('cmt_default_test_theme') || 'export-light-neobrutalist.css');
  if (fSel) fSel.value = tcMapLegacyFontSize(st.fontSize || '11pt');
  if (dSel) dSel.value = st.density || tcMapLegacyDensity(st.lineHeight, st.padding);
  if (bChk) bChk.checked = (st.showBorders !== false);
  if (pChk) pChk.checked = (st.showExercisePrefix !== false);
  if (nChk) nChk.checked = !!st.numberedLines;

  var mg = st.margins || { preset: 'normal', top: 15, right: 15, bottom: 15, left: 15, unit: 'mm' };
  tcHighlightMarginPresetBtn(mg.preset || 'normal');
  if (typeof tcRenderStyleBorderList === 'function') tcRenderStyleBorderList();

  document.getElementById('styleCustomisationModal').classList.add('open');
};

window.tcCloseGlobalStyleModal = function () {
  document.getElementById('styleCustomisationModal').classList.remove('open');
  renderExerciseCards();
  tcScheduleLivePreviewUpdate();
};

window.tcOnGlobalStyleChange = function () {
  if (!currentTest.exportStyle) currentTest.exportStyle = {};
  var tSel = document.getElementById('globalStyleTheme');
  if (tSel) {
    var thm = tcNormalizeThemeId(tSel.value);
    currentTest.exportStyle.theme = thm;
    currentTest.stylesheetTheme = thm;
    try { localStorage.setItem('cmt_default_test_theme', thm); } catch (_) {}
    if (window.ExportStylesService) {
      ExportStylesService.setSelectedStyle('testCreator', thm);
    }
    var pThm = document.getElementById('previewThemeSelect');
    if (pThm && pThm.value !== thm) pThm.value = thm;
    var eThm = document.getElementById('exportThemeSelect');
    if (eThm && eThm.value !== thm) eThm.value = thm;
  }
  var fSel = document.getElementById('globalStyleFontSize');
  var dSel = document.getElementById('globalStyleDensity');
  var bChk = document.getElementById('globalStyleShowBorders');
  var pChk = document.getElementById('globalStyleShowExPrefix');
  var nChk = document.getElementById('globalStyleNumberedLines');
  if (fSel) currentTest.exportStyle.fontSize = fSel.value;
  var density = dSel ? dSel.value : 'standard';
  currentTest.exportStyle.density = density;
  if (density === 'compact') {
    currentTest.exportStyle.lineHeight = 1.3;
    currentTest.exportStyle.padding = '10px';
  } else if (density === 'relaxed') {
    currentTest.exportStyle.lineHeight = 1.8;
    currentTest.exportStyle.padding = '18px';
  } else {
    currentTest.exportStyle.lineHeight = 1.5;
    currentTest.exportStyle.padding = '14px';
  }
  if (bChk) currentTest.exportStyle.showBorders = bChk.checked;
  if (pChk) currentTest.exportStyle.showExercisePrefix = pChk.checked;
  if (nChk) currentTest.exportStyle.numberedLines = nChk.checked;
  tcSaveCurrentTest(false);
  if (typeof tcUpdatePrintPreview === 'function') tcUpdatePrintPreview({ force: true });
  else tcScheduleLivePreviewUpdate();
};

window.tcRenderStyleBorderList = function () {
  var box = document.getElementById('styleBorderExList');
  if (!box) return;
  var exs = (currentTest && currentTest.exercises) || [];
  if (!exs.length) {
    box.innerHTML = '<div style="font-size:0.8rem;color:#64748b;font-style:italic;">' + escapeHtml(i18n.t('tcNoExercisesYet') || 'No exercises or blocks added yet.') + '</div>';
    return;
  }
  var T = function (k, d) { return escapeHtml(i18n.t(k) || d); };
  box.innerHTML = exs.map(function (ex, idx) {
    var cur = (ex.exportStyle && ex.exportStyle.cardBorderStyle) || 'inherit';
    var typeMeta = (TestCreatorService.EXERCISE_TYPES || []).find(function (t) { return t.id === ex.type; });
    var lbl = (ex.title && String(ex.title).trim()) ? ex.title : (typeMeta ? typeMeta.name : ('Block ' + (idx + 1)));
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;">' +
      '<span style="font-size:0.8rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (idx + 1) + '. ' + escapeHtml(lbl) + '</span>' +
      '<select class="meta-select sm" style="width:165px;" onchange="tcUpdateBlockBorderStyle(\'' + ex.id + '\', this.value)">' +
        '<option value="inherit"' + (cur === 'inherit' ? ' selected' : '') + '>' + T('tcInheritGlobal', 'Inherit Global') + '</option>' +
        '<option value="none"' + (cur === 'none' ? ' selected' : '') + '>' + T('tcBorderNoneOnly', 'No Border') + '</option>' +
        '<option value="academic"' + (cur === 'academic' ? ' selected' : '') + '>' + T('tcBorderClassic', 'Academic Classic') + '</option>' +
        '<option value="neobrutalist"' + (cur === 'neobrutalist' ? ' selected' : '') + '>' + T('tcBorderNeobrutalist', 'Neobrutalist') + '</option>' +
        '<option value="minimal"' + (cur === 'minimal' ? ' selected' : '') + '>' + T('tcBorderMinimal', 'Minimal') + '</option>' +
      '</select>' +
    '</div>';
  }).join('');
};

window.tcUpdateBlockBorderStyle = function (exId, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!ex.exportStyle) ex.exportStyle = {};
  if (!val || val === 'inherit') {
    delete ex.exportStyle.cardBorderStyle;
    if (!Object.keys(ex.exportStyle).length) delete ex.exportStyle;
  } else {
    ex.exportStyle.cardBorderStyle = val;
  }
  tcSaveCurrentTest(false);
  renderExerciseCards();
  if (typeof tcUpdatePrintPreview === 'function') tcUpdatePrintPreview({ force: true });
  else tcScheduleLivePreviewUpdate();
};

window.tcApplyStyleToAllExercises = function () {
  if (!currentTest.exercises || !currentTest.exercises.length) return;
  var g = currentTest.exportStyle || { fontSize: '11pt', lineHeight: 1.5, padding: '14px', numberedLines: false };
  currentTest.exercises.forEach(function (ex) {
    ex.exportStyle = {
      fontSize: g.fontSize || '11pt',
      lineHeight: g.lineHeight || 1.5,
      padding: g.padding || '14px',
      numberedLines: !!g.numberedLines
    };
  });
  tcSaveCurrentTest(false);
  tcRenderStyleExTable();
  if (window.showToast) showToast(i18n.tFmt('tcAppliedGlobalStylesCount', { count: currentTest.exercises.length }));
};

window.tcRenderStyleExTable = function () {
  var tbody = document.getElementById('styleExTableBody');
  if (!tbody) return;
  var exs = currentTest.exercises || [];
  if (!exs.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:12px;">No exercises added to this test yet.</td></tr>';
    return;
  }

  tbody.innerHTML = exs.map(function (ex, idx) {
    var st = ex.exportStyle || {};
    var fs = st.fontSize || '';
    var lh = st.lineHeight !== undefined && st.lineHeight !== null ? String(st.lineHeight) : '';
    var pad = st.padding || '';
    var nl = st.numberedLines !== undefined && st.numberedLines !== null ? String(st.numberedLines) : 'inherit';

    return '<tr>' +
      '  <td style="font-weight:800;text-align:center;">' + (idx + 1) + '</td>' +
      '  <td style="font-weight:700;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeAttr(ex.title || '') + '">' + escapeHtml(ex.title || 'Untitled') + '</td>' +
      '  <td>' +
      '    <select class="style-select" style="width:100%;padding:2px 4px;font-size:0.75rem;" onchange="tcUpdateExStyleField(\'' + ex.id + '\', \'fontSize\', this.value)">' +
      '      <option value="">Inherit</option>' +
      '      <option value="9pt" ' + (fs === '9pt' ? 'selected' : '') + '>9pt</option>' +
      '      <option value="10pt" ' + (fs === '10pt' ? 'selected' : '') + '>10pt</option>' +
      '      <option value="11pt" ' + (fs === '11pt' ? 'selected' : '') + '>11pt</option>' +
      '      <option value="12pt" ' + (fs === '12pt' ? 'selected' : '') + '>12pt</option>' +
      '      <option value="13pt" ' + (fs === '13pt' ? 'selected' : '') + '>13pt</option>' +
      '      <option value="14pt" ' + (fs === '14pt' ? 'selected' : '') + '>14pt</option>' +
      '      <option value="16pt" ' + (fs === '16pt' ? 'selected' : '') + '>16pt</option>' +
      '    </select>' +
      '  </td>' +
      '  <td>' +
      '    <select class="style-select" style="width:100%;padding:2px 4px;font-size:0.75rem;" onchange="tcUpdateExStyleField(\'' + ex.id + '\', \'lineHeight\', this.value ? Number(this.value) : \'\')">' +
      '      <option value="">Inherit</option>' +
      '      <option value="1.2" ' + (lh === '1.2' ? 'selected' : '') + '>1.2</option>' +
      '      <option value="1.4" ' + (lh === '1.4' ? 'selected' : '') + '>1.4</option>' +
      '      <option value="1.5" ' + (lh === '1.5' ? 'selected' : '') + '>1.5</option>' +
      '      <option value="1.6" ' + (lh === '1.6' ? 'selected' : '') + '>1.6</option>' +
      '      <option value="1.8" ' + (lh === '1.8' ? 'selected' : '') + '>1.8</option>' +
      '      <option value="2" ' + (lh === '2' || lh === '2.0' ? 'selected' : '') + '>2.0</option>' +
      '      <option value="2.4" ' + (lh === '2.4' ? 'selected' : '') + '>2.4</option>' +
      '    </select>' +
      '  </td>' +
      '  <td>' +
      '    <select class="style-select" style="width:100%;padding:2px 4px;font-size:0.75rem;" onchange="tcUpdateExStyleField(\'' + ex.id + '\', \'padding\', this.value)">' +
      '      <option value="">Inherit</option>' +
      '      <option value="8px" ' + (pad === '8px' ? 'selected' : '') + '>8px</option>' +
      '      <option value="12px" ' + (pad === '12px' ? 'selected' : '') + '>12px</option>' +
      '      <option value="14px" ' + (pad === '14px' ? 'selected' : '') + '>14px</option>' +
      '      <option value="18px" ' + (pad === '18px' ? 'selected' : '') + '>18px</option>' +
      '      <option value="24px" ' + (pad === '24px' ? 'selected' : '') + '>24px</option>' +
      '    </select>' +
      '  </td>' +
      '  <td>' +
      '    <select class="style-select" style="width:100%;padding:2px 4px;font-size:0.75rem;" onchange="tcUpdateExStyleField(\'' + ex.id + '\', \'numberedLines\', this.value === \'inherit\' ? \'inherit\' : (this.value === \'true\'))">' +
      '      <option value="inherit" ' + (nl === 'inherit' ? 'selected' : '') + '>Inherit</option>' +
      '      <option value="true" ' + (nl === 'true' ? 'selected' : '') + '>Numbered</option>' +
      '      <option value="false" ' + (nl === 'false' ? 'selected' : '') + '>None</option>' +
      '    </select>' +
      '  </td>' +
      '  <td style="text-align:center;">' +
      '    <button type="button" class="neo-btn sm" style="padding:1px 6px;font-size:0.7rem;" title="Reset overrides for this exercise" onclick="tcResetExStyle(\'' + ex.id + '\')"><img src="../assets/icons/refresh.svg" alt="Reset" style="width:11px;height:11px;vertical-align:middle;"></button>' +
      '  </td>' +
      '</tr>';
  }).join('');
};

window.tcUpdateExStyleField = function (exId, field, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!ex.exportStyle) ex.exportStyle = {};

  if (val === '' || val === 'inherit') {
    delete ex.exportStyle[field];
  } else {
    ex.exportStyle[field] = val;
  }

  if (Object.keys(ex.exportStyle).length === 0) {
    delete ex.exportStyle;
  }
  tcSaveCurrentTest(false);
};

window.tcResetExStyle = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  delete ex.exportStyle;
  tcSaveCurrentTest(false);
  tcRenderStyleExTable();
};

// ── Individual Exercise Style Modal ────────────────────────────────────
window.tcOnExStyleCustomNumToggle = function () {
  var chk = document.getElementById('exStyleCustomNumToggle');
  var f = document.getElementById('exStyleCustomNumFields');
  if (f) f.style.display = (chk && chk.checked) ? 'flex' : 'none';
  if (chk && chk.checked) tcUpdateExStyleLinePreview();
};

window.tcUpdateExStyleLinePreview = function () {
  var box = document.getElementById('exStyleLineSamplePreview');
  if (!box) return;
  var cfg = {
    format: document.getElementById('exStyleNumFormat') ? document.getElementById('exStyleNumFormat').value : 'decimal',
    size: document.getElementById('exStyleNumSize') ? document.getElementById('exStyleNumSize').value : '8pt',
    color: document.getElementById('exStyleNumColor') ? document.getElementById('exStyleNumColor').value : '#64748b',
    distance: document.getElementById('exStyleNumDistance') ? document.getElementById('exStyleNumDistance').value : '8px',
    weight: (document.getElementById('exStyleNumBold') && document.getElementById('exStyleNumBold').checked) ? '700' : '400',
    italic: document.getElementById('exStyleNumItalic') ? document.getElementById('exStyleNumItalic').checked : false,
    interval: document.getElementById('exStyleNumInterval') ? Number(document.getElementById('exStyleNumInterval').value) : 1,
    startAt: document.getElementById('exStyleNumStartAt') ? Number(document.getElementById('exStyleNumStartAt').value) : 1
  };
  box.innerHTML = tcRenderSampleLinesHtml(cfg);
};

window.tcOpenExerciseStyleModal = function (exId) {
  if (typeof tcCloseExerciseSettingsModal === 'function') tcCloseExerciseSettingsModal(true);
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  currentEditingExStyleId = exId;

  document.getElementById('exerciseStyleModalTitle').textContent = 'Style: ' + (ex.title || 'Exercise');
  var hasCustom = !!(ex.exportStyle && Object.keys(ex.exportStyle).length > 0);
  var toggle = document.getElementById('exStyleCustomToggle');
  toggle.checked = hasCustom;

  var st = ex.exportStyle || {};
  document.getElementById('exStyleFontSize').value = st.fontSize ? tcMapLegacyFontSize(st.fontSize) : '';
  var densityVal = st.density || ((st.lineHeight || st.padding) ? tcMapLegacyDensity(st.lineHeight, st.padding) : '');
  document.getElementById('exStyleDensity').value = densityVal;
  document.getElementById('exStyleCardBorder').value = st.cardBorderStyle || 'inherit';
  document.getElementById('exStyleNumberedLines').value = st.numberedLines !== undefined && st.numberedLines !== null ? String(st.numberedLines) : 'inherit';

  var mtParsed = TestCreatorService.parseUnitValue(st.marginTop, 'px');
  if (document.getElementById('exStyleMarginTopVal')) document.getElementById('exStyleMarginTopVal').value = (st.marginTop !== undefined && st.marginTop !== null && st.marginTop !== '') ? mtParsed.value : '';
  if (document.getElementById('exStyleMarginTopUnit')) document.getElementById('exStyleMarginTopUnit').value = (['px', 'pt', 'cm'].indexOf(mtParsed.unit) !== -1) ? mtParsed.unit : 'px';

  var mrParsed = TestCreatorService.parseUnitValue(st.marginRight, 'px');
  if (document.getElementById('exStyleMarginRightVal')) document.getElementById('exStyleMarginRightVal').value = (st.marginRight !== undefined && st.marginRight !== null && st.marginRight !== '') ? mrParsed.value : '';
  if (document.getElementById('exStyleMarginRightUnit')) document.getElementById('exStyleMarginRightUnit').value = (['px', 'pt', 'cm'].indexOf(mrParsed.unit) !== -1) ? mrParsed.unit : 'px';

  var mbParsed = TestCreatorService.parseUnitValue(st.marginBottom, 'px');
  if (document.getElementById('exStyleMarginBottomVal')) document.getElementById('exStyleMarginBottomVal').value = (st.marginBottom !== undefined && st.marginBottom !== null && st.marginBottom !== '') ? mbParsed.value : '';
  if (document.getElementById('exStyleMarginBottomUnit')) document.getElementById('exStyleMarginBottomUnit').value = (['px', 'pt', 'cm'].indexOf(mbParsed.unit) !== -1) ? mbParsed.unit : 'px';

  var mlParsed = TestCreatorService.parseUnitValue(st.marginLeft, 'px');
  if (document.getElementById('exStyleMarginLeftVal')) document.getElementById('exStyleMarginLeftVal').value = (st.marginLeft !== undefined && st.marginLeft !== null && st.marginLeft !== '') ? mlParsed.value : '';
  if (document.getElementById('exStyleMarginLeftUnit')) document.getElementById('exStyleMarginLeftUnit').value = (['px', 'pt', 'cm'].indexOf(mlParsed.unit) !== -1) ? mlParsed.unit : 'px';

  tcOnExStyleCustomToggle();
  document.getElementById('exerciseStyleModal').classList.add('open');
};

window.tcCloseExerciseStyleModal = function () {
  document.getElementById('exerciseStyleModal').classList.remove('open');
  currentEditingExStyleId = null;
};

window.tcOnExStyleCustomToggle = function () {
  var isCustom = document.getElementById('exStyleCustomToggle').checked;
  document.getElementById('exStyleCustomFields').style.display = isCustom ? 'flex' : 'none';
};

window.tcSaveExerciseStyle = function () {
  if (!currentEditingExStyleId) return;
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === currentEditingExStyleId; });
  if (!ex) return;

  var isCustom = document.getElementById('exStyleCustomToggle').checked;
  if (!isCustom) {
    delete ex.exportStyle;
  } else {
    var fs = document.getElementById('exStyleFontSize').value;
    var density = document.getElementById('exStyleDensity').value;
    var cardBorder = document.getElementById('exStyleCardBorder').value || 'inherit';
    var nl = document.getElementById('exStyleNumberedLines').value;

    var st = {};
    if (fs) st.fontSize = fs;
    if (density) {
      st.density = density;
      if (density === 'compact') {
        st.lineHeight = 1.3;
        st.padding = '10px';
        st.itemSpacing = 'compact';
      } else if (density === 'relaxed') {
        st.lineHeight = 1.8;
        st.padding = '18px';
        st.itemSpacing = 'relaxed';
      } else {
        st.lineHeight = 1.5;
        st.padding = '14px';
        st.itemSpacing = 'standard';
      }
    }
    if (cardBorder && cardBorder !== 'inherit') st.cardBorderStyle = cardBorder;
    if (nl !== 'inherit') st.numberedLines = (nl === 'true');

    var mtVal = document.getElementById('exStyleMarginTopVal') ? document.getElementById('exStyleMarginTopVal').value : '';
    var mtUnit = document.getElementById('exStyleMarginTopUnit') ? document.getElementById('exStyleMarginTopUnit').value : 'px';
    if (mtVal !== '' && mtVal !== null && !isNaN(Number(mtVal))) st.marginTop = Number(mtVal) + mtUnit;

    var mrVal = document.getElementById('exStyleMarginRightVal') ? document.getElementById('exStyleMarginRightVal').value : '';
    var mrUnit = document.getElementById('exStyleMarginRightUnit') ? document.getElementById('exStyleMarginRightUnit').value : 'px';
    if (mrVal !== '' && mrVal !== null && !isNaN(Number(mrVal))) st.marginRight = Number(mrVal) + mrUnit;

    var mbVal = document.getElementById('exStyleMarginBottomVal') ? document.getElementById('exStyleMarginBottomVal').value : '';
    var mbUnit = document.getElementById('exStyleMarginBottomUnit') ? document.getElementById('exStyleMarginBottomUnit').value : 'px';
    if (mbVal !== '' && mbVal !== null && !isNaN(Number(mbVal))) st.marginBottom = Number(mbVal) + mbUnit;

    var mlVal = document.getElementById('exStyleMarginLeftVal') ? document.getElementById('exStyleMarginLeftVal').value : '';
    var mlUnit = document.getElementById('exStyleMarginLeftUnit') ? document.getElementById('exStyleMarginLeftUnit').value : 'px';
    if (mlVal !== '' && mlVal !== null && !isNaN(Number(mlVal))) st.marginLeft = Number(mlVal) + mlUnit;

    if (Object.keys(st).length > 0) {
      ex.exportStyle = st;
    } else {
      delete ex.exportStyle;
    }
  }

  tcSaveCurrentTest(false);
  tcCloseExerciseStyleModal();
  renderExerciseCards();
  tcScheduleLivePreviewUpdate();
};

// ── Header Customizer & Allowed Materials Controller ────────────────────
var _userCustomHeaderTemplates = [];

window.tcLoadCustomHeaderTemplates = async function () {
  _userCustomHeaderTemplates = [];
  if (window.Desktop && Desktop.isElectron && typeof Desktop.readJson === 'function') {
    try {
      var res = await Desktop.readJson('user', 'custom-header-templates.json');
      var list = (res && res.ok && res.data) ? res.data : (res && res.data ? res.data : res);
      if (Array.isArray(list)) {
        _userCustomHeaderTemplates = list;
        return;
      }
    } catch (_) {}
  }
  try {
    var raw = localStorage.getItem('cmt_custom_header_templates');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        _userCustomHeaderTemplates = parsed;
      }
    }
  } catch (_) {}
};

var _userCustomMaterials = [];
var _editingMaterialIdx = -1;

window.tcLoadCustomMaterials = function () {
  try {
    var raw = localStorage.getItem('cmt_custom_material_presets');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        _userCustomMaterials = parsed;
      }
    }
  } catch (_) {}
};

window.tcSaveCustomMaterials = function () {
  try {
    localStorage.setItem('cmt_custom_material_presets', JSON.stringify(_userCustomMaterials));
  } catch (_) {}
};

window.tcSaveCustomHeaderTemplatesToDisk = async function () {
  try {
    localStorage.setItem('cmt_custom_header_templates', JSON.stringify(_userCustomHeaderTemplates));
  } catch (_) {}
  if (window.Desktop && Desktop.isElectron && typeof Desktop.saveJson === 'function') {
    try {
      await Desktop.saveJson('user', 'custom-header-templates.json', _userCustomHeaderTemplates);
    } catch (e) {
      console.error('Error saving custom header templates:', e);
    }
  }
};

window.tcPopulateHeaderTemplatesDropdown = function () {
  var sel = document.getElementById('tcHeaderTemplateSelect');
  if (!sel) return;
  sel.innerHTML = '';

  var builtins = TestCreatorService.BUILTIN_HEADER_TEMPLATES || [];
  var builtinGrp = document.createElement('optgroup');
  builtinGrp.label = i18n.t('tcTabBuiltinTemplates') || 'Built-in Models';
  builtins.forEach(function (t) {
    var opt = document.createElement('option');
    opt.value = 'builtin_' + t.id;
    opt.textContent = (t.title || t.id) + ' (' + (t.subject || 'All') + ')';
    builtinGrp.appendChild(opt);
  });
  sel.appendChild(builtinGrp);

  if (_userCustomHeaderTemplates && _userCustomHeaderTemplates.length > 0) {
    var customGrp = document.createElement('optgroup');
    customGrp.label = i18n.t('tcTabCustomTemplates') || 'My Saved Header Templates';
    _userCustomHeaderTemplates.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = 'custom_' + t.id;
      opt.textContent = t.title || t.id;
      customGrp.appendChild(opt);
    });
    sel.appendChild(customGrp);
  }

  tcOnHeaderTemplateSelectChange();
};

window.tcOnHeaderTemplateSelectChange = function () {
  var sel = document.getElementById('tcHeaderTemplateSelect');
  var delBtn = document.getElementById('tcDeleteHeaderTemplateBtn');
  if (!sel || !delBtn) return;
  var val = sel.value || '';
  delBtn.style.display = val.startsWith('custom_') ? 'inline-flex' : 'none';
};

window.tcApplySelectedHeaderTemplate = function () {
  var sel = document.getElementById('tcHeaderTemplateSelect');
  if (!sel || !sel.value || !currentTest) return;
  var val = sel.value;
  var template = null;
  if (val.startsWith('builtin_')) {
    var bId = val.replace('builtin_', '');
    template = (TestCreatorService.BUILTIN_HEADER_TEMPLATES || []).find(function (t) { return t.id === bId; });
  } else if (val.startsWith('custom_')) {
    var cId = val.replace('custom_', '');
    template = (_userCustomHeaderTemplates || []).find(function (t) { return t.id === cId; });
  }
  if (!template) {
    if (window.showToast) showToast(i18n.t('tcTemplateNotFound'), true);
    return;
  }

  if (template.headerConfig) {
    currentTest.headerConfig = JSON.parse(JSON.stringify(template.headerConfig));
  }
  if (Array.isArray(template.materialsAllowed)) {
    currentTest.materialsAllowed = JSON.parse(JSON.stringify(template.materialsAllowed));
  }
  if (template.materialsStyle) {
    if (!currentTest.headerConfig) currentTest.headerConfig = {};
    currentTest.headerConfig.materialsStyle = JSON.parse(JSON.stringify(template.materialsStyle));
  }

  tcOpenHeaderCustomizerModal();
  tcSaveCurrentTest(false);
  if (window.showToast) {
    showToast(i18n.t('tcHeaderTemplateApplied') || 'Header template applied!');
  }
};

window.tcSaveCurrentHeaderAsTemplate = async function () {
  if (!currentTest) return;
  var promptMsg = i18n.t('tcEnterHeaderTemplateName') || 'Enter a name for this header template:';
  var defaultName = (currentTest.title ? (currentTest.title + ' Header') : 'Custom Header');
  var name = window.showPrompt
    ? await window.showPrompt(promptMsg, defaultName)
    : prompt(promptMsg, defaultName);
  if (!name || !name.trim()) return;

  var newTmpl = {
    id: 'hdr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title: name.trim(),
    isCustom: true,
    headerConfig: JSON.parse(JSON.stringify(TestCreatorService.ensureHeaderConfig(currentTest))),
    materialsAllowed: Array.isArray(currentTest.materialsAllowed) ? JSON.parse(JSON.stringify(currentTest.materialsAllowed)) : [],
    materialsStyle: (currentTest.headerConfig && currentTest.headerConfig.materialsStyle) ? JSON.parse(JSON.stringify(currentTest.headerConfig.materialsStyle)) : {}
  };

  _userCustomHeaderTemplates.push(newTmpl);
  await tcSaveCustomHeaderTemplatesToDisk();
  tcPopulateHeaderTemplatesDropdown();

  var sel = document.getElementById('tcHeaderTemplateSelect');
  if (sel) {
    sel.value = 'custom_' + newTmpl.id;
    tcOnHeaderTemplateSelectChange();
  }
  if (window.showToast) {
    showToast(i18n.t('tcHeaderTemplateSaved') || 'Header template saved successfully!');
  }
};

window.tcDeleteSelectedHeaderTemplate = async function () {
  var sel = document.getElementById('tcHeaderTemplateSelect');
  if (!sel || !sel.value || !sel.value.startsWith('custom_')) return;
  var cId = sel.value.replace('custom_', '');
  var tmpl = (_userCustomHeaderTemplates || []).find(function (t) { return t.id === cId; });
  if (!tmpl) return;

  var confirmMsg = (i18n.t('tcDeleteTemplateConfirm') || 'Are you sure you want to delete this template?') + ' "' + tmpl.title + '"';
  var confirmed = window.showConfirm ? await window.showConfirm(confirmMsg) : confirm(confirmMsg);
  if (!confirmed) return;

  _userCustomHeaderTemplates = _userCustomHeaderTemplates.filter(function (t) { return t.id !== cId; });
  await tcSaveCustomHeaderTemplatesToDisk();
  tcPopulateHeaderTemplatesDropdown();
  if (window.showToast) {
    showToast(i18n.t('tcHeaderTemplateDeleted', 'Deleted header template'));
  }
};

window.tcOpenHeaderCustomizerModal = function () {
  if (!currentTest) return;
  tcPopulateHeaderTemplatesDropdown();
  tcLoadCustomMaterials();
  _editingMaterialIdx = -1;
  if (typeof tcOnDirty === 'function') {
    tcOnDirty();
  }
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  if (!Array.isArray(currentTest.materialsAllowed)) {
    currentTest.materialsAllowed = ['Pen & Pencil only'];
  }

  // 1. Tab Materials
  tcRenderMaterialsPool();
  tcRenderActiveMaterials();
  if (document.getElementById('hdrMaterialsDisplayMode')) {
    document.getElementById('hdrMaterialsDisplayMode').value = (hc.materialsStyle && hc.materialsStyle.displayMode) || 'inline';
  }
  if (document.getElementById('hdrMatBold')) {
    document.getElementById('hdrMatBold').checked = !hc.materialsStyle || hc.materialsStyle.bold !== false;
  }
  if (document.getElementById('hdrMatValItalic')) {
    document.getElementById('hdrMatValItalic').checked = !hc.materialsStyle || !!hc.materialsStyle.valItalic;
  }
  if (document.getElementById('hdrMatValUnderline')) {
    document.getElementById('hdrMatValUnderline').checked = !hc.materialsStyle || !!hc.materialsStyle.valUnderline;
  }

  // 2. Tab Elements
  var elemKeys = [
    'showTitle', 'showSubtitle', 'subtitleText',
    'showStudentName', 'studentNameLabel',
    'showClass', 'classLabel',
    'showDate', 'dateLabel',
    'showTeacher', 'teacherLabel',
    'showDuration', 'durationLabel',
    'showMaterials', 'materialsLabel',
    'showScope', 'scopeLabel',
    'showTotalPoints', 'pointsLabel',
    'showVariantBadge',
    'showGradingScale', 'gradingScaleLabel',
    'showCompetences', 'competencesLabel', 'showCompetenceDescriptions',
    'showCriteria', 'criteriaLabel', 'showCriteriaDescriptions',
    'showInstructions', 'instructionsText'
  ];
  elemKeys.forEach(function (k) {
    var el = document.getElementById('hdrChk_' + k) || 
             document.getElementById('hdrInput_' + k) || 
             document.getElementById('hdrText_' + k) ||
             (k === 'instructionsText' ? (document.getElementById('hdrText_instructionsText') || document.getElementById('hdrText_instructions')) : null);
    if (el) {
      if (el.type === 'checkbox') {
        el.checked = !!hc[k];
      } else {
        var val = hc[k];
        if (k.endsWith('Label') && typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.resolveHeaderLabel === 'function') {
          val = TestCreatorService.resolveHeaderLabel(currentTest, k.replace(/Label$/, ''));
        } else if (k === 'instructionsText' && typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.resolveInstructionsText === 'function') {
          val = TestCreatorService.resolveInstructionsText(currentTest);
        } else if (val == null) {
          val = '';
        }
        el.value = val;
        if (k === 'instructionsText' && window.tcUpdateLivePreview) {
          tcUpdateLivePreview('hdrText_instructionsText', el.value);
        }
      }
    }
  });

  // Typography toggles for elements
  var styleMap = [
    { obj: 'titleStyle', pfx: 'title' },
    { obj: 'subtitleStyle', pfx: 'subtitle' },
    { obj: 'studentNameStyle', pfx: 'studentName' },
    { obj: 'classStyle', pfx: 'class' },
    { obj: 'dateStyle', pfx: 'date' },
    { obj: 'teacherStyle', pfx: 'teacher' },
    { obj: 'durationStyle', pfx: 'duration' },
    { obj: 'materialsStyle', pfx: 'materials' },
    { obj: 'scopeStyle', pfx: 'scope' },
    { obj: 'pointsStyle', pfx: 'points' },
    { obj: 'gradingScaleStyle', pfx: 'gradingScale' },
    { obj: 'competencesStyle', pfx: 'competences' },
    { obj: 'criteriaStyle', pfx: 'criteria' },
    { obj: 'instructionsStyle', pfx: 'instr' }
  ];
  styleMap.forEach(function (item) {
    var st = hc[item.obj] || {};
    ['bold', 'italic', 'underline'].forEach(function (fmt) {
      var btn = document.getElementById('hdrBtn_' + item.pfx + '_' + fmt);
      if (btn) {
        if (st[fmt]) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });
  });

  if (document.getElementById('hdrSelect_scaleDisplayMode')) {
    var scMode = (hc.gradingScaleStyle && hc.gradingScaleStyle.displayMode) || (typeof hc.gradingScaleStyle === 'string' ? hc.gradingScaleStyle : 'table');
    document.getElementById('hdrSelect_scaleDisplayMode').value = scMode;
  }
  if (document.getElementById('hdrSelect_competencesDisplayMode')) {
    document.getElementById('hdrSelect_competencesDisplayMode').value = (hc.competencesStyle && hc.competencesStyle.displayMode) || 'table';
  }
  if (document.getElementById('hdrSelect_criteriaDisplayMode')) {
    document.getElementById('hdrSelect_criteriaDisplayMode').value = (hc.criteriaStyle && hc.criteriaStyle.displayMode) || 'matrix';
  }
  if (document.getElementById('hdrSelect_criteriaBg')) {
    document.getElementById('hdrSelect_criteriaBg').value = (hc.criteriaStyle && hc.criteriaStyle.background) || 'default';
  }
  if (document.getElementById('hdrSelect_criteriaPadding')) {
    document.getElementById('hdrSelect_criteriaPadding').value = (hc.criteriaStyle && hc.criteriaStyle.padding) || 'standard';
  }
  if (document.getElementById('hdrSelect_criteriaBorder')) {
    document.getElementById('hdrSelect_criteriaBorder').value = (hc.criteriaStyle && hc.criteriaStyle.border) || 'solid';
  }
  if (document.getElementById('hdrSelect_criteriaOrientation')) {
    document.getElementById('hdrSelect_criteriaOrientation').value = (hc.criteriaStyle && hc.criteriaStyle.pageOrientation) || 'portrait';
  }
  if (document.getElementById('hdrChk_critColName')) {
    document.getElementById('hdrChk_critColName').checked = !hc.criteriaStyle || hc.criteriaStyle.showCriterionCol !== false;
  }
  if (document.getElementById('hdrChk_critColLevels')) {
    document.getElementById('hdrChk_critColLevels').checked = !hc.criteriaStyle || hc.criteriaStyle.showLevelsCol !== false;
  }
  if (document.getElementById('hdrChk_critColDesc')) {
    document.getElementById('hdrChk_critColDesc').checked = !hc.criteriaStyle || (hc.criteriaStyle.showDescriptions !== undefined ? hc.criteriaStyle.showDescriptions : (hc.showCriteriaDescriptions !== false));
  }
  if (document.getElementById('hdrChk_critColMax')) {
    document.getElementById('hdrChk_critColMax').checked = !hc.criteriaStyle || hc.criteriaStyle.showMaxCol !== false;
  }
  if (document.getElementById('hdrChk_critColScore')) {
    document.getElementById('hdrChk_critColScore').checked = !hc.criteriaStyle || hc.criteriaStyle.showScoreCol !== false;
  }
  if (document.getElementById('hdrChk_critColComments')) {
    document.getElementById('hdrChk_critColComments').checked = !hc.criteriaStyle || hc.criteriaStyle.showCommentsCol !== false;
  }
  if (document.getElementById('hdrChk_critSeparatePage')) {
    document.getElementById('hdrChk_critSeparatePage').checked = !!(hc.criteriaStyle && (hc.criteriaStyle.separatePage || hc.criteriaStyle.pageOrientation === 'landscape'));
  }
  if (document.getElementById('hdrSelect_competencesBg')) {
    document.getElementById('hdrSelect_competencesBg').value = (hc.competencesStyle && hc.competencesStyle.background) || 'default';
  }
  if (document.getElementById('hdrSelect_competencesPadding')) {
    document.getElementById('hdrSelect_competencesPadding').value = (hc.competencesStyle && hc.competencesStyle.padding) || 'standard';
  }
  if (document.getElementById('hdrSelect_competencesBorder')) {
    document.getElementById('hdrSelect_competencesBorder').value = (hc.competencesStyle && hc.competencesStyle.border) || 'solid';
  }
  if (document.getElementById('hdrSelect_competencesOrientation')) {
    document.getElementById('hdrSelect_competencesOrientation').value = (hc.competencesStyle && hc.competencesStyle.pageOrientation) || 'portrait';
  }
  if (document.getElementById('hdrChk_compColCode')) {
    document.getElementById('hdrChk_compColCode').checked = !hc.competencesStyle || hc.competencesStyle.showCodeCol !== false;
  }
  if (document.getElementById('hdrChk_compColTitle')) {
    document.getElementById('hdrChk_compColTitle').checked = !hc.competencesStyle || hc.competencesStyle.showTitleCol !== false;
  }
  if (document.getElementById('hdrChk_compColDesc')) {
    document.getElementById('hdrChk_compColDesc').checked = !hc.competencesStyle || (hc.competencesStyle.showDescriptions !== undefined ? hc.competencesStyle.showDescriptions : (hc.showCompetenceDescriptions !== false));
  }
  if (document.getElementById('hdrChk_compColLevel')) {
    document.getElementById('hdrChk_compColLevel').checked = !hc.competencesStyle || hc.competencesStyle.showLevelCol !== false;
  }
  if (document.getElementById('hdrChk_compColScore')) {
    document.getElementById('hdrChk_compColScore').checked = !!(hc.competencesStyle && hc.competencesStyle.showScoreCol);
  }
  if (document.getElementById('hdrChk_compColComments')) {
    document.getElementById('hdrChk_compColComments').checked = !!(hc.competencesStyle && hc.competencesStyle.showCommentsCol);
  }
  if (document.getElementById('hdrChk_compSeparatePage')) {
    document.getElementById('hdrChk_compSeparatePage').checked = !!(hc.competencesStyle && (hc.competencesStyle.separatePage || hc.competencesStyle.pageOrientation === 'landscape'));
  }
  if (document.getElementById('hdrSelect_scaleBg')) {
    document.getElementById('hdrSelect_scaleBg').value = (hc.gradingScaleStyle && hc.gradingScaleStyle.background) || 'default';
  }
  if (document.getElementById('hdrSelect_scalePadding')) {
    document.getElementById('hdrSelect_scalePadding').value = (hc.gradingScaleStyle && hc.gradingScaleStyle.padding) || 'standard';
  }
  if (document.getElementById('hdrSelect_scaleBorder')) {
    document.getElementById('hdrSelect_scaleBorder').value = (hc.gradingScaleStyle && hc.gradingScaleStyle.border) || 'solid';
  }
  if (document.getElementById('hdrChk_scaleColGrade')) {
    document.getElementById('hdrChk_scaleColGrade').checked = !hc.gradingScaleStyle || hc.gradingScaleStyle.showGradeCol !== false;
  }
  if (document.getElementById('hdrChk_scaleColThreshold')) {
    document.getElementById('hdrChk_scaleColThreshold').checked = !hc.gradingScaleStyle || hc.gradingScaleStyle.showThresholdCol !== false;
  }
  if (document.getElementById('hdrChk_scaleColPoints')) {
    document.getElementById('hdrChk_scaleColPoints').checked = !hc.gradingScaleStyle || hc.gradingScaleStyle.showPointsCol !== false;
  }
  if (document.getElementById('hdrChk_scaleColNotes')) {
    document.getElementById('hdrChk_scaleColNotes').checked = !hc.gradingScaleStyle || hc.gradingScaleStyle.showNotesCol !== false;
  }
  if (document.getElementById('hdrChk_scaleSeparatePage')) {
    document.getElementById('hdrChk_scaleSeparatePage').checked = !!(hc.gradingScaleStyle && (hc.gradingScaleStyle.separatePage || hc.gradingScaleStyle.pageOrientation === 'landscape'));
  }

  // Dropdowns / specifics
  var tSize = (hc.titleStyle && hc.titleStyle.size) || '18pt';
  var parsedT = tcParseUnitVal(tSize, 'pt');
  if (document.getElementById('hdrInput_titleSizeVal')) document.getElementById('hdrInput_titleSizeVal').value = parsedT.value;
  if (document.getElementById('hdrSelect_titleSizeUnit')) document.getElementById('hdrSelect_titleSizeUnit').value = parsedT.unit;

  var sSize = (hc.subtitleStyle && hc.subtitleStyle.size) || '12pt';
  var parsedS = tcParseUnitVal(sSize, 'pt');
  if (document.getElementById('hdrInput_subtitleSizeVal')) document.getElementById('hdrInput_subtitleSizeVal').value = parsedS.value;
  if (document.getElementById('hdrSelect_subtitleSizeUnit')) document.getElementById('hdrSelect_subtitleSizeUnit').value = parsedS.unit;

  if (document.getElementById('hdrChk_titleUpper')) {
    document.getElementById('hdrChk_titleUpper').checked = !!(hc.titleStyle && hc.titleStyle.uppercase);
  }
  if (document.getElementById('hdrSelect_subtitleAlign')) {
    document.getElementById('hdrSelect_subtitleAlign').value = (hc.subtitleStyle && hc.subtitleStyle.align) || 'left';
  }
  if (document.getElementById('hdrSelect_nameLineStyle')) {
    document.getElementById('hdrSelect_nameLineStyle').value = (hc.studentNameStyle && hc.studentNameStyle.lineStyle) || 'line';
  }
  if (document.getElementById('hdrSelect_instrBorder')) {
    document.getElementById('hdrSelect_instrBorder').value = (hc.instructionsStyle && hc.instructionsStyle.border) || 'box';
  }

  // 3. Tab Layout
  if (document.getElementById('hdrSelect_borderStyle')) {
    document.getElementById('hdrSelect_borderStyle').value = hc.borderStyle || 'double';
  }
  if (document.getElementById('hdrSelect_layout')) {
    document.getElementById('hdrSelect_layout').value = hc.layout || '3-columns';
  }
  if (document.getElementById('hdrSelect_bgTint')) {
    document.getElementById('hdrSelect_bgTint').value = hc.backgroundTint || 'ivory';
  }
  if (document.getElementById('hdrSelect_padding')) {
    document.getElementById('hdrSelect_padding').value = hc.padding || 'standard';
  }

  // Header Style Preset
  var presetSel = document.getElementById('hdrSelect_headerStylePreset');
  if (presetSel) {
    if (hc.borderStyle === 'none' || hc.borderStyle === 'minimal' || hc.layout === 'inline-list') {
      presetSel.value = 'minimal';
    } else if (hc.layout === 'banner' || hc.backgroundTint === 'tint') {
      presetSel.value = 'banner';
    } else {
      presetSel.value = 'boxed';
    }
  }

  // 4. Tab Order
  tcRenderHeaderOrderLists();

  // Live preview
  tcUpdateModalHeaderPreview();

  document.getElementById('headerCustomizerModal').classList.add('open');
  document.body.classList.add('modal-open');
};

window.tcApplyHeaderStylePreset = function (preset) {
  if (!currentTest) return;
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  if (preset === 'minimal') {
    hc.layout = '2-columns';
    hc.borderStyle = 'minimal';
    hc.backgroundTint = 'none';
    hc.padding = 'compact';
  } else if (preset === 'banner') {
    hc.layout = 'banner';
    hc.borderStyle = 'solid';
    hc.backgroundTint = 'tint';
    hc.padding = 'standard';
  } else {
    hc.layout = '3-columns';
    hc.borderStyle = 'double';
    hc.backgroundTint = 'ivory';
    hc.padding = 'standard';
  }
  tcOnDirty();
  tcUpdateModalHeaderPreview();
  tcScheduleLivePreviewUpdate();
};

window.tcCloseHeaderCustomizerModal = function () {
  _editingMaterialIdx = -1;
  document.getElementById('headerCustomizerModal').classList.remove('open');
  document.body.classList.remove('modal-open');
  tcSaveCurrentTest(false);
  if (typeof tcSyncHeaderBlockFromState === 'function') {
    tcSyncHeaderBlockFromState();
  }
  tcScheduleLivePreviewUpdate();
};

window.tcSwitchHeaderTab = function (tabName) {
  var tabs = ['materials', 'elements', 'layout', 'order'];
  tabs.forEach(function (t) {
    var btn = document.getElementById('hdrTabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
    var panel = document.getElementById('hdrPanel' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) {
      if (t === tabName) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    if (panel) {
      if (t === tabName) panel.classList.add('active');
      else panel.classList.remove('active');
    }
  });
  if (tabName === 'order') {
    tcRenderHeaderOrderLists();
  }
};

window.tcRenderMaterialsPool = function () {
  var pool = document.getElementById('hdrMaterialPresetsPool');
  if (!pool) return;
  var currentMats = currentTest.materialsAllowed || [];
  var builtins = TestCreatorService.DEFAULT_MATERIALS || [];
  var customs = _userCustomMaterials || [];
  var allPresets = builtins.slice();
  customs.forEach(function (c) {
    if (allPresets.indexOf(c) === -1) allPresets.push(c);
  });

  pool.innerHTML = allPresets.map(function (preset) {
    var isSel = currentMats.indexOf(preset) !== -1;
    var isCustom = builtins.indexOf(preset) === -1;
    return '<span class="hdr-preset-chip-wrap">' +
      '<button type="button" class="hdr-preset-chip' + (isSel ? ' selected' : '') + '" onclick="tcToggleMaterialPreset(\'' + escapeAttr(preset) + '\')">' +
        (isSel ? '✓ ' : '+ ') + escapeHtml(preset) +
      '</button>' +
      (isCustom ? '<button type="button" class="hdr-preset-remove-btn" onclick="tcDeleteCustomPreset(\'' + escapeAttr(preset) + '\')" title="' + (i18n.t('tcRemovePresetTooltip') || 'Remove custom preset') + '">&times;</button>' : '') +
    '</span>';
  }).join(' ');
};

window.tcDeleteCustomPreset = function (preset) {
  if (!_userCustomMaterials) return;
  var idx = _userCustomMaterials.indexOf(preset);
  if (idx !== -1) {
    _userCustomMaterials.splice(idx, 1);
    tcSaveCustomMaterials();
    tcRenderMaterialsPool();
  }
};

window.tcRenderActiveMaterials = function () {
  var list = document.getElementById('hdrActiveMaterialsList');
  if (!list) return;
  var currentMats = currentTest.materialsAllowed || [];
  if (currentMats.length === 0) {
    list.innerHTML = '<span style="font-size:0.78rem;color:#94a3b8;font-style:italic;">No materials specified. (Students may assume standard rules)</span>';
    return;
  }
  list.innerHTML = currentMats.map(function (mat, idx) {
    if (idx === _editingMaterialIdx) {
      return '<div class="hdr-mat-item editing">' +
        '<span class="hdr-mat-num">' + (idx + 1) + '.</span>' +
        '<input type="text" id="hdrMatEditInput_' + idx + '" class="meta-input sm hdr-mat-edit-input" value="' + escapeAttr(mat) + '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();tcSaveEditMaterial(' + idx + ');}else if(event.key===\'Escape\'){event.preventDefault();tcCancelEditMaterial();}">' +
        '<div class="hdr-mat-actions">' +
          '<button type="button" class="card-btn-icon sm" style="color:#16a34a;" onclick="tcSaveEditMaterial(' + idx + ')" title="' + (i18n.t('tcSaveMaterial') || 'Save') + '"><img src="../assets/icons/check.svg" alt="" style="width:12px;height:12px;" /></button>' +
          '<button type="button" class="card-btn-icon sm" style="color:#ef4444;" onclick="tcCancelEditMaterial()" title="' + (i18n.t('tcCancelMaterial') || 'Cancel') + '"><img src="../assets/icons/close.svg" alt="" style="width:12px;height:12px;" /></button>' +
        '</div>' +
      '</div>';
    }

    return '<div class="hdr-mat-item">' +
      '<span class="hdr-mat-num">' + (idx + 1) + '.</span>' +
      '<span class="hdr-mat-text" onclick="tcStartEditMaterial(' + idx + ')" title="' + (i18n.t('tcEditMaterialTooltip') || 'Click to edit material text') + '">' + escapeHtml(mat) + '</span>' +
      '<div class="hdr-mat-actions">' +
        '<button type="button" class="card-btn-icon sm" onclick="tcStartEditMaterial(' + idx + ')" title="' + (i18n.t('tcEditMaterialTooltip') || 'Edit material text') + '"><img src="../assets/icons/edit-word.svg" alt="" style="width:12px;height:12px;" /></button>' +
        (idx > 0 ? '<button type="button" class="card-btn-icon sm" onclick="tcMoveMaterial(' + idx + ', -1)" title="Move up">▲</button>' : '') +
        (idx < currentMats.length - 1 ? '<button type="button" class="card-btn-icon sm" onclick="tcMoveMaterial(' + idx + ', 1)" title="Move down">▼</button>' : '') +
        '<button type="button" class="card-btn-icon sm" style="color:#ef4444;" onclick="tcRemoveMaterial(' + idx + ')" title="Remove">&times;</button>' +
      '</div>' +
    '</div>';
  }).join('');
};

window.tcStartEditMaterial = function (idx) {
  _editingMaterialIdx = idx;
  tcRenderActiveMaterials();
  setTimeout(function () {
    var inp = document.getElementById('hdrMatEditInput_' + idx);
    if (inp) {
      inp.focus();
      inp.select();
    }
  }, 30);
};

window.tcSaveEditMaterial = function (idx) {
  var inp = document.getElementById('hdrMatEditInput_' + idx);
  if (!inp) {
    _editingMaterialIdx = -1;
    tcRenderActiveMaterials();
    return;
  }
  var val = (inp.value || '').trim();
  if (!val) {
    tcRemoveMaterial(idx);
    _editingMaterialIdx = -1;
    return;
  }
  if (!currentTest.materialsAllowed) currentTest.materialsAllowed = [];
  currentTest.materialsAllowed[idx] = val;
  _editingMaterialIdx = -1;
  tcOnDirty();
  tcRenderMaterialsPool();
  tcRenderActiveMaterials();
  tcUpdateModalHeaderPreview();
};

window.tcCancelEditMaterial = function () {
  _editingMaterialIdx = -1;
  tcRenderActiveMaterials();
};

window.tcToggleMaterialPreset = function (preset) {
  if (!currentTest.materialsAllowed) currentTest.materialsAllowed = [];
  var idx = currentTest.materialsAllowed.indexOf(preset);
  if (idx !== -1) {
    currentTest.materialsAllowed.splice(idx, 1);
  } else {
    currentTest.materialsAllowed.push(preset);
  }
  tcOnDirty();
  tcRenderMaterialsPool();
  tcRenderActiveMaterials();
  tcUpdateModalHeaderPreview();
};

window.tcAddCustomMaterial = function (saveAsPreset) {
  var input = document.getElementById('tcCustomMaterialInput');
  if (!input) return;
  var text = (input.value || '').trim();
  if (!text) return;
  if (!currentTest.materialsAllowed) currentTest.materialsAllowed = [];
  if (currentTest.materialsAllowed.indexOf(text) === -1) {
    currentTest.materialsAllowed.push(text);
  }
  if (saveAsPreset) {
    if (!_userCustomMaterials) _userCustomMaterials = [];
    if (_userCustomMaterials.indexOf(text) === -1) {
      _userCustomMaterials.push(text);
      tcSaveCustomMaterials();
    }
  }
  input.value = '';
  tcOnDirty();
  tcRenderMaterialsPool();
  tcRenderActiveMaterials();
  tcUpdateModalHeaderPreview();
};

window.tcRemoveMaterial = function (idx) {
  if (!currentTest.materialsAllowed) return;
  currentTest.materialsAllowed.splice(idx, 1);
  if (_editingMaterialIdx === idx) {
    _editingMaterialIdx = -1;
  } else if (_editingMaterialIdx > idx) {
    _editingMaterialIdx--;
  }
  tcOnDirty();
  tcRenderMaterialsPool();
  tcRenderActiveMaterials();
  tcUpdateModalHeaderPreview();
};

window.tcMoveMaterial = function (idx, dir) {
  if (!currentTest.materialsAllowed) return;
  var target = idx + dir;
  if (target < 0 || target >= currentTest.materialsAllowed.length) return;
  var temp = currentTest.materialsAllowed[idx];
  currentTest.materialsAllowed[idx] = currentTest.materialsAllowed[target];
  currentTest.materialsAllowed[target] = temp;
  if (_editingMaterialIdx === idx) {
    _editingMaterialIdx = target;
  } else if (_editingMaterialIdx === target) {
    _editingMaterialIdx = idx;
  }
  tcOnDirty();
  tcRenderActiveMaterials();
  tcUpdateModalHeaderPreview();
};

window.tcClearAllMaterials = function () {
  currentTest.materialsAllowed = [];
  _editingMaterialIdx = -1;
  tcOnDirty();
  tcRenderMaterialsPool();
  tcRenderActiveMaterials();
  tcUpdateModalHeaderPreview();
};

window.tcUpdateHeaderMaterialsOpt = function (prop, val) {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  if (!hc.materialsStyle) hc.materialsStyle = {};
  hc.materialsStyle[prop] = val;
  tcOnDirty();
  tcUpdateModalHeaderPreview();
};

window.tcUpdateHdrElem = function (key, val) {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  hc[key] = val;
  tcOnDirty();
  tcUpdateModalHeaderPreview();
};
window.tcUpdateHeaderCfg = window.tcUpdateHdrElem;
window.tcUpdateHeaderMaterialsDisplayMode = function (val) {
  tcUpdateHeaderMaterialsOpt('displayMode', val);
};

window.tcToggleElemFmt = function (styleObjKey, fmtKey) {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  if (!hc[styleObjKey]) hc[styleObjKey] = {};
  hc[styleObjKey][fmtKey] = !hc[styleObjKey][fmtKey];

  var pfx = styleObjKey.replace('Style', '');
  if (pfx === 'instructions') pfx = 'instr';
  var btn = document.getElementById('hdrBtn_' + pfx + '_' + fmtKey);
  if (btn) {
    if (hc[styleObjKey][fmtKey]) btn.classList.add('active');
    else btn.classList.remove('active');
  }
  tcOnDirty();
  tcUpdateModalHeaderPreview();
};

window.tcUpdateElemStyle = function (styleObjKey, prop, val) {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  if (!hc[styleObjKey]) hc[styleObjKey] = {};
  hc[styleObjKey][prop] = val;
  tcOnDirty();
  tcUpdateModalHeaderPreview();
};

window.tcResetHeaderToDefault = function () {
  currentTest.headerConfig = JSON.parse(JSON.stringify(TestCreatorService.DEFAULT_HEADER_CONFIG));
  currentTest.materialsAllowed = ['Pen & Pencil only'];
  tcOnDirty();
  tcOpenHeaderCustomizerModal();
  if (typeof showToast === 'function') {
    showToast(i18n.t('tcHeaderConfigReset', 'Header configuration reset to default'));
  }
};

window.tcUpdateHeaderTitleSize = function () {
  var v = document.getElementById('hdrInput_titleSizeVal').value;
  var u = document.getElementById('hdrSelect_titleSizeUnit').value;
  tcUpdateElemStyle('titleStyle', 'size', v + u);
};

window.tcUpdateHeaderSubtitleSize = function () {
  var v = document.getElementById('hdrInput_subtitleSizeVal').value;
  var u = document.getElementById('hdrSelect_subtitleSizeUnit').value;
  tcUpdateElemStyle('subtitleStyle', 'size', v + u);
};

window.tcRenderHeaderOrderLists = function () {
  if (!currentTest) return;
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var secList = document.getElementById('hdrSectionsOrderList');
  var metaList = document.getElementById('hdrMetaOrderList');
  if (!secList || !metaList) return;

  var t = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t.bind(i18n) : function (k) { return k; };
  var secNames = {
    title: t('tcSecTitle') || 'Main Title',
    subtitle: t('tcSecSubtitle') || 'Subtitle',
    metadata: t('tcSecMetadata') || 'Metadata Box',
    gradingScale: t('tcSecGradingScale') || 'Grading Scale Table',
    instructions: t('tcSecInstructions') || 'General Instructions'
  };
  var metaNames = {
    studentName: t('tcMetaStudentName') || 'Student Name',
    class: t('tcMetaClass') || 'Class / Group',
    date: t('tcMetaDate') || 'Date',
    teacher: t('tcMetaTeacher') || 'Teacher',
    duration: t('tcMetaDuration') || 'Duration / Time',
    materials: t('tcMetaMaterials') || 'Materials Allowed',
    scope: t('tcMetaScope') || 'Scope / Subject',
    points: t('tcMetaPoints') || 'Score / Total Points',
    gradingScale: t('tcMetaGradingScale') || 'Grading Scale'
  };

  secList.innerHTML = (hc.sectionOrder || []).map(function (secKey, idx) {
    return '<div class="tc-order-item">' +
      '<span class="tc-order-label">' + (idx + 1) + '. ' + escapeHtml(secNames[secKey] || secKey) + '</span>' +
      (idx > 0 ? '<button type="button" class="tc-order-btn" onclick="tcMoveHeaderSection(' + idx + ', -1)" title="' + (t('tcMoveUp') || 'Move up') + '">▲</button>' : '') +
      (idx < hc.sectionOrder.length - 1 ? '<button type="button" class="tc-order-btn" onclick="tcMoveHeaderSection(' + idx + ', 1)" title="' + (t('tcMoveDown') || 'Move down') + '">▼</button>' : '') +
      '</div>';
  }).join('');

  metaList.innerHTML = (hc.metaOrder || []).map(function (metaKey, idx) {
    return '<div class="tc-order-item">' +
      '<span class="tc-order-label">' + (idx + 1) + '. ' + escapeHtml(metaNames[metaKey] || metaKey) + '</span>' +
      (idx > 0 ? '<button type="button" class="tc-order-btn" onclick="tcMoveHeaderMetaItem(' + idx + ', -1)" title="' + (t('tcMoveUp') || 'Move up') + '">▲</button>' : '') +
      (idx < hc.metaOrder.length - 1 ? '<button type="button" class="tc-order-btn" onclick="tcMoveHeaderMetaItem(' + idx + ', 1)" title="' + (t('tcMoveDown') || 'Move down') + '">▼</button>' : '') +
      '</div>';
  }).join('');
};

window.tcMoveHeaderSection = function (idx, dir) {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var arr = hc.sectionOrder;
  var target = idx + dir;
  if (target < 0 || target >= arr.length) return;
  var item = arr.splice(idx, 1)[0];
  arr.splice(target, 0, item);
  tcRenderHeaderOrderLists();
  tcUpdateModalHeaderPreview();
  tcOnDirty();
};

window.tcMoveHeaderMetaItem = function (idx, dir) {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var arr = hc.metaOrder;
  var target = idx + dir;
  if (target < 0 || target >= arr.length) return;
  var item = arr.splice(idx, 1)[0];
  arr.splice(target, 0, item);
  tcRenderHeaderOrderLists();
  tcUpdateModalHeaderPreview();
  tcOnDirty();
};

window.tcUpdateModalHeaderPreview = function () {
  var container = document.getElementById('modalHeaderLivePreview');
  if (!container || !currentTest) return;
  var totalPts = TestCreatorService.calculateTotalTestPoints(currentTest);
  var className = (currentTest.className && currentTest.className.trim()) || 'Class 4-B';
  var html = TestCreatorService.renderHeaderHtml(currentTest, false, 'A', '', className, totalPts);
  container.innerHTML = html;
};

// ── Live Print & PDF Preview Studio Column ───────────────────────────
window.tcOpenPrintPreview = function () {
  var col = document.getElementById('tcPreviewColumn');
  if (col) {
    col.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  var prevSel = document.getElementById('previewMarginsSelect');
  if (prevSel && currentTest && currentTest.exportStyle && currentTest.exportStyle.margins) {
    prevSel.value = currentTest.exportStyle.margins.preset || 'custom';
  }
  var thmSel = document.getElementById('previewThemeSelect');
  if (thmSel && currentTest) {
    thmSel.value = tcNormalizeThemeId((currentTest.exportStyle && currentTest.exportStyle.theme) || currentTest.stylesheetTheme || (window.ExportStylesService && ExportStylesService.getSelectedStyle('testCreator')) || localStorage.getItem('cmt_default_test_theme') || 'export-light-neobrutalist.css');
  }
  tcUpdatePrintPreview({ force: true });
};

window.tcOnPreviewThemeChange = function (val) {
  var normVal = tcNormalizeThemeId(val);
  if (!currentTest.exportStyle) currentTest.exportStyle = {};
  currentTest.exportStyle.theme = normVal;
  currentTest.stylesheetTheme = normVal;
  try { localStorage.setItem('cmt_default_test_theme', normVal); } catch (_) {}
  if (window.ExportStylesService) {
    ExportStylesService.setSelectedStyle('testCreator', normVal);
  }
  var gThm = document.getElementById('globalStyleTheme');
  if (gThm && gThm.value !== normVal) gThm.value = normVal;
  var eThm = document.getElementById('exportThemeSelect');
  if (eThm && eThm.value !== normVal) eThm.value = normVal;
  tcSaveCurrentTest(false);
  tcUpdatePrintPreview({ force: true });
};

window.tcClosePrintPreview = function () {
  var modal = document.getElementById('printPreviewModal');
  if (modal) modal.classList.remove('open');
};

var _tcPreviewAbortController = 0;
window._tcPreviewIsFrozen = false;
try {
  window._tcPreviewIsFrozen = localStorage.getItem('cmt_tc_preview_frozen') === 'true';
} catch (_) {}

window.tcSetPreviewUpdatingIndicator = function (isUpdating) {
  var ind = document.getElementById('tcPreviewStatusIndicator');
  if (ind) {
    ind.style.display = isUpdating ? 'inline-flex' : 'none';
  }
  var refreshBtn = document.getElementById('previewRefreshBtn');
  if (refreshBtn) {
    refreshBtn.classList.toggle('is-refreshing', !!isUpdating);
  }
};

window.tcToggleFreezePreview = function () {
  window._tcPreviewIsFrozen = !window._tcPreviewIsFrozen;
  try {
    localStorage.setItem('cmt_tc_preview_frozen', window._tcPreviewIsFrozen ? 'true' : 'false');
  } catch (_) {}
  tcUpdateFreezePreviewUI();
  if (!window._tcPreviewIsFrozen) {
    tcUpdatePrintPreview({ force: true });
  }
};

window.tcForceRefreshPreview = function () {
  tcUpdatePrintPreview({ force: true });
};

window.tcUpdateFreezePreviewUI = function () {
  var btn = document.getElementById('previewFreezeToggle');
  var label = document.getElementById('previewFreezeLabel');
  var isFrozen = !!window._tcPreviewIsFrozen;
  if (!btn) return;

  btn.classList.toggle('is-frozen', isFrozen);
  if (isFrozen) {
    var tUnfreeze = typeof i18n !== 'undefined' && typeof i18n.t === 'function'
      ? i18n.t('tcUnfreezePreviewTooltip')
      : 'Resume live preview updates';
    var tFrozen = typeof i18n !== 'undefined' && typeof i18n.t === 'function'
      ? i18n.t('tcPreviewFrozen')
      : 'Frozen';
    btn.title = tUnfreeze;
    btn.setAttribute('data-i18n-title', 'tcUnfreezePreviewTooltip');
    if (label) {
      label.textContent = tFrozen;
      label.setAttribute('data-i18n', 'tcPreviewFrozen');
    }
  } else {
    var tFreezeTitle = typeof i18n !== 'undefined' && typeof i18n.t === 'function'
      ? i18n.t('tcFreezePreviewTooltip')
      : 'Freeze preview updates while editing';
    var tFreeze = typeof i18n !== 'undefined' && typeof i18n.t === 'function'
      ? i18n.t('tcFreezePreview')
      : 'Freeze';
    btn.title = tFreezeTitle;
    btn.setAttribute('data-i18n-title', 'tcFreezePreviewTooltip');
    if (label) {
      label.textContent = tFreeze;
      label.setAttribute('data-i18n', 'tcFreezePreview');
    }
  }
};

window.tcUpdatePrintPreview = async function (options) {
  if (!currentTest) return;

  var force = (options === true) || (options && options.force === true);
  if (window._tcPreviewIsFrozen && !force) {
    return;
  }

  var isTeacher = document.getElementById('previewTeacherKeyToggle') ? document.getElementById('previewTeacherKeyToggle').checked : false;
  var variant = document.getElementById('previewVariantSelect') ? document.getElementById('previewVariantSelect').value : 'A';
  var theme = document.getElementById('previewThemeSelect') ? tcNormalizeThemeId(document.getElementById('previewThemeSelect').value) : 'export-light-neobrutalist.css';
  var wrap = document.getElementById('previewCanvasWrap');
  if (!wrap) return;

  var currentRequestId = ++_tcPreviewAbortController;

  var hasExistingContent = wrap.children.length > 0 && !wrap.querySelector('.full-preview-loading');

  // Only display full loading placeholder if there is NO existing content (initial first load)
  if (!hasExistingContent) {
    wrap.innerHTML =
      '<div class="full-preview-loading">' +
      '  <div class="full-preview-spinner"></div>' +
      '  <div>Rendering high-fidelity print preview…</div>' +
      '</div>';
  }

  tcSetPreviewUpdatingIndicator(true);

  try {
    var variantTest = TestCreatorService.generateVariant(currentTest, variant);
    var previewHtml = TestCreatorService.exportToHtml(variantTest, {
      isTeacherKey: isTeacher,
      variant: variant,
      stylesheetTheme: theme,
      studentName: '',
      className: currentTest.className || ''
    });

    if (window.ExportStylesService) {
      previewHtml = await ExportStylesService.injectStyleIntoHtml(previewHtml, theme, 'testCreator');
    }

    // Exact PDF.js rendering if running in Electron
    if (window.Desktop && Desktop.isElectron && typeof Desktop.printPdf === 'function') {
      try {
        var pdfSettings = (window.Desktop && typeof Desktop.getPdfExportSettings === 'function') ? Desktop.getPdfExportSettings() : (typeof getPdfExportSettings === 'function' ? getPdfExportSettings() : { pageSize: 'A4', isLandscape: false });
        var req = {
          html: previewHtml,
          pdfOptions: {
            landscape: pdfSettings.isLandscape,
            pageSize: pdfSettings.pageSize || 'A4',
            marginsType: 1,
            preferCSSPageSize: true,
            printBackground: true
          },
          previewOnly: true
        };

        var res = await Desktop.printPdf(req);
        if (currentRequestId !== _tcPreviewAbortController) return;

        if (res && res.ok && res.base64) {
          var pdfjsLib = await tcEnsurePdfjsLib();
          var binaryStr = atob(res.base64);
          var bytes = new Uint8Array(binaryStr.length);
          for (var i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          var pdfDoc = await pdfjsLib.getDocument({
            data: bytes,
            standardFontDataUrl: new URL('../modules/standard_fonts/', location.href).href,
            wasmUrl: new URL('../modules/wasm/', location.href).href,
            disableFontFace: false
          }).promise;

          if (currentRequestId !== _tcPreviewAbortController) return;

          var pagesWrapper = document.createElement('div');
          pagesWrapper.className = 'full-preview-pdf-pages';

          var dpr = Math.max(window.devicePixelRatio || 1, 2);

          for (var pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            var page = await pdfDoc.getPage(pageNum);
            var unscaledViewport = page.getViewport({ scale: 1.0 });
            var displayWidth = Math.min(unscaledViewport.width, 860);
            var scale = (displayWidth / unscaledViewport.width) * dpr;
            var viewport = page.getViewport({ scale: scale });

            var pageW = Math.round(displayWidth);
            var pageH = Math.round(unscaledViewport.height * (displayWidth / unscaledViewport.width));

            var canvasWrap = document.createElement('div');
            canvasWrap.className = 'full-preview-pdf-canvas-wrap';
            canvasWrap.style.width = pageW + 'px';
            canvasWrap.style.height = pageH + 'px';

            var canvas = document.createElement('canvas');
            canvas.className = 'full-preview-pdf-canvas';
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            canvas.style.width = pageW + 'px';
            canvas.style.height = pageH + 'px';

            var ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            canvasWrap.appendChild(canvas);
            pagesWrapper.appendChild(canvasWrap);
          }

          if (currentRequestId !== _tcPreviewAbortController) return;

          var prevScrollTop = wrap.scrollTop;
          var prevScrollLeft = wrap.scrollLeft;

          wrap.replaceChildren(pagesWrapper);

          wrap.scrollTop = prevScrollTop;
          wrap.scrollLeft = prevScrollLeft;
          return;
        }
      } catch (err) {
        console.warn('Exact PDF print preview failed, falling back to DOM A4 preview:', err);
      }
    }

    // Web / Fallback rendering
    if (currentRequestId !== _tcPreviewAbortController) return;
    var themeCss = '';
    if (window.ExportStylesService) {
      try {
        themeCss = await ExportStylesService.getStyleContent(theme);
      } catch (_) {}
    }
    if (!themeCss) {
      themeCss = TestCreatorService.getThemeCss(theme);
    } else {
      themeCss = TestCreatorService.getThemeCss(theme) + '\n' + themeCss;
    }
    var scopedCss = themeCss
      .replace(/\bbody\s*\{/g, '#previewCanvasWrap .a4-sheet {')
      .replace(/\.exam-sheet\s*\{[^}]*\}/g, '.exam-sheet { width: 100%; max-width: 100%; margin: 0; }');

    var match = previewHtml.match(/<div class="exam-sheet[^"]*">[\s\S]*<\/body>/);
    var content = match ? match[0].replace('</body>', '') : previewHtml;

    var tempContainer = document.createElement('div');
    tempContainer.innerHTML = '<style id="tcThemePreviewStyles">' + scopedCss + '</style>' +
      '<div class="a4-sheet theme-' + theme.replace(/[^a-zA-Z0-9_\-]+/g, '_') + '">' + content + '</div>';

    var prevScrollTopFallback = wrap.scrollTop;
    var prevScrollLeftFallback = wrap.scrollLeft;

    wrap.replaceChildren.apply(wrap, Array.from(tempContainer.childNodes));

    wrap.scrollTop = prevScrollTopFallback;
    wrap.scrollLeft = prevScrollLeftFallback;
  } finally {
    if (currentRequestId === _tcPreviewAbortController) {
      tcSetPreviewUpdatingIndicator(false);
    }
  }
};

window.tcPrintDocument = async function () {
  var isTeacher = document.getElementById('previewTeacherKeyToggle').checked;
  var variant = document.getElementById('previewVariantSelect').value;
  var theme = document.getElementById('previewThemeSelect') ? tcNormalizeThemeId(document.getElementById('previewThemeSelect').value) : 'export-light-neobrutalist.css';

  var variantTest = TestCreatorService.generateVariant(currentTest, variant);
  var exportHtml = TestCreatorService.exportToHtml(variantTest, {
    isTeacherKey: isTeacher,
    variant: variant,
    stylesheetTheme: theme,
    studentName: '',
    className: currentTest.className || ''
  });

  if (window.ExportStylesService) {
    exportHtml = await ExportStylesService.injectStyleIntoHtml(exportHtml, theme, 'testCreator');
  }

  var fileNameBase = tcSanitizeFilename(currentTest.title, 'Exam');
  var defaultName = fileNameBase + (isTeacher ? '_Solution_Key' : '') + '.pdf';

  if (window.Desktop && Desktop.isElectron && typeof Desktop.printPdf === 'function') {
    var pdfSettings = (window.Desktop && typeof Desktop.getPdfExportSettings === 'function') ? Desktop.getPdfExportSettings() : (typeof getPdfExportSettings === 'function' ? getPdfExportSettings() : { pageSize: 'A4', isLandscape: false });
    var res = await Desktop.printPdf({
      html: exportHtml,
      defaultName: defaultName,
      pdfOptions: {
        landscape: pdfSettings.isLandscape,
        pageSize: pdfSettings.pageSize || 'A4',
        marginsType: 1,
        preferCSSPageSize: true,
        printBackground: true
      }
    });

    if (res && res.ok && res.path) {
      if (window.showExportSuccessPopup) {
        window.showExportSuccessPopup(res.path, res.name || defaultName);
      } else if (window.showToast) {
        showToast(i18n.tFmt('tcPdfExportedTo', { path: res.name || defaultName }));
      }
    }
  } else {
    window.print();
  }
};

// ── Export Modal & Direct Actions ─────────────────────────────────────
function tcSyncQuickExportTogglesFromTest() {
  if (!currentTest || typeof TestCreatorService === 'undefined') return;
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var setChk = function (id, altId, val) {
    if (typeof altId === 'boolean' || altId === undefined) {
      val = altId;
      altId = null;
    }
    var el = document.getElementById(id) || (altId ? document.getElementById(altId) : null);
    if (el) el.checked = (val !== false);
  };
  var setSel = function (id, altId, val) {
    var el = document.getElementById(id) || (altId ? document.getElementById(altId) : null);
    if (el && val != null) el.value = val;
  };

  setChk('expHdrTitle', 'tcQuickExpHdr_title', hc.showTitle !== false);
  setChk('expHdrStudent', 'tcQuickExpHdr_studentName', hc.showStudentName);
  setChk('expHdrClass', 'tcQuickExpHdr_class', hc.showClass);
  setChk('expHdrDate', 'tcQuickExpHdr_date', hc.showDate);
  setChk('expHdrDuration', 'tcQuickExpHdr_duration', hc.showDuration);
  setChk('expHdrScore', 'tcQuickExpHdr_points', hc.showTotalPoints);
  setChk('expHdrMaterials', 'tcQuickExpHdr_materials', hc.showMaterials);
  setChk('expHdrInstructions', 'tcQuickExpHdr_instructions', hc.showInstructions !== false);
  setChk('expHdrGrade', 'tcQuickExpHdr_scale', hc.showGradingScale !== false);

  var cs = hc.competencesStyle || {};
  var compMode = (hc.showCompetences === false) ? 'none' : (cs.displayMode || 'table');
  setSel('expCompDisplayMode', 'tcQuickExpCompMode', compMode);
  setChk('expCompColCode', 'tcQuickExpTc_code', cs.showCodeCol);
  setChk('expCompColTitle', 'tcQuickExpTc_title', cs.showTitleCol);
  setChk('expCompColDesc', 'tcQuickExpTc_desc', cs.showDescriptions);
  setChk('expCompColLevel', 'tcQuickExpTc_level', cs.showLevelCol);
  setChk('expCompColMastery', 'tcQuickExpTc_score', cs.showScoreCol);
  setChk('expCompColComments', 'tcQuickExpTc_comments', !!cs.showCommentsCol);

  var crs = hc.criteriaStyle || {};
  var critMode = (hc.showCriteria === false) ? 'none' : (crs.displayMode || 'matrix');
  setSel('expCritDisplayMode', 'tcQuickExpCritMode', critMode);
  setChk('expCritColName', 'tcQuickExpCr_criterion', crs.showCriterionCol);
  setChk('expCritColLevels', 'tcQuickExpCr_levels', crs.showLevelsCol);
  setChk('expCritColDesc', 'tcQuickExpCr_desc', crs.showDescriptions);
  setChk('expCritColMax', 'tcQuickExpCr_max', crs.showMaxCol);
  setChk('expCritColScore', 'tcQuickExpCr_score', crs.showScoreCol);
  setChk('expCritColComments', 'tcQuickExpCr_comments', !!crs.showCommentsCol);
}

window.tcOnQuickExportToggleChange = function () {
  if (!currentTest || typeof TestCreatorService === 'undefined') return;
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var getChk = function (id, altId, defVal) {
    if (typeof altId === 'boolean') {
      defVal = altId;
      altId = null;
    }
    var el = document.getElementById(id) || (altId ? document.getElementById(altId) : null);
    return el ? el.checked : defVal;
  };
  var getSel = function (id, altId) {
    var el = document.getElementById(id) || (altId ? document.getElementById(altId) : null);
    return el ? el.value : null;
  };

  if (document.getElementById('expHdrTitle') || document.getElementById('tcQuickExpHdr_title')) {
    hc.showTitle = getChk('expHdrTitle', 'tcQuickExpHdr_title', true);
  }
  hc.showStudentName = getChk('expHdrStudent', 'tcQuickExpHdr_studentName', true);
  hc.showClass = getChk('expHdrClass', 'tcQuickExpHdr_class', true);
  hc.showDate = getChk('expHdrDate', 'tcQuickExpHdr_date', true);
  hc.showDuration = getChk('expHdrDuration', 'tcQuickExpHdr_duration', true);
  hc.showTotalPoints = getChk('expHdrScore', 'tcQuickExpHdr_points', true);
  hc.showMaterials = getChk('expHdrMaterials', 'tcQuickExpHdr_materials', true);
  hc.showInstructions = getChk('expHdrInstructions', 'tcQuickExpHdr_instructions', true);
  hc.showGradingScale = getChk('expHdrGrade', 'tcQuickExpHdr_scale', true);

  if (!hc.competencesStyle) hc.competencesStyle = {};
  var compModeSel = getSel('expCompDisplayMode', 'tcQuickExpCompMode');
  if (compModeSel) {
    if (compModeSel === 'none') {
      hc.showCompetences = false;
    } else {
      hc.showCompetences = true;
      hc.competencesStyle.displayMode = compModeSel;
    }
  }
  hc.competencesStyle.showCodeCol = getChk('expCompColCode', 'tcQuickExpTc_code', true);
  hc.competencesStyle.showTitleCol = getChk('expCompColTitle', 'tcQuickExpTc_title', true);
  hc.competencesStyle.showDescriptions = getChk('expCompColDesc', 'tcQuickExpTc_desc', true);
  hc.competencesStyle.showLevelCol = getChk('expCompColLevel', 'tcQuickExpTc_level', true);
  hc.competencesStyle.showScoreCol = getChk('expCompColMastery', 'tcQuickExpTc_score', true);
  hc.competencesStyle.showCommentsCol = getChk('expCompColComments', 'tcQuickExpTc_comments', false);

  if (!hc.criteriaStyle) hc.criteriaStyle = {};
  var critModeSel = getSel('expCritDisplayMode', 'tcQuickExpCritMode');
  if (critModeSel) {
    if (critModeSel === 'none') {
      hc.showCriteria = false;
    } else {
      hc.showCriteria = true;
      hc.criteriaStyle.displayMode = critModeSel;
    }
  }
  hc.criteriaStyle.showCriterionCol = getChk('expCritColName', 'tcQuickExpCr_criterion', true);
  hc.criteriaStyle.showLevelsCol = getChk('expCritColLevels', 'tcQuickExpCr_levels', true);
  hc.criteriaStyle.showDescriptions = getChk('expCritColDesc', 'tcQuickExpCr_desc', true);
  hc.criteriaStyle.showMaxCol = getChk('expCritColMax', 'tcQuickExpCr_max', true);
  hc.criteriaStyle.showScoreCol = getChk('expCritColScore', 'tcQuickExpCr_score', true);
  hc.criteriaStyle.showCommentsCol = getChk('expCritColComments', 'tcQuickExpCr_comments', false);

  // Also sync any section_competences / section_criteria blocks in currentTest
  if (Array.isArray(currentTest.exercises)) {
    currentTest.exercises.forEach(function (ex) {
      if (!ex) return;
      if (ex.type === 'section_competences') {
        if (!ex.competencesConfig) ex.competencesConfig = {};
        if (compModeSel && compModeSel.value !== 'none') ex.competencesConfig.displayMode = compModeSel.value;
        ex.competencesConfig.showCodeCol = hc.competencesStyle.showCodeCol;
        ex.competencesConfig.showTitleCol = hc.competencesStyle.showTitleCol;
        ex.competencesConfig.showDescriptions = hc.competencesStyle.showDescriptions;
        ex.competencesConfig.showLevelCol = hc.competencesStyle.showLevelCol;
        ex.competencesConfig.showScoreCol = hc.competencesStyle.showScoreCol;
        ex.competencesConfig.showCommentsCol = hc.competencesStyle.showCommentsCol;
      } else if (ex.type === 'section_criteria') {
        if (!ex.criteriaConfig) ex.criteriaConfig = {};
        if (critModeSel && critModeSel.value !== 'none') ex.criteriaConfig.displayMode = critModeSel.value;
        ex.criteriaConfig.showCriterionCol = hc.criteriaStyle.showCriterionCol;
        ex.criteriaConfig.showLevelsCol = hc.criteriaStyle.showLevelsCol;
        ex.criteriaConfig.showDescriptions = hc.criteriaStyle.showDescriptions;
        ex.criteriaConfig.showMaxCol = hc.criteriaStyle.showMaxCol;
        ex.criteriaConfig.showScoreCol = hc.criteriaStyle.showScoreCol;
        ex.criteriaConfig.showCommentsCol = hc.criteriaStyle.showCommentsCol;
      }
    });
  }
  tcSaveCurrentTest(false);
};

window.tcOpenExportModal = function () {
  document.getElementById('exportModal').classList.add('open');
  tcSyncQuickExportTogglesFromTest();
  var expThm = document.getElementById('exportThemeSelect');
  if (expThm && currentTest) {
    var curThm = (currentTest.exportStyle && currentTest.exportStyle.theme) || currentTest.stylesheetTheme || (window.ExportStylesService && ExportStylesService.getSelectedStyle('testCreator')) || localStorage.getItem('cmt_default_test_theme') || 'export-light-neobrutalist.css';
    expThm.value = tcNormalizeThemeId(curThm);
  }
  if (window.ExportStylesService) {
    ExportStylesService.renderStyleSelector(document.getElementById('tc-export-style-selector-wrap'), {
      toolKey: 'testCreator',
      currentStyleId: tcNormalizeThemeId((currentTest && currentTest.exportStyle && currentTest.exportStyle.theme) || (currentTest && currentTest.stylesheetTheme) || ExportStylesService.getSelectedStyle('testCreator')),
      onChange: function (styleId) {
        if (currentTest) {
          if (!currentTest.exportStyle) currentTest.exportStyle = {};
          currentTest.exportStyle.theme = styleId;
          currentTest.stylesheetTheme = styleId;
        }
        var pThm = document.getElementById('previewThemeSelect');
        if (pThm && pThm.value !== styleId) pThm.value = styleId;
        var gThm = document.getElementById('globalStyleTheme');
        if (gThm && gThm.value !== styleId) gThm.value = styleId;
        var ifr = document.getElementById('exportPreviewIframe');
        if (ifr && document.getElementById('exportPreviewModal').classList.contains('open')) {
          ExportStylesService.applyStyleToIframe(ifr, styleId);
        }
      }
    });
  }
};

window.tcOnExportThemeChange = function (val) {
  var normVal = tcNormalizeThemeId(val);
  if (!currentTest.exportStyle) currentTest.exportStyle = {};
  currentTest.exportStyle.theme = normVal;
  currentTest.stylesheetTheme = normVal;
  try { localStorage.setItem('cmt_default_test_theme', normVal); } catch (_) {}
  if (window.ExportStylesService) {
    ExportStylesService.setSelectedStyle('testCreator', normVal);
  }
  var pThm = document.getElementById('previewThemeSelect');
  if (pThm && pThm.value !== normVal) pThm.value = normVal;
  var gThm = document.getElementById('globalStyleTheme');
  if (gThm && gThm.value !== normVal) gThm.value = normVal;
  tcSaveCurrentTest(false);
};

window.tcCloseExportModal = function () {
  document.getElementById('exportModal').classList.remove('open');
};

window.tcSetExportFormat = function (fmt) {
  currentExportFormat = fmt;
  ['Pdf', 'Html', 'Docx', 'Odt', 'Md'].forEach(function (f) {
    var btn = document.getElementById('expFmt' + f);
    if (btn) btn.classList.remove('primary');
  });
  var activeBtn = document.getElementById('expFmt' + fmt.charAt(0).toUpperCase() + fmt.slice(1).toLowerCase());
  if (activeBtn) activeBtn.classList.add('primary');
};

window.tcOnBatchToggle = function () {
  var chk = document.getElementById('expBatchToggle').checked;
  document.getElementById('batchVariantOptions').style.display = chk ? 'block' : 'none';
};

window.tcExecuteExport = async function () {
  var isTeacher = document.querySelector('input[name="expCopyType"]:checked').value === 'teacher';
  var isBatch = document.getElementById('expBatchToggle').checked;
  var vMode = document.querySelector('input[name="batchVariantMode"]:checked').value;
  tcCloseExportModal();

  var fileNameBase = tcSanitizeFilename(currentTest.title, 'Exam');
  var outContent = '';
  var ext = currentExportFormat;
  var activeTheme = tcNormalizeThemeId((currentTest.exportStyle && currentTest.exportStyle.theme) || currentTest.stylesheetTheme || (window.ExportStylesService && ExportStylesService.getSelectedStyle('testCreator')) || localStorage.getItem('cmt_default_test_theme') || 'export-light-neobrutalist.css');

  if (isBatch && activeStudents.length > 0) {
    var assignments = TestCreatorService.assignVariantsToStudents(activeStudents, vMode, { manualMap: manualVariantMap });
    if (currentExportFormat === 'odt' || currentExportFormat === 'docx' || currentExportFormat === 'md') {
      if (typeof TestCreatorService.exportClassBatchMarkdown === 'function') {
        outContent = TestCreatorService.exportClassBatchMarkdown(currentTest, activeStudents, assignments, { isTeacherKey: isTeacher });
      } else {
        outContent = TestCreatorService.exportToMarkdown(currentTest, { isTeacherKey: isTeacher });
      }
    } else {
      var rawBatchHtml = TestCreatorService.exportClassBatch(currentTest, activeStudents, assignments, { isTeacherKey: isTeacher, stylesheetTheme: activeTheme });
      outContent = rawBatchHtml;
    }
  } else {
    if (currentExportFormat === 'md' || currentExportFormat === 'odt' || currentExportFormat === 'docx') {
      outContent = TestCreatorService.exportToMarkdown(currentTest, { isTeacherKey: isTeacher });
    } else {
      outContent = TestCreatorService.exportToHtml(currentTest, { isTeacherKey: isTeacher, stylesheetTheme: activeTheme });
    }
  }

  if (ext !== 'md' && ext !== 'odt' && currentExportFormat !== 'docx' && window.ExportStylesService) {
    outContent = await ExportStylesService.injectStyleIntoHtml(outContent, ExportStylesService.getSelectedStyle('testCreator'));
  }

  var filename = fileNameBase + (isTeacher ? '_Solution_Key' : '') + '.' + ext;

  // If format is PDF, use promptExportDestination and Desktop.printPdf for direct PDF rendering
  if (currentExportFormat === 'pdf' && window.Desktop && Desktop.isElectron && typeof Desktop.printPdf === 'function') {
    var destRes = window.promptExportDestination
      ? await window.promptExportDestination({
          title: 'Export PDF',
          filename: filename,
          allowDocEditor: false
        })
      : { destination: 'to-print', filename: filename };
    if (!destRes || !destRes.destination) return;
    var finalPdfName = destRes.filename || filename;
    var pdfSettings = (window.Desktop && typeof Desktop.getPdfExportSettings === 'function') ? Desktop.getPdfExportSettings() : (typeof getPdfExportSettings === 'function' ? getPdfExportSettings() : { pageSize: 'A4', isLandscape: false });
    var pdfReq = {
      html: outContent,
      defaultName: finalPdfName,
      pdfOptions: {
        landscape: pdfSettings.isLandscape,
        pageSize: pdfSettings.pageSize || 'A4',
        marginsType: 1,
        preferCSSPageSize: true,
        printBackground: true
      }
    };
    if (destRes.destination === 'to-print') {
      pdfReq.target = 'toPrint';
      pdfReq.filename = finalPdfName;
    }
    var pdfRes = await Desktop.printPdf(pdfReq);

    if (pdfRes && pdfRes.ok && pdfRes.path) {
      if (window.showExportSuccessPopup) {
        window.showExportSuccessPopup(pdfRes.path, pdfRes.name || finalPdfName);
      } else if (window.showToast) {
        showToast(i18n.tFmt('tcExportedFile', { file: finalPdfName }));
      }
    }
    return;
  }

  // If format is ODT, package via Desktop.exportOdt / saveExportWithDestination
  if (currentExportFormat === 'odt') {
    var resolvedTokens = TestCreatorService.resolveActiveStyleTokens(currentTest, activeTheme);
    var imgMap = {};
    (currentTest.exercises || []).forEach(function (ex) {
      if (ex && ex.type === 'picture_description' && ex.content && Array.isArray(ex.content.items)) {
        ex.content.items.forEach(function (it) {
          if (it && it.imagePath) {
            imgMap[it.imagePath] = it.imageData || it.imagePath;
          }
        });
      }
    });
    var odtReq = {
      markdown: outContent,
      defaultName: filename,
      title: (currentTest.title || 'Exam') + (isTeacher ? ' (Solution Key)' : ''),
      fontFamily: resolvedTokens.fontFamily,
      fontSize: resolvedTokens.fontSize,
      margins: resolvedTokens.margins,
      tableThBg: resolvedTokens.tableThBg,
      borderColor: resolvedTokens.borderColor,
      images: imgMap
    };
    if (window.saveExportWithDestination) {
      await window.saveExportWithDestination({
        filename: filename,
        content: outContent,
        odtRequest: odtReq,
        mimeType: 'application/vnd.oasis.opendocument.text',
        allowDocEditor: true,
        filters: [
          { name: 'LibreOffice Writer Document (.odt)', extensions: ['odt'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        modalTitle: 'Export LibreOffice Writer (.odt)'
      });
      return;
    }
    if (window.Desktop && Desktop.isElectron && typeof Desktop.exportOdt === 'function') {
      var oRes = await Desktop.exportOdt(odtReq);
      if (oRes && oRes.ok) {
        if (window.showExportSuccessPopup && oRes.path) {
          window.showExportSuccessPopup(oRes.path, oRes.name || filename);
        } else if (window.showToast) {
          showToast(i18n.tFmt ? i18n.tFmt('tcExportedFile', { file: filename }) : 'ODT exported successfully');
        }
      } else if (oRes && !oRes.ok && !oRes.canceled) {
        if (window.showToast) showToast('ODT export failed: ' + (oRes.error || 'unknown error'), true);
      }
      return;
    }
  }

  // If format is DOCX, package via Desktop.exportDocx / saveExportWithDestination
  if (currentExportFormat === 'docx') {
    var resolvedDocxTokens = TestCreatorService.resolveActiveStyleTokens(currentTest, activeTheme);
    var imgDocxMap = {};
    (currentTest.exercises || []).forEach(function (ex) {
      if (ex && ex.type === 'picture_description' && ex.content && Array.isArray(ex.content.items)) {
        ex.content.items.forEach(function (it) {
          if (it && it.imagePath) {
            imgDocxMap[it.imagePath] = it.imageData || it.imagePath;
          }
        });
      }
    });
    var docxReq = {
      markdown: outContent,
      defaultName: filename,
      title: (currentTest.title || 'Exam') + (isTeacher ? ' (Solution Key)' : ''),
      fontFamily: resolvedDocxTokens.fontFamily,
      fontSize: resolvedDocxTokens.fontSize,
      margins: resolvedDocxTokens.margins,
      color: resolvedDocxTokens.textColor,
      images: imgDocxMap
    };
    if (window.saveExportWithDestination) {
      await window.saveExportWithDestination({
        filename: filename,
        content: outContent,
        docxRequest: docxReq,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        allowDocEditor: false,
        filters: [
          { name: 'Word Document (.docx)', extensions: ['docx'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        modalTitle: 'Export Word Document (.docx)'
      });
      return;
    }
    if (window.Desktop && Desktop.isElectron && typeof Desktop.exportDocx === 'function') {
      var dRes = await Desktop.exportDocx(docxReq);
      if (dRes && dRes.ok) {
        if (window.showExportSuccessPopup && dRes.path) {
          window.showExportSuccessPopup(dRes.path, dRes.name || filename);
        } else if (window.showToast) {
          showToast(i18n.tFmt ? i18n.tFmt('tcExportedFile', { file: filename }) : 'DOCX exported successfully');
        }
      } else if (dRes && !dRes.ok && !dRes.canceled) {
        if (window.showToast) showToast('DOCX export failed: ' + (dRes.error || 'unknown error'), true);
      }
      return;
    }
  }

  // Standard text/html/md/docx file save using universal export modal
  if (window.saveExportWithDestination) {
    var mime = ext === 'md'
      ? 'text/markdown;charset=utf-8'
      : (ext === 'docx' || ext === 'doc'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'text/html;charset=utf-8');
    var isDocFormat = (currentExportFormat === 'html' || currentExportFormat === 'md');
    var filters = currentExportFormat === 'md'
      ? [{ name: 'Markdown Document (.md)', extensions: ['md'] }, { name: 'All Files', extensions: ['*'] }]
      : (currentExportFormat === 'docx'
        ? [{ name: 'Word Document (.docx)', extensions: ['docx', 'doc'] }, { name: 'All Files', extensions: ['*'] }]
        : [{ name: 'HTML Document (.html)', extensions: ['html'] }, { name: 'All Files', extensions: ['*'] }]);

    await window.saveExportWithDestination({
      filename: filename,
      content: outContent,
      mimeType: mime,
      allowDocEditor: isDocFormat,
      filters: filters,
      modalTitle: 'Export ' + currentExportFormat.toUpperCase()
    });
    return;
  }

  if (window.Desktop && Desktop.isElectron && typeof Desktop.saveFile === 'function') {
    var res = await Desktop.saveFile({
      target: 'toPrint',
      filename: filename,
      content: outContent
    });
    if (res && res.ok && window.showExportSuccessPopup) {
      window.showExportSuccessPopup(res.path || ('toPrint/' + filename), filename);
    } else if (window.showToast) {
      showToast(i18n.tFmt('tcExportedFile', { file: filename }));
    }
  } else {
    // Web fallback
    var mimeType = ext === 'md' ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8';
    var blob = new Blob([outContent], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};

window.tcPreviewExportInBrowser = function () {
  if (!currentTest) return;
  window._tcLastPreviewType = 'single';
  var isTeacher = document.querySelector('input[name="expCopyType"]:checked') ? (document.querySelector('input[name="expCopyType"]:checked').value === 'teacher') : false;
  var activeTheme = tcNormalizeThemeId((currentTest.exportStyle && currentTest.exportStyle.theme) || currentTest.stylesheetTheme || (window.ExportStylesService && ExportStylesService.getSelectedStyle('testCreator')) || localStorage.getItem('cmt_default_test_theme') || 'export-light-neobrutalist.css');

  var html = TestCreatorService.exportToHtml(currentTest, {
    isTeacherKey: isTeacher,
    stylesheetTheme: activeTheme
  });

  var modal = document.getElementById('exportPreviewModal');
  var iframe = document.getElementById('exportPreviewIframe');
  if (iframe) {
    iframe.srcdoc = html;
    iframe.onload = function () {
      if (window.ExportStylesService) {
        var sId = activeTheme || ExportStylesService.getSelectedStyle('testCreator');
        ExportStylesService.applyStyleToIframe(iframe, sId);
      }
    };
  }
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
  if (window.ExportStylesService) {
    ExportStylesService.renderStyleSelector(document.getElementById('tc-preview-style-selector-wrap'), {
      toolKey: 'testCreator',
      currentStyleId: activeTheme,
      onChange: function (styleId) {
        if (currentTest) {
          if (!currentTest.exportStyle) currentTest.exportStyle = {};
          currentTest.exportStyle.theme = styleId;
          currentTest.stylesheetTheme = styleId;
        }
        var pThm = document.getElementById('previewThemeSelect');
        if (pThm && pThm.value !== styleId) pThm.value = styleId;
        var gThm = document.getElementById('globalStyleTheme');
        if (gThm && gThm.value !== styleId) gThm.value = styleId;
        var ifr = document.getElementById('exportPreviewIframe');
        if (ifr) ExportStylesService.applyStyleToIframe(ifr, styleId);
      }
    });
  }
};

window.tcCloseExportPreviewModal = function () {
  var modal = document.getElementById('exportPreviewModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('open');
  }
};

window.tcPrintPreviewIframe = function () {
  var ifr = document.getElementById('exportPreviewIframe');
  if (ifr && ifr.contentWindow) {
    try {
      ifr.contentWindow.focus();
      ifr.contentWindow.print();
    } catch (_) {
      window.print();
    }
  }
};

window.tcOpenPreviewInExternalBrowser = async function () {
  var html = '';
  var fileNameBase = 'Exam';

  if (window._tcLastPreviewType === 'sequence') {
    var seq = (currentTest && currentTest.unitSequence) || (typeof tcEnsureCurrentTestSequence === 'function' ? tcEnsureCurrentTestSequence() : null);
    if (!seq) return;
    await tcLoadSequencesAndItems();
    var fullLessons = [];
    var fullTests = [];
    var lessons = seq.lessons || [];
    for (var i = 0; i < lessons.length; i++) {
      var item = lessons[i];
      if (item.type === 'test') {
        var tObj = (item.id === currentTest.id) ? currentTest : window._tcAllTests.find(function (t) { return t.id === item.id; });
        if (tObj) fullTests.push(tObj);
      } else {
        var lObj = window._tcAllLessons.find(function (l) { return l.id === item.id; });
        if (lObj) fullLessons.push(lObj);
      }
    }
    var opts = tcGetSequenceExportModalOptions();
    if (typeof LessonCreatorService !== 'undefined') {
      html = LessonCreatorService.exportSequenceToHtml(seq, fullLessons, fullTests, opts);
    }
    fileNameBase = tcSanitizeFilename(seq.title, 'Unit_Sequence');
  } else {
    if (!currentTest) return;
    var isTeacher = document.querySelector('input[name="expCopyType"]:checked') ? (document.querySelector('input[name="expCopyType"]:checked').value === 'teacher') : false;
    var activeTheme = tcNormalizeThemeId((currentTest.exportStyle && currentTest.exportStyle.theme) || currentTest.stylesheetTheme || (window.ExportStylesService && ExportStylesService.getSelectedStyle('testCreator')) || localStorage.getItem('cmt_default_test_theme') || 'export-light-neobrutalist.css');
    html = TestCreatorService.exportToHtml(currentTest, { isTeacherKey: isTeacher, stylesheetTheme: activeTheme });
    fileNameBase = tcSanitizeFilename(currentTest.title, 'Exam');
  }

  if (!html) return;
  if (window.ExportStylesService) {
    html = await ExportStylesService.injectStyleIntoHtml(html, ExportStylesService.getSelectedStyle('testCreator'));
  }
  var tempName = '_preview_' + fileNameBase + '.html';

  if (window.Desktop && Desktop.isElectron) {
    try {
      var result = await Desktop.saveText('toPrint', tempName, html);
      var filePath = (result && result.path) || (result && result.file && result.file.path);
      if (filePath && typeof Desktop.openNative === 'function') {
        await Desktop.openNative({ absolutePath: filePath });
      } else if (typeof showToast === 'function') {
        showToast('Preview saved: ' + tempName);
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast(i18n.t("tcBrowserOpenError") + err.message, true);
    }
  } else {
    try {
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var w = window.open(url, '_blank');
      if (!w && typeof showToast === 'function') {
        showToast('Pop-up blocked. Please allow popups.');
      }
    } catch (_) {}
  }
};

window.tcExecuteFromPreview = function () {
  tcCloseExportPreviewModal();
  if (window._tcLastPreviewType === 'sequence') {
    if (typeof tcExecuteSequenceExport === 'function') {
      tcExecuteSequenceExport();
    }
  } else {
    tcExecuteExport();
  }
};

window.tcDirectExport = function (fmt) {
  tcSetExportFormat(fmt);
  tcOpenExportModal();
};

