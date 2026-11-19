/**
 * Class Management Tools — Document Editor AI Studio (Ask AI Popover)
 * Fast, offline Q&A and writing assistant powered by local SLMs (window.SlmService).
 * Mirrors the Board Note AI Studio experience, tailored for Document Editor.
 */
(function (global) {
  'use strict';

  var _popoverEl = null;
  var _isGenerating = false;
  var _capturedContext = null; // { text, source, monacoRange, wysiwygRange, anchorRect }
  var _contextDismissed = false;
  var _lastAnswerText = '';
  var _lastUserPrompt = '';
  var _lastSysPrompt = '';
  var _answerLength = 'brief'; // 'brief' | 'long'
  var _genStartTime = 0;
  var _timerInterval = null;

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

  function _formatAnswerHtml(rawText) {
    var escaped = _escapeHtml(String(rawText || '').trim());
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    escaped = escaped.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, '$1<i>$2</i>');
    return escaped.replace(/\r?\n/g, '<br>');
  }

  function _notifyToast(msg, isErr) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, !!isErr);
    }
  }

  function _resolveSelectionContext(options) {
    options = options || {};
    if (typeof options.text === 'string' && options.text.trim()) {
      return {
        text: options.text.trim(),
        source: options.source || 'explicit',
        monacoRange: options.monacoRange || null,
        wysiwygRange: options.wysiwygRange || null,
        anchorRect: options.anchorRect || null
      };
    }

    if (window.deAiEditorBridge && typeof window.deAiEditorBridge.getSelectionContext === 'function') {
      try {
        var ctx = window.deAiEditorBridge.getSelectionContext();
        if (ctx) return ctx;
      } catch (_) {}
    }

    var winSel = window.getSelection ? window.getSelection() : null;
    var winText = winSel ? String(winSel.toString() || '').trim() : '';
    var anchorRect = null;
    if (winText && winSel.rangeCount > 0) {
      try {
        var r = winSel.getRangeAt(0).getBoundingClientRect();
        if (r && (r.width > 0 || r.height > 0)) anchorRect = r;
      } catch (_) {}
    }
    return {
      text: winText,
      source: winText ? 'selection' : 'none',
      monacoRange: null,
      wysiwygRange: null,
      anchorRect: anchorRect
    };
  }

  function _ensurePopoverDom() {
    if (_popoverEl && document.body.contains(_popoverEl)) return _popoverEl;

    if (!document.getElementById('de-ai-popover-styles')) {
      var style = document.createElement('style');
      style.id = 'de-ai-popover-styles';
      style.textContent = [
        '#de-ai-popover {',
        '  position: fixed;',
        '  z-index: 10050;',
        '  width: 400px;',
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
        '#de-ai-popover.visible { display: flex; }',
        '.deai-header {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  gap: 8px;',
        '  padding: 9px 12px;',
        '  background: #ffffff;',
        '  border-bottom: 2px solid #333333;',
        '}',
        '.deai-title-wrap {',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 7px;',
        '  font-weight: 800;',
        '  font-size: 0.9rem;',
        '}',
        '.deai-title-icon {',
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
        '.deai-title-icon img { width: 14px; height: 14px; }',
        '.deai-model-chip {',
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
        '.deai-model-chip:hover { background: #e2c96e; }',
        '.deai-close-btn {',
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
        '.deai-close-btn:hover { background: #f2dede; }',
        '.deai-context-bar {',
        '  display: none;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  gap: 6px;',
        '  padding: 6px 12px;',
        '  background: #eaeae4;',
        '  border-bottom: 1.5px solid #333333;',
        '  font-size: 0.72rem;',
        '}',
        '.deai-context-pills {',
        '  display: flex;',
        '  flex-wrap: wrap;',
        '  gap: 4px;',
        '  flex: 1;',
        '  min-width: 0;',
        '}',
        '.deai-ctx-pill {',
        '  display: inline-flex;',
        '  align-items: center;',
        '  gap: 4px;',
        '  padding: 2px 7px;',
        '  background: #fef9c3;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 4px;',
        '  font-size: 0.7rem;',
        '  font-weight: 700;',
        '  max-width: 270px;',
        '  overflow: hidden;',
        '  text-overflow: ellipsis;',
        '  white-space: nowrap;',
        '}',
        '.deai-ctx-clear {',
        '  background: #ffffff;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 4px;',
        '  padding: 2px 6px;',
        '  font-size: 0.68rem;',
        '  font-weight: 700;',
        '  cursor: pointer;',
        '  font-family: inherit;',
        '}',
        '.deai-ctx-clear:hover { background: #f2dede; }',
        '.deai-body {',
        '  padding: 10px 12px;',
        '  display: flex;',
        '  flex-direction: column;',
        '  gap: 8px;',
        '}',
        '.deai-quick-prompts {',
        '  display: flex;',
        '  flex-wrap: wrap;',
        '  gap: 5px;',
        '}',
        '.deai-quick-pill {',
        '  padding: 3px 8px;',
        '  font-size: 0.72rem;',
        '  font-weight: 700;',
        '  background: #ffffff;',
        '  color: #1e1e1e;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 6px;',
        '  box-shadow: 1.5px 1.5px 0 #555555;',
        '  cursor: pointer;',
        '  font-family: inherit;',
        '}',
        '.deai-quick-pill:hover { background: #e2c96e; }',
        '.deai-textarea {',
        '  width: 100%;',
        '  box-sizing: border-box;',
        '  min-height: 54px;',
        '  max-height: 120px;',
        '  resize: vertical;',
        '  padding: 8px 10px;',
        '  border: 2px solid #333333;',
        '  border-radius: 6px;',
        '  background: #ffffff;',
        '  color: #1e1e1e;',
        '  font-family: inherit;',
        '  font-size: 0.82rem;',
        '  line-height: 1.4;',
        '}',
        '.deai-textarea:focus {',
        '  outline: none;',
        '  box-shadow: 2px 2px 0 #333333;',
        '}',
        '.deai-footer {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  gap: 6px;',
        '  flex-wrap: wrap;',
        '}',
        '.deai-length-toggle {',
        '  display: inline-flex;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 6px;',
        '  overflow: hidden;',
        '  background: #ffffff;',
        '}',
        '.deai-length-btn {',
        '  border: none;',
        '  background: transparent;',
        '  padding: 3px 8px;',
        '  font-size: 0.7rem;',
        '  font-weight: 700;',
        '  cursor: pointer;',
        '  font-family: inherit;',
        '  color: #1e1e1e;',
        '}',
        '.deai-length-btn.active { background: #e2c96e; }',
        '.deai-word-limit {',
        '  display: inline-flex;',
        '  align-items: center;',
        '  gap: 4px;',
        '  font-size: 0.7rem;',
        '  font-weight: 700;',
        '  color: #444444;',
        '}',
        '.deai-word-limit-num {',
        '  width: 44px;',
        '  padding: 2px 4px;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 4px;',
        '  font-family: inherit;',
        '  font-size: 0.7rem;',
        '  font-weight: 700;',
        '  background: #ffffff;',
        '}',
        '.deai-status-text {',
        '  font-size: 0.7rem;',
        '  font-weight: 700;',
        '  color: #555555;',
        '  flex: 1;',
        '  min-width: 90px;',
        '}',
        '.deai-btn {',
        '  display: inline-flex;',
        '  align-items: center;',
        '  gap: 5px;',
        '  padding: 5px 11px;',
        '  font-size: 0.76rem;',
        '  font-weight: 800;',
        '  border: 1.5px solid #333333;',
        '  border-radius: 6px;',
        '  box-shadow: 2px 2px 0 #555555;',
        '  background: #ffffff;',
        '  color: #1e1e1e;',
        '  cursor: pointer;',
        '  font-family: inherit;',
        '}',
        '.deai-btn:hover:not(:disabled) { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 #555555; }',
        '.deai-btn:disabled { opacity: 0.55; cursor: not-allowed; }',
        '.deai-btn-primary { background: #e2c96e; }',
        '.deai-btn-success { background: #6abf8e; }',
        '.deai-btn-danger { background: #f2b5b5; }',
        '.deai-btn-sm { padding: 4px 8px; font-size: 0.71rem; }',
        '.deai-answer-box {',
        '  display: none;',
        '  flex-direction: column;',
        '  border-top: 2px solid #333333;',
        '  background: #ffffff;',
        '}',
        '.deai-answer-box.visible { display: flex; }',
        '.deai-answer-head {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  padding: 5px 12px;',
        '  background: #eaeae4;',
        '  border-bottom: 1.5px solid #333333;',
        '  font-size: 0.68rem;',
        '  font-weight: 800;',
        '  text-transform: uppercase;',
        '  letter-spacing: 0.4px;',
        '}',
        '.deai-answer-content {',
        '  padding: 10px 12px;',
        '  font-size: 0.82rem;',
        '  line-height: 1.48;',
        '  color: #1e1e1e;',
        '  max-height: 210px;',
        '  overflow-y: auto;',
        '  word-wrap: break-word;',
        '}',
        '.deai-answer-actions {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: flex-end;',
        '  flex-wrap: wrap;',
        '  gap: 6px;',
        '  padding: 7px 12px;',
        '  background: #f5f5f0;',
        '  border-top: 1.5px solid #333333;',
        '}'
      ].join('\n');
      document.head.appendChild(style);
    }

    var pop = document.createElement('div');
    pop.id = 'de-ai-popover';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', _t('boardAiAskTitle', 'Ask AI'));
    pop.innerHTML = [
      '<div class="deai-header">',
      '  <div class="deai-title-wrap">',
      '    <span class="deai-title-icon"><img src="../assets/icons/sparkles.svg" alt="" /></span>',
      '    <span id="deai-header-title">' + _escapeHtml(_t('boardAiAskTitle', 'Ask AI')) + '</span>',
      '  </div>',
      '  <div style="display:flex;align-items:center;gap:6px;">',
      '    <button type="button" class="deai-model-chip" id="deai-model-chip-btn" title="' + _escapeHtml(_t('slmManageModelsTitle', 'Local AI Language Models')) + '">',
      '      <img src="../assets/icons/brain.svg" style="width:12px;height:12px;" alt="" />',
      '      <span id="deai-model-chip-label">AI Model</span>',
      '    </button>',
      '    <button type="button" class="deai-close-btn" id="deai-close-btn" title="' + _escapeHtml(_t('slmClose', 'Close')) + '">',
      '      <img src="../assets/icons/close.svg" style="width:12px;height:12px;" alt="" />',
      '    </button>',
      '  </div>',
      '</div>',
      '<div class="deai-context-bar" id="deai-context-bar">',
      '  <div class="deai-context-pills" id="deai-context-pills"></div>',
      '  <button type="button" class="deai-ctx-clear" id="deai-clear-ctx-btn" title="' + _escapeHtml(_t('boardAiClearContext', 'Clear context')) + '">' + _escapeHtml(_t('boardAiClearBtn', 'Clear')) + '</button>',
      '</div>',
      '<div class="deai-body">',
      '  <div class="deai-quick-prompts" id="deai-quick-prompts">',
      '    <button type="button" class="deai-quick-pill" data-prompt-key="meaning">' + _escapeHtml(_t('boardAiQuickMeaning', 'Meaning')) + '</button>',
      '    <button type="button" class="deai-quick-pill" data-prompt-key="explain">' + _escapeHtml(_t('boardAiQuickExplain', 'Explain')) + '</button>',
      '    <button type="button" class="deai-quick-pill" data-prompt-key="translate">' + _escapeHtml(_t('boardAiQuickTranslate', 'Translate')) + '</button>',
      '    <button type="button" class="deai-quick-pill" data-prompt-key="example">' + _escapeHtml(_t('boardAiQuickExample', 'Example')) + '</button>',
      '    <button type="button" class="deai-quick-pill" data-prompt-key="synonyms">' + _escapeHtml(_t('boardAiQuickSynonyms', 'Synonyms')) + '</button>',
      '    <button type="button" class="deai-quick-pill" data-prompt-key="antonyms">' + _escapeHtml(_t('boardAiQuickAntonyms', 'Antonyms')) + '</button>',
      '  </div>',
      '  <textarea class="deai-textarea" id="deai-question-input" rows="2" placeholder="' + _escapeHtml(_t('boardAiAskPlaceholder', 'Ask a question…')) + '"></textarea>',
      '  <div class="deai-footer">',
      '    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">',
      '      <div class="deai-length-toggle" id="deai-length-toggle">',
      '        <button type="button" class="deai-length-btn active" data-length="brief">' + _escapeHtml(_t('boardAiLengthBrief', 'Brief')) + '</button>',
      '        <button type="button" class="deai-length-btn" data-length="long">' + _escapeHtml(_t('boardAiLengthLong', 'Long')) + '</button>',
      '      </div>',
      '      <label class="deai-word-limit" title="' + _escapeHtml(_t('boardAiWordLimitTitle', 'Limit answer length in words')) + '">',
      '        <input type="checkbox" id="deai-word-limit-chk" />',
      '        <span>' + _escapeHtml(_t('boardAiWordLimitPrefix', 'Max')) + '</span>',
      '        <input type="number" id="deai-word-limit-num" class="deai-word-limit-num" min="5" max="500" step="5" value="30" />',
      '        <span>' + _escapeHtml(_t('boardAiWordLimitSuffix', 'words')) + '</span>',
      '      </label>',
      '    </div>',
      '    <div class="deai-status-text" id="deai-status-text">' + _escapeHtml(_t('slmStatusReady', 'AI Ready')) + '</div>',
      '    <div style="display:flex;align-items:center;gap:6px;">',
      '      <button type="button" class="deai-btn deai-btn-danger" id="deai-stop-btn" style="display:none;">',
      '        <img src="../assets/icons/stop.svg" style="width:11px;height:11px;" alt="" />',
      '        <span>' + _escapeHtml(_t('boardAiStopBtn', 'Stop')) + '</span>',
      '      </button>',
      '      <button type="button" class="deai-btn deai-btn-primary" id="deai-run-btn">',
      '        <img src="../assets/icons/sparkles.svg" style="width:13px;height:13px;" alt="" />',
      '        <span>' + _escapeHtml(_t('boardAiAskBtn', 'Ask')) + '</span>',
      '      </button>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="deai-answer-box" id="deai-answer-box">',
      '  <div class="deai-answer-head">',
      '    <span>' + _escapeHtml(_t('boardAiAnswerLabel', 'Answer')) + '</span>',
      '    <span id="deai-answer-time"></span>',
      '  </div>',
      '  <div class="deai-answer-content" id="deai-answer-content"></div>',
      '  <div class="deai-answer-actions" id="deai-answer-actions">',
      '    <button type="button" class="deai-btn deai-btn-sm" id="deai-continue-btn">',
      '      <img src="../assets/icons/arrow-right.svg" style="width:11px;height:11px;" alt="" />',
      '      <span>' + _escapeHtml(_t('boardAiGoOnBtn', 'Go on')) + '</span>',
      '    </button>',
      '    <button type="button" class="deai-btn deai-btn-sm" id="deai-copy-btn">',
      '      <img src="../assets/icons/copy.svg" style="width:11px;height:11px;" alt="" />',
      '      <span>' + _escapeHtml(_t('boardAiCopyAnswer', 'Copy')) + '</span>',
      '    </button>',
      '    <button type="button" class="deai-btn deai-btn-sm" id="deai-replace-btn" style="display:none;">',
      '      <img src="../assets/icons/edit.svg" style="width:11px;height:11px;" alt="" />',
      '      <span>' + _escapeHtml(_t('deAiReplaceBtn', 'Replace')) + '</span>',
      '    </button>',
      '    <button type="button" class="deai-btn deai-btn-sm deai-btn-success" id="deai-insert-btn">',
      '      <img src="../assets/icons/plus.svg" style="width:11px;height:11px;" alt="" />',
      '      <span>' + _escapeHtml(_t('deAiInsertBtn', 'Insert')) + '</span>',
      '    </button>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(pop);
    _popoverEl = pop;

    document.getElementById('deai-close-btn').addEventListener('click', function () {
      deAiClosePopover();
    });

    document.getElementById('deai-model-chip-btn').addEventListener('click', function () {
      if (typeof window.openSlmModelManager === 'function') {
        window.openSlmModelManager({
          onSelectModel: function () { _refreshModelChip(); }
        });
      }
    });

    document.getElementById('deai-clear-ctx-btn').addEventListener('click', function () {
      _contextDismissed = true;
      _renderContextBar();
      _updateReplaceBtnVisibility();
    });

    var QUICK_PROMPTS = {
      meaning: _t('boardAiQuickMeaningPrompt', 'Give a clear, simple definition of this word:'),
      explain: _t('boardAiQuickExplainPrompt', 'Explain this concept clearly in simple terms:'),
      translate: _t('boardAiQuickTranslatePrompt', 'Translate this into French (or English if already French) and note its part of speech:'),
      example: _t('boardAiQuickExamplePrompt', 'Write 2 short, natural example sentences that each include the target word:'),
      synonyms: _t('boardAiQuickSynonymsPrompt', 'List 4-5 common synonyms for this word:'),
      antonyms: _t('boardAiQuickAntonymsPrompt', 'List 4-5 common antonyms for this word:')
    };

    document.getElementById('deai-quick-prompts').addEventListener('click', function (e) {
      var btn = e.target.closest('.deai-quick-pill');
      if (!btn || _isGenerating) return;
      var key = btn.getAttribute('data-prompt-key');
      var promptText = QUICK_PROMPTS[key] || '';
      var qInput = document.getElementById('deai-question-input');
      if (!qInput || !promptText) return;
      if (key === 'example' && !_contextDismissed && _capturedContext && _capturedContext.text) {
        var snippet = _capturedContext.text.split(/\s+/).slice(0, 6).join(' ');
        promptText = _t('boardAiQuickExampleWithWord', 'Write 2 short, natural example sentences that each contain {word}.')
          .replace('{word}', '"' + snippet + '"');
      }
      qInput.value = promptText;
      deAiAskQuestion();
    });

    document.getElementById('deai-length-toggle').addEventListener('click', function (e) {
      var btn = e.target.closest('.deai-length-btn');
      if (!btn || _isGenerating) return;
      _answerLength = btn.getAttribute('data-length') === 'long' ? 'long' : 'brief';
      var btns = document.querySelectorAll('#deai-length-toggle .deai-length-btn');
      btns.forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-length') === _answerLength);
      });
    });

    document.getElementById('deai-question-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        deAiAskQuestion();
      }
    });

    document.getElementById('deai-run-btn').addEventListener('click', function () {
      deAiAskQuestion();
    });

    document.getElementById('deai-stop-btn').addEventListener('click', function () {
      if (window.SlmService) window.SlmService.abort();
      _stopTimer();
      _setGeneratingState(false, _t('slmStatusReady', 'AI Ready'));
    });

    document.getElementById('deai-continue-btn').addEventListener('click', function () {
      deAiContinueAnswer();
    });

    document.getElementById('deai-copy-btn').addEventListener('click', function () {
      if (!_lastAnswerText) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(_lastAnswerText).then(function () {
          _notifyToast(_t('boardAiCopied', 'Copied to clipboard'));
        }).catch(function () {});
      }
    });

    document.getElementById('deai-insert-btn').addEventListener('click', function () {
      _insertAnswerIntoDocument(false);
    });

    document.getElementById('deai-replace-btn').addEventListener('click', function () {
      _insertAnswerIntoDocument(true);
    });

    document.addEventListener('pointerdown', function (e) {
      if (!_popoverEl || !_popoverEl.classList.contains('visible')) return;
      if (_popoverEl.contains(e.target)) return;
      var slmModal = document.getElementById('slm-model-overlay') || document.getElementById('slm-model-modal-backdrop');
      if (slmModal && slmModal.contains(e.target)) return;
      if (e.target.closest && (
        e.target.closest('#btn-de-ai-studio') ||
        e.target.closest('#tb-ai-studio') ||
        e.target.closest('#btn-de-dict-pill-ai')
      )) return;
      deAiClosePopover();
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _popoverEl && _popoverEl.classList.contains('visible')) {
        var slmModal = document.getElementById('slm-model-overlay') || document.getElementById('slm-model-modal-backdrop');
        if (slmModal && slmModal.style.display !== 'none') return;
        e.preventDefault();
        e.stopPropagation();
        deAiClosePopover();
      }
    });

    return pop;
  }

  function _updateReplaceBtnVisibility() {
    var replaceBtn = document.getElementById('deai-replace-btn');
    if (!replaceBtn) return;
    var canReplace = Boolean(
      !_contextDismissed &&
      _capturedContext &&
      _capturedContext.text &&
      (_capturedContext.monacoRange || _capturedContext.wysiwygRange)
    );
    replaceBtn.style.display = canReplace ? 'inline-flex' : 'none';
  }

  function _renderContextBar() {
    var bar = document.getElementById('deai-context-bar');
    var pillsEl = document.getElementById('deai-context-pills');
    if (!bar || !pillsEl) return;

    if (_contextDismissed || !_capturedContext || !_capturedContext.text) {
      bar.style.display = 'none';
      pillsEl.innerHTML = '';
      return;
    }

    var txt = _capturedContext.text.trim().replace(/\s+/g, ' ');
    if (txt.length > 42) txt = txt.slice(0, 40) + '…';
    pillsEl.innerHTML = '<span class="deai-ctx-pill">' + _escapeHtml(txt) + '</span>';
    bar.style.display = 'flex';
  }

  async function _refreshModelChip() {
    var chipLabel = document.getElementById('deai-model-chip-label');
    var statusEl = document.getElementById('deai-status-text');
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
    var timeEl = document.getElementById('deai-answer-time');
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
    var runBtn = document.getElementById('deai-run-btn');
    var stopBtn = document.getElementById('deai-stop-btn');
    var statusEl = document.getElementById('deai-status-text');
    var actionsEl = document.getElementById('deai-answer-actions');
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

  function deAiOpenPopover(options, anchorEl) {
    options = options || {};
    _capturedContext = _resolveSelectionContext(options);
    _contextDismissed = false;

    var pop = _ensurePopoverDom();
    _renderContextBar();
    _updateReplaceBtnVisibility();
    _refreshModelChip();

    pop.classList.add('visible');

    var targetLeft = Math.round((window.innerWidth - 400) / 2);
    var targetTop = 84;
    if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
      var r = anchorEl.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) {
        targetLeft = r.left;
        targetTop = r.bottom + 8;
      }
    } else if (_capturedContext && _capturedContext.anchorRect) {
      var ar = _capturedContext.anchorRect;
      targetLeft = ar.left;
      targetTop = ar.bottom + 10;
    }

    pop.style.left = Math.round(targetLeft) + 'px';
    pop.style.top = Math.round(targetTop) + 'px';
    _clampPopoverToViewport();

    var qInput = document.getElementById('deai-question-input');
    if (qInput) {
      setTimeout(function () { qInput.focus(); }, 30);
    }
  }

  function deAiClosePopover() {
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
      _notifyToast(_t('slmErrorNotInstalled', 'The selected AI model is not downloaded yet. Please download it in the AI Models Manager.'), true);
      if (typeof window.openSlmModelManager === 'function') {
        window.openSlmModelManager({
          onSelectModel: function () { _refreshModelChip(); }
        });
      }
      return false;
    }
    return true;
  }

  function _buildCompactPrompt(question) {
    if (!_contextDismissed && _capturedContext && _capturedContext.text) {
      var snippet = _capturedContext.text.trim().slice(0, 1200);
      var wordCount = snippet.split(/\s+/).length;
      if (wordCount <= 8 && snippet.indexOf('\n') === -1) {
        return 'Words: ' + snippet + '\n\nQuestion: ' + question;
      }
      return 'Text:\n"""\n' + snippet + '\n"""\n\nQuestion: ' + question;
    }
    return question;
  }

  async function deAiAskQuestion() {
    if (_isGenerating) return;
    var qInput = document.getElementById('deai-question-input');
    var question = qInput ? qInput.value.trim() : '';
    if (!question) {
      if (qInput) qInput.focus();
      return;
    }

    var ready = await _ensureSlmModelInstalled();
    if (!ready) return;

    var answerBox = document.getElementById('deai-answer-box');
    var answerContent = document.getElementById('deai-answer-content');
    var answerTime = document.getElementById('deai-answer-time');
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
    var sysPrompt = isLong
      ? 'Answer clearly and thoroughly in 3-5 complete sentences.'
      : 'Be concise. No intro or filler. For definitions or explanations: 1 short, complete sentence. For synonyms, antonyms, or translations: comma-separated words only.';
    var maxTokens = isLong ? 360 : 120;
    var wordLimitChk = document.getElementById('deai-word-limit-chk');
    var wordLimitNum = document.getElementById('deai-word-limit-num');
    if (wordLimitChk && wordLimitChk.checked && wordLimitNum) {
      var limitWords = Math.max(5, Math.min(500, parseInt(wordLimitNum.value, 10) || 30));
      sysPrompt += ' Limit your answer to at most ' + limitWords + ' words.';
      maxTokens = Math.max(40, Math.ceil(limitWords * 1.8) + 20);
    }
    var temp = isLong ? 0.3 : 0.15;
    var compactPrompt = _buildCompactPrompt(question);
    _lastSysPrompt = sysPrompt;
    _lastUserPrompt = compactPrompt;

    try {
      var res = await window.SlmService.generateText({
        systemPrompt: sysPrompt,
        userPrompt: compactPrompt,
        temperature: temp,
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
        console.warn('[Document Editor AI] Question error:', err);
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

  async function deAiContinueAnswer() {
    if (_isGenerating || !_lastAnswerText || !window.SlmService) return;

    var answerContent = document.getElementById('deai-answer-content');
    var answerTime = document.getElementById('deai-answer-time');
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
    var temp = isLong ? 0.3 : 0.15;

    try {
      var res = await window.SlmService.generateText({
        messages: [
          { role: 'system', content: _lastSysPrompt || 'Complete the response concisely without repeating previous text.' },
          { role: 'user', content: _lastUserPrompt || 'Answer the question.' },
          { role: 'assistant', content: baseText },
          { role: 'user', content: 'Go on and complete the incomplete sentence or thought from where you stopped, without repeating what you already wrote.' }
        ],
        temperature: temp,
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
        console.warn('[Document Editor AI] Continue error:', err);
        _setGeneratingState(false, _t('boardAiErrorGen', 'Generation failed — try again'));
      }
    } finally {
      _stopTimer();
    }
  }

  function _insertAnswerIntoDocument(replace) {
    if (!_lastAnswerText) return;
    if (window.deAiEditorBridge) {
      var ok = false;
      if (replace && typeof window.deAiEditorBridge.replaceSelection === 'function') {
        ok = window.deAiEditorBridge.replaceSelection(_lastAnswerText, _formatAnswerHtml(_lastAnswerText), _capturedContext);
      } else if (typeof window.deAiEditorBridge.insertAnswer === 'function') {
        ok = window.deAiEditorBridge.insertAnswer(_lastAnswerText, _formatAnswerHtml(_lastAnswerText), _capturedContext);
      }
      if (ok) {
        _notifyToast(_t('deAiInsertedToast', 'Inserted into document'));
        deAiClosePopover();
        return;
      }
    }
    if (typeof window.insertTextAtCursor === 'function') {
      window.insertTextAtCursor(_lastAnswerText);
      _notifyToast(_t('deAiInsertedToast', 'Inserted into document'));
      deAiClosePopover();
    }
  }

  global.deAiOpenPopover = deAiOpenPopover;
  global.deAiClosePopover = deAiClosePopover;
  global.deAiAskQuestion = deAiAskQuestion;
})(typeof window !== 'undefined' ? window : this);
