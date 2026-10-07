/**
 * Test Creator Service — Class Management Tools (CMT)
 *
 * Provides data modeling, exercise builders, points calculation, Group A/B variant generation,
 * student variant assignment (alternating, seating plan, manual matrix),
 * exercise database auto-saving, Grade Sheet evaluation serialization,
 * Competence Portfolio syncing, and multi-format exporters (HTML, Markdown, DOCX, Print/PDF).
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TestCreatorService = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var TestCreatorService = {};

  // ── 1. Default Subjects & Options ──────────────────────────────────────────
  TestCreatorService.DEFAULT_SUBJECTS = [
    { id: 'English', name: 'English', icon: 'book.svg', color: '#2563eb' },
    { id: 'French', name: 'French', icon: 'french.svg', color: '#7c3aed' },
    { id: 'Science', name: 'Science', icon: 'lightbulb.svg', color: '#d97706' },
    { id: 'Mathematics', name: 'Mathematics', icon: 'table.svg', color: '#059669' },
    { id: 'History', name: 'History', icon: 'flag.svg', color: '#dc2626' },
    { id: 'Geography', name: 'Geography', icon: 'flag.svg', color: '#0891b2' },
    { id: 'Art', name: 'Art', icon: 'award.svg', color: '#e11d48' },
    { id: 'Music', name: 'Music', icon: 'award.svg', color: '#9333ea' },
    { id: 'Physical Education', name: 'Physical Education', icon: 'award.svg', color: '#16a34a' },
    { id: 'Spanish', name: 'Spanish', icon: 'flag.svg', color: '#ea580c' },
    { id: 'German', name: 'German', icon: 'flag.svg', color: '#b45309' }
  ];

  TestCreatorService.DEFAULT_MATERIALS = [
    'Pen & Pencil only',
    'Bilingual Dictionary allowed',
    'Monolingual Dictionary allowed',
    'Scientific Calculator allowed',
    'Basic Calculator allowed',
    'Formula Sheet provided',
    'Open Book / Course Notes',
    'Rough Paper / Draft provided',
    'No electronic devices allowed'
  ];

  TestCreatorService.DEFAULT_SCALES = [
    { id: 'pts_20', key: 'pts_20', name: 'French Scale (0 to 20)', label: 'French Scale (0 to 20)', max: 20 },
    { id: 'pts_100', key: 'pts_100', name: 'Percentage (0 to 100%)', label: 'Percentage (0 to 100%)', max: 100 },
    { id: 'pts_6', key: 'pts_6', name: 'Swiss / German Scale (1 to 6)', label: 'Swiss / German Scale (1 to 6)', max: 6 },
    { id: 'letter_af', key: 'letter_af', name: 'Letter Grades (A+ to F)', label: 'Letter Grades (A+ to F)', max: 100 },
    { id: 'pts_total', key: 'pts_total', name: 'Exact Points Total', label: 'Exact Points Total', max: 0 }
  ];

  // ── 2. Supported Exercise Types ───────────────────────────────────────────
  TestCreatorService.EXERCISE_TYPES = [
    { id: 'cloze', name: 'Cloze / Gap Fill', icon: 'gapfill.svg', desc: 'Fill in the missing words or phrases' },
    { id: 'mcq', name: 'Multiple Choice (MCQ)', icon: 'quiz.svg', desc: 'Single or multiple correct answers' },
    { id: 'open_question', name: 'Open Question', icon: 'file-text.svg', desc: 'Short or long answer with lines or grid' },
    { id: 'composition', name: 'Composition / Essay', icon: 'document-editor.svg', desc: 'Writing prompt with word count & rubric' },
    { id: 'matching', name: 'Matching / Pairing', icon: 'merge.svg', desc: 'Connect Column A items to Column B' },
    { id: 'transformation', name: 'Sentence Transformation', icon: 'refresh.svg', desc: 'Rewrite sentence using a clue keyword' },
    { id: 'translation', name: 'Translation', icon: 'book.svg', desc: 'Translate sentences or short texts' },
    { id: 'picture_description', name: 'Picture Description', icon: 'board.svg', desc: 'Analyze or describe an embedded image' },
    { id: 'table_completion', name: 'Table Completion', icon: 'table.svg', desc: 'Interactive grid with fillable blank cells' },
    { id: 'odd_one_out', name: 'Odd One Out', icon: 'clear.svg', desc: 'Identify the intruder and justify choice' },
    { id: 'reading_comprehension', name: 'Reading Comprehension', icon: 'book.svg', desc: 'Source passage followed by sub-questions' },
    { id: 'section_competences', name: 'Competences Block', icon: 'award.svg', desc: 'Curriculum objectives & competence table block', isSection: true },
    { id: 'section_criteria', name: 'Criteria Rubric Block', icon: 'check-circle.svg', desc: 'Assessment criteria & evaluation rubric block', isSection: true },
    { id: 'section_grading_scale', name: 'Grading Scale Block', icon: 'table.svg', desc: 'Score conversion & grade threshold table block', isSection: true }
  ];

  // ── 2b. Default Header Configuration & Typography ─────────────────────────
  TestCreatorService.DEFAULT_HEADER_CONFIG = {
    // Visibility
    showTitle: true,
    showSubtitle: false,
    subtitleText: '',
    showStudentName: true,
    showClass: true,
    showDate: true,
    showTeacher: true,
    showDuration: true,
    showMaterials: true,
    showScope: true,
    showTotalPoints: true,
    showVariantBadge: true,
    showGradingScale: false,
    gradingScaleLabel: 'Grading Scale & Score Conversion:',
    gradingScaleStyle: { bold: true, italic: false, displayMode: 'table', background: 'default', padding: 'standard', border: 'solid' }, // 'table' | 'inline' | 'inline_grades'
    showCompetences: false,
    showCompetenceDescriptions: true,
    competencesLabel: 'Competences & Curriculum Objectives:',
    competencesStyle: { bold: true, italic: false, underline: false, displayMode: 'table', background: 'default', padding: 'standard', border: 'solid' }, // 'table' | 'badges' | 'list'
    showCriteria: false,
    showCriteriaDescriptions: true,
    criteriaLabel: 'Assessment Criteria & Evaluation Rubric:',
    criteriaStyle: { bold: true, italic: false, underline: false, displayMode: 'table', background: 'default', padding: 'standard', border: 'solid' }, // 'table' | 'compact' | 'inline'
    showInstructions: false,
    instructionsText: 'Answer all questions clearly. Write legibly and respect time constraints.',
    // Custom labels
    studentNameLabel: 'Student Name:',
    classLabel: 'Class / Group:',
    dateLabel: 'Date:',
    teacherLabel: 'Teacher:',
    durationLabel: 'Duration:',
    materialsLabel: 'Materials Allowed:',
    scopeLabel: 'Scope / Topic:',
    pointsLabel: 'Total Points:',
    // Section and metadata ordering
    sectionOrder: ['title', 'subtitle', 'metadata', 'instructions', 'gradingScale', 'competences', 'criteria'],
    metaOrder: ['studentName', 'class', 'date', 'teacher', 'duration', 'materials', 'scope', 'points', 'gradingScale', 'competences', 'criteria'],
    // Formats & typography per element: { bold, italic, underline, uppercase, size, align }
    titleStyle: { bold: true, italic: false, underline: false, uppercase: true, size: '18pt', align: 'left' },
    subtitleStyle: { bold: false, italic: true, underline: false, size: '11pt', align: 'left' },
    studentNameStyle: { bold: true, italic: false, underline: false, lineStyle: 'line' }, // 'line' | 'dotted' | 'box'
    classStyle: { bold: true, italic: false, underline: false },
    dateStyle: { bold: true, italic: false, underline: false },
    teacherStyle: { bold: true, italic: false, underline: false },
    durationStyle: { bold: true, italic: false, underline: false },
    materialsStyle: { bold: true, italic: false, underline: false, displayMode: 'inline' }, // 'inline' | 'badges'
    scopeStyle: { bold: true, italic: false, underline: false },
    pointsStyle: { bold: true, italic: false, underline: false },
    instructionsStyle: { bold: false, italic: true, underline: false, border: 'box' }, // 'box' | 'quote' | 'tint'
    // Header box layout & border
    layout: '3-columns', // '3-columns' | '2-columns' | 'compact' | 'table'
    borderStyle: 'double', // 'double' | 'neobrutalist' | 'solid' | 'dashed' | 'minimal' | 'none'
    backgroundTint: 'ivory', // 'white' | 'ivory' | 'light_gray'
    padding: 'standard' // 'compact' | 'standard' | 'spacious'
  };

  // ── 2b1. Grading Scale Parser & Converter ──────────────────────────────────
  TestCreatorService.parseScaleModelsFileContent = function (content) {
    if (!content || typeof content !== 'string') return null;
    var trimmed = content.trim();
    if (!trimmed) return null;
    try {
      var parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.scales)) return parsed.scales;
        if (Array.isArray(parsed.scaleModels)) return parsed.scaleModels;
        if (Array.isArray(parsed.XLSM_SCALE_MODELS)) return parsed.XLSM_SCALE_MODELS;
        if (Array.isArray(parsed.records)) return parsed.records;
      }
    } catch (_) {}
    try {
      var fn = new Function(content + '\n;try{return typeof XLSM_SCALE_MODELS !== "undefined" ? XLSM_SCALE_MODELS : (typeof customScaleModels !== "undefined" ? customScaleModels : (typeof scales !== "undefined" ? scales : null));}catch(e){return null;}');
      var res = fn();
      if (Array.isArray(res) && res.length) return res;
    } catch (_) {}
    try {
      var firstBracket = trimmed.indexOf('[');
      var lastBracket = trimmed.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        var slice = trimmed.slice(firstBracket, lastBracket + 1);
        var fn2 = new Function('return ' + slice + ';');
        var res2 = fn2();
        if (Array.isArray(res2)) return res2;
      }
    } catch (_) {}
    return null;
  };

  TestCreatorService.calculateGradeConversionTable = function (scaleModelOrId, totalTestPoints) {
    var tPts = Number(totalTestPoints) || 0;
    var model = (scaleModelOrId && typeof scaleModelOrId === 'object') ? scaleModelOrId : null;
    var mId = (typeof scaleModelOrId === 'string') ? scaleModelOrId : (model && (model.key || model.id)) || 'pts_20';
    var scaleName = (model && (model.label || model.name)) || mId;

    // Built-in lookup if model not full object
    if (!model) {
      if (mId === 'pts_6') {
        model = {
          key: 'pts_6',
          label: 'Swiss / German Scale (1 to 6)',
          minGrade: 1,
          maxGrade: 6,
          interval: 0.5,
          thresholds: {
            '6': 90, '5.5': 80, '5': 70, '4.5': 60,
            '4': 50, '3.5': 40, '3': 30, '2.5': 20,
            '2': 10, '1.5': 5, '1': 0
          }
        };
      } else if (mId === 'pts_20') {
        model = {
          key: 'pts_20',
          label: 'French Scale (0 to 20)',
          minGrade: 0,
          maxGrade: 20,
          interval: 1,
          thresholds: {
            '20': 100, '19': 95, '18': 90, '17': 85, '16': 80,
            '15': 75, '14': 70, '13': 65, '12': 60, '11': 55,
            '10': 50, '9': 45, '8': 40, '7': 35, '6': 30,
            '5': 25, '4': 20, '3': 15, '2': 10, '1': 5, '0': 0
          }
        };
      } else if (mId === 'pts_100') {
        model = {
          key: 'pts_100',
          label: 'Percentage (0 to 100%)',
          minGrade: 0,
          maxGrade: 100,
          interval: 10,
          thresholds: {
            '100%': 100, '90%': 90, '80%': 80, '70%': 70, '60%': 60,
            '50%': 50, '40%': 40, '30%': 30, '20%': 20, '10%': 10, '0%': 0
          }
        };
      } else if (mId === 'letter_af') {
        model = {
          key: 'letter_af',
          label: 'Letter Grades (A+ to F)',
          thresholds: {
            'A+': 97, 'A': 93, 'A-': 90,
            'B+': 87, 'B': 83, 'B-': 80,
            'C+': 77, 'C': 73, 'C-': 70,
            'D+': 67, 'D': 63, 'D-': 60,
            'F': 0
          }
        };
      }
    }

    scaleName = (model && (model.label || model.name)) || scaleName;
    var rows = [];

    if (model && model.thresholds) {
      var rawTh = model.thresholds;
      var parsedItems = [];
      if (Array.isArray(rawTh)) {
        rawTh.forEach(function (item) {
          if (!item) return;
          if (typeof item === 'object') {
            var g = item.grade || item.key || item.label || item.name || '';
            var p = (item.pct !== undefined) ? item.pct : ((item.value !== undefined) ? item.value : (item.minPoints !== undefined ? item.minPoints : 0));
            parsedItems.push({
              grade: String(g),
              pct: Number(p) || 0,
              desc: item.desc || item.description || item.notes || ''
            });
          }
        });
      } else if (typeof rawTh === 'object') {
        Object.keys(rawTh).forEach(function (gKey) {
          parsedItems.push({
            grade: gKey,
            pct: Number(rawTh[gKey]) || 0,
            desc: (model.descriptions && model.descriptions[gKey]) || ''
          });
        });
      }

      // Sort descending by threshold percentage
      parsedItems.sort(function (a, b) {
        if (b.pct !== a.pct) return b.pct - a.pct;
        return parseFloat(b.grade) - parseFloat(a.grade);
      });

      for (var i = 0; i < parsedItems.length; i++) {
        var it = parsedItems[i];
        var pct = it.pct;
        var minRequiredPts = Math.round((pct / 100) * tPts * 10) / 10;
        var maxPts = tPts;
        if (i > 0) {
          var prevItem = parsedItems[i - 1];
          var prevMin = Math.round((prevItem.pct / 100) * tPts * 10) / 10;
          maxPts = (prevMin > minRequiredPts) ? Math.round((prevMin - 0.5) * 10) / 10 : minRequiredPts;
          if (maxPts < minRequiredPts) maxPts = minRequiredPts;
        }
        var pointsStr = (minRequiredPts === maxPts) ? (minRequiredPts + ' pts') : (minRequiredPts + ' – ' + maxPts + ' pts');
        var color = (model.colors && model.colors[it.grade]) || null;
        rows.push({
          grade: it.grade,
          thresholdPct: pct,
          pct: pct,
          thresholdStr: '≥ ' + pct + '%',
          minPoints: minRequiredPts,
          maxPoints: maxPts,
          pointsStr: pointsStr,
          color: color,
          desc: it.desc || (model.descriptions && model.descriptions[it.grade]) || (model.description || '')
        });
      }
    } else if (model && (model.maxGrade !== undefined || model.max !== undefined)) {
      var minG = Number((model.minGrade !== undefined) ? model.minGrade : (model.min || 0));
      var maxG = Number((model.maxGrade !== undefined) ? model.maxGrade : (model.max || 20));
      var step = Number(model.interval || model.step || 1);
      if (step <= 0) step = 1;
      var currentG = maxG;
      while (currentG >= minG - 0.001) {
        var pctVal = (maxG > minG) ? Math.round(((currentG - minG) / (maxG - minG)) * 100) : 100;
        var reqPts = Math.round((pctVal / 100) * tPts * 10) / 10;
        var gDisplay = String(Math.round(currentG * 100) / 100);
        rows.push({
          grade: gDisplay,
          thresholdPct: pctVal,
          pct: pctVal,
          thresholdStr: '≥ ' + pctVal + '%',
          minPoints: reqPts,
          maxPoints: tPts,
          pointsStr: reqPts + ' pts',
          color: (model.colors && model.colors[gDisplay]) || null,
          desc: ''
        });
        currentG = Math.round((currentG - step) * 100) / 100;
      }
    }

    return {
      scaleName: scaleName,
      model: model,
      totalPoints: tPts,
      rows: rows,
      intervals: rows
    };
  };

  TestCreatorService.buildInlineGradeItems = function (tableData, totalPts, isHtml) {
    if (!tableData || !tableData.rows || !tableData.rows.length) return [];
    var tPts = Number(totalPts) || 0;
    return tableData.rows.map(function (row) {
      var g = String(row.grade !== undefined && row.grade !== null ? row.grade : '');
      var pts = (row.minPoints !== undefined) ? row.minPoints : (row.points !== undefined ? row.points : (parseFloat(row.pointsStr) || 0));
      var ptsNum = Math.round(Number(pts) * 10) / 10;

      var pctVal = (row.pct !== undefined && row.pct !== null) ? row.pct : ((row.thresholdPct !== undefined && row.thresholdPct !== null) ? row.thresholdPct : null);
      var pctNum;
      if (pctVal !== null && pctVal !== undefined) {
        pctNum = Math.round(Number(pctVal) * 10) / 10;
      } else if (tPts > 0) {
        pctNum = Math.round((ptsNum / tPts) * 1000) / 10;
      } else {
        pctNum = 0;
      }
      var pctStr = pctNum + '%';

      if (isHtml) {
        var colorBorder = row.color ? ' style="border-left: 3px solid ' + row.color + '; padding-left: 4px;"' : '';
        return '<span class="grading-scale-inline-item"' + colorBorder + '><strong class="scale-inline-grade">' + escapeHtml(g) + '</strong> = ' + ptsNum + ' <span class="scale-inline-pct">(' + pctStr + ')</span></span>';
      } else {
        return g + ' = ' + ptsNum + ' (' + pctStr + ')';
      }
    });
  };

  TestCreatorService.formatInlineGradesString = function (test, options) {
    if (!test) return '';
    var opts = options || {};
    var totalPts = (opts.totalPoints !== undefined) ? opts.totalPoints : TestCreatorService.calculateTotalTestPoints(test);
    var scaleModel = test.scaleModel || null;
    var scaleModelId = test.scaleModelId || 'pts_20';
    var tableData = TestCreatorService.calculateGradeConversionTable(scaleModel || scaleModelId, totalPts);
    var isHtml = !!opts.html;
    var items = TestCreatorService.buildInlineGradeItems(tableData, totalPts, isHtml);
    if (!items.length) {
      var sName = (scaleModel && (scaleModel.label || scaleModel.name)) || scaleModelId;
      return isHtml ? escapeHtml(sName) : sName;
    }
    var sep = isHtml ? '<span class="grading-scale-inline-sep"> · </span>' : ' · ';
    return items.join(sep);
  };

  // ── 2b2. Universal Multi-Unit Dimension Parser ────────────────────────────
  TestCreatorService.parseUnitValue = function (val, defaultUnit) {
    var defUnit = defaultUnit || 'px';
    if (val === undefined || val === null || val === '') {
      return { value: '', unit: defUnit, css: '' };
    }
    if (typeof val === 'number') {
      return { value: val, unit: defUnit, css: val + defUnit };
    }
    var s = String(val).trim();
    if (!s) return { value: '', unit: defUnit, css: '' };
    var m = s.match(/^([+-]?(?:\d*\.)?\d+)\s*(px|pt|cm|mm|em|rem|in|%)?$/i);
    if (m) {
      var num = parseFloat(m[1]);
      var u = m[2] ? m[2].toLowerCase() : defUnit;
      return { value: num, unit: u, css: num + u };
    }
    return { value: parseFloat(s) || 0, unit: defUnit, css: s };
  };

  TestCreatorService.ensureHeaderConfig = function (test) {
    if (!test) return JSON.parse(JSON.stringify(TestCreatorService.DEFAULT_HEADER_CONFIG));
    if (!test.headerConfig || typeof test.headerConfig !== 'object') {
      test.headerConfig = {};
    }
    var hc = test.headerConfig;
    var d = TestCreatorService.DEFAULT_HEADER_CONFIG;
    for (var k in d) {
      if (d.hasOwnProperty(k)) {
        if (hc[k] === undefined) {
          if (Array.isArray(d[k])) {
            hc[k] = d[k].slice();
          } else if (typeof d[k] === 'object' && d[k] !== null) {
            hc[k] = Object.assign({}, d[k]);
          } else {
            hc[k] = d[k];
          }
        } else if (Array.isArray(d[k])) {
          if (!Array.isArray(hc[k])) {
            hc[k] = d[k].slice();
          } else {
            d[k].forEach(function (item) {
              if (hc[k].indexOf(item) === -1) hc[k].push(item);
            });
          }
        } else if (typeof d[k] === 'object' && d[k] !== null) {
          hc[k] = Object.assign({}, d[k], hc[k]);
        }
      }
    }
    return hc;
  };

  // ── 2b3. Page Margins & Export Style Defaults ──────────────────────────────
  TestCreatorService.DEFAULT_EXPORT_STYLE = {
    theme: 'academic',
    fontSize: '11pt',
    lineHeight: 1.5,
    padding: '14px',
    numberedLines: false,
    margins: {
      preset: 'normal',
      top: 15,
      right: 15,
      bottom: 15,
      left: 15,
      unit: 'mm'
    }
  };

  TestCreatorService.MARGIN_PRESETS = {
    normal: { top: 15, right: 15, bottom: 15, left: 15, unit: 'mm', preset: 'normal' },
    narrow: { top: 10, right: 10, bottom: 10, left: 10, unit: 'mm', preset: 'narrow' },
    wide: { top: 25, right: 25, bottom: 25, left: 25, unit: 'mm', preset: 'wide' }
  };

  TestCreatorService.ensureExportStyle = function (test) {
    if (!test) return JSON.parse(JSON.stringify(TestCreatorService.DEFAULT_EXPORT_STYLE));
    if (!test.exportStyle || typeof test.exportStyle !== 'object') {
      test.exportStyle = {};
    }
    var es = test.exportStyle;
    var d = TestCreatorService.DEFAULT_EXPORT_STYLE;
    if (!es.theme) es.theme = test.stylesheetTheme || d.theme || 'academic';
    if (!test.stylesheetTheme) test.stylesheetTheme = es.theme;
    if (!es.fontSize) es.fontSize = d.fontSize;
    if (!es.lineHeight) es.lineHeight = d.lineHeight;
    if (!es.padding) es.padding = d.padding;
    if (es.numberedLines === undefined) es.numberedLines = d.numberedLines;
    if (!es.margins || typeof es.margins !== 'object') {
      es.margins = JSON.parse(JSON.stringify(d.margins));
    } else {
      if (es.margins.top === undefined || es.margins.top === null) es.margins.top = 15;
      if (es.margins.right === undefined || es.margins.right === null) es.margins.right = 15;
      if (es.margins.bottom === undefined || es.margins.bottom === null) es.margins.bottom = 15;
      if (es.margins.left === undefined || es.margins.left === null) es.margins.left = 15;
      if (!es.margins.unit) es.margins.unit = 'mm';
      if (!es.margins.preset) es.margins.preset = 'normal';
    }
    return es;
  };

  // ── 2b4. Built-in Header Templates ─────────────────────────────────────────
  TestCreatorService.BUILTIN_HEADER_TEMPLATES = [
    {
      id: 'hdr_neobrutalist',
      title: 'Neobrutalist Bold',
      description: 'Thick 3px solid black border, block shadow, uppercase header & 3 columns',
      config: {
        showTitle: true,
        showSubtitle: false,
        showStudentName: true,
        showClass: true,
        showDate: true,
        showTeacher: true,
        showDuration: true,
        showMaterials: true,
        showScope: true,
        showTotalPoints: true,
        showVariantBadge: true,
        showInstructions: false,
        layout: '3-columns',
        borderStyle: 'neobrutalist',
        backgroundTint: 'white',
        padding: 'standard',
        titleStyle: { bold: true, italic: false, underline: false, uppercase: true, size: '18pt', align: 'left' }
      },
      materialsAllowed: ['Pen & Pencil only', 'Ruler']
    },
    {
      id: 'hdr_academic_classic',
      title: 'Classic Academic',
      description: 'Traditional double border, serif styling, 3 columns, clean score box',
      config: {
        showTitle: true,
        showSubtitle: true,
        subtitleText: 'Term Examination',
        showStudentName: true,
        showClass: true,
        showDate: true,
        showTeacher: true,
        showDuration: true,
        showMaterials: true,
        showScope: false,
        showTotalPoints: true,
        showVariantBadge: true,
        showInstructions: false,
        layout: '3-columns',
        borderStyle: 'double',
        backgroundTint: 'ivory',
        padding: 'standard',
        titleStyle: { bold: true, italic: false, underline: false, uppercase: true, size: '16pt', align: 'center' },
        subtitleStyle: { bold: false, italic: true, underline: false, size: '11pt', align: 'center' }
      },
      materialsAllowed: ['Blue or Black pen only', 'No correction fluid']
    },
    {
      id: 'hdr_minimalist',
      title: 'Minimalist Modern',
      description: 'Clean top & bottom borders, compact padding, 2 columns',
      config: {
        showTitle: true,
        showSubtitle: false,
        showStudentName: true,
        showClass: true,
        showDate: true,
        showTeacher: true,
        showDuration: true,
        showMaterials: false,
        showScope: false,
        showTotalPoints: true,
        showVariantBadge: true,
        showInstructions: false,
        layout: '2-columns',
        borderStyle: 'minimal',
        backgroundTint: 'white',
        padding: 'compact',
        titleStyle: { bold: true, italic: false, underline: false, uppercase: false, size: '16pt', align: 'left' }
      },
      materialsAllowed: ['Pen only']
    },
    {
      id: 'hdr_formal_exam',
      title: 'Formal Exam / Cambridge Style',
      description: 'Candidate boxes, formal instructions box, permitted equipment list',
      config: {
        showTitle: true,
        showSubtitle: true,
        subtitleText: 'General Certificate Examination',
        showStudentName: true,
        studentNameLabel: 'Candidate Name & Number:',
        showClass: true,
        classLabel: 'Centre / Class:',
        showDate: true,
        showTeacher: false,
        showDuration: true,
        durationLabel: 'Time Allowed:',
        showMaterials: true,
        materialsLabel: 'Equipment Permitted:',
        showScope: false,
        showTotalPoints: true,
        pointsLabel: 'Maximum Mark:',
        showVariantBadge: true,
        showInstructions: true,
        instructionsText: 'Read each question carefully before answering. Write all answers in the spaces provided. Check your work before submitting.',
        layout: '2-columns',
        borderStyle: 'solid',
        backgroundTint: 'light_gray',
        padding: 'spacious',
        titleStyle: { bold: true, italic: false, underline: false, uppercase: true, size: '17pt', align: 'center' },
        subtitleStyle: { bold: false, italic: false, underline: false, size: '11pt', align: 'center' },
        studentNameStyle: { bold: true, italic: false, underline: false, lineStyle: 'box' },
        instructionsStyle: { bold: false, italic: true, underline: false, border: 'box' }
      },
      materialsAllowed: ['Black pen', 'HB pencil', 'Eraser', 'Ruler']
    },
    {
      id: 'hdr_compact_quiz',
      title: 'Compact Quiz Header',
      description: 'Space-saving single-row header for pop quizzes & formative tests',
      config: {
        showTitle: true,
        showSubtitle: false,
        showStudentName: true,
        showClass: true,
        showDate: true,
        showTeacher: false,
        showDuration: false,
        showMaterials: false,
        showScope: false,
        showTotalPoints: true,
        showVariantBadge: true,
        showInstructions: false,
        layout: 'compact',
        borderStyle: 'solid',
        backgroundTint: 'white',
        padding: 'compact',
        titleStyle: { bold: true, italic: false, underline: false, uppercase: true, size: '14pt', align: 'left' }
      },
      materialsAllowed: ['Pen & Pencil']
    }
  ];

  // ── 2b5. Built-in Test Models & Templates ──────────────────────────────────
  TestCreatorService.BUILTIN_TEST_TEMPLATES = [
    {
      id: 'tmpl_grammar_vocab',
      title: 'Grammar & Vocabulary Test',
      subject: 'English',
      durationMinutes: 45,
      targetPoints: 20,
      scaleModelId: 'pts_20',
      description: 'Standard language assessment: cloze text with gaps, multiple choice questions, and sentence transformations.',
      materialsAllowed: ['Pen & Pencil only', 'Ruler'],
      headerConfig: {
        showTitle: true,
        showSubtitle: false,
        showStudentName: true,
        showClass: true,
        showDate: true,
        showTeacher: true,
        showDuration: true,
        showMaterials: true,
        showScope: true,
        showTotalPoints: true,
        showVariantBadge: true,
        showInstructions: false,
        layout: '3-columns',
        borderStyle: 'neobrutalist',
        backgroundTint: 'white',
        padding: 'standard'
      },
      exportStyle: {
        fontSize: '11pt',
        lineHeight: 1.5,
        padding: '14px',
        numberedLines: false,
        margins: { preset: 'normal', top: 15, right: 15, bottom: 15, left: 15, unit: 'mm' }
      },
      exercises: [
        {
          type: 'cloze',
          title: 'Verb Tenses & Prepositions in Context',
          instructions: 'Fill in the blanks with the correct form of the word in brackets or the missing preposition.',
          points: 6,
          pointsPerItem: 1,
          options: { blankStyle: 'bracketed_box', showWordBank: false },
          content: {
            items: [
              { text: 'Yesterday, while Sarah [was walking] to the library, she [met] her former biology teacher.' },
              { text: 'If you [study] diligently every day, you will succeed [in] passing the final exam without difficulty.' },
              { text: 'They [have lived] in this neighborhood since 2018 and are very fond [of] their local community.' }
            ]
          }
        },
        {
          type: 'mcq',
          title: 'Syntax & Lexical Choice',
          instructions: 'Select the best option (A, B, C, or D) to complete each sentence correctly.',
          points: 6,
          options: { layout: '2-columns', markerStyle: 'letters', shuffleOptions: false },
          content: {
            questions: [
              {
                prompt: 'Despite the heavy rain, the football match was not ________.',
                points: 2,
                options: ['called off', 'put down', 'given in', 'taken away'],
                correctIndices: [0]
              },
              {
                prompt: 'Hardly ________ arrived at the station when the train pulled away.',
                points: 2,
                options: ['had we', 'we had', 'did we have', 'have we'],
                correctIndices: [0]
              },
              {
                prompt: 'The manager suggested that everyone ________ present at the opening session.',
                points: 2,
                options: ['be', 'is', 'was', 'being'],
                correctIndices: [0]
              }
            ]
          }
        },
        {
          type: 'transformation',
          title: 'Sentence Rewriting',
          instructions: 'Complete the second sentence so that it has a similar meaning to the first, using the word given in brackets. Do not change the word given.',
          points: 8,
          options: { wordConstraint: 'Use between 2 and 5 words, including the word given.', keywordStyle: 'bold_blue' },
          content: {
            items: [
              {
                original: 'It was too cold for us to swim in the lake.',
                keyword: 'WARM',
                targetPrefix: 'The lake was',
                targetSuffix: 'for us to swim in.',
                solution: 'not warm enough'
              },
              {
                original: 'I am certain that Paul didn\'t leave the keys on the counter.',
                keyword: 'HAVE',
                targetPrefix: 'Paul',
                targetSuffix: 'the keys on the counter.',
                solution: 'cannot have left'
              },
              {
                original: 'Someone stole my bicycle while I was inside the shop.',
                keyword: 'HAD',
                targetPrefix: 'I',
                targetSuffix: 'while I was inside the shop.',
                solution: 'had my bicycle stolen'
              },
              {
                original: '"I will call you tomorrow," promised Mark.',
                keyword: 'TOLD',
                targetPrefix: 'Mark',
                targetSuffix: 'he would call the next day.',
                solution: 'told me that'
              }
            ]
          }
        }
      ]
    },
    {
      id: 'tmpl_reading_writing',
      title: 'Reading Comprehension & Composition Exam',
      subject: 'English',
      durationMinutes: 60,
      targetPoints: 30,
      scaleModelId: 'pts_30',
      description: 'Formal exam format: numbered reading passage with glossary, analytical questions, and structured composition with checklist and rubric.',
      materialsAllowed: ['Black or Blue pen', 'Highlighter permitted on text'],
      headerConfig: {
        showTitle: true,
        showSubtitle: true,
        subtitleText: 'Paper 1: Reading & Extended Writing',
        showStudentName: true,
        studentNameLabel: 'Candidate Full Name:',
        showClass: true,
        showDate: true,
        showTeacher: true,
        showDuration: true,
        showMaterials: true,
        showScope: false,
        showTotalPoints: true,
        showVariantBadge: true,
        showInstructions: true,
        instructionsText: 'Read the passage thoroughly before attempting questions. Write in continuous prose where required. Pay close attention to spelling, punctuation, and grammar.',
        layout: '2-columns',
        borderStyle: 'double',
        backgroundTint: 'ivory',
        padding: 'spacious'
      },
      exportStyle: {
        fontSize: '11pt',
        lineHeight: 1.5,
        padding: '16px',
        numberedLines: true,
        margins: { preset: 'normal', top: 15, right: 15, bottom: 15, left: 15, unit: 'mm' }
      },
      exercises: [
        {
          type: 'reading_comprehension',
          title: 'Reading Text: The Future of Renewable Energy',
          instructions: 'Read the article carefully and answer all questions in full sentences.',
          points: 15,
          options: { passageLayout: 'single_column', vocabularyFootnotes: 'Turbine: machine for producing continuous power | Intermittent: not steady or continuous' },
          content: {
            passageTitle: 'Harnessing the Winds of Change',
            passageText: 'Across the coastal plains of northern Europe, towering wind turbines have become a familiar sight on the horizon.\nEngineers and environmental scientists argue that offshore wind farms represent one of humanity\'s most promising tools in the battle against climate change.\nHowever, transitioning to an electric grid powered entirely by renewables presents unprecedented technical challenges.\nThe wind does not blow consistently, nor does the sun always shine, meaning energy storage technologies must advance rapidly to prevent blackouts during periods of peak demand.\nInnovations in battery chemistry and hydrogen electrolysis are beginning to bridge this gap, offering hope for a carbon-neutral industrial future.',
            subQuestions: [
              {
                prompt: 'According to paragraph 1, where are wind turbines primarily being established in northern Europe?',
                points: 3,
                lineCount: 2,
                answerPrefix: 'Wind turbines are primarily established'
              },
              {
                prompt: 'Why does a renewable energy grid present unprecedented technical challenges?',
                points: 4,
                lineCount: 3,
                lengthGuidance: 'Explain in 2–3 sentences'
              },
              {
                prompt: 'Renewable energy sources deliver consistent and uninterrupted electricity without requiring storage solutions.',
                answerType: 'true_false_justify',
                points: 4,
                solution: 'False — "The wind does not blow consistently, nor does the sun always shine, meaning energy storage technologies must advance rapidly"'
              },
              {
                prompt: 'Explain how innovations in battery chemistry and hydrogen electrolysis address the intermittency of wind energy.',
                points: 4,
                lineCount: 3,
                lengthGuidance: '30–40 words'
              }
            ]
          }
        },
        {
          type: 'composition',
          title: 'Extended Writing: Opinion Essay',
          instructions: 'Write a well-structured argumentative essay addressing the prompt below.',
          points: 15,
          markingRubric: [
            { id: 'r1', title: 'Content & Relevance to Prompt', maxPoints: 5 },
            { id: 'r2', title: 'Organisation, Paragraphing & Cohesion', maxPoints: 4 },
            { id: 'r3', title: 'Vocabulary & Lexical Variety', maxPoints: 3 },
            { id: 'r4', title: 'Grammar Accuracy & Punctuation', maxPoints: 3 }
          ],
          options: {
            textGenre: 'Opinion Essay',
            showGenreBadge: true,
            showDraftBox: true,
            draftTitle: 'Rough Work & Outline (Not Graded)',
            draftLines: 6,
            draftStyle: 'lines',
            showWritingLines: true,
            writingLinesCount: 16,
            showChecklist: true,
            checklistTitle: 'Proofreading Checklist:',
            checklistItems: [
              'Clear introduction with a thesis statement',
              'Logical paragraphs with transition words (However, Furthermore, Consequently)',
              'Accurate verb tenses and subject-verb agreement',
              'Word count checked (150–200 words)'
            ],
            showRubric: true
          },
          content: {
            items: [
              {
                label: 'Essay Topic',
                prompt: '"Individual choices, such as reducing waste and driving less, are far more effective in combating global warming than government regulations." Do you agree or disagree? Give reasons and examples from your own knowledge.',
                targetWordCount: 180
              }
            ]
          }
        }
      ]
    },
    {
      id: 'tmpl_pop_quiz',
      title: '15-Minute Pop Quiz',
      subject: 'General',
      durationMinutes: 15,
      targetPoints: 10,
      scaleModelId: 'pts_10',
      description: 'Quick formative check with multiple choice, odd-one-out categorization, and direct sentence translation.',
      materialsAllowed: ['Pen only'],
      headerConfig: {
        showTitle: true,
        showSubtitle: false,
        showStudentName: true,
        showClass: true,
        showDate: true,
        showTeacher: false,
        showDuration: true,
        showMaterials: false,
        showScope: false,
        showTotalPoints: true,
        showVariantBadge: true,
        showInstructions: false,
        layout: 'compact',
        borderStyle: 'solid',
        backgroundTint: 'white',
        padding: 'compact'
      },
      exportStyle: {
        fontSize: '10pt',
        lineHeight: 1.4,
        padding: '10px',
        numberedLines: false,
        margins: { preset: 'narrow', top: 10, right: 10, bottom: 10, left: 10, unit: 'mm' }
      },
      exercises: [
        {
          type: 'mcq',
          title: 'Knowledge Check',
          instructions: 'Choose the correct answer.',
          points: 4,
          options: { layout: '2-columns', markerStyle: 'circle' },
          content: {
            questions: [
              { prompt: 'What is the synonym of "lucid"?', options: ['Clear', 'Confusing', 'Dark', 'Ancient'], correctIndices: [0], points: 1 },
              { prompt: 'Which word functions as an adverb in this context?', options: ['Swiftly', 'Swift', 'Quick', 'Fasten'], correctIndices: [0], points: 1 },
              { prompt: 'Identify the correct passive sentence:', options: ['The letter was sent yesterday.', 'She sent the letter.', 'They will send the letter.', 'Sending the letter.'], correctIndices: [0], points: 1 },
              { prompt: 'Choose the correct preposition: "Interested ________ art"', options: ['in', 'at', 'on', 'with'], correctIndices: [0], points: 1 }
            ]
          }
        },
        {
          type: 'odd_one_out',
          title: 'Odd One Out (Lexical Categorisation)',
          instructions: 'Cross out the intruder in each row that does not belong to the semantic group.',
          points: 3,
          options: { taskMode: 'cross_out', displayStyle: 'pills' },
          content: {
            items: [
              { words: ['Apple', 'Banana', 'Carrot', 'Strawberry'], intruder: 'Carrot', justificationKey: 'Vegetable, the others are fruits' },
              { words: ['Whisper', 'Shout', 'Mumble', 'Sprint'], intruder: 'Sprint', justificationKey: 'Verb of motion, the others are verbs of speaking' },
              { words: ['Reliable', 'Generous', 'Deceitful', 'Helpful'], intruder: 'Deceitful', justificationKey: 'Negative trait, the others are positive' }
            ]
          }
        },
        {
          type: 'translation',
          title: 'Sentence Translation',
          instructions: 'Translate the following sentences accurately into the target language.',
          points: 3,
          options: { direction: 'Source to Target', showHints: false },
          content: {
            items: [
              { sourceText: 'Nous devons partir immédiatement pour ne pas rater le train.', modelTranslation: 'We must leave immediately so as not to miss the train.', allocatedLines: 1 },
              { sourceText: 'Bien qu\'il fasse froid, ils sont allés se promener dans la forêt.', modelTranslation: 'Although it was cold, they went for a walk in the forest.', allocatedLines: 1 },
              { sourceText: 'Elle a promis qu\'elle terminerait ses devoirs avant le dîner.', modelTranslation: 'She promised she would finish her homework before dinner.', allocatedLines: 1 }
            ]
          }
        }
      ]
    },
    {
      id: 'tmpl_comprehensive_midterm',
      title: 'Comprehensive Midterm Examination (4 Skills)',
      subject: 'Languages',
      durationMinutes: 90,
      targetPoints: 50,
      scaleModelId: 'pts_50',
      description: 'Rigorous multi-part exam assessing reading, cloze with word bank, vocabulary matching, sentence transformation, and composition.',
      materialsAllowed: ['Black or Blue pen', 'Pencil', 'Eraser'],
      headerConfig: {
        showTitle: true,
        showSubtitle: true,
        subtitleText: 'Semester Midterm Examination',
        showStudentName: true,
        showClass: true,
        showDate: true,
        showTeacher: true,
        showDuration: true,
        showMaterials: true,
        showScope: true,
        showTotalPoints: true,
        showVariantBadge: true,
        showInstructions: true,
        instructionsText: 'Answer all parts thoroughly. Manage your time carefully across all 5 sections. Do not use correction fluid.',
        layout: '3-columns',
        borderStyle: 'neobrutalist',
        backgroundTint: 'white',
        padding: 'standard'
      },
      exportStyle: {
        fontSize: '11pt',
        lineHeight: 1.5,
        padding: '14px',
        numberedLines: true,
        margins: { preset: 'normal', top: 15, right: 15, bottom: 15, left: 15, unit: 'mm' }
      },
      exercises: [
        {
          type: 'cloze',
          title: 'Part 1: Text Cloze with Word Bank',
          instructions: 'Fill each gap with the most suitable word from the pool provided.',
          points: 10,
          options: { showWordBank: true, wordBankOrder: 'alphabetical', wordBankDistractors: 'frequently, nevertheless' },
          content: {
            items: [
              { text: 'The discovery of penicillin revolutionized medicine and [significantly] reduced mortality rates worldwide.' },
              { text: 'Scientists were [initially] skeptical about the findings until repeated trials confirmed the antibacterial [properties] of the mold.' },
              { text: 'Today, medical researchers face the challenge of antibiotic resistance, which has become an [urgent] global priority.' }
            ]
          }
        },
        {
          type: 'matching',
          title: 'Part 2: Idioms & Definitions Matching',
          instructions: 'Match each idiom in Column A with its definition in Column B.',
          points: 5,
          options: { colALabel: 'Idiom (Column A)', colBLabel: 'Definition (Column B)', presentation: 'table' },
          content: {
            pairs: [
              { left: 'Bite the bullet', right: 'Face a difficult situation with courage' },
              { left: 'Break the ice', right: 'Make people feel relaxed in a social setting' },
              { left: 'Burn the midnight oil', right: 'Work late into the night' },
              { left: 'Hit the nail on the head', right: 'State something with exact accuracy' },
              { left: 'See eye to eye', right: 'Agree completely with someone' }
            ]
          }
        },
        {
          type: 'transformation',
          title: 'Part 3: Key Word Transformations',
          instructions: 'Complete the second sentence so that it has a similar meaning to the first, using the word in brackets.',
          points: 10,
          options: { wordConstraint: 'Use 2 to 5 words, including the word given.' },
          content: {
            items: [
              { original: 'I regret not visiting my grandparents last weekend.', keyword: 'WISH', targetPrefix: 'I', targetSuffix: 'my grandparents last weekend.', solution: 'wish I had visited' },
              { original: 'The concert was cancelled because of bad weather.', keyword: 'DUE', targetPrefix: 'The concert was cancelled', targetSuffix: 'the bad weather.', solution: 'due to' },
              { original: 'They believe the thief entered through the bedroom window.', keyword: 'THOUGHT', targetPrefix: 'The thief is', targetSuffix: 'through the bedroom window.', solution: 'thought to have entered' }
            ]
          }
        },
        {
          type: 'composition',
          title: 'Part 4: Extended Writing',
          instructions: 'Write a persuasive article on the topic below.',
          points: 15,
          options: { textGenre: 'Persuasive Article', showDraftBox: true, showWritingLines: true, writingLinesCount: 14, showChecklist: true, showRubric: true },
          content: {
            items: [
              { label: 'Article Topic', prompt: 'Should artificial intelligence tools be integrated into secondary school examinations? Defend your position with relevant arguments.', targetWordCount: 200 }
            ]
          },
          markingRubric: [
            { id: 'r1', title: 'Task Achievement & Coherence', maxPoints: 5 },
            { id: 'r2', title: 'Lexical Range & Precision', maxPoints: 5 },
            { id: 'r3', title: 'Grammatical Accuracy & Range', maxPoints: 5 }
          ]
        }
      ]
    },
    {
      id: 'tmpl_visual_prompt',
      title: 'Visual Prompt & Descriptive Writing',
      subject: 'English',
      durationMinutes: 30,
      targetPoints: 15,
      scaleModelId: 'pts_15',
      description: 'Image-based descriptive assessment combining visual cues with open analysis and starter stems.',
      materialsAllowed: ['Pen & Pencil'],
      headerConfig: {
        showTitle: true,
        showSubtitle: false,
        showStudentName: true,
        showClass: true,
        showDate: true,
        showTeacher: true,
        showDuration: true,
        showMaterials: false,
        showScope: true,
        showTotalPoints: true,
        showVariantBadge: true,
        showInstructions: false,
        layout: '2-columns',
        borderStyle: 'solid',
        backgroundTint: 'white',
        padding: 'standard'
      },
      exportStyle: {
        fontSize: '11pt',
        lineHeight: 1.5,
        padding: '14px',
        numberedLines: false,
        margins: { preset: 'normal', top: 15, right: 15, bottom: 15, left: 15, unit: 'mm' }
      },
      exercises: [
        {
          type: 'picture_description',
          title: 'Visual Observation & Description',
          instructions: 'Observe the scene and write a vivid description incorporating the target vocabulary.',
          points: 8,
          options: { layout: 'stacked', targetVocab: 'crowded, vibrant, silhouette, bustling', figureLabel: 'Figure 1' },
          content: {
            items: [
              {
                prompt: 'Describe the atmosphere and activities in the picture. Focus on sensory details (sight, sound, atmosphere).',
                lineCount: 7,
                imageCaption: 'A bustling twilight street market in a historic old town.'
              }
            ]
          }
        },
        {
          type: 'open_question',
          title: 'Creative Interpretation',
          instructions: 'Answer the question based on the visual prompt using the sentence starter provided.',
          points: 7,
          options: { lengthGuidance: '4–6 sentences', answerPrefix: 'If I were present in this setting, the first thing that would draw my attention would be' },
          content: {
            items: [
              {
                prompt: 'Imagine you are one of the characters in the scene. Describe your thoughts and what brings you to this location.',
                lineCount: 6,
                points: 7
              }
            ]
          }
        }
      ]
    }
  ];

  // ── 2b6. Template Instantiation Helpers ─────────────────────────────────────
  TestCreatorService.createTestFromTemplate = function (template, options) {
    if (!template) return TestCreatorService.createEmptyTest();
    var test = TestCreatorService.createEmptyTest();
    test.title = template.title || 'Exam';
    test.subject = template.subject || 'English';
    test.durationMinutes = template.durationMinutes || 45;
    test.targetPoints = template.targetPoints || 20;
    test.scaleModelId = template.scaleModelId || 'pts_20';
    test.scope = template.scope || '';
    if (Array.isArray(template.materialsAllowed)) {
      test.materialsAllowed = template.materialsAllowed.slice();
    }
    if (template.headerConfig && typeof template.headerConfig === 'object') {
      test.headerConfig = JSON.parse(JSON.stringify(template.headerConfig));
    }
    if (template.exportStyle && typeof template.exportStyle === 'object') {
      test.exportStyle = JSON.parse(JSON.stringify(template.exportStyle));
    }
    test.stylesheetTheme = template.stylesheetTheme || (test.exportStyle && test.exportStyle.theme) || (typeof localStorage !== 'undefined' && localStorage.getItem('cmt_default_test_theme')) || 'academic';
    if (!test.exportStyle) test.exportStyle = {};
    test.exportStyle.theme = test.stylesheetTheme;
    TestCreatorService.ensureHeaderConfig(test);
    TestCreatorService.ensureExportStyle(test);

    // Deep clone exercises and assign new unique IDs
    if (Array.isArray(template.exercises)) {
      test.exercises = template.exercises.map(function (srcEx) {
        var exCopy = JSON.parse(JSON.stringify(srcEx));
        exCopy.id = generateUUID();
        if (exCopy.content && Array.isArray(exCopy.content.items)) {
          exCopy.content.items.forEach(function (it) {
            if (it && typeof it === 'object' && it.id) it.id = generateUUID();
          });
        }
        if (exCopy.content && Array.isArray(exCopy.content.questions)) {
          exCopy.content.questions.forEach(function (q) {
            if (q && typeof q === 'object' && q.id) q.id = generateUUID();
          });
        }
        return exCopy;
      });
    }
    return test;
  };

  TestCreatorService.extractTemplateFromTest = function (test, metadata) {
    if (!test) return null;
    var meta = metadata || {};
    return {
      id: meta.id || ('tmpl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8)),
      title: meta.title || test.title || 'Untitled Template',
      subject: meta.subject || test.subject || 'General',
      description: meta.description || '',
      durationMinutes: test.durationMinutes || 45,
      targetPoints: test.targetPoints || TestCreatorService.calculateTotalTestPoints(test),
      scaleModelId: test.scaleModelId || 'pts_20',
      scope: test.scope || '',
      materialsAllowed: Array.isArray(test.materialsAllowed) ? test.materialsAllowed.slice() : ['Pen & Pencil only'],
      headerConfig: JSON.parse(JSON.stringify(test.headerConfig || TestCreatorService.DEFAULT_HEADER_CONFIG)),
      stylesheetTheme: test.stylesheetTheme || (test.exportStyle && test.exportStyle.theme) || 'academic',
      exportStyle: JSON.parse(JSON.stringify(test.exportStyle || TestCreatorService.DEFAULT_EXPORT_STYLE)),
      exercises: JSON.parse(JSON.stringify(test.exercises || [])),
      isCustom: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  };

  // ── 2c. Safe Rich Text Formatting Parser ──────────────────────────────────
  TestCreatorService.formatRichText = function (str) {
    if (str === undefined || str === null) return '';
    var s = String(str);
    if (!s) return '';

    // Tokenize allowed safe inline HTML tags & styles before escaping
    var tokenMap = {};
    var tokenCounter = 0;
    function makeToken(htmlChunk) {
      var key = '___TCR_TAG_' + (tokenCounter++) + '___';
      tokenMap[key] = htmlChunk;
      return key;
    }

    // Preserve <br>, <br/>, <br />
    s = s.replace(/<br\s*\/?>/gi, function () {
      return makeToken('<br>');
    });

    // Match safe HTML tags: <tag attr="..."> and </tag>
    var safeTagPattern = /<\/?(b|strong|i|em|u|ins|s|del|strike|sub|sup|mark|small|code|kbd|var|abbr|span|font)(\s+[^>]*)?>/gi;
    s = s.replace(safeTagPattern, function (match, tagName, attrs) {
      var isClosing = match.charAt(1) === '/';
      var tagLower = tagName.toLowerCase();
      if (isClosing) {
        return makeToken('</' + tagLower + '>');
      }
      // Sanitize attributes if opening tag
      var sanitizedAttrs = '';
      if (attrs) {
        var attrList = [];
        // Match style="..."
        var styleMatch = attrs.match(/\bstyle\s*=\s*(["'])(.*?)\1/i);
        if (styleMatch) {
          var cleanStyle = styleMatch[2]
            .replace(/javascript\s*:/gi, '')
            .replace(/expression\s*\(/gi, '')
            .replace(/url\s*\(/gi, '')
            .replace(/"/g, '&quot;');
          attrList.push('style="' + cleanStyle + '"');
        }
        // Match class="..."
        var classMatch = attrs.match(/\bclass\s*=\s*(["'])(.*?)\1/i);
        if (classMatch) {
          var cleanClass = classMatch[2].replace(/[^a-zA-Z0-9_\-\s]/g, '');
          attrList.push('class="' + cleanClass + '"');
        }
        // Match color="..." (font tag)
        var colorMatch = attrs.match(/\bcolor\s*=\s*(["'])(.*?)\1/i);
        if (colorMatch) {
          var cleanCol = colorMatch[2].replace(/[^a-zA-Z0-9#,\(\)\.\s]/g, '');
          attrList.push('color="' + cleanCol + '"');
        }
        // Match face="..."
        var faceMatch = attrs.match(/\bface\s*=\s*(["'])(.*?)\1/i);
        if (faceMatch) {
          var cleanFace = faceMatch[2].replace(/[^a-zA-Z0-9,\-\s]/g, '');
          attrList.push('face="' + cleanFace + '"');
        }
        // Match size="..."
        var sizeMatch = attrs.match(/\bsize\s*=\s*(["'])(.*?)\1/i);
        if (sizeMatch) {
          var cleanSize = sizeMatch[2].replace(/[^a-zA-Z0-9\-\+]/g, '');
          attrList.push('size="' + cleanSize + '"');
        }
        // Match title="..."
        var titleMatch = attrs.match(/\btitle\s*=\s*(["'])(.*?)\1/i);
        if (titleMatch) {
          var cleanTitle = titleMatch[2].replace(/"/g, '&quot;').replace(/</g, '&lt;');
          attrList.push('title="' + cleanTitle + '"');
        }
        if (attrList.length > 0) {
          sanitizedAttrs = ' ' + attrList.join(' ');
        }
      }
      return makeToken('<' + tagLower + sanitizedAttrs + '>');
    });

    // Escape any remaining raw <, >, &, " for safety
    s = s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Markdown Bold: **bold** or __bold__
    s = s.replace(/(\*\*|__)([\s\S]*?)\1/g, '<strong>$2</strong>');

    // Markdown Strikethrough: ~~strike~~
    s = s.replace(/~~([\s\S]*?)~~/g, '<del>$1</del>');

    // Markdown Highlight: ==mark==
    s = s.replace(/==([\s\S]*?)==/g, '<mark>$1</mark>');

    // Markdown Superscript: ^sup^
    s = s.replace(/\^([^\^\s]+)\^/g, '<sup>$1</sup>');

    // Markdown Subscript: ~sub~
    s = s.replace(/~([^~\s]+)~/g, '<sub>$1</sub>');

    // Markdown Italic: *italic* or _italic_
    s = s.replace(/(^|[^\*])\*([^\*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^a-zA-Z0-9_])_([^_]+)_(?![a-zA-Z0-9_])/g, '$1<em>$2</em>');

    // Markdown Inline code: `code`
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Restore safe HTML tokens
    for (var k in tokenMap) {
      if (tokenMap.hasOwnProperty(k)) {
        s = s.replace(new RegExp(k, 'g'), tokenMap[k]);
      }
    }

    return s;
  };

  // ── 3. Factory Helpers ───────────────────────────────────────────────────
  function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 't-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
  }

  TestCreatorService.createEmptyTest = function () {
    var defaultTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('cmt_default_test_theme')) || 'academic';
    var defaultStyle = JSON.parse(JSON.stringify(TestCreatorService.DEFAULT_EXPORT_STYLE));
    defaultStyle.theme = defaultTheme;
    return {
      id: generateUUID(),
      title: '',
      subject: 'English',
      classId: '',
      className: '',
      teacher: '',
      date: new Date().toISOString().split('T')[0],
      durationMinutes: 45,
      scope: '',
      materialsAllowed: ['Pen & Pencil only'],
      headerConfig: JSON.parse(JSON.stringify(TestCreatorService.DEFAULT_HEADER_CONFIG)),
      scaleModelId: 'pts_20',
      targetPoints: 20,
      linkedCompetences: [],
      linkedCompetenceIds: [],
      criteria: [],
      tags: [],
      stylesheetTheme: defaultTheme,
      exportStyle: defaultStyle,
      exercises: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  };

  TestCreatorService.createEmptyExercise = function (type) {
    var ex = {
      id: generateUUID(),
      type: type || 'cloze',
      title: '',
      instructions: '',
      points: 2,
      pointsPerItem: 1,
      forcePageBreak: false,
      autoSaveToDb: false,
      linkedCompetenceIds: [],
      markingRubric: [], // [{ id, title, maxPoints, weight, comment }]
      answerKey: '',
      exportStyle: {
        fontSize: '',
        lineHeight: '',
        padding: '',
        numberedLines: null
      },
      options: {},
      content: {}
    };

    switch (ex.type) {
      case 'cloze':
        ex.title = 'Fill in the blanks';
        ex.instructions = 'Complete the sentences with the missing words.';
        ex.content = {
          items: [
            { id: generateUUID(), text: 'The weather today is [sunny] and the sky is [blue].' }
          ],
          text: 'The weather today is [sunny] and the sky is [blue].',
          showWordBank: true,
          caseSensitive: false
        };
        ex.pointsPerItem = 1;
        ex.points = 2;
        break;

      case 'mcq':
        ex.title = 'Multiple Choice';
        ex.instructions = 'Choose the correct option for each question.';
        ex.content = {
          questions: [
            {
              id: generateUUID(),
              prompt: 'What is the capital of France?',
              options: ['Paris', 'London', 'Berlin', 'Madrid'],
              correctIndices: [0],
              points: 1
            }
          ]
        };
        ex.points = 1;
        break;

      case 'open_question':
        ex.title = 'Short Answer';
        ex.instructions = 'Answer the following question clearly and concisely.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              prompt: 'Explain the main cause of the event described in the lesson.',
              lineStyle: 'lines', // 'lines' | 'dotted' | 'grid' | 'box'
              lineCount: 4,
              sampleAnswer: '',
              points: 3
            }
          ],
          prompt: 'Explain the main cause of the event described in the lesson.',
          lineStyle: 'lines',
          lineCount: 4,
          sampleAnswer: ''
        };
        ex.points = 3;
        break;

      case 'composition':
        ex.title = 'Writing / Essay';
        ex.instructions = 'Write a well-structured essay respecting the guidelines below.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              label: 'Writing Task',
              prompt: 'Write a persuasive article on the importance of learning foreign languages.',
              targetWordCount: 150,
              minWordCount: 120,
              maxWordCount: 180,
              lineCount: 18,
              lineStyle: 'solid',
              lineHeight: 28,
              lineThickness: 1
            }
          ],
          prompt: 'Write a persuasive article on the importance of learning foreign languages.',
          targetWordCount: 150,
          minWordCount: 120,
          maxWordCount: 180,
          lineCount: 18,
          lineStyle: 'solid',
          lineHeight: 28,
          lineThickness: 1
        };
        ex.points = 10;
        ex.markingRubric = [
          { id: generateUUID(), title: 'Grammar & Syntax', maxPoints: 3, weight: 1 },
          { id: generateUUID(), title: 'Vocabulary Variety', maxPoints: 3, weight: 1 },
          { id: generateUUID(), title: 'Coherence & Structure', maxPoints: 2, weight: 1 },
          { id: generateUUID(), title: 'Task Completion', maxPoints: 2, weight: 1 }
        ];
        break;

      case 'matching':
        ex.title = 'Matching';
        ex.instructions = 'Match each item in Column A with its corresponding item in Column B.';
        ex.content = {
          pairs: [
            { id: generateUUID(), left: 'Bonjour', right: 'Hello' },
            { id: generateUUID(), left: 'Merci', right: 'Thank you' },
            { id: generateUUID(), left: 'Au revoir', right: 'Goodbye' }
          ]
        };
        ex.pointsPerItem = 1;
        ex.points = 3;
        break;

      case 'transformation':
      case 'sentence_transformation':
        ex.title = 'Sentence Transformation';
        ex.instructions = 'Complete the second sentence so that it has a similar meaning to the first, using the clue word in capitals.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              original: 'He started working here two years ago.',
              keyword: 'FOR',
              targetPrefix: 'He has worked here',
              targetSuffix: 'two years.',
              solution: 'for'
            }
          ]
        };
        ex.pointsPerItem = 1;
        ex.points = 1;
        break;

      case 'translation':
        ex.title = 'Translation';
        ex.instructions = 'Translate the following sentences into the target language.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              sourceText: 'Where is the nearest train station?',
              modelTranslation: 'Où se trouve la gare la plus proche ?',
              allocatedLines: 2
            }
          ]
        };
        ex.pointsPerItem = 2;
        ex.points = 2;
        break;

      case 'picture_description':
        ex.title = 'Picture Description';
        ex.instructions = 'Observe the image carefully and answer the questions below.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              imagePath: '',
              imageCaption: '',
              prompt: 'Describe the scene depicted in the image. Use at least 4 descriptive adjectives and 3 prepositions of place.',
              lineStyle: 'lines',
              lineCount: 8,
              modelAnswer: '',
              points: 4
            }
          ],
          imagePath: '',
          imageCaption: '',
          prompt: 'Describe the scene depicted in the image. Use at least 4 descriptive adjectives and 3 prepositions of place.',
          lineStyle: 'lines',
          lineCount: 8,
          modelAnswer: ''
        };
        ex.points = 4;
        break;

      case 'table_completion':
        ex.title = 'Table Completion';
        ex.instructions = 'Fill in the blank cells in the table below.';
        ex.content = {
          headers: ['Infinitive', 'Simple Past', 'Past Participle', 'Translation'],
          rows: [
            [
              { text: 'to speak', isBlank: false },
              { text: 'spoke', isBlank: false },
              { text: 'spoken', isBlank: true },
              { text: 'parler', isBlank: false }
            ],
            [
              { text: 'to write', isBlank: false },
              { text: 'wrote', isBlank: true },
              { text: 'written', isBlank: false },
              { text: 'écrire', isBlank: false }
            ]
          ]
        };
        ex.pointsPerItem = 1;
        ex.points = 2;
        break;

      case 'odd_one_out':
        ex.title = 'Odd One Out';
        ex.instructions = 'For each line, circle the intruder (the word that does not belong) and explain your reasoning.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              words: ['Apple', 'Banana', 'Carrot', 'Orange'],
              intruder: 'Carrot',
              justificationKey: 'Carrot is a vegetable while the others are fruits.',
              pointsIntruder: 1,
              pointsJustification: 1
            }
          ]
        };
        ex.points = 2;
        break;

      case 'reading_comprehension':
        ex.title = 'Reading Comprehension';
        ex.instructions = 'Read the passage carefully and answer the questions that follow.';
        ex.content = {
          passageTitle: 'The Discovery of Penicillin',
          passageText: 'In 1928, Alexander Fleming returned to his laboratory at St. Mary\'s Hospital in London after a holiday...',
          subQuestions: [
            {
              id: generateUUID(),
              prompt: 'In what year was penicillin discovered?',
              answerType: 'short',
              solution: '1928',
              points: 1
            },
            {
              id: generateUUID(),
              prompt: 'Who made this accidental breakthrough?',
              answerType: 'short',
              solution: 'Alexander Fleming',
              points: 1
            }
          ]
        };
        ex.points = 2;
        break;

      case 'section_competences':
        ex.title = 'Competences & Curriculum Objectives';
        ex.instructions = '';
        ex.points = 0;
        ex.options = {
          displayMode: 'table',
          showDescriptions: true,
          background: 'default',
          border: 'solid',
          padding: 'standard'
        };
        break;

      case 'section_criteria':
        ex.title = 'Assessment Criteria & Evaluation Rubric';
        ex.instructions = '';
        ex.points = 0;
        ex.options = {
          displayMode: 'table',
          showDescriptions: true,
          background: 'default',
          border: 'solid',
          padding: 'standard'
        };
        break;

      case 'section_grading_scale':
        ex.title = 'Grading Scale & Score Conversion';
        ex.instructions = '';
        ex.points = 0;
        ex.options = {
          displayMode: 'table',
          background: 'default',
          border: 'solid',
          padding: 'standard'
        };
        break;
    }

    TestCreatorService.ensureExerciseOptions(ex);
    return ex;
  };

  // ── 3a. Exercise Customisation Options Initializer ───────────────────────
  TestCreatorService.ensureExerciseOptions = function (ex) {
    if (!ex) return {};
    if (!ex.options || typeof ex.options !== 'object') {
      ex.options = {};
    }
    var o = ex.options;
    switch (ex.type) {
      case 'section_competences':
        if (o.displayMode === undefined) o.displayMode = 'table';
        if (o.showDescriptions === undefined) o.showDescriptions = true;
        if (o.background === undefined) o.background = 'default';
        if (o.border === undefined) o.border = 'solid';
        if (o.padding === undefined) o.padding = 'standard';
        break;

      case 'section_criteria':
        if (o.displayMode === undefined) o.displayMode = 'table';
        if (o.showDescriptions === undefined) o.showDescriptions = true;
        if (o.background === undefined) o.background = 'default';
        if (o.border === undefined) o.border = 'solid';
        if (o.padding === undefined) o.padding = 'standard';
        break;

      case 'section_grading_scale':
        if (o.displayMode === undefined) o.displayMode = 'table';
        if (o.background === undefined) o.background = 'default';
        if (o.border === undefined) o.border = 'solid';
        if (o.padding === undefined) o.padding = 'standard';
        break;

      case 'cloze':
        if (o.blankStyle === undefined) o.blankStyle = 'underline'; // 'underline' | 'bracketed_box' | 'length_dots'
        if (o.showFirstLetter === undefined) o.showFirstLetter = false;
        if (o.wordBankDistractors === undefined) o.wordBankDistractors = '';
        if (o.wordBankOrder === undefined) o.wordBankOrder = 'shuffled'; // 'shuffled' | 'alphabetical'
        break;

      case 'mcq':
        if (o.layout === undefined) o.layout = '2-columns'; // '2-columns' | '1-column' | 'inline'
        if (o.markerStyle === undefined) o.markerStyle = 'letters'; // 'letters' | 'checkbox' | 'circle' | 'numbers'
        if (o.shuffleOptions === undefined) o.shuffleOptions = false;
        break;

      case 'open_question':
        if (o.answerPrefix === undefined) o.answerPrefix = '';
        if (o.lengthGuidance === undefined) o.lengthGuidance = '';
        if (o.lineStyle === undefined) o.lineStyle = 'lines'; // 'lines' | 'dotted' | 'grid' | 'box'
        break;

      case 'composition':
        if (o.textGenre === undefined) o.textGenre = '';
        if (o.showGenreBadge === undefined) o.showGenreBadge = !!o.textGenre;
        if (o.showPrompts === undefined) o.showPrompts = true;
        if (o.showWritingLines === undefined) o.showWritingLines = true;
        if (o.showRubric === undefined) o.showRubric = true;
        if (o.wordCountMin === undefined) o.wordCountMin = 120;
        if (o.wordCountMax === undefined) o.wordCountMax = 180;
        if (o.lineStyle === undefined) o.lineStyle = 'solid'; // 'solid' | 'dashed' | 'dotted'
        if (o.lineHeight === undefined) o.lineHeight = 28; // in px
        if (o.lineThickness === undefined) o.lineThickness = 1; // in px
        if (o.showDraftBox === undefined) o.showDraftBox = false;
        if (o.draftStyle === undefined) o.draftStyle = 'box'; // 'box' | 'lines' | 'dotted' | 'grid'
        if (o.draftLines === undefined) o.draftLines = 6;
        if (o.draftHeight === undefined) o.draftHeight = 100;
        if (o.draftTitle === undefined) o.draftTitle = '';
        if (o.draftNote === undefined) o.draftNote = '';
        if (o.draftPlacement === undefined) o.draftPlacement = 'before'; // 'before' | 'after'
        if (o.showChecklist === undefined) o.showChecklist = false;
        if (o.checklistTitle === undefined) o.checklistTitle = '';
        if (o.checklistLayout === undefined) o.checklistLayout = 'inline'; // 'inline' | 'columns' | 'stacked'
        if (o.checklistBg === undefined) o.checklistBg = 'amber'; // 'amber' | 'white' | 'ivory' | 'light_gray' | 'tint' | 'none'
        if (o.checklistPadding === undefined) o.checklistPadding = 'standard'; // 'compact' | 'standard' | 'spacious'
        if (o.checklistBorder === undefined) o.checklistBorder = 'solid'; // 'solid' | 'neobrutalist' | 'dashed' | 'quote' | 'none'
        if (o.checklistItems === undefined) {
          o.checklistItems = [
            'Structure & Paragraphs',
            'Spelling & Verb Tenses',
            'Punctuation & Capitalization',
            'Word Count Verified'
          ];
        }
        if (!Array.isArray(o.componentOrder) || o.componentOrder.length === 0) {
          o.componentOrder = ['genreBadge', 'prompts', 'draftBox', 'writingLines', 'checklist', 'rubric'];
        }
        break;

      case 'matching':
        if (o.presentation === undefined) o.presentation = 'letter_boxes'; // 'letter_boxes' | 'connecting_lines' | 'table'
        if (o.colALabel === undefined) o.colALabel = 'Column A';
        if (o.colBLabel === undefined) o.colBLabel = 'Column B';
        if (o.distractors === undefined) o.distractors = '';
        break;

      case 'transformation':
      case 'sentence_transformation':
        if (o.wordConstraint === undefined) o.wordConstraint = 'Use between 2 and 5 words, including the word given.';
        if (o.allowContractionsNote === undefined) o.allowContractionsNote = true;
        if (o.keywordStyle === undefined) o.keywordStyle = 'capital_block'; // 'capital_block' | 'bracketed'
        break;

      case 'translation':
        if (o.direction === undefined) o.direction = 'English → French';
        if (o.showHints === undefined) o.showHints = true;
        if (o.lineStyle === undefined) o.lineStyle = 'lines';
        break;

      case 'picture_description':
        if (o.layout === undefined) o.layout = 'stacked'; // 'stacked' | 'side_by_side'
        if (o.imageSize === undefined) o.imageSize = 'medium'; // 'small' | 'medium' | 'large'
        if (o.targetVocab === undefined) o.targetVocab = '';
        if (o.figureLabel === undefined) o.figureLabel = 'Figure 1';
        break;

      case 'table_completion':
        if (o.tableStyle === undefined) o.tableStyle = 'grid'; // 'grid' | 'zebra' | 'scientific'
        if (o.textAlign === undefined) o.textAlign = 'left'; // 'left' | 'center'
        if (o.showWordBank === undefined) o.showWordBank = false;
        break;

      case 'odd_one_out':
        if (o.taskMode === undefined) o.taskMode = 'circle_and_justify'; // 'circle_and_justify' | 'circle_only' | 'cross_out'
        if (o.displayStyle === undefined) o.displayStyle = 'pill_chips'; // 'pill_chips' | 'plain_separated'
        break;

      case 'reading_comprehension':
        if (o.passageLayout === undefined) o.passageLayout = 'full_width'; // 'full_width' | 'two_columns'
        if (o.defaultLineCount === undefined) o.defaultLineCount = 2;
        if (o.vocabularyFootnotes === undefined) o.vocabularyFootnotes = '';
        break;
    }
    return o;
  };

  // ── 3b. Backward-Compatible Exercise Normalizer ──────────────────────────
  TestCreatorService.normalizeExerciseItems = function (ex) {
    if (!ex || !ex.content) return;
    if (ex.type === 'cloze') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        var txt = typeof ex.content.text === 'string' ? ex.content.text : 'The weather today is [sunny] and the sky is [blue].';
        ex.content.items = [{ id: generateUUID(), text: txt }];
      }
    } else if (ex.type === 'open_question') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          prompt: ex.content.prompt || ex.prompt || 'Answer the following question clearly and concisely.',
          lineStyle: ex.content.lineStyle || 'lines',
          lineCount: Number(ex.content.lineCount) || 4,
          sampleAnswer: ex.content.sampleAnswer || ex.expectedAnswer || '',
          points: Number(ex.points) || 3
        }];
      }
    } else if (ex.type === 'composition') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          label: 'Writing Task',
          prompt: ex.content.prompt || 'Write a well-structured essay respecting the guidelines below.',
          targetWordCount: Number(ex.content.targetWordCount) || 150,
          minWordCount: Number(ex.content.minWordCount) || 120,
          maxWordCount: Number(ex.content.maxWordCount) || 180,
          lineCount: Number(ex.content.lineCount) || 18,
          lineStyle: ex.content.lineStyle || 'lines'
        }];
      }
    } else if (ex.type === 'picture_description') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          imagePath: ex.content.imagePath || '',
          imageCaption: ex.content.imageCaption || '',
          prompt: ex.content.prompt || 'Describe the scene depicted in the image.',
          lineStyle: ex.content.lineStyle || 'lines',
          lineCount: Number(ex.content.lineCount) || 8,
          modelAnswer: ex.content.modelAnswer || '',
          points: Number(ex.points) || 4
        }];
      }
    } else if (ex.type === 'mcq') {
      if (!Array.isArray(ex.content.questions) || ex.content.questions.length === 0) {
        if (Array.isArray(ex.content.options) && ex.content.options.length > 0) {
          var opts = ex.content.options.map(function (o) { return typeof o === 'string' ? o : (o.text || ''); });
          var corrects = [];
          ex.content.options.forEach(function (o, idx) {
            if (o && (o.isCorrect || o.correct)) corrects.push(idx);
          });
          if (corrects.length === 0 && ex.content.correctIndex !== undefined) corrects.push(ex.content.correctIndex);
          ex.content.questions = [{
            id: generateUUID(),
            prompt: ex.content.prompt || ex.prompt || 'Choose the correct answer:',
            options: opts,
            correctIndices: corrects,
            points: Number(ex.points) || 1
          }];
        } else {
          ex.content.questions = [{
            id: generateUUID(),
            prompt: 'Choose the correct answer:',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndices: [0],
            points: 1
          }];
        }
      }
    } else if (ex.type === 'transformation' || ex.type === 'sentence_transformation') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          original: ex.content.original || ex.content.leadIn || 'He started working here two years ago.',
          keyword: ex.content.keyword || 'FOR',
          targetPrefix: ex.content.targetPrefix || ex.content.startOfSentence || 'He has worked here',
          targetSuffix: ex.content.targetSuffix || 'two years.',
          solution: ex.content.solution || ex.expectedAnswer || 'for'
        }];
      }
    } else if (ex.type === 'translation') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          sourceText: ex.content.sourceText || 'Where is the nearest train station?',
          modelTranslation: ex.content.modelTranslation || 'Où se trouve la gare la plus proche ?',
          allocatedLines: Number(ex.content.allocatedLines) || 2
        }];
      }
    } else if (ex.type === 'odd_one_out') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          words: ['Apple', 'Banana', 'Carrot', 'Orange'],
          intruder: 'Carrot',
          justificationKey: 'Carrot is a vegetable while the others are fruits.',
          pointsIntruder: 1,
          pointsJustification: 1
        }];
      }
    } else if (ex.type === 'reading_comprehension') {
      if (!Array.isArray(ex.content.subQuestions) || ex.content.subQuestions.length === 0) {
        ex.content.subQuestions = [{
          id: generateUUID(),
          prompt: 'Comprehension Question',
          answerType: 'short',
          solution: '',
          points: 1
        }];
      }
    }
  };

  // ── 4. Points Calculation Engine ──────────────────────────────────────────
  TestCreatorService.extractClozeBlanks = function (text) {
    if (!text || typeof text !== 'string') return [];
    var regex = /\[([^\]]+)\]/g;
    var blanks = [];
    var match;
    while ((match = regex.exec(text)) !== null) {
      blanks.push(match[1].trim());
    }
    return blanks;
  };

  TestCreatorService.calculateExercisePoints = function (ex) {
    if (!ex) return 0;
    var pts = 0;
    var ppi = Number(ex.pointsPerItem) || 1;

    switch (ex.type) {
      case 'cloze':
        var ppb = Number(ex.pointsPerBlank || ex.pointsPerItem) || 1;
        if (Array.isArray(ex.content && ex.content.items) && ex.content.items.length > 0) {
          pts = ex.content.items.reduce(function (sum, it) {
            if (it.points != null && !isNaN(Number(it.points)) && Number(it.points) > 0) {
              return sum + Number(it.points);
            }
            var bCount = TestCreatorService.extractClozeBlanks(it.text).length;
            return sum + (bCount > 0 ? bCount * ppb : ppb);
          }, 0);
        } else {
          var blanksCount = TestCreatorService.extractClozeBlanks(ex.content && ex.content.text).length;
          pts = blanksCount > 0 ? blanksCount * ppb : Number(ex.points) || 1;
        }
        break;

      case 'mcq':
        var questions = (ex.content && ex.content.questions) || [];
        if ((!questions || !questions.length) && ex.content && Array.isArray(ex.content.options)) {
          pts = Number(ex.points) || 1;
        } else {
          pts = questions.reduce(function (sum, q) {
            return sum + (Number(q.points) || 1);
          }, 0);
          if (!questions.length) pts = Number(ex.points) || 1;
        }
        break;

      case 'open_question':
        if (Array.isArray(ex.content && ex.content.items) && ex.content.items.length > 0) {
          pts = ex.content.items.reduce(function (sum, it) {
            return sum + (Number(it.points) || 1);
          }, 0);
        } else {
          pts = Number(ex.points) || 3;
        }
        break;

      case 'composition':
        var rubric = ex.markingRubric || [];
        if (rubric.length > 0) {
          pts = rubric.reduce(function (sum, r) {
            var w = Number(r.weight) || 1;
            return sum + ((Number(r.maxPoints) || 0) * w);
          }, 0);
        } else if (Array.isArray(ex.content && ex.content.items) && ex.content.items.length > 1) {
          pts = (Number(ex.points) || 10) * ex.content.items.length;
        } else {
          pts = Number(ex.points) || 10;
        }
        break;

      case 'matching':
        var pairs = (ex.content && ex.content.pairs) || [];
        pts = pairs.length * ppi;
        break;

      case 'transformation':
      case 'sentence_transformation':
        var tItems = (ex.content && ex.content.items) || [];
        pts = tItems.length * ppi;
        break;

      case 'translation':
        var trItems = (ex.content && ex.content.items) || [];
        pts = trItems.length * ppi;
        break;

      case 'table_completion':
        var rows = (ex.content && ex.content.rows) || [];
        var blankCount = 0;
        rows.forEach(function (r) {
          (r || []).forEach(function (cell) {
            if (cell && cell.isBlank) blankCount++;
          });
        });
        pts = blankCount * ppi;
        break;

      case 'odd_one_out':
        var oItems = (ex.content && ex.content.items) || [];
        pts = oItems.reduce(function (sum, item) {
          return sum + (Number(item.pointsIntruder) || 1) + (Number(item.pointsJustification) || 1);
        }, 0);
        break;

      case 'reading_comprehension':
        var subQs = (ex.content && ex.content.subQuestions) || [];
        pts = subQs.reduce(function (sum, q) {
          return sum + (Number(q.points) || 1);
        }, 0);
        break;

      case 'picture_description':
        if (Array.isArray(ex.content && ex.content.items) && ex.content.items.length > 0) {
          pts = ex.content.items.reduce(function (sum, it) {
            return sum + (Number(it.points) || 1);
          }, 0);
        } else {
          pts = Number(ex.points) || 4;
        }
        break;

      case 'section_competences':
      case 'section_criteria':
      case 'section_grading_scale':
        pts = 0;
        break;

      default:
        pts = Number(ex.points) || 1;
        break;
    }

    ex.points = Math.round(pts * 10) / 10;
    return ex.points;
  };

  TestCreatorService.calculateTotalTestPoints = function (test) {
    if (!test || !Array.isArray(test.exercises)) return 0;
    var total = 0;
    test.exercises.forEach(function (ex) {
      total += TestCreatorService.calculateExercisePoints(ex);
    });
    return Math.round(total * 10) / 10;
  };

  // ── 5. Variant Generator (Group A / Group B) ──────────────────────────────
  function shuffleArray(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  TestCreatorService.generateVariant = function (test, variantLetter) {
    var vLetter = (variantLetter || 'A').toUpperCase();
    var clone = JSON.parse(JSON.stringify(test));
    clone.variant = vLetter;

    if (vLetter === 'A') {
      return clone;
    }

    // For Group B: Scramble options and pairs within exercises
    clone.exercises.forEach(function (ex) {
      if (ex.type === 'mcq' && ex.content && Array.isArray(ex.content.questions)) {
        ex.content.questions.forEach(function (q) {
          if (Array.isArray(q.options) && q.options.length > 1) {
            var correctTexts = (q.correctIndices || []).map(function (idx) {
              return q.options[idx];
            });
            q.options = shuffleArray(q.options);
            // Re-map correct indices
            q.correctIndices = [];
            correctTexts.forEach(function (txt) {
              var newIdx = q.options.indexOf(txt);
              if (newIdx !== -1) q.correctIndices.push(newIdx);
            });
          }
        });
      } else if (ex.type === 'matching' && ex.content && Array.isArray(ex.content.pairs)) {
        ex.content.pairs = shuffleArray(ex.content.pairs);
      } else if (ex.type === 'odd_one_out' && ex.content && Array.isArray(ex.content.items)) {
        ex.content.items.forEach(function (item) {
          if (Array.isArray(item.words)) {
            item.words = shuffleArray(item.words);
          }
        });
      } else if (ex.type === 'translation' && ex.content && Array.isArray(ex.content.items)) {
        ex.content.items = shuffleArray(ex.content.items);
      } else if (ex.type === 'transformation' && ex.content && Array.isArray(ex.content.items)) {
        ex.content.items = shuffleArray(ex.content.items);
      } else if (ex.type === 'cloze' && ex.content && Array.isArray(ex.content.items) && ex.content.items.length > 1) {
        ex.content.items = shuffleArray(ex.content.items);
      } else if (ex.type === 'open_question' && ex.content && Array.isArray(ex.content.items) && ex.content.items.length > 1) {
        ex.content.items = shuffleArray(ex.content.items);
      } else if (ex.type === 'picture_description' && ex.content && Array.isArray(ex.content.items) && ex.content.items.length > 1) {
        ex.content.items = shuffleArray(ex.content.items);
      }
    });

    return clone;
  };

  // ── 6. Student Variant Assignment Algorithms ──────────────────────────────
  TestCreatorService.assignVariantsToStudents = function (students, mode, options) {
    if (!Array.isArray(students)) return {};
    var assignments = {}; // studentId -> 'A' | 'B'
    var opts = options || {};

    if (mode === 'seating' && opts.classPlan && Array.isArray(opts.classPlan.desks)) {
      var deskMap = {};
      opts.classPlan.desks.forEach(function (d) {
        if (d.studentId) deskMap[d.studentId] = d;
      });

      students.forEach(function (st, idx) {
        var desk = deskMap[st.id];
        if (desk && typeof desk.row === 'number' && typeof desk.col === 'number') {
          assignments[st.id] = (desk.row + desk.col) % 2 === 0 ? 'A' : 'B';
        } else {
          assignments[st.id] = idx % 2 === 0 ? 'A' : 'B';
        }
      });
    } else if (mode === 'manual' && opts.manualMap) {
      students.forEach(function (st, idx) {
        assignments[st.id] = opts.manualMap[st.id] || (idx % 2 === 0 ? 'A' : 'B');
      });
    } else {
      // Default: Alternating roster
      students.forEach(function (st, idx) {
        assignments[st.id] = idx % 2 === 0 ? 'A' : 'B';
      });
    }

    return assignments;
  };

  // ── 7. Database Auto-Saver Helper ─────────────────────────────────────────
  TestCreatorService.saveExerciseToDatabase = async function (exercise, subject) {
    if (!exercise || !window.Desktop || !window.Desktop.isElectron) return false;
    try {
      var filename = 'custom-test-exercises.json';
      var existing = await window.Desktop.readJson('customExercises', filename);
      var records = (existing && existing.ok && Array.isArray(existing.data)) ? existing.data : [];

      var entry = {
        id: exercise.id || generateUUID(),
        title: exercise.title || 'Exercise',
        type: exercise.type || 'cloze',
        subject: subject || 'general',
        instructions: exercise.instructions || '',
        points: exercise.points || 2,
        pointsPerItem: exercise.pointsPerItem || 1,
        content: exercise.content || {},
        markingRubric: exercise.markingRubric || [],
        answerKey: exercise.answerKey || '',
        linkedCompetenceIds: exercise.linkedCompetenceIds || [],
        savedAt: Date.now()
      };

      var existingIdx = records.findIndex(function (r) { return r.id === entry.id; });
      if (existingIdx !== -1) {
        records[existingIdx] = entry;
      } else {
        records.unshift(entry);
      }

      await window.Desktop.saveJson('customExercises', filename, records);
      return true;
    } catch (e) {
      console.warn('TestCreatorService: Failed to save exercise to database:', e);
      return false;
    }
  };

  // ── 8. Grade Sheet & Competence Portfolio Integrations ─────────────────────
  TestCreatorService.prepareGradeSheetEvaluation = function (test) {
    if (!test) return null;
    var totalPts = TestCreatorService.calculateTotalTestPoints(test);
    var subCriteria = (test.exercises || []).map(function (ex, idx) {
      return {
        id: ex.id || generateUUID(),
        title: (ex.title || ('Exercise ' + (idx + 1))) + ' (' + (ex.type || 'task') + ')',
        maxPoints: Number(ex.points) || 1,
        pointCoefficient: 1,
        linkedCompetenceIds: ex.linkedCompetenceIds || []
      };
    });

    return {
      id: generateUUID(),
      name: test.title || 'Test Evaluation',
      type: 'test',
      date: test.date || new Date().toISOString().split('T')[0],
      maxScore: totalPts,
      coefficient: 1,
      scaleModelId: test.scaleModelId || 'pts_20',
      scaleBank: test.scaleBank || null,
      scaleModel: test.scaleModel || null,
      term: 't1',
      criteria: subCriteria,
      linkedTestId: test.id
    };
  };

  TestCreatorService.registerInGradeSheet = async function (test, classId, termId) {
    if (!window.Desktop || !window.Desktop.isElectron || !test || !classId) {
      return { ok: false, error: 'Desktop bridge or parameters missing' };
    }
    try {
      var fileName = classId + '.json';
      var readRes = await window.Desktop.readJson('grades', fileName);
      var gradeData = (readRes && readRes.ok && readRes.data) ? readRes.data : { evaluations: [] };
      if (!Array.isArray(gradeData.evaluations)) gradeData.evaluations = [];

      var evalObj = TestCreatorService.prepareGradeSheetEvaluation(test);
      if (termId) evalObj.term = termId;

      var existingIdx = gradeData.evaluations.findIndex(function (e) {
        return e.linkedTestId === test.id || (e.name === test.title && e.date === test.date);
      });

      if (existingIdx !== -1) {
        gradeData.evaluations[existingIdx] = evalObj;
      } else {
        gradeData.evaluations.push(evalObj);
      }

      await window.Desktop.saveJson('grades', fileName, gradeData);
      return { ok: true, evaluation: evalObj };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  TestCreatorService.registerCompetencesInPortfolio = async function (test) {
    if (!test || !Array.isArray(test.linkedCompetenceIds) || !test.linkedCompetenceIds.length) {
      return false;
    }
    try {
      if (root.CompetenceAggregatorService && typeof root.CompetenceAggregatorService.clearCache === 'function') {
        root.CompetenceAggregatorService.clearCache();
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  // ── 9. HTML & Print Multi-Format Exporter ──────────────────────────────────
  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  TestCreatorService.getThemeCss = function (themeName) {
    var theme = themeName || 'academic';
    var css = '';

    if (theme === 'neobrutalist') {
      css = [
        'body { font-family: "Lexend", system-ui, sans-serif; color: #1e293b; background: #f5f5f0; margin: 0; padding: 20px; font-size: 11pt; line-height: 1.45; }',
        '.exam-sheet { max-width: 800px; margin: 0 auto; }',
        '.exam-header { border: 2px solid #333333; border-radius: 10px; box-shadow: 4px 4px 0 #555555; padding: 14px 18px; margin-bottom: 24px; background: #ffffff; break-after: avoid; page-break-after: avoid; }',
        '.exam-title { font-size: 18pt; font-weight: 800; margin: 0 0 10px; text-transform: uppercase; letter-spacing: -0.5px; border-bottom: 2px solid #333333; padding-bottom: 6px; color: #1e293b; }',
        '.header-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 10pt; font-weight: 700; }',
        '.header-item { padding: 4px 0; }',
        '.header-item span.lbl { text-transform: uppercase; font-size: 8pt; color: #64748b; display: block; }',
        '.score-badge-box { grid-column: span 3; display: flex; justify-content: space-between; align-items: center; border-top: 2px dashed #333333; margin-top: 8px; padding-top: 8px; font-weight: 800; font-size: 11pt; }',
        '.exercise-card { border: 2px solid #333333; border-radius: 10px; box-shadow: 3px 3px 0 #555555; padding: 14px 16px; margin-bottom: 20px; background: #ffffff; break-inside: auto; page-break-inside: auto; }',
        '.exercise-card:first-of-type:not(.page-break-before) { break-before: avoid; page-break-before: avoid; }',
        '.exercise-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #333333; padding-bottom: 6px; margin-bottom: 10px; break-after: avoid; page-break-after: avoid; }',
        '.exercise-title { font-size: 12pt; font-weight: 800; text-transform: uppercase; color: #1e293b; }',
        '.exercise-points { background: #333333; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-size: 9pt; font-weight: 800; }',
        '.exercise-instructions { font-style: italic; font-size: 10pt; color: #4b5563; margin-bottom: 12px; break-after: avoid; page-break-after: avoid; }',
        '.cloze-text { font-size: 11pt; line-height: 2.2; }',
        '.cloze-blank { display: inline-block; min-width: 90px; border-bottom: 2px solid #333333; text-align: center; font-weight: 700; color: #1e293b; padding: 0 4px; }',
        '.cloze-blank.teacher-key { color: #c96b6b; border-color: #c96b6b; }',
        '.word-bank-pool { display: flex; flex-wrap: wrap; gap: 6px; border: 1.5px dashed #333333; border-radius: 6px; padding: 8px; margin-bottom: 12px; background: #fdfdfa; font-size: 9.5pt; font-weight: 700; }',
        '.word-chip { background: #ffffff; border: 1.5px solid #333333; padding: 2px 8px; border-radius: 4px; box-shadow: 1px 1px 0 #555555; }',
        '.mcq-item { margin-bottom: 12px; font-size: 10.5pt; }',
        '.mcq-prompt { font-weight: 700; margin-bottom: 6px; }',
        '.mcq-options { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding-left: 10px; }',
        '.mcq-option { display: flex; align-items: center; gap: 8px; font-size: 10pt; }',
        '.mcq-box { width: 14px; height: 14px; border: 1.5px solid #333333; border-radius: 3px; display: inline-block; }',
        '.mcq-option.correct .mcq-box { background: #c96b6b; border-color: #c96b6b; }',
        '.mcq-option.correct { color: #c96b6b; font-weight: 800; }',
        '.writing-lines { margin-top: 8px; }',
        '.writing-lines.dotted-lines .writing-line, .writing-line.dotted { border-bottom-style: dotted; }',
        '.writing-lines.dashed-lines .writing-line, .writing-line.dashed { border-bottom-style: dashed; }',
        '.writing-lines.solid-lines .writing-line, .writing-line.solid { border-bottom-style: solid; }',
        '.writing-line { border-bottom: 1px solid #94a3b8; height: 26px; }',
        '.writing-grid { height: 120px; border: 1.5px solid #333333; border-radius: 6px; background-size: 20px 20px; background-image: linear-gradient(to right, #e5e5e5 1px, transparent 1px), linear-gradient(to bottom, #e5e5e5 1px, transparent 1px); }',
        '.writing-box { min-height: 90px; border: 1.5px solid #333333; border-radius: 6px; margin-top: 8px; padding: 8px; }',
        '.table-exercise { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }',
        '.table-exercise th, .table-exercise td { border: 1.5px solid #333333; padding: 6px 10px; text-align: left; }',
        '.table-exercise th { background: #f0f0eb; font-weight: 800; }',
        '.table-blank-cell { background: #ffffff; color: #1e293b; min-height: 24px; }',
        '.table-blank-cell.teacher-key { color: #c96b6b; font-weight: 800; }',
        '.matching-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed #cbd5e1; font-size: 10.5pt; }',
        '.matching-box { width: 34px; height: 22px; border: 1.5px solid #333333; border-radius: 4px; text-align: center; line-height: 22px; font-weight: 800; }',
        '.rubric-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }',
        '.rubric-table th, .rubric-table td { border: 1.5px solid #333333; padding: 4px 8px; }',
        '.rubric-table th { background: #f0f0eb; font-weight: 700; }',
        '.page-break-before { page-break-before: always; }',
        '@media print { body { padding: 0; background: #ffffff; } .exercise-card, .exam-header { box-shadow: none; border-color: #333333; } }'
      ].join('\n');
    } else if (theme === 'dyslexic') {
      css = [
        'body { font-family: "OpenDyslexic", "Lexend", sans-serif; color: #111; background: #fff; margin: 0; padding: 24px; font-size: 12pt; line-height: 1.8; letter-spacing: 0.6px; word-spacing: 2px; }',
        '.exam-sheet { max-width: 820px; margin: 0 auto; }',
        '.exam-header { border: 2px solid #222; border-radius: 8px; padding: 16px; margin-bottom: 24px; background: #fdfdf6; break-after: avoid; page-break-after: avoid; }',
        '.exam-title { font-size: 19pt; font-weight: 900; margin: 0 0 12px; }',
        '.header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11pt; }',
        '.exercise-card { border: 2px solid #444; border-radius: 8px; padding: 18px; margin-bottom: 24px; background: #fafafa; break-inside: auto; page-break-inside: auto; }',
        '.exercise-card:first-of-type:not(.page-break-before) { break-before: avoid; page-break-before: avoid; }',
        '.exercise-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #555; padding-bottom: 8px; margin-bottom: 12px; break-after: avoid; page-break-after: avoid; }',
        '.exercise-title { font-size: 13pt; font-weight: 900; }',
        '.exercise-points { background: #333; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 10pt; font-weight: 700; }',
        '.exercise-instructions { break-after: avoid; page-break-after: avoid; }',
        '.cloze-blank { display: inline-block; min-width: 100px; border-bottom: 2.5px solid #222; text-align: center; font-weight: 700; background: #f0f0e8; padding: 2px 6px; border-radius: 4px; }',
        '.cloze-blank.teacher-key { color: #dc2626; border-color: #dc2626; }',
        '.writing-line { border-bottom: 1.5px solid #888; height: 32px; }',
        '.page-break-before { page-break-before: always; }'
      ].join('\n');
    } else {
      // Academic Classic (default)
      css = [
        'body { font-family: "Times New Roman", Times, Georgia, serif; color: #000; background: #fff; margin: 0; padding: 30px; font-size: 11pt; line-height: 1.5; }',
        '.exam-sheet { max-width: 820px; margin: 0 auto; }',
        '.exam-header { border: 2px double #000; padding: 14px 18px; margin-bottom: 24px; break-after: avoid; page-break-after: avoid; }',
        '.exam-title { font-size: 16pt; font-weight: bold; text-align: center; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px; }',
        '.header-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 10pt; }',
        '.header-item span.lbl { font-weight: bold; margin-right: 4px; }',
        '.score-badge-box { grid-column: span 3; display: flex; justify-content: space-between; border-top: 1px solid #000; margin-top: 8px; padding-top: 8px; font-weight: bold; }',
        '.exercise-card { margin-bottom: 24px; break-inside: auto; page-break-inside: auto; }',
        '.exercise-card:first-of-type:not(.page-break-before) { break-before: avoid; page-break-before: avoid; }',
        '.exercise-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 8px; break-after: avoid; page-break-after: avoid; }',
        '.exercise-title { font-size: 11.5pt; font-weight: bold; }',
        '.exercise-points { font-size: 9.5pt; font-style: italic; }',
        '.exercise-instructions { font-style: italic; font-size: 10pt; margin-bottom: 10px; break-after: avoid; page-break-after: avoid; }',
        '.cloze-text { font-size: 11pt; line-height: 2.2; }',
        '.cloze-blank { display: inline-block; min-width: 90px; border-bottom: 1px solid #000; text-align: center; font-weight: bold; }',
        '.cloze-blank.teacher-key { color: #b91c1c; font-weight: bold; }',
        '.word-bank-pool { border: 1px solid #444; padding: 6px 10px; margin-bottom: 10px; font-size: 9.5pt; text-align: center; }',
        '.word-chip { display: inline-block; margin: 2px 6px; }',
        '.mcq-item { margin-bottom: 12px; }',
        '.mcq-prompt { font-weight: bold; margin-bottom: 4px; }',
        '.mcq-options { padding-left: 15px; }',
        '.mcq-option { margin-bottom: 4px; font-size: 10.5pt; }',
        '.mcq-box { display: inline-block; width: 12px; height: 12px; border: 1px solid #000; margin-right: 6px; vertical-align: middle; }',
        '.mcq-option.correct { color: #b91c1c; font-weight: bold; }',
        '.mcq-option.correct .mcq-box { background: #b91c1c; }',
        '.writing-lines { margin-top: 6px; }',
        '.writing-line { border-bottom: 1px solid #999; height: 26px; }',
        '.writing-box { min-height: 90px; border: 1px solid #000; margin-top: 6px; padding: 6px; }',
        '.table-exercise { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt; }',
        '.table-exercise th, .table-exercise td { border: 1px solid #000; padding: 5px 8px; text-align: left; }',
        '.table-exercise th { background: #f5f5f5; }',
        '.table-blank-cell.teacher-key { color: #b91c1c; font-weight: bold; }',
        '.matching-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 10.5pt; }',
        '.matching-box { width: 26px; height: 20px; border: 1px solid #000; text-align: center; line-height: 20px; font-weight: bold; }',
        '.rubric-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }',
        '.rubric-table th, .rubric-table td { border: 1px solid #000; padding: 4px 6px; }',
        '.page-break-before { page-break-before: always; }',
        '@media print { body { padding: 0; } }'
      ].join('\n');
    }

    var commonNumberedLineCss = [
      '.numbered-lines { counter-reset: writing-line-counter; }',
      '.writing-line-numbered { display: flex; align-items: flex-end; gap: 8px; }',
      '.writing-line-numbered::before { counter-increment: writing-line-counter; content: counter(writing-line-counter); font-size: 8pt; font-weight: 700; color: #64748b; width: 22px; text-align: right; flex-shrink: 0; user-select: none; line-height: 1; padding-bottom: 2px; }',
      '.writing-line-numbered .writing-line { flex: 1; width: 100%; }',
      '.passage-line-numbered { display: flex; align-items: baseline; gap: 8px; line-height: 1.6; }',
      '.passage-line-num { font-size: 8pt; font-weight: 700; color: #64748b; width: 22px; text-align: right; flex-shrink: 0; user-select: none; }',
      '.passage-line-text { flex: 1; }'
    ].join('\n');

    var commonHeaderAndQuestionCss = [
      '/* Header Customisation Layouts & Borders */',
      '.header-border-double { border: 2px double #000; }',
      '.header-border-neobrutalist { border: 2px solid #333333; box-shadow: 4px 4px 0 #555555; border-radius: 10px; }',
      '.header-border-solid { border: 2px solid #000; border-radius: 4px; }',
      '.header-border-dashed { border: 2px dashed #444; border-radius: 4px; }',
      '.header-border-minimal { border-top: 2px solid #000; border-bottom: 2px solid #000; border-left: none; border-right: none; padding-left: 0; padding-right: 0; }',
      '.header-border-none { border: none; box-shadow: none; padding: 0; }',
      '.header-bg-white { background: #ffffff; }',
      '.header-bg-ivory { background: #fdfdf6; }',
      '.header-bg-light_gray { background: #f8fafc; }',
      '.header-pad-compact { padding: 8px 12px; margin-bottom: 16px; }',
      '.header-pad-standard { padding: 14px 18px; margin-bottom: 24px; }',
      '.header-pad-spacious { padding: 20px 24px; margin-bottom: 30px; }',
      '.header-grid.header-layout-3-columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 10pt; }',
      '.header-grid.header-layout-2-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 10.5pt; }',
      '.header-grid.header-layout-compact { display: flex; flex-wrap: wrap; gap: 10px 18px; font-size: 9.5pt; }',
      '.header-table-layout { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10pt; }',
      '.header-table-layout td { padding: 4px 8px; vertical-align: middle; border: 1px solid #ddd; }',
      '.name-box { display: inline-block; width: 150px; height: 18px; border: 1px solid #000; vertical-align: middle; background: #fff; }',
      '.name-dotted { display: inline-block; min-width: 150px; border-bottom: 1px dotted #000; }',
      '.exam-title-row { margin-bottom: 10px; }',
      '.exam-subtitle-row { margin-top: -6px; margin-bottom: 10px; color: #475569; }',
      '.exam-variant-badge { float: right; background: #000; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10pt; letter-spacing: 1px; font-weight: 800; }',
      '.teacher-key-badge { color: #dc2626; font-weight: bold; font-size: 10pt; margin-left: 8px; }',
      '.exam-instructions-box { margin-top: 10px; padding: 8px 12px; font-size: 9pt; }',
      '.exam-instructions-box.instructions-style-box { border: 1.5px solid #000; border-radius: 4px; background: #fafafa; }',
      '.exam-instructions-box.instructions-style-quote { border-left: 4px solid #2563eb; background: #f0f7ff; padding-left: 10px; }',
      '.exam-instructions-box.instructions-style-tint { background: #fef9c3; border: 1px solid #facc15; border-radius: 4px; }',
      '.exam-instructions-title { font-weight: 800; text-transform: uppercase; font-size: 8pt; margin-bottom: 2px; color: #333; }',
      '.materials-badges-wrap { display: inline-flex; flex-wrap: wrap; gap: 4px; vertical-align: middle; }',
      '.mat-badge { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 1px 6px; border-radius: 3px; font-size: 8.5pt; font-weight: 600; }',
      '.exam-top-badge-row { overflow: hidden; margin-bottom: 8px; }',
      '.score-badge-box { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; border-top: 1.5px dashed #000; margin-top: 8px; padding-top: 6px; font-weight: 800; font-size: 10.5pt; }',
      '.lbl-bold { font-weight: bold; }',
      '.lbl-italic { font-style: italic; }',
      '.lbl-underline { text-decoration: underline; }',
      '.val-bold { font-weight: bold; }',
      '.val-italic { font-style: italic; }',
      '.val-underline { text-decoration: underline; }',
      '/* Exam Grading Scale Component & Container Modifiers */',
      '.exam-grading-scale-wrap { margin-top: 12px; padding: 10px 14px; border: 2px solid #000; border-radius: 4px; background: #fafafa; break-inside: avoid; page-break-inside: avoid; }',
      '.exam-grading-scale-wrap.exam-grading-scale-inline { padding: 6px 12px; margin-top: 8px; background: #fffbeb; }',
      '.scale-bg-default { background: #fafafa; }',
      '.exam-grading-scale-inline.scale-bg-default { background: #fffbeb; }',
      '.scale-bg-amber { background: #fffbeb !important; }',
      '.scale-bg-white { background: #ffffff !important; }',
      '.scale-bg-ivory { background: #fdfdf6 !important; }',
      '.scale-bg-light_gray { background: #f8fafc !important; }',
      '.scale-bg-none { background: transparent !important; }',
      '.scale-pad-compact { padding: 4px 8px !important; margin-top: 6px !important; }',
      '.scale-pad-standard { padding: 8px 14px !important; margin-top: 10px !important; }',
      '.scale-pad-spacious { padding: 14px 18px !important; margin-top: 14px !important; }',
      '.scale-border-solid { border: 2px solid #000 !important; border-radius: 4px; }',
      '.scale-border-neobrutalist { border: 2px solid #333333 !important; box-shadow: 3px 3px 0 #555555 !important; border-radius: 8px; }',
      '.scale-border-double { border: 3px double #000 !important; border-radius: 4px; }',
      '.scale-border-dashed { border: 2px dashed #444 !important; border-radius: 4px; }',
      '.scale-border-minimal { border-top: 2px solid #000 !important; border-bottom: 2px solid #000 !important; border-left: none !important; border-right: none !important; border-radius: 0 !important; padding-left: 0 !important; padding-right: 0 !important; }',
      '.scale-border-none { border: none !important; box-shadow: none !important; border-radius: 0; }',
      '.exam-grading-scale-title { font-weight: 800; text-transform: uppercase; font-size: 8.5pt; margin-bottom: 6px; color: #111; letter-spacing: 0.5px; }',
      '.exam-grading-scale-title.title-bold { font-weight: 900; }',
      '.exam-grading-scale-title.title-italic { font-style: italic; }',
      '.exam-grading-scale-title.title-underline { text-decoration: underline; }',
      '.scale-title-sub { font-weight: normal; color: #475569; text-transform: none; }',
      '.grading-scale-inline-row { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: center; font-size: 8.5pt; line-height: 1.4; margin-top: 4px; }',
      '.grading-scale-inline-item { display: inline-flex; align-items: center; gap: 2px; white-space: nowrap; font-size: 8.5pt; background: #fff; border: 1px solid #cbd5e1; padding: 1px 5px; border-radius: 3px; }',
      '.grading-scale-inline-item strong.scale-inline-grade { font-weight: 800; color: #0f172a; }',
      '.grading-scale-inline-pct { color: #475569; font-size: 8pt; font-weight: 600; }',
      '.grading-scale-inline-sep { color: #94a3b8; font-weight: 700; user-select: none; }',
      '.grading-scale-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; text-align: center; }',
      '.grading-scale-table th, .grading-scale-table td { border: 1.5px solid #000; padding: 4px 6px; }',
      '.grading-scale-table th { background: #e2e8f0; font-weight: 800; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.5px; }',
      '.col-scale-grade { width: 75px; }',
      '.col-scale-threshold { width: 85px; }',
      '.col-scale-points { width: 110px; }',
      '.col-scale-notes { text-align: left; }',
      '.scale-desc-cell { color: #64748b; font-size: 8pt; text-align: left; padding-left: 10px; }',
      '.scale-empty-cell { color: #888; }',
      '.grading-scale-table td.scale-grade-cell { font-weight: 800; font-size: 9pt; }',
      '.grading-scale-inline-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 9pt; }',
      '.grading-scale-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border: 1.5px solid #333333; border-radius: 4px; font-weight: 700; font-size: 8pt; background: #ffffff; box-shadow: 1px 1px 0 #555555; }',
      '/* Exam Competences & Curriculum Objectives Component */',
      '.exam-competences-wrap { margin-top: 12px; padding: 10px 14px; border: 2px solid #2563eb; border-radius: 4px; background: #f0f7ff; break-inside: avoid; page-break-inside: avoid; }',
      '.comp-bg-default { background: #f0f7ff; border-color: #2563eb; }',
      '.comp-bg-white { background: #ffffff !important; }',
      '.comp-bg-ivory { background: #fdfdf6 !important; }',
      '.comp-bg-light_gray { background: #f8fafc !important; }',
      '.comp-bg-tint { background: #eff6ff !important; }',
      '.comp-bg-none { background: transparent !important; }',
      '.comp-pad-compact { padding: 4px 8px !important; margin-top: 6px !important; }',
      '.comp-pad-standard { padding: 8px 14px !important; margin-top: 10px !important; }',
      '.comp-pad-spacious { padding: 14px 18px !important; margin-top: 14px !important; }',
      '.comp-border-solid { border: 2px solid #2563eb !important; border-radius: 4px; }',
      '.comp-border-neobrutalist { border: 2px solid #1e40af !important; box-shadow: 3px 3px 0 #1e40af !important; border-radius: 8px; }',
      '.comp-border-double { border: 3px double #2563eb !important; border-radius: 4px; }',
      '.comp-border-dashed { border: 2px dashed #2563eb !important; border-radius: 4px; }',
      '.comp-border-minimal { border-top: 2px solid #2563eb !important; border-bottom: 2px solid #2563eb !important; border-left: none !important; border-right: none !important; border-radius: 0 !important; }',
      '.comp-border-none { border: none !important; box-shadow: none !important; border-radius: 0; }',
      '.exam-competences-title { font-weight: 800; text-transform: uppercase; font-size: 8.5pt; margin-bottom: 6px; color: #1e40af; letter-spacing: 0.5px; }',
      '.exam-competences-title.title-bold { font-weight: 900; }',
      '.exam-competences-title.title-italic { font-style: italic; }',
      '.exam-competences-title.title-underline { text-decoration: underline; }',
      '.competences-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; text-align: left; }',
      '.competences-table th, .competences-table td { border: 1.5px solid #2563eb; padding: 4px 8px; }',
      '.competences-table th { background: #dbeafe; color: #1e40af; font-weight: 800; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.5px; }',
      '.col-comp-code { width: 90px; font-weight: 800; text-align: center; }',
      '.col-comp-level { width: 75px; text-align: center; font-weight: 700; color: #1e40af; }',
      '.comp-desc-cell { color: #334155; font-size: 8.2pt; line-height: 1.35; }',
      '.competences-badges-wrap { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px; }',
      '.comp-chip { display: inline-flex; flex-direction: column; padding: 3px 8px; background: #ffffff; border: 1.5px solid #2563eb; border-radius: 4px; box-shadow: 1px 1px 0 #2563eb; font-size: 8pt; }',
      '.comp-chip strong { color: #1e40af; font-weight: 800; }',
      '.comp-chip-desc { font-size: 7.2pt; color: #475569; margin-top: 1px; }',
      '/* Exam Assessment Criteria & Evaluation Rubric Component */',
      '.exam-criteria-wrap { margin-top: 12px; padding: 10px 14px; border: 2px solid #059669; border-radius: 4px; background: #f0fdf4; break-inside: avoid; page-break-inside: avoid; }',
      '.crit-bg-default { background: #f0fdf4; border-color: #059669; }',
      '.crit-bg-white { background: #ffffff !important; }',
      '.crit-bg-ivory { background: #fdfdf6 !important; }',
      '.crit-bg-amber { background: #fffbeb !important; border-color: #d97706 !important; }',
      '.crit-bg-light_gray { background: #f8fafc !important; }',
      '.crit-bg-none { background: transparent !important; }',
      '.crit-pad-compact { padding: 4px 8px !important; margin-top: 6px !important; }',
      '.crit-pad-standard { padding: 8px 14px !important; margin-top: 10px !important; }',
      '.crit-pad-spacious { padding: 14px 18px !important; margin-top: 14px !important; }',
      '.crit-border-solid { border: 2px solid #059669 !important; border-radius: 4px; }',
      '.crit-border-neobrutalist { border: 2px solid #065f46 !important; box-shadow: 3px 3px 0 #065f46 !important; border-radius: 8px; }',
      '.crit-border-double { border: 3px double #059669 !important; border-radius: 4px; }',
      '.crit-border-dashed { border: 2px dashed #059669 !important; border-radius: 4px; }',
      '.crit-border-minimal { border-top: 2px solid #059669 !important; border-bottom: 2px solid #059669 !important; border-left: none !important; border-right: none !important; border-radius: 0 !important; }',
      '.crit-border-none { border: none !important; box-shadow: none !important; border-radius: 0; }',
      '.exam-criteria-title { font-weight: 800; text-transform: uppercase; font-size: 8.5pt; margin-bottom: 6px; color: #065f46; letter-spacing: 0.5px; }',
      '.exam-criteria-title.title-bold { font-weight: 900; }',
      '.exam-criteria-title.title-italic { font-style: italic; }',
      '.exam-criteria-title.title-underline { text-decoration: underline; }',
      '.criteria-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; text-align: left; }',
      '.criteria-table th, .criteria-table td { border: 1.5px solid #059669; padding: 4px 8px; }',
      '.criteria-table th { background: #d1fae5; color: #065f46; font-weight: 800; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.5px; }',
      '.col-crit-max { width: 65px; text-align: center; font-weight: 800; }',
      '.col-crit-score { width: 65px; text-align: center; }',
      '.col-crit-comments { min-width: 120px; }',
      '.crit-desc-cell { color: #334155; font-size: 8.2pt; line-height: 1.35; }',
      '.rubric-desc { font-size: 7.8pt; color: #475569; margin-top: 2px; line-height: 1.3; }',
      '/* Composition Component Styles (Genre Tag, Draft Box, Checklist) */',
      '.composition-genre-tag { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #1e40af; background: #eff6ff; border: 1px solid #93c5fd; border-radius: 4px; padding: 2px 8px; display: inline-block; margin-bottom: 8px; }',
      '.draft-work-box { border: 1.5px dashed #94a3b8; border-radius: 4px; background: #fafafa; min-height: 85px; margin: 8px 0 12px 0; padding: 8px 12px; position: relative; break-inside: avoid; page-break-inside: avoid; }',
      '.draft-work-box.draft-ruled { min-height: auto; padding-bottom: 6px; }',
      '.draft-work-box.draft-grid-box { min-height: auto; }',
      '.draft-title { font-size: 8.5pt; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }',
      '.draft-note { font-size: 8pt; font-style: italic; color: #64748b; margin-top: 2px; margin-bottom: 4px; }',
      '.composition-checklist { border: 1.5px solid #000; border-radius: 4px; background: #fffbeb; padding: 6px 10px; margin-top: 10px; font-size: 8.5pt; break-inside: avoid; page-break-inside: avoid; }',
      '.checklist-bg-amber { background: #fffbeb !important; }',
      '.checklist-bg-white { background: #ffffff !important; }',
      '.checklist-bg-ivory { background: #fdfdf6 !important; }',
      '.checklist-bg-light_gray { background: #f8fafc !important; }',
      '.checklist-bg-tint { background: #eff6ff !important; border-color: #93c5fd !important; }',
      '.checklist-bg-none { background: transparent !important; }',
      '.checklist-pad-compact { padding: 4px 8px !important; margin-top: 6px !important; }',
      '.checklist-pad-standard { padding: 6px 12px !important; margin-top: 10px !important; }',
      '.checklist-pad-spacious { padding: 12px 16px !important; margin-top: 14px !important; }',
      '.checklist-border-solid { border: 1.5px solid #000 !important; border-radius: 4px; }',
      '.checklist-border-neobrutalist { border: 2px solid #333333 !important; box-shadow: 3px 3px 0 #555555 !important; border-radius: 8px; }',
      '.checklist-border-dashed { border: 1.5px dashed #444 !important; border-radius: 4px; }',
      '.checklist-border-quote { border: none !important; border-left: 4px solid #f59e0b !important; border-radius: 0 !important; }',
      '.checklist-border-none { border: none !important; box-shadow: none !important; }',
      '.checklist-title { font-weight: 800; margin-bottom: 5px; color: #92400e; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px; }',
      '.checklist-items { font-weight: 600; font-size: 8.5pt; }',
      '.composition-checklist.checklist-inline .checklist-items { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; }',
      '.composition-checklist.checklist-columns .checklist-items { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; align-items: start; }',
      '.composition-checklist.checklist-stacked .checklist-items { display: flex; flex-direction: column; gap: 5px; }',
      '.checklist-item { display: inline-flex; align-items: baseline; gap: 6px; font-size: 8.5pt; break-inside: avoid; }',
      '.checklist-box { font-size: 9.5pt; color: #1e293b; user-select: none; font-weight: bold; }',
      '/* Semantic Classes for Exercises (Export Standards) */',
      '.cloze-text { margin-bottom: 8px; }',
      '.open-question-item { margin-bottom: 14px; }',
      '.teacher-sample-answer { color: #b91c1c; font-size: 10pt; font-weight: bold; margin: 6px 0; }',
      '.composition-task-block { margin-bottom: 12px; }',
      '.comp-wordcount-hint { font-size: 9.5pt; font-style: italic; margin: 4px 0 8px; }',
      '.comp-task-lines-label { font-size: 9pt; font-weight: 700; color: #64748b; margin-top: 8px; }',
      '.col-rubric-max, .col-rubric-score { width: 70px; }',
      '.matching-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }',
      '.matching-response-table { margin-top: 12px; max-width: 400px; }',
      '.transformation-item { margin-bottom: 12px; font-size: 10.5pt; }',
      '.trans-keyword-bracketed { padding-left: 20px; margin: 2px 0; }',
      '.trans-keyword-block { font-weight: bold; margin: 2px 0 2px 20px; letter-spacing: 1px; color: #2563eb; }',
      '.trans-solution-line { color: #b91c1c; font-weight: bold; padding-left: 20px; }',
      '.trans-blank-line { padding-left: 20px; }',
      '.translation-item { margin-bottom: 12px; font-size: 10.5pt; }',
      '.translation-solution { color: #b91c1c; font-weight: bold; margin: 4px 0; }',
      '.pic-desc-item { margin-bottom: 18px; }',
      '.pic-side-layout { display: flex; gap: 18px; align-items: flex-start; }',
      '.pic-media-col { flex: 0 0 40%; max-width: 40%; }',
      '.pic-content-col { flex: 1; }',
      '.pic-prompt-img { width: 100%; object-fit: contain; border: 1.5px solid #000; border-radius: 4px; }',
      '.pic-img-small { max-height: 120px; }',
      '.pic-img-medium { max-height: 180px; }',
      '.pic-img-large { max-height: 250px; }',
      '.pic-caption { font-size: 8.5pt; color: #475569; font-style: italic; margin-top: 2px; }',
      '.pic-prompt-row { margin-bottom: 8px; }',
      '.pic-sample-answer { color: #b91c1c; font-size: 10pt; font-weight: bold; margin-bottom: 6px; }',
      '.pic-stacked-media { margin-bottom: 10px; }',
      '.cell-center { text-align: center; }',
      '.cell-left { text-align: left; }',
      '.cell-right { text-align: right; }',
      '.odd-item-block { margin-bottom: 14px; font-size: 10.5pt; }',
      '.odd-justification-key { color: #b91c1c; font-size: 9.5pt; margin-top: 2px; }',
      '.odd-task-mode-hint { font-size: 9pt; font-style: italic; color: #64748b; margin-top: 4px; }',
      '.odd-intruder-response-row { margin-top: 6px; display: flex; gap: 10px; align-items: center; }',
      '.odd-intruder-label, .odd-why-label { font-size: 9pt; font-weight: bold; }',
      '.odd-intruder-line { display: inline-block; width: 140px; border-bottom: 1px solid #000; }',
      '.odd-why-line { flex: 1; border-bottom: 1px solid #000; }',
      '.odd-pill.correct { color: #b91c1c !important; font-weight: bold !important; border-color: #b91c1c !important; background: #fee2e2 !important; }',
      '.odd-plain-key { color: #b91c1c; font-weight: bold; text-decoration: underline; }',
      '.reading-passage-box { border: 1.5px solid #333; padding: 12px; background: #fbfbfb; margin-bottom: 14px; font-size: 10pt; line-height: 1.6; }',
      '.reading-passage-title { font-weight: bold; margin-bottom: 6px; text-align: center; text-decoration: underline; }',
      '.passage-footnotes { margin-top: 10px; padding-top: 6px; border-top: 1px dashed #94a3b8; font-size: 8.5pt; color: #334155; }',
      '.rc-subquestion-block { margin-bottom: 10px; font-size: 10.5pt; }',
      '.rc-tf-choice-row { margin: 4px 0 6px 14px; font-size: 9.5pt; font-weight: bold; }',
      '.rc-quote-prompt { font-size: 9pt; font-style: italic; margin-left: 14px; margin-bottom: 4px; }',
      '.rc-answer-solution { color: #b91c1c; font-weight: bold; margin: 2px 0; }',
      '/* Exercise & Question Styling Overrides */',
      '.card-border-neobrutalist { border: 2.5px solid #000 !important; box-shadow: 3px 3px 0 #000 !important; }',
      '.card-border-minimal { border: 1px solid #cbd5e1 !important; box-shadow: none !important; }',
      '.card-border-borderless { border: none !important; box-shadow: none !important; border-bottom: 1.5px solid #000 !important; border-radius: 0 !important; padding-left: 0 !important; padding-right: 0 !important; }',
      '.q-spacing-compact .mcq-item, .q-spacing-compact .exercise-subitem-card { margin-bottom: 6px !important; }',
      '.q-spacing-relaxed .mcq-item, .q-spacing-relaxed .exercise-subitem-card { margin-bottom: 18px !important; }',
      '/* Header & Exercise Page Break Protection */',
      '.exam-header { break-after: avoid !important; page-break-after: avoid !important; }',
      '.exercise-header { break-after: avoid !important; page-break-after: avoid !important; }',
      '.exercise-instructions { break-after: avoid !important; page-break-after: avoid !important; }',
      '.exercise-card { break-inside: auto; page-break-inside: auto; }',
      '.exercise-card:first-of-type:not(.page-break-before) { break-before: avoid !important; page-break-before: avoid !important; }',
      '.mcq-item, .matching-row, .table-exercise tr, .rubric-table tr, .grading-scale-table tr, .cloze-text, .writing-box, .writing-grid { break-inside: avoid; page-break-inside: avoid; }'
    ].join('\n');

    return css + '\n' + commonNumberedLineCss + '\n' + commonHeaderAndQuestionCss;
  };

  // ── 3c. Modular Customizable Header Renderer ─────────────────────────────
  TestCreatorService.renderHeaderHtml = function (test, isTeacherKey, variant, studentName, className, totalPts) {
    var hc = TestCreatorService.ensureHeaderConfig(test);
    var v = variant || test.variant || 'A';
    var tPts = (totalPts !== undefined) ? totalPts : TestCreatorService.calculateTotalTestPoints(test);
    var mats = Array.isArray(test.materialsAllowed) ? test.materialsAllowed : [];

    var borderCls = 'header-border-' + (hc.borderStyle || 'double');
    var layoutCls = 'header-layout-' + (hc.layout || '3-columns');
    var bgCls = 'header-bg-' + (hc.backgroundTint || 'ivory');
    var padCls = 'header-pad-' + (hc.padding || 'standard');

    var out = [];
    out.push('    <div class="exam-header ' + borderCls + ' ' + bgCls + ' ' + padCls + '">');

    // Variant badge & key badge
    var variantBadgeHtml = '';
    if (hc.showVariantBadge) {
      variantBadgeHtml = '<span class="exam-variant-badge">GROUP ' + escapeHtml(v) + '</span>';
    }
    var keyBadgeHtml = isTeacherKey ? ' <span class="teacher-key-badge">[TEACHER SOLUTION KEY]</span>' : '';

    // Helper for formatting an element item
    function formatItemHtml(lbl, val, styleObj, customCss) {
      var st = styleObj || {};
      var lblClasses = ['lbl'];
      if (st.bold) lblClasses.push('lbl-bold');
      if (st.italic) lblClasses.push('lbl-italic');
      if (st.underline) lblClasses.push('lbl-underline');

      var valClasses = ['val'];
      if (st.valBold) valClasses.push('val-bold');
      if (st.valItalic) valClasses.push('val-italic');
      if (st.valUnderline) valClasses.push('val-underline');

      var extra = customCss ? ' style="' + customCss + '"' : '';
      return '<div class="header-item"' + extra + '><span class="' + lblClasses.join(' ') + '">' + TestCreatorService.formatRichText(lbl) + '</span> <span class="' + valClasses.join(' ') + '">' + val + '</span></div>';
    }

    // Section builders
    function buildTitleHtml() {
      if (!hc.showTitle) {
        if (variantBadgeHtml) return '      <div class="exam-top-badge-row">' + variantBadgeHtml + '</div>';
        return '';
      }
      var tSt = hc.titleStyle || {};
      var tCss = [];
      if (tSt.bold) tCss.push('font-weight: 900;');
      if (tSt.italic) tCss.push('font-style: italic;');
      if (tSt.underline) tCss.push('text-decoration: underline;');
      if (tSt.uppercase) tCss.push('text-transform: uppercase;');
      if (tSt.size) {
        var tSizeObj = TestCreatorService.parseUnitValue(tSt.size, 'pt');
        if (tSizeObj.css) tCss.push('font-size: ' + tSizeObj.css + ';');
      }
      if (tSt.align) tCss.push('text-align: ' + tSt.align + ';');

      var titleText = test.title || 'Class Examination';
      var tOut = [];
      tOut.push('      <div class="exam-title-row" style="' + tCss.join(' ') + '">');
      if (variantBadgeHtml && tSt.align !== 'center') {
        tOut.push('        ' + variantBadgeHtml);
      }
      tOut.push('        <span class="exam-title-text">' + TestCreatorService.formatRichText(titleText) + '</span>' + keyBadgeHtml);
      if (variantBadgeHtml && tSt.align === 'center') {
        tOut.push('        <div style="margin-top:4px;">' + variantBadgeHtml + '</div>');
      }
      tOut.push('      </div>');
      return tOut.join('\n');
    }

    function buildSubtitleHtml() {
      if (!hc.showSubtitle || !hc.subtitleText) return '';
      var subSt = hc.subtitleStyle || {};
      var subCss = [];
      if (subSt.bold) subCss.push('font-weight: bold;');
      if (subSt.italic) subCss.push('font-style: italic;');
      if (subSt.underline) subCss.push('text-decoration: underline;');
      if (subSt.size) {
        var subSizeObj = TestCreatorService.parseUnitValue(subSt.size, 'pt');
        if (subSizeObj.css) subCss.push('font-size: ' + subSizeObj.css + ';');
      }
      if (subSt.align) subCss.push('text-align: ' + subSt.align + ';');
      return '      <div class="exam-subtitle-row" style="' + subCss.join(' ') + '">' + TestCreatorService.formatRichText(hc.subtitleText) + '</div>';
    }

    function buildMetadataHtml() {
      var metaItemsMap = {};
      if (hc.showStudentName) {
        var sVal = studentName ? escapeHtml(studentName) : (hc.studentNameStyle && hc.studentNameStyle.lineStyle === 'box' ? '<span class="name-box"></span>' : (hc.studentNameStyle && hc.studentNameStyle.lineStyle === 'dotted' ? '<span class="name-dotted"></span>' : '___________________________'));
        metaItemsMap['studentName'] = formatItemHtml(hc.studentNameLabel || 'Student Name:', sVal, hc.studentNameStyle);
      }
      if (hc.showClass) {
        metaItemsMap['class'] = formatItemHtml(hc.classLabel || 'Class / Group:', TestCreatorService.formatRichText(className || test.className || '__________'), hc.classStyle);
      }
      if (hc.showDate) {
        metaItemsMap['date'] = formatItemHtml(hc.dateLabel || 'Date:', TestCreatorService.formatRichText(test.date || '__________'), hc.dateStyle);
      }
      if (hc.showTeacher) {
        metaItemsMap['teacher'] = formatItemHtml(hc.teacherLabel || 'Teacher:', TestCreatorService.formatRichText(test.teacher || '__________'), hc.teacherStyle);
      }
      if (hc.showDuration) {
        metaItemsMap['duration'] = formatItemHtml(hc.durationLabel || 'Duration:', (test.durationMinutes || 45) + ' min', hc.durationStyle);
      }
      if (hc.showMaterials) {
        var mMode = (hc.materialsStyle && hc.materialsStyle.displayMode) || 'inline';
        var matHtml = '';
        if (mMode === 'badges') {
          matHtml = '<div class="materials-badges-wrap">' + (mats.length ? mats.map(function (m) { return '<span class="mat-badge">' + TestCreatorService.formatRichText(m) + '</span>'; }).join(' ') : '<span class="mat-badge">Standard</span>') + '</div>';
        } else {
          matHtml = mats.length ? mats.map(function (m) { return TestCreatorService.formatRichText(m); }).join(', ') : 'Standard';
        }
        metaItemsMap['materials'] = formatItemHtml(hc.materialsLabel || 'Materials:', matHtml, hc.materialsStyle);
      }
      if (hc.showScope) {
        metaItemsMap['scope'] = formatItemHtml(hc.scopeLabel || 'Scope / Topic:', TestCreatorService.formatRichText(test.scope || 'Curriculum Evaluation'), hc.scopeStyle);
      }
      if (hc.showTotalPoints) {
        metaItemsMap['points'] = formatItemHtml(hc.pointsLabel || 'Total Points:', '____ / ' + tPts + ' pts', hc.pointsStyle);
      }
      if (hc.showGradingScale) {
        var scMode = (hc.gradingScaleStyle && hc.gradingScaleStyle.displayMode) || 'table';
        if (scMode === 'inline') {
          var scaleName = (test.scaleModel && (test.scaleModel.label || test.scaleModel.name)) || test.scaleModelId || 'Standard Scale';
          metaItemsMap['gradingScale'] = formatItemHtml(hc.gradingScaleLabel || 'Grading Scale:', TestCreatorService.formatRichText(scaleName), hc.gradingScaleStyle);
        } else if (scMode === 'inline_grades' && sectionOrder.indexOf('gradingScale') === -1) {
          var inlineGradesHtml = TestCreatorService.formatInlineGradesString(test, { totalPoints: tPts, html: true });
          metaItemsMap['gradingScale'] = formatItemHtml(hc.gradingScaleLabel || 'Grading Scale:', inlineGradesHtml, hc.gradingScaleStyle);
        }
      }
      if (hc.showCompetences && hc.competencesStyle && hc.competencesStyle.displayMode === 'inline') {
        var cCount = (test.linkedCompetences && test.linkedCompetences.length) || (test.linkedCompetenceIds && test.linkedCompetenceIds.length) || 0;
        metaItemsMap['competences'] = formatItemHtml(hc.competencesLabel || 'Competences:', cCount + ' assessed', hc.competencesStyle);
      }
      if (hc.showCriteria && hc.criteriaStyle && hc.criteriaStyle.displayMode === 'inline') {
        var crCount = (test.criteria && test.criteria.length) || (test.linkedCriteria && test.linkedCriteria.length) || 0;
        metaItemsMap['criteria'] = formatItemHtml(hc.criteriaLabel || 'Criteria:', crCount + ' rubrics', hc.criteriaStyle);
      }

      var metaOrder = (Array.isArray(hc.metaOrder) && hc.metaOrder.length)
        ? hc.metaOrder
        : ['studentName', 'class', 'date', 'teacher', 'duration', 'materials', 'scope', 'points', 'gradingScale', 'competences', 'criteria'];

      var orderedItems = [];
      metaOrder.forEach(function (k) {
        if (metaItemsMap[k]) orderedItems.push({ key: k, html: metaItemsMap[k] });
      });

      if (!orderedItems.length) return '';

      var mOut = [];
      if (hc.layout === 'table') {
        mOut.push('      <table class="header-table-layout"><tbody>');
        for (var r = 0; r < orderedItems.length; r += 3) {
          mOut.push('        <tr>');
          for (var c = 0; c < 3; c++) {
            var itm = orderedItems[r + c];
            if (itm) {
              mOut.push('          <td>' + itm.html + '</td>');
            } else {
              mOut.push('          <td></td>');
            }
          }
          mOut.push('        </tr>');
        }
        mOut.push('      </tbody></table>');
      } else {
        mOut.push('      <div class="header-grid ' + layoutCls + '">');
        orderedItems.forEach(function (itm) {
          if (itm.key === 'scope' || itm.key === 'points') {
            mOut.push('        <div class="header-item-score-wrap">' + itm.html + '</div>');
          } else {
            mOut.push('        ' + itm.html);
          }
        });
        mOut.push('      </div>');
      }
      return mOut.join('\n');
    }

    function buildInstructionsHtml() {
      if (!hc.showInstructions || !hc.instructionsText) return '';
      var iSt = hc.instructionsStyle || {};
      var iBoxCss = [];
      if (iSt.bold) iBoxCss.push('font-weight: bold;');
      if (iSt.italic) iBoxCss.push('font-style: italic;');
      if (iSt.underline) iBoxCss.push('text-decoration: underline;');
      var iBoxCls = 'exam-instructions-box instructions-style-' + (iSt.border || 'box');
      var iOut = [];
      iOut.push('      <div class="' + iBoxCls + '" style="' + iBoxCss.join(' ') + '">');
      iOut.push('        <div class="exam-instructions-title">Instructions &amp; Guidelines:</div>');
      iOut.push('        <div>' + TestCreatorService.formatRichText(hc.instructionsText) + '</div>');
      iOut.push('      </div>');
      return iOut.join('\n');
    }

    function buildGradingScaleSectionHtml() {
      if ((test.exercises || []).some(function (e) { return e && e.type === 'section_grading_scale'; })) return '';
      if (!hc.showGradingScale || (hc.gradingScaleStyle && hc.gradingScaleStyle.displayMode === 'inline')) return '';
      return TestCreatorService.renderGradingScaleHtml(test, { totalPoints: tPts });
    }

    function buildCompetencesSectionHtml() {
      if ((test.exercises || []).some(function (e) { return e && e.type === 'section_competences'; })) return '';
      if (!hc.showCompetences || (hc.competencesStyle && hc.competencesStyle.displayMode === 'inline')) return '';
      return TestCreatorService.renderCompetencesHtml(test, { totalPoints: tPts });
    }

    function buildCriteriaSectionHtml() {
      if ((test.exercises || []).some(function (e) { return e && e.type === 'section_criteria'; })) return '';
      if (!hc.showCriteria || (hc.criteriaStyle && hc.criteriaStyle.displayMode === 'inline')) return '';
      return TestCreatorService.renderCriteriaHtml(test, { totalPoints: tPts });
    }

    // Dynamic Section Ordering
    var sectionOrder = (Array.isArray(hc.sectionOrder) && hc.sectionOrder.length)
      ? hc.sectionOrder.slice()
      : ['title', 'subtitle', 'metadata', 'instructions', 'gradingScale', 'competences', 'criteria'];

    if (hc.showCompetences && sectionOrder.indexOf('competences') === -1) {
      sectionOrder.push('competences');
    }
    if (hc.showCriteria && sectionOrder.indexOf('criteria') === -1) {
      sectionOrder.push('criteria');
    }

    sectionOrder.forEach(function (secKey) {
      var sHtml = '';
      if (secKey === 'title') sHtml = buildTitleHtml();
      else if (secKey === 'subtitle') sHtml = buildSubtitleHtml();
      else if (secKey === 'metadata') sHtml = buildMetadataHtml();
      else if (secKey === 'instructions') sHtml = buildInstructionsHtml();
      else if (secKey === 'gradingScale') sHtml = buildGradingScaleSectionHtml();
      else if (secKey === 'competences') sHtml = buildCompetencesSectionHtml();
      else if (secKey === 'criteria') sHtml = buildCriteriaSectionHtml();
      if (sHtml) out.push(sHtml);
    });

    out.push('    </div>');
    return out.join('\n');
  };

  TestCreatorService.renderCompetencesHtml = function (test, options) {
    if (!test) return '';
    var opts = options || {};
    var hc = TestCreatorService.ensureHeaderConfig(test);
    var label = opts.title || opts.label || hc.competencesLabel || 'Competences & Curriculum Objectives:';
    var displayMode = opts.displayMode || (hc.competencesStyle && hc.competencesStyle.displayMode) || 'table';
    var showDesc = (opts.showDescriptions !== undefined) ? opts.showDescriptions : (hc.showCompetenceDescriptions !== false);

    // Aggregate competences from test-level and exercises
    var rawComps = (Array.isArray(test.linkedCompetences) && test.linkedCompetences.length)
      ? test.linkedCompetences
      : (Array.isArray(test.linkedCompetenceIds) ? test.linkedCompetenceIds : []);

    if (!rawComps.length && Array.isArray(test.exercises)) {
      test.exercises.forEach(function (ex) {
        var exComps = ex.linkedCompetences || ex.linkedCompetenceIds || [];
        exComps.forEach(function (c) {
          if (rawComps.indexOf(c) === -1) rawComps.push(c);
        });
      });
    }

    if (!rawComps.length) return '';

    var comps = rawComps.map(function (c) {
      if (c && typeof c === 'object') {
        return {
          code: c.code || c.id || '',
          title: c.title || c.name || c.code || '',
          description: c.description || c.descriptors || c.desc || '',
          level: c.level || c.yearLevel || '',
          domain: c.domain || c.category || ''
        };
      }
      var str = String(c || '').trim();
      var code = str;
      var title = str;
      var desc = '';
      var level = '';
      if (str.startsWith('[')) {
        var endBracket = str.indexOf(']');
        if (endBracket !== -1) {
          level = str.slice(1, endBracket).trim();
          str = str.slice(endBracket + 1).trim();
        }
      }
      if (str.indexOf(' - ') !== -1) {
        var parts = str.split(' - ');
        code = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      } else if (str.indexOf(': ') !== -1) {
        var parts2 = str.split(': ');
        code = parts2[0].trim();
        title = parts2.slice(1).join(': ').trim();
      }
      return { code: code, title: title, description: desc, level: level, domain: '' };
    });

    comps.sort(function (a, b) {
      return (a.code || a.title || '').localeCompare(b.code || b.title || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    var cSt = hc.competencesStyle || {};
    var titleClasses = ['exam-competences-title'];
    if (cSt.bold) titleClasses.push('title-bold');
    if (cSt.italic) titleClasses.push('title-italic');
    if (cSt.underline) titleClasses.push('title-underline');
    var titleClsAttr = ' class="' + titleClasses.join(' ') + '"';

    var bgCls = ' comp-bg-' + (opts.background || cSt.background || 'default');
    var padCls = ' comp-pad-' + (opts.padding || cSt.padding || 'standard');
    var borderCls = ' comp-border-' + (opts.border || cSt.border || 'solid');

    if (displayMode === 'badges') {
      var out = [];
      out.push('      <div class="exam-competences-wrap' + bgCls + padCls + borderCls + '">');
      out.push('        <div' + titleClsAttr + '>' + TestCreatorService.formatRichText(label) + ' <span class="scale-title-sub">(' + comps.length + ' objectives)</span></div>');
      out.push('        <div class="competences-badges-wrap">');
      comps.forEach(function (c) {
        var codePart = c.code ? '<strong>' + escapeHtml(c.code) + '</strong>' : '';
        var titlePart = c.title && c.title !== c.code ? ' <span>' + escapeHtml(c.title) + '</span>' : '';
        var descPart = (showDesc && c.description) ? '<div class="comp-chip-desc">' + escapeHtml(c.description) + '</div>' : '';
        out.push('          <div class="comp-chip">' + codePart + titlePart + descPart + '</div>');
      });
      out.push('        </div>');
      out.push('      </div>');
      return out.join('\n');
    }

    if (displayMode === 'list') {
      var out = [];
      out.push('      <div class="exam-competences-wrap' + bgCls + padCls + borderCls + '">');
      out.push('        <div' + titleClsAttr + '>' + TestCreatorService.formatRichText(label) + '</div>');
      out.push('        <ul style="margin-left: 20px; font-size: 8.5pt; line-height: 1.45; margin-top: 4px;">');
      comps.forEach(function (c) {
        var codePart = c.code ? '<strong>' + escapeHtml(c.code) + ':</strong> ' : '';
        var titlePart = escapeHtml(c.title || '');
        var descPart = (showDesc && c.description) ? ' — <span style="color:#475569;">' + escapeHtml(c.description) + '</span>' : '';
        out.push('          <li>' + codePart + titlePart + descPart + '</li>');
      });
      out.push('        </ul>');
      out.push('      </div>');
      return out.join('\n');
    }

    // Default: 'table'
    var out = [];
    out.push('      <div class="exam-competences-wrap' + bgCls + padCls + borderCls + '">');
    out.push('        <div' + titleClsAttr + '>' + TestCreatorService.formatRichText(label) + ' <span class="scale-title-sub">(' + comps.length + ' evaluated)</span></div>');
    out.push('        <table class="competences-table">');
    out.push('          <thead><tr>');
    out.push('            <th class="col-comp-code">Code / Ref</th>');
    out.push('            <th>Competence &amp; Learning Objective</th>');
    if (showDesc) out.push('            <th>Descriptors &amp; Performance Criteria</th>');
    out.push('            <th class="col-comp-level">Level</th>');
    out.push('          </tr></thead>');
    out.push('          <tbody>');
    comps.forEach(function (c) {
      out.push('            <tr>');
      out.push('              <td class="col-comp-code"><strong>' + escapeHtml(c.code || 'COMP') + '</strong></td>');
      out.push('              <td><strong>' + escapeHtml(c.title || c.code) + '</strong>' + (c.domain ? '<div style="font-size:7.5pt;color:#64748b;">Domain: ' + escapeHtml(c.domain) + '</div>' : '') + '</td>');
      if (showDesc) {
        out.push('              <td class="comp-desc-cell">' + escapeHtml(c.description || c.title || 'Demonstrates curriculum competence mastery.') + '</td>');
      }
      out.push('              <td class="col-comp-level">' + escapeHtml(c.level || '—') + '</td>');
      out.push('            </tr>');
    });
    out.push('          </tbody>');
    out.push('        </table>');
    out.push('      </div>');
    return out.join('\n');
  };

  TestCreatorService.renderCriteriaHtml = function (test, options) {
    if (!test) return '';
    var opts = options || {};
    var hc = TestCreatorService.ensureHeaderConfig(test);
    var label = opts.title || opts.label || hc.criteriaLabel || 'Assessment Criteria & Evaluation Rubric:';
    var displayMode = opts.displayMode || (hc.criteriaStyle && hc.criteriaStyle.displayMode) || 'table';
    var showDesc = (opts.showDescriptions !== undefined) ? opts.showDescriptions : (hc.showCriteriaDescriptions !== false);

    // Aggregate criteria from test-level and exercises
    var rawCriteria = (Array.isArray(test.criteria) && test.criteria.length)
      ? test.criteria
      : ((Array.isArray(test.linkedCriteria) && test.linkedCriteria.length) ? test.linkedCriteria : []);

    if (!rawCriteria.length && Array.isArray(test.exercises)) {
      test.exercises.forEach(function (ex) {
        if (Array.isArray(ex.markingRubric) && ex.markingRubric.length) {
          ex.markingRubric.forEach(function (r) {
            if (!rawCriteria.some(function (existing) { return (existing.id && existing.id === r.id) || (existing.title === r.title); })) {
              rawCriteria.push(r);
            }
          });
        }
      });
    }

    if (!rawCriteria.length) return '';

    var crSt = hc.criteriaStyle || {};
    var titleClasses = ['exam-criteria-title'];
    if (crSt.bold) titleClasses.push('title-bold');
    if (crSt.italic) titleClasses.push('title-italic');
    if (crSt.underline) titleClasses.push('title-underline');
    var titleClsAttr = ' class="' + titleClasses.join(' ') + '"';

    var bgCls = ' crit-bg-' + (opts.background || crSt.background || 'default');
    var padCls = ' crit-pad-' + (opts.padding || crSt.padding || 'standard');
    var borderCls = ' crit-border-' + (opts.border || crSt.border || 'solid');

    if (displayMode === 'compact') {
      var out = [];
      out.push('      <div class="exam-criteria-wrap' + bgCls + padCls + borderCls + '">');
      out.push('        <div' + titleClsAttr + '>' + TestCreatorService.formatRichText(label) + '</div>');
      out.push('        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">');
      rawCriteria.forEach(function (crit) {
        var cTitle = crit.title || crit.name || 'Criterion';
        var cMax = crit.maxPoints || (Array.isArray(crit.grades) ? crit.grades[0] : 6) || 4;
        var cDesc = (showDesc && (crit.description || crit.desc || crit.domain)) ? '<div class="rubric-desc">' + escapeHtml(crit.description || crit.desc || crit.domain) + '</div>' : '';
        out.push('          <div style="background:#fff;border:1.5px solid #059669;padding:4px 8px;border-radius:4px;font-size:8pt;box-shadow:1px 1px 0 #059669;"><strong>' + escapeHtml(cTitle) + '</strong> <span style="color:#065f46;font-weight:800;">(/' + cMax + ' pts)</span>' + cDesc + '</div>');
      });
      out.push('        </div>');
      out.push('      </div>');
      return out.join('\n');
    }

    // Default: 'table'
    var out = [];
    out.push('      <div class="exam-criteria-wrap' + bgCls + padCls + borderCls + '">');
    out.push('        <div' + titleClsAttr + '>' + TestCreatorService.formatRichText(label) + ' <span class="scale-title-sub">(' + rawCriteria.length + ' criteria)</span></div>');
    out.push('        <table class="criteria-table">');
    out.push('          <thead><tr>');
    out.push('            <th>Assessment Criterion</th>');
    if (showDesc) out.push('            <th>Performance Descriptors &amp; Evaluation Notes</th>');
    out.push('            <th class="col-crit-max">Max</th>');
    out.push('            <th class="col-crit-score">Score</th>');
    out.push('            <th class="col-crit-comments">Feedback &amp; Comments</th>');
    out.push('          </tr></thead>');
    out.push('          <tbody>');
    rawCriteria.forEach(function (crit) {
      var cTitle = crit.title || crit.name || 'Criterion';
      var cMax = crit.maxPoints || (Array.isArray(crit.grades) ? crit.grades[0] : 6) || 4;
      var cDesc = crit.description || crit.desc || crit.domain || (Array.isArray(crit.grades) ? 'Scale levels: ' + crit.grades.join(', ') : 'Graded according to mastery rubric.');
      out.push('            <tr>');
      out.push('              <td><strong>' + escapeHtml(cTitle) + '</strong></td>');
      if (showDesc) {
        out.push('              <td class="crit-desc-cell">' + escapeHtml(cDesc) + '</td>');
      }
      out.push('              <td class="col-crit-max">/' + escapeHtml(String(cMax)) + '</td>');
      out.push('              <td class="col-crit-score"></td>');
      out.push('              <td class="col-crit-comments"></td>');
      out.push('            </tr>');
    });
    out.push('          </tbody>');
    out.push('        </table>');
    out.push('      </div>');
    return out.join('\n');
  };

  TestCreatorService.renderGradingScaleHtml = function (test, options) {
    if (!test) return '';
    var opts = options || {};
    var totalPts = (opts.totalPoints !== undefined) ? opts.totalPoints : TestCreatorService.calculateTotalTestPoints(test);
    var scaleModel = test.scaleModel || null;
    var scaleModelId = test.scaleModelId || 'pts_20';
    var hc = TestCreatorService.ensureHeaderConfig(test);
    var label = opts.title || opts.label || hc.gradingScaleLabel || 'Grading Scale & Score Conversion:';
    var displayMode = opts.displayMode || (hc.gradingScaleStyle && hc.gradingScaleStyle.displayMode) || 'table';
    var tableData = TestCreatorService.calculateGradeConversionTable(scaleModel || scaleModelId, totalPts);

    var gSt = hc.gradingScaleStyle || {};
    var titleClasses = ['exam-grading-scale-title'];
    if (gSt.bold) titleClasses.push('title-bold');
    if (gSt.italic) titleClasses.push('title-italic');
    if (gSt.underline) titleClasses.push('title-underline');
    var titleClsAttr = ' class="' + titleClasses.join(' ') + '"';

    var bgCls = ' scale-bg-' + (opts.background || gSt.background || (displayMode === 'inline_grades' ? 'amber' : 'default'));
    var padCls = ' scale-pad-' + (opts.padding || gSt.padding || 'standard');
    var borderCls = ' scale-border-' + (opts.border || gSt.border || 'solid');

    if (displayMode === 'inline_grades') {
      var inlineItems = TestCreatorService.buildInlineGradeItems(tableData, totalPts, true);
      var out = [];
      out.push('      <div class="exam-grading-scale-wrap exam-grading-scale-inline' + bgCls + padCls + borderCls + '">');
      out.push('        <div' + titleClsAttr + '>' + TestCreatorService.formatRichText(label) + ' <span class="scale-title-sub">(' + escapeHtml(tableData.scaleName || scaleModelId) + ' — Total ' + totalPts + ' pts)</span></div>');
      out.push('        <div class="grading-scale-inline-row">');
      out.push('          ' + (inlineItems.length ? inlineItems.join('<span class="grading-scale-inline-sep"> · </span>') : escapeHtml(tableData.scaleName || scaleModelId)));
      out.push('        </div>');
      out.push('      </div>');
      return out.join('\n');
    }

    var out = [];
    out.push('      <div class="exam-grading-scale-wrap' + bgCls + padCls + borderCls + '">');
    out.push('        <div' + titleClsAttr + '>' + TestCreatorService.formatRichText(label) + ' <span class="scale-title-sub">(' + escapeHtml(tableData.scaleName || scaleModelId) + ' — Total ' + totalPts + ' pts)</span></div>');
    out.push('        <table class="grading-scale-table">');
    out.push('          <thead><tr>');
    out.push('            <th class="col-scale-grade">Grade / Mark</th>');
    out.push('            <th class="col-scale-threshold">Threshold</th>');
    out.push('            <th class="col-scale-points">Required Score</th>');
    out.push('            <th class="col-scale-notes">Evaluation / Notes</th>');
    out.push('          </tr></thead>');
    out.push('          <tbody>');
    if (tableData.rows && tableData.rows.length) {
      tableData.rows.forEach(function (row) {
        var colorBorder = row.color ? ' style="border-left: 4px solid ' + row.color + ';"' : '';
        out.push('            <tr>');
        out.push('              <td class="scale-grade-cell"' + colorBorder + '><strong>' + escapeHtml(row.grade) + '</strong></td>');
        out.push('              <td>' + escapeHtml(row.thresholdStr) + '</td>');
        out.push('              <td><strong>' + escapeHtml(row.pointsStr) + '</strong></td>');
        out.push('              <td class="scale-desc-cell">' + escapeHtml(row.desc || '') + '</td>');
        out.push('            </tr>');
      });
    } else {
      out.push('            <tr><td colspan="4" class="scale-empty-cell">Standard scale: ' + escapeHtml(tableData.scaleName || scaleModelId) + '</td></tr>');
    }
    out.push('          </tbody>');
    out.push('        </table>');
    out.push('      </div>');
    return out.join('\n');
  };

  TestCreatorService.renderExerciseHtml = function (ex, index, isTeacherKey, options) {
    if (!ex) return '';
    var opts = options || {};
    var testContext = opts.test || null;
    var isSection = (ex.type === 'section_competences' || ex.type === 'section_criteria' || ex.type === 'section_grading_scale');
    var num = (opts.exerciseNumber !== undefined && opts.exerciseNumber > 0) ? opts.exerciseNumber : (index + 1);
    var html = [];
    var pageBreakClass = ex.forcePageBreak ? ' page-break-before' : '';
    var exOpts = TestCreatorService.ensureExerciseOptions(ex);

    if (ex.type === 'section_competences') {
      var cOpts = Object.assign({}, ex.options || {});
      var tObj = testContext || { linkedCompetences: ex.linkedCompetences || [], exercises: [] };
      var compHtml = TestCreatorService.renderCompetencesHtml(tObj, {
        title: ex.title || 'Competences & Curriculum Objectives',
        displayMode: cOpts.displayMode || 'table',
        showDescriptions: cOpts.showDescriptions !== false,
        background: cOpts.background || 'default',
        border: cOpts.border || 'solid',
        padding: cOpts.padding || 'standard'
      });
      return '<div class="exercise-card section-block-card' + pageBreakClass + '" id="ex-' + ex.id + '">' +
        (compHtml || '<div class="exam-competences-wrap"><div class="exam-competences-title">' + TestCreatorService.formatRichText(ex.title || 'Competences & Curriculum Objectives') + '</div></div>') +
        '</div>';
    }

    if (ex.type === 'section_criteria') {
      var crOpts = Object.assign({}, ex.options || {});
      var tObj = testContext || { criteria: ex.criteria || [], exercises: [] };
      var critHtml = TestCreatorService.renderCriteriaHtml(tObj, {
        title: ex.title || 'Assessment Criteria & Evaluation Rubric',
        displayMode: crOpts.displayMode || 'table',
        showDescriptions: crOpts.showDescriptions !== false,
        background: crOpts.background || 'default',
        border: crOpts.border || 'solid',
        padding: crOpts.padding || 'standard'
      });
      return '<div class="exercise-card section-block-card' + pageBreakClass + '" id="ex-' + ex.id + '">' +
        (critHtml || '<div class="exam-criteria-wrap"><div class="exam-criteria-title">' + TestCreatorService.formatRichText(ex.title || 'Assessment Criteria') + '</div></div>') +
        '</div>';
    }

    if (ex.type === 'section_grading_scale') {
      var scOpts = Object.assign({}, ex.options || {});
      var tPts = (opts.totalPoints !== undefined) ? opts.totalPoints : (testContext ? TestCreatorService.calculateTotalTestPoints(testContext) : (ex.totalPoints || 20));
      var tObj = testContext || { scaleModel: ex.scaleModel || null, scaleModelId: ex.scaleModelId || 'pts_20' };
      var scaleHtml = TestCreatorService.renderGradingScaleHtml(tObj, {
        title: ex.title || 'Grading Scale & Score Conversion',
        displayMode: scOpts.displayMode || 'table',
        totalPoints: tPts,
        background: scOpts.background || 'default',
        border: scOpts.border || 'solid',
        padding: scOpts.padding || 'standard'
      });
      return '<div class="exercise-card section-block-card' + pageBreakClass + '" id="ex-' + ex.id + '">' +
        (scaleHtml || '<div class="exam-grading-scale-wrap"><div class="exam-grading-scale-title">' + TestCreatorService.formatRichText(ex.title || 'Grading Scale') + '</div></div>') +
        '</div>';
    }
    var html = [];
    var pageBreakClass = ex.forcePageBreak ? ' page-break-before' : '';
    var exOpts = TestCreatorService.ensureExerciseOptions(ex);

    var effectiveNumberedLines = false;
    if (ex.exportStyle && ex.exportStyle.numberedLines !== null && ex.exportStyle.numberedLines !== undefined) {
      effectiveNumberedLines = !!ex.exportStyle.numberedLines;
    } else if (opts.exportStyle && opts.exportStyle.numberedLines) {
      effectiveNumberedLines = !!opts.exportStyle.numberedLines;
    }

    var borderClass = '';
    if (ex.exportStyle && ex.exportStyle.cardBorderStyle && ex.exportStyle.cardBorderStyle !== 'academic') {
      borderClass = ' card-border-' + ex.exportStyle.cardBorderStyle;
    }
    var spacingClass = '';
    if (ex.exportStyle && ex.exportStyle.itemSpacing && ex.exportStyle.itemSpacing !== 'standard') {
      spacingClass = ' q-spacing-' + ex.exportStyle.itemSpacing;
    }

    function buildWritingLinesHtml(count, style, lineOpts) {
      var lineSt = style || (lineOpts && (lineOpts.lineStyle || lineOpts.lineType)) || 'solid';
      if (lineSt === 'box') {
        return '    <div class="writing-box"></div>';
      }
      if (lineSt === 'grid') {
        return '    <div class="writing-grid"></div>';
      }
      var lineType = (lineSt === 'dotted') ? 'dotted' : ((lineSt === 'dashed') ? 'dashed' : 'solid');
      var isDotted = (lineType === 'dotted');
      var isDashed = (lineType === 'dashed');

      var wrapClass = effectiveNumberedLines ? 'writing-lines numbered-lines' : 'writing-lines';
      if (isDotted) wrapClass += ' dotted-lines';
      else if (isDashed) wrapClass += ' dashed-lines';
      else wrapClass += ' solid-lines';

      var lHeightObj = lineOpts && lineOpts.lineHeight ? TestCreatorService.parseUnitValue(lineOpts.lineHeight, 'px') : null;
      var lThicknessObj = lineOpts && lineOpts.lineThickness ? TestCreatorService.parseUnitValue(lineOpts.lineThickness, 'px') : null;

      var styleRules = [];
      if (lHeightObj && lHeightObj.css) {
        styleRules.push('height:' + lHeightObj.css);
      }
      if (lThicknessObj && lThicknessObj.css) {
        styleRules.push('border-bottom-width:' + lThicknessObj.css);
      }

      var inlineStyleAttr = styleRules.length ? ' style="' + styleRules.join(';') + ';"' : '';
      var lineClass = 'writing-line' + (isDotted ? ' dotted' : (isDashed ? ' dashed' : ' solid'));

      var out = [];
      out.push('    <div class="' + wrapClass + '">');
      for (var i = 0; i < count; i++) {
        if (effectiveNumberedLines) {
          out.push('      <div class="writing-line-numbered"><div class="' + lineClass + '"' + inlineStyleAttr + '></div></div>');
        } else {
          out.push('      <div class="' + lineClass + '"' + inlineStyleAttr + '></div>');
        }
      }
      out.push('    </div>');
      return out.join('\n');
    }

    html.push('<div class="exercise-card' + pageBreakClass + borderClass + spacingClass + '" id="ex-' + ex.id + '">');
    html.push('  <div class="exercise-header">');
    html.push('    <span class="exercise-title">Exercise ' + num + ': ' + TestCreatorService.formatRichText(ex.title) + '</span>');
    html.push('    <span class="exercise-points">/' + (ex.points || 0) + ' pts</span>');
    html.push('  </div>');

    if (ex.instructions) {
      html.push('  <div class="exercise-instructions">' + TestCreatorService.formatRichText(ex.instructions) + '</div>');
    }

    switch (ex.type) {
      case 'cloze':
        TestCreatorService.normalizeExerciseItems(ex);
        var cItems = (ex.content && ex.content.items) || [];
        if (ex.content && ex.content.showWordBank) {
          var allBlanks = [];
          cItems.forEach(function (it) {
            allBlanks = allBlanks.concat(TestCreatorService.extractClozeBlanks(it.text));
          });
          if (exOpts.wordBankDistractors) {
            var dists = String(exOpts.wordBankDistractors).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            allBlanks = allBlanks.concat(dists);
          }
          var chips = (exOpts.wordBankOrder === 'alphabetical')
            ? allBlanks.slice().sort(function (a, b) { return a.localeCompare(b); })
            : shuffleArray(allBlanks);
          html.push('  <div class="word-bank-pool"><strong>Word Bank:</strong> ');
          chips.forEach(function (w) {
            html.push('    <span class="word-chip">' + TestCreatorService.formatRichText(w) + '</span>');
          });
          html.push('  </div>');
        }

        cItems.forEach(function (it, itIdx) {
          var raw = it.text || '';
          var blanks = [];
          var placeholderText = raw.replace(/\[([^\]]+)\]/g, function (match, word) {
            var bId = '___CLOZE_BLANK_' + blanks.length + '___';
            blanks.push(word);
            return bId;
          });
          var formattedSegment = TestCreatorService.formatRichText(placeholderText);
          var renderedText = formattedSegment.replace(/___CLOZE_BLANK_(\d+)___/g, function (_, bIdxStr) {
            var word = blanks[Number(bIdxStr)] || '';
            if (isTeacherKey) {
              return '<span class="cloze-blank teacher-key">' + escapeHtml(word) + '</span>';
            }
            var bClass = 'cloze-blank';
            var inner = '&nbsp;';
            if (exOpts.blankStyle === 'bracketed_box') {
              bClass += ' boxed';
              inner = '[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]';
            } else if (exOpts.blankStyle === 'length_dots') {
              bClass += ' dotted';
              inner = word.split('').map(function () { return '·'; }).join('&nbsp;');
            }
            if (exOpts.showFirstLetter && word.length > 1) {
              var hintLetter = escapeHtml(word.charAt(0));
              if (exOpts.blankStyle === 'length_dots') {
                inner = '<strong>' + hintLetter + '</strong>&nbsp;' + word.slice(1).split('').map(function () { return '·'; }).join('&nbsp;');
              } else {
                inner = '<strong>' + hintLetter + '</strong>_______';
              }
            }
            return '<span class="' + bClass + '">' + inner + '</span>';
          });
          var prefix = cItems.length > 1 ? '<strong>' + (itIdx + 1) + '.</strong> ' : '';
          html.push('  <div class="cloze-text">' + prefix + renderedText + '</div>');
        });
        break;

      case 'mcq':
        var questions = (ex.content && ex.content.questions) || [];
        if ((!questions || !questions.length) && ex.content && Array.isArray(ex.content.options) && ex.content.options.length > 0) {
          var optsList = ex.content.options.map(function (o) { return typeof o === 'string' ? o : (o.text || ''); });
          var corrects = [];
          ex.content.options.forEach(function (o, idx) {
            if (o && (o.isCorrect || o.correct)) corrects.push(idx);
          });
          if (corrects.length === 0 && ex.content.correctIndex !== undefined) corrects.push(ex.content.correctIndex);
          questions = [{
            prompt: ex.content.prompt || ex.prompt || 'Choose the correct answer:',
            options: optsList,
            correctIndices: corrects,
            points: ex.points || 1
          }];
        }
        var mcqLayoutClass = 'mcq-layout-' + (exOpts.layout || '2-columns');
        questions.forEach(function (q, qIdx) {
          html.push('  <div class="mcq-item">');
          html.push('    <div class="mcq-prompt">' + (qIdx + 1) + '. ' + TestCreatorService.formatRichText(q.prompt) + ' (' + (q.points || 1) + ' pt)</div>');
          html.push('    <div class="mcq-options ' + mcqLayoutClass + '">');
          var rawOpts = (q.options || []).map(function (optText, oIdx) {
            return {
              text: optText,
              origIdx: oIdx,
              isCorrect: (q.correctIndices || []).indexOf(oIdx) !== -1
            };
          });
          var displayOpts = rawOpts;
          if (exOpts.shuffleOptions && !isTeacherKey) {
            displayOpts = shuffleArray(rawOpts);
          }
          displayOpts.forEach(function (optItem, dIdx) {
            var cls = (isTeacherKey && optItem.isCorrect) ? 'mcq-option correct' : 'mcq-option';
            var markerHtml = '<span class="mcq-box"></span>';
            if (exOpts.markerStyle === 'letters') {
              markerHtml = '<strong class="mcq-marker-letter">' + String.fromCharCode(65 + dIdx) + '.</strong>';
            } else if (exOpts.markerStyle === 'numbers') {
              markerHtml = '<strong class="mcq-marker-letter">' + (dIdx + 1) + '.</strong>';
            } else if (exOpts.markerStyle === 'circle') {
              markerHtml = '<span class="mcq-circle"></span>';
            }
            html.push('      <div class="' + cls + '">' + markerHtml + ' ' + TestCreatorService.formatRichText(optItem.text) + '</div>');
          });
          html.push('    </div>');
          html.push('  </div>');
        });
        break;

      case 'open_question':
        TestCreatorService.normalizeExerciseItems(ex);
        var oItems = (ex.content && ex.content.items) || [];
        oItems.forEach(function (it, itIdx) {
          var prefix = oItems.length > 1 ? (itIdx + 1) + '. ' : '';
          var ptsLabel = it.points ? ' (' + it.points + ' pt' + (it.points === 1 ? '' : 's') + ')' : '';
          var guidance = it.lengthGuidance || exOpts.lengthGuidance;
          var guidanceLabel = guidance ? ' <span class="open-length-hint">(' + TestCreatorService.formatRichText(guidance) + ')</span>' : '';
          html.push('  <div class="open-question-item">');
          html.push('    <div class="open-prompt"><strong>' + prefix + '</strong>' + TestCreatorService.formatRichText(it.prompt || '') + guidanceLabel + ptsLabel + '</div>');
          var starter = it.answerPrefix || exOpts.answerPrefix;
          if (starter) {
            html.push('    <div class="open-starter-prefix"><em>Starter: ' + TestCreatorService.formatRichText(starter) + '</em></div>');
          }
          if (isTeacherKey && it.sampleAnswer) {
            html.push('    <div class="teacher-sample-answer">Sample Answer: ' + TestCreatorService.formatRichText(it.sampleAnswer) + '</div>');
          }
          var lCount = Number(it.lineCount) || 4;
          var lSt = it.lineStyle || exOpts.lineStyle || 'lines';
          html.push(buildWritingLinesHtml(lCount, lSt));
          html.push('  </div>');
        });
        break;

      case 'composition':
        TestCreatorService.normalizeExerciseItems(ex);
        var compItems = (ex.content && ex.content.items) || [];

        var draftTitle = TestCreatorService.formatRichText(exOpts.draftTitle || 'Draft & Rough Work (Not graded)');
        var draftNoteHtml = exOpts.draftNote ? '<div class="draft-note">' + TestCreatorService.formatRichText(exOpts.draftNote) + '</div>' : '';
        var draftStyle = exOpts.draftStyle || 'box';
        var draftLines = Number(exOpts.draftLines) || 6;
        var draftHeightObj = TestCreatorService.parseUnitValue(exOpts.draftHeight || 100, 'px');
        var draftHeightCss = draftHeightObj.css || '100px';

        function buildDraftBlockHtml() {
          if (!exOpts.showDraftBox) return '';
          var dOut = [];
          if (draftStyle === 'box') {
            dOut.push('    <div class="draft-work-box" style="min-height:' + draftHeightCss + ';"><div class="draft-title">' + draftTitle + '</div>' + draftNoteHtml + '</div>');
          } else if (draftStyle === 'lines' || draftStyle === 'dotted') {
            dOut.push('    <div class="draft-work-box draft-ruled"><div class="draft-title">' + draftTitle + '</div>' + draftNoteHtml);
            dOut.push(buildWritingLinesHtml(draftLines, draftStyle));
            dOut.push('    </div>');
          } else if (draftStyle === 'grid') {
            dOut.push('    <div class="draft-work-box draft-grid-box"><div class="draft-title">' + draftTitle + '</div>' + draftNoteHtml);
            dOut.push('      <div class="writing-grid" style="height:' + draftHeightCss + ';"></div>');
            dOut.push('    </div>');
          }
          return dOut.join('\n');
        }

        // Sub-component builders for dynamic reordering
        function renderCompGenre() {
          if (exOpts.showGenreBadge === false || !exOpts.textGenre) return '';
          return '  <div class="composition-genre-tag">Format / Genre: <strong>' + TestCreatorService.formatRichText(exOpts.textGenre) + '</strong></div>';
        }

        function renderCompPrompts() {
          if (exOpts.showPrompts === false) return '';
          var pOut = [];
          compItems.forEach(function (it, itIdx) {
            var taskHeader = compItems.length > 1 ? (it.label || ('Option ' + String.fromCharCode(65 + itIdx))) + ': ' : '';
            var wcStr = (exOpts.wordCountMin && exOpts.wordCountMax)
              ? (exOpts.wordCountMin + ' – ' + exOpts.wordCountMax + ' words')
              : ('~' + (it.targetWordCount || exOpts.wordCountMax || 150) + ' words');
            pOut.push('  <div class="composition-task-block">');
            pOut.push('    <div class="composition-prompt"><strong>' + TestCreatorService.formatRichText(taskHeader) + '</strong>' + TestCreatorService.formatRichText(it.prompt || '') + '</div>');
            pOut.push('    <div class="comp-wordcount-hint">Target word count: ' + wcStr + '</div>');
            pOut.push('  </div>');
          });
          return pOut.join('\n');
        }

        function renderCompDraft() {
          return buildDraftBlockHtml();
        }

        function renderCompLines() {
          if (exOpts.showWritingLines === false) return '';
          var lOut = [];
          compItems.forEach(function (it, itIdx) {
            if (compItems.length > 1) {
              var tLbl = it.label || ('Task ' + (itIdx + 1));
              lOut.push('  <div class="comp-task-lines-label">' + TestCreatorService.formatRichText(tLbl) + ' — Response Lines:</div>');
            }
            var cLines = Number(it.lineCount) || 14;
            var cStyle = it.lineStyle || exOpts.lineStyle || 'solid';
            var cHeight = it.lineHeight || exOpts.lineHeight || 28;
            var cThickness = it.lineThickness || exOpts.lineThickness || 1;
            lOut.push(buildWritingLinesHtml(cLines, cStyle, { lineHeight: cHeight, lineThickness: cThickness, lineType: cStyle }));
          });
          return lOut.join('\n');
        }

        function renderCompChecklist() {
          if (!exOpts.showChecklist) return '';
          var clTitle = TestCreatorService.formatRichText(exOpts.checklistTitle || 'Student Proofreading Checklist:');
          var clItems = (Array.isArray(exOpts.checklistItems) && exOpts.checklistItems.length)
            ? exOpts.checklistItems
            : ['Structure & Paragraphs', 'Spelling & Verb Tenses', 'Punctuation & Capitalization', 'Word Count Verified'];
          var clLayout = exOpts.checklistLayout || 'inline';
          var layoutCls = clLayout === 'columns' ? ' checklist-columns' : (clLayout === 'stacked' ? ' checklist-stacked' : ' checklist-inline');
          var bgCls = ' checklist-bg-' + (exOpts.checklistBg || 'amber');
          var padCls = ' checklist-pad-' + (exOpts.checklistPadding || 'standard');
          var borderCls = ' checklist-border-' + (exOpts.checklistBorder || 'solid');
          var cOut = [];
          cOut.push('  <div class="composition-checklist' + layoutCls + bgCls + padCls + borderCls + '"><div class="checklist-title">' + clTitle + '</div><div class="checklist-items">');
          clItems.forEach(function (cItem) {
            cOut.push('<span class="checklist-item"><span class="checklist-box">☐</span> ' + TestCreatorService.formatRichText(cItem) + '</span>');
          });
          cOut.push('</div></div>');
          return cOut.join('\n');
        }

        function renderCompRubric() {
          if (exOpts.showRubric === false || !Array.isArray(ex.markingRubric) || ex.markingRubric.length === 0) return '';
          var rOut = [];
          rOut.push('  <table class="rubric-table">');
          rOut.push('    <thead><tr><th>Assessment Criteria</th><th class="col-rubric-max">Max</th><th class="col-rubric-score">Score</th><th>Feedback</th></tr></thead>');
          rOut.push('    <tbody>');
          ex.markingRubric.forEach(function (r) {
            var rTitle = r.title || r.name || 'Criterion';
            var rDesc = (r.description || r.desc) ? '<div class="rubric-desc">' + escapeHtml(r.description || r.desc) + '</div>' : '';
            rOut.push('      <tr><td><strong>' + TestCreatorService.formatRichText(rTitle) + '</strong>' + rDesc + '</td><td>/' + (r.maxPoints || 0) + '</td><td></td><td></td></tr>');
          });
          rOut.push('    </tbody>');
          rOut.push('  </table>');
          return rOut.join('\n');
        }

        var compOrder = (Array.isArray(exOpts.componentOrder) && exOpts.componentOrder.length)
          ? exOpts.componentOrder
          : ['genreBadge', 'prompts', 'draftBox', 'writingLines', 'checklist', 'rubric'];

        compOrder.forEach(function (cmpKey) {
          var res = '';
          if (cmpKey === 'genreBadge') res = renderCompGenre();
          else if (cmpKey === 'prompts') res = renderCompPrompts();
          else if (cmpKey === 'draftBox') res = renderCompDraft();
          else if (cmpKey === 'writingLines') res = renderCompLines();
          else if (cmpKey === 'checklist') res = renderCompChecklist();
          else if (cmpKey === 'rubric') res = renderCompRubric();
          if (res) html.push(res);
        });
        break;

      case 'matching':
        var pairs = (ex.content && ex.content.pairs) || [];
        var lefts = pairs.map(function (pr) { return pr.left; });
        var rights = pairs.map(function (pr) { return pr.right; });
        if (exOpts.distractors) {
          var distArr = String(exOpts.distractors).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          rights = rights.concat(distArr);
        }
        var shuffledRights = shuffleArray(rights);
        var colA = TestCreatorService.formatRichText(exOpts.colALabel || 'Column A');
        var colB = TestCreatorService.formatRichText(exOpts.colBLabel || 'Column B');

        html.push('  <div class="matching-container">');
        html.push('    <div><strong>' + colA + '</strong>');
        lefts.forEach(function (l, idx) {
          var matchingLetter = '';
          if (isTeacherKey) {
            var correctRight = pairs[idx].right;
            var letterIdx = shuffledRights.indexOf(correctRight);
            matchingLetter = (letterIdx !== -1) ? String.fromCharCode(65 + letterIdx) : '';
          }
          var rightIndicator = (exOpts.presentation === 'connecting_lines')
            ? '<span class="matching-dot-right">●</span>'
            : '<span class="matching-box">' + matchingLetter + '</span>';
          html.push('      <div class="matching-row"><span>' + (idx + 1) + '. ' + TestCreatorService.formatRichText(l) + '</span>' + rightIndicator + '</div>');
        });
        html.push('    </div>');

        html.push('    <div><strong>' + colB + '</strong>');
        shuffledRights.forEach(function (r, idx) {
          var letter = String.fromCharCode(65 + idx);
          var leftIndicator = (exOpts.presentation === 'connecting_lines') ? '<span class="matching-dot-left">●</span> ' : '';
          html.push('      <div class="matching-row"><span>' + leftIndicator + '<strong>' + letter + '.</strong> ' + TestCreatorService.formatRichText(r) + '</span></div>');
        });
        html.push('    </div>');
        html.push('  </div>');

        if (exOpts.presentation === 'table') {
          html.push('  <table class="table-exercise matching-response-table">');
          html.push('    <thead><tr>' + lefts.map(function (_, i) { return '<th>' + (i + 1) + '</th>'; }).join('') + '</tr></thead>');
          html.push('    <tbody><tr>' + lefts.map(function (_, i) {
            var solLetter = '';
            if (isTeacherKey) {
              var cR = pairs[i].right;
              var lI = shuffledRights.indexOf(cR);
              solLetter = (lI !== -1) ? String.fromCharCode(65 + lI) : '';
            }
            return '<td>' + (isTeacherKey ? '<span class="teacher-key">' + solLetter + '</span>' : '&nbsp;') + '</td>';
          }).join('') + '</tr></tbody>');
          html.push('  </table>');
        }
        break;

      case 'transformation':
      case 'sentence_transformation':
        var transItems = (ex.content && ex.content.items) || [];
        if ((!transItems || !transItems.length) && ex.content && (ex.content.leadIn || ex.content.original)) {
          transItems = [{
            original: ex.content.leadIn || ex.content.original || '',
            keyword: ex.content.keyword || 'REWRITE',
            targetPrefix: ex.content.startOfSentence || ex.content.targetPrefix || '',
            targetSuffix: ex.content.targetSuffix || '',
            solution: ex.expectedAnswer || ex.content.solution || ''
          }];
        }
        if (exOpts.wordConstraint) {
          html.push('  <div class="trans-constraint"><em>' + TestCreatorService.formatRichText(exOpts.wordConstraint) + '</em></div>');
        }
        if (exOpts.allowContractionsNote) {
          html.push('  <div class="trans-note">*(Contractions count as two words)*</div>');
        }
        transItems.forEach(function (item, idx) {
          html.push('  <div class="transformation-item">');
          html.push('    <div>' + (idx + 1) + '. ' + TestCreatorService.formatRichText(item.original) + '</div>');
          if (exOpts.keywordStyle === 'bracketed') {
            html.push('    <div class="trans-keyword-bracketed"><strong>[' + TestCreatorService.formatRichText(item.keyword || '') + ']</strong></div>');
          } else {
            html.push('    <div class="trans-keyword-block">' + TestCreatorService.formatRichText(item.keyword || '') + '</div>');
          }
          if (isTeacherKey && item.solution) {
            html.push('    <div class="trans-solution-line">' + TestCreatorService.formatRichText(item.targetPrefix || '') + ' <u>' + TestCreatorService.formatRichText(item.solution) + '</u> ' + TestCreatorService.formatRichText(item.targetSuffix || '') + '</div>');
          } else {
            html.push('    <div class="trans-blank-line">' + TestCreatorService.formatRichText(item.targetPrefix || '') + ' ___________________________________ ' + TestCreatorService.formatRichText(item.targetSuffix || '') + '</div>');
          }
          html.push('  </div>');
        });
        break;

      case 'translation':
        var trItems = (ex.content && ex.content.items) || [];
        if (exOpts.direction) {
          html.push('  <div class="translation-direction-badge">' + TestCreatorService.formatRichText(exOpts.direction) + '</div>');
        }
        trItems.forEach(function (item, idx) {
          html.push('  <div class="translation-item">');
          html.push('    <div>' + (idx + 1) + '. ' + TestCreatorService.formatRichText(item.sourceText) + '</div>');
          if (exOpts.showHints && item.hint) {
            html.push('    <div class="translation-hint"><em>Hint: ' + TestCreatorService.formatRichText(item.hint) + '</em></div>');
          }
          if (isTeacherKey && item.modelTranslation) {
            html.push('    <div class="translation-solution">&rarr; ' + TestCreatorService.formatRichText(item.modelTranslation) + '</div>');
          }
          var lines = Number(item.allocatedLines) || 2;
          html.push(buildWritingLinesHtml(lines, item.lineStyle || exOpts.lineStyle || 'lines'));
          html.push('  </div>');
        });
        break;

      case 'picture_description':
        TestCreatorService.normalizeExerciseItems(ex);
        var pItems = (ex.content && ex.content.items) || [];
        if (exOpts.targetVocab) {
          var vChips = String(exOpts.targetVocab).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          if (vChips.length) {
            html.push('  <div class="pic-vocab-pool"><strong>Target Vocabulary:</strong> ' + vChips.map(function (c) { return '<span class="word-chip">' + TestCreatorService.formatRichText(c) + '</span>'; }).join(' ') + '</div>');
          }
        }
        var imgMaxH = (exOpts.imageSize === 'small') ? '120px' : (exOpts.imageSize === 'large' ? '250px' : '180px');
        var isSideBySide = (exOpts.layout === 'side_by_side');
        pItems.forEach(function (it, itIdx) {
          var figLabel = exOpts.figureLabel ? (TestCreatorService.formatRichText(exOpts.figureLabel) + (pItems.length > 1 ? ' (' + (itIdx + 1) + ')' : '') + ': ') : '';
          var ptsLabel = it.points ? ' (' + it.points + ' pt' + (it.points === 1 ? '' : 's') + ')' : '';
          var itemWrapClass = isSideBySide ? 'pic-desc-item side-by-side' : 'pic-desc-item stacked';
          var imgSizeCls = ' pic-img-' + (exOpts.imageSize || 'medium');
          html.push('  <div class="' + itemWrapClass + '">');
          if (isSideBySide) {
            html.push('    <div class="pic-side-layout">');
            if (it.imagePath) {
              html.push('      <div class="pic-media-col">');
              html.push('        <img src="' + escapeHtml(it.imagePath) + '" class="pic-prompt-img' + imgSizeCls + '" alt="Prompt Image" />');
              if (it.imageCaption) {
                html.push('        <div class="pic-caption">' + figLabel + TestCreatorService.formatRichText(it.imageCaption) + '</div>');
              }
              html.push('      </div>');
            }
            html.push('      <div class="pic-content-col">');
            html.push('        <div class="pic-prompt-row"><strong>' + figLabel + '</strong>' + TestCreatorService.formatRichText(it.prompt || '') + ptsLabel + '</div>');
            if (isTeacherKey && it.modelAnswer) {
              html.push('        <div class="pic-sample-answer">Sample Answer: ' + TestCreatorService.formatRichText(it.modelAnswer) + '</div>');
            }
            var pLines = Number(it.lineCount) || 6;
            html.push(buildWritingLinesHtml(pLines, it.lineStyle || 'lines'));
            html.push('      </div>');
            html.push('    </div>');
          } else {
            // Stacked
            if (it.imagePath) {
              html.push('    <div class="pic-stacked-media">');
              html.push('      <img src="' + escapeHtml(it.imagePath) + '" class="pic-prompt-img' + imgSizeCls + '" alt="Prompt Image" />');
              if (it.imageCaption) {
                html.push('      <div class="pic-caption">' + figLabel + TestCreatorService.formatRichText(it.imageCaption) + '</div>');
              }
              html.push('    </div>');
            }
            html.push('    <div class="pic-prompt-row"><strong>' + figLabel + '</strong>' + TestCreatorService.formatRichText(it.prompt || '') + ptsLabel + '</div>');
            if (isTeacherKey && it.modelAnswer) {
              html.push('    <div class="pic-sample-answer">Sample Answer: ' + TestCreatorService.formatRichText(it.modelAnswer) + '</div>');
            }
            var pLines = Number(it.lineCount) || 6;
            html.push(buildWritingLinesHtml(pLines, it.lineStyle || 'lines'));
          }
          html.push('  </div>');
        });
        break;

      case 'table_completion':
        var headers = (ex.content && ex.content.headers) || [];
        var rows = (ex.content && ex.content.rows) || [];
        if (exOpts.showWordBank) {
          var blankCells = [];
          rows.forEach(function (r) {
            (r || []).forEach(function (cell) {
              if (cell && cell.isBlank && cell.text) blankCells.push(cell.text);
            });
          });
          if (blankCells.length) {
            html.push('  <div class="word-bank-pool"><strong>Word Bank:</strong> ' + shuffleArray(blankCells).map(function (w) { return '<span class="word-chip">' + TestCreatorService.formatRichText(w) + '</span>'; }).join(' ') + '</div>');
          }
        }
        var tblClass = 'table-exercise';
        if (exOpts.tableStyle === 'zebra') tblClass += ' table-zebra';
        else if (exOpts.tableStyle === 'scientific') tblClass += ' table-scientific';
        var cellAlignClass = (exOpts.textAlign === 'center') ? 'cell-center' : ((exOpts.textAlign === 'right') ? 'cell-right' : 'cell-left');

        html.push('  <table class="' + tblClass + '">');
        if (headers.length) {
          html.push('    <thead><tr>');
          headers.forEach(function (h) {
            html.push('      <th class="' + cellAlignClass + '">' + TestCreatorService.formatRichText(h) + '</th>');
          });
          html.push('    </tr></thead>');
        }
        html.push('    <tbody>');
        rows.forEach(function (r) {
          html.push('      <tr>');
          (r || []).forEach(function (cell) {
            if (cell && cell.isBlank) {
              var cellVal = isTeacherKey ? '<span class="table-blank-cell teacher-key">' + TestCreatorService.formatRichText(cell.text) + '</span>' : '&nbsp;';
              html.push('        <td class="' + cellAlignClass + '">' + cellVal + '</td>');
            } else {
              html.push('        <td class="' + cellAlignClass + '">' + TestCreatorService.formatRichText(cell ? cell.text : '') + '</td>');
            }
          });
          html.push('      </tr>');
        });
        html.push('    </tbody>');
        html.push('  </table>');
        break;

      case 'odd_one_out':
        var oddItems = (ex.content && ex.content.items) || [];
        var isCircleOnly = (exOpts.taskMode === 'circle_only');
        var isCrossOut = (exOpts.taskMode === 'cross_out');
        var isPill = (exOpts.displayStyle !== 'plain_separated');

        oddItems.forEach(function (item, idx) {
          html.push('  <div class="odd-item-block">');
          var renderedWords = (item.words || []).map(function (w) {
            var isIntruder = (item.intruder || '').trim().toLowerCase() === w.trim().toLowerCase();
            if (isTeacherKey && isIntruder) {
              return isPill
                ? '<span class="odd-pill correct">' + TestCreatorService.formatRichText(w) + '</span>'
                : '<span class="odd-plain-key">' + TestCreatorService.formatRichText(w) + '</span>';
            }
            return isPill ? '<span class="odd-pill">' + TestCreatorService.formatRichText(w) + '</span>' : TestCreatorService.formatRichText(w);
          });
          var sep = isPill ? ' ' : ' &nbsp;|&nbsp; ';
          html.push('    <div><strong>' + (idx + 1) + '.</strong> ' + renderedWords.join(sep) + '</div>');
          if (isTeacherKey && item.justificationKey && !isCircleOnly) {
            html.push('    <div class="odd-justification-key">&rarr; <strong>Justification:</strong> ' + TestCreatorService.formatRichText(item.justificationKey) + '</div>');
          }
          if (isCrossOut) {
            html.push('    <div class="odd-task-mode-hint">(Cross out the intruder with an X)</div>');
          } else if (isCircleOnly) {
            html.push('    <div class="odd-task-mode-hint">(Circle the word that does not belong)</div>');
          } else {
            html.push('    <div class="odd-intruder-response-row">');
            html.push('      <span class="odd-intruder-label">Intruder:</span> <span class="odd-intruder-line"></span>');
            html.push('      <span class="odd-why-label">Why?</span> <span class="odd-why-line"></span>');
            html.push('    </div>');
          }
          html.push('  </div>');
        });
        break;

      case 'reading_comprehension':
        var rcTitle = (ex.content && ex.content.passageTitle) || '';
        var rcPassage = (ex.content && ex.content.passageText) || '';
        var subQuestions = (ex.content && ex.content.subQuestions) || [];
        var passageWrapClass = (exOpts.passageLayout === 'two_columns') ? 'passage-box passage-2col' : 'passage-box';

        html.push('  <div class="' + passageWrapClass + ' reading-passage-box">');
        if (rcTitle) {
          html.push('    <div class="reading-passage-title">' + TestCreatorService.formatRichText(rcTitle) + '</div>');
        }
        if (effectiveNumberedLines && rcPassage) {
          var pLines = rcPassage.split('\n');
          var numberedPassage = pLines.map(function (ln, lIdx) {
            return '<div class="passage-line-numbered"><span class="passage-line-num">' + (lIdx + 1) + '</span><span class="passage-line-text">' + (TestCreatorService.formatRichText(ln) || '&nbsp;') + '</span></div>';
          }).join('');
          html.push('    <div>' + numberedPassage + '</div>');
        } else {
          html.push('    <div>' + TestCreatorService.formatRichText(rcPassage).replace(/\n/g, '<br>') + '</div>');
        }
        if (exOpts.vocabularyFootnotes) {
          html.push('    <div class="passage-footnotes"><strong>Glossary:</strong> ' + TestCreatorService.formatRichText(exOpts.vocabularyFootnotes).replace(/\n/g, '<br>') + '</div>');
        }
        html.push('  </div>');

        subQuestions.forEach(function (sq, sIdx) {
          var sqPts = (sq.points || 1);
          var sqLines = Number(sq.lineCount) || Number(exOpts.defaultLineCount) || 1;
          var sqGuidance = sq.lengthGuidance ? ' <span class="open-length-hint">(' + TestCreatorService.formatRichText(sq.lengthGuidance) + ')</span>' : '';
          html.push('  <div class="rc-subquestion-block">');
          html.push('    <div><strong>' + (sIdx + 1) + '.</strong> ' + TestCreatorService.formatRichText(sq.prompt) + sqGuidance + ' (' + sqPts + ' pt' + (sqPts === 1 ? '' : 's') + ')</div>');
          if (sq.answerPrefix) {
            html.push('    <div class="open-starter-prefix"><em>Starter: ' + TestCreatorService.formatRichText(sq.answerPrefix) + '</em></div>');
          }
          if (sq.answerType === 'true_false_justify') {
            var tfKey = (isTeacherKey && sq.solution) ? (' &nbsp; (Key: ' + TestCreatorService.formatRichText(sq.solution) + ')') : '';
            html.push('    <div class="rc-tf-choice-row">[ &nbsp; ] True &nbsp;&nbsp;&nbsp; [ &nbsp; ] False' + tfKey + '</div>');
            html.push('    <div class="rc-quote-prompt">Quote line from text to justify:</div>');
            html.push(buildWritingLinesHtml(sqLines, 'lines'));
          } else {
            if (isTeacherKey && sq.solution) {
              html.push('    <div class="rc-answer-solution">&rarr; Answer: ' + TestCreatorService.formatRichText(sq.solution) + '</div>');
            }
            html.push(buildWritingLinesHtml(sqLines, sq.lineStyle || 'lines'));
          }
          html.push('  </div>');
        });
        break;
    }

    html.push('</div>');
    return html.join('\n');
  };

  TestCreatorService.exportToHtml = function (test, options) {
    var opts = options || {};
    var isTeacherKey = !!opts.isTeacherKey;
    var variant = opts.variant || test.variant || 'A';
    var themeName = opts.stylesheetTheme || (test && test.exportStyle && (test.exportStyle.theme || test.exportStyle.stylesheetTheme)) || (test && test.stylesheetTheme) || 'academic';
    var studentName = opts.studentName || '';
    var className = opts.className || test.className || '';
    var totalPts = TestCreatorService.calculateTotalTestPoints(test);

    var globalStyle = Object.assign(
      JSON.parse(JSON.stringify(TestCreatorService.DEFAULT_EXPORT_STYLE)),
      (test && test.exportStyle) || {},
      opts.exportStyle || {}
    );

    var customCssRules = [];

    // Page margins for PDF & Print
    var margins = (globalStyle && globalStyle.margins) || { top: 15, right: 15, bottom: 15, left: 15, unit: 'mm' };
    var mUnit = margins.unit || 'mm';
    var mTop = ((margins.top !== undefined && margins.top !== null) ? margins.top : 15) + mUnit;
    var mRight = ((margins.right !== undefined && margins.right !== null) ? margins.right : 15) + mUnit;
    var mBottom = ((margins.bottom !== undefined && margins.bottom !== null) ? margins.bottom : 15) + mUnit;
    var mLeft = ((margins.left !== undefined && margins.left !== null) ? margins.left : 15) + mUnit;

    customCssRules.push('@page { size: A4 portrait; margin: ' + mTop + ' ' + mRight + ' ' + mBottom + ' ' + mLeft + '; }');
    customCssRules.push('@media print { body { margin: 0 !important; padding: 0 !important; } .exam-sheet { padding: 0 !important; max-width: 100% !important; margin: 0 !important; width: 100% !important; } }');
    customCssRules.push('.exam-sheet { padding: ' + mTop + ' ' + mRight + ' ' + mBottom + ' ' + mLeft + '; box-sizing: border-box; }');
    customCssRules.push('.exam-header { break-after: avoid !important; page-break-after: avoid !important; }');
    customCssRules.push('.exercise-header { break-after: avoid !important; page-break-after: avoid !important; }');
    customCssRules.push('.exercise-instructions { break-after: avoid !important; page-break-after: avoid !important; }');
    customCssRules.push('.exercise-card { break-inside: auto; page-break-inside: auto; }');
    customCssRules.push('.exercise-card:first-of-type:not(.page-break-before) { break-before: avoid !important; page-break-before: avoid !important; }');
    customCssRules.push('.mcq-item, .matching-row, .table-exercise tr, .rubric-table tr, .cloze-text, .writing-box, .writing-grid { break-inside: avoid; page-break-inside: avoid; }');

    if (globalStyle.fontSize) {
      customCssRules.push('.exam-sheet { font-size: ' + globalStyle.fontSize + '; }');
    }
    if (globalStyle.lineHeight) {
      customCssRules.push('.exam-sheet, .cloze-text, .composition-prompt { line-height: ' + globalStyle.lineHeight + '; }');
    }
    if (globalStyle.padding) {
      customCssRules.push('.exercise-card { padding: ' + globalStyle.padding + '; }');
    }

    // Per-exercise style overrides
    (test.exercises || []).forEach(function (ex) {
      if (!ex || !ex.id) return;
      var es = ex.exportStyle;
      if (!es) return;
      var exRules = [];
      if (es.fontSize) exRules.push('font-size: ' + es.fontSize + ' !important;');
      if (es.lineHeight) exRules.push('line-height: ' + es.lineHeight + ' !important;');
      if (es.padding) exRules.push('padding: ' + es.padding + ' !important;');
      if (exRules.length > 0) {
        customCssRules.push('#ex-' + ex.id + ' { ' + exRules.join(' ') + ' }');
      }

      if (es.titleStyle) {
        var tRules = [];
        if (es.titleStyle.bold !== undefined) tRules.push('font-weight: ' + (es.titleStyle.bold ? '900' : 'normal') + ' !important;');
        if (es.titleStyle.italic !== undefined) tRules.push('font-style: ' + (es.titleStyle.italic ? 'italic' : 'normal') + ' !important;');
        if (es.titleStyle.underline !== undefined) tRules.push('text-decoration: ' + (es.titleStyle.underline ? 'underline' : 'none') + ' !important;');
        if (es.titleStyle.uppercase !== undefined) tRules.push('text-transform: ' + (es.titleStyle.uppercase ? 'uppercase' : 'none') + ' !important;');
        if (es.titleStyle.size) tRules.push('font-size: ' + es.titleStyle.size + ' !important;');
        if (es.titleStyle.align) tRules.push('text-align: ' + es.titleStyle.align + ' !important;');
        if (tRules.length) customCssRules.push('#ex-' + ex.id + ' .exercise-title { ' + tRules.join(' ') + ' }');
      }
      if (es.instructionsStyle) {
        var iRules = [];
        if (es.instructionsStyle.bold !== undefined) iRules.push('font-weight: ' + (es.instructionsStyle.bold ? 'bold' : 'normal') + ' !important;');
        if (es.instructionsStyle.italic !== undefined) iRules.push('font-style: ' + (es.instructionsStyle.italic ? 'italic' : 'normal') + ' !important;');
        if (es.instructionsStyle.underline !== undefined) iRules.push('text-decoration: ' + (es.instructionsStyle.underline ? 'underline' : 'none') + ' !important;');
        if (es.instructionsStyle.size) iRules.push('font-size: ' + es.instructionsStyle.size + ' !important;');
        if (es.instructionsStyle.align) iRules.push('text-align: ' + es.instructionsStyle.align + ' !important;');
        if (iRules.length) customCssRules.push('#ex-' + ex.id + ' .exercise-instructions { ' + iRules.join(' ') + ' }');
      }
      if (es.promptStyle) {
        var pRules = [];
        if (es.promptStyle.bold !== undefined) pRules.push('font-weight: ' + (es.promptStyle.bold ? 'bold' : 'normal') + ' !important;');
        if (es.promptStyle.size) pRules.push('font-size: ' + es.promptStyle.size + ' !important;');
        if (pRules.length) customCssRules.push('#ex-' + ex.id + ' .mcq-prompt, #ex-' + ex.id + ' .open-prompt, #ex-' + ex.id + ' .composition-prompt { ' + pRules.join(' ') + ' }');
      }
    });

    var html = [];
    html.push('<!DOCTYPE html>');
    html.push('<html lang="en">');
    html.push('<head>');
    html.push('  <meta charset="UTF-8">');
    html.push('  <title>' + escapeHtml(test.title || 'Test') + (isTeacherKey ? ' (Teacher Solution Key)' : '') + '</title>');
    html.push('  <style>');
    html.push(TestCreatorService.getThemeCss(themeName));
    if (customCssRules.length > 0) {
      html.push('/* Custom Export Styling */');
      html.push(customCssRules.join('\n'));
    }
    html.push('  </style>');
    html.push('</head>');
    html.push('<body>');
    html.push('  <div class="exam-sheet">');

    // Header section
    html.push(TestCreatorService.renderHeaderHtml(test, isTeacherKey, variant, studentName, className, totalPts));

    // Exercises
    var exNum = 1;
    (test.exercises || []).forEach(function (ex, idx) {
      var isSec = (ex.type === 'section_competences' || ex.type === 'section_criteria' || ex.type === 'section_grading_scale');
      var currentExNum = isSec ? 0 : exNum++;
      html.push(TestCreatorService.renderExerciseHtml(ex, idx, isTeacherKey, {
        exportStyle: globalStyle,
        test: test,
        totalPoints: totalPts,
        exerciseNumber: currentExNum
      }));
    });

    html.push('  </div>');
    html.push('</body>');
    html.push('</html>');

    return html.join('\n');
  };

  TestCreatorService.exportToMarkdown = function (test, options) {
    var opts = options || {};
    var isTeacherKey = !!opts.isTeacherKey;
    var variant = opts.variant || test.variant || 'A';
    var totalPts = TestCreatorService.calculateTotalTestPoints(test);
    var hc = TestCreatorService.ensureHeaderConfig(test);

    var md = [];
    var titleLine = '# ' + (test.title || 'Exam') + (isTeacherKey ? ' — [TEACHER SOLUTION KEY]' : '');
    if (hc.showVariantBadge) {
      titleLine += ' (Group ' + variant + ')';
    }
    md.push(titleLine);
    if (hc.showSubtitle && hc.subtitleText) {
      md.push('### ' + hc.subtitleText);
    }
    md.push('');

    var metaBits = [];
    if (hc.showClass) metaBits.push('**' + (hc.classLabel || 'Class:') + '** ' + (test.className || '______'));
    if (hc.showDate) metaBits.push('**' + (hc.dateLabel || 'Date:') + '** ' + (test.date || '______'));
    if (hc.showTeacher) metaBits.push('**' + (hc.teacherLabel || 'Teacher:') + '** ' + (test.teacher || '______'));
    if (hc.showDuration) metaBits.push('**' + (hc.durationLabel || 'Duration:') + '** ' + (test.durationMinutes || 45) + ' min');
    if (hc.showTotalPoints) metaBits.push('**' + (hc.pointsLabel || 'Total:') + '** ' + totalPts + ' pts');
    if (metaBits.length > 0) {
      md.push('> ' + metaBits.join(' | '));
    }
    if (hc.showMaterials && test.materialsAllowed && test.materialsAllowed.length) {
      md.push('> **' + (hc.materialsLabel || 'Materials Allowed:') + '** ' + test.materialsAllowed.join(', '));
    }
    if (hc.showScope && test.scope) {
      md.push('> **' + (hc.scopeLabel || 'Scope / Topic:') + '** ' + test.scope);
    }
    if (hc.showInstructions && hc.instructionsText) {
      md.push('');
      md.push('> *Instructions:* ' + hc.instructionsText);
    }

    var hasScaleSection = (test.exercises || []).some(function (e) { return e && e.type === 'section_grading_scale'; });
    var hasCompSection = (test.exercises || []).some(function (e) { return e && e.type === 'section_competences'; });
    var hasCritSection = (test.exercises || []).some(function (e) { return e && e.type === 'section_criteria'; });

    if (hc.showGradingScale && !hasScaleSection) {
      var scMode = (hc.gradingScaleStyle && hc.gradingScaleStyle.displayMode) || 'table';
      if (scMode === 'inline') {
        var sName = (test.scaleModel && (test.scaleModel.label || test.scaleModel.name)) || test.scaleModelId || 'Standard Scale';
        md.push('> **' + (hc.gradingScaleLabel || 'Grading Scale:') + '** ' + sName);
      } else if (scMode === 'inline_grades') {
        var inlineStr = TestCreatorService.formatInlineGradesString(test, { totalPoints: totalPts, html: false });
        md.push('');
        md.push('**' + (hc.gradingScaleLabel || 'Grading Scale & Score Conversion:') + '** ' + inlineStr);
      } else {
        var tableData = TestCreatorService.calculateGradeConversionTable(test.scaleModel || test.scaleModelId, totalPts);
        md.push('');
        md.push('### ' + (hc.gradingScaleLabel || 'Grading Scale & Score Conversion'));
        md.push('| Grade / Mark | Threshold | Required Points | Assessment |');
        md.push('|---|---|---|---|');
        tableData.rows.forEach(function (r) {
          md.push('| **' + r.grade + '** | ' + r.thresholdStr + ' | **' + r.pointsStr + '** | ' + (r.desc || '') + ' |');
        });
      }
    }
    if (hc.showCompetences && !hasCompSection) {
      var rawComps = (Array.isArray(test.linkedCompetences) && test.linkedCompetences.length)
        ? test.linkedCompetences
        : (Array.isArray(test.linkedCompetenceIds) ? test.linkedCompetenceIds : []);
      if (rawComps.length) {
        md.push('');
        md.push('### ' + (hc.competencesLabel || 'Competences & Curriculum Objectives'));
        md.push('| Code / Ref | Competence & Objective | Description |');
        md.push('|---|---|---|');
        var sortedComps = rawComps.map(function (c) {
          var cCode = (c && (c.code || c.id)) || String(c || '');
          var cTitle = (c && (c.title || c.name)) || cCode;
          var cDesc = (c && (c.description || c.descriptors || c.desc)) || '';
          return { code: cCode, title: cTitle, description: cDesc };
        }).sort(function (a, b) {
          return (a.code || a.title).localeCompare(b.code || b.title, undefined, { numeric: true, sensitivity: 'base' });
        });
        sortedComps.forEach(function (c) {
          md.push('| **' + c.code + '** | ' + c.title + ' | ' + c.description + ' |');
        });
      }
    }
    if (hc.showCriteria && !hasCritSection) {
      var rawCrits = (Array.isArray(test.criteria) && test.criteria.length)
        ? test.criteria
        : ((Array.isArray(test.linkedCriteria) && test.linkedCriteria.length) ? test.linkedCriteria : []);
      if (rawCrits.length) {
        md.push('');
        md.push('### ' + (hc.criteriaLabel || 'Assessment Criteria & Rubric'));
        md.push('| Criterion | Performance Descriptors | Max Points | Score | Comments |');
        md.push('|---|---|---|---|---|');
        rawCrits.forEach(function (crit) {
          var crTitle = crit.title || crit.name || 'Criterion';
          var crDesc = crit.description || crit.desc || crit.domain || '';
          var crMax = crit.maxPoints || 6;
          md.push('| **' + crTitle + '** | ' + crDesc + ' | /' + crMax + ' | | |');
        });
      }
    }
    md.push('');
    md.push('---');
    md.push('');

    var exCounter = 1;
    (test.exercises || []).forEach(function (ex, idx) {
      var isSection = (ex.type === 'section_competences' || ex.type === 'section_criteria' || ex.type === 'section_grading_scale');
      var exOpts = TestCreatorService.ensureExerciseOptions(ex);

      if (!isSection) {
        var num = exCounter++;
        md.push('## Exercise ' + num + ': ' + (ex.title || 'Question') + ' (' + (ex.points || 0) + ' pts)');
        if (ex.instructions) md.push('*' + ex.instructions + '*\n');
      }

      switch (ex.type) {
        case 'section_competences':
          var secComps = (Array.isArray(test.linkedCompetences) && test.linkedCompetences.length)
            ? test.linkedCompetences
            : (Array.isArray(test.linkedCompetenceIds) ? test.linkedCompetenceIds : []);
          md.push('### ' + (ex.title || 'Competences & Curriculum Objectives'));
          if (secComps.length) {
            md.push('| Code / Ref | Competence & Objective | Description |');
            md.push('|---|---|---|');
            var sortedSecComps = secComps.map(function (c) {
              var cCode = (c && (c.code || c.id)) || String(c || '');
              var cTitle = (c && (c.title || c.name)) || cCode;
              var cDesc = (c && (c.description || c.descriptors || c.desc)) || '';
              return { code: cCode, title: cTitle, description: cDesc };
            }).sort(function (a, b) {
              return (a.code || a.title).localeCompare(b.code || b.title, undefined, { numeric: true, sensitivity: 'base' });
            });
            sortedSecComps.forEach(function (c) {
              md.push('| **' + c.code + '** | ' + c.title + ' | ' + c.description + ' |');
            });
          } else {
            md.push('*No competences linked to exam.*');
          }
          md.push('');
          break;

        case 'section_criteria':
          var secCrits = (Array.isArray(test.criteria) && test.criteria.length)
            ? test.criteria
            : ((Array.isArray(test.linkedCriteria) && test.linkedCriteria.length) ? test.linkedCriteria : []);
          md.push('### ' + (ex.title || 'Assessment Criteria & Evaluation Rubric'));
          if (secCrits.length) {
            md.push('| Criterion | Performance Descriptors | Max Points | Score | Comments |');
            md.push('|---|---|---|---|---|');
            secCrits.forEach(function (crit) {
              var crTitle = crit.title || crit.name || 'Criterion';
              var crDesc = crit.description || crit.desc || crit.domain || '';
              var crMax = crit.maxPoints || 6;
              md.push('| **' + crTitle + '** | ' + crDesc + ' | /' + crMax + ' | | |');
            });
          } else {
            md.push('*No criteria linked to exam.*');
          }
          md.push('');
          break;

        case 'section_grading_scale':
          var tableData = TestCreatorService.calculateGradeConversionTable(test.scaleModel || test.scaleModelId, totalPts);
          md.push('### ' + (ex.title || 'Grading Scale & Score Conversion'));
          md.push('| Grade / Mark | Threshold | Required Points | Assessment |');
          md.push('|---|---|---|---|');
          tableData.rows.forEach(function (r) {
            md.push('| **' + r.grade + '** | ' + r.thresholdStr + ' | **' + r.pointsStr + '** | ' + (r.desc || '') + ' |');
          });
          md.push('');
          break;
        case 'cloze':
          TestCreatorService.normalizeExerciseItems(ex);
          var cItems = (ex.content && ex.content.items) || [];
          if (ex.content && ex.content.showWordBank) {
            var allBlanks = [];
            cItems.forEach(function (it) {
              allBlanks = allBlanks.concat(TestCreatorService.extractClozeBlanks(it.text));
            });
            if (exOpts.wordBankDistractors) {
              var dists = String(exOpts.wordBankDistractors).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
              allBlanks = allBlanks.concat(dists);
            }
            var chips = (exOpts.wordBankOrder === 'alphabetical')
              ? allBlanks.slice().sort(function (a, b) { return a.localeCompare(b); })
              : shuffleArray(allBlanks);
            if (chips.length) {
              md.push('> **Word Bank:** ' + chips.join(' | '));
              md.push('');
            }
          }
          cItems.forEach(function (it, itIdx) {
            var prefix = cItems.length > 1 ? (itIdx + 1) + '. ' : '';
            var txt = it.text || '';
            if (isTeacherKey) {
              md.push(prefix + txt.replace(/\[([^\]]+)\]/g, '**[$1]**'));
            } else {
              md.push(prefix + txt.replace(/\[([^\]]+)\]/g, '_______'));
            }
            md.push('');
          });
          break;

        case 'mcq':
          var qs = (ex.content && ex.content.questions) || [];
          qs.forEach(function (q, qIdx) {
            md.push('**' + (qIdx + 1) + '. ' + q.prompt + '** (' + (q.points || 1) + ' pt)');
            (q.options || []).forEach(function (opt, oIdx) {
              var isCorrect = (q.correctIndices || []).indexOf(oIdx) !== -1;
              if (isTeacherKey && isCorrect) {
                md.push('- [x] **' + opt + '** *(Correct)*');
              } else {
                md.push('- [ ] ' + opt);
              }
            });
            md.push('');
          });
          break;

        case 'open_question':
          TestCreatorService.normalizeExerciseItems(ex);
          var oItems = (ex.content && ex.content.items) || [];
          oItems.forEach(function (it, itIdx) {
            var guidance = it.lengthGuidance || exOpts.lengthGuidance;
            var gStr = guidance ? ' *(' + guidance + ')*' : '';
            md.push('**' + (itIdx + 1) + '. ' + (it.prompt || 'Question') + '**' + gStr + ' (' + (it.points || 1) + ' pts)');
            var starter = it.answerPrefix || exOpts.answerPrefix;
            if (starter) {
              md.push('> *Starter: ' + starter + '*');
            }
            if (isTeacherKey && it.sampleAnswer) {
              md.push('> *Sample Answer:* ' + it.sampleAnswer);
            }
            md.push('');
          });
          break;

        case 'composition':
          TestCreatorService.normalizeExerciseItems(ex);
          var compItems = (ex.content && ex.content.items) || [];
          if (exOpts.showGenreBadge !== false && exOpts.textGenre) {
            md.push('*Format / Genre: ' + exOpts.textGenre + '*\n');
          }
          if (exOpts.showPrompts !== false) {
            compItems.forEach(function (it, itIdx) {
              var label = compItems.length > 1 ? (it.label || ('Task ' + (itIdx + 1))) + ': ' : '';
              md.push('**' + label + '** ' + (it.prompt || ''));
              md.push('*Target word count: ~' + (it.targetWordCount || 150) + ' words*');
              md.push('');
            });
          }
          if (exOpts.showDraftBox) {
            md.push('> **' + (exOpts.draftTitle || 'Draft & Rough Work (Not graded)') + '**');
            if (exOpts.draftNote) md.push('> *' + exOpts.draftNote + '*');
            md.push('');
          }
          if (exOpts.showChecklist) {
            md.push('**' + (exOpts.checklistTitle || 'Student Proofreading Checklist:') + '**');
            var cItems = (Array.isArray(exOpts.checklistItems) && exOpts.checklistItems.length)
              ? exOpts.checklistItems
              : ['Structure & Paragraphs', 'Spelling & Verb Tenses', 'Punctuation & Capitalization', 'Word Count Verified'];
            cItems.forEach(function (ci) {
              md.push('- [ ] ' + ci);
            });
            md.push('');
          }
          if (exOpts.showRubric !== false && Array.isArray(ex.markingRubric) && ex.markingRubric.length) {
            md.push('| Criteria | Max Points | Score |');
            md.push('|---|---|---|');
            ex.markingRubric.forEach(function (r) {
              md.push('| ' + r.title + ' | /' + (r.maxPoints || 0) + ' | |');
            });
            md.push('');
          }
          break;

        case 'picture_description':
          TestCreatorService.normalizeExerciseItems(ex);
          var pItems = (ex.content && ex.content.items) || [];
          if (exOpts.targetVocab) {
            var vChips = String(exOpts.targetVocab).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            if (vChips.length) {
              md.push('> **Target Vocabulary:** ' + vChips.join(', '));
              md.push('');
            }
          }
          pItems.forEach(function (it, itIdx) {
            md.push('**Picture ' + (itIdx + 1) + ':** ' + (it.prompt || ''));
            if (it.imageCaption) md.push('*' + it.imageCaption + '*');
            if (isTeacherKey && it.modelAnswer) {
              md.push('> *Sample Answer:* ' + it.modelAnswer);
            }
            md.push('');
          });
          break;

        case 'matching':
          var pairs = (ex.content && ex.content.pairs) || [];
          var lefts = pairs.map(function (pr) { return pr.left; });
          var rights = pairs.map(function (pr) { return pr.right; });
          if (exOpts.distractors) {
            var distArr = String(exOpts.distractors).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            rights = rights.concat(distArr);
          }
          var shuffledRights = shuffleArray(rights);
          var colA = exOpts.colALabel || 'Column A';
          var colB = exOpts.colBLabel || 'Column B';
          md.push('| ' + colA + ' | ' + colB + (isTeacherKey ? ' | Key' : '') + ' |');
          md.push('|---|---|' + (isTeacherKey ? '---|' : ''));
          var maxLen = Math.max(lefts.length, shuffledRights.length);
          for (var mIdx = 0; mIdx < maxLen; mIdx++) {
            var lText = mIdx < lefts.length ? ((mIdx + 1) + '. ' + lefts[mIdx]) : '';
            var rText = mIdx < shuffledRights.length ? (String.fromCharCode(65 + mIdx) + '. ' + shuffledRights[mIdx]) : '';
            var keyText = '';
            if (isTeacherKey && mIdx < lefts.length) {
              var cR = pairs[mIdx].right;
              var lI = shuffledRights.indexOf(cR);
              keyText = lI !== -1 ? String.fromCharCode(65 + lI) : '';
            }
            md.push('| ' + lText + ' | ' + rText + (isTeacherKey ? ' | ' + keyText : '') + ' |');
          }
          md.push('');
          break;

        case 'transformation':
        case 'sentence_transformation':
          var transItems = (ex.content && ex.content.items) || [];
          if ((!transItems || !transItems.length) && ex.content && (ex.content.leadIn || ex.content.original)) {
            transItems = [{
              original: ex.content.leadIn || ex.content.original || '',
              keyword: ex.content.keyword || 'REWRITE',
              targetPrefix: ex.content.startOfSentence || ex.content.targetPrefix || '',
              targetSuffix: ex.content.targetSuffix || '',
              solution: ex.expectedAnswer || ex.content.solution || ''
            }];
          }
          if (exOpts.wordConstraint) {
            md.push('*' + exOpts.wordConstraint + '*\n');
          }
          transItems.forEach(function (item, itIdx) {
            md.push('**' + (itIdx + 1) + '. ' + (item.original || '') + '**');
            if (item.keyword) {
              md.push('> **[' + item.keyword + ']**');
            }
            if (isTeacherKey && item.solution) {
              md.push('> ' + (item.targetPrefix || '') + ' **' + item.solution + '** ' + (item.targetSuffix || ''));
            } else {
              md.push('> ' + (item.targetPrefix || '') + ' ________________________ ' + (item.targetSuffix || ''));
            }
            md.push('');
          });
          break;

        case 'translation':
          var trItems = (ex.content && ex.content.items) || [];
          if (exOpts.direction) {
            md.push('*Direction: ' + exOpts.direction + '*\n');
          }
          trItems.forEach(function (item, itIdx) {
            md.push('**' + (itIdx + 1) + '. ' + (item.sourceText || '') + '**');
            if (exOpts.showHints && item.hint) {
              md.push('> *Hint: ' + item.hint + '*');
            }
            if (isTeacherKey && item.modelTranslation) {
              md.push('> *Translation:* ' + item.modelTranslation);
            }
            md.push('');
          });
          break;

        case 'table_completion':
          var headers = (ex.content && ex.content.headers) || [];
          var rows = (ex.content && ex.content.rows) || [];
          if (headers.length) {
            md.push('| ' + headers.join(' | ') + ' |');
            md.push('|' + headers.map(function () { return '---'; }).join('|') + '|');
          }
          rows.forEach(function (r) {
            var rowVals = (r || []).map(function (cell) {
              if (cell && cell.isBlank) {
                return isTeacherKey ? ('**' + (cell.text || '') + '**') : '_______';
              }
              return (cell && cell.text) ? cell.text : '';
            });
            md.push('| ' + rowVals.join(' | ') + ' |');
          });
          md.push('');
          break;

        case 'odd_one_out':
          var oddItems = (ex.content && ex.content.items) || [];
          oddItems.forEach(function (item, itIdx) {
            var renderedWords = (item.words || []).map(function (w) {
              var isIntruder = (item.intruder || '').trim().toLowerCase() === w.trim().toLowerCase();
              if (isTeacherKey && isIntruder) {
                return '**[' + w + ']** *(Intruder)*';
              }
              return w;
            });
            md.push('**' + (itIdx + 1) + '.** ' + renderedWords.join('  |  '));
            if (isTeacherKey && item.justificationKey) {
              md.push('> *Justification:* ' + item.justificationKey);
            }
            md.push('');
          });
          break;

        case 'reading_comprehension':
          var rcTitle = (ex.content && ex.content.passageTitle) || '';
          var rcPassage = (ex.content && ex.content.passageText) || '';
          var subQuestions = (ex.content && ex.content.subQuestions) || [];
          if (rcTitle) {
            md.push('### ' + rcTitle);
            md.push('');
          }
          if (rcPassage) {
            var pLines = rcPassage.split('\n');
            pLines.forEach(function (ln) {
              md.push('> ' + ln);
            });
            md.push('');
          }
          if (exOpts.vocabularyFootnotes) {
            md.push('*Glossary: ' + exOpts.vocabularyFootnotes + '*\n');
          }
          subQuestions.forEach(function (sq, sIdx) {
            var sqPts = sq.points || 1;
            var sqGuidance = sq.lengthGuidance ? ' *(' + sq.lengthGuidance + ')*' : '';
            md.push('**' + (sIdx + 1) + '. ' + (sq.prompt || '') + '**' + sqGuidance + ' (' + sqPts + ' pt' + (sqPts === 1 ? '' : 's') + ')');
            if (sq.answerPrefix) {
              md.push('> *Starter: ' + sq.answerPrefix + '*');
            }
            if (sq.answerType === 'true_false_justify') {
              if (isTeacherKey && sq.solution) {
                md.push('- [ ] True / [ ] False — *Key: ' + sq.solution + '*');
              } else {
                md.push('- [ ] True    - [ ] False');
                md.push('> *Quote line from text to justify:* ________________________');
              }
            } else {
              if (isTeacherKey && sq.solution) {
                md.push('> *Answer:* ' + sq.solution);
              }
            }
            md.push('');
          });
          break;

        default:
          if (ex.content && ex.content.prompt) md.push(ex.content.prompt);
          break;
      }

      md.push('');
      md.push('---');
      md.push('');
    });

    return md.join('\n');
  };

  TestCreatorService.exportToDocxHtml = function (test, options) {
    var inner = TestCreatorService.exportToHtml(test, options);
    var wordHeader = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
      '<head><meta charset="utf-8"><title>' + escapeHtml(test.title) + '</title>',
      '<!--[if gte mso 9]>',
      '<xml>',
      ' <w:WordDocument>',
      '  <w:View>Print</w:View>',
      '  <w:Zoom>100</w:Zoom>',
      '  <w:DoNotOptimizeForBrowser/>',
      ' </w:WordDocument>',
      '</xml>',
      '<![endif]-->'
    ].join('\n');

    return inner.replace('<!DOCTYPE html>\n<html lang="en">', wordHeader);
  };

  TestCreatorService.exportClassBatch = function (test, students, variantAssignments, options) {
    var opts = options || {};
    var themeName = opts.stylesheetTheme || (test && test.exportStyle && (test.exportStyle.theme || test.exportStyle.stylesheetTheme)) || (test && test.stylesheetTheme) || 'academic';
    var isTeacherKey = !!opts.isTeacherKey;
    var globalStyle = Object.assign(
      JSON.parse(JSON.stringify(TestCreatorService.DEFAULT_EXPORT_STYLE)),
      (test && test.exportStyle) || {},
      opts.exportStyle || {}
    );
    var margins = (globalStyle && globalStyle.margins) || { top: 15, right: 15, bottom: 15, left: 15, unit: 'mm' };
    var mUnit = margins.unit || 'mm';
    var mTop = ((margins.top !== undefined && margins.top !== null) ? margins.top : 15) + mUnit;
    var mRight = ((margins.right !== undefined && margins.right !== null) ? margins.right : 15) + mUnit;
    var mBottom = ((margins.bottom !== undefined && margins.bottom !== null) ? margins.bottom : 15) + mUnit;
    var mLeft = ((margins.left !== undefined && margins.left !== null) ? margins.left : 15) + mUnit;

    var compiledSheets = [];
    (students || []).forEach(function (st, idx) {
      var assignedVariant = (variantAssignments && variantAssignments[st.id]) || (idx % 2 === 0 ? 'A' : 'B');
      var variantTest = TestCreatorService.generateVariant(test, assignedVariant);

      var sheetOpts = Object.assign({}, opts, {
        studentName: (st.name || st.firstName + ' ' + st.lastName || 'Student ' + (idx + 1)),
        className: test.className || '',
        variant: assignedVariant,
        isTeacherKey: isTeacherKey,
        stylesheetTheme: themeName,
        exportStyle: globalStyle
      });

      var sheetHtml = TestCreatorService.exportToHtml(variantTest, sheetOpts);
      var bodyContent = sheetHtml.match(/<div class="exam-sheet">[\s\S]*<\/div>\s*<\/body>/);
      if (bodyContent) {
        var cleanBody = bodyContent[0].replace('</body>', '');
        var pageBreak = idx > 0 ? '<div style="page-break-before: always; height: 1px;"></div>' : '';
        compiledSheets.push(pageBreak + cleanBody);
      }
    });

    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head><meta charset="UTF-8"><title>' + escapeHtml(test.title || 'Class Exam Set') + '</title>',
      '<style>',
      TestCreatorService.getThemeCss(themeName),
      '@page { size: A4 portrait; margin: ' + mTop + ' ' + mRight + ' ' + mBottom + ' ' + mLeft + '; }',
      '@media print { body { margin: 0 !important; padding: 0 !important; } .exam-sheet { padding: 0 !important; max-width: 100% !important; margin: 0 !important; width: 100% !important; } }',
      '.exam-sheet { padding: ' + mTop + ' ' + mRight + ' ' + mBottom + ' ' + mLeft + '; box-sizing: border-box; }',
      '</style>',
      '</head>',
      '<body>',
      compiledSheets.join('\n'),
      '</body></html>'
    ].join('\n');
  };

  return TestCreatorService;
});
