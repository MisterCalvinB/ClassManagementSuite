/**
 * Class Management Tools — Board Ask AI Popover
 * Simple, fast Q&A popover with an integrated answer panel powered by local offline SLMs (window.SlmService).
 */
(function (global) {
  'use strict';

  var Board = global.Board = global.Board || {};

  var _popoverEl = null;
  var _isGenerating = false;
  var _contextOverride = null; // { nodeId?, noteId?, boardX?, boardY? }
  var _activeContext = null;   // { nodes, notes, anchorX, anchorY }
  var _contextDismissed = false;
  var _lastAnswerText = '';
  var _lastUserPrompt = '';
  var _lastSysPrompt = '';
  var _answerLength = 'brief'; // 'brief' | 'long'
  var _genStartTime = 0;
  var _timerInterval = null;
  var _promptEditorOpen = false;
  var _SYS_PROMPT_STORAGE_KEY = 'cmt-board-ai-custom-system-prompt';
  var _QUICK_PROMPTS_STORAGE_KEY = 'cmt-board-ai-custom-quick-prompts';
  var _customSystemPrompt = '';
  var _customQuickPrompts = {};

  try {
    var savedSys = localStorage.getItem(_SYS_PROMPT_STORAGE_KEY);
    if (typeof savedSys === 'string' && savedSys.trim()) _customSystemPrompt = savedSys;
  } catch (_) {}
  try {
    var savedQuick = localStorage.getItem(_QUICK_PROMPTS_STORAGE_KEY);
    if (savedQuick) {
      var parsedQuick = JSON.parse(savedQuick);
      if (parsedQuick && typeof parsedQuick === 'object') _customQuickPrompts = parsedQuick;
    }
  } catch (_) {}

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

  function _formatAnswerHtml(rawText) {
    var escaped = _escapeHtml(String(rawText || '').trim());
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    escaped = escaped.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, '$1<i>$2</i>');
    return escaped.replace(/\r?\n/g, '<br>');
  }

  function _dismissCompetingMenus() {
    if (typeof window.conCtxClose === 'function') window.conCtxClose();
    if (typeof window.conBoardCtxClose === 'function') window.conBoardCtxClose();
    if (typeof window.wnStyleDismiss === 'function') window.wnStyleDismiss();
    if (typeof window.conGroupCtxClose === 'function') window.conGroupCtxClose();
    if (typeof window.conDrawingCtxClose === 'function') window.conDrawingCtxClose();
    if (typeof window.conShapeCtxClose === 'function') window.conShapeCtxClose();
    if (typeof window.conCloseNodeWordCard === 'function') window.conCloseNodeWordCard();
  }

  function boardAiResolveSelection(override) {
    var ov = override || _contextOverride || {};
    var allNodes = (typeof window.conGetNodes === 'function' ? window.conGetNodes() : (window.conNodes || [])) || [];
    var allNotes = (typeof window.conGetNotes === 'function' ? window.conGetNotes() : (window.conNotes || [])) || [];

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
      selectedNodes.forEach(function (node) {
        allNotes.forEach(function (nt) {
          if (nt.nodeId && String(nt.nodeId) === String(node.id)) {
            noteIdSet.add(String(nt.id));
          }
        });
      });
      selectedNotes = allNotes.filter(function (nt) { return noteIdSet.has(String(nt.id)); });
    }

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
      anchorX: anchorX,
      anchorY: anchorY
    };
  }

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
        '  max-height: calc(100vh - 24px);',
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
        '  padding: 9px 12px;',
        '  background: #ffffff;',
        '  border-bottom: 2px solid #333333;',
        '}',
        '.bai-title-wrap {',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 7px;',
        '  font-weight: 800;',
        '  font-size: 0.9rem;',
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
        '  cursor: pointer;',
        '  display: inline-flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '}',
        '.bai-close-btn:hover { background: #f2dede; }',
        '.bai-icon-btn {',
        '  width: 26px;',
        '  height: 26px;',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 6px;',
        '  box-shadow: 1.5px 1.5px 0 #555555;',
        '  cursor: pointer;',
        '  display: inline-flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '}',
        '.bai-icon-btn:hover { background: #e2c96e; }',
        '.bai-icon-btn.active { background: #e2c96e; }',
        '.bai-prompt-editor {',
        '  display: none;',
        '  flex-direction: column;',
        '  gap: 6px;',
        '  padding: 8px 12px;',
        '  background: #eaeae4;',
        '  border-bottom: 1.5px solid #333333;',
        '}',
        '.bai-prompt-editor.visible { display: flex; }',
        '.bai-pe-row {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  gap: 6px;',
        '}',
        '.bai-pe-label {',
        '  font-size: 0.68rem;',
        '  font-weight: 800;',
        '  text-transform: uppercase;',
        '  letter-spacing: 0.3px;',
        '  color: #1e1e1e;',
        '}',
        '.bai-pe-select {',
        '  padding: 2px 6px;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 4px;',
        '  background: #ffffff;',
        '  font-family: inherit;',
        '  font-size: 0.68rem;',
        '  font-weight: 700;',
        '  color: #1e1e1e;',
        '}',
        '.bai-pe-textarea {',
        '  width: 100%;',
        '  box-sizing: border-box;',
        '  padding: 5px 8px;',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 5px;',
        '  font-family: inherit;',
        '  font-size: 0.72rem;',
        '  line-height: 1.35;',
        '  color: #1e1e1e;',
        '  resize: vertical;',
        '  min-height: 44px;',
        '  max-height: 100px;',
        '}',
        '.bai-pe-textarea:focus { outline: none; border-color: #5b8fcc; }',
        '.bai-context-bar {',
        '  display: none;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  gap: 6px;',
        '  padding: 6px 12px;',
        '  background: #eaeae4;',
        '  border-bottom: 1.5px solid #333333;',
        '  font-size: 0.72rem;',
        '}',
        '.bai-context-pills {',
        '  display: flex;',
        '  flex-wrap: wrap;',
        '  gap: 4px;',
        '  flex: 1;',
        '  min-width: 0;',
        '}',
        '.bai-ctx-pill {',
        '  display: inline-flex;',
        '  align-items: center;',
        '  gap: 4px;',
        '  padding: 2px 7px;',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 4px;',
        '  font-size: 0.7rem;',
        '  font-weight: 700;',
        '  max-width: 165px;',
        '  overflow: hidden;',
        '  text-overflow: ellipsis;',
        '  white-space: nowrap;',
        '}',
        '.bai-ctx-pill.is-note { background: #fef9c3; }',
        '.bai-ctx-clear {',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 4px;',
        '  padding: 2px 6px;',
        '  font-size: 0.68rem;',
        '  font-weight: 700;',
        '  cursor: pointer;',
        '  font-family: inherit;',
        '}',
        '.bai-ctx-clear:hover { background: #f2dede; }',
        '.bai-body {',
        '  padding: 10px 12px;',
        '  display: flex;',
        '  flex-direction: column;',
        '  gap: 8px;',
        '}',
        '.bai-quick-prompts {',
        '  display: flex;',
        '  flex-wrap: wrap;',
        '  gap: 5px;',
        '}',
        '.bai-quick-pill {',
        '  padding: 3px 8px;',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 4px;',
        '  box-shadow: 1.5px 1.5px 0 #555555;',
        '  font-family: inherit;',
        '  font-size: 0.7rem;',
        '  font-weight: 700;',
        '  color: #1e1e1e;',
        '  cursor: pointer;',
        '}',
        '.bai-quick-pill:hover { background: #e2c96e; }',
        '.bai-length-toggle {',
        '  display: inline-flex;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 5px;',
        '  overflow: hidden;',
        '  background: #ffffff;',
        '}',
        '.bai-length-btn {',
        '  padding: 3px 8px;',
        '  border: none;',
        '  background: transparent;',
        '  font-family: inherit;',
        '  font-size: 0.68rem;',
        '  font-weight: 700;',
        '  color: #1e1e1e;',
        '  cursor: pointer;',
        '}',
        '.bai-length-btn + .bai-length-btn { border-left: 1.5px solid #333333; }',
        '.bai-length-btn.active { background: #6abf8e; }',
        '.bai-word-limit {',
        '  display: inline-flex;',
        '  align-items: center;',
        '  gap: 4px;',
        '  padding: 2px 6px;',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 5px;',
        '  font-size: 0.68rem;',
        '  font-weight: 700;',
        '  color: #1e1e1e;',
        '  user-select: none;',
        '  cursor: pointer;',
        '}',
        '.bai-word-limit input[type="checkbox"] { margin: 0; cursor: pointer; accent-color: #6abf8e; }',
        '.bai-word-limit-num {',
        '  width: 42px;',
        '  padding: 1px 3px;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 4px;',
        '  font-family: inherit;',
        '  font-size: 0.68rem;',
        '  font-weight: 700;',
        '  text-align: center;',
        '  background: #f5f5f0;',
        '  color: #1e1e1e;',
        '}',
        '.bai-word-limit-num:focus { outline: none; background: #ffffff; border-color: #5b8fcc; }',
        '.bai-textarea {',
        '  width: 100%;',
        '  box-sizing: border-box;',
        '  padding: 8px 10px;',
        '  background: #ffffff;',
        '  border: 2px solid #333333;',
        '  border-radius: 6px;',
        '  font-family: inherit;',
        '  font-size: 0.82rem;',
        '  line-height: 1.4;',
        '  color: #1e1e1e;',
        '  resize: vertical;',
        '  min-height: 54px;',
        '  max-height: 130px;',
        '}',
        '.bai-textarea:focus { outline: none; box-shadow: 2px 2px 0 #5b8fcc; }',
        '.bai-footer {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  gap: 8px;',
        '}',
        '.bai-status-text {',
        '  font-size: 0.72rem;',
        '  font-weight: 600;',
        '  color: #555555;',
        '  flex: 1;',
        '  min-width: 0;',
        '  overflow: hidden;',
        '  text-overflow: ellipsis;',
        '  white-space: nowrap;',
        '}',
        '.bai-btn {',
        '  display: inline-flex;',
        '  align-items: center;',
        '  gap: 5px;',
        '  padding: 6px 12px;',
        '  border: 2px solid #333333;',
        '  border-radius: 6px;',
        '  box-shadow: 2px 2px 0 #555555;',
        '  font-family: inherit;',
        '  font-size: 0.76rem;',
        '  font-weight: 800;',
        '  cursor: pointer;',
        '  background: #ffffff;',
        '  color: #1e1e1e;',
        '}',
        '.bai-btn:hover:not(:disabled) { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 #555555; }',
        '.bai-btn:active:not(:disabled) { transform: translate(1px, 1px); box-shadow: 1px 1px 0 #555555; }',
        '.bai-btn:disabled { opacity: 0.55; cursor: not-allowed; }',
        '.bai-btn-primary { background: #e2c96e; }',
        '.bai-btn-danger { background: #c96b6b; color: #ffffff; }',
        '.bai-btn-sm { padding: 4px 8px; font-size: 0.7rem; border-width: 1.5px; box-shadow: 1.5px 1.5px 0 #555555; }',
        '.bai-answer-box {',
        '  display: none;',
        '  flex-direction: column;',
        '  border-top: 2px solid #333333;',
        '  background: #ffffff;',
        '}',
        '.bai-answer-box.visible { display: flex; }',
        '.bai-answer-head {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  padding: 6px 12px;',
        '  background: #eaeae4;',
        '  border-bottom: 1.5px solid #333333;',
        '  font-size: 0.7rem;',
        '  font-weight: 800;',
        '  text-transform: uppercase;',
        '  letter-spacing: 0.4px;',
        '}',
        '.bai-answer-content {',
        '  padding: 10px 12px;',
        '  font-size: 0.82rem;',
        '  line-height: 1.48;',
        '  color: #1e1e1e;',
        '  max-height: 220px;',
        '  overflow-y: auto;',
        '  word-wrap: break-word;',
        '}',
        '.bai-answer-actions {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: flex-end;',
        '  gap: 6px;',
        '  padding: 7px 12px;',
        '  background: #f5f5f0;',
        '  border-top: 1.5px solid #333333;',
        '}'
      ].join('\n');
      document.head.appendChild(style);
    }

    var pop = document.createElement('div');
    pop.id = 'board-ai-popover';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', _t('boardAiAskTitle', 'Ask AI'));
    pop.innerHTML = [
      '<div class="bai-header">',
      '  <div class="bai-title-wrap">',
      '    <span class="bai-title-icon"><img src="../assets/icons/sparkles.svg" alt="" /></span>',
      '    <span id="bai-header-title">' + _escapeHtml(_t('boardAiAskTitle', 'Ask AI')) + '</span>',
      '  </div>',
      '  <div style="display:flex;align-items:center;gap:6px;">',
      '    <button type="button" class="bai-model-chip" id="bai-model-chip-btn" title="' + _escapeHtml(_t('slmManageModelsTitle', 'Local AI Language Models')) + '">',
      '      <img src="../assets/icons/brain.svg" style="width:12px;height:12px;" alt="" />',
      '      <span id="bai-model-chip-label">AI Model</span>',
      '    </button>',
      '    <button type="button" class="bai-icon-btn" id="bai-edit-prompt-btn" title="' + _escapeHtml(_t('boardAiEditPromptsBtn', 'Edit prompts')) + '" aria-expanded="false">',
      '      <img src="../assets/icons/edit.svg" style="width:12px;height:12px;" alt="" />',
      '    </button>',
      '    <button type="button" class="bai-close-btn" id="bai-close-btn" title="' + _escapeHtml(_t('slmClose', 'Close')) + '">',
      '      <img src="../assets/icons/close.svg" style="width:12px;height:12px;" alt="" />',
      '    </button>',
      '  </div>',
      '</div>',
      '<div class="bai-prompt-editor" id="bai-prompt-editor">',
      '  <div class="bai-pe-row">',
      '    <span class="bai-pe-label">' + _escapeHtml(_t('boardAiSystemPromptLabel', 'System Prompt')) + '</span>',
      '    <button type="button" class="bai-btn bai-btn-sm" id="bai-reset-sys-prompt-btn" title="' + _escapeHtml(_t('boardAiResetPromptBtn', 'Reset')) + '">',
      '      <img src="../assets/icons/refresh.svg" style="width:10px;height:10px;" alt="" />',
      '      <span>' + _escapeHtml(_t('boardAiResetPromptBtn', 'Reset')) + '</span>',
      '    </button>',
      '  </div>',
      '  <textarea class="bai-pe-textarea" id="bai-sys-prompt-input" rows="2"></textarea>',
      '  <div class="bai-pe-row">',
      '    <div style="display:flex;align-items:center;gap:6px;">',
      '      <span class="bai-pe-label">' + _escapeHtml(_t('boardAiQuickPromptLabel', 'Quick Prompt')) + '</span>',
      '      <select class="bai-pe-select" id="bai-quick-prompt-select">',
      '        <option value="meaning">' + _escapeHtml(_t('boardAiQuickMeaning', 'Meaning')) + '</option>',
      '        <option value="explain">' + _escapeHtml(_t('boardAiQuickExplain', 'Explain')) + '</option>',
      '        <option value="translate">' + _escapeHtml(_t('boardAiQuickTranslate', 'Translate')) + '</option>',
      '        <option value="example">' + _escapeHtml(_t('boardAiQuickExample', 'Example')) + '</option>',
      '        <option value="synonyms">' + _escapeHtml(_t('boardAiQuickSynonyms', 'Synonyms')) + '</option>',
      '        <option value="antonyms">' + _escapeHtml(_t('boardAiQuickAntonyms', 'Antonyms')) + '</option>',
      '      </select>',
      '    </div>',
      '    <button type="button" class="bai-btn bai-btn-sm" id="bai-reset-quick-prompt-btn" title="' + _escapeHtml(_t('boardAiResetPromptBtn', 'Reset')) + '">',
      '      <img src="../assets/icons/refresh.svg" style="width:10px;height:10px;" alt="" />',
      '      <span>' + _escapeHtml(_t('boardAiResetPromptBtn', 'Reset')) + '</span>',
      '    </button>',
      '  </div>',
      '  <textarea class="bai-pe-textarea" id="bai-quick-prompt-input" rows="2"></textarea>',
      '</div>',
      '<div class="bai-context-bar" id="bai-context-bar">',
      '  <div class="bai-context-pills" id="bai-context-pills"></div>',
      '  <button type="button" class="bai-ctx-clear" id="bai-clear-ctx-btn" title="' + _escapeHtml(_t('boardAiClearContext', 'Clear context')) + '">' + _escapeHtml(_t('boardAiClearBtn', 'Clear')) + '</button>',
      '</div>',
      '<div class="bai-body">',
      '  <div class="bai-quick-prompts" id="bai-quick-prompts">',
      '    <button type="button" class="bai-quick-pill" data-prompt-key="meaning">' + _escapeHtml(_t('boardAiQuickMeaning', 'Meaning')) + '</button>',
      '    <button type="button" class="bai-quick-pill" data-prompt-key="explain">' + _escapeHtml(_t('boardAiQuickExplain', 'Explain')) + '</button>',
      '    <button type="button" class="bai-quick-pill" data-prompt-key="translate">' + _escapeHtml(_t('boardAiQuickTranslate', 'Translate')) + '</button>',
      '    <button type="button" class="bai-quick-pill" data-prompt-key="example">' + _escapeHtml(_t('boardAiQuickExample', 'Example')) + '</button>',
      '    <button type="button" class="bai-quick-pill" data-prompt-key="synonyms">' + _escapeHtml(_t('boardAiQuickSynonyms', 'Synonyms')) + '</button>',
      '    <button type="button" class="bai-quick-pill" data-prompt-key="antonyms">' + _escapeHtml(_t('boardAiQuickAntonyms', 'Antonyms')) + '</button>',
      '  </div>',
      '  <textarea class="bai-textarea" id="bai-question-input" rows="2" placeholder="' + _escapeHtml(_t('boardAiAskPlaceholder', 'Ask a question…')) + '"></textarea>',
      '  <div class="bai-footer">',
      '    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">',
      '      <div class="bai-length-toggle" id="bai-length-toggle">',
      '        <button type="button" class="bai-length-btn active" data-length="brief">' + _escapeHtml(_t('boardAiLengthBrief', 'Brief')) + '</button>',
      '        <button type="button" class="bai-length-btn" data-length="long">' + _escapeHtml(_t('boardAiLengthLong', 'Long')) + '</button>',
      '      </div>',
      '      <label class="bai-word-limit" title="' + _escapeHtml(_t('boardAiWordLimitTitle', 'Limit answer length in words')) + '">',
      '        <input type="checkbox" id="bai-word-limit-chk" />',
      '        <span>' + _escapeHtml(_t('boardAiWordLimitPrefix', 'Max')) + '</span>',
      '        <input type="number" id="bai-word-limit-num" class="bai-word-limit-num" min="5" max="500" step="5" value="30" />',
      '        <span>' + _escapeHtml(_t('boardAiWordLimitSuffix', 'words')) + '</span>',
      '      </label>',
      '    </div>',
      '    <div class="bai-status-text" id="bai-status-text">' + _escapeHtml(_t('slmStatusReady', 'AI Ready')) + '</div>',
      '    <div style="display:flex;align-items:center;gap:6px;">',
      '      <button type="button" class="bai-btn bai-btn-danger" id="bai-stop-btn" style="display:none;">',
      '        <img src="../assets/icons/stop.svg" style="width:11px;height:11px;" alt="" />',
      '        <span>' + _escapeHtml(_t('boardAiStopBtn', 'Stop')) + '</span>',
      '      </button>',
      '      <button type="button" class="bai-btn bai-btn-primary" id="bai-run-btn">',
      '        <img src="../assets/icons/sparkles.svg" style="width:13px;height:13px;" alt="" />',
      '        <span>' + _escapeHtml(_t('boardAiAskBtn', 'Ask')) + '</span>',
      '      </button>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="bai-answer-box" id="bai-answer-box">',
      '  <div class="bai-answer-head">',
      '    <span>' + _escapeHtml(_t('boardAiAnswerLabel', 'Answer')) + '</span>',
      '    <span id="bai-answer-time"></span>',
      '  </div>',
      '  <div class="bai-answer-content" id="bai-answer-content"></div>',
      '  <div class="bai-answer-actions" id="bai-answer-actions">',
      '    <button type="button" class="bai-btn bai-btn-sm" id="bai-continue-btn">',
      '      <img src="../assets/icons/arrow-right.svg" style="width:11px;height:11px;" alt="" />',
      '      <span>' + _escapeHtml(_t('boardAiGoOnBtn', 'Go on')) + '</span>',
      '    </button>',
      '    <button type="button" class="bai-btn bai-btn-sm" id="bai-copy-btn">',
      '      <img src="../assets/icons/copy.svg" style="width:11px;height:11px;" alt="" />',
      '      <span>' + _escapeHtml(_t('boardAiCopyAnswer', 'Copy')) + '</span>',
      '    </button>',
      '    <button type="button" class="bai-btn bai-btn-sm bai-btn-primary" id="bai-add-note-btn">',
      '      <img src="../assets/icons/note.svg" style="width:11px;height:11px;" alt="" />',
      '      <span>' + _escapeHtml(_t('boardAiAddAsNote', 'Add as Note')) + '</span>',
      '    </button>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(pop);
    _popoverEl = pop;

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

    document.getElementById('bai-clear-ctx-btn').addEventListener('click', function () {
      _contextDismissed = true;
      _renderContextBar();
    });

    var DEFAULT_QUICK_PROMPTS = {
      meaning: _t('boardAiQuickMeaningPrompt', 'Give a clear, simple definition of this word:'),
      explain: _t('boardAiQuickExplainPrompt', 'Explain this concept clearly in simple terms:'),
      translate: _t('boardAiQuickTranslatePrompt', 'Translate this into French (or English if already French) and note its part of speech:'),
      example: _t('boardAiQuickExamplePrompt', 'Write 2 short, natural example sentences that each include the target word:'),
      synonyms: _t('boardAiQuickSynonymsPrompt', 'List 4-5 common synonyms for this word:'),
      antonyms: _t('boardAiQuickAntonymsPrompt', 'List 4-5 common antonyms for this word:')
    };

    function _getQuickPromptText(key) {
      if (_customQuickPrompts && typeof _customQuickPrompts[key] === 'string' && _customQuickPrompts[key].trim()) {
        return _customQuickPrompts[key];
      }
      return DEFAULT_QUICK_PROMPTS[key] || '';
    }

    function _getCurrentLimitWords() {
      var chk = document.getElementById('bai-word-limit-chk');
      var num = document.getElementById('bai-word-limit-num');
      if (chk && chk.checked && num) {
        return Math.max(5, Math.min(500, parseInt(num.value, 10) || 30));
      }
      return 0;
    }

    function _syncPromptEditorFields() {
      var sysInput = document.getElementById('bai-sys-prompt-input');
      var quickSel = document.getElementById('bai-quick-prompt-select');
      var quickInput = document.getElementById('bai-quick-prompt-input');
      if (sysInput) {
        sysInput.value = _customSystemPrompt
          ? _customSystemPrompt
          : _buildSystemPrompt(_answerLength === 'long', _hasActiveContext(), _getCurrentLimitWords());
      }
      if (quickSel && quickInput) {
        quickInput.value = _getQuickPromptText(quickSel.value);
      }
    }

    function _stripTrailingColon(text) {
      return String(text || '').replace(/[:：\s]+$/, '').trim();
    }

    document.getElementById('bai-edit-prompt-btn').addEventListener('click', function () {
      _promptEditorOpen = !_promptEditorOpen;
      var editor = document.getElementById('bai-prompt-editor');
      this.classList.toggle('active', _promptEditorOpen);
      this.setAttribute('aria-expanded', _promptEditorOpen ? 'true' : 'false');
      if (editor) editor.classList.toggle('visible', _promptEditorOpen);
      if (_promptEditorOpen) _syncPromptEditorFields();
      _clampPopoverToViewport();
    });

    document.getElementById('bai-sys-prompt-input').addEventListener('input', function () {
      _customSystemPrompt = this.value;
      try {
        if (_customSystemPrompt.trim()) {
          localStorage.setItem(_SYS_PROMPT_STORAGE_KEY, _customSystemPrompt);
        } else {
          localStorage.removeItem(_SYS_PROMPT_STORAGE_KEY);
        }
      } catch (_) {}
    });

    document.getElementById('bai-reset-sys-prompt-btn').addEventListener('click', function () {
      _customSystemPrompt = '';
      try { localStorage.removeItem(_SYS_PROMPT_STORAGE_KEY); } catch (_) {}
      _syncPromptEditorFields();
    });

    document.getElementById('bai-quick-prompt-select').addEventListener('change', function () {
      _syncPromptEditorFields();
    });

    document.getElementById('bai-quick-prompt-input').addEventListener('input', function () {
      var sel = document.getElementById('bai-quick-prompt-select');
      if (!sel) return;
      var key = sel.value;
      var val = this.value;
      if (val.trim() && val.trim() !== (DEFAULT_QUICK_PROMPTS[key] || '').trim()) {
        _customQuickPrompts[key] = val;
      } else {
        delete _customQuickPrompts[key];
      }
      try { localStorage.setItem(_QUICK_PROMPTS_STORAGE_KEY, JSON.stringify(_customQuickPrompts)); } catch (_) {}
    });

    document.getElementById('bai-reset-quick-prompt-btn').addEventListener('click', function () {
      var sel = document.getElementById('bai-quick-prompt-select');
      if (!sel) return;
      delete _customQuickPrompts[sel.value];
      try { localStorage.setItem(_QUICK_PROMPTS_STORAGE_KEY, JSON.stringify(_customQuickPrompts)); } catch (_) {}
      _syncPromptEditorFields();
    });

    document.getElementById('bai-quick-prompts').addEventListener('click', function (e) {
      var btn = e.target.closest('.bai-quick-pill');
      if (!btn || _isGenerating) return;
      var key = btn.getAttribute('data-prompt-key');
      var promptText = _getQuickPromptText(key);
      if (!promptText) return;
      var quickSel = document.getElementById('bai-quick-prompt-select');
      if (quickSel) {
        quickSel.value = key;
        if (_promptEditorOpen) _syncPromptEditorFields();
      }
      var qInput = document.getElementById('bai-question-input');
      var hasCtx = !_contextDismissed && _activeContext && (_activeContext.nodes.length > 0 || _activeContext.notes.length > 0);
      if (key === 'example' && hasCtx && _activeContext.nodes.length > 0 && !_customQuickPrompts[key]) {
        var targetWords = _activeContext.nodes.slice(0, 3).map(function (n) {
          return (n.baseWord || (n.el && n.el.textContent.trim()) || '').trim();
        }).filter(Boolean);
        if (targetWords.length > 0) {
          var wordList = '"' + targetWords.join('", "') + '"';
          var tpl = _t('boardAiQuickExampleWithWord', 'Write 2 short, natural example sentences that each contain {word}.');
          promptText = tpl.replace('{word}', wordList);
        }
      } else if (hasCtx) {
        promptText = _stripTrailingColon(promptText) + '.';
      }
      if (qInput) {
        qInput.value = hasCtx ? promptText : (promptText + ' ');
        if (hasCtx && !_promptEditorOpen) {
          boardAiAskQuestion();
        } else {
          qInput.focus();
          qInput.setSelectionRange(qInput.value.length, qInput.value.length);
        }
      }
    });

    document.getElementById('bai-length-toggle').addEventListener('click', function (e) {
      var btn = e.target.closest('.bai-length-btn');
      if (!btn || _isGenerating) return;
      _answerLength = btn.getAttribute('data-length') === 'long' ? 'long' : 'brief';
      Array.from(document.querySelectorAll('#bai-length-toggle .bai-length-btn')).forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-length') === _answerLength);
      });
      if (_promptEditorOpen) _syncPromptEditorFields();
    });

    document.getElementById('bai-word-limit-num').addEventListener('input', function () {
      var chk = document.getElementById('bai-word-limit-chk');
      if (chk && !chk.checked) chk.checked = true;
      if (_promptEditorOpen) _syncPromptEditorFields();
    });

    document.getElementById('bai-word-limit-chk').addEventListener('change', function () {
      if (_promptEditorOpen) _syncPromptEditorFields();
    });

    document.getElementById('bai-question-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        boardAiAskQuestion();
      }
    });

    document.getElementById('bai-stop-btn').addEventListener('click', function () {
      if (window.SlmService) window.SlmService.abort();
      _stopTimer();
      _setGeneratingState(false, _t('slmStatusReady', 'AI Ready'));
    });

    document.getElementById('bai-run-btn').addEventListener('click', function () {
      boardAiAskQuestion();
    });

    document.getElementById('bai-continue-btn').addEventListener('click', function () {
      boardAiContinueAnswer();
    });

    document.getElementById('bai-copy-btn').addEventListener('click', function () {
      if (!_lastAnswerText) return;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(_lastAnswerText).then(function () {
          if (typeof window.mdbToast === 'function') {
            window.mdbToast(_t('boardAiCopied', 'Copied to clipboard'));
          }
        }).catch(function () {});
      }
    });

    document.getElementById('bai-add-note-btn').addEventListener('click', function () {
      _addAnswerAsNote();
    });

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
        if (!_isGenerating) boardAiClosePopover();
      }
    });

    return _popoverEl;
  }

  function _renderContextBar() {
    var bar = document.getElementById('bai-context-bar');
    var pillsEl = document.getElementById('bai-context-pills');
    if (!bar || !pillsEl) return;

    if (_contextDismissed || !_activeContext || (_activeContext.nodes.length === 0 && _activeContext.notes.length === 0)) {
      bar.style.display = 'none';
      pillsEl.innerHTML = '';
      return;
    }

    var html = [];
    _activeContext.nodes.slice(0, 6).forEach(function (n) {
      var w = (n.baseWord || (n.el && n.el.textContent.trim()) || '').trim();
      if (w) html.push('<span class="bai-ctx-pill">' + _escapeHtml(w) + '</span>');
    });
    _activeContext.notes.slice(0, 3).forEach(function (nt) {
      var txt = (nt.text || _stripHtml(nt.html) || '').trim().replace(/\s+/g, ' ');
      if (txt.length > 26) txt = txt.slice(0, 24) + '…';
      html.push('<span class="bai-ctx-pill is-note">' + _escapeHtml(txt || 'Note') + '</span>');
    });

    if (html.length === 0) {
      bar.style.display = 'none';
      return;
    }
    pillsEl.innerHTML = html.join('');
    bar.style.display = 'flex';
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
        var SHORT_LABELS = {
          'slm-ultra': 'SmolLM2 360M',
          'slm-gemma3-270m': 'Gemma3 270M',
          'slm-fast': 'Qwen2.5 0.5B',
          'slm-qwen3-0.6b': 'Qwen3 0.6B',
          'slm-gemma3-1b': 'Gemma3 1B',
          'slm-balanced': 'Qwen2.5 1.5B',
          'slm-qwen3-1.7b': 'Qwen3 1.7B',
          'slm-smollm2-1.7b': 'SmolLM2 1.7B',
          'slm-deep': 'Qwen1.5 1.8B'
        };
        var shortTier = SHORT_LABELS[activeSpec.id] || activeSpec.name || activeSpec.id;
        chipLabel.textContent = shortTier + (isInstalled ? '' : ' (!)');
        if (!_isGenerating && statusEl) {
          statusEl.textContent = isInstalled
            ? _t('slmStatusReady', 'AI Ready')
            : _t('slmErrorNotInstalled', 'Model not downloaded yet — click chip above');
        }
      }
    } catch (_) {}
  }

  function _startTimer() {
    _stopTimer();
    _genStartTime = performance.now();
    var timeEl = document.getElementById('bai-answer-time');
    if (timeEl) timeEl.textContent = '0.0s';
    _timerInterval = setInterval(function () {
      if (!_isGenerating) return;
      var elapsed = ((performance.now() - _genStartTime) / 1000).toFixed(1);
      if (timeEl) timeEl.textContent = elapsed + 's';
    }, 200);
  }

  function _stopTimer() {
    if (_timerInterval) {
      clearInterval(_timerInterval);
      _timerInterval = null;
    }
  }

  function _setGeneratingState(running, statusMsg) {
    _isGenerating = !!running;
    var runBtn = document.getElementById('bai-run-btn');
    var stopBtn = document.getElementById('bai-stop-btn');
    var statusEl = document.getElementById('bai-status-text');
    var actionsEl = document.getElementById('bai-answer-actions');
    if (runBtn) runBtn.disabled = _isGenerating;
    if (stopBtn) stopBtn.style.display = _isGenerating ? 'inline-flex' : 'none';
    if (actionsEl) actionsEl.style.display = (!_isGenerating && _lastAnswerText) ? 'flex' : 'none';
    if (statusEl && statusMsg) statusEl.textContent = statusMsg;
  }

  function _clampPopoverToViewport() {
    if (!_popoverEl || !_popoverEl.classList.contains('visible')) return;
    var rect = _popoverEl.getBoundingClientRect();
    var left = parseFloat(_popoverEl.style.left) || rect.left;
    var top = parseFloat(_popoverEl.style.top) || rect.top;
    if (left + rect.width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - rect.width - 12);
    }
    if (top + rect.height > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - rect.height - 12);
    }
    _popoverEl.style.left = Math.round(Math.max(12, left)) + 'px';
    _popoverEl.style.top = Math.round(Math.max(12, top)) + 'px';
  }

  function boardAiOpenPopover(options, anchorEl) {
    options = options || {};
    _contextOverride = {
      nodeId: options.nodeId || null,
      noteId: options.noteId || null,
      boardX: typeof options.boardX === 'number' ? options.boardX : null,
      boardY: typeof options.boardY === 'number' ? options.boardY : null
    };

    if (!_contextOverride.nodeId && typeof window.conGetCtxNodeId === 'function' && window.conGetCtxNodeId()) {
      var multi = window.conGetMultiSelected ? window.conGetMultiSelected() : null;
      if (!multi || multi.size <= 1) {
        _contextOverride.nodeId = window.conGetCtxNodeId();
      }
    }
    if (!_contextOverride.noteId && window._wnActiveNote && window._wnActiveNote.id) {
      _contextOverride.noteId = window._wnActiveNote.id;
    }

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
    _contextDismissed = false;
    _activeContext = boardAiResolveSelection();
    _renderContextBar();
    _refreshModelChip();

    pop.classList.add('visible');

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
    } else if (_activeContext.nodes.length > 0 && _activeContext.nodes[0].el) {
      var nr = _activeContext.nodes[0].el.getBoundingClientRect();
      targetLeft = nr.right + 12;
      targetTop = nr.top;
    } else if (_activeContext.notes.length > 0) {
      var noteEl = document.querySelector('.con-word-note[data-id="' + _activeContext.notes[0].id + '"]');
      if (noteEl) {
        var ntr = noteEl.getBoundingClientRect();
        targetLeft = ntr.right + 12;
        targetTop = ntr.top;
      }
    } else {
      targetLeft = Math.round((window.innerWidth - 390) / 2);
      targetTop = 110;
    }

    pop.style.left = Math.round(targetLeft) + 'px';
    pop.style.top = Math.round(targetTop) + 'px';
    _clampPopoverToViewport();

    var qInput = document.getElementById('bai-question-input');
    if (qInput) {
      setTimeout(function () { qInput.focus(); }, 30);
    }
  }

  function boardAiClosePopover() {
    if (_popoverEl) {
      _popoverEl.classList.remove('visible');
    }
  }

  async function _ensureSlmModelInstalled() {
    if (!window.SlmService) return false;
    var st = await window.SlmService.getStatus();
    var activeId = st.activeModelId || st.activeModel;
    var activeSpec = (st.models || []).find(function (m) { return m.id === activeId; });
    var isInstalled = Boolean(activeSpec && (activeSpec.isInstalled || activeSpec.installed));
    if (!isInstalled) {
      if (typeof window.mdbToast === 'function') {
        window.mdbToast(_t('slmErrorNotInstalled', 'The selected AI model is not downloaded yet. Please download it in the AI Models Manager.'), true);
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

  function _trimAtWordBoundary(str, maxLen) {
    var s = String(str || '').replace(/\s+/g, ' ').trim();
    if (s.length <= maxLen) return s;
    var cut = s.slice(0, maxLen);
    var lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > Math.floor(maxLen * 0.6)) {
      cut = cut.slice(0, lastSpace);
    }
    return cut.trim() + ' [...]';
  }

  function _hasActiveContext() {
    return Boolean(!_contextDismissed && _activeContext && (_activeContext.nodes.length > 0 || _activeContext.notes.length > 0));
  }

  function _buildCompactPrompt(question) {
    var ctxParts = [];
    if (_hasActiveContext()) {
      var words = _activeContext.nodes.slice(0, 6).map(function (n) {
        return (n.baseWord || (n.el && n.el.textContent.trim()) || '').trim();
      }).filter(Boolean);
      if (words.length > 0) {
        ctxParts.push('Selected word(s): ' + words.map(function (w) { return '"' + w + '"'; }).join(', '));
      }
      var noteSnippets = _activeContext.notes.slice(0, 2).map(function (nt) {
        return _trimAtWordBoundary(nt.text || _stripHtml(nt.html) || '', 700);
      }).filter(Boolean);
      if (noteSnippets.length > 0) {
        ctxParts.push('Selected note: "' + noteSnippets.join('" | "') + '"');
      }
    }
    var cleanQuestion = String(question || '').trim().replace(/[:：\s]+$/, '');
    if (ctxParts.length === 0) return String(question || '').trim();
    return ctxParts.join('\n') + '\n\nTask: ' + cleanQuestion;
  }

  function _buildSystemPrompt(isLong, hasCtx, limitWords) {
    var parts = [
      'You are a precise classroom assistant. Follow instructions strictly.',
      'Only state facts you are certain of. If something is unknown or not stated in the provided context, say so briefly instead of guessing or inventing details.',
      'Do not add greetings, filler, or meta-commentary.'
    ];
    if (hasCtx) {
      parts.push('Base your answer strictly on the selected word(s) or note provided.');
    }
    if (isLong) {
      parts.push('Answer clearly and accurately in 3-5 complete sentences. Stay strictly on topic.');
    } else {
      parts.push('Be concise. For definitions or explanations: 1 short, complete sentence. For synonyms or antonyms: output only real, comma-separated words (never repeat the target word or invent words). For translations: give the translation followed by its part of speech in parentheses.');
    }
    if (limitWords) {
      parts.push('Strict limit: at most ' + limitWords + ' words.');
    }
    return parts.join(' ');
  }

  async function boardAiAskQuestion() {
    if (_isGenerating) return;
    var qInput = document.getElementById('bai-question-input');
    var question = qInput ? qInput.value.trim() : '';
    if (!question) {
      if (qInput) qInput.focus();
      return;
    }

    var ready = await _ensureSlmModelInstalled();
    if (!ready) return;

    var answerBox = document.getElementById('bai-answer-box');
    var answerContent = document.getElementById('bai-answer-content');
    var answerTime = document.getElementById('bai-answer-time');
    if (answerBox) answerBox.classList.add('visible');
    if (answerContent) answerContent.textContent = _t('slmStatusGenerating', 'Generating…');
    if (answerTime) answerTime.textContent = '';

    _lastAnswerText = '';
    _startTimer();
    _setGeneratingState(true, _t('slmStatusWarmingUp', 'Warming up AI model…'));
    _clampPopoverToViewport();

    var unsub = window.SlmService.onStatusChange(function (evt) {
      if (!_isGenerating || !evt) return;
      if (evt.state === 'loading' || evt.status === 'loading') {
        var pct = typeof evt.progress === 'number' ? (' ' + Math.round(evt.progress) + '%') : '';
        _setGeneratingState(true, _t('slmStatusWarmingUp', 'Warming up AI model…') + pct);
      } else if (evt.state === 'generating' || evt.status === 'generating') {
        _setGeneratingState(true, _t('slmStatusGenerating', 'Generating…'));
      }
    });

    var rafPending = false;
    function flushAnswer() {
      rafPending = false;
      if (!answerContent) return;
      answerContent.innerHTML = _formatAnswerHtml(_lastAnswerText || '…');
      answerContent.scrollTop = answerContent.scrollHeight;
    }

    var isLong = _answerLength === 'long';
    var maxTokens = isLong ? 360 : 120;
    var limitWords = 0;
    var wordLimitChk = document.getElementById('bai-word-limit-chk');
    var wordLimitNum = document.getElementById('bai-word-limit-num');
    if (wordLimitChk && wordLimitChk.checked && wordLimitNum) {
      limitWords = Math.max(5, Math.min(500, parseInt(wordLimitNum.value, 10) || 30));
      maxTokens = Math.max(40, Math.ceil(limitWords * 1.8) + 20);
    }
    var sysPrompt = (_customSystemPrompt && _customSystemPrompt.trim())
      ? _customSystemPrompt.trim()
      : _buildSystemPrompt(isLong, _hasActiveContext(), limitWords);
    var temp = isLong ? 0.2 : 0.0;
    var compactPrompt = _buildCompactPrompt(question);
    _lastSysPrompt = sysPrompt;
    _lastUserPrompt = compactPrompt;

    try {
      var res = await window.SlmService.generateText({
        systemPrompt: sysPrompt,
        userPrompt: compactPrompt,
        temperature: temp,
        doSample: isLong,
        topK: 20,
        repetitionPenalty: 1.15,
        maxNewTokens: maxTokens,
        promptDownloadIfMissing: false,
        onToken: function (delta, fullSoFar) {
          _lastAnswerText = String(fullSoFar || '').trimStart();
          if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(flushAnswer);
          }
        }
      });

      if (res && res.aborted) {
        _setGeneratingState(false, _t('slmStatusReady', 'AI Ready'));
        return;
      }
      if (res && !res.ok) {
        throw new Error(res.error || 'AI generation failed');
      }

      if (res && res.text && !_lastAnswerText) {
        _lastAnswerText = String(res.text || '').trim();
      }
      flushAnswer();

      var elapsed = ((performance.now() - _genStartTime) / 1000).toFixed(1);
      if (answerTime) answerTime.textContent = elapsed + 's';
      _setGeneratingState(false, _t('boardAiDoneIn', 'Generated in {time}s').replace('{time}', elapsed));
      _clampPopoverToViewport();
    } catch (err) {
      if (err && err.name === 'AbortError') {
        flushAnswer();
        _setGeneratingState(false, _t('slmStatusReady', 'AI Ready'));
      } else {
        console.warn('[Board AI] Question error:', err);
        if (answerContent) {
          answerContent.textContent = (err && err.message) ? err.message : _t('boardAiErrorGen', 'Generation failed — try again');
        }
        _setGeneratingState(false, _t('boardAiErrorGen', 'Generation failed — try again'));
      }
    } finally {
      _stopTimer();
      if (typeof unsub === 'function') unsub();
    }
  }

  async function boardAiContinueAnswer() {
    if (_isGenerating || !_lastAnswerText || !window.SlmService) return;

    var answerContent = document.getElementById('bai-answer-content');
    var answerTime = document.getElementById('bai-answer-time');
    var baseText = _lastAnswerText;

    _startTimer();
    _setGeneratingState(true, _t('slmStatusGenerating', 'Generating…'));

    var rafPending = false;
    function flushAnswer() {
      rafPending = false;
      if (!answerContent) return;
      answerContent.innerHTML = _formatAnswerHtml(_lastAnswerText || '…');
      answerContent.scrollTop = answerContent.scrollHeight;
    }

    function mergeContinuation(prefix, chunk) {
      var c = String(chunk || '');
      if (!c) return prefix;
      var needsSpace = prefix && !/\s$/.test(prefix) && !/^[\s.,!?;:)'"\]]/.test(c);
      return prefix + (needsSpace ? ' ' : '') + c.replace(/^\s+/, needsSpace ? '' : '');
    }

    var isLong = _answerLength === 'long';
    var maxTokens = isLong ? 360 : 120;
    var temp = isLong ? 0.2 : 0.0;

    try {
      var res = await window.SlmService.generateText({
        messages: [
          { role: 'system', content: _lastSysPrompt || 'Continue the response concisely, staying strictly factual and on topic without repeating previous text.' },
          { role: 'user', content: _lastUserPrompt || 'Answer the question.' },
          { role: 'assistant', content: baseText },
          { role: 'user', content: 'Continue directly from where you stopped to finish the incomplete thought. Do not repeat any already-written text and do not invent unrelated details.' }
        ],
        temperature: temp,
        doSample: isLong,
        topK: 20,
        repetitionPenalty: 1.15,
        maxNewTokens: maxTokens,
        promptDownloadIfMissing: false,
        onToken: function (delta, fullSoFar) {
          _lastAnswerText = mergeContinuation(baseText, String(fullSoFar || '').trimStart());
          if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(flushAnswer);
          }
        }
      });

      if (res && res.aborted) {
        _setGeneratingState(false, _t('slmStatusReady', 'AI Ready'));
        return;
      }
      if (res && !res.ok) {
        throw new Error(res.error || 'AI generation failed');
      }

      if (res && res.text && _lastAnswerText === baseText) {
        _lastAnswerText = mergeContinuation(baseText, String(res.text || '').trim());
      }
      flushAnswer();

      var elapsed = ((performance.now() - _genStartTime) / 1000).toFixed(1);
      if (answerTime) answerTime.textContent = elapsed + 's';
      _setGeneratingState(false, _t('boardAiDoneIn', 'Generated in {time}s').replace('{time}', elapsed));
      _clampPopoverToViewport();
    } catch (err) {
      if (err && err.name === 'AbortError') {
        flushAnswer();
        _setGeneratingState(false, _t('slmStatusReady', 'AI Ready'));
      } else {
        console.warn('[Board AI] Continue error:', err);
        _setGeneratingState(false, _t('boardAiErrorGen', 'Generation failed — try again'));
      }
    } finally {
      _stopTimer();
    }
  }

  function _addAnswerAsNote() {
    if (!_lastAnswerText || typeof window.conAddNoteObject !== 'function') return;
    if (typeof window.conPushUndo === 'function') window.conPushUndo();

    var ctx = _activeContext || boardAiResolveSelection();
    var noteX = Math.max(30, (ctx.anchorX || 200) + 90);
    var noteY = Math.max(30, (ctx.anchorY || 200) - 40);
    var linkedNodeId = (!_contextDismissed && ctx.nodes.length === 1) ? ctx.nodes[0].id : null;

    var noteObj = window.conAddNoteObject({
      nodeId: linkedNodeId,
      text: _lastAnswerText,
      html: _formatAnswerHtml(_lastAnswerText),
      x: noteX,
      y: noteY,
      bg: '#fef9c3',
      color: '#1e1e1e',
      fontSize: 14,
      width: 280,
      height: 110
    });

    if (noteObj && !_contextDismissed) {
      var anchors = ctx.nodes.map(function (n) { return n.id; }).concat(ctx.notes.map(function (nt) { return nt.id; }));
      anchors.forEach(function (aId) {
        if (String(aId) !== String(noteObj.id) && typeof window.conAddEdge === 'function') {
          window.conAddEdge(aId, noteObj.id, 'forward', '#e2c96e');
        }
      });
      if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
    }

    if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
    if (!window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
      window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
    }
    boardAiClosePopover();
  }

  Board.ai = {
    openPopover: boardAiOpenPopover,
    closePopover: boardAiClosePopover,
    resolveSelection: boardAiResolveSelection,
    askQuestion: boardAiAskQuestion
  };

  global.boardAiOpenPopover = boardAiOpenPopover;
  global.boardAiClosePopover = boardAiClosePopover;
  global.boardAiRunCurrentAction = boardAiAskQuestion;
})(typeof window !== 'undefined' ? window : this);
