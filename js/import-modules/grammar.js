window.IMPORT_MODULE_GRAMMAR = {
  id: 'grammar',
  i18nKey: 'importDestGrammar',
  hasGroupStep: false,
  hasWbStep: true,
  target: 'customGrammarbanks',
  varName: 'grammarData',
  filePickerLabelKey: 'importGrammarPickLabel',
  fields: [
    {
      key: 'topic',
      i18nKey: 'importGrammarFieldTopic',
      required: true,
      autoMatch: ['topic', 'sujet', 'thema', 'argomento', 'grammar point', 'title', 'titre', 'titel', 'titolo', 'name', 'point', 'structure']
    },
    {
      key: 'level',
      i18nKey: 'importGrammarFieldLevel',
      required: false,
      autoMatch: ['level', 'niveau', 'stufe', 'livello', 'cefr', 'cefr level', 'difficulty']
    },
    {
      key: 'category',
      i18nKey: 'importGrammarFieldCategory',
      required: false,
      autoMatch: ['category', 'catégorie', 'kategorie', 'categoria', 'type', 'grammar category', 'class']
    },
    {
      key: 'nuance_delta',
      i18nKey: 'importGrammarFieldNuance',
      required: false,
      autoMatch: ['nuance', 'nuance_delta', 'nuancedelta', 'key concept', 'concept', 'description', 'summary']
    },
    {
      key: 'register',
      i18nKey: 'importGrammarFieldRegister',
      required: false,
      autoMatch: ['register', 'registre', 'registro', 'formality', 'style', 'tone']
    },
    {
      key: 'common_mistake',
      i18nKey: 'importGrammarFieldMistake',
      required: false,
      autoMatch: ['common mistake', 'common_mistake', 'mistake', 'erreur courante', 'häufiger fehler', 'errore comune', 'error', 'pitfall', 'warning']
    },
    {
      key: 'cefr_milestone',
      i18nKey: 'importGrammarFieldMilestone',
      required: false,
      autoMatch: ['cefr milestone', 'cefr_milestone', 'milestone', 'jalon', 'meilenstein', 'traguardo', 'goal', 'skill']
    },
    {
      key: 'frequency_rating',
      i18nKey: 'importGrammarFieldFrequency',
      required: false,
      autoMatch: ['frequency rating', 'frequency_rating', 'frequency', 'fréquence', 'häufigkeit', 'frequenza', 'rating', 'priority']
    }
  ],
  conflictKey: function (row) {
    return (row.topic || '').trim().toLowerCase();
  },
  write: async function (mappedRows, conflictDecisions, options) {
    var existing = Array.isArray(options.existingWords) ? options.existingWords.slice() : [];
    var existingByKey = {};
    existing.forEach(function (item, i) {
      var k = (item.topic || '').trim().toLowerCase();
      if (k) existingByKey[k] = i;
    });

    var added = 0, updated = 0, skipped = 0;

    mappedRows.forEach(function (row, i) {
      var topicRaw = (row.topic || '').trim();
      if (!topicRaw) return;
      var k = topicRaw.toLowerCase();
      var existIdx = existingByKey[k];
      var isConflict = existIdx !== undefined;
      var decision = isConflict ? (conflictDecisions[i] || 'skip') : 'new';

      if (decision === 'skip') { skipped++; return; }

      var gObj = { topic: topicRaw };
      if (row.level !== undefined && row.level !== '') gObj.level = row.level;
      if (row.category !== undefined && row.category !== '') gObj.category = row.category;
      if (row.nuance_delta !== undefined && row.nuance_delta !== '') gObj.nuance_delta = row.nuance_delta;
      if (row.register !== undefined && row.register !== '') gObj.register = row.register;
      if (row.common_mistake !== undefined && row.common_mistake !== '') gObj.common_mistake = row.common_mistake;
      if (row.cefr_milestone !== undefined && row.cefr_milestone !== '') gObj.cefr_milestone = row.cefr_milestone;
      if (row.frequency_rating !== undefined && row.frequency_rating !== '') {
        var fr = parseInt(row.frequency_rating, 10);
        if (!isNaN(fr)) gObj.frequency_rating = fr;
      }

      if (decision === 'overwrite' && isConflict) {
        existing[existIdx] = Object.assign({}, existing[existIdx], gObj);
        updated++;
      } else {
        existing.push(gObj);
        if (!isConflict) existingByKey[k] = existing.length - 1;
        added++;
      }
    });

    var content = 'const grammarData = ' + JSON.stringify(existing, null, 2) + ';\n';
    var saveResult = await Desktop.saveText(options.target || 'customGrammarbanks', options.targetFile, content);
    if (!saveResult || !saveResult.ok) {
      return { ok: false, error: 'Save failed' };
    }
    return { ok: true, added: added, updated: updated, skipped: skipped };
  }
};
