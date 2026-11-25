/**
 * Class Management Tools — Distant Reading Stylistics & Readability Engine
 * Pure client-side, offline-first stylometric and readability analyzer.
 *
 * Implements:
 * 1. Multi-language syllable counting (rule-based EN + vowel-group fallback for FR/DE/IT)
 * 2. Readability indices: Flesch-Kincaid Grade, Flesch Reading Ease, Kandel-Moles (FR),
 *    Gunning Fog, SMOG, Automated Readability Index (ARI), and LIX (language-agnostic)
 * 3. Lexical richness: TTR, Moving-Average TTR (MATTR), Hapax Legomena %, Yule's K
 * 4. Syntax & pacing: sentence length stats & histogram, dialogue ratio, punctuation profile
 * 5. Narrative readability & pacing curve across chapters or equal segments
 */

(function (global) {
  'use strict';

  function countSyllables(word, lang) {
    const clean = String(word || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]/g, '');
    if (!clean) return 0;
    if (clean.length <= 3) return 1;

    if (lang === 'en' || !lang) {
      let w = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
      w = w.replace(/^y/, '');
      const matches = w.match(/[aeiouy]{1,2}/g);
      return Math.max(1, matches ? matches.length : 1);
    }

    // Vowel-cluster approximation for FR / DE / IT
    let w = clean;
    if (lang === 'fr') {
      w = w.replace(/e$/, '');
    }
    const groups = w.match(/[aeiouy]+/g);
    return Math.max(1, groups ? groups.length : 1);
  }

  function splitSentences(rawText) {
    const normalized = String(rawText || '').replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    const raw = normalized.split(/(?<=[.!?…])\s+(?=["«"'(\[]?[A-ZÀ-ÖØ-ß0-9])/);
    return raw.map(s => s.trim()).filter(s => s.length > 0 && /[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(s));
  }

  function tokenizeWords(text) {
    const matches = String(text || '').match(/[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’\-][A-Za-zÀ-ÖØ-öø-ÿ]+)*/g);
    return matches || [];
  }

  function computeReadabilityMetrics(words, sentences, lang) {
    const wordCount = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    if (wordCount === 0) {
      return {
        wordCount: 0,
        sentenceCount: 0,
        syllableCount: 0,
        fleschKincaidGrade: 0,
        fleschReadingEase: 0,
        kandelMoles: 0,
        gunningFog: 0,
        smog: 0,
        ari: 0,
        lix: 0,
        avgSentenceLength: 0,
        avgSyllablesPerWord: 0,
        avgWordLength: 0
      };
    }

    let syllableCount = 0;
    let complexWords = 0; // >= 3 syllables
    let longWords = 0;    // > 6 chars (for LIX)
    let charCount = 0;

    for (let i = 0; i < wordCount; i++) {
      const w = words[i];
      const letters = w.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
      charCount += letters.length;
      if (letters.length > 6) longWords++;
      const syl = countSyllables(letters, lang);
      syllableCount += syl;
      if (syl >= 3) complexWords++;
    }

    const asl = wordCount / sentenceCount;
    const asw = syllableCount / wordCount;
    const acw = charCount / wordCount;
    const pctComplex = (complexWords / wordCount) * 100;
    const pctLong = (longWords / wordCount) * 100;

    const fleschKincaidGrade = 0.39 * asl + 11.8 * asw - 15.59;
    const fleschReadingEase = 206.835 - 1.015 * asl - 84.6 * asw;
    // Kandel & Moles (French Flesch adaptation)
    const kandelMoles = 207 - 1.015 * asl - 73.6 * asw;
    const gunningFog = 0.4 * (asl + pctComplex);
    const smog = sentenceCount >= 3
      ? 1.043 * Math.sqrt(complexWords * (30 / sentenceCount)) + 3.1291
      : 0;
    const ari = 4.71 * acw + 0.5 * asl - 21.43;
    const lix = asl + pctLong;

    const round1 = v => Math.round(v * 10) / 10;
    const round2 = v => Math.round(v * 100) / 100;

    return {
      wordCount,
      sentenceCount,
      syllableCount,
      complexWords,
      longWords,
      fleschKincaidGrade: round1(Math.max(0, fleschKincaidGrade)),
      fleschReadingEase: round1(Math.max(0, Math.min(120, fleschReadingEase))),
      kandelMoles: round1(Math.max(0, Math.min(120, kandelMoles))),
      gunningFog: round1(Math.max(0, gunningFog)),
      smog: round1(Math.max(0, smog)),
      ari: round1(Math.max(0, ari)),
      lix: round1(Math.max(0, lix)),
      avgSentenceLength: round1(asl),
      avgSyllablesPerWord: round2(asw),
      avgWordLength: round2(acw)
    };
  }

  function computeLexicalRichness(words) {
    const n = words.length;
    if (n === 0) {
      return {
        uniqueWords: 0,
        ttr: 0,
        mattr: 0,
        hapaxCount: 0,
        hapaxRatio: 0,
        yulesK: 0
      };
    }

    const freq = new Map();
    const lowerWords = new Array(n);
    for (let i = 0; i < n; i++) {
      const lw = words[i].toLowerCase();
      lowerWords[i] = lw;
      freq.set(lw, (freq.get(lw) || 0) + 1);
    }

    const uniqueWords = freq.size;
    const ttr = uniqueWords / n;

    // Hapax legomena & Yule's K
    let hapaxCount = 0;
    const freqOfFreq = new Map();
    freq.forEach(count => {
      if (count === 1) hapaxCount++;
      freqOfFreq.set(count, (freqOfFreq.get(count) || 0) + 1);
    });

    let sumM2 = 0;
    freqOfFreq.forEach((vm, m) => {
      sumM2 += vm * m * m;
    });
    const yulesK = n > 0 ? 10000 * ((sumM2 - n) / (n * n)) : 0;

    // Moving-Average TTR (MATTR) over 500-word sliding windows (length-independent)
    const winSize = Math.min(500, n);
    let mattr = ttr;
    if (n > winSize) {
      const winFreq = new Map();
      for (let i = 0; i < winSize; i++) {
        const w = lowerWords[i];
        winFreq.set(w, (winFreq.get(w) || 0) + 1);
      }
      let sumTtr = winFreq.size / winSize;
      let steps = 1;
      for (let i = winSize; i < n; i++) {
        const outW = lowerWords[i - winSize];
        const inW = lowerWords[i];
        const outCount = winFreq.get(outW) - 1;
        if (outCount <= 0) winFreq.delete(outW);
        else winFreq.set(outW, outCount);
        winFreq.set(inW, (winFreq.get(inW) || 0) + 1);
        sumTtr += winFreq.size / winSize;
        steps++;
      }
      mattr = sumTtr / steps;
    }

    return {
      uniqueWords,
      ttr: Math.round(ttr * 1000) / 1000,
      mattr: Math.round(mattr * 1000) / 1000,
      hapaxCount,
      hapaxRatio: Math.round((hapaxCount / uniqueWords) * 1000) / 10,
      yulesK: Math.round(yulesK * 10) / 10
    };
  }

  function computeSyntaxAndPacing(rawText, sentences) {
    const lengths = sentences.map(s => tokenizeWords(s).length).filter(l => l > 0);
    lengths.sort((a, b) => a - b);

    const count = lengths.length;
    const medianSentenceLength = count > 0
      ? (count % 2 === 1 ? lengths[(count - 1) / 2] : (lengths[count / 2 - 1] + lengths[count / 2]) / 2)
      : 0;
    const mean = count > 0 ? lengths.reduce((a, b) => a + b, 0) / count : 0;
    const variance = count > 0
      ? lengths.reduce((acc, l) => acc + Math.pow(l - mean, 2), 0) / count
      : 0;
    const stdDevSentenceLength = Math.round(Math.sqrt(variance) * 10) / 10;

    const buckets = [
      { label: '1-5', min: 1, max: 5, count: 0 },
      { label: '6-10', min: 6, max: 10, count: 0 },
      { label: '11-15', min: 11, max: 15, count: 0 },
      { label: '16-25', min: 16, max: 25, count: 0 },
      { label: '26-40', min: 26, max: 40, count: 0 },
      { label: '41+', min: 41, max: Infinity, count: 0 }
    ];
    lengths.forEach(l => {
      for (let i = 0; i < buckets.length; i++) {
        if (l >= buckets[i].min && l <= buckets[i].max) {
          buckets[i].count++;
          break;
        }
      }
    });

    // Dialogue detection: straight/curly quotes, guillemets, or French dialogue dashes
    const text = String(rawText || '');
    const quoteMatches = text.match(/(?:"[^"\n]{2,}"|“[^”\n]{2,}”|«[^»\n]{2,}»|^[—–-]\s+[^\n]+)/gm) || [];
    const dialogueChars = quoteMatches.reduce((acc, m) => acc + m.length, 0);
    const totalChars = Math.max(1, text.replace(/\s+/g, '').length);
    const dialogueRatio = Math.min(100, Math.round((dialogueChars / totalChars) * 1000) / 10);

    const exclamations = (text.match(/!/g) || []).length;
    const questions = (text.match(/\?/g) || []).length;
    const semicolons = (text.match(/;/g) || []).length;
    const dashes = (text.match(/[—–]/g) || []).length;

    return {
      medianSentenceLength: Math.round(medianSentenceLength * 10) / 10,
      stdDevSentenceLength,
      sentenceLengthHistogram: buckets,
      dialogueRatio,
      punctuation: { exclamations, questions, semicolons, dashes }
    };
  }

  function segmentForCurve(rawText, targetSegments = 12) {
    const text = String(rawText || '').trim();
    if (!text) return [];
    const chapters = text.split(/(?:\r?\n)+(?=(?:chapter|chapitre|kapitel|capitolo|book|livre|part|partie)\b)/i)
      .map(c => c.trim())
      .filter(c => c.length > 80);

    if (chapters.length >= 3 && chapters.length <= 40) {
      return chapters.map((c, idx) => ({ label: 'Ch ' + (idx + 1), text: c }));
    }

    const words = text.split(/\s+/);
    const segCount = Math.min(targetSegments, Math.max(1, Math.floor(words.length / 80)));
    const segSize = Math.ceil(words.length / segCount);
    const segments = [];
    for (let i = 0; i < segCount; i++) {
      const slice = words.slice(i * segSize, (i + 1) * segSize).join(' ');
      if (slice.trim()) {
        segments.push({ label: String(i + 1), text: slice });
      }
    }
    return segments;
  }

  const DistantReadingStylistics = {
    countSyllables,

    /**
     * Run full stylometric & readability analysis asynchronously.
     *
     * @param {string} rawText
     * @param {object} options - { lang?: 'en'|'fr'|'de'|'it' }
     * @returns {Promise<object>}
     */
    async analyze(rawText, options = {}) {
      const text = String(rawText || '');
      if (!text.trim()) {
        return {
          lang: options.lang || 'en',
          readability: computeReadabilityMetrics([], [], 'en'),
          lexical: computeLexicalRichness([]),
          syntax: computeSyntaxAndPacing('', []),
          curve: []
        };
      }

      const lang = options.lang || (global.CharacterNetworkService && typeof global.CharacterNetworkService.detectLanguage === 'function'
        ? global.CharacterNetworkService.detectLanguage(text)
        : 'en');

      const sentences = splitSentences(text);
      const words = tokenizeWords(text);

      await new Promise(r => setTimeout(r, 0));
      const readability = computeReadabilityMetrics(words, sentences, lang);

      await new Promise(r => setTimeout(r, 0));
      const lexical = computeLexicalRichness(words);

      await new Promise(r => setTimeout(r, 0));
      const syntax = computeSyntaxAndPacing(text, sentences);

      const segs = segmentForCurve(text, 12);
      const curve = [];
      for (let i = 0; i < segs.length; i++) {
        const sSentences = splitSentences(segs[i].text);
        const sWords = tokenizeWords(segs[i].text);
        const r = computeReadabilityMetrics(sWords, sSentences, lang);
        const syn = computeSyntaxAndPacing(segs[i].text, sSentences);
        curve.push({
          label: segs[i].label,
          fleschKincaidGrade: r.fleschKincaidGrade,
          lix: r.lix,
          avgSentenceLength: r.avgSentenceLength,
          dialogueRatio: syn.dialogueRatio
        });
        if (i % 4 === 3) await new Promise(r => setTimeout(r, 0));
      }

      return {
        lang,
        readability,
        lexical,
        syntax,
        curve
      };
    },

    /**
     * Extract sample sentences explaining a specific stylistic metric or bucket.
     */
    findStatExamples(rawText, category, param = {}, maxExamples = 25) {
      const sentences = splitSentences(rawText);
      if (sentences.length === 0) return [];
      const results = [];

      if (category === 'bucket') {
        const min = Number(param.min) || 1;
        const max = param.max === Infinity || param.max == null ? Infinity : Number(param.max);
        for (let i = 0; i < sentences.length; i++) {
          const wCount = tokenizeWords(sentences[i]).length;
          if (wCount >= min && wCount <= max) {
            results.push({ sentence: sentences[i], highlights: [], meta: wCount + ' words' });
            if (results.length >= maxExamples) break;
          }
        }
        return results;
      }

      if (category === 'dialogue') {
        const re = /(?:"[^"\n]{2,}"|“[^”\n]{2,}”|«[^»\n]{2,}»|^[—–-]\s+[^\n]+)/;
        for (let i = 0; i < sentences.length; i++) {
          const m = sentences[i].match(re);
          if (m) {
            results.push({ sentence: sentences[i], highlights: [m[0]], meta: 'Dialogue' });
            if (results.length >= maxExamples) break;
          }
        }
        return results;
      }

      if (category === 'hapax') {
        const words = tokenizeWords(rawText);
        const freq = new Map();
        words.forEach(w => {
          const lw = w.toLowerCase();
          freq.set(lw, (freq.get(lw) || 0) + 1);
        });
        for (let i = 0; i < sentences.length; i++) {
          const sWords = tokenizeWords(sentences[i]);
          const hapaxes = sWords.filter(w => freq.get(w.toLowerCase()) === 1 && w.length >= 5);
          if (hapaxes.length > 0) {
            results.push({ sentence: sentences[i], highlights: hapaxes.slice(0, 4), meta: hapaxes[0] });
            if (results.length >= maxExamples) break;
          }
        }
        return results;
      }

      // Default 'complex': longest / highest-syllable sentences driving readability grade
      const scored = sentences.map(s => {
        const ws = tokenizeWords(s);
        const complexCount = ws.filter(w => countSyllables(w, param.lang || 'en') >= 3).length;
        return { sentence: s, score: ws.length + complexCount * 3, wc: ws.length, cc: complexCount };
      }).filter(x => x.wc >= 8);
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, maxExamples).map(x => ({
        sentence: x.sentence,
        highlights: [],
        meta: x.wc + ' words, ' + x.cc + ' complex'
      }));
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DistantReadingStylistics;
  }
  if (typeof global !== 'undefined') {
    global.DistantReadingStylistics = DistantReadingStylistics;
  }
})(typeof window !== 'undefined' ? window : globalThis);
