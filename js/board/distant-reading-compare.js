/**
 * Class Management Tools — Distant Reading Book Comparison Engine
 * Compares two texts/novels across stylistics, themes, narrative arcs,
 * vocabulary overlap (Jaccard), distinctive keywords, and collocations.
 */

(function (global) {
  'use strict';

  const CMP_STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do',
    'does', 'did', 'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i', 'me', 'him', 'her',
    'his', 'their', 'our', 'my', 'your', 'that', 'this', 'these', 'those', 'which', 'who',
    'not', 'no', 'so', 'there', 'here', 'then', 'than', 'when', 'where', 'what', 'said',
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux', 'et', 'ou', 'mais',
    'dans', 'sur', 'sous', 'par', 'pour', 'avec', 'sans', 'en', 'est', 'sont', 'était',
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'ce', 'cette', 'ces',
    'que', 'qui', 'ne', 'pas', 'plus', 'se', 'son', 'sa', 'ses', 'dit',
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'in', 'im', 'auf', 'mit', 'von', 'zu', 'ist', 'nicht',
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'e', 'o', 'ma', 'di', 'del', 'della', 'da', 'in', 'con', 'che', 'non'
  ]);

  function tokenizeContent(text) {
    return (String(text || '').toLowerCase().match(/[a-zà-öø-ÿ]{3,}/g) || [])
      .filter(w => !CMP_STOPWORDS.has(w));
  }

  function computeDistinctiveAndOverlap(textA, textB, maxItems = 15) {
    const tokA = tokenizeContent(textA);
    const tokB = tokenizeContent(textB);
    const freqA = new Map();
    const freqB = new Map();

    tokA.forEach(w => freqA.set(w, (freqA.get(w) || 0) + 1));
    tokB.forEach(w => freqB.set(w, (freqB.get(w) || 0) + 1));

    const vocabA = new Set(freqA.keys());
    const vocabB = new Set(freqB.keys());
    let intersection = 0;
    vocabA.forEach(w => { if (vocabB.has(w)) intersection++; });
    const union = vocabA.size + vocabB.size - intersection;
    const jaccardPct = union > 0 ? Math.round((intersection / union) * 1000) / 10 : 0;

    // Log-odds ratio with smoothing for distinctive vocabulary
    const nA = Math.max(1, tokA.length);
    const nB = Math.max(1, tokB.length);
    const allWords = new Set([...vocabA, ...vocabB]);
    const distinctiveA = [];
    const distinctiveB = [];

    allWords.forEach(w => {
      const cA = freqA.get(w) || 0;
      const cB = freqB.get(w) || 0;
      if (cA + cB < 3) return;
      const rA = (cA + 0.5) / (nA + 1);
      const rB = (cB + 0.5) / (nB + 1);
      const logRatio = Math.log2(rA / rB);
      if (logRatio > 0.6 && cA >= 2) {
        distinctiveA.push({ term: w, countA: cA, countB: cB, score: Math.round(logRatio * 100) / 100 });
      } else if (logRatio < -0.6 && cB >= 2) {
        distinctiveB.push({ term: w, countA: cA, countB: cB, score: Math.round(Math.abs(logRatio) * 100) / 100 });
      }
    });

    distinctiveA.sort((a, b) => b.score - a.score || b.countA - a.countA);
    distinctiveB.sort((a, b) => b.score - a.score || b.countB - a.countB);

    return {
      jaccardPct,
      sharedVocabCount: intersection,
      distinctiveA: distinctiveA.slice(0, maxItems),
      distinctiveB: distinctiveB.slice(0, maxItems)
    };
  }

  const DistantReadingCompare = {
    /**
     * Compare two texts across stylistics, themes, narrative arc, vocabulary, and collocations.
     */
    async compareTexts(textA, textB, options = {}) {
      const a = String(textA || '');
      const b = String(textB || '');
      if (!a.trim() || !b.trim()) {
        throw new Error('Both texts must be non-empty to compare.');
      }

      const [stylA, stylB, fieldsA, fieldsB, arcA, arcB, colA, colB] = await Promise.all([
        global.DistantReadingStylistics.analyze(a),
        global.DistantReadingStylistics.analyze(b),
        global.DistantReadingThemes.analyzeSemanticFields(a, options.customThemes || []),
        global.DistantReadingThemes.analyzeSemanticFields(b, options.customThemes || []),
        global.DistantReadingThemes.computeSentimentArc(a, 16),
        global.DistantReadingThemes.computeSentimentArc(b, 16),
        global.DistantReadingCollocations.extractCollocations(a, { minFreq: 2, maxResults: 25 }),
        global.DistantReadingCollocations.extractCollocations(b, { minFreq: 2, maxResults: 25 })
      ]);

      const vocab = computeDistinctiveAndOverlap(a, b, 14);

      const mapB = new Map();
      fieldsB.forEach(f => mapB.set(f.id, f));
      const themeComparison = fieldsA.map(fA => {
        const fB = mapB.get(fA.id) || { hits: 0, per10k: 0 };
        return {
          id: fA.id,
          labelKey: fA.labelKey,
          label: fA.label,
          color: fA.color,
          per10kA: fA.per10k,
          per10kB: fB.per10k,
          delta: Math.round((fB.per10k - fA.per10k) * 10) / 10
        };
      });

      const setColA = new Set((colA.bigrams || []).map(x => x.phrase));
      const sharedCollocations = (colB.bigrams || [])
        .filter(x => setColA.has(x.phrase))
        .map(x => x.phrase)
        .slice(0, 12);

      return {
        stylisticsA: stylA,
        stylisticsB: stylB,
        themeComparison,
        arcA,
        arcB,
        vocab,
        sharedCollocations,
        topCollocationsA: (colA.bigrams || []).slice(0, 8),
        topCollocationsB: (colB.bigrams || []).slice(0, 8)
      };
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DistantReadingCompare;
  }
  if (typeof global !== 'undefined') {
    global.DistantReadingCompare = DistantReadingCompare;
  }
})(typeof window !== 'undefined' ? window : globalThis);
