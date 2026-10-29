/**
 * Class Management Tools — Board TABLES Engine
 * Extracted from pages/board.html (Lines 14759-15668)
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
  var conTables = global.conTables = global.conTables || [];
  window.conTables = conTables;
  window.conTableSelected = conTableSelected;

      // ================================================================
      // CONSTELLATION TABLES
      // ================================================================
      (function () {
        conTables = global.conTables = global.conTables || [];
        let _conTblNextId = 1;
        let _conTblCtxId = null;
        let _conTblCtxRow = -1;
        let _conTblCtxCol = -1;

        function _brd() { return document.getElementById('constellation-board'); }
        function _tblById(id) { return conTables.find(t => t.id === id) || null; }
        function _cell(tbl, r, c) { return tbl.cells[r * tbl.cols + c] || null; }
        function _defaultCell() {
          return { type: 'text', text: '', nodeData: null, bg: null, color: null, fontSize: null, textAlign: 'left', bold: false, italic: false };
        }
        function _colOffset(tbl, c) { let x = 0; for (let i = 0; i < c; i++) x += tbl.colWidths[i] || 80; return x; }
        function _rowOffset(tbl, r) { let y = 0; for (let i = 0; i < r; i++) y += tbl.rowHeights[i] || 36; return y; }
        function _totalW(tbl) { return tbl.colWidths.reduce((s, w) => s + w, 0); }
        function _totalH(tbl) { return tbl.rowHeights.reduce((s, h) => s + h, 0); }
        const _BAR_H = 24;

        function _applyGridStyle(tbl) {
          const g = tbl.el && tbl.el.querySelector('.con-table-grid');
          if (!g) return;
          g.style.gridTemplateColumns = tbl.colWidths.map(w => w + 'px').join(' ');
          g.style.gridTemplateRows = tbl.rowHeights.map(h => h + 'px').join(' ');
          const wrap = tbl.el.querySelector('.con-table-grid-wrap');
          if (wrap) { wrap.style.width = _totalW(tbl) + 'px'; wrap.style.height = _totalH(tbl) + 'px'; }
        }

        function _applyCellStyle(tbl, r, c) {
          const gridEl = tbl.el && tbl.el.querySelector('.con-table-grid');
          if (!gridEl) return;
          const cellEl = gridEl.querySelector(`.con-table-cell[data-row="${r}"][data-col="${c}"]`);
          const cell = _cell(tbl, r, c);
          if (!cellEl || !cell) return;
          cellEl.style.background = cell.bg || tbl.defaultBg || '#ffffff';
          if (tbl.hasHeader && r === 0) cellEl.classList.add('tbl-header');
          else cellEl.classList.remove('tbl-header');
          const textEl = cellEl.querySelector('.con-table-cell-text');
          if (textEl) {
            textEl.style.color = cell.color || tbl.defaultColor || '#111111';
            textEl.style.fontSize = (cell.fontSize || tbl.defaultFontSize || 14) + 'px';
            textEl.style.textAlign = cell.textAlign || 'left';
            textEl.style.fontWeight = cell.bold ? '700' : '';
            textEl.style.fontStyle = cell.italic ? 'italic' : '';
          }
        }

        let _conTableMirrorSyncTimer = null;
        function conCancelTableMirrorUpdate() {
          if (_conTableMirrorSyncTimer) {
            clearTimeout(_conTableMirrorSyncTimer);
            _conTableMirrorSyncTimer = null;
          }
        }
        function conScheduleTableMirrorUpdate() {
          conCancelTableMirrorUpdate();
          _conTableMirrorSyncTimer = setTimeout(() => {
            _conTableMirrorSyncTimer = null;
            if (typeof window._conMirrorBroadcast === 'function') {
              window._conMirrorBroadcast();
            }
          }, 100);
        }
        window.conScheduleTableMirrorUpdate = conScheduleTableMirrorUpdate;
        window.conCancelTableMirrorUpdate = conCancelTableMirrorUpdate;

        function _renderCellContent(tbl, r, c) {
          const gridEl = tbl.el && tbl.el.querySelector('.con-table-grid');
          if (!gridEl) return;
          const cellEl = gridEl.querySelector(`.con-table-cell[data-row="${r}"][data-col="${c}"]`);
          const cell = _cell(tbl, r, c);
          if (!cellEl || !cell) return;
          cellEl.innerHTML = '';
          if (cell.type === 'node' && cell.nodeData) {
            const nd = cell.nodeData;
            const nel = document.createElement('div');
            nel.className = 'con-node';
            nel.style.cssText = 'position:relative;left:auto;top:auto;display:inline-block;margin:2px;cursor:pointer;';
            if (nd.bg) nel.style.background = nd.bg;
            if (nd.color) nel.style.color = nd.color;
            if (nd.border) nel.style.borderColor = nd.border;
            if (nd.fontSize) nel.style.fontSize = nd.fontSize;
            nel.textContent = nd.baseWord || '';
            nel.addEventListener('contextmenu', function (e) {
              e.preventDefault(); e.stopPropagation();
              window._boardCtxNoteX = tbl.x + _colOffset(tbl, c) + 20;
              window._boardCtxNoteY = tbl.y + _BAR_H + _rowOffset(tbl, r) + 10;
              if (window.conCtxOpen) {
                const fakeNode = {
                  id: nd.id || '_tbln', el: nel, x: tbl.x, y: tbl.y,
                  baseWord: nd.baseWord || '', dbWord: nd.dbWord || null, locked: false, fmt: {}
                };
                window.conCtxOpen(e, fakeNode.id, fakeNode);
              }
            });
            nel.addEventListener('click', function (e) { e.stopPropagation(); });
            cellEl.appendChild(nel);
          } else {
            const te = document.createElement('div');
            te.className = 'con-table-cell-text';
            te.textContent = cell.text || '';
            te.contentEditable = 'false';
            te.addEventListener('click', function (e) {
              e.stopPropagation();
              if (!tbl.locked) { te.contentEditable = 'true'; te.focus(); }
            });
            const _syncCell = () => {
              cell.text = te.textContent || '';
              if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
              if (typeof window._conMirrorSend === 'function') {
                window._conMirrorSend({
                  type: 'table-cell-text',
                  id: String(tbl.id),
                  row: r,
                  col: c,
                  text: cell.text
                });
              }
              if (typeof conScheduleTableMirrorUpdate === 'function') {
                conScheduleTableMirrorUpdate();
              }
            };
            te.addEventListener('input', () => {
              _syncCell();
            });
            te.addEventListener('keyup', () => {
              _syncCell();
            });
            te.addEventListener('paste', () => {
              setTimeout(_syncCell, 0);
            });
            te.addEventListener('blur', function () {
              cell.text = te.textContent || '';
              te.contentEditable = 'false';
              _syncCell();
              if (typeof window._conMirrorBroadcast === 'function') {
                window._conMirrorBroadcast();
              }
            });
            te.addEventListener('keydown', function (e) {
              if (!e || typeof e.key !== 'string') return;
              if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                e.stopPropagation();
                _syncCell();
                if (typeof window.conSaveSession === 'function') window.conSaveSession();
                else if (typeof conSaveSession === 'function') conSaveSession();
                return;
              }
              e.stopPropagation();
            });
            cellEl.appendChild(te);
          }
          _applyCellStyle(tbl, r, c);
        }

        function _rebuildResizers(tbl) {
          const wrap = tbl.el && tbl.el.querySelector('.con-table-grid-wrap');
          if (!wrap) return;
          wrap.querySelectorAll('.con-table-col-resizer, .con-table-row-resizer').forEach(el => el.remove());
          let xAcc = 0;
          for (let c = 0; c < tbl.cols - 1; c++) {
            xAcc += tbl.colWidths[c] || 80;
            const h = document.createElement('div');
            h.className = 'con-table-col-resizer';
            h.style.left = (xAcc - 3) + 'px';
            h.style.height = _totalH(tbl) + 'px';
            wrap.appendChild(h);
            (function (col, startXAcc) {
              let drag = false, sx = 0, sw = 0;
              h.addEventListener('mousedown', function (e) {
                if (e.button !== 0 || tbl.locked) return;
                e.preventDefault(); e.stopPropagation();
                drag = true; sx = e.clientX; sw = tbl.colWidths[col] || 80;
                conPushUndo();
              });
              document.addEventListener('mousemove', function (e) {
                if (!drag) return;
                tbl.colWidths[col] = Math.max(30, sw + (e.clientX - sx));
                _applyGridStyle(tbl); _rebuildResizers(tbl);
              });
              document.addEventListener('mouseup', function () {
                if (drag) {
                  drag = false;
                  if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
                  if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
                }
              });
            })(c, xAcc);
          }
          let yAcc = 0;
          for (let r = 0; r < tbl.rows - 1; r++) {
            yAcc += tbl.rowHeights[r] || 36;
            const h = document.createElement('div');
            h.className = 'con-table-row-resizer';
            h.style.top = (yAcc - 3) + 'px';
            h.style.width = _totalW(tbl) + 'px';
            wrap.appendChild(h);
            (function (row) {
              let drag = false, sy = 0, sh = 0;
              h.addEventListener('mousedown', function (e) {
                if (e.button !== 0 || tbl.locked) return;
                e.preventDefault(); e.stopPropagation();
                drag = true; sy = e.clientY; sh = tbl.rowHeights[row] || 36;
                conPushUndo();
              });
              document.addEventListener('mousemove', function (e) {
                if (!drag) return;
                tbl.rowHeights[row] = Math.max(24, sh + (e.clientY - sy));
                _applyGridStyle(tbl); _rebuildResizers(tbl);
              });
              document.addEventListener('mouseup', function () {
                if (drag) {
                  drag = false;
                  if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
                  if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
                }
              });
            })(r);
          }
        }

        function _rebuildDOM(tbl) {
          if (tbl.el) tbl.el.remove();
          tbl.el = null;
          _buildDOM(tbl);
        }

        function _buildDOM(tbl) {
          const brd = _brd();
          if (!brd) return;
          const el = document.createElement('div');
          el.className = 'con-table-el';
          if (tbl.locked) el.classList.add('tbl-locked');
          el.dataset.tid = tbl.id;
          el.style.left = tbl.x + 'px';
          el.style.top = tbl.y + 'px';
          tbl.el = el;

          // Bar
          const bar = document.createElement('div');
          bar.className = 'con-table-bar';
          const dragIcon = document.createElement('span');
          dragIcon.className = 'con-table-drag-icon'; dragIcon.textContent = '⠿';
          bar.appendChild(dragIcon);
          const titleEl = document.createElement('span');
          titleEl.className = 'con-table-title'; titleEl.textContent = 'Table';
          bar.appendChild(titleEl);
          const hdrLabel = document.createElement('label');
          hdrLabel.className = 'con-table-header-toggle';
          const hdrCb = document.createElement('input');
          hdrCb.type = 'checkbox'; hdrCb.checked = !!tbl.hasHeader;
          hdrCb.addEventListener('change', function () {
            conPushUndo(); tbl.hasHeader = hdrCb.checked;
            for (let c = 0; c < tbl.cols; c++) _applyCellStyle(tbl, 0, c);
          });
          hdrLabel.appendChild(hdrCb); hdrLabel.appendChild(document.createTextNode(' Header'));
          bar.appendChild(hdrLabel);
          const lockBtn = document.createElement('button');
          lockBtn.className = 'con-table-bar-btn'; lockBtn.title = 'Lock/unlock';
          lockBtn.innerHTML = tbl.locked ? '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" />' : '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" />';
          lockBtn.addEventListener('click', function (e) {
            e.stopPropagation(); conPushUndo();
            tbl.locked = !tbl.locked;
            lockBtn.innerHTML = tbl.locked ? '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" />' : '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" />';
            if (tbl.locked) el.classList.add('tbl-locked'); else el.classList.remove('tbl-locked');
          });
          bar.appendChild(lockBtn);
          const delBtn = document.createElement('button');
          delBtn.className = 'con-table-bar-btn'; delBtn.title = 'Delete table'; delBtn.textContent = '✕';
          delBtn.addEventListener('click', async function (e) {
            e.stopPropagation();
            if (!await showConfirm('Delete this table?')) return;
            conPushUndo(); _deleteTable(tbl.id);
          });
          bar.appendChild(delBtn);
          el.appendChild(bar);

          // Grid wrapper
          const wrap = document.createElement('div');
          wrap.className = 'con-table-grid-wrap';
          wrap.style.width = _totalW(tbl) + 'px';
          wrap.style.height = _totalH(tbl) + 'px';
          const grid = document.createElement('div');
          grid.className = 'con-table-grid';
          grid.style.gridTemplateColumns = tbl.colWidths.map(w => w + 'px').join(' ');
          grid.style.gridTemplateRows = tbl.rowHeights.map(h => h + 'px').join(' ');
          for (let r = 0; r < tbl.rows; r++) {
            for (let c = 0; c < tbl.cols; c++) {
              const cellEl = document.createElement('div');
              cellEl.className = 'con-table-cell';
              cellEl.dataset.row = r; cellEl.dataset.col = c;
              grid.appendChild(cellEl);
            }
          }
          wrap.appendChild(grid);
          el.appendChild(wrap);

          // Corner resizer
          const resizer = document.createElement('div');
          resizer.className = 'con-table-resizer';
          el.appendChild(resizer);

          // Populate cells
          for (let r = 0; r < tbl.rows; r++)
            for (let c = 0; c < tbl.cols; c++) _renderCellContent(tbl, r, c);

          _rebuildResizers(tbl);
          brd.appendChild(el);

          // Drag (bar)
          let _drag = false, _ox = 0, _oy = 0, _sx = 0, _sy = 0, _pre = null;
          let _tableOffsets = [], _tblNodeOffsets = [], _tblNoteOffsets = [], _tblDrawOffsets = [], _tblShapeOffsets = [];
          let _tblMoveRaf = null;
          bar.addEventListener('mousedown', function (e) {
            if (e.button !== 0 || tbl.locked) return;
            if (e.target.closest('.con-table-header-toggle, .con-table-bar-btn')) return;
            e.preventDefault(); e.stopPropagation();

            if (e.shiftKey || e.ctrlKey || e.metaKey) {
              if (conTableSelected.has(tbl.id)) {
                conTableSelected.delete(tbl.id);
                el.classList.remove('con-table-selected');
              } else {
                conTableSelected.add(tbl.id);
                el.classList.add('con-table-selected');
              }
            } else {
              if (!conTableSelected.has(tbl.id)) {
                if (typeof conTableClearSelection === 'function') conTableClearSelection();
                conTableSelected.add(tbl.id);
                el.classList.add('con-table-selected');
                if (window.conNodeClearSelection) window.conNodeClearSelection();
                if (window.conNoteClearSelection) window.conNoteClearSelection();
                if (window.conDrawingClearSelection) window.conDrawingClearSelection();
                if (window.conShapeClearSelection) window.conShapeClearSelection();
                if (window.conMediaClearSelection) window.conMediaClearSelection();
              }
            }
            if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();

            _drag = false; _sx = e.clientX; _sy = e.clientY; _ox = tbl.x; _oy = tbl.y; _pre = null;
            _tableOffsets = [];
            if (conTableSelected.size > 1 && conTableSelected.has(tbl.id)) {
              conTableSelected.forEach(tid => {
                if (tid === tbl.id) return;
                const other = conTables.find(t => t.id === tid);
                if (other && !other.locked) _tableOffsets.push({ tbl: other, sx: other.x, sy: other.y });
              });
            }

            // Snapshot co-selected nodes for joint drag
            _tblNodeOffsets = [];
            const _tAllNodes = new Set(window.conGetMultiSelected ? window.conGetMultiSelected() : (typeof conMultiSelected !== 'undefined' ? conMultiSelected : []));
            if (typeof conSelected !== 'undefined' && conSelected) _tAllNodes.add(conSelected);
            if (window.conGetSelected && window.conGetSelected()) _tAllNodes.add(window.conGetSelected());
            const _tNodesList = window.conGetNodes ? window.conGetNodes() : [];
            _tAllNodes.forEach(nid => {
              const nd = _tNodesList.find(n => n.id === nid);
              if (nd && !(typeof conIsNodeLocked === 'function' && conIsNodeLocked(nd))) {
                _tblNodeOffsets.push({ nd, sx: nd.x, sy: nd.y });
              }
            });

            // Snapshot co-selected notes for joint drag
            _tblNoteOffsets = [];
            const _tNoteSel = window.conGetNoteSelected ? window.conGetNoteSelected() : (typeof conNoteSelected !== 'undefined' ? conNoteSelected : new Set());
            const _tNotesList = window.conGetNotes ? window.conGetNotes() : [];
            _tNoteSel.forEach(nid => {
              const nd = _tNotesList.find(n => n.id === nid);
              if (nd && !nd.locked) _tblNoteOffsets.push({ nd, sx: nd.x, sy: nd.y });
            });

            // Snapshot co-selected drawings for joint drag
            _tblDrawOffsets = [];
            const _tDrawSel = window.conGetDrawingSelected ? window.conGetDrawingSelected() : (typeof conDrawingSelected !== 'undefined' ? conDrawingSelected : new Set());
            const _tDrawList = window.conGetDrawings ? window.conGetDrawings() : [];
            _tDrawSel.forEach(did => {
              const dr = _tDrawList.find(x => x.id === did);
              if (dr) _tblDrawOffsets.push({ dr, sx: dr.x, sy: dr.y, pad: dr.pad || Math.max((dr.thickness || 2) + 4, 12) });
            });

            // Snapshot co-selected shapes for joint drag
            _tblShapeOffsets = [];
            const _tShapeSel = window.conGetShapeSelected ? window.conGetShapeSelected() : (typeof _conShapeSelected !== 'undefined' ? _conShapeSelected : new Set());
            const _tShapeList = window.conGetShapes ? window.conGetShapes() : [];
            _tShapeSel.forEach(sid => {
              const s = _tShapeList.find(x => x.id === sid);
              if (s) _tblShapeOffsets.push({
                s, sx: s.x, sy: s.y,
                slx1: s.lx1, sly1: s.ly1, slx2: s.lx2, sly2: s.ly2,
                spts: s.pts ? s.pts.map(p => ({ ...p })) : null,
                pad: s.pad || (typeof _conShapeGetPAD === 'function' ? _conShapeGetPAD(s) : 16)
              });
            });
          });
          document.addEventListener('mousemove', function (e) {
            if (!_sx && !_sy) return;
            if (e.buttons === 0) { _sx = 0; _sy = 0; return; }
            const dx = e.clientX - _sx, dy = e.clientY - _sy;
            if (!_drag && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
              _drag = true; _pre = typeof conBuildPageSnapshot === 'function' ? conBuildPageSnapshot() : null;
              window._conMirrorDragging = true;
            }
            if (!_drag) return;
            tbl.x = Math.max(0, _ox + dx); tbl.y = Math.max(0, _oy + dy);
            el.style.left = tbl.x + 'px'; el.style.top = tbl.y + 'px';
            _tableOffsets.forEach(({ tbl: other, sx, sy }) => {
              other.x = Math.max(0, sx + dx);
              other.y = Math.max(0, sy + dy);
              if (other.el) { other.el.style.left = other.x + 'px'; other.el.style.top = other.y + 'px'; }
            });
            if (_tblNodeOffsets.length > 0) {
              _tblNodeOffsets.forEach(({ nd, sx, sy }) => {
                nd.x = sx + dx; nd.y = sy + dy;
                if (nd.el) { nd.el.style.left = nd.x + 'px'; nd.el.style.top = nd.y + 'px'; }
              });
              if (window.conRedrawEdges) window.conRedrawEdges();
              if (window.conGroupRefitAll) window.conGroupRefitAll();
            }
            if (_tblNoteOffsets.length > 0) {
              _tblNoteOffsets.forEach(({ nd, sx, sy }) => {
                nd.x = sx + dx; nd.y = sy + dy;
                const noteEl = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nd.id) : document.querySelector(`.con-word-note[data-id="${nd.id}"]`);
                if (noteEl) { noteEl.style.left = nd.x + 'px'; noteEl.style.top = nd.y + 'px'; }
              });
            }
            if (_tblDrawOffsets.length > 0) {
              _tblDrawOffsets.forEach(({ dr, sx, sy, pad }) => {
                dr.x = sx + dx; dr.y = sy + dy;
                const p = pad !== undefined ? pad : (dr.pad || 12);
                if (dr.el) { dr.el.style.left = (dr.x - p) + 'px'; dr.el.style.top = (dr.y - p) + 'px'; }
              });
            }
            if (_tblShapeOffsets.length > 0) {
              _tblShapeOffsets.forEach(({ s, sx, sy, slx1, sly1, slx2, sly2, spts, pad }) => {
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
            if (window._conMirrorSend) {
              if (!_tblMoveRaf) {
                _tblMoveRaf = requestAnimationFrame(function () {
                  _tblMoveRaf = null;
                  if (!window._conMirrorSend) return;
                  const _tPositions = [{ id: tbl.id, x: tbl.x, y: tbl.y }];
                  _tableOffsets.forEach(({ tbl: other }) => _tPositions.push({ id: other.id, x: other.x, y: other.y }));
                  window._conMirrorSend({ type: 'table-move', positions: _tPositions });
                  if (_tblNodeOffsets.length > 0) {
                    window._conMirrorSend({ type: 'node-move', positions: _tblNodeOffsets.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
                  }
                  if (_tblNoteOffsets.length > 0) {
                    window._conMirrorSend({ type: 'note-move', positions: _tblNoteOffsets.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
                  }
                  if (_tblDrawOffsets.length > 0) {
                    window._conMirrorSend({ type: 'drawing-move', positions: _tblDrawOffsets.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y })) });
                  }
                  if (_tblShapeOffsets.length > 0) {
                    window._conMirrorSend({
                      type: 'shape-move',
                      positions: _tblShapeOffsets.map(({ s }) => ({
                        id: s.id, x: s.x, y: s.y,
                        lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                        pts: s.pts ? s.pts.map(p => ({ ...p })) : undefined
                      }))
                    });
                  }
                });
              }
            }
          });
          document.addEventListener('mouseup', function (e) {
            if (_tblMoveRaf) { cancelAnimationFrame(_tblMoveRaf); _tblMoveRaf = null; }
            if (_drag) {
              if (window._conMirrorSend) {
                const _tPositions = [{ id: tbl.id, x: tbl.x, y: tbl.y }];
                _tableOffsets.forEach(({ tbl: other }) => _tPositions.push({ id: other.id, x: other.x, y: other.y }));
                window._conMirrorSend({ type: 'table-move', positions: _tPositions });
                if (_tblNodeOffsets.length > 0) {
                  window._conMirrorSend({ type: 'node-move', positions: _tblNodeOffsets.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
                }
                if (_tblNoteOffsets.length > 0) {
                  window._conMirrorSend({ type: 'note-move', positions: _tblNoteOffsets.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
                }
                if (_tblDrawOffsets.length > 0) {
                  window._conMirrorSend({ type: 'drawing-move', positions: _tblDrawOffsets.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y })) });
                }
                if (_tblShapeOffsets.length > 0) {
                  window._conMirrorSend({
                    type: 'shape-move',
                    positions: _tblShapeOffsets.map(({ s }) => ({
                      id: s.id, x: s.x, y: s.y,
                      lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
                      pts: s.pts ? s.pts.map(p => ({ ...p })) : undefined
                    }))
                  });
                }
              }
              if (_pre) { conPushUndo(_pre); }
              if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
            } else if (_sx && _sy && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
              const totalOther = (conTableSelected.size > 1 ? conTableSelected.size - 1 : 0) + _tblNodeOffsets.length + _tblNoteOffsets.length + _tblDrawOffsets.length + _tblShapeOffsets.length;
              if (totalOther > 0) {
                if (typeof conTableClearSelection === 'function') conTableClearSelection();
                conTableSelected.add(tbl.id);
                el.classList.add('con-table-selected');
                if (window.conNodeClearSelection) window.conNodeClearSelection();
                if (window.conNoteClearSelection) window.conNoteClearSelection();
                if (window.conDrawingClearSelection) window.conDrawingClearSelection();
                if (window.conShapeClearSelection) window.conShapeClearSelection();
                if (window.conMediaClearSelection) window.conMediaClearSelection();
                if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
              }
            }
            _drag = false; _sx = 0; _sy = 0; _pre = null;
            _tableOffsets = []; _tblNodeOffsets = []; _tblNoteOffsets = []; _tblDrawOffsets = []; _tblShapeOffsets = [];
            setTimeout(() => { window._conMirrorDragging = false; }, 60);
          });

          // Corner resize
          let _rs = false, _rsx = 0, _rsy = 0, _rcw = [], _rrh = [];
          resizer.addEventListener('mousedown', function (e) {
            if (e.button !== 0 || tbl.locked) return;
            e.preventDefault(); e.stopPropagation();
            _rs = true; _rsx = e.clientX; _rsy = e.clientY;
            _rcw = [...tbl.colWidths]; _rrh = [...tbl.rowHeights]; conPushUndo();
          });
          document.addEventListener('mousemove', function (e) {
            if (!_rs) return;
            const dx = e.clientX - _rsx, dy = e.clientY - _rsy;
            const oldW = _rcw.reduce((s, w) => s + w, 0);
            const oldH = _rrh.reduce((s, h) => s + h, 0);
            const nw = Math.max(tbl.cols * 30, oldW + dx);
            const nh = Math.max(tbl.rows * 24, oldH + dy);
            tbl.colWidths = _rcw.map(w => Math.max(30, Math.round(w * nw / oldW)));
            tbl.rowHeights = _rrh.map(h => Math.max(24, Math.round(h * nh / oldH)));
            _applyGridStyle(tbl); _rebuildResizers(tbl);
          });
          document.addEventListener('mouseup', function () {
            if (_rs) {
              _rs = false;
              if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
              if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
            }
          });

          // Right-click on table
          el.addEventListener('contextmenu', function (e) {
            e.preventDefault(); e.stopPropagation();
            const ce = e.target.closest('.con-table-cell');
            _conTblCtxOpen(e, tbl.id, ce ? parseInt(ce.dataset.row) : -1, ce ? parseInt(ce.dataset.col) : -1);
          });

          // Hover highlight for node drop
          grid.addEventListener('mouseover', function (e) {
            if (!window._conTblDraggingNodeId) return;
            const ce = e.target.closest('.con-table-cell');
            grid.querySelectorAll('.con-table-drop-highlight').forEach(x => x.classList.remove('con-table-drop-highlight'));
            if (ce) ce.classList.add('con-table-drop-highlight');
          });
          grid.addEventListener('mouseleave', function () {
            grid.querySelectorAll('.con-table-drop-highlight').forEach(x => x.classList.remove('con-table-drop-highlight'));
          });
        }

        // ── Context menu ─────────────────────────────────────────────────
        function _conTblCtxOpen(e, tid, row, col) {
          _conTblCtxId = tid; _conTblCtxRow = row; _conTblCtxCol = col;
          const tbl = _tblById(tid);
          const overlay = document.getElementById('con-table-style-overlay');
          const popup = document.getElementById('con-table-style-popup');
          if (!overlay || !tbl) return;
          const titleEl = document.getElementById('con-table-ctx-title');
          if (titleEl) titleEl.childNodes[0] && (titleEl.childNodes[0].textContent = (row >= 0 && col >= 0) ? 'Table · cell (' + row + ',' + col + ') ' : 'Table style ');
          const delR = document.getElementById('con-table-ctx-del-row');
          const delC = document.getElementById('con-table-ctx-del-col');
          if (delR) delR.disabled = tbl.rows <= 1;
          if (delC) delC.disabled = tbl.cols <= 1;
          const lb = document.getElementById('con-table-ctx-lock-btn');
          if (lb) lb.textContent = tbl.locked ? '🔒 Unlock' : '🔓 Lock';
          if (row >= 0 && col >= 0) {
            const cell = _cell(tbl, row, col);
            if (cell) {
              const bg = document.getElementById('con-table-ctx-cell-bg');
              const fg = document.getElementById('con-table-ctx-cell-color');
              const fs = document.getElementById('con-table-ctx-cell-fs');
              if (bg) bg.value = cell.bg || tbl.defaultBg || '#ffffff';
              if (fg) fg.value = cell.color || tbl.defaultColor || '#111111';
              if (fs) fs.value = String(cell.fontSize || tbl.defaultFontSize || 14);
            }
          }
          overlay.classList.add('active');
          if (popup) {
            popup.style.maxHeight = Math.max(160, window.innerHeight - 16) + 'px';
            popup.style.maxWidth = Math.max(200, window.innerWidth - 16) + 'px';
            popup.style.overflowY = 'auto';
            popup.style.overflowX = 'hidden';
          }
          const pw = popup ? (popup.offsetWidth || 240) : 240;
          const ph = popup ? (popup.offsetHeight || 280) : 280;
          let mx = e.clientX, my = e.clientY;
          if (mx + pw > window.innerWidth - 8) mx = window.innerWidth - pw - 8;
          if (my + ph > window.innerHeight - 8) my = window.innerHeight - ph - 8;
          mx = Math.max(8, mx);
          my = Math.max(8, my);
          if (popup) {
            popup.style.left = Math.round(mx) + 'px';
            popup.style.top = Math.round(my) + 'px';
            popup.style.maxHeight = Math.max(160, window.innerHeight - my - 8) + 'px';
          }
        }

        window.conTableStyleClose = function (e) {
          if (e && e.target !== document.getElementById('con-table-style-overlay')) return;
          window.conTableCtxClose();
        };

        window.conTableCtxClose = function () {
          const overlay = document.getElementById('con-table-style-overlay');
          if (overlay) overlay.classList.remove('active');
        };
        window.conTableCtxAddRowAbove = function () {
          const t = _tblById(_conTblCtxId); if (!t) return;
          conPushUndo();
          const r = Math.max(0, _conTblCtxRow >= 0 ? _conTblCtxRow : 0);
          t.rowHeights.splice(r, 0, 36);
          t.cells.splice(r * t.cols, 0, ...Array.from({ length: t.cols }, _defaultCell));
          t.rows++; _rebuildDOM(t); window.conTableCtxClose();
        };
        window.conTableCtxAddRowBelow = function () {
          const t = _tblById(_conTblCtxId); if (!t) return;
          conPushUndo();
          const r = (_conTblCtxRow >= 0 ? _conTblCtxRow : t.rows - 1) + 1;
          t.rowHeights.splice(r, 0, 36);
          t.cells.splice(r * t.cols, 0, ...Array.from({ length: t.cols }, _defaultCell));
          t.rows++; _rebuildDOM(t); window.conTableCtxClose();
        };
        window.conTableCtxAddColLeft = function () {
          const t = _tblById(_conTblCtxId); if (!t) return;
          conPushUndo();
          const ins = Math.max(0, _conTblCtxCol >= 0 ? _conTblCtxCol : 0);
          t.colWidths.splice(ins, 0, 80);
          const oldC = t.cols, newC = t.cols + 1;
          const nc = [];
          for (let r = 0; r < t.rows; r++)
            for (let c = 0; c < newC; c++)
              nc.push(c === ins ? _defaultCell() : (t.cells[r * oldC + (c < ins ? c : c - 1)] || _defaultCell()));
          t.cells = nc; t.cols = newC; _rebuildDOM(t); window.conTableCtxClose();
        };
        window.conTableCtxAddColRight = function () {
          const t = _tblById(_conTblCtxId); if (!t) return;
          conPushUndo();
          const ins = (_conTblCtxCol >= 0 ? _conTblCtxCol : t.cols - 1) + 1;
          t.colWidths.splice(ins, 0, 80);
          const oldC = t.cols, newC = t.cols + 1;
          const nc = [];
          for (let r = 0; r < t.rows; r++)
            for (let c = 0; c < newC; c++)
              nc.push(c === ins ? _defaultCell() : (t.cells[r * oldC + (c < ins ? c : c - 1)] || _defaultCell()));
          t.cells = nc; t.cols = newC; _rebuildDOM(t); window.conTableCtxClose();
        };
        window.conTableCtxRemoveRow = function () {
          const t = _tblById(_conTblCtxId); if (!t || t.rows <= 1) return;
          conPushUndo();
          const r = Math.max(0, Math.min(t.rows - 1, _conTblCtxRow >= 0 ? _conTblCtxRow : t.rows - 1));
          for (let c = 0; c < t.cols; c++) { const cell = _cell(t, r, c); if (cell && cell.type === 'node') _restoreNodeFromCell(t, r, c); }
          t.rowHeights.splice(r, 1);
          t.cells.splice(r * t.cols, t.cols);
          t.rows--; _rebuildDOM(t); window.conTableCtxClose();
        };
        window.conTableCtxRemoveCol = function () {
          const t = _tblById(_conTblCtxId); if (!t || t.cols <= 1) return;
          conPushUndo();
          const col = Math.max(0, Math.min(t.cols - 1, _conTblCtxCol >= 0 ? _conTblCtxCol : t.cols - 1));
          for (let r = 0; r < t.rows; r++) { const cell = _cell(t, r, col); if (cell && cell.type === 'node') _restoreNodeFromCell(t, r, col); }
          t.colWidths.splice(col, 1);
          const oldC = t.cols, nc = [];
          for (let r = 0; r < t.rows; r++)
            for (let c = 0; c < oldC; c++)
              if (c !== col) nc.push(t.cells[r * oldC + c] || _defaultCell());
          t.cells = nc; t.cols = oldC - 1; _rebuildDOM(t); window.conTableCtxClose();
        };
        window.conTableCtxApplyCellBg = function (v) {
          const t = _tblById(_conTblCtxId); if (!t || _conTblCtxRow < 0) return;
          const cell = _cell(t, _conTblCtxRow, _conTblCtxCol); if (!cell) return;
          cell.bg = v; _applyCellStyle(t, _conTblCtxRow, _conTblCtxCol);
        };
        window.conTableCtxApplyCellColor = function (v) {
          const t = _tblById(_conTblCtxId); if (!t || _conTblCtxRow < 0) return;
          const cell = _cell(t, _conTblCtxRow, _conTblCtxCol); if (!cell) return;
          cell.color = v; _applyCellStyle(t, _conTblCtxRow, _conTblCtxCol);
        };
        window.conTableCtxApplyCellFs = function (v) {
          const t = _tblById(_conTblCtxId); if (!t || _conTblCtxRow < 0) return;
          const cell = _cell(t, _conTblCtxRow, _conTblCtxCol); if (!cell) return;
          cell.fontSize = parseInt(v) || null; _applyCellStyle(t, _conTblCtxRow, _conTblCtxCol);
        };
        window.conTableCtxCellAlign = function (align) {
          const t = _tblById(_conTblCtxId); if (!t || _conTblCtxRow < 0) return;
          const cell = _cell(t, _conTblCtxRow, _conTblCtxCol); if (!cell) return;
          cell.textAlign = align; _applyCellStyle(t, _conTblCtxRow, _conTblCtxCol); window.conTableCtxClose();
        };
        window.conTableCtxClearCell = function () {
          const t = _tblById(_conTblCtxId); if (!t || _conTblCtxRow < 0) return;
          conPushUndo();
          const cell = _cell(t, _conTblCtxRow, _conTblCtxCol); if (!cell) return;
          if (cell.type === 'node') _restoreNodeFromCell(t, _conTblCtxRow, _conTblCtxCol);
          cell.type = 'text'; cell.text = ''; cell.nodeData = null;
          _renderCellContent(t, _conTblCtxRow, _conTblCtxCol); window.conTableCtxClose();
        };
        window.conTableCtxToggleLock = function () {
          const t = _tblById(_conTblCtxId); if (!t) return;
          conPushUndo(); t.locked = !t.locked;
          if (t.el) {
            if (t.locked) t.el.classList.add('tbl-locked'); else t.el.classList.remove('tbl-locked');
            const lb = t.el.querySelector('.con-table-bar-btn[title="Lock/unlock"]');
            if (lb) lb.textContent = t.locked ? '🔒' : '🔓';
          }
          const mb = document.getElementById('con-table-ctx-lock-btn');
          if (mb) mb.textContent = t.locked ? '🔒 Unlock' : '🔓 Lock';
          window.conTableCtxClose();
        };
        window.conTableCtxDelete = function () {
          const t = _tblById(_conTblCtxId); if (!t) return;
          conPushUndo(); _deleteTable(t.id); window.conTableCtxClose();
        };

        // ── Node ↔ cell helpers ──────────────────────────────────────────
        function _restoreNodeFromCell(tbl, r, c) {
          const cell = _cell(tbl, r, c);
          if (!cell || cell.type !== 'node' || !cell.nodeData) return;
          const nd = cell.nodeData;
          const brd = _brd(); if (!brd) return;
          const nel = document.createElement('div');
          nel.className = 'con-node';
          nel.id = nd.id || ('cn_r' + Date.now());
          nel.style.left = (tbl.x + 20) + 'px'; nel.style.top = (tbl.y + 20) + 'px';
          if (nd.bg) nel.style.background = nd.bg;
          if (nd.color) nel.style.color = nd.color;
          if (nd.border) nel.style.borderColor = nd.border;
          if (nd.fontSize) nel.style.fontSize = nd.fontSize;
          nel.textContent = nd.baseWord || '';
          brd.appendChild(nel);
          const nodeObj = {
            id: nel.id, el: nel, x: tbl.x + 20, y: tbl.y + 20,
            baseWord: nd.baseWord || '', dbWord: nd.dbWord || null,
            locked: false, fmt: {}
          };
          const nodes = window.conGetNodes ? window.conGetNodes() : [];
          nodes.push(nodeObj);
          if (window.conAttachNode) window.conAttachNode(nel.id, nel);
          if (window.conRenderNodeLabel) window.conRenderNodeLabel(nodeObj);
          cell.type = 'text'; cell.text = ''; cell.nodeData = null;
        }

        function _deleteTable(id) {
          const idx = conTables.findIndex(t => t.id === id); if (idx < 0) return;
          const t = conTables[idx];
          t.cells.forEach((cell, i) => {
            if (cell.type === 'node' && cell.nodeData) {
              _restoreNodeFromCell(t, Math.floor(i / t.cols), i % t.cols);
            }
          });
          if (t.el) t.el.remove();
          conTables.splice(idx, 1);
        }

        // Called from node onUp handler to drop a node into a table cell
        window._conDropNodeToCell = function (nodeId, tblId, r, c) {
          const tbl = _tblById(tblId); if (!tbl) return;
          const nodes = window.conGetNodes ? window.conGetNodes() : [];
          const ni = nodes.findIndex(n => n.id === nodeId); if (ni < 0) return;
          const node = nodes[ni];
          // Snapshot was already pushed before drag started
          const nd = {
            id: node.id, baseWord: node.baseWord || '',
            dbWord: node.dbWord || null,
            bg: node.el ? (node.el.style.background || '') : '',
            color: node.el ? (node.el.style.color || '') : '',
            border: node.el ? (node.el.style.borderColor || '') : '',
            fontSize: node.fontSize || '16px'
          };
          if (node.el && node.el.parentNode) node.el.parentNode.removeChild(node.el);
          nodes.splice(ni, 1);
          const cell = _cell(tbl, r, c); if (!cell) return;
          cell.type = 'node'; cell.nodeData = nd; cell.text = '';
          _renderCellContent(tbl, r, c);
          // Remove edges referencing this node
          if (window.conGetEdges) {
            const edges = window.conGetEdges();
            for (let i = edges.length - 1; i >= 0; i--) {
              if (edges[i].a === nodeId || edges[i].b === nodeId) {
                if (edges[i].g) edges[i].g.remove();
                edges.splice(i, 1);
              }
            }
            if (window.conRedrawEdges) window.conRedrawEdges();
          }
        };

        // ── Public API ────────────────────────────────────────────────────
        window.conGetTables = function () { return conTables; };

        window.conTablesClear = function () {
          conTables.forEach(t => { if (t.el) t.el.remove(); });
          conTables = []; _conTblNextId = 1; _conTblCtxId = null;
          const overlay = document.getElementById('con-table-style-overlay');
          if (overlay) overlay.classList.remove('active');
        };

        window.conSerializeTables = function () {
          return conTables.map(t => ({
            id: t.id, x: t.x, y: t.y, rows: t.rows, cols: t.cols,
            colWidths: [...t.colWidths], rowHeights: [...t.rowHeights],
            locked: !!t.locked, hasHeader: !!t.hasHeader,
            defaultFontSize: t.defaultFontSize || 14,
            defaultBg: t.defaultBg || '#ffffff', defaultColor: t.defaultColor || '#111111',
            defaultBorderColor: t.defaultBorderColor || '#aaaaaa',
            defaultBorderWidth: t.defaultBorderWidth || 1,
            cells: t.cells.map(c => ({
              type: c.type || 'text', text: c.text || '',
              nodeData: c.nodeData || null,
              bg: c.bg || null, color: c.color || null,
              fontSize: c.fontSize || null, textAlign: c.textAlign || 'left',
              bold: !!c.bold, italic: !!c.italic
            }))
          }));
        };

        window.conAddTableFromData = function (data) {
          const brd = _brd(); if (!brd) return null;
          const src = data || {};
          const id = (typeof src.id === 'string' && src.id.trim()) ? src.id.trim() : ('ctbl-' + (_conTblNextId++));
          const nm = id.match(/\d+$/);
          if (nm) _conTblNextId = Math.max(_conTblNextId, parseInt(nm[0]) + 1);
          const rows = Math.max(1, Number(src.rows) || 2);
          const cols = Math.max(1, Number(src.cols) || 2);
          const tbl = {
            id, x: Number(src.x) || 60, y: Number(src.y) || 60, rows, cols,
            colWidths: (Array.isArray(src.colWidths) && src.colWidths.length === cols) ? [...src.colWidths] : Array(cols).fill(100),
            rowHeights: (Array.isArray(src.rowHeights) && src.rowHeights.length === rows) ? [...src.rowHeights] : Array(rows).fill(36),
            locked: !!src.locked, hasHeader: !!src.hasHeader,
            defaultFontSize: Number(src.defaultFontSize) || 14,
            defaultBg: src.defaultBg || '#ffffff', defaultColor: src.defaultColor || '#111111',
            defaultBorderColor: src.defaultBorderColor || '#aaaaaa',
            defaultBorderWidth: Number(src.defaultBorderWidth) || 1,
            cells: [], el: null
          };
          const sc = Array.isArray(src.cells) ? src.cells : [];
          for (let i = 0; i < rows * cols; i++) {
            const s = sc[i] || {};
            tbl.cells.push({
              type: s.type || 'text', text: s.text || '', nodeData: s.nodeData || null,
              bg: s.bg || null, color: s.color || null, fontSize: s.fontSize || null,
              textAlign: s.textAlign || 'left', bold: !!s.bold, italic: !!s.italic
            });
          }
          conTables.push(tbl);
          _buildDOM(tbl);
          return tbl;
        };

        window.conAddTable = function (x, y, rows, cols) {
          const brd = _brd(); if (!brd) return;
          const px = Number.isFinite(x) ? x : Math.max(24, Math.round(brd.clientWidth / 2) - 200);
          const py = Number.isFinite(y) ? y : Math.max(24, Math.round(brd.clientHeight / 2) - 80);
          conPushUndo();
          window.conAddTableFromData({
            x: px, y: py,
            rows: Math.max(1, Number(rows) || 2), cols: Math.max(1, Number(cols) || 4)
          });
        };

        window.conAddTableDialog = async function () {
          const raw = await showPrompt('Rows × Columns (e.g. 3×4):', '2×4');
          if (!raw) return;
          const m = raw.match(/(\d+)\s*[x×,\-]\s*(\d+)/i);
          const rows = m ? Math.max(1, Math.min(20, parseInt(m[1]))) : 2;
          const cols = m ? Math.max(1, Math.min(20, parseInt(m[2]))) : 4;
          const brd = _brd();
          window.conAddTable(
            brd ? Math.max(24, Math.round(brd.clientWidth / 2) - cols * 50) : 60,
            brd ? Math.max(24, Math.round(brd.clientHeight / 2) - rows * 18) : 60,
            rows, cols
          );
        };

        window.conBoardCtxAddTable = function () {
          const x = Number(window._boardCtxNoteX) || 60;
          const y = Number(window._boardCtxNoteY) || 60;
          const rInp = document.getElementById('con-board-ctx-table-rows');
          const cInp = document.getElementById('con-board-ctx-table-cols');
          const rows = Math.max(1, Math.min(20, parseInt(rInp ? rInp.value : 2) || 2));
          const cols = Math.max(1, Math.min(20, parseInt(cInp ? cInp.value : 4) || 4));
          conBoardCtxClose();
          window.conAddTable(x, y, rows, cols);
        };

        // Track node drag for drop-to-cell highlighting
        window._conTblDraggingNodeId = null;

        window._totalW = global._totalW = _totalW;
        window._totalH = global._totalH = _totalH;
        window._applyCellStyle = global._applyCellStyle = _applyCellStyle;
        window._buildDOM = global._buildDOM = _buildDOM;
      })();

  Board.tables = Board.tables || {};
})(typeof window !== "undefined" ? window : this);