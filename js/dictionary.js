/* ==========================================================================
   Quick Dictionary — renderer logic
   --------------------------------------------------------------------------
   All parsing / indexing / searching happens in a worker thread owned by the
   Electron main process (js/dictionary-worker.js). This file only:
     - lets the user pick the search scope and which word banks are loaded,
     - sends debounced queries over IPC (window.electronApi.dictionary*),
     - renders at most ~50 results by MUTATING a small pool of existing DOM nodes
       (no innerHTML teardown, event delegation, zero per-row listeners).
   ========================================================================== */
(function () {
  'use strict';

  var api = window.electronApi || null;
  var isDesktop = !!(api && api.isElectron && typeof api.dictionarySearch === 'function');

  var LS_SCOPE = 'cmt-dict-scope';
  var LS_BANKS_OFF = 'cmt-dict-banks-off';
  var LS_TOUR_SEEN = 'cmt-tour-seen-dictionary';
  var LARGE_BANK_BYTES = 10 * 1024 * 1024;
  var RESULT_LIMIT = 50;
  var SEARCH_DEBOUNCE_MS = 60;
  var SYNC_DEBOUNCE_MS = 250;

  function t(key, fallback) {
    return typeof window.t === 'function' ? window.t(key, fallback) : (fallback !== undefined ? fallback : key);
  }
  function tf(key, vars, fallback) {
    if (typeof window.tFmt === 'function') return window.tFmt(key, vars);
    return fallback !== undefined ? fallback : key;
  }
  function $(id) { return document.getElementById(id); }

  var el = {};
  var state = {
    banks: [],                 // [{ name, size, count }]
    off: new Set(),            // names of banks the user unticked
    bankRows: new Map(),       // name -> { input, meta }
    results: [],
    activeIdx: -1,
    searchSeq: 0,
    syncSeq: 0,
    status: 'idle',
    loadedTotal: 0,
    searchTimer: null,
    syncTimer: null
  };

  /* ── Persistence ─────────────────────────────────────────────────────────── */
  function readOffSet() {
    try {
      var raw = JSON.parse(localStorage.getItem(LS_BANKS_OFF) || '[]');
      return new Set(Array.isArray(raw) ? raw : []);
    } catch (_) { return new Set(); }
  }
  function writeOffSet() {
    try { localStorage.setItem(LS_BANKS_OFF, JSON.stringify(Array.from(state.off))); } catch (_) { /* ignore */ }
  }

  /* ── Status badge ────────────────────────────────────────────────────────── */
  function setStatus(kind, detail) {
    state.status = kind;
    var badge = el.status;
    badge.classList.toggle('is-loading', kind === 'loading');
    badge.classList.toggle('is-ready', kind === 'ready');
    badge.classList.toggle('is-error', kind === 'error');
    var text;
    if (kind === 'loading') text = t('qdStatusLoading', 'Indexing word banks...');
    else if (kind === 'ready') text = tf('qdStatusReady', { n: state.loadedTotal.toLocaleString() }, state.loadedTotal + ' entries loaded');
    else if (kind === 'nobank') text = t('qdStatusNoBank', 'No bank selected');
    else if (kind === 'error') text = t('qdStatusError', 'Could not load a word bank');
    else text = t('qdStatusIdle', 'Ready');
    el.statusText.textContent = text;
    badge.title = detail || '';
  }

  /* ── Word bank picker ────────────────────────────────────────────────────── */
  function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function selectedBankNames() {
    return state.banks.filter(function (b) { return !state.off.has(b.name); }).map(function (b) { return b.name; });
  }

  function updateBanksCount() {
    el.banksCount.textContent = String(selectedBankNames().length);
  }

  function updateBankMeta(name) {
    var ref = state.bankRows.get(name);
    var bank = state.banks.find(function (b) { return b.name === name; });
    if (!ref || !bank) return;
    var parts = [formatSize(bank.size)];
    if (typeof bank.count === 'number') parts.unshift(tf('qdBankEntries', { n: bank.count.toLocaleString() }, bank.count + ' entries'));
    ref.meta.textContent = parts.join(' · ');
  }

  function buildBankRows() {
    state.bankRows.clear();
    var frag = document.createDocumentFragment();
    if (!state.banks.length) {
      var empty = document.createElement('div');
      empty.className = 'banks-empty';
      empty.textContent = t('qdNoBanks', 'No word bank found in the word banks folder.');
      frag.appendChild(empty);
    }
    state.banks.forEach(function (bank) {
      var row = document.createElement('label');
      row.className = 'bank-row';
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.bank = bank.name;
      input.checked = !state.off.has(bank.name);
      var name = document.createElement('span');
      name.className = 'bank-name';
      name.textContent = bank.name;
      row.appendChild(input);
      row.appendChild(name);
      if (bank.size >= LARGE_BANK_BYTES) {
        var tag = document.createElement('span');
        tag.className = 'bank-tag';
        tag.textContent = t('qdBankLarge', 'Large');
        row.appendChild(tag);
      }
      var meta = document.createElement('span');
      meta.className = 'bank-meta';
      row.appendChild(meta);
      frag.appendChild(row);
      state.bankRows.set(bank.name, { input: input, meta: meta });
    });
    el.banksList.replaceChildren(frag);
    state.banks.forEach(function (bank) { updateBankMeta(bank.name); });
    updateBanksCount();
  }

  function scheduleSync() {
    clearTimeout(state.syncTimer);
    state.syncTimer = setTimeout(syncBanks, SYNC_DEBOUNCE_MS);
  }

  async function syncBanks() {
    var names = selectedBankNames();
    updateBanksCount();
    var mySync = ++state.syncSeq;
    if (!names.length) {
      state.loadedTotal = 0;
      try { await api.dictionarySetBanks({ banks: [] }); } catch (_) { /* ignore */ }
      if (mySync !== state.syncSeq) return;
      setStatus('nobank');
      runSearch();
      return;
    }
    setStatus('loading');
    var response;
    try {
      response = await api.dictionarySetBanks({ banks: names });
    } catch (error) {
      if (mySync === state.syncSeq) setStatus('error', String(error && error.message || error));
      return;
    }
    if (mySync !== state.syncSeq) return; // a newer selection superseded this one
    if (!response || !response.ok) {
      setStatus('error', response && response.error);
      return;
    }
    var status = response.status || {};
    var loaded = status.loaded || {};
    var errors = status.errors || {};
    var total = 0;
    state.banks.forEach(function (bank) {
      if (typeof loaded[bank.name] === 'number') {
        bank.count = loaded[bank.name];
        total += bank.count;
      } else if (state.off.has(bank.name)) {
        bank.count = null;
      }
      updateBankMeta(bank.name);
    });
    state.loadedTotal = total;
    var errorNames = Object.keys(errors);
    if (errorNames.length) {
      setStatus('error', errorNames.map(function (n) { return n + ': ' + errors[n]; }).join('\n'));
    } else {
      setStatus('ready');
    }
    runSearch();
  }

  async function loadBanks() {
    var response;
    try {
      response = await api.dictionaryListBanks();
    } catch (error) {
      setStatus('error', String(error && error.message || error));
      return;
    }
    state.banks = (response && response.banks) || [];
    state.off = readOffSet();
    buildBankRows();
    if (!state.banks.length) {
      setStatus('nobank');
      showEmpty(t('qdNoBanks', 'No word bank found in the word banks folder.'));
      return;
    }
    syncBanks();
  }

  function toggleBanksPopover(force) {
    var open = typeof force === 'boolean' ? force : el.banksPopover.hidden;
    el.banksPopover.hidden = !open;
    el.banksBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function setAllBanks(checked) {
    state.banks.forEach(function (bank) {
      var ref = state.bankRows.get(bank.name);
      if (ref) ref.input.checked = checked;
      if (checked) state.off.delete(bank.name); else state.off.add(bank.name);
    });
    writeOffSet();
    scheduleSync();
  }

  /* ── Results rendering (node pool, in-place mutation) ────────────────────── */
  function createRow() {
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'result-row';
    row.setAttribute('role', 'option');
    var top = document.createElement('div');
    top.className = 'row-top';
    var word = document.createElement('span');
    word.className = 'row-word';
    var pos = document.createElement('span');
    pos.className = 'row-pos';
    top.appendChild(word);
    top.appendChild(pos);
    var def = document.createElement('div');
    def.className = 'row-def';
    row.appendChild(top);
    row.appendChild(def);
    return row;
  }

  function showEmpty(message) {
    el.emptyText.textContent = message;
    el.empty.hidden = false;
  }

  function hideAllRows() {
    var rows = el.list.children;
    for (var i = 0; i < rows.length; i++) rows[i].hidden = true;
  }

  function renderResults(payload) {
    var results = payload.results || [];
    state.results = results;
    var rows = el.list.children;
    while (rows.length < results.length) el.list.appendChild(createRow());
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (i >= results.length) { row.hidden = true; continue; }
      var entry = results[i];
      row.hidden = false;
      row.dataset.idx = String(i);
      row.firstChild.firstChild.textContent = entry.word;
      row.firstChild.lastChild.textContent = entry.pos;
      row.lastChild.textContent = entry.definition;
    }

    var query = el.input.value.trim();
    if (!results.length) {
      el.meta.textContent = '';
      showEmpty(tf('qdNoResults', { q: query }, 'No results for "' + query + '".'));
    } else {
      el.empty.hidden = true;
      var total = payload.total || results.length;
      var label = total > results.length
        ? tf('qdResultsMore', { shown: results.length, total: total }, results.length + ' / ' + total)
        : tf('qdResultsCount', { n: total }, total + ' results');
      el.meta.textContent = label + (payload.ms != null ? ' · ' + payload.ms + ' ms' : '');
    }
    renderSuggestions(payload.suggestions || []);
    el.list.scrollTop = 0;
    selectResult(results.length ? 0 : -1, false);
  }

  function clearResults() {
    state.results = [];
    hideAllRows();
    el.meta.textContent = '';
    renderSuggestions([]);
    showEmpty(t('qdEmptyPrompt', 'Type to search the selected word banks.'));
    selectResult(-1, false);
  }

  function renderSuggestions(words) {
    el.suggestRow.hidden = !words.length;
    syncNodes(el.suggestChips, words, function () {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn';
      return b;
    }, function (node, word) {
      node.textContent = word;
      node.dataset.search = word;
    });
  }

  /** Reconcile `container` children with `values`, reusing existing nodes. */
  function syncNodes(container, values, create, update) {
    var children = container.children;
    while (children.length > values.length) container.removeChild(container.lastChild);
    for (var i = 0; i < values.length; i++) {
      var node = children[i];
      if (!node) { node = create(); container.appendChild(node); }
      update(node, values[i], i);
    }
  }

  /* ── Detail pane ─────────────────────────────────────────────────────────── */
  function selectResult(idx, scrollIntoView) {
    var rows = el.list.children;
    if (state.activeIdx >= 0 && rows[state.activeIdx]) {
      rows[state.activeIdx].classList.remove('is-active');
      rows[state.activeIdx].setAttribute('aria-selected', 'false');
    }
    state.activeIdx = idx;
    if (idx < 0 || !state.results[idx]) {
      state.activeIdx = -1;
      el.detail.hidden = true;
      el.detailEmpty.hidden = false;
      return;
    }
    var row = rows[idx];
    if (row) {
      row.classList.add('is-active');
      row.setAttribute('aria-selected', 'true');
      if (scrollIntoView) row.scrollIntoView({ block: 'nearest' });
    }
    renderDetail(state.results[idx]);
  }

  function renderChipLinks(container, section, values) {
    section.hidden = !values.length;
    syncNodes(container, values, function () {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn';
      return b;
    }, function (node, value) {
      node.textContent = value;
      node.dataset.search = value;
    });
  }

  function renderDetail(entry) {
    el.detailEmpty.hidden = true;
    el.detail.hidden = false;
    el.detailWord.textContent = entry.word;
    el.detailIpa.textContent = entry.ipa ? '/' + entry.ipa.replace(/^\/|\/$/g, '') + '/' : '';

    var tags = [];
    if (entry.pos) tags.push({ text: entry.pos, cls: 'chip chip-pos' });
    if (entry.level) tags.push({ text: entry.level, cls: 'chip chip-level' });
    if (entry.theme) tags.push({ text: entry.theme, cls: 'chip chip-theme' });
    if (entry.bank) tags.push({ text: entry.bank, cls: 'chip chip-bank' });
    syncNodes(el.detailChips, tags, function () { return document.createElement('span'); }, function (node, tag) {
      node.className = tag.cls;
      node.textContent = tag.text;
    });

    el.secDefinition.hidden = !entry.definition;
    el.detailDef.textContent = entry.definition;

    var examples = entry.examples || [];
    el.secExamples.hidden = !examples.length;
    syncNodes(el.detailExamples, examples, function () { return document.createElement('li'); }, function (node, text) {
      node.textContent = text;
    });

    renderChipLinks(el.detailSynonyms, el.secSynonyms, entry.synonyms || []);
    renderChipLinks(el.detailAntonyms, el.secAntonyms, entry.antonyms || []);
    renderChipLinks(el.detailForms, el.secForms, entry.forms || []);
    el.detail.scrollTop = 0;
  }

  /* ── Searching ───────────────────────────────────────────────────────────── */
  function scheduleSearch() {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
  }

  async function runSearch() {
    var query = el.input.value.trim();
    var mySeq = ++state.searchSeq;
    if (!query) { clearResults(); return; }
    if (!isDesktop) return;
    // While indexing, syncBanks() re-runs the search as soon as the banks are ready.
    if (state.status === 'loading') return;
    if (state.status === 'nobank' || !state.banks.length) { clearResults(); return; }
    var payload;
    try {
      payload = await api.dictionarySearch({ q: query, scope: el.scope.value, limit: RESULT_LIMIT });
    } catch (error) {
      payload = { ok: false, results: [] };
    }
    if (mySeq !== state.searchSeq) return; // stale response
    renderResults(payload && payload.ok ? payload : { results: [], total: 0, suggestions: [] });
  }

  function searchFor(text) {
    el.input.value = text;
    el.input.focus();
    clearTimeout(state.searchTimer);
    runSearch();
  }

  /* ── Tour ────────────────────────────────────────────────────────────────── */
  window.startDictionaryTour = function () {
    if (!window.Tutorial || typeof window.Tutorial.start !== 'function') return;
    try { localStorage.setItem(LS_TOUR_SEEN, '1'); } catch (_) { /* ignore */ }
    var steps = [
      { selector: '#dictSearchBox', title: t('qdTourSearchTitle', 'Instant search'), text: t('qdTourSearchDesc', 'Start typing: results appear instantly.') },
      { selector: '#dictScopeField', title: t('qdTourScopeTitle', 'Search scope'), text: t('qdTourScopeDesc', 'Search only the word, or widen it.') },
      { selector: '#dictBanksField', title: t('qdTourBanksTitle', 'Choose your word banks'), text: t('qdTourBanksDesc', 'Pick which word banks are searched.') },
      { selector: '#dictResultsPanel', title: t('qdTourResultsTitle', 'Results'), text: t('qdTourResultsDesc', 'Best matches come first.') },
      { selector: '#dictDetailPanel', title: t('qdTourDetailTitle', 'Entry details'), text: t('qdTourDetailDesc', 'See definition, examples, synonyms and forms.') }
    ].filter(function (step) { return document.querySelector(step.selector) !== null; });

    window.Tutorial.start(steps, {
      next: t('tourNext', 'Next'),
      prev: t('tourPrev', 'Back'),
      skip: t('tourSkip', 'Skip'),
      done: t('tourDone', 'Done')
    });
  };

  /* ── Wiring ──────────────────────────────────────────────────────────────── */
  function bindEvents() {
    el.input.addEventListener('input', scheduleSearch);
    el.input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!state.results.length) return;
        event.preventDefault();
        var next = state.activeIdx + (event.key === 'ArrowDown' ? 1 : -1);
        next = Math.max(0, Math.min(state.results.length - 1, next));
        if (next !== state.activeIdx) selectResult(next, true);
      } else if (event.key === 'Escape') {
        if (!el.banksPopover.hidden) { toggleBanksPopover(false); return; }
        if (el.input.value) { el.input.value = ''; runSearch(); }
      }
    });

    el.scope.addEventListener('change', function () {
      try { localStorage.setItem(LS_SCOPE, el.scope.value); } catch (_) { /* ignore */ }
      runSearch();
    });

    el.list.addEventListener('click', function (event) {
      var row = event.target.closest('.result-row');
      if (!row || !el.list.contains(row)) return;
      selectResult(Number(row.dataset.idx), false);
    });

    var chipHandler = function (event) {
      var chip = event.target.closest('[data-search]');
      if (chip) searchFor(chip.dataset.search);
    };
    el.detail.addEventListener('click', chipHandler);
    el.suggestChips.addEventListener('click', chipHandler);

    el.banksBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleBanksPopover();
    });
    el.banksPopover.addEventListener('click', function (event) { event.stopPropagation(); });
    document.addEventListener('click', function () { if (!el.banksPopover.hidden) toggleBanksPopover(false); });
    el.banksList.addEventListener('change', function (event) {
      var input = event.target;
      if (!input || !input.dataset || !input.dataset.bank) return;
      if (input.checked) state.off.delete(input.dataset.bank); else state.off.add(input.dataset.bank);
      writeOffSet();
      updateBanksCount();
      scheduleSync();
    });
    $('dictBanksAllBtn').addEventListener('click', function () { setAllBanks(true); });
    $('dictBanksNoneBtn').addEventListener('click', function () { setAllBanks(false); });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !el.banksPopover.hidden) { toggleBanksPopover(false); return; }
      var isFocusShortcut = (event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'f');
      if (isFocusShortcut) { event.preventDefault(); el.input.focus(); el.input.select(); }
    });

    $('dictTourBtn').addEventListener('click', function () { window.startDictionaryTour(); });
    $('dictLauncherBtn').addEventListener('click', function () {
      if (window.Desktop && window.Desktop.openTool) window.Desktop.openTool('launcher.html');
      else window.location.href = '../launcher.html';
    });

    // Free the worker (and all index memory) as soon as the window goes away.
    window.addEventListener('pagehide', function () {
      if (isDesktop && typeof api.dictionaryDispose === 'function') api.dictionaryDispose();
    });
  }

  function init() {
    el.status = $('dictStatus');
    el.statusText = $('dictStatusText');
    el.input = $('dictSearchInput');
    el.scope = $('dictScopeSelect');
    el.banksBtn = $('dictBanksBtn');
    el.banksCount = $('dictBanksCount');
    el.banksPopover = $('dictBanksPopover');
    el.banksList = $('dictBanksList');
    el.meta = $('dictResultMeta');
    el.suggestRow = $('dictSuggestRow');
    el.suggestChips = $('dictSuggestChips');
    el.list = $('dictResultsList');
    el.empty = $('dictEmpty');
    el.emptyText = $('dictEmptyText');
    el.detail = $('dictDetail');
    el.detailEmpty = $('dictDetailEmpty');
    el.detailWord = $('dictDetailWord');
    el.detailIpa = $('dictDetailIpa');
    el.detailChips = $('dictDetailChips');
    el.detailDef = $('dictDetailDef');
    el.detailExamples = $('dictDetailExamples');
    el.detailSynonyms = $('dictDetailSynonyms');
    el.detailAntonyms = $('dictDetailAntonyms');
    el.detailForms = $('dictDetailForms');
    el.secDefinition = $('dictSecDefinition');
    el.secExamples = $('dictSecExamples');
    el.secSynonyms = $('dictSecSynonyms');
    el.secAntonyms = $('dictSecAntonyms');
    el.secForms = $('dictSecForms');

    if (typeof window.applyTranslations === 'function') window.applyTranslations();

    try {
      var savedScope = localStorage.getItem(LS_SCOPE);
      if (savedScope && el.scope.querySelector('option[value="' + savedScope + '"]')) el.scope.value = savedScope;
    } catch (_) { /* ignore */ }

    bindEvents();
    setStatus('idle');
    showEmpty(t('qdEmptyPrompt', 'Type to search the selected word banks.'));

    if (!isDesktop) {
      el.input.disabled = true;
      el.banksBtn.disabled = true;
      showEmpty(t('qdWebOnly', 'The Quick Dictionary needs the desktop app to read your word banks.'));
      return;
    }

    el.input.focus();
    loadBanks().then(function () {
      var seen = false;
      try { seen = localStorage.getItem(LS_TOUR_SEEN) === '1'; } catch (_) { /* ignore */ }
      if (!seen) setTimeout(function () { window.startDictionaryTour(); }, 500);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
