/**
 * Class Management Tools — Board DRAWINGS Engine
 * Extracted from pages/board.html (Lines 15669-16424)
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

      // ================================================================
      // FREEHAND DRAWING ANNOTATIONS
      // ================================================================
      var conDrawings = global.conDrawings = global.conDrawings || [];    // { id, x, y, w, h, points, color, thickness, opacity, el, hitPath, visPath, pad }
      // Note: _conDrawNextId, _conDrawCtxId, _conDrawColor, _conDrawThickness, _conDrawOpacity,
      // _conDrawEraserMode, and _conDrawHandMode are managed globally via board-state.js.
      var conDrawingSelected = global.conDrawingSelected = global.conDrawingSelected || new Set(); // IDs of selected freehand drawings
      window.conDrawingSelected = conDrawingSelected;
      window.conDrawings = conDrawings;

      function _getConMode() {
        return (typeof window !== 'undefined' && typeof window.conGetMode === 'function')
          ? window.conGetMode()
          : ((typeof window !== 'undefined' && window.conMode) || (global && global.conMode) || 'move');
      }

      window.conDrawingClearSelection = function () {
        conDrawingSelected.forEach(did => {
          const d = conDrawings.find(x => x.id === did);
          if (d) {
            _conDrawingHideHandles(d);
            if (d.el) {
              d.el.style.zIndex = '600';
              d.el.style.pointerEvents = 'none';
              d.el.style.cursor = 'default';
            }
          }
        });
        conDrawingSelected.clear();
        document.querySelectorAll('#constellation-board .con-drawing.con-drawing-selected')
          .forEach(el => {
            el.classList.remove('con-drawing-selected');
            el.style.zIndex = '600';
            el.style.pointerEvents = 'none';
            el.style.cursor = 'default';
          });
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
      };
      window.conGetDrawingSelected = function () { return conDrawingSelected; };

      var CON_DRAW_COLORS = global.CON_DRAW_COLORS = global.CON_DRAW_COLORS || [
        '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5',
        '#8e24aa', '#d81b60', '#3e2723', '#111111', '#ffffff'
      ];
      window.CON_DRAW_COLORS = CON_DRAW_COLORS;

      function _conBuildPathD(points) {
        if (!points || points.length === 0) return '';
        let d = '';
        let seg = [];

        function flushSegment() {
          if (!seg.length) return;
          if (seg.length === 1) {
            const p0 = seg[0];
            d += (d ? ' ' : '') + `M ${p0.x} ${p0.y}`;
            seg = [];
            return;
          }
          if (seg.length === 2) {
            const p0 = seg[0], p1 = seg[1];
            d += (d ? ' ' : '') + `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`;
            seg = [];
            return;
          }

          const p0 = seg[0];
          d += (d ? ' ' : '') + `M ${p0.x} ${p0.y}`;
          for (let i = 1; i < seg.length - 1; i++) {
            const p = seg[i];
            const n = seg[i + 1];
            const mx = (p.x + n.x) / 2;
            const my = (p.y + n.y) / 2;
            d += ` Q ${p.x} ${p.y} ${mx} ${my}`;
          }
          const pLast1 = seg[seg.length - 2];
          const pLast = seg[seg.length - 1];
          d += ` Q ${pLast1.x} ${pLast1.y} ${pLast.x} ${pLast.y}`;
          seg = [];
        }

        for (const p of points) {
          if (p === null || p === undefined) {
            flushSegment();
            continue;
          }
          seg.push(p);
        }
        flushSegment();
        return d;
      }

      function conDrawingBuild(d) {
        const brd = (typeof board === 'function') ? board() : document.getElementById('constellation-board');
        if (!brd) return;
        const PAD = Math.max(d.thickness + 4, 12);
        const el = document.createElement('div');
        el.className = 'con-drawing';
        el.dataset.did = d.id;
        el.style.left = (d.x - PAD) + 'px';
        el.style.top = (d.y - PAD) + 'px';
        el.style.width = (d.w + 2 * PAD) + 'px';
        el.style.height = (d.h + 2 * PAD) + 'px';
        el.style.zIndex = '600';
        el.style.pointerEvents = 'none'; // hit path handles events

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = 'position:absolute;top:0;left:0;overflow:visible;width:100%;height:100%;pointer-events:none;';

        const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitPath.setAttribute('fill', 'none');
        hitPath.setAttribute('stroke', 'transparent');
        hitPath.setAttribute('stroke-width', String(Math.max(20, d.thickness + 10)));
        hitPath.setAttribute('stroke-linecap', 'round');
        hitPath.setAttribute('stroke-linejoin', 'round');
        hitPath.style.pointerEvents = 'stroke';
        hitPath.style.cursor = 'grab';

        const visPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        visPath.setAttribute('fill', 'none');
        visPath.setAttribute('stroke', d.color);
        visPath.setAttribute('stroke-width', String(d.thickness));
        visPath.setAttribute('stroke-linecap', 'round');
        visPath.setAttribute('stroke-linejoin', 'round');
        visPath.setAttribute('opacity', String(Number.isFinite(d.opacity) ? d.opacity : 1));
        visPath.style.pointerEvents = 'none';

        const pathD = _conBuildPathD(d.points.map(p => p === null ? null : ({ x: p.x + PAD, y: p.y + PAD })));
        hitPath.setAttribute('d', pathD);
        visPath.setAttribute('d', pathD);

        svg.appendChild(hitPath);
        svg.appendChild(visPath);
        el.appendChild(svg);
        d.el = el; d.hitPath = hitPath; d.visPath = visPath; d.pad = PAD;
        brd.appendChild(el);

        // Context menu on right-click (handled on container el so clicks anywhere inside selected box work)
        el.addEventListener('contextmenu', function (e) {
          if (document.body.classList.contains('laser-active')) return;
          if (e.target && e.target.classList && e.target.classList.contains('con-drawing-handle')) return;
          e.preventDefault(); e.stopPropagation();
          // If drawing belongs to a group, open group context menu instead
          const _ctxOwnerGroup = (typeof conGroups !== 'undefined') ? conGroups.find(g => (g.drawingIds || []).includes(d.id)) : null;
          if (_ctxOwnerGroup) { if (typeof conGroupCtxOpen === 'function') conGroupCtxOpen(e, _ctxOwnerGroup.id); return; }
          if (!conDrawingSelected.has(d.id)) {
            const hasOtherSelection = (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0)
              || (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0)
              || (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 0)
              || (typeof _conShapeSelected !== 'undefined' && _conShapeSelected && _conShapeSelected.size > 0);
            if (!hasOtherSelection) {
              conDrawingSelected.add(d.id);
              el.classList.add('con-drawing-selected');
              el.style.pointerEvents = 'auto';
              el.style.cursor = 'grab';
              _conDrawingShowHandles(d);
            }
          }
          conDrawingCtxOpen(e, d.id);
        });

        // Drag in move mode (mouse)
        let dragging = false, dsx = 0, dsy = 0, startX = 0, startY = 0;
        // Snapshot of co-selected drawings and other items for joint drag
        let _dragDrawSnaps = [], _dragNodeSnaps = [], _dragNoteSnaps = [], _dragShapeSnaps = [], _dragTableSnaps = [];
        let _dragDrawRaf = null;
        let _pendingDrawMoveMsg = null, _pendingNodeMoveMsg = null, _pendingNoteMoveMsg = null, _pendingShapeMoveMsg = null, _pendingTableMoveMsg = null;
        el.addEventListener('mousedown', function (e) {
          if (document.body.classList.contains('laser-active')) return;
          if (e.target && e.target.classList && e.target.classList.contains('con-drawing-handle')) return;
          if (e.button !== 0 || _getConMode() !== 'move') return;
          // If drawing belongs to a group, forward to group element
          const _ownerGroup = (typeof conGroups !== 'undefined') ? conGroups.find(g => (g.drawingIds || []).includes(d.id)) : null;
          if (_ownerGroup) {
            e.preventDefault(); e.stopPropagation();
            _ownerGroup.el.dispatchEvent(new MouseEvent('mousedown', {
              bubbles: false, cancelable: true,
              clientX: e.clientX, clientY: e.clientY, button: 0
            }));
            return;
          }
          e.preventDefault(); e.stopPropagation();

          if (e.ctrlKey || e.metaKey) {
            // Ctrl+click: toggle this drawing in/out of selection
            if (conDrawingSelected.has(d.id)) {
              conDrawingSelected.delete(d.id);
              el.classList.remove('con-drawing-selected');
              el.style.pointerEvents = 'none';
              el.style.cursor = 'default';
              _conDrawingHideHandles(d);
            } else {
              conDrawingSelected.add(d.id);
              el.classList.add('con-drawing-selected');
              el.style.pointerEvents = 'auto';
              el.style.cursor = 'grab';
              _conDrawingShowHandles(d);
            }
            if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
            return;
          }

          // Plain click/drag: select just this drawing (unless it's already in a multi-selection)
          if (!conDrawingSelected.has(d.id)) {
            // Clear node/note selections first
            if (window.conNodeClearSelection) window.conNodeClearSelection();
            if (window.conNoteClearSelection) window.conNoteClearSelection();
            if (window.conShapeClearSelection) window.conShapeClearSelection();
            if (typeof conTableClearSelection === 'function') conTableClearSelection();
            if (window.conMediaClearSelection) window.conMediaClearSelection();
            // Now select only this drawing
            conDrawingSelected.add(d.id);
            el.classList.add('con-drawing-selected');
            el.style.pointerEvents = 'auto';
            el.style.cursor = 'grab';
            _conDrawingShowHandles(d);
          }
          if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();

          dragging = true;
          window._conMirrorDragging = true;
          dsx = e.clientX; dsy = e.clientY;
          startX = d.x; startY = d.y;
          hitPath.style.cursor = 'grabbing';
          el.style.cursor = 'grabbing';
          el.style.zIndex = '660';

          // Snapshot all selected drawings for joint drag
          _dragDrawSnaps = [];
          conDrawingSelected.forEach(did => {
            const dr = conDrawings.find(x => x.id === did);
            if (dr) _dragDrawSnaps.push({ dr, sx: dr.x, sy: dr.y, pad: dr.pad || Math.max((dr.thickness || 4) + 4, 12) });
          });
          // Snapshot selected nodes for joint drag
          _dragNodeSnaps = [];
          const _allSelNodes = new Set(window.conGetMultiSelected ? window.conGetMultiSelected() : (typeof conMultiSelected !== 'undefined' ? conMultiSelected : []));
          if (typeof conSelected !== 'undefined' && conSelected) _allSelNodes.add(conSelected);
          if (window.conGetSelected && window.conGetSelected()) _allSelNodes.add(window.conGetSelected());
          const _allNodesList = window.conGetNodes ? window.conGetNodes() : [];
          _allSelNodes.forEach(nid => {
            const nd = _allNodesList.find(n => n.id === nid);
            if (nd && !(typeof conIsNodeLocked === 'function' && conIsNodeLocked(nd))) {
              _dragNodeSnaps.push({ nd, sx: nd.x, sy: nd.y });
            }
          });
          // Snapshot selected notes for joint drag
          _dragNoteSnaps = [];
          if (window.conGetNoteSelected) {
            const noteSel = window.conGetNoteSelected();
            const allNotes = window.conGetNotes ? window.conGetNotes() : [];
            noteSel.forEach(nid => {
              const nd = allNotes.find(n => n.id === nid);
              if (nd && !nd.locked) _dragNoteSnaps.push({ nd, sx: nd.x, sy: nd.y });
            });
          }
          // Snapshot selected shapes for joint drag
          _dragShapeSnaps = [];
          const _shapeSel = window.conGetShapeSelected ? window.conGetShapeSelected() : (typeof _conShapeSelected !== 'undefined' ? _conShapeSelected : new Set());
          const _allShapesList = window.conGetShapes ? window.conGetShapes() : [];
          _shapeSel.forEach(sid => {
            const s = _allShapesList.find(x => x.id === sid);
            if (s) _dragShapeSnaps.push({
              s, sx: s.x, sy: s.y,
              slx1: s.lx1, sly1: s.ly1, slx2: s.lx2, sly2: s.ly2,
              spts: s.pts ? s.pts.map(p => ({ ...p })) : null,
              pad: s.pad || (typeof _conShapeGetPAD === 'function' ? _conShapeGetPAD(s) : 16)
            });
          });
          // Snapshot selected tables for joint drag
          _dragTableSnaps = [];
          const _tableSel = window.conGetTableSelected ? window.conGetTableSelected() : (typeof conTableSelected !== 'undefined' ? conTableSelected : new Set());
          const _allTablesList = window.conGetTables ? window.conGetTables() : [];
          _tableSel.forEach(tid => {
            const tbl = _allTablesList.find(t => t.id === tid);
            if (tbl && !tbl.locked) _dragTableSnaps.push({ tbl, sx: tbl.x, sy: tbl.y });
          });
        });
        document.addEventListener('mousemove', function (e) {
          if (!dragging) return;
          const dx = e.clientX - dsx;
          const dy = e.clientY - dsy;
          // Move all selected drawings
          _dragDrawSnaps.forEach(({ dr, sx, sy, pad }) => {
            dr.x = sx + dx;
            dr.y = sy + dy;
            const p = pad != null ? pad : (dr.pad || 12);
            if (dr.el) { dr.el.style.left = (dr.x - p) + 'px'; dr.el.style.top = (dr.y - p) + 'px'; }
          });
          // Move co-selected nodes
          if (_dragNodeSnaps.length > 0) {
            _dragNodeSnaps.forEach(({ nd, sx, sy }) => {
              nd.x = sx + dx; nd.y = sy + dy;
              nd.el.style.left = nd.x + 'px'; nd.el.style.top = nd.y + 'px';
            });
            if (window.conRedrawEdges) window.conRedrawEdges();
            if (window.conGroupRefitAll) window.conGroupRefitAll();
          }
          // Move co-selected notes
          if (_dragNoteSnaps.length > 0) {
            _dragNoteSnaps.forEach(({ nd, sx, sy }) => {
              nd.x = sx + dx; nd.y = sy + dy;
              const noteEl = (typeof window.wnGetNoteElementById === 'function')
                ? window.wnGetNoteElementById(nd.id)
                : ((typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nd.id) : document.querySelector(`.con-word-note[data-id="${nd.id}"]`));
              if (noteEl) { noteEl.style.left = nd.x + 'px'; noteEl.style.top = nd.y + 'px'; }
            });
          }
          // Move co-selected shapes
          if (_dragShapeSnaps.length > 0) {
            _dragShapeSnaps.forEach(({ s, sx, sy, slx1, sly1, slx2, sly2, spts, pad }) => {
              s.x = sx + dx; s.y = sy + dy;
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
          // Move co-selected tables
          if (_dragTableSnaps.length > 0) {
            _dragTableSnaps.forEach(({ tbl, sx, sy }) => {
              tbl.x = Math.max(0, sx + dx); tbl.y = Math.max(0, sy + dy);
              if (tbl.el) { tbl.el.style.left = tbl.x + 'px'; tbl.el.style.top = tbl.y + 'px'; }
            });
          }
          if (window._conMirrorSend) {
            _pendingDrawMoveMsg = {
              type: 'drawing-move',
              positions: _dragDrawSnaps.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y }))
            };
            if (_dragNodeSnaps.length > 0) {
              _pendingNodeMoveMsg = {
                type: 'node-move',
                positions: _dragNodeSnaps.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y }))
              };
            }
            if (_dragNoteSnaps.length > 0) {
              _pendingNoteMoveMsg = {
                type: 'note-move',
                positions: _dragNoteSnaps.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y }))
              };
            }
            if (_dragShapeSnaps.length > 0) {
              _pendingShapeMoveMsg = {
                type: 'shape-move',
                positions: _dragShapeSnaps.map(({ s }) => ({
                  id: s.id, x: s.x, y: s.y,
                  lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                  pts: s.pts ? s.pts.map(p => ({ ...p })) : undefined
                }))
              };
            }
            if (_dragTableSnaps.length > 0) {
              _pendingTableMoveMsg = {
                type: 'table-move',
                positions: _dragTableSnaps.map(({ tbl }) => ({ id: tbl.id, x: tbl.x, y: tbl.y }))
              };
            }
            if (!_dragDrawRaf) {
              _dragDrawRaf = requestAnimationFrame(function () {
                _dragDrawRaf = null;
                if (window._conMirrorSend) {
                  if (_pendingDrawMoveMsg) window._conMirrorSend(_pendingDrawMoveMsg);
                  if (_pendingNodeMoveMsg) { window._conMirrorSend(_pendingNodeMoveMsg); _pendingNodeMoveMsg = null; }
                  if (_pendingNoteMoveMsg) { window._conMirrorSend(_pendingNoteMoveMsg); _pendingNoteMoveMsg = null; }
                  if (_pendingShapeMoveMsg) { window._conMirrorSend(_pendingShapeMoveMsg); _pendingShapeMoveMsg = null; }
                  if (_pendingTableMoveMsg) { window._conMirrorSend(_pendingTableMoveMsg); _pendingTableMoveMsg = null; }
                }
              });
            }
          }
        });
        document.addEventListener('mouseup', function (e) {
          if (!dragging) return;
          if (_dragDrawRaf) { cancelAnimationFrame(_dragDrawRaf); _dragDrawRaf = null; }
          const _hasActuallyMoved = (Math.abs(e.clientX - dsx) > 2 || Math.abs(e.clientY - dsy) > 2);
          if (window._conMirrorSend && _hasActuallyMoved) {
            window._conMirrorSend({
              type: 'drawing-move',
              positions: _dragDrawSnaps.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y }))
            });
            if (_dragNodeSnaps.length > 0) {
              window._conMirrorSend({
                type: 'node-move',
                positions: _dragNodeSnaps.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y }))
              });
            }
            if (_dragNoteSnaps.length > 0) {
              window._conMirrorSend({
                type: 'note-move',
                positions: _dragNoteSnaps.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y }))
              });
            }
            if (_dragShapeSnaps.length > 0) {
              window._conMirrorSend({
                type: 'shape-move',
                positions: _dragShapeSnaps.map(({ s }) => ({
                  id: s.id, x: s.x, y: s.y,
                  lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                  pts: s.pts ? s.pts.map(p => ({ ...p })) : undefined
                }))
              });
            }
            if (_dragTableSnaps.length > 0) {
              window._conMirrorSend({
                type: 'table-move',
                positions: _dragTableSnaps.map(({ tbl }) => ({ id: tbl.id, x: tbl.x, y: tbl.y }))
              });
            }
            if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
          } else if (!_hasActuallyMoved && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            const _totalOther = (conDrawingSelected.size > 1 ? conDrawingSelected.size - 1 : 0) + _dragNodeSnaps.length + _dragNoteSnaps.length + _dragShapeSnaps.length + _dragTableSnaps.length;
            if (_totalOther > 0) {
              if (window.conNodeClearSelection) window.conNodeClearSelection();
              if (window.conNoteClearSelection) window.conNoteClearSelection();
              if (window.conShapeClearSelection) window.conShapeClearSelection();
              if (typeof conTableClearSelection === 'function') conTableClearSelection();
              conDrawingSelected.clear();
              document.querySelectorAll('#constellation-board .con-drawing.con-drawing-selected')
                .forEach(el => {
                  el.classList.remove('con-drawing-selected');
                  el.style.pointerEvents = 'none';
                  el.style.cursor = 'default';
                });
              conDrawingSelected.add(d.id);
              el.classList.add('con-drawing-selected');
              el.style.pointerEvents = 'auto';
              el.style.cursor = 'grab';
              _conDrawingShowHandles(d);
              if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
            }
          }
          dragging = false;
          hitPath.style.cursor = 'grab';
          el.style.cursor = 'grab';
          el.style.zIndex = '660'; // keep slight elevation while selected
          _dragDrawSnaps = []; _dragNodeSnaps = []; _dragNoteSnaps = []; _dragShapeSnaps = []; _dragTableSnaps = [];
          setTimeout(() => {
            window._conMirrorDragging = false;
          }, 60);
        });

        // Drag (touch / pen pointer)
        let pDragging = false;
        let _pDrawRaf = null;
        el.addEventListener('pointerdown', function (e) {
          if (document.body.classList.contains('laser-active')) return;
          if (e.target && e.target.classList && e.target.classList.contains('con-drawing-handle')) return;
          if (e.pointerType === 'mouse' || _getConMode() !== 'move') return;
          e.preventDefault(); e.stopPropagation();
          el.setPointerCapture(e.pointerId);
          pDragging = true;
          window._conMirrorDragging = true;
          dsx = e.clientX; dsy = e.clientY;
          startX = d.x; startY = d.y;
        });
        el.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'mouse' || !pDragging) return;
          d.x = startX + (e.clientX - dsx);
          d.y = startY + (e.clientY - dsy);
          el.style.left = (d.x - d.pad) + 'px';
          el.style.top = (d.y - d.pad) + 'px';
          if (window._conMirrorSend) {
            if (!_pDrawRaf) {
              _pDrawRaf = requestAnimationFrame(function () {
                _pDrawRaf = null;
                if (window._conMirrorSend) {
                  window._conMirrorSend({
                    type: 'drawing-move',
                    positions: [{ id: d.id, x: d.x, y: d.y }]
                  });
                }
              });
            }
          }
        });
        el.addEventListener('pointerup', function (e) {
          if (e.pointerType === 'mouse') return;
          if (_pDrawRaf) { cancelAnimationFrame(_pDrawRaf); _pDrawRaf = null; }
          if (window._conMirrorSend) {
            window._conMirrorSend({
              type: 'drawing-move',
              positions: [{ id: d.id, x: d.x, y: d.y }]
            });
          }
          if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
          if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
          pDragging = false;
          setTimeout(() => {
            window._conMirrorDragging = false;
          }, 60);
        });
        _conDrawingAddHandles(d);
      }
      window.conDrawingBuild = conDrawingBuild;

      function _conDrawingUpdateGeom(d) {
        if (!d) return;
        if (!d.el) {
          try {
            const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(String(d.id)) : String(d.id).replace(/["\\]/g, '\\$&');
            d.el = document.querySelector('#constellation-board .con-drawing[data-did="' + escaped + '"], .con-drawing[data-did="' + escaped + '"]');
          } catch (_) {
            document.querySelectorAll('.con-drawing').forEach(el => {
              if (el.dataset && el.dataset.did === String(d.id)) d.el = el;
            });
          }
        }
        if (!d.el) return;
        if (!d.hitPath) d.hitPath = d.el.querySelector('path[stroke="transparent"]');
        if (!d.visPath) d.visPath = d.el.querySelectorAll('path')[1] || d.el.querySelector('path:not([stroke="transparent"])');
        if (!d.hitPath || !d.visPath) return;
        const PAD = d.pad || Math.max((d.thickness || 4) + 4, 12);
        d.el.style.left = (d.x - PAD) + 'px';
        d.el.style.top = (d.y - PAD) + 'px';
        d.el.style.width = (d.w + 2 * PAD) + 'px';
        d.el.style.height = (d.h + 2 * PAD) + 'px';
        const pts = Array.isArray(d.points) ? d.points : [];
        const pathD = (typeof _conBuildPathD === 'function') ? _conBuildPathD(pts.map(p => p === null ? null : ({ x: p.x + PAD, y: p.y + PAD }))) : '';
        d.hitPath.setAttribute('d', pathD);
        d.visPath.setAttribute('d', pathD);
      }
      window._conDrawingUpdateGeom = _conDrawingUpdateGeom;

      function _conDrawingHandlePos(d, hid) {
        const PAD = d.pad || Math.max((d.thickness || 4) + 4, 12);
        const cx = PAD + d.w / 2, cy = PAD + d.h / 2;
        const ex = PAD + d.w, ey = PAD + d.h;
        const map = { nw: [PAD, PAD], n: [cx, PAD], ne: [ex, PAD], w: [PAD, cy], e: [ex, cy], sw: [PAD, ey], s: [cx, ey], se: [ex, ey] };
        const [hx, hy] = map[hid] || [PAD, PAD];
        return { x: hx, y: hy };
      }

      function _conDrawingUpdateHandles(d) {
        if (!d.el) return;
        d.el.querySelectorAll('.con-drawing-handle').forEach(hel => {
          const { x, y } = _conDrawingHandlePos(d, hel.dataset.h);
          hel.style.left = (x - 4.5) + 'px';
          hel.style.top = (y - 4.5) + 'px';
        });
      }

      function _conDrawingHandleResize(d, hel, hid) {
        hel.addEventListener('mousedown', function (e) {
          if (e.button !== 0 || conMode !== 'move') return;
          e.preventDefault(); e.stopPropagation();
          window._conMirrorDragging = true;
          let _drawResizeRaf = null;
          const snap = {
            x: d.x, y: d.y, w: d.w, h: d.h,
            points: d.points.map(p => p === null ? null : { x: p.x, y: p.y })
          };
          function onMove(ev) {
            const dx = ev.clientX - e.clientX, dy = ev.clientY - e.clientY;
            let nx = snap.x, ny = snap.y, nw = snap.w, nh = snap.h;
            if (hid.includes('n')) { ny = snap.y + dy; nh = Math.max(2, snap.h - dy); }
            if (hid.includes('s')) { nh = Math.max(2, snap.h + dy); }
            if (hid.includes('w')) { nx = snap.x + dx; nw = Math.max(2, snap.w - dx); }
            if (hid.includes('e')) { nw = Math.max(2, snap.w + dx); }
            const sx = nw / snap.w, sy = nh / snap.h;
            d.x = nx; d.y = ny; d.w = nw; d.h = nh;
            d.points = snap.points.map(p => p === null ? null : { x: p.x * sx, y: p.y * sy });
            _conDrawingUpdateGeom(d);
            _conDrawingUpdateHandles(d);
            if (window._conMirrorSend) {
              if (!_drawResizeRaf) {
                _drawResizeRaf = requestAnimationFrame(function () {
                  _drawResizeRaf = null;
                  window._conMirrorSend({
                    type: 'drawing-resize',
                    id: String(d.id),
                    x: d.x, y: d.y, w: d.w, h: d.h,
                    points: d.points
                  });
                });
              }
            }
          }
          function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (_drawResizeRaf) { cancelAnimationFrame(_drawResizeRaf); _drawResizeRaf = null; }
            window._conMirrorDragging = false;
            if (window._conMirrorSend) {
              window._conMirrorSend({
                type: 'drawing-resize',
                id: String(d.id),
                x: d.x, y: d.y, w: d.w, h: d.h,
                points: d.points
              });
            }
            conPushUndo();
          }
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
      }

      function _conDrawingAddHandles(d) {
        if (!d.el) return;
        d.el.querySelectorAll('.con-drawing-handle').forEach(h => h.remove());
        const hids = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        const cursors = {
          nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', w: 'w-resize',
          e: 'e-resize', sw: 'sw-resize', s: 's-resize', se: 'se-resize'
        };
        hids.forEach(hid => {
          const hel = document.createElement('div');
          hel.className = 'con-drawing-handle';
          hel.dataset.h = hid;
          const { x, y } = _conDrawingHandlePos(d, hid);
          hel.style.left = (x - 4.5) + 'px';
          hel.style.top = (y - 4.5) + 'px';
          hel.style.cursor = cursors[hid];
          _conDrawingHandleResize(d, hel, hid);
          d.el.appendChild(hel);
        });
      }

      function _conDrawingShowHandles(d) {
        if (!d.el) return;
        d.el.querySelectorAll('.con-drawing-handle').forEach(h => h.style.display = 'block');
      }
      function _conDrawingHideHandles(d) {
        if (!d.el) return;
        d.el.querySelectorAll('.con-drawing-handle').forEach(h => h.style.display = 'none');
      }
      window._conDrawingShowHandles = global._conDrawingShowHandles = _conDrawingShowHandles;
      window._conDrawingHideHandles = global._conDrawingHideHandles = _conDrawingHideHandles;

      function conDrawingCtxOpen(e, drawId) {
        const d = conDrawings.find(dr => dr.id === drawId);
        const overlay = document.getElementById('con-drawing-style-overlay');
        const popup = document.getElementById('con-drawing-style-popup');
        if (!d || !overlay) return;
        _conDrawCtxId = drawId;

        const colorInput = document.getElementById('con-drawing-ctx-color');
        const colorText = document.getElementById('con-drawing-ctx-color-text');
        const thickSlider = document.getElementById('con-drawing-ctx-thickness');
        const thickVal = document.getElementById('con-drawing-ctx-thickness-val');
        const opacitySlider = document.getElementById('con-drawing-ctx-opacity');
        const opacityVal = document.getElementById('con-drawing-ctx-opacity-val');
        const dOpacity = Number.isFinite(d.opacity) ? d.opacity : 1;
        if (colorInput) colorInput.value = d.color;
        if (thickSlider) {
          _conSetupThicknessSlider(thickSlider, window.conThicknessUnit, 'drawing');
          thickSlider.value = String(conPxToThicknessUnit(d.thickness || 4, window.conThicknessUnit));
        }
        if (thickVal) thickVal.textContent = conFormatThickness(d.thickness || 4, window.conThicknessUnit);
        if (opacitySlider) opacitySlider.value = String(dOpacity);
        if (opacityVal) opacityVal.textContent = Math.round(dOpacity * 100) + '%';
        _conSyncUnitToggleButtons();

        if (colorInput) colorInput.oninput = function () {
          d.color = this.value;
          if (colorText) colorText.value = this.value.toUpperCase();
          if (d.visPath) d.visPath.setAttribute('stroke', d.color);
        };
        if (colorText) colorText.oninput = function () {
          const v = this.value.trim();
          if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
          d.color = v.toLowerCase();
          if (colorInput) colorInput.value = d.color;
          if (d.visPath) d.visPath.setAttribute('stroke', d.color);
        };
        if (thickSlider) thickSlider.oninput = function () {
          d.thickness = conThicknessUnitToPx(this.value, window.conThicknessUnit);
          if (thickVal) thickVal.textContent = conFormatThickness(d.thickness, window.conThicknessUnit);
          if (d.visPath) d.visPath.setAttribute('stroke-width', String(d.thickness));
          if (d.hitPath) d.hitPath.setAttribute('stroke-width', String(Math.max(20, d.thickness + 10)));
        };
        if (opacitySlider) opacitySlider.oninput = function () {
          d.opacity = Math.max(0.05, Math.min(1, Number(this.value) || 1));
          if (opacityVal) opacityVal.textContent = Math.round(d.opacity * 100) + '%';
          if (d.visPath) d.visPath.setAttribute('opacity', String(d.opacity));
        };

        overlay.classList.add('active');
        if (popup) {
          popup.style.maxHeight = Math.max(160, window.innerHeight - 16) + 'px';
          popup.style.maxWidth = Math.max(200, window.innerWidth - 16) + 'px';
          popup.style.overflowY = 'auto';
          popup.style.overflowX = 'hidden';
        }
        const pw = popup ? (popup.offsetWidth || 220) : 220;
        const ph = popup ? (popup.offsetHeight || 180) : 180;
        let mx = e.clientX + 6, my = e.clientY + 6;
        if (mx + pw > window.innerWidth - 8) mx = e.clientX - pw - 6;
        if (my + ph > window.innerHeight - 8) my = e.clientY - ph - 6;
        mx = Math.max(8, Math.min(window.innerWidth - pw - 8, mx));
        my = Math.max(8, Math.min(window.innerHeight - ph - 8, my));
        if (popup) {
          popup.style.left = Math.round(mx) + 'px';
          popup.style.top = Math.round(my) + 'px';
          popup.style.maxHeight = Math.max(160, window.innerHeight - my - 8) + 'px';
        }
      }
      window.conDrawingCtxOpen = global.conDrawingCtxOpen = conDrawingCtxOpen;

      window.conDrawingStyleClose = function (e) {
        if (e && e.target !== document.getElementById('con-drawing-style-overlay')) return;
        window.conDrawingCtxClose();
      };

      window.conDrawingCtxClose = function () {
        const overlay = document.getElementById('con-drawing-style-overlay');
        if (overlay) overlay.classList.remove('active');
        _conDrawCtxId = null;
      };

      // Close drawing style menu on outside click
      document.addEventListener('click', function (e) {
        if (!e.target.closest('#con-drawing-style-overlay')) {
          window.conDrawingCtxClose();
        }
      });

      window.conDrawingCtxSaveToLibrary = function () {
        const activeDid = _conDrawCtxId;
        window.conDrawingCtxClose();
        const hasMulti = (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0)
          || (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0)
          || (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 1)
          || (typeof _conShapeSelected !== 'undefined' && _conShapeSelected && _conShapeSelected.size > 0);
        if (hasMulti) {
          conSaveSelectionToLibraryPrompt();
        } else if (activeDid) {
          conSaveSelectionToLibraryPrompt(null, { drawingIds: [activeDid] });
        } else if (conDrawingSelected && conDrawingSelected.size > 0) {
          conSaveSelectionToLibraryPrompt(null, { drawingIds: [...conDrawingSelected] });
        }
      };

      function conDrawingDeleteSelected() {
        const toDelete = [];
        if (_conDrawCtxId) {
          toDelete.push(String(_conDrawCtxId));
        }
        if (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 0) {
          conDrawingSelected.forEach(id => {
            const sId = String(id);
            if (!toDelete.includes(sId)) toDelete.push(sId);
          });
        }
        if (toDelete.length === 0) return false;
        if (typeof conPushUndo === 'function') conPushUndo();

        const activeDraws = (typeof window.conGetDrawings === 'function')
          ? window.conGetDrawings()
          : ((typeof conDrawings !== 'undefined' && Array.isArray(conDrawings)) ? conDrawings : (global.conDrawings || []));

        toDelete.forEach(id => {
          // 1. Remove element directly via drawing object if found
          const d = activeDraws.find(dr => String(dr.id) === id)
            || (conDrawings && conDrawings.find(dr => String(dr.id) === id))
            || (global.conDrawings && global.conDrawings.find(dr => String(dr.id) === id));
          if (d && d.el && typeof d.el.remove === 'function') {
            try { d.el.remove(); } catch (_) {}
          }
          // 2. Remove by data-did attribute selector (defensive removal matching mirror logic)
          try {
            const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&');
            document.querySelectorAll('#constellation-board .con-drawing[data-did="' + escaped + '"], .con-drawing[data-did="' + escaped + '"]').forEach(el => {
              try { el.remove(); } catch (_) {}
            });
          } catch (_) {
            document.querySelectorAll('.con-drawing').forEach(el => {
              if (el.dataset && String(el.dataset.did) === id) {
                try { el.remove(); } catch (_) {}
              }
            });
          }
          // 3. Remove group linkage
          if (typeof conGroups !== 'undefined' && Array.isArray(conGroups)) {
            conGroups.forEach(g => {
              if (Array.isArray(g.drawingIds)) {
                g.drawingIds = g.drawingIds.filter(did => String(did) !== id);
              }
            });
          }
        });

        // Mutate drawing arrays in-place so all module references remain synchronized
        const delSet = new Set(toDelete);
        [conDrawings, global.conDrawings, window.conDrawings].forEach(arr => {
          if (Array.isArray(arr)) {
            for (let i = arr.length - 1; i >= 0; i--) {
              if (arr[i] && delSet.has(String(arr[i].id))) {
                arr.splice(i, 1);
              }
            }
          }
        });
        conDrawings = global.conDrawings = window.conDrawings = (global.conDrawings || conDrawings || []);

        if (typeof conDrawingSelected !== 'undefined' && conDrawingSelected) {
          conDrawingSelected.clear();
        }
        document.querySelectorAll('#constellation-board .con-drawing-handle').forEach(h => {
          if (!h.closest('.con-drawing')) try { h.remove(); } catch (_) {}
        });

        window.conDrawingCtxClose();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'drawing-remove', ids: toDelete });
        }
        if (typeof conMarkDirty === 'function') conMarkDirty();
        else if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        return true;
      }
      window.conDrawingDeleteSelected = global.conDrawingDeleteSelected = conDrawingDeleteSelected;

      window.conDrawingCtxDelete = function () {
        if (!_conDrawCtxId && (!conDrawingSelected || conDrawingSelected.size === 0)) return;
        conDrawingDeleteSelected();
      };
      window.conDrawingsClear = function () {
        conDrawings.forEach(d => { if (d.el) d.el.remove(); });
        conDrawings.length = 0;
        if (Array.isArray(global.conDrawings)) global.conDrawings.length = 0;
        if (Array.isArray(window.conDrawings)) window.conDrawings.length = 0;
        _conDrawNextId = 1;
        _conDrawCtxId = null;
        conDrawingSelected.clear();
        const overlay = document.getElementById('con-drawing-style-overlay');
        if (overlay) overlay.classList.remove('active');
        // Clear any orphaned live paths left in the capture SVG
        const liveSvg = document.getElementById('con-draw-live-svg');
        if (liveSvg) liveSvg.innerHTML = '';
        // Also clear shapes
        if (window.conShapesClear) window.conShapesClear();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'drawings-clear', clearShapes: true });
        }
      };
      window.conGetDrawings = function () { return (global.conDrawings || window.conDrawings || conDrawings || []); };

      function conDrawingFromData(src) {
        const _nonNullPts = Array.isArray(src.points) ? src.points.filter(p => p !== null && p !== undefined) : [];
        if (_nonNullPts.length < 2) return null;
        const idStr = (src.id != null && String(src.id).trim()) ? String(src.id).trim() : 'cd' + (_conDrawNextId++);
        const idNum = parseInt(String(idStr).replace(/^cd/, ''), 10);
        if (!isNaN(idNum)) _conDrawNextId = Math.max(_conDrawNextId, idNum + 1);
        const d = {
          id: idStr,
          x: Number(src.x) || 0,
          y: Number(src.y) || 0,
          w: Number(src.w) || 1,
          h: Number(src.h) || 1,
          points: src.points.map(p => (p === null || p === undefined) ? null : ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })),
          color: src.color || '#e53935',
          thickness: Number(src.thickness) || 4,
          opacity: Number.isFinite(Number(src.opacity)) && Number(src.opacity) > 0 ? Number(src.opacity) : 1,
          el: null, hitPath: null, visPath: null, pad: 0
        };
        conDrawings.push(d);
        conDrawingBuild(d);
        return d;
      }
      window.conDrawingFromData = conDrawingFromData;
  window._conBuildPathD = global._conBuildPathD = _conBuildPathD;
  window._conDrawingUpdateHandles = global._conDrawingUpdateHandles = _conDrawingUpdateHandles;

  Board.drawings = Board.drawings || {};
})(typeof window !== "undefined" ? window : this);