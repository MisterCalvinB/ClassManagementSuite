/**
 * Setup Wizard Controller
 * Handles configuration auto-detection, inline quick-saves, sample demo data loading,
 * and progress tracking across the 7 setup pillars of Class Management Tools.
 */

(function () {
  'use strict';

  var TOTAL_STEPS = 7;
  var stepStates = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false
  };

  var manualOverrides = {};
  try {
    manualOverrides = JSON.parse(localStorage.getItem('cmt-setup-manual-overrides') || '{}');
  } catch (e) {
    manualOverrides = {};
  }

  // ── Helper: Safe File Reading via Desktop ──────────────────
  async function readUserText(filename) {
    if (!window.Desktop || typeof Desktop.readText !== 'function') return null;
    try {
      var res = await Desktop.readText('user', filename);
      if (res && res.ok && typeof res.content === 'string') return res.content;
      if (typeof res === 'string') return res;
      return null;
    } catch (e) {
      return null;
    }
  }

  async function saveUserText(filename, content) {
    if (!window.Desktop || typeof Desktop.saveText !== 'function') {
      try {
        localStorage.setItem('cmt_mock_' + filename, content);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }
    try {
      return await Desktop.saveText('user', filename, content);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ── Helpers: Safe JS-Data Evaluators (handle const/let/var & window.*) ──
  function parseJsGlobals(raw, varNames) {
    if (!raw || typeof raw !== 'string') return null;
    try {
      var retParts = varNames.map(function (name) {
        return JSON.stringify(name) + ': (typeof ' + name + ' !== "undefined" ? ' + name + ' : (window[' + JSON.stringify(name) + '] !== undefined ? window[' + JSON.stringify(name) + '] : null))';
      });
      var sandbox = {};
      var fn = new Function('window', raw + '\nreturn {\n' + retParts.join(',\n') + '\n};');
      return fn(sandbox);
    } catch (e) {
      return null;
    }
  }

  function parseClassGroupsContent(raw) {
    return parseJsGlobals(raw, ['CLASS_GROUPS', 'CLASS_GROUPS_META', 'CLASS_GROUPS_DATA']);
  }

  function parsePlannerConfigContent(raw) {
    var parsed = parseJsGlobals(raw, ['PLANNER_CONFIG']);
    return parsed ? parsed.PLANNER_CONFIG : null;
  }

  async function confirmOverwriteIfNeeded(shouldWarn, i18nKey, fallbackMsg) {
    if (!shouldWarn) return true;
    var msg = (window.i18n && i18n.t(i18nKey)) || fallbackMsg;
    if (window.showConfirm) {
      return await showConfirm(msg);
    }
    return window.confirm(msg);
  }

  // ── Step 1 Auto-Detection: Language & Data Folder ──────────
  async function checkStep1() {
    var lang = (window.i18n && typeof i18n.getLang === 'function') ? i18n.getLang() : localStorage.getItem('cmt-lang');
    var hasLang = !!(lang && ['en', 'fr', 'de', 'it'].indexOf(lang) >= 0);
    return hasLang;
  }

  // ── Step 2 Auto-Detection: Class Groups & Rosters ──────────
  async function checkStep2() {
    if (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS && Object.keys(CLASS_GROUPS).length > 0) {
      var keys = Object.keys(CLASS_GROUPS);
      for (var i = 0; i < keys.length; i++) {
        if (Array.isArray(CLASS_GROUPS[keys[i]]) && CLASS_GROUPS[keys[i]].length > 0) return true;
      }
    }
    var raw = await readUserText('class-groups.js');
    var parsed = parseClassGroupsContent(raw);
    if (!parsed) return false;
    var groups = parsed.CLASS_GROUPS || (parsed.CLASS_GROUPS_DATA && parsed.CLASS_GROUPS_DATA.classGroups);
    if (groups && typeof groups === 'object') {
      var gKeys = Object.keys(groups);
      for (var j = 0; j < gKeys.length; j++) {
        if (Array.isArray(groups[gKeys[j]]) && groups[gKeys[j]].length > 0) return true;
      }
    }
    var meta = parsed.CLASS_GROUPS_META || (parsed.CLASS_GROUPS_DATA && parsed.CLASS_GROUPS_DATA.classGroupsMeta);
    if (meta && typeof meta === 'object') {
      var mKeys = Object.keys(meta);
      for (var m = 0; m < mKeys.length; m++) {
        var entry = meta[mKeys[m]];
        if (entry && !entry.archived && (entry.name || (Array.isArray(entry.students) && entry.students.length > 0))) {
          return true;
        }
      }
    }
    return false;
  }

  // ── Step 3 Auto-Detection & Hydration: Semester Dates ──────
  async function checkStep3() {
    var raw = await readUserText('planner-config.js');
    var cfg = parsePlannerConfigContent(raw);
    if (cfg && Array.isArray(cfg.semesters) && cfg.semesters.length > 0) {
      hydrateStep3FromConfig(cfg);
      return cfg.semesters.some(function (s) {
        return s && s.semesterStart && s.semesterEnd;
      });
    }
    // Fallback: check CLASS_GROUPS_DATA active semester info from class-groups.js
    var cgRaw = await readUserText('class-groups.js');
    var cgParsed = parseClassGroupsContent(cgRaw);
    var cgData = cgParsed && cgParsed.CLASS_GROUPS_DATA;
    if (cgData && (cgData.activeYear || cgData.activeSemesterStart || cgData.activeSemesterEnd)) {
      hydrateStep3FromClassGroupsData(cgData);
      return !!(cgData.activeSemesterStart && cgData.activeSemesterEnd);
    }
    return false;
  }

  function hydrateStep3FromClassGroupsData(cgData) {
    if (!cgData) return;
    var yearEl = document.getElementById('swAcademicYear');
    var s1StartEl = document.getElementById('swS1Start');
    var s1EndEl = document.getElementById('swS1End');
    var s2StartEl = document.getElementById('swS2Start');
    var s2EndEl = document.getElementById('swS2End');
    if (yearEl && cgData.activeYear) yearEl.value = cgData.activeYear;
    var isSem2 = cgData.activeSemester === 2 || cgData.activeSemester === '2';
    if (isSem2) {
      if (s2StartEl && cgData.activeSemesterStart) s2StartEl.value = cgData.activeSemesterStart;
      if (s2EndEl && cgData.activeSemesterEnd) s2EndEl.value = cgData.activeSemesterEnd;
    } else {
      if (s1StartEl && cgData.activeSemesterStart) s1StartEl.value = cgData.activeSemesterStart;
      if (s1EndEl && cgData.activeSemesterEnd) s1EndEl.value = cgData.activeSemesterEnd;
    }
  }

  function hydrateStep3FromConfig(cfg) {
    if (!cfg || !Array.isArray(cfg.semesters) || !cfg.semesters.length) return;
    var activeSem = null;
    if (cfg.activeSemesterId) {
      activeSem = cfg.semesters.find(function (s) { return s && s.id === cfg.activeSemesterId; }) || null;
    }
    if (!activeSem) activeSem = cfg.semesters[0];

    var targetYear = activeSem && activeSem.year ? activeSem.year : '';
    var yearSemesters = targetYear
      ? cfg.semesters.filter(function (s) { return s && s.year === targetYear; })
      : cfg.semesters.slice();

    if (!yearSemesters.length) yearSemesters = [activeSem];

    var s1 = yearSemesters.find(function (s) { return s && (/s1|sem(ester)?\s*1/i.test(String(s.id || '') + ' ' + String(s.label || ''))); }) || yearSemesters[0];
    var s2 = yearSemesters.find(function (s) { return s && s !== s1 && (/s2|sem(ester)?\s*2/i.test(String(s.id || '') + ' ' + String(s.label || ''))); }) || yearSemesters[1] || null;

    var yearEl = document.getElementById('swAcademicYear');
    var s1StartEl = document.getElementById('swS1Start');
    var s1EndEl = document.getElementById('swS1End');
    var s2StartEl = document.getElementById('swS2Start');
    var s2EndEl = document.getElementById('swS2End');

    if (yearEl && targetYear) yearEl.value = targetYear;
    if (s1) {
      if (s1StartEl && s1.semesterStart) s1StartEl.value = s1.semesterStart;
      if (s1EndEl && s1.semesterEnd) s1EndEl.value = s1.semesterEnd;
    }
    if (s2) {
      if (s2StartEl && s2.semesterStart) s2StartEl.value = s2.semesterStart;
      if (s2EndEl && s2.semesterEnd) s2EndEl.value = s2.semesterEnd;
    }
  }

  // ── Step 4 Auto-Detection & Hydration: Timetable Periods ───
  async function checkStep4() {
    var raw = await readUserText('planner-config.js');
    var cfg = parsePlannerConfigContent(raw);
    if (!cfg) return false;
    if (Array.isArray(cfg.periods) && cfg.periods.length > 0) {
      hydrateStep4FromPeriods(cfg.periods);
      return true;
    }
    if (cfg.classes && typeof cfg.classes === 'object') {
      var hasSched = Object.keys(cfg.classes).some(function (cid) {
        var c = cfg.classes[cid];
        return c && Array.isArray(c.schedule) && c.schedule.length > 0;
      });
      if (hasSched) return true;
    }
    return false;
  }

  function hydrateStep4FromPeriods(periods) {
    if (!Array.isArray(periods) || !periods.length) return;
    var p = periods[0];
    if (!p || !p.start || !p.end) return;
    var sm = String(p.start).split(':');
    var em = String(p.end).split(':');
    if (sm.length < 2 || em.length < 2) return;
    var mins = (parseInt(em[0], 10) * 60 + parseInt(em[1], 10)) - (parseInt(sm[0], 10) * 60 + parseInt(sm[1], 10));
    var preset = '45';
    if (mins >= 55) preset = '60';
    else if (mins >= 48) preset = '50';
    var radio = document.querySelector('input[name="swPeriodPreset"][value="' + preset + '"]');
    if (radio) radio.checked = true;
  }

  // ── Step 5 Auto-Detection & Hydration: Grading Scales ──────
  async function checkStep5() {
    var rawScales = await readUserText('grade-scale-models.js');
    var rawCriteria = await readUserText('correction-criteria.js');
    var parsedScales = parseJsGlobals(rawScales, ['XLSM_SCALE_MODELS']);
    if (parsedScales && Array.isArray(parsedScales.XLSM_SCALE_MODELS) && parsedScales.XLSM_SCALE_MODELS.length > 0) {
      hydrateStep5FromScales(parsedScales.XLSM_SCALE_MODELS);
      return true;
    }
    if (rawScales && rawScales.includes('XLSM_SCALE_MODELS')) return true;
    if (rawCriteria && rawCriteria.includes('XLSM_CRITERIA')) return true;
    return false;
  }

  function hydrateStep5FromScales(models) {
    if (!Array.isArray(models) || !models.length) return;
    var m = models[0] || {};
    var key = 'swiss';
    if (m.id === 'french-standard' || m.maxGrade === 20) key = 'french';
    else if (m.id === 'us-letter' || m.maxGrade === 'A' || m.thresholds) key = 'us';
    else if (m.id === 'percent-scale' || m.maxGrade === 100) key = 'percent';
    var radio = document.querySelector('input[name="swScale"][value="' + key + '"]');
    if (radio) radio.checked = true;
  }

  // ── Step 6 Auto-Detection & Hydration: Observation Chips ───
  async function checkStep6() {
    var raw = await readUserText('correction-criteria.js');
    var parsed = parseJsGlobals(raw, ['OBSERVATION_CHECKLIST_GROUPS']);
    if (parsed && Array.isArray(parsed.OBSERVATION_CHECKLIST_GROUPS) && parsed.OBSERVATION_CHECKLIST_GROUPS.length > 0) {
      hydrateStep6Chips(parsed.OBSERVATION_CHECKLIST_GROUPS);
      return true;
    }
    try {
      var ls = localStorage.getItem('gradeSheetPersonalisedChips.v1');
      if (ls) {
        var arr = JSON.parse(ls);
        if (Array.isArray(arr) && arr.length > 0) return true;
      }
    } catch (_) {}
    return false;
  }

  function hydrateStep6Chips(groups) {
    var container = document.getElementById('swChipsPreviewList');
    if (!container || !Array.isArray(groups) || !groups.length) return;
    var chips = [];
    groups.forEach(function (g) {
      if (g && Array.isArray(g.chips)) {
        g.chips.forEach(function (c) {
          if (c && c.text) chips.push(c);
        });
      }
    });
    if (!chips.length) return;
    container.innerHTML = '';
    chips.slice(0, 8).forEach(function (c) {
      var span = document.createElement('span');
      var cls = 'sw-tag-item ' + (c.type === 'negative' || (typeof c.multiplier === 'number' && c.multiplier < 0) ? 'sw-tag-neg' : (c.type === 'bonus' ? 'sw-tag-warn' : 'sw-tag-pos'));
      span.className = cls;
      span.textContent = c.text;
      container.appendChild(span);
    });
  }

  // ── Step 7 Auto-Detection & Hydration: Seating Plans ───────
  async function checkStep7() {
    if (!window.Desktop || typeof Desktop.readByPath !== 'function') return false;
    try {
      var res = await Desktop.readByPath('user', 'class-plans/plans.js');
      if (res && res.ok && res.content) {
        var parsed = parseJsGlobals(res.content, ['SAVED_CLASS_PLANS']);
        var plans = parsed ? parsed.SAVED_CLASS_PLANS : null;
        if (plans && Object.keys(plans).length > 0) {
          hydrateStep7FromPlans(plans);
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  function hydrateStep7FromPlans(plans) {
    if (!plans || typeof plans !== 'object') return;
    var keys = Object.keys(plans);
    for (var i = 0; i < keys.length; i++) {
      var list = plans[keys[i]];
      if (Array.isArray(list) && list.length > 0 && list[0] && list[0].layoutType) {
        var radio = document.querySelector('input[name="swLayout"][value="' + list[0].layoutType + '"]');
        if (radio) radio.checked = true;
        return;
      }
    }
  }

  // ── Run Auto-Detection Across All Steps ─────────────────────
  async function detectAllSteps() {
    var auto1 = await checkStep1();
    var auto2 = await checkStep2();
    var auto3 = await checkStep3();
    var auto4 = await checkStep4();
    var auto5 = await checkStep5();
    var auto6 = await checkStep6();
    var auto7 = await checkStep7();

    stepStates[1] = typeof manualOverrides[1] === 'boolean' ? manualOverrides[1] : auto1;
    stepStates[2] = typeof manualOverrides[2] === 'boolean' ? manualOverrides[2] : auto2;
    stepStates[3] = typeof manualOverrides[3] === 'boolean' ? manualOverrides[3] : auto3;
    stepStates[4] = typeof manualOverrides[4] === 'boolean' ? manualOverrides[4] : auto4;
    stepStates[5] = typeof manualOverrides[5] === 'boolean' ? manualOverrides[5] : auto5;
    stepStates[6] = typeof manualOverrides[6] === 'boolean' ? manualOverrides[6] : auto6;
    stepStates[7] = typeof manualOverrides[7] === 'boolean' ? manualOverrides[7] : auto7;

    renderProgress();
    renderStepStatuses();
    loadExistingClassesDisplay();
  }

  // ── Progress UI Renderer ───────────────────────────────────
  function renderProgress() {
    var doneCount = 0;
    for (var i = 1; i <= TOTAL_STEPS; i++) {
      if (stepStates[i]) doneCount++;
    }

    var pct = Math.round((doneCount / TOTAL_STEPS) * 100);
    var trackEl = document.getElementById('swProgressFill');
    var pctEl = document.getElementById('swProgressPct');
    var countEl = document.getElementById('swProgressCount');
    var bannerEl = document.getElementById('swAllDoneBanner');

    if (trackEl) trackEl.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (countEl) {
      var tpl = i18n.t('swProgressLabel') || '{done} of {total} completed';
      countEl.textContent = tpl.replace('{done}', doneCount).replace('{total}', TOTAL_STEPS);
    }

    if (bannerEl) {
      bannerEl.classList.toggle('show', doneCount === TOTAL_STEPS);
    }

    // Persist progress cache for launcher header badge
    try {
      localStorage.setItem('cmt-setup-progress', JSON.stringify({ done: doneCount, total: TOTAL_STEPS }));
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'cmt-setup-progress-changed', done: doneCount, total: TOTAL_STEPS }, '*');
      }
    } catch (_) {}
  }

  function renderStepStatuses() {
    for (var i = 1; i <= TOTAL_STEPS; i++) {
      var card = document.getElementById('swStepCard' + i);
      var pill = document.getElementById('swStatusPill' + i);
      var toggleBtn = document.getElementById('swToggleBtn' + i);
      var isDone = !!stepStates[i];

      if (card) {
        card.classList.toggle('completed', isDone);
      }
      if (pill) {
        pill.className = 'sw-status-pill ' + (isDone ? 'done' : 'pending');
        pill.textContent = isDone ? (i18n.t('swStepCompleted') || 'Completed') : (i18n.t('swStepPending') || 'Needs setup');
      }
      if (toggleBtn) {
        toggleBtn.textContent = isDone ? (i18n.t('swMarkPending') || 'Mark as pending') : (i18n.t('swMarkDone') || 'Mark as done');
      }
    }
  }

  // ── Manual Checkmark Override Toggle ───────────────────────
  window.swToggleStep = function (stepNum) {
    stepStates[stepNum] = !stepStates[stepNum];
    manualOverrides[stepNum] = stepStates[stepNum];
    try {
      localStorage.setItem('cmt-setup-manual-overrides', JSON.stringify(manualOverrides));
    } catch (_) {}
    renderProgress();
    renderStepStatuses();
    if (window.showToast) {
      showToast(stepStates[stepNum] ? (i18n.t('saved') || 'Marked completed') : (i18n.t('swStepPending') || 'Marked pending'));
    }
  };

  // ── Accordion Open / Close Toggle ──────────────────────────
  window.swToggleAccordion = function (stepNum) {
    var card = document.getElementById('swStepCard' + stepNum);
    if (!card) return;
    card.classList.toggle('open');
  };

  // ── Navigation Helper: Open Tool ───────────────────────────
  window.swOpenTool = function (pageFile) {
    var clean = String(pageFile || '').replace(/^[./\\]*pages[/\\]/, '');
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'cmt-open-app', pageFile: clean }, '*');
      return;
    }
    if (window.Desktop && typeof Desktop.openTool === 'function') {
      Desktop.openTool(clean);
    } else {
      window.open(clean, '_blank');
    }
  };

  // ── Step 1: Save Language & Storage ────────────────────────
  window.swSaveStep1 = function () {
    var selectedRadio = document.querySelector('input[name="swLang"]:checked');
    if (selectedRadio && selectedRadio.value) {
      var lang = selectedRadio.value;
      try {
        var cfg = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
        cfg.language = lang;
        localStorage.setItem('cmt-general-config', JSON.stringify(cfg));
        localStorage.removeItem('cmt-lang-setup-wizard');
        localStorage.setItem('cmt-lang-launcher', lang);
      } catch (_) {}
      if (window.i18n && typeof i18n.ensureLangLoaded === 'function') {
        i18n.ensureLangLoaded(lang, function () {
          if (typeof i18n.applyTranslations === 'function') i18n.applyTranslations();
          renderProgress();
          renderStepStatuses();
          loadExistingClassesDisplay();
        });
      }
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'cmt-lang-changed', lang: lang }, '*');
      }
    }
    stepStates[1] = true;
    manualOverrides[1] = true;
    saveOverrides();
    renderProgress();
    renderStepStatuses();
    showToast(i18n.t('swSaved') || 'Saved!');
  };

  // ── Step 2: Quick Add Class ────────────────────────────────
  async function loadExistingClassesDisplay() {
    var container = document.getElementById('swExistingClassesList');
    if (!container) return;
    container.innerHTML = '';

    var classNames = [];
    var seenKeys = {};
    var raw = await readUserText('class-groups.js');
    var parsed = parseClassGroupsContent(raw);
    if (parsed) {
      var groups = parsed.CLASS_GROUPS || (parsed.CLASS_GROUPS_DATA && parsed.CLASS_GROUPS_DATA.classGroups) || {};
      var meta = parsed.CLASS_GROUPS_META || (parsed.CLASS_GROUPS_DATA && parsed.CLASS_GROUPS_DATA.classGroupsMeta) || {};
      Object.keys(groups).forEach(function (k) {
        seenKeys[k] = true;
        var m = meta[k];
        if (m && m.archived) return;
        classNames.push((m && m.name) ? m.name : k);
      });
      Object.keys(meta).forEach(function (k) {
        if (seenKeys[k]) return;
        var m = meta[k];
        if (!m || m.archived) return;
        classNames.push(m.name || k);
      });
    }

    if (!classNames.length) {
      container.innerHTML = '<span class="sw-hint">' + (i18n.t('swStep2NoClasses') || 'No classes added yet.') + '</span>';
      return;
    }

    classNames.forEach(function (name) {
      var tag = document.createElement('span');
      tag.className = 'sw-tag-item';
      tag.textContent = name;
      container.appendChild(tag);
    });
  }

  window.swQuickAddClass = async function () {
    var nameInp = document.getElementById('swClassNameInput');
    var studInp = document.getElementById('swStudentsInput');
    var clsName = nameInp ? nameInp.value.trim() : '';
    if (!clsName) {
      showToast(i18n.t('swStep2EnterClassName') || 'Please enter a class name.', true);
      if (nameInp) nameInp.focus();
      return;
    }

    var rawLines = studInp ? studInp.value.split(/[\r\n,]+/) : [];
    var students = rawLines.map(function (s) { return s.trim(); }).filter(Boolean);
    if (!students.length) {
      students = ['STUDENT 1', 'STUDENT 2', 'STUDENT 3'];
    }

    // Read current class-groups.js
    var groups = {};
    var meta = {};
    var cgData = null;
    var raw = await readUserText('class-groups.js');
    var parsed = parseClassGroupsContent(raw);
    if (parsed) {
      if (parsed.CLASS_GROUPS) groups = parsed.CLASS_GROUPS;
      if (parsed.CLASS_GROUPS_META) meta = parsed.CLASS_GROUPS_META;
      if (parsed.CLASS_GROUPS_DATA) cgData = parsed.CLASS_GROUPS_DATA;
    }

    var content;
    if (cgData && cgData.classGroupsMeta) {
      var existingMetaKey = Object.keys(cgData.classGroupsMeta).find(function (k) {
        var entry = cgData.classGroupsMeta[k];
        return entry && !entry.archived && String(entry.name || k).trim().toLowerCase() === clsName.toLowerCase();
      });
      if (existingMetaKey) {
        var okOverwriteCls = await confirmOverwriteIfNeeded(
          true,
          'swConfirmOverwriteClass',
          'A class with this name already exists in user/class-groups.js. Overwrite its roster?'
        );
        if (!okOverwriteCls) return;
        cgData.classGroupsMeta[existingMetaKey].students = students;
      } else {
        var uuid = (window.crypto && typeof window.crypto.randomUUID === 'function')
          ? window.crypto.randomUUID()
          : ('cls-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
        cgData.classGroupsMeta[uuid] = {
          year: cgData.activeYear || (new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)),
          semester: cgData.activeSemester || 1,
          level: '',
          name: clsName,
          students: students
        };
      }
      content = 'const CLASS_GROUPS_DATA = ' + JSON.stringify(cgData, null, 2) + ';\n\n' +
        'var CLASS_GROUPS_META = CLASS_GROUPS_DATA.classGroupsMeta || {};\n';
    } else {
      if (groups[clsName]) {
        var okOverwriteLegacy = await confirmOverwriteIfNeeded(
          true,
          'swConfirmOverwriteClass',
          'A class with this name already exists in user/class-groups.js. Overwrite its roster?'
        );
        if (!okOverwriteLegacy) return;
      }
      groups[clsName] = students;
      meta[clsName] = {
        year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        semester: 1,
        level: ''
      };
      content = 'const CLASS_GROUPS = ' + JSON.stringify(groups, null, 2) + ';\n\n' +
        'const CLASS_GROUPS_META = ' + JSON.stringify(meta, null, 2) + ';\n';
    }

    await saveUserText('class-groups.js', content);

    if (nameInp) nameInp.value = '';
    if (studInp) studInp.value = '';

    stepStates[2] = true;
    manualOverrides[2] = true;
    saveOverrides();
    renderProgress();
    renderStepStatuses();
    loadExistingClassesDisplay();
    showToast(i18n.t('swSaved') || 'Saved!');
  };

  // ── Step 3: Save Semester Dates ────────────────────────────
  window.swSaveSemesterDates = async function () {
    var year = (document.getElementById('swAcademicYear') || {}).value || '2025-2026';
    var s1Start = (document.getElementById('swS1Start') || {}).value || '2025-08-18';
    var s1End = (document.getElementById('swS1End') || {}).value || '2026-01-23';
    var s2Start = (document.getElementById('swS2Start') || {}).value || '2026-02-09';
    var s2End = (document.getElementById('swS2End') || {}).value || '2026-06-26';

    var cfg = { semesters: [], classes: {}, customFields: [], customTypes: [], subscriptions: [] };
    var raw = await readUserText('planner-config.js');
    var existingCfg = parsePlannerConfigContent(raw);
    if (existingCfg) cfg = existingCfg;

    var existingSemesters = Array.isArray(cfg.semesters) ? cfg.semesters : [];
    var otherSemesters = existingSemesters.filter(function (s) { return s && s.year !== year; });
    var prevS1 = existingSemesters.find(function (s) { return s && s.year === year && (/s1|sem(ester)?\s*1/i.test(String(s.id || '') + ' ' + String(s.label || ''))); });
    var prevS2 = existingSemesters.find(function (s) { return s && s.year === year && (/s2|sem(ester)?\s*2/i.test(String(s.id || '') + ' ' + String(s.label || ''))); });

    var newS1 = {
      id: (prevS1 && prevS1.id) || ('sem-s1-' + Date.now()),
      label: (prevS1 && prevS1.label) || 'Semester 1',
      year: year,
      semesterStart: s1Start,
      semesterEnd: s1End,
      holidays: (prevS1 && Array.isArray(prevS1.holidays)) ? prevS1.holidays : [],
      noClassRanges: (prevS1 && Array.isArray(prevS1.noClassRanges)) ? prevS1.noClassRanges : []
    };
    var newS2 = {
      id: (prevS2 && prevS2.id) || ('sem-s2-' + Date.now()),
      label: (prevS2 && prevS2.label) || 'Semester 2',
      year: year,
      semesterStart: s2Start,
      semesterEnd: s2End,
      holidays: (prevS2 && Array.isArray(prevS2.holidays)) ? prevS2.holidays : [],
      noClassRanges: (prevS2 && Array.isArray(prevS2.noClassRanges)) ? prevS2.noClassRanges : []
    };

    cfg.semesters = otherSemesters.concat([newS1, newS2]);
    if (!cfg.activeSemesterId || !cfg.semesters.some(function (s) { return s.id === cfg.activeSemesterId; })) {
      cfg.activeSemesterId = newS1.id;
    }

    var content = 'window.PLANNER_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n';
    await saveUserText('planner-config.js', content);

    stepStates[3] = true;
    manualOverrides[3] = true;
    saveOverrides();
    renderProgress();
    renderStepStatuses();
    showToast(i18n.t('swSaved') || 'Saved!');
  };

  // ── Step 4: Save Timetable Periods ─────────────────────────
  window.swSavePeriods = async function () {
    var presetRadio = document.querySelector('input[name="swPeriodPreset"]:checked');
    var preset = presetRadio ? presetRadio.value : '45';

    var periods = [];
    if (preset === '45') {
      periods = [
        { name: 'P1', start: '08:00', end: '08:45' },
        { name: 'P2', start: '08:50', end: '09:35' },
        { name: 'P3', start: '09:50', end: '10:35' },
        { name: 'P4', start: '10:40', end: '11:25' },
        { name: 'P5', start: '13:30', end: '14:15' },
        { name: 'P6', start: '14:20', end: '15:05' }
      ];
    } else if (preset === '50') {
      periods = [
        { name: 'P1', start: '08:00', end: '08:50' },
        { name: 'P2', start: '08:55', end: '09:45' },
        { name: 'P3', start: '10:05', end: '10:55' },
        { name: 'P4', start: '11:00', end: '11:50' },
        { name: 'P5', start: '13:45', end: '14:35' },
        { name: 'P6', start: '14:40', end: '15:30' }
      ];
    } else {
      periods = [
        { name: 'P1', start: '08:00', end: '09:00' },
        { name: 'P2', start: '09:15', end: '10:15' },
        { name: 'P3', start: '10:30', end: '11:30' },
        { name: 'P4', start: '13:30', end: '14:30' },
        { name: 'P5', start: '14:45', end: '15:45' }
      ];
    }

    var cfg = { semesters: [], classes: {}, periods: [] };
    var raw = await readUserText('planner-config.js');
    var existingCfg = parsePlannerConfigContent(raw);
    if (existingCfg) cfg = existingCfg;

    if (Array.isArray(cfg.periods) && cfg.periods.length > 0) {
      var okOverwritePeriods = await confirmOverwriteIfNeeded(
        true,
        'swConfirmOverwritePeriods',
        'Existing timetable periods were found in user/planner-config.js. Overwrite them with this preset?'
      );
      if (!okOverwritePeriods) return;
    }

    cfg.periods = periods;
    var content = 'window.PLANNER_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n';
    await saveUserText('planner-config.js', content);

    stepStates[4] = true;
    manualOverrides[4] = true;
    saveOverrides();
    renderProgress();
    renderStepStatuses();
    showToast(i18n.t('swSaved') || 'Saved!');
  };

  // ── Step 5: Save Grading Scales ────────────────────────────
  window.swSaveGradingScale = async function () {
    var existingRaw = await readUserText('grade-scale-models.js');
    var parsedExisting = parseJsGlobals(existingRaw, ['XLSM_SCALE_MODELS']);
    var hasExistingScales = !!(
      (parsedExisting && Array.isArray(parsedExisting.XLSM_SCALE_MODELS) && parsedExisting.XLSM_SCALE_MODELS.length > 0) ||
      (existingRaw && existingRaw.trim().length > 0)
    );
    var okOverwriteScales = await confirmOverwriteIfNeeded(
      hasExistingScales,
      'swConfirmOverwriteScales',
      'user/grade-scale-models.js already contains grading scale models. Overwriting will replace your existing models. Continue?'
    );
    if (!okOverwriteScales) return;

    var scaleRadio = document.querySelector('input[name="swScale"]:checked');
    var scaleKey = scaleRadio ? scaleRadio.value : 'swiss';

    var scaleModels = [];
    if (scaleKey === 'swiss') {
      scaleModels = [
        {
          id: 'swiss-standard',
          name: 'Swiss Standard (1.0 to 6.0)',
          minGrade: 1.0,
          maxGrade: 6.0,
          passThreshold: 4.0,
          step: 0.1,
          rounding: 0.5
        }
      ];
    } else if (scaleKey === 'french') {
      scaleModels = [
        {
          id: 'french-standard',
          name: 'French Standard (0 to 20)',
          minGrade: 0,
          maxGrade: 20,
          passThreshold: 10,
          step: 0.25,
          rounding: 0.25
        }
      ];
    } else if (scaleKey === 'us') {
      scaleModels = [
        {
          id: 'us-letter',
          name: 'US Letter Grades (A-F)',
          minGrade: 'F',
          maxGrade: 'A',
          passThreshold: 'D',
          thresholds: { A: 90, B: 80, C: 70, D: 60, F: 0 }
        }
      ];
    } else {
      scaleModels = [
        {
          id: 'percent-scale',
          name: 'Percentage (0-100%)',
          minGrade: 0,
          maxGrade: 100,
          passThreshold: 60,
          step: 1
        }
      ];
    }

    var content = '// XLSM_SCALE_MODELS\nconst XLSM_SCALE_MODELS = ' + JSON.stringify(scaleModels, null, 2) + ';\n';
    await saveUserText('grade-scale-models.js', content);

    stepStates[5] = true;
    manualOverrides[5] = true;
    saveOverrides();
    renderProgress();
    renderStepStatuses();
    showToast(i18n.t('swSaved') || 'Saved!');
  };

  // ── Step 6: Save Chips & Roles ─────────────────────────────
  window.swSaveChipsAndRoles = async function () {
    var chips = [
      {
        section: 'Participation',
        color: '#6abf8e',
        chips: [
          { text: 'Active Participation', multiplier: 1, type: 'positive' },
          { text: 'Bonus Star', multiplier: 2, type: 'bonus' }
        ]
      },
      {
        section: 'Homework & Prep',
        color: '#e2c96e',
        chips: [
          { text: 'Homework Done', multiplier: 1, type: 'positive' },
          { text: 'No Homework', multiplier: -1, type: 'negative' }
        ]
      },
      {
        section: 'Behavior',
        color: '#c96b6b',
        chips: [
          { text: 'Off-task / Talking', multiplier: -1, type: 'negative' },
          { text: 'Late Arrival', multiplier: -1, type: 'negative' }
        ]
      }
    ];

    var criteria = [];
    var scoringDecisions = [];
    var raw = await readUserText('correction-criteria.js');
    var parsed = parseJsGlobals(raw, ['XLSM_CRITERIA', 'SCORING_DECISIONS', 'OBSERVATION_CHECKLIST_GROUPS']);
    if (parsed) {
      if (parsed.XLSM_CRITERIA) criteria = parsed.XLSM_CRITERIA;
      if (parsed.SCORING_DECISIONS) scoringDecisions = parsed.SCORING_DECISIONS;
      if (Array.isArray(parsed.OBSERVATION_CHECKLIST_GROUPS) && parsed.OBSERVATION_CHECKLIST_GROUPS.length > 0) {
        var okOverwriteChips = await confirmOverwriteIfNeeded(
          true,
          'swConfirmOverwriteChips',
          'Existing observation chips were found in user/correction-criteria.js. Overwrite them with the default preset?'
        );
        if (!okOverwriteChips) return;
      }
    }

    if (!criteria.length) {
      criteria = [
        { name: 'Accuracy', maxPoints: 10, weight: 1 },
        { name: 'Vocabulary & Expression', maxPoints: 10, weight: 1 },
        { name: 'Fluency & Structure', maxPoints: 10, weight: 1 }
      ];
    }

    var content = 'const XLSM_CRITERIA = ' + JSON.stringify(criteria, null, 2) + ';\n' +
      'const OBSERVATION_CHECKLIST_GROUPS = ' + JSON.stringify(chips, null, 2) + ';\n' +
      'const SCORING_DECISIONS = ' + JSON.stringify(scoringDecisions, null, 2) + ';\n';

    await saveUserText('correction-criteria.js', content);

    stepStates[6] = true;
    manualOverrides[6] = true;
    saveOverrides();
    renderProgress();
    renderStepStatuses();
    showToast(i18n.t('swSaved') || 'Saved!');
  };

  // ── Step 7: Save Seating Plan Template ──────────────────────
  window.swSaveRoomLayout = async function () {
    var layoutRadio = document.querySelector('input[name="swLayout"]:checked');
    var layoutType = layoutRadio ? layoutRadio.value : 'grid';

    var plans = {};
    if (window.Desktop && typeof Desktop.readByPath === 'function') {
      try {
        var res = await Desktop.readByPath('user', 'class-plans/plans.js');
        if (res && res.ok && res.content) {
          var parsed = parseJsGlobals(res.content, ['SAVED_CLASS_PLANS']);
          if (parsed && parsed.SAVED_CLASS_PLANS) plans = parsed.SAVED_CLASS_PLANS;
        }
      } catch (_) {}
    }

    var planObj = {
      id: 'plan_default_' + Date.now(),
      name: layoutType === 'grid' ? 'Standard Grid Layout' : (layoutType === 'ushape' ? 'U-Shape Discussion' : 'Collaborative Pods'),
      layoutType: layoutType,
      rows: layoutType === 'pods' ? 4 : 5,
      cols: layoutType === 'pods' ? 6 : 5,
      seats: []
    };

    if (Array.isArray(plans['Default Room']) && plans['Default Room'].length > 0) {
      var okOverwriteRoom = await confirmOverwriteIfNeeded(
        true,
        'swConfirmOverwriteRoomLayout',
        'A "Default Room" seating template already exists in user/class-plans/plans.js. Overwrite it?'
      );
      if (!okOverwriteRoom) return;
    }

    plans['Default Room'] = [planObj];

    var content = 'window.SAVED_CLASS_PLANS = ' + JSON.stringify(plans, null, 2) + ';\n';
    if (window.Desktop && typeof Desktop.saveText === 'function') {
      await Desktop.saveText('user', 'class-plans/plans.js', content);
    }

    stepStates[7] = true;
    manualOverrides[7] = true;
    saveOverrides();
    renderProgress();
    renderStepStatuses();
    showToast(i18n.t('swSaved') || 'Saved!');
  };

  // ── 1-Click "Load Sample School Data" ───────────────────────
  window.swLoadSampleData = async function () {
    var existingFiles = [];
    var checkList = ['class-groups.js', 'planner-config.js', 'grade-scale-models.js', 'correction-criteria.js'];
    for (var fIdx = 0; fIdx < checkList.length; fIdx++) {
      var fRaw = await readUserText(checkList[fIdx]);
      if (fRaw && fRaw.trim().length > 0) existingFiles.push('user/' + checkList[fIdx]);
    }
    var confirmMsg = existingFiles.length > 0
      ? ((i18n.t('swLoadDemoOverwriteWarning') || 'WARNING: This will OVERWRITE your existing files ({files}) with sample data. Continue?').replace('{files}', existingFiles.join(', ')))
      : (i18n.t('swLoadDemoConfirm') || 'This will load sample classes, term dates, timetable periods, and observation chips to help you test the suite. Continue?');
    
    var ok = window.showConfirm ? await showConfirm(confirmMsg) : window.confirm(confirmMsg);
    if (!ok) return;

    // 1. Classes & Students
    var sampleGroups = {
      'Class 9A': ['ALICE', 'BENJAMIN', 'CLARA', 'DANIEL', 'EMMA', 'FELIX', 'GABRIEL', 'HANNAH', 'IAN', 'JULIA'],
      'Class 10B': ['LEO', 'MIA', 'NOAH', 'OLIVIA', 'PAUL', 'QUINN', 'ROSE', 'SAMUEL', 'TARA', 'VICTOR']
    };
    var sampleMeta = {
      'Class 9A': { year: '2025-2026', semester: 1, level: 9 },
      'Class 10B': { year: '2025-2026', semester: 1, level: 10 }
    };
    await saveUserText('class-groups.js',
      'const CLASS_GROUPS = ' + JSON.stringify(sampleGroups, null, 2) + ';\n\n' +
      'const CLASS_GROUPS_META = ' + JSON.stringify(sampleMeta, null, 2) + ';\n'
    );

    // 2. Planner Dates & Timetable
    var samplePlanner = {
      semesters: [
        { id: 'sem-s1-demo', label: 'Semester 1', year: '2025-2026', semesterStart: '2025-08-18', semesterEnd: '2026-01-23', holidays: [] },
        { id: 'sem-s2-demo', label: 'Semester 2', year: '2025-2026', semesterStart: '2026-02-09', semesterEnd: '2026-06-26', holidays: [] }
      ],
      activeSemesterId: 'sem-s1-demo',
      periods: [
        { name: 'P1', start: '08:00', end: '08:45' },
        { name: 'P2', start: '08:50', end: '09:35' },
        { name: 'P3', start: '09:50', end: '10:35' },
        { name: 'P4', start: '10:40', end: '11:25' }
      ],
      classes: {
        'Class 9A': {
          color: '#3b82f6',
          year: '2025-2026',
          schedule: [
            { day: 1, time: '08:00', timeEnd: '08:45' },
            { day: 3, time: '09:50', timeEnd: '10:35' }
          ],
          objectives: ['Master introductory algebra', 'Improve scientific vocabulary']
        },
        'Class 10B': {
          color: '#10b981',
          year: '2025-2026',
          schedule: [
            { day: 2, time: '08:50', timeEnd: '09:35' },
            { day: 4, time: '10:40', timeEnd: '11:25' }
          ],
          objectives: ['Complete literary essay', 'Oral presentations']
        }
      }
    };
    await saveUserText('planner-config.js', 'window.PLANNER_CONFIG = ' + JSON.stringify(samplePlanner, null, 2) + ';\n');

    // 3. Grading Scales
    var sampleScales = [
      { id: 'swiss-standard', name: 'Swiss Standard (1.0 to 6.0)', minGrade: 1.0, maxGrade: 6.0, passThreshold: 4.0, step: 0.1, rounding: 0.5 },
      { id: 'french-standard', name: 'French Standard (0 to 20)', minGrade: 0, maxGrade: 20, passThreshold: 10, step: 0.25, rounding: 0.25 }
    ];
    await saveUserText('grade-scale-models.js', '// XLSM_SCALE_MODELS\nconst XLSM_SCALE_MODELS = ' + JSON.stringify(sampleScales, null, 2) + ';\n');

    // 4. Observation Chips & Criteria
    var sampleChips = [
      {
        section: 'Participation',
        color: '#6abf8e',
        chips: [
          { text: 'Active Participation', multiplier: 1, type: 'positive' },
          { text: 'Bonus Star', multiplier: 2, type: 'bonus' }
        ]
      },
      {
        section: 'Homework',
        color: '#e2c96e',
        chips: [
          { text: 'Homework Done', multiplier: 1, type: 'positive' },
          { text: 'No Homework', multiplier: -1, type: 'negative' }
        ]
      }
    ];
    var sampleCriteria = [
      { name: 'Comprehension & Analysis', maxPoints: 10, weight: 1 },
      { name: 'Quality of Arguments', maxPoints: 10, weight: 1 },
      { name: 'Language & Structure', maxPoints: 10, weight: 1 }
    ];
    await saveUserText('correction-criteria.js',
      'const XLSM_CRITERIA = ' + JSON.stringify(sampleCriteria, null, 2) + ';\n' +
      'const OBSERVATION_CHECKLIST_GROUPS = ' + JSON.stringify(sampleChips, null, 2) + ';\n' +
      'const SCORING_DECISIONS = [];\n'
    );

    // 5. Seating Plan
    var samplePlans = {
      'Class 9A': [
        { id: 'plan_9a_grid', name: 'Class 9A - Grid Layout', layoutType: 'grid', rows: 4, cols: 5, seats: [] }
      ],
      'Class 10B': [
        { id: 'plan_10b_u', name: 'Class 10B - U-Shape', layoutType: 'ushape', rows: 5, cols: 5, seats: [] }
      ]
    };
    if (window.Desktop && typeof Desktop.saveText === 'function') {
      await Desktop.saveText('user', 'class-plans/plans.js', 'window.SAVED_CLASS_PLANS = ' + JSON.stringify(samplePlans, null, 2) + ';\n');
    }

    // Mark steps as completed
    for (var k = 1; k <= TOTAL_STEPS; k++) {
      stepStates[k] = true;
      manualOverrides[k] = true;
    }
    saveOverrides();

    renderProgress();
    renderStepStatuses();
    loadExistingClassesDisplay();
    showToast(i18n.t('saved') || 'Demo data loaded successfully!');
  };

  // ── Footer Controls: Remind Later / Finish ─────────────────
  window.swRemindLater = function () {
    try {
      sessionStorage.setItem('cmt-setup-deferred', 'true');
    } catch (_) {}
    closeWizard();
  };

  window.swFinishAndClose = function () {
    var dontShow = document.getElementById('swDontShowCb');
    if (dontShow && dontShow.checked) {
      localStorage.setItem('cmt-setup-completed', 'true');
    }
    closeWizard();
  };

  function closeWizard() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage('cmt-close-modal', '*');
      return;
    }
    if (window.Desktop && Desktop.isElectron()) {
      window.close();
    } else {
      window.location.href = '../launcher.html';
    }
  }

  function saveOverrides() {
    try {
      localStorage.setItem('cmt-setup-manual-overrides', JSON.stringify(manualOverrides));
    } catch (_) {}
  }

  // ── Spotlight Tour ─────────────────────────────────────────
  window.startSwTutorial = function () {
    if (!window.Tutorial) return;
    var labels = {
      next: i18n.t('tutNext') || 'Next',
      prev: i18n.t('tutPrev') || 'Back',
      skip: i18n.t('tutSkip') || 'Skip',
      done: i18n.t('tutDone') || 'Done'
    };

    var steps = [
      { selector: '#swBrandHeader', title: i18n.t('tutSw1Title') || 'Setup Wizard', text: i18n.t('tutSw1Text') || 'Welcome! The Setup Wizard helps you configure all fundamental suite settings in one organized checklist.' },
      { selector: '#swDemoBtn', title: i18n.t('tutSw2Title') || 'Demo Data Loader', text: i18n.t('tutSw2Text') || 'Click here to populate sample classes, term dates, and timetable periods to test the apps immediately.' },
      { selector: '#swProgressCard', title: i18n.t('tutSw3Title') || 'Live Progress', text: i18n.t('tutSw3Text') || 'This bar tracks your overall progress as configuration items are completed or detected.' },
      { selector: '#swStepsList', title: i18n.t('tutSw4Title') || 'Setup Steps', text: i18n.t('tutSw4Text') || 'Expand each step to use quick inline controls or click Open Full Tool for advanced setup.' },
      { selector: '#swFooter', title: i18n.t('tutSw5Title') || 'Finish & Dismiss', text: i18n.t('tutSw5Text') || 'You can dismiss the wizard for now, disable auto-opening on startup, or finish and return to the Launcher.' }
    ];

    Tutorial.start(steps, labels);
  };

  // ── Initialization on DOM Ready ────────────────────────────
  document.addEventListener('DOMContentLoaded', async function () {
    if (window.i18n && typeof i18n.applyTranslations === 'function') {
      i18n.applyTranslations();
    }

    // Set active language radio
    var curLang = (window.i18n && typeof i18n.getLang === 'function') ? i18n.getLang() : 'en';
    var radio = document.querySelector('input[name="swLang"][value="' + curLang + '"]');
    if (radio) radio.checked = true;

    // Set don't show checkbox default
    var dontShowCb = document.getElementById('swDontShowCb');
    if (dontShowCb) {
      dontShowCb.checked = localStorage.getItem('cmt-setup-completed') === 'true';
      dontShowCb.addEventListener('change', function () {
        if (this.checked) {
          localStorage.setItem('cmt-setup-completed', 'true');
        } else {
          localStorage.removeItem('cmt-setup-completed');
        }
      });
    }

    // Open step 1 by default
    var step1 = document.getElementById('swStepCard1');
    if (step1) step1.classList.add('open');

    // Run full auto-detection
    await detectAllSteps();
  });

})();
