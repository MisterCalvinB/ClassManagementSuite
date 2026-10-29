/**
 * Class Management Tools — Board SHAPES Engine
 * Extracted from pages/board.html (Lines 16425-18128)
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
  function _getConMode() { return (typeof window !== 'undefined' && typeof window.conGetMode === 'function') ? window.conGetMode() : ((typeof window !== 'undefined' && window.conMode) || (global && global.conMode) || 'move'); }
  var conNodes = global.conNodes = global.conNodes || [];
  var conEdges = global.conEdges = global.conEdges || [];
  var conDrawings = global.conDrawings = global.conDrawings || [];
  var conShapes = global.conShapes = global.conShapes || [];
  var conNotes = global.conNotes = global.conNotes || [];
  var conGroups = global.conGroups = global.conGroups || [];
  var conMasks = global.conMasks = global.conMasks || [];
  var _conMaskCtxId = global._conMaskCtxId = global._conMaskCtxId || null;
  var CON_DRAW_COLORS = global.CON_DRAW_COLORS = global.CON_DRAW_COLORS || [];
  window.conShapes = conShapes;
  window._conShapeSelected = _conShapeSelected;

  // Safe helper delegates for unit conversions and undo
  var conThicknessUnitToPx = function (val, unit) {
    return (typeof window.conThicknessUnitToPx === 'function') ? window.conThicknessUnitToPx(val, unit) : (Number(val) || 0);
  };
  var conPxToThicknessUnit = function (px, unit) {
    return (typeof window.conPxToThicknessUnit === 'function') ? window.conPxToThicknessUnit(px, unit) : (Number(px) || 0);
  };
  var conFormatThickness = function (px, unit) {
    return (typeof window.conFormatThickness === 'function') ? window.conFormatThickness(px, unit) : (String(px) + 'px');
  };
  var _conSetupThicknessSlider = function (el, unit, context) {
    if (typeof window._conSetupThicknessSlider === 'function') return window._conSetupThicknessSlider(el, unit, context);
  };
  var conPushUndo = function () {
    if (typeof window.conPushUndo === 'function') return window.conPushUndo.apply(window, arguments);
  };

      // ================================================================
      // VECTOR SHAPES
      // ================================================================
      // Note: _conShapeNextId, _conShapeCtxId, _conDrawShapeTool, _conDrawShapeFill,
      // _conDrawShapeDash, _conDrawArrowheadSize, _conDrawColor, _conDrawThickness,
      // _conDrawOpacity, _conDrawHandMode, and _conDrawEraserMode are defined and
      // synchronized globally via board-state.js.

      const CON_SHAPE_TYPES = [
        { id: 'rect', icon: 'Rectangle', title: 'Rectangle' },
        { id: 'circle', icon: 'Circle', title: 'Circle / Ellipse' },
        { id: 'diamond', icon: 'Diamond', title: 'Diamond' },
        { id: 'line', icon: 'Line', title: 'Line' },
        { id: 'arrow', icon: 'Arrow', title: 'Arrow' },
        { id: 'polygon', icon: 'Polygon', title: 'Polygon (click to add points · Ctrl = snap angles · click start point or double-click to close)' },
      ];

      function _conShapeDashArr(style, thickness) {
        const sw = Math.max(1, thickness);
        if (style === 'dashed') return String(sw * 4) + ' ' + String(sw * 2);
        if (style === 'dotted') return String(sw * 0.5) + ' ' + String(sw * 2.5);
        return null;
      }

      function _conShapeGetPAD(s) { return Math.max((s.thickness || 2) + 8, 16); }

      function _conShapeCreateSVGElems(s, PAD) {
        const fill = s.fillColor || 'none';
        const sw = s.thickness || 2;
        const op = Number.isFinite(s.opacity) ? s.opacity : 1;
        const dash = _conShapeDashArr(s.dashStyle || 'solid', sw);
        const hitW = Math.max(20, sw + 14);
        const color = s.color || '#333333';

        function applyVis(el) {
          el.setAttribute('fill', fill);
          el.setAttribute('stroke', color);
          el.setAttribute('stroke-width', String(sw));
          el.setAttribute('stroke-linecap', 'round');
          el.setAttribute('stroke-linejoin', 'round');
          el.setAttribute('opacity', String(op));
          if (dash) el.setAttribute('stroke-dasharray', dash);
          else el.removeAttribute('stroke-dasharray');
          el.style.pointerEvents = 'none';
        }
        function makeHit(tag) {
          const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
          el.setAttribute('fill', 'transparent');
          el.setAttribute('stroke', 'transparent');
          el.setAttribute('stroke-width', String(hitW));
          el.setAttribute('stroke-linecap', 'round');
          el.style.cursor = 'grab';
          return el;
        }

        let defs = null, hitEl, visEl;

        if (s.type === 'rect') {
          hitEl = makeHit('rect');
          hitEl.setAttribute('x', PAD); hitEl.setAttribute('y', PAD);
          hitEl.setAttribute('width', Math.max(1, s.w)); hitEl.setAttribute('height', Math.max(1, s.h));
          hitEl.style.pointerEvents = 'painted';
          visEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          visEl.setAttribute('x', PAD); visEl.setAttribute('y', PAD);
          visEl.setAttribute('width', Math.max(1, s.w)); visEl.setAttribute('height', Math.max(1, s.h));
          applyVis(visEl);

        } else if (s.type === 'circle' || s.type === 'ellipse') {
          const cx = PAD + s.w / 2, cy = PAD + s.h / 2;
          const rx = Math.max(0.5, s.w / 2), ry = Math.max(0.5, s.h / 2);
          hitEl = makeHit('ellipse');
          hitEl.setAttribute('cx', cx); hitEl.setAttribute('cy', cy);
          hitEl.setAttribute('rx', rx); hitEl.setAttribute('ry', ry);
          hitEl.style.pointerEvents = 'painted';
          visEl = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
          visEl.setAttribute('cx', cx); visEl.setAttribute('cy', cy);
          visEl.setAttribute('rx', rx); visEl.setAttribute('ry', ry);
          applyVis(visEl);

        } else if (s.type === 'diamond') {
          const cx = PAD + s.w / 2, top = PAD, right = PAD + s.w, bot = PAD + s.h, left = PAD;
          const pts = `${cx},${top} ${right},${PAD + s.h / 2} ${cx},${bot} ${left},${PAD + s.h / 2}`;
          hitEl = makeHit('polygon');
          hitEl.setAttribute('points', pts);
          hitEl.style.pointerEvents = 'painted';
          visEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          visEl.setAttribute('points', pts);
          applyVis(visEl);

        } else if (s.type === 'line') {
          const x1 = PAD + (s.lx1 - s.x), y1 = PAD + (s.ly1 - s.y);
          const x2 = PAD + (s.lx2 - s.x), y2 = PAD + (s.ly2 - s.y);
          hitEl = makeHit('line');
          hitEl.setAttribute('x1', x1); hitEl.setAttribute('y1', y1);
          hitEl.setAttribute('x2', x2); hitEl.setAttribute('y2', y2);
          hitEl.style.pointerEvents = 'stroke';
          visEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          visEl.setAttribute('x1', x1); visEl.setAttribute('y1', y1);
          visEl.setAttribute('x2', x2); visEl.setAttribute('y2', y2);
          applyVis(visEl);

        } else if (s.type === 'polygon' && s.pts && s.pts.length >= 2) {
          const relPts = s.pts.map(p => `${PAD + (p.x - s.x)},${PAD + (p.y - s.y)}`).join(' ');
          hitEl = makeHit('polygon');
          hitEl.setAttribute('points', relPts);
          hitEl.style.pointerEvents = 'painted';
          visEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          visEl.setAttribute('points', relPts);
          applyVis(visEl);

        } else { // arrow (or polygon fallback)
          const x1 = PAD + (s.lx1 - s.x), y1 = PAD + (s.ly1 - s.y);
          const x2 = PAD + (s.lx2 - s.x), y2 = PAD + (s.ly2 - s.y);
          const mid = s.id + '-am';
          const hitMid = s.id + '-am-hit';
          const ahPx = s.arrowheadSize || _conDrawArrowheadSize || 20;
          const _mwArrow = (ahPx / sw).toFixed(3);
          const _mhArrow = (ahPx / sw * 0.6).toFixed(3);
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
          marker.setAttribute('id', mid);
          marker.setAttribute('viewBox', '0 0 10 6');
          marker.setAttribute('markerWidth', _mwArrow);
          marker.setAttribute('markerHeight', _mhArrow);
          marker.setAttribute('refX', '0');
          marker.setAttribute('refY', '3');
          marker.setAttribute('orient', 'auto');
          marker.setAttribute('markerUnits', 'strokeWidth');
          const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          arrowHead.setAttribute('points', '0 0, 10 3, 0 6');
          arrowHead.setAttribute('fill', color);
          arrowHead.setAttribute('opacity', String(op));
          marker.appendChild(arrowHead);
          defs.appendChild(marker);

          // Transparent hit marker so clicking the arrowhead grabs hitEl
          const hitMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
          hitMarker.setAttribute('id', hitMid);
          hitMarker.setAttribute('data-hit', '1');
          hitMarker.setAttribute('viewBox', '0 0 10 6');
          hitMarker.setAttribute('markerWidth', (parseFloat(_mwArrow) * 1.5).toFixed(3));
          hitMarker.setAttribute('markerHeight', (parseFloat(_mhArrow) * 1.5).toFixed(3));
          hitMarker.setAttribute('refX', '0');
          hitMarker.setAttribute('refY', '3');
          hitMarker.setAttribute('orient', 'auto');
          hitMarker.setAttribute('markerUnits', 'strokeWidth');
          const hitArrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          hitArrowHead.setAttribute('data-hit', '1');
          hitArrowHead.setAttribute('points', '0 0, 10 3, 0 6');
          hitArrowHead.setAttribute('fill', 'transparent');
          hitArrowHead.setAttribute('stroke', 'transparent');
          hitArrowHead.setAttribute('stroke-width', '4');
          hitArrowHead.style.pointerEvents = 'all';
          hitArrowHead.style.cursor = 'grab';
          hitMarker.appendChild(hitArrowHead);
          defs.appendChild(hitMarker);

          hitEl = makeHit('line');
          hitEl.setAttribute('x1', x1); hitEl.setAttribute('y1', y1);
          hitEl.setAttribute('x2', x2); hitEl.setAttribute('y2', y2);
          hitEl.setAttribute('marker-end', 'url(#' + hitMid + ')');
          hitEl.style.pointerEvents = 'stroke';
          visEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          visEl.setAttribute('x1', x1); visEl.setAttribute('y1', y1);
          visEl.setAttribute('x2', x2); visEl.setAttribute('y2', y2);
          applyVis(visEl);
          visEl.setAttribute('stroke-linecap', 'butt');
          visEl.setAttribute('marker-end', 'url(#' + mid + ')');
        }
        return { defs, hitEl, visEl };
      }

      function _conShapeUpdateGeom(s) {
        if (!s.hitEl || !s.visEl) return;
        const PAD = s.pad || _conShapeGetPAD(s);
        if (s.type === 'rect') {
          [s.hitEl, s.visEl].forEach(el => {
            el.setAttribute('width', String(Math.max(1, s.w)));
            el.setAttribute('height', String(Math.max(1, s.h)));
          });
        } else if (s.type === 'circle' || s.type === 'ellipse') {
          const cx = PAD + s.w / 2, cy = PAD + s.h / 2;
          const rx = Math.max(0.5, s.w / 2), ry = Math.max(0.5, s.h / 2);
          [s.hitEl, s.visEl].forEach(el => {
            el.setAttribute('cx', cx); el.setAttribute('cy', cy);
            el.setAttribute('rx', rx); el.setAttribute('ry', ry);
          });
        } else if (s.type === 'diamond') {
          const cx = PAD + s.w / 2, top = PAD, right = PAD + s.w, bot = PAD + s.h, left = PAD;
          const pts = `${cx},${top} ${right},${PAD + s.h / 2} ${cx},${bot} ${left},${PAD + s.h / 2}`;
          [s.hitEl, s.visEl].forEach(el => el.setAttribute('points', pts));
        } else if (s.type === 'line' || s.type === 'arrow') {
          const x1 = PAD + (s.lx1 - s.x), y1 = PAD + (s.ly1 - s.y);
          const x2 = PAD + (s.lx2 - s.x), y2 = PAD + (s.ly2 - s.y);
          [s.hitEl, s.visEl].forEach(el => {
            el.setAttribute('x1', x1); el.setAttribute('y1', y1);
            el.setAttribute('x2', x2); el.setAttribute('y2', y2);
          });
        } else if (s.type === 'polygon' && s.pts) {
          const relPts = s.pts.map(p => `${PAD + (p.x - s.x)},${PAD + (p.y - s.y)}`).join(' ');
          [s.hitEl, s.visEl].forEach(el => el.setAttribute('points', relPts));
        }
        if (s.el) {
          s.el.style.left = (s.x - PAD) + 'px';
          s.el.style.top = (s.y - PAD) + 'px';
          s.el.style.width = (s.w + 2 * PAD) + 'px';
          s.el.style.height = (s.h + 2 * PAD) + 'px';
        }
      }
      window._conShapeUpdateGeom = _conShapeUpdateGeom;

      function _conShapeUpdateStyle(s) {
        if (!s.visEl) return;
        const sw = s.thickness || 2;
        const op = Number.isFinite(s.opacity) ? s.opacity : 1;
        const dash = _conShapeDashArr(s.dashStyle || 'solid', sw);
        const col = s.color || '#333333';
        s.visEl.setAttribute('stroke', col);
        s.visEl.setAttribute('fill', s.fillColor || 'none');
        s.visEl.setAttribute('stroke-width', String(sw));
        s.visEl.setAttribute('opacity', String(op));
        if (dash) s.visEl.setAttribute('stroke-dasharray', dash);
        else s.visEl.removeAttribute('stroke-dasharray');
        if (s.hitEl) s.hitEl.setAttribute('stroke-width', String(Math.max(20, sw + 14)));
        // Update arrowhead
        if (s.type === 'arrow' && s.svgEl) {
          const ap = s.svgEl.querySelector('defs polygon:not([data-hit])');
          if (ap) { ap.setAttribute('fill', col); ap.setAttribute('opacity', String(op)); }
          const mk = s.svgEl.querySelector('defs marker:not([data-hit])');
          if (mk) {
            const ahPx = s.arrowheadSize || _conDrawArrowheadSize || 20;
            const _mw = (ahPx / sw).toFixed(3);
            mk.setAttribute('markerWidth', _mw);
            mk.setAttribute('markerHeight', (parseFloat(_mw) * 0.6).toFixed(3));
          }
          const hmk = s.svgEl.querySelector('defs marker[data-hit]');
          if (hmk) {
            const ahPx = s.arrowheadSize || _conDrawArrowheadSize || 20;
            const _mw = (ahPx / sw).toFixed(3);
            hmk.setAttribute('markerWidth', (parseFloat(_mw) * 1.5).toFixed(3));
            hmk.setAttribute('markerHeight', (parseFloat(_mw) * 0.6 * 1.5).toFixed(3));
          }
        }
      }

      const CON_SHAPE_HANDLES_8 = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
      const CON_SHAPE_HANDLES_2 = ['start', 'end'];

      function _conShapeHandlePos(s, hid) {
        const PAD = s.pad || _conShapeGetPAD(s);
        if (s.type === 'line' || s.type === 'arrow') {
          if (hid === 'start') return { x: PAD + (s.lx1 - s.x), y: PAD + (s.ly1 - s.y) };
          if (hid === 'end') return { x: PAD + (s.lx2 - s.x), y: PAD + (s.ly2 - s.y) };
          return { x: PAD + s.w / 2, y: PAD + s.h / 2 };
        }
        if (s.type === 'polygon' && s.pts) {
          const idx = parseInt(hid.slice(1), 10);
          if (!isNaN(idx) && s.pts[idx]) return { x: PAD + (s.pts[idx].x - s.x), y: PAD + (s.pts[idx].y - s.y) };
        }
        const cx = PAD + s.w / 2, cy = PAD + s.h / 2;
        const ex = PAD + s.w, ey = PAD + s.h;
        const map = {
          nw: [PAD, PAD], n: [cx, PAD], ne: [ex, PAD],
          w: [PAD, cy], e: [ex, cy],
          sw: [PAD, ey], s: [cx, ey], se: [ex, ey]
        };
        const [hx, hy] = map[hid] || [PAD, PAD];
        return { x: hx, y: hy };
      }

      function _conShapeAddHandles(s) {
        if (!s.el) return;
        s.el.querySelectorAll('.con-shape-handle').forEach(h => h.remove());
        let hids;
        if (s.type === 'line' || s.type === 'arrow') {
          hids = ['start', 'end'];
        } else if (s.type === 'polygon' && s.pts) {
          hids = s.pts.map((_, i) => 'p' + i);
        } else {
          hids = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        }
        const cursors = {
          nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
          w: 'w-resize', e: 'e-resize',
          sw: 'sw-resize', s: 's-resize', se: 'se-resize',
          start: 'move', end: 'move'
        };
        hids.forEach(hid => {
          const hel = document.createElement('div');
          hel.className = 'con-shape-handle';
          hel.dataset.h = hid;
          const { x, y } = _conShapeHandlePos(s, hid);
          hel.style.left = (x - 4.5) + 'px';
          hel.style.top = (y - 4.5) + 'px';
          hel.style.cursor = cursors[hid] || 'pointer';
          _conShapeHandleResize(s, hel, hid);
          s.el.appendChild(hel);
        });
      }

      function _conShapeUpdateHandles(s) {
        if (!s.el) return;
        s.el.querySelectorAll('.con-shape-handle').forEach(hel => {
          const { x, y } = _conShapeHandlePos(s, hel.dataset.h);
          hel.style.left = (x - 4.5) + 'px';
          hel.style.top = (y - 4.5) + 'px';
        });
      }

      function _conShapeHandleResize(s, hel, hid) {
        hel.addEventListener('mousedown', function (e) {
          if (e.button !== 0 || _getConMode() !== 'move') return;
          e.preventDefault(); e.stopPropagation();
          window._conMirrorDragging = true;
          let _shapeResizeUndoPushed = false;
          let _shapeResizeRaf = null;
          function _sendShapeResize() {
            if (!window._conMirrorSend) return;
            window._conMirrorSend({
              type: 'shape-resize',
              id: String(s.id),
              x: s.x, y: s.y, w: s.w, h: s.h,
              lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2,
              pts: s.pts ? s.pts.map(p => ({ ...p })) : null
            });
          }
          const zoom = window.conCurrentZoom || 1;
          // Polygon vertex drag
          if (hid.startsWith('p') && s.pts) {
            const idx = parseInt(hid.slice(1), 10);
            const snapPt = { ...s.pts[idx] };
            function onMovePoly(ev) {
              const dx = (ev.clientX - e.clientX) / zoom, dy = (ev.clientY - e.clientY) / zoom;
              if (!_shapeResizeUndoPushed && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
                conPushUndo();
                _shapeResizeUndoPushed = true;
              }
              s.pts[idx] = { x: snapPt.x + dx, y: snapPt.y + dy };
              const xs = s.pts.map(p => p.x), ys = s.pts.map(p => p.y);
              s.x = Math.min(...xs); s.y = Math.min(...ys);
              s.w = Math.max(2, Math.max(...xs) - s.x);
              s.h = Math.max(2, Math.max(...ys) - s.y);
              _conShapeUpdateGeom(s);
              _conShapeUpdateHandles(s);
              if (!_shapeResizeRaf) {
                _shapeResizeRaf = requestAnimationFrame(function () {
                  _shapeResizeRaf = null;
                  _sendShapeResize();
                });
              }
            }
            function onUpPoly(ev) {
              document.removeEventListener('mousemove', onMovePoly);
              document.removeEventListener('mouseup', onUpPoly);
              if (_shapeResizeRaf) { cancelAnimationFrame(_shapeResizeRaf); _shapeResizeRaf = null; }
              window._conMirrorDragging = false;
              _sendShapeResize();
              if (_shapeResizeUndoPushed && typeof window.conMarkBoardDirty === 'function') {
                window.conMarkBoardDirty();
              }
            }
            document.addEventListener('mousemove', onMovePoly);
            document.addEventListener('mouseup', onUpPoly);
            return;
          }
          const snap = {
            x: s.x, y: s.y, w: s.w, h: s.h,
            lx1: s.lx1, ly1: s.ly1, lx2: s.lx2, ly2: s.ly2
          };
          function onMove(ev) {
            const dx = (ev.clientX - e.clientX) / zoom, dy = (ev.clientY - e.clientY) / zoom;
            if (!_shapeResizeUndoPushed && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
              conPushUndo();
              _shapeResizeUndoPushed = true;
            }
            if (hid === 'start') {
              s.lx1 = snap.lx1 + dx; s.ly1 = snap.ly1 + dy;
              s.x = Math.min(s.lx1, s.lx2); s.y = Math.min(s.ly1, s.ly2);
              s.w = Math.max(2, Math.abs(s.lx2 - s.lx1));
              s.h = Math.max(2, Math.abs(s.ly2 - s.ly1));
            } else if (hid === 'end') {
              s.lx2 = snap.lx2 + dx; s.ly2 = snap.ly2 + dy;
              s.x = Math.min(s.lx1, s.lx2); s.y = Math.min(s.ly1, s.ly2);
              s.w = Math.max(2, Math.abs(s.lx2 - s.lx1));
              s.h = Math.max(2, Math.abs(s.ly2 - s.ly1));
            } else {
              let nx = snap.x, ny = snap.y, nw = snap.w, nh = snap.h;
              if (hid.includes('n')) { ny = snap.y + dy; nh = Math.max(2, snap.h - dy); }
              if (hid.includes('s')) { nh = Math.max(2, snap.h + dy); }
              if (hid.includes('w')) { nx = snap.x + dx; nw = Math.max(2, snap.w - dx); }
              if (hid.includes('e')) { nw = Math.max(2, snap.w + dx); }
              s.x = nx; s.y = ny; s.w = nw; s.h = nh;
            }
            _conShapeUpdateGeom(s);
            _conShapeUpdateHandles(s);
            if (!_shapeResizeRaf) {
              _shapeResizeRaf = requestAnimationFrame(function () {
                _shapeResizeRaf = null;
                _sendShapeResize();
              });
            }
          }
          function onUp(ev) {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (_shapeResizeRaf) { cancelAnimationFrame(_shapeResizeRaf); _shapeResizeRaf = null; }
            window._conMirrorDragging = false;
            _sendShapeResize();
            if (_shapeResizeUndoPushed && typeof window.conMarkBoardDirty === 'function') {
              window.conMarkBoardDirty();
            }
          }
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
      }

      function _conShapeShowHandles(s) {
        if (!s.el) return;
        s.el.querySelectorAll('.con-shape-handle').forEach(h => h.style.display = 'block');
      }
      function _conShapeHideHandles(s) {
        if (!s.el) return;
        s.el.querySelectorAll('.con-shape-handle').forEach(h => h.style.display = 'none');
      }

      window.conShapeClearSelection = function () {
        _conShapeSelected.forEach(sid => {
          const s = conShapes.find(x => x.id === sid);
          if (s) {
            if (s.el) {
              s.el.classList.remove('con-shape-selected');
              s.el.style.zIndex = '500';
            }
            _conShapeHideHandles(s);
          }
        });
        _conShapeSelected.clear();
        document.querySelectorAll('#constellation-board .con-shape.con-shape-selected')
          .forEach(el => {
            el.classList.remove('con-shape-selected');
            el.style.zIndex = '500';
          });
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
      };
      window.conGetShapeSelected = function () { return _conShapeSelected; };
      window.conGetShapes = global.conGetShapes = function () {
        return (typeof window !== 'undefined' && Array.isArray(window.conShapes))
          ? window.conShapes
          : (Array.isArray(global.conShapes) ? global.conShapes : conShapes);
      };

      function _conShapeAttachHitEvents(s) {
        if (!s.hitEl) return;
        let dragging = false;
        s.hitEl.addEventListener('mousedown', function (e) {
          if (document.body.classList.contains('laser-active')) return;
          if (e.button !== 0 || _getConMode() !== 'move') return;
          // If shape belongs to a group, forward the event to the group element
          const ownerGroup = conGroups.find(g => (g.shapeIds || []).includes(s.id));
          if (ownerGroup) {
            e.preventDefault(); e.stopPropagation();
            ownerGroup.el.dispatchEvent(new MouseEvent('mousedown', {
              bubbles: false, cancelable: true,
              clientX: e.clientX, clientY: e.clientY, button: 0
            }));
            return;
          }
          e.preventDefault(); e.stopPropagation();
          if (e.ctrlKey || e.metaKey) {
            if (_conShapeSelected.has(s.id)) {
              _conShapeSelected.delete(s.id); s.el.classList.remove('con-shape-selected');
              _conShapeHideHandles(s);
            } else {
              _conShapeSelected.add(s.id); s.el.classList.add('con-shape-selected');
              _conShapeShowHandles(s);
            }
            if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
            return;
          }
          if (!_conShapeSelected.has(s.id)) {
            if (window.conNodeClearSelection) window.conNodeClearSelection();
            if (window.conDrawingClearSelection) window.conDrawingClearSelection();
            if (window.conNoteClearSelection) window.conNoteClearSelection();
            if (typeof conTableClearSelection === 'function') conTableClearSelection();
            window.conShapeClearSelection();
            _conShapeSelected.add(s.id); s.el.classList.add('con-shape-selected');
            _conShapeShowHandles(s);
          }
          if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
          dragging = true;
          window._conMirrorDragging = true;
          s.el.style.zIndex = '520';
          s.hitEl.style.cursor = 'grabbing';
          const snaps = [];
          let _dragShapeRaf = null;
          let _pendingShapeMoveMsg = null;
          let _shapeDragUndoPushed = false;
          const _allShapesList = (window.conGetShapes ? window.conGetShapes() : (window.conShapes || conShapes));
          _conShapeSelected.forEach(sid => {
            const sh = _allShapesList.find(x => x.id === sid);
            if (sh) snaps.push({
              sh, sx: sh.x, sy: sh.y,
              slx1: sh.lx1, sly1: sh.ly1, slx2: sh.lx2, sly2: sh.ly2,
              spts: sh.pts ? sh.pts.map(p => ({ ...p })) : null
            });
          });
          // Snapshot co-selected nodes
          const _shapeNodeSnaps = [];
          const _sAllNodes = new Set(window.conGetMultiSelected ? window.conGetMultiSelected() : (typeof conMultiSelected !== 'undefined' ? conMultiSelected : []));
          if (typeof conSelected !== 'undefined' && conSelected) _sAllNodes.add(conSelected);
          if (window.conGetSelected && window.conGetSelected()) _sAllNodes.add(window.conGetSelected());
          const _sNodesList = window.conGetNodes ? window.conGetNodes() : [];
          _sAllNodes.forEach(nid => {
            const nd = _sNodesList.find(n => n.id === nid);
            if (nd && !(typeof conIsNodeLocked === 'function' && conIsNodeLocked(nd))) {
              _shapeNodeSnaps.push({ nd, sx: nd.x, sy: nd.y });
            }
          });
          // Snapshot co-selected notes
          const _shapeNoteSnaps = [];
          const _sNoteSel = window.conGetNoteSelected ? window.conGetNoteSelected() : (typeof conNoteSelected !== 'undefined' ? conNoteSelected : new Set());
          const _sNotesList = window.conGetNotes ? window.conGetNotes() : [];
          _sNoteSel.forEach(nid => {
            const nd = _sNotesList.find(n => n.id === nid);
            if (nd && !nd.locked) _shapeNoteSnaps.push({ nd, sx: nd.x, sy: nd.y });
          });
          // Snapshot co-selected drawings
          const _shapeDrawSnaps = [];
          const _sDrawSel = window.conGetDrawingSelected ? window.conGetDrawingSelected() : (typeof conDrawingSelected !== 'undefined' ? conDrawingSelected : new Set());
          const _sDrawList = window.conGetDrawings ? window.conGetDrawings() : [];
          _sDrawSel.forEach(did => {
            const dr = _sDrawList.find(x => x.id === did);
            if (dr) _shapeDrawSnaps.push({ dr, sx: dr.x, sy: dr.y, pad: dr.pad || Math.max((dr.thickness || 2) + 4, 12) });
          });
          // Snapshot co-selected tables
          const _shapeTableSnaps = [];
          const _sTableSel = window.conGetTableSelected ? window.conGetTableSelected() : (typeof conTableSelected !== 'undefined' ? conTableSelected : new Set());
          const _sTablesList = window.conGetTables ? window.conGetTables() : [];
          _sTableSel.forEach(tid => {
            const tbl = _sTablesList.find(t => t.id === tid);
            if (tbl && !tbl.locked) _shapeTableSnaps.push({ tbl, sx: tbl.x, sy: tbl.y });
          });
          function onMove(ev) {
            if (!dragging) return;
            const zoom = window.conCurrentZoom || 1;
            const dx = (ev.clientX - e.clientX) / zoom, dy = (ev.clientY - e.clientY) / zoom;
            if (!_shapeDragUndoPushed && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
              conPushUndo();
              _shapeDragUndoPushed = true;
            }
            // Clear previous snap lines
            const svgEl = document.getElementById('constellation-svg');
            const brd = document.getElementById('constellation-board');
            document.querySelectorAll('.con-snap-line').forEach(l => l.remove());
            snaps.forEach(({ sh, sx, sy, slx1, sly1, slx2, sly2, spts }) => {
              let nx = sx + dx, ny = sy + dy;
              // Snap alignment for shapes
              if (typeof conSnapEnabled !== 'undefined' && conSnapEnabled && !ev.altKey) {
                const SNAP_DIST = 8;
                const elW = Math.max(2, sh.w || 40);
                const elH = Math.max(2, sh.h || 40);
                const dragAnchorsX = [nx, nx + elW / 2, nx + elW];
                const dragAnchorsY = [ny, ny + elH / 2, ny + elH];
                let bestSnapX = null, bestSnapY = null;
                conNodes.forEach(sn => {
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
                conNotes.forEach(on => {
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
                conShapes.forEach(os => {
                  if (os.id === sh.id) return;
                  const sW = Math.max(2, os.w || 40), sH = Math.max(2, os.h || 40);
                  [os.x, os.x + sW / 2, os.x + sW].forEach(na => {
                    dragAnchorsX.forEach(da => {
                      const diff = Math.abs(da - na);
                      if (diff < SNAP_DIST && (!bestSnapX || diff < bestSnapX.diff)) bestSnapX = { nx: nx + (na - da), line: na, diff };
                    });
                  });
                  [os.y, os.y + sH / 2, os.y + sH].forEach(na => {
                    dragAnchorsY.forEach(da => {
                      const diff = Math.abs(da - na);
                      if (diff < SNAP_DIST && (!bestSnapY || diff < bestSnapY.diff)) bestSnapY = { ny: ny + (na - da), line: na, diff };
                    });
                  });
                });
                if (bestSnapX !== null) {
                  nx = Math.max(0, bestSnapX.nx);
                  if (svgEl) {
                    const sl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    sl.setAttribute('class', 'con-snap-line');
                    sl.setAttribute('x1', bestSnapX.line); sl.setAttribute('y1', 0);
                    sl.setAttribute('x2', bestSnapX.line); sl.setAttribute('y2', Math.max((brd && brd.clientHeight) || 0, (brd && brd.scrollHeight) || 0));
                    svgEl.appendChild(sl);
                  }
                }
                if (bestSnapY !== null) {
                  ny = Math.max(0, bestSnapY.ny);
                  if (svgEl) {
                    const sl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    sl.setAttribute('class', 'con-snap-line');
                    sl.setAttribute('x1', 0); sl.setAttribute('y1', bestSnapY.line);
                    sl.setAttribute('x2', Math.max((brd && brd.clientWidth) || 0, (brd && brd.scrollWidth) || 0)); sl.setAttribute('y2', bestSnapY.line);
                    svgEl.appendChild(sl);
                  }
                }
              }
              // Apply new position
              sh.x = nx; sh.y = ny;
              if (sh.lx1 !== undefined) {
                sh.lx1 = slx1 + (nx - sx); sh.ly1 = sly1 + (ny - sy);
                sh.lx2 = slx2 + (nx - sx); sh.ly2 = sly2 + (ny - sy);
              }
              if (spts) sh.pts = spts.map(p => ({ x: p.x + (nx - sx), y: p.y + (ny - sy) }));
              if (sh.el) {
                sh.el.style.left = (sh.x - sh.pad) + 'px';
                sh.el.style.top = (sh.y - sh.pad) + 'px';
              }
              _conShapeUpdateHandles(sh);
            });
            // Move co-selected nodes
            if (_shapeNodeSnaps.length > 0) {
              _shapeNodeSnaps.forEach(({ nd, sx, sy }) => {
                nd.x = sx + dx; nd.y = sy + dy;
                if (nd.el) { nd.el.style.left = nd.x + 'px'; nd.el.style.top = nd.y + 'px'; }
              });
              if (window.conRedrawEdges) window.conRedrawEdges();
              if (window.conGroupRefitAll) window.conGroupRefitAll();
            }
            // Move co-selected notes
            if (_shapeNoteSnaps.length > 0) {
              _shapeNoteSnaps.forEach(({ nd, sx, sy }) => {
                nd.x = sx + dx; nd.y = sy + dy;
                const noteEl = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nd.id) : document.querySelector(`.con-word-note[data-id="${nd.id}"]`);
                if (noteEl) { noteEl.style.left = nd.x + 'px'; noteEl.style.top = nd.y + 'px'; }
              });
            }
            // Move co-selected drawings
            if (_shapeDrawSnaps.length > 0) {
              _shapeDrawSnaps.forEach(({ dr, sx, sy, pad }) => {
                dr.x = sx + dx; dr.y = sy + dy;
                const p = pad !== undefined ? pad : (dr.pad || 12);
                if (dr.el) { dr.el.style.left = (dr.x - p) + 'px'; dr.el.style.top = (dr.y - p) + 'px'; }
              });
            }
            // Move co-selected tables
            if (_shapeTableSnaps.length > 0) {
              _shapeTableSnaps.forEach(({ tbl, sx, sy }) => {
                tbl.x = Math.max(0, sx + dx); tbl.y = Math.max(0, sy + dy);
                if (tbl.el) { tbl.el.style.left = tbl.x + 'px'; tbl.el.style.top = tbl.y + 'px'; }
              });
            }
            if (window._conMirrorSend) {
              _pendingShapeMoveMsg = {
                type: 'shape-move',
                positions: snaps.map(({ sh }) => ({
                  id: sh.id,
                  x: sh.x,
                  y: sh.y,
                  lx1: sh.lx1,
                  ly1: sh.ly1,
                  lx2: sh.lx2,
                  ly2: sh.ly2,
                  pts: sh.pts ? sh.pts.map(p => ({ ...p })) : undefined
                }))
              };
              if (!_dragShapeRaf) {
                _dragShapeRaf = requestAnimationFrame(function () {
                  _dragShapeRaf = null;
                  if (window._conMirrorSend) {
                    if (_pendingShapeMoveMsg) window._conMirrorSend(_pendingShapeMoveMsg);
                    if (_shapeNodeSnaps.length > 0) {
                      window._conMirrorSend({ type: 'node-move', positions: _shapeNodeSnaps.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
                    }
                    if (_shapeNoteSnaps.length > 0) {
                      window._conMirrorSend({ type: 'note-move', positions: _shapeNoteSnaps.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
                    }
                    if (_shapeDrawSnaps.length > 0) {
                      window._conMirrorSend({ type: 'drawing-move', positions: _shapeDrawSnaps.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y })) });
                    }
                    if (_shapeTableSnaps.length > 0) {
                      window._conMirrorSend({ type: 'table-move', positions: _shapeTableSnaps.map(({ tbl }) => ({ id: tbl.id, x: tbl.x, y: tbl.y })) });
                    }
                  }
                });
              }
            }
          }
          function onUp(ev) {
            if (_dragShapeRaf) { cancelAnimationFrame(_dragShapeRaf); _dragShapeRaf = null; }
            const _hasActuallyMoved = ev ? (Math.abs(ev.clientX - e.clientX) > 2 || Math.abs(ev.clientY - e.clientY) > 2) : false;
            if (window._conMirrorSend && _hasActuallyMoved) {
              window._conMirrorSend({
                type: 'shape-move',
                positions: snaps.map(({ sh }) => ({
                  id: sh.id,
                  x: sh.x,
                  y: sh.y,
                  lx1: sh.lx1,
                  ly1: sh.ly1,
                  lx2: sh.lx2,
                  ly2: sh.ly2,
                  pts: sh.pts ? sh.pts.map(p => ({ ...p })) : undefined
                }))
              });
              if (_shapeNodeSnaps.length > 0) {
                window._conMirrorSend({ type: 'node-move', positions: _shapeNodeSnaps.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
              }
              if (_shapeNoteSnaps.length > 0) {
                window._conMirrorSend({ type: 'note-move', positions: _shapeNoteSnaps.map(({ nd }) => ({ id: nd.id, x: nd.x, y: nd.y })) });
              }
              if (_shapeDrawSnaps.length > 0) {
                window._conMirrorSend({ type: 'drawing-move', positions: _shapeDrawSnaps.map(({ dr }) => ({ id: dr.id, x: dr.x, y: dr.y })) });
              }
              if (_shapeTableSnaps.length > 0) {
                window._conMirrorSend({ type: 'table-move', positions: _shapeTableSnaps.map(({ tbl }) => ({ id: tbl.id, x: tbl.x, y: tbl.y })) });
              }
              if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
            } else if (!_hasActuallyMoved && ev && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey) {
              const _totalOther = (_conShapeSelected.size > 1 ? _conShapeSelected.size - 1 : 0) + _shapeNodeSnaps.length + _shapeNoteSnaps.length + _shapeDrawSnaps.length + _shapeTableSnaps.length;
              if (_totalOther > 0) {
                if (window.conNodeClearSelection) window.conNodeClearSelection();
                if (window.conNoteClearSelection) window.conNoteClearSelection();
                if (window.conDrawingClearSelection) window.conDrawingClearSelection();
                if (typeof conTableClearSelection === 'function') conTableClearSelection();
                window.conShapeClearSelection();
                _conShapeSelected.add(s.id); s.el.classList.add('con-shape-selected');
                _conShapeShowHandles(s);
                if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
              }
            }
            _pendingShapeMoveMsg = null;
            dragging = false;
            s.el.style.zIndex = '500';
            if (s.hitEl) s.hitEl.style.cursor = 'grab';
            if (_hasActuallyMoved && typeof window.conMarkBoardDirty === 'function') {
              window.conMarkBoardDirty();
            }
            // Clear snap lines
            document.querySelectorAll('.con-snap-line').forEach(l => l.remove());
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            setTimeout(() => {
              window._conMirrorDragging = false;
            }, 60);
          }
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
        s.hitEl.addEventListener('contextmenu', function (e) {
          if (document.body.classList.contains('laser-active')) return;
          e.preventDefault(); e.stopPropagation();
          // If shape belongs to a group, open the group context menu instead
          const ownerGroup = conGroups.find(g => (g.shapeIds || []).includes(s.id));
          if (ownerGroup) { conGroupCtxOpen(e, ownerGroup.id); return; }
          if (!_conShapeSelected.has(s.id)) {
            const hasOtherSelection = (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0)
              || (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0)
              || (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 0)
              || (_conShapeSelected && _conShapeSelected.size > 0);
            if (!hasOtherSelection) {
              _conShapeSelected.add(s.id);
              if (s.el) s.el.classList.add('con-shape-selected');
              if (typeof _conShapeShowHandles === 'function') _conShapeShowHandles(s);
            }
          }
          conShapeCtxOpen(e, s.id);
        });
      }

      function conShapeBuild(s) {
        const brd = (typeof board === 'function') ? board() : document.getElementById('constellation-board');
        if (!brd) return;
        const PAD = _conShapeGetPAD(s);
        s.pad = PAD;
        const el = document.createElement('div');
        el.className = 'con-shape';
        el.dataset.sid = s.id;
        el.style.cssText = 'position:absolute;left:' + (s.x - PAD) + 'px;top:' + (s.y - PAD) +
          'px;width:' + (s.w + 2 * PAD) + 'px;height:' + (s.h + 2 * PAD) +
          'px;z-index:500;pointer-events:none;overflow:visible;';
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgEl.style.cssText = 'position:absolute;top:0;left:0;overflow:visible;width:100%;height:100%;pointer-events:none;';
        el.appendChild(svgEl);
        s.el = el; s.svgEl = svgEl;
        const { defs, hitEl, visEl } = _conShapeCreateSVGElems(s, PAD);
        if (defs) svgEl.appendChild(defs);
        svgEl.appendChild(hitEl);
        svgEl.appendChild(visEl);
        s.hitEl = hitEl; s.visEl = visEl;
        _conShapeAddHandles(s);
        brd.appendChild(el);
        _conShapeAttachHitEvents(s);
      }
      window.conShapeBuild = conShapeBuild;

      function conShapeFullRebuild(s) {
        if (!s.svgEl) return;
        const PAD = _conShapeGetPAD(s);
        s.pad = PAD;
        s.svgEl.innerHTML = '';
        const { defs, hitEl, visEl } = _conShapeCreateSVGElems(s, PAD);
        if (defs) s.svgEl.appendChild(defs);
        s.svgEl.appendChild(hitEl);
        s.svgEl.appendChild(visEl);
        s.hitEl = hitEl; s.visEl = visEl;
        if (s.el) {
          s.el.style.left = (s.x - PAD) + 'px'; s.el.style.top = (s.y - PAD) + 'px';
          s.el.style.width = (s.w + 2 * PAD) + 'px'; s.el.style.height = (s.h + 2 * PAD) + 'px';
        }
        _conShapeAddHandles(s);
        if (_conShapeSelected.has(s.id)) _conShapeShowHandles(s);
        _conShapeAttachHitEvents(s);
      }

      window.conShapesClear = function () {
        const list = (window.conGetShapes ? window.conGetShapes() : conShapes) || [];
        list.forEach(s => { if (s && s.el) s.el.remove(); });
        list.length = 0;
        if (Array.isArray(conShapes) && conShapes !== list) conShapes.length = 0;
        if (Array.isArray(global.conShapes) && global.conShapes !== list) global.conShapes.length = 0;
        if (Array.isArray(window.conShapes) && window.conShapes !== list) window.conShapes.length = 0;
        _conShapeNextId = 1;
        _conShapeCtxId = null;
        _conShapeSelected.clear();
        const overlay = document.getElementById('con-shape-style-overlay');
        if (overlay) overlay.classList.remove('active');
      };

      function conShapeFromData(src) {
        const idStr = (src.id != null && String(src.id).trim()) ? String(src.id).trim() : 'cs' + (_conShapeNextId++);
        const idNum = parseInt(String(idStr).replace(/^cs/, ''), 10);
        if (!isNaN(idNum)) _conShapeNextId = Math.max(_conShapeNextId, idNum + 1);
        const sx = Number(src.x) || 0;
        const sy = Number(src.y) || 0;
        const sw = Math.max(2, Number(src.w) || 40);
        const sh = Math.max(2, Number(src.h) || 40);
        const s = {
          id: idStr,
          type: src.type || 'rect',
          x: sx, y: sy,
          w: sw, h: sh,
          lx1: (src.lx1 != null && !isNaN(Number(src.lx1))) ? Number(src.lx1) : sx,
          ly1: (src.ly1 != null && !isNaN(Number(src.ly1))) ? Number(src.ly1) : sy,
          lx2: (src.lx2 != null && !isNaN(Number(src.lx2))) ? Number(src.lx2) : (sx + sw),
          ly2: (src.ly2 != null && !isNaN(Number(src.ly2))) ? Number(src.ly2) : (sy + sh),
          color: src.color || '#333333',
          fillColor: src.fillColor != null ? src.fillColor : 'none',
          thickness: Number(src.thickness) || 2,
          opacity: Number.isFinite(Number(src.opacity)) && Number(src.opacity) > 0 ? Number(src.opacity) : 1,
          dashStyle: src.dashStyle || 'solid',
          arrowheadSize: Number(src.arrowheadSize) || null,
          pts: Array.isArray(src.pts) ? src.pts.map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })) : null,
          el: null, svgEl: null, hitEl: null, visEl: null, pad: 0
        };
        const list = (window.conGetShapes ? window.conGetShapes() : conShapes) || conShapes;
        list.push(s);
        if (Array.isArray(conShapes) && conShapes !== list) conShapes.push(s);
        if (Array.isArray(window.conShapes) && window.conShapes !== list) window.conShapes.push(s);
        if (Array.isArray(global.conShapes) && global.conShapes !== list) global.conShapes.push(s);
        conShapeBuild(s);
        return s;
      }
      window.conShapeFromData = conShapeFromData;

      // ---- Shape draw panel UI ----
      function conShapeInitPanel() {
        const typeBtns = document.getElementById('con-shape-type-btns');
        if (typeBtns && !typeBtns.childElementCount) {
          // Freehand button (pen — no shape selected)
          const fbtn = document.createElement('button');
          fbtn.className = 'action-btn btn-grey';
          fbtn.id = 'con-draw-freehand-btn';
          fbtn.textContent = 'Freehand';
          fbtn.title = 'Freehand pen';
          fbtn.style.cssText = 'font-size:0.75rem;padding:3px 8px;';
          fbtn.onclick = () => {
            _conDrawHandMode = false;
            _conDrawEraserMode = false;
            _conDrawShapeTool = null;
            _conShapeSyncPanelState();
            _conDrawSyncOverlayCursor();
            if (window.conDrawCloseAllMenus) window.conDrawCloseAllMenus();
          };
          typeBtns.appendChild(fbtn);

          const SHAPE_DEFS = [
            { id: 'rect', label: 'Rectangle', title: 'Rectangle' },
            { id: 'circle', label: 'Circle', title: 'Circle / Ellipse' },
            { id: 'diamond', label: 'Diamond', title: 'Diamond' },
            { id: 'line', label: 'Line', title: 'Line' },
            { id: 'arrow', label: 'Arrow', title: 'Arrow' },
            { id: 'polygon', label: 'Polygon', title: 'Polygon (click to add points · Ctrl = snap angles · click start point or double-click to close)' }
          ];
          SHAPE_DEFS.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'action-btn btn-grey';
            btn.dataset.stype = t.id;
            btn.textContent = t.label;
            btn.title = t.title;
            btn.style.cssText = 'font-size:0.75rem;padding:3px 8px;';
            btn.onclick = () => {
              conDrawSetShapeTool(t.id);
              if (window.conDrawCloseAllMenus) window.conDrawCloseAllMenus();
            };
            typeBtns.appendChild(btn);
          });
        }
        const dashBtns = document.getElementById('con-shape-dash-btns');
        if (dashBtns && !dashBtns.childElementCount) {
          [['solid', 'Solid', 'Solid line'], ['dashed', 'Dashed', 'Dashed line'], ['dotted', 'Dotted', 'Dotted line']].forEach(([style, label, tip]) => {
            const btn = document.createElement('button');
            btn.className = 'action-btn btn-grey';
            btn.dataset.dash = style;
            btn.title = tip;
            btn.textContent = label;
            btn.style.cssText = 'font-size:0.72rem;padding:3px 6px;';
            btn.onclick = () => conShapeSetDrawDash(style);
            dashBtns.appendChild(btn);
          });
        }
        _conShapeSyncPanelState();
      }
      window.conShapeInitPanel = conShapeInitPanel;

      function _conShapeSyncPanelState() {
        // Sync type buttons
        const typeBtns = document.getElementById('con-shape-type-btns');
        if (typeBtns) typeBtns.querySelectorAll('button[data-stype]').forEach(btn => {
          btn.classList.toggle('con-panel-active', btn.dataset.stype === _conDrawShapeTool);
        });
        // Sync dash buttons
        const dashBtns = document.getElementById('con-shape-dash-btns');
        if (dashBtns) dashBtns.querySelectorAll('button[data-dash]').forEach(btn => {
          btn.classList.toggle('con-panel-active', btn.dataset.dash === _conDrawShapeDash);
        });
        // Sync fill none button
        const noneBtn = document.getElementById('con-shape-fill-none-btn');
        if (noneBtn) {
          noneBtn.style.background = _conDrawShapeFill === 'none' ? '#111' : '#f5f5f5';
          noneBtn.style.color = _conDrawShapeFill === 'none' ? '#fff' : '';
          noneBtn.style.borderColor = _conDrawShapeFill === 'none' ? '#111' : '#ccc';
        }
        const fillInput = document.getElementById('con-shape-fill-input');
        if (fillInput && _conDrawShapeFill !== 'none') fillInput.value = _conDrawShapeFill;
        // Sync freehand button (active when no shape tool and not erasing)
        const freehandBtn = document.getElementById('con-draw-freehand-btn');
        if (freehandBtn) {
          freehandBtn.classList.toggle('con-panel-active', _conDrawShapeTool === null && !_conDrawEraserMode);
        }
        // Sync shapes button label on toolbar
        const shapesBtnLabel = document.getElementById('con-draw-shapes-btn-label');
        if (shapesBtnLabel) {
          const shapeNames = {
            rect: 'Rectangle',
            circle: 'Circle',
            diamond: 'Diamond',
            line: 'Line',
            arrow: 'Arrow',
            polygon: 'Polygon'
          };
          if (_conDrawShapeTool && shapeNames[_conDrawShapeTool]) {
            shapesBtnLabel.textContent = shapeNames[_conDrawShapeTool];
          } else {
            shapesBtnLabel.textContent = 'Shapes';
          }
        }
        // Sync eraser button
        const eraserBtn = document.getElementById('con-draw-eraser-btn');
        if (eraserBtn) {
          eraserBtn.classList.toggle('con-panel-active', _conDrawEraserMode);
          const lbl = document.getElementById('con-draw-eraser-label');
          if (lbl) {
            lbl.textContent = _conDrawEraserMode
              ? (typeof i18n !== 'undefined' && i18n.t ? i18n.t('conDrawErasing') || 'Erasing' : 'Erasing')
              : (typeof i18n !== 'undefined' && i18n.t ? i18n.t('conDrawErase') || 'Erase' : 'Erase');
          } else {
            eraserBtn.innerHTML = '<img src="../assets/icons/eraser.svg" class="btn-icon" alt="" /> <span id="con-draw-eraser-label">' + (_conDrawEraserMode ? 'Erasing' : 'Erase') + '</span>';
          }
        }
        const handBtn = document.getElementById('con-draw-hand-btn');
        if (handBtn) handBtn.classList.toggle('con-panel-active', !!_conDrawHandMode);
        // Show/hide arrowhead size controls (only for arrow tool)
        const _showAh = _conDrawShapeTool === 'arrow';
        const ahGroup = document.getElementById('con-draw-arrowhead-group');
        if (ahGroup) ahGroup.style.display = _showAh ? 'block' : 'none';
        ['con-draw-arrowhead-sep', 'con-draw-arrowhead-label', 'con-draw-arrowhead-slider', 'con-draw-arrowhead-val'].forEach(function (eid) {
          const _ahEl = document.getElementById(eid);
          if (_ahEl) _ahEl.style.display = _showAh ? '' : 'none';
        });
        if (typeof _conSyncEraserToolbarBtn === 'function') {
          _conSyncEraserToolbarBtn();
        }
      }

      function _conDrawSyncOverlayCursor() {
        const overlay = document.getElementById('con-draw-overlay');
        if (!overlay) return;
        if (_conDrawHandMode) {
          overlay.classList.remove('con-eraser-active');
          overlay.style.cursor = 'grab';
          return;
        }
        overlay.classList.toggle('con-eraser-active', !!_conDrawEraserMode);
        overlay.style.cursor = _conDrawEraserMode ? 'none' : 'crosshair';
      }
      window._conShapeSyncPanelState = _conShapeSyncPanelState;
      window._conDrawSyncOverlayCursor = _conDrawSyncOverlayCursor;

      window.conDrawToggleHand = function (forceOn) {
        if (forceOn === true) _conDrawHandMode = true;
        else if (forceOn === false) _conDrawHandMode = false;
        else _conDrawHandMode = !_conDrawHandMode;
        if (_conDrawHandMode && _conDrawEraserMode) _conDrawEraserMode = false;
        _conShapeSyncPanelState();
        _conDrawSyncOverlayCursor();
        if (typeof window.updateBoardModeToggleUI === 'function') window.updateBoardModeToggleUI();
      };

      window.conDrawSetShapeTool = function (type) {
        if (window._conPolygonReset) window._conPolygonReset();
        _conDrawHandMode = false;
        _conDrawEraserMode = false;
        _conDrawShapeTool = (_conDrawShapeTool === type) ? null : type;
        _conShapeSyncPanelState();
        _conDrawSyncOverlayCursor();
      };

      // Direct setter used by pen presets (bypasses toggle behaviour)
      window.conDrawSetShapeDirect = function (typeOrNull) {
        _conDrawHandMode = false;
        _conDrawEraserMode = false;
        _conDrawShapeTool = typeOrNull || null;
        _conShapeSyncPanelState();
        _conDrawSyncOverlayCursor();
      };

      window.conShapeSetDrawFill = function (v) {
        _conDrawShapeFill = v;
        _conShapeSyncPanelState();
      };

      window.conShapeSetDrawDash = function (v) {
        _conDrawShapeDash = v;
        _conShapeSyncPanelState();
      };

      // Draw panel helpers exposed globally
      window.conDrawSetColor = function (color) {
        _conDrawHandMode = false;
        _conDrawEraserMode = false;
        _conDrawColor = color;
        const panel = document.getElementById('con-draw-panel');
        if (panel) panel.querySelectorAll('.con-draw-swatch').forEach(sw => {
          sw.style.boxShadow = sw.dataset.c === color ? '0 0 0 2.5px #111' : 'none';
        });
        const input = document.getElementById('con-draw-color-input');
        if (input) input.value = color;
        const ind = document.getElementById('con-draw-curr-color-indicator');
        if (ind) ind.style.background = color;
        _conShapeSyncPanelState();
        _conDrawSyncOverlayCursor();
      };
      window.conDrawSetThickness = function (v, isUnitValue) {
        _conDrawThickness = isUnitValue ? conThicknessUnitToPx(v, window.conThicknessUnit) : (Number(v) || 4);
        const slider = document.getElementById('con-draw-thickness');
        if (slider) {
          _conSetupThicknessSlider(slider, window.conThicknessUnit, 'drawing');
          slider.value = String(conPxToThicknessUnit(_conDrawThickness, window.conThicknessUnit));
        }
        const val = document.getElementById('con-draw-thickness-val');
        if (val) val.textContent = conFormatThickness(_conDrawThickness, window.conThicknessUnit);
      };
      window.conDrawSetOpacity = function (v) {
        _conDrawOpacity = Math.max(0.05, Math.min(1, Number(v) || 1));
        const val = document.getElementById('con-draw-opacity-val');
        if (val) val.textContent = Math.round(_conDrawOpacity * 100) + '%';
      };
      window.conDrawSetArrowheadSize = function (v) {
        const n = Number(v) || 20;
        _conDrawArrowheadSize = Math.max(10, Math.min(60, Math.round(n / 5) * 5));
        const val = document.getElementById('con-draw-arrowhead-val');
        if (val) val.textContent = _conDrawArrowheadSize + 'px';
      };
      window._conEraserType = 'partial';
      window._conEraserRadius = 20;

      window.conDrawSetEraserType = function (type) {
        window._conEraserType = (type === 'stroke') ? 'stroke' : 'partial';
        const pBtn = document.getElementById('con-eraser-type-partial-btn');
        const sBtn = document.getElementById('con-eraser-type-stroke-btn');
        if (pBtn) pBtn.classList.toggle('con-panel-active', window._conEraserType === 'partial');
        if (sBtn) sBtn.classList.toggle('con-panel-active', window._conEraserType === 'stroke');
      };

      window.conDrawSetEraserRadius = function (v) {
        const n = Math.max(5, Math.min(60, Number(v) || 20));
        window._conEraserRadius = n;
        const val = document.getElementById('con-draw-eraser-size-val');
        if (val) val.textContent = n + 'px';
        const slider = document.getElementById('con-draw-eraser-size-slider');
        if (slider && Number(slider.value) !== n) slider.value = n;
        if (typeof window._conUpdateEraserOutlineSize === 'function') {
          window._conUpdateEraserOutlineSize();
        }
      };

      window.conDrawToggleEraser = function () {
        _conDrawEraserMode = !_conDrawEraserMode;
        if (_conDrawEraserMode) {
          _conDrawHandMode = false;
          _conDrawShapeTool = null;
        }
        const btn = document.getElementById('con-draw-eraser-btn');
        if (btn) {
          btn.classList.toggle('con-panel-active', !!_conDrawEraserMode);
          const lbl = document.getElementById('con-draw-eraser-label');
          if (lbl) {
            lbl.textContent = _conDrawEraserMode
              ? (typeof i18n !== 'undefined' && i18n.t ? i18n.t('conDrawErasing') || 'Erasing' : 'Erasing')
              : (typeof i18n !== 'undefined' && i18n.t ? i18n.t('conDrawErase') || 'Erase' : 'Erase');
          } else {
            btn.innerHTML = '<img src="../assets/icons/eraser.svg" class="btn-icon" alt="" /> <span id="con-draw-eraser-label">' + (_conDrawEraserMode ? 'Erasing' : 'Erase') + '</span>';
          }
        }
        _conDrawSyncOverlayCursor();
        if (typeof _conSyncEraserToolbarBtn === 'function') _conSyncEraserToolbarBtn();
        _conShapeSyncPanelState();
      };

      // Draw dropdown menu management
      window.conDrawToggleMenu = function (menuName) {
        const menus = {
          shapes: document.getElementById('con-draw-shapes-menu'),
          colour: document.getElementById('con-draw-colour-menu'),
          line: document.getElementById('con-draw-line-menu'),
          eraser: document.getElementById('con-draw-eraser-menu')
        };
        const target = menus[menuName];
        const isOpen = target && target.style.display !== 'none';
        Object.values(menus).forEach(m => { if (m) m.style.display = 'none'; });
        if (target && !isOpen) {
          target.style.display = 'flex';
        }
      };

      window.conDrawCloseAllMenus = function () {
        ['con-draw-shapes-menu', 'con-draw-colour-menu', 'con-draw-line-menu', 'con-draw-eraser-menu'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        });
      };

      if (!window._conDrawMenuListenersAttached) {
        window._conDrawMenuListenersAttached = true;
        document.addEventListener('pointerdown', function (e) {
          if (!e.target.closest('#con-draw-panel .con-draw-drop-wrap')) {
            if (typeof window.conDrawCloseAllMenus === 'function') window.conDrawCloseAllMenus();
          }
        });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') {
            if (typeof window.conDrawCloseAllMenus === 'function') window.conDrawCloseAllMenus();
          }
        });
      }

      function conDrawInitPanel() {
        const container = document.getElementById('con-draw-color-swatches');
        if (!container || container.childElementCount) return;
        if (typeof window.conDrawInitPenPresets === 'function') window.conDrawInitPenPresets();
        CON_DRAW_COLORS.forEach(c => {
          const sw = document.createElement('div');
          sw.className = 'con-draw-swatch';
          sw.dataset.c = c;
          sw.style.background = c;
          sw.onclick = () => {
            window.conDrawSetColor(c);
            if (typeof window.conDrawCloseAllMenus === 'function') window.conDrawCloseAllMenus();
          };
          container.appendChild(sw);
        });
        // Set initial active colour
        window.conDrawSetColor(_conDrawColor);
        // Init shape panel too
        conShapeInitPanel();
      }
      window.conDrawInitPanel = conDrawInitPanel;
      window.updateBoardModeToggleUI = function () {
        const labelText = document.getElementById('con-mode-label-text');
        if (!labelText) return;

        let mode = 'text';
        if (document.body.classList.contains('laser-active')) {
          mode = 'laser';
        } else if (_getConMode() === 'draw') {
          mode = _conDrawHandMode ? 'hand' : 'drawings';
        }

        const modeDetails = {
          text: { icon: '../assets/icons/text.svg', label: 'Text' },
          drawings: { icon: '../assets/icons/draw.svg', label: 'Drawings' },
          hand: { icon: '../assets/icons/hand.svg', label: 'Hand' },
          laser: { icon: '../assets/icons/laser.svg', label: 'Laser' }
        };

        const curr = modeDetails[mode] || modeDetails.text;
        labelText.innerHTML = `<img src="${curr.icon}" class="btn-icon" alt="" /> ${curr.label}`;

        ['text', 'drawings', 'hand', 'laser'].forEach(m => {
          const optBtn = document.getElementById('con-mode-opt-' + m);
          if (optBtn) {
            optBtn.classList.toggle('active-mode', m === mode);
          }
        });
      };

      window.setBoardMode = function (targetMode) {
        if (targetMode === 'text') {
          if (document.body.classList.contains('laser-active') && typeof window.laserToggle === 'function') {
            window.laserToggle();
          }
          if (typeof window.conSetMode === 'function') {
            if (_getConMode() === 'draw') {
              if (window._conPolygonReset) window._conPolygonReset();
            }
            window.conSetMode('move');
          }
        } else if (targetMode === 'drawings') {
          if (document.body.classList.contains('laser-active') && typeof window.laserToggle === 'function') {
            window.laserToggle();
          }
          if (typeof window.conToggleDrawMode === 'function') {
            if (_getConMode() !== 'draw') {
              window.conToggleDrawMode();
            }
          }
          _conDrawHandMode = false;
          _conDrawSyncOverlayCursor();
          _conShapeSyncPanelState();
          if (typeof window._conSyncDrawOverlaySize === 'function') window._conSyncDrawOverlaySize();
        } else if (targetMode === 'hand') {
          if (document.body.classList.contains('laser-active') && typeof window.laserToggle === 'function') {
            window.laserToggle();
          }
          if (typeof window.conToggleDrawMode === 'function') {
            if (_getConMode() !== 'draw') {
              window.conToggleDrawMode();
            }
          }
          _conDrawHandMode = true;
          _conDrawEraserMode = false;
          _conDrawSyncOverlayCursor();
          _conShapeSyncPanelState();
          if (typeof window._conSyncDrawOverlaySize === 'function') window._conSyncDrawOverlaySize();
        } else if (targetMode === 'laser') {
          if (_getConMode() === 'draw' && typeof window.conSetMode === 'function') {
            if (window._conPolygonReset) window._conPolygonReset();
            window.conSetMode('move');
          }
          if (!document.body.classList.contains('laser-active') && typeof window.laserToggle === 'function') {
            window.laserToggle();
          }
        }
        window.updateBoardModeToggleUI();
      };

      window.conToggleHandMode = function () {
        const inHandMode = (_getConMode() === 'draw' && typeof _conDrawHandMode !== 'undefined' && _conDrawHandMode && !document.body.classList.contains('laser-active'));
        if (inHandMode) {
          window.setBoardMode('text');
        } else {
          window.setBoardMode('hand');
        }
      };

      window.conToggleDrawMode = function () {
        const curMode = _getConMode();
        if (curMode === 'draw') {
          if (window._conPolygonReset) window._conPolygonReset();
          if (typeof window.conDrawCloseAllMenus === 'function') window.conDrawCloseAllMenus();
          window.conSetMode('move');
        } else {
          if (document.body.classList.contains('laser-active') && typeof window.laserToggle === 'function') {
            window.laserToggle();
          }
          conDrawInitPanel();
          window.conSetMode('draw');
          // If eraser was on when exiting, turn it off for a fresh draw
          if (_conDrawEraserMode) window.conDrawToggleEraser();
          _conShapeSyncPanelState();
          _conDrawSyncOverlayCursor();
        }
        _conSyncEraserToolbarBtn();
        if (typeof window.updateBoardModeToggleUI === 'function') window.updateBoardModeToggleUI();
      };
      window.conToggleEraserMode = function () {
        const curMode = _getConMode();
        if (curMode === 'draw' && _conDrawEraserMode) {
          // Exit eraser → exit draw mode entirely
          window.conSetMode('move');
        } else {
          // Enter draw mode with eraser on
          if (curMode !== 'draw') {
            conDrawInitPanel();
            window.conSetMode('draw');
          }
          if (!_conDrawEraserMode) window.conDrawToggleEraser();
        }
        _conSyncEraserToolbarBtn();
      };
      function _conSyncEraserToolbarBtn() {
        const btn = document.getElementById('con-eraser-toolbar-btn');
        if (!btn) return;
        btn.classList.toggle('con-panel-active', _getConMode() === 'draw' && !!_conDrawEraserMode);
      }
      window._conSyncEraserToolbarBtn = _conSyncEraserToolbarBtn;

      // ---- Shape context menu ----
      function _conShapeCtxInitDashBtns() {
        const wrap = document.getElementById('con-shape-ctx-dash-btns');
        if (!wrap || wrap.childElementCount) return;
        [['solid', 'Solid', 'Solid line'], ['dashed', 'Dashed', 'Dashed line'], ['dotted', 'Dotted', 'Dotted line']].forEach(([style, label, tip]) => {
          const btn = document.createElement('button');
          btn.dataset.dash = style;
          btn.title = tip;
          btn.textContent = label;
          btn.style.cssText = 'font-size:0.72rem;padding:2px 8px;border:1.5px solid #ccc;border-radius:3px;cursor:pointer;font-family:inherit;background:#f5f5f5;';
          btn.onclick = () => {
            const s = conShapes.find(x => x.id === _conShapeCtxId);
            if (!s) return;
            s.dashStyle = style;
            _conShapeUpdateStyle(s);
            wrap.querySelectorAll('button').forEach(b => {
              const a = b.dataset.dash === style;
              b.style.background = a ? '#111' : '#f5f5f5';
              b.style.color = a ? '#fff' : '';
              b.style.borderColor = a ? '#111' : '#ccc';
            });
          };
          wrap.appendChild(btn);
        });
      }

      function _conShapeCtxInitTypeBtns() {
        const wrap = document.getElementById('con-shape-ctx-type-btns');
        if (!wrap || wrap.childElementCount) return;
        CON_SHAPE_TYPES.forEach(t => {
          const btn = document.createElement('button');
          btn.dataset.stype = t.id;
          btn.textContent = t.icon;
          btn.title = t.title;
          btn.style.cssText = 'font-size:0.78rem;padding:2px 7px;border:1.5px solid #ccc;border-radius:3px;cursor:pointer;font-family:inherit;background:#f5f5f5;';
          btn.onclick = () => {
            const s = conShapes.find(x => x.id === _conShapeCtxId);
            if (!s) return;
            // Line/arrow need lx/ly coords; set them from bounding box if missing
            const needsLine = (t.id === 'line' || t.id === 'arrow');
            const wasLine = (s.type === 'line' || s.type === 'arrow');
            const needsPoly = (t.id === 'polygon');
            const wasPoly = (s.type === 'polygon');
            if (needsLine && !wasLine) { s.lx1 = s.x; s.ly1 = s.y; s.lx2 = s.x + s.w; s.ly2 = s.y + s.h; }
            if (needsPoly && !wasPoly) {
              // Build a rectangle polygon from bounding box
              s.pts = [
                { x: s.x, y: s.y },
                { x: s.x + s.w, y: s.y },
                { x: s.x + s.w, y: s.y + s.h },
                { x: s.x, y: s.y + s.h },
              ];
            }
            if (!needsPoly && wasPoly) {
              // Ensure lx/ly are set when converting away from polygon
              s.lx1 = s.x; s.ly1 = s.y; s.lx2 = s.x + s.w; s.ly2 = s.y + s.h;
            }
            s.type = t.id;
            conShapeFullRebuild(s);
            _conShapeCtxSyncMenu(s);
          };
          wrap.appendChild(btn);
        });
      }

      function _conShapeCtxSyncMenu(s) {
        const colorInput = document.getElementById('con-shape-ctx-color');
        const colorText = document.getElementById('con-shape-ctx-color-text');
        const fillInput = document.getElementById('con-shape-ctx-fill');
        const fillText = document.getElementById('con-shape-ctx-fill-text');
        const fillNoneBtn = document.getElementById('con-shape-ctx-fill-none-btn');
        const thickSlider = document.getElementById('con-shape-ctx-thickness');
        const thickVal = document.getElementById('con-shape-ctx-thickness-val');
        const opSlider = document.getElementById('con-shape-ctx-opacity');
        const opVal = document.getElementById('con-shape-ctx-opacity-val');
        const op = Number.isFinite(s.opacity) ? s.opacity : 1;
        if (colorInput) colorInput.value = s.color || '#333333';
        if (colorText) colorText.value = (s.color || '#333333').toUpperCase();
        if (fillNoneBtn) {
          const noFill = !s.fillColor || s.fillColor === 'none';
          fillNoneBtn.style.background = noFill ? '#111' : '#f5f5f5';
          fillNoneBtn.style.color = noFill ? '#fff' : '';
          fillNoneBtn.style.borderColor = noFill ? '#111' : '#ccc';
        }
        if (fillInput && s.fillColor && s.fillColor !== 'none') fillInput.value = s.fillColor;
        if (fillText) fillText.value = s.fillColor && s.fillColor !== 'none' ? s.fillColor.toUpperCase() : 'NONE';
        if (thickSlider) {
          _conSetupThicknessSlider(thickSlider, window.conThicknessUnit, 'shape');
          thickSlider.value = String(conPxToThicknessUnit(s.thickness || 2, window.conThicknessUnit));
        }
        if (thickVal) thickVal.textContent = conFormatThickness(s.thickness || 2, window.conThicknessUnit);
        if (opSlider) opSlider.value = String(op);
        if (opVal) opVal.textContent = Math.round(op * 100) + '%';
        _conSyncUnitToggleButtons();
        // Sync type buttons
        const typeBtns = document.getElementById('con-shape-ctx-type-btns');
        if (typeBtns) typeBtns.querySelectorAll('button[data-stype]').forEach(btn => {
          const a = btn.dataset.stype === s.type;
          btn.style.background = a ? '#111' : '#f5f5f5';
          btn.style.color = a ? '#fff' : '';
          btn.style.borderColor = a ? '#111' : '#ccc';
        });
        // Sync dash buttons
        const dashBtns = document.getElementById('con-shape-ctx-dash-btns');
        if (dashBtns) dashBtns.querySelectorAll('button[data-dash]').forEach(btn => {
          const a = btn.dataset.dash === (s.dashStyle || 'solid');
          btn.style.background = a ? '#111' : '#f5f5f5';
          btn.style.color = a ? '#fff' : '';
          btn.style.borderColor = a ? '#111' : '#ccc';
        });
        // Show/hide arrowhead size row
        const ahRow = document.getElementById('con-shape-ctx-arrowhead-row');
        const ahSlider = document.getElementById('con-shape-ctx-arrowhead');
        const ahValEl = document.getElementById('con-shape-ctx-arrowhead-val');
        if (ahRow) ahRow.style.display = s.type === 'arrow' ? '' : 'none';
        if (s.type === 'arrow') {
          if (ahSlider) ahSlider.value = String(s.arrowheadSize || 20);
          if (ahValEl) ahValEl.textContent = (s.arrowheadSize || 20) + 'px';
        }
      }

      window.conShapeCtxOpen = function (e, sid) {
        const s = conShapes.find(x => x.id === sid);
        const overlay = document.getElementById('con-shape-style-overlay');
        const popup = document.getElementById('con-shape-style-popup');
        if (!s || !overlay) return;
        conPushUndo();
        _conShapeCtxId = sid;
        _conShapeCtxInitTypeBtns();
        _conShapeCtxInitDashBtns();
        _conShapeCtxSyncMenu(s);

        const colorInput = document.getElementById('con-shape-ctx-color');
        const colorText = document.getElementById('con-shape-ctx-color-text');
        const fillInput = document.getElementById('con-shape-ctx-fill');
        const fillText = document.getElementById('con-shape-ctx-fill-text');
        const thickSlider = document.getElementById('con-shape-ctx-thickness');
        const thickVal = document.getElementById('con-shape-ctx-thickness-val');
        const opSlider = document.getElementById('con-shape-ctx-opacity');
        const opVal = document.getElementById('con-shape-ctx-opacity-val');

        if (colorInput) colorInput.oninput = function () {
          const sh = conShapes.find(x => x.id === _conShapeCtxId);
          if (!sh) return;
          sh.color = this.value;
          if (colorText) colorText.value = this.value.toUpperCase();
          _conShapeUpdateStyle(sh);
        };
        if (colorText) colorText.oninput = function () {
          const v = this.value.trim();
          if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
          const sh = conShapes.find(x => x.id === _conShapeCtxId);
          if (!sh) return;
          sh.color = v.toLowerCase();
          if (colorInput) colorInput.value = sh.color;
          _conShapeUpdateStyle(sh);
        };
        if (fillInput) fillInput.oninput = function () {
          const sh = conShapes.find(x => x.id === _conShapeCtxId);
          if (!sh) return;
          sh.fillColor = this.value;
          if (fillText) fillText.value = this.value.toUpperCase();
          _conShapeUpdateStyle(sh);
          const noneBtn = document.getElementById('con-shape-ctx-fill-none-btn');
          if (noneBtn) { noneBtn.style.background = '#f5f5f5'; noneBtn.style.color = ''; noneBtn.style.borderColor = '#ccc'; }
        };
        if (fillText) fillText.oninput = function () {
          const v = this.value.trim();
          if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
          const sh = conShapes.find(x => x.id === _conShapeCtxId);
          if (!sh) return;
          sh.fillColor = v.toLowerCase();
          if (fillInput) fillInput.value = sh.fillColor;
          _conShapeUpdateStyle(sh);
          const noneBtn = document.getElementById('con-shape-ctx-fill-none-btn');
          if (noneBtn) { noneBtn.style.background = '#f5f5f5'; noneBtn.style.color = ''; noneBtn.style.borderColor = '#ccc'; }
        };
        if (thickSlider) thickSlider.oninput = function () {
          const sh = conShapes.find(x => x.id === _conShapeCtxId);
          if (!sh) return;
          sh.thickness = conThicknessUnitToPx(this.value, window.conThicknessUnit);
          if (thickVal) thickVal.textContent = conFormatThickness(sh.thickness, window.conThicknessUnit);
          _conShapeUpdateStyle(sh);
        };
        if (opSlider) opSlider.oninput = function () {
          const sh = conShapes.find(x => x.id === _conShapeCtxId);
          if (!sh) return;
          sh.opacity = Math.max(0.05, Math.min(1, Number(this.value) || 1));
          if (opVal) opVal.textContent = Math.round(sh.opacity * 100) + '%';
          _conShapeUpdateStyle(sh);
        };

        const ahSlider = document.getElementById('con-shape-ctx-arrowhead');
        const ahValEl = document.getElementById('con-shape-ctx-arrowhead-val');
        if (ahSlider) ahSlider.oninput = function () {
          const sh = conShapes.find(x => x.id === _conShapeCtxId);
          if (!sh || sh.type !== 'arrow') return;
          const n = Number(this.value) || 20;
          sh.arrowheadSize = Math.max(10, Math.min(60, Math.round(n / 5) * 5));
          if (ahValEl) ahValEl.textContent = sh.arrowheadSize + 'px';
          _conShapeUpdateStyle(sh);
        };

        overlay.classList.add('active');
        if (popup) {
          popup.style.maxHeight = Math.max(160, window.innerHeight - 16) + 'px';
          popup.style.maxWidth = Math.max(200, window.innerWidth - 16) + 'px';
          popup.style.overflowY = 'auto';
          popup.style.overflowX = 'hidden';
        }
        const pw = popup ? (popup.offsetWidth || 240) : 240;
        const ph = popup ? (popup.offsetHeight || 280) : 280;
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
      };

      window.conShapeStyleClose = function (e) {
        if (e && e.target !== document.getElementById('con-shape-style-overlay')) return;
        window.conShapeCtxClose();
      };

      window.conShapeCtxSetFill = function (v) {
        const sh = conShapes.find(x => x.id === _conShapeCtxId);
        if (!sh) return;
        sh.fillColor = v;
        _conShapeUpdateStyle(sh);
        _conShapeCtxSyncMenu(sh);
      };

      window.conShapeCtxClose = function () {
        const overlay = document.getElementById('con-shape-style-overlay');
        if (overlay) overlay.classList.remove('active');
        _conShapeCtxId = null;
      };

      window.conShapeCtxSaveToLibrary = function () {
        const activeSid = _conShapeCtxId;
        window.conShapeCtxClose();
        const hasMulti = (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size > 0)
          || (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size > 0)
          || (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size > 0)
          || (typeof _conShapeSelected !== 'undefined' && _conShapeSelected && _conShapeSelected.size > 1);
        if (hasMulti) {
          conSaveSelectionToLibraryPrompt();
        } else if (activeSid) {
          conSaveSelectionToLibraryPrompt(null, { shapeIds: [activeSid] });
        } else if (typeof _conShapeSelected !== 'undefined' && _conShapeSelected && _conShapeSelected.size > 0) {
          conSaveSelectionToLibraryPrompt(null, { shapeIds: [..._conShapeSelected] });
        }
      };

      window.conShapeCtxDelete = function () {
        if (!_conShapeCtxId) return;
        conPushUndo();
        const list = (window.conGetShapes ? window.conGetShapes() : conShapes) || conShapes;
        const s = list.find(x => x.id === _conShapeCtxId);
        if (s && s.el) s.el.remove();
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].id === _conShapeCtxId) list.splice(i, 1);
        }
        if (Array.isArray(conShapes) && conShapes !== list) {
          for (let i = conShapes.length - 1; i >= 0; i--) {
            if (conShapes[i].id === _conShapeCtxId) conShapes.splice(i, 1);
          }
        }
        if (Array.isArray(window.conShapes) && window.conShapes !== list) {
          for (let i = window.conShapes.length - 1; i >= 0; i--) {
            if (window.conShapes[i].id === _conShapeCtxId) window.conShapes.splice(i, 1);
          }
        }
        if (Array.isArray(global.conShapes) && global.conShapes !== list) {
          for (let i = global.conShapes.length - 1; i >= 0; i--) {
            if (global.conShapes[i].id === _conShapeCtxId) global.conShapes.splice(i, 1);
          }
        }
        // Remove from groups
        conGroups.forEach(g => {
          if (g.shapeIds) g.shapeIds = g.shapeIds.filter(id => id !== _conShapeCtxId);
        });
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        window.conShapeCtxClose();
      };

      document.addEventListener('click', function (e) {
        if (!e.target.closest('#con-shape-style-overlay')) window.conShapeCtxClose();
      });

      window.conBoardCtxAddMask = function () {
        const x = Number(window._boardCtxNoteX) || 60;
        const y = Number(window._boardCtxNoteY) || 60;
        conBoardCtxClose();
        conAddMask(x, y);
      };

      window.conMaskCtxOpen = function (e, maskId) {
        const mask = conGetMaskById(maskId);
        const overlay = document.getElementById('con-mask-style-overlay');
        const popup = document.getElementById('con-mask-style-popup');
        if (!mask || !overlay) return;
        conPushUndo();
        _conMaskCtxId = maskId;

        const colorInput = document.getElementById('con-mask-ctx-color');
        const colorText = document.getElementById('con-mask-ctx-color-text');
        const opacityInput = document.getElementById('con-mask-ctx-opacity');
        const opacityVal = document.getElementById('con-mask-ctx-opacity-val');

        if (colorInput) colorInput.value = mask.color;
        if (colorText) colorText.value = mask.color.toUpperCase();
        if (opacityInput) opacityInput.value = String(mask.opacity);
        if (opacityVal) opacityVal.textContent = Math.round(mask.opacity * 100) + '%';

        if (colorInput && colorText) {
          colorInput.oninput = function () {
            colorText.value = this.value.toUpperCase();
            mask.color = this.value;
            conApplyMaskStyle(mask);
            const swatchWrap = document.getElementById('con-mask-ctx-swatches');
            if (swatchWrap) {
              swatchWrap.querySelectorAll('span').forEach(s => {
                s.style.borderColor = s.dataset.color.toLowerCase() === this.value.toLowerCase() ? '#111' : 'transparent';
              });
            }
          };
        }
        if (colorText) {
          colorText.oninput = function () {
            const value = this.value.trim();
            if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
            const hex = value.toLowerCase();
            if (colorInput) colorInput.value = hex;
            this.value = hex.toUpperCase();
            mask.color = hex;
            conApplyMaskStyle(mask);
            const swatchWrap = document.getElementById('con-mask-ctx-swatches');
            if (swatchWrap) {
              swatchWrap.querySelectorAll('span').forEach(s => {
                s.style.borderColor = s.dataset.color.toLowerCase() === hex ? '#111' : 'transparent';
              });
            }
          };
        }
        if (opacityInput) {
          opacityInput.oninput = function () {
            mask.opacity = Number(this.value) || 0.95;
            if (opacityVal) opacityVal.textContent = Math.round(mask.opacity * 100) + '%';
            conApplyMaskStyle(mask);
          };
        }

        // Build / refresh colour swatches
        const swatchWrap = document.getElementById('con-mask-ctx-swatches');
        if (swatchWrap) {
          if (!swatchWrap.children.length) {
            CON_MASK_COLORS.forEach(c => {
              const s = document.createElement('span');
              s.dataset.color = c;
              s.style.cssText = `display:inline-block;width:16px;height:16px;border-radius:3px;cursor:pointer;box-sizing:border-box;border:2px solid transparent;background:${c};flex-shrink:0;`;
              s.onclick = () => {
                const curMask = conGetMaskById(_conMaskCtxId);
                if (!curMask) return;
                const ci = document.getElementById('con-mask-ctx-color');
                const ct = document.getElementById('con-mask-ctx-color-text');
                if (ci) ci.value = c;
                if (ct) ct.value = c.toUpperCase();
                curMask.color = c;
                conApplyMaskStyle(curMask);
                if (window._conMirrorSend) {
                  window._conMirrorSend({
                    type: 'mask-style',
                    id: curMask.id,
                    color: curMask.color,
                    opacity: curMask.opacity
                  });
                }
                swatchWrap.querySelectorAll('span').forEach(x => x.style.borderColor = 'transparent');
                s.style.borderColor = '#111';
              };
              swatchWrap.appendChild(s);
            });
          }
          // Sync active state
          const cur = mask.color.toLowerCase();
          swatchWrap.querySelectorAll('span').forEach(s => {
            s.style.borderColor = s.dataset.color.toLowerCase() === cur ? '#111' : 'transparent';
          });
        }

        overlay.classList.add('active');
        if (popup) {
          popup.style.maxHeight = Math.max(160, window.innerHeight - 16) + 'px';
          popup.style.maxWidth = Math.max(200, window.innerWidth - 16) + 'px';
          popup.style.overflowY = 'auto';
          popup.style.overflowX = 'hidden';
        }
        const pw = popup ? (popup.offsetWidth || 220) : 220;
        const ph = popup ? (popup.offsetHeight || 180) : 180;
        let mx = e.clientX + 6;
        let my = e.clientY + 6;
        if (mx + pw > window.innerWidth - 8) mx = e.clientX - pw - 6;
        if (my + ph > window.innerHeight - 8) my = e.clientY - ph - 6;
        mx = Math.max(8, Math.min(window.innerWidth - pw - 8, mx));
        my = Math.max(8, Math.min(window.innerHeight - ph - 8, my));
        if (popup) {
          popup.style.left = Math.round(mx) + 'px';
          popup.style.top = Math.round(my) + 'px';
          popup.style.maxHeight = Math.max(160, window.innerHeight - my - 8) + 'px';
        }
      };

      window.conMaskStyleClose = function (e) {
        if (e && e.target !== document.getElementById('con-mask-style-overlay')) return;
        window.conMaskCtxClose();
      };

      window.conMaskCtxClose = function () {
        _conMaskCtxId = null;
        const overlay = document.getElementById('con-mask-style-overlay');
        if (overlay) overlay.classList.remove('active');
      };

      window.conMaskCtxApply = function () {
        if (!_conMaskCtxId) return;
        const mask = conGetMaskById(_conMaskCtxId);
        if (!mask) { conMaskCtxClose(); return; }
        const colorText = document.getElementById('con-mask-ctx-color-text');
        const opacityInput = document.getElementById('con-mask-ctx-opacity');
        if (colorText && /^#[0-9a-fA-F]{6}$/.test(colorText.value.trim())) mask.color = colorText.value.trim();
        if (opacityInput) mask.opacity = Number(opacityInput.value) || 0.95;
        conApplyMaskStyle(mask);
        if (window._conMirrorSend) {
          window._conMirrorSend({
            type: 'mask-style',
            id: mask.id,
            color: mask.color,
            opacity: mask.opacity
          });
        }
      };

      window.conMaskCtxDelete = function () {
        if (!_conMaskCtxId) return;
        conPushUndo();
        const delId = _conMaskCtxId;
        const mask = conGetMaskById(delId);
        if (mask && mask.el) mask.el.remove();
        conMasks = conMasks.filter(m => m.id !== delId);
        conMaskCtxClose();
        if (window._conMirrorSend) {
          window._conMirrorSend({ type: 'mask-remove', id: delId });
        }
      };

  window._conShapeGetPAD = global._conShapeGetPAD = _conShapeGetPAD;
  window._conShapeUpdateHandles = global._conShapeUpdateHandles = _conShapeUpdateHandles;
  window.conShapeFullRebuild = global.conShapeFullRebuild = conShapeFullRebuild;

  Board.shapes = Board.shapes || {};
})(typeof window !== "undefined" ? window : this);