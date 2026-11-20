    // ================================================================
    // ADD WORDS TO DATABASE
    // ================================================================

    const AW_STORAGE_KEY = 'custom_words';
    const AW_QUOTES_KEY = 'custom_quotes';
    const AW_GAP_KEY = 'custom_gaps';
    const AW_ERROR_KEY = 'custom_errors';
    const AW_NON_WORD_TYPES = ['quotes', 'gaps', 'errors', 'dictations', 'grammar', 'sentences', 'stories'];
    const AW_SOURCE_IDS = {
      words: 'worddb',
      quotes: 'quotebank',
      gaps: 'gapfillbank',
      errors: 'errorbank',
      dictations: 'dictation',
      grammar: 'grammar',
      sentences: 'ordersentences',
      stories: 'choosestory'
    };
    const AW_SOURCE_LABELS = {
      worddb: 'Word DB',
      quotebank: 'Quote Bank',
      gapfillbank: 'Gap Fill Bank',
      errorbank: 'Error Bank',
      dictation: 'Dictation Bank',
      grammar: 'Grammar Bank',
      ordersentences: 'Sentence Bank',
      choosestory: 'Story Bank'
    };
    const _selectedCustomDbByType = {
      words: 'all',
      quotes: 'all',
      gaps: 'all',
      errors: 'all',
      dictations: 'all',
      grammar: 'all',
      sentences: 'all',
      stories: 'all'
    };

    function awGetCustomWords() { try { return JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || []; } catch { return []; } }
    function awGetCustomQuotes() { try { return JSON.parse(localStorage.getItem(AW_QUOTES_KEY)) || []; } catch { return []; } }
    function awGetCustomGaps() { try { return JSON.parse(localStorage.getItem(AW_GAP_KEY)) || []; } catch { return []; } }
    function awGetCustomErrors() { try { return JSON.parse(localStorage.getItem(AW_ERROR_KEY)) || []; } catch { return []; } }

    function awSaveCustomWords(w) { localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(w)); }
    function awSaveCustomQuotes(q) { localStorage.setItem(AW_QUOTES_KEY, JSON.stringify(q)); }
    function awSaveCustomGaps(g) { localStorage.setItem(AW_GAP_KEY, JSON.stringify(g)); }
    function awSaveCustomErrors(e) { localStorage.setItem(AW_ERROR_KEY, JSON.stringify(e)); }

    function awLoadCustomWords() {
      const custom = awGetCustomWords(); if (!custom.length) return;
      custom.forEach(w => {
        w._source = 'custom';
        const bi = vocabBank.findIndex(v => v.word.toLowerCase() === w.word.toLowerCase());
        if (bi !== -1) { vocabBank[bi] = w; } else { vocabBank.push(w); }
      });
    }

    function awMarkBuiltinBankSources() {
      const map = [
        ['words', window.vocabBank],
        ['quotes', window.quoteBank],
        ['gaps', window.gapFillBank],
        ['errors', window.errorBank],
        ['dictations', window.dictationBank],
        ['grammar', window.grammarData],
        ['sentences', window.orderSentences],
        ['stories', window.chooseStoryBank]
      ];
      map.forEach(([type, bank]) => {
        if (!Array.isArray(bank)) return;
        const source = AW_SOURCE_IDS[type] || type;
        bank.forEach((item) => {
          if (item && !item._source) item._source = source;
        });
      });
    }

    async function awLoadFileBackedCustomBanks() {
      if (!window.CustomBankUtils || !window.Desktop || !Desktop.isElectron()) return;
      awMarkBuiltinBankSources();
      for (const type of ['words'].concat(AW_NON_WORD_TYPES)) {
        try {
          await CustomBankUtils.loadCustomBanksForType(type);
        } catch (err) {
          console.warn('Custom bank load failed for type:', type, err);
        }
      }
    }

    let _customDbSources = [];
    let _customDbInitPromise = null;

    function awSourceLabel(sourceId) {
      const clean = String(sourceId || '').trim();
      if (!clean) return 'Unknown Source';
      return AW_SOURCE_LABELS[clean] || clean.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    function awGetBankByType(type) {
      const map = {
        words: window.vocabBank,
        quotes: window.quoteBank,
        gaps: window.gapFillBank,
        errors: window.errorBank,
        dictations: window.dictationBank,
        grammar: window.grammarData,
        sentences: window.orderSentences,
        stories: window.chooseStoryBank
      };
      return Array.isArray(map[type]) ? map[type] : [];
    }

    function awGetSourceSelection(type) {
      return _selectedCustomDbByType[type] || 'all';
    }

    function awSetSourceSelection(type, sourceId) {
      _selectedCustomDbByType[type] = String(sourceId || 'all');
    }

    function awGetSourceOptionsForType(type) {
      const bank = awGetBankByType(type);
      const baseSource = AW_SOURCE_IDS[type] || type;
      const seen = new Set();
      const options = [];
      bank.forEach((item) => {
        const source = String((item && item._source) || '').trim();
        if (!source || source === baseSource || source === 'custom') return;
        if (seen.has(source)) return;
        seen.add(source);
        options.push({ value: source, label: awSourceLabel(source) });
      });
      options.sort((a, b) => a.label.localeCompare(b.label));
      return options;
    }

    function awGetBankFilteredBySource(type) {
      const bank = awGetBankByType(type);
      const selected = awGetSourceSelection(type);
      if (selected === 'all') return bank;
      const baseSource = AW_SOURCE_IDS[type] || type;
      if (selected === 'builtin') {
        return bank.filter((item) => {
          const source = String((item && item._source) || '').trim();
          return !source || source === baseSource;
        });
      }
      return bank.filter((item) => String((item && item._source) || '').trim() === selected);
    }

    function awPopulateSourceSelect(selectId, type, labels) {
      const select = document.getElementById(selectId);
      if (!select) return;

      const options = awGetSourceOptionsForType(type);
      const selected = awGetSourceSelection(type);
      const text = Object.assign({
        all: 'All Databases',
        builtin: 'Main Database'
      }, labels || {});

      const html = [`<option value="all">${text.all}</option>`, `<option value="builtin">${text.builtin}</option>`]
        .concat(options.map((opt) => `<option value="${opt.value}">${opt.label}</option>`))
        .join('');
      select.innerHTML = html;

      const valid = selected === 'all' || selected === 'builtin' || options.some((opt) => opt.value === selected);
      if (!valid) awSetSourceSelection(type, 'all');
      select.value = awGetSourceSelection(type);
    }

    function onGapSourceChanged() {
      const select = document.getElementById('gap-source-select');
      if (!select) return;
      awSetSourceSelection('gaps', select.value);
      clearGapUsed();
      populateGrammarMenu();
      initGapGame();
    }

    function onStorySourceChanged() {
      const select = document.getElementById('story-source-select');
      if (!select) return;
      awSetSourceSelection('stories', select.value);
      initStorySection();
    }

    async function initCustomDatabases() {
      await awLoadFileBackedCustomBanks();

      if (!(window.Desktop && Desktop.isElectron())) {
        awLoadCustomWords();
      }

      awLoadCustomQuotes();
      awLoadCustomGaps();
      awLoadCustomErrors();
    }

    function scheduleCustomDatabasesInit() {
      if (_customDbInitPromise) return _customDbInitPromise;
      _customDbInitPromise = (async () => {
        await initCustomDatabases();
        if (window.CustomBankUtils) {
          const _wordFiles = await CustomBankUtils.listCustomFiles('words');
          const _baseFile = CustomBankUtils.getConfig('words').baseFile;
          _customDbSources = _wordFiles
            .map(f => String((f && (f.filename || f.relativePath)) || '').trim())
            .filter(name => name && name.toLowerCase() !== _baseFile.toLowerCase())
            .map(name => name.replace(/\.js$/i, ''))
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .sort();
        }
        awPopulateSourceSelect('gap-source-select', 'gaps');
        awPopulateSourceSelect('story-source-select', 'stories');
        if (typeof populateAllThemeMenus === 'function') populateAllThemeMenus();
        if (typeof updateAllFilterCounts === 'function') updateAllFilterCounts();
        if (activeSection && activeSection !== 'main-menu' && typeof refreshCurrentGame === 'function') {
          refreshCurrentGame();
        }
      })();
      return _customDbInitPromise;
    }
    function awLoadCustomQuotes() {
      const custom = awGetCustomQuotes(); if (!custom.length) return;
      const keyOf = v => String(v || '').trim().toLowerCase();
      const origKeys = new Set(quoteBank.map(q => keyOf(q && q.quote)).filter(Boolean));
      custom.forEach(q => {
        const key = keyOf(q && q.quote);
        if (!key || origKeys.has(key)) return;
        quoteBank.push(q);
        origKeys.add(key);
      });
    }
    function awLoadCustomGaps() {
      const custom = awGetCustomGaps(); if (!custom.length) return;
      const keyOf = v => String(v || '').trim().toLowerCase();
      const origKeys = new Set(gapFillBank.map(g => keyOf(g && g.sentence)).filter(Boolean));
      custom.forEach(g => {
        const key = keyOf(g && g.sentence);
        if (!key || origKeys.has(key)) return;
        gapFillBank.push(g);
        origKeys.add(key);
      });
    }
    function awLoadCustomErrors() {
      const custom = awGetCustomErrors(); if (!custom.length) return;
      const keyOf = v => String(v || '').trim().toLowerCase();
      const origKeys = new Set(errorBank.map(e => keyOf(e && e.correct)).filter(Boolean));
      custom.forEach(e => {
        const key = keyOf(e && e.correct);
        if (!key || origKeys.has(key)) return;
        errorBank.push(e);
        origKeys.add(key);
      });
    }

    function awSetTab(tab) {
      ['form', 'quote', 'gap', 'error', 'bulk'].forEach(t => {
        const tabEl = document.getElementById('aw-tab-' + t);
        const panelEl = document.getElementById('aw-panel-' + t);
        if (tabEl) tabEl.classList.toggle('active', t === tab);
        if (panelEl) panelEl.classList.toggle('hidden', t !== tab);
      });
      if (tab === 'form') awPopulateThemeDatalist();
      if (tab === 'gap') awPopulateGapGrammarDatalist();
      if (tab === 'quote') awPopulateQuoteThemeDatalist();
    }

    function awSetManageTab(sub) {
      ['words', 'quotes', 'gaps', 'errors'].forEach(s => {
        document.getElementById('aw-mt-' + s).classList.toggle('active', s === sub);
        document.getElementById('aw-manage-' + s + '-panel').style.display = s === sub ? '' : 'none';
      });
      if (sub === 'words') awRenderManageWords();
      if (sub === 'quotes') awRenderManageQuotes();
      if (sub === 'gaps') awRenderManageGaps();
      if (sub === 'errors') awRenderManageErrors();
    }

    function awPopulateThemeDatalist() {
      const dl = document.getElementById('aw-theme-list'); if (!dl) return;
      const themes = [...new Set(vocabBank.flatMap(w => getItemThemes(w)))].sort();
      dl.innerHTML = themes.map(t => `<option value="${t}">`).join('');
    }
    function awPopulateQuoteThemeDatalist() {
      const dl = document.getElementById('aw-quote-theme-list'); if (!dl) return;
      const themes = [...new Set(quoteBank.map(q => q.theme).filter(Boolean))].sort();
      dl.innerHTML = themes.map(t => `<option value="${t}">`).join('');
    }
    function awPopulateGapGrammarDatalist() {
      const dl = document.getElementById('aw-gap-grammar-list'); if (!dl) return;
      const types = [...new Set(gapFillBank.map(g => g.grammarType).filter(Boolean))].sort();
      dl.innerHTML = types.map(t => `<option value="${t}">`).join('');
    }

    function awSetFeedback(id, msg, type) {
      const el = document.getElementById(id); el.textContent = msg; el.className = 'aw-feedback ' + type;
      if (type === 'ok') setTimeout(() => { el.textContent = ''; el.className = 'aw-feedback'; }, 3000);
    }

    function awParseCSV(str) { return str.split(',').map(s => s.trim()).filter(Boolean); }

    // ---- WORDS ----
    function awClearForm() {
      ['aw-word', 'aw-ipa', 'aw-french', 'aw-english', 'aw-german', 'aw-italian', 'aw-pos', 'aw-level', 'aw-theme', 'aw-definition', 'aw-example', 'aw-synonyms', 'aw-antonyms']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('aw-form-feedback').textContent = '';
    }

    function awFillForm(w) {
      document.getElementById('aw-word').value = w.word || '';
      document.getElementById('aw-ipa').value = w.ipa || '';
      document.getElementById('aw-french').value = w.french || '';
      const awEn = document.getElementById('aw-english'); if (awEn) awEn.value = w.english || '';
      const awDe = document.getElementById('aw-german'); if (awDe) awDe.value = w.german || '';
      const awIt = document.getElementById('aw-italian'); if (awIt) awIt.value = w.italian || '';
      document.getElementById('aw-pos').value = w.partOfSpeech || '';
      document.getElementById('aw-level').value = w.level || '';
      document.getElementById('aw-theme').value = getItemThemes(w).join(', ');
      document.getElementById('aw-definition').value = _editableStr(w.definition);
      document.getElementById('aw-example').value = _editableStr(w.exampleSentence);
      document.getElementById('aw-synonyms').value = (w.synonyms || []).join(', ');
      document.getElementById('aw-antonyms').value = (w.antonyms || []).join(', ');
    }

    let awEditIdx = -1;

    function awEditWord(idx) {
      const custom = awGetCustomWords(); const w = custom[idx]; if (!w) return;
      awEditIdx = idx; awFillForm(w);
      document.getElementById('aw-word').disabled = true;
      document.getElementById('aw-submit-btn').textContent = t('saveChanges');
      document.getElementById('aw-edit-banner').style.display = '';
      document.getElementById('aw-edit-word-name').textContent = w.word;
      document.getElementById('aw-form-feedback').textContent = '';
      awSetTab('form');
      document.getElementById('aw-word').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function awCancelEdit() {
      awEditIdx = -1;
      document.getElementById('aw-word').disabled = false;
      document.getElementById('aw-submit-btn').textContent = t('addWordBtn');
      document.getElementById('aw-edit-banner').style.display = 'none';
      awClearForm();
    }

    function awWikiLookup() {
      if (!window.WiktionaryLookup || !WiktionaryLookup.isAvailable()) return;
      const word = document.getElementById('aw-word').value.trim();
      if (!word) { awSetFeedback('aw-form-feedback', '⚠ Enter a word first.', 'err'); return; }
      const btn = document.getElementById('aw-wiki-btn');
      const originalText = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
      const preferredPos = document.getElementById('aw-pos').value || '';
      WiktionaryLookup.find(word, preferredPos).then(data => {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
        if (!data) { awSetFeedback('aw-form-feedback', `"${word}" was not found in Wiktionary.`, 'err'); return; }
        const filled = [];
        const ipaEl = document.getElementById('aw-ipa');
        if (!ipaEl.value.trim() && data.ipa) { ipaEl.value = data.ipa; filled.push('IPA'); }
        const posEl = document.getElementById('aw-pos');
        if (!posEl.value && data.pos) { posEl.value = data.pos; filled.push('part of speech'); }
        const defEl = document.getElementById('aw-definition');
        if (!defEl.value.trim() && data.definition) { defEl.value = data.definition; filled.push('definition'); }
        const exEl = document.getElementById('aw-example');
        if (!exEl.value.trim() && data.example) { exEl.value = data.example; filled.push('example'); }
        const synEl = document.getElementById('aw-synonyms');
        if (!synEl.value.trim() && data.synonyms.length) { synEl.value = data.synonyms.join(', '); filled.push('synonyms'); }
        const antEl = document.getElementById('aw-antonyms');
        if (!antEl.value.trim() && data.antonyms.length) { antEl.value = data.antonyms.join(', '); filled.push('antonyms'); }
        const msg = filled.length
          ? `✓ Filled from Wiktionary: ${filled.join(', ')}.`
          : '✓ Found in Wiktionary — all fields already filled.';
        awSetFeedback('aw-form-feedback', msg, 'ok');
      }).catch(() => {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
        awSetFeedback('aw-form-feedback', '⚠ Wiktionary lookup failed.', 'err');
      });
    }

    function awSubmitForm() {
      const word = document.getElementById('aw-word').value.trim();
      const french = document.getElementById('aw-french').value.trim();
      const english = (document.getElementById('aw-english')?.value || '').trim() || word;
      const german = (document.getElementById('aw-german')?.value || '').trim();
      const italian = (document.getElementById('aw-italian')?.value || '').trim();
      const definition = _parseLines(document.getElementById('aw-definition').value);
      const exampleSentence = _parseLines(document.getElementById('aw-example').value);
      if (!word) { awSetFeedback('aw-form-feedback', '⚠ Word is required.', 'err'); return; }
      const themeRaw = document.getElementById('aw-theme').value.trim();
      const themeVal = themeRaw.includes(',') ? themeRaw.split(',').map(s => s.trim()).filter(Boolean) : (themeRaw || '');
      const entry = { word, sourceLanguage: 'en', english, ipa: document.getElementById('aw-ipa').value.trim() || '', partOfSpeech: document.getElementById('aw-pos').value || '', level: document.getElementById('aw-level').value || '', theme: themeVal, french, german, italian, definition, exampleSentence, synonyms: awParseCSV(document.getElementById('aw-synonyms').value), antonyms: awParseCSV(document.getElementById('aw-antonyms').value), _custom: true };
      if (awEditIdx >= 0) {
        const custom = awGetCustomWords(); const old = custom[awEditIdx];
        const bi = vocabBank.findIndex(v => v.word.toLowerCase() === old.word.toLowerCase() && v._custom);
        if (bi !== -1) vocabBank[bi] = entry; custom[awEditIdx] = entry; awSaveCustomWords(custom);
        awSetFeedback('aw-form-feedback', `✓ "${word}" updated!`, 'ok'); awCancelEdit();
      } else {
        if (vocabBank.find(v => v.word.toLowerCase() === word.toLowerCase())) { awSetFeedback('aw-form-feedback', `⚠ "${word}" already exists.`, 'err'); return; }
        vocabBank.push(entry); const custom = awGetCustomWords(); custom.push(entry); awSaveCustomWords(custom);
        awSetFeedback('aw-form-feedback', `✓ "${word}" added!`, 'ok'); awClearForm();
      }
      populateAllThemeMenus();
    }

    // ---- QUOTES ----
    let awEditQuoteIdx = -1;

    function awEditQuote(idx) {
      const custom = awGetCustomQuotes(); const q = custom[idx]; if (!q) return;
      awEditQuoteIdx = idx;
      document.getElementById('aw-quote-text').value = q.quote || '';
      document.getElementById('aw-quote-author').value = q.author || '';
      document.getElementById('aw-quote-theme').value = q.theme || '';
      document.getElementById('aw-quote-explanation').value = q.explanation || '';
      document.getElementById('aw-quote-keywords').value = (q.keywords || []).join(', ');
      document.getElementById('aw-quote-submit-btn').textContent = t('saveChanges');
      document.getElementById('aw-quote-edit-banner').style.display = '';
      document.getElementById('aw-quote-edit-author').textContent = q.author || 'quote';
      document.getElementById('aw-quote-feedback').textContent = '';
      awSetTab('quote');
      document.getElementById('aw-quote-text').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function awCancelEditQuote() {
      awEditQuoteIdx = -1;
      document.getElementById('aw-quote-submit-btn').textContent = t('addQuoteBtn');
      document.getElementById('aw-quote-edit-banner').style.display = 'none';
      awClearQuote();
    }

    function awClearQuote() {
      ['aw-quote-text', 'aw-quote-author', 'aw-quote-theme', 'aw-quote-explanation', 'aw-quote-keywords']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('aw-quote-feedback').textContent = '';
    }

    function awSubmitQuote() {
      const quote = document.getElementById('aw-quote-text').value.trim();
      const author = document.getElementById('aw-quote-author').value.trim();
      if (!quote) { awSetFeedback('aw-quote-feedback', '⚠ Quote text is required.', 'err'); return; }
      if (!author) { awSetFeedback('aw-quote-feedback', '⚠ Author is required.', 'err'); return; }
      const entry = { quote, author, theme: document.getElementById('aw-quote-theme').value.trim() || '', explanation: document.getElementById('aw-quote-explanation').value.trim() || '', keywords: awParseCSV(document.getElementById('aw-quote-keywords').value), _custom: true };
      if (awEditQuoteIdx >= 0) {
        const custom = awGetCustomQuotes(); const old = custom[awEditQuoteIdx];
        const bi = quoteBank.findIndex(v => v.quote.toLowerCase() === old.quote.toLowerCase() && v._custom);
        if (bi !== -1) quoteBank[bi] = entry;
        custom[awEditQuoteIdx] = entry; awSaveCustomQuotes(custom);
        awSetFeedback('aw-quote-feedback', `✓ Quote updated!`, 'ok'); awCancelEditQuote();
      } else {
        if (quoteBank.find(q => q.quote.toLowerCase() === quote.toLowerCase())) { awSetFeedback('aw-quote-feedback', '⚠ This quote already exists.', 'err'); return; }
        quoteBank.push(entry); const custom = awGetCustomQuotes(); custom.push(entry); awSaveCustomQuotes(custom);
        awSetFeedback('aw-quote-feedback', `✓ Quote by ${author} added!`, 'ok'); awClearQuote();
      }
    }

    // ---- GAP FILL ----
    let awEditGapIdx = -1;

    function awEditGap(idx) {
      const custom = awGetCustomGaps(); const g = custom[idx]; if (!g) return;
      awEditGapIdx = idx;
      document.getElementById('aw-gap-sentence').value = g.sentence || '';
      document.getElementById('aw-gap-removed').value = g.removedWord || '';
      document.getElementById('aw-gap-infinitive').value = g.infinitive || '';
      document.getElementById('aw-gap-grammar').value = g.grammarType || '';
      document.getElementById('aw-gap-level').value = g.level || '';
      document.getElementById('aw-gap-submit-btn').textContent = t('saveChanges');
      document.getElementById('aw-gap-edit-banner').style.display = '';
      document.getElementById('aw-gap-feedback').textContent = '';
      awSetTab('gap');
      document.getElementById('aw-gap-sentence').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function awCancelEditGap() {
      awEditGapIdx = -1;
      document.getElementById('aw-gap-submit-btn').textContent = t('addGapBtn');
      document.getElementById('aw-gap-edit-banner').style.display = 'none';
      awClearGap();
    }

    function awClearGap() {
      ['aw-gap-sentence', 'aw-gap-removed', 'aw-gap-infinitive', 'aw-gap-grammar', 'aw-gap-level']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('aw-gap-feedback').textContent = '';
    }

    function awSubmitGap() {
      const sentence = document.getElementById('aw-gap-sentence').value.trim();
      const removed = document.getElementById('aw-gap-removed').value.trim();
      if (!sentence) { awSetFeedback('aw-gap-feedback', '⚠ Sentence is required.', 'err'); return; }
      if (!removed) { awSetFeedback('aw-gap-feedback', '⚠ Removed word(s) required.', 'err'); return; }
      if (!sentence.toLowerCase().includes(removed.toLowerCase())) { awSetFeedback('aw-gap-feedback', `⚠ "${removed}" not found in the sentence.`, 'err'); return; }
      const entry = { sentence, removedWord: removed, infinitive: document.getElementById('aw-gap-infinitive').value.trim() || '', grammarType: document.getElementById('aw-gap-grammar').value.trim() || '', level: document.getElementById('aw-gap-level').value || '', _custom: true };
      if (awEditGapIdx >= 0) {
        const custom = awGetCustomGaps(); const old = custom[awEditGapIdx];
        const bi = gapFillBank.findIndex(v => v.sentence.toLowerCase() === old.sentence.toLowerCase() && v._custom);
        if (bi !== -1) gapFillBank[bi] = entry;
        custom[awEditGapIdx] = entry; awSaveCustomGaps(custom);
        awSetFeedback('aw-gap-feedback', '✓ Gap fill updated!', 'ok'); awCancelEditGap();
      } else {
        if (gapFillBank.find(g => g.sentence.toLowerCase() === sentence.toLowerCase())) { awSetFeedback('aw-gap-feedback', '⚠ This sentence already exists.', 'err'); return; }
        gapFillBank.push(entry); const custom = awGetCustomGaps(); custom.push(entry); awSaveCustomGaps(custom);
        awSetFeedback('aw-gap-feedback', '✓ Gap fill sentence added!', 'ok'); awClearGap();
      }
    }

    // ---- FIND THE ERROR ----
    let awEditErrorIdx = -1;

    function awEditError(idx) {
      const custom = awGetCustomErrors(); const e = custom[idx]; if (!e) return;
      awEditErrorIdx = idx;
      document.getElementById('aw-error-correct').value = e.correct || '';
      document.getElementById('aw-error-erroneous').value = e.erroneous || '';
      document.getElementById('aw-error-explanation').value = e.explanation || '';
      document.getElementById('aw-error-submit-btn').textContent = t('saveChanges');
      document.getElementById('aw-error-edit-banner').style.display = '';
      document.getElementById('aw-error-feedback').textContent = '';
      awSetTab('error');
      document.getElementById('aw-error-correct').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function awCancelEditError() {
      awEditErrorIdx = -1;
      document.getElementById('aw-error-submit-btn').textContent = t('addErrorBtn');
      document.getElementById('aw-error-edit-banner').style.display = 'none';
      awClearError();
    }

    function awClearError() {
      ['aw-error-correct', 'aw-error-erroneous', 'aw-error-explanation']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('aw-error-feedback').textContent = '';
    }

    function awSubmitError() {
      const correct = document.getElementById('aw-error-correct').value.trim();
      const erroneous = document.getElementById('aw-error-erroneous').value.trim();
      const explanation = document.getElementById('aw-error-explanation').value.trim();
      if (!correct) { awSetFeedback('aw-error-feedback', '⚠ Correct sentence is required.', 'err'); return; }
      if (!erroneous) { awSetFeedback('aw-error-feedback', '⚠ Erroneous sentence is required.', 'err'); return; }
      if (!explanation) { awSetFeedback('aw-error-feedback', '⚠ Explanation is required.', 'err'); return; }
      const entry = { correct, erroneous, explanation, _custom: true };
      if (awEditErrorIdx >= 0) {
        const custom = awGetCustomErrors(); const old = custom[awEditErrorIdx];
        const bi = errorBank.findIndex(v => v.correct.toLowerCase() === old.correct.toLowerCase() && v._custom);
        if (bi !== -1) errorBank[bi] = entry;
        custom[awEditErrorIdx] = entry; awSaveCustomErrors(custom);
        awSetFeedback('aw-error-feedback', '✓ Error pair updated!', 'ok'); awCancelEditError();
      } else {
        if (errorBank.find(e => e.correct.toLowerCase() === correct.toLowerCase())) { awSetFeedback('aw-error-feedback', '⚠ This correct sentence already exists.', 'err'); return; }
        errorBank.push(entry); const custom = awGetCustomErrors(); custom.push(entry); awSaveCustomErrors(custom);
        awSetFeedback('aw-error-feedback', '✓ Error pair added!', 'ok'); awClearError();
      }
    }

    // ---- BULK JSON (words only) ----
    // --- Bulk import state ---
    let _awMergeQueue = [];      // [{incoming, existing}]
    let _awMergeAdded = 0;
    let _awMergeMerged = 0;
    let _awMergeReplaced = 0;
    let _awMergeSkipped = 0;
    let _awMergeInvalid = 0;
    let _awMergeFilled = 0;

    function awSubmitBulk() {
      const raw = document.getElementById('aw-bulk-json').value.trim();
      if (!raw) { awSetFeedback('aw-bulk-feedback', '⚠ Paste some JSON first.', 'err'); return; }
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) { awSetFeedback('aw-bulk-feedback', '⚠ Invalid JSON: ' + e.message, 'err'); return; }
      if (!Array.isArray(parsed)) { awSetFeedback('aw-bulk-feedback', '⚠ JSON must be an array [ ... ]', 'err'); return; }

      _awMergeQueue = []; _awMergeAdded = 0; _awMergeMerged = 0; _awMergeReplaced = 0; _awMergeSkipped = 0; _awMergeInvalid = 0; _awMergeFilled = 0;
      const custom = awGetCustomWords();

      const vbSize = typeof vocabBank !== 'undefined' ? vocabBank.length : -1;
      console.log('[Import] vocabBank size:', vbSize, '| parsed:', parsed.length, 'words');

      parsed.forEach(rawObj => {
        if (!rawObj.word || typeof rawObj.word !== 'string' || !rawObj.word.trim()) { _awMergeInvalid++; return; }
        // Fill missing fields with empty defaults — only "word" is required
        let obj = Object.assign({
          french: '', definition: '', ipa: '', partOfSpeech: '',
          level: '', theme: '', exampleSentence: '', synonyms: [], antonyms: []
        }, rawObj, { word: rawObj.word.trim() });
        const existing = vocabBank.find(v => v.word.toLowerCase() === obj.word.toLowerCase());
        console.log('[Import]', obj.word, '->', existing ? 'DUPLICATE' : 'new');
        if (existing) {
          _awMergeQueue.push({ incoming: obj, existing });
        } else {
          const entry = { ...obj, _custom: true }; vocabBank.push(entry); custom.push(entry); _awMergeAdded++;
        }
      });

      awSaveCustomWords(custom); populateAllThemeMenus();

      console.log('[Import] queue length:', _awMergeQueue.length, '| added:', _awMergeAdded);

      // Show diagnostic in UI so we can see what happened without DevTools
      const diagMsg = 'DB size: ' + vbSize + ' | parsed: ' + parsed.length + ' | duplicates found: ' + _awMergeQueue.length + ' | new: ' + _awMergeAdded;
      awSetFeedback('aw-bulk-feedback', '🔍 ' + diagMsg, _awMergeQueue.length > 0 ? 'ok' : 'err');

      if (_awMergeQueue.length > 0) {
        awMergeShowNext();
      } else {
        awBulkFinishFeedback();
        if (_awMergeAdded > 0) document.getElementById('aw-bulk-json').value = '';
      }
    }

    function awMergeShowNext() {
      if (_awMergeQueue.length === 0) { awMergeClose(); awBulkFinishFeedback(); return; }
      const { incoming, existing } = _awMergeQueue[0];
      const total = _awMergeQueue.length;
      const overlayEl = document.getElementById('aw-merge-overlay');
      console.log('[Merge] showing conflict for:', incoming.word, '| overlay found:', !!overlayEl, '| current display:', overlayEl ? overlayEl.style.display : 'N/A');
      document.getElementById('aw-merge-subtitle').textContent =
        `${total} conflict${total !== 1 ? 's' : ''} remaining — choose what to do with each duplicate.`;

      const inThemes = getItemThemes(incoming);
      const exThemes = getItemThemes(existing);
      const merged = [...new Set([...exThemes, ...inThemes])];

      // New syn/ant entries that incoming adds on top of existing
      const exSyn = existing.synonyms || [];
      const inSyn = incoming.synonyms || [];
      const newSyn = inSyn.filter(s => !exSyn.map(x => x.toLowerCase()).includes(s.toLowerCase()));

      const exAnt = existing.antonyms || [];
      const inAnt = incoming.antonyms || [];
      const newAnt = inAnt.filter(a => !exAnt.map(x => x.toLowerCase()).includes(a.toLowerCase()));

      // Determine which scalar fields would be filled by fill-empty
      const fillableScalar = ['ipa', 'partOfSpeech', 'level', 'french', 'exampleSentence', 'definition'].filter(
        k => !existing[k] && incoming[k]
      );
      const hasFillable = fillableScalar.length > 0 || newSyn.length > 0 || newAnt.length > 0;

      // Show/hide Fill Empty button based on whether there's anything to fill
      const fillBtn = document.getElementById('aw-merge-fill-btn');
      if (fillBtn) fillBtn.style.display = hasFillable ? '' : 'none';

      const row = (label, exVal, inVal, fieldKey) => {
        const diff = exVal !== inVal;
        const willFill = fieldKey && !existing[fieldKey] && incoming[fieldKey];
        const inStyle = willFill
          ? 'color:#1a7a1a;font-weight:700;'
          : (diff && exVal ? 'color:#c85a00;font-weight:700;' : '');
        return `<tr style="border-top:1px solid #eee;${willFill ? 'background:#f0faf0;' : ''}">
          <td style="padding:7px 12px;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#888;white-space:nowrap;">${label}</td>
          <td style="padding:7px 12px;font-size:0.88rem;color:#111;">${exVal || '<em style="color:#bbb">—</em>'}</td>
          <td style="padding:7px 12px;font-size:0.88rem;${inStyle}">${inVal || '<em style="color:#bbb">—</em>'}${willFill ? ' <span style="font-size:0.7rem;background:#1a7a1a;color:#fff;border-radius:3px;padding:1px 5px;vertical-align:middle;">will fill</span>' : ''}</td>
        </tr>`;
      };

      // Array row: shows existing items, and highlights new items from incoming in green
      const arrayRow = (label, exArr, inArr, newItems) => {
        const hasNew = newItems.length > 0;
        const exDisplay = exArr.length ? exArr.join(', ') : '<em style="color:#bbb">—</em>';
        const inParts = inArr.map(s => {
          const isNew = newItems.map(x => x.toLowerCase()).includes(s.toLowerCase());
          return isNew
            ? `<span style="color:#1a7a1a;font-weight:700;">${s} <span style="font-size:0.65rem;background:#1a7a1a;color:#fff;border-radius:3px;padding:1px 4px;">+new</span></span>`
            : `<span style="color:#999;">${s}</span>`;
        });
        const inDisplay = inArr.length ? inParts.join(', ') : '<em style="color:#bbb">—</em>';
        return `<tr style="border-top:1px solid #eee;${hasNew ? 'background:#f0faf0;' : ''}">
          <td style="padding:7px 12px;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#888;white-space:nowrap;">${label}</td>
          <td style="padding:7px 12px;font-size:0.88rem;color:#111;">${exDisplay}</td>
          <td style="padding:7px 12px;font-size:0.88rem;">${inDisplay}</td>
        </tr>`;
      };

      // Build fill summary
      const fillParts = [...fillableScalar];
      if (newSyn.length) fillParts.push(`synonyms (+${newSyn.length})`);
      if (newAnt.length) fillParts.push(`antonyms (+${newAnt.length})`);

      document.getElementById('aw-merge-card').innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#111;color:#fff;">
              <th style="padding:8px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;width:110px;">Field</th>
              <th style="padding:8px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;">Existing</th>
              <th style="padding:8px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;">Incoming</th>
            </tr>
          </thead>
          <tbody>
            ${row('Word', existing.word, incoming.word, null)}
            ${row('French', existing.french, incoming.french, 'french')}
            ${row('IPA', existing.ipa, incoming.ipa, 'ipa')}
            ${row('Level', existing.level, incoming.level, 'level')}
            ${row('Part of Speech', existing.partOfSpeech, incoming.partOfSpeech, 'partOfSpeech')}
            ${row('Themes', exThemes.join(', ') || '—', inThemes.join(', ') || '—', null)}
            <tr style="border-top:1px solid #eee;background:#f9f9f9;">
              <td style="padding:7px 12px;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#888;">Merge →</td>
              <td colspan="2" style="padding:7px 12px;font-size:0.88rem;color:#111;font-weight:700;">${merged.join(', ') || '—'}</td>
            </tr>
            ${arrayRow('Synonyms', exSyn, inSyn, newSyn)}
            ${arrayRow('Antonyms', exAnt, inAnt, newAnt)}
            ${row('Definition', (existing.definition || '').substring(0, 80) + ((existing.definition || '').length > 80 ? '…' : ''), (incoming.definition || '').substring(0, 80) + ((incoming.definition || '').length > 80 ? '…' : ''), 'definition')}
            ${row('Example', (existing.exampleSentence || '').substring(0, 80) + ((existing.exampleSentence || '').length > 80 ? '…' : ''), (incoming.exampleSentence || '').substring(0, 80) + ((incoming.exampleSentence || '').length > 80 ? '…' : ''), 'exampleSentence')}
          </tbody>
        </table>${hasFillable ? `<div style="padding:8px 14px;background:#f0faf0;border-top:1px solid #c3e6c3;font-size:0.78rem;color:#1a7a1a;font-weight:700;">🪄 "Fill Empty Fields" will add: ${fillParts.join(', ')}</div>` : ''}`;

      document.getElementById('aw-merge-overlay').style.display = 'flex';
    }

    function awMergeDecide(action) {
      if (!_awMergeQueue.length) return;
      const { incoming, existing } = _awMergeQueue.shift();
      _awApplyMergeAction(action, incoming, existing);
      awMergeShowNext();
    }

    function awMergeApplyAll(action) {
      while (_awMergeQueue.length) {
        const { incoming, existing } = _awMergeQueue.shift();
        _awApplyMergeAction(action, incoming, existing);
      }
      awMergeClose(); awBulkFinishFeedback();
    }

    function _awApplyMergeAction(action, incoming, existing) {
      if (action === 'skip') { _awMergeSkipped++; return; }

      const custom = awGetCustomWords();
      if (action === 'fill-empty') {
        // Copy scalar fields only if empty on existing
        const scalarFields = ['ipa', 'partOfSpeech', 'level', 'french', 'exampleSentence', 'definition'];
        let filled = false;
        scalarFields.forEach(k => { if (!existing[k] && incoming[k]) { existing[k] = incoming[k]; filled = true; } });
        // Always union-merge synonyms/antonyms — add any new entries from incoming
        if (incoming.synonyms && incoming.synonyms.length) {
          const before = (existing.synonyms || []).length;
          existing.synonyms = [...new Set([...(existing.synonyms || []), ...incoming.synonyms])];
          if (existing.synonyms.length > before) filled = true;
        }
        if (incoming.antonyms && incoming.antonyms.length) {
          const before = (existing.antonyms || []).length;
          existing.antonyms = [...new Set([...(existing.antonyms || []), ...incoming.antonyms])];
          if (existing.antonyms.length > before) filled = true;
        }
        if (filled) {
          existing._custom = true;
          const ci = custom.findIndex(w => w.word.toLowerCase() === existing.word.toLowerCase());
          if (ci !== -1) { custom[ci] = existing; } else { custom.push(existing); }
          awSaveCustomWords(custom);
          _awMergeFilled++;
        } else {
          _awMergeSkipped++;
        }
      } else if (action === 'merge') {
        const exThemes = getItemThemes(existing);
        const inThemes = getItemThemes(incoming);
        const merged = [...new Set([...exThemes, ...inThemes])];
        existing.theme = merged.length === 1 ? merged[0] : merged;
        // Also merge synonyms/antonyms arrays if present
        if (incoming.synonyms) existing.synonyms = [...new Set([...(existing.synonyms || []), ...incoming.synonyms])];
        if (incoming.antonyms) existing.antonyms = [...new Set([...(existing.antonyms || []), ...incoming.antonyms])];
        // Fill in missing fields from incoming
        ['ipa', 'partOfSpeech', 'level', 'exampleSentence'].forEach(k => { if (!existing[k] && incoming[k]) existing[k] = incoming[k]; });
        existing._custom = true;
        // Upsert into custom storage (covers both original DB words and already-custom words)
        const ci = custom.findIndex(w => w.word.toLowerCase() === existing.word.toLowerCase());
        if (ci !== -1) { custom[ci] = existing; } else { custom.push(existing); }
        awSaveCustomWords(custom);
        _awMergeMerged++;
      } else if (action === 'replace') {
        const entry = { ...incoming, _custom: true };
        const bi = vocabBank.findIndex(v => v.word.toLowerCase() === incoming.word.toLowerCase());
        if (bi !== -1) vocabBank[bi] = entry; else vocabBank.push(entry);
        const ci = custom.findIndex(w => w.word.toLowerCase() === incoming.word.toLowerCase());
        if (ci !== -1) { custom[ci] = entry; } else { custom.push(entry); }
        awSaveCustomWords(custom);
        _awMergeReplaced++;
      }
      populateAllThemeMenus();
    }

    function awMergeClose() {
      document.getElementById('aw-merge-overlay').style.display = 'none';
    }

    function awBulkFinishFeedback() {
      const parts = [];
      if (_awMergeAdded) parts.push(`${_awMergeAdded} added`);
      if (_awMergeMerged) parts.push(`${_awMergeMerged} merged`);
      if (_awMergeFilled) parts.push(`${_awMergeFilled} filled`);
      if (_awMergeReplaced) parts.push(`${_awMergeReplaced} replaced`);
      if (_awMergeSkipped) parts.push(`${_awMergeSkipped} skipped`);
      if (_awMergeInvalid) parts.push(`${_awMergeInvalid} invalid`);
      const total = _awMergeAdded + _awMergeMerged + _awMergeFilled + _awMergeReplaced;
      awSetFeedback('aw-bulk-feedback', `✓ ${parts.join(', ') || 'nothing to import'}`, total > 0 ? 'ok' : 'err');
      if (total > 0) document.getElementById('aw-bulk-json').value = '';
    }

    // ---- MANAGE ----
    function awRenderManage() {
      const total = awGetCustomWords().length + awGetCustomQuotes().length + awGetCustomGaps().length + awGetCustomErrors().length;
      document.getElementById('aw-manage-count').textContent = `${total} ${total !== 1 ? t("customItemsPlural") : t("customItems")} ${t("inBrowser")}`;
    }

    function awRenderManageWords() {
      const custom = awGetCustomWords(); const tbody = document.getElementById('aw-manage-body'); const empty = document.getElementById('aw-manage-empty');
      empty.style.display = custom.length ? 'none' : 'block';
      tbody.innerHTML = custom.map((w, i) => `<tr>
        <td><strong>${w.word}</strong></td><td>${w.french || ''}</td><td>${w.partOfSpeech || ''}</td><td>${w.level || ''}</td><td>${getItemThemes(w).join(', ') || ''}</td>
        <td style="max-width:220px;color:#555;">${(_d => _d.substring(0, 70) + (_d.length > 70 ? '…' : ''))(_firstVal(w.definition))}</td>
        <td style="display:flex;gap:6px;"><button class="aw-edit-btn" onclick="awEditWord(${i})">✏️</button><button class="aw-delete-btn" onclick="awDeleteWord(${i})">✕</button></td>
      </tr>`).join('');
    }
    function awRenderManageQuotes() {
      const custom = awGetCustomQuotes(); const tbody = document.getElementById('aw-manage-quotes-body'); const empty = document.getElementById('aw-manage-quotes-empty');
      empty.style.display = custom.length ? 'none' : 'block';
      tbody.innerHTML = custom.map((q, i) => `<tr>
        <td style="max-width:260px;font-style:italic;">"${q.quote.substring(0, 80)}${q.quote.length > 80 ? '…' : ''}"</td>
        <td>${q.author || ''}</td><td>${q.theme || ''}</td>
        <td style="display:flex;gap:6px;"><button class="aw-edit-btn" onclick="awEditQuote(${i})">✏️</button><button class="aw-delete-btn" onclick="awDeleteQuote(${i})">✕</button></td>
      </tr>`).join('');
    }
    function awRenderManageGaps() {
      const custom = awGetCustomGaps(); const tbody = document.getElementById('aw-manage-gaps-body'); const empty = document.getElementById('aw-manage-gaps-empty');
      empty.style.display = custom.length ? 'none' : 'block';
      tbody.innerHTML = custom.map((g, i) => `<tr>
        <td style="max-width:220px;">${g.sentence.substring(0, 80)}${g.sentence.length > 80 ? '…' : ''}</td>
        <td><strong>${g.removedWord || ''}</strong></td><td>${g.grammarType || ''}</td><td>${g.level || ''}</td>
        <td style="display:flex;gap:6px;"><button class="aw-edit-btn" onclick="awEditGap(${i})">✏️</button><button class="aw-delete-btn" onclick="awDeleteGap(${i})">✕</button></td>
      </tr>`).join('');
    }
    function awRenderManageErrors() {
      const custom = awGetCustomErrors(); const tbody = document.getElementById('aw-manage-errors-body'); const empty = document.getElementById('aw-manage-errors-empty');
      empty.style.display = custom.length ? 'none' : 'block';
      tbody.innerHTML = custom.map((e, i) => `<tr>
        <td style="max-width:180px;color:#1a7a3a;">${e.correct.substring(0, 60)}${e.correct.length > 60 ? '…' : ''}</td>
        <td style="max-width:180px;color:#b91c1c;">${e.erroneous.substring(0, 60)}${e.erroneous.length > 60 ? '…' : ''}</td>
        <td style="max-width:200px;color:#555;">${(e.explanation || '').substring(0, 60)}${(e.explanation || '').length > 60 ? '…' : ''}</td>
        <td style="display:flex;gap:6px;"><button class="aw-edit-btn" onclick="awEditError(${i})">✏️</button><button class="aw-delete-btn" onclick="awDeleteError(${i})">✕</button></td>
      </tr>`).join('');
    }

    async function awDeleteWord(idx) {
      const custom = awGetCustomWords(); const word = custom[idx]; if (!word) return;
      if (!await showConfirm(`Remove "${word.word}"?`)) return;
      const bi = vocabBank.findIndex(w => w.word.toLowerCase() === word.word.toLowerCase() && w._custom); if (bi !== -1) vocabBank.splice(bi, 1);
      custom.splice(idx, 1); awSaveCustomWords(custom); populateAllThemeMenus(); awRenderManageWords(); awRenderManage();
    }
    async function awDeleteQuote(idx) {
      const custom = awGetCustomQuotes(); const q = custom[idx]; if (!q) return;
      if (!await showConfirm(`Remove this quote by ${q.author}?`)) return;
      const bi = quoteBank.findIndex(v => v.quote.toLowerCase() === q.quote.toLowerCase() && v._custom); if (bi !== -1) quoteBank.splice(bi, 1);
      custom.splice(idx, 1); awSaveCustomQuotes(custom); awRenderManageQuotes(); awRenderManage();
    }
    async function awDeleteGap(idx) {
      const custom = awGetCustomGaps(); const g = custom[idx]; if (!g) return;
      if (!await showConfirm('Remove this gap fill sentence?')) return;
      const bi = gapFillBank.findIndex(v => v.sentence.toLowerCase() === g.sentence.toLowerCase() && v._custom); if (bi !== -1) gapFillBank.splice(bi, 1);
      custom.splice(idx, 1); awSaveCustomGaps(custom); awRenderManageGaps(); awRenderManage();
    }
    async function awDeleteError(idx) {
      const custom = awGetCustomErrors(); const e = custom[idx]; if (!e) return;
      if (!await showConfirm('Remove this error pair?')) return;
      const bi = errorBank.findIndex(v => v.correct.toLowerCase() === e.correct.toLowerCase() && v._custom); if (bi !== -1) errorBank.splice(bi, 1);
      custom.splice(idx, 1); awSaveCustomErrors(custom); awRenderManageErrors(); awRenderManage();
    }

    async function awDeleteAll() {
      const total = awGetCustomWords().length + awGetCustomQuotes().length + awGetCustomGaps().length + awGetCustomErrors().length;
      if (!total) return;
      if (!await showConfirm(`Delete all ${total} custom items? This cannot be undone.`)) return;
      awGetCustomWords().forEach(w => { const bi = vocabBank.findIndex(v => v.word.toLowerCase() === w.word.toLowerCase() && v._custom); if (bi !== -1) vocabBank.splice(bi, 1); });
      awGetCustomQuotes().forEach(q => { const bi = quoteBank.findIndex(v => v.quote.toLowerCase() === q.quote.toLowerCase() && v._custom); if (bi !== -1) quoteBank.splice(bi, 1); });
      awGetCustomGaps().forEach(g => { const bi = gapFillBank.findIndex(v => v.sentence.toLowerCase() === g.sentence.toLowerCase() && v._custom); if (bi !== -1) gapFillBank.splice(bi, 1); });
      awGetCustomErrors().forEach(e => { const bi = errorBank.findIndex(v => v.correct.toLowerCase() === e.correct.toLowerCase() && v._custom); if (bi !== -1) errorBank.splice(bi, 1); });
      [AW_STORAGE_KEY, AW_QUOTES_KEY, AW_GAP_KEY, AW_ERROR_KEY].forEach(k => localStorage.removeItem(k));
      populateAllThemeMenus(); awRenderManage(); awSetManageTab('words');
    }

    function awBuildDatabaseFiles() {
      const strip = ({ _custom, ...rest }) => rest;
      const wordLines = vocabBank.map(strip).map(w => {
        const themes = getItemThemes(w);
        const themeVal = themes.length > 1 ? themes : (themes[0] || '');
        return `  { word: ${JSON.stringify(w.word)}, ipa: ${JSON.stringify(w.ipa || '')}, partOfSpeech: ${JSON.stringify(w.partOfSpeech || '')}, level: ${JSON.stringify(w.level || '')}, theme: ${JSON.stringify(themeVal)}, definition: ${JSON.stringify(w.definition || '')}, french: ${JSON.stringify(w.french || '')}, exampleSentence: ${JSON.stringify(w.exampleSentence || '')}, synonyms: ${JSON.stringify(w.synonyms || [])}, antonyms: ${JSON.stringify(w.antonyms || [])}, otherForms: ${JSON.stringify(w.otherForms || [])} }`;
      });
      const quoteLines = quoteBank.map(strip).map(q => `  ${JSON.stringify(q)}`);
      const gapLines = gapFillBank.map(strip).map(g => `  ${JSON.stringify(g)}`);
      const errorLines = errorBank.map(strip).map(e => `  ${JSON.stringify(e)}`);

      return {
        wordDb: `// wordDb.js\nconst vocabBank = [\n${wordLines.join(',\n')}\n];\n`,
        quoteBank: `const quoteBank = [\n${quoteLines.join(',\n')}\n];\n`,
        gapFillBank: `const gapFillBank = [\n${gapLines.join(',\n')}\n];\n`,
        errorBank: `const errorBank = [\n${errorLines.join(',\n')}\n];\n`
      };
    }

    async function awDownloadDB() {
      const files = awBuildDatabaseFiles();

      if (window.Desktop && Desktop.isElectron()) {
        await Desktop.saveFiles('data', [
          { filename: 'wordDb.js', content: files.wordDb },
          { filename: 'quoteBank.js', content: files.quoteBank },
          { filename: 'gapFillBank.js', content: files.gapFillBank },
          { filename: 'errorBank.js', content: files.errorBank }
        ]);
        showToast('Database files saved to the data folder.');
        return;
      }

      const combinedContent = `// wordDb.js\n${files.wordDb}\n${files.quoteBank}\n${files.gapFillBank}\n${files.errorBank}`;
      downloadFile('wordDb.js', combinedContent, 'application/javascript');
    }

    // ================================================================
    // END ADD WORDS TO DATABASE
    // ================================================================

    async function pickCustomDbFile() {
      return new Promise(async (resolve) => {
        let existingFiles = [];
        if (window.Desktop && Desktop.isElectron()) {
          try {
            if (typeof Desktop.listByPath === 'function') {
              const r = await Desktop.listByPath('customWordbanks', '', { extensions: ['.js'], recursive: true });
              if (r && r.ok && Array.isArray(r.files)) {
                existingFiles = r.files
                  .map(f => String((f && (f.relativePath || f.filename)) || '').replace(/\\/g, '/'))
                  .filter(Boolean)
                  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
              }
            } else if (typeof Desktop.listFiles === 'function') {
              const r = await Desktop.listFiles('customWordbanks', { extensions: ['.js'] });
              if (r && r.ok && Array.isArray(r.files)) {
                existingFiles = r.files
                  .map(f => String((f && f.filename) || '').replace(/\\/g, '/'))
                  .filter(Boolean)
                  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
              }
            }
          } catch { }
        }

        const overlay = document.getElementById('custom-db-picker-overlay');
        const listEl = document.getElementById('custom-db-picker-list');
        const newRow = document.getElementById('custom-db-picker-new-row');
        const newInput = document.getElementById('custom-db-picker-new-name');
        const newErr = document.getElementById('custom-db-picker-new-err');
        const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        listEl.innerHTML = existingFiles.map(fn =>
          `<label class="cdbp-file-item"><input type="radio" name="cdbp-file" value="${esc(fn)}"><span>📄 ${esc(fn)}</span></label>`
        ).join('') +
          `<label class="cdbp-file-item cdbp-new-item"><input type="radio" name="cdbp-file" value="__new__"><span>✨ New file…</span></label>`;

        newInput.value = '';
        newErr.textContent = '';
        newRow.style.display = 'none';

        const radios = listEl.querySelectorAll('input[type="radio"]');
        if (existingFiles.length === 0) {
          radios[radios.length - 1].checked = true;
          newRow.style.display = 'block';
        } else {
          radios[0].checked = true;
        }

        listEl.addEventListener('change', function onchange(e) {
          if (e.target.name === 'cdbp-file') {
            newRow.style.display = e.target.value === '__new__' ? 'block' : 'none';
            newErr.textContent = '';
          }
        });

        function cleanup() {
          overlay.classList.remove('active');
          overlay.onclick = null;
          document.getElementById('custom-db-picker-confirm').onclick = null;
          document.getElementById('custom-db-picker-cancel').onclick = null;
          document.getElementById('custom-db-picker-close-btn').onclick = null;
        }

        function doCancel() { cleanup(); resolve(null); }

        function doConfirm() {
          const sel = listEl.querySelector('input[name="cdbp-file"]:checked');
          if (!sel) { doCancel(); return; }
          if (sel.value === '__new__') {
            let name = newInput.value.trim();
            if (!name) { newErr.textContent = '⚠ Please enter a file name.'; newInput.focus(); return; }
            if (!/^[\w\- .]+$/.test(name)) { newErr.textContent = '⚠ Only letters, numbers, spaces, hyphens, dots allowed.'; newInput.focus(); return; }
            if (!name.endsWith('.js')) name += '.js';
            cleanup(); resolve(name);
          } else {
            cleanup(); resolve(sel.value);
          }
        }

        document.getElementById('custom-db-picker-confirm').onclick = doConfirm;
        document.getElementById('custom-db-picker-cancel').onclick = doCancel;
        document.getElementById('custom-db-picker-close-btn').onclick = doCancel;
        overlay.onclick = e => { if (e.target === overlay) doCancel(); };

        newInput.addEventListener('keydown', function onkey(e) {
          if (e.key === 'Enter') { e.preventDefault(); doConfirm(); }
        });

        overlay.classList.add('active');
      });
    }

    // ================================================================
    // i18n — backed by shared js/i18n.js
    let currentLang = (function () { try { return (window.getLang && window.getLang()) || (window.i18n && i18n.getLang()) || localStorage.getItem('cmt-lang-learning-tools') || JSON.parse(localStorage.getItem('cmt-general-config') || '{}').language || 'en'; } catch (e) { return 'en'; } })();

    function getTranslation(w, lang) {
      const l = lang || currentLang;
      if (l === 'en') return w.english || w.word || '';
      return w[l] || w.french || w.translation || '';
    }

    const I18N = (typeof window.I18N !== 'undefined') ? window.I18N : ((typeof i18n !== 'undefined' && i18n.STRINGS) ? i18n.STRINGS : {});

    function t(k) {
      if (typeof window.t === 'function' && window.t !== t) {
        return window.t(k);
      }
      if (typeof i18n !== 'undefined' && typeof i18n.t === 'function') {
        return i18n.t(k);
      }
      return k;
    }

    // --- Font size control ---
    const FS_DEFAULT = 16;
    const FS_MIN = 10;
    const FS_MAX = 26;
    let currentFontSize = (() => { try { return parseInt(localStorage.getItem('app_font_size')) || FS_DEFAULT; } catch (e) { return FS_DEFAULT; } })();
    function applyFontSize(size) {
      currentFontSize = Math.min(FS_MAX, Math.max(FS_MIN, size));
      document.documentElement.style.fontSize = currentFontSize + 'px';
      try { localStorage.setItem('app_font_size', currentFontSize); } catch (e) { }
    }
    function adjustFontSize(delta) {
      if (delta === 0) applyFontSize(FS_DEFAULT);
      else applyFontSize(currentFontSize + delta);
    }
    // Apply on load
    applyFontSize(currentFontSize);

    function setLang(lang) {
      if (lang === null || lang === 'auto') {
        try { localStorage.removeItem('cmt-lang-learning-tools'); } catch (e) { }
        try { const cfg = JSON.parse(localStorage.getItem('cmt-general-config') || '{}'); currentLang = cfg.language || 'en'; } catch (e) { currentLang = 'en'; }
      } else {
        currentLang = lang;
        try { localStorage.setItem('cmt-lang-learning-tools', lang); } catch (e) { }
      }
      _updateLTLangBtns();
      applyLang();
    }

    function _updateLTLangBtns() {
      const override = localStorage.getItem('cmt-lang-learning-tools');
      document.querySelectorAll('.lang-btn').forEach(b => {
        const dl = b.getAttribute('data-lang');
        b.classList.toggle('active', dl === 'auto' ? !override : dl === currentLang && !!override);
      });
      document.querySelectorAll('.hm-lang-btn').forEach(b => {
        const dl = b.getAttribute('data-lang');
        b.classList.toggle('active', dl === 'auto' ? !override : dl === override);
      });
    }

    function applyLang() {
      // Site title
      const st = document.getElementById('site-title');
      if (st) st.textContent = t('ltSiteTitle');

      // All data-i18n elements
      document.querySelectorAll('[data-i18n]').forEach(el => {
        if (el.id === 'failure-msg') return;
        const k = el.getAttribute('data-i18n');
        const v = t(k);
        var iconPath = el.getAttribute('data-icon');
        var img = el.querySelector('img');
        var existingClass = img ? img.className : (el.getAttribute('data-icon-class') || 'btn-icon');
        // Use innerHTML for keys that contain HTML tags
        const htmlKeys = ['whichCorrect', 'helpTipFilters1', 'helpTipFilters2', 'helpTipFilters3', 'helpCardHangmanDesc', 'helpCardScrambleDesc', 'helpCardFindErrorDesc', 'helpTipTeam1', 'helpTipTeam2', 'helpTipTimer'];
        if (img || iconPath) {
          if (!iconPath && img) {
            iconPath = img.getAttribute('src');
            if (iconPath) el.setAttribute('data-icon', iconPath);
          }
          if (!img && iconPath) {
            img = document.createElement('img');
            img.src = iconPath;
            img.className = existingClass;
            img.alt = '';
          }
          const cleanText = String(v || '').replace(/^(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|[\p{Extended_Pictographic}\u200d\ufe0f])+\s*/u, '').trim();
          el.innerHTML = '';
          if (img) el.appendChild(img);
          el.appendChild(document.createTextNode(' ' + cleanText));
        } else if (htmlKeys.includes(k)) { el.innerHTML = v; }
        else { el.textContent = v; }
      });
      if (typeof populateAllThemeMenus === 'function' && typeof vocabBank !== 'undefined' && vocabBank.length > 0) {
        populateAllThemeMenus();
      }
      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.getAttribute('data-i18n-title'));
      });

      const failureOverlay = document.getElementById('failure-overlay');
      const failureIsOpen = !!(failureOverlay && failureOverlay.classList.contains('active'));
      if (!failureIsOpen) {
        renderFailureMessage(t('betterLuck'));
      } else if (failureRawMessage) {
        renderFailureMessage(failureRawMessage);
      }

      refreshClassGroupSelectorOptions();
      updateGroupSelectorTitle();
      if (activeSection === 'words-seen-today-section') renderWordsSeenToday();

      const histToggleBtn = document.getElementById('words-seen-history-toggle-btn');
      if (histToggleBtn) {
        const histPanelOpen = document.getElementById('words-seen-history-panel')?.classList.contains('visible');
        histToggleBtn.textContent = histPanelOpen ? t('wordsSeenHistoryHide') : t('wordsSeenHistoryShow');
        if (histPanelOpen) renderWordsSeenHistory();
      }

      // Quote boxes (data-i18n-prefix: value stored dynamically)
      const qtb = document.getElementById('quote-theme-box');
      if (qtb) { const txt = qtb.textContent; if (!txt.includes(':') || txt.endsWith('????')) qtb.textContent = t('themeLabel') + ' ????'; }
      const qkb = document.getElementById('quote-keywords-box');
      if (qkb) { const txt = qkb.textContent; if (!txt.includes(':') || txt.endsWith('????')) qkb.textContent = t('keywordsLabel') + ' ????'; }

      // Picker "All" button labels — rebuild dropdowns
      document.querySelectorAll('.level-picker-wrap').forEach(w => {
        const sel = themePickerGetSelected(w);
        buildThemePickerDropdown(w, LEVEL_OPTIONS.map(o => o.value), sel, LEVEL_OPTIONS, t('allLevels'));
        themePickerSetSelected(w, sel);
      });
      document.querySelectorAll('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)').forEach(w => {
        const sel = themePickerGetSelected(w);
        const themes = [...new Set(vocabBank.flatMap(item => getItemThemes(item)))].sort((a, b) => a.localeCompare(b));
        buildThemePickerDropdown(w, themes, sel, null, t('allThemes'));
        themePickerSetSelected(w, sel);
      });
      document.querySelectorAll('.pos-picker-wrap').forEach(w => {
        const sel = themePickerGetSelected(w);
        const types = [...new Set(vocabBank.flatMap(item => item.partOfSpeech ? (Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [item.partOfSpeech]) : []).filter(Boolean))].sort();
        buildThemePickerDropdown(w, types, sel, null, t('allTypes'));
        themePickerSetSelected(w, sel);
      });
      document.querySelectorAll('.letter-picker-wrap').forEach(w => {
        const sel = themePickerGetSelected(w);
        const letters = [...new Set(vocabBank.map(item => item.word ? item.word[0].toUpperCase() : '').filter(Boolean))].sort();
        buildThemePickerDropdown(w, letters, sel, null, 'All Letters');
        themePickerSetSelected(w, sel);
      });
      document.querySelectorAll('.length-picker-wrap').forEach(w => {
        const sel = themePickerGetSelected(w);
        const lengths = [...new Set(vocabBank.map(item => item.word ? String(item.word.length) : '').filter(Boolean))].sort((a, b) => Number(a) - Number(b));
        const labelMap = lengths.map(l => ({ value: l, label: l + (l === '1' ? ' letter' : ' letters') }));
        buildThemePickerDropdown(w, lengths, sel, labelMap, 'All Lengths');
        themePickerSetSelected(w, sel);
      });
    }

    // ── Tutorial ──────────────────────────────────────────────────────────────
    function startLtTutorial() {
      Tutorial.start([
        { selector: '.filter-bar', title: t('tutLt1Title'), text: t('tutLt1Text') },
        { selector: '#team-setup', title: t('tutLt2Title'), text: t('tutLt2Text') },
        { selector: '.menu-grid', title: t('tutLt3Title'), text: t('tutLt3Text') },
        { selector: 'button.help-btn', title: t('tutLt4Title'), text: t('tutLt4Text') }
      ], { next: t('tutNext'), prev: t('tutPrev'), skip: t('tutSkip'), done: t('tutDone') });
    }

    // Initialise language on page load
    document.addEventListener('DOMContentLoaded', async () => {
      initHamburger();
      if (wwIsProjectionWindow()) {
        wwBootProjectionReceiverIfNeeded();
        ltBootProjectionReceiverIfNeeded();
        return;
      }

      await Promise.resolve(window.__ltUserBootstrapPromise).catch(function () { });
      window._cmtApplyNavBrand();
      await ensureWordDbLoaded();
      await ensureCoreBanksLoaded();
      // Load class groups from user data folder (not bundled in packaged app).
      if (window.Desktop && typeof Desktop.readJson === 'function') {
        try {
          const gr = await Desktop.readText('user', 'class-groups.js');
          if (gr?.ok && gr.content) {
            const fn = new Function(gr.content + '; return typeof CLASS_GROUPS_DATA !== "undefined" ? CLASS_GROUPS_DATA : {};');
            const parsed = fn();
            if (parsed.classGroupsMeta) window.CLASS_GROUPS_META = parsed.classGroupsMeta;
          }
        } catch (e) { /* ignore */ }
        try {
          const sr = await Desktop.readText('user', 'students.js');
          if (sr?.ok && sr.content) {
            const sfn = new Function(sr.content + '; return typeof STUDENTS_ROSTER !== "undefined" ? STUDENTS_ROSTER : [];');
            window.STUDENTS_ROSTER = sfn();
          }
        } catch (e) { /* ignore */ }
      }
      awLoadCustomWords();
      awPopulateSourceSelect('gap-source-select', 'gaps');
      awPopulateSourceSelect('story-source-select', 'stories');
      populateAllThemeMenus();
      updateAllFilterCounts();
      installPresentationButtons();
      initClassGroupSelector();
      _updateLTLangBtns();

      // Defer heavy custom-data merge until after initial UI setup.
      setTimeout(() => {
        scheduleCustomDatabasesInit();
      }, 0);

      // Small delay to let vocabBank and pickers initialise first
      setTimeout(() => {
        applyLang();
        scheduleWordsSeenAutosave(loadWordsSeenTodayStore());

        // Deep-link routing from Board or external calls
        const urlParams = new URLSearchParams(window.location.search);
        let targetSec = urlParams.get('section');
        const isMultiplayer = urlParams.get('multiplayer') === '1';
        if (isMultiplayer && !targetSec) targetSec = 'quiz-section';

        if (targetSec && document.getElementById(targetSec)) {
          navTo(targetSec);
          const pTheme = urlParams.get('theme') || urlParams.get('quizTheme');
          let pLevel = urlParams.get('level') || urlParams.get('quizLevel');
          const pClassId = urlParams.get('classId');
          if (!pLevel && pClassId && typeof LinksService !== 'undefined' && typeof LinksService.resolveClassLevel === 'function') {
            pLevel = LinksService.resolveClassLevel(pClassId) || '';
          }
          const pWords = urlParams.get('words');
          const secEl = document.getElementById(targetSec);
          if (secEl) {
            if (pLevel) {
              const lWrap = secEl.querySelector('.level-picker-wrap');
              if (lWrap && typeof themePickerSetSelected === 'function') themePickerSetSelected(lWrap, [pLevel]);
            }
            if (pTheme) {
              const tWrap = secEl.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap):not(.keyword-picker-wrap):not(.source-picker-wrap)');
              if (tWrap && typeof themePickerSetSelected === 'function') themePickerSetSelected(tWrap, [pTheme]);
            }
          }
          if (isMultiplayer && typeof _quizMpSetMode === 'function') {
            _quizMpSetMode('local');
          }
          if (typeof refreshCurrentGame === 'function') refreshCurrentGame();
        }
      }, 200);
    });

    // ================================================================
    // MANAGE DATABASE OVERLAY
    // ================================================================

    const MDB_DELETED_KEY = 'deleted_words';

    // Track which words have been soft-deleted (by index in original vocabBank)
    // We store the word strings so they survive page reload
    function mdbGetDeleted() {
      try { return new Set(JSON.parse(localStorage.getItem(MDB_DELETED_KEY)) || []); } catch { return new Set(); }
    }
    function mdbSaveDeleted(set) {
      try { localStorage.setItem(MDB_DELETED_KEY, JSON.stringify([...set])); } catch { }
    }

    let mdbSelectedWords = new Set(); // Set of word strings currently checked
    let mdbPendingDelete = [];         // Words pending confirmation
    let mdbCurrentTab = 'delete';
    let mdbFilteredWords = [];         // full filtered word list
    let mdbWordsShownCount = 200;       // how many rows are currently rendered

    function mdbOpen() {
      // Populate theme filter
      const tf = document.getElementById('managedb-theme-filter');
      const themes = [...new Set(vocabBank.flatMap(item => getItemThemes(item)))].sort((a, b) => a.localeCompare(b));
      tf.innerHTML = '<option value="">All Themes</option>' + themes.map(t => `<option value="${t}">${t}</option>`).join('');

      mdbSelectedWords.clear();
      mdbUpdateSelBar();
      mdbShowTab('manage');
      mdbRenderWords();
      document.getElementById('managedb-overlay').classList.add('active');
    }

    function mdbClose() {
      document.getElementById('managedb-overlay').classList.remove('active');
      mdbCancelDelete();
    }

    function mdbShowTab(tab) {
      mdbCurrentTab = tab;
      document.getElementById('mdb-tab-delete').classList.toggle('active', tab === 'delete');
      document.getElementById('mdb-tab-dupes').classList.toggle('active', tab === 'dupes');
      document.getElementById('mdb-tab-themes').classList.toggle('active', tab === 'themes');
      document.getElementById('mdb-tab-add').classList.toggle('active', tab === 'add');
      document.getElementById('mdb-tab-manage').classList.toggle('active', tab === 'manage');
      document.getElementById('mdb-panel-delete').style.display = tab === 'delete' ? '' : 'none';
      document.getElementById('mdb-panel-dupes').style.display = tab === 'dupes' ? '' : 'none';
      document.getElementById('mdb-panel-themes').style.display = tab === 'themes' ? '' : 'none';
      document.getElementById('mdb-panel-add').style.display = tab === 'add' ? '' : 'none';
      document.getElementById('mdb-panel-manage').style.display = tab === 'manage' ? '' : 'none';
      document.getElementById('mdb-confirm-bar').classList.remove('active');
      if (tab === 'delete') mdbRenderWords();
      if (tab === 'dupes') mdbScanDuplicates();
      if (tab === 'themes') mdbRenderThemesTab();
      if (tab === 'add') { awSetTab('form'); awPopulateThemeDatalist(); }
      if (tab === 'manage') { awPopulateThemeDatalist(); awRenderManage(); }
    }

    // ================================================================
    // THEME MANAGEMENT (rename & merge)
    // ================================================================

    function mdbGetAllThemes() {
      return [...new Set(vocabBank.flatMap(w => getItemThemes(w)))].sort((a, b) => a.localeCompare(b));
    }

    function mdbRenderThemesTab() {
      const themes = mdbGetAllThemes();

      // Populate rename-from select
      const fromSel = document.getElementById('mdb-rename-from');
      const fromVal = fromSel.value;
      fromSel.innerHTML = '<option value="">— choose theme —</option>' +
        themes.map(t => `<option value="${t}"${t === fromVal ? ' selected' : ''}>${t}</option>`).join('');

      // Populate merge source checklist
      const list = document.getElementById('mdb-merge-source-list');
      const checked = [...list.querySelectorAll('.mdb-theme-check-item.checked')].map(el => el.dataset.theme);
      list.innerHTML = themes.map(t => `
        <div class="mdb-theme-check-item${checked.includes(t) ? ' checked' : ''}" data-theme="${t}"
          onclick="this.classList.toggle('checked');mdbUpdateMergePreview();">
          ${t}
        </div>`).join('');

      // Populate merge target datalist
      const dl = document.getElementById('mdb-merge-target-list');
      dl.innerHTML = themes.map(t => `<option value="${t}">`).join('');

      mdbUpdateRenameCount();
      mdbUpdateMergePreview();

      // Clear feedbacks
      document.getElementById('mdb-rename-feedback').textContent = '';
      document.getElementById('mdb-merge-feedback').textContent = '';
    }

    function mdbUpdateRenameCount() {
      const from = document.getElementById('mdb-rename-from').value;
      const to = document.getElementById('mdb-rename-to').value.trim();
      const prev = document.getElementById('mdb-rename-preview');
      if (!from) { prev.textContent = ''; return; }
      const count = vocabBank.filter(w => getItemThemes(w).includes(from)).length;
      prev.textContent = `${count} word${count !== 1 ? 's' : ''} use "${from}"` +
        (to ? ` → will be renamed to "${to}"` : '');
    }

    function mdbUpdateMergePreview() {
      const selected = [...document.querySelectorAll('#mdb-merge-source-list .mdb-theme-check-item.checked')]
        .map(el => el.dataset.theme);
      const target = document.getElementById('mdb-merge-target').value.trim();
      const prev = document.getElementById('mdb-merge-preview');
      if (!selected.length) { prev.textContent = ''; return; }
      const affected = new Set(
        vocabBank.filter(w => getItemThemes(w).some(t => selected.includes(t))).map(w => w.word)
      );
      prev.textContent = `${affected.size} word${affected.size !== 1 ? 's' : ''} affected` +
        (target ? ` → merged into "${target}"` : '');
    }

    // Apply a theme change (rename or remove) to a single vocabBank entry
    function mdbApplyThemeChange(w, oldThemes, newThemes) {
      if (Array.isArray(w.theme)) {
        w.theme = newThemes;
      } else {
        // was a string — keep as string if single, array if multiple
        w.theme = newThemes.length === 1 ? newThemes[0] : newThemes;
      }
    }

    // Persist theme changes to localStorage for custom words
    function mdbPersistThemeChanges() {
      try {
        const cw = JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || [];
        cw.forEach(c => {
          const live = vocabBank.find(v => v.word && c.word && v.word.toLowerCase() === c.word.toLowerCase());
          if (live) c.theme = live.theme;
        });
        localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(cw));
      } catch { }
    }

    function mdbRenameTheme() {
      const from = document.getElementById('mdb-rename-from').value.trim();
      const to = document.getElementById('mdb-rename-to').value.trim();
      const fb = document.getElementById('mdb-rename-feedback');

      if (!from) { fb.textContent = '⚠ Please select a theme to rename.'; fb.className = 'mdb-themes-feedback err'; return; }
      if (!to) { fb.textContent = '⚠ Please enter a new name.'; fb.className = 'mdb-themes-feedback err'; return; }
      if (from === to) { fb.textContent = '⚠ New name is the same as the current name.'; fb.className = 'mdb-themes-feedback err'; return; }

      let count = 0;
      vocabBank.forEach(w => {
        const themes = getItemThemes(w);
        if (!themes.includes(from)) return;
        const updated = themes.map(t => t === from ? to : t);
        mdbApplyThemeChange(w, themes, updated);
        count++;
      });

      mdbPersistThemeChanges();
      populateAllThemeMenus();

      // Refresh the delete-tab theme filter too
      const tf = document.getElementById('managedb-theme-filter');
      const allThemes = mdbGetAllThemes();
      tf.innerHTML = '<option value="">All Themes</option>' + allThemes.map(t => `<option value="${t}">${t}</option>`).join('');

      fb.textContent = `✓ Renamed "${from}" → "${to}" across ${count} word${count !== 1 ? 's' : ''}.`;
      fb.className = 'mdb-themes-feedback ok';
      document.getElementById('mdb-rename-to').value = '';
      mdbRenderThemesTab();
    }

    function mdbMergeThemes() {
      const selected = [...document.querySelectorAll('#mdb-merge-source-list .mdb-theme-check-item.checked')]
        .map(el => el.dataset.theme);
      const target = document.getElementById('mdb-merge-target').value.trim();
      const fb = document.getElementById('mdb-merge-feedback');

      if (selected.length < 2) { fb.textContent = '⚠ Select at least 2 themes to merge.'; fb.className = 'mdb-themes-feedback err'; return; }
      if (!target) { fb.textContent = '⚠ Enter a target theme name.'; fb.className = 'mdb-themes-feedback err'; return; }

      let count = 0;
      vocabBank.forEach(w => {
        const themes = getItemThemes(w);
        if (!themes.some(t => selected.includes(t))) return;
        // Replace all selected themes with the target, deduplicate, keep non-selected themes
        const updated = [...new Set(themes.map(t => selected.includes(t) ? target : t))];
        mdbApplyThemeChange(w, themes, updated);
        count++;
      });

      mdbPersistThemeChanges();
      populateAllThemeMenus();

      const tf = document.getElementById('managedb-theme-filter');
      const allThemes = mdbGetAllThemes();
      tf.innerHTML = '<option value="">All Themes</option>' + allThemes.map(t => `<option value="${t}">${t}</option>`).join('');

      fb.textContent = `✓ Merged ${selected.length} themes into "${target}" across ${count} word${count !== 1 ? 's' : ''}.`;
      fb.className = 'mdb-themes-feedback ok';
      document.getElementById('mdb-merge-target').value = '';
      mdbRenderThemesTab();
    }

    // ================================================================
    // END THEME MANAGEMENT
    // ================================================================

    function mdbIsCustomWord(word) {
      const custom = (() => { try { return JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || []; } catch { return []; } })();
      return custom.some(c => c.word && c.word.toLowerCase() === word.toLowerCase());
    }

    function mdbRenderWords() {
      const search = (document.getElementById('managedb-search').value || '').toLowerCase().trim();
      const theme = document.getElementById('managedb-theme-filter').value;
      const source = document.getElementById('managedb-source-filter').value;
      const deleted = mdbGetDeleted();

      mdbFilteredWords = vocabBank.filter(w => {
        if (!w.word) return false;
        if (deleted.has(w.word.toLowerCase())) return false;
        if (search && !w.word.toLowerCase().includes(search) && !(w.translation || '').toLowerCase().includes(search)) return false;
        if (theme && !getItemThemes(w).includes(theme)) return false;
        if (source === 'custom' && !mdbIsCustomWord(w.word)) return false;
        if (source === 'builtin' && mdbIsCustomWord(w.word)) return false;
        return true;
      });

      const list = document.getElementById('managedb-word-list');
      if (!mdbFilteredWords.length) {
        list.innerHTML = '<div style="text-align:center;color:#aaa;padding:30px;font-style:italic;">No words match your filters.</div>';
        return;
      }

      mdbWordsShownCount = 200;
      list.innerHTML = '';
      mdbRenderWordRows(list, 0, Math.min(mdbWordsShownCount, mdbFilteredWords.length));
      mdbAppendShowMore(list);
      mdbUpdateSelBar();
    }

    function mdbRenderWordRows(list, start, end) {
      const toRender = mdbFilteredWords.slice(start, end);
      toRender.forEach(w => {
        const isCustom = mdbIsCustomWord(w.word);
        const isChecked = mdbSelectedWords.has(w.word.toLowerCase());
        const themes = getItemThemes(w).join(', ') || '—';
        const row = document.createElement('div');
        row.className = 'mdb-word-row' + (isCustom ? ' mdb-custom' : '') + (isChecked ? ' mdb-selected' : '');
        row.onclick = function (e) {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
          const cb = row.querySelector('input[type=checkbox]');
          cb.checked = !cb.checked;
          mdbToggleWord(w.word.toLowerCase(), cb.checked);
        };
        row.innerHTML = `
          <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation();mdbToggleWord('${w.word.toLowerCase().replace(/'/g, "\\'")}', this.checked)">
          <div>
            <div class="mdb-word-name">${w.word}${w.translation ? ` <span style="color:#999;font-weight:400;font-size:0.85rem;">— ${w.translation}</span>` : ''}</div>
            <div class="mdb-word-meta">
              ${w.level ? `<span class="mdb-badge">${w.level.toUpperCase()}</span>` : ''}
              ${w.partOfSpeech ? `<span class="mdb-badge">${w.partOfSpeech}</span>` : ''}
              ${isCustom ? `<span class="mdb-badge mdb-badge-custom">Custom</span>` : ''}
              <span style="color:#bbb;">${themes}</span>
            </div>
          </div>
          <div style="font-size:0.8rem;color:#bbb;font-style:italic;">${(w.definition || '').substring(0, 80)}${(w.definition || '').length > 80 ? '…' : ''}</div>
          <button class="mdb-word-del-btn" onclick="event.stopPropagation();mdbDeleteOne('${w.word.toLowerCase().replace(/'/g, "\\'")}')">🗑</button>
          <button class="mdb-word-edit-btn" onclick="event.stopPropagation();mdbOpenEditWord('${w.word.toLowerCase().replace(/'/g, "\\'")}')">✏️</button>
        `;
        list.appendChild(row);
      });
    }

    function mdbAppendShowMore(list) {
      const remaining = mdbFilteredWords.length - mdbWordsShownCount;
      if (remaining <= 0) return;
      const wrap = document.createElement('div');
      wrap.id = 'mdb-show-more-btn';
      wrap.style.cssText = 'text-align:center;padding:14px 0 6px;';
      wrap.innerHTML = `<button class="mdb-action-btn" onclick="mdbShowMoreWords()">Show ${Math.min(200, remaining)} more <span style="opacity:0.55;font-weight:400;">(${remaining} remaining)</span></button>`;
      list.appendChild(wrap);
    }

    function mdbShowMoreWords() {
      const btn = document.getElementById('mdb-show-more-btn');
      if (btn) btn.remove();
      const list = document.getElementById('managedb-word-list');
      const start = mdbWordsShownCount;
      mdbWordsShownCount = Math.min(mdbWordsShownCount + 200, mdbFilteredWords.length);
      mdbRenderWordRows(list, start, mdbWordsShownCount);
      mdbAppendShowMore(list);
    }

    function mdbToggleWord(wordLower, checked) {
      if (checked) { mdbSelectedWords.add(wordLower); }
      else { mdbSelectedWords.delete(wordLower); }
      // update row highlight
      document.querySelectorAll('.mdb-word-row').forEach(row => {
        const cb = row.querySelector('input[type=checkbox]');
        if (cb) row.classList.toggle('mdb-selected', cb.checked);
      });
      mdbUpdateSelBar();
    }

    function mdbUpdateSelBar() {
      const n = mdbSelectedWords.size;
      document.getElementById('managedb-sel-count').textContent = n + ' word' + (n === 1 ? '' : 's') + ' selected';
      const btn = document.getElementById('mdb-delete-sel-btn');
      if (btn) btn.disabled = (n === 0);
    }

    function mdbSelectAll() {
      mdbFilteredWords.forEach(w => mdbSelectedWords.add(w.word.toLowerCase()));
      document.querySelectorAll('#managedb-word-list input[type=checkbox]').forEach(cb => { cb.checked = true; cb.closest('.mdb-word-row').classList.add('mdb-selected'); });
      mdbUpdateSelBar();
    }

    function mdbClearSel() {
      mdbSelectedWords.clear();
      document.querySelectorAll('#managedb-word-list input[type=checkbox]').forEach(cb => { cb.checked = false; cb.closest('.mdb-word-row').classList.remove('mdb-selected'); });
      mdbUpdateSelBar();
    }

    function mdbDeleteOne(wordLower) {
      mdbPendingDelete = [wordLower];
      const bar = document.getElementById('mdb-confirm-bar');
      document.getElementById('mdb-confirm-msg').textContent = `Permanently delete "${wordLower}"?`;
      bar.classList.add('active');
    }

    function mdbRequestDeleteSelected() {
      if (!mdbSelectedWords.size) return;
      mdbPendingDelete = [...mdbSelectedWords];
      const bar = document.getElementById('mdb-confirm-bar');
      document.getElementById('mdb-confirm-msg').textContent = `Permanently delete ${mdbPendingDelete.length} word${mdbPendingDelete.length === 1 ? '' : 's'}?`;
      bar.classList.add('active');
    }

    function mdbConfirmDelete() {
      const deleted = mdbGetDeleted();
      const customWords = (() => { try { return JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || []; } catch { return []; } })();

      mdbPendingDelete.forEach(wordLower => {
        deleted.add(wordLower);
        // If it's a custom word, also remove from custom storage
        const idx = customWords.findIndex(c => c.word && c.word.toLowerCase() === wordLower);
        if (idx !== -1) customWords.splice(idx, 1);
        // Remove from live vocabBank
        const vi = vocabBank.findIndex(v => v.word && v.word.toLowerCase() === wordLower);
        if (vi !== -1) vocabBank.splice(vi, 1);
        mdbSelectedWords.delete(wordLower);
      });

      mdbSaveDeleted(deleted);
      try { localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(customWords)); } catch { }

      mdbPendingDelete = [];
      document.getElementById('mdb-confirm-bar').classList.remove('active');
      mdbRenderWords();
      mdbUpdateSelBar();
      // Show brief toast
      mdbToast('✅ Words deleted from database');
    }

    function mdbCancelDelete() {
      mdbPendingDelete = [];
      document.getElementById('mdb-confirm-bar').classList.remove('active');
    }

    function mdbToast(msg) {
      const t = document.createElement('div');
      t.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:11px 26px;border-radius:8px;font-size:0.95rem;font-weight:700;color:#fff;background:#111;box-shadow:0 4px 18px rgba(0,0,0,0.25);white-space:nowrap;';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2500);
    }

    // ---- INLINE EDIT WORD MODAL (Manage Database) ----
    let _mdbEditWordKey = null; // lowercase word being edited

    function mdbOpenEditWord(wordLower) {
      const w = vocabBank.find(v => v.word && v.word.toLowerCase() === wordLower);
      if (!w) return;
      _mdbEditWordKey = wordLower;
      document.getElementById('mdb-edit-modal-title').textContent = '✏️ Edit: ' + w.word;
      document.getElementById('mdb-edit-word').value = w.word;
      document.getElementById('mdb-edit-french').value = w.french || '';
      document.getElementById('mdb-edit-ipa').value = w.ipa || '';
      const posEl = document.getElementById('mdb-edit-pos');
      const posVal = (Array.isArray(w.partOfSpeech) ? w.partOfSpeech[0] : (w.partOfSpeech || '')).toLowerCase();
      posEl.value = posVal;
      document.getElementById('mdb-edit-level').value = (w.level || '').toLowerCase();
      document.getElementById('mdb-edit-theme').value = getItemThemes(w).join(', ');
      document.getElementById('mdb-edit-definition').value = w.definition || '';
      document.getElementById('mdb-edit-example').value = w.exampleSentence || '';
      document.getElementById('mdb-edit-synonyms').value = (w.synonyms || []).join(', ');
      document.getElementById('mdb-edit-antonyms').value = (w.antonyms || []).join(', ');
      document.getElementById('mdb-edit-feedback').textContent = '';
      document.getElementById('mdb-edit-feedback').className = '';
      document.getElementById('mdb-edit-modal-overlay').classList.add('active');
    }

    function mdbCloseEditWord() {
      _mdbEditWordKey = null;
      document.getElementById('mdb-edit-modal-overlay').classList.remove('active');
    }

    function mdbSaveEditWord() {
      if (!_mdbEditWordKey) return;
      const french = document.getElementById('mdb-edit-french').value.trim();
      const definition = document.getElementById('mdb-edit-definition').value.trim();
      if (!french) { mdbEditFeedback('⚠ French translation is required.', 'err'); return; }
      if (!definition) { mdbEditFeedback('⚠ Definition is required.', 'err'); return; }

      const themeRaw = document.getElementById('mdb-edit-theme').value.trim();
      const themeVal = themeRaw.includes(',') ? themeRaw.split(',').map(s => s.trim()).filter(Boolean) : (themeRaw || '');

      const update = {
        ipa: document.getElementById('mdb-edit-ipa').value.trim(),
        french,
        partOfSpeech: document.getElementById('mdb-edit-pos').value || '',
        level: document.getElementById('mdb-edit-level').value || '',
        theme: themeVal,
        definition,
        exampleSentence: document.getElementById('mdb-edit-example').value.trim(),
        synonyms: document.getElementById('mdb-edit-synonyms').value.split(',').map(s => s.trim()).filter(Boolean),
        antonyms: document.getElementById('mdb-edit-antonyms').value.split(',').map(s => s.trim()).filter(Boolean),
      };

      // Update live vocabBank
      const vi = vocabBank.findIndex(v => v.word && v.word.toLowerCase() === _mdbEditWordKey);
      if (vi !== -1) Object.assign(vocabBank[vi], update);

      // Update custom localStorage if it's a custom word
      try {
        const cw = JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || [];
        const ci = cw.findIndex(c => c.word && c.word.toLowerCase() === _mdbEditWordKey);
        if (ci !== -1) { Object.assign(cw[ci], update); localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(cw)); }
      } catch { }

      populateAllThemeMenus();
      mdbRenderWords();
      mdbEditFeedback('✓ Saved!', 'ok');
      setTimeout(() => mdbCloseEditWord(), 800);
    }

    function mdbEditFeedback(msg, type) {
      const el = document.getElementById('mdb-edit-feedback');
      el.textContent = msg; el.className = type;
    }

    // ---- DUPLICATES ----

    function mdbScanDuplicates() {
      const deleted = mdbGetDeleted();
      const active = vocabBank.filter(w => w.word && !deleted.has(w.word.toLowerCase()));

      // Group 1: same word (case-insensitive) AND same partOfSpeech type
      const byWord = {};
      active.forEach(w => {
        const key = w.word.toLowerCase().trim();
        if (!byWord[key]) byWord[key] = [];
        byWord[key].push(w);
      });

      // Group 2: same theme (only flag if theme is very specific — skip generic themes)
      const byTheme = {};
      active.forEach(w => {
        getItemThemes(w).forEach(th => {
          if (!byTheme[th]) byTheme[th] = [];
          byTheme[th].push(w);
        });
      });

      // Only flag as duplicates if entries share both spelling AND the same partOfSpeech
      const wordDupGroups = Object.values(byWord).filter(g => {
        if (g.length < 2) return false;
        // Group entries by their normalized POS
        const normPos = w => {
          const p = w.partOfSpeech;
          if (!p) return '';
          return (Array.isArray(p) ? p.join(',') : p).toLowerCase().trim();
        };
        const posGroups = {};
        g.forEach(w => {
          const key = normPos(w);
          if (!posGroups[key]) posGroups[key] = [];
          posGroups[key].push(w);
        });
        // At least one POS bucket has 2+ entries (true duplicates)
        return Object.values(posGroups).some(pg => pg.length > 1);
      }).map(g => {
        // Flatten: only return entries where the POS appears more than once
        const normPos = w => {
          const p = w.partOfSpeech;
          if (!p) return '';
          return (Array.isArray(p) ? p.join(',') : p).toLowerCase().trim();
        };
        const posCount = {};
        g.forEach(w => { const k = normPos(w); posCount[k] = (posCount[k] || 0) + 1; });
        return g.filter(w => posCount[normPos(w)] > 1);
      });
      const themeDupGroups = Object.entries(byTheme)
        .filter(([, g]) => g.length >= 2 && g.length <= 20) // skip themes that are just huge vocab categories
        .map(([theme, words]) => ({ theme, words }));

      const content = document.getElementById('mdb-dup-content');
      content.innerHTML = '';

      if (!wordDupGroups.length && !themeDupGroups.length) {
        content.innerHTML = `<div class="mdb-no-dups"><span class="mdb-big-icon">✅</span>No duplicates found! Your database looks clean.</div>`;
        return;
      }

      // Render exact word duplicates
      if (wordDupGroups.length) {
        const h = document.createElement('div');
        h.innerHTML = `<div style="font-size:0.72rem;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#999;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #eee;">⚠️ Exact spelling duplicates (${wordDupGroups.length} group${wordDupGroups.length === 1 ? '' : 's'})</div>`;
        content.appendChild(h);
        wordDupGroups.forEach(group => {
          content.appendChild(mdbMakeDupGroup(group));
        });
      }

      // Render theme duplicates
      if (themeDupGroups.length) {
        const h = document.createElement('div');
        h.innerHTML = `<div style="font-size:0.72rem;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#999;margin:20px 0 12px;padding-bottom:6px;border-bottom:1px solid #eee;">🏷️ Shared-theme groups — ${themeDupGroups.length} theme${themeDupGroups.length === 1 ? '' : 's'}</div>
          <p style="font-size:0.82rem;color:#999;margin:0 0 14px;font-style:italic;">These words share a theme. If any are redundant synonyms or accidental entries, you can remove duplicates here.</p>`;
        content.appendChild(h);
        themeDupGroups.forEach(({ theme, words }) => {
          content.appendChild(mdbMakeThemeGroup(theme, words));
        });
      }
    }

    // Collect every unique theme across all entries in a group
    // ---- collect unique values across group ----
    function mdbCollectAllThemes(group) {
      const seen = new Set(), out = [];
      group.forEach(w => getItemThemes(w).forEach(th => {
        if (!seen.has(th.toLowerCase())) { seen.add(th.toLowerCase()); out.push(th); }
      }));
      return out;
    }

    function mdbCollectAllPOS(group) {
      const seen = new Set(), out = [];
      group.forEach(w => {
        const pos = w.partOfSpeech;
        if (!pos) return;
        // partOfSpeech may already be an array (future-proofed) or a comma string
        const vals = Array.isArray(pos) ? pos : pos.split(',').map(s => s.trim()).filter(Boolean);
        vals.forEach(v => { if (!seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); } });
      });
      return out;
    }

    // ---- apply merges to vocabBank + localStorage ----
    function mdbApplyMerged(wordLower, mergedThemes, mergedPOS) {
      const vi = vocabBank.findIndex(v => v.word && v.word.toLowerCase() === wordLower);
      if (vi !== -1) {
        if (mergedThemes) vocabBank[vi].theme = mergedThemes;
        if (mergedPOS) vocabBank[vi].partOfSpeech = mergedPOS.length === 1 ? mergedPOS[0] : mergedPOS;
      }
      try {
        const cw = JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || [];
        const ci = cw.findIndex(c => c.word && c.word.toLowerCase() === wordLower);
        if (ci !== -1) {
          if (mergedThemes) cw[ci].theme = mergedThemes;
          if (mergedPOS) cw[ci].partOfSpeech = mergedPOS.length === 1 ? mergedPOS[0] : mergedPOS;
          localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(cw));
        }
      } catch { }
    }

    // ---- build a collapsible merge bar (shared for themes & POS) ----
    function mdbMakeMergeBar({ label, tagDataAttr, items, addPlaceholder, countSuffix, btnClass }) {
      const bar = document.createElement('div');
      bar.className = 'mdb-theme-merge-bar';
      bar.style.cssText = 'display:none;padding:10px 16px 12px;background:#f8f8f8;border-bottom:1px solid #e0e0e0;';

      const tagsHtml = items.map(v => `
        <span class="mdb-theme-merge-tag" data-${tagDataAttr}="${v.replace(/"/g, '&quot;')}"
          style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#111;color:#fff;border-radius:4px;font-size:0.8rem;font-weight:700;">
          ${v}
          <span style="cursor:pointer;opacity:0.6;font-size:0.75rem;margin-left:2px;"
            onclick="this.closest('.mdb-theme-merge-tag').remove();mdbUpdateBarCount(this.closest('.mdb-theme-merge-bar'),'${tagDataAttr}','${countSuffix}');">✕</span>
        </span>`).join('');

      bar.innerHTML = `
        <div style="font-size:0.72rem;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:8px;">${label}</div>
        <div class="mdb-theme-tag-row" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">${tagsHtml}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input class="mdb-theme-add-input" placeholder="${addPlaceholder}"
            style="padding:5px 10px;border:1.5px solid #aaa;border-radius:4px;font-family:inherit;font-size:0.85rem;flex:1;min-width:140px;max-width:240px;"
            onkeydown="if(event.key==='Enter'){mdbAddMergeTag(this,'${tagDataAttr}','${countSuffix}');}" />
          <button class="mdb-action-btn mdb-btn-grey" style="font-size:0.8rem;padding:5px 12px;"
            onclick="mdbAddMergeTag(this.previousElementSibling,'${tagDataAttr}','${countSuffix}');">＋ Add</button>
          <span class="mdb-merge-tag-count" style="font-size:0.8rem;color:#888;margin-left:4px;">${items.length} ${countSuffix}${items.length === 1 ? '' : 's'}</span>
        </div>
        <p style="margin:8px 0 0;font-size:0.75rem;color:#aaa;font-style:italic;">Click ✕ on a tag to exclude it. Changes are applied when you confirm keeping an entry.</p>
      `;
      return bar;
    }

    function mdbUpdateBarCount(bar, attr, suffix) {
      const n = bar.querySelectorAll(`.mdb-theme-merge-tag[data-${attr}]`).length;
      const el = bar.querySelector('.mdb-merge-tag-count');
      if (el) el.textContent = `${n} ${suffix}${n === 1 ? '' : 's'}`;
    }

    function mdbAddMergeTag(input, attr, suffix) {
      const val = input.value.trim(); if (!val) return;
      const bar = input.closest('.mdb-theme-merge-bar');
      const row = bar.querySelector('.mdb-theme-tag-row');
      const existing = [...row.querySelectorAll('.mdb-theme-merge-tag')].map(t => (t.dataset[attr] || '').toLowerCase());
      if (existing.includes(val.toLowerCase())) { input.value = ''; return; }
      const tag = document.createElement('span');
      tag.className = 'mdb-theme-merge-tag';
      tag.dataset[attr] = val;
      tag.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#111;color:#fff;border-radius:4px;font-size:0.8rem;font-weight:700;';
      tag.innerHTML = `${val}<span style="cursor:pointer;opacity:0.6;font-size:0.75rem;margin-left:2px;" onclick="this.closest('.mdb-theme-merge-tag').remove();mdbUpdateBarCount(this.closest('.mdb-theme-merge-bar'),'${attr}','${suffix}');">✕</span>`;
      row.appendChild(tag);
      input.value = '';
      mdbUpdateBarCount(bar, attr, suffix);
    }

    function mdbReadBar(bar, attr) {
      if (!bar || bar.style.display === 'none') return null;
      return [...bar.querySelectorAll(`.mdb-theme-merge-tag[data-${attr}]`)].map(t => t.dataset[attr]).filter(Boolean);
    }

    // ---- wire toggle button for a bar ----
    function mdbWireToggle(btn, bar) {
      btn.onclick = function () {
        const open = bar.style.display !== 'none';
        bar.style.display = open ? 'none' : '';
        btn.style.background = open ? '#fff' : '#111';
        btn.style.color = open ? '#111' : '#fff';
      };
    }

    function mdbMakeDupGroup(group) {
      const allThemes = mdbCollectAllThemes(group);
      const allPOS = mdbCollectAllPOS(group);

      const div = document.createElement('div');
      div.className = 'mdb-dup-group';

      // --- header ---
      const header = document.createElement('div');
      header.className = 'mdb-dup-group-header';
      header.innerHTML = `
        <div>
          <div class="mdb-dup-group-label">"${group[0].word}"</div>
          <div class="mdb-dup-group-sub">${group.length} entries with identical spelling</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button class="mdb-dup-merge-btn mdb-btn-merge-themes" style="background:#fff;color:#111;border:2px solid #111;" title="Merge all themes into an array">🏷️ Merge Themes</button>
          <button class="mdb-dup-merge-btn mdb-btn-merge-pos"    style="background:#fff;color:#111;border:2px solid #111;" title="Merge all word types into an array">📝 Merge Types</button>
          <button class="mdb-dup-merge-btn" title="Keep the richest entry and auto-merge themes &amp; types">⚡ Keep Best Entry</button>
        </div>
      `;
      div.appendChild(header);

      // --- theme merge bar ---
      const themeBar = mdbMakeMergeBar({
        label: 'Combined theme array — will be applied to the kept entry:',
        tagDataAttr: 'theme', items: allThemes,
        addPlaceholder: 'Add a theme…', countSuffix: 'theme',
      });
      div.appendChild(themeBar);

      // --- POS merge bar ---
      const posBar = mdbMakeMergeBar({
        label: 'Combined word-type (partOfSpeech) array — will be applied to the kept entry:',
        tagDataAttr: 'pos', items: allPOS,
        addPlaceholder: 'Add a type… (e.g. noun)', countSuffix: 'type',
      });
      posBar.style.borderTop = allThemes.length ? '1px solid #e8e8e8' : '';
      div.appendChild(posBar);

      // wire toggles
      mdbWireToggle(header.querySelector('.mdb-btn-merge-themes'), themeBar);
      mdbWireToggle(header.querySelector('.mdb-btn-merge-pos'), posBar);

      // wire Keep Best Entry
      const bestBtn = header.querySelectorAll('.mdb-dup-merge-btn')[2];
      bestBtn.onclick = function () { mdbAutoMergeWordGroup(bestBtn, group[0].word.toLowerCase(), themeBar, posBar); };

      // --- items ---
      const container = document.createElement('div');
      container.className = 'mdb-dup-items-container';
      group.forEach((w, i) => {
        const item = document.createElement('div');
        item.className = 'mdb-dup-item';
        const themes = getItemThemes(w).join(', ') || '—';
        const posVal = Array.isArray(w.partOfSpeech) ? w.partOfSpeech.join(', ') : (w.partOfSpeech || '—');
        const isCustom = mdbIsCustomWord(w.word);
        item.innerHTML = `
          <div>
            <div class="mdb-dup-item-word">${w.word} ${isCustom ? '<span class="mdb-badge mdb-badge-custom" style="font-size:0.65rem;">custom</span>' : ''}</div>
            <div class="mdb-dup-item-details">
              ${w.level ? `<strong>${w.level.toUpperCase()}</strong> · ` : ''}<span style="color:#555;">Type: ${posVal}</span><br>
              <span style="color:#bbb;font-size:0.78rem;">Themes: ${themes}</span><br>
              ${w.definition ? w.definition.substring(0, 100) + (w.definition.length > 100 ? '…' : '') : '<em style="color:#ccc;">No definition</em>'}
            </div>
          </div>
          <button class="mdb-dup-keep-btn">Keep this</button>
        `;
        const btn = item.querySelector('.mdb-dup-keep-btn');
        btn.onclick = function () { mdbKeepThisEntry(btn, group, i, themeBar, posBar); };
        container.appendChild(item);
      });
      div.appendChild(container);
      return div;
    }

    // kept for backward-compat (theme-only helper, now unused but safe)
    function mdbUpdateMergeTagCount(bar) { mdbUpdateBarCount(bar, 'theme', 'theme'); }
    function mdbAddMergeTheme(input) { mdbAddMergeTag(input, 'theme', 'theme'); }
    function mdbReadMergeBarThemes(bar) { return mdbReadBar(bar, 'theme'); }

    function mdbMakeThemeGroup(theme, words) {
      const div = document.createElement('div');
      div.className = 'mdb-dup-group';
      div.innerHTML = `
        <div class="mdb-dup-group-header">
          <div>
            <div class="mdb-dup-group-label">Theme: "${theme}"</div>
            <div class="mdb-dup-group-sub">${words.length} words share this theme</div>
          </div>
        </div>
        <div style="padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px;">
          ${words.map(w => `<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border:1px solid #ddd;border-radius:4px;font-size:0.88rem;font-weight:600;background:#fff;">
            ${w.word}
            <button onclick="mdbDeleteOne('${w.word.toLowerCase().replace(/'/g, "\\'")}'); this.closest('.mdb-dup-group').style.opacity='0.5';" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:0.9rem;padding:0 2px;" title="Delete this word">🗑</button>
          </span>`).join('')}
        </div>
      `;
      return div;
    }

    function mdbKeepThisEntry(btn, group, keepIdx, themeBar, posBar) {
      const container = btn.closest('.mdb-dup-items-container');
      container.querySelectorAll('.mdb-dup-keep-btn').forEach(b => {
        b.classList.remove('mdb-kept'); b.textContent = 'Keep this'; b.disabled = false;
      });
      btn.classList.add('mdb-kept'); btn.textContent = '✓ Keeping'; btn.disabled = true;

      const mergedThemes = mdbReadBar(themeBar, 'theme');
      const mergedPOS = mdbReadBar(posBar, 'pos');

      if (mergedThemes || mergedPOS) {
        mdbApplyMerged(group[keepIdx].word.toLowerCase(), mergedThemes, mergedPOS);
        if (mergedThemes) group[keepIdx].theme = mergedThemes;
        if (mergedPOS) group[keepIdx].partOfSpeech = mergedPOS.length === 1 ? mergedPOS[0] : mergedPOS;
      }

      const toDelete = group.filter((_, i) => i !== keepIdx).map(w => w.word.toLowerCase());
      if (!toDelete.length) return;

      const parts = [];
      if (mergedThemes && mergedThemes.length) parts.push(`themes [${mergedThemes.join(', ')}]`);
      if (mergedPOS && mergedPOS.length) parts.push(`types [${mergedPOS.join(', ')}]`);
      const confirmMsg = parts.length
        ? `Merge ${parts.join(' and ')} into "${group[keepIdx].word}" and delete ${toDelete.length} duplicate${toDelete.length === 1 ? '' : 's'}?`
        : `Delete ${toDelete.length} duplicate entr${toDelete.length === 1 ? 'y' : 'ies'}?`;

      mdbPendingDelete = toDelete;
      document.getElementById('mdb-confirm-msg').textContent = confirmMsg;
      document.getElementById('mdb-confirm-bar').classList.add('active');
    }

    function mdbAutoMergeWordGroup(btn, wordLower, themeBar, posBar) {
      const group = vocabBank.filter(w => w.word && w.word.toLowerCase() === wordLower);
      if (group.length < 2) return;
      const scored = group.map(w => ({
        w, score: (w.definition ? 1 : 0) + (w.example ? 1 : 0) + (w.ipa ? 1 : 0) + (w.translation ? 1 : 0) + (w.synonyms?.length || 0)
      }));
      scored.sort((a, b) => b.score - a.score);
      const keepIdx = group.indexOf(scored[0].w);
      const container = btn.closest('.mdb-dup-group').querySelector('.mdb-dup-items-container');
      const keepBtns = container.querySelectorAll('.mdb-dup-keep-btn');
      // Auto-open both bars
      [{ bar: themeBar, btnClass: '.mdb-btn-merge-themes' }, { bar: posBar, btnClass: '.mdb-btn-merge-pos' }].forEach(({ bar, btnClass }) => {
        if (bar && bar.style.display === 'none') {
          bar.style.display = '';
          const tb = btn.closest('.mdb-dup-group').querySelector(btnClass);
          if (tb) {
            tb.style.background = '#111';
            tb.style.color = '#fff';
            tb.querySelectorAll('img').forEach(img => { img.style.filter = 'brightness(0) invert(1)'; });
          }
        }
      });
      if (keepBtns[keepIdx]) mdbKeepThisEntry(keepBtns[keepIdx], group, keepIdx, themeBar, posBar);
    }


