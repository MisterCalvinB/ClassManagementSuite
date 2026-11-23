    let activeSection = 'main-menu';
    let currentGameWord = null; // The vocab word object currently active in any game
    let _wordDbLoadPromise = null;
    let _customQuizLoadPromise = null;
    let _coreBanksLoadPromise = null;

    // Keep a safe default so UI boot code can run before the main DB finishes loading.
    if (!Array.isArray(window.vocabBank)) window.vocabBank = [];
    if (typeof window.quizBank === 'undefined') window.quizBank = [];

    function getDeclaredArrayByName(varName) {
      try {
        const value = (new Function('return (typeof ' + varName + ' !== "undefined") ? ' + varName + ' : undefined;'))();
        return Array.isArray(value) ? value : null;
      } catch {
        return null;
      }
    }

    function ensureGlobalVarAlias(varName) {
      try {
        const exists = (new Function('return (typeof ' + varName + ' !== "undefined");'))();
        if (!exists) {
          // Keep legacy bare references (e.g. gapFillBank) working when script tags fail to define them.
          (0, eval)('var ' + varName + ' = window["' + varName + '"];');
        }
      } catch {
        // Ignore alias errors; window-backed references still work.
      }
    }

    function ensureCoreBankArray(varName) {
      const declared = getDeclaredArrayByName(varName);
      const live = declared || (Array.isArray(window[varName]) ? window[varName] : []);
      window[varName] = live;
      ensureGlobalVarAlias(varName);
      return live;
    }

    function parseBankSourceToArray(source, varName, fallbackNames = []) {
      const names = [varName].concat(fallbackNames || []);
      const probe = names
        .map(name => '(typeof ' + name + ' !== "undefined" ? ' + name + ' : null)')
        .join(' || ');
      const loaded = (new Function(String(source || '') + '\n; return (' + probe + ');'))();
      return Array.isArray(loaded) ? loaded : [];
    }

    async function ensureCoreBanksLoaded() {
      if (_coreBanksLoadPromise) return _coreBanksLoadPromise;

      const BANKS = [
        { varName: 'quoteBank', file: 'quotebanks/quoteBank.js', legacyFile: 'quoteBank.js', customTarget: 'customQuotes' },
        { varName: 'gapFillBank', file: 'gapfillbanks/gapFillBank.js', legacyFile: 'gapFillBank.js', customTarget: 'customGapfillbanks' },
        { varName: 'errorBank', file: 'errorbanks/errorBank.js', legacyFile: 'errorBank.js', customTarget: 'customErrorbanks' },
        { varName: 'quizBank', file: 'quizzes/quiz.js', legacyFile: 'quiz.js', customTarget: 'customQuizzes', fallbackNames: ['quizzes'] },
        { varName: 'dictationBank', file: 'dictations/dictation.js', legacyFile: 'dictation.js', customTarget: 'customDictations' },
        { varName: 'grammarData', file: 'grammarbanks/grammar.js', legacyFile: 'grammar.js', customTarget: 'customGrammarbanks' },
        { varName: 'orderSentences', file: 'sentencebanks/orderSentences.js', legacyFile: 'orderSentences.js', customTarget: 'customSentences' },
        { varName: 'chooseStoryBank', file: 'storybanks/chooseStory.js', legacyFile: 'chooseStory.js', customTarget: 'customStorybanks' }
      ];

      _coreBanksLoadPromise = (async () => {
        for (const bank of BANKS) {
          const live = ensureCoreBankArray(bank.varName);
          let source = '';

          try {
            if (window.Desktop && Desktop.isElectron() && typeof Desktop.readText === 'function') {
              const electronCandidates = [
                { target: 'customData', filename: bank.file },
                ...(bank.customTarget ? [{ target: bank.customTarget, filename: bank.legacyFile }] : []),
                { target: 'data', filename: bank.legacyFile }
              ];
              for (const candidate of electronCandidates) {
                const r = await Desktop.readText(candidate.target, candidate.filename);
                if (r && r.ok) {
                  source = String(r.content || '');
                  break;
                }
              }
            }
            if (!source) {
              const browserCandidates = [
                'user/custom-data/' + bank.file,
                'data/' + bank.legacyFile
              ];
              for (const url of browserCandidates) {
                const res = await fetch(url, { cache: 'no-store' });
                if (res.ok) {
                  source = await res.text();
                  break;
                }
              }
            }
          } catch (err) {
            console.warn('Failed reading bank source for', bank.varName, err);
          }

          if (!source) continue;

          try {
            const loaded = parseBankSourceToArray(source, bank.varName, bank.fallbackNames);
            if (Array.isArray(loaded) && loaded.length) {
              live.splice(0, live.length, ...loaded);
              window[bank.varName] = live;
              ensureGlobalVarAlias(bank.varName);
            }
          } catch (err) {
            console.warn('Failed parsing bank source for', bank.varName, err);
          }
        }
      })();

      return _coreBanksLoadPromise;
    }

    async function ensureWordDbLoaded() {
      if (_wordDbLoadPromise) return _wordDbLoadPromise;

      _wordDbLoadPromise = (async () => {
        try {
          let source = '';

          if (window.Desktop && Desktop.isElectron()) {
            let r = null;
            let hasWordDb = true;

            if (typeof Desktop.listFiles === 'function') {
              try {
                const listRes = await Desktop.listFiles('customWordbanks', { extensions: ['.js'] });
                if (listRes && listRes.ok && Array.isArray(listRes.files)) {
                  hasWordDb = listRes.files.some(f => {
                    const fn = String((f && (f.filename || f.name || f)) || '').toLowerCase();
                    return fn === 'worddb.js' || fn.endsWith('/worddb.js');
                  });
                }
              } catch (_) { }
            }

            if (hasWordDb) {
              if (typeof Desktop.readText === 'function') {
                r = await Desktop.readText('customWordbanks', 'wordDb.js');
              }
              if ((!r || !r.ok) && typeof Desktop.readByPath === 'function') {
                r = await Desktop.readByPath('customData', 'wordbanks/wordDb.js');
              }
              if ((!r || !r.ok) && typeof Desktop.readByPath === 'function') {
                r = await Desktop.readByPath('data', 'wordbanks/wordDb.js');
              }
            }

            if (r && r.ok && r.content) {
              source = String(r.content || '');
            }
          } else {
            try {
              const res = await fetch('user/custom-data/wordbanks/wordDb.js', { cache: 'no-store' });
              if (res.ok) source = await res.text();
            } catch (_) { }
          }

          if (source) {
            const loaded = (new Function(source + '\n; return (typeof vocabBank !== "undefined" ? vocabBank : []);'))();
            window.vocabBank = Array.isArray(loaded) ? loaded : [];
            if (typeof WordbankSchema !== 'undefined') {
              WordbankSchema.normalizeWordbankArray(window.vocabBank, { inPlace: true });
            }
          } else if (!Array.isArray(window.vocabBank)) {
            window.vocabBank = [];
          }
        } catch (err) {
          if (!Array.isArray(window.vocabBank)) window.vocabBank = [];
        }

        return window.vocabBank;
      })();

      return _wordDbLoadPromise;
    }

    function normalizeQuizItem(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const question = String(raw.question || '').trim();
      const theme = String(raw.theme || '').trim();
      const keyword = String(raw.keyword || '').trim();
      const answers = [
        raw['answer 1'] ?? raw.answer1,
        raw['answer 2'] ?? raw.answer2,
        raw['answer 3'] ?? raw.answer3,
        raw['answer 4'] ?? raw.answer4
      ].map(v => String(v || '').trim());

      if (!question || answers.some(a => !a)) return null;

      let correctIndex = -1;
      const correctRaw = raw.correctAnswer;
      if (typeof correctRaw === 'number' && Number.isFinite(correctRaw)) {
        correctIndex = Math.max(1, Math.min(4, Math.floor(correctRaw))) - 1;
      } else {
        const normalized = String(correctRaw || '').trim().toLowerCase();
        if (/^[1-4]$/.test(normalized)) {
          correctIndex = Number(normalized) - 1;
        } else {
          correctIndex = answers.findIndex(a => a.toLowerCase() === normalized);
        }
      }

      if (correctIndex < 0 || correctIndex > 3) return null;
      return { question, answers, correctIndex, theme, keyword };
    }

    async function ensureCustomQuizLoaded() {
      if (_customQuizLoadPromise) return _customQuizLoadPromise;

      _customQuizLoadPromise = (async () => {
        try {
          let source = '';
          if (window.Desktop && Desktop.isElectron()) {
            let r = null;
            if (typeof Desktop.readByPath === 'function') {
              r = await Desktop.readByPath('customData', 'quizzes/quiz.js');
            }
            if ((!r || !r.ok) && typeof Desktop.readText === 'function') {
              r = await Desktop.readText('customQuizzes', 'quiz.js');
            }
            if ((!r || !r.ok) && typeof Desktop.readByPath === 'function') {
              r = await Desktop.readByPath('data', 'quiz.js');
            }
            if (!r || !r.ok) {
              throw new Error((r && r.error) || 'Failed to read quiz bank source');
            }
            source = String(r.content || '');
          } else {
            const browserCandidates = [
              'user/custom-data/quizzes/quiz.js',
              'data/quiz.js'
            ];
            for (const url of browserCandidates) {
              const res = await fetch(url, { cache: 'no-store' });
              if (res.ok) {
                source = await res.text();
                break;
              }
            }
          }

          const loaded = (new Function(source + '\n; return (typeof quizBank !== "undefined" ? quizBank : (typeof quizzes !== "undefined" ? quizzes : []));'))();
          const normalized = Array.isArray(loaded)
            ? loaded.map(normalizeQuizItem).filter(Boolean)
            : [];
          window.quizBank = normalized;
        } catch (err) {
          console.warn('Failed to load custom quiz bank:', err);
          const fallback = Array.isArray(window.quizBank) ? window.quizBank.map(normalizeQuizItem).filter(Boolean) : [];
          window.quizBank = fallback;
        }
        return window.quizBank;
      })();

      return _customQuizLoadPromise;
    }

    function showCurrentWordDetail() {
      if (!currentGameWord) return;

      // Grab whichever callback is pending (success or failure) before clearing overlays
      const pendingCb = successNextCallback || failureNextCallback;
      successNextCallback = null;
      failureNextCallback = null;
      // Cancel the failure auto-hide so it doesn't fire while word detail is open
      if (failureAutoHideId) { clearTimeout(failureAutoHideId); failureAutoHideId = null; }

      document.getElementById('success-overlay').classList.remove('active');
      document.getElementById('failure-overlay').classList.remove('active');

      // Show the word detail; when it closes, fire the pending callback (team rotation + next game)
      showWordDetail(currentGameWord.word, pendingCb);
    }

    function setCurrentGameWord(wordObj) {
      currentGameWord = wordObj || null;
      const hasWord = !!currentGameWord;
      const se = document.getElementById('success-explain-btn');
      const fe = document.getElementById('failure-explain-btn');
      if (se) se.style.display = hasWord ? '' : 'none';
      if (fe) fe.style.display = hasWord ? '' : 'none';
    }

    // --- Audio, TTS & Overlay ---
    let _sharedAudioContext = null;
    function getAudioContext() {
      if (!_sharedAudioContext) {
        _sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (_sharedAudioContext.state === 'suspended') _sharedAudioContext.resume();
      return _sharedAudioContext;
    }
    function playSuccessSound() {
      if (typeof soundMuted !== 'undefined' && soundMuted) return;
      try {
        const context = getAudioContext();
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.connect(gain); gain.connect(context.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, context.currentTime);
        gain.gain.setValueAtTime(0.1, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5);
        osc.start(); osc.stop(context.currentTime + 0.5);
      } catch (e) { }
    }

    function ltSpeakWord(text, rate = 0.92) {
      if (!text || typeof window.speechSynthesis === 'undefined') return;
      if (typeof soundMuted !== 'undefined' && soundMuted) return;
      try {
        window.speechSynthesis.cancel();
        const clean = String(text).replace(/["""]/g, '').trim();
        if (!clean) return;
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = 'en-GB';
        utter.rate = Number(rate) || 0.92;
        const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
        const enVoice = voices.find(v => /^en[-_]GB/i.test(v.lang))
          || voices.find(v => /^en[-_]US/i.test(v.lang))
          || voices.find(v => /^en/i.test(v.lang));
        if (enVoice) utter.voice = enVoice;
        window.speechSynthesis.speak(utter);
      } catch (e) { }
    }

    const CLASS_GROUP_STORAGE_KEY = 'active_class_group';
    let activeClassGroup = '';
    let activeHalfGroup = '';

    function _ltHalfFilter(groupName, names) {
      if (!activeHalfGroup) return names;
      const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META[groupName] : null;
      if (!meta || !meta.halfGroups || !meta.halfGroups[activeHalfGroup] || !meta.halfGroups[activeHalfGroup].length) return names;
      const halfArr = meta.halfGroups[activeHalfGroup];
      if (typeof halfArr[0] === 'string' && halfArr[0].startsWith('st-')) {
        const roster = (typeof STUDENTS_ROSTER !== 'undefined' && Array.isArray(STUDENTS_ROSTER)) ? STUDENTS_ROSTER : [];
        const rMap = {};
        roster.forEach(s => { if (s && s.uuid) rMap[s.uuid] = s; });
        const halfNames = new Set(halfArr.map(sid => {
          const s = rMap[sid];
          return s ? ((s.firstName || '') + ' ' + (s.lastName || '')).trim().toUpperCase() : null;
        }).filter(Boolean));
        return names.filter(n => halfNames.has(String(n).toUpperCase()));
      }
      const nameSet = new Set(halfArr.map(n => String(n).toUpperCase()));
      return names.filter(n => nameSet.has(String(n).toUpperCase()));
    }

    function _ltUpdateHalfSelector(groupName) {
      const sel = document.getElementById('group-half-selector');
      if (!sel) return;
      const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META[groupName] : null;
      const hasHalves = meta && meta.halfGroups &&
        ((meta.halfGroups.A && meta.halfGroups.A.length) || (meta.halfGroups.B && meta.halfGroups.B.length));
      sel.style.display = (groupName && hasHalves) ? '' : 'none';
      if (!groupName || !hasHalves) { sel.value = ''; activeHalfGroup = ''; }
    }

    function setActiveHalfGroup(half) {
      activeHalfGroup = half || '';
      if (activeHalfGroup) {
        try { localStorage.setItem('cmt-lt-activeHalf', activeClassGroup + ':' + activeHalfGroup); } catch (e) { }
      } else {
        try { localStorage.removeItem('cmt-lt-activeHalf'); } catch (e) { }
      }
      if (activeSection === 'words-seen-today-section') renderWordsSeenToday();
      if (activeSection === 'werewolf-section') wwUseActiveClassGroup();
    }

    function getClassGroupLabel(groupName) {
      const label = String(groupName || '').trim();
      return label || t('groupSelectorNone');
    }

    function refreshClassGroupSelectorOptions() {
      const sel = document.getElementById('group-selector');
      if (!sel) return;

      const selected = activeClassGroup;
      sel.innerHTML = '';

      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = t('groupSelectorNone');
      sel.appendChild(noneOpt);

      const groupKeys = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META)
        ? Object.keys(CLASS_GROUPS_META)
          .filter(key => !(CLASS_GROUPS_META[key] && CLASS_GROUPS_META[key].archived))
          .sort((a, b) => _ltGroupName(a).localeCompare(_ltGroupName(b)))
        : [];
      groupKeys.forEach(key => {
        const opt = document.createElement('option');
        const count = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META[key] && Array.isArray(CLASS_GROUPS_META[key].students)) ? CLASS_GROUPS_META[key].students.length : 0;
        opt.value = key;
        opt.textContent = _ltGroupName(key) + (count ? ' (' + count + ')' : '');
        sel.appendChild(opt);
      });

      sel.value = selected && groupKeys.includes(selected) ? selected : '';
    }

    function _ltGroupName(key) {
      try {
        const m = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META[key] : null;
        return (m && m.name) ? m.name : key;
      } catch { return key; }
    }

    function updateGroupSelectorTitle() {
      const sel = document.getElementById('group-selector');
      if (!sel) return;
      if (activeClassGroup && typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META[activeClassGroup]) {
        const count = Array.isArray(CLASS_GROUPS_META[activeClassGroup].students) ? CLASS_GROUPS_META[activeClassGroup].students.length : 0;
        sel.title = _ltGroupName(activeClassGroup) + (count ? ' (' + count + ')' : '');
      } else {
        sel.title = t('groupSelectorNone');
      }
    }

    function setActiveClassGroup(groupName) {
      const prevGroup = activeClassGroup;
      const hasGroup = typeof CLASS_GROUPS_META !== 'undefined'
        && CLASS_GROUPS_META
        && Object.prototype.hasOwnProperty.call(CLASS_GROUPS_META, groupName);

      activeClassGroup = hasGroup ? groupName : '';
      activeHalfGroup = '';
      const halfSel = document.getElementById('group-half-selector');
      if (halfSel) halfSel.value = '';
      _ltUpdateHalfSelector(activeClassGroup);

      const sel = document.getElementById('group-selector');
      if (sel && sel.value !== activeClassGroup) sel.value = activeClassGroup;

      try {
        if (activeClassGroup) localStorage.setItem(CLASS_GROUP_STORAGE_KEY, activeClassGroup);
        else localStorage.removeItem(CLASS_GROUP_STORAGE_KEY);
      } catch (e) { }

      updateGroupSelectorTitle();
      if (typeof quizMpRefreshClassPicker === 'function') quizMpRefreshClassPicker();

      if (prevGroup !== activeClassGroup && activeSection === 'words-seen-today-section') {
        renderWordsSeenToday();
      }
      if (prevGroup !== activeClassGroup && activeSection === 'werewolf-section') {
        wwUseActiveClassGroup();
      }
    }

    function initClassGroupSelector() {
      refreshClassGroupSelectorOptions();
      let saved = '';
      try { saved = localStorage.getItem(CLASS_GROUP_STORAGE_KEY) || ''; } catch (e) { }
      setActiveClassGroup(saved);
    }

    const usedWords = new Set();
    const WORDS_SEEN_TODAY_KEY = 'words_seen_today_v2';
    const LEGACY_WORDS_SEEN_TODAY_KEY = 'words_seen_today_v1';
    const WORDS_SEEN_EXPORT_TARGET = 'groupParticipation';
    const WORDS_SEEN_EXPORT_FILENAME = 'words-seen.json';
    let wordsSeenAutosaveTimer = null;

    function createEmptyWordsSeenStore() {
      return { version: 2, entries: {} };
    }

    function getWordsSeenTodayDateKey() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function normalizeSeenTodayWordKey(word) {
      return String(word || '').trim().toLowerCase();
    }

    function getWordsSeenRecordKey(dateKey = getWordsSeenTodayDateKey(), classGroup = activeClassGroup) {
      return dateKey + '__' + String(classGroup || '').trim();
    }

    function normalizeSeenTodayGames(games) {
      return Array.isArray(games) ? [...new Set(games.filter(Boolean))] : [];
    }

    function getSeenTodayWordThemes(wordObj) {
      if (typeof getItemThemes === 'function') return getItemThemes(wordObj);
      if (wordObj && Array.isArray(wordObj.theme)) return wordObj.theme.filter(Boolean);
      if (wordObj && wordObj.theme) return [wordObj.theme].filter(Boolean);
      return [];
    }

    function buildSeenTodayWordSnapshot(wordObj, fallback = {}) {
      const themes = getSeenTodayWordThemes(wordObj);
      return {
        word: wordObj.word || fallback.word || '',
        ipa: wordObj.ipa || fallback.ipa || '',
        french: wordObj.french || fallback.french || '',
        definition: _firstVal(wordObj.definition || fallback.definition),
        partOfSpeech: Array.isArray(wordObj.partOfSpeech)
          ? [...wordObj.partOfSpeech]
          : (wordObj.partOfSpeech || fallback.partOfSpeech || ''),
        level: wordObj.level || fallback.level || '',
        theme: themes.length ? themes : (Array.isArray(fallback.theme) ? [...fallback.theme] : []),
        games: normalizeSeenTodayGames(fallback.games)
      };
    }

    function migrateLegacyWordsSeenStore(legacyStore) {
      const migrated = createEmptyWordsSeenStore();
      if (!legacyStore || !legacyStore.items || typeof legacyStore.items !== 'object') return migrated;

      const record = {
        date: legacyStore.date || getWordsSeenTodayDateKey(),
        classGroup: '',
        games: [],
        words: {}
      };

      Object.values(legacyStore.items).forEach(entry => {
        if (!entry || !entry.word) return;
        const normalizedWord = normalizeSeenTodayWordKey(entry.word);
        if (!normalizedWord) return;
        const snapshot = buildSeenTodayWordSnapshot(entry, entry);
        snapshot.games = normalizeSeenTodayGames(entry.games);
        record.words[normalizedWord] = snapshot;
        snapshot.games.forEach(gameKey => {
          if (!record.games.includes(gameKey)) record.games.push(gameKey);
        });
      });

      migrated.entries[getWordsSeenRecordKey(record.date, '')] = record;
      return migrated;
    }

    function loadWordsSeenTodayStore() {
      try {
        const parsed = JSON.parse(localStorage.getItem(WORDS_SEEN_TODAY_KEY));
        if (parsed && parsed.version === 2 && parsed.entries && typeof parsed.entries === 'object') {
          return parsed;
        }
      } catch (e) { }

      try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_WORDS_SEEN_TODAY_KEY));
        if (legacy && legacy.items && typeof legacy.items === 'object') {
          const migrated = migrateLegacyWordsSeenStore(legacy);
          saveWordsSeenTodayStore(migrated);
          return migrated;
        }
      } catch (e) { }

      return createEmptyWordsSeenStore();
    }

    function saveWordsSeenTodayStore(store) {
      try {
        localStorage.setItem(WORDS_SEEN_TODAY_KEY, JSON.stringify(store));
        localStorage.removeItem(LEGACY_WORDS_SEEN_TODAY_KEY);
      } catch (e) { }
    }

    function getOrCreateWordsSeenRecord(store, dateKey = getWordsSeenTodayDateKey(), classGroup = activeClassGroup) {
      const recordKey = getWordsSeenRecordKey(dateKey, classGroup);
      if (!store.entries[recordKey]) {
        store.entries[recordKey] = {
          date: dateKey,
          classGroup: String(classGroup || '').trim(),
          games: [],
          words: {}
        };
      }
      return store.entries[recordKey];
    }

    function mergeSeenWordIntoStore(store, wordObj, gameKey) {
      if (!wordObj || !wordObj.word || !gameKey) return false;
      const normalizedWord = normalizeSeenTodayWordKey(wordObj.word);
      if (!normalizedWord) return false;

      const record = getOrCreateWordsSeenRecord(store);
      const existing = record.words[normalizedWord] || buildSeenTodayWordSnapshot(wordObj);
      const merged = buildSeenTodayWordSnapshot(wordObj, existing);
      merged.games = normalizeSeenTodayGames((existing.games || []).concat(gameKey));

      const prevSerialized = JSON.stringify(record.words[normalizedWord] || null);
      const nextSerialized = JSON.stringify(merged);

      record.words[normalizedWord] = merged;
      if (!record.games.includes(gameKey)) record.games.push(gameKey);

      return prevSerialized !== nextSerialized;
    }

    function getWordsSeenTodayGameLabel(gameKey) {
      const labels = {
        definition: t('titleDefMatch'),
        hangman: t('titleHangman'),
        scrambled: t('titleScramble'),
        wordquest: t('titleWordQuest'),
        phonetic: t('titlePhonetic'),
        synonyms: t('synonymLabel'),
        antonyms: t('antonymLabel'),
        flashcards: t('titleFlashCards'),
        wordsearch: t('titleWordSearch')
      };
      return labels[gameKey] || gameKey;
    }

    function buildWordsSeenExportPayload(store) {
      const records = Object.values((store && store.entries) || {}).map(record => ({
        date: record.date || '',
        classGroup: record.classGroup || '',
        games: normalizeSeenTodayGames(record.games).sort((a, b) => a.localeCompare(b)),
        words: Object.values(record.words || {})
          .sort((a, b) => String(a.word || '').localeCompare(String(b.word || '')))
          .map(word => ({
            word: word.word || '',
            ipa: word.ipa || '',
            french: word.french || '',
            definition: _firstVal(word.definition),
            partOfSpeech: word.partOfSpeech || '',
            level: word.level || '',
            theme: Array.isArray(word.theme) ? word.theme : [],
            games: normalizeSeenTodayGames(word.games).sort((a, b) => a.localeCompare(b))
          }))
      })).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.classGroup.localeCompare(b.classGroup);
      });

      return {
        updatedAt: new Date().toISOString(),
        attributes: {
          entry: ['date', 'classGroup', 'games', 'words'],
          word: ['word', 'ipa', 'french', 'definition', 'partOfSpeech', 'level', 'theme', 'games']
        },
        entries: records
      };
    }

    async function autosaveWordsSeenNow(store = loadWordsSeenTodayStore()) {
      if (!window.Desktop || !window.Desktop.isElectron()) return null;
      try {
        return await window.Desktop.saveJson(WORDS_SEEN_EXPORT_TARGET, WORDS_SEEN_EXPORT_FILENAME, buildWordsSeenExportPayload(store));
      } catch (e) {
        console.warn('Failed to autosave words-seen.json', e);
        return null;
      }
    }

    function scheduleWordsSeenAutosave(store = loadWordsSeenTodayStore()) {
      if (!window.Desktop || !window.Desktop.isElectron()) return;
      clearTimeout(wordsSeenAutosaveTimer);
      wordsSeenAutosaveTimer = setTimeout(() => {
        autosaveWordsSeenNow(store);
      }, 400);
    }

    function trackSeenWord(wordObj, gameKey) {
      const store = loadWordsSeenTodayStore();
      if (!mergeSeenWordIntoStore(store, wordObj, gameKey)) return;
      saveWordsSeenTodayStore(store);
      scheduleWordsSeenAutosave(store);
      if (activeSection === 'words-seen-today-section') renderWordsSeenToday();
    }

    function trackSeenWords(wordObjs, gameKey) {
      const store = loadWordsSeenTodayStore();
      let changed = false;
      (wordObjs || []).forEach(wordObj => {
        changed = mergeSeenWordIntoStore(store, wordObj, gameKey) || changed;
      });
      if (!changed) return;
      saveWordsSeenTodayStore(store);
      scheduleWordsSeenAutosave(store);
      if (activeSection === 'words-seen-today-section') renderWordsSeenToday();
    }

    function formatWordsSeenTodayDate() {
      const localeMap = { en: 'en-GB', de: 'de-DE', it: 'it-IT', fr: 'fr-FR' };
      return new Date().toLocaleDateString(localeMap[currentLang] || 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }

    function getWordsSeenTodayEntries() {
      const store = loadWordsSeenTodayStore();
      const record = store.entries[getWordsSeenRecordKey()] || { words: {} };
      return Object.values(record.words).sort((a, b) => a.word.localeCompare(b.word));
    }

    function renderWordsSeenToday() {
      const countEl = document.getElementById('words-seen-today-count');
      const listEl = document.getElementById('words-seen-today-list');
      if (!countEl || !listEl) return;

      const entries = getWordsSeenTodayEntries();
      countEl.innerHTML = `<strong>${entries.length}</strong> ${t('wordsSeenTodayTracked')} · ${formatWordsSeenTodayDate()} · ${getClassGroupLabel(activeClassGroup)}`;
      if (!entries.length) {
        listEl.innerHTML = `<p class="words-seen-empty">${t('wordsSeenTodayEmpty')}</p>`;
        return;
      }

      if (window.DomSync && typeof window.DomSync.patchListByKey === 'function') {
        window.DomSync.patchListByKey(
          listEl,
          entries,
          entry => normalizeSeenTodayWordKey(entry.word),
          () => {
            const card = document.createElement('div');
            card.className = 'vocab-item-card words-seen-card';
            const wordSpan = document.createElement('span');
            wordSpan.className = 'words-seen-word';
            const ipaSpan = document.createElement('span');
            ipaSpan.className = 'words-seen-ipa';
            ipaSpan.style.cssText = "display:block;font-family:'Courier New',monospace;font-size:0.72rem;color:#aaa;font-weight:400;margin-top:2px;";
            const gamesDiv = document.createElement('div');
            gamesDiv.className = 'words-seen-games';
            card.appendChild(wordSpan);
            card.appendChild(ipaSpan);
            card.appendChild(gamesDiv);
            return card;
          },
          (card, entry) => {
            const liveItem = vocabBank.find(item => normalizeSeenTodayWordKey(item.word) === normalizeSeenTodayWordKey(entry.word));
            const displayItem = liveItem || entry;
            const wordSpan = card.querySelector('.words-seen-word');
            const ipaSpan = card.querySelector('.words-seen-ipa');
            const gamesDiv = card.querySelector('.words-seen-games');
            window.DomSync.setText(wordSpan, displayItem.word.toLowerCase());
            if (ipaSpan) {
              ipaSpan.style.display = displayItem.ipa ? 'block' : 'none';
              window.DomSync.setText(ipaSpan, displayItem.ipa ? `/ ${displayItem.ipa} /` : '');
            }
            if (gamesDiv) {
              const gamesSig = (entry.games || []).join(',');
              if (gamesDiv.dataset.gamesSig !== gamesSig) {
                gamesDiv.dataset.gamesSig = gamesSig;
                gamesDiv.innerHTML = (entry.games || []).map(gameKey => `<span class="words-seen-game">${getWordsSeenTodayGameLabel(gameKey)}</span>`).join('');
              }
            }
            card.onclick = liveItem ? () => showWordDetail(liveItem.word) : null;
            card.style.cursor = liveItem ? 'pointer' : 'default';
          }
        );
        return;
      }

      listEl.innerHTML = '';
      entries.forEach(entry => {
        const liveItem = vocabBank.find(item => normalizeSeenTodayWordKey(item.word) === normalizeSeenTodayWordKey(entry.word));
        const displayItem = liveItem || entry;
        const card = document.createElement('div');
        const ipaSpan = displayItem.ipa ? `<span style="display:block;font-family:'Courier New',monospace;font-size:0.72rem;color:#aaa;font-weight:400;margin-top:2px;">/ ${displayItem.ipa} /</span>` : '';
        const gamesHtml = (entry.games || []).map(gameKey => `<span class="words-seen-game">${getWordsSeenTodayGameLabel(gameKey)}</span>`).join('');

        card.className = 'vocab-item-card words-seen-card';
        card.innerHTML = `<span>${displayItem.word.toLowerCase()}</span>${ipaSpan}<div class="words-seen-games">${gamesHtml}</div>`;
        if (liveItem) card.onclick = () => showWordDetail(liveItem.word);
        else card.style.cursor = 'default';
        listEl.appendChild(card);
      });
    }

    function formatSeenDate(dateStr) {
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '?';
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const localeMap = { en: 'en-GB', de: 'de-DE', it: 'it-IT', fr: 'fr-FR' };
      return date.toLocaleDateString(localeMap[currentLang] || 'en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      });
    }

    function renderWordsSeenHistory() {
      const container = document.getElementById('words-seen-history-entries');
      if (!container) return;
      const store = loadWordsSeenTodayStore();
      const currentRecordKey = getWordsSeenRecordKey();

      const past = Object.values(store.entries || {})
        .filter(r => getWordsSeenRecordKey(r.date, r.classGroup) !== currentRecordKey)
        .sort((a, b) => b.date.localeCompare(a.date) || (a.classGroup || '').localeCompare(b.classGroup || ''));

      if (!past.length) {
        container.innerHTML = `<p class="wsh-no-history">${t('wordsSeenHistoryEmpty')}</p>`;
        return;
      }

      container.innerHTML = '';
      past.forEach(record => {
        const words = Object.values(record.words || {}).sort((a, b) => (a.word || '').localeCompare(b.word || ''));
        const gamesHtml = (record.games || []).map(g => `<span>${getWordsSeenTodayGameLabel(g)}</span>`).join('');
        const classLabel = record.classGroup || t('groupSelectorNone');
        const dateLabel = formatSeenDate(record.date);

        const sessionEl = document.createElement('div');
        sessionEl.className = 'wsh-session';
        sessionEl.innerHTML = `
          <div class="wsh-session-head" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open');">
            <span class="wsh-chevron">&#9658;</span>
            <span class="wsh-session-date">${dateLabel}</span>
            <span class="wsh-session-class">${classLabel}</span>
            <span class="wsh-session-count">${words.length} ${t('wordsSeenTodayTracked')}</span>
            <span class="wsh-session-games">${gamesHtml}</span>
          </div>
          <div class="wsh-session-body">
            <div class="wsh-session-words">${words.map(w => `<span class="wsh-word-chip" title="${_firstVal(w.definition).replace(/"/g, '&quot;')}">${(w.word || '').toLowerCase()}</span>`).join('')
          }</div>
          </div>`;
        container.appendChild(sessionEl);
      });
    }

    function toggleWordsSeenHistory() {
      const panel = document.getElementById('words-seen-history-panel');
      const btn = document.getElementById('words-seen-history-toggle-btn');
      if (!panel || !btn) return;
      const open = panel.classList.toggle('visible');
      btn.textContent = open ? t('wordsSeenHistoryHide') : t('wordsSeenHistoryShow');
      if (open) renderWordsSeenHistory();
    }

    let _wordDetailOnClose = null;

    /* --- Modal Controls --- */
    let _detCurrentWordKey = null;
    let _detWordList = [];    // ordered list for next/prev navigation
    let _detWordHistory = []; // history stack for back button

    function _detPopulateSynAnt(item) {
      function _synAntSpan(s, baseStyle) {
        const inDb = vocabBank.some(i => i.word === s);
        if (inDb) return `<span data-word="${s.replace(/"/g, '&quot;')}" onclick="showWordDetail(this.dataset.word)" style="${baseStyle}cursor:pointer;text-decoration:underline dotted;" title="View word card">${s}</span>`;
        return `<span style="${baseStyle}">${s}</span>`;
      }
      const synRaw = item.synonyms || item.synonym || '';
      const syns = Array.isArray(synRaw) ? synRaw : String(synRaw).split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
      const synRow = document.getElementById('det-syn-row');
      const synEl = document.getElementById('det-syn');
      if (syns.length) {
        synEl.innerHTML = syns.map(s => _synAntSpan(s, 'background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:4px;padding:3px 10px;font-size:0.85rem;font-weight:600;color:#fff;')).join('');
        synRow.style.display = '';
      } else { synRow.style.display = 'none'; }
      document.getElementById('det-edit-syn').value = syns.join(', ');

      const antRaw = item.antonyms || item.antonym || '';
      const ants = Array.isArray(antRaw) ? antRaw : String(antRaw).split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
      const antRow = document.getElementById('det-ant-row');
      const antEl = document.getElementById('det-ant');
      if (ants.length) {
        antEl.innerHTML = ants.map(s => _synAntSpan(s, 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:4px;padding:3px 10px;font-size:0.85rem;font-weight:600;color:rgba(255,255,255,0.75);')).join('');
        antRow.style.display = '';
      } else { antRow.style.display = 'none'; }
      document.getElementById('det-edit-ant').value = ants.join(', ');
    }

    // --- Array-aware helpers for definition / exampleSentence ---
    function _firstVal(v) { if (!Array.isArray(v)) return v || ''; if (!v.length) return ''; return v[Math.floor(Math.random() * v.length)]; }
    function _allVals(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
    function _editableStr(v) { return Array.isArray(v) ? v.join('\n') : (v || ''); }
    function _parseLines(s) { const lines = s.split('\n').map(x => x.trim()).filter(Boolean); return lines.length ? lines : []; }
    function _splitFrenchTranslations(value) {
      const parts = Array.isArray(value) ? value : [value || ''];
      return parts
        .flatMap(v => String(v).split(/[,;]+/))
        .map(s => s.trim())
        .filter(Boolean);
    }
    function _detSetAllTranslations(el, item) {
      el.innerHTML = '';
      const parts = [];
      const fr = _splitFrenchTranslations(item.french).join(', ');
      const de = item.german || '';
      const it = item.italian || '';
      if (fr) parts.push('<span style="color:#aaa;font-size:0.75rem;">FR</span> ' + fr);
      if (de) parts.push('<span style="color:#aaa;font-size:0.75rem;">DE</span> ' + de);
      if (it) parts.push('<span style="color:#aaa;font-size:0.75rem;">IT</span> ' + it);
      if (!parts.length) return;
      el.innerHTML = parts.join('<span style="color:#555;margin:0 6px;">|</span>');
    }
    function _detSetFrenchField(el, value) {
      const all = _splitFrenchTranslations(value);
      el.innerHTML = '';
      if (!all.length) return;

      const preview = all.slice(0, 3);
      const hidden = all.slice(3);
      const mainSpan = document.createElement('span');
      mainSpan.textContent = preview.join(', ');
      el.appendChild(mainSpan);

      if (hidden.length) {
        const btn = document.createElement('button');
        btn.className = 'det-def-expand-btn';
        btn.textContent = '+';
        let expanded = false;
        btn.onclick = function (e) {
          e.stopPropagation();
          const existing = el.querySelector('.det-def-extra');
          if (existing) existing.remove();
          if (!expanded) {
            const extra = document.createElement('span');
            extra.className = 'det-def-extra';
            extra.textContent = `, ${hidden.join(', ')}`;
            el.insertBefore(extra, btn);
            btn.textContent = '−';
          } else {
            btn.textContent = '+';
          }
          expanded = !expanded;
        };
        el.appendChild(btn);
      }
    }
    function _detSetField(el, value, wrapQuotes, emptyText) {
      const all = _allVals(value);
      if (!all.length) { el.innerHTML = ''; if (emptyText) el.textContent = emptyText; return; }
      const first = all[0];
      el.innerHTML = '';
      const mainSpan = document.createElement('span');
      mainSpan.textContent = wrapQuotes ? `"${first}"` : first;
      el.appendChild(mainSpan);
      if (all.length > 1) {
        const btn = document.createElement('button');
        btn.className = 'det-def-expand-btn';
        btn.textContent = '[+]';
        let expanded = false;
        btn.onclick = function (e) {
          e.stopPropagation();
          el.querySelectorAll('.det-def-extra').forEach(n => n.remove());
          if (!expanded) {
            all.slice(1).forEach(d => {
              const s = document.createElement('span');
              s.className = 'det-def-extra';
              s.textContent = wrapQuotes ? ` · "${d}"` : ` · ${d}`;
              el.insertBefore(s, btn);
            });
            btn.textContent = '[−]';
          } else { btn.textContent = '[+]'; }
          expanded = !expanded;
        };
        el.appendChild(btn);
      }
    }

    function showWordDetail(wordKey, onClose) {
      const item = vocabBank.find(i => i.word === wordKey);
      if (!item) return;
      _wordDetailOnClose = onClose || null;
      _detCurrentWordKey = wordKey;

      // Ensure edit mode is off when opening
      document.getElementById('word-detail-overlay').classList.remove('det-editing');
      document.getElementById('det-edit-btn').textContent = '✏️';
      document.getElementById('det-save-feedback').style.display = 'none';

      // View fields
      document.getElementById('det-word').textContent = item.word;
      document.getElementById('det-ipa').textContent = item.ipa ? `/ ${item.ipa} /` : '';
      _detSetAllTranslations(document.getElementById('det-french'), item);
      document.getElementById('det-type').textContent = item.partOfSpeech;
      document.getElementById('det-theme').innerHTML = getItemThemes(item).map(t => `<span class="meta-badge">${t}</span>`).join(' ') || '<span class="meta-badge">—</span>';
      document.getElementById('det-level').textContent = (item.level || 'B2').toUpperCase();
      const _detSrcEl = document.getElementById('det-source');
      if (_detSrcEl) { const _s = item._source || 'worddb'; _detSrcEl.textContent = _s === 'worddb' ? 'wordDb' : _s === 'custom' ? 'Custom' : _s; }
      _detSetField(document.getElementById('det-def'), item.definition, false);
      _detSetField(document.getElementById('det-ex'), item.exampleSentence, true, t('noExample'));

      // Pre-fill edit fields
      document.getElementById('det-edit-word').value = item.word || '';
      document.getElementById('det-edit-ipa').value = item.ipa || '';
      document.getElementById('det-edit-french').value = item.french || '';
      const _detEn = document.getElementById('det-edit-english'); if (_detEn) _detEn.value = item.english || '';
      const _detDe = document.getElementById('det-edit-german'); if (_detDe) _detDe.value = item.german || '';
      const _detIt = document.getElementById('det-edit-italian'); if (_detIt) _detIt.value = item.italian || '';
      document.getElementById('det-edit-pos').value = item.partOfSpeech || '';
      document.getElementById('det-edit-level').value = (item.level || 'B2').toUpperCase();
      document.getElementById('det-edit-theme').value = getItemThemes(item).join(', ');
      document.getElementById('det-edit-def').value = _editableStr(item.definition);
      document.getElementById('det-edit-ex').value = _editableStr(item.exampleSentence);

      _detPopulateSynAnt(item);

      if (!_detWordList.length) _detWordList = vocabBank.map(i => i.word);
      _detUpdateNavButtons();

      document.getElementById('word-detail-overlay').classList.add('active');
    }

    function _detUpdateNavButtons() {
      const idx = _detWordList.indexOf(_detCurrentWordKey);
      const prevBtn = document.getElementById('det-nav-prev');
      const nextBtn = document.getElementById('det-nav-next');
      const backBtn = document.getElementById('det-nav-back');
      if (prevBtn) prevBtn.disabled = idx <= 0;
      if (nextBtn) nextBtn.disabled = idx === -1 || idx >= _detWordList.length - 1;
      if (backBtn) backBtn.disabled = !_detWordHistory.length;
    }

    function detNavNext() {
      const idx = _detWordList.indexOf(_detCurrentWordKey);
      if (idx === -1 || idx >= _detWordList.length - 1) return;
      _detWordHistory.push(_detCurrentWordKey);
      showWordDetail(_detWordList[idx + 1], _wordDetailOnClose);
    }

    function detNavPrev() {
      const idx = _detWordList.indexOf(_detCurrentWordKey);
      if (idx <= 0) return;
      _detWordHistory.push(_detCurrentWordKey);
      showWordDetail(_detWordList[idx - 1], _wordDetailOnClose);
    }

    function detNavBack() {
      if (!_detWordHistory.length) return;
      const prev = _detWordHistory.pop();
      showWordDetail(prev, _wordDetailOnClose);
    }

    function detToggleEdit() {
      const overlay = document.getElementById('word-detail-overlay');
      const isEditing = overlay.classList.toggle('det-editing');
      document.getElementById('det-edit-btn').textContent = isEditing ? '👁' : '✏️';
      document.getElementById('det-save-feedback').style.display = 'none';
      if (isEditing) {
        const isElec = !!(window.Desktop && Desktop.isElectron());
        const memBtn = document.getElementById('det-save-memory-btn');
        if (memBtn) memBtn.style.display = isElec ? 'none' : '';
        const mainBtn = document.getElementById('det-save-main-btn');
        if (mainBtn) mainBtn.style.display = isElec ? '' : 'none';
        const customBtn = document.getElementById('det-save-custom-btn');
        if (customBtn) customBtn.style.display = isElec ? '' : 'none';
      }
    }

    let _detZoomLevel = 1;
    function detZoom(dir) {
      if (dir > 0) {
        _detZoomLevel = 2;
      } else {
        _detZoomLevel = 1;
      }
      const inner = document.querySelector('#word-detail-overlay .det-inner');
      inner.style.transform = _detZoomLevel === 1 ? '' : `scale(${_detZoomLevel})`;
      inner.style.transformOrigin = 'top center';
    }

    function detCancelEdit() {
      const overlay = document.getElementById('word-detail-overlay');
      overlay.classList.remove('det-editing');
      document.getElementById('det-edit-btn').textContent = '✏️';
      document.getElementById('det-save-feedback').style.display = 'none';
      // Re-populate from live vocabBank (discard edits)
      if (_detCurrentWordKey) showWordDetail(_detCurrentWordKey, _wordDetailOnClose);
    }

    async function detSaveEdit(target) {
      if (!_detCurrentWordKey) return;
      const wordKey = _detCurrentWordKey.toLowerCase();

      const newWord = document.getElementById('det-edit-word').value.trim();
      const newIpa = document.getElementById('det-edit-ipa').value.trim();
      const newFrench = document.getElementById('det-edit-french').value.trim();
      const newEnglish = (document.getElementById('det-edit-english')?.value || '').trim() || newWord;
      const newGerman = (document.getElementById('det-edit-german')?.value || '').trim();
      const newItalian = (document.getElementById('det-edit-italian')?.value || '').trim();
      const newPos = document.getElementById('det-edit-pos').value.trim();
      const newLevel = document.getElementById('det-edit-level').value.trim();
      const newTheme = document.getElementById('det-edit-theme').value.trim();
      const newDef = (function () { const v = document.getElementById('det-edit-def').value.trim(); const lines = v.split('\n').map(s => s.trim()).filter(Boolean); return lines.length > 1 ? lines : (lines[0] || ''); })();
      const newEx = (function () { const v = document.getElementById('det-edit-ex').value.trim(); const lines = v.split('\n').map(s => s.trim()).filter(Boolean); return lines.length > 1 ? lines : (lines[0] || ''); })();
      const newSyns = document.getElementById('det-edit-syn').value.split(',').map(s => s.trim()).filter(Boolean);
      const newAnts = document.getElementById('det-edit-ant').value.split(',').map(s => s.trim()).filter(Boolean);

      if (!newWord) {
        const fb = document.getElementById('det-save-feedback');
        fb.textContent = '⚠ Word is required.';
        fb.style.color = '#ff6b6b'; fb.style.display = 'inline';
        return;
      }

      const update = {
        word: newWord, ipa: newIpa, french: newFrench, english: newEnglish, german: newGerman, italian: newItalian,
        partOfSpeech: newPos, level: newLevel,
        theme: newTheme.split(',').map(s => s.trim()).filter(Boolean),
        definition: newDef, exampleSentence: newEx,
        synonyms: newSyns, antonyms: newAnts
      };

      // Update live vocabBank
      const vi = vocabBank.findIndex(v => v.word && v.word.toLowerCase() === wordKey);
      if (vi !== -1) Object.assign(vocabBank[vi], update);

      // Update custom localStorage
      try {
        const cw = JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || [];
        const ci = cw.findIndex(c => c.word && c.word.toLowerCase() === wordKey);
        if (ci !== -1) { Object.assign(cw[ci], update); localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(cw)); }
      } catch (e) { }

      // Update key if word was renamed
      _detCurrentWordKey = newWord;

      // Refresh view fields
      document.getElementById('det-word').textContent = newWord;
      document.getElementById('det-ipa').textContent = newIpa ? `/ ${newIpa} /` : '';
      _detSetAllTranslations(document.getElementById('det-french'), { french: newFrench, german: newGerman, italian: newItalian });
      document.getElementById('det-type').textContent = newPos;
      document.getElementById('det-level').textContent = newLevel.toUpperCase();
      document.getElementById('det-theme').innerHTML = update.theme.map(th => `<span class="meta-badge">${th}</span>`).join(' ') || '<span class="meta-badge">—</span>';
      _detSetField(document.getElementById('det-def'), newDef, false);
      _detSetField(document.getElementById('det-ex'), newEx, true, t('noExample'));
      _detPopulateSynAnt(update);

      // Exit edit mode
      document.getElementById('word-detail-overlay').classList.remove('det-editing');
      document.getElementById('det-edit-btn').textContent = '✏️';

      const fb = document.getElementById('det-save-feedback');
      fb.style.color = '#4cff82'; fb.style.display = 'inline';

      if (target === 'main' && typeof awDownloadDB === 'function') {
        fb.textContent = '⏳ Saving to Main DB…';
        await awDownloadDB();
        fb.textContent = '✓ Saved to Main DB!';
        setTimeout(() => { fb.style.display = 'none'; }, 2200);
      } else if (target === 'custom' && window.Desktop && Desktop.isElectron()) {
        fb.textContent = '⏳ Saving to Custom DB…';
        const existing2 = vocabBank.find(v => v.word && v.word.toLowerCase() === newWord.toLowerCase());
        const entryForCustom = {
          word: newWord, ipa: newIpa, partOfSpeech: newPos, level: newLevel,
          theme: update.theme, definition: newDef, french: newFrench,
          exampleSentence: newEx, synonyms: newSyns, antonyms: newAnts,
          otherForms: (existing2 && existing2.otherForms) || []
        };
        const filename = await pickCustomDbFile();
        if (!filename) { fb.style.display = 'none'; return; }
        const normalizedPath = String(filename || '').replace(/\\/g, '/').replace(/^\/+/, '');
        const pathParts = normalizedPath.split('/').filter(Boolean);
        const fileLeafName = pathParts[pathParts.length - 1] || normalizedPath;
        const fileSubdir = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null;
        let entries = [];
        try {
          const result = (fileSubdir && typeof Desktop.readByPath === 'function')
            ? await Desktop.readByPath('customWordbanks', normalizedPath)
            : await Desktop.readText('customWordbanks', fileLeafName);
          if (result && result.ok && result.content) {
            const s = result.content.indexOf('['), e = result.content.lastIndexOf(']');
            if (s !== -1 && e > s) { try { entries = JSON.parse(result.content.slice(s, e + 1)); } catch { } }
          }
        } catch (e3) { }
        try {
          if (typeof WordbankSchema !== 'undefined') {
            WordbankSchema.normalizeWordbankArray(entries, { inPlace: true });
          }
          const ci2 = entries.findIndex(w => w && w.word && w.word.toLowerCase() === newWord.toLowerCase());
          if (ci2 !== -1) { entries[ci2] = entryForCustom; } else { entries.push(entryForCustom); }
          const outEntries = (typeof WordbankSchema !== 'undefined') ? WordbankSchema.compactWordbankArray(entries) : entries;
          const lines = outEntries.map(w => '  ' + JSON.stringify(w));
          const content = `// ${fileLeafName}\nconst customVocabBank = [\n${lines.join(',\n')}\n];\n`;
          await Desktop.saveText('customWordbanks', fileLeafName, content, fileSubdir);
          fb.textContent = `✓ Saved to ${filename}!`;
        } catch (e3) {
          fb.textContent = '⚠ Failed to save to custom DB.';
          fb.style.color = '#ff6b6b';
        }
        setTimeout(() => { fb.style.display = 'none'; }, 2200);
      } else {
        fb.textContent = '✓ Saved!';
        setTimeout(() => { fb.style.display = 'none'; }, 2200);
      }
    }

    function hideWordDetail() {
      timerResume();
      document.getElementById('word-detail-overlay').classList.remove('active', 'det-editing');
      document.getElementById('det-edit-btn').textContent = '✏️';
      _detZoomLevel = 1;
      const inner = document.querySelector('#word-detail-overlay .det-inner');
      if (inner) inner.style.transform = '';
      _detWordList = [];
      _detWordHistory = [];
      const cb = _wordDetailOnClose;
      _wordDetailOnClose = null;
      if (typeof cb === 'function') cb();
    }

    function showExplanationBtn(wordObj, containerId) {
      if (!wordObj) return;
      const container = document.getElementById(containerId);
      if (!container) return;
      // Remove any existing explanation btn
      const existing = container.querySelector('.btn-explain');
      if (existing) existing.remove();
      const btn = document.createElement('button');
      btn.className = 'action-btn btn-explain';
      btn.textContent = '📖 Explanation';
      btn.onclick = () => showWordDetail(wordObj.word);
      container.appendChild(btn);
    }

    // --- Updated Overlay Logic ---
    let successNextCallback = null;
    function showSuccess(nextFn) {
      timerPause();
      successNextCallback = nextFn || null;
      const overlay = document.getElementById('success-overlay');
      const btn = document.getElementById('success-next-btn');
      if (teams && teams.length > 1) {
        const nextIdx = (currentTeamIdx + 1) % teams.length;
        btn.textContent = t('passTo') + ' ' + teams[nextIdx].name;
      } else {
        btn.textContent = t('btnNextWord');
      }
      overlay.classList.add('active');
    }

    function hideSuccess() {
      timerResume();
      document.getElementById('success-overlay').classList.remove('active');
      const cb = successNextCallback;
      successNextCallback = null;
      if (typeof cb === 'function') cb();
    }

    let failureNextCallback = null;
    let failureAutoHideId = null;
    let failureRawMessage = '';

    function escapeHtml(raw) {
      return String(raw || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderFailureMessage(customMsg) {
      const msgEl = document.getElementById('failure-msg');
      if (!msgEl) return;

      const msg = String(customMsg || '');
      failureRawMessage = msg;

      const colonIdx = msg.indexOf(':');
      if (colonIdx >= 0 && colonIdx < msg.length - 1) {
        const left = msg.slice(0, colonIdx + 1);
        const right = msg.slice(colonIdx + 1).trim();
        if (right) {
          msgEl.innerHTML = escapeHtml(left + ' ')
            + '<span class="failure-msg-highlight" style="font-weight:800;color:white;padding:0 6px;border-radius:6px;">'
            + escapeHtml(right)
            + '</span>';
          return;
        }
      }

      msgEl.textContent = msg;
    }

    function showFailure(customMsg = t('betterLuck'), nextFn) {
      timerPause();
      failureNextCallback = nextFn || null;
      if (failureAutoHideId) { clearTimeout(failureAutoHideId); failureAutoHideId = null; }
      const overlay = document.getElementById('failure-overlay');
      renderFailureMessage(customMsg);
      overlay.classList.add('active');
    }

    function hideFailure() {
      timerResume();
      if (failureAutoHideId) { clearTimeout(failureAutoHideId); failureAutoHideId = null; }
      document.getElementById('failure-overlay').classList.remove('active');
      const cb = failureNextCallback;
      failureNextCallback = null;
      if (typeof cb === 'function') cb();
    }

    // --- Core Routing & Filters ---

    // ---- Multi-Theme Picker helpers ----
    function themePickerToggle(btn) {
      const wrap = btn.closest('.theme-picker-wrap');
      const isOpen = wrap.classList.contains('open');
      // close all others first
      document.querySelectorAll('.theme-picker-wrap.open').forEach(w => w.classList.remove('open'));
      if (!isOpen) wrap.classList.add('open');
    }

    // Close pickers when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.theme-picker-wrap') && !e.target.closest('.error-type-picker-wrap') && !e.target.closest('.os-story-picker-wrap')) {
        document.querySelectorAll('.theme-picker-wrap.open, .error-type-picker-wrap.open, .os-story-picker-wrap.open').forEach(w => w.classList.remove('open'));
      }
    });

    function themePickerGetSelected(wrap) {
      const checked = wrap.querySelectorAll('.theme-picker-option input[type=checkbox]:checked');
      const vals = [...checked].map(c => c.value).filter(v => v !== 'all');
      return vals.length === 0 ? ['all'] : vals;
    }

    function themePickerSetSelected(wrap, values) {
      wrap.querySelectorAll('.theme-picker-option input[type=checkbox]').forEach(cb => {
        if (cb.value === 'all') {
          cb.checked = (values.includes('all') || values.length === 0);
        } else {
          cb.checked = values.includes(cb.value);
        }
      });
      themePickerUpdateBtn(wrap);
    }

    function themePickerGetAllLabel(wrap) {
      const allOpt = wrap.querySelector('.theme-picker-option.all-option span');
      return allOpt ? allOpt.textContent : 'All';
    }

    function themePickerGetItemLabel(wrap, value) {
      const opt = wrap.querySelector(`.theme-picker-option input[value="${CSS.escape(value)}"]`);
      return opt ? (opt.nextElementSibling?.textContent || value) : value;
    }

    function themePickerUpdateBtn(wrap, allLabel) {
      const btn = wrap.querySelector('.theme-picker-btn');
      const checked = [...wrap.querySelectorAll('.theme-picker-option input[type=checkbox]:checked')]
        .map(c => c.value).filter(v => v !== 'all');
      const label = allLabel || themePickerGetAllLabel(wrap) || 'All';
      if (checked.length === 0) {
        btn.innerHTML = '';
        btn.appendChild(Object.assign(document.createElement('span'), { textContent: label }));
      } else {
        btn.innerHTML = '';
        checked.forEach(v => {
          const displayLabel = themePickerGetItemLabel(wrap, v);
          const tag = document.createElement('span');
          tag.className = 'theme-tag';
          tag.innerHTML = `${displayLabel}<span class="theme-tag-remove" data-val="${v}" onclick="themeTagRemove(event,this)">✕</span>`;
          btn.appendChild(tag);
        });
      }
    }

    function themeTagRemove(e, span) {
      e.stopPropagation();
      const wrap = span.closest('.theme-picker-wrap');
      const val = span.dataset.val;
      const cb = wrap.querySelector(`.theme-picker-option input[value="${CSS.escape(val)}"]`);
      if (cb) cb.checked = false;
      // sync all-option
      const anyCB = wrap.querySelectorAll('.theme-picker-option input[type=checkbox]:not([value=all])');
      const anyChecked = [...anyCB].some(c => c.checked);
      const allCB = wrap.querySelector('.theme-picker-option input[value=all]');
      if (allCB) allCB.checked = !anyChecked;
      themePickerUpdateBtn(wrap);
      syncAndRefresh();
    }

    function buildThemePickerDropdown(wrap, themes, currentSelected, labelMap, allLabel) {
      // labelMap: optional array of {value, label} for display names
      // allLabel: optional string for the "All" option label
      const dd = wrap.querySelector('.theme-picker-dropdown');
      dd.innerHTML = '';
      // Apply 2-column layout only for theme pickers (not level or pos)
      const isThemePicker = !wrap.classList.contains('level-picker-wrap') && !wrap.classList.contains('pos-picker-wrap') && !wrap.classList.contains('letter-picker-wrap') && !wrap.classList.contains('length-picker-wrap') && !wrap.classList.contains('keyword-picker-wrap') && !wrap.classList.contains('source-picker-wrap');
      dd.classList.toggle('theme-dropdown-cols', isThemePicker);
      const getLabel = v => {
        if (!labelMap) return v;
        const found = labelMap.find(o => o.value === v);
        return found ? found.label : v;
      };

      // "All" option
      const allDiv = document.createElement('div');
      allDiv.className = 'theme-picker-option all-option';
      const allCB = document.createElement('input');
      allCB.type = 'checkbox'; allCB.value = 'all';
      allCB.checked = (currentSelected.includes('all') || currentSelected.length === 0);
      allCB.addEventListener('change', function () {
        if (this.checked) {
          wrap.querySelectorAll('.theme-picker-option input[type=checkbox]').forEach(c => c.checked = false);
          this.checked = true;
        }
        themePickerUpdateBtn(wrap, allLabel); syncAndRefresh();
      });
      allDiv.appendChild(allCB);
      allDiv.appendChild(Object.assign(document.createElement('span'), { textContent: allLabel || 'All' }));
      dd.appendChild(allDiv);

      themes.forEach(t => {
        const div = document.createElement('div');
        div.className = 'theme-picker-option';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.value = t;
        cb.checked = currentSelected.includes(t);
        cb.addEventListener('change', function () {
          const allCb = wrap.querySelector('.theme-picker-option input[value=all]');
          const anyChecked = [...wrap.querySelectorAll('.theme-picker-option input[type=checkbox]:not([value=all])')].some(c => c.checked);
          if (allCb) allCb.checked = !anyChecked;
          themePickerUpdateBtn(wrap, allLabel); syncAndRefresh();
        });
        div.appendChild(cb);
        div.appendChild(Object.assign(document.createElement('span'), { textContent: getLabel(t) }));
        dd.appendChild(div);
      });

      themePickerUpdateBtn(wrap, allLabel);
    }

    // Normalize item.theme to an array — handles string, "A, B", or array
    function getItemThemes(item) {
      const t = item.theme;
      if (!t) return [];
      if (Array.isArray(t)) return t.map(s => s.trim()).filter(Boolean);
      return t.split(',').map(s => s.trim()).filter(Boolean);
    }

    const LEVEL_OPTIONS = [
      { value: 'a1', label: 'A1' }, { value: 'a2', label: 'A2' },
      { value: 'b1', label: 'B1' }, { value: 'b2', label: 'B2' }, { value: 'c1', label: 'C1' }
    ];
    const POS_OPTIONS = [
      { value: 'noun', label: 'Noun' }, { value: 'verb', label: 'Verb' },
      { value: 'adjective', label: 'Adjective' }, { value: 'adverb', label: 'Adverb' }
    ];

    function populateStaticPicker(wrap, options, allLabel) {
      const dd = wrap.querySelector('.theme-picker-dropdown');
      if (!dd || dd.children.length > 0) return; // already built
      const current = themePickerGetSelected(wrap);
      buildThemePickerDropdown(wrap, options.map(o => o.value), current, options, allLabel);
    }

    function populateAllLevelMenus() {
      document.querySelectorAll('.level-picker-wrap').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, LEVEL_OPTIONS.map(o => o.value), current, LEVEL_OPTIONS, t('allLevels'));
      });
    }

    function populateAllPosMenus() {
      const types = [...new Set(vocabBank.flatMap(item => item.partOfSpeech ? (Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [item.partOfSpeech]) : []).filter(Boolean))].sort();
      document.querySelectorAll('.pos-picker-wrap').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, types, current, null, t('allTypes'));
      });
    }

    function populateAllLetterMenus() {
      const letters = [...new Set(vocabBank.map(item => item.word ? item.word[0].toUpperCase() : '').filter(Boolean))].sort();
      document.querySelectorAll('.letter-picker-wrap').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, letters, current, null, t('All letters'));
      });
    }

    function populateAllLengthMenus() {
      const lengths = [...new Set(vocabBank.map(item => item.word ? String(item.word.length) : '').filter(Boolean))].sort((a, b) => Number(a) - Number(b));
      const labelMap = lengths.map(l => ({ value: l, label: l + (l === '1' ? ' letter' : ' letters') }));
      document.querySelectorAll('.length-picker-wrap').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, lengths, current, labelMap, t('All Lengths'));
      });
    }

    function populateAllKeywordMenus() {
      const keywords = [...new Set(vocabBank.flatMap(item => (item.keywords || [])).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      document.querySelectorAll('.keyword-picker-wrap').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, keywords, current, null, t('All Keywords'));
      });
    }

    function populateAllSourceMenus() {
      const SOURCE_LABELS = { worddb: 'Word DB', custom: 'Custom Added' };
      const sources = [...new Set([...vocabBank.map(w => w._source).filter(Boolean), ..._customDbSources])].sort();
      document.querySelectorAll('.source-picker-wrap').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, sources, current,
          sources.map(s => ({ value: s, label: SOURCE_LABELS[s] || s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) })),
          t('All Sources'));
      });
    }

    function populateAllThemeMenus() {
      const themes = [...new Set(vocabBank.flatMap(item => getItemThemes(item)))].sort((a, b) => a.localeCompare(b));
      document.querySelectorAll('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, themes, current, null, t('allThemes'));
      });
      populateAllLevelMenus();
      populateAllPosMenus();
      populateAllLetterMenus();
      populateAllLengthMenus();
      populateAllKeywordMenus();
      populateAllSourceMenus();
    }

    const SIMPLE_WORD_SECTIONS = new Set([
      'hangman-game-section', 'scramble-game-section', 'clue-game-section',
      'ipa-game-section', 'synonym-game-section', 'wordsearch-game-section'
    ]);

    function updateAllFilterCounts() {
      if (!activeSection) return;
      const current = document.getElementById(activeSection);
      if (!current) return;
      const THEME_SEL = '.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)';
      const lvls = current.querySelector('.level-picker-wrap') ? themePickerGetSelected(current.querySelector('.level-picker-wrap')) : ['all'];
      const thms = current.querySelector(THEME_SEL) ? themePickerGetSelected(current.querySelector(THEME_SEL)) : ['all'];
      const poss = current.querySelector('.pos-picker-wrap') ? themePickerGetSelected(current.querySelector('.pos-picker-wrap')) : ['all'];
      const letts = current.querySelector('.letter-picker-wrap') ? themePickerGetSelected(current.querySelector('.letter-picker-wrap')) : ['all'];
      const lens = current.querySelector('.length-picker-wrap') ? themePickerGetSelected(current.querySelector('.length-picker-wrap')) : ['all'];
      const kwrds = current.querySelector('.keyword-picker-wrap') ? themePickerGetSelected(current.querySelector('.keyword-picker-wrap')) : ['all'];
      const srcs = current.querySelector('.source-picker-wrap') ? themePickerGetSelected(current.querySelector('.source-picker-wrap')) : ['all'];
      const simple = SIMPLE_WORD_SECTIONS.has(activeSection);

      function matchItem(item, skip) {
        const lvlM = skip === 'level' || lvls.includes('all') || (item.level && lvls.includes(item.level.toLowerCase()));
        const thmM = skip === 'theme' || thms.includes('all') || getItemThemes(item).some(t => thms.includes(t));
        const posM = skip === 'pos' || poss.includes('all') || (item.partOfSpeech && (Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [item.partOfSpeech]).some(p => poss.includes(p.toLowerCase())));
        const letM = skip === 'letter' || letts.includes('all') || (item.word && letts.includes(item.word[0].toUpperCase()));
        const lenM = skip === 'length' || lens.includes('all') || (item.word && lens.includes(String(item.word.length)));
        const kwrdM = skip === 'keyword' || kwrds.includes('all') || (item.keywords || []).some(k => kwrds.includes(k));
        const srcM = skip === 'source' || srcs.includes('all') || (Array.isArray(item._sources) ? item._sources : item._source ? [item._source] : []).some(s => srcs.includes(s));
        return lvlM && thmM && posM && letM && lenM && kwrdM && srcM && (!simple || isSimpleWord(item));
      }

      function buildCounts(skip, getVals) {
        const counts = {}; let total = 0;
        vocabBank.forEach(item => {
          if (!matchItem(item, skip)) return;
          total++;
          getVals(item).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        });
        return { counts, total };
      }

      function applyToWrap(wrap, counts, total) {
        wrap.querySelectorAll('.theme-picker-option').forEach(div => {
          const cb = div.querySelector('input[type=checkbox]');
          if (!cb) return;
          let cs = div.querySelector('.filter-count');
          if (!cs) { cs = document.createElement('span'); cs.className = 'filter-count'; div.appendChild(cs); }
          if (cb.value === 'all') {
            cs.textContent = '(' + total + ')';
            div.classList.remove('filter-empty');
          } else {
            const c = counts[cb.value] || 0;
            cs.textContent = '(' + c + ')';
            div.classList.toggle('filter-empty', c === 0 && !cb.checked);
          }
        });
      }

      const lvlD = buildCounts('level', item => item.level ? [item.level.toLowerCase()] : []);
      const thmD = buildCounts('theme', item => getItemThemes(item));
      const posD = buildCounts('pos', item => (item.partOfSpeech ? (Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [item.partOfSpeech]) : []).map(p => p.toLowerCase()).filter(Boolean));
      const letD = buildCounts('letter', item => item.word ? [item.word[0].toUpperCase()] : []);
      const lenD = buildCounts('length', item => item.word ? [String(item.word.length)] : []);
      const kwrdD = buildCounts('keyword', item => (item.keywords || []).filter(Boolean));
      const srcD = buildCounts('source', item => Array.isArray(item._sources) && item._sources.length ? item._sources : (item._source ? [item._source] : []));

      document.querySelectorAll('.level-picker-wrap').forEach(w => applyToWrap(w, lvlD.counts, lvlD.total));
      document.querySelectorAll(THEME_SEL).forEach(w => applyToWrap(w, thmD.counts, thmD.total));
      document.querySelectorAll('.pos-picker-wrap').forEach(w => applyToWrap(w, posD.counts, posD.total));
      document.querySelectorAll('.letter-picker-wrap').forEach(w => applyToWrap(w, letD.counts, letD.total));
      document.querySelectorAll('.length-picker-wrap').forEach(w => applyToWrap(w, lenD.counts, lenD.total));
      document.querySelectorAll('.keyword-picker-wrap').forEach(w => applyToWrap(w, kwrdD.counts, kwrdD.total));
      document.querySelectorAll('.source-picker-wrap').forEach(w => applyToWrap(w, srcD.counts, srcD.total));
    }

    function isSimpleWord(item) {
      const w = item.word || '';
      if (/[()]/.test(w)) return false;        // exclude parentheses
      if (w.trim().includes(' ')) return false; // exclude multi-word
      return true;
    }

    let ltStarredOnly = false;

    function _syncAllStarredBtns() {
      document.querySelectorAll('#lt-starred-toggle, .lt-starred-btn').forEach(b => {
        b.textContent = ltStarredOnly ? '★ Starred' : '☆ All';
        b.classList.toggle('btn-yellow', ltStarredOnly);
      });
    }

    function ltToggleStarredFilter() {
      ltStarredOnly = !ltStarredOnly;
      _syncAllStarredBtns();
      if (activeSection !== 'main-menu') refreshCurrentGame();
      updateAllFilterCounts();
    }

    function getFilteredBank() {
      const current = document.getElementById(activeSection);
      const lvls = current.querySelector('.level-picker-wrap') ? themePickerGetSelected(current.querySelector('.level-picker-wrap')) : ['all'];
      const thms = current.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)') ? themePickerGetSelected(current.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)')) : ['all'];
      const poss = current.querySelector('.pos-picker-wrap') ? themePickerGetSelected(current.querySelector('.pos-picker-wrap')) : ['all'];
      const letts = current.querySelector('.letter-picker-wrap') ? themePickerGetSelected(current.querySelector('.letter-picker-wrap')) : ['all'];
      const lens = current.querySelector('.length-picker-wrap') ? themePickerGetSelected(current.querySelector('.length-picker-wrap')) : ['all'];
      const kwrds = current.querySelector('.keyword-picker-wrap') ? themePickerGetSelected(current.querySelector('.keyword-picker-wrap')) : ['all'];
      const srcs = current.querySelector('.source-picker-wrap') ? themePickerGetSelected(current.querySelector('.source-picker-wrap')) : ['all'];
      const simple = SIMPLE_WORD_SECTIONS.has(activeSection);
      return vocabBank.filter(item => {
        const lvlM = (lvls.includes('all') || (item.level && lvls.includes(item.level.toLowerCase())));
        const thmM = (thms.includes('all') || getItemThemes(item).some(t => thms.includes(t)));
        const posM = (poss.includes('all') || (item.partOfSpeech && (Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [item.partOfSpeech]).some(p => poss.includes(p.toLowerCase()))));
        const letM = (letts.includes('all') || (item.word && letts.includes(item.word[0].toUpperCase())));
        const lenM = (lens.includes('all') || (item.word && lens.includes(String(item.word.length))));
        const kwrdM = (kwrds.includes('all') || ((item.keywords || []).some(k => kwrds.includes(k))));
        const srcM = (srcs.includes('all') || (Array.isArray(item._sources) ? item._sources : item._source ? [item._source] : []).some(s => srcs.includes(s)));
        const starM = !ltStarredOnly || !!item.starred;
        return lvlM && thmM && posM && letM && lenM && kwrdM && srcM && starM && (!simple || isSimpleWord(item));
      });
    }

    function syncAndRefresh() {
      usedWords.clear();
      const current = document.getElementById(activeSection);
      const lvls = current.querySelector('.level-picker-wrap') ? themePickerGetSelected(current.querySelector('.level-picker-wrap')) : ['all'];
      const thms = current.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)') ? themePickerGetSelected(current.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)')) : ['all'];
      const poss = current.querySelector('.pos-picker-wrap') ? themePickerGetSelected(current.querySelector('.pos-picker-wrap')) : ['all'];
      const letts = current.querySelector('.letter-picker-wrap') ? themePickerGetSelected(current.querySelector('.letter-picker-wrap')) : ['all'];
      const lens = current.querySelector('.length-picker-wrap') ? themePickerGetSelected(current.querySelector('.length-picker-wrap')) : ['all'];
      const kwrds = current.querySelector('.keyword-picker-wrap') ? themePickerGetSelected(current.querySelector('.keyword-picker-wrap')) : ['all'];
      const srcs = current.querySelector('.source-picker-wrap') ? themePickerGetSelected(current.querySelector('.source-picker-wrap')) : ['all'];

      document.querySelectorAll('.level-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, lvls));
      document.querySelectorAll('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)').forEach(wrap => themePickerSetSelected(wrap, thms));
      document.querySelectorAll('.pos-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, poss));
      document.querySelectorAll('.letter-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, letts));
      document.querySelectorAll('.length-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, lens));
      document.querySelectorAll('.keyword-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, kwrds));
      document.querySelectorAll('.source-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, srcs));

      if (activeSection !== 'main-menu') refreshCurrentGame();
      updateAllFilterCounts();
    }

    function navTo(sectionId) {
      const oldSection = document.getElementById(activeSection);
      const lvls = oldSection.querySelector('.level-picker-wrap') ? themePickerGetSelected(oldSection.querySelector('.level-picker-wrap')) : ['all'];
      const thms = oldSection.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)') ? themePickerGetSelected(oldSection.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)')) : ['all'];
      const poss = oldSection.querySelector('.pos-picker-wrap') ? themePickerGetSelected(oldSection.querySelector('.pos-picker-wrap')) : ['all'];
      const letts = oldSection.querySelector('.letter-picker-wrap') ? themePickerGetSelected(oldSection.querySelector('.letter-picker-wrap')) : ['all'];
      const lens = oldSection.querySelector('.length-picker-wrap') ? themePickerGetSelected(oldSection.querySelector('.length-picker-wrap')) : ['all'];
      const kwrds = oldSection.querySelector('.keyword-picker-wrap') ? themePickerGetSelected(oldSection.querySelector('.keyword-picker-wrap')) : ['all'];
      const srcs = oldSection.querySelector('.source-picker-wrap') ? themePickerGetSelected(oldSection.querySelector('.source-picker-wrap')) : ['all'];

      // Clear team background from the section we're leaving
      oldSection.style.background = '';
      oldSection.style.borderColor = '';
      oldSection.style.boxShadow = '';

      if (activeSection === 'werewolf-section' && sectionId !== 'werewolf-section') {
        wwStopAutoAdvance();
      }
      if (presentationState.active && presentationState.sectionId !== sectionId) {
        presentationExit();
      }

      activeSection = sectionId;
      usedWords.clear();
      document.querySelectorAll('.game').forEach(s => s.classList.add('hidden'));

      const target = document.getElementById(sectionId);
      target.classList.remove('hidden');

      if (sectionId !== 'main-menu') {
        const mount = target.querySelector('.filter-mount');
        if (mount && !mount.innerHTML) {
          mount.appendChild(document.getElementById('filter-template').content.cloneNode(true));
          if (ltStarredOnly) {
            const sb = mount.querySelector('.lt-starred-btn');
            if (sb) { sb.textContent = '★ Starred'; sb.classList.add('btn-yellow'); }
          }
        }

        if (sectionId === 'gap-game-section') {
          awPopulateSourceSelect('gap-source-select', 'gaps');
          populateGrammarMenu();
        }

        if (sectionId === 'error-game-section') {
          buildErrorTypeFilter();
        } else if (sectionId === 'order-sentences-section') {
          buildOrderStoryFilter();
        } else {
          populateAllThemeMenus();
          if (target.querySelector('.level-picker-wrap')) themePickerSetSelected(target.querySelector('.level-picker-wrap'), lvls);
          if (target.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)')) themePickerSetSelected(target.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)'), thms);
          if (target.querySelector('.letter-picker-wrap')) themePickerSetSelected(target.querySelector('.letter-picker-wrap'), letts);
          if (target.querySelector('.length-picker-wrap')) themePickerSetSelected(target.querySelector('.length-picker-wrap'), lens);
          if (target.querySelector('.pos-picker-wrap')) themePickerSetSelected(target.querySelector('.pos-picker-wrap'), poss);
          if (target.querySelector('.keyword-picker-wrap')) themePickerSetSelected(target.querySelector('.keyword-picker-wrap'), kwrds);
          if (target.querySelector('.source-picker-wrap')) themePickerSetSelected(target.querySelector('.source-picker-wrap'), srcs);
        }

        if (teams.length >= 2 && sectionId in GAME_TEAM_UI_MAP) {
          pregameShow(sectionId);
        } else {
          if (sectionId === 'story-section') {
            awPopulateSourceSelect('story-source-select', 'stories');
          }
          refreshCurrentGame();
          renderGameTeamUI();
        }
        updateAllFilterCounts();
      } else {
        populateAllThemeMenus();
        updateAllFilterCounts();
      }
    }

    function openHelp() {
      document.getElementById('help-overlay').classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function closeHelp() {
      document.getElementById('help-overlay').classList.remove('active');
      document.body.style.overflow = '';
    }

    function resetAllFilters() {
      usedWords.clear();
      document.querySelectorAll('.theme-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, ['all']));
      ltStarredOnly = false;
      _syncAllStarredBtns();
      if (activeSection !== 'main-menu') refreshCurrentGame();
      updateAllFilterCounts();
    }

    function showActiveWordsPopup() {
      const words = getFilteredBank()
        .map(w => w.word || '')
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      const overlay = document.getElementById('active-words-overlay');
      document.getElementById('active-words-count').textContent = words.length + ' word' + (words.length !== 1 ? 's' : '');
      document.getElementById('active-words-list').textContent = words.join(', ');
      overlay.style.display = 'flex';
    }

    function closeActiveWordsPopup() {
      document.getElementById('active-words-overlay').style.display = 'none';
    }

    function refreshCurrentGame() {
      if (activeSection === 'match-game-section') initMatchGame();
      if (activeSection === 'flip-game-section') initFlipGame();
      if (activeSection === 'hangman-game-section') selectRandomWord();
      if (activeSection === 'scramble-game-section') initScrambleGame();
      if (activeSection === 'clue-game-section') initClueGame();
      if (activeSection === 'sentence-game-section') selectRandomSentence();
      if (activeSection === 'quote-game-section') initQuoteGame();
      if (activeSection === 'gap-game-section') { clearGapUsed(); initGapGame(); }
      if (activeSection === 'error-game-section') initErrorGame();
      if (activeSection === 'ipa-game-section') initIpaGame();
      if (activeSection === 'synonym-game-section') initSynGame();
      if (activeSection === 'wordsearch-game-section') initWordSearch();
      if (activeSection === 'words-seen-today-section') renderWordsSeenToday();
      if (activeSection === 'list-section') renderFullList();
      if (activeSection === 'grammar-practice-section') gpInit();
      if (activeSection === 'dictation-section') dictInit();
      if (activeSection === 'add-word-section') { mdbOpen(); mdbShowTab('add'); return; }
      if (activeSection === 'story-section') initStorySection();
      if (activeSection === 'order-sentences-section') osInit();
      if (activeSection === 'quiz-section') quizInit();
      if (activeSection === 'werewolf-section') wwInit();
    }

    function getRandomSet(count, extraFilter) {
      const filtered = getFilteredBank();
      let available = filtered.filter(item => !usedWords.has(item.word));
      if (extraFilter) available = available.filter(extraFilter);
      if (available.length < count) {
        usedWords.clear();
        available = extraFilter ? filtered.filter(extraFilter) : filtered;
      }
      const picked = [...available].sort(() => Math.random() - 0.5).slice(0, Math.min(count, available.length));
      picked.forEach(item => usedWords.add(item.word));
      return picked;
    }

    // --- SESSION DEDUPLICATION ---

    function pickUnused(pool) {
      // Filter out already-used words
      let available = pool.filter(item => !usedWords.has(item.word));
      // If all used, reset and start fresh
      if (available.length === 0) {
        usedWords.clear();
        available = pool;
      }
      const item = available[Math.floor(Math.random() * available.length)];
      usedWords.add(item.word);
      return item;
    }


