window.IMPORT_MODULE_STORY = {
  id: 'story',
  i18nKey: 'importDestStory',
  hasGroupStep: false,
  hasWbStep: true,
  target: 'customStorybanks',
  varName: 'chooseStoryBank',
  filePickerLabelKey: 'importStoryPickLabel',
  fields: [
    {
      key: 'title',
      i18nKey: 'importStoryFieldTitle',
      required: true,
      autoMatch: ['title', 'titre', 'titel', 'titolo', 'name', 'nom', 'story title', 'heading']
    },
    {
      key: 'theme',
      i18nKey: 'importStoryFieldTheme',
      required: false,
      autoMatch: ['theme', 'thème', 'thema', 'tema', 'topic', 'category', 'subject', 'genre']
    },
    {
      key: 'level',
      i18nKey: 'importStoryFieldLevel',
      required: false,
      autoMatch: ['level', 'niveau', 'stufe', 'livello', 'cefr', 'cefr level', 'difficulty']
    },
    {
      key: 'coverEmoji',
      i18nKey: 'importStoryFieldEmoji',
      required: false,
      autoMatch: ['emoji', 'cover emoji', 'coveremoji', 'icon', 'symbol']
    },
    {
      key: 'synopsis',
      i18nKey: 'importStoryFieldSynopsis',
      required: false,
      autoMatch: ['synopsis', 'summary', 'résumé', 'zusammenfassung', 'sinossi', 'description', 'abstract', 'blurb']
    },
    {
      key: 'id',
      i18nKey: 'importStoryFieldId',
      required: false,
      autoMatch: ['id', 'identifier', 'code', 'ref', 'reference', 'slug']
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

      var storyObj = { title: titleRaw };
      if (row.id !== undefined && row.id !== '') storyObj.id = row.id;
      if (row.theme !== undefined && row.theme !== '') storyObj.theme = row.theme;
      if (row.level !== undefined && row.level !== '') storyObj.level = row.level;
      if (row.coverEmoji !== undefined && row.coverEmoji !== '') storyObj.coverEmoji = row.coverEmoji;
      if (row.synopsis !== undefined && row.synopsis !== '') storyObj.synopsis = row.synopsis;

      if (decision === 'overwrite' && isConflict) {
        // Preserve existing stages when updating metadata
        var preserved = existing[existIdx] || {};
        existing[existIdx] = Object.assign({}, preserved, storyObj, { stages: preserved.stages || {} });
        updated++;
      } else {
        storyObj.stages = {};
        existing.push(storyObj);
        if (!isConflict) existingByKey[k] = existing.length - 1;
        added++;
      }
    });

    var content = 'const chooseStoryBank = ' + JSON.stringify(existing, null, 2) + ';\n';
    var saveResult = await Desktop.saveText(options.target || 'customStorybanks', options.targetFile, content);
    if (!saveResult || !saveResult.ok) {
      return { ok: false, error: 'Save failed' };
    }
    return { ok: true, added: added, updated: updated, skipped: skipped };
  }
};
