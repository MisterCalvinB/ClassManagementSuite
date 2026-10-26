/**
 * Class Management Tools — Board GROUPS Engine
 * Extracted from pages/board.html (Lines 13397-14758)
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
  var conNodes = global.conNodes = global.conNodes || [];
  var conEdges = global.conEdges = global.conEdges || [];
  var conDrawings = global.conDrawings = global.conDrawings || [];
  var conShapes = global.conShapes = global.conShapes || [];
  var conNotes = global.conNotes = global.conNotes || [];
  var conGroups = global.conGroups = global.conGroups || [];
  var conMasks = global.conMasks = global.conMasks || [];
  var conMediaSelected = global.conMediaSelected = global.conMediaSelected || new Set();
  var conMediaItems = global.conMediaItems = global.conMediaItems || [];

  var board = global.board = window.board = window.board || function () { return document.getElementById('constellation-board'); };
  var svg = global.svg = window.svg = window.svg || function () { return document.getElementById('constellation-svg'); };

  function _getLiveNotes() {
    return (typeof window.conGetNotes === 'function')
      ? window.conGetNotes()
      : ((typeof window.conNotes !== 'undefined' && Array.isArray(window.conNotes))
          ? window.conNotes
          : ((typeof conNotes !== 'undefined' && Array.isArray(conNotes)) ? conNotes : (global.conNotes || [])));
  }

  function _getLiveMedia() {
    return (typeof window.conMediaItems !== 'undefined' && Array.isArray(window.conMediaItems))
      ? window.conMediaItems
      : ((typeof conMediaItems !== 'undefined' && Array.isArray(conMediaItems)) ? conMediaItems : (global.conMediaItems || []));
  }

      // ---- Super Groups ----
      const GROUP_PAD = 18; // padding around member nodes inside the rect
      const PHRASE_GROUP_PAD = 12; // tighter padding for invisible phrase-group containers

      function conGenerateGroupId(preferredId) {
        const existingIds = new Set();
        if (Array.isArray(conGroups)) {
          conGroups.forEach(g => { if (g && g.id != null) existingIds.add(String(g.id)); });
        }
        if (Array.isArray(window.conGroups) && window.conGroups !== conGroups) {
          window.conGroups.forEach(g => { if (g && g.id != null) existingIds.add(String(g.id)); });
        }
        if (typeof conPageSnapshots !== 'undefined' && Array.isArray(conPageSnapshots)) {
          conPageSnapshots.forEach(snap => {
            if (snap && Array.isArray(snap.groups)) {
              snap.groups.forEach(g => { if (g && g.id != null) existingIds.add(String(g.id)); });
            }
          });
        }

        if (preferredId && !existingIds.has(String(preferredId))) {
          const m = String(preferredId).match(/cg(\d+)$/i) || String(preferredId).match(/(\d+)$/);
          if (m) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num)) _conGroupNextId = Math.max(_conGroupNextId, num + 1);
          }
          return String(preferredId);
        }

        while (existingIds.has('cg' + _conGroupNextId)) {
          _conGroupNextId++;
        }
        const newId = 'cg' + (_conGroupNextId++);
        return newId;
      }
      window.conGenerateGroupId = conGenerateGroupId;

      function conSyncGroupNextId(maxIdNum) {
        if (typeof maxIdNum === 'number' && !isNaN(maxIdNum)) {
          _conGroupNextId = Math.max(_conGroupNextId, maxIdNum);
        }
      }
      window.conSyncGroupNextId = conSyncGroupNextId;

      // Each group stores a paletteIndex; bg becomes the rect background (semi-transparent)
      function conGroupPaletteBg(idx) {
        const [bg] = CON_PALETTES[idx] || CON_PALETTES[0];
        if (!bg) return 'rgba(240,240,240,0.5)';
        if (bg.startsWith('rgba') || bg.startsWith('rgb')) return bg;
        return bg === '#ffffff' ? 'rgba(240,240,240,0.5)' : bg.replace(/^#/, '') &&
          (() => { const r = parseInt(bg.slice(1, 3), 16), g = parseInt(bg.slice(3, 5), 16), b = parseInt(bg.slice(5, 7), 16); return `rgba(${r},${g},${b},0.28)`; })();
      }
      function conGroupPaletteBorder(idx) { return (CON_PALETTES[idx] || CON_PALETTES[0])[2]; }
      function conGroupPaletteText(idx) { return (CON_PALETTES[idx] || CON_PALETTES[0])[1]; }

      function conGroupCreate(nodeIds, placeholderX, placeholderY, noteIds, drawingIds, shapeIds, opts) {
        const mediaIds = (opts && (opts.mediaIds || opts.imageIds)) || (Array.isArray(arguments[7]) ? arguments[7] : []);
        const _totalGroupItems = nodeIds.length + (noteIds || []).length + (drawingIds || []).length + (shapeIds || []).length + mediaIds.length;
        if (_totalGroupItems < 2 && placeholderX === undefined) return null;
        const _isDrawingGroup = !!(opts && opts.drawingGroup);
        const _isPhraseGroup = !!(opts && opts.phraseGroup);
        const _isInvisible = !!(opts && opts.invisible);
        const id = conGenerateGroupId(opts && (opts.id || opts.groupId));
        const el = document.createElement('div');
        el.className = 'con-group' + (_isDrawingGroup ? ' con-group-drawing' : '') + (_isPhraseGroup ? ' con-phrase-group' : '') + (_isInvisible ? ' con-group-invisible' : '');
        el.dataset.gid = id;
        // Insert after all existing groups but before nodes/other elements,
        // so nodes stay on top and newer groups appear on top of older ones.
        const svg_ = svg();
        const brd_ = board();
        let _insertTarget = null;
        let _cur = svg_.nextSibling;
        while (_cur) {
          if (!_cur.classList || !_cur.classList.contains('con-group')) {
            _insertTarget = _cur;
            break;
          }
          _cur = _cur.nextSibling;
        }
        brd_.insertBefore(el, _insertTarget);

        const group = {
          id, nodeIds: [...nodeIds], noteIds: [...(noteIds || [])], drawingIds: [...(drawingIds || [])], shapeIds: [...(shapeIds || [])], mediaIds: [...mediaIds],
          title: '', paletteIdx: 0, drawingGroup: _isDrawingGroup, phraseGroup: _isPhraseGroup, invisible: _isInvisible, el,
          _manualW: null, _manualH: null,
          _px: placeholderX, _py: placeholderY
        };
        conGroups.push(group);
        // Resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'con-group-resizer';
        el.appendChild(resizeHandle);
        conGroupAttachEvents(group);
        conGroupRefit(group);
        conGroupApplyStyle(group);
        // If empty group, open its context menu automatically
        if (nodeIds.length === 0 && placeholderX !== undefined) {
          const fakeEvt = {
            clientX: placeholderX + 170, clientY: placeholderY + 30,
            preventDefault: () => { }, stopPropagation: () => { }
          };
          setTimeout(() => conGroupCtxOpen(fakeEvt, id), 60);
        }
        return group;
      }

      window.conBoardCtxCreateGroup = function (fromToolbar) {
        conBoardCtxClose();
        const brd = board();
        let px, py;
        if (fromToolbar) {
          // Centre of the visible board area
          px = Math.round(brd.scrollLeft + brd.clientWidth / 2 - 80);
          py = Math.round(brd.scrollTop + brd.clientHeight / 2 - 32);
        } else {
          px = Math.max(10, _boardCtxX);
          py = Math.max(10, _boardCtxY);
        }
        conGroupCreate([], px, py);
      };

      function conGetNodeBoundingBox(node) {
        if (!node) return { x: 0, y: 0, w: 80, h: 32 };
        const rawW = (node._cachedW > 0) ? node._cachedW : (Number(node.w || node.width) || ((node.el && node.el.offsetWidth > 0) ? (node._cachedW = node.el.offsetWidth) : 80));
        const rawH = (node._cachedH > 0) ? node._cachedH : (Number(node.h || node.height) || ((node.el && node.el.offsetHeight > 0) ? (node._cachedH = node.el.offsetHeight) : 32));
        const rot = Number(node.rotation) || 0;
        if (!rot || rot % 360 === 0) {
          return { x: node.x, y: node.y, w: rawW, h: rawH };
        }
        const rad = rot * Math.PI / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        const bbW = rawW * cos + rawH * sin;
        const bbH = rawW * sin + rawH * cos;
        const cx = node.x + rawW / 2;
        const cy = node.y + rawH / 2;
        return {
          x: cx - bbW / 2,
          y: cy - bbH / 2,
          w: bbW,
          h: bbH
        };
      }

      function conGroupRefit(group) {
        const _pad = group.phraseGroup ? PHRASE_GROUP_PAD : GROUP_PAD;
        // Expand nodeIds to include phrase siblings of any member node
        const _refitIdSet = new Set(group.nodeIds);
        group.nodeIds.forEach(nid => {
          const pg = conGroups.find(g => g.phraseGroup && g.nodeIds.includes(nid));
          if (pg) pg.nodeIds.forEach(sid => _refitIdSet.add(sid));
        });

        // If user has manually resized, keep the manual size but still update position
        if (group._manualW != null && group._manualH != null) {
          group.el.style.width = group._manualW + 'px';
          group.el.style.height = group._manualH + 'px';
          // Still reposition to follow member nodes
          const members = conNodes.filter(n => _refitIdSet.has(n.id));
          const _liveNotes = _getLiveNotes();
          const noteMembers = (group.noteIds || []).map(nid => {
            const el = (typeof window.wnGetNoteElementById === 'function')
              ? window.wnGetNoteElementById(nid)
              : document.querySelector(`.con-word-note[data-id="${nid}"], .ta-word-note[data-id="${nid}"]`);
            const nd = _liveNotes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
            return el && nd ? { x: nd.x, y: nd.y, w: el.offsetWidth || 80, h: el.offsetHeight || 28 } : null;
          }).filter(Boolean);
          const drawMembers = (group.drawingIds || []).map(did => {
            const dr = conDrawings.find(d => d && (d.id === did || String(d.id) === String(did)));
            return dr ? { x: dr.x, y: dr.y, w: dr.w || 1, h: dr.h || 1 } : null;
          }).filter(Boolean);
          const shapeMembers = (group.shapeIds || []).map(sid => {
            const s = conShapes.find(x => x && (x.id === sid || String(x.id) === String(sid)));
            return s ? { x: s.x, y: s.y, w: s.w || 1, h: s.h || 1 } : null;
          }).filter(Boolean);
          const liveMediaList = _getLiveMedia();
          const mediaMembers = (group.mediaIds || []).map(mid => {
            const el = document.querySelector(`.con-media-item[data-id="${mid}"]`);
            const m = liveMediaList.find(x => x && (x.id === mid || String(x.id) === String(mid)));
            return m ? { x: m.x, y: m.y, w: m.w || (el ? el.offsetWidth : 100), h: m.h || (el ? el.offsetHeight : 80) } : null;
          }).filter(Boolean);
          const allRects = [
            ...members.map(n => conGetNodeBoundingBox(n)),
            ...noteMembers,
            ...drawMembers,
            ...shapeMembers,
            ...mediaMembers
          ];
          if (allRects.length) {
            let minX = Infinity, minY = Infinity;
            allRects.forEach(r => { minX = Math.min(minX, r.x); minY = Math.min(minY, r.y); });
            group.el.style.left = (minX - _pad) + 'px';
            group.el.style.top = (minY - _pad) + 'px';
          }
          return;
        }
        // Compute bounding box of all member nodes, notes, drawings, shapes, and media items
        const members = conNodes.filter(n => _refitIdSet.has(n.id));
        const _liveNotes = _getLiveNotes();
        const noteMembers = (group.noteIds || []).map(nid => {
          const el = (typeof window.wnGetNoteElementById === 'function')
            ? window.wnGetNoteElementById(nid)
            : document.querySelector(`.con-word-note[data-id="${nid}"], .ta-word-note[data-id="${nid}"]`);
          const nd = _liveNotes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
          return el && nd ? { x: nd.x, y: nd.y, w: el.offsetWidth || 80, h: el.offsetHeight || 28 } : null;
        }).filter(Boolean);
        const drawMembers = (group.drawingIds || []).map(did => {
          const dr = conDrawings.find(d => d && (d.id === did || String(d.id) === String(did)));
          return dr ? { x: dr.x, y: dr.y, w: dr.w || 1, h: dr.h || 1 } : null;
        }).filter(Boolean);
        const shapeMembers = (group.shapeIds || []).map(sid => {
          const s = conShapes.find(x => x && (x.id === sid || String(x.id) === String(sid)));
          return s ? { x: s.x, y: s.y, w: s.w || 1, h: s.h || 1 } : null;
        }).filter(Boolean);
        const liveMediaListAuto = _getLiveMedia();
        const mediaMembers = (group.mediaIds || []).map(mid => {
          const el = document.querySelector(`.con-media-item[data-id="${mid}"]`);
          const m = liveMediaListAuto.find(x => x && (x.id === mid || String(x.id) === String(mid)));
          return m ? { x: m.x, y: m.y, w: m.w || (el ? el.offsetWidth : 100), h: m.h || (el ? el.offsetHeight : 80) } : null;
        }).filter(Boolean);
        const allRects = [
          ...members.map(n => conGetNodeBoundingBox(n)),
          ...noteMembers,
          ...drawMembers,
          ...shapeMembers,
          ...mediaMembers
        ];
        if (!allRects.length) {
          // Empty group: show a fixed-size placeholder at stored position
          const px = group._px || 40, py = group._py || 40;
          group.el.style.left = px + 'px';
          group.el.style.top = py + 'px';
          group.el.style.width = '160px';
          group.el.style.height = '64px';
          return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        allRects.forEach(r => {
          minX = Math.min(minX, r.x);
          minY = Math.min(minY, r.y);
          maxX = Math.max(maxX, r.x + r.w);
          maxY = Math.max(maxY, r.y + r.h);
        });
        group.el.style.left = (minX - _pad) + 'px';
        group.el.style.top = (minY - _pad) + 'px';
        group.el.style.width = (maxX - minX + _pad * 2) + 'px';
        group.el.style.height = (maxY - minY + _pad * 2) + 'px';
      }

      function _conGroupAttachTitleDrag(group, titleEl) {
        if (titleEl.dataset.dragAttached) return;
        titleEl.dataset.dragAttached = '1';
        // Apply saved width and font size
        if (group._titleW != null) titleEl.style.width = group._titleW + 'px';
        if (group._titleFS != null) titleEl.style.fontSize = group._titleFS + 'px';
        let _resizeStartW = 0, _resizeStartFS = 0;
        titleEl.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          // Let native resize handle clicks near the right edge; snapshot for font scaling
          const rect = titleEl.getBoundingClientRect();
          if (e.clientX > rect.right - 14) {
            _resizeStartW = titleEl.offsetWidth;
            _resizeStartFS = parseFloat(titleEl.style.fontSize) || parseFloat(getComputedStyle(titleEl).fontSize) || 10.4;
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          if (conMode === 'delete') return;
          const startLeft = isNaN(parseFloat(titleEl.style.left))
            ? parseFloat(getComputedStyle(titleEl).left) || 12
            : parseFloat(titleEl.style.left);
          const startTop = isNaN(parseFloat(titleEl.style.top))
            ? parseFloat(getComputedStyle(titleEl).top) || -25
            : parseFloat(titleEl.style.top);
          const startX = e.clientX;
          const startY = e.clientY;
          titleEl.classList.add('con-title-dragging');
          function onMove(ev) {
            const nx = startLeft + (ev.clientX - startX);
            const ny = startTop + (ev.clientY - startY);
            group._titleX = nx;
            group._titleY = ny;
            titleEl.style.left = nx + 'px';
            titleEl.style.top = ny + 'px';
          }
          function onUp() {
            titleEl.classList.remove('con-title-dragging');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            conPushUndo();
          }
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
        // Detect width changes from native resize handle; scale font proportionally
        let _prevW = titleEl.style.width;
        document.addEventListener('mouseup', function () {
          if (titleEl.style.width !== _prevW) {
            const newW = parseFloat(titleEl.style.width);
            if (_resizeStartW > 0 && _resizeStartFS > 0) {
              const newFS = Math.max(7, Math.min(64, Math.round(_resizeStartFS * newW / _resizeStartW * 10) / 10));
              titleEl.style.fontSize = newFS + 'px';
              group._titleFS = newFS;
            }
            _prevW = titleEl.style.width;
            group._titleW = newW || null;
            _resizeStartW = 0; _resizeStartFS = 0;
            conPushUndo();
          }
        });
      }

      function conGroupApplyStyle(group) {
        if (group.drawingGroup) {
          group.el.classList.add('con-group-drawing');
          return;
        }
        if (group.phraseGroup) {
          group.el.classList.add('con-phrase-group');
          const titleEl = group.el.querySelector('.con-group-title');
          if (titleEl) titleEl.remove();
          return;
        }
        if (group.invisible) {
          group.el.classList.add('con-group-invisible');
          group.el.style.background = 'transparent';
          group.el.style.borderColor = 'transparent';
        } else {
          group.el.classList.remove('con-group-invisible');
          const bg = conGroupPaletteBg(group.paletteIdx);
          const border = conGroupPaletteBorder(group.paletteIdx);
          const text = conGroupPaletteText(group.paletteIdx);
          group.el.style.background = bg;
          group.el.style.borderColor = border;
          group.el.style.color = text;
        }
        group.el.classList.toggle('con-group-blink', !!group.blink);
        // Title feature removed: remove any existing title element
        const titleEl = group.el.querySelector('.con-group-title');
        if (titleEl) titleEl.remove();
        if (window._conMirrorSend) {
          window._conMirrorSend({
            type: 'group-style',
            groupId: group.id,
            invisible: !!group.invisible,
            paletteIdx: group.paletteIdx
          });
        }
        if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
      }

      // ── PHRASE GROUPS ──────────────────────────────────────────────────────────
      // Layout: places all member nodes in a tight horizontal row and applies role
      // CSS classes (con-phrase-first / -middle / -last) so inner borders disappear.
      function conPhraseGroupLayout(group) {
        if (!group || !group.phraseGroup) return;
        const members = conNodes
          .filter(n => group.nodeIds.includes(n.id))
          .sort((a, b) => ((a.phraseOrder || 0) - (b.phraseOrder || 0)));
        if (!members.length) return;
        const anchorY = members[0].y;
        let cx = members[0].x;
        members.forEach((node, i) => {
          // Apply role classes first so border removals are reflected in offsetWidth
          node.el.classList.remove('con-phrase-node', 'con-phrase-first', 'con-phrase-middle', 'con-phrase-last', 'con-phrase-only');
          node.el.classList.add('con-phrase-node');
          if (members.length === 1) {
            node.el.classList.add('con-phrase-only');
          } else if (i === 0) {
            node.el.classList.add('con-phrase-first');
          } else if (i === members.length - 1) {
            node.el.classList.add('con-phrase-last');
          } else {
            node.el.classList.add('con-phrase-middle');
          }
          node.x = cx; node.y = anchorY;
          node.el.style.left = cx + 'px';
          node.el.style.top = anchorY + 'px';
          cx += node.el.offsetWidth || 80;
          const brd = board();
          if (brd) {
            const cx2 = brd.clientWidth / 2, cy2 = brd.clientHeight / 2;
            node.baseX = cx2 + (node.x - cx2) / conCurrentZoom;
            node.baseY = cy2 + (node.y - cy2) / conCurrentZoom;
          }
        });
        conGroupRefit(group);
        conRedrawEdges();
      }

      // Creates a phrase group from an array of word strings at (anchorX, anchorY).
      // Returns the array of new node ids (first id = phrase anchor for edge chaining).
      function conCreatePhraseGroup(wordList, anchorX, anchorY) {
        const cleanWords = (wordList || []).filter(Boolean);
        if (!cleanWords.length) return [];
        if (cleanWords.length === 1) {
          const id = conAddWordAt(cleanWords[0], anchorX, anchorY);
          return id ? [id] : [];
        }
        // Create nodes at near-identical positions (layout fixes them after rAF)
        const nodeIds = cleanWords.map((word, i) => {
          const id = conAddWordAt(word, anchorX + i * 2, anchorY + i);
          const node = conNodes.find(n => n.id === id);
          if (node) node.phraseOrder = i;
          return id;
        }).filter(Boolean);
        if (nodeIds.length < 2) return nodeIds;
        const group = conGroupCreate(nodeIds, anchorX, anchorY, [], [], [], { phraseGroup: true });
        if (group) {
          requestAnimationFrame(() => { conPhraseGroupLayout(group); });
        }
        return nodeIds;
      }
      // ─────────────────────────────────────────────────────────────────────────────

      function conGroupRefitAll() {
        conGroups.forEach(g => conGroupRefit(g));
      }

      function conGroupAttachEvents(group) {
        const el = group.el;

        // Right-click → group context menu
        el.addEventListener('contextmenu', function (e) {
          // Don't intercept if clicking ON a node
          if (e.target.closest('.con-node')) return;
          e.preventDefault(); e.stopPropagation();
          conGroupCtxOpen(e, group.id);
        });

        // Drag the whole group
        let dragging = false, ox = 0, oy = 0, startX = 0, startY = 0;
        let memberSnap = [];

        el.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          if (e.target.closest('.con-node') && !group.phraseGroup) return; // let node handle it (phrase groups own their nodes)
          if (e.target.closest('.con-group-resizer')) return; // let resizer handle it
          if (e.target.closest('.con-group-title')) return; // let title handle it
          if (!group.phraseGroup && e.target.closest('.con-phrase-group')) return; // let phrase group handle it
          if (conMode === 'delete') {
            e.preventDefault(); e.stopPropagation();
            conGroupDissolve(group.id);
            return;
          }
          if (conMode !== 'move') return;
          e.preventDefault(); e.stopPropagation();

          const brd = board();
          const brdRect = brd.getBoundingClientRect();
          const gLeft = parseFloat(el.style.left);
          const gTop = parseFloat(el.style.top);
          ox = e.clientX - brdRect.left - gLeft;
          oy = e.clientY - brdRect.top - gTop;
          startX = e.clientX; startY = e.clientY;
          dragging = false;

          // Snapshot member positions relative to group rect origin
          // Also pull in phrase siblings: nodes in the same phrase group as any member
          // that aren't themselves listed in group.nodeIds.
          const _memberIdSet = new Set(group.nodeIds);
          group.nodeIds.forEach(nid => {
            const pg = conGroups.find(g => g.phraseGroup && g.nodeIds.includes(nid));
            if (pg) pg.nodeIds.forEach(sid => _memberIdSet.add(sid));
          });
          memberSnap = conNodes
            .filter(n => _memberIdSet.has(n.id) && !conIsNodeLocked(n))
            .map(n => ({ n, dx: n.x - gLeft, dy: n.y - gTop }));
          // Snapshot member notes
          const _liveNotes = _getLiveNotes();
          const noteMemberSnap = (group.noteIds || []).map(nid => {
            const nd = _liveNotes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
            return nd ? { nd, dx: nd.x - gLeft, dy: nd.y - gTop } : null;
          }).filter(Boolean);
          // Snapshot member drawings
          const drawMemberSnap = (group.drawingIds || []).map(did => {
            const dr = conDrawings.find(d => d && (d.id === did || String(d.id) === String(did)));
            return dr ? { dr, dx: dr.x - gLeft, dy: dr.y - gTop } : null;
          }).filter(Boolean);
          // Snapshot member shapes
          const shapeMemberSnap = (group.shapeIds || []).map(sid => {
            const s = conShapes.find(x => x && (x.id === sid || String(x.id) === String(sid)));
            return s ? {
              s, dx: s.x - gLeft, dy: s.y - gTop,
              dlx1: s.lx1 - gLeft, dly1: s.ly1 - gTop,
              dlx2: s.lx2 - gLeft, dly2: s.ly2 - gTop
            } : null;
          }).filter(Boolean);
          // Snapshot member media items (images)
          const liveMediaDragList = _getLiveMedia();
          const mediaMemberSnap = (group.mediaIds || []).map(mid => {
            const m = liveMediaDragList.find(x => x && (x.id === mid || String(x.id) === String(mid)));
            return m ? { m, dx: m.x - gLeft, dy: m.y - gTop } : null;
          }).filter(Boolean);

          let _groupMoveRaf = null;
          let _pendingGroupMoveMsg = null;

          function onMove(ev) {
            const nx = ev.clientX - brdRect.left - ox;
            const ny = ev.clientY - brdRect.top - oy;
            if (!dragging && Math.abs(ev.clientX - startX) < 4 && Math.abs(ev.clientY - startY) < 4) return;
            dragging = true;
            window._conMirrorDragging = true; // suppress heavy MutationObserver broadcast
            el.style.left = nx + 'px';
            el.style.top = ny + 'px';
            // For empty groups, keep _px/_py in sync so refit uses correct position
            if (group.nodeIds.length === 0) {
              group._px = nx;
              group._py = ny;
            }
            memberSnap.forEach(({ n, dx, dy }) => {
              n.x = nx + dx;
              n.y = ny + dy;
              n.el.style.left = n.x + 'px';
              n.el.style.top = n.y + 'px';
            });
            noteMemberSnap.forEach(({ nd, dx, dy }) => {
              nd.x = nx + dx;
              nd.y = ny + dy;
              const noteEl = (typeof window.wnGetNoteElementById === 'function')
                ? window.wnGetNoteElementById(nd.id)
                : document.querySelector(`.con-word-note[data-id="${nd.id}"], .ta-word-note[data-id="${nd.id}"]`);
              if (noteEl) { noteEl.style.left = nd.x + 'px'; noteEl.style.top = nd.y + 'px'; }
            });
            drawMemberSnap.forEach(({ dr, dx, dy }) => {
              dr.x = nx + dx;
              dr.y = ny + dy;
              if (dr.el) { dr.el.style.left = (dr.x - dr.pad) + 'px'; dr.el.style.top = (dr.y - dr.pad) + 'px'; }
            });
            shapeMemberSnap.forEach(({ s, dx, dy, dlx1, dly1, dlx2, dly2 }) => {
              s.x = nx + dx; s.y = ny + dy;
              if (s.lx1 !== undefined) { s.lx1 = nx + dlx1; s.ly1 = ny + dly1; s.lx2 = nx + dlx2; s.ly2 = ny + dly2; }
              if (s.el) { s.el.style.left = (s.x - s.pad) + 'px'; s.el.style.top = (s.y - s.pad) + 'px'; }
              if (typeof _conShapeUpdateHandles === 'function') _conShapeUpdateHandles(s);
            });
            mediaMemberSnap.forEach(({ m, dx, dy }) => {
              m.x = nx + dx;
              m.y = ny + dy;
              const mEl = document.querySelector(`.con-media-item[data-id="${m.id}"]`);
              if (mEl) { mEl.style.left = m.x + 'px'; mEl.style.top = m.y + 'px'; }
            });
            conRedrawEdges();
            // Send lightweight group-move message to mirror (no full snapshot needed)
            if (window._conMirrorSend) {
              _pendingGroupMoveMsg = {
                type: 'group-move',
                groupId: String(group.id),
                gx: nx,
                gy: ny,
                nodePositions: memberSnap.map(({ n }) => ({ id: n.id, x: n.x, y: n.y })),
                notePositions: noteMemberSnap.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })),
                drawPositions: drawMemberSnap.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y, pad: dr.pad || 0 })),
                shapePositions: shapeMemberSnap.map(({ s }) => ({ id: s.id, x: s.x, y: s.y, pad: s.pad || 0, lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2 })),
                mediaPositions: mediaMemberSnap.map(({ m }) => ({ id: m.id, x: m.x, y: m.y }))
              };
              if (!_groupMoveRaf) {
                _groupMoveRaf = requestAnimationFrame(function () {
                  _groupMoveRaf = null;
                  if (window._conMirrorSend && _pendingGroupMoveMsg) {
                    window._conMirrorSend(_pendingGroupMoveMsg);
                  }
                });
              }
            }
          }
          function onUp() {
            if (_groupMoveRaf) { cancelAnimationFrame(_groupMoveRaf); _groupMoveRaf = null; }
            if (window._conMirrorSend && _pendingGroupMoveMsg) {
              window._conMirrorSend(_pendingGroupMoveMsg);
              _pendingGroupMoveMsg = null;
            }
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (dragging) {
              const brdEl = board();
              const boardCenterX = brdEl ? (brdEl.clientWidth / 2) : 0;
              const boardCenterY = brdEl ? (brdEl.clientHeight / 2) : 0;
              const zoom = (typeof conCurrentZoom === 'number' && conCurrentZoom > 0) ? conCurrentZoom : (window.conGetZoom ? window.conGetZoom() : 1);
              memberSnap.forEach(({ n }) => {
                n.baseX = boardCenterX + (n.x - boardCenterX) / zoom;
                n.baseY = boardCenterY + (n.y - boardCenterY) / zoom;
              });
              if (group.phraseGroup) conPhraseGroupLayout(group);
              else { conGroupRefit(group); conGroupRefitAll(); }
              if (typeof window.conPushUndo === 'function') window.conPushUndo();
              else if (typeof conPushUndo === 'function') conPushUndo();
            } else if (!dragging && conMode === 'move') {
              // Plain click on group background — focus the group
              conGroupFocus(group.id);
            }
            dragging = false;
            // Lift drag suppression and do a full broadcast so mirror is in sync
            window._conMirrorDragging = false;
            if (window._conMirrorBroadcast) window._conMirrorBroadcast();
          }
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });

        // Resize handle
        const resizeHandle = el.querySelector('.con-group-resizer');
        let resizing = false, rsX = 0, rsY = 0, rsW = 0, rsH = 0;
        let _rsShapeSnaps = [], _rsDrawSnaps = [], _rsMediaSnaps = [], _rsNoteSnaps = [];
        let _groupResizeRaf = null;
        let _pendingGroupResizeMsg = null;
        resizeHandle.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          if (conMode !== 'move') return;
          e.preventDefault(); e.stopPropagation();
          resizing = true;
          window._conMirrorDragging = true;
          rsX = e.clientX; rsY = e.clientY;
          rsW = el.offsetWidth; rsH = el.offsetHeight;
          const gLeft = parseFloat(el.style.left) || 0;
          const gTop = parseFloat(el.style.top) || 0;
          // Snapshot shape positions relative to group content origin
          _rsShapeSnaps = (group.shapeIds || []).map(sid => {
            const s = conShapes.find(x => x && (x.id === sid || String(x.id) === String(sid)));
            if (!s) return null;
            return {
              s,
              rx: s.x - (gLeft + GROUP_PAD), ry: s.y - (gTop + GROUP_PAD),
              rw: s.w, rh: s.h,
              rlx1: s.lx1 !== undefined ? s.lx1 - (gLeft + GROUP_PAD) : undefined,
              rly1: s.ly1 !== undefined ? s.ly1 - (gTop + GROUP_PAD) : undefined,
              rlx2: s.lx2 !== undefined ? s.lx2 - (gLeft + GROUP_PAD) : undefined,
              rly2: s.ly2 !== undefined ? s.ly2 - (gTop + GROUP_PAD) : undefined
            };
          }).filter(Boolean);
          // Snapshot drawing positions relative to group content origin
          _rsDrawSnaps = (group.drawingIds || []).map(did => {
            const dr = conDrawings.find(x => x && (x.id === did || String(x.id) === String(did)));
            if (!dr) return null;
            return {
              dr,
              rx: dr.x - (gLeft + GROUP_PAD), ry: dr.y - (gTop + GROUP_PAD),
              rw: dr.w, rh: dr.h,
              points: dr.points.map(p => p === null ? null : { x: p.x, y: p.y })
            };
          }).filter(Boolean);
          // Snapshot media item positions relative to group content origin
          const liveMediaResizeList = _getLiveMedia();
          _rsMediaSnaps = (group.mediaIds || []).map(mid => {
            const m = liveMediaResizeList.find(x => x && (x.id === mid || String(x.id) === String(mid)));
            if (!m) return null;
            return {
              m,
              rx: m.x - (gLeft + GROUP_PAD), ry: m.y - (gTop + GROUP_PAD),
              rw: m.w || 100, rh: m.h || 80
            };
          }).filter(Boolean);
          // Snapshot note positions relative to group content origin
          const liveNoteResizeList = _getLiveNotes();
          _rsNoteSnaps = (group.noteIds || []).map(nid => {
            const nd = liveNoteResizeList.find(x => x && (x.id === nid || String(x.id) === String(nid)));
            if (!nd) return null;
            return {
              nd,
              rx: nd.x - (gLeft + GROUP_PAD), ry: nd.y - (gTop + GROUP_PAD)
            };
          }).filter(Boolean);
        });
        document.addEventListener('mousemove', function (e) {
          if (!resizing) return;
          const newW = Math.max(60, rsW + (e.clientX - rsX));
          const newH = Math.max(40, rsH + (e.clientY - rsY));
          group._manualW = newW;
          group._manualH = newH;
          el.style.width = newW + 'px';
          el.style.height = newH + 'px';
          const contentW0 = Math.max(1, rsW - 2 * GROUP_PAD);
          const contentH0 = Math.max(1, rsH - 2 * GROUP_PAD);
          const scaleX = (newW - 2 * GROUP_PAD) / contentW0;
          const scaleY = (newH - 2 * GROUP_PAD) / contentH0;
          const gLeft = parseFloat(el.style.left) || 0;
          const gTop = parseFloat(el.style.top) || 0;
          const ox = gLeft + GROUP_PAD, oy = gTop + GROUP_PAD;
          // Proportionally scale shapes within the group
          _rsShapeSnaps.forEach(({ s, rx, ry, rw, rh, rlx1, rly1, rlx2, rly2 }) => {
            s.x = ox + rx * scaleX;
            s.y = oy + ry * scaleY;
            s.w = Math.max(2, rw * scaleX);
            s.h = Math.max(2, rh * scaleY);
            if (rlx1 !== undefined) {
              s.lx1 = ox + rlx1 * scaleX; s.ly1 = oy + rly1 * scaleY;
              s.lx2 = ox + rlx2 * scaleX; s.ly2 = oy + rly2 * scaleY;
            }
            if (typeof _conShapeUpdateGeom === 'function') _conShapeUpdateGeom(s);
            if (typeof _conShapeUpdateHandles === 'function') _conShapeUpdateHandles(s);
          });
          // Proportionally scale drawings within the group
          _rsDrawSnaps.forEach(({ dr, rx, ry, rw, rh, points }) => {
            dr.x = ox + rx * scaleX;
            dr.y = oy + ry * scaleY;
            dr.w = Math.max(2, rw * scaleX);
            dr.h = Math.max(2, rh * scaleY);
            dr.points = points.map(p => p === null ? null : { x: p.x * scaleX, y: p.y * scaleY });
            if (typeof _conDrawingUpdateGeom === 'function') _conDrawingUpdateGeom(dr);
            if (typeof _conDrawingUpdateHandles === 'function') _conDrawingUpdateHandles(dr);
          });
          // Proportionally scale media items within the group
          _rsMediaSnaps.forEach(({ m, rx, ry, rw, rh }) => {
            m.x = ox + rx * scaleX;
            m.y = oy + ry * scaleY;
            m.w = Math.max(20, rw * scaleX);
            m.h = Math.max(20, rh * scaleY);
            const mEl = document.querySelector(`.con-media-item[data-id="${m.id}"]`);
            if (mEl) {
              mEl.style.left = m.x + 'px';
              mEl.style.top = m.y + 'px';
              mEl.style.width = m.w + 'px';
              mEl.style.height = m.h + 'px';
            }
          });
          // Proportionally reposition notes within the group
          _rsNoteSnaps.forEach(({ nd, rx, ry }) => {
            nd.x = ox + rx * scaleX;
            nd.y = oy + ry * scaleY;
            const noteEl = (typeof window.wnGetNoteElementById === 'function')
              ? window.wnGetNoteElementById(nd.id)
              : document.querySelector(`.con-word-note[data-id="${nd.id}"], .ta-word-note[data-id="${nd.id}"]`);
            if (noteEl) {
              noteEl.style.left = nd.x + 'px';
              noteEl.style.top = nd.y + 'px';
            }
          });
          if (window._conMirrorSend) {
            _pendingGroupResizeMsg = {
              type: 'group-resize',
              groupId: String(group.id),
              w: newW,
              h: newH,
              shapes: _rsShapeSnaps.map(({ s }) => ({
                id: s.id, x: s.x, y: s.y, w: s.w, h: s.h,
                lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                pts: s.pts ? s.pts.map(p => ({ x: p.x, y: p.y })) : undefined
              })),
              drawings: _rsDrawSnaps.map(({ dr }) => ({
                id: dr.id, x: dr.x, y: dr.y, w: dr.w, h: dr.h,
                points: dr.points ? dr.points.map(p => p === null ? null : { x: p.x, y: p.y }) : undefined
              })),
              media: _rsMediaSnaps.map(({ m }) => ({
                id: m.id, x: m.x, y: m.y, w: m.w, h: m.h
              }))
            };
            if (!_groupResizeRaf) {
              _groupResizeRaf = requestAnimationFrame(function () {
                _groupResizeRaf = null;
                if (window._conMirrorSend && _pendingGroupResizeMsg) {
                  window._conMirrorSend(_pendingGroupResizeMsg);
                }
              });
            }
          }
        });
        document.addEventListener('mouseup', function () {
          if (!resizing) return;
          if (_groupResizeRaf) { cancelAnimationFrame(_groupResizeRaf); _groupResizeRaf = null; }
          if (window._conMirrorSend && _pendingGroupResizeMsg) {
            window._conMirrorSend(_pendingGroupResizeMsg);
            _pendingGroupResizeMsg = null;
          }
          window._conMirrorDragging = false;
          if (_rsShapeSnaps.length > 0 || _rsDrawSnaps.length > 0) conPushUndo();
          resizing = false;
          _rsShapeSnaps = []; _rsDrawSnaps = [];
        });

        // Attach drag to title if it already exists (restore path)
        const existingTitle = el.querySelector('.con-group-title');
        if (existingTitle) _conGroupAttachTitleDrag(group, existingTitle);
      }

      // Find which group (if any) a node belongs to
      function conGroupOfNode(nodeId) {
        return conGroups.find(g => g.nodeIds.includes(nodeId)) || null;
      }

      // Remove a node from its group; dissolve group if fewer than 2 members remain
      function conGroupRemoveNode(nodeId) {
        const g = conGroupOfNode(nodeId);
        if (!g) return;
        g.nodeIds = g.nodeIds.filter(id => id !== nodeId);
        // Clean up phrase classes on the removed node
        if (g.phraseGroup) {
          const removedNode = conNodes.find(n => n.id === nodeId);
          if (removedNode) {
            removedNode.el.classList.remove('con-phrase-node', 'con-phrase-first', 'con-phrase-middle', 'con-phrase-last', 'con-phrase-only');
            removedNode.phraseOrder = null;
          }
        }
        if (g.nodeIds.length < 2) {
          conGroupDissolve(g.id);
        } else if (g.phraseGroup) {
          conPhraseGroupLayout(g);
        } else {
          conGroupRefit(g);
        }
      }

      function conGroupDissolve(gid) {
        const idx = conGroups.findIndex(g => g.id === gid);
        if (idx === -1) return;
        const dissolved = conGroups[idx];
        // Clean up phrase-node CSS classes if this was a phrase group
        if (dissolved.phraseGroup) {
          dissolved.nodeIds.forEach(nid => {
            const node = conNodes.find(n => n.id === nid);
            if (node) {
              node.el.classList.remove('con-phrase-node', 'con-phrase-first', 'con-phrase-middle', 'con-phrase-last', 'con-phrase-only');
              node.phraseOrder = null;
            }
          });
        }
        dissolved.el.remove();
        conGroups.splice(idx, 1);
        if (conGroupFocused === gid) conGroupFocused = null;
        const edgesArr = (typeof window !== 'undefined' && window.conEdges) || (typeof global !== 'undefined' && global.conEdges) || conEdges;
        if (Array.isArray(edgesArr)) {
          for (let i = edgesArr.length - 1; i >= 0; i--) {
            const e = edgesArr[i];
            if (e && (e.a === gid || e.b === gid)) {
              if (e.g && e.g.remove) e.g.remove();
              edgesArr.splice(i, 1);
            }
          }
          if (typeof window !== 'undefined') window.conEdges = edgesArr;
          if (typeof global !== 'undefined') global.conEdges = edgesArr;
          conEdges = edgesArr;
          if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
        }
      }

      function conGroupFocus(gid) {
        conGroups.forEach(g => g.el.classList.remove('con-group-selected'));
        conGroupFocused = gid;
        if (gid) {
          const g = conGroups.find(gr => gr.id === gid);
          if (g) g.el.classList.add('con-group-selected');
          // Clear node / drawing / note / shape selections
          conMultiSelected.clear();
          conNodes.forEach(n => n.el.classList.remove('con-selected', 'con-src', 'con-multi-selected'));
          conSelected = null;
          conDrawingSelected.clear();
          document.querySelectorAll('#constellation-board .con-drawing.con-drawing-selected')
            .forEach(el => el.classList.remove('con-drawing-selected'));
          if (window.conNoteClearSelection) window.conNoteClearSelection();
          if (window.conShapeClearSelection) window.conShapeClearSelection();
        }
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
      }

      function conGroupDeleteWithContents(gid) {
        const group = conGroups.find(g => g.id === gid);
        if (!group) return;
        [...group.nodeIds].forEach(id => conRemoveNode(id));
        if (group.noteIds) {
          const _liveNotes = _getLiveNotes();
          [...group.noteIds].forEach(nid => {
            const nd = _liveNotes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
            if (nd) {
              if (typeof window.wnDeleteNoteData === 'function') window.wnDeleteNoteData(nd);
              else if (typeof wnDeleteNoteData === 'function') wnDeleteNoteData(nd);
            }
          });
        }
        const removedDrawIds = [];
        if (group.drawingIds) [...group.drawingIds].forEach(did => {
          const dr = conDrawings.find(x => x && (x.id === did || String(x.id) === String(did)));
          if (dr && dr.el) dr.el.remove();
          conDrawings = conDrawings.filter(x => String(x.id) !== String(did));
          removedDrawIds.push(String(did));
        });
        const removedShapeIds = [];
        if (group.shapeIds) [...group.shapeIds].forEach(sid => {
          const s = conShapes.find(x => x && (x.id === sid || String(x.id) === String(sid)));
          if (s && s.el) s.el.remove();
          conShapes = conShapes.filter(x => String(x.id) !== String(sid));
          removedShapeIds.push(String(sid));
        });
        if (group.mediaIds) [...group.mediaIds].forEach(mid => {
          const mEl = document.querySelector(`.con-media-item[data-id="${mid}"]`);
          if (mEl) mEl.remove();
          if (typeof window.conMediaItems !== 'undefined' && Array.isArray(window.conMediaItems)) {
            window.conMediaItems = window.conMediaItems.filter(x => String(x.id) !== String(mid));
          }
        });
        conGroupDissolve(gid);
        if (typeof window._conMirrorSend === 'function') {
          if (removedDrawIds.length > 0) window._conMirrorSend({ type: 'drawing-remove', ids: removedDrawIds });
          if (removedShapeIds.length > 0) window._conMirrorSend({ type: 'shape-remove', ids: removedShapeIds });
        }
      }

      // Try to merge two groups or create one
      function conGroupMergeOrCreate(idA, idB) {
        const gA = conGroupOfNode(idA);
        const gB = conGroupOfNode(idB);
        // Never merge nodes into/out of a phrase group via drag-drop
        if ((gA && gA.phraseGroup) || (gB && gB.phraseGroup)) return;
        if (gA && gB && gA.id === gB.id) return; // same group, do nothing
        if (gA && gB) {
          // Merge B into A
          const toAdd = gB.nodeIds.filter(id => !gA.nodeIds.includes(id));
          toAdd.forEach(id => gA.nodeIds.push(id));
          conGroupDissolve(gB.id);
          conGroupRefit(gA);
        } else if (gA) {
          if (!gA.nodeIds.includes(idB)) gA.nodeIds.push(idB);
          conGroupRefit(gA);
        } else if (gB) {
          if (!gB.nodeIds.includes(idA)) gB.nodeIds.push(idA);
          conGroupRefit(gB);
        } else {
          const newGroup = conGroupCreate([idA, idB]);
        }
      }

      // ---- Group context menu ----
      let _conGroupCtxId = null;
      let _conGroupCtxSwatchesBuilt = false;

      function conGroupCtxOpen(e, gid) {
        _conGroupCtxId = gid;
        const group = conGroups.find(g => g.id === gid);
        if (!group) return;

        // Populate title
        document.getElementById('con-group-ctx-label').textContent = 'Group';
        const addInp = document.getElementById('con-group-ctx-add-input');
        if (addInp) addInp.value = '';
        const blinkBtn = document.getElementById('con-group-ctx-blink-btn');
        if (blinkBtn) blinkBtn.classList.toggle('active', !!group.blink);

        // Build swatches once
        const swContainer = document.getElementById('con-group-ctx-swatches');
        if (!_conGroupCtxSwatchesBuilt) {
          const invSw = document.createElement('div');
          invSw.className = 'con-swatch con-swatch-invisible';
          invSw.id = 'con-group-swatch-invisible';
          invSw.title = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('conGroupTransparentSwatch') : 'Invisible / Transparent (No border & background)';
          invSw.innerHTML = '<span style="font-size:12px; line-height:1; font-weight:900; color:#ef4444; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">⊘</span>';
          invSw.onclick = function () {
            const grp = conGroups.find(g => g.id === _conGroupCtxId);
            if (!grp) return;
            conPushUndo();
            grp.invisible = true;
            conGroupApplyStyle(grp);
            conGroupCtxUpdateUi(grp);
          };
          swContainer.appendChild(invSw);

          CON_PALETTES.forEach(([bg, , border], i) => {
            const sw = document.createElement('div');
            sw.className = 'con-swatch';
            sw.style.background = bg;
            sw.style.borderColor = border;
            sw.title = ['White', 'Black', 'Yellow', 'Green', 'Blue', 'Red', 'Purple', 'Orange', 'Teal', 'Pink', 'Sky', 'Emerald'][i];
            sw.onclick = function () {
              const grp = conGroups.find(g => g.id === _conGroupCtxId);
              if (!grp) return;
              conPushUndo();
              grp.invisible = false;
              grp.paletteIdx = i;
              conGroupApplyStyle(grp);
              conGroupCtxUpdateUi(grp);
            };
            swContainer.appendChild(sw);
          });
          _conGroupCtxSwatchesBuilt = true;
        }
        conGroupCtxUpdateUi(group);

        // Populate word list
        conGroupCtxRenderWordList(group);

        const menu = document.getElementById('con-group-ctx-menu');
        menu.classList.add('visible');
        const margin = 8;
        menu.style.maxHeight = Math.max(160, window.innerHeight - 2 * margin) + 'px';
        menu.style.maxWidth = Math.max(200, window.innerWidth - 2 * margin) + 'px';
        menu.style.overflowY = 'auto';
        menu.style.overflowX = 'hidden';

        const mw = menu.offsetWidth || 220, mh = menu.offsetHeight || 250;
        let mx = e.clientX + 6, my = e.clientY + 6;
        if (mx + mw > window.innerWidth - margin) mx = e.clientX - mw - 6;
        if (my + mh > window.innerHeight - margin) my = e.clientY - mh - 6;

        const maxX = Math.max(margin, window.innerWidth - mw - margin);
        const maxY = Math.max(margin, window.innerHeight - mh - margin);
        mx = Math.max(margin, Math.min(maxX, mx));
        my = Math.max(margin, Math.min(maxY, my));

        menu.style.left = Math.round(mx) + 'px';
        menu.style.top = Math.round(my) + 'px';
        menu.style.maxHeight = Math.max(160, window.innerHeight - my - margin) + 'px';
      }

      function conGroupCtxRenderWordList(group) {
        const list = document.getElementById('con-group-word-list');
        list.innerHTML = '';
        group.nodeIds.forEach(nid => {
          const node = conNodes.find(n => n.id === nid);
          if (!node) return;
          const word = node.baseWord || node.el.textContent.trim();
          const row = document.createElement('div');
          row.className = 'con-group-word-row';
          row.innerHTML = `<span>${word}</span><button title="Remove from group" onclick="conGroupCtxRemoveWord('${nid}')">✕</button>`;
          list.appendChild(row);
        });
      }

      window.conGroupCtxRemoveWord = function (nodeId) {
        conGroupRemoveNode(nodeId);
        const gid = _conGroupCtxId;
        const group = conGroups.find(g => g.id === gid);
        if (!group) { conGroupCtxClose(); return; }
        conGroupCtxRenderWordList(group);
      };

      // Title editing removed — make apply a no-op
      window.conGroupCtxApplyTitle = function () { return; };

      window.conGroupCtxDissolve = function () {
        conPushUndo();
        const gid = _conGroupCtxId;
        conGroupCtxClose();
        conGroupDissolve(gid);
      };

      function conGroupCtxUpdateUi(group) {
        if (!group) return;
        const swContainer = document.getElementById('con-group-ctx-swatches');
        if (swContainer) {
          const invSw = document.getElementById('con-group-swatch-invisible');
          if (invSw) invSw.classList.toggle('active', !!group.invisible);
          swContainer.querySelectorAll('.con-swatch:not(.con-swatch-invisible)').forEach((s, j) => {
            s.classList.toggle('active', !group.invisible && j === group.paletteIdx);
          });
        }
        const invBtn = document.getElementById('con-group-ctx-invisible-btn');
        if (invBtn) invBtn.classList.toggle('active', !!group.invisible);
        const blinkBtn = document.getElementById('con-group-ctx-blink-btn');
        if (blinkBtn) blinkBtn.classList.toggle('active', !!group.blink);
      }

      window.conGroupCtxToggleInvisible = function () {
        const group = conGroups.find(g => g.id === _conGroupCtxId);
        if (!group) return;
        conPushUndo();
        group.invisible = !group.invisible;
        conGroupApplyStyle(group);
        conGroupCtxUpdateUi(group);
      };

      window.conGroupCtxDuplicate = function () {
        const group = conGroups.find(g => g.id === _conGroupCtxId);
        if (!group) return;
        conPushUndo();

        const duplicatedNodeIds = group.nodeIds
          .map(nid => conDuplicateNodeById(nid, 52, 38))
          .filter(Boolean);

        const gx = (parseFloat(group.el.style.left) || 0) + 56;
        const gy = (parseFloat(group.el.style.top) || 0) + 42;

        let cloneGroup = null;
        if (duplicatedNodeIds.length >= 2) {
          cloneGroup = conGroupCreate(duplicatedNodeIds, gx, gy);
        } else {
          cloneGroup = conGroupCreate([], gx, gy);
        }
        if (!cloneGroup) return;

        cloneGroup.title = '';
        cloneGroup.paletteIdx = group.paletteIdx;
        cloneGroup.invisible = !!group.invisible;
        cloneGroup._manualW = group._manualW;
        cloneGroup._manualH = group._manualH;
        conGroupApplyStyle(cloneGroup);
        conGroupRefit(cloneGroup);
        conGroupCtxClose();
      };

      window.conGroupCtxResetSize = function () {
        const group = conGroups.find(g => g.id === _conGroupCtxId);
        if (!group) return;
        conPushUndo();
        group._manualW = null;
        group._manualH = null;
        conGroupRefit(group);
      };

      window.conGroupCtxAddNode = function () {
        const group = conGroups.find(g => g.id === _conGroupCtxId);
        if (!group) return;
        const inp = document.getElementById('con-group-ctx-add-input');
        const raw = (inp && inp.value.trim()) || '';
        if (!raw) return;
        conPushUndo();
        inp.value = '';

        // Place new nodes near the centre of the group rectangle
        const gLeft = parseFloat(group.el.style.left) || 0;
        const gTop = parseFloat(group.el.style.top) || 0;
        const gW = parseFloat(group.el.style.width) || 160;
        const gH = parseFloat(group.el.style.height) || 64;
        const baseX = gLeft + gW / 2 - 30;
        const baseY = gTop + gH / 2 - 12;

        const words = raw.split(',,').map(w => w.trim()).filter(Boolean);
        words.forEach((word, i) => {
          const newId = conAddWordAt(word, baseX + i * 30, baseY + i * 30);
          if (newId) {
            if (!group.nodeIds.includes(newId)) group.nodeIds.push(newId);
          }
        });
        if (group._manualW == null) conGroupRefit(group);
        conGroupCtxRenderWordList(group);
        setTimeout(() => inp.focus(), 0);
      };

      // Toggle mask/reveal for all nodes in the currently-open group context
      window.conGroupCtxToggleMask = function () {
        const gid = _conGroupCtxId;
        if (!gid) return;
        const group = conGroups.find(g => g.id === gid);
        if (!group || !group.nodeIds || !group.nodeIds.length) return;
        conPushUndo();
        if (typeof BoardAudioService !== 'undefined') BoardAudioService.playAction(anyVisible ? 'mask_group' : 'reveal_group');

        // If any node in the group is visible, mask all; otherwise reveal all
        const anyVisible = group.nodeIds.some(nid => {
          const node = conNodes.find(n => n.id === nid);
          return node && !node.masked;
        });

        group.nodeIds.forEach(nid => {
          const node = conNodes.find(n => n.id === nid);
          if (!node || !node.el) return;
          if (anyVisible) {
            if (!node.masked) {
              node.masked = true;
              node.el.classList.add('con-masked');
            }
          } else {
            if (node.masked) {
              node.masked = false;
              node.el.classList.remove('con-masked');
            }
          }
        });
        if (typeof conRedrawEdges === 'function') conRedrawEdges();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({
            type: 'node-masks',
            masks: group.nodeIds.map(nid => {
              const n = conNodes.find(x => x.id === nid);
              return { id: String(nid), masked: n ? !!n.masked : anyVisible };
            })
          });
        }
      };

      window.conGroupCtxBlink = function () {
        const group = conGroups.find(g => g.id === _conGroupCtxId);
        if (!group) return;
        group.blink = !group.blink;
        group.el.classList.toggle('con-group-blink', !!group.blink);
        const blinkBtn = document.getElementById('con-group-ctx-blink-btn');
        if (blinkBtn) blinkBtn.classList.toggle('active', !!group.blink);
        if (window._conMirrorSend) window._conMirrorSend({ type: 'blink-update', groupId: group.id, blink: !!group.blink });
      };

      window.conGroupCtxSaveToLibrary = function () {
        const gid = _conGroupCtxId;
        const group = conGroups.find(g => g.id === gid);
        conGroupCtxClose();
        if (!group) return;
        const gNodes = Array.isArray(group.nodeIds) ? [...group.nodeIds] : [];
        const gNotes = Array.isArray(group.noteIds) ? [...group.noteIds] : [];
        const gDrawings = Array.isArray(group.drawingIds) ? [...group.drawingIds] : [];
        const gShapes = Array.isArray(group.shapeIds) ? [...group.shapeIds] : [];
        const gMedia = Array.isArray(group.mediaIds) ? [...group.mediaIds] : [];
        conSaveSelectionToLibraryPrompt(group.title || 'Group', {
          groupIds: [group.id],
          nodeIds: gNodes,
          noteIds: gNotes,
          drawingIds: gDrawings,
          shapeIds: gShapes,
          mediaIds: gMedia
        });
      };

      window.conGroupCtxClose = function () {
        _conGroupCtxId = null;
        const menu = document.getElementById('con-group-ctx-menu');
        if (menu) {
          menu.classList.remove('visible');
          menu.style.maxHeight = '';
        }
      };

      // Close group menu on outside click
      document.addEventListener('click', function (e) {
        if (!e.target.closest('#con-group-ctx-menu') && !e.target.closest('.con-group')) {
          conGroupCtxClose();
        }
      });

      // board and svg DOM getters are defined at top of module / board-state.js

      function conNormalizeMask(mask) {
        const brd = board();
        const maxW = Math.max(20, (brd && brd.clientWidth) || 2400);
        const maxH = Math.max(20, (brd && brd.clientHeight) || 2400);
        mask.width = Math.max(20, Math.min(maxW, Number(mask.width) || 160));
        mask.height = Math.max(20, Math.min(maxH, Number(mask.height) || 64));
        mask.x = Math.max(0, Number(mask.x) || 0);
        mask.y = Math.max(0, Number(mask.y) || 0);
        mask.opacity = Math.max(0.05, Math.min(1, Number(mask.opacity) || 0.95));
        mask.color = String(mask.color || '#111111');
      }

      function conApplyMaskStyle(mask) {
        if (!mask || !mask.el) return;
        conNormalizeMask(mask);
        mask.el.style.left = mask.x + 'px';
        mask.el.style.top = mask.y + 'px';
        mask.el.style.width = mask.width + 'px';
        mask.el.style.height = mask.height + 'px';
        mask.el.style.background = mask.color;
        mask.el.style.opacity = String(mask.opacity);
      }

      function conGetMaskById(maskId) {
        return conMasks.find(m => m.id === maskId) || null;
      }

      function conMaskBuild(mask) {
        const brd = board();
        if (!brd) return;
        const el = document.createElement('div');
        el.className = 'con-mask-rect';
        el.dataset.mid = mask.id;
        el.style.position = 'absolute';
        el.style.zIndex = '700';
        el.style.border = '1.5px dashed rgba(255,255,255,0.92)';
        el.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.2) inset';
        el.style.cursor = 'move';
        el.style.userSelect = 'none';

        const handle = document.createElement('div');
        handle.className = 'con-mask-resizer';
        handle.style.position = 'absolute';
        handle.style.right = '1px';
        handle.style.bottom = '1px';
        handle.style.width = '12px';
        handle.style.height = '12px';
        handle.style.borderRight = '2px solid rgba(255,255,255,0.95)';
        handle.style.borderBottom = '2px solid rgba(255,255,255,0.95)';
        handle.style.cursor = 'nwse-resize';
        handle.style.zIndex = '2';
        el.appendChild(handle);

        mask.el = el;
        conApplyMaskStyle(mask);
        brd.appendChild(el);

        el.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          e.stopPropagation();
          window.conMaskCtxOpen(e, mask.id);
        });

        let dragging = false;
        let sx = 0, sy = 0, startX = 0, startY = 0;
        let _dragMaskRaf = null;
        el.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          if (conMode !== 'move') return;
          if (e.target.closest('.con-mask-resizer')) return;
          e.preventDefault();
          e.stopPropagation();
          dragging = true;
          window._conMirrorDragging = true;
          sx = e.clientX;
          sy = e.clientY;
          startX = mask.x;
          startY = mask.y;
        });
        document.addEventListener('mousemove', function (e) {
          if (!dragging) return;
          const br = board();
          if (!br) return;
          const dx = e.clientX - sx;
          const dy = e.clientY - sy;
          mask.x = Math.max(0, startX + dx);
          mask.y = Math.max(0, startY + dy);
          conApplyMaskStyle(mask);

          if (window._conMirrorSend) {
            if (!_dragMaskRaf) {
              _dragMaskRaf = requestAnimationFrame(function () {
                _dragMaskRaf = null;
                if (window._conMirrorSend) {
                  window._conMirrorSend({
                    type: 'mask-move',
                    id: mask.id,
                    x: mask.x,
                    y: mask.y
                  });
                }
              });
            }
          }
        });
        document.addEventListener('mouseup', function () {
          if (!dragging) return;
          dragging = false;
          if (_dragMaskRaf) { cancelAnimationFrame(_dragMaskRaf); _dragMaskRaf = null; }
          if (window._conMirrorSend) {
            window._conMirrorSend({
              type: 'mask-move',
              id: mask.id,
              x: mask.x,
              y: mask.y
            });
          }
          setTimeout(function () {
            window._conMirrorDragging = false;
          }, 60);
        });

        let resizing = false;
        let rw = 0, rh = 0;
        let _resizeMaskRaf = null;
        handle.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          if (conMode !== 'move') return;
          e.preventDefault();
          e.stopPropagation();
          resizing = true;
          window._conMirrorDragging = true;
          sx = e.clientX;
          sy = e.clientY;
          rw = mask.width;
          rh = mask.height;
        });
        document.addEventListener('mousemove', function (e) {
          if (!resizing) return;
          const br = board();
          if (!br) return;
          const dx = e.clientX - sx;
          const dy = e.clientY - sy;
          mask.width = Math.max(20, rw + dx);
          mask.height = Math.max(20, rh + dy);
          conApplyMaskStyle(mask);

          if (window._conMirrorSend) {
            if (!_resizeMaskRaf) {
              _resizeMaskRaf = requestAnimationFrame(function () {
                _resizeMaskRaf = null;
                if (window._conMirrorSend) {
                  window._conMirrorSend({
                    type: 'mask-resize',
                    id: mask.id,
                    width: mask.width,
                    height: mask.height,
                    x: mask.x,
                    y: mask.y
                  });
                }
              });
            }
          }
        });
        document.addEventListener('mouseup', function () {
          if (!resizing) return;
          resizing = false;
          if (_resizeMaskRaf) { cancelAnimationFrame(_resizeMaskRaf); _resizeMaskRaf = null; }
          if (window._conMirrorSend) {
            window._conMirrorSend({
              type: 'mask-resize',
              id: mask.id,
              width: mask.width,
              height: mask.height,
              x: mask.x,
              y: mask.y
            });
          }
          setTimeout(function () {
            window._conMirrorDragging = false;
          }, 60);
        });
      }

      function conAddMaskFromData(maskData) {
        const brd = board();
        if (!brd) return null;
        const src = maskData || {};
        const idText = (typeof src.id === 'string' && src.id.trim()) ? src.id.trim() : '';
        const fallbackId = 'cm' + (_conMaskNextId++);
        const id = idText || fallbackId;
        const idNumMatch = id.match(/\d+$/);
        if (idNumMatch) {
          const idNum = parseInt(idNumMatch[0], 10);
          if (!isNaN(idNum)) _conMaskNextId = Math.max(_conMaskNextId, idNum + 1);
        }
        const mask = {
          id,
          x: Number(src.x) || 0,
          y: Number(src.y) || 0,
          width: Number(src.width) || 160,
          height: Number(src.height) || 64,
          color: src.color || '#111111',
          opacity: Number(src.opacity) || 0.95,
          el: null
        };
        conMasks.push(mask);
        conMaskBuild(mask);
        return mask;
      }

      window.conGetMasks = function () { return conMasks; };
      window.conAddMaskFromData = conAddMaskFromData;

      window.conAddMask = function (x, y) {
        const brd = board();
        if (!brd) return;
        const px = Number.isFinite(x) ? x : Math.max(24, Math.round(brd.clientWidth / 2) - 80);
        const py = Number.isFinite(y) ? y : Math.max(24, Math.round(brd.clientHeight / 2) - 32);
        const newMask = conAddMaskFromData({
          x: Math.max(0, Math.min(brd.clientWidth - 160, px)),
          y: Math.max(0, Math.min(brd.clientHeight - 64, py)),
          width: 160,
          height: 64,
          color: '#111111',
          opacity: 0.95
        });
        if (newMask && window._conMirrorSend) {
          window._conMirrorSend({
            type: 'mask-add',
            mask: {
              id: newMask.id,
              x: newMask.x,
              y: newMask.y,
              width: newMask.width,
              height: newMask.height,
              color: newMask.color,
              opacity: newMask.opacity
            }
          });
        }
      };

      window.conMasksClear = function () {
        conMasks.forEach(m => { if (m.el) m.el.remove(); });
        conMasks = [];
        _conMaskNextId = 1;
        _conMaskCtxId = null;
        const overlay = document.getElementById('con-mask-style-overlay');
        if (overlay) overlay.classList.remove('active');
        if (window._conMirrorSend) {
          window._conMirrorSend({ type: 'mask-clear' });
        }
      };


  function conGroupOfMedia(mid) {
    if (!mid) return null;
    return conGroups.find(g => (g.mediaIds || []).some(id => String(id) === String(mid))) || null;
  }
  window.conGroupOfMedia = conGroupOfMedia;

  function conGroupRemoveMedia(mid) {
    const g = conGroupOfMedia(mid);
    if (!g) return;
    g.mediaIds = (g.mediaIds || []).filter(id => String(id) !== String(mid));
    conGroupRefit(g);
  }
  window.conGroupRemoveMedia = conGroupRemoveMedia;

  // Export group functions onto window and Board.groups
  window.conGroupCreate = conGroupCreate;
  window.conGroupRefit = conGroupRefit;
  window.conGroupRefitAll = conGroupRefitAll;
  window.conGroupAttachEvents = conGroupAttachEvents;
  window.conGroupAttach = global.conGroupAttach = conGroupAttachEvents;
  window.conGroupApplyStyle = conGroupApplyStyle;
  window.conPhraseGroupLayout = conPhraseGroupLayout;
  window.conCreatePhraseGroup = conCreatePhraseGroup;
  window.conGroupOfNode = conGroupOfNode;
  window.conGroupRemoveNode = conGroupRemoveNode;
  window.conGroupDissolve = conGroupDissolve;
  window.conGroupFocus = conGroupFocus;
  window.conGroupDeleteWithContents = conGroupDeleteWithContents;
  window.conGroupMergeOrCreate = conGroupMergeOrCreate;
  window.conGroupCtxOpen = conGroupCtxOpen;
  window.conGroupPaletteBg = conGroupPaletteBg;
  window.conGroupPaletteBorder = conGroupPaletteBorder;
  window.conGroupPaletteText = conGroupPaletteText;
  window.conGetNodeBoundingBox = conGetNodeBoundingBox;
  window.GROUP_PAD = global.GROUP_PAD = GROUP_PAD;
  window.conApplyMaskStyle = global.conApplyMaskStyle = conApplyMaskStyle;
  window.conGetMaskById = global.conGetMaskById = conGetMaskById;

  try {
    Object.defineProperty(window, '_conGroupCtxId', {
      get: function() { return _conGroupCtxId; },
      set: function(v) { _conGroupCtxId = v; },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    window._conGroupCtxId = _conGroupCtxId;
  }

  Board.groups = {
    create: conGroupCreate,
    refit: conGroupRefit,
    refitAll: conGroupRefitAll,
    attachEvents: conGroupAttachEvents,
    applyStyle: conGroupApplyStyle,
    dissolve: conGroupDissolve
  };
})(typeof window !== "undefined" ? window : this);