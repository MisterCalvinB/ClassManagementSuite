/**
 * Class Management Tools — Board Search & Word Frequency Engine
 * Board search engine, cropped visual preview, word frequency analysis (WFA), and laser pointer.
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

    // ================================================================
    // WORD FREQUENCY ANALYSIS (WFA)
    // ================================================================

    const WFA_STOPWORDS = new Set([
      // Articles
      'a', 'an', 'the',
      // Demonstratives / determiners
      'this', 'that', 'these', 'those', 'each', 'every', 'either', 'neither',
      'both', 'all', 'any', 'some', 'no', 'such', 'few', 'little', 'much',
      'many', 'more', 'most', 'less', 'least', 'other', 'another',
      // Personal pronouns
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves',
      // Possessives
      'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
      // Relative / interrogative
      'who', 'whom', 'whose', 'which', 'what', 'where', 'when', 'why', 'how',
      // Auxiliaries / modals
      'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'having',
      'do', 'does', 'did', 'done', 'doing',
      'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'must', 'need', 'ought',
      // Prepositions
      'in', 'on', 'at', 'to', 'of', 'for', 'with', 'by', 'from', 'about', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
      'over', 'out', 'up', 'down', 'off', 'around', 'along', 'near', 'behind', 'beside',
      'among', 'within', 'without', 'against', 'toward', 'towards', 'upon', 'per',
      // Conjunctions
      'and', 'but', 'or', 'nor', 'so', 'yet', 'if', 'when', 'where', 'while',
      'although', 'because', 'though', 'unless', 'since', 'than', 'whereas', 'whether',
      // Common adverbs / function words
      'just', 'very', 'too', 'quite', 'rather', 'really', 'also', 'even', 'still',
      'already', 'never', 'always', 'often', 'sometimes', 'again', 'here', 'there',
      'now', 'then', 'well', 'back', 'away', 'only', 'enough', 'not',
      // Contractions / auxiliary fragments
      'nt', 've', 'll', 're', 'd', 's',
    ]);

    const WFA_TIER_KEYS = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'];
    // Percentile thresholds for tier assignment (by rank in sorted list)
    const WFA_TIER_BREAKS = [0.05, 0.12, 0.22, 0.35, 0.50, 0.67, 0.84];

    // Simple English stemmer: collapses plural -s/-es/-ies, past -ed/-ied, gerund -ing
    function wfaStem(w) {
      if (!w || w.length <= 2) return w;
      const len = w.length;
      // -ing → base form
      if (len > 5 && w.endsWith('ing')) {
        const r = w.slice(0, -3);
        if (r.length >= 3 && r[r.length - 1] === r[r.length - 2]) return r.slice(0, -1); // running→run
        if (r.length >= 2 && 'aeiou'.includes(r[r.length - 1])) return r;              // being→be (edge)
        return r;                                                                            // jumping→jump
      }
      // -ied → -y
      if (len > 4 && w.endsWith('ied')) return w.slice(0, -3) + 'y';
      // -ed → base form
      if (len > 4 && w.endsWith('ed')) {
        const r = w.slice(0, -2);
        if (r.length >= 3 && r[r.length - 1] === r[r.length - 2]) return r.slice(0, -1); // stopped→stop
        return r;                                                                            // walked→walk
      }
      // -ies → -y
      if (len > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
      // -es (only for -ches, -shes, -xes, -zes, -ses → drop -es; else drop just -s)
      if (len > 4 && w.endsWith('es')) {
        const r = w.slice(0, -2);
        const last2 = r.slice(-2);
        if (['ch', 'sh', 'ss'].includes(last2) || 'xz'.includes(r[r.length - 1])) return r;
        return w.slice(0, -1);
      }
      // simple -s
      if (len > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
      return w;
    }

    var _wfaSource = null;  // 'ta' | 'search'
    var _wfaStemMap = {};    // stem → { count, forms, tier, displayWord }

    function wfaOpen(source) {
      // Toggle off if already open for the same source
      const panel = document.getElementById('wfa-panel');
      if (panel.classList.contains('visible') && _wfaSource === source) {
        wfaClose();
        return;
      }
      _wfaSource = source;

      let rawWords = [];
      if (source === 'ta') {
        if (!taLines || !taLines.flat().length) {
          mdbToast('⚠️ No text to analyse. Please paste and analyse a text first.');
          return;
        }
        rawWords = taLines.flat().map(tok => tok.text);
      } else {
        if (typeof searchBookText === 'undefined' || !searchBookText) {
          mdbToast('⚠️ No book loaded. Please import a book first.');
          return;
        }
        rawWords = searchBookText.match(/[\w\u2018\u2019''']+/g) || [];
      }

      // Build frequency map grouped by stem
      _wfaStemMap = {};
      rawWords.forEach(raw => {
        if (!raw) return;
        const lower = raw.toLowerCase().replace(/['''\u2018\u2019]/g, '');
        if (lower.length < 2) return;
        if (/^\d+$/.test(lower)) return;
        if (WFA_STOPWORDS.has(lower)) return;
        const stem = wfaStem(lower);
        if (WFA_STOPWORDS.has(stem)) return;
        if (stem.length < 2) return;
        if (!_wfaStemMap[stem]) _wfaStemMap[stem] = { count: 0, forms: {} };
        _wfaStemMap[stem].count++;
        _wfaStemMap[stem].forms[lower] = (_wfaStemMap[stem].forms[lower] || 0) + 1;
      });

      // Sort: frequency descending, then alphabetically
      const entries = Object.entries(_wfaStemMap)
        .filter(([, d]) => d.count > 0)
        .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));

      if (!entries.length) {
        mdbToast('⚠️ No content words found to analyse.');
        return;
      }

      // Assign colour tiers by rank percentile
      const total = entries.length;
      entries.forEach(([, data], i) => {
        const pct = total > 1 ? i / (total - 1) : 0;
        let tier = WFA_TIER_KEYS.length - 1;
        for (let t = 0; t < WFA_TIER_BREAKS.length; t++) {
          if (pct <= WFA_TIER_BREAKS[t]) { tier = t; break; }
        }
        data.tier = tier;
        // Show the most common surface form
        data.displayWord = Object.entries(data.forms).sort((a, b) => b[1] - a[1])[0][0];
      });

      wfaRenderPanel(entries);
      document.getElementById('wfa-panel').classList.add('visible');
      document.body.classList.add('wfa-open');
    }

    function wfaClose() {
      document.getElementById('wfa-panel').classList.remove('visible');
      document.body.classList.remove('wfa-open');
      wfaClearHighlights();
      _wfaSource = null;
    }

    function wfaRenderPanel(entries) {
      const list = document.getElementById('wfa-list');
      list.innerHTML = '';
      entries.forEach(([stem, data]) => {
        const item = document.createElement('div');
        item.className = 'wfa-item wfa-' + WFA_TIER_KEYS[data.tier];
        item.dataset.stem = stem;
        item.dataset.tier = data.tier;

        const wordEl = document.createElement('span');
        wordEl.className = 'wfa-item-word';
        wordEl.textContent = data.displayWord;

        const countEl = document.createElement('span');
        countEl.className = 'wfa-item-count';
        countEl.textContent = data.count;

        item.appendChild(wordEl);
        item.appendChild(countEl);

        item.addEventListener('mouseenter', () => wfaHighlight(stem, data.tier));
        item.addEventListener('mouseleave', wfaClearHighlights);
        list.appendChild(item);
      });

      const title = document.getElementById('wfa-panel-title');
      title.textContent = 'Word Freq · ' + entries.length + ' words';
    }

    function wfaHighlight(stem, tier) {
      wfaClearHighlights();
      const cls1 = 'wfa-hl';
      const cls2 = 'wfa-hl-' + WFA_TIER_KEYS[tier];
      // Escape for use inside a quoted CSS attribute value selector
      const escaped = stem.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      if (_wfaSource === 'ta') {
        document.querySelectorAll('.ta-cell[data-stem="' + escaped + '"]').forEach(el => {
          el.classList.add(cls1, cls2);
        });
      } else if (_wfaSource === 'search') {
        document.querySelectorAll('#search-results .wfa-tok[data-stem="' + escaped + '"]').forEach(el => {
          el.classList.add(cls1, cls2);
        });
      }
    }

    function wfaClearHighlights() {
      document.querySelectorAll('.wfa-hl').forEach(el => {
        el.classList.remove('wfa-hl',
          'wfa-hl-t1', 'wfa-hl-t2', 'wfa-hl-t3', 'wfa-hl-t4',
          'wfa-hl-t5', 'wfa-hl-t6', 'wfa-hl-t7', 'wfa-hl-t8');
      });
    }



    // =========================================================================
    // CONSTELLATION BOARD SEARCH ENGINE & CROPPED VISUAL PREVIEW
    // =========================================================================
    let _conSearchScope = 'current'; // 'current' | 'all'
    let _conSearchTypeFilter = 'all'; // 'all' | 'node' | 'note' | 'table' | 'group'
    let _conSearchResults = [];
    let _conSearchSelectedItem = null;
    let _conSearchDebounceTimer = null;
    let _conCurrentSearchQuery = '';

    let _conSearchBoardCanvasData = null;
    let _conSearchBoardCanvasPromise = null;
    let _conSearchOtherPagesCanvases = {};

    
    /* ==========================================================================
       Offline Voice Recognition & Dictation Integration
       ========================================================================== */
    var _boardSttActive = false;
    var _boardSttLastTranscript = '';
    var _boardSttTargetSearch = false;
    var _boardSttTargetNote = null;
    var _boardSttTargetEditor = null;
    var _boardSttTargetNoteBtn = null;

    function wnToggleNoteDictation(noteData, editorEl, btnEl) {
      if (_boardSttActive && _boardSttTargetNote && _boardSttTargetNote.id === noteData.id) {
        boardStopDictation();
        return;
      }
      if (_boardSttActive) {
        boardStopDictation();
      }
      _boardSttTargetNote = noteData;
      _boardSttTargetEditor = editorEl;
      _boardSttTargetNoteBtn = btnEl;
      if (btnEl) btnEl.classList.add('active');
      boardStartDictation('note');
    }

    function wnInsertDictationTextIntoNote(noteData, editor, text) {
      if (!noteData || !editor || !text) return;
      editor.focus();

      var sel = window.getSelection && window.getSelection();
      var inside = false;
      if (sel && sel.rangeCount > 0) {
        var range = sel.getRangeAt(0);
        var anc = range.commonAncestorContainer;
        if (editor === anc || editor.contains(anc)) {
          inside = true;
        }
      }
      if (!inside && typeof wnRestoreSelection === 'function') {
        inside = wnRestoreSelection(editor);
      }
      if (!inside) {
        var r = document.createRange();
        r.selectNodeContents(editor);
        r.collapse(false);
        sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }

      var precedingChar = '';
      if (sel && sel.rangeCount > 0) {
        var curRange = sel.getRangeAt(0);
        if (curRange.startContainer.nodeType === 3 && curRange.startOffset > 0) {
          precedingChar = curRange.startContainer.textContent.charAt(curRange.startOffset - 1);
        } else if (curRange.startContainer.nodeType === 1 && curRange.startOffset > 0) {
          var prevNode = curRange.startContainer.childNodes[curRange.startOffset - 1];
          if (prevNode && prevNode.textContent) {
            precedingChar = prevNode.textContent.slice(-1);
          }
        }
      }

      var toInsert = text;
      if (precedingChar && !/\s/.test(precedingChar)) {
        toInsert = ' ' + toInsert;
      }

      try {
        document.execCommand('insertText', false, toInsert);
      } catch (_) {
        if (sel && sel.rangeCount > 0) {
          var insRange = sel.getRangeAt(0);
          insRange.deleteContents();
          var txtNode = document.createTextNode(toInsert);
          insRange.insertNode(txtNode);
          insRange.setStartAfter(txtNode);
          insRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(insRange);
        }
      }

      if (typeof wnRememberSelection === 'function') wnRememberSelection(editor);
      if (typeof wnSyncNoteDataFromEditor === 'function') wnSyncNoteDataFromEditor(noteData, editor);
      if (typeof conNoteAutosize === 'function') conNoteAutosize(editor, noteData);
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      if (typeof window._conMirrorSend === 'function') {
        window._conMirrorSend({
          type: 'note-text',
          id: String(noteData.id),
          html: noteData.html,
          text: noteData.text,
          baseWidth: noteData.liveBaseWidth,
          baseHeight: noteData.liveBaseHeight,
          width: noteData.width || noteData.liveBaseWidth,
          height: noteData.height || noteData.liveBaseHeight,
          manualSize: !!noteData.manualSize
        });
      }
    }

    function boardToggleDictation() {
      if (_boardSttActive) {
        boardStopDictation();
      } else {
        boardStartDictation();
      }
    }

    async function boardStartDictation(targetMode) {
      _boardSttTargetSearch = (targetMode === 'search');
      var isNoteTarget = (targetMode === 'note' && _boardSttTargetNote && _boardSttTargetEditor);
      var pill = document.getElementById('board-stt-live-pill');
      var btn = document.getElementById('con-dictate-btn');
      var statusText = document.getElementById('board-stt-status-text');
      var transcriptText = document.getElementById('board-stt-transcript-text');
      var meterFill = document.getElementById('board-stt-meter-fill');

      if (isNoteTarget && _boardSttTargetNoteBtn) {
        _boardSttTargetNoteBtn.classList.add('active');
      }

      if (!window.SpeechTranscriber) {
        if (typeof showToast === 'function') showToast((window.i18n ? i18n.t('sttMicError') : 'Microphone error'), true);
        return;
      }

      if (pill) {
        pill.style.display = 'flex';
        pill.className = 'board-stt-floating-pill listening';
      }
      if (btn) btn.classList.add('con-panel-active');
      if (statusText) statusText.textContent = (window.i18n ? i18n.t('sttPillListening') : 'Listening...');
      if (transcriptText) transcriptText.textContent = (window.i18n ? i18n.t('sttPillSpeakPrompt') : 'Speak now...');
      if (meterFill) meterFill.style.width = '0%';

      _boardSttLastTranscript = '';
      _boardSttActive = true;

      var pillModelName = document.getElementById('board-stt-model-name');
      if (pillModelName && window.SpeechTranscriber) {
        var curM = window.SpeechTranscriber.getActiveModel();
        var shortM = 'Tiny';
        if (curM === 'whisper-base') shortM = 'Base';
        if (curM === 'whisper-small') shortM = 'Small';
        pillModelName.textContent = shortM;
      }

      window.SpeechTranscriber.on('onMicLevel', function (level) {
        if (!_boardSttActive) return;
        var fill = document.getElementById('board-stt-meter-fill');
        if (fill) fill.style.width = Math.min(100, Math.round(level * 100)) + '%';
      });

      window.SpeechTranscriber.on('onInterimResult', function (fullPreview, interim) {
        if (!_boardSttActive) return;
        _boardSttLastTranscript = fullPreview;
        var box = document.getElementById('board-stt-transcript-text');
        if (box) box.textContent = fullPreview || (window.i18n ? i18n.t('sttPillSpeakPrompt') : 'Speak now...');

        if (_boardSttTargetSearch) {
          var sInp = document.getElementById('con-search-input');
          if (sInp) {
            sInp.value = fullPreview;
            if (typeof conExecuteSearchDebounced === 'function') conExecuteSearchDebounced();
          }
        }

        if (typeof _conMirrorSend === 'function') {
          _conMirrorSend({ type: 'stt-caption', text: fullPreview, active: true });
        }
      });

      window.SpeechTranscriber.on('onFinalResult', function (fullText, finalChunk) {
        if (!_boardSttActive) return;
        _boardSttLastTranscript = fullText;
        var box = document.getElementById('board-stt-transcript-text');
        if (box) box.textContent = fullText;

        if (_boardSttTargetNote && _boardSttTargetEditor) {
          var chunk = (finalChunk || fullText || '').trim();
          if (chunk) {
            wnInsertDictationTextIntoNote(_boardSttTargetNote, _boardSttTargetEditor, chunk);
          }
        }

        if (_boardSttTargetSearch) {
          var sInp = document.getElementById('con-search-input');
          if (sInp) {
            sInp.value = fullText;
            if (typeof conExecuteSearch === 'function') conExecuteSearch();
          }
        }

        if (typeof _conMirrorSend === 'function') {
          _conMirrorSend({ type: 'stt-caption', text: fullText, active: true });
        }
      });

      window.SpeechTranscriber.on('onStateChange', function (newState) {
        var p = document.getElementById('board-stt-live-pill');
        var sTxt = document.getElementById('board-stt-status-text');
        if (!p) return;
        if (newState === 'listening') {
          p.className = 'board-stt-floating-pill listening';
          if (sTxt) sTxt.textContent = (window.i18n ? i18n.t('sttPillListening') : 'Listening...');
        } else if (newState === 'processing') {
          p.className = 'board-stt-floating-pill processing';
          if (sTxt) sTxt.textContent = (window.i18n ? i18n.t('sttPillProcessing') : 'Transcribing...');
        } else if (newState === 'idle') {
          if (_boardSttActive) boardStopDictation();
        }
      });

      window.SpeechTranscriber.on('onError', function (errMsg) {
        console.warn('STT error:', errMsg);
        if (typeof showToast === 'function') {
          showToast(window.i18n ? i18n.t('sttMicError') : 'Microphone error', true);
        }
        boardStopDictation();
      });

      var langSel = document.getElementById('board-stt-lang-select');
      var langVal = (langSel && langSel.value) ? langSel.value : 'auto';
      var success = await window.SpeechTranscriber.start({ language: langVal });
      if (!success) {
        boardStopDictation();
      }
    }

    function boardStopDictation() {
      _boardSttActive = false;
      _boardSttTargetSearch = false;
      if (_boardSttTargetNoteBtn) {
        _boardSttTargetNoteBtn.classList.remove('active');
      }
      document.querySelectorAll('.wn-note-mini-btn[data-action="dictate"].active').forEach(function (b) {
        b.classList.remove('active');
      });
      _boardSttTargetNote = null;
      _boardSttTargetEditor = null;
      _boardSttTargetNoteBtn = null;

      if (window.SpeechTranscriber) {
        window.SpeechTranscriber.stop();
      }
      var pill = document.getElementById('board-stt-live-pill');
      var btn = document.getElementById('con-dictate-btn');
      var meterFill = document.getElementById('board-stt-meter-fill');
      if (pill) pill.style.display = 'none';
      if (btn) btn.classList.remove('con-panel-active');
      if (meterFill) meterFill.style.width = '0%';

      if (typeof _conMirrorSend === 'function') {
        _conMirrorSend({ type: 'stt-caption', text: '', active: false });
      }
    }

    function boardSttChangeLanguage(lang) {
      if (window.SpeechTranscriber) {
        window.SpeechTranscriber.setLanguage(lang);
      }
    }

    function boardSttInsertAsNote() {
      var text = (_boardSttLastTranscript || '').trim();
      if (!text) {
        if (typeof showToast === 'function') {
          showToast(window.i18n ? i18n.t('sttPillNoText') : 'No speech text detected', true);
        }
        return;
      }

      var brd = (typeof board === 'function' ? board() : document.getElementById('board'));
      var centerX = 150;
      var centerY = 150;
      if (brd) {
        var scrollX = brd.scrollLeft || 0;
        var scrollY = brd.scrollTop || 0;
        centerX = scrollX + (brd.clientWidth / 2) - 80;
        centerY = scrollY + (brd.clientHeight / 2) - 40;
      }

      if (typeof conAddWordAt === 'function') {
        conAddWordAt(text, Math.max(10, Math.round(centerX)), Math.max(10, Math.round(centerY)));
        if (typeof conMarkBoardDirty === 'function') conMarkBoardDirty();
        if (typeof showToast === 'function') {
          showToast(window.i18n ? i18n.t('sttPillInsertNote') + ': ' + text.substring(0, 30) + '...' : 'Note added!');
        }
      }
      boardSttClear();
    }

    function boardSttSearch() {
      var text = (_boardSttLastTranscript || '').trim();
      if (!text) {
        if (typeof showToast === 'function') {
          showToast(window.i18n ? i18n.t('sttPillNoText') : 'No speech text detected', true);
        }
        return;
      }
      if (typeof conOpenSearchModal === 'function') {
        conOpenSearchModal(text);
      }
    }

    function boardSttCopy() {
      var text = (_boardSttLastTranscript || '').trim();
      if (!text) {
        if (typeof showToast === 'function') {
          showToast(window.i18n ? i18n.t('sttPillNoText') : 'No speech text detected', true);
        }
        return;
      }
      navigator.clipboard.writeText(text).then(function () {
        if (typeof showToast === 'function') {
          showToast(window.i18n ? i18n.t('sttPillCopied') : 'Copied to clipboard!');
        }
      });
    }

    function boardSttClear() {
      _boardSttLastTranscript = '';
      if (window.SpeechTranscriber && typeof window.SpeechTranscriber.reset === 'function') {
        window.SpeechTranscriber.reset();
      }
      var box = document.getElementById('board-stt-transcript-text');
      if (box) box.textContent = (window.i18n ? i18n.t('sttPillSpeakPrompt') : 'Speak now...');
    }

    function boardSttTriggerSearchMic() {
      if (_boardSttActive) {
        boardStopDictation();
      } else {
        boardStartDictation('search');
      }
    }

    function conOpenSearchModal(initialQuery) {
      const overlay = document.getElementById('con-search-overlay');
      if (!overlay) return;
      overlay.classList.add('active');

      // Refresh live board canvas snapshot in background
      _conSearchBoardCanvasData = null;
      if (typeof _conBuildBoardCanvas === 'function') {
        _conSearchBoardCanvasPromise = _conBuildBoardCanvas().then(res => {
          _conSearchBoardCanvasData = res;
          if (res && res.canvas) {
            try {
              let url = res.canvas.toDataURL('image/webp', 0.94);
              if (!url || !url.startsWith('data:image/webp')) {
                url = res.canvas.toDataURL('image/png');
              }
              if (url) {
                if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
                _conPageSnapshotPngs[conCurrentPageIndex] = url;
              }
            } catch (_) {}
          }
          if (_conSearchSelectedItem && _conSearchSelectedItem.pageIndex === conCurrentPageIndex) {
            conRenderSearchCrop(_conSearchSelectedItem);
          }
          return res;
        }).catch(err => {
          console.warn('Board search canvas build error:', err);
          return null;
        });
      }

      const inp = document.getElementById('con-search-input');
      if (inp) {
        if (typeof initialQuery === 'string') inp.value = initialQuery;
        setTimeout(() => {
          inp.focus();
          inp.select();
        }, 50);
      }
      conExecuteSearch();
    }
    window.conOpenSearchModal = conOpenSearchModal;

    function conCloseSearchModal() {
      const overlay = document.getElementById('con-search-overlay');
      if (overlay) overlay.classList.remove('active');
    }
    window.conCloseSearchModal = conCloseSearchModal;

    window.conSetSearchScope = function (scope) {
      if (scope !== 'current' && scope !== 'all') scope = 'current';
      _conSearchScope = scope;
      const btnCur = document.getElementById('con-search-scope-current');
      const btnAll = document.getElementById('con-search-scope-all');
      if (btnCur) btnCur.classList.toggle('active', scope === 'current');
      if (btnAll) btnAll.classList.toggle('active', scope === 'all');
      conExecuteSearch();
    };

    window.conSetSearchTypeFilter = function (type) {
      _conSearchTypeFilter = type || 'all';
      const chips = document.querySelectorAll('.con-search-chip');
      chips.forEach(c => {
        c.classList.toggle('active', c.dataset.type === _conSearchTypeFilter);
      });
      conExecuteSearch();
    };

    window.conClearSearchInput = function () {
      const inp = document.getElementById('con-search-input');
      if (inp) {
        inp.value = '';
        inp.focus();
      }
      conExecuteSearch();
    };

    window.conExecuteSearchDebounced = function () {
      if (_conSearchDebounceTimer) clearTimeout(_conSearchDebounceTimer);
      _conSearchDebounceTimer = setTimeout(() => {
        conExecuteSearch();
      }, 120);
    };

    function conCollectPageSearchItems(pageIndex) {
      const isCurrent = (pageIndex === conCurrentPageIndex);
      let snap = null;
      if (isCurrent) {
        const liveNodes = window.conGetNodes ? window.conGetNodes() : [];
        const liveNotes = window.conGetNotes ? window.conGetNotes() : [];
        const liveTables = window.conGetTables ? window.conGetTables() : [];
        const liveGroups = window.conGetGroups ? window.conGetGroups() : [];
        snap = {
          nodes: liveNodes,
          notes: liveNotes,
          tables: liveTables,
          groups: liveGroups
        };
      } else {
        snap = (conPageSnapshots && conPageSnapshots[pageIndex]) || null;
      }
      if (!snap) return [];

      const items = [];
      const pageNum = pageIndex + 1;

      // 1. Nodes
      const nodes = snap.nodes || [];
      nodes.forEach(n => {
        const baseWord = String(n.baseWord || (n.el ? n.el.textContent.trim() : '') || '').trim();
        const dbWord = String(n.dbWord || '').trim();
        const srcWord = String(n.sourceWord || '').trim();
        const fullText = [baseWord, dbWord, srcWord].filter(Boolean).join(' ');
        if (!fullText) return;

        let displayParts = [baseWord];
        if (dbWord && dbWord.toLowerCase() !== baseWord.toLowerCase()) displayParts.push(dbWord);
        if (srcWord && srcWord.toLowerCase() !== baseWord.toLowerCase() && srcWord.toLowerCase() !== dbWord.toLowerCase()) displayParts.push(srcWord);

        const w = (n.el ? n.el.offsetWidth : (Number(n.w || n.width) || 60));
        const h = (n.el ? n.el.offsetHeight : (Number(n.h || n.height) || 32));

        items.push({
          id: n.id,
          type: 'node',
          text: fullText,
          displayText: displayParts.join(' · ') || fullText,
          x: Number(n.x) || 0,
          y: Number(n.y) || 0,
          w: Math.max(30, w),
          h: Math.max(20, h),
          pageIndex: pageIndex,
          pageNum: pageNum,
          raw: n
        });
      });

      // 2. Notes
      const notes = snap.notes || [];
      notes.forEach(n => {
        let noteText = String(n.text || '');
        if (!noteText && n.html) {
          noteText = String(n.html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        }
        if (!noteText.trim()) return;

        const nw = Number(n.width || (n.el ? n.el.offsetWidth : 120)) || 120;
        const nh = Number(n.height || (n.el ? n.el.offsetHeight : 80)) || 80;

        items.push({
          id: n.id,
          type: 'note',
          text: noteText,
          displayText: noteText,
          x: Number(n.x) || 0,
          y: Number(n.y) || 0,
          w: Math.max(40, nw),
          h: Math.max(30, nh),
          pageIndex: pageIndex,
          pageNum: pageNum,
          raw: n
        });
      });

      // 3. Tables
      const tables = snap.tables || [];
      tables.forEach(tbl => {
        if (!tbl || !Array.isArray(tbl.cells)) return;
        const cols = Number(tbl.cols) || 1;
        const colWidths = Array.isArray(tbl.colWidths) ? tbl.colWidths : [];
        const rowHeights = Array.isArray(tbl.rowHeights) ? tbl.rowHeights : [];

        tbl.cells.forEach((cell, cellIdx) => {
          const cText = String((cell && cell.text) || '').trim();
          if (!cText) return;

          const r = Math.floor(cellIdx / cols);
          const c = cellIdx % cols;

          let colOff = 0;
          for (let i = 0; i < c; i++) colOff += (colWidths[i] || 80);
          let rowOff = 0;
          for (let j = 0; j < r; j++) rowOff += (rowHeights[j] || 36);

          const cellW = colWidths[c] || 80;
          const cellH = rowHeights[r] || 36;
          const cellX = (Number(tbl.x) || 0) + colOff;
          const cellY = (Number(tbl.y) || 0) + rowOff + 24;

          items.push({
            id: String(tbl.id) + '_c' + cellIdx,
            tableId: tbl.id,
            cellIdx: cellIdx,
            row: r,
            col: c,
            type: 'table',
            text: cText,
            displayText: cText,
            x: cellX,
            y: cellY,
            w: cellW,
            h: cellH,
            pageIndex: pageIndex,
            pageNum: pageNum,
            tableCoord: `R${r + 1}:C${c + 1}`,
            raw: tbl
          });
        });
      });

      // 4. Groups
      const groups = snap.groups || [];
      groups.forEach(g => {
        const title = String(g.title || '').trim();
        if (!title) return;

        const gx = g.x || (g.el ? (parseFloat(g.el.style.left) || 0) : 0);
        const gy = g.y || (g.el ? (parseFloat(g.el.style.top) || 0) : 0);
        const gw = g.manualW || 140;
        const gh = g.manualH || 60;

        items.push({
          id: g.id,
          type: 'group',
          text: title,
          displayText: title,
          x: Number(gx) || 0,
          y: Number(gy) || 0,
          w: gw,
          h: gh,
          pageIndex: pageIndex,
          pageNum: pageNum,
          raw: g
        });
      });

      return items;
    }

    window.conExecuteSearch = function () {
      const inp = document.getElementById('con-search-input');
      const rawQuery = (inp ? inp.value : '').trim();
      _conCurrentSearchQuery = rawQuery;
      const query = rawQuery.toLowerCase();

      let pagesToSearch = [];
      if (_conSearchScope === 'all') {
        const totalPages = Math.max(1, conPageSnapshots ? conPageSnapshots.length : 1);
        for (let p = 0; p < totalPages; p++) pagesToSearch.push(p);
      } else {
        pagesToSearch.push(conCurrentPageIndex);
      }

      let allCollected = [];
      pagesToSearch.forEach(pIdx => {
        allCollected = allCollected.concat(conCollectPageSearchItems(pIdx));
      });

      if (_conSearchTypeFilter !== 'all') {
        allCollected = allCollected.filter(it => it.type === _conSearchTypeFilter);
      }

      if (query) {
        let searchRe = null;
        try {
          const tokens = rawQuery.split(/\s+/).filter(Boolean);
          const pattern = tokens.map(conBuildAccentRegexPattern).join('\\s+');
          searchRe = new RegExp(pattern, 'i');
        } catch (_) {}

        _conSearchResults = allCollected.filter(it => {
          if (it.text.toLowerCase().includes(query)) return true;
          if (searchRe && searchRe.test(it.text)) return true;
          return false;
        });
      } else {
        _conSearchResults = allCollected;
      }

      conRenderSearchResults(rawQuery);
    };

    async function conResolvePageSnapshotDataUrl(targetIdx) {
      const totalPages = (conPageSnapshots && conPageSnapshots.length) || 1;
      const idx = (typeof targetIdx === 'number' && targetIdx >= 0)
        ? Math.min(targetIdx, Math.max(0, totalPages - 1))
        : ((typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0);

      let dataUrl = '';
      if (idx === conCurrentPageIndex) {
        if (_conSearchBoardCanvasData && _conSearchBoardCanvasData.canvas) {
          try {
            dataUrl = _conSearchBoardCanvasData.canvas.toDataURL('image/webp', 0.94);
            if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
              dataUrl = _conSearchBoardCanvasData.canvas.toDataURL('image/png');
            }
          } catch (_) {}
          if (dataUrl) {
            if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
            _conPageSnapshotPngs[idx] = dataUrl;
          }
        }
        if (!dataUrl && typeof _conBuildBoardCanvas === 'function') {
          try {
            const liveRes = await _conBuildBoardCanvas();
            if (liveRes && liveRes.canvas) {
              try {
                dataUrl = liveRes.canvas.toDataURL('image/webp', 0.94);
                if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
                  dataUrl = liveRes.canvas.toDataURL('image/png');
                }
              } catch (_) {
                dataUrl = liveRes.canvas.toDataURL('image/png');
              }
              if (dataUrl) {
                if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
                _conPageSnapshotPngs[idx] = dataUrl;
              }
            }
          } catch (_) {}
        }
      }

      if (!dataUrl && _conPageSnapshotPngs && _conPageSnapshotPngs[idx]) {
        dataUrl = _conPageSnapshotPngs[idx];
      }

      // If target is another page (or live build was unavailable), render high-resolution 1800x1125 snapshot
      if (!dataUrl) {
        const snap = (idx === conCurrentPageIndex && typeof conBuildPageSnapshot === 'function')
          ? conBuildPageSnapshot()
          : (conPageSnapshots && conPageSnapshots[idx]);
        if (snap && typeof conBuildPageThumbnailDataUrl === 'function') {
          try {
            dataUrl = conBuildPageThumbnailDataUrl(snap, 1800, 1125);
          } catch (_) {}
        }
      }

      if (!dataUrl && typeof conResolveMiniPageSnapshotUrl === 'function') {
        try {
          dataUrl = await conResolveMiniPageSnapshotUrl(idx);
        } catch (_) {}
      }

      // Ensure WebP format if currently PNG and offscreen canvas supports it
      if (dataUrl && dataUrl.startsWith('data:image/png')) {
        try {
          const img = new Image();
          img.src = dataUrl;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          const cvs = document.createElement('canvas');
          cvs.width = img.naturalWidth || img.width;
          cvs.height = img.naturalHeight || img.height;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const webpUrl = cvs.toDataURL('image/webp', 0.92);
            if (webpUrl && webpUrl.startsWith('data:image/webp')) {
              dataUrl = webpUrl;
            }
          }
        } catch (_) {}
      }

      if (dataUrl) {
        if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
        _conPageSnapshotPngs[idx] = dataUrl;
      }
      return dataUrl;
    }
    window.conResolvePageSnapshotDataUrl = conResolvePageSnapshotDataUrl;

    function escapeSearchHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    const conEscapeSearchHtml = escapeSearchHtml;
    global.escapeSearchHtml = window.escapeSearchHtml = escapeSearchHtml;
    global.conEscapeSearchHtml = window.conEscapeSearchHtml = conEscapeSearchHtml;

    function conBuildAccentRegexPattern(str) {
      const accentMap = {
        'a': '[aàáâãäåā]', 'A': '[AÀÁÂÃÄÅĀ]',
        'e': '[eèéêëē]',   'E': '[EÈÉÊËĒ]',
        'i': '[iìíîïī]',   'I': '[IÌÍÎÏĪ]',
        'o': '[oòóôõöō]', 'O': '[OÒÓÔÕÖŌ]',
        'u': '[uùúûüū]',   'U': '[UÙÚÛÜŪ]',
        'c': '[cç]',       'C': '[CÇ]',
        'n': '[nñ]',       'N': '[NÑ]'
      };
      return String(str || '').split('').map(char => {
        const lower = char.toLowerCase();
        if (accentMap[char]) return accentMap[char];
        if (accentMap[lower]) return accentMap[lower];
        return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('');
    }

    function conFindSubstringRange(textNode, query) {
      if (!textNode || !textNode.textContent || !query) return null;
      const content = textNode.textContent;
      const q = String(query).trim();
      if (!q) return null;

      // 1. Direct case-insensitive match
      let idx = content.toLowerCase().indexOf(q.toLowerCase());
      let len = q.length;

      // 2. Accent-tolerant regex match
      if (idx < 0) {
        try {
          const tokens = q.split(/\s+/).filter(Boolean);
          const pattern = tokens.map(conBuildAccentRegexPattern).join('\\s+');
          const re = new RegExp(pattern, 'i');
          const m = re.exec(content);
          if (m) {
            idx = m.index;
            len = m[0].length;
          }
        } catch (_) {}
      }

      // 3. First token fallback
      if (idx < 0) {
        const tokens = q.split(/\s+/).filter(Boolean);
        if (tokens.length > 1) {
          const firstTok = tokens[0];
          idx = content.toLowerCase().indexOf(firstTok.toLowerCase());
          if (idx >= 0) len = firstTok.length;
        }
      }

      if (idx >= 0) {
        try {
          const range = document.createRange();
          range.setStart(textNode, idx);
          range.setEnd(textNode, idx + len);
          return range;
        } catch (_) {}
      }
      return null;
    }

    function conSelectTextInElement(containerEl, searchText, item) {
      if (!containerEl || (item && item.type === 'node')) return false;
      const q = String(searchText || '').trim();

      // Find best target container based on element type
      let targetContainer = containerEl;
      if (item && item.type === 'note') {
        targetContainer = containerEl.querySelector('.wn-note-editor') || containerEl;
      } else if (item && item.type === 'table') {
        if (item.cellIdx != null) {
          const cells = containerEl.querySelectorAll('.con-table-cell');
          if (cells[item.cellIdx]) {
            targetContainer = cells[item.cellIdx].querySelector('.con-table-cell-text') || cells[item.cellIdx];
            cells[item.cellIdx].classList.remove('con-search-target-pulse');
            void cells[item.cellIdx].offsetWidth;
            cells[item.cellIdx].classList.add('con-search-target-pulse');
            setTimeout(() => cells[item.cellIdx].classList.remove('con-search-target-pulse'), 2400);
          }
        }
        if (targetContainer === containerEl) {
          targetContainer = containerEl.querySelector('.con-table-cell-text') || containerEl;
        }
      } else if (item && item.type === 'group') {
        targetContainer = containerEl.querySelector('.con-group-title') || containerEl;
      }

      // If query is provided, search for matching text node
      if (q) {
        const walker = document.createTreeWalker(
          targetContainer,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: function (node) {
              if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
              if (node.parentElement && node.parentElement.closest &&
                  node.parentElement.closest('.con-node-resizer, .con-node-star-btn, .con-node-note-btn, .wn-emoji-sticker, .wn-note-resizer, .con-node-rel-badge, .con-node-page, .con-emoji-dot, .con-node-comp-badge')) {
                return NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let textNode;
        while ((textNode = walker.nextNode())) {
          const range = conFindSubstringRange(textNode, q);
          if (range) {
            try {
              const sel = window.getSelection();
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
              }
              const editable = targetContainer.closest ? targetContainer.closest('[contenteditable="true"]') : null;
              if (editable && editable.focus) {
                editable.focus();
              } else if (targetContainer.focus) {
                targetContainer.focus();
              }
              return true;
            } catch (e) {
              console.warn('conSelectTextInElement range error:', e);
            }
          }
        }
      }

      // Fallback: select whole content of the container
      try {
        const range = document.createRange();
        range.selectNodeContents(targetContainer);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        const editable = targetContainer.closest ? targetContainer.closest('[contenteditable="true"]') : null;
        if (editable && editable.focus) editable.focus();
        return true;
      } catch (_) {}

      return false;
    }

    function highlightSearchMatchText(text, query) {
      if (!text) return '';
      const rawText = String(text).replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ');
      const q = String(query || '').trim();
      if (!q) {
        return conEscapeSearchHtml(rawText.length > 140 ? rawText.slice(0, 140) + '…' : rawText);
      }

      const tokens = q.split(/\s+/).filter(Boolean);
      const regexPattern = tokens.map(conBuildAccentRegexPattern).join('\\s+');
      let regex = null;
      try {
        regex = new RegExp(regexPattern, 'i');
      } catch (_) {
        regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }

      let targetText = rawText;
      const match = regex.exec(rawText);
      if (match && rawText.length > 130) {
        const mIdx = match.index;
        const mLen = match[0].length;
        const start = Math.max(0, mIdx - 35);
        const end = Math.min(rawText.length, mIdx + mLen + 75);
        targetText = (start > 0 ? '…' : '') + rawText.slice(start, end) + (end < rawText.length ? '…' : '');
      } else if (!match && rawText.length > 140) {
        targetText = rawText.slice(0, 140) + '…';
      }

      let globalRegex = null;
      try {
        globalRegex = new RegExp(regexPattern, 'gi');
      } catch (_) {
        globalRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      }

      let result = '';
      let lastIndex = 0;
      let m;
      while ((m = globalRegex.exec(targetText)) !== null) {
        if (m.index > lastIndex) {
          result += conEscapeSearchHtml(targetText.slice(lastIndex, m.index));
        }
        result += `<mark>${conEscapeSearchHtml(m[0])}</mark>`;
        lastIndex = globalRegex.lastIndex;
        if (globalRegex.lastIndex === m.index) {
          globalRegex.lastIndex++;
        }
      }
      if (lastIndex < targetText.length) {
        result += conEscapeSearchHtml(targetText.slice(lastIndex));
      }

      return result || conEscapeSearchHtml(targetText);
    }

    function conRenderSearchResults(query) {
      const list = document.getElementById('con-search-results-list');
      const countLabel = document.getElementById('con-search-count-label');
      if (!list) return;

      list.innerHTML = '';
      const total = _conSearchResults.length;

      if (countLabel) {
        const tFn = (typeof t === 'function' ? t : null);
        const curLang = (typeof window.getLang === 'function') ? window.getLang() : ((window.i18n && typeof window.i18n.getLang === 'function') ? window.i18n.getLang() : 'en');
        const matchStr = tFn ? tFn('conSearchMatchCount', { count: total, plural: (total === 1 ? '' : (curLang === 'fr' ? 's' : 'es')) }) : `${total} match${total === 1 ? '' : 'es'}`;
        countLabel.textContent = matchStr;
      }

      if (total === 0) {
        const empty = document.createElement('div');
        empty.style.padding = '24px 12px';
        empty.style.textAlign = 'center';
        empty.style.color = '#64748b';
        empty.style.fontSize = '0.8rem';
        empty.textContent = (typeof t === 'function' ? t('conSearchNoResults') : 'No matches found on this board.');
        list.appendChild(empty);
        conSelectSearchItem(null);
        return;
      }

      let selectIdx = 0;
      if (_conSearchSelectedItem) {
        const found = _conSearchResults.findIndex(it => it.id === _conSearchSelectedItem.id && it.pageIndex === _conSearchSelectedItem.pageIndex);
        if (found >= 0) selectIdx = found;
      }

      _conSearchResults.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'con-search-item-card' + (idx === selectIdx ? ' selected' : '');
        card.dataset.idx = idx;

        const typeLabels = {
          node: (typeof t === 'function' ? t('conSearchTypeNode') : 'Word'),
          note: (typeof t === 'function' ? t('conSearchTypeNote') : 'Note'),
          table: (typeof t === 'function' ? t('conSearchTypeTable') : 'Table'),
          group: (typeof t === 'function' ? t('conSearchTypeGroup') : 'Group')
        };

        const topRow = document.createElement('div');
        topRow.className = 'con-search-card-top';

        const badges = document.createElement('div');
        badges.className = 'con-search-card-badges';

        const typeBadge = document.createElement('span');
        typeBadge.className = `con-search-type-badge ${item.type}`;
        typeBadge.textContent = typeLabels[item.type] || item.type;
        badges.appendChild(typeBadge);

        if (conPageSnapshots && conPageSnapshots.length > 1) {
          const pBadge = document.createElement('span');
          pBadge.className = 'con-search-page-badge';
          pBadge.textContent = (typeof t === 'function' ? t('conSearchItemPage', { page: item.pageNum }) : `Page ${item.pageNum}`);
          badges.appendChild(pBadge);
        }

        const coord = document.createElement('span');
        coord.className = 'con-search-card-sub';
        coord.textContent = item.tableCoord || `(${Math.round(item.x)}, ${Math.round(item.y)})`;

        topRow.appendChild(badges);
        topRow.appendChild(coord);

        const btnGroup = document.createElement('div');
        btnGroup.style.marginLeft = 'auto';
        btnGroup.style.display = 'inline-flex';
        btnGroup.style.alignItems = 'center';
        btnGroup.style.gap = '3px';

        const openIconBtn = document.createElement('button');
        openIconBtn.type = 'button';
        openIconBtn.className = 'action-btn btn-grey';
        openIconBtn.style.padding = '1px 5px';
        openIconBtn.style.fontSize = '0.68rem';
        openIconBtn.style.display = 'inline-flex';
        openIconBtn.style.alignItems = 'center';
        openIconBtn.style.gap = '2px';
        openIconBtn.title = (typeof t === 'function' ? t('conSearchOpenWindowBtnTitle') : 'Open searched term in a dedicated read-only window');
        openIconBtn.innerHTML = '<img src="../assets/icons/eye.svg" style="width:11px;height:11px;" alt="" />';
        openIconBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          conSelectSearchItem(idx);
          conOpenSearchTermInNewWindow(item);
        });
        btnGroup.appendChild(openIconBtn);

        const jumpIconBtn = document.createElement('button');
        jumpIconBtn.type = 'button';
        jumpIconBtn.className = 'action-btn btn-blue';
        jumpIconBtn.style.padding = '1px 5px';
        jumpIconBtn.style.fontSize = '0.68rem';
        jumpIconBtn.style.display = 'inline-flex';
        jumpIconBtn.style.alignItems = 'center';
        jumpIconBtn.style.gap = '2px';
        jumpIconBtn.title = (typeof t === 'function' ? t('conSearchJumpToBoard') : 'Jump to on Board');
        jumpIconBtn.innerHTML = '<img src="../assets/icons/maximize.svg" style="width:11px;height:11px;" alt="" />';
        jumpIconBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          conSelectSearchItem(idx);
          conJumpToItem(item);
        });
        btnGroup.appendChild(jumpIconBtn);

        topRow.appendChild(btnGroup);

        const textRow = document.createElement('div');
        textRow.className = 'con-search-card-text';
        textRow.innerHTML = highlightSearchMatchText(item.displayText, query);

        card.appendChild(topRow);
        card.appendChild(textRow);

        card.addEventListener('click', () => {
          conSelectSearchItem(idx);
        });
        card.addEventListener('dblclick', () => {
          conJumpToItem(item);
        });

        list.appendChild(card);
      });

      conSelectSearchItem(selectIdx);
    }

    function conSelectSearchItem(idx) {
      const list = document.getElementById('con-search-results-list');
      const jumpBtn = document.getElementById('con-search-jump-btn');
      const openWinBtn = document.getElementById('con-search-open-win-btn');
      const canvas = document.getElementById('con-search-crop-canvas');
      const frame = document.getElementById('con-search-snapshot-frame');
      const img = document.getElementById('snapshot-img');
      const emptyState = document.getElementById('con-search-empty-preview');
      const detailTitle = document.getElementById('con-search-detail-title');
      const detailLoc = document.getElementById('con-search-detail-location');

      if (idx === null || idx < 0 || idx >= _conSearchResults.length) {
        _conSearchSelectedItem = null;
        if (jumpBtn) jumpBtn.disabled = true;
        if (openWinBtn) openWinBtn.disabled = true;
        if (canvas) canvas.style.display = 'none';
        if (frame) frame.style.display = 'none';
        if (img) img.src = '';
        if (emptyState) emptyState.style.display = 'flex';
        if (detailTitle) detailTitle.textContent = '';
        if (detailLoc) detailLoc.textContent = '';
        return;
      }

      _conSearchSelectedItem = _conSearchResults[idx];
      if (jumpBtn) jumpBtn.disabled = false;
      if (openWinBtn) openWinBtn.disabled = false;
      if (canvas) canvas.style.display = 'none';
      if (emptyState) emptyState.style.display = 'none';
      if (frame) frame.style.display = 'inline-flex';

      if (list) {
        const cards = list.querySelectorAll('.con-search-item-card');
        cards.forEach((c, cIdx) => {
          c.classList.toggle('selected', cIdx === idx);
        });
        if (cards[idx]) {
          cards[idx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }

      if (detailTitle) {
        detailTitle.textContent = _conSearchSelectedItem.displayText;
      }
      if (detailLoc) {
        const tFn = (typeof t === 'function' ? t : null);
        const pLabel = tFn ? tFn('conSearchItemPage', { page: _conSearchSelectedItem.pageNum }) : `Page ${_conSearchSelectedItem.pageNum}`;
        const posLabel = tFn ? tFn('conSearchMatchPosition', { x: Math.round(_conSearchSelectedItem.x), y: Math.round(_conSearchSelectedItem.y) }) : `Position: X: ${Math.round(_conSearchSelectedItem.x)}, Y: ${Math.round(_conSearchSelectedItem.y)}`;
        detailLoc.textContent = `${pLabel} · ${posLabel} · ${_conSearchSelectedItem.w}×${_conSearchSelectedItem.h}px`;
      }

      conRenderSearchCrop(_conSearchSelectedItem);
    }

    let _conCurrentSnapshotRenderToken = 0;
    async function conRenderSearchCrop(target) {
      if (!target) return;
      const img = document.getElementById('snapshot-img');
      const frame = document.getElementById('con-search-snapshot-frame');
      const emptyState = document.getElementById('con-search-empty-preview');

      const targetIdx = (typeof target.pageIndex === 'number' && target.pageIndex >= 0)
        ? target.pageIndex
        : ((typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0);

      // Instantly show already-cached snapshot if available
      if (_conPageSnapshotPngs && _conPageSnapshotPngs[targetIdx] && img) {
        img.src = _conPageSnapshotPngs[targetIdx];
        img.alt = target.displayText || 'Teacher View Snapshot';
        if (frame) frame.style.display = 'inline-flex';
        if (emptyState) emptyState.style.display = 'none';
      }

      const renderToken = ++_conCurrentSnapshotRenderToken;
      const dataUrl = await conResolvePageSnapshotDataUrl(targetIdx);
      if (renderToken !== _conCurrentSnapshotRenderToken) return;

      if (dataUrl && img) {
        img.src = dataUrl;
        img.alt = target.displayText || 'Teacher View Snapshot';
        if (frame) frame.style.display = 'inline-flex';
        if (emptyState) emptyState.style.display = 'none';
      }
    }
    window.conRenderSearchCrop = conRenderSearchCrop;
    window.conRenderSearchSnapshot = conRenderSearchCrop;

    window.conJumpToItem = function (item) {
      if (!item) item = _conSearchSelectedItem;
      if (!item) return;

      const searchQuery = _conCurrentSearchQuery || (document.getElementById('con-search-input') ? document.getElementById('con-search-input').value.trim() : '');

      conCloseSearchModal();

      const doCenterAndPulse = () => {
        const board = document.getElementById('constellation-board');
        if (!board) return;

        const itemW = item.w || 60;
        const itemH = item.h || 32;
        const targetScrollX = (item.x + itemW / 2) - board.clientWidth / 2;
        const targetScrollY = (item.y + itemH / 2) - board.clientHeight / 2;

        board.scrollTo({
          left: Math.max(0, Math.round(targetScrollX)),
          top: Math.max(0, Math.round(targetScrollY)),
          behavior: 'smooth'
        });

        let liveEl = null;
        if (item.type === 'node') {
          const nodes = (window.conGetNodes ? window.conGetNodes() : []);
          const nodeObj = nodes.find(n => n.id === item.id);
          if (nodeObj) {
            liveEl = nodeObj.el;
            if (typeof conSelect === 'function') conSelect(item.id);
            else if (typeof window.conSelect === 'function') window.conSelect(item.id);
          }
        } else if (item.type === 'note') {
          liveEl = document.querySelector(`.con-word-note[data-id="${item.id}"]`);
          if (typeof conSelectNote === 'function') {
            conSelectNote(item.id);
          } else if (typeof window.conSelectNote === 'function') {
            window.conSelectNote(item.id);
          }
          if (typeof conNodeClearSelection === 'function') conNodeClearSelection();
          if (typeof conTableClearSelection === 'function') conTableClearSelection();
          if (typeof conGroupFocus === 'function') conGroupFocus(null);
        } else if (item.type === 'table') {
          if (typeof conNodeClearSelection === 'function') conNodeClearSelection();
          if (typeof conNoteClearSelection === 'function') conNoteClearSelection();
          if (typeof conGroupFocus === 'function') conGroupFocus(null);
          if (typeof conTableClearSelection === 'function') conTableClearSelection();
          if (typeof conTableSelected !== 'undefined') conTableSelected.add(item.tableId);
          liveEl = document.querySelector(`.con-table-el[data-id="${item.tableId}"]`);
          if (liveEl) liveEl.classList.add('con-table-selected');
        } else if (item.type === 'group') {
          if (typeof conGroupFocus === 'function') conGroupFocus(item.id);
          liveEl = document.querySelector(`.con-group[data-id="${item.id}"]`);
        }

        if (liveEl) {
          liveEl.classList.remove('con-search-target-pulse');
          void liveEl.offsetWidth;
          liveEl.classList.add('con-search-target-pulse');
          setTimeout(() => {
            liveEl.classList.remove('con-search-target-pulse');
          }, 2400);

          // Select searched text within notes/tables on board; for nodes, never select text
          if (item && item.type === 'node') {
            try {
              const sel = window.getSelection();
              if (sel) sel.removeAllRanges();
            } catch (_) {}
          } else {
            setTimeout(() => {
              conSelectTextInElement(liveEl, searchQuery, item);
            }, 60);
          }
        }
      };

      if (typeof conCurrentPageIndex === 'number' && item.pageIndex !== conCurrentPageIndex) {
        if (typeof window.conGoToPage === 'function') {
          window.conGoToPage(item.pageIndex);
          setTimeout(doCenterAndPulse, 240);
        }
      } else {
        doCenterAndPulse();
      }
    };

    window.conJumpToSelectedSearchItem = function () {
      conJumpToItem(_conSearchSelectedItem);
    };

    window.conOpenPageInNewWindow = async function (pageIndex, options = {}) {
      const totalPages = (conPageSnapshots && conPageSnapshots.length) || 1;
      const targetIdx = (typeof pageIndex === 'number' && pageIndex >= 0)
        ? Math.min(pageIndex, Math.max(0, totalPages - 1))
        : ((typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0);

      // Snapshot current live board into in-memory page array before handoff
      if (typeof conBuildPageSnapshot === 'function') {
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
      }

      const sessionData = (typeof conBuildSessionData === 'function') ? conBuildSessionData() : null;
      const token = 'pw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      const titleVal = (window.conGetTitle ? window.conGetTitle() : '').trim() || (typeof _conCurrentConstellationTitle === 'string' ? _conCurrentConstellationTitle.trim() : '') || 'Board';

      if (sessionData) {
        try {
          localStorage.setItem('cmt_board_pw_' + token, JSON.stringify({
            session: sessionData,
            targetPageIndex: targetIdx,
            sourceTitle: titleVal
          }));
        } catch (e) {
          console.warn('Could not store page window session in localStorage', e);
        }
      }

      if (window.Desktop && typeof Desktop.openTool === 'function') {
        try {
          await Desktop.openTool('board.html', {
            forceNewWindow: true,
            query: {
              pageWindow: '1',
              viewPage: String(targetIdx),
              pwToken: token
            }
          });
          return;
        } catch (err) {
          console.warn('Desktop.openTool failed, falling back to window.open', err);
        }
      }

      // Web browser fallback
      const sLeft = Math.round((window.screenX || 0) + 40);
      const sTop = Math.round((window.screenY || 0) + 40);
      window.open('board.html?pageWindow=1&viewPage=' + encodeURIComponent(targetIdx) + '&pwToken=' + encodeURIComponent(token), '_blank', 'width=1200,height=800,left=' + sLeft + ',top=' + sTop);
    };

    window.conOpenPageSnapshotWindow = async function (pageIndex, options = {}) {
      const totalPages = (conPageSnapshots && conPageSnapshots.length) || 1;
      const targetIdx = (typeof pageIndex === 'number' && pageIndex >= 0)
        ? Math.min(pageIndex, Math.max(0, totalPages - 1))
        : ((typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0);

      // 1. Resolve WebP snapshot data URL (preferring fresh high-res live canvas or fresh high-res snapshot)
      const dataUrl = await conResolvePageSnapshotDataUrl(targetIdx);

      if (!dataUrl) {
        if (typeof showToast === 'function') {
          showToast('No snapshot available for page ' + (targetIdx + 1), true);
        }
        return;
      }

      // 2. Prepare localized UI labels & Neobrutalist styling
      const curLang = (typeof window.getLang === 'function') ? window.getLang() : ((window.i18n && typeof window.i18n.getLang === 'function') ? window.i18n.getLang() : 'en');
      const isFr = (curLang === 'fr');

      const pageNumText = `${isFr ? 'Page' : 'Page'} ${targetIdx + 1}`;
      const constellationTitle = (typeof _conCurrentConstellationTitle === 'string' && _conCurrentConstellationTitle.trim())
        ? _conCurrentConstellationTitle.trim()
        : '';
      const fullTitle = constellationTitle ? `${constellationTitle} — ${pageNumText}` : pageNumText;
      const safeTitle = escapeSearchHtml(fullTitle);

      const lblBadge = isFr ? 'VUE ENSEIGNANT EN LECTURE SEULE' : 'TEACHER READ-ONLY VIEW';
      const lblNotice = isFr ? 'Capture WebP haute résolution · N\'affecte ni ne remplace l\'affichage miroir' : 'High-resolution WebP snapshot · Does not affect or replace mirrored display';
      const lblZoomFit = isFr ? 'Ajuster' : 'Fit';
      const lblZoom100 = isFr ? 'Taille réelle' : '100% Zoom';
      const lblCopy = isFr ? 'Copier' : 'Copy';
      const lblCopied = isFr ? 'Copié !' : 'Copied!';
      const lblPrint = isFr ? 'Imprimer / PDF' : 'Print / PDF';
      const lblClose = isFr ? 'Fermer' : 'Close';

      const svgLock = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
      const svgZoom = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
      const svgCopy = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      const svgCheck = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>';
      const svgPrinter = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
      const svgClose = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      const svgBoard = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;"><rect x="2" y="2" width="20" height="15" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';

      const snapshotHtml = `<!DOCTYPE html>
<html lang="${curLang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — ${isFr ? 'Aperçu Enseignant' : 'Teacher View'} (Read-Only)</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #0f172a;
      color: #0f172a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .nb-topbar {
      background: #ffffff;
      border-bottom: 3px solid #000000;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-shrink: 0;
      z-index: 10;
    }
    .nb-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .nb-title-text {
      font-weight: 800;
      font-size: 1.05rem;
      color: #0f172a;
    }
    .nb-badge-lock {
      background: #111111;
      color: #fef08a;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1.5px solid #000000;
    }
    .nb-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nb-btn {
      background: #ffffff;
      border: 2px solid #000000;
      box-shadow: 2px 2px 0px #000000;
      border-radius: 4px;
      padding: 5px 12px;
      font-weight: 700;
      font-size: 0.8rem;
      color: #0f172a;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
      user-select: none;
    }
    .nb-btn:hover {
      transform: translate(-1px, -1px);
      box-shadow: 3px 3px 0px #000000;
    }
    .nb-btn:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0px #000000;
    }
    .nb-btn-danger {
      background: #fee2e2;
      color: #991b1b;
    }
    .nb-subbar {
      background: #f8fafc;
      border-bottom: 2px solid #000000;
      padding: 4px 16px;
      font-size: 0.76rem;
      font-weight: 600;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .nb-viewport {
      flex: 1;
      overflow: auto;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
    }
    .nb-snapshot-frame {
      display: inline-block;
      border: 3px solid #000000;
      box-shadow: 6px 6px 0px #000000;
      background: #ffffff;
      border-radius: 4px;
      transition: box-shadow 0.15s ease;
      line-height: 0;
    }
    .nb-snapshot-img {
      display: block;
      transition: max-width 0.2s ease, max-height 0.2s ease;
    }
    .nb-snapshot-img.fit-mode {
      max-width: calc(100vw - 64px);
      max-height: calc(100vh - 120px);
      width: auto;
      height: auto;
      object-fit: contain;
      cursor: zoom-in;
    }
    .nb-snapshot-img.zoom-mode {
      max-width: none;
      max-height: none;
      width: auto;
      height: auto;
      cursor: zoom-out;
    }
    @media print {
      .nb-topbar, .nb-subbar, .no-print { display: none !important; }
      html, body { background: #ffffff !important; overflow: visible !important; height: auto !important; }
      .nb-viewport { background: #ffffff !important; padding: 0 !important; overflow: visible !important; display: block !important; }
      .nb-snapshot-frame { border: none !important; box-shadow: none !important; }
      .nb-snapshot-img { max-width: 100% !important; max-height: 100vh !important; }
    }
  </style>
</head>
<body>
  <div class="nb-topbar no-print">
    <div class="nb-title-group">
      ${svgBoard}
      <span class="nb-title-text">${safeTitle}</span>
      <span class="nb-badge-lock">${svgLock} <span>${lblBadge}</span></span>
    </div>
    <div class="nb-actions">
      <button id="btn-zoom" class="nb-btn" onclick="toggleZoom()" title="Toggle 100% zoom (Key: Z)">
        ${svgZoom} <span id="btn-zoom-text">${lblZoom100}</span>
      </button>
      <button id="btn-copy" class="nb-btn" onclick="copySnapshot()" title="Copy image to clipboard (Ctrl+C)">
        ${svgCopy} <span id="btn-copy-text">${lblCopy}</span>
      </button>
      <button class="nb-btn" onclick="window.print()" title="Print or save as PDF">
        ${svgPrinter} <span>${lblPrint}</span>
      </button>
      <button class="nb-btn nb-btn-danger" onclick="window.close()" title="Close window (Esc)">
        ${svgClose} <span>${lblClose}</span>
      </button>
    </div>
  </div>
  <div class="nb-subbar no-print">
    <span>${lblNotice}</span>
    <span style="font-family:monospace;font-size:0.72rem;color:#64748b;" id="img-dim-info">WebP</span>
  </div>
  <div class="nb-viewport" id="viewport" onclick="onViewportClick(event)">
    <div class="nb-snapshot-frame" id="frame">
      <img id="snapshot-img" class="nb-snapshot-img fit-mode" src="${dataUrl}" alt="${safeTitle}" onclick="toggleZoom()" />
    </div>
  </div>

    let isZoomed = false;
    const img = document.getElementById('snapshot-img');
    const zoomLabel = document.getElementById('btn-zoom-text');
    const dimInfo = document.getElementById('img-dim-info');

    if (img) {
      img.onload = function() {
        if (dimInfo && img.naturalWidth && img.naturalHeight) {
          dimInfo.textContent = img.naturalWidth + ' × ' + img.naturalHeight + ' px · WebP';
        }
      };
      if (img.complete && img.naturalWidth) {
        if (dimInfo) dimInfo.textContent = img.naturalWidth + ' × ' + img.naturalHeight + ' px · WebP';
      }
    }

    function toggleZoom() {
      isZoomed = !isZoomed;
      if (!img) return;
      if (isZoomed) {
        img.className = 'nb-snapshot-img zoom-mode';
        if (zoomLabel) zoomLabel.textContent = ${JSON.stringify(lblZoomFit)};
      } else {
        img.className = 'nb-snapshot-img fit-mode';
        if (zoomLabel) zoomLabel.textContent = ${JSON.stringify(lblZoom100)};
      }
    }

    function onViewportClick(e) {
      if (e.target === document.getElementById('viewport')) {
        toggleZoom();
      }
    }

    async function copySnapshot() {
      const btn = document.getElementById('btn-copy');
      const btnText = document.getElementById('btn-copy-text');
      try {
        if (!img) return;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async function(blob) {
          if (!blob) return;
          if (navigator.clipboard && navigator.clipboard.write) {
            try {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              if (btn && btnText) {
                btn.innerHTML = ${JSON.stringify(svgCheck)} + ' <span>' + ${JSON.stringify(lblCopied)} + '</span>';
                setTimeout(() => {
                  btn.innerHTML = ${JSON.stringify(svgCopy)} + ' <span id="btn-copy-text">' + ${JSON.stringify(lblCopy)} + '</span>';
                }, 1600);
              }
            } catch (err) {
              console.warn('Clipboard write failed:', err);
            }
          }
        }, 'image/png');
      } catch (err) {
        console.warn('Copy snapshot error:', err);
      }
    }

    window.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        window.close();
      } else if (e.key === 'z' || e.key === 'Z') {
        toggleZoom();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (document.activeElement === document.body || !document.getSelection().toString()) {
          copySnapshot();
        }
      }
    });
  <\/script>
</body>
</html>`;

      // 3. Open in a dedicated read-only window on teacher's monitor
      const winTitle = `${safeTitle} — ${isFr ? 'Aperçu Enseignant' : 'Teacher View'}`;
      const winWidth = 1100;
      const winHeight = 820;

      if (window.Desktop && typeof Desktop.openHtml === 'function') {
        try {
          await Desktop.openHtml({
            html: snapshotHtml,
            width: winWidth,
            height: winHeight,
            title: winTitle
          });
          return;
        } catch (err) {
          console.warn('Desktop.openHtml failed, falling back to window.open', err);
        }
      }

      // Web browser fallback: center window relative to active screen coordinates
      const sLeft = Math.round((window.screenX || 0) + Math.max(0, ((window.outerWidth || window.innerWidth) - winWidth) / 2));
      const sTop = Math.round((window.screenY || 0) + Math.max(0, ((window.outerHeight || window.innerHeight) - winHeight) / 2));
      const popup = window.open('', '_blank', `width=${winWidth},height=${winHeight},left=${sLeft},top=${sTop},menubar=no,toolbar=no,location=no,status=no`);
      if (popup) {
        popup.document.open();
        popup.document.write(snapshotHtml);
        popup.document.close();
      }
    };

    window.conOpenSearchTermInNewWindow = async function (targetItem) {
      let item = targetItem || _conSearchSelectedItem;
      if (!item) {
        if (_conSearchResults && _conSearchResults.length > 0) {
          item = _conSearchResults[0];
        }
      }
      if (!item) {
        if (typeof showToast === 'function') {
          showToast((typeof t === 'function' ? t('conSearchNoItemSelected') : 'Please select a search result first'), true);
        }
        return;
      }
      const pIdx = (typeof item.pageIndex === 'number') ? item.pageIndex : conCurrentPageIndex;
      await window.conOpenPageSnapshotWindow(pIdx);
    };

    window.conSearchInputKeyDown = function (e) {
      if (!e) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        conCloseSearchModal();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          if (_conSearchSelectedItem) {
            conOpenSearchTermInNewWindow(_conSearchSelectedItem);
          }
          return;
        }
        if (_conSearchSelectedItem) {
          conJumpToItem(_conSearchSelectedItem);
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!_conSearchResults || _conSearchResults.length === 0) return;
        let currIdx = _conSearchResults.findIndex(it => _conSearchSelectedItem && it.id === _conSearchSelectedItem.id);
        if (currIdx < 0) currIdx = 0;
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(_conSearchResults.length - 1, currIdx + 1)
          : Math.max(0, currIdx - 1);
        conSelectSearchItem(nextIdx);
      }
    };



    // ================================================================
    // LASER POINTER
    // Simple click → leaves a persistent glowing mark.
    // Hold & drag   → trails of fading dots follow the cursor.
    // Double-click  → expanding pulse ring (no mark placed).
    // ================================================================
    (function () {
      'use strict';

      let _on = false;
      let _dotEl = null;
      let _x = 0, _y = 0;
      let _down = false;
      let _downX = 0, _downY = 0;
      let _didTrail = false;
      let _trailTimer = null;
      let _markTimer = null;  // delayed to allow dblclick to cancel

      function _dot() {
        if (!_dotEl) _dotEl = document.getElementById('laser-dot');
        return _dotEl;
      }

      function _moveDot(x, y) {
        _x = x; _y = y;
        const d = _dot();
        if (d) { d.style.transform = 'translate(' + (x - 5) + 'px, ' + (y - 5) + 'px)'; }
      }

      function _addMark(x, y) {
        const el = document.createElement('div');
        el.className = 'laser-mark';
        el.style.left = x + 'px'; el.style.top = y + 'px';
        document.body.appendChild(el);
        const _cleanup = function () { if (el && el.parentNode) el.remove(); };
        el.addEventListener('animationend', function (e) {
          if (e.animationName === 'laser-mark-fade') _cleanup();
        });
        setTimeout(_cleanup, 3000);
      }

      function _addTrailDot(x, y) {
        const size = 5 + Math.random() * 5;
        const el = document.createElement('div');
        el.className = 'laser-trail-dot';
        el.style.transform = 'translate(' + (x - size / 2) + 'px, ' + (y - size / 2) + 'px)';
        el.style.width = size + 'px'; el.style.height = size + 'px';
        document.body.appendChild(el);
        const _cleanup = function () { if (el && el.parentNode) el.remove(); };
        el.addEventListener('animationend', _cleanup, { once: true });
        setTimeout(_cleanup, 1200);
      }

      function _addPulse(x, y) {
        const el = document.createElement('div');
        el.className = 'laser-pulse-ring';
        el.style.left = x + 'px'; el.style.top = y + 'px';
        document.body.appendChild(el);
        const _cleanup = function () { if (el && el.parentNode) el.remove(); };
        el.addEventListener('animationend', _cleanup, { once: true });
        setTimeout(_cleanup, 1500);
      }

      function _onMove(e) {
        var isPointer = !!window._mirrorPointerOn;
        if (!_on && !isPointer) return;
        var brd = document.getElementById('constellation-board');
        var d = _dot();
        if (!brd || !brd.contains(e.target)) {
          if (d) d.style.visibility = 'hidden';
          return;
        }
        if (d) d.style.visibility = 'visible';
        _moveDot(e.clientX, e.clientY);
        if (_on && _down) {
          if (!_didTrail) {
            const dx = e.clientX - _downX, dy = e.clientY - _downY;
            if (dx * dx + dy * dy > 36) _didTrail = true;  // moved > 6px
          }
          if (_didTrail) _addTrailDot(e.clientX, e.clientY);
        }
      }

      function _onDown(e) {
        if (!_on || e.button !== 0) return;
        e.preventDefault();  // prevent text selection on notes while laser is active
        _down = true;
        _downX = e.clientX; _downY = e.clientY;
        _didTrail = false;
        // Pulse trail even when holding still
        _trailTimer = setInterval(function () {
          if (_down && !_didTrail) _addTrailDot(_x, _y);
        }, 80);
      }

      function _onUp(e) {
        if (!_on || !_down) return;
        _down = false;
        clearInterval(_trailTimer); _trailTimer = null;
        if (!_didTrail) {
          // Delay mark so a quickly-following dblclick can cancel it
          var cx = e.clientX + window.scrollX, cy = e.clientY + window.scrollY;
          _markTimer = setTimeout(function () { _markTimer = null; _addMark(cx, cy); }, 260);
        }
        _didTrail = false;
      }

      function _onDblClick(e) {
        if (!_on) return;
        e.preventDefault();
        e.stopPropagation();
        // Cancel pending mark from first click of the double-click
        if (_markTimer) { clearTimeout(_markTimer); _markTimer = null; }
        _addPulse(e.clientX, e.clientY);
      }

      function _syncBtns() {
        ['con-laser-btn', 'ta-laser-btn'].forEach(function (id) {
          var btn = document.getElementById(id);
          if (!btn) return;
          btn.classList.toggle('laser-btn-active', _on);
        });
      }

      window.getLaserDot = _dot;
      window.moveLaserDot = _moveDot;

      window.laserToggle = function () {
        // If activating laser while in draw mode, exit draw mode first
        if (!_on) {
          var brd = document.getElementById('constellation-board');
          if (brd && brd.classList.contains('draw-mode') && typeof window.conSetMode === 'function') {
            window.conSetMode('move');
          }
          if (typeof _taDrawActive !== 'undefined' && _taDrawActive && typeof window.taToggleDrawMode === 'function') {
            window.taToggleDrawMode();
          }
        }
        _on = !_on;
        document.body.classList.toggle('laser-active', _on);
        var d = _dot();
        if (d) {
          var shouldShow = _on || !!window._mirrorPointerOn;
          d.style.display = shouldShow ? 'block' : 'none';
          if (!shouldShow) d.style.visibility = 'hidden';
        }
        if (!_on) {
          _down = false;
          clearInterval(_trailTimer); _trailTimer = null;
          if (_markTimer) { clearTimeout(_markTimer); _markTimer = null; }
        }
        _syncBtns();
        if (typeof window.updateBoardModeToggleUI === 'function') window.updateBoardModeToggleUI();
        if (typeof mdbToast === 'function') {
          var laserMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function' ? i18n.t(_on ? 'conLaserOn' : 'conLaserOff') : null)
            || (_on ? '🔦 Laser pointer: ON' : '🔦 Laser pointer: OFF');
          mdbToast(laserMsg);
        }
      };

      window.laserClearMarks = function () {
        document.querySelectorAll('.laser-mark').forEach(function (el) { el.remove(); });
      };

      document.addEventListener('mousemove', _onMove, { passive: true });
      document.addEventListener('mousedown', _onDown);
      document.addEventListener('mouseup', _onUp);
      document.addEventListener('dblclick', _onDblClick);

      // Close preview pane on Escape
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          const pane = document.getElementById('history-preview-pane');
          if (pane && parseInt(pane.style.right || '-400') !== -400) {
            historyPreviewClose();
            return;
          }
        }
      });
    })();

    // ================================================================
    // UNKNOWN WORDS POPUP
    // ================================================================

    // Strip parenthetical content (e.g. "(adj)", "(n)") for loose matching
    function stripParens(s) {
      return String(s || '').replace(/\s*\([^)]*\)/g, '').trim();
    }

    async function unknownWordsOpen(section) {
      if (typeof scheduleCustomDatabasesInit === 'function') {
        try { await scheduleCustomDatabasesInit(); } catch (_) { }
      }
      // Build lookup set from vocabBank (includes all custom database words)
      const dbSet = new Set();
      if (typeof vocabBank !== 'undefined' && Array.isArray(vocabBank)) {
        vocabBank.forEach(function (item) {
          if (!item) return;
          if (item.word) dbSet.add(conNormalizeWordForLookup(item.word));
          const addForms = function (forms) {
            if (!forms) return;
            if (Array.isArray(forms)) {
              forms.forEach(function (f) {
                const s = typeof f === 'string' ? f : (f.word || f.form || f.term || '');
                if (s) dbSet.add(conNormalizeWordForLookup(s));
              });
            } else if (typeof forms === 'string' && forms.trim()) {
              forms.split(/[,;/]+/).forEach(function (s) {
                if (s && s.trim()) dbSet.add(conNormalizeWordForLookup(s));
              });
            }
          };
          addForms(item.otherForms);
          addForms(item.otherTerms);
        });
      }

      // Collect all words from the board
      const rawWords = new Set();

      if (section === 'constellation') {
        // Node words
        const nodes = window.conGetNodes ? window.conGetNodes() : [];
        nodes.forEach(function (n) {
          const w = ((n.baseWord || (n.el && n.el.textContent) || '')).trim();
          if (w && /[a-zA-Z]/.test(w)) rawWords.add(w);
        });
        // Free-floating note words (tokenise note text)
        const notes = window.conGetNotes ? window.conGetNotes() : [];
        notes.forEach(function (nd) {
          var text = nd.text || '';
          var matches = text.match(/[\w\u2018\u2019''']+/g) || [];
          matches.forEach(function (m) {
            if (/[a-zA-Z]/.test(m) && m.length > 1) rawWords.add(m);
          });
        });
      } else if (section === 'textanalysis') {
        var lines = window.taGetLines ? window.taGetLines() : [];
        lines.forEach(function (line) {
          line.forEach(function (tok) {
            var w = tok.text || '';
            if (/[a-zA-Z]/.test(w) && w.length > 1) rawWords.add(w);
          });
        });
      }

      // Deduplicate case-insensitively, keeping first-seen casing
      var seen = new Set();
      var deduped = [];
      rawWords.forEach(function (w) {
        var key = w.toLowerCase();
        if (!seen.has(key)) { seen.add(key); deduped.push(w); }
      });

      // Filter: keep words not in DB (using unified word lookup normalization)
      var unknown = deduped
        .filter(function (w) { return !dbSet.has(conNormalizeWordForLookup(w)); })
        .sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: 'base' }); });

      var total = deduped.length;
      document.getElementById('unknown-words-info').textContent =
        unknown.length + ' word' + (unknown.length !== 1 ? 's' : '') +
        ' not in database (out of ' + total + ' unique word' + (total !== 1 ? 's' : '') + ' on the board)';
      document.getElementById('unknown-words-text').value = unknown.join('\n');
      document.getElementById('unknown-words-overlay').classList.add('active');
    }

    function unknownWordsClose() {
      document.getElementById('unknown-words-overlay').classList.remove('active');
    }

    function unknownWordsCopy() {
      var ta = document.getElementById('unknown-words-text');
      var words = ta.value.trim();
      var instructions = [
        'Create a vocabBank entry for each of the following words.',
        'Use this exact JavaScript object format (one object per word, as a single line):',
        '{ word: "…", ipa: "…", partOfSpeech: "…", level: "A1|A2|B1|B2|C1|C2", theme: "…", definition: "…", french: "…", exampleSentence: "…", synonyms: ["…"], antonyms: ["…"], otherForms: ["…"], keywords: [] }',
        'Notes:',
        '- partOfSpeech and definition can be a string or an array of strings if the word has multiple senses.',
        '- french can be a string or an array of strings.',
        '- ipa should use standard IPA notation (British English preferred), without slash forward.',
        '- level follows CEFR: A1, A2, B1, B2, C1, or C2.',
        '- Keep definitions concise (one sentence). Keep example sentences natural and at the word\'s CEFR level.',
        '- otherForms should list plurals and past and present tense forms or participles. If empty, use [].',
        '',
        'Words to process:',
        words
      ].join('\n');

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(instructions).catch(function () {
          ta.value = instructions; ta.select(); document.execCommand('copy'); ta.value = words;
        });
      } else {
        var prev = ta.value;
        ta.value = instructions; ta.select(); document.execCommand('copy'); ta.value = prev;
      }
    }

  Board.search = Board.search || {};

  // Backward compatibility exports for HTML attributes & cross-module calls
  window.wfaOpen = global.wfaOpen = wfaOpen;
  window.wfaClose = global.wfaClose = wfaClose;
  window.boardToggleDictation = global.boardToggleDictation = boardToggleDictation;
  window.boardStopDictation = global.boardStopDictation = boardStopDictation;
  window.boardSttChangeLanguage = global.boardSttChangeLanguage = boardSttChangeLanguage;
  window.boardSttInsertAsNote = global.boardSttInsertAsNote = boardSttInsertAsNote;
  window.boardSttSearch = global.boardSttSearch = boardSttSearch;
  window.boardSttCopy = global.boardSttCopy = boardSttCopy;
  window.boardSttClear = global.boardSttClear = boardSttClear;
  window.boardSttTriggerSearchMic = global.boardSttTriggerSearchMic = boardSttTriggerSearchMic;
  window.unknownWordsOpen = global.unknownWordsOpen = unknownWordsOpen;
  window.unknownWordsClose = global.unknownWordsClose = unknownWordsClose;
  window.unknownWordsCopy = global.unknownWordsCopy = unknownWordsCopy;
  window.wnToggleNoteDictation = global.wnToggleNoteDictation = wnToggleNoteDictation;

  window.wfaStem = global.wfaStem = wfaStem;
  window.WFA_STOPWORDS = global.WFA_STOPWORDS = WFA_STOPWORDS;

  try {
    Object.defineProperty(window, '_boardSttTargetNote', {
      get: function() { return _boardSttTargetNote; },
      set: function(v) { _boardSttTargetNote = v; },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    window._boardSttTargetNote = _boardSttTargetNote;
  }

})(typeof window !== "undefined" ? window : this);