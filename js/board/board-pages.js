/**
 * Class Management Tools — Board Multi-Page & Snapshot Engine
 * Manages multi-page tabs, in-memory detached DOM cache, page navigation, merging, and snapshots.
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
  var _conPageSnapshotPngs = global._conPageSnapshotPngs = global._conPageSnapshotPngs || [];
  var conDrawings = global.conDrawings = global.conDrawings || [];
  var conShapes = global.conShapes = global.conShapes || [];
  var conNotes = global.conNotes = global.conNotes || [];
  var conGroups = global.conGroups = global.conGroups || [];
  // Active session file and folder names are bound globally in board-state.js

  var boardEscapeHtml = global.boardEscapeHtml = window.boardEscapeHtml || function (text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var escapeSearchHtml = global.escapeSearchHtml = window.escapeSearchHtml || boardEscapeHtml;
  var conEscapeSearchHtml = global.conEscapeSearchHtml = window.conEscapeSearchHtml || escapeSearchHtml;
  var conTitle = global.conTitle = window.conTitle = (typeof window.conTitle !== 'undefined' ? window.conTitle : '');
  var wnRenderMathHtml = global.wnRenderMathHtml = window.wnRenderMathHtml || function (html) { return html; };
  var boardBuildPersistedSessionData = function (...args) {
    if (typeof window !== 'undefined' && typeof window.boardBuildPersistedSessionData === 'function') {
      return window.boardBuildPersistedSessionData(...args);
    }
    return args[1] || {};
  };
  var boardSourceLabel = function (source) {
    if (typeof window !== 'undefined' && typeof window.boardSourceLabel === 'function') {
      return window.boardSourceLabel(source);
    }
    return source || '';
  };
  var boardFormatWhen = function (ts) {
    if (typeof window !== 'undefined' && typeof window.boardFormatWhen === 'function') {
      return window.boardFormatWhen(ts);
    }
    return String(ts || '');
  };
  var boardSectionLabel = function (section) {
    if (typeof window !== 'undefined' && typeof window.boardSectionLabel === 'function') {
      return window.boardSectionLabel(section);
    }
    return section || '';
  };
  var boardPersistLocalSession = function (...args) {
    if (typeof window !== 'undefined' && typeof window.boardPersistLocalSession === 'function') {
      return window.boardPersistLocalSession(...args);
    }
  };
  var boardSetAutosaveFingerprint = function (...args) {
    if (typeof window !== 'undefined' && typeof window.boardSetAutosaveFingerprint === 'function') {
      return window.boardSetAutosaveFingerprint(...args);
    }
  };

  var conResolvePdfBackgroundAttachment = global.conResolvePdfBackgroundAttachment || window.conResolvePdfBackgroundAttachment || function (bg) {
    if (typeof window !== 'undefined' && typeof window.conResolvePdfBackgroundAttachment === 'function' && window.conResolvePdfBackgroundAttachment !== conResolvePdfBackgroundAttachment) {
      return window.conResolvePdfBackgroundAttachment(bg);
    }
    return null;
  };
  var conRenderPagePdfBackground = global.conRenderPagePdfBackground || window.conRenderPagePdfBackground || function (opts) {
    if (typeof window !== 'undefined' && typeof window.conRenderPagePdfBackground === 'function' && window.conRenderPagePdfBackground !== conRenderPagePdfBackground) {
      return window.conRenderPagePdfBackground(opts);
    }
  };
  var conRenderBoardBg = global.conRenderBoardBg || window.conRenderBoardBg || function (opts) {
    if (typeof window !== 'undefined' && typeof window.conRenderBoardBg === 'function' && window.conRenderBoardBg !== conRenderBoardBg) {
      return window.conRenderBoardBg(opts);
    }
  };
  var conApplyBoardBgColor = global.conApplyBoardBgColor || window.conApplyBoardBgColor || function () {
    if (typeof window !== 'undefined' && typeof window.conApplyBoardBgColor === 'function' && window.conApplyBoardBgColor !== conApplyBoardBgColor) {
      return window.conApplyBoardBgColor();
    }
  };
  var conNormalizeColorHex = global.conNormalizeColorHex || window.conNormalizeColorHex || function (hex) {
    if (typeof window !== 'undefined' && typeof window.conNormalizeColorHex === 'function' && window.conNormalizeColorHex !== conNormalizeColorHex) {
      return window.conNormalizeColorHex(hex);
    }
    return String(hex || '');
  };

      // ---- Mini-Thumb context menu & Drag-and-Drop reorder ----
      let _conMiniThumbDragIdx = null;

      function conCloseMiniThumbContextMenu() {
        const existing = document.getElementById('con-mini-thumb-context-menu');
        if (existing) existing.remove();
      }
      window.conCloseMiniThumbContextMenu = conCloseMiniThumbContextMenu;

      function conShowMiniThumbContextMenu(e, pageIndex) {
        window.conShowMiniThumbContextMenu = conShowMiniThumbContextMenu;
        e.preventDefault();
        e.stopPropagation();
        conCloseMiniThumbContextMenu();

        const menu = document.createElement('div');
        menu.id = 'con-mini-thumb-context-menu';
        menu.className = 'con-mini-thumb-menu';

        const openImgItem = document.createElement('button');
        openImgItem.type = 'button';
        openImgItem.className = 'con-mini-thumb-menu-item';
        openImgItem.style.display = 'flex';
        openImgItem.style.alignItems = 'center';
        openImgItem.style.gap = '6px';
        const openImgLabel = (typeof t === 'function' ? t('conOpenPageImageInNewWindow') : 'Open image in new window');
        openImgItem.innerHTML = '<img src="../assets/icons/eye.svg" style="width:13px;height:13px;flex-shrink:0;" alt="" /> <span>' + escapeSearchHtml(openImgLabel) + '</span>';
        openImgItem.onclick = function (evt) {
          evt.stopPropagation();
          conCloseMiniThumbContextMenu();
          if (typeof window.conOpenPageSnapshotWindow === 'function') {
            window.conOpenPageSnapshotWindow(pageIndex);
          }
        };
        menu.appendChild(openImgItem);

        const openPageItem = document.createElement('button');
        openPageItem.type = 'button';
        openPageItem.className = 'con-mini-thumb-menu-item';
        openPageItem.style.display = 'flex';
        openPageItem.style.alignItems = 'center';
        openPageItem.style.gap = '6px';
        const openPageLabel = (typeof t === 'function' ? t('conOpenPageInNewWindow') : 'Open page in new window');
        openPageItem.innerHTML = '<img src="../assets/icons/monitor.svg" style="width:13px;height:13px;flex-shrink:0;" alt="" /> <span>' + escapeSearchHtml(openPageLabel) + '</span>';
        openPageItem.onclick = function (evt) {
          evt.stopPropagation();
          conCloseMiniThumbContextMenu();
          if (typeof window.conOpenPageInNewWindow === 'function') {
            window.conOpenPageInNewWindow(pageIndex);
          }
        };
        menu.appendChild(openPageItem);

        const dupItem = document.createElement('button');
        dupItem.type = 'button';
        dupItem.className = 'con-mini-thumb-menu-item';
        dupItem.style.display = 'flex';
        dupItem.style.alignItems = 'center';
        dupItem.style.gap = '6px';
        const dupLabel = (typeof t === 'function' ? t('conDuplicatePage') : 'Duplicate page');
        dupItem.innerHTML = '<img src="../assets/icons/copy.svg" style="width:13px;height:13px;flex-shrink:0;" alt="" /> <span>' + escapeSearchHtml(dupLabel) + '</span>';
        dupItem.onclick = function (evt) {
          evt.stopPropagation();
          conCloseMiniThumbContextMenu();
          conDuplicatePageMiniThumb(pageIndex);
        };
        menu.appendChild(dupItem);

        const delItem = document.createElement('button');
        delItem.type = 'button';
        delItem.className = 'con-mini-thumb-menu-item danger';
        delItem.style.display = 'flex';
        delItem.style.alignItems = 'center';
        delItem.style.gap = '6px';
        const delLabel = (typeof t === 'function' ? t('conDeletePage') : 'Delete page');
        delItem.innerHTML = '<img src="../assets/icons/delete.svg" style="width:13px;height:13px;flex-shrink:0;" alt="" /> <span>' + escapeSearchHtml(delLabel) + '</span>';
        delItem.onclick = function (evt) {
          evt.stopPropagation();
          conCloseMiniThumbContextMenu();
          conDeletePageMiniThumb(pageIndex);
        };
        menu.appendChild(delItem);

        document.body.appendChild(menu);

        const menuWidth = 220;
        const menuHeight = 155;
        let top = e.clientY;
        let left = e.clientX;
        if (left + menuWidth > window.innerWidth) left = Math.max(10, window.innerWidth - menuWidth - 8);
        if (top + menuHeight > window.innerHeight) top = Math.max(10, window.innerHeight - menuHeight - 8);
        menu.style.top = top + 'px';
        menu.style.left = left + 'px';

        const dismiss = function (evt) {
          if (!menu.contains(evt.target)) {
            conCloseMiniThumbContextMenu();
            document.removeEventListener('pointerdown', dismiss, true);
            document.removeEventListener('keydown', keyDismiss, true);
          }
        };
        const keyDismiss = function (evt) {
          if (evt.key === 'Escape') {
            conCloseMiniThumbContextMenu();
            document.removeEventListener('pointerdown', dismiss, true);
            document.removeEventListener('keydown', keyDismiss, true);
          }
        };
        setTimeout(() => {
          document.addEventListener('pointerdown', dismiss, true);
          document.addEventListener('keydown', keyDismiss, true);
        }, 0);
      }

      /* =========================================================================
       * IN-MEMORY DETACHED DOM CACHE FOR BOARD PAGES
       * ========================================================================= */
      const _CON_DOM_CACHE_MAX_PAGES = 8;
      const _conPageDomCache = new Map();

      /**
       * Detaches the currently active page DOM elements from #constellation-board
       * and #constellation-svg, and saves them along with live JS arrays into the cache.
       */
      function _conCacheCurrentPageDom() {
        const curIdx = conCurrentPageIndex;
        const boardEl = document.getElementById('constellation-board');
        const svgEl = document.getElementById('constellation-svg');
        if (!boardEl || !svgEl) return;

        // 1. Commit any currently focused note editor
        try {
          const ae = document.activeElement;
          const ed = ae ? (ae.classList && ae.classList.contains('wn-note-editor') ? ae : (ae.closest && ae.closest('.wn-note-editor'))) : null;
          if (ed) {
            const noteEl = ed.closest('.con-word-note');
            if (noteEl && noteEl.dataset && noteEl.dataset.id) {
              const currNotes = window.conGetNotes ? window.conGetNotes() : [];
              const nd = currNotes.find(n => String(n.id) === String(noteEl.dataset.id));
              if (nd && typeof wnSyncNoteDataFromEditor === 'function') wnSyncNoteDataFromEditor(nd, ed);
            }
          }
        } catch (_) { }

        // 2. Pause any playing audio or video elements to prevent background sound bleed
        boardEl.querySelectorAll('video, audio').forEach(mediaEl => {
          try {
            if (!mediaEl.paused) mediaEl.pause();
          } catch (_) { }
        });

        // 3. Clear active selections so state is clean
        if (typeof conClearSelection === 'function') conClearSelection();
        if (window.conDrawingSelected && window.conDrawingSelected.clear) window.conDrawingSelected.clear();
        if (window._conShapeSelected && window._conShapeSelected.clear) window._conShapeSelected.clear();
        if (window.conTableSelected && window.conTableSelected.clear) window.conTableSelected.clear();
        if (window.conNoteSelected && window.conNoteSelected.clear) window.conNoteSelected.clear();

        // 4. Capture plain JSON snapshot to keep file save / auto-save / PDF export 100% synchronized
        conPageSnapshots[curIdx] = conBuildPageSnapshot();

        // 5. Harvest live board DOM elements into a detached holder div (excluding static chrome)
        const boardHolder = document.createElement('div');
        const staticIds = new Set([
          'constellation-svg',
          'con-draw-live-svg',
          'con-draw-overlay',
          'con-board-title',
          'con-board-expand-btn',
          'con-rubberband'
        ]);
        const elementsToDetach = Array.from(boardEl.children).filter(el => !staticIds.has(el.id));
        elementsToDetach.forEach(el => boardHolder.appendChild(el));

        // 6. Harvest live edge SVG groups into a detached SVG container
        const svgHolder = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const edgeGroups = Array.from(svgEl.children).filter(el => el.classList && el.classList.contains('con-line-group'));
        edgeGroups.forEach(el => svgHolder.appendChild(el));

        // 7. Store state record in cache
        _conPageDomCache.set(curIdx, {
          pageIndex: curIdx,
          boardHolder,
          svgHolder,
          state: {
            nodes: (window.conGetNodes ? window.conGetNodes() : (typeof conNodes !== 'undefined' ? conNodes : [])).slice(),
            edges: (window.conGetEdges ? window.conGetEdges() : (typeof conEdges !== 'undefined' ? conEdges : [])).slice(),
            groups: (window.conGetGroups ? window.conGetGroups() : (typeof conGroups !== 'undefined' ? conGroups : [])).slice(),
            drawings: (window.conGetDrawings ? window.conGetDrawings() : (typeof conDrawings !== 'undefined' ? conDrawings : [])).slice(),
            shapes: (window.conGetShapes ? window.conGetShapes() : (typeof conShapes !== 'undefined' ? conShapes : [])).slice(),
            notes: (window.conGetNotes ? window.conGetNotes() : (typeof conNotes !== 'undefined' ? conNotes : [])).slice(),
            tables: (window.conTables ? window.conTables.slice() : []),
            mediaItems: (typeof conMediaItems !== 'undefined' ? conMediaItems.slice() : []),
            masks: (window.conMasks ? window.conMasks.slice() : []),
            backgroundPdf: (typeof conPageBackgroundPdf !== 'undefined' && conPageBackgroundPdf) ? Object.assign({}, conPageBackgroundPdf) : null,
            boardBg: (typeof _conBoardBg !== 'undefined' && _conBoardBg) ? Object.assign({}, _conBoardBg) : null,
            boardBgColor: (typeof _conBoardBgColor !== 'undefined' ? _conBoardBgColor : ''),
            boardStickers: Array.isArray(window._conBoardStickers) ? window._conBoardStickers.slice() : [],
            boardHeight: boardEl.style.height || null,
            undoStack: (typeof _conUndoStack !== 'undefined' && _conUndoStack) ? _conUndoStack.slice() : [],
            redoStack: (typeof _conRedoStack !== 'undefined' && _conRedoStack) ? _conRedoStack.slice() : []
          },
          lastVisited: Date.now()
        });

        // 8. Empty active live JS arrays so subsequent page restores or clear operations
        //    NEVER call el.remove() on the detached DOM nodes preserved in cache.
        const liveNodes = window.conGetNodes ? window.conGetNodes() : (typeof conNodes !== 'undefined' ? conNodes : null);
        if (liveNodes) liveNodes.length = 0;
        const liveEdges = window.conGetEdges ? window.conGetEdges() : (typeof conEdges !== 'undefined' ? conEdges : null);
        if (liveEdges) liveEdges.length = 0;
        const liveGroups = window.conGetGroups ? window.conGetGroups() : (typeof conGroups !== 'undefined' ? conGroups : null);
        if (liveGroups) liveGroups.length = 0;
        const liveDrawings = window.conGetDrawings ? window.conGetDrawings() : (typeof conDrawings !== 'undefined' ? conDrawings : null);
        if (liveDrawings) liveDrawings.length = 0;
        const liveShapes = window.conGetShapes ? window.conGetShapes() : (typeof conShapes !== 'undefined' ? conShapes : null);
        if (liveShapes) liveShapes.length = 0;
        const liveNotes = window.conGetNotes ? window.conGetNotes() : (typeof conNotes !== 'undefined' ? conNotes : null);
        if (liveNotes) liveNotes.length = 0;
        if (window.conTables && Array.isArray(window.conTables)) window.conTables.length = 0;
        if (typeof conMediaItems !== 'undefined' && Array.isArray(conMediaItems)) conMediaItems.length = 0;
        if (window.conMasks && Array.isArray(window.conMasks)) window.conMasks.length = 0;
        if (Array.isArray(window._conBoardStickers)) window._conBoardStickers.length = 0;

        // 9. Enforce LRU cache limits
        _conEvictLruPageDomCache();
      }

      /**
       * Mounts a cached page's detached DOM elements and live JS arrays back to the active board.
       * Returns true on successful mount, false on cache miss.
       */
      function _conMountCachedPage(targetIdx) {
        const cached = _conPageDomCache.get(targetIdx);
        if (!cached || !cached.boardHolder || !cached.svgHolder) return false;

        // Defensive integrity check: if cached state expected nodes or notes, but the boardHolder
        // was somehow emptied or has 0 children, reject cache and let clean snapshot restore run.
        const expectedElementCount = (cached.state.nodes ? cached.state.nodes.length : 0)
          + (cached.state.notes ? cached.state.notes.length : 0)
          + (cached.state.groups ? cached.state.groups.length : 0)
          + (cached.state.tables ? cached.state.tables.length : 0)
          + (cached.state.drawings ? cached.state.drawings.length : 0)
          + (cached.state.shapes ? cached.state.shapes.length : 0)
          + (cached.state.mediaItems ? cached.state.mediaItems.length : 0)
          + (cached.state.masks ? cached.state.masks.length : 0);
        if (expectedElementCount > 0 && cached.boardHolder.children.length === 0) {
          _conInvalidatePageDomCache(targetIdx);
          return false;
        }

        const boardEl = document.getElementById('constellation-board');
        const svgEl = document.getElementById('constellation-svg');
        const expandBtn = document.getElementById('con-board-expand-btn');
        if (!boardEl || !svgEl) return false;

        // Ensure boardEl and svgEl do not retain any lingering dynamic elements from an aborted state
        const staticIds = new Set([
          'constellation-svg',
          'con-draw-live-svg',
          'con-draw-overlay',
          'con-board-title',
          'con-board-expand-btn',
          'con-rubberband'
        ]);
        Array.from(boardEl.children).filter(el => !staticIds.has(el.id)).forEach(el => el.remove());
        Array.from(svgEl.children).filter(el => el.classList && el.classList.contains('con-line-group')).forEach(el => el.remove());

        // 1. Re-attach board elements via DocumentFragment in a single atomic batch
        const boardFrag = document.createDocumentFragment();
        while (cached.boardHolder.firstChild) {
          boardFrag.appendChild(cached.boardHolder.firstChild);
        }
        if (expandBtn) {
          boardEl.insertBefore(boardFrag, expandBtn);
        } else {
          boardEl.appendChild(boardFrag);
        }

        // 2. Re-attach SVG edge groups via DocumentFragment
        const svgFrag = document.createDocumentFragment();
        while (cached.svgHolder.firstChild) {
          svgFrag.appendChild(cached.svgHolder.firstChild);
        }
        svgEl.appendChild(svgFrag);

        // 3. Restore live JavaScript arrays (mutating in place to preserve outer references)
        const liveNodes = window.conGetNodes ? window.conGetNodes() : (typeof conNodes !== 'undefined' ? conNodes : []);
        liveNodes.length = 0;
        liveNodes.push(...cached.state.nodes);

        const liveEdges = window.conGetEdges ? window.conGetEdges() : (typeof conEdges !== 'undefined' ? conEdges : []);
        liveEdges.length = 0;
        liveEdges.push(...cached.state.edges);

        const liveGroups = window.conGetGroups ? window.conGetGroups() : (typeof conGroups !== 'undefined' ? conGroups : []);
        liveGroups.length = 0;
        liveGroups.push(...cached.state.groups);

        const liveDrawings = window.conGetDrawings ? window.conGetDrawings() : (typeof conDrawings !== 'undefined' ? conDrawings : []);
        liveDrawings.length = 0;
        liveDrawings.push(...cached.state.drawings);

        const liveShapes = window.conGetShapes ? window.conGetShapes() : (typeof conShapes !== 'undefined' ? conShapes : []);
        liveShapes.length = 0;
        liveShapes.push(...cached.state.shapes);

        const liveNotes = window.conGetNotes ? window.conGetNotes() : (typeof conNotes !== 'undefined' ? conNotes : []);
        liveNotes.length = 0;
        liveNotes.push(...cached.state.notes);

        if (window.conTables) {
          window.conTables.length = 0;
          window.conTables.push(...cached.state.tables);
        }
        if (typeof conMediaItems !== 'undefined') {
          conMediaItems.length = 0;
          conMediaItems.push(...cached.state.mediaItems);
        }
        if (window.conMasks) {
          window.conMasks.length = 0;
          window.conMasks.push(...cached.state.masks);
        }

        // 4. Verify node element references and display visibility
        for (let i = 0; i < liveNodes.length; i++) {
          const n = liveNodes[i];
          if (!n.el || !boardEl.contains(n.el)) {
            const found = document.getElementById(n.id);
            if (found) n.el = found;
          }
          if (n.el && n.el.style.display === 'none') {
            n.el.style.display = '';
          }
        }

        // 5. Restore backgrounds and dimensions
        conPageBackgroundPdf = cached.state.backgroundPdf;
        if (typeof conRenderPagePdfBackground === 'function') conRenderPagePdfBackground({ silent: true });

        _conBoardBg = cached.state.boardBg;
        if (typeof conRenderBoardBg === 'function') conRenderBoardBg({ silent: true });

        _conBoardBgColor = cached.state.boardBgColor || '';
        if (typeof conApplyBoardBgColor === 'function') conApplyBoardBgColor();

        window._conBoardStickers = cached.state.boardStickers.slice();
        boardEl.style.height = cached.state.boardHeight || '';

        // 6. Restore page undo/redo stacks
        if (typeof _conUndoStack !== 'undefined') _conUndoStack = cached.state.undoStack.slice();
        if (typeof _conRedoStack !== 'undefined') _conRedoStack = cached.state.redoStack.slice();

        // 7. Geometry and edge alignments
        if (window.conGroupRefitAll) window.conGroupRefitAll();
        if (window.conRedrawEdges) window.conRedrawEdges();
        if (typeof window._conSyncDrawOverlaySize === 'function') window._conSyncDrawOverlaySize();

        // 8. Delete this page from detached cache Map because it is now LIVE in the DOM.
        // When departing from targetIdx, _conCacheCurrentPageDom() will harvest it cleanly.
        _conPageDomCache.delete(targetIdx);

        return true;
      }

      /**
       * LRU eviction: if cache exceeds _CON_DOM_CACHE_MAX_PAGES, evict the oldest
       * inactive page from memory.
       */
      function _conEvictLruPageDomCache() {
        if (_conPageDomCache.size <= _CON_DOM_CACHE_MAX_PAGES) return;

        let oldestKey = null;
        let oldestTime = Infinity;
        for (const [key, record] of _conPageDomCache.entries()) {
          if (key === conCurrentPageIndex) continue; // Never evict active page
          if (record.lastVisited < oldestTime) {
            oldestTime = record.lastVisited;
            oldestKey = key;
          }
        }

        if (oldestKey !== null) {
          const evicted = _conPageDomCache.get(oldestKey);
          if (evicted) {
            if (evicted.boardHolder) evicted.boardHolder.innerHTML = '';
            if (evicted.svgHolder) evicted.svgHolder.innerHTML = '';
          }
          _conPageDomCache.delete(oldestKey);
        }
      }

      /**
       * Completely resets the DOM cache (e.g. on loading a new file or session reset).
       */
      function _conClearPageDomCache(opts = {}) {
        _conPageDomCache.forEach(record => {
          try {
            if (record.boardHolder) record.boardHolder.innerHTML = '';
            if (record.svgHolder) record.svgHolder.innerHTML = '';
          } catch (_) { }
        });
        _conPageDomCache.clear();
        if (!opts.silent && typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'page-cache-clear' });
        }
      }

      /**
       * Drops a specific page from cache (used on page deletion or destructive edit).
       */
      function _conInvalidatePageDomCache(pageIdx, opts = {}) {
        const rec = _conPageDomCache.get(pageIdx);
        if (rec) {
          if (rec.boardHolder) rec.boardHolder.innerHTML = '';
          if (rec.svgHolder) rec.svgHolder.innerHTML = '';
          _conPageDomCache.delete(pageIdx);
        }
        if (!opts.silent && typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'page-cache-invalidate', pageIdx });
        }
      }

      /**
       * Remaps cache indices when a page is deleted.
       */
      function _conRemapPageDomCacheOnDelete(deletedIdx, opts = {}) {
        _conInvalidatePageDomCache(deletedIdx, { silent: true });
        const nextCache = new Map();
        for (const [idx, rec] of _conPageDomCache.entries()) {
          if (idx < deletedIdx) {
            nextCache.set(idx, rec);
          } else if (idx > deletedIdx) {
            rec.pageIndex = idx - 1;
            nextCache.set(idx - 1, rec);
          }
        }
        _conPageDomCache.clear();
        nextCache.forEach((v, k) => _conPageDomCache.set(k, v));
        if (!opts.silent && typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'page-cache-delete', deletedIdx });
        }
      }

      /**
       * Remaps cache indices when a page is moved/reordered.
       */
      function _conRemapPageDomCacheOnMove(fromIdx, toIdx, opts = {}) {
        if (fromIdx === toIdx) return;
        const targetRec = _conPageDomCache.get(fromIdx);
        _conPageDomCache.delete(fromIdx);

        const tempArr = [];
        const maxIdx = Math.max(...Array.from(_conPageDomCache.keys()), fromIdx, toIdx, conPageSnapshots.length);
        for (let i = 0; i <= maxIdx; i++) {
          tempArr[i] = _conPageDomCache.get(i) || null;
        }
        const [moved] = tempArr.splice(fromIdx, 1);
        tempArr.splice(toIdx, 0, targetRec || moved || null);

        _conPageDomCache.clear();
        for (let i = 0; i < tempArr.length; i++) {
          if (tempArr[i]) {
            tempArr[i].pageIndex = i;
            _conPageDomCache.set(i, tempArr[i]);
          }
        }
        if (!opts.silent && typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'page-cache-move', fromIdx, toIdx });
        }
      }

      /**
       * Remaps cache indices when 1 page is inserted.
       */
      function _conRemapPageDomCacheOnInsert(insertIdx, opts = {}) {
        const nextCache = new Map();
        for (const [cIdx, rec] of _conPageDomCache.entries()) {
          if (cIdx >= insertIdx) {
            rec.pageIndex = cIdx + 1;
            nextCache.set(cIdx + 1, rec);
          } else {
            nextCache.set(cIdx, rec);
          }
        }
        _conPageDomCache.clear();
        nextCache.forEach((v, k) => _conPageDomCache.set(k, v));
        if (!opts.silent && typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'page-cache-insert', insertIdx });
        }
      }

      /**
       * Remaps cache indices when multiple pages are inserted.
       */
      function _conRemapPageDomCacheOnInsertCount(insertIdx, count, opts = {}) {
        if (count <= 0) return;
        const nextCache = new Map();
        for (const [cIdx, rec] of _conPageDomCache.entries()) {
          if (cIdx >= insertIdx) {
            rec.pageIndex = cIdx + count;
            nextCache.set(cIdx + count, rec);
          } else {
            nextCache.set(cIdx, rec);
          }
        }
        _conPageDomCache.clear();
        nextCache.forEach((v, k) => _conPageDomCache.set(k, v));
        if (!opts.silent && typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'page-cache-insert-count', insertIdx, count });
        }
      }

      window._conPageDomCache = _conPageDomCache;
      window._conCacheCurrentPageDom = _conCacheCurrentPageDom;
      window._conMountCachedPage = _conMountCachedPage;
      window._conClearPageDomCache = _conClearPageDomCache;
      window._conInvalidatePageDomCache = _conInvalidatePageDomCache;
      window._conRemapPageDomCacheOnDelete = _conRemapPageDomCacheOnDelete;
      window._conRemapPageDomCacheOnMove = _conRemapPageDomCacheOnMove;
      window._conRemapPageDomCacheOnInsert = _conRemapPageDomCacheOnInsert;
      window._conRemapPageDomCacheOnInsertCount = _conRemapPageDomCacheOnInsertCount;

      function conDuplicatePageMiniThumb(idx) {
        if (typeof _conCacheCurrentPageDom === 'function') {
          _conCacheCurrentPageDom();
        } else {
          conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
        }
        if (typeof conQueueCurrentPageSnapshotPng === 'function') {
          conQueueCurrentPageSnapshotPng(conCurrentPageIndex);
        }
        const snap = conPageSnapshots[idx] || conBuildEmptyPageSnapshot();
        const clone = JSON.parse(JSON.stringify(snap));
        const insertIdx = idx + 1;
        if (typeof _conRemapPageDomCacheOnInsert === 'function') {
          _conRemapPageDomCacheOnInsert(insertIdx);
        }
        conPageSnapshots.splice(insertIdx, 0, clone);
        if (Array.isArray(_conPageSnapshotPngs)) {
          _conPageSnapshotPngs.splice(insertIdx, 0, _conPageSnapshotPngs[idx] || null);
        }
        conCurrentPageIndex = insertIdx;
        _conRestorePageToBoard(clone);

        const strip = document.getElementById('con-page-mini-strip');
        if (strip) strip.dataset.pageCount = '';
        conUpdatePageBar();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (!window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        }
        const pagesOverlay = document.getElementById('con-pages-overlay');
        if (pagesOverlay && pagesOverlay.classList.contains('active') && typeof window.conOpenPagePreview === 'function') {
          window.conOpenPagePreview();
        }
        if (typeof mdbToast === 'function') {
          mdbToast('Duplicated page ' + (idx + 1));
        }
      }

      function conDeletePageMiniThumb(idx) {
        if (!Array.isArray(conPageSnapshots) || conPageSnapshots.length <= 1) {
          if (typeof mdbToast === 'function') {
            mdbToast('Only one page – cannot delete.');
          }
          return;
        }
        if (typeof _conRemapPageDomCacheOnDelete === 'function') {
          _conRemapPageDomCacheOnDelete(idx);
        }
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();

        if (idx === conCurrentPageIndex) {
          const goTo = idx > 0 ? idx - 1 : 0;
          conPageSnapshots.splice(idx, 1);
          if (Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs.splice(idx, 1);
          conCurrentPageIndex = Math.min(goTo, conPageSnapshots.length - 1);
          if (typeof _conMountCachedPage !== 'function' || !_conMountCachedPage(conCurrentPageIndex)) {
            _conRestorePageToBoard(conPageSnapshots[conCurrentPageIndex]);
          }
        } else {
          conPageSnapshots.splice(idx, 1);
          if (Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs.splice(idx, 1);
          if (idx < conCurrentPageIndex) {
            conCurrentPageIndex--;
          }
          if (conCurrentPageIndex >= conPageSnapshots.length) {
            conCurrentPageIndex = conPageSnapshots.length - 1;
          }
          if (typeof _conMountCachedPage !== 'function' || !_conMountCachedPage(conCurrentPageIndex)) {
            _conRestorePageToBoard(conPageSnapshots[conCurrentPageIndex]);
          }
        }

        const strip = document.getElementById('con-page-mini-strip');
        if (strip) strip.dataset.pageCount = '';
        conUpdatePageBar();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (!window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        }
        const pagesOverlayDel = document.getElementById('con-pages-overlay');
        if (pagesOverlayDel && pagesOverlayDel.classList.contains('active') && typeof window.conOpenPagePreview === 'function') {
          window.conOpenPagePreview();
        }
        if (typeof mdbToast === 'function') {
          mdbToast('Deleted page ' + (idx + 1));
        }
      }

      function conMovePageMiniThumb(fromIdx, toIdx) {
        if (fromIdx === toIdx || fromIdx === null || toIdx === null) return;
        if (!Array.isArray(conPageSnapshots)) return;
        if (fromIdx < 0 || fromIdx >= conPageSnapshots.length || toIdx < 0 || toIdx >= conPageSnapshots.length) return;

        if (typeof _conRemapPageDomCacheOnMove === 'function') {
          _conRemapPageDomCacheOnMove(fromIdx, toIdx);
        }
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();

        const draggedSnap = conPageSnapshots.splice(fromIdx, 1)[0];
        conPageSnapshots.splice(toIdx, 0, draggedSnap);
        if (Array.isArray(_conPageSnapshotPngs)) {
          const movedPng = _conPageSnapshotPngs.splice(fromIdx, 1)[0];
          _conPageSnapshotPngs.splice(toIdx, 0, movedPng || null);
        }

        if (conCurrentPageIndex === fromIdx) {
          conCurrentPageIndex = toIdx;
        } else if (fromIdx < conCurrentPageIndex && toIdx >= conCurrentPageIndex) {
          conCurrentPageIndex--;
        } else if (fromIdx > conCurrentPageIndex && toIdx <= conCurrentPageIndex) {
          conCurrentPageIndex++;
        }

        if (typeof _conMountCachedPage !== 'function' || !_conMountCachedPage(conCurrentPageIndex)) {
          _conRestorePageToBoard(conPageSnapshots[conCurrentPageIndex]);
        }

        const strip = document.getElementById('con-page-mini-strip');
        if (strip) strip.dataset.pageCount = '';
        conUpdatePageBar();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (!window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        }
        if (typeof mdbToast === 'function') {
          mdbToast('↔️ Moved page ' + (fromIdx + 1) + ' to position ' + (toIdx + 1));
        }
      }

      // ---- Multi-page navigation ----
      function conUpdatePageBar() {
        const indicator = document.getElementById('con-page-indicator');
        const prevBtn = document.getElementById('con-page-prev-btn');
        const nextBtn = document.getElementById('con-page-next-btn');
        const pasteBtn = document.getElementById('con-paste-page-btn');
        const total = conPageSnapshots.length;
        const cur = conCurrentPageIndex;
        if (indicator) indicator.textContent = 'Page ' + (cur + 1) + ' / ' + total;
        if (prevBtn) prevBtn.disabled = cur === 0;
        if (nextBtn) nextBtn.disabled = cur >= total - 1;
        if (pasteBtn) pasteBtn.disabled = !(typeof conHasCopiedPages === 'function' ? conHasCopiedPages() : (_conCopiedPages && _conCopiedPages.length > 0));
        conRenderMiniPageNav();
      }
      window.conUpdatePageBar = conUpdatePageBar;

      async function conResolveMiniPageSnapshotUrl(pageIndex) {
        const idx = Number(pageIndex) || 0;
        if (_conPageSnapshotPngs && _conPageSnapshotPngs[idx]) {
          return _conPageSnapshotPngs[idx];
        }
        if (_conCurrentFolderName && window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function') {
          const padded = String(idx + 1).padStart(3, '0');
          const webpPath = _conCurrentFolderName + '/page-snapshots/page-' + padded + '.webp';
          const pngPath = _conCurrentFolderName + '/page-snapshots/page-' + padded + '.png';
          try {
            let res = await Desktop.readByPath('mindmaps', webpPath, { encoding: 'base64' });
            let mime = 'image/webp';
            if (!(res && res.ok && res.content)) {
              res = await Desktop.readByPath('mindmaps', pngPath, { encoding: 'base64' });
              mime = 'image/png';
            }
            if (res && res.ok && res.content) {
              const url = 'data:' + mime + ';base64,' + res.content;
              if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
              _conPageSnapshotPngs[idx] = url;
              return url;
            }
          } catch (_) {}
        }
        const snap = (idx === conCurrentPageIndex && typeof conBuildPageSnapshot === 'function')
          ? conBuildPageSnapshot()
          : (conPageSnapshots && conPageSnapshots[idx]);
        if (snap && typeof conBuildPageThumbnailDataUrl === 'function') {
          try {
            const url = conBuildPageThumbnailDataUrl(snap, 480, 320);
            if (url) {
              if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
              _conPageSnapshotPngs[idx] = url;
              return url;
            }
          } catch (_) {}
        }
        return '';
      }

      async function conRenderMiniPageNav() {
        const root = document.getElementById('con-page-mini-nav');
        const strip = document.getElementById('con-page-mini-strip');
        if (!root || !strip) return;

        const total = Array.isArray(conPageSnapshots) ? conPageSnapshots.length : 0;
        const cur = Math.max(0, Math.min(Number(conCurrentPageIndex) || 0, Math.max(0, total - 1)));
        const show = total >= 1;

        root.classList.toggle('active', show);
        if (!show) {
          strip.innerHTML = '';
          strip.dataset.pageCount = '0';
          return;
        }

        const pageCount = String(total);
        const needsRebuild = strip.dataset.pageCount !== pageCount || strip.children.length !== total;
        const refreshMiniThumbSnapshot = function (btn, i, forceRefresh) {
          const canvas = btn.querySelector('canvas');
          const img = btn.querySelector('img');
          if (!canvas || !img) return;
          if (!forceRefresh && img.dataset.pngLoaded === '1' && img.src) return;
          conResolveMiniPageSnapshotUrl(i).then(url => {
            if (!url) return;
            const applyImg = function () {
              if (canvas) canvas.style.display = 'none';
              img.style.display = 'block';
              img.dataset.pngLoaded = '1';
            };
            img.onload = applyImg;
            img.onerror = function () {
              img.style.display = 'none';
              if (canvas) canvas.style.display = 'block';
              img.dataset.pngLoaded = '0';
            };
            img.src = url;
            if (img.complete && img.naturalWidth > 0) {
              applyImg();
            }
          });
        };

        if (needsRebuild) {
          const frag = document.createDocumentFragment();
          for (let i = 0; i < total; i += 1) {
            const btn = document.createElement('div');
            btn.className = 'con-page-mini-thumb' + (i === cur ? ' active' : '');
            btn.setAttribute('role', 'button');
            btn.setAttribute('tabindex', '0');
            const navTitle = (typeof window.tFmt === 'function')
              ? window.tFmt('conFileNavGoPage', { n: i + 1 })
              : (typeof tFmt === 'function' ? tFmt('conFileNavGoPage', { n: i + 1 }) : ('Page ' + (i + 1)));
            btn.title = navTitle;
            btn.setAttribute('aria-label', navTitle);
            btn.onclick = function () { window.conGoToPage(i); };
            btn.addEventListener('keydown', function (e) {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.conGoToPage(i);
              }
            });

            btn.draggable = true;
            btn.oncontextmenu = function (e) {
              conShowMiniThumbContextMenu(e, i);
            };

            btn.addEventListener('dragstart', function (e) {
              _conMiniThumbDragIdx = i;
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(i));
              strip.classList.add('is-dragging');
              document.body.classList.add('is-dragging-mini-thumb');
              setTimeout(() => btn.classList.add('dragging'), 0);
            });
            btn.addEventListener('dragend', function () {
              btn.classList.remove('dragging');
              _conMiniThumbDragIdx = null;
              strip.classList.remove('is-dragging');
              document.body.classList.remove('is-dragging-mini-thumb');
              document.querySelectorAll('.con-page-mini-thumb').forEach(t => {
                t.classList.remove('drag-over', 'dragging');
              });
            });
            btn.addEventListener('dragover', function (e) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              document.querySelectorAll('.con-page-mini-thumb').forEach(t => t.classList.remove('drag-over'));
              if (_conMiniThumbDragIdx !== null && _conMiniThumbDragIdx !== i) {
                btn.classList.add('drag-over');
              }
            });
            btn.addEventListener('dragleave', function () {
              btn.classList.remove('drag-over');
            });
            btn.addEventListener('drop', function (e) {
              e.preventDefault();
              btn.classList.remove('drag-over');
              strip.classList.remove('is-dragging');
              document.body.classList.remove('is-dragging-mini-thumb');
              if (_conMiniThumbDragIdx !== null && _conMiniThumbDragIdx !== i) {
                conMovePageMiniThumb(_conMiniThumbDragIdx, i);
              }
              _conMiniThumbDragIdx = null;
            });

            const canvas = document.createElement('canvas');
            canvas.width = 56;
            canvas.height = 36;
            const snap = (i === cur && typeof conBuildPageSnapshot === 'function')
              ? conBuildPageSnapshot()
              : (conPageSnapshots[i] || (typeof conBuildEmptyPageSnapshot === 'function' ? conBuildEmptyPageSnapshot() : (typeof window.conBuildEmptyPageSnapshot === 'function' ? window.conBuildEmptyPageSnapshot() : {})));
            conRenderPageThumbnail(snap, canvas);

            const initialUrl = (_conPageSnapshotPngs && _conPageSnapshotPngs[i]) || '';

            const img = document.createElement('img');
            img.alt = navTitle;
            img.className = 'con-page-mini-png';
            if (initialUrl) {
              img.src = initialUrl;
              img.style.display = 'block';
              img.dataset.pngLoaded = '1';
              canvas.style.display = 'none';
            } else {
              img.style.display = 'none';
              img.dataset.pngLoaded = '0';
            }

            const num = document.createElement('span');
            num.className = 'con-page-mini-num';
            num.textContent = String(i + 1);

            btn.appendChild(canvas);
            btn.appendChild(img);
            btn.appendChild(num);
            if (!initialUrl) {
              refreshMiniThumbSnapshot(btn, i, false);
            }
            frag.appendChild(btn);
          }
          strip.innerHTML = '';
          strip.appendChild(frag);
          strip.dataset.pageCount = pageCount;
        } else {
          const thumbs = strip.querySelectorAll('.con-page-mini-thumb');
          thumbs.forEach((btn, i) => {
            btn.classList.toggle('active', i === cur);
            const img = btn.querySelector('img');
            const shouldRefresh = (i === cur) || !img || img.dataset.pngLoaded !== '1';
            if (shouldRefresh) refreshMiniThumbSnapshot(btn, i, i === cur);
          });
        }

        const activeThumb = strip.querySelector('.con-page-mini-thumb.active');
        if (activeThumb && typeof activeThumb.scrollIntoView === 'function') {
          activeThumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }


      window.conScrollToTop = function (opts) {
        opts = opts || {};
        const threshold = (typeof opts.threshold === 'number') ? opts.threshold : 400;
        const behavior = opts.behavior || 'smooth';
        const force = !!opts.force;

        const brd = document.getElementById('constellation-board');
        const stickyWrapper = document.getElementById('con-sticky-wrapper');
        const sec = document.getElementById('constellation-section');

        const pageScrollY = window.pageYOffset || window.scrollY || (document.documentElement ? document.documentElement.scrollTop : 0) || (document.body ? document.body.scrollTop : 0) || 0;
        const brdScrollY = brd ? (brd.scrollTop || 0) : 0;
        const brdScrollX = brd ? (brd.scrollLeft || 0) : 0;

        // Calculate target scroll position that aligns the constellation board / sticky toolbar at the top of the viewport
        let targetPageY = 0;
        if (brd) {
          const brdRect = brd.getBoundingClientRect();
          const boardDocTop = brdRect.top + pageScrollY;
          const wrapperHeight = (stickyWrapper && stickyWrapper.offsetHeight) ? stickyWrapper.offsetHeight : 0;
          targetPageY = Math.max(0, Math.round(boardDocTop - wrapperHeight));
        }

        const pageScrolledDown = (pageScrollY - targetPageY) > threshold;
        const boardScrolledDown = (brdScrollY > threshold) || (brdScrollX > threshold);

        // Only scroll if a certain scroll down is present (> 400px) or forced
        if (!force && !pageScrolledDown && !boardScrolledDown) {
          return;
        }

        // 1. Scroll outer window/page to top of constellation board / sticky toolbar if scrolled down
        if (force || pageScrolledDown) {
          try {
            window.scrollTo({ top: targetPageY, left: 0, behavior: behavior });
          } catch (_) {
            window.scrollTo(0, targetPageY);
          }
        }

        // 2. Reset internal board canvas scroll smoothly if canvas was scrolled down or outer page adjusted
        if (brd && (force || boardScrolledDown || brdScrollY > 0 || brdScrollX > 0)) {
          try {
            brd.scrollTo({ top: 0, left: 0, behavior: behavior });
          } catch (_) {
            brd.scrollTop = 0;
            brd.scrollLeft = 0;
          }
        }

        // 3. Reset section scroll if it has any overflow scroll
        if (sec && (force || sec.scrollTop > threshold || sec.scrollLeft > threshold)) {
          try {
            sec.scrollTo({ top: 0, left: 0, behavior: behavior });
          } catch (_) {
            sec.scrollTop = 0;
            sec.scrollLeft = 0;
          }
        }
      };

      window.conAddPage = function () {
        if (typeof _conCacheCurrentPageDom === 'function') {
          _conCacheCurrentPageDom();
        } else {
          // Capture the current live board into its slot
          conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
        }
        // Create a new empty page and switch to it
        const emptySnap = conBuildEmptyPageSnapshot();
        conPageSnapshots.push(emptySnap);
        if (Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs.push(null);
        conCurrentPageIndex = conPageSnapshots.length - 1;

        _conRestorePageToBoard(emptySnap, { scrollToTop: false });
        if (typeof window.conScrollToTop === 'function') window.conScrollToTop();
        conUpdatePageBar();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (!window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        }
      };

      window.conGoToPage = function (idx) {
        if (idx < 0 || idx >= conPageSnapshots.length || idx === conCurrentPageIndex) return;
        // Populate thumbnail image cache from live DOM before switching away
        if (!window._conThumbImgCache) window._conThumbImgCache = new Map();
        document.querySelectorAll('.con-media-item.con-media-kind-pics').forEach(wrap => {
          const id = wrap.dataset.id;
          const img = wrap.querySelector('img');
          if (img && img.complete && img.naturalWidth > 0) {
            const item = (typeof conMediaItems !== 'undefined') ? conMediaItems.find(m => String(m.id) === String(id)) : null;
            if (item) {
              window._conThumbImgCache.set(String(item.attachmentId || item.id), img);
            }
          }
        });

        // Detach & cache active departing page DOM and live JS state
        if (typeof _conCacheCurrentPageDom === 'function') {
          _conCacheCurrentPageDom();
        } else {
          // Save current live board into in-memory snapshot
          conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
        }

        if (typeof conBuildPageThumbnailDataUrl === 'function' && conPageSnapshots[conCurrentPageIndex]) {
          const freshThumb = conBuildPageThumbnailDataUrl(conPageSnapshots[conCurrentPageIndex], 480, 320);
          if (freshThumb) {
            if (!Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs = [];
            _conPageSnapshotPngs[conCurrentPageIndex] = freshThumb;
          }
        }
        conCurrentPageIndex = idx;

        // Attempt fast in-memory mount (cache hit)
        const mountedFromCache = (typeof _conMountCachedPage === 'function') && _conMountCachedPage(idx);

        // Fallback: Cache miss (first visit to this page or cache was cleared)
        if (!mountedFromCache) {
          const targetSnap = conPageSnapshots[conCurrentPageIndex];
          _conRestorePageToBoard(targetSnap, { scrollToTop: false });
        }

        if (typeof window.conScrollToTop === 'function') window.conScrollToTop();
        conUpdatePageBar();
        if (window._isPageWindow) {
          const textSpan = document.getElementById('con-page-window-badge-text');
          if (textSpan) {
            const label = typeof t === 'function' ? t('conPageWindowBadge') : 'Secondary Window (Saving Disabled)';
            textSpan.textContent = `Page ${idx + 1} • ${label}`;
          }
        }

        // Broadcast target page with full attachment preload and viewport sync so mirror updates immediately
        if (!window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        }
      };

      window.conGoToPrevPage = function () { window.conGoToPage(conCurrentPageIndex - 1); };
      window.conGoToNextPage = function () { window.conGoToPage(conCurrentPageIndex + 1); };

      async function conGetAttachmentBase64(att, fallbackInfo) {
        if (!att && !fallbackInfo) return '';
        let base64 = (att && att.base64) || '';
        if (!base64 && att && att.file) {
          try { base64 = await conReadAttachmentFileBase64(att.file); } catch (_) { }
        }
        if (!base64 && att && att._cachedDataUrl && att._cachedDataUrl.startsWith('data:')) {
          const comma = att._cachedDataUrl.indexOf(',');
          if (comma >= 0) base64 = att._cachedDataUrl.slice(comma + 1);
        }
        if (!base64 && att && att._cachedObjectUrl && att._cachedObjectUrl.startsWith('blob:')) {
          try {
            const resp = await fetch(att._cachedObjectUrl);
            const blob = await resp.blob();
            base64 = await conReadAttachmentFileBase64(blob);
          } catch (_) { }
        }
        if (!base64 && window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function') {
          const candidates = att ? conAttachmentCandidateRelativePaths(att) : (fallbackInfo ? conAttachmentCandidateRelativePaths(fallbackInfo) : []);
          for (const p of candidates) {
            try {
              const res = await Desktop.readByPath('mindmaps', p, { encoding: 'base64' });
              if (res && res.ok && res.content) {
                base64 = String(res.content);
                break;
              }
            } catch (_) { }
          }
        }
        return base64 || '';
      }

      async function conCollectAttachmentsForPages(pages) {
        const referencedMap = new Map();
        (Array.isArray(pages) ? pages : []).forEach(page => {
          if (!page) return;
          if (Array.isArray(page.media)) {
            page.media.forEach(m => {
              if (!m) return;
              const attId = String(m.attachmentId || m.id || '').trim();
              if (attId && !referencedMap.has(attId)) {
                referencedMap.set(attId, { kind: m.kind, name: m.name, relativePath: m.relativePath, mime: m.mime });
              }
            });
          }
          if (page.backgroundPdf && (page.backgroundPdf.attachmentId || page.backgroundPdf.id || page.backgroundPdf.relativePath)) {
            const attId = String(page.backgroundPdf.attachmentId || page.backgroundPdf.id || '').trim();
            if (attId && !referencedMap.has(attId)) {
              referencedMap.set(attId, {
                kind: 'pdf',
                name: page.backgroundPdf.name || 'background.pdf',
                relativePath: page.backgroundPdf.relativePath || '',
                mime: page.backgroundPdf.mime || 'application/pdf'
              });
            }
          }
          if (page.boardBg && page.boardBg.attachmentId) {
            const attId = String(page.boardBg.attachmentId).trim();
            if (attId && !referencedMap.has(attId)) {
              referencedMap.set(attId, { kind: 'pdf' });
            }
          }
        });

        const collected = [];
        for (const [attId, fallbackInfo] of referencedMap.entries()) {
          let att = conFindAttachmentById(attId);
          if (!att && fallbackInfo && fallbackInfo.name) {
            att = conAttachments.find(a => String(a.name || '').toLowerCase() === String(fallbackInfo.name).toLowerCase());
          }
          const base64 = await conGetAttachmentBase64(att, fallbackInfo);
          const name = (att && att.name) || (fallbackInfo && fallbackInfo.name) || 'file';
          const mime = (att && att.mime) || (fallbackInfo && fallbackInfo.mime) || '';
          const kind = (att && att.kind) || (fallbackInfo && fallbackInfo.kind) || (typeof conAttachmentKind === 'function' ? conAttachmentKind(name, mime) : 'pics') || 'pics';
          const size = (att && Number(att.size)) || (base64 ? Math.round(base64.length * 0.75) : 0);
          const relativePath = (att && att.relativePath) || (fallbackInfo && fallbackInfo.relativePath) || '';
          collected.push({
            id: (att && att.id) || attId,
            name,
            mime,
            kind,
            size,
            relativePath,
            base64
          });
        }
        return collected;
      }

      function conHasCopiedPages() {
        if (_conCopiedPages) {
          if (Array.isArray(_conCopiedPages)) return _conCopiedPages.length > 0;
          if (_conCopiedPages.pages && Array.isArray(_conCopiedPages.pages)) return _conCopiedPages.pages.length > 0;
        }
        try {
          const raw = sessionStorage.getItem('con_copied_pages_v2');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.length > 0;
            if (parsed && Array.isArray(parsed.pages)) return parsed.pages.length > 0;
          }
        } catch (_) { }
        return false;
      }

      function conGetCopiedPagesPackage() {
        if (_conCopiedPages) {
          if (Array.isArray(_conCopiedPages)) return { pages: _conCopiedPages, attachments: [] };
          if (_conCopiedPages.pages && Array.isArray(_conCopiedPages.pages)) return { pages: _conCopiedPages.pages, attachments: _conCopiedPages.attachments || [] };
        }
        try {
          const raw = sessionStorage.getItem('con_copied_pages_v2');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return { pages: parsed, attachments: [] };
            if (parsed && Array.isArray(parsed.pages)) return { pages: parsed.pages, attachments: parsed.attachments || [] };
          }
        } catch (_) { }
        return null;
      }

      function conPasteCopiedPagesPackage(pkg, insertIdx) {
        if (!pkg || !Array.isArray(pkg.pages) || pkg.pages.length === 0) return 0;
        const idMap = {};
        const copiedAtts = Array.isArray(pkg.attachments) ? pkg.attachments : [];

        copiedAtts.forEach(att => {
          if (!att) return;
          const incomingId = String(att.id || '').trim();
          if (!incomingId) return;

          // Check if current board already has an identical attachment
          const existingSameContent = conAttachments.find(a =>
            (att.base64 && a.base64 && a.base64 === att.base64) ||
            (att.name && a.name && String(a.name).toLowerCase() === String(att.name).toLowerCase() && Number(a.size || 0) === Number(att.size || 0) && a.kind === att.kind && (a.base64 || a._cachedObjectUrl))
          );

          if (existingSameContent) {
            idMap[incomingId] = existingSameContent.id;
            if (!existingSameContent.base64 && att.base64) {
              existingSameContent.base64 = att.base64;
            }
            if (!existingSameContent._cachedObjectUrl && existingSameContent.base64) {
              try {
                const mime = existingSameContent.mime || conGuessMimeByName(existingSameContent.name, existingSameContent.kind) || 'application/octet-stream';
                const cleanB64 = existingSameContent.base64.startsWith('data:') ? existingSameContent.base64.split(',')[1] : existingSameContent.base64;
                const binary = atob(cleanB64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const blob = new Blob([bytes], { type: mime });
                existingSameContent._cachedObjectUrl = URL.createObjectURL(blob);
              } catch (_) { }
            }
            return;
          }

          // Allocate non-colliding ID in current board
          const existingWithId = conAttachments.find(a => String(a.id || '') === incomingId);
          let targetId = incomingId;
          if (existingWithId || !targetId) {
            _conAttachmentCounter += 1;
            targetId = 'att_' + _conAttachmentCounter;
            while (conAttachments.some(a => String(a.id || '') === targetId)) {
              _conAttachmentCounter += 1;
              targetId = 'att_' + _conAttachmentCounter;
            }
          } else {
            const matchNum = targetId.match(/(\d+)$/);
            if (matchNum) {
              _conAttachmentCounter = Math.max(_conAttachmentCounter, Number(matchNum[1]) || 0);
            }
          }

          let cachedUrl = '';
          if (att.base64) {
            try {
              const mime = att.mime || conGuessMimeByName(att.name, att.kind) || 'application/octet-stream';
              const cleanB64 = att.base64.startsWith('data:') ? att.base64.split(',')[1] : att.base64;
              const binary = atob(cleanB64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const blob = new Blob([bytes], { type: mime });
              cachedUrl = URL.createObjectURL(blob);
            } catch (_) { }
          }

          const newAtt = {
            id: targetId,
            name: String(att.name || 'file'),
            mime: String(att.mime || ''),
            kind: att.kind || (typeof conAttachmentKind === 'function' ? conAttachmentKind(att.name, att.mime) : 'pics') || 'pics',
            size: Number(att.size) || (att.base64 ? Math.round(att.base64.length * 0.75) : 0),
            file: null,
            base64: att.base64 || '',
            _cachedObjectUrl: cachedUrl || '',
            relativePath: String(att.relativePath || '')
          };
          conAttachments.push(newAtt);
          idMap[incomingId] = targetId;
        });

        if (copiedAtts.length > 0 && typeof conRenderAttachmentSummary === 'function') {
          conRenderAttachmentSummary();
        }

        const clones = pkg.pages.map(snap => {
          const clone = JSON.parse(JSON.stringify(snap || {}));
          if (Array.isArray(clone.media)) {
            clone.media.forEach(m => {
              if (!m) return;
              const oldId = String(m.attachmentId || '').trim();
              if (oldId && idMap[oldId]) {
                m.attachmentId = idMap[oldId];
              }
              m.id = 'cm' + (conMediaNextId++);
            });
          }
          if (clone.backgroundPdf && clone.backgroundPdf.attachmentId) {
            const oldId = String(clone.backgroundPdf.attachmentId).trim();
            if (oldId && idMap[oldId]) {
              clone.backgroundPdf.attachmentId = idMap[oldId];
            }
          }
          if (clone.boardBg && clone.boardBg.attachmentId) {
            const oldId = String(clone.boardBg.attachmentId).trim();
            if (oldId && idMap[oldId]) {
              clone.boardBg.attachmentId = idMap[oldId];
            }
          }
          return clone;
        });

        if (typeof _conCacheCurrentPageDom === 'function') {
          _conCacheCurrentPageDom();
        }
        if (typeof _conRemapPageDomCacheOnInsertCount === 'function') {
          _conRemapPageDomCacheOnInsertCount(insertIdx, clones.length);
        }
        conPageSnapshots.splice(insertIdx, 0, ...clones);
        conCurrentPageIndex = insertIdx;
        _conRestorePageToBoard(clones[0]);
        conUpdatePageBar();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof conTriggerLivePageSnapshot === 'function') {
          conTriggerLivePageSnapshot();
        }
        return clones.length;
      }

      // Cross-window channel for page clipboard
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const _conPageClipboardChannel = new BroadcastChannel('con-page-clipboard');
          _conPageClipboardChannel.onmessage = function (ev) {
            if (ev && ev.data && ev.data.type === 'page-copied' && ev.data.payload) {
              _conCopiedPages = ev.data.payload;
              const pasteBtnMain = document.getElementById('con-paste-page-btn');
              if (pasteBtnMain) pasteBtnMain.disabled = false;
              if (typeof conPreviewUpdateSelectionUi === 'function') conPreviewUpdateSelectionUi();
            }
          };
        } catch (_) { }
      }

      window.conCopyPage = async function () {
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
        const snap = conPageSnapshots[conCurrentPageIndex];
        const attachments = await conCollectAttachmentsForPages([snap]);
        const pkg = { pages: [JSON.parse(JSON.stringify(snap))], attachments };
        _conCopiedPages = pkg;
        try { sessionStorage.setItem('con_copied_pages_v2', JSON.stringify(pkg)); } catch (_) { }
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const ch = new BroadcastChannel('con-page-clipboard');
            ch.postMessage({ type: 'page-copied', payload: pkg });
            ch.close();
          }
        } catch (_) { }
        const btn = document.getElementById('con-paste-page-btn');
        if (btn) btn.disabled = false;
        mdbToast('📋 1 page copied — use Paste Page to insert a duplicate');
      };

      window.conPastePage = function () {
        const pkg = conGetCopiedPagesPackage();
        if (!pkg || !pkg.pages || pkg.pages.length === 0) return;
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
        const insertIdx = conCurrentPageIndex + 1;
        const count = conPasteCopiedPagesPackage(pkg, insertIdx);
        mdbToast('📋 Pasted ' + count + ' page' + (count === 1 ? '' : 's') + ' starting at page ' + (conCurrentPageIndex + 1));
      };

      function conPreviewUpdateSelectionUi() {
        const count = _conPreviewSelectedIdx.size;
        const copyBtn = document.getElementById('con-pages-copy-selected-btn');
        const pasteBtn = document.getElementById('con-pages-paste-copied-btn');
        const delBtn = document.getElementById('con-pages-delete-selected-btn');
        const mergeBtn = document.getElementById('con-pages-merge-selected-btn');
        const info = document.getElementById('con-pages-selection-info');
        if (copyBtn) copyBtn.disabled = count === 0;
        if (pasteBtn) pasteBtn.disabled = !conHasCopiedPages();
        if (delBtn) delBtn.disabled = count === 0;
        if (mergeBtn) mergeBtn.disabled = count < 2;
        if (info) info.textContent = count + ' selected';
      }

      window.conPreviewToggleSelect = function (idx, checked) {
        if (checked) _conPreviewSelectedIdx.add(idx);
        else _conPreviewSelectedIdx.delete(idx);
        conPreviewUpdateSelectionUi();
      };

      window.conPreviewCopySelectedPages = async function () {
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
        const indices = Array.from(_conPreviewSelectedIdx).sort((a, b) => a - b);
        if (indices.length === 0) {
          mdbToast('Select at least one page first');
          return;
        }
        const pages = indices.map(i => JSON.parse(JSON.stringify(conPageSnapshots[i] || {})));
        const attachments = await conCollectAttachmentsForPages(pages);
        const pkg = { pages, attachments };
        _conCopiedPages = pkg;
        try { sessionStorage.setItem('con_copied_pages_v2', JSON.stringify(pkg)); } catch (_) { }
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const ch = new BroadcastChannel('con-page-clipboard');
            ch.postMessage({ type: 'page-copied', payload: pkg });
            ch.close();
          }
        } catch (_) { }
        const pasteBtnMain = document.getElementById('con-paste-page-btn');
        if (pasteBtnMain) pasteBtnMain.disabled = false;
        conPreviewUpdateSelectionUi();
        mdbToast('Copied ' + indices.length + ' page' + (indices.length === 1 ? '' : 's'));
      };

      window.conPreviewDeleteSelectedPages = function (anchorEl) {
        const indices = Array.from(_conPreviewSelectedIdx).sort((a, b) => a - b);
        if (indices.length === 0) {
          mdbToast('Select at least one page first');
          return;
        }
        if (indices.length >= conPageSnapshots.length) {
          mdbToast('Cannot delete all pages — at least one page must remain.');
          return;
        }

        const title = document.getElementById('con-page-del-popup-title');
        const confirmBtn = document.getElementById('con-page-del-confirm-btn');
        const popup = document.getElementById('con-page-del-popup');
        if (!popup || !anchorEl) return;

        title.textContent = 'Delete ' + indices.length + ' selected page' + (indices.length === 1 ? '' : 's') + '?';
        confirmBtn.style.display = '';
        confirmBtn.onclick = function () {
          conPageDelPopupClose();
          conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();

          const removeSet = new Set(indices);
          let newActiveIdx = conCurrentPageIndex;
          if (removeSet.has(conCurrentPageIndex)) {
            let found = -1;
            for (let i = conCurrentPageIndex + 1; i < conPageSnapshots.length; i++) {
              if (!removeSet.has(i)) { found = i; break; }
            }
            if (found === -1) {
              for (let i = conCurrentPageIndex - 1; i >= 0; i--) {
                if (!removeSet.has(i)) { found = i; break; }
              }
            }
            newActiveIdx = found >= 0 ? found : 0;
          }

          let shiftCount = 0;
          indices.forEach(idx => {
            if (idx < newActiveIdx) shiftCount++;
          });
          const targetIndexAfterSplice = Math.max(0, newActiveIdx - shiftCount);

          for (let i = indices.length - 1; i >= 0; i--) {
            const delIdx = indices[i];
            conPageSnapshots.splice(delIdx, 1);
            if (Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs.splice(delIdx, 1);
          }

          conCurrentPageIndex = Math.min(targetIndexAfterSplice, Math.max(0, conPageSnapshots.length - 1));
          _conRestorePageToBoard(conPageSnapshots[conCurrentPageIndex] || conBuildEmptyPageSnapshot());

          _conPreviewSelectedIdx.clear();
          conUpdatePageBar();
          window.conOpenPagePreview();
          mdbToast('Deleted ' + indices.length + ' page' + (indices.length === 1 ? '' : 's'));
        };

        const rect = anchorEl.getBoundingClientRect();
        popup.style.top = (rect.bottom + 4) + 'px';
        popup.style.left = Math.min(rect.left, window.innerWidth - 190) + 'px';
        popup.classList.add('visible');

        const handler = function (e) {
          if (!popup.contains(e.target) && e.target !== anchorEl) {
            conPageDelPopupClose();
            document.removeEventListener('click', handler, true);
          }
        };
        setTimeout(() => document.addEventListener('click', handler, true), 0);
      };

      window.conPreviewPasteCopiedPagesPrompt = async function () {
        const pkg = conGetCopiedPagesPackage();
        if (!pkg || !pkg.pages || pkg.pages.length === 0) {
          mdbToast('Copy page(s) first');
          return;
        }
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
        const total = conPageSnapshots.length;
        const raw = await showPrompt(
          'Paste copied pages after which page number?\nEnter 0 to paste at the beginning (0-' + total + ').',
          String(conCurrentPageIndex + 1)
        );
        if (raw === null) return;
        const afterPage = parseInt(String(raw).trim(), 10);
        if (!Number.isFinite(afterPage) || afterPage < 0 || afterPage > total) {
          mdbToast('Invalid page number. Use a value from 0 to ' + total);
          return;
        }

        const insertIdx = afterPage; // after page N => array index N
        const count = conPasteCopiedPagesPackage(pkg, insertIdx);
        mdbToast('Pasted ' + count + ' page' + (count === 1 ? '' : 's') + ' at page ' + (insertIdx + 1));
        window.conOpenPagePreview();
      };

      // ---- Page Merging Subsystem ----
      function _conGetSnapshotBottomY(snap) {
        if (!snap) return 0;
        let maxY = 0;
        (snap.nodes || []).forEach(n => {
          maxY = Math.max(maxY, (Number(n.y) || 0) + 60);
        });
        (snap.notes || []).forEach(n => {
          const h = Number(n.height) || Number(n.liveBaseHeight) || 120;
          maxY = Math.max(maxY, (Number(n.y) || 0) + h);
        });
        (snap.drawings || []).forEach(d => {
          maxY = Math.max(maxY, (Number(d.y) || 0) + (Number(d.h) || 0));
          (d.points || []).forEach(p => {
            if (p && Number.isFinite(p.y)) maxY = Math.max(maxY, p.y);
          });
        });
        (snap.shapes || []).forEach(s => {
          maxY = Math.max(maxY, (Number(s.y) || 0) + (Number(s.h) || 0));
          if (Number.isFinite(s.ly1)) maxY = Math.max(maxY, s.ly1);
          if (Number.isFinite(s.ly2)) maxY = Math.max(maxY, s.ly2);
        });
        (snap.groups || []).forEach(g => {
          maxY = Math.max(maxY, (Number(g.y) || 0) + (Number(g.manualH) || 150));
        });
        (snap.media || []).forEach(m => {
          maxY = Math.max(maxY, (Number(m.y) || 0) + (Number(m.h) || 200));
        });
        (snap.masks || []).forEach(m => {
          maxY = Math.max(maxY, (Number(m.y) || 0) + (Number(m.height) || 100));
        });
        (snap.tables || []).forEach(tbl => {
          maxY = Math.max(maxY, (Number(tbl.y) || 0) + (Number(tbl.height) || 160));
        });
        (snap.boardStickers || []).forEach(st => {
          maxY = Math.max(maxY, (Number(st.y) || 0) + (Number(st.size) || 40));
        });
        return maxY;
      }

      window.conMergePageSnapshots = function (targetSnap, incomingSnap, opts = {}) {
        if (!targetSnap || !incomingSnap) return targetSnap;
        const mode = opts.mode || 'stack';
        const spacing = Number.isFinite(opts.spacing) ? Number(opts.spacing) : 80;

        let yOffset = 0;
        if (mode === 'stack') {
          const currentBottom = _conGetSnapshotBottomY(targetSnap);
          yOffset = currentBottom > 0 ? (currentBottom + spacing) : 0;
        }

        const inc = JSON.parse(JSON.stringify(incomingSnap));
        const idMap = {};
        const genUid = prefix => prefix + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

        // Pre-allocate new unique IDs to avoid collision
        (inc.nodes || []).forEach(n => { idMap[n.id] = genUid('cn_m_'); });
        (inc.notes || []).forEach(n => { idMap[n.id] = genUid('cnn_m_'); });
        (inc.drawings || []).forEach(d => { idMap[d.id] = genUid('cd_m_'); });
        (inc.shapes || []).forEach(s => { idMap[s.id] = genUid('cs_m_'); });
        (inc.groups || []).forEach(g => { idMap[g.id] = genUid('cg_m_'); });
        (inc.masks || []).forEach(m => { idMap[m.id] = genUid('cmask_m_'); });
        (inc.media || []).forEach(m => { idMap[m.id] = genUid('cm_m_'); });
        (inc.tables || []).forEach(t => { idMap[t.id] = genUid('tbl_m_'); });
        (inc.boardStickers || []).forEach(st => { idMap[st.id] = genUid('stick_m_'); });

        // Merge Nodes
        (inc.nodes || []).forEach(n => {
          n.id = idMap[n.id] || genUid('cn_m_');
          n.y = Math.round((Number(n.y) || 0) + yOffset);
          (targetSnap.nodes = targetSnap.nodes || []).push(n);
        });

        // Merge Edges
        (inc.edges || []).forEach(e => {
          e.id = genUid('ce_m_');
          e.a = idMap[e.a] || e.a;
          e.b = idMap[e.b] || e.b;
          (targetSnap.edges = targetSnap.edges || []).push(e);
        });

        // Merge Notes
        (inc.notes || []).forEach(n => {
          n.id = idMap[n.id] || genUid('cnn_m_');
          if (n.nodeId && idMap[n.nodeId]) n.nodeId = idMap[n.nodeId];
          n.y = Math.round((Number(n.y) || 0) + yOffset);
          (targetSnap.notes = targetSnap.notes || []).push(n);
        });

        // Merge Drawings
        (inc.drawings || []).forEach(d => {
          d.id = idMap[d.id] || genUid('cd_m_');
          d.y = Math.round((Number(d.y) || 0) + yOffset);
          (d.points || []).forEach(p => {
            if (p && Number.isFinite(p.y)) p.y = Math.round(p.y + yOffset);
          });
          (targetSnap.drawings = targetSnap.drawings || []).push(d);
        });

        // Merge Shapes
        (inc.shapes || []).forEach(s => {
          s.id = idMap[s.id] || genUid('cs_m_');
          s.y = Math.round((Number(s.y) || 0) + yOffset);
          if (Number.isFinite(s.ly1)) s.ly1 = Math.round(s.ly1 + yOffset);
          if (Number.isFinite(s.ly2)) s.ly2 = Math.round(s.ly2 + yOffset);
          (targetSnap.shapes = targetSnap.shapes || []).push(s);
        });

        // Merge Groups
        (inc.groups || []).forEach(g => {
          g.id = idMap[g.id] || genUid('cg_m_');
          g.nodeIds = (g.nodeIds || []).map(id => idMap[id] || id);
          g.noteIds = (g.noteIds || []).map(id => idMap[id] || id);
          g.drawingIds = (g.drawingIds || []).map(id => idMap[id] || id);
          g.shapeIds = (g.shapeIds || []).map(id => idMap[id] || id);
          g.y = Math.round((Number(g.y) || 0) + yOffset);
          if (g.titleY != null) g.titleY = Math.round(Number(g.titleY) + yOffset);
          (targetSnap.groups = targetSnap.groups || []).push(g);
        });

        // Merge Media
        (inc.media || []).forEach(m => {
          m.id = idMap[m.id] || genUid('cm_m_');
          m.y = Math.round((Number(m.y) || 0) + yOffset);
          (targetSnap.media = targetSnap.media || []).push(m);
        });

        // Merge Masks
        (inc.masks || []).forEach(m => {
          m.id = idMap[m.id] || genUid('cmask_m_');
          m.y = Math.round((Number(m.y) || 0) + yOffset);
          (targetSnap.masks = targetSnap.masks || []).push(m);
        });

        // Merge Tables
        (inc.tables || []).forEach(t => {
          t.id = idMap[t.id] || genUid('tbl_m_');
          t.y = Math.round((Number(t.y) || 0) + yOffset);
          (targetSnap.tables = targetSnap.tables || []).push(t);
        });

        // Merge Stickers
        (inc.boardStickers || []).forEach(st => {
          st.id = idMap[st.id] || genUid('stick_m_');
          st.y = Math.round((Number(st.y) || 0) + yOffset);
          (targetSnap.boardStickers = targetSnap.boardStickers || []).push(st);
        });

        // Expand board height to comfortably fit all merged elements
        const finalMaxY = _conGetSnapshotBottomY(targetSnap);
        const existingHeight = Number(targetSnap.boardHeight) || 1080;
        targetSnap.boardHeight = Math.max(existingHeight, finalMaxY + 140);

        return targetSnap;
      };

      window.conPreviewMergeSelectedPagesPrompt = function () {
        const indices = Array.from(_conPreviewSelectedIdx).sort((a, b) => a - b);
        if (indices.length < 2) {
          mdbToast((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('mergePagesSelectAtLeastTwo') : 'Select at least two pages to merge');
          return;
        }

        const overlay = document.getElementById('con-page-merge-overlay');
        const targetNameEl = document.getElementById('con-page-merge-target-name');
        const summaryEl = document.getElementById('con-page-merge-summary');
        if (!overlay) return;

        const targetPage = indices[0] + 1;
        const incomingPages = indices.slice(1).map(i => 'Page ' + (i + 1)).join(', ');
        if (targetNameEl) targetNameEl.textContent = 'Page ' + targetPage;
        if (summaryEl) {
          summaryEl.innerHTML = `Merge <b>${indices.length}</b> selected pages (${incomingPages}) into destination <b>Page ${targetPage}</b>:`;
        }

        overlay.classList.add('active');
      };

      window.conClosePageMergeModal = function () {
        const overlay = document.getElementById('con-page-merge-overlay');
        if (overlay) overlay.classList.remove('active');
      };

      window.conExecutePageMerge = async function () {
        const indices = Array.from(_conPreviewSelectedIdx).sort((a, b) => a - b);
        if (indices.length < 2) {
          mdbToast('Select at least two pages to merge');
          return;
        }

        conClosePageMergeModal();

        // Push undo state so merge can be completely undone
        if (typeof window.conPushUndo === 'function') window.conPushUndo();

        // Save active page snapshot before merging
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();

        const targetIdx = indices[0];
        const sourceIndices = indices.slice(1);
        const modeInput = document.querySelector('input[name="con-merge-layout-mode"]:checked');
        const mode = modeInput ? modeInput.value : 'stack';
        const spacingInput = document.getElementById('con-merge-spacing-input');
        const spacing = spacingInput ? (parseInt(spacingInput.value, 10) || 80) : 80;
        const keepOriginals = !!(document.getElementById('con-merge-keep-originals') && document.getElementById('con-merge-keep-originals').checked);

        // Destination snapshot clone
        let targetSnap = JSON.parse(JSON.stringify(conPageSnapshots[targetIdx] || conBuildEmptyPageSnapshot()));

        // Merge each source page into destination
        for (let i = 0; i < sourceIndices.length; i++) {
          const sIdx = sourceIndices[i];
          const srcSnap = conPageSnapshots[sIdx];
          if (!srcSnap) continue;
          conMergePageSnapshots(targetSnap, srcSnap, { mode, spacing });
        }

        conPageSnapshots[targetIdx] = targetSnap;

        // Cleanup source pages if user chose not to keep them as backup
        if (!keepOriginals) {
          const removeSet = new Set(sourceIndices);
          for (let i = conPageSnapshots.length - 1; i >= 0; i--) {
            if (removeSet.has(i)) {
              conPageSnapshots.splice(i, 1);
              if (Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs.splice(i, 1);
            }
          }
        }

        // Set active page to target and restore
        conCurrentPageIndex = targetIdx;
        _conRestorePageToBoard(conPageSnapshots[conCurrentPageIndex]);

        _conPreviewSelectedIdx.clear();
        conUpdatePageBar();
        window.conOpenPagePreview();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();

        const count = indices.length;
        const targetPageNum = targetIdx + 1;
        const msg = (typeof i18n !== 'undefined' && i18n.t)
          ? i18n.t('mergePagesSuccess').replace('{count}', count).replace('{page}', targetPageNum)
          : ('Merged ' + count + ' pages into Page ' + targetPageNum);
        mdbToast(msg);
      };

      // ---- Premade Library UI Controller ----
      let _conActiveLibCategory = 'all';

      window.conOpenPremadeLibraryModal = async function () {
        const overlay = document.getElementById('con-premade-library-overlay');
        if (!overlay) return;
        overlay.classList.add('active');
        const searchInput = document.getElementById('con-lib-search');
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        await conRenderPremadeLibraryList(true);
      };

      window.conClosePremadeLibraryModal = function () {
        const overlay = document.getElementById('con-premade-library-overlay');
        if (overlay) overlay.classList.remove('active');
      };

      window.conSetPremadeLibraryCategory = function (cat, btn) {
        _conActiveLibCategory = cat;
        document.querySelectorAll('.con-lib-cat-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        conRenderPremadeLibraryList();
      };

      window.conRenderPremadeLibraryList = async function (forceReload = false) {
        const listEl = document.getElementById('con-premade-library-list');
        if (!listEl) return;
        const searchInput = document.getElementById('con-lib-search');
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

        const items = (typeof window.conGetPremadeLibraryItems === 'function')
          ? await window.conGetPremadeLibraryItems(forceReload)
          : [];

        const filtered = items.filter(item => {
          if (_conActiveLibCategory !== 'all' && item.category !== _conActiveLibCategory) {
            return false;
          }
          if (query) {
            const nameMatch = (item.name || '').toLowerCase().includes(query);
            const descMatch = (item.description || '').toLowerCase().includes(query);
            return nameMatch || descMatch;
          }
          return true;
        });

        if (filtered.length === 0) {
          listEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;font-size:0.85rem;">No premade items match your search.</div>';
          return;
        }

        listEl.innerHTML = filtered.map(item => {
          const isCustom = !!item.isCustom;
          return `
            <div class="con-lib-card" data-id="${item.id}">
              <div class="con-lib-card-header">
                <span class="con-lib-card-title" title="${item.name}">${item.name}</span>
                <span class="con-lib-card-cat">${item.category || 'widget'}</span>
              </div>
              <div class="con-lib-card-desc">${item.description || ''}</div>
              <div class="con-lib-card-actions">
                <button class="con-lib-insert-btn" onclick="conInsertItemFromLibrary('${item.id}')">
                  <span>Insert</span>
                </button>
                ${isCustom ? `<button class="con-lib-del-btn" onclick="conDeleteCustomPremadePrompt('${item.id}', event)" title="Delete custom item">Delete</button>` : ''}
              </div>
            </div>
          `;
        }).join('');
      };

      window.conInsertItemFromLibrary = async function (id) {
        const items = (typeof window.conGetPremadeLibraryItems === 'function')
          ? await window.conGetPremadeLibraryItems()
          : [];
        const item = items.find(it => it.id === id);
        if (!item) return;
        conClosePremadeLibraryModal();
        conInsertPremadeItem(item);
      };

      window.conDeleteCustomPremadePrompt = async function (id, event) {
        if (event) event.stopPropagation();
        const ok = await showConfirm('Delete this custom item from your library?');
        if (!ok) return;
        if (typeof window.conDeleteCustomPremadeItem === 'function') {
          await window.conDeleteCustomPremadeItem(id);
          conRenderPremadeLibraryList(true);
          mdbToast('Deleted item from library');
        }
      };

      window.conSaveSelectionToLibraryPrompt = async function (preferredName, explicitSelection) {
        if (typeof conCtxClose === 'function') conCtxClose();
        if (typeof wnStyleDismiss === 'function') wnStyleDismiss();
        if (typeof conBoardCtxClose === 'function') conBoardCtxClose();
        if (typeof conGroupCtxClose === 'function') conGroupCtxClose();
        if (typeof conDrawingCtxClose === 'function') conDrawingCtxClose();
        if (typeof conShapeCtxClose === 'function') conShapeCtxClose();

        let selectedNodes = [];
        let selectedNotes = [];
        let selectedGroups = [];
        let selectedDrawings = [];
        let selectedShapes = [];

        if (explicitSelection) {
          if (Array.isArray(explicitSelection.nodeIds)) {
            selectedNodes = conNodes.filter(n => explicitSelection.nodeIds.includes(n.id));
          }
          if (Array.isArray(explicitSelection.noteIds)) {
            selectedNotes = conNotes.filter(n => explicitSelection.noteIds.includes(n.id));
          }
          if (Array.isArray(explicitSelection.groupIds)) {
            selectedGroups = conGroups.filter(g => explicitSelection.groupIds.includes(g.id));
          }
          if (Array.isArray(explicitSelection.drawingIds)) {
            selectedDrawings = (typeof conDrawings !== 'undefined' ? conDrawings : []).filter(d => explicitSelection.drawingIds.includes(d.id));
          }
          if (Array.isArray(explicitSelection.shapeIds)) {
            selectedShapes = (typeof conShapes !== 'undefined' ? conShapes : []).filter(s => explicitSelection.shapeIds.includes(s.id));
          }
        } else {
          // 1. Collect selected nodes
          if (typeof window.conGetSelectedNodes === 'function') {
            selectedNodes = window.conGetSelectedNodes().filter(Boolean);
          } else if (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0) {
            selectedNodes = conNodes.filter(n => conMultiSelected.has(n.id));
          } else if (typeof conSelected !== 'undefined' && conSelected) {
            const n = conNodes.find(node => node.id === conSelected);
            if (n) selectedNodes.push(n);
          } else if (typeof conCtxNodeId !== 'undefined' && conCtxNodeId) {
            const n = conNodes.find(node => node.id === conCtxNodeId);
            if (n) selectedNodes.push(n);
          }

          // 2. Collect selected notes
          const noteIdSet = new Set(
            (typeof conNoteSelected !== 'undefined' && conNoteSelected) ? Array.from(conNoteSelected) : []
          );
          if (typeof _wnActiveNote !== 'undefined' && _wnActiveNote && _wnActiveNote.id) {
            noteIdSet.add(_wnActiveNote.id);
          }
          if (typeof _conNoteCtxData !== 'undefined' && _conNoteCtxData && _conNoteCtxData.id) {
            noteIdSet.add(_conNoteCtxData.id);
          }

          // Also include notes attached to any of the selected nodes
          selectedNodes.forEach(node => {
            conNotes.filter(n => n.nodeId === node.id).forEach(att => noteIdSet.add(att.id));
          });

          selectedNotes = conNotes.filter(n => noteIdSet.has(n.id));

          // 3. Collect selected drawings
          if (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 0) {
            selectedDrawings = (typeof conDrawings !== 'undefined' ? conDrawings : []).filter(d => conDrawingSelected.has(d.id));
          } else if (typeof _conDrawCtxId !== 'undefined' && _conDrawCtxId) {
            const d = (typeof conDrawings !== 'undefined' ? conDrawings : []).find(dr => dr.id === _conDrawCtxId);
            if (d) selectedDrawings.push(d);
          }

          // 4. Collect selected shapes
          const shapeSel = typeof window.conGetShapeSelected === 'function' ? window.conGetShapeSelected() : (typeof _conShapeSelected !== 'undefined' ? _conShapeSelected : null);
          if (shapeSel && shapeSel.size > 0) {
            selectedShapes = (typeof conShapes !== 'undefined' ? conShapes : []).filter(s => shapeSel.has(s.id));
          } else if (typeof _conShapeCtxId !== 'undefined' && _conShapeCtxId) {
            const s = (typeof conShapes !== 'undefined' ? conShapes : []).find(sh => sh.id === _conShapeCtxId);
            if (s) selectedShapes.push(s);
          }

          // 5. Fallback: if nothing selected, check if a group is focused
          if (selectedNodes.length === 0 && selectedNotes.length === 0 && selectedDrawings.length === 0 && selectedShapes.length === 0) {
            const focusedGid = (typeof conGroupFocused !== 'undefined' ? conGroupFocused : null)
              || (typeof _conGroupCtxId !== 'undefined' ? _conGroupCtxId : null);
            if (focusedGid) {
              const grp = conGroups.find(g => g.id === focusedGid);
              if (grp) {
                selectedGroups.push(grp);
                if (Array.isArray(grp.nodeIds)) {
                  selectedNodes = conNodes.filter(n => grp.nodeIds.includes(n.id));
                }
                if (Array.isArray(grp.noteIds)) {
                  selectedNotes = conNotes.filter(n => grp.noteIds.includes(n.id));
                }
                if (Array.isArray(grp.drawingIds)) {
                  selectedDrawings = (typeof conDrawings !== 'undefined' ? conDrawings : []).filter(d => grp.drawingIds.includes(d.id));
                }
                if (Array.isArray(grp.shapeIds)) {
                  selectedShapes = (typeof conShapes !== 'undefined' ? conShapes : []).filter(s => grp.shapeIds.includes(s.id));
                }
              }
            }
          }
        }

        if (selectedNodes.length === 0 && selectedNotes.length === 0 && selectedDrawings.length === 0 && selectedShapes.length === 0 && selectedGroups.length === 0) {
          if (typeof mdbToast === 'function') mdbToast('Select at least one item on the board first.');
          return;
        }

        // Find enclosing groups if not explicitly gathered
        const selectedNodeIdSet = new Set(selectedNodes.map(n => n.id));
        const selectedNoteIdSet = new Set(selectedNotes.map(n => n.id));
        const selectedDrawingIdSet = new Set(selectedDrawings.map(d => d.id));
        const selectedShapeIdSet = new Set(selectedShapes.map(s => s.id));
        if (selectedGroups.length === 0 && Array.isArray(conGroups)) {
          conGroups.forEach(g => {
            const gNodes = g.nodeIds || [];
            const gNotes = g.noteIds || [];
            const gDrawings = g.drawingIds || [];
            const gShapes = g.shapeIds || [];
            if (gNodes.length === 0 && gNotes.length === 0 && gDrawings.length === 0 && gShapes.length === 0) return;
            const allNodesIn = gNodes.length > 0 && gNodes.every(nid => selectedNodeIdSet.has(nid));
            const allNotesIn = gNotes.length > 0 && gNotes.every(nid => selectedNoteIdSet.has(nid));
            const allDrawingsIn = gDrawings.length > 0 && gDrawings.every(did => selectedDrawingIdSet.has(did));
            const allShapesIn = gShapes.length > 0 && gShapes.every(sid => selectedShapeIdSet.has(sid));
            if (allNodesIn || allNotesIn || allDrawingsIn || allShapesIn) {
              selectedGroups.push(g);
            }
          });
        }

        // Find edges connecting the selected items
        const allItemIds = new Set([...selectedNodeIdSet, ...selectedNoteIdSet]);
        const connectedEdges = (Array.isArray(conEdges) ? conEdges : []).filter(e => {
          return allItemIds.has(e.a) && allItemIds.has(e.b);
        });

        // Calculate default prompt name
        let defaultName = preferredName;
        if (!defaultName) {
          if (selectedGroups.length > 0 && selectedGroups[0].title) {
            defaultName = selectedGroups[0].title;
          } else if (selectedNodes.length > 0) {
            defaultName = selectedNodes[0].baseWord || (selectedNodes[0].el ? selectedNodes[0].el.textContent.trim() : '') || 'Custom Preset';
          } else if (selectedNotes.length > 0) {
            defaultName = (selectedNotes[0].text || '').trim().slice(0, 24) || 'Custom Note';
          } else if (selectedDrawings.length > 0) {
            defaultName = selectedDrawings.length === 1 ? 'Custom Drawing' : 'Custom Drawings (' + selectedDrawings.length + ')';
          } else if (selectedShapes.length > 0) {
            defaultName = selectedShapes.length === 1 ? 'Custom ' + (selectedShapes[0].type || 'Shape') : 'Custom Shapes (' + selectedShapes.length + ')';
          } else {
            defaultName = 'Custom Premade Item';
          }
        }

        const promptTitle = (typeof i18n !== 'undefined' && i18n.t)
          ? i18n.t('premadeNamePrompt') || 'Name of new premade item:'
          : 'Name of new premade item:';
        const name = await showPrompt(promptTitle, defaultName);
        if (!name || !name.trim()) return;

        const snippet = {
          nodes: selectedNodes.map(n => ({
            id: n.id,
            baseWord: n.baseWord || (n.el ? n.el.textContent.trim() : ''),
            x: n.x,
            y: n.y,
            bg: (n.el ? (n.el.style.background || n.el.style.backgroundColor) : '') || n.bg || '',
            color: (n.el ? n.el.style.color : '') || n.color || '',
            border: (n.el ? n.el.style.borderColor : '') || n.border || '',
            borderWidth: n.borderWidth != null ? n.borderWidth : (n.el ? parseFloat(n.el.style.borderWidth) || null : null),
            borderStyle: n.borderStyle || (n.el ? n.el.style.borderStyle || null : null),
            fontSize: n.fontSize || (n.el ? n.el.style.fontSize || '16px' : '16px'),
            shape: n.shape || (n.el ? n.el.dataset.shape || 'oval' : 'oval'),
            rotation: (typeof n.rotation === 'number') ? n.rotation : 0,
            fmt: n.fmt ? { ...n.fmt } : {},
            isTimer: !!n.isTimer,
            durationSec: n.durationSec || null,
            isRandom: !!n.isRandom,
            randomMin: n.isRandom ? (n.randomMin != null ? n.randomMin : 1) : undefined,
            randomMax: n.isRandom ? (n.randomMax != null ? n.randomMax : 100) : undefined,
            randomValue: n.isRandom ? (n.randomValue != null ? n.randomValue : n.randomMin) : undefined,
            isSound: !!n.isSound,
            soundAttachmentId: n.soundAttachmentId || null,
            soundName: n.soundName || null,
            soundDuration: (typeof n.soundDuration === 'number') ? n.soundDuration : null,
            isVideo: !!n.isVideo,
            videoAttachmentId: n.videoAttachmentId || null,
            videoName: n.videoName || null,
            videoDuration: (typeof n.videoDuration === 'number') ? n.videoDuration : null
          })),
          notes: selectedNotes.map(n => ({
            id: n.id,
            nodeId: n.nodeId || null,
            text: n.text || '',
            html: n.html || '',
            x: n.x,
            y: n.y,
            width: n.width || null,
            height: n.height || null,
            manualSize: !!n.manualSize,
            bg: n.bg || '#ffffff',
            color: n.color || '#111111',
            borderColor: n.borderColor || null,
            borderWidth: n.borderWidth || null,
            borderStyle: n.borderStyle || null,
            fontSize: n.fontSize || 14,
            fontFamily: n.fontFamily || null,
            bold: !!n.bold,
            italic: !!n.italic,
            underline: !!n.underline,
            strike: !!n.strike,
            hidden: !!n.hidden
          })),
          drawings: selectedDrawings.map(d => ({
            id: d.id,
            x: Number(d.x) || 0,
            y: Number(d.y) || 0,
            w: Number(d.w) || 100,
            h: Number(d.h) || 100,
            points: Array.isArray(d.points) ? JSON.parse(JSON.stringify(d.points)) : [],
            color: d.color || '#e53935',
            thickness: Number(d.thickness) || 4,
            opacity: Number.isFinite(Number(d.opacity)) ? Number(d.opacity) : 1,
            pad: d.pad || 16
          })),
          shapes: selectedShapes.map(s => ({
            id: s.id,
            type: s.type || 'rect',
            x: Number(s.x) || 0,
            y: Number(s.y) || 0,
            w: Number(s.w) || 40,
            h: Number(s.h) || 40,
            lx1: s.lx1 != null ? Number(s.lx1) : Number(s.x) || 0,
            ly1: s.ly1 != null ? Number(s.ly1) : Number(s.y) || 0,
            lx2: s.lx2 != null ? Number(s.lx2) : (Number(s.x) || 0) + (Number(s.w) || 40),
            ly2: s.ly2 != null ? Number(s.ly2) : (Number(s.y) || 0) + (Number(s.h) || 40),
            color: s.color || '#333333',
            thickness: Number(s.thickness) || 2,
            opacity: Number.isFinite(Number(s.opacity)) ? Number(s.opacity) : 1,
            fillColor: s.fillColor || 'none',
            dashStyle: s.dashStyle || 'solid',
            arrowheadSize: s.arrowheadSize || null,
            pts: Array.isArray(s.pts) ? JSON.parse(JSON.stringify(s.pts)) : null
          })),
          edges: connectedEdges.map(e => ({
            id: e.id,
            a: e.a,
            b: e.b,
            type: e.type || 'none',
            label: e.label || '',
            labelSize: e.labelSize || 11,
            labelColor: e.labelColor || '#333333',
            colorMode: e.colorMode,
            strokeColor: e.strokeColor
          })),
          groups: selectedGroups.map(g => ({
            id: g.id,
            title: g.title || '',
            nodeIds: Array.isArray(g.nodeIds) ? g.nodeIds.filter(nid => selectedNodeIdSet.has(nid)) : [],
            noteIds: Array.isArray(g.noteIds) ? g.noteIds.filter(nid => selectedNoteIdSet.has(nid)) : [],
            drawingIds: Array.isArray(g.drawingIds) ? g.drawingIds.filter(did => selectedDrawingIdSet.has(did)) : [],
            shapeIds: Array.isArray(g.shapeIds) ? g.shapeIds.filter(sid => selectedShapeIdSet.has(sid)) : [],
            mediaIds: Array.isArray(g.mediaIds) ? [...g.mediaIds] : [],
            x: g.x || 0,
            y: g.y || 0,
            paletteIdx: g.paletteIdx || 0,
            invisible: !!g.invisible,
            manualW: g.manualW || g._manualW || null,
            manualH: g.manualH || g._manualH || null
          }))
        };

        if (typeof window.conSaveCustomPremadeItem === 'function') {
          await window.conSaveCustomPremadeItem(name.trim(), 'custom', 'Custom saved snippet', snippet);
          if (typeof mdbToast === 'function') {
            mdbToast('Saved "' + name.trim() + '" to Premade Library!');
          }
          if (typeof conRenderPremadeLibraryList === 'function') {
            conRenderPremadeLibraryList(true);
          }
        }
      };

      window.conSaveNodeToLibrary = async function () {
        if ((typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 1)
          || (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0)
          || (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 0)
          || (typeof _conShapeSelected !== 'undefined' && _conShapeSelected && _conShapeSelected.size > 0)) {
          return window.conSaveSelectionToLibraryPrompt();
        }

        const id = (window.conGetCtxNodeId && window.conGetCtxNodeId()) || (window.conGetSelected && window.conGetSelected());
        const node = (window.conGetNodes ? window.conGetNodes() : []).find(n => n.id === id);
        if (typeof conCtxClose === 'function') conCtxClose();
        if (!node) {
          if (typeof mdbToast === 'function') mdbToast('No node selected.');
          return;
        }

        const name = await showPrompt('Name for this premade node:', node.baseWord || 'Custom Node');
        if (!name || !name.trim()) return;

        const attachedNote = conNotes.find(n => n.nodeId === node.id);

        const snippet = {
          nodes: [{
            id: node.id,
            baseWord: node.baseWord || '',
            x: 0, y: 0,
            bg: node.el ? node.el.style.background || '' : '',
            color: node.el ? node.el.style.color || '' : '',
            border: node.el ? node.el.style.borderColor || '' : '',
            borderWidth: node.borderWidth || null,
            borderStyle: node.borderStyle || null,
            fontSize: node.fontSize || '16px',
            shape: node.shape || 'oval',
            rotation: (typeof node.rotation === 'number') ? node.rotation : 0,
            fmt: node.fmt ? { ...node.fmt } : {},
            isTimer: !!node.isTimer,
            durationSec: node.durationSec || null,
            isRandom: !!node.isRandom,
            randomMin: node.isRandom ? (node.randomMin != null ? node.randomMin : 1) : undefined,
            randomMax: node.isRandom ? (node.randomMax != null ? node.randomMax : 100) : undefined,
            randomValue: node.isRandom ? (node.randomValue != null ? node.randomValue : node.randomMin) : undefined,
            isSound: !!node.isSound,
            soundAttachmentId: node.soundAttachmentId || null,
            soundName: node.soundName || null,
            soundDuration: (typeof node.soundDuration === 'number') ? node.soundDuration : null,
            isVideo: !!node.isVideo,
            videoAttachmentId: node.videoAttachmentId || null,
            videoName: node.videoName || null,
            videoDuration: (typeof node.videoDuration === 'number') ? node.videoDuration : null
          }],
          notes: attachedNote ? [{
            id: attachedNote.id,
            nodeId: node.id,
            text: attachedNote.text || '',
            html: attachedNote.html || '',
            x: 180, y: 0,
            width: attachedNote.width || null,
            height: attachedNote.height || null,
            manualSize: !!attachedNote.manualSize,
            bg: attachedNote.bg || '#ffffff',
            color: attachedNote.color || '#111111',
            borderColor: attachedNote.borderColor || null,
            borderWidth: attachedNote.borderWidth || null,
            borderStyle: attachedNote.borderStyle || null,
            fontSize: attachedNote.fontSize || 14
          }] : []
        };

        if (typeof window.conSaveCustomPremadeItem === 'function') {
          await window.conSaveCustomPremadeItem(name.trim(), 'custom', 'Saved custom node', snippet);
          if (typeof mdbToast === 'function') mdbToast('Saved "' + name.trim() + '" to Premade Library!');
          if (typeof conRenderPremadeLibraryList === 'function') conRenderPremadeLibraryList(true);
        }
      };

      window.wnSaveNoteToLibrary = async function () {
        if ((typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 1)
          || (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0)
          || (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 0)
          || (typeof _conShapeSelected !== 'undefined' && _conShapeSelected && _conShapeSelected.size > 0)) {
          return window.conSaveSelectionToLibraryPrompt();
        }

        const nd = (typeof _wnActiveNote !== 'undefined' && _wnActiveNote) || (typeof _conNoteCtxData !== 'undefined' && _conNoteCtxData);
        if (typeof wnStyleDismiss === 'function') wnStyleDismiss();
        if (!nd) {
          if (typeof mdbToast === 'function') mdbToast('No note selected.');
          return;
        }

        const snippetText = (nd.text || '').trim().slice(0, 24) || 'Custom Note';
        const name = await showPrompt('Name for this premade note:', snippetText);
        if (!name || !name.trim()) return;

        const snippet = {
          notes: [{
            id: nd.id,
            nodeId: null,
            text: nd.text || '',
            html: nd.html || '',
            x: 0, y: 0,
            width: nd.width || null,
            height: nd.height || null,
            manualSize: !!nd.manualSize,
            bg: nd.bg || '#ffffff',
            color: nd.color || '#111111',
            borderColor: nd.borderColor || null,
            borderWidth: nd.borderWidth || null,
            borderStyle: nd.borderStyle || null,
            fontSize: nd.fontSize || 14
          }]
        };

        if (typeof window.conSaveCustomPremadeItem === 'function') {
          await window.conSaveCustomPremadeItem(name.trim(), 'custom', 'Saved sticky note', snippet);
          if (typeof mdbToast === 'function') mdbToast('Saved "' + name.trim() + '" to Premade Library!');
          if (typeof conRenderPremadeLibraryList === 'function') conRenderPremadeLibraryList(true);
        }
      };

      // ---- Page Preview (thumbnails, reorder, delete) ----
      let _conPreviewDragIdx = null; // index of the thumb being dragged

      function conBuildPageThumbnailDataUrl(snap, width = 480, height = 320) {
        try {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = width;
          offCanvas.height = height;
          conRenderPageThumbnail(snap, offCanvas);
          let url = offCanvas.toDataURL('image/webp', 0.82);
          if (!url || !url.startsWith('data:image/webp')) {
            url = offCanvas.toDataURL('image/png');
          }
          return url;
        } catch (_) {
          return '';
        }
      }
      window.conBuildPageThumbnailDataUrl = conBuildPageThumbnailDataUrl;

      function conRenderPageThumbnail(snap, canvas) {
        const W = canvas.width, H = canvas.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        const nodes = (snap && snap.nodes) || [];
        const edges = (snap && snap.edges) || [];
        const notes = (snap && snap.notes) || [];
        const masks = (snap && snap.masks) || [];
        const media = (snap && (snap.media || snap.images)) || [];
        const drawings = (snap && (snap.drawings || snap.strokes)) || [];
        const pdfBg = (snap && (snap.pdf || snap.pdfBackground || snap.conPageBackgroundPdf)) || null;

        const hasContent = nodes.length > 0 || notes.length > 0 || masks.length > 0 || media.length > 0 || drawings.length > 0 || !!pdfBg;

        if (!hasContent) {
          ctx.fillStyle = '#ccc';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('(empty)', W / 2, H / 2 + 4);
          return;
        }

        // Collect all points to determine bounding box clipped to lowest/rightmost element
        const allPts = [
          { x: 0, y: 0 } // Include top-left origin so page top stays anchored
        ];

        nodes.forEach(n => {
          const nx = Number(n.x) || 0, ny = Number(n.y) || 0;
          const nw = Number(n.w || n.width) || 80;
          const nh = Number(n.h || n.height) || 32;
          const rot = Number(n.rotation) || 0;
          if (!rot || rot % 360 === 0) {
            allPts.push({ x: nx, y: ny });
            allPts.push({ x: nx + nw, y: ny + nh });
          } else {
            const rad = rot * Math.PI / 180;
            const cos = Math.abs(Math.cos(rad));
            const sin = Math.abs(Math.sin(rad));
            const bbW = nw * cos + nh * sin;
            const bbH = nw * sin + nh * cos;
            const cx = nx + nw / 2;
            const cy = ny + nh / 2;
            allPts.push({ x: cx - bbW / 2, y: cy - bbH / 2 });
            allPts.push({ x: cx + bbW / 2, y: cy + bbH / 2 });
          }
        });

        notes.forEach(n => {
          const nx = Number(n.x) || 0, ny = Number(n.y) || 0;
          const nw = Number(n.w || n.width || n.liveBaseWidth) || 120;
          const nh = Number(n.h || n.height || n.liveBaseHeight) || 40;
          allPts.push({ x: nx, y: ny });
          allPts.push({ x: nx + nw, y: ny + nh });
        });

        masks.forEach(m => {
          const mx = Number(m.x) || 0, my = Number(m.y) || 0;
          allPts.push({ x: mx, y: my });
          allPts.push({ x: mx + (Number(m.w || m.width) || 100), y: my + (Number(m.h || m.height) || 100) });
        });

        media.forEach(m => {
          const mx = Number(m.x) || 0, my = Number(m.y) || 0;
          allPts.push({ x: mx, y: my });
          allPts.push({ x: mx + (Number(m.w || m.width) || 120), y: my + (Number(m.h || m.height) || 90) });
        });

        drawings.forEach(d => {
          if (Array.isArray(d.points)) {
            d.points.forEach(p => allPts.push({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
          } else if (d.x != null && d.y != null) {
            const dx = Number(d.x) || 0, dy = Number(d.y) || 0;
            allPts.push({ x: dx, y: dy });
            if (d.width || d.w) allPts.push({ x: dx + (Number(d.width || d.w) || 0), y: dy + (Number(d.height || d.h) || 0) });
          }
        });

        if (pdfBg) {
          const px = Number(pdfBg.x) || 0, py = Number(pdfBg.y) || 0;
          allPts.push({ x: px, y: py });
          allPts.push({ x: px + (Number(pdfBg.width || pdfBg.w) || 600), y: py + (Number(pdfBg.height || pdfBg.h) || 800) });
        }

        const pad = 6;
        const xs = allPts.map(p => p.x), ys = allPts.map(p => p.y);
        let minX = Math.min(0, Math.min(...xs)), maxX = Math.max(100, Math.max(...xs));
        let minY = Math.min(0, Math.min(...ys)), maxY = Math.max(100, Math.max(...ys));
        const spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
        const scaleX = (W - pad * 2) / spanX, scaleY = (H - pad * 2) / spanY;
        const scale = Math.min(scaleX, scaleY);
        const offX = pad + (W - pad * 2 - spanX * scale) / 2;
        const offY = pad + (H - pad * 2 - spanY * scale) / 2;

        function tx(x) { return offX + (x - minX) * scale; }
        function ty(y) { return offY + (y - minY) * scale; }

        // Draw PDF Background if present
        if (pdfBg) {
          ctx.fillStyle = '#f5f5f7';
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 0.8;
          const px = tx(pdfBg.x || 0), py = ty(pdfBg.y || 0);
          const pw = (pdfBg.width || pdfBg.w || 600) * scale;
          const ph = (pdfBg.height || pdfBg.h || 800) * scale;
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeRect(px, py, pw, ph);
          ctx.fillStyle = '#999999';
          ctx.font = '8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('PDF', px + pw / 2, py + ph / 2 + 3);
        }

        // Draw Media / Images / PDF / Audio / Video
        media.forEach(m => {
          const mx = tx(m.x || 0), my = ty(m.y || 0);
          const mw = Math.max(4, (m.w || m.width || 120) * scale);
          const mh = Math.max(4, (m.h || m.height || 90) * scale);
          const kind = m.kind || 'pics';

          if (kind === 'pics') {
            let drawn = false;
            const cacheKey = String(m.attachmentId || m.id || '');
            if (!window._conThumbImgCache) window._conThumbImgCache = new Map();
            let cachedImg = window._conThumbImgCache.get(cacheKey);

            if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
              try {
                ctx.drawImage(cachedImg, mx, my, mw, mh);
                drawn = true;
              } catch (_) { }
            }

            if (!drawn) {
              const liveImg = document.querySelector('.con-media-item[data-id="' + m.id + '"] img');
              if (liveImg && liveImg.complete && liveImg.naturalWidth > 0) {
                try {
                  ctx.drawImage(liveImg, mx, my, mw, mh);
                  drawn = true;
                  window._conThumbImgCache.set(cacheKey, liveImg);
                } catch (_) { }
              }
            }

            if (!drawn) {
              ctx.fillStyle = '#f5f5f0';
              ctx.strokeStyle = '#333333';
              ctx.lineWidth = 0.8;
              ctx.fillRect(mx, my, mw, mh);
              ctx.strokeRect(mx, my, mw, mh);
              ctx.fillStyle = '#666666';
              ctx.font = Math.max(6, Math.min(11, Math.round(mh * 0.3))) + 'px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('🖼️', mx + mw / 2, my + mh / 2);

              const att = (typeof conFindAttachmentById === 'function' ? conFindAttachmentById(m.attachmentId || m.id) : null) || m;
              const src = (att && (att._cachedDataUrl || att._cachedObjectUrl)) || (m && m._cachedDataUrl) || (_conMirrorAttachmentPreload && _conMirrorAttachmentPreload[cacheKey]) || '';
              if (src) {
                const img = new Image();
                img.onload = function () {
                  window._conThumbImgCache.set(cacheKey, img);
                  if (typeof conUpdatePageBar === 'function') conUpdatePageBar();
                };
                img.src = src;
              }
            }
          } else if (kind === 'pdf') {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 0.8;
            ctx.fillRect(mx, my, mw, mh);
            ctx.strokeRect(mx, my, mw, mh);
            ctx.fillStyle = '#e2c96e';
            ctx.fillRect(mx, my, mw, Math.max(3, mh * 0.18));
            ctx.fillStyle = '#333333';
            ctx.font = Math.max(5, Math.min(10, Math.round(mh * 0.22))) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📄 PDF', mx + mw / 2, my + mh / 2);
          } else {
            ctx.fillStyle = '#f5f5f0';
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 0.8;
            ctx.fillRect(mx, my, mw, mh);
            ctx.strokeRect(mx, my, mw, mh);
            ctx.fillStyle = '#333333';
            ctx.font = Math.max(6, Math.min(12, Math.round(mh * 0.35))) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(kind === 'sounds' ? '🔊' : '🎬', mx + mw / 2, my + mh / 2);
          }
        });

        // Draw masks
        masks.forEach(m => {
          ctx.globalAlpha = Number(m.opacity) || 0.9;
          ctx.fillStyle = m.color || '#111';
          const mx = tx(m.x), my = ty(m.y);
          ctx.fillRect(mx, my, (m.width || m.w || 100) * scale, (m.height || m.h || 100) * scale);
        });
        ctx.globalAlpha = 1;

        // Draw drawings / strokes
        drawings.forEach(d => {
          if (Array.isArray(d.points) && d.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(tx(d.points[0].x), ty(d.points[0].y));
            for (let i = 1; i < d.points.length; i++) {
              ctx.lineTo(tx(d.points[i].x), ty(d.points[i].y));
            }
            ctx.strokeStyle = d.color || '#333';
            ctx.lineWidth = Math.max(0.6, (d.width || 2) * scale);
            ctx.stroke();
          }
        });

        // Draw groups first (behind edges and nodes)
        const groups = (snap && snap.groups) || [];
        groups.forEach(g => {
          const gx = tx(g.x || 0), gy = ty(g.y || 0);
          const gw = (Number(g.w || g.width) || 200) * scale;
          const gh = (Number(g.h || g.height) || 150) * scale;
          ctx.fillStyle = g.bg || '#f3f4f6';
          ctx.strokeStyle = g.borderColor || '#aaa';
          ctx.lineWidth = 1;
          ctx.strokeRect(gx, gy, gw, gh);
        });

        // Build anchor id -> center position map covering nodes, notes, and groups
        const anchorPos = {};
        nodes.forEach(n => {
          const nw = (Number(n.w || n.width) || 80) * scale;
          const nh = (Number(n.h || n.height) || 32) * scale;
          const pt = { x: tx(n.x) + nw / 2, y: ty(n.y) + nh / 2 };
          anchorPos[n.id] = pt;
          anchorPos[String(n.id)] = pt;
        });
        (notes || []).forEach(nt => {
          const nw = (Number(nt.w || nt.width) || 140) * scale;
          const nh = (Number(nt.h || nt.height) || 100) * scale;
          const pt = { x: tx(nt.x) + nw / 2, y: ty(nt.y) + nh / 2 };
          anchorPos[nt.id] = pt;
          anchorPos[String(nt.id)] = pt;
        });
        groups.forEach(g => {
          const gw = (Number(g.w || g.width) || 200) * scale;
          const gh = (Number(g.h || g.height) || 150) * scale;
          const pt = { x: tx(g.x || 0) + gw / 2, y: ty(g.y || 0) + gh / 2 };
          anchorPos[g.id] = pt;
          anchorPos[String(g.id)] = pt;
        });

        // Draw edges between any anchors (nodes, notes, groups)
        edges.forEach(e => {
          const pa = anchorPos[e.a], pb = anchorPos[e.b];
          if (!pa || !pb) return;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.strokeStyle = e.strokeColor || e.color || '#888888';
          ctx.lineWidth = Math.max(0.6, (e.thickness || 1.5) * scale * 0.8);
          ctx.stroke();
        });

        // Draw nodes
        nodes.forEach(n => {
          const nw = (Number(n.w || n.width) || 80) * scale;
          const nh = (Number(n.h || n.height) || 32) * scale;
          const px = tx(n.x), py = ty(n.y);
          const bg = n.bg || '#ffffff';
          const border = n.border || '#333';
          const color = n.color || '#111';
          const rot = Number(n.rotation) || 0;
          ctx.save();
          if (rot && rot % 360 !== 0) {
            ctx.translate(px + nw / 2, py + nh / 2);
            ctx.rotate(rot * Math.PI / 180);
            ctx.translate(-(px + nw / 2), -(py + nh / 2));
          }
          ctx.fillStyle = bg;
          ctx.fillRect(px, py, Math.max(8, nw), Math.max(6, nh));
          ctx.strokeStyle = border;
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, Math.max(8, nw), Math.max(6, nh));
          const word = n.baseWord || n.word || '';
          if (word && W >= 80 && nh >= 8) {
            ctx.fillStyle = color;
            const fontPx = Math.max(6, Math.min(14, Math.round(nh * 0.55)));
            ctx.font = `600 ${fontPx}px "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.rect(px + 1, py + 1, nw - 2, nh - 2);
            ctx.clip();
            ctx.fillText(word, px + nw / 2, py + nh / 2);
            ctx.restore();
          }
          ctx.restore();
        });

        // Draw notes
        notes.forEach(n => {
          const nw = (Number(n.w || n.width || n.liveBaseWidth) || 120) * scale;
          const nh = (Number(n.h || n.height || n.liveBaseHeight) || 40) * scale;
          const px = tx(n.x), py = ty(n.y);
          ctx.fillStyle = n.bg || '#fffde7';
          ctx.strokeStyle = n.borderColor || '#bbb';
          ctx.lineWidth = 1;
          ctx.fillRect(px, py, Math.max(8, nw), Math.max(8, nh));
          ctx.strokeRect(px, py, Math.max(8, nw), Math.max(8, nh));
          const text = n.text || '';
          if (text && W >= 120 && nh >= 10) {
            ctx.fillStyle = n.color || '#333';
            const fontPx = Math.max(6, Math.min(14, Math.round(Math.min(16, nh * 0.35))));
            ctx.font = `400 ${fontPx}px "Segoe UI", sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.save();
            ctx.rect(px + 2, py + 2, nw - 4, nh - 4);
            ctx.clip();
            const rawLines = text.split('\n');
            const lh = fontPx * 1.35;
            let curY = py + 3;
            for (let li = 0; li < rawLines.length; li++) {
              if (curY + lh > py + nh - 2) break;
              ctx.fillText(rawLines[li], px + 3, curY);
              curY += lh;
            }
            ctx.restore();
          }
        });
      }

      window.conOpenPagePreview = function () {
        // Capture current page
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
        _conPreviewSelectedIdx = new Set();

        const overlay = document.getElementById('con-pages-overlay');
        const list = document.getElementById('con-pages-list');
        if (!overlay || !list) return;

        list.innerHTML = '';

        const thumbEls = [];
        conPageSnapshots.forEach((snap, idx) => {
          const thumb = document.createElement('div');
          thumb.className = 'con-page-thumb' + (idx === conCurrentPageIndex ? ' active-page' : '');
          thumb.dataset.idx = idx;
          thumb.draggable = true;
          thumb.title = 'Page ' + (idx + 1);

          const selectWrap = document.createElement('label');
          selectWrap.className = 'con-page-thumb-select';
          const selectCb = document.createElement('input');
          selectCb.type = 'checkbox';
          selectCb.checked = _conPreviewSelectedIdx.has(idx);
          selectCb.addEventListener('click', function (e) {
            e.stopPropagation();
          });
          selectCb.addEventListener('change', function (e) {
            window.conPreviewToggleSelect(idx, !!e.target.checked);
          });
          selectWrap.appendChild(selectCb);

          // Canvas placeholder — replaced by real PNG asynchronously below
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 110;
          canvas.className = 'con-page-thumb-canvas';
          conRenderPageThumbnail(snap, canvas);

          const label = document.createElement('div');
          label.className = 'con-page-thumb-label';
          label.textContent = 'Page ' + (idx + 1) + (idx === conCurrentPageIndex ? ' ●' : '');

          const delBtn = document.createElement('button');
          delBtn.className = 'con-page-thumb-del';
          delBtn.textContent = '✕';
          delBtn.title = 'Delete page';
          delBtn.onclick = function (e) {
            e.stopPropagation();
            window.conPreviewDeletePage(idx, delBtn);
          };

          thumb.appendChild(selectWrap);
          thumb.appendChild(canvas);
          thumb.appendChild(label);
          thumb.appendChild(delBtn);
          thumbEls.push({ thumb, canvas });

          // Navigate on click
          thumb.addEventListener('click', function () {
            conClosePagePreview();
            window.conGoToPage(idx);
          });

          // Context menu (Open image in new window, Duplicate, Delete)
          thumb.addEventListener('contextmenu', function (e) {
            conShowMiniThumbContextMenu(e, idx);
          });

          // Drag-and-drop reorder
          thumb.addEventListener('dragstart', function (e) {
            _conPreviewDragIdx = idx;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => thumb.style.opacity = '0.4', 0);
          });
          thumb.addEventListener('dragend', function () {
            thumb.style.opacity = '';
            document.querySelectorAll('.con-page-thumb').forEach(t => t.classList.remove('drag-over'));
          });
          thumb.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            document.querySelectorAll('.con-page-thumb').forEach(t => t.classList.remove('drag-over'));
            if (_conPreviewDragIdx !== idx) thumb.classList.add('drag-over');
          });
          thumb.addEventListener('drop', function (e) {
            e.preventDefault();
            thumb.classList.remove('drag-over');
            if (_conPreviewDragIdx !== null && _conPreviewDragIdx !== idx) {
              window.conPreviewMovePage(_conPreviewDragIdx, idx);
            }
            _conPreviewDragIdx = null;
          });

          list.appendChild(thumb);
        });

        conPreviewUpdateSelectionUi();
        overlay.classList.add('active');

        // Async: replace canvas placeholders with real saved PNGs where available
        thumbEls.forEach(({ thumb, canvas }, idx) => {
          if (_conPageSnapshotPngs && _conPageSnapshotPngs[idx]) {
            if (!thumb.isConnected) return;
            const img = document.createElement('img');
            img.src = _conPageSnapshotPngs[idx];
            img.style.cssText = 'display:block;width:160px;height:110px;object-fit:contain;border-radius:2px;background:#fff;';
            thumb.replaceChild(img, canvas);
            return;
          }
          if (_conCurrentFolderName && window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function') {
            const padded = String(idx + 1).padStart(3, '0');
            const webpPath = _conCurrentFolderName + '/page-snapshots/page-' + padded + '.webp';
            const pngPath = _conCurrentFolderName + '/page-snapshots/page-' + padded + '.png';
            Desktop.readByPath('mindmaps', webpPath, { encoding: 'base64' }).then(async res => {
              let snapRes = res;
              let mime = 'image/webp';
              if (!(snapRes && snapRes.ok && snapRes.content)) {
                snapRes = await Desktop.readByPath('mindmaps', pngPath, { encoding: 'base64' });
                mime = 'image/png';
              }
              if (!(snapRes && snapRes.ok && snapRes.content)) return;
              if (!thumb.isConnected) return; // popup was closed before response
              const dataUrl = 'data:' + mime + ';base64,' + snapRes.content;
              if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
              _conPageSnapshotPngs[idx] = dataUrl;
              const img = document.createElement('img');
              img.src = dataUrl;
              img.style.cssText = 'display:block;width:160px;height:110px;object-fit:contain;border-radius:2px;background:#fff;';
              thumb.replaceChild(img, canvas);
            }).catch(() => { });
          } else {
            const snap = (idx === conCurrentPageIndex) ? conBuildPageSnapshot() : (conPageSnapshots && conPageSnapshots[idx]);
            if (snap && typeof conBuildPageThumbnailDataUrl === 'function') {
              const dataUrl = conBuildPageThumbnailDataUrl(snap);
              if (dataUrl) {
                if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
                _conPageSnapshotPngs[idx] = dataUrl;
                if (thumb.isConnected) {
                  const img = document.createElement('img');
                  img.src = dataUrl;
                  img.style.cssText = 'display:block;width:160px;height:110px;object-fit:contain;border-radius:2px;background:#fff;';
                  thumb.replaceChild(img, canvas);
                }
              }
            }
          }
        });
      };

      window.conClosePagePreview = function () {
        const overlay = document.getElementById('con-pages-overlay');
        if (overlay) overlay.classList.remove('active');
      };

      window.conPreviewDeletePage = function (idx, anchorEl) {
        if (conPageSnapshots.length <= 1) {
          // Show a brief non-blocking message inside the popup label instead of alert
          const title = document.getElementById('con-page-del-popup-title');
          const popup = document.getElementById('con-page-del-popup');
          if (title && popup && anchorEl) {
            title.textContent = 'Only one page – cannot delete.';
            document.getElementById('con-page-del-confirm-btn').style.display = 'none';
            const rect = anchorEl.getBoundingClientRect();
            popup.style.top = (rect.bottom + 4) + 'px';
            popup.style.left = Math.min(rect.left, window.innerWidth - 190) + 'px';
            popup.classList.add('visible');
            const handler = function (e) {
              if (!popup.contains(e.target) && e.target !== anchorEl) {
                conPageDelPopupClose();
                document.removeEventListener('click', handler, true);
              }
            };
            setTimeout(() => document.addEventListener('click', handler, true), 0);
          }
          return;
        }

        const title = document.getElementById('con-page-del-popup-title');
        const confirmBtn = document.getElementById('con-page-del-confirm-btn');
        const popup = document.getElementById('con-page-del-popup');
        if (!popup || !anchorEl) return;

        title.textContent = 'Delete page ' + (idx + 1) + '?';
        confirmBtn.style.display = '';
        confirmBtn.onclick = function () {
          conPageDelPopupClose();
          // If deleting current page, switch first
          if (idx === conCurrentPageIndex) {
            const goTo = idx > 0 ? idx - 1 : 1;
            conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
            conCurrentPageIndex = goTo;
            _conRestorePageToBoard(conPageSnapshots[conCurrentPageIndex]);
          }
          conPageSnapshots.splice(idx, 1);
          if (Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs.splice(idx, 1);
          // If the deleted page was before the current one, the array shifted left —
          // decrement so conCurrentPageIndex still points to the page being displayed.
          if (idx < conCurrentPageIndex) {
            conCurrentPageIndex--;
          }
          if (conCurrentPageIndex >= conPageSnapshots.length) {
            conCurrentPageIndex = conPageSnapshots.length - 1;
          }
          conUpdatePageBar();
          window.conOpenPagePreview(); // refresh
        };

        const rect = anchorEl.getBoundingClientRect();
        popup.style.top = (rect.bottom + 4) + 'px';
        popup.style.left = Math.min(rect.left, window.innerWidth - 190) + 'px';
        popup.classList.add('visible');

        const handler = function (e) {
          if (!popup.contains(e.target) && e.target !== anchorEl) {
            conPageDelPopupClose();
            document.removeEventListener('click', handler, true);
          }
        };
        setTimeout(() => document.addEventListener('click', handler, true), 0);
      };

      window.conPageDelPopupClose = function () {
        const popup = document.getElementById('con-page-del-popup');
        if (popup) popup.classList.remove('visible');
      };

      window.conPreviewMovePage = function (fromIdx, toIdx) {
        const snap = conPageSnapshots.splice(fromIdx, 1)[0];
        conPageSnapshots.splice(toIdx, 0, snap);
        if (Array.isArray(_conPageSnapshotPngs)) {
          const movedPng = _conPageSnapshotPngs.splice(fromIdx, 1)[0];
          _conPageSnapshotPngs.splice(toIdx, 0, movedPng || null);
        }
        // Adjust current page index to follow the moved/shifted pages
        if (conCurrentPageIndex === fromIdx) {
          conCurrentPageIndex = toIdx;
        } else if (fromIdx < conCurrentPageIndex && toIdx >= conCurrentPageIndex) {
          conCurrentPageIndex--;
        } else if (fromIdx > conCurrentPageIndex && toIdx <= conCurrentPageIndex) {
          conCurrentPageIndex++;
        }
        conUpdatePageBar();
        window.conOpenPagePreview(); // refresh
      };

      // Expose for external call (e.g. page bar)
      window.conOpenPagePreview = window.conOpenPagePreview;
      window.conClosePagePreview = window.conClosePagePreview;
      window.conRenderPageThumbnail = conRenderPageThumbnail;

      // Expose internals needed by the import function
      window.conGetNextId = window.conGetNextId || function () {
        if (typeof window.conNextId === 'number') return window.conNextId++;
        if (typeof conNextId !== 'undefined') return conNextId++;
        return 0;
      };
      window.conGetNodes = function () { return (typeof window !== 'undefined' && window.conNodes) || (typeof global !== 'undefined' && global.conNodes) || []; };
      window.conGetBoard = function () { return document.getElementById('constellation-board'); };
      window.conAttachNode = window.conAttachNode || function (id, el) { if (typeof window.conAttachNodeEvents === 'function') return window.conAttachNodeEvents(id, el); };
      window.conGroupAttach = window.conGroupAttach || function (group) { if (typeof window.conGroupAttachEvents === 'function') return window.conGroupAttachEvents(group); };
      window.conGetCtxNodeId = window.conGetCtxNodeId || function () { return (typeof conCtxNodeId !== 'undefined' ? conCtxNodeId : (window.conCtxNodeId || null)); };
      window.conSetNextId = window.conSetNextId || function (n) {
        if (typeof window.conNextId === 'number' && n > window.conNextId) window.conNextId = n;
        else if (typeof conNextId !== 'undefined' && n > conNextId) conNextId = n;
      };
      window.conGroups = global.conGroups;
      window.conEdges = (typeof global !== 'undefined' && global.conEdges) || (typeof window !== 'undefined' && window.conEdges);
      window.CON_PALETTES = global.CON_PALETTES;
      window.conGetEdges = function () { return (typeof window !== 'undefined' && window.conEdges) || (typeof global !== 'undefined' && global.conEdges) || []; };
      window.conGetGroups = function () { return (typeof window !== 'undefined' && window.conGroups) || (typeof global !== 'undefined' && global.conGroups) || []; };
      window.conGetSelected = function () {
        if (typeof window.conSelected !== 'undefined' && window.conSelected) return window.conSelected;
        if (typeof conSelected !== 'undefined' && conSelected) return conSelected;
        return global.conSelected || null;
      };
      window.conGetMultiSelected = function () {
        if (typeof window.conMultiSelected !== 'undefined' && window.conMultiSelected) return window.conMultiSelected;
        if (typeof conMultiSelected !== 'undefined' && conMultiSelected) return conMultiSelected;
        return global.conMultiSelected || new Set();
      };
      window.conGetSelectedNodes = function () {
        const multi = (typeof window.conGetMultiSelected === 'function') ? window.conGetMultiSelected() : (window.conMultiSelected || global.conMultiSelected || conMultiSelected);
        const liveNodes = (typeof window.conGetNodes === 'function') ? window.conGetNodes() : (global.conNodes || []);
        if (multi && multi.size > 0 && Array.isArray(liveNodes)) {
          return liveNodes.filter(n => multi.has(n.id) || multi.has(String(n.id)));
        }
        const selId = (typeof window.conGetSelected === 'function' ? window.conGetSelected() : null) || global.conSelected || (typeof conCtxNodeId !== 'undefined' ? conCtxNodeId : null);
        if (selId && Array.isArray(liveNodes)) {
          const node = liveNodes.find(n => n.id === selId || String(n.id) === String(selId));
          return node ? [node] : [];
        }
        return [];
      };
      window.conDeselectAll = function () {
        if (typeof window.conNodeClearSelection === 'function') window.conNodeClearSelection();
        else if (typeof window.conSelect === 'function') window.conSelect(null);
        if (typeof window.conNoteClearSelection === 'function') window.conNoteClearSelection();
        if (typeof window.conTableClearSelection === 'function') window.conTableClearSelection();
        if (typeof window.conDrawingClearSelection === 'function') window.conDrawingClearSelection();
        if (typeof window.conShapeClearSelection === 'function') window.conShapeClearSelection();
        if (typeof window.conMediaClearSelection === 'function') window.conMediaClearSelection();
        if (typeof conMediaSelected !== 'undefined') conMediaSelected.clear();
        window._conActiveMediaItem = null;
        document.querySelectorAll('.con-media-item.con-media-selected').forEach(el => el.classList.remove('con-media-selected'));
        if (window._conSelectedEdgeId) {
          window._conSelectedEdgeId = null;
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
        }
      };
      window.conSelectAll = function () {
        conSelected = null;
        if (Array.isArray(conNodes)) {
          conNodes.forEach(n => {
            if (n && n.el) {
              n.el.classList.remove('con-selected', 'con-src');
              n.el.classList.add('con-multi-selected');
              conMultiSelected.add(n.id);
            }
          });
        }
        const allNotes = (typeof window.conGetNotes === 'function')
          ? window.conGetNotes()
          : ((typeof conNotes !== 'undefined' && Array.isArray(conNotes)) ? conNotes : (window.conNotes || []));
        allNotes.forEach(n => {
          if (typeof conNoteSelected !== 'undefined') conNoteSelected.add(n.id);
          if (typeof window.conGetNoteSelected === 'function' && window.conGetNoteSelected()) {
            window.conGetNoteSelected().add(n.id);
          }
          const el = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(n.id) : document.querySelector(`.con-word-note[data-id="${n.id}"]`);
          if (el) el.classList.add('wn-selected');
        });
        const allGroups = (typeof conGroups !== 'undefined' && Array.isArray(conGroups)) ? conGroups : [];
        allGroups.forEach(g => {
          if (g && g.el) g.el.classList.add('con-group-selected');
        });
        if (allGroups.length === 1) {
          conGroupFocused = allGroups[0].id;
        } else {
          conGroupFocused = null;
        }
        const allTables = (typeof window.conGetTables === 'function') ? window.conGetTables() : (typeof conTables !== 'undefined' ? conTables : []);
        allTables.forEach(tbl => {
          if (typeof conTableSelected !== 'undefined') conTableSelected.add(tbl.id);
          if (tbl && tbl.el) tbl.el.classList.add('con-table-selected');
        });
        const allDrawings = (typeof window.conGetDrawings === 'function') ? window.conGetDrawings() : ((typeof conDrawings !== 'undefined' && Array.isArray(conDrawings)) ? conDrawings : []);
        allDrawings.forEach(dr => {
          if (typeof conDrawingSelected !== 'undefined') conDrawingSelected.add(dr.id);
          if (dr && dr.el) {
            dr.el.classList.add('con-drawing-selected');
            dr.el.style.pointerEvents = 'auto';
            dr.el.style.cursor = 'grab';
            if (typeof window._conDrawingShowHandles === 'function') window._conDrawingShowHandles(dr);
          }
        });
        const allShapes = (typeof conShapes !== 'undefined' && Array.isArray(conShapes)) ? conShapes : [];
        allShapes.forEach(s => {
          if (typeof _conShapeSelected !== 'undefined') _conShapeSelected.add(s.id);
          if (s && s.el) s.el.classList.add('con-shape-selected');
        });
        if (typeof conUpdateToolbarStatus === 'function') conUpdateToolbarStatus();
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
      };
      window.conSelectAllNodes = function () {
        if (typeof window.conSelectAll === 'function') {
          window.conSelectAll();
        } else {
          conSelected = null;
          if (Array.isArray(conNodes)) {
            conNodes.forEach(n => {
              if (n && n.el) {
                n.el.classList.remove('con-selected');
                n.el.classList.add('con-multi-selected');
                conMultiSelected.add(n.id);
              }
            });
          }
        }
      };
      window.conDeleteSelectedItems = function () {
        if (typeof BoardAudioService !== 'undefined') BoardAudioService.playAction('delete_items');
        conPushUndo();
        if (window._conSelectedEdgeId) {
          const edgeToDelete = window._conSelectedEdgeId;
          window._conSelectedEdgeId = null;
          conRemoveEdge(edgeToDelete);
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
          return;
        }
        if (conGroupFocused) {
          if (typeof conGroupDeleteWithContents === 'function') conGroupDeleteWithContents(conGroupFocused);
          if (typeof conGroupFocus === 'function') conGroupFocus(null);
          return;
        }
        if (conMultiSelected.size > 0) {
          [...conMultiSelected].forEach(id => conRemoveNode(id));
          conMultiSelected.clear();
        } else if (conSelected) {
          conRemoveNode(conSelected);
        }
        if (typeof window.conDrawingDeleteSelected === 'function' && typeof conDrawingSelected !== 'undefined' && conDrawingSelected.size > 0) {
          window.conDrawingDeleteSelected();
        } else if (typeof conDrawingSelected !== 'undefined' && conDrawingSelected.size > 0) {
          const removedDrawingIds = [...conDrawingSelected].map(String);
          removedDrawingIds.forEach(did => {
            try {
              const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(did) : did.replace(/["\\]/g, '\\$&');
              document.querySelectorAll('#constellation-board .con-drawing[data-did="' + escaped + '"], .con-drawing[data-did="' + escaped + '"]').forEach(el => {
                try { el.remove(); } catch (_) {}
              });
            } catch (_) {}
          });
          const delSet = new Set(removedDrawingIds);
          [conDrawings, global.conDrawings, window.conDrawings].forEach(arr => {
            if (Array.isArray(arr)) {
              for (let i = arr.length - 1; i >= 0; i--) {
                if (arr[i] && delSet.has(String(arr[i].id))) arr.splice(i, 1);
              }
            }
          });
          conDrawingSelected.clear();
          const overlay = document.getElementById('con-drawing-style-overlay');
          if (overlay) overlay.classList.remove('active');
          if (typeof window.conDrawingCtxClose === 'function') window.conDrawingCtxClose();
          conGroups.forEach(g => {
            if (g.drawingIds && removedDrawingIds.length > 0) {
              const dDelSet = new Set(removedDrawingIds);
              g.drawingIds = g.drawingIds.filter(id => !dDelSet.has(String(id)));
            }
          });
          if (typeof window._conMirrorSend === 'function' && removedDrawingIds.length > 0) {
            window._conMirrorSend({ type: 'drawing-remove', ids: removedDrawingIds });
          }
        }
        if (window.conGetShapeSelected) {
          const shapeSel = window.conGetShapeSelected();
          if (shapeSel && shapeSel.size > 0) {
            const removedShapeIds = [];
            [...shapeSel].forEach(sid => {
              const s = (typeof conShapes !== 'undefined' ? conShapes : []).find(x => x.id === sid);
              if (s && s.el) s.el.remove();
              if (typeof conShapes !== 'undefined') conShapes = conShapes.filter(x => x.id !== sid);
              conGroups.forEach(g => { if (g.shapeIds) g.shapeIds = g.shapeIds.filter(id => id !== sid); });
              removedShapeIds.push(String(sid));
            });
            if (window.conShapeClearSelection) window.conShapeClearSelection();
            if (typeof window._conMirrorSend === 'function' && removedShapeIds.length > 0) {
              window._conMirrorSend({ type: 'shape-remove', ids: removedShapeIds });
            }
          }
        }
        // Delete selected notes
        const activeNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : (window.conNotes || global.conNotes || []);
        const delNoteFn = typeof window.wnDeleteNoteData === 'function' ? window.wnDeleteNoteData : (typeof wnDeleteNoteData === 'function' ? wnDeleteNoteData : null);
        const selNoteIds = new Set();
        if (typeof conNoteSelected !== 'undefined' && conNoteSelected) {
          conNoteSelected.forEach(id => selNoteIds.add(id));
        }
        if (typeof window.conGetNoteSelected === 'function') {
          const wSel = window.conGetNoteSelected();
          if (wSel) wSel.forEach(id => selNoteIds.add(id));
        }
        document.querySelectorAll('#constellation-board .con-word-note.wn-selected').forEach(el => {
          if (el.dataset && el.dataset.id) selNoteIds.add(el.dataset.id);
        });
        if (selNoteIds.size > 0) {
          [...selNoteIds].forEach(nid => {
            const nd = activeNotes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
            if (nd && delNoteFn) {
              delNoteFn(nd);
            } else {
              const el = (typeof window.wnGetNoteElementById === 'function') ? window.wnGetNoteElementById(nid) : document.querySelector(`.con-word-note[data-id="${nid}"]`);
              if (el) el.remove();
            }
          });
          if (typeof conNoteSelected !== 'undefined' && conNoteSelected) conNoteSelected.clear();
          if (typeof window.conGetNoteSelected === 'function' && window.conGetNoteSelected()) window.conGetNoteSelected().clear();
        }
        if (typeof conTableSelected !== 'undefined' && conTableSelected.size > 0) {
          [...conTableSelected].forEach(tid => {
            const tbl = (window.conGetTables ? window.conGetTables() : []).find(t => t.id === tid);
            if (tbl && tbl.el) tbl.el.remove();
            if (window.conGetTables) {
              const allTbls = window.conGetTables();
              const idx = allTbls.findIndex(t => t.id === tid);
              if (idx !== -1) allTbls.splice(idx, 1);
            }
          });
          conTableSelected.clear();
        }
        const mediaSel = (typeof window.conGetMediaSelected === 'function') ? window.conGetMediaSelected() : (typeof conMediaSelected !== 'undefined' ? conMediaSelected : new Set());
        const selMediaIds = new Set(mediaSel ? [...mediaSel] : []);
        document.querySelectorAll('#constellation-board .con-media-item.con-media-selected').forEach(el => {
          if (el.dataset && el.dataset.id) selMediaIds.add(el.dataset.id);
        });
        if (selMediaIds.size > 0) {
          selMediaIds.forEach(mid => {
            const mEl = document.querySelector(`.con-media-item[data-id="${mid}"]`);
            if (mEl) mEl.remove();
            if (typeof conMediaItems !== 'undefined') {
              conMediaItems = conMediaItems.filter(m => String(m.id) !== String(mid));
            }
            if (typeof conGroups !== 'undefined') {
              conGroups.forEach(g => { if (g.mediaIds) g.mediaIds = g.mediaIds.filter(id => String(id) !== String(mid)); });
            }
          });
          if (window.conMediaClearSelection) window.conMediaClearSelection();
        }
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
        if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      };
      window.conToggleMaskSelected = function () {
        const allNotes = (typeof window.conGetNotes === 'function')
          ? window.conGetNotes()
          : ((typeof conNotes !== 'undefined' && Array.isArray(conNotes)) ? conNotes : (window.conNotes || []));

        const selectedNodes = (conMultiSelected && conMultiSelected.size > 0)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conSelected ? [conNodes.find(n => n.id === conSelected)].filter(Boolean) : []);

        // Also check any visually selected node elements in DOM
        document.querySelectorAll('#constellation-board .con-node.con-selected, #constellation-board .con-node.con-multi-selected').forEach(el => {
          const nid = el.id || el.dataset.id;
          if (nid && !selectedNodes.some(n => n.id === nid)) {
            const found = conNodes.find(n => n.id === nid);
            if (found) selectedNodes.push(found);
          }
        });

        // Collect all selected note IDs from multiple possible sources
        const noteIdSet = new Set();
        if (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0) {
          conNoteSelected.forEach(id => noteIdSet.add(String(id)));
        }
        document.querySelectorAll('#constellation-board .con-word-note.wn-selected').forEach(el => {
          if (el.dataset.id) noteIdSet.add(String(el.dataset.id));
        });
        if (typeof _wnActiveNote !== 'undefined' && _wnActiveNote && _wnActiveNote.id) {
          noteIdSet.add(String(_wnActiveNote.id));
        }
        if (typeof _conNoteCtxData !== 'undefined' && _conNoteCtxData && _conNoteCtxData.id) {
          noteIdSet.add(String(_conNoteCtxData.id));
        }

        const selectedNotes = allNotes.filter(n => n && noteIdSet.has(String(n.id)));

        const selectedMedia = [];
        if (typeof window._conActiveMediaItem !== 'undefined' && window._conActiveMediaItem) {
          selectedMedia.push(window._conActiveMediaItem);
        } else if (typeof window._conCtxItem !== 'undefined' && window._conCtxItem && (window._conCtxItem.kind === 'pics' || window._conCtxItem.kind === 'pdf')) {
          selectedMedia.push(window._conCtxItem);
        } else {
          const selMediaEl = document.querySelector('.con-media-item.con-media-selected');
          if (selMediaEl && selMediaEl.dataset.id && typeof conMediaItems !== 'undefined') {
            const m = conMediaItems.find(it => String(it.id) === selMediaEl.dataset.id);
            if (m) selectedMedia.push(m);
          }
        }

        const hasNodeSelection = selectedNodes.length > 0;
        const hasNoteSelection = selectedNotes.length > 0;
        const hasMediaSelection = selectedMedia.length > 0;

        if (hasNodeSelection || hasNoteSelection || hasMediaSelection) {
          conPushUndo();

          // Unified visibility: if ANY item in the selection is visible, hide everything; otherwise reveal everything
          const anyVisible = (hasNodeSelection && selectedNodes.some(n => !n.masked)) ||
                             (hasNoteSelection && selectedNotes.some(n => !n.hidden)) ||
                             (hasMediaSelection && selectedMedia.some(m => !m.hidden));

          if (typeof BoardAudioService !== 'undefined') {
            if (anyVisible) BoardAudioService.playAction(hasNodeSelection ? 'mask_node' : 'mask_note');
            else BoardAudioService.playAction(hasNodeSelection ? 'reveal_node' : 'reveal_note');
          }

          if (hasNodeSelection) {
            selectedNodes.forEach(node => {
              if (!node || !node.el) return;
              node.masked = anyVisible;
              node.el.classList.toggle('con-masked', anyVisible);
            });
            // Sync node mask state to mirror view without DOM teardown
            if (typeof window._conMirrorSend === 'function') {
              window._conMirrorSend({
                type: 'node-masks',
                masks: selectedNodes.filter(n => n).map(n => ({ id: String(n.id), masked: !!n.masked }))
              });
            }
          }
          if (hasNoteSelection) {
            selectedNotes.forEach(note => {
              if (!note) return;
              note.hidden = anyVisible;
              if (typeof note._applyStyle === 'function') note._applyStyle();
              const noteEl = (typeof wnGetNoteElementById === 'function')
                ? wnGetNoteElementById(note.id)
                : document.querySelector(`.con-word-note[data-id="${note.id}"]`);
              if (typeof wnApplyHiddenState === 'function') wnApplyHiddenState(note, noteEl);
              if (noteEl) {
                const hideQuickBtn = noteEl.querySelector('.wn-note-mini-btn[title*="Hide"], .wn-note-mini-btn[title*="Reveal"]');
                if (hideQuickBtn) {
                  hideQuickBtn.classList.toggle('active', !!note.hidden);
                  hideQuickBtn.title = note.hidden ? 'Reveal note' : 'Hide note';
                }
              }
              if (typeof _wnActiveNote !== 'undefined' && _wnActiveNote && _wnActiveNote.id === note.id) {
                const hideBtn = document.getElementById('wn-sp-hide-btn');
                if (hideBtn) hideBtn.innerHTML = note.hidden ? '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Reveal' : '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Hide';
              }
            });
            // Sync note hidden state to mirror view without DOM teardown
            if (typeof window._conMirrorSend === 'function') {
              selectedNotes.filter(n => n).forEach(note => {
                window._conMirrorSend({ type: 'note-hide', id: String(note.id), hidden: !!note.hidden });
                window._conMirrorSend({ type: 'note-style', id: String(note.id), hidden: !!note.hidden });
              });
            }
          }
          if (hasMediaSelection) {
            selectedMedia.forEach(m => {
              m.hidden = anyVisible;
              const wrap = (typeof _conMediaGetWrap === 'function') ? _conMediaGetWrap(m) : document.querySelector('.con-media-item[data-id="' + m.id + '"]');
              if (wrap && typeof _conApplyMediaStyles === 'function') _conApplyMediaStyles(m, wrap);
              if (typeof _conCtxItem !== 'undefined' && _conCtxItem && _conCtxItem.id === m.id) {
                const imgHideBtn = document.getElementById('con-img-sp-hide-btn');
                if (imgHideBtn) imgHideBtn.innerHTML = m.hidden ? '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Reveal' : '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Hide';
                const pdfHideBtn = document.getElementById('con-pdf-sp-hide-btn');
                if (pdfHideBtn) pdfHideBtn.innerHTML = m.hidden ? '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Reveal' : '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Hide';
              }
            });
            // Sync media hidden state to mirror view without DOM teardown
            if (typeof window._conMirrorSend === 'function') {
              selectedMedia.forEach(m => {
                window._conMirrorSend({ type: 'media-hide', id: String(m.id), hidden: !!m.hidden });
              });
            }
          }
        } else if (conGroupFocused) {
          const group = conGroups.find(g => g.id === conGroupFocused);
          if (group) {
            const grpNodes = (group.nodeIds || []).map(nid => conNodes.find(n => n.id === nid)).filter(Boolean);
            const grpNotes = (group.noteIds || []).map(nid => allNotes.find(n => String(n.id) === String(nid))).filter(Boolean);
            if (grpNodes.length || grpNotes.length) {
              conPushUndo();
              const anyVisible = grpNodes.some(n => !n.masked) || grpNotes.some(n => !n.hidden);
              grpNodes.forEach(node => {
                if (!node || !node.el) return;
                node.masked = anyVisible;
                node.el.classList.toggle('con-masked', anyVisible);
              });
              if (grpNodes.length && typeof window._conMirrorSend === 'function') {
                window._conMirrorSend({
                  type: 'node-masks',
                  masks: grpNodes.map(nid => ({ id: String(nid.id), masked: anyVisible }))
                });
              }
              grpNotes.forEach(note => {
                if (!note) return;
                note.hidden = anyVisible;
                if (typeof note._applyStyle === 'function') note._applyStyle();
                const noteEl = (typeof wnGetNoteElementById === 'function')
                  ? wnGetNoteElementById(note.id)
                  : document.querySelector(`.con-word-note[data-id="${note.id}"]`);
                if (typeof wnApplyHiddenState === 'function') wnApplyHiddenState(note, noteEl);
                if (noteEl) {
                  const hideQuickBtn = noteEl.querySelector('.wn-note-mini-btn[title*="Hide"], .wn-note-mini-btn[title*="Reveal"]');
                  if (hideQuickBtn) {
                    hideQuickBtn.classList.toggle('active', !!note.hidden);
                    hideQuickBtn.title = note.hidden ? 'Reveal note' : 'Hide note';
                  }
                }
              });
              if (grpNotes.length && typeof window._conMirrorSend === 'function') {
                grpNotes.forEach(note => {
                  window._conMirrorSend({ type: 'note-hide', id: String(note.id), hidden: anyVisible });
                  window._conMirrorSend({ type: 'note-style', id: String(note.id), hidden: anyVisible });
                });
              }
            }
          }
        }
        if (typeof conRedrawEdges === 'function') conRedrawEdges();
        if (typeof conMarkBoardDirty === 'function') conMarkBoardDirty();
        else if (typeof boardSetDirty === 'function') boardSetDirty(true);
      };
      window.conTriggerLinkShortcut = function () {
        let srcId = null;
        // 1. Note selected or focused
        const noteSel = (typeof window.conGetNoteSelected === 'function') ? window.conGetNoteSelected() : (typeof conNoteSelected !== 'undefined' ? conNoteSelected : null);
        if (noteSel && noteSel.size === 1) {
          srcId = [...noteSel][0];
        } else if (document.activeElement && document.activeElement.closest) {
          const activeNoteEl = document.activeElement.closest('.con-word-note');
          if (activeNoteEl && activeNoteEl.dataset && activeNoteEl.dataset.id) {
            srcId = activeNoteEl.dataset.id;
          }
        }
        if (!srcId) {
          const selectedNoteEls = document.querySelectorAll('#constellation-board .con-word-note.wn-selected');
          if (selectedNoteEls.length === 1 && selectedNoteEls[0].dataset && selectedNoteEls[0].dataset.id) {
            srcId = selectedNoteEls[0].dataset.id;
          }
        }
        // 2. Node selected
        if (!srcId) {
          const selNode = (typeof window.conGetSelected === 'function') ? window.conGetSelected() : (window.conSelected || (typeof conSelected !== 'undefined' ? conSelected : null));
          if (selNode) {
            srcId = selNode;
          } else {
            const multiSel = (typeof window.conGetMultiSelected === 'function') ? window.conGetMultiSelected() : (typeof conMultiSelected !== 'undefined' ? conMultiSelected : null);
            if (multiSel && multiSel.size === 1) {
              srcId = [...multiSel][0];
            } else {
              const selNodeEl = document.querySelector('#constellation-board .con-node.con-selected');
              if (selNodeEl) srcId = selNodeEl.id;
            }
          }
        }
        // 3. Group focused
        if (!srcId) {
          const focusedGroup = (typeof window.conGetGroupFocused === 'function') ? window.conGetGroupFocused() : (window.conGroupFocused || (typeof conGroupFocused !== 'undefined' ? conGroupFocused : null));
          if (focusedGroup) srcId = focusedGroup;
        }

        if (!srcId) return;

        const currentLinkSrc = (typeof window.conGetLinkSrc === 'function') ? window.conGetLinkSrc() : (window._conLinkSrc || (typeof _conLinkSrc !== 'undefined' ? _conLinkSrc : null));
        if (currentLinkSrc === srcId) {
          if (typeof window._conCancelLinkMode === 'function') window._conCancelLinkMode();
          else if (typeof window.conCancelLinkMode === 'function') window.conCancelLinkMode();
          else if (typeof _conCancelLinkMode === 'function') _conCancelLinkMode();
          return;
        }
        if (typeof window._conStartLinkMode === 'function') {
          window._conStartLinkMode(srcId);
        } else if (typeof _conStartLinkMode === 'function') {
          _conStartLinkMode(srcId);
        }
      };
      window.conAdjustSelectedFontSize = function (delta) {
        const hasNodeSelection = conSelected || (conMultiSelected && conMultiSelected.size > 0);
        const hasNoteSelection = typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0;
        if (!hasNodeSelection && !hasNoteSelection) return;
        const targets = hasNodeSelection
          ? ((conMultiSelected && conMultiSelected.size > 0)
              ? conNodes.filter(n => conMultiSelected.has(n.id))
              : [conNodes.find(n => n.id === conSelected)].filter(Boolean))
          : [];
        const allLiveNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : (typeof conNotes !== 'undefined' ? conNotes : []);
        const noteTargets = hasNoteSelection
          ? allLiveNotes.filter(n => conNoteSelected.has(n.id) || conNoteSelected.has(String(n.id)))
          : [];
        if (!targets.length && !noteTargets.length) return;
        conPushUndo();
        window._conSuppressMirrorObserver = true;
        const resizedNodes = [];
        const _sizeAffectedPhraseGroups = new Set();
        try {
          targets.forEach(node => {
            if (conIsNodeLocked(node)) return;
            const current = conGetNodeBaseFontSize(node) || 13;
            const next = delta > 0 ? Math.min(current + delta, 96) : Math.max(current + delta, 8);
            conSetNodeBaseFontSize(node, next);
            conApplyNodeShape(node, node.shape);
            resizedNodes.push({ id: String(node.id), fontSize: next, shape: node.shape });
            if (typeof conGroupOfNode === 'function') {
              const _pg = conGroupOfNode(node.id);
              if (_pg && _pg.phraseGroup) _sizeAffectedPhraseGroups.add(_pg);
            }
          });
          noteTargets.forEach(note => {
            if (note.locked) return;
            const current = parseFloat(note.fontSize) || 14;
            const next = delta > 0 ? Math.min(current + delta, 96) : Math.max(current + delta, 8);
            note.fontSize = next;
            if (typeof note._applyStyle === 'function') note._applyStyle();
            if (window._conMirrorSend) {
              window._conMirrorSend({
                type: 'note-style',
                id: String(note.id),
                fontSize: next
              });
            }
          });
          if (targets.length) {
            const lastSize = conGetNodeBaseFontSize(targets[targets.length - 1]) || 13;
            const slider = document.getElementById('con-ctx-font-size');
            const display = document.getElementById('con-ctx-font-size-display');
            if (slider) {
              _conSetupFontSizeSlider(slider, window.conFontUnit);
              const uVal = conPxToFontUnit(lastSize, window.conFontUnit);
              slider.value = uVal;
              if (display) display.textContent = uVal + ' ' + window.conFontUnit;
            }
          }
          if (_sizeAffectedPhraseGroups.size > 0 && typeof conPhraseGroupLayout === 'function') {
            _sizeAffectedPhraseGroups.forEach(pg => conPhraseGroupLayout(pg));
          }
          conRedrawEdges();
          if (typeof conGroupRefitAll === 'function') conGroupRefitAll();

          if (resizedNodes.length && window._conMirrorSend) {
            if (resizedNodes.length === 1) {
              window._conMirrorSend({
                type: 'node-resize',
                id: resizedNodes[0].id,
                fontSize: resizedNodes[0].fontSize,
                shape: resizedNodes[0].shape
              });
            } else {
              window._conMirrorSend({
                type: 'nodes-resize',
                nodes: resizedNodes
              });
            }
          }
        } finally {
          setTimeout(function () { window._conSuppressMirrorObserver = false; }, 60);
        }
      };
      if (!window.conGroupSelected) window.conGroupSelected = function (invisible) {};
      if (!window.conGroupUngroup) window.conGroupUngroup = function (groupId) {};
      window.updateZoom = function (scale) {
        window._conSuppressMirrorObserver = true;
        try {
          const prevZoom = conGetEffectiveZoom();
          const zoom = Math.max(0.5, Math.min(3, parseFloat(scale) || 1));
          conCurrentZoom = zoom;
          window.conCurrentZoom = zoom;
          const display = document.getElementById('zoom-level-display');
          if (display) display.textContent = Math.round(zoom * 100) + '%';
          conNodes.forEach(node => {
            if (!node || !node.el) return;
            const stored = node.el.dataset ? parseFloat(node.el.dataset.baseFontSize) : NaN;
            const currentSize = parseFloat(node.el.style.fontSize);
            const baseSize = Number.isFinite(stored) && stored > 0
              ? stored
              : (Number.isFinite(currentSize) && currentSize > 0 ? currentSize / prevZoom : window.conGetDefaultWordFontSize());
            conSetNodeBaseFontSize(node, baseSize);
            conApplyNodeShape(node, node.shape);
          });
          if (window.conApplyZoomToNotes) window.conApplyZoomToNotes(zoom);
          conRedrawEdges();
          if (window.conGroupRefitAll) window.conGroupRefitAll();

          // Keep presenter view locked to the same zoom and viewport as the main board.
          if (window._conMirrorSend) {
            const brd = document.getElementById('constellation-board');
            if (brd) {
              const r = brd.getBoundingClientRect();
              const vp = {
                vW: window.innerWidth,
                vH: window.innerHeight,
                sx: brd.scrollLeft + Math.max(0, -r.left),
                sy: brd.scrollTop + Math.max(0, -r.top)
              };
              window._conMirrorSend({
                type: 'board-zoom',
                zoom: zoom,
                sx: vp.sx,
                sy: vp.sy,
                boardViewW: vp.vW,
                boardViewH: vp.vH
              });
            }
          }
        } finally {
          setTimeout(function () { window._conSuppressMirrorObserver = false; }, 60);
        }
      };
      window.conGetZoom = function () {
        return conCurrentZoom;
      };

      window.conSetTitle = function (title) {
        conTitle = window.conTitle = global.conTitle = title;
        const el = document.getElementById('con-board-title');
        if (el) { el.textContent = title; el.style.display = title ? 'block' : 'none'; }
        if (typeof conUpdateRenameButtonVisibility === 'function') {
          conUpdateRenameButtonVisibility();
        }
        if (typeof boardUpdateDocumentTitle === 'function') {
          boardUpdateDocumentTitle();
        }
      };

      window.conGetTitle = function () {
        return (typeof conTitle !== 'undefined' ? conTitle : window.conTitle) || '';
      };

      window.conRestorePageToBoard = function (snap, opts) { window._conRestorePageToBoard(snap, opts); };

      window.conExpandBoardHeight = function (deltaPx = 400) {
        const board = document.getElementById('constellation-board');
        if (!board) return;
        const currentH = board.offsetHeight || board.clientHeight || 1200;
        const newH = Math.round(currentH + Number(deltaPx || 400));
        board.style.height = newH + 'px';
        const pIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
        if (typeof conPageSnapshots !== 'undefined' && conPageSnapshots[pIdx]) {
          conPageSnapshots[pIdx].boardHeight = newH;
        }
        try {
          sessionStorage.setItem('cmt-board-expanded-height-' + pIdx, String(newH));
          sessionStorage.setItem('cmt-board-expanded-height', String(newH));
        } catch (_) { }
        try {
          board.scrollBy({ top: Math.min(300, deltaPx), behavior: 'smooth' });
        } catch (_) { }
        if (typeof boardSetDirty === 'function') boardSetDirty(true);
        if (typeof _boardScheduleSave === 'function') _boardScheduleSave('constellation');
        if (typeof window._conSyncDrawOverlaySize === 'function') window._conSyncDrawOverlaySize();
        if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true, boardHeight: newH });
      };



    // ================================================================
    // CONSTELLATION — MULTI-PAGE HELPERS
    // ================================================================

    // Fast offscreen measurement helper to guarantee accurate pixel dimensions for detached nodes
    let _conOffscreenMeasureNode = null;
    function conMeasureNodeDimensions(node) {
      if (!node) return { w: 80, h: 32 };
      if (typeof node.w === 'number' && node.w > 0 && typeof node.h === 'number' && node.h > 0) {
        return { w: node.w, h: node.h };
      }
      if (typeof node._cachedW === 'number' && node._cachedW > 0 && typeof node._cachedH === 'number' && node._cachedH > 0) {
        return { w: node._cachedW, h: node._cachedH };
      }
      if (node.el && node.el.offsetWidth > 0 && node.el.offsetHeight > 0) {
        node._cachedW = node.el.offsetWidth;
        node._cachedH = node.el.offsetHeight;
        return { w: node._cachedW, h: node._cachedH };
      }
      try {
        if (!_conOffscreenMeasureNode) {
          _conOffscreenMeasureNode = document.createElement('div');
          _conOffscreenMeasureNode.id = 'con-offscreen-measure-node';
          _conOffscreenMeasureNode.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;z-index:-1;margin:0;box-sizing:border-box;';
          document.body.appendChild(_conOffscreenMeasureNode);
        }
        const measurer = _conOffscreenMeasureNode;
        measurer.className = 'con-node';
        measurer.style.width = '';
        measurer.style.height = '';
        measurer.style.minWidth = '';
        measurer.style.minHeight = '';
        measurer.style.maxWidth = '';
        measurer.style.fontSize = node.fontSize || '16px';
        measurer.style.fontFamily = node.fontFamily || '';
        if (node.borderWidth) measurer.style.borderWidth = node.borderWidth + 'px';
        if (node.borderStyle) measurer.style.borderStyle = node.borderStyle;

        const tempNode = {
          ...node,
          el: measurer
        };
        if (typeof conRenderNodeLabel === 'function') {
          conRenderNodeLabel(tempNode);
        } else {
          measurer.textContent = node.baseWord || '';
        }
        const shape = (typeof conNormalizeNodeShape === 'function')
          ? conNormalizeNodeShape(node.shape)
          : (node.shape || 'rectangle');
        if (typeof conApplyNodeShape === 'function') {
          conApplyNodeShape(tempNode, shape);
        }
        const mw = Math.max(32, measurer.offsetWidth || measurer.scrollWidth || 80);
        const mh = Math.max(20, measurer.offsetHeight || measurer.scrollHeight || 32);
        node._cachedW = mw;
        node._cachedH = mh;
        return { w: mw, h: mh };
      } catch (_) {
        // Fallback using Lexend Bold font metric approximation (0.68 * fs + 32px padding/borders)
        const fs = parseFloat(node.fontSize) || 16;
        const text = String(node.baseWord || '').split('//')[0].trim();
        const estW = Math.max(48, Math.round(text.length * (fs * 0.68) + 32));
        const estH = Math.max(32, Math.round(fs * 1.5 + 16));
        node._cachedW = estW;
        node._cachedH = estH;
        return { w: estW, h: estH };
      }
    }

    let _conOffscreenMeasureNote = null;
    function conMeasureNoteDimensions(note) {
      if (!note) return { w: 120, h: 40 };
      if (typeof note.w === 'number' && note.w > 0 && typeof note.h === 'number' && note.h > 0 && note.manualSize) {
        return { w: note.w, h: note.h };
      }
      if (typeof note.liveBaseWidth === 'number' && note.liveBaseWidth > 0 && typeof note.liveBaseHeight === 'number' && note.liveBaseHeight > 0 && note.manualSize) {
        return { w: note.liveBaseWidth, h: note.liveBaseHeight };
      }
      const _noteEl = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(note.id) : (document.querySelector ? document.querySelector('.con-word-note[data-id="' + note.id + '"]') : null);
      if (_noteEl && _noteEl.offsetWidth > 0 && _noteEl.offsetHeight > 0) {
        const zoom = window.conGetZoom ? Math.max(0.2, Number(window.conGetZoom()) || 1) : 1;
        const mw = Math.round(_noteEl.offsetWidth / zoom);
        const mh = Math.round(_noteEl.offsetHeight / zoom);
        note._cachedW = mw;
        note._cachedH = mh;
        return { w: mw, h: mh };
      }
      if (typeof note._cachedW === 'number' && note._cachedW > 0 && typeof note._cachedH === 'number' && note._cachedH > 0) {
        return { w: note._cachedW, h: note._cachedH };
      }
      try {
        if (!_conOffscreenMeasureNote) {
          _conOffscreenMeasureNote = document.createElement('div');
          _conOffscreenMeasureNote.id = 'con-offscreen-measure-note';
          _conOffscreenMeasureNote.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;z-index:-1;margin:0;box-sizing:border-box;padding:6px 12px 10px 8px;border-radius:6px;';
          document.body.appendChild(_conOffscreenMeasureNote);
        }
        const measurer = _conOffscreenMeasureNote;
        measurer.className = 'con-word-note';
        measurer.style.width = '';
        measurer.style.height = '';
        measurer.style.minWidth = '120px';
        measurer.style.maxWidth = '460px';
        measurer.style.minHeight = '40px';
        measurer.style.padding = '6px 12px 10px 8px';
        measurer.style.fontSize = (note.fontSize || 16) + 'px';
        measurer.style.fontFamily = note.fontFamily || '';
        measurer.style.fontWeight = note.bold ? '700' : '400';
        measurer.style.fontStyle = note.italic ? 'italic' : 'normal';

        let editor = measurer.querySelector('.wn-note-editor');
        if (!editor) {
          editor = document.createElement('div');
          editor.className = 'wn-note-editor';
          editor.style.cssText = 'width:100%;box-sizing:border-box;white-space:pre-wrap;word-break:break-word;line-height:1.4;';
          measurer.appendChild(editor);
        }
        const rawContent = note.html ? String(note.html) : (note.text ? (typeof boardEscapeHtml === 'function' ? boardEscapeHtml(note.text).replace(/\n/g, '<br>') : String(note.text).replace(/\n/g, '<br>')) : '');
        editor.innerHTML = (typeof wnRenderMathHtml === 'function') ? wnRenderMathHtml(rawContent) : rawContent;

        const minBaseW = 120, maxBaseW = 460, minBaseH = 40;
        let baseW = (typeof note.width === 'number' && note.width > 0 && note.manualSize)
          ? note.width
          : Math.min(maxBaseW, Math.max(minBaseW, Math.round(editor.scrollWidth + 33)));
        measurer.style.width = baseW + 'px';
        editor.style.width = '100%';

        let baseH = (typeof note.height === 'number' && note.height > 0 && note.manualSize)
          ? note.height
          : Math.max(minBaseH, Math.round(editor.scrollHeight + 12));

        note._cachedW = baseW;
        note._cachedH = baseH;
        return { w: baseW, h: baseH };
      } catch (_) {
        const text = String(note.text || note.content || '').trim();
        const estW = text.length > 60 ? 240 : (text.length > 25 ? 180 : 130);
        const estH = text.length > 100 ? 120 : (text.length > 40 ? 80 : 50);
        note._cachedW = estW;
        note._cachedH = estH;
        return { w: estW, h: estH };
      }
    }

    function conEnsureSnapshotDimensions(snapshot) {
      if (!snapshot) return;
      if (Array.isArray(snapshot.nodes)) {
        snapshot.nodes.forEach(n => {
          if (!n) return;
          if ((typeof n.w !== 'number' || n.w <= 0) || (typeof n.h !== 'number' || n.h <= 0)) {
            const dims = conMeasureNodeDimensions(n);
            n.w = dims.w;
            n.h = dims.h;
            n._cachedW = dims.w;
            n._cachedH = dims.h;
          } else if (typeof n._cachedW !== 'number' || n._cachedW <= 0) {
            n._cachedW = n.w;
            n._cachedH = n.h;
          }
        });
      }
      if (Array.isArray(snapshot.notes)) {
        snapshot.notes.forEach(nt => {
          if (!nt) return;
          if ((typeof nt.w !== 'number' || nt.w <= 0) || (typeof nt.h !== 'number' || nt.h <= 0)) {
            const dims = conMeasureNoteDimensions(nt);
            nt.w = dims.w;
            nt.h = dims.h;
            nt.width = dims.w;
            nt.height = dims.h;
            nt.liveBaseWidth = dims.w;
            nt.liveBaseHeight = dims.h;
            nt._cachedW = dims.w;
            nt._cachedH = dims.h;
          } else if (typeof nt._cachedW !== 'number' || nt._cachedW <= 0) {
            nt._cachedW = nt.w;
            nt._cachedH = nt.h;
          }
        });
      }
    }

    // Capture the current live board state as a plain page-snapshot object.
    function conBuildPageSnapshot() {
    window.conBuildPageSnapshot = global.conBuildPageSnapshot = conBuildPageSnapshot;
      try {
        const _ae = document.activeElement;
        const _ed = _ae ? (_ae.classList && _ae.classList.contains('wn-note-editor') ? _ae : (_ae.closest && _ae.closest('.wn-note-editor'))) : null;
        if (_ed) {
          const _noteEl = _ed.closest('.con-word-note');
          if (_noteEl && _noteEl.dataset && _noteEl.dataset.id) {
            const _currNotes = window.conGetNotes ? window.conGetNotes() : [];
            const _nd = _currNotes.find(n => n.id === _noteEl.dataset.id);
            if (_nd) wnSyncNoteDataFromEditor(_nd, _ed);
          }
        }
      } catch (_) { }
      const nodes = window.conGetNodes ? window.conGetNodes() : [];
      const edges = window.conGetEdges ? window.conGetEdges() : [];
      const groups = window.conGetGroups ? window.conGetGroups() : [];
      const masks = window.conGetMasks ? window.conGetMasks() : [];
      const _noteZoom = window.conGetZoom ? Math.max(0.5, Number(window.conGetZoom()) || 1) : 1;
      return {
        nodes: nodes.map(n => {
          let nw = (typeof n.w === 'number' && n.w > 0) ? n.w : null;
          let nh = (typeof n.h === 'number' && n.h > 0) ? n.h : null;
          if (nw == null || nh == null) {
            if (n.el && n.el.offsetWidth > 0 && n.el.offsetHeight > 0) {
              nw = nw || n.el.offsetWidth;
              nh = nh || n.el.offsetHeight;
              n._cachedW = nw;
              n._cachedH = nh;
            } else if (typeof n._cachedW === 'number' && n._cachedW > 0 && typeof n._cachedH === 'number' && n._cachedH > 0) {
              nw = nw || n._cachedW;
              nh = nh || n._cachedH;
            } else {
              const measured = conMeasureNodeDimensions(n);
              nw = nw || measured.w;
              nh = nh || measured.h;
            }
          }
          const finalW = nw || 80;
          const finalH = nh || 32;
          n._cachedW = finalW;
          n._cachedH = finalH;
          return {
            id: n.id,
            baseWord: n.baseWord || (n.el ? n.el.textContent.trim() : ''),
            html: n.html || (n.el && (n.el.querySelector('.katex, .wn-katex-inline, .wn-katex-display, i, b, strong, em, br, sub, sup') ? n.el.innerHTML : '')) || null,
            dbWord: n.dbWord || null,
            sourceWord: n.sourceWord || null,
            relation: n.relation || null,
            x: n.x, y: n.y,
            w: finalW,
            h: finalH,
            _cachedW: finalW,
            _cachedH: finalH,
            bg: n.el ? n.el.style.background || '' : (n.bg || ''),
            color: n.el ? n.el.style.color || '' : (n.color || ''),
            border: n.el ? n.el.style.borderColor || '' : (n.border || ''),
            borderWidth: n.borderWidth || null,
            borderStyle: n.borderStyle || null,
            highlight: n.highlight || null,
            preset: n.preset || null,
            fontFamily: n.fontFamily || null,
            fontSize: ((window.conGetNodeBaseFontSize ? window.conGetNodeBaseFontSize(n) : parseFloat((n.el && n.el.style && n.el.style.fontSize) || '16')) || 16) + 'px',
            textStrokeColor: n.textStrokeColor || null,
            textStrokeWidth: n.textStrokeWidth || null,
            fmt: n.fmt ? { ...n.fmt } : {},
            masked: n.masked || false,
            locked: !!n.locked,
            pageNum: n.pageNum != null ? n.pageNum : null,
            phraseOrder: n.phraseOrder != null ? n.phraseOrder : null,
            emoji: n.emoji || null,
            isTimer: !!n.isTimer,
            durationSec: n.durationSec || null,
            remainingSec: n.remainingSec != null ? n.remainingSec : null,
            timerState: n.timerState || 'idle',
            timerTarget: (n.timerTarget === 'cms' || n.timerTarget === 'board') ? n.timerTarget : null,
            isRandom: !!n.isRandom,
            randomMin: n.isRandom ? (n.randomMin != null ? n.randomMin : 1) : undefined,
            randomMax: n.isRandom ? (n.randomMax != null ? n.randomMax : 100) : undefined,
            randomValue: n.isRandom ? (n.randomValue != null ? n.randomValue : n.randomMin) : undefined,
            isSound: !!n.isSound,
            soundAttachmentId: n.soundAttachmentId || null,
            soundName: n.soundName || null,
            soundDuration: (typeof n.soundDuration === 'number') ? n.soundDuration : null,
            isVideo: !!n.isVideo,
            videoAttachmentId: n.videoAttachmentId || null,
            videoName: n.videoName || null,
            videoDuration: (typeof n.videoDuration === 'number') ? n.videoDuration : null,
            competences: (Array.isArray(n.competences) && n.competences.length) ? n.competences.slice() : undefined,
            shape: (window.conNormalizeNodeShape ? window.conNormalizeNodeShape(n.shape || (n.el && n.el.dataset.shape)) : conNormalizeNodeShapeSafe(n.shape || (n.el && n.el.dataset.shape))),
            rotation: (typeof n.rotation === 'number') ? ((typeof window.conNormalizeNodeRotation === 'function') ? window.conNormalizeNodeRotation(n.rotation) : n.rotation) : 0
          };
        }),
        edges: edges.map(e => ({
          id: e.id,
          a: e.a, b: e.b,
          type: e.type || 'none',
          label: e.label || '',
          labelSize: Number(e.labelSize) || 16,
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
          colorMode: (e.colorMode === 'auto' || e.colorMode === 'manual') ? e.colorMode : undefined,
          strokeColor: e.strokeColor || null
        })),
        groups: groups.map(g => ({
          id: g.id,
          nodeIds: [...g.nodeIds],
          noteIds: [...(g.noteIds || [])],
          drawingIds: [...(g.drawingIds || [])],
          shapeIds: [...(g.shapeIds || [])],
          mediaIds: [...(g.mediaIds || [])],
          title: g.title || '',
          blink: !!g.blink,
          paletteIdx: g.paletteIdx || 0,
          invisible: !!g.invisible,
          drawingGroup: !!g.drawingGroup,
          phraseGroup: !!g.phraseGroup,
          manualW: g._manualW != null ? g._manualW : null,
          manualH: g._manualH != null ? g._manualH : null,
          x: g.el ? (parseFloat(g.el.style.left) || 0) : 0,
          y: g.el ? (parseFloat(g.el.style.top) || 0) : 0,
          titleX: g._titleX != null ? g._titleX : null,
          titleY: g._titleY != null ? g._titleY : null,
          titleW: g._titleW != null ? g._titleW : null,
          titleFS: g._titleFS != null ? g._titleFS : null
        })),
        masks: masks.map(m => ({
          id: m.id, x: m.x, y: m.y,
          width: m.width, height: m.height,
          color: m.color || '#111111',
          opacity: Number(m.opacity) || 0.95
        })),
        notes: (window.conGetNotes ? window.conGetNotes() : []).map(n => {
          const _noteEl = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(n.id) : document.querySelector('.con-word-note[data-id="' + n.id + '"]');
          
          let probedW = null;
          if (typeof n.liveBaseWidth === 'number' && n.liveBaseWidth > 0) probedW = n.liveBaseWidth;
          else if (typeof n.width === 'number' && n.width > 0) probedW = n.width;
          else if (typeof n.w === 'number' && n.w > 0) probedW = n.w;
          else if (typeof n.styleWidth === 'number' && n.styleWidth > 0) probedW = n.styleWidth;
          else if (typeof n.styleWidth === 'string' && parseFloat(n.styleWidth) > 0) probedW = parseFloat(n.styleWidth);

          let probedH = null;
          if (typeof n.liveBaseHeight === 'number' && n.liveBaseHeight > 0) probedH = n.liveBaseHeight;
          else if (typeof n.height === 'number' && n.height > 0) probedH = n.height;
          else if (typeof n.h === 'number' && n.h > 0) probedH = n.h;
          else if (typeof n.styleHeight === 'number' && n.styleHeight > 0) probedH = n.styleHeight;
          else if (typeof n.styleHeight === 'string' && parseFloat(n.styleHeight) > 0) probedH = parseFloat(n.styleHeight);

          if (_noteEl) {
            const sw = parseFloat(_noteEl.style.width) || _noteEl.offsetWidth || _noteEl.clientWidth || 0;
            const sh = parseFloat(_noteEl.style.height) || _noteEl.offsetHeight || _noteEl.clientHeight || 0;
            if (sw > 0) {
              const unzoomedW = Math.round(sw / _noteZoom);
              if (probedW == null || n.manualSize || _noteEl.style.width) probedW = unzoomedW;
            }
            if (sh > 0) {
              const unzoomedH = Math.round(sh / _noteZoom);
              if (probedH == null || n.manualSize || _noteEl.style.height) probedH = unzoomedH;
            }
            const editorEl = _noteEl.querySelector('.wn-note-editor');
            if (editorEl) {
              if (probedW == null && (editorEl.offsetWidth > 0 || parseFloat(editorEl.style.width) > 0)) {
                probedW = Math.round((parseFloat(editorEl.style.width) || editorEl.offsetWidth) / _noteZoom);
              }
              if (probedH == null && (editorEl.offsetHeight > 0 || parseFloat(editorEl.style.height) > 0)) {
                probedH = Math.round((parseFloat(editorEl.style.height) || editorEl.offsetHeight) / _noteZoom);
              }
            }
          }

          if (probedW == null || probedH == null || (!n.manualSize && (probedW <= 0 || probedH <= 0))) {
            const measured = conMeasureNoteDimensions(n);
            probedW = probedW || measured.w;
            probedH = probedH || measured.h;
          }

          const finalW = probedW || (typeof n.width === 'number' && n.width > 0 ? n.width : 120);
          const finalH = probedH || (typeof n.height === 'number' && n.height > 0 ? n.height : 40);

          n.liveBaseWidth = finalW;
          n.liveBaseHeight = finalH;
          n.width = finalW;
          n.height = finalH;
          n.w = finalW;
          n.h = finalH;
          n._cachedW = finalW;
          n._cachedH = finalH;

          return {
            id: n.id, nodeId: n.nodeId,
            text: n.text, html: n.html || '',
            x: n.x, y: n.y,
            w: finalW,
            h: finalH,
            liveBaseWidth: finalW,
            liveBaseHeight: finalH,
            color: n.color, bg: n.bg,
            fontSize: n.fontSize,
            fontFamily: n.fontFamily || null,
            bold: n.bold, italic: n.italic, underline: n.underline,
            wavy: !!n.wavy,
            casing: n.casing || null,
            strike: !!n.strike, hidden: !!n.hidden, locked: !!n.locked,
            manualSize: !!n.manualSize,
            width: finalW,
            height: finalH,
            styleWidth: finalW,
            styleHeight: finalH,
            emoji: null,
            emojiStickers: (n.emojiStickers || []).map(s => ({ id: s.id, emoji: s.emoji, x: Number(s.x) || 0, y: Number(s.y) || 0, size: Number(s.size) || 32 })),
            borderWidth: n.borderWidth || null,
            borderStyle: n.borderStyle || null,
            borderColor: n.borderColor || null,
            preset: n.preset || null,
            blink: !!n.blink,
            studentInput: !!n.studentInput,
            textAlign: n.textAlign || null
          };
        }),
        drawings: (window.conGetDrawings ? window.conGetDrawings() : []).map(d => ({
          id: d.id, x: d.x, y: d.y, w: d.w, h: d.h,
          points: d.points.map(p => (p === null || p === undefined) ? null : ({ x: p.x, y: p.y })),
          color: d.color,
          thickness: d.thickness,
          opacity: Number.isFinite(d.opacity) ? d.opacity : 1
        })),
        shapes: (window.conGetShapes ? window.conGetShapes() : []).map(s => ({
          id: s.id, type: s.type,
          x: s.x, y: s.y, w: s.w, h: s.h,
          lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
          color: s.color, fillColor: s.fillColor || 'none',
          thickness: s.thickness,
          opacity: Number.isFinite(s.opacity) ? s.opacity : 1,
          dashStyle: s.dashStyle || 'solid'
        })),
        media: (window.conGetMediaItems ? window.conGetMediaItems() : []).map(m => ({
          id: m.id,
          kind: m.kind,
          attachmentId: m.attachmentId || '',
          name: m.name,
          mime: m.mime || '',
          relativePath: m.relativePath || '',
          pageNumber: Math.max(1, Number(m.pageNumber) || 1),
          pdfFit: (m.kind === 'pdf' ? (m.pdfFit || 'h') : undefined),
          pdfZoom: (m.kind === 'pdf' ? Math.max(0.1, Math.min(8, Number(m.pdfZoom) || 1)) : undefined),
          pdfRotation: (m.kind === 'pdf' ? (((Number(m.pdfRotation) || 0) % 360) + 360) % 360 : undefined),
          pdfScrollX: (m.kind === 'pdf' ? (Math.round(Number(m.pdfScrollX) || 0)) : undefined),
          pdfScrollY: (m.kind === 'pdf' ? (Math.round(Number(m.pdfScrollY) || 0)) : undefined),
          pdfLockSize: (m.kind === 'pdf' ? !!m.pdfLockSize : undefined),
          x: m.x,
          y: m.y,
          w: m.w,
          h: m.h,
          hidden: m.hidden ? true : undefined,
          locked: m.locked ? true : undefined,
          blink: m.blink ? true : undefined,
          borderWidth: Number(m.borderWidth) || 0,
          borderStyle: m.borderStyle || 'solid',
          borderColor: m.borderColor || '#111111',
          opacity: (m.opacity != null && Number.isFinite(Number(m.opacity))) ? Number(m.opacity) : 1,
          rotation: (m.kind === 'pics' ? (Number(m.rotation) || 0) : undefined),
          _fullscreen: m._fullscreen ? true : undefined,
          _fsZoom: m._fullscreen ? (m._fsZoom || 1) : undefined,
          _fsPanX: m._fullscreen ? (m._fsPanX || 0) : undefined,
          _fsPanY: m._fullscreen ? (m._fsPanY || 0) : undefined,
          dataUrl: (m.dataUrl && m.dataUrl.startsWith('data:')) ? m.dataUrl : (m._resolvedDataUrl || undefined),
          base64: m.base64 || undefined,
          transcript: m.transcript || undefined
        })),
        backgroundPdf: (() => {
          const bgPdf = (typeof conPageBackgroundPdf !== 'undefined' ? conPageBackgroundPdf : (typeof window !== 'undefined' ? window.conPageBackgroundPdf : null));
          if (!bgPdf) return null;
          const resolver = (typeof conResolvePdfBackgroundAttachment === 'function') ? conResolvePdfBackgroundAttachment : (window.conResolvePdfBackgroundAttachment || (() => null));
          const linkedBackgroundAttachment = resolver(bgPdf);
          return {
            attachmentId: String((linkedBackgroundAttachment && linkedBackgroundAttachment.id) || bgPdf.attachmentId || ''),
            name: String((linkedBackgroundAttachment && linkedBackgroundAttachment.name) || bgPdf.name || ''),
            mime: String((linkedBackgroundAttachment && linkedBackgroundAttachment.mime) || bgPdf.mime || 'application/pdf'),
            relativePath: String((linkedBackgroundAttachment && linkedBackgroundAttachment.relativePath) || bgPdf.relativePath || ''),
            pageNumber: Math.max(1, Number(bgPdf.pageNumber) || 1)
          };
        })(),
        boardBg: (typeof _conBoardBg !== 'undefined' && _conBoardBg) ? { attachmentId: String(_conBoardBg.attachmentId || ''), pageNumber: Math.max(1, Number(_conBoardBg.pageNumber) || 1) } : ((typeof window !== 'undefined' && window._conBoardBg) ? { attachmentId: String(window._conBoardBg.attachmentId || ''), pageNumber: Math.max(1, Number(window._conBoardBg.pageNumber) || 1) } : null),
        boardBgColor: (typeof _conBoardBgColor !== 'undefined' ? _conBoardBgColor : (typeof window !== 'undefined' ? window._conBoardBgColor : null)) || null,
        boardBackgroundColor: (typeof _conBoardBgColor !== 'undefined' ? _conBoardBgColor : (typeof window !== 'undefined' ? window._conBoardBgColor : null)) || null,
        tables: window.conSerializeTables ? window.conSerializeTables() : [],
        boardStickers: (window._conBoardStickers || []).map(s => ({ id: s.id, emoji: s.emoji, x: Number(s.x) || 0, y: Number(s.y) || 0, size: Number(s.size) || 40 })),
        boardHeight: (() => {
          const b = document.getElementById('constellation-board');
          if (b && b.style && b.style.height) {
            const val = parseInt(b.style.height, 10);
            if (!isNaN(val) && val > 0) return val;
          }
          const pIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
          if (typeof conPageSnapshots !== 'undefined' && conPageSnapshots[pIdx] && conPageSnapshots[pIdx].boardHeight) {
            return conPageSnapshots[pIdx].boardHeight;
          }
          try {
            const s = sessionStorage.getItem('cmt-board-expanded-height-' + pIdx) || sessionStorage.getItem('cmt-board-expanded-height');
            const val = parseInt(s, 10);
            if (!isNaN(val) && val > 0) return val;
          } catch (_) { }
          return null;
        })(),
        _revision: (typeof window._conGetBoardRevision === 'function' ? window._conGetBoardRevision() : 1)
      };
    }

    // Restore a page snapshot to the live board, preserving the current title and session date.
    function _conRestorePageToBoard(snapshot, opts = {}) {
      window._conRestorePageToBoard = global._conRestorePageToBoard = _conRestorePageToBoard;
      window.conRestorePageToBoard = global.conRestorePageToBoard = _conRestorePageToBoard;
      const isMirror = !!(opts && opts.mirrorSync);
      const isUndoRedo = !!(opts && opts.isUndoRedo);
      if (!isMirror && !isUndoRedo && typeof _conInvalidatePageDomCache === 'function') {
        _conInvalidatePageDomCache(conCurrentPageIndex);
      }
      console.log('[Board] _conRestorePageToBoard' + (isMirror ? ' (Mirror Sync)' : (isUndoRedo ? ' (Undo/Redo)' : '')) + ':', {
        nodeCount: (snapshot && snapshot.nodes || []).length,
        drawingCount: (snapshot && snapshot.drawings || []).length,
        groupCount: (snapshot && snapshot.groups || []).length,
        hasBoardBg: !!(snapshot && snapshot.boardBg),
        boardHeight: snapshot && snapshot.boardHeight
      });
      const title = window.conGetTitle ? window.conGetTitle() : '';
      const dateCreated = boardSessionDateCreated.constellation;
      _conRestoreSession({
        _type: 'constellation',
        _isPageRestore: true,
        _isMirrorSync: !!(opts && opts.mirrorSync),
        _isUndoRedo: isUndoRedo,
        title: title,
        dateCreated: dateCreated,
        boardHeight: (snapshot && snapshot.boardHeight) || null,
        nodes: (snapshot && snapshot.nodes) || [],
        edges: (snapshot && snapshot.edges) || [],
        groups: (snapshot && snapshot.groups) || [],
        masks: (snapshot && snapshot.masks) || [],
        notes: (snapshot && snapshot.notes) || [],
        drawings: (snapshot && snapshot.drawings) || [],
        shapes: (snapshot && snapshot.shapes) || [],
        tables: (snapshot && snapshot.tables) || [],
        media: (snapshot && snapshot.media) || [],
        backgroundPdf: (snapshot && snapshot.backgroundPdf) || null,
        boardBg: (snapshot && snapshot.boardBg) || null,
        boardBgColor: (snapshot && (snapshot.boardBgColor || snapshot.boardBackgroundColor || snapshot.backgroundColor)) || null,
        boardBackgroundColor: (snapshot && (snapshot.boardBgColor || snapshot.boardBackgroundColor || snapshot.backgroundColor)) || null,
        boardStickers: (snapshot && snapshot.boardStickers) || []
      });

      // Maintain dimensional caches in live nodes, notes, and the snapshot
      if (snapshot && Array.isArray(snapshot.nodes)) {
        const liveNodes = window.conGetNodes ? window.conGetNodes() : [];
        const liveNodeMap = new Map(liveNodes.map(n => [n.id, n]));
        snapshot.nodes.forEach(sn => {
          const ln = liveNodeMap.get(sn.id);
          if (ln) {
            const w = (ln.el && ln.el.offsetWidth > 0) ? ln.el.offsetWidth : (sn.w || sn._cachedW || 0);
            const h = (ln.el && ln.el.offsetHeight > 0) ? ln.el.offsetHeight : (sn.h || sn._cachedH || 0);
            if (w > 0) {
              ln._cachedW = w;
              sn._cachedW = w;
              if (typeof sn.w !== 'number' || sn.w <= 0) sn.w = w;
            }
            if (h > 0) {
              ln._cachedH = h;
              sn._cachedH = h;
              if (typeof sn.h !== 'number' || sn.h <= 0) sn.h = h;
            }
          }
        });
      }
      if (snapshot && Array.isArray(snapshot.notes)) {
        const liveNotes = window.conGetNotes ? window.conGetNotes() : [];
        const liveNotesMap = new Map(liveNotes.map(n => [String(n.id), n]));
        const zoom = (typeof conGetZoom === 'function' ? conGetZoom() : 1) || 1;
        snapshot.notes.forEach(snt => {
          const lnt = liveNotesMap.get(String(snt.id));
          const el = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(snt.id) : document.querySelector('.con-word-note[data-id="' + snt.id + '"]');
          if (el && el.offsetWidth > 0) {
            const unzoomedW = Math.round((parseFloat(el.style.width) || el.offsetWidth) / zoom);
            const unzoomedH = Math.round((parseFloat(el.style.height) || el.offsetHeight) / zoom);
            if (lnt) {
              if (lnt.liveBaseWidth == null) lnt.liveBaseWidth = unzoomedW;
              if (lnt.liveBaseHeight == null) lnt.liveBaseHeight = unzoomedH;
              if (typeof lnt.width !== 'number') lnt.width = unzoomedW;
              if (typeof lnt.height !== 'number') lnt.height = unzoomedH;
              lnt._cachedW = unzoomedW;
              lnt._cachedH = unzoomedH;
            }
            if (snt.liveBaseWidth == null) snt.liveBaseWidth = unzoomedW;
            if (snt.liveBaseHeight == null) snt.liveBaseHeight = unzoomedH;
            if (typeof snt.w !== 'number' || snt.w <= 0) snt.w = unzoomedW;
            if (typeof snt.h !== 'number' || snt.h <= 0) snt.h = unzoomedH;
          }
        });
      }

      if (!isMirror && !isUndoRedo && (!opts || opts.scrollToTop !== false)) {
        if (typeof window.conScrollToTop === 'function') {
          window.conScrollToTop();
        }
      }
    }

    // Return plain-object node data from ALL pages (for CSV / PDF export).
    function conGetAllPagesNodeData() {
      const currentSnap = conBuildPageSnapshot();
      if (typeof conCurrentPageIndex === 'number' && conCurrentPageIndex >= 0 && Array.isArray(conPageSnapshots)) {
        conPageSnapshots[conCurrentPageIndex] = currentSnap;
      }
      if (Array.isArray(conPageSnapshots) && typeof conEnsureSnapshotDimensions === 'function') {
        conPageSnapshots.forEach(snap => conEnsureSnapshotDimensions(snap));
      }
      const allPages = conPageSnapshots.slice();
      allPages[conCurrentPageIndex] = currentSnap;
      const result = [];
      allPages.forEach(page => {
        if (!page || !page.nodes) return;
        page.nodes.forEach(n => result.push(n));
      });
      return result;
    }

    function conBuildSessionData() {
      const currentSnap = conBuildPageSnapshot();
      if (typeof conCurrentPageIndex === 'number' && conCurrentPageIndex >= 0 && Array.isArray(conPageSnapshots)) {
        conPageSnapshots[conCurrentPageIndex] = currentSnap;
      }
      if (Array.isArray(conPageSnapshots) && typeof conEnsureSnapshotDimensions === 'function') {
        conPageSnapshots.forEach(snap => conEnsureSnapshotDimensions(snap));
      }
      const allPages = conPageSnapshots.slice();
      allPages[conCurrentPageIndex] = currentSnap;
      const title = window.conGetTitle ? window.conGetTitle() : '';
      const dateCreated = boardNormalizeDateCreated('constellation', boardSessionDateCreated.constellation);
      const attachments = conBuildAttachmentMetadata();
      const meta = boardSessionMeta('constellation');
      const createdAt = Number(meta.createdAt)
        || (dateCreated ? Date.parse(String(dateCreated).replace(/_\d+$/, '')) : 0)
        || undefined;
      const competences = Array.isArray(_conCurrentCompetences) ? _conCurrentCompetences.slice() : [];

      if (allPages.length > 1) {
        // Multi-page format
        return {
          _type: 'constellation',
          _version: 2,
          dateCreated,
          _createdAt: createdAt,
          title,
          competences,
          attachments,
          currentPage: conCurrentPageIndex,
          pages: allPages
        };
      }

      // Single page: flat format for backward compatibility
      return {
        _type: 'constellation',
        _version: 1,
        dateCreated,
        _createdAt: createdAt,
        title,
        competences,
        attachments,
        ...currentSnap
      };
    }

    function conSessionHasContent(data) {
      if (!data) return false;
      const isAutoTimestampTitle = (title) => /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?$/.test((title || '').trim());
      const titleVal = (data.title || '').trim();
      if (titleVal && !isAutoTimestampTitle(titleVal)) return true;
      if ((data.attachments || []).length) return true;
      if ((data.media || []).length) return true;
      if (data.backgroundPdf && (data.backgroundPdf.relativePath || data.backgroundPdf.attachmentId)) return true;
      if (data.boardBgColor || data.boardBackgroundColor || data.backgroundColor) return true;
      // Multi-page format
      if (data.pages && Array.isArray(data.pages)) {
        if (data.pages.length > 1) return true;
        return data.pages.some(p => p && (
          (p.nodes || []).length || (p.notes || []).length ||
          (p.drawings || []).length || (p.shapes || []).length || (p.tables || []).length || (p.masks || []).length ||
          (p.media || []).length || (p.backgroundPdf && (p.backgroundPdf.relativePath || p.backgroundPdf.attachmentId)) || p.boardBgColor || p.boardBackgroundColor || p.backgroundColor || p.boardHeight
        ));
      }
      // Single-page (flat) format
      if (data.boardHeight) return true;
      if ((data.nodes || []).length) return true;
      if ((data.edges || []).length) return true;
      if ((data.groups || []).length) return true;
      if ((data.masks || []).length) return true;
      if ((data.notes || []).length) return true;
      if ((data.drawings || []).length) return true;
      if ((data.shapes || []).length) return true;
      if ((data.tables || []).length) return true;
      return false;
    }

    // Stricter check used only for the initial silent save of a brand-new file:
    // requires actual board objects (nodes, notes, drawings, imported files).
    // Title-only or background-color-only boards do not qualify.
    function conSessionHasMeaningfulContent(data) {
      if (!data) return false;
      if ((data.attachments || []).length) return true;
      if ((data.media || []).length) return true;
      if (data.backgroundPdf && (data.backgroundPdf.relativePath || data.backgroundPdf.attachmentId)) return true;
      // Multi-page format
      if (data.pages && Array.isArray(data.pages)) {
        if (data.pages.length > 1) return true;
        return data.pages.some(p => p && (
          (p.nodes || []).length || (p.notes || []).length ||
          (p.drawings || []).length || (p.shapes || []).length || (p.tables || []).length || (p.masks || []).length ||
          (p.media || []).length || (p.backgroundPdf && (p.backgroundPdf.relativePath || p.backgroundPdf.attachmentId))
        ));
      }
      // Single-page (flat) format
      if ((data.nodes || []).length) return true;
      if ((data.edges || []).length) return true;
      if ((data.groups || []).length) return true;
      if ((data.masks || []).length) return true;
      if ((data.notes || []).length) return true;
      if ((data.drawings || []).length) return true;
      if ((data.shapes || []).length) return true;
      if ((data.tables || []).length) return true;
      return false;
    }

    function taBuildSessionData() {
      const pasteAreaEl = document.getElementById('ta-paste-area');
      if (!pasteAreaEl) return null;
      const rawText = pasteAreaEl.value;
      const fontSize = document.getElementById('ta-font-size-slider').value;

      const tokenOverrides = [];
      taLines.forEach(line => {
        line.forEach(tok => {
          const isDefault = (
            tok.hl === 'none' &&
            !tok.bold && !tok.italic && !tok.underline &&
            !tok.showTrans && !tok.showIpa &&
            !tok.subSizeTrans && !tok.subSizeIpa &&
            !tok.annotTop && !tok.annotBottom &&
            !tok.annotSizeTop && !tok.annotSizeBot &&
            !tok.note
          );
          if (!isDefault) {
            tokenOverrides.push({
              id: tok.id,
              text: tok.text,
              hl: tok.hl,
              bold: tok.bold,
              italic: tok.italic,
              underline: tok.underline,
              showTrans: tok.showTrans,
              showIpa: tok.showIpa,
              subSizeTrans: tok.subSizeTrans,
              subSizeIpa: tok.subSizeIpa,
              annotTop: tok.annotTop,
              annotBottom: tok.annotBottom,
              annotSizeTop: tok.annotSizeTop,
              annotSizeBot: tok.annotSizeBot,
              note: tok.note
            });
          }
        });
      });

      return {
        _type: 'textanalysis',
        _version: 1,
        dateCreated: boardNormalizeDateCreated('textanalysis', boardSessionDateCreated.textanalysis),
        title: taGetTitle(),
        rawText,
        fontSize: parseInt(fontSize, 10),
        sidePadding: parseInt((document.getElementById('ta-side-padding-slider') || {}).value || '232', 10),
        tokenOverrides,
        wordNotes: taWordNotes.map(n => ({
          id: n.id,
          tokId: n.tokId,
          text: n.text,
          html: n.html || '',
          x: n.x,
          y: n.y,
          color: n.color,
          bg: n.bg,
          fontSize: n.fontSize,
          bold: n.bold,
          italic: n.italic,
          underline: n.underline,
          strike: !!n.strike,
          hidden: !!n.hidden,
          locked: !!n.locked,
          manualSize: !!n.manualSize,
          width: typeof n.width === 'number' ? n.width : null,
          height: typeof n.height === 'number' ? n.height : null,
          borderWidth: n.borderWidth || null,
          borderStyle: n.borderStyle || null,
          borderColor: n.borderColor || null
        })),
        drawings: taDrawings.map(d => ({
          id: d.id, x: d.x, y: d.y, w: d.w, h: d.h,
          points: d.points, color: d.color,
          thickness: d.thickness, opacity: d.opacity
        }))
      };
    }

    function taSessionHasContent(data) {
      if (!data) return false;
      if ((data.rawText || '').trim()) return true;
      if ((data.tokenOverrides || []).length) return true;
      if ((data.wordNotes || []).length) return true;
      if ((data.drawings || []).length) return true;
      return false;
    }

    function openSessionLoadPopup(section) {
      if (section !== 'constellation' && section !== 'textanalysis' && section !== 'notes') return;
      sessionLoadMode = section;
      document.getElementById('session-load-overlay').classList.add('active');
      _sessionLoadPopupRefresh();
    }

    function _sessionLoadPopupRefresh() {
      if (!sessionLoadMode) return;
      if (window.Desktop && Desktop.isElectron()) {
        _sessionLoadPopupRefreshFromDisk();
      } else {
        renderSessionLoadPopup();
      }
    }

    async function _sessionLoadPopupRefreshFromDisk() {
      if (!sessionLoadMode) return;
      const title = document.getElementById('session-load-title');
      title.textContent = 'Load ' + boardSectionLabel(sessionLoadMode) + ' sessions';

      const listEl = document.getElementById('session-load-list');
      listEl.innerHTML = '<div class="session-load-empty">Loading…</div>';

      const targetMap = { constellation: 'mindmaps', textanalysis: 'textualAnalyses', notes: 'notes' };
      const target = targetMap[sessionLoadMode];
      const section = sessionLoadMode;

      try {
        let filesRes;
        const exts = section === 'constellation' ? ['.js', '.json', '.cstz', '.zip'] : ['.js', '.json'];
        if (section === 'constellation' && typeof Desktop.listByPath === 'function') {
          filesRes = await Desktop.listByPath(target, '.', {
            extensions: exts,
            recursive: true,
            excludeDirs: ['archived', 'history', 'pics', 'sounds', 'videos', 'pdf', 'templates']
          });
        } else {
          filesRes = await Desktop.listFiles(target, { extensions: exts });
        }

        let files = Array.isArray(filesRes && filesRes.files) ? filesRes.files : [];

        // For constellation, keep only root-level files and direct folder bundles
        if (section === 'constellation') {
          files = files.filter(file => {
            const rel = String((file && (file.relativePath || file.filename)) || '').replace(/\\/g, '/');
            const parts = rel.split('/').filter(Boolean);
            const filename = String((file && file.filename) || (parts.length ? parts[parts.length - 1] : ''));
            if (!filename) return false;
            if (filename.toLowerCase().endsWith('.cstz') || filename.toLowerCase().endsWith('.zip')) return true;
            // archived/folder/folder.js (depth 3)
            if (parts.length === 3 && parts[0] === 'archived') {
              return boardStripJsonExt(filename).toLowerCase() === parts[1].toLowerCase();
            }
            // archived/file.js or .cstz (depth 2)
            if (parts.length === 2 && parts[0] === 'archived') return true;
            if (parts.length <= 1) return true;
            if (parts.length === 2) {
              const folder = parts[0];
              return boardStripJsonExt(filename).toLowerCase() === folder.toLowerCase();
            }
            return false;
          });
        }

        let entries = files.map(file => historyBuildEntry(target, file));

        entries.sort((a, b) => b.modifiedAt - a.modifiedAt);

        listEl.innerHTML = '';
        if (!entries.length) {
          const empty = document.createElement('div');
          empty.className = 'session-load-empty';
          empty.textContent = 'No saved files found.';
          listEl.appendChild(empty);
          return;
        }

        entries.forEach(entry => {
          const item = document.createElement('div');
          item.className = 'session-load-item';

          const name = boardEscapeHtml(entry.baseName || boardStripJsonExt(entry.filename));
          const entryClass = entry.classLabel || entry.classGroup || '';
          const classTag = entryClass ? ' [' + entryClass + ']' : '';
          const compList = Array.isArray(entry.competences) ? entry.competences : ((entry.data && Array.isArray(entry.data.competences)) ? entry.data.competences : []);
          const compBadges = compList.map(c => `<span class="session-load-comp-badge" title="${boardEscapeHtml(c.title || c.code || '')}">${boardEscapeHtml(c.code || c.title || '')}</span>`).join(' ');
          const meta = boardEscapeHtml(boardSourceLabel(entry.source) + ' - ' + boardFormatWhen(entry.modifiedAt) + classTag) + (compBadges ? ' ' + compBadges : '');
          item.innerHTML = '<div class="session-load-item-title">' + name + '</div>'
            + '<div class="session-load-item-meta">' + meta + '</div>';

          const actions = document.createElement('div');
          actions.style.marginTop = '8px';
          actions.style.display = 'flex';
          actions.style.gap = '6px';
          actions.style.flexWrap = 'wrap';

          const openBtn = document.createElement('button');
          openBtn.type = 'button';
          openBtn.className = 'action-btn btn-grey';
          openBtn.textContent = 'Open';
          openBtn.onclick = (ev) => {
            if (ev) ev.stopPropagation();
            closeSessionLoadPopup();
            historyLoadSavedFile(entry);
          };

          const openNewBtn = document.createElement('button');
          openNewBtn.type = 'button';
          openNewBtn.className = 'action-btn btn-grey';
          openNewBtn.textContent = 'Open in New Window';
          openNewBtn.onclick = async (ev) => {
            if (ev) ev.stopPropagation();
            await boardOpenSessionInNewWindow({ type: 'file', entry });
          };

          actions.appendChild(openBtn);
          actions.appendChild(openNewBtn);
          item.appendChild(actions);
          listEl.appendChild(item);
        });
      } catch (error) {
        listEl.innerHTML = '<div class="session-load-empty">⚠️ Could not read files: '
          + boardEscapeHtml(error && error.message ? error.message : String(error)) + '</div>';
      }
    }

    function closeSessionLoadPopup() {
      document.getElementById('session-load-overlay').classList.remove('active');
      sessionLoadMode = null;
    }

    function sessionLoadHandleClassGroupChange() {
      if (sessionLoadMode) _sessionLoadPopupRefresh();
    }

    function sessionLoadFromFile() {
      if (!sessionLoadMode) return;
      const inputId = sessionLoadMode === 'constellation' ? 'con-load-input' :
        sessionLoadMode === 'notes' ? 'note-load-input' : 'ta-load-input';
      const input = document.getElementById(inputId);
      if (input) {
        closeSessionLoadPopup();
        input.click();
      }
    }

    function boardRestoreLocalSessionEntry(mode, entry, options = {}) {
      if (!entry || !entry.data) {
        mdbToast('⚠️ This saved session is no longer available.');
        return false;
      }

      const closePopup = options.closePopup !== false;

      if (mode === 'constellation') {
        if (entry.data._type !== 'constellation') {
          mdbToast('⚠️ This entry is not a valid Constellation save.');
          return false;
        }
        _conCurrentFileName = null;
        _conCurrentFolderName = null;
        boardSetSessionFileMeta('constellation', entry.createdAt, entry.savedAt);
        _conRestoreSession(entry.data);
        setTimeout(() => {
          boardSetAutosaveFingerprint('constellation', conBuildSessionData());
          if (typeof boardSetDirty === 'function') boardSetDirty(false);
          else _boardIsDirty = false;
        }, 200);
        bpSetFromEntryId(entry.plannerEntryId || '');
        navTo('constellation-section');
      } else {
        mdbToast('⚠️ This section is no longer available.');
        return false;
      }

      if (closePopup) closeSessionLoadPopup();
      return true;
    }

    function sessionLoadRestoreLocal(entryId) {
      if (!sessionLoadMode) return;
      const store = boardReadStore();
      const entries = Array.isArray(store[sessionLoadMode]) ? store[sessionLoadMode] : [];
      const entry = entries.find(e => e.id === entryId);
      if (!entry || !entry.data) {
        mdbToast('⚠️ This saved session is no longer available.');
        renderSessionLoadPopup();
        return;
      }
      boardRestoreLocalSessionEntry(sessionLoadMode, entry, { closePopup: true });
    }

    function renderSessionLoadPopup() {
      if (!sessionLoadMode) return;
      const title = document.getElementById('session-load-title');
      title.textContent = 'Load ' + boardSectionLabel(sessionLoadMode) + ' sessions';

      const listEl = document.getElementById('session-load-list');
      const store = boardReadStore();
      const entries = (Array.isArray(store[sessionLoadMode]) ? store[sessionLoadMode] : [])
        .sort((a, b) => b.savedAt - a.savedAt);

      listEl.innerHTML = '';
      if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'session-load-empty';
        empty.textContent = 'No saved entries yet. Use Save or wait for autosave, or load from file.';
        listEl.appendChild(empty);
        return;
      }

      entries.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'session-load-item';

        const name = boardEscapeHtml(entry.name || boardDefaultSessionName(sessionLoadMode));
        const entryClass = entry.classGroup ? getClassGroupLabel(entry.classGroup) : '';
        const classTag = entryClass ? ' [' + entryClass + ']' : '';
        const compList = Array.isArray(entry.competences) ? entry.competences : ((entry.data && Array.isArray(entry.data.competences)) ? entry.data.competences : []);
        const compBadges = compList.map(c => `<span class="session-load-comp-badge" title="${boardEscapeHtml(c.title || c.code || '')}">${boardEscapeHtml(c.code || c.title || '')}</span>`).join(' ');
        const meta = boardEscapeHtml(boardSourceLabel(entry.source) + ' - ' + boardFormatWhen(entry.savedAt) + classTag) + (compBadges ? ' ' + compBadges : '');
        item.innerHTML = '<div class="session-load-item-title">' + name + '</div>'
          + '<div class="session-load-item-meta">' + meta + '</div>';

        const actions = document.createElement('div');
        actions.style.marginTop = '8px';
        actions.style.display = 'flex';
        actions.style.gap = '6px';
        actions.style.flexWrap = 'wrap';

        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'action-btn btn-grey';
        openBtn.textContent = 'Open';
        openBtn.onclick = (ev) => {
          if (ev) ev.stopPropagation();
          boardRestoreLocalSessionEntry(sessionLoadMode, entry, { closePopup: true });
        };

        const openNewBtn = document.createElement('button');
        openNewBtn.type = 'button';
        openNewBtn.className = 'action-btn btn-grey';
        openNewBtn.textContent = 'Open in New Window';
        openNewBtn.onclick = async (ev) => {
          if (ev) ev.stopPropagation();
          await boardOpenSessionInNewWindow({
            type: 'local',
            mode: sessionLoadMode,
            entryId: entry.id
          });
        };

        actions.appendChild(openBtn);
        actions.appendChild(openNewBtn);
        item.appendChild(actions);
        listEl.appendChild(item);
      });
    }

    function boardClearForClassGroupChange() {
      if (window.conClearAll) window.conClearAll({ skipConfirm: true, resetTitle: true });
      if (typeof taClear === 'function') taClear();
      if (typeof noteClear === 'function') noteClear({ skipConfirm: true });
      boardStartNewSessionDate('constellation');
      boardStartNewSessionDate('textanalysis');
      boardStartNewSessionDate('notes');
      boardAutosaveFingerprint.constellation = '';
      boardAutosaveFingerprint.textanalysis = '';
      boardAutosaveFingerprint.notes = '';
    }

    let _boardMutationTimer = null;
    let _conDirtyResetTimer = null;

    function boardUpdateDocumentTitle() {
      if (new URLSearchParams(location.search).get('mirror') === '1') {
        document.title = 'Board – Presentation Mode';
        return;
      }
      const isPageWin = window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1';
      const pageParam = new URLSearchParams(location.search).get('viewPage');
      const pageNum = pageParam !== null ? (parseInt(pageParam, 10) + 1) : ((typeof conCurrentPageIndex === 'number' ? conCurrentPageIndex : 0) + 1);
      const baseTitle = (typeof conTitle === 'string' && conTitle.trim()) ? `${conTitle.trim()} — Board` : 'Board';
      if (isPageWin) {
        document.title = `[Page ${pageNum}] ${baseTitle} (${typeof t === 'function' ? t('conPageWindowBadge') : 'Secondary Window'})`;
        return;
      }
      document.title = (_boardIsDirty ? '● ' : '') + baseTitle;
    }

    function boardSetDirty(dirty, options = {}) {
      if (new URLSearchParams(location.search).get('mirror') === '1' || window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') {
        _boardIsDirty = false;
        return;
      }
      _boardIsDirty = !!dirty;
      boardUpdateDocumentTitle();

      if (new URLSearchParams(location.search).get('mirror') === '1') return;

      const indicator = document.getElementById('con-dirty-indicator');
      if (!indicator) return;

      if (_conDirtyResetTimer) {
        clearTimeout(_conDirtyResetTimer);
        _conDirtyResetTimer = null;
      }

      if (_boardIsDirty) {
        indicator.classList.remove('is-saved');
        indicator.classList.add('is-dirty');
        indicator.setAttribute('title', typeof t === 'function' ? t('conDirtyUnsaved') : 'Unsaved changes');
        indicator.style.display = 'inline-block';
      } else {
        if (options && options.justSaved) {
          indicator.classList.remove('is-dirty');
          indicator.classList.add('is-saved');
          indicator.setAttribute('title', typeof t === 'function' ? t('conDirtySaved') : 'All changes saved');
          indicator.style.display = 'inline-block';
          _conDirtyResetTimer = setTimeout(() => {
            if (!_boardIsDirty && indicator) {
              indicator.classList.remove('is-saved');
              indicator.style.display = 'none';
            }
            _conDirtyResetTimer = null;
          }, 1800);
        } else {
          indicator.classList.remove('is-dirty', 'is-saved');
          indicator.style.display = 'none';
        }
      }
    }

    function _boardScheduleSave(section) {
      if (new URLSearchParams(location.search).get('mirror') === '1' || window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') return;
      if (!_conCurrentFileName && !_conCurrentFolderName) return;

      const debounceMs = boardGetAutosaveDebounceMs();
      if (debounceMs <= 0) {
        if (_boardMutationTimer) {
          clearTimeout(_boardMutationTimer);
          _boardMutationTimer = null;
        }
        return;
      }

      const now = Date.now();
      if (!_boardMutationFirstDirtyAt) {
        _boardMutationFirstDirtyAt = now;
      }

      if (_boardMutationTimer) {
        clearTimeout(_boardMutationTimer);
        _boardMutationTimer = null;
      }

      const maxWaitMs = boardGetAutosaveMaxWaitMs(debounceMs);
      const elapsed = now - _boardMutationFirstDirtyAt;
      const delay = Math.max(1000, Math.min(debounceMs, maxWaitMs - elapsed));

      _boardMutationTimer = setTimeout(function _boardMutationFire() {
        _boardMutationTimer = null;
        if (!_boardIsDirty || (!_conCurrentFileName && !_conCurrentFolderName)) {
          _boardMutationFirstDirtyAt = 0;
          return;
        }

        // If user is currently interacting (dragging, drawing, typing, recording), defer by 2.5s
        if (boardIsUserInteracting()) {
          _boardMutationTimer = setTimeout(_boardMutationFire, 2500);
          return;
        }

        // If a save is already in flight, wait and retry
        if (_conIsSaving) {
          _boardMutationTimer = setTimeout(_boardMutationFire, 2000);
          return;
        }

        if (typeof conTrySilentInitialSave === 'function') conTrySilentInitialSave();
        boardAutosaveSection(section, { force: false });
      }, delay);
    }

    window.conMarkBoardDirty = function () {
      if (_conIsRestoringSession || !_boardInitComplete) return;
      boardSetDirty(true);
      _boardScheduleSave('constellation');
    };

    let _conAutosaveHideTimer = null;
    function boardShowAutosaveToast() {
      if (new URLSearchParams(location.search).get('mirror') === '1' || window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') return;
      if (_conAutosaveHideTimer) {
        clearTimeout(_conAutosaveHideTimer);
        _conAutosaveHideTimer = null;
      }
      let toast = document.getElementById('con-autosave-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'con-autosave-toast';
        toast.className = 'con-autosave-toast';
        document.body.appendChild(toast);
      }
      const labelText = (typeof t === 'function' ? t('conAutosaving') : 'Autosaving...');
      toast.innerHTML = `<span class="con-autosave-spinner"></span><span class="con-autosave-text" data-i18n="conAutosaving">${labelText}</span>`;
      toast.classList.add('visible');
    }

    function boardHideAutosaveToast(success = true) {
      const toast = document.getElementById('con-autosave-toast');
      if (toast) {
        if (success) {
          const savedText = (typeof t === 'function' ? t('conAutosaved') : 'Saved');
          toast.innerHTML = `<span class="con-autosave-check">✓</span><span class="con-autosave-text" data-i18n="conAutosaved">${savedText}</span>`;
        }
        if (_conAutosaveHideTimer) clearTimeout(_conAutosaveHideTimer);
        _conAutosaveHideTimer = setTimeout(() => {
          toast.classList.remove('visible');
          _conAutosaveHideTimer = null;
        }, 1000);
      }
      if (success) {
        boardSetDirty(false, { justSaved: true });
      }
    }

    function boardAutosaveSection(section, options = {}) {
      if (new URLSearchParams(location.search).get('mirror') === '1' || window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') return;
      const force = !!options.force;
      if (section !== 'constellation') return;
      // Do not autosave if no constellation session file is currently opened
      if (!_conCurrentFileName && !_conCurrentFolderName) return;
      if (!force && !_boardIsDirty) return;
      if (_conIsSaving) return; // Mutex: skip concurrent autosave

      let data = null;
      let hasContent = false;
      const classGroup = typeof options.classGroup === 'string' ? options.classGroup : (activeClassGroup || '');

      data = conBuildSessionData();
      hasContent = conSessionHasContent(data);
      if (!hasContent) {
        boardSetDirty(false);
        _boardMutationFirstDirtyAt = 0;
        if (_boardMutationTimer) { clearTimeout(_boardMutationTimer); _boardMutationTimer = null; }
        return;
      }

      const fp = boardComputeFingerprint(section, data);
      if (!force && boardAutosaveFingerprint[section] && boardAutosaveFingerprint[section] === fp) {
        boardSetDirty(false);
        _boardMutationFirstDirtyAt = 0;
        if (_boardMutationTimer) { clearTimeout(_boardMutationTimer); _boardMutationTimer = null; }
        return;
      }

      // If user is actively interacting and this isn't a forced save, defer
      if (!force && boardIsUserInteracting()) {
        if (_boardMutationTimer) clearTimeout(_boardMutationTimer);
        _boardMutationTimer = setTimeout(() => boardAutosaveSection(section, options), 2500);
        return;
      }

      _conIsSaving = true;
      boardShowAutosaveToast();
      let _finished = false;
      const _finishSave = (err) => {
        _conIsSaving = false;
        _conLastSaveTimestamp = Date.now();
        _boardMutationFirstDirtyAt = 0;
        if (_boardMutationTimer) { clearTimeout(_boardMutationTimer); _boardMutationTimer = null; }
        if (_finished) return;
        _finished = true;
        if (!err) {
          boardAutosaveFingerprint[section] = fp;
          boardHideAutosaveToast(true);
        } else {
          boardHideAutosaveToast(false);
        }
      };

      // If working on a named file in Electron, overwrite it directly instead of an autosave copy
      const _currentFileForSection = _conCurrentFileName;
      if (_currentFileForSection && window.Desktop && Desktop.isElectron()) {
        if (!conSessionHasMeaningfulContent(data)) {
          _finishSave();
          return;
        }
        const target = boardExportTargetForSection(section);
        const persistedAutosaveData = boardBuildPersistedSessionData(section, data);

        if (section === 'constellation') {
          const isArchive = _currentFileForSection.endsWith('.cstz') || _currentFileForSection.endsWith('.zip') || !_currentFileForSection.endsWith('.js');
          if (isArchive && typeof Desktop.saveBoardArchive === 'function') {
            const savePromise = conSaveSessionFolderBundle(_currentFileForSection, persistedAutosaveData, { isAutosave: true })
              .then(() => _finishSave())
              .catch((err) => { _finishSave(err); });
            boardPersistLocalSession(section, persistedAutosaveData, {
              source: 'autosave',
              classGroup,
              name: boardAutosaveName(section, persistedAutosaveData, classGroup)
            });
            return savePromise;
          }
        }

        const exportName = section === 'constellation' ? 'CONSTELLATION_SESSION_EXPORT'
          : section === 'notes' ? 'NOTES_SESSION_EXPORT'
            : 'TEXTANALYSIS_SESSION_EXPORT';
        const autosaveContent = boardBuildSessionFileContent(persistedAutosaveData, exportName);
        const autosaveFile = {
          filename: _currentFileForSection,
          content: autosaveContent,
          encoding: 'utf8'
        };
        if (section === 'constellation' && _conCurrentFolderName) {
          autosaveFile.subdir = _conCurrentFolderName;
        }
        const autosaveFiles = [autosaveFile];
        const savePromise = Desktop.saveFiles(target, autosaveFiles)
          .then(() => _finishSave())
          .catch((err) => { _finishSave(err); });
        boardPersistLocalSession(section, persistedAutosaveData, {
          source: 'autosave',
          classGroup,
          name: boardAutosaveName(section, persistedAutosaveData, classGroup)
        });
        return savePromise;
      }

      // No file currently loaded — update localStorage only, do not create a new file on disk
      boardPersistLocalSession(section, data, {
        source: 'autosave',
        classGroup,
        name: boardAutosaveName(section, data, classGroup)
      });
      _finishSave();
    }

    function boardResetAutosaveInterval() {
      if (_boardMutationTimer) {
        clearTimeout(_boardMutationTimer);
        _boardMutationTimer = null;
      }
      _boardMutationFirstDirtyAt = 0;
    }

    function boardAutosaveAllNow(options = {}) {
      if (!_conCurrentFileName && !_conCurrentFolderName) return;
      boardAutosaveSection('constellation', options);
    }

    function initBoardSessionAutosave() {
      if (new URLSearchParams(location.search).get('mirror') === '1' || window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') return;
      initBoardCloseUnsavedGuard();
    }

    let _conIsClosing = false;
    let _conClosePromptActive = false;

    async function conPerformAutosaveOnClose() {
      if (new URLSearchParams(location.search).get('mirror') === '1' || window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') return;
      try {
        const data = (typeof conBuildSessionData === 'function') ? conBuildSessionData() : null;
        if (!data || !conSessionHasContent(data)) {
          boardSetDirty(false);
          return;
        }

        const classGroup = typeof activeClassGroup === 'string' ? activeClassGroup : '';
        const persistedData = boardBuildPersistedSessionData('constellation', data);
        const titleVal = (window.conGetTitle ? window.conGetTitle() : '').trim();
        const curFileName = (typeof window._conCurrentFileName !== 'undefined' ? window._conCurrentFileName : _conCurrentFileName);
        const curFolderName = (typeof window._conCurrentFolderName !== 'undefined' ? window._conCurrentFolderName : _conCurrentFolderName);
        const filename = curFileName || (typeof boardDefaultFileName === 'function' ? boardDefaultFileName('constellation', titleVal) : 'board-session.cstz');

        if (typeof boardPersistLocalSession === 'function') {
          boardPersistLocalSession('constellation', persistedData, {
            source: 'autosave',
            classGroup,
            name: filename
          });
        }
        if (typeof boardSetAutosaveFingerprint === 'function') {
          boardSetAutosaveFingerprint('constellation', persistedData);
        }

        if (window.Desktop && Desktop.isElectron()) {
          const isArchive = filename.endsWith('.cstz') || filename.endsWith('.zip') || !filename.endsWith('.js');
          if (isArchive && typeof conSaveSessionFolderBundle === 'function') {
            await conSaveSessionFolderBundle(filename, persistedData, { isAutosave: true });
          } else {
            const exportName = 'CONSTELLATION_SESSION_EXPORT';
            const autosaveContent = boardBuildSessionFileContent(persistedData, exportName);
            const autosaveFile = {
              filename: filename,
              content: autosaveContent,
              encoding: 'utf8'
            };
            if (curFolderName) {
              autosaveFile.subdir = curFolderName;
            }
            await Desktop.saveFiles('mindmaps', [autosaveFile]);
          }
        }
        boardSetDirty(false, { justSaved: true });
      } catch (err) {
        console.warn('Autosave on close failed:', err);
      }
    }

    let _boardCloseGuardInitialized = false;
    function initBoardCloseUnsavedGuard() {
      if (_boardCloseGuardInitialized) return;
      if (new URLSearchParams(location.search).get('mirror') === '1' || window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') return;
      _boardCloseGuardInitialized = true;

      window.addEventListener('beforeunload', function (e) {
        const isDirty = (typeof window._boardIsDirty !== 'undefined' ? window._boardIsDirty : _boardIsDirty);
        if (!isDirty || _conIsClosing) return;

        // Prevent immediate close to display autosave confirmation prompt
        e.preventDefault();
        e.returnValue = false;

        if (_conClosePromptActive) return;
        _conClosePromptActive = true;

        (async function () {
          try {
            const title = (typeof t === 'function' ? t('conAutosaveCloseTitle') : '') || 'Unsaved Changes';
            const msg = (typeof t === 'function' ? t('conAutosaveOnClosePrompt') : '') || 'The board has unsaved changes. Would you like to save before closing?';
            const yesText = (typeof t === 'function' ? (t('conCloseSaveBtn') || t('btnYes')) : '') || '💾 Save & Close';
            const noText = (typeof t === 'function' ? (t('conCloseDiscardBtn') || t('btnNo')) : '') || '🗑 Discard';
            const cancelText = (typeof t === 'function' ? t('btnCancel') : '') || 'Cancel';
            const countdownMsg = (typeof t === 'function' ? t('conAutosaveCountdown') : '') || 'Saving automatically in {seconds}s...';

            let choice = true;
            if (typeof window.showTimedConfirm === 'function') {
              choice = await window.showTimedConfirm({
                title: title,
                msg: msg,
                yesText: yesText,
                noText: noText,
                cancelText: cancelText,
                timeoutSeconds: 10,
                countdownMsg: countdownMsg,
                defaultChoice: true
              });
            }

            if (choice === 'cancel') {
              // User cancelled close; keep window open and keep dirty state intact
              _conClosePromptActive = false;
              return;
            }

            if (choice === true) {
              await conPerformAutosaveOnClose();
            }

            // User chose Save (true) or Discard (false): proceed with closing
            boardSetDirty(false);
            _conIsClosing = true;
            _conClosePromptActive = false;
            if (window.Desktop && typeof Desktop.closeWindow === 'function') {
              Desktop.closeWindow();
            } else if (window.electronApi && typeof window.electronApi.closeWindow === 'function') {
              window.electronApi.closeWindow();
            } else {
              window.close();
            }
          } catch (err) {
            console.warn('Error during close confirmation / autosave:', err);
            _conClosePromptActive = false;
          }
        })();
      });
    }

    // Shared helper: returns one {trans,ipa,def} object per DB entry for a word.
    // If no DB entries exist, returns a single empty object so the word still appears in the export.
    // Always looks up the individual word directly (ignores dbWord override) so that when a node
    // contains multiple comma/slash-separated words, each one gets its own correct DB entry.
    function conWordExportFields(word) {
      const dbEntries = window.conLookupDbEntries ? window.conLookupDbEntries(word, null) : [];
      if (!dbEntries.length) return [{ trans: '', ipa: '', def: '', synonyms: '', antonyms: '' }];
      return dbEntries.map(e => {
        const defRaw = e.definition;
        const def = Array.isArray(defRaw) ? defRaw[0] : (defRaw || '');
        return {
          trans: e.french || e.translation || '',
          ipa: e.ipa || '',
          def,
          synonyms: Array.isArray(e.synonyms) ? e.synonyms.join(', ') : (e.synonyms || ''),
          antonyms: Array.isArray(e.antonyms) ? e.antonyms.join(', ') : (e.antonyms || ''),
        };
      });
    }

    function conShouldSkipWordExportNode(node) {
      const relation = String((node && node.relation) || '').toLowerCase();
      return relation === 'translation' || relation === 'ipa';
    }

    function conExportCSV() {
      const nodes = conGetAllPagesNodeData();
      const rows = [['Word', 'Page', 'Translation', 'IPA', 'Definition']];
      nodes.forEach(n => {
        if (conShouldSkipWordExportNode(n)) return;
        const rawText = (n.baseWord || (n.el ? n.el.textContent : '') || '').trim().replace(/\n[\s\S]*/, '');
        if (!rawText) return;
        const page = n.pageNum != null ? String(n.pageNum) : '';

        // Split node text into individual words/entries. Split on commas, slashes, semicolons or newlines.
        const parts = rawText.split(/[,/;\n]+/).map(s => s.trim()).filter(Boolean);

        parts.forEach(word => {
          const entries = conWordExportFields(word);
          entries.forEach(({ trans, ipa, def }) => {
            rows.push([word, page, trans, ipa, def]);
          });
        });
      });
      const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
      const titleVal = (document.getElementById('con-title-input')?.value || '').trim() || 'board';
      const filename = titleVal.replace(/[\/\\?*:|"<>]/g, '-') + '-words.csv';

      if (window.Desktop && Desktop.isElectron()) {
        Desktop.saveToDisk({
          title: 'Save CSV File',
          defaultPath: filename,
          filters: [{ name: 'CSV Files', extensions: ['csv'] }],
          content: '\uFEFF' + csv,
          encoding: 'utf8'
        }).then(result => {
          if (result && result.ok) {
            if (window.showExportSuccessPopup) showExportSuccessPopup(result.path, filename);
          } else if (result && !result.ok && !result.canceled) {
            if (typeof mdbToast === 'function') mdbToast('⚠️ Save failed: ' + (result.error || 'unknown'));
          }
        });
      } else {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      }
    }


    // Offer CSV or PDF export. PDF exports only the words/definitions table (printable HTML -> print/save as PDF).
    function conExport() {
      // Inline chooser shown next to the Export button
      const existing = document.getElementById('con-export-chooser');
      if (existing) { existing.remove(); return; }

      const btn = event && event.currentTarget ? event.currentTarget : document.querySelector('[onclick="conExport()"]');
      const rect = btn ? btn.getBoundingClientRect() : { left: 100, top: 100, height: 28 };

      const chooser = document.createElement('div');
      chooser.id = 'con-export-chooser';
      chooser.style.position = 'fixed';
      chooser.style.left = Math.max(10, Math.min(window.innerWidth - 240, rect.left)) + 'px';
      chooser.style.top = (rect.bottom + 6) + 'px';
      chooser.style.background = '#f5f5f0';
      chooser.style.border = '2px solid #333333';
      chooser.style.boxShadow = '4px 4px 0 #555555';
      chooser.style.padding = '8px';
      chooser.style.zIndex = 99999;
      chooser.style.borderRadius = '8px';
      chooser.style.fontFamily = '"Lexend", "Segoe UI", Arial, sans-serif';
      chooser.style.width = '210px';
      chooser.style.display = 'flex';
      chooser.style.flexDirection = 'column';
      chooser.style.gap = '4px';

      const titleEl = document.createElement('div');
      titleEl.textContent = 'EXPORT OPTIONS';
      titleEl.style.fontSize = '9.5px';
      titleEl.style.fontWeight = '800';
      titleEl.style.letterSpacing = '0.5px';
      titleEl.style.color = '#555555';
      titleEl.style.padding = '2px 4px 6px';
      titleEl.style.borderBottom = '1.5px solid #ddddda';
      titleEl.style.marginBottom = '2px';
      chooser.appendChild(titleEl);

      function createExportBtn(text, bg, isPrimary) {
        const b = document.createElement('button');
        b.textContent = text;
        b.style.display = 'flex';
        b.style.alignItems = 'center';
        b.style.width = '100%';
        b.style.padding = '6px 10px';
        b.style.fontSize = '11px';
        b.style.fontWeight = isPrimary ? '800' : '700';
        b.style.border = '2px solid #333333';
        b.style.borderRadius = '6px';
        b.style.boxShadow = '2px 2px 0 #555555';
        b.style.background = bg || '#ffffff';
        b.style.color = '#111111';
        b.style.cursor = 'pointer';
        b.style.textAlign = 'left';
        b.style.transition = 'transform 0.1s, box-shadow 0.1s';
        b.onmouseenter = () => { b.style.transform = 'translate(-1px, -1px)'; b.style.boxShadow = '3px 3px 0 #555555'; };
        b.onmouseleave = () => { b.style.transform = 'none'; b.style.boxShadow = '2px 2px 0 #555555'; };
        b.onmousedown = () => { b.style.transform = 'translate(1px, 1px)'; b.style.boxShadow = '1px 1px 0 #555555'; };
        b.onmouseup = () => { b.style.transform = 'none'; b.style.boxShadow = '2px 2px 0 #555555'; };
        return b;
      }

      const pagesPdfVectorBtn = createExportBtn('Export Pages PDF (Vector)', '#e2c96e', true);
      pagesPdfVectorBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conExportPagesPDF('vector'); };

      const pagesPdfSnapshotBtn = createExportBtn('Export Pages PDF (Snapshots)', '#ffffff');
      pagesPdfSnapshotBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conOpenExportSettingsModal('pdf_snapshots'); };

      const webpBtn = createExportBtn(window.i18n ? i18n.t('conExportOptWebpImg') : 'Export WebP Image', '#ffffff');
      webpBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conOpenExportSettingsModal('webp'); };

      const pdfBtn = createExportBtn('Export Words Table PDF', '#ffffff');
      pdfBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conExportPDF(); };

      const pngBtn = createExportBtn('Export PNG', '#ffffff');
      pngBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conExportPNG(); };

      const copyPngBtn = createExportBtn('Copy PNG', '#ffffff');
      copyPngBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conCopyPNG(); };

      const csvBtn = createExportBtn('Export CSV', '#ffffff');
      csvBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conExportCSV(); };

      const jsBtn = createExportBtn('Export as JS', '#ffffff');
      jsBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conExportJS(); };

      const cancelBtn = createExportBtn('Cancel', '#f1f1f0');
      cancelBtn.style.color = '#666666';
      cancelBtn.style.boxShadow = '1px 1px 0 #888888';
      cancelBtn.style.border = '1.5px solid #666666';
      cancelBtn.onclick = e => { e.stopPropagation(); chooser.remove(); };

      chooser.appendChild(pagesPdfVectorBtn);
      chooser.appendChild(pagesPdfSnapshotBtn);
      chooser.appendChild(webpBtn);
      chooser.appendChild(pdfBtn);
      chooser.appendChild(pngBtn);
      chooser.appendChild(copyPngBtn);
      chooser.appendChild(csvBtn);
      chooser.appendChild(jsBtn);
      chooser.appendChild(cancelBtn);
      document.body.appendChild(chooser);

      // Close chooser on outside click or Escape
      function onBodyClick(ev) {
        if (!chooser.contains(ev.target)) { chooser.remove(); document.removeEventListener('click', onBodyClick); document.removeEventListener('keydown', onKey); }
      }
      function onKey(ev) { if (ev.key === 'Escape') { chooser.remove(); document.removeEventListener('click', onBodyClick); document.removeEventListener('keydown', onKey); } }
      setTimeout(() => document.addEventListener('click', onBodyClick));
      document.addEventListener('keydown', onKey);
    }

    async function conExportJS() {
      const data = conBuildSessionData();
      if (!conSessionHasContent(data)) {
        mdbToast('⚠️ Nothing to export — add at least one node, note, or title first.');
        return;
      }
      const persistedData = boardBuildPersistedSessionData('constellation', data);
      const titleVal = window.conGetTitle ? window.conGetTitle() : '';
      const filename = boardDefaultFileName('constellation', titleVal);

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.exportFiles === 'function') {
        try {
          const bundle = await conBuildSessionFolderBundle(filename, persistedData, { isManualSave: true });
          const result = await Desktop.exportFiles(bundle.files.map(file => ({
            filename: file.filename,
            relativeExportPath: (file.subdir ? (file.subdir + '/') : '') + file.filename,
            content: file.content,
            encoding: file.encoding || 'utf8',
            mtimeMs: file.mtimeMs || undefined
          })));
          if (!result || result.canceled) return;
          if (!result.ok) {
            throw new Error(result.error || 'Export failed.');
          }
          const errors = Array.isArray(result.errors) ? result.errors : [];
          const errCount = Array.isArray(result.errors) ? result.errors.length : 0;
          if (errCount > 0) {
            const firstError = errors[0] && errors[0].error ? ' First error: ' + errors[0].error : '';
            mdbToast('⚠️ Exported Constellation folder with ' + errCount + ' error(s).' + firstError);
          } else {
            mdbToast('✔ Exported Constellation folder: ' + bundle.folderName);
            if (window.showExportSuccessPopup && result.folderPath) {
              showExportSuccessPopup(result.folderPath, bundle.folderName, true);
            }
          }
          return;
        } catch (error) {
          mdbToast('⚠️ Could not export Constellation folder: ' + (error && error.message ? error.message : String(error)));
          return;
        }
      }

      const blob = boardBuildSessionBlob(persistedData, 'CONSTELLATION_SESSION_EXPORT');
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: 'JavaScript Files', accept: { 'text/javascript': ['.js'] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          _conCurrentFileName = handle.name;
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.error('File System API error:', err);
        }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    function conExportPDF() {
      const nodes = conGetAllPagesNodeData();
      const drawings = window.conGetDrawings ? window.conGetDrawings() : [];
      const shapes = window.conGetShapes ? window.conGetShapes() : [];
      document.getElementById('con-pdf-picker-overlay').classList.add('active');
    }

    function conPdfPickerClose() {
      document.getElementById('con-pdf-picker-overlay').classList.remove('active');
    }

    async function conGetEmbeddedLexendFontsCss() {
      const weights = [300, 400, 500, 600, 700];
      let css = '';
      for (const weight of weights) {
        try {
          const relPath = 'modules/lexend/lexend-latin-' + weight + '-normal.woff2';
          const r = await Desktop.readByPath('app', relPath, { encoding: 'base64' });
          if (r && r.ok && r.content) {
            css += '@font-face {\n  font-family: \'Lexend\';\n  font-weight: ' + weight + ';\n  font-style: normal;\n  src: url(\'data:font/woff2;base64,' + r.content + '\') format(\'woff2\');\n}\n';
          }
        } catch (e) {
          console.warn('Failed to embed Lexend font weight ' + weight, e);
        }
      }
      return css;
    }

    async function _doConExportPDF() {
      conPdfPickerClose();
      const lexendFontsCss = await conGetEmbeddedLexendFontsCss();
      const chk = id => document.getElementById(id).checked;
      const fields = {
        page: chk('cpf-page'),
        translation: chk('cpf-translation'),
        ipa: chk('cpf-ipa'),
        definition: chk('cpf-definition'),
        synonyms: chk('cpf-synonyms'),
        antonyms: chk('cpf-antonyms'),
      };

      const nodes = conGetAllPagesNodeData();
      const _pdfDrawings = window.conGetDrawings ? window.conGetDrawings() : [];
      const _pdfShapes = window.conGetShapes ? window.conGetShapes() : [];
      // Build column definitions
      const cols = [{ label: 'Word' }];
      if (fields.page) cols.push({ label: 'Page' });
      if (fields.translation) cols.push({ label: 'Translation' });
      if (fields.ipa) cols.push({ label: 'IPA' });
      if (fields.definition) cols.push({ label: 'Definition' });
      if (fields.synonyms) cols.push({ label: 'Synonyms' });
      if (fields.antonyms) cols.push({ label: 'Antonyms' });

      const dataRows = [];
      nodes.forEach(n => {
        if (conShouldSkipWordExportNode(n)) return;
        const rawText = (n.baseWord || (n.el ? n.el.textContent : '') || '').trim().replace(/\n[\s\S]*/, '');
        if (!rawText) return;
        const page = n.pageNum != null ? String(n.pageNum) : '';
        const parts = rawText.split(/[,/;\n]+/).map(s => s.trim()).filter(Boolean);
        parts.forEach(word => {
          const entries = conWordExportFields(word);
          entries.forEach(({ trans, ipa, def, synonyms, antonyms }) => {
            const row = [word];
            if (fields.page) row.push(page);
            if (fields.translation) row.push(trans);
            if (fields.ipa) row.push(ipa);
            if (fields.definition) row.push(def);
            if (fields.synonyms) row.push(synonyms);
            if (fields.antonyms) row.push(antonyms);
            dataRows.push(row);
          });
        });
      });

      function getPdfExportSettings() {
        const cfg = (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG)
          ? CLASS_MANAGEMENT_CONFIG
          : (window.CLASS_MANAGEMENT_CONFIG || {});
        const exp = cfg.export || {};
        
        let margin = '16mm 14mm';
        if (exp.pdfMargin) {
          if (typeof exp.pdfMargin === 'string') margin = exp.pdfMargin;
          else if (typeof exp.pdfMargin === 'number') margin = exp.pdfMargin + 'mm';
          else if (typeof exp.pdfMargin === 'object') {
            const t = exp.pdfMargin.top || '16mm';
            const r = exp.pdfMargin.right || '14mm';
            const b = exp.pdfMargin.bottom || '16mm';
            const l = exp.pdfMargin.left || '14mm';
            margin = `${t} ${r} ${b} ${l}`;
          }
        } else if (exp.margin) {
          if (typeof exp.margin === 'string') margin = exp.margin;
          else if (typeof exp.margin === 'number') margin = exp.margin + 'mm';
        }

        let orientation = (exp.orientation || exp.pdfOrientation || 'portrait').toLowerCase();
        if (orientation !== 'landscape' && orientation !== 'portrait') orientation = 'portrait';

        const pageSize = (exp.pageSize || exp.size || 'A4').trim();

        return {
          margin: margin,
          orientation: orientation,
          isLandscape: orientation === 'landscape',
          pageSize: pageSize
        };
      }

      function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
      const titleVal = (document.getElementById('con-title-input')?.value || '').trim() || 'board';
      const displayTitle = escapeHtml(titleVal);
      const pdfSettings = getPdfExportSettings();

      const headerCells = cols.map(c => '<th>' + escapeHtml(c.label) + '</th>').join('');
      let tableHtml = '<table><thead><tr>' + headerCells + '</tr></thead><tbody>';
      dataRows.forEach(r => { tableHtml += '<tr>' + r.map(c => '<td>' + escapeHtml(c) + '</td>').join('') + '</tr>'; });
      tableHtml += '</tbody></table>';

      const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + displayTitle + '</title>'
        + '<style>' + lexendFontsCss + 'body{font-family:\'Lexend\',\'Segoe UI\',Arial,sans-serif;margin:0;padding:0;}h1{font-size:18px;margin-bottom:8px;border-bottom:2.5px solid #111;padding-bottom:4px}table{border-collapse:collapse;width:100%;border:2px solid #111}thead{display:table-header-group}tr{page-break-inside:avoid;break-inside:avoid}th,td{border:2px solid #111;padding:6px;text-align:left;vertical-align:top}th{background:#f0f0f0;font-weight:800}@page{size:' + pdfSettings.pageSize + ' ' + pdfSettings.orientation + ';margin:' + pdfSettings.margin + ';}@media print{button{display:none};body{margin:0;padding:0;}}</style>'
        + '</head><body><h1>' + displayTitle + '</h1>' + tableHtml + '</body></html>';

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.printPdf === 'function') {
        const safeTitle = titleVal.replace(/[\\/:*?"<>|]/g, '_') || 'vocabulary';
        const defaultName = safeTitle + '.pdf';

        const doPrint = (targetFilename, isToPrint) => {
          const pdfReq = {
            html,
            landscape: pdfSettings.isLandscape,
            pdfOptions: { pageSize: pdfSettings.pageSize, landscape: pdfSettings.isLandscape, printBackground: true }
          };
          if (isToPrint) {
            pdfReq.target = 'toPrint';
            pdfReq.filename = targetFilename;
          } else {
            pdfReq.defaultName = targetFilename;
          }
          Desktop.printPdf(pdfReq).then(result => {
            if (result && result.ok) {
              if (window.showExportSuccessPopup && result.path) {
                showExportSuccessPopup(result.path, result.name || targetFilename);
              } else if (typeof mdbToast === 'function') {
                mdbToast('✓ PDF saved: ' + (result.name || targetFilename));
              }
            } else if (!result.ok && !result.canceled) {
              mdbToast('⚠️ Could not save PDF: ' + (result.error || 'unknown error'));
            }
          }).catch(err => {
            mdbToast('⚠️ Could not save PDF: ' + (err && err.message ? err.message : String(err)));
          });
        };

        if (typeof window.promptExportDestination === 'function') {
          window.promptExportDestination({
            title: 'Export Vocabulary Table PDF',
            prompt: 'Where do you want to save the exported PDF?',
            filename: defaultName,
            allowDocEditor: false
          }).then(destRes => {
            if (!destRes || destRes.canceled) return;
            doPrint(destRes.filename || defaultName, destRes.destination === 'to-print');
          });
        } else {
          doPrint(defaultName, false);
        }
      } else {
        let iframe = document.getElementById('con-pdf-iframe');
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = 'con-pdf-iframe';
          iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;top:-9999px';
          document.body.appendChild(iframe);
        }
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open(); doc.write(html); doc.close();
        setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { /* ignore */ } }, 350);
      }
    }

    async function conPrepareAttachmentBundle(folderName) {
      const metadata = [];
      const files = [];
      const taken = new Set();
      const mediaDirs = ['pics', 'sounds', 'videos', 'pdf'];

      mediaDirs.forEach(dir => {
        files.push({
          filename: '.keep',
          subdir: folderName + '/' + dir,
          content: '',
          encoding: 'utf8'
        });
      });

      for (const item of conAttachments) {
        const kind = conAttachmentKind(item.name, item.mime) || item.kind;
        if (!kind) continue;
        const fallbackExt = kind === 'pdf' ? '.pdf' : '';
        let safeName = conSanitizeAttachmentName(item.name, fallbackExt);
        const ext = (() => {
          const idx = safeName.lastIndexOf('.');
          return idx >= 0 ? safeName.slice(idx) : '';
        })();
        const baseNoExt = ext ? safeName.slice(0, -ext.length) : safeName;
        let suffix = 2;
        while (taken.has((kind + '/' + safeName).toLowerCase())) {
          safeName = baseNoExt + '-' + suffix + ext;
          suffix += 1;
        }
        taken.add((kind + '/' + safeName).toLowerCase());

        const nextRelativePath = folderName + '/' + kind + '/' + safeName;
        let base64 = item.base64 || '';

        if (!base64 && item.file) {
          try {
            base64 = await conReadAttachmentFileBase64(item.file);
          } catch (error) {
            console.info('Could not read selected attachment:', item.name, error);
          }
        }
        if (!base64 && item._cachedDataUrl && item._cachedDataUrl.startsWith('data:')) {
          const commaIdx = item._cachedDataUrl.indexOf(',');
          if (commaIdx >= 0) base64 = item._cachedDataUrl.slice(commaIdx + 1);
        }
        if (!base64 && item._cachedObjectUrl && item._cachedObjectUrl.startsWith('blob:')) {
          try {
            const resp = await fetch(item._cachedObjectUrl);
            const blob = await resp.blob();
            base64 = await conReadAttachmentFileBase64(blob);
          } catch (e) {
            console.warn('Could not read blob url for attachment:', item.name, e);
          }
        }
        if (!base64 && window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function') {
          const candidates = conAttachmentCandidateRelativePaths(item);
          for (const candidatePath of candidates) {
            try {
              const readResult = await Desktop.readByPath('mindmaps', candidatePath, { encoding: 'base64' });
              if (readResult && readResult.ok && readResult.content) {
                base64 = String(readResult.content);
                break;
              }
            } catch { }
          }
          if (!base64) {
            console.info('Could not copy existing attachment from known paths:', candidates);
          }
        }

        if (base64) {
          if (base64.startsWith('data:')) {
            const commaIdx = base64.indexOf(',');
            if (commaIdx >= 0) base64 = base64.slice(commaIdx + 1);
          }
          item.base64 = base64;
          files.push({
            filename: safeName,
            subdir: folderName + '/' + kind,
            content: base64,
            encoding: 'base64'
          });
        }

        metadata.push({
          id: item.id,
          name: safeName,
          mime: item.mime || conGuessMimeByName(item.name, kind) || '',
          kind,
          size: Number(item.size) || (base64 ? Math.round(base64.length * 0.75) : 0),
          relativePath: base64 ? nextRelativePath : (item.relativePath || nextRelativePath)
        });
      }

      return { files, metadata };
    }

    function conExtractSearchTextFromSession(dataObj, maxLen = 50000) {
      if (!dataObj || typeof dataObj !== 'object') return '';
      const tokens = [];
      let totalLen = 0;

      function addText(str) {
        if (!str || totalLen >= maxLen) return;
        const clean = String(str).trim();
        if (!clean) return;
        tokens.push(clean);
        totalLen += clean.length + 1;
      }

      function processPage(page) {
        if (!page || typeof page !== 'object') return;
        addText(page.title);

        if (Array.isArray(page.nodes)) {
          for (const node of page.nodes) {
            if (!node) continue;
            addText(node.baseWord);
            addText(node.dbWord);
            addText(node.sourceWord);
            addText(node.notes);
            addText(node.comment);
            addText(node.label);
          }
        }

        if (Array.isArray(page.notes)) {
          for (const note of page.notes) {
            if (!note) continue;
            addText(note.title);
            addText(note.text);
            addText(note.content);
          }
        }

        if (Array.isArray(page.tables)) {
          for (const table of page.tables) {
            if (!table) continue;
            addText(table.title);
            if (Array.isArray(table.headers)) {
              for (const h of table.headers) addText(h);
            }
            if (Array.isArray(table.rows)) {
              for (const row of table.rows) {
                if (Array.isArray(row)) {
                  for (const cell of row) addText(cell);
                }
              }
            }
          }
        }

        if (Array.isArray(page.groups)) {
          for (const group of page.groups) {
            if (!group) continue;
            addText(group.title);
            addText(group.label);
          }
        }

        if (Array.isArray(page.edges)) {
          for (const edge of page.edges) {
            if (!edge) continue;
            addText(edge.label);
          }
        }

        if (Array.isArray(page.shapes)) {
          for (const shape of page.shapes) {
            if (!shape) continue;
            addText(shape.text);
            addText(shape.label);
          }
        }

        if (Array.isArray(page.media)) {
          for (const m of page.media) {
            if (!m) continue;
            addText(m.title);
            addText(m.name);
            addText(m.caption);
          }
        }
      }

      addText(dataObj.title);
      if (Array.isArray(dataObj.pages) && dataObj.pages.length > 0) {
        for (const page of dataObj.pages) {
          processPage(page);
        }
      } else {
        processPage(dataObj);
      }

      return tokens.join(' ').slice(0, maxLen);
    }

    async function conRebuildPageVisualSnapshots(pages, options = {}) {
      const isAutosave = !!(options && options.isAutosave);
      const total = Array.isArray(pages) ? pages.length : 0;
      if (!Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs = [];

      // 1. Refresh active page visual snapshot with full-resolution live board canvas
      if (typeof conCurrentPageIndex === 'number' && conCurrentPageIndex >= 0 && conCurrentPageIndex < total) {
        const liveSnap = (typeof conBuildPageSnapshot === 'function')
          ? conBuildPageSnapshot()
          : (conPageSnapshots && conPageSnapshots[conCurrentPageIndex]);
        if (liveSnap && Array.isArray(conPageSnapshots)) {
          conPageSnapshots[conCurrentPageIndex] = liveSnap;
        }
        let activeDataUrl = '';
        if (typeof _conBuildBoardCanvas === 'function') {
          try {
            const liveRes = await _conBuildBoardCanvas();
            if (liveRes && liveRes.canvas) {
              activeDataUrl = liveRes.canvas.toDataURL('image/webp', 0.92);
              if (!activeDataUrl || !activeDataUrl.startsWith('data:image/webp')) {
                activeDataUrl = liveRes.canvas.toDataURL('image/png');
              }
            }
          } catch (err) {
            console.warn('[Board] _conBuildBoardCanvas error on snapshot capture:', err);
          }
        }
        if (!activeDataUrl && liveSnap && typeof conBuildPageThumbnailDataUrl === 'function') {
          try {
            activeDataUrl = conBuildPageThumbnailDataUrl(liveSnap, 800, 533);
          } catch (_) {}
        }
        if (activeDataUrl) {
          _conPageSnapshotPngs[conCurrentPageIndex] = activeDataUrl;
        }
      }

      // 2. For inactive pages: preserve existing real high-res snapshots; only generate if missing
      for (let i = 0; i < total; i++) {
        if (i === conCurrentPageIndex) continue;
        if (!_conPageSnapshotPngs[i] && typeof conBuildPageThumbnailDataUrl === 'function' && pages[i]) {
          try {
            const url = conBuildPageThumbnailDataUrl(pages[i], 800, 533);
            if (url) _conPageSnapshotPngs[i] = url;
          } catch (_) {}
        }
      }

      // 3. Update DOM mini-strip thumbnails in-place so UI matches fresh snapshots
      if (!isAutosave) {
        const strip = document.getElementById('con-page-mini-strip');
        if (strip) {
          const thumbs = strip.querySelectorAll('.con-page-mini-thumb');
          thumbs.forEach((btn, i) => {
            if (_conPageSnapshotPngs && _conPageSnapshotPngs[i]) {
              const img = btn.querySelector('img');
              const canvas = btn.querySelector('canvas');
              if (img && img.src !== _conPageSnapshotPngs[i]) {
                img.src = _conPageSnapshotPngs[i];
                img.style.display = 'block';
                img.dataset.pngLoaded = '1';
                if (canvas) canvas.style.display = 'none';
              }
            }
          });
        }
      }
    }

    async function conBuildSessionArchiveBundle(sessionFilename, persistedData, options = {}) {
      const isAutosave = !!(options && options.isAutosave);
      const normalizedFilename = sessionFilename.endsWith('.cstz')
        ? sessionFilename
        : (sessionFilename.endsWith('.js') || sessionFilename.endsWith('.json') || sessionFilename.endsWith('.zip'))
          ? boardStripJsonExt(sessionFilename) + '.cstz'
          : sessionFilename + '.cstz';
      const baseName = boardStripJsonExt(normalizedFilename);
      const attachmentBundle = await conPrepareAttachmentBundle(baseName);

      const attachmentById = {};
      (attachmentBundle.metadata || []).forEach(meta => {
        if (!meta || !meta.id) return;
        attachmentById[String(meta.id)] = meta;
      });

      function conNormalizeMediaPathRefsInSession(dataObj) {
        if (!dataObj || typeof dataObj !== 'object') return dataObj;
        function patchPage(pageObj) {
          if (!pageObj || typeof pageObj !== 'object') return;
          const mediaList = Array.isArray(pageObj.media) ? pageObj.media : [];
          mediaList.forEach(m => {
            const linked = m && m.attachmentId ? attachmentById[String(m.attachmentId)] : null;
            if (!linked) return;
            m.name = linked.name || m.name;
            m.mime = linked.mime || m.mime;
            m.relativePath = linked.relativePath || m.relativePath;
          });
          if (pageObj.backgroundPdf && pageObj.backgroundPdf.attachmentId) {
            const linkedPdf = attachmentById[String(pageObj.backgroundPdf.attachmentId)];
            if (linkedPdf) {
              pageObj.backgroundPdf.name = linkedPdf.name || pageObj.backgroundPdf.name;
              pageObj.backgroundPdf.mime = linkedPdf.mime || pageObj.backgroundPdf.mime;
              pageObj.backgroundPdf.relativePath = linkedPdf.relativePath || pageObj.backgroundPdf.relativePath;
            }
          }
        }

        if (Array.isArray(dataObj.pages)) {
          dataObj.pages.forEach(patchPage);
        } else {
          patchPage(dataObj);
        }
        return dataObj;
      }

      const dataToSave = Object.assign({}, persistedData, {
        attachments: attachmentBundle.metadata
      });
      conNormalizeMediaPathRefsInSession(dataToSave);

      const pages = (Array.isArray(dataToSave.pages) && dataToSave.pages.length > 0)
        ? dataToSave.pages
        : [dataToSave];

      // Rebuild visual snapshots: all pages on manual save, fast cache on autosave
      await conRebuildPageVisualSnapshots(pages, options);

      const createdAtMs = Number(dataToSave._createdAt || dataToSave.createdAt)
        || (dataToSave.dateCreated ? Date.parse(String(dataToSave.dateCreated).replace(/_\d+$/, '')) : 0)
        || Date.now();
      const savedAtMs = Number(dataToSave._savedAt || dataToSave.savedAt) || Date.now();

      const manifest = {
        version: 1,
        format: 'cstz',
        title: dataToSave.title || baseName,
        classGroup: dataToSave._classGroup || dataToSave.classGroup || '',
        plannerEntryId: dataToSave._plannerEntryId || '',
        pageCount: pages.length,
        nodeCount: Array.isArray(dataToSave.nodes) ? dataToSave.nodes.length : 0,
        thumbnail: 'page-snapshots/page-001.webp',
        createdAt: createdAtMs,
        dateCreated: dataToSave.dateCreated || new Date(createdAtMs).toISOString(),
        updatedAt: savedAtMs,
        savedAt: savedAtMs,
        searchText: conExtractSearchTextFromSession(dataToSave, 50000)
      };

      const entries = [
        {
          name: 'manifest.json',
          data: isAutosave ? JSON.stringify(manifest) : JSON.stringify(manifest, null, 2),
          encoding: 'utf8',
          store: true
        },
        {
          name: 'board.json',
          data: isAutosave ? JSON.stringify(dataToSave) : JSON.stringify(dataToSave, null, 2),
          encoding: 'utf8',
          store: true
        }
      ];

      // Add thumbnail entries for all pages into the archive
      for (let i = 0; i < pages.length; i += 1) {
        let snapDataUrl = (_conPageSnapshotPngs && _conPageSnapshotPngs[i]) || '';
        if (!snapDataUrl && typeof conBuildPageThumbnailDataUrl === 'function') {
          try {
            snapDataUrl = conBuildPageThumbnailDataUrl(pages[i], 480, 320);
            if (snapDataUrl) {
              if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
              _conPageSnapshotPngs[i] = snapDataUrl;
            }
          } catch (_) {}
        }
        if (snapDataUrl) {
          let ext = 'webp';
          let base64Data = '';
          const commaIdx = snapDataUrl.indexOf(',');
          if (commaIdx >= 0) {
            const header = snapDataUrl.slice(0, commaIdx);
            if (header.includes('image/png')) ext = 'png';
            else if (header.includes('image/jpeg') || header.includes('image/jpg')) ext = 'jpg';
            else ext = 'webp';
            base64Data = snapDataUrl.slice(commaIdx + 1);
          } else {
            base64Data = snapDataUrl;
          }
          const padded = String(i + 1).padStart(3, '0');
          entries.push({
            name: 'page-snapshots/page-' + padded + '.' + ext,
            data: base64Data,
            encoding: 'base64',
            store: true
          });
          if (i === 0) {
            entries.push({
              name: 'thumbnail.' + ext,
              data: base64Data,
              encoding: 'base64',
              store: true
            });
            manifest.thumbnail = 'page-snapshots/page-001.' + ext;
          }
        }
      }

      for (const f of attachmentBundle.files) {
        if (f.filename === '.keep') continue;
        const mediaPath = f.subdir ? (f.subdir.replace(/^[^/]+\//, '') + '/' + f.filename) : f.filename;
        entries.push({
          name: 'media/' + mediaPath,
          data: f.content,
          encoding: f.encoding || 'utf8',
          store: true
        });
      }

      return {
        filename: normalizedFilename,
        baseName,
        data: dataToSave,
        entries,
        attachments: attachmentBundle.metadata
      };
    }

    async function conParseBoardArchiveArrayBuffer(buffer) {
      const bytes = new Uint8Array(buffer);
      const view = new DataView(buffer);
      let offset = 0;
      let manifest = null;
      let boardData = null;
      const history = [];
      const media = {};
      const thumbnails = {};

      while (offset < bytes.length - 22) {
        const sig = view.getUint32(offset, true);
        if (sig === 0x04034b50) {
          const filenameLen = view.getUint16(offset + 26, true);
          const extraLen = view.getUint16(offset + 28, true);
          const compressedSize = view.getUint32(offset + 18, true);
          const compressionMethod = view.getUint16(offset + 8, true);

          const filenameBytes = bytes.subarray(offset + 30, offset + 30 + filenameLen);
          const filename = new TextDecoder('utf-8').decode(filenameBytes);
          const dataStart = offset + 30 + filenameLen + extraLen;
          const dataEnd = dataStart + compressedSize;

          let entryDataBytes = null;
          if (compressionMethod === 8) {
            if (typeof DecompressionStream === 'function') {
              try {
                const ds = new DecompressionStream('deflate-raw');
                const writer = ds.writable.getWriter();
                writer.write(bytes.subarray(dataStart, dataEnd));
                writer.close();
                const res = await new Response(ds.readable).arrayBuffer();
                entryDataBytes = new Uint8Array(res);
              } catch (e) {
                console.error('DecompressionStream error:', e);
              }
            }
          } else if (compressionMethod === 0) {
            entryDataBytes = bytes.subarray(dataStart, dataEnd);
          }

          if (entryDataBytes) {
            if (filename === 'manifest.json') {
              try { manifest = JSON.parse(new TextDecoder('utf-8').decode(entryDataBytes)); } catch {}
            } else if (filename === 'board.json') {
              try { boardData = JSON.parse(new TextDecoder('utf-8').decode(entryDataBytes)); } catch {}
            } else if (filename.startsWith('history/') && filename.endsWith('.json')) {
              try {
                history.push({
                  name: filename.slice('history/'.length),
                  data: JSON.parse(new TextDecoder('utf-8').decode(entryDataBytes))
                });
              } catch {}
            } else if (filename.startsWith('page-snapshots/') || filename.startsWith('thumbnails/') || filename.startsWith('thumbnail.') || filename === 'thumbnail.png') {
              let binary = '';
              const chunkSize = 8192;
              for (let i = 0; i < entryDataBytes.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, entryDataBytes.subarray(i, i + chunkSize));
              }
              const base64 = btoa(binary);
              const mimeType = (filename.endsWith('.png')) ? 'image/png' : (filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 'image/webp');
              const dataUrl = 'data:' + mimeType + ';base64,' + base64;
              thumbnails[filename] = dataUrl;
              const mediaEntry = {
                name: filename.split('/').pop(),
                kind: 'pics',
                subPath: filename,
                base64: base64,
                size: entryDataBytes.length
              };
              media[filename] = mediaEntry;
            } else if (filename.startsWith('media/') || /^(pdf|pics|images|sounds|sound|audio|videos|video)\//i.test(filename)) {
              const mediaSubPath = filename.startsWith('media/') ? filename.slice('media/'.length) : filename;
              const parts = mediaSubPath.split('/');
              const rawKind = parts[0].toLowerCase();
              const kind = rawKind === 'images' ? 'pics' : ((rawKind === 'sound' || rawKind === 'audio' || rawKind === 'sounds') ? 'sounds' : ((rawKind === 'video' || rawKind === 'videos') ? 'videos' : rawKind));
              const mediaName = parts.slice(1).join('/');
              let binary = '';
              const chunkSize = 8192;
              for (let i = 0; i < entryDataBytes.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, entryDataBytes.subarray(i, i + chunkSize));
              }
              const base64 = btoa(binary);
              const mime = conGuessMimeByName(mediaName, kind) || (kind === 'pics' ? 'image/webp' : (kind === 'sounds' ? 'audio/wav' : (kind === 'videos' ? 'video/webm' : 'application/octet-stream')));
              const mediaEntry = {
                name: mediaName,
                kind: kind,
                mime: mime,
                subPath: mediaSubPath,
                base64: base64,
                size: entryDataBytes.length
              };
              media[mediaSubPath] = mediaEntry;
              media['media/' + mediaSubPath] = mediaEntry;
              media[kind + '/' + mediaName] = mediaEntry;
              media[mediaName] = mediaEntry;
              media[mediaName.toLowerCase()] = mediaEntry;
            }
          }

          offset = dataEnd;
        } else {
          offset += 1;
        }
      }

      if (manifest && boardData) {
        if (!boardData._createdAt && (manifest.createdAt || manifest._createdAt)) {
          boardData._createdAt = Number(manifest.createdAt || manifest._createdAt) || undefined;
        }
        if (!boardData._savedAt && (manifest.updatedAt || manifest.savedAt || manifest._savedAt)) {
          boardData._savedAt = Number(manifest.updatedAt || manifest.savedAt || manifest._savedAt) || undefined;
        }
        if (!boardData.dateCreated && manifest.dateCreated) {
          boardData.dateCreated = manifest.dateCreated;
        }
      }

      return { ok: true, manifest, boardData, history, media, thumbnails };
    }

    async function conBuildSessionFolderBundle(sessionFilename, persistedData, options = {}) {
      const normalizedFilename = sessionFilename.endsWith('.js') ? sessionFilename : boardStripJsonExt(sessionFilename) + '.js';
      const folderName = boardStripJsonExt(normalizedFilename);
      const attachmentBundle = await conPrepareAttachmentBundle(folderName);

      const attachmentById = {};
      (attachmentBundle.metadata || []).forEach(meta => {
        if (!meta || !meta.id) return;
        attachmentById[String(meta.id)] = meta;
      });

      function conNormalizeMediaPathRefsInSession(dataObj) {
        if (!dataObj || typeof dataObj !== 'object') return dataObj;
        function patchPage(pageObj) {
          if (!pageObj || typeof pageObj !== 'object') return;
          const mediaList = Array.isArray(pageObj.media) ? pageObj.media : [];
          mediaList.forEach(m => {
            const linked = m && m.attachmentId ? attachmentById[String(m.attachmentId)] : null;
            if (!linked) return;
            m.name = linked.name || m.name;
            m.mime = linked.mime || m.mime;
            m.relativePath = linked.relativePath || m.relativePath;
          });
          if (pageObj.backgroundPdf && pageObj.backgroundPdf.attachmentId) {
            const linkedPdf = attachmentById[String(pageObj.backgroundPdf.attachmentId)];
            if (linkedPdf) {
              pageObj.backgroundPdf.name = linkedPdf.name || pageObj.backgroundPdf.name;
              pageObj.backgroundPdf.mime = linkedPdf.mime || pageObj.backgroundPdf.mime;
              pageObj.backgroundPdf.relativePath = linkedPdf.relativePath || pageObj.backgroundPdf.relativePath;
            }
          }
        }

        if (Array.isArray(dataObj.pages)) {
          dataObj.pages.forEach(patchPage);
        } else {
          patchPage(dataObj);
        }
        return dataObj;
      }

      const dataToSave = Object.assign({}, persistedData, {
        attachments: attachmentBundle.metadata
      });
      conNormalizeMediaPathRefsInSession(dataToSave);
      const pages = (Array.isArray(dataToSave.pages) && dataToSave.pages.length > 0)
        ? dataToSave.pages
        : [dataToSave];

      // Rebuild visual snapshots: all pages on manual save, fast cache on autosave
      await conRebuildPageVisualSnapshots(pages, options);

      const snapshotFiles = [];
      for (let i = 0; i < pages.length; i += 1) {
        let snapDataUrl = (_conPageSnapshotPngs && _conPageSnapshotPngs[i]) || '';
        if (!snapDataUrl && typeof conBuildPageThumbnailDataUrl === 'function') {
          try {
            snapDataUrl = conBuildPageThumbnailDataUrl(pages[i], 480, 320);
            if (snapDataUrl) {
              if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
              _conPageSnapshotPngs[i] = snapDataUrl;
            }
          } catch (_) {}
        }
        if (snapDataUrl) {
          let ext = 'webp';
          let base64Data = '';
          const commaIdx = snapDataUrl.indexOf(',');
          if (commaIdx >= 0) {
            const header = snapDataUrl.slice(0, commaIdx);
            if (header.includes('image/png')) ext = 'png';
            else if (header.includes('image/jpeg') || header.includes('image/jpg')) ext = 'jpg';
            else ext = 'webp';
            base64Data = snapDataUrl.slice(commaIdx + 1);
          } else {
            base64Data = snapDataUrl;
          }
          const padded = String(i + 1).padStart(3, '0');
          snapshotFiles.push({
            filename: 'page-' + padded + '.' + ext,
            subdir: folderName + '/page-snapshots',
            content: base64Data,
            encoding: 'base64'
          });
        }
      }

      const jsContent = boardBuildSessionFileContent(dataToSave, 'CONSTELLATION_SESSION_EXPORT');
      const files = [{
        filename: normalizedFilename,
        subdir: folderName,
        content: jsContent,
        encoding: 'utf8'
      }].concat(attachmentBundle.files, snapshotFiles);

      return {
        filename: normalizedFilename,
        folderName,
        data: dataToSave,
        files,
        attachments: attachmentBundle.metadata
      };
    }

    // ── Canvas / export helpers (restored from git) ───────────────────

    function conCanvasFontFromStyles(styles, fallbackFamily) {
      const fontStyle = styles.fontStyle || 'normal';
      const fontWeight = styles.fontWeight || '400';
      const fontSize = styles.fontSize || '16px';
      const fontFamily = styles.fontFamily || fallbackFamily || '"Segoe UI", Arial, sans-serif';
      return `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
    }

    function conGetPrimaryTextNode(el) {
      return [...el.childNodes].find(child => {
        if (child.nodeType === Node.TEXT_NODE) return !!child.textContent.trim();
        return !(child.classList && child.classList.contains('con-node-ann'));
      }) || null;
    }

    function conGetNodeWordText(node, el) {
      const baseWord = node.baseWord || (el && el.dataset ? el.dataset.baseWord : '');
      const fmt = node && node.fmt ? node.fmt : {};
      const casing = fmt.casing || window._bcNodeDefaultCasing || 'none';
      if (baseWord) return boardTransformCasingText(baseWord.trim(), casing);
      let wordText = '';
      if (el && el.childNodes) {
        el.childNodes.forEach(child => { if (child.nodeType === Node.TEXT_NODE) wordText += child.textContent; });
      }
      if (!wordText.trim() && el) { const primary = conGetPrimaryTextNode(el); wordText = primary ? primary.textContent : el.textContent; }
      return boardTransformCasingText(wordText.trim(), casing);
    }

    function conGetRelativeTextCenterY(el, target, fallbackHeight) {
      if (!target) return fallbackHeight / 2;
      if (target.nodeType === Node.ELEMENT_NODE) {
        const nodeRect = el.getBoundingClientRect(); const targetRect = target.getBoundingClientRect();
        return (targetRect.top - nodeRect.top) + (targetRect.height / 2);
      }
      const range = document.createRange(); range.selectNodeContents(target);
      const rect = range.getBoundingClientRect();
      if (!rect.height) return fallbackHeight / 2;
      const nodeRect = el.getBoundingClientRect();
      return (rect.top - nodeRect.top) + (rect.height / 2);
    }

    function conDrawNodeLabelToCanvas(ctx, node, pad, color) {
      const el = node.el; const nx = node.x; const ny = node.y; const nw = el.offsetWidth; const nh = el.offsetHeight;
      const primaryTextNode = conGetPrimaryTextNode(el);
      const wordStyles = primaryTextNode && primaryTextNode.nodeType === Node.ELEMENT_NODE ? getComputedStyle(primaryTextNode) : getComputedStyle(el);
      const fmt = node.fmt || {};
      const fontWeight = fmt.bold ? 'bold' : (wordStyles.fontWeight || '400');
      const fontStyle = fmt.italic ? 'italic' : (wordStyles.fontStyle || 'normal');
      const fontSize = wordStyles.fontSize || '14px';
      const fontFamily = wordStyles.fontFamily || '"Segoe UI", Arial, sans-serif';
      const wordText = conGetNodeWordText(node, el);
      const wordCenterY = pad + ny + conGetRelativeTextCenterY(el, primaryTextNode, nh);

      const rel = String(node.relation || '').toLowerCase();
      const hasRelBadge = rel === 'translation' || rel === 'ipa';
      const relLabel = rel === 'translation' ? 'FR' : (rel === 'ipa' ? 'IPA' : '');
      const relBg = rel === 'translation' ? '#e53935' : '#8e24aa';

      const hasPageBadge = node.pageNum != null;
      const pageText = hasPageBadge ? `(${node.pageNum})` : '';

      ctx.fillStyle = wordStyles.color || color;
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 1;

      const hasMaxWidth = !!(fmt && typeof fmt.maxWidth === 'number' && fmt.maxWidth > 0 && node.shape !== 'circle' && node.shape !== 'square');

      if (wordText) {
        let wordLines = (wordText.includes('//') || wordText.includes('\n') || /<br\s*\/?>/i.test(wordText))
          ? wordText.split(/\/\/|\r?\n|<br\s*\/?>/i).map(s => s.trim())
          : null;
        if (!wordLines && hasMaxWidth && typeof canvasWrapText === 'function') {
          const wrapped = canvasWrapText(ctx, wordText, fmt.maxWidth - 18);
          if (wrapped && wrapped.length > 1) {
            wordLines = wrapped;
          }
        }
        const fsPx = parseFloat(fontSize) || 14; const lineH = fsPx * 1.25;
        const renderLines = wordLines || [wordText];
        const lineStartY = wordLines ? wordCenterY - ((renderLines.length - 1) * lineH) / 2 : wordCenterY;

        renderLines.forEach((line, li) => {
          const lineY = lineStartY + li * lineH;
          const isLastLine = li === renderLines.length - 1;

          let badgeExtraW = 0;
          let relW = 0;
          let pageW = 0;

          if (isLastLine && (hasRelBadge || hasPageBadge)) {
            if (hasRelBadge) relW = 20;
            if (hasPageBadge) {
              ctx.save();
              ctx.font = `600 ${Math.max(9, Math.round(fsPx * 0.75))}px "Segoe UI", Arial, sans-serif`;
              pageW = ctx.measureText(pageText).width + 4;
              ctx.restore();
            }
            badgeExtraW = (hasRelBadge ? relW + 4 : 0) + (hasPageBadge ? pageW : 0);
          }

          const mainTextW = ctx.measureText(line).width;
          const totalRowW = mainTextW + badgeExtraW;
          const mainTextX = hasMaxWidth ? (pad + nx + 9) : (pad + nx + (nw - totalRowW) / 2);

          ctx.textAlign = 'left';

          if (node.textStrokeWidth > 0 && node.textStrokeColor) {
            ctx.save(); ctx.strokeStyle = node.textStrokeColor; ctx.lineWidth = node.textStrokeWidth * 2; ctx.lineJoin = 'round';
            ctx.strokeText(line, mainTextX, lineY); ctx.restore();
          }
          ctx.fillText(line, mainTextX, lineY);

          if (fmt.underline || fmt.strike) {
            ctx.save(); ctx.strokeStyle = wordStyles.color || color; ctx.lineWidth = Math.max(1, fsPx / 14); ctx.setLineDash([]);
            if (fmt.underline) { ctx.beginPath(); ctx.moveTo(mainTextX, lineY + fsPx * 0.55); ctx.lineTo(mainTextX + mainTextW, lineY + fsPx * 0.55); ctx.stroke(); }
            if (fmt.strike) { ctx.beginPath(); ctx.moveTo(mainTextX, lineY); ctx.lineTo(mainTextX + mainTextW, lineY); ctx.stroke(); }
            ctx.restore();
          }

          let curBadgeX = mainTextX + mainTextW + 4;
          if (isLastLine && hasRelBadge) {
            ctx.save();
            const bw = 18, bh = 12;
            const by = lineY - bh / 2;
            ctx.fillStyle = relBg;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') ctx.roundRect(curBadgeX, by, bw, bh, 3);
            else ctx.rect(curBadgeX, by, bw, bh);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(relLabel, curBadgeX + bw / 2, lineY);
            ctx.restore();
            curBadgeX += bw + 4;
          }

          if (isLastLine && hasPageBadge) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.font = `600 ${Math.max(9, Math.round(fsPx * 0.75))}px "Segoe UI", Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(pageText, curBadgeX, lineY);
            ctx.restore();
          }
        });
      }

      const isStarred = node.starred || (node.dbWord && node.dbWord.starred) || (el && el.querySelector('.con-node-star-btn.active'));
      if (isStarred) {
        ctx.save();
        ctx.font = '12px "Segoe UI Emoji", "Segoe UI Symbol", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('⭐', pad + nx + nw - 4, pad + ny + 3);
        ctx.restore();
      }

      const anns = el.querySelectorAll('.con-node-ann');
      anns.forEach(ann => {
        const text = ann.textContent.trim(); if (!text) return;
        const annStyles = getComputedStyle(ann); const annOpacity = parseFloat(annStyles.opacity);
        const annRect = ann.getBoundingClientRect(); const nodeRect = el.getBoundingClientRect();
        ctx.font = conCanvasFontFromStyles(annStyles, '"Segoe UI", Arial, sans-serif');
        ctx.fillStyle = annStyles.color || color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = Number.isFinite(annOpacity) ? annOpacity : 1;
        ctx.fillText(text, pad + nx + nw / 2, pad + ny + (annRect.top - nodeRect.top) + (annRect.height / 2));
      });
      ctx.globalAlpha = 1;
    }

    function conDrawTablesToCanvas(ctx, PAD) {
      const tables = window.conGetTables ? window.conGetTables() : [];
      tables.forEach(tbl => {
        if (!tbl) return;
        const totalW = tbl.colWidths ? tbl.colWidths.reduce((s, w) => s + w, 0) : 200;
        const totalH = tbl.rowHeights ? tbl.rowHeights.reduce((s, h) => s + h, 0) : 100;
        const barH = 24;
        const tx = PAD + (tbl.x || 0);
        const ty = PAD + (tbl.y || 0);

        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(tx, ty, totalW, barH);
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, ty, totalW, barH);

        ctx.fillStyle = '#666666';
        ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('⠿  Table', tx + 8, ty + barH / 2);

        const gridY = ty + barH;
        ctx.fillStyle = tbl.defaultBg || '#ffffff';
        ctx.fillRect(tx, gridY, totalW, totalH);
        ctx.strokeStyle = '#bbbbbb';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, gridY, totalW, totalH);

        let curY = gridY;
        for (let r = 0; r < tbl.rows; r++) {
          const rh = tbl.rowHeights[r] || 36;
          let curX = tx;
          for (let c = 0; c < tbl.cols; c++) {
            const cw = tbl.colWidths[c] || 80;
            const cell = tbl.cells ? tbl.cells[r * tbl.cols + c] : null;

            const cellBg = (cell && cell.bg) || (r === 0 && tbl.hasHeader ? '#f7f7f7' : (tbl.defaultBg || '#ffffff'));
            ctx.fillStyle = cellBg;
            ctx.fillRect(curX, curY, cw, rh);

            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.strokeRect(curX, curY, cw, rh);

            if (cell) {
              ctx.save();
              ctx.beginPath();
              ctx.rect(curX + 2, curY + 2, Math.max(1, cw - 4), Math.max(1, rh - 4));
              ctx.clip();

              if (cell.type === 'node' && cell.nodeData) {
                const nd = cell.nodeData;
                const nodeBg = nd.bg || '#ffffff';
                const nodeColor = nd.color || '#111111';
                const nodeBorder = nd.border || '#111111';
                const nodeText = nd.baseWord || '';

                ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
                const tw = Math.min(cw - 8, ctx.measureText(nodeText).width + 12);
                const th = 22;
                const nx = curX + (cw - tw) / 2;
                const ny = curY + (rh - th) / 2;

                ctx.fillStyle = nodeBg;
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') ctx.roundRect(nx, ny, tw, th, 4);
                else ctx.rect(nx, ny, tw, th);
                ctx.fill();
                ctx.strokeStyle = nodeBorder;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = nodeColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(nodeText, nx + tw / 2, ny + th / 2);
              } else if (cell.text && cell.text.trim()) {
                const fontStyle = cell.italic ? 'italic ' : '';
                const fontWeight = (cell.bold || (tbl.hasHeader && r === 0)) ? 'bold ' : '';
                const fontSize = cell.fontSize || tbl.defaultFontSize || 14;
                ctx.font = `${fontStyle}${fontWeight}${fontSize}px "Segoe UI", Arial, sans-serif`;
                ctx.fillStyle = cell.color || tbl.defaultColor || (r === 0 && tbl.hasHeader ? '#111111' : '#333333');

                const align = cell.textAlign || 'left';
                let textX = curX + 6;
                if (align === 'center') textX = curX + cw / 2;
                else if (align === 'right') textX = curX + cw - 6;

                ctx.textAlign = align;
                ctx.textBaseline = 'middle';
                ctx.fillText(cell.text.trim(), textX, curY + rh / 2);
              }
              ctx.restore();
            }

            curX += cw;
          }
          curY += rh;
        }
      });
    }

    function canvasWrapText(ctx, text, maxWidth) {
      const result = [];
      for (const paragraph of text.split('\n')) {
        const words = paragraph.split(' '); let line = '';
        for (const word of words) {
          const test = line ? line + ' ' + word : word;
          if (ctx.measureText(test).width > maxWidth && line) { result.push(line); line = word; } else { line = test; }
        }
        result.push(line);
      }
      return result;
    }

    function _conCanvasRichNote(ctx, note, x, y, w, h) {
      if (note.classList.contains('wn-note-hidden')) return;
      const editor = note.querySelector('.wn-note-editor, textarea');
      if (!editor) return;
      const noteCS = getComputedStyle(note);
      const baseFontPx = parseFloat(note.style.fontSize) || parseFloat(noteCS.fontSize) || 14;
      const baseColor = note.style.color || noteCS.color || '#111111';
      const baseFontFamily = note.style.fontFamily || noteCS.fontFamily || window._bcNoteFontFamily || '"Segoe UI", Arial, sans-serif';
      const rawLH = parseFloat(note.style.lineHeight || noteCS.lineHeight);
      const lineh = (Number.isFinite(rawLH) && rawLH >= baseFontPx * 0.8) ? rawLH : baseFontPx * 1.4;
      const padLeft = 8, padRight = 12, padTop = 6, padBottom = 10;
      const contentW = Math.max(30, w - padLeft - padRight);
      if (editor.tagName === 'TEXTAREA') {
        const txt = (editor.value || '').trim(); if (!txt) return;
        ctx.fillStyle = baseColor; ctx.font = `normal 400 ${baseFontPx}px ${baseFontFamily}`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        canvasWrapText(ctx, txt, contentW).forEach((line, i) => { ctx.fillText(line, x + padLeft, y + padTop + i * lineh); });
        return;
      }
      const segs = [];
      const noteIsBold = note.style.fontWeight === '700' || note.style.fontWeight === 'bold';
      const noteIsItalic = note.style.fontStyle === 'italic';
      const noteTD = note.style.textDecoration || '';
      function _walkNote(node, st) {
        if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) segs.push({ ...st, text: node.textContent }); return; }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const tag = node.tagName.toLowerCase();
        if (tag === 'br') { segs.push({ br: true }); return; }
        if (node.classList && node.classList.contains('con-emoji-dot')) return;
        const cs = getComputedStyle(node); const ns = { ...st };
        const fw = parseInt(cs.fontWeight) || 0;
        if (fw >= 600 || cs.fontWeight === 'bold') ns.bold = true;
        if (cs.fontStyle === 'italic' || cs.fontStyle === 'oblique') ns.italic = true;
        const td = node.style.textDecoration || cs.textDecoration || '';
        if (td.includes('underline')) ns.underline = true;
        if (td.includes('line-through')) ns.strike = true;
        const ibg = node.style.backgroundColor;
        if (ibg && ibg !== 'transparent' && ibg !== '' && !/^rgba\(0,\s*0,\s*0,\s*0\)$/.test(ibg)) ns.bgColor = ibg;
        const ic = node.style.color; if (ic && ic !== '' && ic !== 'inherit') ns.color = ic;
        const fsPx = parseFloat(cs.fontSize); if (Number.isFinite(fsPx) && fsPx > 0) ns.fontSize = fsPx;
        const ff = cs.fontFamily; if (ff && ff !== 'inherit') ns.fontFamily = ff;
        if (tag === 'ul' || tag === 'ol') ns.indentDepth = (st.indentDepth || 0) + 1;
        if (tag === 'li') {
          if (segs.length > 0 && !segs[segs.length - 1].br) segs.push({ br: true });
          const listEl = node.closest('ol, ul'); const isOrdered = listEl && listEl.tagName.toLowerCase() === 'ol';
          const depth = Math.max(0, (ns.indentDepth || 1) - 1);
          let marker; if (isOrdered) { let idx = 1; let prev = node.previousElementSibling; while (prev) { if (prev.tagName.toLowerCase() === 'li') idx++; prev = prev.previousElementSibling; } marker = idx + '. '; } else { marker = (depth % 2 === 1) ? '◦ ' : '• '; }
          const indentPx = depth * 14;
          const liState = { ...ns, indentPx };
          segs.push({ ...liState, text: marker }); node.childNodes.forEach(c => _walkNote(c, liState)); return;
        }
        if ((tag === 'div' || tag === 'p') && node !== editor && segs.length > 0 && !segs[segs.length - 1].br) segs.push({ br: true });
        if ((tag === 'ul' || tag === 'ol') && segs.length > 0 && !segs[segs.length - 1].br) segs.push({ br: true });
        node.childNodes.forEach(c => _walkNote(c, ns));
      }
      _walkNote(editor, { bold: noteIsBold, italic: noteIsItalic, underline: noteTD.includes('underline'), strike: noteTD.includes('line-through'), color: baseColor, bgColor: null, fontSize: baseFontPx, fontFamily: baseFontFamily, indentDepth: 0 });
      while (segs.length && segs[segs.length - 1].br) segs.pop();
      function _segFont(s) { return `${s.italic ? 'italic' : 'normal'} ${s.bold ? 'bold' : 'normal'} ${s.fontSize || baseFontPx}px ${s.fontFamily || baseFontFamily}`; }
      const paras = [[]];
      segs.forEach(s => { if (s.br) { paras.push([]); return; } (s.text.match(/\S+|\s+/g) || []).forEach(tok => paras[paras.length - 1].push({ word: tok, seg: s })); });
      const lines = [];
      paras.forEach(para => {
        if (!para.length) { lines.push([]); return; }
        let curLine = [], curW = 0;
        const indentPx = (para[0] && para[0].seg && para[0].seg.indentPx) ? para[0].seg.indentPx : 0;
        const availW = Math.max(30, contentW - indentPx);
        para.forEach(item => {
          ctx.font = _segFont(item.seg); const tw = ctx.measureText(item.word).width; const isWs = /^\s+$/.test(item.word);
          if (!isWs && curW + tw > availW && curLine.length > 0) { lines.push(curLine); curLine = [item]; curW = tw; } else { curLine.push(item); curW += tw; }
        });
        if (curLine.length) lines.push(curLine);
      });
      const noteTextAlign = editor.style.textAlign || 'left';
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      let cy = y + padTop; const maxY = y + h - padBottom;
      lines.forEach(line => {
        if (cy > maxY) return;
        let trimLine = [...line]; while (trimLine.length && /^\s+$/.test(trimLine[trimLine.length - 1].word)) trimLine.pop();
        const lineIndent = (line.length && line[0].seg && line[0].seg.indentPx) ? line[0].seg.indentPx : 0;
        let cx = x + padLeft + lineIndent;
        if (noteTextAlign === 'center' || noteTextAlign === 'right') {
          let lineW = 0;
          trimLine.forEach(item => { ctx.font = _segFont(item.seg); lineW += ctx.measureText(item.word).width; });
          if (noteTextAlign === 'center') cx = x + padLeft + lineIndent + Math.max(0, (contentW - lineIndent - lineW) / 2);
          else cx = x + w - padRight - lineW;
        }
        trimLine.forEach(item => {
          ctx.font = _segFont(item.seg); const tw = ctx.measureText(item.word).width; const fsPx = item.seg.fontSize || baseFontPx;
          const textTop = cy + Math.max(0, (lineh - fsPx) / 2);
          if (item.seg.bgColor) { ctx.fillStyle = item.seg.bgColor; ctx.fillRect(cx, cy, tw, lineh); }
          ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = item.seg.color || baseColor; ctx.fillText(item.word, cx, textTop);
          if (item.seg.underline) { ctx.save(); ctx.strokeStyle = item.seg.color || baseColor; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(cx, textTop + fsPx + 1); ctx.lineTo(cx + tw, textTop + fsPx + 1); ctx.stroke(); ctx.restore(); }
          if (item.seg.strike) { ctx.save(); ctx.strokeStyle = item.seg.color || baseColor; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(cx, textTop + fsPx * 0.55); ctx.lineTo(cx + tw, textTop + fsPx * 0.55); ctx.stroke(); ctx.restore(); }
          cx += tw;
        });
        cy += lineh;
      });
      ctx.restore();
    }

    function conNormalizeNodeShapeSafe(shape) {
      const normalized = String(shape || '').trim().toLowerCase();
      if (normalized === 'losange' || normalized === 'triangle') return 'rectangle';
      return ['oval', 'circle', 'square', 'rectangle'].includes(normalized) ? normalized : 'rectangle';
    }

    function conCanvasTraceNodePath(ctx, x, y, w, h, shape) {
      const normalized = (window.conNormalizeNodeShape ? window.conNormalizeNodeShape(shape) : conNormalizeNodeShapeSafe(shape));
      ctx.beginPath();
      if (normalized === 'circle' || normalized === 'oval') {
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      } else {
        const r = 4;
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      }
    }

    function conCanvasTraceRoundedRect(ctx, x, y, w, h, r) {
      const rr = Math.max(0, Math.min(r || 0, Math.min(w, h) / 2));
      ctx.beginPath();
      ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath();
    }

    function conDrawMediaWidgetsToCanvas(ctx, PAD, allowedKinds) {
      const board = document.getElementById('constellation-board');
      if (!board) return;
      const widgets = Array.from(board.querySelectorAll('.con-media-item'));
      widgets.forEach(wrap => {
        const kind = wrap.classList.contains('con-media-kind-pdf') ? 'pdf' : wrap.classList.contains('con-media-kind-pics') ? 'pics' : (wrap.classList.contains('con-media-kind-videos') || wrap.classList.contains('con-media-kind-video')) ? 'videos' : (wrap.classList.contains('con-media-kind-sounds') || wrap.classList.contains('con-media-kind-sound') || wrap.classList.contains('con-media-kind-audio')) ? 'sounds' : '';
        if (allowedKinds && Array.isArray(allowedKinds) && !allowedKinds.includes(kind)) return;
        const x = PAD + wrap.offsetLeft; const y = PAD + wrap.offsetTop;
        const w = Math.max(1, wrap.offsetWidth); const h = Math.max(1, wrap.offsetHeight);
        if (w < 2 || h < 2) return;
        const wrapStyles = getComputedStyle(wrap);
        const wrapOpacity = parseFloat(wrapStyles.opacity);
        const widgetOp = Number.isFinite(wrapOpacity) ? wrapOpacity : 1;
        ctx.save();
        ctx.globalAlpha = widgetOp;
        const radius = parseFloat(wrapStyles.borderTopLeftRadius) || 7;
        const borderW = parseFloat(wrapStyles.borderWidth) || 1.5;
        const borderColor = wrapStyles.borderColor || '#444';
        const bgColor = wrapStyles.backgroundColor || '#ffffff';
        ctx.save(); conCanvasTraceRoundedRect(ctx, x, y, w, h, radius); ctx.fillStyle = bgColor; ctx.fill(); ctx.strokeStyle = borderColor; ctx.lineWidth = borderW; ctx.stroke(); ctx.restore();
        const header = wrap.querySelector('.con-media-header');
        const headerH = header ? Math.max(0, header.offsetHeight) : 0;
        if (headerH > 0) {
          const hs = header ? getComputedStyle(header) : null;
          const headerBg = hs ? (hs.backgroundColor || '#f2f2f2') : '#f2f2f2';
          const headerFg = hs ? (hs.color || '#222') : '#222';
          const headerFontSize = hs ? (parseFloat(hs.fontSize) || 11) : 11;
          const headerWeight = hs ? (hs.fontWeight || '700') : '700';
          ctx.save(); conCanvasTraceRoundedRect(ctx, x, y, w, Math.min(headerH, h), radius); ctx.clip(); ctx.fillStyle = headerBg; ctx.fillRect(x, y, w, Math.min(headerH, h)); ctx.restore();
          if (header) {
            const rawTitle = String(header.textContent || '').replace(/\s*✕\s*/g, ' ').trim();
            if (rawTitle) {
              ctx.save(); ctx.rect(x + 6, y, Math.max(1, w - 30), Math.min(headerH, h)); ctx.clip();
              ctx.fillStyle = headerFg; ctx.font = `${headerWeight} ${Math.max(9, headerFontSize)}px "Segoe UI", Arial, sans-serif`;
              ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(rawTitle, x + 6, y + Math.min(headerH, h) / 2); ctx.restore();
            }
          }
        }
        const content = wrap.querySelector('.con-media-content'); if (!content) { ctx.restore(); return; }
        const contentX = x + content.offsetLeft; const contentY = y + content.offsetTop;
        const contentW = Math.max(1, content.offsetWidth); const contentH = Math.max(1, content.offsetHeight);
        const contentStyles = getComputedStyle(content);
        ctx.save(); ctx.fillStyle = contentStyles.backgroundColor || '#fafafa'; ctx.fillRect(contentX, contentY, contentW, contentH);
        ctx.beginPath(); ctx.rect(contentX, contentY, contentW, contentH); ctx.clip();
        const drawSource = src => {
          try {
            if (!src) return false;
            if (src.tagName === 'IMG' && (!src.complete || !src.naturalWidth || !src.naturalHeight)) return false;
            if (src.tagName === 'VIDEO' && (!src.videoWidth || !src.videoHeight)) return false;
            if (src.tagName === 'CANVAS' && (!src.width || !src.height)) return false;
            const sw = src.tagName === 'IMG' ? src.naturalWidth : (src.tagName === 'VIDEO' ? src.videoWidth : src.width);
            const sh = src.tagName === 'IMG' ? src.naturalHeight : (src.tagName === 'VIDEO' ? src.videoHeight : src.height);
            if (!sw || !sh) return false;
            const srcRect = src.getBoundingClientRect(); const contentRect = content.getBoundingClientRect();
            const relX = srcRect.left - contentRect.left; const relY = srcRect.top - contentRect.top;
            const dw = srcRect.width; const dh = srcRect.height; if (!dw || !dh) return false;
            ctx.drawImage(src, contentX + relX, contentY + relY, dw, dh); return true;
          } catch { return false; }
        };
        let drawn = false;
        if (kind === 'pdf') {
          const pdfCanvases = wrap.querySelectorAll('canvas');
          if (pdfCanvases && pdfCanvases.length > 0) {
            pdfCanvases.forEach(c => {
              if (drawSource(c)) drawn = true;
            });
          }
          if (!drawn) {
            drawn = drawSource(wrap.querySelector('.con-media-asset')) || drawSource(wrap.querySelector('img'));
          }
        } else {
          drawn = drawSource(wrap.querySelector('.con-media-asset')) || drawSource(wrap.querySelector('canvas')) || drawSource(wrap.querySelector('img'));
        }

        if (!drawn) {
          if (kind === 'pdf') {
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(contentX, contentY, contentW, contentH);
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.strokeRect(contentX, contentY, contentW, contentH);

            // Draw red PDF badge
            ctx.fillStyle = '#e53935';
            ctx.fillRect(contentX + 6, contentY + 6, 32, 16);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('PDF', contentX + 22, contentY + 14);

            // Draw PDF document title
            ctx.fillStyle = '#424242';
            ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const pdfTitle = (header && header.textContent.trim()) ? header.textContent.trim().replace(/\s*✕\s*/g, '') : 'PDF Document';
            ctx.fillText(pdfTitle.length > 25 ? pdfTitle.substring(0, 22) + '...' : pdfTitle, contentX + contentW / 2, contentY + contentH / 2 + 6);
            drawn = true;
          } else if (kind === 'sounds') {
            ctx.fillStyle = '#4b5563';
            ctx.font = '700 16px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('AUDIO', contentX + contentW / 2, contentY + contentH / 2);
          } else if (kind === 'pics' || kind === 'videos') {
            ctx.fillStyle = '#e8f0fe';
            ctx.fillRect(contentX, contentY, contentW, contentH);
            ctx.fillStyle = '#1a73e8';
            ctx.font = '700 14px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(kind === 'pics' ? 'IMAGE' : 'VIDEO', contentX + contentW / 2, contentY + contentH / 2);
          }
        }
        ctx.restore();
        ctx.restore();
      });
    }

    function _conDrawCanvasTerminator(ctx, term, x, y, angle, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = color || '#333333';
      ctx.strokeStyle = color || '#333333';
      ctx.lineWidth = 1.8;
      if (term === 'circle' || term === 'dot') {
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (term === 'diamond' || term === 'square') {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-5, -4);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-5, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (term === 'open') {
        ctx.beginPath();
        ctx.moveTo(-7, -4);
        ctx.lineTo(0, 0);
        ctx.lineTo(-7, 4);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-9, -4.5);
        ctx.lineTo(-9, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    async function _conBuildBoardCanvas(opts = {}) {
      const board = document.getElementById('constellation-board');
      if (!board) return null;

      // Pre-wait for any board images and web fonts to finish loading
      if (document.fonts && typeof document.fonts.ready !== 'undefined') {
        try { await document.fonts.ready; } catch (_) { }
      }
      const allImgs = Array.from(board.querySelectorAll('img'));
      await Promise.all(allImgs.map(img => {
        if (img.complete || !img.src) return Promise.resolve();
        return new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 600); });
      }));
      if (typeof conAwaitAllPdfRendersOnBoard === 'function') {
        try { await conAwaitAllPdfRendersOnBoard(); } catch (_) { }
      }

      const nodes = window.conGetNodes ? window.conGetNodes() : [];

      let maxX = 0;
      let maxY = 0;

      nodes.forEach(n => {
        if (n && n.el) {
          const bb = (typeof conGetNodeBoundingBox === 'function')
            ? conGetNodeBoundingBox(n)
            : { x: n.x || 0, y: n.y || 0, w: n.el.offsetWidth || 100, h: n.el.offsetHeight || 40 };
          const rx = bb.x + bb.w;
          const ry = bb.y + bb.h;
          if (rx > maxX) maxX = rx;
          if (ry > maxY) maxY = ry;
        }
      });

      document.querySelectorAll('#constellation-board .con-word-note').forEach(note => {
        const rx = note.offsetLeft + note.offsetWidth;
        const ry = note.offsetTop + note.offsetHeight;
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      document.querySelectorAll('.con-group').forEach(grp => {
        const rx = grp.offsetLeft + grp.offsetWidth;
        const ry = grp.offsetTop + grp.offsetHeight;
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      document.querySelectorAll('#constellation-board .con-media-item, #constellation-board .con-media-wrap, #constellation-board img').forEach(wrap => {
        const rx = wrap.offsetLeft + wrap.offsetWidth;
        const ry = wrap.offsetTop + wrap.offsetHeight;
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      (window.conGetMediaItems ? window.conGetMediaItems() : []).forEach(m => {
        if (!m) return;
        const rx = (m.x || 0) + (m.w || m.width || m.offsetWidth || 200);
        const ry = (m.y || 0) + (m.h || m.height || m.offsetHeight || 200);
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      (window.conGetTables ? window.conGetTables() : []).forEach(tbl => {
        if (!tbl) return;
        const tw = tbl.colWidths ? tbl.colWidths.reduce((s, w) => s + w, 0) : 200;
        const th = (tbl.rowHeights ? tbl.rowHeights.reduce((s, h) => s + h, 0) : 100) + 24;
        const rx = (tbl.x || 0) + tw;
        const ry = (tbl.y || 0) + th;
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      (window.conGetShapes ? window.conGetShapes() : []).forEach(s => {
        const rx = (s.x || 0) + (s.w || s.width || 100);
        const ry = (s.y || 0) + (s.h || s.height || 100);
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      (window.conGetDrawings ? window.conGetDrawings() : []).forEach(d => {
        if (Array.isArray(d.points)) {
          d.points.forEach(p => {
            const px = (d.x || 0) + p.x;
            const py = (d.y || 0) + p.y;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
          });
        }
      });

      (window.conGetMasks ? window.conGetMasks() : []).forEach(mask => {
        if (mask && mask.el) {
          const rx = mask.el.offsetLeft + mask.el.offsetWidth;
          const ry = mask.el.offsetTop + mask.el.offsetHeight;
          if (rx > maxX) maxX = rx;
          if (ry > maxY) maxY = ry;
        }
      });

      if (typeof conPageBackgroundPdf !== 'undefined' && conPageBackgroundPdf) {
        const pw = conPageBackgroundPdf.width || 800;
        const ph = conPageBackgroundPdf.height || 1000;
        if (pw > maxX) maxX = pw;
        if (ph > maxY) maxY = ph;
      }

      let bw, bh, PAD;
      const hasLayoutDims = window._bcBoardLayoutConfig && window._bcBoardLayoutConfig.dims;
      if (hasLayoutDims) {
        const targetW = window._bcBoardLayoutConfig.dims.w;
        const targetH = window._bcBoardLayoutConfig.dims.h;
        if (maxX <= targetW && maxY <= targetH) {
          bw = targetW;
          bh = targetH;
          PAD = 0;
        } else {
          const scaleFactor = Math.max(maxX / targetW, maxY / targetH);
          bw = Math.round(targetW * scaleFactor);
          bh = Math.round(targetH * scaleFactor);
          PAD = 0;
        }
      } else {
        bw = (maxX > 0) ? Math.max(600, maxX + 40) : Math.max(600, board.clientWidth || 800);
        bh = (maxY > 0) ? Math.max(400, maxY + 40) : Math.max(400, board.clientHeight || 600);
        PAD = 24;
      }

      const defaultScale = Math.max(window.devicePixelRatio || 1, 2);
      const scale = (opts && typeof opts.scale === 'number' && opts.scale > 0) ? opts.scale : defaultScale;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round((bw + PAD * 2) * scale);
      canvas.height = Math.round((bh + PAD * 2) * scale);
      const ctx = canvas.getContext('2d'); ctx.scale(scale, scale);

      const computedBg = board ? getComputedStyle(board).backgroundColor : '';
      const activeBg = _conBoardBgColor || (computedBg && computedBg !== 'transparent' && !/^rgba\(0,\s*0,\s*0,\s*0\)$/.test(computedBg) ? computedBg : '#ffffff');
      ctx.fillStyle = activeBg;
      ctx.fillRect(0, 0, bw + PAD * 2, bh + PAD * 2);

      if (_conBoardBg && _conBoardBg._cachedDataUrl) {
        await new Promise(resolve => { const img = new Image(); img.onload = () => { ctx.drawImage(img, PAD, PAD, _conBoardBg._cachedW, _conBoardBg._cachedH); resolve(); }; img.onerror = resolve; img.src = _conBoardBg._cachedDataUrl; });
      }
      if (PAD > 0) {
        ctx.strokeStyle = '#111111'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, bw + PAD * 2 - 2, bh + PAD * 2 - 2);
      }

      // Render background media widgets (Images, PDFs) first so they act as background elements underneath groups
      conDrawMediaWidgetsToCanvas(ctx, PAD, ['pics', 'pdf']);

      // 1. Render groups first so they serve as background containers underneath video/audio, lines, nodes, and notes
      document.querySelectorAll('.con-group').forEach(grp => {
        const rx = grp.offsetLeft; const ry = grp.offsetTop; const rw = grp.offsetWidth; const rh = grp.offsetHeight;
        const grpCS = getComputedStyle(grp);
        const grpBS = grp.style.borderStyle || grpCS.borderStyle || 'solid';
        const grpBW = parseFloat(grp.style.borderWidth || grpCS.borderWidth) || 2;
        ctx.fillStyle = grp.style.background || grpCS.backgroundColor || '#f3f4f6'; const r = 8;
        ctx.beginPath(); ctx.moveTo(PAD + rx + r, PAD + ry); ctx.lineTo(PAD + rx + rw - r, PAD + ry); ctx.quadraticCurveTo(PAD + rx + rw, PAD + ry, PAD + rx + rw, PAD + ry + r); ctx.lineTo(PAD + rx + rw, PAD + ry + rh - r); ctx.quadraticCurveTo(PAD + rx + rw, PAD + ry + rh, PAD + rx + rw - r, PAD + ry + rh); ctx.lineTo(PAD + rx + r, PAD + ry + rh); ctx.quadraticCurveTo(PAD + rx, PAD + ry + rh, PAD + rx, PAD + ry + rh - r); ctx.lineTo(PAD + rx, PAD + ry + r); ctx.quadraticCurveTo(PAD + rx, PAD + ry, PAD + rx + r, PAD + ry); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = grp.style.borderColor || grpCS.borderColor || '#aaa'; ctx.lineWidth = grpBW;
        if (grpBS === 'dashed') ctx.setLineDash([grpBW * 4, grpBW * 2]); else if (grpBS === 'dotted') ctx.setLineDash([grpBW, grpBW * 2]); else ctx.setLineDash([]);
        ctx.stroke(); ctx.setLineDash([]);
        const titleEl = grp.querySelector('.con-group-title');
        if (titleEl && titleEl.textContent.trim() && titleEl.style.display !== 'none') {
          const tx = rx + titleEl.offsetLeft; const ty = ry + titleEl.offsetTop; const tw = titleEl.offsetWidth; const th = titleEl.offsetHeight;
          const borderColor = titleEl.style.borderColor || grp.style.borderColor || '#aaa';
          const textColor = titleEl.style.color || grp.style.borderColor || '#333';
          const bgColor = grp.style.background || grpCS.backgroundColor || '#f3f4f6'; const tr = 4;
          ctx.fillStyle = bgColor;
          ctx.beginPath(); ctx.moveTo(PAD + tx + tr, PAD + ty); ctx.lineTo(PAD + tx + tw - tr, PAD + ty); ctx.quadraticCurveTo(PAD + tx + tw, PAD + ty, PAD + tx + tw, PAD + ty + tr); ctx.lineTo(PAD + tx + tw, PAD + ty + th - tr); ctx.quadraticCurveTo(PAD + tx + tw, PAD + ty + th, PAD + tx + tw - tr, PAD + ty + th); ctx.lineTo(PAD + tx + tr, PAD + ty + th); ctx.quadraticCurveTo(PAD + tx, PAD + ty + th, PAD + tx, PAD + ty + th - tr); ctx.lineTo(PAD + tx, PAD + ty + tr); ctx.quadraticCurveTo(PAD + tx, PAD + ty, PAD + tx + tr, PAD + ty); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = borderColor; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = textColor;
          const _titleFontPx = parseFloat(titleEl.style.fontSize) || parseFloat(getComputedStyle(titleEl).fontSize) || 11;
          ctx.font = `bold ${_titleFontPx}px "Segoe UI", Arial, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.save(); ctx.rect(PAD + tx + 2, PAD + ty, tw - 4, th); ctx.clip(); ctx.fillText(titleEl.textContent.trim(), PAD + tx + 7, PAD + ty + th / 2); ctx.restore();
        }
      });

      // Render foreground media widgets (Videos, Sounds) above groups (matching DOM z-index)
      conDrawMediaWidgetsToCanvas(ctx, PAD, ['sounds', 'videos']);

      // 2. Render constellation SVG lines & edges (connecting nodes, notes, and groups)
      const svgEl = document.getElementById('constellation-svg');
      if (svgEl) {
        svgEl.querySelectorAll('.con-line-group').forEach(grp => {
          const line = grp.querySelector('.con-line'); if (!line) return;
          const pathD = line.getAttribute('d');
          const edgeId = grp.dataset.eid;
          const edge = (typeof conEdges !== 'undefined' && Array.isArray(conEdges)) ? conEdges.find(ed => ed && ed.id == edgeId) : null;
          let strokeColor = line.style.stroke || '#111111';
          if (strokeColor.startsWith('url(') && edge) {
            const strokeInfo = (typeof conResolveEdgeStroke === 'function') ? conResolveEdgeStroke(edge) : null;
            strokeColor = (strokeInfo && strokeInfo.solid) ? strokeInfo.solid : '#111111';
          }
          const sw = parseFloat(line.style.strokeWidth) || parseFloat(line.getAttribute('stroke-width')) || 2;
          const dashStyle = edge ? edge.dashStyle : null;
          const strokeType = edge ? edge.strokeType : null;

          if (pathD) {
            ctx.save();
            ctx.translate(PAD, PAD);
            const pathObj = new Path2D(pathD);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = sw;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (strokeType === 'dashed' || dashStyle === 'dashed') {
              ctx.setLineDash([sw * 3, sw * 2]);
            } else if (strokeType === 'dotted' || dashStyle === 'dotted') {
              ctx.setLineDash([sw, sw * 1.5]);
            } else {
              ctx.setLineDash([]);
            }
            ctx.stroke(pathObj);
            ctx.restore();
          }

          let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
          let hasEndpoints = false;
          if (edge && edge.a && edge.b && typeof conResolveLinkAnchor === 'function') {
            const na = conResolveLinkAnchor(edge.a);
            const nb = conResolveLinkAnchor(edge.b);
            if (na && nb) {
              let ax = na.cx, ay = na.cy, bx = nb.cx, by = nb.cy;
              if (edge.anchorA && typeof conGetAnchorPoint === 'function') {
                const ptA = conGetAnchorPoint(na, edge.anchorA);
                if (ptA) { ax = ptA.x; ay = ptA.y; }
              }
              if (edge.anchorB && typeof conGetAnchorPoint === 'function') {
                const ptB = conGetAnchorPoint(nb, edge.anchorB);
                if (ptB) { bx = ptB.x; by = ptB.y; }
              }
              x1 = ax; y1 = ay; x2 = bx; y2 = by;
              const dx = bx - ax, dy = by - ay;
              const dist = Math.hypot(dx, dy);
              if (dist > 8) {
                const nx = dx / dist, ny = dy / dist;
                const rawRA = !edge.anchorA && typeof conNodeEdgeOffset === 'function' ? conNodeEdgeOffset(na, dx, dy) : 0;
                const rawRB = !edge.anchorB && typeof conNodeEdgeOffset === 'function' ? conNodeEdgeOffset(nb, -dx, -dy) : 0;
                let rA = rawRA, rB = rawRB;
                if (rawRA + rawRB + 8 > dist) {
                  const scale = Math.max(0, (dist - 8) / ((rawRA + rawRB) || 1));
                  rA = rawRA * scale;
                  rB = rawRB * scale;
                }
                if (!edge.anchorA) { x1 = ax + nx * rA; y1 = ay + ny * rA; }
                if (!edge.anchorB) { x2 = bx - nx * rB; y2 = by - ny * rB; }
              }
              hasEndpoints = true;

              const t = edge.type || 'none';
              const term = edge.terminator || 'arrow';
              const routing = edge.routing || 'straight';
              const curv = (typeof edge.curvature === 'number' && Number.isFinite(edge.curvature)) ? edge.curvature : 30;
              let endAngle = Math.atan2(y2 - y1, x2 - x1);
              let startAngle = endAngle + Math.PI;
              if (routing === 'curved') {
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                const cx = mx + (-dy / (dist || 1)) * curv;
                const cy = my + (dx / (dist || 1)) * curv;
                endAngle = Math.atan2(y2 - cy, x2 - cx);
                startAngle = Math.atan2(y1 - cy, x1 - cx);
              } else if (routing === 'orthogonal') {
                if (Math.abs(dx) >= Math.abs(dy)) {
                  endAngle = (x2 >= x1) ? 0 : Math.PI;
                  startAngle = (x2 >= x1) ? 0 : Math.PI;
                } else {
                  endAngle = (y2 >= y1) ? Math.PI / 2 : -Math.PI / 2;
                  startAngle = (y2 >= y1) ? Math.PI / 2 : -Math.PI / 2;
                }
              }
              if (t === 'forward' || t === 'both') {
                _conDrawCanvasTerminator(ctx, term, PAD + x2, PAD + y2, endAngle, strokeColor);
              }
              if (t === 'backward' || t === 'both') {
                _conDrawCanvasTerminator(ctx, term, PAD + x1, PAD + y1, startAngle, strokeColor);
              }
            }
          }

          const labelEl = grp.querySelector('.con-line-label');
          const labelBgEl = grp.querySelector('.con-line-label-bg');
          if (labelEl && labelEl.textContent.trim()) {
            const labelText = labelEl.textContent.trim();
            const lx = parseFloat(labelEl.getAttribute('x')) || (hasEndpoints ? (x1 + x2) / 2 : 0);
            const ly = parseFloat(labelEl.getAttribute('y')) || (hasEndpoints ? (y1 + y2) / 2 : 0);
            const dyAttr = parseFloat(labelEl.getAttribute('dy') || '-5');
            const rotTransform = labelEl.getAttribute('transform');
            let rotDeg = 0;
            if (rotTransform) {
              const rm = rotTransform.match(/rotate\(([-0-9.]+)/);
              if (rm) rotDeg = parseFloat(rm[1]) || 0;
            }
            const labelStyles = getComputedStyle(labelEl);
            const fontSize = parseFloat(labelStyles.fontSize) || (edge && edge.labelSize) || 14;

            ctx.save();
            ctx.translate(PAD + lx, PAD + ly);
            if (rotDeg) ctx.rotate(rotDeg * Math.PI / 180);

            if (labelBgEl && labelBgEl.style.display !== 'none') {
              const bw = parseFloat(labelBgEl.getAttribute('width')) || Math.max(20, labelText.length * fontSize * 0.6 + 12);
              const bh = parseFloat(labelBgEl.getAttribute('height')) || Math.max(14, fontSize * 1.25);
              const bx = parseFloat(labelBgEl.getAttribute('x')) - lx || (-bw / 2);
              const by = parseFloat(labelBgEl.getAttribute('y')) - ly || (dyAttr - bh * 0.75);
              ctx.fillStyle = labelBgEl.getAttribute('fill') || '#ffffff';
              ctx.strokeStyle = labelBgEl.getAttribute('stroke') || '#111111';
              ctx.lineWidth = parseFloat(labelBgEl.getAttribute('stroke-width')) || 1.5;
              ctx.beginPath();
              const r = 4;
              ctx.moveTo(bx + r, by);
              ctx.lineTo(bx + bw - r, by);
              ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
              ctx.lineTo(bx + bw, by + bh - r);
              ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
              ctx.lineTo(bx + r, by + bh);
              ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
              ctx.lineTo(bx, by + r);
              ctx.quadraticCurveTo(bx, by, bx + r, by);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }

            ctx.font = conCanvasFontFromStyles(labelStyles, '"Segoe UI", Arial, sans-serif');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const strokeW = parseFloat(labelStyles.strokeWidth);
            if (Number.isFinite(strokeW) && strokeW > 0) {
              ctx.strokeStyle = labelStyles.stroke || 'rgba(255,255,255,0.85)';
              ctx.lineWidth = strokeW;
              ctx.lineJoin = 'round';
              ctx.strokeText(labelText, 0, dyAttr);
            }
            ctx.fillStyle = labelStyles.fill || '#333333';
            ctx.fillText(labelText, 0, dyAttr);
            ctx.restore();
          }
        });
      }

      conDrawTablesToCanvas(ctx, PAD);

      (window.conGetShapes ? window.conGetShapes() : []).forEach(s => {
        const sw = s.thickness || 2; const op = Number.isFinite(s.opacity) ? s.opacity : 1; const color = s.color || '#333333'; const fill = s.fillColor || 'none';
        ctx.save(); ctx.globalAlpha = op; ctx.strokeStyle = color; ctx.lineWidth = sw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const dashStyle = s.dashStyle || 'solid';
        if (dashStyle === 'dashed') ctx.setLineDash([sw * 4, sw * 2]); else if (dashStyle === 'dotted') ctx.setLineDash([sw * 0.5, sw * 2.5]); else ctx.setLineDash([]);
        if (s.type === 'rect') { if (fill !== 'none') { ctx.fillStyle = fill; ctx.fillRect(PAD + s.x, PAD + s.y, s.w, s.h); } ctx.strokeRect(PAD + s.x, PAD + s.y, s.w, s.h); }
        else if (s.type === 'circle' || s.type === 'ellipse') { const cx = PAD + s.x + s.w / 2, cy = PAD + s.y + s.h / 2; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.5, s.w / 2), Math.max(0.5, s.h / 2), 0, 0, Math.PI * 2); if (fill !== 'none') { ctx.fillStyle = fill; ctx.fill(); } ctx.stroke(); }
        else if (s.type === 'diamond') { const cx = PAD + s.x + s.w / 2, mid_y = PAD + s.y + s.h / 2; ctx.beginPath(); ctx.moveTo(cx, PAD + s.y); ctx.lineTo(PAD + s.x + s.w, mid_y); ctx.lineTo(cx, PAD + s.y + s.h); ctx.lineTo(PAD + s.x, mid_y); ctx.closePath(); if (fill !== 'none') { ctx.fillStyle = fill; ctx.fill(); } ctx.stroke(); }
        else if (s.type === 'line') { ctx.beginPath(); ctx.moveTo(PAD + s.lx1, PAD + s.ly1); ctx.lineTo(PAD + s.lx2, PAD + s.ly2); ctx.stroke(); }
        else if (s.type === 'arrow') { const adx = s.lx2 - s.lx1, ady = s.ly2 - s.ly1; const dist = Math.sqrt(adx * adx + ady * ady); if (dist > 1) { const angle = Math.atan2(ady, adx); const ahPx = s.arrowheadSize || Math.max(8, sw * 2.5); const aw = Math.min(ahPx, 40), ah = aw * 0.6; ctx.beginPath(); ctx.moveTo(PAD + s.lx1, PAD + s.ly1); ctx.lineTo(PAD + s.lx2 - Math.cos(angle) * sw, PAD + s.ly2 - Math.sin(angle) * sw); ctx.stroke(); ctx.setLineDash([]); ctx.save(); ctx.translate(PAD + s.lx2, PAD + s.ly2); ctx.rotate(angle); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-aw, -ah / 2); ctx.lineTo(-aw, ah / 2); ctx.closePath(); ctx.fill(); ctx.restore(); } }
        else if (s.type === 'polygon' && s.pts && s.pts.length >= 2) { ctx.beginPath(); ctx.moveTo(PAD + s.pts[0].x, PAD + s.pts[0].y); for (let i = 1; i < s.pts.length; i++) ctx.lineTo(PAD + s.pts[i].x, PAD + s.pts[i].y); ctx.closePath(); if (fill !== 'none') { ctx.fillStyle = fill; ctx.fill(); } ctx.stroke(); }
        ctx.restore();
      });
      nodes.forEach(n => {
        if (!n || !n.el) return;
        const el = n.el; const nx = n.x, ny = n.y; const nw = el.offsetWidth, nh = el.offsetHeight;
        const bg = el.style.background || '#ffffff'; const color = el.style.color || '#111111'; const border = el.style.borderColor || '#111111';
        const shape = n.shape || (el.dataset && el.dataset.shape);
        const bw2 = (n.borderWidth != null ? n.borderWidth : parseInt(el.style.borderWidth)) || 2;
        const bs = n.borderStyle || el.style.borderStyle || 'solid';
        const rot = (typeof n.rotation === 'number')
          ? ((typeof window.conNormalizeNodeRotation === 'function') ? window.conNormalizeNodeRotation(n.rotation) : (Math.round(n.rotation) % 360))
          : 0;

        ctx.save();
        if (rot && rot % 360 !== 0) {
          const cx = PAD + nx + nw / 2;
          const cy = PAD + ny + nh / 2;
          ctx.translate(cx, cy);
          ctx.rotate(rot * Math.PI / 180);
          ctx.translate(-cx, -cy);
        }

        const savedTransform = (rot && rot % 360 !== 0) ? el.style.transform : null;
        if (savedTransform !== null) {
          el.style.transform = 'none';
        }

        try {
          if (n.highlight) { ctx.save(); ctx.strokeStyle = n.highlight; ctx.lineWidth = 4; ctx.globalAlpha = 0.85; ctx.setLineDash([]); conCanvasTraceNodePath(ctx, PAD + nx - 3, PAD + ny - 3, nw + 6, nh + 6, shape); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore(); }
          ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; ctx.fillStyle = bg; conCanvasTraceNodePath(ctx, PAD + nx, PAD + ny, nw, nh, shape); ctx.fill();
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
          ctx.strokeStyle = border; ctx.lineWidth = bw2;
          if (bs === 'dashed') ctx.setLineDash([Math.max(4, bw2 * 3), Math.max(3, bw2 * 2)]); else if (bs === 'dotted') ctx.setLineDash([bw2, Math.max(2, bw2 * 2)]); else ctx.setLineDash([]);
          conCanvasTraceNodePath(ctx, PAD + nx, PAD + ny, nw, nh, shape); ctx.stroke();
          if (bs === 'double' && bw2 >= 2) { ctx.lineWidth = Math.max(1, bw2 - 2); ctx.setLineDash([]); const inset = Math.max(2, bw2); conCanvasTraceNodePath(ctx, PAD + nx + inset, PAD + ny + inset, nw - inset * 2, nh - inset * 2, shape); ctx.stroke(); }
          ctx.setLineDash([]); conDrawNodeLabelToCanvas(ctx, n, PAD, color);
          if (n.emoji) { const dotEl = el.querySelector('.con-emoji-dot'); if (dotEl) { const dr = dotEl.getBoundingClientRect(); const er = el.getBoundingClientRect(); const dx = dr.left - er.left + dr.width / 2; const dy = dr.top - er.top + dr.height / 2; const dotFontPx = parseFloat(getComputedStyle(dotEl).fontSize) || 11; ctx.font = `${dotFontPx}px "Segoe UI",Arial,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n.emoji, PAD + nx + dx, PAD + ny + dy); } }
        } finally {
          if (savedTransform !== null) {
            el.style.transform = savedTransform;
          }
          ctx.restore();
        }
      });
      document.querySelectorAll('#constellation-board .con-word-note').forEach(note => {
        const nx = note.offsetLeft; const ny = note.offsetTop; const nw = note.offsetWidth; const nh = note.offsetHeight;
        const bg = note.style.background || '#ffffff'; const border = note.style.borderColor || '#cdc9c9';
        const noteBW = parseInt(note.style.borderWidth) || 1; const noteBS = note.style.borderStyle || 'solid';
        ctx.fillStyle = bg; ctx.strokeStyle = border; ctx.lineWidth = noteBW; const r = 4;
        ctx.beginPath(); ctx.moveTo(PAD + nx + r, PAD + ny); ctx.lineTo(PAD + nx + nw - r, PAD + ny); ctx.quadraticCurveTo(PAD + nx + nw, PAD + ny, PAD + nx + nw, PAD + ny + r); ctx.lineTo(PAD + nx + nw, PAD + ny + nh - r); ctx.quadraticCurveTo(PAD + nx + nw, PAD + ny + nh, PAD + nx + nw - r, PAD + ny + nh); ctx.lineTo(PAD + nx + r, PAD + ny + nh); ctx.quadraticCurveTo(PAD + nx, PAD + ny + nh, PAD + nx, PAD + ny + nh - r); ctx.lineTo(PAD + nx, PAD + ny + r); ctx.quadraticCurveTo(PAD + nx, PAD + ny, PAD + nx + r, PAD + ny); ctx.closePath(); ctx.fill();
        if (noteBS === 'dashed') ctx.setLineDash([6, 3]); else if (noteBS === 'dotted') ctx.setLineDash([2, 3]); else ctx.setLineDash([]);
        ctx.stroke(); ctx.setLineDash([]);
        _conCanvasRichNote(ctx, note, PAD + nx, PAD + ny, nw, nh);
        const noteMeta = (typeof conNotes !== 'undefined') ? conNotes.find(m => m.id === note.dataset.id) : null;
        if (noteMeta && noteMeta.emoji) { const dotEl = note.querySelector('.con-emoji-dot'); if (dotEl) { const _noteRect = note.getBoundingClientRect(); const dr = dotEl.getBoundingClientRect(); const dx = dr.left - _noteRect.left + dr.width / 2; const dy = dr.top - _noteRect.top + dr.height / 2; const dotFontPx = parseFloat(getComputedStyle(dotEl).fontSize) || 11; ctx.font = `${dotFontPx}px "Segoe UI",Arial,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(noteMeta.emoji, PAD + nx + dx, PAD + ny + dy); } }
      });
      (window._conBoardStickers || []).forEach(st => {
        if (!st || !st.emoji) return;
        const sx = PAD + (Number(st.x) || 0), sy = PAD + (Number(st.y) || 0);
        const sz = Number(st.size) || 36;
        ctx.save();
        ctx.font = `${sz}px "Segoe UI Emoji", Apple Color Emoji, sans-serif`;
        ctx.fillText(st.emoji, sx, sy + sz * 0.85);
        ctx.restore();
      });
      (window.conGetDrawings ? window.conGetDrawings() : []).forEach(d => {
        if (!d.points || d.points.length < 2) return;
        const op = Number.isFinite(d.opacity) ? d.opacity : 1;
        ctx.save(); ctx.globalAlpha = op; ctx.strokeStyle = d.color || '#e53935'; ctx.lineWidth = d.thickness || 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(PAD + d.x + d.points[0].x, PAD + d.y + d.points[0].y);
        for (let i = 1; i < d.points.length; i++) ctx.lineTo(PAD + d.x + d.points[i].x, PAD + d.y + d.points[i].y);
        ctx.stroke(); ctx.restore();
      });
      (window.conGetMasks ? window.conGetMasks() : []).forEach(mask => {
        if (!mask || !mask.el) return;
        const mx = mask.el.offsetLeft; const my = mask.el.offsetTop; const mw = mask.el.offsetWidth; const mh = mask.el.offsetHeight;
        const bg = mask.color || '#111111'; const op = Math.max(0.05, Math.min(1, Number(mask.opacity) || parseFloat(mask.el.style.opacity) || 0.95));
        ctx.save(); ctx.globalAlpha = op; ctx.fillStyle = bg; ctx.fillRect(PAD + mx, PAD + my, mw, mh); ctx.restore();
      });
      const now = new Date();
      const ts = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + '  ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      ctx.font = '500 11px "Segoe UI",Arial,sans-serif'; ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(ts, bw + PAD * 2 - 8, bh + PAD * 2 - 6);
      return { canvas, now, scale, PAD, bw, bh };
    }

    async function conExportPNG() {
      const result = await _conBuildBoardCanvas(); if (!result) return;
      const { canvas, now } = result;
      const defaultFilename = 'constellation_' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + '.png';
      canvas.toBlob(blob => {
        if (window.Desktop && Desktop.isElectron()) {
          const reader = new FileReader();
          reader.onloadend = function () {
            const base64data = reader.result.split(',')[1];
            Desktop.saveToDisk({
              title: 'Save PNG Image',
              defaultPath: defaultFilename,
              filters: [{ name: 'PNG Images', extensions: ['png'] }],
              content: base64data,
              encoding: 'base64'
            }).then(res => {
              if (res && res.ok) {
                if (window.showExportSuccessPopup) showExportSuccessPopup(res.path, defaultFilename);
              } else if (res && !res.ok && !res.canceled) {
                mdbToast('⚠️ Save failed: ' + (res.error || 'unknown'));
              }
            });
          };
          reader.readAsDataURL(blob);
        } else {
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = defaultFilename;
          a.click(); URL.revokeObjectURL(a.href);
        }
      }, 'image/png');
    }

    async function conCopyPNG() {
      const result = await _conBuildBoardCanvas(); if (!result) return;
      const { canvas } = result;
      canvas.toBlob(async blob => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          const btn = document.querySelector('[onclick="conCopyPNG()"]');
          if (btn) { const o = btn.textContent; btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = o, 1800); }
        } catch (err) { mdbToast('⚠️ Clipboard write failed — try Export PNG instead.'); }
      }, 'image/png');
    }

    // ── Export Settings Modal & Export Execution ────────────────────────
    function conOpenExportSettingsModal(defaultFormat = 'pdf_snapshots') {
      const overlay = document.getElementById('con-export-settings-overlay');
      if (!overlay) return;

      const pdfRadio = document.getElementById('con-export-fmt-pdf');
      const webpRadio = document.getElementById('con-export-fmt-webp');
      if (defaultFormat === 'webp' && webpRadio) {
        webpRadio.checked = true;
      } else if (pdfRadio) {
        pdfRadio.checked = true;
      }

      // Update scope labels with actual page count
      const curPageIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
      const totalPages = (Array.isArray(conPageSnapshots) && conPageSnapshots.length > 0) ? conPageSnapshots.length : 1;
      const curLabel = document.getElementById('con-export-scope-current-label');
      if (curLabel) {
        curLabel.textContent = (window.i18n ? i18n.t('conExportScopeCurrent') : 'Current page only') + ` (Page ${curPageIdx + 1})`;
      }
      const allLabel = document.getElementById('con-export-scope-all-label');
      if (allLabel) {
        allLabel.textContent = (window.i18n ? i18n.t('conExportScopeAll') : 'All pages booklet') + ` (${totalPages} ${totalPages > 1 ? 'pages' : 'page'})`;
      }

      // Default scope: for webp, default to current page; for pdf, default to all pages
      const scopeCurrent = document.getElementById('con-export-scope-current');
      const scopeAll = document.getElementById('con-export-scope-all');
      if (defaultFormat === 'webp') {
        if (scopeCurrent) scopeCurrent.checked = true;
      } else {
        if (scopeAll) scopeAll.checked = true;
      }

      conOnExportSettingsChange();
      overlay.style.display = 'flex';
    }

    function conCloseExportSettingsModal() {
      const overlay = document.getElementById('con-export-settings-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    function conOnExportQualitySlider(val) {
      const badge = document.getElementById('con-export-quality-badge');
      if (badge) badge.textContent = val + '%';
      conUpdateExportEstimate();
    }

    function conApplyExportQualityPreset(val) {
      const slider = document.getElementById('con-export-quality-slider');
      if (slider) {
        slider.value = val;
        conOnExportQualitySlider(val);
      }
    }

    function conOnExportSettingsChange() {
      conUpdateExportEstimate();
    }

    function conUpdateExportEstimate() {
      const scaleSelect = document.getElementById('con-export-scale-select');
      const scale = scaleSelect ? parseFloat(scaleSelect.value) || 1.5 : 1.5;
      const slider = document.getElementById('con-export-quality-slider');
      const quality = slider ? parseInt(slider.value, 10) || 82 : 82;

      const board = document.getElementById('constellation-board');
      const baseW = Math.max(600, board ? board.clientWidth : 1200);
      const baseH = Math.max(400, board ? board.clientHeight : 800);
      const estW = Math.round(baseW * scale);
      const estH = Math.round(baseH * scale);

      const dimsEl = document.getElementById('con-export-dims-preview');
      if (dimsEl) {
        const pixels = estW * estH;
        const approxKb = Math.round((pixels / 10000) * (quality / 100) * 0.18);
        dimsEl.textContent = `~${estW} × ${estH} px (≈${Math.max(40, approxKb)} KB / page)`;
      }
    }

    async function conExecuteExportWithOptions() {
      const isWebp = document.getElementById('con-export-fmt-webp')?.checked;
      const scope = document.getElementById('con-export-scope-current')?.checked ? 'current' : 'all';
      const scaleSelect = document.getElementById('con-export-scale-select');
      const scale = scaleSelect ? parseFloat(scaleSelect.value) || 1.5 : 1.5;
      const slider = document.getElementById('con-export-quality-slider');
      const quality = slider ? parseInt(slider.value, 10) || 82 : 82;

      conCloseExportSettingsModal();

      const options = {
        format: isWebp ? 'webp' : 'pdf_snapshots',
        scope,
        scale,
        quality
      };

      if (isWebp) {
        await conExportWebP(options);
      } else {
        await conExportPagesPDF('snapshots', options);
      }
    }

    function conCreateStoreZipUint8Array(entries) {
      const prepared = entries.map(e => {
        let fileBytes;
        if (e.data instanceof Uint8Array) {
          fileBytes = e.data;
        } else if (typeof e.data === 'string') {
          if (e.encoding === 'base64') {
            const bin = atob(e.data);
            fileBytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) fileBytes[i] = bin.charCodeAt(i);
          } else {
            fileBytes = new TextEncoder().encode(e.data);
          }
        } else {
          fileBytes = new Uint8Array(0);
        }
        const nameBytes = new TextEncoder().encode(e.name);
        return { nameBytes, fileBytes };
      });

      const crcTable = (function () {
        const t = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i;
          for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
          t[i] = c;
        }
        return t;
      })();

      function calcCrc32(bytes) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
          crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
      }

      let localSize = 0;
      let cdSize = 0;
      prepared.forEach(p => {
        p.crc = calcCrc32(p.fileBytes);
        localSize += 30 + p.nameBytes.length + p.fileBytes.length;
        cdSize += 46 + p.nameBytes.length;
      });
      const endSize = 22;
      const totalLen = localSize + cdSize + endSize;
      const buf = new Uint8Array(totalLen);
      const view = new DataView(buf.buffer);

      let offset = 0;
      const cdOffsets = [];

      prepared.forEach(p => {
        cdOffsets.push(offset);
        view.setUint32(offset, 0x04034b50, true);
        view.setUint16(offset + 4, 10, true);
        view.setUint16(offset + 6, 0, true);
        view.setUint16(offset + 8, 0, true);
        view.setUint16(offset + 10, 0, true);
        view.setUint16(offset + 12, 0, true);
        view.setUint32(offset + 14, p.crc, true);
        view.setUint32(offset + 18, p.fileBytes.length, true);
        view.setUint32(offset + 22, p.fileBytes.length, true);
        view.setUint16(offset + 26, p.nameBytes.length, true);
        view.setUint16(offset + 28, 0, true);
        offset += 30;
        buf.set(p.nameBytes, offset);
        offset += p.nameBytes.length;
        buf.set(p.fileBytes, offset);
        offset += p.fileBytes.length;
      });

      const cdStartOffset = offset;
      prepared.forEach((p, idx) => {
        view.setUint32(offset, 0x02014b50, true);
        view.setUint16(offset + 4, 10, true);
        view.setUint16(offset + 6, 10, true);
        view.setUint16(offset + 8, 0, true);
        view.setUint16(offset + 10, 0, true);
        view.setUint16(offset + 12, 0, true);
        view.setUint16(offset + 14, 0, true);
        view.setUint32(offset + 16, p.crc, true);
        view.setUint32(offset + 20, p.fileBytes.length, true);
        view.setUint32(offset + 24, p.fileBytes.length, true);
        view.setUint16(offset + 28, p.nameBytes.length, true);
        view.setUint16(offset + 30, 0, true);
        view.setUint16(offset + 32, 0, true);
        view.setUint16(offset + 34, 0, true);
        view.setUint16(offset + 36, 0, true);
        view.setUint32(offset + 38, 0, true);
        view.setUint32(offset + 42, cdOffsets[idx], true);
        offset += 46;
        buf.set(p.nameBytes, offset);
        offset += p.nameBytes.length;
      });

      view.setUint32(offset, 0x06054b50, true);
      view.setUint16(offset + 4, 0, true);
      view.setUint16(offset + 6, 0, true);
      view.setUint16(offset + 8, prepared.length, true);
      view.setUint16(offset + 10, prepared.length, true);
      view.setUint32(offset + 12, cdSize, true);
      view.setUint32(offset + 16, cdStartOffset, true);
      view.setUint16(offset + 20, 0, true);

      return buf;
    }

    async function conExportWebP(exportOpts = {}) {
      conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
      const allPages = conPageSnapshots.slice();
      const titleVal = (document.getElementById('con-title-input')?.value || '').trim() || 'constellation';
      const safeTitle = titleVal.replace(/[\\/:*?"<>|]/g, '_') || 'constellation';
      const targetScale = (exportOpts && typeof exportOpts.scale === 'number') ? exportOpts.scale : 1.5;
      const targetQuality = (exportOpts && typeof exportOpts.quality === 'number') ? Math.max(0.2, Math.min(1.0, exportOpts.quality / 100)) : 0.82;
      const scope = (exportOpts && exportOpts.scope) || 'current';

      const isPageNonEmpty = p => {
        if (!p) return false;
        return (p.nodes && p.nodes.length > 0) ||
          (p.groups && p.groups.length > 0) ||
          (p.shapes && p.shapes.length > 0) ||
          (p.notes && p.notes.length > 0) ||
          (p.drawings && p.drawings.length > 0) ||
          (p.tables && p.tables.length > 0) ||
          (p.media && p.media.length > 0) ||
          (p.masks && p.masks.length > 0) ||
          (p.boardStickers && p.boardStickers.length > 0) ||
          (p.backgroundPdf && (p.backgroundPdf.relativePath || p.backgroundPdf.attachmentId));
      };

      const now = new Date();
      const timeStamp = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');

      if (scope === 'current') {
        const result = await _conBuildBoardCanvas({ scale: targetScale });
        if (!result || !result.canvas) return;
        const pageNumPadded = String(conCurrentPageIndex + 1).padStart(2, '0');
        const defaultFilename = safeTitle + '_p' + pageNumPadded + '_' + timeStamp + '.webp';

        result.canvas.toBlob(blob => {
          if (!blob) {
            mdbToast('⚠️ Failed to encode WebP image.');
            return;
          }
          if (window.Desktop && Desktop.isElectron()) {
            const reader = new FileReader();
            reader.onloadend = function () {
              const base64data = reader.result.split(',')[1];
              Desktop.saveToDisk({
                title: 'Save WebP Image',
                defaultPath: defaultFilename,
                filters: [{ name: 'WebP Images', extensions: ['webp'] }],
                content: base64data,
                encoding: 'base64'
              }).then(res => {
                if (res && res.ok) {
                  const savedName = res.name || defaultFilename;
                  if (typeof showToast === 'function') {
                    showToast(i18n.t('conExportWebpSaved', { name: savedName }));
                  } else {
                    mdbToast('✓ ' + i18n.t('conExportWebpSaved', { name: savedName }));
                  }
                  if (window.showExportSuccessPopup && res.path) {
                    showExportSuccessPopup(res.path, savedName);
                  }
                } else if (res && !res.ok && !res.canceled) {
                  mdbToast('⚠️ Save failed: ' + (res.error || 'unknown'));
                }
              });
            };
            reader.readAsDataURL(blob);
          } else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = defaultFilename;
            a.click();
            URL.revokeObjectURL(a.href);
          }
        }, 'image/webp', targetQuality);
      } else {
        const origIndex = conCurrentPageIndex;
        const pagesToProcess = (allPages.length > 1)
          ? (allPages.filter(isPageNonEmpty).length > 0 ? allPages.filter(isPageNonEmpty) : allPages.slice(0, 1))
          : allPages;

        let overlay = document.getElementById('con-pdf-export-loading-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'con-pdf-export-loading-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;transition:opacity 0.2s ease;';
          overlay.innerHTML = `
            <div style="background:rgba(30,41,59,0.9);padding:24px 36px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);display:flex;flex-direction:column;align-items:center;gap:12px;">
              <div style="width:32px;height:32px;border:3px solid rgba(255,255,255,0.2);border-top-color:#3b82f6;border-radius:50%;animation:con-pdf-spin 0.8s linear infinite;"></div>
              <div id="con-pdf-export-loading-title" style="font-weight:600;font-size:15px;letter-spacing:0.3px;">Exporting WebP Images...</div>
              <div id="con-pdf-export-loading-progress" style="font-size:13px;color:#94a3b8;">Preparing pages...</div>
            </div>
            <style>@keyframes con-pdf-spin { to { transform: rotate(360deg); } }</style>
          `;
          document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';

        const boardEl = document.getElementById('constellation-board');
        const prevVisibility = boardEl ? boardEl.style.visibility : '';
        if (boardEl) boardEl.style.visibility = 'hidden';

        const webpEntries = [];
        try {
          const progressEl = document.getElementById('con-pdf-export-loading-progress');
          for (let i = 0; i < pagesToProcess.length; i++) {
            if (progressEl) progressEl.textContent = `Processing page ${i + 1} of ${pagesToProcess.length}...`;
            _conRestorePageToBoard(pagesToProcess[i]);
            if (typeof conAwaitAllPdfRendersOnBoard === 'function') {
              try { await conAwaitAllPdfRendersOnBoard(); } catch (_) { }
            }
            await new Promise(r => setTimeout(r, 80));
            const res = await _conBuildBoardCanvas({ scale: targetScale });
            if (res && res.canvas) {
              let u = res.canvas.toDataURL('image/webp', targetQuality);
              if (!u || !u.startsWith('data:image/webp')) u = res.canvas.toDataURL('image/png');
              const b64 = u.split(',')[1];
              const pageNumPadded = String(i + 1).padStart(3, '0');
              webpEntries.push({
                name: safeTitle + '_page_' + pageNumPadded + '.webp',
                data: b64,
                encoding: 'base64',
                store: true
              });
            }
          }
        } finally {
          _conRestorePageToBoard(allPages[origIndex]);
          if (boardEl) boardEl.style.visibility = prevVisibility;
          if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; }, 200);
          }
        }

        if (webpEntries.length === 0) {
          mdbToast('⚠️ No pages could be converted to WebP.');
          return;
        }

        if (webpEntries.length === 1) {
          const single = webpEntries[0];
          if (window.Desktop && Desktop.isElectron()) {
            Desktop.saveToDisk({
              title: 'Save WebP Image',
              defaultPath: single.name,
              filters: [{ name: 'WebP Images', extensions: ['webp'] }],
              content: single.data,
              encoding: 'base64'
            }).then(res => {
              if (res && res.ok) {
                const savedName = res.name || single.name;
                if (typeof showToast === 'function') {
                  showToast(i18n.t('conExportWebpSaved', { name: savedName }));
                } else {
                  mdbToast('✓ ' + i18n.t('conExportWebpSaved', { name: savedName }));
                }
                if (window.showExportSuccessPopup && res.path) {
                  showExportSuccessPopup(res.path, savedName);
                }
              }
            });
          } else {
            const byteCharacters = atob(single.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/webp' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = single.name;
            a.click();
            URL.revokeObjectURL(a.href);
          }
          return;
        }

        const zipBytes = conCreateStoreZipUint8Array(webpEntries);
        const zipFilename = safeTitle + '_webp_pages_' + timeStamp + '.zip';

        if (window.Desktop && Desktop.isElectron()) {
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < zipBytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, zipBytes.subarray(i, i + chunkSize));
          }
          const base64Zip = btoa(binary);

          Desktop.saveToDisk({
            title: 'Save WebP Pages Archive',
            defaultPath: zipFilename,
            filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
            content: base64Zip,
            encoding: 'base64'
          }).then(res => {
            if (res && res.ok) {
              const savedName = res.name || zipFilename;
              if (typeof showToast === 'function') {
                showToast('WebP archive exported: ' + savedName);
              } else {
                mdbToast('✓ WebP archive exported: ' + savedName);
              }
              if (window.showExportSuccessPopup && res.path) {
                showExportSuccessPopup(res.path, savedName, true);
              }
            } else if (res && !res.ok && !res.canceled) {
              mdbToast('⚠️ Save failed: ' + (res.error || 'unknown'));
            }
          });
        } else {
          const blob = new Blob([zipBytes], { type: 'application/zip' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = zipFilename;
          a.click();
          URL.revokeObjectURL(a.href);
        }
      }
    }

    async function conExportPagesPDF(mode = 'vector', exportOpts = {}) {
      conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
      if (Array.isArray(conPageSnapshots) && typeof conEnsureSnapshotDimensions === 'function') {
        conPageSnapshots.forEach(snap => conEnsureSnapshotDimensions(snap));
      }
      const allPages = conPageSnapshots.slice();
      const titleVal = (document.getElementById('con-title-input')?.value || '').trim() || 'constellation';

      const isPageNonEmpty = p => {
        if (!p) return false;
        return (p.nodes && p.nodes.length > 0) ||
          (p.groups && p.groups.length > 0) ||
          (p.shapes && p.shapes.length > 0) ||
          (p.notes && p.notes.length > 0) ||
          (p.drawings && p.drawings.length > 0) ||
          (p.tables && p.tables.length > 0) ||
          (p.media && p.media.length > 0) ||
          (p.masks && p.masks.length > 0) ||
          (p.boardStickers && p.boardStickers.length > 0) ||
          (p.backgroundPdf && (p.backgroundPdf.relativePath || p.backgroundPdf.attachmentId));
      };

      let pagesToProcess;
      if (exportOpts && exportOpts.scope === 'current') {
        pagesToProcess = [allPages[conCurrentPageIndex]];
      } else {
        pagesToProcess = (allPages.length > 1)
          ? (allPages.filter(isPageNonEmpty).length > 0 ? allPages.filter(isPageNonEmpty) : allPages.slice(0, 1))
          : allPages;
      }

      const targetScale = (exportOpts && typeof exportOpts.scale === 'number') ? exportOpts.scale : 1.5;
      const targetQuality = (exportOpts && typeof exportOpts.quality === 'number') ? Math.max(0.2, Math.min(1.0, exportOpts.quality / 100)) : 0.82;

      const curLayout = window._bcBoardLayoutConfig || {};
      const isPortrait = curLayout.preset === 'a4-portrait' ||
        (curLayout.preset === 'custom' && curLayout.customOrientation === 'portrait') ||
        (curLayout.dims && curLayout.dims.h > curLayout.dims.w);
      const resolvedOrientation = isPortrait ? 'portrait' : 'landscape';

      // 1. PRIMARY: Headless vector SVG BoardExportService (if mode is 'vector' or default)
      if (mode !== 'snapshots' && window.BoardExportService && typeof window.BoardExportService.exportPagesPdf === 'function') {
        try {
          const res = await window.BoardExportService.exportPagesPdf(pagesToProcess, {
            title: titleVal,
            orientation: resolvedOrientation,
            renderMode: 'vector'
          });
          if (res && (res.ok || res.canceled)) {
            return res;
          }
        } catch (err) {
          console.warn('[Board Export] Headless exportPagesPdf error, falling back to raster canvas loader:', err);
        }
      }

      // 2. High-DPI Canvas rasterization loader (for 'snapshots' mode or fallback)
      const origIndex = conCurrentPageIndex;
      const dataUrls = [];

      let overlay = document.getElementById('con-pdf-export-loading-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'con-pdf-export-loading-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;transition:opacity 0.2s ease;';
        overlay.innerHTML = `
          <div style="background:rgba(30,41,59,0.9);padding:24px 36px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);display:flex;flex-direction:column;align-items:center;gap:12px;">
            <div style="width:32px;height:32px;border:3px solid rgba(255,255,255,0.2);border-top-color:#3b82f6;border-radius:50%;animation:con-pdf-spin 0.8s linear infinite;"></div>
            <div id="con-pdf-export-loading-title" style="font-weight:600;font-size:15px;letter-spacing:0.3px;">Generating PDF...</div>
            <div id="con-pdf-export-loading-progress" style="font-size:13px;color:#94a3b8;">Preparing pages...</div>
          </div>
          <style>@keyframes con-pdf-spin { to { transform: rotate(360deg); } }</style>
        `;
        document.body.appendChild(overlay);
      }
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';

      const boardEl = document.getElementById('constellation-board');
      const prevVisibility = boardEl ? boardEl.style.visibility : '';
      if (boardEl) boardEl.style.visibility = 'hidden';

      try {
        const progressEl = document.getElementById('con-pdf-export-loading-progress');
        for (let i = 0; i < pagesToProcess.length; i++) {
          if (progressEl) progressEl.textContent = `Processing page ${i + 1} of ${pagesToProcess.length}...`;
          _conRestorePageToBoard(pagesToProcess[i]);
          if (typeof conAwaitAllPdfRendersOnBoard === 'function') {
            try { await conAwaitAllPdfRendersOnBoard(); } catch (_) { }
          }
          await new Promise(r => setTimeout(r, 80));
          const res = await _conBuildBoardCanvas({ scale: targetScale });
          if (res && res.canvas) {
            let u = res.canvas.toDataURL('image/webp', targetQuality);
            if (!u || !u.startsWith('data:image/webp')) u = res.canvas.toDataURL('image/png');
            dataUrls.push(u);
          }
        }
      } finally {
        _conRestorePageToBoard(allPages[origIndex]);
        if (boardEl) boardEl.style.visibility = prevVisibility;
        if (overlay) {
          overlay.style.opacity = '0';
          setTimeout(() => { overlay.style.display = 'none'; }, 200);
        }
      }

      if (window.BoardExportService && typeof window.BoardExportService.exportCanvasPagesPdf === 'function') {
        return window.BoardExportService.exportCanvasPagesPdf(dataUrls, {
          title: titleVal,
          orientation: resolvedOrientation,
          quality: targetQuality,
          scale: targetScale
        });
      }

      function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
      const displayTitle = escapeHtml(titleVal);
      const imgTags = dataUrls.map((url, i) => `<div class="pg"><img src="${url}" alt="Page ${i + 1}"></div>`).join('\n');
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${displayTitle}</title><style>@page{margin:0;size:${resolvedOrientation}}html,body{margin:0;padding:0;background:#fff;width:100%;height:100%}.pg{width:100vw;height:100vh;page-break-after:always;display:flex;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box}.pg:last-child{page-break-after:auto}img{max-width:100%;max-height:100%;object-fit:contain;display:block}</style></head><body>\n${imgTags}\n</body></html>`;
      const safeTitle = titleVal.replace(/[\\/:*?"<>|]/g, '_') || 'constellation';
      const defaultName = safeTitle + '_pages.pdf';

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.printPdf === 'function') {
        const doPrint = (targetFilename, isToPrint) => {
          const pdfReq = {
            html,
            landscape: true,
            pdfOptions: { pageSize: 'A4', landscape: true, printBackground: true }
          };
          if (isToPrint) {
            pdfReq.target = 'toPrint';
            pdfReq.filename = targetFilename;
          } else {
            pdfReq.defaultName = targetFilename;
          }
          Desktop.printPdf(pdfReq).then(result => {
            if (result && result.ok) {
              if (window.showExportSuccessPopup && result.path) {
                showExportSuccessPopup(result.path, result.name || targetFilename);
              } else if (typeof mdbToast === 'function') {
                mdbToast('✓ PDF saved: ' + (result.name || targetFilename));
              }
            } else if (!result.ok && !result.canceled) {
              mdbToast('⚠️ Could not save PDF: ' + (result.error || 'unknown error'));
            }
          }).catch(err => {
            mdbToast('⚠️ Could not save PDF: ' + (err && err.message ? err.message : String(err)));
          });
        };

        if (typeof window.promptExportDestination === 'function') {
          window.promptExportDestination({
            title: 'Export Board PDF',
            prompt: 'Where do you want to save the exported PDF?',
            filename: defaultName,
            allowDocEditor: false
          }).then(destRes => {
            if (!destRes || destRes.canceled) return;
            doPrint(destRes.filename || defaultName, destRes.destination === 'to-print');
          });
        } else {
          doPrint(defaultName, false);
        }
      } else {
        let iframe = document.getElementById('con-pages-pdf-iframe');
        if (!iframe) { iframe = document.createElement('iframe'); iframe.id = 'con-pages-pdf-iframe'; iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;top:-9999px'; document.body.appendChild(iframe); }
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open(); doc.write(html); doc.close();
        setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { } }, 500);
      }
    }

    // ── End canvas / export helpers ───────────────────────────────────

    function _conDownsampleCanvas(srcCanvas, maxDim = 600) {
      if (!srcCanvas || !srcCanvas.width || !srcCanvas.height) return srcCanvas;
      const sw = srcCanvas.width;
      const sh = srcCanvas.height;
      if (sw <= maxDim && sh <= maxDim) return srcCanvas;

      const scale = Math.min(maxDim / sw, maxDim / sh);
      const dw = Math.max(1, Math.round(sw * scale));
      const dh = Math.max(1, Math.round(sh * scale));

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = dw;
      thumbCanvas.height = dh;
      const ctx = thumbCanvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(srcCanvas, 0, 0, dw, dh);
      }
      return thumbCanvas;
    }

    function _conBuildThumbnailDataUrl(srcCanvas, maxDim = 600) {
      if (!srcCanvas) return '';
      const thumbCanvas = _conDownsampleCanvas(srcCanvas, maxDim);
      let url = thumbCanvas.toDataURL('image/webp', 0.82);
      if (!url || !url.startsWith('data:image/webp')) {
        url = thumbCanvas.toDataURL('image/png');
      }
      return url;
    }

    // Save a WebP/PNG snapshot of the current board state for a given page index.
    // Save a WebP/PNG snapshot of the current board state for a given page index.
    // Captures visual fidelity canvas and updates in-memory snapshot cache and DOM preview.
    async function conSaveCurrentPageSnapshotPng(pageIndex, options = {}) {
      const idx = (typeof pageIndex === 'number') ? pageIndex : conCurrentPageIndex;
      if (typeof idx !== 'number' || idx < 0) return;
      let dataUrl = '';

      const snap = (idx === conCurrentPageIndex && typeof conBuildPageSnapshot === 'function')
        ? conBuildPageSnapshot()
        : (conPageSnapshots && conPageSnapshots[idx]);

      // Fast-path: use lightweight vector thumbnail renderer (sub-millisecond)
      if (options.fast && snap && typeof conBuildPageThumbnailDataUrl === 'function') {
        dataUrl = conBuildPageThumbnailDataUrl(snap, 480, 320);
      }

      // High-res path: only render full board canvas when not in fast mode
      if (!dataUrl && !options.fast && idx === conCurrentPageIndex && typeof _conBuildBoardCanvas === 'function') {
        try {
          const liveRes = await _conBuildBoardCanvas();
          if (liveRes && liveRes.canvas) {
            if (typeof _conBuildThumbnailDataUrl === 'function') {
              dataUrl = _conBuildThumbnailDataUrl(liveRes.canvas, 600);
            } else {
              let url = liveRes.canvas.toDataURL('image/webp', 0.82);
              if (!url || !url.startsWith('data:image/webp')) url = liveRes.canvas.toDataURL('image/png');
              dataUrl = url;
            }
          }
        } catch (_) {}
      }
      if (!dataUrl && snap) {
        dataUrl = (typeof conBuildPageThumbnailDataUrl === 'function')
          ? conBuildPageThumbnailDataUrl(snap, 480, 320)
          : '';
      }
      if (!dataUrl) return;

      if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
      _conPageSnapshotPngs[idx] = dataUrl;

      // Update thumbnail image in mini-strip immediately in DOM
      const strip = document.getElementById('con-page-mini-strip');
      if (strip) {
        const thumbs = strip.querySelectorAll('.con-page-mini-thumb');
        if (thumbs[idx]) {
          const img = thumbs[idx].querySelector('img');
          const canvas = thumbs[idx].querySelector('canvas');
          if (img) {
            const applyImg = function () {
              if (canvas) canvas.style.display = 'none';
              img.style.display = 'block';
              img.dataset.pngLoaded = '1';
            };
            img.onload = applyImg;
            img.src = dataUrl;
            if (img.complete && img.naturalWidth > 0) {
              applyImg();
            }
          }
        }
      }
    }

    let _conPageSnapshotSaveTimer = null;
    let _conPageSnapshotSaveQueued = null;
    function conQueueCurrentPageSnapshotPng(pageIndex) {
      const targetIdx = (typeof pageIndex === 'number') ? pageIndex : conCurrentPageIndex;
      if (typeof targetIdx !== 'number' || targetIdx < 0) return;
      _conPageSnapshotSaveQueued = targetIdx;

      // Immediately produce fast vector thumbnail with zero lag
      try {
        conSaveCurrentPageSnapshotPng(targetIdx, { fast: true });
      } catch (_) {}

      // Debounce heavy raster canvas build to avoid freezing UI during active page navigation
      if (_conPageSnapshotSaveTimer) clearTimeout(_conPageSnapshotSaveTimer);
      _conPageSnapshotSaveTimer = setTimeout(async function () {
        _conPageSnapshotSaveTimer = null;
        const nextIndex = _conPageSnapshotSaveQueued;
        _conPageSnapshotSaveQueued = null;
        if (nextIndex === null || nextIndex === undefined) return;
        try {
          await conSaveCurrentPageSnapshotPng(nextIndex);
        } catch (_) { }
      }, 2500);
    }

    let _conLiveSnapshotDebounceTimer = null;
    function conTriggerLivePageSnapshot(delayMs = 1200) {
      if (typeof conCurrentPageIndex !== 'number') return;
      if (_conLiveSnapshotDebounceTimer) clearTimeout(_conLiveSnapshotDebounceTimer);
      _conLiveSnapshotDebounceTimer = setTimeout(() => {
        _conLiveSnapshotDebounceTimer = null;
        if (typeof conQueueCurrentPageSnapshotPng === 'function') {
          conQueueCurrentPageSnapshotPng(conCurrentPageIndex);
        }
      }, delayMs);
    }
    window.conTriggerLivePageSnapshot = conTriggerLivePageSnapshot;

    async function conSaveSessionFolderBundle(sessionFilename, persistedData, options = {}) {
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.saveBoardArchive === 'function') {
        const archiveBundle = await conBuildSessionArchiveBundle(sessionFilename, persistedData, options);
        const result = await Desktop.saveBoardArchive('mindmaps', archiveBundle.filename, archiveBundle.entries);
        if (!result || !result.ok) {
          throw new Error(result && result.error ? result.error : 'Could not save Constellation archive.');
        }

        _conCurrentFileName = archiveBundle.filename;
        _conCurrentFolderName = null;
        if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();
        conSetAttachmentsFromSession(archiveBundle.attachments);
        if (window.conUpdatePageBar) window.conUpdatePageBar();
        if (typeof historyUpsertEntry === 'function') {
          historyUpsertEntry('mindmaps', archiveBundle.filename, archiveBundle.filename, archiveBundle.data, options);
        }
        return {
          filename: archiveBundle.filename,
          folderName: null,
          data: archiveBundle.data
        };
      }

      const bundle = await conBuildSessionFolderBundle(sessionFilename, persistedData, options);

      const result = await Desktop.saveFiles('mindmaps', bundle.files);
      if (!result || !result.ok) {
        throw new Error(result && result.error ? result.error : 'Could not save Constellation bundle.');
      }

      _conCurrentFileName = bundle.filename;
      _conCurrentFolderName = bundle.folderName;
      if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();
      conSetAttachmentsFromSession(bundle.attachments);
      if (window.conUpdatePageBar) window.conUpdatePageBar();
      if (typeof historyUpsertEntry === 'function') {
        const rel = bundle.folderName ? (bundle.folderName + '/' + bundle.filename) : bundle.filename;
        historyUpsertEntry('mindmaps', bundle.filename, rel, bundle.data, options);
      }
      return {
        filename: bundle.filename,
        folderName: bundle.folderName,
        data: bundle.data
      };
    }

    let _conSilentInitialSavePromise = null;
    function conTrySilentInitialSave() {
      if (new URLSearchParams(location.search).get('mirror') === '1' || window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') return null;
      if (!(window.Desktop && Desktop.isElectron())) return null;
      if (!_conCurrentFileName && !_conCurrentFolderName) return null;
      if (_conSilentInitialSavePromise) return _conSilentInitialSavePromise;

      const data = conBuildSessionData();
      if (!conSessionHasMeaningfulContent(data)) return null;

      const titleVal = (window.conGetTitle ? window.conGetTitle() : '').trim();
      const requestedName = boardDefaultFileName('constellation', titleVal);
      const persistedData = boardBuildPersistedSessionData('constellation', data);

      boardShowAutosaveToast();
      _conSilentInitialSavePromise = conSaveSessionFolderBundle(requestedName, persistedData, { isAutosave: true })
        .then(saved => {
          boardPersistLocalSession('constellation', saved.data, {
            source: 'autosave',
            name: saved.filename
          });
          boardSetAutosaveFingerprint('constellation', saved.data);
          boardHideAutosaveToast(true);
          return saved;
        })
        .catch((err) => {
          boardHideAutosaveToast(false);
          return null;
        })
        .finally(() => {
          _conSilentInitialSavePromise = null;
        });

      return _conSilentInitialSavePromise;
    }

    function conSaveSession() {
      if (window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') {
        const msg = (typeof t === 'function' ? t('conPageWindowSaveDisabled') : 'Saving is disabled in secondary page windows to prevent overwriting the main session.');
        if (typeof showToast === 'function') {
          showToast(msg, false);
        } else if (typeof mdbToast === 'function') {
          mdbToast('⚠️ ' + msg);
        }
        return;
      }
      const data = conBuildSessionData();
      if (!conSessionHasContent(data)) {
        mdbToast('⚠️ Nothing to save yet. Add at least one node, note, or title first.');
        return;
      }

      const now = Date.now();
      const fp = boardComputeFingerprint('constellation', data);
      const isRecentSave = (now - _conLastSaveTimestamp < 1500);

      // Cooldown / deduplication: if identical fingerprint and saved recently, acknowledge without duplicate disk I/O
      if (!_boardIsDirty && boardAutosaveFingerprint['constellation'] === fp && isRecentSave) {
        boardSetDirty(false, { justSaved: true });
        return;
      }

      // If a save is already in flight, flag a pending manual save to run after current one finishes
      if (_conIsSaving) {
        _conPendingManualSave = true;
        return;
      }

      _conIsSaving = true;
      if (_boardMutationTimer) {
        clearTimeout(_boardMutationTimer);
        _boardMutationTimer = null;
      }
      _boardMutationFirstDirtyAt = 0;

      const persistedData = boardBuildPersistedSessionData('constellation', data);
      const blob = boardBuildSessionBlob(persistedData, 'CONSTELLATION_SESSION_EXPORT');
      const titleVal = window.conGetTitle ? window.conGetTitle() : '';
      const filename = boardDefaultFileName('constellation', titleVal);

      const _onSaveSuccess = (savedName, folderName, finalData) => {
        _conIsSaving = false;
        _conLastSaveTimestamp = Date.now();
        _boardMutationFirstDirtyAt = 0;
        if (_boardMutationTimer) {
          clearTimeout(_boardMutationTimer);
          _boardMutationTimer = null;
        }
        boardAutosaveFingerprint['constellation'] = fp;
        if (savedName) _conCurrentFileName = savedName;
        _conCurrentFolderName = folderName || null;
        if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();
        boardPersistLocalSession('constellation', finalData || persistedData, { source: 'manual-save', name: savedName });
        boardSetDirty(false, { justSaved: true });
        mdbToast('✅ Saved: ' + savedName);
        if (folderName || savedName) conSaveHistorySnapshot(folderName, savedName, finalData || persistedData);
        if (typeof boardReportActiveFileContext === 'function') boardReportActiveFileContext();
        else if (typeof window.boardReportActiveFileContext === 'function') window.boardReportActiveFileContext();

        if (_conPendingManualSave) {
          _conPendingManualSave = false;
          setTimeout(() => conSaveSession(), 100);
        }
      };

      const _onSaveError = (err) => {
        _conIsSaving = false;
        _conPendingManualSave = false;
        mdbToast('⚠️ Could not save Constellation: ' + (err && err.message ? err.message : String(err)));
      };

      if (window.Desktop && Desktop.isElectron()) {
        if (_conCurrentFileName) {
          conSaveSessionFolderBundle(_conCurrentFileName, persistedData, { isManualSave: true })
            .then(saved => {
              _onSaveSuccess(saved.filename, saved.folderName, saved.data);
            })
            .catch(_onSaveError);
          return;
        }

        sfnOpen(filename, blob, 'mindmaps', savedName => {
          if (savedName) _conCurrentFileName = savedName;
        }, {
          customSave: async function (requestedName) {
            try {
              const saved = await conSaveSessionFolderBundle(requestedName, persistedData, { isManualSave: true });
              _onSaveSuccess(saved.filename, saved.folderName, saved.data);
              return saved.filename;
            } catch (err) {
              _onSaveError(err);
              throw err;
            }
          }
        });
        return;
      }

      if (_conCurrentFileName && window.Desktop && Desktop.isElectron()) {
        Desktop.saveBlob('mindmaps', _conCurrentFileName, blob)
          .then(() => {
            _onSaveSuccess(_conCurrentFileName, null, persistedData);
          })
          .catch(() => {
            _conIsSaving = false;
            sfnOpen(filename, blob, 'mindmaps', savedName => {
              if (savedName) {
                _conCurrentFileName = savedName;
                _onSaveSuccess(savedName, null, persistedData);
              }
            });
          });
        return;
      }

      sfnOpen(filename, blob, 'mindmaps', savedName => {
        if (savedName) {
          _conCurrentFileName = savedName;
          _onSaveSuccess(savedName, null, persistedData);
        } else {
          _conIsSaving = false;
        }
      });
    }

    async function conSuggestDuplicateFilename(baseName) {
      const sourceBase = boardStripJsonExt(String(baseName || '').trim()) || 'constellation';
      const ext = (baseName && baseName.endsWith('.js')) ? '.js' : '.cstz';
      const takenBases = new Set();

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.listByPath === 'function') {
        try {
          const listed = await Desktop.listByPath('mindmaps', '.', {
            extensions: ['.js', '.json', '.cstz', '.zip'],
            recursive: true,
            excludeDirs: ['archived', 'history', 'pics', 'sounds', 'videos', 'pdf', 'templates']
          });
          const files = (listed && listed.ok && Array.isArray(listed.files)) ? listed.files : [];
          files.forEach(file => {
            const rel = String((file && (file.relativePath || file.filename)) || '').replace(/\\/g, '/');
            if (!rel) return;
            const parts = rel.split('/').filter(Boolean);
            const leaf = parts.length ? parts[parts.length - 1] : '';
            const leafBase = boardStripJsonExt(leaf).toLowerCase();
            if (!leafBase) return;
            if (parts.length === 2 && boardStripJsonExt(parts[1]).toLowerCase() === parts[0].toLowerCase()) {
              takenBases.add(parts[0].toLowerCase());
              return;
            }
            if (parts.length === 1) {
              takenBases.add(leafBase);
            }
          });
        } catch (_) { }
      }

      const baseLower = sourceBase.toLowerCase();
      let candidate = sourceBase + ' (copy)';
      if (candidate.toLowerCase() === baseLower) candidate = sourceBase + ' (copy 2)';
      if (!takenBases.has(candidate.toLowerCase())) return candidate + ext;

      for (let i = 2; i <= 999; i++) {
        const numbered = sourceBase + ' (copy ' + i + ')';
        if (!takenBases.has(numbered.toLowerCase())) return numbered + ext;
      }

      return sourceBase + ' (copy ' + Date.now() + ')' + ext;
    }

    async function conDuplicateCurrentFile() {
      if (!(window.Desktop && Desktop.isElectron())) {
        mdbToast('⚠️ Duplicating files requires the Electron desktop app.');
        return;
      }
      if (typeof Desktop.saveFiles !== 'function' && typeof Desktop.saveBoardArchive !== 'function') {
        mdbToast('⚠️ Duplicate is not available in this app version.');
        return;
      }

      const data = conBuildSessionData();
      if (!conSessionHasContent(data)) {
        mdbToast('⚠️ Nothing to duplicate yet. Add at least one node, note, or title first.');
        return;
      }

      if (!_conCurrentFileName && !_conCurrentFolderName) {
        mdbToast('⚠️ Save this board first, then duplicate the file.');
        return;
      }

      let relinkAfterDuplicate = false;
      if (activePlannerEntryId) {
        const linkedEntry = bpGetAllEntries().find(e => e.id === activePlannerEntryId);
        const linkedLabel = linkedEntry ? ('\n\nCurrent link: ' + bpBuildLabel(linkedEntry)) : '';
        const proceed = await showConfirm(
          'This file is linked to a Planner class timeslot.'
          + '\nDuplicating it will break that link in the duplicate file.'
          + linkedLabel
          + '\n\nContinue with duplication?'
        );
        if (!proceed) return;

        relinkAfterDuplicate = await showConfirm(
          'After duplicating, do you want to create a new Planner link for the duplicate file?'
          + '\n\nOK = open class timeslot picker'
          + '\nCancel = keep duplicate unlinked'
        );
      }

      try {
        const sourceName = _conCurrentFileName || (_conCurrentFolderName ? (_conCurrentFolderName + '.js') : (boardDefaultFileName('constellation', window.conGetTitle ? window.conGetTitle() : '') + '.cstz'));
        const duplicateFilename = await conSuggestDuplicateFilename(sourceName);

        const persistedData = boardBuildPersistedSessionData('constellation', data);
        delete persistedData._plannerEntryId;

        const saved = await conSaveSessionFolderBundle(duplicateFilename, persistedData, { isManualSave: true });
        activePlannerEntryId = '';
        bpUpdateBtn();
        boardPersistLocalSession('constellation', saved.data, { source: 'manual-save', name: saved.filename });
        boardSetAutosaveFingerprint('constellation', saved.data);
        conSaveHistorySnapshot(saved.folderName, saved.filename, saved.data);

        if (typeof historyRenderList === 'function') historyRenderList();

        mdbToast('✅ Duplicated: ' + saved.filename);

        if (relinkAfterDuplicate) {
          _conPendingDuplicateRelinkRename = true;
          mdbToast('📅 Choose a class timeslot to link this duplicate file.');
          bpShowAll();
        }
      } catch (error) {
        mdbToast('⚠️ Could not duplicate file: ' + (error && error.message ? error.message : String(error)));
      }
    }

    async function conOpenCurrentFileLocationFolder() {
      if (!(window.Desktop && Desktop.isElectron())) {
        mdbToast('⚠️ Opening file locations is only available in the Desktop application.');
        return;
      }
      try {
        if (_conCurrentFileName) {
          const rel = _conCurrentFolderName ? (_conCurrentFolderName + '/' + _conCurrentFileName) : _conCurrentFileName;
          await Desktop.showInFolder('mindmaps', rel);
        } else if (_conCurrentFolderName) {
          await Desktop.showInFolder('mindmaps', _conCurrentFolderName);
        } else {
          await Desktop.showInFolder('mindmaps', '');
        }
      } catch (err) {
        console.warn('[Board] Could not show in folder:', err);
        mdbToast('⚠️ Could not open location folder: ' + (err && err.message ? err.message : String(err)));
      }
    }
    window.conOpenCurrentFileLocationFolder = conOpenCurrentFileLocationFolder;

    async function conOpenCurrentFileNative() {
      if (!(window.Desktop && Desktop.isElectron())) {
        mdbToast('⚠️ Opening files natively is only available in the Desktop application.');
        return;
      }
      try {
        if (!_conCurrentFileName && !_conCurrentFolderName) {
          const msg = typeof i18n !== 'undefined' && i18n.t ? (i18n.t('conSaveFirstToOpenFile') || 'Please save the board first to open the file.') : 'Please save the board first to open the file.';
          mdbToast('⚠️ ' + msg);
          return;
        }
        const rel = _conCurrentFolderName ? (_conCurrentFolderName + '/' + (_conCurrentFileName || 'index.html')) : _conCurrentFileName;
        const res = await Desktop.openNative('mindmaps', rel || _conCurrentFolderName);
        if (res && res.ok === false) {
          mdbToast('⚠️ Could not open file: ' + (res.error || ''));
        }
      } catch (err) {
        console.warn('[Board] Could not open file natively:', err);
        mdbToast('⚠️ Could not open file: ' + (err && err.message ? err.message : String(err)));
      }
    }
    window.conOpenCurrentFileNative = conOpenCurrentFileNative;

    function conFormatVersionDate(filename) {
      const m = String(filename).match(/\.v(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.js$/i);
      if (!m) return filename;
      const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
      const loc = typeof getLocale === 'function' ? getLocale() : ((typeof getLang === 'function' && { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' }[getLang()]) || 'fr-FR');
      return dt.toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' })
        + ' — ' + dt.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    async function conSaveHistorySnapshot(folderName, filename, data) {
      if (!(window.Desktop && Desktop.isElectron())) return;
      if (!folderName) return; // For .cstz archives without companion folders, skip loose disk snapshots
      try {
        const base = boardStripJsonExt(filename);
        const now = new Date();
        const p = n => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
        const histFilename = `${base}.v${ts}.js`;
        const content = boardBuildSessionFileContent(data, 'CONSTELLATION_SESSION_EXPORT');
        await Desktop.saveFiles('mindmaps', [{ filename: histFilename, subdir: folderName + '/history', content, encoding: 'utf8' }]);
        if (typeof Desktop.listByPath === 'function') {
          const listed = await Desktop.listByPath('mindmaps', folderName + '/history', { extensions: ['.js', '.json'], recursive: false });
          const vFiles = (listed && listed.ok && Array.isArray(listed.files)) ? listed.files : [];
          if (vFiles.length > 20) {
            const sorted = vFiles.slice().sort((a, b) => (a.mtimeMs || 0) - (b.mtimeMs || 0));
            for (const f of sorted.slice(0, sorted.length - 20)) {
              await Desktop.deleteByPath('mindmaps', f.relativePath).catch(() => { });
            }
          }
        }
      } catch (e) { /* silent — history is best-effort */ }
    }

    function conGetVersionModal() {
      let modal = document.getElementById('con-version-history-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'con-version-history-modal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;';
        modal.innerHTML = '<div style="background:#fff;border-radius:10px;max-width:520px;width:93%;max-height:78vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,.35);">'
          + '<div style="display:flex;align-items:center;padding:14px 18px;border-bottom:1px solid #e0e0e0;">'
          + '<span id="con-version-history-title" style="flex:1;font-size:.95rem;font-weight:800;"></span>'
          + '<button onclick="document.getElementById(\'con-version-history-modal\').style.display=\'none\'" style="background:none;border:none;font-size:1.1rem;cursor:pointer;padding:2px 8px;color:#666;line-height:1;">✕</button>'
          + '</div>'
          + '<div id="con-version-history-body" style="overflow-y:auto;flex:1;min-height:80px;"></div>'
          + '</div>';
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.style.display = 'none'; });
        document.body.appendChild(modal);
      }
      return modal;
    }

    async function conShowVersionHistory(entry) {
      if (!entry || entry.target !== 'mindmaps') return;
      const relPath = historyEntryRelativePath(entry);
      const folderName = relPath.includes('/') ? relPath.split('/')[0] : boardStripJsonExt(entry.filename || '');
      if (!folderName) return;

      const modal = conGetVersionModal();
      const title = document.getElementById('con-version-history-title');
      const body = document.getElementById('con-version-history-body');
      title.textContent = 'Version History — ' + (entry.baseName || entry.filename);
      body.innerHTML = '<div style="padding:24px;text-align:center;color:#888;font-size:.85rem;">Loading versions…</div>';
      modal.style.display = 'flex';

      let files = [];
      try {
        if (typeof Desktop.listByPath === 'function') {
          const r = await Desktop.listByPath('mindmaps', folderName + '/history', { extensions: ['.js', '.json'], recursive: false });
          files = (r && r.ok && Array.isArray(r.files)) ? r.files : [];
        }
      } catch (e) { }

      files.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));

      if (!files.length) {
        body.innerHTML = '<div style="padding:24px;text-align:center;color:#888;font-size:.85rem;">No saved versions yet.<br>Versions are created on every manual save.</div>';
        return;
      }

      body.innerHTML = '';
      const list = document.createElement('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:12px;';

      files.forEach(f => {
        const rp = f.relativePath || '';
        const fname = f.filename || rp.split('/').pop() || '';
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;border:1.5px solid #e0e0e0;border-radius:7px;padding:8px 12px;';

        const label = document.createElement('span');
        label.style.cssText = 'flex:1;font-size:.83rem;font-weight:600;';
        label.textContent = conFormatVersionDate(fname);

        const size = document.createElement('span');
        size.style.cssText = 'font-size:.72rem;color:#999;white-space:nowrap;flex-shrink:0;';
        size.textContent = f.size ? historyFormatSize(f.size) : '';

        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'action-btn btn-grey';
        restoreBtn.textContent = 'Restore';
        restoreBtn.onclick = async () => {
          if (!await showConfirm('Restore this version? The current board content will be replaced.')) return;
          try {
            const r = await Desktop.readByPath('mindmaps', rp);
            if (!r || !r.ok || !r.content) throw new Error('Could not read version file.');
            const data = boardParseSessionText(r.content);
            if (!data || (data._type !== 'constellation' && !String(data._type || '').endsWith('-constellation'))) {
              throw new Error('File does not look like a Constellation session.');
            }
            _conRestoreSession(data);
            boardSetSessionFileMetaFromData('constellation', data);
            setTimeout(() => {
              boardSetAutosaveFingerprint('constellation', conBuildSessionData());
              _boardIsDirty = false;
            }, 200);
            modal.style.display = 'none';
            mdbToast('✅ Version restored — save to keep the changes.');
          } catch (e) { mdbToast('⚠️ Could not restore: ' + (e && e.message ? e.message : String(e))); }
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn btn-red';
        delBtn.textContent = 'Delete';
        delBtn.onclick = async () => {
          if (!await showConfirm('Delete this version?')) return;
          try {
            await Desktop.deleteByPath('mindmaps', rp);
            row.remove();
            if (!list.children.length) {
              body.innerHTML = '<div style="padding:24px;text-align:center;color:#888;font-size:.85rem;">No saved versions.</div>';
            }
          } catch (e) { mdbToast('⚠️ Could not delete version.'); }
        };

        row.appendChild(label);
        row.appendChild(size);
        row.appendChild(restoreBtn);
        row.appendChild(delBtn);
        list.appendChild(row);
      });

      body.appendChild(list);
    }

    async function conLoadSession(event) {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;

      const isArchive = file.name.endsWith('.cstz') || file.name.endsWith('.zip');
      if (isArchive) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const parsed = await conParseBoardArchiveArrayBuffer(arrayBuffer);
          if (!parsed || !parsed.boardData) {
            mdbToast('⚠️ Could not read .cstz archive.');
            return;
          }
          const data = parsed.boardData;
          if (data._type !== 'constellation' && !String(data._type || '').endsWith('-constellation')) {
            mdbToast('⚠️ This file does not look like a Constellation save file.');
            return;
          }
          _conCurrentFileName = file.name;
          _conCurrentFolderName = null;
          data._mediaMap = parsed.media || null;
          data._thumbnails = parsed.thumbnails || null;
          if (Array.isArray(data.attachments)) {
            conSetAttachmentsFromSession(data.attachments, parsed.media);
          }
          boardSetSessionFileMetaFromData('constellation', data);
          _conRestoreSession(data);
          setActiveClassGroup(data._classGroup || '', { preserveBoardState: true });
          const _conAutoTitle = boardStripJsonExt(file.name);
          if (window.conSetTitle) window.conSetTitle(_conAutoTitle);
          const _conTitleEl = document.getElementById('con-title-input');
          if (_conTitleEl) _conTitleEl.value = _conAutoTitle;
          boardPersistLocalSession('constellation', data, {
            source: 'file-load',
            name: _conAutoTitle
          });
          setTimeout(() => {
            boardSetAutosaveFingerprint('constellation', conBuildSessionData());
            if (typeof boardSetDirty === 'function') boardSetDirty(false);
            else _boardIsDirty = false;
            if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();
          }, 200);
          return;
        } catch (err) {
          mdbToast('⚠️ Could not parse .cstz archive: ' + (err && err.message ? err.message : String(err)));
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = e => {
        let data;
        try { data = boardParseSessionText(e.target.result); }
        catch { mdbToast('⚠️ Could not read file — make sure it is a valid Constellation .js, .json, or .cstz file.'); return; }
        if (data && !data._type && (Array.isArray(data.nodes) || Array.isArray(data.pages))) {
          data._type = 'constellation';
        }
        if (data && Array.isArray(data.links) && !Array.isArray(data.edges)) {
          data.edges = data.links.map(l => ({
            id: l.id,
            a: l.a || l.from,
            b: l.b || l.to,
            type: l.type || 'none',
            label: l.label || '',
            thickness: l.thickness || 2,
            strokeType: l.strokeType || 'solid'
          }));
        }
        if (data._type !== 'constellation' && !String(data._type || '').endsWith('-constellation')) {
          mdbToast('⚠️ This file does not look like a Constellation save file.'); return;
        }
        _conCurrentFileName = file.name.endsWith('.js') ? file.name : boardStripJsonExt(file.name) + '.js';
        _conCurrentFolderName = null;
        boardSetSessionFileMetaFromData('constellation', data);
        _conRestoreSession(data);
        setActiveClassGroup(data._classGroup || '', { preserveBoardState: true });
        // Always update title from the loaded filename (override what _conRestoreSession set from data.title)
        const _conAutoTitle = boardStripJsonExt(file.name);
        if (window.conSetTitle) window.conSetTitle(_conAutoTitle);
        const _conTitleEl = document.getElementById('con-title-input');
        if (_conTitleEl) _conTitleEl.value = _conAutoTitle;
        boardPersistLocalSession('constellation', data, {
          source: 'file-load',
          name: boardStripJsonExt(file.name)
        });
        setTimeout(() => {
          boardSetAutosaveFingerprint('constellation', conBuildSessionData());
          if (typeof boardSetDirty === 'function') boardSetDirty(false);
          else _boardIsDirty = false;
          if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();
        }, 200);
      };
      reader.readAsText(file);
    }

    // ── BOARD TEMPLATES ──────────────────────────────────────────────
    function conOpenTemplatePopup() {
      const titleVal = window.conGetTitle ? window.conGetTitle() : '';
      document.getElementById('con-template-name-input').value = boardStripJsonExt(titleVal.trim());
      conRenderTemplateList();
      document.getElementById('con-template-overlay').classList.add('active');
    }

    function conCloseTemplatePopup() {
      document.getElementById('con-template-overlay').classList.remove('active');
    }

    async function conSaveTemplate() {
      const nameInput = document.getElementById('con-template-name-input');
      const name = (nameInput.value || '').trim();
      if (!name) { nameInput.focus(); return; }
      const data = conBuildSessionData();
      if (!conSessionHasContent(data)) {
        mdbToast('⚠️ Nothing to save as a template. Add at least one word first.');
        return;
      }
      const templateData = Object.assign({}, data, { _type: 'constellation-template', _templateName: name });
      const filename = name.endsWith('.js') ? name : boardStripJsonExt(name) + '.js';
      const blob = boardBuildSessionBlob(templateData, 'CONSTELLATION_TEMPLATE_EXPORT');
      if (window.Desktop && Desktop.isElectron()) {
        await Desktop.saveBlob('constellationTemplates', filename, blob);
        conRenderTemplateList();
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    }

    async function conRenderTemplateList() {
      const listEl = document.getElementById('con-template-list');
      listEl.innerHTML = '';
      if (!(window.Desktop && Desktop.isElectron())) {
        const note = document.createElement('div');
        note.className = 'session-load-empty';
        note.textContent = 'Open in Electron to browse saved templates. Use "Load from file" to load a template .js file.';
        listEl.appendChild(note);
        return;
      }
      let files = [];
      try {
        const r = await Desktop.listFiles('constellationTemplates', { extensions: ['.js', '.json'] });
        files = (r && Array.isArray(r.files)) ? r.files : [];
      } catch {
        const err = document.createElement('div');
        err.className = 'session-load-empty';
        err.textContent = 'Could not load template list.';
        listEl.appendChild(err);
        return;
      }
      if (!files.length) {
        const empty = document.createElement('div');
        empty.className = 'session-load-empty';
        empty.textContent = 'No templates saved yet. Save the current board as a template above.';
        listEl.appendChild(empty);
        return;
      }
      files.forEach(f => {
        const row = document.createElement('div');
        row.className = 'con-template-item';
        const nameEl = document.createElement('div');
        nameEl.className = 'con-template-item-name';
        nameEl.textContent = boardStripJsonExt(f.filename);
        const metaEl = document.createElement('div');
        metaEl.className = 'con-template-item-meta';
        metaEl.textContent = boardFormatWhen(f.mtimeMs);
        const loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.className = 'action-btn btn-grey';
        loadBtn.style.cssText = 'font-size:0.72rem;padding:4px 9px;white-space:nowrap;';
        loadBtn.textContent = '📂 Load';
        loadBtn.onclick = () => conLoadTemplateByFilename(f.filename);
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'con-template-del-btn';
        delBtn.title = 'Delete template';
        delBtn.textContent = '✕';
        delBtn.onclick = () => conDeleteTemplate(f.filename);
        row.appendChild(nameEl);
        row.appendChild(metaEl);
        row.appendChild(loadBtn);
        row.appendChild(delBtn);
        listEl.appendChild(row);
      });
    }

    async function conLoadTemplateByFilename(filename) {
      if (!(window.Desktop && Desktop.isElectron())) return;
      const r = await Desktop.readText('constellationTemplates', filename);
      if (!r || !r.ok) { mdbToast('⚠️ Could not read template file.'); return; }
      let data;
      try { data = boardParseSessionText(r.content); }
      catch { mdbToast('⚠️ Template file is not valid session data.'); return; }
      if (data._type !== 'constellation-template' && data._type !== 'constellation' && !String(data._type || '').endsWith('-constellation')) {
        mdbToast('⚠️ This does not look like a valid Constellation template file.'); return;
      }
      conCloseTemplatePopup();
      _conRestoreSession(data);
      boardSetAutosaveFingerprint('constellation', data);
    }

    function conLoadTemplateFromFile(event) {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        let data;
        try { data = boardParseSessionText(e.target.result); }
        catch { mdbToast('⚠️ Could not read file — make sure it is a valid template .js or .json file.'); return; }
        if (data && !data._type && (Array.isArray(data.nodes) || Array.isArray(data.pages))) {
          data._type = 'constellation';
        }
        if (data._type !== 'constellation-template' && data._type !== 'constellation' && !String(data._type || '').endsWith('-constellation')) {
          mdbToast('⚠️ This file does not look like a Constellation template or session file.'); return;
        }
        conCloseTemplatePopup();
        _conRestoreSession(data);
        boardSetAutosaveFingerprint('constellation', data);
      };
      reader.readAsText(file);
    }

    async function conDeleteTemplate(filename) {
      if (!await showConfirm('Delete template "' + boardStripJsonExt(filename) + '"?')) return;
      if (!(window.Desktop && Desktop.isElectron())) return;
      await Desktop.deleteFile('constellationTemplates', filename);
      conRenderTemplateList();
    }
    // ────────────────────────────────────────────────────────────────

    let _conLayoutRefreshRaf = null;
    function conScheduleLayoutRefresh() {
      const run = () => {
        if (typeof window.conGroupRefitAll === 'function') window.conGroupRefitAll();
        if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
      };
      run();
      if (_conLayoutRefreshRaf) cancelAnimationFrame(_conLayoutRefreshRaf);
      _conLayoutRefreshRaf = requestAnimationFrame(() => {
        _conLayoutRefreshRaf = null;
        run();
      });
      if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
        document.fonts.ready.then(() => { run(); }).catch(() => {});
      }
    }
    window.conScheduleLayoutRefresh = conScheduleLayoutRefresh;

    if (typeof ResizeObserver !== 'undefined') {
      let _conLastObservedW = 0, _conLastObservedH = 0;
      const _conSectionObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          if (cr && cr.width > 0 && cr.height > 0 && (_conLastObservedW === 0 || _conLastObservedH === 0)) {
            _conLastObservedW = cr.width;
            _conLastObservedH = cr.height;
            conScheduleLayoutRefresh();
          } else if (cr) {
            _conLastObservedW = cr.width;
            _conLastObservedH = cr.height;
          }
        }
      });
      const _attachBoardSectionObserver = () => {
        const boardSection = document.getElementById('constellation-section');
        if (boardSection) _conSectionObserver.observe(boardSection);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _attachBoardSectionObserver);
      } else {
        _attachBoardSectionObserver();
      }
    }

    function conGetBoardContentBottomFromData(data) {
      if (!data) return 0;
      let maxBottom = 0;
      (data.nodes || []).forEach(n => {
        const fs = parseFloat(n.fontSize) || 16;
        const h = fs * 2.5 + 20;
        const b = (Number(n.y) || 0) + h;
        if (b > maxBottom) maxBottom = b;
      });
      (data.notes || []).forEach(n => {
        const h = Number(n.height) || (Number(n.fontSize) || 14) * 4 + 30;
        const b = (Number(n.y) || 0) + h;
        if (b > maxBottom) maxBottom = b;
      });
      (data.media || []).forEach(m => {
        const b = (Number(m.y) || 0) + (Number(m.h) || 100);
        if (b > maxBottom) maxBottom = b;
      });
      (data.shapes || []).forEach(s => {
        const b = (Number(s.y) || 0) + (Number(s.h) || 50);
        if (b > maxBottom) maxBottom = b;
      });
      (data.drawings || []).forEach(d => {
        const b = (Number(d.y) || 0) + (Number(d.h) || 50);
        if (b > maxBottom) maxBottom = b;
      });
      return maxBottom;
    }

    // ── COMPETENCE TAGGING SYSTEM ────────────────────────────────────
    let _conCurrentCompetences = [];
    let _conAvailableCompetences = [];
    let _conLoadingCompetences = false;
    let _conCompModalTarget = { type: 'board', id: null };
    let _conCompSelectedIds = new Set();
    let _conCompSelectedObjects = new Map();
    let _conCompFilterSelectedOnly = false;
    let _conPlannerSuggestedCompetences = [];

    function conRenderHeaderCompetenceBar() {
      const bar = document.getElementById('con-header-competence-bar');
      if (!bar) return;

      const t_ = (k, fb) => (typeof t === 'function' ? t(k) : fb);
      const hasComps = _conCurrentCompetences && _conCurrentCompetences.length > 0;

      /* --- Reuse existing button + popup if already rendered, mutate in-place --- */
      let btn = bar.querySelector('.con-comp-group-btn');
      let popup = bar.querySelector('.con-comp-popup');

      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'con-comp-group-btn';
        btn.id = 'con-comp-group-toggle';
        bar.appendChild(btn);
      }

      if (!popup) {
        popup = document.createElement('div');
        popup.className = 'con-comp-popup';
        popup.id = 'con-comp-group-popup';
        bar.appendChild(popup);

        /* Close when clicking outside */
        document.addEventListener('mousedown', function _conCompPopupOutside(e) {
          if (!bar.contains(e.target)) {
            popup.classList.remove('con-comp-popup-open');
          }
        }, true);
      }

      /* --- Update toggle button label --- */
      if (hasComps) {
        btn.className = 'con-comp-group-btn';
        btn.title = t_('btnCompetenceTags', 'Competences');
        btn.innerHTML = `<img src="../assets/icons/award.svg" alt="" /><span>${t_('btnCompetenceTags', 'Competences')}</span><span class="con-comp-group-badge">${_conCurrentCompetences.length}</span>`;
      } else {
        btn.className = 'con-comp-group-btn con-comp-group-btn-empty';
        btn.title = t_('compTagsNone', 'No competence tags') + ' — Click to add';
        btn.innerHTML = `<img src="../assets/icons/award.svg" alt="" /><span>+ ${t_('btnCompetenceTags', 'Competences')}</span>`;
      }

      /* Toggle popup on click */
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!hasComps) {
          conOpenCompetenceModal('board');
          return;
        }
        popup.classList.toggle('con-comp-popup-open');
      };

      /* --- Build popup content --- */
      popup.innerHTML = '';

      /* Header */
      const hdr = document.createElement('div');
      hdr.className = 'con-comp-popup-header';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'con-comp-popup-close';
      closeBtn.type = 'button';
      closeBtn.title = 'Close';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = (e) => { e.stopPropagation(); popup.classList.remove('con-comp-popup-open'); };
      hdr.innerHTML = `<span>${t_('compPopupTitle', 'Board Competences')}</span>`;
      hdr.appendChild(closeBtn);
      popup.appendChild(hdr);

      /* List */
      const list = document.createElement('ul');
      list.className = 'con-comp-popup-list';
      if (hasComps) {
        _conCurrentCompetences.forEach(c => {
          if (!c) return;
          const code = String(c.code || c.title || c.id || '');
          const title = String(c.title || code);
          const li = document.createElement('li');
          li.className = 'con-comp-popup-item';
          li.innerHTML = `<span class="con-comp-popup-item-code">${boardEscapeHtml(code)}</span>${title && title !== code ? `<span class="con-comp-popup-item-title">${boardEscapeHtml(title)}</span>` : ''}`;
          list.appendChild(li);
        });
      }
      popup.appendChild(list);

      /* Footer */
      const footer = document.createElement('div');
      footer.className = 'con-comp-popup-footer';
      const manageBtn = document.createElement('button');
      manageBtn.type = 'button';
      manageBtn.className = 'con-comp-popup-manage-btn';
      manageBtn.textContent = t_('compPopupManage', 'Manage Tags');
      manageBtn.onclick = (e) => { e.stopPropagation(); popup.classList.remove('con-comp-popup-open'); conOpenCompetenceModal('board'); };
      footer.appendChild(manageBtn);
      popup.appendChild(footer);
    }

    function conUpdateNodeCompetenceBadge(nodeObj) {
      if (!nodeObj || !nodeObj.el) return;
      let badge = nodeObj.el.querySelector('.con-node-comp-badge');
      const compList = Array.isArray(nodeObj.competences) ? nodeObj.competences : (Array.isArray(nodeObj.competenceTags) ? nodeObj.competenceTags : []);
      if (compList.length > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'con-node-comp-badge';
          badge.onclick = (e) => {
            e.stopPropagation();
            conOpenCompetenceModal('node', nodeObj.id);
          };
          nodeObj.el.appendChild(badge);
        }
        const codes = compList.map(c => c.code || c.title || c.id).filter(Boolean);
        badge.title = (typeof t === 'function' ? t('compNodeBadgeTitle', { codes: codes.join(', ') }) : ('Competences: ' + codes.join(', ')));
        badge.innerHTML = `<img src="../assets/icons/award.svg" alt="" /> ${compList.length === 1 ? (boardEscapeHtml(codes[0]) || '1') : compList.length}`;
      } else if (badge) {
        badge.remove();
      }
    }

    function conParseCompetenceRecords(content) {
      if (!content || typeof content !== 'string') return [];
      const trimmed = content.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const obj = JSON.parse(trimmed);
          if (Array.isArray(obj)) return obj;
          if (Array.isArray(obj.competences)) return obj.competences;
          if (Array.isArray(obj.customCompetenceBank)) return obj.customCompetenceBank;
          if (Array.isArray(obj.descriptors)) return obj.descriptors;
          if (Array.isArray(obj.records)) return obj.records;
        } catch (_) {}
      }
      try {
        const fn = new Function(content + '\n;try{if(typeof customCompetenceBank!=="undefined")return customCompetenceBank;if(typeof window!=="undefined"&&window.customCompetenceBank)return window.customCompetenceBank;if(typeof customDescriptorBank!=="undefined")return customDescriptorBank;if(typeof window!=="undefined"&&window.customDescriptorBank)return window.customDescriptorBank;}catch(e){}return [];');
        const res = fn();
        if (Array.isArray(res) && res.length > 0) return res;
      } catch (_) {}
      return [];
    }

    async function conLoadAvailableCompetences(forceReload = false) {
      if (_conAvailableCompetences.length && !_conLoadingCompetences && !forceReload) {
        return _conAvailableCompetences;
      }
      _conLoadingCompetences = true;
      const compMap = new Map();

      function addOrUpdateComp(item) {
        if (!item || typeof item !== 'object') return;
        const id = String(item.id || item.code || item.title || '').trim();
        if (!id) return;
        const code = String(item.code || '').trim();
        const title = String(item.title || item.name || '').trim();
        const category = String(item.category || item.domain || item.competence || item.subject || item.strand || '').trim();
        const level = String(item.level || '').trim();
        const yearLevel = String(item.yearLevel || item.year || item.grade || '').trim();
        const description = String(item.description || item.statement || '').trim();
        const tags = Array.isArray(item.tags) ? item.tags : (item.tags ? String(item.tags).split(',').map(s => s.trim()).filter(Boolean) : []);

        if (!compMap.has(id)) {
          compMap.set(id, {
            id,
            code: code || id,
            title: title || code || id,
            category,
            level,
            yearLevel,
            description,
            tags
          });
        } else {
          const existing = compMap.get(id);
          if (!existing.code && code) existing.code = code;
          if (!existing.title && title) existing.title = title;
          if (!existing.category && category) existing.category = category;
          if (!existing.level && level) existing.level = level;
          if (!existing.yearLevel && yearLevel) existing.yearLevel = yearLevel;
          if (!existing.description && description) existing.description = description;
        }
      }

      if (window.Desktop && typeof Desktop.listFiles === 'function') {
        try {
          const res = await Desktop.listFiles('customCompetences', { extensions: ['.js', '.json'] });
          const flist = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
          for (const item of flist) {
            const fn = typeof item === 'string' ? item : (item && item.filename);
            if (!fn) continue;
            const readRes = await Desktop.readText('customCompetences', fn);
            if (readRes && readRes.ok && readRes.content) {
              conParseCompetenceRecords(readRes.content).forEach(addOrUpdateComp);
            }
          }
        } catch (_) {}

        try {
          const res = await Desktop.listFiles('customDescriptors', { extensions: ['.js', '.json'] });
          const flist = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
          for (const item of flist) {
            const fn = typeof item === 'string' ? item : (item && item.filename);
            if (!fn) continue;
            const readRes = await Desktop.readText('customDescriptors', fn);
            if (readRes && readRes.ok && readRes.content) {
              conParseCompetenceRecords(readRes.content).forEach(addOrUpdateComp);
            }
          }
        } catch (_) {}

        try {
          let r = await Desktop.readText('user', 'lesson-competences.json');
          if (!r || !r.ok) r = await Desktop.readText('user', 'lesson-descriptors.json');
          if (r && r.ok && r.content) {
            conParseCompetenceRecords(r.content).forEach(addOrUpdateComp);
          }
        } catch (_) {}
      }

      try {
        const stored = localStorage.getItem('cmt-lesson-competences') || localStorage.getItem('cmt-lesson-descriptors');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) parsed.forEach(addOrUpdateComp);
        }
      } catch (_) {}

      _conAvailableCompetences = Array.from(compMap.values());
      _conLoadingCompetences = false;
      return _conAvailableCompetences;
    }

    function conGetPlannerSuggestedCompetences() {
      if (!activePlannerEntryId || !window.PLANNER_ENTRIES_BY_CLASS) return [];
      let foundEntry = null;
      const byClass = window.PLANNER_ENTRIES_BY_CLASS;
      for (const cid of Object.keys(byClass)) {
        const list = Array.isArray(byClass[cid]) ? byClass[cid] : [];
        const hit = list.find(e => e && e.id === activePlannerEntryId);
        if (hit) { foundEntry = hit; break; }
      }
      if (!foundEntry) return [];
      if (Array.isArray(foundEntry.competences) && foundEntry.competences.length > 0) {
        return foundEntry.competences;
      }
      if (Array.isArray(foundEntry.competenceIds) && foundEntry.competenceIds.length > 0) {
        return foundEntry.competenceIds;
      }
      return [];
    }

    async function conOpenCompetenceModal(targetType = 'board', targetId = null) {
      _conCompModalTarget = { type: targetType, id: targetId };
      _conCompSelectedIds = new Set();
      _conCompSelectedObjects = new Map();
      _conCompFilterSelectedOnly = false;

      const overlay = document.getElementById('con-competence-overlay');
      const badgeEl = document.getElementById('con-comp-modal-target-badge');
      const searchInput = document.getElementById('con-comp-search-input');
      const selectedFilterBtn = document.getElementById('con-comp-filter-selected-btn');
      const suggestionBanner = document.getElementById('con-comp-planner-suggestion');
      const suggestionText = document.getElementById('con-comp-planner-suggestion-text');

      if (selectedFilterBtn) selectedFilterBtn.classList.remove('active');
      if (searchInput) searchInput.value = '';

      let initialList = [];
      if (targetType === 'node') {
        const nodes = (typeof conGetNodes === 'function' ? conGetNodes() : window.conNodes) || [];
        const node = nodes.find(n => n.id === targetId);
        const nodeLabel = (node && (node.baseWord || (node.el && node.el.textContent.trim()))) || targetId || '';
        if (badgeEl) badgeEl.textContent = (typeof t === 'function' ? t('targetConstellationNode') : 'Selected Node') + (nodeLabel ? `: "${nodeLabel}"` : '');
        initialList = (node && Array.isArray(node.competences)) ? node.competences : ((node && Array.isArray(node.competenceTags)) ? node.competenceTags : []);
      } else {
        const currentTitle = (typeof window.conGetTitle === 'function' ? window.conGetTitle() : '') || _conCurrentFileName || 'Board File';
        if (badgeEl) badgeEl.textContent = (typeof t === 'function' ? t('targetBoardFile') : 'Board File') + `: ${currentTitle}`;
        initialList = Array.isArray(_conCurrentCompetences) ? _conCurrentCompetences : [];
      }

      initialList.forEach(item => {
        if (!item) return;
        const id = String(item.id || item.code || item.title || '').trim();
        if (id) {
          _conCompSelectedIds.add(id);
          _conCompSelectedObjects.set(id, item);
        }
      });

      // Check planner suggestions
      _conPlannerSuggestedCompetences = conGetPlannerSuggestedCompetences();
      if (suggestionBanner && suggestionText) {
        if (_conPlannerSuggestedCompetences.length > 0) {
          const suggestedCodes = _conPlannerSuggestedCompetences.map(c => typeof c === 'string' ? c : (c.code || c.title || c.id)).filter(Boolean);
          suggestionText.textContent = (typeof t === 'function' ? t('suggestFromPlanner') : 'Suggest from linked Planner lesson') + ` (${suggestedCodes.join(', ')})`;
          suggestionBanner.style.display = 'flex';
        } else {
          suggestionBanner.style.display = 'none';
        }
      }

      overlay.style.display = 'flex';

      const listEl = document.getElementById('con-comp-picker-list');
      if (listEl) listEl.innerHTML = '<div style="text-align:center;color:#888;padding:20px;font-size:0.85rem;">Loading competences…</div>';

      const comps = await conLoadAvailableCompetences();

      // Populate filters
      const subjectSelect = document.getElementById('con-comp-filter-subject');
      const domainSelect = document.getElementById('con-comp-filter-domain');
      const levelSelect = document.getElementById('con-comp-filter-level');
      const yearSelect = document.getElementById('con-comp-filter-year');

      const subjects = new Set();
      const domains = new Set();
      const levels = new Set();
      const years = new Set();

      comps.forEach(c => {
        if (c.subjectId) subjects.add(c.subjectId);
        if (c.category) domains.add(c.category);
        if (c.level) levels.add(c.level);
        if (c.yearLevel) years.add(c.yearLevel);
      });

      if (subjectSelect) {
        const prev = subjectSelect.value || 'all';
        subjectSelect.innerHTML = `<option value="all">All Subjects</option>`;
        Array.from(subjects).sort().forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          subjectSelect.appendChild(opt);
        });
        subjectSelect.value = subjects.has(prev) ? prev : 'all';
      }

      if (domainSelect) {
        const prev = domainSelect.value || 'all';
        domainSelect.innerHTML = `<option value="all">${typeof t === 'function' ? t('compAllDomains') : 'All Domains'}</option>`;
        Array.from(domains).sort().forEach(d => {
          const opt = document.createElement('option');
          opt.value = d;
          opt.textContent = d;
          domainSelect.appendChild(opt);
        });
        domainSelect.value = domains.has(prev) ? prev : 'all';
      }

      if (levelSelect) {
        const prev = levelSelect.value || 'all';
        levelSelect.innerHTML = `<option value="all">${typeof t === 'function' ? t('compAllLevels') : 'All Levels'}</option>`;
        Array.from(levels).sort().forEach(l => {
          const opt = document.createElement('option');
          opt.value = l;
          opt.textContent = l;
          levelSelect.appendChild(opt);
        });
        levelSelect.value = levels.has(prev) ? prev : 'all';
      }

      if (yearSelect) {
        const prev = yearSelect.value || 'all';
        yearSelect.innerHTML = `<option value="all">${typeof t === 'function' ? t('compAllYears') : 'All Years'}</option>`;
        Array.from(years).sort().forEach(y => {
          const opt = document.createElement('option');
          opt.value = y;
          opt.textContent = y;
          yearSelect.appendChild(opt);
        });
        yearSelect.value = years.has(prev) ? prev : 'all';
      }

      // Auto-prefilter by active board class if defined
      const boardClassId = (typeof _conGetActiveClassId === 'function' ? _conGetActiveClassId() : null) || (window._conCurrentBoard && (window._conCurrentBoard.activeClassId || window._conCurrentBoard.classId)) || null;
      if (boardClassId && typeof CompetenceAggregatorService !== 'undefined') {
        CompetenceAggregatorService.getGroupMetadata(boardClassId).then(meta => {
          if (!meta) return;
          if (meta.subject && subjectSelect) {
            const targetSubj = String(meta.subject).toLowerCase().trim();
            for (let i = 0; i < subjectSelect.options.length; i++) {
              const v = subjectSelect.options[i].value.toLowerCase().trim();
              const txt = subjectSelect.options[i].textContent.toLowerCase().trim();
              if (v !== 'all' && v !== '' && (v === targetSubj || txt === targetSubj || (v.length > 2 && targetSubj.includes(v)) || (targetSubj.length > 2 && v.includes(targetSubj)))) {
                subjectSelect.selectedIndex = i;
                break;
              }
            }
          }
          const rawLvl = meta.level || meta.yearLevel || meta.year || '';
          if (rawLvl) {
            const targetLvl = String(rawLvl).toLowerCase().trim();
            let matchedYear = false;
            // 1. Try exact match on yearSelect
            if (yearSelect) {
              for (let i = 0; i < yearSelect.options.length; i++) {
                const v = yearSelect.options[i].value.toLowerCase().trim();
                const txt = yearSelect.options[i].textContent.toLowerCase().trim();
                if (v !== 'all' && v !== '' && (v === targetLvl || txt === targetLvl)) {
                  yearSelect.selectedIndex = i;
                  matchedYear = true;
                  break;
                }
              }
              // Normalized token match (e.g. "4" matching "4ème", "4e", "Grade 4")
              if (!matchedYear) {
                const numMatch = targetLvl.match(/\b([1-6])\b/);
                const targetNum = numMatch ? numMatch[1] : null;
                for (let i = 0; i < yearSelect.options.length; i++) {
                  const v = yearSelect.options[i].value.toLowerCase().trim();
                  const txt = yearSelect.options[i].textContent.toLowerCase().trim();
                  if (v !== 'all' && v !== '') {
                    if (targetNum && (new RegExp('\\b' + targetNum + '([eè]me?|e|th)?\\b', 'i').test(v) || new RegExp('\\b' + targetNum + '([eè]me?|e|th)?\\b', 'i').test(txt))) {
                      yearSelect.selectedIndex = i;
                      matchedYear = true;
                      break;
                    }
                  }
                }
              }
            }
            // 2. Try match on levelSelect (CEFR / grade levels)
            if (levelSelect) {
              for (let i = 0; i < levelSelect.options.length; i++) {
                const v = levelSelect.options[i].value.toLowerCase().trim();
                const txt = levelSelect.options[i].textContent.toLowerCase().trim();
                if (v !== 'all' && v !== '' && (v === targetLvl || txt === targetLvl || (targetLvl.length >= 2 && (v.includes(targetLvl) || targetLvl.includes(v))))) {
                  levelSelect.selectedIndex = i;
                  break;
                }
              }
            }
          }
          conFilterCompetencePicker();
        }).catch(() => {});
      }

      conFilterCompetencePicker();
    }

    function conCloseCompetenceModal() {
      const overlay = document.getElementById('con-competence-overlay');
      if (overlay) overlay.style.display = 'none';
      _conCompModalTarget = { type: 'board', id: null };
    }

    function conToggleCompFilterSelected(btn) {
      _conCompFilterSelectedOnly = !_conCompFilterSelectedOnly;
      if (btn) btn.classList.toggle('active', _conCompFilterSelectedOnly);
      conFilterCompetencePicker();
    }

    function conFilterCompetencePicker() {
      const searchVal = (document.getElementById('con-comp-search-input')?.value || '').trim().toLowerCase();
      const subjectVal = document.getElementById('con-comp-filter-subject')?.value || 'all';
      const domainVal = document.getElementById('con-comp-filter-domain')?.value || 'all';
      const levelVal = document.getElementById('con-comp-filter-level')?.value || 'all';
      const yearVal = document.getElementById('con-comp-filter-year')?.value || 'all';
      const listEl = document.getElementById('con-comp-picker-list');
      const countEl = document.getElementById('con-comp-picker-count');

      if (!listEl) return;

      const filtered = _conAvailableCompetences.filter(c => {
        const id = String(c.id || c.code || c.title || '');
        if (_conCompFilterSelectedOnly && !_conCompSelectedIds.has(id)) return false;
        if (subjectVal !== 'all') {
          const cSubj = (c.subjectId || c.category || '').toLowerCase();
          if (!cSubj.includes(subjectVal.toLowerCase())) return false;
        }
        if (domainVal !== 'all' && c.category !== domainVal) return false;
        if (levelVal !== 'all' && c.level !== levelVal) return false;
        if (yearVal !== 'all' && c.yearLevel !== yearVal) return false;
        if (searchVal) {
          const matchCode = (c.code || '').toLowerCase().includes(searchVal);
          const matchTitle = (c.title || '').toLowerCase().includes(searchVal);
          const matchCat = (c.category || '').toLowerCase().includes(searchVal);
          const matchDesc = (c.description || '').toLowerCase().includes(searchVal);
          if (!matchCode && !matchTitle && !matchCat && !matchDesc) return false;
        }
        return true;
      });

      listEl.innerHTML = '';
      if (!filtered.length) {
        listEl.innerHTML = '<div style="text-align:center;color:#888;padding:24px;font-size:0.85rem;">No competences found matching filters.</div>';
      } else {
        filtered.forEach(c => {
          const id = String(c.id || c.code || c.title || '');
          const isSelected = _conCompSelectedIds.has(id);

          const row = document.createElement('div');
          row.className = 'con-comp-picker-item' + (isSelected ? ' selected' : '');
          row.dataset.compId = id;

          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.checked = isSelected;
          chk.style.cursor = 'pointer';
          chk.style.marginTop = '3px';
          chk.onclick = (e) => {
            e.stopPropagation();
            conToggleCompSelection(c, chk.checked);
          };

          const body = document.createElement('div');
          body.style.display = 'flex';
          body.style.flexDirection = 'column';
          body.style.gap = '3px';
          body.style.flex = '1';
          body.style.minWidth = '0';

          const topRow = document.createElement('div');
          topRow.style.display = 'flex';
          topRow.style.alignItems = 'center';
          topRow.style.gap = '6px';
          topRow.style.flexWrap = 'wrap';

          const codeBadge = document.createElement('span');
          codeBadge.className = 'con-comp-badge-code';
          codeBadge.textContent = c.code || c.title;
          topRow.appendChild(codeBadge);

          const titleSpan = document.createElement('span');
          titleSpan.style.fontWeight = '700';
          titleSpan.style.fontSize = '0.85rem';
          titleSpan.style.color = '#111';
          titleSpan.textContent = c.title;
          topRow.appendChild(titleSpan);

          if (c.category) {
            const catChip = document.createElement('span');
            catChip.className = 'con-comp-tag-chip';
            catChip.textContent = c.category;
            topRow.appendChild(catChip);
          }
          if (c.level) {
            const lvlChip = document.createElement('span');
            lvlChip.className = 'con-comp-tag-chip';
            lvlChip.style.background = '#fef3c7';
            lvlChip.style.color = '#92400e';
            lvlChip.style.borderColor = '#fde68a';
            lvlChip.textContent = c.level;
            topRow.appendChild(lvlChip);
          }
          if (c.yearLevel) {
            const yrChip = document.createElement('span');
            yrChip.className = 'con-comp-tag-chip';
            yrChip.textContent = 'Yr ' + c.yearLevel;
            topRow.appendChild(yrChip);
          }

          body.appendChild(topRow);

          if (c.description) {
            const desc = document.createElement('div');
            desc.style.fontSize = '0.75rem';
            desc.style.color = '#64748b';
            desc.style.lineHeight = '1.3';
            desc.textContent = c.description;
            body.appendChild(desc);
          }

          row.appendChild(chk);
          row.appendChild(body);

          row.onclick = () => {
            const nextState = !_conCompSelectedIds.has(id);
            chk.checked = nextState;
            conToggleCompSelection(c, nextState);
          };

          listEl.appendChild(row);
        });
      }

      if (countEl) {
        const count = _conCompSelectedIds.size;
        countEl.textContent = typeof t === 'function' ? t('compCountSelected', { count }) : `${count} selected`;
      }
    }

    function conToggleCompSelection(comp, forceState, skipPrompt = false) {
      if (!comp) return;
      const id = String(comp.id || comp.code || comp.title || '').trim();
      if (!id) return;
      const shouldSelect = typeof forceState === 'boolean' ? forceState : !_conCompSelectedIds.has(id);
      if (shouldSelect) {
        _conCompSelectedIds.add(id);
        _conCompSelectedObjects.set(id, comp);

        if (!skipPrompt && typeof CompetenceAggregatorService !== 'undefined' && typeof CompetenceAggregatorService.promptAddLinkedCompetences === 'function') {
          CompetenceAggregatorService.promptAddLinkedCompetences(comp, _conCompSelectedIds, {
            onAdd: (linkedToAdd) => {
              linkedToAdd.forEach(lc => {
                conToggleCompSelection(lc, true, true);
              });
            }
          });
        }
      } else {
        _conCompSelectedIds.delete(id);
        _conCompSelectedObjects.delete(id);
      }

      const row = document.querySelector(`.con-comp-picker-item[data-comp-id="${id}"]`);
      if (row) {
        row.classList.toggle('selected', shouldSelect);
        const chk = row.querySelector('input[type="checkbox"]');
        if (chk) chk.checked = shouldSelect;
      }

      const countEl = document.getElementById('con-comp-picker-count');
      if (countEl) {
        const count = _conCompSelectedIds.size;
        countEl.textContent = typeof t === 'function' ? t('compCountSelected', { count }) : `${count} selected`;
      }
    }

    function conSelectAllVisibleCompetences(select) {
      const rows = document.querySelectorAll('.con-comp-picker-item');
      rows.forEach(r => {
        const id = r.dataset.compId;
        const comp = _conAvailableCompetences.find(c => String(c.id || c.code || c.title || '') === id);
        if (comp) conToggleCompSelection(comp, select);
      });
    }

    function conApplyPlannerSuggestedCompetences() {
      if (!_conPlannerSuggestedCompetences || !_conPlannerSuggestedCompetences.length) return;
      _conPlannerSuggestedCompetences.forEach(sug => {
        const sugCode = typeof sug === 'string' ? sug : (sug.code || sug.title || sug.id);
        const hit = _conAvailableCompetences.find(c =>
          String(c.id || '').toLowerCase() === String(sugCode).toLowerCase() ||
          String(c.code || '').toLowerCase() === String(sugCode).toLowerCase() ||
          String(c.title || '').toLowerCase() === String(sugCode).toLowerCase()
        );
        if (hit) {
          conToggleCompSelection(hit, true);
        } else if (typeof sug === 'object' && sug) {
          const id = String(sug.id || sug.code || sug.title || '');
          if (id) {
            _conCompSelectedIds.add(id);
            _conCompSelectedObjects.set(id, sug);
          }
        }
      });
      conFilterCompetencePicker();
    }

    function conApplySelectedCompetences() {
      const selectedList = Array.from(_conCompSelectedObjects.values());
      const targetType = _conCompModalTarget.type;
      const targetId = _conCompModalTarget.id;

      if (targetType === 'node') {
        const nodes = (typeof conGetNodes === 'function' ? conGetNodes() : window.conNodes) || [];
        const node = nodes.find(n => n.id === targetId);
        if (node) {
          node.competences = selectedList;
          conUpdateNodeCompetenceBadge(node);
          if (typeof window.boardSetDirty === 'function') boardSetDirty(true);
          else if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
          mdbToast(typeof t === 'function' ? t('compNodeBadgeTitle', { codes: selectedList.map(c => c.code || c.title).join(', ') }) : 'Competence tags applied to node.');
        }
      } else {
        _conCurrentCompetences = selectedList;
        conRenderHeaderCompetenceBar();
        if (typeof window.boardSetDirty === 'function') boardSetDirty(true);
        else if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        mdbToast(typeof t === 'function' ? t('compAttachedToBoard', { codes: selectedList.map(c => c.code || c.title).join(', ') }) : 'Competence tags attached to board file.');
      }

      conCloseCompetenceModal();
    }

    function conCtxOpenCompetenceModal() {
      const nodeId = (typeof conGetCtxNodeId === 'function' ? conGetCtxNodeId() : null) || (window.conSelected ? window.conSelected : null);
      if (typeof conCtxClose === 'function') conCtxClose();
      if (nodeId) {
        conOpenCompetenceModal('node', nodeId);
      } else {
        conOpenCompetenceModal('board');
      }
    }

    function _conRestoreSession(data) {
      _conIsRestoringSession = true;
      if (data && Array.isArray(data.links) && !Array.isArray(data.edges)) {
        data.edges = data.links.map(l => ({
          id: l.id,
          a: l.a || l.from,
          b: l.b || l.to,
          type: l.type || 'none',
          label: l.label || '',
          thickness: l.thickness || 2,
          strokeType: l.strokeType || 'solid'
        }));
      }
      try {
        const isPageRestore = !!data._isPageRestore;
        const isMirrorSync = !!data._isMirrorSync;
        const isUndoRedo = !!data._isUndoRedo;
        if (!isPageRestore) {
          if (typeof _conClearPageDomCache === 'function') _conClearPageDomCache();
          _conUndoStack = []; _conRedoStack = [];
          if (window._conPdfDocCache) {
            window._conPdfDocCache.forEach(doc => {
              if (doc && typeof doc.destroy === 'function') {
                try { doc.destroy(); } catch (_) { }
              }
            });
            window._conPdfDocCache.clear();
          }
          if (window._conAttachmentBufferCache) window._conAttachmentBufferCache.clear();
          if (typeof _mirrorSentAttachmentKeys !== 'undefined' && _mirrorSentAttachmentKeys.clear) {
            _mirrorSentAttachmentKeys.clear();
          }
          if (typeof _attachmentDataUrlCache !== 'undefined' && _attachmentDataUrlCache.clear) {
            _attachmentDataUrlCache.clear();
          }
        }
        if (!isPageRestore) {
          _conCurrentCompetences = Array.isArray(data.competences)
            ? data.competences.slice()
            : (Array.isArray(data.competenceTags) ? data.competenceTags.slice() : []);
          if (typeof conRenderHeaderCompetenceBar === 'function') conRenderHeaderCompetenceBar();

          const mediaMap = (data && (data._mediaMap || data.mediaMap || data.media)) || null;
          conSetAttachmentsFromSession((data && data.attachments) || [], mediaMap);
          _conPageSnapshotPngs = [];
          const thumbMap = (data && (data._thumbnails || data.thumbnails)) || null;
          const totalP = (Array.isArray(data.pages) && data.pages.length > 0) ? data.pages.length : 1;
          for (let i = 0; i < totalP; i++) {
            const padded = String(i + 1).padStart(3, '0');
            let val = null;
            if (thumbMap && typeof thumbMap === 'object') {
              val = thumbMap['page-snapshots/page-' + padded + '.webp']
                || thumbMap['page-snapshots/page-' + padded + '.png']
                || thumbMap['page-' + padded + '.webp']
                || thumbMap['page-' + padded + '.png']
                || (i === 0 ? (thumbMap['thumbnail.webp'] || thumbMap['thumbnail.png'] || thumbMap['thumbnails/page-001.webp'] || thumbMap['thumbnails/page-001.png']) : null);
            }
            if (!val && typeof conBuildPageThumbnailDataUrl === 'function') {
              const pData = (Array.isArray(data.pages) && data.pages[i]) || (i === 0 ? data : null);
              if (pData) {
                try {
                  val = conBuildPageThumbnailDataUrl(pData, 480, 320);
                } catch (_) {}
              }
            }
            _conPageSnapshotPngs[i] = val || null;
          }
        }

        // ---- Multi-page format detection ----
        if (!isPageRestore) {
          if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
            const restoreIdx = Math.max(0, Math.min(Number(data.currentPage) || 0, data.pages.length - 1));
            conPageSnapshots = data.pages.map(p => p ? {
              nodes: p.nodes || [],
              edges: p.edges || [],
              groups: p.groups || [],
              masks: p.masks || [],
              notes: p.notes || [],
              drawings: p.drawings || [],
              shapes: p.shapes || [],
              tables: p.tables || [],
              media: p.media || [],
              backgroundPdf: p.backgroundPdf || null,
              boardBg: p.boardBg || null,
              boardBgColor: p.boardBgColor || p.boardBackgroundColor || p.backgroundColor || null,
              boardBackgroundColor: p.boardBgColor || p.boardBackgroundColor || p.backgroundColor || null,
              boardStickers: p.boardStickers || [],
              boardHeight: (p && p.boardHeight) || null
            } : {});
            conCurrentPageIndex = restoreIdx;
            const pageData = conPageSnapshots[restoreIdx];
            // Flatten the current page into a single-page data object for the restore below
            data = {
              _type: data._type || 'constellation',
              dateCreated: data.dateCreated,
              title: data.title || '',
              boardHeight: pageData.boardHeight || null,
              nodes: pageData.nodes,
              edges: pageData.edges,
              groups: pageData.groups,
              masks: pageData.masks,
              notes: pageData.notes,
              drawings: pageData.drawings,
              shapes: pageData.shapes,
              tables: pageData.tables || [],
              media: pageData.media || [],
              backgroundPdf: pageData.backgroundPdf || null,
              boardBg: pageData.boardBg || null,
              boardBgColor: pageData.boardBgColor || pageData.boardBackgroundColor || pageData.backgroundColor || null,
              boardBackgroundColor: pageData.boardBgColor || pageData.boardBackgroundColor || pageData.backgroundColor || null,
              boardStickers: pageData.boardStickers || []
            };
          } else {
            // Single-page format — reset to one page
            const singleSnap = conBuildEmptyPageSnapshot();
            if (data && data.boardHeight) singleSnap.boardHeight = data.boardHeight;
            conPageSnapshots = [singleSnap];
            conCurrentPageIndex = 0;
          }

          // Build PNG previews on startup/restore for all pages that don't have one
          if (!Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs = [];
          for (let i = 0; i < conPageSnapshots.length; i++) {
            if (!_conPageSnapshotPngs[i] && conPageSnapshots[i]) {
              if (typeof conBuildPageThumbnailDataUrl === 'function') {
                const url = conBuildPageThumbnailDataUrl(conPageSnapshots[i]);
                if (url) _conPageSnapshotPngs[i] = url;
              }
            }
          }
        }

        const resolvedCreatedAt = Number(data._createdAt || data.createdAt)
          || (data.dateCreated ? Date.parse(String(data.dateCreated).replace(/_\d+$/, '')) : 0)
          || 0;
        data.dateCreated = boardNormalizeDateCreated('constellation', data.dateCreated || (resolvedCreatedAt ? resolvedCreatedAt : ''));
        if (resolvedCreatedAt) {
          data._createdAt = resolvedCreatedAt;
          boardSetSessionFileMeta('constellation', resolvedCreatedAt, Number(data._savedAt || data.savedAt) || 0);
        }

        if (isMirrorSync || isUndoRedo) {
          window._conSuppressMirrorObserver = true;
          // ── Non-destructive in-place reconciliation for Mirror Presentation Mode & Undo/Redo ──
          const brd = conGetBoard();
          if (brd) {
            if (data && data.boardHeight && Number(data.boardHeight) > 0) {
              brd.style.height = data.boardHeight + 'px';
            } else if (window._bcBoardLayoutConfig && window._bcBoardLayoutConfig.dims && window._bcBoardLayoutConfig.dims.h) {
              brd.style.height = window._bcBoardLayoutConfig.dims.h + 'px';
            } else {
              brd.style.height = '';
            }
          }
          if (!isMirrorSync) {
            const curPIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
            if (typeof conPageSnapshots !== 'undefined' && conPageSnapshots[curPIdx]) {
              conPageSnapshots[curPIdx].boardHeight = (data && data.boardHeight && Number(data.boardHeight) > 0) ? Number(data.boardHeight) : null;
            }
          }

          // Advance numeric IDs past snapshot and all pages so subsequent additions don't collide
          const pagesToScan = [data];
          if (Array.isArray(data.pages)) pagesToScan.push(...data.pages);
          if (typeof conPageSnapshots !== 'undefined' && Array.isArray(conPageSnapshots)) pagesToScan.push(...conPageSnapshots);
          let allNumericIds = [];
          pagesToScan.forEach(p => {
            if (!p) return;
            const masks = Array.isArray(p.masks) ? p.masks : (Array.isArray(p.conMasks) ? p.conMasks : []);
            allNumericIds = allNumericIds
              .concat((p.nodes || []).map(n => n && n.id))
              .concat((p.edges || []).map(e => e && [e.id, e.a, e.b]).flat())
              .concat((p.groups || []).map(g => g && g.id))
              .concat(masks.map(m => m && m.id))
              .concat((p.drawings || []).map(d => d && d.id))
              .concat((p.shapes || []).map(s => s && s.id))
              .concat((p.tables || []).map(t => t && t.id));
          });
          let maxNum = 0;
          allNumericIds.forEach(id => {
            if (!id) return;
            const m = String(id).match(/\d+$/);
            if (m) maxNum = Math.max(maxNum, parseInt(m[0], 10));
          });
          if (window.conSetNextId) window.conSetNextId(maxNum + 2);
          if (typeof window.conSyncGroupNextId === 'function') window.conSyncGroupNextId(maxNum + 2);

          let maxNoteNum = -1;
          pagesToScan.forEach(p => {
            if (!p) return;
            (p.notes || []).forEach(n => {
              if (n && n.id) {
                const m = String(n.id).match(/^cnn(\d+)$/);
                if (m) {
                  const val = parseInt(m[1], 10);
                  if (!isNaN(val) && val > maxNoteNum) maxNoteNum = val;
                }
              }
            });
          });
          if (maxNoteNum >= 0) {
            if (typeof window.conSyncNoteNextId === 'function') window.conSyncNoteNextId(maxNoteNum + 1);
            else if (typeof conNoteNextId !== 'undefined') conNoteNextId = Math.max(conNoteNextId, maxNoteNum + 1);
          }

          const existingNodes = conGetNodes();
          const existingNodeMap = new Map(existingNodes.map(n => [n.id, n]));
          const keepNodeIds = new Set();
          const nextNodes = [];

          (data.nodes || []).forEach(n => {
            keepNodeIds.add(n.id);
            const existing = existingNodeMap.get(n.id);
            if (existing && existing.el) {
              existing.x = n.x;
              existing.y = n.y;
              existing.baseX = n.x;
              existing.baseY = n.y;
              if (typeof n.w === 'number' && n.w > 0) existing.w = n.w;
              if (typeof n.h === 'number' && n.h > 0) existing.h = n.h;
              if (typeof n._cachedW === 'number' && n._cachedW > 0) existing._cachedW = n._cachedW;
              if (typeof n._cachedH === 'number' && n._cachedH > 0) existing._cachedH = n._cachedH;
              existing.el.style.left = n.x + 'px';
              existing.el.style.top = n.y + 'px';
              if (n.bg) existing.el.style.background = n.bg;
              if (n.color) existing.el.style.color = n.color;
              if (n.border) existing.el.style.borderColor = n.border;
              if (n.fontFamily) existing.el.style.fontFamily = n.fontFamily;
              conApplyTextStrokeStyle(existing.el, n.textStrokeWidth, n.textStrokeColor);

              existing.dbWord = n.dbWord || null;
              existing.baseWord = n.baseWord || '';
            existing.sourceWord = n.sourceWord || null;
            existing.relation = n.relation || null;
            existing.fmt = n.fmt || {};
            existing.locked = !!n.locked;
            existing.pageNum = n.pageNum != null ? n.pageNum : null;
            existing.phraseOrder = n.phraseOrder != null ? n.phraseOrder : null;
            existing.emoji = n.emoji || null;
            existing.isTimer = !!n.isTimer;
            existing.durationSec = n.durationSec || null;
            existing.remainingSec = n.remainingSec != null ? n.remainingSec : null;
            existing.timerState = n.timerState || 'idle';
            existing.timerTarget = (n.timerTarget === 'cms' || n.timerTarget === 'board') ? n.timerTarget : null;
            if (existing.isTimer && existing.timerState === 'running') {
              existing.timerEndTime = Date.now() + (existing.remainingSec || existing.durationSec || 60) * 1000;
            }
            existing.isRandom = !!n.isRandom;
            if (existing.isRandom) {
              existing.randomMin = (n.randomMin != null) ? n.randomMin : 1;
              existing.randomMax = (n.randomMax != null) ? n.randomMax : 100;
              existing.randomValue = (n.randomValue != null) ? n.randomValue : existing.randomMin;
            }
            existing.isSound = !!n.isSound;
            existing.soundAttachmentId = n.soundAttachmentId || null;
            existing.soundName = n.soundName || null;
            existing.soundDuration = (typeof n.soundDuration === 'number') ? n.soundDuration : null;
            existing.isVideo = !!n.isVideo;
            existing.videoAttachmentId = n.videoAttachmentId || null;
            existing.videoName = n.videoName || null;
            existing.videoDuration = (typeof n.videoDuration === 'number') ? n.videoDuration : null;
            existing.shape = (window.conNormalizeNodeShape ? window.conNormalizeNodeShape(n.shape || 'rectangle') : conNormalizeNodeShapeSafe(n.shape || 'rectangle'));
            existing.borderWidth = n.borderWidth || null;
            existing.borderStyle = n.borderStyle || null;
            existing.highlight = n.highlight || null;
            existing.preset = n.preset || null;
            existing.fontFamily = n.fontFamily || null;
            existing.fontSize = n.fontSize || '16px';
            existing.textStrokeColor = n.textStrokeColor || null;
            existing.textStrokeWidth = n.textStrokeWidth || null;
            existing.competences = Array.isArray(n.competences) ? n.competences.slice() : (Array.isArray(n.competenceTags) ? n.competenceTags.slice() : []);
            if (typeof conUpdateNodeCompetenceBadge === 'function') conUpdateNodeCompetenceBadge(existing);

            window.conRenderNodeLabel(existing);
            if (window.conSetNodeBaseFontSize) window.conSetNodeBaseFontSize(existing, n.fontSize || '16px');
            conApplyNodeShape(existing, existing.shape);
            if (existing.el && existing.el.offsetWidth > 0) {
              existing._cachedW = existing.el.offsetWidth;
              existing._cachedH = existing.el.offsetHeight;
            }
            existing.rotation = (typeof n.rotation === 'number') ? ((typeof window.conNormalizeNodeRotation === 'function') ? window.conNormalizeNodeRotation(n.rotation) : n.rotation) : 0;
            if (typeof conApplyNodeRotation === 'function') conApplyNodeRotation(existing, existing.rotation);
            existing.el.dataset.baseWord = n.baseWord || '';
            if (existing.emoji && window.conEmojiRestoreNodeDotAndBadge) window.conEmojiRestoreNodeDotAndBadge(existing);
            if (n.masked) {
              existing.masked = true;
              existing.el.classList.add('con-masked');
            } else {
              existing.masked = false;
              existing.el.classList.remove('con-masked');
            }
            if (window.conSyncNodeLockState) window.conSyncNodeLockState(existing);
            nextNodes.push(existing);
          } else {
            const dbMatch = (typeof vocabBank !== 'undefined')
              ? vocabBank.find(i => i.word.toLowerCase() === (n.dbWord || n.baseWord || '').toLowerCase())
              : null;
            const el = document.createElement('div');
            el.className = 'con-node' + (dbMatch ? ' con-node-matched' : '');
            el.id = n.id;
            el.style.left = n.x + 'px';
            el.style.top = n.y + 'px';
            if (n.bg) el.style.background = n.bg;
            if (n.color) el.style.color = n.color;
            if (n.border) el.style.borderColor = n.border;
            if (n.fontFamily) el.style.fontFamily = n.fontFamily;
            conApplyTextStrokeStyle(el, n.textStrokeWidth, n.textStrokeColor);
            brd.appendChild(el);
            const nodeObj = {
              id: n.id, el, x: n.x, y: n.y, baseX: n.x, baseY: n.y,
              w: (typeof n.w === 'number' && n.w > 0) ? n.w : undefined,
              h: (typeof n.h === 'number' && n.h > 0) ? n.h : undefined,
              _cachedW: (typeof n._cachedW === 'number' && n._cachedW > 0) ? n._cachedW : ((typeof n.w === 'number' && n.w > 0) ? n.w : undefined),
              _cachedH: (typeof n._cachedH === 'number' && n._cachedH > 0) ? n._cachedH : ((typeof n.h === 'number' && n.h > 0) ? n.h : undefined),
              dbWord: n.dbWord || null,
              baseWord: n.baseWord || '',
              sourceWord: n.sourceWord || null,
              relation: n.relation || null,
              fmt: n.fmt || {},
              locked: !!n.locked,
              pageNum: n.pageNum != null ? n.pageNum : null,
              phraseOrder: n.phraseOrder != null ? n.phraseOrder : null,
              emoji: n.emoji || null,
              isTimer: !!n.isTimer,
              durationSec: n.durationSec || null,
              remainingSec: n.remainingSec != null ? n.remainingSec : null,
              timerState: n.timerState || 'idle',
              timerTarget: (n.timerTarget === 'cms' || n.timerTarget === 'board') ? n.timerTarget : null,
              isRandom: !!n.isRandom,
              randomMin: n.isRandom ? (n.randomMin != null ? n.randomMin : 1) : null,
              randomMax: n.isRandom ? (n.randomMax != null ? n.randomMax : 100) : null,
              randomValue: n.isRandom ? (n.randomValue != null ? n.randomValue : (n.randomMin != null ? n.randomMin : 1)) : null,
              isSound: !!n.isSound,
              soundAttachmentId: n.soundAttachmentId || null,
              soundName: n.soundName || null,
              soundDuration: (typeof n.soundDuration === 'number') ? n.soundDuration : null,
              isVideo: !!n.isVideo,
              videoAttachmentId: n.videoAttachmentId || null,
              videoName: n.videoName || null,
              videoDuration: (typeof n.videoDuration === 'number') ? n.videoDuration : null,
              shape: (window.conNormalizeNodeShape ? window.conNormalizeNodeShape(n.shape || 'rectangle') : conNormalizeNodeShapeSafe(n.shape || 'rectangle')),
              borderWidth: n.borderWidth || null,
              borderStyle: n.borderStyle || null,
              highlight: n.highlight || null,
              preset: n.preset || null,
              fontFamily: n.fontFamily || null,
              fontSize: n.fontSize || '16px',
              textStrokeColor: n.textStrokeColor || null,
              textStrokeWidth: n.textStrokeWidth || null,
              competences: Array.isArray(n.competences) ? n.competences.slice() : (Array.isArray(n.competenceTags) ? n.competenceTags.slice() : [])
            };
            if (nodeObj.isTimer && nodeObj.timerState === 'running') {
              nodeObj.timerEndTime = Date.now() + (nodeObj.remainingSec || nodeObj.durationSec || 60) * 1000;
            }
            nextNodes.push(nodeObj);
            if (typeof window.conAttachNode === 'function') {
              window.conAttachNode(n.id, el);
            } else if (typeof window.conAttachNodeEvents === 'function') {
              window.conAttachNodeEvents(n.id, el);
            }
            window.conRenderNodeLabel(nodeObj);
            if (window.conSetNodeBaseFontSize) window.conSetNodeBaseFontSize(nodeObj, n.fontSize || '16px');
            conApplyNodeShape(nodeObj, nodeObj.shape);
            if (el.offsetWidth > 0) {
              nodeObj._cachedW = el.offsetWidth;
              nodeObj._cachedH = el.offsetHeight;
            }
            nodeObj.rotation = (typeof n.rotation === 'number') ? ((typeof window.conNormalizeNodeRotation === 'function') ? window.conNormalizeNodeRotation(n.rotation) : n.rotation) : 0;
            if (typeof conApplyNodeRotation === 'function') conApplyNodeRotation(nodeObj, nodeObj.rotation);
            el.dataset.baseWord = n.baseWord || '';
            if (nodeObj.emoji && window.conEmojiRestoreNodeDotAndBadge) window.conEmojiRestoreNodeDotAndBadge(nodeObj);
            if (window.conAddNodeStarBtn) window.conAddNodeStarBtn(nodeObj);
            if (n.masked) {
              nodeObj.masked = true;
              el.classList.add('con-masked');
            }
            if (window.conSyncNodeLockState) window.conSyncNodeLockState(nodeObj);
            if (typeof conUpdateNodeCompetenceBadge === 'function') conUpdateNodeCompetenceBadge(nodeObj);
          }
        });

        // Remove only deleted nodes
        existingNodeMap.forEach((node, id) => {
          if (!keepNodeIds.has(id)) {
            if (node && node.el) node.el.remove();
          }
        });
        existingNodes.length = 0;
        existingNodes.push(...nextNodes);

        // Word notes reconciliation
        const _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
        const existingNotesMap = new Map(_liveNotes.map(n => [String(n.id), n]));
        const keepNoteIds = new Set();
        const nextNotes = [];

        (data.notes || []).forEach(n => {
          const nid = String(n.id);
          keepNoteIds.add(nid);
          const numMatch = nid.match(/^cnn(\d+)$/);
          if (numMatch) {
            const num = parseInt(numMatch[1], 10);
            if (!isNaN(num)) {
              if (typeof window.conSyncNoteNextId === 'function') window.conSyncNoteNextId(num + 1);
              else if (typeof conNoteNextId !== 'undefined') conNoteNextId = Math.max(conNoteNextId, num + 1);
            }
          }
          const existing = existingNotesMap.get(nid);
          const noteEl = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nid) : document.querySelector('.con-word-note[data-id="' + nid + '"]');

          if (existing && noteEl) {
            Object.assign(existing, {
              x: n.x, y: n.y,
              text: n.text, html: n.html || '',
              color: n.color, bg: n.bg,
              fontSize: n.fontSize,
              fontFamily: n.fontFamily || null,
              bold: !!n.bold, italic: !!n.italic, underline: !!n.underline,
              strike: !!n.strike, hidden: !!n.hidden, locked: !!n.locked,
              manualSize: !!n.manualSize,
              width: typeof n.width === 'number' ? n.width : (typeof n.liveBaseWidth === 'number' ? n.liveBaseWidth : (typeof n.w === 'number' ? n.w : null)),
              height: typeof n.height === 'number' ? n.height : (typeof n.liveBaseHeight === 'number' ? n.liveBaseHeight : (typeof n.h === 'number' ? n.h : null)),
              liveBaseWidth: n.liveBaseWidth != null ? n.liveBaseWidth : (typeof n.width === 'number' ? n.width : (typeof n.w === 'number' ? n.w : null)),
              liveBaseHeight: n.liveBaseHeight != null ? n.liveBaseHeight : (typeof n.height === 'number' ? n.height : (typeof n.h === 'number' ? n.h : null)),
              w: n.w != null ? n.w : (n.liveBaseWidth != null ? n.liveBaseWidth : n.width),
              h: n.h != null ? n.h : (n.liveBaseHeight != null ? n.liveBaseHeight : n.height),
              _cachedW: n._cachedW != null ? n._cachedW : (n.liveBaseWidth != null ? n.liveBaseWidth : (n.width != null ? n.width : n.w)),
              _cachedH: n._cachedH != null ? n._cachedH : (n.liveBaseHeight != null ? n.liveBaseHeight : (n.height != null ? n.height : n.h)),
              borderWidth: n.borderWidth || null,
              borderStyle: n.borderStyle || null,
              borderColor: n.borderColor || null,
              preset: n.preset || null,
              blink: !!n.blink,
              studentInput: !!n.studentInput,
              textAlign: n.textAlign || null
            });
            noteEl.style.left = n.x + 'px';
            noteEl.style.top = n.y + 'px';
            const editorEl = noteEl.querySelector('.wn-note-editor');
            if (editorEl) {
              const content = n.html ? String(n.html) : boardEscapeHtml(n.text || '').replace(/\n/g, '<br>');
              const rendered = (typeof wnRenderMathHtml === 'function') ? wnRenderMathHtml(content) : content;
              if (editorEl.innerHTML !== rendered) editorEl.innerHTML = rendered;
            }
            if (existing._applyStyle) existing._applyStyle();
            if (existing._updateContent) existing._updateContent();
            if (editorEl) {
              const _scale = (typeof conGetZoom === 'function' ? conGetZoom() : (window.conGetZoom ? window.conGetZoom() : 1)) || 1;
              if (existing.manualSize && typeof wnApplyStoredSize === 'function') {
                wnApplyStoredSize(noteEl, editorEl, existing, _scale);
              } else if (typeof conNoteAutosize === 'function') {
                conNoteAutosize(editorEl, existing);
              }
            }
            if (typeof conNoteRebuildAllStickers === 'function') conNoteRebuildAllStickers(existing, noteEl);
            nextNotes.push(existing);
          } else {
            const noteData = {
              fontSize: 14, bold: false, italic: false, underline: false, strike: false,
              color: '#111111', bg: '#ffffff',
              hidden: false, locked: false,
              manualSize: false, width: null, height: null,
              ...n
            };
            const resolvedNoteW = Number(n.liveBaseWidth != null ? n.liveBaseWidth : (n.width != null ? n.width : (n.w != null ? n.w : n.styleWidth))) || null;
            const resolvedNoteH = Number(n.liveBaseHeight != null ? n.liveBaseHeight : (n.height != null ? n.height : (n.h != null ? n.h : n.styleHeight))) || null;
            if (resolvedNoteW) {
              noteData.width = resolvedNoteW;
              noteData.w = resolvedNoteW;
              noteData.liveBaseWidth = resolvedNoteW;
              noteData._cachedW = resolvedNoteW;
            }
            if (resolvedNoteH) {
              noteData.height = resolvedNoteH;
              noteData.h = resolvedNoteH;
              noteData.liveBaseHeight = resolvedNoteH;
              noteData._cachedH = resolvedNoteH;
            }
            nextNotes.push(noteData);
            conNoteBuild(noteData);
            const num = parseInt(String(n.id).replace(/^cn+/, ''));
            if (!isNaN(num)) conNoteNextId = Math.max(conNoteNextId, num + 1);
            if (n.nodeId) {
              const linkedNode = conGetNodes().find(nd => nd.id === n.nodeId);
              if (linkedNode) {
                linkedNode.el.classList.add('has-con-note');
                if (typeof conUpdateNodeNoteButton === 'function') conUpdateNodeNoteButton(linkedNode);
              }
            }
          }
        });

        // Remove deleted notes and any orphan DOM note elements
        const seenNoteIds = new Set();
        const allDomNotes = document.querySelectorAll('#constellation-board .con-word-note');
        allDomNotes.forEach(el => {
          const did = el.dataset ? el.dataset.id : null;
          if (!did || !keepNoteIds.has(did) || seenNoteIds.has(did)) {
            el.remove();
          } else {
            seenNoteIds.add(did);
          }
        });
        _liveNotes.length = 0;
        _liveNotes.push(...nextNotes);

        // ── Reconcile Edges In-Place (Zero SVG Teardown) ──
        const existingEdges = window.conGetEdges ? window.conGetEdges() : [];
        const existingEdgesById = new Map();
        const existingEdgesByEndpoints = new Map();
        existingEdges.forEach(e => {
          if (e && e.id) existingEdgesById.set(String(e.id), e);
          if (e && e.a && e.b) existingEdgesByEndpoints.set(String(e.a) + '->' + String(e.b), e);
        });
        const keepEdges = new Set();
        const seenEdgeIdsInIncoming = new Set();

        (data.edges || []).forEach(e => {
          if (!e || !e.a || !e.b) return;
          let edgeId = e.id ? String(e.id) : null;
          // If edgeId is duplicate within incoming data, generate a fresh non-colliding ID
          if (edgeId && seenEdgeIdsInIncoming.has(edgeId)) {
            let nextNum = window.conGetNextId ? window.conGetNextId() : Date.now();
            edgeId = 'ce' + nextNum;
            while (seenEdgeIdsInIncoming.has(edgeId) || existingEdgesById.has(edgeId)) {
              nextNum = window.conGetNextId ? window.conGetNextId() : (++nextNum);
              edgeId = 'ce' + nextNum;
            }
          }
          if (edgeId) seenEdgeIdsInIncoming.add(edgeId);

          // Find candidate existing edge
          let existing = null;
          if (edgeId && existingEdgesById.has(edgeId)) {
            const cand = existingEdgesById.get(edgeId);
            if (cand && !keepEdges.has(cand) && cand.a === e.a && cand.b === e.b) {
              existing = cand;
            }
          }
          if (!existing) {
            const epKey = String(e.a) + '->' + String(e.b);
            const cand = existingEdgesByEndpoints.get(epKey);
            if (cand && !keepEdges.has(cand)) {
              existing = cand;
            }
          }

          if (existing && existing.g) {
            if (edgeId) existing.id = edgeId;
            existing.type = e.type || 'none';
            existing.label = e.label || '';
            existing.labelSize = Number(e.labelSize) || 16;
            existing.labelColor = e.labelColor || '#333333';
            existing.labelWeight = Number(e.labelWeight) || 600;
            existing.thickness = Number(e.thickness) > 0 ? Number(e.thickness) : null;
            existing.dashStyle = e.dashStyle || null;
            existing.strokeType = e.strokeType || (e.dashStyle === 'dashed' ? 'dashed' : (e.dashStyle === 'dotted' ? 'dotted' : 'solid'));
            existing.routing = e.routing || 'straight';
            existing.curvature = (typeof e.curvature === 'number') ? e.curvature : 0;
            existing.opacity = (typeof e.opacity === 'number') ? e.opacity : 1;
            existing.terminator = e.terminator || 'arrow';
            existing.animated = !!e.animated;
            existing.labelBgActive = !!e.labelBg;
            existing.anchorA = e.anchorA || null;
            existing.anchorB = e.anchorB || null;
            existing.colorMode = (e.colorMode === 'auto' || e.colorMode === 'manual') ? e.colorMode : undefined;
            existing.strokeColor = e.strokeColor || null;
            if (existing.labelEl) {
              existing.labelEl.textContent = existing.label;
            }
            if (existing.g) {
              existing.g.dataset.eid = existing.id;
              existing.g.style.display = '';
            }
            keepEdges.add(existing);
          } else {
            const restored = _conRestoreEdge(e.a, e.b, e.type, e.label || '', e.labelSize, e.labelColor, e.labelWeight, e.thickness, e.dashStyle || null, edgeId, e.strokeType, e.routing, e.curvature, e.opacity, e.terminator, e.animated, e.labelBg, e.anchorA, e.anchorB, e.colorMode, e.strokeColor);
            const targetEdge = restored || existingEdges[existingEdges.length - 1];
            if (targetEdge) keepEdges.add(targetEdge);
          }
        });

        for (let i = existingEdges.length - 1; i >= 0; i--) {
          const e = existingEdges[i];
          if (!keepEdges.has(e)) {
            if (e.g && e.g.remove) e.g.remove();
            existingEdges.splice(i, 1);
          }
        }

        // ── Reconcile Groups In-Place (Zero Group Teardown) ──
        const existingGroups = window.conGetGroups ? window.conGetGroups() : [];
        const existingGroupsMap = new Map(existingGroups.map(g => [String(g.id), g]));
        const keepGroupIds = new Set();
        (data.groups || []).forEach(g => {
          const gid = String(g.id);
          keepGroupIds.add(gid);
          const validIds = (g.nodeIds || []).filter(id => conGetNodes().find(n => n.id === id));
          const noteIds = g.noteIds || [];
          const drawingIds = g.drawingIds || [];
          const shapeIds = g.shapeIds || [];
          const mediaIds = g.mediaIds || [];
          const existing = existingGroupsMap.get(gid);
          if (existing && existing.el) {
            existing.nodeIds = [...validIds];
            existing.noteIds = [...noteIds];
            existing.drawingIds = [...drawingIds];
            existing.shapeIds = [...shapeIds];
            existing.mediaIds = [...mediaIds];
            existing.title = g.title || '';
            existing.paletteIdx = g.paletteIdx || 0;
            existing.invisible = !!g.invisible;
            existing.blink = !!g.blink;
            existing.drawingGroup = !!g.drawingGroup;
            existing.phraseGroup = !!g.phraseGroup;
            existing._manualW = (g.manualW != null ? g.manualW : null);
            existing._manualH = (g.manualH != null ? g.manualH : null);
            existing._px = (g.x != null ? g.x : null);
            existing._py = (g.y != null ? g.y : null);
            if (!existing.drawingGroup && !existing.phraseGroup) {
              if (existing.invisible) {
                existing.el.classList.add('con-group-invisible');
                existing.el.style.borderColor = 'transparent';
                existing.el.style.background = 'transparent';
              } else {
                existing.el.classList.remove('con-group-invisible');
                const CON_PALETTES_REF = window.CON_PALETTES || [];
                const pal = CON_PALETTES_REF[existing.paletteIdx] || ['rgba(240,240,240,0.5)', '#111', '#111'];
                existing.el.style.borderColor = pal[2] || '#111';
                existing.el.style.color = pal[1] || '#111';
                const bgRaw = pal[0] || '#ffffff';
                if (bgRaw === '#ffffff') {
                  existing.el.style.background = 'rgba(240,240,240,0.5)';
                } else {
                  const r = parseInt(bgRaw.slice(1, 3), 16);
                  const gv = parseInt(bgRaw.slice(3, 5), 16);
                  const b = parseInt(bgRaw.slice(5, 7), 16);
                  existing.el.style.background = `rgba(${r},${gv},${b},0.28)`;
                }
              }
            }
          } else {
            if (validIds.length >= 1 || noteIds.length >= 1 || drawingIds.length >= 1 || shapeIds.length >= 1 || mediaIds.length >= 1 || (g.manualW != null && g.manualH != null)) {
              _conRestoreGroup({ ...g, noteIds, drawingIds, shapeIds, mediaIds }, validIds);
            }
          }
        });
        for (let i = existingGroups.length - 1; i >= 0; i--) {
          const g = existingGroups[i];
          if (!keepGroupIds.has(String(g.id))) {
            if (g.el && g.el.remove) g.el.remove();
            existingGroups.splice(i, 1);
          }
        }

        // ── Reconcile Masks In-Place ──
        const savedMasksList = Array.isArray(data.masks) ? data.masks : (Array.isArray(data.conMasks) ? data.conMasks : []);
        const existingMasks = window.conGetMasks ? window.conGetMasks() : [];
        const existingMasksMap = new Map(existingMasks.map(m => [String(m.id), m]));
        const keepMaskIds = new Set();
        savedMasksList.forEach(src => {
          const mid = String(src.id);
          keepMaskIds.add(mid);
          const existing = existingMasksMap.get(mid);
          if (existing && existing.el) {
            existing.x = Number(src.x) || 0;
            existing.y = Number(src.y) || 0;
            existing.width = Number(src.width) || 160;
            existing.height = Number(src.height) || 64;
            existing.color = src.color || '#111111';
            existing.opacity = Number(src.opacity) || 0.95;
            existing.el.style.left = existing.x + 'px';
            existing.el.style.top = existing.y + 'px';
            existing.el.style.width = existing.width + 'px';
            existing.el.style.height = existing.height + 'px';
            existing.el.style.backgroundColor = existing.color;
            existing.el.style.opacity = String(existing.opacity);
          } else {
            if (window.conAddMaskFromData) window.conAddMaskFromData(src);
          }
        });
        for (let i = existingMasks.length - 1; i >= 0; i--) {
          const m = existingMasks[i];
          if (!keepMaskIds.has(String(m.id))) {
            if (m.el && m.el.remove) m.el.remove();
            existingMasks.splice(i, 1);
          }
        }

        // ── Reconcile Drawings In-Place (Zero Path Destruction) ──
        const existingDrawings = window.conGetDrawings ? window.conGetDrawings() : [];
        const existingDrawingsMap = new Map(existingDrawings.map(d => [String(d.id), d]));
        const keepDrawingIds = new Set();
        (data.drawings || []).forEach(src => {
          const did = String(src.id);
          keepDrawingIds.add(did);
          const existing = existingDrawingsMap.get(did);
          if (existing && existing.el) {
            existing.x = Number(src.x) || 0;
            existing.y = Number(src.y) || 0;
            existing.w = Number(src.w) || 1;
            existing.h = Number(src.h) || 1;
            existing.color = src.color || '#e53935';
            existing.thickness = Number(src.thickness) || 4;
            existing.opacity = Number.isFinite(Number(src.opacity)) && Number(src.opacity) > 0 ? Number(src.opacity) : 1;
            existing.points = (src.points || []).map(p => (p === null || p === undefined) ? null : ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
            const PAD = Math.max(existing.thickness + 4, 12);
            existing.pad = PAD;
            existing.el.style.left = (existing.x - PAD) + 'px';
            existing.el.style.top = (existing.y - PAD) + 'px';
            existing.el.style.width = (existing.w + 2 * PAD) + 'px';
            existing.el.style.height = (existing.h + 2 * PAD) + 'px';
            if (existing.visPath) {
              existing.visPath.setAttribute('stroke', existing.color);
              existing.visPath.setAttribute('stroke-width', String(existing.thickness));
              existing.visPath.setAttribute('opacity', String(existing.opacity));
            }
            if (existing.hitPath) {
              existing.hitPath.setAttribute('stroke-width', String(Math.max(20, existing.thickness + 10)));
            }
            if (typeof _conBuildPathD === 'function') {
              const pathD = _conBuildPathD(existing.points.map(p => p === null ? null : ({ x: p.x + PAD, y: p.y + PAD })));
              if (existing.hitPath) existing.hitPath.setAttribute('d', pathD);
              if (existing.visPath) existing.visPath.setAttribute('d', pathD);
            }
          } else {
            if (window.conDrawingFromData) window.conDrawingFromData(src);
          }
        });
        for (let i = existingDrawings.length - 1; i >= 0; i--) {
          const d = existingDrawings[i];
          if (!keepDrawingIds.has(String(d.id))) {
            if (d.el && d.el.remove) d.el.remove();
            existingDrawings.splice(i, 1);
          }
        }

        // ── Reconcile Shapes In-Place (Zero Shape Destruction) ──
        const existingShapes = window.conGetShapes ? window.conGetShapes() : [];
        const existingShapesMap = new Map(existingShapes.map(s => [String(s.id), s]));
        const keepShapeIds = new Set();
        (data.shapes || []).forEach(src => {
          const sid = String(src.id);
          keepShapeIds.add(sid);
          const existing = existingShapesMap.get(sid);
          if (existing && existing.el) {
            existing.type = src.type || existing.type || 'rect';
            existing.x = Number(src.x) || 0;
            existing.y = Number(src.y) || 0;
            existing.w = Math.max(2, Number(src.w) || 40);
            existing.h = Math.max(2, Number(src.h) || 40);
            existing.lx1 = Number(src.lx1) !== 0 ? Number(src.lx1) : existing.x;
            existing.ly1 = Number(src.ly1) !== 0 ? Number(src.ly1) : existing.y;
            existing.lx2 = Number(src.lx2) !== 0 ? Number(src.lx2) : existing.x + existing.w;
            existing.ly2 = Number(src.ly2) !== 0 ? Number(src.ly2) : existing.y + existing.h;
            existing.color = src.color || existing.color || '#333333';
            existing.fillColor = src.fillColor || 'none';
            existing.thickness = Number(src.thickness) || 3;
            existing.opacity = Number.isFinite(Number(src.opacity)) && Number(src.opacity) > 0 ? Number(src.opacity) : 1;
            existing.dashStyle = src.dashStyle || 'solid';
            if (typeof conShapeFullRebuild === 'function') {
              conShapeFullRebuild(existing);
            } else if (existing.el) {
              existing.el.style.left = existing.x + 'px';
              existing.el.style.top = existing.y + 'px';
              existing.el.style.width = existing.w + 'px';
              existing.el.style.height = existing.h + 'px';
            }
          } else {
            if (window.conShapeFromData) window.conShapeFromData(src);
          }
        });
        for (let i = existingShapes.length - 1; i >= 0; i--) {
          const s = existingShapes[i];
          if (!keepShapeIds.has(String(s.id))) {
            if (s.el && s.el.remove) s.el.remove();
            existingShapes.splice(i, 1);
          }
        }

        // ── Reconcile Tables In-Place (Zero Table Destruction for move/edit) ──
        const existingTables = window.conGetTables ? window.conGetTables() : (typeof conTables !== 'undefined' ? conTables : []);
        const existingTablesMap = new Map(existingTables.map(t => [String(t.id), t]));
        const keepTableIds = new Set();
        (data.tables || []).forEach(src => {
          const tid = String(src.id);
          keepTableIds.add(tid);
          const existing = existingTablesMap.get(tid);
          if (existing && existing.el) {
            existing.x = Number(src.x) || 0;
            existing.y = Number(src.y) || 0;
            existing.el.style.left = existing.x + 'px';
            existing.el.style.top = existing.y + 'px';
            existing.locked = !!src.locked;
            existing.hasHeader = !!src.hasHeader;
            if (existing.locked) existing.el.classList.add('tbl-locked');
            else existing.el.classList.remove('tbl-locked');
            if (existing.rows === src.rows && existing.cols === src.cols && Array.isArray(src.cells) && Array.isArray(existing.cells)) {
              if (Array.isArray(src.colWidths)) existing.colWidths = [...src.colWidths];
              if (Array.isArray(src.rowHeights)) existing.rowHeights = [...src.rowHeights];
              const gridWrap = existing.el.querySelector('.con-table-grid-wrap');
              if (gridWrap && typeof _totalW === 'function' && typeof _totalH === 'function') {
                gridWrap.style.width = _totalW(existing) + 'px';
                gridWrap.style.height = _totalH(existing) + 'px';
              }
              src.cells.forEach((sc, idx) => {
                const ec = existing.cells[idx];
                if (ec) {
                  Object.assign(ec, sc);
                  if (typeof _applyCellStyle === 'function') {
                    const r = Math.floor(idx / existing.cols);
                    const c = idx % existing.cols;
                    _applyCellStyle(existing, r, c);
                  }
                }
              });
            } else {
              existing.el.remove();
              Object.assign(existing, src);
              if (typeof _buildDOM === 'function') _buildDOM(existing);
            }
          } else {
            if (window.conAddTableFromData) window.conAddTableFromData(src);
          }
        });
        for (let i = existingTables.length - 1; i >= 0; i--) {
          const t = existingTables[i];
          if (!keepTableIds.has(String(t.id))) {
            if (t.el && t.el.remove) t.el.remove();
            existingTables.splice(i, 1);
          }
        }

        conRestoreMediaItems(data.media || []);
        conPageBackgroundPdf = data.backgroundPdf ? {
          attachmentId: String(data.backgroundPdf.attachmentId || ''),
          name: String(data.backgroundPdf.name || 'background.pdf'),
          mime: String(data.backgroundPdf.mime || 'application/pdf'),
          relativePath: String(data.backgroundPdf.relativePath || ''),
          pageNumber: Math.max(1, Number(data.backgroundPdf.pageNumber) || 1),
          file: null
        } : null;
        conRenderPagePdfBackground({ silent: true });
        _conBoardBg = (data.boardBg && data.boardBg.attachmentId)
          ? { attachmentId: String(data.boardBg.attachmentId), pageNumber: Math.max(1, Number(data.boardBg.pageNumber) || 1) }
          : null;
        conRenderBoardBg({ silent: true });
        _conBoardBgColor = conNormalizeColorHex(data.boardBgColor || data.boardBackgroundColor || data.backgroundColor || '') || window._bcBoardDefaultBgColor || '';
        conApplyBoardBgColor();

        // Restore board-level emoji stickers (placed near nodes)
        const _brdHost = document.getElementById('constellation-board');
        if (_brdHost) {
          _brdHost.querySelectorAll(':scope > .wn-emoji-sticker').forEach(s => s.remove());
          if (Array.isArray(data.boardStickers) && data.boardStickers.length) {
            window._conBoardStickers = data.boardStickers.map(s => ({ id: s.id, emoji: s.emoji, x: Number(s.x) || 0, y: Number(s.y) || 0, size: Number(s.size) || 40 }));
            window._conBoardStickers.forEach(sd => {
              if (typeof conNoteBuildSticker === 'function') conNoteBuildSticker(sd, { emojiStickers: window._conBoardStickers }, _brdHost);
            });
          } else {
            window._conBoardStickers = [];
          }
        }

        // Selection hygiene: remove IDs of deleted elements from selections
        if (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size) {
          const survivingNodeIds = new Set((window.conGetNodes ? window.conGetNodes() : []).map(n => n.id));
          conMultiSelected.forEach(id => {
            if (!survivingNodeIds.has(id)) conMultiSelected.delete(id);
          });
        }
        if (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size) {
          const survivingNoteIds = new Set((window.conGetNotes ? window.conGetNotes() : []).map(n => String(n.id)));
          conNoteSelected.forEach(id => {
            if (!survivingNoteIds.has(String(id))) conNoteSelected.delete(id);
          });
        }
        if (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size) {
          const survivingDrawIds = new Set((window.conGetDrawings ? window.conGetDrawings() : []).map(d => String(d.id)));
          conDrawingSelected.forEach(id => {
            if (!survivingDrawIds.has(String(id))) conDrawingSelected.delete(id);
          });
        }
        if (typeof _conShapeSelected !== 'undefined' && _conShapeSelected && _conShapeSelected.size) {
          const survivingShapeIds = new Set((window.conGetShapes ? window.conGetShapes() : []).map(s => String(s.id)));
          _conShapeSelected.forEach(id => {
            if (!survivingShapeIds.has(String(id))) _conShapeSelected.delete(id);
          });
        }

        if (window.conGroupRefitAll) window.conGroupRefitAll();
        window.conRedrawEdges();
        if (window.conUpdatePageBar) window.conUpdatePageBar();
        conScheduleLayoutRefresh();
        if (typeof window._conSyncDrawOverlaySize === 'function') window._conSyncDrawOverlaySize();

        if (!isMirrorSync && typeof conQueueCurrentPageSnapshotPng === 'function') {
          conQueueCurrentPageSnapshotPng(conCurrentPageIndex);
        }
        if (!isMirrorSync && typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        }
        return;
      }

      // Clear existing board without confirm
      const nodes = conGetNodes();
      nodes.slice().forEach(n => n.el.remove());
      nodes.length = 0;
      const edges = window.conGetEdges ? window.conGetEdges() : [];
      const groups = window.conGetGroups ? window.conGetGroups() : [];
      edges.forEach(e => e.g && e.g.remove());
      edges.length = 0;
      groups.forEach(g => g.el && g.el.remove());
      groups.length = 0;
      document.getElementById('constellation-svg').innerHTML = '';
      if (window.conMasksClear) window.conMasksClear();
      if (window.conNotesClear) window.conNotesClear();
      if (window.conDrawingsClear) window.conDrawingsClear();
      if (window.conTablesClear) window.conTablesClear();
      if (!isMirrorSync && window.conMediaClear) window.conMediaClear();
      // Clear board-level emoji stickers (added via node emoji picker)
      const _boardEl = document.getElementById('constellation-board');
      if (_boardEl) _boardEl.querySelectorAll(':scope > .wn-emoji-sticker').forEach(s => s.remove());
      window._conBoardStickers = [];
      conPageBackgroundPdf = null;
      conRenderPagePdfBackground({ silent: true });
      _conBoardBg = null;
      conRenderBoardBg({ silent: true });
      _conBoardBgColor = '';
      conApplyBoardBgColor();

      const savedMasks = Array.isArray(data.masks)
        ? data.masks
        : (Array.isArray(data.conMasks) ? data.conMasks : []);

      // Advance conNextId past all saved ids across all pages so new additions don't collide
      const pagesToScan = [data];
      if (Array.isArray(data.pages)) pagesToScan.push(...data.pages);
      if (typeof conPageSnapshots !== 'undefined' && Array.isArray(conPageSnapshots)) pagesToScan.push(...conPageSnapshots);

      let allNumericIds = [];
      pagesToScan.forEach(p => {
        if (!p) return;
        const pageMasks = Array.isArray(p.masks) ? p.masks : (Array.isArray(p.conMasks) ? p.conMasks : []);
        allNumericIds = allNumericIds
          .concat((p.nodes || []).map(n => n && n.id))
          .concat((p.edges || []).map(e => e && [e.id, e.a, e.b]).flat())
          .concat((p.groups || []).map(g => g && g.id))
          .concat(pageMasks.map(m => m && m.id))
          .concat((p.drawings || []).map(d => d && d.id))
          .concat((p.shapes || []).map(s => s && s.id))
          .concat((p.tables || []).map(t => t && t.id));
      });
      let maxNum = 0;
      allNumericIds.forEach(id => {
        if (!id) return;
        const m = String(id).match(/\d+$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[0], 10));
      });
      if (window.conSetNextId) window.conSetNextId(maxNum + 2);
      if (typeof window.conSyncGroupNextId === 'function') window.conSyncGroupNextId(maxNum + 2);

      let maxNoteNum = -1;
      pagesToScan.forEach(p => {
        if (!p) return;
        (p.notes || []).forEach(n => {
          if (n && n.id) {
            const m = String(n.id).match(/^cnn(\d+)$/);
            if (m) {
              const val = parseInt(m[1], 10);
              if (!isNaN(val) && val > maxNoteNum) maxNoteNum = val;
            }
          }
        });
      });
      if (maxNoteNum >= 0) {
        if (typeof window.conSyncNoteNextId === 'function') window.conSyncNoteNextId(maxNoteNum + 1);
        else if (typeof conNoteNextId !== 'undefined') conNoteNextId = Math.max(conNoteNextId, maxNoteNum + 1);
      }

      const brd = conGetBoard();
      const contentBottom = conGetBoardContentBottomFromData(data);
      let resolvedHeight = (data && Number(data.boardHeight) > 0) ? Number(data.boardHeight) : null;
      if (!resolvedHeight) {
        try {
          const pIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
          const s = sessionStorage.getItem('cmt-board-expanded-height-' + pIdx) || sessionStorage.getItem('cmt-board-expanded-height');
          const v = parseInt(s, 10);
          if (!isNaN(v) && v > 0) resolvedHeight = v;
        } catch (_) { }
      }
      if (contentBottom > 0 && (!resolvedHeight || resolvedHeight < contentBottom + 120)) {
        const minNeeded = Math.round(contentBottom + 120);
        const defaultH = (brd ? (brd.offsetHeight || brd.clientHeight) : 0) || (window.innerHeight * 2);
        if (minNeeded > defaultH) resolvedHeight = minNeeded;
      }
      if (brd) {
        if (resolvedHeight && resolvedHeight > 0) {
          brd.style.height = resolvedHeight + 'px';
        } else if (window._bcBoardLayoutConfig && window._bcBoardLayoutConfig.dims && window._bcBoardLayoutConfig.dims.h) {
          brd.style.height = window._bcBoardLayoutConfig.dims.h + 'px';
        } else {
          brd.style.height = '';
        }
      }
      const curPIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
      if (typeof conPageSnapshots !== 'undefined' && conPageSnapshots[curPIdx]) {
        conPageSnapshots[curPIdx].boardHeight = resolvedHeight || null;
      }
      if (resolvedHeight && resolvedHeight > 0) {
        try {
          sessionStorage.setItem('cmt-board-expanded-height-' + curPIdx, String(resolvedHeight));
          sessionStorage.setItem('cmt-board-expanded-height', String(resolvedHeight));
        } catch (_) { }
      } else {
        try {
          sessionStorage.removeItem('cmt-board-expanded-height-' + curPIdx);
        } catch (_) { }
      }

      // Restore title
      if (window.conSetTitle) window.conSetTitle(data.title || '');
      const titleInput = document.getElementById('con-title-input');
      if (titleInput) titleInput.value = (window.conGetTitle ? window.conGetTitle() : '');

      // Restore nodes
      (data.nodes || []).forEach(n => {
        const dbMatch = (typeof vocabBank !== 'undefined')
          ? vocabBank.find(i => i.word.toLowerCase() === (n.dbWord || n.baseWord || '').toLowerCase())
          : null;
        const el = document.createElement('div');
        el.className = 'con-node' + (dbMatch ? ' con-node-matched' : '');
        el.id = n.id;
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
        if (n.bg) el.style.background = n.bg;
        if (n.color) el.style.color = n.color;
        if (n.border) el.style.borderColor = n.border;
        if (n.fontFamily) el.style.fontFamily = n.fontFamily;
        conApplyTextStrokeStyle(el, n.textStrokeWidth, n.textStrokeColor);
        brd.appendChild(el);
        const nodeObj = {
          id: n.id, el, x: n.x, y: n.y, baseX: n.x, baseY: n.y,
          w: (typeof n.w === 'number' && n.w > 0) ? n.w : undefined,
          h: (typeof n.h === 'number' && n.h > 0) ? n.h : undefined,
          _cachedW: (typeof n._cachedW === 'number' && n._cachedW > 0) ? n._cachedW : ((typeof n.w === 'number' && n.w > 0) ? n.w : undefined),
          _cachedH: (typeof n._cachedH === 'number' && n._cachedH > 0) ? n._cachedH : ((typeof n.h === 'number' && n.h > 0) ? n.h : undefined),
          dbWord: n.dbWord || null,
          baseWord: n.baseWord || '',
          sourceWord: n.sourceWord || null,
          relation: n.relation || null,
          fmt: n.fmt || {},
          locked: !!n.locked,
          pageNum: n.pageNum != null ? n.pageNum : null,
          phraseOrder: n.phraseOrder != null ? n.phraseOrder : null,
          emoji: n.emoji || null,
          isTimer: !!n.isTimer,
          durationSec: n.durationSec || null,
          remainingSec: n.remainingSec != null ? n.remainingSec : null,
          timerState: n.timerState || 'idle',
          timerTarget: (n.timerTarget === 'cms' || n.timerTarget === 'board') ? n.timerTarget : null,
          isRandom: !!n.isRandom,
          randomMin: n.isRandom ? (n.randomMin != null ? n.randomMin : 1) : null,
          randomMax: n.isRandom ? (n.randomMax != null ? n.randomMax : 100) : null,
          randomValue: n.isRandom ? (n.randomValue != null ? n.randomValue : (n.randomMin != null ? n.randomMin : 1)) : null,
          isSound: !!n.isSound,
          soundAttachmentId: n.soundAttachmentId || null,
          soundName: n.soundName || null,
          soundDuration: (typeof n.soundDuration === 'number') ? n.soundDuration : null,
          isVideo: !!n.isVideo,
          videoAttachmentId: n.videoAttachmentId || null,
          videoName: n.videoName || null,
          videoDuration: (typeof n.videoDuration === 'number') ? n.videoDuration : null,
          shape: (window.conNormalizeNodeShape ? window.conNormalizeNodeShape(n.shape || 'rectangle') : conNormalizeNodeShapeSafe(n.shape || 'rectangle')),
          borderWidth: n.borderWidth || null,
          borderStyle: n.borderStyle || null,
          highlight: n.highlight || null,
          preset: n.preset || null,
          fontFamily: n.fontFamily || null,
          fontSize: n.fontSize || '16px',
          textStrokeColor: n.textStrokeColor || null,
          textStrokeWidth: n.textStrokeWidth || null,
          competences: Array.isArray(n.competences) ? n.competences.slice() : (n.competences ? [n.competences] : (Array.isArray(n.competenceTags) ? n.competenceTags.slice() : []))
        };
        if (nodeObj.isTimer && nodeObj.timerState === 'running') {
          nodeObj.timerEndTime = Date.now() + (nodeObj.remainingSec || nodeObj.durationSec || 60) * 1000;
        }
        conGetNodes().push(nodeObj);
        if (typeof window.conAttachNode === 'function') {
          window.conAttachNode(n.id, el);
        } else if (typeof window.conAttachNodeEvents === 'function') {
          window.conAttachNodeEvents(n.id, el);
        }
        // Rebuild innerHTML with formatting + annotations + page badge
        window.conRenderNodeLabel(nodeObj);
        if (window.conSetNodeBaseFontSize) window.conSetNodeBaseFontSize(nodeObj, n.fontSize || '16px');
        conApplyNodeShape(nodeObj, nodeObj.shape);
        if (el.offsetWidth > 0) {
          nodeObj._cachedW = el.offsetWidth;
          nodeObj._cachedH = el.offsetHeight;
        }
        nodeObj.rotation = (typeof n.rotation === 'number') ? ((typeof window.conNormalizeNodeRotation === 'function') ? window.conNormalizeNodeRotation(n.rotation) : n.rotation) : 0;
        if (typeof conApplyNodeRotation === 'function') conApplyNodeRotation(nodeObj, nodeObj.rotation);
        el.dataset.baseWord = n.baseWord || '';
        // Restore emoji badge/dot state if emoji was saved
        if (nodeObj.emoji && window.conEmojiRestoreNodeDotAndBadge) window.conEmojiRestoreNodeDotAndBadge(nodeObj);
        // Attach star button if node has a db entry
        if (window.conAddNodeStarBtn) window.conAddNodeStarBtn(nodeObj);
        // Restore competence badge
        if (typeof conUpdateNodeCompetenceBadge === 'function') conUpdateNodeCompetenceBadge(nodeObj);
        // Restore masked state
        if (n.masked) {
          nodeObj.masked = true;
          el.classList.add('con-masked');
        }
        if (window.conSyncNodeLockState) window.conSyncNodeLockState(nodeObj);
      });

      // Restore edges
      (data.edges || []).forEach(e => {
        if (e.a && e.b) {
          _conRestoreEdge(
            e.a,
            e.b,
            e.type,
            e.label || '',
            e.labelSize,
            e.labelColor,
            e.labelWeight,
            e.thickness,
            e.dashStyle || null,
            e.id || null,
            e.strokeType,
            e.routing,
            e.curvature,
            e.opacity,
            e.terminator,
            e.animated,
            e.labelBg,
            e.anchorA,
            e.anchorB,
            e.colorMode,
            e.strokeColor
          );
        }
      });

      // Restore groups
      // NOTE: notes/drawings/shapes are restored AFTER groups, so we cannot filter by their
      // current existence here — _conGroupRefit handles missing members gracefully and
      // conGroupRefitAll() is called at the end once everything is in place.
      if (data.groups) {
        data.groups.forEach(g => {
          const validIds = (g.nodeIds || []).filter(id => conGetNodes().find(n => n.id === id));
          const noteIds = g.noteIds || [];
          const drawingIds = g.drawingIds || [];
          const shapeIds = g.shapeIds || [];
          const mediaIds = g.mediaIds || [];
          if (validIds.length >= 1 || noteIds.length >= 1 || drawingIds.length >= 1 || shapeIds.length >= 1 || mediaIds.length >= 1 || (g.manualW != null && g.manualH != null))
            _conRestoreGroup({ ...g, noteIds, drawingIds, shapeIds, mediaIds }, validIds);
        });
      }

      // Restore masks
      savedMasks.forEach(m => {
        if (window.conAddMaskFromData) window.conAddMaskFromData(m);
      });

      // Restore notes
      conNoteNextId = 0;
      const _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
      (data.notes || []).forEach(n => {
        const noteData = {
          fontSize: 14, bold: false, italic: false, underline: false, strike: false,
          color: '#111111', bg: '#ffffff',
          hidden: false, locked: false,
          manualSize: false, width: null, height: null,
          ...n
        };
        const resolvedNoteW = Number(n.liveBaseWidth != null ? n.liveBaseWidth : (n.width != null ? n.width : (n.w != null ? n.w : n.styleWidth))) || null;
        const resolvedNoteH = Number(n.liveBaseHeight != null ? n.liveBaseHeight : (n.height != null ? n.height : (n.h != null ? n.h : n.styleHeight))) || null;
        if (resolvedNoteW) {
          noteData.width = resolvedNoteW;
          noteData.w = resolvedNoteW;
          noteData.liveBaseWidth = resolvedNoteW;
          noteData._cachedW = resolvedNoteW;
        }
        if (resolvedNoteH) {
          noteData.height = resolvedNoteH;
          noteData.h = resolvedNoteH;
          noteData.liveBaseHeight = resolvedNoteH;
          noteData._cachedH = resolvedNoteH;
        }
        _liveNotes.push(noteData);
        conNoteBuild(noteData);
        const num = parseInt(String(n.id).replace(/^cn+/, ''));
        if (!isNaN(num)) {
          if (typeof window.conSyncNoteNextId === 'function') window.conSyncNoteNextId(num + 1);
          else if (typeof conNoteNextId !== 'undefined') conNoteNextId = Math.max(conNoteNextId, num + 1);
        }
        if (n.nodeId) {
          const linkedNode = conGetNodes().find(nd => nd.id === n.nodeId);
          if (linkedNode) linkedNode.el.classList.add('has-con-note');
        }
      });
      // Re-apply styles after DOM layout settles (fixes size/weight not showing on load)
      requestAnimationFrame(() => {
        const _notesForStyle = window.conGetNotes ? window.conGetNotes() : [];
        _notesForStyle.forEach(nd => { if (nd._applyStyle) nd._applyStyle(); });
        if (typeof window.conGroupRefitAll === 'function') window.conGroupRefitAll();
        if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
      });

      // Restore drawings
      if (window.conDrawingsClear) window.conDrawingsClear();
      (data.drawings || []).forEach(d => {
        if (window.conDrawingFromData) window.conDrawingFromData(d);
      });

      // Restore shapes
      if (window.conShapesClear) window.conShapesClear();
      (data.shapes || []).forEach(s => {
        if (window.conShapeFromData) window.conShapeFromData(s);
      });

      // Restore tables
      (data.tables || []).forEach(t => {
        if (window.conAddTableFromData) window.conAddTableFromData(t);
      });

      conRestoreMediaItems(data.media || []);
      conPageBackgroundPdf = data.backgroundPdf
        ? {
          attachmentId: String(data.backgroundPdf.attachmentId || ''),
          name: String(data.backgroundPdf.name || 'background.pdf'),
          mime: String(data.backgroundPdf.mime || 'application/pdf'),
          relativePath: String(data.backgroundPdf.relativePath || ''),
          pageNumber: Math.max(1, Number(data.backgroundPdf.pageNumber) || 1),
          file: null
        }
        : null;
      conRenderPagePdfBackground({ silent: true });
      _conBoardBg = (data.boardBg && data.boardBg.attachmentId)
        ? { attachmentId: String(data.boardBg.attachmentId), pageNumber: Math.max(1, Number(data.boardBg.pageNumber) || 1) }
        : null;
      conRenderBoardBg({ silent: true });
      _conBoardBgColor = conNormalizeColorHex(data.boardBgColor || data.boardBackgroundColor || data.backgroundColor || '') || window._bcBoardDefaultBgColor || '';
      conApplyBoardBgColor();

      if (window.conGroupRefitAll) window.conGroupRefitAll();
      window.conRedrawEdges();
      if (window.conUpdatePageBar) window.conUpdatePageBar();
      conScheduleLayoutRefresh();
      if (typeof window._conSyncDrawOverlaySize === 'function') window._conSyncDrawOverlaySize();

      // Restore board-level emoji stickers (placed near nodes)
      const _brd = document.getElementById('constellation-board');
      if (_brd && Array.isArray(data.boardStickers) && data.boardStickers.length) {
        window._conBoardStickers = data.boardStickers.map(s => ({ id: s.id, emoji: s.emoji, x: Number(s.x) || 0, y: Number(s.y) || 0, size: Number(s.size) || 40 }));
        window._conBoardStickers.forEach(sd => {
          if (typeof conNoteBuildSticker === 'function') conNoteBuildSticker(sd, { emojiStickers: window._conBoardStickers }, _brd);
        });
      }

      if (!isMirrorSync && typeof conQueueCurrentPageSnapshotPng === 'function') {
        conQueueCurrentPageSnapshotPng(conCurrentPageIndex);
      }
      if (!isMirrorSync && !isPageRestore && !window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
        window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
      }
    } finally {
      setTimeout(() => {
        _conIsRestoringSession = false;
        window._conSuppressMirrorObserver = false;
      }, 150);
    }
  }

    // Helper: restore a single edge (mirrors conAddEdge inside IIFE)
    function _conRestoreEdge(aId, bId, type, label, labelSize, labelColor, labelWeight, thickness, dashStyle, existingId, strokeType, routing, curvature, opacity, terminator, animated, labelBg, anchorA, anchorB, colorMode, strokeColor) {
      if (window.conEnsureSvgDefs) window.conEnsureSvgDefs();
      const svgEl = document.getElementById('constellation-svg');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'con-line-group');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('class', 'con-line');
      line.setAttribute('fill', 'none');
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hit.setAttribute('class', 'con-line-hit');
      hit.setAttribute('fill', 'none');
      const labelBgEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      labelBgEl.setAttribute('class', 'con-line-label-bg');
      labelBgEl.setAttribute('rx', '4');
      labelBgEl.setAttribute('ry', '4');
      labelBgEl.style.display = 'none';
      const labelEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelEl.setAttribute('class', 'con-line-label');
      labelEl.style.pointerEvents = 'all';
      labelEl.style.cursor = 'pointer';
      let edgeId = existingId || ('ce' + (window.conGetNextId ? window.conGetNextId() : Date.now()));
      const curEdges = window.conGetEdges ? window.conGetEdges() : [];
      if (!existingId || curEdges.some(e => e.id === edgeId)) {
        while (curEdges.some(e => e.id === edgeId)) {
          const nextNum = window.conGetNextId ? window.conGetNextId() : Date.now();
          edgeId = 'ce' + nextNum;
        }
      }
      g.dataset.eid = edgeId;
      g.appendChild(line);
      g.appendChild(labelBgEl);
      g.appendChild(labelEl);
      g.appendChild(hit);
      svgEl.appendChild(g);

      hit.addEventListener('click', function (e) {
        if (typeof conMode !== 'undefined' && conMode === 'delete') {
          if (window.conPushUndo) window.conPushUndo();
          if (window.conRemoveEdge) window.conRemoveEdge(edgeId);
          return;
        }
        e.stopPropagation();
        const nextSelected = (window._conSelectedEdgeId === edgeId) ? null : edgeId;
        if (nextSelected) {
          if (typeof window.conDeselectAll === 'function') {
            window.conDeselectAll();
          } else if (typeof window.conSelect === 'function') {
            window.conSelect(null);
          }
        }
        window._conSelectedEdgeId = nextSelected;
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
        if (window.conRedrawEdges) window.conRedrawEdges();
      });
      hit.addEventListener('dblclick', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.conEdgeCtxOpen) window.conEdgeCtxOpen(e, edgeId);
      });
      labelEl.addEventListener('dblclick', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.conEdgeCtxOpen) window.conEdgeCtxOpen(e, edgeId);
      });
      hit.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.conEdgeCtxOpen) window.conEdgeCtxOpen(e, edgeId);
      });
      labelEl.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.conEdgeCtxOpen) window.conEdgeCtxOpen(e, edgeId);
      });

      const _restoreThickness = (thickness > 0) ? Number(thickness) : ((window._conDefaultLinkThickness > 0) ? window._conDefaultLinkThickness : 2);
      const sType = strokeType || (dashStyle === 'dashed' ? 'dashed' : (dashStyle === 'dotted' ? 'dotted' : (window._conDefaultLinkStrokeType || 'solid')));
      const edge = {
        id: edgeId,
        a: aId,
        b: bId,
        type: type || (window._conDefaultLinkDirection || 'none'),
        label: label || '',
        labelSize: Number(labelSize) || (window._conDefaultLinkLabelSize > 0 ? window._conDefaultLinkLabelSize : 16),
        labelColor: labelColor || window._conDefaultLinkColor || '#333333',
        labelWeight: Number(labelWeight) || 600,
        thickness: _restoreThickness,
        dashStyle: (sType === 'dashed' || sType === 'dotted') ? sType : null,
        strokeType: sType,
        routing: routing || window._conDefaultLinkRouting || 'straight',
        curvature: (typeof curvature === 'number') ? curvature : 0,
        opacity: (typeof opacity === 'number') ? opacity : ((typeof window._conDefaultLinkOpacity === 'number') ? window._conDefaultLinkOpacity : 1),
        terminator: terminator || window._conDefaultLinkTerminator || 'arrow',
        animated: (typeof animated !== 'undefined') ? !!animated : !!window._conDefaultLinkAnimated,
        labelBgActive: (typeof labelBg !== 'undefined') ? !!labelBg : !!window._conDefaultLinkLabelBg,
        anchorA: anchorA || null,
        anchorB: anchorB || null,
        // Link colour mode: 'auto' (derived from endpoints) | 'manual'. Left undefined for
        // legacy saves so conApplyEdgeLabelStyle can infer it once both endpoints exist.
        colorMode: (colorMode === 'auto' || colorMode === 'manual') ? colorMode : undefined,
        strokeColor: strokeColor || null,
        line,
        hit,
        labelEl,
        labelBg: labelBgEl,
        midHandle: null,
        endHandleA: null,
        endHandleB: null,
        g
      };
      line.style.strokeWidth = String(_restoreThickness);
      hit.style.strokeWidth = String(Math.max(16, _restoreThickness + 10));
      const edgesArr = window.conGetEdges ? window.conGetEdges() : [];
      edgesArr.push(edge);
      labelEl.textContent = edge.label;
      if (window.conApplyEdgeLabelStyle) window.conApplyEdgeLabelStyle(edge);
      return edge;
    }
    window._conRestoreEdge = _conRestoreEdge;

    // Helper: restore a group
    function _conRestoreGroup(g, validIds) {
      const brd = conGetBoard();
      const groupsArr = window.conGetGroups ? window.conGetGroups() : (typeof conGroups !== 'undefined' ? conGroups : []);
      let gid = g.id;
      if (!gid || groupsArr.some(existing => existing.id === gid)) {
        gid = (typeof conGenerateGroupId === 'function') ? conGenerateGroupId(gid) : (gid || ('cg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)));
      }
      const m = String(gid).match(/cg(\d+)$/i) || String(gid).match(/(\d+)$/);
      if (m) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && typeof conSyncGroupNextId === 'function') conSyncGroupNextId(num + 1);
      }
      const el = document.createElement('div');
      el.className = 'con-group' + (g.drawingGroup ? ' con-group-drawing' : '') + (g.phraseGroup ? ' con-phrase-group' : '');
      el.dataset.gid = gid;
      const svgEl = document.getElementById('constellation-svg');
      // Insert after existing groups so restored groups stack in save order
      let _ri = null;
      let _rc = svgEl.nextSibling;
      while (_rc) {
        if (!_rc.classList || !_rc.classList.contains('con-group')) { _ri = _rc; break; }
        _rc = _rc.nextSibling;
      }
      brd.insertBefore(el, _ri);

      if (!g.drawingGroup && !g.phraseGroup) {
        if (g.invisible) {
          el.classList.add('con-group-invisible');
          el.style.borderColor = 'transparent';
          el.style.background = 'transparent';
        } else {
          const CON_PALETTES_REF = window.CON_PALETTES || [];
          const pal = CON_PALETTES_REF[g.paletteIdx] || ['rgba(240,240,240,0.5)', '#111', '#111'];
          el.style.borderColor = pal[2] || '#111';
          el.style.color = pal[1] || '#111';
          const bgRaw = pal[0] || '#ffffff';
          if (bgRaw === '#ffffff') {
            el.style.background = 'rgba(240,240,240,0.5)';
          } else {
            const r = parseInt(bgRaw.slice(1, 3), 16);
            const gv = parseInt(bgRaw.slice(3, 5), 16);
            const b = parseInt(bgRaw.slice(5, 7), 16);
            el.style.background = `rgba(${r},${gv},${b},0.28)`;
          }
        }
      }

      // Resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'con-group-resizer';
      el.appendChild(resizeHandle);

      const groupObj = {
        id: gid, nodeIds: [...validIds], noteIds: [...(g.noteIds || [])], drawingIds: [...(g.drawingIds || [])], shapeIds: [...(g.shapeIds || [])], mediaIds: [...(g.mediaIds || [])],
        title: g.title || '', blink: !!g.blink, paletteIdx: g.paletteIdx || 0, invisible: !!g.invisible, drawingGroup: !!g.drawingGroup, phraseGroup: !!g.phraseGroup, el,
        _manualW: (g.manualW != null ? g.manualW : null),
        _manualH: (g.manualH != null ? g.manualH : null),
        _px: g.x != null ? g.x : null,
        _py: g.y != null ? g.y : null,
        _titleX: g.titleX != null ? g.titleX : null,
        _titleY: g.titleY != null ? g.titleY : null,
        _titleW: g.titleW != null ? g.titleW : null,
        _titleFS: g.titleFS != null ? g.titleFS : null
      };
      groupsArr.push(groupObj);
      if (typeof window.conGroupAttach === 'function') {
        window.conGroupAttach(groupObj);
      } else if (typeof window.conGroupAttachEvents === 'function') {
        window.conGroupAttachEvents(groupObj);
      }
      if (groupObj.blink) el.classList.add('con-group-blink');
      if (groupObj.phraseGroup) {
        requestAnimationFrame(() => {
          if (window.conPhraseGroupLayout) window.conPhraseGroupLayout(groupObj);
        });
      }
      if (typeof window.conGroupRefit === 'function') window.conGroupRefit(groupObj);
      else _conGroupRefit(groupObj);
    }

    function _conGroupRefit(group) {
      if (typeof window.conGroupRefit === 'function') {
        window.conGroupRefit(group);
        return;
      }
      const PAD = 18;
      // Respect manual size
      if (group._manualW != null && group._manualH != null) {
        group.el.style.width = group._manualW + 'px';
        group.el.style.height = group._manualH + 'px';
        if (group._px != null) group.el.style.left = group._px + 'px';
        if (group._py != null) group.el.style.top = group._py + 'px';
        return;
      }
      const allRects = [];
      conGetNodes().filter(n => group.nodeIds.includes(n.id)).forEach(n => {
        const nw = (n.el && n.el.offsetWidth > 0) ? n.el.offsetWidth : (parseFloat(n.el.style.width) || 80);
        const nh = (n.el && n.el.offsetHeight > 0) ? n.el.offsetHeight : (parseFloat(n.el.style.height) || 28);
        allRects.push({ x: n.x, y: n.y, w: nw, h: nh });
      });
      (group.noteIds || []).forEach(nid => {
        const nd = (typeof conNotes !== 'undefined' ? conNotes : []).find(n => n.id === nid);
        const el = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nid) : document.querySelector(`.con-word-note[data-id="${nid}"]`);
        if (nd) {
          const nw = (el && el.offsetWidth > 0) ? el.offsetWidth : (typeof nd.width === 'number' && nd.width > 0 ? nd.width : 80);
          const nh = (el && el.offsetHeight > 0) ? el.offsetHeight : (typeof nd.height === 'number' && nd.height > 0 ? nd.height : 28);
          allRects.push({ x: nd.x, y: nd.y, w: nw, h: nh });
        }
      });
      const drawings = window.conGetDrawings ? window.conGetDrawings() : [];
      (group.drawingIds || []).forEach(did => {
        const dr = drawings.find(d => d.id === did);
        if (dr) allRects.push({ x: dr.x, y: dr.y, w: dr.w || 40, h: dr.h || 40 });
      });
      if (!allRects.length) return;
      const minX = Math.min(...allRects.map(r => r.x)) - PAD;
      const minY = Math.min(...allRects.map(r => r.y)) - PAD;
      const maxX = Math.max(...allRects.map(r => r.x + r.w)) + PAD;
      const maxY = Math.max(...allRects.map(r => r.y + r.h)) + PAD;
      group.el.style.left = minX + 'px';
      group.el.style.top = minY + 'px';
      group.el.style.width = (maxX - minX) + 'px';
      group.el.style.height = (maxY - minY) + 'px';
    }


  Board.pages = Board.pages || {};

  // Backward compatibility exports for HTML attributes & cross-module calls
  window.openSessionLoadPopup = global.openSessionLoadPopup = openSessionLoadPopup;
  window.closeSessionLoadPopup = global.closeSessionLoadPopup = closeSessionLoadPopup;
  window.sessionLoadFromFile = global.sessionLoadFromFile = sessionLoadFromFile;
  window.conExport = global.conExport = conExport;
  window.conPdfPickerClose = global.conPdfPickerClose = conPdfPickerClose;
  window._doConExportPDF = global._doConExportPDF = _doConExportPDF;
  window.conCloseExportSettingsModal = global.conCloseExportSettingsModal = conCloseExportSettingsModal;
  window.conOnExportQualitySlider = global.conOnExportQualitySlider = conOnExportQualitySlider;
  window.conApplyExportQualityPreset = global.conApplyExportQualityPreset = conApplyExportQualityPreset;
  window.conOnExportSettingsChange = global.conOnExportSettingsChange = conOnExportSettingsChange;
  window.conExecuteExportWithOptions = global.conExecuteExportWithOptions = conExecuteExportWithOptions;
  window.conSaveSession = global.conSaveSession = conSaveSession;
  window.conDuplicateCurrentFile = global.conDuplicateCurrentFile = conDuplicateCurrentFile;
  window.conLoadSession = global.conLoadSession = conLoadSession;
  window.conOpenTemplatePopup = global.conOpenTemplatePopup = conOpenTemplatePopup;
  window.conCloseTemplatePopup = global.conCloseTemplatePopup = conCloseTemplatePopup;
  window.conSaveTemplate = global.conSaveTemplate = conSaveTemplate;
  window.conLoadTemplateFromFile = global.conLoadTemplateFromFile = conLoadTemplateFromFile;
  window.conOpenCompetenceModal = global.conOpenCompetenceModal = conOpenCompetenceModal;
  window.conCloseCompetenceModal = global.conCloseCompetenceModal = conCloseCompetenceModal;
  window.conToggleCompFilterSelected = global.conToggleCompFilterSelected = conToggleCompFilterSelected;
  window.conFilterCompetencePicker = global.conFilterCompetencePicker = conFilterCompetencePicker;
  window.conSelectAllVisibleCompetences = global.conSelectAllVisibleCompetences = conSelectAllVisibleCompetences;
  window.conApplyPlannerSuggestedCompetences = global.conApplyPlannerSuggestedCompetences = conApplyPlannerSuggestedCompetences;
  window.conApplySelectedCompetences = global.conApplySelectedCompetences = conApplySelectedCompetences;
  window.conCtxOpenCompetenceModal = global.conCtxOpenCompetenceModal = conCtxOpenCompetenceModal;
  window.conBuildPageSnapshot = global.conBuildPageSnapshot = conBuildPageSnapshot;
  window._conRestorePageToBoard = global._conRestorePageToBoard = _conRestorePageToBoard;
  window.conRestorePageToBoard = global.conRestorePageToBoard = _conRestorePageToBoard;
  window.conTitle = global.conTitle = window.conTitle || conTitle;

  window.boardSetDirty = global.boardSetDirty = boardSetDirty;
  window._conCurrentCompetences = global._conCurrentCompetences = _conCurrentCompetences;
  window.conRenderHeaderCompetenceBar = global.conRenderHeaderCompetenceBar = conRenderHeaderCompetenceBar;
  window.conUpdateNodeCompetenceBadge = global.conUpdateNodeCompetenceBadge = conUpdateNodeCompetenceBadge;
  window.conBuildSessionData = global.conBuildSessionData = conBuildSessionData;
  window.renderSessionLoadPopup = global.renderSessionLoadPopup = renderSessionLoadPopup;
  window.boardResetAutosaveInterval = global.boardResetAutosaveInterval = boardResetAutosaveInterval;
  window.conShowVersionHistory = global.conShowVersionHistory = conShowVersionHistory;
  window._conRestoreSession = global._conRestoreSession = _conRestoreSession;
  window.boardUpdateDocumentTitle = global.boardUpdateDocumentTitle = boardUpdateDocumentTitle;
  window.boardRestoreLocalSessionEntry = global.boardRestoreLocalSessionEntry = boardRestoreLocalSessionEntry;
  window.conSessionHasContent = global.conSessionHasContent = conSessionHasContent;
  window.taBuildSessionData = global.taBuildSessionData = taBuildSessionData;
  window.taSessionHasContent = global.taSessionHasContent = taSessionHasContent;
  window.conSaveSessionFolderBundle = global.conSaveSessionFolderBundle = conSaveSessionFolderBundle;
  window.conExportJS = global.conExportJS = conExportJS;
  window._boardScheduleSave = global._boardScheduleSave = _boardScheduleSave;
  window._conBuildBoardCanvas = global._conBuildBoardCanvas = _conBuildBoardCanvas;
  window.conResolveMiniPageSnapshotUrl = global.conResolveMiniPageSnapshotUrl = conResolveMiniPageSnapshotUrl;
  window.boardAutosaveSection = global.boardAutosaveSection = boardAutosaveSection;
  window.conQueueCurrentPageSnapshotPng = global.conQueueCurrentPageSnapshotPng = conQueueCurrentPageSnapshotPng;
  window.boardAutosaveAllNow = global.boardAutosaveAllNow = boardAutosaveAllNow;
  window.sessionLoadHandleClassGroupChange = global.sessionLoadHandleClassGroupChange = sessionLoadHandleClassGroupChange;
  window._conPageSnapshotPngs = global._conPageSnapshotPngs = _conPageSnapshotPngs;
  window.initBoardSessionAutosave = global.initBoardSessionAutosave = initBoardSessionAutosave;
  window.initBoardCloseUnsavedGuard = global.initBoardCloseUnsavedGuard = initBoardCloseUnsavedGuard;
  window.conPerformAutosaveOnClose = global.conPerformAutosaveOnClose = conPerformAutosaveOnClose;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBoardCloseUnsavedGuard);
    } else {
      initBoardCloseUnsavedGuard();
    }
  }

})(typeof window !== "undefined" ? window : this);