/**
 * Class Management Tools — Board Presenter / Mirror Display Engine
 * Receives real-time board updates over BroadcastChannel and renders secondary display view.
 */
    // Mirror window: receive board state via BroadcastChannel and render read-only
    (function () {
      if (new URLSearchParams(location.search).get('mirror') !== '1') return;
      window._conSuppressMirrorObserver = true;
      document.title = 'Board – Presentation Mode';
      document.documentElement.classList.add('con-mirror-mode');
      const _searchParams = new URLSearchParams(location.search);
      let _mirrorChannelName = (_searchParams.get('mirrorChannel') || '').trim();
      if (!_mirrorChannelName) {
        try {
          _mirrorChannelName = (localStorage.getItem('cmt_active_board_mirror_channel') || '').trim();
        } catch (_) { }
      }
      if (!_mirrorChannelName) {
        _mirrorChannelName = 'constellation-mirror';
      }
      const ch = new BroadcastChannel(_mirrorChannelName);
      var _mirrorIsFrozen = false;
      const _mirrorClientId = 'mirror-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      function _sendMirrorPresence(online) {
        try {
          ch.postMessage({ type: 'mirror-presence', online: !!online, id: _mirrorClientId });
        } catch (e) { }
      }

      // Tracked main-window viewport / scroll values
      var _mvpW = 0, _mvpH = 0, _msx = 0, _msy = 0;
      var _mirrorScale = 1, _mirrorWrapOx = 0, _mirrorWrapOy = 0;
      var _mirrorLivePath = null;
      var _lastPdfResizeMw = 0, _lastPdfResizeMh = 0;
      var _mirrorViewportRaf = null;

      var _mirrorKeepaliveCanvas = null;
      var _mirrorKeepaliveRaf = null;
      function _mirrorStartRecorderKeepalive(targetFps) {
        _mirrorStopRecorderKeepalive();
        if (!_mirrorKeepaliveCanvas) {
          _mirrorKeepaliveCanvas = document.createElement('canvas');
          _mirrorKeepaliveCanvas.id = 'con-mirror-rec-keepalive';
          _mirrorKeepaliveCanvas.width = 2;
          _mirrorKeepaliveCanvas.height = 2;
          _mirrorKeepaliveCanvas.style.cssText = 'position:fixed;bottom:0;right:0;width:2px;height:2px;pointer-events:none;z-index:2147483647;opacity:0.01;';
          document.body.appendChild(_mirrorKeepaliveCanvas);
        }
        var ctx = _mirrorKeepaliveCanvas.getContext('2d');
        var flip = false;
        var fpsInterval = 1000 / (targetFps || 30);
        var lastTick = 0;
        function loop(now) {
          if (now - lastTick >= fpsInterval) {
            lastTick = now;
            flip = !flip;
            if (ctx) {
              ctx.clearRect(0, 0, 2, 2);
              ctx.fillStyle = flip ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)';
              ctx.fillRect(0, 0, 1, 1);
            }
          }
          _mirrorKeepaliveRaf = requestAnimationFrame(loop);
        }
        _mirrorKeepaliveRaf = requestAnimationFrame(loop);
      }
      function _mirrorStopRecorderKeepalive() {
        if (_mirrorKeepaliveRaf) {
          cancelAnimationFrame(_mirrorKeepaliveRaf);
          _mirrorKeepaliveRaf = null;
        }
        if (_mirrorKeepaliveCanvas && _mirrorKeepaliveCanvas.parentNode) {
          _mirrorKeepaliveCanvas.remove();
          _mirrorKeepaliveCanvas = null;
        }
      }

      function _mirrorScheduleApplyViewport() {
        if (_mirrorViewportRaf) return;
        _mirrorViewportRaf = requestAnimationFrame(function () {
          _mirrorViewportRaf = null;
          _mirrorApplyViewport();
        });
      }

      // Apply transform so the mirror shows exactly the same board region as the main window.
      // The board element is 20000x20000 absolute; a fixed clip wrapper constrains what's visible.
      function _mirrorApplyViewport() {
        var brd = document.getElementById('constellation-board');
        var wrap = document.getElementById('con-mirror-clip');
        if (!brd || !wrap || !_mvpW || !_mvpH) return;
        var mW = window.innerWidth;
        var mH = window.innerHeight;
        var s = Math.min(mW / _mvpW, mH / _mvpH);
        _mirrorScale = s;
        var displayW = _mvpW * s;
        var displayH = _mvpH * s;
        _mirrorWrapOx = (mW - displayW) / 2;
        _mirrorWrapOy = (mH - displayH) / 2;
        // Clip wrapper: fixed region that shows the board content
        wrap.style.left = _mirrorWrapOx + 'px';
        wrap.style.top = _mirrorWrapOy + 'px';
        wrap.style.width = displayW + 'px';
        wrap.style.height = displayH + 'px';
        // Board: scale then pan so content at (_msx,_msy) appears at (0,0) of wrapper
        // transform: scale(s) translate(-sx,-sy) — translate is in pre-scale coords
        brd.style.transform = 'scale(' + s + ') translate(' + (-_msx) + 'px, ' + (-_msy) + 'px)';

        // Only re-render fullscreen PDFs if mirror window was actually resized
        if (_lastPdfResizeMw !== mW || _lastPdfResizeMh !== mH) {
          _lastPdfResizeMw = mW;
          _lastPdfResizeMh = mH;
          document.querySelectorAll('.con-media-item.con-media-fullscreen.con-media-kind-pdf').forEach(function (fwrap) {
            var fid = fwrap.dataset.id;
            var fitems = window.conGetMediaItems ? window.conGetMediaItems() : [];
            var fitem = fitems.find(function (m) { return String(m.id) === String(fid); });
            if (fitem && typeof conRenderPdfForItem === 'function') {
              var fcvs = fwrap.querySelector('canvas.con-media-pdf-canvas');
              var fscr = fwrap.querySelector('.con-media-pdf-scroll');
              var fcnt = fwrap.querySelector('.con-media-content');
              if (fcvs) conRenderPdfForItem(fitem, fcvs, fscr, fcnt);
            }
          });
        }
      }

      // Force-restart group and note blink animation synced to current clock phase (3.6 s period).
      // Must remove+re-add the class to restart the animation with the new delay.
      function _syncBlinkPhase() {
        requestAnimationFrame(function () {
          var delay = '-' + ((Date.now() / 1000) % 3.6).toFixed(3) + 's';
          document.querySelectorAll('.con-group-blink').forEach(function (bel) {
            bel.classList.remove('con-group-blink');
            bel.style.setProperty('--con-group-blink-delay', delay);
            void bel.offsetWidth;
            bel.classList.add('con-group-blink');
          });
          document.querySelectorAll('.con-word-note.wn-blink, .ta-word-note.wn-blink, .wn-blink').forEach(function (bel) {
            bel.classList.remove('wn-blink');
            bel.style.setProperty('--wn-blink-delay', delay);
            void bel.offsetWidth;
            bel.classList.add('wn-blink');
          });
        });
      }

      // Laser visual helpers (mirror-side only, no interaction)
      var _laserDotEl = null;
      function _laserDot() { return _laserDotEl || (_laserDotEl = document.getElementById('laser-dot')); }
      var _mirrorFrozenIndicatorEl = null;
      function _mirrorFrozenIndicator() {
        if (_mirrorFrozenIndicatorEl) return _mirrorFrozenIndicatorEl;
        _mirrorFrozenIndicatorEl = document.getElementById('con-mirror-frozen-indicator');
        if (_mirrorFrozenIndicatorEl) return _mirrorFrozenIndicatorEl;
        var el = document.createElement('div');
        el.id = 'con-mirror-frozen-indicator';
        el.textContent = 'Frozen';
        document.body.appendChild(el);
        _mirrorFrozenIndicatorEl = el;
        return _mirrorFrozenIndicatorEl;
      }
      function _clearMirrorBlinkVisuals() {
        document.querySelectorAll('#constellation-board .con-group.con-group-blink').forEach(function (el) {
          el.classList.remove('con-group-blink');
          el.style.removeProperty('--con-group-blink-delay');
        });
        document.querySelectorAll('#constellation-board .con-node.con-attention-blink').forEach(function (el) {
          el.classList.remove('con-attention-blink');
          el.style.removeProperty('--con-blink-delay');
        });
        document.querySelectorAll('#constellation-board .con-word-note.wn-blink, #constellation-board .con-word-note .wn-blink-hl, #constellation-board .ta-word-note.wn-blink').forEach(function (el) {
          el.classList.remove('wn-blink');
          el.style.removeProperty('--wn-blink-delay');
          el.classList.remove('wn-blink-hl');
        });
        Object.keys(_activeNodeBlinks).forEach(function (nodeId) {
          var info = _activeNodeBlinks[nodeId];
          if (info && info.cleanupTimer) clearTimeout(info.cleanupTimer);
          delete _activeNodeBlinks[nodeId];
        });
      }
      function _reapplyMirrorBlinks() {
        var _liveGroups = window.conGetGroups ? window.conGetGroups() : [];
        _liveGroups.forEach(function (g) {
          if (g.blink && g.el) {
            g.el.classList.add('con-group-blink');
          }
        });
        var _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
        _liveNotes.forEach(function (n) {
          if (n.blink) {
            var nEl = (typeof wnGetNoteElementById === 'function')
              ? wnGetNoteElementById(n.id)
              : document.querySelector('#constellation-board [data-id="' + n.id + '"]');
            if (nEl) nEl.classList.add('wn-blink');
          }
        });
        _syncBlinkPhase();
      }
      function _setMirrorFrozenUi(on) {
        var el = _mirrorFrozenIndicator();
        if (!el) return;
        el.classList.toggle('con-frozen-active', !!on);
        // Keep presentation visually static while frozen.
        if (on) {
          var ld = _laserDot();
          if (ld) ld.style.display = 'none';
          _clearMirrorBlinkVisuals();
        }
      }

      var _mirrorControlMenuEl = null;
      function _setMirrorMenuFrozen(on) {
        if (!_mirrorControlMenuEl) return;
        var freezeBtn = _mirrorControlMenuEl.querySelector('[data-mirror-action="freeze"]');
        if (freezeBtn) {
          var label = on ? (boardT('pres_unfreeze_title') || boardT('presUnfreeze')) : (boardT('pres_freeze_title') || boardT('presFreeze'));
          freezeBtn.title = label;
          freezeBtn.setAttribute('data-tooltip', label);
          freezeBtn.setAttribute('aria-label', label);
          freezeBtn.classList.toggle('is-frozen', !!on);
        }
      }
      function _setMirrorMenuPinned(on) {
        if (!_mirrorControlMenuEl) return;
        var pinBtn = _mirrorControlMenuEl.querySelector('[data-mirror-action="pin"]');
        if (pinBtn) {
          var label = on ? (boardT('pres_unpin_title') || 'Disable always on top for presentation window') : (boardT('pres_pin_title') || 'Keep presentation window always on top');
          pinBtn.title = label;
          pinBtn.setAttribute('data-tooltip', label);
          pinBtn.setAttribute('aria-label', label);
          pinBtn.classList.toggle('is-pinned', !!on);
        }
      }
      function _ensureMirrorControlMenu() {
        if (_mirrorControlMenuEl) return;
        var menu = document.createElement('div');
        menu.id = 'con-pres-menu';
        menu.className = 'pres-control-menu tooltip-bottom';
        menu.style.cssText = 'position:fixed;top:8px;right:8px;z-index:100000;';
        menu.innerHTML = ''
          + '<div class="pres-drag-handle" title="Drag to move">⋮⋮</div>'
          + '<button type="button" class="pres-btn" data-mirror-action="close" data-tooltip="' + (boardT('pres_stop_title') || boardT('presStop')) + '" title="' + (boardT('pres_stop_title') || boardT('presStop')) + '" aria-label="' + (boardT('pres_stop_title') || boardT('presStop')) + '"><img src="../assets/icons/stop.svg" alt="" /></button>'
          + '<button type="button" class="pres-btn" data-mirror-action="freeze" data-tooltip="' + (boardT('pres_freeze_title') || boardT('presFreeze')) + '" title="' + (boardT('pres_freeze_title') || boardT('presFreeze')) + '" aria-label="' + (boardT('pres_freeze_title') || boardT('presFreeze')) + '"><img src="../assets/icons/pause.svg" alt="" /></button>'
          + '<button type="button" class="pres-btn" data-mirror-action="pin" data-tooltip="' + (boardT('pres_pin_title') || 'Keep presentation window always on top') + '" title="' + (boardT('pres_pin_title') || 'Keep presentation window always on top') + '" aria-label="' + (boardT('pres_pin_title') || 'Keep presentation window always on top') + '"><img src="../assets/icons/pin.svg" alt="" /></button>'
          + '<button type="button" class="pres-btn" data-mirror-action="resize" data-tooltip="' + (boardT('pres_resize_title') || boardT('presResize')) + '" title="' + (boardT('pres_resize_title') || boardT('presResize')) + '" aria-label="' + (boardT('pres_resize_title') || boardT('presResize')) + '"><img src="../assets/icons/compact.svg" alt="" /></button>'
          + '<button type="button" class="pres-btn" data-mirror-action="maximise" data-tooltip="' + (boardT('pres_maximize_title') || boardT('presMaximise')) + '" title="' + (boardT('pres_maximize_title') || boardT('presMaximise')) + '" aria-label="' + (boardT('pres_maximize_title') || boardT('presMaximise')) + '"><img src="../assets/icons/maximize.svg" alt="" /></button>'
          + '<button type="button" class="pres-btn" data-mirror-action="left" data-tooltip="' + (boardT('pres_left_title') || boardT('presLeft')) + '" title="' + (boardT('pres_left_title') || boardT('presLeft')) + '" aria-label="' + (boardT('pres_left_title') || boardT('presLeft')) + '"><img src="../assets/icons/triangle-left.svg" alt="" /></button>'
          + '<button type="button" class="pres-btn" data-mirror-action="right" data-tooltip="' + (boardT('pres_right_title') || boardT('presRight')) + '" title="' + (boardT('pres_right_title') || boardT('presRight')) + '" aria-label="' + (boardT('pres_right_title') || boardT('presRight')) + '"><img src="../assets/icons/triangle-right.svg" alt="" /></button>';
        menu.addEventListener('click', function (event) {
          var btn = event.target && event.target.closest ? event.target.closest('[data-mirror-action]') : null;
          if (!btn) return;
          event.preventDefault();
          event.stopPropagation();
          try { ch.postMessage({ type: 'mirror-control', command: btn.getAttribute('data-mirror-action') }); } catch (e) { }
        });

        // Make the popup draggable
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
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
          var clientX, clientY;
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

          var newTop = menu.offsetTop - pos2;
          var newLeft = menu.offsetLeft - pos1;

          var rect = menu.getBoundingClientRect();
          var viewportWidth = window.innerWidth;
          var viewportHeight = window.innerHeight;

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
        _setMirrorMenuFrozen(_mirrorIsFrozen);
      }

      // Convert viewport-relative normalised coords back to mirror screen coords.
      // nx/ny are fractions of the visible board area (0..1), matching _normBrd in the main window.
      function _brdVP(nx, ny) {
        return {
          x: _mirrorWrapOx + nx * _mvpW * _mirrorScale,
          y: _mirrorWrapOy + ny * _mvpH * _mirrorScale
        };
      }

      function _mAddMark(x, y) {
        var el = document.createElement('div');
        el.className = 'laser-mark';
        el.style.left = x + 'px'; el.style.top = y + 'px';
        document.body.appendChild(el);
        var _cleanup = function () { if (el && el.parentNode) el.remove(); };
        el.addEventListener('animationend', function (ev) { if (ev.animationName === 'laser-mark-fade') _cleanup(); });
        setTimeout(_cleanup, 3000);
      }
      function _mAddTrail(x, y, size) {
        var el = document.createElement('div');
        el.className = 'laser-trail-dot';
        var s = size || 7;
        el.style.transform = 'translate(' + (x - s / 2) + 'px, ' + (y - s / 2) + 'px)';
        el.style.width = s + 'px'; el.style.height = s + 'px';
        document.body.appendChild(el);
        var _cleanup = function () { if (el && el.parentNode) el.remove(); };
        el.addEventListener('animationend', _cleanup, { once: true });
        setTimeout(_cleanup, 1200);
      }
      function _mAddPulse(x, y) {
        var el = document.createElement('div');
        el.className = 'laser-pulse-ring';
        el.style.left = x + 'px'; el.style.top = y + 'px';
        document.body.appendChild(el);
        var _cleanup = function () { if (el && el.parentNode) el.remove(); };
        el.addEventListener('animationend', _cleanup, { once: true });
        setTimeout(_cleanup, 1500);
      }

      // Track active node attention blinks so they survive board re-renders.
      var _activeNodeBlinks = {}; // nodeId -> { durationMs, startTime, borderColor, cleanupTimer }
      var _lastRenderedRevision = null;
      var _mirrorCurrentNoteSelection = null;

      function _mirrorGetRangeFromCharOffsets(root, start, end) {
        if (!root || typeof start !== 'number' || typeof end !== 'number' || start >= end) return null;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var currentOffset = 0;
        var startNode = null, startNodeOffset = 0;
        var endNode = null, endNodeOffset = 0;
        var lastNode = null;
        var node;
        while ((node = walker.nextNode())) {
          lastNode = node;
          var len = node.nodeValue.length;
          if (!startNode) {
            if (currentOffset + len > start || (currentOffset + len === start && start === end)) {
              startNode = node;
              startNodeOffset = start - currentOffset;
            }
          }
          if (startNode && !endNode) {
            if (currentOffset + len >= end) {
              endNode = node;
              endNodeOffset = end - currentOffset;
              break;
            }
          }
          currentOffset += len;
        }
        if (!startNode && lastNode) {
          startNode = lastNode;
          startNodeOffset = lastNode.nodeValue.length;
        }
        if (!endNode && lastNode) {
          endNode = lastNode;
          endNodeOffset = lastNode.nodeValue.length;
        }
        if (startNode && endNode) {
          try {
            var range = document.createRange();
            range.setStart(startNode, Math.max(0, Math.min(startNodeOffset, startNode.nodeValue.length)));
            range.setEnd(endNode, Math.max(0, Math.min(endNodeOffset, endNode.nodeValue.length)));
            return range;
          } catch (e) {
            return null;
          }
        }
        return null;
      }

      function _renderMirrorSelectionOverlay(editor, range) {
        if (!editor || !range) return;
        var noteEl = editor.closest('.con-word-note');
        if (!noteEl) return;
        var overlay = noteEl.querySelector('.wn-mirror-selection-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'wn-mirror-selection-overlay';
          noteEl.appendChild(overlay);
        }
        overlay.innerHTML = '';
        var noteRect = noteEl.getBoundingClientRect();
        var zoom = (window.conGetZoom ? window.conGetZoom() : 1) * (_mirrorScale || 1);
        if (zoom <= 0) zoom = 1;
        var rects = range.getClientRects();
        for (var i = 0; i < rects.length; i++) {
          var r = rects[i];
          if (r.width <= 0 || r.height <= 0) continue;
          var d = document.createElement('div');
          d.className = 'wn-mirror-selection-rect';
          d.style.left = ((r.left - noteRect.left) / zoom) + 'px';
          d.style.top = ((r.top - noteRect.top) / zoom) + 'px';
          d.style.width = (r.width / zoom) + 'px';
          d.style.height = (r.height / zoom) + 'px';
          overlay.appendChild(d);
        }
      }

      function _mirrorApplyNoteTextSelection(sel) {
        _mirrorCurrentNoteSelection = sel || null;

        if (typeof CSS !== 'undefined' && CSS.highlights) {
          CSS.highlights.delete('wn-mirror-selection');
        }
        document.querySelectorAll('#constellation-board .wn-mirror-selection-overlay').forEach(function (el) { el.remove(); });

        if (!sel || !sel.noteId || typeof sel.start !== 'number' || typeof sel.end !== 'number' || sel.start >= sel.end) {
          return;
        }

        var noteEl = document.querySelector('#constellation-board .con-word-note[data-id="' + sel.noteId + '"]');
        if (!noteEl) return;
        var editor = noteEl.querySelector('.wn-note-editor');
        if (!editor) return;

        var range = _mirrorGetRangeFromCharOffsets(editor, sel.start, sel.end);
        if (!range) return;

        var hasHighlightApi = false;
        if (typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined') {
          try {
            var hl = new Highlight(range);
            CSS.highlights.set('wn-mirror-selection', hl);
            hasHighlightApi = true;
          } catch (e) { }
        }

        if (!hasHighlightApi) {
          _renderMirrorSelectionOverlay(editor, range);
        }
      }

      function _mirrorApplySelectionState(sel) {
        if (!sel) return;
        // Show active/selected node highlight
        document.querySelectorAll('#constellation-board .con-node.con-mirror-active')
          .forEach(function (el) { el.classList.remove('con-mirror-active'); });
        if (sel.selectedNodeId) {
          var activeEl = document.getElementById(sel.selectedNodeId);
          if (activeEl) activeEl.classList.add('con-mirror-active');
        }
        if (sel.selectedNodeIds && sel.selectedNodeIds.length) {
          sel.selectedNodeIds.forEach(function (nid) {
            var el = document.getElementById(nid);
            if (el) el.classList.add('con-mirror-active');
          });
        }
        // Show active/selected group (and phrase-group) highlight
        document.querySelectorAll('#constellation-board .con-group.con-mirror-active')
          .forEach(function (el) { el.classList.remove('con-mirror-active'); });
        if (sel.selectedGroupId) {
          var activeGroupEl = document.querySelector('#constellation-board [data-gid="' + sel.selectedGroupId + '"]');
          if (activeGroupEl) activeGroupEl.classList.add('con-mirror-active');
        }
        // Show active/selected note highlight
        document.querySelectorAll('#constellation-board .con-word-note.con-mirror-active')
          .forEach(function (el) { el.classList.remove('con-mirror-active'); });
        if (sel.selectedNoteIds && sel.selectedNoteIds.length) {
          sel.selectedNoteIds.forEach(function (nid) {
            var activeNoteEl = document.querySelector('#constellation-board .con-word-note[data-id="' + nid + '"]');
            if (activeNoteEl) activeNoteEl.classList.add('con-mirror-active');
          });
        }
        // Show active/selected drawing highlight
        document.querySelectorAll('#constellation-board .con-drawing.con-mirror-active')
          .forEach(function (el) { el.classList.remove('con-mirror-active'); });
        if (sel.selectedDrawingIds && sel.selectedDrawingIds.length) {
          sel.selectedDrawingIds.forEach(function (did) {
            var activeDrawEl = document.querySelector('#constellation-board .con-drawing[data-did="' + did + '"]');
            if (activeDrawEl) activeDrawEl.classList.add('con-mirror-active');
          });
        }
        // Show active/selected shape highlight
        document.querySelectorAll('#constellation-board .con-shape.con-mirror-active')
          .forEach(function (el) { el.classList.remove('con-mirror-active'); });
        if (sel.selectedShapeIds && sel.selectedShapeIds.length) {
          sel.selectedShapeIds.forEach(function (sid) {
            var activeShapeEl = document.querySelector('#constellation-board .con-shape[data-sid="' + sid + '"]');
            if (activeShapeEl) activeShapeEl.classList.add('con-mirror-active');
          });
        }
        // Show active/selected edge highlight
        document.querySelectorAll('#constellation-svg .con-line-group.con-mirror-active')
          .forEach(function (el) { el.classList.remove('con-mirror-active'); });
        if (sel.selectedEdgeId) {
          var activeEdgeEl = document.querySelector('#constellation-svg .con-line-group[data-eid="' + sel.selectedEdgeId + '"]');
          if (activeEdgeEl) activeEdgeEl.classList.add('con-mirror-active');
        }
        if (sel.noteTextSelection !== undefined) {
          _mirrorApplyNoteTextSelection(sel.noteTextSelection);
        }
      }

      function _mirrorApplyNodeBlink(nodeId, info) {
        var nel = document.getElementById(nodeId);
        if (!nel) return;
        var remaining = info.durationMs - (performance.now() - info.startTime);
        if (remaining <= 0) { delete _activeNodeBlinks[nodeId]; return; }
        nel.style.setProperty('--con-node-border', info.borderColor || '#111111');
        nel.style.setProperty('--con-blink-delay', '-' + (Math.floor(performance.now()) % 360) + 'ms');
        nel.classList.add('con-attention-blink');
        clearTimeout(info.cleanupTimer);
        info.cleanupTimer = setTimeout(function () {
          var el2 = document.getElementById(nodeId);
          if (el2) { el2.classList.remove('con-attention-blink'); el2.style.removeProperty('--con-blink-delay'); }
          delete _activeNodeBlinks[nodeId];
        }, remaining);
      }

      function _mirrorSyncVideoNodePlayback(d, node) {
        let pop = document.getElementById('con-mirror-video-popover');
        if (!pop) {
          pop = document.createElement('div');
          pop.id = 'con-mirror-video-popover';
          pop.style.cssText = 'display:none; position:fixed; z-index:99100; flex-direction:column; min-width:280px; max-width:380px; width:340px; background:#1e1e1e; border:2px solid #333; box-shadow:4px 4px 0 #555; border-radius:8px; overflow:hidden; font-family:inherit; color:#fff; pointer-events:none;';
          pop.innerHTML = `
            <div id="con-mirror-video-header" style="display:flex; align-items:center; gap:6px; padding:6px 10px; background:#2a2a2a; border-bottom:1px solid #444; font-weight:700; font-size:0.8rem;">
              <img src="../assets/icons/media.svg" alt="" style="width:13px;height:13px;filter:invert(1);" />
              <span id="con-mirror-video-title" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">Video</span>
              <span id="con-mirror-video-badge" style="font-size:0.7rem; background:#6abf8e; color:#000; padding:1px 6px; border-radius:4px; font-weight:700;">PLAYING</span>
            </div>
            <div style="width:100%; background:#000; display:flex; align-items:center; justify-content:center; max-height:210px; min-height:140px; position:relative;">
              <video id="con-mirror-video-el" playsinline muted style="width:100%; max-height:210px; object-fit:contain; display:block;"></video>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 10px; background:#222; font-size:0.75rem; font-weight:600; color:#ccc; font-variant-numeric:tabular-nums;">
              <span id="con-mirror-video-digits">00:00 / 00:00</span>
            </div>
          `;
          document.body.appendChild(pop);
        }

        const vidEl = document.getElementById('con-mirror-video-el');
        const titleEl = document.getElementById('con-mirror-video-title');
        const badgeEl = document.getElementById('con-mirror-video-badge');
        const digitsEl = document.getElementById('con-mirror-video-digits');

        if (!d || d.videoState === 'idle' || d.videoState === 'ended' || !d.videoState) {
          if (vidEl && !vidEl.paused) vidEl.pause();
          pop.style.display = 'none';
          return;
        }

        const targetNode = node || ((window.conGetNodes ? window.conGetNodes() : []).find(n => String(n.id) === String(d.id)));
        const title = d.videoName || (targetNode && (targetNode.videoName || targetNode.text || targetNode.baseWord)) || 'Video';
        if (titleEl) titleEl.textContent = title;
        if (badgeEl) {
          badgeEl.textContent = d.videoState === 'playing' ? 'PLAYING' : 'PAUSED';
          badgeEl.style.background = d.videoState === 'playing' ? '#6abf8e' : '#e2c96e';
        }

        const curStr = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(d.currentTime || 0)) : String(Math.round(d.currentTime || 0));
        const durStr = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(d.duration || 0)) : String(Math.round(d.duration || 0));
        if (digitsEl) digitsEl.textContent = curStr + ' / ' + durStr;

        // Position overlay near node
        const nodeEl = (targetNode && targetNode.el) || document.getElementById(String(d.id));
        if (nodeEl) {
          const rect = nodeEl.getBoundingClientRect();
          const popW = 340;
          const popH = 260;
          let px = rect.left + rect.width / 2 - popW / 2;
          let py = rect.top - popH - 10;
          if (py < 10) py = rect.bottom + 10;
          px = Math.max(10, Math.min(window.innerWidth - popW - 10, px));
          pop.style.left = px + 'px';
          pop.style.top = py + 'px';
        } else {
          pop.style.left = 'calc(50vw - 170px)';
          pop.style.top = '20px';
        }

        pop.style.display = 'flex';

        // Resolve source URL
        const attId = d.videoAttachmentId || (targetNode && targetNode.videoAttachmentId);
        const att = (conAttachments || []).find(a => a && (a.id === attId || a.name === d.videoName || (targetNode && a.name === targetNode.videoName)));
        let sourceUrl = d.videoSrc || (att && (att._cachedObjectUrl || att.relativePath || (att.file && att.file.path) || att.path)) || '';
        
        if (vidEl) {
          vidEl.muted = true; // Always muted on mirror display to avoid audio echo
          if (sourceUrl && vidEl.dataset.src !== sourceUrl) {
            vidEl.dataset.src = sourceUrl;
            if (typeof conGetAttachmentDataUrl === 'function' && att && !att._cachedObjectUrl) {
              conGetAttachmentDataUrl(att).then(url => {
                if (url) {
                  vidEl.src = url;
                  vidEl.currentTime = d.currentTime || 0;
                  if (d.videoState === 'playing') vidEl.play().catch(() => {});
                }
              });
            } else {
              vidEl.src = (sourceUrl.startsWith('file://') || sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:') || sourceUrl.startsWith('http'))
                ? sourceUrl
                : (sourceUrl ? ('file://' + (sourceUrl.startsWith('/') ? '' : '/') + sourceUrl.replace(/\\/g, '/')) : '');
              vidEl.currentTime = d.currentTime || 0;
            }
          }
          if (typeof d.currentTime === 'number' && Math.abs(vidEl.currentTime - d.currentTime) > 0.4) {
            vidEl.currentTime = d.currentTime;
          }
          if (d.videoState === 'playing') {
            if (vidEl.paused) vidEl.play().catch(() => {});
          } else if (d.videoState === 'paused') {
            if (!vidEl.paused) vidEl.pause();
          }
        }
      }

      ch.onmessage = function (e) {
        if (!e.data) return;
        var d = e.data;

        if (d.type === 'page-cache-clear') {
          if (typeof _conClearPageDomCache === 'function') _conClearPageDomCache({ silent: true });
          return;
        }
        if (d.type === 'page-cache-invalidate') {
          if (typeof _conInvalidatePageDomCache === 'function') _conInvalidatePageDomCache(d.pageIdx, { silent: true });
          return;
        }
        if (d.type === 'page-cache-delete') {
          if (typeof _conRemapPageDomCacheOnDelete === 'function') _conRemapPageDomCacheOnDelete(d.deletedIdx, { silent: true });
          return;
        }
        if (d.type === 'page-cache-move') {
          if (typeof _conRemapPageDomCacheOnMove === 'function') _conRemapPageDomCacheOnMove(d.fromIdx, d.toIdx, { silent: true });
          return;
        }
        if (d.type === 'page-cache-insert') {
          if (typeof _conRemapPageDomCacheOnInsert === 'function') _conRemapPageDomCacheOnInsert(d.insertIdx, { silent: true });
          return;
        }
        if (d.type === 'page-cache-insert-count') {
          if (typeof _conRemapPageDomCacheOnInsertCount === 'function') _conRemapPageDomCacheOnInsertCount(d.insertIdx, d.count, { silent: true });
          return;
        }

        if (d.type === 'recorder-keepalive') {
          if (d.active) {
            _mirrorStartRecorderKeepalive(d.fps || 30);
          } else {
            _mirrorStopRecorderKeepalive();
          }
          return;
        }

        if (d.type === 'node-timer-tick') {
          if (_mirrorIsFrozen) return;
          var timerNode = (window.conGetNodes ? window.conGetNodes() : []).find(function (n) { return String(n.id) === String(d.id); });
          if (timerNode) {
            timerNode.remainingSec = d.remainingSec;
            timerNode.timerState = d.timerState;
            if (typeof conUpdateTimerNodeDisplay === 'function') {
              conUpdateTimerNodeDisplay(timerNode);
            } else if (typeof conRenderNodeLabel === 'function') {
              conRenderNodeLabel(timerNode);
            }
          } else {
            var el = document.getElementById(d.id);
            if (el) {
              var totalSec = d.remainingSec != null ? d.remainingSec : 0;
              var timeStr = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(totalSec) : String(totalSec);
              var isWarn = totalSec <= 60 && totalSec > 0;
              var isEnded = d.timerState === 'ended' || totalSec <= 0;
              var isRunning = d.timerState === 'running';
              el.classList.toggle('con-node-timer', true);
              el.classList.toggle('con-timer-running', isRunning);
              el.classList.toggle('con-timer-warning', isRunning && isWarn);
              el.classList.toggle('con-timer-ended', isEnded);
              var digits = el.querySelector('.con-timer-digits');
              if (digits && digits.textContent !== timeStr) digits.textContent = timeStr;
            }
          }
          return;
        }

        if (d.type === 'node-random-roll') {
          if (_mirrorIsFrozen) return;
          var randomNode = (window.conGetNodes ? window.conGetNodes() : []).find(function (n) { return String(n.id) === String(d.id); });
          if (randomNode && randomNode.isRandom) {
            randomNode.randomValue = d.value;
            randomNode.baseWord = '=random(' + randomNode.randomMin + ',' + randomNode.randomMax + ')';
            if (typeof conUpdateRandomNodeDisplay === 'function') {
              conUpdateRandomNodeDisplay(randomNode);
            } else if (typeof conRenderNodeLabel === 'function') {
              conRenderNodeLabel(randomNode);
            }
          } else {
            // Fallback: update the digits span directly if node not found in array
            var rEl = document.getElementById(String(d.id));
            if (rEl) {
              var rDigits = rEl.querySelector('.con-random-digits');
              if (rDigits) rDigits.textContent = String(d.value);
            }
          }
          return;
        }

        if (d.type === 'node-sound-state') {
          if (_mirrorIsFrozen) return;
          var soundNode = (window.conGetNodes ? window.conGetNodes() : []).find(function (n) { return String(n.id) === String(d.id); });
          if (soundNode && soundNode.isSound) {
            soundNode.soundState = d.soundState;
            soundNode.soundCurrentTime = d.currentTime;
            if (d.duration != null) soundNode.soundDuration = d.duration;
            if (typeof conUpdateSoundNodeDisplay === 'function') {
              conUpdateSoundNodeDisplay(soundNode);
            } else if (typeof conRenderNodeLabel === 'function') {
              conRenderNodeLabel(soundNode);
            }
          } else {
            var sEl = document.getElementById(String(d.id));
            if (sEl) {
              sEl.classList.toggle('con-node-sound', true);
              sEl.classList.toggle('con-sound-playing', d.soundState === 'playing');
              sEl.classList.toggle('con-sound-paused', d.soundState === 'paused');
              var sDigits = sEl.querySelector('.con-sound-digits');
              if (sDigits && d.currentTime != null && d.duration != null && d.duration > 0) {
                var curStr = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(d.currentTime)) : String(Math.round(d.currentTime));
                var durStr = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(d.duration)) : String(Math.round(d.duration));
                var timeStr = curStr + ' / ' + durStr;
                sDigits.style.display = '';
                if (sDigits.textContent !== timeStr) sDigits.textContent = timeStr;
              }
            }
          }
          return;
        }

        if (d.type === 'node-video-state') {
          if (_mirrorIsFrozen) return;
          var videoNode = (window.conGetNodes ? window.conGetNodes() : []).find(function (n) { return String(n.id) === String(d.id); });
          if (videoNode && videoNode.isVideo) {
            videoNode.videoState = d.videoState;
            videoNode.videoCurrentTime = d.currentTime;
            if (d.duration != null) videoNode.videoDuration = d.duration;
            if (typeof conUpdateVideoNodeDisplay === 'function') {
              conUpdateVideoNodeDisplay(videoNode);
            } else if (typeof conRenderNodeLabel === 'function') {
              conRenderNodeLabel(videoNode);
            }
          } else {
            var vEl = document.getElementById(String(d.id));
            if (vEl) {
              vEl.classList.toggle('con-node-video', true);
              vEl.classList.toggle('con-video-playing', d.videoState === 'playing');
              vEl.classList.toggle('con-video-paused', d.videoState === 'paused');
              var vDigits = vEl.querySelector('.con-video-digits');
              if (vDigits && d.currentTime != null && d.duration != null && d.duration > 0) {
                var vCurStr = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(d.currentTime)) : String(Math.round(d.currentTime));
                var vDurStr = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(d.duration)) : String(Math.round(d.duration));
                var vTimeStr = vCurStr + ' / ' + vDurStr;
                vDigits.style.display = '';
                if (vDigits.textContent !== vTimeStr) vDigits.textContent = vTimeStr;
              }
            }
          }
          if (typeof _mirrorSyncVideoNodePlayback === 'function') {
            _mirrorSyncVideoNodePlayback(d, videoNode);
          }
          return;
        }

        if (d.type === 'note-text') {
          if (_mirrorIsFrozen) return;
          var noteEl = document.querySelector('.con-word-note[data-id="' + d.id + '"]');
          if (noteEl) {
            var editor = noteEl.querySelector('.wn-note-editor');
            if (editor) {
              var content = d.html ? String(d.html) : boardEscapeHtml(d.text || '').replace(/\n/g, '<br>');
              var rendered = (typeof wnRenderMathHtml === 'function') ? wnRenderMathHtml(content) : content;
              if (editor.innerHTML !== rendered) editor.innerHTML = rendered;
              var _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
              var noteObj = _liveNotes.find(function (n) { return String(n.id) === String(d.id); });
              if (noteObj) {
                noteObj.html = d.html || '';
                noteObj.text = d.text || '';
                if (typeof d.baseWidth === 'number') {
                  noteObj.liveBaseWidth = d.baseWidth;
                  noteObj.width = d.baseWidth;
                } else if (typeof d.width === 'number') {
                  noteObj.liveBaseWidth = d.width;
                  noteObj.width = d.width;
                }
                if (typeof d.baseHeight === 'number') {
                  noteObj.liveBaseHeight = d.baseHeight;
                  noteObj.height = d.baseHeight;
                } else if (typeof d.height === 'number') {
                  noteObj.liveBaseHeight = d.height;
                  noteObj.height = d.height;
                }
                if (d.manualSize !== undefined) noteObj.manualSize = !!d.manualSize;
                if (typeof conNoteAutosize === 'function') conNoteAutosize(editor, noteObj);
              }
              if (_mirrorCurrentNoteSelection && String(_mirrorCurrentNoteSelection.noteId) === String(d.id)) {
                _mirrorApplyNoteTextSelection(_mirrorCurrentNoteSelection);
              }
              if (typeof conRedrawEdges === 'function') conRedrawEdges();
              if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
            }
          }
          return;
        }

        if (d.type === 'note-text-selection') {
          if (_mirrorIsFrozen) return;
          _mirrorApplyNoteTextSelection(d.selection);
          return;
        }

        if (d.type === 'table-cell-text') {
          if (_mirrorIsFrozen) return;
          var tblEl = document.querySelector('.con-table-el[data-tid="' + d.id + '"]');
          if (tblEl) {
            var cellEl = tblEl.querySelector('.con-table-cell[data-row="' + d.row + '"][data-col="' + d.col + '"]');
            if (cellEl) {
              var textEl = cellEl.querySelector('.con-table-cell-text');
              if (textEl && textEl.textContent !== (d.text || '')) {
                textEl.textContent = d.text || '';
              }
            }
          }
          var _liveTables = window.conGetTables ? window.conGetTables() : [];
          var tblObj = _liveTables.find(function (t) { return String(t.id) === String(d.id); });
          if (tblObj) {
            var cellObj = tblObj.cells && tblObj.cells[d.row * tblObj.cols + d.col];
            if (cellObj) {
              cellObj.text = d.text || '';
            }
          }
          return;
        }

        if (d.type === 'selection-state') {
          if (_mirrorIsFrozen) return;
          _mirrorApplySelectionState(d);
          return;
        }

        if (d.type === 'board-state') {
          var prevFrozen = _mirrorIsFrozen;
          if (d.frozen !== undefined) {
            _mirrorIsFrozen = !!d.frozen;
            _setMirrorFrozenUi(_mirrorIsFrozen);
            _setMirrorMenuFrozen(_mirrorIsFrozen);
            if (prevFrozen && !_mirrorIsFrozen) {
              _lastRenderedRevision = null;
              _reapplyMirrorBlinks();
            }
          }
          if (_mirrorIsFrozen && !d.forceRender) {
            return;
          }
          console.log('[BoardMirror] Received board-state:', {
            boardViewW: d.boardViewW,
            boardViewH: d.boardViewH,
            sx: d.sx,
            sy: d.sy,
            zoom: d.zoom,
            snapshotNodes: d.snapshot ? (d.snapshot.nodes || []).length : 0,
            snapshotDrawings: d.snapshot ? (d.snapshot.drawings || []).length : 0,
            hasBoardBgRender: !!d.boardBgRender,
            revision: d.snapshot ? d.snapshot._revision : null,
            frozen: d.frozen,
            forceRender: d.forceRender
          });
          if (d.boardViewW) { _mvpW = d.boardViewW; _mvpH = d.boardViewH; }
          if (d.sx !== undefined) { _msx = d.sx; _msy = d.sy; }
          // Pre-populate attachment data URLs so media items render correctly in mirror
          if (d.attachmentDataUrls && typeof window.conSetAttachmentPreloadMap === 'function') {
            window.conSetAttachmentPreloadMap(d.attachmentDataUrls);
          }

          const incomingRevision = d.snapshot && (d.snapshot._revision || d.snapshot._conRevision);
          const isPageChange = (typeof d.pageIndex === 'number' && typeof conCurrentPageIndex === 'number' && d.pageIndex !== conCurrentPageIndex);
          const skipRestore = !isPageChange && !d.forceRender && !!(incomingRevision && _lastRenderedRevision && incomingRevision === _lastRenderedRevision);

          if (!skipRestore && d.snapshot) {
            let mountedFromCache = false;

            if (isPageChange) {
              // 1. Detach & cache departing mirror page DOM into memory
              if (typeof _conCacheCurrentPageDom === 'function') {
                _conCacheCurrentPageDom();
              }
              conCurrentPageIndex = d.pageIndex;
              if (typeof conUpdatePageBar === 'function') conUpdatePageBar();

              // 2. Attempt fast in-memory mount from mirror cache (instant < 2ms switch)
              if (typeof _conMountCachedPage === 'function') {
                mountedFromCache = _conMountCachedPage(d.pageIndex);
              }
            } else if (typeof d.pageIndex === 'number' && typeof conCurrentPageIndex === 'number') {
              conCurrentPageIndex = d.pageIndex;
              if (typeof conUpdatePageBar === 'function') conUpdatePageBar();
            }

            if (!mountedFromCache && typeof window.conRestorePageToBoard === 'function') {
              // Fallback: Cache miss (first time visit to this page on mirror) or forced same-page restore
              window.conRestorePageToBoard(d.snapshot, { mirrorSync: true });
            }

            _lastRenderedRevision = incomingRevision || null;
            // conDrawingsClear (called during restore) wipes con-draw-live-svg; re-attach the
            // in-progress live path so a mid-stroke board-state doesn't erase it from view.
            if (_mirrorLivePath) {
              var _lsvRestore = document.getElementById('con-draw-live-svg');
              if (_lsvRestore && !_mirrorLivePath.parentNode) _lsvRestore.appendChild(_mirrorLivePath);
            }
            if (d.boardBgRender && d.snapshot && d.snapshot.boardBg && typeof window.conSetBoardBgCacheFromMirror === 'function') {
              window.conSetBoardBgCacheFromMirror(d.snapshot.boardBg, d.boardBgRender);
            }
            _syncBlinkPhase();
            // Re-apply any active node attention blinks that survived the re-render
            Object.keys(_activeNodeBlinks).forEach(function (nid) {
              _mirrorApplyNodeBlink(nid, _activeNodeBlinks[nid]);
            });
            _mirrorApplyNoteTextSelection(d.noteTextSelection !== undefined ? d.noteTextSelection : _mirrorCurrentNoteSelection);
          }

          _mirrorApplySelectionState({
            selectedNodeId: d.selectedNodeId,
            selectedNodeIds: d.selectedNodeIds,
            selectedGroupId: d.selectedGroupId,
            selectedNoteIds: d.selectedNoteIds,
            selectedDrawingIds: d.selectedDrawingIds,
            selectedShapeIds: d.selectedShapeIds,
            selectedEdgeId: d.selectedEdgeId,
            noteTextSelection: d.noteTextSelection
          });

          // Sync pointer dot visibility
          if (d.pointerOn !== undefined) {
            document.body.classList.toggle('con-pointer-on', !!d.pointerOn);
            var ld2 = _laserDot();
            if (ld2 && !document.body.classList.contains('laser-active')) {
              ld2.style.display = d.pointerOn ? 'block' : 'none';
            }
          }
          if (d.frozen !== undefined) {
            _mirrorIsFrozen = !!d.frozen;
            _setMirrorFrozenUi(_mirrorIsFrozen);
          }
          if (d.mediaPlaybackStates) {
            var liveMItems = window.conGetMediaItems ? window.conGetMediaItems() : [];
            Object.keys(d.mediaPlaybackStates).forEach(function (mid) {
              var st = d.mediaPlaybackStates[mid];
              var it = liveMItems.find(function (m) { return String(m.id) === String(mid); });
              if (it) it._mediaSyncState = st;
              var w = document.querySelector('.con-media-item[data-id="' + mid + '"]');
              if (w) {
                var el = w.querySelector('video, audio');
                if (el && typeof el._applyMirrorMediaSync === 'function') {
                  el._applyMirrorMediaSync();
                }
              }
            });
          }
          if (d.cmsTimer && typeof boardApplyCmsTimerData === 'function') {
            boardApplyCmsTimerData(d.cmsTimer);
            if (d.cmsTimer.ui && typeof boardApplyCmsTimerUiFromRemote === 'function') {
              boardApplyCmsTimerUiFromRemote(d.cmsTimer.ui);
            }
          }
          if (typeof d.zoom === 'number' && typeof window.updateZoom === 'function') {
            window.updateZoom(d.zoom);
          }
          _mirrorApplyViewport();
          return;
        }

        if (d.type === 'board-scroll') {
          if (_mirrorIsFrozen) return;
          if (typeof d.zoom === 'number' && typeof window.updateZoom === 'function') {
            window.updateZoom(d.zoom);
          }
          _msx = d.sx; _msy = d.sy;
          if (d.boardViewW) { _mvpW = d.boardViewW; _mvpH = d.boardViewH; }
          _mirrorScheduleApplyViewport();
          return;
        }

        if (d.type === 'board-zoom') {
          if (_mirrorIsFrozen) return;
          if (typeof d.zoom === 'number' && typeof window.updateZoom === 'function') {
            window.updateZoom(d.zoom);
          }
          if (typeof d.sx === 'number' && typeof d.sy === 'number') {
            _msx = d.sx; _msy = d.sy;
          }
          if (d.boardViewW) { _mvpW = d.boardViewW; _mvpH = d.boardViewH; }
          _mirrorScheduleApplyViewport();
          return;
        }

        if (d.type === 'pdf-view-state') {
          if (_mirrorIsFrozen) return;
          var _pdfItemId = String(d.itemId || '');
          if (!_pdfItemId) return;
          var _pdfItems = window.conGetMediaItems ? window.conGetMediaItems() : [];
          var _pdfItem = null;
          for (var _pi = 0; _pi < _pdfItems.length; _pi++) {
            if (String(_pdfItems[_pi].id || '') === _pdfItemId) { _pdfItem = _pdfItems[_pi]; break; }
          }
          if (!_pdfItem) return;
          var _pdfChanged = false;
          if (typeof d.pdfZoom === 'number' && d.pdfZoom !== _pdfItem.pdfZoom) { _pdfItem.pdfZoom = d.pdfZoom; _pdfChanged = true; }
          if (typeof d.pdfRotation === 'number' && d.pdfRotation !== _pdfItem.pdfRotation) { _pdfItem.pdfRotation = d.pdfRotation; _pdfChanged = true; }
          if (typeof d.pdfLockSize === 'boolean' && d.pdfLockSize !== _pdfItem.pdfLockSize) { _pdfItem.pdfLockSize = d.pdfLockSize; _pdfChanged = true; }
          var _pdfWrap = document.querySelector('.con-media-item[data-id="' + _pdfItemId + '"]');
          if (!_pdfWrap) return;
          var _pdfCvs = _pdfWrap.querySelector('canvas.con-media-pdf-canvas');
          var _pdfScrDiv = _pdfWrap.querySelector('.con-media-pdf-scroll');
          var _pdfCntEl = _pdfWrap.querySelector('.con-media-content');
          if (_pdfChanged && _pdfCvs && typeof conRenderPdfForItem === 'function') {
            var _pdfMiniBtn = _pdfWrap.querySelector('.con-media-mini-btn[data-action="lockfit"]');
            if (_pdfMiniBtn) _pdfMiniBtn.classList.toggle('active', !!_pdfItem.pdfLockSize);
            conRenderPdfForItem(_pdfItem, _pdfCvs, _pdfScrDiv, _pdfCntEl).then(function () {
              if (_pdfScrDiv && typeof d.pdfScrollX === 'number') {
                if (_pdfItem.pdfLockSize) {
                  _pdfScrDiv.scrollLeft = 0;
                  _pdfScrDiv.scrollTop = 0;
                } else {
                  _pdfScrDiv.scrollLeft = d.pdfScrollX;
                  _pdfScrDiv.scrollTop = d.pdfScrollY || 0;
                }
              }
            });
          } else if (_pdfScrDiv && typeof d.pdfScrollX === 'number' && !_pdfItem.pdfLockSize) {
            _pdfScrDiv.scrollLeft = d.pdfScrollX;
            _pdfScrDiv.scrollTop = d.pdfScrollY || 0;
          }
          return;
        }

        if (d.type === 'group-style') {
          if (_mirrorIsFrozen) return;
          var gel = document.querySelector('#constellation-board [data-gid="' + d.groupId + '"]');
          if (gel) {
            gel.classList.toggle('con-group-invisible', !!d.invisible);
            if (d.invisible) {
              gel.style.background = 'transparent';
              gel.style.borderColor = 'transparent';
            } else {
              var pal = (window.CON_PALETTES && window.CON_PALETTES[d.paletteIdx]) || ['rgba(240,240,240,0.5)', '#111', '#111'];
              gel.style.borderColor = pal[2] || '#111';
              gel.style.color = pal[1] || '#111';
              var bgRaw = pal[0] || '#ffffff';
              if (bgRaw === '#ffffff') {
                gel.style.background = 'rgba(240,240,240,0.5)';
              } else if (bgRaw.startsWith('rgba') || bgRaw.startsWith('rgb')) {
                gel.style.background = bgRaw;
              } else {
                var r = parseInt(bgRaw.slice(1, 3), 16);
                var gv = parseInt(bgRaw.slice(3, 5), 16);
                var b = parseInt(bgRaw.slice(5, 7), 16);
                gel.style.background = 'rgba(' + r + ',' + gv + ',' + b + ',0.28)';
              }
            }
          }
          return;
        }

        if (d.type === 'blink-update') {
          if (_mirrorIsFrozen) return;
          var bel = document.querySelector('#constellation-board [data-gid="' + d.groupId + '"]');
          if (bel) {
            bel.classList.remove('con-group-blink');
            if (d.blink) {
              bel.style.setProperty('--con-group-blink-delay', '-' + ((Date.now() / 1000) % 3.6).toFixed(3) + 's');
              void bel.offsetWidth;
              bel.classList.add('con-group-blink');
            } else {
              bel.style.removeProperty('--con-group-blink-delay');
            }
          }
          return;
        }

        if (d.type === 'node-blink') {
          if (_mirrorIsFrozen) return;
          var blinkInfo = { durationMs: d.durationMs, startTime: performance.now(), borderColor: d.borderColor, cleanupTimer: null };
          if (_activeNodeBlinks[d.nodeId]) clearTimeout(_activeNodeBlinks[d.nodeId].cleanupTimer);
          _activeNodeBlinks[d.nodeId] = blinkInfo;
          _mirrorApplyNodeBlink(d.nodeId, blinkInfo);
          return;
        }

        if (d.type === 'laser-toggle') {
          if (_mirrorIsFrozen) return;
          document.body.classList.toggle('laser-active', !!d.on);
          var ld = _laserDot();
          if (ld) ld.style.display = (d.on || document.body.classList.contains('con-pointer-on')) ? 'block' : 'none';
          return;
        }
        if (d.type === 'laser-move') {
          if (_mirrorIsFrozen) return;
          var p = _brdVP(d.nx, d.ny), ld = _laserDot();
          if (ld) { ld.style.transform = 'translate(' + (p.x - 7) + 'px, ' + (p.y - 7) + 'px)'; }
          return;
        }
        if (d.type === 'laser-mark') {
          if (_mirrorIsFrozen) return;
          var p = _brdVP(d.nx, d.ny); _mAddMark(p.x, p.y);
          return;
        }
        if (d.type === 'laser-trail') {
          if (_mirrorIsFrozen) return;
          var p = _brdVP(d.nx, d.ny); _mAddTrail(p.x, p.y, d.size);
          return;
        }
        if (d.type === 'laser-pulse') {
          if (_mirrorIsFrozen) return;
          var p = _brdVP(d.nx, d.ny); _mAddPulse(p.x, p.y);
          return;
        }
        if (d.type === 'pointer-state') {
          if (_mirrorIsFrozen) return;
          var ld = _laserDot();
          document.body.classList.toggle('con-pointer-on', !!d.on);
          if (ld) ld.style.display = d.on ? 'block' : (document.body.classList.contains('laser-active') ? 'block' : 'none');
          return;
        }
        if (d.type === 'freeze-state') {
          var wasFrozen = _mirrorIsFrozen;
          _mirrorIsFrozen = !!d.on;
          _setMirrorFrozenUi(_mirrorIsFrozen);
          _setMirrorMenuFrozen(_mirrorIsFrozen);
          if (wasFrozen && !_mirrorIsFrozen) {
            _lastRenderedRevision = null;
            _reapplyMirrorBlinks();
            try { ch.postMessage({ type: 'request-state' }); } catch (e) { }
          }
          return;
        }

        if (d.type === 'mirror-pin-state') {
          _setMirrorMenuPinned(!!d.on);
          return;
        }

        if (d.type === 'cms-timer-ui') {
          if (d.ui && typeof boardApplyCmsTimerUiFromRemote === 'function') {
            boardApplyCmsTimerUiFromRemote(d.ui);
          }
          return;
        }

        if (d.type === 'toggle-card-preview') {
          var pEl = document.getElementById('con-preview-list-' + d.noteId);
          if (pEl) {
            pEl.style.display = d.visible ? 'block' : 'none';
          }
          return;
        }

        if (d.type === 'live-path-start') {
          if (_mirrorIsFrozen) return;
          var _lsv = document.getElementById('con-draw-live-svg');
          if (!_lsv) return;
          _lsv.innerHTML = '';
          _mirrorLivePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          _mirrorLivePath.setAttribute('fill', 'none');
          _mirrorLivePath.setAttribute('stroke', d.color || '#e53935');
          _mirrorLivePath.setAttribute('stroke-width', String(d.thickness || 4));
          _mirrorLivePath.setAttribute('stroke-linecap', 'round');
          _mirrorLivePath.setAttribute('stroke-linejoin', 'round');
          _mirrorLivePath.setAttribute('opacity', String(d.opacity || 1));
          _mirrorLivePath.style.pointerEvents = 'none';
          _lsv.appendChild(_mirrorLivePath);
          return;
        }

        if (d.type === 'live-path') {
          if (_mirrorIsFrozen) return;
          if (_mirrorLivePath && _mirrorLivePath.parentNode && d.d) {
            _mirrorLivePath.setAttribute('d', d.d);
          }
          return;
        }

        if (d.type === 'live-path-commit') {
          var _lsvCommit = document.getElementById('con-draw-live-svg');
          if (_lsvCommit) _lsvCommit.innerHTML = '';
          _mirrorLivePath = null;
          return;
        }

        if (d.type === 'live-path-end') {
          var _lsv2 = document.getElementById('con-draw-live-svg');
          if (_lsv2) _lsv2.innerHTML = '';
          _mirrorLivePath = null;
          return;
        }

        if (d.type === 'node-move') {
          if (_mirrorIsFrozen) return;
          if (!d.positions || !d.positions.length) return;
          var _liveNodes = window.conGetNodes ? window.conGetNodes() : [];
          d.positions.forEach(function (p) {
            var nel = document.getElementById(p.id);
            if (nel) {
              nel.style.left = p.x + 'px';
              nel.style.top = p.y + 'px';
            }
            var nd = _liveNodes.find(function (n) { return String(n.id) === String(p.id); });
            if (nd) {
              nd.x = p.x;
              nd.y = p.y;
              nd.baseX = p.x;
              nd.baseY = p.y;
            }
          });
          // Redraw edges so connections stay aligned during the drag
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
          return;
        }

        if (d.type === 'note-move') {
          if (_mirrorIsFrozen) return;
          if (!d.positions || !d.positions.length) return;
          var _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
          d.positions.forEach(function (p) {
            var nel = document.querySelector('#constellation-board .con-word-note[data-id="' + p.id + '"]');
            if (nel) {
              nel.style.left = p.x + 'px';
              nel.style.top = p.y + 'px';
            }
            var nt = _liveNotes.find(function (n) { return String(n.id) === String(p.id); });
            if (nt) {
              nt.x = p.x;
              nt.y = p.y;
            }
          });
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
          return;
        }

        if (d.type === 'sticker-add') {
          if (_mirrorIsFrozen) return;
          if (d.target === 'board') {
            var brdEl = document.getElementById('constellation-board');
            if (brdEl && d.sticker) {
              if (!window._conBoardStickers) window._conBoardStickers = [];
              window._conBoardStickers.push(d.sticker);
              if (typeof conNoteBuildSticker === 'function') {
                conNoteBuildSticker(d.sticker, { emojiStickers: window._conBoardStickers }, brdEl);
              }
            }
          } else if (d.target === 'note' && d.noteId) {
            var noteEl = document.querySelector('#constellation-board .con-word-note[data-id="' + d.noteId + '"]');
            var noteObj = (window.conGetNotes ? window.conGetNotes() : []).find(function (n) { return n.id === d.noteId; });
            if (noteEl && noteObj && d.sticker) {
              if (!noteObj.emojiStickers) noteObj.emojiStickers = [];
              noteObj.emojiStickers.push(d.sticker);
              if (typeof conNoteBuildSticker === 'function') {
                conNoteBuildSticker(d.sticker, noteObj, noteEl);
              }
            }
          }
          return;
        }

        if (d.type === 'sticker-update') {
          if (_mirrorIsFrozen) return;
          var sel = document.querySelector('#constellation-board .wn-emoji-sticker[data-sticker-id="' + d.id + '"]');
          var z = window.conGetZoom ? window.conGetZoom() : 1;
          if (sel) {
            if (d.x !== undefined) sel.style.left = (d.x * z) + 'px';
            if (d.y !== undefined) sel.style.top = (d.y * z) + 'px';
            if (d.size !== undefined) sel.style.fontSize = (d.size * z) + 'px';
          }
          if (window._conBoardStickers) {
            var bsd = window._conBoardStickers.find(function (s) { return s.id === d.id; });
            if (bsd) {
              if (d.x !== undefined) bsd.x = d.x;
              if (d.y !== undefined) bsd.y = d.y;
              if (d.size !== undefined) bsd.size = d.size;
            }
          }
          var allNotes = window.conGetNotes ? window.conGetNotes() : [];
          allNotes.forEach(function (nd) {
            if (nd.emojiStickers) {
              var nsd = nd.emojiStickers.find(function (s) { return s.id === d.id; });
              if (nsd) {
                if (d.x !== undefined) nsd.x = d.x;
                if (d.y !== undefined) nsd.y = d.y;
                if (d.size !== undefined) nsd.size = d.size;
              }
            }
          });
          return;
        }

        if (d.type === 'sticker-delete') {
          if (_mirrorIsFrozen) return;
          var delEl = document.querySelector('#constellation-board .wn-emoji-sticker[data-sticker-id="' + d.id + '"]');
          if (delEl) delEl.remove();
          if (window._conBoardStickers) {
            window._conBoardStickers = window._conBoardStickers.filter(function (s) { return s.id !== d.id; });
          }
          var allNotes2 = window.conGetNotes ? window.conGetNotes() : [];
          allNotes2.forEach(function (nd) {
            if (nd.emojiStickers) {
              nd.emojiStickers = nd.emojiStickers.filter(function (s) { return s.id !== d.id; });
            }
          });
          return;
        }

        if (d.type === 'note-blink') {
          if (_mirrorIsFrozen) return;
          var nEl = (typeof wnGetNoteElementById === 'function')
            ? wnGetNoteElementById(d.noteId)
            : document.querySelector('#constellation-board .con-word-note[data-id="' + d.noteId + '"], #constellation-board .ta-word-note[data-id="' + d.noteId + '"]');
          if (nEl) {
            nEl.classList.remove('wn-blink');
            if (d.blink) {
              nEl.style.setProperty('--wn-blink-delay', '-' + ((Date.now() / 1000) % 3.6).toFixed(3) + 's');
              void nEl.offsetWidth;
              nEl.classList.add('wn-blink');
            } else {
              nEl.style.removeProperty('--wn-blink-delay');
            }
          }
          var _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
          var noteObj = _liveNotes.find(function (n) { return String(n.id) === String(d.noteId); });
          if (noteObj) noteObj.blink = !!d.blink;
          return;
        }

        if (d.type === 'note-hide') {
          if (_mirrorIsFrozen) return;
          var _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
          var noteObj = _liveNotes.find(function (n) { return String(n.id) === String(d.id); });
          if (noteObj && d.hidden !== undefined) {
            noteObj.hidden = !!d.hidden;
            if (typeof noteObj._applyStyle === 'function') noteObj._applyStyle();
            if (typeof wnApplyHiddenState === 'function' && typeof wnGetNoteElementById === 'function') {
              wnApplyHiddenState(noteObj, wnGetNoteElementById(noteObj.id));
            } else {
              var nEl = document.querySelector('#constellation-board .con-word-note[data-id="' + d.id + '"]');
              if (nEl) nEl.classList.toggle('wn-note-hidden', !!d.hidden);
            }
          }
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
          return;
        }

        if (d.type === 'toggle-card-preview') {
          if (_mirrorIsFrozen) return;
          var pEl = document.getElementById('con-preview-list-' + d.noteId);
          if (pEl) {
            pEl.style.display = d.visible ? 'block' : 'none';
          }
          return;
        }

        if (d.type === 'media-move') {
          if (_mirrorIsFrozen) return;
          var mEl = document.querySelector('.con-media-item[data-id="' + d.id + '"]');
          if (mEl) {
            if (typeof d.x === 'number') mEl.style.left = d.x + 'px';
            if (typeof d.y === 'number') mEl.style.top = d.y + 'px';
          }
          var _liveMedia = window.conGetMediaItems ? window.conGetMediaItems() : [];
          var mObj = _liveMedia.find(function (m) { return String(m.id) === String(d.id); });
          if (mObj) {
            if (typeof d.x === 'number') mObj.x = d.x;
            if (typeof d.y === 'number') mObj.y = d.y;
          }
          return;
        }

        if (d.type === 'media-resize') {
          if (_mirrorIsFrozen) return;
          var mEl = document.querySelector('.con-media-item[data-id="' + d.id + '"]');
          if (mEl) {
            if (typeof d.x === 'number') mEl.style.left = d.x + 'px';
            if (typeof d.y === 'number') mEl.style.top = d.y + 'px';
            if (typeof d.w === 'number') mEl.style.width = d.w + 'px';
            if (typeof d.h === 'number') mEl.style.height = d.h + 'px';
          }
          var _liveMedia = window.conGetMediaItems ? window.conGetMediaItems() : [];
          var mObj = _liveMedia.find(function (m) { return String(m.id) === String(d.id); });
          if (mObj) {
            if (typeof d.x === 'number') mObj.x = d.x;
            if (typeof d.y === 'number') mObj.y = d.y;
            if (typeof d.w === 'number') mObj.w = d.w;
            if (typeof d.h === 'number') mObj.h = d.h;
          }
          return;
        }

        if (d.type === 'media-fullscreen') {
          if (_mirrorIsFrozen) return;
          var _liveMediaFs = window.conGetMediaItems ? window.conGetMediaItems() : [];
          var mFsItem = _liveMediaFs.find(function (m) { return String(m.id) === String(d.id); });
          var mFsWrap = document.querySelector('.con-media-item[data-id="' + d.id + '"]');
          if (!mFsWrap) return;
          if (mFsItem) {
            mFsItem._fullscreen = !!d.fullscreen;
            if (typeof d.fsZoom === 'number') mFsItem._fsZoom = d.fsZoom;
            if (typeof d.fsPanX === 'number') mFsItem._fsPanX = d.fsPanX;
            if (typeof d.fsPanY === 'number') mFsItem._fsPanY = d.fsPanY;
          }
          if (d.fullscreen) {
            if (mFsWrap.parentElement !== document.body) {
              document.body.appendChild(mFsWrap);
            }
            mFsWrap.classList.add('con-media-fullscreen');
            if (mFsItem && typeof _conFsApplyTransform === 'function') {
              _conFsApplyTransform(mFsItem, mFsWrap);
            }
            if (mFsItem && mFsItem.kind === 'pdf') {
              var _fsCvs = mFsWrap.querySelector('canvas.con-media-pdf-canvas');
              var _fsScrDiv = mFsWrap.querySelector('.con-media-pdf-scroll');
              var _fsCntEl = mFsWrap.querySelector('.con-media-content');
              if (_fsCvs && typeof conRenderPdfForItem === 'function') {
                conRenderPdfForItem(mFsItem, _fsCvs, _fsScrDiv, _fsCntEl);
              }
            }
          } else {
            mFsWrap.classList.remove('con-media-fullscreen');
            var brdEl = document.getElementById('constellation-board');
            if (brdEl && mFsWrap.parentElement !== brdEl) {
              brdEl.appendChild(mFsWrap);
            }
            if (mFsItem) {
              mFsWrap.style.left = mFsItem.x + 'px';
              mFsWrap.style.top = mFsItem.y + 'px';
              mFsWrap.style.width = mFsItem.w + 'px';
              mFsWrap.style.height = mFsItem.h + 'px';
              var contentEl = mFsWrap.querySelector('.con-media-content');
              if (contentEl) {
                contentEl.style.transform = (mFsItem.kind === 'pics' && mFsItem.rotation) ? ('rotate(' + mFsItem.rotation + 'deg)') : '';
              }
              if (mFsItem.kind === 'pdf') {
                var _fsCvs2 = mFsWrap.querySelector('canvas.con-media-pdf-canvas');
                var _fsScrDiv2 = mFsWrap.querySelector('.con-media-pdf-scroll');
                var _fsCntEl2 = mFsWrap.querySelector('.con-media-content');
                if (_fsCvs2 && typeof conRenderPdfForItem === 'function') {
                  conRenderPdfForItem(mFsItem, _fsCvs2, _fsScrDiv2, _fsCntEl2);
                }
              }
            }
          }
          return;
        }

        if (d.type === 'media-fs-transform') {
          if (_mirrorIsFrozen) return;
          var _liveMediaTrans = window.conGetMediaItems ? window.conGetMediaItems() : [];
          var mTransItem = _liveMediaTrans.find(function (m) { return String(m.id) === String(d.id); });
          var mTransWrap = document.querySelector('.con-media-item[data-id="' + d.id + '"]');
          if (mTransItem) {
            if (typeof d.fsZoom === 'number') mTransItem._fsZoom = d.fsZoom;
            if (typeof d.fsPanX === 'number') mTransItem._fsPanX = d.fsPanX;
            if (typeof d.fsPanY === 'number') mTransItem._fsPanY = d.fsPanY;
          }
          if (mTransWrap && mTransItem && typeof _conFsApplyTransform === 'function') {
            _conFsApplyTransform(mTransItem, mTransWrap);
          }
          return;
        }

        if (d.type === 'media-hide') {
          if (_mirrorIsFrozen) return;
          var _liveMedia = window.conGetMediaItems ? window.conGetMediaItems() : [];
          var mObj = _liveMedia.find(function (m) { return String(m.id) === String(d.id); });
          if (mObj && d.hidden !== undefined) {
            mObj.hidden = !!d.hidden;
            if (typeof _conApplyMediaStyles === 'function' && typeof _conMediaGetWrap === 'function') {
              _conApplyMediaStyles(mObj, _conMediaGetWrap(mObj));
            } else {
              var mWrap = document.querySelector('.con-media-item[data-id="' + d.id + '"]');
              if (mWrap) mWrap.classList.toggle('con-media-hidden', !!d.hidden);
            }
          }
          return;
        }

        if (d.type === 'media-playback') {
          if (_mirrorIsFrozen) return;
          var mLiveItems = window.conGetMediaItems ? window.conGetMediaItems() : [];
          var mSyncItem = mLiveItems.find(function (m) { return String(m.id) === String(d.id); });
          if (mSyncItem) {
            mSyncItem._mediaSyncState = {
              action: d.action,
              currentTime: d.currentTime,
              playbackRate: d.playbackRate,
              paused: d.paused
            };
          }
          var mSyncWrap = document.querySelector('.con-media-item[data-id="' + d.id + '"]');
          if (!mSyncWrap) return;
          var mSyncEl = mSyncWrap.querySelector('video, audio');
          if (!mSyncEl) return;
          if (typeof mSyncEl._applyMirrorMediaSync === 'function') {
            mSyncEl._applyMirrorMediaSync();
          } else {
            if (typeof d.playbackRate === 'number' && d.playbackRate > 0) {
              try { mSyncEl.playbackRate = d.playbackRate; } catch (_) {}
            }
            if (typeof d.currentTime === 'number' && Number.isFinite(d.currentTime)) {
              if (d.action === 'seek' || Math.abs((mSyncEl.currentTime || 0) - d.currentTime) > 0.3) {
                try { mSyncEl.currentTime = d.currentTime; } catch (_) {}
              }
            }
            if (d.action === 'play' || (!d.paused && d.action === 'timeupdate')) {
              if (mSyncEl.paused) {
                try {
                  var pSync = mSyncEl.play();
                  if (pSync && typeof pSync.catch === 'function') pSync.catch(function () {});
                } catch (_) {}
              }
            } else if (d.action === 'pause' || d.paused) {
              try { mSyncEl.pause(); } catch (_) {}
            }
          }
          return;
        }

        if (d.type === 'table-move') {
          if (_mirrorIsFrozen) return;
          var _tPositions = Array.isArray(d.positions) ? d.positions : (d.id ? [{ id: d.id, x: d.x, y: d.y }] : []);
          if (!_tPositions.length) return;
          var _liveTables = window.conGetTables ? window.conGetTables() : [];
          _tPositions.forEach(function (tp) {
            var tEl = document.querySelector('.con-table-el[data-tid="' + tp.id + '"]');
            if (tEl) {
              if (typeof tp.x === 'number') tEl.style.left = tp.x + 'px';
              if (typeof tp.y === 'number') tEl.style.top = tp.y + 'px';
            }
            var tObj = _liveTables.find(function (t) { return String(t.id) === String(tp.id); });
            if (tObj) {
              if (typeof tp.x === 'number') tObj.x = tp.x;
              if (typeof tp.y === 'number') tObj.y = tp.y;
            }
          });
          return;
        }

        if (d.type === 'shape-move') {
          if (_mirrorIsFrozen) return;
          if (!d.positions || !d.positions.length) return;
          d.positions.forEach(function (p) {
            var sEl = document.querySelector('#constellation-board .con-shape[data-sid="' + p.id + '"]');
            var _liveShapes = window.conGetShapes ? window.conGetShapes() : [];
            var sObj = _liveShapes.find(function (s) { return String(s.id) === String(p.id); });
            var pad = sObj ? (sObj.pad || (typeof _conShapeGetPAD === 'function' ? _conShapeGetPAD(sObj) : 16)) : 16;
            if (sEl) {
              sEl.style.left = (p.x - pad) + 'px';
              sEl.style.top = (p.y - pad) + 'px';
            }
            if (sObj) {
              sObj.x = p.x;
              sObj.y = p.y;
              if (p.lx1 !== undefined) { sObj.lx1 = p.lx1; sObj.ly1 = p.ly1; sObj.lx2 = p.lx2; sObj.ly2 = p.ly2; }
              if (p.pts) sObj.pts = p.pts;
              if (typeof window._conShapeUpdateGeom === 'function') window._conShapeUpdateGeom(sObj);
            }
          });
          return;
        }

        if (d.type === 'drawing-move') {
          if (_mirrorIsFrozen) return;
          if (!d.positions || !d.positions.length) return;
          d.positions.forEach(function (p) {
            var dEl = document.querySelector('#constellation-board .con-drawing[data-did="' + p.id + '"]');
            var _liveDrawings = window.conGetDrawings ? window.conGetDrawings() : [];
            var dObj = _liveDrawings.find(function (dr) { return String(dr.id) === String(p.id); });
            var pad = dObj ? Math.max(dObj.thickness + 4, 12) : 12;
            if (dEl) {
              dEl.style.left = (p.x - pad) + 'px';
              dEl.style.top = (p.y - pad) + 'px';
            }
            if (dObj) {
              dObj.x = p.x;
              dObj.y = p.y;
            }
          });
          return;
        }

        if (d.type === 'mask-add') {
          if (_mirrorIsFrozen) return;
          if (!d.mask || !d.mask.id) return;
          var liveMasks = window.conGetMasks ? window.conGetMasks() : [];
          var existingMask = liveMasks.find(function (m) { return String(m.id) === String(d.mask.id); });
          if (!existingMask) {
            if (typeof window.conAddMaskFromData === 'function') {
              window.conAddMaskFromData(d.mask);
            }
          }
          return;
        }

        if (d.type === 'mask-move') {
          if (_mirrorIsFrozen) return;
          var mEl = document.querySelector('#constellation-board .con-mask-rect[data-mid="' + d.id + '"]');
          if (mEl) {
            if (typeof d.x === 'number') mEl.style.left = d.x + 'px';
            if (typeof d.y === 'number') mEl.style.top = d.y + 'px';
          }
          var _liveMasks = window.conGetMasks ? window.conGetMasks() : [];
          var mObj = _liveMasks.find(function (m) { return String(m.id) === String(d.id); });
          if (mObj) {
            if (typeof d.x === 'number') mObj.x = d.x;
            if (typeof d.y === 'number') mObj.y = d.y;
          }
          return;
        }

        if (d.type === 'mask-resize') {
          if (_mirrorIsFrozen) return;
          var mEl2 = document.querySelector('#constellation-board .con-mask-rect[data-mid="' + d.id + '"]');
          if (mEl2) {
            if (typeof d.width === 'number') mEl2.style.width = d.width + 'px';
            if (typeof d.height === 'number') mEl2.style.height = d.height + 'px';
            if (typeof d.x === 'number') mEl2.style.left = d.x + 'px';
            if (typeof d.y === 'number') mEl2.style.top = d.y + 'px';
          }
          var _liveMasks2 = window.conGetMasks ? window.conGetMasks() : [];
          var mObj2 = _liveMasks2.find(function (m) { return String(m.id) === String(d.id); });
          if (mObj2) {
            if (typeof d.width === 'number') mObj2.width = d.width;
            if (typeof d.height === 'number') mObj2.height = d.height;
            if (typeof d.x === 'number') mObj2.x = d.x;
            if (typeof d.y === 'number') mObj2.y = d.y;
          }
          return;
        }

        if (d.type === 'mask-style') {
          if (_mirrorIsFrozen) return;
          var mEl3 = document.querySelector('#constellation-board .con-mask-rect[data-mid="' + d.id + '"]');
          if (mEl3) {
            if (d.color) mEl3.style.background = d.color;
            if (d.opacity !== undefined) mEl3.style.opacity = String(d.opacity);
          }
          var _liveMasks3 = window.conGetMasks ? window.conGetMasks() : [];
          var mObj3 = _liveMasks3.find(function (m) { return String(m.id) === String(d.id); });
          if (mObj3) {
            if (d.color) mObj3.color = d.color;
            if (d.opacity !== undefined) mObj3.opacity = d.opacity;
          }
          return;
        }

        if (d.type === 'mask-remove') {
          if (_mirrorIsFrozen) return;
          var mEl4 = document.querySelector('#constellation-board .con-mask-rect[data-mid="' + d.id + '"]');
          if (mEl4) mEl4.remove();
          var _liveMasks4 = window.conGetMasks ? window.conGetMasks() : [];
          var mIdx = _liveMasks4.findIndex(function (m) { return String(m.id) === String(d.id); });
          if (mIdx !== -1) _liveMasks4.splice(mIdx, 1);
          return;
        }

        if (d.type === 'mask-clear') {
          if (_mirrorIsFrozen) return;
          if (typeof window.conMasksClear === 'function') {
            window.conMasksClear();
          }
          return;
        }

        if (d.type === 'edge-add') {
          if (_mirrorIsFrozen) return;
          if (!d.edge || !d.edge.id) return;
          var eData = d.edge;
          var liveEdges = window.conGetEdges ? window.conGetEdges() : [];
          var existingEdge = liveEdges.find(function (ed) { return String(ed.id) === String(eData.id); });
          if (!existingEdge) {
            if (typeof window._conRestoreEdge === 'function') {
              window._conRestoreEdge(
                eData.a,
                eData.b,
                eData.type,
                eData.label || '',
                eData.labelSize,
                eData.labelColor,
                eData.labelWeight,
                eData.thickness,
                eData.dashStyle || null,
                eData.id,
                eData.strokeType,
                eData.routing,
                eData.curvature,
                eData.opacity,
                eData.terminator,
                eData.animated,
                eData.labelBg,
                eData.anchorA,
                eData.anchorB,
                eData.colorMode,
                eData.strokeColor
              );
            }
          }
          if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
          return;
        }

        if (d.type === 'edge-remove') {
          if (_mirrorIsFrozen) return;
          var liveEdges2 = window.conGetEdges ? window.conGetEdges() : [];
          var edgeIdx = liveEdges2.findIndex(function (ed) { return String(ed.id) === String(d.id); });
          if (edgeIdx !== -1) {
            var ed = liveEdges2[edgeIdx];
            if (ed.g && ed.g.remove) ed.g.remove();
            liveEdges2.splice(edgeIdx, 1);
          } else {
            var el = document.querySelector('#constellation-svg [data-eid="' + d.id + '"]');
            if (el) el.remove();
          }
          if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
          return;
        }

        if (d.type === 'edge-update') {
          if (_mirrorIsFrozen) return;
          if (!d.edge || !d.edge.id) return;
          var eData2 = d.edge;
          var liveEdges3 = window.conGetEdges ? window.conGetEdges() : [];
          var ed2 = liveEdges3.find(function (e) { return String(e.id) === String(eData2.id); });
          if (ed2) {
            if (eData2.a !== undefined) ed2.a = eData2.a;
            if (eData2.b !== undefined) ed2.b = eData2.b;
            if (eData2.type !== undefined) ed2.type = eData2.type;
            if (eData2.label !== undefined) ed2.label = eData2.label;
            if (eData2.labelSize !== undefined) ed2.labelSize = Number(eData2.labelSize);
            if (eData2.labelColor !== undefined) ed2.labelColor = eData2.labelColor;
            if (eData2.labelWeight !== undefined) ed2.labelWeight = Number(eData2.labelWeight);
            if (eData2.thickness !== undefined) {
              ed2.thickness = Number(eData2.thickness);
              if (ed2.line) ed2.line.style.strokeWidth = String(ed2.thickness);
              if (ed2.hit) ed2.hit.style.strokeWidth = String(Math.max(16, ed2.thickness + 10));
            }
            if (eData2.dashStyle !== undefined) ed2.dashStyle = eData2.dashStyle;
            if (eData2.strokeType !== undefined) ed2.strokeType = eData2.strokeType;
            if (eData2.routing !== undefined) ed2.routing = eData2.routing;
            if (eData2.curvature !== undefined) ed2.curvature = Number(eData2.curvature);
            if (eData2.opacity !== undefined) ed2.opacity = Number(eData2.opacity);
            if (eData2.terminator !== undefined) ed2.terminator = eData2.terminator;
            if (eData2.animated !== undefined) ed2.animated = !!eData2.animated;
            if (eData2.labelBg !== undefined) ed2.labelBgActive = !!eData2.labelBg;
            if (eData2.anchorA !== undefined) ed2.anchorA = eData2.anchorA;
            if (eData2.anchorB !== undefined) ed2.anchorB = eData2.anchorB;
            if (eData2.colorMode !== undefined) ed2.colorMode = eData2.colorMode;
            if (eData2.strokeColor !== undefined) ed2.strokeColor = eData2.strokeColor;
            if (ed2.labelEl) ed2.labelEl.textContent = ed2.label || '';
            if (typeof window.conApplyEdgeLabelStyle === 'function') window.conApplyEdgeLabelStyle(ed2);
            if (typeof window.conUpdateEdge === 'function') window.conUpdateEdge(ed2);
          }
          if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
          return;
        }

        if (d.type === 'edge-move') {
          if (_mirrorIsFrozen) return;
          if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
          return;
        }

        if (d.type === 'link-mode-start') {
          var _lmBrd = document.getElementById('constellation-board');
          if (_lmBrd) _lmBrd.classList.add('con-linking');
          // Apply con-link-src to the source node element in-place
          var _lmNodes = window.conGetNodes ? window.conGetNodes() : [];
          _lmNodes.forEach(function (n) { if (n.el) n.el.classList.remove('con-link-src'); });
          var _lmSrc = _lmNodes.find(function (n) { return String(n.id) === String(d.srcId); });
          if (_lmSrc && _lmSrc.el) _lmSrc.el.classList.add('con-link-src');
          return;
        }

        if (d.type === 'link-mode-cancel') {
          var _lcBrd = document.getElementById('constellation-board');
          if (_lcBrd) _lcBrd.classList.remove('con-linking');
          var _lcNodes = window.conGetNodes ? window.conGetNodes() : [];
          _lcNodes.forEach(function (n) { if (n.el) n.el.classList.remove('con-link-src'); });
          return;
        }

        if (d.type === 'group-move') {
          if (_mirrorIsFrozen) return;
          var gEl = document.querySelector('#constellation-board [data-gid="' + d.groupId + '"]');
          if (gEl) {
            if (typeof d.gx === 'number') gEl.style.left = d.gx + 'px';
            if (typeof d.gy === 'number') gEl.style.top = d.gy + 'px';
          }
          var _liveGroups = window.conGetGroups ? window.conGetGroups() : [];
          var gObj = _liveGroups.find(function (g) { return String(g.id) === String(d.groupId); });
          if (gObj) {
            if (typeof d.gx === 'number') gObj._px = d.gx;
            if (typeof d.gy === 'number') gObj._py = d.gy;
          }
          if (Array.isArray(d.nodePositions)) {
            var _liveNodes = window.conGetNodes ? window.conGetNodes() : [];
            d.nodePositions.forEach(function (np) {
              var nel = document.getElementById(np.id);
              if (nel) {
                nel.style.left = np.x + 'px';
                nel.style.top = np.y + 'px';
              }
              var nd = _liveNodes.find(function (n) { return String(n.id) === String(np.id); });
              if (nd) {
                nd.x = np.x;
                nd.y = np.y;
                nd.baseX = np.x;
                nd.baseY = np.y;
              }
            });
          }
          if (Array.isArray(d.notePositions)) {
            var _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
            d.notePositions.forEach(function (ntp) {
              var noteEl = document.querySelector('#constellation-board .con-word-note[data-id="' + ntp.id + '"], #constellation-board .ta-word-note[data-id="' + ntp.id + '"]');
              if (noteEl) {
                noteEl.style.left = ntp.x + 'px';
                noteEl.style.top = ntp.y + 'px';
              }
              var nt = _liveNotes.find(function (n) { return String(n.id) === String(ntp.id); });
              if (nt) {
                nt.x = ntp.x;
                nt.y = ntp.y;
              }
            });
          }
          if (Array.isArray(d.drawPositions)) {
            var _liveDrawings = window.conGetDrawings ? window.conGetDrawings() : [];
            d.drawPositions.forEach(function (dp) {
              var drEl = document.querySelector('#constellation-board .con-drawing[data-did="' + dp.id + '"]');
              var drObj = _liveDrawings.find(function (dr) { return String(dr.id) === String(dp.id); });
              var pad = dp.pad || (drObj ? Math.max(drObj.thickness + 4, 12) : 12);
              if (drEl) {
                drEl.style.left = (dp.x - pad) + 'px';
                drEl.style.top = (dp.y - pad) + 'px';
              }
              if (drObj) {
                drObj.x = dp.x;
                drObj.y = dp.y;
              }
            });
          }
          if (Array.isArray(d.shapePositions)) {
            var _liveShapes = window.conGetShapes ? window.conGetShapes() : [];
            d.shapePositions.forEach(function (sp) {
              var sEl = document.querySelector('#constellation-board .con-shape[data-sid="' + sp.id + '"]');
              var sObj = _liveShapes.find(function (s) { return String(s.id) === String(sp.id); });
              var pad = sp.pad || (sObj ? (sObj.pad || (typeof _conShapeGetPAD === 'function' ? _conShapeGetPAD(sObj) : 16)) : 16);
              if (sEl) {
                sEl.style.left = (sp.x - pad) + 'px';
                sEl.style.top = (sp.y - pad) + 'px';
              }
              if (sObj) {
                sObj.x = sp.x;
                sObj.y = sp.y;
                if (sp.lx1 !== undefined) { sObj.lx1 = sp.lx1; sObj.ly1 = sp.ly1; sObj.lx2 = sp.lx2; sObj.ly2 = sp.ly2; }
              }
            });
          }
          if (Array.isArray(d.mediaPositions)) {
            var _liveMediaMove = (typeof conMediaItems !== 'undefined') ? conMediaItems : (window.conMediaItems || []);
            d.mediaPositions.forEach(function (mp) {
              var mEl = document.querySelector('#constellation-board .con-media-item[data-id="' + mp.id + '"]');
              if (mEl) {
                mEl.style.left = mp.x + 'px';
                mEl.style.top = mp.y + 'px';
              }
              var mObj = _liveMediaMove.find(function (m) { return String(m.id) === String(mp.id); });
              if (mObj) {
                mObj.x = mp.x;
                mObj.y = mp.y;
              }
            });
          }
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
          if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          return;
        }

        if (d.type === 'group-resize') {
          if (_mirrorIsFrozen) return;
          var gEl = document.querySelector('#constellation-board [data-gid="' + d.groupId + '"]');
          if (gEl) {
            if (typeof d.w === 'number') gEl.style.width = d.w + 'px';
            if (typeof d.h === 'number') gEl.style.height = d.h + 'px';
          }
          var _liveGroups = window.conGetGroups ? window.conGetGroups() : [];
          var gObj = _liveGroups.find(function (g) { return String(g.id) === String(d.groupId); });
          if (gObj) {
            if (typeof d.w === 'number') gObj._manualW = d.w;
            if (typeof d.h === 'number') gObj._manualH = d.h;
          }
          if (Array.isArray(d.shapes)) {
            var _liveShapes = window.conGetShapes ? window.conGetShapes() : [];
            d.shapes.forEach(function (sp) {
              var sObj = _liveShapes.find(function (s) { return String(s.id) === String(sp.id); });
              if (sObj) {
                sObj.x = sp.x; sObj.y = sp.y; sObj.w = sp.w; sObj.h = sp.h;
                if (sp.lx1 !== undefined) { sObj.lx1 = sp.lx1; sObj.ly1 = sp.ly1; sObj.lx2 = sp.lx2; sObj.ly2 = sp.ly2; }
                if (sp.pts) sObj.pts = sp.pts;
                if (typeof window._conShapeUpdateGeom === 'function') window._conShapeUpdateGeom(sObj);
              }
            });
          }
          if (Array.isArray(d.drawings)) {
            var _liveDrawings = window.conGetDrawings ? window.conGetDrawings() : [];
            d.drawings.forEach(function (dp) {
              var drObj = _liveDrawings.find(function (dr) { return String(dr.id) === String(dp.id); });
              if (drObj) {
                drObj.x = dp.x; drObj.y = dp.y; drObj.w = dp.w; drObj.h = dp.h;
                if (dp.points) drObj.points = dp.points;
                if (typeof window._conDrawingUpdateGeom === 'function') window._conDrawingUpdateGeom(drObj);
              }
            });
          }
          if (Array.isArray(d.media)) {
            var _liveMediaResize = (typeof conMediaItems !== 'undefined') ? conMediaItems : (window.conMediaItems || []);
            d.media.forEach(function (mp) {
              var mEl = document.querySelector('#constellation-board .con-media-item[data-id="' + mp.id + '"]');
              if (mEl) {
                mEl.style.left = mp.x + 'px';
                mEl.style.top = mp.y + 'px';
                if (typeof mp.w === 'number') mEl.style.width = mp.w + 'px';
                if (typeof mp.h === 'number') mEl.style.height = mp.h + 'px';
              }
              var mObj = _liveMediaResize.find(function (m) { return String(m.id) === String(mp.id); });
              if (mObj) {
                mObj.x = mp.x;
                mObj.y = mp.y;
                if (typeof mp.w === 'number') mObj.w = mp.w;
                if (typeof mp.h === 'number') mObj.h = mp.h;
              }
            });
          }
          if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          return;
        }

        if (d.type === 'note-style') {
          if (_mirrorIsFrozen) return;
          var _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
          var noteObj = _liveNotes.find(function (n) { return String(n.id) === String(d.id); });
          if (noteObj) {
            if (d.bg !== undefined) noteObj.bg = d.bg;
            if (d.color !== undefined) noteObj.color = d.color;
            if (d.fontSize !== undefined) noteObj.fontSize = d.fontSize;
            if (d.bold !== undefined) noteObj.bold = d.bold;
            if (d.italic !== undefined) noteObj.italic = d.italic;
            if (d.underline !== undefined) noteObj.underline = d.underline;
            if (d.wavy !== undefined) noteObj.wavy = d.wavy;
            if (d.strike !== undefined) noteObj.strike = d.strike;
            if (d.fontFamily !== undefined) noteObj.fontFamily = d.fontFamily;
            if (d.casing !== undefined) noteObj.casing = d.casing;
            if (d.textAlign !== undefined) noteObj.textAlign = d.textAlign;
            if (d.borderWidth !== undefined) noteObj.borderWidth = d.borderWidth;
            if (d.borderStyle !== undefined) noteObj.borderStyle = d.borderStyle;
            if (d.borderColor !== undefined) noteObj.borderColor = d.borderColor;
            if (d.hidden !== undefined) noteObj.hidden = d.hidden;
            if (d.blink !== undefined) noteObj.blink = d.blink;
            if (typeof d.baseWidth === 'number') { noteObj.liveBaseWidth = d.baseWidth; noteObj.width = d.baseWidth; }
            if (typeof d.baseHeight === 'number') { noteObj.liveBaseHeight = d.baseHeight; noteObj.height = d.baseHeight; }
            if (typeof d.width === 'number') { noteObj.width = d.width; if (noteObj.liveBaseWidth == null) noteObj.liveBaseWidth = d.width; }
            if (typeof d.height === 'number') { noteObj.height = d.height; if (noteObj.liveBaseHeight == null) noteObj.liveBaseHeight = d.height; }
            if (d.manualSize !== undefined) noteObj.manualSize = !!d.manualSize;
            if (typeof noteObj._applyStyle === 'function') {
              noteObj._applyStyle();
              var nEl = (typeof wnGetNoteElementById === 'function')
                ? wnGetNoteElementById(d.id)
                : document.querySelector('#constellation-board .con-word-note[data-id="' + d.id + '"], #constellation-board .ta-word-note[data-id="' + d.id + '"]');
              if (nEl && d.blink !== undefined) {
                nEl.classList.remove('wn-blink');
                if (d.blink) {
                  nEl.style.setProperty('--wn-blink-delay', '-' + ((Date.now() / 1000) % 3.6).toFixed(3) + 's');
                  void nEl.offsetWidth;
                  nEl.classList.add('wn-blink');
                } else {
                  nEl.style.removeProperty('--wn-blink-delay');
                }
              }
            } else {
              var noteEl = (typeof wnGetNoteElementById === 'function')
                ? wnGetNoteElementById(d.id)
                : document.querySelector('#constellation-board .con-word-note[data-id="' + d.id + '"], #constellation-board .ta-word-note[data-id="' + d.id + '"]');
              if (noteEl) {
                if (d.bg !== undefined) noteEl.style.background = d.bg;
                if (d.color !== undefined) noteEl.style.color = d.color;
                var ed = noteEl.querySelector('.wn-note-editor');
                if (ed && typeof conNoteAutosize === 'function') conNoteAutosize(ed, noteObj);
                if (d.blink !== undefined) {
                  noteEl.classList.remove('wn-blink');
                  if (d.blink) {
                    noteEl.style.setProperty('--wn-blink-delay', '-' + ((Date.now() / 1000) % 3.6).toFixed(3) + 's');
                    void noteEl.offsetWidth;
                    noteEl.classList.add('wn-blink');
                  } else {
                    noteEl.style.removeProperty('--wn-blink-delay');
                  }
                }
              }
            }
            if (typeof conRedrawEdges === 'function') conRedrawEdges();
            if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          }
          return;
        }

        if (d.type === 'note-resize') {
          if (_mirrorIsFrozen) return;
          var _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
          var noteObj = _liveNotes.find(function (n) { return String(n.id) === String(d.id); });
          if (noteObj) {
            if (d.manualSize !== undefined) noteObj.manualSize = !!d.manualSize;
            if (typeof d.width === 'number') {
              noteObj.width = d.width;
              noteObj.liveBaseWidth = d.width;
            }
            if (typeof d.height === 'number') {
              noteObj.height = d.height;
              noteObj.liveBaseHeight = d.height;
            }
            if (typeof d.baseWidth === 'number') noteObj.liveBaseWidth = d.baseWidth;
            if (typeof d.baseHeight === 'number') noteObj.liveBaseHeight = d.baseHeight;
          }
          var nel = document.querySelector('#constellation-board .con-word-note[data-id="' + d.id + '"]') || document.querySelector('.con-word-note[data-id="' + d.id + '"]');
          if (nel) {
            var ta = nel.querySelector('.wn-note-editor, textarea');
            var zoom = (window.conGetZoom ? window.conGetZoom() : 1);
            var applyFn = (typeof wnApplyStoredSize === 'function') ? wnApplyStoredSize : (window.wnApplyStoredSize || null);
            var nData = noteObj || { width: d.width, height: d.height, liveBaseWidth: d.baseWidth || d.width, liveBaseHeight: d.baseHeight || d.height, manualSize: (d.manualSize !== undefined ? d.manualSize : true) };
            if (applyFn && ta && nData.manualSize) {
              applyFn(nel, ta, nData, zoom);
            } else if (ta && typeof conNoteAutosize === 'function') {
              conNoteAutosize(ta, nData);
            } else {
              var z = Math.max(0.5, Math.min(3, Number(zoom) || 1));
              var w = (typeof d.width === 'number') ? d.width : (noteObj ? noteObj.width : null);
              var h = (typeof d.height === 'number') ? d.height : (noteObj ? noteObj.height : null);
              if (w != null) nel.style.width = (w * z) + 'px';
              if (h != null) {
                nel.style.height = (h * z) + 'px';
                if (ta) {
                  ta.style.width = '100%';
                  ta.style.height = Math.max(16, (h - 12) * z) + 'px';
                  ta.style.overflowY = 'auto';
                }
              }
            }
            if (typeof conRedrawEdges === 'function') conRedrawEdges();
            if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          }
          return;
        }

        if (d.type === 'drawing-remove' || d.type === 'drawings-remove' || d.type === 'drawing-delete') {
          if (_mirrorIsFrozen) return;
          var _liveDrawings2 = window.conGetDrawings ? window.conGetDrawings() : [];
          var _removeIds = Array.from(new Set(Array.isArray(d.ids) ? d.ids.map(String) : (d.id != null ? [String(d.id)] : []))).filter(Boolean);
          _removeIds.forEach(function (did) {
            var idx = _liveDrawings2.findIndex(function (dr) { return String(dr.id) === did; });
            if (idx !== -1) {
              var dr = _liveDrawings2[idx];
              if (dr && dr.el && dr.el.remove) {
                try { dr.el.remove(); } catch (_) { }
              }
              _liveDrawings2.splice(idx, 1);
            }
            try {
              var escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(did) : did.replace(/["\\]/g, '\\$&');
              document.querySelectorAll('#constellation-board .con-drawing[data-did="' + escaped + '"], .con-drawing[data-did="' + escaped + '"]').forEach(function (el) {
                try { el.remove(); } catch (_) { }
              });
            } catch (_) {
              document.querySelectorAll('.con-drawing').forEach(function (el) {
                if (el.dataset && el.dataset.did === did) {
                  try { el.remove(); } catch (_) { }
                }
              });
            }
            if (typeof conDrawingSelected !== 'undefined' && conDrawingSelected.has(did)) {
              conDrawingSelected.delete(did);
            }
          });
          if (_removeIds.length > 0) {
            var delSet = new Set(_removeIds);
            var liveGroups = window.conGetGroups ? window.conGetGroups() : [];
            liveGroups.forEach(function (g) {
              if (g.drawingIds) g.drawingIds = g.drawingIds.filter(function (id) { return !delSet.has(String(id)); });
            });
            if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          }
          return;
        }

        if (d.type === 'drawings-clear' || d.type === 'drawing-clear') {
          if (_mirrorIsFrozen) return;
          var _liveDrawingsClear = window.conGetDrawings ? window.conGetDrawings() : [];
          _liveDrawingsClear.forEach(function (dr) {
            if (dr && dr.el && dr.el.remove) {
              try { dr.el.remove(); } catch (_) { }
            }
          });
          if (window.conGetDrawings) {
            var allDrs = window.conGetDrawings();
            allDrs.length = 0;
          }
          document.querySelectorAll('#constellation-board .con-drawing, .con-drawing').forEach(function (el) {
            try { el.remove(); } catch (_) { }
          });
          var lsv = document.getElementById('con-draw-live-svg');
          if (lsv) lsv.innerHTML = '';
          if (d.clearShapes) {
            var _liveShapesClear = window.conGetShapes ? window.conGetShapes() : [];
            _liveShapesClear.forEach(function (s) {
              if (s && s.el && s.el.remove) {
                try { s.el.remove(); } catch (_) { }
              }
            });
            if (window.conGetShapes) {
              var allShs = window.conGetShapes();
              allShs.length = 0;
            }
            document.querySelectorAll('#constellation-board .con-shape, .con-shape').forEach(function (el) {
              try { el.remove(); } catch (_) { }
            });
          }
          var liveGroupsClear = window.conGetGroups ? window.conGetGroups() : [];
          liveGroupsClear.forEach(function (g) {
            if (g.drawingIds) g.drawingIds = [];
            if (d.clearShapes && g.shapeIds) g.shapeIds = [];
          });
          if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          return;
        }

        if (d.type === 'shape-remove' || d.type === 'shapes-remove' || d.type === 'shape-delete') {
          if (_mirrorIsFrozen) return;
          var _liveShapes2 = window.conGetShapes ? window.conGetShapes() : [];
          var _removeShapeIds = Array.from(new Set(Array.isArray(d.ids) ? d.ids.map(String) : (d.id != null ? [String(d.id)] : []))).filter(Boolean);
          _removeShapeIds.forEach(function (sid) {
            var idx = _liveShapes2.findIndex(function (s) { return String(s.id) === sid; });
            if (idx !== -1) {
              var s = _liveShapes2[idx];
              if (s && s.el && s.el.remove) {
                try { s.el.remove(); } catch (_) { }
              }
              _liveShapes2.splice(idx, 1);
            }
            try {
              var escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(sid) : sid.replace(/["\\]/g, '\\$&');
              document.querySelectorAll('#constellation-board .con-shape[data-sid="' + escaped + '"], .con-shape[data-sid="' + escaped + '"]').forEach(function (el) {
                try { el.remove(); } catch (_) { }
              });
            } catch (_) {
              document.querySelectorAll('.con-shape').forEach(function (el) {
                if (el.dataset && el.dataset.sid === sid) {
                  try { el.remove(); } catch (_) { }
                }
              });
            }
            if (typeof _conShapeSelected !== 'undefined' && _conShapeSelected.has(sid)) {
              _conShapeSelected.delete(sid);
            }
          });
          if (_removeShapeIds.length > 0) {
            var delShapeSet = new Set(_removeShapeIds);
            var liveGroups = window.conGetGroups ? window.conGetGroups() : [];
            liveGroups.forEach(function (g) {
              if (g.shapeIds) g.shapeIds = g.shapeIds.filter(function (id) { return !delShapeSet.has(String(id)); });
            });
            if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          }
          return;
        }

        if (d.type === 'drawing-add' || d.type === 'drawings-add') {
          if (_mirrorIsFrozen) return;
          var _lsvAdd = document.getElementById('con-draw-live-svg');
          if (_lsvAdd) _lsvAdd.innerHTML = '';
          _mirrorLivePath = null;
          var items = Array.isArray(d.drawings) ? d.drawings : (d.drawing ? [d.drawing] : []);
          var _liveDrawingsAdd = window.conGetDrawings ? window.conGetDrawings() : [];
          items.forEach(function (drData) {
            var existing = _liveDrawingsAdd.find(function (dr) { return String(dr.id) === String(drData.id); });
            if (!existing) {
              var newDr = {
                id: drData.id,
                x: drData.x,
                y: drData.y,
                w: drData.w,
                h: drData.h,
                points: drData.points,
                color: drData.color,
                thickness: drData.thickness,
                opacity: drData.opacity,
                el: null, hitPath: null, visPath: null, pad: 0
              };
              _liveDrawingsAdd.push(newDr);
              if (typeof conDrawingBuild === 'function') {
                conDrawingBuild(newDr);
              } else if (typeof window.conDrawingBuild === 'function') {
                window.conDrawingBuild(newDr);
              }
            }
          });
          if (Array.isArray(d.groupDrawingLinks)) {
            var _liveGroupsAdd = window.conGetGroups ? window.conGetGroups() : [];
            d.groupDrawingLinks.forEach(function (link) {
              var grp = _liveGroupsAdd.find(function (g) { return String(g.id) === String(link.groupId); });
              if (grp) {
                if (!grp.drawingIds) grp.drawingIds = [];
                if (!grp.drawingIds.includes(link.drawingId)) grp.drawingIds.push(link.drawingId);
              }
            });
            if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          }
          return;
        }

        if (d.type === 'shape-add' || d.type === 'shapes-add') {
          if (_mirrorIsFrozen) return;
          var _lsvShape = document.getElementById('con-draw-live-svg');
          if (_lsvShape) _lsvShape.innerHTML = '';
          var sItems = Array.isArray(d.shapes) ? d.shapes : (d.shape ? [d.shape] : []);
          var _liveShapesAdd = window.conGetShapes ? window.conGetShapes() : [];
          sItems.forEach(function (sData) {
            var existing = _liveShapesAdd.find(function (s) { return String(s.id) === String(sData.id); });
            if (!existing) {
              var newS = {
                id: sData.id,
                type: sData.type,
                x: sData.x, y: sData.y, w: sData.w, h: sData.h,
                lx1: sData.lx1, ly1: sData.ly1, lx2: sData.lx2, ly2: sData.ly2,
                pts: sData.pts,
                color: sData.color,
                fillColor: sData.fillColor,
                thickness: sData.thickness,
                opacity: sData.opacity,
                dashStyle: sData.dashStyle,
                arrowheadSize: sData.arrowheadSize,
                el: null, svgEl: null, hitEl: null, visEl: null, pad: 0
              };
              _liveShapesAdd.push(newS);
              if (typeof conShapeBuild === 'function') {
                conShapeBuild(newS);
              } else if (typeof window.conShapeBuild === 'function') {
                window.conShapeBuild(newS);
              }
            }
          });
          return;
        }

        if (d.type === 'media-hide') {
          if (_mirrorIsFrozen) return;
          var mEl = document.querySelector('#constellation-board .con-media-item[data-id="' + d.id + '"]');
          if (mEl && d.hidden !== undefined) {
            mEl.classList.toggle('con-media-hidden', !!d.hidden);
          }
          return;
        }

        if (d.type === 'drawing-resize') {
          if (_mirrorIsFrozen) return;
          var _liveDrawings = window.conGetDrawings ? window.conGetDrawings() : [];
          var dObj = _liveDrawings.find(function (dr) { return String(dr.id) === String(d.id); });
          if (dObj) {
            if (typeof d.x === 'number') dObj.x = d.x;
            if (typeof d.y === 'number') dObj.y = d.y;
            if (typeof d.w === 'number') dObj.w = d.w;
            if (typeof d.h === 'number') dObj.h = d.h;
            if (Array.isArray(d.points)) dObj.points = d.points;
            if (typeof window._conDrawingUpdateGeom === 'function') {
              window._conDrawingUpdateGeom(dObj);
            }
          } else {
            var fallbackDr = {
              id: d.id,
              x: d.x,
              y: d.y,
              w: d.w,
              h: d.h,
              points: d.points,
              thickness: d.thickness,
              pad: d.pad
            };
            if (typeof window._conDrawingUpdateGeom === 'function') {
              window._conDrawingUpdateGeom(fallbackDr);
            }
          }
          return;
        }

        if (d.type === 'shape-resize') {
          if (_mirrorIsFrozen) return;
          var _liveShapes = window.conGetShapes ? window.conGetShapes() : [];
          var sObj = _liveShapes.find(function (s) { return String(s.id) === String(d.id); });
          if (sObj) {
            if (typeof d.x === 'number') sObj.x = d.x;
            if (typeof d.y === 'number') sObj.y = d.y;
            if (typeof d.w === 'number') sObj.w = d.w;
            if (typeof d.h === 'number') sObj.h = d.h;
            if (d.lx1 !== undefined) sObj.lx1 = d.lx1;
            if (d.ly1 !== undefined) sObj.ly1 = d.ly1;
            if (d.lx2 !== undefined) sObj.lx2 = d.lx2;
            if (d.ly2 !== undefined) sObj.ly2 = d.ly2;
            if (Array.isArray(d.pts)) sObj.pts = d.pts;
            if (typeof window._conShapeUpdateGeom === 'function') {
              window._conShapeUpdateGeom(sObj);
            }
          }
          return;
        }

        if (d.type === 'node-resize' || d.type === 'nodes-resize') {
          if (_mirrorIsFrozen) return;
          var _liveNodes = window.conGetNodes ? window.conGetNodes() : [];
          var items = Array.isArray(d.nodes) ? d.nodes : (d.id ? [{ id: d.id, fontSize: d.fontSize, shape: d.shape }] : []);
          var nodeMap = new Map(_liveNodes.map(function (n) { return [String(n.id), n]; }));
          var phraseGroupsToUpdate = new Set();
          items.forEach(function (item) {
            if (!item || !item.id) return;
            var nObj = nodeMap.get(String(item.id));
            var nel = document.getElementById(item.id);
            if (nObj || nel) {
              var parsedFs = parseFloat(item.fontSize);
              if (Number.isFinite(parsedFs) && parsedFs > 0 && typeof window.conSetNodeBaseFontSize === 'function') {
                window.conSetNodeBaseFontSize(nObj || nel, parsedFs);
              }
              if (nObj && typeof window.conApplyNodeShape === 'function') {
                window.conApplyNodeShape(nObj, item.shape || nObj.shape);
              }
              if (typeof conGroupOfNode === 'function') {
                var pg = conGroupOfNode(item.id);
                if (pg && pg.phraseGroup) phraseGroupsToUpdate.add(pg);
              }
            }
          });
          if (phraseGroupsToUpdate.size > 0 && typeof conPhraseGroupLayout === 'function') {
            phraseGroupsToUpdate.forEach(function (pg) { conPhraseGroupLayout(pg); });
          }
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
          if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          return;
        }

        if (d.type === 'node-rotate') {
          if (_mirrorIsFrozen) return;
          var _liveNodes = window.conGetNodes ? window.conGetNodes() : [];
          var nObj = _liveNodes.find(function (n) { return String(n.id) === String(d.id); });
          if (nObj && typeof d.rotation === 'number') {
            if (typeof window.conApplyNodeRotation === 'function') {
              window.conApplyNodeRotation(nObj, d.rotation);
            } else {
              nObj.rotation = d.rotation;
              if (nObj.el) {
                nObj.el.style.transformOrigin = 'center center';
                nObj.el.style.transform = d.rotation ? ('rotate(' + d.rotation + 'deg)') : '';
              }
            }
            if (typeof conRedrawEdges === 'function') conRedrawEdges();
            if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          }
          return;
        }

        if (d.type === 'nodes-rotate') {
          if (_mirrorIsFrozen) return;
          if (Array.isArray(d.rotations)) {
            var _liveNodes = window.conGetNodes ? window.conGetNodes() : [];
            var nodeMap = new Map(_liveNodes.map(function (n) { return [String(n.id), n]; }));
            d.rotations.forEach(function (item) {
              if (!item || !item.id) return;
              var nObj = nodeMap.get(String(item.id));
              if (nObj && typeof item.rotation === 'number') {
                if (typeof window.conApplyNodeRotation === 'function') {
                  window.conApplyNodeRotation(nObj, item.rotation);
                } else {
                  nObj.rotation = item.rotation;
                  if (nObj.el) {
                    nObj.el.style.transformOrigin = 'center center';
                    nObj.el.style.transform = item.rotation ? ('rotate(' + item.rotation + 'deg)') : '';
                  }
                }
              }
            });
            if (typeof conRedrawEdges === 'function') conRedrawEdges();
            if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
          }
          return;
        }

        if (d.type === 'node-mask') {
          if (_mirrorIsFrozen) return;
          var nEl = document.getElementById(d.nodeId);
          if (nEl && d.masked !== undefined) {
            nEl.classList.toggle('con-masked', !!d.masked);
          }
          var _liveNodes = window.conGetNodes ? window.conGetNodes() : [];
          var nObj = _liveNodes.find(function (n) { return String(n.id) === String(d.nodeId); });
          if (nObj && d.masked !== undefined) nObj.masked = !!d.masked;
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
          return;
        }

        if (d.type === 'node-masks') {
          if (_mirrorIsFrozen) return;
          if (Array.isArray(d.masks)) {
            var _liveNodes2 = window.conGetNodes ? window.conGetNodes() : [];
            d.masks.forEach(function (m) {
              var el = document.getElementById(m.id);
              if (el && m.masked !== undefined) el.classList.toggle('con-masked', !!m.masked);
              var obj = _liveNodes2.find(function (n) { return String(n.id) === String(m.id); });
              if (obj && m.masked !== undefined) obj.masked = !!m.masked;
            });
            if (typeof conRedrawEdges === 'function') conRedrawEdges();
          }
          return;
        }

        if (d.type === 'node-lock') {
          if (_mirrorIsFrozen) return;
          var nEl = document.getElementById(d.nodeId);
          if (nEl && d.locked !== undefined) {
            nEl.classList.toggle('con-locked', !!d.locked);
          }
          var _liveNodes = window.conGetNodes ? window.conGetNodes() : [];
          var nObj = _liveNodes.find(function (n) { return String(n.id) === String(d.nodeId); });
          if (nObj) nObj.locked = !!d.locked;
          return;
        }

        if (d.type === 'note-lock') {
          if (_mirrorIsFrozen) return;
          var nEl = document.querySelector('#constellation-board .con-word-note[data-id="' + d.noteId + '"]');
          if (nEl && d.locked !== undefined) {
            nEl.classList.toggle('wn-locked', !!d.locked);
          }
          var _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
          var nObj = _liveNotes.find(function (n) { return String(n.id) === String(d.noteId); });
          if (nObj) nObj.locked = !!d.locked;
          return;
        }

        if (d.type === 'group-lock') {
          if (_mirrorIsFrozen) return;
          var gEl = document.querySelector('#constellation-board [data-gid="' + d.groupId + '"]');
          if (gEl && d.locked !== undefined) {
            gEl.classList.toggle('con-group-locked', !!d.locked);
          }
          var _liveGroups = window.conGetGroups ? window.conGetGroups() : [];
          var gObj = _liveGroups.find(function (g) { return String(g.id) === String(d.groupId); });
          if (gObj) gObj.locked = !!d.locked;
          return;
        }

        if (d.type === 'board-bg') {
          if (_mirrorIsFrozen) return;
          var brd = document.getElementById('constellation-board');
          if (brd) {
            if (d.color) brd.style.backgroundColor = d.color;
            if (d.style !== undefined && typeof window.conSetBoardBackgroundStyle === 'function') {
              window.conSetBoardBackgroundStyle(d.style);
            }
          }
          return;
        }
      };

      // Request initial state; retry in case the main window is slow to respond
      function _req() {
        console.log('[BoardMirror] Sending request-state message to presenter window');
        try { ch.postMessage({ type: 'request-state' }); } catch (e) { }
      }
      window._conMirrorRequestState = _req;
      function _initMirror() {
        console.log('[BoardMirror] initializing mirror presentation window on channel:', _mirrorChannelName);
        _sendMirrorPresence(true);
        var sec = document.getElementById('constellation-section');
        if (sec) sec.classList.remove('hidden');
        // Wrap the board in a fixed clip container attached directly to body
        var brd = document.getElementById('constellation-board');
        if (brd && !document.getElementById('con-mirror-clip')) {
          var wrap = document.createElement('div');
          wrap.id = 'con-mirror-clip';
          document.body.appendChild(wrap);
          wrap.appendChild(brd);
        }
        if (typeof navTo === 'function') navTo('constellation-section');
        _req();
        setTimeout(_req, 300);
        setTimeout(_req, 700);
        setTimeout(_req, 1500);
        setTimeout(_req, 3000);
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initMirror);
      } else {
        _initMirror();
      }
      window.addEventListener('pagehide', function () { _sendMirrorPresence(false); });
      window.addEventListener('beforeunload', function () { _sendMirrorPresence(false); });
      window.addEventListener('resize', _mirrorApplyViewport);
    })();