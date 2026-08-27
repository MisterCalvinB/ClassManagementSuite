window.IMPORT_MODULE_COMPETENCES = {
  id: 'competences',
  i18nKey: 'importDestCompetences',
  hasGroupStep: false,
  hasWbStep: true,
  target: 'customCompetences',
  varName: 'customCompetenceBank',
  filePickerLabelKey: 'importCompetencePickLabel',
  doneToolPage: 'lesson-creator.html',
  doneActionKey: 'importBtnOpenLessonCreator',
  fields: [
    {
      key: 'code',
      i18nKey: 'importCompFieldCode',
      required: true,
      autoMatch: ['code', 'standard', 'reference', 'ref', 'id', 'identifier', 'key']
    },
    {
      key: 'title',
      i18nKey: 'importCompFieldTitle',
      required: true,
      autoMatch: ['title', 'titre', 'titel', 'name', 'nom', 'standard title', 'competence', 'compétence']
    },
    {
      key: 'category',
      i18nKey: 'importCompFieldCategory',
      required: false,
      autoMatch: ['category', 'catégorie', 'kategorie', 'domain', 'domaine', 'strand', 'major competence']
    },
    {
      key: 'subCategory',
      i18nKey: 'importCompFieldSubCategory',
      required: false,
      autoMatch: ['subcategory', 'sous-catégorie', 'substrand', 'subdomain', 'focale', 'sous-compétence']
    },
    {
      key: 'subjectId',
      i18nKey: 'importCompFieldSubjectId',
      required: false,
      autoMatch: ['subjectid', 'subject', 'matière', 'discipline', 'fach', 'materia']
    },
    {
      key: 'yearLevel',
      i18nKey: 'importCompFieldYearLevel',
      required: false,
      autoMatch: ['yearlevel', 'year', 'année', 'grade', 'level', 'jahrgang', 'niveau']
    },
    {
      key: 'semester',
      i18nKey: 'importCompFieldSemester',
      required: false,
      autoMatch: ['semester', 'semestre', 'term', 'periode']
    },
    {
      key: 'level',
      i18nKey: 'importCompFieldLevel',
      required: false,
      autoMatch: ['level', 'niveau', 'cefr', 'cefr level', 'tier']
    },
    {
      key: 'description',
      i18nKey: 'importCompFieldDescription',
      required: false,
      autoMatch: ['description', 'desc', 'statement', 'objectifs', 'details']
    },
    {
      key: 'tags',
      i18nKey: 'importCompFieldTags',
      required: false,
      autoMatch: ['tags', 'mots-clés', 'keywords', 'labels', 'tag']
    },
    {
      key: 'comments',
      i18nKey: 'importCompFieldComments',
      required: false,
      autoMatch: ['comments', 'commentaires', 'notes', 'remarques']
    },
    {
      key: 'sampleTasks',
      i18nKey: 'importCompFieldSampleTasks',
      required: false,
      autoMatch: ['sampletasks', 'sample tasks', 'exemples', 'tâches', 'tasks', 'progression', 'exemples de tâches']
    }
  ],
  conflictKey: function (row) {
    return (row.code || row.title || '').trim().toLowerCase();
  },
  write: async function (mappedRows, conflictDecisions, options) {
    var existing = Array.isArray(options.existingWords) ? options.existingWords.slice() : [];
    var existingByKey = {};
    existing.forEach(function (c, i) {
      var k = (c.code || c.title || '').trim().toLowerCase();
      if (k) existingByKey[k] = i;
    });

    var added = 0, updated = 0, skipped = 0;

    mappedRows.forEach(function (row, i) {
      var codeRaw = (row.code || '').trim();
      var titleRaw = (row.title || '').trim();
      if (!codeRaw && !titleRaw) return;
      var k = (codeRaw || titleRaw).toLowerCase();
      var existIdx = existingByKey[k];
      var isConflict = existIdx !== undefined;
      var decision = isConflict ? (conflictDecisions[i] || 'skip') : 'new';

      if (decision === 'skip') { skipped++; return; }

      var compObj = {
        id: row.id || (codeRaw ? ('comp_' + codeRaw.toLowerCase().replace(/[^a-z0-9]/g, '_')) : ('comp_' + Math.random().toString(36).substr(2, 9))),
        code: codeRaw || titleRaw,
        title: titleRaw || codeRaw,
        category: (row.category || 'General').trim(),
        subCategory: (row.subCategory || '').trim(),
        subjectId: (row.subjectId || 'anglais').trim(),
        yearLevel: (row.yearLevel || 'all').trim(),
        semester: (row.semester || 'all').trim(),
        level: (row.level || '').trim(),
        description: (row.description || '').trim(),
        tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' && row.tags ? row.tags.split(/[,;]/).map(function (s) { return s.trim(); }).filter(Boolean) : []),
        comments: (row.comments || '').trim(),
        sampleTasks: (row.sampleTasks || '').trim()
      };

      if (decision === 'overwrite' && isConflict) {
        existing[existIdx] = Object.assign({}, existing[existIdx], compObj);
        updated++;
      } else {
        existing.push(compObj);
        if (!isConflict) existingByKey[k] = existing.length - 1;
        added++;
      }
    });

    var content = 'const customCompetenceBank = ' + JSON.stringify(existing, null, 2) + ';\n';
    var saveResult = await Desktop.saveText(options.target || 'customCompetences', options.targetFile, content);
    if (!saveResult || !saveResult.ok) {
      return { ok: false, error: 'Save failed' };
    }

    try {
      var localExisting = JSON.parse(localStorage.getItem('cmt-lesson-competences') || '[]');
      var combined = localExisting.concat(existing);
      localStorage.setItem('cmt-lesson-competences', JSON.stringify(combined));
    } catch (_) {}

    return { ok: true, added: added, updated: updated, skipped: skipped };
  }
};
