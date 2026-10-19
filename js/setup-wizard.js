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

  // ── Step 1 Auto-Detection: Language & Data Folder ──────────
  async function checkStep1() {
    var lang = localStorage.getItem('cmt-lang') || (window.i18n && i18n.currentLanguage);
    var hasLang = !!(lang && ['en', 'fr', 'de', 'it'].indexOf(lang) >= 0);
    return hasLang;
  }

  // ── Step 2 Auto-Detection: Class Groups & Rosters ──────────
  async function checkStep2() {
    // Check window.CLASS_GROUPS or read user/class-groups.js
    if (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS && Object.keys(CLASS_GROUPS).length > 0) {
      var keys = Object.keys(CLASS_GROUPS);
      for (var i = 0; i < keys.length; i++) {
        if (Array.isArray(CLASS_GROUPS[keys[i]]) && CLASS_GROUPS[keys[i]].length > 0) return true;
      }
    }
    var raw = await readUserText('class-groups.js');
    if (!raw) return false;
    try {
      var sandbox = {};
      new Function('window', raw)(sandbox);
      var groups = sandbox.CLASS_GROUPS || sandbox.CLASS_GROUPS_DATA?.classGroups;
      if (groups && typeof groups === 'object') {
        var gKeys = Object.keys(groups);
        for (var j = 0; j < gKeys.length; j++) {
          if (Array.isArray(groups[gKeys[j]]) && groups[gKeys[j]].length > 0) return true;
        }
      }
    } catch (_) {}
    return false;
  }

  // ── Step 3 Auto-Detection: Semester Dates & Holidays ───────
  async function checkStep3() {
    var raw = await readUserText('planner-config.js');
    if (!raw) return false;
    try {
      var sandbox = {};
      new Function('window', raw)(sandbox);
      var cfg = sandbox.PLANNER_CONFIG;
      if (cfg && Array.isArray(cfg.semesters) && cfg.semesters.length > 0) {
        return cfg.semesters.some(function (s) {
          return s && s.semesterStart && s.semesterEnd;
        });
      }
    } catch (_) {}
    return false;
  }

  // ── Step 4 Auto-Detection: Weekly Timetable & Period Hours ──
  async function checkStep4() {
    var raw = await readUserText('planner-config.js');
    if (!raw) return false;
    try {
      var sandbox = {};
      new Function('window', raw)(sandbox);
      var cfg = sandbox.PLANNER_CONFIG;
      if (cfg && cfg.classes && typeof cfg.classes === 'object') {
        var hasSched = Object.keys(cfg.classes).some(function (cid) {
          var c = cfg.classes[cid];
          return c && Array.isArray(c.schedule) && c.schedule.length > 0;
        });
        if (hasSched) return true;
      }
      if (cfg && Array.isArray(cfg.periods) && cfg.periods.length > 0) return true;
    } catch (_) {}
    return false;
  }

  // ── Step 5 Auto-Detection: Grading Scales & Rubrics ─────────
  async function checkStep5() {
    var rawScales = await readUserText('grade-scale-models.js');
    var rawCriteria = await readUserText('correction-criteria.js');
    if (rawScales && rawScales.includes('XLSM_SCALE_MODELS')) return true;
    if (rawCriteria && rawCriteria.includes('XLSM_CRITERIA')) return true;
    return false;
  }

  // ── Step 6 Auto-Detection: Observation Chips & Roles ───────
  async function checkStep6() {
    var raw = await readUserText('correction-criteria.js');
    if (raw && raw.includes('OBSERVATION_CHECKLIST_GROUPS')) return true;
    try {
      var ls = localStorage.getItem('gradeSheetPersonalisedChips.v1');
      if (ls && JSON.parse(ls).length > 0) return true;
    } catch (_) {}
    return false;
  }

  // ── Step 7 Auto-Detection: Classroom Seating Plans ──────────
  async function checkStep7() {
    if (!window.Desktop || typeof Desktop.readByPath !== 'function') return false;
    try {
      var res = await Desktop.readByPath('user', 'class-plans/plans.js');
      if (res && res.ok && res.content) {
        var sandbox = {};
        new Function('window', res.content)(sandbox);
        var plans = sandbox.SAVED_CLASS_PLANS;
        if (plans && Object.keys(plans).length > 0) return true;
      }
    } catch (_) {}
    return false;
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
    if (window.Desktop && typeof Desktop.openTool === 'function') {
      Desktop.openTool(pageFile);
    } else {
      window.open(pageFile, '_blank');
    }
  };

  // ── Step 1: Save Language & Storage ────────────────────────
  window.swSaveStep1 = function () {
    var selectedRadio = document.querySelector('input[name="swLang"]:checked');
    if (selectedRadio && selectedRadio.value) {
      var lang = selectedRadio.value;
      if (window.i18n && typeof i18n.setLanguage === 'function') {
        i18n.setLanguage(lang);
      } else {
        localStorage.setItem('cmt-lang', lang);
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
    var raw = await readUserText('class-groups.js');
    if (raw) {
      try {
        var sandbox = {};
        new Function('window', raw)(sandbox);
        var groups = sandbox.CLASS_GROUPS || sandbox.CLASS_GROUPS_DATA?.classGroups;
        if (groups) classNames = Object.keys(groups);
      } catch (_) {}
    }

    if (!classNames.length) {
      container.innerHTML = '<span style="font-size:0.75rem;color:#888;">' + (i18n.t('swStep2NoClasses') || 'No classes added yet.') + '</span>';
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
      showToast('Please enter a class name.', true);
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
    var raw = await readUserText('class-groups.js');
    if (raw) {
      try {
        var sandbox = {};
        new Function('window', raw)(sandbox);
        if (sandbox.CLASS_GROUPS) groups = sandbox.CLASS_GROUPS;
        if (sandbox.CLASS_GROUPS_META) meta = sandbox.CLASS_GROUPS_META;
      } catch (_) {}
    }

    groups[clsName] = students;
    meta[clsName] = {
      year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      semester: 1,
      level: ''
    };

    var content = 'const CLASS_GROUPS = ' + JSON.stringify(groups, null, 2) + ';\n\n' +
      'const CLASS_GROUPS_META = ' + JSON.stringify(meta, null, 2) + ';\n';

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
    if (raw) {
      try {
        var sandbox = {};
        new Function('window', raw)(sandbox);
        if (sandbox.PLANNER_CONFIG) cfg = sandbox.PLANNER_CONFIG;
      } catch (_) {}
    }

    cfg.semesters = [
      { id: 'sem-s1-' + Date.now(), label: 'Semester 1', year: year, semesterStart: s1Start, semesterEnd: s1End, holidays: [] },
      { id: 'sem-s2-' + Date.now(), label: 'Semester 2', year: year, semesterStart: s2Start, semesterEnd: s2End, holidays: [] }
    ];
    cfg.activeSemesterId = cfg.semesters[0].id;

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
    if (raw) {
      try {
        var sandbox = {};
        new Function('window', raw)(sandbox);
        if (sandbox.PLANNER_CONFIG) cfg = sandbox.PLANNER_CONFIG;
      } catch (_) {}
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
    if (raw) {
      try {
        var sandbox = {};
        new Function('window', raw)(sandbox);
        if (sandbox.XLSM_CRITERIA) criteria = sandbox.XLSM_CRITERIA;
        if (sandbox.SCORING_DECISIONS) scoringDecisions = sandbox.SCORING_DECISIONS;
      } catch (_) {}
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
          var sandbox = {};
          new Function('window', res.content)(sandbox);
          if (sandbox.SAVED_CLASS_PLANS) plans = sandbox.SAVED_CLASS_PLANS;
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
    var confirmMsg = i18n.t('swLoadDemoConfirm') ||
      'This will load sample classes, term dates, timetable periods, and observation chips to help you test the suite. Continue?';
    
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
          { text: 'Bonus Star (★)', multiplier: 2, type: 'bonus' }
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
    var curLang = localStorage.getItem('cmt-lang') || (window.i18n && i18n.currentLanguage) || 'en';
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
