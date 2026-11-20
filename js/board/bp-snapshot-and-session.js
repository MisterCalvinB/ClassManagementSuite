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

    // ================================================================
    // CONSTELLATION — MULTI-PAGE HELPERS
    // ================================================================

    // Fast offscreen measurement helper to guarantee accurate pixel dimensions for detached nodes
    let _conOffscreenMeasureNode = null;
    function conMeasureNodeDimensions(node) {
      if (!node) return { w: 80, h: 32 };
      if (node.el && node.el.offsetWidth > 0 && node.el.offsetHeight > 0) {
        const _boardZoom = (typeof conGetEffectiveZoom === 'function') ? conGetEffectiveZoom() : (parseFloat(window.conCurrentZoom) || 1);
        node._cachedW = Math.round(node.el.offsetWidth / _boardZoom);
        node._cachedH = Math.round(node.el.offsetHeight / _boardZoom);
        node.w = node._cachedW;
        node.h = node._cachedH;
        return { w: node._cachedW, h: node._cachedH };
      }
      if (typeof node.w === 'number' && node.w > 0 && typeof node.h === 'number' && node.h > 0) {
        return { w: node.w, h: node.h };
      }
      if (typeof node._cachedW === 'number' && node._cachedW > 0 && typeof node._cachedH === 'number' && node._cachedH > 0) {
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
      if (!note) return { w: 40, h: 40 };
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
        measurer.style.minWidth = '40px';
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

        const minBaseW = 40, maxBaseW = 460, minBaseH = 40;
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
      if (Array.isArray(snapshot.groups)) {
        const nodeMap = new Map((snapshot.nodes || []).map(n => [String(n.id), n]));
        const noteMap = new Map((snapshot.notes || []).map(n => [String(n.id), n]));
        const mediaMap = new Map((snapshot.media || []).map(m => [String(m.id), m]));
        const drawMap = new Map((snapshot.drawings || []).map(d => [String(d.id), d]));
        const shapeMap = new Map((snapshot.shapes || []).map(s => [String(s.id), s]));

        snapshot.groups.forEach(g => {
          if (!g) return;
          if (typeof g.w === 'number' && g.w > 0 && typeof g.h === 'number' && g.h > 0) return;
          const rects = [];
          (g.nodeIds || []).forEach(nid => { const n = nodeMap.get(String(nid)); if (n) rects.push({ x: n.x, y: n.y, w: n.w || 80, h: n.h || 32 }); });
          (g.noteIds || []).forEach(nid => { const nt = noteMap.get(String(nid)); if (nt && !nt.hidden) rects.push({ x: nt.x, y: nt.y, w: nt.w || 140, h: nt.h || 80 }); });
          (g.mediaIds || []).forEach(mid => { const m = mediaMap.get(String(mid)); if (m && !m.hidden) rects.push({ x: m.x, y: m.y, w: m.w || 200, h: m.h || 140 }); });
          (g.drawingIds || []).forEach(did => { const d = drawMap.get(String(did)); if (d) rects.push({ x: d.x, y: d.y, w: d.w || 1, h: d.h || 1 }); });
          (g.shapeIds || []).forEach(sid => { const s = shapeMap.get(String(sid)); if (s) rects.push({ x: s.x, y: s.y, w: s.w || 100, h: s.h || 80 }); });
          if (rects.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            rects.forEach(r => {
              if (r.x < minX) minX = r.x;
              if (r.y < minY) minY = r.y;
              if (r.x + r.w > maxX) maxX = r.x + r.w;
              if (r.y + r.h > maxY) maxY = r.y + r.h;
            });
            const pad = g.phraseGroup ? 12 : 18;
            const topExtra = (g.title || g.name) ? 18 : 0;
            g.x = minX - pad;
            g.y = minY - pad - topExtra;
            g.w = (maxX - minX) + pad * 2;
            g.h = (maxY - minY) + pad * 2 + topExtra;
          } else {
            g.w = g.w || 160;
            g.h = g.h || 64;
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
          let nw = null;
          let nh = null;
          if (n.el && n.el.offsetWidth > 0 && n.el.offsetHeight > 0) {
            nw = Math.round(n.el.offsetWidth / _noteZoom);
            nh = Math.round(n.el.offsetHeight / _noteZoom);
          } else if (typeof n.w === 'number' && n.w > 0 && typeof n.h === 'number' && n.h > 0) {
            nw = n.w;
            nh = n.h;
          } else if (typeof n._cachedW === 'number' && n._cachedW > 0 && typeof n._cachedH === 'number' && n._cachedH > 0) {
            nw = n._cachedW;
            nh = n._cachedH;
          } else {
            const measured = conMeasureNodeDimensions(n);
            nw = measured.w;
            nh = measured.h;
          }
          const finalW = nw || 80;
          const finalH = nh || 32;
          n._cachedW = finalW;
          n._cachedH = finalH;
          n.w = finalW;
          n.h = finalH;
          return {
            id: n.id,
            baseWord: n.baseWord || (n.el ? n.el.textContent.trim() : ''),
            html: n.html || (n.el && (n.el.querySelector('.katex, .wn-katex-inline, .wn-katex-display, i, b, strong, em, br, sub, sup') ? n.el.innerHTML : '')) || null,
            dbWord: n.dbWord || null,
            sourceWord: n.sourceWord || null,
            relation: n.relation || null,
            aiDef: n.aiDef || null,
            aiPos: n.aiPos || null,
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
            anim: n.anim || '',
            revealAnim: n.revealAnim || '',
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
            isLink: !!(n.isLink || n.isBookmark),
            linkType: n.linkType || null,
            linkTarget: n.linkTarget || null,
            linkTitle: n.linkTitle || null,
            linkSubTitle: n.linkSubTitle || null,
            linkUrn: n.linkUrn || null,
            bookmarkId: n.bookmarkId || null,
            tags: (Array.isArray(n.tags) && n.tags.length) ? n.tags.slice() : undefined,
            competences: (Array.isArray(n.competences) && n.competences.length) ? n.competences.slice() : undefined,
            shape: (window.conNormalizeNodeShape ? window.conNormalizeNodeShape(n.shape || (n.el && n.el.dataset.shape)) : conNormalizeNodeShapeSafe(n.shape || (n.el && n.el.dataset.shape))),
            rotation: (typeof n.rotation === 'number') ? ((typeof window.conNormalizeNodeRotation === 'function') ? window.conNormalizeNodeRotation(n.rotation) : n.rotation) : 0,
            nodeNumber: n.nodeNumber != null ? n.nodeNumber : (n.el && n.el.querySelector(':scope > .con-entity-num-badge') ? (parseInt(n.el.querySelector(':scope > .con-entity-num-badge').dataset.rawNumber, 10) || null) : null),
            nodeNumberFormat: n.nodeNumberFormat || (n.el && n.el.querySelector(':scope > .con-entity-num-badge') ? (n.el.querySelector(':scope > .con-entity-num-badge').dataset.entityFormat || null) : null)
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
          points: (Array.isArray(e.points) && e.points.length > 0) ? e.points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })) : [],
          avoidObstacles: !!e.avoidObstacles,
          colorMode: (e.colorMode === 'auto' || e.colorMode === 'manual') ? e.colorMode : undefined,
          strokeColor: e.strokeColor || null
        })),
        groups: groups.map(g => {
          let gw = (g._manualW != null) ? g._manualW : null;
          let gh = (g._manualH != null) ? g._manualH : null;
          if (gw == null && g.el) {
            gw = parseFloat(g.el.style.width) || g.el.offsetWidth || null;
          }
          if (gh == null && g.el) {
            gh = parseFloat(g.el.style.height) || g.el.offsetHeight || null;
          }
          let gx = g.el ? (parseFloat(g.el.style.left) || 0) : (g.x || 0);
          let gy = g.el ? (parseFloat(g.el.style.top) || 0) : (g.y || 0);
          return {
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
            w: gw,
            h: gh,
            x: gx,
            y: gy,
            titleX: g._titleX != null ? g._titleX : null,
            titleY: g._titleY != null ? g._titleY : null,
            titleW: g._titleW != null ? g._titleW : null,
            titleFS: g._titleFS != null ? g._titleFS : null,
            groupNumber: g.groupNumber != null ? g.groupNumber : (g.el && g.el.querySelector(':scope > .con-entity-num-badge') ? (parseInt(g.el.querySelector(':scope > .con-entity-num-badge').dataset.rawNumber, 10) || null) : null),
            groupNumberFormat: g.groupNumberFormat || (g.el && g.el.querySelector(':scope > .con-entity-num-badge') ? (g.el.querySelector(':scope > .con-entity-num-badge').dataset.entityFormat || null) : null)
          };
        }),
        masks: masks.map(m => {
          let mx = Number(m.x);
          let my = Number(m.y);
          let mw = Number(m.width || m.w);
          let mh = Number(m.height || m.h);
          if (m.el) {
            if (!Number.isFinite(mx) || mx === 0) mx = m.el.offsetLeft || 0;
            if (!Number.isFinite(my) || my === 0) my = m.el.offsetTop || 0;
            if (!Number.isFinite(mw) || mw <= 0) mw = m.el.offsetWidth || 160;
            if (!Number.isFinite(mh) || mh <= 0) mh = m.el.offsetHeight || 64;
          }
          return {
            id: m.id,
            x: Number.isFinite(mx) ? mx : 0,
            y: Number.isFinite(my) ? my : 0,
            width: (Number.isFinite(mw) && mw > 0) ? mw : 160,
            height: (Number.isFinite(mh) && mh > 0) ? mh : 64,
            color: m.color || (m.el ? m.el.style.backgroundColor : '') || '#111111',
            opacity: Number.isFinite(Number(m.opacity)) ? Number(m.opacity) : (m.el ? parseFloat(m.el.style.opacity) : 0.95) || 0.95
          };
        }),
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
            lockRatio: !!n.lockRatio,
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
            textAlign: n.textAlign || null,
            noteNumber: n.noteNumber != null ? n.noteNumber : (_noteEl && _noteEl.querySelector(':scope > .con-entity-num-badge') ? (parseInt(_noteEl.querySelector(':scope > .con-entity-num-badge').dataset.rawNumber, 10) || null) : null),
            noteNumberFormat: n.noteNumberFormat || (_noteEl && _noteEl.querySelector(':scope > .con-entity-num-badge') ? (_noteEl.querySelector(':scope > .con-entity-num-badge').dataset.entityFormat || null) : null)
          };
        }),
        drawings: (window.conGetDrawings ? window.conGetDrawings() : []).map(d => ({
          id: d.id, x: d.x, y: d.y, w: d.w, h: d.h,
          points: d.points.map(p => (p === null || p === undefined) ? null : ({ x: p.x, y: p.y })),
          color: d.color,
          thickness: d.thickness,
          opacity: Number.isFinite(d.opacity) ? d.opacity : 1
        })),
        shapes: (window.conGetShapes ? window.conGetShapes() : (window.conShapes || [])).map(s => ({
          id: s.id, type: s.type,
          x: s.x, y: s.y, w: s.w, h: s.h,
          lx1: (s.lx1 != null && !isNaN(Number(s.lx1))) ? Number(s.lx1) : s.x,
          ly1: (s.ly1 != null && !isNaN(Number(s.ly1))) ? Number(s.ly1) : s.y,
          lx2: (s.lx2 != null && !isNaN(Number(s.lx2))) ? Number(s.lx2) : (s.x + s.w),
          ly2: (s.ly2 != null && !isNaN(Number(s.ly2))) ? Number(s.ly2) : (s.y + s.h),
          color: s.color, fillColor: s.fillColor || 'none',
          thickness: s.thickness,
          opacity: Number.isFinite(s.opacity) ? s.opacity : 1,
          dashStyle: s.dashStyle || 'solid',
          arrowheadSize: s.arrowheadSize || null,
          pts: Array.isArray(s.pts) ? s.pts.map(p => ({ x: p.x, y: p.y })) : null
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
          brightness: (m.kind === 'pics' && m.brightness != null && Number(m.brightness) !== 100) ? Number(m.brightness) : undefined,
          contrast: (m.kind === 'pics' && m.contrast != null && Number(m.contrast) !== 100) ? Number(m.contrast) : undefined,
          saturation: (m.kind === 'pics' && m.saturation != null && Number(m.saturation) !== 100) ? Number(m.saturation) : undefined,
          _fullscreen: m._fullscreen ? true : undefined,
          _fsZoom: m._fullscreen ? (m._fsZoom || 1) : undefined,
          _fsPanX: m._fullscreen ? (m._fsPanX || 0) : undefined,
          _fsPanY: m._fullscreen ? (m._fsPanY || 0) : undefined,
          dataUrl: (m.dataUrl && m.dataUrl.startsWith('data:')) ? m.dataUrl : (m._resolvedDataUrl || undefined),
          base64: m.base64 || undefined,
          transcript: m.transcript || undefined,
          mediaNumber: m.mediaNumber != null ? m.mediaNumber : (document.querySelector(`.con-media-item[data-id="${m.id}"] > .con-entity-num-badge`) ? (parseInt(document.querySelector(`.con-media-item[data-id="${m.id}"] > .con-entity-num-badge`).dataset.rawNumber, 10) || null) : null),
          mediaNumberFormat: m.mediaNumberFormat || (document.querySelector(`.con-media-item[data-id="${m.id}"] > .con-entity-num-badge`) ? (document.querySelector(`.con-media-item[data-id="${m.id}"] > .con-entity-num-badge`).dataset.entityFormat || null) : null)
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
        _isExport: !!(opts && opts.isExport),
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
      const competences = Array.isArray(global._conCurrentCompetences) ? global._conCurrentCompetences.slice() : [];

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
          lockRatio: !!n.lockRatio,
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
        listEl.innerHTML = '<div class="session-load-empty"> Could not read files: '
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
        mdbToast(' This saved session is no longer available.');
        return false;
      }

      const closePopup = options.closePopup !== false;

      if (mode === 'constellation') {
        if (entry.data._type !== 'constellation') {
          mdbToast(' This entry is not a valid Constellation save.');
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
        if (typeof bpSetFromEntryIds === 'function') {
          bpSetFromEntryIds(entry.plannerEntryIds || entry.plannerEntryId || (entry.data && (entry.data._plannerEntryIds || entry.data._plannerEntryId)) || []);
        } else {
          bpSetFromEntryId(entry.plannerEntryId || '');
        }
        navTo('constellation-section');
      } else {
        mdbToast(' This section is no longer available.');
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
        mdbToast(' This saved session is no longer available.');
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

    global._boardMutationTimer = global._boardMutationTimer || null;
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
        if (global._boardMutationTimer) {
          clearTimeout(global._boardMutationTimer);
          global._boardMutationTimer = null;
        }
        return;
      }

      const now = Date.now();
      if (!_boardMutationFirstDirtyAt) {
        _boardMutationFirstDirtyAt = now;
      }

      if (global._boardMutationTimer) {
        clearTimeout(global._boardMutationTimer);
        global._boardMutationTimer = null;
      }

      const maxWaitMs = boardGetAutosaveMaxWaitMs(debounceMs);
      const elapsed = now - _boardMutationFirstDirtyAt;
      const delay = Math.max(1000, Math.min(debounceMs, maxWaitMs - elapsed));

      global._boardMutationTimer = setTimeout(function _boardMutationFire() {
        global._boardMutationTimer = null;
        if (!_boardIsDirty || (!_conCurrentFileName && !_conCurrentFolderName)) {
          _boardMutationFirstDirtyAt = 0;
          return;
        }

        // If user is currently interacting (dragging, drawing, typing, recording), defer by 2.5s
        if (boardIsUserInteracting()) {
          global._boardMutationTimer = setTimeout(_boardMutationFire, 2500);
          return;
        }

        // If a save is already in flight, wait and retry
        if (_conIsSaving) {
          global._boardMutationTimer = setTimeout(_boardMutationFire, 2000);
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
          toast.innerHTML = `<span class="con-autosave-check"></span><span class="con-autosave-text" data-i18n="conAutosaved">${savedText}</span>`;
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
        if (global._boardMutationTimer) { clearTimeout(global._boardMutationTimer); global._boardMutationTimer = null; }
        return;
      }

      const fp = boardComputeFingerprint(section, data);
      if (!force && boardAutosaveFingerprint[section] && boardAutosaveFingerprint[section] === fp) {
        boardSetDirty(false);
        _boardMutationFirstDirtyAt = 0;
        if (global._boardMutationTimer) { clearTimeout(global._boardMutationTimer); global._boardMutationTimer = null; }
        return;
      }

      // If user is actively interacting and this isn't a forced save, defer
      if (!force && boardIsUserInteracting()) {
        if (global._boardMutationTimer) clearTimeout(global._boardMutationTimer);
        global._boardMutationTimer = setTimeout(() => boardAutosaveSection(section, options), 2500);
        return;
      }

      _conIsSaving = true;
      boardShowAutosaveToast();
      let _finished = false;
      const _finishSave = (err) => {
        _conIsSaving = false;
        _conLastSaveTimestamp = Date.now();
        _boardMutationFirstDirtyAt = 0;
        if (global._boardMutationTimer) { clearTimeout(global._boardMutationTimer); global._boardMutationTimer = null; }
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
      if (global._boardMutationTimer) {
        clearTimeout(global._boardMutationTimer);
        global._boardMutationTimer = null;
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
    let _conLastReloadShortcutAt = 0;
    function initBoardCloseUnsavedGuard() {
      if (_boardCloseGuardInitialized) return;
      if (new URLSearchParams(location.search).get('mirror') === '1' || window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') return;
      _boardCloseGuardInitialized = true;

      window.addEventListener('keydown', function (ev) {
        if (ev.key === 'F5' || ((ev.ctrlKey || ev.metaKey) && String(ev.key || '').toLowerCase() === 'r')) {
          _conLastReloadShortcutAt = Date.now();
        }
      }, true);

      window.addEventListener('beforeunload', function (e) {
        const isDirty = (typeof window._boardIsDirty !== 'undefined' ? window._boardIsDirty : _boardIsDirty);
        if (!isDirty || _conIsClosing) return;

        // Prevent immediate close/reload to display autosave confirmation prompt
        e.preventDefault();
        e.returnValue = false;

        if (_conClosePromptActive) return;
        _conClosePromptActive = true;

        const reloadShortcutRecent = (Date.now() - _conLastReloadShortcutAt) < 2000;
        _conLastReloadShortcutAt = 0;

        (async function () {
          try {
            let isClosingWindow = true;
            if (window.Desktop && typeof Desktop.consumeCloseIntent === 'function') {
              const intent = await Desktop.consumeCloseIntent();
              if (intent !== null && intent !== undefined) {
                isClosingWindow = !!intent;
              } else if (reloadShortcutRecent) {
                isClosingWindow = false;
              }
            } else if (window.electronApi && typeof window.electronApi.consumeCloseIntent === 'function') {
              isClosingWindow = !!(await window.electronApi.consumeCloseIntent());
            } else if (reloadShortcutRecent) {
              isClosingWindow = false;
            }

            const title = (typeof t === 'function' ? t('conAutosaveCloseTitle') : '') || 'Unsaved Changes';
            const msg = isClosingWindow
              ? ((typeof t === 'function' ? t('conAutosaveOnClosePrompt') : '') || 'The board has unsaved changes. Would you like to save before closing?')
              : ((typeof t === 'function' ? t('conAutosaveOnReloadPrompt') : '') || 'The board has unsaved changes. Would you like to save before reloading?');
            const yesText = isClosingWindow
              ? ((typeof t === 'function' ? (t('conCloseSaveBtn') || t('btnYes')) : '') || ' Save & Close')
              : ((typeof t === 'function' ? (t('conReloadSaveBtn') || t('btnYes')) : '') || ' Save & Reload');
            const noText = (typeof t === 'function' ? (t('conCloseDiscardBtn') || t('btnNo')) : '') || ' Discard';
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
              // User cancelled close/reload; keep window open and keep dirty state intact
              _conClosePromptActive = false;
              return;
            }

            if (choice === true) {
              await conPerformAutosaveOnClose();
            }

            // User chose Save (true) or Discard (false): proceed with closing or reloading
            boardSetDirty(false);
            _conIsClosing = true;
            _conClosePromptActive = false;
            if (!isClosingWindow) {
              window.location.reload();
            } else if (window.Desktop && typeof Desktop.closeWindow === 'function') {
              Desktop.closeWindow();
            } else if (window.electronApi && typeof window.electronApi.closeWindow === 'function') {
              window.electronApi.closeWindow();
            } else {
              window.close();
            }
          } catch (err) {
            console.warn('Error during close/reload confirmation / autosave:', err);
            _conClosePromptActive = false;
          }
        })();
      });
    }

    // Shared helper: returns one {trans,ipa,def} object per DB entry for a word.
    // If no DB entries exist, returns a single empty object so the word still appears in the export.
    // Always looks up the individual word directly (ignores dbWord override) so that when a node
    // contains multiple comma/slash-separated words, each one gets its own correct DB entry.
  // Cross-module exports
  window.conEnsureSnapshotDimensions = global.conEnsureSnapshotDimensions = conEnsureSnapshotDimensions;
  window.conBuildPageSnapshot = global.conBuildPageSnapshot = conBuildPageSnapshot;
  window._conRestorePageToBoard = global._conRestorePageToBoard = _conRestorePageToBoard;
  window.conGetAllPagesNodeData = global.conGetAllPagesNodeData = conGetAllPagesNodeData;
  window.conBuildSessionData = global.conBuildSessionData = conBuildSessionData;
  window.conSessionHasContent = global.conSessionHasContent = conSessionHasContent;
  window.conSessionHasMeaningfulContent = global.conSessionHasMeaningfulContent = conSessionHasMeaningfulContent;
  window.taBuildSessionData = global.taBuildSessionData = taBuildSessionData;
  window.taSessionHasContent = global.taSessionHasContent = taSessionHasContent;
  window.openSessionLoadPopup = global.openSessionLoadPopup = openSessionLoadPopup;
  window.closeSessionLoadPopup = global.closeSessionLoadPopup = closeSessionLoadPopup;
  window.sessionLoadHandleClassGroupChange = global.sessionLoadHandleClassGroupChange = sessionLoadHandleClassGroupChange;
  window.sessionLoadFromFile = global.sessionLoadFromFile = sessionLoadFromFile;
  window.boardRestoreLocalSessionEntry = global.boardRestoreLocalSessionEntry = boardRestoreLocalSessionEntry;
  window.renderSessionLoadPopup = global.renderSessionLoadPopup = renderSessionLoadPopup;
  window.boardUpdateDocumentTitle = global.boardUpdateDocumentTitle = boardUpdateDocumentTitle;
  window.boardSetDirty = global.boardSetDirty = boardSetDirty;
  window._boardScheduleSave = global._boardScheduleSave = _boardScheduleSave;
  window.boardShowAutosaveToast = global.boardShowAutosaveToast = boardShowAutosaveToast;
  window.boardHideAutosaveToast = global.boardHideAutosaveToast = boardHideAutosaveToast;
  window.boardAutosaveSection = global.boardAutosaveSection = boardAutosaveSection;
  window.boardResetAutosaveInterval = global.boardResetAutosaveInterval = boardResetAutosaveInterval;
  window.boardAutosaveAllNow = global.boardAutosaveAllNow = boardAutosaveAllNow;
  window.initBoardSessionAutosave = global.initBoardSessionAutosave = initBoardSessionAutosave;
  window.conPerformAutosaveOnClose = global.conPerformAutosaveOnClose = conPerformAutosaveOnClose;
  window.initBoardCloseUnsavedGuard = global.initBoardCloseUnsavedGuard = initBoardCloseUnsavedGuard;

})(typeof window !== "undefined" ? window : this);
