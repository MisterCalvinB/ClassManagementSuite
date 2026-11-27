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
      function conAttachNode(id, el) {
        return conAttachNodeEvents(id, el);
      }

      function conAttachNodeEvents(id, el) {
        // Right-click context menu
        el.addEventListener('contextmenu', function (e) {
          const _ctxNode = conNodes.find(n => n && (n.id === id || String(n.id) === String(id)))
            || ((global.conNodes || []).find(n => n && (n.id === id || String(n.id) === String(id))));
          if (_ctxNode && _ctxNode.isRandom && typeof conOpenRandomPopover === 'function') {
            e.preventDefault();
            e.stopPropagation();
            conOpenRandomPopover(_ctxNode);
          } else if (_ctxNode && (_ctxNode.isLink || _ctxNode.isBookmark || _ctxNode.type === 'link') && typeof window.conLinkStyleOpen === 'function') {
            e.preventDefault();
            e.stopPropagation();
            window.conLinkStyleOpen(e, _ctxNode);
          } else {
            conCtxOpen(e, id);
          }
        });

        // Double-click to make a node visibly blink for attention or activate link.
        el.addEventListener('dblclick', function (e) {
          if (document.body.classList.contains('laser-active')) return;
          e.preventDefault();
          e.stopPropagation();
          const node = conNodes.find(n => n && (n.id === id || String(n.id) === String(id)))
            || ((global.conNodes || []).find(n => n && (n.id === id || String(n.id) === String(id))));
          if (node && (node.isLink || node.isBookmark || node.type === 'link') && typeof window.conActivateLinkNode === 'function') {
            window.conActivateLinkNode(node);
            return;
          }
          if (node && node.masked) {
            node.masked = false;
            el.classList.remove('con-masked');
            if (typeof conRedrawEdges === 'function') conRedrawEdges();
            if (typeof window._conMirrorSend === 'function') {
              window._conMirrorSend({ type: 'node-mask', nodeId: String(node.id), masked: false });
            }
            conPlayRevealAnimation('node', node, el);
            return;
          }
          conBlinkNodeAttention(el);
        });

        // Resize handle (bottom-right corner) — scales font-size proportionally
        const _resizer = document.createElement('div');
        _resizer.className = 'con-node-resizer';
        el.appendChild(_resizer);
        {
          let _rz = false, _rx = 0, _rFontSize = 0, _rWidth = 0;
          let _nodeResizeRaf = null;
          let _pendingNodeResizeMsg = null;
          _resizer.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            const _rzNode = conNodes.find(n => n && (n.id === id || String(n.id) === String(id)))
              || ((global.conNodes || []).find(n => n && (n.id === id || String(n.id) === String(id))));
            if (!_rzNode || conIsNodeLocked(_rzNode)) return;
            const _rzGroup = conGroupOfNode(id);
            if (_rzGroup && _rzGroup.phraseGroup) return;
            e.preventDefault(); e.stopPropagation();
            _rz = true;
            window._conMirrorDragging = true;
            _rx = e.clientX;
            _rFontSize = conGetNodeBaseFontSize(_rzNode || el);
            _rWidth = el.offsetWidth;
          });
          document.addEventListener('mousemove', function (e) {
            if (!_rz) return;
            const dx = e.clientX - _rx;
            const newWidth = Math.max(20, _rWidth + dx);
            const scale = newWidth / _rWidth;
            const newFs = Math.max(8, Math.min(96, Math.round(_rFontSize * scale)));
            const node = conNodes.find(n => n && (n.id === id || String(n.id) === String(id)))
              || ((global.conNodes || []).find(n => n && (n.id === id || String(n.id) === String(id))));
            if (node) {
              conSetNodeBaseFontSize(node, newFs);
              conApplyNodeShape(node, node.shape);
            }
            conRedrawEdges();
            conGroupRefitAll();
            if (window._conMirrorSend) {
              _pendingNodeResizeMsg = {
                type: 'node-resize',
                id: String(id),
                fontSize: newFs,
                shape: node ? node.shape : undefined
              };
              if (!_nodeResizeRaf) {
                _nodeResizeRaf = requestAnimationFrame(function () {
                  _nodeResizeRaf = null;
                  if (window._conMirrorSend && _pendingNodeResizeMsg) {
                    window._conMirrorSend(_pendingNodeResizeMsg);
                  }
                });
              }
            }
          });
          document.addEventListener('mouseup', function () {
            if (!_rz) return;
            const _finalNode = conNodes.find(n => n && (n.id === id || String(n.id) === String(id)))
              || ((global.conNodes || []).find(n => n && (n.id === id || String(n.id) === String(id))));
            if (_finalNode) {
              _finalNode._cachedW = undefined;
              _finalNode._cachedH = undefined;
              _finalNode.w = undefined;
              _finalNode.h = undefined;
            }
            if (_nodeResizeRaf) { cancelAnimationFrame(_nodeResizeRaf); _nodeResizeRaf = null; }
            if (window._conMirrorSend && _pendingNodeResizeMsg) {
              window._conMirrorSend(_pendingNodeResizeMsg);
              _pendingNodeResizeMsg = null;
            }
            conGroupRefitAll();
            _rz = false;
            if (typeof window.conPushUndo === 'function') window.conPushUndo();
            setTimeout(() => {
              window._conMirrorDragging = false;
            }, 60);
          });
        }

        // Emoji reaction dot (top-right corner)
        if (window.conEmojiAttachNodeDot) window.conEmojiAttachNodeDot(id, el);
        // Quick preset style button (left of emoji dot)
        if (window.conPresetAttachNodeBtn) window.conPresetAttachNodeBtn(id, el);

        // All click logic lives here in mousedown/onUp so modifier keys are available
        let dragging = false, ox = 0, oy = 0, startX = 0, startY = 0;
        let _preDragSnap = null, _conNodeMoveRaf = null;
        el.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return; // left button only
          if (e.target.closest('.con-node-resizer')) return; // let resizer handle it
          if (e.target.closest('.con-emoji-dot')) return; // let emoji dot handle it
          if (e.target.closest('.con-node-preset-btn')) return; // let preset btn handle it
          if (e.target.closest('.con-node-note-btn')) return; // let note toggle btn handle it
          if (e.target.closest('.con-node-star-btn')) return; // let star btn handle it

          if (window.conNumberingMode) {
            e.preventDefault();
            e.stopPropagation();
            const n = conNodes.find(item => item && (item.id === id || String(item.id) === String(id)))
              || ((global.conNodes || []).find(item => item && (item.id === id || String(item.id) === String(id))));
            if (typeof conHandleEntityClickForNumbering === 'function') {
              conHandleEntityClickForNumbering('node', n, el, e);
            }
            return;
          }

          // Phrase-group nodes can be individually selected or clicked without delegating away from the node

          e.stopPropagation(); // prevent board rubber-band from firing

          // delete / connect modes: handle immediately on mousedown
          if (conMode === 'delete') { e.preventDefault(); conPushUndo(); conRemoveNode(id); return; }
          if (conMode === 'connect') {
            e.preventDefault();
            if (!conConnSrc) {
              conConnSrc = id;
              el.classList.add('con-src');
              conUpdateInstructions('connect-src');
            } else if (conConnSrc !== id) {
              conPushUndo();
              conAddEdge(conConnSrc, id);
              conNodes.forEach(n => n.el.classList.remove('con-src'));
              conConnSrc = null;
              conUpdateInstructions('connect');
            }
            return;
          }

          // Move mode — handle drag + click + ctrl/shift multi-select
          e.preventDefault();
          const _ae = document.activeElement;
          if (_ae && (_ae.tagName === 'INPUT' || _ae.tagName === 'TEXTAREA' || _ae.tagName === 'SELECT' || _ae.isContentEditable)) {
            try { _ae.blur(); } catch (_) {}
          }
          const node = conNodes.find(n => n && (n.id === id || String(n.id) === String(id)))
            || ((global.conNodes || []).find(n => n && (n.id === id || String(n.id) === String(id))));
          if (!node) return;
          ox = e.clientX - node.x;
          oy = e.clientY - node.y;
          startX = e.clientX; startY = e.clientY;
          dragging = false;
          _preDragSnap = conBuildPageSnapshot();

          // Snapshot offsets for all multi-selected nodes relative to this drag origin
          const allSelectedNodeIds = new Set();
          if (typeof window.conGetMultiSelected === 'function' && window.conGetMultiSelected()) {
            window.conGetMultiSelected().forEach(nid => allSelectedNodeIds.add(nid));
          }
          if (typeof window.conMultiSelected !== 'undefined' && window.conMultiSelected) {
            window.conMultiSelected.forEach(nid => allSelectedNodeIds.add(nid));
          }
          if (typeof conMultiSelected !== 'undefined' && conMultiSelected) {
            conMultiSelected.forEach(nid => allSelectedNodeIds.add(nid));
          }
          if (conSelected) allSelectedNodeIds.add(conSelected);
          if (typeof window.conSelected !== 'undefined' && window.conSelected) allSelectedNodeIds.add(window.conSelected);
          if (el.classList.contains('con-selected') || el.classList.contains('con-multi-selected')) {
            allSelectedNodeIds.add(id);
          }
          const isSelected = allSelectedNodeIds.has(id) || allSelectedNodeIds.has(String(id)) || allSelectedNodeIds.has(Number(id));

          // Collect selected notes (live notes list, live selection set, plus DOM fallback)
          const activeNoteSel = new Set();
          if (typeof window.conGetNoteSelected === 'function' && window.conGetNoteSelected()) {
            window.conGetNoteSelected().forEach(nid => activeNoteSel.add(nid));
          }
          if (typeof window.conNoteSelected !== 'undefined' && window.conNoteSelected) {
            window.conNoteSelected.forEach(nid => activeNoteSel.add(nid));
          }
          if (typeof conNoteSelected !== 'undefined' && conNoteSelected) {
            conNoteSelected.forEach(nid => activeNoteSel.add(nid));
          }
          document.querySelectorAll('#constellation-board .con-word-note.wn-selected').forEach(wel => {
            const did = wel.dataset.id || wel.id;
            if (did) activeNoteSel.add(did);
          });

          const shapeSel = window.conGetShapeSelected ? window.conGetShapeSelected() : (typeof _conShapeSelected !== 'undefined' ? _conShapeSelected : new Set());
          const tableSel = (typeof conTableSelected !== 'undefined') ? conTableSelected : new Set();
          const mediaSel = (typeof window.conGetMediaSelected === 'function') ? window.conGetMediaSelected() : (typeof conMediaSelected !== 'undefined' ? conMediaSelected : new Set());
          const totalSelectedObjects = allSelectedNodeIds.size + activeNoteSel.size + conDrawingSelected.size + shapeSel.size + tableSel.size + (mediaSel ? mediaSel.size : 0);
          const isMulti = isSelected && (allSelectedNodeIds.size > 1 || totalSelectedObjects > 1);

          // Expand selection to include phrase siblings of any selected node
          let _multiDragIds = null;
          const _nodePhraseGroup = conGroupOfNode(id);
          const isPhraseMember = !!(_nodePhraseGroup && _nodePhraseGroup.phraseGroup);
          if (isMulti) {
            _multiDragIds = new Set(allSelectedNodeIds);
            allSelectedNodeIds.forEach(nid => {
              const pg = conGroups.find(g => g.phraseGroup && g.nodeIds && (g.nodeIds.includes(nid) || g.nodeIds.some(sid => String(sid) === String(nid))));
              if (pg) pg.nodeIds.forEach(sid => _multiDragIds.add(sid));
            });
          } else if (isPhraseMember) {
            _multiDragIds = new Set(_nodePhraseGroup.nodeIds);
          }
          const groupSnap = (isMulti || isPhraseMember)
            ? conNodes.filter(n => (_multiDragIds && (_multiDragIds.has(n.id) || _multiDragIds.has(String(n.id)))) && !conIsNodeLocked(n)).map(n => ({ n, dx: n.x - node.x, dy: n.y - node.y }))
            : null;
          // Snapshot selected notes for joint drag
          const liveNotes = (typeof window.conGetNotes === 'function')
            ? window.conGetNotes()
            : ((typeof window.conNotes !== 'undefined' && Array.isArray(window.conNotes))
              ? window.conNotes
              : ((typeof conNotes !== 'undefined' && Array.isArray(conNotes)) ? conNotes : (global.conNotes || [])));
          const nodeStartX = node.x, nodeStartY = node.y;
          const noteGroupSnap = (activeNoteSel.size > 0 && isSelected)
            ? Array.from(activeNoteSel).map(nid => {
              const nd = liveNotes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
              if (!nd || nd.locked) return null;
              const noteEl = (typeof window.wnGetNoteElementById === 'function')
                ? window.wnGetNoteElementById(nd.id)
                : ((typeof wnGetNoteElementById === 'function')
                  ? wnGetNoteElementById(nd.id)
                  : (document.querySelector(`.con-word-note[data-id="${nd.id}"]`) || document.getElementById(nd.id)));
              const snapX = (nd.x != null) ? nd.x : (noteEl ? (parseInt(noteEl.style.left) || 0) : 0);
              const snapY = (nd.y != null) ? nd.y : (noteEl ? (parseInt(noteEl.style.top) || 0) : 0);
              return { nd, snapX, snapY, el: noteEl };
            }).filter(Boolean)
            : [];
          // Snapshot selected drawings for joint drag
          const drawGroupSnap = (conDrawingSelected.size > 0 && isSelected)
            ? Array.from(conDrawingSelected).map(did => {
              const dr = conDrawings.find(d => d.id === did);
              return dr ? { dr, snapX: dr.x, snapY: dr.y, pad: dr.pad || 12 } : null;
            }).filter(Boolean)
            : [];
          // Snapshot selected shapes for joint drag
          const shapeGroupSnap = (shapeSel.size > 0 && isSelected)
            ? Array.from(shapeSel).map(sid => {
              const s = (typeof conShapes !== 'undefined' ? conShapes : []).find(x => x.id === sid);
              return s ? {
                s, snapX: s.x, snapY: s.y,
                snapLx1: s.lx1, snapLy1: s.ly1, snapLx2: s.lx2, snapLy2: s.ly2,
                snapPts: s.pts ? s.pts.map(p => ({ ...p })) : null,
                pad: s.pad || (typeof _conShapeGetPAD === 'function' ? _conShapeGetPAD(s) : 16)
              } : null;
            }).filter(Boolean)
            : [];
          // Snapshot selected tables for joint drag
          const tableGroupSnap = (tableSel.size > 0 && isSelected)
            ? Array.from(tableSel).map(tid => {
              const tbl = (window.conGetTables ? window.conGetTables() : []).find(t => t.id === tid);
              return tbl ? { tbl, snapX: tbl.x, snapY: tbl.y } : null;
            }).filter(Boolean)
            : [];
          // Snapshot selected media items for joint drag
          const mediaGroupSnap = (mediaSel && mediaSel.size > 0 && isSelected)
            ? Array.from(mediaSel).map(mid => {
              const liveMedia = (typeof window.conGetMediaItems === 'function') ? window.conGetMediaItems() : (typeof conMediaItems !== 'undefined' ? conMediaItems : []);
              const m = liveMedia.find(x => x && (x.id === mid || String(x.id) === String(mid)));
              if (!m || m.locked) return null;
              const mEl = document.querySelector(`.con-media-item[data-id="${m.id}"]`) || (m.wrap || null);
              return { m, snapX: m.x, snapY: m.y, el: mEl };
            }).filter(Boolean)
            : [];

          // Determine marker node for snapping (top-left node if multi-selected, or the dragged node itself)
          let markerNode = node;
          let markerDx = 0;
          let markerDy = 0;
          if (groupSnap && groupSnap.length > 0) {
            let minX = Infinity, minY = Infinity;
            groupSnap.forEach(({ n }) => {
              if (n.x < minX) minX = n.x;
              if (n.y < minY) minY = n.y;
            });
            let bestDistSq = Infinity;
            let markerItem = groupSnap[0];
            groupSnap.forEach(item => {
              const dX = item.n.x - minX;
              const dY = item.n.y - minY;
              const distSq = dX * dX + dY * dY;
              if (distSq < bestDistSq) {
                bestDistSq = distSq;
                markerItem = item;
              } else if (Math.abs(distSq - bestDistSq) < 1e-4) {
                if (item.n.y < markerItem.n.y || (item.n.y === markerItem.n.y && item.n.x < markerItem.n.x)) {
                  markerItem = item;
                }
              }
            });
            markerNode = markerItem.n;
            markerDx = markerItem.dx;
            markerDy = markerItem.dy;
          }
          const minGroupDx = groupSnap ? Math.min(...groupSnap.map(g => g.dx)) : 0;
          const minGroupDy = groupSnap ? Math.min(...groupSnap.map(g => g.dy)) : 0;

          function onMove(e) {
            if (conIsNodeLocked(node)) return;
            // Nodes inside a phrase group move only as a group — block solo drag (allow if multi-select or phrase groupSnap active)
            const _phraseGrp = conGroupOfNode(id);
            if (_phraseGrp && _phraseGrp.phraseGroup && !isMulti && !groupSnap) return;
            const brd = board();
            let nx = e.clientX - ox;
            let ny = e.clientY - oy;
            nx = Math.max(-minGroupDx, nx);
            ny = Math.max(-minGroupDy, ny);
            if (!dragging && Math.abs(e.clientX - startX) < 3 && Math.abs(e.clientY - startY) < 3) return;
            dragging = true;
            window._conMirrorDragging = true; // suppress heavy MutationObserver broadcast during drag
            window._conTblDraggingNodeId = id;

            // Snap align (single or multi-node drag) — hold Alt to bypass
            if (conSnapEnabled && !e.altKey) {
              const SNAP_DIST = 8;
              const markerEl = markerNode ? markerNode.el : el;
              const elW = markerEl ? markerEl.offsetWidth : 80;
              const elH = markerEl ? markerEl.offsetHeight : 32;
              const curMarkerX = nx + markerDx;
              const curMarkerY = ny + markerDy;
              const dragAnchorsX = [curMarkerX, curMarkerX + elW / 2, curMarkerX + elW];
              const dragAnchorsY = [curMarkerY, curMarkerY + elH / 2, curMarkerY + elH];
              let bestSnapX = null, bestSnapY = null;

              const draggedNodeIds = _multiDragIds || new Set([id]);

              conNodes.forEach(sn => {
                if (draggedNodeIds.has(sn.id)) return;
                const snW = sn.el ? sn.el.offsetWidth : 80, snH = sn.el ? sn.el.offsetHeight : 32;
                [sn.x, sn.x + snW / 2, sn.x + snW].forEach(na => {
                  dragAnchorsX.forEach(da => {
                    const diff = Math.abs(da - na);
                    if (diff < SNAP_DIST && (!bestSnapX || diff < bestSnapX.diff))
                      bestSnapX = { shift: na - da, line: na, diff };
                  });
                });
                [sn.y, sn.y + snH / 2, sn.y + snH].forEach(na => {
                  dragAnchorsY.forEach(da => {
                    const diff = Math.abs(da - na);
                    if (diff < SNAP_DIST && (!bestSnapY || diff < bestSnapY.diff))
                      bestSnapY = { shift: na - da, line: na, diff };
                  });
                });
              });
              // Also consider notes
              conNotes.forEach(on => {
                if (conNoteSelected && conNoteSelected.has(on.id)) return;
                const oEl = wnGetNoteElementById(on.id);
                const oW = oEl ? oEl.offsetWidth : (on.width || 120), oH = oEl ? oEl.offsetHeight : (on.height || 80);
                [on.x, on.x + oW / 2, on.x + oW].forEach(na => {
                  dragAnchorsX.forEach(da => {
                    const diff = Math.abs(da - na);
                    if (diff < SNAP_DIST && (!bestSnapX || diff < bestSnapX.diff)) bestSnapX = { shift: na - da, line: na, diff };
                  });
                });
                [on.y, on.y + oH / 2, on.y + oH].forEach(na => {
                  dragAnchorsY.forEach(da => {
                    const diff = Math.abs(da - na);
                    if (diff < SNAP_DIST && (!bestSnapY || diff < bestSnapY.diff)) bestSnapY = { shift: na - da, line: na, diff };
                  });
                });
              });
              // Consider shapes
              conShapes.forEach(sh => {
                if (shapeSel && shapeSel.has(sh.id)) return;
                const sW = Math.max(2, sh.w || 40), sH = Math.max(2, sh.h || 40);
                [sh.x, sh.x + sW / 2, sh.x + sW].forEach(na => {
                  dragAnchorsX.forEach(da => {
                    const diff = Math.abs(da - na);
                    if (diff < SNAP_DIST && (!bestSnapX || diff < bestSnapX.diff)) bestSnapX = { shift: na - da, line: na, diff };
                  });
                });
                [sh.y, sh.y + sH / 2, sh.y + sH].forEach(na => {
                  dragAnchorsY.forEach(da => {
                    const diff = Math.abs(da - na);
                    if (diff < SNAP_DIST && (!bestSnapY || diff < bestSnapY.diff)) bestSnapY = { shift: na - da, line: na, diff };
                  });
                });
              });
              // Consider freehand drawings
              conDrawings.forEach(d => {
                if (conDrawingSelected && conDrawingSelected.has(d.id)) return;
                const dW = Math.max(2, d.w || 40), dH = Math.max(2, d.h || 40);
                [d.x, d.x + dW / 2, d.x + dW].forEach(na => {
                  dragAnchorsX.forEach(da => {
                    const diff = Math.abs(da - na);
                    if (diff < SNAP_DIST && (!bestSnapX || diff < bestSnapX.diff)) bestSnapX = { shift: na - da, line: na, diff };
                  });
                });
                [d.y, d.y + dH / 2, d.y + dH].forEach(na => {
                  dragAnchorsY.forEach(da => {
                    const diff = Math.abs(da - na);
                    if (diff < SNAP_DIST && (!bestSnapY || diff < bestSnapY.diff)) bestSnapY = { shift: na - da, line: na, diff };
                  });
                });
              });
              // Consider tables
              const allTables = (window.conGetTables ? window.conGetTables() : []);
              allTables.forEach(tbl => {
                if (tableSel && tableSel.has(tbl.id)) return;
                const tW = Math.max(20, tbl.w || 200), tH = Math.max(20, tbl.h || 100);
                [tbl.x, tbl.x + tW / 2, tbl.x + tW].forEach(na => {
                  dragAnchorsX.forEach(da => {
                    const diff = Math.abs(da - na);
                    if (diff < SNAP_DIST && (!bestSnapX || diff < bestSnapX.diff)) bestSnapX = { shift: na - da, line: na, diff };
                  });
                });
                [tbl.y, tbl.y + tH / 2, tbl.y + tH].forEach(na => {
                  dragAnchorsY.forEach(da => {
                    const diff = Math.abs(da - na);
                    if (diff < SNAP_DIST && (!bestSnapY || diff < bestSnapY.diff)) bestSnapY = { shift: na - da, line: na, diff };
                  });
                });
              });

              const svgEl = document.getElementById('constellation-svg');
              document.querySelectorAll('.con-snap-line').forEach(l => l.remove());
              if (bestSnapX !== null) {
                nx = Math.max(-minGroupDx, nx + bestSnapX.shift);
                const sl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                sl.setAttribute('class', 'con-snap-line');
                sl.setAttribute('x1', bestSnapX.line); sl.setAttribute('y1', 0);
                sl.setAttribute('x2', bestSnapX.line); sl.setAttribute('y2', Math.max(brd.clientHeight, brd.scrollHeight));
                svgEl.appendChild(sl);
              }
              if (bestSnapY !== null) {
                ny = Math.max(-minGroupDy, ny + bestSnapY.shift);
                const sl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                sl.setAttribute('class', 'con-snap-line');
                sl.setAttribute('x1', 0); sl.setAttribute('y1', bestSnapY.line);
                sl.setAttribute('x2', Math.max(brd.clientWidth, brd.scrollWidth)); sl.setAttribute('y2', bestSnapY.line);
                svgEl.appendChild(sl);
              }
            } else {
              document.querySelectorAll('.con-snap-line').forEach(l => l.remove());
            }

            if (groupSnap) {
              groupSnap.forEach(({ n, dx, dy }) => {
                n.x = Math.max(0, nx + dx);
                n.y = Math.max(0, ny + dy);
                n.el.style.left = n.x + 'px';
                n.el.style.top = n.y + 'px';
              });
            } else {
              node.x = nx; node.y = ny;
              el.style.left = nx + 'px';
              el.style.top = ny + 'px';
            }
            // Move jointly-selected notes
            if (noteGroupSnap.length > 0) {
              const ddx = node.x - nodeStartX, ddy = node.y - nodeStartY;
              noteGroupSnap.forEach(({ nd, snapX, snapY, el: sEl }) => {
                nd.x = snapX + ddx;
                nd.y = snapY + ddy;
                const noteEl = sEl || (typeof window.wnGetNoteElementById === 'function'
                  ? window.wnGetNoteElementById(nd.id)
                  : ((typeof wnGetNoteElementById === 'function')
                    ? wnGetNoteElementById(nd.id)
                    : (document.querySelector(`.con-word-note[data-id="${nd.id}"]`) || document.getElementById(nd.id))));
                if (noteEl) { noteEl.style.left = nd.x + 'px'; noteEl.style.top = nd.y + 'px'; }
              });
            }
            // Move jointly-selected drawings
            if (drawGroupSnap.length > 0) {
              const ddx = node.x - nodeStartX, ddy = node.y - nodeStartY;
              drawGroupSnap.forEach(({ dr, snapX, snapY, pad }) => {
                dr.x = snapX + ddx;
                dr.y = snapY + ddy;
                const p = pad !== undefined ? pad : (dr.pad || 12);
                if (dr.el) { dr.el.style.left = (dr.x - p) + 'px'; dr.el.style.top = (dr.y - p) + 'px'; }
              });
            }
            // Move jointly-selected shapes
            if (shapeGroupSnap.length > 0) {
              const ddx = node.x - nodeStartX, ddy = node.y - nodeStartY;
              shapeGroupSnap.forEach(({ s, snapX, snapY, snapLx1, snapLy1, snapLx2, snapLy2, snapPts, pad }) => {
                s.x = snapX + ddx;
                s.y = snapY + ddy;
                if (s.lx1 !== undefined && snapLx1 !== undefined) {
                  s.lx1 = snapLx1 + ddx; s.ly1 = snapLy1 + ddy;
                  s.lx2 = snapLx2 + ddx; s.ly2 = snapLy2 + ddy;
                }
                if (s.pts && snapPts) {
                  s.pts = snapPts.map(p => ({ x: p.x + ddx, y: p.y + ddy }));
                }
                const p = pad !== undefined ? pad : (s.pad || 16);
                if (s.el) { s.el.style.left = (s.x - p) + 'px'; s.el.style.top = (s.y - p) + 'px'; }
                if (typeof _conShapeUpdateHandles === 'function') _conShapeUpdateHandles(s);
              });
            }
            // Move jointly-selected tables
            if (tableGroupSnap.length > 0) {
              const ddx = node.x - nodeStartX, ddy = node.y - nodeStartY;
              tableGroupSnap.forEach(({ tbl, snapX, snapY }) => {
                tbl.x = snapX + ddx;
                tbl.y = snapY + ddy;
                if (tbl.el) { tbl.el.style.left = tbl.x + 'px'; tbl.el.style.top = tbl.y + 'px'; }
              });
            }
            // Move jointly-selected media items
            if (mediaGroupSnap.length > 0) {
              const ddx = node.x - nodeStartX, ddy = node.y - nodeStartY;
              mediaGroupSnap.forEach(({ m, snapX, snapY, el: mEl }) => {
                m.x = Math.max(0, snapX + ddx);
                m.y = Math.max(0, snapY + ddy);
                const targetEl = mEl || document.querySelector(`.con-media-item[data-id="${m.id}"]`);
                if (targetEl) { targetEl.style.left = m.x + 'px'; targetEl.style.top = m.y + 'px'; }
              });
            }
            // Auto-expand board height if dragged nodes or notes approach the bottom
            if (typeof window.conMaybeAutoExpandBoard === 'function') {
              let maxBottom = (node.y || 0) + (el.offsetHeight || 32);
              if (groupSnap) {
                groupSnap.forEach(({ n }) => {
                  const b = (n.y || 0) + ((n.el && n.el.offsetHeight) || 32);
                  if (b > maxBottom) maxBottom = b;
                });
              }
              if (noteGroupSnap.length > 0) {
                noteGroupSnap.forEach(({ nd, el: sEl }) => {
                  const b = (nd.y || 0) + ((sEl && sEl.offsetHeight) || nd.height || 80);
                  if (b > maxBottom) maxBottom = b;
                });
              }
              window.conMaybeAutoExpandBoard(maxBottom, { skipSave: true });
            }
            // Highlight nearby nodes as drop targets (single-node drag only)
            if (!groupSnap) {
              const DROP_DIST = 24;
              const selfW = (node._cachedW > 0 ? node._cachedW : (node._cachedW = el.offsetWidth || 80));
              const selfH = (node._cachedH > 0 ? node._cachedH : (node._cachedH = el.offsetHeight || 32));
              const selfCx = node.x + selfW / 2;
              const selfCy = node.y + selfH / 2;
              conNodes.forEach(n => {
                if (n.id === id) return;
                const nw = (n._cachedW > 0 ? n._cachedW : (n._cachedW = (n.el && n.el.offsetWidth) || 80));
                const nh = (n._cachedH > 0 ? n._cachedH : (n._cachedH = (n.el && n.el.offsetHeight) || 32));
                const dx = (n.x + nw / 2) - selfCx;
                const dy = (n.y + nh / 2) - selfCy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                n.el.classList.toggle('con-drop-target', dist < DROP_DIST);
              });
            }
            conRedrawEdges({ preserveSizeCache: true });
            conGroupRefitAll();
            // Send lightweight move messages to mirror throttled to rAF — avoids full snapshot during drag
            if (window._conMirrorSend) {
              window._conMirrorDragging = true;
              if (!_conNodeMoveRaf) {
                _conNodeMoveRaf = requestAnimationFrame(function () {
                  _conNodeMoveRaf = null;
                  if (!window._conMirrorSend) return;
                  const _mirrorPositions = [];
                  if (groupSnap) {
                    groupSnap.forEach(function ({ n }) { _mirrorPositions.push({ id: n.id, x: n.x, y: n.y }); });
                  } else {
                    _mirrorPositions.push({ id: node.id, x: node.x, y: node.y });
                  }
                  window._conMirrorSend({ type: 'node-move', positions: _mirrorPositions });
                  if (noteGroupSnap.length > 0) {
                    window._conMirrorSend({
                      type: 'note-move',
                      positions: noteGroupSnap.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y }))
                    });
                  }
                  if (drawGroupSnap.length > 0) {
                    window._conMirrorSend({
                      type: 'drawing-move',
                      positions: drawGroupSnap.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y }))
                    });
                  }
                  if (shapeGroupSnap.length > 0) {
                    window._conMirrorSend({
                      type: 'shape-move',
                      positions: shapeGroupSnap.map(({ s }) => ({
                        id: s.id, x: s.x, y: s.y,
                        lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                        pts: s.pts ? s.pts.map(p => ({ ...p })) : undefined
                      }))
                    });
                  }
                  if (tableGroupSnap.length > 0) {
                    window._conMirrorSend({
                      type: 'table-move',
                      positions: tableGroupSnap.map(({ tbl }) => ({ id: tbl.id, x: tbl.x, y: tbl.y }))
                    });
                  }
                  if (mediaGroupSnap.length > 0) {
                    window._conMirrorSend({
                      type: 'media-move',
                      positions: mediaGroupSnap.map(({ m }) => ({ id: m.id, x: m.x, y: m.y }))
                    });
                  }
                });
              }
            }
          }
          function onUp(e) {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (_conNodeMoveRaf) {
              cancelAnimationFrame(_conNodeMoveRaf);
              _conNodeMoveRaf = null;
            }
            if (dragging && window._conMirrorSend) {
              const _mirrorPositions = [];
              if (groupSnap) {
                groupSnap.forEach(function ({ n }) { _mirrorPositions.push({ id: n.id, x: n.x, y: n.y }); });
              } else {
                _mirrorPositions.push({ id: node.id, x: node.x, y: node.y });
              }
              window._conMirrorSend({ type: 'node-move', positions: _mirrorPositions });
              if (noteGroupSnap.length > 0) {
                window._conMirrorSend({
                  type: 'note-move',
                  positions: noteGroupSnap.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y }))
                });
              }
              if (drawGroupSnap.length > 0) {
                window._conMirrorSend({
                  type: 'drawing-move',
                  positions: drawGroupSnap.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y }))
                });
              }
              if (shapeGroupSnap.length > 0) {
                window._conMirrorSend({
                  type: 'shape-move',
                  positions: shapeGroupSnap.map(({ s }) => ({
                    id: s.id, x: s.x, y: s.y,
                    lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                    pts: s.pts ? s.pts.map(p => ({ ...p })) : undefined
                  }))
                });
              }
              if (tableGroupSnap.length > 0) {
                window._conMirrorSend({
                  type: 'table-move',
                  positions: tableGroupSnap.map(({ tbl }) => ({ id: tbl.id, x: tbl.x, y: tbl.y }))
                });
              }
              if (mediaGroupSnap.length > 0) {
                window._conMirrorSend({
                  type: 'media-move',
                  positions: mediaGroupSnap.map(({ m }) => ({ id: m.id, x: m.x, y: m.y }))
                });
              }
            }
            // Lift drag suppression after trailing MutationObserver ticks
            setTimeout(() => { window._conMirrorDragging = false; }, 60);
            // Clear snap lines and drop-target highlights
            document.querySelectorAll('.con-snap-line').forEach(l => l.remove());
            conNodes.forEach(n => n.el.classList.remove('con-drop-target'));
            window._conTblDraggingNodeId = null;
            document.querySelectorAll('.con-table-drop-highlight').forEach(x => x.classList.remove('con-table-drop-highlight'));

            if (dragging && _preDragSnap) conPushUndo(_preDragSnap);
            if (dragging && !groupSnap) {
              // Update baseX, baseY based on current zoom level
              const board = document.getElementById('constellation-board');
              const boardCenterX = board.clientWidth / 2;
              const boardCenterY = board.clientHeight / 2;
              node.baseX = boardCenterX + (node.x - boardCenterX) / conCurrentZoom;
              node.baseY = boardCenterY + (node.y - boardCenterY) / conCurrentZoom;
              // Single-node drag: check if dropped close to another node → create/join group
              const DROP_DIST = 24;
              const targetNode = conNodes.find(n => {
                if (n.id === id) return false;
                const dx = (n.x + (n.el.offsetWidth || 80) / 2) - (node.x + (el.offsetWidth || 80) / 2);
                const dy = (n.y + (n.el.offsetHeight || 32) / 2) - (node.y + (el.offsetHeight || 32) / 2);
                return Math.sqrt(dx * dx + dy * dy) < DROP_DIST;
              });
              if (targetNode) {
                requestAnimationFrame(() => conGroupMergeOrCreate(id, targetNode.id));
              } else {
                // Check if dropped inside any group rect
                const cx = node.x + (el.offsetWidth || 80) / 2;
                const cy = node.y + (el.offsetHeight || 32) / 2;
                const hitGroup = conGroups.find(g => {
                  if (g.nodeIds.includes(id)) return false;
                  if (g.phraseGroup) return false; // don't drop into phrase groups
                  const gl = parseFloat(g.el.style.left), gt = parseFloat(g.el.style.top);
                  const gw = parseFloat(g.el.style.width) || g.el.offsetWidth;
                  const gh = parseFloat(g.el.style.height) || g.el.offsetHeight;
                  return cx >= gl && cx <= gl + gw && cy >= gt && cy <= gt + gh;
                });
                if (hitGroup) {
                  // If the dragged node is part of a phrase group, add all phrase siblings too
                  const phraseGroup = conGroups.find(g => g.phraseGroup && g.nodeIds.includes(id));
                  const toAdd = phraseGroup
                    ? phraseGroup.nodeIds.filter(nid => !hitGroup.nodeIds.includes(nid))
                    : (hitGroup.nodeIds.includes(id) ? [] : [id]);
                  toAdd.forEach(nid => hitGroup.nodeIds.push(nid));
                  requestAnimationFrame(() => {
                    conGroupRefit(hitGroup);
                    if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true });
                  });
                } else if (window._conDropNodeToCell) {
                  // Check if dropped inside a table cell
                  const _dropTables = window.conGetTables ? window.conGetTables() : [];
                  outer: for (const _dt of _dropTables) {
                    let _rAcc = _dt.y + 24; // 24 = bar height
                    for (let _dr = 0; _dr < _dt.rows; _dr++) {
                      let _cAcc = _dt.x;
                      for (let _dc = 0; _dc < _dt.cols; _dc++) {
                        const _cw = _dt.colWidths[_dc] || 80;
                        const _rh = _dt.rowHeights[_dr] || 36;
                        if (cx >= _cAcc && cx < _cAcc + _cw && cy >= _rAcc && cy < _rAcc + _rh) {
                          window._conDropNodeToCell(id, _dt.id, _dr, _dc);
                          break outer;
                        }
                        _cAcc += _cw;
                      }
                      _rAcc += _dt.rowHeights[_dr] || 36;
                    }
                  }
                }
              }
            }

            if (dragging && groupSnap) {
              // Update baseX, baseY for all dragged nodes when multi-dragging
              const board = document.getElementById('constellation-board');
              const boardCenterX = board.clientWidth / 2;
              const boardCenterY = board.clientHeight / 2;
              groupSnap.forEach(({ n }) => {
                n.baseX = boardCenterX + (n.x - boardCenterX) / conCurrentZoom;
                n.baseY = boardCenterY + (n.y - boardCenterY) / conCurrentZoom;
              });
              if (_nodePhraseGroup && _nodePhraseGroup.phraseGroup) {
                if (typeof conPhraseGroupLayout === 'function') conPhraseGroupLayout(_nodePhraseGroup);
                if (typeof conGroupRefit === 'function') conGroupRefit(_nodePhraseGroup);
              }
            }
            if (dragging && noteGroupSnap && noteGroupSnap.length > 0) {
              if (window._conMirrorSend) {
                window._conMirrorSend({
                  type: 'note-move',
                  positions: noteGroupSnap.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y }))
                });
              }
              if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
            }

            if (!dragging) {
              // It was a click — check modifiers
              if (e.ctrlKey || e.metaKey) {
                // Ctrl+click: toggle this node in/out of multi-selection
                // If there's a single-selected node, fold it into multi-selection first
                if (conSelected && conSelected !== id) {
                  const prevEl = conNodes.find(n => n.id === conSelected);
                  if (prevEl) {
                    conMultiSelected.add(conSelected);
                    prevEl.el.classList.remove('con-selected');
                    prevEl.el.classList.add('con-multi-selected');
                  }
                }
                conSelected = null;
                conNodes.forEach(n => n.el.classList.remove('con-selected'));
                if (conMultiSelected.has(id)) {
                  conMultiSelected.delete(id);
                  el.classList.remove('con-multi-selected');
                } else {
                  conMultiSelected.add(id);
                  el.classList.add('con-multi-selected');
                }
              } else if (e.shiftKey && (
                conMultiSelected.size > 0 ||
                conSelected ||
                (typeof window.conGetNoteSelected === 'function' && window.conGetNoteSelected() && window.conGetNoteSelected().size > 0) ||
                (typeof window.conNoteSelected !== 'undefined' && window.conNoteSelected && window.conNoteSelected.size > 0) ||
                (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0) ||
                (document.querySelector('#constellation-board .con-word-note.wn-selected') !== null) ||
                (typeof window.conGetMediaSelected === 'function' && window.conGetMediaSelected() && window.conGetMediaSelected().size > 0) ||
                (typeof conMediaSelected !== 'undefined' && conMediaSelected && conMediaSelected.size > 0) ||
                (document.querySelector('#constellation-board .con-media-item.con-media-selected') !== null) ||
                (typeof window.conGetDrawingSelected === 'function' && window.conGetDrawingSelected() && window.conGetDrawingSelected().size > 0) ||
                (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 0) ||
                (document.querySelector('#constellation-board .con-drawing.con-drawing-selected') !== null) ||
                (typeof window.conGetShapeSelected === 'function' && window.conGetShapeSelected() && window.conGetShapeSelected().size > 0) ||
                (typeof _conShapeSelected !== 'undefined' && _conShapeSelected && _conShapeSelected.size > 0) ||
                (document.querySelector('#constellation-board .con-shape.con-shape-selected') !== null) ||
                (typeof conTableSelected !== 'undefined' && conTableSelected && conTableSelected.size > 0) ||
                (document.querySelector('#constellation-board .con-table-el.con-table-selected') !== null)
              )) {
                // Shift-click: also toggle
                if (conSelected && conSelected !== id) {
                  const prevEl = conNodes.find(n => n.id === conSelected);
                  if (prevEl) {
                    conMultiSelected.add(conSelected);
                    prevEl.el.classList.remove('con-selected');
                    prevEl.el.classList.add('con-multi-selected');
                  }
                }
                conSelected = null;
                conNodes.forEach(n => n.el.classList.remove('con-selected'));
                if (conMultiSelected.has(id)) {
                  conMultiSelected.delete(id);
                  el.classList.remove('con-multi-selected');
                } else {
                  conMultiSelected.add(id);
                  el.classList.add('con-multi-selected');
                }
              } else {
                conSelect(id);
                if (window.conNoteClearSelection) window.conNoteClearSelection();
                if (window.conMediaClearSelection) window.conMediaClearSelection();
                if (node && node.isRandom && typeof conRollRandomNode === 'function') {
                  // Option A: single click = immediately re-roll the number
                  conRollRandomNode(node.id);
                  if (typeof conCloseTimerPopover === 'function') conCloseTimerPopover();
                  if (typeof conCloseSoundPopover === 'function') conCloseSoundPopover();
                  if (typeof conCloseVideoPopover === 'function') conCloseVideoPopover();
                } else if (node && node.isTimer && typeof conOpenTimerPopover === 'function') {
                  conOpenTimerPopover(node);
                  if (typeof conCloseRandomPopover === 'function') conCloseRandomPopover();
                  if (typeof conCloseSoundPopover === 'function') conCloseSoundPopover();
                  if (typeof conCloseVideoPopover === 'function') conCloseVideoPopover();
                } else if (node && node.isSound && typeof conOpenSoundPopover === 'function') {
                  conOpenSoundPopover(node);
                  if (typeof conCloseTimerPopover === 'function') conCloseTimerPopover();
                  if (typeof conCloseRandomPopover === 'function') conCloseRandomPopover();
                  if (typeof conCloseVideoPopover === 'function') conCloseVideoPopover();
                } else if (node && node.isVideo && typeof conOpenVideoPopover === 'function') {
                  conOpenVideoPopover(node);
                  if (typeof conCloseTimerPopover === 'function') conCloseTimerPopover();
                  if (typeof conCloseRandomPopover === 'function') conCloseRandomPopover();
                  if (typeof conCloseSoundPopover === 'function') conCloseSoundPopover();
                } else {
                  if (typeof conCloseTimerPopover === 'function') conCloseTimerPopover();
                  if (typeof conCloseRandomPopover === 'function') conCloseRandomPopover();
                  if (typeof conCloseSoundPopover === 'function') conCloseSoundPopover();
                  if (typeof conCloseVideoPopover === 'function') conCloseVideoPopover();
                }
              }
            }
            if (dragging) {
              if (typeof conCloseTimerPopover === 'function') conCloseTimerPopover();
              if (typeof conCloseRandomPopover === 'function') conCloseRandomPopover();
              if (typeof conCloseSoundPopover === 'function') conCloseSoundPopover();
              if (typeof conCloseVideoPopover === 'function') conCloseVideoPopover();
            }
            dragging = false;
          }
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });

        // Touch drag
        el.addEventListener('touchstart', function (e) {
          if (conMode !== 'move') return;
          const touch = e.touches[0];
          const node = conNodes.find(n => n && (n.id === id || String(n.id) === String(id)))
            || ((global.conNodes || []).find(n => n && (n.id === id || String(n.id) === String(id))));
          if (!node || conIsNodeLocked(node)) return;
          ox = touch.clientX - node.x;
          oy = touch.clientY - node.y;
          function onTMove(e) {
            e.preventDefault();
            const t = e.touches[0];
            const brd = board();
            let nx = t.clientX - ox;
            let ny = t.clientY - oy;
            nx = Math.max(0, nx);
            ny = Math.max(0, ny);
            node.x = nx; node.y = ny;
            el.style.left = nx + 'px';
            el.style.top = ny + 'px';
            conRedrawEdges();
          }
          function onTEnd() {
            // Update baseX, baseY based on current zoom level
            const board = document.getElementById('constellation-board');
            const boardCenterX = board.clientWidth / 2;
            const boardCenterY = board.clientHeight / 2;
            node.baseX = boardCenterX + (node.x - boardCenterX) / conCurrentZoom;
            node.baseY = boardCenterY + (node.y - boardCenterY) / conCurrentZoom;
            el.removeEventListener('touchmove', onTMove);
            el.removeEventListener('touchend', onTEnd);
          }
          el.addEventListener('touchmove', onTMove, { passive: false });
          el.addEventListener('touchend', onTEnd);
        });
      }

      // Multi-point Catmull-Rom to Cubic Bézier spline helper
      function conComputeMultiPointSpline(rawPts, strokeType, sw, isDouble, isWavy, hasStartArrow, hasEndArrow) {
        const N = rawPts.length;
        if (N < 2) return { d: '', mx: 0, my: 0, angle: 0, cx: 0, cy: 0 };
        if (N === 2) {
          const p0 = rawPts[0], p1 = rawPts[1];
          const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
          const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
          return {
            d: `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
            mx, my, angle, cx: mx, cy: my
          };
        }

        // Catmull-Rom to Cubic Bézier conversion
        const segments = [];
        let totalChordLen = 0;
        const chordLens = [];

        for (let i = 0; i < N - 1; i++) {
          const p1 = rawPts[i];
          const p2 = rawPts[i + 1];
          const p0 = (i === 0) ? { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y } : rawPts[i - 1];
          const p3 = (i + 2 >= N) ? { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y } : rawPts[i + 2];

          const cp1x = p1.x + (p2.x - p0.x) / 6;
          const cp1y = p1.y + (p2.y - p0.y) / 6;
          const cp2x = p2.x - (p3.x - p1.x) / 6;
          const cp2y = p2.y - (p3.y - p1.y) / 6;

          const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          totalChordLen += segDist;
          chordLens.push(segDist);
          segments.push({ p1, cp1: { x: cp1x, y: cp1y }, cp2: { x: cp2x, y: cp2y }, p2 });
        }

        let d = `M ${rawPts[0].x.toFixed(1)} ${rawPts[0].y.toFixed(1)}`;
        segments.forEach(seg => {
          d += ` C ${seg.cp1.x.toFixed(1)} ${seg.cp1.y.toFixed(1)}, ${seg.cp2.x.toFixed(1)} ${seg.cp2.y.toFixed(1)}, ${seg.p2.x.toFixed(1)} ${seg.p2.y.toFixed(1)}`;
        });

        if (isDouble) {
          const off = Math.max(2, sw * 0.9);
          let d1 = '', d2 = '';
          for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const dx = seg.p2.x - seg.p1.x, dy = seg.p2.y - seg.p1.y;
            const dist = Math.hypot(dx, dy) || 1;
            const nx = -dy / dist, ny = dx / dist;
            if (i === 0) {
              d1 = `M ${(seg.p1.x + nx * off).toFixed(1)} ${(seg.p1.y + ny * off).toFixed(1)}`;
              d2 = `M ${(seg.p1.x - nx * off).toFixed(1)} ${(seg.p1.y - ny * off).toFixed(1)}`;
            }
            d1 += ` C ${(seg.cp1.x + nx * off).toFixed(1)} ${(seg.cp1.y + ny * off).toFixed(1)}, ${(seg.cp2.x + nx * off).toFixed(1)} ${(seg.cp2.y + ny * off).toFixed(1)}, ${(seg.p2.x + nx * off).toFixed(1)} ${(seg.p2.y + ny * off).toFixed(1)}`;
            d2 += ` C ${(seg.cp1.x - nx * off).toFixed(1)} ${(seg.cp1.y - ny * off).toFixed(1)}, ${(seg.cp2.x - nx * off).toFixed(1)} ${(seg.cp2.y - ny * off).toFixed(1)}, ${(seg.p2.x - nx * off).toFixed(1)} ${(seg.p2.y - ny * off).toFixed(1)}`;
          }
          d = d1 + ' ' + d2;
        }

        // Find midpoint (50% arc-length) for label positioning
        const halfDist = totalChordLen / 2;
        let mx = rawPts[0].x, my = rawPts[0].y;
        let angle = 0;
        let accum = 0;
        for (let i = 0; i < segments.length; i++) {
          const segDist = chordLens[i];
          if (accum + segDist >= halfDist || i === segments.length - 1) {
            const rem = halfDist - accum;
            const t = segDist > 0 ? Math.max(0, Math.min(1, rem / segDist)) : 0.5;
            const seg = segments[i];
            const mt = 1 - t;
            mx = mt * mt * mt * seg.p1.x + 3 * mt * mt * t * seg.cp1.x + 3 * mt * t * t * seg.cp2.x + t * t * t * seg.p2.x;
            my = mt * mt * mt * seg.p1.y + 3 * mt * mt * t * seg.cp1.y + 3 * mt * t * t * seg.cp2.y + t * t * t * seg.p2.y;
            const tdx = 3 * mt * mt * (seg.cp1.x - seg.p1.x) + 6 * mt * t * (seg.cp2.x - seg.cp1.x) + 3 * t * t * (seg.p2.x - seg.cp2.x);
            const tdy = 3 * mt * mt * (seg.cp1.y - seg.p1.y) + 6 * mt * t * (seg.cp2.y - seg.cp1.y) + 3 * t * t * (seg.p2.y - seg.cp2.y);
            angle = Math.atan2(tdy, tdx) * 180 / Math.PI;
            break;
          }
          accum += segDist;
        }

        const midIdx = Math.floor(rawPts.length / 2);
        const cx = rawPts[midIdx] ? rawPts[midIdx].x : mx;
        const cy = rawPts[midIdx] ? rawPts[midIdx].y : my;

        return { d, mx, my, angle, cx, cy };
      }

      // Obstacle detection and A* avoidance router
      function conComputeEdgeObstacleAvoidance(x1, y1, x2, y2, idA, idB, pad, clearance) {
        const padding = typeof pad === 'number' ? pad : 28;
        const colClearance = typeof clearance === 'number' ? clearance : 14;
        const obstacles = [];
        const seenIds = new Set();

        function addObstacleBox(id, x, y, w, h) {
          if (!id || seenIds.has(String(id))) return;
          if (String(id) === String(idA) || String(id) === String(idB)) return;
          const nx = Number(x);
          const ny = Number(y);
          if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
          const bw = Math.max(20, Number(w) || 80);
          const bh = Math.max(16, Number(h) || 32);

          // If source or target endpoint is physically inside this obstacle's core box, skip it to avoid self-blocking
          if ((x1 >= nx && x1 <= nx + bw && y1 >= ny && y1 <= ny + bh) ||
              (x2 >= nx && x2 <= nx + bw && y2 >= ny && y2 <= ny + bh)) return;

          seenIds.add(String(id));
          obstacles.push({
            id: String(id),
            // Forbidden core collision boundary
            colMinX: nx - colClearance,
            colMinY: ny - colClearance,
            colMaxX: nx + bw + colClearance,
            colMaxY: ny + bh + colClearance,
            // Detour waypoints boundary
            wpMinX: nx - padding,
            wpMinY: ny - padding,
            wpMaxX: nx + bw + padding,
            wpMaxY: ny + bh + padding
          });
        }

        // 1. Nodes in conNodes
        if (typeof conNodes !== 'undefined' && Array.isArray(conNodes)) {
          conNodes.forEach(n => {
            if (!n || String(n.id) === String(idA) || String(n.id) === String(idB)) return;
            const anchor = (typeof conResolveLinkAnchor === 'function') ? conResolveLinkAnchor(n.id) : null;
            if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
              addObstacleBox(n.id, anchor.x, anchor.y, anchor.w, anchor.h);
            } else {
              const nx = typeof n.x === 'number' ? n.x : (n.el ? parseFloat(n.el.style.left) || 0 : 0);
              const ny = typeof n.y === 'number' ? n.y : (n.el ? parseFloat(n.el.style.top) || 0 : 0);
              const nw = n.w || (n.el ? (n.el.offsetWidth || 80) : 80);
              const nh = n.h || (n.el ? (n.el.offsetHeight || 32) : 32);
              addObstacleBox(n.id, nx, ny, nw, nh);
            }
          });
        }

        // 2. Word Notes in conNotes
        const noteArr = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : ((typeof conNotes !== 'undefined') ? conNotes : []);
        noteArr.forEach(n => {
          if (!n || n.hidden || String(n.id) === String(idA) || String(n.id) === String(idB)) return;
          const anchor = (typeof conResolveLinkAnchor === 'function') ? conResolveLinkAnchor(n.id) : null;
          if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
            addObstacleBox(n.id, anchor.x, anchor.y, anchor.w, anchor.h);
          } else {
            const el = document.querySelector(`.con-word-note[data-id="${n.id}"]`);
            const nx = typeof n.x === 'number' ? n.x : (el ? parseFloat(el.style.left) || 0 : 0);
            const ny = typeof n.y === 'number' ? n.y : (el ? parseFloat(el.style.top) || 0 : 0);
            const nw = Number(n.width) || (el ? el.offsetWidth : 140);
            const nh = Number(n.height) || (el ? el.offsetHeight : 80);
            addObstacleBox(n.id, nx, ny, nw, nh);
          }
        });

        // 3. Media Items
        const mediaArr = (typeof window.conGetMediaItems === 'function') ? window.conGetMediaItems() : ((typeof conMediaItems !== 'undefined') ? conMediaItems : []);
        mediaArr.forEach(m => {
          if (!m || m.hidden || String(m.id) === String(idA) || String(m.id) === String(idB)) return;
          addObstacleBox(m.id, m.x, m.y, m.w || 120, m.h || 100);
        });

        // 4. Tables
        const tableArr = (typeof window.conGetTables === 'function') ? window.conGetTables() : ((typeof conTables !== 'undefined') ? conTables : []);
        tableArr.forEach(t => {
          if (!t || String(t.id) === String(idA) || String(t.id) === String(idB)) return;
          addObstacleBox(t.id, t.x, t.y, t.w || 200, t.h || 120);
        });

        if (obstacles.length === 0) return null;

        function segmentIntersectsBox(p1x, p1y, p2x, p2y, b, eps = 1e-4) {
          let t0 = 0, t1 = 1;
          const dx = p2x - p1x, dy = p2y - p1y;
          const p = [-dx, dx, -dy, dy];
          const q = [p1x - b.colMinX, b.colMaxX - p1x, p1y - b.colMinY, b.colMaxY - p1y];
          for (let i = 0; i < 4; i++) {
            if (p[i] === 0) {
              if (q[i] <= 0) return false;
            } else {
              const r = q[i] / p[i];
              if (p[i] < 0) {
                if (r > t1) return false;
                if (r > t0) t0 = r;
              } else {
                if (r < t0) return false;
                if (r < t1) t1 = r;
              }
            }
          }
          return t0 < t1 - eps;
        }

        const colliding = obstacles.filter(b => segmentIntersectsBox(x1, y1, x2, y2, b));
        if (colliding.length === 0) return null;

        const cornerPoints = [];
        colliding.forEach(b => {
          cornerPoints.push({ x: b.wpMinX, y: b.wpMinY });
          cornerPoints.push({ x: b.wpMaxX, y: b.wpMinY });
          cornerPoints.push({ x: b.wpMaxX, y: b.wpMaxY });
          cornerPoints.push({ x: b.wpMinX, y: b.wpMaxY });
        });

        const nodes = [{ x: x1, y: y1 }, ...cornerPoints, { x: x2, y: y2 }];
        const startIdx = 0;
        const targetIdx = nodes.length - 1;

        function isPathClear(na, nb) {
          for (let i = 0; i < colliding.length; i++) {
            if (segmentIntersectsBox(na.x, na.y, nb.x, nb.y, colliding[i])) return false;
          }
          return true;
        }

        const dist = new Array(nodes.length).fill(Infinity);
        const prev = new Array(nodes.length).fill(-1);
        const visited = new Array(nodes.length).fill(false);
        dist[startIdx] = 0;

        for (let iter = 0; iter < nodes.length; iter++) {
          let u = -1, bestD = Infinity;
          for (let i = 0; i < nodes.length; i++) {
            if (!visited[i] && dist[i] < bestD) {
              bestD = dist[i];
              u = i;
            }
          }
          if (u === -1 || u === targetIdx) break;
          visited[u] = true;

          const uNode = nodes[u];
          for (let v = 0; v < nodes.length; v++) {
            if (visited[v] || u === v) continue;
            const vNode = nodes[v];
            if (isPathClear(uNode, vNode)) {
              const dStep = Math.hypot(vNode.x - uNode.x, vNode.y - uNode.y);
              const alt = dist[u] + dStep;
              if (alt < dist[v]) {
                dist[v] = alt;
                prev[v] = u;
              }
            }
          }
        }

        if (prev[targetIdx] === -1) return null;

        const path = [];
        let curr = prev[targetIdx];
        while (curr !== -1 && curr !== startIdx) {
          path.unshift({ x: Math.round(nodes[curr].x), y: Math.round(nodes[curr].y) });
          curr = prev[curr];
        }

        return path.length > 0 ? path : null;
      }

      function conComputeEdgeGeometry(x1, y1, x2, y2, routing, strokeType, curvature, thickness, type, terminator, points, avoidObstacles, idA, idB) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        if (!Number.isFinite(dist) || dist < 1) {
          return { d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`, mx: x1, my: y1, angle: 0, cx: x1, cy: y1 };
        }
        const ux = dx / dist;
        const uy = dy / dist;
        const nx = -uy;
        const ny = ux;
        const sw = Math.max(1, thickness || 2);
        const isDouble = strokeType === 'double';
        const isWavy = strokeType === 'wavy';
        const hasStartArrow = type === 'backward' || type === 'both';
        const hasEndArrow = type === 'forward' || type === 'both';

        const termLengths = {
          arrow: 8.5,
          open: 7.0,
          circle: 7.0,
          diamond: 10.0
        };
        const term = terminator || 'arrow';
        const rawTermLen = termLengths[term] || 8.5;
        const neededLen = (hasStartArrow ? rawTermLen : 0) + (hasEndArrow ? rawTermLen : 0);
        const scale = (dist > 2 && neededLen > 0 && dist < neededLen + 4) ? Math.max(0.1, (dist - 4) / neededLen) : 1;
        const startLen = hasStartArrow ? (rawTermLen * scale) : 0;
        const endLen = hasEndArrow ? (rawTermLen * scale) : 0;

        // Determine effective waypoints (combining manual points and obstacle avoidance)
        let effectivePts = Array.isArray(points) ? points.slice() : [];
        if (avoidObstacles) {
          if (effectivePts.length === 0) {
            const avoidPts = conComputeEdgeObstacleAvoidance(x1, y1, x2, y2, idA, idB);
            if (avoidPts && avoidPts.length > 0) {
              effectivePts = avoidPts;
            }
          } else {
            // Route around obstacles between consecutive waypoints
            const combined = [];
            const legs = [{ x: x1, y: y1 }, ...effectivePts, { x: x2, y: y2 }];
            for (let l = 0; l < legs.length - 1; l++) {
              if (l > 0) combined.push(legs[l]);
              const legAvoid = conComputeEdgeObstacleAvoidance(legs[l].x, legs[l].y, legs[l + 1].x, legs[l + 1].y, idA, idB);
              if (legAvoid && legAvoid.length > 0) {
                combined.push(...legAvoid);
              }
            }
            effectivePts = combined;
          }
        }

        // Multi-point path handling
        if (effectivePts.length > 0) {
          const firstPt = effectivePts[0];
          const lastPt = effectivePts[effectivePts.length - 1];

          const sDx = firstPt.x - x1, sDy = firstPt.y - y1;
          const sDist = Math.hypot(sDx, sDy) || 1;
          const sx = x1 + (sDx / sDist) * startLen;
          const sy = y1 + (sDy / sDist) * startLen;

          const eDx = x2 - lastPt.x, eDy = y2 - lastPt.y;
          const eDist = Math.hypot(eDx, eDy) || 1;
          const ex = x2 - (eDx / eDist) * endLen;
          const ey = y2 - (eDy / eDist) * endLen;

          const allPts = [{ x: sx, y: sy }, ...effectivePts, { x: ex, y: ey }];

          if (routing === 'orthogonal') {
            let d = `M ${allPts[0].x.toFixed(1)} ${allPts[0].y.toFixed(1)}`;
            for (let i = 0; i < allPts.length - 1; i++) {
              const pA = allPts[i], pB = allPts[i + 1];
              const midX = (pA.x + pB.x) / 2;
              d += ` L ${midX.toFixed(1)} ${pA.y.toFixed(1)} L ${midX.toFixed(1)} ${pB.y.toFixed(1)} L ${pB.x.toFixed(1)} ${pB.y.toFixed(1)}`;
            }
            const midIdx = Math.floor(allPts.length / 2);
            return { d, mx: allPts[midIdx].x, my: allPts[midIdx].y, angle: 0, cx: allPts[midIdx].x, cy: allPts[midIdx].y };
          }

          if (routing === 'straight' && !avoidObstacles) {
            let d = `M ${allPts[0].x.toFixed(1)} ${allPts[0].y.toFixed(1)}`;
            for (let i = 1; i < allPts.length; i++) {
              d += ` L ${allPts[i].x.toFixed(1)} ${allPts[i].y.toFixed(1)}`;
            }
            const midIdx = Math.floor(allPts.length / 2);
            return { d, mx: allPts[midIdx].x, my: allPts[midIdx].y, angle: 0, cx: allPts[midIdx].x, cy: allPts[midIdx].y };
          }

          // Default: Curved smooth spline through all waypoints
          return conComputeMultiPointSpline(allPts, strokeType, sw, isDouble, isWavy, hasStartArrow, hasEndArrow);
        }

        let d = '';
        let mx = (x1 + x2) / 2;
        let my = (y1 + y2) / 2;
        let cx = mx;
        let cy = my;
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;

        if (routing === 'curved') {
          const curv = (typeof curvature === 'number' && Number.isFinite(curvature)) ? curvature : 30;
          cx = mx + nx * curv;
          cy = my + ny * curv;
          mx = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
          my = 0.25 * y1 + 0.5 * cy + 0.25 * y2;
          angle = Math.atan2(dy, dx) * 180 / Math.PI;

          // Tangent at start: from (x1, y1) towards (cx, cy)
          const sTanX = cx - x1, sTanY = cy - y1;
          const sTanDist = Math.hypot(sTanX, sTanY) || 1;
          const sux = sTanX / sTanDist, suy = sTanY / sTanDist;

          // Tangent at end: from (cx, cy) towards (x2, y2)
          const eTanX = x2 - cx, eTanY = y2 - cy;
          const eTanDist = Math.hypot(eTanX, eTanY) || 1;
          const eux = eTanX / eTanDist, euy = eTanY / eTanDist;

          const sx = x1 + sux * startLen;
          const sy = y1 + suy * startLen;
          const ex = x2 - eux * endLen;
          const ey = y2 - euy * endLen;

          if (isDouble) {
            const off = Math.max(2, sw * 0.9);
            d = `M ${(sx + nx * off).toFixed(1)} ${(sy + ny * off).toFixed(1)} ` +
                `Q ${(cx + nx * off).toFixed(1)} ${(cy + ny * off).toFixed(1)} ${(ex + nx * off).toFixed(1)} ${(ey + ny * off).toFixed(1)} ` +
                `M ${(sx - nx * off).toFixed(1)} ${(sy - ny * off).toFixed(1)} ` +
                `Q ${(cx - nx * off).toFixed(1)} ${(cy - ny * off).toFixed(1)} ${(ex - nx * off).toFixed(1)} ${(ey - ny * off).toFixed(1)}`;
          } else if (isWavy) {
            const steps = Math.min(200, Math.max(4, Math.round(dist / 14)));
            const amp = Math.min(7, Math.max(3, sw * 1.3));
            d = `M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
            for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              const sgn = (i % 2 === 0) ? 1 : -1;
              const curAmp = ((i === steps && hasEndArrow) || (i === 1 && hasStartArrow)) ? 0 : amp * sgn;
              const bx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
              const by = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
              d += ` Q ${(bx + nx * curAmp).toFixed(1)} ${(by + ny * curAmp).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
            }
          } else {
            d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
          }
        } else if (routing === 'orthogonal') {
          if (Math.abs(dx) >= Math.abs(dy)) {
            const midX = (x1 + x2) / 2;
            const sSign = (midX >= x1 ? 1 : -1);
            const eSign = (x2 >= midX ? 1 : -1);
            const sx = x1 + sSign * startLen;
            const sy = y1;
            const ex = x2 - eSign * endLen;
            const ey = y2;
            d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${midX.toFixed(1)} ${y1.toFixed(1)} L ${midX.toFixed(1)} ${y2.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)}`;
            mx = midX;
            my = (y1 + y2) / 2;
            angle = 0;
          } else {
            const midY = (y1 + y2) / 2;
            const sSign = (midY >= y1 ? 1 : -1);
            const eSign = (y2 >= midY ? 1 : -1);
            const sx = x1;
            const sy = y1 + sSign * startLen;
            const ex = x2;
            const ey = y2 - eSign * endLen;
            d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${x1.toFixed(1)} ${midY.toFixed(1)} L ${x2.toFixed(1)} ${midY.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)}`;
            mx = (x1 + x2) / 2;
            my = midY;
            angle = 0;
          }
        } else {
          // Straight
          const sx = x1 + ux * startLen;
          const sy = y1 + uy * startLen;
          const ex = x2 - ux * endLen;
          const ey = y2 - uy * endLen;
          const straightDist = Math.hypot(ex - sx, ey - sy);

          if (isDouble) {
            const off = Math.max(2, sw * 0.9);
            d = `M ${(sx + nx * off).toFixed(1)} ${(sy + ny * off).toFixed(1)} L ${(ex + nx * off).toFixed(1)} ${(ey + ny * off).toFixed(1)} ` +
                `M ${(sx - nx * off).toFixed(1)} ${(sy - ny * off).toFixed(1)} L ${(ex - nx * off).toFixed(1)} ${(ey - ny * off).toFixed(1)}`;
          } else if (isWavy) {
            const waveLen = Math.max(16, sw * 5);
            const halfWaves = (!Number.isFinite(straightDist) || straightDist < 1) ? 2 : Math.min(200, Math.max(2, Math.round(straightDist / (waveLen / 2))));
            const hwLen = straightDist / halfWaves;
            const amp = Math.min(8, Math.max(3.5, sw * 1.5));
            d = `M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
            for (let i = 0; i < halfWaves; i++) {
              const sgn = (i % 2 === 0) ? 1 : -1;
              const curAmp = ((i === halfWaves - 1 && hasEndArrow) || (i === 0 && hasStartArrow)) ? 0 : (amp * sgn);
              const p0 = i * hwLen;
              const p3 = (i + 1) * hwLen;
              const cp1x = sx + ux * (p0 + hwLen * 0.35) + nx * curAmp;
              const cp1y = sy + uy * (p0 + hwLen * 0.35) + ny * curAmp;
              const cp2x = sx + ux * (p0 + hwLen * 0.65) + nx * curAmp;
              const cp2y = sy + uy * (p0 + hwLen * 0.65) + ny * curAmp;
              const endX = sx + ux * p3;
              const endY = sy + uy * p3;
              d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
            }
          } else {
            d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)}`;
          }
        }

        return { d, mx, my, angle, cx, cy };
      }

      function _conInitMidHandle(edge) {
        if (!edge.midHandle) return;
        edge.midHandle.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          const na = conResolveLinkAnchor(edge.a);
          const nb = conResolveLinkAnchor(edge.b);
          if (!na || !nb) return;
          const ax = na.cx, ay = na.cy, bx = nb.cx, by = nb.cy;
          const dx = bx - ax, dy = by - ay;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = -dy / dist, ny = dx / dist;
          const midX = (ax + bx) / 2, midY = (ay + by) / 2;

          let animFrame = null;
          function onMM(ev) {
            if (animFrame) return;
            animFrame = requestAnimationFrame(() => {
              animFrame = null;
              const brdEl = (typeof board === 'function') ? board() : document.getElementById('constellation-board');
              if (!brdEl) return;
              const brd = brdEl.getBoundingClientRect();
              const curX = (ev.clientX - brd.left) / conCurrentZoom;
              const curY = (ev.clientY - brd.top) / conCurrentZoom;
              const offX = curX - midX;
              const offY = curY - midY;
              const curv = offX * nx + offY * ny;
              edge.routing = 'curved';
              edge.curvature = Math.round(curv);
              conUpdateEdge(edge);
              if (typeof window._conMirrorSend === 'function') {
                window._conMirrorSend({
                  type: 'edge-update',
                  edge: { id: edge.id, routing: edge.routing, curvature: edge.curvature }
                });
              }
            });
          }
          function onMU() {
            if (animFrame) cancelAnimationFrame(animFrame);
            document.removeEventListener('mousemove', onMM);
            document.removeEventListener('mouseup', onMU);
            conPushUndo();
          }
          document.addEventListener('mousemove', onMM);
          document.addEventListener('mouseup', onMU);
        });
      }

      function _conInitEndHandle(edge, whichEnd) {
        const handle = (whichEnd === 'a') ? edge.endHandleA : edge.endHandleB;
        if (!handle) return;
        handle.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          const oppositeId = (whichEnd === 'a') ? edge.b : edge.a;
          const brd = board();
          if (!brd) return;

          const dockAnchors = [];
          const candidateTargets = [];

          (typeof conNodes !== 'undefined' ? conNodes : []).forEach(n => {
            if (n && n.id !== oppositeId && n.el) candidateTargets.push({ id: n.id });
          });

          (typeof conNotes !== 'undefined' ? conNotes : []).forEach(nd => {
            if (nd && nd.id !== oppositeId && !nd.hidden) {
              const el = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nd.id) : document.querySelector(`.con-word-note[data-id="${nd.id}"]`);
              if (el) candidateTargets.push({ id: nd.id });
            }
          });

          (typeof conGroups !== 'undefined' ? conGroups : []).forEach(g => {
            if (g && g.id !== oppositeId && g.el) candidateTargets.push({ id: g.id });
          });

          candidateTargets.forEach(target => {
            const anchorData = conResolveLinkAnchor(target.id);
            if (!anchorData) return;
            ['top', 'right', 'bottom', 'left'].forEach(pos => {
              const pt = conGetAnchorPoint(anchorData, pos);
              if (!pt) return;
              const dot = document.createElement('div');
              dot.className = 'con-dock-anchor';
              dot.style.left = pt.x + 'px';
              dot.style.top = pt.y + 'px';
              dot.dataset.nid = target.id;
              dot.dataset.port = pos;
              brd.appendChild(dot);
              dockAnchors.push({ el: dot, nodeId: target.id, port: pos, x: pt.x, y: pt.y });
            });
          });

          let bestSnap = null;
          let animFrame = null;

          function onMM(ev) {
            if (animFrame) return;
            animFrame = requestAnimationFrame(() => {
              animFrame = null;
              const brdRect = brd.getBoundingClientRect();
              const mx = (ev.clientX - brdRect.left) / conCurrentZoom;
              const my = (ev.clientY - brdRect.top) / conCurrentZoom;

              bestSnap = null;
              let bestDist = 28;
              dockAnchors.forEach(da => {
                const d = Math.hypot(mx - da.x, my - da.y);
                if (d < bestDist) {
                  bestDist = d;
                  bestSnap = da;
                }
              });

              dockAnchors.forEach(da => {
                da.el.classList.toggle('active', da === bestSnap);
              });

              if (bestSnap) {
                if (whichEnd === 'a') {
                  edge.a = bestSnap.nodeId;
                  edge.anchorA = bestSnap.port;
                } else {
                  edge.b = bestSnap.nodeId;
                  edge.anchorB = bestSnap.port;
                }
              }
              conUpdateEdge(edge);
            });
          }

          function onMU() {
            if (animFrame) cancelAnimationFrame(animFrame);
            document.removeEventListener('mousemove', onMM);
            document.removeEventListener('mouseup', onMU);
            dockAnchors.forEach(da => da.el.remove());

            if (bestSnap) {
              if (whichEnd === 'a') {
                edge.a = bestSnap.nodeId;
                edge.anchorA = bestSnap.port;
              } else {
                edge.b = bestSnap.nodeId;
                edge.anchorB = bestSnap.port;
              }
              conPushUndo();
              conRedrawEdges();
              if (typeof window._conMirrorSend === 'function') {
                window._conMirrorSend({
                  type: 'edge-update',
                  edge: { id: edge.id, a: edge.a, b: edge.b, anchorA: edge.anchorA, anchorB: edge.anchorB }
                });
              }
            } else {
              conRedrawEdges();
            }
          }

          document.addEventListener('mousemove', onMM);
          document.addEventListener('mouseup', onMU);
        });
      }

      function _conInitPointHandle(edge, ph) {
        if (!ph) return;

        function removeThisPoint(idx) {
          if (!Array.isArray(edge.points) || idx < 0 || idx >= edge.points.length) return;
          edge.points.splice(idx, 1);
          conPushUndo();
          conUpdateEdge(edge);
          conRedrawEdges();
          if (typeof window._conMirrorSend === 'function') {
            window._conMirrorSend({ type: 'edge-update', edge: { id: edge.id, points: edge.points } });
          }
        }

        ph.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(ph.dataset.idx, 10);
          removeThisPoint(idx);
        });

        ph.addEventListener('dblclick', function (e) {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(ph.dataset.idx, 10);
          removeThisPoint(idx);
        });

        ph.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          if (e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            const idx = parseInt(ph.dataset.idx, 10);
            removeThisPoint(idx);
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const pIdx = parseInt(ph.dataset.idx, 10);
          if (isNaN(pIdx) || !Array.isArray(edge.points) || !edge.points[pIdx]) return;

          const brdEl = (typeof board === 'function') ? board() : document.getElementById('constellation-board');
          if (!brdEl) return;

          let animFrame = null;
          function onMM(ev) {
            if (animFrame) return;
            animFrame = requestAnimationFrame(() => {
              animFrame = null;
              const brdRect = brdEl.getBoundingClientRect();
              const curX = Math.round((ev.clientX - brdRect.left) / conCurrentZoom);
              const curY = Math.round((ev.clientY - brdRect.top) / conCurrentZoom);
              if (edge.points && edge.points[pIdx]) {
                edge.points[pIdx].x = curX;
                edge.points[pIdx].y = curY;
                conUpdateEdge(edge);
                if (typeof window._conMirrorSend === 'function') {
                  window._conMirrorSend({
                    type: 'edge-update',
                    edge: { id: edge.id, points: edge.points, routing: edge.routing }
                  });
                }
              }
            });
          }

          function onMU() {
            if (animFrame) cancelAnimationFrame(animFrame);
            document.removeEventListener('mousemove', onMM);
            document.removeEventListener('mouseup', onMU);
            conPushUndo();
            conRedrawEdges();
            if (typeof window._conMirrorSend === 'function') {
              window._conMirrorSend({
                type: 'edge-update',
                edge: { id: edge.id, points: edge.points, routing: edge.routing }
              });
            }
          }

          document.addEventListener('mousemove', onMM);
          document.addEventListener('mouseup', onMU);
        });
      }

      function _conInitSplitHandle(edge, sh) {
        if (!sh) return;
        sh.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          const splitIdx = parseInt(sh.dataset.splitIdx, 10) || 0;
          const clickX = Math.round(parseFloat(sh.getAttribute('cx')) || 0);
          const clickY = Math.round(parseFloat(sh.getAttribute('cy')) || 0);
          if (!Array.isArray(edge.points)) edge.points = [];
          edge.points.splice(splitIdx, 0, { x: clickX, y: clickY });
          edge.routing = 'curved';
          conUpdateEdge(edge);

          const brdEl = (typeof board === 'function') ? board() : document.getElementById('constellation-board');
          if (!brdEl) return;

          let animFrame = null;
          function onMM(ev) {
            if (animFrame) return;
            animFrame = requestAnimationFrame(() => {
              animFrame = null;
              const brdRect = brdEl.getBoundingClientRect();
              const curX = Math.round((ev.clientX - brdRect.left) / conCurrentZoom);
              const curY = Math.round((ev.clientY - brdRect.top) / conCurrentZoom);
              if (edge.points && edge.points[splitIdx]) {
                edge.points[splitIdx].x = curX;
                edge.points[splitIdx].y = curY;
                conUpdateEdge(edge);
                if (typeof window._conMirrorSend === 'function') {
                  window._conMirrorSend({
                    type: 'edge-update',
                    edge: { id: edge.id, points: edge.points, routing: edge.routing }
                  });
                }
              }
            });
          }

          function onMU() {
            if (animFrame) cancelAnimationFrame(animFrame);
            document.removeEventListener('mousemove', onMM);
            document.removeEventListener('mouseup', onMU);
            conPushUndo();
            conRedrawEdges();
            if (typeof window._conMirrorSend === 'function') {
              window._conMirrorSend({
                type: 'edge-update',
                edge: { id: edge.id, points: edge.points, routing: edge.routing }
              });
            }
          }

          document.addEventListener('mousemove', onMM);
          document.addEventListener('mouseup', onMU);
        });
      }

      const _CON_NEUTRAL = new Set(['', 'transparent', '#111', '#111111', '#333', '#333333', '#000', '#000000']);
      const _CON_NEUTRAL_BG = new Set(['', 'transparent', '#fff', '#ffffff']);

      function conGetAnchorColor(id) {
        if (!id) return null;
        const nodeArr = (typeof conNodes !== 'undefined') ? conNodes : ((typeof window.conGetNodes === 'function') ? window.conGetNodes() : []);
        const node = nodeArr.find(n => n && n.id === id);
        if (node) {
          const raw = (node.el && node.el.style && node.el.style.borderColor) || node.border || '';
          if (!raw || raw === 'transparent') return null;
          const hex = (typeof rgbToHex === 'function' ? rgbToHex(raw) : (window.rgbToHex ? window.rgbToHex(raw) : raw)).toLowerCase();
          return _CON_NEUTRAL.has(hex) ? null : hex;
        }
        const noteArr = (typeof conNotes !== 'undefined') ? conNotes : ((typeof window.conGetNotes === 'function') ? window.conGetNotes() : []);
        const note = noteArr.find(n => n && n.id === id);
        if (note) {
          const raw = note.bg || (note.el && note.el.style && note.el.style.backgroundColor) || '';
          if (!raw || raw === 'transparent') return null;
          const hex = (typeof rgbToHex === 'function' ? rgbToHex(raw) : (window.rgbToHex ? window.rgbToHex(raw) : raw)).toLowerCase();
          return (_CON_NEUTRAL_BG.has(hex) || _CON_NEUTRAL.has(hex)) ? null : hex;
        }
        const groupArr = (typeof conGroups !== 'undefined') ? conGroups : ((typeof window.conGetGroups === 'function') ? window.conGetGroups() : []);
        const group = groupArr.find(g => g && g.id === id);
        if (group) {
          if (group.drawingGroup || group.phraseGroup || group.invisible) return null;
          let border = '';
          if (typeof conGroupPaletteBorder === 'function') {
            border = conGroupPaletteBorder(group.paletteIdx);
          } else {
            const CON_PALETTES_REF = window.CON_PALETTES || [];
            const pal = CON_PALETTES_REF[group.paletteIdx] || [];
            border = pal[2] || '';
          }
          if (!border || border === 'transparent') return null;
          const hex = (typeof rgbToHex === 'function' ? rgbToHex(border) : (window.rgbToHex ? window.rgbToHex(border) : border)).toLowerCase();
          return _CON_NEUTRAL.has(hex) ? null : hex;
        }
        const drawArr = (typeof conDrawings !== 'undefined' && Array.isArray(conDrawings)) ? conDrawings : ((typeof window.conGetDrawings === 'function') ? window.conGetDrawings() : []);
        const dr = drawArr.find(d => d && (d.id === id || String(d.id) === String(id)));
        if (dr && dr.color && dr.color !== 'transparent') {
          const hex = (typeof rgbToHex === 'function' ? rgbToHex(dr.color) : (window.rgbToHex ? window.rgbToHex(dr.color) : dr.color)).toLowerCase();
          return _CON_NEUTRAL.has(hex) ? null : hex;
        }
        const mediaArr = (typeof conMediaItems !== 'undefined' && Array.isArray(conMediaItems)) ? conMediaItems : ((typeof window.conGetMediaItems === 'function') ? window.conGetMediaItems() : []);
        const media = mediaArr.find(m => m && (m.id === id || String(m.id) === String(id)));
        if (media && media.borderColor && media.borderColor !== 'transparent') {
          const hex = (typeof rgbToHex === 'function' ? rgbToHex(media.borderColor) : (window.rgbToHex ? window.rgbToHex(media.borderColor) : media.borderColor)).toLowerCase();
          return _CON_NEUTRAL.has(hex) ? null : hex;
        }
        return null;
      }
      window.conGetAnchorColor = conGetAnchorColor;

      function conResolveEdgeStroke(edge) {
        if (!edge) return { solid: window._conDefaultLinkColor || '#333333' };
        if (edge.colorMode === undefined) {
          const ca = conGetAnchorColor(edge.a);
          const cb = conGetAnchorColor(edge.b);
          const defCol = (window._conDefaultLinkColor || '#333333').toLowerCase();
          const lc = (edge.labelColor ? String(edge.labelColor) : '#333333').toLowerCase();
          if (lc === '#333333' || lc === '#333' || lc === defCol || (ca && lc === ca) || (cb && lc === cb)) {
            edge.colorMode = 'auto';
            if (ca && lc === ca) {
              edge.labelColor = '#333333';
            }
          } else {
            edge.colorMode = 'manual';
            edge.strokeColor = edge.labelColor;
          }
        }

        if (edge.colorMode === 'manual') {
          return { solid: edge.strokeColor || edge.labelColor || window._conDefaultLinkColor || '#333333', isManual: true };
        }

        const ca = conGetAnchorColor(edge.a);
        const cb = conGetAnchorColor(edge.b);
        if (ca && cb && ca !== cb) {
          return { gradient: [ca, cb], colorA: ca, colorB: cb };
        }
        return { solid: ca || cb || window._conDefaultLinkColor || '#333333', colorA: ca, colorB: cb };
      }
      window.conResolveEdgeStroke = conResolveEdgeStroke;

      function _conEnsureEdgeDefs(edge) {
        if (!edge.defs) {
          const existing = edge.g && edge.g.querySelector('defs');
          if (existing) {
            edge.defs = existing;
          } else {
            edge.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            if (edge.line && edge.g) {
              edge.g.insertBefore(edge.defs, edge.line);
            } else if (edge.g) {
              edge.g.appendChild(edge.defs);
            }
          }
        }
        return edge.defs;
      }

      function _conUpdateEdgeGradient(edge, x1, y1, x2, y2, colorA, colorB) {
        const defs = _conEnsureEdgeDefs(edge);
        if (!defs) return;
        const gradId = 'con-edge-grad-' + edge.id;
        let grad = edge.gradEl || defs.querySelector('#' + gradId);
        if (!grad) {
          grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
          grad.id = gradId;
          grad.setAttribute('gradientUnits', 'userSpaceOnUse');
          const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
          s1.setAttribute('offset', '0%');
          const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
          s2.setAttribute('offset', '100%');
          grad.appendChild(s1);
          grad.appendChild(s2);
          defs.appendChild(grad);
          edge.gradEl = grad;
        }
        grad.setAttribute('x1', String(x1));
        grad.setAttribute('y1', String(y1));
        grad.setAttribute('x2', String(x2));
        grad.setAttribute('y2', String(y2));
        if (grad.children[0]) grad.children[0].setAttribute('stop-color', colorA);
        if (grad.children[1]) grad.children[1].setAttribute('stop-color', colorB);
      }

      function _conEnsureColorMarker(term, whichEnd, color) {
        conEnsureSvgDefs();
        const svgEl = svg();
        const defs = svgEl ? svgEl.querySelector('#con-arrow-defs') : null;
        if (!defs) return 'url(#con-' + term + '-' + whichEnd + ')';
        const safeCol = String(color || '#333333').trim().replace(/[^a-zA-Z0-9]/g, '') || '333333';
        const markerId = 'con-m-' + term + '-' + whichEnd + '-' + safeCol;
        let m = defs.querySelector('#' + markerId);
        const template = document.getElementById('con-' + term + '-' + whichEnd);
        if (!m) {
          m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
          m.id = markerId;
          m.setAttribute('orient', 'auto');
          m.setAttribute('markerUnits', 'userSpaceOnUse');
          if (template) {
            m.setAttribute('markerWidth', template.getAttribute('markerWidth') || '11');
            m.setAttribute('markerHeight', template.getAttribute('markerHeight') || '9');
            m.setAttribute('refX', template.getAttribute('refX') || '1');
            m.setAttribute('refY', template.getAttribute('refY') || '4.5');
            m.innerHTML = template.innerHTML.replace(/context-stroke/g, color || '#333333');
          }
          defs.appendChild(m);
        }
        return 'url(#' + markerId + ')';
      }

      function _conEnsureEdgeCustomMarker(edge, whichEnd, term, color) {
        return _conEnsureColorMarker(term, whichEnd, color);
      }

      function conAddEdge(aId, bId, type, color, existingId, explicitThickness) {
        // Don't duplicate
        const existingEdge = conEdges.find(e => (e.a === aId && e.b === bId) || (e.a === bId && e.b === aId));
        if (existingEdge) return existingEdge;
        conEnsureSvgDefs();
        const svgEl = svg();
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'con-line-group');
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('class', 'con-line');
        line.setAttribute('fill', 'none');
        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hit.setAttribute('class', 'con-line-hit');
        hit.setAttribute('fill', 'none');
        let edgeId = existingId || ('ce' + (typeof window.conGetNextId === 'function' ? window.conGetNextId() : conNextId++));
        if (!existingId) {
          while (conEdges.some(e => e.id === edgeId)) {
            const nextNum = (typeof window.conGetNextId === 'function') ? window.conGetNextId() : conNextId++;
            edgeId = 'ce' + nextNum;
          }
        }
        g.dataset.eid = edgeId;
        const labelBgEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBgEl.setAttribute('class', 'con-line-label-bg');
        labelBgEl.setAttribute('rx', '4');
        labelBgEl.setAttribute('ry', '4');
        labelBgEl.style.display = 'none';
        const labelEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        labelEl.setAttribute('class', 'con-line-label');
        g.appendChild(line);
        g.appendChild(labelBgEl);
        g.appendChild(labelEl);
        g.appendChild(hit);
        svgEl.appendChild(g);

        hit.addEventListener('click', function (e) {
          if (conMode === 'delete') {
            conPushUndo();
            conRemoveEdge(edgeId);
            return;
          }
          e.stopPropagation();
          const nextSelected = (window._conSelectedEdgeId === edgeId) ? null : edgeId;
          if (nextSelected) {
            if (typeof window.conDeselectAll === 'function') {
              window.conDeselectAll();
            } else if (typeof conSelect === 'function') {
              conSelect(null);
            }
          }
          window._conSelectedEdgeId = nextSelected;
          if (window._conSelectedEdgeId === edgeId && (e.shiftKey || e.altKey)) {
            const brdEl = (typeof board === 'function') ? board() : document.getElementById('constellation-board');
            if (brdEl) {
              const rect = brdEl.getBoundingClientRect();
              const clickX = Math.round((e.clientX - rect.left) / conCurrentZoom);
              const clickY = Math.round((e.clientY - rect.top) / conCurrentZoom);
              const edgeRef = conEdges.find(ed => ed && ed.id === edgeId);
              if (edgeRef) {
                if (!Array.isArray(edgeRef.points)) edgeRef.points = [];
                edgeRef.points.push({ x: clickX, y: clickY });
                edgeRef.routing = 'curved';
                conPushUndo();
                conUpdateEdge(edgeRef);
                conRedrawEdges();
                return;
              }
            }
          }
          if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
          conRedrawEdges();
        });
        hit.addEventListener('dblclick', function (e) {
          e.preventDefault();
          e.stopPropagation();
          const edgeRef = conEdges.find(ed => ed && ed.id === edgeId);
          if (edgeRef && edgeRef.excerpts && edgeRef.excerpts.length > 0 && typeof characterNetworkShowExcerpts === 'function') {
            characterNetworkShowExcerpts(edgeId);
            return;
          }
          conEdgeCtxOpen(e, edgeId);
        });
        hit.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          e.stopPropagation();
          conEdgeCtxOpen(e, edgeId);
        });
        labelEl.style.pointerEvents = 'all';
        labelEl.style.cursor = 'pointer';
        labelEl.addEventListener('click', function (e) {
          if (conMode === 'delete') {
            conPushUndo();
            conRemoveEdge(edgeId);
          } else {
            e.preventDefault();
            e.stopPropagation();
            conEdgeCtxOpen(e, edgeId);
          }
        });
        labelEl.addEventListener('dblclick', function (e) {
          e.preventDefault();
          e.stopPropagation();
          const edgeRef = conEdges.find(ed => ed && ed.id === edgeId);
          if (edgeRef && edgeRef.excerpts && edgeRef.excerpts.length > 0 && typeof characterNetworkShowExcerpts === 'function') {
            characterNetworkShowExcerpts(edgeId);
            return;
          }
          conEdgeCtxOpen(e, edgeId);
        });
        labelEl.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          e.stopPropagation();
          conEdgeCtxOpen(e, edgeId);
        });
        hit.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          if (conMode !== 'move') return;
          const edgeRef = conEdges.find(ed => ed.id === edgeId);
          if (!edgeRef) return;
          const na = conNodes.find(n => n.id === edgeRef.a);
          const nb = conNodes.find(n => n.id === edgeRef.b);
          if (!na || !nb) return;
          e.preventDefault();
          e.stopPropagation();

          const brd = board();
          const sx = e.clientX;
          const sy = e.clientY;
          const a0x = na.x;
          const a0y = na.y;
          const b0x = nb.x;
          const b0y = nb.y;

          function onMove(ev) {
            const dx = ev.clientX - sx;
            const dy = ev.clientY - sy;

            const aMaxX = Math.max(0, brd.clientWidth - (na.el.offsetWidth || 80));
            const aMaxY = Math.max(0, brd.clientHeight - (na.el.offsetHeight || 32));
            const bMaxX = Math.max(0, brd.clientWidth - (nb.el.offsetWidth || 80));
            const bMaxY = Math.max(0, brd.clientHeight - (nb.el.offsetHeight || 32));

            na.x = Math.max(0, Math.min(aMaxX, a0x + dx));
            na.y = Math.max(0, Math.min(aMaxY, a0y + dy));
            nb.x = Math.max(0, Math.min(bMaxX, b0x + dx));
            nb.y = Math.max(0, Math.min(bMaxY, b0y + dy));

            na.el.style.left = na.x + 'px';
            na.el.style.top = na.y + 'px';
            nb.el.style.left = nb.x + 'px';
            nb.el.style.top = nb.y + 'px';

            conGroupRefitAll();
            conRedrawEdges();
          }

          function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            conSyncNodeBasePosition(na);
            conSyncNodeBasePosition(nb);
          }

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });

        const _defLinkThickness = (explicitThickness > 0) ? Number(explicitThickness) : ((window._conDefaultLinkThickness > 0) ? window._conDefaultLinkThickness : 2);
        const _defLinkStrokeType = window._conDefaultLinkStrokeType || 'solid';
        const _defLinkRouting = window._conDefaultLinkRouting || 'straight';
        const _defLinkDirection = (type !== undefined && type !== null) ? type : (window._conDefaultLinkDirection || 'none');
        const _defLinkTerminator = window._conDefaultLinkTerminator || 'arrow';
        const _hasExplicitColor = (typeof color === 'string' && color.trim() !== '');
        const _defLinkColor = _hasExplicitColor ? color : (window._conDefaultLinkColor || '#333333');
        const _defLinkOpacity = (typeof window._conDefaultLinkOpacity === 'number') ? window._conDefaultLinkOpacity : 1;
        const _defLinkAnimated = !!window._conDefaultLinkAnimated;
        const _defLinkLabelBg = !!window._conDefaultLinkLabelBg;
        const _defLinkLabelSize = (window._conDefaultLinkLabelSize > 0) ? window._conDefaultLinkLabelSize : (window.conGetDefaultWordFontSize ? window.conGetDefaultWordFontSize() : 16);

        const edge = {
          id: edgeId,
          a: aId,
          b: bId,
          type: _defLinkDirection,
          label: '',
          labelSize: _defLinkLabelSize,
          labelColor: _defLinkColor,
          labelWeight: 600,
          colorMode: _hasExplicitColor ? 'manual' : 'auto',
          strokeColor: _hasExplicitColor ? color : null,
          thickness: _defLinkThickness,
          dashStyle: (_defLinkStrokeType === 'dashed' || _defLinkStrokeType === 'dotted') ? _defLinkStrokeType : null,
          strokeType: _defLinkStrokeType,
          routing: _defLinkRouting,
          curvature: 0,
          opacity: _defLinkOpacity,
          terminator: _defLinkTerminator,
          animated: _defLinkAnimated,
          labelBgActive: _defLinkLabelBg,
          anchorA: null,
          anchorB: null,
          points: [],
          avoidObstacles: false,
          pointHandles: [],
          splitHandles: [],
          line,
          hit,
          labelEl,
          labelBg: labelBgEl,
          midHandle: null,
          endHandleA: null,
          endHandleB: null,
          g
        };
        line.style.strokeWidth = String(_defLinkThickness) + 'px';
        hit.style.strokeWidth = String(Math.max(16, _defLinkThickness + 10)) + 'px';
        conEdges.push(edge);
        conApplyEdgeLabelStyle(edge);
        conUpdateEdge(edge);
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({
            type: 'edge-add',
            edge: {
              id: edge.id,
              a: edge.a,
              b: edge.b,
              type: edge.type,
              label: edge.label,
              labelSize: edge.labelSize,
              labelColor: edge.labelColor,
              labelWeight: edge.labelWeight,
              thickness: edge.thickness,
              dashStyle: edge.dashStyle,
              strokeType: edge.strokeType,
              routing: edge.routing,
              curvature: edge.curvature,
              opacity: edge.opacity,
              terminator: edge.terminator,
              animated: edge.animated,
              labelBg: edge.labelBgActive,
              anchorA: edge.anchorA,
              anchorB: edge.anchorB,
              colorMode: edge.colorMode,
              strokeColor: edge.strokeColor,
              points: edge.points,
              avoidObstacles: edge.avoidObstacles
            }
          });
        }
        return edge;
      }

      function conNormalizeEdgeLabelStyle(edge) {
        const rawSize = Number(edge && edge.labelSize);
        const rawWeight = Number(edge && edge.labelWeight);
        const color = edge && edge.labelColor ? String(edge.labelColor) : '#333333';
        const defSize = window.conGetDefaultWordFontSize ? window.conGetDefaultWordFontSize() : 16;
        const size = Math.max(8, Math.min(36, Number.isFinite(rawSize) && rawSize > 0 ? rawSize : defSize));
        const weight = Math.max(300, Math.min(900, Number.isFinite(rawWeight) ? (Math.round(rawWeight / 100) * 100) : 600));
        return { size, color, weight };
      }

      function conApplyEdgeLabelStyle(edge) {
        if (!edge || !edge.labelEl) return;
        const style = conNormalizeEdgeLabelStyle(edge);
        edge.labelSize = style.size;
        edge.labelColor = style.color;
        edge.labelWeight = style.weight;
        edge.labelEl.style.fontSize = style.size + 'px';
        edge.labelEl.style.fontWeight = String(style.weight);

        const strokeInfo = conResolveEdgeStroke(edge);
        if (strokeInfo.gradient) {
          edge.labelEl.style.fill = (edge.colorMode === 'manual') ? style.color : '#111111';
        } else {
          edge.labelEl.style.fill = (edge.colorMode === 'manual') ? style.color : (edge.labelColor || '#333333');
        }

        if (edge.line) {
          if (strokeInfo.gradient) {
            edge.line.style.stroke = 'url(#con-edge-grad-' + edge.id + ')';
          } else {
            edge.line.style.stroke = strokeInfo.solid;
          }
          const strokeType = edge.strokeType || (edge.dashStyle === 'dashed' ? 'dashed' : 'solid');
          const sw = Math.max(1, edge.thickness || 2);
          const hasArrow = edge.type && edge.type !== 'none';
          if (strokeType === 'dashed') {
            edge.line.style.strokeDasharray = `${sw * 4} ${sw * 2}`;
            edge.line.style.strokeLinecap = 'butt';
          } else if (strokeType === 'dotted') {
            edge.line.style.strokeDasharray = `${sw * 0.4} ${sw * 2.5}`;
            edge.line.style.strokeLinecap = hasArrow ? 'butt' : 'round';
          } else if (edge.animated) {
            edge.line.style.strokeDasharray = `${sw * 4} ${sw * 2}`;
            edge.line.style.strokeLinecap = hasArrow ? 'butt' : 'round';
          } else {
            edge.line.style.strokeDasharray = '';
            edge.line.style.strokeLinecap = hasArrow ? 'butt' : 'round';
          }
          const op = (typeof edge.opacity === 'number' && edge.opacity >= 0.05 && edge.opacity <= 1) ? edge.opacity : 1;
          edge.line.style.opacity = String(op);
          if (edge.animated) {
            if (edge.type === 'backward') {
              edge.line.classList.remove('con-edge-animated');
              edge.line.classList.add('con-edge-animated-reverse');
            } else {
              edge.line.classList.remove('con-edge-animated-reverse');
              edge.line.classList.add('con-edge-animated');
            }
          } else {
            edge.line.classList.remove('con-edge-animated');
            edge.line.classList.remove('con-edge-animated-reverse');
          }
        }
      }

      function conEnsureSvgDefs() {
        const svgEl = svg();
        if (svgEl.querySelector('#con-arrow-defs')) return;
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.id = 'con-arrow-defs';
        const mkMarker = (id, refX, refY, w, h, innerSvg) => {
          const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
          m.setAttribute('id', id);
          m.setAttribute('markerWidth', String(w));
          m.setAttribute('markerHeight', String(h));
          m.setAttribute('refX', String(refX));
          m.setAttribute('refY', String(refY));
          m.setAttribute('orient', 'auto');
          m.setAttribute('markerUnits', 'userSpaceOnUse');
          m.innerHTML = innerSvg;
          return m;
        };

        // Compact sleek arrow (triangle) - length = 8.5
        defs.appendChild(mkMarker('con-arrow-end', 1, 4.5, 11, 9,
          '<path d="M 1 1 L 9.5 4.5 L 1 8 Z" fill="context-stroke" stroke="context-stroke" stroke-linejoin="round" />'));
        defs.appendChild(mkMarker('con-arrow-start', 9.5, 4.5, 11, 9,
          '<path d="M 9.5 1 L 1 4.5 L 9.5 8 Z" fill="context-stroke" stroke="context-stroke" stroke-linejoin="round" />'));

        // Open chevron marker - length = 7.0
        defs.appendChild(mkMarker('con-open-end', 1.5, 5, 10, 10,
          '<path d="M 1.5 1.5 L 8.5 5 L 1.5 8.5" fill="none" stroke="context-stroke" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />'));
        defs.appendChild(mkMarker('con-open-start', 8.5, 5, 10, 10,
          '<path d="M 8.5 1.5 L 1.5 5 L 8.5 8.5" fill="none" stroke="context-stroke" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />'));

        // Circle / Dot marker - length = 7.0
        defs.appendChild(mkMarker('con-circle-end', 1.5, 5, 10, 10,
          '<circle cx="5" cy="5" r="3.5" fill="context-stroke" stroke="context-stroke" />'));
        defs.appendChild(mkMarker('con-circle-start', 8.5, 5, 10, 10,
          '<circle cx="5" cy="5" r="3.5" fill="context-stroke" stroke="context-stroke" />'));

        // Diamond marker - length = 10.0
        defs.appendChild(mkMarker('con-diamond-end', 1, 5, 12, 10,
          '<polygon points="6,1 11,5 6,9 1,5" fill="context-stroke" stroke="context-stroke" stroke-linejoin="round" />'));
        defs.appendChild(mkMarker('con-diamond-start', 11, 5, 12, 10,
          '<polygon points="6,1 1,5 6,9 11,5" fill="context-stroke" stroke="context-stroke" stroke-linejoin="round" />'));

        svgEl.insertBefore(defs, svgEl.firstChild);
      }

      function _conIsAnchorMasked(id) {
        if (!id) return false;
        const noteArr = (typeof conNotes !== 'undefined') ? conNotes : ((typeof window.conGetNotes === 'function') ? window.conGetNotes() : []);
        const note = noteArr.find(n => n && n.id === id);
        if (note) return !!note.hidden;
        const nodesArr = (typeof conNodes !== 'undefined') ? conNodes : ((typeof window.conGetNodes === 'function') ? window.conGetNodes() : []);
        const node = nodesArr.find(n => n && n.id === id);
        if (node) return !!node.masked;
        const groupsArr = (typeof conGroups !== 'undefined') ? conGroups : ((typeof window.conGetGroups === 'function') ? window.conGetGroups() : []);
        const group = groupsArr.find(g => g && g.id === id);
        if (group && group.nodeIds && group.nodeIds.length) {
          return group.nodeIds.every(nid => {
            const gn = nodesArr.find(n => n && n.id === nid);
            return gn && gn.masked;
          });
        }
        const mediaArr = (typeof conMediaItems !== 'undefined' && Array.isArray(conMediaItems)) ? conMediaItems : ((typeof window.conGetMediaItems === 'function') ? window.conGetMediaItems() : []);
        const media = mediaArr.find(m => m && (m.id === id || String(m.id) === String(id)));
        if (media) return !!media.hidden;
        return false;
      }

      function conUpdateEdge(edge) {
        conEnsureSvgDefs();
        const na = conResolveLinkAnchor(edge.a);
        const nb = conResolveLinkAnchor(edge.b);
        if (!na || !nb) {
          if (edge.g) edge.g.style.display = 'none';
          return;
        }
        if (edge.g && edge.g.style.display === 'none') {
          edge.g.style.display = '';
        }
        if (edge.g) {
          const isEndpointMasked = _conIsAnchorMasked(edge.a) || _conIsAnchorMasked(edge.b);
          const isBothMasked = _conIsAnchorMasked(edge.a) && _conIsAnchorMasked(edge.b);
          edge.g.classList.toggle('con-edge-masked', isEndpointMasked);
          edge.g.classList.toggle('con-edge-both-masked', isBothMasked);
        }

        // Migrate <line> to <path> for line and hit if necessary
        if (edge.line && edge.line.tagName.toLowerCase() === 'line') {
          const np = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          np.setAttribute('class', 'con-line');
          np.setAttribute('fill', 'none');
          np.style.strokeWidth = edge.line.style.strokeWidth;
          np.style.stroke = edge.line.style.stroke;
          edge.g.replaceChild(np, edge.line);
          edge.line = np;
        }
        if (edge.hit && edge.hit.tagName.toLowerCase() === 'line') {
          const nh = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          nh.setAttribute('class', 'con-line-hit');
          nh.setAttribute('fill', 'none');
          nh.style.strokeWidth = edge.hit.style.strokeWidth;
          edge.g.replaceChild(nh, edge.hit);
          edge.hit = nh;
        }

        let ax = na.cx, ay = na.cy, bx = nb.cx, by = nb.cy;
        if (edge.anchorA) {
          const ptA = conGetAnchorPoint(na, edge.anchorA);
          if (ptA) { ax = ptA.x; ay = ptA.y; }
        }
        if (edge.anchorB) {
          const ptB = conGetAnchorPoint(nb, edge.anchorB);
          if (ptB) { bx = ptB.x; by = ptB.y; }
        }

        const t = edge.type || 'none';
        let x1 = ax, y1 = ay, x2 = bx, y2 = by;

        // Trim endpoints to node boundary unless fixed port anchor is used
        const dx = bx - ax, dy = by - ay;
        const dist = Math.hypot(dx, dy);
        if (dist > 8) {
          const nx = dx / dist, ny = dy / dist;
          const rawRA = !edge.anchorA ? conNodeEdgeOffset(na, dx, dy) : 0;
          const rawRB = !edge.anchorB ? conNodeEdgeOffset(nb, -dx, -dy) : 0;
          let rA = rawRA;
          let rB = rawRB;
          if (rawRA + rawRB + 8 > dist) {
            const scale = Math.max(0, (dist - 8) / ((rawRA + rawRB) || 1));
            rA = rawRA * scale;
            rB = rawRB * scale;
          }
          if (!edge.anchorA) {
            x1 = ax + nx * rA; y1 = ay + ny * rA;
          }
          if (!edge.anchorB) {
            x2 = bx - nx * rB; y2 = by - ny * rB;
          }
        }

        const strokeType = edge.strokeType || (edge.dashStyle === 'dashed' ? 'dashed' : (edge.dashStyle === 'dotted' ? 'dotted' : 'solid'));
        const routing = edge.routing || 'straight';
        const curvature = (typeof edge.curvature === 'number') ? edge.curvature : 0;
        const sw = Number.isFinite(edge.thickness) && edge.thickness > 0 ? edge.thickness : 2;

        const term = edge.terminator || 'arrow';
        const geo = conComputeEdgeGeometry(x1, y1, x2, y2, routing, strokeType, curvature, sw, t, term, edge.points, edge.avoidObstacles, edge.a, edge.b);

        if (edge.line) {
          edge.line.setAttribute('d', geo.d);
          edge.line.style.setProperty('stroke-width', sw + 'px', 'important');
          edge.line.setAttribute('stroke-width', String(sw));
        }
        if (edge.hit) {
          edge.hit.setAttribute('d', geo.d);
          edge.hit.style.strokeWidth = Math.max(16, sw + 10) + 'px';
        }

        const strokeInfo = conResolveEdgeStroke(edge);
        if (strokeInfo.gradient) {
          _conUpdateEdgeGradient(edge, x1, y1, x2, y2, strokeInfo.colorA, strokeInfo.colorB);
          if (edge.line) {
            const gradUrl = 'url(#con-edge-grad-' + edge.id + ')';
            edge.line.style.stroke = gradUrl;
            edge.line.setAttribute('stroke', gradUrl);
          }
        } else if (edge.line) {
          edge.line.style.stroke = strokeInfo.solid;
          edge.line.setAttribute('stroke', strokeInfo.solid);
        }

        // Terminator markers (resolved with explicit color per (term, end, color) so Blink always repaints)
        if (edge.line) {
          const endColor = strokeInfo.gradient ? strokeInfo.colorB : strokeInfo.solid;
          const startColor = strokeInfo.gradient ? strokeInfo.colorA : strokeInfo.solid;
          const mEnd = (t === 'forward' || t === 'both') ? _conEnsureColorMarker(term, 'end', endColor) : '';
          const mStart = (t === 'backward' || t === 'both') ? _conEnsureColorMarker(term, 'start', startColor) : '';

          if (mStart) {
            if (edge.line.getAttribute('marker-start') !== mStart) edge.line.setAttribute('marker-start', mStart);
          } else if (edge.line.hasAttribute('marker-start')) {
            edge.line.removeAttribute('marker-start');
          }

          if (mEnd) {
            if (edge.line.getAttribute('marker-end') !== mEnd) edge.line.setAttribute('marker-end', mEnd);
          } else if (edge.line.hasAttribute('marker-end')) {
            edge.line.removeAttribute('marker-end');
          }
        }

        // Update label position and pill background
        if (edge.labelEl) {
          conApplyEdgeLabelStyle(edge);
          const mx = geo.mx;
          const my = geo.my;
          const angle = geo.angle;
          const a = (angle > 90 || angle < -90) ? angle + 180 : angle;
          edge.labelEl.setAttribute('x', mx);
          edge.labelEl.setAttribute('y', my);
          edge.labelEl.setAttribute('transform', `rotate(${a.toFixed(1)},${mx.toFixed(1)},${my.toFixed(1)})`);
          const dy = -Math.max(4, Math.round((edge.labelSize || (window.conGetDefaultWordFontSize ? window.conGetDefaultWordFontSize() : 16)) * 0.45));
          edge.labelEl.setAttribute('dy', String(dy));
          edge.labelEl.textContent = edge.label || '';

          if (!edge.labelBg) {
            const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bg.setAttribute('class', 'con-line-label-bg');
            bg.setAttribute('rx', '4');
            bg.setAttribute('ry', '4');
            edge.g.insertBefore(bg, edge.labelEl);
            edge.labelBg = bg;
          }
          if (edge.label && edge.labelBgActive) {
            const approxW = Math.max(20, edge.label.length * (edge.labelSize * 0.6) + 12);
            const approxH = Math.max(14, edge.labelSize * 1.25);
            edge.labelBg.setAttribute('x', mx - approxW / 2);
            edge.labelBg.setAttribute('y', my + dy - approxH * 0.75);
            edge.labelBg.setAttribute('width', approxW);
            edge.labelBg.setAttribute('height', approxH);
            edge.labelBg.setAttribute('transform', `rotate(${a.toFixed(1)},${mx.toFixed(1)},${my.toFixed(1)})`);
            edge.labelBg.setAttribute('fill', '#ffffff');
            edge.labelBg.setAttribute('stroke', '#111111');
            edge.labelBg.setAttribute('stroke-width', '1.5');
            edge.labelBg.style.display = 'block';
          } else if (edge.labelBg) {
            edge.labelBg.style.display = 'none';
          }
        }

        // Handles for selected edge
        const isSelected = window._conSelectedEdgeId === edge.id;
        if (!edge.midHandle) {
          const mh = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          mh.setAttribute('class', 'con-edge-mid-handle');
          mh.setAttribute('r', '5.5');
          edge.g.appendChild(mh);
          edge.midHandle = mh;
          _conInitMidHandle(edge);
        }
        if (!edge.endHandleA) {
          const ha = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          ha.setAttribute('class', 'con-edge-end-handle');
          ha.setAttribute('r', '5');
          edge.g.appendChild(ha);
          edge.endHandleA = ha;
          _conInitEndHandle(edge, 'a');
        }
        if (!edge.endHandleB) {
          const hb = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          hb.setAttribute('class', 'con-edge-end-handle');
          hb.setAttribute('r', '5');
          edge.g.appendChild(hb);
          edge.endHandleB = hb;
          _conInitEndHandle(edge, 'b');
        }
        if (!edge.pointHandles) edge.pointHandles = [];
        if (!edge.splitHandles) edge.splitHandles = [];

        if (isSelected) {
          edge.endHandleA.setAttribute('cx', x1);
          edge.endHandleA.setAttribute('cy', y1);
          edge.endHandleA.style.display = 'block';

          edge.endHandleB.setAttribute('cx', x2);
          edge.endHandleB.setAttribute('cy', y2);
          edge.endHandleB.style.display = 'block';

          const curPts = Array.isArray(edge.points) ? edge.points : [];
          const hasManualPoints = curPts.length > 0;
          if (!hasManualPoints && !edge.avoidObstacles && edge.routing === 'curved') {
            edge.midHandle.setAttribute('cx', geo.cx);
            edge.midHandle.setAttribute('cy', geo.cy);
            edge.midHandle.style.display = 'block';
          } else {
            edge.midHandle.style.display = 'none';
          }

          // Point handles for manual waypoints
          while (edge.pointHandles.length > curPts.length) {
            const h = edge.pointHandles.pop();
            if (h && h.el) h.el.remove();
          }
          while (edge.pointHandles.length < curPts.length) {
            const ph = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            ph.setAttribute('class', 'con-edge-point-handle');
            ph.setAttribute('r', '6');
            edge.g.appendChild(ph);
            _conInitPointHandle(edge, ph);
            edge.pointHandles.push({ el: ph });
          }
          for (let i = 0; i < curPts.length; i++) {
            const ph = edge.pointHandles[i];
            if (ph && ph.el) {
              ph.el.setAttribute('cx', curPts[i].x);
              ph.el.setAttribute('cy', curPts[i].y);
              ph.el.style.display = 'block';
              ph.el.dataset.idx = String(i);
            }
          }

          // Split handles at segment midpoints
          const fullPts = [{ x: x1, y: y1 }, ...curPts, { x: x2, y: y2 }];
          const neededSplits = fullPts.length - 1;
          while (edge.splitHandles.length > neededSplits) {
            const sh = edge.splitHandles.pop();
            if (sh && sh.el) sh.el.remove();
          }
          while (edge.splitHandles.length < neededSplits) {
            const sh = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            sh.setAttribute('class', 'con-edge-split-handle');
            sh.setAttribute('r', '4.5');
            edge.g.appendChild(sh);
            _conInitSplitHandle(edge, sh);
            edge.splitHandles.push({ el: sh });
          }
          for (let s = 0; s < neededSplits; s++) {
            const sh = edge.splitHandles[s];
            if (sh && sh.el) {
              const smx = (fullPts[s].x + fullPts[s + 1].x) / 2;
              const smy = (fullPts[s].y + fullPts[s + 1].y) / 2;
              sh.el.setAttribute('cx', smx);
              sh.el.setAttribute('cy', smy);
              sh.el.style.display = 'block';
              sh.el.dataset.splitIdx = String(s);
            }
          }
        } else {
          if (edge.midHandle) edge.midHandle.style.display = 'none';
          if (edge.endHandleA) edge.endHandleA.style.display = 'none';
          if (edge.endHandleB) edge.endHandleB.style.display = 'none';
          if (edge.pointHandles) {
            edge.pointHandles.forEach(h => { if (h && h.el) h.el.style.display = 'none'; });
          }
          if (edge.splitHandles) {
            edge.splitHandles.forEach(sh => { if (sh && sh.el) sh.el.style.display = 'none'; });
          }
        }
      }

      // Returns distance from node centre to its rectangular boundary in direction (dx, dy)
      // plus a small margin so the arrowhead tip lands just at the visible edge
      function conNodeEdgeOffset(node, dx, dy) {
        const rawW = (node && typeof node.w === 'number' && node.w > 0) ? node.w : ((node && node._cachedW > 0) ? node._cachedW : (node && node.el ? ((node.el.offsetWidth > 0) ? (node._cachedW = node.el.offsetWidth) : (parseFloat(node.el.style.width) || 80)) : 80));
        const rawH = (node && typeof node.h === 'number' && node.h > 0) ? node.h : ((node && node._cachedH > 0) ? node._cachedH : (node && node.el ? ((node.el.offsetHeight > 0) ? (node._cachedH = node.el.offsetHeight) : (parseFloat(node.el.style.height) || 28)) : 28));
        const w = Math.max(20, rawW);
        const h = Math.max(10, rawH);

        const rot = (node && typeof node.rotation === 'number')
          ? node.rotation
          : ((node && node.el && node.el.dataset && node.el.dataset.rotation)
            ? (parseFloat(node.el.dataset.rotation) || 0)
            : 0);
        let localDx = dx, localDy = dy;
        if (rot && rot % 360 !== 0) {
          const rad = -rot * Math.PI / 180;
          localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
          localDy = dx * Math.sin(rad) + dy * Math.cos(rad);
        }

        const len = Math.sqrt(localDx * localDx + localDy * localDy);
        if (len < 0.01) return w / 2;
        const nx = Math.abs(localDx / len), ny = Math.abs(localDy / len);
        const shape = conNormalizeNodeShape(node.shape || (node.el && node.el.dataset.shape));

        if (shape === 'circle') return (Math.max(w, h) / 2) + 3;
        if (shape === 'oval') {
          const a = w / 2;
          const b = h / 2;
          const denom = Math.sqrt(((nx * nx) / (a * a)) + ((ny * ny) / (b * b)));
          return (denom > 0 ? 1 / denom : Math.max(a, b)) + 3;
        }
        if (shape === 'losange') {
          const denom = (nx / (w / 2)) + (ny / (h / 2));
          return (denom > 0 ? 1 / denom : Math.min(w, h) / 2) + 3;
        }

        const rw = nx > 0.01 ? (w / 2) / nx : Infinity;
        const rh = ny > 0.01 ? (h / 2) / ny : Infinity;
        return Math.min(rw, rh) + 3; // +3 so arrow tip is just outside node edge
      }

      function conRedrawEdges(opts) {
        const preserveSizeCache = !!(opts && opts.preserveSizeCache);
        if (!preserveSizeCache) {
          if (typeof conNodes !== 'undefined' && Array.isArray(conNodes)) {
            for (let i = 0; i < conNodes.length; i++) {
              conNodes[i]._cachedW = 0;
              conNodes[i]._cachedH = 0;
            }
          }
          if (typeof conNotes !== 'undefined' && Array.isArray(conNotes)) {
            for (let i = 0; i < conNotes.length; i++) {
              conNotes[i]._cachedW = 0;
              conNotes[i]._cachedH = 0;
            }
          }
        }
        conEdges.forEach(e => conUpdateEdge(e));
      }

      // Resolve any constellation element (node, note, group/phrase-group) by ID to its
      // Resolve any constellation element (node, note, group/phrase-group) by ID to its
      // current visual centre and bounding box, for use by conUpdateEdge and link mode.
      function conResolveLinkAnchor(id) {
        const noteArr = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : ((typeof conNotes !== 'undefined') ? conNotes : (window.conNotes || []));
        const note = noteArr.find(n => n && (n.id === id || String(n.id) === String(id)));
        if (note) {
          const el = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(note.id) : document.querySelector(`.con-word-note[data-id="${note.id}"]`);
          const w = (note._cachedW > 0) ? note._cachedW : ((el && el.offsetWidth > 0) ? (note._cachedW = el.offsetWidth) : (typeof note.width === 'number' && note.width > 0 ? note.width : 120));
          const h = (note._cachedH > 0) ? note._cachedH : ((el && el.offsetHeight > 0) ? (note._cachedH = el.offsetHeight) : (typeof note.height === 'number' && note.height > 0 ? note.height : 80));
          const rot = (typeof note.rotation === 'number') ? note.rotation : ((el && el.dataset && el.dataset.rotation) ? (parseFloat(el.dataset.rotation) || 0) : 0);
          return { cx: note.x + w / 2, cy: note.y + h / 2, x: note.x, y: note.y, w, h, el, shape: null, rotation: rot, node: note };
        }
        const noteEl = document.querySelector(`.con-word-note[data-id="${id}"]`);
        if (noteEl) {
          const nx = parseFloat(noteEl.style.left) || 0;
          const ny = parseFloat(noteEl.style.top) || 0;
          const nw = noteEl.offsetWidth || 120;
          const nh = noteEl.offsetHeight || 80;
          const rot = (noteEl.dataset && noteEl.dataset.rotation) ? (parseFloat(noteEl.dataset.rotation) || 0) : 0;
          return { cx: nx + nw / 2, cy: ny + nh / 2, x: nx, y: ny, w: nw, h: nh, el: noteEl, shape: null, rotation: rot, node: { id, x: nx, y: ny, width: nw, height: nh } };
        }
        const node = conNodes.find(n => n && (n.id === id || String(n.id) === String(id)));
        if (node && node.el) {
          const nw = (node._cachedW > 0) ? node._cachedW : ((node.el.offsetWidth > 0) ? (node._cachedW = node.el.offsetWidth) : (parseFloat(node.el.style.width) || 80));
          const nh = (node._cachedH > 0) ? node._cachedH : ((node.el.offsetHeight > 0) ? (node._cachedH = node.el.offsetHeight) : (parseFloat(node.el.style.height) || 28));
          const rot = (typeof node.rotation === 'number')
            ? node.rotation
            : ((node.el.dataset && node.el.dataset.rotation) ? (parseFloat(node.el.dataset.rotation) || 0) : 0);
          return {
            cx: node.x + nw / 2,
            cy: node.y + nh / 2,
            x: node.x,
            y: node.y,
            w: nw,
            h: nh,
            el: node.el,
            shape: node.shape,
            rotation: rot,
            node: node
          };
        }
        const group = conGroups.find(g => g && (g.id === id || String(g.id) === String(id)));
        if (group && group.el) {
          const gx = parseFloat(group.el.style.left) || 0;
          const gy = parseFloat(group.el.style.top) || 0;
          const gw = (group.el.offsetWidth > 0) ? group.el.offsetWidth : (parseFloat(group.el.style.width) || (group._manualW != null ? group._manualW : 160));
          const gh = (group.el.offsetHeight > 0) ? group.el.offsetHeight : (parseFloat(group.el.style.height) || (group._manualH != null ? group._manualH : 64));
          const rot = (typeof group.rotation === 'number') ? group.rotation : ((group.el.dataset && group.el.dataset.rotation) ? (parseFloat(group.el.dataset.rotation) || 0) : 0);
          return {
            cx: gx + gw / 2,
            cy: gy + gh / 2,
            x: gx,
            y: gy,
            w: gw,
            h: gh,
            el: group.el,
            shape: null,
            rotation: rot,
            node: group
          };
        }
        // Drawing
        const drawArr = (typeof window.conGetDrawings === 'function') ? window.conGetDrawings() : ((typeof conDrawings !== 'undefined' && Array.isArray(conDrawings)) ? conDrawings : (window.conDrawings || []));
        const dr = drawArr.find(d => d && (d.id === id || String(d.id) === String(id)));
        if (dr) {
          const el = dr.el || document.querySelector(`#constellation-board .con-drawing[data-did="${id}"], .con-drawing[data-did="${id}"]`);
          const w = (typeof dr.w === 'number' && dr.w > 0) ? dr.w : (el ? (el.offsetWidth || 60) : 60);
          const h = (typeof dr.h === 'number' && dr.h > 0) ? dr.h : (el ? (el.offsetHeight || 40) : 40);
          const rot = (typeof dr.rotation === 'number') ? dr.rotation : 0;
          return {
            cx: dr.x + w / 2,
            cy: dr.y + h / 2,
            x: dr.x,
            y: dr.y,
            w: Math.max(20, w),
            h: Math.max(10, h),
            el,
            shape: 'rectangle',
            rotation: rot,
            node: dr
          };
        }
        const drawEl = document.querySelector(`#constellation-board .con-drawing[data-did="${id}"], .con-drawing[data-did="${id}"]`);
        if (drawEl) {
          const pad = 12;
          const dx = (parseFloat(drawEl.style.left) || 0) + pad;
          const dy = (parseFloat(drawEl.style.top) || 0) + pad;
          const dw = Math.max(20, (drawEl.offsetWidth || (60 + 2 * pad)) - 2 * pad);
          const dh = Math.max(10, (drawEl.offsetHeight || (40 + 2 * pad)) - 2 * pad);
          return {
            cx: dx + dw / 2, cy: dy + dh / 2, x: dx, y: dy, w: dw, h: dh, el: drawEl, shape: 'rectangle', rotation: 0, node: { id, x: dx, y: dy, w: dw, h: dh }
          };
        }

        // Media item (Picture / Audio / Video / PDF)
        const mediaArr = (typeof window.conGetMediaItems === 'function') ? window.conGetMediaItems() : ((typeof conMediaItems !== 'undefined' && Array.isArray(conMediaItems)) ? conMediaItems : (window.conMediaItems || []));
        const media = mediaArr.find(m => m && (m.id === id || String(m.id) === String(id)));
        if (media) {
          const el = (typeof _conMediaGetWrap === 'function') ? _conMediaGetWrap(media) : document.querySelector(`.con-media-item[data-id="${media.id}"]`);
          const w = (typeof media.w === 'number' && media.w > 0) ? media.w : (el ? (el.offsetWidth || 160) : 160);
          const h = (typeof media.h === 'number' && media.h > 0) ? media.h : (el ? (el.offsetHeight || 120) : 120);
          const rot = (typeof media.rotation === 'number') ? media.rotation : ((el && el.dataset && el.dataset.rotation) ? (parseFloat(el.dataset.rotation) || 0) : 0);
          return {
            cx: media.x + w / 2,
            cy: media.y + h / 2,
            x: media.x,
            y: media.y,
            w: Math.max(20, w),
            h: Math.max(10, h),
            el,
            shape: 'rectangle',
            rotation: rot,
            node: media
          };
        }
        const mediaEl = document.querySelector(`.con-media-item[data-id="${id}"]`);
        if (mediaEl) {
          const mx = parseFloat(mediaEl.style.left) || 0;
          const my = parseFloat(mediaEl.style.top) || 0;
          const mw = mediaEl.offsetWidth || 160;
          const mh = mediaEl.offsetHeight || 120;
          const rot = (mediaEl.dataset && mediaEl.dataset.rotation) ? (parseFloat(mediaEl.dataset.rotation) || 0) : 0;
          return {
            cx: mx + mw / 2, cy: my + mh / 2, x: mx, y: my, w: mw, h: mh, el: mediaEl, shape: 'rectangle', rotation: rot, node: { id, x: mx, y: my, w: mw, h: mh }
          };
        }
        return null;
      }

      function conGetAnchorPoint(anchorData, pos) {
        if (!anchorData) return null;
        const rot = (typeof anchorData.rotation === 'number')
          ? anchorData.rotation
          : ((anchorData.el && anchorData.el.dataset && anchorData.el.dataset.rotation)
            ? (parseFloat(anchorData.el.dataset.rotation) || 0)
            : 0);
        let ox = 0, oy = 0;
        const halfW = (anchorData.w || 80) / 2;
        const halfH = (anchorData.h || 28) / 2;
        if (pos === 'top') { ox = 0; oy = -halfH; }
        else if (pos === 'bottom') { ox = 0; oy = halfH; }
        else if (pos === 'left') { ox = -halfW; oy = 0; }
        else if (pos === 'right') { ox = halfW; oy = 0; }
        if (rot && rot % 360 !== 0) {
          const rad = rot * Math.PI / 180;
          const rx = ox * Math.cos(rad) - oy * Math.sin(rad);
          const ry = ox * Math.sin(rad) + oy * Math.cos(rad);
          return { x: anchorData.cx + rx, y: anchorData.cy + ry };
        }
        return { x: anchorData.cx + ox, y: anchorData.cy + oy };
      }

      // Start Ctrl+J cross-type link mode with the given element ID (or array of IDs) as the source(s).
      function _conStartLinkMode(srcIdOrIds) {
        _conCancelLinkMode();
        const ids = Array.isArray(srcIdOrIds)
          ? Array.from(new Set(srcIdOrIds.filter(Boolean).map(String)))
          : (srcIdOrIds ? [String(srcIdOrIds)] : []);
        if (!ids.length) return;
        _conLinkSrcIds = ids;
        _conLinkSrc = ids[0];
        window._conLinkSrc = global._conLinkSrc = _conLinkSrc;
        ids.forEach(id => {
          const anchor = conResolveLinkAnchor(id);
          if (anchor && anchor.el) anchor.el.classList.add('con-link-src');
        });
        const brd = board();
        if (brd) brd.classList.add('con-linking');
        conUpdateInstructions('link-src');
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'link-mode-start', srcId: String(_conLinkSrc), srcIds: ids });
        }
      }

      // Cancel Ctrl+J link mode, restoring normal visual state.
      function _conCancelLinkMode() {
        if (!_conLinkSrc && !window._conLinkSrc && (!_conLinkSrcIds || !_conLinkSrcIds.length)) return;
        const currentIds = (_conLinkSrcIds && _conLinkSrcIds.length)
          ? _conLinkSrcIds.slice()
          : ((_conLinkSrc || window._conLinkSrc) ? [String(_conLinkSrc || window._conLinkSrc)] : []);
        const cancelledId = currentIds[0] || '';
        currentIds.forEach(id => {
          const anchor = conResolveLinkAnchor(id);
          if (anchor && anchor.el) anchor.el.classList.remove('con-link-src');
        });
        document.querySelectorAll('#constellation-board .con-link-src, .con-link-src').forEach(el => el.classList.remove('con-link-src'));
        _conLinkSrcIds = [];
        _conLinkSrc = null;
        window._conLinkSrc = global._conLinkSrc = null;
        const brd = board();
        if (brd) brd.classList.remove('con-linking');
        conUpdateInstructions(conMode);
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'link-mode-cancel', srcId: String(cancelledId), srcIds: currentIds });
        }
      }

      let _pendingMirrorRemoveNodeIds = [];
      let _pendingMirrorRemoveScheduled = false;
      let _pendingMirrorRemoveTimer = null;
      let _pendingMirrorRemoveHadExternalSuppress = false;
      function _conQueueMirrorNodeRemove(id, hadExternalSuppress) {
        if (id == null || id === '') return;
        if (!_pendingMirrorRemoveScheduled && _pendingMirrorRemoveTimer === null) {
          _pendingMirrorRemoveHadExternalSuppress = !!hadExternalSuppress;
        }
        _pendingMirrorRemoveNodeIds.push(String(id));
        if (_pendingMirrorRemoveScheduled) return;
        _pendingMirrorRemoveScheduled = true;
        Promise.resolve().then(() => {
          _pendingMirrorRemoveScheduled = false;
          const ids = Array.from(new Set(_pendingMirrorRemoveNodeIds.splice(0)));
          if (ids.length && typeof window._conMirrorSend === 'function') {
            const rev = (typeof window._conBumpBoardRevision === 'function') ? window._conBumpBoardRevision() : null;
            window._conMirrorSend({
              type: 'nodes-remove',
              ids: ids,
              revision: rev
            });
          }
          if (_pendingMirrorRemoveTimer !== null) {
            clearTimeout(_pendingMirrorRemoveTimer);
          }
          _pendingMirrorRemoveTimer = setTimeout(() => {
            _pendingMirrorRemoveTimer = null;
            if (!_pendingMirrorRemoveHadExternalSuppress) {
              window._conSuppressMirrorObserver = false;
            }
            _pendingMirrorRemoveHadExternalSuppress = false;
          }, 60);
        });
      }

      function conRemoveNode(id) {
        const sid = id != null ? String(id) : '';
        const idx = conNodes.findIndex(n => n && (n.id === id || String(n.id) === sid));
        if (idx === -1) return;
        const isMirrorWin = (typeof location !== 'undefined' && location.search.indexOf('mirror=1') !== -1);
        const _prevSuppress = !!window._conSuppressMirrorObserver;
        const _hadExternalSuppress = _prevSuppress && !_pendingMirrorRemoveScheduled && _pendingMirrorRemoveTimer === null;
        window._conSuppressMirrorObserver = true;
        let queuedMirrorRemove = false;
        try {
          if (conNodes[idx].el) conNodes[idx].el.remove();
          conNodes.splice(idx, 1);
          // Remove connected edges in-place to preserve array references across modules
          for (let i = conEdges.length - 1; i >= 0; i--) {
            const e = conEdges[i];
            if (e && (e.a === id || e.b === id || String(e.a) === sid || String(e.b) === sid)) {
              if (e.g && e.g.remove) e.g.remove();
              conEdges.splice(i, 1);
            }
          }
          window.conEdges = global.conEdges = conEdges;
          // Remove from any group
          conGroupRemoveNode(id);
          if (conSelected === id || String(conSelected) === sid) conSelect(null);
          if (conConnSrc === id || String(conConnSrc) === sid) conConnSrc = null;
          if (!isMirrorWin) {
            _conQueueMirrorNodeRemove(id, _hadExternalSuppress);
            queuedMirrorRemove = true;
          }
        } finally {
          if (!_prevSuppress && !queuedMirrorRemove) {
            window._conSuppressMirrorObserver = false;
          }
        }
      }

      function conRemoveEdge(eid) {
        const idx = conEdges.findIndex(e => e.id === eid);
        if (idx === -1) return;
        conEdges[idx].g.remove();
        conEdges.splice(idx, 1);
        if (window._conSelectedEdgeId === eid) {
          window._conSelectedEdgeId = null;
        }
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'edge-remove', id: String(eid) });
        }
      }

      function conUpdateInstructions(mode) {
        return;
      }

      function rgbToHex(color) {
        if (!color || color === '' || color === 'transparent') return '#ffffff';
        if (color.startsWith('#')) return color.length === 4
          ? '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
          : color;
        const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!m) return '#111111';
        return '#' + [m[1], m[2], m[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
      }

      const CON_NODE_SHAPES = ['oval', 'circle', 'square', 'rectangle'];

      function conNormalizeNodeShape(shape) {
        const normalized = String(shape || '').trim().toLowerCase();
        if (normalized === 'losange' || normalized === 'triangle') return 'rectangle';
        return CON_NODE_SHAPES.includes(normalized) ? normalized : 'rectangle';
      }

      function conApplyNodeShape(node, requestedShape) {
        if (!node || !node.el) return;
        const el = node.el;
        const shape = conNormalizeNodeShape(requestedShape || node.shape || el.dataset.shape);
        const borderColor = el.style.borderColor || node.border || '#111111';
        const bgColor = el.style.background || node.bg || '#ffffff';
        node.shape = shape;
        el.dataset.shape = shape;
        el.style.setProperty('--con-node-border', borderColor);
        el.style.setProperty('--con-node-bg', bgColor);

        el.style.clipPath = '';
        el.style.borderRadius = '4px';
        el.style.padding = '4px 9px';
        el.style.minWidth = '';
        el.style.minHeight = '';
        el.style.width = '';
        el.style.height = '';
        el.style.display = 'inline-flex';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.textAlign = 'center';
        el.style.lineHeight = '1.2';
        el.style.boxSizing = 'border-box';

        // Apply highlight glow if set
        const hlColor = node.highlight || null;
        el.style.boxShadow = hlColor ? `0 0 0 3px ${hlColor}, 1px 1px 0 #ccc` : '1px 1px 0 #ccc';

        // Apply custom border width / style if set
        if (node.borderWidth) el.style.borderWidth = node.borderWidth + 'px';
        if (node.borderStyle) el.style.borderStyle = node.borderStyle;

        // Apply per-node max-width constraint with word-wrap (rectangle + oval only)
        const _mw = (node.fmt && typeof node.fmt.maxWidth === 'number' && node.fmt.maxWidth > 0) ? node.fmt.maxWidth : null;
        if (_mw && shape !== 'circle' && shape !== 'square') {
          el.style.maxWidth = _mw + 'px';
          el.style.whiteSpace = 'normal';
          el.style.wordBreak = 'break-word';
          el.style.textAlign = 'left';
          el.style.alignItems = 'flex-start';
        } else {
          el.style.maxWidth = '';
          el.style.whiteSpace = '';
          el.style.wordBreak = '';
          el.style.textAlign = '';
          el.style.alignItems = '';
        }

        // Rectangle is default; avoid reading layout dimensions to prevent forced reflows!
        if (shape === 'rectangle') return;

        const naturalW = Math.max(48, el.scrollWidth || el.offsetWidth || 48);
        const naturalH = Math.max(32, el.scrollHeight || el.offsetHeight || 32);

        if (shape === 'oval') {
          el.style.borderRadius = '66%';
          el.style.padding = '8px 16px';
          el.style.minHeight = Math.max(38, naturalH) + 'px';
        } else if (shape === 'circle') {
          const d = Math.max(54, naturalW, naturalH);
          el.style.borderRadius = '50%';
          el.style.padding = '8px';
          el.style.width = d + 'px';
          el.style.height = d + 'px';
        } else if (shape === 'square') {
          const s = Math.max(54, naturalW, naturalH);
          el.style.padding = '8px';
          el.style.width = s + 'px';
          el.style.height = s + 'px';
        }
      }

      function conSyncShapeButtons(node) {
        const shape = conNormalizeNodeShape(node && (node.shape || (node.el && node.el.dataset.shape)));
        document.querySelectorAll('#con-ctx-shapes [data-shape]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.shape === shape);
        });
      }

      function conNormalizeNodeRotation(deg) {
        if (typeof deg !== 'number' || isNaN(deg)) deg = 0;
        deg = Math.round(deg) % 360;
        if (deg < 0) deg += 360;
        return deg;
      }

      function conApplyNodeRotation(nodeOrEl, deg) {
        if (!nodeOrEl) return;
        const node = (nodeOrEl && nodeOrEl.el) ? nodeOrEl : null;
        const el = node ? node.el : (nodeOrEl.style ? nodeOrEl : null);
        if (!el) return;
        const rot = conNormalizeNodeRotation(deg);
        if (node) node.rotation = rot;
        el.dataset.rotation = rot;
        el.style.transformOrigin = 'center center';
        el.style.transform = rot ? ('rotate(' + rot + 'deg)') : '';
      }

      function conSyncRotationButtons(node) {
        const rot = conNormalizeNodeRotation(node && node.rotation);
        const isPreset = [0, 90, 180, 270].includes(rot);
        document.querySelectorAll('#con-ctx-rot-btns [data-rot]').forEach(btn => {
          btn.classList.toggle('active', parseInt(btn.dataset.rot, 10) === rot);
        });
        const customBtn = document.getElementById('con-ctx-rot-custom-btn');
        if (customBtn) {
          customBtn.classList.toggle('active', !isPreset && rot !== 0);
          customBtn.textContent = (!isPreset && rot !== 0) ? `${rot}°` : '⚙';
        }
      }

      window.conNormalizeNodeShape = conNormalizeNodeShape;
      window.conApplyNodeShape = conApplyNodeShape;
      window.conNormalizeNodeRotation = conNormalizeNodeRotation;
      window.conApplyNodeRotation = conApplyNodeRotation;
      window.conSyncRotationButtons = conSyncRotationButtons;

      window.conCtxSetRotation = function (requestedDeg) {
        conPushUndo();
        const deg = conNormalizeNodeRotation(requestedDeg);
        const targets = (conMultiSelected.size > 1)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conCtxNodeId ? [conNodes.find(n => n.id === conCtxNodeId)].filter(Boolean) : []);
        if (!targets.length) return;

        const _prevSuppress = !!window._conSuppressMirrorObserver;
        window._conSuppressMirrorObserver = true;
        try {
          const rotationsToSend = [];
          targets.forEach(node => {
            conApplyNodeRotation(node, deg);
            rotationsToSend.push({ id: String(node.id), rotation: deg });
          });

          if (targets.length === 1) {
            conSyncRotationButtons(targets[0]);
          } else {
            conSyncRotationButtons({ rotation: deg });
          }

          conRedrawEdges();
          if (window.conGroupRefitAll) window.conGroupRefitAll();

          if (typeof window._conMirrorSend === 'function') {
            if (rotationsToSend.length === 1) {
              window._conMirrorSend({ type: 'node-rotate', id: rotationsToSend[0].id, rotation: rotationsToSend[0].rotation });
            } else if (rotationsToSend.length > 1) {
              window._conMirrorSend({ type: 'nodes-rotate', rotations: rotationsToSend });
            }
          }
        } finally {
          if (!_prevSuppress) {
            setTimeout(() => { window._conSuppressMirrorObserver = false; }, 60);
          }
        }
      };

      window.conCtxPromptCustomRotation = function () {
        const target = conCtxNodeId ? conNodes.find(n => n.id === conCtxNodeId) : null;
        const currentRot = target ? (target.rotation || 0) : 0;
        const promptMsg = (window.i18n && typeof window.i18n.t === 'function')
          ? window.i18n.t('conPromptRotateAngle')
          : 'Enter rotation angle in degrees (0–360):';

        const applyVal = function (val) {
          if (val === null || val === undefined || String(val).trim() === '') return;
          const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) {
            window.conCtxSetRotation(num);
          }
        };

        if (typeof window.showPrompt === 'function') {
          window.showPrompt(promptMsg, String(currentRot)).then(applyVal);
        } else {
          const val = window.prompt(promptMsg, String(currentRot));
          applyVal(val);
        }
      };

      window.conRotateSelectedNodes = function (angleStep = 90) {
        const targets = (conMultiSelected.size > 0)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conSelected ? [conNodes.find(n => n.id === conSelected)].filter(Boolean) : []);
        if (!targets.length) return;
        conPushUndo();
        const _prevSuppress = !!window._conSuppressMirrorObserver;
        window._conSuppressMirrorObserver = true;
        try {
          const rotationsToSend = [];
          targets.forEach(node => {
            const curRot = conNormalizeNodeRotation(node.rotation || 0);
            const nextRot = conNormalizeNodeRotation(curRot + angleStep);
            conApplyNodeRotation(node, nextRot);
            rotationsToSend.push({ id: String(node.id), rotation: nextRot });
          });
          if (targets.length === 1) {
            conSyncRotationButtons(targets[0]);
          } else {
            conSyncRotationButtons({ rotation: targets[0].rotation });
          }
          conRedrawEdges();
          if (window.conGroupRefitAll) window.conGroupRefitAll();
          if (typeof window._conMirrorSend === 'function') {
            if (rotationsToSend.length === 1) {
              window._conMirrorSend({ type: 'node-rotate', id: rotationsToSend[0].id, rotation: rotationsToSend[0].rotation });
            } else if (rotationsToSend.length > 1) {
              window._conMirrorSend({ type: 'nodes-rotate', rotations: rotationsToSend });
            }
          }
        } finally {
          if (!_prevSuppress) {
            setTimeout(() => { window._conSuppressMirrorObserver = false; }, 60);
          }
        }
      };

      // ---- Context menu ----
      global.conCtxNodeId = null;
      let _conPagePopupNodeId = null;

      function conCtxOpen(e, id) {
        e.preventDefault();
        e.stopPropagation();
        conCtxNodeId = id;
        window.conCtxNodeId = global.conCtxNodeId = id;
        // If this node is part of multi-selection or already selected, keep selection active
        // Otherwise select normally
        if (!conMultiSelected.has(id) && conSelected !== id && window.conSelected !== id) {
          conSelect(id);
        }
        const node = conNodes.find(n => n.id === id);
        const matched = conGetNodeDbEntries(node);
        const entries = (matched && matched.length)
          ? matched.map(m => m.entry).filter(Boolean)
          : (conGetNodeDbEntry(node) ? [conGetNodeDbEntry(node)] : []);
        const dbWord = entries[0] || null;

        const menu = document.getElementById('con-ctx-menu');
        const label = document.getElementById('con-ctx-word-label');
        const synBtn = document.getElementById('con-ctx-syn-btn');
        const antBtn = document.getElementById('con-ctx-ant-btn');
        const cardBtn = document.getElementById('con-ctx-card-btn');

        label.textContent = node ? (node.baseWord || node.el.dataset.baseWord || node.el.textContent) : 'Word';

        const allSynonyms = Array.from(new Set(entries.flatMap(e => Array.isArray(e.synonyms) ? e.synonyms : (e.synonyms ? [e.synonyms] : [])).filter(Boolean)));
        const allAntonyms = Array.from(new Set(entries.flatMap(e => Array.isArray(e.antonyms) ? e.antonyms : (e.antonyms ? [e.antonyms] : [])).filter(Boolean)));
        const hasSyn = allSynonyms.length > 0;
        const hasAnt = allAntonyms.length > 0;
        const hasDef = entries.some(e => Array.isArray(e.definition) ? e.definition.some(d => String(d || '').trim()) : !!String(e.definition || e.def || '').trim());
        const hasEty = entries.some(e => Array.isArray(e.etymology) ? e.etymology.some(x => String(x || '').trim()) : !!String(e.etymology || '').trim());
        const hasFr = entries.some(e => Array.isArray(e.french) ? e.french.some(f => String(f || '').trim()) : !!String(e.french || e.translation || '').trim());
        const hasIpa = entries.some(e => !!String(e.ipa || '').trim());

        if (synBtn) {
          synBtn.style.display = hasSyn ? '' : 'none';
          if (hasSyn) {
            synBtn.innerHTML = `<img src="../assets/icons/syn.svg" class="btn-icon" alt="" /><span class="con-ctx-icon-label">syn·${allSynonyms.length}</span>`;
          }
        }
        if (antBtn) {
          antBtn.style.display = hasAnt ? '' : 'none';
          if (hasAnt) {
            antBtn.innerHTML = `<img src="../assets/icons/ant.svg" class="btn-icon" alt="" /><span class="con-ctx-icon-label">ant·${allAntonyms.length}</span>`;
          }
        }

        const defBtn = document.getElementById('con-fmt-def');
        if (defBtn) defBtn.style.display = hasDef ? '' : 'none';

        const etyBtn = document.getElementById('con-fmt-ety');
        if (etyBtn) etyBtn.style.display = hasEty ? '' : 'none';

        const transBtn = document.getElementById('con-fmt-trans');
        if (transBtn) transBtn.style.display = hasFr ? '' : 'none';

        const ipaBtn = document.getElementById('con-fmt-ipa');
        if (ipaBtn) ipaBtn.style.display = hasIpa ? '' : 'none';

        const networkBtn = document.getElementById('con-ctx-network-btn');
        const networkWords = new Set();
        entries.forEach(e => {
          ['synonyms', 'antonyms', 'otherForms', 'otherTerms', 'hypernym', 'hyponym'].forEach(k => {
            const arr = Array.isArray(e[k]) ? e[k] : (e[k] ? [e[k]] : []);
            arr.forEach(w => { if (w && typeof w === 'string') networkWords.add(w.trim()); });
          });
        });
        const hasNetwork = entries.length > 0 && networkWords.size > 0;
        if (networkBtn) {
          networkBtn.style.display = hasNetwork ? '' : 'none';
          if (hasNetwork) {
            networkBtn.innerHTML = `NET<span class="con-ctx-icon-label">${networkWords.size}</span>`;
          }
        }

        const relSep = document.getElementById('con-ctx-relations-sep');
        if (relSep) {
          relSep.style.display = (hasSyn || hasAnt || hasDef || hasEty || hasFr || hasIpa || hasNetwork) ? '' : 'none';
        }

        // Show/hide Card button
        if (cardBtn) cardBtn.style.display = entries.length > 0 ? '' : 'none';

        // Check for linked PDF to display Extract PDF Page button
        const extractRow = document.getElementById('con-ctx-extract-pdf-row');
        if (extractRow) {
          let hasPdf = false;
          let pdfUrn = null;
          if (node && typeof LinksService !== 'undefined') {
            const nodeUrn = (typeof conGetActiveNodeUrn === 'function') ? conGetActiveNodeUrn(node) : null;
            if (nodeUrn) {
              const nodeLinks = LinksService.getLinksForSync(nodeUrn);
              const foundPdf = (nodeLinks || []).find(l => {
                const p = LinksService.parseUrn(l.otherUrn);
                return p && p.type === 'file' && (p.id.toLowerCase().endsWith('.pdf') || (l.targetMeta && l.targetMeta.relativePath && l.targetMeta.relativePath.toLowerCase().endsWith('.pdf')));
              });
              if (foundPdf) {
                hasPdf = true;
                pdfUrn = foundPdf.otherUrn;
              }
            }
          }
          extractRow.style.display = hasPdf ? '' : 'none';
          extractRow.dataset.pdfUrn = pdfUrn || '';
        }

        // Media Tools row
        const mediaRow = document.getElementById('con-ctx-media-row');
        const slowBtn = document.getElementById('con-ctx-slow-btn');
        const boostBtn = document.getElementById('con-ctx-boost-btn');
        const transcriptBtn = document.getElementById('con-ctx-transcript-btn');
        const extractAudioBtn = document.getElementById('con-ctx-extract-audio-btn');
        if (mediaRow) {
          const soundAtt = node && (node.soundAttachmentId || (conAttachments || []).find(a => a && (a.id === node.soundAttachmentId || (a.kind === 'sounds' && a.name === (node.baseWord || (node.el && node.el.textContent))))));
          const videoAtt = node && (node.videoAttachmentId || (conAttachments || []).find(a => a && (a.id === node.videoAttachmentId || (a.kind === 'videos' && a.name === (node.baseWord || (node.el && node.el.textContent))))));
          const isSound = !!soundAtt || (node && (node.isSound || node.type === 'sound'));
          const isVideo = !!videoAtt || (node && (node.isVideo || node.type === 'video'));

          if (isSound || isVideo) {
            mediaRow.style.display = '';
            if (slowBtn) slowBtn.style.display = isSound ? '' : 'none';
            if (boostBtn) boostBtn.style.display = isSound ? '' : 'none';
            if (transcriptBtn) transcriptBtn.style.display = isSound ? '' : 'none';
            if (extractAudioBtn) extractAudioBtn.style.display = isVideo ? '' : 'none';
          } else {
            mediaRow.style.display = 'none';
          }
        }

        // Star button: show only when node has a db entry
        const starBtn = document.getElementById('con-ctx-star-btn');
        if (starBtn) {
          if (dbWord) {
            starBtn.style.display = '';
            starBtn.textContent = dbWord.starred ? '★' : '☆';
            starBtn.classList.toggle('active', !!dbWord.starred);
            starBtn.title = dbWord.starred ? 'Unstar' : 'Star in DB';
          } else {
            starBtn.style.display = 'none';
          }
        }

        // Show/hide Remove-from-group button (and its separator)
        const rmGroupBtn = document.getElementById('con-ctx-rmgroup-btn');
        const rmGroupSep = document.getElementById('con-ctx-rmgroup-sep');
        const rmGroupVisible = !!conGroupOfNode(id);
        if (rmGroupBtn) rmGroupBtn.style.display = rmGroupVisible ? '' : 'none';
        if (rmGroupSep) rmGroupSep.style.display = rmGroupVisible ? '' : 'none';

        // Animation state sync
        const nodeAnim = (node && node.anim) ? String(node.anim) : '';
        const ctxBlinkBtn = document.getElementById('con-ctx-blink-btn');
        if (ctxBlinkBtn) ctxBlinkBtn.classList.toggle('active', !!nodeAnim);
        const ctxAnimSel = document.getElementById('con-ctx-anim-select');
        if (ctxAnimSel) conPopulateAnimSelect(ctxAnimSel, nodeAnim);
        const ctxRevealAnimSel = document.getElementById('con-ctx-reveal-anim-select');
        if (ctxRevealAnimSel) conPopulateRevealAnimSelect(ctxRevealAnimSel, (node && node.revealAnim) ? String(node.revealAnim) : '');

        // Base-word row: show when node is a synonym/antonym/related word/other form.
        // Priority 1 — metadata stamped at creation time (conCtxAddRelated).
        // Priority 2 — live reverse-lookup across vocabBank (covers manually-typed words).
        const baseWordRow = document.getElementById('con-ctx-baseword-row');
        const baseWordName = document.getElementById('con-ctx-baseword-name');
        const baseWordTag = document.getElementById('con-ctx-baseword-tag');
        const addBaseBtn = document.getElementById('con-ctx-addbaseword-btn');

        function conFindOriginEntry(text) {
          const lower = stripParens(String(text || '').trim()).toLowerCase();
          if (!lower || typeof vocabBank === 'undefined' || !Array.isArray(vocabBank)) return null;
          // Skip if word is itself a direct DB entry (it IS the base word)
          if (vocabBank.find(e => e && e.word && stripParens(e.word.trim()).toLowerCase() === lower)) return null;
          for (const entry of vocabBank) {
            if (!entry) continue;
            if ((entry.synonyms || []).some(s => stripParens(String(s).trim()).toLowerCase() === lower))
              return { word: entry.word, relation: 'synonyms' };
            if ((entry.antonyms || []).some(a => stripParens(String(a).trim()).toLowerCase() === lower))
              return { word: entry.word, relation: 'antonyms' };
            if ((entry.related || []).some(r => stripParens(String(r).trim()).toLowerCase() === lower))
              return { word: entry.word, relation: 'related' };
            if (Array.isArray(entry.otherForms) && entry.otherForms.some(o => {
              const s = typeof o === 'string' ? o : (o.word || o.form || '');
              return stripParens(String(s).trim()).toLowerCase() === lower;
            })) {
              return { word: entry.word, relation: 'otherForms' };
            }
            if (typeof entry.otherForms === 'string' && entry.otherForms.split(/[,;/]+/).some(s => stripParens(s.trim()).toLowerCase() === lower)) {
              return { word: entry.word, relation: 'otherForms' };
            }
          }
          return null;
        }

        const tagLabels = { synonyms: 'Synonym', antonyms: 'Antonym', related: 'Related', otherForms: 'Other Form', etymology: 'Etymology', ipa: 'IPA', translation: 'Translation' };
        const tagClasses = { synonyms: 'syn', antonyms: 'ant', related: 'rel', otherForms: 'form', etymology: 'ety', ipa: 'ipa', translation: 'trans' };

        // Resolve origin: stamped metadata takes precedence, then live lookup
        let originWord = node && node.sourceWord ? node.sourceWord : null;
        let originRelation = node && node.relation ? node.relation : null;
        if (!originWord && node) {
          const nodeText = node.baseWord || node.el.textContent.trim();
          const found = conFindOriginEntry(nodeText);
          if (found) { originWord = found.word; originRelation = found.relation; }
        }

        if (originWord && originRelation) {
          baseWordRow.classList.add('visible');
          baseWordName.textContent = originWord;
          baseWordTag.textContent = tagLabels[originRelation] || originRelation;
          baseWordTag.className = 'con-ctx-baseword-tag ' + (tagClasses[originRelation] || 'rel');
          // Stamp onto node so it's cached for future opens
          if (node && !node.sourceWord) { node.sourceWord = originWord; node.relation = originRelation; }
          // "Add base word" only if not already on the board
          const alreadyOnBoard = conNodes.some(n =>
            (n.baseWord || n.el.textContent.trim()).toLowerCase() === originWord.toLowerCase()
          );
          addBaseBtn.style.display = alreadyOnBoard ? 'none' : '';
        } else {
          baseWordRow.classList.remove('visible');
          addBaseBtn.style.display = 'none';
        }

        // Multi-select row
        const multiRow = document.getElementById('con-ctx-multi-edit-row');
        const multiCount = document.getElementById('con-ctx-multi-count');
        conCtxCloseArrangeMenus();
        if (typeof window.conCloseAxisPicker === 'function') window.conCloseAxisPicker();
        // Count all selected types
        const shapeSelCount = typeof window.conGetShapeSelected === 'function' ? window.conGetShapeSelected().size : (typeof _conShapeSelected !== 'undefined' && _conShapeSelected ? _conShapeSelected.size : 0);
        const mediaSelCount = typeof window.conGetMediaSelected === 'function' ? window.conGetMediaSelected().size : (typeof conMediaSelected !== 'undefined' && conMediaSelected ? conMediaSelected.size : 0);
        const totalMultiCount = conMultiSelected.size + conNoteSelected.size + conDrawingSelected.size + shapeSelCount + mediaSelCount;
        const isMultiCtx = totalMultiCount > 1 || conMultiSelected.size > 1 || (conMultiSelected.size >= 1 && (conNoteSelected.size > 0 || conDrawingSelected.size > 0 || shapeSelCount > 0 || mediaSelCount > 0)) || (mediaSelCount >= 1 && (conMultiSelected.size > 0 || conNoteSelected.size > 0 || conDrawingSelected.size > 0 || shapeSelCount > 0));
        menu.classList.toggle('is-multi', isMultiCtx);
        if (isMultiCtx) {
          multiRow.style.display = '';
          if (multiCount) multiCount.textContent = totalMultiCount;
        } else {
          multiRow.style.display = 'none';
        }

        // Sync swatches to node's current colour
        const rawNodeBg = (node && node.el ? (node.el.style.background || node.el.style.backgroundColor || '#ffffff') : '#ffffff').trim();
        const matchIdx = CON_PALETTES.findIndex(([bg]) => {
          if (!bg) return false;
          if (bg.trim().toLowerCase() === rawNodeBg.toLowerCase()) return true;
          if (typeof rgbToHex === 'function' && rgbToHex(bg).toLowerCase() === rgbToHex(rawNodeBg).toLowerCase()) return true;
          return false;
        });
        conActivePalette = matchIdx >= 0 ? matchIdx : 0;
        document.querySelectorAll('#con-ctx-swatches .con-swatch').forEach((s, j) => {
          s.classList.toggle('active', j === conActivePalette);
        });

        // Sync size slider
        const sizeSlider = document.getElementById('con-ctx-font-size');
        if (sizeSlider && node) {
          _conSetupFontSizeSlider(sizeSlider, window.conFontUnit);
          const pxVal = conGetNodeBaseFontSize(node) || 16;
          const uVal = conPxToFontUnit(pxVal, window.conFontUnit);
          sizeSlider.value = String(uVal);
          const sizeDisplay = document.getElementById('con-ctx-font-size-display');
          if (sizeDisplay) sizeDisplay.textContent = uVal + ' ' + window.conFontUnit;
        }
        _conSyncUnitToggleButtons();

        // Sync max-width slider
        const mwSlider = document.getElementById('con-ctx-max-width');
        const mwDisplay = document.getElementById('con-ctx-max-width-display');
        const mwRow = document.getElementById('con-ctx-maxwidth-row');
        if (mwSlider && node) {
          const _shape = conNormalizeNodeShape(node.shape);
          const _isFixedSize = _shape === 'circle' || _shape === 'square';
          if (mwRow) { mwRow.style.opacity = _isFixedSize ? '0.35' : ''; mwRow.style.pointerEvents = _isFixedSize ? 'none' : ''; }
          const _mwVal = (node.fmt && typeof node.fmt.maxWidth === 'number' && node.fmt.maxWidth > 0) ? node.fmt.maxWidth : 0;
          mwSlider.value = _mwVal;
          if (mwDisplay) mwDisplay.textContent = _mwVal > 0 ? _mwVal + 'px' : '\u2014';
        }

        // Sync format buttons
        if (node) {
          conSyncFmtButtons(node);
          conSyncShapeButtons(node);
          conSyncRotationButtons(node);
          conSyncBorderControls(node);
        }
        _conSyncPresetButtons();
        const maskBtn = document.getElementById('con-ctx-mask-btn');
        if (maskBtn) {
          const isMasked = !!(node && node.masked);
          maskBtn.innerHTML = '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" />';
          maskBtn.classList.toggle('active', isMasked);
          maskBtn.title = isMasked ? 'Reveal word' : 'Mask word';
        }

        const lockBtn = document.getElementById('con-ctx-lock-btn');
        if (lockBtn) {
          const isLocked = !!(node && node.locked);
          lockBtn.innerHTML = isLocked ? '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" />' : '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" />';
          lockBtn.classList.toggle('active', isLocked);
          lockBtn.title = isLocked ? 'Unlock node position and size' : 'Lock node position and size';
        }

        // Position near cursor, keep wholly inside viewport
        menu.classList.add('visible');
        const margin = 8;
        const isMultiMenu = menu.classList.contains('is-multi');
        const maxAvailH = Math.max(160, window.innerHeight - 2 * margin);
        const maxAvailW = Math.min(isMultiMenu ? 660 : 340, Math.max(200, window.innerWidth - 2 * margin));
        menu.style.maxHeight = maxAvailH + 'px';
        menu.style.maxWidth = maxAvailW + 'px';
        menu.style.width = Math.min(isMultiMenu ? 620 : 320, maxAvailW) + 'px';
        menu.style.overflowY = 'auto';
        menu.style.overflowX = 'hidden';

        const mw = menu.offsetWidth || 230, mh = menu.offsetHeight || 220;
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

      window.conCtxApplyStyle = function () {
        const [bg, text, border] = CON_PALETTES[conActivePalette];
        // Apply to multi-selected set if there are multiple; otherwise just the ctx node
        const targets = (conMultiSelected.size > 1)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conCtxNodeId ? [conNodes.find(n => n.id === conCtxNodeId)].filter(Boolean) : []);
        targets.forEach(node => {
          node.el.style.background = bg;
          node.el.style.color = text;
          node.el.style.borderColor = border;
          // Swatch applies a plain palette — clear preset-specific overrides
          node.borderWidth = null;
          node.borderStyle = null;
          node.highlight = null;
          node.preset = null;
          conApplyNodeShape(node, node.shape);
        });
        conRedrawEdges();
        _conSyncPresetButtons();
        // Sync border color display to the palette border
        const mainNode = conCtxNodeId ? conNodes.find(n => n.id === conCtxNodeId) : null;
        if (mainNode) conSyncBorderControls(mainNode);
      };

      window.conCtxApplySize = function () {
        if (!_conApplySizeUndoPushed) { conPushUndo(); _conApplySizeUndoPushed = true; }
        const rawVal = document.getElementById('con-ctx-font-size') ? parseFloat(document.getElementById('con-ctx-font-size').value) : 12;
        const numFontSize = conFontUnitToPx(rawVal, window.conFontUnit);
        const fontSize = numFontSize + 'px';
        const display = document.getElementById('con-ctx-font-size-display');
        if (display) display.textContent = rawVal + ' ' + window.conFontUnit;
        // Apply to multi-selected set if there are multiple; otherwise just the ctx node
        const targets = (conMultiSelected.size > 1)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conCtxNodeId ? [conNodes.find(n => n.id === conCtxNodeId)].filter(Boolean) : []);
        const _sizeAffectedPhraseGroups = new Set();
        const resizedNodes = [];
        window._conSuppressMirrorObserver = true;
        try {
          targets.forEach(node => {
            if (conIsNodeLocked(node)) return;
            node._cachedW = undefined;
            node._cachedH = undefined;
            node.w = undefined;
            node.h = undefined;
            conSetNodeBaseFontSize(node, fontSize);
            conApplyNodeShape(node, node.shape);
            resizedNodes.push({ id: String(node.id), fontSize: numFontSize, shape: node.shape });
            const _pg = conGroupOfNode(node.id);
            if (_pg && _pg.phraseGroup) _sizeAffectedPhraseGroups.add(_pg);
          });
          conRedrawEdges();
          if (_sizeAffectedPhraseGroups.size > 0 && typeof conPhraseGroupLayout === 'function') {
            // Re-layout phrase groups in-place — don't spread
            requestAnimationFrame(() => {
              _sizeAffectedPhraseGroups.forEach(pg => conPhraseGroupLayout(pg));
            });
          }
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

      let _conApplyMaxWidthUndoPushed = false;
      window.conCtxApplyMaxWidth = function (rawVal) {
        if (!_conApplyMaxWidthUndoPushed) { conPushUndo(); _conApplyMaxWidthUndoPushed = true; }
        const mw = parseInt(rawVal, 10);
        const targets = (conMultiSelected.size > 1)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conCtxNodeId ? [conNodes.find(n => n.id === conCtxNodeId)].filter(Boolean) : []);
        const resizedNodes = [];
        const _prevSuppress = !!window._conSuppressMirrorObserver;
        window._conSuppressMirrorObserver = true;
        try {
          targets.forEach(node => {
            if (conIsNodeLocked(node)) return;
            node._cachedW = undefined;
            node._cachedH = undefined;
            node.w = undefined;
            node.h = undefined;
            const fmt = conGetNodeFmt(node);
            fmt.maxWidth = (mw > 0) ? mw : null;
            conApplyNodeShape(node, node.shape);
            conRenderNodeLabel(node);
            resizedNodes.push({ id: String(node.id), maxWidth: fmt.maxWidth, shape: node.shape });
          });
          conRedrawEdges();
          if (window.conGroupRefitAll) window.conGroupRefitAll();
          if (window.conMarkBoardDirty) window.conMarkBoardDirty();
          if (resizedNodes.length && window._conMirrorSend) {
            if (resizedNodes.length === 1) {
              window._conMirrorSend({
                type: 'node-resize',
                id: resizedNodes[0].id,
                maxWidth: resizedNodes[0].maxWidth,
                shape: resizedNodes[0].shape
              });
            } else {
              window._conMirrorSend({ type: 'nodes-resize', nodes: resizedNodes });
            }
          }
        } finally {
          if (!_prevSuppress) {
            setTimeout(() => { window._conSuppressMirrorObserver = false; }, 60);
          }
        }
      };
      document.addEventListener('mouseup', () => { _conApplyMaxWidthUndoPushed = false; });

      window.conCtxSetShape = function (shape) {
        conPushUndo();
        const normalized = conNormalizeNodeShape(shape);
        const targets = (conMultiSelected.size > 1)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conCtxNodeId ? [conNodes.find(n => n.id === conCtxNodeId)].filter(Boolean) : []);
        const resizedNodes = [];
        const _prevSuppress = !!window._conSuppressMirrorObserver;
        window._conSuppressMirrorObserver = true;
        try {
          targets.forEach(node => {
            node.shape = normalized;
            conApplyNodeShape(node, normalized);
            resizedNodes.push({ id: String(node.id), shape: normalized });
          });
          if (targets.length === 1) conSyncShapeButtons(targets[0]);
          conRedrawEdges();
          if (window.conGroupRefitAll) window.conGroupRefitAll();
          if (resizedNodes.length && window._conMirrorSend) {
            if (resizedNodes.length === 1) {
              window._conMirrorSend({ type: 'node-resize', id: resizedNodes[0].id, shape: resizedNodes[0].shape });
            } else {
              window._conMirrorSend({ type: 'nodes-resize', nodes: resizedNodes });
            }
          }
        } finally {
          if (!_prevSuppress) {
            setTimeout(() => { window._conSuppressMirrorObserver = false; }, 60);
          }
        }
      };

      let _conApplyBorderWidthUndoPushed = false;
      window.conCtxApplyBorderWidth = function () {
        if (!_conApplyBorderWidthUndoPushed) { conPushUndo(); _conApplyBorderWidthUndoPushed = true; }
        const val = parseInt(document.getElementById('con-ctx-border-width').value) || 0;
        const targets = (conMultiSelected.size > 1)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conCtxNodeId ? [conNodes.find(n => n.id === conCtxNodeId)].filter(Boolean) : []);
        targets.forEach(node => {
          node.borderWidth = val > 0 ? val : null;
          node.el.style.borderWidth = val > 0 ? val + 'px' : '';
          conApplyNodeShape(node, node.shape);
        });
        conRedrawEdges();
      };
      document.addEventListener('mouseup', () => { _conApplyBorderWidthUndoPushed = false; });

      window.conCtxApplyBorderStyle = function (style) {
        conPushUndo();
        const targets = (conMultiSelected.size > 1)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conCtxNodeId ? [conNodes.find(n => n.id === conCtxNodeId)].filter(Boolean) : []);
        targets.forEach(node => {
          node.borderStyle = style;
          node.el.style.borderStyle = style;
          conApplyNodeShape(node, node.shape);
        });
        document.querySelectorAll('#con-ctx-menu [data-bstyle]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.bstyle === style);
        });
        conRedrawEdges();
      };

      window.conCtxApplyBorderColor = function (color) {
        conPushUndo();
        const targets = (conMultiSelected.size > 1)
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conCtxNodeId ? [conNodes.find(n => n.id === conCtxNodeId)].filter(Boolean) : []);
        targets.forEach(node => {
          node.el.style.borderColor = color;
          conApplyNodeShape(node, node.shape);
        });
        conRedrawEdges();
      };

      function conSyncBorderControls(node) {
        const bwSlider = document.getElementById('con-ctx-border-width');
        const bwDisplay = document.getElementById('con-ctx-border-width-display');
        const bcPicker = document.getElementById('con-ctx-border-color');
        const bcText = document.getElementById('con-ctx-border-color-text');
        if (!bwSlider) return;
        const bw = node && node.borderWidth ? node.borderWidth : 1;
        bwSlider.value = bw;
        if (bwDisplay) bwDisplay.textContent = bw;
        const rawColor = node && node.el ? (node.el.style.borderColor || '#111111') : '#111111';
        const hexColor = (typeof rgbToHex === 'function') ? rgbToHex(rawColor) : rawColor;
        if (bcPicker) bcPicker.value = hexColor;
        if (bcText) bcText.value = hexColor.toUpperCase();
        const bs = node && node.borderStyle ? node.borderStyle : '';
        document.querySelectorAll('#con-ctx-menu [data-bstyle]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.bstyle === bs);
        });
      }

      window.conCtxViewCard = function () {
        conViewSelectedCard();
        conCtxClose();
      };

      window.conCtxOpenDictionary = function (targetNodeId) {
        const id = targetNodeId || conCtxNodeId || (window.conGetSelected && window.conGetSelected()) || window.conSelected;
        const node = (window.conNodes || []).find(n => n && (n.id === id || String(n.id) === String(id)));
        let word = '';
        if (node) {
          word = node.baseWord || (node.el && (node.el.dataset.baseWord || ''));
          if (!word && node.el) {
            const mainEl = node.el.querySelector('.con-node-text, .con-node-main, .con-node-label');
            word = mainEl ? mainEl.textContent : node.el.textContent;
          }
          if (!word && node.text) word = node.text;
        }
        word = String(word || '').trim();
        if (typeof window.stripParens === 'function') {
          word = window.stripParens(word);
        }
        word = word.replace(/^[«"'({\[\s\.,;:!?\/]+|[»"')}\]\s\.,;:!?\/]+$/g, '').trim();
        if (typeof conCtxClose === 'function') conCtxClose();
        if (word && typeof window.boardOpenDictionary === 'function') {
          window.boardOpenDictionary(word);
        } else if (word) {
          window.open(`dictionary.html?q=${encodeURIComponent(word)}`, 'cmt-quick-dictionary');
        }
      };

      window.conNodeCardOpenDictionary = function () {
        const wordEl = document.getElementById('con-ncp-word');
        let word = wordEl ? (wordEl.textContent || '') : '';
        word = String(word || '').trim();
        if (typeof window.stripParens === 'function') {
          word = window.stripParens(word);
        }
        word = word.replace(/^[«"'({\[\s\.,;:!?\/]+|[»"')}\]\s\.,;:!?\/]+$/g, '').trim();
        if (word && typeof window.boardOpenDictionary === 'function') {
          window.boardOpenDictionary(word);
        } else if (word) {
          window.open(`dictionary.html?q=${encodeURIComponent(word)}`, 'cmt-quick-dictionary');
        }
      };

      window.conCtxAddToDb = function () {
        conAddSelectedToDb();
        conCtxClose();
      };

      window.conCtxSetPage = function (targetNodeId) {
        const targetId = targetNodeId || (typeof conCtxNodeId !== 'undefined' && conCtxNodeId) || (window.conGetSelected && window.conGetSelected()) || window.conSelected || (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size === 1 ? Array.from(conMultiSelected)[0] : null);
        const node = conNodes.find(n => n.id === targetId);
        if (!node) return;
        if (typeof conCtxClose === 'function') conCtxClose();
        _conPagePopupNodeId = node.id;
        const popup = document.getElementById('con-page-popup');
        if (!popup) return;
        const inp = document.getElementById('con-page-popup-input');
        if (!inp) return;
        const linkedAct = node.actNodeId ? conNodes.find(n => n.id === node.actNodeId) : null;
        inp.value = linkedAct
          ? (linkedAct.baseWord || '')
          : (node.pageNum != null ? String(node.pageNum) : '');
        const rect = node.el.getBoundingClientRect();
        popup.style.left = Math.max(10, Math.min(rect.right + 6, window.innerWidth - 175)) + 'px';
        popup.style.top = Math.max(10, Math.min(rect.top, window.innerHeight - 80)) + 'px';
        popup.classList.add('visible');
        inp.focus();
        inp.select();
        inp.onkeydown = function (e) {
          if (e.key === 'Enter') conPagePopupCommit();
          if (e.key === 'Escape') conPagePopupCancel();
          e.stopPropagation();
        };
      };

      window.conPagePopupCommit = function () {
        const node = conNodes.find(n => n.id === _conPagePopupNodeId);
        const inp = document.getElementById('con-page-popup-input');
        document.getElementById('con-page-popup').classList.remove('visible');
        if (!node) return;
        conPushUndo();
        const trimmed = inp.value.trim();
        const linkedAct = node.actNodeId ? conNodes.find(n => n.id === node.actNodeId) : null;
        if (trimmed === '') {
          if (linkedAct && typeof conRemoveNode === 'function') {
            conRemoveNode(linkedAct.id);
          }
          node.actNodeId = null;
          node.pageNum = null;
          conRenderNodeLabel(node);
          conRedrawEdges();
          return;
        }
        // Clear legacy page badge if converting/adding as Node Act
        if (node.pageNum != null) {
          node.pageNum = null;
          conRenderNodeLabel(node);
        }
        if (linkedAct) {
          const dbMatch = conFindDbEntry(trimmed);
          linkedAct.baseWord = trimmed;
          linkedAct.dbWord = dbMatch ? dbMatch.word : null;
          conRenderNodeLabel(linkedAct);
          conRedrawEdges();
        } else if (typeof window.conCreateNodeActForNode === 'function') {
          window.conCreateNodeActForNode(node.id, trimmed);
        } else {
          node.pageNum = trimmed;
          conRenderNodeLabel(node);
          conRedrawEdges();
        }
      };

      window.conPagePopupRemove = function () {
        const node = conNodes.find(n => n.id === _conPagePopupNodeId);
        document.getElementById('con-page-popup').classList.remove('visible');
        if (!node) return;
        conPushUndo();
        const linkedAct = node.actNodeId ? conNodes.find(n => n.id === node.actNodeId) : null;
        if (linkedAct && typeof conRemoveNode === 'function') {
          conRemoveNode(linkedAct.id);
        }
        node.actNodeId = null;
        node.pageNum = null;
        conRenderNodeLabel(node);
        conRedrawEdges();
      };

      // ── Media Converter Integration Handlers ──────────────────────────────
      window.conCtxGetActiveNodeMediaAttachment = function () {
        const node = conCtxNodeId ? conNodes.find(n => n.id === conCtxNodeId) : null;
        if (!node) return null;
        const attId = node.soundAttachmentId || node.videoAttachmentId || null;
        if (attId) {
          const found = (conAttachments || []).find(a => a && a.id === attId);
          if (found) return found;
        }
        const text = (node.baseWord || (node.el && node.el.textContent) || '').trim();
        if (text) {
          const foundName = (conAttachments || []).find(a => a && a.name && (a.name === text || a.name.startsWith(text)));
          if (foundName) return foundName;
        }
        return null;
      };

      window.conCtxTranscribeSound = async function () {
        const node = conNodes.find(n => n.id === conCtxNodeId);
        const att = conCtxGetActiveNodeMediaAttachment();
        if (!att) {
          if (typeof mdbToast === 'function') mdbToast(typeof t === 'function' ? t('conMediaNoAudio', 'No audio attachment found on this node.') : 'No audio attachment found on this node.', true);
          return;
        }
        if (!window.SpeechTranscriber || typeof window.SpeechTranscriber.transcribeAudio !== 'function') {
          if (typeof mdbToast === 'function') mdbToast(typeof t === 'function' ? t('conMediaTranscriptError', 'Transcription unavailable.') : 'Transcription unavailable.', true);
          return;
        }

        if (typeof conCloseCtxMenu === 'function') conCloseCtxMenu();
        if (typeof mdbToast === 'function') mdbToast(typeof t === 'function' ? t('conMediaTranscribing', 'Transcribing audio...') : 'Transcribing audio...', false);

        try {
          let source = att.file || att._cachedObjectUrl || null;
          if (!source && typeof window.conGetAttachmentDataUrlPublic === 'function') {
            source = await window.conGetAttachmentDataUrlPublic(att);
          }
          if (!source) throw new Error('Could not load source audio.');

          const res = await window.SpeechTranscriber.transcribeAudio(source);
          const transcriptText = (res && res.text ? String(res.text) : '').trim();
          if (!transcriptText) {
            if (typeof mdbToast === 'function') mdbToast(typeof t === 'function' ? t('conMediaTranscriptEmpty', 'No speech detected in audio.') : 'No speech detected in audio.', false);
            return;
          }

          if (typeof window.conAddNoteObject === 'function') {
            if (typeof window.conPushUndo === 'function') window.conPushUndo();
            const noteX = Math.max(30, ((node && node.x) || 200) + 150);
            const noteY = Math.max(30, ((node && node.y) || 200) - 20);
            const noteObj = window.conAddNoteObject({
              nodeId: node ? node.id : null,
              text: transcriptText,
              x: noteX,
              y: noteY,
              bg: '#fef9c3',
              color: '#1e1e1e',
              fontSize: 14,
              width: 300,
              height: 120
            });
            if (noteObj && node && String(node.id) !== String(noteObj.id) && typeof window.conAddEdge === 'function') {
              window.conAddEdge(node.id, noteObj.id, 'forward', '#6abf8e');
            }
          }
          if (typeof mdbToast === 'function') mdbToast(typeof t === 'function' ? t('conMediaTranscriptSuccess', 'Audio transcribed to note.') : 'Audio transcribed to note.', false);
        } catch (err) {
          console.error('[Board] Sound transcription error:', err);
          if (typeof mdbToast === 'function') mdbToast((typeof t === 'function' ? t('conMediaTranscriptError', 'Transcription error: ') : 'Transcription error: ') + (err && err.message ? err.message : ''), true);
        }
      };

      window.conCtxSlowDownSound = async function (speedRatio) {
        speedRatio = speedRatio || 0.85;
        const att = conCtxGetActiveNodeMediaAttachment();
        if (!att) {
          if (typeof mdbToast === 'function') mdbToast(typeof t === 'function' ? t('conMediaNoAudio', 'No audio attachment found on this node.') : 'No audio attachment found on this node.', true);
          return;
        }
        if (typeof mdbToast === 'function') mdbToast(typeof t === 'function' ? t('conMediaConverting', 'Processing media conversion...') : 'Processing conversion...', false);

        try {
          const fileOrBlob = att.file || (att._cachedObjectUrl ? await (await fetch(att._cachedObjectUrl)).blob() : null);
          if (!fileOrBlob) throw new Error('Could not load source audio.');

          if (window.MediaConverterService && typeof window.MediaConverterService.slowDownForListening === 'function') {
            const res = await window.MediaConverterService.slowDownForListening(fileOrBlob, speedRatio);
            if (res && res.blob) {
              _conAttachmentCounter += 1;
              const newName = att.name.replace(/\.[^/.]+$/, '') + '-slow-' + Math.round(speedRatio * 100) + 'pct.mp3';
              const newAtt = {
                id: 'att_' + _conAttachmentCounter,
                name: newName,
                mime: 'audio/mp3',
                kind: 'sounds',
                size: res.blob.size,
                file: res.blob,
                relativePath: ''
              };
              conAttachments.push(newAtt);
              const node = conNodes.find(n => n.id === conCtxNodeId);
              if (node) {
                node.soundAttachmentId = newAtt.id;
              }
              if (typeof conRenderAttachmentSummary === 'function') conRenderAttachmentSummary();
              if (typeof mdbToast === 'function') mdbToast((typeof t === 'function' ? t('conMediaConvertSuccess', 'Media converted successfully') : 'Converted') + ': ' + newName, false);
            }
          }
        } catch (err) {
          console.error('[Board] Slow down error:', err);
          if (typeof mdbToast === 'function') mdbToast((typeof t === 'function' ? t('conMediaConvertError', 'Conversion error: ') : 'Conversion error: ') + (err.message || ''), true);
        }
      };

      window.conCtxNormalizeVoice = async function () {
        const att = conCtxGetActiveNodeMediaAttachment();
        if (!att) {
          if (typeof mdbToast === 'function') mdbToast(typeof t === 'function' ? t('conMediaNoAudio', 'No audio attachment found on this node.') : 'No audio attachment found on this node.', true);
          return;
        }
        if (typeof mdbToast === 'function') mdbToast(typeof t === 'function' ? t('conMediaConverting', 'Processing media conversion...') : 'Processing conversion...', false);

        try {
          const fileOrBlob = att.file || (att._cachedObjectUrl ? await (await fetch(att._cachedObjectUrl)).blob() : null);
          if (!fileOrBlob) throw new Error('Could not load source audio.');

          if (window.MediaConverterService && typeof window.MediaConverterService.normalizeVoice === 'function') {
            const res = await window.MediaConverterService.normalizeVoice(fileOrBlob);
            if (res && res.blob) {
              _conAttachmentCounter += 1;
              const newName = att.name.replace(/\.[^/.]+$/, '') + '-boosted.mp3';
              const newAtt = {
                id: 'att_' + _conAttachmentCounter,
                name: newName,
                mime: 'audio/mp3',
                kind: 'sounds',
                size: res.blob.size,
                file: res.blob,
                relativePath: ''
              };
              conAttachments.push(newAtt);
              const node = conNodes.find(n => n.id === conCtxNodeId);
              if (node) {
                node.soundAttachmentId = newAtt.id;
              }
              if (typeof conRenderAttachmentSummary === 'function') conRenderAttachmentSummary();
              if (typeof mdbToast === 'function') mdbToast((typeof t === 'function' ? t('conMediaConvertSuccess', 'Media converted successfully') : 'Converted') + ': ' + newName, false);
            }
          }
        } catch (err) {
          console.error('[Board] Voice normalize error:', err);
          if (typeof mdbToast === 'function') mdbToast((typeof t === 'function' ? t('conMediaConvertError', 'Conversion error: ') : 'Conversion error: ') + (err.message || ''), true);
        }
      };

      window.conCtxExtractAudioToSoundNode = async function () {
        const att = conCtxGetActiveNodeMediaAttachment();
        const node = conNodes.find(n => n.id === conCtxNodeId);
        if (!att) {
          if (typeof mdbToast === 'function') mdbToast(typeof t === 'function' ? t('conMediaNoVideo', 'No video attachment found on this node.') : 'No video attachment found on this node.', true);
          return;
        }
        if (typeof mdbToast === 'function') mdbToast(typeof t === 'function' ? t('conMediaConverting', 'Processing media conversion...') : 'Processing conversion...', false);

        try {
          const fileOrBlob = att.file || (att._cachedObjectUrl ? await (await fetch(att._cachedObjectUrl)).blob() : null);
          if (!fileOrBlob) throw new Error('Could not load source video.');

          if (window.MediaConverterService && typeof window.MediaConverterService.extractAudio === 'function') {
            const res = await window.MediaConverterService.extractAudio(fileOrBlob, 'mp3');
            if (res && res.blob) {
              _conAttachmentCounter += 1;
              const newName = att.name.replace(/\.[^/.]+$/, '') + '-audio.mp3';
              const newAttId = 'att_' + _conAttachmentCounter;
              const newAtt = {
                id: newAttId,
                name: newName,
                mime: 'audio/mp3',
                kind: 'sounds',
                size: res.blob.size,
                file: res.blob,
                relativePath: ''
              };
              conAttachments.push(newAtt);
              if (typeof conRenderAttachmentSummary === 'function') conRenderAttachmentSummary();

              // Spawn companion sound node next to the video node
              if (node && typeof window.conInsertAttachmentById === 'function') {
                await window.conInsertAttachmentById(newAttId, {
                  x: (node.x || 100) + 120,
                  y: (node.y || 100) + 40,
                  silent: false
                });
              }
              if (typeof mdbToast === 'function') mdbToast((typeof t === 'function' ? t('conMediaConvertSuccess', 'Media converted successfully') : 'Converted') + ': ' + newName, false);
            }
          }
        } catch (err) {
          console.error('[Board] Audio extract error:', err);
          if (typeof mdbToast === 'function') mdbToast((typeof t === 'function' ? t('conMediaExtractError', 'Extraction error: ') : 'Extraction error: ') + (err.message || ''), true);
        }
      };

      window.conCtxOpenInMediaConverter = async function () {
        const att = conCtxGetActiveNodeMediaAttachment();
        const path = (typeof window.conResolveAttachmentDiskPath === 'function')
          ? await window.conResolveAttachmentDiskPath(att)
          : (att ? (att.path || (att.file && att.file.path) || att.relativePath || att.name || '') : '');
        if (window.MediaConverterService && typeof window.MediaConverterService.openMediaConverter === 'function') {
          window.MediaConverterService.openMediaConverter(path);
        }
      };

      window.conPagePopupCancel = function () {
        document.getElementById('con-page-popup').classList.remove('visible');
      };

      window.conCtxEditWord = function () {
        const node = conNodes.find(n => n.id === conCtxNodeId);
        conCtxClose();
        if (!node) return;

        const el = node.el;
        const currentText = node.baseWord || el.textContent.trim();

        // Capture actual rendered width before clearing innerHTML
        const actualWidth = Math.max(el.offsetWidth, Math.ceil(el.getBoundingClientRect().width || 0));
        const prevStyleWidth = el.style.width;
        const prevStyleMinWidth = el.style.minWidth;

        // Replace node content with an input
        const _savedResizer = el.querySelector('.con-node-resizer');
        const _savedEmojiDot = el.querySelector('.con-emoji-dot');
        const _savedPresetBtn = el.querySelector('.con-node-preset-btn');
        const _savedStarBtn = el.querySelector('.con-node-star-btn');
        el.innerHTML = '';
        if (actualWidth > 0) {
          el.style.width = actualWidth + 'px';
          el.style.minWidth = actualWidth + 'px';
        }
        const inp = document.createElement('input');
        inp.value = currentText + (node.pageNum != null ? ' ((' + node.pageNum + '))' : '');
        inp.style.cssText = 'width:100%;box-sizing:border-box;border:none;outline:none;background:transparent;font:inherit;color:inherit;text-align:center;padding:0;min-width:0;';
        el.appendChild(inp);
        if (_savedResizer) el.appendChild(_savedResizer);
        if (_savedEmojiDot) el.appendChild(_savedEmojiDot);
        if (_savedPresetBtn) el.appendChild(_savedPresetBtn);
        if (_savedStarBtn) el.appendChild(_savedStarBtn);
        inp.focus();
        inp.select();
        inp.addEventListener('mousedown', e => e.stopPropagation());

        let committed = false;
        async function commit() {
          if (committed) return;
          committed = true;
          inp.removeEventListener('blur', commit);
          const rawText = inp.value.trim() || currentText;
          el.style.minWidth = prevStyleMinWidth;
          el.style.width = prevStyleWidth;

          // Check if edited to timer syntax
          const parsedTimer = conParseTimerSyntax(rawText);
          if (parsedTimer) {
            const choice = await conPromptTimerConversion(parsedTimer);
            if (!choice) {
              conRenderNodeLabel(node);
              conRedrawEdges();
              return;
            }
            if (choice === 'timer') {
              conPushUndo();
              node.isTimer = true;
              node.durationSec = parsedTimer.totalSec;
              node.remainingSec = parsedTimer.totalSec;
              node.timerState = 'idle';
              node.timerTarget = null;
              node.baseWord = conFormatDurationSec(parsedTimer.totalSec);
              conRenderNodeLabel(node);
              conRedrawEdges();
              return;
            }
          } else if (node.isTimer) {
            node.isTimer = false;
            node.timerState = 'idle';
            node.timerTarget = null;
          }

          const entries = rawText.split(',,').map(w => w.trim()).filter(Boolean);

          function parseEntry(entryRaw, fallbackText) {
            const actMatch = String(entryRaw || '').match(/\(\(([^)]+)\)\)/);
            const act = actMatch ? actMatch[1].trim() : undefined;
            const text = String(entryRaw || '').replace(/\s*\(\([^)]+\)\)\s*/, '').trim() || fallbackText;
            return { text, act };
          }

          const first = parseEntry(entries[0] || rawText, currentText);
          const newText = first.text;
          const newAct = first.act;

          if (entries.length <= 1 && newText === currentText && newAct === undefined) { // no change, just re-render
            conRenderNodeLabel(node);
            conRedrawEdges();
            return;
          }
          conPushUndo();
          // Underscore-separated text → convert to phrase group
          if (newText.includes('_') && !newText.startsWith('_') && !newText.endsWith('_')) {
            const phraseWords = newText.split('_').map(w => w.trim()).filter(Boolean);
            if (phraseWords.length >= 2) {
              // Re-use this node as the first phrase word (preserves all edges/styling)
              const firstWord = phraseWords[0];
              const firstDb = conFindDbEntry(firstWord);
              node.baseWord = firstWord;
              node.dbWord = firstDb ? firstDb.word : null;
              node.phraseOrder = 0;
              el.className = 'con-node' + (firstDb ? ' con-node-matched' : '');
              if (newAct !== undefined) node.pageNum = null;
              conRenderNodeLabel(node);
              // Create additional nodes for remaining phrase words
              const phraseIds = [node.id];
              for (let i = 1; i < phraseWords.length; i++) {
                const nid = conAddWordAt(phraseWords[i], node.x + i * 2, node.y + i);
                const nn = conNodes.find(n => n.id === nid);
                if (nn) nn.phraseOrder = i;
                if (nid) phraseIds.push(nid);
              }
              const group = conGroupCreate(phraseIds, node.x, node.y, [], [], [], { phraseGroup: true });
              if (group) requestAnimationFrame(() => conPhraseGroupLayout(group));
              if (newAct && typeof window.conCreateNodeActForNode === 'function') {
                window.conCreateNodeActForNode(phraseIds[phraseIds.length - 1], newAct);
              }
              conRedrawEdges();
              return;
            }
          }
          const dbMatch = conFindDbEntry(newText);
          node.baseWord = newText;
          node.dbWord = dbMatch ? dbMatch.word : null;
          if (newAct !== undefined) node.pageNum = null;
          el.className = 'con-node' + (dbMatch ? ' con-node-matched' : '');
          conRenderNodeLabel(node);
          conAddNodeStarBtn(node);
          if (newAct) {
            const existingAct = node.actNodeId ? conNodes.find(n => n.id === node.actNodeId) : null;
            if (existingAct) {
              const actDb = conFindDbEntry(newAct);
              existingAct.baseWord = newAct;
              existingAct.dbWord = actDb ? actDb.word : null;
              conRenderNodeLabel(existingAct);
            } else if (typeof window.conCreateNodeActForNode === 'function') {
              window.conCreateNodeActForNode(node.id, newAct);
            }
          }

          // Support editing with ",," to create additional nodes from one edit action.
          if (entries.length > 1) {
            entries.slice(1).forEach((rawEntry, idx) => {
              const parsed = parseEntry(rawEntry, '');
              const text = parsed.text;
              if (!text) return;
              const ox = (idx + 1) * 8;
              const oy = (idx + 1) * 36;
              if (text.includes('_') && !text.startsWith('_') && !text.endsWith('_')) {
                const phraseWords = text.split('_').map(w => w.trim()).filter(Boolean);
                if (phraseWords.length >= 2) {
                  const pIds = conCreatePhraseGroup(phraseWords, node.x + ox, node.y + oy);
                  if (parsed.act && pIds && pIds.length && typeof window.conCreateNodeActForNode === 'function') {
                    window.conCreateNodeActForNode(pIds[pIds.length - 1], parsed.act);
                  }
                  return;
                }
              }
              const addedId = conAddWordAt(text, node.x + ox, node.y + oy, null);
              if (addedId && parsed.act && typeof window.conCreateNodeActForNode === 'function') {
                window.conCreateNodeActForNode(addedId, parsed.act);
              }
            });
          }

          conRedrawEdges();
        }

        inp.addEventListener('blur', commit);
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') { inp.blur(); }
          if (e.key === 'Escape') { inp.value = currentText; inp.blur(); }
          e.stopPropagation();
        });
      };

      window.conCtxToggleLock = function () {
        const targets = (conMultiSelected.size > 1 && conCtxNodeId && conMultiSelected.has(conCtxNodeId))
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : (conCtxNodeId ? [conNodes.find(n => n.id === conCtxNodeId)].filter(Boolean) : []);
        if (!targets.length) return;
        conPushUndo();
        const shouldLock = targets.some(node => !conIsNodeLocked(node));
        targets.forEach(node => {
          node.locked = shouldLock;
          conSyncNodeLockState(node);
        });
        const lockBtn = document.getElementById('con-ctx-lock-btn');
        if (lockBtn) {
          lockBtn.innerHTML = shouldLock ? '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" />' : '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" />';
          lockBtn.classList.toggle('active', shouldLock);
          lockBtn.title = shouldLock ? 'Unlock node position and size' : 'Lock node position and size';
        }
      };

      function conCtxCloseArrangeMenus() {
        ['align', 'distribute'].forEach(kind => {
          const menu = document.getElementById('con-ctx-' + kind + '-menu');
          const toggle = document.getElementById('con-ctx-' + kind + '-toggle');
          if (menu) menu.classList.remove('visible');
          if (toggle) toggle.classList.remove('active');
        });
      }

      window.conCtxToggleArrangeMenu = function (kind, event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        const targets = (typeof conGetMultiSelectedTargets === 'function') ? conGetMultiSelectedTargets() : [];
        if (targets.length < 2) return;
        const menu = document.getElementById('con-ctx-' + kind + '-menu');
        const toggle = document.getElementById('con-ctx-' + kind + '-toggle');
        if (!menu || !toggle) return;
        const willOpen = !menu.classList.contains('visible');
        conCtxCloseArrangeMenus();
        if (typeof window.conCloseAxisPicker === 'function') window.conCloseAxisPicker();
        if (willOpen) {
          menu.classList.add('visible');
          toggle.classList.add('active');
        }
      };

      window.conCtxClose = function () {
        conCtxNodeId = null;
        window.conCtxNodeId = global.conCtxNodeId = null;
        _conApplySizeUndoPushed = false;
        conCtxCloseArrangeMenus();
        if (typeof window.conCloseAxisPicker === 'function') window.conCloseAxisPicker();
        const caseDd = document.getElementById('con-ctx-case-dropdown');
        if (caseDd) caseDd.style.display = 'none';
        const splitDd = document.getElementById('con-ctx-split-dropdown');
        if (splitDd) splitDd.style.display = 'none';
        const menu = document.getElementById('con-ctx-menu');
        if (menu) {
          menu.classList.remove('visible');
          menu.style.maxHeight = '';
          menu.style.maxWidth = '';
          menu.style.width = '';
        }
      };

      // ---- Edge context menu (right-click on a link/arrow) ----
      global._conEdgeCtxId = null;
      let _conEdgeCtxOriginal = null;

      function conEdgeCtxCapture(edge) {
        if (!edge) return null;
        return {
          label: edge.label || '',
          labelSize: Number(edge.labelSize) || (window.conGetDefaultWordFontSize ? window.conGetDefaultWordFontSize() : 16),
          labelColor: edge.labelColor || '#333333',
          colorMode: edge.colorMode || 'auto',
          strokeColor: edge.strokeColor || null,
          labelWeight: Number(edge.labelWeight) || 600,
          thickness: Number.isFinite(edge.thickness) && edge.thickness > 0
            ? edge.thickness
            : (window._conDefaultLinkThickness > 0 ? window._conDefaultLinkThickness : 2),
          strokeType: edge.strokeType || (edge.dashStyle === 'dashed' ? 'dashed' : (edge.dashStyle === 'dotted' ? 'dotted' : 'solid')),
          routing: edge.routing || 'straight',
          type: edge.type || 'none',
          terminator: edge.terminator || 'arrow',
          opacity: (typeof edge.opacity === 'number') ? edge.opacity : 1,
          animated: !!edge.animated,
          labelBg: !!edge.labelBgActive,
          curvature: (typeof edge.curvature === 'number') ? edge.curvature : 0,
          avoidObstacles: !!(edge && edge.avoidObstacles),
          points: (edge && Array.isArray(edge.points)) ? edge.points.map(p => ({ x: p.x, y: p.y })) : []
        };
      }

      function conEdgeCtxApplySnapshot(edge, snap) {
        if (!edge || !snap) return;
        edge.label = String(snap.label || '');
        edge.labelSize = Number(snap.labelSize) || edge.labelSize || 16;
        edge.labelColor = String(snap.labelColor || edge.labelColor || '#333333');
        if (snap.colorMode !== undefined) edge.colorMode = snap.colorMode;
        if (snap.strokeColor !== undefined) edge.strokeColor = snap.strokeColor;
        edge.labelWeight = Number(snap.labelWeight) || edge.labelWeight || 600;
        const t = Math.max(1, Math.min(20, parseFloat(snap.thickness) || 2));
        edge.thickness = t;
        edge.strokeType = snap.strokeType || 'solid';
        edge.dashStyle = (edge.strokeType === 'dashed') ? 'dashed' : (edge.strokeType === 'dotted' ? 'dotted' : null);
        edge.routing = snap.routing || 'straight';
        edge.type = snap.type || edge.type || 'none';
        edge.terminator = snap.terminator || 'arrow';
        edge.opacity = (typeof snap.opacity === 'number') ? snap.opacity : 1;
        edge.animated = !!snap.animated;
        edge.labelBgActive = !!snap.labelBg;
        if (typeof snap.curvature === 'number') edge.curvature = snap.curvature;
        if (snap.avoidObstacles !== undefined) edge.avoidObstacles = !!snap.avoidObstacles;
        if (Array.isArray(snap.points)) edge.points = snap.points.map(p => ({ x: p.x, y: p.y }));

        if (edge.line) edge.line.style.strokeWidth = String(t);
        if (edge.hit) edge.hit.style.strokeWidth = String(Math.max(16, t + 10));
        conApplyEdgeLabelStyle(edge);
        if (edge.labelEl) edge.labelEl.textContent = edge.label;
        conUpdateEdge(edge);
      }

      function conEdgeCtxReadForm() {
        const input = document.getElementById('con-edge-ctx-input');
        const sizeInput = document.getElementById('con-edge-ctx-size');
        const colorText = document.getElementById('con-edge-ctx-color-text');
        const thicknessInput = document.getElementById('con-edge-ctx-thickness');
        const opacityInput = document.getElementById('con-edge-ctx-opacity');
        const labelBgInput = document.getElementById('con-edge-ctx-label-bg');
        const animatedInput = document.getElementById('con-edge-ctx-animated');
        const terminatorSelect = document.getElementById('con-edge-ctx-terminator');
        const avoidInput = document.getElementById('con-edge-ctx-avoid');

        const strokeBtn = document.querySelector('#con-edge-ctx-stroke-group .con-edge-ctx-btn.active');
        const routingBtn = document.querySelector('#con-edge-ctx-routing-group .con-edge-ctx-btn.active');
        const dirBtn = document.querySelector('#con-edge-ctx-dir-group .con-edge-ctx-btn.active');

        const colorRaw = colorText ? colorText.value.trim() : '';
        const color = /^#[0-9a-fA-F]{6}$/.test(colorRaw) ? colorRaw : '#333333';
        const opVal = opacityInput ? (parseInt(opacityInput.value, 10) / 100) : 1;

        const activeEdge = _conEdgeCtxId ? conEdges.find(e => e && e.id == _conEdgeCtxId) : null;
        const isAuto = (window._conEdgeCtxColorMode === 'auto');

        return {
          label: input ? input.value.trim() : '',
          labelSize: sizeInput ? (conFontUnitToPx(sizeInput.value, window.conFontUnit) || 16) : 16,
          labelColor: isAuto ? '#333333' : color,
          colorMode: isAuto ? 'auto' : 'manual',
          strokeColor: isAuto ? null : color,
          thickness: thicknessInput ? Math.max(0.2, Math.min(60, conThicknessUnitToPx(thicknessInput.value, window.conThicknessUnit) || 2)) : 2,
          strokeType: strokeBtn ? strokeBtn.dataset.stroke : 'solid',
          routing: routingBtn ? routingBtn.dataset.routing : 'straight',
          type: dirBtn ? dirBtn.dataset.dir : 'forward',
          terminator: terminatorSelect ? terminatorSelect.value : 'arrow',
          opacity: Math.max(0.1, Math.min(1, opVal)),
          animated: animatedInput ? !!animatedInput.checked : false,
          labelBg: labelBgInput ? !!labelBgInput.checked : false,
          curvature: (activeEdge && typeof activeEdge.curvature === 'number') ? activeEdge.curvature : 30,
          avoidObstacles: avoidInput ? !!avoidInput.checked : false,
          points: (activeEdge && Array.isArray(activeEdge.points)) ? activeEdge.points.slice() : []
        };
      }

      function conEdgeCtxApplyLive() {
        if (!_conEdgeCtxId) return;
        const edge = conEdges.find(e => e && e.id == _conEdgeCtxId);
        if (!edge) return;
        const snap = conEdgeCtxReadForm();
        conEdgeCtxApplySnapshot(edge, snap);
        conRedrawEdges();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({
            type: 'edge-update',
            edge: {
              id: edge.id,
              a: edge.a,
              b: edge.b,
              type: edge.type,
              label: edge.label,
              labelSize: edge.labelSize,
              labelColor: edge.labelColor,
              labelWeight: edge.labelWeight,
              thickness: edge.thickness,
              dashStyle: edge.dashStyle,
              strokeType: edge.strokeType,
              routing: edge.routing,
              curvature: edge.curvature,
              opacity: edge.opacity,
              terminator: edge.terminator,
              animated: edge.animated,
              labelBg: edge.labelBgActive,
              anchorA: edge.anchorA,
              anchorB: edge.anchorB,
              colorMode: edge.colorMode,
              strokeColor: edge.strokeColor,
              points: edge.points,
              avoidObstacles: edge.avoidObstacles
            }
          });
        }
      }
      window.conEdgeCtxApplyLive = conEdgeCtxApplyLive;
      window.conEdgeCtxReadForm = conEdgeCtxReadForm;
      window.conEdgeCtxApplySnapshot = conEdgeCtxApplySnapshot;
      window.conEdgeCtxCapture = conEdgeCtxCapture;

      function conEdgeCtxAddWaypoint() {
        if (!_conEdgeCtxId) return;
        const edge = conEdges.find(e => e && e.id == _conEdgeCtxId);
        if (!edge) return;
        const na = conResolveLinkAnchor(edge.a);
        const nb = conResolveLinkAnchor(edge.b);
        if (!na || !nb) return;
        if (!Array.isArray(edge.points)) edge.points = [];
        if (edge.points.length === 0) {
          const midX = Math.round((na.cx + nb.cx) / 2);
          const midY = Math.round((na.cy + nb.cy) / 2);
          edge.points.push({ x: midX, y: midY });
        } else {
          const lastPt = edge.points[edge.points.length - 1];
          const nextX = Math.round((lastPt.x + nb.cx) / 2);
          const nextY = Math.round((lastPt.y + nb.cy) / 2);
          edge.points.push({ x: nextX, y: nextY });
        }
        edge.routing = 'curved';
        const routingGroup = document.getElementById('con-edge-ctx-routing-group');
        if (routingGroup) {
          routingGroup.querySelectorAll('.con-edge-ctx-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.routing === 'curved');
          });
        }
        conPushUndo();
        conUpdateEdge(edge);
        conRedrawEdges();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'edge-update', edge: { id: edge.id, points: edge.points, routing: edge.routing } });
        }
      }
      window.conEdgeCtxAddWaypoint = conEdgeCtxAddWaypoint;

      function conEdgeCtxClearWaypoints() {
        if (!_conEdgeCtxId) return;
        const edge = conEdges.find(e => e && e.id == _conEdgeCtxId);
        if (!edge) return;
        edge.points = [];
        edge.avoidObstacles = false;
        const avoidInput = document.getElementById('con-edge-ctx-avoid');
        if (avoidInput) avoidInput.checked = false;
        conPushUndo();
        conUpdateEdge(edge);
        conRedrawEdges();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'edge-update', edge: { id: edge.id, points: edge.points, avoidObstacles: false } });
        }
      }
      window.conEdgeCtxClearWaypoints = conEdgeCtxClearWaypoints;

      function conEdgeCtxSetPreset(text) {
        const inp = document.getElementById('con-edge-ctx-input');
        if (inp) {
          inp.value = text;
          conEdgeCtxApplyLive();
        }
      }
      window.conEdgeCtxSetPreset = conEdgeCtxSetPreset;

      function conEdgeCtxSetStroke(stroke) {
        const group = document.getElementById('con-edge-ctx-stroke-group');
        if (group) {
          group.querySelectorAll('.con-edge-ctx-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.stroke === stroke);
          });
        }
        conEdgeCtxApplyLive();
      }
      window.conEdgeCtxSetStroke = conEdgeCtxSetStroke;

      function conEdgeCtxSetRouting(routing) {
        const group = document.getElementById('con-edge-ctx-routing-group');
        if (group) {
          group.querySelectorAll('.con-edge-ctx-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.routing === routing);
          });
        }
        conEdgeCtxApplyLive();
      }
      window.conEdgeCtxSetRouting = conEdgeCtxSetRouting;

      function conEdgeCtxSetAutoColor() {
        window._conEdgeCtxColorMode = 'auto';
        const autoBtn = document.getElementById('con-edge-ctx-auto-color-btn');
        if (autoBtn) autoBtn.classList.add('active');
        const swatchWrap = document.getElementById('con-edge-ctx-swatches');
        if (swatchWrap) swatchWrap.querySelectorAll('.con-edge-swatch').forEach(x => x.classList.remove('active'));
        conEdgeCtxApplyLive();
      }
      window.conEdgeCtxSetAutoColor = conEdgeCtxSetAutoColor;

      function conEdgeCtxSetDir(dir) {
        const group = document.getElementById('con-edge-ctx-dir-group');
        if (group) {
          group.querySelectorAll('.con-edge-ctx-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.dir === dir);
          });
        }
        conEdgeCtxApplyLive();
      }
      window.conEdgeCtxSetDir = conEdgeCtxSetDir;

      function conEdgeCtxOpen(e, edgeId) {
        if (typeof window.conDeselectAll === 'function') {
          window.conDeselectAll();
        } else if (typeof conSelect === 'function') {
          conSelect(null);
        }
        _conEdgeCtxId = edgeId;
        window._conSelectedEdgeId = edgeId;
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
        const menu = document.getElementById('con-edge-ctx-menu');
        if (!menu) return;
        const edge = conEdges.find(ed => ed && ed.id == edgeId);
        _conEdgeCtxOriginal = conEdgeCtxCapture(edge);
        window._conEdgeCtxColorMode = (edge && edge.colorMode) ? edge.colorMode : 'auto';
        const autoColorBtn = document.getElementById('con-edge-ctx-auto-color-btn');
        if (autoColorBtn) autoColorBtn.classList.toggle('active', window._conEdgeCtxColorMode === 'auto');
        const input = document.getElementById('con-edge-ctx-input');
        const sizeInput = document.getElementById('con-edge-ctx-size');
        const sizeVal = document.getElementById('con-edge-ctx-size-val');
        const colorInput = document.getElementById('con-edge-ctx-color');
        const colorText = document.getElementById('con-edge-ctx-color-text');
        const thicknessInput = document.getElementById('con-edge-ctx-thickness');
        const opacityInput = document.getElementById('con-edge-ctx-opacity');
        const opacityVal = document.getElementById('con-edge-ctx-opacity-val');
        const labelBgInput = document.getElementById('con-edge-ctx-label-bg');
        const animatedInput = document.getElementById('con-edge-ctx-animated');
        const terminatorSelect = document.getElementById('con-edge-ctx-terminator');

        if (input) input.value = edge ? (edge.label || '') : '';
        const style = conNormalizeEdgeLabelStyle(edge || {});
        if (sizeInput) {
          _conSetupFontSizeSlider(sizeInput, window.conFontUnit);
          const uSize = conPxToFontUnit(style.size || 16, window.conFontUnit);
          sizeInput.value = String(uSize);
        }
        if (sizeVal) sizeVal.textContent = conPxToFontUnit(style.size || 16, window.conFontUnit) + ' ' + window.conFontUnit;
        if (colorInput) colorInput.value = style.color;
        if (colorText) colorText.value = style.color.toUpperCase();
        if (thicknessInput) {
          _conSetupThicknessSlider(thicknessInput, window.conThicknessUnit, 'edge');
          const rawPxThick = Number.isFinite(edge && edge.thickness) && edge.thickness > 0 ? edge.thickness : (window._conDefaultLinkThickness > 0 ? window._conDefaultLinkThickness : 2);
          thicknessInput.value = String(conPxToThicknessUnit(rawPxThick, window.conThicknessUnit));
        }
        _conSyncUnitToggleButtons();

        const opPercent = Math.round(((edge && typeof edge.opacity === 'number') ? edge.opacity : 1) * 100);
        if (opacityInput) opacityInput.value = String(opPercent);
        if (opacityVal) opacityVal.textContent = opPercent + '%';

        if (labelBgInput) labelBgInput.checked = !!(edge && edge.labelBgActive);
        if (animatedInput) animatedInput.checked = !!(edge && edge.animated);
        const avoidInput = document.getElementById('con-edge-ctx-avoid');
        if (avoidInput) avoidInput.checked = !!(edge && edge.avoidObstacles);

        const excerptsRow = document.getElementById('con-edge-ctx-excerpts-row');
        if (excerptsRow) {
          excerptsRow.style.display = (edge && edge.excerpts && edge.excerpts.length > 0) ? 'block' : 'none';
        }

        const currentStroke = (edge && (edge.strokeType || (edge.dashStyle === 'dashed' ? 'dashed' : (edge.dashStyle === 'dotted' ? 'dotted' : 'solid')))) || 'solid';
        const strokeGroup = document.getElementById('con-edge-ctx-stroke-group');
        if (strokeGroup) {
          strokeGroup.querySelectorAll('.con-edge-ctx-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.stroke === currentStroke);
          });
        }

        const currentRouting = (edge && edge.routing) || 'straight';
        const routingGroup = document.getElementById('con-edge-ctx-routing-group');
        if (routingGroup) {
          routingGroup.querySelectorAll('.con-edge-ctx-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.routing === currentRouting);
          });
        }

        const currentDir = (edge && edge.type) || 'none';
        const dirGroup = document.getElementById('con-edge-ctx-dir-group');
        if (dirGroup) {
          dirGroup.querySelectorAll('.con-edge-ctx-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.dir === currentDir);
          });
        }

        if (terminatorSelect) {
          terminatorSelect.value = (edge && edge.terminator) || 'arrow';
        }

        if (input) {
          input.oninput = function () { conEdgeCtxApplyLive(); };
        }
        if (sizeInput) {
          sizeInput.oninput = function () {
            if (sizeVal) sizeVal.textContent = this.value + ' ' + window.conFontUnit;
            conEdgeCtxApplyLive();
          };
        }
        if (colorInput && colorText) {
          colorInput.oninput = function () {
            window._conEdgeCtxColorMode = 'manual';
            const autoBtn = document.getElementById('con-edge-ctx-auto-color-btn');
            if (autoBtn) autoBtn.classList.remove('active');
            colorText.value = this.value.toUpperCase();
            conEdgeCtxApplyLive();
          };
          colorText.oninput = function () {
            if (/^#[0-9a-fA-F]{6}$/.test(this.value)) {
              window._conEdgeCtxColorMode = 'manual';
              const autoBtn = document.getElementById('con-edge-ctx-auto-color-btn');
              if (autoBtn) autoBtn.classList.remove('active');
              colorInput.value = this.value;
              conEdgeCtxApplyLive();
            }
          };
        }
        if (thicknessInput) {
          thicknessInput.oninput = function () { conEdgeCtxApplyLive(); };
          thicknessInput.onchange = function () { conEdgeCtxApplyLive(); };
        }
        if (opacityInput) {
          opacityInput.oninput = function () {
            if (opacityVal) opacityVal.textContent = this.value + '%';
            conEdgeCtxApplyLive();
          };
        }
        if (labelBgInput) {
          labelBgInput.onchange = function () { conEdgeCtxApplyLive(); };
        }
        if (animatedInput) {
          animatedInput.onchange = function () { conEdgeCtxApplyLive(); };
        }
        if (terminatorSelect) {
          terminatorSelect.onchange = function () { conEdgeCtxApplyLive(); };
        }
        if (avoidInput) {
          avoidInput.onchange = function () {
            conEdgeCtxApplyLive();
            if (this.checked && typeof showToast === 'function') {
              const activeEdge = _conEdgeCtxId ? conEdges.find(e => e && e.id == _conEdgeCtxId) : null;
              if (activeEdge) {
                const na = conResolveLinkAnchor(activeEdge.a);
                const nb = conResolveLinkAnchor(activeEdge.b);
                if (na && nb) {
                  const avoidPts = conComputeEdgeObstacleAvoidance(na.cx, na.cy, nb.cx, nb.cy, activeEdge.a, activeEdge.b);
                  if (avoidPts && avoidPts.length > 0) {
                    showToast((typeof i18n !== 'undefined' && typeof i18n.t === 'function') ? i18n.t('conEdgeAvoidObstaclesActive') : 'Avoid Obstacles active: link routed around obstacles');
                  } else {
                    showToast((typeof i18n !== 'undefined' && typeof i18n.t === 'function') ? i18n.t('conEdgeAvoidObstaclesEnabled') : 'Avoid Obstacles enabled: link will dynamically curve around words or notes placed in its path');
                  }
                }
              }
            }
          };
        }

        // Build / refresh colour swatches with wrapping palette
        const swatchWrap = document.getElementById('con-edge-ctx-swatches');
        if (swatchWrap) {
          const colorList = (typeof CON_MASK_COLORS !== 'undefined' && Array.isArray(CON_MASK_COLORS))
            ? CON_MASK_COLORS
            : ['#111111', '#444444', '#888888', '#bbbbbb', '#ffffff', '#e53935', '#f4511e', '#fb8c00', '#fdd835', '#c0ca33', '#43a047', '#00897b', '#1e88e5', '#3949ab', '#8e24aa', '#d81b60', '#6d4c41', '#00acc1', '#546e7a', '#f06292'];

          if (!swatchWrap.children.length) {
            colorList.forEach(c => {
              const s = document.createElement('span');
              s.dataset.color = c;
              s.className = 'con-edge-swatch';
              s.style.background = c;
              if (c === '#ffffff') s.style.boxShadow = 'inset 0 0 0 1.5px #ccc';
              s.onclick = () => {
                window._conEdgeCtxColorMode = 'manual';
                const autoBtn = document.getElementById('con-edge-ctx-auto-color-btn');
                if (autoBtn) autoBtn.classList.remove('active');
                if (colorInput) colorInput.value = c;
                if (colorText) colorText.value = c.toUpperCase();
                swatchWrap.querySelectorAll('.con-edge-swatch').forEach(x => x.classList.remove('active'));
                s.classList.add('active');
                conEdgeCtxApplyLive();
              };
              swatchWrap.appendChild(s);
            });
          }
          const cur = style.color.toLowerCase();
          swatchWrap.querySelectorAll('.con-edge-swatch').forEach(s => {
            s.classList.toggle('active', s.dataset.color.toLowerCase() === cur);
          });
        }

        // Position and clamp context menu inside viewport bounds
        menu.classList.add('visible');
        const margin = 8;
        menu.style.maxHeight = Math.max(160, window.innerHeight - 2 * margin) + 'px';
        menu.style.maxWidth = Math.max(200, window.innerWidth - 2 * margin) + 'px';
        menu.style.overflowY = 'auto';
        menu.style.overflowX = 'hidden';

        const mw = menu.offsetWidth || 256;
        const mh = menu.offsetHeight || 380;
        const clientX = (e && typeof e.clientX === 'number') ? e.clientX : (window.innerWidth / 2);
        const clientY = (e && typeof e.clientY === 'number') ? e.clientY : (window.innerHeight / 2);
        let mx = clientX + 6;
        let my = clientY + 6;

        // If menu extends beyond right edge, flip to left of cursor
        if (mx + mw > window.innerWidth - margin) {
          mx = clientX - mw - 6;
        }
        // If menu extends beyond bottom edge, flip above cursor
        if (my + mh > window.innerHeight - margin) {
          my = clientY - mh - 6;
        }
        // Clamp strictly within viewport margins
        const maxX = Math.max(margin, window.innerWidth - mw - margin);
        const maxY = Math.max(margin, window.innerHeight - mh - margin);
        mx = Math.max(margin, Math.min(maxX, mx));
        my = Math.max(margin, Math.min(maxY, my));

        menu.style.left = Math.round(mx) + 'px';
        menu.style.top = Math.round(my) + 'px';
        menu.style.maxHeight = Math.max(160, window.innerHeight - my - margin) + 'px';

        if (input) setTimeout(() => { input.focus(); input.select(); }, 50);
      }
      window.conEdgeCtxOpen = conEdgeCtxOpen;

      function conEdgeCtxClose(applyChanges) {
        const shouldApply = (applyChanges !== false);
        const edge = _conEdgeCtxId ? conEdges.find(e => e && e.id == _conEdgeCtxId) : null;
        if (edge && _conEdgeCtxOriginal) {
          if (shouldApply) {
            const current = conEdgeCtxCapture(edge);
            const changed = JSON.stringify(current) !== JSON.stringify(_conEdgeCtxOriginal);
            if (changed) {
              conEdgeCtxApplySnapshot(edge, _conEdgeCtxOriginal);
              conPushUndo();
              conEdgeCtxApplySnapshot(edge, current);
            }
          } else {
            conEdgeCtxApplySnapshot(edge, _conEdgeCtxOriginal);
          }
        }
        _conEdgeCtxId = null;
        _conEdgeCtxOriginal = null;
        window._conSelectedEdgeId = null;
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
        const menu = document.getElementById('con-edge-ctx-menu');
        if (menu) {
          menu.classList.remove('visible');
          menu.style.maxHeight = '';
        }
        conRedrawEdges();
      }
      window.conEdgeCtxClose = conEdgeCtxClose;

      function conEdgeCtxSave() {
        if (!_conEdgeCtxId) { conEdgeCtxClose(false); return; }
        conEdgeCtxApplyLive();
        conEdgeCtxClose(true);
      }
      window.conEdgeCtxSave = conEdgeCtxSave;

      function conEdgeCtxDelete() {
        if (!_conEdgeCtxId) { conEdgeCtxClose(false); return; }
        conPushUndo();
        const eid = _conEdgeCtxId;
        conEdgeCtxClose(false);
        conRemoveEdge(eid);
      }
      window.conEdgeCtxDelete = conEdgeCtxDelete;

      global._boardMenuLocked = false; // prevents immediate dismissal by in-flight click

      function conPlaceBoardCtxMenu(menuEl, anchorX, anchorY, opts) {
        if (!menuEl) return;
        const cfg = opts || {};
        const margin = Number.isFinite(cfg.margin) ? cfg.margin : 8;
        const offX = Number.isFinite(cfg.offsetX) ? cfg.offsetX : 6;
        const offY = Number.isFinite(cfg.offsetY) ? cfg.offsetY : 6;

        menuEl.style.maxHeight = Math.max(160, window.innerHeight - 2 * margin) + 'px';
        menuEl.style.maxWidth = Math.max(200, window.innerWidth - 2 * margin) + 'px';
        menuEl.style.overflowY = 'auto';
        menuEl.style.overflowX = 'hidden';

        const mw = menuEl.offsetWidth || 480;
        const mh = menuEl.offsetHeight || 280;

        let mx = anchorX + offX;
        let my = anchorY + offY;

        if (mx + mw > window.innerWidth - margin) mx = anchorX - mw - offX;
        if (my + mh > window.innerHeight - margin) my = anchorY - mh - offY;

        const maxX = Math.max(margin, window.innerWidth - mw - margin);
        const maxY = Math.max(margin, window.innerHeight - mh - margin);
        mx = Math.max(margin, Math.min(maxX, mx));
        my = Math.max(margin, Math.min(maxY, my));

        menuEl.style.left = Math.round(mx) + 'px';
        menuEl.style.top = Math.round(my) + 'px';
        menuEl.style.maxHeight = Math.max(160, window.innerHeight - my - margin) + 'px';
      }

      // Start canvas link mode from context menu
      window.conCtxStartLinkMode = function () {
        const srcId = conCtxNodeId || (window.conGetCtxNodeId ? window.conGetCtxNodeId() : (window.conGetSelected ? window.conGetSelected() : null));
        if (srcId) {
          if (typeof _conStartLinkMode === 'function') _conStartLinkMode(srcId);
          else if (typeof window._conStartLinkMode === 'function') window._conStartLinkMode(srcId);
        }
        conCtxClose();
      };

      // Add a new word connected to the current context node — reuses the board popup
      window.conCtxAddConnectedWord = function (arrowType) {
        _pendingConnectType = arrowType || 'none';
        const srcId = conCtxNodeId || (window.conGetCtxNodeId ? window.conGetCtxNodeId() : (window.conGetSelected ? window.conGetSelected() : null));
        const srcNode = conNodes.find(n => n.id === srcId);
        if (!srcNode) { conCtxClose(); return; }

        // Position the popup near (but offset from) the source node
        const brd = board();
        const brdRect = brd.getBoundingClientRect();
        _boardCtxX = srcNode.x + (srcNode.el.offsetWidth || 80) + 30;
        _boardCtxY = srcNode.y;
        _pendingConnectSrcId = srcId;

        // Update popup title to hint it will be connected
        const title = document.querySelector('#con-board-ctx-menu .con-ctx-title');
        if (title) title.textContent = `Connect to "${srcNode.baseWord || srcNode.el.textContent.trim()}"`;

        // Show popup near the source node (adjusting for board scroll)
        const bmenu = document.getElementById('con-board-ctx-menu');
        const nodeScreenX = brdRect.left + srcNode.x - (brd.scrollLeft || 0) + (srcNode.el.offsetWidth || 80) + 10;
        const nodeScreenY = brdRect.top + srcNode.y - (brd.scrollTop || 0);

        conCtxClose();

        // Lock against immediate dismissal, then show menu
        _boardMenuLocked = true;
        setTimeout(() => {
          bmenu.classList.add('visible');
          if (window.conSyncBoardCtxLayoutUi) window.conSyncBoardCtxLayoutUi(true);
          conPlaceBoardCtxMenu(bmenu, nodeScreenX, nodeScreenY, { offsetX: 6, offsetY: 6, margin: 8 });
          const inp = document.getElementById('con-board-ctx-input');
          if (inp) { inp.value = ''; inp.focus(); }
          setTimeout(() => { _boardMenuLocked = false; }, 50);
        }, 20);
      };

      // Cross-module exports
      window.conAttachNode = global.conAttachNode = conAttachNode;
      window.conAttachNodeEvents = global.conAttachNodeEvents = conAttachNodeEvents;
      window.conComputeEdgeGeometry = global.conComputeEdgeGeometry = conComputeEdgeGeometry;
      window.conAddEdge = global.conAddEdge = conAddEdge;
      window.conApplyEdgeLabelStyle = global.conApplyEdgeLabelStyle = conApplyEdgeLabelStyle;
      window.conEnsureSvgDefs = global.conEnsureSvgDefs = conEnsureSvgDefs;
      window.conUpdateEdge = global.conUpdateEdge = conUpdateEdge;
      window.conNodeEdgeOffset = global.conNodeEdgeOffset = conNodeEdgeOffset;
      window.conRedrawEdges = global.conRedrawEdges = conRedrawEdges;
      window.conResolveLinkAnchor = global.conResolveLinkAnchor = conResolveLinkAnchor;
      window.conGetAnchorPoint = global.conGetAnchorPoint = conGetAnchorPoint;
      window._conStartLinkMode = global._conStartLinkMode = _conStartLinkMode;
      window._conCancelLinkMode = global._conCancelLinkMode = _conCancelLinkMode;
      window.conRemoveNode = global.conRemoveNode = conRemoveNode;
      window.conRemoveEdge = global.conRemoveEdge = conRemoveEdge;
      window.conUpdateInstructions = global.conUpdateInstructions = conUpdateInstructions;
      window.rgbToHex = global.rgbToHex = rgbToHex;
      window.conNormalizeNodeShape = global.conNormalizeNodeShape = conNormalizeNodeShape;
      window.conApplyNodeShape = global.conApplyNodeShape = conApplyNodeShape;
      window.conSyncShapeButtons = global.conSyncShapeButtons = conSyncShapeButtons;
      window.conNormalizeNodeRotation = global.conNormalizeNodeRotation = conNormalizeNodeRotation;
      window.conApplyNodeRotation = global.conApplyNodeRotation = conApplyNodeRotation;
      window.conEdgeCtxClose = global.conEdgeCtxClose = conEdgeCtxClose;
      window.conPlaceBoardCtxMenu = global.conPlaceBoardCtxMenu = conPlaceBoardCtxMenu;

    })();

})(typeof window !== "undefined" ? window : this);
