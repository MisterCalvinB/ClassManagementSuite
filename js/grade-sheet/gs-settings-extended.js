// Extended Grade Sheet Settings (Summary Display, Grading Defaults, Exports & Profile I/O)
// Loaded after gs-banks-and-ref.js in pages/grade-sheet.html.
(function () {
  'use strict';

  function getT(key, fallback) {
    return (typeof t === 'function' ? t(key) : null) || (window.i18n && i18n.t(key)) || fallback;
  }

  function getActiveDraft() {
    if (typeof _summarySettingsDraft !== 'undefined' && _summarySettingsDraft) {
      return _summarySettingsDraft;
    }
    return window.SUMMARY_DISPLAY_SETTINGS || DEFAULT_SUMMARY_DISPLAY_SETTINGS;
  }

  // Generate descending grade step strings for any scale (e.g. 6..1 step 0.5, 20..0 step 1, 100..0 step 10)
  function generateGradeSteps(minVal, maxVal, stepSize) {
    var minN = Number(minVal);
    var maxN = Number(maxVal);
    var stepN = Number(stepSize);
    if (!Number.isFinite(minN) || !Number.isFinite(maxN) || !Number.isFinite(stepN) || stepN <= 0 || maxN <= minN) {
      return [...SUMMARY_GRADE_STEPS];
    }
    var count = Math.floor((maxN - minN) / stepN + 1e-6) + 1;
    // Cap to avoid rendering hundreds of cards if someone enters step 0.01 on 0-100
    if (count > 41) {
      stepN = (maxN - minN) / 20;
    }
    var out = [];
    for (var v = maxN; v >= minN - 1e-6; v -= stepN) {
      var rounded = Math.round(v * 100) / 100;
      if (rounded < minN - 1e-6) break;
      out.push(String(rounded));
    }
    return out.length >= 2 ? out : [...SUMMARY_GRADE_STEPS];
  }

  // Colorblind-safe Okabe-Ito / Viridis-inspired ramp for grade steps
  var COLORBLIND_ANCHORS = ['#0072b2', '#56b4e9', '#f0e442', '#e69f00', '#d55e00'];

  function applyPaletteToSteps(steps, paletteMode) {
    if (!Array.isArray(steps) || steps.length < 2) return {};
    var colors = {};
    var stops;
    if (paletteMode === 'colorblind') {
      stops = COLORBLIND_ANCHORS;
    } else if (paletteMode === 'muted') {
      stops = ['#6abf8e', '#a3c98a', '#e2c96e', '#d4895a', '#c96b6b'];
    } else if (paletteMode === 'high-contrast') {
      stops = ['#047857', '#2563eb', '#eab308', '#ea580c', '#b91c1c'];
    } else {
      stops = ['#1b5e20', '#4caf50', '#f59e0b', '#e65100', '#7f1d1d'];
    }
    var n = steps.length;
    for (var i = 0; i < n; i++) {
      var ratio = i / (n - 1);
      var scaled = ratio * (stops.length - 1);
      var idx = Math.min(stops.length - 2, Math.floor(scaled));
      var localT = scaled - idx;
      colors[steps[i]] = (typeof interpolateHexColor === 'function')
        ? interpolateHexColor(stops[idx], stops[idx + 1], localT)
        : stops[idx];
    }
    return colors;
  }

  function bindCheckbox(id, draft, key, onChange) {
    var el = document.getElementById(id);
    if (!el) return;
    el.checked = !!draft[key];
    el.onchange = function () {
      draft[key] = el.checked;
      if (typeof onChange === 'function') onChange(el.checked);
    };
  }

  function bindSelect(id, draft, key, fallback, onChange) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = draft[key] != null ? String(draft[key]) : String(fallback);
    el.onchange = function () {
      draft[key] = el.value;
      if (typeof onChange === 'function') onChange(el.value);
    };
  }

  function bindNumberInput(id, draft, key, fallback, onChange) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = draft[key] != null ? String(draft[key]) : String(fallback);
    el.onchange = function () {
      var v = parseFloat(el.value);
      draft[key] = Number.isFinite(v) ? v : fallback;
      if (typeof onChange === 'function') onChange(draft[key]);
    };
  }

  function bindTextInput(id, draft, key, fallback, onChange) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = draft[key] != null ? String(draft[key]) : String(fallback || '');
    el.onchange = function () {
      draft[key] = el.value;
      if (typeof onChange === 'function') onChange(el.value);
    };
  }

  function populateDefaultBankSelects(draft) {
    var scaleBankSel = document.getElementById('gs-set-default-scale-bank');
    if (scaleBankSel && typeof populateScaleBankSelectElement === 'function') {
      populateScaleBankSelectElement(scaleBankSel, draft.defaultScaleBank || 'grade-scale-models.js');
      scaleBankSel.value = draft.defaultScaleBank || 'grade-scale-models.js';
      scaleBankSel.onchange = function () {
        draft.defaultScaleBank = scaleBankSel.value;
        populateDefaultScaleModelSelect(draft);
      };
    }
    populateDefaultScaleModelSelect(draft);

    var critBankSel = document.getElementById('gs-set-default-criteria-bank');
    if (critBankSel && typeof populateCriteriaBankSelectElement === 'function') {
      populateCriteriaBankSelectElement(critBankSel, draft.defaultCriteriaBank || 'correction-criteria.js');
      critBankSel.value = draft.defaultCriteriaBank || 'correction-criteria.js';
      critBankSel.onchange = function () {
        draft.defaultCriteriaBank = critBankSel.value;
      };
    }
  }

  function populateDefaultScaleModelSelect(draft) {
    var modelSel = document.getElementById('gs-set-default-scale-model');
    if (!modelSel) return;
    var bankFn = draft.defaultScaleBank || 'grade-scale-models.js';
    var scales = (typeof getScalesForBank === 'function') ? getScalesForBank(bankFn) : [];
    modelSel.innerHTML = '';
    var optNone = document.createElement('option');
    optNone.value = '';
    optNone.textContent = getT('gsSettingDefaultScaleCustom', 'Custom (manual thresholds)');
    modelSel.appendChild(optNone);
    (scales || []).forEach(function (m) {
      if (!m || !m.key) return;
      var opt = document.createElement('option');
      opt.value = m.key;
      opt.textContent = m.label || m.name || m.key;
      modelSel.appendChild(opt);
    });
    modelSel.value = draft.defaultScaleModelKey || '';
    modelSel.onchange = function () {
      draft.defaultScaleModelKey = modelSel.value;
    };
  }

  window.renderExtendedGradeSheetSettings = function (draft) {
    if (!draft) draft = getActiveDraft();

    // Summary Display & Colors additions
    bindSelect('gs-set-color-mode', draft, 'colorMode', 'all', function () {
      if (typeof renderSummaryPreview === 'function') renderSummaryPreview();
    });
    bindSelect('gs-set-color-palette-mode', draft, 'colorPaletteMode', 'standard', function (mode) {
      var steps = (Array.isArray(draft.gradeSteps) && draft.gradeSteps.length >= 2) ? draft.gradeSteps : SUMMARY_GRADE_STEPS;
      draft.gradeColors = applyPaletteToSteps(steps, mode);
      if (typeof renderSummarySettingsTab === 'function') renderSummarySettingsTab();
    });
    bindNumberInput('gs-set-pass-threshold', draft, 'passThreshold', 4);
    bindNumberInput('gs-set-borderline-margin', draft, 'borderlineMargin', 0.25);
    bindCheckbox('gs-set-highlight-failing', draft, 'highlightFailing');
    bindSelect('gs-set-avg-precision', draft, 'avgPrecision', '1');
    bindSelect('gs-set-avg-rounding', draft, 'avgRounding', '0.1');
    bindCheckbox('gs-set-show-stats-footer', draft, 'showStatsFooter');
    bindCheckbox('gs-set-show-rank-col', draft, 'showRankCol');
    bindCheckbox('gs-set-show-comments-col', draft, 'showCommentsCol');
    bindSelect('gs-set-missing-policy', draft, 'missingPolicy', 'exclude');
    bindSelect('gs-set-missing-display', draft, 'missingDisplay', '—');
    bindCheckbox('gs-set-sticky-header', draft, 'stickyHeader');
    bindCheckbox('gs-set-sticky-first-col', draft, 'stickyFirstCol');
    bindSelect('gs-set-table-zoom', draft, 'tableZoom', 'normal');

    // Dynamic scale steps generator
    var btnApplySteps = document.getElementById('gs-btn-generate-steps');
    if (btnApplySteps) {
      btnApplySteps.onclick = function () {
        var minEl = document.getElementById('gs-set-steps-min');
        var maxEl = document.getElementById('gs-set-steps-max');
        var stepEl = document.getElementById('gs-set-steps-inc');
        var minV = minEl ? parseFloat(minEl.value) : 1;
        var maxV = maxEl ? parseFloat(maxEl.value) : 6;
        var incV = stepEl ? parseFloat(stepEl.value) : 0.5;
        var newSteps = generateGradeSteps(minV, maxV, incV);
        draft.gradeSteps = newSteps;
        draft.anchors = [newSteps[0], newSteps[Math.floor(newSteps.length / 2)], newSteps[newSteps.length - 1]];
        draft.gradeColors = applyPaletteToSteps(newSteps, draft.colorPaletteMode || 'standard');
        if (typeof renderSummarySettingsTab === 'function') renderSummarySettingsTab();
      };
    }

    // Grading & Calculation Defaults tab
    bindNumberInput('gs-set-default-test-weight', draft, 'defaultTestWeight', 1);
    bindSelect('gs-set-default-grading-mode', draft, 'defaultGradingMode', 'manual');
    bindSelect('gs-set-default-points-rounding', draft, 'defaultPointsRounding', '0.5');
    bindNumberInput('gs-set-term1-weight', draft, 'term1Weight', 50);
    bindNumberInput('gs-set-term2-weight', draft, 'term2Weight', 50);
    bindCheckbox('gs-set-cap-grade-max', draft, 'capGradeAtMax');
    populateDefaultBankSelects(draft);

    // Name Display, Export & Workflow Defaults
    var nameFmtSel = document.getElementById('gs-set-default-name-format');
    if (nameFmtSel) {
      nameFmtSel.value = draft.defaultNameFormat || (typeof getGsNameDisplayMode === 'function' ? getGsNameDisplayMode() : 'full');
      nameFmtSel.onchange = function () {
        draft.defaultNameFormat = nameFmtSel.value;
      };
    }
    bindTextInput('gs-set-report-teacher', draft, 'reportTeacherName', '');
    bindTextInput('gs-set-report-school', draft, 'reportSchoolName', '');
    bindTextInput('gs-set-report-subject', draft, 'reportSubjectName', '');
    bindCheckbox('gs-set-confirm-delete', draft, 'confirmBeforeDelete');

    // Profile Export / Import
    var btnExportProfile = document.getElementById('gs-btn-export-settings-profile');
    if (btnExportProfile) {
      btnExportProfile.onclick = window.exportGsSettingsProfile;
    }
    var btnImportProfile = document.getElementById('gs-btn-import-settings-profile');
    if (btnImportProfile) {
      btnImportProfile.onclick = window.importGsSettingsProfile;
    }
  };

  window.exportGsSettingsProfile = async function () {
    var payload = {
      exportedAt: new Date().toISOString(),
      app: 'Class Management Tools - Grade Sheet',
      summaryDisplaySettings: window.SUMMARY_DISPLAY_SETTINGS || DEFAULT_SUMMARY_DISPLAY_SETTINGS,
      nameDisplayMode: typeof getGsNameDisplayMode === 'function' ? getGsNameDisplayMode() : 'full'
    };
    var jsonStr = JSON.stringify(payload, null, 2);
    var filename = 'grade-sheet-settings-' + new Date().toISOString().slice(0, 10) + '.json';
    if (window.Desktop && Desktop.isElectron() && typeof Desktop.saveText === 'function') {
      var res = await Desktop.saveText('user', filename, jsonStr);
      if (res && res.ok && typeof showExportSuccessPopup === 'function') {
        showExportSuccessPopup(res.path || filename, filename, false);
        return;
      }
    }
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    if (typeof showToast === 'function') showToast(getT('gsSettingsProfileExported', 'Settings profile exported!'));
  };

  window.importGsSettingsProfile = function () {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = function () {
      var file = inp.files && inp.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(String(reader.result || '{}'));
          var imported = parsed.summaryDisplaySettings || parsed;
          if (!imported || typeof imported !== 'object' || !imported.gradeColors) {
            if (typeof showToast === 'function') showToast(getT('gsSettingsProfileInvalid', 'Invalid settings profile file.'), true);
            return;
          }
          window.SUMMARY_DISPLAY_SETTINGS = Object.assign({}, DEFAULT_SUMMARY_DISPLAY_SETTINGS, imported);
          try { localStorage.setItem('cmt-summary-display-settings', JSON.stringify(window.SUMMARY_DISPLAY_SETTINGS)); } catch (_) {}
          if (parsed.nameDisplayMode && typeof setGsNameDisplayMode === 'function') {
            setGsNameDisplayMode(parsed.nameDisplayMode);
          }
          if (typeof _summarySettingsDraft !== 'undefined') {
            _summarySettingsDraft = JSON.parse(JSON.stringify(window.SUMMARY_DISPLAY_SETTINGS));
          }
          if (typeof renderSummarySettingsTab === 'function') renderSummarySettingsTab();
          if (typeof applySummaryDisplaySettingsToDOM === 'function') applySummaryDisplaySettingsToDOM();
          if (typeof renderSummary === 'function') renderSummary();
          if (typeof showToast === 'function') showToast(getT('gsSettingsProfileImported', 'Settings profile imported!'));
        } catch (err) {
          if (typeof showToast === 'function') showToast(getT('gsSettingsProfileInvalid', 'Invalid settings profile file.'), true);
        }
      };
      reader.readAsText(file);
    };
    inp.click();
  };
})();
