// modules/wiktionary-lookup.js
// Lazy-loads user/custom-data/simple-extract.jsonl and provides word lookups.
// Requires window.BarrasDesktop (Electron only).
(function () {
  var _index = null;
  var _loadPromise = null;

  var POS_MAP = {
    adj: 'adjective', adv: 'adverb', noun: 'noun', verb: 'verb',
    prep: 'preposition', det: 'determiner', conj: 'conjunction',
    pron: 'pronoun', name: 'noun', intj: 'interjection',
    num: 'noun', phrase: 'phrase', proverb: 'phrase'
  };

  // Priority when no PoS preference is given
  var POS_PRIORITY = ['noun', 'verb', 'adj', 'adv', 'prep', 'det', 'conj', 'pron'];

  function loadIndex() {
    if (_index) return Promise.resolve(_index);
    if (_loadPromise) return _loadPromise;
    _loadPromise = window.BarrasDesktop.readText('data', 'simple-extract.jsonl')
      .then(function (result) {
        var map = new Map();
        if (!result || !result.content) { _index = map; return map; }
        var lines = result.content.split('\n');
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line) continue;
          try {
            var entry = JSON.parse(line);
            var key = (entry.word || '').toLowerCase();
            if (key) {
              if (!map.has(key)) map.set(key, []);
              map.get(key).push(entry);
            }
          } catch (e) { /* skip malformed lines */ }
        }
        _index = map;
        return map;
      })
      .catch(function () {
        _index = new Map();
        _loadPromise = null;
        return _index;
      });
    return _loadPromise;
  }

  function pickEntry(entries, preferredPos) {
    if (!entries || !entries.length) return null;
    if (entries.length === 1) return entries[0];
    if (preferredPos) {
      var shortKey = Object.keys(POS_MAP).find(function (k) { return POS_MAP[k] === preferredPos; });
      var match = entries.find(function (e) { return e.pos === shortKey || e.pos === preferredPos; });
      if (match) return match;
    }
    for (var p = 0; p < POS_PRIORITY.length; p++) {
      var pos = POS_PRIORITY[p];
      var candidate = entries.find(function (e) { return e.pos === pos; });
      if (candidate) return candidate;
    }
    return entries[0];
  }

  function extractData(entry) {
    var ipa = '';
    if (entry.sounds) {
      var ukIpa  = entry.sounds.find(function (s) { return s.ipa && s.tags && s.tags.indexOf('UK') !== -1; });
      var usIpa  = entry.sounds.find(function (s) { return s.ipa && s.tags && s.tags.indexOf('US') !== -1; });
      var anyIpa = entry.sounds.find(function (s) { return s.ipa; });
      var chosen = ukIpa || usIpa || anyIpa;
      ipa = chosen ? chosen.ipa : '';
    }

    // Strip surrounding /…/ from IPA
    if (ipa) ipa = ipa.replace(/^\/|\/$/g, '').trim();

    var pos = POS_MAP[entry.pos] || entry.pos || '';
    var definition = '', example = '', synonyms = [], antonyms = [];

    if (entry.senses && entry.senses.length) {
      var allDefs = [], allExamples = [];
      var synSet = new Set(), antSet = new Set();
      entry.senses.forEach(function (s) {
        var gloss = (s.glosses && s.glosses[0]) || '';
        if (gloss) allDefs.push(gloss);
        (s.examples || []).forEach(function (ex) {
          if (ex.text) allExamples.push(ex.text);
        });
        (s.synonyms || []).forEach(function (x) { if (x.word) synSet.add(x.word); });
        (s.antonyms || []).forEach(function (x) { if (x.word) antSet.add(x.word); });
      });
      if (allDefs.length === 1) {
        definition = allDefs[0];
      } else if (allDefs.length > 1) {
        definition = allDefs.map(function (d, i) { return (i + 1) + '. ' + d; }).join(' ');
      }
      if (allExamples.length === 1) {
        example = allExamples[0];
      } else if (allExamples.length > 1) {
        example = allExamples.map(function (e, i) { return (i + 1) + '. ' + e; }).join(' ');
      }
      synonyms = Array.from(synSet);
      antonyms = Array.from(antSet);
    }

    var wordLower = (entry.word || '').toLowerCase();
    var otherForms = [];
    if (entry.forms) {
      entry.forms.forEach(function (f) {
        var formStr = (f.form || '').trim();
        if (formStr && formStr.toLowerCase() !== wordLower &&
            !formStr.includes('[') && !formStr.includes(' or ') &&
            !otherForms.includes(formStr)) {
          otherForms.push(formStr);
        }
      });
    }

    return { ipa: ipa, pos: pos, definition: definition, example: example,
             synonyms: synonyms, antonyms: antonyms, otherForms: otherForms };
  }

  window.WiktionaryLookup = {
    isAvailable: function () {
      return !!(window.BarrasDesktop && window.BarrasDesktop.isElectron());
    },
    find: function (word, preferredPos) {
      if (!word || !this.isAvailable()) return Promise.resolve(null);
      return loadIndex().then(function (index) {
        var entries = index.get((word || '').toLowerCase().trim());
        if (!entries || !entries.length) return null;
        return extractData(pickEntry(entries, preferredPos));
      });
    }
  };
}());
