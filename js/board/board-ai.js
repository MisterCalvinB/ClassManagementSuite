/**
 * Class Management Tools — Board AI Studio (Mind Mapping & Textual Analysis)
 * Powered by local offline Small Language Models via window.SlmService (transformers.js).
 */
(function (global) {
  'use strict';

  var Board = global.Board = global.Board || {};

  var _popoverEl = null;
  var _activeTab = 'expand'; // 'expand' | 'write'
  var _expandPreset = 'related'; // 'related' | 'lexical' | 'extract' | 'bridge'
  var _nodeCount = 4;
  var _writePreset = 'sentences'; // 'sentences' | 'paragraph' | 'gapfill' | 'questions' | 'analysis'
  var _cefrLevel = 'B1';
  var _targetMode = 'new_note'; // 'new_note' | 'append_note'
  var _groundInText = true;
  var _isGenerating = false;
  var _contextOverride = null; // { nodeId?, noteId?, boardX?, boardY?, initialTab?, initialPreset? }

  function _t(key, fallback) {
    if (typeof window !== 'undefined' && window.i18n && typeof window.i18n.t === 'function') {
      var val = window.i18n.t(key);
      if (val && val !== key) return val;
    }
    if (typeof window !== 'undefined' && typeof window.t === 'function') {
      var val2 = window.t(key);
      if (val2 && val2 !== key) return val2;
    }
    return fallback || key;
  }

  function _escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _stripHtml(html) {
    if (!html) return '';
    var tmp = document.createElement('div');
    tmp.innerHTML = String(html);
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function _formatNoteHtml(rawText) {
    var escaped = _escapeHtml(String(rawText || '').trim());
    // Convert **bold** and *italic* into clean HTML tags
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    escaped = escaped.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, '$1<i>$2</i>');
    return escaped.replace(/\r?\n/g, '<br>');
  }

  /**
   * Dismiss competing board context menus and popups (board-bug-auditor compliance)
   */
  function _dismissCompetingMenus() {
    if (typeof window.conCtxClose === 'function') window.conCtxClose();
    if (typeof window.conBoardCtxClose === 'function') window.conBoardCtxClose();
    if (typeof window.wnStyleDismiss === 'function') window.wnStyleDismiss();
    if (typeof window.conGroupCtxClose === 'function') window.conGroupCtxClose();
    if (typeof window.conDrawingCtxClose === 'function') window.conDrawingCtxClose();
    if (typeof window.conShapeCtxClose === 'function') window.conShapeCtxClose();
    if (typeof window.conCloseNodeWordCard === 'function') window.conCloseNodeWordCard();
  }

  /**
   * Detect if a literary/reference text is currently loaded in Text Analysis or Book Search
   */
  function _getLoadedReferenceText() {
    var chunks = [];
    var sourceLabel = '';

    // 1. Check Text Analysis lines (taGetLines) or textarea (#ta-paste-area)
    try {
      var taArea = document.getElementById('ta-paste-area');
      if (taArea && taArea.value && taArea.value.trim().length > 20) {
        chunks.push(taArea.value.trim());
        sourceLabel = _t('boardAiSourceTextAnalysis', 'Text Analysis');
      } else if (typeof window.taGetLines === 'function') {
        var lines = window.taGetLines();
        if (Array.isArray(lines) && lines.length > 0) {
          var joined = lines.map(function (line) {
            return Array.isArray(line) ? line.map(function (tok) { return tok && tok.text ? tok.text : ''; }).join(' ') : '';
          }).filter(Boolean).join('\n');
          if (joined.trim().length > 20) {
            chunks.push(joined.trim());
            sourceLabel = _t('boardAiSourceTextAnalysis', 'Text Analysis');
          }
        }
      }
    } catch (_) {}

    // 2. Check Book Search text (searchBookText)
    try {
      var bookTxt = (typeof window.searchBookText === 'string' && window.searchBookText)
        ? window.searchBookText
        : (typeof searchBookText === 'string' ? searchBookText : '');
      if (bookTxt && bookTxt.trim().length > 20) {
        chunks.push(bookTxt.trim());
        var bookNameEl = document.getElementById('search-book-filename');
        var bookName = bookNameEl ? bookNameEl.textContent.trim() : '';
        sourceLabel = sourceLabel
          ? (sourceLabel + ' + ' + (bookName || _t('boardAiSourceBook', 'Loaded Book')))
          : (bookName || _t('boardAiSourceBook', 'Loaded Book'));
      }
    } catch (_) {}

    return {
      hasText: chunks.length > 0,
      fullText: chunks.join('\n\n'),
      sourceLabel: sourceLabel
    };
  }

  /**
   * Extract top relevant excerpts (~600 chars max) from loaded text matching keywords
   */
  function _extractRelevantExcerpts(fullText, keywords, maxChars) {
    maxChars = maxChars || 650;
    if (!fullText || !fullText.trim()) return '';
    var paras = fullText
      .split(/\r?\n\s*\r?\n|\r?\n/)
      .map(function (p) { return p.trim(); })
      .filter(function (p) { return p.length > 25; });

    if (paras.length === 0) return fullText.slice(0, maxChars);

    var cleanKeys = (Array.isArray(keywords) ? keywords : [])
      .map(function (k) { return String(k || '').toLowerCase().trim(); })
      .filter(function (k) { return k.length >= 3; });

    if (cleanKeys.length === 0) {
      return paras.slice(0, 3).join('\n...\n').slice(0, maxChars);
    }

    var scored = paras.map(function (p, idx) {
      var lower = p.toLowerCase();
      var score = 0;
      cleanKeys.forEach(function (kw) {
        if (lower.includes(kw)) score += 3;
        kw.split(/\s+/).forEach(function (part) {
          if (part.length >= 3 && lower.includes(part)) score += 1;
        });
      });
      return { text: p, score: score, idx: idx };
    });

    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.idx - b.idx;
    });

    var picked = [];
    var total = 0;
    for (var i = 0; i < scored.length && picked.length < 3; i++) {
      var snippet = scored[i].text;
      if (snippet.length > 260) snippet = snippet.slice(0, 257) + '...';
      if (total + snippet.length > maxChars && picked.length > 0) break;
      picked.push(snippet);
      total += snippet.length;
    }

    return picked.join('\n---\n');
  }

  /**
   * Resolve currently selected or targeted nodes & notes on the Constellation board
   */
  function boardAiResolveSelection(override) {
    var ov = override || _contextOverride || {};
    var allNodes = (typeof window.conGetNodes === 'function' ? window.conGetNodes() : (window.conNodes || [])) || [];
    var allNotes = (typeof window.conGetNotes === 'function' ? window.conGetNotes() : (window.conNotes || [])) || [];
    var allEdges = (typeof window.conGetEdges === 'function' ? window.conGetEdges() : (window.conEdges || [])) || [];

    var selectedNodes = [];
    var selectedNotes = [];

    if (ov.nodeId) {
      var targetNode = allNodes.find(function (n) { return String(n.id) === String(ov.nodeId); });
      if (targetNode) selectedNodes.push(targetNode);
    }
    if (ov.noteId) {
      var targetNote = allNotes.find(function (n) { return String(n.id) === String(ov.noteId); });
      if (targetNote) selectedNotes.push(targetNote);
    }

    if (selectedNodes.length === 0 && selectedNotes.length === 0) {
      // 1. Collect selected nodes from board state
      if (typeof window.conGetSelectedNodes === 'function') {
        selectedNodes = window.conGetSelectedNodes().filter(Boolean);
      } else if (window.conMultiSelected && window.conMultiSelected.size > 0) {
        selectedNodes = allNodes.filter(function (n) { return window.conMultiSelected.has(n.id); });
      } else {
        var selId = (typeof window.conGetSelected === 'function' && window.conGetSelected())
          || (typeof window.conGetCtxNodeId === 'function' && window.conGetCtxNodeId())
          || window.conSelected;
        if (selId) {
          var foundNode = allNodes.find(function (n) { return String(n.id) === String(selId); });
          if (foundNode) selectedNodes.push(foundNode);
        }
      }

      // 2. Collect selected notes from board state
      var noteIdSet = new Set();
      if (window.conNoteSelected && window.conNoteSelected.size > 0) {
        window.conNoteSelected.forEach(function (id) { noteIdSet.add(String(id)); });
      }
      if (window._wnActiveNote && window._wnActiveNote.id) {
        noteIdSet.add(String(window._wnActiveNote.id));
      }
      if (window._conNoteCtxData && window._conNoteCtxData.id) {
        noteIdSet.add(String(window._conNoteCtxData.id));
      }

      // Also include notes directly attached to selected nodes via nodeId or edge
      selectedNodes.forEach(function (node) {
        allNotes.forEach(function (nt) {
          if (nt.nodeId && String(nt.nodeId) === String(node.id)) {
            noteIdSet.add(String(nt.id));
          }
        });
      });

      selectedNotes = allNotes.filter(function (nt) { return noteIdSet.has(String(nt.id)); });
    }

    // Collect edges between selected items
    var itemIds = new Set(
      selectedNodes.map(function (n) { return String(n.id); })
        .concat(selectedNotes.map(function (nt) { return String(nt.id); }))
    );

    var connectedEdges = allEdges.filter(function (e) {
      return itemIds.has(String(e.a)) && itemIds.has(String(e.b));
    });

    // Compute anchor coordinates (center of selection or board viewport center)
    var anchorX = typeof ov.boardX === 'number' ? ov.boardX : null;
    var anchorY = typeof ov.boardY === 'number' ? ov.boardY : null;

    if (anchorX === null || anchorY === null) {
      var pts = [];
      selectedNodes.forEach(function (n) {
        var nw = (n.el && n.el.offsetWidth) || n.w || 90;
        var nh = (n.el && n.el.offsetHeight) || n.h || 34;
        pts.push({ x: (Number(n.x) || 0) + nw / 2, y: (Number(n.y) || 0) + nh / 2 });
      });
      selectedNotes.forEach(function (nt) {
        var ntw = Number(nt.width) || Number(nt.liveBaseWidth) || 180;
        var nth = Number(nt.height) || Number(nt.liveBaseHeight) || 90;
        pts.push({ x: (Number(nt.x) || 0) + ntw / 2, y: (Number(nt.y) || 0) + nth / 2 });
      });
      if (pts.length > 0) {
        anchorX = Math.round(pts.reduce(function (s, p) { return s + p.x; }, 0) / pts.length);
        anchorY = Math.round(pts.reduce(function (s, p) { return s + p.y; }, 0) / pts.length);
      } else {
        var brd = document.getElementById('constellation-board');
        var cw = (brd && brd.clientWidth) ? brd.clientWidth : 900;
        var ch = (brd && brd.clientHeight) ? brd.clientHeight : 520;
        var sx = (brd && brd.scrollLeft) ? brd.scrollLeft : 0;
        var sy = (brd && brd.scrollTop) ? brd.scrollTop : 0;
        anchorX = Math.round(sx + cw / 2);
        anchorY = Math.round(sy + Math.min(280, ch / 2));
      }
    }

    return {
      nodes: selectedNodes,
      notes: selectedNotes,
      edges: connectedEdges,
      anchorX: anchorX,
      anchorY: anchorY
    };
  }

  /**
   * Build the Compact Light Neobrutalist AI Studio Popover once and reuse it in-place
   */
  function _ensurePopoverDom() {
    if (_popoverEl && document.body.contains(_popoverEl)) return _popoverEl;

    if (!document.getElementById('board-ai-popover-styles')) {
      var style = document.createElement('style');
      style.id = 'board-ai-popover-styles';
      style.textContent = [
        '#board-ai-popover {',
        '  position: fixed;',
        '  z-index: 10050;',
        '  width: 390px;',
        '  max-width: calc(100vw - 24px);',
        '  background: #f5f5f0;',
        '  border: 2px solid #333333;',
        '  border-radius: 10px;',
        '  box-shadow: 4px 4px 0 #555555;',
        '  font-family: "Lexend", "Segoe UI", sans-serif;',
        '  color: #1e1e1e;',
        '  display: none;',
        '  flex-direction: column;',
        '  overflow: hidden;',
        '}',
        '#board-ai-popover.visible { display: flex; }',
        '.bai-header {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  gap: 8px;',
        '  padding: 10px 12px;',
        '  background: #ffffff;',
        '  border-bottom: 2px solid #333333;',
        '}',
        '.bai-title-wrap {',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 7px;',
        '  font-weight: 800;',
        '  font-size: 0.92rem;',
        '  color: #1e1e1e;',
        '}',
        '.bai-title-icon {',
        '  width: 24px;',
        '  height: 24px;',
        '  background: #e2c96e;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 6px;',
        '  box-shadow: 1.5px 1.5px 0 #555555;',
        '  display: inline-flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '}',
        '.bai-title-icon img { width: 14px; height: 14px; }',
        '.bai-model-chip {',
        '  display: inline-flex;',
        '  align-items: center;',
        '  gap: 4px;',
        '  padding: 3px 8px;',
        '  font-size: 0.7rem;',
        '  font-weight: 700;',
        '  background: #eaeae4;',
        '  color: #1e1e1e;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 4px;',
        '  box-shadow: 1.5px 1.5px 0 #555555;',
        '  cursor: pointer;',
        '  font-family: inherit;',
        '}',
        '.bai-model-chip:hover { background: #e2c96e; }',
        '.bai-close-btn {',
        '  width: 26px;',
        '  height: 26px;',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 6px;',
        '  box-shadow: 1.5px 1.5px 0 #555555;',
        '  display: inline-flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  cursor: pointer;',
        '}',
        '.bai-close-btn:hover { background: #f0ede6; }',
        '.bai-context-bar {',
        '  padding: 8px 12px;',
        '  background: #eaeae4;',
        '  border-bottom: 1.5px solid #333333;',
        '  display: flex;',
        '  flex-direction: column;',
        '  gap: 6px;',
        '}',
        '.bai-context-summary {',
        '  font-size: 0.75rem;',
        '  font-weight: 700;',
        '  color: #333333;',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  gap: 6px;',
        '}',
        '.bai-context-pills {',
        '  display: flex;',
        '  flex-wrap: wrap;',
        '  gap: 4px;',
        '  max-height: 48px;',
        '  overflow-y: auto;',
        '}',
        '.bai-ctx-pill {',
        '  font-size: 0.68rem;',
        '  font-weight: 700;',
        '  padding: 2px 7px;',
        '  border-radius: 4px;',
        '  border: 1.5px solid #333333;',
        '  background: #ffffff;',
        '  max-width: 165px;',
        '  white-space: nowrap;',
        '  overflow: hidden;',
        '  text-overflow: ellipsis;',
        '}',
        '.bai-ctx-pill.is-note { background: #fef9c3; }',
        '.bai-tabs {',
        '  display: grid;',
        '  grid-template-columns: 1fr 1fr;',
        '  background: #eaeae4;',
        '  border-bottom: 2px solid #333333;',
        '}',
        '.bai-tab-btn {',
        '  padding: 8px 10px;',
        '  font-family: inherit;',
        '  font-size: 0.76rem;',
        '  font-weight: 800;',
        '  border: none;',
        '  background: transparent;',
        '  color: #555555;',
        '  cursor: pointer;',
        '  display: inline-flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  gap: 5px;',
        '}',
        '.bai-tab-btn:first-child { border-right: 1.5px solid #333333; }',
        '.bai-tab-btn.active {',
        '  background: #ffffff;',
        '  color: #1e1e1e;',
        '  box-shadow: inset 0 -3px 0 #5b8fcc;',
        '}',
        '.bai-body {',
        '  padding: 12px;',
        '  display: flex;',
        '  flex-direction: column;',
        '  gap: 10px;',
        '}',
        '.bai-field-label {',
        '  font-size: 0.68rem;',
        '  font-weight: 800;',
        '  text-transform: uppercase;',
        '  letter-spacing: 0.04em;',
        '  color: #555555;',
        '  margin-bottom: 4px;',
        '}',
        '.bai-preset-grid {',
        '  display: grid;',
        '  grid-template-columns: 1fr 1fr;',
        '  gap: 6px;',
        '}',
        '.bai-preset-btn {',
        '  padding: 7px 8px;',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 6px;',
        '  box-shadow: 2px 2px 0 #555555;',
        '  font-family: inherit;',
        '  font-size: 0.73rem;',
        '  font-weight: 700;',
        '  color: #1e1e1e;',
        '  text-align: left;',
        '  cursor: pointer;',
        '  transition: transform 0.1s ease;',
        '}',
        '.bai-preset-btn:hover { transform: translate(-1px, -1px); }',
        '.bai-preset-btn.active {',
        '  background: #e2c96e;',
        '  border-width: 2px;',
        '}',
        '.bai-pill-row {',
        '  display: flex;',
        '  gap: 5px;',
        '  flex-wrap: wrap;',
        '}',
        '.bai-opt-pill {',
        '  flex: 1;',
        '  min-width: 38px;',
        '  padding: 5px 8px;',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 6px;',
        '  box-shadow: 1.5px 1.5px 0 #555555;',
        '  font-family: inherit;',
        '  font-size: 0.73rem;',
        '  font-weight: 800;',
        '  color: #1e1e1e;',
        '  text-align: center;',
        '  cursor: pointer;',
        '}',
        '.bai-opt-pill.active {',
        '  background: #5b8fcc;',
        '  color: #ffffff;',
        '}',
        '.bai-opt-pill:disabled {',
        '  opacity: 0.45;',
        '  cursor: not-allowed;',
        '}',
        '.bai-input {',
        '  width: 100%;',
        '  box-sizing: border-box;',
        '  padding: 7px 9px;',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 6px;',
        '  font-family: inherit;',
        '  font-size: 0.78rem;',
        '  color: #1e1e1e;',
        '}',
        '.bai-input:focus { outline: none; border-color: #5b8fcc; box-shadow: 2px 2px 0 #5b8fcc; }',
        '.bai-ground-row {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  gap: 8px;',
        '  padding: 6px 9px;',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 6px;',
        '  font-size: 0.72rem;',
        '  font-weight: 700;',
        '}',
        '.bai-footer {',
        '  padding: 10px 12px;',
        '  background: #ffffff;',
        '  border-top: 2px solid #333333;',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  gap: 8px;',
        '}',
        '.bai-status-text {',
        '  font-size: 0.72rem;',
        '  font-weight: 700;',
        '  color: #555555;',
        '  flex: 1;',
        '  white-space: nowrap;',
        '  overflow: hidden;',
        '  text-overflow: ellipsis;',
        '}',
        '.bai-btn {',
        '  display: inline-flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  gap: 5px;',
        '  padding: 7px 13px;',
        '  font-family: inherit;',
        '  font-size: 0.78rem;',
        '  font-weight: 800;',
        '  border: 2px solid #333333;',
        '  border-radius: 6px;',
        '  box-shadow: 2px 2px 0 #555555;',
        '  cursor: pointer;',
        '  background: #ffffff;',
        '  color: #1e1e1e;',
        '}',
        '.bai-btn-primary { background: #e2c96e; }',
        '.bai-btn-danger { background: #c96b6b; color: #ffffff; }',
        '.wn-ai-stop-btn {',
        '  position: absolute;',
        '  top: -28px;',
        '  right: 0;',
        '  z-index: 30;',
        '  padding: 3px 9px;',
        '  background: #c96b6b;',
        '  color: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 4px;',
        '  box-shadow: 2px 2px 0 #333333;',
        '  font-family: "Lexend", sans-serif;',
        '  font-size: 0.68rem;',
        '  font-weight: 800;',
        '  cursor: pointer;',
        '}'
      ].join('\n');
      document.head.appendChild(style);
    }

    var pop = document.createElement('div');
    pop.id = 'board-ai-popover';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', _t('boardAiStudioTitle', 'AI Studio'));
    pop.innerHTML = [
      '<div class="bai-header">',
      '  <div class="bai-title-wrap">',
      '    <span class="bai-title-icon"><img src="../assets/icons/sparkles.svg" alt="" /></span>',
      '    <span id="bai-header-title">' + _escapeHtml(_t('boardAiStudioTitle', 'AI Studio')) + '</span>',
      '  </div>',
      '  <div style="display:flex;align-items:center;gap:6px;">',
      '    <button type="button" class="bai-model-chip" id="bai-model-chip-btn" title="' + _escapeHtml(_t('slmManageModelsTitle', 'Local AI Language Models')) + '">',
      '      <img src="../assets/icons/brain.svg" style="width:12px;height:12px;" alt="" />',
      '      <span id="bai-model-chip-label">AI Model</span>',
      '    </button>',
      '    <button type="button" class="bai-close-btn" id="bai-close-btn" title="' + _escapeHtml(_t('slmClose', 'Close')) + '">',
      '      <img src="../assets/icons/close.svg" style="width:12px;height:12px;" alt="×" />',
      '    </button>',
      '  </div>',
      '</div>',
      '<div class="bai-context-bar">',
      '  <div class="bai-context-summary">',
      '    <span id="bai-context-summary-text"></span>',
      '  </div>',
      '  <div class="bai-context-pills" id="bai-context-pills"></div>',
      '  <div id="bai-empty-topic-wrap" style="display:none;">',
      '    <input type="text" class="bai-input" id="bai-topic-input" placeholder="' + _escapeHtml(_t('boardAiTopicPlaceholder', 'Enter a central topic, theme, or question…')) + '" />',
      '  </div>',
      '</div>',
      '<div class="bai-tabs">',
      '  <button type="button" class="bai-tab-btn active" id="bai-tab-expand">',
      '    <img src="../assets/icons/nodes.svg" style="width:13px;height:13px;" alt="" />',
      '    <span data-i18n="boardAiTabExpand">' + _escapeHtml(_t('boardAiTabExpand', 'Expand Nodes')) + '</span>',
      '  </button>',
      '  <button type="button" class="bai-tab-btn" id="bai-tab-write">',
      '    <img src="../assets/icons/note.svg" style="width:13px;height:13px;" alt="" />',
      '    <span data-i18n="boardAiTabWrite">' + _escapeHtml(_t('boardAiTabWrite', 'Write & Analyze')) + '</span>',
      '  </button>',
      '</div>',
      '<div class="bai-body">',
      '  <!-- TAB 1: EXPAND NODES -->',
      '  <div id="bai-pane-expand" style="display:flex;flex-direction:column;gap:9px;">',
      '    <div>',
      '      <div class="bai-field-label" data-i18n="boardAiPresetLabel">' + _escapeHtml(_t('boardAiPresetLabel', 'Expansion Mode')) + '</div>',
      '      <div class="bai-preset-grid" id="bai-expand-presets">',
      '        <button type="button" class="bai-preset-btn active" data-preset="related">' + _escapeHtml(_t('boardAiPresetRelated', 'Related Concepts')) + '</button>',
      '        <button type="button" class="bai-preset-btn" data-preset="lexical">' + _escapeHtml(_t('boardAiPresetLexical', 'Lexical Field & Collocations')) + '</button>',
      '        <button type="button" class="bai-preset-btn" data-preset="extract">' + _escapeHtml(_t('boardAiPresetExtract', 'Extract Key Terms')) + '</button>',
      '        <button type="button" class="bai-preset-btn" data-preset="bridge">' + _escapeHtml(_t('boardAiPresetBridge', 'Bridge Selected Nodes')) + '</button>',
      '      </div>',
      '    </div>',
      '    <div>',
      '      <div class="bai-field-label" data-i18n="boardAiNodeCountLabel">' + _escapeHtml(_t('boardAiNodeCountLabel', 'Number of Nodes to Spawn')) + '</div>',
      '      <div class="bai-pill-row" id="bai-node-count-row">',
      '        <button type="button" class="bai-opt-pill" data-count="3">3</button>',
      '        <button type="button" class="bai-opt-pill active" data-count="4">4</button>',
      '        <button type="button" class="bai-opt-pill" data-count="5">5</button>',
      '        <button type="button" class="bai-opt-pill" data-count="6">6</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <!-- TAB 2: WRITE & ANALYZE -->',
      '  <div id="bai-pane-write" style="display:none;flex-direction:column;gap:9px;">',
      '    <div>',
      '      <div class="bai-field-label" data-i18n="boardAiWritePresetLabel">' + _escapeHtml(_t('boardAiWritePresetLabel', 'Generation Task')) + '</div>',
      '      <div class="bai-preset-grid" id="bai-write-presets">',
      '        <button type="button" class="bai-preset-btn active" data-preset="sentences">' + _escapeHtml(_t('boardAiPresetSentences', 'Example Sentences')) + '</button>',
      '        <button type="button" class="bai-preset-btn" data-preset="paragraph">' + _escapeHtml(_t('boardAiPresetParagraph', 'Cohesive Paragraph')) + '</button>',
      '        <button type="button" class="bai-preset-btn" data-preset="gapfill">' + _escapeHtml(_t('boardAiPresetGapFill', 'Gap-Fill Exercise')) + '</button>',
      '        <button type="button" class="bai-preset-btn" data-preset="questions">' + _escapeHtml(_t('boardAiPresetQuestions', 'Discussion Questions')) + '</button>',
      '        <button type="button" class="bai-preset-btn" data-preset="analysis" style="grid-column:1/-1;">' + _escapeHtml(_t('boardAiPresetAnalysis', 'Literary & Textual Analysis')) + '</button>',
      '      </div>',
      '    </div>',
      '    <div>',
      '      <div class="bai-field-label" data-i18n="boardAiCefrLabel">' + _escapeHtml(_t('boardAiCefrLabel', 'Target Level (CEFR)')) + '</div>',
      '      <div class="bai-pill-row" id="bai-cefr-row">',
      '        <button type="button" class="bai-opt-pill" data-level="A1">A1</button>',
      '        <button type="button" class="bai-opt-pill" data-level="A2">A2</button>',
      '        <button type="button" class="bai-opt-pill active" data-level="B1">B1</button>',
      '        <button type="button" class="bai-opt-pill" data-level="B2">B2</button>',
      '        <button type="button" class="bai-opt-pill" data-level="C1">C1</button>',
      '      </div>',
      '    </div>',
      '    <div>',
      '      <div class="bai-field-label" data-i18n="boardAiOutputTargetLabel">' + _escapeHtml(_t('boardAiOutputTargetLabel', 'Output Destination')) + '</div>',
      '      <div class="bai-pill-row" id="bai-target-mode-row">',
      '        <button type="button" class="bai-opt-pill active" data-target="new_note">' + _escapeHtml(_t('boardAiTargetNewNote', 'New Connected Note')) + '</button>',
      '        <button type="button" class="bai-opt-pill" data-target="append_note" id="bai-target-append-btn">' + _escapeHtml(_t('boardAiTargetAppendNote', 'Append to Note')) + '</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <!-- SHARED CUSTOM PROMPT & GROUNDING -->',
      '  <div>',
      '    <div class="bai-field-label" data-i18n="boardAiCustomPromptLabel">' + _escapeHtml(_t('boardAiCustomPromptLabel', 'Custom Focus / Instruction (Optional)')) + '</div>',
      '    <input type="text" class="bai-input" id="bai-custom-prompt-input" placeholder="' + _escapeHtml(_t('boardAiCustomPromptPlaceholder', 'e.g. Focus on Gothic imagery, past tense, irony…')) + '" />',
      '  </div>',
      '  <label class="bai-ground-row" id="bai-ground-row" style="display:none;cursor:pointer;">',
      '    <span style="display:inline-flex;align-items:center;gap:6px;">',
      '      <img src="../assets/icons/book.svg" style="width:13px;height:13px;" alt="" />',
      '      <span id="bai-ground-label">' + _escapeHtml(_t('boardAiGroundInText', 'Ground in loaded text')) + '</span>',
      '    </span>',
      '    <input type="checkbox" id="bai-ground-checkbox" checked />',
      '  </label>',
      '</div>',
      '<div class="bai-footer">',
      '  <div class="bai-status-text" id="bai-status-text">' + _escapeHtml(_t('slmStatusReady', 'AI Ready')) + '</div>',
      '  <div style="display:flex;align-items:center;gap:6px;">',
      '    <button type="button" class="bai-btn bai-btn-danger" id="bai-stop-btn" style="display:none;">' + _escapeHtml(_t('boardAiStopBtn', 'Stop')) + '</button>',
      '    <button type="button" class="bai-btn bai-btn-primary" id="bai-run-btn">',
      '      <img src="../assets/icons/sparkles.svg" style="width:13px;height:13px;" alt="" />',
      '      <span id="bai-run-btn-label">' + _escapeHtml(_t('boardAiGenerateBtn', 'Generate')) + '</span>',
      '    </button>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(pop);
    _popoverEl = pop;

    // Bind interactive events once
    document.getElementById('bai-close-btn').addEventListener('click', function () {
      boardAiClosePopover();
    });

    document.getElementById('bai-model-chip-btn').addEventListener('click', function () {
      if (typeof window.openSlmModelManager === 'function') {
        window.openSlmModelManager({
          onSelectModel: function () { _refreshModelChip(); }
        });
      }
    });

    document.getElementById('bai-tab-expand').addEventListener('click', function () {
      _setTab('expand');
    });
    document.getElementById('bai-tab-write').addEventListener('click', function () {
      _setTab('write');
    });

    document.getElementById('bai-expand-presets').addEventListener('click', function (e) {
      var btn = e.target.closest('.bai-preset-btn');
      if (!btn) return;
      _expandPreset = btn.getAttribute('data-preset') || 'related';
      _syncFormUi();
    });

    document.getElementById('bai-node-count-row').addEventListener('click', function (e) {
      var btn = e.target.closest('.bai-opt-pill');
      if (!btn) return;
      _nodeCount = parseInt(btn.getAttribute('data-count'), 10) || 4;
      _syncFormUi();
    });

    document.getElementById('bai-write-presets').addEventListener('click', function (e) {
      var btn = e.target.closest('.bai-preset-btn');
      if (!btn) return;
      _writePreset = btn.getAttribute('data-preset') || 'sentences';
      _syncFormUi();
    });

    document.getElementById('bai-cefr-row').addEventListener('click', function (e) {
      var btn = e.target.closest('.bai-opt-pill');
      if (!btn) return;
      _cefrLevel = btn.getAttribute('data-level') || 'B1';
      _syncFormUi();
    });

    document.getElementById('bai-target-mode-row').addEventListener('click', function (e) {
      var btn = e.target.closest('.bai-opt-pill');
      if (!btn || btn.disabled) return;
      _targetMode = btn.getAttribute('data-target') || 'new_note';
      _syncFormUi();
    });

    document.getElementById('bai-ground-checkbox').addEventListener('change', function (e) {
      _groundInText = !!e.target.checked;
    });

    document.getElementById('bai-stop-btn').addEventListener('click', function () {
      if (window.SlmService) window.SlmService.abort();
      _setGeneratingState(false, _t('slmStatusReady', 'AI Ready'));
    });

    document.getElementById('bai-run-btn').addEventListener('click', function () {
      boardAiRunCurrentAction();
    });

    // Outside click & Escape dismissal
    document.addEventListener('pointerdown', function (e) {
      if (!_popoverEl || !_popoverEl.classList.contains('visible')) return;
      if (_popoverEl.contains(e.target)) return;
      var slmModal = document.getElementById('slm-model-overlay') || document.getElementById('slm-model-modal-backdrop');
      if (slmModal && slmModal.contains(e.target)) return;
      if (!_isGenerating) {
        boardAiClosePopover();
      }
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _popoverEl && _popoverEl.classList.contains('visible')) {
        var slmModal = document.getElementById('slm-model-overlay') || document.getElementById('slm-model-modal-backdrop');
        if (slmModal && slmModal.style.display !== 'none') return;
        boardAiClosePopover();
      }
    });

    return _popoverEl;
  }

  function _setTab(tab) {
    _activeTab = tab === 'write' ? 'write' : 'expand';
    _syncFormUi();
  }

  function _syncFormUi() {
    if (!_popoverEl) return;
    var isExpand = _activeTab === 'expand';
    document.getElementById('bai-tab-expand').classList.toggle('active', isExpand);
    document.getElementById('bai-tab-write').classList.toggle('active', !isExpand);
    document.getElementById('bai-pane-expand').style.display = isExpand ? 'flex' : 'none';
    document.getElementById('bai-pane-write').style.display = !isExpand ? 'flex' : 'none';

    Array.from(document.querySelectorAll('#bai-expand-presets .bai-preset-btn')).forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-preset') === _expandPreset);
    });
    Array.from(document.querySelectorAll('#bai-node-count-row .bai-opt-pill')).forEach(function (b) {
      b.classList.toggle('active', parseInt(b.getAttribute('data-count'), 10) === _nodeCount);
    });
    Array.from(document.querySelectorAll('#bai-write-presets .bai-preset-btn')).forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-preset') === _writePreset);
    });
    Array.from(document.querySelectorAll('#bai-cefr-row .bai-opt-pill')).forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-level') === _cefrLevel);
    });
    Array.from(document.querySelectorAll('#bai-target-mode-row .bai-opt-pill')).forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-target') === _targetMode);
    });
  }

  async function _refreshModelChip() {
    var chipLabel = document.getElementById('bai-model-chip-label');
    var statusEl = document.getElementById('bai-status-text');
    if (!chipLabel || !window.SlmService) return;
    try {
      var st = await window.SlmService.getStatus();
      var activeId = st.activeModelId || st.activeModel;
      var activeSpec = (st.models || []).find(function (m) { return m.id === activeId; });
      if (activeSpec) {
        var isInstalled = Boolean(activeSpec.isInstalled || activeSpec.installed);
        var shortTier = activeSpec.id === 'slm-fast' ? '0.5B Fast' : (activeSpec.id === 'slm-deep' ? '1.8B Deep' : '1.5B Balanced');
        chipLabel.textContent = shortTier + (isInstalled ? ' ✓' : ' ⬇');
        if (!_isGenerating && statusEl) {
          statusEl.textContent = isInstalled
            ? _t('slmStatusReady', 'AI Ready')
            : _t('slmErrorNotInstalled', 'Model not downloaded yet — click chip above');
        }
      }
    } catch (_) {}
  }

  function _refreshSelectionSummary() {
    var sel = boardAiResolveSelection();
    var summaryEl = document.getElementById('bai-context-summary-text');
    var pillsEl = document.getElementById('bai-context-pills');
    var emptyTopicWrap = document.getElementById('bai-empty-topic-wrap');
    var appendBtn = document.getElementById('bai-target-append-btn');

    var nCount = sel.nodes.length;
    var ntCount = sel.notes.length;

    if (appendBtn) {
      appendBtn.disabled = ntCount === 0;
      if (ntCount === 0 && _targetMode === 'append_note') {
        _targetMode = 'new_note';
      }
    }

    if (nCount === 0 && ntCount === 0) {
      if (summaryEl) summaryEl.textContent = _t('boardAiCtxEmpty', 'No nodes/notes selected — enter a topic below:');
      if (pillsEl) {
        pillsEl.innerHTML = '';
        pillsEl.style.display = 'none';
      }
      if (emptyTopicWrap) emptyTopicWrap.style.display = 'block';
    } else {
      var parts = [];
      if (nCount > 0) parts.push(nCount + ' ' + (nCount === 1 ? _t('boardAiNodeSingular', 'node') : _t('boardAiNodePlural', 'nodes')));
      if (ntCount > 0) parts.push(ntCount + ' ' + (ntCount === 1 ? _t('boardAiNoteSingular', 'note') : _t('boardAiNotePlural', 'notes')));
      if (summaryEl) summaryEl.textContent = _t('boardAiCtxSelected', 'Selected context:') + ' ' + parts.join(' • ');
      if (emptyTopicWrap) emptyTopicWrap.style.display = 'none';
      if (pillsEl) {
        pillsEl.style.display = 'flex';
        var html = [];
        sel.nodes.slice(0, 8).forEach(function (n) {
          var w = (n.baseWord || (n.el && n.el.textContent.trim()) || '').trim();
          if (w) html.push('<span class="bai-ctx-pill">' + _escapeHtml(w) + '</span>');
        });
        sel.notes.slice(0, 4).forEach(function (nt) {
          var txt = (nt.text || _stripHtml(nt.html) || '').trim().replace(/\s+/g, ' ');
          if (txt.length > 26) txt = txt.slice(0, 24) + '…';
          html.push('<span class="bai-ctx-pill is-note">📝 ' + _escapeHtml(txt || 'Note') + '</span>');
        });
        pillsEl.innerHTML = html.join('');
      }
    }

    // Check loaded reference text for Grounding toggle
    var refText = _getLoadedReferenceText();
    var groundRow = document.getElementById('bai-ground-row');
    var groundLabel = document.getElementById('bai-ground-label');
    if (groundRow) {
      if (refText.hasText) {
        groundRow.style.display = 'flex';
        if (groundLabel) {
          groundLabel.textContent = _t('boardAiGroundInText', 'Ground in loaded text') + ' (' + refText.sourceLabel + ')';
        }
      } else {
        groundRow.style.display = 'none';
      }
    }

    _syncFormUi();
  }

  function _setGeneratingState(running, statusMsg) {
    _isGenerating = !!running;
    var runBtn = document.getElementById('bai-run-btn');
    var stopBtn = document.getElementById('bai-stop-btn');
    var statusEl = document.getElementById('bai-status-text');
    if (runBtn) runBtn.disabled = _isGenerating;
    if (stopBtn) stopBtn.style.display = _isGenerating ? 'inline-flex' : 'none';
    if (statusEl && statusMsg) statusEl.textContent = statusMsg;
  }

  /**
   * Open the AI Studio Popover anchored near a trigger element or screen coordinates
   */
  function boardAiOpenPopover(options, anchorEl) {
    options = options || {};
    _contextOverride = {
      nodeId: options.nodeId || null,
      noteId: options.noteId || null,
      boardX: typeof options.boardX === 'number' ? options.boardX : null,
      boardY: typeof options.boardY === 'number' ? options.boardY : null
    };

    // Capture current context menu targets before dismissing menus
    if (!_contextOverride.nodeId && typeof window.conGetCtxNodeId === 'function' && window.conGetCtxNodeId()) {
      var multi = window.conGetMultiSelected ? window.conGetMultiSelected() : null;
      if (!multi || multi.size <= 1) {
        _contextOverride.nodeId = window.conGetCtxNodeId();
      }
    }
    if (!_contextOverride.noteId && window._wnActiveNote && window._wnActiveNote.id) {
      _contextOverride.noteId = window._wnActiveNote.id;
    }

    // Capture board right-click position if opened from #con-board-ctx-menu
    var boardCtxMenu = document.getElementById('con-board-ctx-menu');
    var fallbackClientX = options.clientX || null;
    var fallbackClientY = options.clientY || null;
    if (boardCtxMenu && boardCtxMenu.classList.contains('visible')) {
      var bRect = boardCtxMenu.getBoundingClientRect();
      fallbackClientX = fallbackClientX || bRect.left;
      fallbackClientY = fallbackClientY || bRect.top;
    }

    _dismissCompetingMenus();

    var pop = _ensurePopoverDom();
    if (options.tab === 'write' || options.tab === 'expand') {
      _activeTab = options.tab;
    }
    if (options.preset) {
      if (_activeTab === 'expand') _expandPreset = options.preset;
      else _writePreset = options.preset;
    }

    _refreshSelectionSummary();
    _refreshModelChip();

    pop.classList.add('visible');

    // Position popover within viewport bounds
    var targetLeft = 80;
    var targetTop = 90;
    if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
      var r = anchorEl.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) {
        targetLeft = r.left;
        targetTop = r.bottom + 8;
      }
    } else if (typeof fallbackClientX === 'number' && typeof fallbackClientY === 'number') {
      targetLeft = fallbackClientX;
      targetTop = fallbackClientY;
    } else {
      var sel = boardAiResolveSelection();
      if (sel.nodes.length > 0 && sel.nodes[0].el) {
        var nr = sel.nodes[0].el.getBoundingClientRect();
        targetLeft = nr.right + 12;
        targetTop = nr.top;
      } else if (sel.notes.length > 0) {
        var noteEl = document.querySelector('.con-word-note[data-id="' + sel.notes[0].id + '"]');
        if (noteEl) {
          var ntr = noteEl.getBoundingClientRect();
          targetLeft = ntr.right + 12;
          targetTop = ntr.top;
        }
      } else {
        targetLeft = Math.round((window.innerWidth - 390) / 2);
        targetTop = 110;
      }
    }

    var popRect = pop.getBoundingClientRect();
    var pw = popRect.width || 390;
    var ph = popRect.height || 380;
    if (targetLeft + pw > window.innerWidth - 12) {
      targetLeft = Math.max(12, window.innerWidth - pw - 12);
    }
    if (targetTop + ph > window.innerHeight - 12) {
      targetTop = Math.max(12, window.innerHeight - ph - 12);
    }
    pop.style.left = Math.round(targetLeft) + 'px';
    pop.style.top = Math.round(targetTop) + 'px';

    var topicInput = document.getElementById('bai-topic-input');
    var emptyWrap = document.getElementById('bai-empty-topic-wrap');
    if (emptyWrap && emptyWrap.style.display !== 'none' && topicInput) {
      setTimeout(function () { topicInput.focus(); }, 30);
    }
  }

  function boardAiClosePopover() {
    if (_popoverEl) {
      _popoverEl.classList.remove('visible');
    }
  }

  /**
   * Build structured context string from selected nodes, notes, edges, and optional grounded text
   */
  function _buildPromptContext(sel) {
    var topicInput = document.getElementById('bai-topic-input');
    var customInput = document.getElementById('bai-custom-prompt-input');
    var topicVal = topicInput ? topicInput.value.trim() : '';
    var customInstruction = customInput ? customInput.value.trim() : '';

    var keywords = [];
    var nodeDescriptions = [];
    sel.nodes.forEach(function (n) {
      var w = (n.baseWord || (n.el && n.el.textContent.trim()) || '').trim();
      if (!w) return;
      keywords.push(w);
      var dbEntry = (typeof window.conFindDbEntry === 'function') ? window.conFindDbEntry(w) : null;
      var def = (dbEntry && (dbEntry.definition || dbEntry.def)) || n.aiDef || '';
      if (Array.isArray(def)) def = def[0] || '';
      var pos = (dbEntry && (dbEntry.partOfSpeech || dbEntry.pos)) || n.aiPos || '';
      if (Array.isArray(pos)) pos = pos.join('/');
      var desc = w;
      if (pos) desc += ' (' + pos + ')';
      if (def) desc += ': ' + String(def).slice(0, 90);
      nodeDescriptions.push(desc);
    });

    var noteTexts = [];
    sel.notes.forEach(function (nt) {
      var raw = (nt.text || _stripHtml(nt.html) || '').trim();
      if (!raw) return;
      noteTexts.push(raw.slice(0, 500));
      raw.split(/\W+/).forEach(function (tok) {
        if (tok.length >= 4 && keywords.length < 15) keywords.push(tok);
      });
    });

    if (topicVal) keywords.push(topicVal);

    var edgeDescriptions = [];
    sel.edges.forEach(function (e) {
      var findLabel = function (id) {
        var nd = sel.nodes.find(function (x) { return String(x.id) === String(id); });
        if (nd) return (nd.baseWord || '').trim();
        var nt = sel.notes.find(function (x) { return String(x.id) === String(id); });
        if (nt) return 'Note[' + String(nt.text || '').slice(0, 20) + ']';
        return '';
      };
      var aLbl = findLabel(e.a);
      var bLbl = findLabel(e.b);
      if (aLbl && bLbl) {
        edgeDescriptions.push(aLbl + (e.label ? ' --[' + e.label + ']--> ' : ' --> ') + bLbl);
      }
    });

    var groundedExcerpt = '';
    var refInfo = _getLoadedReferenceText();
    if (_groundInText && refInfo.hasText) {
      groundedExcerpt = _extractRelevantExcerpts(refInfo.fullText, keywords, 600);
    }

    var lines = [];
    if (nodeDescriptions.length > 0) {
      lines.push('Selected Mind Map Nodes:\n- ' + nodeDescriptions.join('\n- '));
    }
    if (noteTexts.length > 0) {
      lines.push('Selected Board Notes:\n' + noteTexts.map(function (t, i) { return '[Note ' + (i + 1) + ']: ' + t; }).join('\n'));
    }
    if (edgeDescriptions.length > 0) {
      lines.push('Connections:\n- ' + edgeDescriptions.join('\n- '));
    }
    if (nodeDescriptions.length === 0 && noteTexts.length === 0 && topicVal) {
      lines.push('Central Topic / Prompt: ' + topicVal);
    }
    if (groundedExcerpt) {
      lines.push('Reference Text Excerpt (' + refInfo.sourceLabel + '):\n"""\n' + groundedExcerpt + '\n"""');
    }
    if (customInstruction) {
      lines.push('Teacher Focus / Instruction: ' + customInstruction);
    }

    return {
      hasInput: nodeDescriptions.length > 0 || noteTexts.length > 0 || !!topicVal || !!groundedExcerpt,
      topicVal: topicVal,
      customInstruction: customInstruction,
      contextBlock: lines.join('\n\n')
    };
  }

  /**
   * Ensure active SLM model is downloaded and ready, or prompt 1-click download in Model Manager
   */
  async function _ensureSlmModelInstalled() {
    if (!window.SlmService) return false;
    var st = await window.SlmService.getStatus();
    var activeId = st.activeModelId || st.activeModel;
    var activeSpec = (st.models || []).find(function (m) { return m.id === activeId; });
    var isInstalled = Boolean(activeSpec && (activeSpec.isInstalled || activeSpec.installed));
    if (!isInstalled) {
      if (typeof window.mdbToast === 'function') {
        window.mdbToast('⚠️ ' + _t('slmErrorNotInstalled', 'The selected AI model is not downloaded yet. Please download it in the AI Models Manager.'));
      }
      if (typeof window.openSlmModelManager === 'function') {
        window.openSlmModelManager({
          onSelectModel: function () { _refreshModelChip(); }
        });
      }
      return false;
    }
    return true;
  }

  /**
   * Execute current tab action
   */
  async function boardAiRunCurrentAction() {
    if (_isGenerating) return;
    if (_activeTab === 'expand') {
      await boardAiExecuteExpandNodes();
    } else {
      await boardAiExecuteGenerateText();
    }
  }

  /**
   * TAB 1 ENGINE: Expand / Spawn Connected Mind Map Nodes
   */
  async function boardAiExecuteExpandNodes() {
    var sel = boardAiResolveSelection();
    var ctx = _buildPromptContext(sel);
    if (!ctx.hasInput) {
      if (typeof window.mdbToast === 'function') {
        window.mdbToast('⚠️ ' + _t('boardAiNeedSelectionOrTopic', 'Select at least one node/note on the board or enter a topic first.'));
      }
      var topicEl = document.getElementById('bai-topic-input');
      if (topicEl) topicEl.focus();
      return;
    }

    var ready = await _ensureSlmModelInstalled();
    if (!ready) return;

    var count = Math.max(2, Math.min(8, _nodeCount || 4));
    var taskDesc = '';
    if (_expandPreset === 'lexical') {
      taskDesc = 'Generate exactly ' + count + ' rich vocabulary words, collocations, synonyms, or idiomatic expressions closely linked to the context.';
    } else if (_expandPreset === 'extract') {
      taskDesc = 'Extract the ' + count + ' most important key terms, themes, or concepts from the provided note/text.';
    } else if (_expandPreset === 'bridge') {
      taskDesc = 'Generate ' + count + ' bridging concepts, thematic links, or synthesis nodes that connect the selected nodes/ideas together.';
    } else {
      taskDesc = 'Generate ' + count + ' insightful related concepts, sub-themes, or analytical ideas that expand the mind map.';
    }

    var systemPrompt = [
      'You are an expert language and literature teacher assistant building a classroom mind map.',
      'Return ONLY a valid JSON array of objects. Do not include markdown prose or explanations.',
      'Each object MUST have these exact keys:',
      '{"word": "concise node label (1-3 words)", "relation": "short link label (1-2 words, e.g. theme, cause, synonym, symbol)", "pos": "noun|verb|adj|adv|phrase", "def": "concise 1-sentence pedagogical definition"}'
      'Respond ONLY with a valid JSON array of ' + count + ' objects. No markdown prose or conversational introduction.',
      'Example valid output format:',
      '[',
      '  {"word": "Metaphor", "relation": "symbol", "pos": "noun", "def": "A figure of speech comparing two things without like or as."}',
      ']'
    ].join('\n');

    var userPrompt = ctx.contextBlock + '\n\nTask: ' + taskDesc + '\nReturn ONLY a JSON array of ' + count + ' items:';
    var userPrompt = ctx.contextBlock + '\n\nTask: ' + taskDesc + '\nOutput ONLY the JSON array of ' + count + ' items:';

    _setGeneratingState(true, _t('slmStatusWarmingUp', 'Warming up AI model…'));
    var unsub = window.SlmService.onStatusChange(function (evt) {
      if (!_isGenerating || !evt) return;
      if (evt.status === 'loading') {
        var pct = typeof evt.progress === 'number' ? (' ' + Math.round(evt.progress) + '%') : '';
        _setGeneratingState(true, _t('slmStatusWarmingUp', 'Warming up AI model…') + pct);
      } else if (evt.status === 'generating') {
        _setGeneratingState(true, _t('slmStatusGenerating', 'Generating…'));
      }
    });

    try {
      _setGeneratingState(true, _t('slmStatusGenerating', 'Generating…'));
      var jsonRes = await window.SlmService.generateJson({
        systemPrompt: systemPrompt,
        userPrompt: userPrompt,
        temperature: 0.35,
        maxNewTokens: 320,
        temperature: 0.25,
        maxNewTokens: 512,
        promptDownloadIfMissing: false
      });

      if (jsonRes && jsonRes.aborted) {
        _setGeneratingState(false, _t('slmStatusReady', 'AI Ready'));
        return;
      }
      if (jsonRes && jsonRes.ok === false) {
        throw new Error(jsonRes.error || 'Could not generate nodes.');
      }

      var items = (jsonRes && jsonRes.data !== undefined) ? jsonRes.data : jsonRes;
      if (!Array.isArray(items) && items && Array.isArray(items.nodes)) {
        items = items.nodes;
      }
      if (!Array.isArray(items) && items && Array.isArray(items.items)) {
        items = items.items;
      }
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Could not parse generated nodes.');
      }

      // Filter valid items
      var validItems = items
        .map(function (it) {
          if (!it || typeof it !== 'object') return null;
          var w = String(it.word || it.term || it.label || it.concept || '').trim();
          if (!w) return null;
          return {
            word: w.slice(0, 48),
            relation: String(it.relation || it.link || it.type || '').trim().slice(0, 24),
            pos: String(it.pos || it.partOfSpeech || '').trim().slice(0, 20),
            def: String(it.def || it.definition || '').trim().slice(0, 180)
          };
        })
        .filter(Boolean)
        .slice(0, count);

      if (validItems.length === 0) {
        throw new Error('No valid node labels returned.');
      }

      // Single undo step before mutating board
      if (typeof window.conPushUndo === 'function') window.conPushUndo();

      var allNodes = (typeof window.conGetNodes === 'function' ? window.conGetNodes() : (window.conNodes || [])) || [];
      var anchorIds = [];

      // If user typed a central topic on an empty selection, spawn the central node first!
      if (sel.nodes.length === 0 && sel.notes.length === 0 && ctx.topicVal) {
        var centerPos = (typeof window.conFindFreePosition === 'function')
          ? window.conFindFreePosition(sel.anchorX - 45, sel.anchorY - 18, 100, 36)
          : { x: sel.anchorX - 45, y: sel.anchorY - 18 };
        var rootId = window.conAddWordAt(ctx.topicVal, centerPos.x, centerPos.y);
        if (rootId) anchorIds.push(rootId);
      } else {
        sel.nodes.forEach(function (n) { anchorIds.push(n.id); });
        if (anchorIds.length === 0) {
          sel.notes.forEach(function (nt) { anchorIds.push(nt.id); });
        }
      }

      var radiusX = 210;
      var radiusY = 155;
      var spawnedIds = [];

      validItems.forEach(function (item, idx) {
        var angle = (validItems.length <= 4)
          ? (-Math.PI / 3 + (idx * (2 * Math.PI / 3) / Math.max(1, validItems.length - 1)))
          : ((2 * Math.PI * idx) / validItems.length - Math.PI / 2);

        var rawX = Math.round(sel.anchorX + Math.cos(angle) * radiusX - 48);
        var rawY = Math.round(sel.anchorY + Math.sin(angle) * radiusY - 18);
        var freePos = (typeof window.conFindFreePosition === 'function')
          ? window.conFindFreePosition(rawX, rawY, 105, 36)
          : { x: Math.max(20, rawX), y: Math.max(20, rawY) };

        var newId = window.conAddWordAt(item.word, freePos.x, freePos.y);
        if (!newId) return;
        spawnedIds.push(newId);

        var nodeObj = allNodes.find(function (n) { return String(n.id) === String(newId); });
        if (nodeObj) {
          // Hybrid DB enrichment: if not in local Wordbank, store AI fallback metadata
          if (!nodeObj.dbWord && (item.def || item.pos)) {
            nodeObj.aiDef = item.def || null;
            nodeObj.aiPos = item.pos || null;
            if (nodeObj.el) nodeObj.el.classList.add('con-node-matched');
          }
          if (item.relation) {
            nodeObj.relation = item.relation;
          }
        }

        // Connect edges
        if (_expandPreset === 'bridge' && anchorIds.length >= 2) {
          // Connect bridging node to all selected anchor nodes
          anchorIds.forEach(function (aId) {
            var edge = window.conAddEdge(aId, newId, 'forward', '#8b7cc2');
            if (edge && item.relation) {
              edge.label = item.relation;
              edge.labelColor = '#8b7cc2';
              if (edge.labelEl) edge.labelEl.textContent = edge.label;
              if (typeof window.conApplyEdgeLabelStyle === 'function') window.conApplyEdgeLabelStyle(edge);
            }
          });
        } else if (anchorIds.length > 0) {
          var primaryAnchor = anchorIds[idx % anchorIds.length];
          var edge2 = window.conAddEdge(primaryAnchor, newId, 'forward', '#5b8fcc');
          if (edge2 && item.relation) {
            edge2.label = item.relation;
            edge2.labelColor = '#5b8fcc';
            if (edge2.labelEl) edge2.labelEl.textContent = edge2.label;
            if (typeof window.conApplyEdgeLabelStyle === 'function') window.conApplyEdgeLabelStyle(edge2);
          }
        }
      });

      if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      if (!window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
        window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
      }

      if (typeof window.mdbToast === 'function') {
        window.mdbToast('✨ ' + _t('boardAiToastNodesAdded', 'Added {count} AI nodes to the board.').replace('{count}', spawnedIds.length));
      }
      _setGeneratingState(false, _t('slmStatusReady', 'AI Ready'));
      boardAiClosePopover();
    } catch (err) {
      if (err && err.name === 'AbortError') {
        _setGeneratingState(false, _t('slmStatusReady', 'AI Ready'));
        return;
      }
      console.warn('[Board AI] Expand nodes error:', err);
      _setGeneratingState(false, _t('boardAiErrorGen', 'Generation failed — try again'));
      if (typeof window.mdbToast === 'function') {
        window.mdbToast('⚠️ ' + (err && err.message ? err.message : 'AI generation failed'));
      }
    } finally {
      if (typeof unsub === 'function') unsub();
    }
  }

  /**
   * TAB 2 ENGINE: Stream Contextual Sentences & Textual Analysis into a Board Note at 60fps
   */
  async function boardAiExecuteGenerateText() {
    var sel = boardAiResolveSelection();
    var ctx = _buildPromptContext(sel);
    if (!ctx.hasInput) {
      if (typeof window.mdbToast === 'function') {
        window.mdbToast('⚠️ ' + _t('boardAiNeedSelectionOrTopic', 'Select at least one node/note on the board or enter a topic first.'));
      }
      var topicEl = document.getElementById('bai-topic-input');
      if (topicEl) topicEl.focus();
      return;
    }

    var ready = await _ensureSlmModelInstalled();
    if (!ready) return;

    var taskInstruction = '';
    if (_writePreset === 'paragraph') {
      taskInstruction = 'Write one cohesive, natural paragraph (' + _cefrLevel + ' level) that weaves all the selected words/concepts together in context. Bold the target words using **word**.';
    } else if (_writePreset === 'gapfill') {
      taskInstruction = 'Create a classroom gap-fill (cloze) exercise (' + _cefrLevel + ' level) with 4 numbered sentences using [_____] for the target words, followed by an Answer Key at the bottom.';
    } else if (_writePreset === 'questions') {
      taskInstruction = 'Write 4 thought-provoking classroom discussion or reading comprehension questions (' + _cefrLevel + ' level) based on the selected concepts/notes.';
    } else if (_writePreset === 'analysis') {
      taskInstruction = 'Write a concise literary and textual analysis note (' + _cefrLevel + ' level) examining themes, tone, stylistic devices, and connections across the selected nodes/notes.';
    } else {
      taskInstruction = 'Write 3 clear, natural example sentences (' + _cefrLevel + ' level) illustrating the selected vocabulary/concepts in context. Bold the target words using **word**.';
    }

    var systemPrompt = [
      'You are an expert classroom teacher creating clear, high-quality pedagogical content directly onto a lesson board.',
      'Write directly without meta-commentary or conversational filler.',
      'Adapt vocabulary and syntax strictly to CEFR level ' + _cefrLevel + '.'
    ].join('\n');

    var userPrompt = ctx.contextBlock + '\n\nTask: ' + taskInstruction;

    _setGeneratingState(true, _t('slmStatusWarmingUp', 'Warming up AI model…'));

    // Single undo step before creating/editing note
    if (typeof window.conPushUndo === 'function') window.conPushUndo();

    var targetNote = null;
    var initialPrefixText = '';
    if (_targetMode === 'append_note' && sel.notes.length > 0) {
      targetNote = sel.notes[0];
      var existingRaw = (targetNote.text || _stripHtml(targetNote.html) || '').trim();
      initialPrefixText = existingRaw ? (existingRaw + '\n\n') : '';
    } else {
      var noteX = Math.max(30, sel.anchorX + 110);
      var noteY = Math.max(30, sel.anchorY - 40);
      var linkedNodeId = sel.nodes.length === 1 ? sel.nodes[0].id : null;
      targetNote = window.conAddNoteObject({
        nodeId: linkedNodeId,
        text: '✨ Generating…',
        html: '<i>✨ Generating…</i>',
        x: noteX,
        y: noteY,
        bg: '#fef9c3',
        color: '#1e1e1e',
        fontSize: 14,
        width: 280,
        height: 110
      });

      // Connect selected nodes/notes to the new AI note with edges
      var anchors = sel.nodes.map(function (n) { return n.id; }).concat(sel.notes.map(function (nt) { return nt.id; }));
      anchors.forEach(function (aId) {
        if (String(aId) === String(targetNote.id)) return;
        window.conAddEdge(aId, targetNote.id, 'forward', '#e2c96e');
      });
      if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
    }

    var noteEl = document.querySelector('.con-word-note[data-id="' + targetNote.id + '"]');
    var editorEl = noteEl ? noteEl.querySelector('.wn-note-editor') : null;

    // Attach inline "⏹ Stop AI" button on the note during streaming
    var inlineStopBtn = null;
    if (noteEl) {
      inlineStopBtn = document.createElement('button');
      inlineStopBtn.type = 'button';
      inlineStopBtn.className = 'wn-ai-stop-btn';
      inlineStopBtn.textContent = '⏹ ' + _t('boardAiStopBtn', 'Stop');
      inlineStopBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (window.SlmService) window.SlmService.abort();
      });
      noteEl.appendChild(inlineStopBtn);
    }

    // Close popover so teacher sees live streaming directly on the canvas
    boardAiClosePopover();

    // 60fps rAF-throttled in-place DOM & Mirror update (smooth-dom-sync)
    var latestFullText = initialPrefixText;
    var rafPending = false;

    function flushStreamToNote() {
      rafPending = false;
      if (!targetNote) return;
      var formattedHtml = _formatNoteHtml(latestFullText);
      targetNote.text = latestFullText;
      targetNote.html = formattedHtml;
      if (editorEl) {
        editorEl.innerHTML = formattedHtml;
        if (typeof window.conNoteAutosize === 'function') {
          window.conNoteAutosize(editorEl, targetNote);
        }
      }
      if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
      if (typeof window._conMirrorSend === 'function') {
        window._conMirrorSend({
          type: 'note-text',
          id: String(targetNote.id),
          html: targetNote.html,
          text: targetNote.text,
          baseWidth: targetNote.liveBaseWidth || targetNote.width || 280,
          baseHeight: targetNote.liveBaseHeight || targetNote.height || 110,
          width: targetNote.width || targetNote.liveBaseWidth || 280,
          height: targetNote.height || targetNote.liveBaseHeight || 110,
          manualSize: !!targetNote.manualSize
        });
      }
    }

    try {
      var streamRes = await window.SlmService.generateText({
        systemPrompt: systemPrompt,
        userPrompt: userPrompt,
        temperature: 0.45,
        maxNewTokens: 380,
        promptDownloadIfMissing: false,
        onToken: function (_delta, fullSoFar) {
          latestFullText = initialPrefixText + String(fullSoFar || '').trimStart();
          if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(flushStreamToNote);
          }
        }
      });

      if (streamRes && !streamRes.ok && !streamRes.aborted) {
        throw new Error(streamRes.error || 'AI generation failed');
      }

      if (streamRes && streamRes.text && latestFullText === initialPrefixText) {
        latestFullText = initialPrefixText + String(streamRes.text || '').trimStart();
      }
      flushStreamToNote();
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      if (!window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
        window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
      }
    } catch (err) {
      if (err && err.name === 'AbortError') {
        flushStreamToNote();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      } else {
        console.warn('[Board AI] Stream text error:', err);
        if (typeof window.mdbToast === 'function') {
          window.mdbToast('⚠️ ' + (err && err.message ? err.message : 'AI generation failed'));
        }
      }
    } finally {
      if (inlineStopBtn && inlineStopBtn.parentNode) {
        inlineStopBtn.parentNode.removeChild(inlineStopBtn);
      }
      _setGeneratingState(false, _t('slmStatusReady', 'AI Ready'));
    }
  }

  Board.ai = {
    openPopover: boardAiOpenPopover,
    closePopover: boardAiClosePopover,
    resolveSelection: boardAiResolveSelection,
    expandNodes: boardAiExecuteExpandNodes,
    generateText: boardAiExecuteGenerateText
  };

  global.boardAiOpenPopover = boardAiOpenPopover;
  global.boardAiClosePopover = boardAiClosePopover;
  global.boardAiRunCurrentAction = boardAiRunCurrentAction;
})(typeof window !== 'undefined' ? window : this);
