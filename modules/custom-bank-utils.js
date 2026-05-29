(function (global) {
  'use strict';

  const BANK_TYPES = {
    words: {
      id: 'words',
      label: 'Words',
      target: 'customWordbanks',
      baseFile: 'wordDb.js',
      globalName: 'vocabBank',
      fileVarName: 'customVocabBank',
      keyField: 'word',
      fallbackFields: ['word'],
      pathLabel: 'wordbanks'
    },
    quotes: {
      id: 'quotes',
      label: 'Quotes',
      target: 'customQuotes',
      baseFile: 'quoteBank.js',
      globalName: 'quoteBank',
      fileVarName: 'customQuoteBank',
      keyField: 'quote',
      fallbackFields: ['author'],
      pathLabel: 'quotebanks'
    },
    gaps: {
      id: 'gaps',
      label: 'Gap Fill',
      target: 'customGapfillbanks',
      baseFile: 'gapFillBank.js',
      globalName: 'gapFillBank',
      fileVarName: 'customGapFillBank',
      keyField: 'sentence',
      fallbackFields: ['removedWord'],
      pathLabel: 'gapfillbanks'
    },
    errors: {
      id: 'errors',
      label: 'Find the Error',
      target: 'customErrorbanks',
      baseFile: 'errorBank.js',
      globalName: 'errorBank',
      fileVarName: 'customErrorBank',
      keyField: 'correct',
      fallbackFields: ['erroneous'],
      pathLabel: 'errorbanks'
    },
    dictations: {
      id: 'dictations',
      label: 'Dictation',
      target: 'customDictations',
      baseFile: 'dictation.js',
      globalName: 'dictationBank',
      fileVarName: 'customDictationBank',
      keyField: 'id',
      fallbackFields: ['title', 'text'],
      pathLabel: 'dictations'
    },
    grammar: {
      id: 'grammar',
      label: 'Grammar',
      target: 'customGrammarbanks',
      baseFile: 'grammar.js',
      globalName: 'grammarData',
      fileVarName: 'customGrammarBank',
      keyField: 'id',
      fallbackFields: ['topic', 'category'],
      pathLabel: 'grammarbanks'
    },
    sentences: {
      id: 'sentences',
      label: 'Order Sentences',
      target: 'customSentences',
      baseFile: 'orderSentences.js',
      globalName: 'orderSentences',
      fileVarName: 'customSentenceBank',
      keyField: 'title',
      fallbackFields: ['part1'],
      pathLabel: 'sentencebanks'
    },
    stories: {
      id: 'stories',
      label: 'Choose Your Story',
      target: 'customStorybanks',
      baseFile: 'chooseStory.js',
      globalName: 'chooseStoryBank',
      fileVarName: 'customStoryBank',
      keyField: 'id',
      fallbackFields: ['title'],
      pathLabel: 'storybanks'
    }
  };

  function getConfig(type) {
    const config = BANK_TYPES[type];
    if (!config) throw new Error('Unknown bank type: ' + type);
    return config;
  }

  function ensureLiveBank(type) {
    const config = getConfig(type);
    if (!Array.isArray(global[config.globalName])) {
      global[config.globalName] = [];
    }
    return global[config.globalName];
  }

  function normalizeString(value) {
    return String(value == null ? '' : value).trim();
  }

  function stripMeta(value) {
    if (Array.isArray(value)) return value.map(stripMeta);
    if (!value || typeof value !== 'object') return value;

    const out = {};
    Object.keys(value).forEach((key) => {
      if (key.charAt(0) === '_') return;
      out[key] = stripMeta(value[key]);
    });
    return out;
  }

  function getRecordKey(type, item, fallbackIndex) {
    const config = getConfig(type);
    const candidates = [config.keyField].concat(config.fallbackFields || []);
    for (const field of candidates) {
      const value = normalizeString(item && item[field]);
      if (value) return value.toLowerCase();
    }
    return '__idx__' + String(fallbackIndex == null ? '' : fallbackIndex);
  }

  function parseJsDataFile(content) {
    const source = String(content || '');
    const match = source.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\[|\{)/);
    if (!match) return null;
    const variableName = match[1];
    try {
      return (new Function(source + '\n; return (typeof ' + variableName + ' !== "undefined" ? ' + variableName + ' : null);'))();
    } catch (err) {
      console.warn('Failed to parse custom bank file:', err);
      return null;
    }
  }

  function buildBankFileContent(type, entries, filename) {
    const config = getConfig(type);
    const cleanEntries = Array.isArray(entries) ? entries.map(stripMeta) : [];
    return '// ' + filename + '\nconst ' + config.fileVarName + ' = ' + JSON.stringify(cleanEntries, null, 2) + ';\n';
  }

  async function listCustomFiles(type) {
    const config = getConfig(type);
    if (!global.Desktop || !Desktop.isElectron()) return [];

    try {
      if (typeof Desktop.listFiles === 'function') {
        const result = await Desktop.listFiles(config.target, { extensions: ['.js'] });
        if (result && result.ok && Array.isArray(result.files)) return result.files;
      }
      if (typeof Desktop.listByPath === 'function') {
        const result = await Desktop.listByPath(config.target, '', { extensions: ['.js'] });
        if (result && result.ok && Array.isArray(result.files)) return result.files;
      }
    } catch (err) {
      console.warn('Failed to list custom bank files for ' + type + ':', err);
    }
    return [];
  }

  async function readCustomBankFile(type, filename) {
    const config = getConfig(type);
    if (!global.Desktop || !Desktop.isElectron()) return [];
    const cleanName = normalizeString(filename);
    if (!cleanName) return [];
    try {
      const result = await Desktop.readText(config.target, cleanName);
      if (!result || !result.ok) return [];
      const parsed = parseJsDataFile(result.content || '');
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Failed to read custom bank file ' + cleanName + ':', err);
      return [];
    }
  }

  async function saveCustomBankFile(type, filename, entries) {
    const config = getConfig(type);
    if (!global.Desktop || !Desktop.isElectron()) return { ok: false, error: 'Desktop API unavailable' };
    const cleanName = normalizeString(filename);
    if (!cleanName) return { ok: false, error: 'Missing file name' };
    const content = buildBankFileContent(type, entries, cleanName);
    return Desktop.saveText(config.target, cleanName, content);
  }

  function mergeItemsIntoLiveBank(type, items, options) {
    const config = getConfig(type);
    const liveBank = ensureLiveBank(type);
    const opts = options || {};
    const sourceId = normalizeString(opts.sourceId);
    const customFile = normalizeString(opts.customFile);
    const indexByKey = new Map();

    liveBank.forEach((item, index) => {
      indexByKey.set(getRecordKey(type, item, index), index);
    });

    (Array.isArray(items) ? items : []).forEach((rawItem, itemIndex) => {
      if (!rawItem || typeof rawItem !== 'object') return;
      const entry = Object.assign({}, rawItem);
      entry._custom = true;
      if (sourceId) entry._source = sourceId;
      if (customFile) entry._customFile = customFile;

      const key = getRecordKey(type, entry, itemIndex);
      const existingIndex = indexByKey.has(key) ? indexByKey.get(key) : -1;
      if (existingIndex !== -1) {
        liveBank[existingIndex] = Object.assign({}, liveBank[existingIndex], entry);
      } else {
        liveBank.push(entry);
        indexByKey.set(key, liveBank.length - 1);
      }
    });

    return liveBank;
  }

  async function loadCustomBanksForType(type) {
    const config = getConfig(type);
    if (!global.Desktop || !Desktop.isElectron()) return [];

    const files = await listCustomFiles(type);
    const summaries = [];
    for (const file of files) {
      const filename = normalizeString(file && (file.filename || file.relativePath));
      if (!filename) continue;
      if (filename.toLowerCase() === config.baseFile.toLowerCase()) continue;
      const entries = await readCustomBankFile(type, filename);
      if (!entries.length) continue;
      const sourceId = filename.replace(/\.js$/i, '');
      mergeItemsIntoLiveBank(type, entries, { sourceId: sourceId, customFile: filename });
      summaries.push({ filename: filename, count: entries.length, sourceId: sourceId });
    }
    return summaries;
  }

  function getCustomEntriesFromLiveBank(type) {
    return ensureLiveBank(type).filter((item) => item && item._custom);
  }

  function getTypeOptions(types) {
    const keys = Array.isArray(types) && types.length ? types : Object.keys(BANK_TYPES);
    return keys.map((type) => {
      const config = getConfig(type);
      return {
        value: type,
        label: config.label,
        folder: config.pathLabel
      };
    });
  }

  global.CustomBankUtils = {
    BANK_TYPES: BANK_TYPES,
    getConfig: getConfig,
    getTypeOptions: getTypeOptions,
    ensureLiveBank: ensureLiveBank,
    stripMeta: stripMeta,
    getRecordKey: getRecordKey,
    parseJsDataFile: parseJsDataFile,
    buildBankFileContent: buildBankFileContent,
    listCustomFiles: listCustomFiles,
    readCustomBankFile: readCustomBankFile,
    saveCustomBankFile: saveCustomBankFile,
    mergeItemsIntoLiveBank: mergeItemsIntoLiveBank,
    loadCustomBanksForType: loadCustomBanksForType,
    getCustomEntriesFromLiveBank: getCustomEntriesFromLiveBank
  };
})(window);
