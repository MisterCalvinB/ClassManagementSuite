/**
 * Class Management Tools — Distant Reading Studio UI Controller
 * Orchestrates Character Network, Stylistics (Flesch-Kincaid/LIX/MATTR),
 * Themes & Narrative Arc, Collocations/Idioms/KWIC, Optional Local AI Summary,
 * Board Canvas Projections, and HTML/Markdown Report Export.
 */

(function (global) {
  'use strict';

  const COMMUNITY_PALETTE = [
    { bg: '#ffffff', color: '#111111', border: '#2d7d46' }, // sage green
    { bg: '#ffffff', color: '#111111', border: '#2563eb' }, // slate blue
    { bg: '#ffffff', color: '#111111', border: '#d97706' }, // amber
    { bg: '#ffffff', color: '#111111', border: '#7c3aed' }, // violet
    { bg: '#ffffff', color: '#111111', border: '#dc2626' }, // rose
    { bg: '#ffffff', color: '#111111', border: '#0891b2' }  // teal
  ];

  const state = {
    rawText: '',
    bookLabel: '',
    lang: 'en',
    langOverride: 'auto',
    activeTab: 'characters',
    detectedCharacters: [],
    mergeSelectedIds: new Set(),
    pairExcerpts: {},
    lastMetrics: null,
    stylistics: null,
    themes: null,
    customThemes: [],
    collocations: null,
    idiomsResult: null,
    kwicQuery: '',
    aiSummaryText: '',
    compareTextB: '',
    compareBookBLabel: '',
    compareResult: null,
    isRunning: false
  };

  function _t(key, fallback) {
    if (typeof global.i18n !== 'undefined' && typeof global.i18n.t === 'function') {
      const val = global.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function _esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _toast(msg, isError) {
    if (typeof global.showToast === 'function') {
      global.showToast(msg, !!isError);
    } else if (typeof global.mdbToast === 'function') {
      global.mdbToast(msg);
    }
  }

  function _setProgress(pct, visible) {
    const wrap = document.getElementById('char-net-progress-wrap');
    const fill = document.getElementById('char-net-progress-fill');
    if (wrap) wrap.style.display = visible ? 'block' : 'none';
    if (fill) fill.style.width = Math.max(0, Math.min(100, pct || 0)) + '%';
  }

  function _updateCorpusStats() {
    const badgeLang = document.getElementById('dr-lang-badge');
    const statsEl = document.getElementById('dr-corpus-stats');
    const text = state.rawText || '';
    if (!text.trim()) {
      if (badgeLang) badgeLang.textContent = '--';
      if (statsEl) statsEl.textContent = _t('drNoTextLoaded', 'No text loaded');
      return;
    }

    if (state.langOverride && state.langOverride !== 'auto') {
      state.lang = state.langOverride;
    } else if (global.CharacterNetworkService && typeof global.CharacterNetworkService.detectLanguage === 'function') {
      state.lang = global.CharacterNetworkService.detectLanguage(text);
    }
    const words = (text.match(/\S+/g) || []).length;
    const chapters = Math.max(1, (text.match(/(?:^|\n)\s*(?:chapter|chapitre|kapitel|capitolo|book|livre)\b/gi) || []).length);

    if (badgeLang) {
      badgeLang.textContent = (state.langOverride === 'auto' ? 'AUTO: ' : '') + state.lang.toUpperCase();
    }
    if (statsEl) {
      statsEl.textContent = words.toLocaleString() + ' ' + _t('drWordsLabel', 'words') +
        ' · ' + chapters + ' ' + _t('drChaptersLabel', 'sec.');
    }
    const cmpA = document.getElementById('dr-compare-book-a-name');
    if (cmpA) cmpA.textContent = state.bookLabel || _t('drCustomTextLabel', 'Custom Text');
  }

  function _resetCachedAnalyses() {
    state.stylistics = null;
    state.themes = null;
    state.collocations = null;
    state.idiomsResult = null;
    state.lastMetrics = null;
    state.aiSummaryText = '';
    const aiBox = document.getElementById('dr-ai-summary-output');
    if (aiBox) {
      aiBox.textContent = '';
      aiBox.style.display = 'none';
    }
  }

  function setActiveTab(tabId) {
    state.activeTab = tabId || 'characters';
    const tabs = document.querySelectorAll('#dr-studio-tabs .dr-tab-btn');
    tabs.forEach(btn => {
      const isMatch = btn.getAttribute('data-dr-tab') === state.activeTab;
      btn.classList.toggle('dr-tab-active', isMatch);
    });
    const panes = document.querySelectorAll('.dr-tab-pane');
    panes.forEach(pane => {
      const isMatch = pane.getAttribute('data-dr-pane') === state.activeTab;
      pane.style.display = isMatch ? 'flex' : 'none';
    });

    // Auto-run lightweight tab analysis on first visit if text is loaded
    if (state.rawText && state.rawText.trim().length > 0) {
      if (state.activeTab === 'stylistics' && !state.stylistics) runStylistics();
      else if (state.activeTab === 'themes' && !state.themes) runThemes();
      else if (state.activeTab === 'collocations' && !state.collocations) runCollocations();
    }
  }

  async function openModal(presetText) {
    const overlay = document.getElementById('character-network-overlay');
    if (!overlay) return;

    const bookSelect = document.getElementById('char-net-book-select');
    const bookStatus = document.getElementById('char-net-book-status');

    if (typeof global.searchInitShortcutMenu === 'function' && (!Array.isArray(global.searchAvailableBooks) || global.searchAvailableBooks.length === 0)) {
      try { await global.searchInitShortcutMenu(); } catch (_) {}
    }

    const loadedBookText = typeof global.searchBookText === 'string' ? global.searchBookText : '';
    const availableBooks = Array.isArray(global.searchAvailableBooks) ? global.searchAvailableBooks : [];

    const populateSelect = (selEl, includeLoaded) => {
      if (!selEl) return;
      selEl.innerHTML = '<option value="">' + _t('charNetChooseBookPrompt', '-- Choose a novel --') + '</option>';
      if (includeLoaded && loadedBookText.trim().length > 0) {
        const optLoaded = document.createElement('option');
        optLoaded.value = '__loaded_search_book__';
        optLoaded.textContent = _t('charNetLoadedSearchBook', 'Currently Loaded Book');
        selEl.appendChild(optLoaded);
      }
      availableBooks.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id || b.path;
        opt.textContent = b.folder ? (b.folder + ' / ' + (b.label || b.fileName)) : (b.label || b.fileName);
        selEl.appendChild(opt);
      });
    };
    populateSelect(bookSelect, true);
    populateSelect(document.getElementById('dr-compare-book-b-select'), true);

    if (typeof presetText === 'string' && presetText.trim().length > 0) {
      state.rawText = presetText;
      state.bookLabel = 'Current Book';
      if (bookSelect) bookSelect.value = '__loaded_search_book__';
      if (bookStatus) bookStatus.textContent = Math.round(presetText.length / 1024) + ' KB';
      _resetCachedAnalyses();
    } else if (loadedBookText.trim().length > 0 && !state.rawText) {
      state.rawText = loadedBookText;
      state.bookLabel = 'Current Book';
      if (bookSelect) bookSelect.value = '__loaded_search_book__';
      if (bookStatus) bookStatus.textContent = Math.round(loadedBookText.length / 1024) + ' KB';
      _resetCachedAnalyses();
    }

    _updateCorpusStats();
    setActiveTab(state.activeTab || 'characters');

    overlay.style.display = 'flex';
    if (typeof global.i18n !== 'undefined' && typeof global.i18n.applyTranslations === 'function') {
      global.i18n.applyTranslations(overlay);
    }
  }

  function closeModal() {
    const overlay = document.getElementById('character-network-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  async function onBookChange() {
    const bookSelect = document.getElementById('char-net-book-select');
    const bookStatus = document.getElementById('char-net-book-status');
    if (!bookSelect || !bookSelect.value) {
      state.rawText = '';
      state.bookLabel = '';
      if (bookStatus) bookStatus.textContent = '';
      _resetCachedAnalyses();
      _updateCorpusStats();
      return;
    }

    if (bookSelect.value === '__loaded_search_book__') {
      state.rawText = typeof global.searchBookText === 'string' ? global.searchBookText : '';
      state.bookLabel = 'Current Book';
      if (bookStatus) bookStatus.textContent = Math.round(state.rawText.length / 1024) + ' KB';
      _resetCachedAnalyses();
      _updateCorpusStats();
      return;
    }

    const availableBooks = Array.isArray(global.searchAvailableBooks) ? global.searchAvailableBooks : [];
    const match = availableBooks.find(b => b.id === bookSelect.value || b.path === bookSelect.value);
    if (!match) return;

    try {
      if (bookStatus) bookStatus.textContent = _t('drLoadingText', 'Loading...');
      const target = match.target || (match.path.startsWith('books/') ? 'data' : 'customBooks');
      const text = await global.searchReadShortcutBook(match.path, target);
      if (!text) throw new Error('File produced no readable text.');

      state.rawText = text;
      state.bookLabel = match.label || match.fileName;
      if (bookStatus) bookStatus.textContent = Math.round(text.length / 1024) + ' KB';
      _resetCachedAnalyses();
      _updateCorpusStats();
    } catch (err) {
      if (bookStatus) bookStatus.textContent = 'Error';
      _toast(err && err.message ? err.message : 'Failed to read novel', true);
    }
  }

  function togglePasteDrawer(forceShow) {
    const drawer = document.getElementById('dr-paste-drawer');
    if (!drawer) return;
    const show = typeof forceShow === 'boolean' ? forceShow : (drawer.style.display === 'none' || !drawer.style.display);
    drawer.style.display = show ? 'flex' : 'none';
  }

  function applyPastedText() {
    const ta = document.getElementById('dr-paste-textarea');
    const bookStatus = document.getElementById('char-net-book-status');
    if (!ta || !ta.value.trim()) {
      _toast(_t('charNetNoBookError', 'Please enter or load text first.'), true);
      return;
    }
    state.rawText = ta.value;
    state.bookLabel = _t('drCustomTextLabel', 'Custom Text');
    if (bookStatus) bookStatus.textContent = Math.round(state.rawText.length / 1024) + ' KB';
    togglePasteDrawer(false);
    _resetCachedAnalyses();
    _updateCorpusStats();
    _toast(_t('drTextLoadedToast', 'Text loaded into Distant Reading Studio.'), false);
  }

  function loadBoardNotesAsText() {
    const nodes = typeof global.conGetNodes === 'function' ? global.conGetNodes() : [];
    const notes = typeof global.conGetNotes === 'function' ? global.conGetNotes() : [];
    const parts = [];
    nodes.forEach(n => {
      const txt = (n.baseWord || (n.el ? n.el.textContent : '') || '').trim();
      if (txt) parts.push(txt);
    });
    notes.forEach(nt => {
      const txt = (nt.text || (nt.el ? nt.el.textContent : '') || '').trim();
      if (txt) parts.push(txt);
    });
    const combined = parts.join('\n\n');
    if (!combined.trim()) {
      _toast(_t('drNoBoardText', 'No text or notes found on the current board.'), true);
      return;
    }
    state.rawText = combined;
    state.bookLabel = _t('drBoardNotesLabel', 'Board Notes');
    const bookStatus = document.getElementById('char-net-book-status');
    if (bookStatus) bookStatus.textContent = Math.round(combined.length / 1024) + ' KB';
    _resetCachedAnalyses();
    _updateCorpusStats();
    _toast(_t('drTextLoadedToast', 'Board text loaded into Distant Reading Studio.'), false);
  }

  function handleFileUpload(fileInput) {
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      state.rawText = String(reader.result || '');
      state.bookLabel = file.name;
      const bookStatus = document.getElementById('char-net-book-status');
      if (bookStatus) bookStatus.textContent = Math.round(state.rawText.length / 1024) + ' KB';
      _resetCachedAnalyses();
      _updateCorpusStats();
      _toast(file.name + ' loaded.', false);
    };
    reader.readAsText(file);
  }

  // ================================================================
  // TAB 1: CHARACTERS & NETWORK
  // ================================================================

  async function scanCharacters() {
    if (!state.rawText || !state.rawText.trim()) {
      _toast(_t('charNetNoBookError', 'Please select or load a novel first.'), true);
      return;
    }
    const scanBtn = document.getElementById('char-net-scan-btn');
    try {
      if (scanBtn) scanBtn.disabled = true;
      _setProgress(30, true);
      await new Promise(r => setTimeout(r, 30));

      const candidates = global.CharacterNetworkService.detectCandidates(state.rawText, {
        minOccurrences: 3,
        maxCandidates: 35
      });
      _setProgress(100, true);
      await new Promise(r => setTimeout(r, 40));

      state.detectedCharacters = candidates;
      state.mergeSelectedIds.clear();
      renderCharactersTable();
      _toast(candidates.length + ' character entities identified.', false);
    } catch (e) {
      _toast(e && e.message ? e.message : 'Error scanning characters', true);
    } finally {
      if (scanBtn) scanBtn.disabled = false;
      _setProgress(0, false);
    }
  }

  function renderCharactersTable() {
    const tbody = document.getElementById('char-net-chars-tbody');
    if (!tbody) return;
    const chars = state.detectedCharacters;
    if (!chars || chars.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888; padding:16px;">' +
        _t('drScanPrompt', 'Scan a novel to detect characters.') + '</td></tr>';
      updateMergeButton();
      return;
    }

    const validIds = new Set(chars.map(c => c.id));
    Array.from(state.mergeSelectedIds).forEach(id => {
      if (!validIds.has(id)) state.mergeSelectedIds.delete(id);
    });

    tbody.innerHTML = '';
    chars.forEach(c => {
      const tr = document.createElement('tr');

      const tdCheck = document.createElement('td');
      tdCheck.style.textAlign = 'center';
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = c.enabled !== false;
      chk.style.cursor = 'pointer';
      chk.style.accentColor = '#333';
      chk.onchange = function () { c.enabled = this.checked; };
      tdCheck.appendChild(chk);
      tr.appendChild(tdCheck);

      const tdName = document.createElement('td');
      const nameWrap = document.createElement('div');
      nameWrap.style.display = 'flex';
      nameWrap.style.alignItems = 'center';
      nameWrap.style.gap = '6px';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = c.name || '';
      nameInput.className = 'char-net-alias-input';
      nameInput.style.fontWeight = '700';
      nameInput.onchange = function () { c.name = this.value.trim(); };
      nameWrap.appendChild(nameInput);
      if (c.likelySentenceStarter) {
        const flag = document.createElement('span');
        flag.className = 'dr-warn-badge';
        flag.textContent = _t('drSentenceStartFlag', 'Start?');
        flag.setAttribute('data-dr-tip', _t('drTipSentenceStartFlag', 'Usually appears at the start of sentences (e.g. question or discourse word). Unchecked by default.'));
        nameWrap.appendChild(flag);
      }
      tdName.appendChild(nameWrap);
      tr.appendChild(tdName);

      const tdCount = document.createElement('td');
      tdCount.style.textAlign = 'center';
      const badge = document.createElement('span');
      badge.className = 'char-net-badge';
      badge.textContent = c.count || 0;
      tdCount.appendChild(badge);
      tr.appendChild(tdCount);

      const tdAlias = document.createElement('td');
      const aliasInput = document.createElement('input');
      aliasInput.type = 'text';
      aliasInput.value = (c.aliases || []).join(', ');
      aliasInput.className = 'char-net-alias-input';
      aliasInput.placeholder = 'e.g. Nickname, Title';
      aliasInput.onchange = function () {
        c.aliases = this.value.split(',').map(s => s.trim()).filter(Boolean);
      };
      tdAlias.appendChild(aliasInput);
      tr.appendChild(tdAlias);

      const tdMerge = document.createElement('td');
      tdMerge.style.textAlign = 'center';
      const chkMerge = document.createElement('input');
      chkMerge.type = 'checkbox';
      chkMerge.checked = state.mergeSelectedIds.has(c.id);
      chkMerge.style.cursor = 'pointer';
      chkMerge.style.accentColor = '#5b8fcc';
      chkMerge.onchange = function () {
        if (this.checked) state.mergeSelectedIds.add(c.id);
        else state.mergeSelectedIds.delete(c.id);
        updateMergeButton();
      };
      tdMerge.appendChild(chkMerge);
      tr.appendChild(tdMerge);

      tbody.appendChild(tr);
    });
    updateMergeButton();
  }

  function updateMergeButton() {
    const btn = document.getElementById('char-net-merge-btn');
    const labelEl = document.getElementById('char-net-merge-btn-label');
    if (!btn) return;
    const count = state.mergeSelectedIds.size;
    const baseLabel = _t('charNetMergeBtn', 'Merge');
    if (labelEl) labelEl.textContent = count >= 2 ? (baseLabel + ' (' + count + ')') : baseLabel;
    btn.disabled = count < 2;
    btn.style.opacity = count < 2 ? '0.5' : '1';
    btn.style.cursor = count < 2 ? 'not-allowed' : 'pointer';
  }

  function mergeSelectedCharacters() {
    const chars = state.detectedCharacters || [];
    const selected = chars.filter(c => state.mergeSelectedIds.has(c.id));
    if (selected.length < 2) {
      _toast(_t('charNetMergeNeedTwo', 'Select at least 2 characters in the Merge column.'), true);
      return;
    }

    let primary = selected[0];
    selected.forEach(c => { if ((c.count || 0) > (primary.count || 0)) primary = c; });

    const seenAliases = new Set([(primary.name || '').trim().toLowerCase()]);
    const mergedAliases = [];
    const addAlias = val => {
      const trimmed = String(val || '').trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      if (seenAliases.has(lower)) return;
      seenAliases.add(lower);
      mergedAliases.push(trimmed);
    };

    (primary.aliases || []).forEach(addAlias);
    let totalCount = primary.count || 0;
    let anyEnabled = primary.enabled !== false;
    const removeIds = new Set();

    selected.forEach(c => {
      if (c === primary) return;
      removeIds.add(c.id);
      addAlias(c.name);
      (c.aliases || []).forEach(addAlias);
      totalCount += (c.count || 0);
      if (c.enabled !== false) anyEnabled = true;
    });

    primary.aliases = mergedAliases;
    primary.count = totalCount;
    primary.enabled = anyEnabled;

    state.detectedCharacters = chars.filter(c => !removeIds.has(c.id));
    state.mergeSelectedIds.clear();
    renderCharactersTable();

    const tpl = _t('charNetMergeSuccess', 'Merged {count} characters into "{name}".');
    _toast(tpl.replace('{count}', String(selected.length)).replace('{name}', primary.name || ''), false);
  }

  function toggleAllCharacters(checked) {
    if (!Array.isArray(state.detectedCharacters)) return;
    state.detectedCharacters.forEach(c => { c.enabled = !!checked; });
    renderCharactersTable();
  }

  async function addCustomCharacter() {
    const msg = _t('charNetCharCol', 'Character name:');
    const name = typeof global.showPrompt === 'function' ? await global.showPrompt(msg, '') : prompt(msg);
    if (!name || !name.trim()) return;
    state.detectedCharacters.unshift({
      id: 'char_' + (state.detectedCharacters.length + 1) + '_' + Date.now().toString(36),
      name: name.trim(),
      count: 1,
      aliases: [],
      enabled: true
    });
    renderCharactersTable();
  }

  function _prepareBoardTarget(targetLoc) {
    if (typeof global.navTo === 'function') global.navTo('constellation-section');
    if (typeof global.conPushUndo === 'function') global.conPushUndo();
    if (targetLoc === 'new_page' && typeof global.conAddPage === 'function') {
      global.conAddPage();
    } else if (targetLoc === 'clear' && typeof global.conClearAll === 'function') {
      global.conClearAll({ skipConfirm: true });
    }
  }

  function _getTargetOrigin() {
    const brd = document.getElementById('constellation-board');
    const viewW = (brd && brd.clientWidth > 400) ? brd.clientWidth : (window.innerWidth - 60);
    const viewH = (brd && brd.clientHeight > 300) ? brd.clientHeight : (window.innerHeight - 180);
    const scrollX = (brd && brd.scrollLeft > 0) ? brd.scrollLeft : 0;
    const scrollY = (brd && brd.scrollTop > 0) ? brd.scrollTop : 0;
    return { viewW, viewH, offsetX: scrollX + 60, offsetY: scrollY + 60 };
  }

  async function generateCharacterNetwork() {
    if (!state.rawText || !state.rawText.trim()) {
      _toast(_t('charNetNoBookError', 'Please select or load a novel first.'), true);
      return;
    }
    const activeChars = (state.detectedCharacters || []).filter(c => c && c.enabled !== false && c.name && c.name.trim());
    if (activeChars.length < 2) {
      _toast(_t('charNetNoCharsSelected', 'Please select at least 2 characters to analyze.'), true);
      return;
    }

    const winMode = (document.getElementById('char-net-window-mode') || {}).value || 'sliding';
    const minCooc = Number((document.getElementById('char-net-min-cooc') || {}).value) || 1;
    const targetLoc = (document.getElementById('char-net-target-location') || {}).value || 'new_page';
    const colorByComm = !!(document.getElementById('dr-color-communities') || {}).checked;
    const generateBtn = document.getElementById('char-net-generate-btn');

    try {
      if (generateBtn) generateBtn.disabled = true;
      _setProgress(10, true);

      const matrixResult = await global.CharacterNetworkService.buildCooccurrenceMatrix(
        state.rawText,
        activeChars,
        { windowMode: winMode, minCooccurrences: minCooc },
        pct => _setProgress(Math.min(85, Math.max(10, pct)), true)
      );

      state.pairExcerpts = matrixResult.pairExcerpts || {};
      if (Object.keys(matrixResult.matrix).length === 0) {
        _toast(_t('charNetNoCooccurrences', 'No interactions met the minimum co-occurrence threshold.'), true);
        return;
      }

      const metrics = global.CharacterNetworkService.computeMetrics(matrixResult.matrix, activeChars);
      state.lastMetrics = metrics;

      closeModal();
      _prepareBoardTarget(targetLoc);

      const { viewW, viewH, offsetX, offsetY } = _getTargetOrigin();
      const nodeCount = metrics.nodes.length;
      const bWidth = Math.max(viewW, Math.round(Math.sqrt(nodeCount) * 340) + 260);
      const bHeight = Math.max(viewH, Math.round(Math.sqrt(nodeCount) * 230) + 200);

      const layoutNodes = global.CharacterNetworkService.computeLayout(metrics.nodes, metrics.edges, bWidth, bHeight, {
        iterations: 140,
        offsetX,
        offsetY
      });

      const addWordFn = global.conAddWordAt;
      const addEdgeFn = global.conAddEdge;
      const getNodesFn = typeof global.conGetNodes === 'function' ? global.conGetNodes : () => [];
      const getEdgesFn = typeof global.conGetEdges === 'function' ? global.conGetEdges : () => [];
      const updateEdgeFn = global.conUpdateEdge;
      const redrawEdgesFn = global.conRedrawEdges;

      const createdNodeMap = new Map();
      layoutNodes.forEach((nd, idx) => {
        if (typeof addWordFn !== 'function') return;
        const nodeId = addWordFn(nd.name, nd.x, nd.y);
        createdNodeMap.set(nd.id, nodeId);

        const liveNode = getNodesFn().find(n => n.id === nodeId);
        if (liveNode) {
          const palIdx = colorByComm ? (nd.communityId || 0) : idx;
          const pal = COMMUNITY_PALETTE[palIdx % COMMUNITY_PALETTE.length];
          liveNode.color = pal.color;
          liveNode.border = pal.border;
          liveNode.borderWidth = (nd.normDegree > 0.5) ? 3 : 2;

          if (liveNode.el) {
            liveNode.el.style.color = pal.color;
            liveNode.el.style.borderColor = pal.border;
            liveNode.el.style.borderWidth = liveNode.borderWidth + 'px';
            const fontSize = Math.round(13 + (nd.normDegree * 9));
            liveNode.el.style.fontSize = fontSize + 'px';
            liveNode.el.style.fontWeight = (nd.normDegree > 0.3) ? '800' : '600';
          }
          if (typeof global.conSyncNodeBasePosition === 'function') global.conSyncNodeBasePosition(liveNode);
        }
      });

      let maxWeight = 1;
      metrics.edges.forEach(e => { if (e.weight > maxWeight) maxWeight = e.weight; });

      metrics.edges.forEach(edge => {
        const aNodeId = createdNodeMap.get(edge.source);
        const bNodeId = createdNodeMap.get(edge.target);
        if (!aNodeId || !bNodeId || typeof addEdgeFn !== 'function') return;

        let thickness = 4.5;
        if (maxWeight > 1) {
          const tNorm = Math.log(1 + (edge.weight - 1)) / Math.log(1 + (maxWeight - 1));
          thickness = Math.round((2.8 + tNorm * 10.2) * 10) / 10;
        }

        const createdEdge = addEdgeFn(aNodeId, bNodeId, 'none', '#333333', null, thickness);
        const liveEdge = createdEdge || getEdgesFn().find(e => (e.a === aNodeId && e.b === bNodeId) || (e.a === bNodeId && e.b === aNodeId));
        if (liveEdge) {
          liveEdge.thickness = thickness;
          liveEdge.label = String(edge.weight);
          liveEdge.labelBgActive = true;
          liveEdge.labelSize = Math.max(12, Math.min(18, Math.round(11 + Math.sqrt(edge.weight))));
          liveEdge.labelWeight = 700;

          if (liveEdge.line) {
            liveEdge.line.style.setProperty('stroke-width', thickness + 'px', 'important');
            liveEdge.line.setAttribute('stroke-width', String(thickness));
          }
          if (liveEdge.hit) {
            liveEdge.hit.style.strokeWidth = Math.max(18, thickness + 12) + 'px';
          }

          const pk = (edge.source < edge.target) ? (edge.source + '::' + edge.target) : (edge.target + '::' + edge.source);
          liveEdge.excerpts = matrixResult.pairExcerpts[pk] || [];
          liveEdge.charAName = (activeChars.find(c => c.id === edge.source) || {}).name || '';
          liveEdge.charBName = (activeChars.find(c => c.id === edge.target) || {}).name || '';
          if (typeof updateEdgeFn === 'function') updateEdgeFn(liveEdge);
        }
      });

      if (typeof redrawEdgesFn === 'function') redrawEdgesFn();
      if (typeof global.conMirrorBroadcastAll === 'function') global.conMirrorBroadcastAll();

      _toast('Character network generated: ' + layoutNodes.length + ' characters, ' + metrics.edges.length + ' links.', false);
    } catch (err) {
      _toast(err && err.message ? err.message : 'Error generating network', true);
    } finally {
      if (generateBtn) generateBtn.disabled = false;
      _setProgress(0, false);
    }
  }

  // ================================================================
  // TAB 2: STYLISTICS & READABILITY
  // ================================================================

  async function runStylistics() {
    if (!state.rawText || !state.rawText.trim()) {
      _toast(_t('charNetNoBookError', 'Please select or load a novel first.'), true);
      return;
    }
    if (!global.DistantReadingStylistics) return;
    _setProgress(35, true);
    try {
      const res = await global.DistantReadingStylistics.analyze(state.rawText, { lang: state.lang });
      state.stylistics = res;
      renderStylistics(res);
    } finally {
      _setProgress(0, false);
    }
  }

  function renderStylistics(res) {
    const kpiGrid = document.getElementById('dr-stylistics-kpis');
    const histEl = document.getElementById('dr-sentence-hist');
    const curveEl = document.getElementById('dr-readability-curve');
    if (!kpiGrid || !res) return;

    const r = res.readability;
    const lex = res.lexical;
    const syn = res.syntax;

    const cards = [
      {
        label: _t('drKincaidGrade', 'Flesch-Kincaid Grade'),
        val: r.fleschKincaidGrade,
        accent: '#e2c96e',
        exCat: 'complex',
        tip: _t('drTipKincaid', 'Estimated US school grade level (e.g. 8 = 8th grade). Higher = more complex syntax and longer words.')
      },
      {
        label: _t('drFleschEase', 'Flesch Reading Ease'),
        val: r.fleschReadingEase,
        accent: '#6abf8e',
        exCat: 'complex',
        tip: _t('drTipFleschEase', '0-100 scale where higher means easier to read (60-70 = plain/standard, <30 = academic/dense).')
      },
      {
        label: _t('drLixScore', 'LIX (Multi-Lang)'),
        val: r.lix,
        accent: '#5b8fcc',
        exCat: 'complex',
        tip: _t('drTipLix', 'Language-agnostic readability index (EN/FR/DE/IT): <25 very easy, 35-45 standard fiction, >55 complex prose.')
      },
      {
        label: _t('drGunningFog', 'Gunning Fog'),
        val: r.gunningFog,
        accent: '#8b7cc2',
        exCat: 'complex',
        tip: _t('drTipGunningFog', 'Years of formal education needed to understand the text on first reading, weighted by 3+ syllable words.')
      },
      {
        label: _t('drMattrScore', 'MATTR (Lexical Div.)'),
        val: lex.mattr,
        accent: '#6abf8e',
        exCat: 'hapax',
        tip: _t('drTipMattr', 'Moving-Average Type-Token Ratio (500-word window). Measures vocabulary richness independent of text length (0-1).')
      },
      {
        label: _t('drHapaxPct', 'Hapax Legomena'),
        val: lex.hapaxRatio + '%',
        accent: '#e2c96e',
        exCat: 'hapax',
        tip: _t('drTipHapax', 'Percentage of unique words that appear only once in the entire text. Higher = more varied or specialized diction.')
      },
      {
        label: _t('drDialoguePct', 'Dialogue Ratio'),
        val: syn.dialogueRatio + '%',
        accent: '#5b8fcc',
        exCat: 'dialogue',
        tip: _t('drTipDialogue', 'Estimated share of text inside quotation marks or dialogue dashes vs. narrative prose.')
      },
      {
        label: _t('drAvgSentLen', 'Avg Sentence (words)'),
        val: r.avgSentenceLength + ' (σ ' + syn.stdDevSentenceLength + ')',
        accent: '#c96b6b',
        exCat: 'complex',
        tip: _t('drTipAvgSent', 'Mean words per sentence and standard deviation (sigma). High sigma indicates strong rhythmic variety.')
      }
    ];

    kpiGrid.innerHTML = cards.map(c =>
      '<div class="dr-kpi-card dr-clickable-stat" style="border-top: 4px solid ' + c.accent + ';" data-dr-stat-ex="' + _esc(c.exCat) + '" data-dr-stat-label="' + _esc(c.label) + '" data-dr-tip="' + _esc(c.tip) + '">' +
        '<div class="dr-kpi-label">' + _esc(c.label) + '<span class="dr-tip-badge">?</span></div>' +
        '<div class="dr-kpi-val">' + _esc(c.val) + '</div>' +
      '</div>'
    ).join('');

    if (histEl) {
      const buckets = syn.sentenceLengthHistogram || [];
      const maxC = Math.max(1, ...buckets.map(b => b.count));
      const w = 380, h = 130, padB = 22, padT = 14;
      const barW = Math.floor((w - 20) / Math.max(1, buckets.length)) - 8;
      let bars = '';
      buckets.forEach((b, i) => {
        const bh = Math.round(((b.count / maxC) * (h - padB - padT)));
        const x = 14 + i * (barW + 8);
        const y = h - padB - bh;
        const maxAttr = b.max === Infinity ? '9999' : String(b.max);
        bars += `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="#5b8fcc" stroke="#333" stroke-width="1.5" rx="3" class="dr-hist-bar" data-dr-bucket="${b.min},${maxAttr}" data-dr-bucket-label="${_esc(b.label)}" style="cursor:pointer;"><title>${_esc(b.label)} words (${b.count}) - Click for examples</title></rect>`;
        bars += `<text x="${x + barW / 2}" y="${h - 6}" text-anchor="middle" font-size="10" font-weight="700" fill="#333">${_esc(b.label)}</text>`;
        bars += `<text x="${x + barW / 2}" y="${Math.max(10, y - 3)}" text-anchor="middle" font-size="9" font-weight="700" fill="#555">${b.count}</text>`;
      });
      histEl.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="dr-svg-chart">${bars}</svg>`;
    }

    if (curveEl) {
      const pts = res.curve || [];
      if (pts.length < 2) {
        curveEl.innerHTML = '<div class="dr-empty-hint">' + _t('drNotEnoughSegments', 'Text too short for chapter curve.') + '</div>';
      } else {
        const w = 380, h = 130, pad = 20;
        const maxV = Math.max(10, ...pts.map(p => p.lix));
        const minV = Math.min(...pts.map(p => p.lix));
        const span = Math.max(1, maxV - minV);
        const polyPts = pts.map((p, i) => {
          const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
          const y = (h - pad) - ((p.lix - minV) / span) * (h - pad * 2);
          return `${Math.round(x)},${Math.round(y)}`;
        }).join(' ');
        const dots = pts.map((p, i) => {
          const x = Math.round(pad + (i / (pts.length - 1)) * (w - pad * 2));
          const y = Math.round((h - pad) - ((p.lix - minV) / span) * (h - pad * 2));
          return `<circle cx="${x}" cy="${y}" r="3.5" fill="#e2c96e" stroke="#333" stroke-width="1.5"><title>${_esc(p.label)}: LIX ${p.lix}, FK ${p.fleschKincaidGrade}</title></circle>`;
        }).join('');
        curveEl.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="dr-svg-chart"><polyline fill="none" stroke="#333" stroke-width="2.5" points="${polyPts}" />${dots}</svg>`;
      }
    }
  }

  function projectStylisticsToBoard() {
    if (!state.stylistics) {
      _toast(_t('drRunAnalysisFirst', 'Run the analysis first.'), true);
      return;
    }
    const targetLoc = (document.getElementById('dr-projection-target') || {}).value || 'current';
    closeModal();
    _prepareBoardTarget(targetLoc);

    const r = state.stylistics.readability;
    const lex = state.stylistics.lexical;
    const syn = state.stylistics.syntax;
    const { offsetX, offsetY } = _getTargetOrigin();

    if (typeof global.conAddTableFromData === 'function') {
      global.conAddTableFromData({
        x: offsetX + 40,
        y: offsetY + 40,
        rows: [
          [_t('drMetricCol', 'Stylistic Metric'), state.bookLabel || 'Text'],
          ['Flesch-Kincaid Grade', String(r.fleschKincaidGrade)],
          ['Flesch Reading Ease', String(r.fleschReadingEase)],
          ['LIX (Multi-Language)', String(r.lix)],
          ['Gunning Fog', String(r.gunningFog)],
          ['MATTR (Lexical Diversity)', String(lex.mattr)],
          ['Hapax Legomena %', lex.hapaxRatio + '%'],
          ['Dialogue Ratio %', syn.dialogueRatio + '%'],
          ['Avg Sentence Length', r.avgSentenceLength + ' words']
        ]
      });
      _toast(_t('drProjectedBoardToast', 'Projected onto Board.'), false);
    }
  }

  // ================================================================
  // TAB 3: THEMES & NARRATIVE ARC
  // ================================================================

  async function runThemes() {
    if (!state.rawText || !state.rawText.trim()) {
      _toast(_t('charNetNoBookError', 'Please select or load a novel first.'), true);
      return;
    }
    if (!global.DistantReadingThemes) return;
    _setProgress(35, true);
    try {
      const [kp, fields, arc] = await Promise.all([
        global.DistantReadingThemes.extractKeyphrases(state.rawText, { maxItems: 20 }),
        global.DistantReadingThemes.analyzeSemanticFields(state.rawText, state.customThemes, { lang: state.lang }),
        global.DistantReadingThemes.computeSentimentArc(state.rawText, 16, { lang: state.lang })
      ]);
      const builtIn = [...global.DistantReadingThemes.getBuiltInThemes(state.lang), ...state.customThemes];
      const activeChars = (state.detectedCharacters || []).filter(c => c && c.enabled !== false);
      const charTheme = activeChars.length > 0
        ? await global.DistantReadingThemes.computeCharacterThemeMatrix(state.rawText, activeChars, builtIn)
        : null;

      state.themes = { keyphrases: kp, fields, arc, charTheme };
      renderThemes(state.themes);
    } finally {
      _setProgress(0, false);
    }
  }

  function addCustomTheme() {
    const labelEl = document.getElementById('dr-custom-theme-label');
    const termsEl = document.getElementById('dr-custom-theme-terms');
    const label = labelEl ? labelEl.value.trim() : '';
    const terms = termsEl ? termsEl.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
    if (!label || terms.length === 0) {
      _toast(_t('drCustomThemeInvalid', 'Enter a theme name and comma-separated keywords.'), true);
      return;
    }
    state.customThemes.push({
      id: 'custom_' + Date.now().toString(36),
      label,
      color: '#8b7cc2',
      terms
    });
    if (labelEl) labelEl.value = '';
    if (termsEl) termsEl.value = '';
    runThemes();
  }

  function renderThemes(data) {
    const fieldsEl = document.getElementById('dr-theme-fields-list');
    const kwEl = document.getElementById('dr-theme-keywords');
    const arcEl = document.getElementById('dr-sentiment-arc');
    const matrixEl = document.getElementById('dr-char-theme-matrix');
    if (!data) return;

    if (fieldsEl) {
      const maxHits = Math.max(1, ...data.fields.map(f => f.hits));
      fieldsEl.innerHTML = data.fields.map(f => {
        const pct = Math.round((f.hits / maxHits) * 100);
        const lbl = f.labelKey ? _t(f.labelKey, f.label) : f.label;
        return '<div class="dr-bar-row dr-clickable-theme" data-dr-theme-id="' + _esc(f.id) + '" title="' + _esc(_t('drClickForExamples', 'Click to see matching sentences')) + '">' +
          '<div class="dr-bar-meta"><span>' + _esc(lbl) + '</span><span>' + f.hits + ' (' + f.per10k + '/10k)</span></div>' +
          '<div class="dr-bar-track"><div class="dr-bar-fill" style="width:' + pct + '%; background:' + _esc(f.color) + ';"></div></div>' +
        '</div>';
      }).join('');
    }

    if (kwEl) {
      const items = [...(data.keyphrases.keyphrases || []).slice(0, 10).map(k => k.phrase),
        ...(data.keyphrases.keywords || []).slice(0, 14).map(k => k.term)];
      kwEl.innerHTML = items.map(term =>
        '<button type="button" class="dr-chip-btn" data-dr-kwic="' + _esc(term) + '">' + _esc(term) + '</button>'
      ).join('');
    }

    if (arcEl) {
      const arc = data.arc || [];
      if (arc.length < 2) {
        arcEl.innerHTML = '<div class="dr-empty-hint">' + _t('drNotEnoughSegments', 'Text too short for narrative arc.') + '</div>';
      } else {
        const w = 380, h = 130, midY = h / 2, pad = 18;
        const maxAbs = Math.max(5, ...arc.map(a => Math.abs(a.netValence)));
        const pts = arc.map((a, i) => {
          const val = typeof a.smoothedValence === 'number' ? a.smoothedValence : a.netValence;
          const x = pad + (i / (arc.length - 1)) * (w - pad * 2);
          const y = midY - (val / maxAbs) * (midY - pad);
          return `${Math.round(x)},${Math.round(y)}`;
        }).join(' ');
        const dots = arc.map((a, i) => {
          const val = typeof a.smoothedValence === 'number' ? a.smoothedValence : a.netValence;
          const x = Math.round(pad + (i / (arc.length - 1)) * (w - pad * 2));
          const y = Math.round(midY - (val / maxAbs) * (midY - pad));
          const col = val >= 0 ? '#6abf8e' : '#c96b6b';
          return `<circle cx="${x}" cy="${y}" r="3.5" fill="${col}" stroke="#333" stroke-width="1.5"><title>${_esc(a.label)}: ${val} (raw ${a.netValence})</title></circle>`;
        }).join('');
        arcEl.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="dr-svg-chart">` +
          `<line x1="${pad}" y1="${midY}" x2="${w - pad}" y2="${midY}" stroke="#aaa" stroke-dasharray="4 3" />` +
          `<polyline fill="none" stroke="#333" stroke-width="2.5" points="${pts}" />${dots}</svg>`;
      }
    }

    if (matrixEl) {
      const ct = data.charTheme;
      if (!ct || ct.characters.length === 0) {
        matrixEl.innerHTML = '<div class="dr-empty-hint">' + _t('drScanCharsForMatrix', 'Scan characters in Tab 1 to view Character-Theme affinities.') + '</div>';
      } else {
        let html = '<table class="char-net-table"><thead><tr><th>' + _t('charNetCharCol', 'Character') + '</th>';
        ct.themes.slice(0, 6).forEach(t => {
          const lbl = t.labelKey ? _t(t.labelKey, t.label) : t.label;
          html += '<th>' + _esc(lbl.split(' ')[0]) + '</th>';
        });
        html += '</tr></thead><tbody>';
        ct.characters.slice(0, 8).forEach(c => {
          html += '<tr><td><b>' + _esc(c.name) + '</b></td>';
          ct.themes.slice(0, 6).forEach(t => {
            const val = (ct.matrix[c.id] && ct.matrix[c.id][t.id]) || 0;
            html += '<td style="text-align:center;">' + val + '</td>';
          });
          html += '</tr>';
        });
        html += '</tbody></table>';
        matrixEl.innerHTML = html;
      }
    }
  }

  function projectThemesToBoard() {
    if (!state.themes || !state.themes.fields) {
      _toast(_t('drRunAnalysisFirst', 'Run the analysis first.'), true);
      return;
    }
    const targetLoc = (document.getElementById('dr-projection-target') || {}).value || 'new_page';
    closeModal();
    _prepareBoardTarget(targetLoc);

    const { offsetX, offsetY } = _getTargetOrigin();
    const topFields = state.themes.fields.filter(f => f.hits > 0).slice(0, 6);
    const addWordFn = global.conAddWordAt;
    const addEdgeFn = global.conAddEdge;
    if (typeof addWordFn !== 'function') return;

    const cx = offsetX + 360;
    const cy = offsetY + 260;
    const centerId = addWordFn(state.bookLabel || 'Themes', cx, cy);

    topFields.forEach((f, idx) => {
      const angle = (idx / Math.max(1, topFields.length)) * Math.PI * 2;
      const fx = Math.round(cx + Math.cos(angle) * 230);
      const fy = Math.round(cy + Math.sin(angle) * 180);
      const lbl = f.labelKey ? _t(f.labelKey, f.label) : f.label;
      const themeNodeId = addWordFn(lbl + ' (' + f.hits + ')', fx, fy);
      if (typeof addEdgeFn === 'function') addEdgeFn(centerId, themeNodeId, 'none', f.color || '#333333', null, 3.5);

      (f.topTerms || []).slice(0, 3).forEach((t, tIdx) => {
        const subAngle = angle + (tIdx - 1) * 0.35;
        const tx = Math.round(fx + Math.cos(subAngle) * 130);
        const ty = Math.round(fy + Math.sin(subAngle) * 110);
        const termId = addWordFn(t.term, tx, ty);
        if (typeof addEdgeFn === 'function') addEdgeFn(themeNodeId, termId, 'none', '#666666', null, 2);
      });
    });

    if (typeof global.conRedrawEdges === 'function') global.conRedrawEdges();
    if (typeof global.conMirrorBroadcastAll === 'function') global.conMirrorBroadcastAll();
    _toast(_t('drProjectedBoardToast', 'Theme constellation projected onto Board.'), false);
  }

  // ================================================================
  // TAB 4: COLLOCATIONS, IDIOMS & KWIC
  // ================================================================

  async function runCollocations() {
    if (!state.rawText || !state.rawText.trim()) {
      _toast(_t('charNetNoBookError', 'Please select or load a novel first.'), true);
      return;
    }
    if (!global.DistantReadingCollocations) return;
    _setProgress(35, true);
    try {
      const col = await global.DistantReadingCollocations.extractCollocations(state.rawText, { minFreq: 3, maxResults: 35 });
      const idm = await global.DistantReadingCollocations.detectIdiomsAndMWEs(state.rawText, state.lang, col);
      state.collocations = col;
      state.idiomsResult = idm;
      renderCollocations(col, idm);
    } finally {
      _setProgress(0, false);
    }
  }

  function renderCollocations(col, idm) {
    const tbody = document.getElementById('dr-collocations-tbody');
    const idiomsEl = document.getElementById('dr-idioms-list');
    if (tbody && col) {
      const rows = [...(col.bigrams || []).slice(0, 25), ...(col.trigrams || []).slice(0, 10)];
      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888; padding:12px;">No collocations met the frequency threshold.</td></tr>';
      } else {
        tbody.innerHTML = rows.map(r =>
          '<tr class="dr-kwic-row" data-dr-kwic="' + _esc(r.phrase) + '">' +
            '<td><b>' + _esc(r.phrase) + '</b></td>' +
            '<td style="text-align:center;">' + r.count + '</td>' +
            '<td style="text-align:center;">' + r.pmi + '</td>' +
            '<td style="text-align:center;">' + r.g2 + '</td>' +
          '</tr>'
        ).join('');
      }
    }

    if (idiomsEl && idm) {
      const all = [...(idm.idioms || []), ...(idm.mwes || [])];
      if (all.length === 0) {
        idiomsEl.innerHTML = '<div class="dr-empty-hint">' + _t('drNoIdiomsFound', 'No dictionary idioms matched in this text.') + '</div>';
      } else {
        idiomsEl.innerHTML = all.slice(0, 24).map(item =>
          '<button type="button" class="dr-chip-btn" data-dr-kwic="' + _esc(item.phrase) + '">' +
            _esc(item.phrase) + ' <span class="char-net-badge">' + item.count + '</span>' +
          '</button>'
        ).join('');
      }
    }
  }

  function runKwicSearch(queryOverride) {
    const input = document.getElementById('dr-kwic-input');
    const query = typeof queryOverride === 'string' ? queryOverride : (input ? input.value : '');
    if (input && typeof queryOverride === 'string') input.value = queryOverride;
    state.kwicQuery = query;

    const listEl = document.getElementById('dr-kwic-results');
    if (!listEl || !global.DistantReadingCollocations) return;
    const hits = global.DistantReadingCollocations.findConcordances(state.rawText, query, 7, 50);
    if (hits.length === 0) {
      listEl.innerHTML = '<div class="dr-empty-hint">' + _t('drNoKwicHits', 'No concordances found.') + '</div>';
      return;
    }
    listEl.innerHTML = hits.map(h =>
      '<div class="dr-kwic-line">' +
        '<span class="dr-kwic-left">' + _esc(h.left) + '</span>' +
        '<span class="dr-kwic-node">' + _esc(h.match) + '</span>' +
        '<span class="dr-kwic-right">' + _esc(h.right) + '</span>' +
      '</div>'
    ).join('');
  }

  function projectCollocationsToBoard() {
    if (!state.collocations) {
      _toast(_t('drRunAnalysisFirst', 'Run the analysis first.'), true);
      return;
    }
    const targetLoc = (document.getElementById('dr-projection-target') || {}).value || 'new_page';
    closeModal();
    _prepareBoardTarget(targetLoc);

    const { offsetX, offsetY } = _getTargetOrigin();
    const top = (state.collocations.bigrams || []).slice(0, 12);
    const addWordFn = global.conAddWordAt;
    const addEdgeFn = global.conAddEdge;
    if (typeof addWordFn !== 'function' || top.length === 0) return;

    const cx = offsetX + 340;
    const cy = offsetY + 240;
    const hubId = addWordFn(_t('drCollocationsHub', 'Collocations'), cx, cy);
    top.forEach((c, idx) => {
      const angle = (idx / top.length) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(angle) * 230);
      const y = Math.round(cy + Math.sin(angle) * 180);
      const nid = addWordFn(c.phrase + ' (' + c.count + ')', x, y);
      if (typeof addEdgeFn === 'function') addEdgeFn(hubId, nid, 'none', '#5b8fcc', null, 2.5);
    });

    if (typeof global.conRedrawEdges === 'function') global.conRedrawEdges();
    if (typeof global.conMirrorBroadcastAll === 'function') global.conMirrorBroadcastAll();
    _toast(_t('drProjectedBoardToast', 'Collocations projected onto Board.'), false);
  }

  // ================================================================
  // OPTIONAL LOCAL AI SUMMARY (window.SlmService)
  // ================================================================

  async function runAiSummary() {
    if (!state.rawText || !state.rawText.trim()) {
      _toast(_t('charNetNoBookError', 'Please select or load a novel first.'), true);
      return;
    }
    if (!global.SlmService || typeof global.SlmService.generateText !== 'function') {
      _toast(_t('drAiUnavailable', 'Local AI (SlmService) is not available.'), true);
      return;
    }

    const btn = document.getElementById('dr-ai-summary-btn');
    const outEl = document.getElementById('dr-ai-summary-output');
    if (outEl) {
      outEl.style.display = 'block';
      outEl.textContent = _t('drAiGenerating', 'Generating literary synthesis with local AI...');
    }
    if (btn) btn.disabled = true;

    try {
      // Ensure core metrics are available for a rich prompt
      if (!state.stylistics && global.DistantReadingStylistics) {
        state.stylistics = await global.DistantReadingStylistics.analyze(state.rawText, { lang: state.lang });
      }
      if (!state.themes && global.DistantReadingThemes) {
        const fields = await global.DistantReadingThemes.analyzeSemanticFields(state.rawText, state.customThemes);
        state.themes = { fields };
      }

      const topChars = (state.detectedCharacters || []).slice(0, 6).map(c => c.name + ' (' + c.count + ')').join(', ') || 'N/A';
      const topThemes = (state.themes && state.themes.fields || []).slice(0, 4).map(f => f.label + ' (' + f.hits + ')').join(', ') || 'N/A';
      const fk = state.stylistics ? state.stylistics.readability.fleschKincaidGrade : 'N/A';
      const lix = state.stylistics ? state.stylistics.readability.lix : 'N/A';
      const mattr = state.stylistics ? state.stylistics.lexical.mattr : 'N/A';

      const sysPrompt = 'You are a literary analysis assistant. Write exactly 4 concise bullet points summarizing only the provided text metrics, top characters, and top themes. Do not invent plot events, quotes, or facts not shown in the metrics.';
      const prompt = 'Title: "' + (state.bookLabel || 'this text') + '"\n' +
        'Language: ' + state.lang.toUpperCase() + '\n' +
        'Metrics: Flesch-Kincaid Grade=' + fk + ', LIX=' + lix + ', MATTR=' + mattr + '\n' +
        'Top Characters: ' + topChars + '\n' +
        'Top Themes: ' + topThemes + '\n\n' +
        'Provide a 4-bullet distant-reading synthesis based strictly on the data above.';

      const result = await global.SlmService.generateText({
        systemPrompt: sysPrompt,
        userPrompt: prompt,
        temperature: 0.15,
        topK: 20,
        repetitionPenalty: 1.15,
        maxNewTokens: 280,
        onToken: (_tok, partial) => {
          if (outEl && partial) outEl.textContent = partial;
        }
      });

      const finalText = (result && result.text) ? result.text.trim() : '';
      state.aiSummaryText = finalText;
      if (outEl) outEl.textContent = finalText || _t('drAiNoOutput', 'No response generated.');
    } catch (err) {
      if (outEl) outEl.textContent = (err && err.message) ? err.message : 'Local AI generation failed.';
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ================================================================
  // REPORT EXPORT (HTML / MD with export-standards)
  // ================================================================

  async function exportReport(format) {
    if (!state.rawText || !state.rawText.trim()) {
      _toast(_t('charNetNoBookError', 'Please select or load a novel first.'), true);
      return;
    }
    if (!state.stylistics && global.DistantReadingStylistics) {
      state.stylistics = await global.DistantReadingStylistics.analyze(state.rawText, { lang: state.lang });
    }
    if (!state.themes && global.DistantReadingThemes) {
      await runThemes();
    }
    if (!state.collocations && global.DistantReadingCollocations) {
      await runCollocations();
    }

    const title = state.bookLabel || 'Distant-Reading-Report';
    const safeName = title.replace(/[\/\\?*:|"<>]/g, '-');
    const ext = format === 'md' ? 'md' : 'html';
    const filename = safeName + '-distant-reading.' + ext;
    const r = state.stylistics ? state.stylistics.readability : {};
    const lex = state.stylistics ? state.stylistics.lexical : {};
    const syn = state.stylistics ? state.stylistics.syntax : {};

    const metricRows = [
      { name: _t('drKincaidGrade', 'Flesch-Kincaid Grade'), val: r.fleschKincaidGrade || 0, tip: _t('drTipKincaid', 'Estimated US school grade level (e.g. 8 = 8th grade). Higher = more complex syntax and longer words.') },
      { name: _t('drFleschEase', 'Flesch Reading Ease'), val: r.fleschReadingEase || 0, tip: _t('drTipFleschEase', '0-100 scale where higher means easier to read (60-70 = plain/standard, <30 = academic/dense).') },
      { name: _t('drLixScore', 'LIX (Multi-Lang)'), val: r.lix || 0, tip: _t('drTipLix', 'Language-agnostic readability index (EN/FR/DE/IT): <25 very easy, 35-45 standard fiction, >55 complex prose.') },
      { name: _t('drGunningFog', 'Gunning Fog'), val: r.gunningFog || 0, tip: _t('drTipGunningFog', 'Years of formal education needed to understand the text on first reading, weighted by 3+ syllable words.') },
      { name: _t('drMattrScore', 'MATTR (Lexical Div.)'), val: lex.mattr || 0, tip: _t('drTipMattr', 'Moving-Average Type-Token Ratio (500-word window). Measures vocabulary richness independent of text length (0-1).') },
      { name: _t('drHapaxPct', 'Hapax Legomena'), val: (lex.hapaxRatio || 0) + '%', tip: _t('drTipHapax', 'Percentage of unique words that appear only once in the entire text. Higher = more varied or specialized diction.') },
      { name: _t('drDialoguePct', 'Dialogue Ratio'), val: (syn.dialogueRatio || 0) + '%', tip: _t('drTipDialogue', 'Estimated share of text inside quotation marks or dialogue dashes vs. narrative prose.') },
      { name: _t('drAvgSentLen', 'Avg Sentence (words)'), val: (r.avgSentenceLength || 0) + ' (sigma ' + (syn.stdDevSentenceLength || 0) + ')', tip: _t('drTipAvgSent', 'Mean words per sentence and standard deviation (sigma). High sigma indicates strong rhythmic variety.') }
    ];

    const tipTheme = _t('drTipSemanticFields', 'Hits across curated literary word fields and normalized rate per 10,000 words.');
    const tipPmi = _t('drTipPmi', 'Pointwise Mutual Information: measures how strongly two words attract each other compared to chance.');
    const tipG2 = _t('drTipG2', 'Dunning Log-Likelihood (G2): statistical significance of the collocation across the corpus.');
    const tipFreq = _t('drTipFreq', 'Total number of times the phrase appears in the text.');

    let content = '';
    if (ext === 'md') {
      content = '# Distant Reading Report: ' + title + '\n\n' +
        '## Stylistics & Readability\n' +
        metricRows.map(m => '- **' + m.name + '**: ' + m.val + ' — _' + m.tip + '_').join('\n') + '\n\n' +
        '## Top Themes\n' +
        '> ' + tipTheme + '\n\n' +
        ((state.themes && state.themes.fields) || []).slice(0, 6).map(f => '- **' + f.label + '**: ' + f.hits + ' hits (' + f.per10k + ' per 10k words)').join('\n') + '\n\n' +
        '## Top Collocations\n' +
        '> Freq = ' + tipFreq + ' | PMI = ' + tipPmi + ' | G2 = ' + tipG2 + '\n\n' +
        ((state.collocations && state.collocations.bigrams) || []).slice(0, 12).map(b => '- **' + b.phrase + '** (Freq: ' + b.count + ', PMI: ' + b.pmi + ', G2: ' + b.g2 + ')').join('\n') +
        (state.aiSummaryText ? ('\n\n## Local AI Synthesis\n' + state.aiSummaryText) : '');
    } else {
      content = '<!DOCTYPE html><html lang="' + _esc(state.lang) + '"><head><meta charset="UTF-8"><title>' +
        _esc(title) + ' — Distant Reading</title><style>' +
        'body{font-family:Lexend,Segoe UI,Arial,sans-serif;background:#f5f5f0;color:#111;max-width:960px;margin:28px auto;padding:0 16px;}' +
        '.dr-rep-card{background:#fff;border:2px solid #333;border-radius:10px;box-shadow:4px 4px 0 #555;padding:18px;margin-bottom:16px;}' +
        '.dr-rep-table{width:100%;border-collapse:collapse;} .dr-rep-table th,.dr-rep-table td{border:1.5px solid #333;padding:7px 10px;text-align:left;vertical-align:top;}' +
        '.dr-rep-table th{background:#f0f0eb;} .dr-rep-explain{color:#444;font-size:0.86rem;}' +
        '.dr-tip{position:relative;cursor:help;border-bottom:1.5px dotted #555;}' +
        '.dr-tip:hover::after{content:attr(data-tip);position:absolute;left:0;bottom:calc(100% + 6px);background:#222;color:#fff;border:2px solid #111;border-radius:6px;box-shadow:3px 3px 0 #555;padding:7px 10px;font-size:0.78rem;line-height:1.4;width:max-content;max-width:280px;white-space:normal;z-index:99;pointer-events:none;}' +
        '</style></head><body>' +
        '<div class="dr-rep-card"><h1>Distant Reading Report: ' + _esc(title) + '</h1><p>Language: ' + _esc(state.lang.toUpperCase()) + '</p></div>' +
        '<div class="dr-rep-card"><h2>Stylistics &amp; Readability</h2><table class="dr-rep-table"><tr><th>Metric</th><th>Value</th><th>' + _esc(_t('drExplanationCol', 'Explanation')) + '</th></tr>' +
        metricRows.map(m => '<tr><td><span class="dr-tip" data-tip="' + _esc(m.tip) + '">' + _esc(m.name) + '</span></td><td><b>' + _esc(m.val) + '</b></td><td class="dr-rep-explain">' + _esc(m.tip) + '</td></tr>').join('') +
        '</table></div>' +
        '<div class="dr-rep-card"><h2><span class="dr-tip" data-tip="' + _esc(tipTheme) + '">Top Themes</span></h2><table class="dr-rep-table"><tr><th>Theme</th><th>Hits</th><th>Per 10k Words</th></tr>' +
        ((state.themes && state.themes.fields) || []).slice(0, 6).map(f => '<tr><td><span class="dr-tip" data-tip="' + _esc(tipTheme) + '">' + _esc(f.label) + '</span></td><td>' + f.hits + '</td><td>' + f.per10k + '</td></tr>').join('') +
        '</table></div>' +
        '<div class="dr-rep-card"><h2>Top Collocations</h2><table class="dr-rep-table"><tr><th>Phrase</th><th><span class="dr-tip" data-tip="' + _esc(tipFreq) + '">Freq</span></th><th><span class="dr-tip" data-tip="' + _esc(tipPmi) + '">PMI</span></th><th><span class="dr-tip" data-tip="' + _esc(tipG2) + '">G2</span></th></tr>' +
        ((state.collocations && state.collocations.bigrams) || []).slice(0, 12).map(b => '<tr><td><b>' + _esc(b.phrase) + '</b></td><td>' + b.count + '</td><td>' + b.pmi + '</td><td>' + b.g2 + '</td></tr>').join('') +
        '</table></div>' +
        (state.aiSummaryText ? ('<div class="dr-rep-card"><h2>Local AI Synthesis</h2><p>' + _esc(state.aiSummaryText) + '</p></div>') : '') +
        '</body></html>';
    }

    if (global.saveExportWithDestination) {
      return await global.saveExportWithDestination({
        filename,
        toolKey: 'distantReading',
        mimeType: ext === 'md' ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8',
        allowDocEditor: true,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
        buildContent: () => content
      });
    }
    if (global.Desktop && global.Desktop.isElectron() && typeof global.Desktop.saveToDisk === 'function') {
      const res = await global.Desktop.saveToDisk({
        title: 'Export Distant Reading Report',
        defaultPath: filename,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
        content,
        encoding: 'utf8'
      });
      if (res && res.ok && typeof global.showExportSuccessPopup === 'function') {
        global.showExportSuccessPopup(res.path, filename);
      }
    } else {
      const blob = new Blob([content], { type: ext === 'md' ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }
  }

  function showExcerpts(edgeId) {
    const getEdgesFn = typeof global.conGetEdges === 'function' ? global.conGetEdges : () => [];
    const edge = getEdgesFn().find(e => e && e.id === edgeId);
    if (!edge || !Array.isArray(edge.excerpts) || edge.excerpts.length === 0) return;

    const overlay = document.getElementById('char-net-excerpts-overlay');
    const titleEl = document.getElementById('char-net-excerpts-title');
    const countEl = document.getElementById('char-net-excerpts-count');
    const listEl = document.getElementById('char-net-excerpts-list');

    const nameA = edge.charAName || 'Character A';
    const nameB = edge.charBName || 'Character B';
    if (titleEl) titleEl.textContent = nameA + ' / ' + nameB;
    if (countEl) {
      const tpl = _t('charNetExcerptCount', '{count} shared scene(s) found in novel text.');
      countEl.textContent = tpl.replace('{count}', edge.excerpts.length);
    }
    if (listEl && global.CharacterNetworkService) {
      listEl.innerHTML = '';
      const formatted = global.CharacterNetworkService.formatExcerpts(edge.excerpts, nameA, nameB);
      formatted.forEach(html => {
        const card = document.createElement('div');
        card.className = 'char-excerpt-card';
        card.innerHTML = html;
        listEl.appendChild(card);
      });
    }
    if (overlay) overlay.style.display = 'flex';
  }

  function closeExcerpts() {
    const overlay = document.getElementById('char-net-excerpts-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function openExcerptsFromActiveEdge() {
    if (global._conEdgeCtxId) {
      if (typeof global.conEdgeCtxClose === 'function') global.conEdgeCtxClose(false);
      showExcerpts(global._conEdgeCtxId);
    }
  }

  function _renderExamplesModal(title, countText, items) {
    const overlay = document.getElementById('char-net-excerpts-overlay');
    const titleEl = document.getElementById('char-net-excerpts-title');
    const countEl = document.getElementById('char-net-excerpts-count');
    const listEl = document.getElementById('char-net-excerpts-list');
    if (!overlay || !listEl) return;

    if (titleEl) titleEl.textContent = title;
    if (countEl) countEl.textContent = countText;
    listEl.innerHTML = '';

    if (!items || items.length === 0) {
      listEl.innerHTML = '<div class="dr-empty-hint">' + _t('drNoExamplesFound', 'No matching sentences found.') + '</div>';
    } else {
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'char-excerpt-card';
        let html = _esc(item.sentence || '');
        (item.highlights || []).forEach(hw => {
          const clean = String(hw || '').trim();
          if (!clean) return;
          const escRe = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const bound = /^\w/.test(clean) && /\w$/.test(clean) ? ('\\b' + escRe + '\\b') : escRe;
          html = html.replace(new RegExp('(' + bound + ')', 'gi'), '<mark class="char-mark-a">$1</mark>');
        });
        if (item.meta) {
          html = '<div style="font-size:0.7rem;font-weight:800;color:#555;margin-bottom:3px;">' + _esc(item.meta) + '</div>' + html;
        }
        card.innerHTML = html;
        listEl.appendChild(card);
      });
    }
    overlay.style.display = 'flex';
  }

  function showThemeExamples(themeId) {
    if (!state.rawText || !global.DistantReadingThemes) return;
    const allThemes = [...global.DistantReadingThemes.getBuiltInThemes(state.lang), ...state.customThemes];
    const theme = allThemes.find(t => t.id === themeId);
    if (!theme) return;
    const lbl = theme.labelKey ? _t(theme.labelKey, theme.label) : theme.label;
    const matches = global.DistantReadingThemes.findThemeSentences(state.rawText, theme.terms, 30);
    const items = matches.map(m => ({
      sentence: m.sentence,
      highlights: m.matchedTerms,
      meta: m.matchedTerms.join(', ')
    }));
    const tpl = _t('drExamplesCount', '{count} example sentence(s) from text.');
    _renderExamplesModal(lbl, tpl.replace('{count}', String(items.length)), items);
  }

  function showStatExamples(category, label, param = {}) {
    if (!state.rawText || !global.DistantReadingStylistics) return;
    const items = global.DistantReadingStylistics.findStatExamples(state.rawText, category, { ...param, lang: state.lang }, 25);
    const tpl = _t('drExamplesCount', '{count} example sentence(s) from text.');
    _renderExamplesModal(label || 'Examples', tpl.replace('{count}', String(items.length)), items);
  }

  // ================================================================
  // TAB 5: COMPARE BOOKS
  // ================================================================

  async function onCompareBookBChange() {
    const sel = document.getElementById('dr-compare-book-b-select');
    if (!sel || !sel.value) {
      state.compareTextB = '';
      state.compareBookBLabel = '';
      return;
    }
    if (sel.value === '__loaded_search_book__') {
      state.compareTextB = typeof global.searchBookText === 'string' ? global.searchBookText : '';
      state.compareBookBLabel = 'Current Book';
      return;
    }
    const availableBooks = Array.isArray(global.searchAvailableBooks) ? global.searchAvailableBooks : [];
    const match = availableBooks.find(b => b.id === sel.value || b.path === sel.value);
    if (!match) return;
    try {
      const target = match.target || (match.path.startsWith('books/') ? 'data' : 'customBooks');
      const text = await global.searchReadShortcutBook(match.path, target);
      if (!text) throw new Error('File produced no readable text.');
      state.compareTextB = text;
      state.compareBookBLabel = match.label || match.fileName;
      _toast((state.compareBookBLabel || 'Book B') + ' ready for comparison.', false);
    } catch (err) {
      _toast(err && err.message ? err.message : 'Failed to read comparison book', true);
    }
  }

  function handleCompareFileBUpload(fileInput) {
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      state.compareTextB = String(reader.result || '');
      state.compareBookBLabel = file.name;
      _toast(file.name + ' loaded as Book B.', false);
    };
    reader.readAsText(file);
  }

  async function runComparison() {
    if (!state.rawText || !state.rawText.trim()) {
      _toast(_t('charNetNoBookError', 'Please select or load a novel first.'), true);
      return;
    }
    if (!state.compareTextB || !state.compareTextB.trim()) {
      _toast(_t('drCompareNeedBookB', 'Select or upload Book B to compare.'), true);
      return;
    }
    if (!global.DistantReadingCompare) return;
    _setProgress(35, true);
    try {
      const res = await global.DistantReadingCompare.compareTexts(state.rawText, state.compareTextB, {
        customThemes: state.customThemes
      });
      state.compareResult = res;
      renderComparison(res);
    } finally {
      _setProgress(0, false);
    }
  }

  function renderComparison(res) {
    const wrap = document.getElementById('dr-compare-results');
    const tbody = document.getElementById('dr-compare-stylistics-tbody');
    const arcEl = document.getElementById('dr-compare-arc-svg');
    const vocabSumEl = document.getElementById('dr-compare-vocab-summary');
    const distEl = document.getElementById('dr-compare-distinctive');
    const themesEl = document.getElementById('dr-compare-themes-list');
    if (!wrap || !res) return;

    wrap.style.display = 'flex';
    const nameA = state.bookLabel || 'Book A';
    const nameB = state.compareBookBLabel || 'Book B';
    const thA = document.getElementById('dr-cmp-th-a');
    const thB = document.getElementById('dr-cmp-th-b');
    if (thA) thA.textContent = nameA.slice(0, 18);
    if (thB) thB.textContent = nameB.slice(0, 18);

    const sA = res.stylisticsA;
    const sB = res.stylisticsB;
    const rows = [
      { label: _t('drWordsLabel', 'Words'), a: sA.readability.wordCount, b: sB.readability.wordCount, dec: 0 },
      { label: _t('drKincaidGrade', 'Flesch-Kincaid Grade'), a: sA.readability.fleschKincaidGrade, b: sB.readability.fleschKincaidGrade, dec: 1 },
      { label: _t('drFleschEase', 'Flesch Reading Ease'), a: sA.readability.fleschReadingEase, b: sB.readability.fleschReadingEase, dec: 1 },
      { label: _t('drLixScore', 'LIX (Multi-Lang)'), a: sA.readability.lix, b: sB.readability.lix, dec: 1 },
      { label: _t('drGunningFog', 'Gunning Fog'), a: sA.readability.gunningFog, b: sB.readability.gunningFog, dec: 1 },
      { label: _t('drMattrScore', 'MATTR (Lexical Div.)'), a: sA.lexical.mattr, b: sB.lexical.mattr, dec: 3 },
      { label: _t('drHapaxPct', 'Hapax Legomena %'), a: sA.lexical.hapaxRatio, b: sB.lexical.hapaxRatio, dec: 1 },
      { label: _t('drDialoguePct', 'Dialogue Ratio %'), a: sA.syntax.dialogueRatio, b: sB.syntax.dialogueRatio, dec: 1 },
      { label: _t('drAvgSentLen', 'Avg Sentence (words)'), a: sA.readability.avgSentenceLength, b: sB.readability.avgSentenceLength, dec: 1 }
    ];

    if (tbody) {
      tbody.innerHTML = rows.map(r => {
        const diff = r.b - r.a;
        const factor = Math.pow(10, r.dec);
        const dFmt = Math.round(diff * factor) / factor;
        const sign = dFmt > 0 ? '+' : '';
        const cls = dFmt > 0 ? 'dr-cmp-delta-pos' : (dFmt < 0 ? 'dr-cmp-delta-neg' : '');
        return '<tr><td><b>' + _esc(r.label) + '</b></td>' +
          '<td style="text-align:center;">' + _esc(r.a) + '</td>' +
          '<td style="text-align:center;">' + _esc(r.b) + '</td>' +
          '<td style="text-align:center;" class="' + cls + '">' + sign + dFmt + '</td></tr>';
      }).join('');
    }

    if (arcEl) {
      const aA = res.arcA || [];
      const aB = res.arcB || [];
      if (aA.length < 2 || aB.length < 2) {
        arcEl.innerHTML = '<div class="dr-empty-hint">' + _t('drNotEnoughSegments', 'Text too short for dual arc.') + '</div>';
      } else {
        const w = 380, h = 120, midY = h / 2, pad = 16;
        const maxAbs = Math.max(5, ...aA.map(x => Math.abs(x.netValence)), ...aB.map(x => Math.abs(x.netValence)));
        const toPts = arr => arr.map((a, i) => {
          const x = Math.round(pad + (i / (arr.length - 1)) * (w - pad * 2));
          const y = Math.round(midY - (a.netValence / maxAbs) * (midY - pad));
          return x + ',' + y;
        }).join(' ');
        arcEl.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="dr-svg-chart">` +
          `<line x1="${pad}" y1="${midY}" x2="${w - pad}" y2="${midY}" stroke="#bbb" stroke-dasharray="3 3" />` +
          `<polyline fill="none" stroke="#5b8fcc" stroke-width="2.5" points="${toPts(aA)}" />` +
          `<polyline fill="none" stroke="#c96b6b" stroke-width="2.5" stroke-dasharray="5 3" points="${toPts(aB)}" /></svg>`;
      }
    }

    if (vocabSumEl) {
      vocabSumEl.textContent = _t('drCompareJaccardLabel', 'Vocabulary Overlap (Jaccard):') + ' ' +
        res.vocab.jaccardPct + '% (' + res.vocab.sharedVocabCount + ' ' + _t('drCompareSharedWords', 'shared content words') + ')';
    }

    if (distEl) {
      const chipsA = (res.vocab.distinctiveA || []).slice(0, 8).map(d => '<span class="dr-chip-btn">' + _esc(d.term) + '</span>').join('');
      const chipsB = (res.vocab.distinctiveB || []).slice(0, 8).map(d => '<span class="dr-chip-btn">' + _esc(d.term) + '</span>').join('');
      distEl.innerHTML =
        '<div><div style="font-size:0.72rem; font-weight:800; color:#5b8fcc; margin-bottom:4px;">' + _esc(nameA) + '</div><div class="dr-chip-wrap">' + (chipsA || '--') + '</div></div>' +
        '<div><div style="font-size:0.72rem; font-weight:800; color:#c96b6b; margin-bottom:4px;">' + _esc(nameB) + '</div><div class="dr-chip-wrap">' + (chipsB || '--') + '</div></div>';
    }

    if (themesEl) {
      themesEl.innerHTML = (res.themeComparison || []).map(t => {
        const lbl = t.labelKey ? _t(t.labelKey, t.label) : t.label;
        const sign = t.delta > 0 ? '+' : '';
        return '<div class="dr-kpi-card" style="padding:8px 10px;">' +
          '<div class="dr-kpi-label">' + _esc(lbl) + '</div>' +
          '<div style="font-size:0.82rem; font-weight:800; margin-top:3px;">A: ' + t.per10kA + ' | B: ' + t.per10kB + ' <span style="color:#555;">(' + sign + t.delta + ')</span></div>' +
        '</div>';
      }).join('');
    }
  }

  function projectComparisonToBoard() {
    if (!state.compareResult) {
      _toast(_t('drRunAnalysisFirst', 'Run the comparison first.'), true);
      return;
    }
    const targetLoc = (document.getElementById('dr-projection-target') || {}).value || 'current';
    closeModal();
    _prepareBoardTarget(targetLoc);

    const res = state.compareResult;
    const sA = res.stylisticsA;
    const sB = res.stylisticsB;
    const { offsetX, offsetY } = _getTargetOrigin();

    if (typeof global.conAddTableFromData === 'function') {
      global.conAddTableFromData({
        x: offsetX + 40,
        y: offsetY + 40,
        rows: [
          [_t('drMetricCol', 'Metric'), state.bookLabel || 'Book A', state.compareBookBLabel || 'Book B'],
          ['Flesch-Kincaid Grade', String(sA.readability.fleschKincaidGrade), String(sB.readability.fleschKincaidGrade)],
          ['LIX (Multi-Lang)', String(sA.readability.lix), String(sB.readability.lix)],
          ['MATTR (Lexical Div.)', String(sA.lexical.mattr), String(sB.lexical.mattr)],
          ['Dialogue Ratio %', sA.syntax.dialogueRatio + '%', sB.syntax.dialogueRatio + '%'],
          ['Vocab Overlap (Jaccard)', res.vocab.jaccardPct + '%', res.vocab.sharedVocabCount + ' words']
        ]
      });
      _toast(_t('drProjectedBoardToast', 'Comparison table projected onto Board.'), false);
    }
  }

  function onLangChange(langVal) {
    state.langOverride = langVal || 'auto';
    _resetCachedAnalyses();
    _updateCorpusStats();
    if (state.rawText && state.rawText.trim()) {
      if (state.activeTab === 'stylistics') runStylistics();
      else if (state.activeTab === 'themes') runThemes();
      else if (state.activeTab === 'collocations') runCollocations();
      else if (state.activeTab === 'compare' && state.compareTextB) runComparison();
    }
  }

  const DistantReadingUI = {
    openModal,
    closeModal,
    setActiveTab,
    onBookChange,
    onLangChange,
    togglePasteDrawer,
    applyPastedText,
    loadBoardNotesAsText,
    handleFileUpload,
    scanCharacters,
    renderCharactersTable,
    mergeSelectedCharacters,
    toggleAllCharacters,
    addCustomCharacter,
    generateCharacterNetwork,
    runStylistics,
    projectStylisticsToBoard,
    runThemes,
    addCustomTheme,
    projectThemesToBoard,
    runCollocations,
    runKwicSearch,
    projectCollocationsToBoard,
    onCompareBookBChange,
    handleCompareFileBUpload,
    runComparison,
    projectComparisonToBoard,
    runAiSummary,
    exportReport,
    showExcerpts,
    closeExcerpts,
    openExcerptsFromActiveEdge,
    showThemeExamples,
    showStatExamples
  };

  global.DistantReadingUI = DistantReadingUI;

  // Backward-compatible global aliases
  global.characterNetworkOpenModal = openModal;
  global.characterNetworkCloseModal = closeModal;
  global.characterNetworkOnBookChange = onBookChange;
  global.characterNetworkScanText = scanCharacters;
  global.characterNetworkRenderTable = renderCharactersTable;
  global.characterNetworkMergeSelected = mergeSelectedCharacters;
  global.characterNetworkToggleAll = toggleAllCharacters;
  global.characterNetworkAddCustomChar = addCustomCharacter;
  global.characterNetworkGenerate = generateCharacterNetwork;
  global.characterNetworkShowExcerpts = showExcerpts;
  global.characterNetworkCloseExcerpts = closeExcerpts;
  global.characterNetworkOpenExcerptsFromActiveEdge = openExcerptsFromActiveEdge;
})(typeof window !== 'undefined' ? window : globalThis);
