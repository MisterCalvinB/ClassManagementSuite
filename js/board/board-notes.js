/**
 * Class Management Tools — Board NOTES Engine
 * Extracted from pages/board.html (Lines 36730-41919)
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

  var CON_PALETTES = global.CON_PALETTES = global.CON_PALETTES || [];
  var conDrawingSelected = global.conDrawingSelected = global.conDrawingSelected || new Set();
  var conMultiSelected = global.conMultiSelected = global.conMultiSelected || new Set();
  var conNoteSelected = global.conNoteSelected = global.conNoteSelected || new Set();
  var _conShapeSelected = global._conShapeSelected = global._conShapeSelected || new Set();
  var conTableSelected = global.conTableSelected = global.conTableSelected || new Set();
  var conNotes = global.conNotes = global.conNotes || [];
  var conNodes = global.conNodes = global.conNodes || [];
  var conEdges = global.conEdges = global.conEdges || [];
  var conTables = global.conTables = global.conTables || [];
  var conGroups = global.conGroups = global.conGroups || [];
  window.conNotes = conNotes;
  window.conNoteSelected = conNoteSelected;

  var boardEscapeHtml = global.boardEscapeHtml = window.boardEscapeHtml || function (text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  function wnRenderMathFragment(text) {
    const frag = document.createDocumentFragment();
    const source = String(text || '');
    const pattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(source))) {
      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(source.slice(lastIndex, match.index)));
      }

      const displayMode = !!match[1];
      const tex = String(match[1] || match[2] || '');
      const span = document.createElement('span');
      span.className = displayMode ? 'wn-katex-display' : 'wn-katex-inline';
      span.dataset.katexTex = tex;
      span.dataset.katexDisplayMode = displayMode ? '1' : '0';

      try {
        if (typeof katex !== 'undefined' && katex && typeof katex.renderToString === 'function') {
          span.innerHTML = katex.renderToString(tex, {
            displayMode,
            throwOnError: false
          });
        } else {
          span.textContent = tex;
        }
      } catch (err) {
        span.className = 'wn-katex-error';
        span.textContent = tex;
      }

      frag.appendChild(span);
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < source.length) {
      frag.appendChild(document.createTextNode(source.slice(lastIndex)));
    }

    return frag;
  }

  function wnRenderMathHtml(html) {
    const source = String(html || '');
    if (!source || typeof document === 'undefined') return source;
    if (typeof katex === 'undefined' || !katex || typeof katex.renderToString !== 'function') return source;

    const root = document.createElement('div');
    root.innerHTML = source;

    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          child.replaceWith(wnRenderMathFragment(child.nodeValue));
          return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return;
        if (child.classList.contains('katex')) return;
        const tag = child.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE' || tag === 'PRE') return;
        walk(child);
      });
    };

    walk(root);
    return root.innerHTML;
  }

  global.wnRenderMathFragment = window.wnRenderMathFragment = wnRenderMathFragment;
  global.wnRenderMathHtml = window.wnRenderMathHtml = wnRenderMathHtml;

    // ================================================================
    // CONSTELLATION — FREE-FLOATING NOTES
    // ================================================================

    let conNoteNextId = 0;

    function conSyncNoteNextId(maxIdNum) {
      if (typeof maxIdNum === 'number' && !isNaN(maxIdNum)) {
        conNoteNextId = Math.max(conNoteNextId, maxIdNum);
      }
    }
    window.conSyncNoteNextId = conSyncNoteNextId;

    function conGetNextNoteId() {
      let maxId = -1;
      const noteList = (typeof conGetNotes === 'function') ? conGetNotes() : (window.conNotes || conNotes || []);
      if (Array.isArray(noteList)) {
        for (let i = 0; i < noteList.length; i++) {
          const n = noteList[i];
          if (n && n.id) {
            const m = String(n.id).match(/^cnn(\d+)$/);
            if (m) {
              const val = parseInt(m[1], 10);
              if (!isNaN(val) && val > maxId) maxId = val;
            }
          }
        }
      }
      const domNotes = document.querySelectorAll('#constellation-board .con-word-note[data-id]');
      for (let i = 0; i < domNotes.length; i++) {
        const did = domNotes[i].dataset ? domNotes[i].dataset.id : null;
        if (did) {
          const m = String(did).match(/^cnn(\d+)$/);
          if (m) {
            const val = parseInt(m[1], 10);
            if (!isNaN(val) && val > maxId) maxId = val;
          }
        }
      }
      if (conNoteNextId <= maxId) {
        conNoteNextId = maxId + 1;
      }
      const nextId = 'cnn' + (conNoteNextId++);
      return nextId;
    }
    window.conGetNextNoteId = conGetNextNoteId;

    let _conNoteCtxData = null; // note data for which wn-ctx-menu is open
    let _conNoteMirrorSyncTimer = null;

    function conCancelNoteMirrorUpdate() {
      if (_conNoteMirrorSyncTimer) {
        clearTimeout(_conNoteMirrorSyncTimer);
        _conNoteMirrorSyncTimer = null;
      }
    }

    function conScheduleNoteMirrorUpdate(noteData, editor) {
      conCancelNoteMirrorUpdate();
      _conNoteMirrorSyncTimer = setTimeout(() => {
        _conNoteMirrorSyncTimer = null;
        if (noteData && editor) {
          wnSyncNoteDataFromEditor(noteData, editor);
          conNoteAutosize(editor, noteData);
        }
        if (typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast();
        }
      }, 100);
    }
    window.conScheduleNoteMirrorUpdate = conScheduleNoteMirrorUpdate;
    window.conCancelNoteMirrorUpdate = conCancelNoteMirrorUpdate;

    window.conNoteClearSelection = function () {
      conNoteSelected.clear();
      document.querySelectorAll('#constellation-board .con-word-note.wn-selected')
        .forEach(n => n.classList.remove('wn-selected'));
      if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
    };

    function wnGetNoteElementById(id) {
      if (!id) return null;
      return document.querySelector(`.ta-word-note[data-id="${id}"], .con-word-note[data-id="${id}"]`);
    }

    function wnApplyHiddenState(noteData, noteEl) {
      if (!noteData || !noteEl) return;
      const ta = noteEl.querySelector('.wn-note-editor, textarea');
      const hidden = !!noteData.hidden;
      noteEl.classList.toggle('wn-note-hidden', hidden);
      if (noteData.nodeId) {
        if (typeof conUpdateNodeNoteButton === 'function') {
          conUpdateNodeNoteButton(noteData.nodeId);
        }
      }
      if (ta) {
        ta.style.visibility = hidden ? 'hidden' : 'visible';
        ta.style.pointerEvents = hidden ? 'none' : '';
      }
      noteEl.style.borderStyle = hidden ? 'dashed' : (noteData.borderStyle || '');
      noteEl.style.opacity = hidden ? '0.85' : '';
      noteEl.title = hidden ? 'Hidden note (double-click to reveal)' : '';
    }

    function wnApplyStoredSize(note, ta, noteData, scale) {
      if (!noteData || !noteData.manualSize) {
        note.style.height = '';
        ta.style.overflowY = 'hidden';
        return false;
      }
      const zoom = Math.max(0.5, Math.min(3, Number(scale) || 1));
      const containerH = Math.max(
        200,
        (note && note.parentElement && note.parentElement.clientHeight) || 0,
        window.innerHeight || document.documentElement.clientHeight || 720
      );
      const maxBaseH = Math.max(40, containerH / zoom);
      const baseW = Math.max(80, Math.min(1560, Number(noteData.width) || note.offsetWidth || 80));
      const baseH = Math.max(28, Math.min(maxBaseH, Number(noteData.height) || note.offsetHeight || 28));
      noteData.width = baseW;
      noteData.height = baseH;
      note.style.width = (baseW * zoom) + 'px';
      note.style.height = (baseH * zoom) + 'px';
      ta.style.width = '100%';
      ta.style.height = Math.max(16, (baseH - 12) * zoom) + 'px';
      ta.style.overflowY = 'auto';
      return true;
    }
    window.wnApplyStoredSize = wnApplyStoredSize;

    function wnAttachResizeHandle(note, ta, noteData, opts) {
      const cfg = Object.assign({ minW: 80, maxW: 540, minH: 28, maxH: 360 }, opts || {});
      const getScale = typeof cfg.scaleGetter === 'function' ? cfg.scaleGetter : (() => 1);
      const resolveMax = (val, fallback) => {
        if (typeof val === 'function') {
          const n = Number(val());
          return Number.isFinite(n) ? n : fallback;
        }
        const n = Number(val);
        return Number.isFinite(n) ? n : fallback;
      };
      const handle = document.createElement('div');
      handle.className = 'wn-note-resizer';
      note.appendChild(handle);

      let resizing = false, sx = 0, sy = 0, sw = 0, sh = 0;
      let _noteResizeRaf = null, _pendingNoteResizeMsg = null;

      handle.addEventListener('mousedown', e => {
        if (noteData.locked) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        const scale = Math.max(0.5, Math.min(3, Number(getScale()) || 1));
        resizing = true;
        window._conMirrorDragging = true;
        sx = e.clientX;
        sy = e.clientY;
        sw = (noteData.manualSize && Number.isFinite(Number(noteData.width))) ? Number(noteData.width) : (note.offsetWidth / scale);
        sh = (noteData.manualSize && Number.isFinite(Number(noteData.height))) ? Number(noteData.height) : (note.offsetHeight / scale);
        e.preventDefault();
        e.stopPropagation();
      });
      handle.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
      });
      document.addEventListener('mousemove', e => {
        if (!resizing) return;
        const scale = Math.max(0.5, Math.min(3, Number(getScale()) || 1));
        const maxW = resolveMax(cfg.maxW, 540);
        const maxH = resolveMax(cfg.maxH, 360);
        const nextW = Math.max(cfg.minW, Math.min(maxW, sw + ((e.clientX - sx) / scale)));
        const nextH = Math.max(cfg.minH, Math.min(maxH, sh + ((e.clientY - sy) / scale)));
        noteData.manualSize = true;
        noteData.width = nextW;
        noteData.height = nextH;
        noteData.liveBaseWidth = nextW;
        noteData.liveBaseHeight = nextH;
        wnApplyStoredSize(note, ta, noteData, scale);
        if (typeof conRedrawEdges === 'function') conRedrawEdges();
        if (typeof conGroupRefitAll === 'function') conGroupRefitAll();

        if (window._conMirrorSend) {
          _pendingNoteResizeMsg = {
            type: 'note-resize',
            id: String(noteData.id),
            width: nextW,
            height: nextH,
            baseWidth: nextW,
            baseHeight: nextH,
            manualSize: true
          };
          if (!_noteResizeRaf) {
            _noteResizeRaf = requestAnimationFrame(function () {
              _noteResizeRaf = null;
              if (window._conMirrorSend && _pendingNoteResizeMsg) {
                window._conMirrorSend(_pendingNoteResizeMsg);
              }
            });
          }
        }
      });
      document.addEventListener('mouseup', () => {
        if (resizing) {
          resizing = false;
          if (_noteResizeRaf) {
            cancelAnimationFrame(_noteResizeRaf);
            _noteResizeRaf = null;
          }
          noteData.liveBaseWidth = Number(noteData.width);
          noteData.liveBaseHeight = Number(noteData.height);
          if (window._conMirrorSend) {
            window._conMirrorSend({
              type: 'note-resize',
              id: String(noteData.id),
              width: Number(noteData.width),
              height: Number(noteData.height),
              baseWidth: Number(noteData.width),
              baseHeight: Number(noteData.height),
              manualSize: true
            });
            _pendingNoteResizeMsg = null;
          }
          if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
          setTimeout(() => {
            window._conMirrorDragging = false;
          }, 60);
        }
      });
    }

    function wnDeleteNoteData(nd) {
      if (!nd) return;
      conCancelNoteMirrorUpdate();
      if (_conNoteCtxData && _conNoteCtxData.id === nd.id) _conNoteCtxData = null;
      if (nd.id && nd.id.startsWith('cn')) {
        conNotes = conNotes.filter(n => n.id !== nd.id);
        window.conNotes = global.conNotes = conNotes;
        if (nd.nodeId) {
          const allNodes = (typeof conGetNodes === 'function') ? conGetNodes() : (window.conGetNodes ? window.conGetNodes() : []);
          const linkedNode = allNodes.find(n => n.id === nd.nodeId);
          if (linkedNode && linkedNode.el) {
            const stillHas = conNotes.some(n => n.nodeId === nd.nodeId);
            if (!stillHas) linkedNode.el.classList.remove('has-con-note');
            if (typeof conUpdateNodeNoteButton === 'function') conUpdateNodeNoteButton(linkedNode);
          }
        }
        const allGroups = (typeof conGroups !== 'undefined') ? conGroups : (window.conGetGroups ? window.conGetGroups() : []);
        if (Array.isArray(allGroups)) {
          allGroups.forEach(g => {
            if (Array.isArray(g.noteIds) && g.noteIds.includes(nd.id)) {
              g.noteIds = g.noteIds.filter(id => id !== nd.id);
            }
          });
        }
      } else {
        taWordNotes = taWordNotes.filter(n => n.id !== nd.id);
        const tok = taFindToken(nd.tokId);
        if (tok) tok.note = '';
        const cell = document.querySelector(`.ta-cell[data-id="${nd.tokId}"]`);
        if (cell) cell.classList.remove('has-word-note');
      }
      if (_wnActiveNote && _wnActiveNote.id === nd.id) wnStyleDismiss();
      if (_wnCtxNoteData && _wnCtxNoteData.id === nd.id) wnCtxClose();
      if (typeof _boardSttTargetNote !== 'undefined' && _boardSttTargetNote && _boardSttTargetNote.id === nd.id) {
        if (typeof boardStopDictation === 'function') boardStopDictation();
      }
      const noteEl = wnGetNoteElementById(nd.id);
      if (noteEl) noteEl.remove();
      const edgesArr = (typeof window !== 'undefined' && window.conEdges) || (typeof global !== 'undefined' && global.conEdges) || conEdges;
      if (Array.isArray(edgesArr)) {
        for (let i = edgesArr.length - 1; i >= 0; i--) {
          const e = edgesArr[i];
          if (e && (e.a === nd.id || e.b === nd.id)) {
            if (e.g && e.g.remove) e.g.remove();
            edgesArr.splice(i, 1);
          }
        }
        if (typeof window !== 'undefined') window.conEdges = edgesArr;
        if (typeof global !== 'undefined') global.conEdges = edgesArr;
        conEdges = edgesArr;
        if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
      }
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      if (typeof window._conMirrorBroadcast === 'function') window._conMirrorBroadcast();
    }

    function wnFocusNoteData(nd) {
      const noteEl = nd && wnGetNoteElementById(nd.id);
      if (!noteEl) return;
      const ta = noteEl.querySelector('.wn-note-editor, textarea');
      if (!ta) return;
      ta.focus();
      if (ta.tagName === 'TEXTAREA') {
        ta.selectionStart = ta.value.length;
        ta.selectionEnd = ta.value.length;
        return;
      }
      const sel = window.getSelection();
      if (!sel) return;
      const range = document.createRange();
      range.selectNodeContents(ta);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function wnGetActiveEditor() {
      if (!_wnActiveNote) return null;
      const noteEl = wnGetNoteElementById(_wnActiveNote.id);
      if (!noteEl) return null;
      return noteEl.querySelector('.wn-note-editor, textarea');
    }

    function wnNormalizeNoteText(text) {
      return String(text || '').replace(/\r/g, '');
    }

    function wnSyncNoteDataFromEditor(noteData, editor) {
      if (!noteData || !editor) return;
      if (editor.tagName === 'TEXTAREA') {
        noteData.text = wnNormalizeNoteText(editor.value);
        noteData.html = '';
      } else {
        editor.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          if (cb.checked) cb.setAttribute('checked', 'checked');
          else cb.removeAttribute('checked');
        });
        noteData.html = wnRenderMathHtml(editor.innerHTML);
        noteData.text = wnNormalizeNoteText(editor.innerText || editor.textContent || '');
      }
      if (noteData.tokId) {
        const tok = taFindToken(noteData.tokId);
        if (tok) tok.note = noteData.text;
      }
    }

    function wnSelectionInside(editor) {
      if (!editor || editor.tagName === 'TEXTAREA') return false;
      const sel = window.getSelection && window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
      const range = sel.getRangeAt(0);
      const anc = range.commonAncestorContainer;
      return editor === anc || editor.contains(anc);
    }

    function wnGetActiveNoteSelection() {
      const sel = window.getSelection && window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
      const range = sel.getRangeAt(0);
      const anc = range.commonAncestorContainer;
      const el = (anc && anc.nodeType === 1) ? anc : (anc ? (anc.parentElement || anc.parentNode) : null);
      const editor = el ? (el.classList && el.classList.contains('wn-note-editor') ? el : (el.closest && el.closest('.wn-note-editor'))) : null;
      if (!editor) return null;
      const noteEl = editor.closest('.con-word-note');
      if (!noteEl || !noteEl.dataset.id) return null;

      try {
        const preRange = document.createRange();
        preRange.selectNodeContents(editor);
        preRange.setEnd(range.startContainer, range.startOffset);
        const start = preRange.toString().length;
        const text = range.toString();
        const end = start + text.length;
        if (text.length === 0) return null;
        return {
          noteId: String(noteEl.dataset.id),
          start: start,
          end: end,
          text: text
        };
      } catch (e) {
        return null;
      }
    }
    window.wnGetActiveNoteSelection = wnGetActiveNoteSelection;

    let _wnLastSentNoteSelectionKey = null;
    let _wnSelectionSendRaf = null;

    function wnSyncAndBroadcastNoteSelection(immediate = false) {
      if (new URLSearchParams(location.search).get('mirror') === '1') return;
      if (!window._conMirrorSend) return;

      function doSync() {
        _wnSelectionSendRaf = null;
        const currentSel = wnGetActiveNoteSelection();
        const key = currentSel ? `${currentSel.noteId}:${currentSel.start}:${currentSel.end}:${currentSel.text}` : 'none';
        if (key === _wnLastSentNoteSelectionKey) return;
        _wnLastSentNoteSelectionKey = key;
        try {
          window._conMirrorSend({
            type: 'note-text-selection',
            selection: currentSel
          });
        } catch (_) { }
      }

      if (immediate) {
        if (_wnSelectionSendRaf) {
          cancelAnimationFrame(_wnSelectionSendRaf);
          _wnSelectionSendRaf = null;
        }
        doSync();
      } else {
        if (!_wnSelectionSendRaf) {
          _wnSelectionSendRaf = requestAnimationFrame(doSync);
        }
      }
    }
    window.wnSyncAndBroadcastNoteSelection = wnSyncAndBroadcastNoteSelection;

    document.addEventListener('selectionchange', function () {
      if (new URLSearchParams(location.search).get('mirror') === '1') return;
      if (typeof wnSyncAndBroadcastNoteSelection === 'function') {
        wnSyncAndBroadcastNoteSelection(false);
      }
    });

    function wnRememberSelection(editor) {
      if (!editor || editor.tagName === 'TEXTAREA') return;
      const sel = window.getSelection && window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const anc = range.commonAncestorContainer;
      if (!(editor === anc || editor.contains(anc))) return;
      _wnSavedSelectionRange = range.cloneRange();
      if (typeof wnSyncAndBroadcastNoteSelection === 'function') {
        wnSyncAndBroadcastNoteSelection(true);
      }
    }

    function wnRestoreSelection(editor) {
      if (!editor || editor.tagName === 'TEXTAREA' || !_wnSavedSelectionRange) return false;
      const anc = _wnSavedSelectionRange.commonAncestorContainer;
      if (!(editor === anc || editor.contains(anc))) return false;
      const sel = window.getSelection && window.getSelection();
      if (!sel) return false;
      sel.removeAllRanges();
      sel.addRange(_wnSavedSelectionRange);
      if (typeof wnSyncAndBroadcastNoteSelection === 'function') {
        wnSyncAndBroadcastNoteSelection(true);
      }
      return true;
    }

    function wnApplySelectionCommand(command, value) {
      if (!_wnActiveNote) return false;
      const editor = wnGetActiveEditor();
      if (!editor || editor.tagName === 'TEXTAREA') return false;
      if (!wnSelectionInside(editor)) wnRestoreSelection(editor);
      if (!wnSelectionInside(editor)) return false;
      editor.focus();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(command, false, value);
      wnRememberSelection(editor);
      wnSyncNoteDataFromEditor(_wnActiveNote, editor);
      if (_wnActiveNote._applyStyle) _wnActiveNote._applyStyle();
      if (typeof wnSyncAndBroadcastNoteSelection === 'function') {
        wnSyncAndBroadcastNoteSelection(true);
      }
      return true;
    }

    /**
     * Apply / remove wavy underline on the current selection inside the active
     * note editor. Returns true if a selection was found and acted upon,
     * false if there was no selection (caller should fall back to whole-note).
     */
    function wnApplyWavyToSelection() {
      if (!_wnActiveNote) return false;
      const editor = wnGetActiveEditor();
      if (!editor || editor.tagName === 'TEXTAREA') return false;
      // Try to restore a previously saved selection if none is live
      if (!wnSelectionInside(editor)) wnRestoreSelection(editor);
      if (!wnSelectionInside(editor)) return false;

      editor.focus();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
      const range = sel.getRangeAt(0);

      // Detect if the entire selection is already wrapped in wavy spans
      // by walking every text node in the range and checking ancestors.
      function _isWavyNode(node) {
        let el = (node.nodeType === 1) ? node : node.parentElement;
        while (el && el !== editor) {
          if (el.nodeType === 1 && el.tagName === 'SPAN') {
            const td = el.style.textDecoration || '';
            const tds = el.style.textDecorationStyle || '';
            if ((td.includes('underline') && tds === 'wavy') ||
                td.includes('wavy')) return true;
          }
          el = el.parentElement;
        }
        return false;
      }

      // Collect all text nodes that fall within the range
      const treeWalker = document.createTreeWalker(
        range.commonAncestorContainer.nodeType === 1
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement,
        NodeFilter.SHOW_TEXT,
        null
      );
      const textNodes = [];
      let node;
      while ((node = treeWalker.nextNode())) {
        if (range.intersectsNode(node)) textNodes.push(node);
      }

      const allWavy = textNodes.length > 0 && textNodes.every(_isWavyNode);

      if (allWavy) {
        // --- Remove wavy from selection ---
        // Use execCommand to select and strip inline styles isn't reliable for
        // custom spans; walk ancestors and remove the wavy decoration instead.
        textNodes.forEach(tn => {
          let el = tn.parentElement;
          while (el && el !== editor) {
            if (el.tagName === 'SPAN') {
              const td = el.style.textDecoration || '';
              const tds = el.style.textDecorationStyle || '';
              if ((td.includes('underline') && tds === 'wavy') || td.includes('wavy')) {
                // Remove wavy style; if span becomes style-less, unwrap it
                el.style.textDecoration = td.replace(/underline/gi, '').replace(/wavy/gi, '').trim() || null;
                el.style.textDecorationStyle = '';
                if (!el.getAttribute('style') || el.getAttribute('style').trim() === '') {
                  // Unwrap span
                  const parent = el.parentNode;
                  while (el.firstChild) parent.insertBefore(el.firstChild, el);
                  parent.removeChild(el);
                }
                break;
              }
            }
            el = el.parentElement;
          }
        });
      } else {
        // --- Apply wavy to selection ---
        // Wrap the range contents in a span
        try {
          const span = document.createElement('span');
          span.style.textDecoration = 'underline';
          span.style.textDecorationStyle = 'wavy';
          range.surroundContents(span);
        } catch (e) {
          // surroundContents fails for partial-element selections; use extractContents + insertNode
          const frag = range.extractContents();
          const span = document.createElement('span');
          span.style.textDecoration = 'underline';
          span.style.textDecorationStyle = 'wavy';
          span.appendChild(frag);
          range.insertNode(span);
        }
      }

      // Normalise the editor DOM to merge adjacent identical text nodes
      editor.normalize();
      wnRememberSelection(editor);
      wnSyncNoteDataFromEditor(_wnActiveNote, editor);
      if (_wnActiveNote._applyStyle) _wnActiveNote._applyStyle();
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      if (typeof wnSyncAndBroadcastNoteSelection === 'function') {
        wnSyncAndBroadcastNoteSelection(true);
      }
      return true;
    }

    // ── Note style popup — constants, state, and all wn* functions ────

    const WN_COLORS = [
      'rgb(0, 0, 255)', // blue
      'rgb(0, 255, 0)', // green
      'rgb(0,0,0)', // black
      'rgb(255, 0, 0)', // red
      'rgb(255, 0, 255)', // magenta
      'yellow', // yellow
      'orange', // orange
      'brown', // brown
      'gray' // gray
    ];
    const WN_BGS = [
      'rgba(255, 255, 255, .95)', // white
      'rgba(254, 243, 199, .95)', // light yellow
      'rgba(220, 252, 231, .95)', // light green
      'rgba(224, 242, 254, .95)', // light blue
      'rgba(252, 231, 243, .95)', // light pink
      'rgba(238, 238, 238, .95)', // light gray
      'rgba(214, 183, 170, .3)'  // light brown
    ];
    const WN_HIGHLIGHT_COLORS = [
      'rgb(255 229 0)', // pastel yellow
      '#b3ffb3', // pastel green
      '#b3f0ff', // pastel cyan
      '#ffc299', // pastel orange
      'rgb(255 190 226)', // pastel pink
      'transparent', // transparent
      'black', // black
    ];
    window.WN_COLORS = WN_COLORS;
    window.WN_BGS = WN_BGS;
    window.WN_HIGHLIGHT_COLORS = WN_HIGHLIGHT_COLORS;
    const WN_BORDER_SWATCHES = ['#111111', '#555555', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0d9488', '#2563eb', '#0284c7', '#7c3aed', '#db2777'];
    window.WN_BORDER_SWATCHES = WN_BORDER_SWATCHES;
    const WN_SIZE_MIN = 4, WN_SIZE_MAX = 96;

    let _wnActiveNote = null;
    let _wnSavedSelectionRange = null;
    let _wnPopupWordMeta = null;
    let _wnOverlayOpenTime = 0;

    function wnNormalizeLookupWord(raw) {
      const text = String(raw || '').trim().toLowerCase();
      if (!text) return '';
      const m = text.match(/[a-zA-ZÀ-ÖØ-öø-ÿ][a-zA-ZÀ-ÖØ-öø-ÿ''-]*/);
      return m ? m[0].replace(/[']/g, "'") : '';
    }

    function wnFindDbEntryForWord(word) {
      if (!word) return null;
      if (typeof conFindDbEntry === 'function') {
        return conFindDbEntry(word);
      }
      if (typeof vocabBank === 'undefined' || !Array.isArray(vocabBank)) return null;
      const key = String(word).toLowerCase();
      const exact = vocabBank.find(v => v && v.word && String(v.word).toLowerCase() === key);
      if (exact) return exact;
      const matchForms = (forms) => {
        if (!forms) return false;
        if (Array.isArray(forms)) return forms.some(f => String(f || '').toLowerCase() === key);
        if (typeof forms === 'string') return forms.split(/[,;/]+/).map(s => s.trim().toLowerCase()).includes(key);
        return false;
      };
      return vocabBank.find(v => v && (matchForms(v.otherForms) || matchForms(v.otherTerms))) || null;
    }

    function wnGetSelectedTextInsideEditor(editor) {
      if (!editor) return '';
      if (editor.tagName === 'TEXTAREA') {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) return '';
        return String(editor.value || '').slice(start, end).trim();
      }
      const sel = window.getSelection && window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return '';
      const range = sel.getRangeAt(0);
      const anc = range.commonAncestorContainer;
      if (!(editor === anc || editor.contains(anc))) return '';
      return String(sel.toString() || '').trim();
    }

    function wnResolveWordMetaFromNoteContext(noteEl) {
      if (!noteEl) return null;
      const editor = noteEl.querySelector('.wn-note-editor, textarea');
      if (!editor) return null;
      const selectedText = wnGetSelectedTextInsideEditor(editor);
      const lookupWord = wnNormalizeLookupWord(selectedText);
      if (!lookupWord) return null;
      const entry = wnFindDbEntryForWord(lookupWord);
      if (!entry) return null;
      const defs = (typeof _allVals === 'function') ? _allVals(entry.definition) : (Array.isArray(entry.definition) ? entry.definition : [entry.definition]);
      const frVals = (typeof _splitFrenchTranslations === 'function') ? _splitFrenchTranslations(entry.french) : (Array.isArray(entry.french) ? entry.french : [entry.french]);
      return {
        word: entry.word || lookupWord,
        ipa: String(entry.ipa || '').trim(),
        french: frVals.filter(Boolean).slice(0, 3).join(', '),
        definition: String((defs.filter(Boolean)[0] || '')).trim()
      };
    }

    function wnRenderPopupWordMeta(meta) {
      const box = document.getElementById('wn-sp-wordmeta');
      if (!box) return;
      if (!meta) { box.style.display = 'none'; return; }

      function bindCopy(el, value) {
        if (!el) return;
        const copyText = String(value || '').trim();
        el.classList.add('wn-sp-copyable');
        el.title = copyText ? 'Click to copy' : 'Nothing to copy';
        el.onclick = async (ev) => {
          ev.stopPropagation();
          if (!copyText || copyText === '—') return;
          let ok = false;
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(copyText); ok = true; }
          } catch (_) { }
          if (!ok) {
            try {
              const tmp = document.createElement('textarea');
              tmp.value = copyText; tmp.style.position = 'fixed'; tmp.style.opacity = '0';
              document.body.appendChild(tmp); tmp.focus(); tmp.select();
              ok = document.execCommand('copy'); tmp.remove();
            } catch (_) { }
          }
          if (!ok) return;
          const prev = el.textContent; el.textContent = 'Copied';
          setTimeout(() => { el.textContent = prev; }, 600);
        };
      }

      const wordEl = document.getElementById('wn-sp-wordmeta-word');
      const ipaEl = document.getElementById('wn-sp-wordmeta-ipa');
      const frEl = document.getElementById('wn-sp-wordmeta-fr');
      const defEl = document.getElementById('wn-sp-wordmeta-def');
      if (wordEl) wordEl.textContent = meta.word || '';
      if (ipaEl) ipaEl.textContent = meta.ipa ? `/ ${meta.ipa} /` : '—';
      if (frEl) frEl.textContent = meta.french || '—';
      if (defEl) defEl.textContent = meta.definition || '—';
      bindCopy(wordEl, meta.word || '');
      bindCopy(ipaEl, meta.ipa || '');
      bindCopy(frEl, meta.french || '');
      bindCopy(defEl, meta.definition || '');
      box.style.display = '';
    }

    function wnStyleOpen(noteData, anchorEl, triggerEvent, wordMeta) {
      if (window._wnClearOutsideClickSuppression) window._wnClearOutsideClickSuppression();
      {
        const prevNoteEl = document.querySelector(
          `.ta-word-note[data-id="${noteData.id}"], .con-word-note[data-id="${noteData.id}"]`
        );
        if (prevNoteEl) {
          const prevEditor = prevNoteEl.querySelector('.wn-note-editor, textarea');
          if (prevEditor) wnRememberSelection(prevEditor);
        }
      }
      _wnActiveNote = noteData;
      _wnPopupWordMeta = wordMeta || null;
      _wnOverlayOpenTime = Date.now();
      const overlay = document.getElementById('wn-style-overlay');
      const popup = document.getElementById('wn-style-popup');
      wnRenderPopupWordMeta(_wnPopupWordMeta);

      const presetBtns = document.getElementById('wn-sp-preset-btns');
      if (presetBtns) {
        presetBtns.innerHTML = '';
        const presets = (window.conGetNotePresets ? window.conGetNotePresets() : []);
        const activePreset = noteData.preset || null;
        presets.forEach(p => {
          const btn = document.createElement('button');
          btn.className = 'con-preset-btn' + (p.key === activePreset ? ' active' : '');
          btn.dataset.presetKey = p.key;
          btn.title = p.label;
          btn.textContent = p.key;
          btn.style.background = p.bg;
          btn.style.color = p.color;
          btn.style.borderColor = p.borderColor;
          btn.style.borderWidth = (p.borderWidth || 2) + 'px';
          btn.style.borderStyle = p.borderStyle || 'solid';
          if (p.highlight) btn.style.boxShadow = `0 0 0 2px ${p.highlight}`;
          if (p.fmt) {
            btn.style.fontWeight = p.fmt.bold ? 'bold' : '';
            btn.style.fontStyle = p.fmt.italic ? 'italic' : '';
            btn.style.textDecoration = [p.fmt.underline ? 'underline' : '', p.fmt.strike ? 'line-through' : ''].filter(Boolean).join(' ') || '';
          }
          btn.addEventListener('mousedown', e => e.preventDefault());
          btn.onclick = () => { wnApplyNotePreset(p.key); wnStyleDismiss(); };
          presetBtns.appendChild(btn);
        });
        const presetRow = document.getElementById('wn-sp-preset-row');
        if (presetRow) presetRow.style.display = presets.length ? '' : 'none';
      }

      const colEl = document.getElementById('wn-sp-colors');
      colEl.innerHTML = '';
      WN_COLORS.forEach(c => {
        const s = document.createElement('span');
        s.className = 'wn-sp-swatch' + (noteData.color === c ? ' active' : '');
        s.style.background = c;
        s.style.border = c === '#ffffff' ? '2px solid #ccc' : '';
        s.title = c;
        s.addEventListener('mousedown', e => e.preventDefault());
        s.onclick = () => {
          if (!wnApplySelectionCommand('foreColor', c)) {
            noteData.color = c;
            noteData._applyStyle && noteData._applyStyle();
          }
          wnStyleRefresh();
          window.getSelection().removeAllRanges();
          wnStyleDismiss();
        };
        colEl.appendChild(s);
      });

      const bgEl = document.getElementById('wn-sp-bgs');
      bgEl.innerHTML = '';
      WN_BGS.forEach(c => {
        const s = document.createElement('span');
        s.className = 'wn-sp-swatch' + (noteData.bg === c ? ' active' : '');
        s.style.background = c === 'transparent' ? 'repeating-linear-gradient(45deg,#ccc,#ccc 3px,#fff 3px,#fff 6px)' : c;
        s.style.border = '2px solid #ddd';
        s.title = c;
        s.onclick = () => { noteData.bg = c; noteData._applyStyle && noteData._applyStyle(); wnStyleRefresh(); if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges(); window.getSelection().removeAllRanges(); wnStyleDismiss(); };
        bgEl.appendChild(s);
      });

      const hlEl = document.getElementById('wn-sp-highlights');
      hlEl.innerHTML = '';
      WN_HIGHLIGHT_COLORS.forEach(c => {
        const s = document.createElement('span');
        s.className = 'wn-sp-swatch';
        if (c === '__blink__') {
          s.style.background = '#ffa0a0';
          s.style.animation = 'wn-blink-hl-anim 3s ease-in-out infinite';
          s.title = 'Blinking highlight';
        } else {
          s.style.background = c;
          s.title = 'Highlight ' + c;
        }
        s.style.border = '2px solid #ddd';
        s.addEventListener('mousedown', e => e.preventDefault());
        s.onclick = () => { wnStyleApplyHighlight(c); window.getSelection().removeAllRanges(); wnStyleDismiss(); };
        hlEl.appendChild(s);
      });

      const borderColEl = document.getElementById('wn-sp-border-colors');
      if (borderColEl) {
        borderColEl.innerHTML = '';
        (WN_BORDER_SWATCHES || []).forEach(c => {
          const s = document.createElement('span');
          s.className = 'wn-sp-swatch' + (noteData.borderColor === c ? ' active' : '');
          s.style.background = c;
          s.style.border = '3px solid ' + c;
          if (noteData.borderColor === c) s.style.outline = '2px solid #111';
          s.title = 'Border: ' + c;
          s.onclick = () => {
            wnStyleSetBorderColor(c);
            const picker = document.getElementById('wn-sp-border-color');
            if (picker && /^#[0-9a-fA-F]{6}$/.test(c)) picker.value = c;
            wnStyleRefresh();
          };
          borderColEl.appendChild(s);
        });
      }

      const szSlider = document.getElementById('wn-sp-size-slider');
      const szVal = document.getElementById('wn-sp-size-val');
      const setupFontSlider = window._conSetupFontSizeSlider || (typeof _conSetupFontSizeSlider === 'function' ? _conSetupFontSizeSlider : null);
      const pxToFont = window.conPxToFontUnit || (typeof conPxToFontUnit === 'function' ? conPxToFontUnit : null);
      const fmtFont = window.conFormatFontSize || (typeof conFormatFontSize === 'function' ? conFormatFontSize : null);
      if (szSlider) {
        if (setupFontSlider) setupFontSlider(szSlider, window.conFontUnit, 'note');
        if (pxToFont) szSlider.value = String(pxToFont(noteData.fontSize || 16, window.conFontUnit));
      }
      if (szVal) {
        szVal.textContent = fmtFont ? fmtFont(noteData.fontSize || 16, window.conFontUnit) : (noteData.fontSize || 16) + 'px';
      }

      const bwSlider = document.getElementById('wn-sp-border-width');
      const bwVal = document.getElementById('wn-sp-border-width-val');
      const setupThickSlider = window._conSetupThicknessSlider || (typeof _conSetupThicknessSlider === 'function' ? _conSetupThicknessSlider : null);
      const pxToThick = window.conPxToThicknessUnit || (typeof conPxToThicknessUnit === 'function' ? conPxToThicknessUnit : null);
      const fmtThick = window.conFormatThickness || (typeof conFormatThickness === 'function' ? conFormatThickness : null);
      if (bwSlider) {
        if (setupThickSlider) setupThickSlider(bwSlider, window.conThicknessUnit, 'noteBorder');
        if (pxToThick) bwSlider.value = String(pxToThick(noteData.borderWidth || 0, window.conThicknessUnit));
      }
      if (bwVal) {
        bwVal.textContent = fmtThick ? fmtThick(noteData.borderWidth || 0, window.conThicknessUnit) : (noteData.borderWidth || 0) + 'px';
      }
      if (typeof window._conSyncUnitToggleButtons === 'function') window._conSyncUnitToggleButtons();
      const bcPicker = document.getElementById('wn-sp-border-color');
      if (bcPicker) { bcPicker.value = (noteData.borderColor && /^#[0-9a-fA-F]{6}$/.test(noteData.borderColor)) ? noteData.borderColor : '#111111'; }
      const curBs = noteData.borderStyle || '';
      ['solid', 'dashed', 'dotted', 'double'].forEach(s => {
        const btn = document.getElementById('wn-sp-bs-' + s);
        if (btn) btn.classList.toggle('active', curBs === s);
      });

      document.getElementById('wn-sp-bold').classList.toggle('active', !!noteData.bold);
      document.getElementById('wn-sp-italic').classList.toggle('active', !!noteData.italic);
      document.getElementById('wn-sp-underline').classList.toggle('active', !!noteData.underline);
      const _wavyBtn = document.getElementById('wn-sp-wavy');
      if (_wavyBtn) _wavyBtn.classList.toggle('active', !!noteData.wavy);
      document.getElementById('wn-sp-strike').classList.toggle('active', !!noteData.strike);
      const _curCasing = noteData.casing || window._bcNoteDefaultCasing || 'none';
      const caseBtn = document.getElementById('wn-sp-case-btn');
      if (caseBtn) caseBtn.classList.toggle('active', _curCasing !== 'none');
      const caseDropdown = document.getElementById('wn-sp-case-dropdown');
      if (caseDropdown) {
        caseDropdown.style.display = 'none';
        caseDropdown.querySelectorAll('.board-casing-item').forEach(item => {
          item.classList.toggle('active', (item.dataset.case || 'none') === _curCasing);
        });
      }
      const noteConvertDd = document.getElementById('con-note-convert-modal');
      if (noteConvertDd) noteConvertDd.style.display = 'none';
      const _curAlign = noteData.textAlign || 'left';
      ['left', 'center', 'right', 'justify'].forEach(a => {
        const btn = document.getElementById('wn-sp-align-' + a);
        if (btn) btn.classList.toggle('active', _curAlign === a);
      });
      const lockBtn = document.getElementById('wn-sp-lock-btn');
      if (lockBtn) { lockBtn.innerHTML = noteData.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" /> Unlock' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" /> Lock'; lockBtn.classList.toggle('active', !!noteData.locked); }
      const hideBtn = document.getElementById('wn-sp-hide-btn');
      if (hideBtn) hideBtn.innerHtml = noteData.hidden ? '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Reveal' : '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Hide';
      const blinkBtn = document.getElementById('wn-sp-blink-btn');
      if (blinkBtn) blinkBtn.classList.toggle('active', !!noteData.blink);
      const libBtn = document.getElementById('wn-sp-save-library-btn');
      if (libBtn) {
        const isMulti = (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 1)
          || (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0);
        const titleStr = isMulti
          ? ((typeof i18n !== 'undefined' && i18n.t ? i18n.t('conSaveSelectionToLibrary') : null) || 'Save Selection to Library')
          : ((typeof i18n !== 'undefined' && i18n.t ? i18n.t('conSaveToPremadeLibrary') : null) || 'Save to Premade Library');
        libBtn.title = titleStr;
        libBtn.setAttribute('title', titleStr);
      }
      const openInputBtn = document.getElementById('wn-sp-open-input-btn');
      const stopInputBtn = document.getElementById('wn-sp-stop-input-btn');
      if (stopInputBtn) {
        const activeNoteEl = noteData && noteData.id
          ? document.querySelector(`.ta-word-note[data-id="${noteData.id}"], .con-word-note[data-id="${noteData.id}"]`)
          : null;
        const isStudentInput = !!noteData.studentInput || !!(activeNoteEl && activeNoteEl.classList.contains('student-input'));
        stopInputBtn.style.display = isStudentInput ? '' : 'none';
        if (openInputBtn) openInputBtn.style.display = isStudentInput ? '' : 'none';
      }
      if (typeof wnStyleCountWords === 'function') {
        wnStyleCountWords({ silent: true });
      }

      _wnPopupDragged = false;
      overlay.classList.add('active');
      const pw = popup.offsetWidth || 260;
      const ph = popup.offsetHeight || 340;
      const MARGIN = 12;
      {
        if (triggerEvent && Number.isFinite(triggerEvent.clientX) && Number.isFinite(triggerEvent.clientY)) {
          let left = triggerEvent.clientX + 10;
          let top = triggerEvent.clientY + 8;
          if (left + pw > window.innerWidth - MARGIN) left = triggerEvent.clientX - pw - 10;
          if (top + ph > window.innerHeight - MARGIN) top = window.innerHeight - ph - MARGIN;
          if (left < MARGIN) left = MARGIN;
          if (top < MARGIN) top = MARGIN;
          popup.style.left = left + 'px';
          popup.style.top = top + 'px';
          return;
        }
        let noteEl = null;
        if (anchorEl && anchorEl !== document.body && anchorEl.getBoundingClientRect
          && (anchorEl.classList.contains('ta-word-note') || anchorEl.classList.contains('con-word-note'))) {
          noteEl = anchorEl;
        }
        if (!noteEl && noteData && noteData.id) {
          noteEl = document.querySelector(`.ta-word-note[data-id="${noteData.id}"], .con-word-note[data-id="${noteData.id}"]`);
        }
        if (noteEl) {
          const rect = noteEl.getBoundingClientRect();
          let left = rect.right + 10;
          let top = rect.top;
          if (left + pw > window.innerWidth - MARGIN) left = rect.left - pw - 10;
          if (left < MARGIN) left = Math.min(rect.right + 10, window.innerWidth - pw - MARGIN);
          if (top + ph > window.innerHeight - MARGIN) top = window.innerHeight - ph - MARGIN;
          if (top < MARGIN) top = MARGIN;
          popup.style.left = left + 'px';
          popup.style.top = top + 'px';
        } else {
          popup.style.left = (window.innerWidth / 2 - pw / 2) + 'px';
          popup.style.top = (window.innerHeight / 2 - ph / 2) + 'px';
        }
      }
    }

    let _wnPopupDragged = false;
    function _initWnPopupDrag() {
      const popup = document.getElementById('wn-style-popup');
      if (!popup) return;
      const handle = popup.querySelector('h4');
      if (!handle) return;
      let dragging = false, ox = 0, oy = 0;
      handle.addEventListener('mousedown', e => {
        if (e.target.tagName === 'BUTTON') return;
        dragging = true; _wnPopupDragged = true;
        if (typeof conCloseNoteConvertModal === 'function') conCloseNoteConvertModal();
        ox = e.clientX - popup.offsetLeft;
        oy = e.clientY - popup.offsetTop;
        e.preventDefault();
      });
      document.addEventListener('mousemove', e => {
        if (!dragging) return;
        popup.style.left = (e.clientX - ox) + 'px';
        popup.style.top = (e.clientY - oy) + 'px';
      });
      document.addEventListener('mouseup', () => { dragging = false; });

      // When text is selected in an editor, Electron/Chrome sometimes generates
      // mousedown+mouseup on the first popup interaction without a click event.
      // Fix: on mouseup inside the popup, if no natural click follows in the same
      // JS tick, synthesize one on the target element.
      const overlay = document.getElementById('wn-style-overlay');
      if (overlay) {
        overlay.addEventListener('mouseup', function (e) {
          if (!e.target || !e.target.closest('#wn-style-popup')) return;
          const t = e.target;
          let naturalClick = false;
          const guard = function () { naturalClick = true; };
          overlay.addEventListener('click', guard, { capture: true, once: true });
          setTimeout(function () {
            if (!naturalClick) {
              overlay.removeEventListener('click', guard, true);
              t.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
          }, 0);
        }, false);
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _initWnPopupDrag);
    } else {
      _initWnPopupDrag();
    }

    function conGetNotePresets() {
      const bc = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : {};
      const saved = Array.isArray(bc.notePresets) && bc.notePresets.length ? bc.notePresets : null;
      if (!saved) return [];
      return saved.map(p => ({
        key: String(p.key || '').trim(),
        label: String(p.label || p.key || '').trim(),
        bg: String(p.bg || '#ffffff'),
        color: String(p.color || '#111111'),
        borderColor: String(p.borderColor || '#111111'),
        borderWidth: Number(p.borderWidth || 0),
        borderStyle: String(p.borderStyle || 'solid'),
        fontFamily: String(p.fontFamily || ''),
        fontSize: (p.fontSize != null && p.fontSize !== '') ? Number(p.fontSize) : null,
        fmt: p.fmt && typeof p.fmt === 'object' ? {
          bold: !!p.fmt.bold, italic: !!p.fmt.italic, underline: !!p.fmt.underline, strike: !!p.fmt.strike
        } : { bold: false, italic: false, underline: false, strike: false }
      }));
    }
    window.conGetNotePresets = conGetNotePresets;

    function wnApplyNotePreset(presetKey) {
      const nd = _wnActiveNote;
      if (!nd) return;
      const preset = conGetNotePresets().find(p => p.key === presetKey);
      if (!preset) return;
      nd.bg = preset.bg; nd.color = preset.color;
      nd.borderColor = preset.borderColor; nd.borderWidth = preset.borderWidth || 0; nd.borderStyle = preset.borderStyle || 'solid';
      nd.bold = !!(preset.fmt && preset.fmt.bold); nd.italic = !!(preset.fmt && preset.fmt.italic);
      nd.underline = !!(preset.fmt && preset.fmt.underline); nd.strike = !!(preset.fmt && preset.fmt.strike);
      if (preset.fontFamily !== undefined) nd.fontFamily = preset.fontFamily || '';
      if (preset.fontSize != null) nd.fontSize = Number(preset.fontSize);
      nd.preset = preset.key;
      if (nd._applyStyle) nd._applyStyle();
    }

    let _notePresetEditorDraft = [];
    window.noteGetPresetEditorDraft = () => _notePresetEditorDraft;
    window.noteSetPresetEditorDraft = (val) => { _notePresetEditorDraft = val; };

    function noteOpenPresetEditor() {
      if (typeof boardCustomiseOpen === 'function') {
        boardCustomiseOpen();
      }
      if (typeof boardCustomiseSetTab === 'function') {
        boardCustomiseSetTab('notes');
      }
      // Expand the Note Preset Styles section
      setTimeout(() => {
        const titleEl = Array.from(document.querySelectorAll('#board-customise-modal .bc-section-title'))
          .find(el => el.textContent.includes('Note Preset Styles'));
        if (titleEl) {
          const sec = titleEl.parentElement;
          sec.classList.remove('collapsed');
          sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 150);
    }
    window.noteOpenPresetEditor = noteOpenPresetEditor;

    function noteClosePresetEditor() {
      if (typeof boardCustomiseClose === 'function') {
        boardCustomiseClose();
      }
    }
    window.noteClosePresetEditor = noteClosePresetEditor;

    function _notePresetEditorRender() {
      function _wnEsc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
      function _wnSafeHex(s) { return /^#[0-9a-fA-F]{6}$/.test(s || '') ? s : '#ffffff'; }
      const list = document.getElementById('note-preset-editor-list');
      if (!list) return;
      list.innerHTML = '';
      const hdr = document.createElement('div');
      hdr.className = 'con-preset-editor-labels';
      hdr.innerHTML = `<span></span><span>Key</span><span>Label</span><span title="${t('conPresetBgColorTitle')}">BG</span><span title="${t('conPresetTextColorTitle')}">Txt</span><span title="${t('conPresetBorderColorTitle')}">Bdr</span><span title="${t('conPresetBorderWidthTitle')}">W</span><span title="${t('conPresetBorderStyleTitle')}">Style</span><span>Font</span><span title="${t('conPresetFontSizeTitle')}">Size</span><span>Fmt</span><span></span>`;
      list.appendChild(hdr);
      _notePresetEditorDraft.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'con-preset-editor-row';
        row.draggable = true;
        row.innerHTML = `
          <span class="pe-drag-handle" title="Drag to reorder">⠇</span>
          <input type="text" class="pe-key" value="${_wnEsc(p.key)}" maxlength="12" placeholder="key" title="Short code shown on button">
          <input type="text" class="pe-label" value="${_wnEsc(p.label)}" maxlength="24" placeholder="Label" title="${t('conPresetTooltipTitle')}">
          <input type="color" class="pe-bg"    value="${_wnSafeHex(p.bg)}"          title="${t('conPresetBgColorTitle')}">
          <input type="color" class="pe-color" value="${_wnSafeHex(p.color)}"       title="${t('conPresetTextColorTitle')}">
          <input type="color" class="pe-bdr"   value="${_wnSafeHex(p.borderColor)}" title="${t('conPresetBorderColorTitle')}">
          <input type="number" class="pe-bw" min="0" max="10" value="${p.borderWidth || 0}" title="${t('conPresetBorderWidthTitle')}" style="font-family:inherit;font-size:0.78rem;border:1.5px solid #ccc;border-radius:3px;padding:3px 4px;outline:none;min-width:0;width:100%;">
          <select class="pe-bs" title="${t('conPresetBorderStyleTitle')}">
            <option value="solid"  ${p.borderStyle === 'solid' ? 'selected' : ''}>${t('conPresetSolid')}</option>
            <option value="dashed" ${p.borderStyle === 'dashed' ? 'selected' : ''}>${t('conPresetDashed')}</option>
            <option value="dotted" ${p.borderStyle === 'dotted' ? 'selected' : ''}>${t('conPresetDotted')}</option>
            <option value="double" ${p.borderStyle === 'double' ? 'selected' : ''}>${t('conPresetDouble')}</option>
          </select>
          <div class="pe-font-wrap"></div>
          <input type="number" class="pe-fs" min="6" max="96" value="${p.fontSize != null ? p.fontSize : ''}" placeholder="—" title="${t('conPresetFontSizeTitle')}" style="font-family:inherit;font-size:0.78rem;border:1.5px solid #ccc;border-radius:3px;padding:3px 4px;outline:none;min-width:0;width:100%;">
          <div class="pe-fmt-btns">
            <button class="pe-fmt-btn${p.fmt.bold ? ' active' : ''}" data-fmt="bold" onclick="this.classList.toggle('active')" title="${t('conPresetBoldTitle')}"><b>B</b></button>
            <button class="pe-fmt-btn${p.fmt.italic ? ' active' : ''}" data-fmt="italic" onclick="this.classList.toggle('active')" title="${t('conPresetItalicTitle')}"><i>I</i></button>
            <button class="pe-fmt-btn${p.fmt.underline ? ' active' : ''}" data-fmt="under" onclick="this.classList.toggle('active')" title="${t('conPresetUnderlineTitle')}"><u>U</u></button>
            <button class="pe-fmt-btn${p.fmt.strike ? ' active' : ''}" data-fmt="strike" onclick="this.classList.toggle('active')" title="${t('conPresetStrikethroughTitle')}"><s>S</s></button>
          </div>
          <button class="con-preset-editor-del-btn" title="${t('conPresetRemoveTitle')}" onclick="notePresetEditorDeleteRow(${i})">🗑</button>
        `;
        const fontWrap = row.querySelector('.pe-font-wrap');
        if (fontWrap && typeof _bcBuildFontSelect === 'function') {
          const fsel = _bcBuildFontSelect('', p.fontFamily || '', '');
          fsel.className = 'pe-font';
          fsel.title = 'Font family (blank = default)';
          fsel.style.cssText = 'width:100%;font-size:0.72rem;border:1.5px solid #ccc;border-radius:3px;padding:2px 3px;font-family:inherit;';
          fontWrap.appendChild(fsel);
        }
        list.appendChild(row);
      });
      const addBtn = document.getElementById('note-preset-add-btn');
      if (addBtn) addBtn.disabled = _notePresetEditorDraft.length >= 15;
      _notePresetEditorEnableDrag(list);
    }
    window._notePresetEditorRender = _notePresetEditorRender;

    function _notePresetEditorFlushDOM() {
      const rows = document.querySelectorAll('#note-preset-editor-list .con-preset-editor-row');
      const flushed = [];
      rows.forEach(row => {
        const key = (row.querySelector('.pe-key').value || '').trim();
        const label = (row.querySelector('.pe-label').value || key).trim();
        if (!key) return;
        const bg = row.querySelector('.pe-bg').value || '#ffffff';
        const color = row.querySelector('.pe-color').value || '#111111';
        const borderColor = row.querySelector('.pe-bdr').value || '#111111';
        const borderWidth = Math.max(0, Math.min(10, parseInt(row.querySelector('.pe-bw').value) || 0));
        const borderStyle = row.querySelector('.pe-bs').value || 'solid';
        const fmtBtns = row.querySelector('.pe-fmt-btns');
        const fmt = {
          bold: fmtBtns ? fmtBtns.querySelector('[data-fmt="bold"]').classList.contains('active') : false,
          italic: fmtBtns ? fmtBtns.querySelector('[data-fmt="italic"]').classList.contains('active') : false,
          underline: fmtBtns ? fmtBtns.querySelector('[data-fmt="under"]').classList.contains('active') : false,
          strike: fmtBtns ? fmtBtns.querySelector('[data-fmt="strike"]').classList.contains('active') : false
        };
        const fontSel = row.querySelector('.pe-font');
        const fontFamily = fontSel ? (fontSel.value || '') : '';
        const fsInput = row.querySelector('.pe-fs');
        const fontSize = fsInput && fsInput.value.trim() !== '' ? Math.max(6, Math.min(96, parseInt(fsInput.value))) : null;
        flushed.push({ key, label, bg, color, borderColor, borderWidth, borderStyle, fontFamily, fontSize, fmt });
      });
      if (flushed.length > 0) _notePresetEditorDraft = flushed;
    }

    window.notePresetEditorDeleteRow = function (i) {
      _notePresetEditorFlushDOM();
      _notePresetEditorDraft.splice(i, 1);
      _notePresetEditorRender();
    };

    function _notePresetEditorEnableDrag(list) {
      let dragSrc = null;
      list.querySelectorAll('.con-preset-editor-row').forEach(row => {
        const handle = row.querySelector('.pe-drag-handle');
        if (handle) {
          handle.addEventListener('mousedown', () => { row.draggable = true; });
          handle.addEventListener('mouseup', () => { row.draggable = false; });
        }
        row.addEventListener('dragstart', e => { dragSrc = row; e.dataTransfer.effectAllowed = 'move'; row.classList.add('pe-row-dragging'); });
        row.addEventListener('dragend', () => { row.classList.remove('pe-row-dragging'); list.querySelectorAll('.con-preset-editor-row').forEach(r => r.classList.remove('pe-row-drag-over')); dragSrc = null; });
        row.addEventListener('dragover', e => { e.preventDefault(); if (dragSrc && dragSrc !== row) row.classList.add('pe-row-drag-over'); });
        row.addEventListener('dragleave', () => row.classList.remove('pe-row-drag-over'));
        row.addEventListener('drop', e => {
          e.preventDefault(); row.classList.remove('pe-row-drag-over');
          if (!dragSrc || dragSrc === row) return;
          const rows = Array.from(list.querySelectorAll('.con-preset-editor-row'));
          const fromIdx = rows.indexOf(dragSrc), toIdx = rows.indexOf(row);
          if (fromIdx < 0 || toIdx < 0) return;
          _notePresetEditorFlushDOM();
          const [moved] = _notePresetEditorDraft.splice(fromIdx, 1);
          _notePresetEditorDraft.splice(toIdx, 0, moved);
          _notePresetEditorRender();
        });
      });
    }

    window.notePresetEditorAddRow = function () {
      if (_notePresetEditorDraft.length >= 15) return;
      _notePresetEditorFlushDOM();
      _notePresetEditorDraft.push({ key: 'new', label: 'New', bg: '#ffffff', color: '#111111', borderColor: '#111111', borderWidth: 0, borderStyle: 'solid', fontFamily: '', fontSize: null, fmt: { bold: false, italic: false, underline: false, strike: false } });
      _notePresetEditorRender();
      const rows = document.querySelectorAll('#note-preset-editor-list .con-preset-editor-row');
      const last = rows[rows.length - 1];
      if (last) { const kf = last.querySelector('.pe-key'); if (kf) kf.focus(); }
    };

    window.notePresetEditorSave = async function () {
      const rows = document.querySelectorAll('#note-preset-editor-list .con-preset-editor-row');
      const result = [];
      rows.forEach(row => {
        const key = (row.querySelector('.pe-key').value || '').trim();
        const label = (row.querySelector('.pe-label').value || key).trim();
        const bg = row.querySelector('.pe-bg').value || '#ffffff';
        const color = row.querySelector('.pe-color').value || '#111111';
        const borderColor = row.querySelector('.pe-bdr').value || '#111111';
        const borderWidth = Math.max(0, Math.min(10, parseInt(row.querySelector('.pe-bw').value) || 0));
        const borderStyle = row.querySelector('.pe-bs').value || 'solid';
        const fmtBtns = row.querySelector('.pe-fmt-btns');
        const fmt = {
          bold: fmtBtns ? fmtBtns.querySelector('[data-fmt="bold"]').classList.contains('active') : false,
          italic: fmtBtns ? fmtBtns.querySelector('[data-fmt="italic"]').classList.contains('active') : false,
          underline: fmtBtns ? fmtBtns.querySelector('[data-fmt="under"]').classList.contains('active') : false,
          strike: fmtBtns ? fmtBtns.querySelector('[data-fmt="strike"]').classList.contains('active') : false
        };
        if (!key) return;
        const fontSel = row.querySelector('.pe-font');
        const fontFamily = fontSel ? (fontSel.value || '') : '';
        const fsInput = row.querySelector('.pe-fs');
        const fontSize = fsInput && fsInput.value.trim() !== '' ? Math.max(6, Math.min(96, parseInt(fsInput.value))) : null;
        result.push({ key, label, bg, color, borderColor, borderWidth, borderStyle, fontFamily, fontSize, fmt });
      });
      const bc = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : {};
      bc.notePresets = result;
      window.BOARD_CONFIG = bc;
      const lines = 'const BOARD_CONFIG = ' + JSON.stringify(bc, null, 2) + ';\nwindow.BOARD_CONFIG = BOARD_CONFIG;\n';
      if (window.Desktop && typeof Desktop.saveText === 'function') {
        try { await Desktop.saveText('user', 'board-config.js', lines); mdbToast('✅ Note presets saved to board-config.js'); }
        catch (err) { mdbToast('⚠️ Could not save: ' + (err && err.message ? err.message : String(err))); }
      } else {
        const blob = new Blob([lines], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'board-config.js'; a.click();
        URL.revokeObjectURL(url);
        mdbToast('📥 board-config.js downloaded — replace the file in user/');
      }
      noteClosePresetEditor();
    };

    function wnStyleRefresh() {
      if (!_wnActiveNote) return;
      const overlay = document.getElementById('wn-style-overlay');
      if (!overlay || !overlay.classList.contains('active')) return;
      const noteEl = wnGetNoteElementById(_wnActiveNote.id);
      wnStyleOpen(_wnActiveNote, noteEl || document.body, undefined, _wnPopupWordMeta);
    }

    let _wnCtxNoteData = null;

    function wnCtxOpen(noteData, noteEl, e) {
      _wnCtxNoteData = noteData;
      const menu = document.getElementById('wn-ctx-menu');
      if (!menu) return;
      const title = document.getElementById('wn-ctx-title');
      const hideItem = document.getElementById('wn-ctx-hide-item');
      const snippet = (noteData.text || '').trim().slice(0, 28) || 'Note';
      if (title) title.textContent = snippet + (noteData.text && noteData.text.length > 28 ? '…' : '');
      if (hideItem) hideItem.textContent = noteData.hidden ? '👁 Reveal note' : '👁 Hide note';
      menu.classList.add('visible');
      const MARGIN = 8;
      menu.style.maxHeight = Math.max(120, window.innerHeight - 2 * MARGIN) + 'px';
      menu.style.maxWidth = Math.max(180, window.innerWidth - 2 * MARGIN) + 'px';
      menu.style.overflowY = 'auto';
      menu.style.overflowX = 'hidden';

      const mw = menu.offsetWidth || 170, mh = menu.offsetHeight || 120;
      let x = e.clientX + 6, y = e.clientY + 6;
      if (x + mw > window.innerWidth - MARGIN) x = e.clientX - mw - 6;
      if (y + mh > window.innerHeight - MARGIN) y = e.clientY - mh - 6;

      const maxX = Math.max(MARGIN, window.innerWidth - mw - MARGIN);
      const maxY = Math.max(MARGIN, window.innerHeight - mh - MARGIN);
      x = Math.max(MARGIN, Math.min(maxX, x));
      y = Math.max(MARGIN, Math.min(maxY, y));

      menu.style.left = Math.round(x) + 'px';
      menu.style.top = Math.round(y) + 'px';
      menu.style.maxHeight = Math.max(120, window.innerHeight - y - MARGIN) + 'px';
    }

    function wnCtxClose() {
      _wnCtxNoteData = null;
      const menu = document.getElementById('wn-ctx-menu');
      if (menu) {
        menu.classList.remove('visible');
        menu.style.maxHeight = '';
      }
    }

    function wnCtxStyle() {
      const nd = _wnCtxNoteData; wnCtxClose(); if (!nd) return;
      wnStyleOpen(nd, wnGetNoteElementById(nd.id) || document.body);
    }
    function wnCtxDuplicate() {
      const nd = _wnCtxNoteData; wnCtxClose(); if (!nd) return;
      if (nd.id && nd.id.startsWith('cn')) { if (window.conPushUndo) window.conPushUndo(); conDuplicateNoteData(nd, 28, 22); }
    }
    function wnCtxDelete() {
      const nd = _wnCtxNoteData; wnCtxClose(); if (!nd) return; wnDeleteNoteData(nd);
    }
    function wnCtxToggleHide() {
      const nd = _wnCtxNoteData; wnCtxClose(); if (!nd) return;
      nd.hidden = !nd.hidden;
      if (typeof BoardAudioService !== 'undefined') BoardAudioService.playAction(nd.hidden ? 'mask_note' : 'reveal_note');
      if (nd._applyStyle) nd._applyStyle();
      wnApplyHiddenState(nd, wnGetNoteElementById(nd.id));
      if (typeof conRedrawEdges === 'function') conRedrawEdges();
      if (typeof window._conMirrorSend === 'function') {
        window._conMirrorSend({ type: 'note-hide', id: String(nd.id), hidden: !!nd.hidden });
      }
    }

    function wnStyleEditNote() {
      if (!_wnActiveNote) return;
      const nd = _wnActiveNote; wnStyleDismiss(); wnFocusNoteData(nd);
    }
    function wnStyleBlink() {
      if (!_wnActiveNote) return;
      const targetNotes = (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 1 && conNoteSelected.has(_wnActiveNote.id))
        ? (window.conGetNotes ? window.conGetNotes().filter(n => conNoteSelected.has(n.id)) : [_wnActiveNote])
        : [_wnActiveNote];

      const newBlink = !_wnActiveNote.blink;
      targetNotes.forEach(nd => {
        nd.blink = newBlink;
        const noteEl = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nd.id) : null;
        if (noteEl) {
          noteEl.classList.toggle('wn-blink', !!newBlink);
          const quickBlink = noteEl.querySelector('.wn-note-mini-btn[data-action="blink"]');
          if (quickBlink) quickBlink.classList.toggle('active', !!newBlink);
        }
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'note-blink', noteId: String(nd.id), blink: !!newBlink });
        }
      });
      const blinkBtn = document.getElementById('wn-sp-blink-btn');
      if (blinkBtn) blinkBtn.classList.toggle('active', !!newBlink);
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
    }
    function wnStyleDeleteNote() {
      if (!_wnActiveNote) return; const nd = _wnActiveNote; wnStyleDismiss(); wnDeleteNoteData(nd);
    }
    function wnStyleStopStudentInput() {
      if (!_wnActiveNote) return;
      if (typeof noteStudentStopInputForNote === 'function') noteStudentStopInputForNote(_wnActiveNote);
      wnStyleDismiss();
    }
    function wnStyleOpenStudentInput() {
      if (!_wnActiveNote) return;
      if (typeof noteStudentSetInputClass === 'function') noteStudentSetInputClass(_wnActiveNote, true);
      if (_wnActiveNote.id && typeof _noteStudentHub !== 'undefined') _noteStudentHub.constellationNoteId = _wnActiveNote.id;
      wnStyleDismiss();
      if (typeof noteStudentPopupOpen === 'function') noteStudentPopupOpen();
    }
    function wnStyleDuplicateNote() {
      if (!_wnActiveNote || !_wnActiveNote.id || !_wnActiveNote.id.startsWith('cn')) return;
      const nd = _wnActiveNote; wnStyleDismiss();
      if (window.conPushUndo) window.conPushUndo();
      conDuplicateNoteData(nd, 28, 22);
    }

    // Convert a single note to one or more nodes based on mode: 'entire' | 'lines' | 'sentences' | 'words'
    function conConvertSingleNoteToNodes(noteData, mode) {
      if (!noteData) return [];
      let rawText = '';
      const noteEl = wnGetNoteElementById(noteData.id);
      if (noteEl) {
        const editor = noteEl.querySelector('.wn-note-editor, textarea');
        if (editor) {
          rawText = editor.innerText || editor.textContent || editor.value || '';
        }
      }
      if (!rawText) {
        if (noteData.html) {
          let html = String(noteData.html);
          html = html.replace(/<br\s*[\/]?>/gi, '\n')
                     .replace(/<\/p>/gi, '\n')
                     .replace(/<\/div>/gi, '\n')
                     .replace(/<p[^>]*>/gi, '')
                     .replace(/<div[^>]*>/gi, '');
          const tmp = document.createElement('div');
          tmp.innerHTML = html;
          rawText = tmp.textContent || tmp.innerText || '';
        } else {
          rawText = noteData.text || '';
        }
      }

      let items = [];
      const convMode = mode || 'entire';
      if (convMode === 'lines') {
        items = rawText.split(/\r?\n+/).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
      } else if (convMode === 'words') {
        const plain = rawText.replace(/<[^>]+>/g, ' ');
        items = plain.split(/\s+/).map(s => s.trim()).filter(Boolean);
      } else if (convMode === 'sentences') {
        items = rawText.split(/(?<=[.!?]+)(?:\s+|\n+)|(?:\r?\n)+/).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
      } else {
        const single = String(rawText).replace(/<[^>]+>/g, '').trim();
        if (single) items = [single];
      }
      if (!items.length) items = ['Word'];

      const x = Number.isFinite(noteData.x) ? noteData.x : 100;
      const startY = Number.isFinite(noteData.y) ? noteData.y : 100;
      const pageNum = noteData.pageNum != null ? noteData.pageNum : null;
      const baseFs = noteData.fontSize ? Math.max(8, Math.min(96, Number(noteData.fontSize) || 16)) : 16;
      const stepY = Math.max(48, Math.round(baseFs * 2.2));

      const createdNodes = [];
      for (let i = 0; i < items.length; i++) {
        const plainText = items[i];
        const posY = startY + (i * stepY);
        const newId = (typeof conAddWordAt === 'function')
          ? conAddWordAt(plainText, x, posY, pageNum)
          : (window.conAddWordAt ? window.conAddWordAt(plainText, x, posY, pageNum) : null);
        const allNodes = (typeof conNodes !== 'undefined')
          ? conNodes
          : (window.conGetNodes ? window.conGetNodes() : []);
        const newNode = allNodes.find(n => n.id === newId);
        if (newNode) {
          if (noteData.bg && newNode.el) newNode.el.style.background = noteData.bg;
          if (noteData.color && newNode.el) newNode.el.style.color = noteData.color;
          if (noteData.fontFamily) {
            newNode.fontFamily = noteData.fontFamily;
            if (newNode.el) newNode.el.style.fontFamily = noteData.fontFamily;
          }
          if (noteData.fontSize) {
            const setFs = (typeof conSetNodeBaseFontSize === 'function') ? conSetNodeBaseFontSize : window.conSetNodeBaseFontSize;
            if (setFs) setFs(newNode, baseFs);
          }
          newNode.fmt = Object.assign({}, newNode.fmt || {}, {
            bold: !!noteData.bold,
            italic: !!noteData.italic,
            underline: !!noteData.underline,
            strike: !!noteData.strike
          });
          if (noteData.borderColor) {
            newNode.borderColor = noteData.borderColor;
            if (newNode.el) newNode.el.style.borderColor = noteData.borderColor;
          }
          if (noteData.borderWidth != null) {
            newNode.borderWidth = noteData.borderWidth;
            if (newNode.el) newNode.el.style.borderWidth = noteData.borderWidth + 'px';
          }
          if (noteData.borderStyle) {
            newNode.borderStyle = noteData.borderStyle;
            if (newNode.el) newNode.el.style.borderStyle = noteData.borderStyle;
          }
          if (noteData.highlight) {
            newNode.highlight = noteData.highlight;
          }
          if (noteData.locked) {
            newNode.locked = true;
            const syncLock = (typeof conSyncNodeLockState === 'function') ? conSyncNodeLockState : window.conSyncNodeLockState;
            if (syncLock) syncLock(newNode);
          }
          if (noteData.hidden) {
            newNode.masked = true;
            if (newNode.el) newNode.el.classList.add('con-masked');
          }
          const renderLabel = (typeof conRenderNodeLabel === 'function') ? conRenderNodeLabel : window.conRenderNodeLabel;
          if (renderLabel) renderLabel(newNode);
          createdNodes.push(newNode);
        }
      }
      wnDeleteNoteData(noteData);
      return createdNodes;
    }

    // Convert a single note to a node (backwards-compatible wrapper)
    function conConvertSingleNoteToNode(noteData, mode) {
      const list = conConvertSingleNoteToNodes(noteData, mode || 'entire');
      return (list && list.length) ? list[0] : null;
    }
    window.conConvertSingleNoteToNode = conConvertSingleNoteToNode;
    window.conConvertSingleNoteToNodes = conConvertSingleNoteToNodes;

    let _conNoteConvertTargetNotes = null;
    let _conNoteConvertKeyHandler = null;

    function conOpenNoteConvertModal(targetNotes, anchorBtn) {
      if (!targetNotes || !targetNotes.length) return;
      _conNoteConvertTargetNotes = targetNotes;
      const modal = document.getElementById('con-note-convert-modal');
      const btn = anchorBtn || document.getElementById('wn-sp-convert-btn');
      if (!modal) {
        window.conNoteConvertChoose('entire');
        return;
      }
      if (typeof i18n !== 'undefined' && i18n.updatePage) {
        i18n.updatePage();
      }
      modal.style.display = 'flex';
      if (typeof boardPositionSplitDropdown === 'function' && btn) {
        boardPositionSplitDropdown(btn, modal);
      } else if (btn) {
        const btnRect = btn.getBoundingClientRect();
        const ddHeight = modal.offsetHeight || 160;
        const ddWidth = modal.offsetWidth || 185;
        let left = Math.max(8, Math.min(btnRect.left, window.innerWidth - ddWidth - 8));
        let top = btnRect.bottom + 4;
        if (top + ddHeight > window.innerHeight - 8 && btnRect.top > ddHeight + 8) {
          top = btnRect.top - ddHeight - 4;
        }
        modal.style.position = 'fixed';
        modal.style.zIndex = '10005';
        modal.style.left = Math.round(left) + 'px';
        modal.style.top = Math.round(top) + 'px';
      }
      const firstBtn = modal.querySelector('.con-convert-opt-btn, .board-split-item');
      if (firstBtn) firstBtn.focus();

      if (_conNoteConvertKeyHandler) {
        document.removeEventListener('keydown', _conNoteConvertKeyHandler);
      }
      _conNoteConvertKeyHandler = function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          window.conNoteConvertModalCancel();
        }
      };
      document.addEventListener('keydown', _conNoteConvertKeyHandler);
    }

    function conCloseNoteConvertModal() {
      const modal = document.getElementById('con-note-convert-modal');
      if (modal) modal.style.display = 'none';
      if (_conNoteConvertKeyHandler) {
        document.removeEventListener('keydown', _conNoteConvertKeyHandler);
        _conNoteConvertKeyHandler = null;
      }
      _conNoteConvertTargetNotes = null;
    }

    window.conCloseNoteConvertModal = conCloseNoteConvertModal;
    window.conNoteConvertModalCancel = function () {
      conCloseNoteConvertModal();
    };

    window.conNoteConvertChoose = function (mode) {
      const targets = _conNoteConvertTargetNotes || (_wnActiveNote ? [_wnActiveNote] : []);
      conCloseNoteConvertModal();
      if (typeof wnStyleDismiss === 'function') wnStyleDismiss();
      if (!targets || !targets.length) return;

      if (window.conPushUndo) window.conPushUndo();

      const createdNodes = [];
      targets.forEach(nd => {
        const nodes = conConvertSingleNoteToNodes(nd, mode);
        if (Array.isArray(nodes)) createdNodes.push(...nodes);
      });

      if (typeof conNoteSelected !== 'undefined' && conNoteSelected) conNoteSelected.clear();
      if (createdNodes.length === 1) {
        const doSelect = (typeof conSelect === 'function') ? conSelect : window.conSelect;
        if (doSelect) doSelect(createdNodes[0].id);
      }
      if (typeof conRedrawEdges === 'function') conRedrawEdges();
      else if (window.conRedrawEdges) window.conRedrawEdges();
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true });
    };

    // Convert active/selected note(s) to word node(s)
    window.wnStyleConvertToNode = function (event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const dd = document.getElementById('con-note-convert-modal');
      const btn = document.getElementById('wn-sp-convert-btn') || (event && (event.currentTarget || (event.target && event.target.closest('button'))));
      if (dd && dd.style.display !== 'none') {
        conCloseNoteConvertModal();
        return;
      }
      const caseDd = document.getElementById('wn-sp-case-dropdown');
      if (caseDd) caseDd.style.display = 'none';

      const targetNotes = (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0 && (!_wnActiveNote || conNoteSelected.has(_wnActiveNote.id)))
        ? [...conNoteSelected].map(id => conNotes.find(n => n.id === id)).filter(Boolean)
        : (_wnActiveNote ? [_wnActiveNote] : (_wnCtxNoteData ? [_wnCtxNoteData] : []));
      if (!targetNotes.length) return;

      if (typeof wnCtxClose === 'function') wnCtxClose();

      conOpenNoteConvertModal(targetNotes, btn);
    };

    // ── Save note to Planner ─────────────────────────────────────────────
    function wnpOpen() {
      const nd = _wnActiveNote;
      if (!nd) return;
      wnStyleDismiss();

      const modal = document.getElementById('wn-planner-modal');
      if (!modal) return;

      // i18n labels
      document.getElementById('wn-planner-modal-title').textContent = t('wnpTitle');
      document.getElementById('wn-planner-lbl-class').textContent = t('wnpClass');
      document.getElementById('wn-planner-lbl-date').textContent = t('wnpDate');
      document.getElementById('wn-planner-lbl-topic').textContent = t('wnpFieldTopic');
      document.getElementById('wn-planner-lbl-type').textContent = t('wnpType');
      document.getElementById('wn-planner-lbl-field').textContent = t('wnpField');
      document.getElementById('wn-planner-cancel-btn').textContent = t('btnCancel');
      document.getElementById('wn-planner-save-btn').textContent = t('wnpSave');
      document.getElementById('wn-planner-topic').value = '';
      document.querySelectorAll('#wn-planner-modal [data-i18n-opt]').forEach(opt => {
        opt.textContent = t(opt.dataset.i18nOpt);
      });

      // Note text preview
      const text = (nd.text || '').trim();
      document.getElementById('wn-planner-preview').textContent = text || '—';

      // Populate class selector
      const classSel = document.getElementById('wn-planner-class');
      classSel.innerHTML = '';
      const groups = (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS) ? CLASS_GROUPS : {};
      const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
      const classIds = Object.keys(groups).filter(id => !(meta[id] || {}).archived)
        .sort((a, b) => ((meta[a] && meta[a].name) || a).localeCompare((meta[b] && meta[b].name) || b));
      if (!classIds.length) {
        const opt = document.createElement('option');
        opt.textContent = t('wnpNoClasses'); opt.disabled = true;
        classSel.appendChild(opt);
      } else {
        classIds.forEach(id => {
          const opt = document.createElement('option');
          opt.value = id; opt.textContent = (meta[id] && meta[id].name) ? meta[id].name : id;
          classSel.appendChild(opt);
        });
      }

      // Restore last-used class if still valid
      const lastCls = localStorage.getItem('cmt-board-wnp-class');
      if (lastCls && classIds.includes(lastCls)) classSel.value = lastCls;

      // Date: today
      document.getElementById('wn-planner-date').value = new Date().toISOString().slice(0, 10);

      // Restore last-used field
      const lastField = localStorage.getItem('cmt-board-wnp-field');
      const fieldSel = document.getElementById('wn-planner-field');
      if (lastField) fieldSel.value = lastField;

      // Clear status and reset save button
      document.getElementById('wn-planner-status').textContent = '';
      const _sb = document.getElementById('wn-planner-save-btn');
      if (_sb) { _sb.disabled = false; _sb.style.opacity = ''; }

      // Store active note id for save
      modal.dataset.noteId = nd.id;

      modal.style.display = 'flex';
    }

    function wnpClose() {
      const modal = document.getElementById('wn-planner-modal');
      if (modal) modal.style.display = 'none';
    }

    async function wnpSave() {
      const classId = document.getElementById('wn-planner-class').value;
      const date = document.getElementById('wn-planner-date').value;
      const type = document.getElementById('wn-planner-type').value;
      const field = document.getElementById('wn-planner-field').value;
      const noteId = document.getElementById('wn-planner-modal').dataset.noteId;

      if (!classId || !date) return;

      // Resolve note text from the active note
      const nd = (typeof conNotes !== 'undefined' ? conNotes.find(n => n.id === noteId) : null) || _wnActiveNote;
      const text = nd ? (nd.text || '').trim() : document.getElementById('wn-planner-preview').textContent;

      // Remember last-used class and field
      localStorage.setItem('cmt-board-wnp-class', classId);
      localStorage.setItem('cmt-board-wnp-field', field);

      const saveBtn = document.getElementById('wn-planner-save-btn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '.6'; }

      // Read existing entries for this class
      let existing = [];
      try {
        const r = await Desktop.readByPath('user', 'planner/' + classId + '.js');
        if (r && r.ok && r.content) {
          const tmpWin = { PLANNER_ENTRIES_BY_CLASS: {} };
          // eslint-disable-next-line no-new-func
          new Function('window', r.content)(tmpWin);
          existing = Array.isArray(tmpWin.PLANNER_ENTRIES_BY_CLASS[classId])
            ? tmpWin.PLANNER_ENTRIES_BY_CLASS[classId]
            : [];
        }
      } catch (_e) { }

      const id = 'pe' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const topicVal = (document.getElementById('wn-planner-topic').value || '').trim();
      const entry = { id, classId, date, type, topic: topicVal, objective: '', readings: '', activities: '', homework: '', notes: '', reminder: null, gsLink: null };
      entry[field] = text;
      existing.push(entry);

      const content = 'window.PLANNER_ENTRIES_BY_CLASS = window.PLANNER_ENTRIES_BY_CLASS || {};\n' +
        'window.PLANNER_ENTRIES_BY_CLASS[' + JSON.stringify(classId) + '] = ' +
        JSON.stringify(existing, null, 2) + ';\n';

      try {
        const r = await Desktop.saveText('user', classId + '.js', content, 'planner');
        const statusEl = document.getElementById('wn-planner-status');
        if (r && r.ok) {
          if (statusEl) statusEl.textContent = t('wnpSaved');
          setTimeout(() => wnpClose(), 1200);
        } else {
          if (statusEl) statusEl.textContent = '✗ ' + (r && r.error || 'Error');
          if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = ''; }
        }
      } catch (err) {
        const statusEl = document.getElementById('wn-planner-status');
        if (statusEl) statusEl.textContent = '✗ ' + err.message;
        if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = ''; }
      }
    }

    // Close planner modal on backdrop click (deferred — modal HTML is at end of body)
    document.addEventListener('DOMContentLoaded', function () {
      const _wnpm = document.getElementById('wn-planner-modal');
      if (_wnpm) _wnpm.addEventListener('click', function (e) { if (e.target === this) wnpClose(); });
    });

    function wnStyleSplitNote() {
      if (!_wnActiveNote) return;
      const nd = _wnActiveNote;
      if (!nd.id || !nd.id.startsWith('cn')) return;
      const noteEl = wnGetNoteElementById(nd.id);
      if (!noteEl) return;
      const editor = noteEl.querySelector('.wn-note-editor, textarea');
      if (!editor || editor.tagName === 'TEXTAREA') return;
      let savedRange = _wnSavedSelectionRange;
      if (!savedRange) {
        const sel = window.getSelection && window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0);
          if (editor === r.commonAncestorContainer || editor.contains(r.commonAncestorContainer)) {
            savedRange = r;
          }
        }
      }
      const zoom = window.conGetZoom ? window.conGetZoom() : 1;

      // Measure cursor / split line bottom position before altering content
      let splitPointH = 0;
      if (savedRange && (editor === savedRange.commonAncestorContainer || editor.contains(savedRange.commonAncestorContainer))) {
        try {
          const rects = savedRange.getClientRects();
          const rRect = (rects && rects.length > 0) ? rects[0] : savedRange.getBoundingClientRect();
          const noteRect = noteEl.getBoundingClientRect();
          if (rRect && noteRect && rRect.bottom > 0) {
            const extraPad = (Number(nd.borderWidth) || 1) + 10;
            splitPointH = Math.round((rRect.bottom - noteRect.top) / Math.max(0.5, zoom)) + extraPad;
          }
        } catch (_) {}
      }

      let beforeHTML = editor.innerHTML, afterHTML = '';
      if (savedRange && (editor === savedRange.commonAncestorContainer || editor.contains(savedRange.commonAncestorContainer))) {
        const fragToHTML = frag => { const d = document.createElement('div'); d.appendChild(frag); return d.innerHTML; };
        const r1 = document.createRange();
        r1.selectNodeContents(editor);
        r1.setEnd(savedRange.startContainer, savedRange.startOffset);
        beforeHTML = fragToHTML(r1.cloneContents());
        const r2 = document.createRange();
        r2.selectNodeContents(editor);
        r2.setStart(savedRange.startContainer, savedRange.startOffset);
        afterHTML = fragToHTML(r2.cloneContents());
      }
      const trimBr = h => h.replace(/^(\s*<br\s*\/?>\s*)+|(\s*<br\s*\/?>\s*)+$/gi, '').trim();
      beforeHTML = trimBr(beforeHTML);
      afterHTML = trimBr(afterHTML);
      if (window.conPushUndo) window.conPushUndo();
      wnStyleDismiss();
      _wnSavedSelectionRange = null;

      // Put remaining content into the initial note's editor
      const renderedBefore = (typeof wnRenderMathHtml === 'function') ? wnRenderMathHtml(beforeHTML) : beforeHTML;
      editor.innerHTML = renderedBefore;
      wnSyncNoteDataFromEditor(nd, editor);

      // Reset explicit height styles to measure the natural layout height of remaining content
      noteEl.style.height = '';
      editor.style.height = 'auto';
      editor.style.overflowY = 'hidden';

      const naturalH = Math.max(40, Math.round(noteEl.offsetHeight / Math.max(0.5, zoom)));
      const reducedH = Math.max(40, Math.max(splitPointH || 0, naturalH));

      // Update initial note's stored height and inline styles
      nd.height = reducedH;
      if (nd.manualSize) {
        wnApplyStoredSize(noteEl, editor, nd, zoom);
      } else {
        noteEl.style.height = (reducedH * zoom) + 'px';
        editor.style.height = Math.max(16, (reducedH - 12) * zoom) + 'px';
        nd.liveBaseHeight = reducedH;
        if (typeof conNoteAutosize === 'function') conNoteAutosize(editor, nd);
      }
      if (nd._applyStyle) nd._applyStyle();

      noteEl.style.height = (reducedH * zoom) + 'px';
      editor.style.height = Math.max(16, (reducedH - 12) * zoom) + 'px';

      const belowY = Math.round(nd.y + noteEl.offsetHeight / Math.max(0.5, zoom) + 8);
      const newId = conGetNextNoteId();
      const clone = Object.assign({}, nd, {
        id: newId,
        nodeId: null,
        y: belowY,
        html: afterHTML,
        text: '',
        manualSize: false,
        width: null,
        height: null,
        w: null,
        h: null,
        liveBaseWidth: null,
        liveBaseHeight: null,
        _cachedW: null,
        _cachedH: null,
        emojiStickers: []
      });
      delete clone._applyStyle;
      delete clone._updateContent;
      conNotes.push(clone);
      conNoteBuild(clone);

      const newNoteEl = wnGetNoteElementById(newId);
      const newEditor = newNoteEl ? newNoteEl.querySelector('.wn-note-editor') : null;
      if (newEditor && typeof conNoteAutosize === 'function') {
        conNoteAutosize(newEditor, clone);
      }

      // Automatically select the new split note
      if (typeof window.conSelectNote === 'function') {
        window.conSelectNote(newId);
      }

      if (typeof window._conMirrorSend === 'function') {
        window._conMirrorSend({
          type: 'note-text',
          id: String(nd.id),
          html: nd.html,
          text: nd.text,
          baseWidth: nd.liveBaseWidth,
          baseHeight: nd.liveBaseHeight,
          width: nd.width || nd.liveBaseWidth,
          height: nd.height || nd.liveBaseHeight,
          manualSize: !!nd.manualSize
        });
        window._conMirrorSend({
          type: 'note-resize',
          id: String(nd.id),
          width: Number(nd.width) || Math.round(noteEl.offsetWidth / Math.max(0.5, zoom)),
          height: reducedH,
          baseWidth: nd.liveBaseWidth,
          baseHeight: reducedH,
          manualSize: !!nd.manualSize
        });
      }
      if (typeof window._conMirrorBroadcast === 'function') {
        window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
      }
      if (typeof conRedrawEdges === 'function') conRedrawEdges();
      if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();

      if (newEditor) setTimeout(() => newEditor.focus(), 0);
    }

    function wnCountWordsInText(text) {
      if (!text) return { words: 0, characters: 0, charactersNoSpaces: 0, lines: 0 };
      let raw = String(text).replace(/\r/g, '');
      if (/<[a-z][\s\S]*>/i.test(raw)) {
        const tmp = document.createElement('div');
        tmp.innerHTML = raw;
        tmp.querySelectorAll('.katex-html, .katex-mathml, annotation').forEach(el => el.remove());
        raw = tmp.innerText || tmp.textContent || '';
      }
      const trimmed = raw.trim();
      const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
      const characters = raw.length;
      const charactersNoSpaces = raw.replace(/\s/g, '').length;
      const lines = raw ? raw.split('\n').filter(l => l.trim().length > 0).length : 0;
      return { words, characters, charactersNoSpaces, lines };
    }
    window.wnCountWordsInText = wnCountWordsInText;

    function wnGetNoteText(nd) {
      if (!nd) return '';
      const noteEl = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nd.id) : null;
      if (noteEl) {
        const editor = noteEl.querySelector('.wn-note-editor, textarea');
        if (editor) wnSyncNoteDataFromEditor(nd, editor);
      }
      return nd.text || '';
    }
    window.wnGetNoteText = wnGetNoteText;

    function wnStyleCountWords(opts) {
      if (!_wnActiveNote && typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0) {
        const firstId = Array.from(conNoteSelected)[0];
        const found = (typeof conNotes !== 'undefined' && Array.isArray(conNotes)) ? conNotes.find(n => n.id === firstId) : null;
        if (found) _wnActiveNote = found;
      }
      if (!_wnActiveNote && document.activeElement) {
        const ed = document.activeElement.closest ? document.activeElement.closest('.wn-note-editor') : null;
        const pnote = ed ? ed.closest('.con-word-note') : null;
        if (pnote && pnote.dataset.id) {
          const found = (typeof conNotes !== 'undefined' && Array.isArray(conNotes)) ? conNotes.find(n => n.id === pnote.dataset.id) : null;
          if (found) _wnActiveNote = found;
        }
      }
      if (!_wnActiveNote) {
        if (!opts || !opts.silent) {
          if (typeof showToast === 'function') {
            const emptyLabel = (typeof i18n !== 'undefined' && i18n.t ? i18n.t('conSearchFilterNotes') : 'Notes') + ': 0';
            showToast(emptyLabel, true);
          }
        }
        return null;
      }

      const nd = _wnActiveNote;
      const curText = wnGetNoteText(nd);
      const stats = wnCountWordsInText(curText);

      const isMulti = typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 1 && conNoteSelected.has(nd.id);
      let totalStats = null;
      let multiCount = 0;
      if (isMulti) {
        let combinedText = '';
        conNoteSelected.forEach(id => {
          const item = (typeof conNotes !== 'undefined' && Array.isArray(conNotes)) ? conNotes.find(n => n.id === id) : null;
          if (item) {
            combinedText += (wnGetNoteText(item) + '\n');
            multiCount++;
          }
        });
        totalStats = wnCountWordsInText(combinedText);
      }

      let selStats = null;
      const savedRange = _wnSavedSelectionRange;
      if (savedRange && !savedRange.collapsed) {
        const selText = savedRange.toString();
        if (selText && selText.trim()) {
          selStats = wnCountWordsInText(selText);
        }
      }

      const row = document.getElementById('wn-sp-wordcount-row');
      const valEl = document.getElementById('wn-sp-wordcount-val');
      const charEl = document.getElementById('wn-sp-charcount-val');
      if (row && valEl) {
        valEl.textContent = isMulti ? `${totalStats.words} (${stats.words})` : String(stats.words);
        if (charEl) {
          charEl.textContent = isMulti ? `${totalStats.characters} (${stats.characters})` : String(stats.characters);
        }
      }

      if (!opts || !opts.silent) {
        let msg = '';
        if (isMulti && totalStats) {
          const tpl = (typeof i18n !== 'undefined' && i18n.t ? i18n.t('conWordCountMultiToast') : null) || 'Selected notes ({count}): {words} words · {chars} characters';
          msg = tpl
            .replace('{count}', multiCount)
            .replace('{words}', totalStats.words)
            .replace('{chars}', totalStats.characters);
        } else if (selStats) {
          const tpl = (typeof i18n !== 'undefined' && i18n.t ? i18n.t('conWordCountSelToast') : null) || 'Selected: {selWords} words ({selChars} chars) · Total: {words} words ({chars} chars)';
          msg = tpl
            .replace('{selWords}', selStats.words)
            .replace('{selChars}', selStats.characters)
            .replace('{words}', stats.words)
            .replace('{chars}', stats.characters);
        } else {
          const tpl = (typeof i18n !== 'undefined' && i18n.t ? i18n.t('conWordCountToast') : null) || 'Word count: {words} words · {chars} characters';
          msg = tpl
            .replace('{words}', stats.words)
            .replace('{chars}', stats.characters);
        }
        if (typeof showToast === 'function') {
          showToast(msg);
        }
      }
      return isMulti ? totalStats : stats;
    }
    window.wnStyleCountWords = wnStyleCountWords;

    function wnStyleToggleLock() {
      if (!_wnActiveNote) return;
      _wnActiveNote.locked = !_wnActiveNote.locked;
      const lockBtn = document.getElementById('wn-sp-lock-btn');
      if (lockBtn) lockBtn.innerHTML = _wnActiveNote.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" /> Unlock' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" /> Lock';
    }
    function wnStyleToggleHide() {
      if (!_wnActiveNote) return;
      _wnActiveNote.hidden = !_wnActiveNote.hidden;
      if (_wnActiveNote._applyStyle) _wnActiveNote._applyStyle();
      wnApplyHiddenState(_wnActiveNote, wnGetNoteElementById(_wnActiveNote.id));
      const hideBtn = document.getElementById('wn-sp-hide-btn');
      if (hideBtn) hideBtn.innerHTML = _wnActiveNote.hidden ? '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Reveal' : '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Hide';
      if (typeof conRedrawEdges === 'function') conRedrawEdges();
      if (typeof window._conMirrorSend === 'function') {
        window._conMirrorSend({ type: 'note-hide', id: String(_wnActiveNote.id), hidden: !!_wnActiveNote.hidden });
      }
    }

    function wnStyleFitText() {
      if (!_wnActiveNote) return;
      const nd = _wnActiveNote;
      const noteEl = wnGetNoteElementById(nd.id);
      if (!noteEl) return;
      const ta = noteEl.querySelector('.wn-note-editor, textarea');
      if (!ta) return;
      const zoom = (nd.id && nd.id.startsWith('cn') && window.conGetZoom) ? window.conGetZoom() : 1;
      const boxW = Math.max(80, Math.round(noteEl.offsetWidth / Math.max(0.5, zoom)));
      const boxH = Math.max(40, Math.round(noteEl.offsetHeight / Math.max(0.5, zoom)));
      nd.manualSize = true; nd.width = boxW; nd.height = boxH;
      wnApplyStoredSize(noteEl, ta, nd, zoom);
      const _fitInlineEls = [];
      ta.querySelectorAll('[style*="font-size"]').forEach(el => {
        const match = el.style.fontSize.match(/^([\d.]+)px$/);
        if (match) _fitInlineEls.push({ el, ratio: parseFloat(match[1]) / ((nd.fontSize || 1) * zoom) });
      });
      let lo = 6, hi = 120, best = 6;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        ta.style.fontSize = (mid * zoom) + 'px';
        _fitInlineEls.forEach(({ el, ratio }) => { el.style.fontSize = (mid * ratio * zoom) + 'px'; });
        if (ta.scrollHeight <= ta.clientHeight) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      _fitInlineEls.forEach(({ el, ratio }) => { el.style.fontSize = (best * ratio * zoom) + 'px'; });
      if (_fitInlineEls.length > 0) wnSyncNoteDataFromEditor(nd, ta);
      nd.fontSize = best;
      if (nd._applyStyle) nd._applyStyle();
      nd.width = boxW; nd.height = boxH;
      wnApplyStoredSize(noteEl, ta, nd, zoom);
      if (typeof window._conMirrorSend === 'function') {
        window._conMirrorSend({
          type: 'note-resize',
          id: String(nd.id),
          width: boxW,
          height: boxH,
          manualSize: true
        });
      }
      wnStyleRefresh();
    }

    function wnStripCheckboxesFromLi(li) {
      if (!li) return;
      const checkboxes = Array.from(li.querySelectorAll('input[type="checkbox"]'));
      checkboxes.forEach(cb => {
        const next = cb.nextSibling;
        if (next && next.nodeType === Node.TEXT_NODE) {
          next.nodeValue = next.nodeValue.replace(/^[ \u00A0]/, '');
          if (next.nodeValue.length === 0) next.remove();
        }
        cb.remove();
      });
    }

    function wnFindEnclosingList(node, editor) {
      while (node && node !== editor) {
        if (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'UL' || node.tagName === 'OL')) {
          return node;
        }
        node = node.parentNode;
      }
      return null;
    }

    function wnGetTopEnclosingList(node, editor) {
      let cur = wnFindEnclosingList(node, editor);
      if (!cur) return null;
      while (cur.parentNode && cur.parentNode !== editor) {
        const parentList = wnFindEnclosingList(cur.parentNode, editor);
        if (!parentList) break;
        cur = parentList;
      }
      return cur;
    }

    function wnDecorateChecklistCheckbox(cb, noteData, editor) {
      if (!cb || cb.dataset.wnCbInit === '1') return cb;
      cb.type = 'checkbox';
      cb.setAttribute('contenteditable', 'false');
      if (!cb.style.marginRight) cb.style.marginRight = '6px';
      if (!cb.style.cursor) cb.style.cursor = 'pointer';
      if (!cb.style.verticalAlign) cb.style.verticalAlign = '-1px';
      cb.addEventListener('mousedown', e => e.stopPropagation());
      cb.addEventListener('click', e => e.stopPropagation());
      cb.addEventListener('change', () => {
        if (noteData && editor) {
          wnSyncNoteDataFromEditor(noteData, editor);
          if (typeof window._conMirrorBroadcast === 'function') {
            window._conMirrorBroadcast();
          }
        }
      });
      cb.dataset.wnCbInit = '1';
      return cb;
    }

    function wnCreateChecklistCheckbox(noteData, editor) {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      return wnDecorateChecklistCheckbox(cb, noteData, editor);
    }

    function wnCreateChecklistListItem(noteData, editor) {
      const li = document.createElement('li');
      const cb = wnCreateChecklistCheckbox(noteData, editor);
      const spaceNode = document.createTextNode(' ');
      li.appendChild(cb);
      li.appendChild(spaceNode);
      return { li, cb, spaceNode };
    }

    function wnNormalizeChecklistLists(editor, noteData) {
      if (!editor || editor.tagName === 'TEXTAREA') return;
      // Strip any stray checkboxes from non-checklist lists
      editor.querySelectorAll('ol, ul:not([data-checkbox-list])').forEach(list => {
        list.querySelectorAll('li').forEach(li => {
          if (li.querySelector('input[type="checkbox"]')) {
            wnStripCheckboxesFromLi(li);
          }
        });
      });

      editor.querySelectorAll('ul[data-checkbox-list="true"], ul[data-checkbox-list]').forEach(ul => {
        ul.dataset.checkboxList = 'true';
        ul.style.listStyleType = 'none';
        ul.style.paddingLeft = '2px';
        Array.from(ul.children).forEach(li => {
          if (!li || li.tagName !== 'LI') return;
          let cb = li.querySelector('input[type="checkbox"]');
          if (!cb) {
            cb = wnCreateChecklistCheckbox(noteData, editor);
            li.insertBefore(cb, li.firstChild);
            li.insertBefore(document.createTextNode(' '), cb.nextSibling);
            return;
          }
          cb = wnDecorateChecklistCheckbox(cb, noteData, editor);
          if (cb.parentNode !== li) li.insertBefore(cb, li.firstChild);
          const afterCb = cb.nextSibling;
          if (!afterCb || afterCb.nodeType !== Node.TEXT_NODE) {
            li.insertBefore(document.createTextNode(' '), cb.nextSibling);
          } else if (!/^\s/.test(afterCb.nodeValue || '')) {
            afterCb.nodeValue = ' ' + afterCb.nodeValue;
          }
        });
      });
      if (noteData) wnSyncNoteDataFromEditor(noteData, editor);
    }

    function wnApplyListType(targetType, optEditor, optNoteData) {
      let editor = optEditor || wnGetActiveEditor();
      if (!editor) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const node = sel.getRangeAt(0).startContainer;
          const el = (node.nodeType === Node.TEXT_NODE) ? node.parentElement : node;
          editor = el ? el.closest('.wn-note-editor') : null;
        }
      }
      if (!editor || editor.tagName === 'TEXTAREA') return;

      const noteEl = editor.closest('.con-word-note, .ta-word-note');
      const noteId = noteEl ? noteEl.dataset.id : null;
      let noteData = optNoteData || _wnActiveNote;
      if (!noteData && noteId) {
        noteData = (typeof conNotes !== 'undefined' ? conNotes.find(n => n.id === noteId) : null)
          || (typeof taWordNotes !== 'undefined' ? taWordNotes.find(n => n.id === noteId) : null);
      }
      if (noteData) _wnActiveNote = noteData;

      if (!wnSelectionInside(editor)) wnRestoreSelection(editor);
      editor.focus();

      let mode = targetType;
      if (targetType === 'insertOrderedList' || targetType === 'ordered' || targetType === 'ol') mode = 'ordered';
      else if (targetType === 'insertUnorderedList' || targetType === 'unordered' || targetType === 'ul') mode = 'unordered';
      else if (targetType === 'checkbox' || targetType === 'checklist') mode = 'checkbox';

      const sel = window.getSelection();
      let range = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0) : null;
      if (!range || !editor.contains(range.commonAncestorContainer)) {
        const r = document.createRange();
        r.selectNodeContents(editor);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        range = r;
      }

      let activeList = wnGetTopEnclosingList(range.startContainer, editor);
      if (!activeList && range.endContainer) {
        activeList = wnGetTopEnclosingList(range.endContainer, editor);
      }

      if (activeList && editor.contains(activeList)) {
        const isCurrentChecklist = activeList.tagName === 'UL' && activeList.hasAttribute('data-checkbox-list');
        const isCurrentOrdered = activeList.tagName === 'OL';
        const currentMode = isCurrentChecklist ? 'checkbox' : (isCurrentOrdered ? 'ordered' : 'unordered');

        if (currentMode === mode) {
          // TOGGLE OFF: Unwrap all items in list into plain divs
          const frag = document.createDocumentFragment();
          const items = Array.from(activeList.querySelectorAll('li'));
          items.forEach(li => {
            wnStripCheckboxesFromLi(li);
            const div = document.createElement('div');
            while (li.firstChild) div.appendChild(li.firstChild);
            if (!div.hasChildNodes() || (div.childNodes.length === 1 && div.textContent === '')) {
              div.appendChild(document.createElement('br'));
            }
            frag.appendChild(div);
          });
          const firstNewBlock = frag.firstChild;
          activeList.parentNode.replaceChild(frag, activeList);
          if (firstNewBlock) {
            const r = document.createRange();
            r.selectNodeContents(firstNewBlock);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
          }
        } else {
          // CONVERT WHOLE LIST TO TARGET TYPE
          let newList = activeList;
          if (mode === 'ordered') {
            if (activeList.tagName !== 'OL') {
              const ol = document.createElement('ol');
              while (activeList.firstChild) ol.appendChild(activeList.firstChild);
              activeList.parentNode.replaceChild(ol, activeList);
              newList = ol;
            }
            newList.removeAttribute('data-checkbox-list');
            newList.classList.remove('wn-list-dash');
            newList.style.listStyleType = '';
            newList.style.paddingLeft = '';
            Array.from(newList.querySelectorAll('li')).forEach(li => wnStripCheckboxesFromLi(li));
          } else if (mode === 'unordered') {
            if (activeList.tagName !== 'UL') {
              const ul = document.createElement('ul');
              while (activeList.firstChild) ul.appendChild(activeList.firstChild);
              activeList.parentNode.replaceChild(ul, activeList);
              newList = ul;
            }
            newList.removeAttribute('data-checkbox-list');
            newList.classList.remove('wn-list-decimal-paren', 'wn-list-alpha-dot', 'wn-list-alpha-paren');
            newList.style.listStyleType = '';
            newList.style.paddingLeft = '';
            Array.from(newList.querySelectorAll('li')).forEach(li => wnStripCheckboxesFromLi(li));
          } else if (mode === 'checkbox') {
            if (activeList.tagName !== 'UL') {
              const ul = document.createElement('ul');
              while (activeList.firstChild) ul.appendChild(activeList.firstChild);
              activeList.parentNode.replaceChild(ul, activeList);
              newList = ul;
            }
            newList.setAttribute('data-checkbox-list', 'true');
            newList.classList.remove('wn-list-dash', 'wn-list-decimal-paren', 'wn-list-alpha-dot', 'wn-list-alpha-paren');
            newList.style.listStyleType = 'none';
            newList.style.paddingLeft = '2px';
            Array.from(newList.querySelectorAll('li')).forEach(li => {
              if (!li.querySelector('input[type="checkbox"]')) {
                const cb = wnCreateChecklistCheckbox(noteData, editor);
                li.insertBefore(cb, li.firstChild);
                li.insertBefore(document.createTextNode(' '), cb.nextSibling);
              }
            });
          }
        }
      } else {
        // Not currently in a list: Convert active selection/line
        if (mode === 'ordered') {
          document.execCommand('styleWithCSS', false, true);
          document.execCommand('insertOrderedList', false, null);
          editor.querySelectorAll('ol').forEach(ol => {
            ol.removeAttribute('data-checkbox-list');
            Array.from(ol.querySelectorAll('li')).forEach(li => wnStripCheckboxesFromLi(li));
          });
        } else if (mode === 'unordered') {
          document.execCommand('styleWithCSS', false, true);
          document.execCommand('insertUnorderedList', false, null);
          editor.querySelectorAll('ul').forEach(ul => {
            if (!ul.hasAttribute('data-checkbox-list')) {
              Array.from(ul.querySelectorAll('li')).forEach(li => wnStripCheckboxesFromLi(li));
            }
          });
        } else if (mode === 'checkbox') {
          editor.querySelectorAll('ul').forEach(ul => ul.setAttribute('data-pre-existing', '1'));
          document.execCommand('styleWithCSS', false, true);
          document.execCommand('insertUnorderedList', false, null);
          const targetUls = Array.from(editor.querySelectorAll('ul')).filter(ul => !ul.hasAttribute('data-pre-existing'));
          targetUls.forEach(ul => {
            ul.setAttribute('data-checkbox-list', 'true');
            ul.style.listStyleType = 'none';
            ul.style.paddingLeft = '2px';
            Array.from(ul.querySelectorAll('li')).forEach(li => {
              if (!li.querySelector('input[type="checkbox"]')) {
                const cb = wnCreateChecklistCheckbox(noteData, editor);
                li.insertBefore(cb, li.firstChild);
                li.insertBefore(document.createTextNode(' '), cb.nextSibling);
              }
            });
          });
          editor.querySelectorAll('ul[data-pre-existing]').forEach(ul => ul.removeAttribute('data-pre-existing'));
        }
      }

      wnNormalizeChecklistLists(editor, noteData);
      wnRememberSelection(editor);
      wnSyncNoteDataFromEditor(noteData, editor);
      if (noteData && noteData._applyStyle) noteData._applyStyle();
      if (typeof conNoteAutosize === 'function') {
        conNoteAutosize(editor, noteData);
      }
    }

    function wnInsertList(type) {
      wnApplyListType(type);
    }

    function wnInsertCheckboxList() {
      wnApplyListType('checkbox');
    }

    function wnOutdentListItem(li, editor, noteData) {
      if (!li || !editor || !editor.contains(li)) return false;
      const list = li.closest('ul,ol');
      if (!list || !editor.contains(list)) return false;

      let outerList = null;
      let parentLi = null;
      let cur = list.parentElement;
      while (cur && cur !== editor) {
        if (cur.tagName === 'LI' && !parentLi) {
          parentLi = cur;
        }
        if ((cur.tagName === 'UL' || cur.tagName === 'OL') && cur !== list) {
          outerList = cur;
          break;
        }
        cur = cur.parentElement;
      }

      if (outerList && editor.contains(outerList)) {
        const subSiblings = [];
        let n = li.nextElementSibling;
        while (n) {
          subSiblings.push(n);
          n = n.nextElementSibling;
        }
        if (subSiblings.length > 0) {
          const subList = document.createElement(list.tagName);
          if (list.hasAttribute('data-checkbox-list')) {
            subList.setAttribute('data-checkbox-list', 'true');
            subList.style.listStyleType = 'none';
            subList.style.paddingLeft = '2px';
          }
          if (list.classList.contains('wn-list-alpha-dot')) subList.classList.add('wn-list-alpha-dot');
          subSiblings.forEach(s => subList.appendChild(s));
          li.appendChild(subList);
        }

        if (parentLi && outerList.contains(parentLi)) {
          parentLi.after(li);
        } else {
          list.after(li);
        }

        if (!list.querySelector('li')) list.remove();
        wnSetCaretAtNodeStart(li);
      } else {
        const div = document.createElement('div');
        wnStripCheckboxesFromLi(li);
        while (li.firstChild) {
          div.appendChild(li.firstChild);
        }
        if (!div.hasChildNodes() || (div.childNodes.length === 1 && div.textContent === '')) {
          div.appendChild(document.createElement('br'));
        }

        const prevSiblings = [];
        let p = li.previousElementSibling;
        while (p) {
          prevSiblings.unshift(p);
          p = p.previousElementSibling;
        }

        const nextSiblings = [];
        let n = li.nextElementSibling;
        while (n) {
          nextSiblings.push(n);
          n = n.nextElementSibling;
        }

        if (nextSiblings.length > 0) {
          const nextList = document.createElement(list.tagName);
          if (list.hasAttribute('data-checkbox-list')) {
            nextList.setAttribute('data-checkbox-list', 'true');
            nextList.style.listStyleType = 'none';
            nextList.style.paddingLeft = '2px';
          }
          if (list.classList.contains('wn-list-alpha-dot')) nextList.classList.add('wn-list-alpha-dot');
          nextSiblings.forEach(s => nextList.appendChild(s));
          list.after(nextList);
        }

        list.after(div);
        li.remove();

        if (prevSiblings.length === 0) {
          list.remove();
        }

        wnSetCaretAtNodeStart(div);
      }

      wnNormalizeChecklistLists(editor, noteData);
      wnRememberSelection(editor);
      wnSyncNoteDataFromEditor(noteData, editor);
      if (noteData && noteData._applyStyle) noteData._applyStyle();
      if (typeof conNoteAutosize === 'function') conNoteAutosize(editor, noteData);
      return true;
    }

    function wnIndentListItem(li, editor, noteData) {
      if (!li || !editor || !editor.contains(li)) return false;
      const list = li.closest('ul,ol');
      if (!list || !editor.contains(list)) return false;

      const prevLi = li.previousElementSibling;
      if (!prevLi) return false;

      let subList = prevLi.querySelector(':scope > ul, :scope > ol');
      if (!subList) {
        subList = document.createElement(list.tagName);
        if (list.tagName === 'OL') {
          subList.classList.add('wn-list-alpha-dot');
        }
        if (list.hasAttribute('data-checkbox-list')) {
          subList.setAttribute('data-checkbox-list', 'true');
          subList.style.listStyleType = 'none';
          subList.style.paddingLeft = '2px';
        }
        prevLi.appendChild(subList);
      }
      subList.appendChild(li);

      wnNormalizeChecklistLists(editor, noteData);
      wnRememberSelection(editor);
      wnSyncNoteDataFromEditor(noteData, editor);
      if (noteData && noteData._applyStyle) noteData._applyStyle();
      if (typeof conNoteAutosize === 'function') conNoteAutosize(editor, noteData);
      wnSetCaretAtNodeStart(li);
      return true;
    }

    function wnOutdentList() {
      let editor = wnGetActiveEditor();
      if (!editor || editor.tagName === 'TEXTAREA') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const node = sel.getRangeAt(0).startContainer;
          const el = (node.nodeType === Node.TEXT_NODE) ? node.parentElement : node;
          editor = el ? el.closest('.wn-note-editor') : null;
        }
      }
      if (!editor || editor.tagName === 'TEXTAREA') return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      let node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const curLi = node ? node.closest('li') : null;
      if (curLi && editor.contains(curLi)) {
        wnOutdentListItem(curLi, editor, _wnActiveNote);
      }
    }

    function wnIndentList() {
      let editor = wnGetActiveEditor();
      if (!editor || editor.tagName === 'TEXTAREA') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const node = sel.getRangeAt(0).startContainer;
          const el = (node.nodeType === Node.TEXT_NODE) ? node.parentElement : node;
          editor = el ? el.closest('.wn-note-editor') : null;
        }
      }
      if (!editor || editor.tagName === 'TEXTAREA') return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      let node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const curLi = node ? node.closest('li') : null;
      if (curLi && editor.contains(curLi)) {
        wnIndentListItem(curLi, editor, _wnActiveNote);
      }
    }

    function wnStyleToggle(prop) {
      if (!_wnActiveNote) return;
      if (prop === 'bold' || prop === 'italic' || prop === 'underline' || prop === 'strike') {
        const cmd = prop === 'bold' ? 'bold' : (prop === 'italic' ? 'italic' : (prop === 'underline' ? 'underline' : 'strikeThrough'));
        if (wnApplySelectionCommand(cmd)) return;
      }
      if (prop === 'wavy') {
        // Try selection-level wavy first (same pattern as bold/italic/underline/strike)
        if (wnApplyWavyToSelection()) return;
        // No selection — toggle whole-note wavy
        _wnActiveNote.wavy = !_wnActiveNote.wavy;
        _wnActiveNote._applyStyle && _wnActiveNote._applyStyle();
        document.getElementById('wn-sp-wavy').classList.toggle('active', !!_wnActiveNote.wavy);
        return;
      }
      _wnActiveNote[prop] = !_wnActiveNote[prop];
      _wnActiveNote._applyStyle && _wnActiveNote._applyStyle();
      document.getElementById('wn-sp-' + prop).classList.toggle('active', !!_wnActiveNote[prop]);
    }

    function wnStyleSetAlign(align) {
      if (!_wnActiveNote) return;
      _wnActiveNote.textAlign = align;
      _wnActiveNote._applyStyle && _wnActiveNote._applyStyle();
      ['left', 'center', 'right', 'justify'].forEach(a => {
        const btn = document.getElementById('wn-sp-align-' + a);
        if (btn) btn.classList.toggle('active', a === align);
      });
    }

    function wnStyleToggleCaseDropdown(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const dd = document.getElementById('wn-sp-case-dropdown');
      const btn = document.getElementById('wn-sp-case-btn');
      if (!dd) return;
      const isVisible = dd.style.display !== 'none';
      const conDd = document.getElementById('con-ctx-case-dropdown');
      if (conDd) conDd.style.display = 'none';
      const noteConvertDd = document.getElementById('con-note-convert-modal');
      if (noteConvertDd) noteConvertDd.style.display = 'none';
      if (isVisible) {
        dd.style.display = 'none';
      } else {
        const curCasing = (_wnActiveNote && _wnActiveNote.casing) || window._bcNoteDefaultCasing || 'none';
        dd.querySelectorAll('.board-casing-item').forEach(item => {
          item.classList.toggle('active', (item.dataset.case || 'none') === curCasing);
        });
        if (typeof boardPositionCasingDropdown === 'function') {
          boardPositionCasingDropdown(btn, dd);
        } else {
          dd.style.display = 'flex';
        }
      }
    }

    function wnStyleSetCasing(casingKey) {
      const dd = document.getElementById('wn-sp-case-dropdown');
      if (dd) dd.style.display = 'none';
      if (!_wnActiveNote) return;

      const editor = wnGetActiveEditor();
      if (editor && !wnSelectionInside(editor)) {
        wnRestoreSelection(editor);
      }
      const sel = window.getSelection();
      const hasTextSelected = editor && wnSelectionInside(editor) && sel && sel.rangeCount > 0 && !sel.isCollapsed;

      if (hasTextSelected) {
        editor.focus();
        const rawSelected = sel.toString();
        if (casingKey === 'smallcaps') {
          const range = sel.getRangeAt(0);
          const span = document.createElement('span');
          span.style.fontVariant = 'small-caps';
          span.textContent = rawSelected;
          range.deleteContents();
          range.insertNode(span);
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          sel.removeAllRanges();
          sel.addRange(newRange);
        } else if (casingKey === 'none') {
          const range = sel.getRangeAt(0);
          const span = document.createElement('span');
          span.style.fontVariant = 'normal';
          span.style.textTransform = 'none';
          span.textContent = rawSelected;
          range.deleteContents();
          range.insertNode(span);
        } else {
          const transformed = boardTransformCasingText(rawSelected, casingKey);
          document.execCommand('styleWithCSS', false, true);
          document.execCommand('insertText', false, transformed);
        }
        wnRememberSelection(editor);
        wnSyncNoteDataFromEditor(_wnActiveNote, editor);
        if (_wnActiveNote._applyStyle) _wnActiveNote._applyStyle();
      } else {
        _wnActiveNote.casing = casingKey;
        if (_wnActiveNote._applyStyle) _wnActiveNote._applyStyle();
      }

      const caseBtn = document.getElementById('wn-sp-case-btn');
      if (caseBtn) {
        caseBtn.classList.toggle('active', (_wnActiveNote.casing || 'none') !== 'none');
      }
    }

    function wnStyleSetSize(sizeVal, isUnitValue) {
      if (!_wnActiveNote) return;
      const fnFontUnitToPx = window.conFontUnitToPx || (typeof conFontUnitToPx === 'function' ? conFontUnitToPx : null);
      const fnFmtFont = window.conFormatFontSize || (typeof conFormatFontSize === 'function' ? conFormatFontSize : null);
      const px = (isUnitValue && fnFontUnitToPx) ? fnFontUnitToPx(sizeVal, window.conFontUnit) : (Number(sizeVal) || _wnActiveNote.fontSize || 16);
      const value = Math.max(WN_SIZE_MIN, Math.min(WN_SIZE_MAX, Math.round(px)));
      const szVal = document.getElementById('wn-sp-size-val');
      if (szVal) szVal.textContent = fnFmtFont ? fnFmtFont(value, window.conFontUnit) : value + 'px';
      if (wnApplySelectionCommand('fontSize', '7')) {
        const editor = wnGetActiveEditor();
        if (editor) {
          editor.querySelectorAll('font[size="7"]').forEach(node => { node.removeAttribute('size'); node.style.fontSize = value + 'px'; });
          wnSyncNoteDataFromEditor(_wnActiveNote, editor);
          _wnActiveNote._applyStyle && _wnActiveNote._applyStyle();
        }
        return;
      }
      const oldBase = _wnActiveNote.fontSize || value;
      if (oldBase !== value) {
        const zoom = (window.conGetZoom && _wnActiveNote.id && _wnActiveNote.id.startsWith('cn')) ? window.conGetZoom() : 1;
        const editor = wnGetActiveEditor();
        if (editor) {
          editor.querySelectorAll('[style*="font-size"]').forEach(el => {
            const match = el.style.fontSize.match(/^([\d.]+)px$/);
            if (match) el.style.fontSize = Math.round(value * (parseFloat(match[1]) / (oldBase * zoom)) * zoom) + 'px';
          });
          wnSyncNoteDataFromEditor(_wnActiveNote, editor);
        }
      }
      _wnActiveNote.fontSize = value;
      _wnActiveNote._applyStyle && _wnActiveNote._applyStyle();
    }

    function wnUnwrapBlinkHlSpans(spans) {
      let unwrapped = false;
      spans.forEach(span => {
        if (!span.parentNode) return;
        const parent = span.parentNode;
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        parent.removeChild(span); unwrapped = true;
      });
      return unwrapped;
    }
    function wnUnwrapBlinkHlInSelection(editor) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
      const range = sel.getRangeAt(0);
      const spans = Array.from(editor.querySelectorAll('.wn-blink-hl')).filter(sp => { try { return range.intersectsNode(sp); } catch (e) { return false; } });
      return wnUnwrapBlinkHlSpans(spans);
    }

    function wnStyleApplyHighlight(color) {
      if (!_wnActiveNote || !color) return;
      if (color === '__blink__') {
        const editor = wnGetActiveEditor();
        if (!editor || editor.tagName === 'TEXTAREA') return;
        if (!wnSelectionInside(editor)) wnRestoreSelection(editor);
        if (!wnSelectionInside(editor)) return;
        editor.focus();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
        if (wnUnwrapBlinkHlInSelection(editor)) {
          wnSyncNoteDataFromEditor(_wnActiveNote, editor);
          if (_wnActiveNote._applyStyle) _wnActiveNote._applyStyle();
          if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
          if (typeof window._conMirrorSend === 'function') {
            window._conMirrorSend({
              type: 'note-text',
              id: String(_wnActiveNote.id),
              html: _wnActiveNote.html,
              text: _wnActiveNote.text,
              baseWidth: _wnActiveNote.liveBaseWidth,
              baseHeight: _wnActiveNote.liveBaseHeight,
              width: _wnActiveNote.width || _wnActiveNote.liveBaseWidth,
              height: _wnActiveNote.height || _wnActiveNote.liveBaseHeight,
              manualSize: !!_wnActiveNote.manualSize
            });
          }
          return;
        }
        const range = sel.getRangeAt(0);
        const frag = range.extractContents();
        const span = document.createElement('span');
        span.className = 'wn-blink-hl'; span.appendChild(frag); range.insertNode(span);
        sel.removeAllRanges();
        wnSyncNoteDataFromEditor(_wnActiveNote, editor);
        if (_wnActiveNote._applyStyle) _wnActiveNote._applyStyle();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({
            type: 'note-text',
            id: String(_wnActiveNote.id),
            html: _wnActiveNote.html,
            text: _wnActiveNote.text,
            baseWidth: _wnActiveNote.liveBaseWidth,
            baseHeight: _wnActiveNote.liveBaseHeight,
            width: _wnActiveNote.width || _wnActiveNote.liveBaseWidth,
            height: _wnActiveNote.height || _wnActiveNote.liveBaseHeight,
            manualSize: !!_wnActiveNote.manualSize
          });
        }
        return;
      }
      if (wnApplySelectionCommand('hiliteColor', color)) return;
      wnApplySelectionCommand('backColor', color);
    }

    function wnStyleSetBorderWidth(val, isUnitValue) {
      if (!_wnActiveNote) return;
      const fnThickUnitToPx = window.conThicknessUnitToPx || (typeof conThicknessUnitToPx === 'function' ? conThicknessUnitToPx : null);
      const fnFmtThick = window.conFormatThickness || (typeof conFormatThickness === 'function' ? conFormatThickness : null);
      const px = (isUnitValue && fnThickUnitToPx) ? fnThickUnitToPx(val, window.conThicknessUnit) : (Number(val) || 0);
      const w = Math.max(0, Math.min(18, Math.round(px)));
      _wnActiveNote.borderWidth = w > 0 ? w : null;
      if (!_wnActiveNote.borderStyle && w > 0) _wnActiveNote.borderStyle = 'solid';
      if (!_wnActiveNote.borderColor && w > 0) _wnActiveNote.borderColor = '#111111';
      const bwVal = document.getElementById('wn-sp-border-width-val');
      if (bwVal) bwVal.textContent = fnFmtThick ? fnFmtThick(w, window.conThicknessUnit) : w + 'px';
      _wnActiveNote._applyStyle && _wnActiveNote._applyStyle();
    }
    function wnStyleSetBorderStyle(style) {
      if (!_wnActiveNote) return;
      _wnActiveNote.borderStyle = style;
      if (!_wnActiveNote.borderWidth) _wnActiveNote.borderWidth = 1;
      if (!_wnActiveNote.borderColor) _wnActiveNote.borderColor = '#111111';
      const bwSlider = document.getElementById('wn-sp-border-width');
      const bwVal = document.getElementById('wn-sp-border-width-val');
      if (bwSlider && Number(bwSlider.value) === 0) {
        const fnSetupThick = window._conSetupThicknessSlider || (typeof _conSetupThicknessSlider === 'function' ? _conSetupThicknessSlider : null);
        const fnPxToThick = window.conPxToThicknessUnit || (typeof conPxToThicknessUnit === 'function' ? conPxToThicknessUnit : null);
        const fnFmtThick = window.conFormatThickness || (typeof conFormatThickness === 'function' ? conFormatThickness : null);
        if (fnSetupThick) fnSetupThick(bwSlider, window.conThicknessUnit, 'noteBorder');
        if (fnPxToThick) bwSlider.value = String(fnPxToThick(1, window.conThicknessUnit));
        if (bwVal) bwVal.textContent = fnFmtThick ? fnFmtThick(1, window.conThicknessUnit) : '1px';
      }
      _wnActiveNote._applyStyle && _wnActiveNote._applyStyle();
      ['solid', 'dashed', 'dotted', 'double'].forEach(s => {
        const btn = document.getElementById('wn-sp-bs-' + s);
        if (btn) btn.classList.toggle('active', s === style);
      });
    }
    function wnStyleSetBorderColor(color) {
      if (!_wnActiveNote) return;
      _wnActiveNote.borderColor = color;
      if (!_wnActiveNote.borderWidth) _wnActiveNote.borderWidth = 1;
      if (!_wnActiveNote.borderStyle) _wnActiveNote.borderStyle = 'solid';
      _wnActiveNote._applyStyle && _wnActiveNote._applyStyle();
    }

    function wnStyleClearSelectedFormat() {
      if (!_wnActiveNote) return;
      const cleared = wnClearSelectionFormattingPreserveFontSize();
      if (!cleared) { const editor = wnGetActiveEditor(); if (editor) wnNoteHandleCtrlSpace(editor); }
    }
    function wnClearSelectionFormattingPreserveFontSize() {
      if (!_wnActiveNote) return false;
      const editor = wnGetActiveEditor();
      if (!editor || editor.tagName === 'TEXTAREA') return false;
      if (!wnSelectionInside(editor)) wnRestoreSelection(editor);
      if (!wnSelectionInside(editor)) return false;
      editor.focus();
      const sel = window.getSelection();
      const blinkSpansToRemove = (sel && sel.rangeCount > 0 && !sel.isCollapsed)
        ? Array.from(editor.querySelectorAll('.wn-blink-hl')).filter(sp => { try { return sel.getRangeAt(0).intersectsNode(sp); } catch (e) { return false; } })
        : [];
      wnSyncNoteDataFromEditor(_wnActiveNote, editor);
      const savedFontSize = _wnActiveNote.fontSize;
      document.execCommand('styleWithCSS', false, true);
      if (document.queryCommandState('bold')) document.execCommand('bold', false, null);
      if (document.queryCommandState('italic')) document.execCommand('italic', false, null);
      if (document.queryCommandState('underline')) document.execCommand('underline', false, null);
      if (document.queryCommandState('strikethrough')) document.execCommand('strikethrough', false, null);
      wnUnwrapBlinkHlSpans(blinkSpansToRemove);
      wnRememberSelection(editor);
      wnSyncNoteDataFromEditor(_wnActiveNote, editor);
      _wnActiveNote.fontSize = savedFontSize;
      if (_wnActiveNote._applyStyle) _wnActiveNote._applyStyle();
      return true;
    }

    function wnNoteHandleSpace(ta, noteData) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const range = sel.getRangeAt(0);
      if (!range.collapsed || !ta.contains(range.startContainer)) return false;
      const BLOCK_TAGS = new Set(['li', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote']);
      let block = range.startContainer;
      while (block && block !== ta) {
        if (block.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(block.nodeName.toLowerCase())) break;
        block = block.parentNode;
      }
      if (!block || block === ta) block = ta;
      const r = document.createRange();
      try { r.setStart(block, 0); } catch (e) { return false; }
      r.setEnd(range.startContainer, range.startOffset);

      const fullText = r.toString();
      const lines = fullText.split('\n');
      const shortcut = String(lines[lines.length - 1] || '').trim();

      const isUnordered = shortcut === '*' || shortcut === '-';
      const isOrdered = /^1[\.)]$/.test(shortcut) || /^[a-zA-Z][\.)]$/.test(shortcut);
      const isChecklist = shortcut === '[]' || shortcut === '[ ]';
      if (isUnordered || isOrdered || isChecklist) {
        if (range.startContainer.nodeType !== Node.TEXT_NODE) return false;
        const delRange = document.createRange();
        const startOffset = Math.max(0, range.startOffset - shortcut.length);
        delRange.setStart(range.startContainer, startOffset);
        delRange.setEnd(range.startContainer, range.startOffset);
        sel.removeAllRanges(); sel.addRange(delRange);
        document.execCommand('delete', false, null);

        if (isChecklist) {
          wnApplyListType('checkbox', ta, noteData);
        } else if (isUnordered) {
          wnApplyListType('unordered', ta, noteData);
          wnApplyListMarkerStyleFromShortcut(ta, shortcut);
        } else {
          wnApplyListType('ordered', ta, noteData);
          wnApplyListMarkerStyleFromShortcut(ta, shortcut);
        }
        return true;
      }
      return false;
    }

    function wnIsListItemEffectivelyEmpty(li, isChecklist) {
      if (!li) return true;
      const clone = li.cloneNode(true);
      if (isChecklist) clone.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.remove());
      clone.querySelectorAll('br').forEach(br => br.remove());
      if (clone.querySelector('ul,ol')) return false;
      return String(clone.textContent || '').replace(/ /g, ' ').replace(/​/g, '').trim().length === 0;
    }

    function wnSetCaretAtNodeStart(node) {
      const sel = window.getSelection(); if (!sel || !node) return;
      const r = document.createRange(); r.setStart(node, 0); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
    }
    function wnSetCaretAtNodeEnd(node) {
      const sel = window.getSelection(); if (!sel || !node) return;
      const r = document.createRange(); r.selectNodeContents(node); r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
    }
    function wnSetCaretAtChecklistItemStart(li) {
      if (!li) return;
      const cb = li.querySelector('input[type="checkbox"]');
      const afterCb = cb ? cb.nextSibling : null;
      wnSetCaretAtNodeStart((afterCb && afterCb.nodeType === Node.TEXT_NODE) ? afterCb : li);
    }

    function wnHandleListKeydown(ta, noteData, e) {
      if (!e || (e.key !== 'Enter' && e.key !== 'Backspace' && e.key !== 'Tab')) return false;
      if (e.key !== 'Tab' && (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey)) return false;
      if (e.key === 'Tab' && (e.ctrlKey || e.altKey || e.metaKey)) return false;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const range = sel.getRangeAt(0);
      let node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const curLi = node ? node.closest('li') : null;
      if (!curLi || !ta.contains(curLi)) return false;
      const list = curLi.closest('ul,ol');
      if (!list || !ta.contains(list)) return false;
      const isChecklist = list.matches('ul[data-checkbox-list]');
      const isEmpty = wnIsListItemEffectivelyEmpty(curLi, isChecklist);

      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          wnOutdentListItem(curLi, ta, noteData);
        } else {
          wnIndentListItem(curLi, ta, noteData);
        }
        return true;
      }

      if (e.key === 'Enter') {
        if (isChecklist) {
          e.preventDefault();
          e.stopPropagation();
          if (isEmpty) {
            wnOutdentListItem(curLi, ta, noteData);
          } else {
            const created = wnCreateChecklistListItem(noteData, ta);
            const tailRange = document.createRange();
            tailRange.setStart(range.endContainer, range.endOffset);
            tailRange.setEnd(curLi, curLi.childNodes.length);
            const tailFrag = tailRange.extractContents();
            if (tailFrag && tailFrag.hasChildNodes()) {
              created.li.appendChild(tailFrag);
            }
            curLi.after(created.li);
            wnSetCaretAtChecklistItemStart(created.li);
          }
          wnRememberSelection(ta);
          wnSyncNoteDataFromEditor(noteData, ta);
          if (typeof conNoteAutosize === 'function') conNoteAutosize(ta, noteData);
          return true;
        }
        if (isEmpty) {
          e.preventDefault();
          e.stopPropagation();
          wnOutdentListItem(curLi, ta, noteData);
          return true;
        }
        return false;
      }

      if (e.key === 'Backspace' && range.collapsed) {
        const prefix = document.createRange();
        prefix.setStart(curLi, 0);
        prefix.setEnd(range.startContainer, range.startOffset);
        const prefixText = prefix.toString().replace(/ /g, ' ').replace(/\u200B/g, '').trim();
        if (prefixText.length === 0) {
          e.preventDefault();
          e.stopPropagation();
          wnOutdentListItem(curLi, ta, noteData);
          return true;
        }
      }
      return false;
    }

    function wnApplyListMarkerStyleFromShortcut(editor, shortcut) {
      if (!editor) return;
      const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return;
      let node = sel.anchorNode; if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      if (!node || !node.closest) return;
      const list = node.closest('ul,ol'); if (!list || !editor.contains(list)) return;
      list.classList.remove('wn-list-dash', 'wn-list-decimal-paren', 'wn-list-alpha-dot', 'wn-list-alpha-paren');
      if (list.tagName === 'UL') { if (shortcut === '-') list.classList.add('wn-list-dash'); return; }
      const s = shortcut.toLowerCase();
      if (s === '1)') list.classList.add('wn-list-decimal-paren');
      else if (s === 'a.') list.classList.add('wn-list-alpha-dot');
      else if (s === 'a)') list.classList.add('wn-list-alpha-paren');
    }

    function wnNoteHandleCtrlSpace(editor) {
      if (!editor) return;
      const noteEl = editor.closest('.con-word-note, .ta-word-note');
      if (!noteEl) return;
      const noteId = noteEl.dataset.id; if (!noteId) return;
      let noteData = conNotes.find(n => n.id === noteId);
      if (!noteData) noteData = taWordNotes.find(n => n.id === noteId);
      if (!noteData) return;
      const sel = window.getSelection();
      const hasSelection = sel && sel.rangeCount > 0 && !sel.isCollapsed && wnSelectionInside(editor);
      if (hasSelection) {
        wnClearSelectionFormattingPreserveFontSize();
      } else {
        editor.querySelectorAll('*').forEach(el => {
          el.style.color = ''; el.style.backgroundColor = ''; el.style.fontSize = '';
          el.style.fontWeight = ''; el.style.fontStyle = ''; el.style.textDecoration = '';
        });
        wnUnwrapBlinkHlSpans(Array.from(editor.querySelectorAll('.wn-blink-hl')));
        editor.style.color = ''; editor.style.backgroundColor = ''; editor.style.fontSize = '';
        editor.style.fontWeight = ''; editor.style.fontStyle = '';
        noteData.color = '#111111'; noteData.bg = '#ffffff'; noteData.fontSize = 26;
        noteData.bold = false; noteData.italic = false; noteData.underline = false; noteData.wavy = false; noteData.strike = false;
        if (noteData._applyStyle) noteData._applyStyle();
      }
    }

    function wnStyleClose(e) {
      if (Date.now() - _wnOverlayOpenTime < 200) return;
      if (e && e.target !== document.getElementById('wn-style-overlay')) return;
      wnStyleDismiss();
    }
    function wnStyleDismiss() {
      const convertDd = document.getElementById('con-note-convert-modal');
      if (convertDd) convertDd.style.display = 'none';
      document.getElementById('wn-style-overlay').classList.remove('active');
      _wnPopupDragged = false; _wnPopupWordMeta = null; _wnActiveNote = null;
    }

    // ── Link dialog ───────────────────────────────────────────────────

    function wnLinkOpen() {
      if (!_wnActiveNote) return;
      const editor = wnGetActiveEditor();
      if (!editor || editor.tagName === 'TEXTAREA') return;
      wnRememberSelection(editor);

      // Detect existing link under cursor
      const sel = window.getSelection();
      let existingHref = '';
      if (sel && sel.rangeCount > 0) {
        const container = sel.getRangeAt(0).startContainer;
        const node = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
        const a = node ? node.closest('a[href]') : null;
        if (a) existingHref = a.getAttribute('href') || '';
      }

      const urlInput = document.getElementById('wn-link-url');
      urlInput.value = existingHref;
      document.getElementById('wn-link-remove-btn').style.display = existingHref ? '' : 'none';
      document.getElementById('wn-link-dialog-overlay').classList.add('active');
      setTimeout(() => { urlInput.focus(); urlInput.select(); }, 50);
    }

    function wnLinkApply() {
      let url = (document.getElementById('wn-link-url').value || '').trim();
      if (!url) { wnLinkRemove(); return; }
      if (!/^[a-z][a-z0-9+.\-]*:\/\//i.test(url)) url = 'https://' + url;
      wnApplySelectionCommand('createLink', url);
      wnLinkClose();
    }

    function wnLinkRemove() {
      wnApplySelectionCommand('unlink');
      wnLinkClose();
    }

    function wnLinkClose() {
      document.getElementById('wn-link-dialog-overlay').classList.remove('active');
    }

    function wnLinkDialogOverlayClick(e) {
      if (e.target !== document.getElementById('wn-link-dialog-overlay')) return;
      wnLinkClose();
    }

    function wnLinkKeydown(e) {
      if (e.key === 'Enter') { e.preventDefault(); wnLinkApply(); }
      if (e.key === 'Escape') { e.preventDefault(); wnLinkClose(); }
    }

    // ── Table helpers ─────────────────────────────────────────────────

    function wnTableDataFromHtml(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const srcTable = tmp.querySelector('table');
      if (!srcTable) return null;
      const rowEls = Array.from(srcTable.querySelectorAll('tr'));
      if (!rowEls.length) return null;
      const grid = rowEls.map(tr =>
        Array.from(tr.querySelectorAll('td, th')).map(cell => ({
          text: cell.textContent.trim(),
          isHeader: cell.tagName.toLowerCase() === 'th'
        }))
      );
      const cols = Math.max(1, ...grid.map(r => r.length));
      const hasHeader = grid[0] && grid[0].some(c => c.isHeader);
      const cells = [];
      grid.forEach(row => {
        for (let c = 0; c < cols; c++) {
          const cell = row[c];
          cells.push({ type: 'text', text: cell ? cell.text : '', bold: !!(cell && cell.isHeader && hasHeader) });
        }
      });
      return { rows: grid.length, cols, cells, hasHeader };
    }

    function wnTableDataFromTsv(lines) {
      const grid = lines.map(l => l.split('\t').map(c => c.trim()));
      const cols = Math.max(1, ...grid.map(r => r.length));
      const cells = [];
      grid.forEach(row => {
        for (let c = 0; c < cols; c++) cells.push({ type: 'text', text: row[c] || '' });
      });
      return { rows: grid.length, cols, cells, hasHeader: false };
    }

    function wnPasteAsConTable(clipData, x, y) {
      let data = null;
      const html = clipData.getData('text/html');
      if (html && /<table[\s>]/i.test(html)) data = wnTableDataFromHtml(html);
      if (!data) {
        const tsv = clipData.getData('text/plain').replace(/\r\n|\r/g, '\n');
        const lines = tsv.split('\n').filter(l => l.length > 0);
        if (lines.length > 1 && lines.every(l => l.includes('\t'))) data = wnTableDataFromTsv(lines);
      }
      if (!data) return false;
      const brd = document.getElementById('constellation-board');
      const px = Number.isFinite(x) ? x : (brd ? Math.max(24, Math.round(brd.clientWidth / 2) - data.cols * 50) : 60);
      const py = Number.isFinite(y) ? y : (brd ? Math.max(24, Math.round(brd.clientHeight / 2) - data.rows * 18) : 60);
      conPushUndo();
      window.conAddTableFromData({
        x: px, y: py, rows: data.rows, cols: data.cols,
        cells: data.cells, hasHeader: data.hasHeader
      });
      return true;
    }

    // ── End restored wn* functions ────────────────────────────────────

    // Add a blank note at centre of the board (toolbar button)
    window.conNoteAdd = function (x, y, initialText) {
      const board = document.getElementById('constellation-board');
      if (!board) return;
      if (x === undefined) {
        x = Math.round(board.clientWidth / 2 - 60 + Math.random() * 40 - 20);
        y = Math.round(board.clientHeight / 2 - 20 + Math.random() * 40 - 20);
      }
      const seedText = String(initialText || '').trim();
      const id = conGetNextNoteId();
      const noteData = {
        id, nodeId: null, text: seedText, x, y,
        color: '#111111', bg: '#ffffff', fontSize: (window._bcNoteFontSizeFree || 26),
        fontFamily: window._bcNoteFontFamily || null,
        bold: false, italic: false, underline: false, strike: false,
        hidden: false, locked: false, manualSize: false, width: null, height: null
      };
      conNotes.push(noteData);
      conNoteBuild(noteData);
      setTimeout(() => wnFocusNoteData(noteData), 0);
    };

    // Add note near a specific node (from con-ctx-menu)
    window.conCtxAddNote = function () {
      const id = (window.conGetCtxNodeId && window.conGetCtxNodeId()) || (window.conGetSelected && window.conGetSelected());
      const node = conGetNodes().find(n => n.id === id);
      conCtxClose();
      if (window.conPushUndo) window.conPushUndo();
      const board = document.getElementById('constellation-board');
      if (!board) return;
      let x = 60, y = 60;
      if (node) {
        const el = node.el;
        x = (node.x || parseInt(el.style.left) || 0) + el.offsetWidth + 12;
        y = (node.y || parseInt(el.style.top) || 0);
      }
      const nid = conGetNextNoteId();
      const noteData = {
        id: nid, nodeId: id || null, text: '', x, y,
        color: '#111111', bg: '#ffffff', fontSize: (window._bcNoteFontSizeLinked || 14),
        fontFamily: window._bcNoteFontFamily || null,
        bold: false, italic: false, underline: false, strike: false,
        hidden: false, locked: false, manualSize: false, width: null, height: null
      };
      conNotes.push(noteData);
      conNoteBuild(noteData);
      if (node && node.el) {
        node.el.classList.add('has-con-note');
        if (typeof conUpdateNodeNoteButton === 'function') conUpdateNodeNoteButton(node);
      }
      if (node && (typeof conAddEdge === 'function' || typeof window.conAddEdge === 'function')) {
        const addEdgeFn = (typeof conAddEdge === 'function') ? conAddEdge : window.conAddEdge;
        addEdgeFn(node.id, nid);
      }
      const ta = document.querySelector(`.con-word-note[data-id="${nid}"] .wn-note-editor`);
      if (ta) setTimeout(() => ta.focus(), 0);
    };

    function conCreateDefinitionNote(node, noteText) {
      const board = document.getElementById('constellation-board');
      if (!board || !node) return;
      const x = (node.x || parseInt(node.el.style.left) || 0) + (node.el.offsetWidth || 80) + 12;
      const y = (node.y || parseInt(node.el.style.top) || 0);
      const nid = conGetNextNoteId();
      const noteData = {
        id: nid, nodeId: node.id || null, text: noteText || '', x, y,
        color: '#444444', bg: '#ffffff', fontSize: 12,
        bold: false, italic: true, underline: false, strike: false,
        hidden: false, locked: false, manualSize: false, width: null, height: null
      };
      conNotes.push(noteData);
      conNoteBuild(noteData);
      if (node.el) {
        node.el.classList.add('has-con-note');
        if (typeof conUpdateNodeNoteButton === 'function') conUpdateNodeNoteButton(node);
      }
      if (node && (typeof conAddEdge === 'function' || typeof window.conAddEdge === 'function')) {
        const addEdgeFn = (typeof conAddEdge === 'function') ? conAddEdge : window.conAddEdge;
        addEdgeFn(node.id, nid);
      }
      const ta = document.querySelector('.con-word-note[data-id="' + nid + '"] .wn-note-editor');
      if (ta) setTimeout(() => ta.focus(), 0);
    }

    // Updates the note button on a node DOM element based on attached notes
    window.conUpdateNodeNoteButton = function (nodeOrId) {
      if (!nodeOrId) return;
      const allNodes = (typeof conGetNodes === 'function') ? conGetNodes() : (window.conGetNodes ? window.conGetNodes() : []);
      const node = typeof nodeOrId === 'object' ? nodeOrId : allNodes.find(n => n.id === nodeOrId);
      if (!node || !node.el) return;

      const liveNotes = (typeof conGetNotes === 'function') ? conGetNotes() : (window.conNotes || []);
      const attachedNotes = liveNotes.filter(n => n && n.nodeId === node.id);
      let btn = node.el.querySelector('.con-node-note-btn');

      if (attachedNotes.length === 0) {
        if (btn) btn.remove();
        node.el.classList.remove('has-con-note');
        return;
      }

      node.el.classList.add('has-con-note');
      const allHidden = attachedNotes.every(n => !!n.hidden);

      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'con-node-note-btn';
        btn.innerHTML = '<img src="../assets/icons/note.svg" class="btn-icon" alt="" />';
        btn.addEventListener('mousedown', function (e) {
          e.stopPropagation();
        });
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          e.preventDefault();
          window.conToggleAttachedNoteDisplay(node.id);
        });
        node.el.appendChild(btn);
      }

      btn.classList.toggle('note-hidden', allHidden);
      const tt = allHidden
        ? ((window.i18n && window.i18n.t('conShowAttachedNote')) || 'Show attached note')
        : ((window.i18n && window.i18n.t('conHideAttachedNote')) || 'Hide attached note');
      btn.title = tt;
      btn.setAttribute('aria-label', tt);
    };

    // Toggles visibility (hidden state) of all notes attached to a node
    window.conToggleAttachedNoteDisplay = function (nodeId) {
      if (!nodeId) return;
      const liveNotes = (typeof conGetNotes === 'function') ? conGetNotes() : (window.conNotes || []);
      const attachedNotes = liveNotes.filter(n => n && n.nodeId === nodeId);
      if (!attachedNotes.length) return;

      if (window.conPushUndo) window.conPushUndo();

      // If any attached note is currently visible, toggle action is to HIDE all; otherwise SHOW all
      const shouldHide = attachedNotes.some(n => !n.hidden);

      attachedNotes.forEach(noteData => {
        noteData.hidden = shouldHide;
        const noteEl = (typeof wnGetNoteElementById === 'function')
          ? wnGetNoteElementById(noteData.id)
          : document.querySelector('.con-word-note[data-id="' + noteData.id + '"]');
        if (noteEl) {
          noteEl.style.display = '';
          if (typeof wnApplyHiddenState === 'function') {
            wnApplyHiddenState(noteData, noteEl);
          } else {
            noteEl.classList.toggle('wn-note-hidden', shouldHide);
          }
          if (!shouldHide && typeof noteData._applyStyle === 'function') {
            noteData._applyStyle();
          }
        }
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({
            type: 'note-style',
            id: String(noteData.id),
            hidden: shouldHide
          });
        }
      });

      window.conUpdateNodeNoteButton(nodeId);
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
    };

    let _conDefPickerNode = null;
    let _conDefPickerChoices = [];

    function conGetDefinitionChoices(dbEntries) {
      const choices = [];
      const addChoice = (kind, text, label) => {
        const value = String(text == null ? '' : text).trim();
        if (!value) return;
        if (choices.some(choice => choice.text === value)) return;
        choices.push({ kind, text: value, label: label || 'Definition' });
      };

      const entries = Array.isArray(dbEntries) ? dbEntries.filter(Boolean) : (dbEntries ? [dbEntries] : []);
      const multi = entries.length > 1;

      entries.forEach((dbEntry, entryIdx) => {
        const pos = dbEntry.partOfSpeech || dbEntry.pos;
        const posStr = Array.isArray(pos) ? pos.join('/') : (pos ? String(pos) : '');
        const src = dbEntry._source || (Array.isArray(dbEntry._sources) ? dbEntry._sources[0] : '');
        const prefix = multi ? `[${dbEntry.word || 'entry'}${posStr ? ` · ${posStr}` : ''}] ` : '';

        const defs = Array.isArray(dbEntry.definition)
          ? dbEntry.definition
          : (dbEntry.definition != null ? String(dbEntry.definition).split(/\n+/) : (dbEntry.def ? (Array.isArray(dbEntry.def) ? dbEntry.def : [dbEntry.def]) : []));

        defs
          .map(def => String(def).trim())
          .filter(Boolean)
          .forEach((def, idx, arr) => {
            const defNum = arr.length > 1 ? `Def ${idx + 1}` : 'Definition';
            addChoice('definition', def, `${prefix}${defNum}`);
          });

        const french = Array.isArray(dbEntry.french)
          ? dbEntry.french.filter(Boolean).join(' · ')
          : String(dbEntry.french || dbEntry.translation || '').trim();
        if (french) {
          addChoice('translation', '(' + french + ')', `${prefix}Translation`);
        }
      });

      return choices;
    }

    function conDefPickerOpen(node, word, choices) {
      _conDefPickerNode = node;
      _conDefPickerChoices = Array.isArray(choices) ? choices : [];

      const overlay = document.getElementById('con-def-picker-overlay');
      const title = document.getElementById('con-def-picker-title');
      const badge = document.getElementById('con-def-picker-word-badge');
      const hint = document.getElementById('con-def-picker-hint');
      const list = document.getElementById('con-def-picker-list');
      const confirmBtn = document.getElementById('con-def-picker-confirm-btn');

      if (!overlay || !list) {
        const fallback = _conDefPickerChoices.map(choice => choice.text).join('\n');
        conCreateDefinitionNote(node, fallback);
        return;
      }

      if (title) title.textContent = 'Add Definition';
      if (badge) badge.textContent = word || 'Word';
      if (hint) hint.textContent = _conDefPickerChoices.length
        ? 'Untick any meanings you do not want to include in the note.'
        : 'No saved definition was found for this word. You can still add a blank note.';
      if (confirmBtn) confirmBtn.textContent = _conDefPickerChoices.length ? 'Add Selected' : 'Add Blank Note';

      list.innerHTML = '';
      if (!_conDefPickerChoices.length) {
        const empty = document.createElement('div');
        empty.className = 'con-def-picker-empty';
        empty.textContent = 'No definition or translation is saved for this word yet.';
        list.appendChild(empty);
      } else {
        _conDefPickerChoices.forEach((choice, idx) => {
          const item = document.createElement('label');
          item.className = 'con-def-picker-item';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.dataset.idx = String(idx);
          cb.checked = false;

          const textWrap = document.createElement('div');
          textWrap.className = 'con-def-picker-item-text';

          const tag = document.createElement('span');
          tag.className = 'con-def-picker-item-tag';
          tag.textContent = choice.label;

          const text = document.createElement('div');
          text.className = 'con-def-picker-item-value';
          text.textContent = choice.text;

          textWrap.appendChild(tag);
          textWrap.appendChild(text);
          item.appendChild(cb);
          item.appendChild(textWrap);
          list.appendChild(item);
        });
      }

      overlay.classList.add('active');
    }

    window.conDefPickerClose = function () {
      _conDefPickerNode = null;
      _conDefPickerChoices = [];
      const overlay = document.getElementById('con-def-picker-overlay');
      if (overlay) overlay.classList.remove('active');
    };

    window.conDefPickerSelectAll = function () {
      window.conPickerSetAllChecks('#con-def-picker-list', true, false);
    };

    window.conDefPickerClearAll = function () {
      window.conPickerSetAllChecks('#con-def-picker-list', false, false);
    };

    window.conDefPickerConfirm = function () {
      const node = _conDefPickerNode;
      const selected = Array.from(document.querySelectorAll('#con-def-picker-list input[type="checkbox"]:checked'))
        .map(cb => _conDefPickerChoices[Number(cb.dataset.idx)])
        .filter(Boolean)
        .map(choice => choice.text);

      if (!node) {
        window.conDefPickerClose();
        return;
      }
      if (_conDefPickerChoices.length > 0 && selected.length === 0) {
        if (typeof mdbToast === 'function') mdbToast('ℹ️ Select at least one meaning to add.');
        return;
      }

      window.conDefPickerClose();
      conCreateDefinitionNote(node, selected.join('\n'));
    };

    // Add a definition note next to a node (from con-ctx-menu)
    window.conCtxAddDefinition = function () {
      const id = (window.conGetCtxNodeId && window.conGetCtxNodeId()) || (window.conGetSelected && window.conGetSelected());
      const node = (window.conGetNodes ? window.conGetNodes() : []).find(n => n.id === id);
      if (window.conCtxClose) window.conCtxClose();
      if (!node) return;
      const word = node.baseWord || node.el.textContent.trim().replace(/\n[\s\S]*/, '');
      const matched = conGetNodeDbEntries(node);
      const entries = (matched && matched.length)
        ? matched.map(m => m.entry).filter(Boolean)
        : conLookupDbEntries(word);
      const choices = conGetDefinitionChoices(entries);
      conDefPickerOpen(node, word, choices);
    };

    function conNoteAutosize(ta, noteData) {
      if (!ta) return;
      const note = ta.closest('.con-word-note, .ta-word-note');
      if (!note) return;
      const zoom = Math.max(0.2, Math.min(5, Number(window.conGetZoom ? window.conGetZoom() : 1) || 1));
      if (wnApplyStoredSize(note, ta, noteData, zoom)) {
        const contentH = Math.ceil(ta.scrollHeight / zoom);
        const neededH = Math.max(40, contentH + 12);
        if (noteData && noteData.manualSize && neededH > (Number(noteData.height) || 0)) {
          noteData.height = neededH;
          wnApplyStoredSize(note, ta, noteData, zoom);
          ta.style.overflowY = 'hidden';
        }
        return;
      }
      const isMirrorMode = document.documentElement.classList.contains('con-mirror-mode') ||
        (typeof location !== 'undefined' && location.search.indexOf('mirror=1') !== -1);
      const minBaseW = 120;
      const maxBaseW = 460;
      const minBaseH = 40;
      const padding = 33; // 24px container padding + 9px inner spacing

      let baseW;
      if (isMirrorMode && noteData && Number.isFinite(Number(noteData.liveBaseWidth)) && Number(noteData.liveBaseWidth) > 0) {
        baseW = Math.min(maxBaseW, Math.max(minBaseW, Number(noteData.liveBaseWidth)));
      } else {
        note.style.width = '';
        note.style.height = '';
        ta.style.overflowY = 'hidden';
        ta.style.height = 'auto';
        ta.style.width = 'auto';
        const clone = ta.cloneNode(true);
        clone.style.cssText = `position:absolute;visibility:hidden;height:auto;width:auto;
          white-space:pre-wrap;overflow:hidden;font:${getComputedStyle(ta).font};padding:0;border:0;`;
        document.body.appendChild(clone);
        const contentW = clone.scrollWidth + 2;
        clone.remove();
        const unzoomedContentW = contentW / zoom;
        baseW = Math.min(maxBaseW, Math.max(minBaseW, Math.round(unzoomedContentW + padding)));
      }

      note.style.width = (baseW * zoom) + 'px';
      ta.style.width = '100%';
      ta.style.height = 'auto';

      const editorScrollH = ta.scrollHeight;
      const unzoomedScrollH = editorScrollH / zoom;
      let baseH;
      if (isMirrorMode && noteData && Number.isFinite(Number(noteData.liveBaseHeight)) && Number(noteData.liveBaseHeight) > 0) {
        baseH = Math.max(minBaseH, Math.round(unzoomedScrollH + 12), Number(noteData.liveBaseHeight));
      } else {
        baseH = Math.max(minBaseH, Math.round(unzoomedScrollH + 12));
      }

      note.style.height = (baseH * zoom) + 'px';
      ta.style.height = Math.max(24 * zoom, editorScrollH) + 'px';
      ta.style.overflowY = 'hidden';

      if (noteData) {
        noteData.liveBaseWidth = baseW;
        noteData.liveBaseHeight = baseH;
        noteData.width = baseW;
        noteData.height = baseH;
      }
    }

    function conNoteBuild(noteData) {
      const board = document.getElementById('constellation-board');
      if (!board) return;

      const note = document.createElement('div');
      note.className = 'con-word-note';
      note.dataset.id = noteData.id;
      if (noteData.nodeId) note.dataset.nodeid = noteData.nodeId;
      note.style.left = noteData.x + 'px';
      note.style.top = noteData.y + 'px';

      const ta = document.createElement('div');
      ta.className = 'wn-note-editor';
      ta.contentEditable = 'true';
      ta.spellcheck = false;
      ta.setAttribute('data-placeholder', 'Note...');
      ta.innerHTML = noteData.html ? String(noteData.html) : boardEscapeHtml(noteData.text || '').replace(/\n/g, '<br>');
      ta.innerHTML = wnRenderMathHtml(ta.innerHTML);
      wnSyncNoteDataFromEditor(noteData, ta);

      function applyNoteStyle() {
        const zoom = window.conGetZoom ? window.conGetZoom() : 1;
        note.style.background = noteData.bg;
        note.style.color = noteData.color;
        note.style.fontSize = (noteData.fontSize * zoom) + 'px';
        note.style.fontWeight = noteData.bold ? '700' : '400';
        note.style.fontStyle = noteData.italic ? 'italic' : 'normal';
        if (noteData.fontFamily) note.style.fontFamily = noteData.fontFamily;
        const noteDecor = [];
        if (noteData.underline) noteDecor.push('underline');
        if (noteData.wavy) noteDecor.push('underline');
        if (noteData.strike) noteDecor.push('line-through');
        note.style.textDecoration = noteDecor.length ? noteDecor.join(' ') : 'none';
        note.style.textDecorationStyle = noteData.wavy ? 'wavy' : '';
        ta.style.textDecorationStyle = noteData.wavy ? 'wavy' : '';
        const noteCasing = noteData.casing || window._bcNoteDefaultCasing || 'none';
        if (noteCasing === 'uppercase') {
          note.style.textTransform = 'uppercase';
          ta.style.textTransform = 'uppercase';
          note.style.fontVariant = 'normal';
          ta.style.fontVariant = 'normal';
        } else if (noteCasing === 'lowercase') {
          note.style.textTransform = 'lowercase';
          ta.style.textTransform = 'lowercase';
          note.style.fontVariant = 'normal';
          ta.style.fontVariant = 'normal';
        } else if (noteCasing === 'titlecase') {
          note.style.textTransform = 'capitalize';
          ta.style.textTransform = 'capitalize';
          note.style.fontVariant = 'normal';
          ta.style.fontVariant = 'normal';
        } else if (noteCasing === 'smallcaps') {
          note.style.textTransform = 'none';
          ta.style.textTransform = 'none';
          note.style.fontVariant = 'small-caps';
          ta.style.fontVariant = 'small-caps';
        } else {
          note.style.textTransform = 'none';
          ta.style.textTransform = 'none';
          note.style.fontVariant = 'normal';
          ta.style.fontVariant = 'normal';
        }
        ta.style.fontSize = (noteData.fontSize * zoom) + 'px';
        ta.style.color = noteData.color;
        ta.style.fontWeight = noteData.bold ? '700' : '400';
        ta.style.fontStyle = noteData.italic ? 'italic' : 'normal';
        ta.style.textDecoration = note.style.textDecoration;
        ta.style.textAlign = noteData.textAlign || '';
        // Border
        if (noteData.borderWidth) {
          note.style.borderWidth = noteData.borderWidth + 'px';
          note.style.borderStyle = noteData.borderStyle || 'solid';
          note.style.borderColor = noteData.borderColor || '#111111';
        } else {
          note.style.borderWidth = '';
          note.style.borderStyle = '';
          note.style.borderColor = '';
        }
        wnApplyHiddenState(noteData, note);
        note.classList.toggle('wn-blink', !!noteData.blink);
        note.classList.toggle('student-input', !!noteData.studentInput);
        blinkQuickBtn.classList.toggle('active', !!noteData.blink);
        hideQuickBtn.classList.toggle('active', !!noteData.hidden);
        hideQuickBtn.title = noteData.hidden ? 'Reveal note' : 'Hide note';
        lockQuickBtn.innerHTML = noteData.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" />' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" />';
        lockQuickBtn.classList.toggle('active', !!noteData.locked);
        lockQuickBtn.title = noteData.locked ? 'Unlock note' : 'Lock note';
        conNoteAutosize(ta, noteData);
        // Re-apply sticker zoom
        note.querySelectorAll('.wn-emoji-sticker').forEach(el => {
          const sid = el.dataset.stickerId;
          const sd = (noteData.emojiStickers || []).find(s => s.id === sid);
          if (!sd) return;
          el.style.left = (sd.x * zoom) + 'px';
          el.style.top = (sd.y * zoom) + 'px';
          el.style.fontSize = ((sd.size || 32) * zoom) + 'px';
        });
        if (typeof updateKatexBtnVisibility === 'function') {
          updateKatexBtnVisibility();
        }
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({
            type: 'note-style',
            id: String(noteData.id),
            bg: noteData.bg,
            color: noteData.color,
            fontSize: noteData.fontSize,
            bold: !!noteData.bold,
            italic: !!noteData.italic,
            underline: !!noteData.underline,
            wavy: !!noteData.wavy,
            strike: !!noteData.strike,
            fontFamily: noteData.fontFamily || '',
            casing: noteData.casing || '',
            textAlign: noteData.textAlign || '',
            borderWidth: noteData.borderWidth || 0,
            borderStyle: noteData.borderStyle || '',
            borderColor: noteData.borderColor || '',
            hidden: !!noteData.hidden,
            blink: !!noteData.blink,
            baseWidth: noteData.liveBaseWidth,
            baseHeight: noteData.liveBaseHeight,
            width: noteData.width || noteData.liveBaseWidth,
            height: noteData.height || noteData.liveBaseHeight,
            manualSize: !!noteData.manualSize
          });
        }
      }
      noteData._applyStyle = applyNoteStyle;

      function updateNoteContent() {
        const newHtml = noteData.html ? String(noteData.html) : boardEscapeHtml(noteData.text || '').replace(/\n/g, '<br>');
        const rendered = (typeof wnRenderMathHtml === 'function') ? wnRenderMathHtml(newHtml) : newHtml;
        if (ta.innerHTML !== rendered) ta.innerHTML = rendered;
        conNoteAutosize(ta, noteData);
      }
      noteData._updateContent = updateNoteContent;

      ta.addEventListener('input', e => {
        wnSyncNoteDataFromEditor(noteData, e.currentTarget);
        conNoteAutosize(ta, noteData);
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof updateKatexBtnVisibility === 'function') updateKatexBtnVisibility();
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
        if (typeof wnSyncAndBroadcastNoteSelection === 'function') {
          wnSyncAndBroadcastNoteSelection(false);
        }
      });
      ta.addEventListener('blur', () => {
        conCancelNoteMirrorUpdate();
        const rendered = wnRenderMathHtml(ta.innerHTML);
        if (rendered !== ta.innerHTML) ta.innerHTML = rendered;
        wnSyncNoteDataFromEditor(noteData, ta);
        conNoteAutosize(ta, noteData);
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof updateKatexBtnVisibility === 'function') updateKatexBtnVisibility();
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
        if (typeof wnSyncAndBroadcastNoteSelection === 'function') {
          wnSyncAndBroadcastNoteSelection(true);
        }
        if (typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast();
        }
      });
      ta.addEventListener('mouseup', () => wnRememberSelection(ta));
      ta.addEventListener('dblclick', () => {
        // Trim trailing whitespace from the browser's default word selection
        const sel = window.getSelection && window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          // Walk the end container backwards while the character before the
          // end offset is a whitespace character, shrinking the selection.
          let endContainer = range.endContainer;
          let endOffset = range.endOffset;
          while (endOffset > 0) {
            const text = endContainer.nodeType === 3
              ? endContainer.textContent
              : (endContainer.childNodes[endOffset - 1] && endContainer.childNodes[endOffset - 1].textContent) || '';
            const charBefore = endContainer.nodeType === 3
              ? text[endOffset - 1]
              : null;
            if (charBefore && /\s/.test(charBefore)) {
              endOffset--;
            } else {
              break;
            }
          }
          if (endOffset !== range.endOffset) {
            range.setEnd(endContainer, endOffset);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
        wnRememberSelection(ta);
        if (typeof wnSyncAndBroadcastNoteSelection === 'function') {
          wnSyncAndBroadcastNoteSelection(true);
        }
      });
      ta.addEventListener('keyup', () => {
        wnRememberSelection(ta);
      });
      ta.addEventListener('focus', () => {
        wnRememberSelection(ta);
        _wnActiveNote = noteData;
        if (typeof conNoteSelected !== 'undefined' && !conNoteSelected.has(noteData.id)) {
          conNoteSelected.clear();
          conNoteSelected.add(noteData.id);
          document.querySelectorAll('#constellation-board .con-word-note.wn-selected, #constellation-board .ta-word-note.wn-selected')
            .forEach(n => n.classList.remove('wn-selected'));
          note.classList.add('wn-selected');
        }
        if (window.conNodeClearSelection) window.conNodeClearSelection();
        if (window.conDrawingClearSelection) window.conDrawingClearSelection();
        if (window.conShapeClearSelection) window.conShapeClearSelection();
      });
      ta.addEventListener('keydown', e => {
        if (!e || typeof e.key !== 'string') return;
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'x') {
          const sel = window.getSelection();
          const hasTextSelected = sel && sel.toString().length > 0;
          if (!hasTextSelected) {
            e.preventDefault();
            e.stopPropagation();
            ta.blur();
            if (typeof conNoteSelected !== 'undefined') {
              if (!conNoteSelected.has(noteData.id)) {
                conNoteSelected.clear();
                conNoteSelected.add(noteData.id);
                note.classList.add('wn-selected');
              }
            }
            if (typeof window.conClipboardCut === 'function') {
              window.conClipboardCut({ allowWhileTyping: true });
            }
            return;
          }
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'c') {
          const sel = window.getSelection();
          const hasTextSelected = sel && sel.toString().length > 0;
          if (!hasTextSelected) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof conNoteSelected !== 'undefined') {
              if (!conNoteSelected.has(noteData.id)) {
                conNoteSelected.clear();
                conNoteSelected.add(noteData.id);
                note.classList.add('wn-selected');
              }
            }
            if (typeof window.conClipboardCopy === 'function') {
              window.conClipboardCopy({ allowWhileTyping: true });
            }
            return;
          }
          return;
        }
        if (e.key === 'Enter') {
          setTimeout(() => {
            if (typeof wnRenderMathImmediate === 'function') wnRenderMathImmediate();
          }, 0);
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          e.stopPropagation();
          wnSyncNoteDataFromEditor(noteData, ta);
          if (typeof window.conSaveSession === 'function') {
            window.conSaveSession();
          } else if (typeof conSaveSession === 'function') {
            conSaveSession();
          }
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'j') {
          e.preventDefault();
          e.stopPropagation();
          ta.blur();
          if (typeof window.conSelectNote === 'function') {
            window.conSelectNote(noteData.id);
          }
          if (typeof window.conTriggerLinkShortcut === 'function') {
            window.conTriggerLinkShortcut();
          } else if (typeof window._conStartLinkMode === 'function') {
            window._conStartLinkMode(noteData.id);
          }
          return;
        }
        if (e.ctrlKey && (e.code === 'Space' || e.key === ' ')) {
          e.preventDefault();
          e.stopPropagation();
          wnNoteHandleCtrlSpace(ta);
          return;
        }
        if (!e.ctrlKey && !e.altKey && !e.metaKey && (e.code === 'Space' || e.key === ' ')) {
          if (wnNoteHandleSpace(ta, noteData)) { e.preventDefault(); e.stopPropagation(); return; }
        }
        if (wnHandleListKeydown(ta, noteData, e)) return;
        if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          document.execCommand('insertText', false, '\t');
          return;
        }
        if (e.key === 'Escape') {
          ta.blur();
          if (typeof window.conSelectNote === 'function') {
            window.conSelectNote(noteData.id);
          } else if (typeof conNoteSelected !== 'undefined') {
            conNoteSelected.clear();
            conNoteSelected.add(noteData.id);
            note.classList.add('wn-selected');
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
      });
      ta.addEventListener('mousedown', e => {
        if (document.body.classList.contains('laser-active')) { e.preventDefault(); return; }
        e.stopPropagation();
      });
      ta.addEventListener('click', e => {
        if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
          wnSyncNoteDataFromEditor(noteData, ta);
          if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        }
        if (!e.ctrlKey) return;
        const anchor = e.target.closest('a[href]');
        if (!anchor) return;
        e.preventDefault();
        e.stopPropagation();
        const href = anchor.getAttribute('href') || '';
        if (href && window.Desktop && typeof Desktop.openExternal === 'function') {
          Desktop.openExternal(href);
        }
      });
      ta.addEventListener('paste', e => {
        e.preventDefault();
        const clipData = e.clipboardData || window.clipboardData;

        // Table data (HTML <table> or TSV) → create a con-table-el on the board
        if (wnPasteAsConTable(clipData, window._boardCtxNoteX, window._boardCtxNoteY)) return;

        let text = clipData.getData('text/plain');

        // Normal text paste: normalize whitespace
        text = text
          .replace(/\u00A0|\u202F|\u2007|\u2060/g, ' ') // non-breaking / word-joiner spaces
          .replace(/\r\n|\r/g, '\n')                     // normalize line endings
          .replace(/[^\S\n]+/g, ' ')                     // collapse spaces/tabs (keep newlines)
          .replace(/[ \t]+\n/g, '\n')                    // trim trailing spaces before newline
          .replace(/\n[ \t]+/g, '\n')                    // trim leading spaces after newline
          .replace(/\n{3,}/g, '\n\n');                   // max two consecutive blank lines
        document.execCommand('insertText', false, text);
        setTimeout(() => {
          wnNormalizeChecklistLists(ta, noteData);
          conNoteAutosize(ta, noteData);
          if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
          conScheduleNoteMirrorUpdate(noteData, ta);
        }, 0);
      });

      note.appendChild(ta);

      // Mini-actions bar (top-right corner — emoji, blink, hide, fit, lock)
      const miniActions = document.createElement('div');
      miniActions.className = 'wn-note-mini-actions';

      // Emoji button (moved into miniActions)
      if (window.conEmojiAttachNoteDot) {
        window.conEmojiAttachNoteDot(noteData.id, note);
        const dot = note.querySelector('.con-emoji-dot');
        if (dot) miniActions.appendChild(dot);
      }
      if (noteData.emoji) {
        const dot = miniActions.querySelector('.con-emoji-dot');
        if (dot) { dot.textContent = noteData.emoji; dot.classList.add('has-emoji'); dot.title = 'Change reaction'; }
      }

      // Blink button
      const blinkQuickBtn = document.createElement('button');
      blinkQuickBtn.className = 'wn-note-mini-btn';
      blinkQuickBtn.setAttribute('data-action', 'blink');
      blinkQuickBtn.title = 'Toggle blink';
      blinkQuickBtn.innerHTML = '<img src="../assets/icons/blink.svg" class="btn-icon" alt="" />';
      blinkQuickBtn.classList.toggle('active', !!noteData.blink);
      blinkQuickBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      blinkQuickBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        noteData.blink = !noteData.blink;
        note.classList.toggle('wn-blink', !!noteData.blink);
        blinkQuickBtn.classList.toggle('active', !!noteData.blink);
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (_wnActiveNote && _wnActiveNote.id === noteData.id) {
          const blinkBtn = document.getElementById('wn-sp-blink-btn');
          if (blinkBtn) blinkBtn.classList.toggle('active', !!noteData.blink);
        }
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'note-blink', noteId: String(noteData.id), blink: !!noteData.blink });
        }
      });
      miniActions.appendChild(blinkQuickBtn);

      // Hide button
      const hideQuickBtn = document.createElement('button');
      hideQuickBtn.className = 'wn-note-mini-btn';
      hideQuickBtn.title = noteData.hidden ? 'Reveal note' : 'Hide note';
      hideQuickBtn.innerHTML = '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" />';
      hideQuickBtn.classList.toggle('active', !!noteData.hidden);
      hideQuickBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      hideQuickBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        noteData.hidden = !noteData.hidden;
        if (noteData._applyStyle) noteData._applyStyle();
        wnApplyHiddenState(noteData, note);
        hideQuickBtn.classList.toggle('active', !!noteData.hidden);
        hideQuickBtn.title = noteData.hidden ? 'Reveal note' : 'Hide note';
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (_wnActiveNote && _wnActiveNote.id === noteData.id) {
          const hideBtn = document.getElementById('wn-sp-hide-btn');
          if (hideBtn) hideBtn.innerHTML = noteData.hidden ? '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Reveal' : '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Hide';
        }
      });
      miniActions.appendChild(hideQuickBtn);

      // Fit-text button
      const fitQuickBtn = document.createElement('button');
      fitQuickBtn.className = 'wn-note-mini-btn';
      fitQuickBtn.title = 'Fit text to box';
      fitQuickBtn.innerHTML = '<img src="../assets/icons/fit-text.svg" class="btn-icon" alt="" />';
      fitQuickBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      fitQuickBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const prev = _wnActiveNote;
        _wnActiveNote = noteData;
        wnStyleFitText();
        _wnActiveNote = prev;
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      });
      miniActions.appendChild(fitQuickBtn);

      // Lock button
      const lockQuickBtn = document.createElement('button');
      lockQuickBtn.className = 'wn-note-mini-btn';
      lockQuickBtn.title = noteData.locked ? 'Unlock note' : 'Lock note';
      lockQuickBtn.innerHTML = noteData.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" />' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" />';
      lockQuickBtn.classList.toggle('active', !!noteData.locked);
      lockQuickBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      lockQuickBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        noteData.locked = !noteData.locked;
        lockQuickBtn.innerHTML = noteData.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" />' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" />';
        lockQuickBtn.classList.toggle('active', !!noteData.locked);
        lockQuickBtn.title = noteData.locked ? 'Unlock note' : 'Lock note';
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (_wnActiveNote && _wnActiveNote.id === noteData.id) {
          const lockBtn = document.getElementById('wn-sp-lock-btn');
          if (lockBtn) { lockBtn.innerHTML = noteData.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" /> Unlock' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" /> Lock'; lockBtn.classList.toggle('active', !!noteData.locked); }
        }
      });
      miniActions.appendChild(lockQuickBtn);

      // Dictate button
      const dictateQuickBtn = document.createElement('button');
      dictateQuickBtn.className = 'wn-note-mini-btn';
      dictateQuickBtn.setAttribute('data-action', 'dictate');
      dictateQuickBtn.title = (window.i18n && typeof i18n.t === 'function' ? i18n.t('conNoteDictateTitle') : 'Dictate into note (Speech to Text)');
      dictateQuickBtn.innerHTML = '<img src="../assets/icons/mic.svg" class="btn-icon" alt="" />';
      dictateQuickBtn.classList.toggle('active', !!(typeof _boardSttTargetNote !== 'undefined' && _boardSttTargetNote && _boardSttTargetNote.id === noteData.id));
      dictateQuickBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      dictateQuickBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof wnToggleNoteDictation === 'function') {
          wnToggleNoteDictation(noteData, ta, dictateQuickBtn);
        }
      });
      miniActions.appendChild(dictateQuickBtn);

      // KaTeX help button
      const katexHelpBtn = document.createElement('button');
      katexHelpBtn.className = 'wn-note-mini-btn';
      katexHelpBtn.title = t('katexHelpTitle');
      katexHelpBtn.textContent = '∑';
      katexHelpBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      katexHelpBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        wnShowKatexHelp();
      });
      miniActions.appendChild(katexHelpBtn);

      function updateKatexBtnVisibility() {
        const text = noteData.text || '';
        const hasFormula = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/.test(text);
        const hasRendered = ta.querySelector('.wn-katex-display, .wn-katex-inline, .katex') !== null;
        katexHelpBtn.style.display = (hasFormula || hasRendered) ? '' : 'none';
      }

      function wnRenderMathImmediate() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        // Save caret position using a marker span
        const marker = document.createElement('span');
        marker.id = 'wn-caret-marker';
        marker.style.display = 'none';

        const range = sel.getRangeAt(0);
        try {
          range.insertNode(marker);
        } catch (err) {
          const oldHTML = ta.innerHTML;
          const rendered = wnRenderMathHtml(oldHTML);
          if (rendered !== oldHTML) {
            ta.innerHTML = rendered;
            wnSyncNoteDataFromEditor(noteData, ta);
            conNoteAutosize(ta, noteData);
            updateKatexBtnVisibility();
          }
          return;
        }

        const oldHTML = ta.innerHTML;
        const rendered = wnRenderMathHtml(oldHTML);
        if (rendered !== oldHTML) {
          ta.innerHTML = rendered;

          const newMarker = ta.querySelector('#wn-caret-marker');
          if (newMarker) {
            const newRange = document.createRange();
            newRange.setStartBefore(newMarker);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            newMarker.remove();
          }

          wnSyncNoteDataFromEditor(noteData, ta);
          conNoteAutosize(ta, noteData);
          updateKatexBtnVisibility();
        } else {
          marker.remove();
        }
      }

      // Initial visibility check
      updateKatexBtnVisibility();

      note.appendChild(miniActions);

      // Migrate legacy single emoji → sticker (backward compat)
      if (noteData.emoji && !(noteData.emojiStickers && noteData.emojiStickers.length)) {
        if (!noteData.emojiStickers) noteData.emojiStickers = [];
        const zoom = window.conGetZoom ? window.conGetZoom() : 1;
        noteData.emojiStickers.push({ id: _emojiStickerNextId(), emoji: noteData.emoji, x: 0, y: -8, size: 32 });
        noteData.emoji = null;
      }

      // Show mini-actions on hover; linger 3 s after mouse leaves
      let _miniHideTimer = null;
      note.addEventListener('mouseenter', () => {
        clearTimeout(_miniHideTimer);
        // Hide all other notes' mini-actions bars immediately
        document.querySelectorAll('.wn-note-mini-actions').forEach(bar => {
          if (bar !== miniActions) bar.classList.remove('wn-mini-visible');
        });
        miniActions.classList.add('wn-mini-visible');
      });
      note.addEventListener('mouseleave', () => {
        _miniHideTimer = setTimeout(() => miniActions.classList.remove('wn-mini-visible'), 3000);
      });

      board.appendChild(note);
      wnAttachResizeHandle(note, ta, noteData, {
        minW: 120,
        maxW: 1400,
        minH: 40,
        maxH: () => {
          const zoom = window.conGetZoom ? window.conGetZoom() : 1;
          const board = document.getElementById('constellation-board');
          const boardH = Math.max(200, (board && board.clientHeight) || 0);
          return Math.max(40, boardH / Math.max(0.5, zoom));
        },
        scaleGetter: () => (window.conGetZoom ? window.conGetZoom() : 1)
      });

      applyNoteStyle();
      conNoteAutosize(ta, noteData);
      conNoteRebuildAllStickers(noteData, note);

      // Right-click opens note style popup
      note.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        wnStyleOpen(noteData, note, e, wnResolveWordMetaFromNoteContext(note));
      });

      note.addEventListener('dblclick', e => {
        if (document.body.classList.contains('laser-active')) return;
        if (!noteData.hidden || e.target.closest('.wn-note-resizer')) return;
        e.preventDefault();
        e.stopPropagation();
        noteData.hidden = false;
        if (noteData._applyStyle) noteData._applyStyle();
        if (_wnActiveNote && _wnActiveNote.id === noteData.id) {
          const hideBtn = document.getElementById('wn-sp-hide-btn');
          if (hideBtn) hideBtn.textContent = 'Hide';
        }
        if (typeof conRedrawEdges === 'function') conRedrawEdges();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'note-hide', id: String(noteData.id), hidden: false });
        }
        setTimeout(() => ta.focus(), 0);
      });

      // Drag — grab the note div (not textarea); supports multi-select via Shift/Ctrl+click
      let dragging = false, hasDragged = false, startMX = 0, startMY = 0;
      let _dragOffsets = [];
      let _nodeOffsets = [];
      let _drawOffsets = [];
      let _shapeOffsets = [];
      let _tableOffsets = [];
      let _preDragSnap = null;
      let _conNoteMoveRaf = null;
      note.addEventListener('mousedown', e => {
        if (e.target.closest('.wn-note-editor') || e.target.closest('.wn-note-resizer')) return;
        // Blur active editor so Delete key immediately acts on the selected note container
        if (document.activeElement && (document.activeElement.isContentEditable || document.activeElement.tagName === 'INPUT')) {
          document.activeElement.blur();
        }
        // Selection handling
        const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;
        if (isModifier) {
          const _curSelNode = (typeof window.conGetSelected === 'function' ? window.conGetSelected() : null)
            || (typeof window.conSelected !== 'undefined' ? window.conSelected : null)
            || (typeof conSelected !== 'undefined' ? conSelected : null);
          if (_curSelNode) {
            if (typeof window.conAddMultiSelected === 'function') {
              window.conAddMultiSelected(_curSelNode);
            } else {
              const multiSel = (typeof window.conGetMultiSelected === 'function')
                ? window.conGetMultiSelected()
                : (window.conMultiSelected || conMultiSelected);
              if (multiSel && multiSel.add) multiSel.add(_curSelNode);
              const liveNodes = (typeof window.conGetNodes === 'function')
                ? window.conGetNodes()
                : (window.conNodes || conNodes || []);
              const prevEl = liveNodes.find(n => n && (n.id === _curSelNode || String(n.id) === String(_curSelNode)));
              if (prevEl && prevEl.el) {
                prevEl.el.classList.remove('con-selected');
                prevEl.el.classList.add('con-multi-selected');
              }
            }
            if ('conSelected' in window) window.conSelected = null;
            if (typeof conSelected !== 'undefined') conSelected = null;
          }
          if (conNoteSelected.has(noteData.id)) {
            conNoteSelected.delete(noteData.id);
            note.classList.remove('wn-selected');
          } else {
            conNoteSelected.add(noteData.id);
            note.classList.add('wn-selected');
          }
        } else {
          if (!conNoteSelected.has(noteData.id)) {
            document.querySelectorAll('#constellation-board .con-word-note.wn-selected')
              .forEach(n => n.classList.remove('wn-selected'));
            conNoteSelected.clear();
            conNoteSelected.add(noteData.id);
            note.classList.add('wn-selected');
            // Plain click on an unselected note — clear node, drawing, shape, table, and media selections
            if (window.conNodeClearSelection) window.conNodeClearSelection();
            if (window.conDrawingClearSelection) window.conDrawingClearSelection();
            if (window.conShapeClearSelection) window.conShapeClearSelection();
            if (typeof window.conTableClearSelection === 'function') window.conTableClearSelection();
            if (window.conMediaClearSelection) window.conMediaClearSelection();
          }
        }
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
        // Check if any selected notes are locked — if so, don't allow dragging
        let anyLocked = false;
        conNoteSelected.forEach(id => {
          const nd = conNotes.find(n => n.id === id);
          if (nd && nd.locked) anyLocked = true;
        });
        if (anyLocked) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        // Snapshot start positions for all selected notes
        dragging = true;
        hasDragged = false;
        _preDragSnap = typeof conBuildPageSnapshot === 'function' ? conBuildPageSnapshot() : null;
        startMX = e.clientX;
        startMY = e.clientY;
        _dragOffsets = [];
        conNoteSelected.forEach(id => {
          const nd = conNotes.find(n => n.id === id);
          if (nd) _dragOffsets.push({ nd, sx: nd.x, sy: nd.y });
        });
        // Snapshot selected nodes for joint drag
        _nodeOffsets = [];
        const _nAllNodes = new Set();
        if (typeof window.conGetMultiSelected === 'function' && window.conGetMultiSelected()) {
          window.conGetMultiSelected().forEach(nid => _nAllNodes.add(nid));
        }
        if (typeof window.conMultiSelected !== 'undefined' && window.conMultiSelected) {
          window.conMultiSelected.forEach(nid => _nAllNodes.add(nid));
        }
        if (typeof conMultiSelected !== 'undefined' && conMultiSelected) {
          conMultiSelected.forEach(nid => _nAllNodes.add(nid));
        }
        const _singleSel = (typeof window.conGetSelected === 'function' ? window.conGetSelected() : null)
          || (typeof window.conSelected !== 'undefined' ? window.conSelected : null)
          || (typeof conSelected !== 'undefined' ? conSelected : null);
        if (_singleSel) _nAllNodes.add(_singleSel);

        // Include any visually selected node on the board DOM
        document.querySelectorAll('#constellation-board .con-node.con-selected, #constellation-board .con-node.con-multi-selected').forEach(el => {
          if (el.id) _nAllNodes.add(el.id);
        });

        if (typeof conGroups !== 'undefined' && Array.isArray(conGroups)) {
          const _expandedNodeIds = new Set(_nAllNodes);
          _nAllNodes.forEach(nid => {
            const pg = conGroups.find(g => g.phraseGroup && g.nodeIds && (g.nodeIds.includes(nid) || g.nodeIds.some(sid => String(sid) === String(nid))));
            if (pg) pg.nodeIds.forEach(sid => _expandedNodeIds.add(sid));
          });
          _expandedNodeIds.forEach(nid => _nAllNodes.add(nid));
        }
        const _nNodesList = (typeof window.conGetNodes === 'function')
          ? window.conGetNodes()
          : (window.conNodes || conNodes || []);
        _nAllNodes.forEach(nid => {
          const nd = _nNodesList.find(n => n && (n.id === nid || String(n.id) === String(nid)));
          if (nd && !(typeof conIsNodeLocked === 'function' && conIsNodeLocked(nd))) {
            _nodeOffsets.push({ nd, sx: nd.x, sy: nd.y });
          }
        });
        // Snapshot selected drawings for joint drag
        _drawOffsets = [];
        const _nDrawSel = window.conGetDrawingSelected ? window.conGetDrawingSelected() : (typeof conDrawingSelected !== 'undefined' ? conDrawingSelected : new Set());
        const _nDrawList = window.conGetDrawings ? window.conGetDrawings() : [];
        _nDrawSel.forEach(did => {
          const dr = _nDrawList.find(x => x.id === did);
          if (dr) _drawOffsets.push({ dr, sx: dr.x, sy: dr.y, pad: dr.pad || Math.max((dr.thickness || 2) + 4, 12) });
        });
        // Snapshot selected shapes for joint drag
        _shapeOffsets = [];
        const _nShapeSel = window.conGetShapeSelected ? window.conGetShapeSelected() : (typeof _conShapeSelected !== 'undefined' ? _conShapeSelected : new Set());
        const _nShapeList = window.conGetShapes ? window.conGetShapes() : [];
        _nShapeSel.forEach(sid => {
          const s = _nShapeList.find(x => x.id === sid);
          if (s) _shapeOffsets.push({
            s, sx: s.x, sy: s.y,
            slx1: s.lx1, sly1: s.ly1, slx2: s.lx2, sly2: s.ly2,
            spts: s.pts ? s.pts.map(p => ({ ...p })) : null,
            pad: s.pad || (typeof _conShapeGetPAD === 'function' ? _conShapeGetPAD(s) : 16)
          });
        });
        // Snapshot selected tables for joint drag
        _tableOffsets = [];
        const _nTableSel = (typeof conTableSelected !== 'undefined') ? conTableSelected : new Set();
        const _nTableList = (typeof conTables !== 'undefined') ? conTables : [];
        _nTableSel.forEach(tid => {
          const tbl = _nTableList.find(t => t.id === tid);
          if (tbl && !tbl.locked) _tableOffsets.push({ tbl, sx: tbl.x, sy: tbl.y });
        });
        note.style.cursor = 'grabbing';
        e.preventDefault();
        e.stopPropagation();
      });
      document.addEventListener('mousemove', e => {
        if (!dragging) return;
        if (e.buttons === 0) {
          dragging = false;
          window._conMirrorDragging = false;
          note.style.cursor = '';
          return;
        }
        const dx = e.clientX - startMX;
        const dy = e.clientY - startMY;
        if (!hasDragged && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
          hasDragged = true;
          window._conMirrorDragging = true;
        }
        // Remove any previous snap lines for this frame
        const svgEl = document.getElementById('constellation-svg');
        const brdEl = document.getElementById('constellation-board');
        document.querySelectorAll('.con-snap-line').forEach(l => l.remove());
        _dragOffsets.forEach(({ nd, sx, sy }) => {
          let nx = sx + dx;
          let ny = sy + dy;
          // Snap align against nodes/shapes/other notes when enabled
          const _snapEnabled = window.conGetSnapEnabled ? window.conGetSnapEnabled() : false;
          if (_snapEnabled && !e.altKey) {
            const SNAP_DIST = 8;
            const noteEl = wnGetNoteElementById(nd.id);
            const elW = noteEl ? noteEl.offsetWidth : (nd.width || 120);
            const elH = noteEl ? noteEl.offsetHeight : (nd.height || 80);
            const dragAnchorsX = [nx, nx + elW / 2, nx + elW];
            const dragAnchorsY = [ny, ny + elH / 2, ny + elH];
            let bestSnapX = null, bestSnapY = null;
            const _snapNodes = window.conGetNodes ? window.conGetNodes() : [];
            const _snapShapes = window.conGetShapes ? window.conGetShapes() : [];
            const _snapDrawings = window.conGetDrawings ? window.conGetDrawings() : [];
            // Check nodes
            _snapNodes.forEach(sn => {
              const snW = sn.el ? sn.el.offsetWidth : 80, snH = sn.el ? sn.el.offsetHeight : 32;
              [sn.x, sn.x + snW / 2, sn.x + snW].forEach(na => {
                dragAnchorsX.forEach(da => {
                  const diff = Math.abs(da - na);
                  if (diff < SNAP_DIST && (!bestSnapX || diff < bestSnapX.diff)) bestSnapX = { nx: nx + (na - da), line: na, diff };
                });
              });
              [sn.y, sn.y + snH / 2, sn.y + snH].forEach(na => {
                dragAnchorsY.forEach(da => {
                  const diff = Math.abs(da - na);
                  if (diff < SNAP_DIST && (!bestSnapY || diff < bestSnapY.diff)) bestSnapY = { ny: ny + (na - da), line: na, diff };
                });
              });
            });
            // Check other notes
            conNotes.forEach(on => {
              if (on.id === nd.id) return;
              const oEl = wnGetNoteElementById(on.id);
              const oW = oEl ? oEl.offsetWidth : (on.width || 120), oH = oEl ? oEl.offsetHeight : (on.height || 80);
              [on.x, on.x + oW / 2, on.x + oW].forEach(na => {
                dragAnchorsX.forEach(da => {
                  const diff = Math.abs(da - na);
                  if (diff < SNAP_DIST && (!bestSnapX || diff < bestSnapX.diff)) bestSnapX = { nx: nx + (na - da), line: na, diff };
                });
              });
              [on.y, on.y + oH / 2, on.y + oH].forEach(na => {
                dragAnchorsY.forEach(da => {
                  const diff = Math.abs(da - na);
                  if (diff < SNAP_DIST && (!bestSnapY || diff < bestSnapY.diff)) bestSnapY = { ny: ny + (na - da), line: na, diff };
                });
              });
            });
            // Check shapes
            _snapShapes.forEach(sh => {
              const sW = Math.max(2, sh.w || 40), sH = Math.max(2, sh.h || 40);
              [sh.x, sh.x + sW / 2, sh.x + sW].forEach(na => {
                dragAnchorsX.forEach(da => {
                  const diff = Math.abs(da - na);
                  if (diff < SNAP_DIST && (!bestSnapX || diff < bestSnapX.diff)) bestSnapX = { nx: nx + (na - da), line: na, diff };
                });
              });
              [sh.y, sh.y + sH / 2, sh.y + sH].forEach(na => {
                dragAnchorsY.forEach(da => {
                  const diff = Math.abs(da - na);
                  if (diff < SNAP_DIST && (!bestSnapY || diff < bestSnapY.diff)) bestSnapY = { ny: ny + (na - da), line: na, diff };
                });
              });
            });
            // Check drawings
            _snapDrawings.forEach(d => {
              const dW = Math.max(2, d.w || 40), dH = Math.max(2, d.h || 40);
              [d.x, d.x + dW / 2, d.x + dW].forEach(na => {
                dragAnchorsX.forEach(da => {
                  const diff = Math.abs(da - na);
                  if (diff < SNAP_DIST && (!bestSnapX || diff < bestSnapX.diff)) bestSnapX = { nx: nx + (na - da), line: na, diff };
                });
              });
              [d.y, d.y + dH / 2, d.y + dH].forEach(na => {
                dragAnchorsY.forEach(da => {
                  const diff = Math.abs(da - na);
                  if (diff < SNAP_DIST && (!bestSnapY || diff < bestSnapY.diff)) bestSnapY = { ny: ny + (na - da), line: na, diff };
                });
              });
            });
            if (bestSnapX !== null) {
              nx = Math.max(0, bestSnapX.nx);
              if (svgEl && brdEl) {
                const sl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                sl.setAttribute('class', 'con-snap-line');
                sl.setAttribute('x1', bestSnapX.line); sl.setAttribute('y1', 0);
                sl.setAttribute('x2', bestSnapX.line); sl.setAttribute('y2', Math.max(brdEl.clientHeight || 0, brdEl.scrollHeight || 0));
                svgEl.appendChild(sl);
              }
            }
            if (bestSnapY !== null) {
              ny = Math.max(0, bestSnapY.ny);
              if (svgEl && brdEl) {
                const sl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                sl.setAttribute('class', 'con-snap-line');
                sl.setAttribute('x1', 0); sl.setAttribute('y1', bestSnapY.line);
                sl.setAttribute('x2', Math.max(brdEl.clientWidth || 0, brdEl.scrollWidth || 0)); sl.setAttribute('y2', bestSnapY.line);
                svgEl.appendChild(sl);
              }
            }
          }
          nd.x = nx;
          nd.y = ny;
          const el = wnGetNoteElementById(nd.id);
          if (el) { el.style.left = nd.x + 'px'; el.style.top = nd.y + 'px'; }
        });
        if (_dragOffsets.length > 0) {
          if (window.conRedrawEdges) window.conRedrawEdges();
        }
        if (_nodeOffsets.length > 0) {
          _nodeOffsets.forEach(({ nd, sx, sy }) => {
            nd.x = sx + dx;
            nd.y = sy + dy;
            const el = nd.el || document.getElementById(nd.id);
            if (el) {
              el.style.left = nd.x + 'px';
              el.style.top = nd.y + 'px';
            }
          });
          if (window.conRedrawEdges) window.conRedrawEdges();
          if (window.conGroupRefitAll) window.conGroupRefitAll();
        }
        if (_drawOffsets.length > 0) {
          _drawOffsets.forEach(({ dr, sx, sy, pad }) => {
            dr.x = sx + dx;
            dr.y = sy + dy;
            const p = pad !== undefined ? pad : (dr.pad || 12);
            if (dr.el) { dr.el.style.left = (dr.x - p) + 'px'; dr.el.style.top = (dr.y - p) + 'px'; }
          });
        }
        if (_shapeOffsets.length > 0) {
          _shapeOffsets.forEach(({ s, sx, sy, slx1, sly1, slx2, sly2, spts, pad }) => {
            s.x = sx + dx;
            s.y = sy + dy;
            if (s.lx1 !== undefined && slx1 !== undefined) {
              s.lx1 = slx1 + dx; s.ly1 = sly1 + dy;
              s.lx2 = slx2 + dx; s.ly2 = sly2 + dy;
            }
            if (s.pts && spts) s.pts = spts.map(p => ({ x: p.x + dx, y: p.y + dy }));
            const p = pad !== undefined ? pad : (s.pad || 16);
            if (s.el) { s.el.style.left = (s.x - p) + 'px'; s.el.style.top = (s.y - p) + 'px'; }
            if (typeof _conShapeUpdateHandles === 'function') _conShapeUpdateHandles(s);
          });
        }
        if (_tableOffsets.length > 0) {
          _tableOffsets.forEach(({ tbl, sx, sy }) => {
            tbl.x = Math.max(0, sx + dx);
            tbl.y = Math.max(0, sy + dy);
            if (tbl.el) { tbl.el.style.left = tbl.x + 'px'; tbl.el.style.top = tbl.y + 'px'; }
          });
        }
        // Lightweight mirror update — send object positions directly
        if (hasDragged && window._conMirrorSend) {
          if (!_conNoteMoveRaf) {
            _conNoteMoveRaf = requestAnimationFrame(function () {
              _conNoteMoveRaf = null;
              if (!window._conMirrorSend) return;
              if (_dragOffsets.length > 0) {
                const _notePositions = _dragOffsets.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y }));
                window._conMirrorSend({ type: 'note-move', positions: _notePositions });
              }
              if (_nodeOffsets.length > 0) {
                window._conMirrorSend({ type: 'node-move', positions: _nodeOffsets.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
              }
              if (_drawOffsets.length > 0) {
                window._conMirrorSend({ type: 'drawing-move', positions: _drawOffsets.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y })) });
              }
              if (_shapeOffsets.length > 0) {
                window._conMirrorSend({
                  type: 'shape-move',
                  positions: _shapeOffsets.map(({ s }) => ({
                    id: s.id, x: s.x, y: s.y,
                    lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                    pts: s.pts ? s.pts.map(p => ({ ...p })) : undefined
                  }))
                });
              }
              if (_tableOffsets.length > 0) {
                window._conMirrorSend({
                  type: 'table-move',
                  positions: _tableOffsets.map(({ tbl }) => ({ id: tbl.id, x: tbl.x, y: tbl.y }))
                });
              }
            });
          }
        }
      });
      document.addEventListener('mouseup', e => {
        if (!dragging) return;
        if (_conNoteMoveRaf) {
          cancelAnimationFrame(_conNoteMoveRaf);
          _conNoteMoveRaf = null;
        }

        if (hasDragged) {
          // Send final positions
          if (window._conMirrorSend) {
            if (_dragOffsets.length > 0) {
              const _notePositions = _dragOffsets.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y }));
              window._conMirrorSend({ type: 'note-move', positions: _notePositions });
            }
            if (_nodeOffsets.length > 0) {
              window._conMirrorSend({ type: 'node-move', positions: _nodeOffsets.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
            }
            if (_drawOffsets.length > 0) {
              window._conMirrorSend({ type: 'drawing-move', positions: _drawOffsets.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y })) });
            }
            if (_shapeOffsets.length > 0) {
              window._conMirrorSend({
                type: 'shape-move',
                positions: _shapeOffsets.map(({ s }) => ({
                  id: s.id, x: s.x, y: s.y,
                  lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                  pts: s.pts ? s.pts.map(p => ({ ...p })) : undefined
                }))
              });
            }
            if (_tableOffsets.length > 0) {
              window._conMirrorSend({
                type: 'table-move',
                positions: _tableOffsets.map(({ tbl }) => ({ id: tbl.id, x: tbl.x, y: tbl.y }))
              });
            }
          }
          if (_nodeOffsets.length > 0) {
            _nodeOffsets.forEach(({ nd }) => {
              if (typeof window.conSyncNodeBasePosition === 'function') {
                window.conSyncNodeBasePosition(nd);
              } else {
                const board = document.getElementById('constellation-board');
                if (board) {
                  const boardCenterX = board.clientWidth / 2;
                  const boardCenterY = board.clientHeight / 2;
                  const z = (window.conGetZoom ? window.conGetZoom() : (typeof window.conCurrentZoom === 'number' ? window.conCurrentZoom : 1)) || 1;
                  nd.baseX = boardCenterX + (nd.x - boardCenterX) / z;
                  nd.baseY = boardCenterY + (nd.y - boardCenterY) / z;
                }
              }
            });
            if (window.conRedrawEdges) window.conRedrawEdges();
            if (window.conGroupRefitAll) window.conGroupRefitAll();
          }
          if (_preDragSnap && typeof conPushUndo === 'function') conPushUndo(_preDragSnap);
          if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
          // Full mirror sync with revision bumped
          if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          const totalOther = (conNoteSelected.size > 1 ? conNoteSelected.size - 1 : 0) + _nodeOffsets.length + _drawOffsets.length + _shapeOffsets.length + _tableOffsets.length;
          if (totalOther > 0) {
            document.querySelectorAll('#constellation-board .con-word-note.wn-selected')
              .forEach(n => n.classList.remove('wn-selected'));
            conNoteSelected.clear();
            conNoteSelected.add(noteData.id);
            note.classList.add('wn-selected');
            if (window.conNodeClearSelection) window.conNodeClearSelection();
            if (window.conDrawingClearSelection) window.conDrawingClearSelection();
            if (window.conShapeClearSelection) window.conShapeClearSelection();
            if (typeof window.conTableClearSelection === 'function') window.conTableClearSelection();
            if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
          }
        }

        dragging = false;
        hasDragged = false;
        _preDragSnap = null;
        // Clear snap lines
        document.querySelectorAll('.con-snap-line').forEach(l => l.remove());
        note.style.cursor = '';
        _dragOffsets = [];
        _nodeOffsets = [];
        _drawOffsets = [];
        _shapeOffsets = [];
        _tableOffsets = [];
        setTimeout(() => {
          window._conMirrorDragging = false;
        }, 60);
      });
    }

    function conDuplicateNoteData(noteData, offsetX, offsetY) {
      if (!noteData || !noteData.id || !noteData.id.startsWith('cn')) return null;
      const dx = Number.isFinite(offsetX) ? offsetX : 30;
      const dy = Number.isFinite(offsetY) ? offsetY : 24;
      const newId = conGetNextNoteId();
      const clone = Object.assign({}, noteData, {
        id: newId,
        x: (Number(noteData.x) || 0) + dx,
        y: (Number(noteData.y) || 0) + dy,
        emojiStickers: []
      });
      delete clone._applyStyle;
      delete clone._updateContent;
      conNotes.push(clone);
      conNoteBuild(clone);
      if (clone.nodeId) {
        const linkedNode = conGetNodes().find(n => n.id === clone.nodeId);
        if (linkedNode && linkedNode.el) linkedNode.el.classList.add('has-con-note');
      }
      const editor = document.querySelector(`.con-word-note[data-id="${newId}"] .wn-note-editor`);
      if (editor) setTimeout(() => editor.focus(), 0);
      return clone;
    }

    function conNoteDeleteActive() {
      if (!_conNoteCtxData) return;
      const nd = _conNoteCtxData;
      _conNoteCtxData = null;
      wnDeleteNoteData(nd);
    }

    function conNoteStyleActive() {
      if (!_conNoteCtxData) return;
      wnStyleOpen(_conNoteCtxData, wnGetNoteElementById(_conNoteCtxData.id));
    }

    function conNoteDuplicateActive() {
      if (!_conNoteCtxData) return;
      if (window.conPushUndo) window.conPushUndo();
      conDuplicateNoteData(_conNoteCtxData, 28, 22);
    }

    window.conApplyZoomToNotes = function () {
      conNotes.forEach(n => {
        if (n && n._applyStyle) n._applyStyle();
      });
    };

    window.conNotesClear = function () {
      conNotes = [];
      window.conNotes = global.conNotes = conNotes;
      conNoteNextId = 0;
      conNoteSelected.clear();
      document.querySelectorAll('#constellation-board .con-word-note').forEach(n => n.remove());
      document.querySelectorAll('.con-node.has-con-note').forEach(n => n.classList.remove('has-con-note'));
      document.querySelectorAll('.con-node-note-btn').forEach(b => b.remove());
    };
    window.conGetNotes = function () { return conNotes; };
    window.conGetNoteSelected = function () { return conNoteSelected; };
    window.conAddNoteObject = function (noteData) {
      if (!noteData) return null;
      if (!noteData.id) {
        noteData.id = conGetNextNoteId();
      } else {
        const m = String(noteData.id).match(/^cnn(\d+)$/);
        if (m) conSyncNoteNextId(parseInt(m[1], 10) + 1);
      }
      conNotes.push(noteData);
      conNoteBuild(noteData);
      return noteData.id;
    };
    window.conSelectNote = function (noteId, add = false) {
      if (!add) {
        document.querySelectorAll('#constellation-board .con-word-note.wn-selected')
          .forEach(n => n.classList.remove('wn-selected'));
        conNoteSelected.clear();
      }
      conNoteSelected.add(noteId);
      const el = document.querySelector(`.con-word-note[data-id="${noteId}"]`);
      if (el) el.classList.add('wn-selected');
    };
    window.conGetNextNoteId = conGetNextNoteId;

    // ── Emoji sticker system ──────────────────────────────────────────
    let _emojiStickerSeq = 0;
    function _emojiStickerNextId() { return 'es' + Date.now() + '_' + (_emojiStickerSeq++); }

    function conNoteBuildSticker(sd, noteData, noteEl) {
      const zoom = window.conGetZoom ? window.conGetZoom() : 1;
      const el = document.createElement('div');
      el.className = 'wn-emoji-sticker';
      el.dataset.stickerId = sd.id;
      el.style.left = (sd.x * zoom) + 'px';
      el.style.top = (sd.y * zoom) + 'px';
      el.style.fontSize = ((sd.size || 32) * zoom) + 'px';

      const face = document.createElement('span');
      face.className = 'wn-emoji-sticker-face';
      face.textContent = sd.emoji;
      el.appendChild(face);

      const delBtn = document.createElement('div');
      delBtn.className = 'wn-emoji-sticker-delete';
      delBtn.textContent = '✕';
      delBtn.title = 'Remove';
      delBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      delBtn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        if (noteData && noteData.emojiStickers) {
          const idx = noteData.emojiStickers.indexOf(sd);
          if (idx !== -1) noteData.emojiStickers.splice(idx, 1);
        }
        if (window._conBoardStickers) {
          const idx = window._conBoardStickers.indexOf(sd);
          if (idx !== -1) window._conBoardStickers.splice(idx, 1);
        }
        el.remove();
        if (window._conMirrorSend) {
          window._conMirrorSend({ type: 'sticker-delete', id: sd.id, noteId: noteData && noteData.id });
        }
      });
      el.appendChild(delBtn);

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'wn-emoji-sticker-resize';
      resizeHandle.textContent = '◢';
      el.appendChild(resizeHandle);

      // Drag to reposition
      el.addEventListener('mousedown', e => {
        if (e.target === resizeHandle || e.target === delBtn) return;
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        const dz = () => window.conGetZoom ? window.conGetZoom() : 1;
        const startX = e.clientX, startY = e.clientY;
        const origX = sd.x, origY = sd.y;
        const onMove = ev => {
          const z = dz();
          sd.x = origX + (ev.clientX - startX) / z;
          sd.y = origY + (ev.clientY - startY) / z;
          el.style.left = (sd.x * z) + 'px';
          el.style.top = (sd.y * z) + 'px';
          if (window._conMirrorSend) {
            window._conMirrorSend({ type: 'sticker-update', id: sd.id, x: sd.x, y: sd.y, size: sd.size });
          }
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          if (window._conMirrorSend) {
            window._conMirrorSend({ type: 'sticker-update', id: sd.id, x: sd.x, y: sd.y, size: sd.size });
          }
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // Resize handle — drag vertically to change font size
      resizeHandle.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        const dz = () => window.conGetZoom ? window.conGetZoom() : 1;
        const startY = e.clientY, origSize = sd.size || 32;
        const onMove = ev => {
          const z = dz();
          sd.size = Math.max(10, Math.round(origSize + (ev.clientY - startY) / z));
          el.style.fontSize = (sd.size * z) + 'px';
          if (window._conMirrorSend) {
            window._conMirrorSend({ type: 'sticker-update', id: sd.id, x: sd.x, y: sd.y, size: sd.size });
          }
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          if (window._conMirrorSend) {
            window._conMirrorSend({ type: 'sticker-update', id: sd.id, x: sd.x, y: sd.y, size: sd.size });
          }
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      noteEl.appendChild(el);
      return el;
    }

    function conNoteRebuildAllStickers(noteData, noteEl) {
      noteEl.querySelectorAll('.wn-emoji-sticker').forEach(s => s.remove());
      (noteData.emojiStickers || []).forEach(sd => conNoteBuildSticker(sd, noteData, noteEl));
    }

    window.conNoteAddEmojiSticker = function (noteId, emoji) {
      const noteData = (window.conGetNotes ? window.conGetNotes() : []).find(n => n.id === noteId);
      if (!noteData) return;
      const noteEl = document.querySelector(`.con-word-note[data-id="${noteId}"]`);
      if (!noteEl) return;
      if (!noteData.emojiStickers) noteData.emojiStickers = [];
      const zoom = window.conGetZoom ? window.conGetZoom() : 1;
      const noteW = Math.round(noteEl.offsetWidth / Math.max(0.5, zoom));
      const sd = { id: _emojiStickerNextId(), emoji, x: noteW - 10, y: -8, size: 32 };
      noteData.emojiStickers.push(sd);
      conNoteBuildSticker(sd, noteData, noteEl);
      if (window._conMirrorSend) {
        window._conMirrorSend({ type: 'sticker-add', target: 'note', noteId, sticker: sd });
      }
    };
    // ─────────────────────────────────────────────────────────────────

    // Right-click on bare constellation board → handled by con-board-ctx-menu (word or note)
    window.conBoardCtxAddNote = function (initialText) {
      if (typeof BoardAudioService !== 'undefined') BoardAudioService.playAction('create_note');
      const x = window._boardCtxNoteX || 60;
      const y = window._boardCtxNoteY || 60;
      const noteText = String(initialText || '').trim();
      conBoardCtxClose();
      conNoteAdd(x, y, noteText);
    };

    // Import text via ta-import-modal and create a note in constellation
    window.conBoardCtxImportText = function () {
      conBoardCtxClose();
      // Store the callback that will be called when import is complete
      window._conImportTextCallback = function (importedText) {
        const x = window._boardCtxNoteX || 60;
        const y = window._boardCtxNoteY || 60;
        window.conCreateTextNote(importedText, x, y, { fontSize: 18, hidden: true });
        // Clear the callback
        window._conImportTextCallback = null;
      };
      // Reuse the standard TA import opener so shortcuts and modal state are initialised.
      taOpenImport();
      const confirmBtn = document.getElementById('ta-imp-confirm-btn');
      if (confirmBtn) confirmBtn.textContent = '📝 Import into Constellation';
    };

    // ── Student Input Note ─────────────────────────────────────────────

    const _noteStudentHub = {
      ws: null, connected: false, noteId: '', classGroup: '', title: '',
      joinUrl: '', constellationNoteId: '', qrAttachmentByNoteId: {}, serverPrimed: false
    };

    function noteStudentSetStatus(text, isError) {
      const el = document.getElementById('note-student-status');
      if (!el) return;
      el.textContent = String(text || '');
      el.style.color = isError ? '#b91c1c' : '#475569';
    }

    function noteStudentMakeId() {
      return 'sn-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    }

    function noteStudentApplyUiState() {
      const connectBtn = document.getElementById('note-student-connect-btn');
      const disconnectBtn = document.getElementById('note-student-disconnect-btn');
      const classSel = document.getElementById('note-student-class');
      const titleInput = document.getElementById('note-student-title');
      const serverInput = document.getElementById('note-student-server');
      if (connectBtn) connectBtn.disabled = _noteStudentHub.connected;
      if (disconnectBtn) disconnectBtn.disabled = !_noteStudentHub.connected;
      if (classSel) classSel.disabled = _noteStudentHub.connected;
      if (titleInput) titleInput.disabled = _noteStudentHub.connected;
      if (serverInput) serverInput.disabled = _noteStudentHub.connected;
    }

    function _noteStudentSetMode(mode, prefillUrl) {
      _noteStudentHub.mode = (mode === 'external') ? 'external' : 'local';
      const isLocal = _noteStudentHub.mode === 'local';
      const localBtn = document.getElementById('note-student-mode-local-btn');
      const extBtn = document.getElementById('note-student-mode-external-btn');
      const serverInput = document.getElementById('note-student-server');
      if (localBtn) { localBtn.style.background = isLocal ? '#2563eb' : '#f1f5f9'; localBtn.style.color = isLocal ? '#fff' : '#334155'; localBtn.style.borderColor = isLocal ? '#2563eb' : '#d1d5db'; }
      if (extBtn) { extBtn.style.background = !isLocal ? '#2563eb' : '#f1f5f9'; extBtn.style.color = !isLocal ? '#fff' : '#334155'; extBtn.style.borderColor = !isLocal ? '#2563eb' : '#d1d5db'; }
      if (serverInput) {
        serverInput.style.display = isLocal ? 'none' : '';
        if (!isLocal && prefillUrl && !String(serverInput.value || '').trim()) serverInput.value = prefillUrl;
      }
      noteStudentUpdateJoinDisplay();
      // Save to remote-config when user clicks (not during init)
      if (prefillUrl === undefined && window.Desktop && typeof Desktop.remoteConfigRead === 'function') {
        Desktop.remoteConfigRead().then(function (r) {
          const cfg = (r && r.ok && r.config) ? Object.assign({}, r.config) : {};
          cfg.noteMode = _noteStudentHub.mode;
          if (!isLocal && serverInput) {
            const val = String(serverInput.value || '').trim();
            const isLocalAddress = !val || /127\.0\.0\.1|localhost/i.test(val);
            if (isLocalAddress && (cfg.noteServerUrl || cfg.serverUrl)) {
              serverInput.value = cfg.noteServerUrl || cfg.serverUrl;
              noteStudentUpdateJoinDisplay();
            }
            cfg.noteServerUrl = String(serverInput.value || '').trim();
          }
          Desktop.remoteConfigSave(cfg).catch(function () { });
        }).catch(function () { Desktop.remoteConfigSave({ noteMode: _noteStudentHub.mode }).catch(function () { }); });
      }
    }

    function noteStudentFillClassOptions() {
      const sel = document.getElementById('note-student-class');
      if (!sel) return;
      sel.innerHTML = '';
      const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
      const legacy = (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS) ? CLASS_GROUPS : {};
      const srcKeys = Object.keys(meta).length ? Object.keys(meta) : Object.keys(legacy);
      const keys = srcKeys
        .filter(key => !(meta[key] && meta[key].archived))
        .sort((a, b) => _cgDisplayName(a).localeCompare(_cgDisplayName(b)));
      if (!keys.length) {
        const opt = document.createElement('option'); opt.value = ''; opt.textContent = 'No classes found'; sel.appendChild(opt); return;
      }
      keys.forEach(key => {
        const opt = document.createElement('option'); opt.value = key; opt.textContent = _cgDisplayName(key); sel.appendChild(opt);
      });
      if (typeof activeClassGroup !== 'undefined' && activeClassGroup && keys.includes(activeClassGroup)) sel.value = activeClassGroup;
    }

    function noteStudentBuildWsUrl(baseInput) {
      let base = String(baseInput || '').trim();
      if (!base || /^file:/i.test(base)) base = 'http://127.0.0.1:8787';
      if (!/^https?:\/\//i.test(base) && !/^wss?:\/\//i.test(base)) base = 'http://' + base;
      if (/^wss?:\/\//i.test(base)) { const clean = base.replace(/\/+$/, ''); return /\/note-ws$/i.test(clean) ? clean : (clean + '/note-ws'); }
      const u = new URL(base); const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return proto + '//' + u.host + '/note-ws';
    }

    function noteStudentClassGroupLabel(classGroup) {
      const classId = String(classGroup || '').trim();
      if (!classId) return '';
      const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
      return (meta[classId] && meta[classId].name) ? String(meta[classId].name) : classId;
    }

    function noteStudentBuildJoinUrl(baseInput, noteId, classGroup) {
      let base = String(baseInput || '').trim();
      if (!base || /^file:/i.test(base)) base = 'http://127.0.0.1:8787';
      if (!/^https?:\/\//i.test(base)) { if (/^wss?:\/\//i.test(base)) base = base.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:'); else base = 'http://' + base; }
      const u = new URL(base); const out = new URL('/student-note-player.html', u.origin);
      out.searchParams.set('note', String(noteId || ''));
      const classLabel = noteStudentClassGroupLabel(classGroup);
      if (classLabel) out.searchParams.set('class', classLabel);
      return out.toString();
    }

    function noteStudentBuildHttpBase(baseInput) {
      let base = String(baseInput || '').trim();
      if (!base || /^file:/i.test(base)) base = 'http://127.0.0.1:8787';
      if (/^wss?:\/\//i.test(base)) base = base.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:');
      else if (!/^https?:\/\//i.test(base)) base = 'http://' + base;
      return new URL(base).origin;
    }

    function noteStudentUpdateJoinDisplay() {
      const serverInput = document.getElementById('note-student-server');
      const joinEl = document.getElementById('note-student-join-url');
      const hostEl = document.getElementById('note-student-host-url');
      const publicEl = document.getElementById('note-student-public-url');
      const qrEl = document.getElementById('note-student-qr');
      let hostBase = '-';
      const isElectron = !!(window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron());
      let inputVal = serverInput ? serverInput.value : '';
      if (_noteStudentHub.mode === 'local' && !isElectron) {
        inputVal = location.origin;
      }
      try { hostBase = noteStudentBuildHttpBase(inputVal); } catch (_) { hostBase = '-'; }
      if (hostEl) hostEl.textContent = hostBase;
      if (publicEl) publicEl.textContent = _noteStudentHub.joinUrl || '-';
      if (joinEl) joinEl.textContent = _noteStudentHub.joinUrl || '-';
      if (!qrEl) return;
      if (!_noteStudentHub.joinUrl) {
        qrEl.style.display = 'none'; qrEl.removeAttribute('src'); qrEl.onclick = null; qrEl.style.cursor = ''; qrEl.title = 'Student note QR'; return;
      }
      qrEl.style.display = 'inline-block';
      qrEl.src = 'https://api.qrserver.com/v1/create-qr-code/?size=128x128&margin=6&data=' + encodeURIComponent(_noteStudentHub.joinUrl);
      qrEl.onclick = noteStudentCopyQrToBoard; qrEl.style.cursor = 'copy'; qrEl.title = 'Click to copy and paste this QR next to the note';
    }

    window.noteStudentRefreshAddressPreview = function () { noteStudentUpdateJoinDisplay(); };

    function noteStudentPopupOpen() {
      if (typeof conBoardCtxClose === 'function') conBoardCtxClose();
      noteStudentFillClassOptions();
      const overlay = document.getElementById('note-student-overlay');
      const titleInput = document.getElementById('note-student-title');
      const serverInput = document.getElementById('note-student-server');
      const roomInput = document.getElementById('note-student-noteid');
      if (titleInput && !String(titleInput.value || '').trim()) titleInput.value = 'Student notes';
      if (!_noteStudentHub.noteId) _noteStudentHub.noteId = noteStudentMakeId();
      if (roomInput) roomInput.value = _noteStudentHub.noteId;
      noteStudentApplyUiState();
      noteStudentUpdateJoinDisplay();
      if (overlay) overlay.style.display = 'flex';

      if (_noteStudentHub.connected) {
        noteStudentSetStatus('Connected and waiting for student submissions.', false);
        return;
      }

      function _noteStartLocal() {
        noteStudentSetStatus('Preparing local server automatically...', false);
        noteStudentPrimeServerAuto().then(function () {
          if (_noteStudentHub.connected) return;
          noteStudentSetStatus('Local server is ready. Click Connect & Open Room.', false);
        }).catch(function () {
          if (_noteStudentHub.connected) return;
          noteStudentSetStatus('Could not auto-start local server. Enter server URL and connect.', true);
        });
      }

      // Read remote-config to set the local/external toggle
      if (window.Desktop && typeof Desktop.remoteConfigRead === 'function') {
        Desktop.remoteConfigRead().then(function (result) {
          const cfg = (result && result.ok && result.config) ? result.config : {};
          const noteMode = cfg.noteMode === 'external' ? 'external' : 'local';
          const noteServerUrl = cfg.noteServerUrl || cfg.serverUrl || '';
          _noteStudentSetMode(noteMode, noteServerUrl);
          // Always apply the saved URL — don't let a stale or default value stick
          if (noteServerUrl && serverInput) serverInput.value = noteServerUrl;
          if (noteMode === 'external' && noteServerUrl) {
            noteStudentSetStatus('External server configured. Click Connect & Open Room.', false);
          } else {
            if (!serverInput || !String(serverInput.value || '').trim()) {
              if (serverInput) serverInput.value = 'http://127.0.0.1:8787';
            }
            _noteStartLocal();
          }
        }).catch(function () { _noteStudentSetMode('local'); _noteStartLocal(); });
      } else {
        _noteStudentSetMode('local');
        _noteStartLocal();
      }
    }

    function noteStudentPopupClose() {
      const overlay = document.getElementById('note-student-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    window.conBoardCtxOpenStudentNote = function () {
      if (typeof conBoardCtxClose === 'function') conBoardCtxClose();
      noteStudentPopupOpen();
    };

    function noteStudentBaseFromServerInfo(serverInfo) {
      if (!serverInfo || typeof serverInfo !== 'object') return '';
      if (serverInfo.playerUrl) return String(serverInfo.playerUrl).replace(/\/quiz-player\.html$/i, '');
      const ip = String(serverInfo.ip || '').trim(); const port = Number(serverInfo.port) || 0;
      if (!ip || !port) return ''; return 'http://' + ip + ':' + port;
    }

    function noteStudentLocalBaseFromServerInfo(serverInfo) {
      const port = Number(serverInfo && serverInfo.port) || 8787;
      return 'http://127.0.0.1:' + port;
    }

    async function noteStudentEnsureServerForElectron() {
      if (!(window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron())) return null;
      if (!(window.Desktop && typeof Desktop.quizServerStart === 'function')) return null;
      if (_noteStudentHub.mode === 'external') return null;
      let res = null;
      try { res = await Desktop.quizServerStart(8787); } catch (_) { res = null; }
      if (!res || res.ok === false) return null;
      const baseUrl = noteStudentBaseFromServerInfo(res);
      const localBaseUrl = noteStudentLocalBaseFromServerInfo(res);
      return Object.assign({}, res, { baseUrl: localBaseUrl || baseUrl || 'http://127.0.0.1:8787', publicBaseUrl: baseUrl || localBaseUrl || 'http://127.0.0.1:8787' });
    }

    async function noteStudentPrimeServerAuto() {
      if (_noteStudentHub.serverPrimed) return null;
      const serverInfo = await noteStudentEnsureServerForElectron();
      _noteStudentHub.serverPrimed = !!serverInfo;
      const serverInput = document.getElementById('note-student-server');
      if (serverInfo && serverInput) {
        const localBase = String(serverInfo.baseUrl || noteStudentLocalBaseFromServerInfo(serverInfo) || '').trim();
        if (localBase) serverInput.value = localBase;
      }
      return serverInfo;
    }

    function noteStudentNormalizeStudentKey(name) { return String(name || '').trim().toLowerCase(); }

    function noteStudentBuildInitialConstellationText() {
      const lines = [];
      const classDisplay = _noteStudentHub.classGroup ? (noteStudentClassGroupLabel(_noteStudentHub.classGroup) || _noteStudentHub.classGroup) : '';
      const title = (_noteStudentHub.title || 'Student notes') + (classDisplay ? (' (' + classDisplay + ')') : '');
      lines.push(title);
      if (_noteStudentHub.joinUrl) lines.push('Join: ' + _noteStudentHub.joinUrl);
      lines.push('');
      const _bMeta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
      const _bLegacy = (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS) ? CLASS_GROUPS : {};
      const _bGroup = _noteStudentHub.classGroup;
      let classList = [];
      if (_bGroup) {
        const _bm = _bMeta[_bGroup];
        if (_bm && Array.isArray(_bm.students) && _bm.students.length) {
          const _bRoster = (typeof STUDENTS_ROSTER !== 'undefined' && Array.isArray(STUDENTS_ROSTER))
            ? Object.fromEntries(STUDENTS_ROSTER.filter(s => s && s.uuid).map(s => [s.uuid, s])) : {};
          if (typeof _bm.students[0] === 'string' && _bm.students[0].startsWith('st-')) {
            classList = _bm.students.map(sid => {
              const s = _bRoster[sid];
              return s ? ((s.firstName || '') + ' ' + (s.lastName || '')).trim().toUpperCase() : null;
            }).filter(Boolean);
          } else {
            classList = _bm.students.map(String).filter(Boolean);
          }
        } else if (Array.isArray(_bLegacy[_bGroup])) {
          classList = _bLegacy[_bGroup].map(String).filter(Boolean);
        }
      }
      classList.map(name => String(name || '').trim()).filter(Boolean).forEach(name => lines.push(name + ': '));
      return lines.join('\n').trim();
    }

    function noteStudentSetInputClass(noteData, enabled) {
      if (!noteData || !noteData.id) return;
      noteData.studentInput = !!enabled;
      const noteEl = document.querySelector(`.con-word-note[data-id="${noteData.id}"]`);
      if (noteEl) noteEl.classList.toggle('student-input', !!enabled);
    }

    function noteStudentEnsureConstellationNote() {
      let noteData = null;
      if (_noteStudentHub.constellationNoteId && typeof conGetNotes === 'function') {
        noteData = conGetNotes().find(n => n.id === _noteStudentHub.constellationNoteId) || null;
      }
      if (noteData) { noteStudentSetInputClass(noteData, true); return noteData; }
      const x = Number(window._boardCtxNoteX) || 60; const y = Number(window._boardCtxNoteY) || 60;
      if (typeof conCreateTextNote !== 'function') return null;
      noteData = conCreateTextNote(noteStudentBuildInitialConstellationText(), x, y, { fontSize: 24 });
      if (!noteData) return null;
      _noteStudentHub.constellationNoteId = noteData.id;
      noteStudentSetInputClass(noteData, true);
      return noteData;
    }

    function noteStudentApplyConstellationText(noteData, text) {
      if (!noteData) return;
      const clean = String(text || '');
      noteData.text = clean; noteData.html = '';
      const editor = document.querySelector(`.con-word-note[data-id="${noteData.id}"] .wn-note-editor`);
      if (editor) {
        editor.innerHTML = wnRenderMathHtml(boardEscapeHtml(clean).replace(/\n/g, '<br>'));
        noteData.html = editor.innerHTML;
        if (typeof conNoteAutosize === 'function') conNoteAutosize(editor, noteData);
      }
    }

    function noteStudentStopInputForNote(noteData) {
      if (!noteData || !noteData.id) return;
      noteStudentSetInputClass(noteData, true);
      if (String(_noteStudentHub.constellationNoteId || '') === String(noteData.id)) {
        noteStudentDisconnect({ quiet: true });
        _noteStudentHub.joinUrl = '';
        noteStudentUpdateJoinDisplay();
        noteStudentSetStatus('Student input stopped for this note.', false);
      }
    }

    function noteStudentAddSubmission(payload) {
      const name = String((payload && payload.studentName) || 'Student').trim() || 'Student';
      const text = String((payload && payload.text) || '').trim();
      if (!text) return;
      const noteData = noteStudentEnsureConstellationNote();
      if (!noteData) return;
      const currentText = String(noteData.text || '').replace(/\r/g, '');
      const lines = currentText ? currentText.split('\n') : [];
      const lowerName = noteStudentNormalizeStudentKey(name);
      let lineIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const ln = String(lines[i] || ''); const colon = ln.indexOf(':'); if (colon < 0) continue;
        const candidate = noteStudentNormalizeStudentKey(ln.slice(0, colon));
        if (candidate === lowerName) { lineIndex = i; break; }
      }
      if (lineIndex < 0) {
        lines.push(name + ': ' + text);
      } else {
        const existing = String(lines[lineIndex] || '');
        const head = existing.split(':')[0] + ': ';
        const tail = existing.slice(existing.indexOf(':') + 1).trim();
        lines[lineIndex] = head + (tail ? (tail + ' | ' + text) : text);
      }
      noteStudentApplyConstellationText(noteData, lines.join('\n'));
    }

    function noteStudentHandleMessage(msg) {
      if (!msg || typeof msg.type !== 'string') return;
      if (msg.type === 'welcome') {
        noteStudentSetStatus('Connected as host. Opening room...', false);
      } else if (msg.type === 'note_host_opened') {
        const payload = msg.payload || {};
        _noteStudentHub.noteId = String(payload.noteId || _noteStudentHub.noteId || '');
        _noteStudentHub.classGroup = String(payload.classGroup || _noteStudentHub.classGroup || '');
        _noteStudentHub.title = String(payload.title || _noteStudentHub.title || 'Student notes');
        const roomInput = document.getElementById('note-student-noteid');
        if (roomInput) roomInput.value = _noteStudentHub.noteId;
        const noteData = noteStudentEnsureConstellationNote();
        if (noteData) {
          const lines = String(noteData.text || '').replace(/\r/g, '').split('\n');
          const classDisplay = _noteStudentHub.classGroup ? (noteStudentClassGroupLabel(_noteStudentHub.classGroup) || _noteStudentHub.classGroup) : '';
          if (lines.length > 0) lines[0] = (_noteStudentHub.title || 'Student notes') + (classDisplay ? (' (' + classDisplay + ')') : '');
          if (lines.length > 1 && lines[1].startsWith('Join: ')) lines[1] = 'Join: ' + (_noteStudentHub.joinUrl || '');
          noteStudentApplyConstellationText(noteData, lines.join('\n'));
        }
        noteStudentSetStatus('Room open in Constellation. Students can submit now.', false);
      } else if (msg.type === 'note_submission') {
        noteStudentAddSubmission(msg.payload || {});
        noteStudentSetStatus('New submission received.', false);
      } else if (msg.type === 'error') {
        noteStudentSetStatus(String(msg.message || 'Server error'), true);
      }
    }

    function noteStudentDisconnect(options) {
      const quiet = !!(options && options.quiet);
      if (_noteStudentHub.ws) { try { _noteStudentHub.ws.close(); } catch (_) { } }
      _noteStudentHub.ws = null; _noteStudentHub.connected = false;
      noteStudentApplyUiState();
      if (!quiet) noteStudentSetStatus('Disconnected.', true);
      if (window.Desktop && typeof Desktop.quizServerStop === 'function') {
        Desktop.quizServerStop().catch(() => { });
      }
    }

    async function noteStudentConnect() {
      const classSel = document.getElementById('note-student-class');
      const titleInput = document.getElementById('note-student-title');
      const serverInput = document.getElementById('note-student-server');
      const roomInput = document.getElementById('note-student-noteid');
      if (!classSel || !titleInput || !serverInput || !roomInput) return;
      const classGroup = String(classSel.value || '').trim();
      const title = String(titleInput.value || '').trim() || 'Student notes';
      if (!classGroup) { noteStudentSetStatus('Select a class group first.', true); return; }
      noteStudentSetStatus('Preparing server...', false);
      const isElectron = !!(window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron());
      const electronServer = await noteStudentEnsureServerForElectron();
      if (electronServer) {
        const base = String(electronServer.baseUrl || noteStudentLocalBaseFromServerInfo(electronServer) || '').trim();
        if (base) serverInput.value = base;
      } else if (isElectron && _noteStudentHub.mode !== 'external') { noteStudentSetStatus('Could not start local note server. Please retry.', true); return; }
      let base = String(serverInput.value || '').trim();
      if (_noteStudentHub.mode === 'local' && !isElectron) {
        base = location.origin;
      }
      let wsUrl = '';
      try { wsUrl = noteStudentBuildWsUrl(base); } catch (_) { noteStudentSetStatus('Invalid server URL.', true); return; }
      if (_noteStudentHub.mode === 'external' && window.Desktop && typeof Desktop.remoteConfigRead === 'function') {
        try {
          const r = await Desktop.remoteConfigRead();
          const cfg = (r && r.ok && r.config) ? Object.assign({}, r.config) : {};
          const typedUrl = String(serverInput.value || '').trim();
          const savedUrl = String(cfg.noteServerUrl || cfg.serverUrl || '').trim();
          if (typedUrl && typedUrl !== savedUrl) {
            const msg = 'Do you want to save this new server URL for future connections?';
            const shouldSave = (typeof showConfirm === 'function') ? await showConfirm(msg) : confirm(msg);
            if (shouldSave) {
              cfg.noteMode = 'external';
              cfg.noteServerUrl = typedUrl;
              await Desktop.remoteConfigSave(cfg);
            }
          }
        } catch (_) { }
      }
      if (!_noteStudentHub.noteId) _noteStudentHub.noteId = noteStudentMakeId();
      if (!_noteStudentHub.hostSecret) {
        _noteStudentHub.hostSecret = 'nhs-' + Math.random().toString(36).slice(2, 10);
      }
      _noteStudentHub.classGroup = classGroup; _noteStudentHub.title = title;
      const joinBase = (electronServer && electronServer.publicBaseUrl) ? electronServer.publicBaseUrl : (_noteStudentHub.mode === 'local' ? location.origin : serverInput.value);
      _noteStudentHub.joinUrl = noteStudentBuildJoinUrl(joinBase, _noteStudentHub.noteId, classGroup);
      roomInput.value = _noteStudentHub.noteId;
      noteStudentUpdateJoinDisplay();
      noteStudentDisconnect({ quiet: true });
      let ws;
      try { ws = new WebSocket(wsUrl); } catch (_) { noteStudentSetStatus('Could not open websocket.', true); return; }
      _noteStudentHub.ws = ws;
      ws.onopen = function () {
        _noteStudentHub.connected = true; noteStudentApplyUiState(); noteStudentSetStatus('Connected. Opening room...', false);
        ws.send(JSON.stringify({ type: 'hello', role: 'note-host', name: 'Teacher' }));
        const _nhRoster = (function () {
          const _m = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
          const _l = (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS) ? CLASS_GROUPS : {};
          const _g = classGroup;
          if (!_g) return [];
          const _gm = _m[_g];
          if (_gm && Array.isArray(_gm.students) && _gm.students.length) {
            const _ros = (typeof STUDENTS_ROSTER !== 'undefined' && Array.isArray(STUDENTS_ROSTER))
              ? Object.fromEntries(STUDENTS_ROSTER.filter(s => s && s.uuid).map(s => [s.uuid, s])) : {};
            if (typeof _gm.students[0] === 'string' && _gm.students[0].startsWith('st-')) {
              return _gm.students.map(sid => { const s = _ros[sid]; return s ? ((s.firstName || '') + ' ' + (s.lastName || '')).trim().toUpperCase() : null; }).filter(Boolean);
            }
            return _gm.students.map(String).filter(Boolean);
          }
          return Array.isArray(_l[_g]) ? _l[_g].map(String).filter(Boolean) : [];
        })();
        ws.send(JSON.stringify({ type: 'note_host_open', payload: { noteId: _noteStudentHub.noteId, classGroup: classGroup, classLabel: noteStudentClassGroupLabel(classGroup), title: _noteStudentHub.title, roster: _nhRoster, hostSecret: _noteStudentHub.hostSecret } }));
      };
      ws.onmessage = function (event) { let msg = null; try { msg = JSON.parse(event.data); } catch (_) { return; } noteStudentHandleMessage(msg); };
      ws.onerror = function () { noteStudentSetStatus('Websocket error.', true); };
      ws.onclose = function () {
        const hadConnection = !!_noteStudentHub.connected;
        _noteStudentHub.connected = false; _noteStudentHub.ws = null; noteStudentApplyUiState();
        noteStudentSetStatus(hadConnection ? 'Connection closed.' : 'Connection closed before opening room. Check server URL/port and retry.', true);
      };
    }

    function noteStudentCopyJoinUrl() {
      const url = String(_noteStudentHub.joinUrl || '').trim();
      if (!url) { noteStudentSetStatus('No join URL yet. Connect first.', true); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => noteStudentSetStatus('Join URL copied to clipboard.', false)).catch(() => noteStudentSetStatus('Could not copy URL.', true));
        return;
      }
      noteStudentSetStatus('Clipboard API unavailable in this browser.', true);
    }

    async function noteStudentCopyQrToBoard() {
      const qrEl = document.getElementById('note-student-qr');
      if (!qrEl || !qrEl.src || qrEl.style.display === 'none') { noteStudentSetStatus('QR code is not ready yet.', true); return; }
      let copied = false;
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          const qrBlobForClipboard = await fetch(qrEl.src).then(r => r.blob());
          await navigator.clipboard.write([new ClipboardItem({ [qrBlobForClipboard.type || 'image/png']: qrBlobForClipboard })]);
          copied = true;
        }
      } catch (_) { }
      let qrBlob; try { qrBlob = await fetch(qrEl.src).then(r => r.blob()); } catch (_) { noteStudentSetStatus('Could not fetch QR image.', true); return; }
      if (!qrBlob) { noteStudentSetStatus('Could not create QR image.', true); return; }
      const noteData = noteStudentEnsureConstellationNote();
      const noteIdKey = noteData && noteData.id ? String(noteData.id) : '';
      if (noteIdKey) {
        const prevAttachmentId = String((_noteStudentHub.qrAttachmentByNoteId && _noteStudentHub.qrAttachmentByNoteId[noteIdKey]) || '').trim();
        if (prevAttachmentId && typeof conRemoveAttachmentFromCurrentPage === 'function') conRemoveAttachmentFromCurrentPage(prevAttachmentId, { silent: true });
      }
      const pngFile = new File([qrBlob], 'student-note-qr.png', { type: 'image/png' });
      if (!Number.isFinite(_conAttachmentCounter)) _conAttachmentCounter = 0;
      _conAttachmentCounter += 1;
      const attachmentId = 'att_' + _conAttachmentCounter;
      conAttachments.push({ id: attachmentId, name: pngFile.name, mime: 'image/png', kind: 'pics', size: pngFile.size, file: pngFile, relativePath: '' });
      if (typeof conRenderAttachmentSummary === 'function') conRenderAttachmentSummary();
      if (noteIdKey) {
        if (!_noteStudentHub.qrAttachmentByNoteId || typeof _noteStudentHub.qrAttachmentByNoteId !== 'object') _noteStudentHub.qrAttachmentByNoteId = {};
        _noteStudentHub.qrAttachmentByNoteId[noteIdKey] = attachmentId;
      }
      const pos = {};
      if (noteData) { const noteX = Number(noteData.x) || 60; const noteY = Number(noteData.y) || 60; const noteW = Math.max(120, Number(noteData.width) || 220); pos.x = noteX + noteW + 18; pos.y = noteY; }
      if (typeof window.conInsertAttachmentById === 'function') await window.conInsertAttachmentById(attachmentId, Object.assign({ silent: true }, pos));
      noteStudentSetStatus(copied ? 'QR copied and pasted next to the note.' : 'QR pasted next to the note.', false);
    }

    // ── End Student Input Note ─────────────────────────────────────────

    window.conCreateTextNote = function (text, x, y, opts) {
      const noteText = String(text || '').trim();
      if (!noteText) return null;
      const nid = conGetNextNoteId();
      const noteData = {
        id: nid, nodeId: null, text: noteText, x: Number(x) || 60, y: Number(y) || 60,
        color: '#111111', bg: '#ffffff', fontSize: (opts && Number(opts.fontSize)) || 24,
        bold: false, italic: false, underline: false, strike: false,
        hidden: !!(opts && opts.hidden), locked: false, manualSize: false, width: null, height: null
      };
      conNotes.push(noteData);
      conNoteBuild(noteData);
      return noteData;
    };


  Board.notes = Board.notes || {};

  // Backward compatibility exports for HTML attributes & cross-module calls
  window.wnStyleEditNote = global.wnStyleEditNote = wnStyleEditNote;
  window.wnStyleBlink = global.wnStyleBlink = wnStyleBlink;
  window.wnStyleDeleteNote = global.wnStyleDeleteNote = wnStyleDeleteNote;
  window.wnStyleStopStudentInput = global.wnStyleStopStudentInput = wnStyleStopStudentInput;
  window.wnStyleOpenStudentInput = global.wnStyleOpenStudentInput = wnStyleOpenStudentInput;
  window.wnStyleDuplicateNote = global.wnStyleDuplicateNote = wnStyleDuplicateNote;
  window.wnpOpen = global.wnpOpen = wnpOpen;
  window.wnpClose = global.wnpClose = wnpClose;
  window.wnpSave = global.wnpSave = wnpSave;
  window.wnStyleSplitNote = global.wnStyleSplitNote = wnStyleSplitNote;
  window.wnStyleToggleLock = global.wnStyleToggleLock = wnStyleToggleLock;
  window.wnStyleToggleHide = global.wnStyleToggleHide = wnStyleToggleHide;
  window.wnStyleFitText = global.wnStyleFitText = wnStyleFitText;
  window.wnInsertList = global.wnInsertList = wnInsertList;
  window.wnInsertCheckboxList = global.wnInsertCheckboxList = wnInsertCheckboxList;
  window.wnOutdentList = global.wnOutdentList = wnOutdentList;
  window.wnIndentList = global.wnIndentList = wnIndentList;
  window.wnStyleToggle = global.wnStyleToggle = wnStyleToggle;
  window.wnStyleSetAlign = global.wnStyleSetAlign = wnStyleSetAlign;
  window.wnStyleToggleCaseDropdown = global.wnStyleToggleCaseDropdown = wnStyleToggleCaseDropdown;
  window.wnStyleSetCasing = global.wnStyleSetCasing = wnStyleSetCasing;
  window.wnStyleSetSize = global.wnStyleSetSize = wnStyleSetSize;
  window.wnStyleSetBorderWidth = global.wnStyleSetBorderWidth = wnStyleSetBorderWidth;
  window.wnStyleSetBorderStyle = global.wnStyleSetBorderStyle = wnStyleSetBorderStyle;
  window.wnStyleSetBorderColor = global.wnStyleSetBorderColor = wnStyleSetBorderColor;
  window.wnStyleClearSelectedFormat = global.wnStyleClearSelectedFormat = wnStyleClearSelectedFormat;
  window.wnStyleClose = global.wnStyleClose = wnStyleClose;
  window.wnStyleDismiss = global.wnStyleDismiss = wnStyleDismiss;
  window.wnLinkOpen = global.wnLinkOpen = wnLinkOpen;
  window.wnLinkApply = global.wnLinkApply = wnLinkApply;
  window.wnLinkRemove = global.wnLinkRemove = wnLinkRemove;
  window.wnLinkClose = global.wnLinkClose = wnLinkClose;
  window.wnLinkDialogOverlayClick = global.wnLinkDialogOverlayClick = wnLinkDialogOverlayClick;
  window.wnLinkKeydown = global.wnLinkKeydown = wnLinkKeydown;
  window._noteStudentSetMode = global._noteStudentSetMode = _noteStudentSetMode;
  window.noteStudentPopupClose = global.noteStudentPopupClose = noteStudentPopupClose;
  window.noteStudentDisconnect = global.noteStudentDisconnect = noteStudentDisconnect;
  window.noteStudentConnect = global.noteStudentConnect = noteStudentConnect;
  window.noteStudentCopyJoinUrl = global.noteStudentCopyJoinUrl = noteStudentCopyJoinUrl;

  window._wnActiveNote = global._wnActiveNote = _wnActiveNote;
  window.wnGetNoteElementById = global.wnGetNoteElementById = wnGetNoteElementById;
  window.conNoteBuild = global.conNoteBuild = conNoteBuild;
  window.wnDeleteNoteData = global.wnDeleteNoteData = wnDeleteNoteData;
  window.wnPasteAsConTable = global.wnPasteAsConTable = wnPasteAsConTable;
  window.conNoteBuildSticker = global.conNoteBuildSticker = conNoteBuildSticker;
  window.wnSyncNoteDataFromEditor = global.wnSyncNoteDataFromEditor = wnSyncNoteDataFromEditor;
  window._conNoteCtxData = global._conNoteCtxData = _conNoteCtxData;
  window.wnApplyHiddenState = global.wnApplyHiddenState = wnApplyHiddenState;
  window.conNoteAutosize = global.conNoteAutosize = conNoteAutosize;
  window.conNoteRebuildAllStickers = global.conNoteRebuildAllStickers = conNoteRebuildAllStickers;
  window.wnRememberSelection = global.wnRememberSelection = wnRememberSelection;
  window.wnRestoreSelection = global.wnRestoreSelection = wnRestoreSelection;
  window.wnCreateNote = global.wnCreateNote = function(text, x, y) { if (typeof conCtxAddNote === 'function') return conCtxAddNote(text, x, y); };
  window.noteCtxSetColor = global.noteCtxSetColor = function(c) {
    if (typeof wnApplySelectionCommand === 'function' && wnApplySelectionCommand('foreColor', c)) {
      if (typeof wnStyleRefresh === 'function') wnStyleRefresh();
      return;
    }
    if (_conNoteCtxData) {
      _conNoteCtxData.color = c;
      if (_conNoteCtxData._applyStyle) _conNoteCtxData._applyStyle();
      if (typeof wnStyleRefresh === 'function') wnStyleRefresh();
    }
  };

  try {
    Object.defineProperty(window, 'conNoteNextId', {
      get: function() { return conNoteNextId; },
      set: function(v) { conNoteNextId = v; },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    window.conNoteNextId = conNoteNextId;
  }

})(typeof window !== "undefined" ? window : this);