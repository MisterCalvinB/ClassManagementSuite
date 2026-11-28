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

      if (typeof global.conCtxNodeId === "undefined") global.conCtxNodeId = null;
      if (typeof global._conEdgeCtxId === "undefined") global._conEdgeCtxId = null;
      if (typeof global._boardMenuLocked === "undefined") global._boardMenuLocked = false;
    (function () {
      global.conNodes = (global.conNodes = window.conNodes = (global.conNodes || []));
      global.conEdges = (global.conEdges = window.conEdges = (global.conEdges || []));
      Board._bnMode = 'move'; // 'move' | 'connect' | 'delete'
      global.conSnapEnabled = true; // snap-to-align when dragging elements or resizing notes
      function conToggleSnap() {
        conSnapEnabled = !conSnapEnabled;
        const btn = document.getElementById('con-snap-toggle-btn');
        if (btn) btn.classList.toggle('con-panel-active', conSnapEnabled);
      }
      window.conToggleSnap = conToggleSnap;
      window.conGetSnapEnabled = function () { return conSnapEnabled; };

      // ----------------------------------------------------------------
      // Unified Collapsible Toolbar Drawer (Pinned vs Auto-Hide on Hover)
      // ----------------------------------------------------------------
      let _conToolbarPinned = true;
      let _conToolbarLeaveTimer = null;

      function conHasOpenDropdownMenu() {
        const wrapper = document.getElementById('con-sticky-wrapper');
        if (!wrapper) return false;
        // Check dropdowns and popovers inside the drawer that are actually visible
        const dropSelectors = [
          '#con-draw-shapes-menu',
          '#con-draw-colour-menu',
          '#con-draw-line-menu',
          '#con-draw-eraser-menu',
          '#con-class-pills',
          '#con-bp-popover',
          '#con-quick-actions-dropdown'
        ];
        for (let i = 0; i < dropSelectors.length; i++) {
          const el = wrapper.querySelector(dropSelectors[i]);
          if (el && el.style.display && el.style.display !== 'none') {
            return true;
          }
        }
        if (wrapper.querySelector('.con-tb-group.open')) {
          return true;
        }
        return false;
      }

      function conCloseToolbarMenus(exceptGroup) {
        const toolbar = document.getElementById('constellation-toolbar');
        if (!toolbar) return;
        toolbar.querySelectorAll('.con-tb-group.open').forEach(function (grp) {
          if (exceptGroup && grp === exceptGroup) return;
          grp.classList.remove('open');
          const lbl = grp.querySelector(':scope > .con-tb-group-label');
          if (lbl) lbl.setAttribute('aria-expanded', 'false');
        });
        conUpdateToolbarDropdownState();
      }
      window.conCloseToolbarMenus = global.conCloseToolbarMenus = conCloseToolbarMenus;

      function conInitToolbarMenuListeners() {
        const toolbar = document.getElementById('constellation-toolbar');
        if (toolbar && !toolbar._hasClickMenuListeners) {
          toolbar._hasClickMenuListeners = true;
          toolbar.querySelectorAll('.con-tb-group').forEach(function (grp) {
            const lbl = grp.querySelector(':scope > .con-tb-group-label');
            const body = grp.querySelector(':scope > .con-tb-group-body');
            if (lbl && body) {
              lbl.setAttribute('aria-haspopup', 'true');
              lbl.setAttribute('aria-expanded', grp.classList.contains('open') ? 'true' : 'false');
            }
          });
          toolbar.addEventListener('click', function (e) {
            const label = e.target.closest('.con-tb-group-label');
            if (label && toolbar.contains(label)) {
              const group = label.closest('.con-tb-group');
              const body = group ? group.querySelector(':scope > .con-tb-group-body') : null;
              if (group && body) {
                e.stopPropagation();
                const willOpen = !group.classList.contains('open');
                conCloseToolbarMenus(willOpen ? group : null);
                group.classList.toggle('open', willOpen);
                label.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                if (willOpen && typeof window.conCloseAllContextMenus === 'function') {
                  window.conCloseAllContextMenus('con-tb-group');
                }
                conUpdateToolbarDropdownState();
              }
              return;
            }
            const bodyBtn = e.target.closest('.con-tb-group-body button');
            if (bodyBtn && !bodyBtn.disabled && !bodyBtn.closest('.con-tb-inline-row')) {
              conCloseToolbarMenus();
            }
          });
        }
        if (!window._conToolbarMenuDocListener) {
          window._conToolbarMenuDocListener = true;
          document.addEventListener('click', function (e) {
            if (!e.target.closest('.con-tb-group.open')) {
              conCloseToolbarMenus();
            }
          });
        }
      }
      window.conInitToolbarMenuListeners = global.conInitToolbarMenuListeners = conInitToolbarMenuListeners;

      function conUpdateToolbarDropdownState() {
        const wrapper = document.getElementById('con-sticky-wrapper');
        if (!wrapper) return;
        wrapper.classList.toggle('has-open-menu', conHasOpenDropdownMenu());
      }

      function conSetToolbarPinned(pinned, showFeedback) {
        _conToolbarPinned = !!pinned;
        try {
          localStorage.setItem('cmt_board_toolbar_pinned', _conToolbarPinned ? 'true' : 'false');
        } catch (_) {}

        const wrapper = document.getElementById('con-sticky-wrapper');
        const pinBtn = document.getElementById('con-tb-pin-btn');
        const pinLabel = document.getElementById('con-tb-pin-label');

        if (wrapper) {
          wrapper.classList.toggle('is-pinned', _conToolbarPinned);
          wrapper.classList.toggle('con-toolbar-autohide', !_conToolbarPinned);
          if (_conToolbarPinned) {
            wrapper.classList.remove('drawer-hovered', 'has-open-menu');
          }
        }

        if (pinBtn) {
          pinBtn.classList.toggle('is-pinned', _conToolbarPinned);
          const titleKey = _conToolbarPinned ? 'conToolbarPinTitle' : 'conToolbarUnpinTitle';
          const titleStr = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(titleKey) : (_conToolbarPinned ? 'Toolbar is pinned (click to auto-hide on hover)' : 'Toolbar auto-hides on hover (click to pin)');
          pinBtn.setAttribute('title', titleStr);
          pinBtn.setAttribute('data-i18n-title', titleKey);
        }
        if (pinLabel) {
          const labelKey = _conToolbarPinned ? 'conToolbarPinned' : 'conToolbarAutohide';
          const labelStr = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(labelKey) : (_conToolbarPinned ? 'Pinned' : 'Auto-Hide');
          pinLabel.textContent = labelStr;
          pinLabel.setAttribute('data-i18n', labelKey);
        }

        if (showFeedback && typeof showToast === 'function') {
          const toastMsg = _conToolbarPinned
            ? ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('conToastToolbarPinned') : 'Toolbar pinned — always visible')
            : ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('conToastToolbarAutohide') : 'Toolbar auto-hide enabled — collapses when not hovered');
          showToast(toastMsg);
        }
      }

      function conToggleToolbarPin(force) {
        const nextState = (typeof force === 'boolean') ? force : !_conToolbarPinned;
        conSetToolbarPinned(nextState, true);
      }
      window.conToggleToolbarPin = conToggleToolbarPin;
      window.conSetToolbarPinned = conSetToolbarPinned;
      window.conGetToolbarPinned = function () { return _conToolbarPinned; };

      function conOnPeekHandleClick(e) {
        if (e && e.target && e.target.closest && e.target.closest('.con-peek-pin-btn')) {
          return;
        }
        const wrapper = document.getElementById('con-sticky-wrapper');
        if (wrapper) {
          wrapper.classList.add('drawer-hovered');
        }
      }
      window.conOnPeekHandleClick = conOnPeekHandleClick;

      function conInitToolbarPinState() {
        let saved = null;
        try {
          saved = localStorage.getItem('cmt_board_toolbar_pinned');
        } catch (_) {}
        // Default is pinned as requested by user ("1. default is pinned")
        const isPinned = (saved === null || saved === undefined) ? true : (saved === 'true');
        conSetToolbarPinned(isPinned);
        conInitToolbarMenuListeners();

        const wrapper = document.getElementById('con-sticky-wrapper');
        const drawer = document.getElementById('con-toolbar-drawer');
        if (wrapper && !wrapper._hasAutohideListeners) {
          wrapper._hasAutohideListeners = true;

          const onEnter = function () {
            if (_conToolbarPinned) return;
            if (_conToolbarLeaveTimer) {
              clearTimeout(_conToolbarLeaveTimer);
              _conToolbarLeaveTimer = null;
            }
            wrapper.classList.add('drawer-hovered');
          };

          const onLeave = function () {
            if (_conToolbarPinned) return;
            if (_conToolbarLeaveTimer) clearTimeout(_conToolbarLeaveTimer);
            _conToolbarLeaveTimer = setTimeout(function () {
              _conToolbarLeaveTimer = null;
              const active = document.activeElement;
              if (active && wrapper.contains(active)) {
                if (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA') {
                  return;
                }
                if (typeof active.blur === 'function') active.blur();
              }
              if (conHasOpenDropdownMenu()) {
                wrapper.classList.add('has-open-menu');
                return;
              }
              wrapper.classList.remove('drawer-hovered', 'has-open-menu');
            }, 40);
          };

          wrapper.addEventListener('mouseenter', onEnter);
          wrapper.addEventListener('mouseleave', onLeave);
          if (drawer) {
            drawer.addEventListener('mouseenter', onEnter);
            drawer.addEventListener('mouseleave', onLeave);
          }
          const peekHandle = document.getElementById('con-toolbar-peek-handle');
          if (peekHandle) {
            peekHandle.addEventListener('mouseenter', onEnter);
            peekHandle.addEventListener('mouseleave', onLeave);
          }
        }
      }
      window.conInitToolbarPinState = conInitToolbarPinState;
      window.conUpdateToolbarDropdownState = conUpdateToolbarDropdownState;
      global.conSelected = null; // id of selected node
      window.conSelected = global.conSelected = null;
      global.conMultiSelected = (typeof global.conMultiSelected !== 'undefined' && global.conMultiSelected) || new Set(); // ids of multi-selected nodes
      window.conMultiSelected = global.conMultiSelected = conMultiSelected;
      global.conGroupFocused = null; // id of focused group (Delete key support)
      global.conTableSelected = (typeof global.conTableSelected !== 'undefined' && global.conTableSelected) || new Set(); // ids of selected tables
      function conTableClearSelection() {
        conTableSelected.clear();
        document.querySelectorAll('#constellation-board .con-table-el.con-table-selected')
          .forEach(el => el.classList.remove('con-table-selected'));
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
      }
      window.conTableClearSelection = conTableClearSelection;
      window.conGetTableSelected = function () { return conTableSelected; };
      global.conConnSrc = null; // id of first node in connect mode
      global._conLinkSrc = null; // id of source element for Ctrl+J cross-type link mode
      global._conLinkSrcIds = []; // all source element IDs for Ctrl+J link mode
      global.conNextId = 1;
      global._conClipboard = null;
      global._conClipboardPasteCount = 0;
      global._lastBoardPastePoint = null;
      const CON_CLIPBOARD_STORAGE_KEY = 'con_clipboard_v1';
      function _conClipboardWrite(payload) {
        _conClipboard = payload;
        _conClipboardPasteCount = 0;
        const serialized = JSON.stringify(payload);
        try { sessionStorage.setItem(CON_CLIPBOARD_STORAGE_KEY, serialized); } catch (e) { }
        try { localStorage.setItem(CON_CLIPBOARD_STORAGE_KEY, serialized); } catch (e) { }
      }
      function _conClipboardRead() {
        let best = _conClipboard || null;
        if (!best) {
          try {
            const raw = sessionStorage.getItem(CON_CLIPBOARD_STORAGE_KEY);
            if (raw) best = JSON.parse(raw);
          } catch (e) { }
        }
        try {
          const localRaw = localStorage.getItem(CON_CLIPBOARD_STORAGE_KEY);
          if (localRaw) {
            const localParsed = JSON.parse(localRaw);
            if (localParsed && (!best || (Number(localParsed.timestamp) || 0) > (Number(best.timestamp) || 0))) {
              best = localParsed;
            }
          }
        } catch (e) { }
        return best;
      }
      global.conBuildPageSnapshot = function () {
        return (typeof window.conBuildPageSnapshot === 'function')
          ? window.conBuildPageSnapshot()
          : ((window.Board && window.Board.pages && typeof window.Board.pages.buildPageSnapshot === 'function')
            ? window.Board.pages.buildPageSnapshot()
            : {});
      };
      var _conRestorePageToBoard = function (snapshot, opts) {
        if (typeof window._conRestorePageToBoard === 'function') {
          return window._conRestorePageToBoard(snapshot, opts);
        }
        if (typeof window.conRestorePageToBoard === 'function') {
          return window.conRestorePageToBoard(snapshot, opts);
        }
      };
      let _conUndoStack = [];
      let _conRedoStack = [];
      global._conApplySizeUndoPushed = false;
      const _CON_UNDO_MAX = 20;
      function conPushUndo(snapshot) {
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
        _conUndoStack.push(snapshot || conBuildPageSnapshot());
        if (_conUndoStack.length > _CON_UNDO_MAX) _conUndoStack.shift();
        _conRedoStack = [];
      }
      function _conDiffKeyChanged(a, b, keys) {
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          const va = a ? a[k] : undefined;
          const vb = b ? b[k] : undefined;
          if (va !== vb) {
            if (typeof va === 'object' || typeof vb === 'object') {
              if (JSON.stringify(va) !== JSON.stringify(vb)) return true;
            } else {
              return true;
            }
          }
        }
        return false;
      }

      function _conBroadcastUndoRedoDiff(beforeSnap, afterSnap) {
        if (!beforeSnap || !afterSnap) return;
        if (typeof window._conMirrorSend !== 'function') return;
        if (window._conMirrorFrozen) return;

        // Fallback to full snapshot only for heavy/binary or structural table/PDF/sticker layers
        if (
          JSON.stringify(beforeSnap.media || []) !== JSON.stringify(afterSnap.media || []) ||
          JSON.stringify(beforeSnap.tables || []) !== JSON.stringify(afterSnap.tables || []) ||
          JSON.stringify(beforeSnap.backgroundPdf || null) !== JSON.stringify(afterSnap.backgroundPdf || null) ||
          JSON.stringify(beforeSnap.boardStickers || []) !== JSON.stringify(afterSnap.boardStickers || [])
        ) {
          if (typeof window._conMirrorBroadcast === 'function') {
            window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
          }
          return;
        }

        const rev = (typeof window._conBumpBoardRevision === 'function') ? window._conBumpBoardRevision() : null;
        const send = window._conMirrorSend;

        // 1. Nodes diff
        const prevNodes = Array.isArray(beforeSnap.nodes) ? beforeSnap.nodes : [];
        const nextNodes = Array.isArray(afterSnap.nodes) ? afterSnap.nodes : [];
        const prevNodeMap = new Map(prevNodes.map(n => [String(n.id), n]));
        const nextNodeMap = new Map(nextNodes.map(n => [String(n.id), n]));

        const removedNodeIds = [];
        prevNodes.forEach(n => { if (!nextNodeMap.has(String(n.id))) removedNodeIds.push(String(n.id)); });
        if (removedNodeIds.length) {
          send({ type: 'nodes-remove', ids: removedNodeIds, revision: rev });
        }

        const addedNodes = [];
        const movedNodes = [];
        const styledNodes = [];
        const rotatedNodes = [];
        const maskedNodes = [];
        const lockedNodes = [];
        const liveNodeMap = new Map((window.conGetNodes ? window.conGetNodes() : conNodes).map(n => [String(n.id), n]));

        nextNodes.forEach(nn => {
          const nid = String(nn.id);
          const pn = prevNodeMap.get(nid);
          if (!pn) {
            const live = liveNodeMap.get(nid);
            const ser = (live && typeof window.conSerializeNodeForMirror === 'function') ? window.conSerializeNodeForMirror(live) : nn;
            if (ser) addedNodes.push(ser);
            return;
          }
          if (pn.x !== nn.x || pn.y !== nn.y) {
            movedNodes.push({ id: nn.id, x: nn.x, y: nn.y });
          }
          if (_conDiffKeyChanged(pn, nn, ['bg', 'color', 'border', 'borderWidth', 'borderStyle', 'highlight', 'preset', 'fontFamily', 'fontSize', 'textStrokeColor', 'textStrokeWidth', 'shape', 'fmt', 'baseWord', 'anim'])) {
            const live = liveNodeMap.get(nid);
            const ser = (live && typeof window.conSerializeNodeForMirror === 'function') ? window.conSerializeNodeForMirror(live) : nn;
            if (ser) styledNodes.push(ser);
          }
          if ((pn.rotation || 0) !== (nn.rotation || 0)) {
            rotatedNodes.push({ id: nn.id, rotation: Number(nn.rotation) || 0 });
          }
          if (!!pn.masked !== !!nn.masked) {
            maskedNodes.push({ id: nn.id, masked: !!nn.masked });
          }
          if (!!pn.locked !== !!nn.locked) {
            lockedNodes.push({ nodeId: nn.id, locked: !!nn.locked });
          }
        });

        if (addedNodes.length) send({ type: 'board-paste', nodes: addedNodes, revision: rev });
        if (movedNodes.length) send({ type: 'node-move', positions: movedNodes });
        if (styledNodes.length) send({ type: 'nodes-style', nodes: styledNodes, revision: rev });
        if (rotatedNodes.length) send({ type: 'nodes-rotate', rotations: rotatedNodes });
        if (maskedNodes.length) send({ type: 'node-masks', masks: maskedNodes });
        lockedNodes.forEach(item => send({ type: 'node-lock', nodeId: item.nodeId, locked: item.locked }));

        // 2. Notes diff
        const prevNotes = Array.isArray(beforeSnap.notes) ? beforeSnap.notes : [];
        const nextNotes = Array.isArray(afterSnap.notes) ? afterSnap.notes : [];
        const prevNoteMap = new Map(prevNotes.map(n => [String(n.id), n]));
        const nextNoteMap = new Map(nextNotes.map(n => [String(n.id), n]));

        const removedNoteIds = [];
        prevNotes.forEach(n => { if (!nextNoteMap.has(String(n.id))) removedNoteIds.push(String(n.id)); });
        if (removedNoteIds.length) {
          send({ type: 'notes-remove', ids: removedNoteIds, revision: rev });
        }

        const addedNotes = [];
        const movedNotes = [];
        nextNotes.forEach(nn => {
          const nid = String(nn.id);
          const pn = prevNoteMap.get(nid);
          if (!pn) {
            addedNotes.push(nn);
            return;
          }
          if (pn.x !== nn.x || pn.y !== nn.y) {
            movedNotes.push({ id: nn.id, x: nn.x, y: nn.y });
          }
          if ((pn.html || '') !== (nn.html || '') || (pn.text || '') !== (nn.text || '')) {
            send({
              type: 'note-text',
              id: nid,
              html: nn.html || '',
              text: nn.text || '',
              baseWidth: nn.liveBaseWidth,
              baseHeight: nn.liveBaseHeight,
              width: nn.width || nn.liveBaseWidth,
              height: nn.height || nn.liveBaseHeight,
              manualSize: !!nn.manualSize
            });
          }
          if (_conDiffKeyChanged(pn, nn, ['bg', 'color', 'fontSize', 'bold', 'italic', 'underline', 'wavy', 'strike', 'fontFamily', 'casing', 'textAlign', 'borderWidth', 'borderStyle', 'borderColor', 'hidden', 'blink'])) {
            send({
              type: 'note-style',
              id: nid,
              bg: nn.bg, color: nn.color, fontSize: nn.fontSize,
              bold: !!nn.bold, italic: !!nn.italic, underline: !!nn.underline, wavy: !!nn.wavy, strike: !!nn.strike,
              fontFamily: nn.fontFamily || null, casing: nn.casing || null, textAlign: nn.textAlign || null,
              borderWidth: nn.borderWidth || '', borderStyle: nn.borderStyle || '', borderColor: nn.borderColor || '',
              hidden: !!nn.hidden, blink: !!nn.blink,
              baseWidth: nn.liveBaseWidth, baseHeight: nn.liveBaseHeight,
              width: nn.width || nn.liveBaseWidth, height: nn.height || nn.liveBaseHeight,
              manualSize: !!nn.manualSize
            });
          } else if (pn.width !== nn.width || pn.height !== nn.height || pn.liveBaseWidth !== nn.liveBaseWidth || pn.liveBaseHeight !== nn.liveBaseHeight || !!pn.manualSize !== !!nn.manualSize) {
            send({
              type: 'note-resize',
              id: nid,
              width: nn.width || nn.liveBaseWidth,
              height: nn.height || nn.liveBaseHeight,
              baseWidth: nn.liveBaseWidth,
              baseHeight: nn.liveBaseHeight,
              manualSize: !!nn.manualSize
            });
          }
          if (!!pn.locked !== !!nn.locked) {
            send({ type: 'note-lock', noteId: nid, locked: !!nn.locked });
          }
        });
        if (addedNotes.length) send({ type: 'board-paste', notes: addedNotes, revision: rev });
        if (movedNotes.length) send({ type: 'note-move', positions: movedNotes });

        // 3. Edges diff
        const prevEdges = Array.isArray(beforeSnap.edges) ? beforeSnap.edges : [];
        const nextEdges = Array.isArray(afterSnap.edges) ? afterSnap.edges : [];
        const prevEdgeMap = new Map(prevEdges.map(e => [String(e.id), e]));
        const nextEdgeMap = new Map(nextEdges.map(e => [String(e.id), e]));
        prevEdges.forEach(e => {
          if (!nextEdgeMap.has(String(e.id))) send({ type: 'edge-remove', id: String(e.id) });
        });
        nextEdges.forEach(ne => {
          const pe = prevEdgeMap.get(String(ne.id));
          if (!pe) {
            send({ type: 'edge-add', edge: ne });
          } else if (JSON.stringify(pe) !== JSON.stringify(ne)) {
            send({ type: 'edge-update', edge: ne });
          }
        });

        // 4. Drawings diff
        const prevDraws = Array.isArray(beforeSnap.drawings) ? beforeSnap.drawings : [];
        const nextDraws = Array.isArray(afterSnap.drawings) ? afterSnap.drawings : [];
        const prevDrawMap = new Map(prevDraws.map(dr => [String(dr.id), dr]));
        const nextDrawMap = new Map(nextDraws.map(dr => [String(dr.id), dr]));
        const rmDrawIds = [];
        prevDraws.forEach(dr => { if (!nextDrawMap.has(String(dr.id))) rmDrawIds.push(String(dr.id)); });
        if (rmDrawIds.length) send({ type: 'drawing-remove', ids: rmDrawIds });
        const addDraws = [];
        const moveDraws = [];
        nextDraws.forEach(ndr => {
          const pdr = prevDrawMap.get(String(ndr.id));
          if (!pdr) {
            addDraws.push(ndr);
          } else if (pdr.w !== ndr.w || pdr.h !== ndr.h || JSON.stringify(pdr.points) !== JSON.stringify(ndr.points)) {
            send({ type: 'drawing-resize', id: ndr.id, x: ndr.x, y: ndr.y, w: ndr.w, h: ndr.h, points: ndr.points });
          } else if (pdr.x !== ndr.x || pdr.y !== ndr.y) {
            moveDraws.push({ id: ndr.id, x: ndr.x, y: ndr.y });
          }
        });
        if (addDraws.length) send({ type: 'drawings-add', drawings: addDraws });
        if (moveDraws.length) send({ type: 'drawing-move', positions: moveDraws });

        // 5. Shapes diff
        const prevShapes = Array.isArray(beforeSnap.shapes) ? beforeSnap.shapes : [];
        const nextShapes = Array.isArray(afterSnap.shapes) ? afterSnap.shapes : [];
        const prevShapeMap = new Map(prevShapes.map(s => [String(s.id), s]));
        const nextShapeMap = new Map(nextShapes.map(s => [String(s.id), s]));
        const rmShapeIds = [];
        prevShapes.forEach(s => { if (!nextShapeMap.has(String(s.id))) rmShapeIds.push(String(s.id)); });
        if (rmShapeIds.length) send({ type: 'shape-remove', ids: rmShapeIds });
        const addShapes = [];
        const moveShapes = [];
        nextShapes.forEach(ns => {
          const ps = prevShapeMap.get(String(ns.id));
          if (!ps) {
            addShapes.push(ns);
          } else if (ps.w !== ns.w || ps.h !== ns.h || ps.lx1 !== ns.lx1 || ps.ly1 !== ns.ly1 || ps.lx2 !== ns.lx2 || ps.ly2 !== ns.ly2 || JSON.stringify(ps.pts) !== JSON.stringify(ns.pts)) {
            send({ type: 'shape-resize', id: ns.id, x: ns.x, y: ns.y, w: ns.w, h: ns.h, lx1: ns.lx1, ly1: ns.ly1, lx2: ns.lx2, ly2: ns.ly2, pts: ns.pts });
          } else if (ps.x !== ns.x || ps.y !== ns.y) {
            moveShapes.push({ id: ns.id, x: ns.x, y: ns.y, lx1: ns.lx1, ly1: ns.ly1, lx2: ns.lx2, ly2: ns.ly2, pts: ns.pts });
          }
        });
        if (addShapes.length) send({ type: 'shapes-add', shapes: addShapes });
        if (moveShapes.length) send({ type: 'shape-move', positions: moveShapes });

        // 6. Groups diff
        const prevGroups = Array.isArray(beforeSnap.groups) ? beforeSnap.groups : [];
        const nextGroups = Array.isArray(afterSnap.groups) ? afterSnap.groups : [];
        const prevGroupMap = new Map(prevGroups.map(g => [String(g.id), g]));
        const nextGroupMap = new Map(nextGroups.map(g => [String(g.id), g]));
        prevGroups.forEach(g => {
          if (!nextGroupMap.has(String(g.id))) send({ type: 'group-dissolve', groupId: String(g.id), revision: rev });
        });
        nextGroups.forEach(ng => {
          const pg = prevGroupMap.get(String(ng.id));
          if (!pg) {
            send({ type: 'group-create', group: ng, revision: rev });
          } else {
            if (_conDiffKeyChanged(pg, ng, ['nodeIds', 'noteIds', 'drawingIds', 'shapeIds', 'mediaIds'])) {
              send({
                type: 'group-update',
                groupId: String(ng.id),
                nodeIds: ng.nodeIds || [],
                noteIds: ng.noteIds || [],
                drawingIds: ng.drawingIds || [],
                shapeIds: ng.shapeIds || [],
                mediaIds: ng.mediaIds || [],
                revision: rev
              });
            }
            if (!!pg.locked !== !!ng.locked) {
              send({ type: 'group-lock', groupId: String(ng.id), locked: !!ng.locked });
            }
          }
        });

        // 7. Masks diff
        const prevMasks = Array.isArray(beforeSnap.masks) ? beforeSnap.masks : [];
        const nextMasks = Array.isArray(afterSnap.masks) ? afterSnap.masks : [];
        const prevMaskMap = new Map(prevMasks.map(m => [String(m.id), m]));
        const nextMaskMap = new Map(nextMasks.map(m => [String(m.id), m]));
        prevMasks.forEach(m => {
          if (!nextMaskMap.has(String(m.id))) send({ type: 'mask-remove', id: m.id });
        });
        nextMasks.forEach(nm => {
          const pm = prevMaskMap.get(String(nm.id));
          if (!pm) {
            send({ type: 'mask-add', mask: nm });
          } else {
            if (pm.x !== nm.x || pm.y !== nm.y) send({ type: 'mask-move', id: nm.id, x: nm.x, y: nm.y });
            if (pm.width !== nm.width || pm.height !== nm.height) send({ type: 'mask-resize', id: nm.id, x: nm.x, y: nm.y, width: nm.width, height: nm.height });
            if (pm.color !== nm.color || pm.opacity !== nm.opacity) send({ type: 'mask-style', id: nm.id, color: nm.color, opacity: nm.opacity });
          }
        });

        // 8. Board height & background diff
        if (beforeSnap.boardHeight !== afterSnap.boardHeight && typeof afterSnap.boardHeight === 'number') {
          send({ type: 'board-height', height: afterSnap.boardHeight, revision: rev });
        }
        const prevBgColor = beforeSnap.boardBgColor || beforeSnap.boardBackgroundColor;
        const nextBgColor = afterSnap.boardBgColor || afterSnap.boardBackgroundColor;
        if (prevBgColor !== nextBgColor) {
          send({ type: 'board-bg', color: nextBgColor || '#f5f5f0' });
        }
      }

      function conUndo() {
        if (_conUndoStack.length === 0) return;
        const beforeSnap = conBuildPageSnapshot();
        _conRedoStack.push(beforeSnap);
        const snap = _conUndoStack.pop();
        if (typeof _conInvalidatePageDomCache === 'function') _conInvalidatePageDomCache(conCurrentPageIndex);
        _conRestorePageToBoard(snap, { isUndoRedo: true, scrollToTop: false });
        _conBroadcastUndoRedoDiff(beforeSnap, snap);
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
      }
      function conRedo() {
        if (_conRedoStack.length === 0) return;
        const beforeSnap = conBuildPageSnapshot();
        _conUndoStack.push(beforeSnap);
        const snap = _conRedoStack.pop();
        if (typeof _conInvalidatePageDomCache === 'function') _conInvalidatePageDomCache(conCurrentPageIndex);
        _conRestorePageToBoard(snap, { isUndoRedo: true, scrollToTop: false });
        _conBroadcastUndoRedoDiff(beforeSnap, snap);
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
      }
      window.conPushUndo = global.conPushUndo = conPushUndo;
      window.conUndo = global.conUndo = conUndo;
      window.conRedo = global.conRedo = conRedo;
      global._pendingConnectSrcId = null; // for "add connected word" feature
      global._pendingConnectType = 'none'; // arrow type for pending connect: 'none','forward','backward','both'
      global._boardCtxX = 0, _boardCtxY = 0;
      window.conCurrentZoom = 1; // track zoom scale
      global.conCurrentZoom = window.conCurrentZoom;
      var conTitle = global.conTitle = window.conTitle = (typeof window.conTitle !== 'undefined' ? window.conTitle : ''); // board title for export filename
      // ========================================================
      // Universal Unit Management System (pt/px for Font, mm/pt/px for Thickness)
      // ========================================================
      const CON_FONT_UNIT_KEY = 'con_pref_font_unit';
      const CON_THICKNESS_UNIT_KEY = 'con_pref_thickness_unit';

      window.conFontUnit = (function () {
        try {
          const u = localStorage.getItem(CON_FONT_UNIT_KEY);
          if (u === 'pt' || u === 'px') return u;
        } catch (e) { }
        return 'pt'; // Standard typographic unit
      })();

      window.conThicknessUnit = (function () {
        try {
          const u = localStorage.getItem(CON_THICKNESS_UNIT_KEY);
          if (u === 'mm' || u === 'pt' || u === 'px') return u;
        } catch (e) { }
        return 'mm'; // Standard physical line/stroke unit
      })();

      function conPxToFontUnit(px, unit) {
        unit = unit || window.conFontUnit || 'pt';
        const num = parseFloat(px) || 0;
        if (unit === 'px') return Math.round(num);
        // pt: 1px = 0.75pt (96dpi: 72pt/inch, 96px/inch)
        return Math.round(num * 0.75 * 10) / 10;
      }

      function conFontUnitToPx(val, unit) {
        unit = unit || window.conFontUnit || 'pt';
        const num = parseFloat(val) || 0;
        if (unit === 'px') return Math.round(num);
        // 1pt = 4/3 px
        return Math.round((num / 0.75) * 10) / 10;
      }

      function conFormatFontSize(px, unit) {
        unit = unit || window.conFontUnit || 'pt';
        const val = conPxToFontUnit(px, unit);
        return val + ' ' + unit;
      }

      function conPxToThicknessUnit(px, unit) {
        unit = unit || window.conThicknessUnit || 'mm';
        const num = parseFloat(px) || 0;
        if (unit === 'px') return Math.round(num * 10) / 10;
        if (unit === 'pt') return Math.round(num * 0.75 * 10) / 10;
        // mm: 1px = 25.4 / 96 mm
        return Math.round((num * 25.4 / 96) * 10) / 10;
      }

      function conThicknessUnitToPx(val, unit) {
        unit = unit || window.conThicknessUnit || 'mm';
        const num = parseFloat(val) || 0;
        if (unit === 'px') return Math.round(num * 10) / 10;
        if (unit === 'pt') return Math.round((num / 0.75) * 10) / 10;
        // mm: 1mm = 96 / 25.4 px
        return Math.round((num * 96 / 25.4) * 10) / 10;
      }

      function conFormatThickness(px, unit) {
        unit = unit || window.conThicknessUnit || 'mm';
        const val = conPxToThicknessUnit(px, unit);
        return val + ' ' + unit;
      }

      function _conSetupFontSizeSlider(el, unit, context) {
        if (!el) return;
        unit = unit || window.conFontUnit || 'pt';
        const isNote = context === 'note' || (el && el.id === 'wn-sp-size-slider');
        if (unit === 'pt') {
          el.min = isNote ? '3' : '6';
          el.max = '72';
          el.step = '1';
        } else {
          el.min = isNote ? '4' : '8';
          el.max = '96';
          el.step = '1';
        }
      }

      function _conSetupThicknessSlider(el, unit, context) {
        if (!el) return;
        unit = unit || window.conThicknessUnit || 'mm';
        if (unit === 'mm') {
          if (context === 'shape') { el.min = '0.2'; el.max = '6.0'; el.step = '0.1'; }
          else if (context === 'edge') { el.min = '0.2'; el.max = '5.0'; el.step = '0.1'; }
          else if (context === 'noteBorder') { el.min = '0'; el.max = '6.0'; el.step = '0.1'; }
          else { el.min = '0.2'; el.max = '10.0'; el.step = '0.1'; }
        } else if (unit === 'pt') {
          if (context === 'shape') { el.min = '0.5'; el.max = '18.0'; el.step = '0.5'; }
          else if (context === 'edge') { el.min = '0.5'; el.max = '15.0'; el.step = '0.5'; }
          else if (context === 'noteBorder') { el.min = '0'; el.max = '18.0'; el.step = '0.5'; }
          else { el.min = '0.5'; el.max = '30.0'; el.step = '0.5'; }
        } else { // px
          if (context === 'shape') { el.min = '1'; el.max = '24'; el.step = '1'; }
          else if (context === 'edge') { el.min = '1'; el.max = '20'; el.step = '0.5'; }
          else if (context === 'noteBorder') { el.min = '0'; el.max = '18'; el.step = '1'; }
          else { el.min = '1'; el.max = '40'; el.step = '1'; }
        }
      }

      function _conSyncUnitToggleButtons() {
        document.querySelectorAll('.con-unit-toggle[data-unit-type="font"]').forEach(tg => {
          tg.querySelectorAll('.con-unit-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.unit === window.conFontUnit);
          });
        });
        document.querySelectorAll('.con-unit-toggle[data-unit-type="thickness"]').forEach(tg => {
          tg.querySelectorAll('.con-unit-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.unit === window.conThicknessUnit);
          });
        });
        const edgeThickUnit = document.getElementById('con-edge-ctx-thickness-unit');
        if (edgeThickUnit) edgeThickUnit.textContent = window.conThicknessUnit;
      }

      function _conSyncFontSizeSliders() {
        // 1. Toolbar default font size input
        const defaultInput = document.getElementById('con-default-font-size-input');
        if (defaultInput) {
          _conSetupFontSizeSlider(defaultInput, window.conFontUnit);
          defaultInput.value = String(conPxToFontUnit(conDefaultNewWordFontSize, window.conFontUnit));
        }
        // 2. Node context menu font size slider and display
        const ctxSlider = document.getElementById('con-ctx-font-size');
        const ctxDisplay = document.getElementById('con-ctx-font-size-display');
        if (ctxSlider) {
          _conSetupFontSizeSlider(ctxSlider, window.conFontUnit);
          const activeNodeId = (typeof conCtxNodeId !== 'undefined' && conCtxNodeId)
            || (window.conGetCtxNodeId ? window.conGetCtxNodeId() : null)
            || (window.conCtxNodeId || null);
          const targetNode = activeNodeId
            ? (typeof conNodes !== 'undefined' ? conNodes.find(n => n && n.id === activeNodeId) : null)
            : ((typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0 && typeof conNodes !== 'undefined')
              ? conNodes.find(n => n && conMultiSelected.has(n.id))
              : ((typeof conSelected !== 'undefined' && conSelected && typeof conNodes !== 'undefined')
                ? conNodes.find(n => n && n.id === conSelected)
                : null));
          let px;
          if (targetNode) {
            px = conGetNodeBaseFontSize(targetNode) || 16;
          } else if (ctxSlider.dataset.rawPx) {
            px = parseFloat(ctxSlider.dataset.rawPx);
          } else {
            const curVal = parseFloat(ctxSlider.value);
            const wasPt = ctxDisplay && ctxDisplay.textContent ? ctxDisplay.textContent.includes('pt') : (window.conFontUnit !== 'pt');
            px = !isNaN(curVal) && curVal > 0 ? (wasPt ? conFontUnitToPx(curVal, 'pt') : curVal) : 16;
          }
          if (isNaN(px) || px <= 0) px = 16;
          ctxSlider.dataset.rawPx = String(px);
          const unitVal = conPxToFontUnit(px, window.conFontUnit);
          ctxSlider.value = String(unitVal);
          if (ctxDisplay) ctxDisplay.textContent = unitVal + ' ' + window.conFontUnit;
          if (typeof window._conSyncCtxFontSizeChips === 'function') window._conSyncCtxFontSizeChips(unitVal);
        }
        // 3. Word note style popup font size slider and display
        const wnSlider = document.getElementById('wn-sp-size-slider');
        const wnVal = document.getElementById('wn-sp-size-val');
        if (wnSlider) {
          _conSetupFontSizeSlider(wnSlider, window.conFontUnit, 'note');
          const activeNote = (window.wnGetActiveNote ? window.wnGetActiveNote() : null)
            || (window._wnActiveNote || null)
            || (typeof _wnActiveNote !== 'undefined' && _wnActiveNote ? _wnActiveNote : null)
            || ((typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0 && window.conGetNotes)
              ? window.conGetNotes().find(n => n && conNoteSelected.has(n.id))
              : null);
          let px;
          if (wnSlider.dataset.rawPx) {
            px = parseFloat(wnSlider.dataset.rawPx);
          } else if (activeNote && (activeNote.fontSize || activeNote.size)) {
            px = activeNote.fontSize || activeNote.size;
          } else {
            const curVal = parseFloat(wnSlider.value);
            const wasPt = wnVal && wnVal.textContent ? wnVal.textContent.includes('pt') : (window.conFontUnit !== 'pt');
            px = !isNaN(curVal) && curVal > 0 ? (wasPt ? conFontUnitToPx(curVal, 'pt') : curVal) : 26;
          }
          if (isNaN(px) || px <= 0) px = 26;
          wnSlider.dataset.rawPx = String(px);
          const unitVal = conPxToFontUnit(px, window.conFontUnit);
          if (parseFloat(wnSlider.max) < unitVal) wnSlider.max = String(Math.ceil(unitVal));
          if (parseFloat(wnSlider.min) > unitVal) wnSlider.min = String(Math.floor(unitVal));
          wnSlider.value = String(unitVal);
          if (wnVal) wnVal.textContent = conFormatFontSize(px, window.conFontUnit);
        }
      }

      function _conSyncThicknessSliders() {
        // 1. Draw line menu slider
        const drawSlider = document.getElementById('con-draw-thickness');
        const drawVal = document.getElementById('con-draw-thickness-val');
        if (drawSlider) {
          _conSetupThicknessSlider(drawSlider, window.conThicknessUnit, 'drawing');
          drawSlider.value = String(conPxToThicknessUnit(_conDrawThickness, window.conThicknessUnit));
          if (drawVal) drawVal.textContent = conFormatThickness(_conDrawThickness, window.conThicknessUnit);
        }
        // 2. Shape context menu slider
        const shapeSlider = document.getElementById('con-shape-ctx-thickness');
        const shapeVal = document.getElementById('con-shape-ctx-thickness-val');
        if (shapeSlider && typeof _conShapeCtxId !== 'undefined' && _conShapeCtxId) {
          const sh = conShapes.find(x => x.id === _conShapeCtxId);
          if (sh) {
            _conSetupThicknessSlider(shapeSlider, window.conThicknessUnit, 'shape');
            shapeSlider.value = String(conPxToThicknessUnit(sh.thickness || 2, window.conThicknessUnit));
            if (shapeVal) shapeVal.textContent = conFormatThickness(sh.thickness || 2, window.conThicknessUnit);
          }
        }
        // 3. Drawing stroke context menu slider
        const strokeSlider = document.getElementById('con-drawing-ctx-thickness');
        const strokeVal = document.getElementById('con-drawing-ctx-thickness-val');
        if (strokeSlider && typeof _conDrawCtxId !== 'undefined' && _conDrawCtxId) {
          const dr = conDrawings.find(dr => dr.id === _conDrawCtxId);
          if (dr) {
            _conSetupThicknessSlider(strokeSlider, window.conThicknessUnit, 'drawing');
            strokeSlider.value = String(conPxToThicknessUnit(dr.thickness || 4, window.conThicknessUnit));
            if (strokeVal) strokeVal.textContent = conFormatThickness(dr.thickness || 4, window.conThicknessUnit);
          }
        }
        // 4. Edge context menu thickness input
        const edgeThickInput = document.getElementById('con-edge-ctx-thickness');
        const edgeThickUnit = document.getElementById('con-edge-ctx-thickness-unit');
        if (edgeThickUnit) edgeThickUnit.textContent = window.conThicknessUnit;
        if (edgeThickInput && typeof _conEdgeCtxId !== 'undefined' && _conEdgeCtxId) {
          const edge = conEdges.find(e => e && e.id == _conEdgeCtxId);
          if (edge) {
            _conSetupThicknessSlider(edgeThickInput, window.conThicknessUnit, 'edge');
            const px = Number.isFinite(edge.thickness) && edge.thickness > 0 ? edge.thickness : 2;
            edgeThickInput.value = String(conPxToThicknessUnit(px, window.conThicknessUnit));
          }
        }
        // 5. Word note style popup border width slider and display
        const wnBwSlider = document.getElementById('wn-sp-border-width');
        const wnBwVal = document.getElementById('wn-sp-border-width-val');
        if (wnBwSlider) {
          _conSetupThicknessSlider(wnBwSlider, window.conThicknessUnit, 'noteBorder');
          const activeNote = (window.wnGetActiveNote ? window.wnGetActiveNote() : null)
            || (window._wnActiveNote || null)
            || (typeof _wnActiveNote !== 'undefined' && _wnActiveNote ? _wnActiveNote : null)
            || ((typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0 && window.conGetNotes)
              ? window.conGetNotes().find(n => n && conNoteSelected.has(n.id))
              : null);
          let px;
          if (activeNote && typeof activeNote.borderWidth === 'number') {
            px = activeNote.borderWidth;
          } else if (wnBwSlider.dataset.rawPx) {
            px = parseFloat(wnBwSlider.dataset.rawPx);
          } else {
            const curVal = parseFloat(wnBwSlider.value);
            let prevUnit = 'px';
            if (wnBwVal && wnBwVal.textContent) {
              if (wnBwVal.textContent.includes('mm')) prevUnit = 'mm';
              else if (wnBwVal.textContent.includes('pt')) prevUnit = 'pt';
            }
            px = !isNaN(curVal) && curVal >= 0 ? conThicknessUnitToPx(curVal, prevUnit) : 0;
          }
          if (isNaN(px) || px < 0) px = 0;
          wnBwSlider.dataset.rawPx = String(px);
          const unitVal = conPxToThicknessUnit(px, window.conThicknessUnit);
          wnBwSlider.value = String(unitVal);
          if (wnBwVal) wnBwVal.textContent = conFormatThickness(px, window.conThicknessUnit);
        }
      }

      window.conSwitchFontUnit = function (newUnit) {
        if (newUnit !== 'pt' && newUnit !== 'px') return;
        window.conFontUnit = newUnit;
        try { localStorage.setItem(CON_FONT_UNIT_KEY, newUnit); } catch (e) { }
        _conSyncUnitToggleButtons();
        _conSyncFontSizeSliders();
        _conSyncThicknessSliders();
      };

      window.conSwitchThicknessUnit = function (newUnit) {
        if (newUnit !== 'mm' && newUnit !== 'pt' && newUnit !== 'px') return;
        window.conThicknessUnit = newUnit;
        try { localStorage.setItem(CON_THICKNESS_UNIT_KEY, newUnit); } catch (e) { }
        _conSyncUnitToggleButtons();
        _conSyncThicknessSliders();
        _conSyncFontSizeSliders();
      };

      window.conSyncAllUnitControls = function () {
        _conSyncUnitToggleButtons();
        _conSyncFontSizeSliders();
        _conSyncThicknessSliders();
      };

      window.conPxToFontUnit = conPxToFontUnit;
      window.conFontUnitToPx = conFontUnitToPx;
      window.conFormatFontSize = conFormatFontSize;
      window.conPxToThicknessUnit = conPxToThicknessUnit;
      window.conThicknessUnitToPx = conThicknessUnitToPx;
      window.conFormatThickness = conFormatThickness;
      window._conSetupFontSizeSlider = _conSetupFontSizeSlider;
      window._conSetupThicknessSlider = _conSetupThicknessSlider;
      window._conSyncUnitToggleButtons = _conSyncUnitToggleButtons;
      window._conSyncFontSizeSliders = _conSyncFontSizeSliders;
      window._conSyncThicknessSliders = _conSyncThicknessSliders;
      window.conSyncAllUnitControls = conSyncAllUnitControls;

      document.addEventListener('click', function (e) {
        const pill = e.target && e.target.closest ? e.target.closest('.con-unit-pill') : null;
        if (pill) {
          const toggle = pill.closest('.con-unit-toggle');
          const unitType = toggle ? toggle.dataset.unitType : null;
          const unit = pill.dataset.unit;
          if (unitType === 'font' && (unit === 'pt' || unit === 'px')) {
            window.conSwitchFontUnit(unit);
          } else if (unitType === 'thickness' && (unit === 'mm' || unit === 'pt' || unit === 'px')) {
            window.conSwitchThicknessUnit(unit);
          }
        }
      });

      const CON_NEW_WORD_FONT_STORAGE_KEY = 'con_new_word_font_size';
      const CON_NEW_WORD_FONT_MIN = 8;
      const CON_NEW_WORD_FONT_MAX = 96;
      const CON_NEW_WORD_FONT_DEFAULT = 16;
      global.conDefaultNewWordFontSize = (() => {
        try {
          const saved = parseInt(localStorage.getItem(CON_NEW_WORD_FONT_STORAGE_KEY), 10);
          if (Number.isFinite(saved)) {
            return Math.min(CON_NEW_WORD_FONT_MAX, Math.max(CON_NEW_WORD_FONT_MIN, saved));
          }
        } catch (e) { }
        return CON_NEW_WORD_FONT_DEFAULT;
      })();

      function conClampDefaultWordFontSize(value, isInputUnit) {
        const px = isInputUnit ? conFontUnitToPx(value, window.conFontUnit) : parseFloat(value);
        if (!Number.isFinite(px)) return conDefaultNewWordFontSize;
        return Math.min(CON_NEW_WORD_FONT_MAX, Math.max(CON_NEW_WORD_FONT_MIN, Math.round(px)));
      }

      window.conGetDefaultWordFontSize = function () {
        return conDefaultNewWordFontSize;
      };

      window.conSetDefaultWordFontSize = function (value, isInputUnit) {
        const next = conClampDefaultWordFontSize(value, isInputUnit);
        conDefaultNewWordFontSize = next;
        const input = document.getElementById('con-default-font-size-input');
        if (input) {
          _conSetupFontSizeSlider(input, window.conFontUnit);
          const unitVal = conPxToFontUnit(next, window.conFontUnit);
          if (String(input.value) !== String(unitVal)) input.value = String(unitVal);
        }
        try { localStorage.setItem(CON_NEW_WORD_FONT_STORAGE_KEY, String(next)); } catch (e) { }
        return next;
      };

      function conApplyDefaultWordFontSize(el) {
        if (!el) return;
        const next = window.conGetDefaultWordFontSize();
        if (el.dataset) el.dataset.baseFontSize = String(next);
        el.style.fontSize = next + 'px';
      }

      function conGetEffectiveZoom() {
        const zoom = parseFloat(window.conCurrentZoom);
        return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
      }

      function conNormalizeNodeFontSize(value, fallback) {
        const parsed = parseFloat(value);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
        const fallbackParsed = parseFloat(fallback);
        if (Number.isFinite(fallbackParsed) && fallbackParsed > 0) return fallbackParsed;
        return window.conGetDefaultWordFontSize();
      }

      function conGetNodeBaseFontSize(nodeOrEl) {
        const el = nodeOrEl && nodeOrEl.el ? nodeOrEl.el : nodeOrEl;
        const zoom = conGetEffectiveZoom();
        const dataVal = el && el.dataset ? parseFloat(el.dataset.baseFontSize) : NaN;
        if (Number.isFinite(dataVal) && dataVal > 0) return dataVal;
        const inlineVal = el && el.style ? parseFloat(el.style.fontSize) : NaN;
        if (Number.isFinite(inlineVal) && inlineVal > 0) return inlineVal / zoom;
        const computedVal = el ? parseFloat(getComputedStyle(el).fontSize) : NaN;
        if (Number.isFinite(computedVal) && computedVal > 0) return computedVal / zoom;
        return window.conGetDefaultWordFontSize();
      }

      function conSetNodeBaseFontSize(nodeOrEl, value) {
        const el = nodeOrEl && nodeOrEl.el ? nodeOrEl.el : nodeOrEl;
        if (!el) return window.conGetDefaultWordFontSize();
        const baseSize = Math.max(CON_NEW_WORD_FONT_MIN, Math.min(96, conNormalizeNodeFontSize(value)));
        const zoom = conGetEffectiveZoom();
        if (el.dataset) el.dataset.baseFontSize = String(baseSize);
        el.style.fontSize = (baseSize * zoom) + 'px';
        if (nodeOrEl && nodeOrEl.el) nodeOrEl.fontSize = baseSize + 'px';
        return baseSize;
      }

      window.conGetNodeBaseFontSize = conGetNodeBaseFontSize;
      window.conSetNodeBaseFontSize = conSetNodeBaseFontSize;

      function conIsNodeLocked(node) {
        return !!(node && node.locked);
      }

      function conSyncNodeLockState(node) {
        if (!node || !node.el) return;
        node.el.classList.toggle('con-locked', !!node.locked);
      }

      // ---- Free mask rectangles ----
      global.CON_MASK_COLORS = [
        '#111111', '#444444', '#888888', '#bbbbbb', '#ffffff',
        '#e53935', '#f4511e', '#fb8c00', '#fdd835', '#c0ca33',
        '#43a047', '#00897b', '#1e88e5', '#3949ab', '#8e24aa',
        '#d81b60', '#6d4c41', '#00acc1', '#546e7a', '#f06292'
      ];
      conMasks = global.conMasks = global.conMasks || [];
      _conMaskCtxId = global._conMaskCtxId = global._conMaskCtxId || null;

      // ---- Expose global functions ----
      window.conAddWord = function () {
        const inp = document.getElementById('con-word-input');
        const raw = inp.value.trim();
        if (!raw) return;
        inp.value = '';
        // Hide connected-word banner if shown (legacy cleanup)
        const banner = document.getElementById('con-connected-banner');
        if (banner) banner.style.display = 'none';

        const words = raw.split(',,').map(w => w.trim()).filter(w => w.length > 0);
        const brd = board();
        const bw = brd.clientWidth, bh = brd.clientHeight;
        let lastId = null;
        const newIds = [];
        const createdNodes = [];
        const _prevSuppress = !!window._conSuppressMirrorObserver;
        window._conSuppressMirrorObserver = true;
        try {
          words.forEach(text => {
            const id = 'cn' + conNextId++;
            const x = 60 + Math.random() * (bw - 160);
            const y = 60 + Math.random() * (bh - 120);
            const dbMatch = conFindDbEntry(text);
            const el = document.createElement('div');
            el.className = 'con-node' + (dbMatch ? ' con-node-matched' : '');
            el.id = id;
            el.textContent = text;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            conApplyDefaultWordFontSize(el);
            if (window._bcNodeFontFamily) el.style.fontFamily = window._bcNodeFontFamily;
            brd.appendChild(el);
            const baseWord = text;
            const node = { id, el, x, y, baseX: x, baseY: y, dbWord: dbMatch ? dbMatch.word : null, baseWord, fontFamily: window._bcNodeFontFamily || null };
            conNodes.push(node);
            createdNodes.push(node);
            conAttachNodeEvents(id, el);
            conAddNodeStarBtn(node);
            newIds.push(id);
            lastId = id;
          });
          if (lastId) conSelect(lastId);
          if (!_prevSuppress && createdNodes.length && typeof window._conMirrorSend === 'function' && typeof window.conSerializeNodeForMirror === 'function') {
            const rev = (typeof window._conBumpBoardRevision === 'function') ? window._conBumpBoardRevision() : null;
            const serializedNodes = createdNodes.map(window.conSerializeNodeForMirror).filter(Boolean);
            if (serializedNodes.length) {
              window._conMirrorSend({
                type: 'board-paste',
                revision: rev,
                nodes: serializedNodes,
                selection: lastId ? { selectedNodeId: lastId, selectedNodeIds: [lastId] } : undefined
              });
            }
          }
        } finally {
          if (!_prevSuppress) {
            setTimeout(() => { window._conSuppressMirrorObserver = false; }, 60);
          }
        }
        inp.focus();
      };

      window.conGetMode = global.conGetMode = function () { return Board._bnMode || 'move'; };
      window.conCancelLinkMode = global.conCancelLinkMode = function () { if (typeof _conCancelLinkMode === 'function') _conCancelLinkMode(); };
      window.conIsLinkModeActive = global.conIsLinkModeActive = function () { return !!_conLinkSrc; };
      window.conGetGroupFocused = global.conGetGroupFocused = function () { return (typeof conGroupFocused !== 'undefined' ? conGroupFocused : (window.conGroupFocused || null)); };
      window.conDuplicateSelected = global.conDuplicateSelected = function () { if (typeof window.conClipboardCopy === 'function' && typeof window.conClipboardPaste === 'function') { window.conClipboardCopy({ allowWhileTyping: false }); window.conClipboardPaste(); } };

      window.conSetMode = function (mode) {
        // Cancel any active link mode before switching modes — prevents _conLinkSrc
        // staying set as a ghost intercept while the board is in a different mode.
        if (_conLinkSrc && typeof _conCancelLinkMode === 'function') _conCancelLinkMode();
        Board._bnMode = mode;
        conConnSrc = null;
        conMultiSelected.clear();
        conNodes.forEach(n => n.el.classList.remove('con-multi-selected'));
        conDrawingSelected.clear();
        document.querySelectorAll('#constellation-board .con-drawing.con-drawing-selected')
          .forEach(el => el.classList.remove('con-drawing-selected'));
        if (window.conNoteClearSelection) window.conNoteClearSelection();
        conSelect(null);
        const brd = board();
        brd.classList.toggle('draw-mode', mode === 'draw');
        brd.classList.toggle('connect-mode', mode === 'connect');
        // Draw overlay & panel
        const overlay = document.getElementById('con-draw-overlay');
        if (overlay) overlay.classList.toggle('active', mode === 'draw');
        const panel = document.getElementById('con-draw-panel');
        if (panel) panel.style.display = mode === 'draw' ? 'flex' : 'none';
        if (typeof window._conSyncDrawOverlaySize === 'function') window._conSyncDrawOverlaySize();
        // Reset eraser when exiting draw mode
        if (mode !== 'draw' && _conDrawEraserMode) window.conDrawToggleEraser();
        // Sync toolbar eraser button
        if (typeof _conSyncEraserToolbarBtn === 'function') _conSyncEraserToolbarBtn();
        if (typeof _conDrawSyncOverlayCursor === 'function' && mode === 'draw') _conDrawSyncOverlayCursor();
        // Highlight draw button
        const drawBtn = document.getElementById('con-draw-btn');
        if (drawBtn) drawBtn.classList.toggle('con-panel-active', mode === 'draw');
        // Highlight active move/connect/delete buttons
        ['move', 'connect', 'delete'].forEach(m => {
          const btn = document.getElementById('con-mode-' + m + '-btn');
          if (btn) btn.classList.toggle('con-panel-active', m === mode);
        });
        conUpdateInstructions(mode);
        if (typeof window.updateBoardModeToggleUI === 'function') window.updateBoardModeToggleUI();
      };

      // 12 colour presets: [bg, textColor, borderColor]
      if (!CON_PALETTES || !CON_PALETTES.length) {
        CON_PALETTES = global.CON_PALETTES = [
          ['#ffffff', '#111111', '#111111'], // White (default)
          ['#374151', '#ffffff', '#111111'], // Dark Grey
          ['#111111', '#ffffff', '#555555'], // Black
          ['#fee2e2', '#111111', '#dc2626'], // Red
          ['#ffedd5', '#111111', '#ea580c'], // Orange
          ['#fef3c7', '#111111', '#d97706'], // Yellow
          ['#dcfce7', '#111111', '#16a34a'], // Green
          ['#ccfbf1', '#111111', '#0d9488'], // Teal
          ['#dbeafe', '#111111', '#2563eb'], // Blue
          ['#e0f2fe', '#111111', '#0284c7'], // Sky
          ['#f3e8ff', '#111111', '#7c3aed'], // Purple
          ['#fce7f3', '#111111', '#db2777'] // Pink
        ];
      }
      global.conActivePalette = 0;

      function conInitSwatches() {
        const container = document.getElementById('con-ctx-swatches');
        if (!container) return;
        container.innerHTML = '';
        CON_PALETTES.forEach(([bg, text, border, name], i) => {
          const sw = document.createElement('div');
          sw.className = 'con-swatch' + (i === 0 ? ' active' : '');
          sw.style.background = bg;
          sw.style.borderColor = i === 0 ? '#111' : border;
          sw.style.outline = i === 0 ? '2px solid #111' : 'none';
          sw.title = name || ['White', 'Dark Grey', 'Black', 'Red', 'Orange', 'Yellow', 'Green', 'Teal', 'Blue', 'Sky', 'Purple', 'Pink', 'Emerald'][i] || `Palette ${i + 1}`;
          sw.onclick = function () {
            conActivePalette = i;
            container.querySelectorAll('.con-swatch').forEach((s, j) => s.classList.toggle('active', j === i));
            conCtxApplyStyle();
          };
          container.appendChild(sw);
        });
      }

      const _CON_BORDER_SWATCH_DEFAULTS = ['#111111', '#555555', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0d9488', '#2563eb', '#0284c7', '#7c3aed', '#db2777'];
      window.CON_BORDER_SWATCHES = _CON_BORDER_SWATCH_DEFAULTS.slice();

      function conInitBorderSwatches() {
        const container = document.getElementById('con-ctx-border-swatches');
        if (!container) return;
        container.innerHTML = '';
        (window.CON_BORDER_SWATCHES || _CON_BORDER_SWATCH_DEFAULTS).forEach(color => {
          const sw = document.createElement('div');
          sw.className = 'con-swatch';
          sw.style.background = color;
          sw.style.borderColor = color;
          sw.style.outline = 'none';
          sw.title = color;
          sw.onclick = function () {
            if (typeof window.conCtxApplyBorderColor === 'function') window.conCtxApplyBorderColor(color);
            const picker = document.getElementById('con-ctx-border-color');
            const text = document.getElementById('con-ctx-border-color-text');
            if (picker) picker.value = color;
            if (text) text.value = color.toUpperCase();
          };
          container.appendChild(sw);
        });
      }
      window.conInitBorderSwatches = conInitBorderSwatches;

      window.conApplyColor = function () {
        if (!conSelected) return;
        const node = conNodes.find(n => n.id === conSelected);
        if (!node) return;
        const [bg, text, border] = CON_PALETTES[conActivePalette];
        node.el.style.background = bg;
        node.el.style.color = text;
        const rawSize = document.getElementById('con-ctx-font-size') ? document.getElementById('con-ctx-font-size').value : 12;
        conSetNodeBaseFontSize(node, conFontUnitToPx(rawSize, window.conFontUnit) || 16);
        conApplyNodeShape(node, node.shape);
        conRedrawEdges();
      };

      // ── Node Preset Styles ────────────────────────────────────────────
      function conApplyTextStrokeStyle(el, width, color) {
        if (!el || !el.style) return;
        if (width > 0 && color) {
          el.style.webkitTextStroke = `${width}px ${color}`;
          el.style.paintOrder = 'stroke fill';
          el.style.setProperty('paint-order', 'stroke fill');
        } else {
          el.style.webkitTextStroke = '';
          el.style.paintOrder = '';
          el.style.removeProperty('paint-order');
        }
      }
      window.conApplyTextStrokeStyle = conApplyTextStrokeStyle;

      function conGetNodePresets() {
        const bc = (typeof window !== 'undefined' && window.BOARD_CONFIG)
          ? window.BOARD_CONFIG
          : ((typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : {});
        const saved = Array.isArray(bc.constellationPresets) && bc.constellationPresets.length ? bc.constellationPresets : null;
        if (!saved) return [];
        return saved.map(p => ({
          key: String(p.key || '').trim(),
          label: String(p.label || p.key || '').trim(),
          bg: String(p.bg || '#ffffff'),
          color: String(p.color || '#111111'),
          borderColor: String(p.borderColor || '#111111'),
          borderWidth: Number(p.borderWidth || 2),
          borderWidthUnit: String(p.borderWidthUnit || 'px'),
          borderStyle: String(p.borderStyle || 'solid'),
          highlight: String(p.highlight || ''),
          shape: String(p.shape || 'rectangle'),
          fontFamily: String(p.fontFamily || ''),
          fontSize: (p.fontSize != null && p.fontSize !== '') ? Number(p.fontSize) : null,
          fontSizeUnit: String(p.fontSizeUnit || 'px'),
          textStrokeColor: String(p.textStrokeColor || ''),
          textStrokeWidth: (p.textStrokeWidth != null && p.textStrokeWidth !== '') ? Number(p.textStrokeWidth) : 0,
          textStrokeWidthUnit: String(p.textStrokeWidthUnit || 'px'),
          isNodeAct: !!(p.isNodeAct || p.isPageNumber),
          fmt: p.fmt && typeof p.fmt === 'object' ? {
            bold: !!p.fmt.bold,
            italic: !!p.fmt.italic,
            underline: !!p.fmt.underline,
            strike: !!p.fmt.strike
          } : { bold: false, italic: false, underline: false, strike: false }
        }));
      }

      function conGetNodeActPreset() {
        const presets = conGetNodePresets();
        return presets.find(p => !!p.isNodeAct) || null;
      }
      window.conGetNodeActPreset = conGetNodeActPreset;

      function conApplyNodePreset(presetKey, targetIds, options) {
        const presets = conGetNodePresets();
        const preset = presets.find(p => p.key === presetKey);
        if (!preset) return;
        if (!options || !options.skipUndo) conPushUndo();
        const ids = targetIds || (conMultiSelected.size > 1 ? [...conMultiSelected] : (conCtxNodeId ? [conCtxNodeId] : []));
        const isMirrorWin = (typeof location !== 'undefined' && location.search.indexOf('mirror=1') !== -1);
        const _prevSuppress = !!window._conSuppressMirrorObserver;
        window._conSuppressMirrorObserver = true;
        const styledNodes = [];
        try {
          ids.forEach(id => {
            const node = conNodes.find(n => n.id === id);
            if (!node || conIsNodeLocked(node)) return;
            node.el.style.background = preset.bg;
            node.el.style.color = preset.color;
            node.el.style.borderColor = preset.borderColor;
            node.borderWidth = preset.borderWidth;
            node.borderStyle = preset.borderStyle;
            node.highlight = preset.highlight || null;
            node.preset = preset.key;
            node.fontFamily = preset.fontFamily || null;
            node.el.style.fontFamily = preset.fontFamily || '';
            if (preset.fontSize != null) conSetNodeBaseFontSize(node, Number(preset.fontSize));
            // Apply text stroke
            node.textStrokeColor = (preset.textStrokeWidth > 0 && preset.textStrokeColor) ? preset.textStrokeColor : null;
            node.textStrokeWidth = (preset.textStrokeWidth > 0) ? preset.textStrokeWidth : null;
            conApplyTextStrokeStyle(node.el, node.textStrokeWidth, node.textStrokeColor);
            // Apply shape
            conApplyNodeShape(node, preset.shape || 'rectangle');
            if (node.id === conCtxNodeId) conSyncShapeButtons(node);
            // Apply text formatting
            const fmt = conGetNodeFmt(node);
            fmt.bold = !!preset.fmt.bold;
            fmt.italic = !!preset.fmt.italic;
            fmt.underline = !!preset.fmt.underline;
            fmt.strike = !!preset.fmt.strike;
            conRenderNodeLabel(node);
            if (node.id === conCtxNodeId) conSyncFmtButtons(node);
            styledNodes.push(node);
          });
          conRedrawEdges();
          // Refresh active indicator on preset buttons
          _conSyncPresetButtons();
          if (!isMirrorWin && styledNodes.length && typeof window._conMirrorSend === 'function' && typeof window.conSerializeNodeForMirror === 'function') {
            window._conMirrorSend({
              type: 'nodes-style',
              nodes: styledNodes.map(window.conSerializeNodeForMirror).filter(Boolean),
              revision: (typeof window._conBumpBoardRevision === 'function') ? window._conBumpBoardRevision() : null
            });
          }
        } finally {
          if (!_prevSuppress) {
            setTimeout(() => { window._conSuppressMirrorObserver = false; }, 60);
          }
        }
      }
      window.conApplyNodePreset = conApplyNodePreset;
      window.conGetNodePresets = conGetNodePresets;

      function _conSyncPresetButtons() {
        const node = conCtxNodeId ? conNodes.find(n => n.id === conCtxNodeId) : null;
        const active = node ? (node.preset || null) : null;
        document.querySelectorAll('#con-ctx-preset-btns .con-preset-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.presetKey === active);
        });
      }

      function conInitPresetButtons() {
        const container = document.getElementById('con-ctx-preset-btns');
        if (!container) return;
        container.innerHTML = '';
        const presets = conGetNodePresets();
        presets.forEach(p => {
          const btn = document.createElement('button');
          btn.className = 'con-preset-btn';
          btn.dataset.presetKey = p.key;
          btn.title = p.label;
          btn.textContent = p.key;
          btn.style.background = p.bg;
          btn.style.color = p.color;
          btn.style.borderColor = p.borderColor;
          btn.style.borderWidth = Math.min(2, Math.max(1, p.borderWidth != null ? p.borderWidth : 1.5)) + 'px';
          btn.style.borderStyle = p.borderStyle || 'solid';
          if (p.highlight) btn.style.boxShadow = `0 0 0 1px ${p.highlight}`;
          conApplyTextStrokeStyle(btn, p.textStrokeWidth, p.textStrokeColor);
          if (p.fmt) {
            btn.style.fontWeight = p.fmt.bold ? 'bold' : '';
            btn.style.fontStyle = p.fmt.italic ? 'italic' : '';
            btn.style.textDecoration = [p.fmt.underline ? 'underline' : '', p.fmt.strike ? 'line-through' : ''].filter(Boolean).join(' ') || '';
          }
          btn.onclick = function () { conApplyNodePreset(p.key); };
          container.appendChild(btn);
        });
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '2px';
        container.style.gridTemplateColumns = '';
        container.style.justifyContent = '';
      }

      // ── Preset Editor ─────────────────────────────────────────────────
      let _conPresetEditorDraft = [];
      window.conGetPresetEditorDraft = () => _conPresetEditorDraft;
      window.conSetPresetEditorDraft = (val) => { _conPresetEditorDraft = val; };

      function conOpenPresetEditor() {
        conCtxClose();
        if (typeof boardCustomiseOpen === 'function') {
          boardCustomiseOpen();
        }
        if (typeof boardCustomiseSetTab === 'function') {
          boardCustomiseSetTab('nodes');
        }
        // Expand the Node Preset Styles section
        setTimeout(() => {
          const titleEl = Array.from(document.querySelectorAll('#board-customise-modal .bc-section-title'))
            .find(el => el.textContent.includes('Node Preset Styles'));
          if (titleEl) {
            const sec = titleEl.parentElement;
            sec.classList.remove('collapsed');
            sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 150);
      }
      window.conOpenPresetEditor = conOpenPresetEditor;

      function conClosePresetEditor() {
        if (typeof boardCustomiseClose === 'function') {
          boardCustomiseClose();
        }
      }
      window.conClosePresetEditor = conClosePresetEditor;

      function _conPresetEditorRender() {
        const list = document.getElementById('con-preset-editor-list');
        if (!list) return;
        list.innerHTML = '';

        _conPresetEditorDraft.forEach((p, i) => {
          const card = document.createElement('div');
          card.className = 'bc-preset-card';
          card.draggable = true;
          card.dataset.index = String(i);

          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'bc-card-del-btn';
          delBtn.title = t('conPresetRemoveTitle') || 'Remove this preset';
          delBtn.textContent = 'x';
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            conPresetEditorDeleteRow(i);
          });

          const stage = document.createElement('div');
          stage.className = 'bc-preset-card-stage';

          const prev = document.createElement('div');
          prev.className = 'bc-preset-card-preview';
          prev.textContent = p.label || p.key || 'Sample';
          prev.style.background = p.bg || '#ffffff';
          prev.style.color = p.color || '#111111';
          prev.style.borderWidth = Math.min(6, Math.max(0, p.borderWidth != null ? p.borderWidth : 2)) + 'px';
          prev.style.borderStyle = p.borderStyle || 'solid';
          prev.style.borderColor = p.borderColor || '#111111';
          prev.style.borderRadius = (p.shape === 'oval' || p.shape === 'circle') ? '999px' : '5px';
          if (p.highlight) prev.style.boxShadow = `0 0 8px 2px ${p.highlight}`;
          if (p.fontFamily) prev.style.fontFamily = p.fontFamily;
          if (p.fontSize) prev.style.fontSize = Math.min(20, Math.max(10, p.fontSize)) + 'px';
          const fmt = p.fmt || {};
          prev.style.fontWeight = fmt.bold ? '700' : '500';
          prev.style.fontStyle = fmt.italic ? 'italic' : 'normal';
          const decs = [];
          if (fmt.underline) decs.push('underline');
          if (fmt.strike) decs.push('line-through');
          if (decs.length) prev.style.textDecoration = decs.join(' ');
          if (p.textStrokeWidth > 0 && p.textStrokeColor) {
            conApplyTextStrokeStyle(prev, Math.min(6, p.textStrokeWidth), p.textStrokeColor);
          } else {
            conApplyTextStrokeStyle(prev, 0, '');
          }
          stage.appendChild(prev);

          const meta = document.createElement('div');
          meta.className = 'bc-preset-card-meta';
          const keyEl = document.createElement('span');
          keyEl.className = 'bc-preset-card-key';
          keyEl.textContent = p.key || 'key';
          const labelEl = document.createElement('span');
          labelEl.className = 'bc-preset-card-label';
          labelEl.textContent = p.label || p.key || '';
          meta.appendChild(keyEl);
          meta.appendChild(labelEl);
          if (p.isNodeAct) {
            const actBadge = document.createElement('span');
            actBadge.className = 'bc-preset-card-act-badge';
            actBadge.textContent = (typeof t === 'function' ? t('bcPresetPageNumberNodeBadge') : '') || 'Page';
            actBadge.title = (typeof t === 'function' ? t('bcPresetPageNumberNodeToggle') : '') || 'Use for ((...)) Page Number Nodes (only one preset)';
            meta.appendChild(actBadge);
          }

          card.addEventListener('click', () => {
            if (typeof window.bcOpenItemEditor === 'function') {
              window.bcOpenItemEditor({
                mode: 'node-preset',
                item: _conPresetEditorDraft[i],
                onSave: (updated) => {
                  if (updated && updated.isNodeAct) {
                    _conPresetEditorDraft.forEach((other, idx) => {
                      if (idx !== i && other) other.isNodeAct = false;
                    });
                  }
                  _conPresetEditorDraft[i] = updated;
                  _conPresetEditorRender();
                },
                onDelete: () => conPresetEditorDeleteRow(i)
              });
            }
          });

          card.appendChild(delBtn);
          card.appendChild(stage);
          card.appendChild(meta);
          list.appendChild(card);
        });

        const addBtn = document.getElementById('con-preset-add-btn');
        if (addBtn) addBtn.disabled = _conPresetEditorDraft.length >= 30;
        _conPresetEditorEnableDrag(list);
      }
      window._conPresetEditorRender = _conPresetEditorRender;

      function _esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
      function _safeHex(s, fallback = '#ffffff') {
        const v = (s || '').trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
        if (/^#[0-9a-fA-F]{3}$/.test(v)) return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
        try {
          const tmp = document.createElement('div');
          tmp.style.color = v;
          document.body.appendChild(tmp);
          const comp = getComputedStyle(tmp).color;
          document.body.removeChild(tmp);
          const m = comp.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (m) {
            const h = n => parseInt(n).toString(16).padStart(2, '0');
            return '#' + h(m[1]) + h(m[2]) + h(m[3]);
          }
        } catch (e) { }
        return fallback;
      }

      function _conPresetEditorEnableDrag(list) {
        let dragSrc = null;
        list.querySelectorAll('.bc-preset-card').forEach(card => {
          card.addEventListener('dragstart', e => {
            dragSrc = card;
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('bc-card-dragging');
          });
          card.addEventListener('dragend', () => {
            card.classList.remove('bc-card-dragging');
            list.querySelectorAll('.bc-preset-card').forEach(c => c.classList.remove('bc-card-drag-over'));
            dragSrc = null;
          });
          card.addEventListener('dragover', e => {
            e.preventDefault();
            if (dragSrc && dragSrc !== card) card.classList.add('bc-card-drag-over');
          });
          card.addEventListener('dragleave', () => card.classList.remove('bc-card-drag-over'));
          card.addEventListener('drop', e => {
            e.preventDefault();
            card.classList.remove('bc-card-drag-over');
            if (!dragSrc || dragSrc === card) return;
            const cards = Array.from(list.querySelectorAll('.bc-preset-card'));
            const fromIdx = cards.indexOf(dragSrc);
            const toIdx = cards.indexOf(card);
            if (fromIdx < 0 || toIdx < 0) return;
            _conPresetEditorFlushDOM();
            const [moved] = _conPresetEditorDraft.splice(fromIdx, 1);
            _conPresetEditorDraft.splice(toIdx, 0, moved);
            _conPresetEditorRender();
          });
        });
      }

      // Read current DOM row values back into _conPresetEditorDraft (before any re-render)
      function _conPresetEditorFlushDOM() {
        const rows = document.querySelectorAll('#con-preset-editor-list .con-preset-editor-row');
        const flushed = [];
        rows.forEach(row => {
          const keyInput = row.querySelector('.pe-key');
          const key = (keyInput ? keyInput.value : '').trim();
          const labelInput = row.querySelector('.pe-label');
          const label = (labelInput ? labelInput.value : key).trim() || key;
          if (!key) return;
          const bgInput = row.querySelector('.pe-bg');
          const bg = (bgInput ? bgInput.value : '#ffffff').trim() || '#ffffff';
          const colorInput = row.querySelector('.pe-color');
          const color = (colorInput ? colorInput.value : '#111111').trim() || '#111111';
          const bdrInput = row.querySelector('.pe-bdr');
          const borderColor = (bdrInput ? bdrInput.value : '#111111').trim() || '#111111';
          const bwInput = row.querySelector('.pe-bw');
          const bwUnit = row.querySelector('.pe-bw-unit')?.value || 'px';
          const rawBw = parseFloat(bwInput ? bwInput.value : 2);
          const borderWidth = !isNaN(rawBw) && rawBw >= 0 ? ((typeof conThicknessUnitToPx === 'function') ? conThicknessUnitToPx(rawBw, bwUnit) : rawBw) : 2;
          const borderWidthUnit = bwUnit;

          const borderStyle = row.querySelector('.pe-bs').value || 'solid';
          const hlInput = row.querySelector('.pe-hl');
          const highlight = hlInput ? hlInput.value.trim() : '';
          const shape = (row.querySelector('.pe-shape') ? row.querySelector('.pe-shape').value : null) || 'rectangle';
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
          const fsUnit = row.querySelector('.pe-fs-unit')?.value || 'px';
          const rawFs = parseFloat(fsInput ? fsInput.value : '');
          const fontSize = !isNaN(rawFs) && rawFs > 0 ? ((typeof conFontUnitToPx === 'function') ? conFontUnitToPx(rawFs, fsUnit) : rawFs) : null;
          const fontSizeUnit = fsUnit;

          const tscInput = row.querySelector('.pe-tsc');
          const textStrokeColor = tscInput ? tscInput.value.trim() : '';

          const tswInput = row.querySelector('.pe-tsw');
          const tswUnit = row.querySelector('.pe-tsw-unit')?.value || 'px';
          const rawTsw = parseFloat(tswInput ? tswInput.value : 0);
          const textStrokeWidth = !isNaN(rawTsw) && rawTsw > 0 ? ((typeof conThicknessUnitToPx === 'function') ? conThicknessUnitToPx(rawTsw, tswUnit) : rawTsw) : 0;
          const textStrokeWidthUnit = tswUnit;

          flushed.push({ key, label, bg, color, borderColor, borderWidth, borderWidthUnit, borderStyle, highlight, shape, fontFamily, fontSize, fontSizeUnit, textStrokeColor, textStrokeWidth, textStrokeWidthUnit, fmt });
        });
        if (flushed.length > 0) _conPresetEditorDraft = flushed;
      }

      window.conPresetEditorDeleteRow = function (i) {
        _conPresetEditorFlushDOM();
        _conPresetEditorDraft.splice(i, 1);
        _conPresetEditorRender();
      };

      window.conPresetEditorAddRow = function () {
        if (_conPresetEditorDraft.length >= 30) return;
        _conPresetEditorFlushDOM();
        const newPreset = { key: 'new', label: 'New', bg: '#ffffff', color: '#111111', borderColor: '#111111', borderWidth: 2, borderWidthUnit: 'px', borderStyle: 'solid', highlight: '', shape: 'rectangle', fontFamily: '', fontSize: null, fontSizeUnit: 'px', textStrokeColor: '', textStrokeWidth: 0, textStrokeWidthUnit: 'px', isNodeAct: false, fmt: { bold: false, italic: false, underline: false, strike: false } };
        _conPresetEditorDraft.push(newPreset);
        const idx = _conPresetEditorDraft.length - 1;
        _conPresetEditorRender();
        if (typeof window.bcOpenItemEditor === 'function') {
          window.bcOpenItemEditor({
            mode: 'node-preset',
            title: 'Add Node Preset',
            item: _conPresetEditorDraft[idx],
            onSave: (updated) => {
              if (updated && updated.isNodeAct) {
                _conPresetEditorDraft.forEach((other, otherIdx) => {
                  if (otherIdx !== idx && other) other.isNodeAct = false;
                });
              }
              _conPresetEditorDraft[idx] = updated;
              _conPresetEditorRender();
            },
            onDelete: () => conPresetEditorDeleteRow(idx)
          });
        }
      };

      window.conPresetEditorSave = async function () {
        // Collect from DOM
        _conPresetEditorFlushDOM();
        const result = _conPresetEditorDraft.filter(p => !!p.key);
        if (!result.length) { mdbToast(' At least one preset required.'); return; }

        // Update in-memory config
        const bc = (typeof window !== 'undefined' && window.BOARD_CONFIG)
          ? { ...window.BOARD_CONFIG }
          : ((typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? { ...BOARD_CONFIG } : {});
        bc.constellationPresets = result;
        window.BOARD_CONFIG = bc;

        // Persist to board-config.json (Electron) or download (browser)
        if (window.Desktop && typeof Desktop.saveJson === 'function') {
          try {
            await Desktop.saveJson('user', 'board-config.json', bc);
            mdbToast(' Presets saved to board-config.json');
          } catch (err) {
            mdbToast(' Could not save: ' + (err && err.message ? err.message : String(err)));
          }
        } else {
          const blob = new Blob([JSON.stringify(bc, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'board-config.json'; a.click();
          URL.revokeObjectURL(url);
          mdbToast(' board-config.json downloaded — replace the file in user/');
        }
        if (typeof conInitPresetButtons === 'function') conInitPresetButtons();
        conClosePresetEditor();
      };
      // ── End Preset Styles ─────────────────────────────────────────────

      window.conDeleteSelected = function () {
        if (typeof window.conDeleteSelectedItems === 'function') {
          window.conDeleteSelectedItems();
          return;
        }
        if (window._conSelectedEdgeId) {
          conPushUndo();
          const edgeToDelete = window._conSelectedEdgeId;
          window._conSelectedEdgeId = null;
          conRemoveEdge(edgeToDelete);
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
          return;
        }
        if (!conSelected) return;
        conRemoveNode(conSelected);
      };

      function _conDoClearAll(resetTitle) {
        conNodes.forEach(n => { if (n && n.el) n.el.remove(); });
        document.querySelectorAll('#constellation-board .con-node').forEach(el => el.remove());
        conNodes.length = 0;
        window.conNodes = conNodes;
        global.conNodes = conNodes;

        conEdges.forEach(e => { if (e && e.g) e.g.remove(); });
        conEdges.length = 0;
        window.conEdges = conEdges;
        global.conEdges = conEdges;

        conGroups.forEach(g => { if (g && g.el) g.el.remove(); });
        document.querySelectorAll('#constellation-board .con-group-box').forEach(el => el.remove());
        conGroups.length = 0;
        window.conGroups = conGroups;
        global.conGroups = conGroups;

        if (svg()) svg().innerHTML = '';

        conSelect(null);
        conConnSrc = null;
        if (conMultiSelected && conMultiSelected.clear) conMultiSelected.clear();
        if (window.conDrawingSelected && window.conDrawingSelected.clear) window.conDrawingSelected.clear();
        if (window.conNoteSelected && window.conNoteSelected.clear) window.conNoteSelected.clear();
        if (window._conShapeSelected && window._conShapeSelected.clear) window._conShapeSelected.clear();
        if (window.conTableSelected && window.conTableSelected.clear) window.conTableSelected.clear();

        if (window.conMasksClear) window.conMasksClear();
        if (window.conNotesClear) window.conNotesClear();
        if (window.conDrawingsClear) window.conDrawingsClear();
        if (window.conShapesClear) window.conShapesClear();
        if (window.conTablesClear) window.conTablesClear();
        if (window.conMediaClear) window.conMediaClear();

        conPageBackgroundPdf = null;
        if (typeof conRenderPagePdfBackground === 'function') conRenderPagePdfBackground();
        _conBoardBg = null;
        if (typeof conRenderBoardBg === 'function') conRenderBoardBg({ silent: true });
        _conBoardBgColor = window._bcBoardDefaultBgColor || '';
        if (typeof conApplyBoardBgColor === 'function') conApplyBoardBgColor();
        if (typeof conResetAttachments === 'function') conResetAttachments();

        _conCurrentFileName = null;
        _conCurrentFolderName = null;
        global._conCurrentFileName = null;
        global._conCurrentFolderName = null;
        if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();

        const _clearBoardEl = document.getElementById('constellation-board');
        if (_clearBoardEl) {
          if (window._bcBoardLayoutConfig && window._bcBoardLayoutConfig.dims && window._bcBoardLayoutConfig.dims.h) {
            _clearBoardEl.style.height = window._bcBoardLayoutConfig.dims.h + 'px';
          } else {
            _clearBoardEl.style.height = '';
          }
        }
        try {
          sessionStorage.removeItem('cmt-board-expanded-height');
          sessionStorage.removeItem('cmt-board-expanded-height-0');
          sessionStorage.removeItem('cmt-board-active-open-request');
        } catch (_) { }

        if (typeof window._conClearPageDomCache === 'function') {
          window._conClearPageDomCache();
        }

        const emptySnap = (typeof conBuildEmptyPageSnapshot === 'function')
          ? conBuildEmptyPageSnapshot()
          : (typeof window.conBuildEmptyPageSnapshot === 'function' ? window.conBuildEmptyPageSnapshot() : {});
        conPageSnapshots = [emptySnap];
        global.conPageSnapshots = conPageSnapshots;
        window.conPageSnapshots = conPageSnapshots;

        if (Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs.length = 0;
        if (Array.isArray(window._conPageSnapshotPngs)) window._conPageSnapshotPngs.length = 0;
        if (Array.isArray(global._conPageSnapshotPngs)) global._conPageSnapshotPngs.length = 0;

        conCurrentPageIndex = 0;
        global.conCurrentPageIndex = 0;
        window.conCurrentPageIndex = 0;

        if (resetTitle) {
          const titleInput = document.getElementById('con-title-input');
          const _tsTitle = (typeof conMakeTimestampTitle === 'function' ? conMakeTimestampTitle() : (typeof window.conMakeTimestampTitle === 'function' ? window.conMakeTimestampTitle() : ''));
          if (titleInput) titleInput.value = _tsTitle;
          if (window.conSetTitle) window.conSetTitle(_tsTitle);
          if (typeof boardSetDirty === 'function') boardSetDirty(false);
        }

        _conCurrentCompetences = [];
        if (typeof conRenderHeaderCompetenceBar === 'function') conRenderHeaderCompetenceBar();
        conNextId = 1;
        _conGroupNextId = 1;
        if (typeof conUpdatePageBar === 'function') conUpdatePageBar();
        if (typeof window.conUpdatePageBar === 'function') window.conUpdatePageBar();

        if (typeof window.conClearUndo === 'function') window.conClearUndo();
        else if (typeof conClearUndo === 'function') conClearUndo();

        if (typeof window._conBumpBoardRevision === 'function') window._conBumpBoardRevision();
        if (typeof window._conMirrorSendFullSnapshot === 'function') window._conMirrorSendFullSnapshot();

        mdbToast(' Board cleared');
      }

      window.conClearAll = function (options = {}) {
        const skipConfirm = options === true || !!options.skipConfirm;
        const resetTitle = options === true || options.resetTitle !== false;
        if (skipConfirm) { _conDoClearAll(resetTitle); return; }

        // Show an inline confirm popup near the Clear All button
        const existing = document.getElementById('con-clearall-popup');
        if (existing) { existing.remove(); return; }

        const btn = document.querySelector('[onclick="conClearAll()"]');
        const popup = document.createElement('div');
        popup.id = 'con-clearall-popup';
        popup.style.cssText = 'position:fixed;z-index:9999;background:#f5f5f0;border:2px solid #333;border-radius:8px;box-shadow:3px 3px 0 #555;padding:12px 16px;display:flex;flex-direction:column;gap:10px;font-family:inherit;font-size:0.85rem;min-width:180px;';
        popup.innerHTML = `<div style="font-weight:700;color:#111;" data-i18n="conClearEverythingTitle">${t('conClearEverythingTitle')}</div>
          <div style="display:flex;gap:8px;">
            <button id="con-clearall-yes" class="action-btn" style="flex:1;padding:6px 0;background:#c96b6b;color:#fff;border:2px solid #333;border-radius:6px;box-shadow:2px 2px 0 #555;font-weight:700;cursor:pointer;font-family:inherit;font-size:0.82rem;" data-i18n="conClearConfirmBtn">${t('conClearConfirmBtn')}</button>
            <button id="con-clearall-no" class="action-btn btn-grey" style="flex:1;padding:6px 0;background:#fff;color:#333;border:2px solid #333;border-radius:6px;box-shadow:2px 2px 0 #555;font-weight:700;cursor:pointer;font-family:inherit;font-size:0.82rem;" data-i18n="btnCancel">${t('btnCancel')}</button>
          </div>`;
        document.body.appendChild(popup);

        // Position below the button, or centre-top if button not found
        if (btn) {
          const r = btn.getBoundingClientRect();
          popup.style.left = r.left + 'px';
          popup.style.top = (r.bottom + 6) + 'px';
        } else {
          popup.style.left = '50%';
          popup.style.top = '72px';
          popup.style.transform = 'translateX(-50%)';
        }

        const close = () => popup.remove();
        document.getElementById('con-clearall-yes').onclick = () => { close(); _conDoClearAll(resetTitle); };
        document.getElementById('con-clearall-no').onclick = close;
        // Close on outside click
        setTimeout(() => document.addEventListener('click', function handler(e) {
          if (!popup.contains(e.target)) { close(); document.removeEventListener('click', handler); }
        }), 0);
      };

      // ---- Mirror: BroadcastChannel broadcast (main window only) ----
      let _conBoardRevision = 1;
      window._conBumpBoardRevision = function () {
        _conBoardRevision++;
        return _conBoardRevision;
      };
      window._conGetBoardRevision = function () {
        return _conBoardRevision;
      };
      window._conSuppressMirrorObserver = false;

      if (new URLSearchParams(location.search).get('mirror') !== '1' && new URLSearchParams(location.search).get('pageWindow') !== '1') {
        const _conMirrorSessionId = 'board_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        const _conMirrorChannelName = 'constellation-mirror-' + _conMirrorSessionId;
        window._conMirrorChannelName = _conMirrorChannelName;
        const _mirrorCh = new BroadcastChannel(_conMirrorChannelName);
        let _mirrorPopupRef = null;
        let _mirrorTimer = null;
        let _mirrorLastSent = 0;
        let _mirrorFrozen = false;
        let _mirrorFrozenSnapshot = null;
        let _mirrorFrozenPageIndex = null;
        let _mirrorFrozenViewport = null;
        window._conMirrorFrozen = false;
        window.conIsMirrorFrozen = function () { return !!_mirrorFrozen; };
        var _mirrorPointerOn = false;
        window._mirrorPointerOn = false;
        window.conToggleMirrorPointer = function () {
          _mirrorPointerOn = !_mirrorPointerOn;
          window._mirrorPointerOn = _mirrorPointerOn;
          var btn = document.getElementById('con-pointer-btn');
          if (btn) btn.classList.toggle('laser-btn-active', _mirrorPointerOn);
          document.querySelectorAll('.con-quick-action-btn[data-action="mouse_pointer"], .con-menu-action-item[data-action="mouse_pointer"]').forEach(function (el) {
            el.classList.toggle('laser-btn-active', _mirrorPointerOn);
            el.classList.toggle('con-quick-active', _mirrorPointerOn);
          });
          if (document.body) document.body.classList.toggle('con-pointer-active', _mirrorPointerOn);

          var dot = (typeof window.getLaserDot === 'function') ? window.getLaserDot() : document.getElementById('laser-dot');
          if (dot) {
            if (_mirrorPointerOn) {
              dot.style.display = 'block';
            } else {
              var fullLaser = (typeof window.laserIsActive === 'function') ? window.laserIsActive() : (document.body && document.body.classList.contains('laser-active'));
              if (!fullLaser) dot.style.display = 'none';
            }
          }

          if (typeof window._conMirrorSend === 'function') {
            window._conMirrorSend({ type: 'pointer-state', on: _mirrorPointerOn });
          }

          var msg = _mirrorPointerOn
            ? ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('conPointerOn') : 'Presentation Pointer ON')
            : ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('conPointerOff') : 'Presentation Pointer OFF');
          if (typeof showToast === 'function') {
            showToast(msg);
          } else if (typeof mdbToast === 'function') {
            mdbToast(msg);
          }
        };
        window.conToggleMirrorFreeze = function () {};
        const _mirrorPeers = new Set();
        let _mirrorControlMenuEl = null;
        const _attachmentDataUrlCache = new Map(); // cacheKey -> dataUrl
        const _mirrorSentAttachmentKeys = new Set(); // tracks keys already transmitted to mirror

        window.conMirrorSyncSelection = function () {
          if (!window._conMirrorSend) return;
          try {
            const multiNodes = (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0)
              ? Array.from(conMultiSelected)
              : (window.conGetSelected ? (window.conGetSelected() ? [window.conGetSelected()] : []) : []);
            window._conMirrorSend({
              type: 'selection-state',
              selectedNodeId: window.conGetSelected ? (window.conGetSelected() || null) : null,
              selectedNodeIds: multiNodes,
              selectedGroupId: conGroupFocused || null,
              selectedNoteIds: (typeof conNoteSelected !== 'undefined' && conNoteSelected) ? Array.from(conNoteSelected) : [],
              selectedDrawingIds: (typeof conDrawingSelected !== 'undefined' && conDrawingSelected) ? Array.from(conDrawingSelected) : [],
              selectedShapeIds: (typeof _conShapeSelected !== 'undefined' && _conShapeSelected) ? Array.from(_conShapeSelected) : [],
              selectedEdgeId: (typeof _conSelectedEdgeId !== 'undefined') ? _conSelectedEdgeId : null,
              noteTextSelection: (typeof wnGetActiveNoteSelection === 'function') ? wnGetActiveNoteSelection() : null
            });
          } catch (_) { }
        };

        function _updateMirrorControlMenuVisibility() {
          if (_mirrorPeers.size > 0 && !_mirrorControlMenuEl) {
            _ensureMirrorControlMenu();
          }
          if (_mirrorControlMenuEl) {
            _mirrorControlMenuEl.style.display = _mirrorPeers.size > 0 ? 'flex' : 'none';
          }
        }
        function _ensureMirrorControlMenu() {
          if (_mirrorControlMenuEl) return;
          const menu = document.createElement('div');
          menu.id = 'con-pres-menu';
          menu.className = 'pres-control-menu tooltip-bottom';
          menu.style.cssText = 'position:fixed;top:8px;right:8px;z-index:100000;';
          menu.innerHTML = ''
            + '<div class="pres-drag-handle" title="Drag to move">⋮⋮</div>'
            + '<button type="button" class="pres-btn" data-pres-action="close" data-tooltip="' + (boardT('pres_stop_title') || boardT('presStop')) + '" title="' + (boardT('pres_stop_title') || boardT('presStop')) + '" aria-label="' + (boardT('pres_stop_title') || boardT('presStop')) + '"><img src="../assets/icons/stop.svg" alt="" /></button>'
            + '<button type="button" class="pres-btn" data-pres-action="freeze" data-tooltip="' + (boardT('pres_freeze_title') || boardT('presFreeze')) + '" title="' + (boardT('pres_freeze_title') || boardT('presFreeze')) + '" aria-label="' + (boardT('pres_freeze_title') || boardT('presFreeze')) + '"><img src="../assets/icons/pause.svg" alt="" /></button>'
            + '<button type="button" class="pres-btn" data-pres-action="pin" data-tooltip="' + (boardT('pres_pin_title') || 'Keep presentation window always on top') + '" title="' + (boardT('pres_pin_title') || 'Keep presentation window always on top') + '" aria-label="' + (boardT('pres_pin_title') || 'Keep presentation window always on top') + '"><img src="../assets/icons/pin.svg" alt="" /></button>'
            + '<button type="button" class="pres-btn" data-pres-action="resize" data-tooltip="' + (boardT('pres_resize_title') || boardT('presResize')) + '" title="' + (boardT('pres_resize_title') || boardT('presResize')) + '" aria-label="' + (boardT('pres_resize_title') || boardT('presResize')) + '"><img src="../assets/icons/compact.svg" alt="" /></button>'
            + '<button type="button" class="pres-btn" data-pres-action="default-size" data-tooltip="' + (boardT('pres_default_size_title') || boardT('pres_default_size') || 'Default size') + '" title="' + (boardT('pres_default_size_title') || boardT('pres_default_size') || 'Default size') + '" aria-label="' + (boardT('pres_default_size_title') || boardT('pres_default_size') || 'Default size') + '"><img src="../assets/icons/monitor.svg" alt="" /></button>'
            + '<button type="button" class="pres-btn" data-pres-action="maximise" data-tooltip="' + (boardT('pres_maximize_title') || boardT('presMaximise')) + '" title="' + (boardT('pres_maximize_title') || boardT('presMaximise')) + '" aria-label="' + (boardT('pres_maximize_title') || boardT('presMaximise')) + '"><img src="../assets/icons/maximize.svg" alt="" /></button>'
            + '<button type="button" class="pres-btn" data-pres-action="left" data-tooltip="' + (boardT('pres_left_title') || boardT('presLeft')) + '" title="' + (boardT('pres_left_title') || boardT('presLeft')) + '" aria-label="' + (boardT('pres_left_title') || boardT('presLeft')) + '"><img src="../assets/icons/triangle-left.svg" alt="" /></button>'
            + '<button type="button" class="pres-btn" data-pres-action="right" data-tooltip="' + (boardT('pres_right_title') || boardT('presRight')) + '" title="' + (boardT('pres_right_title') || boardT('presRight')) + '" aria-label="' + (boardT('pres_right_title') || boardT('presRight')) + '"><img src="../assets/icons/triangle-right.svg" alt="" /></button>'
            + '<button type="button" class="pres-btn" data-pres-action="reorder-windows" data-tooltip="' + (boardT('wh_open_helper') || 'Reorder Windows') + '" title="' + (boardT('wh_open_helper') || 'Reorder Windows') + '" aria-label="' + (boardT('wh_open_helper') || 'Reorder Windows') + '"><img src="../assets/icons/layout.svg" alt="" /></button>';
          menu.addEventListener('click', function (event) {
            const btn = event.target && event.target.closest ? event.target.closest('[data-pres-action]') : null;
            if (!btn) return;
            event.preventDefault();
            event.stopPropagation();
            const action = btn.getAttribute('data-pres-action');
            if (action === 'close') window.conCloseMirrorWindow();
            else if (action === 'freeze') window.conToggleMirrorFreeze();
            else if (action === 'pin') window.conToggleMirrorAlwaysOnTop();
            else if (action === 'resize') window.conMirrorResizeWindow();
            else if (action === 'default-size') window.conMirrorDefaultSize();
            else if (action === 'maximise') window.conMirrorMaximiseWindow();
            else if (action === 'right') window.conMirrorDockRight();
            else if (action === 'left') window.conMirrorDockLeft();
            else if (action === 'reorder-windows' && window.WindowHelper && typeof window.WindowHelper.open === 'function') window.WindowHelper.open();
          });

          // Make the popup draggable
          let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
          menu.addEventListener('mousedown', dragMouseDown);
          menu.addEventListener('touchstart', dragMouseDown, { passive: false });

          function dragMouseDown(e) {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            e = e || window.event;
            if (e.type !== 'touchstart') {
              e.preventDefault();
            }
            if (e.type === 'touchstart') {
              pos3 = e.touches[0].clientX;
              pos4 = e.touches[0].clientY;
            } else {
              pos3 = e.clientX;
              pos4 = e.clientY;
            }
            document.addEventListener('mouseup', closeDragElement);
            document.addEventListener('mousemove', elementDrag);
            document.addEventListener('touchend', closeDragElement);
            document.addEventListener('touchmove', elementDrag, { passive: false });
          }

          function elementDrag(e) {
            e = e || window.event;
            let clientX, clientY;
            if (e.type === 'touchmove') {
              clientX = e.touches[0].clientX;
              clientY = e.touches[0].clientY;
            } else {
              clientX = e.clientX;
              clientY = e.clientY;
            }
            pos1 = pos3 - clientX;
            pos2 = pos4 - clientY;
            pos3 = clientX;
            pos4 = clientY;

            let newTop = menu.offsetTop - pos2;
            let newLeft = menu.offsetLeft - pos1;

            const rect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (newTop < 0) newTop = 0;
            if (newTop + rect.height > viewportHeight) newTop = viewportHeight - rect.height;
            if (newLeft < 0) newLeft = 0;
            if (newLeft + rect.width > viewportWidth) newLeft = viewportWidth - rect.width;

            menu.style.top = newTop + 'px';
            menu.style.left = newLeft + 'px';
            menu.style.right = 'auto';
            menu.style.bottom = 'auto';
          }

          function closeDragElement() {
            document.removeEventListener('mouseup', closeDragElement);
            document.removeEventListener('mousemove', elementDrag);
            document.removeEventListener('touchend', closeDragElement);
            document.removeEventListener('touchmove', elementDrag);
          }

          document.body.appendChild(menu);
          _mirrorControlMenuEl = menu;
          if (typeof _syncMirrorPinButtons === 'function') _syncMirrorPinButtons();
          _updateMirrorControlMenuVisibility();
        }
        function _setPresentationActive(on) {
          if (on && !_mirrorControlMenuEl) {
            _ensureMirrorControlMenu();
          }
          document.documentElement.classList.toggle('con-presentation-active', !!on);
          _updateMirrorControlMenuVisibility();
        }
        function _mirrorGetViewport() {
          var brd = document.getElementById('constellation-board');
          if (!brd) return { vW: window.innerWidth, vH: window.innerHeight, sx: 0, sy: 0 };
          var r = brd.getBoundingClientRect();
          var vW = window.innerWidth;
          // Use window.innerHeight as a fixed height so aspect ratio stays stable
          // when the toolbar scrolls off-screen and the board fills more of the window.
          var vH = window.innerHeight;
          var sx = brd.scrollLeft + Math.max(0, -r.left);
          var sy = brd.scrollTop + Math.max(0, -r.top);
          return { vW: vW, vH: vH, sx: sx, sy: sy };
        }
        window._mirrorGetViewport = _mirrorGetViewport;
        function _mirrorBroadcast(opts = {}) {
          if (_mirrorFrozen) return;
          if (_mirrorPeers.size === 0 && (!_mirrorPopupRef || _mirrorPopupRef.closed)) return;
          if (opts.bumpRevision && typeof window._conBumpBoardRevision === 'function') {
            window._conBumpBoardRevision();
          }
          const _now = Date.now();
          // Leading edge or explicit forceRender: fire immediately if enough time has passed or forceRender is requested
          if (opts.forceRender || _now - _mirrorLastSent >= 80) {
            clearTimeout(_mirrorTimer);
            _mirrorTimer = null;
            _mirrorLastSent = _now;
            _mirrorDoSend(opts);
            return;
          }
          // Trailing edge: schedule a catch-up send for the end of the burst
          if (!_mirrorTimer) {
            _mirrorTimer = setTimeout(function () {
              _mirrorTimer = null;
              _mirrorLastSent = Date.now();
              _mirrorDoSend(opts);
            }, 80 - (_now - _mirrorLastSent));
          }
        }
        async function _mirrorDoSend(opts = {}) {
          try {
            if (_mirrorPeers.size === 0 && (!_mirrorPopupRef || _mirrorPopupRef.closed)) return;
            var vp = _mirrorGetViewport();
            var snap = window.conBuildPageSnapshot();
            snap._revision = _conBoardRevision;
            // Resolve delta data URLs for media attachments not yet cached in the mirror window
            var attachmentDataUrls = {};
            var _mediaItems = snap.media || [];
            await Promise.all(_mediaItems.map(async function (m) {
              var attId = m.attachmentId || m.id;
              if (!attId) return;
              var att = conFindAttachmentById(attId) || (m.attachmentId ? conFindAttachmentById(m.attachmentId) : null);
              if (!att) att = { id: attId, attachmentId: m.attachmentId || attId, name: m.name, mime: m.mime, kind: m.kind, relativePath: m.relativePath || '', file: null };
              var cacheKey = attId + '_' + (att.relativePath || '') + '_' + (att.name || '');
              if (!opts.forceRender && _mirrorSentAttachmentKeys.has(cacheKey)) {
                return; // Mirror already has this attachment data URL cached
              }
              var url = _attachmentDataUrlCache.get(cacheKey);
              if (!url) {
                if (att._cachedDataUrl && att._cachedDataUrl.startsWith('data:')) {
                  url = att._cachedDataUrl;
                } else if (att.base64) {
                  var cleanB64 = att.base64.startsWith('data:') ? att.base64 : ('data:' + (att.mime || 'image/png') + ';base64,' + att.base64);
                  url = cleanB64;
                } else if (att.file) {
                  try {
                    url = await new Promise(function (resolve) {
                      var reader = new FileReader();
                      reader.onload = function () { resolve(reader.result || ''); };
                      reader.onerror = function () { resolve(''); };
                      reader.readAsDataURL(att.file);
                    });
                  } catch (_) { url = ''; }
                } else {
                  url = await conGetAttachmentDataUrl(att);
                  if (url && url.startsWith('blob:')) {
                    try {
                      var resp = await fetch(url);
                      var blob = await resp.blob();
                      if (blob && blob.size > 10 * 1024 * 1024) {
                        url = '';
                      } else {
                        url = await new Promise(function (resolve, reject) {
                          var reader = new FileReader();
                          reader.onload = function () { resolve(reader.result); };
                          reader.onerror = reject;
                          reader.readAsDataURL(blob);
                        });
                      }
                    } catch (err) { url = ''; }
                  }
                }
                if (url) {
                  _attachmentDataUrlCache.set(cacheKey, url);
                  att._cachedDataUrl = url;
                }
              }
              if (url) {
                _mirrorSentAttachmentKeys.add(cacheKey);
                if (m.attachmentId) attachmentDataUrls[m.attachmentId] = url;
                if (m.id) attachmentDataUrls[m.id] = url;
                if (att && att.id) attachmentDataUrls[att.id] = url;
                attachmentDataUrls[attId] = url;
              }
            }));
            // Also preload page background PDF delta if not yet transmitted
            var _bg = snap.boardBg || null;
            if (_bg && _bg.attachmentId) {
              var bgAtt = conFindAttachmentById(_bg.attachmentId);
              if (!bgAtt) {
                bgAtt = {
                  id: _bg.attachmentId,
                  attachmentId: _bg.attachmentId,
                  name: 'background.pdf',
                  mime: 'application/pdf',
                  kind: 'pdf',
                  relativePath: '',
                  file: null
                };
              }
              var bgCacheKey = _bg.attachmentId + '_' + (bgAtt.relativePath || '') + '_' + (bgAtt.name || '');
              if (opts.forceRender || !_mirrorSentAttachmentKeys.has(bgCacheKey)) {
                var bgUrl = _attachmentDataUrlCache.get(bgCacheKey);
                if (!bgUrl) {
                  if (bgAtt._cachedDataUrl && bgAtt._cachedDataUrl.startsWith('data:')) {
                    bgUrl = bgAtt._cachedDataUrl;
                  } else if (bgAtt.file) {
                    try {
                      bgUrl = await new Promise(function (resolve) {
                        var reader = new FileReader();
                        reader.onload = function () { resolve(reader.result || ''); };
                        reader.onerror = function () { resolve(''); };
                        reader.readAsDataURL(bgAtt.file);
                      });
                    } catch (_) { bgUrl = ''; }
                  } else {
                    bgUrl = await conGetAttachmentDataUrl(bgAtt);
                    if (bgUrl && bgUrl.startsWith('blob:')) {
                      try {
                        var bgResp = await fetch(bgUrl);
                        var bgBlob = await bgResp.blob();
                        bgUrl = await new Promise(function (resolve, reject) {
                          var bgReader = new FileReader();
                          bgReader.onload = function () { resolve(bgReader.result); };
                          bgReader.onerror = reject;
                          bgReader.readAsDataURL(bgBlob);
                        });
                      } catch (err) { bgUrl = ''; }
                    }
                  }
                  if (bgUrl) _attachmentDataUrlCache.set(bgCacheKey, bgUrl);
                }
                if (bgUrl) {
                  _mirrorSentAttachmentKeys.add(bgCacheKey);
                  attachmentDataUrls[_bg.attachmentId] = bgUrl;
                }
              }
            }
            var mediaPlaybackStates = {};
            document.querySelectorAll('.con-media-item video, .con-media-item audio').forEach(function (el) {
              var parent = el.closest('.con-media-item');
              if (!parent || !parent.dataset.id) return;
              mediaPlaybackStates[parent.dataset.id] = {
                action: el.paused ? 'pause' : 'play',
                paused: !!el.paused,
                currentTime: el.currentTime || 0,
                playbackRate: el.playbackRate || 1
              };
            });
            _mirrorCh.postMessage({
              type: 'board-state',
              snapshot: snap,
              pageIndex: (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0,
              forceRender: !!(opts && opts.forceRender),
              mediaPlaybackStates: Object.keys(mediaPlaybackStates).length ? mediaPlaybackStates : undefined,
              boardBgRender: (_conBoardBg && _conBoardBg._cachedDataUrl && _conBoardBg._cachedW && _conBoardBg._cachedH)
                ? {
                  attachmentId: String(_conBoardBg.attachmentId || ''),
                  pageNumber: Math.max(1, Number(_conBoardBg.pageNumber) || 1),
                  dataUrl: _conBoardBg._cachedDataUrl,
                  w: _conBoardBg._cachedW,
                  h: _conBoardBg._cachedH
                }
                : null,
              zoom: conCurrentZoom || 1,
              boardViewW: vp.vW,
              boardViewH: vp.vH,
              sx: vp.sx, sy: vp.sy,
              attachmentDataUrls: Object.keys(attachmentDataUrls).length ? attachmentDataUrls : undefined,
              selectedNodeId: window.conGetSelected ? (window.conGetSelected() || null) : null,
              selectedNodeIds: (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0)
                ? Array.from(conMultiSelected)
                : (window.conGetSelected && window.conGetSelected() ? [window.conGetSelected()] : []),
              selectedGroupId: conGroupFocused || null,
              selectedNoteIds: (typeof conNoteSelected !== 'undefined' && conNoteSelected) ? Array.from(conNoteSelected) : [],
              selectedDrawingIds: (typeof conDrawingSelected !== 'undefined' && conDrawingSelected) ? Array.from(conDrawingSelected) : [],
              selectedShapeIds: (typeof _conShapeSelected !== 'undefined' && _conShapeSelected) ? Array.from(_conShapeSelected) : [],
              selectedEdgeId: (typeof _conSelectedEdgeId !== 'undefined') ? _conSelectedEdgeId : null,
              noteTextSelection: (typeof wnGetActiveNoteSelection === 'function') ? wnGetActiveNoteSelection() : null,
              cmsTimer: {
                timerActive: false,
                timerDisplayText: '--:--',
                timerDisplayClass: '',
                timerDisplayOpacity: '',
                ui: {}
              },
              pointerOn: window._mirrorPointerOn || false,
              frozen: _mirrorFrozen
            });
          } catch (e) { console.error('[BoardPresenter] Error in _mirrorDoSend:', e); }
        }
        _mirrorCh.onmessage = function (e) {
          if (!e.data) return;
          if (e.data.type === 'request-state') {
            _mirrorSentAttachmentKeys.clear();
            if (_mirrorFrozen && _mirrorFrozenSnapshot) {
              _mirrorDoSendFrozen();
              return;
            }
            _mirrorBroadcast({ bumpRevision: true, forceRender: true });
            const animCfg = _conGetBoardAnimCfg();
            if (animCfg && typeof window._conMirrorSend === 'function') {
              window._conMirrorSend({ type: 'board-anim-config', animation: animCfg });
            }
            return;
          }
          if (e.data.type === 'mirror-control') {
            if (e.data.command === 'close') {
              window.conCloseMirrorWindow();
            } else if (e.data.command === 'freeze') {
              window.conToggleMirrorFreeze();
            } else if (e.data.command === 'pin') {
              window.conToggleMirrorAlwaysOnTop();
            } else if (e.data.command === 'resize') {
              window.conMirrorResizeWindow();
            } else if (e.data.command === 'maximise') {
              window.conMirrorMaximiseWindow();
            } else if (e.data.command === 'right') {
              window.conMirrorDockRight();
            } else if (e.data.command === 'left') {
              window.conMirrorDockLeft();
            }
            return;
          }
          if (e.data.type === 'mirror-presence') {
            const mirrorId = String(e.data.id || 'default');
            if (e.data.online) {
              _mirrorPeers.add(mirrorId);
              _mirrorSentAttachmentKeys.clear();
              if (_mirrorFrozen && _mirrorFrozenSnapshot) {
                _mirrorDoSendFrozen();
              } else {
                _mirrorBroadcast({ bumpRevision: true });
              }
              if (typeof window._conMirrorSend === 'function') {
                window._conMirrorSend({ type: 'mirror-pin-state', on: _mirrorAlwaysOnTop });
                const animCfg = _conGetBoardAnimCfg();
                if (animCfg) {
                  window._conMirrorSend({ type: 'board-anim-config', animation: animCfg });
                }
              }
            } else {
              _mirrorPeers.delete(mirrorId);
            }
            _setPresentationActive(_mirrorPeers.size > 0);
          }
        };
        function _mirrorDoSendFrozen() {
          try {
            if (!_mirrorFrozenSnapshot) return;
            var vp = _mirrorFrozenViewport || _mirrorGetViewport();
            _mirrorCh.postMessage({
              type: 'board-state',
              snapshot: _mirrorFrozenSnapshot,
              pageIndex: _mirrorFrozenPageIndex !== null ? _mirrorFrozenPageIndex : 0,
              zoom: conCurrentZoom || 1,
              boardViewW: vp.vW,
              boardViewH: vp.vH,
              sx: vp.sx,
              sy: vp.sy,
              pointerOn: false,
              frozen: true,
              forceRender: true
            });
          } catch (e) { console.error('[BoardPresenter] Error in _mirrorDoSendFrozen:', e); }
        }
        window._conMirrorBroadcast = _mirrorBroadcast;
        window._conMirrorSend = function (msg) {
          if (!msg) return;
          if (_mirrorFrozen && msg.type !== 'freeze-state' && msg.type !== 'mirror-control' && msg.type !== 'mirror-presence') {
            return;
          }
          try { _mirrorCh.postMessage(msg); } catch (e) { }
        };
        document.addEventListener('DOMContentLoaded', function () {
          function _setFreezeUi(on) {
            var btn = document.getElementById('con-freeze-btn');
            if (btn) btn.classList.toggle('laser-btn-active', !!on);
            var badge = document.getElementById('con-frozen-indicator');
            if (badge) badge.classList.toggle('con-frozen-active', !!on);
            // Update the dynamic pres-menu freeze button label
            if (_mirrorControlMenuEl) {
              var dynFreezeBtn = _mirrorControlMenuEl.querySelector('[data-pres-action="freeze"]');
              if (dynFreezeBtn) {
                var label = on ? (boardT('pres_unfreeze_title') || boardT('presUnfreeze')) : (boardT('pres_freeze_title') || boardT('presFreeze'));
                dynFreezeBtn.title = label;
                dynFreezeBtn.setAttribute('data-tooltip', label);
                dynFreezeBtn.setAttribute('aria-label', label);
                dynFreezeBtn.classList.toggle('is-frozen', !!on);
              }
            }
          }
          function _syncMirrorPinButtons() {
            if (_mirrorControlMenuEl) {
              var dynPinBtn = _mirrorControlMenuEl.querySelector('[data-pres-action="pin"]');
              if (dynPinBtn) {
                var label = _mirrorAlwaysOnTop
                  ? (boardT('pres_unpin_title') || 'Disable always on top for presentation window')
                  : (boardT('pres_pin_title') || 'Keep presentation window always on top');
                dynPinBtn.title = label;
                dynPinBtn.setAttribute('data-tooltip', label);
                dynPinBtn.setAttribute('aria-label', label);
                dynPinBtn.classList.toggle('is-pinned', !!_mirrorAlwaysOnTop);
              }
            }
          }
          const _mirrorBoard = document.getElementById('constellation-board');
          if (_mirrorBoard) {
            let _mirrorObsTimer = null;
            const _CON_SELECTION_STATUS_CLASSES = new Set([
              'con-selected', 'con-multi-selected', 'con-src', 'con-group-selected',
              'con-group-blink', 'con-attention-blink', 'wn-selected', 'wn-hidden',
              'con-drawing-selected', 'wn-emoji-sticker', 'laser-active', 'laser-btn-active',
              'con-drop-target', 'con-table-drop-highlight', 'con-timer-running',
              'con-timer-warning', 'con-timer-ended', 'con-masked', 'con-link-src',
              'con-table-selected', 'con-shape-selected', 'con-edge-selected',
              'con-media-selected', 'con-media-hidden', 'con-media-blink', 'tbl-locked',
              'con-media-fullscreen', 'con-fs-mini-pinned', 'con-media-mini-visible',
              'con-linking', 'con-link-mode',
              'draw-mode', 'connect-mode',
              'con-random-rolling',
              'con-node-highlight-pulse', 'con-link-highlight-pulse', 'con-search-target-pulse',
              'con-mirror-active',
              'con-node-video', 'con-video-playing', 'con-video-paused',
              'con-anim-pulse', 'con-anim-blink', 'con-anim-float', 'con-anim-heartbeat',
              'con-anim-wiggle', 'con-anim-bounce', 'con-anim-ripple', 'con-anim-spotlight',
              'con-anim-shimmer', 'con-anim-tada', 'con-anim-invert', 'con-anim-orbit',
              'con-anim-elastic', 'con-anim-pendulum', 'con-anim-hue_glow'
            ]);
            new MutationObserver(function (mutations) {
              if (window._conSuppressMirrorObserver || window._conMirrorDragging || (typeof location !== 'undefined' && location.search.indexOf('mirror=1') !== -1)) return;
              // Skip full re-render if mutations are only selection, blink, stickers, note typing, timer ticks, or transient classes
              const allIgnored = mutations.every(function (m) {
                const t = m.target;
                if (!t) return true;
                // Ignore rubber-band selection element and its transient mutations
                if (t.id === 'con-rubberband' || (t.closest && t.closest('#con-rubberband'))) return true;
                // Ignore fullscreen media exit buttons and zoom bar buttons
                if (t.closest && (t.closest('.con-media-fullscreen-exit-btn') || t.closest('.con-fs-zoom-btn') || t.closest('.con-fs-zoom-sep'))) return true;
                if (t.classList && (t.classList.contains('con-media-fullscreen-exit-btn') || t.classList.contains('con-fs-zoom-btn') || t.classList.contains('con-fs-zoom-sep'))) return true;
                // Ignore attribute mutations on media items (position, size, fullscreen, transform, and hide are handled via micro-messages)
                if (t.closest && t.closest('.con-media-item')) {
                  if (m.type === 'attributes') return true;
                }
                // Ignore draw overlay, live SVG, and eraser outline
                if (t.id === 'con-draw-overlay' || t.id === 'con-draw-live-svg' || (t.closest && (t.closest('#con-draw-overlay') || t.closest('#con-draw-live-svg') || t.closest('.con-eraser-outline')))) return true;
                if (t.classList && (t.classList.contains('con-eraser-outline') || t.classList.contains('con-eraser-active'))) return true;
                // Ignore drawings, shapes, and masks added/modified (handled via drawing-add, shape-add, drawing-resize, etc.)
                if (t.classList && (t.classList.contains('con-drawing') || t.classList.contains('con-shape') || t.classList.contains('con-mask-rect'))) return true;
                if (t.closest && (t.closest('.con-drawing') || t.closest('.con-shape') || t.closest('.con-mask-rect'))) return true;
                // Ignore drawing/shape/media/table/mask/node resize handles
                if (t.closest && (t.closest('.con-drawing-handle') || t.closest('.con-shape-handle') || t.closest('.con-group-resizer') || t.closest('.con-mask-resizer') || t.closest('.con-node-resizer') || t.closest('.con-media-resizer') || t.closest('.con-table-resizer') || t.closest('.con-table-col-resizer') || t.closest('.con-table-row-resizer'))) return true;
                // Ignore any mutations inside word notes (typing, formatting, autosize) — handled directly by note-text and note-move
                if (t.closest && (t.closest('.con-word-note') || t.closest('.wn-note-editor') || t.closest('.wn-note-resizer'))) return true;
                // Ignore any mutations inside node timers (countdown ticks, digit changes) — handled directly by node-timer-tick
                if (t.closest && (t.closest('.con-node-timer') || t.closest('.con-timer-digits') || t.closest('.con-timer-node-row'))) return true;
                // Ignore any mutations inside random nodes (roll digit changes) — handled directly by node-random-roll
                if (t.closest && (t.closest('.con-random-digits') || t.closest('.con-random-node-row'))) return true;
                // Ignore any mutations inside sound nodes (playback state, digits, popovers) — handled directly by node-sound-state
                if (t.closest && (t.closest('.con-node-sound') || t.closest('.con-sound-digits') || t.closest('.con-sound-node-row') || t.closest('#con-sound-action-popover'))) return true;
                // Ignore any mutations inside video nodes (playback state, digits, popovers) — handled directly by node-video-state
                if (t.closest && (t.closest('.con-node-video') || t.closest('.con-video-digits') || t.closest('.con-video-node-row') || t.closest('#con-video-action-popover'))) return true;
                // Ignore any mutations inside edge SVG line groups (creation, style, label changes — handled directly by edge-add, edge-remove, edge-update)
                if (t.closest && (t.closest('.con-line-group') || t.closest('.con-line') || t.closest('.con-line-hit') || t.closest('.con-line-label') || t.id === 'con-arrow-defs' || (t.closest && t.closest('#con-arrow-defs')))) return true;
                if (t.classList && (t.classList.contains('con-line-group') || t.classList.contains('con-line') || t.classList.contains('con-line-hit') || t.classList.contains('con-line-label'))) return true;

                if (m.type === 'attributes') {
                  if (m.attributeName === 'class') {
                    const oldTokens = (m.oldValue || '').trim().split(/\s+/).filter(Boolean);
                    const newTokens = (t.className || '').trim().split(/\s+/).filter(Boolean);
                    const oldSet = new Set(oldTokens);
                    const newSet = new Set(newTokens);
                    let onlySelectionStatusDiff = true;
                    for (const c of oldTokens) {
                      if (!newSet.has(c) && !_CON_SELECTION_STATUS_CLASSES.has(c)) {
                        onlySelectionStatusDiff = false;
                        break;
                      }
                    }
                    if (onlySelectionStatusDiff) {
                      for (const c of newTokens) {
                        if (!oldSet.has(c) && !_CON_SELECTION_STATUS_CLASSES.has(c)) {
                          onlySelectionStatusDiff = false;
                          break;
                        }
                      }
                    }
                    if (onlySelectionStatusDiff) return true;
                  } else if (m.attributeName === 'style') {
                    if (t.classList && (t.classList.contains('wn-emoji-sticker') || t.classList.contains('con-drop-target') || t.classList.contains('con-drawing') || t.classList.contains('con-shape') || t.classList.contains('con-mask-rect') || t.classList.contains('con-mask-resizer') || t.classList.contains('con-eraser-outline'))) return true;
                    if (t.closest && (t.closest('.con-drawing') || t.closest('.con-shape') || t.closest('.con-mask-rect') || t.closest('#con-draw-overlay') || t.closest('.con-eraser-outline'))) return true;
                    // Ignore transient CSS variables used for attention blinking and animations
                    // and transient selection styles like z-index, cursor, pointer-events
                    const cleanStyle = s => (s || '').replace(/(?:--con-(?:blink-delay|node-border|group-blink-delay|anim-delay)|--wn-blink-delay|z-index|cursor|pointer-events)\s*:[^;]+;?/gi, '').trim();
                    const currentStyle = (t.getAttribute && t.getAttribute('style')) || '';
                    if (cleanStyle(m.oldValue) === cleanStyle(currentStyle)) return true;
                  }
                } else if (m.type === 'childList') {
                  const isIgnoredNode = n => {
                    if (!n) return true;
                    if (n.nodeType === Node.TEXT_NODE) return true;
                    if (!n.classList) return false;
                    return n.classList.contains('wn-emoji-sticker') ||
                           n.classList.contains('con-timer-digits') ||
                           n.classList.contains('con-timer-node-row') ||
                           n.classList.contains('con-random-digits') ||
                           n.classList.contains('con-random-node-row') ||
                           n.classList.contains('con-node-sound') ||
                           n.classList.contains('con-sound-digits') ||
                           n.classList.contains('con-sound-node-row') ||
                           n.classList.contains('con-node-video') ||
                           n.classList.contains('con-video-digits') ||
                           n.classList.contains('con-video-node-row') ||
                           n.classList.contains('wn-mirror-selection-overlay') ||
                           n.classList.contains('con-snap-line') ||
                           n.classList.contains('con-drawing-handle') ||
                           n.classList.contains('con-shape-handle') ||
                           n.classList.contains('con-media-resizer') ||
                           n.classList.contains('con-media-fullscreen-exit-btn') ||
                           n.classList.contains('con-fs-zoom-btn') ||
                           n.classList.contains('con-fs-zoom-sep') ||
                           n.classList.contains('con-table-resizer') ||
                           n.classList.contains('con-table-col-resizer') ||
                           n.classList.contains('con-table-row-resizer') ||
                           n.classList.contains('con-mask-resizer') ||
                           n.classList.contains('con-line-group') ||
                           n.classList.contains('con-line') ||
                           n.classList.contains('con-line-hit') ||
                           n.classList.contains('con-line-label') ||
                           n.classList.contains('con-eraser-outline') ||
                           n.id === 'con-draw-overlay' ||
                           n.id === 'con-draw-live-svg' ||
                           n.id === 'con-arrow-defs' ||
                           // Drawing/shape/mask removal is synced via dedicated micro-messages
                           n.classList.contains('con-drawing') ||
                           n.classList.contains('con-shape') ||
                           n.classList.contains('con-mask-rect');
                  };
                  const addedOnlyIgnored = Array.from(m.addedNodes).every(isIgnoredNode);
                  const removedOnlyIgnored = Array.from(m.removedNodes).every(isIgnoredNode);
                  if ((m.addedNodes.length === 0 || addedOnlyIgnored) && (m.removedNodes.length === 0 || removedOnlyIgnored)) return true;
                }
                return false;
              });
              if (!allIgnored) {
                if (_mirrorObsTimer) clearTimeout(_mirrorObsTimer);
                _mirrorObsTimer = setTimeout(() => {
                  _mirrorObsTimer = null;
                  _mirrorBroadcast({ bumpRevision: true });
                }, 50);
              }
            }).observe(_mirrorBoard, {
              childList: true, subtree: true,
              attributes: true, attributeFilter: ['style', 'class', 'data-shape'],
              attributeOldValue: true
            });
          }
          // Patch laserToggle to forward on/off state
          var _origLaserToggle = window.laserToggle;
          if (typeof _origLaserToggle === 'function') {
            window.laserToggle = function () {
              _origLaserToggle.apply(this, arguments);
              window._conMirrorSend({ type: 'laser-toggle', on: document.body.classList.contains('laser-active') });
            };
          }
          // Mirror pointer mode: show mouse position as laser dot without activating full laser mode
          // (window.conToggleMirrorPointer is defined at outer scope with full UI and mirror integration)
          window.conToggleMirrorFreeze = function () {
            _mirrorFrozen = !_mirrorFrozen;
            window._conMirrorFrozen = _mirrorFrozen;
            if (_mirrorFrozen) {
              _mirrorFrozenSnapshot = window.conBuildPageSnapshot ? window.conBuildPageSnapshot() : null;
              _mirrorFrozenPageIndex = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
              _mirrorFrozenViewport = _mirrorGetViewport ? _mirrorGetViewport() : null;
            } else {
              _mirrorFrozenSnapshot = null;
              _mirrorFrozenPageIndex = null;
              _mirrorFrozenViewport = null;
            }
            _setFreezeUi(_mirrorFrozen);
            window._conMirrorSend({ type: 'freeze-state', on: _mirrorFrozen });
            if (!_mirrorFrozen) {
              _mirrorSentAttachmentKeys.clear();
              if (typeof window._conBumpBoardRevision === 'function') {
                window._conBumpBoardRevision();
              }
              if (_mirrorTimer) {
                clearTimeout(_mirrorTimer);
                _mirrorTimer = null;
              }
              _mirrorLastSent = 0;
              _mirrorBroadcast({ bumpRevision: true, forceRender: true });
            }
          };
          _setFreezeUi(_mirrorFrozen);
          // Sync board scroll (and page scroll) to mirror (throttled to rAF)
          let _mirrorScrollRaf = null;
          function _mirrorSendScroll() {
            if (_mirrorFrozen) return;
            if (_mirrorScrollRaf) return;
            _mirrorScrollRaf = requestAnimationFrame(function () {
              _mirrorScrollRaf = null;
              var vp = _mirrorGetViewport();
              window._conMirrorSend({
                type: 'board-scroll',
                sx: vp.sx, sy: vp.sy,
                boardViewW: vp.vW, boardViewH: vp.vH,
                zoom: conCurrentZoom || 1
              });
            });
          }
          if (_mirrorBoard) {
            _mirrorBoard.addEventListener('scroll', _mirrorSendScroll, { passive: true });
          }
          window.addEventListener('scroll', _mirrorSendScroll, { passive: true });
          window.addEventListener('resize', _mirrorSendScroll, { passive: true });
          // Forward laser events using viewport-relative normalised coords so positions
          // align precisely with the board region shown on the mirror.
          function _normBrd(cx, cy) {
            var brd = _mirrorBoard;
            if (!brd) return { nx: cx / window.innerWidth, ny: cy / window.innerHeight };
            var r = brd.getBoundingClientRect();
            // Offset relative to visible viewport width/height — matching _mirrorGetViewport
            return {
              nx: (cx - Math.max(r.left, 0)) / Math.max(1, window.innerWidth),
              ny: (cy - Math.max(r.top, 0)) / Math.max(1, window.innerHeight)
            };
          }
          var _ld = false, _ldX = 0, _ldY = 0, _lt = false, _lts = 0;
          document.addEventListener('mousemove', function (e) {
            var isLaser = document.body.classList.contains('laser-active');
            if (!isLaser && !_mirrorPointerOn && !window._mirrorPointerOn) return;
            var now = Date.now(); if (now - _lts < 16) return; _lts = now;
            var p = _normBrd(e.clientX, e.clientY);
            window._conMirrorSend({ type: 'laser-move', nx: p.nx, ny: p.ny });
            if (isLaser && _ld) {
              var dx = e.clientX - _ldX, dy = e.clientY - _ldY;
              if (dx * dx + dy * dy > 36) _lt = true;
              if (_lt) { var pt = _normBrd(e.clientX, e.clientY); window._conMirrorSend({ type: 'laser-trail', nx: pt.nx, ny: pt.ny, size: 5 + Math.random() * 5 }); }
            }
          }, { passive: true });
          document.addEventListener('mousedown', function (e) {
            if (!document.body.classList.contains('laser-active') || e.button !== 0) return;
            _ld = true; _ldX = e.clientX; _ldY = e.clientY; _lt = false;
          });
          document.addEventListener('mouseup', function (e) {
            var isLaser = document.body.classList.contains('laser-active');
            if (isLaser && _ld) {
              var wasTr = _lt; _ld = false; _lt = false;
              if (!wasTr) { var p = _normBrd(e.clientX, e.clientY); window._conMirrorSend({ type: 'laser-mark', nx: p.nx, ny: p.ny }); }
            }
          });
          document.addEventListener('dblclick', function (e) {
            if (!document.body.classList.contains('laser-active')) return;
            var p = _normBrd(e.clientX, e.clientY);
            window._conMirrorSend({ type: 'laser-pulse', nx: p.nx, ny: p.ny });
          });
        });
        window.conOpenMirrorWindow = function () {
          _mirrorPeers.add('primary-mirror');
          _mirrorAlwaysOnTop = false;
          _ensureMirrorControlMenu();
          if (typeof _syncMirrorPinButtons === 'function') _syncMirrorPinButtons();
          _setPresentationActive(true);
          try {
            localStorage.setItem('cmt_active_board_mirror_channel', _conMirrorChannelName);
          } catch (_) { }
          let cardCfg = {};
          try { cardCfg = JSON.parse(localStorage.getItem('cmt-card-config-board') || '{}'); } catch (_) {}
          if (window.Desktop && window.Desktop.isElectron()) {
            window.Desktop.openMirrorWindow({ channel: _conMirrorChannelName, cardConfig: cardCfg });
          } else {
            const sizeNum = Number(cardCfg.presWindowSize || cardCfg.presSize);
            const ratio = (!isNaN(sizeNum) && sizeNum >= 10 && sizeNum <= 100) ? (sizeNum / 100) : 0.8;
            const sw = (window.screen && window.screen.availWidth) || 1200;
            const sh = (window.screen && window.screen.availHeight) || 800;
            const w = Math.max(420, Math.round(sw * ratio));
            const h = Math.max(300, Math.round(sh * ratio));
            _mirrorPopupRef = window.open(location.pathname + '?mirror=1&mirrorChannel=' + encodeURIComponent(_conMirrorChannelName), '_blank',
              'width=' + w + ',height=' + h + ',menubar=no,toolbar=no,location=no');
          }
        };
        window.conCloseMirrorWindow = async function () {
          if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.mirrorWindowCommand === 'function') {
            await window.Desktop.mirrorWindowCommand('close');
          } else if (_mirrorPopupRef && !_mirrorPopupRef.closed) {
            _mirrorPopupRef.close();
          }
          // Proactively clear peers and hide the presentation menu;
          // the mirror's beforeunload mirror-presence message may not arrive
          // before the window is destroyed (especially in Electron).
          _mirrorPeers.clear();
          _mirrorAlwaysOnTop = false;
          if (typeof _syncMirrorPinButtons === 'function') _syncMirrorPinButtons();
          _setPresentationActive(false);
        };

        (function initBoardSecondScreenPrompt() {
          if (location.search.includes('mirror=1') || location.search.includes('pageWindow=1')) return;
          function showSecondScreenBanner(onStartPresentation) {
            if (document.getElementById('second-screen-prompt-banner')) return;
            const promptMsg = typeof window.t === 'function' ? window.t('secondDisplayPrompt') : 'Second display detected! Would you like to launch Presentation Mode on monitor 2?';
            const startBtnTxt = typeof window.t === 'function' ? window.t('btnStartPresentation') : ' Start Presentation Mode';
            const dismissBtnTxt = typeof window.t === 'function' ? window.t('btnDismissPrompt') : 'Dismiss';
            const banner = document.createElement('div');
            banner.id = 'second-screen-prompt-banner';
            banner.style.cssText = 'position:fixed;top:16px;right:20px;z-index:99999;display:flex;align-items:center;gap:12px;padding:10px 16px;border:1px solid rgba(74,144,217,0.4);border-radius:12px;background:rgba(18,24,38,0.92);box-shadow:0 8px 24px rgba(0,0,0,0.35);backdrop-filter:blur(10px);color:#fff;font-family:inherit;font-size:0.86rem;line-height:1.3;animation:slideDownPrompt 0.3s ease-out;';
            if (!document.getElementById('second-screen-banner-styles')) {
              const styleEl = document.createElement('style');
              styleEl.id = 'second-screen-banner-styles';
              styleEl.textContent = '@keyframes slideDownPrompt { from { transform: translateY(-20px); opacity:0; } to { transform: translateY(0); opacity:1; } }';
              document.head.appendChild(styleEl);
            }
            banner.innerHTML = '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1.2rem;"></span><span>' + promptMsg + '</span></div>'
              + '<div style="display:flex;align-items:center;gap:8px;margin-left:8px;">'
              + '<button type="button" id="btn-start-second-pres" style="padding:6px 12px;border:none;border-radius:8px;background:linear-gradient(135deg, #28a745, #208637);color:#fff;font-weight:700;font-size:0.8rem;cursor:pointer;box-shadow:0 2px 8px rgba(40,167,69,0.3);transition:transform 0.1s, background 0.15s;">' + startBtnTxt + '</button>'
              + '<button type="button" id="btn-dismiss-second-pres" style="padding:6px 10px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:transparent;color:#ccc;font-weight:600;font-size:0.8rem;cursor:pointer;transition:background 0.15s;">' + dismissBtnTxt + '</button>'
              + '</div>';
            document.body.appendChild(banner);
            banner.querySelector('#btn-start-second-pres').onclick = function () {
              banner.remove();
              onStartPresentation();
            };
            banner.querySelector('#btn-dismiss-second-pres').onclick = function () {
              sessionStorage.setItem('dismissed_second_screen_prompt', '1');
              banner.remove();
            };
          }

          async function checkAndPrompt() {
            if (_mirrorPeers.size > 0 || (_mirrorPopupRef && !_mirrorPopupRef.closed)) return;
            if (sessionStorage.getItem('dismissed_second_screen_prompt')) return;
            let hasSecond = false;
            if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.hasSecondDisplay === 'function') {
              hasSecond = await window.Desktop.hasSecondDisplay();
            } else if (window.screen && ('isExtended' in window.screen)) {
              hasSecond = !!window.screen.isExtended;
            }
            if (hasSecond) {
              showSecondScreenBanner(function () {
                if (typeof window.conOpenMirrorWindow === 'function') window.conOpenMirrorWindow();
              });
            }
          }

          setTimeout(checkAndPrompt, 1500);
          if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.onDisplayChanged === 'function') {
            window.Desktop.onDisplayChanged(function (data) {
              if (data && data.hasSecond) {
                checkAndPrompt();
              } else {
                const existing = document.getElementById('second-screen-prompt-banner');
                if (existing) existing.remove();
              }
            });
          }
        })();
        window.conMirrorResizeWindow = async function () {
          if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.mirrorWindowCommand === 'function') {
            await window.Desktop.mirrorWindowCommand('resize-window');
            return;
          }
          if (_mirrorPopupRef && !_mirrorPopupRef.closed) {
            const width = Math.max(420, Math.round(window.outerWidth || 1200));
            const height = Math.max(300, Math.round(window.outerHeight || 800));
            _mirrorPopupRef.resizeTo(width, height);
          }
        };
        window.conMirrorDefaultSize = async function () {
          if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.mirrorWindowCommand === 'function') {
            await window.Desktop.mirrorWindowCommand('default-size');
            return;
          }
          if (_mirrorPopupRef && !_mirrorPopupRef.closed) {
            let cardCfg = {};
            try { cardCfg = JSON.parse(localStorage.getItem('cmt-card-config-board') || '{}'); } catch (_) {}
            const sizeNum = Number(cardCfg.presWindowSize || cardCfg.presSize);
            const ratio = (!isNaN(sizeNum) && sizeNum >= 10 && sizeNum <= 100) ? (sizeNum / 100) : 0.8;
            const sw = (window.screen && window.screen.availWidth) || 1200;
            const sh = (window.screen && window.screen.availHeight) || 800;
            const width = Math.max(420, Math.round(sw * ratio));
            const height = Math.max(300, Math.round(sh * ratio));
            _mirrorPopupRef.resizeTo(width, height);
          }
        };
        window.conMirrorDockLeft = async function () {
          if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.mirrorWindowCommand === 'function') {
            await window.Desktop.mirrorWindowCommand('dock-left');
            return;
          }
          if (_mirrorPopupRef && !_mirrorPopupRef.closed) {
            const width = Math.max(260, Math.round((window.screen && window.screen.availWidth ? window.screen.availWidth : 1200) * 0.2));
            const height = Math.max(300, Math.round(window.outerHeight || 800));
            _mirrorPopupRef.resizeTo(width, height);
            _mirrorPopupRef.moveTo(0, 0);
          }
        };
        window.conMirrorDockRight = async function () {
          if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.mirrorWindowCommand === 'function') {
            await window.Desktop.mirrorWindowCommand('dock-right');
            return;
          }
          if (_mirrorPopupRef && !_mirrorPopupRef.closed) {
            const width = Math.max(260, Math.round((window.screen && window.screen.availWidth ? window.screen.availWidth : 1200) * 0.2));
            const height = Math.max(300, Math.round(window.outerHeight || 800));
            const left = Math.max(0, Math.round((window.screen && window.screen.availWidth ? window.screen.availWidth : 1200) - width));
            _mirrorPopupRef.resizeTo(width, height);
            _mirrorPopupRef.moveTo(left, 0);
          }
        };
        window.conMirrorMaximiseWindow = async function () {
          if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.mirrorWindowCommand === 'function') {
            await window.Desktop.mirrorWindowCommand('maximise');
            return;
          }
          if (_mirrorPopupRef && !_mirrorPopupRef.closed) {
            try { _mirrorPopupRef.moveTo(0, 0); } catch (e) { }
            try {
              const sw = window.screen && window.screen.availWidth ? window.screen.availWidth : screen.availWidth;
              const sh = window.screen && window.screen.availHeight ? window.screen.availHeight : screen.availHeight;
              _mirrorPopupRef.resizeTo(sw, sh);
            } catch (e) { }
          }
        };
        var _mirrorAlwaysOnTop = false;
        window.conToggleMirrorAlwaysOnTop = async function () {
          if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.mirrorWindowCommand === 'function') {
            var res = await window.Desktop.mirrorWindowCommand('toggle-always-on-top');
            if (res && typeof res.alwaysOnTop === 'boolean') {
              _mirrorAlwaysOnTop = res.alwaysOnTop;
            } else {
              _mirrorAlwaysOnTop = !_mirrorAlwaysOnTop;
            }
          } else {
            _mirrorAlwaysOnTop = !_mirrorAlwaysOnTop;
            if (typeof showToast === 'function') {
              showToast(boardT('pres_pin_web_notice') || 'Always on top is only available in the desktop application', true);
            }
          }
          if (typeof _syncMirrorPinButtons === 'function') _syncMirrorPinButtons();
          if (typeof window._conMirrorSend === 'function') {
            window._conMirrorSend({ type: 'mirror-pin-state', on: _mirrorAlwaysOnTop });
          }
        };
        if (window.Desktop && typeof window.Desktop.onWindowsChanged === 'function') {
          const _unsubBoardWin = window.Desktop.onWindowsChanged(function (snapshot) {
            if (!snapshot || !Array.isArray(snapshot.windows)) return;
            const mirrorWin = snapshot.windows.find(function (w) {
              return w && w.role === 'mirror' && w.pageFile === 'board.html';
            });
            if (mirrorWin) {
              if (_mirrorAlwaysOnTop !== !!mirrorWin.isAlwaysOnTop) {
                _mirrorAlwaysOnTop = !!mirrorWin.isAlwaysOnTop;
                if (typeof _syncMirrorPinButtons === 'function') _syncMirrorPinButtons();
              }
            } else if (_mirrorControlMenuEl && _mirrorControlMenuEl.style.display !== 'none') {
              _mirrorAlwaysOnTop = false;
              if (typeof _syncMirrorPinButtons === 'function') _syncMirrorPinButtons();
              _mirrorControlMenuEl.style.display = 'none';
            }
          });
          window.addEventListener('beforeunload', function () {
            try { _unsubBoardWin(); } catch (_) {}
          });
        }
      } else {
        window.conOpenMirrorWindow = function () { };
        window.conCloseMirrorWindow = function () { };
      }

      // ---- Internal helpers ----
      function conNodeClearSelection() {
        conSelected = null;
        window.conSelected = global.conSelected = null;
        conMultiSelected.clear();
        if (window.conMultiSelected && window.conMultiSelected !== conMultiSelected) window.conMultiSelected.clear();
        if (global.conMultiSelected && global.conMultiSelected !== conMultiSelected) global.conMultiSelected.clear();
        conNodes.forEach(n => {
          if (n && n.el) n.el.classList.remove('con-selected', 'con-src', 'con-multi-selected');
        });
        conGroups.forEach(g => { if (g && g.el) g.el.classList.remove('con-group-selected'); });
        conGroupFocused = null;
        window.conGroupFocused = global.conGroupFocused = null;
        if (typeof conCloseNodeWordCard === 'function') conCloseNodeWordCard();
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
      }
      window.conNodeClearSelection = conNodeClearSelection;

      function conSelect(id) {
        // Clear group focus
        conGroups.forEach(g => g.el.classList.remove('con-group-selected'));
        conGroupFocused = null;
        window.conGroupFocused = global.conGroupFocused = null;
        // Clear multi-selection
        conMultiSelected.clear();
        if (window.conMultiSelected && window.conMultiSelected !== conMultiSelected) window.conMultiSelected.clear();
        if (global.conMultiSelected && global.conMultiSelected !== conMultiSelected) global.conMultiSelected.clear();
        conNodes.forEach(n => {
          n.el.classList.remove('con-selected', 'con-src', 'con-multi-selected');
        });
        conSelected = id;
        window.conSelected = global.conSelected = id;
        if (id) {
          if (window._conSelectedEdgeId) {
            window._conSelectedEdgeId = null;
            if (typeof conRedrawEdges === 'function') conRedrawEdges();
          }
          // Clear drawing selection
          conDrawingSelected.clear();
          document.querySelectorAll('#constellation-board .con-drawing.con-drawing-selected')
            .forEach(el => el.classList.remove('con-drawing-selected'));
          // Clear note selection
          if (typeof conNoteSelected !== 'undefined' && conNoteSelected) {
            conNoteSelected.clear();
            document.querySelectorAll('#constellation-board .con-word-note.wn-selected')
              .forEach(el => el.classList.remove('wn-selected'));
          }
          if (typeof window.conShapeClearSelection === 'function') {
            window.conShapeClearSelection();
          }
          if (typeof window.conTableClearSelection === 'function') {
            window.conTableClearSelection();
          }
          if (typeof window.conMediaClearSelection === 'function') {
            window.conMediaClearSelection();
          }
          const node = conNodes.find(n => n.id === id);
          if (node) node.el.classList.add('con-selected');
          // Sync active palette to match the node's current colour
          const el = node && node.el;
          if (el) {
            const nodeBg = (el.style.background || el.style.backgroundColor || '#ffffff').trim();
            const match = CON_PALETTES.findIndex(([bg]) => {
              if (!bg) return false;
              if (bg.trim().toLowerCase() === nodeBg.toLowerCase()) return true;
              if (typeof rgbToHex === 'function' && rgbToHex(bg).toLowerCase() === rgbToHex(nodeBg).toLowerCase()) return true;
              return false;
            });
            conActivePalette = match >= 0 ? match : 0;
          }
        }
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
      }

      function conSetMultiSelected(ids, preserveOthers) {
        // ids: array of node ids to multi-select
        conSelected = null;
        window.conSelected = global.conSelected = null;
        if (ids && ids.length > 0 && window._conSelectedEdgeId) {
          window._conSelectedEdgeId = null;
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
        }
        conMultiSelected.clear();
        if (ids && ids.length > 0) {
          ids.forEach(id => conMultiSelected.add(id));
        }
        if (window.conMultiSelected && window.conMultiSelected !== conMultiSelected) {
          window.conMultiSelected.clear();
          if (ids && ids.length > 0) ids.forEach(id => window.conMultiSelected.add(id));
        } else {
          window.conMultiSelected = conMultiSelected;
        }
        if (global.conMultiSelected && global.conMultiSelected !== conMultiSelected) {
          global.conMultiSelected.clear();
          if (ids && ids.length > 0) ids.forEach(id => global.conMultiSelected.add(id));
        } else {
          global.conMultiSelected = conMultiSelected;
        }
        conNodes.forEach(n => {
          n.el.classList.remove('con-selected', 'con-multi-selected');
          if (conMultiSelected.has(n.id)) n.el.classList.add('con-multi-selected');
        });
        if (!preserveOthers && ids && ids.length > 0) {
          if (typeof conNoteSelected !== 'undefined' && conNoteSelected) {
            conNoteSelected.clear();
            document.querySelectorAll('#constellation-board .con-word-note.wn-selected')
              .forEach(el => el.classList.remove('wn-selected'));
          }
          if (typeof window.conDrawingClearSelection === 'function') {
            window.conDrawingClearSelection();
          }
          if (typeof window.conShapeClearSelection === 'function') {
            window.conShapeClearSelection();
          }
          if (typeof window.conTableClearSelection === 'function') {
            window.conTableClearSelection();
          }
          if (typeof window.conMediaClearSelection === 'function') {
            window.conMediaClearSelection();
          }
        }
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
      }

      let _conActiveWordCardNodeId = null;
      let _conActiveWordCardDbEntry = null;

      function conCloseNodeWordCard() {
        const popup = document.getElementById('con-node-card-popup');
        if (popup) {
          popup.style.display = 'none';
          popup.classList.remove('visible');
        }
        _conActiveWordCardNodeId = null;
        _conActiveWordCardDbEntry = null;
      }

      let _conActiveWordCardMatches = [];

      function conOpenNodeWordCard(id, x, y) {
        const node = conNodes.find(n => n.id === id);
        if (!node) return;
        const nodeWord = (node.baseWord || (node.el && node.el.textContent.trim()) || '').trim();

        let matches = conGetNodeDbEntries(node);
        if (!matches || !matches.length) {
          matches = conFindAllDbEntries(nodeWord);
        }
        if (!matches || !matches.length) {
          const legacy = conGetNodeDbEntry(node) || conFindDbEntry(nodeWord);
          if (legacy) {
            matches = [{ entry: legacy, matchType: 'direct', matchedWord: legacy.word }];
          }
        }
        if ((!matches || !matches.length) && (node.aiDef || node.aiPos)) {
          matches = [{
            entry: {
              word: nodeWord,
              pos: node.aiPos || '',
              partOfSpeech: node.aiPos || '',
              definition: node.aiDef || '',
              _source: 'AI Studio'
            },
            matchType: 'direct',
            matchedWord: nodeWord
          }];
        }

        if (!matches || !matches.length) {
          if (typeof mdbToast === 'function') {
            mdbToast(` "${nodeWord || 'Word'}" was not found in the word bank.`);
          }
          return;
        }

        _conActiveWordCardNodeId = node.id;
        _conActiveWordCardDbEntry = matches[0].entry;
        _conActiveWordCardMatches = matches;

        const popup = document.getElementById('con-node-card-popup');
        if (!popup) return;

        const wordEl = document.getElementById('con-ncp-word');
        const posEl = document.getElementById('con-ncp-pos');
        const levelEl = document.getElementById('con-ncp-level');
        const sourceEl = document.getElementById('con-ncp-source');
        const countPill = document.getElementById('con-ncp-count');

        wordEl.textContent = nodeWord || matches[0].entry.word || 'Word';

        // 1. Gather distinct metadata across all matches
        const allPos = new Set();
        const allLevels = new Set();
        const allSources = new Set();

        matches.forEach(m => {
          const e = m.entry;
          if (!e) return;
          const p = e.partOfSpeech || e.pos;
          if (Array.isArray(p)) p.forEach(x => x && allPos.add(String(x).trim()));
          else if (typeof p === 'string' && p.trim()) allPos.add(p.trim());

          if (e.level && typeof e.level === 'string' && e.level.trim()) allLevels.add(e.level.trim());
          const src = e._source || (e._custom ? 'custom' : '');
          if (src) allSources.add(src);
          if (Array.isArray(e._sources)) e._sources.forEach(s => s && allSources.add(s));
        });

        if (allPos.size > 0) {
          posEl.textContent = Array.from(allPos).join(' / ');
          posEl.style.display = '';
        } else {
          posEl.style.display = 'none';
        }

        if (allLevels.size > 0) {
          levelEl.textContent = Array.from(allLevels).join(', ');
          levelEl.style.display = '';
        } else {
          levelEl.style.display = 'none';
        }

        if (allSources.size > 0) {
          sourceEl.textContent = Array.from(allSources).join(', ');
          sourceEl.style.display = '';
        } else {
          sourceEl.style.display = 'none';
        }

        if (countPill) {
          if (matches.length > 1) {
            countPill.textContent = `${matches.length} entries`;
            countPill.style.display = '';
          } else {
            countPill.style.display = 'none';
          }
        }

        const conSafeClipboardCopy = async (text, toastMsg) => {
          if (!text) return false;
          let ok = false;
          if (typeof Desktop !== 'undefined' && typeof Desktop.clipboardWriteText === 'function') {
            try {
              await Desktop.clipboardWriteText(text);
              ok = true;
            } catch (_) {}
          }
          if (!ok && window.electronApi && typeof window.electronApi.clipboardWriteText === 'function') {
            try {
              await window.electronApi.clipboardWriteText(text);
              ok = true;
            } catch (_) {}
          }
          if (!ok && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            try {
              await navigator.clipboard.writeText(text);
              ok = true;
            } catch (_) {}
          }
          if (!ok) {
            try {
              const tmp = document.createElement('textarea');
              tmp.value = text;
              tmp.style.position = 'fixed';
              tmp.style.opacity = '0';
              tmp.style.pointerEvents = 'none';
              document.body.appendChild(tmp);
              tmp.focus();
              tmp.select();
              ok = document.execCommand('copy');
              tmp.remove();
            } catch (_) {}
          }
          if (ok && toastMsg && typeof mdbToast === 'function') {
            mdbToast(toastMsg);
          }
          return ok;
        };

        // 2. Exhaustive "All Forms in Databases" Section
        const allFormsSec = document.getElementById('con-ncp-all-forms-section');
        const formsCountPill = document.getElementById('con-ncp-forms-count');
        const formsWrap = document.getElementById('con-ncp-forms-wrap');

        const formsSet = new Set();
        const rawNode = conNormalizeWordForLookup(nodeWord);

        if (nodeWord) formsSet.add(nodeWord);
        matches.forEach(m => {
          const e = m.entry;
          if (!e) return;
          if (e.word) formsSet.add(e.word.trim());
          const fList = e.otherForms || e.otherTerms;
          if (Array.isArray(fList)) {
            fList.forEach(f => {
              if (!f) return;
              const s = typeof f === 'string' ? f : (f.word || f.form || f.term || '');
              if (s && s.trim()) formsSet.add(s.trim());
            });
          } else if (typeof fList === 'string' && fList.trim()) {
            fList.split(/[,;/]+/).forEach(s => {
              if (s && s.trim()) formsSet.add(s.trim());
            });
          }
        });

        const formsArr = Array.from(formsSet);
        if (formsArr.length > 0 && formsWrap && allFormsSec) {
          formsWrap.innerHTML = '';
          if (formsCountPill) formsCountPill.textContent = String(formsArr.length);
          formsArr.forEach(form => {
            const chip = document.createElement('span');
            chip.className = 'con-ncp-form-chip';
            if (conNormalizeWordForLookup(form) === rawNode) {
              chip.classList.add('current-word');
            }
            chip.textContent = form;
            chip.title = `Click to copy "${form}". Alt-click to add as connected node on board.`;
            chip.onclick = (e) => {
              e.stopPropagation();
              if (e.altKey && typeof conAddWordAt === 'function') {
                const nx = Math.min(window.innerWidth - 120, (node.x || 200) + 140);
                const ny = (node.y || 200);
                const newId = conAddWordAt(form, nx, ny);
                if (newId && typeof conAddEdge === 'function') {
                  conAddEdge(node.id, newId);
                }
                if (typeof mdbToast === 'function') mdbToast(` Added connected node "${form}"`);
              } else {
                conSafeClipboardCopy(form, `Copied form: "${form}"`);
              }
            };
            formsWrap.appendChild(chip);
          });
          allFormsSec.style.display = '';
        } else if (allFormsSec) {
          allFormsSec.style.display = 'none';
        }

        // 3. Multi-Entry / Multi-Sense Container
        const entriesContainer = document.getElementById('con-ncp-entries-container');
        if (entriesContainer) {
          entriesContainer.innerHTML = '';
          matches.forEach((m, idx) => {
            const e = m.entry;
            if (!e) return;
            const card = document.createElement('div');
            card.className = 'con-ncp-entry-card';

            // Header
            const header = document.createElement('div');
            header.className = 'con-ncp-entry-header';

            const titleWrap = document.createElement('div');
            titleWrap.style.display = 'inline-flex';
            titleWrap.style.alignItems = 'center';
            titleWrap.style.gap = '4px';

            const title = document.createElement('span');
            title.className = 'con-ncp-entry-title con-ncp-copyable';
            title.textContent = e.word || 'Entry';
            title.title = 'Click to copy word';
            title.onclick = (ev) => {
              ev.stopPropagation();
              conSafeClipboardCopy(e.word, `Copied: "${e.word}"`);
            };
            titleWrap.appendChild(title);

            if (m.matchType === 'inflection') {
              const inflPill = document.createElement('span');
              inflPill.className = 'con-ncp-count-pill';
              inflPill.textContent = `form of ${e.word}`;
              titleWrap.appendChild(inflPill);
            }
            header.appendChild(titleWrap);

            // Badges
            const badgesWrap = document.createElement('div');
            badgesWrap.className = 'con-ncp-entry-badges';

            const pos = e.partOfSpeech || e.pos;
            if (pos) {
              const posBadge = document.createElement('span');
              posBadge.className = 'con-ncp-badge con-ncp-pos';
              posBadge.textContent = Array.isArray(pos) ? pos.join(', ') : String(pos);
              badgesWrap.appendChild(posBadge);
            }

            if (e.level) {
              const lvlBadge = document.createElement('span');
              lvlBadge.className = 'con-ncp-badge con-ncp-level';
              lvlBadge.textContent = String(e.level);
              badgesWrap.appendChild(lvlBadge);
            }

            const src = e._source || (Array.isArray(e._sources) ? e._sources[0] : '');
            if (src) {
              const srcBadge = document.createElement('span');
              srcBadge.className = 'con-ncp-badge con-ncp-source';
              srcBadge.textContent = src;
              badgesWrap.appendChild(srcBadge);
            }

            if (e.ipa) {
              const ipaBadge = document.createElement('span');
              ipaBadge.className = 'con-ncp-badge con-ncp-copyable';
              ipaBadge.style.background = '#f1f5f9';
              ipaBadge.style.color = '#334155';
              ipaBadge.textContent = `/${e.ipa}/`;
              ipaBadge.title = 'Click to copy IPA';
              ipaBadge.onclick = (ev) => {
                ev.stopPropagation();
                conSafeClipboardCopy(String(e.ipa), `Copied IPA: "/${e.ipa}/"`);
              };
              badgesWrap.appendChild(ipaBadge);
            }

            header.appendChild(badgesWrap);
            card.appendChild(header);

            // Translation / French
            const fr = e.french || e.translation;
            if (fr) {
              const frStr = Array.isArray(fr) ? fr.filter(Boolean).join(', ') : String(fr).trim();
              if (frStr) {
                const frRow = document.createElement('div');
                frRow.className = 'con-ncp-entry-row';
                frRow.innerHTML = `<span class="con-ncp-entry-label">FR</span><span class="con-ncp-copyable" title="Click to copy">${frStr}</span>`;
                frRow.querySelector('.con-ncp-copyable').onclick = (ev) => {
                  ev.stopPropagation();
                  conSafeClipboardCopy(frStr, `Copied translation: "${frStr}"`);
                };
                card.appendChild(frRow);
              }
            }

            // Definitions List
            const rawDefs = e.definition != null ? e.definition : e.def;
            const defs = Array.isArray(rawDefs)
              ? rawDefs.map(String).map(s => s.trim()).filter(Boolean)
              : (rawDefs ? String(rawDefs).split(/\n+/).map(s => s.trim()).filter(Boolean) : []);

            if (defs.length > 0) {
              const ol = document.createElement('ol');
              ol.className = 'con-ncp-def-list';
              defs.forEach((d, dIdx) => {
                const li = document.createElement('li');
                li.className = 'con-ncp-copyable';
                li.textContent = d;
                li.title = 'Click to copy this definition';
                li.onclick = (ev) => {
                  ev.stopPropagation();
                  conSafeClipboardCopy(d, `Copied definition ${dIdx + 1}`);
                };
                ol.appendChild(li);
              });
              card.appendChild(ol);
            }

            // Examples
            const rawEx = e.exampleSentence || e.example;
            const exList = Array.isArray(rawEx)
              ? rawEx.map(String).map(s => s.trim()).filter(Boolean)
              : (rawEx ? [String(rawEx).trim()].filter(Boolean) : []);

            exList.forEach(ex => {
              const exEl = document.createElement('div');
              exEl.className = 'con-ncp-entry-ex con-ncp-copyable';
              exEl.textContent = `“${ex}”`;
              exEl.title = 'Click to copy example';
              exEl.onclick = (ev) => {
                ev.stopPropagation();
                conSafeClipboardCopy(ex, `Copied example`);
              };
              card.appendChild(exEl);
            });

            // Synonyms & Antonyms
            const syns = Array.isArray(e.synonyms) ? e.synonyms.filter(Boolean) : (e.synonyms ? String(e.synonyms).split(/[,;/]+/).map(s => s.trim()).filter(Boolean) : []);
            if (syns.length > 0) {
              const synRow = document.createElement('div');
              synRow.className = 'con-ncp-entry-row';
              const synStr = syns.join(', ');
              synRow.innerHTML = `<span class="con-ncp-entry-label">SYN</span><span class="con-ncp-copyable" title="Click to copy">${synStr}</span>`;
              synRow.querySelector('.con-ncp-copyable').onclick = (ev) => {
                ev.stopPropagation();
                conSafeClipboardCopy(synStr, `Copied synonyms`);
              };
              card.appendChild(synRow);
            }

            const ants = Array.isArray(e.antonyms) ? e.antonyms.filter(Boolean) : (e.antonyms ? String(e.antonyms).split(/[,;/]+/).map(s => s.trim()).filter(Boolean) : []);
            if (ants.length > 0) {
              const antRow = document.createElement('div');
              antRow.className = 'con-ncp-entry-row';
              const antStr = ants.join(', ');
              antRow.innerHTML = `<span class="con-ncp-entry-label">ANT</span><span class="con-ncp-copyable" title="Click to copy">${antStr}</span>`;
              antRow.querySelector('.con-ncp-copyable').onclick = (ev) => {
                ev.stopPropagation();
                conSafeClipboardCopy(antStr, `Copied antonyms`);
              };
              card.appendChild(antRow);
            }

            const etyStr = Array.isArray(e.etymology) ? e.etymology.filter(Boolean).join(' ') : String(e.etymology || '').trim();
            if (etyStr) {
              const etyRow = document.createElement('div');
              etyRow.className = 'con-ncp-entry-row';
              const etyLabel = document.createElement('span');
              etyLabel.className = 'con-ncp-entry-label';
              etyLabel.textContent = 'ETY';
              const etyVal = document.createElement('span');
              etyVal.className = 'con-ncp-copyable';
              etyVal.title = 'Click to copy';
              etyVal.textContent = etyStr;
              etyVal.onclick = (ev) => {
                ev.stopPropagation();
                conSafeClipboardCopy(etyStr, 'Copied etymology');
              };
              etyRow.appendChild(etyLabel);
              etyRow.appendChild(etyVal);
              card.appendChild(etyRow);
            }

            entriesContainer.appendChild(card);
          });
        }

        // 4. Populate legacy fallback elements (hidden, for backwards compatibility)
        const d0 = matches[0].entry;
        const formatArr = (val) => {
          if (!val) return '';
          if (Array.isArray(val)) return val.filter(Boolean).map(v => typeof v === 'string' ? v : (v.word || v.form || v.term || JSON.stringify(v))).join(', ');
          return String(val).trim();
        };
        const bindLegacy = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = formatArr(val);
        };
        bindLegacy('con-ncp-ipa', d0.ipa);
        bindLegacy('con-ncp-fr', d0.french || d0.translation);
        bindLegacy('con-ncp-def', d0.definition || d0.def);
        bindLegacy('con-ncp-syn', d0.synonyms);
        bindLegacy('con-ncp-ant', d0.antonyms);
        bindLegacy('con-ncp-forms', d0.otherForms || d0.otherTerms);
        bindLegacy('con-ncp-ex', d0.exampleSentence || d0.example);
        bindLegacy('con-ncp-ety', d0.etymology);

        // Hide legacy rows since rich cards are rendered above
        ['ipa', 'fr', 'def', 'syn', 'ant', 'forms', 'ex', 'ety'].forEach(k => {
          const row = document.getElementById(`con-ncp-${k}-row`);
          if (row) row.style.display = 'none';
        });

        // 5. Position popup safely
        popup.style.display = 'flex';
        popup.classList.add('visible');

        let targetX = x;
        let targetY = y;
        if (targetX == null || targetY == null) {
          const rect = node.el ? node.el.getBoundingClientRect() : { right: 200, top: 200, left: 100 };
          targetX = rect.right + 10;
          targetY = rect.top;
        }

        const popRect = popup.getBoundingClientRect();
        const maxX = window.innerWidth - popRect.width - 12;
        const maxY = window.innerHeight - popRect.height - 12;

        if (targetX > maxX) {
          const rect = node.el ? node.el.getBoundingClientRect() : { left: targetX };
          targetX = Math.max(12, rect.left - popRect.width - 10);
        }
        if (targetX > maxX) targetX = maxX;
        if (targetX < 12) targetX = 12;

        if (targetY > maxY) targetY = maxY;
        if (targetY < 12) targetY = 12;

        popup.style.left = `${Math.round(targetX)}px`;
        popup.style.top = `${Math.round(targetY)}px`;
      }

      window.conCloseNodeWordCard = conCloseNodeWordCard;
      window.conOpenNodeWordCard = conOpenNodeWordCard;

      window.conNodeCardCopyAll = function() {
        const matches = _conActiveWordCardMatches && _conActiveWordCardMatches.length
          ? _conActiveWordCardMatches
          : (_conActiveWordCardDbEntry ? [{ entry: _conActiveWordCardDbEntry, matchType: 'direct' }] : []);
        if (!matches.length) return;

        const mainWord = (matches[0].entry && matches[0].entry.word) || 'Word';

        // Gather all forms
        const formsSet = new Set();
        matches.forEach(m => {
          const e = m.entry;
          if (!e) return;
          if (e.word) formsSet.add(e.word);
          const fList = e.otherForms || e.otherTerms;
          if (Array.isArray(fList)) fList.forEach(f => f && formsSet.add(typeof f === 'string' ? f : (f.word || f.form || '')));
          else if (typeof fList === 'string') fList.split(/[,;/]+/).forEach(s => s && formsSet.add(s.trim()));
        });

        const blocks = [];
        blocks.push(`Word: ${mainWord}`);
        if (formsSet.size > 0) {
          blocks.push(`All Forms: ${Array.from(formsSet).join(', ')}`);
        }

        matches.forEach((m, idx) => {
          const e = m.entry;
          if (!e) return;
          const pos = e.partOfSpeech || e.pos;
          const posStr = Array.isArray(pos) ? pos.join(', ') : (pos ? String(pos) : '');
          const src = e._source || (Array.isArray(e._sources) ? e._sources.join(', ') : '');
          const ipaStr = e.ipa ? ` /${e.ipa}/` : '';
          const headerLine = `\n--- Entry ${idx + 1}: ${e.word}${posStr ? ` (${posStr})` : ''}${ipaStr}${src ? ` [${src}]` : ''} ---`;
          blocks.push(headerLine);

          const fr = e.french || e.translation;
          if (fr) {
            blocks.push(`FR: ${Array.isArray(fr) ? fr.join(', ') : fr}`);
          }

          const rawDefs = e.definition != null ? e.definition : e.def;
          const defs = Array.isArray(rawDefs) ? rawDefs : (rawDefs ? String(rawDefs).split(/\n+/) : []);
          if (defs.length) {
            blocks.push('Definitions:');
            defs.forEach((d, dIdx) => blocks.push(` ${dIdx + 1}. ${String(d).trim()}`));
          }

          const ex = e.exampleSentence || e.example;
          if (ex) {
            const exList = Array.isArray(ex) ? ex : [ex];
            exList.forEach(x => blocks.push(` Example: “${x}”`));
          }

          if (e.synonyms && e.synonyms.length) {
            blocks.push(`Synonyms: ${Array.isArray(e.synonyms) ? e.synonyms.join(', ') : e.synonyms}`);
          }
          if (e.antonyms && e.antonyms.length) {
            blocks.push(`Antonyms: ${Array.isArray(e.antonyms) ? e.antonyms.join(', ') : e.antonyms}`);
          }
          if (e.etymology && String(e.etymology).trim()) {
            blocks.push(`Etymology: ${Array.isArray(e.etymology) ? e.etymology.join(' ') : String(e.etymology).trim()}`);
          }
        });

        const fullText = blocks.join('\n');
        if (typeof Desktop !== 'undefined' && typeof Desktop.clipboardWriteText === 'function') {
          Desktop.clipboardWriteText(fullText).catch(() => {});
        } else if (window.electronApi && typeof window.electronApi.clipboardWriteText === 'function') {
          window.electronApi.clipboardWriteText(fullText).catch(() => {});
        } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(fullText).catch(() => {});
        }
        if (typeof mdbToast === 'function') mdbToast(` Copied all database info for "${mainWord}"`);
      };

      window.conNodeCardEditInDbManager = async function() {
        if (!_conActiveWordCardDbEntry) return;
        const word = _conActiveWordCardDbEntry.word;
        conCloseNodeWordCard();
        if (typeof Desktop !== 'undefined' && typeof Desktop.openTool === 'function') {
          try {
            await Desktop.openTool('manage-database.html', { query: { type: 'wordbanks', word: word } });
            return;
          } catch (e) {
            console.warn('[conNodeCardEditInDbManager] Desktop.openTool error:', e);
          }
        }
        window.open(`manage-database.html?type=wordbanks&word=${encodeURIComponent(word)}`, '_blank');
      };

      window.conViewSelectedCard = function () {
        const id = conCtxNodeId || conSelected;
        if (!id) return;
        conOpenNodeWordCard(id);
      };

      window.conAddSelectedToDb = function () {
        const id = conCtxNodeId || conSelected;
        if (!id) return;
        const node = conNodes.find(n => n.id === id);
        if (!node) return;
        const word = (node.baseWord || node.el.textContent.trim()).trim();
        if (!word) return;
        const existing = conGetNodeDbEntry(node) || conFindDbEntry(word);
        cwdbOpen(word, existing || null);
        if (!existing && (node.aiDef || node.aiPos)) {
          const defEl = document.getElementById('cwdb-definition');
          const posEl = document.getElementById('cwdb-pos');
          if (defEl && !defEl.value && node.aiDef) defEl.value = node.aiDef;
          if (posEl && !posEl.value && node.aiPos) posEl.value = String(node.aiPos).toLowerCase();
        }
      };

      // ================================================================
      // CONSTELLATION → WORD DB QUICK-ADD / EDIT MODAL (cwdb*)
      // ================================================================
      let _cwdbEditWord = null; // lowercase key of the word currently in modal

      function cwdbOpen(word, existingEntry) {
        _cwdbEditWord = word ? word.toLowerCase() : null;

        const badge = document.getElementById('cwdb-word-badge');
        const title = document.getElementById('cwdb-title');
        const note = document.getElementById('cwdb-existing-note');
        const fb = document.getElementById('cwdb-feedback');

        badge.textContent = word;
        fb.textContent = ''; fb.className = '';

        if (existingEntry && existingEntry._custom) {
          title.textContent = ' Edit in DB';
          note.textContent = `"${existingEntry.word}" is already a custom entry — editing will update it.`;
          note.className = 'show';
        } else if (existingEntry) {
          title.textContent = ' Edit in DB';
          note.textContent = `"${existingEntry.word}" already exists in the database — saving creates a custom override.`;
          note.className = 'show';
        } else {
          title.textContent = '➕ Add to DB';
          note.textContent = ''; note.className = '';
        }

        // Fill form fields from existing entry (if any)
        const fill = existingEntry || {};
        document.getElementById('cwdb-ipa').value = fill.ipa || '';
        document.getElementById('cwdb-french').value = fill.french || '';
        const posRaw = Array.isArray(fill.partOfSpeech) ? fill.partOfSpeech[0] : (fill.partOfSpeech || '');
        document.getElementById('cwdb-pos').value = posRaw.toLowerCase();
        document.getElementById('cwdb-level').value = (fill.level || '').toUpperCase();
        const themes = (existingEntry && typeof getItemThemes === 'function') ? getItemThemes(existingEntry).join(', ') : '';
        document.getElementById('cwdb-theme').value = themes;
        document.getElementById('cwdb-definition').value = Array.isArray(fill.definition) ? fill.definition.join('\n') : fill.definition || '';
        document.getElementById('cwdb-example').value = fill.exampleSentence || '';
        const cwdbEtyEl = document.getElementById('cwdb-etymology');
        if (cwdbEtyEl) cwdbEtyEl.value = Array.isArray(fill.etymology) ? fill.etymology.join(' ') : (fill.etymology || '');
        document.getElementById('cwdb-synonyms').value = (fill.synonyms || []).join(', ');
        document.getElementById('cwdb-antonyms').value = (fill.antonyms || []).join(', ');

        // Populate theme datalist from vocabBank
        try {
          const allThemes = [...new Set(vocabBank.flatMap(w => typeof getItemThemes === 'function' ? getItemThemes(w) : []))].sort();
          document.getElementById('cwdb-theme-list').innerHTML = allThemes.map(t => `<option value="${t}">`).join('');
        } catch (e) { }

        // Show Electron save buttons; hide non-Electron save button
        const isElec = !!(window.Desktop && Desktop.isElectron());
        const saveMemBtn = document.getElementById('cwdb-save-memory-btn');
        if (saveMemBtn) saveMemBtn.style.display = isElec ? 'none' : '';
        const exportBtn = document.getElementById('cwdb-save-export-btn');
        if (exportBtn) {
          exportBtn.style.display = isElec ? '' : 'none';
          exportBtn.textContent = existingEntry ? ' Update in Main DB' : ' Save to Main DB';
        }
        const customBtn = document.getElementById('cwdb-save-custom-btn');
        if (customBtn) {
          customBtn.style.display = isElec ? '' : 'none';
          customBtn.textContent = existingEntry ? ' Update in Custom DB' : ' Save to Custom DB';
        }

        // Delete only makes sense for existing words
        const deleteBtn = document.getElementById('cwdb-delete-btn');
        if (deleteBtn) {
          deleteBtn.style.display = '';
          deleteBtn.disabled = !existingEntry;
        }
        document.getElementById('cwdb-overlay').classList.add('active');
        setTimeout(() => { const el = document.getElementById('cwdb-ipa'); if (el) el.focus(); }, 80);
      }

      function cwdbClose() {
        document.getElementById('cwdb-overlay').classList.remove('active');
        _cwdbEditWord = null;
      }

      async function pickCustomDbFile() {
        return new Promise(async (resolve) => {
          let existingFiles = [];
          if (window.Desktop && Desktop.isElectron() && typeof Desktop.listFiles === 'function') {
            try {
              const r = await Desktop.listFiles('customWordbanks', { extensions: ['.js'] });
              if (r && r.ok && Array.isArray(r.files)) {
                existingFiles = r.files.map(f => f.filename).sort();
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
            `<label class="cdbp-file-item"><input type="radio" name="cdbp-file" value="${esc(fn)}"><span> ${esc(fn)}</span></label>`
          ).join('') +
            `<label class="cdbp-file-item cdbp-new-item"><input type="radio" name="cdbp-file" value="__new__"><span> New file…</span></label>`;

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
              if (!name) { newErr.textContent = ' Please enter a file name.'; newInput.focus(); return; }
              if (!/^[\w\- .]+$/.test(name)) { newErr.textContent = ' Only letters, numbers, spaces, hyphens, dots allowed.'; newInput.focus(); return; }
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

      // ── Board → Wordbank DB Export ──────────────────────────────────────────
      let _conDbExportWords = [];

      function conDbExportOpen() {
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
        conDbExportRefresh();
        document.getElementById('con-db-export-overlay').classList.add('active');
      }

      function conDbExportRefresh() {
        const srcNodes = document.getElementById('con-db-src-nodes').checked;
        const srcNotes = document.getElementById('con-db-src-notes').checked;
        const wordMap = new Map();

        conPageSnapshots.forEach((snap, pageIdx) => {
          const pg = pageIdx + 1;

          if (srcNodes) {
            (snap.nodes || []).forEach(n => {
              const w = (n.baseWord || '').trim();
              if (!w) return;
              const k = w.toLowerCase();
              if (!wordMap.has(k)) wordMap.set(k, { word: w, srcs: new Set(), pages: new Set(), bookPgs: new Set() });
              const e = wordMap.get(k);
              e.srcs.add('node');
              e.pages.add(pg);
              if (n.pageNum != null) e.bookPgs.add(n.pageNum);
            });
          }

          if (srcNotes) {
            (snap.notes || []).forEach(n => {
              const raw = (n.text || '') + ' ' + (n.html || '').replace(/<[^>]+>/g, ' ');
              const tokens = raw.match(/\b[a-zA-ZÀ-ÿ]{3,}\b/g) || [];
              tokens.forEach(tok => {
                const k = tok.toLowerCase();
                if (!wordMap.has(k)) wordMap.set(k, { word: tok, srcs: new Set(), pages: new Set(), bookPgs: new Set() });
                const e = wordMap.get(k);
                e.srcs.add('note');
                e.pages.add(pg);
              });
            });
          }
        });

        _conDbExportWords = [...wordMap.values()].sort((a, b) =>
          a.word.toLowerCase().localeCompare(b.word.toLowerCase())
        );
        _conDbExportRenderTable();
      }

      function _conDbExportRenderTable() {
        const tbody = document.getElementById('con-db-export-tbody');
        const countEl = document.getElementById('con-db-export-count');
        const multiPg = conPageSnapshots.length > 1;

        countEl.textContent = `${_conDbExportWords.length} word${_conDbExportWords.length !== 1 ? 's' : ''}`;

        // Show/hide page column header
        const pgTh = document.getElementById('con-db-export-pg-th');
        if (pgTh) pgTh.style.display = multiPg ? '' : 'none';

        if (!_conDbExportWords.length) {
          tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px 10px;color:#aaa;font-style:italic;">No words found — enable a source above.</td></tr>`;
          return;
        }

        const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        tbody.innerHTML = _conDbExportWords.map((entry, i) => {
          const inDb = Array.isArray(window.vocabBank) &&
            vocabBank.some(v => v.word && v.word.toLowerCase() === entry.word.toLowerCase());

          const srcBadges = [...entry.srcs].map(s =>
            `<span class="cde-src-badge cde-src-${s}">${s === 'node' ? '⬡' : ''} ${s}</span>`
          ).join(' ');

          const pgTxt = [...entry.pages].sort((a, b) => a - b).join(', ');
          const bookPgTxt = entry.bookPgs.size > 0
            ? ` <small class="cde-bookpg">p.${[...entry.bookPgs].sort((a, b) => a - b).join(',')}</small>` : '';

          return `<tr class="cde-row">
            <td class="cde-cell-word">${esc(entry.word)}${bookPgTxt}</td>
            <td class="cde-cell-src">${srcBadges}</td>
            <td class="cde-cell-pg" style="${multiPg ? '' : 'display:none'}">${pgTxt}</td>
            <td class="cde-cell-indb">${inDb ? '<span class="cde-indb-yes" title="Already in word bank"></span>' : ''}</td>
            <td class="cde-cell-check"><label style="cursor:pointer;"><input type="checkbox" class="cde-cb" data-idx="${i}" checked></label></td>
          </tr>`;
        }).join('');
      }

      function conDbExportSelectAll(checked) {
        document.querySelectorAll('.cde-cb').forEach(cb => { cb.checked = checked; });
      }

      function conDbExportClose() {
        document.getElementById('con-db-export-overlay').classList.remove('active');
      }

      async function conDbExportSave() {
        if (!window.Desktop || !Desktop.isElectron()) return;

        const selected = [...document.querySelectorAll('.cde-cb:checked')]
          .map(cb => _conDbExportWords[parseInt(cb.dataset.idx)])
          .filter(Boolean);

        if (!selected.length) { mdbToast(' No words selected.'); return; }

        const keyword = (document.getElementById('con-db-export-keyword').value || '').trim();

        const filename = await pickCustomDbFile();
        if (!filename) return;

        // Read existing file entries
        let entries = [];
        try {
          const res = await Desktop.readText('customWordbanks', filename);
          if (res && res.ok && res.content) {
            const s = res.content.indexOf('['), e2 = res.content.lastIndexOf(']');
            if (s !== -1 && e2 > s) { try { entries = JSON.parse(res.content.slice(s, e2 + 1)); } catch { } }
          }
        } catch { }

        // Build lookup by word (existing entries are not overwritten)
        const entryMap = new Map();
        entries.forEach(e => { if (e && e.word) entryMap.set(e.word.toLowerCase(), e); });

        function _applyKeyword(entry) {
          if (!keyword) return entry;
          const kws = Array.isArray(entry.keywords) ? [...entry.keywords] : (entry.keywords ? [entry.keywords] : []);
          if (!kws.includes(keyword)) kws.push(keyword);
          return { ...entry, keywords: kws };
        }

        let added = 0, skipped = 0;
        selected.forEach(item => {
          const k = item.word.toLowerCase();
          if (entryMap.has(k)) {
            // Word already in file — only add keyword if one was provided
            if (keyword) entryMap.set(k, _applyKeyword(entryMap.get(k)));
            skipped++;
            return;
          }

          // Use full vocabBank entry if word is known, otherwise minimal stub
          const dbEntry = Array.isArray(window.vocabBank)
            ? vocabBank.find(v => v.word && v.word.toLowerCase() === k)
            : null;

          if (dbEntry) {
            const clean = { ...dbEntry };
            delete clean._source;
            entryMap.set(k, _applyKeyword(clean));
          } else {
            entryMap.set(k, _applyKeyword({ word: item.word }));
          }
          added++;
        });

        const allEntries = [...entryMap.values()];
        const lines = allEntries.map(w => ' ' + JSON.stringify(w));
        const content = `// ${filename}\nconst customVocabBank = [\n${lines.join(',\n')}\n];\n`;

        try {
          await Desktop.saveText('customWordbanks', filename, content);
          const msg = ` ${added} word${added !== 1 ? 's' : ''} added to ${filename}` +
            (skipped > 0 ? ` (${skipped} already existed, kept unchanged)` : '');
          mdbToast(msg);
          conDbExportClose();
          try {
            if (typeof initCustomDatabases === 'function') {
              _customDbInitPromise = null;
              await initCustomDatabases();
              conNodes.forEach(n => {
                const match = conGetNodeDbEntry(n);
                if (match) {
                  n.dbWord = match.word;
                  n.el.classList.add('con-node-matched');
                  if (typeof conAddNodeStarBtn === 'function') conAddNodeStarBtn(n);
                  if (typeof conUpdateNodeStarVisual === 'function') conUpdateNodeStarVisual(n);
                }
              });
            }
          } catch (_) { }
        } catch (err) {
          mdbToast(' Save failed: ' + err);
        }
      }
      // ── end DB Export ────────────────────────────────────────────────────────


      async function cwdbSave(target) {
        if (!_cwdbEditWord) return;

        const themeRaw = document.getElementById('cwdb-theme').value.trim();
        const themeVal = themeRaw.includes(',')
          ? themeRaw.split(',').map(s => s.trim()).filter(Boolean)
          : (themeRaw || '');

        // Preserve original word casing if possible
        const existing = vocabBank.find(v => v.word.toLowerCase() === _cwdbEditWord);
        const wordDisplay = existing ? existing.word : (_cwdbEditWord.charAt(0).toUpperCase() + _cwdbEditWord.slice(1));

        const entry = {
          word: wordDisplay,
          ipa: document.getElementById('cwdb-ipa').value.trim(),
          partOfSpeech: document.getElementById('cwdb-pos').value || '',
          level: document.getElementById('cwdb-level').value || '',
          theme: themeVal,
          definition: (function () { const v = document.getElementById('cwdb-definition').value.trim(); const lines = v.split('\n').map(s => s.trim()).filter(Boolean); return lines.length > 1 ? lines : (lines[0] || ''); })(),
          french: document.getElementById('cwdb-french').value.trim(),
          exampleSentence: document.getElementById('cwdb-example').value.trim(),
          etymology: (document.getElementById('cwdb-etymology')?.value || '').trim(),
          synonyms: document.getElementById('cwdb-synonyms').value.split(',').map(s => s.trim()).filter(Boolean),
          antonyms: document.getElementById('cwdb-antonyms').value.split(',').map(s => s.trim()).filter(Boolean),
          otherForms: (existing && existing.otherForms) || [],
          _custom: true
        };

        // Register themes in vocabThemes index
        const newThemeArr = Array.isArray(themeVal) ? themeVal : (themeVal ? [themeVal] : []);
        if (typeof vocabThemes !== 'undefined' && newThemeArr.length) {
          vocabThemes.forEach(e => {
            for (const k of Object.keys(e)) {
              e[k] = e[k].filter(w => w.toLowerCase() !== _cwdbEditWord);
            }
          });
          newThemeArr.forEach(theme => {
            let found = false;
            vocabThemes.forEach(e => {
              if (Object.prototype.hasOwnProperty.call(e, theme)) {
                if (!e[theme].map(w => w.toLowerCase()).includes(_cwdbEditWord)) e[theme].push(wordDisplay);
                found = true;
              }
            });
            if (!found) vocabThemes.push({ [theme]: [wordDisplay] });
          });
          if (typeof invalidateThemeIndex === 'function') invalidateThemeIndex();
        }

        // Update vocabBank in memory
        const bi = vocabBank.findIndex(v => v.word.toLowerCase() === _cwdbEditWord);
        if (bi !== -1) { vocabBank[bi] = Object.assign({}, vocabBank[bi], entry); }
        else { vocabBank.push(entry); }

        // Persist to localStorage custom words
        try {
          const custom = awGetCustomWords();
          const ci = custom.findIndex(w => w.word.toLowerCase() === _cwdbEditWord);
          if (ci !== -1) { custom[ci] = entry; } else { custom.push(entry); }
          awSaveCustomWords(custom);
        } catch (e2) { }

        // Refresh theme menus if available
        if (typeof populateAllThemeMenus === 'function') populateAllThemeMenus();

        conNodes.forEach(n => {
          const match = conGetNodeDbEntry(n);
          if (match) {
            n.dbWord = match.word;
            n.el.classList.add('con-node-matched');
            conAddNodeStarBtn(n);
            conUpdateNodeStarVisual(n);
          }
        });

        if (target === 'main' && typeof awDownloadDB === 'function') {
          await awDownloadDB();
          cwdbFeedback(` "${wordDisplay}" saved — writing wordDb.js…`, 'ok');
          setTimeout(() => cwdbClose(), 1400);
        } else if (target === 'custom' && window.Desktop && Desktop.isElectron()) {
          const filename = await pickCustomDbFile();
          if (!filename) return;
          let entries = [];
          try {
            const result = await Desktop.readText('customWordbanks', filename);
            if (result && result.ok && result.content) {
              const s = result.content.indexOf('['), e = result.content.lastIndexOf(']');
              if (s !== -1 && e > s) { try { entries = JSON.parse(result.content.slice(s, e + 1)); } catch { } }
            }
          } catch (e3) { /* file doesn't exist yet — start fresh */ }
          try {
            const { _custom, ...stripped } = entry;
            const ci2 = entries.findIndex(w => w.word.toLowerCase() === _cwdbEditWord);
            if (ci2 !== -1) { entries[ci2] = stripped; } else { entries.push(stripped); }
            const lines = entries.map(w => ' ' + JSON.stringify(w));
            const content = `// ${filename}\nconst customVocabBank = [\n${lines.join(',\n')}\n];\n`;
            await Desktop.saveText('customWordbanks', filename, content);
            cwdbFeedback(` "${wordDisplay}" saved to ${filename}!`, 'ok');
            try {
              if (typeof initCustomDatabases === 'function') {
                _customDbInitPromise = null;
                await initCustomDatabases();
              }
            } catch (_) {}
          } catch (e3) {
            cwdbFeedback(' Failed to save to custom DB.', 'err');
            return;
          }
          setTimeout(() => cwdbClose(), 900);
        } else {
          cwdbFeedback(` "${wordDisplay}" saved!`, 'ok');
          setTimeout(() => cwdbClose(), 900);
        }
      }

      async function cwdbDelete() {
        if (!_cwdbEditWord) return;
        const existing = vocabBank.find(v => v.word && v.word.toLowerCase() === _cwdbEditWord);
        if (!existing) {
          cwdbFeedback(' Word is not in the database yet.', 'err');
          return;
        }
        const label = existing.word || _cwdbEditWord;
        if (!await showConfirm(`Permanently delete "${label}"?`)) return;

        // Remove from vocabBank
        const vi = vocabBank.findIndex(v => v.word && v.word.toLowerCase() === _cwdbEditWord);
        if (vi !== -1) vocabBank.splice(vi, 1);

        conNodes.forEach(n => {
          const match = conGetNodeDbEntry(n);
          if (!match) {
            n.dbWord = null;
            n.el.classList.remove('con-node-matched');
            const star = n.el.querySelector('.con-node-star-btn');
            if (star) star.remove();
          }
        });

        // Remove from custom localStorage list if present
        try {
          const custom = awGetCustomWords();
          const ci = custom.findIndex(w => w.word && w.word.toLowerCase() === _cwdbEditWord);
          if (ci !== -1) {
            custom.splice(ci, 1);
            awSaveCustomWords(custom);
          }
        } catch (e2) { }

        // Remove from theme index
        if (typeof vocabThemes !== 'undefined') {
          vocabThemes.forEach(entry => {
            for (const k of Object.keys(entry)) {
              entry[k] = entry[k].filter(w => w.toLowerCase() !== _cwdbEditWord);
            }
          });
          if (typeof invalidateThemeIndex === 'function') invalidateThemeIndex();
        }
        if (typeof populateAllThemeMenus === 'function') populateAllThemeMenus();

        cwdbFeedback(` "${label}" deleted.`, 'ok');
        setTimeout(() => cwdbClose(), 700);
      }

      function cwdbFeedback(msg, type) {
        const el = document.getElementById('cwdb-feedback');
        if (!el) return;
        el.textContent = msg; el.className = type;
      }

      // Expose handlers for inline HTML onclick attributes (modal is outside this IIFE scope)
      window.cwdbClose = cwdbClose;
      window.cwdbSave = cwdbSave;
      window.cwdbDelete = cwdbDelete;
      window.pickCustomDbFile = pickCustomDbFile;
      window.conDbExportOpen = conDbExportOpen;
      window.conDbExportRefresh = conDbExportRefresh;
      window.conDbExportSelectAll = conDbExportSelectAll;
      window.conDbExportClose = conDbExportClose;
      window.conDbExportSave = conDbExportSave;
      // ================================================================
      // END CONSTELLATION → WORD DB MODAL
      // ================================================================

      // ================================================================
      // SHARED BOARD ANIMATIONS (15 Effects — Nodes, Notes, Groups)
      // ================================================================
      const CON_ANIMATIONS = [
        { key: 'pulse', i18nKey: 'conAnimPulse', label: 'Pulse Glow' },
        { key: 'blink', i18nKey: 'conAnimBlink', label: 'Attention Blink' },
        { key: 'float', i18nKey: 'conAnimFloat', label: 'Gentle Float' },
        { key: 'heartbeat', i18nKey: 'conAnimHeartbeat', label: 'Heartbeat' },
        { key: 'wiggle', i18nKey: 'conAnimWiggle', label: 'Wiggle' },
        { key: 'bounce', i18nKey: 'conAnimBounce', label: 'Bounce' },
        { key: 'ripple', i18nKey: 'conAnimRipple', label: 'Beacon Ripple' },
        { key: 'spotlight', i18nKey: 'conAnimSpotlight', label: 'Spotlight Aura' },
        { key: 'shimmer', i18nKey: 'conAnimShimmer', label: 'Shimmer Sheen' },
        { key: 'tada', i18nKey: 'conAnimTada', label: 'Tada Callout' },
        { key: 'invert', i18nKey: 'conAnimInvert', label: 'Inverse Colours' },
        { key: 'orbit', i18nKey: 'conAnimOrbit', label: 'Orbiting Point' },
        { key: 'elastic', i18nKey: 'conAnimElastic', label: 'Elastic Pop' },
        { key: 'pendulum', i18nKey: 'conAnimPendulum', label: 'Pendulum Tilt' },
        { key: 'hue_glow', i18nKey: 'conAnimHueGlow', label: 'Spectrum Glow' }
      ];
      window.CON_ANIMATIONS = global.CON_ANIMATIONS = CON_ANIMATIONS;

      function _conHexToRgbStr(hex, fallback) {
        const m = String(hex || '').trim().match(/^#?([0-9a-fA-F]{6})$/);
        if (!m) return fallback || '239, 68, 68';
        const n = parseInt(m[1], 16);
        return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
      }

      function _conGetBoardAnimCfg() {
        const bc = (typeof window !== 'undefined' && window.BOARD_CONFIG)
          ? window.BOARD_CONFIG
          : ((typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : null);
        return (bc && bc.animation && typeof bc.animation === 'object') ? bc.animation : null;
      }

      function conGetDefaultAnim(entityType) {
        const cfg = _conGetBoardAnimCfg();
        if (entityType && cfg && cfg.perType && typeof cfg.perType === 'object') {
          const entry = cfg.perType[String(entityType)];
          if (entry && entry.defaultEffect) return String(entry.defaultEffect);
        }
        return (cfg && cfg.defaultEffect) ? String(cfg.defaultEffect) : 'pulse';
      }
      window.conGetDefaultAnim = global.conGetDefaultAnim = conGetDefaultAnim;

      function conGetDefaultRevealAnim(entityType) {
        const cfg = _conGetBoardAnimCfg();
        if (entityType && cfg && cfg.perType && typeof cfg.perType === 'object') {
          const entry = cfg.perType[String(entityType)];
          if (entry && entry.revealEffect !== undefined && entry.revealEffect !== null && String(entry.revealEffect) !== '') {
            return String(entry.revealEffect);
          }
        }
        if (cfg && cfg.revealEffect !== undefined && cfg.revealEffect !== null && String(cfg.revealEffect) !== '') {
          return String(cfg.revealEffect);
        }
        return 'blink';
      }
      window.conGetDefaultRevealAnim = global.conGetDefaultRevealAnim = conGetDefaultRevealAnim;

      function conGetDefaultRevealDurationMs() {
        const cfg = _conGetBoardAnimCfg();
        const sec = (cfg && Number(cfg.revealDurationSec)) ? Number(cfg.revealDurationSec)
          : ((cfg && Number(cfg.doubleClickDurationSec)) ? Number(cfg.doubleClickDurationSec) : 3.0);
        return Math.max(250, sec * 1000);
      }
      window.conGetDefaultRevealDurationMs = global.conGetDefaultRevealDurationMs = conGetDefaultRevealDurationMs;

      function conPopulateRevealAnimSelect(selectEl, currentVal) {
        if (!selectEl) return;
        const t = (typeof i18n !== 'undefined' && typeof i18n.t === 'function') ? i18n.t.bind(i18n) : (k, fb) => fb || k;
        const prev = currentVal !== undefined ? String(currentVal || '') : (selectEl.value || '');
        selectEl.innerHTML = '';
        const defOpt = document.createElement('option');
        defOpt.value = '';
        defOpt.textContent = t('conRevealAnimDefault', 'Reveal: Global Default');
        selectEl.appendChild(defOpt);
        const noneOpt = document.createElement('option');
        noneOpt.value = 'none';
        noneOpt.textContent = t('conAnimNone', 'No Animation');
        selectEl.appendChild(noneOpt);
        CON_ANIMATIONS.forEach(a => {
          const opt = document.createElement('option');
          opt.value = a.key;
          const translated = t(a.i18nKey);
          opt.textContent = (translated && translated !== a.i18nKey) ? translated : a.label;
          selectEl.appendChild(opt);
        });
        selectEl.value = prev;
      }
      window.conPopulateRevealAnimSelect = global.conPopulateRevealAnimSelect = conPopulateRevealAnimSelect;

      function conPlayRevealAnimation(entityType, entity, el, opts) {
        if (!el) return;
        const options = opts && typeof opts === 'object' ? opts : {};
        const rawOverride = options.animKey !== undefined ? String(options.animKey || '')
          : ((entity && entity.revealAnim) ? String(entity.revealAnim) : '');
        const resolved = rawOverride || conGetDefaultRevealAnim(entityType);
        if (!resolved || resolved === 'none') return;

        const totalMs = Math.max(250, Number(options.durationMs) || conGetDefaultRevealDurationMs());
        const entityId = entity && entity.id !== undefined ? String(entity.id) : (el.id || (el.dataset && el.dataset.id) || '');

        if (el._conRevealTimeout) {
          clearTimeout(el._conRevealTimeout);
          el._conRevealTimeout = null;
        }
        if (el._conBlinkTimeout) {
          clearTimeout(el._conBlinkTimeout);
          el._conBlinkTimeout = null;
        }
        el.classList.remove('con-attention-blink');
        el.style.removeProperty('--con-blink-delay');

        const persistentAnim = (entity && entity.anim) ? String(entity.anim) : ((entity && entity.blink) ? 'pulse' : '');
        const baseBorderColor = (options.borderColor)
          || (entity && (entity.border || entity.borderColor))
          || (el.style && el.style.borderColor)
          || '#111111';

        if (!options.fromMirror && window._conMirrorSend && entityId) {
          window._conMirrorSend({
            type: 'entity-reveal-anim',
            entityType: entityType || 'node',
            id: entityId,
            animKey: resolved,
            durationMs: totalMs,
            borderColor: baseBorderColor,
            useAnimClass: !!options.useAnimClass
          });
        }

        if (resolved === 'blink' && !options.useAnimClass) {
          el.style.setProperty('--con-node-border', baseBorderColor);
          el.style.setProperty('--con-blink-delay', '-' + (Math.floor(performance.now()) % 360) + 'ms');
          el.classList.add('con-attention-blink');
          el._conRevealTimeout = setTimeout(() => {
            el.classList.remove('con-attention-blink');
            el.style.removeProperty('--con-blink-delay');
            el._conRevealTimeout = null;
          }, totalMs);
        } else if (CON_ANIMATIONS.some(a => a.key === resolved)) {
          conApplyEntityAnimClass(el, resolved, false);
          el._conRevealTimeout = setTimeout(() => {
            conApplyEntityAnimClass(el, persistentAnim, false);
            el._conRevealTimeout = null;
          }, totalMs);
        }
      }
      window.conPlayRevealAnimation = global.conPlayRevealAnimation = conPlayRevealAnimation;

      function conApplyEntityAnimClass(el, animKey, legacyBlink) {
        if (!el || !el.classList) return;
        CON_ANIMATIONS.forEach(a => el.classList.remove('con-anim-' + a.key));
        const resolved = animKey ? String(animKey) : (legacyBlink ? 'pulse' : '');
        if (resolved && CON_ANIMATIONS.some(a => a.key === resolved)) {
          const animCfg = _conGetBoardAnimCfg();
          const dur = (animCfg && Number(animCfg.durationSec)) || 2.4;
          el.style.setProperty('--con-anim-delay', '-' + ((Date.now() / 1000) % dur).toFixed(3) + 's');
          el.classList.add('con-anim-' + resolved);
        } else {
          el.style.removeProperty('--con-anim-delay');
        }
      }
      window.conApplyEntityAnimClass = global.conApplyEntityAnimClass = conApplyEntityAnimClass;

      function conPopulateAnimSelect(selectEl, currentVal) {
        if (!selectEl) return;
        const t = (typeof i18n !== 'undefined' && typeof i18n.t === 'function') ? i18n.t.bind(i18n) : (k, fb) => fb || k;
        const prev = currentVal !== undefined ? String(currentVal || '') : (selectEl.value || '');
        selectEl.innerHTML = '';
        const noneOpt = document.createElement('option');
        noneOpt.value = '';
        noneOpt.textContent = t('conAnimNone', 'No Animation');
        selectEl.appendChild(noneOpt);
        CON_ANIMATIONS.forEach(a => {
          const opt = document.createElement('option');
          opt.value = a.key;
          const translated = t(a.i18nKey);
          opt.textContent = (translated && translated !== a.i18nKey) ? translated : a.label;
          selectEl.appendChild(opt);
        });
        selectEl.value = prev;
      }
      window.conPopulateAnimSelect = global.conPopulateAnimSelect = conPopulateAnimSelect;

      function conApplyBoardAnimationConfig(animCfg) {
        const cfg = animCfg && typeof animCfg === 'object' ? animCfg : {};
        const root = document.documentElement;
        if (root && root.style) {
          const color = /^#[0-9a-fA-F]{6}$/i.test(cfg.color || '') ? cfg.color : '#ef4444';
          const dur = Math.max(0.5, Math.min(8, Number(cfg.durationSec) || 2.4));
          const intensity = Math.max(0.3, Math.min(2, Number(cfg.intensity) || 1.0));
          root.style.setProperty('--con-anim-color', color);
          root.style.setProperty('--con-anim-color-rgb', _conHexToRgbStr(color, '239, 68, 68'));
          root.style.setProperty('--con-anim-duration', dur + 's');
          root.style.setProperty('--con-anim-intensity', String(intensity));

          const activeCfg = cfg.activeEffect && typeof cfg.activeEffect === 'object' ? cfg.activeEffect : {};
          const activeColor = /^#[0-9a-fA-F]{6}$/i.test(activeCfg.color || '') ? activeCfg.color : '#ff9800';
          const activeWidth = Math.max(1, Math.min(12, Number(activeCfg.width) || 4));
          const activeGlow = activeCfg.glow !== undefined ? Math.max(0, Math.min(2, Number(activeCfg.glow))) : 1.0;
          root.style.setProperty('--con-active-color', activeColor);
          root.style.setProperty('--con-active-color-rgb', _conHexToRgbStr(activeColor, '255, 152, 0'));
          root.style.setProperty('--con-active-width', activeWidth + 'px');
          root.style.setProperty('--con-active-glow', String(activeGlow));
        }

        if (document.body) {
          document.body.classList.toggle('con-anim-paused', !!cfg.paused);
          const activeCfg = cfg.activeEffect && typeof cfg.activeEffect === 'object' ? cfg.activeEffect : {};
          const scope = activeCfg.scope || 'mirror';
          const style = activeCfg.style || 'solid';
          document.body.classList.remove('con-active-scope-mirror', 'con-active-scope-canvas', 'con-active-scope-both');
          document.body.classList.add('con-active-scope-' + scope);
          document.body.classList.remove('con-active-style-solid', 'con-active-style-pulse', 'con-active-style-ripple', 'con-active-style-breath');
          document.body.classList.add('con-active-style-' + style);
        }
      }
      window.conApplyBoardAnimationConfig = global.conApplyBoardAnimationConfig = conApplyBoardAnimationConfig;

      function _conGetTargetNodeIdsForAnim() {
        const ids = new Set();
        if (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0) {
          conMultiSelected.forEach(id => ids.add(String(id)));
        }
        if (typeof conCtxNodeId !== 'undefined' && conCtxNodeId) {
          ids.add(String(conCtxNodeId));
        } else if (typeof conSelected !== 'undefined' && conSelected) {
          ids.add(String(conSelected));
        }
        return Array.from(ids);
      }

      function conCtxSetAnimation(animKey) {
        const resolved = String(animKey || '');
        const ids = _conGetTargetNodeIdsForAnim();
        ids.forEach(nid => {
          const n = conNodes.find(x => x && String(x.id) === nid);
          if (!n) return;
          n.anim = resolved;
          conApplyEntityAnimClass(n.el, n.anim, false);
          if (window._conMirrorSend) window._conMirrorSend({ type: 'node-anim', nodeId: String(n.id), anim: n.anim });
        });
        const btn = document.getElementById('con-ctx-blink-btn');
        if (btn) btn.classList.toggle('active', !!resolved);
        const sel = document.getElementById('con-ctx-anim-select');
        if (sel && sel.value !== resolved) sel.value = resolved;
        if (typeof conSave === 'function') conSave();
      }
      window.conCtxSetAnimation = global.conCtxSetAnimation = conCtxSetAnimation;

      function conCtxSetRevealAnimation(animKey) {
        const resolved = String(animKey || '');
        const ids = _conGetTargetNodeIdsForAnim();
        ids.forEach(nid => {
          const n = conNodes.find(x => x && String(x.id) === nid);
          if (!n) return;
          n.revealAnim = resolved;
        });
        const sel = document.getElementById('con-ctx-reveal-anim-select');
        if (sel && sel.value !== resolved) sel.value = resolved;
        if (typeof conSave === 'function') conSave();
      }
      window.conCtxSetRevealAnimation = global.conCtxSetRevealAnimation = conCtxSetRevealAnimation;

      function conCtxToggleAnim() {
        const primaryId = (typeof conCtxNodeId !== 'undefined' && conCtxNodeId) ? String(conCtxNodeId) : (typeof conSelected !== 'undefined' && conSelected ? String(conSelected) : null);
        const primary = primaryId ? conNodes.find(x => x && String(x.id) === primaryId) : null;
        const next = (primary && primary.anim) ? '' : conGetDefaultAnim('node');
        conCtxSetAnimation(next);
      }
      window.conCtxToggleAnim = global.conCtxToggleAnim = conCtxToggleAnim;

      function conSetSelectedAnimation(animKey, toggleIfSame) {
        const requested = String(animKey || '');
        const usePerTypeDefault = requested === '__default__';
        let applied = false;

        // 1. Selected nodes
        const selNodeIds = [];
        if (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0) {
          conMultiSelected.forEach(id => selNodeIds.push(String(id)));
        } else if (typeof conSelected !== 'undefined' && conSelected) {
          selNodeIds.push(String(conSelected));
        }
        if (selNodeIds.length > 0) {
          const nodeTarget = usePerTypeDefault ? conGetDefaultAnim('node') : requested;
          selNodeIds.forEach(nid => {
            const n = conNodes.find(x => x && String(x.id) === nid);
            if (!n) return;
            const next = (toggleIfSame && n.anim === nodeTarget) ? '' : nodeTarget;
            n.anim = next;
            conApplyEntityAnimClass(n.el, n.anim, false);
            if (window._conMirrorSend) window._conMirrorSend({ type: 'node-anim', nodeId: String(n.id), anim: n.anim });
            applied = true;
          });
        }

        // 2. Selected or active notes
        const liveNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : [];
        const targetNotes = liveNotes.filter(nd => {
          if (!nd) return false;
          const nel = (typeof window.wnGetNoteElementById === 'function') ? window.wnGetNoteElementById(nd.id) : null;
          return (nel && nel.classList.contains('wn-selected')) || (window._wnActiveNote && String(window._wnActiveNote.id) === String(nd.id));
        });
        if (targetNotes.length > 0 && typeof window.wnApplyAnimationToNote === 'function') {
          const noteTarget = usePerTypeDefault ? conGetDefaultAnim('note') : requested;
          targetNotes.forEach(nd => {
            const cur = nd.anim || (nd.blink ? 'pulse' : '');
            const next = (toggleIfSame && cur === noteTarget) ? '' : noteTarget;
            window.wnApplyAnimationToNote(nd, next);
            applied = true;
          });
        }

        // 3. Focused group
        const grp = (typeof window.conGetGroupFocused === 'function') ? window.conGetGroupFocused() : null;
        if (grp && typeof window.conGroupApplyAnimation === 'function') {
          const groupTarget = usePerTypeDefault ? conGetDefaultAnim('group') : requested;
          const cur = grp.anim || (grp.blink ? 'pulse' : '');
          const next = (toggleIfSame && cur === groupTarget) ? '' : groupTarget;
          window.conGroupApplyAnimation(grp, next);
          applied = true;
        }

        if (applied && typeof conSave === 'function') conSave();
        return applied;
      }
      window.conSetSelectedAnimation = global.conSetSelectedAnimation = conSetSelectedAnimation;

      function conBlinkNodeAttention(el, durationMs) {
        if (!el) return;
        const animCfg = _conGetBoardAnimCfg();
        const cfgDur = (animCfg && Number(animCfg.doubleClickDurationSec))
          ? animCfg.doubleClickDurationSec * 1000
          : 3000;
        const totalMs = Math.max(250, Number(durationMs) || cfgDur);
        const node = conNodes.find(n => n.id === el.id) || null;
        const animKey = conGetDefaultAnim('node');
        const resolved = CON_ANIMATIONS.some(a => a.key === animKey) ? animKey : 'pulse';

        conPlayRevealAnimation('node', node, el, {
          animKey: resolved,
          durationMs: totalMs,
          useAnimClass: true
        });
      }

      // Cross-module exports
      window.conInitToolbarPinState = global.conInitToolbarPinState = conInitToolbarPinState;
      window.conTableClearSelection = global.conTableClearSelection = conTableClearSelection;
      window._conClipboardWrite = global._conClipboardWrite = _conClipboardWrite;
      window._conClipboardRead = global._conClipboardRead = _conClipboardRead;
      window.conPushUndo = global.conPushUndo = conPushUndo;
      window.conUndo = global.conUndo = conUndo;
      window.conRedo = global.conRedo = conRedo;
      window.conPxToFontUnit = global.conPxToFontUnit = conPxToFontUnit;
      window.conFontUnitToPx = global.conFontUnitToPx = conFontUnitToPx;
      window.conPxToThicknessUnit = global.conPxToThicknessUnit = conPxToThicknessUnit;
      window.conThicknessUnitToPx = global.conThicknessUnitToPx = conThicknessUnitToPx;
      window._conSetupFontSizeSlider = global._conSetupFontSizeSlider = _conSetupFontSizeSlider;
      window._conSetupThicknessSlider = global._conSetupThicknessSlider = _conSetupThicknessSlider;
      window._conSyncUnitToggleButtons = global._conSyncUnitToggleButtons = _conSyncUnitToggleButtons;
      window.conApplyDefaultWordFontSize = global.conApplyDefaultWordFontSize = conApplyDefaultWordFontSize;
      window.conGetEffectiveZoom = global.conGetEffectiveZoom = conGetEffectiveZoom;
      window.conGetNodeBaseFontSize = global.conGetNodeBaseFontSize = conGetNodeBaseFontSize;
      window.conSetNodeBaseFontSize = global.conSetNodeBaseFontSize = conSetNodeBaseFontSize;
      window.conIsNodeLocked = global.conIsNodeLocked = conIsNodeLocked;
      window.conSyncNodeLockState = global.conSyncNodeLockState = conSyncNodeLockState;
      window.conInitSwatches = global.conInitSwatches = conInitSwatches;
      window.conInitBorderSwatches = global.conInitBorderSwatches = conInitBorderSwatches;
      window.conApplyTextStrokeStyle = global.conApplyTextStrokeStyle = conApplyTextStrokeStyle;
      window._conSyncPresetButtons = global._conSyncPresetButtons = _conSyncPresetButtons;
      window.conInitPresetButtons = global.conInitPresetButtons = conInitPresetButtons;
      window.conNodeClearSelection = global.conNodeClearSelection = conNodeClearSelection;
      window.conSelect = global.conSelect = conSelect;
      window.conSetMultiSelected = global.conSetMultiSelected = conSetMultiSelected;
      window.conCloseNodeWordCard = global.conCloseNodeWordCard = conCloseNodeWordCard;
      window.conPopulateRevealAnimSelect = global.conPopulateRevealAnimSelect = conPopulateRevealAnimSelect;
      window.conPlayRevealAnimation = global.conPlayRevealAnimation = conPlayRevealAnimation;
      window.conApplyEntityAnimClass = global.conApplyEntityAnimClass = conApplyEntityAnimClass;
      window.conPopulateAnimSelect = global.conPopulateAnimSelect = conPopulateAnimSelect;
      window.conBlinkNodeAttention = global.conBlinkNodeAttention = conBlinkNodeAttention;

    })();

})(typeof window !== "undefined" ? window : this);
