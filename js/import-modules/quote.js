window.IMPORT_MODULE_QUOTE = {
  id: 'quote',
  i18nKey: 'importDestQuote',
  hasGroupStep: false,
  hasWbStep: true,
  target: 'customQuotes',
  varName: 'quoteBank',
  filePickerLabelKey: 'importQuotePickLabel',
  fields: [
    {
      key: 'quote',
      i18nKey: 'importQuoteFieldQuote',
      required: true,
      autoMatch: ['quote', 'citation', 'zitat', 'citazione', 'text', 'passage', 'saying', 'sentence']
    },
    {
      key: 'author',
      i18nKey: 'importQuoteFieldAuthor',
      required: false,
      autoMatch: ['author', 'auteur', 'autor', 'autore', 'speaker', 'source', 'name', 'who']
    },
    {
      key: 'theme',
      i18nKey: 'importQuoteFieldTheme',
      required: false,
      autoMatch: ['theme', 'thème', 'thema', 'tema', 'topic', 'category', 'catégorie', 'subject']
    },
    {
      key: 'keywords',
      i18nKey: 'importQuoteFieldKeywords',
      required: false,
      autoMatch: ['keywords', 'keyword', 'mots-clés', 'schlüsselwörter', 'parole chiave', 'tags', 'key words']
    },
    {
      key: 'explanation',
      i18nKey: 'importQuoteFieldExplanation',
      required: false,
      autoMatch: ['explanation', 'explication', 'erklärung', 'spiegazione', 'note', 'comment', 'analysis']
    }
  ],
  conflictKey: function (row) {
    return (row.quote || '').trim().toLowerCase();
  },
  write: async function (mappedRows, conflictDecisions, options) {
    var existing = Array.isArray(options.existingWords) ? options.existingWords.slice() : [];
    var existingByKey = {};
    existing.forEach(function (item, i) {
      var k = (item.quote || '').trim().toLowerCase();
      if (k) existingByKey[k] = i;
    });

    var added = 0, updated = 0, skipped = 0;

    mappedRows.forEach(function (row, i) {
      var quoteRaw = (row.quote || '').trim();
      if (!quoteRaw) return;
      var k = quoteRaw.toLowerCase();
      var existIdx = existingByKey[k];
      var isConflict = existIdx !== undefined;
      var decision = isConflict ? (conflictDecisions[i] || 'skip') : 'new';

      if (decision === 'skip') { skipped++; return; }

      var kwRaw = row.keywords || '';
      var kwArray = typeof kwRaw === 'string'
        ? kwRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
        : (Array.isArray(kwRaw) ? kwRaw : []);

      var quoteObj = { quote: quoteRaw };
      if (row.author !== undefined && row.author !== '') quoteObj.author = row.author;
      if (row.theme !== undefined && row.theme !== '') quoteObj.theme = row.theme;
      if (kwArray.length) quoteObj.keywords = kwArray;
      if (row.explanation !== undefined && row.explanation !== '') quoteObj.explanation = row.explanation;

      if (decision === 'overwrite' && isConflict) {
        existing[existIdx] = Object.assign({}, existing[existIdx], quoteObj);
        updated++;
      } else {
        existing.push(quoteObj);
        if (!isConflict) existingByKey[k] = existing.length - 1;
        added++;
      }
    });

    var content = 'const quoteBank = ' + JSON.stringify(existing, null, 2) + ';\n';
    var saveResult = await Desktop.saveText(options.target || 'customQuotes', options.targetFile, content);
    if (!saveResult || !saveResult.ok) {
      return { ok: false, error: 'Save failed' };
    }
    return { ok: true, added: added, updated: updated, skipped: skipped };
  }
};
