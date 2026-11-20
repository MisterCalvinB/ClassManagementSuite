'use strict';

// Test Creator — Core State, Config, Bootstrap & Meta

if (typeof window.i18n === 'object' && window.i18n && typeof window.i18n.tFmt !== 'function') {
  window.i18n.tFmt = function (key, vars) {
    return (typeof window.tFmt === 'function') ? window.tFmt(key, vars) : (window.t ? window.t(key) : key);
  };
}

function tcSanitizeFilename(rawName, fallback) {
  if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.sanitizeFilename === 'function') {
    return TestCreatorService.sanitizeFilename(rawName, fallback);
  }
  var str = String(rawName || fallback || 'Exam').trim();
  str = str.replace(/[\x00-\x1f\x7f\\/:*?"<>|]/g, '');
  str = str.replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^[\._]+|[\._]+$/g, '');
  return str || fallback || 'Exam';
}
window.tcSanitizeFilename = tcSanitizeFilename;

var currentTest = TestCreatorService.createEmptyTest();

var DEFAULT_COMPETENCE_CONFIG = {
  preset: 'detailed',
  showCode: true,
  showTitle: true,
  showDescription: true,
  showLevel: true,
  showCategory: true,
  showTags: true,
  showComments: true,
  showDetailedDescription: true,
  hiddenDetailLines: {},
  showActions: true,
  drawerWidth: 440
};
var competenceDisplayConfig = Object.assign({}, DEFAULT_COMPETENCE_CONFIG);

async function loadCompetenceDisplayConfig() {
  try {
    if (window.Desktop && typeof Desktop.readText === 'function') {
      var res = await Desktop.readText('user', 'competence-display-config.json');
      if (res && res.ok && res.content) {
        var parsed = JSON.parse(res.content);
        if (parsed && typeof parsed === 'object') {
          competenceDisplayConfig = Object.assign({}, DEFAULT_COMPETENCE_CONFIG, parsed);
          return;
        }
      }
    }
  } catch (_) {}

  try {
    var local = localStorage.getItem('cmt-competence-display-config');
    if (local) {
      var parsedLocal = JSON.parse(local);
      if (parsedLocal && typeof parsedLocal === 'object') {
        competenceDisplayConfig = Object.assign({}, DEFAULT_COMPETENCE_CONFIG, parsedLocal);
      }
    }
  } catch (_) {}
}

async function saveCompetenceDisplayConfigToDisk() {
  try {
    localStorage.setItem('cmt-competence-display-config', JSON.stringify(competenceDisplayConfig));
  } catch (_) {}

  try {
    if (window.Desktop && typeof Desktop.saveJson === 'function') {
      await Desktop.saveJson('user', 'competence-display-config.json', competenceDisplayConfig);
    } else if (window.Desktop && typeof Desktop.saveText === 'function') {
      await Desktop.saveText('user', 'competence-display-config.json', JSON.stringify(competenceDisplayConfig, null, 2));
    }
  } catch (_) {}
}
var activeClassGroups = [];
var activeStudents = [];
var rawMeta = {};
var activeDrawerTab = 'testbank';
var currentExportFormat = 'pdf';
var manualVariantMap = {};

// ── Bootstrap Data ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async function () {
  initHamburger();
  await loadCompetenceDisplayConfig();
  if (typeof applyTranslations === 'function') {
    applyTranslations();
  }
  populateDropdowns();
  await tcPopulateThemeDropdowns();
  await loadInitialData();
  await tcLoadCustomTestTemplates();
  await tcLoadCustomHeaderTemplates();
  await tcLoadAllAvailableSubjects();
  await tcBootstrapActiveTest();
  ensureTestStyleAndTheme();
  renderTestMeta();
  renderExerciseCards();
  tcLoadDrawerContent();
  setupResizer();
  initMainSplitResizer();
  setupExerciseDragAndDrop();
  tcCheckUrlExerciseDeepLink();
  if (typeof tcUpdateFreezePreviewUI === 'function') {
    tcUpdateFreezePreviewUI();
  }
});

var _draggedExerciseIdx = null;
var _activeCardDragSource = null;

function setupExerciseDragAndDrop() {
  var exList = document.getElementById('exerciseCardsList');
  if (!exList) return;

  function clearCardDragAttrs() {
    _activeCardDragSource = null;
    var cards = exList.querySelectorAll('.exercise-card-item[draggable="true"]');
    cards.forEach(function (c) {
      c.removeAttribute('draggable');
    });
  }

  // On mousedown: only enable draggable if mouse is on the drag handle or empty header space (NEVER inside any field or action)
  exList.addEventListener('mousedown', function (e) {
    // Exclude any interactive inputs, textareas, contenteditable editors, toolbars, buttons, or links
    var isInteractiveField = e.target.closest('input, textarea, select, button, a, [contenteditable="true"], .tc-mini-fmt-toolbar, .tc-subitem-wysiwyg-editor, .tc-subitem-wysiwyg-toolbar, .card-actions, .card-points-wrap, .card-header-title-wrap');
    if (isInteractiveField) {
      clearCardDragAttrs();
      return;
    }

    var handle = e.target.closest('.card-drag-handle');
    var header = e.target.closest('.exercise-card-header');
    if (handle || header) {
      var card = e.target.closest('.exercise-card-item');
      if (card) {
        _activeCardDragSource = card;
        card.setAttribute('draggable', 'true');
      }
    }
  });

  document.addEventListener('mouseup', function () {
    clearCardDragAttrs();
  });

  exList.addEventListener('dragstart', function (e) {
    // If drag gesture originated on an interactive field, abort immediately to protect native text selection
    var isInteractiveField = e.target.closest('input, textarea, select, [contenteditable="true"], .tc-mini-fmt-toolbar, .tc-subitem-wysiwyg-editor, .tc-subitem-wysiwyg-toolbar, .card-title-input, .card-points-input, .instructions-input');
    if (isInteractiveField) {
      e.preventDefault();
      clearCardDragAttrs();
      return;
    }

    var card = e.target.closest('.exercise-card-item');
    if (card && card === _activeCardDragSource && card.getAttribute('draggable') === 'true') {
      var idx = parseInt(card.dataset.index, 10);
      if (!isNaN(idx)) {
        _draggedExerciseIdx = idx;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({
          type: 'exercise-card-reorder',
          index: idx,
          id: card.dataset.id || card.id.replace(/^card-/, '')
        }));
        e.dataTransfer.setData('text/plain', 'card:' + idx);
        return;
      }
    }

    // Otherwise, cancel any unintended drag
    e.preventDefault();
    clearCardDragAttrs();
  });

  exList.addEventListener('dragend', function () {
    _draggedExerciseIdx = null;
    clearCardDragAttrs();
    var allCards = exList.querySelectorAll('.exercise-card-item');
    allCards.forEach(function (c) {
      c.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom', 'drag-over');
    });
  });

  exList.addEventListener('dragover', function (e) {
    var card = e.target.closest('.exercise-card-item');
    if (card) {
      e.preventDefault();
      if (_draggedExerciseIdx !== null) {
        e.dataTransfer.dropEffect = 'move';
        var rect = card.getBoundingClientRect();
        var midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          card.classList.add('drag-over-top');
          card.classList.remove('drag-over-bottom');
        } else {
          card.classList.add('drag-over-bottom');
          card.classList.remove('drag-over-top');
        }
      } else {
        e.dataTransfer.dropEffect = 'copy';
        card.classList.add('drag-over');
      }
    }
  });

  exList.addEventListener('dragleave', function (e) {
    var card = e.target.closest('.exercise-card-item');
    if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
      card.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
    }
  });

  exList.addEventListener('drop', function (e) {
    var card = e.target.closest('.exercise-card-item');
    if (card) {
      e.preventDefault();
      var isTop = card.classList.contains('drag-over-top');
      card.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
      var cardId = card.dataset.id || card.id.replace(/^card-/, '');
      var targetIdx = parseInt(card.dataset.index, 10);

      try {
        var rawData = e.dataTransfer.getData('application/json');
        if (rawData) {
          var payload = JSON.parse(rawData);
          if (payload.type === 'exercise-card-reorder') {
            var fromIdx = payload.index;
            if (!isNaN(fromIdx) && !isNaN(targetIdx) && fromIdx !== targetIdx && currentTest && Array.isArray(currentTest.exercises)) {
              var movedItem = currentTest.exercises.splice(fromIdx, 1)[0];
              if (movedItem) {
                var insertIdx = targetIdx;
                if (fromIdx < targetIdx) {
                  insertIdx = isTop ? targetIdx - 1 : targetIdx;
                } else {
                  insertIdx = isTop ? targetIdx : targetIdx + 1;
                }
                if (insertIdx < 0) insertIdx = 0;
                if (insertIdx > currentTest.exercises.length) insertIdx = currentTest.exercises.length;
                currentTest.exercises.splice(insertIdx, 0, movedItem);
                renderExerciseCards();
                tcOnDirty();
              }
            }
            _draggedExerciseIdx = null;
            return;
          } else if (payload.type === 'descriptor') {
            _targetAttachExId = cardId;
            if (typeof updateCompetenceTargetDropdown === 'function') updateCompetenceTargetDropdown();
            var desc = (_currentRenderedCompetences || []).find(function (c) {
              return c.id === payload.descriptorId || c.code === payload.code;
            }) || (_cachedCompetences || []).find(function (c) {
              return c.id === payload.descriptorId || c.code === payload.code;
            }) || { id: payload.descriptorId, code: payload.code, title: payload.title };
            tcAttachCompetenceByObject(desc, cardId);
          } else if (payload.type === 'criterion') {
            _targetAttachExId = cardId;
            tcPullCriteriaToActiveEx(payload.critId, payload, cardId);
          }
        }
      } catch (_) {}
    }
    _draggedExerciseIdx = null;
  });
}

function tcCheckUrlExerciseDeepLink() {
  var params = new URLSearchParams(window.location.search);
  var reqEx = params.get('exerciseId') || params.get('ex') || params.get('anchor');
  if (!reqEx) return;
  setTimeout(function () {
    var cleanEx = reqEx.replace(/^ex-|^exercise-/, '');
    var card = document.getElementById('card-' + reqEx) || document.getElementById('card-' + cleanEx);
    if (!card) {
      var num = parseInt(cleanEx, 10);
      var allCards = document.querySelectorAll('.exercise-card-item');
      if (!isNaN(num) && num >= 1 && num <= allCards.length) {
        card = allCards[num - 1];
      }
    }
    if (!card && currentTest && Array.isArray(currentTest.exercises)) {
      var foundEx = currentTest.exercises.find(function (e) { return e && (e.id === reqEx || e.id === cleanEx); });
      if (foundEx) card = document.getElementById('card-' + foundEx.id);
    }
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('tc-exercise-highlight-pulse');
      setTimeout(function () { card.classList.remove('tc-exercise-highlight-pulse'); }, 2500);
    }
  }, 400);
}

async function tcBootstrapActiveTest() {
  var params = new URLSearchParams(window.location.search);
  var reqFile = params.get('file') || params.get('testFile');
  var reqId = params.get('testId') || params.get('id');

  var isElec = window.Desktop && (typeof Desktop.isElectron === 'function' ? Desktop.isElectron() : !!Desktop.isElectron);

  if (reqFile && isElec && typeof Desktop.readJson === 'function') {
    try {
      var fnToRead = reqFile.endsWith('.json') ? reqFile : (reqFile + '.json');
      var readRes = await Desktop.readJson('tests', fnToRead);
      if (!readRes || !readRes.ok || !readRes.data) {
        if (typeof Desktop.readByPath === 'function') {
          var raw = await Desktop.readByPath('user', 'tests/' + fnToRead);
          if (raw && raw.ok && raw.content) {
            try { readRes = { ok: true, data: JSON.parse(raw.content) }; } catch (_) {}
          }
        }
      }
      var testObj = (readRes && readRes.ok && readRes.data) ? readRes.data : (readRes && readRes.data ? readRes.data : readRes);
      if (testObj && typeof testObj === 'object' && testObj.ok !== false) {
        testObj._filename = fnToRead;
        currentTest = JSON.parse(JSON.stringify(testObj));
        currentTest.exercises = currentTest.exercises || [];
        TestCreatorService.ensureHeaderConfig(currentTest);
        return;
      }
    } catch (_) {}
  }

  if (reqId) {
    var cleanId = String(reqId).trim();
    var cleanWithoutExt = cleanId.replace(/\.json$/i, '');

    if (isElec && typeof Desktop.listFiles === 'function') {
      try {
        var filesRes = await Desktop.listFiles('tests', { extensions: ['.json'] });
        var files = Array.isArray(filesRes) ? filesRes : ((filesRes && Array.isArray(filesRes.files)) ? filesRes.files : []);
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          var fn = typeof f === 'string' ? f : (f.filename || f.name);
          if (!fn) continue;
          if (fn === cleanId || fn === cleanWithoutExt + '.json' || fn.indexOf(cleanWithoutExt) !== -1) {
            var r = await Desktop.readJson('tests', fn);
            var tObj = (r && r.ok && r.data) ? r.data : (r && r.data ? r.data : r);
            if (tObj && typeof tObj === 'object' && tObj.ok !== false) {
              tObj._filename = fn;
              currentTest = JSON.parse(JSON.stringify(tObj));
              currentTest.exercises = currentTest.exercises || [];
              TestCreatorService.ensureHeaderConfig(currentTest);
              return;
            }
          }
        }
      } catch (_) {}
    }

    try {
      var rawList = localStorage.getItem('cmt_tests');
      if (rawList) {
        var list = JSON.parse(rawList);
        var found = Array.isArray(list) && list.find(function (t) {
          return t.id === cleanId || t.id === cleanWithoutExt || t._filename === cleanId || (t._filename && t._filename === cleanWithoutExt + '.json');
        });
        if (found) {
          var loaded = (found.data && found.ok) ? found.data : (found.data ? found.data : found);
          currentTest = JSON.parse(JSON.stringify(loaded));
          currentTest.exercises = currentTest.exercises || [];
          TestCreatorService.ensureHeaderConfig(currentTest);
          return;
        }
      }
    } catch (_) {}
  }

  try {
    var lastActive = localStorage.getItem('cmt_active_test');
    if (lastActive) {
      var act = JSON.parse(lastActive);
      if (act && typeof act === 'object' && (act.title || (act.exercises && act.exercises.length > 0))) {
        var loadedAct = (act.data && act.ok) ? act.data : (act.data ? act.data : act);
        currentTest = JSON.parse(JSON.stringify(loadedAct));
        currentTest.exercises = currentTest.exercises || [];
        TestCreatorService.ensureHeaderConfig(currentTest);
        return;
      }
    }
  } catch (_) {}

  currentTest = TestCreatorService.createEmptyTest();
}

function tcNormalizeThemeId(theme) {
  if (!theme) return 'export-light-neobrutalist.css';
  var t = String(theme).trim().toLowerCase();
  if (t === 'academic' || t === 'classic' || t === 'classic academic' || t === 'export-classic.css') return 'export-classic.css';
  if (t === 'neobrutalist' || t === 'light neobrutalist' || t === 'export-light-neobrutalist.css') return 'export-light-neobrutalist.css';
  if (t === 'dyslexic' || t === 'dys' || t === 'dyslexic & adhd friendly' || t === 'export-dys.css') return 'export-dys.css';
  if (t === 'modern' || t === 'modern minimalist' || t === 'export-modern.css') return 'export-modern.css';
  if (t === 'plain' || t === 'eco' || t === 'plain / eco (black & white)' || t === 'export-plain.css') return 'export-plain.css';
  return theme;
}

function tcSyncActiveThemeDropdowns() {
  if (!currentTest) return;
  var chosen = (currentTest.exportStyle && currentTest.exportStyle.theme) || currentTest.stylesheetTheme || (window.ExportStylesService && ExportStylesService.getSelectedStyle('testCreator')) || localStorage.getItem('cmt_default_test_theme') || 'export-light-neobrutalist.css';
  var norm = tcNormalizeThemeId(chosen);

  var pThm = document.getElementById('previewThemeSelect');
  if (pThm) {
    pThm.value = norm;
    if (!pThm.value && pThm.options.length > 0) {
      pThm.selectedIndex = 0;
    }
  }
  var gThm = document.getElementById('globalStyleTheme');
  if (gThm) {
    gThm.value = norm;
    if (!gThm.value && gThm.options.length > 0) {
      gThm.selectedIndex = 0;
    }
  }
  var eThm = document.getElementById('exportThemeSelect');
  if (eThm) {
    eThm.value = norm;
    if (!eThm.value && eThm.options.length > 0) {
      eThm.selectedIndex = 0;
    }
  }
}

async function tcPopulateThemeDropdowns() {
  var pThm = document.getElementById('previewThemeSelect');
  var gThm = document.getElementById('globalStyleTheme');
  var eThm = document.getElementById('exportThemeSelect');
  if (!pThm && !gThm && !eThm) return;

  var styles = [];
  if (window.ExportStylesService && typeof ExportStylesService.loadAvailableStyles === 'function') {
    try {
      styles = await ExportStylesService.loadAvailableStyles();
    } catch (e) {
      console.warn('Failed to load export styles via ExportStylesService:', e);
    }
  }

  if (!styles || !styles.length) {
    styles = [
      { id: 'export-light-neobrutalist.css', name: 'Light Neobrutalist', isCustom: false },
      { id: 'export-modern.css', name: 'Modern Minimalist', isCustom: false },
      { id: 'export-classic.css', name: 'Classic Academic', isCustom: false },
      { id: 'export-plain.css', name: 'Plain / Eco (Black & White)', isCustom: false },
      { id: 'export-dys.css', name: 'Dyslexic & ADHD Friendly', isCustom: false }
    ];
  }

  function getStyleI18nLabel(styleObj) {
    if (styleObj.isCustom) return styleObj.name || styleObj.filename || styleObj.id;
    var sid = styleObj.id || styleObj.filename;
    if (sid === 'export-light-neobrutalist.css') return (window.i18n && i18n.t('tcThemeNeobrutalist')) || styleObj.name;
    if (sid === 'export-modern.css') return (window.i18n && i18n.t('tcThemeModern')) || styleObj.name;
    if (sid === 'export-classic.css') return (window.i18n && i18n.t('tcThemeAcademic')) || styleObj.name;
    if (sid === 'export-plain.css') return (window.i18n && i18n.t('tcThemePlain')) || styleObj.name;
    if (sid === 'export-dys.css') return (window.i18n && i18n.t('tcThemeDyslexic')) || styleObj.name;
    return styleObj.name || sid;
  }

  var builtinStyles = styles.filter(function (s) { return !s.isCustom; });
  var customStyles = styles.filter(function (s) { return !!s.isCustom; });

  var html = '';
  if (customStyles.length > 0) {
    var lblBuiltin = (window.i18n && i18n.t('exportStyleBuiltInHeader')) || 'Standard Models';
    var lblCustom = (window.i18n && i18n.t('exportStyleUserCustomHeader')) || 'Custom Styles (user/)';
    html += '<optgroup label="' + escapeAttr(lblBuiltin) + '">';
    builtinStyles.forEach(function (s) {
      html += '<option value="' + escapeAttr(s.id) + '">' + escapeHtml(getStyleI18nLabel(s)) + '</option>';
    });
    html += '</optgroup>';
    html += '<optgroup label="' + escapeAttr(lblCustom) + '">';
    customStyles.forEach(function (s) {
      html += '<option value="' + escapeAttr(s.id) + '">' + escapeHtml(getStyleI18nLabel(s)) + '</option>';
    });
    html += '</optgroup>';
  } else {
    builtinStyles.forEach(function (s) {
      html += '<option value="' + escapeAttr(s.id) + '">' + escapeHtml(getStyleI18nLabel(s)) + '</option>';
    });
  }

  [pThm, gThm, eThm].forEach(function (el) {
    if (!el) return;
    var prevVal = el.value;
    el.innerHTML = html;
    if (prevVal) {
      el.value = tcNormalizeThemeId(prevVal);
    }
  });

  tcSyncActiveThemeDropdowns();
}

function ensureTestStyleAndTheme() {
  if (!currentTest) return;
  currentTest.exercises = currentTest.exercises || [];
  TestCreatorService.ensureHeaderConfig(currentTest);
  TestCreatorService.ensureExportStyle(currentTest);
  if (!currentTest.stylesheetTheme) {
    var chosenThm = (currentTest.exportStyle && currentTest.exportStyle.theme) || (window.ExportStylesService && ExportStylesService.getSelectedStyle('testCreator')) || localStorage.getItem('cmt_default_test_theme') || 'export-light-neobrutalist.css';
    currentTest.stylesheetTheme = tcNormalizeThemeId(chosenThm);
  } else {
    currentTest.stylesheetTheme = tcNormalizeThemeId(currentTest.stylesheetTheme);
  }
  if (currentTest.exportStyle) {
    currentTest.exportStyle.theme = currentTest.stylesheetTheme;
  }
  tcSyncActiveThemeDropdowns();
}

function populateDropdowns() {
  var subSel = document.getElementById('testSubject');
  if (subSel) {
    subSel.innerHTML = TestCreatorService.DEFAULT_SUBJECTS.map(function (s) {
      var val = typeof s === 'string' ? s : (s.id || s.name);
      var lbl = typeof s === 'string' ? s : (s.name || s.id);
      return '<option value="' + escapeAttr(val) + '">' + escapeHtml(lbl) + '</option>';
    }).join('') + '<option value="__custom__">＋ Add Custom Subject…</option>';
  }

  if (typeof tcPopulateScaleSelect === 'function') {
    tcPopulateScaleSelect();
  } else {
    var scaleSel = document.getElementById('testScale');
    if (scaleSel) {
      scaleSel.innerHTML = TestCreatorService.DEFAULT_SCALES.map(function (sc) {
        return '<option value="' + sc.id + '">' + sc.name + '</option>';
      }).join('');
    }
  }
}

async function loadInitialData() {
  var parsedGroups = [];
  var rawData = null;
  rawMeta = {};
  var allStudentsById = {};
  var activeYear = '';

  var isElec = window.Desktop && (typeof Desktop.isElectron === 'function' ? Desktop.isElectron() : !!Desktop.isElectron);
  if (isElec && typeof Desktop.readText === 'function') {
    // 1. Load students first for name resolution
    try {
      var stRes = await window.Desktop.readText('user', 'students.js');
      if (stRes && stRes.ok && stRes.content) {
        var sFn = new Function(stRes.content + '\n;return (typeof STUDENTS_ROSTER !== "undefined" && Array.isArray(STUDENTS_ROSTER)) ? STUDENTS_ROSTER : (typeof STUDENTS !== "undefined" && Array.isArray(STUDENTS) ? STUDENTS : []);');
        var sList = sFn() || [];
        sList.forEach(function (st) {
          if (!st) return;
          var sId = st.uuid || st.id;
          if (!sId) return;
          var sName = st.customName || ((st.firstName || '') + ' ' + (st.lastName || '')).trim() || st.name || sId;
          allStudentsById[sId] = {
            id: sId,
            uuid: sId,
            firstName: st.firstName || '',
            lastName: st.lastName || '',
            customName: st.customName || '',
            name: sName,
            fullName: sName,
            sen: !!st.sen
          };
        });
      }
    } catch (e) {
      console.warn('Error reading students.js:', e);
    }

    // 2. Load class groups
    try {
      var cgRes = await window.Desktop.readText('user', 'class-groups.js');
      if (cgRes && cgRes.ok && cgRes.content) {
        var fn = new Function(
          cgRes.content +
          '\nreturn (typeof CLASS_GROUPS_DATA !== "undefined") ? CLASS_GROUPS_DATA' +
          ' : { classGroups: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : null),' +
          '     classGroupsMeta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : null) };'
        );
        var parsed = fn();
        if (parsed) {
          activeYear = parsed.activeYear || '';
          if (parsed.classGroupsMeta && typeof parsed.classGroupsMeta === 'object') {
            rawMeta = parsed.classGroupsMeta;
          }
          if (parsed.classGroups) {
            rawData = parsed.classGroups;
          }
        }
      }
    } catch (e) {
      console.warn('Error reading class-groups.js:', e);
    }

    // 3. Preload all available criteria banks (custom criteria and default)
    try {
      await tcLoadAvailableCriteriaBanks();
    } catch (e) {
      console.warn('Error loading criteria banks:', e);
    }

    // 4. Preload all available grading scale banks (custom scales and default)
    try {
      await tcLoadAvailableScaleBanks();
    } catch (e) {
      console.warn('Error loading scale banks:', e);
    }
  }

  // Web fallback / global window scope fallback
  if (Object.keys(allStudentsById).length === 0) {
    var webRoster = (typeof STUDENTS_ROSTER !== 'undefined' && Array.isArray(STUDENTS_ROSTER))
      ? STUDENTS_ROSTER
      : ((typeof window !== 'undefined' && Array.isArray(window.STUDENTS_ROSTER)) ? window.STUDENTS_ROSTER : []);
    webRoster.forEach(function (st) {
      if (!st) return;
      var sId = st.uuid || st.id;
      if (!sId) return;
      var sName = st.customName || ((st.firstName || '') + ' ' + (st.lastName || '')).trim() || st.name || sId;
      allStudentsById[sId] = {
        id: sId,
        uuid: sId,
        firstName: st.firstName || '',
        lastName: st.lastName || '',
        customName: st.customName || '',
        name: sName,
        fullName: sName,
        sen: !!st.sen
      };
    });
  }

  if (Object.keys(rawMeta).length === 0 && !rawData) {
    var cgd = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : (window.CLASS_GROUPS_DATA || {});
    if (cgd.classGroupsMeta) rawMeta = cgd.classGroupsMeta;
    if (cgd.classGroups) rawData = cgd.classGroups;
    if (!rawMeta && typeof CLASS_GROUPS_META !== 'undefined') rawMeta = CLASS_GROUPS_META;
    if (!rawData && typeof CLASS_GROUPS !== 'undefined') rawData = CLASS_GROUPS;
    if (cgd.activeYear) activeYear = cgd.activeYear;
  }

  // Helper to resolve student objects from id/object
  function resolveStudents(studentList) {
    if (!Array.isArray(studentList)) return [];
    return studentList.map(function (s) {
      if (typeof s === 'string') {
        var info = allStudentsById[s];
        var nm = info ? (info.fullName || info.name) : s;
        return {
          id: s,
          uuid: s,
          name: nm,
          fullName: nm,
          firstName: info ? info.firstName : '',
          lastName: info ? info.lastName : '',
          sen: info ? !!info.sen : false
        };
      }
      var sId = s.id || s.uuid || ((s.firstName || '') + '_' + (s.lastName || ''));
      var info2 = allStudentsById[sId];
      var nm2 = (info2 && (info2.fullName || info2.name)) || s.fullName || s.customName || ((s.firstName || '') + ' ' + (s.lastName || '')).trim() || s.name || sId;
      return {
        id: sId,
        uuid: sId,
        name: nm2,
        fullName: nm2,
        firstName: s.firstName || (info2 ? info2.firstName : ''),
        lastName: s.lastName || (info2 ? info2.lastName : ''),
        sen: s.sen === true || (info2 ? !!info2.sen : false)
      };
    });
  }

  // Primary: process rawMeta (modern CMS structure)
  var metaKeys = Object.keys(rawMeta || {});
  if (metaKeys.length > 0) {
    metaKeys
      .filter(function (k) {
        return !(rawMeta[k] && rawMeta[k].archived);
      })
      .sort(function (a, b) {
        var aActive = (activeYear && (rawMeta[a] || {}).year === activeYear) ? 0 : 1;
        var bActive = (activeYear && (rawMeta[b] || {}).year === activeYear) ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        var na = (rawMeta[a] && rawMeta[a].name) ? rawMeta[a].name : a;
        var nb = (rawMeta[b] && rawMeta[b].name) ? rawMeta[b].name : b;
        return na.localeCompare(nb);
      })
      .forEach(function (k) {
        var m = rawMeta[k] || {};
        var name = m.name || k;
        var rawStds = m.students || (rawData && rawData[k]) || [];
        var stds = resolveStudents(rawStds);
        parsedGroups.push({
          id: k,
          name: name,
          year: m.year || '',
          subject: m.subject || '',
          level: m.level || '',
          students: stds
        });
      });
  }

  // Fallback: older classGroups structure if meta was empty
  if (parsedGroups.length === 0 && rawData) {
    if (Array.isArray(rawData)) {
      parsedGroups = rawData.map(function (g) {
        return {
          id: g.id || g.name,
          name: g.name || g.id,
          students: resolveStudents(g.students)
        };
      });
    } else if (typeof rawData === 'object') {
      Object.keys(rawData).forEach(function (key) {
        parsedGroups.push({
          id: key,
          name: key,
          students: resolveStudents(rawData[key])
        });
      });
    }
  }

  activeClassGroups = parsedGroups;

  var classSel = document.getElementById('testClass');
  var gsClassSel = document.getElementById('gsTargetClass');
  var opts = '<option value="">Select Class…</option>' + activeClassGroups.map(function (g) {
    return '<option value="' + g.id + '">' + escapeHtml(g.name || g.id) + ' (' + ((g.students && g.students.length) || 0) + ')</option>';
  }).join('');
  if (classSel) classSel.innerHTML = opts;
  if (gsClassSel) gsClassSel.innerHTML = opts;

  if (currentTest.classId && classSel) {
    var matching = activeClassGroups.find(function (g) {
      return g.id === currentTest.classId || g.name === currentTest.classId;
    });
    if (matching) {
      classSel.value = matching.id;
      currentTest.classId = matching.id;
      currentTest.className = matching.name || matching.id;
    } else {
      classSel.value = currentTest.classId;
    }
    tcOnClassChange();
  }
}

// ── Subject & Metadata Management ────────────────────────────────────
function tcAddSubjectOption(name, selectIt) {
  var sel = document.getElementById('testSubject');
  if (!sel || !name) return;
  var norm = String(name).trim();
  if (!norm) return;
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value.toLowerCase() === norm.toLowerCase()) {
      if (selectIt) sel.selectedIndex = i;
      return;
    }
  }
  var opt = document.createElement('option');
  opt.value = norm;
  opt.textContent = norm;
  var customOpt = sel.querySelector('option[value="__custom__"]');
  if (customOpt) {
    sel.insertBefore(opt, customOpt);
  } else {
    sel.appendChild(opt);
  }
  if (selectIt) sel.value = norm;
}

async function tcLoadAllAvailableSubjects() {
  var set = new Set();

  // 1. Group Editor standard subjects:
  var groupEditorDefaults = ['English', 'French', 'Science', 'Mathematics', 'History', 'Geography', 'Art', 'Music', 'Physical Education', 'Spanish', 'German'];
  groupEditorDefaults.forEach(function (s) { if (s) set.add(s.trim()); });

  // 2. Group Editor class-groups.js subjects:
  (activeClassGroups || []).forEach(function (g) {
    if (g && g.subject && typeof g.subject === 'string' && g.subject.trim()) {
      set.add(g.subject.trim());
    }
  });
  if (typeof rawMeta === 'object' && rawMeta) {
    Object.keys(rawMeta).forEach(function (k) {
      var m = rawMeta[k];
      if (m && m.subject && typeof m.subject === 'string' && m.subject.trim()) {
        set.add(m.subject.trim());
      }
    });
  }

  // 3. Competence Database subjects:
  if (typeof CompetenceAggregatorService !== 'undefined' && typeof CompetenceAggregatorService.getAvailableSubjects === 'function') {
    try {
      var compSubs = await CompetenceAggregatorService.getAvailableSubjects();
      if (Array.isArray(compSubs)) {
        compSubs.forEach(function (cs) { if (cs && typeof cs === 'string' && cs.trim()) set.add(cs.trim()); });
      }
    } catch (_) {}
  }
  if (Array.isArray(_cachedCompetences)) {
    _cachedCompetences.forEach(function (c) {
      if (c.subjectId) set.add(c.subjectId.trim());
      else if (c.subject) set.add(c.subject.trim());
    });
  }

  // 4. Correction Criteria Database subjects:
  if (Array.isArray(_allCriteriaBanks)) {
    _allCriteriaBanks.forEach(function (b) {
      if (Array.isArray(b.criteria)) {
        b.criteria.forEach(function (cr) {
          if (cr.subjectId) set.add(cr.subjectId.trim());
          if (cr.subject) set.add(cr.subject.trim());
        });
      }
    });
  }

  // 5. Custom Database (custom-test-exercises.json, learning banks):
  if (window.Desktop && Desktop.isElectron && Desktop.isElectron() && typeof Desktop.readJson === 'function') {
    try {
      var exRes = await window.Desktop.readJson('customExercises', 'custom-test-exercises.json');
      if (exRes && exRes.ok && Array.isArray(exRes.data)) {
        exRes.data.forEach(function (item) {
          if (item && item.subject && typeof item.subject === 'string' && item.subject.trim()) {
            set.add(item.subject.trim());
          }
        });
      }
    } catch (_) {}
  }
  if (Array.isArray(_cachedTestExercises)) {
    _cachedTestExercises.forEach(function (item) {
      if (item && item.subject && typeof item.subject === 'string' && item.subject.trim()) {
        set.add(item.subject.trim());
      }
    });
  }

  // 6. Current Test subject:
  if (currentTest && currentTest.subject && typeof currentTest.subject === 'string' && currentTest.subject.trim()) {
    set.add(currentTest.subject.trim());
  }

  var sorted = Array.from(set).filter(Boolean).sort(function (a, b) {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });

  var sel = document.getElementById('testSubject');
  if (!sel) return;

  var curVal = sel.value || (currentTest && currentTest.subject) || '';
  var addCustomLabel = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
    ? i18n.t('tcAddCustomSubject')
    : '＋ Add Custom Subject…';

  var html = sorted.map(function (s) {
    return '<option value="' + escapeAttr(s) + '">' + escapeHtml(s) + '</option>';
  }).join('');
  html += '<option value="__custom__">' + escapeHtml(addCustomLabel) + '</option>';
  sel.innerHTML = html;

  if (curVal && sorted.some(function (s) { return s.toLowerCase() === curVal.toLowerCase(); })) {
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value.toLowerCase() === curVal.toLowerCase()) {
        sel.selectedIndex = i;
        currentTest.subject = sel.value;
        break;
      }
    }
  } else if (curVal && curVal !== '__custom__') {
    tcAddSubjectOption(curVal, true);
    currentTest.subject = curVal;
  } else if (sel.options.length > 1) {
    sel.selectedIndex = 0;
    currentTest.subject = sel.value;
  }
}

window.tcOnSubjectChange = async function () {
  var sel = document.getElementById('testSubject');
  if (!sel) return;
  if (sel.value === '__custom__') {
    var promptMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
      ? i18n.t('tcEnterCustomSubject')
      : 'Enter custom subject name:';
    var res = (typeof showPrompt === 'function')
      ? await showPrompt(promptMsg, '')
      : prompt(promptMsg, '');
    if (res && res.trim()) {
      var newSub = res.trim();
      tcAddSubjectOption(newSub, true);
      currentTest.subject = newSub;
      var dSub = document.getElementById('drawerCompFilterSubject');
      if (dSub) dSub.value = newSub;
      if (typeof tcFilterCompetences === 'function') tcFilterCompetences();
      tcOnDirty();
    } else {
      sel.value = currentTest.subject || (sel.options[0] ? sel.options[0].value : 'English');
    }
  } else {
    currentTest.subject = sel.value;
    var dSubEl = document.getElementById('drawerCompFilterSubject');
    if (dSubEl) dSubEl.value = currentTest.subject;
    if (typeof tcFilterCompetences === 'function') tcFilterCompetences();
    tcOnDirty();
  }
};

// ── Metadata Panel Rendering ─────────────────────────────────────────
function renderTestMeta() {
  document.getElementById('testTitle').value = currentTest.title || '';
  if (currentTest.subject) {
    tcAddSubjectOption(currentTest.subject, true);
  }
  var subEl = document.getElementById('testSubject');
  if (subEl) {
    subEl.value = currentTest.subject || (subEl.options[0] ? subEl.options[0].value : 'English');
  }
  var classSel = document.getElementById('testClass');
  if (classSel) {
    var matching = activeClassGroups.find(function (g) {
      return g.id === currentTest.classId || g.name === currentTest.classId;
    });
    if (matching) {
      classSel.value = matching.id;
      currentTest.className = matching.name || matching.id;
      activeStudents = matching.students || [];
    } else {
      classSel.value = currentTest.classId || '';
      activeStudents = [];
    }
  }
  document.getElementById('testDate').value = currentTest.date || '';
  document.getElementById('testDuration').value = currentTest.durationMinutes || 45;
  document.getElementById('testScope').value = currentTest.scope || '';
  document.getElementById('testTeacher').value = currentTest.teacher || '';
  var scSel = document.getElementById('testScale');
  if (scSel) {
    scSel.value = currentTest.scaleModelId || (currentTest.scaleModel && currentTest.scaleModel.id) || 'none';
  }
  updatePointsBadge();
  if (typeof tcRenderTestGradingScaleBar === 'function') {
    tcRenderTestGradingScaleBar();
  }
  if (typeof renderTestCompetenceBadges === 'function') {
    renderTestCompetenceBadges();
  }
  if (typeof tcRenderTestCriteriaBar === 'function') {
    tcRenderTestCriteriaBar();
  }
  tcUpdateTestLinksBadge();
  tcUpdateUnitSeqBadge();
  if (currentTest.classId && typeof tcResolveClassInheritedContext === 'function') {
    tcResolveClassInheritedContext(currentTest.classId);
  }
  // Sync competence drawer filters from test subject and linked class level
  var dSubSync = document.getElementById('drawerCompFilterSubject');
  var dYrSync = document.getElementById('drawerCompFilterYear');
  var syncSubj = currentTest.subject || (matching && matching.subject) || '';
  if (dSubSync && syncSubj) {
    var tSubSync = String(syncSubj).trim().toLowerCase();
    for (var si = 0; si < dSubSync.options.length; si++) {
      var sv = (dSubSync.options[si].value || '').toLowerCase().trim();
      if (sv !== 'all' && sv !== '' && (sv === tSubSync || tSubSync.includes(sv) || sv.includes(tSubSync))) {
        dSubSync.selectedIndex = si;
        break;
      }
    }
    if (typeof tcPopulateCompCategoryDropdown === 'function') tcPopulateCompCategoryDropdown(dSubSync.value);
  }
  var syncLvl = (matching && (matching.level || matching.yearLevel || matching.year)) || '';
  if (dYrSync && syncLvl) {
    var tLvlSync = String(syncLvl).trim().toLowerCase();
    var matchedSyncYr = false;
    for (var yi = 0; yi < dYrSync.options.length; yi++) {
      var yv = (dYrSync.options[yi].value || '').toLowerCase().trim();
      if (yv !== 'all' && yv !== '' && yv === tLvlSync) {
        dYrSync.selectedIndex = yi;
        matchedSyncYr = true;
        break;
      }
    }
    if (!matchedSyncYr) {
      var numM = tLvlSync.match(/(?:^|\D)([1-6])(?:\D|$)/);
      if (numM) {
        var yrRe = new RegExp('(?:^|\\D)' + numM[1] + '(?:[eè]me?|e|th)?(?:\\D|$)', 'i');
        for (var ym = 0; ym < dYrSync.options.length; ym++) {
          var ymv = (dYrSync.options[ym].value || '').toLowerCase().trim();
          if (ymv !== 'all' && ymv !== '' && yrRe.test(ymv)) {
            dYrSync.selectedIndex = ym;
            break;
          }
        }
      }
    }
  }
  if (typeof tcFilterCompetences === 'function') tcFilterCompetences();
  if (typeof tcSyncHeaderBlockFromState === 'function') {
    tcSyncHeaderBlockFromState();
  }
  if (typeof tcUpdateBlockBadges === 'function') {
    tcUpdateBlockBadges();
  }
  if (typeof tcScheduleLivePreviewUpdate === 'function') {
    tcScheduleLivePreviewUpdate();
  }
  tcSyncActiveThemeDropdowns();
}

function tcGetActiveTestUrn() {
  if (!currentTest) return null;
  var fn = currentTest._filename || (currentTest.id ? (currentTest.id.endsWith('.json') ? currentTest.id : (currentTest.id + '.json')) : null);
  if (!fn) return null;
  return 'cmt:test:' + fn;
}

async function tcUpdateTestLinksBadge() {
  var btn = document.getElementById('btn-tc-test-links');
  if (!btn) return;
  var urn = tcGetActiveTestUrn();
  if (!urn || typeof LinksService === 'undefined') {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = 'inline-flex';
  var iconHtml = '<img src="../assets/icons/links.svg" class="btn-icon" alt="" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;" />';
  try {
    var links = await LinksService.getLinksFor(urn);
    var tags = await LinksService.getTagsFor(urn);
    var tagPart = tags.length ? (' | TAGS: ' + tags.length) : '';
    btn.innerHTML = iconHtml + '[' + links.length + tagPart + ']';
  } catch (_) {
    btn.innerHTML = iconHtml + '[0]';
  }
}
window.tcUpdateTestLinksBadge = tcUpdateTestLinksBadge;

window.tcOpenTestLinksModal = function () {
  var urn = tcGetActiveTestUrn();
  if (!urn || typeof TagLinkModal === 'undefined') {
    if (window.showToast) showToast(i18n.t('tcPleaseSaveBeforeLinking'), true);
    return;
  }
  TagLinkModal.open({
    urn: urn,
    title: currentTest.title || 'Test',
    label: currentTest.title || 'Test',
    subtitle: 'Test Creator • ' + (currentTest.subject || currentTest.classId || 'Test'),
    type: 'test',
    classId: currentTest.classId,
    onUpdate: tcUpdateTestLinksBadge
  });
};

if (typeof window !== 'undefined') {
  window.addEventListener('cmt-links-changed', function () {
    tcUpdateTestLinksBadge();
  });
}

function updatePointsBadge() {
  var total = TestCreatorService.calculateTotalTestPoints(currentTest);
  var badge = document.getElementById('totalPointsBadge');
  badge.innerHTML = '<span>Total: ' + total + ' pts</span>';
  if (total === 20 || total === 100) {
    badge.classList.add('balanced');
  } else {
    badge.classList.remove('balanced');
  }
  if (typeof tcRenderTestGradingScaleBar === 'function') {
    tcRenderTestGradingScaleBar();
  }
}

