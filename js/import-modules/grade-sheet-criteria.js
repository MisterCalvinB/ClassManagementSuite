(function () {
  'use strict';

  var DEFAULT_CRITERION_GRADES = ["6", "5.5", "5", "4.5", "4", "3.5", "3", "2.5", "2", "1.5", "1"];

  var DEFAULT_GRADE_COLORS = {
    "6": "#16a34a",
    "5.5": "#4d7c0f",
    "5": "#65a30d",
    "4.5": "#ca8a04",
    "4": "#d97706",
    "3.5": "#f97316",
    "3": "#ea580c",
    "2.5": "#e11d48",
    "2": "#dc2626",
    "1.5": "#991b1b",
    "1": "#7f1d1d"
  };

  function getDefaultGradeColor(key, idx, total) {
    if (key != null && DEFAULT_GRADE_COLORS[String(key)]) {
      return DEFAULT_GRADE_COLORS[String(key)];
    }
    var num = parseFloat(key);
    if (!isNaN(num)) {
      if (num >= 6) return "#16a34a";
      if (num >= 5) return "#65a30d";
      if (num >= 4) return "#d97706";
      if (num >= 3) return "#ea580c";
      if (num >= 2) return "#dc2626";
      return "#991b1b";
    }
    if (total && total > 1 && idx != null) {
      var ratio = idx / (total - 1);
      var palette = ["#16a34a", "#65a30d", "#d97706", "#ea580c", "#dc2626", "#991b1b"];
      var pIdx = Math.min(palette.length - 1, Math.floor(ratio * palette.length));
      return palette[pIdx];
    }
    return "#d97706";
  }

  function normalizeCriterion(item, index) {
    var src = item && typeof item === 'object' ? item : {};
    var name = typeof src.name === 'string' && src.name.trim() ? src.name.trim() : ('Criterion ' + ((index || 0) + 1));
    var grades = Array.isArray(src.grades) && src.grades.length ? src.grades.map(String) : DEFAULT_CRITERION_GRADES.slice();
    var comments = {};
    var colors = {};
    grades.forEach(function (k, idx) {
      comments[k] = (src.comments && typeof src.comments[k] === 'string') ? src.comments[k] : '';
      colors[k] = (src.colors && typeof src.colors[k] === 'string' && src.colors[k].trim())
        ? src.colors[k].trim()
        : getDefaultGradeColor(k, idx, grades.length);
    });
    var minPts = src.minPoints != null && !isNaN(Number(src.minPoints)) ? Number(src.minPoints) : null;
    var maxPts = src.maxPoints != null && !isNaN(Number(src.maxPoints)) ? Number(src.maxPoints) : null;
    var rawInterval = src.interval != null && !isNaN(Number(src.interval)) && Number(src.interval) > 0 ? Number(src.interval) : null;
    return {
      name: name,
      grades: grades,
      comments: comments,
      colors: colors,
      minPoints: minPts,
      maxPoints: maxPts,
      interval: rawInterval
    };
  }

  var existingCriteriaCache = [];
  var existingChipsCache = [];

  window.IMPORT_MODULE_GRADE_SHEET_CRITERIA = {
    id: 'gradeSheetCriteria',
    i18nKey: 'importDestGradeSheetCriteria',
    hasGroupStep: false,
    hasWbStep: false,
    target: 'user',
    targetFile: 'correction-criteria.js',
    doneToolPage: 'grade-sheet.html',
    doneActionKey: 'importBtnOpenGradeSheet',
    fields: [
      {
        key: 'name',
        i18nKey: 'importCriteriaFieldName',
        required: true,
        autoMatch: ['criterion', 'criterion name', 'critère', 'critere', 'nom du critère', 'nom du critere', 'kriterium', 'criterio', 'name', 'rubric', 'title']
      },
      {
        key: 'grade',
        i18nKey: 'importCriteriaFieldGrade',
        required: false,
        autoMatch: ['grade', 'level', 'note', 'note/grade', 'stufe', 'voto', 'score', 'mark', 'band', 'echelon', 'step']
      },
      {
        key: 'descriptor',
        i18nKey: 'importCriteriaFieldDescriptor',
        required: false,
        autoMatch: ['descriptor', 'description', 'comment', 'commentaire', 'descripteur', 'beschreibung', 'descrizione', 'criteria descriptor', 'text', 'rubric text', 'feedback', 'desc']
      },
      {
        key: 'color',
        i18nKey: 'importCriteriaFieldColor',
        required: false,
        autoMatch: ['color', 'colour', 'couleur', 'farbe', 'colore', 'hex', 'color code']
      },
      {
        key: 'minPoints',
        i18nKey: 'importCriteriaFieldMinPoints',
        required: false,
        type: 'number',
        autoMatch: ['min points', 'min pts', 'min', 'minimum points', 'points min', 'minpoints']
      },
      {
        key: 'maxPoints',
        i18nKey: 'importCriteriaFieldMaxPoints',
        required: false,
        type: 'number',
        autoMatch: ['max points', 'max pts', 'max', 'maximum points', 'points max', 'total points', 'points', 'maxpoints', 'bareme', 'barème']
      },
      {
        key: 'interval',
        i18nKey: 'importCriteriaFieldInterval',
        required: false,
        type: 'number',
        autoMatch: ['interval', 'step', 'pas', 'point step', 'point interval', 'intervall', 'passo']
      },
      // Wide spreadsheet format column descriptors
      { key: 'desc6', i18nKey: 'importCriteriaFieldDesc6', required: false, autoMatch: ['grade 6', 'grade6', 'note 6', 'note6', '6', 'desc 6', 'desc6'] },
      { key: 'desc55', i18nKey: 'importCriteriaFieldDesc55', required: false, autoMatch: ['grade 5.5', 'grade 5,5', 'note 5.5', 'note 5,5', '5.5', '5,5'] },
      { key: 'desc5', i18nKey: 'importCriteriaFieldDesc5', required: false, autoMatch: ['grade 5', 'grade5', 'note 5', 'note5', '5', 'desc 5', 'desc5'] },
      { key: 'desc45', i18nKey: 'importCriteriaFieldDesc45', required: false, autoMatch: ['grade 4.5', 'grade 4,5', 'note 4.5', 'note 4,5', '4.5', '4,5'] },
      { key: 'desc4', i18nKey: 'importCriteriaFieldDesc4', required: false, autoMatch: ['grade 4', 'grade4', 'note 4', 'note4', '4', 'desc 4', 'desc4'] },
      { key: 'desc35', i18nKey: 'importCriteriaFieldDesc35', required: false, autoMatch: ['grade 3.5', 'grade 3,5', 'note 3.5', 'note 3,5', '3.5', '3,5'] },
      { key: 'desc3', i18nKey: 'importCriteriaFieldDesc3', required: false, autoMatch: ['grade 3', 'grade3', 'note 3', 'note3', '3', 'desc 3', 'desc3'] },
      { key: 'desc25', i18nKey: 'importCriteriaFieldDesc25', required: false, autoMatch: ['grade 2.5', 'grade 2,5', 'note 2.5', 'note 2,5', '2.5', '2,5'] },
      { key: 'desc2', i18nKey: 'importCriteriaFieldDesc2', required: false, autoMatch: ['grade 2', 'grade2', 'note 2', 'note2', '2', 'desc 2', 'desc2'] },
      { key: 'desc15', i18nKey: 'importCriteriaFieldDesc15', required: false, autoMatch: ['grade 1.5', 'grade 1,5', 'note 1.5', 'note 1,5', '1.5', '1,5'] },
      { key: 'desc1', i18nKey: 'importCriteriaFieldDesc1', required: false, autoMatch: ['grade 1', 'grade1', 'note 1', 'note1', '1', 'desc 1', 'desc1'] }
    ],

    conflictKey: function (row) {
      return (row.name || '').trim().toLowerCase();
    },

    loadExisting: async function () {
      existingCriteriaCache = [];
      existingChipsCache = [];
      try {
        if (window.Desktop && Desktop.isElectron() && typeof Desktop.readText === 'function') {
          var res = await Desktop.readText('user', 'correction-criteria.js');
          if (res && res.ok && res.content) {
            var fn = new Function(res.content + '\nreturn { criteria: (typeof XLSM_CRITERIA !== "undefined" ? XLSM_CRITERIA : []), chips: (typeof OBSERVATION_CHECKLIST_GROUPS !== "undefined" ? OBSERVATION_CHECKLIST_GROUPS : []) };');
            var loaded = fn();
            if (loaded && Array.isArray(loaded.criteria)) {
              existingCriteriaCache = loaded.criteria.map(normalizeCriterion);
            }
            if (loaded && Array.isArray(loaded.chips)) {
              existingChipsCache = loaded.chips;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load user/correction-criteria.js:', e);
      }

      if (!existingCriteriaCache.length) {
        try {
          var ls = localStorage.getItem('gs_reference_criteria_v1');
          if (ls) {
            var parsed = JSON.parse(ls);
            if (Array.isArray(parsed)) {
              existingCriteriaCache = parsed.map(normalizeCriterion);
            }
          }
        } catch (_) {}
      }

      return existingCriteriaCache;
    },

    getExistingList: function () {
      return existingCriteriaCache;
    },

    write: async function (mappedRows, conflictDecisions, options) {
      await this.loadExisting();
      var criteria = existingCriteriaCache.slice();
      var chips = existingChipsCache.slice();

      var existingByKey = {};
      criteria.forEach(function (c, idx) {
        var k = (c.name || '').trim().toLowerCase();
        if (k) existingByKey[k] = idx;
      });

      // Group incoming rows by criterion name
      var groupedRows = {};
      var groupOrder = [];

      mappedRows.forEach(function (row, rowIdx) {
        var rawName = (row.name || '').trim();
        if (!rawName) return;
        var k = rawName.toLowerCase();
        if (!groupedRows[k]) {
          groupedRows[k] = { name: rawName, rows: [], firstIdx: rowIdx };
          groupOrder.push(k);
        }
        groupedRows[k].rows.push({ row: row, idx: rowIdx });
      });

      var added = 0, updated = 0, skipped = 0;

      groupOrder.forEach(function (k) {
        var group = groupedRows[k];
        var existIdx = existingByKey[k];
        var isConflict = existIdx !== undefined;

        // Determine decision from first row of this group or decisions map
        var decision = isConflict ? (conflictDecisions[group.firstIdx] || 'skip') : 'new';

        if (decision === 'skip') {
          skipped += group.rows.length;
          return;
        }

        var baseCriterion;
        if (decision === 'overwrite' && isConflict) {
          baseCriterion = JSON.parse(JSON.stringify(criteria[existIdx]));
        } else {
          baseCriterion = {
            name: decision === 'new' && isConflict ? (group.name + ' (Imported)') : group.name,
            grades: DEFAULT_CRITERION_GRADES.slice(),
            comments: {},
            colors: {},
            minPoints: null,
            maxPoints: null,
            interval: null
          };
          DEFAULT_CRITERION_GRADES.forEach(function (g, gIdx) {
            baseCriterion.comments[g] = '';
            baseCriterion.colors[g] = getDefaultGradeColor(g, gIdx, DEFAULT_CRITERION_GRADES.length);
          });
        }

        // Apply row updates
        group.rows.forEach(function (item) {
          var r = item.row;

          // Points
          if (r.minPoints != null && r.minPoints !== '' && !isNaN(Number(r.minPoints))) {
            baseCriterion.minPoints = Number(r.minPoints);
          }
          if (r.maxPoints != null && r.maxPoints !== '' && !isNaN(Number(r.maxPoints))) {
            baseCriterion.maxPoints = Number(r.maxPoints);
          }
          if (r.interval != null && r.interval !== '' && !isNaN(Number(r.interval)) && Number(r.interval) > 0) {
            baseCriterion.interval = Number(r.interval);
          }

          // Single-grade row format
          var gradeKey = r.grade != null && String(r.grade).trim() !== '' ? String(r.grade).trim() : null;
          if (gradeKey) {
            if (!baseCriterion.grades.includes(gradeKey)) {
              baseCriterion.grades.push(gradeKey);
            }
            if (r.descriptor != null && String(r.descriptor).trim() !== '') {
              baseCriterion.comments[gradeKey] = String(r.descriptor).trim();
            }
            if (r.color != null && String(r.color).trim() !== '') {
              baseCriterion.colors[gradeKey] = String(r.color).trim();
            } else if (!baseCriterion.colors[gradeKey]) {
              baseCriterion.colors[gradeKey] = getDefaultGradeColor(gradeKey);
            }
          }

          // Wide-table column formats (desc6, desc55, desc5, etc.)
          var wideMappings = [
            { col: 'desc6', grade: '6' },
            { col: 'desc55', grade: '5.5' },
            { col: 'desc5', grade: '5' },
            { col: 'desc45', grade: '4.5' },
            { col: 'desc4', grade: '4' },
            { col: 'desc35', grade: '3.5' },
            { col: 'desc3', grade: '3' },
            { col: 'desc25', grade: '2.5' },
            { col: 'desc2', grade: '2' },
            { col: 'desc15', grade: '1.5' },
            { col: 'desc1', grade: '1' }
          ];

          wideMappings.forEach(function (wm) {
            if (r[wm.col] != null && String(r[wm.col]).trim() !== '') {
              if (!baseCriterion.grades.includes(wm.grade)) {
                baseCriterion.grades.push(wm.grade);
              }
              baseCriterion.comments[wm.grade] = String(r[wm.col]).trim();
              if (!baseCriterion.colors[wm.grade]) {
                baseCriterion.colors[wm.grade] = getDefaultGradeColor(wm.grade);
              }
            }
          });
        });

        var normalized = normalizeCriterion(baseCriterion);

        if (decision === 'overwrite' && isConflict) {
          criteria[existIdx] = normalized;
          updated += group.rows.length;
        } else {
          criteria.push(normalized);
          existingByKey[normalized.name.toLowerCase()] = criteria.length - 1;
          added += group.rows.length;
        }
      });

      // Persist to user/correction-criteria.js and localStorage
      var criteriaText = 'const XLSM_CRITERIA = ' + JSON.stringify(criteria, null, 2) + ';\n' +
        'const OBSERVATION_CHECKLIST_GROUPS = ' + JSON.stringify(chips, null, 2) + ';\n';

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.saveText === 'function') {
        var saveRes = await Desktop.saveText('user', 'correction-criteria.js', criteriaText);
        if (!saveRes || !saveRes.ok) {
          return { ok: false, error: (saveRes && saveRes.error) || 'Failed to save correction-criteria.js' };
        }
      }

      try {
        localStorage.setItem('gs_reference_criteria_v1', JSON.stringify(criteria));
      } catch (_) {}

      return {
        ok: true,
        added: added,
        updated: updated,
        skipped: skipped
      };
    }
  };
})();
