window.IMPORT_MODULE_SENTENCE = {
  id: 'sentence',
  i18nKey: 'importDestSentence',
  hasGroupStep: false,
  hasWbStep: true,
  target: 'customSentences',
  varName: 'orderSentences',
  filePickerLabelKey: 'importSentencePickLabel',
  fields: [
    {
      key: 'title',
      i18nKey: 'importSentenceFieldTitle',
      required: true,
      autoMatch: ['title', 'titre', 'titel', 'titolo', 'name', 'nom', 'heading', 'label']
    },
    {
      key: 'part1',
      i18nKey: 'importSentenceFieldPart1',
      required: true,
      autoMatch: ['part 1', 'part1', 'sentence 1', 'sentence1', 'étape 1', 'teil 1', 'parte 1', 's1', 'step 1', '1']
    },
    {
      key: 'part2',
      i18nKey: 'importSentenceFieldPart2',
      required: false,
      autoMatch: ['part 2', 'part2', 'sentence 2', 'sentence2', 'étape 2', 'teil 2', 'parte 2', 's2', 'step 2', '2']
    },
    {
      key: 'part3',
      i18nKey: 'importSentenceFieldPart3',
      required: false,
      autoMatch: ['part 3', 'part3', 'sentence 3', 'sentence3', 'étape 3', 'teil 3', 'parte 3', 's3', 'step 3', '3']
    },
    {
      key: 'part4',
      i18nKey: 'importSentenceFieldPart4',
      required: false,
      autoMatch: ['part 4', 'part4', 'sentence 4', 'sentence4', 'étape 4', 'teil 4', 'parte 4', 's4', 'step 4', '4']
    },
    {
      key: 'part5',
      i18nKey: 'importSentenceFieldPart5',
      required: false,
      autoMatch: ['part 5', 'part5', 'sentence 5', 'sentence5', 'étape 5', 'teil 5', 'parte 5', 's5', 'step 5', '5']
    },
    {
      key: 'part6',
      i18nKey: 'importSentenceFieldPart6',
      required: false,
      autoMatch: ['part 6', 'part6', 'sentence 6', 'sentence6', 'étape 6', 'teil 6', 'parte 6', 's6', 'step 6', '6']
    },
    {
      key: 'part7',
      i18nKey: 'importSentenceFieldPart7',
      required: false,
      autoMatch: ['part 7', 'part7', 'sentence 7', 'sentence7', 'étape 7', 'teil 7', 'parte 7', 's7', 'step 7', '7']
    },
    {
      key: 'part8',
      i18nKey: 'importSentenceFieldPart8',
      required: false,
      autoMatch: ['part 8', 'part8', 'sentence 8', 'sentence8', 'étape 8', 'teil 8', 'parte 8', 's8', 'step 8', '8']
    }
  ],
  conflictKey: function (row) {
    return (row.title || '').trim().toLowerCase();
  },
  write: async function (mappedRows, conflictDecisions, options) {
    var existing = Array.isArray(options.existingWords) ? options.existingWords.slice() : [];
    var existingByKey = {};
    existing.forEach(function (item, i) {
      var k = (item.title || '').trim().toLowerCase();
      if (k) existingByKey[k] = i;
    });

    var added = 0, updated = 0, skipped = 0;

    mappedRows.forEach(function (row, i) {
      var titleRaw = (row.title || '').trim();
      if (!titleRaw) return;
      var k = titleRaw.toLowerCase();
      var existIdx = existingByKey[k];
      var isConflict = existIdx !== undefined;
      var decision = isConflict ? (conflictDecisions[i] || 'skip') : 'new';

      if (decision === 'skip') { skipped++; return; }

      var sentObj = { title: titleRaw };
      ['part1','part2','part3','part4','part5','part6','part7','part8'].forEach(function (p) {
        sentObj[p] = (row[p] !== undefined && row[p] !== '') ? row[p] : null;
      });

      if (decision === 'overwrite' && isConflict) {
        existing[existIdx] = Object.assign({}, existing[existIdx], sentObj);
        updated++;
      } else {
        existing.push(sentObj);
        if (!isConflict) existingByKey[k] = existing.length - 1;
        added++;
      }
    });

    var content = 'const orderSentences = ' + JSON.stringify(existing, null, 2) + ';\n';
    var saveResult = await Desktop.saveText(options.target || 'customSentences', options.targetFile, content);
    if (!saveResult || !saveResult.ok) {
      return { ok: false, error: 'Save failed' };
    }
    return { ok: true, added: added, updated: updated, skipped: skipped };
  }
};
