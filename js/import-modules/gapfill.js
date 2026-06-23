window.IMPORT_MODULE_GAPFILL = {
  id: 'gapfill',
  i18nKey: 'importDestGapfill',
  hasGroupStep: false,
  hasWbStep: true,
  target: 'customGapfillbanks',
  varName: 'gapFillBank',
  filePickerLabelKey: 'importGapfillPickLabel',
  fields: [
    {
      key: 'sentence',
      i18nKey: 'importGapfillFieldSentence',
      required: true,
      autoMatch: ['sentence', 'phrase', 'satz', 'frase', 'text', 'texte', 'full sentence', 'complete sentence']
    },
    {
      key: 'removedWord',
      i18nKey: 'importGapfillFieldRemoved',
      required: true,
      autoMatch: ['removed word', 'removedword', 'gap', 'missing word', 'missing', 'blank', 'mot manquant', 'fehlendes wort', 'parola mancante', 'answer', 'word', 'gap word']
    },
    {
      key: 'infinitive',
      i18nKey: 'importGapfillFieldInfinitive',
      required: false,
      autoMatch: ['infinitive', 'infinitif', 'infinitiv', 'infinito', 'base form', 'root', 'base']
    },
    {
      key: 'grammarType',
      i18nKey: 'importGapfillFieldGrammar',
      required: false,
      autoMatch: ['grammar type', 'grammartype', 'grammar', 'type', 'category', 'catégorie', 'grammatik', 'categoria grammaticale', 'topic', 'structure']
    },
    {
      key: 'level',
      i18nKey: 'importGapfillFieldLevel',
      required: false,
      autoMatch: ['level', 'niveau', 'stufe', 'livello', 'cefr', 'cefr level', 'difficulty']
    }
  ],
  conflictKey: function (row) {
    return (row.sentence || '').trim().toLowerCase();
  },
  write: async function (mappedRows, conflictDecisions, options) {
    var existing = Array.isArray(options.existingWords) ? options.existingWords.slice() : [];
    var existingByKey = {};
    existing.forEach(function (item, i) {
      var k = (item.sentence || '').trim().toLowerCase();
      if (k) existingByKey[k] = i;
    });

    var added = 0, updated = 0, skipped = 0;

    mappedRows.forEach(function (row, i) {
      var sentenceRaw = (row.sentence || '').trim();
      if (!sentenceRaw) return;
      var k = sentenceRaw.toLowerCase();
      var existIdx = existingByKey[k];
      var isConflict = existIdx !== undefined;
      var decision = isConflict ? (conflictDecisions[i] || 'skip') : 'new';

      if (decision === 'skip') { skipped++; return; }

      var gapObj = { sentence: sentenceRaw };
      if (row.removedWord !== undefined && row.removedWord !== '') gapObj.removedWord = row.removedWord;
      if (row.infinitive !== undefined && row.infinitive !== '') gapObj.infinitive = row.infinitive;
      if (row.grammarType !== undefined && row.grammarType !== '') gapObj.grammarType = row.grammarType;
      if (row.level !== undefined && row.level !== '') gapObj.level = row.level;

      if (decision === 'overwrite' && isConflict) {
        existing[existIdx] = Object.assign({}, existing[existIdx], gapObj);
        updated++;
      } else {
        existing.push(gapObj);
        if (!isConflict) existingByKey[k] = existing.length - 1;
        added++;
      }
    });

    var content = 'const gapFillBank = ' + JSON.stringify(existing, null, 2) + ';\n';
    var saveResult = await Desktop.saveText(options.target || 'customGapfillbanks', options.targetFile, content);
    if (!saveResult || !saveResult.ok) {
      return { ok: false, error: 'Save failed' };
    }
    return { ok: true, added: added, updated: updated, skipped: skipped };
  }
};
