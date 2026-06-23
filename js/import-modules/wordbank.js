window.IMPORT_MODULE_WORDBANK = {
  id: 'wordbank',
  i18nKey: 'importDestWordbank',
  hasGroupStep: false,
  hasWbStep: true,
  target: 'customWordbanks',
  varName: 'customVocabBank',
  filePickerLabelKey: 'importWbPickLabel',
  fields: [
    {
      key: 'word',
      i18nKey: 'importWbFieldWord',
      required: true,
      autoMatch: ['word', 'mot', 'wort', 'parola', 'vocabulary', 'vocable', 'terme', 'term']
    },
    {
      key: 'sourceLanguage',
      i18nKey: 'importWbFieldSourceLang',
      required: false,
      autoMatch: ['source language', 'source lang', 'langue source', 'originalsprache', 'lingua originale', 'sourcelanguage', 'lang', 'language']
    },
    {
      key: 'english',
      i18nKey: 'importWbFieldEnglish',
      required: false,
      autoMatch: ['english', 'anglais', 'englisch', 'inglese', 'en', 'eng', 'english translation']
    },
    {
      key: 'french',
      i18nKey: 'importWbFieldFrench',
      required: false,
      autoMatch: ['french', 'français', 'francais', 'französisch', 'francese', 'fr', 'fra', 'traduction française']
    },
    {
      key: 'german',
      i18nKey: 'importWbFieldGerman',
      required: false,
      autoMatch: ['german', 'allemand', 'deutsch', 'tedesco', 'de', 'deu']
    },
    {
      key: 'italian',
      i18nKey: 'importWbFieldItalian',
      required: false,
      autoMatch: ['italian', 'italien', 'italienisch', 'italiano', 'it', 'ita']
    },
    {
      key: 'ipa',
      i18nKey: 'importWbFieldIpa',
      required: false,
      autoMatch: ['ipa', 'pronunciation', 'prononciation', 'aussprache', 'pronuncia', 'phonetic', 'phonetics']
    },
    {
      key: 'partOfSpeech',
      i18nKey: 'importWbFieldPos',
      required: false,
      autoMatch: ['part of speech', 'pos', 'nature', 'wortart', 'categoria grammaticale', 'grammar', 'grammatical type', 'type']
    },
    {
      key: 'level',
      i18nKey: 'importWbFieldLevel',
      required: false,
      autoMatch: ['level', 'niveau', 'stufe', 'livello', 'cefr', 'cefr level']
    },
    {
      key: 'theme',
      i18nKey: 'importWbFieldTheme',
      required: false,
      autoMatch: ['theme', 'thème', 'thema', 'tema', 'topic', 'category', 'catégorie', 'kategorie', 'categoria', 'subject']
    },
    {
      key: 'definition',
      i18nKey: 'importWbFieldDefinition',
      required: false,
      autoMatch: ['definition', 'définition', 'definizione', 'meaning', 'signification', 'bedeutung']
    },
    {
      key: 'exampleSentence',
      i18nKey: 'importWbFieldExample',
      required: false,
      autoMatch: ['example', 'exemple', 'beispiel', 'esempio', 'sentence', 'phrase', 'example sentence', 'exemples']
    },
    {
      key: 'synonyms',
      i18nKey: 'importWbFieldSynonyms',
      required: false,
      autoMatch: ['synonyms', 'synonymes', 'synonyme', 'sinonimi', 'synonym']
    },
    {
      key: 'antonyms',
      i18nKey: 'importWbFieldAntonyms',
      required: false,
      autoMatch: ['antonyms', 'antonymes', 'antonyme', 'antonimi', 'antonym', 'opposite', 'contraire']
    }
  ],
  conflictKey: function (row) {
    return (row.word || '').trim().toLowerCase();
  },
  // Called from runImport with (mappedRows, conflictDecisions, options)
  // options: { targetFile, existingWords }
  write: async function (mappedRows, conflictDecisions, options) {
    var existing = Array.isArray(options.existingWords) ? options.existingWords.slice() : [];
    var existingByKey = {};
    existing.forEach(function (w, i) {
      var k = (w.word || '').trim().toLowerCase();
      if (k) existingByKey[k] = i;
    });

    var added = 0, updated = 0, skipped = 0;

    mappedRows.forEach(function (row, i) {
      var wordRaw = (row.word || '').trim();
      if (!wordRaw) return;
      var k = wordRaw.toLowerCase();
      var existIdx = existingByKey[k];
      var isConflict = existIdx !== undefined;
      var decision = isConflict ? (conflictDecisions[i] || 'skip') : 'new';

      if (decision === 'skip') { skipped++; return; }

      var optFields = ['sourceLanguage','english','french','german','italian','ipa','partOfSpeech','level','theme','definition','exampleSentence','synonyms','antonyms'];
      var wordObj = { word: wordRaw };
      optFields.forEach(function (key) {
        if (row[key] !== undefined && row[key] !== '') wordObj[key] = row[key];
      });
      // Default sourceLanguage to 'en' when not mapped
      if (!wordObj.sourceLanguage) wordObj.sourceLanguage = 'en';

      if (decision === 'overwrite' && isConflict) {
        existing[existIdx] = Object.assign({}, existing[existIdx], wordObj);
        updated++;
      } else {
        existing.push(wordObj);
        if (!isConflict) existingByKey[k] = existing.length - 1;
        added++;
      }
    });

    var content = 'const customVocabBank = ' + JSON.stringify(existing, null, 2) + ';\n';
    var saveResult = await Desktop.saveText(options.target || 'customWordbanks', options.targetFile, content);
    if (!saveResult || !saveResult.ok) {
      return { ok: false, error: 'Save failed' };
    }
    return { ok: true, added: added, updated: updated, skipped: skipped };
  }
};
