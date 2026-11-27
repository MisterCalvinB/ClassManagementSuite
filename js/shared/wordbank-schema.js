(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === 'object') {
    root.WordbankSchema = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const TRANSIENT_UI_KEYS = new Set(['_fi', '_ri', '_src', '_fKey', '_fSearch']);

  // Canonical field -> compact abbreviated key
  const CANONICAL_TO_SHORT = Object.freeze({
    word: 'w',
    sourceLanguage: 'lang',
    english: 'en',
    french: 'fr',
    german: 'de',
    italian: 'it',
    ipa: 'ipa',
    partOfSpeech: 'pos',
    level: 'lvl',
    theme: 'thm',
    definition: 'def',
    exampleSentence: 'ex',
    etymology: 'ety',
    synonyms: 'syn',
    antonyms: 'ant',
    otherForms: 'frm',
    hypernym: 'hyper',
    hyponym: 'hypo',
    keywords: 'kw',
    picture: 'pic',
    occurrences: 'occ',
    percentage: 'pct',
    percentile: 'pctl'
  });

  // Primary short key + accepted legacy aliases -> canonical field
  // Ordered by precedence when multiple aliases exist on the same raw record.
  const ALIAS_TO_CANONICAL = Object.freeze({
    w: 'word',
    term: 'word',
    lemma: 'word',
    lang: 'sourceLanguage',
    src: 'sourceLanguage',
    en: 'english',
    fr: 'french',
    de: 'german',
    it: 'italian',
    pos: 'partOfSpeech',
    lvl: 'level',
    cefr: 'level',
    thm: 'theme',
    def: 'definition',
    meaning: 'definition',
    ex: 'exampleSentence',
    examples: 'exampleSentence',
    ety: 'etymology',
    syn: 'synonyms',
    synonym: 'synonyms',
    ant: 'antonyms',
    antonym: 'antonyms',
    frm: 'otherForms',
    forms: 'otherForms',
    otherTerms: 'otherForms',
    hyper: 'hypernym',
    hpr: 'hypernym',
    hypo: 'hyponym',
    hpo: 'hyponym',
    kw: 'keywords',
    pic: 'picture',
    occ: 'occurrences',
    count: 'occurrences',
    freq: 'occurrences',
    frequency: 'occurrences',
    pct: 'percentage',
    percent: 'percentage',
    pctl: 'percentile'
  });

  const ARRAY_FIELDS = new Set([
    'synonyms',
    'antonyms',
    'otherForms',
    'hypernym',
    'hyponym',
    'keywords'
  ]);

  function isNonEmptyValue(val) {
    if (val === undefined || val === null) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (Array.isArray(val)) return val.some(item => item !== undefined && item !== null && String(item).trim() !== '');
    return true;
  }

  /**
   * Expand abbreviated/aliased wordbank keys onto canonical field names.
   * Safeguards:
   * - Canonical key always wins if it already holds a non-empty value.
   * - Removes consumed alias keys so UI schemas do not show duplicate columns.
   * - Guards against prototype pollution and malformed inputs.
   */
  function normalizeWordbankRecord(raw, options) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    const opts = options || {};
    const out = opts.inPlace ? raw : Object.assign({}, raw);
    const keys = Object.keys(out);

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (FORBIDDEN_KEYS.has(k)) {
        delete out[k];
        continue;
      }
      const canon = ALIAS_TO_CANONICAL[k];
      if (!canon) continue;

      const aliasVal = out[k];
      const hasCanon = Object.prototype.hasOwnProperty.call(out, canon) && isNonEmptyValue(out[canon]);

      if (!hasCanon && aliasVal !== undefined && aliasVal !== null) {
        if (ARRAY_FIELDS.has(canon) && typeof aliasVal === 'string') {
          out[canon] = aliasVal.split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
        } else {
          out[canon] = aliasVal;
        }
      }

      if (k !== canon) {
        delete out[k];
      }
    }

    if (typeof out.word === 'string') {
      out.word = out.word.trim();
    }

    return out;
  }

  function normalizeWordbankArray(records, options) {
    if (!Array.isArray(records)) return records;
    const opts = options || {};
    if (opts.inPlace) {
      for (let i = 0; i < records.length; i++) {
        normalizeWordbankRecord(records[i], opts);
      }
      return records;
    }
    const out = new Array(records.length);
    for (let i = 0; i < records.length; i++) {
      out[i] = normalizeWordbankRecord(records[i], opts);
    }
    return out;
  }

  /**
   * Compact a canonical wordbank record using abbreviated keys and omitting empty values.
   * Safeguards:
   * - Strips transient UI keys (_fi, _ri, _src, _fKey, _fSearch).
   * - Preserves unknown/custom fields and persistent metadata (_custom, _source, etc.).
   * - Never mutates the source record.
   */
  function compactWordbankRecord(rec, options) {
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return rec;
    const opts = options || {};
    const keepEmpty = Boolean(opts.keepEmpty);
    const out = {};

    const keys = Object.keys(rec);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (FORBIDDEN_KEYS.has(k) || TRANSIENT_UI_KEYS.has(k)) continue;

      const canon = ALIAS_TO_CANONICAL[k] || k;
      const targetKey = CANONICAL_TO_SHORT[canon] || k;
      let val = rec[k];

      if (val === undefined || val === null) {
        if (keepEmpty) out[targetKey] = val;
        continue;
      }

      if (typeof val === 'string') {
        if (!keepEmpty && val === '') continue;
      } else if (Array.isArray(val)) {
        const cleaned = val.filter(v => v !== undefined && v !== null && String(v).trim() !== '');
        if (!keepEmpty && cleaned.length === 0) continue;
        val = cleaned;
      }

      // If both a canonical key and an alias existed on the input, canonical wins
      if (Object.prototype.hasOwnProperty.call(out, targetKey) && k !== canon) {
        continue;
      }
      out[targetKey] = val;
    }

    return out;
  }

  function compactWordbankArray(records, options) {
    if (!Array.isArray(records)) return records;
    const out = new Array(records.length);
    for (let i = 0; i < records.length; i++) {
      out[i] = compactWordbankRecord(records[i], options);
    }
    return out;
  }

  return {
    CANONICAL_TO_SHORT,
    ALIAS_TO_CANONICAL,
    isNonEmptyValue,
    normalizeWordbankRecord,
    normalizeWordbankArray,
    compactWordbankRecord,
    compactWordbankArray
  };
});
