/**
 * Class Management Tools — Distant Reading Collocations, Idioms & KWIC Engine
 * Pure client-side, offline-first phraseology and concordance analyzer.
 *
 * Implements:
 * 1. Statistical Bigram & Trigram extraction with PMI, Log-Likelihood (G²), t-score, and frequency
 * 2. Built-in EN/FR literary & conversational idiom / phrasal expression detector (extensible for DE/IT)
 * 3. Statistical Multi-Word Expression (MWE) / lexical bundle discovery
 * 4. Fast KWIC (Key Word In Context) concordance viewer
 */

(function (global) {
  'use strict';

  const FUNCTION_WORDS = new Set([
    // EN
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do',
    'does', 'did', 'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i', 'me', 'him', 'her',
    'his', 'their', 'our', 'my', 'your', 'that', 'this', 'these', 'those', 'which', 'who',
    'not', 'no', 'so', 'there', 'here', 'then', 'than', 'when', 'where', 'what',
    // FR
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux', 'et', 'ou', 'mais',
    'dans', 'sur', 'sous', 'par', 'pour', 'avec', 'sans', 'en', 'est', 'sont', 'était',
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'ce', 'cette', 'ces',
    'que', 'qui', 'ne', 'pas', 'plus', 'se', 'son', 'sa', 'ses',
    // DE
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'in', 'im', 'an', 'auf',
    'mit', 'von', 'zu', 'für', 'ist', 'sind', 'war', 'ich', 'du', 'er', 'sie', 'es', 'nicht',
    // IT
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'e', 'o', 'ma', 'di', 'del', 'della',
    'da', 'in', 'con', 'su', 'per', 'che', 'non'
  ]);

  // Curated offline idioms & fixed literary expressions (EN & FR, extensible for DE/IT)
  const IDIOM_LEXICON = {
    en: [
      'at first sight', 'at last', 'at once', 'by and by', 'by chance', 'by heart',
      'break the ice', 'broken heart', 'catch sight of', 'come to pass', 'face to face',
      'fall in love', 'far and wide', 'for good', 'for the sake of', 'from time to time',
      'hand in hand', 'heart and soul', 'in vain', 'in cold blood', 'in the long run',
      'keep in mind', 'lose heart', 'lose sight of', 'make up one\'s mind', 'no doubt',
      'of course', 'on the contrary', 'on the other hand', 'once upon a time', 'out of place',
      'out of sight', 'pay attention', 'side by side', 'sooner or later', 'take care',
      'take place', 'to and fro', 'under the circumstances', 'up to date', 'word for word'
    ],
    fr: [
      'à bientôt', 'à bout de', 'à vrai dire', 'au bout du compte', 'au fur et à mesure',
      'avoir beau', 'avoir lieu', 'avoir peur', 'avoir raison', 'avoir tort', 'bel et bien',
      'bien sûr', 'bon gré mal gré', 'cœur brisé', 'coup d\'œil', 'coup de foudre',
      'd\'un seul coup', 'de temps en temps', 'du moins', 'en effet', 'en fait', 'en vain',
      'face à face', 'faire attention', 'faire semblant', 'il y a', 'main dans la main',
      'mot à mot', 'n\'importe quoi', 'par hasard', 'peu à peu', 'pour ainsi dire',
      'quelque chose', 'sans doute', 'sur le champ', 'tant bien que mal', 'tout à coup',
      'tout à fait', 'tout de suite', 'une fois pour toutes'
    ],
    de: [
      'auf einmal', 'auf jeden fall', 'aus diesem grund', 'hin und her', 'im gegenteil',
      'nach und nach', 'ohne zweifel', 'sofort', 'um gottes willen', 'von zeit zu zeit',
      'zum beispiel', 'zum ersten mal'
    ],
    it: [
      'a poco a poco', 'all\'improvviso', 'colpo di fulmine', 'di tanto in tanto',
      'faccia a faccia', 'in effetti', 'in ogni caso', 'mano nella mano', 'per esempio',
      'senza dubbio', 'tutto a un tratto'
    ]
  };

  function safeLog2(x) {
    return x > 0 ? Math.log2(x) : 0;
  }

  function computeG2(o11, r1, c1, n) {
    // 2x2 Log-Likelihood Ratio (Dunning G^2)
    const o12 = Math.max(0, r1 - o11);
    const o21 = Math.max(0, c1 - o11);
    const o22 = Math.max(0, n - r1 - c1 + o11);
    const r2 = n - r1;
    const c2 = n - c1;
    if (n <= 0 || r1 <= 0 || r2 <= 0 || c1 <= 0 || c2 <= 0) return 0;

    const term = (obs, exp) => (obs > 0 && exp > 0 ? obs * Math.log(obs / exp) : 0);
    const e11 = (r1 * c1) / n;
    const e12 = (r1 * c2) / n;
    const e21 = (r2 * c1) / n;
    const e22 = (r2 * c2) / n;

    return 2 * (term(o11, e11) + term(o12, e12) + term(o21, e21) + term(o22, e22));
  }

  const DistantReadingCollocations = {
    /**
     * Extract statistical bigrams & trigrams with PMI, Log-Likelihood (G²), t-score.
     */
    async extractCollocations(rawText, options = {}) {
      const text = String(rawText || '');
      if (!text.trim()) return { bigrams: [], trigrams: [] };

      const minFreq = Math.max(2, options.minFreq || 3);
      const maxResults = Math.max(10, options.maxResults || 40);
      const excludeFunctionPairs = options.excludeFunctionPairs !== false;

      // Split into sentence-like spans so n-grams never cross sentence boundaries
      const spans = text.split(/[.!?;:\r\n]+/);
      const unigramCounts = new Map();
      const bigramCounts = new Map();
      const trigramCounts = new Map();
      let totalTokens = 0;
      let totalBigrams = 0;

      for (let s = 0; s < spans.length; s++) {
        const tokens = (spans[s].toLowerCase().match(/[a-zà-öø-ÿ']+/g) || [])
          .map(t => t.replace(/^'+|'+$/g, ''))
          .filter(t => t.length >= 2);

        for (let i = 0; i < tokens.length; i++) {
          const w1 = tokens[i];
          unigramCounts.set(w1, (unigramCounts.get(w1) || 0) + 1);
          totalTokens++;

          if (i + 1 < tokens.length) {
            const w2 = tokens[i + 1];
            const skip = excludeFunctionPairs && (FUNCTION_WORDS.has(w1) || FUNCTION_WORDS.has(w2));
            if (!skip) {
              const key = w1 + ' ' + w2;
              bigramCounts.set(key, (bigramCounts.get(key) || 0) + 1);
            }
            totalBigrams++;
          }

          if (i + 2 < tokens.length) {
            const w2 = tokens[i + 1];
            const w3 = tokens[i + 2];
            const skipTri = excludeFunctionPairs && FUNCTION_WORDS.has(w1) && FUNCTION_WORDS.has(w3);
            if (!skipTri && (!FUNCTION_WORDS.has(w1) || !FUNCTION_WORDS.has(w2) || !FUNCTION_WORDS.has(w3))) {
              const tKey = w1 + ' ' + w2 + ' ' + w3;
              trigramCounts.set(tKey, (trigramCounts.get(tKey) || 0) + 1);
            }
          }
        }
        if (s % 400 === 399) await new Promise(r => setTimeout(r, 0));
      }

      const bigrams = [];
      bigramCounts.forEach((count, phrase) => {
        if (count < minFreq) return;
        const [w1, w2] = phrase.split(' ');
        const c1 = unigramCounts.get(w1) || 1;
        const c2 = unigramCounts.get(w2) || 1;
        const p12 = count / Math.max(1, totalBigrams);
        const p1 = c1 / Math.max(1, totalTokens);
        const p2 = c2 / Math.max(1, totalTokens);
        const pmi = safeLog2(p12 / (p1 * p2));
        const g2 = computeG2(count, c1, c2, totalTokens);
        const tScore = (count - (c1 * c2) / Math.max(1, totalTokens)) / Math.sqrt(count);

        bigrams.push({
          phrase,
          count,
          pmi: Math.round(pmi * 100) / 100,
          g2: Math.round(g2 * 10) / 10,
          tScore: Math.round(tScore * 100) / 100
        });
      });

      bigrams.sort((a, b) => b.g2 - a.g2);

      const trigrams = [];
      trigramCounts.forEach((count, phrase) => {
        if (count < minFreq) return;
        const parts = phrase.split(' ');
        const c1 = unigramCounts.get(parts[0]) || 1;
        const c2 = unigramCounts.get(parts[1]) || 1;
        const c3 = unigramCounts.get(parts[2]) || 1;
        const p123 = count / Math.max(1, totalTokens);
        const pInd = (c1 / totalTokens) * (c2 / totalTokens) * (c3 / totalTokens);
        const pmi = safeLog2(p123 / Math.max(1e-12, pInd));
        trigrams.push({
          phrase,
          count,
          pmi: Math.round(pmi * 100) / 100,
          g2: Math.round(count * Math.max(1, pmi) * 10) / 10
        });
      });
      trigrams.sort((a, b) => b.count - a.count || b.pmi - a.pmi);

      return {
        bigrams: bigrams.slice(0, maxResults),
        trigrams: trigrams.slice(0, maxResults)
      };
    },

    /**
     * Detect known literary/conversational idioms & recurring multi-word expressions.
     */
    async detectIdiomsAndMWEs(rawText, lang = 'en', collocations = null) {
      const text = String(rawText || '').toLowerCase();
      if (!text.trim()) return { idioms: [], mwes: [] };

      const list = IDIOM_LEXICON[lang] || IDIOM_LEXICON.en;
      const idioms = [];
      for (let i = 0; i < list.length; i++) {
        const phrase = list[i];
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('(?:^|[^a-zà-öø-ÿ])' + escaped + '(?:$|[^a-zà-öø-ÿ])', 'gi');
        const matches = text.match(re);
        if (matches && matches.length > 0) {
          idioms.push({ phrase, count: matches.length, type: 'idiom' });
        }
        if (i % 15 === 14) await new Promise(r => setTimeout(r, 0));
      }
      idioms.sort((a, b) => b.count - a.count);

      // Recurring statistical MWEs (from trigrams with high frequency or bigrams with very high PMI)
      const col = collocations || await this.extractCollocations(rawText, { minFreq: 3, maxResults: 30 });
      const mwes = [];
      (col.trigrams || []).slice(0, 15).forEach(t => {
        mwes.push({ phrase: t.phrase, count: t.count, score: t.pmi, type: 'bundle' });
      });

      return { idioms, mwes };
    },

    /**
     * Key Word In Context (KWIC) concordance extractor.
     */
    findConcordances(rawText, query, contextWords = 8, maxResults = 60) {
      const cleanQuery = String(query || '').trim();
      if (!rawText || !cleanQuery) return [];

      const words = String(rawText).replace(/\s+/g, ' ').trim().split(' ');
      const qParts = cleanQuery.toLowerCase().split(/\s+/);
      const qLen = qParts.length;
      const results = [];

      for (let i = 0; i <= words.length - qLen; i++) {
        let matched = true;
        for (let j = 0; j < qLen; j++) {
          const wClean = words[i + j].toLowerCase().replace(/^[^\wà-öø-ÿ]+|[^\wà-öø-ÿ]+$/g, '');
          if (wClean !== qParts[j]) {
            matched = false;
            break;
          }
        }
        if (matched) {
          const leftStart = Math.max(0, i - contextWords);
          const rightEnd = Math.min(words.length, i + qLen + contextWords);
          results.push({
            left: words.slice(leftStart, i).join(' '),
            match: words.slice(i, i + qLen).join(' '),
            right: words.slice(i + qLen, rightEnd).join(' '),
            positionPct: Math.round((i / Math.max(1, words.length)) * 100)
          });
          if (results.length >= maxResults) break;
        }
      }

      return results;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DistantReadingCollocations;
  }
  if (typeof global !== 'undefined') {
    global.DistantReadingCollocations = DistantReadingCollocations;
  }
})(typeof window !== 'undefined' ? window : globalThis);
