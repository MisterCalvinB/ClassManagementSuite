/**
 * Class Management Tools — Board Nodes, Edges & Canvas Layout Engine
 * Word nodes, connectors, arrow edges, timer nodes, media nodes, alignment, auto-spread, and styling.
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
  var AW_STORAGE_KEY = global.AW_STORAGE_KEY || 'custom_words';
  var AW_QUOTES_KEY = global.AW_QUOTES_KEY || 'custom_quotes';
  var AW_GAP_KEY = global.AW_GAP_KEY || 'custom_gap_fill';
  var AW_ERROR_KEY = global.AW_ERROR_KEY || 'custom_errors';
  var BOARD_SAVED_SESSIONS_KEY = global.BOARD_SAVED_SESSIONS_KEY || 'board_saved_sessions_v1';
  // Active session folder and file names are bound globally in board-state.js
  var conDrawings = global.conDrawings = global.conDrawings || [];
  var conShapes = global.conShapes = global.conShapes || [];
  var conTables = global.conTables = global.conTables || [];
  var conNotes = global.conNotes = global.conNotes || [];
  var conGroups = global.conGroups = global.conGroups || [];
  var conMasks = global.conMasks = global.conMasks || [];

  var getItemThemes = global.getItemThemes = window.getItemThemes = window.getItemThemes || function(item) {
    if (!item || !item.word) return [];
    var t = item.theme;
    if (!t) return [];
    return Array.isArray(t) ? t : String(t).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  };
  var getThemeIndex = global.getThemeIndex = window.getThemeIndex = window.getThemeIndex || function() { return {}; };
  var invalidateThemeIndex = global.invalidateThemeIndex = window.invalidateThemeIndex = window.invalidateThemeIndex || function() {};

    (function () {
      async function conToggleNodeStarDirect(nodeObj) {
        if (typeof vocabBank === 'undefined') return;
        const dbEntry = nodeObj.dbWord
          ? vocabBank.find(w => w.word === nodeObj.dbWord)
          : vocabBank.find(w => stripParens(w.word).toLowerCase() === stripParens(nodeObj.baseWord || '').toLowerCase());
        if (!dbEntry) return;
        dbEntry.starred = !dbEntry.starred;
        // Sync all nodes referencing the same entry
        conNodes.forEach(n => {
          if ((n.dbWord && n.dbWord === dbEntry.word) ||
            (!n.dbWord && stripParens((n.baseWord || '').toLowerCase()) === stripParens(dbEntry.word.toLowerCase()))) {
            conSyncNodeStarState(n);
          }
        });
        // Sync context menu star btn if open on this node
        const ctxStarBtn = document.getElementById('con-ctx-star-btn');
        if (ctxStarBtn && ctxStarBtn.style.display !== 'none' && conCtxNodeId === nodeObj.id) {
          ctxStarBtn.textContent = dbEntry.starred ? '★' : '☆';
          ctxStarBtn.classList.toggle('active', !!dbEntry.starred);
          ctxStarBtn.title = dbEntry.starred ? 'Unstar' : 'Star in DB';
        }
        await conSaveVocabBankFile(dbEntry.word.toLowerCase());
      }

      window.conCtxToggleStar = async function () {
        const node = conNodes.find(n => n.id === conCtxNodeId);
        if (!node) return;
        await conToggleNodeStarDirect(node);
      };

      async function conSaveVocabBankFile(wordKey) {
        if (!window.Desktop || !Desktop.isElectron() || !wordKey) return;
        try {
          const result = await Desktop.listByPath('customWordbanks', '', { extensions: ['.js'] });
          if (!result || !result.ok || !result.files) return;
          for (const file of result.files) {
            await _conUpdateStarredInFile(file, wordKey);
          }
        } catch (e) { }
      }

      async function _conUpdateStarredInFile(file, wordKey) {
        const content = await Desktop.readByPath('customWordbanks', file.relativePath || file.filename);
        if (!content || !content.ok || !content.content) return;
        const varMatch = content.content.match(/\b(?:const|let|var)\s+(\w+)\s*=\s*\[/);
        if (!varMatch) return;
        const exportVar = varMatch[1];
        let records = null;
        const s = content.content.indexOf('['), e2 = content.content.lastIndexOf(']');
        if (s !== -1 && e2 > s) {
          try { records = JSON.parse(content.content.slice(s, e2 + 1)); } catch (_) {}
        }
        if (!records) {
          try {
            const fn = new Function(content.content + `\n; try { return ${exportVar}; } catch(e) { return []; }`);
            records = fn();
          } catch (e) { return; }
        }
        if (!Array.isArray(records)) return;
        const idx = records.findIndex(w => w && w.word && w.word.toLowerCase() === wordKey);
        if (idx === -1) return;
        const vbEntry = (typeof vocabBank !== 'undefined') ? vocabBank.find(w => w.word && w.word.toLowerCase() === wordKey) : null;
        const starred = vbEntry ? !!vbEntry.starred : false;
        const cur = records[idx];
        if (!!cur.starred === starred) return;
        const updated = { ...cur };
        if (starred) { updated.starred = true; } else { delete updated.starred; }
        records[idx] = updated;
        const newContent = `// ${file.filename}\nconst ${exportVar} = ${JSON.stringify(records, null, 2)};\n`;
        try { await Desktop.saveText('customWordbanks', file.filename, newContent); } catch (e) { }
      }

      window.conRevealAll = function () {
        if (typeof BoardAudioService !== 'undefined') BoardAudioService.playAction('reveal_all');
        const revealed = [];
        conNodes.forEach(node => {
          if (node.masked) {
            node.masked = false;
            node.el.classList.remove('con-masked');
            revealed.push(node);
          }
        });
        if (typeof conRedrawEdges === 'function') conRedrawEdges();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'node-masks', masks: conNodes.map(n => ({ id: String(n.id), masked: false })) });
        }
        revealed.forEach(node => {
          if (node && node.el) conPlayRevealAnimation('node', node, node.el);
        });
      };

      window.conMaskAll = function () {
        if (typeof BoardAudioService !== 'undefined') BoardAudioService.playAction('mask_all');
        conNodes.forEach(node => {
          if (!node.masked) {
            node.masked = true;
            node.el.classList.add('con-masked');
          }
        });
        if (typeof conRedrawEdges === 'function') conRedrawEdges();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'node-masks', masks: conNodes.map(n => ({ id: String(n.id), masked: true })) });
        }
      };

      window.conToggleMaskAll = function () {
        if (!conNodes.length) return;
        const hasVisible = conNodes.some(node => !node.masked);
        if (hasVisible) conMaskAll();
        else conRevealAll();
      };

      // Mask / reveal for selected nodes
      window.conMaskSelected = function () {
        const selectedNodes = (conMultiSelected && conMultiSelected.size > 0)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conSelected ? [conNodes.find(n => n.id === conSelected)].filter(Boolean) : []);
        if (selectedNodes.length === 0) return;
        conPushUndo();
        selectedNodes.forEach(node => {
          if (!node.masked) {
            node.masked = true;
            if (node.el) node.el.classList.add('con-masked');
          }
        });
        if (typeof conRedrawEdges === 'function') conRedrawEdges();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'node-masks', masks: selectedNodes.map(n => ({ id: String(n.id), masked: true })) });
        }
      };

      window.conRevealSelected = function () {
        const selectedNodes = (conMultiSelected && conMultiSelected.size > 0)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conSelected ? [conNodes.find(n => n.id === conSelected)].filter(Boolean) : []);
        if (selectedNodes.length === 0) return;
        conPushUndo();
        const revealed = [];
        selectedNodes.forEach(node => {
          if (node.masked) {
            node.masked = false;
            if (node.el) node.el.classList.remove('con-masked');
            revealed.push(node);
          }
        });
        if (typeof conRedrawEdges === 'function') conRedrawEdges();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'node-masks', masks: selectedNodes.map(n => ({ id: String(n.id), masked: false })) });
        }
        revealed.forEach(node => {
          if (node && node.el) conPlayRevealAnimation('node', node, node.el);
        });
      };

      window.conToggleAllIpa = function () {
        const anyOn = conNodes.some(n => conGetNodeFmt(n).showIpa);
        conNodes.forEach(node => {
          const fmt = conGetNodeFmt(node);
          const baseWord = node.baseWord || node.el.dataset.baseWord || node.el.textContent.trim();
          const dbEntries = conLookupDbEntries(baseWord, node.dbWord);
          if (!dbEntries.some(e => !!e.ipa)) return;
          fmt.showIpa = !anyOn;
          conRenderNodeLabel(node);
        });
        conRedrawEdges();
        const btn = document.getElementById('con-toggle-ipa-btn');
        if (btn) btn.classList.toggle('active', !anyOn);
      };

      window.conToggleAllFrench = function () {
        const anyOn = conNodes.some(n => conGetNodeFmt(n).showTrans);
        conNodes.forEach(node => {
          const fmt = conGetNodeFmt(node);
          const baseWord = node.baseWord || node.el.dataset.baseWord || node.el.textContent.trim();
          const dbEntries = conLookupDbEntries(baseWord, node.dbWord);
          if (!dbEntries.some(e => !!(e.french || e.translation))) return;
          fmt.showTrans = !anyOn;
          conRenderNodeLabel(node);
        });
        conRedrawEdges();
        const btn = document.getElementById('con-toggle-french-btn');
        if (btn) btn.classList.toggle('active', !anyOn);
      };

      window.conCtxRemove = function () {
        if (!conCtxNodeId) return;
        const id = conCtxNodeId;
        conCtxClose();
        conRemoveNode(id);
      };

      window.conCtxDuplicate = function () {
        if (!conCtxNodeId) return;
        const id = conCtxNodeId;
        conPushUndo();
        conCtxClose();
        conDuplicateNodeById(id, 46, 34);
        conRedrawEdges();
      };

      function boardPositionSplitDropdown(btn, dd) {
        if (!btn || !dd) return;
        dd.style.display = 'flex';
        dd.style.position = 'fixed';
        dd.style.zIndex = '10005';
        dd.style.top = '';
        dd.style.bottom = '';
        dd.style.left = '';
        dd.style.right = '';

        const btnRect = btn.getBoundingClientRect();
        const ddHeight = dd.offsetHeight || 160;
        const ddWidth = dd.offsetWidth || 185;

        let left = btnRect.left;
        if (left + ddWidth > window.innerWidth - 8) {
          left = btnRect.right - ddWidth;
        }
        if (left + ddWidth > window.innerWidth - 8) {
          left = window.innerWidth - ddWidth - 8;
        }
        if (left < 8) left = 8;
        dd.style.left = Math.round(left) + 'px';

        const spaceBelow = window.innerHeight - btnRect.bottom;
        const spaceAbove = btnRect.top;

        if (btn.id === 'con-ctx-split-btn') {
          // Simply appear below the button without scrolling the context menu
          let top = btnRect.bottom + 4;
          if (top + ddHeight > window.innerHeight - 8) {
            top = Math.max(8, window.innerHeight - ddHeight - 8);
          }
          dd.style.top = Math.round(top) + 'px';
        } else {
          // For other dropdowns (e.g. note convert modal)
          if (spaceBelow < ddHeight + 8 && spaceAbove > spaceBelow) {
            let top = btnRect.top - ddHeight - 4;
            if (top < 8) top = 8;
            dd.style.top = Math.round(top) + 'px';
          } else {
            let top = btnRect.bottom + 4;
            if (top + ddHeight > window.innerHeight - 8) {
              top = Math.max(8, window.innerHeight - ddHeight - 8);
            }
            dd.style.top = Math.round(top) + 'px';
          }
        }
      }
      window.boardPositionSplitDropdown = boardPositionSplitDropdown;

      window.conCtxToggleSplitDropdown = function (event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        const dd = document.getElementById('con-ctx-split-dropdown');
        const btn = document.getElementById('con-ctx-split-btn');
        if (!dd) return;
        const isVisible = dd.style.display !== 'none';
        if (isVisible) {
          dd.style.display = 'none';
        } else {
          const caseDd = document.getElementById('con-ctx-case-dropdown');
          if (caseDd) caseDd.style.display = 'none';
          const noteDd = document.getElementById('con-note-convert-modal');
          if (noteDd) noteDd.style.display = 'none';

          const isMulti = conMultiSelected && conMultiSelected.size > 1 && (!conCtxNodeId || conMultiSelected.has(conCtxNodeId));
          const singleGrp = document.getElementById('con-ctx-split-single-group');
          const multiGrp = document.getElementById('con-ctx-split-multi-group');
          if (singleGrp && multiGrp) {
            if (isMulti) {
              singleGrp.style.display = 'none';
              multiGrp.style.display = 'flex';
              const multiTitle = document.getElementById('con-ctx-split-multi-title');
              if (multiTitle) {
                const count = conMultiSelected.size;
                const template = (typeof i18n !== 'undefined' && i18n.t('conSplitAllSelected')) || 'All selected ({0})';
                multiTitle.textContent = template.replace('{0}', count);
              }
            } else {
              singleGrp.style.display = 'flex';
              multiGrp.style.display = 'none';
            }
          }
          boardPositionSplitDropdown(btn, dd);
        }
      };

      function conSplitSingleNode(node, mode) {
        if (!node) return false;
        const text = node.baseWord || (node.el ? node.el.textContent.trim() : '');
        let parts = [];
        if (mode === 'letter') {
          const noSpace = text.replace(/\s+/g, '');
          parts = Array.from(noSpace);
        } else {
          parts = text.trim().split(/\s+/).filter(Boolean);
        }
        if (parts.length < 2) return false;

        const ox = node.x, oy = node.y;
        const centerX = ox + (node.el.offsetWidth || 0) / 2;
        const gap = 4;
        const newIds = [];
        const lastIdx = parts.length - 1;

        parts.forEach((itemText, i) => {
          const wordPageNum = (i === lastIdx) ? (node.pageNum != null ? node.pageNum : null) : null;
          const newId = conAddWordAt(itemText, ox, oy, wordPageNum);
          const newNode = conNodes.find(n => n.id === newId);
          if (newNode) {
            if (node.fmt) newNode.fmt = Object.assign({}, node.fmt);
            ['background', 'color', 'fontFamily'].forEach(k => {
              if (node.el.style[k]) newNode.el.style[k] = node.el.style[k];
            });
            const srcBaseSize = conGetNodeBaseFontSize(node);
            if (srcBaseSize) conSetNodeBaseFontSize(newNode, srcBaseSize);
            newNode.borderWidth = node.borderWidth || null;
            newNode.borderStyle = node.borderStyle || null;
            newNode.highlight = node.highlight || null;
            newNode.preset = node.preset || null;
            newNode.fontFamily = node.fontFamily || null;
            newNode.textStrokeColor = node.textStrokeColor || null;
            newNode.textStrokeWidth = node.textStrokeWidth || null;
            newNode.anim = node.anim || '';
          newNode.revealAnim = node.revealAnim || '';
            conApplyEntityAnimClass(newNode.el, newNode.anim, false);
            conApplyTextStrokeStyle(newNode.el, newNode.textStrokeWidth, newNode.textStrokeColor);
            conRenderNodeLabel(newNode);
          }
          newIds.push(newId);
        });

        conRemoveNode(node.id);

        const newNodes = newIds.map(id => conNodes.find(n => n.id === id)).filter(Boolean);
        const totalWidth = newNodes.reduce((sum, n) => sum + (n.el.offsetWidth || 0), 0) + gap * (newNodes.length - 1);
        let curX = centerX - totalWidth / 2;
        newNodes.forEach(n => {
          n.x = curX;
          n.y = oy;
          n.el.style.left = curX + 'px';
          n.el.style.top = oy + 'px';
          curX += (n.el.offsetWidth || 0) + gap;
        });

        return true;
      }
      window.conSplitSingleNode = conSplitSingleNode;

      window.conCtxExecuteSplit = function (mode, splitAll) {
        const dd = document.getElementById('con-ctx-split-dropdown');
        if (dd) dd.style.display = 'none';

        const targets = (splitAll && conMultiSelected && conMultiSelected.size > 1)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : [conNodes.find(n => n.id === conCtxNodeId)].filter(Boolean);

        if (!targets.length) {
          conCtxClose();
          return;
        }

        conPushUndo();
        conCtxClose();

        let splitCount = 0;
        targets.forEach(node => {
          if (conSplitSingleNode(node, mode)) {
            splitCount++;
          }
        });

        if (conMultiSelected) conMultiSelected.clear();
        conRedrawEdges();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
        if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true });

        if (splitCount === 0 && typeof showToast === 'function') {
          const msg = (typeof i18n !== 'undefined' && i18n.t('conSplitCannotSplit')) || 'No words could be split';
          showToast(msg, false);
        }
      };

      window.conCtxSplitNode = function (mode, splitAll) {
        if (!mode) {
          const dd = document.getElementById('con-ctx-split-dropdown');
          if (dd && dd.style.display === 'none') {
            conCtxToggleSplitDropdown();
            return;
          }
        }
        conCtxExecuteSplit(mode || 'space', !!splitAll);
      };

      // Convert a single node to a note
      function conConvertSingleNodeToNote(node) {
        if (!node) return null;
        const text = node.baseWord || (node.el ? node.el.textContent.trim() : '') || 'Note';
        const x = Number.isFinite(node.x) ? node.x : 60;
        const y = Number.isFinite(node.y) ? node.y : 60;
        const rawColor = (node.el && (node.el.style.color || node.el.style.borderColor)) || '#111111';
        const rawBg = (node.el && (node.el.style.backgroundColor || node.el.style.background)) || '#ffffff';
        const fontSize = Math.round(conGetNodeBaseFontSize(node) || 16);
        const fmt = conGetNodeFmt(node) || {};
        const nid = (typeof window.conGetNextNoteId === 'function') ? window.conGetNextNoteId() : ('cnn' + (conNoteNextId++));
        const noteData = {
          id: nid,
          nodeId: null,
          text: text,
          x: x,
          y: y,
          color: rawColor,
          bg: rawBg,
          fontSize: fontSize,
          fontFamily: node.fontFamily || (node.el ? node.el.style.fontFamily : null) || null,
          bold: !!fmt.bold,
          italic: !!fmt.italic,
          underline: !!fmt.underline,
          strike: !!fmt.strike,
          hidden: !!node.masked,
          locked: !!node.locked,
          manualSize: false,
          width: null,
          height: null,
          borderWidth: node.borderWidth || null,
          borderColor: node.borderColor || (node.el ? node.el.style.borderColor : null) || null,
          borderStyle: node.borderStyle || null,
          highlight: node.highlight || null,
          pageNum: node.pageNum != null ? node.pageNum : null
        };
        if (typeof window.conAddNoteObject === 'function') {
          window.conAddNoteObject(noteData);
        } else {
          const liveNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : conNotes;
          if (!liveNotes.includes(noteData)) liveNotes.push(noteData);
          if (typeof conNoteBuild === 'function') conNoteBuild(noteData);
        }
        conRemoveNode(node.id);
        return noteData;
      }
      window.conConvertSingleNodeToNote = conConvertSingleNodeToNote;

      // Convert active/selected node(s) to note(s)
      window.conCtxConvertToNote = function () {
        const selectedNodeIds = (conMultiSelected && conMultiSelected.size > 0)
          ? [...conMultiSelected]
          : (conCtxNodeId ? [conCtxNodeId] : (conSelected ? [conSelected] : []));
        if (!selectedNodeIds.length) return;
        if (window.conPushUndo) window.conPushUndo();
        conCtxClose();

        const createdNotes = [];
        selectedNodeIds.forEach(id => {
          const node = conNodes.find(n => n.id === id);
          if (node) {
            const note = conConvertSingleNodeToNote(node);
            if (note) createdNotes.push(note);
          }
        });
        if (conMultiSelected) conMultiSelected.clear();
        conRedrawEdges();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
        if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true });
      };

      window.conCtxRemoveFromGroup = function () {
        if (!conCtxNodeId) return;
        conPushUndo();
        const id = conCtxNodeId;
        conCtxClose();
        conGroupRemoveNode(id);
      };

      window.conCtxAddBaseWord = function () {
        const node = conCtxNodeId ? conNodes.find(n => n.id === conCtxNodeId) : null;
        if (!node || !node.sourceWord) { conCtxClose(); return; }
        conPushUndo();
        const srcWord = node.sourceWord;
        conCtxClose();
        const brd = board();
        const bw = brd.clientWidth, bh = brd.clientHeight;
        const nx = Math.max(4, Math.min(bw - 120, node.x - 120));
        const ny = Math.max(4, Math.min(bh - 50, node.y));
        const newId = conAddWordAt(srcWord, nx, ny);
        if (newId) conAddEdge(newId, node.id);
      };

      window.conCtxAddRelated = function (relation) {
        if (!conCtxNodeId) return;
        const node = conNodes.find(n => n.id === conCtxNodeId);
        if (!node) { conCtxClose(); return; }
        const matched = conGetNodeDbEntries(node);
        const entries = (matched && matched.length)
          ? matched.map(m => m.entry).filter(Boolean)
          : conLookupDbEntries(node.baseWord || (node.el && node.el.textContent.trim()));
        if (!entries.length) { conCtxClose(); return; }

        const wordsSet = new Set();
        entries.forEach(dbWord => {
          const list = (relation === 'synonyms' ? dbWord.synonyms : dbWord.antonyms) || [];
          const arr = Array.isArray(list) ? list : String(list).split(/[,;/]+/);
          arr.forEach(w => {
            const s = typeof w === 'string' ? w.trim() : (w.word || w.term || '');
            if (s) wordsSet.add(s);
          });
        });
        const words = Array.from(wordsSet);
        if (!words.length) { conCtxClose(); return; }

        conCtxClose();
        conRelPickerOpen(node, relation, words);
      };

      // ---- Related-word picker ----
      let _conRelPickerNode = null;
      let _conRelPickerRelation = null;
      let _conRelPickerWords = [];

      window.conPickerSetAllChecks = function (listSelector, checked, includeDisabled) {
        const selector = listSelector + ' input[type="checkbox"]' + (includeDisabled ? '' : ':not(:disabled)');
        document.querySelectorAll(selector).forEach(cb => {
          cb.checked = !!checked;
        });
      };

      window.conRelPickerSelectAll = function () {
        window.conPickerSetAllChecks('#con-rel-picker-list', true, false);
      };

      window.conRelPickerClearAll = function () {
        window.conPickerSetAllChecks('#con-rel-picker-list', false, false);
      };

      function conRelPickerOpen(node, relation, words) {
        _conRelPickerNode = node;
        _conRelPickerRelation = relation;
        _conRelPickerWords = words;

        document.getElementById('con-rel-picker-title').textContent =
          relation === 'synonyms' ? ' Add Synonyms' : '⚡ Add Antonyms';
        document.getElementById('con-rel-picker-word-badge').textContent =
          node.baseWord || node.el.textContent.trim();

        const tagClass = relation === 'synonyms' ? 'syn' : 'ant';
        const tagLabel = relation === 'synonyms' ? 'syn' : 'ant';

        const list = document.getElementById('con-rel-picker-list');
        list.innerHTML = '';
        words.forEach((word, i) => {
          const alreadyOnBoard = !!conNodes.find(n =>
            (n.baseWord || n.el.textContent).toLowerCase() === word.toLowerCase()
          );
          const item = document.createElement('label');
          item.className = 'con-rel-picker-item' + (alreadyOnBoard ? ' on-board' : '');
          item.title = alreadyOnBoard ? 'Already on board' : '';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.dataset.idx = String(i);
          cb.checked = !alreadyOnBoard;
          cb.disabled = alreadyOnBoard;

          const lbl = document.createElement('span');
          lbl.className = 'con-rel-picker-item-label';
          lbl.textContent = word;

          const tag = document.createElement('span');
          tag.className = 'con-rel-picker-item-tag ' + tagClass;
          tag.textContent = tagLabel;

          item.appendChild(cb);
          item.appendChild(lbl);
          item.appendChild(tag);

          if (alreadyOnBoard) {
            const note = document.createElement('span');
            note.className = 'con-rel-picker-item-on-board-note';
            note.textContent = 'on board';
            item.appendChild(note);
          }
          list.appendChild(item);
        });

        document.getElementById('con-rel-picker-overlay').classList.add('active');
      }

      window.conRelPickerClose = function () {
        _conRelPickerNode = null;
        _conRelPickerRelation = null;
        _conRelPickerWords = [];
        document.getElementById('con-rel-picker-overlay').classList.remove('active');
      };

      window.conRelPickerConfirm = function () {
        const node = _conRelPickerNode;
        const relation = _conRelPickerRelation;
        if (!node || !relation) { window.conRelPickerClose(); return; }

        const checkboxes = document.querySelectorAll(
          '#con-rel-picker-list input[type="checkbox"]:checked:not(:disabled)'
        );
        const selected = Array.from(checkboxes)
          .map(cb => _conRelPickerWords[Number(cb.dataset.idx)])
          .filter(Boolean);

        window.conRelPickerClose();

        const brd = board();
        const bw = brd.clientWidth, bh = brd.clientHeight;
        const originX = node.x + (node.el.offsetWidth || 80) / 2;
        const originY = node.y + (node.el.offsetHeight || 36) / 2;
        const radius = 110;
        const count = selected.length;

        selected.forEach((word, i) => {
          if (conNodes.find(n => (n.baseWord || n.el.textContent).toLowerCase() === word.toLowerCase())) return;

          const angleOffset = relation === 'antonyms' ? Math.PI / Math.max(count, 1) : 0;
          const angle = (2 * Math.PI * i / count) - Math.PI / 2 + angleOffset;
          let nx = originX + Math.cos(angle) * radius - 40;
          let ny = originY + Math.sin(angle) * radius - 18;
          nx = Math.max(4, Math.min(bw - 120, nx));
          ny = Math.max(4, Math.min(bh - 50, ny));
          ({ x: nx, y: ny } = conFindFreePosition(nx, ny));
          nx = Math.max(4, Math.min(bw - 120, nx));
          ny = Math.max(4, Math.min(bh - 50, ny));

          const id = 'cn' + conNextId++;
          const dbMatch = vocabBank.find(w => w.word.toLowerCase() === word.toLowerCase());
          const el = document.createElement('div');
          el.className = 'con-node' + (dbMatch ? ' con-node-matched' : '');
          el.id = id;
          el.textContent = dbMatch ? dbMatch.word : word;
          el.style.left = nx + 'px';
          el.style.top = ny + 'px';
          conApplyDefaultWordFontSize(el);
          if (relation === 'synonyms') {
            el.style.borderColor = '#4a9e4a';
          } else {
            el.style.borderColor = '#b94040';
          }
          brd.appendChild(el);
          conNodes.push({
            id, el, x: nx, y: ny,
            dbWord: dbMatch ? dbMatch.word : null,
            baseWord: dbMatch ? dbMatch.word : word,
            sourceWord: node.baseWord || node.el.textContent.trim(), relation
          });
          conAttachNodeEvents(id, el);
          conAddEdge(node.id, id);
        });
      };

      // ---- Word Network ----
      let _conNetworkNodeId = null;
      let _conNetworkDepth = 1;
      const _conNetworkChipDeselected = new Set(); // "catKey:word.toLowerCase()"

      window.conNetworkToggleChip = function (el) {
        const catKey = el.closest('.con-network-cat-row').querySelector('[data-cat]').dataset.cat;
        const word = el.dataset.word.toLowerCase();
        const id = catKey + ':' + word;
        if (_conNetworkChipDeselected.has(id)) {
          _conNetworkChipDeselected.delete(id);
          el.classList.remove('chip-inactive');
        } else {
          _conNetworkChipDeselected.add(id);
          el.classList.add('chip-inactive');
        }
      };

      const _CON_NETWORK_CATS = [
        { key: 'synonyms', label: 'Synonyms', color: '#16a34a', edgeLabel: 'syn' },
        { key: 'antonyms', label: 'Antonyms', color: '#dc2626', edgeLabel: 'ant' },
        { key: 'otherForms', label: 'Other Forms', color: '#2563eb', edgeLabel: 'form' },
        { key: 'hypernym', label: 'Hypernyms', color: '#9333ea', edgeLabel: '↑' },
        { key: 'hyponym', label: 'Hyponyms', color: '#ea580c', edgeLabel: '↓' },
        { key: 'ipa', label: 'IPA', color: '#0891b2', edgeLabel: '[ipa]', singleValue: true },
        { key: 'french', label: 'FR', color: '#7c3aed', edgeLabel: '[fr]', singleValue: true },
        { key: 'german', label: 'DE', color: '#059669', edgeLabel: '[de]', singleValue: true },
        { key: 'italian', label: 'IT', color: '#db2777', edgeLabel: '[it]', singleValue: true },
        { key: 'etymology', label: 'Etymology', color: '#b45309', edgeLabel: '[ety]', singleValue: true },
      ];

      window.conCtxOpenNetworkModal = function () {
        if (!conCtxNodeId) return;
        const node = conNodes.find(n => n.id === conCtxNodeId);
        if (!node) { conCtxClose(); return; }
        const matched = conGetNodeDbEntries(node);
        const entries = (matched && matched.length)
          ? matched.map(m => m.entry).filter(Boolean)
          : conLookupDbEntries(node.baseWord || (node.el && node.el.textContent.trim()));
        if (!entries.length) { conCtxClose(); return; }

        conCtxClose();
        _conNetworkNodeId = node.id;
        _conNetworkDepth = 1;
        _conNetworkChipDeselected.clear();

        document.querySelectorAll('.con-network-depth-btn').forEach(b => {
          b.classList.toggle('active', Number(b.dataset.depth) === 1);
        });
        document.getElementById('con-network-depth-warning').style.display = 'none';
        document.getElementById('con-network-word-badge').textContent = node.baseWord || node.el.textContent.trim() || '';

        const container = document.getElementById('con-network-categories');
        container.innerHTML = '';

        _CON_NETWORK_CATS.forEach(cat => {
          const wordsSet = new Set();
          entries.forEach(dbWord => {
            const rawVal = dbWord[cat.key];
            const list = cat.singleValue
              ? [Array.isArray(rawVal) ? rawVal[0] : rawVal].filter(v => typeof v === 'string' && v.trim().length > 0)
              : (Array.isArray(rawVal) ? rawVal : (rawVal ? [rawVal] : [])).filter(v => typeof v === 'string' && v.trim().length > 0);
            list.forEach(w => wordsSet.add(w.trim()));
          });
          const words = Array.from(wordsSet);
          // A word is "on board" if a node with that baseWord already exists
          const onBoardCount = words.filter(w =>
            conNodes.find(n => (n.baseWord || '').toLowerCase() === w.toLowerCase())
          ).length;
          // Category is useful if there are any words (on-board ones will be linked, new ones spawned)
          const hasAny = words.length > 0;

          const row = document.createElement('div');
          row.className = 'con-network-cat-row';

          const chipsHtml = hasAny
            ? `<div class="con-network-cat-chips">${words.map(w => {
              const ob = !!conNodes.find(n => (n.baseWord || '').toLowerCase() === w.toLowerCase());
              const esc = w.replace(/"/g, '&quot;');
              return `<span class="con-network-chip${ob ? ' on-board' : ''}" data-word="${esc}" title="${ob ? 'on board — will link (click to skip)' : 'click to deselect'}" onclick="conNetworkToggleChip(this)">${w}</span>`;
            }).join('')}</div>`
            : `<div class="con-network-cat-empty">(none)</div>`;

          const countLabel = onBoardCount > 0 && onBoardCount < words.length
            ? `${words.length - onBoardCount}+${onBoardCount}↗`
            : words.length > 0 ? String(words.length) : '—';

          row.innerHTML = `
            <label class="con-network-cat-toggle">
              <input type="checkbox" data-cat="${cat.key}" ${hasAny ? 'checked' : 'disabled'}>
              <span class="con-network-cat-label" style="color:${cat.color};">${cat.label}</span>
              <span class="con-network-cat-count" title="${onBoardCount} already on board">${countLabel}</span>
            </label>
            ${chipsHtml}
          `;
          container.appendChild(row);
        });

        document.getElementById('con-network-overlay').classList.add('active');
      };

      window.conNetworkClose = function () {
        document.getElementById('con-network-overlay').classList.remove('active');
        _conNetworkNodeId = null;
      };

      window.conNetworkSetDepth = function (d) {
        _conNetworkDepth = d;
        document.querySelectorAll('.con-network-depth-btn').forEach(b => {
          b.classList.toggle('active', Number(b.dataset.depth) === d);
        });
        document.getElementById('con-network-depth-warning').style.display = d > 1 ? '' : 'none';
      };

      window.conNetworkSpawn = function () {
        if (!_conNetworkNodeId) { window.conNetworkClose(); return; }

        const enabledCats = {};
        document.querySelectorAll('#con-network-categories input[type=checkbox]:checked:not(:disabled)').forEach(cb => {
          enabledCats[cb.dataset.cat] = true;
        });


        const srcNodeId = _conNetworkNodeId;
        const maxDepth = _conNetworkDepth;
        window.conNetworkClose();

        if (!Object.keys(enabledCats).length) return;

        conPushUndo();

        const brd = board();
        const bw = brd.clientWidth;
        const bh = brd.clientHeight;

        // Map of word (lowercase) → nodeId for all nodes already on the board before spawn.
        // These will be linked-to rather than re-created.
        const preExisting = new Map();
        conNodes.forEach(n => {
          const w = (n.baseWord || n.el.textContent.trim()).toLowerCase();
          if (!preExisting.has(w)) preExisting.set(w, n.id);
        });

        // visitedInBFS tracks only words queued/created in THIS run to prevent cycles.
        // Pre-existing words are NOT seeded here so they can still be linked.
        const visitedInBFS = new Set();
        const srcNode0 = conNodes.find(n => n.id === srcNodeId);
        if (srcNode0) visitedInBFS.add((srcNode0.baseWord || srcNode0.el.textContent.trim()).toLowerCase());

        // BFS: { nodeId, depth }
        const queue = [{ nodeId: srcNodeId, depth: 0 }];

        while (queue.length > 0) {
          const { nodeId: parentNodeId, depth } = queue.shift();
          if (depth >= maxDepth) continue;

          const parentNode = conNodes.find(n => n.id === parentNodeId);
          if (!parentNode) continue;

          const lookupWord = parentNode.dbWord || parentNode.baseWord || '';
          const dbEntry = typeof vocabBank !== 'undefined'
            ? vocabBank.find(e => e.word && e.word.toLowerCase() === lookupWord.toLowerCase())
            : null;
          if (!dbEntry) continue;

          // Collect relations to handle. Skip only words already queued/created in this run.
          const toSpawn = [];
          _CON_NETWORK_CATS.forEach(cat => {
            if (!enabledCats[cat.key]) return;
            if (cat.singleValue && depth > 0) return; // info fields only expand from source node
            const rawCatVal = dbEntry[cat.key];
            const catWords = cat.singleValue
              ? [Array.isArray(rawCatVal) ? rawCatVal[0] : rawCatVal].filter(v => typeof v === 'string' && v.length > 0)
              : (Array.isArray(rawCatVal) ? rawCatVal : []).filter(v => typeof v === 'string' && v.length > 0);
            catWords.forEach(w => {
              if (depth === 0 && _conNetworkChipDeselected.has(cat.key + ':' + w.toLowerCase())) return;
              if (!visitedInBFS.has(w.toLowerCase())) {
                toSpawn.push({ word: w, cat, existingId: preExisting.get(w.toLowerCase()) || null });
              }
            });
          });

          if (!toSpawn.length) continue;

          // Compute radial positions only for words that need new nodes
          const newWords = toSpawn.filter(item => !item.existingId);
          const nodeW = parentNode.el.offsetWidth || 80;
          const nodeH = parentNode.el.offsetHeight || 32;
          const cx = parentNode.x + nodeW / 2;
          const cy = parentNode.y + nodeH / 2;
          const count = newWords.length;
          const radius = Math.max(180, count * 32);
          let newWordIdx = 0;

          toSpawn.forEach(item => {
            if (visitedInBFS.has(item.word.toLowerCase())) return; // concurrent dedup
            visitedInBFS.add(item.word.toLowerCase());

            const isDashed = depth > 0;

            if (item.existingId) {
              // Word already on board — just connect parent → existing node
              const beforeLen = conEdges.length;
              conAddEdge(parentNodeId, item.existingId, 'none', item.cat.color);
              if (conEdges.length > beforeLen) {
                const edge = conEdges[conEdges.length - 1];
                edge.label = isDashed ? '' : item.cat.edgeLabel;
                edge.labelColor = item.cat.color;
                edge.dashStyle = isDashed ? 'dashed' : null;
                if (edge.labelEl) edge.labelEl.textContent = edge.label;
                conApplyEdgeLabelStyle(edge);
              }
              // Don't BFS-expand pre-existing nodes (they may already have rich connections)
              return;
            }

            // New node — place it radially around the parent, then nudge if it overlaps
            const angle = (2 * Math.PI * newWordIdx / Math.max(count, 1)) - Math.PI / 2;
            newWordIdx++;
            let nx = cx + radius * Math.cos(angle) - 40;
            let ny = cy + radius * Math.sin(angle) - 18;
            nx = Math.max(4, Math.min(bw - 120, nx));
            ny = Math.max(4, Math.min(bh - 50, ny));
            ({ x: nx, y: ny } = conFindFreePosition(nx, ny, parentNodeId));
            nx = Math.max(4, Math.min(bw - 120, nx));
            ny = Math.max(4, Math.min(bh - 50, ny));

            const newId = 'cn' + conNextId++;
            const dbMatch = typeof vocabBank !== 'undefined'
              ? vocabBank.find(w2 => w2.word && w2.word.toLowerCase() === item.word.toLowerCase())
              : null;

            const el = document.createElement('div');
            el.className = 'con-node' + (dbMatch ? ' con-node-matched' : '');
            el.id = newId;
            el.style.left = nx + 'px';
            el.style.top = ny + 'px';
            conApplyDefaultWordFontSize(el);
            if (window._bcNodeFontFamily) el.style.fontFamily = window._bcNodeFontFamily;
            brd.appendChild(el);

            const newNode = {
              id: newId, el, x: nx, y: ny,
              dbWord: dbMatch ? dbMatch.word : null,
              baseWord: dbMatch ? dbMatch.word : item.word,
              sourceWord: parentNode.baseWord || parentNode.el.textContent.trim(),
              relation: item.cat.key,
              locked: false,
              fontFamily: window._bcNodeFontFamily || null
            };
            conNodes.push(newNode);
            conSyncNodeLockState(newNode);
            conRenderNodeLabel(newNode);
            conAttachNodeEvents(newId, el);

            // Register in preExisting so further BFS steps link to it rather than re-create
            preExisting.set(item.word.toLowerCase(), newId);

            const beforeLen = conEdges.length;
            conAddEdge(parentNodeId, newId, 'none', item.cat.color);
            if (conEdges.length > beforeLen) {
              const edge = conEdges[conEdges.length - 1];
              edge.label = isDashed ? '' : item.cat.edgeLabel;
              edge.labelColor = item.cat.color;
              edge.dashStyle = isDashed ? 'dashed' : null;
              if (edge.labelEl) edge.labelEl.textContent = edge.label;
              conApplyEdgeLabelStyle(edge);
            }

            queue.push({ nodeId: newId, depth: depth + 1 });
          });
        }

        conRedrawEdges();
      };

      // ---- Translation picker ----
      let _conTransPickerNode = null;
      let _conTransPickerChoices = [];
      let _conTransPickerMode = 'translation';

      function conGetTranslationChoices(dbEntries) {
        const choices = [];
        const seen = new Set();
        dbEntries.forEach(e => {
          const raw = e.french || e.translation;
          if (!raw) return;
          const items = Array.isArray(raw) ? raw : [raw];
          items.forEach(item => {
            const val = String(item).trim();
            if (!val || seen.has(val.toLowerCase())) return;
            seen.add(val.toLowerCase());
            choices.push({ text: val, label: 'FR' });
          });
        });
        return choices;
      }

      function conGetIpaChoices(dbEntries) {
        const choices = [];
        const seen = new Set();
        dbEntries.forEach(e => {
          const val = String(e.ipa || '').trim();
          if (!val || seen.has(val.toLowerCase())) return;
          seen.add(val.toLowerCase());
          choices.push({ text: val, label: 'IPA' });
        });
        return choices;
      }

      function conGetEtymologyChoices(dbEntries) {
        const choices = [];
        const seen = new Set();
        dbEntries.forEach(e => {
          const raw = e.etymology;
          if (!raw) return;
          const items = Array.isArray(raw) ? raw : [raw];
          items.forEach(item => {
            const val = String(item || '').trim();
            if (!val || seen.has(val.toLowerCase())) return;
            seen.add(val.toLowerCase());
            choices.push({ text: val, label: 'ETY' });
          });
        });
        return choices;
      }

      function conAddLinkedChildNodesFromText(node, selectedTexts, relation) {
        const selected = Array.isArray(selectedTexts)
          ? selectedTexts.map(v => String(v || '').trim()).filter(Boolean)
          : [];
        if (!node || !selected.length) return 0;

        const brd = board();
        const bw = brd.clientWidth;
        const bh = brd.clientHeight;
        const originX = node.x + (node.el.offsetWidth || 80) / 2;
        const originY = node.y + (node.el.offsetHeight || 36) / 2;
        const radius = Math.max(110, 96 + selected.length * 6);
        const stroke = relation === 'ipa' ? '#7c3aed' : (relation === 'etymology' ? '#b45309' : '#059669');
        let created = 0;

        selected.forEach((text, i) => {
          const alreadyOnBoard = !!conNodes.find(n =>
            (n.baseWord || n.el.textContent).toLowerCase() === text.toLowerCase()
          );
          if (alreadyOnBoard) return;

          const angle = (2 * Math.PI * i / selected.length) - Math.PI / 2;
          let nx = originX + Math.cos(angle) * radius - 40;
          let ny = originY + Math.sin(angle) * radius - 18;
          nx = Math.max(4, Math.min(bw - 120, nx));
          ny = Math.max(4, Math.min(bh - 50, ny));
          ({ x: nx, y: ny } = conFindFreePosition(nx, ny));
          nx = Math.max(4, Math.min(bw - 120, nx));
          ny = Math.max(4, Math.min(bh - 50, ny));

          const id = 'cn' + conNextId++;
          const el = document.createElement('div');
          el.className = 'con-node';
          el.id = id;
          el.style.left = nx + 'px';
          el.style.top = ny + 'px';
          el.style.borderColor = stroke;
          conApplyDefaultWordFontSize(el);
          brd.appendChild(el);

          const child = {
            id,
            el,
            x: nx,
            y: ny,
            dbWord: null,
            baseWord: text,
            sourceWord: node.baseWord || node.el.textContent.trim(),
            relation
          };
          conNodes.push(child);
          conRenderNodeLabel(child);
          conAttachNodeEvents(id, el);
          conAddEdge(node.id, id);
          created++;
        });

        return created;
      }

      function conTransPickerOpen(node, word, choices, mode) {
        _conTransPickerNode = node;
        _conTransPickerChoices = Array.isArray(choices) ? choices : [];
        _conTransPickerMode = (mode === 'ipa' || mode === 'etymology') ? mode : 'translation';

        const overlay = document.getElementById('con-trans-picker-overlay');
        const titleEl = document.querySelector('#con-trans-picker-header h3');
        const badge = document.getElementById('con-trans-picker-word-badge');
        const hint = document.getElementById('con-trans-picker-hint');
        const list = document.getElementById('con-trans-picker-list');
        const confirmBtn = document.getElementById('con-trans-picker-confirm-btn');

        if (!overlay || !list) return;

        const isIpa = _conTransPickerMode === 'ipa';
        const isEty = _conTransPickerMode === 'etymology';
        if (titleEl) titleEl.textContent = isIpa ? '[ ] Add IPA' : (isEty ? 'Add Etymology' : '( ) Add Translation');

        if (badge) badge.textContent = word || 'Word';
        if (hint) hint.textContent = _conTransPickerChoices.length
          ? (isIpa
            ? 'Choose which IPA value(s) to add as connected node(s).'
            : (isEty
              ? 'Choose which etymology value(s) to add as connected node(s).'
              : 'Choose which translation(s) to add as connected node(s).'))
          : (isIpa ? 'No IPA is saved for this word.' : (isEty ? 'No etymology is saved for this word.' : 'No translation is saved for this word.'));
        if (confirmBtn) confirmBtn.textContent = _conTransPickerChoices.length ? 'Add Selected' : 'Cancel';

        list.innerHTML = '';
        if (!_conTransPickerChoices.length) {
          const empty = document.createElement('div');
          empty.className = 'con-def-picker-empty';
          empty.textContent = isIpa
            ? 'No IPA is saved for this word yet.'
            : (isEty ? 'No etymology is saved for this word yet.' : 'No translation is saved for this word yet.');
          list.appendChild(empty);
        } else {
          _conTransPickerChoices.forEach((choice, idx) => {
            const item = document.createElement('label');
            item.className = 'con-def-picker-item';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.dataset.idx = String(idx);
            cb.checked = true;

            const textWrap = document.createElement('div');
            textWrap.className = 'con-def-picker-item-text';

            const tag = document.createElement('span');
            tag.className = 'con-def-picker-item-tag con-trans-picker-item-tag';
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

      window.conTransPickerClose = function () {
        _conTransPickerNode = null;
        _conTransPickerChoices = [];
        _conTransPickerMode = 'translation';
        const overlay = document.getElementById('con-trans-picker-overlay');
        if (overlay) overlay.classList.remove('active');
      };

      window.conTransPickerSelectAll = function () {
        window.conPickerSetAllChecks('#con-trans-picker-list', true, false);
      };

      window.conTransPickerClearAll = function () {
        window.conPickerSetAllChecks('#con-trans-picker-list', false, false);
      };

      window.conTransPickerConfirm = function () {
        const node = _conTransPickerNode;
        const mode = _conTransPickerMode;
        if (!node) { window.conTransPickerClose(); return; }
        if (!_conTransPickerChoices.length) { window.conTransPickerClose(); return; }

        const selected = Array.from(
          document.querySelectorAll('#con-trans-picker-list input[type="checkbox"]:checked')
        ).map(cb => _conTransPickerChoices[Number(cb.dataset.idx)])
          .filter(Boolean)
          .map(choice => choice.text);

        if (selected.length === 0) {
          if (typeof mdbToast === 'function') {
            mdbToast(mode === 'ipa'
              ? 'Select at least one IPA value to add.'
              : (mode === 'etymology'
                ? 'Select at least one etymology to add.'
                : 'Select at least one translation to add.'));
          }
          return;
        }

        window.conTransPickerClose();
        conPushUndo();
        const relation = mode === 'ipa' ? 'ipa' : (mode === 'etymology' ? 'etymology' : 'translation');
        const created = conAddLinkedChildNodesFromText(node, selected, relation);
        if (!created && typeof mdbToast === 'function') {
          mdbToast('ℹ Selected value(s) are already on the board.');
        }
      };

      function conClipboardIsConstellationVisible() {
        const sec = document.getElementById('constellation-section');
        return !!(sec && !sec.classList.contains('hidden'));
      }

      function conClipboardTypingFocus() {
        const ae = document.activeElement;
        if (!ae) return false;
        const tag = ae.tagName;
        if (tag === 'INPUT' || tag === 'SELECT') return true;
        if (tag === 'TEXTAREA') return true;
        if (ae.isContentEditable) {
          // If editing inside a note, but no text range is highlighted, user intends to cut/copy the whole note
          const sel = window.getSelection();
          if (ae.closest('.con-word-note, .ta-word-note') && (!sel || sel.toString().length === 0)) {
            return false;
          }
          return true;
        }
        return false;
      }

      let _lastConCopiedText = null;
      let _lastConCopiedOsText = null;
      let _lastConCopyTime = 0;
      let _conOsClipboardWritePending = false;
      let _conOsClipboardWritePromise = null;

      async function _conWriteOsClipboardText(text) {
        const str = String(text || '');
        let wrote = false;
        if (window.Desktop && typeof window.Desktop.clipboardWriteText === 'function') {
          try {
            const res = await window.Desktop.clipboardWriteText(str);
            if (res !== false) wrote = true;
          } catch (e) {}
        } else if (window.electronApi && typeof window.electronApi.clipboardWriteText === 'function') {
          try {
            const res = await window.electronApi.clipboardWriteText(str);
            if (res !== false) wrote = true;
          } catch (e) {}
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(str);
            wrote = true;
          } catch (e) {}
        }
        if (!wrote && str) {
          try {
            const tmp = document.createElement('textarea');
            tmp.value = str;
            tmp.setAttribute('readonly', '');
            tmp.style.position = 'fixed';
            tmp.style.opacity = '0';
            tmp.style.pointerEvents = 'none';
            document.body.appendChild(tmp);
            tmp.select();
            document.execCommand('copy');
            tmp.remove();
          } catch (e) {}
        }
      }

      async function _conReadOsClipboardText() {
        if (window.Desktop && typeof window.Desktop.clipboardReadText === 'function') {
          try { return await window.Desktop.clipboardReadText(); } catch (e) {}
        } else if (window.electronApi && typeof window.electronApi.clipboardReadText === 'function') {
          try { return await window.electronApi.clipboardReadText(); } catch (e) {}
        }
        if (navigator.clipboard && navigator.clipboard.readText) {
          try { return await navigator.clipboard.readText(); } catch (e) {}
        }
        return null;
      }

      function conClipboardSelectionSummary() {
        const nodeIds = new Set();
        const noteIds = new Set();
        const groupIds = new Set();
        const drawingIds = new Set();
        const shapeIds = new Set();

        const hasNoteSelection = typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0;
        const hasNodeSelection = (conMultiSelected && conMultiSelected.size > 0) || !!conSelected;
        const hasDrawingSelection = typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 0;
        const shapeSel = typeof window.conGetShapeSelected === 'function' ? window.conGetShapeSelected() : null;
        const hasShapeSelection = !!(shapeSel && shapeSel.size > 0);

        if (conMultiSelected && conMultiSelected.size > 0) {
          conMultiSelected.forEach(id => nodeIds.add(id));
        } else if (conSelected && !hasNoteSelection) {
          nodeIds.add(conSelected);
        }

        if (hasNoteSelection) {
          conNoteSelected.forEach(id => noteIds.add(id));
        } else if (document.activeElement) {
          const noteEl = document.activeElement.closest ? document.activeElement.closest('.con-word-note, .ta-word-note') : null;
          if (noteEl && noteEl.dataset.id) {
            noteIds.add(noteEl.dataset.id);
          }
        }
        if (hasDrawingSelection) {
          conDrawingSelected.forEach(id => drawingIds.add(id));
        }

        if (hasShapeSelection) {
          shapeSel.forEach(id => shapeIds.add(id));
        }

        const mediaSel = (typeof window.conGetMediaSelected === 'function') ? window.conGetMediaSelected() : (typeof conMediaSelected !== 'undefined' ? conMediaSelected : new Set());
        const mediaIds = new Set();
        if (mediaSel && mediaSel.size > 0) {
          mediaSel.forEach(id => mediaIds.add(id));
        }
        document.querySelectorAll('#constellation-board .con-media-item.con-media-selected').forEach(el => {
          if (el.dataset && el.dataset.id) mediaIds.add(el.dataset.id);
        });
        if (!mediaIds.size && window._conActiveMediaItem && window._conActiveMediaItem.id) {
          const activeEl = document.querySelector(`.con-media-item[data-id="${window._conActiveMediaItem.id}"]`);
          if (activeEl && activeEl.classList.contains('con-media-selected')) {
            mediaIds.add(window._conActiveMediaItem.id);
          }
        }
        if (!noteIds.size && !nodeIds.size && !drawingIds.size && !shapeIds.size && !mediaIds.size && typeof _wnActiveNote !== 'undefined' && _wnActiveNote && _wnActiveNote.id) {
          noteIds.add(_wnActiveNote.id);
        }

        const groupCtxMenu = document.getElementById('con-group-ctx-menu');
        const isGroupCtxVisible = groupCtxMenu && groupCtxMenu.classList.contains('visible');
        if (typeof _conGroupCtxId !== 'undefined' && _conGroupCtxId && isGroupCtxVisible) {
          groupIds.add(_conGroupCtxId);
        } else if (conGroupFocused) {
          groupIds.add(conGroupFocused);
        }

        groupIds.forEach(gid => {
          const g = conGroups.find(x => x.id === gid);
          if (!g) return;
          (g.nodeIds || []).forEach(id => nodeIds.add(id));
          (g.noteIds || []).forEach(id => noteIds.add(id));
          (g.mediaIds || []).forEach(id => mediaIds.add(id));
          (g.drawingIds || []).forEach(id => drawingIds.add(id));
          (g.shapeIds || []).forEach(id => shapeIds.add(id));
        });

        conGroups.forEach(g => {
          const gNodeIds = g.nodeIds || [];
          const gNoteIds = g.noteIds || [];
          const gMediaIds = g.mediaIds || [];
          const gDrawingIds = g.drawingIds || [];
          const gShapeIds = g.shapeIds || [];
          const totalCount = gNodeIds.length + gNoteIds.length + gMediaIds.length + gDrawingIds.length + gShapeIds.length;
          if (totalCount === 0) return;
          const hasAnySelected = gNodeIds.some(id => nodeIds.has(id)) ||
                                 gNoteIds.some(id => noteIds.has(id)) ||
                                 gMediaIds.some(id => mediaIds.has(id)) ||
                                 gDrawingIds.some(id => drawingIds.has(id)) ||
                                 gShapeIds.some(id => shapeIds.has(id));
          const fullySelected = (gNodeIds.length === 0 || gNodeIds.every(id => nodeIds.has(id))) &&
                                (gNoteIds.length === 0 || gNoteIds.every(id => noteIds.has(id))) &&
                                (gMediaIds.length === 0 || gMediaIds.every(id => mediaIds.has(id))) &&
                                (gDrawingIds.length === 0 || gDrawingIds.every(id => drawingIds.has(id))) &&
                                (gShapeIds.length === 0 || gShapeIds.every(id => shapeIds.has(id)));
          if (hasAnySelected && fullySelected) groupIds.add(g.id);
        });

        return {
          nodeIds: [...nodeIds],
          noteIds: [...noteIds],
          groupIds: [...groupIds],
          drawingIds: [...drawingIds],
          shapeIds: [...shapeIds],
          mediaIds: [...mediaIds]
        };
      }

      function conClipboardBuildPayload() {
        const sel = conClipboardSelectionSummary();
        if (!sel.nodeIds.length && !sel.noteIds.length && !sel.groupIds.length && !sel.drawingIds.length && !sel.shapeIds.length && !sel.mediaIds.length) return null;

        const nodes = sel.nodeIds
          .map(id => conNodes.find(n => n.id === id))
          .filter(Boolean)
          .map(n => ({
            id: n.id,
            baseWord: n.baseWord || (n.el ? n.el.textContent.trim() : ''),
            dbWord: n.dbWord || null,
            sourceWord: n.sourceWord || null,
            relation: n.relation || null,
            x: Number(n.x) || 0,
            y: Number(n.y) || 0,
            bg: n.el ? n.el.style.background || '' : '',
            color: n.el ? n.el.style.color || '' : '',
            border: n.el ? n.el.style.borderColor || '' : '',
            borderWidth: n.borderWidth || null,
            borderStyle: n.borderStyle || null,
            highlight: n.highlight || null,
            preset: n.preset || null,
            fontSize: n.el ? n.el.style.fontSize || '16px' : '16px',
            fmt: n.fmt ? { ...n.fmt } : {},
            masked: !!n.masked,
            locked: !!n.locked,
            pageNum: n.pageNum != null ? n.pageNum : null,
            phraseOrder: n.phraseOrder != null ? n.phraseOrder : null,
            shape: conNormalizeNodeShape(n.shape || (n.el && n.el.dataset.shape)),
            rotation: (typeof n.rotation === 'number') ? conNormalizeNodeRotation(n.rotation) : 0,
            textStrokeColor: n.textStrokeColor || null,
            textStrokeWidth: n.textStrokeWidth || null,
            anim: n.anim || '',
            revealAnim: n.revealAnim || ''
          }));

        const _liveNotes = (typeof window.conGetNotes === 'function')
          ? window.conGetNotes()
          : ((typeof window.conNotes !== 'undefined' && Array.isArray(window.conNotes))
              ? window.conNotes
              : ((typeof conNotes !== 'undefined' && Array.isArray(conNotes)) ? conNotes : (global.conNotes || [])));

        const notes = sel.noteIds
          .map(id => _liveNotes.find(n => n && (n.id === id || String(n.id) === String(id))))
          .filter(Boolean)
          .map(n => ({
            id: n.id,
            nodeId: n.nodeId || null,
            text: n.text || '',
            html: n.html || '',
            x: Number(n.x) || 0,
            y: Number(n.y) || 0,
            color: n.color || '#111111',
            bg: n.bg || '#ffffff',
            fontSize: Number(n.fontSize) || 14,
            bold: !!n.bold,
            italic: !!n.italic,
            underline: !!n.underline,
            strike: !!n.strike,
            hidden: !!n.hidden,
            locked: !!n.locked,
            manualSize: !!n.manualSize,
            width: typeof n.width === 'number' ? n.width : null,
            height: typeof n.height === 'number' ? n.height : null,
            borderWidth: n.borderWidth || null,
            borderStyle: n.borderStyle || null,
            borderColor: n.borderColor || null,
            preset: n.preset || null,
            textAlign: n.textAlign || null
          }));

        const groups = sel.groupIds
          .map(id => conGroups.find(g => g.id === id))
          .filter(Boolean)
          .map(g => ({
            id: g.id,
            nodeIds: [...(g.nodeIds || [])].filter(id => sel.nodeIds.includes(id)),
            noteIds: [...(g.noteIds || [])].filter(id => sel.noteIds.includes(id)),
            mediaIds: [...(g.mediaIds || [])].filter(id => sel.mediaIds.includes(id)),
            drawingIds: [...(g.drawingIds || [])].filter(id => sel.drawingIds.includes(id)),
            shapeIds: [...(g.shapeIds || [])].filter(id => sel.shapeIds.includes(id)),
            title: g.title || '',
            blink: !!g.blink,
            paletteIdx: Number(g.paletteIdx) || 0,
            invisible: !!g.invisible,
            drawingGroup: !!g.drawingGroup,
            phraseGroup: !!g.phraseGroup,
            manualW: g._manualW != null ? g._manualW : null,
            manualH: g._manualH != null ? g._manualH : null,
            x: g.el ? (parseFloat(g.el.style.left) || 0) : 0,
            y: g.el ? (parseFloat(g.el.style.top) || 0) : 0,
            w: g.el ? (parseFloat(g.el.style.width) || g.el.offsetWidth || 180) : 180,
            h: g.el ? (parseFloat(g.el.style.height) || g.el.offsetHeight || 100) : 100
          }));

        const drawings = (sel.drawingIds || [])
          .map(id => (typeof conDrawings !== 'undefined' ? conDrawings.find(d => d.id === id) : null))
          .filter(Boolean)
          .map(d => ({
            id: d.id,
            x: Number(d.x) || 0,
            y: Number(d.y) || 0,
            w: Number(d.w) || 100,
            h: Number(d.h) || 100,
            points: Array.isArray(d.points) ? JSON.parse(JSON.stringify(d.points)) : [],
            color: d.color || '#111111',
            thickness: Number(d.thickness) || 3,
            opacity: d.opacity != null ? Number(d.opacity) : 1,
            dashStyle: d.dashStyle || 'solid',
            pad: d.pad || 16
          }));

        const shapes = (sel.shapeIds || [])
          .map(id => (typeof conShapes !== 'undefined' ? conShapes.find(s => s.id === id) : null))
          .filter(Boolean)
          .map(s => ({
            id: s.id,
            type: s.type || 'rect',
            x: Number(s.x) || 0,
            y: Number(s.y) || 0,
            w: Number(s.w) || 100,
            h: Number(s.h) || 100,
            color: s.color || '#111111',
            thickness: Number(s.thickness) || 2,
            opacity: s.opacity != null ? Number(s.opacity) : 1,
            fillColor: s.fillColor || 'none',
            dashStyle: s.dashStyle || 'solid',
            arrowheadSize: s.arrowheadSize || 20,
            pts: Array.isArray(s.pts) ? JSON.parse(JSON.stringify(s.pts)) : undefined
          }));

        const _liveMedia = (typeof window.conMediaItems !== 'undefined' && Array.isArray(window.conMediaItems))
          ? window.conMediaItems
          : ((typeof conMediaItems !== 'undefined' && Array.isArray(conMediaItems)) ? conMediaItems : (global.conMediaItems || []));

        const media = (sel.mediaIds || [])
          .map(id => _liveMedia.find(m => m && (m.id === id || String(m.id) === String(id))))
          .filter(Boolean)
          .map(m => {
            const att = (typeof conFindAttachmentById === 'function') ? conFindAttachmentById(m.attachmentId) : null;
            let dUrl = m.dataUrl || (m._cachedDataUrl && m._cachedDataUrl.startsWith('data:') ? m._cachedDataUrl : '');
            if (!dUrl && att) {
              dUrl = (att._cachedDataUrl && att._cachedDataUrl.startsWith('data:')) ? att._cachedDataUrl : (att.dataUrl || '');
            }
            if (!dUrl && m.src && m.src.startsWith('data:')) dUrl = m.src;
            return {
              id: m.id,
              kind: m.kind || 'pics',
              name: m.name || (att ? att.name : 'image'),
              x: Number(m.x) || 0,
              y: Number(m.y) || 0,
              w: Number(m.w) || 120,
              h: Number(m.h) || 80,
              src: m.src || null,
              attachmentId: m.attachmentId || null,
              mime: m.mime || (att ? att.mime : null),
              relativePath: m.relativePath || (att ? att.relativePath : ''),
              base64: m.base64 || (att ? att.base64 : ''),
              dataUrl: dUrl,
              pageNumber: m.pageNumber != null ? m.pageNumber : (att ? att.pageNumber : null),
              pdfZoom: m.pdfZoom != null ? m.pdfZoom : null,
              pdfRotation: m.pdfRotation != null ? m.pdfRotation : null,
              pdfLockSize: !!m.pdfLockSize,
              emojiStickers: Array.isArray(m.emojiStickers) ? JSON.parse(JSON.stringify(m.emojiStickers)) : [],
              borderWidth: m.borderWidth || null,
              borderStyle: m.borderStyle || null,
              borderColor: m.borderColor || null,
              borderRadius: m.borderRadius != null ? m.borderRadius : null,
              opacity: m.opacity != null ? m.opacity : null,
              rotation: m.rotation != null ? m.rotation : 0,
              brightness: m.brightness != null ? m.brightness : null,
              contrast: m.contrast != null ? m.contrast : null,
              saturate: m.saturate != null ? m.saturate : null,
              grayscale: m.grayscale != null ? m.grayscale : null,
              sepia: m.sepia != null ? m.sepia : null,
              invert: m.invert != null ? m.invert : null,
              hueRotate: m.hueRotate != null ? m.hueRotate : null,
              blur: m.blur != null ? m.blur : null,
              hidden: !!m.hidden,
              locked: !!m.locked
            };
          });

        const nodeSet = new Set(nodes.map(n => n.id));
        const edges = conEdges
          .filter(e => nodeSet.has(e.a) && nodeSet.has(e.b))
          .map(e => ({
            a: e.a,
            b: e.b,
            type: e.type || 'none',
            label: e.label || '',
            labelSize: Number(e.labelSize) || 11,
            labelColor: e.labelColor || '#333333',
            labelWeight: Number(e.labelWeight) || 600,
            thickness: Number(e.thickness) > 0 ? Number(e.thickness) : null,
            dashStyle: e.dashStyle || null,
            strokeType: e.strokeType || (e.dashStyle === 'dashed' ? 'dashed' : (e.dashStyle === 'dotted' ? 'dotted' : 'solid')),
            routing: e.routing || 'straight',
            curvature: (typeof e.curvature === 'number') ? e.curvature : 0,
            opacity: (typeof e.opacity === 'number') ? e.opacity : 1,
            terminator: e.terminator || 'arrow',
            animated: !!e.animated,
            labelBg: !!e.labelBgActive,
            anchorA: e.anchorA || null,
            anchorB: e.anchorB || null,
            points: (Array.isArray(e.points) && e.points.length > 0) ? e.points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })) : [],
            avoidObstacles: !!e.avoidObstacles,
            colorMode: e.colorMode,
            strokeColor: e.strokeColor
          }));

        const rects = [];
        nodes.forEach(n => {
          const el = conNodes.find(x => x.id === n.id) && conNodes.find(x => x.id === n.id).el;
          rects.push({
            x: n.x,
            y: n.y,
            w: el ? (el.offsetWidth || 80) : 80,
            h: el ? (el.offsetHeight || 32) : 32
          });
        });
        notes.forEach(n => {
          const el = typeof wnGetNoteElementById === 'function' ? wnGetNoteElementById(n.id) : null;
          rects.push({
            x: n.x,
            y: n.y,
            w: el ? (el.offsetWidth || 120) : (n.width || 120),
            h: el ? (el.offsetHeight || 40) : (n.height || 40)
          });
        });
        media.forEach(m => {
          rects.push({ x: m.x, y: m.y, w: m.w || 120, h: m.h || 80 });
        });
        groups.forEach(g => {
          rects.push({ x: g.x, y: g.y, w: g.w || 180, h: g.h || 100 });
        });
        drawings.forEach(d => {
          rects.push({ x: d.x, y: d.y, w: d.w || 100, h: d.h || 100 });
        });
        shapes.forEach(s => {
          rects.push({ x: s.x, y: s.y, w: s.w || 100, h: s.h || 100 });
        });

        const bounds = rects.length
          ? {
            minX: Math.min(...rects.map(r => r.x)),
            minY: Math.min(...rects.map(r => r.y)),
            maxX: Math.max(...rects.map(r => r.x + r.w)),
            maxY: Math.max(...rects.map(r => r.y + r.h))
          }
          : { minX: 0, minY: 0, maxX: 120, maxY: 60 };

        const textParts = [];
        nodes.forEach(n => { if (n.baseWord) textParts.push(n.baseWord); });
        notes.forEach(n => { if (n.text) textParts.push(n.text); });
        groups.forEach(g => { if (g.title) textParts.push(g.title); });
        media.forEach(m => { if (m.name) textParts.push(m.name); });
        const plainText = textParts.join('\n');

        return {
          type: 'constellation-selection',
          nodes,
          notes,
          groups,
          drawings,
          shapes,
          media,
          edges,
          bounds,
          plainText,
          timestamp: Date.now()
        };
      }

      function conClipboardClearVisualSelection() {
        conMultiSelected.clear();
        conSelected = null;
        conNodes.forEach(n => n.el && n.el.classList.remove('con-selected', 'con-multi-selected', 'con-src'));
        if (typeof conNoteSelected !== 'undefined') {
          conNoteSelected.clear();
          document.querySelectorAll('#constellation-board .con-word-note.wn-selected')
            .forEach(el => el.classList.remove('wn-selected'));
        }
        if (typeof conDrawingSelected !== 'undefined') {
          conDrawingSelected.clear();
          document.querySelectorAll('#constellation-board .con-drawing.con-drawing-selected')
            .forEach(el => el.classList.remove('con-drawing-selected'));
        }
        if (typeof window.conShapeClearSelection === 'function') {
          window.conShapeClearSelection();
        }
        if (typeof window.conMediaClearSelection === 'function') {
          window.conMediaClearSelection();
        } else if (typeof conMediaSelected !== 'undefined' && conMediaSelected) {
          conMediaSelected.clear();
          document.querySelectorAll('#constellation-board .con-media-item.con-media-selected')
            .forEach(el => el.classList.remove('con-media-selected'));
        }
        window._conSelectedEdgeId = null;
        conRedrawEdges();
      }

      function conClipboardDeletePayload(payload) {
        if (!payload) return;

        if (payload.media && payload.media.length) {
          payload.media.forEach(m => {
            const mEl = document.querySelector(`.con-media-item[data-id="${m.id}"]`);
            if (mEl) mEl.remove();
            [conMediaItems, window.conMediaItems, global.conMediaItems].forEach(arr => {
              if (Array.isArray(arr)) {
                for (let i = arr.length - 1; i >= 0; i--) {
                  if (arr[i] && String(arr[i].id) === String(m.id)) arr.splice(i, 1);
                }
              }
            });
            if (typeof conGroups !== 'undefined') {
              conGroups.forEach(g => {
                if (g.mediaIds) g.mediaIds = g.mediaIds.filter(id => String(id) !== String(m.id));
              });
            }
          });
          if (typeof window.conMediaClearSelection === 'function') window.conMediaClearSelection();
          if (typeof conMediaSelected !== 'undefined') conMediaSelected.clear();
          if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          if (typeof window._conMirrorBroadcast === 'function') {
            window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
          }
        }

        if (payload.notes && payload.notes.length) {
          const _liveNotes = (typeof window.conGetNotes === 'function')
            ? window.conGetNotes()
            : ((typeof window.conNotes !== 'undefined' && Array.isArray(window.conNotes))
                ? window.conNotes
                : ((typeof conNotes !== 'undefined' && Array.isArray(conNotes)) ? conNotes : (global.conNotes || [])));
          payload.notes.forEach(n => {
            const nd = _liveNotes.find(x => x && (x.id === n.id || String(x.id) === String(n.id)));
            if (nd) {
              if (typeof window.wnDeleteNoteData === 'function') window.wnDeleteNoteData(nd);
              else if (typeof wnDeleteNoteData === 'function') wnDeleteNoteData(nd);
            }
          });
        }

        if (payload.nodes && payload.nodes.length) {
          payload.nodes.forEach(n => conRemoveNode(n.id));
        }

        if (payload.groups && payload.groups.length) {
          payload.groups.forEach(g => {
            const exists = conGroups.find(x => x.id === g.id);
            if (exists) conGroupDissolve(g.id);
          });
        }

        const cutDrawIds = [];
        if (payload.drawings && payload.drawings.length && typeof conDrawings !== 'undefined') {
          payload.drawings.forEach(d => {
            const dr = conDrawings.find(x => x.id === d.id);
            if (dr && dr.el) dr.el.remove();
            conDrawings = conDrawings.filter(x => x.id !== d.id);
            cutDrawIds.push(String(d.id));
          });
        }

        const cutShapeIds = [];
        if (payload.shapes && payload.shapes.length) {
          const shapesList = (window.conGetShapes ? window.conGetShapes() : (window.conShapes || conShapes)) || [];
          payload.shapes.forEach(s => {
            const sh = shapesList.find(x => x.id === s.id);
            if (sh && sh.el) sh.el.remove();
            for (let i = shapesList.length - 1; i >= 0; i--) {
              if (shapesList[i].id === s.id) shapesList.splice(i, 1);
            }
            if (Array.isArray(conShapes) && conShapes !== shapesList) {
              for (let i = conShapes.length - 1; i >= 0; i--) {
                if (conShapes[i].id === s.id) conShapes.splice(i, 1);
              }
            }
            if (Array.isArray(window.conShapes) && window.conShapes !== shapesList) {
              for (let i = window.conShapes.length - 1; i >= 0; i--) {
                if (window.conShapes[i].id === s.id) window.conShapes.splice(i, 1);
              }
            }
            if (Array.isArray(global.conShapes) && global.conShapes !== shapesList) {
              for (let i = global.conShapes.length - 1; i >= 0; i--) {
                if (global.conShapes[i].id === s.id) global.conShapes.splice(i, 1);
              }
            }
            cutShapeIds.push(String(s.id));
          });
        }
        if (typeof window._conMirrorSend === 'function') {
          if (cutDrawIds.length > 0) window._conMirrorSend({ type: 'drawing-remove', ids: cutDrawIds });
          if (cutShapeIds.length > 0) window._conMirrorSend({ type: 'shape-remove', ids: cutShapeIds });
        }

        conClipboardClearVisualSelection();
      }

      function conClipboardPastePayload(payload) {
        if (!payload || payload.type !== 'constellation-selection') return false;
        const brd = board();
        if (!brd) return false;

        const sourceBounds = payload.bounds || { minX: 0, minY: 0, maxX: 120, maxY: 60 };
        const anchorX = (_lastBoardPastePoint && _lastBoardPastePoint.x) || Number(window._boardCtxNoteX);
        const anchorY = (_lastBoardPastePoint && _lastBoardPastePoint.y) || Number(window._boardCtxNoteY);
        const baseX = Number.isFinite(anchorX) ? anchorX : Math.round(brd.clientWidth / 2);
        const baseY = Number.isFinite(anchorY) ? anchorY : Math.round(brd.clientHeight / 2);
        _conClipboardPasteCount = 0;
        const targetMinX = baseX;
        const targetMinY = baseY;

        const nodeIdMap = new Map();
        const noteIdMap = new Map();

        (payload.nodes || []).forEach(n => {
          const nx = targetMinX + ((Number(n.x) || 0) - sourceBounds.minX);
          const ny = targetMinY + ((Number(n.y) || 0) - sourceBounds.minY);
          const newId = conAddWordAt(n.baseWord || '', nx, ny, n.pageNum != null ? n.pageNum : null);
          const newNode = conNodes.find(x => x.id === newId);
          if (!newNode) return;

          newNode.dbWord = n.dbWord || null;
          newNode.baseWord = n.baseWord || newNode.baseWord;
          newNode.sourceWord = n.sourceWord || null;
          newNode.relation = n.relation || null;
          newNode.fmt = n.fmt ? { ...n.fmt } : {};
          newNode.shape = conNormalizeNodeShape(n.shape || 'rectangle');
          newNode.locked = !!n.locked;
          newNode.masked = !!n.masked;
          newNode.borderWidth = n.borderWidth || null;
          newNode.borderStyle = n.borderStyle || null;
          newNode.highlight = n.highlight || null;
          newNode.preset = n.preset || null;
          newNode.textStrokeColor = n.textStrokeColor || null;
          newNode.textStrokeWidth = n.textStrokeWidth || null;
          newNode.anim = n.anim || '';
          newNode.revealAnim = n.revealAnim || '';
          conApplyEntityAnimClass(newNode.el, newNode.anim, false);

          if (n.bg) newNode.el.style.background = n.bg;
          if (n.color) newNode.el.style.color = n.color;
          if (n.border) newNode.el.style.borderColor = n.border;
          conApplyTextStrokeStyle(newNode.el, newNode.textStrokeWidth, newNode.textStrokeColor);

          newNode.el.classList.toggle('con-masked', !!newNode.masked);
          conSyncNodeLockState(newNode);
          conRenderNodeLabel(newNode);
          if (n.fontSize) conSetNodeBaseFontSize(newNode, n.fontSize);
          conApplyNodeShape(newNode, newNode.shape);
          newNode.rotation = (typeof n.rotation === 'number') ? conNormalizeNodeRotation(n.rotation) : 0;
          conApplyNodeRotation(newNode, newNode.rotation);
          nodeIdMap.set(n.id, newId);
        });

        (payload.edges || []).forEach(e => {
          const a = nodeIdMap.get(e.a);
          const b = nodeIdMap.get(e.b);
          if (!a || !b) return;
          const beforeLen = conEdges.length;
          conAddEdge(a, b, e.type || 'none');
          if (conEdges.length > beforeLen) {
            const edge = conEdges[conEdges.length - 1];
            edge.label = e.label || '';
            edge.labelSize = Number(e.labelSize) || 11;
            edge.labelColor = e.labelColor || '#333333';
            edge.labelWeight = Number(e.labelWeight) || 600;
            edge.dashStyle = e.dashStyle || null;
            if (e.strokeType) edge.strokeType = e.strokeType;
            if (e.routing) edge.routing = e.routing;
            if (typeof e.curvature === 'number') edge.curvature = e.curvature;
            if (typeof e.opacity === 'number') edge.opacity = e.opacity;
            if (e.terminator) edge.terminator = e.terminator;
            if (e.animated !== undefined) edge.animated = !!e.animated;
            if (e.labelBg !== undefined) edge.labelBgActive = !!e.labelBg;
            if (e.anchorA !== undefined) edge.anchorA = e.anchorA || null;
            if (e.anchorB !== undefined) edge.anchorB = e.anchorB || null;
            if (Array.isArray(e.points) && e.points.length > 0) {
              const dxOff = targetMinX - sourceBounds.minX;
              const dyOff = targetMinY - sourceBounds.minY;
              edge.points = e.points.map(p => ({ x: Math.round((Number(p.x) || 0) + dxOff), y: Math.round((Number(p.y) || 0) + dyOff) }));
            }
            if (e.avoidObstacles !== undefined) edge.avoidObstacles = !!e.avoidObstacles;
            if (e.thickness > 0) {
              edge.thickness = Number(e.thickness);
              if (edge.line) edge.line.style.strokeWidth = String(edge.thickness);
              if (edge.hit) edge.hit.style.strokeWidth = String(Math.max(16, edge.thickness + 10));
            }
            if (e.colorMode !== undefined) edge.colorMode = e.colorMode;
            if (e.strokeColor !== undefined) edge.strokeColor = e.strokeColor;
            if (edge.labelEl) edge.labelEl.textContent = edge.label;
            conApplyEdgeLabelStyle(edge);
            conUpdateEdge(edge);
          }
        });

        if (typeof conNotes !== 'undefined') {
          (payload.notes || []).forEach(n => {
            const nx = targetMinX + ((Number(n.x) || 0) - sourceBounds.minX);
            const ny = targetMinY + ((Number(n.y) || 0) - sourceBounds.minY);
            const newId = (typeof window.conGetNextNoteId === 'function') ? window.conGetNextNoteId() : ('cnn' + (conNoteNextId++));
            const mappedNodeId = n.nodeId ? (nodeIdMap.get(n.nodeId) || null) : null;
            const clone = {
              id: newId,
              nodeId: mappedNodeId,
              text: n.text || '',
              html: n.html || '',
              x: nx,
              y: ny,
              color: n.color || '#111111',
              bg: n.bg || '#ffffff',
              fontSize: Number(n.fontSize) || 14,
              bold: !!n.bold,
              italic: !!n.italic,
              underline: !!n.underline,
              strike: !!n.strike,
              hidden: !!n.hidden,
              locked: !!n.locked,
              manualSize: !!n.manualSize,
              width: typeof n.width === 'number' ? n.width : null,
              height: typeof n.height === 'number' ? n.height : null,
              borderWidth: n.borderWidth || null,
              borderStyle: n.borderStyle || null,
              borderColor: n.borderColor || null,
              preset: n.preset || null,
              textAlign: n.textAlign || null
            };
            if (typeof window.conAddNoteObject === 'function') {
              window.conAddNoteObject(clone);
            } else {
              const liveNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : conNotes;
              if (!liveNotes.includes(clone)) liveNotes.push(clone);
              if (typeof conNoteBuild === 'function') conNoteBuild(clone);
            }
            if (mappedNodeId) {
              const linkedNode = conNodes.find(x => x.id === mappedNodeId);
              if (linkedNode && linkedNode.el) {
                linkedNode.el.classList.add('has-con-note');
                if (typeof conUpdateNodeNoteButton === 'function') conUpdateNodeNoteButton(linkedNode);
              }
            }
            noteIdMap.set(n.id, newId);
          });
        }

        const drawingIdMap = new Map();
        if (typeof conDrawingFromData === 'function' && Array.isArray(payload.drawings)) {
          payload.drawings.forEach(d => {
            const dx = targetMinX + ((Number(d.x) || 0) - sourceBounds.minX);
            const dy = targetMinY + ((Number(d.y) || 0) - sourceBounds.minY);
            const newDr = conDrawingFromData({
              ...d,
              id: undefined,
              x: dx,
              y: dy,
              points: Array.isArray(d.points) ? d.points.map(p => (p ? { x: p.x, y: p.y } : null)) : []
            });
            if (newDr && newDr.id && d.id) {
              drawingIdMap.set(d.id, newDr.id);
            }
          });
        }

        const shapeIdMap = new Map();
        if (typeof conShapeFromData === 'function' && Array.isArray(payload.shapes)) {
          const shapeOffsetDx = targetMinX - sourceBounds.minX;
          const shapeOffsetDy = targetMinY - sourceBounds.minY;
          payload.shapes.forEach(s => {
            const sx = targetMinX + ((Number(s.x) || 0) - sourceBounds.minX);
            const sy = targetMinY + ((Number(s.y) || 0) - sourceBounds.minY);
            const newSh = conShapeFromData({
              ...s,
              id: undefined,
              x: sx,
              y: sy,
              lx1: s.lx1 != null ? (Number(s.lx1) + shapeOffsetDx) : undefined,
              ly1: s.ly1 != null ? (Number(s.ly1) + shapeOffsetDy) : undefined,
              lx2: s.lx2 != null ? (Number(s.lx2) + shapeOffsetDx) : undefined,
              ly2: s.ly2 != null ? (Number(s.ly2) + shapeOffsetDy) : undefined,
              pts: Array.isArray(s.pts) ? s.pts.map(p => ({ x: Number(p.x) + shapeOffsetDx, y: Number(p.y) + shapeOffsetDy })) : null
            });
            if (newSh && newSh.id && s.id) {
              shapeIdMap.set(s.id, newSh.id);
            }
          });
        }

        const mediaIdMap = new Map();
        const pastedMediaIds = [];
        if (Array.isArray(payload.media) && payload.media.length > 0) {
          payload.media.forEach(m => {
            const mx = targetMinX + ((Number(m.x) || 0) - sourceBounds.minX);
            const my = targetMinY + ((Number(m.y) || 0) - sourceBounds.minY);
            const newId = 'cm' + (conMediaNextId++);

            let att = (typeof conFindAttachmentById === 'function') ? conFindAttachmentById(m.attachmentId) : null;
            if (!att && (m.dataUrl || m.base64)) {
              _conAttachmentCounter += 1;
              const newAttId = 'att_' + _conAttachmentCounter;
              att = {
                id: newAttId,
                name: (typeof conSanitizeAttachmentName === 'function') ? conSanitizeAttachmentName(m.name || ('pasted-image-' + Date.now() + '.png')) : (m.name || ('pasted-image-' + Date.now() + '.png')),
                mime: m.mime || 'image/png',
                kind: m.kind || 'pics',
                size: 0,
                base64: m.base64 || (m.dataUrl && m.dataUrl.includes(',') ? m.dataUrl.split(',')[1] : ''),
                _cachedDataUrl: m.dataUrl || '',
                relativePath: m.relativePath || ''
              };
              conAttachments.push(att);
              if (typeof conRenderAttachmentSummary === 'function') conRenderAttachmentSummary();
            }

            const clone = {
              id: newId,
              kind: m.kind || (att ? att.kind : 'pics'),
              attachmentId: att ? att.id : (m.attachmentId || null),
              name: m.name || (att ? att.name : 'image'),
              mime: m.mime || (att ? att.mime : 'image/png'),
              relativePath: m.relativePath || (att ? att.relativePath : ''),
              file: (att && att.file) ? att.file : (m.file || null),
              base64: m.base64 || (att ? att.base64 : ''),
              dataUrl: m.dataUrl || (att && att._cachedDataUrl ? att._cachedDataUrl : ''),
              x: Math.max(12, Math.round(mx)),
              y: Math.max(12, Math.round(my)),
              w: Math.max(20, Number(m.w) || 260),
              h: Math.max(20, Number(m.h) || 200),
              locked: false,
              pageNumber: m.pageNumber != null ? m.pageNumber : (att ? att.pageNumber : null),
              pdfZoom: m.pdfZoom != null ? m.pdfZoom : null,
              pdfRotation: m.pdfRotation != null ? m.pdfRotation : null,
              pdfLockSize: !!m.pdfLockSize,
              emojiStickers: Array.isArray(m.emojiStickers) ? JSON.parse(JSON.stringify(m.emojiStickers)) : [],
              borderWidth: m.borderWidth || null,
              borderStyle: m.borderStyle || null,
              borderColor: m.borderColor || null,
              borderRadius: m.borderRadius != null ? m.borderRadius : null,
              opacity: m.opacity != null ? m.opacity : null,
              rotation: m.rotation != null ? m.rotation : 0,
              brightness: m.brightness != null ? m.brightness : null,
              contrast: m.contrast != null ? m.contrast : null,
              saturate: m.saturate != null ? m.saturate : null,
              grayscale: m.grayscale != null ? m.grayscale : null,
              sepia: m.sepia != null ? m.sepia : null,
              invert: m.invert != null ? m.invert : null,
              hueRotate: m.hueRotate != null ? m.hueRotate : null,
              blur: m.blur != null ? m.blur : null,
              hidden: !!m.hidden
            };

            [conMediaItems, window.conMediaItems, global.conMediaItems].forEach(arr => {
              if (Array.isArray(arr) && !arr.includes(clone)) arr.push(clone);
            });

            if (typeof conBuildMediaWidget === 'function') {
              conBuildMediaWidget(clone);
            } else if (typeof window.conBuildMediaWidget === 'function') {
              window.conBuildMediaWidget(clone);
            }

            mediaIdMap.set(m.id, newId);
            pastedMediaIds.push(newId);
          });
        }

        (payload.groups || []).forEach(g => {
          const mappedNodeIds = (g.nodeIds || []).map(id => nodeIdMap.get(id)).filter(Boolean);
          const mappedNoteIds = (g.noteIds || []).map(id => noteIdMap.get(id)).filter(Boolean);
          const mappedMediaIds = (g.mediaIds || []).map(id => mediaIdMap.get(id)).filter(Boolean);
          const mappedDrawingIds = (g.drawingIds || []).map(id => drawingIdMap.get(id)).filter(Boolean);
          const mappedShapeIds = (g.shapeIds || []).map(id => shapeIdMap.get(id)).filter(Boolean);

          const gx = targetMinX + ((Number(g.x) || 0) - sourceBounds.minX);
          const gy = targetMinY + ((Number(g.y) || 0) - sourceBounds.minY);

          let newGroup = conGroupCreate(
            mappedNodeIds,
            gx,
            gy,
            mappedNoteIds,
            mappedDrawingIds,
            mappedShapeIds,
            {
              phraseGroup: !!g.phraseGroup,
              drawingGroup: !!g.drawingGroup,
              invisible: !!g.invisible,
              mediaIds: mappedMediaIds,
              noCtxMenu: true
            }
          );
          if (!newGroup) return;

          newGroup.title = g.title || '';
          newGroup.blink = !!g.blink;
          newGroup.paletteIdx = Number(g.paletteIdx) || 0;
          newGroup.invisible = !!g.invisible;
          newGroup.drawingGroup = !!g.drawingGroup;
          newGroup.phraseGroup = !!g.phraseGroup;
          newGroup._manualW = g.manualW != null ? g.manualW : null;
          newGroup._manualH = g.manualH != null ? g.manualH : null;
          if (newGroup._manualW != null && newGroup._manualH != null) {
            newGroup._px = gx;
            newGroup._py = gy;
          }
          conGroupApplyStyle(newGroup);
          conGroupRefit(newGroup);
          newGroup.el.classList.toggle('con-group-blink', !!newGroup.blink);
          if (newGroup.phraseGroup) {
            // Restore phraseOrder on pasted nodes and re-layout
            (g.nodeIds || []).forEach((origId, i) => {
              const newId = nodeIdMap.get(origId);
              const node = newId ? conNodes.find(n => n.id === newId) : null;
              if (node && node.phraseOrder == null) node.phraseOrder = i;
            });
            requestAnimationFrame(() => conPhraseGroupLayout(newGroup));
          }
        });

        conRedrawEdges();
        conGroupRefitAll();

        const pastedNodeIds = [...nodeIdMap.values()];
        const pastedNoteIds = [...noteIdMap.values()];
        conClipboardClearVisualSelection();
        if (pastedNodeIds.length > 1) {
          conSetMultiSelected(pastedNodeIds);
        } else if (pastedNodeIds.length === 1) {
          conSelect(pastedNodeIds[0]);
        }
        if (typeof conNoteSelected !== 'undefined' && pastedNoteIds.length > 0) {
          pastedNoteIds.forEach(nid => {
            conNoteSelected.add(nid);
            const el = wnGetNoteElementById(nid);
            if (el) el.classList.add('wn-selected');
          });
        }
        if (typeof conMediaSelected !== 'undefined' && pastedMediaIds.length > 0) {
          pastedMediaIds.forEach(mid => {
            conMediaSelected.add(mid);
            const el = document.querySelector(`.con-media-item[data-id="${mid}"]`);
            if (el) el.classList.add('con-media-selected');
          });
        }
        if (typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        }
        return true;
      }

      window.conClipboardCopy = function (opts) {
        if (!conClipboardIsConstellationVisible()) return false;
        if (document.body.classList.contains('laser-active')) return false;
        const allowWhileTyping = !opts || opts.allowWhileTyping !== false;
        if (!allowWhileTyping && conClipboardTypingFocus()) return false;
        const payload = conClipboardBuildPayload();
        if (!payload) {
          if (typeof mdbToast === 'function') mdbToast('ℹ Select words, notes, drawings, shapes, or pictures first.');
          return false;
        }
        _conClipboardWrite(payload);
        _lastConCopiedText = payload.plainText || '';
        _lastConCopyTime = Date.now();
        const textToWrite = payload.plainText || ('[ClassBoard:' + _lastConCopyTime + ']');
        _lastConCopiedOsText = textToWrite;
        if (textToWrite) {
          _conOsClipboardWritePending = true;
          const writePromise = _conWriteOsClipboardText(textToWrite).finally(() => {
            if (_conOsClipboardWritePromise === writePromise) {
              _conOsClipboardWritePending = false;
            }
          });
          _conOsClipboardWritePromise = writePromise;
        }
        const count = (payload.nodes || []).length + (payload.notes || []).length + (payload.groups || []).length + (payload.drawings || []).length + (payload.shapes || []).length + (payload.media || []).length;
        if (typeof mdbToast === 'function') mdbToast(' Copied ' + count + ' item' + (count === 1 ? '' : 's'));
        return true;
      };

      window.conClipboardCut = function (opts) {
        if (!conClipboardIsConstellationVisible()) return false;
        if (document.body.classList.contains('laser-active')) return false;
        const allowWhileTyping = !opts || opts.allowWhileTyping !== false;
        if (!allowWhileTyping && conClipboardTypingFocus()) return false;
        const payload = conClipboardBuildPayload();
        if (!payload) {
          if (typeof mdbToast === 'function') mdbToast('ℹ Select words, notes, drawings, shapes, or pictures first.');
          return false;
        }
        _conClipboardWrite(payload);
        _lastConCopiedText = payload.plainText || '';
        _lastConCopyTime = Date.now();
        const textToWrite = payload.plainText || ('[ClassBoard:' + _lastConCopyTime + ']');
        _lastConCopiedOsText = textToWrite;
        if (textToWrite) {
          _conOsClipboardWritePending = true;
          const writePromise = _conWriteOsClipboardText(textToWrite).finally(() => {
            if (_conOsClipboardWritePromise === writePromise) {
              _conOsClipboardWritePending = false;
            }
          });
          _conOsClipboardWritePromise = writePromise;
        }
        conPushUndo();
        conClipboardDeletePayload(payload);
        const count = (payload.nodes || []).length + (payload.notes || []).length + (payload.groups || []).length + (payload.drawings || []).length + (payload.shapes || []).length + (payload.media || []).length;
        if (typeof mdbToast === 'function') mdbToast('✂ Cut ' + count + ' item' + (count === 1 ? '' : 's'));
        return true;
      };

      window.conClipboardPaste = async function (opts) {
        if (!conClipboardIsConstellationVisible()) return false;
        if (document.body.classList.contains('laser-active')) return false;
        const allowWhileTyping = !opts || opts.allowWhileTyping !== false;
        if (!allowWhileTyping && conClipboardTypingFocus()) return false;

        const brd = board();
        const anchorX = (_lastBoardPastePoint && _lastBoardPastePoint.x) || Number(window._boardCtxNoteX);
        const anchorY = (_lastBoardPastePoint && _lastBoardPastePoint.y) || Number(window._boardCtxNoteY);
        const x = Number.isFinite(anchorX) ? anchorX : (brd ? Math.round(brd.clientWidth / 2 - 60) : 60);
        const y = Number.isFinite(anchorY) ? anchorY : (brd ? Math.round(brd.clientHeight / 2 - 20) : 60);

        if (_conOsClipboardWritePending && _conOsClipboardWritePromise) {
          try { await _conOsClipboardWritePromise; } catch (e) {}
        }

        // 1. Try reading via Desktop / Electron native clipboard first (synchronous & guaranteed)
        let osPlainText = null;
        let osHtml = '';
        let osImageDataUrl = '';

        if (window.Desktop && typeof window.Desktop.clipboardReadText === 'function') {
          try { osPlainText = await window.Desktop.clipboardReadText(); } catch (e) {}
        } else if (window.electronApi && typeof window.electronApi.clipboardReadText === 'function') {
          try { osPlainText = await window.electronApi.clipboardReadText(); } catch (e) {}
        }

        if (window.Desktop && typeof window.Desktop.clipboardReadHtml === 'function') {
          try { osHtml = (await window.Desktop.clipboardReadHtml()) || ''; } catch (e) {}
        } else if (window.electronApi && typeof window.electronApi.clipboardReadHtml === 'function') {
          try { osHtml = (await window.electronApi.clipboardReadHtml()) || ''; } catch (e) {}
        }

        if (window.Desktop && typeof window.Desktop.clipboardReadImage === 'function') {
          try { osImageDataUrl = (await window.Desktop.clipboardReadImage()) || ''; } catch (e) {}
        } else if (window.electronApi && typeof window.electronApi.clipboardReadImage === 'function') {
          try { osImageDataUrl = (await window.electronApi.clipboardReadImage()) || ''; } catch (e) {}
        }

        // 2. Fallback to Web standard navigator.clipboard (for browser mode)
        if (!osImageDataUrl && navigator.clipboard && navigator.clipboard.read) {
          try {
            const clipItems = await navigator.clipboard.read();
            for (const item of clipItems) {
              for (const type of item.types) {
                if (type.startsWith('image/')) {
                  const blob = await item.getType(type);
                  osImageDataUrl = await new Promise((res) => {
                    const r = new FileReader();
                    r.onload = () => res(r.result);
                    r.onerror = () => res('');
                    r.readAsDataURL(blob);
                  });
                  break;
                }
              }
              if (osImageDataUrl) break;
            }
          } catch (e) {}
        }

        if (osPlainText === null && navigator.clipboard && navigator.clipboard.readText) {
          try { osPlainText = await navigator.clipboard.readText(); } catch (e) {}
        }

        const _pasteTarget = _conClipboardRead();
        const hasValidInternalPayload = _pasteTarget && _pasteTarget.type === 'constellation-selection' &&
          ((_pasteTarget.nodes && _pasteTarget.nodes.length) ||
           (_pasteTarget.notes && _pasteTarget.notes.length) ||
           (_pasteTarget.groups && _pasteTarget.groups.length) ||
           (_pasteTarget.drawings && _pasteTarget.drawings.length) ||
           (_pasteTarget.shapes && _pasteTarget.shapes.length) ||
           (_pasteTarget.media && _pasteTarget.media.length));

        const plain = String(osPlainText || '').trim();

        // 3. Disambiguate Internal Board payload vs External Clipboard
        const isInternalCopyMatch = hasValidInternalPayload && (
          !plain ||
          _conOsClipboardWritePending ||
          plain === (_pasteTarget.plainText || '').trim() ||
          plain === (_lastConCopiedText || '').trim() ||
          (_lastConCopiedOsText != null && plain === _lastConCopiedOsText.trim()) ||
          (plain.startsWith('[ClassBoard:') && _lastConCopiedOsText != null && plain === _lastConCopiedOsText.trim())
        );

        if (isInternalCopyMatch) {
          if (!_conClipboard) { _conClipboard = _pasteTarget; _conClipboardPasteCount = 0; }
          conPushUndo();
          const ok = conClipboardPastePayload(_pasteTarget);
          if (ok && typeof mdbToast === 'function') {
            const count = (_pasteTarget.nodes || []).length + (_pasteTarget.notes || []).length + (_pasteTarget.groups || []).length + (_pasteTarget.drawings || []).length + (_pasteTarget.shapes || []).length + (_pasteTarget.media || []).length;
            mdbToast('⎗ Pasted ' + count + ' item' + (count === 1 ? '' : 's'));
          }
          return ok;
        }

        // 4. Handle image paste from OS clipboard (external copy)
        if (osImageDataUrl) {
          try {
            const parts = osImageDataUrl.split(',');
            const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            const blob = new Blob([u8arr], { type: mime });

            const ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
            const name = 'pasted-image-' + Date.now() + '.' + ext;
            _conAttachmentCounter += 1;
            const attachmentId = 'att_' + _conAttachmentCounter;
            conAttachments.push({
              id: attachmentId,
              name: conSanitizeAttachmentName(name),
              mime,
              kind: 'pics',
              size: Number(blob.size) || 0,
              file: blob,
              base64: parts[1] || '',
              _cachedDataUrl: osImageDataUrl,
              relativePath: ''
            });
            conRenderAttachmentSummary();
            const brdEl = document.getElementById('constellation-board');
            const baseW = window._bcImageInsertWidth || 260;
            const baseH = 200;
            const pos = brdEl
              ? {
                x: Math.max(12, Math.round((brdEl.clientWidth - baseW) / 2)),
                y: Math.max(12, Math.round((brdEl.clientHeight - baseH) / 2))
              }
              : { x: 40, y: 40 };
            // conInsertAttachmentById probes natural size internally; just pass position.
            window.conInsertAttachmentById(attachmentId, { x: pos.x, y: pos.y, silent: true });
            if (typeof mdbToast === 'function') mdbToast(' Image pasted onto the board.');
            return true;
          } catch (err) {}
        }

        // 5. Check for Table (HTML / TSV) from OS clipboard
        const mockClip = {
          getData: (t) => t === 'text/html' ? osHtml : (t === 'text/plain' ? (osPlainText || '') : '')
        };
        if (typeof wnPasteAsConTable === 'function' && ((osHtml && osHtml.includes('<table')) || (plain && plain.includes('\t') && plain.includes('\n')))) {
          if (wnPasteAsConTable(mockClip, x, y)) {
            if (typeof mdbToast === 'function') mdbToast(' Pasted table onto the board.');
            return true;
          }
        }

        // 6. External plain text: paste as a new text note
        if (plain) {
          conPushUndo();
          if (window.conCreateTextNote) {
            const note = window.conCreateTextNote(plain, x, y, { fontSize: window._bcNoteFontSizeFree || 24 });
            if (note) {
              conClipboardClearVisualSelection();
              if (typeof conNoteSelected !== 'undefined') {
                conNoteSelected.add(note.id);
                const el = typeof wnGetNoteElementById === 'function' ? wnGetNoteElementById(note.id) : null;
                if (el) el.classList.add('wn-selected');
              }
              if (typeof mdbToast === 'function') mdbToast(' Pasted text note onto the board.');
              return true;
            }
          }
        }

        // 7. If no plain text in OS clipboard but internal payload exists
        if (hasValidInternalPayload) {
          if (!_conClipboard) { _conClipboard = _pasteTarget; _conClipboardPasteCount = 0; }
          conPushUndo();
          const ok = conClipboardPastePayload(_pasteTarget);
          if (ok && typeof mdbToast === 'function') {
            const count = (_pasteTarget.nodes || []).length + (_pasteTarget.notes || []).length + (_pasteTarget.groups || []).length + (_pasteTarget.drawings || []).length + (_pasteTarget.shapes || []).length + (_pasteTarget.media || []).length;
            mdbToast('⎗ Pasted ' + count + ' item' + (count === 1 ? '' : 's'));
          }
          return ok;
        }

        if (typeof mdbToast === 'function') mdbToast('ℹ Clipboard is empty. Copy something first.');
        return false;
      };


      window.conCloseAllContextMenus = function (exceptId) {
        if (exceptId !== 'con-ctx-menu') {
          if (typeof conCtxClose === 'function') conCtxClose(); else if (typeof window.conCtxClose === 'function') window.conCtxClose();
        }
        if (exceptId !== 'con-node-card') {
          if (typeof conCloseNodeWordCard === 'function') conCloseNodeWordCard(); else if (typeof window.conCloseNodeWordCard === 'function') window.conCloseNodeWordCard();
        }
        if (exceptId !== 'con-board-ctx-menu') {
          if (typeof conBoardCtxClose === 'function') conBoardCtxClose(); else if (typeof window.conBoardCtxClose === 'function') window.conBoardCtxClose();
        }
        if (exceptId !== 'con-group-ctx-menu' && typeof window.conGroupCtxClose === 'function') window.conGroupCtxClose();
        if (exceptId !== 'con-edge-ctx-menu' && typeof window.conEdgeCtxClose === 'function') window.conEdgeCtxClose();
        if (exceptId !== 'search-ctx-menu' && typeof window.searchCtxClose === 'function') window.searchCtxClose();
        if (exceptId !== 'wn-ctx-menu') {
          if (typeof window.wnCtxClose === 'function') window.wnCtxClose();
          else {
            const wnMenu = document.getElementById('wn-ctx-menu');
            if (wnMenu) wnMenu.classList.remove('visible');
          }
        }
        if (exceptId !== 'note-ctx-menu') {
          const nMenu = document.getElementById('note-ctx-menu');
          if (nMenu) nMenu.classList.remove('visible');
        }
        if (exceptId !== 'con-media-ctx-menu') {
          const mMenu = document.getElementById('con-media-ctx-menu');
          if (mMenu) mMenu.classList.remove('visible');
        }
        if (exceptId !== 'con-class-dropdown' && typeof window.conCloseClassDropdown === 'function') window.conCloseClassDropdown();
        if (exceptId !== 'save-sync-menu' && typeof window.closeSaveSyncMenu === 'function') window.closeSaveSyncMenu();
        if (!exceptId && window.CmtPopup && typeof window.CmtPopup.closeAll === 'function') window.CmtPopup.closeAll();
      };

      document.addEventListener('click', function (e) {
        if (!e.target.closest('#con-ctx-menu')) conCtxClose();
        if (!e.target.closest('#con-node-card-popup') && !e.target.closest('#con-ctx-card-btn')) conCloseNodeWordCard();
        if (!e.target.closest('#con-fmt-case-btn') && !e.target.closest('#con-ctx-case-dropdown')) {
          const dd = document.getElementById('con-ctx-case-dropdown');
          if (dd) dd.style.display = 'none';
        }
        if (!e.target.closest('#con-ctx-split-btn') && !e.target.closest('#con-ctx-split-dropdown')) {
          const sdd = document.getElementById('con-ctx-split-dropdown');
          if (sdd) sdd.style.display = 'none';
        }
        if (!e.target.closest('#wn-sp-case-btn') && !e.target.closest('#wn-sp-case-dropdown')) {
          const dd = document.getElementById('wn-sp-case-dropdown');
          if (dd) dd.style.display = 'none';
        }
        if (!e.target.closest('#wn-sp-convert-btn') && !e.target.closest('#con-note-convert-modal')) {
          const dd = document.getElementById('con-note-convert-modal');
          if (dd) dd.style.display = 'none';
        }
        if (!_boardMenuLocked && !e.target.closest('#con-board-ctx-menu')) {
          const bmenu = document.getElementById('con-board-ctx-menu');
          if (bmenu && bmenu.classList.contains('visible')) conBoardCtxClose();
        }
        if (!e.target.closest('#con-edge-ctx-menu')) window.conEdgeCtxClose(true);
        if (!e.target.closest('#con-mask-style-overlay')) window.conMaskCtxClose();
        if (!e.target.closest('#wn-ctx-menu') && typeof window.wnCtxClose === 'function') window.wnCtxClose();
        if (!e.target.closest('#con-media-ctx-menu')) {
          const mm = document.getElementById('con-media-ctx-menu');
          if (mm && mm.classList.contains('visible')) mm.classList.remove('visible');
        }
      });
      document.addEventListener('keydown', function (e) {
        if (!e || typeof e.key !== 'string') return;
        if (typeof window.boardDispatchCustomShortcut === 'function' && window.boardDispatchCustomShortcut(e)) return;
        else if (typeof boardDispatchCustomShortcut === 'function' && boardDispatchCustomShortcut(e)) return;
        if (e.key === 'Escape') {
          // 1. First close any active inline confirm popup
          const clearallPop = document.getElementById('con-clearall-popup');
          if (clearallPop) { clearallPop.remove(); return; }

          // 2. Close any open dialogs/overlays (either .active or display !== 'none')
          const overlays = [
            '#char-net-excerpts-overlay', '#character-network-overlay', '#board-rec-preview-overlay',
            '#board-rec-setup-overlay', '#con-bp-all-overlay', '#wn-planner-modal', '#con-crop-overlay',
            '#con-learning-import-overlay', '#new-session-overlay', '#con-close-overlay',
            '#save-filename-overlay', '#session-load-overlay', '#con-template-overlay',
            '#tour-choice-overlay', '#history-delete-overlay', '#history-duplicate-overlay',
            '#history-rename-overlay', '#board-customise-overlay', '#con-pages-overlay',
            '#con-search-overlay', '#con-premade-library-overlay', '#con-merge-choice-overlay',
            '#con-img-convert-overlay', '#con-table-style-overlay', '#con-shape-style-overlay',
            '#con-drawing-style-overlay', '#con-mask-style-overlay', '#wn-style-overlay',
            '#con-img-style-overlay', '#con-pdf-style-overlay', '#con-sound-style-overlay',
            '#con-transcript-overlay',
            '#con-competence-overlay', '#con-class-import-overlay', '#unknown-words-overlay',
            '#con-pdf-picker-overlay', '#con-pdf-page-picker-overlay', '#con-export-settings-overlay',
            '#word-detail-overlay'
          ];
          for (let i = 0; i < overlays.length; i++) {
            const el = document.querySelector(overlays[i]);
            if (el && (el.classList.contains('active') || (el.style.display && el.style.display !== 'none'))) {
              const overlayId = el.id;
              if (overlayId === 'con-transcript-overlay' && typeof window.conCloseTranscriptModal === 'function') { window.conCloseTranscriptModal(); return; }
              if (overlayId === 'char-net-excerpts-overlay' && typeof window.characterNetworkCloseExcerpts === 'function') { window.characterNetworkCloseExcerpts(); return; }
              if (overlayId === 'character-network-overlay' && typeof window.characterNetworkCloseModal === 'function') { window.characterNetworkCloseModal(); return; }
              if (overlayId === 'board-rec-setup-overlay' && typeof window.boardVideoCloseSetup === 'function') { window.boardVideoCloseSetup(); return; }
              if (overlayId === 'board-rec-preview-overlay' && typeof window.boardVideoPromptClosePreview === 'function') { window.boardVideoPromptClosePreview(); return; }
              if (overlayId === 'con-bp-all-overlay' && typeof window.bpAllClose === 'function') { window.bpAllClose(); return; }
              if (overlayId === 'wn-planner-modal' && typeof window.wnpClose === 'function') { window.wnpClose(); return; }
              if (overlayId === 'con-crop-overlay' && typeof window.conCloseCropOverlay === 'function') { window.conCloseCropOverlay(); return; }
              if (overlayId === 'con-learning-import-overlay' && typeof window.conCloseLearningImportModal === 'function') { window.conCloseLearningImportModal(); return; }
              if (overlayId === 'new-session-overlay' && typeof window.newSessionConfirmCancel === 'function') { window.newSessionConfirmCancel(); return; }
              if (overlayId === 'con-close-overlay' && typeof window.conCloseCancel === 'function') { window.conCloseCancel(); return; }
              if (overlayId === 'save-filename-overlay' && typeof window.sfnCancel === 'function') { window.sfnCancel(); return; }
              if (overlayId === 'session-load-overlay' && typeof window.closeSessionLoadPopup === 'function') { window.closeSessionLoadPopup(); return; }
              if (overlayId === 'con-template-overlay' && typeof window.conCloseTemplatePopup === 'function') { window.conCloseTemplatePopup(); return; }
              if (overlayId === 'tour-choice-overlay' && typeof window.closeTourChoice === 'function') { window.closeTourChoice(); return; }
              if (overlayId === 'history-delete-overlay' && typeof window.historyDeleteCancel === 'function') { window.historyDeleteCancel(); return; }
              if (overlayId === 'history-duplicate-overlay' && typeof window.historyDuplicateCancel === 'function') { window.historyDuplicateCancel(); return; }
              if (overlayId === 'history-rename-overlay' && typeof window.historyRenameCancel === 'function') { window.historyRenameCancel(); return; }
              if (overlayId === 'board-customise-overlay' && typeof window.boardCustomiseClose === 'function') { window.boardCustomiseClose(); return; }
              if (overlayId === 'con-pages-overlay' && typeof window.conClosePagePreview === 'function') { window.conClosePagePreview(); return; }
              if (overlayId === 'con-search-overlay' && typeof window.conCloseSearchModal === 'function') { window.conCloseSearchModal(); return; }
              if (overlayId === 'con-premade-library-overlay' && typeof window.conClosePremadeLibraryModal === 'function') { window.conClosePremadeLibraryModal(); return; }
              if (overlayId === 'con-table-style-overlay' && typeof window.conTableCtxClose === 'function') { window.conTableCtxClose(); return; }
              if (overlayId === 'con-shape-style-overlay' && typeof window.conShapeCtxClose === 'function') { window.conShapeCtxClose(); return; }
              if (overlayId === 'con-drawing-style-overlay' && typeof window.conDrawingCtxClose === 'function') { window.conDrawingCtxClose(); return; }
              if (overlayId === 'con-mask-style-overlay' && typeof window.conMaskCtxClose === 'function') { window.conMaskCtxClose(); return; }
              if (overlayId === 'wn-style-overlay' && typeof window.wnStyleClose === 'function') { window.wnStyleClose(); return; }
              if (overlayId === 'con-img-style-overlay' && typeof window.conImgStyleClose === 'function') { window.conImgStyleClose(); return; }
              if (overlayId === 'con-pdf-style-overlay' && typeof window.conPdfStyleClose === 'function') { window.conPdfStyleClose(); return; }
              if (overlayId === 'con-sound-style-overlay' && typeof window.conSoundStyleClose === 'function') { window.conSoundStyleClose(); return; }
              if (overlayId === 'con-competence-overlay' && typeof window.conCloseCompetenceModal === 'function') { window.conCloseCompetenceModal(); return; }
              if (overlayId === 'con-class-import-overlay' && typeof window.conCloseClassImportModal === 'function') { window.conCloseClassImportModal(); return; }
              if (overlayId === 'unknown-words-overlay' && typeof window.unknownWordsClose === 'function') { window.unknownWordsClose(); return; }
              if (overlayId === 'con-pdf-picker-overlay' && typeof window.conPdfPickerClose === 'function') { window.conPdfPickerClose(); return; }
              if (overlayId === 'con-pdf-page-picker-overlay' && typeof window.conPdfPagePickerClose === 'function') { window.conPdfPagePickerClose(); return; }
              if (overlayId === 'con-export-settings-overlay' && typeof window.conCloseExportSettingsModal === 'function') { window.conCloseExportSettingsModal(); return; }
              if (overlayId === 'word-detail-overlay' && typeof window.hideWordDetail === 'function') { window.hideWordDetail(); return; }
              if (overlayId === 'con-merge-choice-overlay' && typeof window.conMergeChoiceCancel === 'function') { window.conMergeChoiceCancel(); return; }
              if (overlayId === 'con-img-convert-overlay' && typeof window.conImgConvertClose === 'function') { window.conImgConvertClose(); return; }
              el.classList.remove('active');
              el.style.display = 'none';
              return;
            }
          }

          // 3. Close open drawing dropdown menus
          const openDrawMenu = document.querySelector('#con-draw-panel .con-draw-drop-menu[style*="display: flex"], #con-draw-panel .con-draw-drop-menu[style*="display: block"]');
          if (openDrawMenu && typeof window.conDrawCloseAllMenus === 'function') {
            window.conDrawCloseAllMenus();
            return;
          }

          // 4. Close open action popovers, context menus & dropdowns
          const timerPop = document.getElementById('con-timer-action-popover');
          if (timerPop && timerPop.style.display !== 'none') {
            if (typeof window.conCloseTimerPopover === 'function') window.conCloseTimerPopover();
            else if (typeof conCloseTimerPopover === 'function') conCloseTimerPopover();
            return;
          }
          const randomPop = document.getElementById('con-random-action-popover');
          if (randomPop && randomPop.style.display !== 'none') {
            if (typeof window.conCloseRandomPopover === 'function') window.conCloseRandomPopover();
            else if (typeof conCloseRandomPopover === 'function') conCloseRandomPopover();
            return;
          }
          const soundPop = document.getElementById('con-sound-action-popover');
          if (soundPop && soundPop.style.display !== 'none') {
            if (typeof window.conCloseSoundPopover === 'function') window.conCloseSoundPopover();
            else if (typeof conCloseSoundPopover === 'function') conCloseSoundPopover();
            return;
          }
          const videoPop = document.getElementById('con-video-action-popover');
          if (videoPop && videoPop.style.display !== 'none') {
            if (typeof window.conCloseVideoPopover === 'function') window.conCloseVideoPopover();
            else if (typeof conCloseVideoPopover === 'function') conCloseVideoPopover();
            return;
          }
          const bpPop = document.getElementById('con-bp-popover');
          if (bpPop && bpPop.style.display !== 'none') {
            if (typeof window.bpClose === 'function') window.bpClose();
            else if (typeof bpClose === 'function') bpClose();
            return;
          }

          const openCtx = document.querySelector('#con-ctx-menu.visible, #con-board-ctx-menu.visible, #con-group-ctx-menu.visible, #con-edge-ctx-menu[style*="display: flex"], #search-ctx-menu.visible, #wn-ctx-menu.visible, #note-ctx-menu.visible, #con-media-ctx-menu.visible, #con-class-dropdown.open, #save-sync-menu.open');
          if (openCtx) {
            if (typeof window.conCloseAllContextMenus === 'function') window.conCloseAllContextMenus();
            return;
          }

          // 5. Close transient sub-popups
          if (typeof window.conCloseNoteConvertModal === 'function') window.conCloseNoteConvertModal();
          if (typeof window.conRelPickerClose === 'function') window.conRelPickerClose();
          if (typeof window.conDefPickerClose === 'function') window.conDefPickerClose();
          if (typeof window.conTransPickerClose === 'function') window.conTransPickerClose();

          // 6. Cancel transient interactive states
          if (document.body.classList.contains('laser-active')) { if (typeof window.laserToggle === 'function') window.laserToggle(); return; }
          if (_conLinkSrc) { if (typeof _conCancelLinkMode === 'function') _conCancelLinkMode(); else if (typeof window.conCancelLinkMode === 'function') window.conCancelLinkMode(); return; }
          if (typeof _polygonInProgress !== 'undefined' && _polygonInProgress && typeof window._conPolygonReset === 'function') {
            window._conPolygonReset();
            return;
          }

          // 7. Finally, exit draw mode if active
          const activeMode = (typeof window.conGetMode === 'function') ? window.conGetMode() : conMode;
          if (activeMode === 'draw') {
            if (typeof window.conSetMode === 'function') window.conSetMode('move');
            return;
          }
          if (typeof _taDrawActive !== 'undefined' && _taDrawActive && typeof window.taToggleDrawMode === 'function') { window.taToggleDrawMode(); return; }
        }
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && (document.activeElement.isContentEditable || (document.activeElement.closest && document.activeElement.closest('[contenteditable="true"]'))))) return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          e.preventDefault();
          if (typeof conRedo === 'function') conRedo();
          else if (typeof window.conRedo === 'function') window.conRedo();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && (document.activeElement.isContentEditable || (document.activeElement.closest && document.activeElement.closest('[contenteditable="true"]'))))) return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          e.preventDefault();
          if (typeof conUndo === 'function') conUndo();
          else if (typeof window.conUndo === 'function') window.conUndo();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          e.preventDefault();
          if (typeof conSaveSession === 'function') conSaveSession();
          else if (typeof window.conSaveSession === 'function') window.conSaveSession();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'a') {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          if (document.activeElement && document.activeElement.isContentEditable) return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          e.preventDefault();
          if (typeof window.conSelectAll === 'function') {
            window.conSelectAll();
          } else if (typeof window.conSelectAllNodes === 'function') {
            window.conSelectAllNodes();
          }
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          e.preventDefault();
          if (typeof conGroupSelected === 'function') conGroupSelected(e.shiftKey);
          else if (typeof window.conGroupSelected === 'function') window.conGroupSelected(e.shiftKey);
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'h') {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          if (document.activeElement && document.activeElement.isContentEditable) return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          e.preventDefault();
          if (typeof window.conToggleMaskSelected === 'function') {
            window.conToggleMaskSelected();
          }
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'c') {
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          if (typeof window.conClipboardCopy === 'function' && window.conClipboardCopy({ allowWhileTyping: false })) e.preventDefault();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'x') {
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          if (typeof window.conClipboardCut === 'function' && window.conClipboardCut({ allowWhileTyping: false })) e.preventDefault();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'v') {
          // Image paste (from system clipboard) and node paste are both handled
          // in the 'paste' event listener below, which fires after this keydown.
          // Nothing to do here — just let the paste event handle it.
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          if (document.activeElement && document.activeElement.isContentEditable) return;
          const conSec = document.getElementById('constellation-section');
          if (conSec && !conSec.classList.contains('hidden')) {
            e.preventDefault();
            if (typeof window.conToggleDrawMode === 'function') window.conToggleDrawMode();
            return;
          }
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          if (document.activeElement && document.activeElement.isContentEditable) return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          e.preventDefault();
          if (typeof window.conSetMode === 'function') window.conSetMode('move');
          return;
        }
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.key || '').toLowerCase() === 'h') {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          if (document.activeElement && document.activeElement.isContentEditable) return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          e.preventDefault();
          if (typeof window.conToggleHandMode === 'function') {
            window.conToggleHandMode();
          } else if (typeof setBoardMode === 'function') {
            setBoardMode('hand');
          }
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'j') {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          if (document.activeElement && document.activeElement.isContentEditable && !document.activeElement.closest('.con-word-note')) return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          e.preventDefault();
          if (typeof window.conTriggerLinkShortcut === 'function') {
            window.conTriggerLinkShortcut();
            return;
          }
          // Fallback if conTriggerLinkShortcut is not yet defined
          const srcIds = [];
          const pushSrc = id => {
            if (!id) return;
            const s = String(id);
            if (!srcIds.includes(s)) srcIds.push(s);
          };
          const noteSet = (typeof conNoteSelected !== 'undefined' && conNoteSelected) ? conNoteSelected : (typeof window.conGetNoteSelected === 'function' ? window.conGetNoteSelected() : null);
          if (noteSet && noteSet.size) noteSet.forEach(pushSrc);
          if (typeof conSelected !== 'undefined' && conSelected) pushSrc(conSelected);
          else if (typeof window.conGetSelected === 'function' && window.conGetSelected()) pushSrc(window.conGetSelected());
          const multiSet = (typeof conMultiSelected !== 'undefined' && conMultiSelected) ? conMultiSelected : (typeof window.conGetMultiSelected === 'function' ? window.conGetMultiSelected() : null);
          if (multiSet && multiSet.size) multiSet.forEach(pushSrc);
          const drawSet = (typeof conDrawingSelected !== 'undefined' && conDrawingSelected) ? conDrawingSelected : (typeof window.conGetDrawingSelected === 'function' ? window.conGetDrawingSelected() : null);
          if (drawSet && drawSet.size) drawSet.forEach(pushSrc);
          const mediaSet = (typeof conMediaSelected !== 'undefined' && conMediaSelected) ? conMediaSelected : (typeof window.conGetMediaSelected === 'function' ? window.conGetMediaSelected() : null);
          if (mediaSet && mediaSet.size) mediaSet.forEach(pushSrc);
          if (!srcIds.length && document.activeElement && document.activeElement.closest('.con-word-note')) {
            const an = document.activeElement.closest('.con-word-note');
            if (an && an.dataset && an.dataset.id) pushSrc(an.dataset.id);
          }
          if (!srcIds.length) {
            document.querySelectorAll('#constellation-board .con-word-note.wn-selected').forEach(el => { if (el.dataset && el.dataset.id) pushSrc(el.dataset.id); });
            document.querySelectorAll('#constellation-board .con-node.con-selected, #constellation-board .con-node.con-multi-selected').forEach(el => { if (el.id) pushSrc(el.id); });
            document.querySelectorAll('#constellation-board .con-drawing.con-drawing-selected').forEach(el => { if (el.dataset && el.dataset.did) pushSrc(el.dataset.did); });
            document.querySelectorAll('#constellation-board .con-media-item.con-media-selected').forEach(el => { if (el.dataset && el.dataset.id) pushSrc(el.dataset.id); });
          }
          if (!srcIds.length) {
            if (typeof conGroupFocused !== 'undefined' && conGroupFocused) pushSrc(conGroupFocused);
            else if (typeof window.conGetGroupFocused === 'function' && window.conGetGroupFocused()) pushSrc(window.conGetGroupFocused());
          }
          if (!srcIds.length) return;
          const curIds = (_conLinkSrcIds && _conLinkSrcIds.length) ? _conLinkSrcIds : (_conLinkSrc ? [String(_conLinkSrc)] : []);
          const isSameSet = curIds.length === srcIds.length && srcIds.every(id => curIds.includes(id));
          // Toggle off if Ctrl+J pressed again on the same source(s)
          if (isSameSet) {
            if (typeof _conCancelLinkMode === 'function') _conCancelLinkMode();
            else if (typeof window.conCancelLinkMode === 'function') window.conCancelLinkMode();
            return;
          }
          if (typeof _conStartLinkMode === 'function') _conStartLinkMode(srcIds);
          else if (typeof window._conStartLinkMode === 'function') window._conStartLinkMode(srcIds);
          return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          const tag = document.activeElement && document.activeElement.tagName;
          const _inType = tag === 'INPUT' ? String(document.activeElement.type || 'text').toLowerCase() : '';
          if (tag === 'TEXTAREA' || (tag === 'INPUT' && !/^(range|checkbox|radio|button|color)$/.test(_inType))) return;
          const isNoteEd = document.activeElement && (document.activeElement.classList.contains('wn-note-editor') || (document.activeElement.closest && document.activeElement.closest('.wn-note-editor, .con-word-note, .ta-word-note')));
          if (document.activeElement && document.activeElement.isContentEditable && !isNoteEd) return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          const hasSelection = (typeof conSelected !== 'undefined' && conSelected) ||
            (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0) ||
            (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0) ||
            (typeof _wnActiveNote !== 'undefined' && _wnActiveNote) ||
            isNoteEd;
          if (!hasSelection) return;
          e.preventDefault();
          if (typeof window.conAdjustSelectedFontSize === 'function') {
            window.conAdjustSelectedFontSize(e.key === 'ArrowUp' ? 1 : -1);
          }
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          if (document.activeElement && document.activeElement.isContentEditable) return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          const hasSelection = (typeof conSelected !== 'undefined' && conSelected) ||
            (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0) ||
            (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0);
          if (!hasSelection) return;
          e.preventDefault();
          if (typeof window.conCtxAlignSelected === 'function') {
            window.conCtxAlignSelected('vertical', e.key === 'ArrowRight' ? 'right' : 'left');
          } else if (typeof conCtxAlignSelected === 'function') {
            conCtxAlignSelected('vertical', e.key === 'ArrowRight' ? 'right' : 'left');
          }
          return;
        }
        if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          if (document.activeElement && document.activeElement.isContentEditable) return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          if (typeof window._boardNudgeSelected === 'function' && window._boardNudgeSelected(dx, dy)) {
            e.preventDefault();
            return;
          }
          const hasSelection = (typeof conSelected !== 'undefined' && conSelected) ||
            (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0) ||
            (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0);
          if (!hasSelection) return;
          e.preventDefault();
          const targets = (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0)
            ? conNodes.filter(n => conMultiSelected.has(n.id))
            : [conNodes.find(n => n.id === conSelected)].filter(Boolean);
          if (!targets.length) return;
          if (typeof conPushUndo === 'function') conPushUndo();
          else if (typeof window.conPushUndo === 'function') window.conPushUndo();
          // Collect phrase groups whose anchor moved so we can re-layout them once
          const movedPhraseGroups = new Set();
          const nodeIsLocked = typeof conIsNodeLocked === 'function' ? conIsNodeLocked : (window.conIsNodeLocked || function () { return false; });
          const groupOf = typeof conGroupOfNode === 'function' ? conGroupOfNode : (window.conGroupOfNode || function () { return null; });
          const layoutPhrase = typeof conPhraseGroupLayout === 'function' ? conPhraseGroupLayout : (window.conPhraseGroupLayout || function () {});
          targets.forEach(node => {
            if (nodeIsLocked(node)) return;
            const pg = groupOf(node.id);
            if (pg && pg.phraseGroup) {
              movedPhraseGroups.add(pg);
              // Only move once per phrase group via the anchor node (phraseOrder 0)
              if ((node.phraseOrder || 0) !== 0) return;
              const anchor = conNodes.find(n => pg.nodeIds.includes(n.id) && (n.phraseOrder || 0) === 0);
              if (anchor) {
                anchor.x += dx; anchor.y += dy;
                anchor.el.style.left = anchor.x + 'px';
                anchor.el.style.top = anchor.y + 'px';
              }
            } else {
              node.x += dx; node.y += dy;
              node.el.style.left = node.x + 'px';
              node.el.style.top = node.y + 'px';
            }
          });
          movedPhraseGroups.forEach(pg => layoutPhrase(pg));
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
          else if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
          if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          else if (typeof window.conGroupRefitAll === 'function') window.conGroupRefitAll();
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const tag = document.activeElement && document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          const ce = document.activeElement && document.activeElement.isContentEditable;
          if (ce) return;
          const sec = document.getElementById('constellation-section');
          if (!sec || sec.classList.contains('hidden')) return;
          if (typeof conPushUndo === 'function') conPushUndo();
          else if (typeof window.conPushUndo === 'function') window.conPushUndo();
          // Delete selected edge / connection line
          if (window._conSelectedEdgeId) {
            const edgeToDelete = window._conSelectedEdgeId;
            window._conSelectedEdgeId = null;
            if (typeof conRemoveEdge === 'function') conRemoveEdge(edgeToDelete);
            else if (typeof window.conRemoveEdge === 'function') window.conRemoveEdge(edgeToDelete);
            if (typeof conRedrawEdges === 'function') conRedrawEdges();
            else if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
            e.preventDefault();
            return;
          }
          // Delete focused group and all its contents
          const focusedGroup = typeof conGroupFocused !== 'undefined' ? conGroupFocused : (window.conGroupFocused || null);
          if (focusedGroup) {
            const deleteGrp = typeof conGroupDeleteWithContents === 'function' ? conGroupDeleteWithContents : (window.conGroupDeleteWithContents || function () {});
            const focusGrp = typeof conGroupFocus === 'function' ? conGroupFocus : (window.conGroupFocus || function () {});
            deleteGrp(focusedGroup);
            focusGrp(null);
            e.preventDefault();
            return;
          }
          // Delete selected nodes
          if (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 1) {
            [...conMultiSelected].forEach(id => {
              if (typeof conRemoveNode === 'function') conRemoveNode(id);
              else if (typeof window.conRemoveNode === 'function') window.conRemoveNode(id);
            });
            conMultiSelected.clear();
          } else if (typeof conSelected !== 'undefined' && conSelected) {
            if (typeof conRemoveNode === 'function') conRemoveNode(conSelected);
            else if (typeof window.conRemoveNode === 'function') window.conRemoveNode(conSelected);
          }
          // Delete selected drawings
          if (typeof window.conDrawingDeleteSelected === 'function' && typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 0) {
            window.conDrawingDeleteSelected();
          } else if (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 0) {
            const _delDrawIds = conDrawingSelected;
            const _delDrawIdsArr = [..._delDrawIds].map(String);
            _delDrawIdsArr.forEach(did => {
              try {
                const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(did) : did.replace(/["\\]/g, '\\$&');
                document.querySelectorAll('#constellation-board .con-drawing[data-did="' + escaped + '"], .con-drawing[data-did="' + escaped + '"]').forEach(el => {
                  try { el.remove(); } catch (_) {}
                });
              } catch (_) {}
            });
            const delSet = new Set(_delDrawIdsArr);
            [conDrawings, global.conDrawings, window.conDrawings].forEach(arr => {
              if (Array.isArray(arr)) {
                for (let i = arr.length - 1; i >= 0; i--) {
                  if (arr[i] && delSet.has(String(arr[i].id))) arr.splice(i, 1);
                }
              }
            });
            conDrawingSelected.clear();
            // Sync deletion to mirror without DOM teardown
            if (typeof window._conMirrorSend === 'function' && _delDrawIdsArr.length > 0) {
              window._conMirrorSend({ type: 'drawing-remove', ids: _delDrawIdsArr });
            }
          }
          // Delete selected shapes
          if (window.conGetShapeSelected) {
            const shapeSel = window.conGetShapeSelected();
            if (shapeSel && shapeSel.size > 0) {
              const _delShapeIds = new Set(shapeSel);
              const _delShapeIdsArr = [..._delShapeIds].map(String);
              const shapesList = (window.conGetShapes ? window.conGetShapes() : (window.conShapes || conShapes)) || [];
              shapesList.forEach(s => { if (_delShapeIds.has(s.id) && s.el) s.el.remove(); });
              for (let i = shapesList.length - 1; i >= 0; i--) {
                if (_delShapeIds.has(shapesList[i].id)) shapesList.splice(i, 1);
              }
              if (Array.isArray(conShapes) && conShapes !== shapesList) {
                for (let i = conShapes.length - 1; i >= 0; i--) {
                  if (_delShapeIds.has(conShapes[i].id)) conShapes.splice(i, 1);
                }
              }
              if (Array.isArray(window.conShapes) && window.conShapes !== shapesList) {
                for (let i = window.conShapes.length - 1; i >= 0; i--) {
                  if (_delShapeIds.has(window.conShapes[i].id)) window.conShapes.splice(i, 1);
                }
              }
              if (Array.isArray(global.conShapes) && global.conShapes !== shapesList) {
                for (let i = global.conShapes.length - 1; i >= 0; i--) {
                  if (_delShapeIds.has(global.conShapes[i].id)) global.conShapes.splice(i, 1);
                }
              }
              conGroups.forEach(g => { if (g.shapeIds) g.shapeIds = g.shapeIds.filter(id => !_delShapeIds.has(id)); });
              if (typeof window.conShapeClearSelection === 'function') window.conShapeClearSelection();
              // Sync deletion to mirror without DOM teardown
              if (typeof window._conMirrorSend === 'function' && _delShapeIdsArr.length > 0) {
                window._conMirrorSend({ type: 'shape-remove', ids: _delShapeIdsArr });
              }
            }
          }
          // Delete selected notes
          const _liveNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : ((typeof conNotes !== 'undefined') ? conNotes : (window.conNotes || []));
          const delNote = typeof wnDeleteNoteData === 'function' ? wnDeleteNoteData : (window.wnDeleteNoteData || function () {});
          const _targetNoteIds = new Set();
          if (typeof conNoteSelected !== 'undefined' && conNoteSelected) {
            conNoteSelected.forEach(id => _targetNoteIds.add(id));
          }
          if (typeof window.conGetNoteSelected === 'function') {
            const wSel = window.conGetNoteSelected();
            if (wSel) wSel.forEach(id => _targetNoteIds.add(id));
          }
          document.querySelectorAll('#constellation-board .con-word-note.wn-selected').forEach(el => {
            if (el.dataset && el.dataset.id) _targetNoteIds.add(el.dataset.id);
          });
          if (_targetNoteIds.size > 0) {
            [..._targetNoteIds].forEach(nid => {
              const nd = _liveNotes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
              if (nd && typeof delNote === 'function') {
                delNote(nd);
              } else {
                const el = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nid) : document.querySelector(`.con-word-note[data-id="${nid}"]`);
                if (el) el.remove();
              }
            });
            if (typeof conNoteSelected !== 'undefined' && conNoteSelected) conNoteSelected.clear();
            if (typeof window.conGetNoteSelected === 'function' && window.conGetNoteSelected()) window.conGetNoteSelected().clear();
          }
          e.preventDefault();
        }
      });

      // ---- Unified Document Paste Handler ----
      document.addEventListener('paste', function (e) {
        // Only act when the constellation section is visible
        const sec = document.getElementById('constellation-section');
        if (!sec || sec.classList.contains('hidden')) return;

        // Don't intercept paste inside text inputs / contenteditable / note editors
        const target = e.target;
        if (target && target.closest('.wn-note-editor, textarea, input, select, [contenteditable="true"]')) return;
        const ae = document.activeElement;
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT' || ae.isContentEditable)) return;

        // Block all paste when laser pointer is active
        if (document.body.classList.contains('laser-active')) return;

        const clip = (e.clipboardData || window.clipboardData);
        if (!clip) return;

        const text = clip.getData ? clip.getData('text/plain') : '';
        const html = clip.getData ? clip.getData('text/html') : '';
        const plain = String(text || '').trim();

        // 1. Check for Internal Board Clipboard first if it matches
        const _pasteTarget = _conClipboardRead();
        const hasValidInternalPayload = _pasteTarget && _pasteTarget.type === 'constellation-selection' &&
          ((_pasteTarget.nodes && _pasteTarget.nodes.length) ||
           (_pasteTarget.notes && _pasteTarget.notes.length) ||
           (_pasteTarget.groups && _pasteTarget.groups.length) ||
           (_pasteTarget.drawings && _pasteTarget.drawings.length) ||
           (_pasteTarget.shapes && _pasteTarget.shapes.length) ||
           (_pasteTarget.media && _pasteTarget.media.length));

        // If internal payload was copied and the OS clipboard matches the copied text,
        // or hasn't changed since copy, or is empty, paste the internal payload
        const isInternalCopyMatch = hasValidInternalPayload && (
          !plain ||
          _conOsClipboardWritePending ||
          plain === (_pasteTarget.plainText || '').trim() ||
          plain === (_lastConCopiedText || '').trim() ||
          (_lastConCopiedOsText != null && plain === _lastConCopiedOsText.trim()) ||
          (plain.startsWith('[ClassBoard:') && _lastConCopiedOsText != null && plain === _lastConCopiedOsText.trim())
        );

        if (isInternalCopyMatch) {
          e.preventDefault();
          if (!_conClipboard) { _conClipboard = _pasteTarget; _conClipboardPasteCount = 0; }
          conPushUndo();
          const ok = conClipboardPastePayload(_pasteTarget);
          if (ok && typeof mdbToast === 'function') {
            const count = (_pasteTarget.nodes || []).length + (_pasteTarget.notes || []).length + (_pasteTarget.groups || []).length + (_pasteTarget.drawings || []).length + (_pasteTarget.shapes || []).length + (_pasteTarget.media || []).length;
            mdbToast('⎗ Pasted ' + count + ' item' + (count === 1 ? '' : 's'));
          }
          return;
        }

        // 2. Check for image attachments from system clipboard (external copy)
        const items = clip.items || [];
        const imageItems = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.startsWith('image/')) {
            imageItems.push(items[i]);
          }
        }
        if (imageItems.length > 0) {
          e.preventDefault();
          imageItems.forEach((clipItem, idx) => {
            const file = clipItem.getAsFile();
            if (!file) return;

            const ext = (file.name && file.name.includes('.'))
              ? file.name.split('.').pop()
              : (clipItem.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
            const name = 'pasted-image-' + Date.now() + (idx > 0 ? '-' + idx : '') + '.' + ext;

            _conAttachmentCounter += 1;
            const attachmentId = 'att_' + _conAttachmentCounter;
            conAttachments.push({
              id: attachmentId,
              name: conSanitizeAttachmentName(name),
              mime: clipItem.type,
              kind: 'pics',
              size: Number(file.size) || 0,
              file,
              relativePath: ''
            });
            conRenderAttachmentSummary();

            const board = document.getElementById('constellation-board');
            const baseW = window._bcImageInsertWidth || 260;
            const baseH = 200;
            const pos = board
              ? {
                x: Math.max(12, Math.round((board.clientWidth - baseW) / 2 + idx * 20)),
                y: Math.max(12, Math.round((board.clientHeight - baseH) / 2 + idx * 20))
              }
              : { x: 40 + idx * 20, y: 40 + idx * 20 };

            // conInsertAttachmentById probes natural size internally; just pass position.
            window.conInsertAttachmentById(attachmentId, { x: pos.x, y: pos.y, silent: true });
            if (typeof mdbToast === 'function') mdbToast(' Image pasted onto the board.');
          });
          return;
        }

        const brd = board();
        const anchorX = (_lastBoardPastePoint && _lastBoardPastePoint.x) || window._boardCtxNoteX;
        const anchorY = (_lastBoardPastePoint && _lastBoardPastePoint.y) || window._boardCtxNoteY;
        const x = Number.isFinite(anchorX) ? anchorX : (brd ? Math.round(brd.clientWidth / 2) : 100);
        const y = Number.isFinite(anchorY) ? anchorY : (brd ? Math.round(brd.clientHeight / 2) : 100);

        // 3. Check for Table data (HTML <table> or TSV)
        if (typeof wnPasteAsConTable === 'function' && (html.includes('<table') || (plain.includes('\t') && plain.includes('\n')))) {
          if (wnPasteAsConTable(clip, x, y)) {
            e.preventDefault();
            return;
          }
        }

        // 4. External plain text: check for URL first, otherwise paste as a new text note
        if (plain) {
          e.preventDefault();
          conPushUndo();

          if (/^https?:\/\/[^\s]+$/i.test(plain) && typeof window.conAddLinkNodeAt === 'function') {
            let domain = '';
            try { domain = new URL(plain).hostname.replace(/^www\./i, ''); } catch (_) { domain = 'Web Link'; }
            const newId = window.conAddLinkNodeAt({
              title: domain,
              url: plain,
              linkType: 'web',
              subtitle: domain,
              tags: ['#web']
            }, x, y);
            _conSyncWebBookmark(domain, plain, ['#web'], null).then(bm => {
              if (bm && bm.id) {
                const n = conNodes.find(it => it && it.id === newId);
                if (n) { n.bookmarkId = bm.id; n.linkUrn = 'cmt:bookmark:' + bm.id; }
              }
            });
            if (typeof showToast === 'function') showToast('Created link node from URL');
            return;
          }

          if (window.conCreateTextNote) {
            const note = window.conCreateTextNote(plain, x, y, { fontSize: window._bcNoteFontSizeFree || 24 });
            if (note) {
              conClipboardClearVisualSelection();
              if (typeof conNoteSelected !== 'undefined') {
                conNoteSelected.add(note.id);
                const el = typeof wnGetNoteElementById === 'function' ? wnGetNoteElementById(note.id) : null;
                if (el) el.classList.add('wn-selected');
              }
              if (typeof mdbToast === 'function') mdbToast(' Pasted text note onto the board.');
            }
          }
          return;
        }

        // 5. If no plain text in OS clipboard but internal payload exists, paste internal payload
        if (hasValidInternalPayload) {
          e.preventDefault();
          if (!_conClipboard) { _conClipboard = _pasteTarget; _conClipboardPasteCount = 0; }
          conPushUndo();
          const ok = conClipboardPastePayload(_pasteTarget);
          if (ok && typeof mdbToast === 'function') {
            const count = (_pasteTarget.nodes || []).length + (_pasteTarget.notes || []).length + (_pasteTarget.groups || []).length + (_pasteTarget.drawings || []).length + (_pasteTarget.shapes || []).length + (_pasteTarget.media || []).length;
            mdbToast('⎗ Pasted ' + count + ' item' + (count === 1 ? '' : 's'));
          }
        }
      });

      // ---- Merge selected drawings/shapes into a single multi-stroke drawing ----
      function _conShapeToAbsPoints(s) {
        const pts = [];
        if (s.type === 'rect') {
          pts.push({ x: s.x, y: s.y });
          pts.push({ x: s.x + s.w, y: s.y });
          pts.push({ x: s.x + s.w, y: s.y + s.h });
          pts.push({ x: s.x, y: s.y + s.h });
          pts.push({ x: s.x, y: s.y });
        } else if (s.type === 'circle' || s.type === 'ellipse') {
          const cx = s.x + s.w / 2, cy = s.y + s.h / 2, rx = s.w / 2, ry = s.h / 2;
          for (let i = 0; i <= 32; i++) { const t = (2 * Math.PI * i) / 32; pts.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) }); }
        } else if (s.type === 'diamond') {
          const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
          pts.push({ x: cx, y: s.y });
          pts.push({ x: s.x + s.w, y: cy });
          pts.push({ x: cx, y: s.y + s.h });
          pts.push({ x: s.x, y: cy });
          pts.push({ x: cx, y: s.y });
        } else if (s.type === 'line' || s.type === 'arrow') {
          pts.push({ x: s.lx1, y: s.ly1 }); pts.push({ x: s.lx2, y: s.ly2 });
          if (s.type === 'arrow') {
            const angle = Math.atan2(s.ly2 - s.ly1, s.lx2 - s.lx1), hs = Math.max(10, (s.thickness || 2) * 4);
            pts.push(null);
            pts.push({ x: s.lx2 - hs * Math.cos(angle - Math.PI / 6), y: s.ly2 - hs * Math.sin(angle - Math.PI / 6) });
            pts.push({ x: s.lx2, y: s.ly2 });
            pts.push({ x: s.lx2 - hs * Math.cos(angle + Math.PI / 6), y: s.ly2 - hs * Math.sin(angle + Math.PI / 6) });
          }
        } else if (s.type === 'polygon' && s.pts) {
          s.pts.forEach(p => pts.push({ x: p.x, y: p.y }));
          if (s.pts.length > 0) pts.push({ x: s.pts[0].x, y: s.pts[0].y }); // close
        }
        return pts;
      }

      function conMergeSelectedToDrawing() {
        const drawingIds = [...conDrawingSelected];
        const shapeIds = window.conGetShapeSelected ? [...window.conGetShapeSelected()] : [];
        if (drawingIds.length + shapeIds.length < 2) return false;
        conPushUndo();
        const strokes = [];
        let mergeColor = '#333333', mergeThickness = 4, mergeOpacity = 1, first = true;
        drawingIds.forEach(did => {
          const d = conDrawings.find(x => x.id === did); if (!d) return;
          if (first) { mergeColor = d.color; mergeThickness = d.thickness; mergeOpacity = Number.isFinite(d.opacity) ? d.opacity : 1; first = false; }
          let cur = [];
          d.points.forEach(p => {
            if (p === null || p === undefined) { if (cur.length) { strokes.push(cur); cur = []; } }
            else { cur.push({ x: d.x + p.x, y: d.y + p.y }); }
          });
          if (cur.length) strokes.push(cur);
        });
        const shapesList = (window.conGetShapes ? window.conGetShapes() : (window.conShapes || conShapes)) || [];
        shapeIds.forEach(sid => {
          const s = shapesList.find(x => x.id === sid); if (!s) return;
          if (first) { mergeColor = s.color || '#333333'; mergeThickness = s.thickness || 2; mergeOpacity = Number.isFinite(s.opacity) ? s.opacity : 1; first = false; }
          const absPts = _conShapeToAbsPoints(s);
          let cur = [];
          absPts.forEach(p => {
            if (p === null) { if (cur.length) { strokes.push(cur); cur = []; } }
            else { cur.push(p); }
          });
          if (cur.length) strokes.push(cur);
        });
        if (!strokes.length) return false;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        strokes.forEach(sk => sk.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }));
        const mergedPoints = [];
        strokes.forEach((sk, i) => { if (i > 0) mergedPoints.push(null); sk.forEach(p => mergedPoints.push({ x: p.x - minX, y: p.y - minY })); });
        const newId = 'cd' + (_conDrawNextId++);
        // Remove originals
        drawingIds.forEach(did => {
          const d = conDrawings.find(x => x.id === did);
          if (d && d.el) d.el.remove();
          conDrawings = conDrawings.filter(x => x.id !== did);
          conGroups.forEach(g => { if (g.drawingIds) g.drawingIds = g.drawingIds.filter(id => id !== did); });
        });
        shapeIds.forEach(sid => {
          const s = shapesList.find(x => x.id === sid);
          if (s && s.el) s.el.remove();
          for (let i = shapesList.length - 1; i >= 0; i--) {
            if (shapesList[i].id === sid) shapesList.splice(i, 1);
          }
          if (Array.isArray(conShapes) && conShapes !== shapesList) {
            for (let i = conShapes.length - 1; i >= 0; i--) {
              if (conShapes[i].id === sid) conShapes.splice(i, 1);
            }
          }
          if (Array.isArray(window.conShapes) && window.conShapes !== shapesList) {
            for (let i = window.conShapes.length - 1; i >= 0; i--) {
              if (window.conShapes[i].id === sid) window.conShapes.splice(i, 1);
            }
          }
          if (Array.isArray(global.conShapes) && global.conShapes !== shapesList) {
            for (let i = global.conShapes.length - 1; i >= 0; i--) {
              if (global.conShapes[i].id === sid) global.conShapes.splice(i, 1);
            }
          }
          conGroups.forEach(g => { if (g.shapeIds) g.shapeIds = g.shapeIds.filter(id => id !== sid); });
        });
        conDrawingSelected.clear();
        if (window.conShapeClearSelection) window.conShapeClearSelection();
        // Build merged drawing
        const merged = conDrawingFromData({ id: newId, x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY), points: mergedPoints, color: mergeColor, thickness: mergeThickness, opacity: mergeOpacity });
        if (merged && merged.el) { merged.el.classList.add('con-drawing-selected'); conDrawingSelected.add(merged.id); }
        return true;
      }

      // ---- Ctrl+G: group selected nodes and spread them ----
      function conGroupSelected(invisible) {
        // Collect the ids to group
        const selNotesSet = (typeof window.conGetNoteSelected === 'function' && window.conGetNoteSelected())
          ? window.conGetNoteSelected()
          : (typeof conNoteSelected !== 'undefined' ? conNoteSelected : (window.conNoteSelected || new Set()));
        const noteIds = [...selNotesSet];
        const drawingIds = [...conDrawingSelected];
        const shapeIds = window.conGetShapeSelected ? [...window.conGetShapeSelected()] : [];
        const selMediaSet = (typeof window.conGetMediaSelected === 'function' && window.conGetMediaSelected())
          ? window.conGetMediaSelected()
          : (typeof conMediaSelected !== 'undefined' ? conMediaSelected : (window.conMediaSelected || new Set()));
        const mediaIds = [...selMediaSet];
        document.querySelectorAll('.con-media-item.con-media-selected').forEach(el => {
          const mid = el.dataset.id;
          if (mid && !mediaIds.includes(mid)) mediaIds.push(mid);
        });

        // If ONLY drawings/shapes/media are selected (no word-nodes, no notes) → create a borderless drawing group or media group
        const _onlyNonTextSel = conMultiSelected.size === 0 && !conSelected && noteIds.length === 0;
        if (_onlyNonTextSel) {
          const _dIds = drawingIds;
          const _sIds = shapeIds;
          const _mIds = mediaIds;
          if (_dIds.length + _sIds.length + _mIds.length >= 2) {
            conPushUndo();
            const newGroup = conGroupCreate([], undefined, undefined, [], _dIds, _sIds, {
              drawingGroup: (_mIds.length === 0),
              invisible: !!invisible,
              mediaIds: _mIds
            });
            if (newGroup) {
              const gEl = newGroup.el;
              const gRect = gEl.getBoundingClientRect();
              const fakeEvt = { clientX: gRect.right - 10, clientY: gRect.top + 10, preventDefault: () => { }, stopPropagation: () => { } };
              setTimeout(() => conGroupCtxOpen(fakeEvt, newGroup.id), 80);
            }
            return;
          }
        }
        conPushUndo();
        let ids = [];
        if (conMultiSelected.size > 0) {
          ids = [...conMultiSelected];
          if (conSelected && !ids.includes(conSelected)) ids.push(conSelected);
        } else if (conSelected) {
          // Single node selected — include it plus every node already in its group
          const existing = conGroupOfNode(conSelected);
          ids = existing ? [...existing.nodeIds] : [conSelected];
        } else {
          ids = [];
        }

        const totalItems = ids.length + noteIds.length + drawingIds.length + shapeIds.length + mediaIds.length;
        if (totalItems < 2) return;

        // Expand phrase groups: if any selected node belongs to a phrase group,
        // pull in ALL sibling nodes of that phrase so the whole phrase is grouped together.
        {
          const expanded = new Set(ids);
          ids.forEach(id => {
            const pg = conGroups.find(g => g.phraseGroup && g.nodeIds.includes(id));
            if (pg) pg.nodeIds.forEach(nid => expanded.add(nid));
          });
          ids = [...expanded];
        }

        // Merge all involved nodes into one group (handles existing group memberships)
        // Phrase groups are structural — never repurpose them as a regular group.
        let targetGroup = null;
        ids.forEach(id => {
          const g = conGroups.find(gg => !gg.phraseGroup && gg.nodeIds.includes(id));
          if (!targetGroup) {
            if (g) {
              targetGroup = g;
            }
          } else if (g && g.id !== targetGroup.id) {
            // Merge g into targetGroup
            g.nodeIds.filter(nid => !targetGroup.nodeIds.includes(nid))
              .forEach(nid => targetGroup.nodeIds.push(nid));
            conGroupDissolve(g.id);
          }
        });
        if (!targetGroup) {
          noteIds.forEach(nid => {
            const g = conGroups.find(gg => !gg.phraseGroup && (gg.noteIds || []).includes(nid));
            if (!targetGroup && g) targetGroup = g;
          });
        }
        if (!targetGroup) {
          mediaIds.forEach(mid => {
            const g = conGroups.find(gg => !gg.phraseGroup && (gg.mediaIds || []).includes(mid));
            if (!targetGroup && g) targetGroup = g;
          });
        }
        if (!targetGroup) {
          if (totalItems < 2) return;
          targetGroup = conGroupCreate(ids, undefined, undefined, noteIds, drawingIds, shapeIds, { invisible: !!invisible, mediaIds });
        } else {
          ids.forEach(id => { if (!targetGroup.nodeIds.includes(id)) targetGroup.nodeIds.push(id); });
          // Merge in selected notes, drawings, shapes, and media items
          noteIds.forEach(nid => { if (!(targetGroup.noteIds || []).includes(nid)) (targetGroup.noteIds = targetGroup.noteIds || []).push(nid); });
          drawingIds.forEach(did => { if (!(targetGroup.drawingIds || []).includes(did)) (targetGroup.drawingIds = targetGroup.drawingIds || []).push(did); });
          shapeIds.forEach(sid => { if (!(targetGroup.shapeIds || []).includes(sid)) (targetGroup.shapeIds = targetGroup.shapeIds || []).push(sid); });
          mediaIds.forEach(mid => { if (!(targetGroup.mediaIds || []).includes(mid)) (targetGroup.mediaIds = targetGroup.mediaIds || []).push(mid); });
          if (invisible) targetGroup.invisible = true;
          conGroupApplyStyle(targetGroup);
          conGroupRefit(targetGroup);
          conSpreadGroup(targetGroup);
        }
        if (!targetGroup) return;

        // Open the group context menu so the user can name/colour it right away
        const gEl = targetGroup.el;
        const gRect = gEl.getBoundingClientRect();
        const fakeEvt = {
          clientX: gRect.right - 10,
          clientY: gRect.top + 10,
          preventDefault: () => { }, stopPropagation: () => { }
        };
        setTimeout(() => conGroupCtxOpen(fakeEvt, targetGroup.id), 80);
      }

      // =========================================================================
      // UNIVERSAL ENTITY NUMBERING SYSTEM (Nodes, Notes, Groups, Media)
      // =========================================================================

      window.conNumberingMode = false;

      function conFormatSequenceBadge(num, format) {
        const n = parseInt(num, 10);
        if (isNaN(n) || n <= 0) return String(num || '');
        const fmt = format || window._bcEntityNumberFormat || 'arabic';

        if (fmt === 'roman-upper' || fmt === 'roman-lower') {
          const romanMatrix = [
            [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
            [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
            [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
          ];
          let val = n;
          let res = '';
          for (let i = 0; i < romanMatrix.length; i++) {
            while (val >= romanMatrix[i][0]) {
              res += romanMatrix[i][1];
              val -= romanMatrix[i][0];
            }
          }
          return (fmt === 'roman-lower') ? res.toLowerCase() : res;
        }

        if (fmt === 'alpha-upper' || fmt === 'alpha-lower') {
          let val = n;
          let res = '';
          while (val > 0) {
            val--;
            res = String.fromCharCode(65 + (val % 26)) + res;
            val = Math.floor(val / 26);
          }
          return (fmt === 'alpha-lower') ? res.toLowerCase() : res;
        }

        return String(n);
      }

      function conApplyEntityBadge(el, number, format, entityType) {
        if (!el) return;
        let badge = el.querySelector(':scope > .con-entity-num-badge');
        if (number == null || number === '') {
          if (badge) badge.remove();
          return;
        }
        const text = conFormatSequenceBadge(number, format);
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'con-entity-num-badge';
          badge.dataset.entityType = entityType || 'node';
          badge.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            const raw = parseInt(badge.dataset.rawNumber, 10);
            if (!isNaN(raw)) {
              if (typeof conPushUndo === 'function') conPushUndo();
              conSetEntityNumberByElement(el, null);
            }
          });
          el.appendChild(badge);
        }
        badge.textContent = text;
        badge.dataset.rawNumber = String(number);
        badge.dataset.entityFormat = format || 'arabic';
        if (text.length > 2) {
          const baseSize = (typeof window._bcEntityNumberSize === 'number') ? window._bcEntityNumberSize : 22;
          const baseFont = Math.round(baseSize * 0.5);
          badge.style.fontSize = Math.max(8, baseFont - (text.length - 2) * 2) + 'px';
          badge.style.minWidth = (baseSize + (text.length - 2) * 6) + 'px';
          badge.style.height = baseSize + 'px';
        } else {
          badge.style.fontSize = '';
          badge.style.minWidth = '';
          badge.style.height = '';
        }
      }

      function conRemoveEntityBadge(el) {
        if (!el) return;
        const badge = el.querySelector(':scope > .con-entity-num-badge');
        if (badge) badge.remove();
      }

      function conGetSelectedEntities() {
        const list = [];
        const allNodes = (typeof window.conGetNodes === 'function') ? window.conGetNodes() : (window.conNodes || conNodes || []);
        const allNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : (window.conNotes || []);
        const allGroups = (typeof window.conGetGroups === 'function') ? window.conGetGroups() : (window.conGroups || conGroups || []);
        const allMedia = (typeof window.conGetMediaItems === 'function') ? window.conGetMediaItems() : (window.conMediaItems || conMediaItems || []);

        const multiSel = window.conMultiSelected || conMultiSelected || new Set();
        const selNotes = (typeof window.conGetNoteSelected === 'function' && window.conGetNoteSelected())
          ? window.conGetNoteSelected() : (window.conNoteSelected || new Set());
        const selMedia = (typeof window.conGetMediaSelected === 'function' && window.conGetMediaSelected())
          ? window.conGetMediaSelected() : (window.conMediaSelected || conMediaSelected || new Set());

        if (multiSel.size > 0) {
          multiSel.forEach(id => {
            const n = allNodes.find(item => item && (item.id === id || String(item.id) === String(id)));
            if (n && n.el) list.push({ type: 'node', id: n.id, obj: n, el: n.el, x: n.x || 0, y: n.y || 0 });
          });
        } else if (window.conSelected || conSelected) {
          const sid = window.conSelected || conSelected;
          const n = allNodes.find(item => item && (item.id === sid || String(item.id) === String(sid)));
          if (n && n.el) list.push({ type: 'node', id: n.id, obj: n, el: n.el, x: n.x || 0, y: n.y || 0 });
        }

        selNotes.forEach(id => {
          const note = allNotes.find(item => item && (item.id === id || String(item.id) === String(id)));
          const noteEl = (note && note.el) || (typeof wnGetNoteElementById === 'function' && wnGetNoteElementById(id));
          if (note && noteEl) list.push({ type: 'note', id: note.id, obj: note, el: noteEl, x: note.x || 0, y: note.y || 0 });
        });

        selMedia.forEach(id => {
          const m = allMedia.find(item => item && (item.id === id || String(item.id) === String(id)));
          const mEl = (m && m.el) || document.querySelector(`.con-media-item[data-id="${id}"]`);
          if (m && mEl) list.push({ type: 'media', id: m.id, obj: m, el: mEl, x: m.x || 0, y: m.y || 0 });
        });

        allGroups.forEach(grp => {
          if (grp && grp.el && (grp.el.classList.contains('con-group-focused') || grp.el.classList.contains('con-group-selected') || grp.el.classList.contains('active'))) {
            list.push({ type: 'group', id: grp.id, obj: grp, el: grp.el, x: grp.x || 0, y: grp.y || 0 });
          }
        });

        return list;
      }

      function conGetMaxEntityNumber() {
        let max = 0;
        const allNodes = (typeof window.conGetNodes === 'function') ? window.conGetNodes() : (window.conNodes || conNodes || []);
        const allNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : (window.conNotes || []);
        const allGroups = (typeof window.conGetGroups === 'function') ? window.conGetGroups() : (window.conGroups || conGroups || []);
        const allMedia = (typeof window.conGetMediaItems === 'function') ? window.conGetMediaItems() : (window.conMediaItems || conMediaItems || []);

        allNodes.forEach(n => { if (n && typeof n.nodeNumber === 'number' && n.nodeNumber > max) max = n.nodeNumber; });
        allNotes.forEach(n => { if (n && typeof n.noteNumber === 'number' && n.noteNumber > max) max = n.noteNumber; });
        allGroups.forEach(g => { if (g && typeof g.groupNumber === 'number' && g.groupNumber > max) max = g.groupNumber; });
        allMedia.forEach(m => { if (m && typeof m.mediaNumber === 'number' && m.mediaNumber > max) max = m.mediaNumber; });
        return max;
      }

      function conSetEntityNumberByElement(el, num, preferredFormat) {
        if (!el) return;
        const fmt = preferredFormat || window._bcEntityNumberFormat || 'arabic';
        const allNodes = (typeof window.conGetNodes === 'function') ? window.conGetNodes() : (window.conNodes || conNodes || []);
        const allNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : (window.conNotes || []);
        const allGroups = (typeof window.conGetGroups === 'function') ? window.conGetGroups() : (window.conGroups || conGroups || []);
        const allMedia = (typeof window.conGetMediaItems === 'function') ? window.conGetMediaItems() : (window.conMediaItems || conMediaItems || []);

        if (el.classList.contains('con-node')) {
          const n = allNodes.find(item => item && (item.el === el || item.id === el.id));
          if (n) {
            n.nodeNumber = num;
            n.nodeNumberFormat = fmt;
            conApplyEntityBadge(el, num, fmt, 'node');
            if (typeof window._conMirrorSend === 'function') {
              window._conMirrorSend({ type: 'entity-number', entityType: 'node', entityId: n.id, number: num, format: fmt });
            }
          }
        } else if (el.classList.contains('wn-note') || el.classList.contains('con-word-note')) {
          const noteId = el.dataset.id || el.id;
          const note = allNotes.find(item => item && (item.id === noteId || String(item.id) === String(noteId)));
          if (note) {
            note.noteNumber = num;
            note.noteNumberFormat = fmt;
            conApplyEntityBadge(el, num, fmt, 'note');
            if (typeof window._conMirrorSend === 'function') {
              window._conMirrorSend({ type: 'entity-number', entityType: 'note', entityId: note.id, number: num, format: fmt });
            }
          }
        } else if (el.classList.contains('con-group') || el.classList.contains('con-group-box')) {
          const gid = el.dataset.gid || el.id;
          const grp = allGroups.find(item => item && (item.id === gid || String(item.id) === String(gid)));
          if (grp) {
            grp.groupNumber = num;
            grp.groupNumberFormat = fmt;
            conApplyEntityBadge(el, num, fmt, 'group');
            if (typeof window._conMirrorSend === 'function') {
              window._conMirrorSend({ type: 'entity-number', entityType: 'group', entityId: grp.id, number: num, format: fmt });
            }
          }
        } else if (el.classList.contains('con-media-item')) {
          const mid = el.dataset.id || el.id;
          const media = allMedia.find(item => item && (item.id === mid || String(item.id) === String(mid)));
          if (media) {
            media.mediaNumber = num;
            media.mediaNumberFormat = fmt;
            conApplyEntityBadge(el, num, fmt, 'media');
            if (typeof window._conMirrorSend === 'function') {
              window._conMirrorSend({ type: 'entity-number', entityType: 'media', entityId: media.id, number: num, format: fmt });
            }
          }
        }

        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
      }

      function conGetMaxEntityNumberOutside(selectedList) {
        let max = 0;
        const selIds = new Set((selectedList || []).map(s => String(s.id)));
        const allNodes = (typeof window.conGetNodes === 'function') ? window.conGetNodes() : (window.conNodes || conNodes || []);
        const allNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : (window.conNotes || []);
        const allGroups = (typeof window.conGetGroups === 'function') ? window.conGetGroups() : (window.conGroups || conGroups || []);
        const allMedia = (typeof window.conGetMediaItems === 'function') ? window.conGetMediaItems() : (window.conMediaItems || conMediaItems || []);

        allNodes.forEach(n => {
          if (n && !selIds.has(String(n.id)) && typeof n.nodeNumber === 'number' && n.nodeNumber > max) {
            max = n.nodeNumber;
          }
        });
        allNotes.forEach(n => {
          if (n && !selIds.has(String(n.id)) && typeof n.noteNumber === 'number' && n.noteNumber > max) {
            max = n.noteNumber;
          }
        });
        allGroups.forEach(g => {
          if (g && !selIds.has(String(g.id)) && typeof g.groupNumber === 'number' && g.groupNumber > max) {
            max = g.groupNumber;
          }
        });
        allMedia.forEach(m => {
          if (m && !selIds.has(String(m.id)) && typeof m.mediaNumber === 'number' && m.mediaNumber > max) {
            max = m.mediaNumber;
          }
        });
        return max;
      }

      function conCloseNumberingChoiceToast() {
        const toast = document.getElementById('con-numbering-choice-toast');
        if (toast) {
          if (toast._onDocClick) {
            document.removeEventListener('pointerdown', toast._onDocClick, true);
          }
          toast.remove();
        }
      }

      function conShowNumberingChoiceToast(opts) {
        conCloseNumberingChoiceToast();
        if (!opts) return;

        const tMsg = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('conNumberConflictMsg') : 'Numbers already exist on the board:';
        const tContinue = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('conNumberChoiceContinue') : 'Continue number';
        const tKeep = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('conNumberChoiceKeepOld') : 'Keep old and start new';
        const tClear = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('conNumberChoiceClearOld') : 'Clear old and start new';
        const tCustom = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('conNumberChoiceCustom') : 'Use custom number';

        const toast = document.createElement('div');
        toast.id = 'con-numbering-choice-toast';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        const header = document.createElement('div');
        header.className = 'con-numbering-toast-header';

        const icon = document.createElement('img');
        icon.src = '../assets/icons/page-number.svg';
        icon.className = 'btn-icon';
        icon.alt = '';
        icon.style.width = '16px';
        icon.style.height = '16px';
        icon.style.margin = '0';
        header.appendChild(icon);

        const msgSpan = document.createElement('span');
        msgSpan.className = 'con-numbering-toast-msg';
        msgSpan.textContent = tMsg;
        header.appendChild(msgSpan);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'action-btn btn-grey con-numbering-toast-close';
        closeBtn.title = 'Dismiss';
        closeBtn.setAttribute('aria-label', 'Dismiss');
        closeBtn.textContent = 'x';
        closeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          conCloseNumberingChoiceToast();
        });
        header.appendChild(closeBtn);

        const actions = document.createElement('div');
        actions.className = 'con-numbering-toast-actions';

        const continueBtn = document.createElement('button');
        continueBtn.type = 'button';
        continueBtn.className = 'action-btn con-numbering-choice-btn con-btn-continue';
        continueBtn.textContent = tContinue;
        continueBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          conCloseNumberingChoiceToast();
          if (typeof opts.onChoice === 'function') opts.onChoice('continue');
        });
        actions.appendChild(continueBtn);

        const keepBtn = document.createElement('button');
        keepBtn.type = 'button';
        keepBtn.className = 'action-btn btn-grey con-numbering-choice-btn con-btn-keep';
        keepBtn.textContent = tKeep;
        keepBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          conCloseNumberingChoiceToast();
          if (typeof opts.onChoice === 'function') opts.onChoice('keep');
        });
        actions.appendChild(keepBtn);

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'action-btn btn-grey con-numbering-choice-btn con-btn-clear';
        clearBtn.textContent = tClear;
        clearBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          conCloseNumberingChoiceToast();
          if (typeof opts.onChoice === 'function') opts.onChoice('clear');
        });
        actions.appendChild(clearBtn);

        const customWrap = document.createElement('div');
        customWrap.className = 'con-numbering-custom-wrap';

        const customInput = document.createElement('input');
        customInput.type = 'number';
        customInput.min = '1';
        customInput.step = '1';
        customInput.className = 'con-numbering-custom-input';
        customInput.value = String((typeof opts.defaultCustom === 'number' && opts.defaultCustom > 0) ? opts.defaultCustom : 1);
        customInput.setAttribute('aria-label', tCustom);

        const submitCustom = function () {
          const val = parseInt(customInput.value, 10);
          const startNum = (!isNaN(val) && val > 0) ? val : 1;
          conCloseNumberingChoiceToast();
          if (typeof opts.onChoice === 'function') opts.onChoice('custom', startNum);
        };

        customInput.addEventListener('keydown', function (e) {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            submitCustom();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            conCloseNumberingChoiceToast();
          }
        });

        const customBtn = document.createElement('button');
        customBtn.type = 'button';
        customBtn.className = 'action-btn btn-grey con-numbering-choice-btn con-btn-custom';
        customBtn.textContent = tCustom;
        customBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          submitCustom();
        });

        customWrap.appendChild(customInput);
        customWrap.appendChild(customBtn);
        actions.appendChild(customWrap);

        toast.appendChild(header);
        toast.appendChild(actions);

        const onDocClick = function (e) {
          if (!toast.contains(e.target)) {
            conCloseNumberingChoiceToast();
          }
        };
        toast._onDocClick = onDocClick;
        setTimeout(() => {
          document.addEventListener('pointerdown', onDocClick, true);
        }, 120);

        document.body.appendChild(toast);
      }

      function conNumberSelectedEntities(preferredFormat, startFromNum) {
        const selected = conGetSelectedEntities();
        if (selected.length === 0) return;
        if (typeof window.conPushUndo === 'function') window.conPushUndo();

        const fmt = preferredFormat || window._bcEntityNumberFormat || 'arabic';
        const start = (typeof startFromNum === 'number' && startFromNum > 0) ? startFromNum : 1;

        // Sort top-to-bottom, left-to-right (reading order)
        selected.sort((a, b) => {
          const dy = (a.y || 0) - (b.y || 0);
          if (Math.abs(dy) > 30) return dy;
          return (a.x || 0) - (b.x || 0);
        });

        selected.forEach((item, index) => {
          const num = start + index;
          if (item.type === 'node') { item.obj.nodeNumber = num; item.obj.nodeNumberFormat = fmt; }
          else if (item.type === 'note') { item.obj.noteNumber = num; item.obj.noteNumberFormat = fmt; }
          else if (item.type === 'group') { item.obj.groupNumber = num; item.obj.groupNumberFormat = fmt; }
          else if (item.type === 'media') { item.obj.mediaNumber = num; item.obj.mediaNumberFormat = fmt; }
          conApplyEntityBadge(item.el, num, fmt, item.type);

          if (typeof window._conMirrorSend === 'function') {
            window._conMirrorSend({ type: 'entity-number', entityType: item.type, entityId: item.id, number: num, format: fmt });
          }
        });

        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
      }

      function conToggleNumberingMode(force, preferredFormat) {
        if (force !== undefined) window.conNumberingMode = !!force;
        else window.conNumberingMode = !window.conNumberingMode;

        const btn = document.getElementById('con-number-btn');
        if (btn) btn.classList.toggle('active', !!window.conNumberingMode);
        document.body.classList.toggle('con-numbering-active', !!window.conNumberingMode);

        let pill = document.getElementById('con-numbering-status-pill');
        if (window.conNumberingMode) {
          if (!pill) {
            pill = document.createElement('div');
            pill.id = 'con-numbering-status-pill';
            document.body.appendChild(pill);
          }
          const tMsg = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('conNumberingModeActive') : 'Numbering Mode Active — Click elements to number sequentially, Esc to exit';
          pill.innerHTML = `
            <img src="../assets/icons/page-number.svg" style="width:16px;height:16px;" alt="" />
            <span>${tMsg}</span>
            <button type="button" class="action-btn btn-grey" onclick="conExitNumberingMode()" style="padding:2px 8px;font-size:0.75rem;margin-left:6px;"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>
          `;
          pill.style.display = 'inline-flex';
        } else {
          conCloseNumberingChoiceToast();
          window._conNumberingSeq = null;
          if (pill) pill.remove();
        }
      }

      function conExitNumberingMode() {
        conCloseNumberingChoiceToast();
        if (window.conNumberingMode) {
          conToggleNumberingMode(false);
        }
      }

      function conTriggerEntityNumbering(preferredFormat) {
        const selected = conGetSelectedEntities();
        const maxNum = conGetMaxEntityNumber();
        const hasExisting = maxNum > 0;

        if (selected.length > 0) {
          if (!hasExisting) {
            conNumberSelectedEntities(preferredFormat, 1);
            return;
          }
          const outsideMax = conGetMaxEntityNumberOutside(selected);
          const defaultCustom = (outsideMax > 0 ? outsideMax : maxNum) + 1;
          conShowNumberingChoiceToast({
            mode: 'selection',
            defaultCustom: defaultCustom,
            onChoice: function (choice, customStartNum) {
              if (choice === 'continue') {
                conNumberSelectedEntities(preferredFormat, defaultCustom);
              } else if (choice === 'keep') {
                conNumberSelectedEntities(preferredFormat, 1);
              } else if (choice === 'clear') {
                conClearEntityNumbers('all');
                conNumberSelectedEntities(preferredFormat, 1);
              } else if (choice === 'custom') {
                conNumberSelectedEntities(preferredFormat, customStartNum);
              }
            }
          });
        } else {
          if (window.conNumberingMode) {
            conToggleNumberingMode(false);
            return;
          }
          if (!hasExisting) {
            window._conNumberingSeq = 1;
            conToggleNumberingMode(true, preferredFormat);
            return;
          }
          conShowNumberingChoiceToast({
            mode: 'interactive',
            defaultCustom: maxNum + 1,
            onChoice: function (choice, customStartNum) {
              if (choice === 'continue') {
                window._conNumberingSeq = maxNum + 1;
                conToggleNumberingMode(true, preferredFormat);
              } else if (choice === 'keep') {
                window._conNumberingSeq = 1;
                conToggleNumberingMode(true, preferredFormat);
              } else if (choice === 'clear') {
                conClearEntityNumbers('all');
                window._conNumberingSeq = 1;
                conToggleNumberingMode(true, preferredFormat);
              } else if (choice === 'custom') {
                window._conNumberingSeq = (typeof customStartNum === 'number' && customStartNum > 0) ? customStartNum : 1;
                conToggleNumberingMode(true, preferredFormat);
              }
            }
          });
        }
      }

      function conHandleEntityClickForNumbering(entityType, entityObj, el, e) {
        if (!window.conNumberingMode) return false;
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (typeof window.conPushUndo === 'function') window.conPushUndo();

        const badge = el ? el.querySelector(':scope > .con-entity-num-badge') : null;
        let currentNum = null;
        if (entityType === 'node' && entityObj) currentNum = entityObj.nodeNumber;
        else if (entityType === 'note' && entityObj) currentNum = entityObj.noteNumber;
        else if (entityType === 'group' && entityObj) currentNum = entityObj.groupNumber;
        else if (entityType === 'media' && entityObj) currentNum = entityObj.mediaNumber;

        if (currentNum != null || badge) {
          // Toggle off
          conSetEntityNumberByElement(el, null);
        } else {
          // Assign next
          let next;
          if (typeof window._conNumberingSeq === 'number') {
            next = window._conNumberingSeq++;
          } else {
            next = conGetMaxEntityNumber() + 1;
          }
          conSetEntityNumberByElement(el, next, window._bcEntityNumberFormat || 'arabic');
        }
        return true;
      }

      function conClearEntityNumbers(scope) {
        if (typeof window.conPushUndo === 'function') window.conPushUndo();
        const allNodes = (typeof window.conGetNodes === 'function') ? window.conGetNodes() : (window.conNodes || conNodes || []);
        const allNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : (window.conNotes || []);
        const allGroups = (typeof window.conGetGroups === 'function') ? window.conGetGroups() : (window.conGroups || conGroups || []);
        const allMedia = (typeof window.conGetMediaItems === 'function') ? window.conGetMediaItems() : (window.conMediaItems || conMediaItems || []);

        if (scope === 'selection') {
          const selected = conGetSelectedEntities();
          selected.forEach(item => {
            conSetEntityNumberByElement(item.el, null);
          });
        } else {
          // Clear all across board
          allNodes.forEach(n => {
            if (n.nodeNumber != null) {
              n.nodeNumber = null;
              if (n.el) conRemoveEntityBadge(n.el);
              if (typeof window._conMirrorSend === 'function') {
                window._conMirrorSend({ type: 'entity-number', entityType: 'node', entityId: n.id, number: null });
              }
            }
          });
          allNotes.forEach(n => {
            if (n.noteNumber != null) {
              n.noteNumber = null;
              const nEl = n.el || (typeof wnGetNoteElementById === 'function' && wnGetNoteElementById(n.id));
              if (nEl) conRemoveEntityBadge(nEl);
              if (typeof window._conMirrorSend === 'function') {
                window._conMirrorSend({ type: 'entity-number', entityType: 'note', entityId: n.id, number: null });
              }
            }
          });
          allGroups.forEach(g => {
            if (g.groupNumber != null) {
              g.groupNumber = null;
              if (g.el) conRemoveEntityBadge(g.el);
              if (typeof window._conMirrorSend === 'function') {
                window._conMirrorSend({ type: 'entity-number', entityType: 'group', entityId: g.id, number: null });
              }
            }
          });
          allMedia.forEach(m => {
            if (m.mediaNumber != null) {
              m.mediaNumber = null;
              const mEl = m.el || document.querySelector(`.con-media-item[data-id="${m.id}"]`);
              if (mEl) conRemoveEntityBadge(mEl);
              if (typeof window._conMirrorSend === 'function') {
                window._conMirrorSend({ type: 'entity-number', entityType: 'media', entityId: m.id, number: null });
              }
            }
          });
        }

        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
      }

      window.conFormatSequenceBadge = global.conFormatSequenceBadge = conFormatSequenceBadge;
      window.conApplyEntityBadge = global.conApplyEntityBadge = conApplyEntityBadge;
      window.conRemoveEntityBadge = global.conRemoveEntityBadge = conRemoveEntityBadge;
      window.conGetSelectedEntities = global.conGetSelectedEntities = conGetSelectedEntities;
      window.conGetMaxEntityNumber = global.conGetMaxEntityNumber = conGetMaxEntityNumber;
      window.conGetMaxEntityNumberOutside = global.conGetMaxEntityNumberOutside = conGetMaxEntityNumberOutside;
      window.conShowNumberingChoiceToast = global.conShowNumberingChoiceToast = conShowNumberingChoiceToast;
      window.conCloseNumberingChoiceToast = global.conCloseNumberingChoiceToast = conCloseNumberingChoiceToast;
      window.conSetEntityNumberByElement = global.conSetEntityNumberByElement = conSetEntityNumberByElement;
      window.conNumberSelectedEntities = global.conNumberSelectedEntities = conNumberSelectedEntities;
      window.conToggleNumberingMode = global.conToggleNumberingMode = conToggleNumberingMode;
      window.conExitNumberingMode = global.conExitNumberingMode = conExitNumberingMode;
      window.conTriggerEntityNumbering = global.conTriggerEntityNumbering = conTriggerEntityNumbering;
      window.conHandleEntityClickForNumbering = global.conHandleEntityClickForNumbering = conHandleEntityClickForNumbering;
      window.conClearEntityNumbers = global.conClearEntityNumbers = conClearEntityNumbers;

      // Init mode buttons on load
      function _initBoardNodesOnLoad() {
        conSetMode('move');
        conInitSwatches();
        conInitBorderSwatches();
        conInitPresetButtons();
        conSetDefaultWordFontSize(conDefaultNewWordFontSize);
        if (typeof window.conSyncAllUnitControls === 'function') window.conSyncAllUnitControls();
        if (typeof conRenderHeaderCompetenceBar === 'function') conRenderHeaderCompetenceBar();
        if (typeof _ensureMirrorControlMenu === 'function') _ensureMirrorControlMenu();
        if (typeof conInitToolbarPinState === 'function') conInitToolbarPinState();
        // Reflect initial snap state on button
        const snapBtn = document.getElementById('con-snap-toggle-btn');
        if (snapBtn) snapBtn.classList.toggle('con-panel-active', conSnapEnabled);
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initBoardNodesOnLoad);
      } else {
        _initBoardNodesOnLoad();
      }
      document.addEventListener('DOMContentLoaded', function () {
        const brd = board();
        if (!brd) return;

        // Clicking outside a note editor should unselect text and remove focus from it
        document.addEventListener('mousedown', function (e) {
          if (e.target && e.target.closest('#wn-style-popup, .con-ctx-menu, .custom-context-menu')) return;
          const sel = window.getSelection();
          let selectedEditor = null;
          if (sel && sel.rangeCount > 0) {
            const anchor = sel.anchorNode;
            const anchorEl = anchor ? (anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement) : null;
            selectedEditor = anchorEl ? anchorEl.closest('.wn-note-editor') : null;
          }
          const ae = document.activeElement;
          const aeEditor = ae ? (ae.classList && ae.classList.contains('wn-note-editor') ? ae : (ae.closest && ae.closest('.wn-note-editor'))) : null;
          const targetEditor = selectedEditor || aeEditor;
          if (!targetEditor && !aeEditor) return;
          if (targetEditor && e.target && (e.target === targetEditor || targetEditor.contains(e.target))) return;
          if (sel) {
            sel.removeAllRanges();
          }
          if (aeEditor && typeof aeEditor.blur === 'function') {
            aeEditor.blur();
          } else if (ae && typeof ae.blur === 'function' && ae !== document.body) {
            ae.blur();
          }
        }, true);

        // Ctrl+J cross-type link mode: intercept the target click (capture phase
        // so it fires before individual element handlers and can stop propagation).
        brd.addEventListener('mousedown', function (e) {
          if (!_conLinkSrc || e.button !== 0) return;
          // Don't intercept clicks when draw mode is active — the draw overlay handles them.
          if (conMode === 'draw') return;
          if (e.target.closest && e.target.closest('.con-media-remove-btn, .con-media-resizer, .con-drawing-handle')) return;
          const nodeEl = e.target.closest ? e.target.closest('.con-node') : null;
          const noteEl = e.target.closest ? e.target.closest('.con-word-note') : null;
          const groupEl = e.target.closest ? e.target.closest('.con-group') : null;
          const drawEl = e.target.closest ? e.target.closest('.con-drawing') : null;
          const mediaEl = e.target.closest ? e.target.closest('.con-media-item') : null;
          let targetId = null;
          if (nodeEl) targetId = nodeEl.id;
          else if (noteEl) targetId = noteEl.dataset.id;
          else if (groupEl) targetId = groupEl.dataset.gid;
          else if (drawEl) targetId = drawEl.dataset.did;
          else if (mediaEl) targetId = mediaEl.dataset.id;
          if (!targetId) {
            // Click on the board background — cancel link mode
            _conCancelLinkMode();
            return;
          }
          const activeSrcIds = (_conLinkSrcIds && _conLinkSrcIds.length) ? _conLinkSrcIds : (_conLinkSrc ? [String(_conLinkSrc)] : []);
          if (activeSrcIds.includes(String(targetId))) {
            // Clicked a source element itself — cancel
            _conCancelLinkMode();
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          conPushUndo();
          activeSrcIds.forEach(srcId => {
            if (srcId && String(srcId) !== String(targetId)) {
              conAddEdge(srcId, targetId);
            }
          });
          _conCancelLinkMode();
        }, true);

        // Track mouse position on the board so Ctrl+V / paste button land at cursor
        brd.addEventListener('mousemove', function (e) {
          const brdRect = brd.getBoundingClientRect();
          const px = e.clientX - brdRect.left + brd.scrollLeft;
          const py = e.clientY - brdRect.top + brd.scrollTop;
          _lastBoardPastePoint = { x: px, y: py };
          const bmenu = document.getElementById('con-board-ctx-menu');
          if (!bmenu || !bmenu.classList.contains('visible')) {
            window._boardCtxNoteX = px;
            window._boardCtxNoteY = py;
          }
        });

        // Suppress native browser context menu on the board
        brd.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          if (conMode === 'draw') return; // handled by drawing overlay
          // If clicking on a node, let node handler deal with it
          if (e.target.closest('.con-node')) return;
          // If clicking on a mask rectangle, let mask handler deal with it
          if (e.target.closest('.con-mask-rect')) return;
          // If clicking on a table, let table handler deal with it
          if (e.target.closest('.con-table-el')) return;
          // If clicking on inserted media, let media controls handle it
          if (e.target.closest('.con-media-item')) return;
          // Board right-click: show add-word menu at cursor position
          const brdRect = brd.getBoundingClientRect();
          _boardCtxX = e.clientX - brdRect.left + brd.scrollLeft - 40;
          _boardCtxY = e.clientY - brdRect.top + brd.scrollTop - 18;
          _boardCtxX = Math.max(4, _boardCtxX);
          _boardCtxY = Math.max(4, _boardCtxY);
          // Also store raw position for note placement (no word-offset)
          window._boardCtxNoteX = e.clientX - brdRect.left + brd.scrollLeft;
          window._boardCtxNoteY = e.clientY - brdRect.top + brd.scrollTop;
          const bmenu = document.getElementById('con-board-ctx-menu');
          const saveSelItem = document.getElementById('con-board-ctx-save-library');
          if (saveSelItem) {
            const hasSelection = (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0)
              || (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0)
              || (typeof conSelected !== 'undefined' && conSelected != null);
            saveSelItem.style.display = hasSelection ? '' : 'none';
          }
          conRenderBoardBgPresetsInContextMenu();
          conRenderBoardLayoutOptionsInContextMenu();
          if (typeof window.renderQuickActionsToolbar === 'function') window.renderQuickActionsToolbar();
          if (window.conSyncBoardCtxLayoutUi) window.conSyncBoardCtxLayoutUi(false);
          bmenu.classList.add('visible');
          conPlaceBoardCtxMenu(bmenu, e.clientX, e.clientY, { offsetX: 6, offsetY: 6, margin: 8 });
          setTimeout(() => {
            const inp = document.getElementById('con-board-ctx-input');
            if (inp) inp.focus();
          }, 50);
        });

        function conBoardHasFileDrag(ev) {
          const dt = ev && ev.dataTransfer;
          if (!dt) return false;
          if (dt.items && dt.items.length) {
            for (let i = 0; i < dt.items.length; i++) {
              if (dt.items[i] && dt.items[i].kind === 'file') return true;
            }
          }
          return !!(dt.files && dt.files.length);
        }

        brd.addEventListener('dragenter', function (e) {
          if (!conBoardHasFileDrag(e)) return;
          e.preventDefault();
          brd.classList.add('file-drag-over');
        });

        brd.addEventListener('dragover', function (e) {
          if (!conBoardHasFileDrag(e)) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
          brd.classList.add('file-drag-over');
        });

        brd.addEventListener('dragleave', function (e) {
          if (!conBoardHasFileDrag(e)) return;
          if (!brd.contains(e.relatedTarget)) {
            brd.classList.remove('file-drag-over');
          }
        });

        brd.addEventListener('drop', function (e) {
          const dropText = (e.dataTransfer && (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain'))) || '';
          if (dropText && /^https?:\/\/[^\s]+$/i.test(dropText.trim()) && typeof window.conAddLinkNodeAt === 'function') {
            e.preventDefault();
            brd.classList.remove('file-drag-over');
            const cleanUrl = dropText.trim();
            const brdRect = brd.getBoundingClientRect();
            const dropX = e.clientX - brdRect.left + brd.scrollLeft;
            const dropY = e.clientY - brdRect.top + brd.scrollTop;
            let domain = '';
            try { domain = new URL(cleanUrl).hostname.replace(/^www\./i, ''); } catch (_) { domain = 'Web Link'; }
            const newId = window.conAddLinkNodeAt({
              title: domain,
              url: cleanUrl,
              linkType: 'web',
              subtitle: domain,
              tags: ['#web']
            }, dropX, dropY);
            _conSyncWebBookmark(domain, cleanUrl, ['#web'], null).then(bm => {
              if (bm && bm.id) {
                const n = conNodes.find(it => it && it.id === newId);
                if (n) { n.bookmarkId = bm.id; n.linkUrn = 'cmt:bookmark:' + bm.id; }
              }
            });
            if (typeof showToast === 'function') showToast('Created link node from dropped URL');
            return;
          }

          if (!conBoardHasFileDrag(e)) return;
          e.preventDefault();
          brd.classList.remove('file-drag-over');
          const droppedFiles = e.dataTransfer && e.dataTransfer.files
            ? Array.from(e.dataTransfer.files)
            : [];
          if (!droppedFiles.length) return;
          const brdRect = brd.getBoundingClientRect();
          const dropX = e.clientX - brdRect.left + brd.scrollLeft;
          const dropY = e.clientY - brdRect.top + brd.scrollTop;
          if (window.conHandleBoardFileDrop) {
            window.conHandleBoardFileDrop(droppedFiles, { x: dropX, y: dropY });
          }
        });

        // Rubber-band selection rect element
        let rbEl = document.getElementById('con-rubberband');
        if (!rbEl) {
          rbEl = document.createElement('div');
          rbEl.id = 'con-rubberband';
          brd.appendChild(rbEl);
        }

        // Board mousedown → start rubber-band (only in move mode, only on bare board)
        brd.addEventListener('mousedown', function (e) {
          if (conMode !== 'move') return;
          if (document.body.classList.contains('laser-active')) return; // disable during laser trail
          let curRbEl = document.getElementById('con-rubberband') || rbEl;
          if (!brd.contains(curRbEl)) {
            brd.appendChild(curRbEl);
          }
          if (e.target !== brd && e.target !== curRbEl && !e.target.closest('.con-media-locked')) return; // only on bare board or locked background elements
          e.preventDefault();
          window._conMirrorDragging = true; // suppress heavy MutationObserver broadcast during rubber-band drag

          const brdRect = brd.getBoundingClientRect();
          const x0 = e.clientX - brdRect.left + brd.scrollLeft;
          const y0 = e.clientY - brdRect.top + brd.scrollTop;
          let x1 = x0, y1 = y0;

          curRbEl.style.display = 'block';
          curRbEl.style.left = x0 + 'px';
          curRbEl.style.top = y0 + 'px';
          curRbEl.style.width = '0px';
          curRbEl.style.height = '0px';

          function onMove(e) {
            x1 = e.clientX - brdRect.left + brd.scrollLeft;
            y1 = e.clientY - brdRect.top + brd.scrollTop;
            const rx = Math.min(x0, x1), ry = Math.min(y0, y1);
            const rw = Math.abs(x1 - x0), rh = Math.abs(y1 - y0);
            curRbEl.style.left = rx + 'px';
            curRbEl.style.top = ry + 'px';
            curRbEl.style.width = rw + 'px';
            curRbEl.style.height = rh + 'px';
          }

          function onUp(e) {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            window._conMirrorDragging = false;
            curRbEl.style.display = 'none';

            const rx0 = Math.min(x0, x1), ry0 = Math.min(y0, y1);
            const rx1 = Math.max(x0, x1), ry1 = Math.max(y0, y1);

            // Only act if rect is meaningful (>5px)
            if (rx1 - rx0 < 5 && ry1 - ry0 < 5) {
              // Tiny click on board — deselect all
              if (typeof window.conDeselectAll === 'function') {
                window.conDeselectAll();
              } else {
                if (window.conNoteClearSelection) window.conNoteClearSelection();
                if (window.conTableClearSelection) window.conTableClearSelection();
                if (window.conDrawingClearSelection) window.conDrawingClearSelection();
                if (window.conShapeClearSelection) window.conShapeClearSelection();
                conSelect(null);
              }
              return;
            }

            // Find nodes whose centre lies inside the rect OR bbox overlaps
            const hits = (typeof conNodes !== 'undefined' && Array.isArray(conNodes)) ? conNodes.filter(n => {
              const nw = (n.el && n.el.offsetWidth) || 80;
              const nh = (n.el && n.el.offsetHeight) || 36;
              const cx = n.x + nw / 2;
              const cy = n.y + nh / 2;
              return (cx >= rx0 && cx <= rx1 && cy >= ry0 && cy <= ry1) ||
                     (n.x < rx1 && (n.x + nw) > rx0 && n.y < ry1 && (n.y + nh) > ry0);
            }).map(n => n.id) : [];

            // Find notes within the rect (centre inside OR bbox overlaps)
            const allNotes = (typeof window.conGetNotes === 'function')
              ? window.conGetNotes()
              : ((typeof conNotes !== 'undefined' && Array.isArray(conNotes)) ? conNotes : (window.conNotes || []));
            const noteHits = allNotes.filter(n => {
              const el = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(n.id) : document.querySelector(`.con-word-note[data-id="${n.id}"]`);
              const nx = (n.x != null) ? n.x : (el ? (parseInt(el.style.left) || 0) : 0);
              const ny = (n.y != null) ? n.y : (el ? (parseInt(el.style.top) || 0) : 0);
              const nw = (el && el.offsetWidth) || n.width || 80;
              const nh = (el && el.offsetHeight) || n.height || 28;
              const cx = nx + nw / 2;
              const cy = ny + nh / 2;
              return (cx >= rx0 && cx <= rx1 && cy >= ry0 && cy <= ry1) ||
                     (nx < rx1 && (nx + nw) > rx0 && ny < ry1 && (ny + nh) > ry0);
            }).map(n => n.id);

            // Find groups within the rect (centre inside OR bbox overlaps)
            const allGroups = (typeof conGroups !== 'undefined' && Array.isArray(conGroups)) ? conGroups : [];
            const groupHits = allGroups.filter(g => {
              if (!g || !g.el) return false;
              const gx = parseFloat(g.el.style.left) || 0;
              const gy = parseFloat(g.el.style.top) || 0;
              const gw = g.el.offsetWidth || parseFloat(g.el.style.width) || 100;
              const gh = g.el.offsetHeight || parseFloat(g.el.style.height) || 60;
              const cx = gx + gw / 2;
              const cy = gy + gh / 2;
              return (cx >= rx0 && cx <= rx1 && cy >= ry0 && cy <= ry1) ||
                     (gx < rx1 && (gx + gw) > rx0 && gy < ry1 && (gy + gh) > ry0);
            }).map(g => g.id);

            // Find tables within the rect (centre inside OR bbox overlaps)
            const allTables = (typeof window.conGetTables === 'function') ? window.conGetTables() : (typeof conTables !== 'undefined' ? conTables : []);
            const tableHits = allTables.filter(t => {
              if (!t) return false;
              const tx = (t.x != null) ? t.x : (t.el ? (parseInt(t.el.style.left) || 0) : 0);
              const ty = (t.y != null) ? t.y : (t.el ? (parseInt(t.el.style.top) || 0) : 0);
              const tw = (t.el && t.el.offsetWidth) || t.w || 200;
              const th = (t.el && t.el.offsetHeight) || t.h || 120;
              const cx = tx + tw / 2;
              const cy = ty + th / 2;
              return (cx >= rx0 && cx <= rx1 && cy >= ry0 && cy <= ry1) ||
                     (tx < rx1 && (tx + tw) > rx0 && ty < ry1 && (ty + th) > ry0);
            }).map(t => t.id);

            // Find drawings whose bounding box overlaps the rect
            const allDrawings = (typeof conDrawings !== 'undefined' && Array.isArray(conDrawings)) ? conDrawings : [];
            const drawingHits = allDrawings.filter(dr => {
              const dw = Math.max(1, dr.w || 1);
              const dh = Math.max(1, dr.h || 1);
              const cx = dr.x + dw / 2;
              const cy = dr.y + dh / 2;
              return (cx >= rx0 && cx <= rx1 && cy >= ry0 && cy <= ry1) ||
                     (dr.x < rx1 && (dr.x + dw) > rx0 && dr.y < ry1 && (dr.y + dh) > ry0);
            }).map(dr => dr.id);

            // Find shapes whose bounding box overlaps the rect
            const allShapes = (typeof conShapes !== 'undefined' && Array.isArray(conShapes)) ? conShapes : [];
            const shapeHits = allShapes.filter(s => {
              const sw = Math.max(1, s.w || 1);
              const sh = Math.max(1, s.h || 1);
              const cx = s.x + sw / 2;
              const cy = s.y + sh / 2;
              return (cx >= rx0 && cx <= rx1 && cy >= ry0 && cy <= ry1) ||
                     (s.x < rx1 && (s.x + sw) > rx0 && s.y < ry1 && (s.y + sh) > ry0);
            }).map(s => s.id);

            // Find media items within the rect (centre inside OR bbox overlaps)
            const allMedia = (typeof conMediaItems !== 'undefined' && Array.isArray(conMediaItems)) ? conMediaItems : [];
            const mediaHits = allMedia.filter(m => {
              if (!m) return false;
              const mw = Math.max(1, m.w || 100);
              const mh = Math.max(1, m.h || 80);
              const cx = m.x + mw / 2;
              const cy = m.y + mh / 2;
              return (cx >= rx0 && cx <= rx1 && cy >= ry0 && cy <= ry1) ||
                     (m.x < rx1 && (m.x + mw) > rx0 && m.y < ry1 && (m.y + mh) > ry0);
            }).map(m => m.id);

            const totalHits = hits.length + noteHits.length + groupHits.length + tableHits.length + drawingHits.length + shapeHits.length + mediaHits.length;
            const isAdditive = !!(e.ctrlKey || e.metaKey || e.shiftKey);
            if (totalHits === 0) {
              if (!isAdditive) {
                if (typeof window.conDeselectAll === 'function') window.conDeselectAll();
                else conSelect(null);
              }
              return;
            }

            if (!isAdditive) {
              // Clear existing selection across all item types first
              if (window.conNoteClearSelection) window.conNoteClearSelection();
              if (window.conTableClearSelection) window.conTableClearSelection();
              if (window.conDrawingClearSelection) window.conDrawingClearSelection();
              if (window.conShapeClearSelection) window.conShapeClearSelection();
              if (window.conMediaClearSelection) window.conMediaClearSelection();
              if (typeof conDrawingSelected !== 'undefined') {
                conDrawingSelected.clear();
                document.querySelectorAll('#constellation-board .con-drawing.con-drawing-selected')
                  .forEach(el => el.classList.remove('con-drawing-selected'));
              }
              if (typeof conGroups !== 'undefined') {
                conGroups.forEach(g => { if (g && g.el) g.el.classList.remove('con-group-selected'); });
                conGroupFocused = null;
              }
              conSelected = null;
              conMultiSelected.clear();
              conNodes.forEach(n => {
                if (n && n.el) n.el.classList.remove('con-selected', 'con-src', 'con-multi-selected');
              });
            }

            // Apply node selection
            if (!isAdditive && hits.length === 1 && totalHits === 1) {
              conSelect(hits[0]);
            } else if (hits.length > 0) {
              hits.forEach(id => {
                conMultiSelected.add(id);
                const n = conNodes.find(x => x.id === id);
                if (n && n.el) n.el.classList.add('con-multi-selected');
              });
              if (isAdditive && conSelected) {
                conMultiSelected.add(conSelected);
                const sn = conNodes.find(x => x.id === conSelected);
                if (sn && sn.el) sn.el.classList.add('con-multi-selected');
                conSelected = null;
              }
            }

            // Apply note selection
            noteHits.forEach(nid => {
              if (typeof conNoteSelected !== 'undefined') conNoteSelected.add(nid);
              if (typeof window.conGetNoteSelected === 'function' && window.conGetNoteSelected()) {
                window.conGetNoteSelected().add(nid);
              }
              const el = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nid) : document.querySelector(`.con-word-note[data-id="${nid}"]`);
              if (el) el.classList.add('wn-selected');
            });

            // Apply group selection
            groupHits.forEach(gid => {
              const g = allGroups.find(x => x.id === gid);
              if (g && g.el) g.el.classList.add('con-group-selected');
            });
            if (groupHits.length === 1) {
              conGroupFocused = groupHits[0];
            }

            // Apply table selection
            tableHits.forEach(tid => {
              if (typeof conTableSelected !== 'undefined') conTableSelected.add(tid);
              const tbl = allTables.find(t => t.id === tid);
              if (tbl && tbl.el) tbl.el.classList.add('con-table-selected');
            });

            // Apply drawing selection
            drawingHits.forEach(did => {
              if (typeof conDrawingSelected !== 'undefined') conDrawingSelected.add(did);
              const dr = allDrawings.find(x => x.id === did);
              if (dr && dr.el) {
                dr.el.classList.add('con-drawing-selected');
                dr.el.style.pointerEvents = 'auto';
                dr.el.style.cursor = 'grab';
                if (typeof window._conDrawingShowHandles === 'function') window._conDrawingShowHandles(dr);
              }
            });

            // Apply shape selection
            shapeHits.forEach(sid => {
              if (typeof _conShapeSelected !== 'undefined') _conShapeSelected.add(sid);
              const s = allShapes.find(x => x.id === sid);
              if (s && s.el) s.el.classList.add('con-shape-selected');
            });

            // Apply media item selection
            mediaHits.forEach(mid => {
              if (typeof conMediaSelected !== 'undefined') conMediaSelected.add(mid);
              const mEl = document.querySelector(`.con-media-item[data-id="${mid}"]`);
              if (mEl) mEl.classList.add('con-media-selected');
            });

            if (typeof conUpdateToolbarStatus === 'function') conUpdateToolbarStatus();
            if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
          }

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });

        // ---- Draw overlay: capture freehand strokes and shapes ----
        (function () {
          const drawOverlay = document.getElementById('con-draw-overlay');
          if (!drawOverlay) return;
          let livePoints = [], livePath = null;
          let _drawActivePointerId = null;
          let _liveMirrorThrottle = 0;
          let _eraserPushedUndo = false;
          let _eraserLastPos = null;
          // Shape drawing state
          let _shapeStart = null, _shapePreviewEl = null, _shapeLastPos = null;
          // Polygon click-based drawing state
          let _polygonInProgress = false, _polygonPoints = [], _polygonLivePos = null, _polygonPreviewEl = null;

          const _eraserOutline = document.createElement('div');
          _eraserOutline.className = 'con-eraser-outline';
          const _initEraserR = window._conEraserRadius || 20;
          _eraserOutline.style.width = (_initEraserR * 2) + 'px';
          _eraserOutline.style.height = (_initEraserR * 2) + 'px';
          drawOverlay.appendChild(_eraserOutline);

          function _conSyncDrawOverlaySize() {
            const b = document.getElementById('constellation-board');
            if (!b || !drawOverlay) return;
            const liveSvg = document.getElementById('con-draw-live-svg');
            const conSvg = document.getElementById('constellation-svg');
            if (typeof conMode === 'undefined' || conMode !== 'draw') {
              drawOverlay.style.width = '100%';
              drawOverlay.style.height = '100%';
              if (liveSvg) { liveSvg.style.width = '100%'; liveSvg.style.height = '100%'; }
              if (conSvg) { conSvg.style.width = '100%'; conSvg.style.height = '100%'; }
              return;
            }
            const maxW = Math.max(
              b.scrollWidth || 0,
              b.clientWidth || 0,
              Math.ceil((b.scrollLeft || 0) + (b.clientWidth || 0))
            );
            const maxH = Math.max(
              b.scrollHeight || 0,
              b.clientHeight || 0,
              Math.ceil((b.scrollTop || 0) + (b.clientHeight || 0))
            );
            const wStr = Math.max(maxW, 100) + 'px';
            const hStr = Math.max(maxH, 100) + 'px';
            if (drawOverlay.style.width !== wStr) drawOverlay.style.width = wStr;
            if (drawOverlay.style.height !== hStr) drawOverlay.style.height = hStr;
            if (liveSvg) {
              if (liveSvg.style.width !== wStr) liveSvg.style.width = wStr;
              if (liveSvg.style.height !== hStr) liveSvg.style.height = hStr;
            }
            if (conSvg) {
              if (conSvg.style.width !== wStr) conSvg.style.width = wStr;
              if (conSvg.style.height !== hStr) conSvg.style.height = hStr;
            }
          }
          window._conSyncDrawOverlaySize = _conSyncDrawOverlaySize;

          window._conUpdateEraserOutlineSize = function () {
            const r = window._conEraserRadius || 20;
            if (_eraserOutline) {
              _eraserOutline.style.width = (r * 2) + 'px';
              _eraserOutline.style.height = (r * 2) + 'px';
            }
          };

          function _conEraserCanShow() {
            return conMode === 'draw' && _conDrawEraserMode && !_conDrawHandMode;
          }

          function _conSetEraserOutlineVisible(show) {
            if (!_eraserOutline) return;
            _eraserOutline.classList.toggle('visible', !!show && _conEraserCanShow());
          }

          function _conUpdateEraserOutlineByEvent(e) {
            if (!_conEraserCanShow()) { _conSetEraserOutlineVisible(false); return; }
            const b = document.getElementById('constellation-board');
            if (!b) { _conSetEraserOutlineVisible(false); return; }
            const pos = getBoardPos(e);
            const r = window._conEraserRadius || 20;
            _eraserOutline.style.width = (r * 2) + 'px';
            _eraserOutline.style.height = (r * 2) + 'px';
            _eraserOutline.style.left = (pos.x - r) + 'px';
            _eraserOutline.style.top = (pos.y - r) + 'px';
            _conSetEraserOutlineVisible(true);
          }

          function _conCircleTouchesRect(cx, cy, r, left, top, right, bottom) {
            const closestX = Math.max(left, Math.min(cx, right));
            const closestY = Math.max(top, Math.min(cy, bottom));
            const dx = cx - closestX;
            const dy = cy - closestY;
            return (dx * dx + dy * dy) <= (r * r);
          }

          function _conDistSqPointToPoint(p1, p2) {
            const dx = p1.x - p2.x, dy = p1.y - p2.y;
            return dx * dx + dy * dy;
          }

          function _conDistSqToSegment(px, py, x1, y1, x2, y2) {
            const dx = x2 - x1, dy = y2 - y1;
            const l2 = dx * dx + dy * dy;
            if (l2 < 1e-6) {
              const ex = px - x1, ey = py - y1;
              return ex * ex + ey * ey;
            }
            let t = ((px - x1) * dx + (py - y1) * dy) / l2;
            t = Math.max(0, Math.min(1, t));
            const cx = x1 + t * dx, cy = y1 + t * dy;
            const ex = px - cx, ey = py - cy;
            return ex * ex + ey * ey;
          }

          function _conPolylineLength(pts) {
            let len = 0;
            for (let i = 1; i < pts.length; i++) {
              len += Math.sqrt(_conDistSqPointToPoint(pts[i], pts[i - 1]));
            }
            return len;
          }

          function _conExtractWorldSubstrokes(d) {
            const substrokes = [];
            let cur = [];
            for (let i = 0; i < d.points.length; i++) {
              const pt = d.points[i];
              if (pt === null || pt === undefined) {
                if (cur.length > 0) {
                  substrokes.push(cur);
                  cur = [];
                }
              } else {
                cur.push({ x: d.x + pt.x, y: d.y + pt.y });
              }
            }
            if (cur.length > 0) substrokes.push(cur);
            return substrokes;
          }

          function _conClipSubstrokeByCircle(pts, cx, cy, Reff) {
            if (!pts || pts.length === 0) return { surviving: [], modified: false };
            if (pts.length === 1) {
              if (_conDistSqPointToPoint(pts[0], { x: cx, y: cy }) < Reff * Reff) {
                return { surviving: [], modified: true };
              }
              return { surviving: [pts], modified: false };
            }
            const R2 = Reff * Reff;
            const surviving = [];
            let current = [];
            let modified = false;

            const p0Inside = _conDistSqPointToPoint(pts[0], { x: cx, y: cy }) < R2;
            if (p0Inside) {
              modified = true;
            } else {
              current.push({ x: pts[0].x, y: pts[0].y });
            }

            for (let i = 0; i < pts.length - 1; i++) {
              const p1 = pts[i];
              const p2 = pts[i + 1];
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const a = dx * dx + dy * dy;
              const p1In = _conDistSqPointToPoint(p1, { x: cx, y: cy }) < R2;
              const p2In = _conDistSqPointToPoint(p2, { x: cx, y: cy }) < R2;

              if (p1In || p2In) modified = true;

              if (a < 1e-6) continue;

              const delx = p1.x - cx;
              const dely = p1.y - cy;
              const b = 2 * (delx * dx + dely * dy);
              const c = (delx * delx + dely * dely) - R2;
              const disc = b * b - 4 * a * c;

              if (p1In && p2In) {
                if (current.length >= 2 && _conPolylineLength(current) >= 2) {
                  surviving.push(current);
                }
                current = [];
              } else if (p1In && !p2In) {
                let t = 0;
                if (disc > 0) {
                  t = (-b + Math.sqrt(disc)) / (2 * a);
                }
                t = Math.max(0, Math.min(1, t));
                const Pexit = { x: p1.x + t * dx, y: p1.y + t * dy };
                current = [Pexit, { x: p2.x, y: p2.y }];
              } else if (!p1In && p2In) {
                let t = 1;
                if (disc > 0) {
                  t = (-b - Math.sqrt(disc)) / (2 * a);
                }
                t = Math.max(0, Math.min(1, t));
                const Penter = { x: p1.x + t * dx, y: p1.y + t * dy };
                current.push(Penter);
                if (current.length >= 2 && _conPolylineLength(current) >= 2) {
                  surviving.push(current);
                }
                current = [];
              } else {
                if (disc > 0) {
                  const sq = Math.sqrt(disc);
                  const t1 = (-b - sq) / (2 * a);
                  const t2 = (-b + sq) / (2 * a);
                  if (t1 > 0 && t2 < 1) {
                    modified = true;
                    const Penter = { x: p1.x + t1 * dx, y: p1.y + t1 * dy };
                    const Pexit = { x: p1.x + t2 * dx, y: p1.y + t2 * dy };
                    current.push(Penter);
                    if (current.length >= 2 && _conPolylineLength(current) >= 2) {
                      surviving.push(current);
                    }
                    current = [Pexit, { x: p2.x, y: p2.y }];
                    continue;
                  }
                }
                current.push({ x: p2.x, y: p2.y });
              }
            }

            if (current.length >= 2 && _conPolylineLength(current) >= 2) {
              surviving.push(current);
            }

            return { surviving, modified };
          }

          function _conEraseAtPos(pos) {
            const r = window._conEraserRadius || 20;
            const isPartial = (window._conEraserType || 'partial') === 'partial';

            const toDeleteDrawingIds = [];
            const toDeleteDrawingItems = [];
            const modifiedDrawings = [];

            // Process freehand drawings
            const currentDrawings = [...conDrawings];
            currentDrawings.forEach(d => {
              const sw = Math.max(1, Number(d.thickness) || 1);
              const Reff = r + sw / 2;
              if (!_conCircleTouchesRect(
                pos.x, pos.y, r,
                d.x - sw / 2, d.y - sw / 2,
                d.x + d.w + sw / 2, d.y + d.h + sw / 2
              )) {
                return;
              }

              const substrokes = _conExtractWorldSubstrokes(d);
              if (!substrokes || substrokes.length === 0) return;

              if (!isPartial) {
                // Stroke Eraser mode: delete entire stroke if circle touches any part of it
                let touchesStroke = false;
                const R2 = Reff * Reff;
                for (const sub of substrokes) {
                  if (!sub || sub.length === 0) continue;
                  if (sub.length === 1) {
                    if (_conDistSqPointToPoint(sub[0], pos) <= R2) {
                      touchesStroke = true;
                      break;
                    }
                  }
                  for (let i = 0; i < sub.length - 1; i++) {
                    if (_conDistSqToSegment(pos.x, pos.y, sub[i].x, sub[i].y, sub[i + 1].x, sub[i + 1].y) <= R2) {
                      touchesStroke = true;
                      break;
                    }
                  }
                  if (touchesStroke) break;
                }
                if (touchesStroke) {
                  toDeleteDrawingIds.push(d.id);
                  toDeleteDrawingItems.push(d);
                }
              } else {
                // Partial Eraser mode: clip each substroke against the eraser circle
                let drawingModified = false;
                const allSurviving = [];
                for (const sub of substrokes) {
                  const { surviving, modified } = _conClipSubstrokeByCircle(sub, pos.x, pos.y, Reff);
                  if (modified) drawingModified = true;
                  for (const s of surviving) {
                    allSurviving.push(s);
                  }
                }
                if (!drawingModified) return;

                if (allSurviving.length === 0) {
                  // Entire drawing was erased
                  toDeleteDrawingIds.push(d.id);
                  toDeleteDrawingItems.push(d);
                } else {
                  // Stroke was partially erased
                  if (!_eraserPushedUndo) {
                    conPushUndo();
                    _eraserPushedUndo = true;
                  }
                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                  for (const sub of allSurviving) {
                    for (const pt of sub) {
                      if (pt.x < minX) minX = pt.x;
                      if (pt.x > maxX) maxX = pt.x;
                      if (pt.y < minY) minY = pt.y;
                      if (pt.y > maxY) maxY = pt.y;
                    }
                  }
                  const newPoints = [];
                  allSurviving.forEach((sub, idx) => {
                    if (idx > 0) newPoints.push(null);
                    for (const pt of sub) {
                      newPoints.push({ x: pt.x - minX, y: pt.y - minY });
                    }
                  });

                  d.x = minX;
                  d.y = minY;
                  d.w = Math.max(1, maxX - minX);
                  d.h = Math.max(1, maxY - minY);
                  d.points = newPoints;
                  _conDrawingUpdateGeom(d);
                  if (conDrawingSelected && conDrawingSelected.has(d.id)) {
                    _conDrawingUpdateHandles(d);
                  }
                  modifiedDrawings.push(d);
                }
              }
            });

            // Handle deleted drawings
            if (toDeleteDrawingItems.length > 0) {
              if (!_eraserPushedUndo) {
                conPushUndo();
                _eraserPushedUndo = true;
              }
              const delSet = new Set(toDeleteDrawingIds);
              toDeleteDrawingItems.forEach(d => {
                if (d.el) try { d.el.remove(); } catch (_) {}
                if (conDrawingSelected) conDrawingSelected.delete(d.id);
                try {
                  const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(d.id) : String(d.id).replace(/["\\]/g, '\\$&');
                  document.querySelectorAll('#constellation-board .con-drawing[data-did="' + escaped + '"], .con-drawing[data-did="' + escaped + '"]').forEach(el => {
                    try { el.remove(); } catch (_) {}
                  });
                } catch (_) {}
              });
              [conDrawings, global.conDrawings, window.conDrawings].forEach(arr => {
                if (Array.isArray(arr)) {
                  for (let i = arr.length - 1; i >= 0; i--) {
                    if (arr[i] && delSet.has(arr[i].id)) arr.splice(i, 1);
                  }
                }
              });
            }

            // Process shapes
            const toDeleteShapeIds = new Set();
            const toDeleteShapeItems = [];
            const _shapesToErase = (window.conGetShapes ? window.conGetShapes() : (window.conShapes || conShapes)) || [];
            _shapesToErase.forEach(s => {
              const sw = Math.max(1, Number(s.thickness) || 1);
              if (_conCircleTouchesRect(
                pos.x, pos.y, r,
                s.x - sw / 2, s.y - sw / 2,
                s.x + s.w + sw / 2, s.y + s.h + sw / 2
              )) {
                if (s.type === 'line' || s.type === 'arrow') {
                  const x1 = s.lx1 != null ? s.lx1 : s.x;
                  const y1 = s.ly1 != null ? s.ly1 : s.y;
                  const x2 = s.lx2 != null ? s.lx2 : (s.x + s.w);
                  const y2 = s.ly2 != null ? s.ly2 : (s.y + s.h);
                  const Reff = r + sw / 2;
                  if (_conDistSqToSegment(pos.x, pos.y, x1, y1, x2, y2) <= Reff * Reff) {
                    toDeleteShapeIds.add(s.id);
                    toDeleteShapeItems.push(s);
                  }
                } else {
                  toDeleteShapeIds.add(s.id);
                  toDeleteShapeItems.push(s);
                }
              }
            });

            if (toDeleteShapeItems.length > 0) {
              if (!_eraserPushedUndo) {
                conPushUndo();
                _eraserPushedUndo = true;
              }
              toDeleteShapeItems.forEach(s => {
                if (s.el) s.el.remove();
                if (typeof _conShapeSelected !== 'undefined') _conShapeSelected.delete(s.id);
              });
              [conShapes, global.conShapes, window.conShapes].forEach(arr => {
                if (Array.isArray(arr)) {
                  for (let i = arr.length - 1; i >= 0; i--) {
                    if (arr[i] && toDeleteShapeIds.has(arr[i].id)) arr.splice(i, 1);
                  }
                }
              });
            }

            // Clean up group references
            if (toDeleteDrawingIds.length > 0 || toDeleteShapeIds.size > 0) {
              const dDelSet = new Set(toDeleteDrawingIds);
              conGroups.forEach(g => {
                if (g.drawingIds && toDeleteDrawingIds.length > 0) {
                  g.drawingIds = g.drawingIds.filter(id => !dDelSet.has(id));
                }
                if (g.shapeIds && toDeleteShapeIds.size > 0) {
                  g.shapeIds = g.shapeIds.filter(id => !toDeleteShapeIds.has(id));
                }
              });
            }

            // Throttle mirror micro-messages via rAF so we send at most once per frame
            const hasDeletions = toDeleteDrawingItems.length > 0 || toDeleteShapeItems.length > 0;
            const hasModifications = modifiedDrawings.length > 0;
            if ((hasDeletions || hasModifications) && typeof window._conMirrorSend === 'function') {
              if (!window._conEraserMirrorPendingDrawIds) window._conEraserMirrorPendingDrawIds = [];
              if (!window._conEraserMirrorPendingShapeIds) window._conEraserMirrorPendingShapeIds = [];
              if (!window._conEraserMirrorPendingModifiedDrawings) window._conEraserMirrorPendingModifiedDrawings = new Map();

              if (toDeleteDrawingItems.length > 0) {
                toDeleteDrawingItems.forEach(d => {
                  window._conEraserMirrorPendingDrawIds.push(String(d.id));
                  window._conEraserMirrorPendingModifiedDrawings.delete(String(d.id));
                });
              }
              if (toDeleteShapeItems.length > 0) {
                toDeleteShapeItems.forEach(s => window._conEraserMirrorPendingShapeIds.push(String(s.id)));
              }
              if (modifiedDrawings.length > 0) {
                modifiedDrawings.forEach(d => {
                  window._conEraserMirrorPendingModifiedDrawings.set(String(d.id), {
                    id: d.id, x: d.x, y: d.y, w: d.w, h: d.h, points: d.points
                  });
                });
              }

              if (!window._conEraserMirrorRaf) {
                window._conEraserMirrorRaf = requestAnimationFrame(function () {
                  window._conEraserMirrorRaf = null;
                  _conFlushEraserMirrorMessages();
                });
              }
            }
          }

          function _conFlushEraserMirrorMessages() {
            if (typeof window._conMirrorSend !== 'function') return;
            if (window._conEraserMirrorPendingDrawIds && window._conEraserMirrorPendingDrawIds.length > 0) {
              const uniqueDrawIds = Array.from(new Set(window._conEraserMirrorPendingDrawIds.map(String))).filter(Boolean);
              window._conEraserMirrorPendingDrawIds = [];
              if (uniqueDrawIds.length > 0) {
                window._conMirrorSend({ type: 'drawing-remove', ids: uniqueDrawIds });
              }
            }
            if (window._conEraserMirrorPendingShapeIds && window._conEraserMirrorPendingShapeIds.length > 0) {
              const uniqueShapeIds = Array.from(new Set(window._conEraserMirrorPendingShapeIds.map(String))).filter(Boolean);
              window._conEraserMirrorPendingShapeIds = [];
              if (uniqueShapeIds.length > 0) {
                window._conMirrorSend({ type: 'shape-remove', ids: uniqueShapeIds });
              }
            }
            if (window._conEraserMirrorPendingModifiedDrawings && window._conEraserMirrorPendingModifiedDrawings.size > 0) {
              window._conEraserMirrorPendingModifiedDrawings.forEach(modData => {
                window._conMirrorSend({
                  type: 'drawing-resize',
                  id: modData.id,
                  x: modData.x,
                  y: modData.y,
                  w: modData.w,
                  h: modData.h,
                  points: modData.points
                });
              });
              window._conEraserMirrorPendingModifiedDrawings.clear();
            }
          }

          function _conSplitMultiSubstrokeDrawings() {
            const toAdd = [];
            const modified = [];
            conDrawings.forEach(d => {
              const substrokes = _conExtractWorldSubstrokes(d);
              if (substrokes.length > 1) {
                // First substroke stays with d
                const firstSub = substrokes[0];
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const pt of firstSub) {
                  if (pt.x < minX) minX = pt.x;
                  if (pt.x > maxX) maxX = pt.x;
                  if (pt.y < minY) minY = pt.y;
                  if (pt.y > maxY) maxY = pt.y;
                }
                d.x = minX;
                d.y = minY;
                d.w = Math.max(1, maxX - minX);
                d.h = Math.max(1, maxY - minY);
                d.points = firstSub.map(pt => ({ x: pt.x - minX, y: pt.y - minY }));
                _conDrawingUpdateGeom(d);
                if (conDrawingSelected && conDrawingSelected.has(d.id)) {
                  _conDrawingUpdateHandles(d);
                }
                modified.push(d);

                // Remaining substrokes become new separate drawings
                const parentGroup = conGroups.find(g => (g.drawingIds || []).includes(d.id));
                for (let i = 1; i < substrokes.length; i++) {
                  const sub = substrokes[i];
                  let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
                  for (const pt of sub) {
                    if (pt.x < sMinX) sMinX = pt.x;
                    if (pt.x > sMaxX) sMaxX = pt.x;
                    if (pt.y < sMinY) sMinY = pt.y;
                    if (pt.y > sMaxY) sMaxY = pt.y;
                  }
                  const newD = {
                    id: 'cd' + (_conDrawNextId++),
                    x: sMinX, y: sMinY,
                    w: Math.max(1, sMaxX - sMinX),
                    h: Math.max(1, sMaxY - sMinY),
                    points: sub.map(pt => ({ x: pt.x - sMinX, y: pt.y - sMinY })),
                    color: d.color,
                    thickness: d.thickness,
                    opacity: d.opacity,
                    dashStyle: d.dashStyle || 'solid',
                    el: null, hitPath: null, visPath: null, pad: 0
                  };
                  toAdd.push(newD);
                  if (parentGroup && parentGroup.drawingIds) {
                    parentGroup.drawingIds.push(newD.id);
                  }
                }
              }
            });
            toAdd.forEach(newD => {
              conDrawings.push(newD);
              conDrawingBuild(newD);
            });

            // Send in-place updates to mirror
            if (typeof window._conMirrorSend === 'function') {
              modified.forEach(d => {
                window._conMirrorSend({
                  type: 'drawing-resize',
                  id: d.id,
                  x: d.x,
                  y: d.y,
                  w: d.w,
                  h: d.h,
                  points: d.points
                });
              });
              if (toAdd.length > 0) {
                window._conMirrorSend({
                  type: 'drawing-add',
                  drawings: toAdd.map(newD => ({
                    id: newD.id,
                    x: newD.x,
                    y: newD.y,
                    w: newD.w,
                    h: newD.h,
                    points: newD.points,
                    color: newD.color,
                    thickness: newD.thickness,
                    opacity: newD.opacity,
                    dashStyle: newD.dashStyle || 'solid'
                  })),
                  groupDrawingLinks: toAdd.map(newD => {
                    const parentGroup = conGroups.find(g => (g.drawingIds || []).includes(newD.id));
                    return parentGroup ? { drawingId: newD.id, groupId: parentGroup.id } : null;
                  }).filter(Boolean)
                });
              }
            }
          }

          function _conPolygonSnapAngle(prev, cur) {
            if (!prev) return cur;
            const dx = cur.x - prev.x, dy = cur.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) return cur;
            const step = 45 * Math.PI / 180;
            const snapped = Math.round(Math.atan2(dy, dx) / step) * step;
            return { x: prev.x + len * Math.cos(snapped), y: prev.y + len * Math.sin(snapped) };
          }

          function _polygonPreviewUpdate() {
            const liveSvg = document.getElementById('con-draw-live-svg');
            if (!liveSvg) return;
            if (_polygonPreviewEl && _polygonPreviewEl.parentNode === liveSvg) liveSvg.removeChild(_polygonPreviewEl);
            _polygonPreviewEl = null;
            if (_polygonPoints.length < 1) return;
            const col = _conDrawColor, sw = _conDrawThickness, op = _conDrawOpacity;
            const fill = _conDrawShapeFill || 'none';
            const dash = _conShapeDashArr ? _conShapeDashArr(_conDrawShapeDash || 'solid', sw) : null;
            const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
            let d = '';
            if (_polygonPoints.length >= 2) {
              const ptsStr = _polygonPoints.map(p => `${p.x},${p.y}`).join(' ');
              d += `<polyline points="${ptsStr}" fill="none" stroke="${col}" stroke-width="${sw}" opacity="${op}"${dashAttr} stroke-linecap="round" stroke-linejoin="round"/>`;
            }
            if (_polygonLivePos && _polygonPoints.length >= 1) {
              const last = _polygonPoints[_polygonPoints.length - 1];
              d += `<line x1="${last.x}" y1="${last.y}" x2="${_polygonLivePos.x}" y2="${_polygonLivePos.y}" stroke="${col}" stroke-width="${sw}" opacity="${op}" stroke-dasharray="${sw * 3} ${sw * 2}" stroke-linecap="round"/>`;
            }
            if (_polygonPoints.length >= 1) {
              const fp = _polygonPoints[0];
              d += `<circle cx="${fp.x}" cy="${fp.y}" r="${Math.max(5, sw * 2)}" fill="none" stroke="${col}" stroke-width="1.5" opacity="${op * 0.7}"/>`;
            }
            _polygonPreviewEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            _polygonPreviewEl.style.pointerEvents = 'none';
            _polygonPreviewEl.innerHTML = d;
            liveSvg.appendChild(_polygonPreviewEl);
          }

          function _polygonReset() {
            _polygonInProgress = false; _polygonPoints = []; _polygonLivePos = null;
            const liveSvg = document.getElementById('con-draw-live-svg');
            if (_polygonPreviewEl && liveSvg && _polygonPreviewEl.parentNode === liveSvg) liveSvg.removeChild(_polygonPreviewEl);
            _polygonPreviewEl = null;
          }
          window._conPolygonReset = _polygonReset;

          function _polygonCommit() {
            if (_polygonPoints.length < 3) { _polygonReset(); return; }
            const xs = _polygonPoints.map(p => p.x), ys = _polygonPoints.map(p => p.y);
            const x = Math.min(...xs), y = Math.min(...ys);
            const w = Math.max(2, Math.max(...xs) - x), h = Math.max(2, Math.max(...ys) - y);
            const id = 'cs' + (_conShapeNextId++);
            const s = {
              id, type: 'polygon',
              x, y, w, h,
              lx1: null, ly1: null, lx2: null, ly2: null,
              pts: _polygonPoints.map(p => ({ x: p.x, y: p.y })),
              color: _conDrawColor, fillColor: _conDrawShapeFill || 'none',
              thickness: _conDrawThickness, opacity: _conDrawOpacity,
              dashStyle: _conDrawShapeDash || 'solid',
              arrowheadSize: null, el: null, svgEl: null, hitEl: null, visEl: null, pad: 0
            };
            const shapeList = (typeof window.conGetShapes === 'function') ? window.conGetShapes() : (window.conShapes || global.conShapes || conShapes);
            shapeList.push(s);
            if (Array.isArray(conShapes) && conShapes !== shapeList) conShapes.push(s);
            if (Array.isArray(window.conShapes) && window.conShapes !== shapeList) window.conShapes.push(s);
            if (Array.isArray(global.conShapes) && global.conShapes !== shapeList) global.conShapes.push(s);
            conShapeBuild(s);
            if (window._conMirrorSend) {
              window._conMirrorSend({
                type: 'shape-add',
                shapes: [{
                  id: s.id, type: s.type,
                  x: s.x, y: s.y, w: s.w, h: s.h,
                  lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                  pts: s.pts,
                  color: s.color, fillColor: s.fillColor,
                  thickness: s.thickness, opacity: s.opacity,
                  dashStyle: s.dashStyle, arrowheadSize: s.arrowheadSize
                }]
              });
            }
            if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
            _polygonReset();
          }

          // Ctrl-constrain: angle snap (line/arrow) or square (rect/circle/diamond)
          function _conShapeSnapPos(start, cur, type, shiftKey) {
            if (!shiftKey || !start) return cur;
            if (type === 'line' || type === 'arrow') {
              const dx = cur.x - start.x, dy = cur.y - start.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len < 1) return cur;
              const step = 30 * Math.PI / 180;
              const snapped = Math.round(Math.atan2(dy, dx) / step) * step;
              return { x: start.x + len * Math.cos(snapped), y: start.y + len * Math.sin(snapped) };
            }
            if (type === 'rect' || type === 'circle' || type === 'ellipse' || type === 'diamond') {
              const dx = cur.x - start.x, dy = cur.y - start.y;
              const side = Math.max(Math.abs(dx), Math.abs(dy));
              return { x: start.x + (dx < 0 ? -side : side), y: start.y + (dy < 0 ? -side : side) };
            }
            return cur;
          }

          function getBoardPos(e) {
            const b = document.getElementById('constellation-board');
            const rect = b.getBoundingClientRect();
            return { x: e.clientX - rect.left + b.scrollLeft, y: e.clientY - rect.top + b.scrollTop };
          }

          function _shapePreviewUpdate(startPos, curPos, type) {
            const liveSvg = document.getElementById('con-draw-live-svg');
            if (!liveSvg) return;
            if (_shapePreviewEl) liveSvg.removeChild(_shapePreviewEl);
            const x = Math.min(startPos.x, curPos.x);
            const y = Math.min(startPos.y, curPos.y);
            const w = Math.max(2, Math.abs(curPos.x - startPos.x));
            const h = Math.max(2, Math.abs(curPos.y - startPos.y));
            const col = _conDrawColor;
            const sw = _conDrawThickness;
            const op = _conDrawOpacity;
            const fill = _conDrawShapeFill || 'none';
            const dash = _conShapeDashArr ? _conShapeDashArr(_conDrawShapeDash || 'solid', sw) : null;
            const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
            let d = '';
            if (type === 'rect') {
              d = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${col}" stroke-width="${sw}" opacity="${op}"${dashAttr} stroke-linecap="round"/>`;
            } else if (type === 'circle' || type === 'ellipse') {
              d = `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${col}" stroke-width="${sw}" opacity="${op}"${dashAttr}/>`;
            } else if (type === 'diamond') {
              const pts = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
              d = `<polygon points="${pts}" fill="${fill}" stroke="${col}" stroke-width="${sw}" opacity="${op}"${dashAttr}/>`;
            } else if (type === 'line') {
              d = `<line x1="${startPos.x}" y1="${startPos.y}" x2="${curPos.x}" y2="${curPos.y}" stroke="${col}" stroke-width="${sw}" opacity="${op}"${dashAttr} stroke-linecap="round"/>`;
            } else if (type === 'arrow') {
              const mid = '_lprev_arrow';
              const _ahPx = _conDrawArrowheadSize || 20;
              const _mwPrev = (_ahPx / sw).toFixed(3);
              const _mhPrev = (_ahPx / sw * 0.6).toFixed(3);
              d = `<defs><marker id="${mid}" viewBox="0 0 10 6" markerWidth="${_mwPrev}" markerHeight="${_mhPrev}" refX="0" refY="3" orient="auto" markerUnits="strokeWidth"><polygon points="0 0, 10 3, 0 6" fill="${col}" opacity="${op}"/></marker></defs>` +
                `<line x1="${startPos.x}" y1="${startPos.y}" x2="${curPos.x}" y2="${curPos.y}" stroke="${col}" stroke-width="${sw}" opacity="${op}"${dashAttr} stroke-linecap="butt" marker-end="url(#${mid})"/>`;
            }
            _shapePreviewEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            _shapePreviewEl.style.pointerEvents = 'none';
            _shapePreviewEl.innerHTML = d;
            liveSvg.appendChild(_shapePreviewEl);
          }

          function _shapeCommit(startPos, endPos) {
            const liveSvg = document.getElementById('con-draw-live-svg');
            if (_shapePreviewEl && liveSvg && _shapePreviewEl.parentNode === liveSvg) {
              liveSvg.removeChild(_shapePreviewEl);
            }
            _shapePreviewEl = null;
            const type = _conDrawShapeTool;
            if (!type) return;
            const isLine = type === 'line' || type === 'arrow';
            const x1 = startPos.x, y1 = startPos.y, x2 = endPos.x, y2 = endPos.y;
            const x = Math.min(x1, x2), y = Math.min(y1, y2);
            const w = Math.max(2, Math.abs(x2 - x1)), h = Math.max(2, Math.abs(y2 - y1));
            if (w < 3 && h < 3) return; // Too small — ignore tap
            if (typeof conPushUndo === 'function') conPushUndo();
            const id = 'cs' + (_conShapeNextId++);
            const s = {
              id, type,
              x, y, w, h,
              lx1: x1, ly1: y1, lx2: x2, ly2: y2,
              color: _conDrawColor,
              fillColor: _conDrawShapeFill || 'none',
              thickness: _conDrawThickness,
              opacity: _conDrawOpacity,
              dashStyle: _conDrawShapeDash || 'solid',
              arrowheadSize: type === 'arrow' ? (_conDrawArrowheadSize || 20) : null,
              pts: null,
              el: null, svgEl: null, hitEl: null, visEl: null, pad: 0
            };
            const shapeList = (typeof window.conGetShapes === 'function') ? window.conGetShapes() : (window.conShapes || global.conShapes || conShapes);
            shapeList.push(s);
            if (Array.isArray(conShapes) && conShapes !== shapeList) conShapes.push(s);
            if (Array.isArray(window.conShapes) && window.conShapes !== shapeList) window.conShapes.push(s);
            if (Array.isArray(global.conShapes) && global.conShapes !== shapeList) global.conShapes.push(s);
            conShapeBuild(s);
            if (window._conMirrorSend) {
              window._conMirrorSend({
                type: 'shape-add',
                shapes: [{
                  id: s.id, type: s.type,
                  x: s.x, y: s.y, w: s.w, h: s.h,
                  lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                  pts: s.pts,
                  color: s.color, fillColor: s.fillColor,
                  thickness: s.thickness, opacity: s.opacity,
                  dashStyle: s.dashStyle, arrowheadSize: s.arrowheadSize
                }]
              });
            }
            if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
          }

          function _conDrawPointerDown(e) {
            _conSyncDrawOverlaySize();
            if (_drawActivePointerId !== null && _drawActivePointerId !== e.pointerId) return;
            _drawActivePointerId = e.pointerId;
            e.preventDefault();
            try { drawOverlay.setPointerCapture(e.pointerId); } catch (_) {
              try { if (e.target && e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId); } catch (__) {}
            }
            _conUpdateEraserOutlineByEvent(e);
            const pos = getBoardPos(e);
            if (_conDrawHandMode) return;
            // Polygon: pointer capture only — points added via click event
            if (_conDrawShapeTool === 'polygon' && !_conDrawEraserMode) {
              return;
            }
            // Shape drawing mode
            if (_conDrawShapeTool && !_conDrawEraserMode) {
              _shapeStart = pos;
              return;
            }
            livePoints = [];
            livePoints.push(pos);
            if (_conDrawEraserMode) {
              window._conMirrorDragging = true;
              _eraserPushedUndo = false;
              _eraserLastPos = pos;
              _conEraseAtPos(pos);
              return;
            }
            const liveSvg = document.getElementById('con-draw-live-svg');
            if (!liveSvg) return;
            livePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            livePath.setAttribute('fill', 'none');
            livePath.setAttribute('stroke', _conDrawColor);
            livePath.setAttribute('stroke-width', String(_conDrawThickness));
            livePath.setAttribute('stroke-linecap', 'round');
            livePath.setAttribute('stroke-linejoin', 'round');
            livePath.setAttribute('opacity', String(_conDrawOpacity));
            const _liveDash = (typeof _conShapeDashArr === 'function') ? _conShapeDashArr(_conDrawShapeDash || 'solid', _conDrawThickness) : null;
            if (_liveDash) livePath.setAttribute('stroke-dasharray', _liveDash);
            livePath.style.pointerEvents = 'none';
            livePath.setAttribute('d', `M ${pos.x} ${pos.y}`);
            liveSvg.appendChild(livePath);
            _liveMirrorThrottle = 0;
            if (window._conMirrorSend) window._conMirrorSend({
              type: 'live-path-start',
              color: _conDrawColor, thickness: _conDrawThickness, opacity: _conDrawOpacity, dashStyle: _conDrawShapeDash || 'solid'
            });
          }

          function _conDrawPointerMove(e) {
            if (_drawActivePointerId !== null && _drawActivePointerId !== e.pointerId) return;
            _conUpdateEraserOutlineByEvent(e);
            if (e.buttons === 0) return;
            const pos = getBoardPos(e);
            if (_conDrawHandMode) return;
            if (pos.x + 100 > drawOverlay.offsetWidth || pos.y + 100 > drawOverlay.offsetHeight) {
              _conSyncDrawOverlaySize();
            }
            // Polygon live edge preview
            if (_conDrawShapeTool === 'polygon' && !_conDrawEraserMode && _polygonInProgress) {
              _polygonLivePos = pos;
              _polygonPreviewUpdate();
              return;
            }
            // Shape preview
            if (_conDrawShapeTool && !_conDrawEraserMode && _shapeStart) {
              _shapeLastPos = pos;
              const _snapPos = _conShapeSnapPos(_shapeStart, pos, _conDrawShapeTool, e.ctrlKey);
              _shapePreviewUpdate(_shapeStart, _snapPos, _conDrawShapeTool);
              return;
            }
            if (_conDrawEraserMode) {
              if (_eraserLastPos) {
                const dist = Math.hypot(pos.x - _eraserLastPos.x, pos.y - _eraserLastPos.y);
                const stepSize = Math.max(4, (window._conEraserRadius || 20) * 0.5);
                if (dist > stepSize) {
                  const steps = Math.ceil(dist / stepSize);
                  for (let i = 1; i < steps; i++) {
                    const ix = _eraserLastPos.x + (pos.x - _eraserLastPos.x) * (i / steps);
                    const iy = _eraserLastPos.y + (pos.y - _eraserLastPos.y) * (i / steps);
                    _conEraseAtPos({ x: ix, y: iy });
                  }
                }
              }
              _eraserLastPos = pos;
              _conEraseAtPos(pos);
              return;
            }
            livePoints.push(pos);
            if (livePath && livePoints.length >= 2) {
              const last = livePoints[livePoints.length - 1];
              const newD = (livePath.getAttribute('d') || '') + ` L ${last.x} ${last.y}`;
              livePath.setAttribute('d', newD);
              if (window._conMirrorSend) {
                const _now = performance.now();
                if (_now - _liveMirrorThrottle >= 16) {
                  _liveMirrorThrottle = _now;
                  window._conMirrorSend({ type: 'live-path', d: newD });
                }
              }
            }
          }

          function _conDrawPointerUp(e) {
            if (_drawActivePointerId !== e.pointerId) return;
            _drawActivePointerId = null;
            if (_conDrawHandMode) { livePoints = []; livePath = null; _conSetEraserOutlineVisible(false); return; }
            // Polygon: handled via click event
            if (_conDrawShapeTool === 'polygon' && !_conDrawEraserMode) return;
            // Commit shape
            if (_conDrawShapeTool && !_conDrawEraserMode && _shapeStart) {
              const pos = getBoardPos(e);
              const _snapPos = _conShapeSnapPos(_shapeStart, pos, _conDrawShapeTool, e.ctrlKey);
              _shapeCommit(_shapeStart, _snapPos);
              _shapeStart = null;
              _shapeLastPos = null;
              _conSyncDrawOverlaySize();
              return;
            }
            if (_conDrawEraserMode) {
              _eraserLastPos = null;
              if (window._conEraserMirrorRaf) {
                cancelAnimationFrame(window._conEraserMirrorRaf);
                window._conEraserMirrorRaf = null;
              }
              _conFlushEraserMirrorMessages();
              if (_eraserPushedUndo) {
                _conSplitMultiSubstrokeDrawings();
                if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
                _eraserPushedUndo = false;
              }
              livePoints = [];
              if (e.pointerType !== 'mouse') _conSetEraserOutlineVisible(false);
              setTimeout(() => { window._conMirrorDragging = false; }, 60);
              _conSyncDrawOverlaySize();
              return;
            }
            if (livePath && livePoints.length >= 2) {
              const liveSvg = document.getElementById('con-draw-live-svg');
              if (liveSvg && livePath.parentNode === liveSvg) liveSvg.removeChild(livePath);
              const xs = livePoints.map(function (p) { return p.x; });
              const ys = livePoints.map(function (p) { return p.y; });
              const minX = Math.min.apply(null, xs);
              const minY = Math.min.apply(null, ys);
              const maxX = Math.max.apply(null, xs);
              const maxY = Math.max.apply(null, ys);
              const id = 'cd' + (_conDrawNextId++);
              const d = {
                id: id,
                x: minX, y: minY,
                w: Math.max(1, maxX - minX),
                h: Math.max(1, maxY - minY),
                points: livePoints.map(function (p) { return { x: p.x - minX, y: p.y - minY }; }),
                color: _conDrawColor,
                thickness: _conDrawThickness,
                opacity: _conDrawOpacity,
                dashStyle: _conDrawShapeDash || 'solid',
                el: null, hitPath: null, visPath: null, pad: 0
              };
              const targetDrawings = (typeof window.conGetDrawings === 'function') ? window.conGetDrawings() : (global.conDrawings || conDrawings);
              if (!targetDrawings.includes(d)) targetDrawings.push(d);
              if (conDrawings !== targetDrawings && Array.isArray(conDrawings) && !conDrawings.includes(d)) conDrawings.push(d);
              if (global.conDrawings && global.conDrawings !== targetDrawings && !global.conDrawings.includes(d)) global.conDrawings.push(d);
              conDrawingBuild(d);
              _conSyncDrawOverlaySize();
              if (window._conMirrorSend) {
                window._conMirrorSend({
                  type: 'drawing-add',
                  drawings: [{
                    id: d.id,
                    x: d.x,
                    y: d.y,
                    w: d.w,
                    h: d.h,
                    points: d.points,
                    color: d.color,
                    thickness: d.thickness,
                    opacity: d.opacity,
                    dashStyle: d.dashStyle || 'solid'
                  }]
                });
              }
              if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
            } else if (livePath) {
              const liveSvg = document.getElementById('con-draw-live-svg');
              if (liveSvg && livePath.parentNode === liveSvg) liveSvg.removeChild(livePath);
            }
            livePath = null;
            livePoints = [];
            if (window._conMirrorSend) window._conMirrorSend({ type: 'live-path-commit' });
            if (e.pointerType !== 'mouse') _conSetEraserOutlineVisible(false);
            _conSyncDrawOverlaySize();
          }

          function _conDrawPointerCancel(e) {
            if (_drawActivePointerId !== e.pointerId) return;
            _drawActivePointerId = null;
            if (_conDrawEraserMode) {
              _eraserLastPos = null;
              if (window._conEraserMirrorRaf) {
                cancelAnimationFrame(window._conEraserMirrorRaf);
                window._conEraserMirrorRaf = null;
              }
              _conFlushEraserMirrorMessages();
              if (_eraserPushedUndo) {
                _conSplitMultiSubstrokeDrawings();
                if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
                _eraserPushedUndo = false;
                if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
              }
              livePoints = [];
              _conSetEraserOutlineVisible(false);
              setTimeout(() => { window._conMirrorDragging = false; }, 60);
              return;
            }
            const liveSvg = document.getElementById('con-draw-live-svg');
            if (livePath && liveSvg && livePath.parentNode === liveSvg) liveSvg.removeChild(livePath);
            livePath = null;
            livePoints = [];
            _shapeStart = null;
            _shapeLastPos = null;
            if (window._conMirrorSend) window._conMirrorSend({ type: 'live-path-end' });
            _conSetEraserOutlineVisible(false);
          }

          drawOverlay.addEventListener('pointerdown', _conDrawPointerDown);
          drawOverlay.addEventListener('pointermove', _conDrawPointerMove);
          drawOverlay.addEventListener('pointerup', _conDrawPointerUp);
          drawOverlay.addEventListener('pointercancel', _conDrawPointerCancel);

          drawOverlay.addEventListener('pointerenter', function (e) {
            _conUpdateEraserOutlineByEvent(e);
          });

          drawOverlay.addEventListener('lostpointercapture', function (e) {
            if (_drawActivePointerId === e.pointerId) _drawActivePointerId = null;
          });

          drawOverlay.addEventListener('mouseleave', function () {
            _conSetEraserOutlineVisible(false);
          });

          const brdEl = document.getElementById('constellation-board');
          if (brdEl) {
            brdEl.addEventListener('scroll', function () {
              if (typeof conMode !== 'undefined' && conMode === 'draw') {
                _conSyncDrawOverlaySize();
              }
            }, { passive: true });

            brdEl.addEventListener('pointerdown', function (e) {
              if (typeof conMode !== 'undefined' && conMode === 'draw') {
                _conSyncDrawOverlaySize();
                if (e.target !== drawOverlay && !drawOverlay.contains(e.target)) {
                  _conDrawPointerDown(e);
                }
              }
            }, true);
          }

          window.addEventListener('resize', function () {
            if (typeof conMode !== 'undefined' && conMode === 'draw') {
              _conSyncDrawOverlaySize();
            }
          });

          window.addEventListener('pointermove', function (e) {
            if (typeof conMode !== 'undefined' && conMode === 'draw' && _drawActivePointerId !== null && _drawActivePointerId === e.pointerId && e.target !== drawOverlay) {
              _conDrawPointerMove(e);
            }
          });

          window.addEventListener('pointerup', function (e) {
            if (typeof conMode !== 'undefined' && conMode === 'draw' && _drawActivePointerId !== null && _drawActivePointerId === e.pointerId && e.target !== drawOverlay) {
              _conDrawPointerUp(e);
            }
          });

          // Polygon: click to add points, double-click to close
          drawOverlay.addEventListener('click', function (e) {
            if (_conDrawHandMode) return;
            if (_conDrawShapeTool !== 'polygon' || _conDrawEraserMode) return;
            e.stopPropagation();
            const pos = getBoardPos(e);
            const prev = _polygonPoints.length > 0 ? _polygonPoints[_polygonPoints.length - 1] : null;
            const snapped = e.ctrlKey && prev ? _conPolygonSnapAngle(prev, pos) : pos;
            if (!_polygonInProgress) {
              _polygonInProgress = true;
              _polygonPoints = [snapped];
            } else {
              const fp = _polygonPoints[0];
              const dist = Math.hypot(snapped.x - fp.x, snapped.y - fp.y);
              if (_polygonPoints.length >= 3 && dist < Math.max(12, _conDrawThickness * 3)) {
                _polygonCommit();
              } else {
                _polygonPoints.push(snapped);
              }
            }
            _polygonPreviewUpdate();
          });

          drawOverlay.addEventListener('dblclick', function (e) {
            if (_conDrawHandMode) return;
            if (_conDrawShapeTool !== 'polygon' || _conDrawEraserMode || !_polygonInProgress) return;
            e.stopPropagation();
            // dblclick fires after two clicks; the second click already added a point — remove it
            if (_polygonPoints.length > 3) _polygonPoints.pop();
            _polygonCommit();
          });

          // Polygon live edge: track mouse without button pressed
          drawOverlay.addEventListener('mousemove', function (e) {
            _conUpdateEraserOutlineByEvent(e);
            if (_conDrawHandMode) return;
            if (_conDrawShapeTool !== 'polygon' || _conDrawEraserMode || !_polygonInProgress) return;
            if (e.buttons !== 0) return; // handled by pointermove when button held
            _polygonLivePos = getBoardPos(e);
            _polygonPreviewUpdate();
          });

          // Hand tool: pan board on empty drag, move drawing when dragging over it.
          let _handActive = false;
          let _handStartX = 0, _handStartY = 0;
          let _handStartScrollX = 0, _handStartScrollY = 0;
          let _handDragDrawingSnaps = null;
          let _handDragSceneSnaps = null;
          let _handUndoPushed = false;

          function _conBuildHandSceneSnaps() {
            const boardEl = document.getElementById('constellation-board');
            const liveNotes = (typeof window.conGetNotes === 'function')
              ? window.conGetNotes()
              : (window.conNotes || (typeof conNotes !== 'undefined' ? conNotes : []));
            const liveDrawings = (typeof window.conGetDrawings === 'function')
              ? window.conGetDrawings()
              : (window.conDrawings || (typeof conDrawings !== 'undefined' ? conDrawings : []));
            const liveShapes = (typeof window.conGetShapes === 'function')
              ? window.conGetShapes()
              : (window.conShapes || (typeof conShapes !== 'undefined' ? conShapes : []));
            const liveTables = (typeof window.conGetTables === 'function')
              ? window.conGetTables()
              : (window.conTables || (typeof conTables !== 'undefined' ? conTables : []));
            return {
              boardEl,
              nodes: conNodes.map(n => ({ n, sx: n.x, sy: n.y })),
              notes: liveNotes.map(note => ({ note, sx: note.x, sy: note.y })),
              drawings: liveDrawings.map(dr => ({ dr, sx: dr.x, sy: dr.y })),
              shapes: liveShapes.map(s => ({
                s,
                sx: s.x,
                sy: s.y,
                slx1: s.lx1,
                sly1: s.ly1,
                slx2: s.lx2,
                sly2: s.ly2
              })),
              tables: liveTables.map(tbl => ({ tbl, sx: tbl.x, sy: tbl.y })),
              masks: conMasks.map(m => ({ m, sx: m.x, sy: m.y })),
              media: conMediaItems.map(item => ({ item, sx: item.x, sy: item.y })),
              groups: conGroups.map(g => ({
                g,
                sx: parseFloat((g.el && g.el.style && g.el.style.left) || '0') || 0,
                sy: parseFloat((g.el && g.el.style && g.el.style.top) || '0') || 0
              }))
            };
          }

          function _conApplyHandSceneDelta(snaps, dx, dy) {
            if (!snaps) return;

            snaps.nodes.forEach(({ n, sx, sy }) => {
              n.x = sx + dx;
              n.y = sy + dy;
              if (n.el) {
                n.el.style.left = n.x + 'px';
                n.el.style.top = n.y + 'px';
              }
            });

            snaps.notes.forEach(({ note, sx, sy }) => {
              note.x = sx + dx;
              note.y = sy + dy;
              const noteEl = (typeof window.wnGetNoteElementById === 'function')
                ? window.wnGetNoteElementById(note.id)
                : ((typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(note.id) : document.querySelector(`.con-word-note[data-id="${note.id}"]`));
              if (noteEl) {
                noteEl.style.left = note.x + 'px';
                noteEl.style.top = note.y + 'px';
              }
            });

            snaps.drawings.forEach(({ dr, sx, sy }) => {
              dr.x = sx + dx;
              dr.y = sy + dy;
              if (dr.el) {
                dr.el.style.left = (dr.x - dr.pad) + 'px';
                dr.el.style.top = (dr.y - dr.pad) + 'px';
              }
              if (typeof _conDrawingUpdateHandles === 'function') _conDrawingUpdateHandles(dr);
            });

            snaps.shapes.forEach(({ s, sx, sy, slx1, sly1, slx2, sly2 }) => {
              s.x = sx + dx;
              s.y = sy + dy;
              if (slx1 !== undefined && slx1 !== null) s.lx1 = slx1 + dx;
              if (sly1 !== undefined && sly1 !== null) s.ly1 = sly1 + dy;
              if (slx2 !== undefined && slx2 !== null) s.lx2 = slx2 + dx;
              if (sly2 !== undefined && sly2 !== null) s.ly2 = sly2 + dy;
              if (s.el) {
                s.el.style.left = (s.x - s.pad) + 'px';
                s.el.style.top = (s.y - s.pad) + 'px';
              }
              if (typeof _conShapeUpdateHandles === 'function') _conShapeUpdateHandles(s);
            });

            if (snaps.tables) {
              snaps.tables.forEach(({ tbl, sx, sy }) => {
                tbl.x = sx + dx;
                tbl.y = sy + dy;
                if (tbl.el) {
                  tbl.el.style.left = tbl.x + 'px';
                  tbl.el.style.top = tbl.y + 'px';
                }
              });
            }

            snaps.masks.forEach(({ m, sx, sy }) => {
              m.x = sx + dx;
              m.y = sy + dy;
              if (typeof conApplyMaskStyle === 'function') conApplyMaskStyle(m);
            });

            snaps.media.forEach(({ item, sx, sy }) => {
              item.x = sx + dx;
              item.y = sy + dy;
              const wrap = document.querySelector('#constellation-board .con-media-item[data-id="' + item.id + '"]');
              if (wrap) {
                wrap.style.left = item.x + 'px';
                wrap.style.top = item.y + 'px';
              }
            });

            snaps.groups.forEach(({ g, sx, sy }) => {
              const gx = sx + dx;
              const gy = sy + dy;
              if (g.el) {
                g.el.style.left = gx + 'px';
                g.el.style.top = gy + 'px';
              }
              g._px = gx;
              g._py = gy;
            });

            conRedrawEdges();
          }

          function _conFinalizeHandScene(snaps) {
            if (!snaps || !snaps.boardEl) return;
            const boardEl = snaps.boardEl;
            const boardCenterX = boardEl.clientWidth / 2;
            const boardCenterY = boardEl.clientHeight / 2;
            const z = (typeof conCurrentZoom !== 'undefined' && Number.isFinite(conCurrentZoom) && conCurrentZoom > 0) ? conCurrentZoom : 1;
            snaps.nodes.forEach(({ n }) => {
              n.baseX = boardCenterX + (n.x - boardCenterX) / z;
              n.baseY = boardCenterY + (n.y - boardCenterY) / z;
            });
            if (snaps.notes) {
              snaps.notes.forEach(({ note }) => {
                note.baseX = boardCenterX + (note.x - boardCenterX) / z;
                note.baseY = boardCenterY + (note.y - boardCenterY) / z;
              });
            }
            if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
            // Mirror sync
            if (window._conMirrorSend) {
              if (snaps.nodes && snaps.nodes.length > 0) {
                window._conMirrorSend({
                  type: 'node-move',
                  positions: snaps.nodes.map(({ n }) => ({ id: n.id, x: n.x, y: n.y }))
                });
              }
              if (snaps.notes && snaps.notes.length > 0) {
                window._conMirrorSend({
                  type: 'note-move',
                  positions: snaps.notes.map(({ note }) => ({ id: note.id, x: note.x, y: note.y }))
                });
              }
              if (snaps.drawings && snaps.drawings.length > 0) {
                window._conMirrorSend({
                  type: 'drawing-move',
                  positions: snaps.drawings.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y }))
                });
              }
              if (snaps.shapes && snaps.shapes.length > 0) {
                window._conMirrorSend({
                  type: 'shape-move',
                  positions: snaps.shapes.map(({ s }) => ({
                    id: s.id, x: s.x, y: s.y,
                    lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                    pts: s.pts ? s.pts.map(p => ({ ...p })) : undefined
                  }))
                });
              }
              if (snaps.tables && snaps.tables.length > 0) {
                window._conMirrorSend({
                  type: 'table-move',
                  positions: snaps.tables.map(({ tbl }) => ({ id: tbl.id, x: tbl.x, y: tbl.y }))
                });
              }
            }
            if (typeof conMarkDirty === 'function') conMarkDirty();
            else if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
          }

          function _conFindTopDrawingAt(pos) {
            const liveDrawings = (typeof window.conGetDrawings === 'function')
              ? window.conGetDrawings()
              : (window.conDrawings || conDrawings || []);
            for (let i = liveDrawings.length - 1; i >= 0; i--) {
              const d = liveDrawings[i];
              if (!d) continue;
              const pad = Math.max(10, (d.thickness || 4) + 8);
              if (pos.x >= d.x - pad && pos.x <= d.x + d.w + pad && pos.y >= d.y - pad && pos.y <= d.y + d.h + pad) {
                return d;
              }
            }
            return null;
          }

          drawOverlay.addEventListener('pointerdown', function (e) {
            if (!_conDrawHandMode) return;
            e.preventDefault();
            drawOverlay.setPointerCapture(e.pointerId);
            const b = document.getElementById('constellation-board');
            const pos = getBoardPos(e);
            _handActive = true;
            _handUndoPushed = false;
            _handStartX = e.clientX;
            _handStartY = e.clientY;
            _handStartScrollX = b ? b.scrollLeft : 0;
            _handStartScrollY = b ? b.scrollTop : 0;

            const hit = _conFindTopDrawingAt(pos);
            if (hit) {
              const selIds = conDrawingSelected.has(hit.id) && conDrawingSelected.size > 1
                ? Array.from(conDrawingSelected)
                : [hit.id];
              _handDragDrawingSnaps = selIds.map(function (did) {
                const liveDrawings = (typeof window.conGetDrawings === 'function') ? window.conGetDrawings() : (window.conDrawings || conDrawings || []);
                const dr = liveDrawings.find(x => x.id === did);
                return dr ? { dr: dr, sx: dr.x, sy: dr.y } : null;
              }).filter(Boolean);
              _handDragSceneSnaps = null;
            } else {
              _handDragDrawingSnaps = null;
              _handDragSceneSnaps = _conBuildHandSceneSnaps();
            }
            drawOverlay.style.cursor = 'grabbing';
          }, true);

          drawOverlay.addEventListener('pointermove', function (e) {
            if (!_conDrawHandMode || !_handActive) return;
            const dx = e.clientX - _handStartX;
            const dy = e.clientY - _handStartY;
            if (!_handUndoPushed && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
              conPushUndo();
              _handUndoPushed = true;
            }
            if (_handDragDrawingSnaps && _handDragDrawingSnaps.length) {
              _handDragDrawingSnaps.forEach(function (snap) {
                const dr = snap.dr;
                dr.x = snap.sx + dx;
                dr.y = snap.sy + dy;
                if (dr.el) {
                  dr.el.style.left = (dr.x - dr.pad) + 'px';
                  dr.el.style.top = (dr.y - dr.pad) + 'px';
                }
                if (typeof _conDrawingUpdateHandles === 'function') _conDrawingUpdateHandles(dr);
              });
            } else if (_handDragSceneSnaps) {
              _conApplyHandSceneDelta(_handDragSceneSnaps, dx, dy);
            } else {
              const b = document.getElementById('constellation-board');
              if (b) {
                b.scrollLeft = _handStartScrollX - dx;
                b.scrollTop = _handStartScrollY - dy;
              }
            }
          }, true);

          function _conHandEnd() {
            if (!_handActive) return;
            if (_handDragDrawingSnaps && _handDragDrawingSnaps.length) {
              if (window._conMirrorSend) {
                _handDragDrawingSnaps.forEach(function (snap) {
                  window._conMirrorSend({ type: 'drawing-move', id: String(snap.dr.id), x: snap.dr.x, y: snap.dr.y });
                });
              }
              if (typeof conMarkDirty === 'function') conMarkDirty();
              else if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
            }
            if (_handDragSceneSnaps) _conFinalizeHandScene(_handDragSceneSnaps);
            _handActive = false;
            _handDragDrawingSnaps = null;
            _handDragSceneSnaps = null;
            _handUndoPushed = false;
            _conDrawSyncOverlayCursor();
          }

          drawOverlay.addEventListener('pointerup', _conHandEnd, true);
          drawOverlay.addEventListener('pointercancel', _conHandEnd, true);
          drawOverlay.addEventListener('lostpointercapture', _conHandEnd, true);

          // Refresh shape preview when Ctrl is pressed/released mid-drag
          document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && _polygonInProgress && conMode === 'draw') {
              _polygonReset();
              return;
            }
            if (e.key === 'Control' && _shapeStart && _shapeLastPos && _conDrawShapeTool && !_conDrawEraserMode) {
              const snapped = _conShapeSnapPos(_shapeStart, _shapeLastPos, _conDrawShapeTool, true);
              _shapePreviewUpdate(_shapeStart, snapped, _conDrawShapeTool);
            }
          });
          document.addEventListener('keyup', function (e) {
            if (e.key === 'Control' && _shapeStart && _shapeLastPos && _conDrawShapeTool && !_conDrawEraserMode) {
              _shapePreviewUpdate(_shapeStart, _shapeLastPos, _conDrawShapeTool);
            }
          });

          function _conDrawAbort() {
            if (_shapePreviewEl) {
              const liveSvg = document.getElementById('con-draw-live-svg');
              if (liveSvg && _shapePreviewEl.parentNode === liveSvg) liveSvg.removeChild(_shapePreviewEl);
              _shapePreviewEl = null;
            }
            _shapeStart = null;
            _shapeLastPos = null;
            // Note: polygon state is NOT reset here — it uses click-based flow and
            // lostpointercapture fires after every click, so _polygonReset() must
            // NOT be called from here. Reset polygon via Escape, tool change, or commit.
            if (livePath) {
              const liveSvg = document.getElementById('con-draw-live-svg');
              if (liveSvg && livePath.parentNode === liveSvg) liveSvg.removeChild(livePath);
            }
            livePath = null;
            livePoints = [];
          }

          drawOverlay.addEventListener('pointercancel', function () { _conDrawAbort(); _polygonReset(); });
          drawOverlay.addEventListener('lostpointercapture', _conDrawAbort);
        })();
      });

      // ---- Spread / equalise ----
      window.conSpreadNodes = function conSpreadNodes() {
        const nodes = conNodes;
        if (nodes.length < 2) return;
        const brd = board();
        const bw = brd.clientWidth;
        const bh = brd.clientHeight;

        const units = [];
        const assignedNodeIds = new Set();

        conGroups.forEach(g => {
          const members = nodes.filter(n => g.nodeIds.includes(n.id));
          if (members.length === 0) return;
          members.forEach(n => assignedNodeIds.add(n.id));
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          members.forEach(n => {
            const w = n.el.offsetWidth || 80;
            const h = n.el.offsetHeight || 28;
            minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + w); maxY = Math.max(maxY, n.y + h);
          });
          const gcx = (minX + maxX) / 2, gcy = (minY + maxY) / 2;
          units.push({
            cx: gcx, cy: gcy,
            w: maxX - minX + GROUP_PAD * 2,
            h: maxY - minY + GROUP_PAD * 2,
            isGroup: true,
            isPhraseGroup: !!g.phraseGroup,
            group: g,
            memberOffsets: members.map(n => ({
              n,
              dx: (n.x + (n.el.offsetWidth || 80) / 2) - gcx,
              dy: (n.y + (n.el.offsetHeight || 28) / 2) - gcy,
              w: n.el.offsetWidth || 80,
              h: n.el.offsetHeight || 28,
            })),
          });
        });

        nodes.forEach(n => {
          if (assignedNodeIds.has(n.id)) return;
          const w = n.el.offsetWidth || 80, h = n.el.offsetHeight || 28;
          units.push({ cx: n.x + w / 2, cy: n.y + h / 2, w, h, isGroup: false, node: n, locked: conIsNodeLocked(n) });
        });

        const PADDING = 16;
        const ITER_INTER = 120;
        const ITER_INTRA = 80;
        const INTRA_PAD = 12;

        // Intra-group: spread members inside each group (skip phrase groups)
        units.forEach(unit => {
          if (!unit.isGroup || unit.isPhraseGroup || unit.memberOffsets.length < 2) return;
          const mems = unit.memberOffsets.map(m => ({ ...m, cx: unit.cx + m.dx, cy: unit.cy + m.dy }));
          for (let iter = 0; iter < ITER_INTRA; iter++) {
            const forces = mems.map(() => ({ fx: 0, fy: 0 }));
            for (let i = 0; i < mems.length; i++) {
              for (let j = i + 1; j < mems.length; j++) {
                const a = mems[i], b = mems[j];
                const dx = b.cx - a.cx || 0.1, dy = b.cy - a.cy;
                const ox = (a.w / 2 + b.w / 2 + INTRA_PAD) - Math.abs(dx);
                const oy = (a.h / 2 + b.h / 2 + INTRA_PAD) - Math.abs(dy);
                if (ox > 0 && oy > 0) {
                  let px = 0, py = 0;
                  if (ox < oy) px = (ox / 2 + 0.5) * Math.sign(dx);
                  else py = (oy / 2 + 0.5) * Math.sign(dy || 1);
                  forces[i].fx -= px; forces[i].fy -= py;
                  forces[j].fx += px; forces[j].fy += py;
                }
              }
            }
            mems.forEach((m, i) => { if (conIsNodeLocked(m.n)) return; m.cx += forces[i].fx; m.cy += forces[i].fy; });
          }
          mems.forEach((m, i) => {
            if (conIsNodeLocked(m.n)) return;
            unit.memberOffsets[i].dx = m.cx - unit.cx;
            unit.memberOffsets[i].dy = m.cy - unit.cy;
          });
          let mhw = 0, mhh = 0;
          unit.memberOffsets.forEach(m => {
            mhw = Math.max(mhw, Math.abs(m.dx) + m.w / 2);
            mhh = Math.max(mhh, Math.abs(m.dy) + m.h / 2);
          });
          unit.w = (mhw + GROUP_PAD) * 2;
          unit.h = (mhh + GROUP_PAD) * 2;
        });

        // Inter-unit: spread groups/lone-nodes from each other
        if (units.length > 1) {
          for (let iter = 0; iter < ITER_INTER; iter++) {
            const forces = units.map(() => ({ fx: 0, fy: 0 }));
            for (let i = 0; i < units.length; i++) {
              for (let j = i + 1; j < units.length; j++) {
                const a = units[i], b = units[j];
                const dx = b.cx - a.cx || 0.1, dy = b.cy - a.cy;
                const ox = (a.w / 2 + b.w / 2 + PADDING) - Math.abs(dx);
                const oy = (a.h / 2 + b.h / 2 + PADDING) - Math.abs(dy);
                if (ox > 0 && oy > 0) {
                  let px = 0, py = 0;
                  if (ox < oy) px = (ox / 2 + 0.5) * Math.sign(dx);
                  else py = (oy / 2 + 0.5) * Math.sign(dy || 1);
                  forces[i].fx -= px; forces[i].fy -= py;
                  forces[j].fx += px; forces[j].fy += py;
                }
              }
            }
            units.forEach((u, i) => {
              if (u.locked) return;
              u.cx += forces[i].fx; u.cy += forces[i].fy;
              u.cx = Math.max(u.w / 2 + 4, Math.min(bw - u.w / 2 - 4, u.cx));
              u.cy = Math.max(u.h / 2 + 4, Math.min(bh - u.h / 2 - 4, u.cy));
            });
          }
        }

        // Apply
        const boardCenterX = bw / 2;
        const boardCenterY = bh / 2;
        units.forEach(unit => {
          if (unit.isGroup) {
            unit.memberOffsets.forEach(({ n, dx, dy, w, h }) => {
              n.x = unit.cx + dx - w / 2; n.y = unit.cy + dy - h / 2;
              n.baseX = boardCenterX + (n.x - boardCenterX) / conCurrentZoom;
              n.baseY = boardCenterY + (n.y - boardCenterY) / conCurrentZoom;
              n.el.style.transition = 'left 0.4s ease, top 0.4s ease';
              n.el.style.left = n.x + 'px'; n.el.style.top = n.y + 'px';
            });
          } else {
            unit.node.x = unit.cx - unit.w / 2; unit.node.y = unit.cy - unit.h / 2;
            unit.node.baseX = boardCenterX + (unit.node.x - boardCenterX) / conCurrentZoom;
            unit.node.baseY = boardCenterY + (unit.node.y - boardCenterY) / conCurrentZoom;
            unit.node.el.style.transition = 'left 0.4s ease, top 0.4s ease';
            if (!unit.locked) {
              unit.node.el.style.left = unit.node.x + 'px'; unit.node.el.style.top = unit.node.y + 'px';
            }
          }
        });

        conRedrawEdges(); conGroupRefitAll();
        setTimeout(() => {
          units.forEach(u => {
            if (u.isGroup) u.memberOffsets.forEach(({ n }) => { n.el.style.transition = ''; });
            else u.node.el.style.transition = '';
          });
          conRedrawEdges(); conGroupRefitAll();
        }, 450);
      };

      // Spread members within a single group (e.g., newly created group from drag & drop)
      window.conSpreadGroup = function conSpreadGroup(group) {
        if (!group || group.nodeIds.length < 2) return;
        // Phrase groups have their own layout — no force-spread
        if (group.phraseGroup) { conPhraseGroupLayout(group); return; }
        const members = conNodes.filter(n => group.nodeIds.includes(n.id));
        if (members.length < 2) return;

        // Calculate group center
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        members.forEach(n => {
          const w = n.el.offsetWidth || 80;
          const h = n.el.offsetHeight || 28;
          minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x + w); maxY = Math.max(maxY, n.y + h);
        });
        const gcx = (minX + maxX) / 2, gcy = (minY + maxY) / 2;

        // Build member offsets
        const mems = members.map(n => ({
          n,
          cx: n.x + (n.el.offsetWidth || 80) / 2,
          cy: n.y + (n.el.offsetHeight || 28) / 2,
          w: n.el.offsetWidth || 80,
          h: n.el.offsetHeight || 28,
        }));

        const ITER_INTRA = 80;
        const INTRA_PAD = 12;

        // Spread members inside the group
        for (let iter = 0; iter < ITER_INTRA; iter++) {
          const forces = mems.map(() => ({ fx: 0, fy: 0 }));
          for (let i = 0; i < mems.length; i++) {
            for (let j = i + 1; j < mems.length; j++) {
              const a = mems[i], b = mems[j];
              const dx = b.cx - a.cx || 0.1, dy = b.cy - a.cy;
              const ox = (a.w / 2 + b.w / 2 + INTRA_PAD) - Math.abs(dx);
              const oy = (a.h / 2 + b.h / 2 + INTRA_PAD) - Math.abs(dy);
              if (ox > 0 && oy > 0) {
                let px = 0, py = 0;
                if (ox < oy) px = (ox / 2 + 0.5) * Math.sign(dx);
                else py = (oy / 2 + 0.5) * Math.sign(dy || 1);
                forces[i].fx -= px; forces[i].fy -= py;
                forces[j].fx += px; forces[j].fy += py;
              }
            }
          }
          mems.forEach((m, i) => { if (conIsNodeLocked(m.n)) return; m.cx += forces[i].fx; m.cy += forces[i].fy; });
        }

        // Apply new positions
        mems.forEach(m => {
          if (conIsNodeLocked(m.n)) return;
          m.n.x = m.cx - m.w / 2;
          m.n.y = m.cy - m.h / 2;
          m.n.el.style.transition = 'left 0.4s ease, top 0.4s ease';
          m.n.el.style.left = m.n.x + 'px';
          m.n.el.style.top = m.n.y + 'px';
        });

        conRedrawEdges(); conGroupRefit(group);
        setTimeout(() => {
          mems.forEach(m => { m.n.el.style.transition = ''; });
          conRedrawEdges(); conGroupRefit(group);
        }, 450);
      };

      window.conGetNodes = global.conGetNodes = function () { return conNodes; };
      window.conGetEdges = global.conGetEdges = function () { return conEdges; };
      window.conGetGroups = global.conGetGroups = function () { return conGroups; };
      window.conGroupSelected = global.conGroupSelected = conGroupSelected;
      window.conInitSwatches = global.conInitSwatches = conInitSwatches;
      window.conAttachNodeEvents = global.conAttachNodeEvents = conAttachNodeEvents;
      window.conAttachNode = global.conAttachNode = conAttachNodeEvents;
      window.conattachnode = global.conattachnode = conAttachNodeEvents;
      window.conGetCtxNodeId = global.conGetCtxNodeId = function () { return (typeof conCtxNodeId !== 'undefined' ? conCtxNodeId : null); };
      window.conSetNextId = global.conSetNextId = function (n) { if (typeof conNextId !== 'undefined' && n > conNextId) conNextId = n; };
      window.conGetNextId = global.conGetNextId = function () { return conNextId++; };
      window.taGetLines = global.taGetLines = function () { return (typeof taLines !== 'undefined') ? taLines : []; };
      window.conComputeEdgeGeometry = global.conComputeEdgeGeometry = conComputeEdgeGeometry;
      window.conAddEdge = global.conAddEdge = conAddEdge;
      window.conEnsureSvgDefs = global.conEnsureSvgDefs = conEnsureSvgDefs;
      window.conUpdateEdge = global.conUpdateEdge = conUpdateEdge;
      window.conRedrawEdges = global.conRedrawEdges = conRedrawEdges;
      window.conApplyEdgeLabelStyle = global.conApplyEdgeLabelStyle = conApplyEdgeLabelStyle;
      window.conFindFreePosition = global.conFindFreePosition = conFindFreePosition;
      window.conRenderNodeLabel = global.conRenderNodeLabel = conRenderNodeLabel;
      window.conIsNodeLocked = global.conIsNodeLocked = conIsNodeLocked;
      window.conSyncNodeLockState = global.conSyncNodeLockState = conSyncNodeLockState;

      window.conSelect = global.conSelect = conSelect;
      window.conNodeClearSelection = global.conNodeClearSelection = conNodeClearSelection;
      window.conClearSelection = global.conClearSelection = conNodeClearSelection;
      window.conAddWordAt = global.conAddWordAt = conAddWordAt;
      window.conRemoveNode = global.conRemoveNode = conRemoveNode;
      window.conDeleteNode = global.conDeleteNode = function (id) { return conRemoveNode(id); };
      window.conDuplicateNodeById = global.conDuplicateNodeById = conDuplicateNodeById;
      window.conRemoveEdge = global.conRemoveEdge = conRemoveEdge;
      window._conCancelLinkMode = global._conCancelLinkMode = _conCancelLinkMode;
      window.conCancelLinkMode = global.conCancelLinkMode = _conCancelLinkMode;
      window._conStartLinkMode = global._conStartLinkMode = _conStartLinkMode;
      window.conGetLinkSrc = global.conGetLinkSrc = function () { return _conLinkSrc; };
      window.conGetLinkSrcIds = global.conGetLinkSrcIds = function () { return _conLinkSrcIds.slice(); };
      window.conGetSelected = global.conGetSelected = function () { return conSelected; };
      window.conGetMultiSelected = global.conGetMultiSelected = function () { return conMultiSelected; };
      window.conAddMultiSelected = global.conAddMultiSelected = function (id) {
        if (!id) return;
        conMultiSelected.add(id);
        const n = conNodes.find(x => x && (x.id === id || String(x.id) === String(id)));
        if (n && n.el) {
          n.el.classList.remove('con-selected');
          n.el.classList.add('con-multi-selected');
        }
      };
      window.conSetMultiSelected = global.conSetMultiSelected = conSetMultiSelected;
      window.conGetGroupFocused = global.conGetGroupFocused = function () { return conGroupFocused; };
      window.conGetEffectiveZoom = global.conGetEffectiveZoom = conGetEffectiveZoom;
      window.conResolveLinkAnchor = global.conResolveLinkAnchor = conResolveLinkAnchor;
      window.conGetAnchorPoint = global.conGetAnchorPoint = conGetAnchorPoint;
      window.conNodeEdgeOffset = global.conNodeEdgeOffset = conNodeEdgeOffset;
      window.conSnapEnabled = global.conSnapEnabled = conSnapEnabled;
      window.conGroupFocused = global.conGroupFocused = conGroupFocused;
      window.conCtxNodeId = global.conCtxNodeId = conCtxNodeId;
      window.conCreateEdge = global.conCreateEdge = function(src, tgt) { return conAddEdge(src, tgt); };
      window.conSyncNodeBasePosition = global.conSyncNodeBasePosition = conSyncNodeBasePosition;
      window.conUpdateToolbarStatus = global.conUpdateToolbarStatus = function () {};
      window.conUpdateNodeStarVisual = global.conUpdateNodeStarVisual = function (n) { if (typeof conSyncNodeStarState === 'function') return conSyncNodeStarState(n); };
      window._conSelectedEdgeId = global._conSelectedEdgeId = (typeof _conSelectedEdgeId !== 'undefined' ? _conSelectedEdgeId : null);
      window._conSetupThicknessSlider = global._conSetupThicknessSlider = _conSetupThicknessSlider;
      window._conSetupThicknessNumberInput = global._conSetupThicknessNumberInput = _conSetupThicknessSlider;

      // Cross-module exports (inside inner IIFE so local functions are in scope)
      window.conToggleNodeStarDirect = global.conToggleNodeStarDirect = conToggleNodeStarDirect;
      window.conGetTranslationChoices = global.conGetTranslationChoices = conGetTranslationChoices;
      window.conGetIpaChoices = global.conGetIpaChoices = conGetIpaChoices;
      window.conGetEtymologyChoices = global.conGetEtymologyChoices = conGetEtymologyChoices;
      window.conTransPickerOpen = global.conTransPickerOpen = conTransPickerOpen;
      window.conApplyEntityBadge = global.conApplyEntityBadge = conApplyEntityBadge;
      window.conHandleEntityClickForNumbering = global.conHandleEntityClickForNumbering = conHandleEntityClickForNumbering;
    })();

})(typeof window !== "undefined" ? window : this);
