window.IMPORT_MODULE_ERROR = {
  id: 'error',
  i18nKey: 'importDestError',
  hasGroupStep: false,
  hasWbStep: true,
  target: 'customErrorbanks',
  varName: 'errorBank',
  filePickerLabelKey: 'importErrorPickLabel',
  fields: [
    {
      key: 'correct',
      i18nKey: 'importErrorFieldCorrect',
      required: true,
      autoMatch: ['correct', 'correct sentence', 'correcte', 'richtig', 'corretta', 'right', 'answer', 'solution', 'fixed']
    },
    {
      key: 'erroneous',
      i18nKey: 'importErrorFieldErroneous',
      required: true,
      autoMatch: ['erroneous', 'erroneous sentence', 'erroné', 'falsch', 'errata', 'wrong', 'error', 'mistake', 'incorrect', 'faulty']
    },
    {
      key: 'explanation',
      i18nKey: 'importErrorFieldExplanation',
      required: false,
      autoMatch: ['explanation', 'explication', 'erklärung', 'spiegazione', 'note', 'comment', 'reason', 'why']
    },
    {
      key: 'category',
      i18nKey: 'importErrorFieldCategory',
      required: false,
      autoMatch: ['category', 'catégorie', 'kategorie', 'categoria', 'type', 'topic', 'grammar type', 'error type']
    }
  ],
  conflictKey: function (row) {
    return (row.correct || '').trim().toLowerCase();
  },
  write: async function (mappedRows, conflictDecisions, options) {
    var existing = Array.isArray(options.existingWords) ? options.existingWords.slice() : [];
    var existingByKey = {};
    existing.forEach(function (item, i) {
      var k = (item.correct || '').trim().toLowerCase();
      if (k) existingByKey[k] = i;
    });

    var added = 0, updated = 0, skipped = 0;

    mappedRows.forEach(function (row, i) {
      var correctRaw = (row.correct || '').trim();
      if (!correctRaw) return;
      var k = correctRaw.toLowerCase();
      var existIdx = existingByKey[k];
      var isConflict = existIdx !== undefined;
      var decision = isConflict ? (conflictDecisions[i] || 'skip') : 'new';

      if (decision === 'skip') { skipped++; return; }

      var errObj = { correct: correctRaw };
      if (row.erroneous !== undefined && row.erroneous !== '') errObj.erroneous = row.erroneous;
      if (row.explanation !== undefined && row.explanation !== '') errObj.explanation = row.explanation;
      if (row.category !== undefined && row.category !== '') errObj.category = row.category;

      if (decision === 'overwrite' && isConflict) {
        existing[existIdx] = Object.assign({}, existing[existIdx], errObj);
        updated++;
      } else {
        existing.push(errObj);
        if (!isConflict) existingByKey[k] = existing.length - 1;
        added++;
      }
    });

    var content = 'const errorBank = ' + JSON.stringify(existing, null, 2) + ';\n';
    var saveResult = await Desktop.saveText(options.target || 'customErrorbanks', options.targetFile, content);
    if (!saveResult || !saveResult.ok) {
      return { ok: false, error: 'Save failed' };
    }
    return { ok: true, added: added, updated: updated, skipped: skipped };
  }
};
