window.IMPORT_MODULE_DICTATION = {
  id: 'dictation',
  i18nKey: 'importDestDictation',
  hasGroupStep: false,
  hasWbStep: true,
  target: 'customDictations',
  varName: 'dictationBank',
  filePickerLabelKey: 'importDictationPickLabel',
  fields: [
    {
      key: 'title',
      i18nKey: 'importDictationFieldTitle',
      required: true,
      autoMatch: ['title', 'titre', 'titel', 'titolo', 'name', 'nom', 'heading', 'topic']
    },
    {
      key: 'text',
      i18nKey: 'importDictationFieldText',
      required: true,
      autoMatch: ['text', 'texte', 'testo', 'content', 'passage', 'paragraph', 'body', 'dictation text']
    },
    {
      key: 'id',
      i18nKey: 'importDictationFieldId',
      required: false,
      autoMatch: ['id', 'identifier', 'code', 'ref', 'reference']
    },
    {
      key: 'level',
      i18nKey: 'importDictationFieldLevel',
      required: false,
      autoMatch: ['level', 'niveau', 'stufe', 'livello', 'cefr', 'cefr level', 'difficulty']
    },
    {
      key: 'theme',
      i18nKey: 'importDictationFieldTheme',
      required: false,
      autoMatch: ['theme', 'thème', 'thema', 'tema', 'topic', 'category', 'subject']
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

      var dictObj = { title: titleRaw };
      if (row.id !== undefined && row.id !== '') dictObj.id = row.id;
      if (row.level !== undefined && row.level !== '') dictObj.level = row.level;
      if (row.theme !== undefined && row.theme !== '') dictObj.theme = row.theme;
      if (row.text !== undefined && row.text !== '') dictObj.text = row.text;

      if (decision === 'overwrite' && isConflict) {
        existing[existIdx] = Object.assign({}, existing[existIdx], dictObj);
        updated++;
      } else {
        existing.push(dictObj);
        if (!isConflict) existingByKey[k] = existing.length - 1;
        added++;
      }
    });

    var content = 'const dictationBank = ' + JSON.stringify(existing, null, 2) + ';\n';
    var saveResult = await Desktop.saveText(options.target || 'customDictations', options.targetFile, content);
    if (!saveResult || !saveResult.ok) {
      return { ok: false, error: 'Save failed' };
    }
    return { ok: true, added: added, updated: updated, skipped: skipped };
  }
};
