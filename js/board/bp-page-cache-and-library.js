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
  // _conPageSnapshotPngs is shared globally via board-state.js descriptors
  var _conCopiedPages = global._conCopiedPages = global._conCopiedPages || [];
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

        const addMenuItem = (iconFile, label, handler, opts) => {
          const item = document.createElement('button');
          item.type = 'button';
          item.className = 'con-mini-thumb-menu-item' + (opts && opts.danger ? ' danger' : '');
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.gap = '6px';
          if (opts && opts.disabled) item.disabled = true;
          item.innerHTML = '<img src="../assets/icons/' + iconFile + '" style="width:13px;height:13px;flex-shrink:0;" alt="" /> <span>' + escapeSearchHtml(label) + '</span>';
          item.onclick = function (evt) {
            evt.stopPropagation();
            if (item.disabled) return;
            conCloseMiniThumbContextMenu();
            handler();
          };
          menu.appendChild(item);
        };

        addMenuItem(
          'eye.svg',
          typeof t === 'function' ? t('conOpenPageImageInNewWindow') : 'Open image in new window',
          () => { if (typeof window.conOpenPageSnapshotWindow === 'function') window.conOpenPageSnapshotWindow(pageIndex); }
        );
        addMenuItem(
          'external-link.svg',
          typeof t === 'function' ? t('conOpenPageInNewWindow') : 'Open page in new window',
          () => { if (typeof window.conOpenPageInNewWindow === 'function') window.conOpenPageInNewWindow(pageIndex); }
        );
        addMenuItem(
          'copy.svg',
          typeof t === 'function' ? t('conCopyPage') : 'Copy page',
          () => { if (typeof window.conCopyPage === 'function') window.conCopyPage(pageIndex); }
        );
        addMenuItem(
          'paste.svg',
          typeof t === 'function' ? t('conPastePage') : 'Paste page',
          () => { if (typeof window.conPastePage === 'function') window.conPastePage(pageIndex); },
          { disabled: typeof conHasCopiedPages === 'function' ? !conHasCopiedPages() : true }
        );
        addMenuItem(
          'duplicate.svg',
          typeof t === 'function' ? t('conDuplicatePage') : 'Duplicate page',
          () => { conDuplicatePageMiniThumb(pageIndex); }
        );
        addMenuItem(
          'delete.svg',
          typeof t === 'function' ? t('conDeletePage') : 'Delete page',
          () => { conDeletePageMiniThumb(pageIndex); },
          { danger: true }
        );

        document.body.appendChild(menu);

        const menuWidth = menu.offsetWidth || 220;
        const menuHeight = menu.offsetHeight || 220;
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
            masks: (window.conGetMasks ? window.conGetMasks() : (window.conMasks ? window.conMasks : [])).slice(),
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
        // NEVER call el.remove() on the detached DOM nodes preserved in cache.
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
        const liveMasks = window.conGetMasks ? window.conGetMasks() : (window.conMasks || null);
        if (liveMasks && Array.isArray(liveMasks)) liveMasks.length = 0;
        if (window.conMasks && Array.isArray(window.conMasks) && window.conMasks !== liveMasks) window.conMasks.length = 0;
        if (global.conMasks && Array.isArray(global.conMasks) && global.conMasks !== liveMasks) global.conMasks.length = 0;
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
        const liveMasks = window.conGetMasks ? window.conGetMasks() : (window.conMasks || []);
        liveMasks.length = 0;
        if (Array.isArray(cached.state.masks)) {
          liveMasks.push(...cached.state.masks);
        }
        if (window.conMasks && window.conMasks !== liveMasks) {
          window.conMasks.length = 0;
          if (Array.isArray(cached.state.masks)) window.conMasks.push(...cached.state.masks);
        }
        if (global.conMasks && global.conMasks !== liveMasks) {
          global.conMasks.length = 0;
          if (Array.isArray(cached.state.masks)) global.conMasks.push(...cached.state.masks);
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

        // 4b. Verify mask element references, reconnection, and styling
        for (let i = 0; i < liveMasks.length; i++) {
          const m = liveMasks[i];
          if (!m.el || !boardEl.contains(m.el)) {
            const found = (m.id && document.getElementById(m.id))
              || boardEl.querySelector(`.con-mask-rect[data-mid="${m.id}"]`);
            if (found) m.el = found;
          }
          if (!m.el) {
            if (typeof window.conMaskBuild === 'function') {
              window.conMaskBuild(m);
            }
          } else {
            m.el.style.display = '';
            if (typeof window.conApplyMaskStyle === 'function') {
              window.conApplyMaskStyle(m);
            }
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
          mdbToast('↔ Moved page ' + (fromIdx + 1) + ' to position ' + (toIdx + 1));
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
        if (!window._conSuppressScrollToTop && typeof window.conScrollToTop === 'function') window.conScrollToTop();
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

        if (!window._conSuppressScrollToTop && typeof window.conScrollToTop === 'function') window.conScrollToTop();
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
        const pngsTarget = window._conPageSnapshotPngs || global._conPageSnapshotPngs;
        if (Array.isArray(pngsTarget)) {
          pngsTarget.splice(insertIdx, 0, ...new Array(clones.length).fill(null));
        }
        conCurrentPageIndex = insertIdx;
        _conRestorePageToBoard(clones[0]);
        conUpdatePageBar();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof conTriggerLivePageSnapshot === 'function') {
          conTriggerLivePageSnapshot();
        }
        return clones.length;
      }

      /**
       * Determines whether a given page snapshot (and active board if it matches the active page)
       * is completely blank without any nodes, notes, drawings, shapes, tables, media, or backgrounds.
       */
      function conIsPageEffectivelyEmpty(snap, isCurrentPage = false) {
        if (!snap) return true;
        if ((snap.nodes && snap.nodes.length > 0) ||
            (snap.notes && snap.notes.length > 0) ||
            (snap.drawings && snap.drawings.length > 0) ||
            (snap.shapes && snap.shapes.length > 0) ||
            (snap.tables && snap.tables.length > 0) ||
            (snap.media && snap.media.length > 0) ||
            (snap.masks && snap.masks.length > 0) ||
            snap.backgroundPdf ||
            snap.boardBg) {
          return false;
        }
        if (isCurrentPage) {
          const liveNodes = window.conGetNodes ? window.conGetNodes() : (typeof conNodes !== 'undefined' ? conNodes : []);
          const liveNotes = window.conGetNotes ? window.conGetNotes() : (typeof conNotes !== 'undefined' ? conNotes : []);
          const liveDrawings = window.conGetDrawings ? window.conGetDrawings() : (typeof conDrawings !== 'undefined' ? conDrawings : []);
          const liveShapes = window.conGetShapes ? window.conGetShapes() : (typeof conShapes !== 'undefined' ? conShapes : []);
          const liveTables = window.conTables || [];
          const liveMedia = (typeof conMediaItems !== 'undefined') ? conMediaItems : [];
          const liveMasks = window.conGetMasks ? window.conGetMasks() : (window.conMasks || []);
          if (liveNodes.length > 0 || liveNotes.length > 0 || liveDrawings.length > 0 ||
              liveShapes.length > 0 || liveTables.length > 0 || liveMedia.length > 0 ||
              liveMasks.length > 0 || (typeof conPageBackgroundPdf !== 'undefined' && conPageBackgroundPdf) ||
              (typeof _conBoardBg !== 'undefined' && _conBoardBg)) {
            return false;
          }
        }
        return true;
      }
      window.conIsPageEffectivelyEmpty = global.conIsPageEffectivelyEmpty = conIsPageEffectivelyEmpty;

      /**
       * Inserts one or more page snapshots into the board.
       * If the target page is completely empty and either the only page or the last page,
       * replaces that empty page to avoid orphaned blank pages.
       * Otherwise, safely inserts the new pages AFTER insertAfterIdx, preserving all existing
       * pages and live DOM elements without any overwrites or data loss.
       *
       * @param {number} insertAfterIdx - Page index to insert after (defaults to conCurrentPageIndex).
       * @param {Array<object>} snapshots - Array of page snapshot objects to insert.
       * @param {object} options - Optional flags ({ isImage, isPdf, replaceIfEmpty }).
       * @returns {number} The active page index after insertion.
       */
      function conInsertPageSnapshots(insertAfterIdx, snapshots, options = {}) {
        if (!Array.isArray(snapshots) || snapshots.length === 0) return conCurrentPageIndex;

        const snapsTarget = window.conPageSnapshots || global.conPageSnapshots || conPageSnapshots;
        const curIdx = conCurrentPageIndex;
        const baseIdx = (typeof insertAfterIdx === 'number' && !isNaN(insertAfterIdx) && insertAfterIdx >= 0)
          ? insertAfterIdx
          : curIdx;

        const targetSnap = snapsTarget[baseIdx];
        const isTargetEmpty = conIsPageEffectivelyEmpty(targetSnap, baseIdx === curIdx);
        const shouldReplace = isTargetEmpty && (snapsTarget.length === 1 || baseIdx === snapsTarget.length - 1) && options.replaceIfEmpty !== false;

        if (shouldReplace) {
          // Replace the single blank page or trailing blank page
          if (typeof _conInvalidatePageDomCache === 'function') {
            _conInvalidatePageDomCache(baseIdx, { silent: true });
          }
          snapsTarget.splice(baseIdx, 1, ...snapshots);
          const pngsTarget = window._conPageSnapshotPngs || global._conPageSnapshotPngs;
          if (Array.isArray(pngsTarget)) {
            pngsTarget.splice(baseIdx, 1, ...new Array(snapshots.length).fill(null));
          }
          conCurrentPageIndex = baseIdx;
          _conRestorePageToBoard(snapsTarget[conCurrentPageIndex], { scrollToTop: false });
        } else {
          // Preserve current page DOM and insert new pages AFTER baseIdx
          if (typeof _conCacheCurrentPageDom === 'function') {
            _conCacheCurrentPageDom();
          } else if (typeof conBuildPageSnapshot === 'function') {
            if (snapsTarget[curIdx]) snapsTarget[curIdx] = conBuildPageSnapshot();
          }
          if (typeof conQueueCurrentPageSnapshotPng === 'function') {
            conQueueCurrentPageSnapshotPng(curIdx);
          }

          const insertIdx = Math.max(0, Math.min(baseIdx + 1, snapsTarget.length));

          // Remap cached DOM for all pages at or after insertIdx
          if (typeof _conRemapPageDomCacheOnInsertCount === 'function') {
            _conRemapPageDomCacheOnInsertCount(insertIdx, snapshots.length);
          } else if (typeof _conRemapPageDomCacheOnInsert === 'function') {
            for (let k = 0; k < snapshots.length; k++) {
              _conRemapPageDomCacheOnInsert(insertIdx + k);
            }
          }

          snapsTarget.splice(insertIdx, 0, ...snapshots);
          const pngsTarget = window._conPageSnapshotPngs || global._conPageSnapshotPngs;
          if (Array.isArray(pngsTarget)) {
            pngsTarget.splice(insertIdx, 0, ...new Array(snapshots.length).fill(null));
          }

          conCurrentPageIndex = insertIdx;
          _conRestorePageToBoard(snapsTarget[conCurrentPageIndex], { scrollToTop: false });
        }

        // Update UI, strips, thumbnails, and sync
        const strip = document.getElementById('con-page-mini-strip');
        if (strip) strip.dataset.pageCount = '';
        if (typeof conUpdatePageBar === 'function') conUpdatePageBar();
        if (typeof window.conUpdatePageBar === 'function') window.conUpdatePageBar();
        if (typeof conRenderAttachmentSummary === 'function') conRenderAttachmentSummary();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof conTriggerLivePageSnapshot === 'function') conTriggerLivePageSnapshot();
        if (!window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        }
        const pagesOverlay = document.getElementById('con-pages-overlay');
        if (pagesOverlay && pagesOverlay.classList.contains('active') && typeof window.conOpenPagePreview === 'function') {
          window.conOpenPagePreview();
        }

        return conCurrentPageIndex;
      }
      window.conInsertPageSnapshots = global.conInsertPageSnapshots = conInsertPageSnapshots;

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

      window.conCopyPage = async function (targetIdx) {
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
        const idx = typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < conPageSnapshots.length
          ? targetIdx
          : conCurrentPageIndex;
        const snap = conPageSnapshots[idx];
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
        mdbToast('1 page copied — use Paste Page to insert a duplicate');
      };

      window.conPastePage = function (insertAfterIdx) {
        const pkg = conGetCopiedPagesPackage();
        if (!pkg || !pkg.pages || pkg.pages.length === 0) return;
        conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
        const baseIdx = typeof insertAfterIdx === 'number' && insertAfterIdx >= 0 && insertAfterIdx < conPageSnapshots.length
          ? insertAfterIdx
          : conCurrentPageIndex;
        const insertIdx = baseIdx + 1;
        const count = conPasteCopiedPagesPackage(pkg, insertIdx);
        mdbToast('Pasted ' + count + ' page' + (count === 1 ? '' : 's') + ' starting at page ' + (conCurrentPageIndex + 1));
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
      let _conPremadeTargetPos = null;

      window.conOpenPremadeLibraryModal = async function (targetPos, targetY) {
        if (targetPos && typeof targetPos === 'object' && Number.isFinite(Number(targetPos.x)) && Number.isFinite(Number(targetPos.y))) {
          _conPremadeTargetPos = { x: Number(targetPos.x), y: Number(targetPos.y) };
        } else if (Number.isFinite(Number(targetPos)) && Number.isFinite(Number(targetY))) {
          _conPremadeTargetPos = { x: Number(targetPos), y: Number(targetY) };
        } else {
          _conPremadeTargetPos = null;
        }
        if (typeof window.conBoardCtxClose === 'function') window.conBoardCtxClose();
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
        _conPremadeTargetPos = null;
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

        const pinnedList = (typeof window.getBoardQuickActionsList === 'function')
          ? window.getBoardQuickActionsList()
          : [];

        const filtered = items.filter(item => {
          if (_conActiveLibCategory === 'pinned') {
            if (!pinnedList.includes('lib:' + item.id)) return false;
          } else if (_conActiveLibCategory !== 'all' && item.category !== _conActiveLibCategory) {
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
          const isPinned = pinnedList.includes('lib:' + item.id);
          const pinTitle = isPinned
            ? ((typeof i18n !== 'undefined' && i18n.t ? i18n.t('conUnpinFromMenu') : null) || 'Unpin from Menu Bar')
            : ((typeof i18n !== 'undefined' && i18n.t ? i18n.t('conPinToMenu') : null) || 'Pin to Menu Bar');
          const pinLabel = isPinned
            ? ((typeof i18n !== 'undefined' && i18n.t ? i18n.t('conPinnedToMenu') : null) || 'Pinned')
            : ((typeof i18n !== 'undefined' && i18n.t ? i18n.t('conPinToMenu') : null) || 'Pin');

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
                <button type="button" class="con-lib-pin-btn ${isPinned ? 'pinned active' : ''}" onclick="conToggleLibraryPin('${item.id}', event)" title="${pinTitle}">
                  <img src="../assets/icons/pin.svg" class="btn-icon" alt="" />
                  <span>${pinLabel}</span>
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
        const targetPos = _conPremadeTargetPos;
        conClosePremadeLibraryModal();
        if (targetPos && Number.isFinite(targetPos.x) && Number.isFinite(targetPos.y)) {
          conInsertPremadeItem(item, targetPos.x, targetPos.y);
        } else {
          conInsertPremadeItem(item);
        }
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
            videoDuration: (typeof n.videoDuration === 'number') ? n.videoDuration : null,
            isLink: !!(n.isLink || n.isBookmark),
            linkType: n.linkType || null,
            linkTarget: n.linkTarget || null,
            linkTitle: n.linkTitle || null,
            linkSubTitle: n.linkSubTitle || null,
            linkUrn: n.linkUrn || null,
            bookmarkId: n.bookmarkId || null,
            tags: (Array.isArray(n.tags) && n.tags.length) ? n.tags.slice() : undefined
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
            dashStyle: d.dashStyle || 'solid',
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
            videoDuration: (typeof node.videoDuration === 'number') ? node.videoDuration : null,
            isLink: !!(node.isLink || node.isBookmark),
            linkType: node.linkType || null,
            linkTarget: node.linkTarget || null,
            linkTitle: node.linkTitle || null,
            linkSubTitle: node.linkSubTitle || null,
            linkUrn: node.linkUrn || null,
            bookmarkId: node.bookmarkId || null,
            tags: (Array.isArray(node.tags) && node.tags.length) ? node.tags.slice() : undefined
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

            var _tb = (m.brightness != null && Number.isFinite(Number(m.brightness))) ? Number(m.brightness) : 100;
            var _tc = (m.contrast != null && Number.isFinite(Number(m.contrast))) ? Number(m.contrast) : 100;
            var _ts = (m.saturation != null && Number.isFinite(Number(m.saturation))) ? Number(m.saturation) : 100;
            var _hasF = (_tb !== 100 || _tc !== 100 || _ts !== 100);

            if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
              try {
                if (_hasF) ctx.filter = 'brightness(' + _tb + '%) contrast(' + _tc + '%) saturate(' + _ts + '%)';
                ctx.drawImage(cachedImg, mx, my, mw, mh);
                if (_hasF) ctx.filter = 'none';
                drawn = true;
              } catch (_) { }
            }

            if (!drawn) {
              const liveImg = document.querySelector('.con-media-item[data-id="' + m.id + '"] img');
              if (liveImg && liveImg.complete && liveImg.naturalWidth > 0) {
                try {
                  if (_hasF) ctx.filter = 'brightness(' + _tb + '%) contrast(' + _tc + '%) saturate(' + _ts + '%)';
                  ctx.drawImage(liveImg, mx, my, mw, mh);
                  if (_hasF) ctx.filter = 'none';
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
              ctx.fillText('', mx + mw / 2, my + mh / 2);

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
            ctx.fillText(' PDF', mx + mw / 2, my + mh / 2);
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
            ctx.fillText(kind === 'sounds' ? '' : '', mx + mw / 2, my + mh / 2);
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
          delBtn.textContent = 'x';
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
        if (typeof global.conGetMultiSelected === 'function' && global.conGetMultiSelected !== window.conGetMultiSelected) {
          try { return global.conGetMultiSelected(); } catch (e) { }
        }
        if (typeof window.conMultiSelected !== 'undefined' && window.conMultiSelected) return window.conMultiSelected;
        if (typeof global.conMultiSelected !== 'undefined' && global.conMultiSelected) return global.conMultiSelected;
        if (typeof conMultiSelected !== 'undefined' && conMultiSelected) return conMultiSelected;
        return new Set();
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
        const allMedia = (typeof window.conGetMediaItems === 'function')
          ? window.conGetMediaItems()
          : ((typeof conMediaItems !== 'undefined' && Array.isArray(conMediaItems)) ? conMediaItems : []);
        allMedia.forEach(m => {
          if (typeof conMediaSelected !== 'undefined') conMediaSelected.add(m.id);
          const mEl = document.querySelector(`.con-media-item[data-id="${m.id}"]`) || (m.wrap || null);
          if (mEl) mEl.classList.add('con-media-selected');
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
        if (window._conMaskCtxId) {
          if (typeof window.conMaskCtxDelete === 'function') window.conMaskCtxDelete();
          return;
        }
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
              const shapesList = (typeof window.conGetShapes === 'function') ? window.conGetShapes() : (window.conShapes || conShapes || []);
              const idx = shapesList.findIndex(x => x && (x.id === sid || String(x.id) === String(sid)));
              if (idx !== -1) {
                const s = shapesList[idx];
                if (s && s.el) s.el.remove();
                shapesList.splice(idx, 1);
              }
              [typeof conShapes !== 'undefined' ? conShapes : null, global.conShapes, window.conShapes].forEach(arr => {
                if (arr && arr !== shapesList) {
                  const i = arr.findIndex(x => x && (x.id === sid || String(x.id) === String(sid)));
                  if (i !== -1) arr.splice(i, 1);
                }
              });
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
            const sMid = String(mid);
            const _edgeList = (typeof window.conGetEdges === 'function') ? window.conGetEdges() : ((typeof conEdges !== 'undefined' && Array.isArray(conEdges)) ? conEdges : (window.conEdges || []));
            for (let i = _edgeList.length - 1; i >= 0; i--) {
              const e = _edgeList[i];
              if (e && (String(e.a) === sMid || String(e.b) === sMid)) {
                if (e.g && typeof e.g.remove === 'function') e.g.remove();
                _edgeList.splice(i, 1);
                if (window._conSelectedEdgeId === e.id) window._conSelectedEdgeId = null;
                if (typeof window._conMirrorSend === 'function') {
                  window._conMirrorSend({ type: 'edge-remove', id: String(e.id) });
                }
              }
            }
            if (typeof conMediaItems !== 'undefined') {
              conMediaItems = conMediaItems.filter(m => String(m.id) !== String(mid));
            }
            if (typeof conGroups !== 'undefined') {
              conGroups.forEach(g => { if (g.mediaIds) g.mediaIds = g.mediaIds.filter(id => String(id) !== String(mid)); });
            }
          });
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
          if (window.conMediaClearSelection) window.conMediaClearSelection();
        }
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
        if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      };
      window.conToggleMaskSelected = function () {
        const liveNodes = (typeof window.conGetNodes === 'function')
          ? window.conGetNodes()
          : ((typeof conNodes !== 'undefined' && Array.isArray(conNodes)) ? conNodes : (window.conNodes || global.conNodes || []));
        const allNotes = (typeof window.conGetNotes === 'function')
          ? window.conGetNotes()
          : ((typeof conNotes !== 'undefined' && Array.isArray(conNotes)) ? conNotes : (window.conNotes || global.conNotes || []));
        const allMedia = (typeof conMediaItems !== 'undefined' && Array.isArray(conMediaItems))
          ? conMediaItems
          : (window.conMediaItems || global.conMediaItems || []);

        let selectedNodes = [];
        let selectedNotes = [];
        let selectedMedia = [];

        // 1. Check if note styling overlay or note inline editor is actively open
        const isNoteOverlayActive = !!(document.getElementById('wn-style-overlay') && document.getElementById('wn-style-overlay').classList.contains('active'));
        const isNoteCtxActive = !!(document.getElementById('con-note-ctx-menu') && document.getElementById('con-note-ctx-menu').style.display !== 'none');
        const isNoteFocused = !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.con-word-note'));
        const activeNoteObj = ((isNoteOverlayActive || isNoteFocused) && typeof _wnActiveNote !== 'undefined' && _wnActiveNote && _wnActiveNote.id)
          ? _wnActiveNote
          : ((isNoteCtxActive && typeof _conNoteCtxData !== 'undefined' && _conNoteCtxData && _conNoteCtxData.id) ? _conNoteCtxData : null);

        // 2. Check if media styling overlay is actively open
        const isImgOverlayActive = !!(document.getElementById('con-img-style-overlay') && document.getElementById('con-img-style-overlay').classList.contains('active'));
        const isPdfOverlayActive = !!(document.getElementById('con-pdf-style-overlay') && document.getElementById('con-pdf-style-overlay').classList.contains('active'));
        const isSoundOverlayActive = !!(document.getElementById('con-sound-style-overlay') && document.getElementById('con-sound-style-overlay').classList.contains('active'));
        const activeMediaObj = ((isImgOverlayActive || isPdfOverlayActive || isSoundOverlayActive) && typeof window._conCtxItem !== 'undefined' && window._conCtxItem && window._conCtxItem.id)
          ? window._conCtxItem
          : null;

        // 3. Check for single node selection
        const singleNodeId = (typeof window.conGetSelected === 'function' ? window.conGetSelected() : null) || window.conSelected || global.conSelected || null;

        // 4. Resolve multi-selection sets
        const multiNodeSet = (typeof window.conGetMultiSelected === 'function' ? window.conGetMultiSelected() : null) || window.conMultiSelected || global.conMultiSelected || (typeof conMultiSelected !== 'undefined' ? conMultiSelected : null);
        const multiNoteSet = (typeof window.conGetNoteSelected === 'function' ? window.conGetNoteSelected() : null) || window.conNoteSelected || global.conNoteSelected || (typeof conNoteSelected !== 'undefined' ? conNoteSelected : null);
        const multiMediaSet = (typeof window.conGetMediaSelected === 'function' ? window.conGetMediaSelected() : null) || window.conMediaSelected || global.conMediaSelected || (typeof conMediaSelected !== 'undefined' ? conMediaSelected : null);

        const nodeMultiSize = (multiNodeSet && multiNodeSet.size) ? multiNodeSet.size : 0;
        const noteMultiSize = (multiNoteSet && multiNoteSet.size) ? multiNoteSet.size : 0;
        const mediaMultiSize = (multiMediaSet && multiMediaSet.size) ? multiMediaSet.size : 0;
        const totalMultiSize = nodeMultiSize + noteMultiSize + mediaMultiSize;

        if (activeNoteObj) {
          // Priority A: Note styling overlay or active note editor takes immediate precedence
          const found = allNotes.find(n => n && (n.id === activeNoteObj.id || String(n.id) === String(activeNoteObj.id)));
          if (found) selectedNotes = [found];
        } else if (activeMediaObj) {
          // Priority B: Media styling overlay takes immediate precedence
          const found = allMedia.find(m => m && (m.id === activeMediaObj.id || String(m.id) === String(activeMediaObj.id)));
          if (found) selectedMedia = [found];
        } else if (singleNodeId) {
          // Priority C: Exactly one single node is selected — STRICTLY toggle ONLY that node!
          const found = liveNodes.find(n => n && (n.id === singleNodeId || String(n.id) === String(singleNodeId)));
          if (found) selectedNodes = [found];
        } else if (totalMultiSize > 0) {
          // Priority D: Multi-selection or joint selection
          if (nodeMultiSize > 0) {
            selectedNodes = liveNodes.filter(n => n && (multiNodeSet.has(n.id) || multiNodeSet.has(String(n.id))));
          }
          if (noteMultiSize > 0) {
            selectedNotes = allNotes.filter(n => n && (multiNoteSet.has(n.id) || multiNoteSet.has(String(n.id))));
          }
          if (mediaMultiSize > 0) {
            selectedMedia = allMedia.filter(m => m && (multiMediaSet.has(m.id) || multiMediaSet.has(String(m.id))));
          }
        } else {
          // Priority E: DOM fallback when JS selection state might be desynced
          const domSelectedNodes = Array.from(document.querySelectorAll('#constellation-board .con-node.con-selected'));
          const domMultiNodes = Array.from(document.querySelectorAll('#constellation-board .con-node.con-multi-selected'));
          const domSelectedNotes = Array.from(document.querySelectorAll('#constellation-board .con-word-note.wn-selected, #constellation-board .ta-word-note.wn-selected'));
          const domSelectedMedia = Array.from(document.querySelectorAll('#constellation-board .con-media-item.con-media-selected'));

          if (domSelectedNodes.length === 1 && domSelectedNotes.length === 0 && domSelectedMedia.length === 0) {
            // Exactly one node has .con-selected in the DOM
            const nid = domSelectedNodes[0].id || domSelectedNodes[0].dataset.id;
            const found = liveNodes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
            if (found) selectedNodes = [found];
          } else if (domSelectedNotes.length === 1 && domSelectedNodes.length === 0 && domSelectedMedia.length === 0) {
            // Exactly one note is selected in the DOM
            const nid = domSelectedNotes[0].dataset.id || domSelectedNotes[0].id;
            const found = allNotes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
            if (found) selectedNotes = [found];
          } else if (domSelectedMedia.length === 1 && domSelectedNodes.length === 0 && domSelectedNotes.length === 0) {
            // Exactly one media item is selected in the DOM
            const mid = domSelectedMedia[0].dataset.id || domSelectedMedia[0].id;
            const found = allMedia.find(m => m && (m.id === mid || String(m.id) === String(mid)));
            if (found) selectedMedia = [found];
          } else {
            // Fallback for visual multi-selection in DOM
            domSelectedNodes.forEach(el => {
              const nid = el.id || el.dataset.id;
              const found = liveNodes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
              if (found && !selectedNodes.includes(found)) selectedNodes.push(found);
            });
            domMultiNodes.forEach(el => {
              const nid = el.id || el.dataset.id;
              const found = liveNodes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
              if (found && !selectedNodes.includes(found)) selectedNodes.push(found);
            });
            domSelectedNotes.forEach(el => {
              const nid = el.dataset.id || el.id;
              const found = allNotes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
              if (found && !selectedNotes.includes(found)) selectedNotes.push(found);
            });
            domSelectedMedia.forEach(el => {
              const mid = el.dataset.id || el.id;
              const found = allMedia.find(m => m && (m.id === mid || String(m.id) === String(mid)));
              if (found && !selectedMedia.includes(found)) selectedMedia.push(found);
            });
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
            const revealedNodes = [];
            selectedNodes.forEach(node => {
              if (!node || !node.el) return;
              const wasMasked = !!node.masked;
              node.masked = anyVisible;
              node.el.classList.toggle('con-masked', anyVisible);
              if (wasMasked && !anyVisible) revealedNodes.push(node);
            });
            // Sync node mask state to mirror view without DOM teardown
            if (typeof window._conMirrorSend === 'function') {
              window._conMirrorSend({
                type: 'node-masks',
                masks: selectedNodes.filter(n => n).map(n => ({ id: String(n.id), masked: !!n.masked }))
              });
            }
            if (revealedNodes.length && typeof window.conPlayRevealAnimation === 'function') {
              revealedNodes.forEach(node => window.conPlayRevealAnimation('node', node, node.el));
            }
          }
          if (hasNoteSelection) {
            const revealedNotes = [];
            selectedNotes.forEach(note => {
              if (!note) return;
              const wasHidden = !!note.hidden;
              note.hidden = anyVisible;
              if (typeof note._applyStyle === 'function') note._applyStyle();
              const noteEl = (typeof wnGetNoteElementById === 'function')
                ? wnGetNoteElementById(note.id)
                : document.querySelector(`.con-word-note[data-id="${note.id}"]`);
              if (typeof wnApplyHiddenState === 'function') wnApplyHiddenState(note, noteEl);
              if (wasHidden && !anyVisible && noteEl) revealedNotes.push({ note, noteEl });
              if (noteEl) {
                const hideQuickBtn = noteEl.querySelector('.wn-note-mini-btn[title*="Hide"], .wn-note-mini-btn[title*="Reveal"]');
                if (hideQuickBtn) {
                  hideQuickBtn.classList.toggle('active', !!note.hidden);
                  hideQuickBtn.title = note.hidden ? 'Reveal note' : 'Hide note';
                }
              }
              if (typeof _wnActiveNote !== 'undefined' && _wnActiveNote && _wnActiveNote.id === note.id) {
                const hideBtn = document.getElementById('wn-sp-hide-btn');
                if (hideBtn) {
                  hideBtn.innerHTML = '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" />';
                  hideBtn.classList.toggle('active', !!note.hidden);
                  hideBtn.title = note.hidden ? 'Reveal note' : 'Hide note';
                }
              }
            });
            // Sync note hidden state to mirror view without DOM teardown
            if (typeof window._conMirrorSend === 'function') {
              selectedNotes.filter(n => n).forEach(note => {
                window._conMirrorSend({ type: 'note-hide', id: String(note.id), hidden: !!note.hidden });
                window._conMirrorSend({ type: 'note-style', id: String(note.id), hidden: !!note.hidden });
              });
            }
            if (revealedNotes.length && typeof window.conPlayRevealAnimation === 'function') {
              revealedNotes.forEach(({ note, noteEl }) => window.conPlayRevealAnimation('note', note, noteEl));
            }
          }
          if (hasMediaSelection) {
            const revealedMedia = [];
            selectedMedia.forEach(m => {
              const wasHidden = !!m.hidden;
              m.hidden = anyVisible;
              const wrap = (typeof _conMediaGetWrap === 'function') ? _conMediaGetWrap(m) : document.querySelector('.con-media-item[data-id="' + m.id + '"]');
              if (wrap && typeof _conApplyMediaStyles === 'function') _conApplyMediaStyles(m, wrap);
              if (wasHidden && !anyVisible && wrap) revealedMedia.push({ m, wrap });
              if (typeof _conCtxItem !== 'undefined' && _conCtxItem && _conCtxItem.id === m.id) {
                const imgHideBtn = document.getElementById('con-img-sp-hide-btn');
                if (imgHideBtn) {
                  imgHideBtn.innerHTML = '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" />';
                  imgHideBtn.classList.toggle('active', !!m.hidden);
                  imgHideBtn.title = m.hidden ? 'Reveal' : 'Hide';
                }
                const pdfHideBtn = document.getElementById('con-pdf-sp-hide-btn');
                if (pdfHideBtn) {
                  pdfHideBtn.innerHTML = '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" />';
                  pdfHideBtn.classList.toggle('active', !!m.hidden);
                  pdfHideBtn.title = m.hidden ? 'Reveal' : 'Hide';
                }
              }
            });
            // Sync media hidden state to mirror view without DOM teardown
            if (typeof window._conMirrorSend === 'function') {
              selectedMedia.forEach(m => {
                window._conMirrorSend({ type: 'media-hide', id: String(m.id), hidden: !!m.hidden });
              });
            }
            if (revealedMedia.length && typeof window.conPlayRevealAnimation === 'function') {
              revealedMedia.forEach(({ m, wrap }) => window.conPlayRevealAnimation('media', m, wrap));
            }
          }
        } else {
          // If no element is selected, check if a non-phrase group is explicitly focused
          const focusedGrpId = (typeof window.conGetGroupFocused === 'function' ? window.conGetGroupFocused() : null) || window.conGroupFocused || global.conGroupFocused || (typeof conGroupFocused !== 'undefined' ? conGroupFocused : null);
          const focusedGroup = (focusedGrpId && Array.isArray(conGroups)) ? conGroups.find(g => g && g.id === focusedGrpId) : null;
          const focusedGrpEl = focusedGroup ? (focusedGroup.el || document.querySelector(`.con-group[data-id="${focusedGroup.id}"]`)) : null;
          const isGroupVisualSelected = !!(focusedGrpEl && focusedGrpEl.classList && focusedGrpEl.classList.contains('con-group-selected'));

          if (focusedGroup && isGroupVisualSelected && !focusedGroup.phraseGroup) {
            const grpNodes = (focusedGroup.nodeIds || []).map(nid => liveNodes.find(n => n.id === nid)).filter(Boolean);
            const grpNotes = (focusedGroup.noteIds || []).map(nid => allNotes.find(n => String(n.id) === String(nid))).filter(Boolean);
            const grpMedia = (focusedGroup.mediaIds || []).map(mid => allMedia.find(m => String(m.id) === String(mid))).filter(Boolean);
            if (grpNodes.length || grpNotes.length || grpMedia.length) {
              conPushUndo();
              const anyVisible = grpNodes.some(n => !n.masked) || grpNotes.some(n => !n.hidden) || grpMedia.some(m => !m.hidden);
              const grpRevealedNodes = [];
              grpNodes.forEach(node => {
                if (!node || !node.el) return;
                const wasMasked = !!node.masked;
                node.masked = anyVisible;
                node.el.classList.toggle('con-masked', anyVisible);
                if (wasMasked && !anyVisible) grpRevealedNodes.push(node);
              });
              if (grpNodes.length && typeof window._conMirrorSend === 'function') {
                window._conMirrorSend({
                  type: 'node-masks',
                  masks: grpNodes.map(nid => ({ id: String(nid.id), masked: anyVisible }))
                });
              }
              if (grpRevealedNodes.length && typeof window.conPlayRevealAnimation === 'function') {
                grpRevealedNodes.forEach(node => {
                  const opts = (!node.revealAnim && focusedGroup.revealAnim) ? { animKey: focusedGroup.revealAnim } : undefined;
                  window.conPlayRevealAnimation('node', node, node.el, opts);
                });
              }
              const grpRevealedNotes = [];
              grpNotes.forEach(note => {
                if (!note) return;
                const wasHidden = !!note.hidden;
                note.hidden = anyVisible;
                if (typeof note._applyStyle === 'function') note._applyStyle();
                const noteEl = (typeof wnGetNoteElementById === 'function')
                  ? wnGetNoteElementById(note.id)
                  : document.querySelector(`.con-word-note[data-id="${note.id}"]`);
                if (typeof wnApplyHiddenState === 'function') wnApplyHiddenState(note, noteEl);
                if (wasHidden && !anyVisible && noteEl) grpRevealedNotes.push({ note, noteEl });
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
              if (grpRevealedNotes.length && typeof window.conPlayRevealAnimation === 'function') {
                grpRevealedNotes.forEach(({ note, noteEl }) => {
                  const opts = (!note.revealAnim && focusedGroup.revealAnim) ? { animKey: focusedGroup.revealAnim } : undefined;
                  window.conPlayRevealAnimation('note', note, noteEl, opts);
                });
              }
              const grpRevealedMedia = [];
              grpMedia.forEach(m => {
                const wasHidden = !!m.hidden;
                m.hidden = anyVisible;
                const wrap = (typeof _conMediaGetWrap === 'function') ? _conMediaGetWrap(m) : document.querySelector('.con-media-item[data-id="' + m.id + '"]');
                if (wrap && typeof _conApplyMediaStyles === 'function') _conApplyMediaStyles(m, wrap);
                if (wasHidden && !anyVisible && wrap) grpRevealedMedia.push({ m, wrap });
              });
              if (grpMedia.length && typeof window._conMirrorSend === 'function') {
                grpMedia.forEach(m => {
                  window._conMirrorSend({ type: 'media-hide', id: String(m.id), hidden: anyVisible });
                });
              }
              if (grpRevealedMedia.length && typeof window.conPlayRevealAnimation === 'function') {
                grpRevealedMedia.forEach(({ m, wrap }) => {
                  const opts = (!m.revealAnim && focusedGroup.revealAnim) ? { animKey: focusedGroup.revealAnim } : undefined;
                  window.conPlayRevealAnimation('media', m, wrap, opts);
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
        const srcIds = [];
        const pushSrc = id => {
          if (!id) return;
          const s = String(id);
          if (!srcIds.includes(s)) srcIds.push(s);
        };

        // 1. Notes selected (or focused if none selected)
        const noteSel = (typeof window.conGetNoteSelected === 'function') ? window.conGetNoteSelected() : (typeof conNoteSelected !== 'undefined' ? conNoteSelected : null);
        if (noteSel && noteSel.size > 0) {
          noteSel.forEach(pushSrc);
        } else {
          const selectedNoteEls = document.querySelectorAll('#constellation-board .con-word-note.wn-selected');
          selectedNoteEls.forEach(el => { if (el.dataset && el.dataset.id) pushSrc(el.dataset.id); });
        }

        // 2. Nodes selected (single or multi-selected)
        const selNode = (typeof window.conGetSelected === 'function') ? window.conGetSelected() : (window.conSelected || (typeof conSelected !== 'undefined' ? conSelected : null));
        if (selNode) pushSrc(selNode);
        const multiSel = (typeof window.conGetMultiSelected === 'function') ? window.conGetMultiSelected() : (typeof conMultiSelected !== 'undefined' ? conMultiSelected : null);
        if (multiSel && multiSel.size > 0) {
          multiSel.forEach(pushSrc);
        }
        document.querySelectorAll('#constellation-board .con-node.con-selected, #constellation-board .con-node.con-multi-selected').forEach(el => {
          if (el.id) pushSrc(el.id);
        });

        // 3. Drawings selected
        const drawSel = (typeof window.conGetDrawingSelected === 'function') ? window.conGetDrawingSelected() : (typeof conDrawingSelected !== 'undefined' ? conDrawingSelected : null);
        if (drawSel && drawSel.size > 0) {
          drawSel.forEach(pushSrc);
        } else {
          document.querySelectorAll('#constellation-board .con-drawing.con-drawing-selected').forEach(el => {
            if (el.dataset && el.dataset.did) pushSrc(el.dataset.did);
          });
        }

        // 4. Pictures / Media items selected
        const mediaSel = (typeof window.conGetMediaSelected === 'function') ? window.conGetMediaSelected() : (typeof conMediaSelected !== 'undefined' ? conMediaSelected : null);
        if (mediaSel && mediaSel.size > 0) {
          mediaSel.forEach(pushSrc);
        } else {
          document.querySelectorAll('#constellation-board .con-media-item.con-media-selected').forEach(el => {
            if (el.dataset && el.dataset.id) pushSrc(el.dataset.id);
          });
        }

        // 5. Fallback to focused/active element if nothing explicitly selected
        if (!srcIds.length) {
          if (document.activeElement && document.activeElement.closest) {
            const activeNoteEl = document.activeElement.closest('.con-word-note');
            if (activeNoteEl && activeNoteEl.dataset && activeNoteEl.dataset.id) pushSrc(activeNoteEl.dataset.id);
            const activeMediaEl = document.activeElement.closest('.con-media-item');
            if (!srcIds.length && activeMediaEl && activeMediaEl.dataset && activeMediaEl.dataset.id) pushSrc(activeMediaEl.dataset.id);
          }
          if (!srcIds.length && typeof _conDrawCtxId !== 'undefined' && _conDrawCtxId) {
            pushSrc(_conDrawCtxId);
          }
          if (!srcIds.length && typeof window._conActiveMediaItem !== 'undefined' && window._conActiveMediaItem && window._conActiveMediaItem.id) {
            pushSrc(window._conActiveMediaItem.id);
          } else if (!srcIds.length && typeof _conCtxItem !== 'undefined' && _conCtxItem && _conCtxItem.id) {
            pushSrc(_conCtxItem.id);
          }
          if (!srcIds.length) {
            const focusedGroup = (typeof window.conGetGroupFocused === 'function') ? window.conGetGroupFocused() : (window.conGroupFocused || (typeof conGroupFocused !== 'undefined' ? conGroupFocused : null));
            if (focusedGroup) pushSrc(focusedGroup);
          }
        }

        if (!srcIds.length) return;

        const currentLinkIds = (typeof window.conGetLinkSrcIds === 'function')
          ? window.conGetLinkSrcIds()
          : ((typeof window.conGetLinkSrc === 'function' ? window.conGetLinkSrc() : (window._conLinkSrc || (typeof _conLinkSrc !== 'undefined' ? _conLinkSrc : null))) ? [String(typeof window.conGetLinkSrc === 'function' ? window.conGetLinkSrc() : (window._conLinkSrc || _conLinkSrc))] : []);
        const isSameSet = currentLinkIds.length === srcIds.length && srcIds.every(id => currentLinkIds.includes(id));
        if (isSameSet) {
          if (typeof window._conCancelLinkMode === 'function') window._conCancelLinkMode();
          else if (typeof window.conCancelLinkMode === 'function') window.conCancelLinkMode();
          else if (typeof _conCancelLinkMode === 'function') _conCancelLinkMode();
          return;
        }
        if (typeof window._conStartLinkMode === 'function') {
          window._conStartLinkMode(srcIds);
        } else if (typeof _conStartLinkMode === 'function') {
          _conStartLinkMode(srcIds);
        }
      };
      window.conAdjustSelectedFontSize = function (delta) {
        if (!delta) return;

        // A node (or multi-node) selection wins over a STALE saved note text selection: only treat
        // this as a text-in-note operation when focus / the live selection is really inside a note editor.
        const _nodeSel = (typeof conSelected !== 'undefined' && conSelected) || (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0);
        const _ae = document.activeElement;
        const _focusInNoteEditor = !!(_ae && _ae.closest && _ae.closest('.wn-note-editor'));
        let _liveSelInNoteEditor = false;
        try {
          const _s = window.getSelection && window.getSelection();
          if (_s && _s.rangeCount > 0 && !_s.isCollapsed) {
            const _a = _s.getRangeAt(0).commonAncestorContainer;
            const _el = _a && _a.nodeType === 1 ? _a : (_a ? _a.parentElement : null);
            _liveSelInNoteEditor = !!(_el && _el.closest && _el.closest('.wn-note-editor'));
          }
        } catch (_) {}
        const _skipTextPath = !!_nodeSel || (!_focusInNoteEditor && !_liveSelInNoteEditor);

        const hasTextSel = !_skipTextPath && ((typeof window.wnHasNoteTextSelection === 'function' && window.wnHasNoteTextSelection()) ||
          (typeof window.wnGetActiveNoteTextSelection === 'function' && !!window.wnGetActiveNoteTextSelection()));

        if (!_skipTextPath && typeof window.wnAdjustSelectionOrNoteFontSize === 'function' && window.wnAdjustSelectionOrNoteFontSize(delta)) {
          return;
        }

        // If user has text selected in a note, NEVER fall through to resizing the whole note!
        if (hasTextSel) {
          return;
        }

        const hasNodeSelection = conSelected || (conMultiSelected && conMultiSelected.size > 0);
        const allLiveNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : (typeof conNotes !== 'undefined' ? conNotes : []);
        let effActiveNote = (typeof _wnActiveNote !== 'undefined' && _wnActiveNote) ? _wnActiveNote : (window._wnActiveNote || null);
        if (!effActiveNote && document.activeElement) {
          const noteEl = document.activeElement.closest('.con-word-note, .ta-word-note');
          if (noteEl && noteEl.dataset && noteEl.dataset.id) {
            effActiveNote = allLiveNotes.find(n => n && String(n.id) === String(noteEl.dataset.id));
          }
        }
        const noteTargetsSet = new Set();
        if (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0) {
          allLiveNotes.forEach(n => {
            if (conNoteSelected.has(n.id) || conNoteSelected.has(String(n.id))) {
              noteTargetsSet.add(n);
            }
          });
        }
        if (noteTargetsSet.size === 0 && effActiveNote) {
          noteTargetsSet.add(effActiveNote);
        }
        const noteTargets = Array.from(noteTargetsSet);
        const hasNoteSelection = noteTargets.length > 0;

        if (!hasNodeSelection && !hasNoteSelection) return;
        const targets = hasNodeSelection
          ? ((conMultiSelected && conMultiSelected.size > 0)
              ? conNodes.filter(n => conMultiSelected.has(n.id))
              : [conNodes.find(n => n.id === conSelected)].filter(Boolean))
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
            const current = parseFloat(note.fontSize) || 16;
            const next = delta > 0 ? Math.min(current + delta, 96) : Math.max(current + delta, 4);
            if (current === next) return;
            const oldBase = current;
            const zoom = (window.conGetZoom && note.id && String(note.id).startsWith('cn')) ? window.conGetZoom() : 1;
            const noteEl = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(note.id) : (document.querySelector ? document.querySelector('.con-word-note[data-id="' + note.id + '"]') : null);
            const editor = noteEl ? noteEl.querySelector('.wn-note-editor, textarea') : null;
            if (editor && editor.tagName !== 'TEXTAREA') {
              editor.querySelectorAll('[style*="font-size"]').forEach(el => {
                const match = el.style.fontSize.match(/^([\d.]+)px$/);
                // Additive step (same delta as the note base) so every span/li moves by exactly the same
                // amount per keystroke; proportional scaling + rounding made list/inline sizes drift unevenly.
                if (match) {
                  const elBase = Math.round(parseFloat(match[1]) / zoom);
                  const elNext = Math.max(4, Math.min(96, elBase + (next - oldBase)));
                  el.style.fontSize = Math.round(elNext * zoom) + 'px';
                }
              });
              editor.querySelectorAll('[style*="font-size"]').forEach(el => {
                const p = el.parentElement ? el.parentElement.closest('[style*="font-size"]') : null;
                if (p && p.style.fontSize === el.style.fontSize) {
                  el.style.fontSize = '';
                }
              });
              if (typeof wnSyncNoteDataFromEditor === 'function') wnSyncNoteDataFromEditor(note, editor);
            }
            note.fontSize = next;
            if (typeof note._applyStyle === 'function') note._applyStyle();
            if (typeof _wnActiveNote !== 'undefined' && _wnActiveNote && String(_wnActiveNote.id) === String(note.id)) {
              const szSlider = document.getElementById('wn-sp-size-slider');
              if (szSlider) szSlider.dataset.rawPx = String(next);
              const szVal = document.getElementById('wn-sp-size-val');
              const fnFmtFont = window.conFormatFontSize || (typeof conFormatFontSize === 'function' ? conFormatFontSize : null);
              if (szVal) szVal.textContent = fnFmtFont ? fnFmtFont(next, window.conFontUnit) : next + 'px';
            }
            if (window._conMirrorSend) {
              window._conMirrorSend({
                type: 'note-style',
                id: String(note.id),
                fontSize: next,
                baseWidth: note.liveBaseWidth,
                baseHeight: note.liveBaseHeight,
                width: note.width || note.liveBaseWidth,
                height: note.height || note.liveBaseHeight,
                manualSize: !!note.manualSize
              });
            }
          });
          if (noteTargets.length && typeof window.conMarkBoardDirty === 'function') {
            window.conMarkBoardDirty();
          }
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
        const isMirror = (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('con-mirror-mode')) ||
          (typeof location !== 'undefined' && location.search && location.search.indexOf('mirror=1') !== -1);
        const isExporting = (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('con-exporting')) ||
          (typeof document !== 'undefined' && document.body && document.body.classList.contains('con-exporting'));
        const el = document.getElementById('con-board-title');
        if (el) {
          el.textContent = title;
          el.style.display = (title && !isMirror && !isExporting) ? 'block' : 'none';
        }
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

      window.conExpandBoardHeight = function (deltaPx = 400, opts = {}) {
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
        if (!opts || opts.scroll !== false) {
          try {
            board.scrollBy({ top: Math.min(300, deltaPx), behavior: 'smooth' });
          } catch (_) { }
        }
        if (!opts || !opts.skipSave) {
          if (typeof boardSetDirty === 'function') boardSetDirty(true);
          if (typeof _boardScheduleSave === 'function') _boardScheduleSave('constellation');
        }
        if (typeof window._conSyncDrawOverlaySize === 'function') window._conSyncDrawOverlaySize();
        if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true, boardHeight: newH });
      };

      window.conMaybeAutoExpandBoard = function (bottomY, opts = {}) {
        if (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('con-mirror-mode')) return false;
        const board = document.getElementById('constellation-board');
        if (!board) return false;
        const currentH = board.offsetHeight || board.clientHeight || 0;
        if (!currentH) return false;
        const threshold = (opts && typeof opts.threshold === 'number') ? opts.threshold : 120;
        const yVal = Number(bottomY);
        if (!Number.isFinite(yVal) || yVal <= currentH - threshold) return false;
        const step = (opts && typeof opts.step === 'number') ? opts.step : 400;
        const minNeeded = Math.ceil(yVal + 180 - currentH);
        const delta = Math.max(step, Math.ceil(minNeeded / 200) * 200);
        window.conExpandBoardHeight(delta, {
          scroll: !!(opts && opts.scroll),
          skipSave: !!(opts && opts.skipSave)
        });
        return true;
      };

  window.conResolveMiniPageSnapshotUrl = global.conResolveMiniPageSnapshotUrl = conResolveMiniPageSnapshotUrl;

})(typeof window !== "undefined" ? window : this);
