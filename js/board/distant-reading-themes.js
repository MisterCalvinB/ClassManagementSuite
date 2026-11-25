/**
 * Class Management Tools — Distant Reading Theme, Motif & Narrative Arc Engine
 * Pure client-side, offline-first thematic & sentiment analysis.
 *
 * Implements:
 * 1. BM25-saturated keyphrase & RAKE-style topic extraction with literary stopword filtering
 * 2. Language-segregated curated literary semantic fields (EN/FR/DE/IT) preventing cross-language collisions
 * 3. Weighted valence sentiment arc (AFINN-style -3..+3) with negation window & intensifier/downtoner scaling
 * 4. Character-Theme affinity matrix & sentence-level evidence extractor
 */

(function (global) {
  'use strict';

  const THEME_STOPWORDS = new Set([
    // EN (including coordinating conjunctions & archaic literary tags)
    'the', 'a', 'an', 'and', 'or', 'but', 'nor', 'yet', 'so', 'if', 'then', 'else', 'when', 'where', 'while',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'into', 'out', 'up', 'down',
    'over', 'under', 'about', 'against', 'between', 'through', 'during', 'before', 'after',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having',
    'do', 'does', 'did', 'doing', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'can', 'shall', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
    'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
    'what', 'which', 'who', 'whom', 'whose', 'not', 'no', 'yes', 'as', 'than', 'very',
    'just', 'only', 'also', 'more', 'most', 'some', 'any', 'all', 'each', 'every', 'other',
    'such', 'said', 'says', 'one', 'two', 'three', 'now', 'here', 'there', 'well', 'back',
    'thou', 'thee', 'thy', 'thine', 'hath', 'doth', 'quoth', 'ere', 'hence', 'whence',
    // FR
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux', 'et', 'ou', 'où', 'mais',
    'donc', 'ni', 'car', 'que', 'qui', 'quoi', 'dont', 'quand', 'comment',
    'pourquoi', 'si', 'comme', 'dans', 'sur', 'sous', 'par', 'pour', 'avec', 'sans', 'chez',
    'vers', 'entre', 'contre', 'est', 'sont', 'était', 'étaient', 'être', 'avoir', 'fait',
    'faire', 'dit', 'dire', 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'me', 'te', 'se', 'lui', 'leur', 'leurs', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son',
    'sa', 'ses', 'notre', 'votre', 'ce', 'cet', 'cette', 'ces', 'ne', 'pas', 'plus', 'tout',
    'tous', 'toute', 'toutes', 'bien', 'très', 'même', 'aussi', 'encore', 'déjà',
    // DE
    'der', 'die', 'das', 'ein', 'eine', 'einen', 'einem', 'einer', 'und', 'oder', 'aber',
    'denn', 'wenn', 'als', 'wie', 'wo', 'was', 'wer', 'in', 'im', 'an', 'am', 'auf', 'aus',
    'bei', 'mit', 'nach', 'seit', 'von', 'zu', 'zum', 'zur', 'für', 'über', 'unter', 'vor',
    'ist', 'sind', 'war', 'waren', 'sein', 'haben', 'hat', 'hatte', 'werden', 'wird', 'wurde',
    'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'nicht', 'kein', 'keine', 'auch', 'noch',
    'nur', 'schon', 'sehr', 'so', 'sagte',
    // IT
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'uno', 'e', 'ed', 'o', 'ma', 'però',
    'che', 'chi', 'cui', 'dove', 'quando', 'come', 'perché', 'se', 'di', 'del', 'della',
    'da', 'dal', 'in', 'nel', 'con', 'su', 'per', 'tra', 'fra', 'è', 'sono', 'era', 'erano',
    'essere', 'avere', 'ha', 'hanno', 'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'non',
    'più', 'molto', 'tutto', 'tutti', 'anche', 'disse'
  ]);

  // Language-segregated literary semantic fields (prevents e.g. EN "or" matching FR "or" = gold)
  const LITERARY_THEMES = [
    {
      id: 'love_desire',
      labelKey: 'drThemeLove',
      label: 'Love & Desire',
      color: '#c96b6b',
      termsByLang: {
        en: ['love', 'loved', 'lover', 'heart', 'kiss', 'passion', 'desire', 'beloved', 'affection', 'tenderness', 'embrace', 'romance', 'adore', 'devotion', 'yearning'],
        fr: ['amour', 'aimer', 'aimé', 'amant', 'coeur', 'cœur', 'baiser', 'passion', 'désir', 'tendresse', 'chéri', 'étreinte', 'romance', 'adorer', 'dévotion'],
        de: ['liebe', 'lieben', 'geliebt', 'herz', 'kuss', 'leidenschaft', 'sehnsucht', 'zärtlichkeit', 'umarmung', 'zuneigung'],
        it: ['amore', 'amare', 'amato', 'cuore', 'bacio', 'passione', 'desiderio', 'tenerezza', 'abbraccio', 'affetto']
      }
    },
    {
      id: 'conflict_war',
      labelKey: 'drThemeConflict',
      label: 'Conflict & Struggle',
      color: '#d97706',
      termsByLang: {
        en: ['war', 'battle', 'fight', 'fought', 'sword', 'blood', 'enemy', 'attack', 'weapon', 'anger', 'rage', 'fury', 'revenge', 'combat', 'struggle', 'clash'],
        fr: ['guerre', 'bataille', 'combat', 'combattre', 'épée', 'sang', 'ennemi', 'attaque', 'arme', 'colère', 'fureur', 'vengeance', 'lutte', 'affrontement'],
        de: ['krieg', 'kampf', 'kämpfen', 'schlacht', 'schwert', 'blut', 'feind', 'angriff', 'waffe', 'zorn', 'wut', 'rache'],
        it: ['guerra', 'battaglia', 'combattere', 'spada', 'sangue', 'nemico', 'attacco', 'arma', 'rabbia', 'furia', 'vendetta', 'lotta']
      }
    },
    {
      id: 'death_mortality',
      labelKey: 'drThemeDeath',
      label: 'Death & Mortality',
      color: '#475569',
      termsByLang: {
        en: ['death', 'dead', 'die', 'died', 'dying', 'grave', 'tomb', 'funeral', 'corpse', 'ghost', 'grief', 'mourning', 'sorrow', 'buried', 'mortality'],
        fr: ['mort', 'morte', 'mourir', 'tombe', 'tombeau', 'cadavre', 'deuil', 'chagrin', 'fantôme', 'funérailles', 'enseveli', 'trépas'],
        de: ['tod', 'tot', 'sterben', 'starb', 'grab', 'sarg', 'leiche', 'geist', 'trauer', 'beerdigung'],
        it: ['morte', 'morto', 'morire', 'tomba', 'sepolcro', 'cadavere', 'fantasma', 'lutto', 'funerale', 'dolore']
      }
    },
    {
      id: 'nature_landscape',
      labelKey: 'drThemeNature',
      label: 'Nature & Landscape',
      color: '#6abf8e',
      termsByLang: {
        en: ['tree', 'trees', 'forest', 'woods', 'sea', 'ocean', 'river', 'mountain', 'wind', 'rain', 'storm', 'sun', 'moon', 'star', 'sky', 'flower', 'meadow', 'valley'],
        fr: ['arbre', 'arbres', 'forêt', 'bois', 'mer', 'océan', 'rivière', 'fleuve', 'montagne', 'vent', 'pluie', 'orage', 'soleil', 'lune', 'étoile', 'ciel', 'fleur', 'vallée'],
        de: ['wald', 'baum', 'bäume', 'meer', 'ozean', 'fluss', 'berg', 'wind', 'regen', 'sturm', 'sonne', 'mond', 'stern', 'himmel', 'blume', 'tal'],
        it: ['albero', 'alberi', 'foresta', 'bosco', 'mare', 'oceano', 'fiume', 'montagna', 'vento', 'pioggia', 'tempesta', 'sole', 'luna', 'stella', 'cielo', 'fiore', 'valle']
      }
    },
    {
      id: 'power_politics',
      labelKey: 'drThemePower',
      label: 'Power & Authority',
      color: '#5b8fcc',
      termsByLang: {
        en: ['king', 'queen', 'crown', 'throne', 'law', 'justice', 'court', 'judge', 'prison', 'empire', 'rule', 'command', 'authority', 'power', 'reign'],
        fr: ['roi', 'reine', 'couronne', 'trône', 'loi', 'justice', 'cour', 'juge', 'prison', 'empire', 'pouvoir', 'autorité', 'règne', 'commander'],
        de: ['könig', 'königin', 'krone', 'thron', 'gesetz', 'gerechtigkeit', 'gericht', 'richter', 'gefängnis', 'reich', 'macht', 'herrschaft'],
        it: ['re', 'regina', 'corona', 'trono', 'legge', 'giustizia', 'corte', 'giudice', 'prigione', 'impero', 'potere', 'autorità', 'regno']
      }
    },
    {
      id: 'faith_fate',
      labelKey: 'drThemeFaith',
      label: 'Faith & Fate',
      color: '#8b7cc2',
      termsByLang: {
        en: ['god', 'heaven', 'hell', 'soul', 'pray', 'prayer', 'church', 'angel', 'devil', 'sin', 'destiny', 'fate', 'miracle', 'faith', 'sacred'],
        fr: ['dieu', 'ciel', 'enfer', 'âme', 'prière', 'prier', 'église', 'ange', 'diable', 'péché', 'destin', 'destinée', 'miracle', 'foi', 'sacré'],
        de: ['gott', 'himmel', 'hölle', 'seele', 'beten', 'gebet', 'kirche', 'engel', 'teufel', 'sünde', 'schicksal', 'wunder', 'glaube'],
        it: ['dio', 'cielo', 'inferno', 'anima', 'pregare', 'preghiera', 'chiesa', 'angelo', 'diavolo', 'peccato', 'destino', 'miracolo', 'fede']
      }
    },
    {
      id: 'time_memory',
      labelKey: 'drThemeTime',
      label: 'Time & Memory',
      color: '#0891b2',
      termsByLang: {
        en: ['time', 'memory', 'remember', 'forget', 'forgotten', 'past', 'future', 'youth', 'age', 'years', 'dream', 'childhood', 'nostalgia', 'eternity'],
        fr: ['temps', 'mémoire', 'souvenir', 'oublier', 'oublié', 'passé', 'avenir', 'jeunesse', 'vieillesse', 'années', 'rêve', 'enfance', 'éternité'],
        de: ['zeit', 'erinnerung', 'erinnern', 'vergessen', 'vergangenheit', 'zukunft', 'jugend', 'alter', 'jahre', 'traum', 'kindheit', 'ewigkeit'],
        it: ['tempo', 'memoria', 'ricordo', 'ricordare', 'dimenticare', 'passato', 'futuro', 'giovinezza', 'anni', 'sogno', 'infanzia', 'eternità']
      }
    },
    {
      id: 'wealth_class',
      labelKey: 'drThemeWealth',
      label: 'Wealth & Society',
      color: '#e2c96e',
      termsByLang: {
        en: ['gold', 'silver', 'money', 'rich', 'poor', 'wealth', 'fortune', 'debt', 'palace', 'servant', 'master', 'noble', 'estate', 'inheritance', 'luxury'],
        fr: ['richesse', 'argent', 'riche', 'pauvre', 'fortune', 'dette', 'palais', 'domestique', 'maître', 'noble', 'héritage', 'luxe', 'lingot'],
        de: ['gold', 'silber', 'geld', 'reich', 'arm', 'reichtum', 'vermögen', 'schulden', 'palast', 'diener', 'herr', 'adel', 'erbe'],
        it: ['oro', 'argento', 'denaro', 'ricco', 'povero', 'ricchezza', 'fortuna', 'debito', 'palazzo', 'servo', 'padrone', 'nobile', 'eredità']
      }
    },
    {
      id: 'mystery_deception',
      labelKey: 'drThemeMystery',
      label: 'Mystery & Deception',
      color: '#334155',
      termsByLang: {
        en: ['secret', 'shadow', 'shadows', 'darkness', 'lie', 'lies', 'truth', 'hidden', 'spy', 'betray', 'betrayal', 'mask', 'whisper', 'mystery', 'deception'],
        fr: ['secret', 'ombre', 'ombres', 'obscurité', 'mensonge', 'vérité', 'caché', 'espion', 'trahir', 'trahison', 'masque', 'chuchoter', 'mystère'],
        de: ['geheimnis', 'schatten', 'dunkelheit', 'lüge', 'wahrheit', 'versteckt', 'spion', 'verrat', 'maske', 'flüstern', 'rätsel'],
        it: ['segreto', 'ombra', 'ombre', 'oscurità', 'bugia', 'verità', 'nascosto', 'spia', 'tradire', 'tradimento', 'maschera', 'sussurro', 'mistero']
      }
    }
  ];

  // Weighted AFINN-style valence lexicon (-3..+3) separated by language
  const VALENCE_BY_LANG = {
    en: {
      love: 3, loved: 3, joy: 3, triumph: 3, victory: 3, wonderful: 3, delight: 3, miracle: 3, paradise: 3,
      happy: 2, happiness: 2, smile: 2, smiled: 2, laugh: 2, laughed: 2, hope: 2, peace: 2, beautiful: 2, pleasure: 2, grace: 2, mercy: 2, free: 2, freedom: 2,
      bright: 1, light: 1, gentle: 1, kind: 1, sweet: 1, good: 1, great: 1, warm: 1, friend: 1, calm: 1,
      cold: -1, dark: -1, shadow: -1, alone: -1, lonely: -1, fear: -1, afraid: -1, cry: -1, cried: -1, tears: -1, sad: -2,
      sorrow: -2, grief: -2, weep: -2, wept: -2, anger: -2, angry: -2, war: -2, enemy: -2, betray: -2, pain: -2, cruel: -2, evil: -2,
      hate: -3, hated: -3, terror: -3, death: -3, dead: -2, die: -2, kill: -3, killed: -3, agony: -3, rage: -3, despair: -3, curse: -3, horrible: -3, misery: -3
    },
    fr: {
      amour: 3, joie: 3, bonheur: 3, triomphe: 3, victoire: 3, merveilleux: 3, miracle: 3,
      heureux: 2, heureuse: 2, sourire: 2, rire: 2, espoir: 2, paix: 2, beau: 2, belle: 2, plaisir: 2, liberté: 2, grâce: 2,
      lumière: 1, doux: 1, douce: 1, bon: 1, bonne: 1, ami: 1, amie: 1, calme: 1,
      froid: -1, ombre: -1, noir: -1, seul: -1, peur: -1, larmes: -1,
      triste: -2, tristesse: -2, chagrin: -2, pleurer: -2, douleur: -2, colère: -2, guerre: -2, ennemi: -2, cruel: -2,
      haine: -3, terreur: -3, mort: -3, tuer: -3, agonie: -3, désespoir: -3, horrible: -3, misère: -3
    },
    de: {
      liebe: 3, freude: 3, glück: 3, sieg: 3, wunder: 3,
      hoffnung: 2, frieden: 2, schön: 2, lächeln: 2, freiheit: 2,
      licht: 1, freund: 1, sanft: 1, ruhe: 1,
      kalt: -1, dunkel: -1, angst: -1, einsam: -1,
      traurig: -2, schmerz: -2, krieg: -2, feind: -2, wut: -2,
      hass: -3, tod: -3, terror: -3, verzweiflung: -3, grausam: -3
    },
    it: {
      amore: 3, gioia: 3, vittoria: 3, miracolo: 3, meraviglioso: 3,
      felice: 2, sorriso: 2, speranza: 2, pace: 2, bello: 2, bella: 2, libertà: 2,
      luce: 1, amico: 1, dolce: 1, calma: 1,
      freddo: -1, buio: -1, paura: -1, solo: -1,
      triste: -2, dolore: -2, guerra: -2, nemico: -2, rabbia: -2,
      odio: -3, morte: -3, terrore: -3, disperazione: -3, crudele: -3
    }
  };

  const NEGATION_WORDS = new Set([
    'not', 'no', 'never', 'neither', 'nor', 'hardly', 'scarcely', 'barely', 'without',
    'ne', 'pas', 'jamais', 'rien', 'aucun', 'aucune', 'sans',
    'nicht', 'nie', 'niemals', 'kein', 'keine', 'ohne',
    'non', 'mai', 'nessuno', 'senza'
  ]);

  const AMPLIFIER_WORDS = new Set([
    'very', 'extremely', 'utterly', 'deeply', 'terribly', 'so', 'truly', 'completely',
    'très', 'extrêmement', 'profondément', 'tellement', 'vraiment',
    'sehr', 'extrem', 'tief', 'wirklich',
    'molto', 'estremamente', 'profondamente', 'davvero'
  ]);

  const DOWNTONER_WORDS = new Set([
    'slightly', 'somewhat', 'rather', 'almost', 'barely', 'little',
    'légèrement', 'plutôt', 'presque', 'peu',
    'etwas', 'kaum', 'wenig',
    'leggermente', 'piuttosto', 'quasi', 'poco'
  ]);

  function tokenizeLower(text) {
    return (String(text || '').toLowerCase().match(/[a-zà-öø-ÿ]+/g) || []);
  }

  function escapeRegex(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function _detectLang(rawText, explicitLang) {
    if (explicitLang && ['en', 'fr', 'de', 'it'].indexOf(explicitLang) !== -1) return explicitLang;
    if (global.CharacterNetworkService && typeof global.CharacterNetworkService.detectLanguage === 'function') {
      return global.CharacterNetworkService.detectLanguage(rawText);
    }
    return 'en';
  }

  function _resolveThemeTerms(theme, lang) {
    if (theme && theme.termsByLang) {
      return theme.termsByLang[lang] || theme.termsByLang.en || [];
    }
    return Array.isArray(theme && theme.terms) ? theme.terms : [];
  }

  const DistantReadingThemes = {
    getBuiltInThemes(lang = 'en') {
      return LITERARY_THEMES.map(t => ({
        id: t.id,
        labelKey: t.labelKey,
        label: t.label,
        color: t.color,
        terms: _resolveThemeTerms(t, lang).slice()
      }));
    },

    /**
     * Extract top keywords & multi-word keyphrases using BM25-saturated TF-IDF + RAKE scoring.
     */
    async extractKeyphrases(rawText, options = {}) {
      const text = String(rawText || '');
      if (!text.trim()) return { keywords: [], keyphrases: [] };

      const maxItems = Math.max(5, options.maxItems || 25);
      const words = tokenizeLower(text);
      const totalWords = words.length;
      if (totalWords === 0) return { keywords: [], keyphrases: [] };

      const numChunks = Math.min(12, Math.max(2, Math.floor(totalWords / 150)));
      const chunkSize = Math.ceil(totalWords / numChunks);
      const tfPerChunk = [];
      const chunkLengths = [];
      const df = new Map();
      const tfTotal = new Map();

      for (let c = 0; c < numChunks; c++) {
        const cMap = new Map();
        const start = c * chunkSize;
        const end = Math.min(totalWords, start + chunkSize);
        let cLen = 0;
        for (let i = start; i < end; i++) {
          const w = words[i];
          if (w.length < 3 || THEME_STOPWORDS.has(w)) continue;
          cLen++;
          tfTotal.set(w, (tfTotal.get(w) || 0) + 1);
          cMap.set(w, (cMap.get(w) || 0) + 1);
        }
        cMap.forEach((_cnt, term) => {
          df.set(term, (df.get(term) || 0) + 1);
        });
        tfPerChunk.push(cMap);
        chunkLengths.push(Math.max(1, cLen));
        if (c % 4 === 3) await new Promise(r => setTimeout(r, 0));
      }

      const avgLen = chunkLengths.reduce((a, b) => a + b, 0) / Math.max(1, numChunks);
      const k1 = 1.5;
      const b = 0.75;
      const keywords = [];

      tfTotal.forEach((totalCount, term) => {
        if (totalCount < 2) return;
        const docFreq = df.get(term) || 1;
        const idf = Math.log(1 + (numChunks - docFreq + 0.5) / (docFreq + 0.5));
        let bm25Sum = 0;
        for (let c = 0; c < numChunks; c++) {
          const tf = tfPerChunk[c].get(term) || 0;
          if (tf > 0) {
            const norm = 1 - b + b * (chunkLengths[c] / avgLen);
            bm25Sum += (tf * (k1 + 1)) / (tf + k1 * norm);
          }
        }
        keywords.push({
          term,
          count: totalCount,
          docFreq,
          score: Math.round(bm25Sum * idf * 100) / 100
        });
      });
      keywords.sort((a, bSort) => bSort.score - a.score);

      // RAKE-style 2-to-3 word candidate phrases split by stopwords/punctuation
      const phraseCounts = new Map();
      let currentPhrase = [];
      const rawTokens = text.toLowerCase().split(/([^a-zà-öø-ÿ]+)/);
      for (let i = 0; i < rawTokens.length; i++) {
        const tok = rawTokens[i].trim();
        if (!tok) continue;
        if (!/^[a-zà-öø-ÿ]+$/.test(tok) || THEME_STOPWORDS.has(tok) || tok.length < 3) {
          if (currentPhrase.length >= 2 && currentPhrase.length <= 3) {
            const p = currentPhrase.join(' ');
            phraseCounts.set(p, (phraseCounts.get(p) || 0) + 1);
          }
          currentPhrase = [];
        } else {
          currentPhrase.push(tok);
          if (currentPhrase.length > 3) currentPhrase = [];
        }
      }

      const keyphrases = [];
      phraseCounts.forEach((count, phrase) => {
        if (count < 2) return;
        const parts = phrase.split(' ');
        let sumScore = 0;
        parts.forEach(p => { sumScore += (tfTotal.get(p) || 1); });
        keyphrases.push({
          phrase,
          count,
          score: Math.round((sumScore / parts.length) * Math.log2(count + 1) * 10) / 10
        });
      });
      keyphrases.sort((a, bSort) => bSort.score - a.score);

      return {
        keywords: keywords.slice(0, maxItems),
        keyphrases: keyphrases.slice(0, maxItems)
      };
    },

    /**
     * Score language-segregated semantic fields + custom user-defined themes.
     */
    async analyzeSemanticFields(rawText, customThemes = [], options = {}) {
      const lang = _detectLang(rawText, options.lang);
      const words = tokenizeLower(rawText);
      const totalWords = Math.max(1, words.length);
      const freq = new Map();
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (THEME_STOPWORDS.has(w)) continue;
        freq.set(w, (freq.get(w) || 0) + 1);
      }

      await new Promise(r => setTimeout(r, 0));

      const allThemes = [...this.getBuiltInThemes(lang), ...(Array.isArray(customThemes) ? customThemes : [])];
      const results = allThemes.map(theme => {
        let hits = 0;
        const matchedTerms = [];
        const termSet = new Set(
          (theme.terms || [])
            .map(t => String(t).toLowerCase().trim())
            .filter(t => t && !THEME_STOPWORDS.has(t))
        );
        termSet.forEach(term => {
          const c = freq.get(term) || 0;
          if (c > 0) {
            hits += c;
            matchedTerms.push({ term, count: c });
          }
        });
        matchedTerms.sort((a, b) => b.count - a.count);
        const per10k = Math.round((hits / totalWords) * 100000) / 10;
        return {
          id: theme.id,
          labelKey: theme.labelKey || '',
          label: theme.label,
          color: theme.color || '#5b8fcc',
          hits,
          per10k,
          topTerms: matchedTerms.slice(0, 6)
        };
      });

      results.sort((a, b) => b.hits - a.hits);
      return results;
    },

    /**
     * Compute emotional / sentiment arc with AFINN-style weighted valence,
     * 3-token negation window, 2-token intensifier/downtoner multipliers, and smoothing.
     */
    async computeSentimentArc(rawText, segments = 16, options = {}) {
      const lang = _detectLang(rawText, options.lang);
      const lexicon = VALENCE_BY_LANG[lang] || VALENCE_BY_LANG.en;
      const words = tokenizeLower(rawText);
      const total = words.length;
      if (total < 20) return [];

      const count = Math.max(4, Math.min(30, segments));
      const sliceSize = Math.ceil(total / count);
      const arc = [];

      for (let s = 0; s < count; s++) {
        const start = s * sliceSize;
        const end = Math.min(total, start + sliceSize);
        let posWeight = 0;
        let negWeight = 0;

        for (let i = start; i < end; i++) {
          const w = words[i];
          const baseScore = lexicon[w];
          if (!baseScore) continue;

          let score = baseScore;
          // 2-token intensifier / downtoner check
          for (let back = 1; back <= 2 && i - back >= start; back++) {
            const prev = words[i - back];
            if (AMPLIFIER_WORDS.has(prev)) { score *= 1.4; break; }
            if (DOWNTONER_WORDS.has(prev)) { score *= 0.5; break; }
          }
          // 3-token negation window
          for (let back = 1; back <= 3 && i - back >= start; back++) {
            if (NEGATION_WORDS.has(words[i - back])) {
              score *= -0.75;
              break;
            }
          }

          if (score > 0) posWeight += score;
          else if (score < 0) negWeight += Math.abs(score);
        }

        const len = Math.max(1, end - start);
        const net = Math.round(((posWeight - negWeight) / len) * 10000) / 10;
        const intensity = Math.round(((posWeight + negWeight) / len) * 10000) / 10;
        arc.push({
          segment: s + 1,
          label: Math.round(((s + 0.5) / count) * 100) + '%',
          positive: Math.round(posWeight * 10) / 10,
          negative: Math.round(negWeight * 10) / 10,
          netValence: net,
          intensity
        });
        if (s % 6 === 5) await new Promise(r => setTimeout(r, 0));
      }

      // 3-point moving-average smoothing for clean story shape visualization
      for (let i = 0; i < arc.length; i++) {
        const prev = i > 0 ? arc[i - 1].netValence : arc[i].netValence;
        const next = i < arc.length - 1 ? arc[i + 1].netValence : arc[i].netValence;
        arc[i].smoothedValence = Math.round(((prev + arc[i].netValence + next) / 3) * 10) / 10;
      }

      return arc;
    },

    /**
     * Measure character-to-theme co-occurrence matrix across text windows.
     */
    async computeCharacterThemeMatrix(rawText, characterList, themes, windowSize = 150) {
      const activeChars = (characterList || []).filter(c => c && c.enabled !== false && c.name);
      const activeThemes = (themes || []).filter(t => t && t.terms && t.terms.length > 0);
      if (activeChars.length === 0 || activeThemes.length === 0 || !rawText) {
        return { characters: [], themes: [], matrix: {} };
      }

      const compiledChars = activeChars.slice(0, 12).map(c => {
        const terms = [c.name, ...(c.aliases || [])].filter(Boolean);
        const pattern = terms.map(t => {
          const clean = t.trim();
          const sb = /^\w/.test(clean) ? '\\b' : '';
          const eb = /\w$/.test(clean) ? '\\b' : '(?![\\w])';
          return sb + escapeRegex(clean) + eb;
        }).join('|');
        return { id: c.id, name: c.name, regex: new RegExp(pattern, 'i') };
      });

      const compiledThemes = activeThemes.slice(0, 9).map(t => ({
        id: t.id,
        label: t.label,
        labelKey: t.labelKey || '',
        color: t.color || '#5b8fcc',
        termSet: new Set(t.terms.map(x => String(x).toLowerCase()).filter(x => x && !THEME_STOPWORDS.has(x)))
      }));

      const words = String(rawText).split(/\s+/);
      const step = Math.max(40, Math.floor(windowSize / 2));
      const matrix = {};
      compiledChars.forEach(c => {
        matrix[c.id] = {};
        compiledThemes.forEach(t => { matrix[c.id][t.id] = 0; });
      });

      let winIdx = 0;
      for (let i = 0; i < words.length; i += step) {
        const chunk = words.slice(i, i + windowSize).join(' ');
        const presentChars = [];
        for (let c = 0; c < compiledChars.length; c++) {
          if (compiledChars[c].regex.test(chunk)) presentChars.push(compiledChars[c].id);
        }
        if (presentChars.length > 0) {
          const chunkTokens = tokenizeLower(chunk);
          compiledThemes.forEach(t => {
            let themeHits = 0;
            for (let k = 0; k < chunkTokens.length; k++) {
              if (!THEME_STOPWORDS.has(chunkTokens[k]) && t.termSet.has(chunkTokens[k])) themeHits++;
            }
            if (themeHits > 0) {
              presentChars.forEach(cid => {
                matrix[cid][t.id] += themeHits;
              });
            }
          });
        }
        winIdx++;
        if (winIdx % 150 === 0) await new Promise(r => setTimeout(r, 0));
      }

      return {
        characters: compiledChars.map(c => ({ id: c.id, name: c.name })),
        themes: compiledThemes.map(t => ({ id: t.id, label: t.label, labelKey: t.labelKey, color: t.color })),
        matrix
      };
    },

    /**
     * Find exact sentences from rawText that match a theme's terms (excluding stopwords).
     */
    findThemeSentences(rawText, terms, maxExamples = 30) {
      if (!rawText || !Array.isArray(terms) || terms.length === 0) return [];
      const termSet = new Set(
        terms.map(t => String(t || '').toLowerCase().trim()).filter(t => t && !THEME_STOPWORDS.has(t))
      );
      const sentences = String(rawText)
        .replace(/\r?\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(/(?<=[.!?…])\s+(?=["«"'(\[]?[A-ZÀ-ÖØ-ß0-9])/);

      const results = [];
      for (let i = 0; i < sentences.length; i++) {
        const sent = sentences[i].trim();
        if (!sent) continue;
        const tokens = sent.toLowerCase().match(/[a-zà-öø-ÿ]+/g) || [];
        const matched = [];
        tokens.forEach(tok => {
          if (!THEME_STOPWORDS.has(tok) && termSet.has(tok) && matched.indexOf(tok) === -1) matched.push(tok);
        });
        if (matched.length > 0) {
          results.push({ sentence: sent, matchedTerms: matched, index: i });
          if (results.length >= maxExamples) break;
        }
      }
      return results;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DistantReadingThemes;
  }
  if (typeof global !== 'undefined') {
    global.DistantReadingThemes = DistantReadingThemes;
  }
})(typeof window !== 'undefined' ? window : globalThis);
