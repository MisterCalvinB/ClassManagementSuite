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
      // ================================================================
      // CONSTELLATION TIMER NODES
      // ================================================================

      let _conActiveTimerPopoverNodeId = null;
      let _conTimerEngineInterval = null;

      function conFormatDurationSec(totalSec) {
        const s = Math.max(0, Math.round(Number(totalSec) || 0));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const remS = s % 60;
        if (h > 0) {
          return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(remS).padStart(2, '0');
        }
        return String(m).padStart(2, '0') + ':' + String(remS).padStart(2, '0');
      }
      window.conFormatDurationSec = conFormatDurationSec;

      function conParseTimerSyntax(text) {
        if (!text || typeof text !== 'string') return null;
        const raw = text.trim();
        // 1. Minutes + Seconds e.g. 15'30", 15'30, 15’30”, 15’30
        const mAndS = raw.match(/^(\d+)\s*['’]\s*(\d{1,2})\s*["”]?$/);
        if (mAndS) {
          const min = parseInt(mAndS[1], 10);
          const sec = parseInt(mAndS[2], 10);
          if (min > 0 || sec > 0) {
            const totalSec = min * 60 + sec;
            return {
              totalSec,
              min,
              sec,
              displayDuration: conFormatDurationSec(totalSec),
              raw
            };
          }
        }
        // 2. Minutes only e.g. 15', 5', 120'
        const mOnly = raw.match(/^(\d+)\s*['’]$/);
        if (mOnly) {
          const min = parseInt(mOnly[1], 10);
          if (min > 0) {
            const totalSec = min * 60;
            return {
              totalSec,
              min,
              sec: 0,
              displayDuration: conFormatDurationSec(totalSec),
              raw
            };
          }
        }
        // 3. Seconds only e.g. 45", 30”, 90"
        const sOnly = raw.match(/^(\d+)\s*["”]$/);
        if (sOnly) {
          const sec = parseInt(sOnly[1], 10);
          if (sec > 0) {
            return {
              totalSec: sec,
              min: Math.floor(sec / 60),
              sec: sec % 60,
              displayDuration: conFormatDurationSec(sec),
              raw
            };
          }
        }
        return null;
      }
      window.conParseTimerSyntax = conParseTimerSyntax;

      function conPromptTimerConversion(parsedTimer) {
        return new Promise(resolve => {
          const modal = document.getElementById('con-timer-convert-modal');
          if (!modal) { resolve('timer'); return; }
          const titleEl = document.getElementById('con-timer-convert-title');
          const msgEl = document.getElementById('con-timer-convert-msg');
          const createBtn = document.getElementById('con-timer-convert-create-btn');
          const textBtn = document.getElementById('con-timer-convert-text-btn');
          const cancelBtn = document.getElementById('con-timer-convert-cancel-btn');
          const createLabel = document.getElementById('con-timer-convert-create-label');
          const textLabel = document.getElementById('con-timer-convert-text-label');
          const cancelLabel = document.getElementById('con-timer-convert-cancel-label');

          if (titleEl && typeof i18n !== 'undefined') titleEl.textContent = i18n.t('timerNodeConvertTitle') || 'Timer Node';
          if (msgEl && typeof i18n !== 'undefined') {
            const tmpl = i18n.t('timerNodeConvertPrompt') || 'Convert "{text}" into a timer node ({duration})?';
            msgEl.textContent = tmpl.replace('{text}', parsedTimer.raw).replace('{duration}', parsedTimer.displayDuration);
          }
          if (createLabel && typeof i18n !== 'undefined') createLabel.textContent = i18n.t('timerNodeCreateBtn') || 'Create Timer';
          if (textLabel && typeof i18n !== 'undefined') textLabel.textContent = i18n.t('timerNodeKeepTextBtn') || 'Keep as Text';
          if (cancelLabel && typeof i18n !== 'undefined') cancelLabel.textContent = i18n.t('btnCancel') || 'Cancel';

          function cleanup(choice) {
            modal.style.display = 'none';
            document.removeEventListener('keydown', onKey);
            createBtn.onclick = null;
            textBtn.onclick = null;
            cancelBtn.onclick = null;
            window.conTimerConvertModalCancel = null;
            resolve(choice);
          }

          function onKey(e) {
            if (e.key === 'Enter') { e.preventDefault(); cleanup('timer'); }
            else if (e.key === 'Escape') { e.preventDefault(); cleanup(null); }
          }

          createBtn.onclick = () => cleanup('timer');
          textBtn.onclick = () => cleanup('text');
          cancelBtn.onclick = () => cleanup(null);
          window.conTimerConvertModalCancel = () => cleanup(null);
          document.addEventListener('keydown', onKey);

          modal.style.display = 'flex';
          createBtn.focus();
        });
      }
      window.conPromptTimerConversion = conPromptTimerConversion;

      function conAddTimerNodeAt(totalSec, x, y, pageNum) {
        const formatted = conFormatDurationSec(totalSec);
        const id = conAddWordAt(formatted, x, y, pageNum);
        const node = conNodes.find(n => n.id === id);
        if (node) {
          node.isTimer = true;
          node.durationSec = totalSec;
          node.remainingSec = totalSec;
          node.timerState = 'idle';
          node.timerTarget = null;
          node.baseWord = formatted;
          conRenderNodeLabel(node);
          conRedrawEdges();
        }
        return id;
      }
      window.conAddTimerNodeAt = conAddTimerNodeAt;

      // ═══════════════════════════════════════════════════════
      // RANDOM NUMBER NODE — =random(a,b)
      // ═══════════════════════════════════════════════════════

      /**
       * Parse "=random(a,b)" (or "=random( a , b )") from the ctx input.
       * Supports integers and decimals; min/max are auto-sorted so order doesn't matter.
       * Returns { min, max } or null if not matched.
       */
      function conParseRandomSyntax(text) {
        if (!text || typeof text !== 'string') return null;
        const m = text.trim().match(/^=random\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/i);
        if (!m) return null;
        const a = parseFloat(m[1]);
        const b = parseFloat(m[2]);
        if (!isFinite(a) || !isFinite(b)) return null;
        return { min: Math.min(a, b), max: Math.max(a, b) };
      }
      window.conParseRandomSyntax = conParseRandomSyntax;

      /**
       * Create a Random Number node at (x, y) with range [min, max].
       * Immediately rolls a value and renders the node with the dice display.
       */
      function conAddRandomNodeAt(min, max, x, y, pageNum) {
        const rolled = Math.round(Math.random() * (max - min)) + Math.ceil(min);
        const id = conAddWordAt(String(rolled), x, y, pageNum);
        const node = conNodes.find(n => n.id === id);
        if (node) {
          node.isRandom = true;
          node.randomMin = min;
          node.randomMax = max;
          node.randomValue = rolled;
          node.baseWord = '=random(' + min + ',' + max + ')';
          conRenderNodeLabel(node);
          conRedrawEdges();
        }
        return id;
      }
      window.conAddRandomNodeAt = conAddRandomNodeAt;

      /**
       * In-place update of a random node's displayed value.
       * Mutates only the .con-random-digits text + triggers the dice spin CSS animation.
       * No innerHTML rebuild.
       */
      function conUpdateRandomNodeDisplay(node) {
        if (!node || !node.isRandom) return;
        if (!node.el || !node.el.parentNode) {
          node.el = document.getElementById(node.id);
          if (!node.el) return;
        }
        const digits = node.el.querySelector('.con-random-digits');
        if (digits) {
          digits.textContent = String(node.randomValue);
          // Trigger the CSS dice-spin animation (GPU-composited transform only)
          node.el.classList.remove('con-random-rolling');
          void node.el.offsetWidth; // force reflow to restart animation
          node.el.classList.add('con-random-rolling');
          setTimeout(() => { if (node.el) node.el.classList.remove('con-random-rolling'); }, 360);
        } else {
          conRenderNodeLabel(node);
        }
      }
      window.conUpdateRandomNodeDisplay = conUpdateRandomNodeDisplay;

      /**
       * Roll the random node: pick a new integer in [randomMin, randomMax],
       * update in-place, and broadcast a micro-message to the mirror window.
       */
      function conRollRandomNode(nodeId) {
        const node = conNodes.find(n => n.id === nodeId);
        if (!node || !node.isRandom) return;
        node.randomValue = Math.round(Math.random() * (node.randomMax - node.randomMin)) + Math.ceil(node.randomMin);
        conUpdateRandomNodeDisplay(node);
        if (window._conMirrorSend) {
          window._conMirrorSend({
            type: 'node-random-roll',
            id: String(node.id),
            value: node.randomValue
          });
        }
      }
      window.conRollRandomNode = conRollRandomNode;

      // --- Random Node Popover (right-click / long-press: set range) ---
      var _conActiveRandomPopoverNodeId = null;

      function conOpenRandomPopover(node) {
        const popover = document.getElementById('con-random-action-popover');
        if (!popover || !node || !node.el) return;
        _conActiveRandomPopoverNodeId = node.id;
        const rect = node.el.getBoundingClientRect();

        const titleEl = document.getElementById('con-random-popover-title');
        const bodyEl = document.getElementById('con-random-popover-actions');

        if (titleEl && typeof i18n !== 'undefined') {
          titleEl.textContent = i18n.t('randomNodeTitle') || 'Random Number Node';
        }

        if (bodyEl && typeof i18n !== 'undefined') {
          const rangeLabel = (i18n.t('randomNodeRange') || 'Range: {min} \u2013 {max}')
            .replace('{min}', node.randomMin)
            .replace('{max}', node.randomMax);
          bodyEl.innerHTML = `
            <button type="button" class="con-timer-action-btn" onclick="conRollRandomNode('${node.id}');conCloseRandomPopover();">
              <img src="../assets/icons/dice.svg" class="btn-icon" alt="" />
              <span>${i18n.t('randomNodeRoll') || 'Roll'}</span>
            </button>
            <div style="font-size:0.72rem;color:#888;padding:2px 4px;">${rangeLabel}</div>
            <button type="button" class="con-timer-action-btn" onclick="conRandomNodeSetRange('${node.id}');conCloseRandomPopover();">
              <img src="../assets/icons/edit.svg" class="btn-icon" alt="" />
              <span>${i18n.t('randomNodeSetRange') || 'Set range\u2026'}</span>
            </button>
          `;
        }

        popover.style.display = 'flex';
        const popW = popover.offsetWidth || 200;
        const popH = popover.offsetHeight || 120;
        let px = rect.left + rect.width / 2 - popW / 2;
        let py = rect.top - popH - 8;
        if (py < 10) py = rect.bottom + 8;
        px = Math.max(10, Math.min(window.innerWidth - popW - 10, px));
        popover.style.left = px + 'px';
        popover.style.top = py + 'px';

        setTimeout(() => {
          document.addEventListener('mousedown', _conOnRandomPopoverOutside, true);
        }, 20);
      }
      window.conOpenRandomPopover = conOpenRandomPopover;

      function _conOnRandomPopoverOutside(e) {
        const popover = document.getElementById('con-random-action-popover');
        if (!popover || popover.style.display === 'none') {
          document.removeEventListener('mousedown', _conOnRandomPopoverOutside, true);
          return;
        }
        if (popover.contains(e.target) ||
            (e.target && e.target.closest && e.target.closest('.con-node-random'))) {
          return;
        }
        conCloseRandomPopover();
      }

      function conCloseRandomPopover() {
        const popover = document.getElementById('con-random-action-popover');
        if (popover) popover.style.display = 'none';
        _conActiveRandomPopoverNodeId = null;
        document.removeEventListener('mousedown', _conOnRandomPopoverOutside, true);
      }
      window.conCloseRandomPopover = conCloseRandomPopover;

      /**
       * Prompt the user to change the range of an existing random node.
       * Accepts "=random(a,b)" or just "a,b".
       */
      window.conRandomNodeSetRange = async function (nodeId) {
        const node = conNodes.find(n => n.id === nodeId);
        if (!node || !node.isRandom) return;
        const prompt = (typeof i18n !== 'undefined' ? i18n.t('randomNodeRangePrompt') : null)
          || 'Enter new range as: =random(min,max)';
        const answer = await showPrompt(prompt, '=random(' + node.randomMin + ',' + node.randomMax + ')');
        if (!answer) return;
        // Accept "=random(a,b)" or plain "a,b"
        let parsed = conParseRandomSyntax(answer.trim());
        if (!parsed) {
          const parts = answer.trim().split(',').map(Number).filter(v => isFinite(v));
          if (parts.length >= 2) parsed = { min: Math.min(parts[0], parts[1]), max: Math.max(parts[0], parts[1]) };
        }
        if (!parsed) return;
        conPushUndo();
        node.randomMin = parsed.min;
        node.randomMax = parsed.max;
        node.randomValue = Math.round(Math.random() * (parsed.max - parsed.min)) + Math.ceil(parsed.min);
        node.baseWord = '=random(' + parsed.min + ',' + parsed.max + ')';
        conUpdateRandomNodeDisplay(node);
        if (window._conMirrorSend) {
          window._conMirrorSend({ type: 'node-random-roll', id: String(node.id), value: node.randomValue });
        }
      };

      function conPlayTimerChime() {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = new AudioCtx();
          const now = ctx.currentTime;
          [0, 0.16, 0.32].forEach((offset, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(idx === 2 ? 1046.5 : 880, now + offset);
            gain.gain.setValueAtTime(0.2, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.36);
          });
        } catch (_) {}
      }

      let _conActiveCmsTimerNodeId = null;
      window._conActiveCmsTimerNodeId = null;

      function conUpdateTimerNodeDisplay(node) {
        if (!node) return;
        if (!node.el || !node.el.parentNode) {
          node.el = document.getElementById(node.id);
          if (!node.el) return;
        }
        const totalSec = node.remainingSec != null ? node.remainingSec : (node.durationSec || 0);
        const timeStr = conFormatDurationSec(totalSec);
        const isWarn = totalSec <= 60 && totalSec > 0;
        const isEnded = node.timerState === 'ended' || totalSec <= 0;
        const isRunning = node.timerState === 'running';

        node.el.classList.toggle('con-node-timer', true);
        node.el.classList.toggle('con-timer-running', isRunning);
        node.el.classList.toggle('con-timer-warning', isRunning && isWarn);
        node.el.classList.toggle('con-timer-ended', isEnded);

        const digits = node.el.querySelector('.con-timer-digits');
        if (digits) {
          if (digits.textContent !== timeStr) digits.textContent = timeStr;
        } else {
          conRenderNodeLabel(node);
        }
      }
      window.conUpdateTimerNodeDisplay = conUpdateTimerNodeDisplay;

      function conTimerTickEngine() {
        if (typeof location !== 'undefined' && location.search.indexOf('mirror=1') !== -1) return;
        if (_conTimerEngineInterval) return;
        _conTimerEngineInterval = setInterval(function () {
          const now = Date.now();

          conNodes.forEach(node => {
            if (!node || !node.isTimer) return;
            // Only tick nodes running locally on the board.
            // Nodes targeted to CMS receive their ticks exclusively from Class Management.
            if (node.timerState === 'running' && node.timerTarget !== 'cms') {
              if (node.timerEndTime) {
                const rem = Math.max(0, Math.ceil((node.timerEndTime - now) / 1000));
                if (rem !== node.remainingSec) {
                  node.remainingSec = rem;
                  conUpdateTimerNodeDisplay(node);
                  if (window._conMirrorSend) {
                    window._conMirrorSend({
                      type: 'node-timer-tick',
                      id: String(node.id),
                      remainingSec: rem,
                      timerState: node.timerState
                    });
                  }
                }
                if (rem <= 0) {
                  node.timerState = 'ended';
                  node.timerEndTime = null;
                  conUpdateTimerNodeDisplay(node);
                  if (window._conMirrorSend) {
                    window._conMirrorSend({
                      type: 'node-timer-tick',
                      id: String(node.id),
                      remainingSec: 0,
                      timerState: 'ended'
                    });
                  }
                  if (typeof conBlinkNodeAttention === 'function' && node.el) {
                    conBlinkNodeAttention(node.el, 3000);
                  }
                  conPlayTimerChime();
                  if (window._conMirrorBroadcast) {
                    window._conMirrorBroadcast();
                  }
                }
              }
            }
          });
        }, 500);
      }
      conTimerTickEngine();

      function conStartNodeTimer(nodeId, target) {
        const node = conNodes.find(n => n.id === nodeId);
        if (!node || !node.isTimer) return;

        if (target === 'cms') {
          _conActiveCmsTimerNodeId = nodeId;
          window._conActiveCmsTimerNodeId = nodeId;
          // Unlink any other nodes that might have had cms target
          conNodes.forEach(n => {
            if (n && n.isTimer && n.id !== nodeId) {
              if (n.timerTarget === 'cms') {
                n.timerTarget = null;
                if (n.timerState === 'running') {
                  n.timerState = 'idle';
                  n.remainingSec = n.durationSec || 60;
                  n.timerEndTime = null;
                  conRenderNodeLabel(n);
                  if (window._conMirrorSend) {
                    window._conMirrorSend({
                      type: 'node-timer-tick',
                      id: String(n.id),
                      remainingSec: n.remainingSec,
                      timerState: n.timerState
                    });
                  }
                }
              }
            }
          });
        }

        const rem = (typeof node.remainingSec === 'number' && node.remainingSec > 0) ? node.remainingSec : (node.durationSec || 60);
        node.remainingSec = rem;
        node.timerState = 'running';
        node.timerTarget = target || 'board';
        node.timerEndTime = Date.now() + rem * 1000;
        conRenderNodeLabel(node);
        if (window._conMirrorSend) {
          window._conMirrorSend({
            type: 'node-timer-tick',
            id: String(node.id),
            remainingSec: rem,
            timerState: node.timerState
          });
        }
        if (target === 'cms') {
          conDispatchTimerToCms(node);
        }
      }

      function conPauseNodeTimer(nodeId) {
        const node = conNodes.find(n => n.id === nodeId);
        if (!node || !node.isTimer) return;
        if (node.timerState === 'running') {
          const now = Date.now();
          node.remainingSec = Math.max(0, Math.ceil((node.timerEndTime - now) / 1000));
          node.timerState = 'paused';
          node.timerEndTime = null;
          conRenderNodeLabel(node);
          if (window._conMirrorSend) {
            window._conMirrorSend({
              type: 'node-timer-tick',
              id: String(node.id),
              remainingSec: node.remainingSec,
              timerState: node.timerState
            });
          }
          if (node.timerTarget === 'cms') {
            if (window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron()) {
              Desktop.timerCommand({ cmd: 'pause' });
            }
            if (typeof boardCmsTimerChannel !== 'undefined' && boardCmsTimerChannel) {
              try { boardCmsTimerChannel.postMessage({ type: 'timer-command', cmd: 'pause' }); } catch (_) {}
            }
          }
        }
      }

      function conResumeNodeTimer(nodeId) {
        const node = conNodes.find(n => n.id === nodeId);
        if (!node || !node.isTimer) return;
        if (node.timerState === 'paused') {
          const rem = (typeof node.remainingSec === 'number' && node.remainingSec > 0) ? node.remainingSec : (node.durationSec || 60);
          node.remainingSec = rem;
          node.timerState = 'running';
          node.timerEndTime = Date.now() + rem * 1000;
          conRenderNodeLabel(node);
          if (window._conMirrorSend) {
            window._conMirrorSend({
              type: 'node-timer-tick',
              id: String(node.id),
              remainingSec: node.remainingSec,
              timerState: node.timerState
            });
          }
          if (node.timerTarget === 'cms') {
            if (window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron()) {
              Desktop.timerCommand({ cmd: 'resume' });
            }
            if (typeof boardCmsTimerChannel !== 'undefined' && boardCmsTimerChannel) {
              try { boardCmsTimerChannel.postMessage({ type: 'timer-command', cmd: 'resume' }); } catch (_) {}
            }
          }
        }
      }

      function conResetNodeTimer(nodeId) {
        const node = conNodes.find(n => n.id === nodeId);
        if (!node || !node.isTimer) return;
        node.timerState = 'idle';
        node.timerEndTime = null;
        node.remainingSec = node.durationSec || 60;
        if (node.timerTarget === 'cms' || _conActiveCmsTimerNodeId === nodeId) {
          _conActiveCmsTimerNodeId = null;
          window._conActiveCmsTimerNodeId = null;
          node.timerTarget = null;
          if (window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron()) {
            Desktop.timerCommand({ cmd: 'stop' });
          }
          if (typeof boardCmsTimerChannel !== 'undefined' && boardCmsTimerChannel) {
            try { boardCmsTimerChannel.postMessage({ type: 'timer-command', cmd: 'stop' }); } catch (_) {}
          }
        }
        conRenderNodeLabel(node);
        if (window._conMirrorSend) {
          window._conMirrorSend({
            type: 'node-timer-tick',
            id: String(node.id),
            remainingSec: node.remainingSec,
            timerState: node.timerState
          });
        }
      }

      function conStopNodeTimer(nodeId) {
        conResetNodeTimer(nodeId);
      }

      async function conDispatchTimerToCms(node) {
        const totalSec = node.remainingSec || node.durationSec || 60;
        const isElec = typeof window.Desktop !== 'undefined' && typeof Desktop.isElectron === 'function' && Desktop.isElectron();

        if (!isElec) {
          if (typeof boardCmsTimerChannel !== 'undefined' && boardCmsTimerChannel) {
            try { boardCmsTimerChannel.postMessage({ type: 'start-timer', seconds: totalSec }); } catch (_) {}
          }
          const promptText = (typeof i18n !== 'undefined' && i18n.t('timerNodeCmsNotOpenPrompt'))
            || 'Class Management is not currently open. Would you like to open it and start this timer?';
          const confirmOpen = (typeof showConfirm === 'function') ? await showConfirm(promptText) : true;
          if (confirmOpen) {
            window.open('class-management.html?startTimerSec=' + encodeURIComponent(totalSec), '_blank');
          }
          return;
        }

        try {
          const isOpen = await Desktop.isToolOpen('class-management.html');
          if (!isOpen) {
            const promptText = (typeof i18n !== 'undefined' && i18n.t('timerNodeCmsNotOpenPrompt'))
              || 'Class Management is not currently open. Would you like to open it and start this timer?';
            const confirmOpen = (typeof showConfirm === 'function') ? await showConfirm(promptText) : true;
            if (!confirmOpen) {
              node.timerTarget = 'board';
              return;
            }
            await Desktop.openTool('class-management.html', {
              query: { startTimerSec: totalSec }
            });
            setTimeout(async () => {
              try {
                await Desktop.timerCommand({ cmd: 'start', totalSec: totalSec });
              } catch (_) {}
              if (typeof boardCmsTimerChannel !== 'undefined' && boardCmsTimerChannel) {
                try {
                  boardCmsTimerChannel.postMessage({ type: 'start-timer', seconds: totalSec });
                } catch (_) {}
              }
            }, 1200);
          } else {
            await Desktop.openTool('class-management.html', { noReload: true });
            const res = await Desktop.timerCommand({ cmd: 'start', totalSec: totalSec });
            if (!res || !res.ok) {
              if (typeof boardCmsTimerChannel !== 'undefined' && boardCmsTimerChannel) {
                boardCmsTimerChannel.postMessage({ type: 'start-timer', seconds: totalSec });
              }
            }
          }
        } catch (err) {
          console.error('Failed to dispatch timer to Class Management', err);
          if (typeof showToast === 'function') showToast('Could not start timer in Class Management', true);
        }
      }

      function conOpenTimerPopover(node) {
        const popover = document.getElementById('con-timer-action-popover');
        if (!popover || !node || !node.el) return;
        _conActiveTimerPopoverNodeId = node.id;
        const rect = node.el.getBoundingClientRect();
        const titleEl = document.getElementById('con-timer-popover-title');
        const bodyEl = document.getElementById('con-timer-popover-actions');

        const durStr = conFormatDurationSec(node.remainingSec != null ? node.remainingSec : (node.durationSec || 0));
        if (titleEl && typeof i18n !== 'undefined') {
          const tmpl = i18n.t('timerNodeActionTitle') || 'Timer: {duration}';
          titleEl.textContent = tmpl.replace('{duration}', durStr);
        }

        if (bodyEl && typeof i18n !== 'undefined') {
          bodyEl.innerHTML = '';
          const state = node.timerState || 'idle';

          if (state === 'idle' || state === 'ended') {
            bodyEl.innerHTML = `
              <button type="button" class="con-timer-action-btn" onclick="conHandleTimerAction('${node.id}', 'start-board')">
                <img src="../assets/icons/board.svg" class="btn-icon" alt="" />
                <span>${i18n.t('timerNodeStartBoard') || 'Start in Board'}</span>
              </button>
              <button type="button" class="con-timer-action-btn" onclick="conHandleTimerAction('${node.id}', 'start-cms')">
                <img src="../assets/icons/class-management.svg" class="btn-icon" alt="" />
                <span>${i18n.t('timerNodeStartCms') || 'Start in Class Management'}</span>
              </button>
              ${state === 'ended' ? `
              <button type="button" class="con-timer-action-btn" onclick="conHandleTimerAction('${node.id}', 'reset')">
                <img src="../assets/icons/refresh.svg" class="btn-icon" alt="" />
                <span>${i18n.t('timerNodeReset') || 'Reset'}</span>
              </button>` : ''}
            `;
          } else if (state === 'running') {
            bodyEl.innerHTML = `
              <button type="button" class="con-timer-action-btn" onclick="conHandleTimerAction('${node.id}', 'pause')">
                <img src="../assets/icons/pause.svg" class="btn-icon" alt="" />
                <span>${i18n.t('timerNodePause') || 'Pause'}</span>
              </button>
              <button type="button" class="con-timer-action-btn" onclick="conHandleTimerAction('${node.id}', 'reset')">
                <img src="../assets/icons/refresh.svg" class="btn-icon" alt="" />
                <span>${i18n.t('timerNodeReset') || 'Reset'}</span>
              </button>
              <button type="button" class="con-timer-action-btn" onclick="conHandleTimerAction('${node.id}', 'stop')">
                <img src="../assets/icons/stop.svg" class="btn-icon" alt="" />
                <span>${i18n.t('timerNodeStop') || 'Stop'}</span>
              </button>
            `;
          } else if (state === 'paused') {
            bodyEl.innerHTML = `
              <button type="button" class="con-timer-action-btn" onclick="conHandleTimerAction('${node.id}', 'resume')">
                <img src="../assets/icons/play.svg" class="btn-icon" alt="" />
                <span>${i18n.t('timerNodeResume') || 'Resume'}</span>
              </button>
              <button type="button" class="con-timer-action-btn" onclick="conHandleTimerAction('${node.id}', 'reset')">
                <img src="../assets/icons/refresh.svg" class="btn-icon" alt="" />
                <span>${i18n.t('timerNodeReset') || 'Reset'}</span>
              </button>
              <button type="button" class="con-timer-action-btn" onclick="conHandleTimerAction('${node.id}', 'stop')">
                <img src="../assets/icons/stop.svg" class="btn-icon" alt="" />
                <span>${i18n.t('timerNodeStop') || 'Stop'}</span>
              </button>
            `;
          }
        }

        popover.style.display = 'flex';
        const popW = popover.offsetWidth || 210;
        const popH = popover.offsetHeight || 130;
        let px = rect.left + rect.width / 2 - popW / 2;
        let py = rect.top - popH - 8;
        if (py < 10) {
          py = rect.bottom + 8;
        }
        px = Math.max(10, Math.min(window.innerWidth - popW - 10, px));
        popover.style.left = px + 'px';
        popover.style.top = py + 'px';

        setTimeout(() => {
          document.addEventListener('mousedown', _conOnTimerPopoverOutside, true);
        }, 20);
      }
      window.conOpenTimerPopover = conOpenTimerPopover;

      function _conOnTimerPopoverOutside(e) {
        const popover = document.getElementById('con-timer-action-popover');
        if (!popover || popover.style.display === 'none') {
          document.removeEventListener('mousedown', _conOnTimerPopoverOutside, true);
          return;
        }
        if (popover.contains(e.target) || (e.target && e.target.closest && e.target.closest('.con-node-timer'))) {
          return;
        }
        conCloseTimerPopover();
      }

      function conCloseTimerPopover() {
        const popover = document.getElementById('con-timer-action-popover');
        if (popover) popover.style.display = 'none';
        _conActiveTimerPopoverNodeId = null;
        document.removeEventListener('mousedown', _conOnTimerPopoverOutside, true);
      }
      window.conCloseTimerPopover = conCloseTimerPopover;

      window.conHandleTimerAction = function (nodeId, action) {
        conCloseTimerPopover();
        if (action === 'start-board') {
          conStartNodeTimer(nodeId, 'board');
        } else if (action === 'start-cms') {
          conStartNodeTimer(nodeId, 'cms');
        } else if (action === 'pause') {
          conPauseNodeTimer(nodeId);
        } else if (action === 'resume') {
          conResumeNodeTimer(nodeId);
        } else if (action === 'reset') {
          conResetNodeTimer(nodeId);
        } else if (action === 'stop') {
          conStopNodeTimer(nodeId);
        }
      };

      function conSyncCmsTimerDataToNodes(data) {
        if (typeof location !== 'undefined' && location.search.indexOf('mirror=1') !== -1) return;
        if (!data || typeof conNodes === 'undefined' || !Array.isArray(conNodes)) return;
        let node = null;
        if (_conActiveCmsTimerNodeId) {
          node = conNodes.find(n => n && n.id === _conActiveCmsTimerNodeId);
        }
        if (!node) {
          node = conNodes.find(n => n && n.isTimer && n.timerTarget === 'cms');
          if (node) {
            _conActiveCmsTimerNodeId = node.id;
            window._conActiveCmsTimerNodeId = node.id;
          }
        }
        if (!node || !node.isTimer || node.timerTarget !== 'cms') return;

        if (!data.timerActive) {
          if (node.timerState === 'running' || node.timerState === 'paused') {
            node.timerState = 'ended';
            node.timerEndTime = null;
            node.remainingSec = 0;
            conUpdateTimerNodeDisplay(node);
            if (window._conMirrorSend) {
              window._conMirrorSend({
                type: 'node-timer-tick',
                id: String(node.id),
                remainingSec: 0,
                timerState: 'ended'
              });
            }
            if (typeof conBlinkNodeAttention === 'function' && node.el) {
              conBlinkNodeAttention(node.el, 3000);
            }
            conPlayTimerChime();
          }
          _conActiveCmsTimerNodeId = null;
          window._conActiveCmsTimerNodeId = null;
          node.timerTarget = null;
          return;
        }

        const txt = String(data.timerDisplayText || '').trim();
        const parts = txt.split(':').map(p => parseInt(p, 10));
        let s = null;
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          s = parts[0] * 60 + parts[1];
        } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          s = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        if (s !== null) {
          const isEnded = s <= 0;
          const isPaused = data.timerDisplayOpacity === '0.5' || /paused/i.test(data.timerDisplayClass || '');
          const nextState = isEnded ? 'ended' : (isPaused ? 'paused' : 'running');
          if (node.remainingSec !== s || node.timerState !== nextState) {
            node.remainingSec = s;
            node.timerState = nextState;
            conUpdateTimerNodeDisplay(node);
            if (window._conMirrorSend) {
              window._conMirrorSend({
                type: 'node-timer-tick',
                id: String(node.id),
                remainingSec: s,
                timerState: nextState
              });
            }
            if (isEnded) {
              node.timerEndTime = null;
              if (typeof conBlinkNodeAttention === 'function' && node.el) {
                conBlinkNodeAttention(node.el, 3000);
              }
              conPlayTimerChime();
            }
          }
        }
      }
      window.conSyncCmsTimerDataToNodes = conSyncCmsTimerDataToNodes;

      // ================================================================
      // SOUND NODE ENGINE & POPOVER (Zero-DOM-teardown mirror sync)
      // ================================================================
      let _conActiveSoundNodeId = null;
      let _conSoundAudio = null;
      let _conSoundBroadcastPending = false;

      function conGetOrInitSoundAudio() {
        if (!_conSoundAudio) {
          _conSoundAudio = new Audio();
          _conSoundAudio.addEventListener('timeupdate', function () {
            if (!_conActiveSoundNodeId) return;
            const node = (conNodes || []).find(n => n && n.id === _conActiveSoundNodeId);
            if (node) {
              node.soundCurrentTime = _conSoundAudio.currentTime;
              if (_conSoundAudio.duration && isFinite(_conSoundAudio.duration)) {
                node.soundDuration = _conSoundAudio.duration;
              }
              conSyncSoundPopoverUi(node);
              conUpdateSoundNodeDisplay(node);
              _conThrottleBroadcastSoundState(node);
            }
          });
          _conSoundAudio.addEventListener('ended', function () {
            if (!_conActiveSoundNodeId) return;
            const node = (conNodes || []).find(n => n && n.id === _conActiveSoundNodeId);
            if (node) {
              node.soundState = 'ended';
              node.soundCurrentTime = node.soundDuration || _conSoundAudio.duration || 0;
              conSyncSoundPopoverUi(node);
              conUpdateSoundNodeDisplay(node);
              _conBroadcastSoundState(node);
            }
          });
          _conSoundAudio.addEventListener('play', function () {
            if (!_conActiveSoundNodeId) return;
            const node = (conNodes || []).find(n => n && n.id === _conActiveSoundNodeId);
            if (node) {
              node.soundState = 'playing';
              conSyncSoundPopoverUi(node);
              conUpdateSoundNodeDisplay(node);
              _conBroadcastSoundState(node);
            }
          });
          _conSoundAudio.addEventListener('pause', function () {
            if (!_conActiveSoundNodeId) return;
            const node = (conNodes || []).find(n => n && n.id === _conActiveSoundNodeId);
            if (node && node.soundState !== 'ended' && node.soundState !== 'idle') {
              node.soundState = 'paused';
              conSyncSoundPopoverUi(node);
              conUpdateSoundNodeDisplay(node);
              _conBroadcastSoundState(node);
            }
          });
        }
        return _conSoundAudio;
      }

      function _conBroadcastSoundState(node) {
        if (!node || !window._conMirrorSend) return;
        try {
          window._conMirrorSend({
            type: 'node-sound-state',
            id: String(node.id),
            soundState: node.soundState,
            currentTime: node.soundCurrentTime || 0,
            duration: node.soundDuration || 0
          });
        } catch (_) {}
      }

      function _conThrottleBroadcastSoundState(node) {
        if (_conSoundBroadcastPending || !window._conMirrorSend) return;
        _conSoundBroadcastPending = true;
        requestAnimationFrame(function () {
          _conSoundBroadcastPending = false;
          _conBroadcastSoundState(node);
        });
      }

      function conAddSoundNodeAt(attOrName, x, y, pageNum) {
        let att = null;
        let name = '';
        let attId = null;
        if (typeof attOrName === 'object' && attOrName) {
          att = attOrName;
          attId = att.id;
          name = att.name || 'Sound';
        } else if (typeof attOrName === 'string') {
          name = attOrName;
          att = (conAttachments || []).find(a => a && (a.id === attOrName || a.name === attOrName));
          if (att) attId = att.id;
        }

        const id = conAddWordAt(name || 'Sound', x, y, pageNum);
        const node = conNodes.find(n => n && n.id === id);
        if (node) {
          node.isSound = true;
          node.soundAttachmentId = attId || null;
          node.soundName = name || 'Sound';
          node.soundDuration = 0;
          node.soundCurrentTime = 0;
          node.soundState = 'idle';
          node.baseWord = name || 'Sound';

          if (att) {
            conGetAttachmentDataUrl(att).then(url => {
              if (!url) return;
              const probeAudio = new Audio();
              probeAudio.preload = 'metadata';
              probeAudio.src = url;
              probeAudio.onloadedmetadata = function () {
                if (probeAudio.duration && isFinite(probeAudio.duration)) {
                  node.soundDuration = probeAudio.duration;
                  conUpdateSoundNodeDisplay(node);
                }
              };
            }).catch(() => {});
          }

          conRenderNodeLabel(node);
          conRedrawEdges();
        }
        return id;
      }
      window.conAddSoundNodeAt = conAddSoundNodeAt;

      function conUpdateSoundNodeDisplay(node) {
        if (!node || !node.isSound) return;
        if (!node.el || !node.el.parentNode) {
          node.el = document.getElementById(node.id);
          if (!node.el) return;
        }
        const isPlaying = node.soundState === 'playing';
        const isPaused = node.soundState === 'paused';
        node.el.classList.toggle('con-node-sound', true);
        node.el.classList.toggle('con-sound-playing', isPlaying);
        node.el.classList.toggle('con-sound-paused', isPaused);

        const curTime = (typeof node.soundCurrentTime === 'number') ? node.soundCurrentTime : 0;
        const durTime = (typeof node.soundDuration === 'number') ? node.soundDuration : 0;
        let timeStr = '';
        if (durTime > 0) {
          timeStr = conFormatDurationSec(Math.round(curTime)) + ' / ' + conFormatDurationSec(Math.round(durTime));
        }

        const digits = node.el.querySelector('.con-sound-digits');
        if (digits) {
          if (timeStr) {
            digits.style.display = '';
            if (digits.textContent !== timeStr) digits.textContent = timeStr;
          } else {
            digits.style.display = 'none';
          }
        } else {
          conRenderNodeLabel(node);
        }
      }
      window.conUpdateSoundNodeDisplay = conUpdateSoundNodeDisplay;

      async function conOpenSoundPopover(node) {
        const popover = document.getElementById('con-sound-action-popover');
        if (!popover || !node || !node.el) return;
        _conActiveSoundNodeId = node.id;
        const audio = conGetOrInitSoundAudio();

        if (audio.dataset.nodeId !== String(node.id)) {
          if (!audio.paused) audio.pause();
          audio.dataset.nodeId = String(node.id);

          let audioSrc = '';
          const att = (conAttachments || []).find(a => a && (a.id === node.soundAttachmentId || a.name === node.soundName || a.name === node.baseWord));
          if (att) {
            if (att._cachedObjectUrl) {
              audioSrc = att._cachedObjectUrl;
            } else if (typeof conGetAttachmentDataUrl === 'function') {
              audioSrc = await conGetAttachmentDataUrl(att);
            }
          }
          if (audioSrc) {
            audio.src = audioSrc;
            audio.load();
            if (node.soundCurrentTime && node.soundCurrentTime > 0) {
              audio.currentTime = node.soundCurrentTime;
            }
          }
        }

        const titleEl = document.getElementById('con-sound-popover-title');
        if (titleEl) {
          const trackTitle = node.soundName || node.text || node.baseWord || 'Audio';
          titleEl.textContent = trackTitle;
          titleEl.title = trackTitle;
        }

        conSyncSoundPopoverUi(node);

        popover.style.display = 'flex';
        const rect = node.el.getBoundingClientRect();
        const popW = popover.offsetWidth || 260;
        const popH = popover.offsetHeight || 120;
        let px = rect.left + rect.width / 2 - popW / 2;
        let py = rect.top - popH - 8;
        if (py < 10) py = rect.bottom + 8;
        px = Math.max(10, Math.min(window.innerWidth - popW - 10, px));
        popover.style.left = px + 'px';
        popover.style.top = py + 'px';

        setTimeout(() => {
          document.addEventListener('mousedown', _conOnSoundPopoverOutside, true);
        }, 20);
      }
      window.conOpenSoundPopover = conOpenSoundPopover;

      function _conOnSoundPopoverOutside(e) {
        const popover = document.getElementById('con-sound-action-popover');
        if (!popover || popover.style.display === 'none') {
          document.removeEventListener('mousedown', _conOnSoundPopoverOutside, true);
          return;
        }
        if (popover.contains(e.target) || (e.target && e.target.closest && e.target.closest('.con-node-sound'))) {
          return;
        }
        conCloseSoundPopover();
      }

      function conCloseSoundPopover() {
        const popover = document.getElementById('con-sound-action-popover');
        if (popover) popover.style.display = 'none';
        document.removeEventListener('mousedown', _conOnSoundPopoverOutside, true);
      }
      window.conCloseSoundPopover = conCloseSoundPopover;

      function conSyncSoundPopoverUi(node) {
        const popover = document.getElementById('con-sound-action-popover');
        if (!popover || popover.style.display === 'none') return;
        if (!node) node = (conNodes || []).find(n => n && n.id === _conActiveSoundNodeId);
        if (!node) return;

        const audio = _conSoundAudio;
        const curSec = (audio && !isNaN(audio.currentTime)) ? audio.currentTime : (node.soundCurrentTime || 0);
        const durSec = (audio && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : (node.soundDuration || 0);

        const slider = document.getElementById('con-sound-seek-slider');
        if (slider && document.activeElement !== slider) {
          slider.max = durSec > 0 ? durSec : 100;
          slider.value = curSec;
          slider.disabled = (durSec <= 0 && (!audio || !audio.src));
        }

        const curTimeEl = document.getElementById('con-sound-cur-time');
        if (curTimeEl) curTimeEl.textContent = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(curSec)) : String(Math.round(curSec));

        const totalTimeEl = document.getElementById('con-sound-total-time');
        if (totalTimeEl) totalTimeEl.textContent = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(durSec)) : String(Math.round(durSec));

        const playBtn = document.getElementById('con-sound-play-pause-btn');
        const playLabel = document.getElementById('con-sound-play-pause-label');
        const playIcon = playBtn ? playBtn.querySelector('img') : null;

        const isPlaying = audio && !audio.paused && !audio.ended;
        if (playLabel) playLabel.textContent = isPlaying ? (typeof i18n !== 'undefined' ? i18n.t('soundNodePause') || 'Pause' : 'Pause') : (typeof i18n !== 'undefined' ? i18n.t('soundNodePlay') || 'Play' : 'Play');
        if (playIcon) playIcon.src = isPlaying ? '../assets/icons/pause.svg' : '../assets/icons/play.svg';
        if (playBtn) {
          playBtn.classList.toggle('btn-blue', !isPlaying);
          playBtn.classList.toggle('btn-grey', isPlaying);
        }
      }

      window.conHandleSoundPlayPause = function () {
        const node = (conNodes || []).find(n => n && n.id === _conActiveSoundNodeId);
        if (!node) return;
        const audio = conGetOrInitSoundAudio();
        if (!audio.src) return;

        if (!audio.paused && !audio.ended) {
          audio.pause();
          node.soundState = 'paused';
        } else {
          if (audio.ended) {
            audio.currentTime = 0;
            node.soundCurrentTime = 0;
          }
          audio.play().catch(err => {
            console.warn('Audio playback error:', err);
          });
          node.soundState = 'playing';
        }
        conSyncSoundPopoverUi(node);
        conUpdateSoundNodeDisplay(node);
        _conBroadcastSoundState(node);
      };

      window.conHandleSoundStop = function () {
        const node = (conNodes || []).find(n => n && n.id === _conActiveSoundNodeId);
        const audio = conGetOrInitSoundAudio();
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        if (node) {
          node.soundCurrentTime = 0;
          node.soundState = 'idle';
          conUpdateSoundNodeDisplay(node);
          _conBroadcastSoundState(node);
        }
        conSyncSoundPopoverUi(node);
      };

      window.conHandleSoundSeek = function (val) {
        const node = (conNodes || []).find(n => n && n.id === _conActiveSoundNodeId);
        const audio = conGetOrInitSoundAudio();
        const time = parseFloat(val) || 0;
        if (audio && isFinite(time)) {
          audio.currentTime = time;
        }
        if (node) {
          node.soundCurrentTime = time;
          conUpdateSoundNodeDisplay(node);
          _conThrottleBroadcastSoundState(node);
        }
        const curTimeEl = document.getElementById('con-sound-cur-time');
        if (curTimeEl) curTimeEl.textContent = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(time)) : String(Math.round(time));
      };

      // ================================================================
      // VIDEO NODE ENGINE & POPOVER (Zero-DOM-teardown mirror sync)
      // ================================================================
      let _conActiveVideoNodeId = null;
      let _conVideoEl = null;
      let _conVideoBroadcastPending = false;

      function conGetOrInitVideoPlayer() {
        if (!_conVideoEl) {
          _conVideoEl = document.getElementById('con-video-player-el');
          if (!_conVideoEl) {
            _conVideoEl = document.createElement('video');
            _conVideoEl.id = 'con-video-player-el';
            _conVideoEl.playsInline = true;
          }
          _conVideoEl.addEventListener('timeupdate', function () {
            if (!_conActiveVideoNodeId) return;
            const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
            if (node) {
              node.videoCurrentTime = _conVideoEl.currentTime;
              if (_conVideoEl.duration && isFinite(_conVideoEl.duration)) {
                node.videoDuration = _conVideoEl.duration;
              }
              conSyncVideoPopoverUi(node);
              conUpdateVideoNodeDisplay(node);
              _conThrottleBroadcastVideoState(node);
            }
          });
          _conVideoEl.addEventListener('ended', function () {
            if (!_conActiveVideoNodeId) return;
            const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
            if (node) {
              node.videoState = 'ended';
              node.videoCurrentTime = node.videoDuration || _conVideoEl.duration || 0;
              conSyncVideoPopoverUi(node);
              conUpdateVideoNodeDisplay(node);
              _conBroadcastVideoState(node);
            }
          });
          _conVideoEl.addEventListener('play', function () {
            if (!_conActiveVideoNodeId) return;
            const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
            if (node) {
              node.videoState = 'playing';
              conSyncVideoPopoverUi(node);
              conUpdateVideoNodeDisplay(node);
              _conBroadcastVideoState(node);
            }
          });
          _conVideoEl.addEventListener('pause', function () {
            if (!_conActiveVideoNodeId) return;
            const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
            if (node && node.videoState !== 'ended' && node.videoState !== 'idle') {
              node.videoState = 'paused';
              conSyncVideoPopoverUi(node);
              conUpdateVideoNodeDisplay(node);
              _conBroadcastVideoState(node);
            }
          });
          _conVideoEl.addEventListener('volumechange', function () {
            if (!_conActiveVideoNodeId) return;
            const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
            if (node) {
              node.videoMuted = !!_conVideoEl.muted;
              conSyncVideoPopoverUi(node);
              _conBroadcastVideoState(node);
            }
          });
        }
        return _conVideoEl;
      }

      function _conBroadcastVideoState(node) {
        if (!node || !window._conMirrorSend) return;
        try {
          let videoSrc = '';
          const att = (conAttachments || []).find(a => a && (a.id === node.videoAttachmentId || a.name === node.videoName || a.name === node.baseWord));
          if (att) {
            videoSrc = att._cachedObjectUrl || att.relativePath || (att.file && att.file.path) || att.path || '';
          }
          window._conMirrorSend({
            type: 'node-video-state',
            id: String(node.id),
            videoState: node.videoState,
            currentTime: node.videoCurrentTime || 0,
            duration: node.videoDuration || 0,
            muted: !!node.videoMuted,
            videoAttachmentId: node.videoAttachmentId || (att ? att.id : null),
            videoName: node.videoName || (att ? att.name : ''),
            videoSrc: videoSrc
          });
        } catch (_) {}
      }

      function _conThrottleBroadcastVideoState(node) {
        if (_conVideoBroadcastPending || !window._conMirrorSend) return;
        _conVideoBroadcastPending = true;
        requestAnimationFrame(function () {
          _conVideoBroadcastPending = false;
          _conBroadcastVideoState(node);
        });
      }

      function conAddVideoNodeAt(attOrName, x, y, pageNum) {
        let att = null;
        let name = '';
        let attId = null;
        if (typeof attOrName === 'object' && attOrName) {
          att = attOrName;
          attId = att.id;
          name = att.name || 'Video';
        } else if (typeof attOrName === 'string') {
          name = attOrName;
          att = (conAttachments || []).find(a => a && (a.id === attOrName || a.name === attOrName));
          if (att) attId = att.id;
        }

        const id = conAddWordAt(name || 'Video', x, y, pageNum);
        const node = conNodes.find(n => n && n.id === id);
        if (node) {
          node.isVideo = true;
          node.videoAttachmentId = attId || null;
          node.videoName = name || 'Video';
          node.videoDuration = 0;
          node.videoCurrentTime = 0;
          node.videoState = 'idle';
          node.videoMuted = false;
          node.baseWord = name || 'Video';

          if (att) {
            conGetAttachmentDataUrl(att).then(url => {
              if (!url) return;
              const probeVideo = document.createElement('video');
              probeVideo.preload = 'metadata';
              probeVideo.src = url;
              probeVideo.onloadedmetadata = function () {
                if (probeVideo.duration && isFinite(probeVideo.duration)) {
                  node.videoDuration = probeVideo.duration;
                  conUpdateVideoNodeDisplay(node);
                }
              };
            }).catch(() => {});
          }

          conRenderNodeLabel(node);
          conRedrawEdges();
        }
        return id;
      }
      window.conAddVideoNodeAt = conAddVideoNodeAt;

      function conUpdateVideoNodeDisplay(node) {
        if (!node || !node.isVideo) return;
        if (!node.el || !node.el.parentNode) {
          node.el = document.getElementById(node.id);
          if (!node.el) return;
        }
        const isPlaying = node.videoState === 'playing';
        const isPaused = node.videoState === 'paused';
        node.el.classList.toggle('con-node-video', true);
        node.el.classList.toggle('con-video-playing', isPlaying);
        node.el.classList.toggle('con-video-paused', isPaused);

        const curTime = (typeof node.videoCurrentTime === 'number') ? node.videoCurrentTime : 0;
        const durTime = (typeof node.videoDuration === 'number') ? node.videoDuration : 0;
        let timeStr = '';
        if (durTime > 0) {
          timeStr = conFormatDurationSec(Math.round(curTime)) + ' / ' + conFormatDurationSec(Math.round(durTime));
        }

        const digits = node.el.querySelector('.con-video-digits');
        if (digits) {
          if (timeStr) {
            digits.style.display = '';
            if (digits.textContent !== timeStr) digits.textContent = timeStr;
          } else {
            digits.style.display = 'none';
          }
        } else {
          conRenderNodeLabel(node);
        }
      }
      window.conUpdateVideoNodeDisplay = conUpdateVideoNodeDisplay;

      async function conOpenVideoPopover(node) {
        const popover = document.getElementById('con-video-action-popover');
        if (!popover || !node || !node.el) return;
        _conActiveVideoNodeId = node.id;
        const video = conGetOrInitVideoPlayer();

        if (video.dataset.nodeId !== String(node.id)) {
          if (!video.paused) video.pause();
          video.dataset.nodeId = String(node.id);

          let videoSrc = '';
          const att = (conAttachments || []).find(a => a && (a.id === node.videoAttachmentId || a.name === node.videoName || a.name === node.baseWord));
          if (att) {
            if (att._cachedObjectUrl) {
              videoSrc = att._cachedObjectUrl;
            } else if (typeof conGetAttachmentDataUrl === 'function') {
              videoSrc = await conGetAttachmentDataUrl(att);
            }
          }
          if (videoSrc) {
            video.src = videoSrc;
            video.load();
            if (node.videoCurrentTime && node.videoCurrentTime > 0) {
              video.currentTime = node.videoCurrentTime;
            }
          }
        }

        const titleEl = document.getElementById('con-video-popover-title');
        if (titleEl) {
          const trackTitle = node.videoName || node.text || node.baseWord || 'Video';
          titleEl.textContent = trackTitle;
          titleEl.title = trackTitle;
        }

        conSyncVideoPopoverUi(node);

        popover.style.display = 'flex';
        const rect = node.el.getBoundingClientRect();
        const popW = popover.offsetWidth || 300;
        const popH = popover.offsetHeight || 260;
        let px = rect.left + rect.width / 2 - popW / 2;
        let py = rect.top - popH - 8;
        if (py < 10) py = rect.bottom + 8;
        px = Math.max(10, Math.min(window.innerWidth - popW - 10, px));
        popover.style.left = px + 'px';
        popover.style.top = py + 'px';

        setTimeout(() => {
          document.addEventListener('mousedown', _conOnVideoPopoverOutside, true);
        }, 20);
      }
      window.conOpenVideoPopover = conOpenVideoPopover;

      function _conOnVideoPopoverOutside(e) {
        const popover = document.getElementById('con-video-action-popover');
        if (!popover || popover.style.display === 'none') {
          document.removeEventListener('mousedown', _conOnVideoPopoverOutside, true);
          return;
        }
        if (popover.contains(e.target) || (e.target && e.target.closest && e.target.closest('.con-node-video'))) {
          return;
        }
        conCloseVideoPopover();
      }

      function conCloseVideoPopover() {
        const popover = document.getElementById('con-video-action-popover');
        if (popover) popover.style.display = 'none';
        if (typeof conToggleVideoCinemaModal === 'function') {
          conToggleVideoCinemaModal(false);
        }
        document.removeEventListener('mousedown', _conOnVideoPopoverOutside, true);
      }
      window.conCloseVideoPopover = conCloseVideoPopover;

      function conSyncVideoPopoverUi(node) {
        const popover = document.getElementById('con-video-action-popover');
        if (!popover || popover.style.display === 'none') return;
        if (!node) node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
        if (!node) return;

        const video = _conVideoEl;
        const curSec = (video && !isNaN(video.currentTime)) ? video.currentTime : (node.videoCurrentTime || 0);
        const durSec = (video && !isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) ? video.duration : (node.videoDuration || 0);

        const slider = document.getElementById('con-video-seek-slider');
        if (slider && document.activeElement !== slider) {
          slider.max = durSec > 0 ? durSec : 100;
          slider.value = curSec;
          slider.disabled = (durSec <= 0 && (!video || !video.src));
        }

        const curTimeEl = document.getElementById('con-video-cur-time');
        if (curTimeEl) curTimeEl.textContent = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(curSec)) : String(Math.round(curSec));

        const totalTimeEl = document.getElementById('con-video-total-time');
        if (totalTimeEl) totalTimeEl.textContent = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(durSec)) : String(Math.round(durSec));

        const playBtn = document.getElementById('con-video-play-pause-btn');
        const playLabel = document.getElementById('con-video-play-pause-label');
        const playIcon = playBtn ? playBtn.querySelector('img') : null;

        const isPlaying = video && !video.paused && !video.ended;
        if (playLabel) playLabel.textContent = isPlaying ? (typeof i18n !== 'undefined' ? i18n.t('videoNodePause') || 'Pause' : 'Pause') : (typeof i18n !== 'undefined' ? i18n.t('videoNodePlay') || 'Play' : 'Play');
        if (playIcon) playIcon.src = isPlaying ? '../assets/icons/pause.svg' : '../assets/icons/play.svg';
        if (playBtn) {
          playBtn.classList.toggle('btn-blue', !isPlaying);
          playBtn.classList.toggle('btn-grey', isPlaying);
        }

        const muteIcon = document.getElementById('con-video-mute-icon');
        if (muteIcon) {
          const isMuted = video ? (video.muted || video.volume === 0) : !!node.videoMuted;
          muteIcon.src = isMuted ? '../assets/icons/mute.svg' : '../assets/icons/volume.svg';
        }
      }

      window.conHandleVideoPlayPause = function () {
        const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
        if (!node) return;
        const video = conGetOrInitVideoPlayer();
        if (!video.src) return;

        if (!video.paused && !video.ended) {
          video.pause();
          node.videoState = 'paused';
        } else {
          if (video.ended) {
            video.currentTime = 0;
            node.videoCurrentTime = 0;
          }
          video.play().catch(err => {
            console.warn('Video playback error:', err);
          });
          node.videoState = 'playing';
        }
        conSyncVideoPopoverUi(node);
        conUpdateVideoNodeDisplay(node);
        _conBroadcastVideoState(node);
      };

      window.conHandleVideoStop = function () {
        const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
        const video = conGetOrInitVideoPlayer();
        if (video) {
          video.pause();
          video.currentTime = 0;
        }
        if (node) {
          node.videoCurrentTime = 0;
          node.videoState = 'idle';
          conUpdateVideoNodeDisplay(node);
          _conBroadcastVideoState(node);
        }
        conSyncVideoPopoverUi(node);
      };

      window.conHandleVideoSeek = function (val) {
        const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
        const video = conGetOrInitVideoPlayer();
        const time = parseFloat(val) || 0;
        if (video && isFinite(time)) {
          video.currentTime = time;
        }
        if (node) {
          node.videoCurrentTime = time;
          conUpdateVideoNodeDisplay(node);
          _conThrottleBroadcastVideoState(node);
        }
        const curTimeEl = document.getElementById('con-video-cur-time');
        if (curTimeEl) curTimeEl.textContent = (typeof conFormatDurationSec === 'function') ? conFormatDurationSec(Math.round(time)) : String(Math.round(time));
      };

      window.conHandleVideoMute = function () {
        const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
        const video = conGetOrInitVideoPlayer();
        if (video) {
          video.muted = !video.muted;
          if (node) node.videoMuted = video.muted;
        }
        conSyncVideoPopoverUi(node);
        if (node) _conBroadcastVideoState(node);
      };

      window.conHandleVideoFullscreen = async function () {
        const video = conGetOrInitVideoPlayer();
        if (!video) return;

        // If currently in native fullscreen, exit fullscreen
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            try { await document.exitFullscreen(); } catch (_) {}
          }
          return;
        }

        // Try HTML5 requestFullscreen on video element with controls enabled
        let entered = false;
        try {
          video.controls = true;
          if (video.requestFullscreen) {
            await video.requestFullscreen();
            entered = true;
          } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen();
            entered = true;
          }
        } catch (err) {
          console.warn('[Board] Video native fullscreen request rejected, using cinema overlay:', err);
          video.controls = false;
        }

        if (!entered && !document.fullscreenElement) {
          conToggleVideoCinemaModal(true);
        }
      };

      function conToggleVideoCinemaModal(show) {
        let modal = document.getElementById('con-video-cinema-modal');
        const video = conGetOrInitVideoPlayer();
        const viewport = document.getElementById('con-video-popover-viewport');
        if (show) {
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'con-video-cinema-modal';
            modal.style.cssText = 'position:fixed; inset:0; z-index:999999; background:rgba(0,0,0,0.92); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
              <div style="position:absolute; top:15px; right:20px; display:flex; gap:10px; z-index:10;">
                <button type="button" class="action-btn btn-grey" onclick="conToggleVideoCinemaModal(false)" style="padding:6px 12px; font-weight:700; border-radius:6px; background:#fff; color:#000; cursor:pointer;">
                  ✕ Close Fullscreen
                </button>
              </div>
              <div id="con-video-cinema-container" style="width:90vw; max-width:1200px; height:80vh; max-height:800px; display:flex; align-items:center; justify-content:center; background:#000; border-radius:8px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.8);">
              </div>
            `;
            document.body.appendChild(modal);
          }
          const container = document.getElementById('con-video-cinema-container');
          if (container && video) {
            video.style.maxHeight = '100%';
            video.style.height = '100%';
            video.controls = true;
            container.appendChild(video);
          }
          modal.style.display = 'flex';
        } else if (modal && modal.style.display !== 'none') {
          modal.style.display = 'none';
          if (viewport && video) {
            video.style.maxHeight = '190px';
            video.style.height = '';
            video.controls = false;
            viewport.appendChild(video);
          }
        }
      }
      window.conToggleVideoCinemaModal = conToggleVideoCinemaModal;

      document.addEventListener('fullscreenchange', function () {
        const video = _conVideoEl;
        if (!video) return;
        if (document.fullscreenElement === video) {
          video.controls = true;
        } else if (!document.fullscreenElement) {
          video.controls = false;
        }
      });

      window.conConvertActiveVideoNodeToCanvas = function () {
        const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
        if (!node) return;
        const att = (conAttachments || []).find(a => a && (a.id === node.videoAttachmentId || a.name === node.videoName || a.name === node.baseWord));
        if (!att) {
          if (typeof mdbToast === 'function') mdbToast(' Video attachment not found.');
          return;
        }
        const x = node.x || 100;
        const y = node.y || 100;
        const pageNum = node.pageNum;
        conCloseVideoPopover();
        if (typeof conDeleteNode === 'function') {
          conDeleteNode(node.id);
        }
        conInsertAttachmentById(att.id, { x, y, pageNum, asCanvasBox: true });
        if (typeof mdbToast === 'function') {
          mdbToast((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('videoNodeConvertToCanvas') : 'Converted to canvas media box.');
        }
      };

      // ---- Media Node System App & Location Folder Engine ----
      async function conOpenMediaNodeExternal(node, action) {
        if (!node) return;
        const isSnd = !!(node.isSound || node.type === 'sound');
        const isVid = !!(node.isVideo || node.type === 'video');
        const kind = isSnd ? 'sounds' : 'videos';
        const defaultName = isSnd ? (node.soundName || node.baseWord || 'audio.mp3') : (node.videoName || node.baseWord || 'video.mp4');

        // Find associated attachment
        let att = (conAttachments || []).find(a => a && (
          (isSnd && (a.id === node.soundAttachmentId || a.name === node.soundName || a.name === node.baseWord)) ||
          (isVid && (a.id === node.videoAttachmentId || a.name === node.videoName || a.name === node.baseWord)) ||
          (a.name === defaultName)
        ));

        const isElectron = !!(window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron());

        // In standard browser environment (fallback)
        if (!isElectron) {
          if (action === 'folder') {
            if (typeof showToast === 'function') {
              showToast(typeof i18n !== 'undefined' ? i18n.t('mediaNodeFolderWebNotice') || 'Folder location is only available in the desktop application.' : 'Folder location is only available in the desktop application.', true);
            }
            return;
          }
          // action === 'open' in browser: open data URL in new tab
          let dataUrl = '';
          if (att) {
            dataUrl = att._cachedObjectUrl || (typeof conGetAttachmentDataUrl === 'function' ? await conGetAttachmentDataUrl(att) : '');
          }
          if (dataUrl) {
            window.open(dataUrl, '_blank');
          } else {
            if (typeof showToast === 'function') {
              showToast(typeof i18n !== 'undefined' ? i18n.t('mediaNodeFileNotFound') || 'Media file could not be located on disk.' : 'Media file could not be located on disk.', true);
            }
          }
          return;
        }

        // Electron environment
        // 1. Check if direct absolute path exists
        const absPath = att && (att.path || att.absolutePath || (att.file && att.file.path));
        if (absPath) {
          if (action === 'folder') {
            await Desktop.showInFolder({ absolutePath: absPath });
          } else {
            await Desktop.openNative({ absolutePath: absPath });
          }
          return;
        }

        // 2. Check candidate relative paths on disk
        const candidates = att ? conAttachmentCandidateRelativePaths(att) : conAttachmentCandidateRelativePaths({ name: defaultName, kind });
        let foundRelPath = null;
        for (const cand of candidates) {
          try {
            const check = await Desktop.readByPath('mindmaps', cand, { encoding: 'base64' });
            if (check && check.ok && check.content) {
              foundRelPath = cand;
              break;
            }
          } catch (_) {}
        }

        if (foundRelPath) {
          if (action === 'folder') {
            await Desktop.showInFolder('mindmaps', foundRelPath);
          } else {
            await Desktop.openNative('mindmaps', foundRelPath);
          }
          return;
        }

        // 3. File not found loose on disk (e.g. packed in a .cstz archive or in memory)
        const isCstz = !!(_conCurrentFileName && (_conCurrentFileName.endsWith('.cstz') || _conCurrentFileName.endsWith('.zip')));
        const archiveRelPath = _conCurrentFileName
          ? (_conCurrentFolderName ? (_conCurrentFolderName + '/' + _conCurrentFileName) : _conCurrentFileName)
          : '';

        if (action === 'folder') {
          // If it's a .cstz file or saved file, reveal the archive/session file in explorer
          if (archiveRelPath) {
            await Desktop.showInFolder('mindmaps', archiveRelPath);
          } else if (_conCurrentFolderName) {
            await Desktop.showInFolder('mindmaps', _conCurrentFolderName);
          } else {
            await Desktop.showInFolder('mindmaps', '');
          }
          return;
        }

        // Action === 'open' on .cstz or memory-only media:
        // If it is a cstz file, open the folder of the archive file first, then open the extracted audio/video
        if (isCstz && archiveRelPath) {
          try {
            await Desktop.showInFolder('mindmaps', archiveRelPath);
          } catch (_) {}
        }

        // Extract and write media to disk so system player can open it
        try {
          let mediaBlob = null;
          if (att && att.file && att.file instanceof Blob) {
            mediaBlob = att.file;
          } else if (typeof conGetAttachmentArrayBuffer === 'function' && att) {
            const buf = await conGetAttachmentArrayBuffer(att);
            if (buf) {
              const mime = att.mime || (isSnd ? 'audio/mpeg' : 'video/mp4');
              mediaBlob = new Blob([buf], { type: mime });
            }
          }
          if (!mediaBlob && att && typeof conGetAttachmentDataUrl === 'function') {
            const dUrl = await conGetAttachmentDataUrl(att);
            if (dUrl) {
              const fetchRes = await fetch(dUrl);
              mediaBlob = await fetchRes.blob();
            }
          }

          if (!mediaBlob) {
            // Check if active audio/video element has loaded src
            const playerEl = isSnd ? _conSoundAudio : _conVideoEl;
            if (playerEl && playerEl.src) {
              const fetchRes = await fetch(playerEl.src);
              mediaBlob = await fetchRes.blob();
            }
          }

          if (mediaBlob) {
            const rawFileName = (att && att.name) || defaultName;
            const extMatch = rawFileName.match(/\.[a-zA-Z0-9]+$/);
            const ext = extMatch ? extMatch[0] : (isSnd ? '.mp3' : '.mp4');
            const safeBase = rawFileName.replace(/\.[a-zA-Z0-9]+$/, '');
            const finalFileName = safeBase + ext;

            const boardBase = _conCurrentFileName ? boardStripJsonExt(_conCurrentFileName) : (_conCurrentFolderName || 'temp_media');
            const relSubdir = boardBase + '/' + kind;

            await Desktop.saveBlob('mindmaps', finalFileName, mediaBlob, relSubdir);
            const extractedRelPath = relSubdir + '/' + finalFileName;

            await Desktop.openNative('mindmaps', extractedRelPath);
            if (typeof showToast === 'function') {
              showToast(typeof i18n !== 'undefined' ? i18n.t('mediaNodeExtractedToast') || 'Media extracted from archive and opened in system application.' : 'Media extracted from archive and opened in system application.');
            }
            return;
          }
        } catch (err) {
          console.warn('[Board] Could not extract media for external open:', err);
        }

        // Fallback if unable to extract
        if (archiveRelPath) {
          await Desktop.showInFolder('mindmaps', archiveRelPath);
        } else {
          if (typeof showToast === 'function') {
            showToast(typeof i18n !== 'undefined' ? i18n.t('mediaNodeFileNotFound') || 'Media file could not be located on disk.' : 'Media file could not be located on disk.', true);
          }
        }
      }

      window.conSoundNodeOpenNative = function () {
        const node = (conNodes || []).find(n => n && n.id === _conActiveSoundNodeId);
        if (node) conOpenMediaNodeExternal(node, 'open');
      };
      window.conSoundNodeOpenFolder = function () {
        const node = (conNodes || []).find(n => n && n.id === _conActiveSoundNodeId);
        if (node) conOpenMediaNodeExternal(node, 'folder');
      };
      window.conVideoNodeOpenNative = function () {
        const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
        if (node) conOpenMediaNodeExternal(node, 'open');
      };
      window.conVideoNodeOpenFolder = function () {
        const node = (conNodes || []).find(n => n && n.id === _conActiveVideoNodeId);
        if (node) conOpenMediaNodeExternal(node, 'folder');
      };
      window.conCtxMediaOpenNative = function () {
        const node = (conNodes || []).find(n => n && n.id === conCtxNodeId);
        if (node) conOpenMediaNodeExternal(node, 'open');
        if (typeof conCtxClose === 'function') conCtxClose();
      };
      window.conCtxMediaOpenFolder = function () {
        const node = (conNodes || []).find(n => n && n.id === conCtxNodeId);
        if (node) conOpenMediaNodeExternal(node, 'folder');
        if (typeof conCtxClose === 'function') conCtxClose();
      };

      // ============================================================
      // HYPERLINK & DEEP LINK NODE SYSTEM
      // ============================================================
      var _conActiveLinkNode = null;
      var _conLinkOverlayOpenTime = 0;
      var _conLinkModalTargetNode = null;
      var _conLinkModalActiveTab = 'web';

      function _conPositionPopupAtEvent(popup, e) {
        if (!popup) return;
        popup.style.maxHeight = Math.max(160, window.innerHeight - 16) + 'px';
        var maxW = Math.min(360, Math.max(280, window.innerWidth - 16));
        popup.style.maxWidth = maxW + 'px';
        popup.style.width = Math.min(320, maxW) + 'px';
        popup.style.overflowY = 'auto';
        popup.style.overflowX = 'hidden';
        var pw = popup.offsetWidth || 320;
        var ph = popup.offsetHeight || 300;
        var mx = (e && e.clientX != null ? e.clientX : window.innerWidth / 2 - pw / 2) + 10;
        var my = (e && e.clientY != null ? e.clientY : window.innerHeight / 2 - ph / 2) + 8;
        if (mx + pw > window.innerWidth - 12) mx = (e && e.clientX != null ? e.clientX : window.innerWidth / 2) - pw - 10;
        if (my + ph > window.innerHeight - 12) my = window.innerHeight - ph - 12;
        mx = Math.max(8, Math.min(window.innerWidth - pw - 8, mx));
        my = Math.max(8, Math.min(window.innerHeight - ph - 8, my));
        popup.style.left = Math.round(mx) + 'px';
        popup.style.top = Math.round(my) + 'px';
        popup.style.maxHeight = Math.max(160, window.innerHeight - my - 8) + 'px';
      }

      async function _conSyncWebBookmark(title, url, tags, existingBookmarkId) {
        if (typeof BookmarksService === 'undefined' || !url) return null;
        try {
          if (existingBookmarkId && typeof BookmarksService.update === 'function') {
            const updated = await BookmarksService.update(existingBookmarkId, { title, url, tags });
            if (updated) return updated;
          }
          if (typeof BookmarksService.getAll === 'function') {
            const all = await BookmarksService.getAll();
            const normUrl = String(url).trim().toLowerCase();
            const match = Array.isArray(all) ? all.find(b => b && b.url && String(b.url).trim().toLowerCase() === normUrl) : null;
            if (match && typeof BookmarksService.update === 'function') {
              return await BookmarksService.update(match.id, { title, url, tags });
            }
          }
          return await BookmarksService.add({ title, url, tags });
        } catch (_) {
          return null;
        }
      }

      function conAddLinkNodeAt(linkData, x, y, pageNum) {
        const title = (linkData && (linkData.title || linkData.text || linkData.url)) || 'Link';
        const id = conAddWordAt(title, x, y, pageNum);
        const node = conNodes.find(n => n && n.id === id);
        if (!node) return id;

        node.isLink = true;
        node.linkType = (linkData && linkData.linkType) || 'web'; // 'web' | 'canvas' | 'board' | 'doc' | 'grades' | 'suite'
        node.linkTarget = (linkData && (linkData.target || linkData.url || linkData.id)) || '';
        node.linkTitle = (linkData && linkData.title) || title;
        node.linkSubTitle = (linkData && (linkData.subtitle || linkData.subTitle || linkData.domain)) || '';
        node.linkUrn = (linkData && linkData.urn) || '';
        node.bookmarkId = (linkData && linkData.bookmarkId) || null;
        node.tags = Array.isArray(linkData && linkData.tags) ? [...linkData.tags] : [];

        conRenderNodeLabel(node);
        if (typeof conPushUndo === 'function') conPushUndo();
        return id;
      }
      window.conAddLinkNodeAt = global.conAddLinkNodeAt = conAddLinkNodeAt;

      function _findPageForEntity(type, id, defaultIdx) {
        const curPage = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : ((typeof window.conCurrentPageIndex === 'number') ? window.conCurrentPageIndex : 0);
        if (type === 'node') {
          const liveNodes = (typeof window.conGetNodes === 'function') ? window.conGetNodes() : (window.conNodes || []);
          if (liveNodes.some(n => n && (String(n.id) === String(id) || n.id === id))) return curPage;
        } else {
          const liveNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : (window.conNotes || []);
          if (liveNotes.some(nt => nt && (String(nt.id) === String(id) || nt.id === id))) return curPage;
        }

        const snaps = (typeof conPageSnapshots !== 'undefined' && Array.isArray(conPageSnapshots))
          ? conPageSnapshots
          : ((typeof window.conPageSnapshots !== 'undefined' && Array.isArray(window.conPageSnapshots)) ? window.conPageSnapshots : []);

        for (let p = 0; p < snaps.length; p++) {
          const snap = snaps[p];
          if (!snap) continue;
          if (type === 'node' && Array.isArray(snap.nodes)) {
            if (snap.nodes.some(n => n && (String(n.id) === String(id) || n.id === id))) return p;
          } else if (type === 'note' && Array.isArray(snap.notes)) {
            if (snap.notes.some(nt => nt && (String(nt.id) === String(id) || nt.id === id))) return p;
          }
        }
        return (defaultIdx != null) ? defaultIdx : curPage;
      }

      async function conActivateLinkNode(nodeOrId) {
        const node = (typeof nodeOrId === 'object' && nodeOrId)
          ? nodeOrId
          : (conNodes || []).find(n => n && (n.id === nodeOrId || String(n.id) === String(nodeOrId)));
        if (!node) return;

        const linkType = node.linkType || 'web';
        const target = String(node.linkTarget || '').trim();
        const title = node.linkTitle || node.baseWord || 'Link';

        if (typeof BoardAudioService !== 'undefined') BoardAudioService.playAction('click');

        // 1. Same-board canvas target (current page or across multiple pages)
        if (linkType === 'canvas' || target.startsWith('node:') || target.startsWith('note:') || target.startsWith('page:')) {
          let targetPageIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : ((typeof window.conCurrentPageIndex === 'number') ? window.conCurrentPageIndex : 0);
          let entityType = 'node';
          let rawId = '';

          const pageMatch = target.match(/^page:(\d+)(?::(node|note):(.+))?$/);
          if (pageMatch) {
            targetPageIdx = parseInt(pageMatch[1], 10);
            if (pageMatch[2] && pageMatch[3]) {
              entityType = pageMatch[2];
              rawId = pageMatch[3];
            } else {
              // Standalone page switch
              if (typeof window.conGoToPage === 'function') {
                window.conGoToPage(targetPageIdx);
              }
              return;
            }
          } else if (target.startsWith('node:')) {
            entityType = 'node';
            rawId = target.slice(5);
            targetPageIdx = _findPageForEntity('node', rawId, targetPageIdx);
          } else if (target.startsWith('note:')) {
            entityType = 'note';
            rawId = target.slice(5);
            targetPageIdx = _findPageForEntity('note', rawId, targetPageIdx);
          } else if (target.startsWith('page:')) {
            targetPageIdx = parseInt(target.slice(5), 10) || 0;
            if (typeof window.conGoToPage === 'function') {
              window.conGoToPage(targetPageIdx);
            }
            return;
          } else if (!rawId && target) {
            const nP = _findPageForEntity('node', target, -1);
            if (nP >= 0) {
              entityType = 'node';
              rawId = target;
              targetPageIdx = nP;
            } else {
              const ntP = _findPageForEntity('note', target, -1);
              if (ntP >= 0) {
                entityType = 'note';
                rawId = target;
                targetPageIdx = ntP;
              }
            }
          }

          const doScrollCenterAndPulse = () => {
            const brd = (typeof board === 'function') ? board() : document.getElementById('constellation-board');
            if (!brd) return;

            let liveEl = null;
            let tx = null, ty = null, tw = 80, th = 32;

            if (entityType === 'node') {
              const liveNodes = (typeof window.conGetNodes === 'function') ? window.conGetNodes() : (window.conNodes || conNodes || []);
              const nodeObj = liveNodes.find(n => n && (String(n.id) === String(rawId) || n.id === rawId));
              if (nodeObj) {
                liveEl = nodeObj.el || document.getElementById(String(rawId)) || document.querySelector(`.con-node[data-id="${rawId}"]`);
                tx = (nodeObj.x != null) ? nodeObj.x : (liveEl ? (parseInt(liveEl.style.left, 10) || liveEl.offsetLeft || 0) : 0);
                ty = (nodeObj.y != null) ? nodeObj.y : (liveEl ? (parseInt(liveEl.style.top, 10) || liveEl.offsetTop || 0) : 0);
                tw = (nodeObj.w != null) ? nodeObj.w : (liveEl ? (liveEl.offsetWidth || 80) : 80);
                th = (nodeObj.h != null) ? nodeObj.h : (liveEl ? (liveEl.offsetHeight || 32) : 32);

                if (typeof conSelect === 'function') conSelect(nodeObj.id);
                else if (typeof window.conSelect === 'function') window.conSelect(nodeObj.id);
              }
            } else if (entityType === 'note') {
              const liveNotes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : (window.conNotes || conNotes || []);
              const noteObj = liveNotes.find(nt => nt && (String(nt.id) === String(rawId) || nt.id === rawId));
              liveEl = document.querySelector(`.con-word-note[data-id="${rawId}"]`) || (noteObj && noteObj.el) || document.getElementById(String(rawId));
              if (noteObj) {
                tx = (noteObj.x != null) ? noteObj.x : (liveEl ? (parseInt(liveEl.style.left, 10) || liveEl.offsetLeft || 0) : 0);
                ty = (noteObj.y != null) ? noteObj.y : (liveEl ? (parseInt(liveEl.style.top, 10) || liveEl.offsetTop || 0) : 0);
                tw = (noteObj.width != null) ? noteObj.width : (liveEl ? (liveEl.offsetWidth || 140) : 140);
                th = (noteObj.height != null) ? noteObj.height : (liveEl ? (liveEl.offsetHeight || 90) : 90);

                if (typeof conSelectNote === 'function') conSelectNote(noteObj.id);
                else if (typeof window.conSelectNote === 'function') window.conSelectNote(noteObj.id);
              }
            }

            // Fallback: check DOM directly by id if element wasn't found in memory
            if (!liveEl && rawId) {
              liveEl = document.getElementById(String(rawId)) || document.querySelector(`[data-id="${rawId}"]`);
              if (liveEl) {
                tx = parseInt(liveEl.style.left, 10) || liveEl.offsetLeft || 0;
                ty = parseInt(liveEl.style.top, 10) || liveEl.offsetTop || 0;
                tw = liveEl.offsetWidth || tw;
                th = liveEl.offsetHeight || th;
              }
            }

            if (liveEl) {
              if (tx != null && ty != null && !isNaN(tx) && !isNaN(ty)) {
                tw = liveEl.offsetWidth || tw;
                th = liveEl.offsetHeight || th;
                const targetScrollX = Math.max(0, Math.round((tx + tw / 2) - brd.clientWidth / 2));
                const targetScrollY = Math.max(0, Math.round((ty + th / 2) - brd.clientHeight / 2));
                brd.scrollTo({
                  left: targetScrollX,
                  top: targetScrollY,
                  behavior: 'smooth'
                });
              } else {
                liveEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
              }

              liveEl.classList.remove('con-link-highlight-pulse', 'con-node-highlight-pulse', 'con-search-target-pulse');
              void liveEl.offsetWidth;
              liveEl.classList.add('con-link-highlight-pulse');
              if (typeof window._conMirrorSend === 'function') {
                const pulseId = (liveEl.dataset && liveEl.dataset.id) ? liveEl.dataset.id : liveEl.id;
                const pulseKind = liveEl.classList.contains('con-word-note') ? 'note' : (liveEl.classList.contains('con-node') ? 'node' : 'element');
                if (pulseId) {
                  window._conMirrorSend({ type: 'entity-highlight-pulse', id: String(pulseId), kind: pulseKind, className: 'con-link-highlight-pulse', durationMs: 2500 });
                }
              }
              setTimeout(() => {
                if (liveEl) liveEl.classList.remove('con-link-highlight-pulse');
              }, 2500);
            }
          };

          const curPage = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : ((typeof window.conCurrentPageIndex === 'number') ? window.conCurrentPageIndex : 0);
          if (typeof window.conGoToPage === 'function' && curPage !== targetPageIdx) {
            window._conSuppressScrollToTop = true;
            window.conGoToPage(targetPageIdx);
            setTimeout(() => {
              window._conSuppressScrollToTop = false;
              doScrollCenterAndPulse();
            }, 280);
          } else {
            doScrollCenterAndPulse();
          }
          return;
        }

        // 2. Another board mindmap
        if (linkType === 'board') {
          if (node.linkUrn && typeof LinksService !== 'undefined' && typeof LinksService.openUrn === 'function') {
            await LinksService.openUrn(node.linkUrn);
          } else {
            const filename = (target.endsWith('.json') || target.endsWith('.cstz') || target.endsWith('.js')) ? target : target + '.json';
            const baseFname = filename.split('/').pop();
            if (window.Desktop && typeof Desktop.openPage === 'function') {
              Desktop.openPage('board.html', {
                openSession: '1',
                openTarget: 'mindmaps',
                openFilename: baseFname,
                openRelPath: filename,
                openSection: 'constellation'
              });
            } else {
              window.open('board.html?openSession=1&openTarget=mindmaps&openFilename=' + encodeURIComponent(baseFname) + '&openRelPath=' + encodeURIComponent(filename), '_blank');
            }
          }
          return;
        }

        // 3. Document Editor document
        if (linkType === 'doc') {
          const docFile = (target.endsWith('.md') || target.endsWith('.markdown')) ? target : target + '.md';
          if (node.linkUrn && typeof LinksService !== 'undefined' && typeof LinksService.openUrn === 'function') {
            await LinksService.openUrn(node.linkUrn);
          } else if (typeof LinksService !== 'undefined' && typeof LinksService.openUrn === 'function') {
            await LinksService.openUrn('cmt:doc:' + docFile);
          } else if (window.Desktop && typeof Desktop.openPage === 'function') {
            Desktop.openPage('document-editor.html', { editTarget: 'docEditorDocs', editRelPath: docFile });
          } else {
            window.open('document-editor.html?editTarget=docEditorDocs&editRelPath=' + encodeURIComponent(docFile), '_blank');
          }
          return;
        }

        // 4. Grade Sheet / Suite Tool
        if (linkType === 'grades' || linkType === 'suite') {
          if (node.linkUrn && typeof LinksService !== 'undefined' && typeof LinksService.openUrn === 'function') {
            await LinksService.openUrn(node.linkUrn);
          } else {
            window.open(target.startsWith('pages/') ? target : target, '_blank');
          }
          return;
        }

        // 5. Web URL (Default)
        if (!target) return;
        if (/^(?:javascript|vbscript|data):/i.test(target)) {
          if (typeof showToast === 'function') showToast('Blocked unsafe URL scheme', true);
          return;
        }
        let url = target;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        if (window.Desktop && typeof Desktop.openWebWindow === 'function') {
          await Desktop.openWebWindow(url, title);
        } else if (window.Desktop && typeof Desktop.openExternal === 'function') {
          await Desktop.openExternal(url);
        } else {
          window.open(url, '_blank');
        }
      }
      window.conActivateLinkNode = global.conActivateLinkNode = conActivateLinkNode;

      window.conLinkStyleOpen = function (e, node) {
        if (typeof conCtxClose === 'function') conCtxClose();
        else if (typeof window.conCtxClose === 'function') window.conCtxClose();
        if (typeof window.conBoardCtxClose === 'function') window.conBoardCtxClose();

        _conActiveLinkNode = node;
        var overlay = document.getElementById('con-link-style-overlay');
        var popup = document.getElementById('con-link-style-popup');
        if (!overlay || !node) return;
        _conLinkOverlayOpenTime = Date.now();

        var titleEl = document.getElementById('con-link-sp-title');
        var subtitleEl = document.getElementById('con-link-sp-sub');
        var iconEl = document.getElementById('con-link-sp-icon');
        var lockBtn = document.getElementById('con-link-sp-lock-btn');

        const lType = node.linkType || 'web';
        let iconName = 'links.svg';
        if (lType === 'canvas') iconName = 'arrow-right.svg';
        else if (lType === 'board') iconName = 'board.svg';
        else if (lType === 'doc') iconName = 'document-editor.svg';
        else if (lType === 'grades') iconName = 'grade-sheet.svg';
        else if (lType === 'suite') iconName = 'file-text.svg';

        if (iconEl) iconEl.src = '../assets/icons/' + iconName;
        if (titleEl) titleEl.textContent = node.linkTitle || node.baseWord || 'Link';
        if (subtitleEl) subtitleEl.textContent = node.linkSubTitle || node.linkTarget || '';

        if (lockBtn) {
          lockBtn.innerHTML = '<img src="../assets/icons/' + (node.locked ? 'unlock' : 'lock') + '.svg" class="btn-icon" alt="" />';
          lockBtn.classList.toggle('active', !!node.locked);
          lockBtn.title = node.locked ? 'Unlock' : 'Lock';
        }

        var inAppBtn = document.getElementById('con-link-sp-inapp-btn');
        var browserBtn = document.getElementById('con-link-sp-browser-btn');
        var jumpBtn = document.getElementById('con-link-sp-jump-btn');
        var newWinBtn = document.getElementById('con-link-sp-newwin-btn');
        var loadCurrBtn = document.getElementById('con-link-sp-loadcurr-btn');

        if (inAppBtn) inAppBtn.style.display = (lType === 'web') ? '' : 'none';
        if (browserBtn) browserBtn.style.display = (lType === 'web') ? '' : 'none';
        if (jumpBtn) jumpBtn.style.display = (lType === 'canvas') ? '' : 'none';
        if (newWinBtn) newWinBtn.style.display = (lType === 'board' || lType === 'doc' || lType === 'grades' || lType === 'suite') ? '' : 'none';
        if (loadCurrBtn) loadCurrBtn.style.display = (lType === 'board') ? '' : 'none';

        overlay.classList.add('active');
        _conPositionPopupAtEvent(popup, e);
      };

      window.conLinkStyleClose = function (e) {
        if (Date.now() - _conLinkOverlayOpenTime < 200) return;
        if (e && e.target !== document.getElementById('con-link-style-overlay')) return;
        window.conLinkStyleDismiss();
      };

      window.conLinkStyleDismiss = function () {
        var overlay = document.getElementById('con-link-style-overlay');
        if (overlay) overlay.classList.remove('active');
        _conActiveLinkNode = null;
      };

      window.conLinkSpOpenInApp = function () {
        var node = _conActiveLinkNode;
        window.conLinkStyleDismiss();
        if (!node) return;
        let url = String(node.linkTarget || '').trim();
        if (!url) return;
        if (/^(?:javascript|vbscript|data):/i.test(url)) {
          if (typeof showToast === 'function') showToast('Blocked unsafe URL scheme', true);
          return;
        }
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        if (window.Desktop && typeof Desktop.openWebWindow === 'function') {
          Desktop.openWebWindow(url, node.linkTitle || node.baseWord);
        } else {
          window.open(url, '_blank');
        }
      };

      window.conLinkSpOpenBrowser = function () {
        var node = _conActiveLinkNode;
        window.conLinkStyleDismiss();
        if (!node) return;
        let url = String(node.linkTarget || '').trim();
        if (!url) return;
        if (/^(?:javascript|vbscript|data):/i.test(url)) {
          if (typeof showToast === 'function') showToast('Blocked unsafe URL scheme', true);
          return;
        }
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        if (window.Desktop && typeof Desktop.openExternal === 'function') {
          Desktop.openExternal(url);
        } else {
          window.open(url, '_blank');
        }
      };

      window.conLinkSpJumpCanvas = function () {
        var node = _conActiveLinkNode;
        window.conLinkStyleDismiss();
        if (!node) return;
        conActivateLinkNode(node);
      };

      window.conLinkSpOpenNewBoard = function () {
        var node = _conActiveLinkNode;
        window.conLinkStyleDismiss();
        if (!node) return;
        conActivateLinkNode(node);
      };

      window.conLinkSpLoadCurrentBoard = function () {
        var node = _conActiveLinkNode;
        window.conLinkStyleDismiss();
        if (!node || !node.linkTarget) return;
        const targetPath = (node.linkTarget.endsWith('.json') || node.linkTarget.endsWith('.cstz') || node.linkTarget.endsWith('.js'))
          ? node.linkTarget
          : node.linkTarget + '.json';
        const baseFilename = targetPath.split('/').pop();
        if (typeof window.historyLoadSavedFile === 'function') {
          window.historyLoadSavedFile({
            target: 'mindmaps',
            filename: baseFilename,
            relativePath: targetPath,
            section: 'constellation'
          });
        } else {
          window.location.search = '?openSession=1&openTarget=mindmaps&openFilename=' + encodeURIComponent(baseFilename) + '&openRelPath=' + encodeURIComponent(targetPath);
        }
      };

      window.conLinkSpCopy = function () {
        var node = _conActiveLinkNode;
        window.conLinkStyleDismiss();
        if (!node) return;
        const target = node.linkTarget || node.linkUrn || '';
        if (target && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(target).then(() => {
            if (typeof showToast === 'function') showToast(typeof i18n !== 'undefined' ? i18n.t('conLinkTargetCopied') || 'Target copied to clipboard' : 'Target copied to clipboard');
          }).catch(() => {
            if (typeof showToast === 'function') showToast('Clipboard unavailable', true);
          });
        }
      };

      window.conLinkSpEdit = function () {
        var node = _conActiveLinkNode;
        window.conLinkStyleDismiss();
        if (node && typeof window.conOpenLinkEditModal === 'function') {
          window.conOpenLinkEditModal(node);
        }
      };

      window.conLinkSpToggleLock = function () {
        if (!_conActiveLinkNode) return;
        _conActiveLinkNode.locked = !_conActiveLinkNode.locked;
        if (_conActiveLinkNode.el) _conActiveLinkNode.el.classList.toggle('con-locked', !!_conActiveLinkNode.locked);
        if (typeof conSyncNodeLockState === 'function') conSyncNodeLockState(_conActiveLinkNode);
        var btn = document.getElementById('con-link-sp-lock-btn');
        if (btn) {
          btn.innerHTML = '<img src="../assets/icons/' + (_conActiveLinkNode.locked ? 'unlock' : 'lock') + '.svg" class="btn-icon" alt="" />';
          btn.classList.toggle('active', !!_conActiveLinkNode.locked);
          btn.title = _conActiveLinkNode.locked ? 'Unlock' : 'Lock';
        }
        if (typeof conPushUndo === 'function') conPushUndo();
      };

      window.conLinkSpDelete = function () {
        var node = _conActiveLinkNode;
        window.conLinkStyleDismiss();
        if (node && typeof conDeleteNode === 'function') {
          conDeleteNode(node.id);
        }
      };

      // ── Unified Add / Edit Link Modal ──────────────────────────────
      var _conLinkModalCanvasPageFilter = 'all';
      var _conLinkModalCanvasFilter = '';
      var _conLinkModalBoardPath = '';
      var _conLinkModalDocPath = '';
      var _conLinkModalBoardFilter = '';
      var _conLinkModalDocFilter = '';
      var _conLinkModalBoardRawItems = [];
      var _conLinkModalDocRawItems = [];

      window.conOpenLinkEditModal = async function (node) {
        if (typeof conCtxClose === 'function') conCtxClose();
        else if (typeof window.conCtxClose === 'function') window.conCtxClose();
        if (typeof window.conBoardCtxClose === 'function') window.conBoardCtxClose();
        if (typeof window.conLinkStyleDismiss === 'function') window.conLinkStyleDismiss();

        _conLinkModalTargetNode = node || null;
        var modal = document.getElementById('con-link-edit-modal');
        if (!modal) return;

        var titleHeader = document.getElementById('cle-modal-header-title');
        if (titleHeader) {
          titleHeader.textContent = node ? (typeof i18n !== 'undefined' ? i18n.t('conLinkEditModalTitle') || 'Edit Link / Bookmark' : 'Edit Link / Bookmark') : (typeof i18n !== 'undefined' ? i18n.t('conLinkAddModalTitle') || 'Add Link / Bookmark' : 'Add Link / Bookmark');
        }

        const initialType = (node && node.linkType) || 'web';
        window.conLinkModalSwitchTab(initialType);

        var webUrlInput = document.getElementById('cle-web-url');
        var webTitleInput = document.getElementById('cle-web-title');
        var webTagsInput = document.getElementById('cle-web-tags');

        if (webUrlInput) webUrlInput.value = (node && node.linkType === 'web' && node.linkTarget) ? node.linkTarget : '';
        if (webTitleInput) webTitleInput.value = (node && node.linkTitle) ? node.linkTitle : (node && node.baseWord ? node.baseWord : '');
        if (webTagsInput) webTagsInput.value = (node && Array.isArray(node.tags)) ? node.tags.join(', ') : '';

        // Initialize folder navigation paths
        if (node && node.linkType === 'board' && node.linkTarget) {
          const slash = node.linkTarget.lastIndexOf('/');
          _conLinkModalBoardPath = (slash > -1) ? node.linkTarget.slice(0, slash) : '';
        } else {
          _conLinkModalBoardPath = '';
        }

        if (node && node.linkType === 'doc' && node.linkTarget) {
          const slash = node.linkTarget.lastIndexOf('/');
          _conLinkModalDocPath = (slash > -1) ? node.linkTarget.slice(0, slash) : '';
        } else {
          _conLinkModalDocPath = '';
        }

        _conLinkModalBoardFilter = '';
        _conLinkModalDocFilter = '';
        var bFilter = document.getElementById('cle-board-filter');
        if (bFilter) bFilter.value = '';
        var dFilter = document.getElementById('cle-doc-filter');
        if (dFilter) dFilter.value = '';

        _conLinkModalCanvasPageFilter = 'all';
        _conLinkModalCanvasFilter = '';
        var cFilter = document.getElementById('cle-canvas-filter');
        if (cFilter) cFilter.value = '';

        _populateLinkModalLists(node);
        modal.style.display = 'flex';
        if (initialType === 'web' && webUrlInput) {
          setTimeout(() => { try { webUrlInput.focus(); webUrlInput.select(); } catch (_) {} }, 30);
        }
      };

      window.conCloseLinkEditModal = function () {
        var modal = document.getElementById('con-link-edit-modal');
        if (modal) modal.style.display = 'none';
        _conLinkModalTargetNode = null;
      };

      window.conLinkModalSwitchTab = function (tabKey) {
        _conLinkModalActiveTab = tabKey;
        var tabBtns = document.querySelectorAll('.cle-tab-btn');
        tabBtns.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tab === tabKey);
        });
        var panels = document.querySelectorAll('.cle-tab-panel');
        panels.forEach(p => {
          p.style.display = (p.dataset.tab === tabKey) ? 'block' : 'none';
        });
      };

      function escHtml(s) {
        if (!s) return '';
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function _updateBreadcrumbs(type, curPath) {
        const bcContainer = document.getElementById(`cle-${type}-breadcrumbs`);
        const upBtn = document.getElementById(`cle-${type}-up-btn`);
        if (!bcContainer) return;

        if (upBtn) {
          upBtn.disabled = !curPath;
        }

        const rootLabel = typeof i18n !== 'undefined' ? i18n.t('conLinkBreadcrumbRoot') || 'Root' : 'Root';
        const folderIcon = '<img src="../assets/icons/folder.svg" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;" alt="" />';

        if (!curPath) {
          bcContainer.innerHTML = `<span class="cle-crumb-current">${folderIcon}${escHtml(rootLabel)}</span>`;
          return;
        }

        const parts = curPath.split('/').filter(Boolean);
        let html = `<span class="cle-crumb-link" data-nav-type="${escHtml(type)}" data-nav-path="" onclick="conLinkModalNavToPath(this.dataset.navType, this.dataset.navPath)">${folderIcon}${escHtml(rootLabel)}</span>`;

        let cumPath = '';
        parts.forEach((p, idx) => {
          cumPath = cumPath ? (cumPath + '/' + p) : p;
          html += ` <span style="opacity:0.4;">/</span> `;
          if (idx === parts.length - 1) {
            html += `<span class="cle-crumb-current">${escHtml(p)}</span>`;
          } else {
            const thisPath = cumPath;
            html += `<span class="cle-crumb-link" data-nav-type="${escHtml(type)}" data-nav-path="${escHtml(thisPath)}" onclick="conLinkModalNavToPath(this.dataset.navType, this.dataset.navPath)">${escHtml(p)}</span>`;
          }
        });

        bcContainer.innerHTML = html;
      }

      window.conLinkCanvasFilter = function (query) {
        _conLinkModalCanvasFilter = (query || '').toLowerCase().trim();
        _renderCanvasList(_conLinkModalTargetNode);
      };

      window.conLinkCanvasSwitchPage = function (pageKey) {
        _conLinkModalCanvasPageFilter = pageKey;
        var bar = document.getElementById('cle-canvas-page-bar');
        if (bar) {
          var btns = bar.querySelectorAll('.cle-page-filter-btn');
          btns.forEach(b => {
            b.classList.toggle('active', b.dataset.page === String(pageKey));
          });
        }
        _renderCanvasList(_conLinkModalTargetNode);
      };

      function _populateCanvasList(activeNode) {
        var pageBar = document.getElementById('cle-canvas-page-bar');
        var curPageIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : ((typeof window.conCurrentPageIndex === 'number') ? window.conCurrentPageIndex : 0);
        var totalPages = 1;
        if (typeof conGetTotalPages === 'function') {
          totalPages = Math.max(1, conGetTotalPages());
        } else if (typeof conPageSnapshots !== 'undefined' && Array.isArray(conPageSnapshots)) {
          totalPages = Math.max(1, conPageSnapshots.length);
        }

        if (pageBar) {
          if (totalPages <= 1) {
            pageBar.style.display = 'none';
            pageBar.innerHTML = '';
          } else {
            pageBar.style.display = 'flex';
            var allLabel = typeof i18n !== 'undefined' ? i18n.t('conLinkAllPages') || 'All Pages' : 'All Pages';
            var pageLabel = typeof i18n !== 'undefined' ? i18n.t('conLinkPageLabel') || 'Page' : 'Page';
            var curSuffix = typeof i18n !== 'undefined' ? i18n.t('conLinkCurrentPage') || 'current' : 'current';

            var bHtml = `<button type="button" class="cle-page-filter-btn ${_conLinkModalCanvasPageFilter === 'all' ? 'active' : ''}" data-page="all" onclick="conLinkCanvasSwitchPage('all')">${escHtml(allLabel)}</button>`;
            for (var p = 0; p < totalPages; p++) {
              var isCur = (p === curPageIdx);
              var label = `${escHtml(pageLabel)} ${p + 1}${isCur ? ' (' + escHtml(curSuffix) + ')' : ''}`;
              var isActive = (_conLinkModalCanvasPageFilter === String(p));
              bHtml += `<button type="button" class="cle-page-filter-btn ${isActive ? 'active' : ''}" data-page="${p}" onclick="conLinkCanvasSwitchPage('${p}')">${label}</button>`;
            }
            pageBar.innerHTML = bHtml;
          }
        }

        _renderCanvasList(activeNode);
      }

      function _renderCanvasList(activeNode) {
        var canvasList = document.getElementById('cle-canvas-list');
        if (!canvasList) return;

        var curPageIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : ((typeof window.conCurrentPageIndex === 'number') ? window.conCurrentPageIndex : 0);
        var totalPages = 1;
        if (typeof conGetTotalPages === 'function') {
          totalPages = Math.max(1, conGetTotalPages());
        } else if (typeof conPageSnapshots !== 'undefined' && Array.isArray(conPageSnapshots)) {
          totalPages = Math.max(1, conPageSnapshots.length);
        }

        // Keep current page snapshot up to date if available
        if (typeof conBuildPageSnapshot === 'function' && typeof conPageSnapshots !== 'undefined' && Array.isArray(conPageSnapshots)) {
          conPageSnapshots[curPageIdx] = conBuildPageSnapshot();
        }

        var filter = (_conLinkModalCanvasFilter || '').toLowerCase().trim();
        var selectedPage = _conLinkModalCanvasPageFilter; // 'all' or string page index

        var pagesData = [];
        for (var p = 0; p < totalPages; p++) {
          var nodes = [];
          var notes = [];
          if (p === curPageIdx) {
            nodes = (typeof window.conGetNodes === 'function') ? window.conGetNodes() : (window.conNodes || []);
            notes = (typeof window.conGetNotes === 'function') ? window.conGetNotes() : (window.conNotes || []);
          } else if (typeof conPageSnapshots !== 'undefined' && conPageSnapshots && conPageSnapshots[p]) {
            nodes = conPageSnapshots[p].nodes || [];
            notes = conPageSnapshots[p].notes || [];
          }
          pagesData.push({ pageIndex: p, nodes: nodes, notes: notes });
        }

        var itemsHtml = '';
        var matchCount = 0;

        pagesData.forEach(pData => {
          var pIdx = pData.pageIndex;
          if (selectedPage !== 'all' && String(pIdx) !== String(selectedPage)) return;

          var pageItemsHtml = '';
          var isCurPage = (pIdx === curPageIdx);

          pData.nodes.forEach(n => {
            if (!n) return;
            if (activeNode && n.id === activeNode.id && isCurPage) return;
            var title = n.baseWord || (n.el && n.el.textContent.trim()) || `Node ${n.id}`;
            if (filter && !title.toLowerCase().includes(filter) && !String(n.id).includes(filter)) return;

            var targetVal = `page:${pIdx}:node:${n.id}`;
            var legacyVal = `node:${n.id}`;
            var isSel = (activeNode && (activeNode.linkTarget === targetVal || (isCurPage && activeNode.linkTarget === legacyVal)));
            var subBadge = (totalPages > 1) ? `Node • P.${pIdx + 1}` : 'Node';

            pageItemsHtml += `<label class="cle-item-row" style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #ddd;cursor:pointer;${isSel ? 'background:#fff9e6;' : ''}">
              <input type="radio" name="cle-canvas-target" value="${escHtml(targetVal)}" data-title="${escHtml(title)}" data-subtitle="${escHtml(subBadge)}" ${isSel ? 'checked' : ''} />
              <img src="../assets/icons/arrow-right.svg" style="width:14px;height:14px;opacity:0.75;" alt="" />
              <strong style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(title)}</strong>
              <span style="font-size:0.72rem;font-weight:700;color:#64748b;background:#e2e8f0;border:1px solid #cbd5e1;padding:1px 6px;border-radius:10px;">${escHtml(subBadge)}</span>
            </label>`;
            matchCount++;
          });

          pData.notes.forEach(nt => {
            if (!nt) return;
            var text = nt.text || nt.content || 'Note';
            var firstLine = text.split('\n')[0].replace(/^#+\s*/, '').trim() || `Note ${nt.id}`;
            if (filter && !text.toLowerCase().includes(filter) && !String(nt.id).includes(filter)) return;

            var targetVal = `page:${pIdx}:note:${nt.id}`;
            var legacyVal = `note:${nt.id}`;
            var isSel = (activeNode && (activeNode.linkTarget === targetVal || (isCurPage && activeNode.linkTarget === legacyVal)));
            var subBadge = (totalPages > 1) ? `Note • P.${pIdx + 1}` : 'Note';

            pageItemsHtml += `<label class="cle-item-row" style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #ddd;cursor:pointer;${isSel ? 'background:#fff9e6;' : ''}">
              <input type="radio" name="cle-canvas-target" value="${escHtml(targetVal)}" data-title="${escHtml(firstLine)}" data-subtitle="${escHtml(subBadge)}" ${isSel ? 'checked' : ''} />
              <img src="../assets/icons/file-text.svg" style="width:14px;height:14px;opacity:0.75;" alt="" />
              <strong style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(firstLine)}</strong>
              <span style="font-size:0.72rem;font-weight:700;color:#475569;background:#e2e8f0;border:1px solid #cbd5e1;padding:1px 6px;border-radius:10px;">${escHtml(subBadge)}</span>
            </label>`;
            matchCount++;
          });

          if (pageItemsHtml) {
            if (totalPages > 1 && selectedPage === 'all') {
              var pageHeaderLabel = (typeof i18n !== 'undefined' ? i18n.t('conLinkPageLabel') || 'Page' : 'Page') + ' ' + (pIdx + 1) + (isCurPage ? ' (' + (typeof i18n !== 'undefined' ? i18n.t('conLinkCurrentPage') || 'current' : 'current') + ')' : '');
              itemsHtml += `<div style="padding:4px 8px;background:#f1f5f9;border-bottom:1.5px solid #cbd5e1;font-size:0.72rem;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:6px;">
                <img src="../assets/icons/page-number.svg" style="width:13px;height:13px;opacity:0.7;" alt="" />
                <span>${escHtml(pageHeaderLabel)}</span>
              </div>`;
            }
            itemsHtml += pageItemsHtml;
          }
        });

        if (!matchCount) {
          itemsHtml = '<div style="padding:14px;font-size:0.84rem;opacity:0.6;text-align:center;">No matching elements found on this board.</div>';
        }

        canvasList.innerHTML = itemsHtml;
      }

      window.conLinkModalNavUp = function (type) {
        if (type === 'board') {
          if (!_conLinkModalBoardPath) return;
          const parts = _conLinkModalBoardPath.split('/');
          parts.pop();
          _conLinkModalBoardPath = parts.join('/');
          _populateBoardList(_conLinkModalTargetNode);
        } else if (type === 'doc') {
          if (!_conLinkModalDocPath) return;
          const parts = _conLinkModalDocPath.split('/');
          parts.pop();
          _conLinkModalDocPath = parts.join('/');
          _populateDocList(_conLinkModalTargetNode);
        }
      };

      window.conLinkModalNavEnter = function (type, folderName) {
        if (type === 'board') {
          _conLinkModalBoardPath = _conLinkModalBoardPath ? (_conLinkModalBoardPath + '/' + folderName) : folderName;
          _populateBoardList(_conLinkModalTargetNode);
        } else if (type === 'doc') {
          _conLinkModalDocPath = _conLinkModalDocPath ? (_conLinkModalDocPath + '/' + folderName) : folderName;
          _populateDocList(_conLinkModalTargetNode);
        }
      };

      window.conLinkModalNavToPath = function (type, targetPath) {
        if (type === 'board') {
          _conLinkModalBoardPath = targetPath || '';
          _populateBoardList(_conLinkModalTargetNode);
        } else if (type === 'doc') {
          _conLinkModalDocPath = targetPath || '';
          _populateDocList(_conLinkModalTargetNode);
        }
      };

      window.conLinkModalFilter = function (type, query) {
        if (type === 'board') {
          _conLinkModalBoardFilter = query || '';
          _renderBoardList(_conLinkModalTargetNode);
        } else if (type === 'doc') {
          _conLinkModalDocFilter = query || '';
          _renderDocList(_conLinkModalTargetNode);
        }
      };

      async function _populateBoardList(activeNode) {
        const boardList = document.getElementById('cle-board-list');
        if (!boardList) return;

        _updateBreadcrumbs('board', _conLinkModalBoardPath);
        boardList.innerHTML = '<div style="padding:10px;font-size:0.82rem;opacity:0.6;">Loading mindmaps...</div>';
        _conLinkModalBoardRawItems = [];

        if (window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron()) {
          try {
            let res = await Desktop.listByPath('mindmaps', _conLinkModalBoardPath, {
              extensions: ['.json', '.cstz', '.js'],
              recursive: false,
              includeDirectories: true
            });
            let files = res?.files || (Array.isArray(res) ? res : []);

            if (files.length === 0 && !_conLinkModalBoardPath) {
              const fb = await Desktop.listByPath('user', 'constellations', {
                extensions: ['.json', '.cstz', '.js'],
                recursive: false,
                includeDirectories: true
              });
              if (fb?.files?.length) files = fb.files;
            }

            _conLinkModalBoardRawItems = files;
          } catch (err) {
            console.warn('[Board] Error listing mindmaps:', err);
          }
        }

        _renderBoardList(activeNode);
      }

      function _renderBoardList(activeNode) {
        const boardList = document.getElementById('cle-board-list');
        if (!boardList) return;

        const files = _conLinkModalBoardRawItems || [];
        const filter = (_conLinkModalBoardFilter || '').toLowerCase().trim();

        const ignoredDirs = new Set(['history', 'node_modules', '.git', 'trash', 'backups', '.cache', '.system_generated']);
        const dirs = [];
        const mindmaps = [];

        files.forEach(f => {
          if (!f) return;
          const name = (typeof f === 'string') ? f : (f.filename || f.name || '');
          if (!name || name.startsWith('.')) return;

          const isDir = !!(f.isDirectory || (typeof f !== 'string' && f.type === 'directory'));
          if (isDir) {
            if (ignoredDirs.has(name.toLowerCase())) return;
            if (filter && !name.toLowerCase().includes(filter)) return;
            dirs.push({ name, isDir: true, raw: f });
          } else {
            if (/\.(v\d{8}-\d{6}|tmp|bak)\./i.test(name)) return;
            if (filter && !name.toLowerCase().includes(filter)) return;
            mindmaps.push({ name, isDir: false, raw: f });
          }
        });

        const sortedDirs = dirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        const sortedFiles = mindmaps.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        let bHtml = '';

        if (_conLinkModalBoardPath) {
          const upText = typeof i18n !== 'undefined' ? i18n.t('conLinkParentFolder') || 'Parent folder' : 'Parent folder';
          bHtml += `<div class="cle-folder-row" onclick="conLinkModalNavUp('board')" style="background:#f8fafc;font-weight:700;color:#475569;">
            <img src="../assets/icons/folder.svg" style="width:15px;height:15px;opacity:0.7;" alt="" />
            <span>.. (${escHtml(upText)})</span>
            <img src="../assets/icons/arrow-up.svg" style="width:12px;height:12px;opacity:0.6;margin-left:auto;" alt="" />
          </div>`;
        }

        sortedDirs.forEach(d => {
          bHtml += `<div class="cle-folder-row" data-nav-type="board" data-nav-path="${escHtml(d.name)}" onclick="conLinkModalNavEnter(this.dataset.navType, this.dataset.navPath)" title="Open folder">
            <img src="../assets/icons/folder.svg" style="width:16px;height:16px;" alt="" />
            <strong>${escHtml(d.name)}</strong>
            <span style="font-size:0.7rem;font-weight:700;color:#64748b;margin-left:auto;background:#e2e8f0;border:1px solid #cbd5e1;padding:1px 6px;border-radius:10px;display:inline-flex;align-items:center;gap:3px;">Folder <img src="../assets/icons/arrow-right.svg" style="width:10px;height:10px;opacity:0.75;" alt="" /></span>
          </div>`;
        });

        sortedFiles.forEach(f => {
          const fname = f.name;
          const fullRel = _conLinkModalBoardPath ? (_conLinkModalBoardPath + '/' + fname) : fname;
          const cleanTitle = fname.replace(/\.(json|cstz|js)$/i, '');
          const isSel = !!(activeNode && (activeNode.linkTarget === fullRel || activeNode.linkTarget === fname));
          const ext = fname.split('.').pop() || 'json';

          bHtml += `<label class="cle-item-row" style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #ddd;cursor:pointer;${isSel ? 'background:#fff9e6;' : ''}">
            <input type="radio" name="cle-board-target" value="${escHtml(fullRel)}" data-title="${escHtml(cleanTitle)}" ${isSel ? 'checked' : ''} />
            <img src="../assets/icons/board.svg" style="width:15px;height:15px;opacity:0.8;" alt="" />
            <strong>${escHtml(cleanTitle)}</strong>
            <span style="font-size:0.75rem;opacity:0.6;margin-left:auto;">.${escHtml(ext)}</span>
          </label>`;
        });

        if (!sortedDirs.length && !sortedFiles.length) {
          const emptyText = typeof i18n !== 'undefined' ? i18n.t('conLinkEmptyFolder') || 'This folder is empty.' : 'This folder is empty.';
          bHtml += `<div style="padding:12px;font-size:0.82rem;opacity:0.6;text-align:center;">${escHtml(emptyText)}</div>`;
        }

        boardList.innerHTML = bHtml;
      }

      async function _populateDocList(activeNode) {
        const docList = document.getElementById('cle-doc-list');
        if (!docList) return;

        _updateBreadcrumbs('doc', _conLinkModalDocPath);
        docList.innerHTML = '<div style="padding:10px;font-size:0.82rem;opacity:0.6;">Loading documents...</div>';
        _conLinkModalDocRawItems = [];

        if (window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron()) {
          try {
            let res = await Desktop.listByPath('docEditorDocs', _conLinkModalDocPath, {
              extensions: ['.md', '.markdown'],
              recursive: false,
              includeDirectories: true
            });
            let files = res?.files || (Array.isArray(res) ? res : []);

            if (files.length === 0 && !_conLinkModalDocPath) {
              const fb = await Desktop.listByPath('user', 'doceditor', {
                extensions: ['.md', '.markdown'],
                recursive: false,
                includeDirectories: true
              });
              if (fb?.files?.length) files = fb.files;
            }

            _conLinkModalDocRawItems = files;
          } catch (err) {
            console.warn('[Board] Error listing documents:', err);
          }
        }

        _renderDocList(activeNode);
      }

      function _renderDocList(activeNode) {
        const docList = document.getElementById('cle-doc-list');
        if (!docList) return;

        const files = _conLinkModalDocRawItems || [];
        const filter = (_conLinkModalDocFilter || '').toLowerCase().trim();

        const ignoredDirs = new Set(['history', 'node_modules', '.git', 'trash', 'backups', '.cache', '.system_generated']);
        const dirs = [];
        const docs = [];

        files.forEach(f => {
          if (!f) return;
          const name = (typeof f === 'string') ? f : (f.filename || f.name || '');
          if (!name || name.startsWith('.')) return;

          const isDir = !!(f.isDirectory || (typeof f !== 'string' && f.type === 'directory'));
          if (isDir) {
            if (ignoredDirs.has(name.toLowerCase())) return;
            if (filter && !name.toLowerCase().includes(filter)) return;
            dirs.push({ name, isDir: true, raw: f });
          } else {
            if (/\.(v\d{8}-\d{6}|tmp|bak)\./i.test(name)) return;
            if (filter && !name.toLowerCase().includes(filter)) return;
            docs.push({ name, isDir: false, raw: f });
          }
        });

        const sortedDirs = dirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        const sortedFiles = docs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        let dHtml = '';

        if (_conLinkModalDocPath) {
          const upText = typeof i18n !== 'undefined' ? i18n.t('conLinkParentFolder') || 'Parent folder' : 'Parent folder';
          dHtml += `<div class="cle-folder-row" onclick="conLinkModalNavUp('doc')" style="background:#f8fafc;font-weight:700;color:#475569;">
            <img src="../assets/icons/folder.svg" style="width:15px;height:15px;opacity:0.7;" alt="" />
            <span>.. (${escHtml(upText)})</span>
            <img src="../assets/icons/arrow-up.svg" style="width:12px;height:12px;opacity:0.6;margin-left:auto;" alt="" />
          </div>`;
        }

        sortedDirs.forEach(d => {
          dHtml += `<div class="cle-folder-row" data-nav-type="doc" data-nav-path="${escHtml(d.name)}" onclick="conLinkModalNavEnter(this.dataset.navType, this.dataset.navPath)" title="Open folder">
            <img src="../assets/icons/folder.svg" style="width:16px;height:16px;" alt="" />
            <strong>${escHtml(d.name)}</strong>
            <span style="font-size:0.7rem;font-weight:700;color:#64748b;margin-left:auto;background:#e2e8f0;border:1px solid #cbd5e1;padding:1px 6px;border-radius:10px;display:inline-flex;align-items:center;gap:3px;">Folder <img src="../assets/icons/arrow-right.svg" style="width:10px;height:10px;opacity:0.75;" alt="" /></span>
          </div>`;
        });

        sortedFiles.forEach(f => {
          const fname = f.name;
          const fullRel = _conLinkModalDocPath ? (_conLinkModalDocPath + '/' + fname) : fname;
          const cleanTitle = fname.replace(/\.(md|markdown)$/i, '');
          const isSel = !!(activeNode && (activeNode.linkTarget === fullRel || activeNode.linkTarget === fname));

          dHtml += `<label class="cle-item-row" style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #ddd;cursor:pointer;${isSel ? 'background:#fff9e6;' : ''}">
            <input type="radio" name="cle-doc-target" value="${escHtml(fullRel)}" data-title="${escHtml(cleanTitle)}" ${isSel ? 'checked' : ''} />
            <img src="../assets/icons/document-editor.svg" style="width:15px;height:15px;opacity:0.8;" alt="" />
            <strong>${escHtml(cleanTitle)}</strong>
            <span style="font-size:0.75rem;opacity:0.6;margin-left:auto;">.md</span>
          </label>`;
        });

        if (!sortedDirs.length && !sortedFiles.length) {
          const emptyText = typeof i18n !== 'undefined' ? i18n.t('conLinkEmptyFolder') || 'This folder is empty.' : 'This folder is empty.';
          dHtml += `<div style="padding:12px;font-size:0.82rem;opacity:0.6;text-align:center;">${escHtml(emptyText)}</div>`;
        }

        docList.innerHTML = dHtml;
      }

      async function _populateLinkModalLists(activeNode) {
        // 1. Canvas Elements List (Multi-page aware)
        _populateCanvasList(activeNode);

        // 2. Mindmaps List (with folder navigation)
        _populateBoardList(activeNode);

        // 3. Document Editor Docs List (with folder navigation)
        _populateDocList(activeNode);

        // 4. Suite Tool List (Classes & Evaluators)
        const suiteList = document.getElementById('cle-suite-list');
        if (suiteList) {
          let sHtml = '';
          if (typeof window.CLASS_GROUPS !== 'undefined') {
            Object.entries(window.CLASS_GROUPS).forEach(([cid, cls]) => {
              if (!cls) return;
              const cName = cls.name || cid;
              const urn = `cmt:class:${cid}`;
              const isSel = (activeNode && activeNode.linkUrn === urn);
              sHtml += `<label class="cle-item-row" style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #ddd;cursor:pointer;"><input type="radio" name="cle-suite-target" value="${urn}" data-title="${escHtml(cName)}" data-type="grades" ${isSel ? 'checked' : ''} /> <strong>${escHtml(cName)}</strong> <span style="font-size:0.75rem;opacity:0.7;">(Class Grade Sheet)</span></label>`;
            });
          }
          suiteList.innerHTML = sHtml || '<div style="padding:10px;font-size:0.85rem;opacity:0.6;">No class groups found.</div>';
        }
      }

      window.conSaveLinkEditModal = async function () {
        const tab = _conLinkModalActiveTab;
        let lType = 'web';
        let target = '';
        let title = '';
        let subtitle = '';
        let urn = '';
        let tags = [];

        let bookmarkId = (_conLinkModalTargetNode && _conLinkModalTargetNode.bookmarkId) || null;

        if (tab === 'web') {
          lType = 'web';
          const uInput = document.getElementById('cle-web-url');
          const tInput = document.getElementById('cle-web-title');
          const tagsInput = document.getElementById('cle-web-tags');
          target = uInput ? uInput.value.trim() : '';
          if (!target) {
            if (typeof showToast === 'function') showToast('Please enter a URL', true);
            return;
          }
          if (/^(?:javascript|vbscript|data):/i.test(target)) {
            if (typeof showToast === 'function') showToast('Blocked unsafe URL scheme', true);
            return;
          }
          if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
          let domain = '';
          try { domain = new URL(target).hostname.replace(/^www\./i, ''); } catch (_) {}
          title = (tInput && tInput.value.trim()) ? tInput.value.trim() : (domain || target);
          subtitle = domain;
          if (tagsInput && tagsInput.value.trim()) {
            const seenTags = new Set();
            tagsInput.value.split(/[,\s]+/).forEach(raw => {
              const clean = raw.trim();
              if (!clean || clean === '#') return;
              const norm = (clean.startsWith('#') ? clean : '#' + clean).toLowerCase();
              if (!seenTags.has(norm)) {
                seenTags.add(norm);
                tags.push(norm);
              }
            });
          }
          const bm = await _conSyncWebBookmark(title, target, tags, bookmarkId);
          if (bm && bm.id) {
            bookmarkId = bm.id;
            urn = 'cmt:bookmark:' + bm.id;
          }
        } else if (tab === 'canvas') {
          lType = 'canvas';
          const checked = document.querySelector('input[name="cle-canvas-target"]:checked');
          if (!checked) {
            if (typeof showToast === 'function') showToast('Please select a canvas element', true);
            return;
          }
          target = checked.value;
          title = checked.dataset.title || 'Canvas Element';
          subtitle = checked.dataset.subtitle || (target.includes(':node:') || target.startsWith('node:') ? 'Board Node' : 'Board Note');
        } else if (tab === 'board') {
          lType = 'board';
          const checked = document.querySelector('input[name="cle-board-target"]:checked');
          if (!checked) {
            if (typeof showToast === 'function') showToast('Please select a mindmap file', true);
            return;
          }
          target = checked.value;
          const fname = target.split('/').pop();
          title = checked.dataset.title || fname.replace(/\.(json|cstz|js)$/i, '');
          subtitle = target.includes('/') ? ('Mindmap • ' + target) : 'Mindmap Session';
          urn = 'cmt:board:' + target;
        } else if (tab === 'doc') {
          lType = 'doc';
          const checked = document.querySelector('input[name="cle-doc-target"]:checked');
          if (!checked) {
            if (typeof showToast === 'function') showToast('Please select a document', true);
            return;
          }
          target = checked.value;
          const fname = target.split('/').pop();
          title = checked.dataset.title || fname.replace(/\.(md|markdown)$/i, '');
          subtitle = target.includes('/') ? ('Document • ' + target) : 'Document Editor';
          urn = 'cmt:doc:' + target;
        } else if (tab === 'suite') {
          const checked = document.querySelector('input[name="cle-suite-target"]:checked');
          if (!checked) {
            if (typeof showToast === 'function') showToast('Please select a suite item', true);
            return;
          }
          urn = checked.value;
          target = urn;
          title = checked.dataset.title || 'Suite Item';
          lType = checked.dataset.type || 'suite';
          subtitle = 'Grade Sheet';
        }

        if (_conLinkModalTargetNode) {
          const node = _conLinkModalTargetNode;
          node.isRandom = false;
          node.isTimer = false;
          node.isSound = false;
          node.isVideo = false;
          node.isLink = true;
          node.linkType = lType;
          node.linkTarget = target;
          node.linkTitle = title;
          node.linkSubTitle = subtitle;
          node.linkUrn = urn;
          node.bookmarkId = (lType === 'web') ? bookmarkId : null;
          node.tags = tags;
          node.baseWord = title;
          if (node.el) node.el.dataset.baseWord = title;
          conRenderNodeLabel(node);
          if (typeof conPushUndo === 'function') conPushUndo();
          if (typeof showToast === 'function') showToast('Link updated');
        } else {
          const brd = board();
          const cx = window._boardCtxX != null ? window._boardCtxX : (brd ? (brd.scrollLeft + brd.clientWidth / 2) : 200);
          const cy = window._boardCtxY != null ? window._boardCtxY : (brd ? (brd.scrollTop + brd.clientHeight / 2) : 200);
          conAddLinkNodeAt({
            title,
            linkType: lType,
            target,
            subtitle,
            urn,
            bookmarkId: (lType === 'web') ? bookmarkId : null,
            tags
          }, cx, cy);
          if (typeof showToast === 'function') showToast('Link node created');
        }

        window.conCloseLinkEditModal();
      };

      window.conBoardCtxAddLink = function () {
        if (typeof window.conOpenLinkEditModal === 'function') {
          window.conOpenLinkEditModal(null);
        }
      };

      window.conCtxOpenLinkEditModal = function () {
        const allNodes = (typeof window.conGetNodes === 'function')
          ? window.conGetNodes()
          : ((typeof conNodes !== 'undefined') ? conNodes : []);
        const nodeId = (window.conGetCtxNodeId && window.conGetCtxNodeId())
          || (typeof window.conCtxNodeId !== 'undefined' ? window.conCtxNodeId : null)
          || (typeof conCtxNodeId !== 'undefined' ? conCtxNodeId : null)
          || (window.conGetSelected ? window.conGetSelected() : (typeof conSelected !== 'undefined' ? conSelected : null));
        const node = allNodes.find(n => n && (n.id === nodeId || String(n.id) === String(nodeId)));
        if (typeof conCtxClose === 'function') conCtxClose();
        else if (typeof window.conCtxClose === 'function') window.conCtxClose();
        if (node && typeof window.conOpenLinkEditModal === 'function') {
          window.conOpenLinkEditModal(node);
        }
      };

      // ---- Multi-node layout preferences & state ----
      let _conBoardLayoutPrefBoard = localStorage.getItem('con-board-layout-pref-board') || 'horizontal';
      let _conBoardLayoutPrefConnected = localStorage.getItem('con-board-layout-pref-connected') || 'circle';
      let _conCurrentCtxLayout = 'horizontal';

      window.conGetBoardCtxLayout = function () {
        return _conCurrentCtxLayout || (_pendingConnectSrcId ? _conBoardLayoutPrefConnected : _conBoardLayoutPrefBoard);
      };

      window.conSetBoardCtxLayout = function (layoutKey) {
        if (!['horizontal', 'vertical', 'circle', 'cluster'].includes(layoutKey)) return;
        _conCurrentCtxLayout = layoutKey;
        if (_pendingConnectSrcId) {
          _conBoardLayoutPrefConnected = layoutKey;
          try { localStorage.setItem('con-board-layout-pref-connected', layoutKey); } catch (_) { }
        } else {
          _conBoardLayoutPrefBoard = layoutKey;
          try { localStorage.setItem('con-board-layout-pref-board', layoutKey); } catch (_) { }
        }
        const selector = document.getElementById('con-ctx-layout-selector');
        if (selector) {
          selector.querySelectorAll('.con-ctx-layout-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layout === layoutKey);
          });
        }
      };

      window.conSyncBoardCtxLayoutUi = function (isPendingSrc) {
        const layout = isPendingSrc ? (_conBoardLayoutPrefConnected || 'circle') : (_conBoardLayoutPrefBoard || 'horizontal');
        _conCurrentCtxLayout = layout;
        const selector = document.getElementById('con-ctx-layout-selector');
        if (selector) {
          selector.querySelectorAll('.con-ctx-layout-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layout === layout);
          });
        }
      };

      // Returns the nearest (x, y) that does not overlap any existing board node.
      // Clamped to canvas boundaries.
      function conFindFreePosition(x, y, excludeId) {
        const estW = 88, estH = 34, pad = 8;
        const brd = board();
        const bw = brd ? brd.clientWidth : 1200;
        const bh = brd ? brd.clientHeight : 800;

        function overlaps(tx, ty) {
          return conNodes.some(n => {
            if (excludeId && n.id === excludeId) return false;
            const nw = (n.el && n.el.offsetWidth) || 80;
            const nh = (n.el && n.el.offsetHeight) || 32;
            return !(tx + estW + pad <= n.x || tx >= n.x + nw + pad ||
              ty + estH + pad <= n.y || ty >= n.y + nh + pad);
          });
        }

        function clamp(tx, ty) {
          return {
            x: Math.max(4, Math.min(bw - estW - 4, tx)),
            y: Math.max(4, Math.min(bh - estH - 4, ty))
          };
        }

        const initial = clamp(x, y);
        if (!overlaps(initial.x, initial.y)) return initial;
        const step = Math.max(estW, estH) + pad;
        const golden = 2.39996323; // ~137.5° in radians
        for (let i = 1; i <= 60; i++) {
          const r = step * Math.sqrt(i);
          const tx = x + r * Math.cos(i * golden);
          const ty = y + r * Math.sin(i * golden);
          const clamped = clamp(tx, ty);
          if (!overlaps(clamped.x, clamped.y)) return clamped;
        }
        return initial;
      }

      // Probes outward from (x, y) strictly bounded within maxR of (origX, origY), clamped to canvas.
      function conFindFreePositionBounded(x, y, origX, origY, maxR, excludeId) {
        const estW = 88, estH = 34, pad = 8;
        const radiusLimit = Number.isFinite(maxR) && maxR > 0 ? maxR : 150;
        const brd = board();
        const bw = brd ? brd.clientWidth : 1200;
        const bh = brd ? brd.clientHeight : 800;

        function overlaps(tx, ty) {
          return conNodes.some(n => {
            if (excludeId && n.id === excludeId) return false;
            const nw = (n.el && n.el.offsetWidth) || 80;
            const nh = (n.el && n.el.offsetHeight) || 32;
            return !(tx + estW + pad <= n.x || tx >= n.x + nw + pad ||
              ty + estH + pad <= n.y || ty >= n.y + nh + pad);
          });
        }

        function clamp(tx, ty) {
          return {
            x: Math.max(4, Math.min(bw - estW - 4, tx)),
            y: Math.max(4, Math.min(bh - estH - 4, ty))
          };
        }

        const initial = clamp(x, y);
        if (!overlaps(initial.x, initial.y)) return initial;

        const golden = 2.39996323;
        const step = 20;
        let best = initial;
        for (let i = 1; i <= 60; i++) {
          const r = step * Math.sqrt(i);
          if (r > radiusLimit) break; // Strict radius constraint
          const tx = origX + r * Math.cos(i * golden) - estW / 2;
          const ty = origY + r * Math.sin(i * golden) - estH / 2;
          const clamped = clamp(tx, ty);
          const dist = Math.hypot(clamped.x + estW / 2 - origX, clamped.y + estH / 2 - origY);
          if (dist <= radiusLimit + 25) {
            if (!overlaps(clamped.x, clamped.y)) {
              return clamped;
            }
            best = clamped;
          }
        }
        return best;
      }

      // Determines accurate rendered width of a node with text before creation
      function conDetermineNodeWidth(text) {
        const brd = board();
        if (!brd) return 88;
        const clean = String(text || '').replace(/\s*\(\([^)]+\)\)\s*/, '').trim();
        if (!clean) return 88;
        let measurer = document.getElementById('con-node-width-measurer');
        if (!measurer) {
          measurer = document.createElement('div');
          measurer.id = 'con-node-width-measurer';
          measurer.className = 'con-node';
          measurer.style.cssText = 'position:absolute;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;z-index:-1;white-space:nowrap;display:inline-flex;padding:4px 9px;box-sizing:border-box;';
          brd.appendChild(measurer);
        }
        conApplyDefaultWordFontSize(measurer);
        if (window._bcNodeFontFamily) measurer.style.fontFamily = window._bcNodeFontFamily;
        measurer.textContent = clean;
        const measured = measurer.offsetWidth || 88;
        let extra = 12;
        if (typeof vocabBank !== 'undefined' && Array.isArray(vocabBank)) {
          const match = conFindDbEntry(clean);
          if (match) extra += 20;
        }
        return Math.max(72, measured + extra);
      }
      window.conDetermineNodeWidth = conDetermineNodeWidth;

      // Unified node layout computation keeping all new nodes within compact radius (140px-160px)
      function conComputeNodeLayout(opts) {
        const origin = opts.origin || { x: 100, y: 100 };
        const count = Math.max(1, opts.count || 1);
        const layout = opts.layout || 'horizontal';
        const isConnected = !!opts.isConnected;
        const srcNode = opts.srcNode || null;
        const maxR = Number.isFinite(opts.maxRadius) && opts.maxRadius > 0 ? opts.maxRadius : 150;
        const nodeW = opts.nodeW || 88;
        const nodeH = opts.nodeH || 34;
        const excludeId = opts.excludeId || (srcNode ? srcNode.id : null);
        const brd = board();
        const bw = brd ? brd.clientWidth : 1200;
        const bh = brd ? brd.clientHeight : 800;

        function clamp(tx, ty) {
          return {
            x: Math.max(4, Math.min(bw - nodeW - 4, tx)),
            y: Math.max(4, Math.min(bh - nodeH - 4, ty))
          };
        }

        const positions = [];

        // Single node
        if (count === 1) {
          const singleW = (Array.isArray(opts.nodeWidths) && opts.nodeWidths[0]) ? opts.nodeWidths[0] : nodeW;
          if (isConnected && srcNode) {
            const srcW = (srcNode.el && srcNode.el.offsetWidth) || 80;
            const srcH = (srcNode.el && srcNode.el.offsetHeight) || 32;
            const spaceRight = bw - (srcNode.x + srcW);
            const spaceLeft = srcNode.x;
            const spaceBottom = bh - (srcNode.y + srcH);

            let targetX, targetY;
            // Prefer right side if room, else pick side with most space
            if (spaceRight >= singleW + 28) {
              targetX = srcNode.x + srcW + 28;
              targetY = srcNode.y + (srcH - nodeH) / 2;
            } else if (spaceLeft >= singleW + 28) {
              targetX = srcNode.x - singleW - 28;
              targetY = srcNode.y + (srcH - nodeH) / 2;
            } else if (spaceBottom >= 60) {
              targetX = srcNode.x + (srcW - singleW) / 2;
              targetY = srcNode.y + srcH + 24;
            } else {
              targetX = srcNode.x + (srcW - singleW) / 2;
              targetY = srcNode.y - nodeH - 24;
            }
            const c = clamp(targetX, targetY);
            positions.push(conFindFreePositionBounded(c.x, c.y, origin.x, origin.y, maxR, excludeId));
          } else {
            const c = clamp(origin.x - singleW / 2, origin.y - nodeH / 2);
            positions.push(conFindFreePositionBounded(c.x, c.y, origin.x, origin.y, maxR, excludeId));
          }
          return positions;
        }

        // Multiple nodes (count >= 2)
        if (layout === 'circle') {
          const R = Math.min(150, Math.max(65, 45 + count * 8));
          let startAngle = -Math.PI / 2;
          if (isConnected) {
            if (origin.x < 180) startAngle = -Math.PI / 4;
            else if (origin.x > bw - 180) startAngle = 3 * Math.PI / 4;
          }
          for (let i = 0; i < count; i++) {
            const angle = startAngle + (2 * Math.PI * i / count);
            const nx = origin.x + R * Math.cos(angle) - nodeW / 2;
            const ny = origin.y + R * Math.sin(angle) - nodeH / 2;
            positions.push(clamp(nx, ny));
          }
        } else if (layout === 'horizontal') {
          // Always a single horizontal row, cleanly spaced and centered on origin without overlapping
          const gap = 16;
          const widths = (Array.isArray(opts.nodeWidths) && opts.nodeWidths.length === count)
            ? opts.nodeWidths.map(w => Math.max(60, Number(w) || nodeW))
            : (Array.isArray(opts.nodeTexts) && opts.nodeTexts.length === count)
              ? opts.nodeTexts.map(t => conDetermineNodeWidth(t))
              : Array(count).fill(nodeW);
          const totalW = widths.reduce((sum, w) => sum + w, 0) + (count - 1) * gap;
          let startX, rowY;
          if (isConnected && srcNode) {
            const srcW = (srcNode.el && srcNode.el.offsetWidth) || 80;
            const srcH = (srcNode.el && srcNode.el.offsetHeight) || 32;
            const spaceRight = bw - (srcNode.x + srcW);
            const spaceLeft = srcNode.x;
            const spaceBottom = bh - (srcNode.y + srcH);
            if (spaceRight >= totalW + 20) {
              startX = srcNode.x + srcW + 24;
              rowY = srcNode.y + (srcH - nodeH) / 2;
            } else if (spaceLeft >= totalW + 20) {
              startX = srcNode.x - totalW - 24;
              rowY = srcNode.y + (srcH - nodeH) / 2;
            } else if (spaceBottom >= nodeH + 20) {
              startX = origin.x - totalW / 2;
              rowY = srcNode.y + srcH + 24;
            } else {
              startX = origin.x - totalW / 2;
              rowY = srcNode.y - nodeH - 24;
            }
          } else {
            startX = origin.x - totalW / 2;
            rowY = origin.y - nodeH / 2;
          }
          if (startX < 4) startX = 4;
          if (startX + totalW > bw - 4) startX = Math.max(4, bw - totalW - 4);
          rowY = Math.max(4, Math.min(bh - nodeH - 4, rowY));
          let currentX = startX;
          for (let i = 0; i < count; i++) {
            positions.push({ x: currentX, y: rowY, width: widths[i], height: nodeH });
            currentX += widths[i] + gap;
          }
        } else if (layout === 'vertical') {
          // Always a single vertical column, cleanly spaced and centered on origin
          const gap = 8;
          const totalH = count * nodeH + (count - 1) * gap;
          let colX, startY;
          if (isConnected && srcNode) {
            const srcW = (srcNode.el && srcNode.el.offsetWidth) || 80;
            const srcH = (srcNode.el && srcNode.el.offsetHeight) || 32;
            const spaceRight = bw - (srcNode.x + srcW);
            const spaceLeft = srcNode.x;
            const spaceBottom = bh - (srcNode.y + srcH);
            if (spaceRight >= nodeW + 20) {
              colX = srcNode.x + srcW + 24;
              startY = origin.y - totalH / 2;
            } else if (spaceLeft >= nodeW + 20) {
              colX = srcNode.x - nodeW - 24;
              startY = origin.y - totalH / 2;
            } else if (spaceBottom >= totalH + 20) {
              colX = origin.x - nodeW / 2;
              startY = srcNode.y + srcH + 24;
            } else {
              colX = origin.x - nodeW / 2;
              startY = srcNode.y - totalH - 24;
            }
          } else {
            colX = origin.x - nodeW / 2;
            startY = origin.y - totalH / 2;
          }
          colX = Math.max(4, Math.min(bw - nodeW - 4, colX));
          if (startY < 4) startY = 4;
          if (startY + totalH > bh - 4) startY = Math.max(4, bh - totalH - 4);
          for (let i = 0; i < count; i++) {
            positions.push({ x: colX, y: startY + i * (nodeH + gap) });
          }
        } else {
          // 'cluster': compact spiral packing tightly constrained within maxR
          for (let i = 0; i < count; i++) {
            if (i === 0) {
              positions.push(clamp(origin.x - nodeW / 2, origin.y - nodeH / 2));
            } else {
              const golden = 2.39996323;
              const step = Math.min(32, 120 / Math.sqrt(count));
              const r = step * Math.sqrt(i);
              const nx = origin.x + r * Math.cos(i * golden) - nodeW / 2;
              const ny = origin.y + r * Math.sin(i * golden) - nodeH / 2;
              positions.push(clamp(nx, ny));
            }
          }
        }

        return positions;
      }

      window.conBoardCtxConfirm = async function () {
        const inp = document.getElementById('con-board-ctx-input');
        const raw = (inp && inp.value.trim()) || '';
        const pendingSrc = _pendingConnectSrcId; // snapshot before close clears it
        const pendingType = _pendingConnectType || 'none'; // snapshot arrow type
        const chosenLayout = conGetBoardCtxLayout();
        conBoardCtxClose();
        if (!raw) return;

        // Check for =random(a,b) expression FIRST (before timer check)
        if (!raw.includes(',,') && !raw.includes('--') && !raw.includes('>') && !raw.includes('<') && !raw.includes('++')) {
          const parsedRandom = conParseRandomSyntax(raw);
          if (parsedRandom) {
            conPushUndo();
            const _fp = conFindFreePositionBounded(_boardCtxX, _boardCtxY, _boardCtxX + 40, _boardCtxY + 18, 150, pendingSrc);
            const randomId = conAddRandomNodeAt(parsedRandom.min, parsedRandom.max, _fp.x, _fp.y);
            if (pendingSrc && randomId) {
              conAddEdge(pendingSrc, randomId, pendingType);
            }
            return;
          }
        }

        // Check if raw text is a single timer shorthand (e.g. 15', 15'30", 45")
        if (!raw.includes(',,') && !raw.includes('--') && !raw.includes('>') && !raw.includes('<') && !raw.includes('++')) {
          const parsedTimer = conParseTimerSyntax(raw);
          if (parsedTimer) {
            const choice = await conPromptTimerConversion(parsedTimer);
            if (!choice) return;
            if (choice === 'timer') {
              conPushUndo();
              const _fp = conFindFreePositionBounded(_boardCtxX, _boardCtxY, _boardCtxX + 40, _boardCtxY + 18, 150, pendingSrc);
              const timerId = conAddTimerNodeAt(parsedTimer.totalSec, _fp.x, _fp.y);
              if (pendingSrc && timerId) {
                conAddEdge(pendingSrc, timerId, pendingType);
              }
              return;
            }
          }
        }

        conPushUndo();
        const entries = raw.split(',,').map(w => w.trim()).filter(w => w.length > 0);
        let lastId = null;
        const allNewIds = [];

        // Compute base positions using the unified radius-constrained layout engine (compact radius <= 150px)
        let originX = _boardCtxX + 40;
        let originY = _boardCtxY + 18;
        let srcNodeObj = null;
        if (pendingSrc) {
          srcNodeObj = conNodes.find(n => n.id === pendingSrc);
          if (srcNodeObj) {
            const sw = (srcNodeObj.el && srcNodeObj.el.offsetWidth) || 80;
            const sh = (srcNodeObj.el && srcNodeObj.el.offsetHeight) || 32;
            originX = srcNodeObj.x + sw / 2;
            originY = srcNodeObj.y + sh / 2;
          }
        }

        const entryWidths = entries.map(e => conDetermineNodeWidth(e));
        const entryBasePositions = conComputeNodeLayout({
          origin: { x: originX, y: originY },
          count: entries.length,
          layout: chosenLayout,
          isConnected: !!pendingSrc,
          srcNode: srcNodeObj,
          maxRadius: 150,
          nodeWidths: entryWidths,
          nodeTexts: entries
        });

        entries.forEach((entry, entryIdx) => {
          // Unified parser supporting: <>, --, >>, <<, >, <, and ++ (for auto-grouped nodes)
          const SEP_RE = /\s*(<>|--|>>|<<|>|<)\s*/;
          const rawSegs = entry.split(SEP_RE); // [seg0, op0, seg1, op1, seg2, ...]
          const chainParts = []; // [{words:[], op: string|null}]
          for (let i = 0; i < rawSegs.length; i += 2) {
            const wordGroup = rawSegs[i].trim();
            const op = (i + 1 < rawSegs.length) ? rawSegs[i + 1] : null;
            let words = [];
            if (wordGroup.includes('++')) {
              const rawWords = wordGroup.split(/\+{2,}/).map(w => w.trim());
              if (rawWords.length > 1 && rawWords.every(w => w.length > 0)) {
                words = rawWords;
              }
            }
            if (!words.length && wordGroup) {
              words = [wordGroup];
            }
            if (words.length) chainParts.push({ words, op });
          }
          if (!chainParts.length) return;

          const chainAnchorIds = []; // first node id of each segment (for chaining)
          const chainNodeIds = []; // all node ids (for spread)

          const entryBase = entryBasePositions[entryIdx] || { x: originX, y: originY };
          const baseX = entryBase.x;
          const baseY = entryBase.y;

          let cumulativePartOffsetX = 0;
          chainParts.forEach((part, partIdx) => {
            const firstWord = part.words[0] || '';
            const measuredPartW = conDetermineNodeWidth(firstWord);
            const partOffsetX = (chosenLayout === 'horizontal' && chainParts.length > 1)
              ? cumulativePartOffsetX
              : partIdx * 20;
            const partOffsetY = (chosenLayout === 'horizontal' && chainParts.length > 1)
              ? 0
              : partIdx * 8;
            cumulativePartOffsetX += measuredPartW + 36;
            const unitNodeIds = [];

            part.words.forEach((word, wordIdx) => {
              const actMatch = word.match(/\(\(([^)]+)\)\)/);
              const actText = actMatch ? actMatch[1].trim() : null;
              const cleanWord = word.replace(/\s*\(\([^)]+\)\)\s*/, '').trim();
              if (!cleanWord && !actText) return;
              const ox = partOffsetX + wordIdx * 6;
              const oy = partOffsetY + wordIdx * (28 + 4);
              let nx = baseX + ox;
              let ny = baseY + oy;
              const brd = board();
              const bw = brd ? brd.clientWidth : 1200;
              const bh = brd ? brd.clientHeight : 800;
              nx = Math.max(4, Math.min(bw - 88 - 4, nx));
              ny = Math.max(4, Math.min(bh - 34 - 4, ny));
              const _fp = (partIdx > 0 || wordIdx > 0)
                ? (chosenLayout === 'horizontal' && chainParts.length > 1
                    ? { x: nx, y: ny }
                    : conFindFreePositionBounded(nx, ny, originX, originY, 150, pendingSrc))
                : { x: nx, y: ny };
              if (cleanWord) {
                if (cleanWord.includes('_')) {
                  // Underscore-separated phrase → seamless phrase group (one node per segment)
                  const phraseWords = cleanWord.split('_').map(w => w.trim()).filter(Boolean);
                  const phraseIds = conCreatePhraseGroup(phraseWords, _fp.x, _fp.y);
                  if (phraseIds.length) {
                    unitNodeIds.push(phraseIds[0]);
                    phraseIds.forEach(nid => { chainNodeIds.push(nid); allNewIds.push(nid); });
                    lastId = phraseIds[0];
                    if (actText && typeof window.conCreateNodeActForNode === 'function') {
                      const actId = window.conCreateNodeActForNode(phraseIds[phraseIds.length - 1], actText);
                      if (actId) allNewIds.push(actId);
                    }
                  }
                } else {
                  const newId = conAddWordAt(cleanWord, _fp.x, _fp.y, null);
                  if (newId) {
                    unitNodeIds.push(newId);
                    chainNodeIds.push(newId);
                    allNewIds.push(newId);
                    lastId = newId;
                    if (actText && typeof window.conCreateNodeActForNode === 'function') {
                      const actId = window.conCreateNodeActForNode(newId, actText);
                      if (actId) allNewIds.push(actId);
                    }
                  }
                }
              } else if (actText) {
                const actOnlyId = conAddWordAt(actText, _fp.x, _fp.y, null);
                if (actOnlyId) {
                  const actOnlyNode = conNodes.find(n => n.id === actOnlyId);
                  if (actOnlyNode) actOnlyNode.isNodeAct = true;
                  const actPreset = (typeof window.conGetNodeActPreset === 'function') ? window.conGetNodeActPreset() : null;
                  if (actPreset && actPreset.key && typeof window.conApplyNodePreset === 'function') {
                    window.conApplyNodePreset(actPreset.key, [actOnlyId], { skipUndo: true });
                  }
                  unitNodeIds.push(actOnlyId);
                  chainNodeIds.push(actOnlyId);
                  allNewIds.push(actOnlyId);
                  lastId = actOnlyId;
                }
              }
            });

            if (!unitNodeIds.length) return;

            // Group '++' words together
            if (unitNodeIds.length > 1) {
              const newGroup = conGroupCreate(unitNodeIds, baseX + partOffsetX, baseY + partOffsetY);
              if (newGroup) conSpreadGroup(newGroup);
            }

            chainAnchorIds.push({ id: unitNodeIds[0], op: part.op });
          });

          if (!chainAnchorIds.length) return;

          // Auto-connect to pending source node (from "Add Connected Word")
          if (pendingSrc) {
            conAddEdge(pendingSrc, chainAnchorIds[0].id, pendingType);
          }

          // Link chain segments in order using their preceding operator
          for (let i = 0; i < chainAnchorIds.length - 1; i++) {
            const aId = chainAnchorIds[i].id;
            const bId = chainAnchorIds[i + 1].id;
            const op = chainAnchorIds[i].op;
            const t = (op === '>' || op === '>>') ? 'forward'
                    : (op === '<' || op === '<<') ? 'backward'
                    : (op === '<>') ? 'both'
                    : 'none';
            conAddEdge(aId, bId, t);
          }

          // Spread multi-segment chains if not in horizontal row mode
          if (chainParts.length > 1 && chainNodeIds.length > 1 && chosenLayout !== 'horizontal') {
            conSpreadNodeSet(chainNodeIds);
          }
        });

        // Ensure nodes in horizontal row do not overlap (adjusting according to exact measured DOM width)
        if (chosenLayout === 'horizontal' && allNewIds.length >= 2) {
          const newNodes = allNewIds.map(id => conNodes.find(n => n.id === id)).filter(Boolean);
          if (newNodes.length >= 2) {
            newNodes.sort((a, b) => a.x - b.x);
            const minGap = 16;
            for (let i = 0; i < newNodes.length - 1; i++) {
              const curr = newNodes[i];
              const next = newNodes[i + 1];
              const currW = (curr.el && curr.el.offsetWidth) || conDetermineNodeWidth(curr.baseWord) || 80;
              const minNextX = curr.x + currW + minGap;
              if (next.x < minNextX) {
                const shift = minNextX - next.x;
                for (let k = i + 1; k < newNodes.length; k++) {
                  newNodes[k].x += shift;
                  if (newNodes[k].el) newNodes[k].el.style.left = newNodes[k].x + 'px';
                  const brd = board();
                  if (brd) {
                    const cx2 = brd.clientWidth / 2, cy2 = brd.clientHeight / 2;
                    newNodes[k].baseX = cx2 + (newNodes[k].x - cx2) / conCurrentZoom;
                    newNodes[k].baseY = cy2 + (newNodes[k].y - cy2) / conCurrentZoom;
                  }
                }
              }
            }
            if (typeof conRedrawEdges === 'function') conRedrawEdges();
          }
        }

        // When multiple nodes are created, select all of them for immediate joint moving
        if (allNewIds.length > 1) {
          conSelected = null;
          conMultiSelected.clear();
          allNewIds.forEach(id => {
            const n = conNodes.find(node => node.id === id);
            if (n && n.el) {
              n.el.classList.remove('con-selected');
              n.el.classList.add('con-multi-selected');
              conMultiSelected.add(n.id);
            }
          });
          if (typeof conUpdateToolbarStatus === 'function') conUpdateToolbarStatus();
          if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
        }
      };
      window.conBoardCtxFocusNoteInput = function () {
        const noteInp = document.getElementById('con-board-ctx-note-input');
        if (!noteInp) {
          window.conBoardCtxAddNote();
          return;
        }
        noteInp.focus();
        noteInp.select();
      };

      window.conBoardCtxConfirmNote = function () {
        const noteInp = document.getElementById('con-board-ctx-note-input');
        const raw = noteInp ? noteInp.value : '';
        window.conBoardCtxAddNote(raw);
      };

      window.conBoardCtxClose = function () {
        const bmenu = document.getElementById('con-board-ctx-menu');
        if (bmenu) {
          bmenu.classList.remove('visible');
          bmenu.style.maxHeight = '';
        }
        const saveSelItem = document.getElementById('con-board-ctx-save-library');
        if (saveSelItem) saveSelItem.style.display = 'none';
        const inp = document.getElementById('con-board-ctx-input');
        if (inp) inp.value = '';
        const noteInp = document.getElementById('con-board-ctx-note-input');
        if (noteInp) noteInp.value = '';
        const tblRows = document.getElementById('con-board-ctx-table-rows');
        if (tblRows) tblRows.value = '2';
        const tblCols = document.getElementById('con-board-ctx-table-cols');
        if (tblCols) tblCols.value = '4';
        const synDet = document.querySelector('#con-board-ctx-menu .con-ctx-syntax-details');
        if (synDet) synDet.open = false;
        _pendingConnectSrcId = null;
        _pendingConnectType = 'none';
        // Reset title back to default
        const title = document.querySelector('#con-board-ctx-menu .con-ctx-title');
        if (title) title.textContent = 'Add to Board';
        conRenderBoardBgPresetsInContextMenu();
        conRenderBoardLayoutOptionsInContextMenu();
      };

      window.conBoardCtxOpenRecord = function () {
        conOpenRecordPopup(_boardCtxX, _boardCtxY);
      };

      let _pendingMirrorAddNodes = [];
      let _pendingMirrorAddScheduled = false;
      function _conQueueMirrorNodeAdd(node) {
        if (!node) return;
        _pendingMirrorAddNodes.push(node);
        if (_pendingMirrorAddScheduled) return;
        _pendingMirrorAddScheduled = true;
        Promise.resolve().then(() => {
          _pendingMirrorAddScheduled = false;
          const batch = _pendingMirrorAddNodes.splice(0);
          if (batch.length && typeof window._conMirrorSend === 'function' && typeof window.conSerializeNodeForMirror === 'function') {
            const rev = (typeof window._conBumpBoardRevision === 'function') ? window._conBumpBoardRevision() : null;
            const serialized = batch.map(window.conSerializeNodeForMirror).filter(Boolean);
            if (serialized.length) {
              const selId = window.conGetSelected ? window.conGetSelected() : null;
              window._conMirrorSend({
                type: 'board-paste',
                revision: rev,
                nodes: serialized,
                selection: selId ? { selectedNodeId: selId, selectedNodeIds: [selId] } : undefined
              });
            }
          }
          setTimeout(() => { window._conSuppressMirrorObserver = false; }, 60);
        });
      }

      function conAddWordAt(text, x, y, pageNum) {
        const _prevSuppress = !!window._conSuppressMirrorObserver;
        window._conSuppressMirrorObserver = true;
        let queuedMirrorAdd = false;
        try {
          const id = 'cn' + conNextId++;
          const brd = board();
          const dbMatch = conFindDbEntry(text);
          const el = document.createElement('div');
          el.className = 'con-node' + (dbMatch ? ' con-node-matched' : '');
          el.id = id;
          el.style.left = x + 'px';
          el.style.top = y + 'px';
          conApplyDefaultWordFontSize(el);
          if (window._bcNodeFontFamily) el.style.fontFamily = window._bcNodeFontFamily;
          brd.appendChild(el);
          const baseWord = text;
          const node = { id, el, x, y, dbWord: dbMatch ? dbMatch.word : null, baseWord, pageNum: pageNum != null ? pageNum : null, locked: false, fontFamily: window._bcNodeFontFamily || null };
          conNodes.push(node);
          conSyncNodeLockState(node);
          if (typeof BoardAudioService !== 'undefined') BoardAudioService.playAction('create_node');
          conRenderNodeLabel(node);
          conAttachNodeEvents(id, el);
          conAddNodeStarBtn(node);
          conSelect(id);
          if (typeof window.conMaybeAutoExpandBoard === 'function') {
            window.conMaybeAutoExpandBoard(y + (el.offsetHeight || 36), { skipSave: true });
          }
          if (!_prevSuppress) {
            _conQueueMirrorNodeAdd(node);
            queuedMirrorAdd = true;
          }
          return id;
        } finally {
          if (!_prevSuppress && !queuedMirrorAdd) {
            window._conSuppressMirrorObserver = false;
          }
        }
      }

      function conCreateNodeActForNode(mainNodeId, actText) {
        const cleanAct = String(actText || '').trim();
        if (!cleanAct) return null;
        const mainNode = conNodes.find(n => n.id === mainNodeId);
        if (!mainNode) return null;
        const mainW = (mainNode.el && mainNode.el.offsetWidth) || conDetermineNodeWidth(mainNode.baseWord) || 88;
        const mainH = (mainNode.el && mainNode.el.offsetHeight) || 34;
        const rawX = mainNode.x + mainW + 28;
        const rawY = mainNode.y;
        const pos = (typeof conFindFreePositionBounded === 'function')
          ? conFindFreePositionBounded(rawX, rawY, mainNode.x + mainW / 2, mainNode.y + mainH / 2, 180, mainNodeId)
          : { x: rawX, y: rawY };
        const actId = conAddWordAt(cleanAct, pos.x, pos.y, null);
        if (!actId) return null;
        const actNode = conNodes.find(n => n.id === actId);
        if (actNode) {
          actNode.isNodeAct = true;
          actNode.actParentId = mainNodeId;
        }
        mainNode.actNodeId = actId;
        const actPreset = (typeof window.conGetNodeActPreset === 'function') ? window.conGetNodeActPreset() : null;
        if (actPreset && actPreset.key && typeof window.conApplyNodePreset === 'function') {
          window.conApplyNodePreset(actPreset.key, [actId], { skipUndo: true });
        }
        if (typeof conAddEdge === 'function') {
          conAddEdge(mainNodeId, actId, 'forward');
        }
        if (typeof conRedrawEdges === 'function') {
          conRedrawEdges();
        }
        return actId;
      }
      window.conCreateNodeActForNode = conCreateNodeActForNode;

      function conDuplicateNodeById(nodeId, offsetX, offsetY) {
        const src = conNodes.find(n => n.id === nodeId);
        if (!src) return null;
        const _prevSuppress = !!window._conSuppressMirrorObserver;
        window._conSuppressMirrorObserver = true;
        try {
        const brd = board();
        const dx = Number.isFinite(offsetX) ? offsetX : 40;
        const dy = Number.isFinite(offsetY) ? offsetY : 28;
        const maxX = Math.max(0, brd.clientWidth - (src.el.offsetWidth || 80));
        const maxY = Math.max(0, brd.clientHeight - (src.el.offsetHeight || 32));
        const x = Math.max(0, Math.min(maxX, src.x + dx));
        const y = Math.max(0, Math.min(maxY, src.y + dy));

        const newId = conAddWordAt(src.baseWord || src.el.textContent.trim(), x, y, src.pageNum);
        const dup = conNodes.find(n => n.id === newId);
        if (!dup) return null;

        dup.dbWord = src.dbWord || null;
        dup.pageNum = src.pageNum != null ? src.pageNum : null;
        if (src.isNodeAct) dup.isNodeAct = true;
        if (src.sourceWord) dup.sourceWord = src.sourceWord;
        if (src.relation) dup.relation = src.relation;
        if (src.fmt) dup.fmt = Object.assign({}, src.fmt);
        if (src.shape) dup.shape = src.shape;
        dup.locked = !!src.locked;
        dup.borderWidth = src.borderWidth || null;
        dup.borderStyle = src.borderStyle || null;
        dup.highlight = src.highlight || null;
        dup.preset = src.preset || null;
        dup.fontFamily = src.fontFamily || null;

        ['background', 'color', 'borderColor', 'fontSize', 'fontFamily'].forEach(key => {
          if (src.el.style[key]) dup.el.style[key] = src.el.style[key];
        });

        dup.masked = !!src.masked;
        dup.el.classList.toggle('con-masked', !!src.masked);
        dup.rotation = src.rotation || 0;
        conApplyNodeRotation(dup, dup.rotation);
        if (src.isTimer) {
          dup.isTimer = true;
          dup.durationSec = src.durationSec;
          dup.remainingSec = src.durationSec;
          dup.timerState = 'idle';
          dup.timerTarget = null;
        }
        if (src.isRandom) {
          dup.isRandom = true;
          dup.randomMin = src.randomMin;
          dup.randomMax = src.randomMax;
          // Re-roll a fresh value for the duplicate
          dup.randomValue = Math.round(Math.random() * (src.randomMax - src.randomMin)) + Math.ceil(src.randomMin);
          dup.baseWord = '=random(' + src.randomMin + ',' + src.randomMax + ')';
        }
        if (src.isSound) {
          dup.isSound = true;
          dup.soundAttachmentId = src.soundAttachmentId || null;
          dup.soundName = src.soundName || null;
          dup.soundDuration = src.soundDuration || 0;
          dup.soundCurrentTime = 0;
          dup.soundState = 'idle';
        }
        if (src.isVideo) {
          dup.isVideo = true;
          dup.videoAttachmentId = src.videoAttachmentId || null;
          dup.videoName = src.videoName || null;
          dup.videoDuration = src.videoDuration || 0;
          dup.videoCurrentTime = 0;
          dup.videoState = 'idle';
          dup.videoMuted = !!src.videoMuted;
        }
        conSyncNodeLockState(dup);

        conRenderNodeLabel(dup);
        if (!_prevSuppress && typeof window._conMirrorSend === 'function' && typeof window.conSerializeNodeForMirror === 'function') {
          const rev = (typeof window._conBumpBoardRevision === 'function') ? window._conBumpBoardRevision() : null;
          const serialized = window.conSerializeNodeForMirror(dup);
          if (serialized) {
            window._conMirrorSend({ type: 'board-paste', revision: rev, nodes: [serialized] });
          }
        }
        return newId;
        } finally {
          if (!_prevSuppress) {
            setTimeout(() => { window._conSuppressMirrorObserver = false; }, 60);
          }
        }
      }

      // Multi-select bulk format toggle
      window.conCtxMultiToggleFmt = function (type) {
        if (conMultiSelected.size < 1) return;
        conPushUndo();
        const targets = conNodes.filter(n => conMultiSelected.has(n.id));
        // Determine majority state: if most are on, turn all off; else turn all on
        const onCount = targets.filter(n => conGetNodeFmt(n)[type]).length;
        const newVal = onCount < targets.length / 2 ? true : false;
        targets.forEach(node => {
          conGetNodeFmt(node)[type] = newVal;
          conRenderNodeLabel(node);
        });
        conRedrawEdges();
      };

      // Connect all multi-selected nodes to each other (chain or full mesh based on count)
      window.conCtxConnectSelected = function (type) {
        if (conMultiSelected.size < 2) return;
        conPushUndo();
        const edgeType = type || 'none';
        // Use selection order, falling back to DOM order for stability
        const ids = [...conMultiSelected];
        for (let i = 0; i < ids.length - 1; i++) {
          conAddEdge(ids[i], ids[i + 1], edgeType);
        }
        conCtxClose();
      };

      // Merge multi-selected nodes: opens the small choice popup close to the button
      window.conCtxMergeSelected = function (event) {
        if (!conMultiSelected || conMultiSelected.size < 2) return;
        let anchorRect = null;
        const btn = (event && (event.currentTarget || event.target)) || document.getElementById('con-ctx-merge-btn') || document.querySelector('button[onclick*="conCtxMergeSelected"]');
        if (btn && typeof btn.getBoundingClientRect === 'function') {
          anchorRect = btn.getBoundingClientRect();
        } else if (conCtxNodeId) {
          const node = conNodes.find(n => n.id === conCtxNodeId);
          if (node && node.el) anchorRect = node.el.getBoundingClientRect();
        }
        conCtxClose();
        conOpenMergeChoiceModal(anchorRect);
      };

      function conOpenMergeChoiceModal(anchorRect) {
        if (!conMultiSelected || conMultiSelected.size < 2) return;
        const overlay = document.getElementById('con-merge-choice-overlay');
        const popup = document.getElementById('con-merge-choice-popup');
        if (!overlay || !popup) return;

        if (typeof applyI18nToContainer === 'function') {
          applyI18nToContainer(popup);
        }
        overlay.classList.add('active');

        // Position popup close to the pressed button
        if (anchorRect) {
          const pw = popup.offsetWidth || 236;
          const ph = popup.offsetHeight || 105;
          let left = anchorRect.left;
          let top = anchorRect.bottom + 4;

          if (left + pw > window.innerWidth - 8) {
            left = window.innerWidth - pw - 8;
          }
          if (left < 8) left = 8;

          if (top + ph > window.innerHeight - 8) {
            top = Math.max(8, anchorRect.top - ph - 4);
          }
          popup.style.left = left + 'px';
          popup.style.top = top + 'px';
        } else {
          popup.style.left = '50%';
          popup.style.top = '50%';
          popup.style.transform = 'translate(-50%, -50%)';
        }
      }

      window.conMergeChoiceCancel = function () {
        conMergeChoiceClose();
      };

      function conMergeChoiceClose() {
        const overlay = document.getElementById('con-merge-choice-overlay');
        if (overlay) overlay.classList.remove('active');
      }

      window.conMergeChoiceExecute = function (mode) {
        if (!conMultiSelected || conMultiSelected.size < 2) {
          conMergeChoiceClose();
          return;
        }
        conPushUndo();
        // Sort by x position for left-to-right word order
        const nodes = conNodes.filter(n => conMultiSelected.has(n.id))
          .sort((a, b) => a.x - b.x);
        if (nodes.length < 2) {
          conMergeChoiceClose();
          return;
        }
        const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
        const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
        const ids = nodes.map(n => n.id);
        const phraseWords = nodes.map(n => n.baseWord || (n.el ? n.el.textContent.trim() : '')).filter(Boolean);
        const first = nodes[0];

        if (mode === 'phrase') {
          // Remove the original nodes
          ids.forEach(id => conRemoveNode(id));
          conMultiSelected.clear();
          if (phraseWords.length < 2) {
            // Single-word fallback
            const newId = conAddWordAt(phraseWords[0] || '', cx, cy, first ? first.pageNum : null);
            const newNode = conNodes.find(n => n.id === newId);
            if (newNode && first) {
              if (first.fmt) newNode.fmt = Object.assign({}, first.fmt);
              ['background', 'color', 'fontSize', 'fontFamily'].forEach(k => {
                if (first.el && first.el.style[k]) newNode.el.style[k] = first.el.style[k];
              });
              conRenderNodeLabel(newNode);
            }
          } else {
            const phraseIds = conCreatePhraseGroup(phraseWords, cx, cy);
            // Apply per-word formatting from the source nodes
            phraseIds.forEach((nid, i) => {
              const src = nodes[i];
              const newNode = conNodes.find(n => n.id === nid);
              if (!newNode || !src) return;
              if (src.fmt) newNode.fmt = Object.assign({}, src.fmt);
              if (src.pageNum != null) newNode.pageNum = src.pageNum;
              ['background', 'color', 'fontSize', 'fontFamily'].forEach(k => {
                if (src.el && src.el.style[k]) newNode.el.style[k] = src.el.style[k];
              });
              conRenderNodeLabel(newNode);
            });
          }
        } else {
          // Single node mode: join words with spaces
          const fullText = phraseWords.join(' ');
          const pageNumNode = nodes.find(n => n.pageNum != null);
          const targetPageNum = pageNumNode ? pageNumNode.pageNum : (first ? first.pageNum : null);

          // Remove original nodes
          ids.forEach(id => conRemoveNode(id));
          conMultiSelected.clear();

          const newId = conAddWordAt(fullText, cx, cy, targetPageNum);
          const newNode = conNodes.find(n => n.id === newId);
          if (newNode && first) {
            if (first.fmt) newNode.fmt = Object.assign({}, first.fmt);
            ['background', 'color', 'fontFamily', 'borderColor'].forEach(k => {
              if (first.el && first.el.style[k]) newNode.el.style[k] = first.el.style[k];
            });
            const srcBaseSize = conGetNodeBaseFontSize(first);
            if (srcBaseSize) conSetNodeBaseFontSize(newNode, srcBaseSize);
            newNode.borderWidth = first.borderWidth || null;
            newNode.borderStyle = first.borderStyle || null;
            newNode.highlight = first.highlight || null;
            newNode.preset = first.preset || null;
            newNode.shape = first.shape || null;
            newNode.fontFamily = first.fontFamily || null;
            newNode.textStrokeColor = first.textStrokeColor || null;
            newNode.textStrokeWidth = first.textStrokeWidth || null;
            if (first.shape) conApplyNodeShape(newNode, first.shape);
            if (first.rotation != null) {
              newNode.rotation = (typeof window.conNormalizeNodeRotation === 'function') ? window.conNormalizeNodeRotation(first.rotation) : (Number(first.rotation) || 0);
              if (typeof conApplyNodeRotation === 'function') conApplyNodeRotation(newNode, newNode.rotation);
            }
            if (newNode.textStrokeWidth || newNode.textStrokeColor) {
              conApplyTextStrokeStyle(newNode.el, newNode.textStrokeWidth, newNode.textStrokeColor);
            }
            conRenderNodeLabel(newNode);
          }
        }
        conRedrawEdges();
        if (window._conMirrorBroadcast) window._conMirrorBroadcast({ bumpRevision: true });
        conMergeChoiceClose();
      };

      function conGetMultiSelectedNodes() {
        return conNodes.filter(n => conMultiSelected.has(n.id));
      }

      function conGetMultiSelectedTargets() {
        const targets = [];
        const seenIds = new Set();

        // 1. Nodes
        const nodesList = (typeof window.conGetNodes === 'function')
          ? window.conGetNodes()
          : (window.conNodes || conNodes || []);
        const multiNodes = (typeof window.conGetMultiSelected === 'function')
          ? window.conGetMultiSelected()
          : (window.conMultiSelected || conMultiSelected);

        if (multiNodes && multiNodes.size > 0) {
          multiNodes.forEach(nid => {
            const n = nodesList.find(x => x && (x.id === nid || String(x.id) === String(nid)));
            if (n && !conIsNodeLocked(n) && !seenIds.has('node:' + n.id)) {
              seenIds.add('node:' + n.id);
              const el = n.el || document.querySelector(`.con-node[data-id="${n.id}"]`);
              const w = (el && el.offsetWidth) ? el.offsetWidth : 80;
              const h = (el && el.offsetHeight) ? el.offsetHeight : 32;
              targets.push({
                type: 'node',
                id: n.id,
                item: n,
                el: el,
                x: typeof n.x === 'number' ? n.x : 0,
                y: typeof n.y === 'number' ? n.y : 0,
                width: w,
                height: h
              });
            }
          });
        }

        // 2. Notes
        const notesList = (typeof window.conGetNotes === 'function')
          ? window.conGetNotes()
          : (window.conNotes || conNotes || []);
        const noteSel = (typeof window.conGetNoteSelected === 'function')
          ? window.conGetNoteSelected()
          : ((typeof window.conNoteSelected !== 'undefined' && window.conNoteSelected) ? window.conNoteSelected : conNoteSelected);

        if (noteSel && noteSel.size > 0) {
          noteSel.forEach(nid => {
            const nd = notesList.find(x => x && (x.id === nid || String(x.id) === String(nid)));
            if (nd && !nd.locked && !seenIds.has('note:' + nd.id)) {
              seenIds.add('note:' + nd.id);
              const el = (typeof window.wnGetNoteElementById === 'function')
                ? window.wnGetNoteElementById(nd.id)
                : document.querySelector(`.con-word-note[data-id="${nd.id}"], .ta-word-note[data-id="${nd.id}"]`);
              const w = (el && el.offsetWidth) ? el.offsetWidth : (Number(nd.width) || 120);
              const h = (el && el.offsetHeight) ? el.offsetHeight : (Number(nd.height) || 60);
              targets.push({
                type: 'note',
                id: nd.id,
                item: nd,
                el: el,
                x: typeof nd.x === 'number' ? nd.x : 0,
                y: typeof nd.y === 'number' ? nd.y : 0,
                width: w,
                height: h
              });
            }
          });
        }

        return targets;
      }
      window.conGetMultiSelectedTargets = conGetMultiSelectedTargets;

      function conClampNodePosition(node, x, y) {
        const brd = board();
        const maxX = Math.max(0, brd.clientWidth - (node.el.offsetWidth || 80));
        const maxY = Math.max(0, brd.clientHeight - (node.el.offsetHeight || 32));
        return {
          x: Math.max(0, Math.min(maxX, x)),
          y: Math.max(0, Math.min(maxY, y)),
        };
      }

      function conSyncNodeBasePosition(node) {
        const brd = board();
        const centerX = brd.clientWidth / 2;
        const centerY = brd.clientHeight / 2;
        node.baseX = centerX + (node.x - centerX) / conCurrentZoom;
        node.baseY = centerY + (node.y - centerY) / conCurrentZoom;
      }

      function conCommitSelectedLayout(targets) {
        if (!targets || !targets.length) return;
        const brd = board();
        const movedNodes = [];
        const movedNotes = [];
        const brdCenterX = brd.clientWidth / 2;
        const brdCenterY = brd.clientHeight / 2;
        const z = (window.conGetZoom ? window.conGetZoom() : (typeof window.conCurrentZoom === 'number' ? window.conCurrentZoom : 1)) || 1;

        if (typeof window.conMaybeAutoExpandBoard === 'function') {
          let maxTargetBottom = 0;
          targets.forEach(t => {
            const b = (t.y || 0) + (t.height || 40);
            if (b > maxTargetBottom) maxTargetBottom = b;
          });
          if (maxTargetBottom > 0) window.conMaybeAutoExpandBoard(maxTargetBottom, { skipSave: true });
        }

        targets.forEach(t => {
          if (t.type === 'node') {
            const node = t.item;
            if (conIsNodeLocked(node)) return;
            const maxX = Math.max(0, brd.clientWidth - (t.width || 80));
            const maxY = Math.max(0, brd.clientHeight - (t.height || 32));
            node.x = Math.max(0, Math.min(maxX, t.x));
            node.y = Math.max(0, Math.min(maxY, t.y));
            if (node.el) {
              node.el.style.left = node.x + 'px';
              node.el.style.top = node.y + 'px';
            }
            conSyncNodeBasePosition(node);
            movedNodes.push(node);
          } else if (t.type === 'note') {
            const nd = t.item;
            if (nd.locked) return;
            const maxX = Math.max(0, brd.clientWidth - (t.width || 120));
            const maxY = Math.max(0, brd.clientHeight - (t.height || 60));
            nd.x = Math.max(0, Math.min(maxX, t.x));
            nd.y = Math.max(0, Math.min(maxY, t.y));
            if (t.el) {
              t.el.style.left = nd.x + 'px';
              t.el.style.top = nd.y + 'px';
            }
            nd.baseX = brdCenterX + (nd.x - brdCenterX) / z;
            nd.baseY = brdCenterY + (nd.y - brdCenterY) / z;
            movedNotes.push(nd);
          }
        });

        if (typeof window.conGroupRefitAll === 'function') window.conGroupRefitAll();
        if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);

        // Mirror synchronization for multi-display / presentation
        if (window._conMirrorSend) {
          if (movedNodes.length > 0) {
            window._conMirrorSend({
              type: 'node-move',
              positions: movedNodes.map(n => ({ id: n.id, x: n.x, y: n.y }))
            });
          }
          if (movedNotes.length > 0) {
            window._conMirrorSend({
              type: 'note-move',
              positions: movedNotes.map(nd => ({ id: nd.id, x: nd.x, y: nd.y }))
            });
          }
        }
        if (window._conMirrorBroadcast) {
          window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        }
      }
      window.conCommitSelectedLayout = conCommitSelectedLayout;

      function conCommitNodeLayout(nodes) {
        if (!nodes) return;
        const targets = nodes.map(n => ({
          type: 'node',
          id: n.id,
          item: n,
          el: n.el,
          x: n.x,
          y: n.y,
          width: (n.el && n.el.offsetWidth) || 80,
          height: (n.el && n.el.offsetHeight) || 32
        }));
        conCommitSelectedLayout(targets);
      }

      function conGetSelectionBounds(targets) {
        if (!targets || !targets.length) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
        const left = Math.min(...targets.map(t => t.x));
        const top = Math.min(...targets.map(t => t.y));
        const right = Math.max(...targets.map(t => t.x + (t.width || 80)));
        const bottom = Math.max(...targets.map(t => t.y + (t.height || 32)));
        return {
          left,
          top,
          right,
          bottom,
          width: right - left,
          height: bottom - top,
          centerX: (left + right) / 2,
          centerY: (top + bottom) / 2,
        };
      }

      window.conCtxAlignSelected = function (direction, mode) {
        const targets = conGetMultiSelectedTargets();
        if (targets.length < 2) return;

        if (typeof window.conPushUndo === 'function') window.conPushUndo();

        const bounds = conGetSelectionBounds(targets);
        targets.forEach(t => {
          if (direction === 'vertical') {
            if (mode === 'left') t.x = bounds.left;
            else if (mode === 'middle' || mode === 'center') t.x = bounds.centerX - t.width / 2;
            else if (mode === 'right') t.x = bounds.right - t.width;
          } else {
            if (mode === 'top') t.y = bounds.top;
            else if (mode === 'centre' || mode === 'middle') t.y = bounds.centerY - t.height / 2;
            else if (mode === 'bottom') t.y = bounds.bottom - t.height;
          }
        });

        conCommitSelectedLayout(targets);
        conCtxClose();
        if (typeof window.wnStyleRefreshPosition === 'function') window.wnStyleRefreshPosition();
      };

      window.conCtxDistributeSelected = function (direction) {
        const targets = conGetMultiSelectedTargets();
        if (targets.length < 3) return;

        if (typeof window.conPushUndo === 'function') window.conPushUndo();

        const brd = board();
        const isHorizontal = direction === 'horizontal';
        const sorted = [...targets].sort((a, b) => isHorizontal ? a.x - b.x : a.y - b.y);
        const bounds = conGetSelectionBounds(sorted);
        const totalSize = sorted.reduce((sum, t) => {
          return sum + (isHorizontal ? t.width : t.height);
        }, 0);
        const available = isHorizontal ? brd.clientWidth : brd.clientHeight;
        const currentSpan = isHorizontal ? bounds.width : bounds.height;
        const minGap = isHorizontal ? 18 : 14;
        const span = Math.min(available, Math.max(currentSpan, totalSize + minGap * (sorted.length - 1)));
        const gap = Math.max(0, (span - totalSize) / (sorted.length - 1));
        const center = isHorizontal ? bounds.centerX : bounds.centerY;
        let cursor = Math.max(0, Math.min(available - span, center - span / 2));

        sorted.forEach(t => {
          if (isHorizontal) t.x = cursor;
          else t.y = cursor;
          cursor += (isHorizontal ? t.width : t.height) + gap;
        });

        conCommitSelectedLayout(sorted);
        conCtxClose();
        if (typeof window.wnStyleRefreshPosition === 'function') window.wnStyleRefreshPosition();
      };

      window.conCtxGridSelected = function () {
        const targets = conGetMultiSelectedTargets();
        if (targets.length < 2) return;

        if (typeof window.conPushUndo === 'function') window.conPushUndo();

        // Calculate visual centers of all targets
        targets.forEach(t => {
          t.cx = t.x + (t.width || 80) / 2;
          t.cy = t.y + (t.height || 32) / 2;
        });

        const avgW = targets.reduce((s, t) => s + (t.width || 80), 0) / targets.length;
        const avgH = targets.reduce((s, t) => s + (t.height || 32), 0) / targets.length;

        // 1. Group nodes approximately on the same line into horizontal rows
        const sortedByY = [...targets].sort((a, b) => a.cy - b.cy);
        const rowThreshold = Math.max(26, avgH * 0.7);
        const rows = [];
        let currentRow = [sortedByY[0]];
        let currentRowSumY = sortedByY[0].cy;

        for (let i = 1; i < sortedByY.length; i++) {
          const t = sortedByY[i];
          const rowAvgY = currentRowSumY / currentRow.length;
          if (Math.abs(t.cy - rowAvgY) <= rowThreshold) {
            currentRow.push(t);
            currentRowSumY += t.cy;
          } else {
            rows.push(currentRow);
            currentRow = [t];
            currentRowSumY = t.cy;
          }
        }
        if (currentRow.length) rows.push(currentRow);

        // 2. Group nodes approximately on the same column into vertical columns
        const sortedByX = [...targets].sort((a, b) => a.cx - b.cx);
        const colThreshold = Math.max(38, avgW * 0.55);
        const cols = [];
        let currentCol = [sortedByX[0]];
        let currentColSumX = sortedByX[0].cx;

        for (let i = 1; i < sortedByX.length; i++) {
          const t = sortedByX[i];
          const colAvgX = currentColSumX / currentCol.length;
          if (Math.abs(t.cx - colAvgX) <= colThreshold) {
            currentCol.push(t);
            currentColSumX += t.cx;
          } else {
            cols.push(currentCol);
            currentCol = [t];
            currentColSumX = t.cx;
          }
        }
        if (currentCol.length) cols.push(currentCol);

        // 3. Compute target Y for each row so nodes on the same line get aligned horizontally
        const rowCenterYs = rows.map(r => {
          return r.reduce((sum, t) => sum + t.cy, 0) / r.length;
        });

        // 4. Compute target X for each column so nodes on the same column get aligned vertically
        const colCenterXs = cols.map(c => {
          return c.reduce((sum, t) => sum + t.cx, 0) / c.length;
        });

        // Map targets to their row and column index
        const targetRowIndex = new Map();
        rows.forEach((r, rIdx) => {
          r.forEach(t => targetRowIndex.set(t, rIdx));
        });

        const targetColIndex = new Map();
        cols.forEach((c, cIdx) => {
          c.forEach(t => targetColIndex.set(t, cIdx));
        });

        // Prevent column overlaps
        const minGapX = 16;
        for (let j = 0; j < cols.length - 1; j++) {
          const colA = cols[j];
          const colB = cols[j + 1];
          const maxRightA = Math.max(...colA.map(t => colCenterXs[j] + (t.width || 80) / 2));
          const minLeftB = Math.min(...colB.map(t => colCenterXs[j + 1] - (t.width || 80) / 2));
          if (minLeftB < maxRightA + minGapX) {
            const shiftX = (maxRightA + minGapX) - minLeftB;
            for (let k = j + 1; k < cols.length; k++) {
              colCenterXs[k] += shiftX;
            }
          }
        }

        // Prevent row overlaps
        const minGapY = 14;
        for (let i = 0; i < rows.length - 1; i++) {
          const rowA = rows[i];
          const rowB = rows[i + 1];
          const maxBottomA = Math.max(...rowA.map(t => rowCenterYs[i] + (t.height || 32) / 2));
          const minTopB = Math.min(...rowB.map(t => rowCenterYs[i + 1] - (t.height || 32) / 2));
          if (minTopB < maxBottomA + minGapY) {
            const shiftY = (maxBottomA + minGapY) - minTopB;
            for (let k = i + 1; k < rows.length; k++) {
              rowCenterYs[k] += shiftY;
            }
          }
        }

        // 5. Apply positions:
        // - Nodes on approximately the same line get aligned horizontally to rowCenterYs[rIdx]
        // - Nodes on approximately the same column get aligned vertically to colCenterXs[cIdx]
        targets.forEach(t => {
          const rIdx = targetRowIndex.get(t);
          const cIdx = targetColIndex.get(t);
          const targetCy = (rIdx != null) ? rowCenterYs[rIdx] : t.cy;
          const targetCx = (cIdx != null) ? colCenterXs[cIdx] : t.cx;

          t.y = Math.round(targetCy - (t.height || 32) / 2);
          t.x = Math.round(targetCx - (t.width || 80) / 2);
        });

        // 6. Guarantee no overlap between targets on the same horizontal line
        rows.forEach(r => {
          if (r.length < 2) return;
          r.sort((a, b) => a.x - b.x);
          for (let i = 0; i < r.length - 1; i++) {
            const curr = r[i];
            const next = r[i + 1];
            const minX = curr.x + (curr.width || 80) + minGapX;
            if (next.x < minX) {
              const shift = minX - next.x;
              for (let k = i + 1; k < r.length; k++) {
                r[k].x += shift;
              }
            }
          }
        });

        conCommitSelectedLayout(targets);
        conCtxClose();
        if (typeof window.wnStyleRefreshPosition === 'function') window.wnStyleRefreshPosition();
      };

      function conSpreadNodeSet(ids, axis = 'both') {
        const selectedNodes = ids.map(id => conNodes.find(n => n.id === id)).filter(node => {
          if (!node || conIsNodeLocked(node)) return false;
          const pg = conGroupOfNode(node.id);
          return !(pg && pg.phraseGroup);
        });
        if (selectedNodes.length < 2) return;

        // Build member positions for force calculation
        const mems = selectedNodes.map(n => ({
          n,
          cx: n.x + (n.el.offsetWidth || 80) / 2,
          cy: n.y + (n.el.offsetHeight || 28) / 2,
          w: n.el.offsetWidth || 80,
          h: n.el.offsetHeight || 28,
        }));

        const ITER_INTRA = 80;
        const INTRA_PAD = 12;

        // Spread members using force-based physics
        for (let iter = 0; iter < ITER_INTRA; iter++) {
          const forces = mems.map(() => ({ fx: 0, fy: 0 }));
          for (let i = 0; i < mems.length; i++) {
            for (let j = i + 1; j < mems.length; j++) {
              const a = mems[i], b = mems[j];
              const dx = b.cx - a.cx || 0.1, dy = b.cy - a.cy;
              const ox = (a.w / 2 + b.w / 2 + INTRA_PAD) - Math.abs(dx);
              const oy = (a.h / 2 + b.h / 2 + INTRA_PAD) - Math.abs(dy);
              if (ox > 0 && oy > 0) {
                let px = 0, py = 0;
                if (axis === 'horizontal') {
                  px = (ox / 2 + 0.5) * Math.sign(dx);
                } else if (axis === 'vertical') {
                  py = (oy / 2 + 0.5) * Math.sign(dy || 1);
                } else {
                  if (ox < oy) px = (ox / 2 + 0.5) * Math.sign(dx);
                  else py = (oy / 2 + 0.5) * Math.sign(dy || 1);
                }
                forces[i].fx -= px; forces[i].fy -= py;
                forces[j].fx += px; forces[j].fy += py;
              }
            }
          }
          mems.forEach((m, i) => { m.cx += forces[i].fx; m.cy += forces[i].fy; });
        }

        // Apply new positions
        mems.forEach(m => {
          m.n.x = m.cx - m.w / 2;
          m.n.y = m.cy - m.h / 2;
          m.n.el.style.transition = 'left 0.4s ease, top 0.4s ease';
          m.n.el.style.left = m.n.x + 'px';
          m.n.el.style.top = m.n.y + 'px';
        });

        conGroupRefitAll();
        conRedrawEdges();
        setTimeout(() => {
          mems.forEach(m => { m.n.el.style.transition = ''; });
          conRedrawEdges();
          conGroupRefitAll();
        }, 450);
      }

      // Spread multi-selected words using force-based physics (axis: 'vertical' | 'horizontal' | 'both')
      window.conCtxSpreadSelected = function (axis = 'both') {
        if (conMultiSelected.size < 2) return;
        conPushUndo();
        conSpreadNodeSet([...conMultiSelected], axis);
        conCtxClose();
      };

      window.conBoardCtxSpreadRegion = function (radius = 220) {
        const brd = board();
        if (!brd || conNodes.length < 2) return;

        const centerX = Number(window._boardCtxNoteX) || (_boardCtxX + 40) || brd.clientWidth / 2;
        const centerY = Number(window._boardCtxNoteY) || (_boardCtxY + 18) || brd.clientHeight / 2;
        const regionRadius = Math.max(140, Number(radius) || 220);

        function boxTouchesRegion(left, top, right, bottom) {
          const nearX = Math.max(left, Math.min(centerX, right));
          const nearY = Math.max(top, Math.min(centerY, bottom));
          return Math.hypot(nearX - centerX, nearY - centerY) <= regionRadius;
        }

        const units = [];
        const assignedNodeIds = new Set();

        conGroups.forEach(g => {
          const members = conNodes.filter(n => g.nodeIds.includes(n.id));
          if (!members.length) return;

          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          members.forEach(n => {
            const w = n.el.offsetWidth || 80;
            const h = n.el.offsetHeight || 28;
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + w);
            maxY = Math.max(maxY, n.y + h);
          });

          if (!boxTouchesRegion(minX, minY, maxX, maxY)) return;

          const gcx = (minX + maxX) / 2;
          const gcy = (minY + maxY) / 2;
          members.forEach(n => assignedNodeIds.add(n.id));
          units.push({
            cx: gcx,
            cy: gcy,
            w: maxX - minX + GROUP_PAD * 2,
            h: maxY - minY + GROUP_PAD * 2,
            isGroup: true,
            memberOffsets: members.map(n => ({
              n,
              dx: (n.x + (n.el.offsetWidth || 80) / 2) - gcx,
              dy: (n.y + (n.el.offsetHeight || 28) / 2) - gcy,
              w: n.el.offsetWidth || 80,
              h: n.el.offsetHeight || 28,
            })),
          });
        });

        conNodes.forEach(n => {
          if (assignedNodeIds.has(n.id)) return;
          const w = n.el.offsetWidth || 80;
          const h = n.el.offsetHeight || 28;
          if (!boxTouchesRegion(n.x, n.y, n.x + w, n.y + h)) return;
          units.push({ cx: n.x + w / 2, cy: n.y + h / 2, w, h, isGroup: false, node: n, locked: conIsNodeLocked(n) });
        });

        if (units.length < 2) {
          if (typeof mdbToast === 'function') mdbToast('ℹ No nearby words to spread here.');
          return;
        }

        conPushUndo();

        const ordered = units.map(u => ({
          ...u,
          originCx: u.cx,
          originCy: u.cy,
        }));

        const PADDING = 14;
        const ITERATIONS = 70;
        const anchorStrength = 0.22;
        const maxShift = Math.min(90, Math.max(36, regionRadius * 0.35));

        for (let iter = 0; iter < ITERATIONS; iter++) {
          const forces = ordered.map(() => ({ fx: 0, fy: 0 }));

          for (let i = 0; i < ordered.length; i++) {
            for (let j = i + 1; j < ordered.length; j++) {
              const a = ordered[i], b = ordered[j];
              const rawDx = b.cx - a.cx;
              const rawDy = b.cy - a.cy;
              const dx = rawDx || (b.originCx - a.originCx) || 0.1;
              const dy = rawDy || (b.originCy - a.originCy) || 0.1;
              const ox = (a.w / 2 + b.w / 2 + PADDING) - Math.abs(rawDx);
              const oy = (a.h / 2 + b.h / 2 + PADDING) - Math.abs(rawDy);
              if (ox > 0 && oy > 0) {
                let px = 0, py = 0;
                if (ox < oy) px = (ox / 2 + 0.35) * Math.sign(dx);
                else py = (oy / 2 + 0.35) * Math.sign(dy);
                forces[i].fx -= px; forces[i].fy -= py;
                forces[j].fx += px; forces[j].fy += py;
              }
            }
          }

          ordered.forEach((u, i) => {
            if (!u.isGroup && u.locked) return;
            u.cx += forces[i].fx;
            u.cy += forces[i].fy;

            u.cx += (u.originCx - u.cx) * anchorStrength;
            u.cy += (u.originCy - u.cy) * anchorStrength;

            const shiftX = u.cx - u.originCx;
            const shiftY = u.cy - u.originCy;
            const shift = Math.hypot(shiftX, shiftY);
            if (shift > maxShift && shift > 0) {
              const scale = maxShift / shift;
              u.cx = u.originCx + shiftX * scale;
              u.cy = u.originCy + shiftY * scale;
            }

            u.cx = Math.max(u.w / 2 + 4, u.cx);
            u.cy = Math.max(u.h / 2 + 4, u.cy);
          });
        }

        const boardCenterX = brd.clientWidth / 2;
        const boardCenterY = brd.clientHeight / 2;
        ordered.forEach(unit => {
          if (unit.isGroup) {
            unit.memberOffsets.forEach(({ n, dx, dy, w, h }) => {
              if (conIsNodeLocked(n)) return;
              n.x = unit.cx + dx - w / 2;
              n.y = unit.cy + dy - h / 2;
              n.baseX = boardCenterX + (n.x - boardCenterX) / conCurrentZoom;
              n.baseY = boardCenterY + (n.y - boardCenterY) / conCurrentZoom;
              n.el.style.transition = 'left 0.4s ease, top 0.4s ease';
              n.el.style.left = n.x + 'px';
              n.el.style.top = n.y + 'px';
            });
          } else if (!unit.locked) {
            unit.node.x = unit.cx - unit.w / 2;
            unit.node.y = unit.cy - unit.h / 2;
            unit.node.baseX = boardCenterX + (unit.node.x - boardCenterX) / conCurrentZoom;
            unit.node.baseY = boardCenterY + (unit.node.y - boardCenterY) / conCurrentZoom;
            unit.node.el.style.transition = 'left 0.4s ease, top 0.4s ease';
            unit.node.el.style.left = unit.node.x + 'px';
            unit.node.el.style.top = unit.node.y + 'px';
          }
        });

        conRedrawEdges();
        conGroupRefitAll();
        setTimeout(() => {
          ordered.forEach(u => {
            if (u.isGroup) u.memberOffsets.forEach(({ n }) => { n.el.style.transition = ''; });
            else u.node.el.style.transition = '';
          });
          conRedrawEdges();
          conGroupRefitAll();
        }, 450);
      };

      // ---- Compact helpers ----
      // Each node/unit greedily moves as far as possible toward the centroid
      // without overlapping any neighbour. Processed innermost-first, 3 passes.
      function _conCompactRunUnits(units, centX, centY, PADDING, axis = 'both') {
        let totalMoved = 0;
        for (let pass = 0; pass < 8; pass++) {
          // Recompute centroid from current (moved) positions each pass
          const freeUnits = units.filter(u => !u.locked);
          const cx = freeUnits.reduce((s, u) => s + u.cx, 0) / (freeUnits.length || 1);
          const cy = freeUnits.reduce((s, u) => s + u.cy, 0) / (freeUnits.length || 1);
          // Innermost units first: they slide toward centroid, opening room for outer ones
          const order = units.map((_, i) => i).sort((a, b) =>
            Math.hypot(units[a].cx - cx, units[a].cy - cy) -
            Math.hypot(units[b].cx - cx, units[b].cy - cy));
          order.forEach(i => {
            const u = units[i];
            if (u.locked) return;
            const dxD = (axis === 'vertical') ? 0 : (cx - u.cx);
            const dyD = (axis === 'horizontal') ? 0 : (cy - u.cy);
            if (Math.hypot(dxD, dyD) < 0.5) return;
            // Binary-search: max fraction t ∈ [0,1] we can move without overlapping
            let lo = 0, hi = 1;
            for (let k = 0; k < 28; k++) {
              const mid = (lo + hi) / 2;
              const nx = u.cx + dxD * mid, ny = u.cy + dyD * mid;
              let hit = false;
              for (let j = 0; j < units.length; j++) {
                if (j === i) continue;
                if (Math.abs(nx - units[j].cx) < (u.w + units[j].w) / 2 + PADDING &&
                  Math.abs(ny - units[j].cy) < (u.h + units[j].h) / 2 + PADDING) { hit = true; break; }
              }
              if (hit) hi = mid; else lo = mid;
            }
            if (lo < 0.001) return;
            u.cx += dxD * lo; u.cy += dyD * lo;
            totalMoved += Math.hypot(dxD * lo, dyD * lo);
          });
        }
        return totalMoved;
      }

      function conCompactNodeSet(ids, axis = 'both') {
        const selectedNodes = ids.map(id => conNodes.find(n => n.id === id)).filter(n => n && !conIsNodeLocked(n));
        if (selectedNodes.length < 2) return;
        const units = selectedNodes.map(n => ({
          n, locked: false,
          cx: n.x + (n.el.offsetWidth || 80) / 2, cy: n.y + (n.el.offsetHeight || 28) / 2,
          w: n.el.offsetWidth || 80, h: n.el.offsetHeight || 28,
        }));
        const centX = units.reduce((s, u) => s + u.cx, 0) / units.length;
        const centY = units.reduce((s, u) => s + u.cy, 0) / units.length;
        const totalMoved = _conCompactRunUnits(units, centX, centY, 4, axis);
        if (totalMoved < 1) { if (typeof mdbToast === 'function') mdbToast('ℹ Already as compact as possible.'); return; }
        units.forEach(u => {
          u.n.x = u.cx - u.w / 2; u.n.y = u.cy - u.h / 2;
          u.n.el.style.transition = 'left 0.4s ease, top 0.4s ease';
          u.n.el.style.left = u.n.x + 'px'; u.n.el.style.top = u.n.y + 'px';
        });
        conGroupRefitAll(); conRedrawEdges();
        setTimeout(() => { units.forEach(u => { u.n.el.style.transition = ''; }); conRedrawEdges(); conGroupRefitAll(); }, 450);
      }

      window.conCtxCompactSelected = function (axis = 'both') {
        if (conMultiSelected.size < 2) return;
        conPushUndo();
        conCompactNodeSet([...conMultiSelected], axis);
        conCtxClose();
      };

      // ---- Axis choice popover for Spread / Compact (multiselected node context & Board tab) ----
      let _axisPickerMode = null;
      let _axisPickerScope = null;
      let _axisPickerOutsideBound = false;

      function conCloseAxisPicker() {
        const picker = document.getElementById('con-axis-picker');
        if (picker) picker.classList.remove('active');
        _axisPickerMode = null;
        _axisPickerScope = null;
      }
      window.conCloseAxisPicker = global.conCloseAxisPicker = conCloseAxisPicker;

      function conOpenAxisPicker(mode, event, scope = 'selection') {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        const picker = document.getElementById('con-axis-picker');
        if (!picker) return;

        if (picker.classList.contains('active') && _axisPickerMode === mode && _axisPickerScope === scope) {
          conCloseAxisPicker();
          return;
        }

        if (!_axisPickerOutsideBound) {
          _axisPickerOutsideBound = true;
          document.addEventListener('mousedown', ev => {
            const p = document.getElementById('con-axis-picker');
            if (!p || !p.classList.contains('active')) return;
            if (!p.contains(ev.target) && !ev.target.closest('[data-bev-224], [data-bev-225], [data-bev-499], [data-bev-500]')) {
              conCloseAxisPicker();
            }
          }, true);
        }

        _axisPickerMode = mode;
        _axisPickerScope = scope;
        picker.innerHTML = '';

        const tr = (key, fallback) => (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t(key) : fallback;
        const isSpread = mode === 'spread';
        const iconSrc = isSpread ? '../assets/icons/spread.svg' : '../assets/icons/compact.svg';
        const options = isSpread ? [
          { axis: 'vertical', label: tr('conSpreadVertically', 'Spread vertically') },
          { axis: 'horizontal', label: tr('conSpreadHorizontally', 'Spread horizontally') },
          { axis: 'both', label: tr('conSpreadBoth', 'Spread vertically and horizontally') }
        ] : [
          { axis: 'vertical', label: tr('conCompactVertically', 'Compact vertically') },
          { axis: 'horizontal', label: tr('conCompactHorizontally', 'Compact horizontally') },
          { axis: 'both', label: tr('conCompactBoth', 'Compact vertically and horizontally') }
        ];

        options.forEach(opt => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'con-axis-picker-btn';
          const img = document.createElement('img');
          img.src = iconSrc;
          img.className = 'btn-icon';
          img.alt = '';
          const span = document.createElement('span');
          span.textContent = opt.label;
          btn.appendChild(img);
          btn.appendChild(span);
          btn.addEventListener('mousedown', ev => { ev.preventDefault(); ev.stopPropagation(); });
          btn.addEventListener('click', ev => {
            ev.stopPropagation();
            const activeScope = _axisPickerScope;
            conCloseAxisPicker();
            if (activeScope === 'board') {
              if (isSpread && typeof window.conSpreadNodes === 'function') window.conSpreadNodes(opt.axis);
              else if (!isSpread && typeof window.conCompactNodes === 'function') window.conCompactNodes(opt.axis);
            } else {
              if (isSpread) window.conCtxSpreadSelected(opt.axis);
              else window.conCtxCompactSelected(opt.axis);
            }
          });
          picker.appendChild(btn);
        });

        picker.classList.add('active');
        const anchor = event && (event.currentTarget || event.target);
        if (anchor && typeof anchor.getBoundingClientRect === 'function') {
          const rect = anchor.getBoundingClientRect();
          const pw = picker.offsetWidth || 210;
          const ph = picker.offsetHeight || 105;
          let x = rect.left;
          let y = rect.bottom + 6;
          if (x + pw > window.innerWidth - 6) x = window.innerWidth - pw - 6;
          if (y + ph > window.innerHeight - 6) y = rect.top - ph - 6;
          picker.style.left = Math.max(6, x) + 'px';
          picker.style.top = Math.max(6, y) + 'px';
        }
      }
      window.conOpenAxisPicker = global.conOpenAxisPicker = conOpenAxisPicker;

      window.conCompactNodes = function conCompactNodes(axis = 'both') {
        const nodes = conNodes;
        if (nodes.length < 2) return;
        const brd = board();
        const bw = brd.clientWidth, bh = brd.clientHeight;
        const units = [];
        const assignedNodeIds = new Set();
        conGroups.forEach(g => {
          const members = nodes.filter(n => g.nodeIds.includes(n.id));
          if (members.length === 0) return;
          members.forEach(n => assignedNodeIds.add(n.id));
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          members.forEach(n => {
            const w = n.el.offsetWidth || 80, h = n.el.offsetHeight || 28;
            minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + w); maxY = Math.max(maxY, n.y + h);
          });
          const gcx = (minX + maxX) / 2, gcy = (minY + maxY) / 2;
          units.push({
            cx: gcx, cy: gcy, locked: false,
            w: maxX - minX + GROUP_PAD * 2, h: maxY - minY + GROUP_PAD * 2,
            isGroup: true,
            memberOffsets: members.map(n => ({
              n, dx: (n.x + (n.el.offsetWidth || 80) / 2) - gcx, dy: (n.y + (n.el.offsetHeight || 28) / 2) - gcy,
              w: n.el.offsetWidth || 80, h: n.el.offsetHeight || 28,
            })),
          });
        });
        nodes.forEach(n => {
          if (assignedNodeIds.has(n.id)) return;
          const w = n.el.offsetWidth || 80, h = n.el.offsetHeight || 28;
          units.push({ cx: n.x + w / 2, cy: n.y + h / 2, w, h, isGroup: false, node: n, locked: conIsNodeLocked(n) });
        });
        if (units.length < 2) return;
        const centX = units.reduce((s, u) => s + u.cx, 0) / units.length;
        const centY = units.reduce((s, u) => s + u.cy, 0) / units.length;
        const totalMoved = _conCompactRunUnits(units, centX, centY, 6, axis);
        if (totalMoved < 1) { if (typeof mdbToast === 'function') mdbToast('ℹ Already as compact as possible.'); return; }
        conPushUndo();
        const bcx = bw / 2, bcy = bh / 2;
        units.forEach(unit => {
          if (unit.isGroup) {
            unit.memberOffsets.forEach(({ n, dx, dy, w, h }) => {
              n.x = unit.cx + dx - w / 2; n.y = unit.cy + dy - h / 2;
              n.baseX = bcx + (n.x - bcx) / conCurrentZoom; n.baseY = bcy + (n.y - bcy) / conCurrentZoom;
              n.el.style.transition = 'left 0.4s ease, top 0.4s ease';
              n.el.style.left = n.x + 'px'; n.el.style.top = n.y + 'px';
            });
          } else {
            unit.node.x = unit.cx - unit.w / 2; unit.node.y = unit.cy - unit.h / 2;
            unit.node.baseX = bcx + (unit.node.x - bcx) / conCurrentZoom;
            unit.node.baseY = bcy + (unit.node.y - bcy) / conCurrentZoom;
            unit.node.el.style.transition = 'left 0.4s ease, top 0.4s ease';
            if (!unit.locked) { unit.node.el.style.left = unit.node.x + 'px'; unit.node.el.style.top = unit.node.y + 'px'; }
          }
        });
        conRedrawEdges(); conGroupRefitAll();
        setTimeout(() => {
          units.forEach(u => { if (u.isGroup) u.memberOffsets.forEach(({ n }) => { n.el.style.transition = ''; }); else u.node.el.style.transition = ''; });
          conRedrawEdges(); conGroupRefitAll();
        }, 450);
      };

      window.conBoardCtxCompactRegion = function (radius = 220) {
        const brd = board();
        if (!brd || conNodes.length < 2) return;
        const centerX = Number(window._boardCtxNoteX) || (_boardCtxX + 40) || brd.clientWidth / 2;
        const centerY = Number(window._boardCtxNoteY) || (_boardCtxY + 18) || brd.clientHeight / 2;
        const regionRadius = Math.max(140, Number(radius) || 220);
        function boxTouchesRegion(left, top, right, bottom) {
          const nearX = Math.max(left, Math.min(centerX, right));
          const nearY = Math.max(top, Math.min(centerY, bottom));
          return Math.hypot(nearX - centerX, nearY - centerY) <= regionRadius;
        }
        const units = [];
        const assignedNodeIds = new Set();
        conGroups.forEach(g => {
          const members = conNodes.filter(n => g.nodeIds.includes(n.id));
          if (!members.length) return;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          members.forEach(n => {
            const w = n.el.offsetWidth || 80, h = n.el.offsetHeight || 28;
            minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + w); maxY = Math.max(maxY, n.y + h);
          });
          if (!boxTouchesRegion(minX, minY, maxX, maxY)) return;
          const gcx = (minX + maxX) / 2, gcy = (minY + maxY) / 2;
          members.forEach(n => assignedNodeIds.add(n.id));
          units.push({
            cx: gcx, cy: gcy, locked: false,
            w: maxX - minX + GROUP_PAD * 2, h: maxY - minY + GROUP_PAD * 2,
            isGroup: true,
            memberOffsets: members.map(n => ({
              n, dx: (n.x + (n.el.offsetWidth || 80) / 2) - gcx, dy: (n.y + (n.el.offsetHeight || 28) / 2) - gcy,
              w: n.el.offsetWidth || 80, h: n.el.offsetHeight || 28,
            })),
          });
        });
        conNodes.forEach(n => {
          if (assignedNodeIds.has(n.id)) return;
          const w = n.el.offsetWidth || 80, h = n.el.offsetHeight || 28;
          if (!boxTouchesRegion(n.x, n.y, n.x + w, n.y + h)) return;
          units.push({ cx: n.x + w / 2, cy: n.y + h / 2, w, h, isGroup: false, node: n, locked: conIsNodeLocked(n) });
        });
        if (units.length < 2) { if (typeof mdbToast === 'function') mdbToast('ℹ No nearby words to compact here.'); return; }
        const centX = units.reduce((s, u) => s + u.cx, 0) / units.length;
        const centY = units.reduce((s, u) => s + u.cy, 0) / units.length;
        const totalMoved = _conCompactRunUnits(units, centX, centY, 6, axis);
        if (totalMoved < 1) { if (typeof mdbToast === 'function') mdbToast('ℹ Already as compact as possible.'); return; }
        conPushUndo();
        const boardCenterX = brd.clientWidth / 2, boardCenterY = brd.clientHeight / 2;
        units.forEach(unit => {
          if (unit.isGroup) {
            unit.memberOffsets.forEach(({ n, dx, dy, w, h }) => {
              if (conIsNodeLocked(n)) return;
              n.x = unit.cx + dx - w / 2; n.y = unit.cy + dy - h / 2;
              n.baseX = boardCenterX + (n.x - boardCenterX) / conCurrentZoom;
              n.baseY = boardCenterY + (n.y - boardCenterY) / conCurrentZoom;
              n.el.style.transition = 'left 0.4s ease, top 0.4s ease';
              n.el.style.left = n.x + 'px'; n.el.style.top = n.y + 'px';
            });
          } else if (!unit.locked) {
            unit.node.x = unit.cx - unit.w / 2; unit.node.y = unit.cy - unit.h / 2;
            unit.node.baseX = boardCenterX + (unit.node.x - boardCenterX) / conCurrentZoom;
            unit.node.baseY = boardCenterY + (unit.node.y - boardCenterY) / conCurrentZoom;
            unit.node.el.style.transition = 'left 0.4s ease, top 0.4s ease';
            unit.node.el.style.left = unit.node.x + 'px'; unit.node.el.style.top = unit.node.y + 'px';
          }
        });
        conRedrawEdges(); conGroupRefitAll();
        setTimeout(() => {
          units.forEach(u => { if (u.isGroup) u.memberOffsets.forEach(({ n }) => { n.el.style.transition = ''; }); else u.node.el.style.transition = ''; });
          conRedrawEdges(); conGroupRefitAll();
        }, 450);
      };

      // ---- Node formatting helpers ----
      // Returns an array of vocabBank entries for baseWord.
      // Returns all entries across all databases matching the lemma or inflected forms.
      function conLookupDbEntries(baseWord, dbWordOverride) {
        if (typeof vocabBank === 'undefined' || !Array.isArray(vocabBank)) return [];
        const targetWord = dbWordOverride || baseWord;
        if (!targetWord) return [];
        const allMatches = conFindAllDbEntries(targetWord);
        if (allMatches && allMatches.length > 0) {
          return allMatches.map(m => m.entry).filter(Boolean);
        }
        const parts = String(targetWord).trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          const results = [];
          const seen = new Set();
          parts.forEach(p => {
            const matches = conFindAllDbEntries(p);
            matches.forEach(m => {
              if (m && m.entry && !seen.has(m.entry)) {
                seen.add(m.entry);
                results.push(m.entry);
              }
            });
          });
          if (results.length > 0) return results;
        }
        return [];
      }
      window.conLookupDbEntries = conLookupDbEntries;

      function boardTransformCasingText(text, casing) {
        if (!text) return '';
        const s = String(text);
        if (!casing || casing === 'none' || casing === 'smallcaps') return s;
        if (casing === 'uppercase') {
          return s.toUpperCase();
        }
        if (casing === 'lowercase') {
          return s.toLowerCase();
        }
        if (casing === 'titlecase') {
          return s.replace(/\b[a-zA-ZÀ-ÿ]+/g, function (word) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          });
        }
        if (casing === 'sentencecase') {
          return s.toLowerCase().replace(/(^\s*|\.\s+|\!\s+|\?\s+|<br\s*\/?>\s*)([a-zA-ZÀ-ÿ])/gi, function (match, sep, char) {
            return sep + char.toUpperCase();
          });
        }
        return s;
      }
      window.boardTransformCasingText = boardTransformCasingText;

      // Each node stores: node.fmt = { bold, italic, underline, strike, showTrans, showIpa, casing, maxWidth }
      function conGetNodeFmt(node) {
        if (!node.fmt) {
          node.fmt = {
            bold: false,
            italic: false,
            underline: false,
            strike: false,
            showTrans: false,
            showIpa: false,
            casing: 'none',
            maxWidth: null // null = unconstrained; positive number = pixel cap with word-wrap
          };
        }
        if (typeof node.fmt.strike !== 'boolean') node.fmt.strike = false;
        if (typeof node.fmt.casing !== 'string') node.fmt.casing = 'none';
        if (node.fmt.maxWidth !== null && typeof node.fmt.maxWidth !== 'number') node.fmt.maxWidth = null;
        return node.fmt;
      }

      function conRenderNodeLabel(node) {
        if (!node) return;
        node._cachedW = undefined;
        node._cachedH = undefined;
        node.w = undefined;
        node.h = undefined;
        // --- Random Number Node ---
        if (node && node.isRandom) {
          const val = (node.randomValue != null) ? node.randomValue : node.randomMin;
          const iconHtml = `<img src="../assets/icons/dice.svg" class="btn-icon con-random-dice-icon" alt="" style="width:14px;height:14px;margin-right:5px;vertical-align:-2px;pointer-events:none;display:inline-block;" />`;
          const randomHtml = `<span class="con-node-word-row con-random-node-row" style="display:inline-flex;align-items:center;font-weight:700;">${iconHtml}<span class="con-random-digits">${val}</span></span>`;

          node.el.classList.toggle('con-node-random', true);
          node.el.classList.remove('con-node-timer', 'con-timer-running', 'con-timer-warning', 'con-timer-ended');

          const _savedResizer = node.el.querySelector('.con-node-resizer');
          const _savedEmojiDot = node.el.querySelector('.con-emoji-dot');
          const _savedPresetBtn = node.el.querySelector('.con-node-preset-btn');
          const _savedNoteBtn = node.el.querySelector('.con-node-note-btn');
          const _savedStarBtn = node.el.querySelector('.con-node-star-btn');
          const _savedCompBadge = node.el.querySelector('.con-node-comp-badge');
          node.el.innerHTML = randomHtml;
          if (_savedResizer) node.el.appendChild(_savedResizer);
          if (_savedEmojiDot) node.el.appendChild(_savedEmojiDot);
          if (_savedPresetBtn) node.el.appendChild(_savedPresetBtn);
          if (_savedNoteBtn) node.el.appendChild(_savedNoteBtn);
          if (_savedStarBtn) node.el.appendChild(_savedStarBtn);
          if (typeof conUpdateNodeNoteButton === 'function') conUpdateNodeNoteButton(node);
          if (typeof conUpdateNodeCompetenceBadge === 'function') {
            conUpdateNodeCompetenceBadge(node);
          } else if (_savedCompBadge) {
            node.el.appendChild(_savedCompBadge);
          }
          if (node.nodeNumber != null && typeof conApplyEntityBadge === 'function') {
            conApplyEntityBadge(node.el, node.nodeNumber, node.nodeNumberFormat, 'node');
          }
          node.el.style.display = 'inline-flex';
          node.el.style.flexDirection = 'column';
          node.el.style.alignItems = 'center';
          node.el.style.justifyContent = 'center';
          conApplyNodeShape(node, node.shape);
          return;
        }

        if (node && node.isTimer) {
          const displaySec = (typeof node.remainingSec === 'number') ? node.remainingSec : (node.durationSec || 0);
          const timeStr = conFormatDurationSec(displaySec);
          const isWarn = node.timerState === 'running' && displaySec > 0 && displaySec <= 60;
          const isEnded = node.timerState === 'ended' || (node.timerState === 'running' && displaySec <= 0);
          const isRunning = node.timerState === 'running';

          node.el.classList.toggle('con-node-timer', true);
          node.el.classList.toggle('con-timer-running', isRunning);
          node.el.classList.toggle('con-timer-warning', isWarn);
          node.el.classList.toggle('con-timer-ended', isEnded);
          node.el.classList.remove('con-node-random', 'con-node-sound', 'con-sound-playing', 'con-sound-paused');

          const iconHtml = `<img src="../assets/icons/clock.svg" class="btn-icon" alt="" style="width:14px;height:14px;margin-right:5px;vertical-align:-2px;pointer-events:none;display:inline-block;" />`;
          const timerHtml = `<span class="con-node-word-row con-timer-node-row" style="display:inline-flex;align-items:center;font-weight:700;">${iconHtml}<span class="con-timer-digits">${timeStr}</span></span>`;

          const _savedResizer = node.el.querySelector('.con-node-resizer');
          const _savedEmojiDot = node.el.querySelector('.con-emoji-dot');
          const _savedPresetBtn = node.el.querySelector('.con-node-preset-btn');
          const _savedNoteBtn = node.el.querySelector('.con-node-note-btn');
          const _savedStarBtn = node.el.querySelector('.con-node-star-btn');
          const _savedCompBadge = node.el.querySelector('.con-node-comp-badge');
          node.el.innerHTML = timerHtml;
          if (_savedResizer) node.el.appendChild(_savedResizer);
          if (_savedEmojiDot) node.el.appendChild(_savedEmojiDot);
          if (_savedPresetBtn) node.el.appendChild(_savedPresetBtn);
          if (_savedNoteBtn) node.el.appendChild(_savedNoteBtn);
          if (_savedStarBtn) node.el.appendChild(_savedStarBtn);
          if (typeof conUpdateNodeNoteButton === 'function') conUpdateNodeNoteButton(node);
          if (typeof conUpdateNodeCompetenceBadge === 'function') {
            conUpdateNodeCompetenceBadge(node);
          } else if (_savedCompBadge) {
            node.el.appendChild(_savedCompBadge);
          }
          if (node.nodeNumber != null && typeof conApplyEntityBadge === 'function') {
            conApplyEntityBadge(node.el, node.nodeNumber, node.nodeNumberFormat, 'node');
          }
          node.el.style.display = 'inline-flex';
          node.el.style.flexDirection = 'column';
          node.el.style.alignItems = 'center';
          node.el.style.justifyContent = 'center';
          conApplyNodeShape(node, node.shape);
          return;
        }

        // --- Sound Node ---
        if (node && node.isSound) {
          const soundTitle = node.soundName || node.text || node.baseWord || 'Audio';
          const isPlaying = node.soundState === 'playing';
          const isPaused = node.soundState === 'paused';
          const curTime = (typeof node.soundCurrentTime === 'number') ? node.soundCurrentTime : 0;
          const durTime = (typeof node.soundDuration === 'number') ? node.soundDuration : 0;
          let timeStr = '';
          if (durTime > 0) {
            timeStr = conFormatDurationSec(Math.round(curTime)) + ' / ' + conFormatDurationSec(Math.round(durTime));
          }

          node.el.classList.toggle('con-node-sound', true);
          node.el.classList.toggle('con-sound-playing', isPlaying);
          node.el.classList.toggle('con-sound-paused', isPaused);
          node.el.classList.remove('con-node-timer', 'con-timer-running', 'con-timer-warning', 'con-timer-ended', 'con-node-random');

          const iconHtml = `<img src="../assets/icons/volume.svg" class="btn-icon con-sound-icon" alt="" style="width:14px;height:14px;margin-right:5px;vertical-align:-2px;pointer-events:none;display:inline-block;" />`;
          const digitsHtml = timeStr ? `<span class="con-sound-digits" style="font-size:0.8em;opacity:0.8;margin-left:6px;font-variant-numeric:tabular-nums;font-weight:600;">${timeStr}</span>` : `<span class="con-sound-digits" style="display:none;"></span>`;
          const soundHtml = `<span class="con-node-word-row con-sound-node-row" style="display:inline-flex;align-items:center;font-weight:700;">${iconHtml}<span class="con-sound-title-text">${soundTitle}</span>${digitsHtml}</span>`;

          const _savedResizer = node.el.querySelector('.con-node-resizer');
          const _savedEmojiDot = node.el.querySelector('.con-emoji-dot');
          const _savedPresetBtn = node.el.querySelector('.con-node-preset-btn');
          const _savedNoteBtn = node.el.querySelector('.con-node-note-btn');
          const _savedStarBtn = node.el.querySelector('.con-node-star-btn');
          const _savedCompBadge = node.el.querySelector('.con-node-comp-badge');
          node.el.innerHTML = soundHtml;
          if (_savedResizer) node.el.appendChild(_savedResizer);
          if (_savedEmojiDot) node.el.appendChild(_savedEmojiDot);
          if (_savedPresetBtn) node.el.appendChild(_savedPresetBtn);
          if (_savedNoteBtn) node.el.appendChild(_savedNoteBtn);
          if (_savedStarBtn) node.el.appendChild(_savedStarBtn);
          if (typeof conUpdateNodeNoteButton === 'function') conUpdateNodeNoteButton(node);
          if (typeof conUpdateNodeCompetenceBadge === 'function') {
            conUpdateNodeCompetenceBadge(node);
          } else if (_savedCompBadge) {
            node.el.appendChild(_savedCompBadge);
          }
          if (node.nodeNumber != null && typeof conApplyEntityBadge === 'function') {
            conApplyEntityBadge(node.el, node.nodeNumber, node.nodeNumberFormat, 'node');
          }
          node.el.style.display = 'inline-flex';
          node.el.style.flexDirection = 'column';
          node.el.style.alignItems = 'center';
          node.el.style.justifyContent = 'center';
          conApplyNodeShape(node, node.shape);
          return;
        }

        // --- Link / Bookmark Node ---
        if (node && (node.isLink || node.isBookmark || node.type === 'link')) {
          const linkTitle = node.linkTitle || node.title || node.baseWord || (node.el && (node.el.dataset.baseWord || node.el.textContent.trim())) || 'Link';
          const subTitle = node.linkSubTitle || '';
          const linkType = node.linkType || 'web';

          let iconName = 'links.svg';
          if (linkType === 'canvas') iconName = 'arrow-right.svg';
          else if (linkType === 'board') iconName = 'board.svg';
          else if (linkType === 'doc') iconName = 'document-editor.svg';
          else if (linkType === 'grades') iconName = 'grade-sheet.svg';
          else if (linkType === 'suite') iconName = 'file-text.svg';

          node.el.classList.add('con-node-link');
          node.el.classList.remove('con-node-sound', 'con-sound-playing', 'con-sound-paused', 'con-node-timer', 'con-timer-running', 'con-timer-warning', 'con-timer-ended', 'con-node-random');

          const iconHtml = `<img src="../assets/icons/${iconName}" class="btn-icon con-link-icon" alt="" style="width:14px;height:14px;margin-right:6px;vertical-align:-2px;pointer-events:none;display:inline-block;" />`;
          const subTitleHtml = subTitle ? `<span class="con-link-sub-pill" title="${String(subTitle).replace(/"/g,'&quot;')}">${String(subTitle).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>` : '';

          let tagsHtml = '';
          if (Array.isArray(node.tags) && node.tags.length > 0) {
            tagsHtml = `<span class="con-link-tags-row" style="display:flex;gap:4px;margin-top:3px;font-size:0.7em;opacity:0.85;">` +
              node.tags.slice(0, 3).map(t => `<span class="con-link-tag-chip" style="background:#e8f0fe;border:1px solid #555555;padding:0 4px;border-radius:3px;">${String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`).join('') +
              (node.tags.length > 3 ? `<span style="font-size:0.85em;align-self:center;">+${node.tags.length - 3}</span>` : '') +
              `</span>`;
          }

          const launchBtnHtml = `<button type="button" class="con-link-launch-badge" title="Open Link" onclick="event.stopPropagation(); if (typeof window.conActivateLinkNode === 'function') window.conActivateLinkNode('${node.id}');" style="background:#e2c96e;border:1px solid #333333;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;box-shadow:1px 1px 0 #333;"><img src="../assets/icons/arrow-right.svg" style="width:9px;height:9px;pointer-events:none;" alt="" /></button>`;

          const metaRowHtml = (subTitleHtml || launchBtnHtml) ? `<span class="con-link-meta-row">${subTitleHtml}${launchBtnHtml}</span>` : '';
          const linkHtml = `<span class="con-node-word-row con-link-node-row">${iconHtml}<span class="con-link-title-text">${String(linkTitle).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span></span>${metaRowHtml}${tagsHtml}`;

          const _savedResizer = node.el.querySelector('.con-node-resizer');
          const _savedEmojiDot = node.el.querySelector('.con-emoji-dot');
          const _savedPresetBtn = node.el.querySelector('.con-node-preset-btn');
          const _savedNoteBtn = node.el.querySelector('.con-node-note-btn');
          const _savedStarBtn = node.el.querySelector('.con-node-star-btn');
          const _savedCompBadge = node.el.querySelector('.con-node-comp-badge');
          node.el.innerHTML = linkHtml;
          if (_savedResizer) node.el.appendChild(_savedResizer);
          if (_savedEmojiDot) node.el.appendChild(_savedEmojiDot);
          if (_savedPresetBtn) node.el.appendChild(_savedPresetBtn);
          if (_savedNoteBtn) node.el.appendChild(_savedNoteBtn);
          if (_savedStarBtn) node.el.appendChild(_savedStarBtn);
          if (typeof conUpdateNodeNoteButton === 'function') conUpdateNodeNoteButton(node);
          if (typeof conUpdateNodeCompetenceBadge === 'function') {
            conUpdateNodeCompetenceBadge(node);
          } else if (_savedCompBadge) {
            node.el.appendChild(_savedCompBadge);
          }
          if (node.nodeNumber != null && typeof conApplyEntityBadge === 'function') {
            conApplyEntityBadge(node.el, node.nodeNumber, node.nodeNumberFormat, 'node');
          }
          node.el.style.display = 'inline-flex';
          node.el.style.flexDirection = 'column';
          node.el.style.alignItems = 'center';
          node.el.style.justifyContent = 'center';
          conApplyNodeShape(node, node.shape);
          return;
        }

        if (node && node.el) {
          node.el.classList.remove('con-node-timer', 'con-timer-running', 'con-timer-warning', 'con-timer-ended', 'con-node-random', 'con-node-sound', 'con-sound-playing', 'con-sound-paused', 'con-node-link');
        }


        // Get the base word (always the raw word text, never the annotated version)
        const baseWord = node.baseWord || node.el.dataset.baseWord || node.el.textContent.trim();
        node.baseWord = baseWord;
        node.el.dataset.baseWord = baseWord;

        const fmt = conGetNodeFmt(node);
        const casing = fmt.casing || window._bcNodeDefaultCasing || 'none';
        const hasMaxWidth = !!(fmt && typeof fmt.maxWidth === 'number' && fmt.maxWidth > 0 && node.shape !== 'circle' && node.shape !== 'square');
        // Retrieve DB entries for translation / IPA (supports space-separated multi-word nodes)
        const dbEntries = conLookupDbEntries(baseWord, node.dbWord);

        let wordPart = baseWord;
        if (casing && casing !== 'none' && casing !== 'smallcaps') {
          wordPart = boardTransformCasingText(wordPart, casing);
        }
        // Page badge
        const pageBadge = (node.pageNum != null)
          ? `<span class="con-node-page">(${node.pageNum})</span>`
          : '';
        const relationBadge = node.relation === 'translation'
          ? '<span class="con-node-rel-badge con-node-rel-badge-fr">FR</span>'
          : (node.relation === 'ipa'
            ? '<span class="con-node-rel-badge con-node-rel-badge-ipa">IPA</span>'
            : '');

        function conApplyWordFmt(textStr) {
          let res = textStr;
          if (fmt.underline) res = `<u>${res}</u>`;
          if (fmt.italic) res = `<em>${res}</em>`;
          if (fmt.bold) res = `<strong>${res}</strong>`;
          if (fmt.strike) res = `<s>${res}</s>`;
          return res;
        }

        const isExplicitMultiLine = wordPart.includes('//') || wordPart.includes('\n') || /<br\s*\/?>/i.test(wordPart);
        let wordContent = '';

        if (isExplicitMultiLine) {
          const rawLines = wordPart.split(/\/\/|\r?\n|<br\s*\/?>/i).map(s => s.trim());
          const formattedLines = rawLines.map((line, idx) => {
            const formatted = conApplyWordFmt(line);
            if (idx === rawLines.length - 1) {
              return `${formatted}${relationBadge}${pageBadge}`;
            }
            return formatted;
          });
          wordContent = formattedLines.join('<br>');
        } else {
          wordContent = `${conApplyWordFmt(wordPart)}${relationBadge}${pageBadge}`;
        }

        const smallCapsStyle = (casing === 'smallcaps') ? 'font-variant:small-caps;' : '';
        let multiLineStyle = '';
        if (hasMaxWidth) {
          multiLineStyle = 'display:inline-block;width:100%;text-align:left;white-space:normal;word-break:break-word;';
        } else if (isExplicitMultiLine) {
          multiLineStyle = 'display:inline-block;text-align:center;';
        }
        const combinedStyle = (smallCapsStyle || multiLineStyle) ? ` style="${smallCapsStyle}${multiLineStyle}"` : '';
        const wordRow = `<span class="con-node-word-row"${combinedStyle}>${wordContent}</span>`;

        // Build annotation lines below the word
        let annLines = '';
        if (fmt.showTrans) {
          let transParts;
          if (Array.isArray(fmt.selectedTrans) && fmt.selectedTrans.length) {
            transParts = fmt.selectedTrans;
          } else {
            transParts = dbEntries.map(e => e.french || e.translation).filter(Boolean);
          }
          const annStyle = hasMaxWidth ? ' style="text-align:left;width:100%;"' : '';
          if (transParts.length) annLines += `<div class="con-node-ann con-node-trans"${annStyle}>(${transParts.join(' · ')})</div>`;
        }
        if (fmt.showIpa) {
          const ipaParts = dbEntries.map(e => e.ipa).filter(Boolean);
          const annStyle = hasMaxWidth ? ' style="text-align:left;width:100%;"' : '';
          if (ipaParts.length) annLines += `<div class="con-node-ann con-node-ipa"${annStyle}>[${ipaParts.join(' / ')}]</div>`;
        }

        const el = node.el;
        if (casing === 'smallcaps') {
          el.style.fontVariant = 'small-caps';
        } else {
          el.style.fontVariant = 'normal';
        }
        // Preserve resize handle, emoji dot, preset button, note button, star button, competence badge, and links bar across innerHTML rebuilds
        const _savedResizer = el.querySelector('.con-node-resizer');
        const _savedEmojiDot = el.querySelector('.con-emoji-dot');
        const _savedPresetBtn = el.querySelector('.con-node-preset-btn');
        const _savedNoteBtn = el.querySelector('.con-node-note-btn');
        const _savedStarBtn = el.querySelector('.con-node-star-btn');
        const _savedCompBadge = el.querySelector('.con-node-comp-badge');
        const _savedLinksBar = el.querySelector('.con-node-links-bar');
        node.el.innerHTML = wordRow + annLines;
        if (_savedResizer) el.appendChild(_savedResizer);
        if (_savedEmojiDot) el.appendChild(_savedEmojiDot);
        if (_savedPresetBtn) el.appendChild(_savedPresetBtn);
        if (_savedNoteBtn) el.appendChild(_savedNoteBtn);
        if (_savedStarBtn) el.appendChild(_savedStarBtn);
        if (typeof conUpdateNodeNoteButton === 'function') conUpdateNodeNoteButton(node);
        if (typeof conUpdateNodeCompetenceBadge === 'function') {
          conUpdateNodeCompetenceBadge(node);
        } else if (_savedCompBadge) {
          el.appendChild(_savedCompBadge);
        }
        if (_savedLinksBar) el.appendChild(_savedLinksBar);
        if (typeof conUpdateNodeLinkBadges === 'function') {
          conUpdateNodeLinkBadges(node);
        }
        if (node.nodeNumber != null && typeof conApplyEntityBadge === 'function') {
          conApplyEntityBadge(el, node.nodeNumber, node.nodeNumberFormat, 'node');
        }
        // Keep node content vertically centred for all shapes, align left if hasMaxWidth
        node.el.style.display = 'inline-flex';
        node.el.style.flexDirection = 'column';
        node.el.style.alignItems = hasMaxWidth ? 'flex-start' : 'center';
        node.el.style.justifyContent = 'center';
        node.el.style.textAlign = hasMaxWidth ? 'left' : 'center';
        conApplyNodeShape(node, node.shape);
      }

      function conSyncFmtButtons(node) {
        const fmt = conGetNodeFmt(node);
        document.getElementById('con-fmt-bold').classList.toggle('active', !!fmt.bold);
        document.getElementById('con-fmt-italic').classList.toggle('active', !!fmt.italic);
        document.getElementById('con-fmt-under').classList.toggle('active', !!fmt.underline);
        document.getElementById('con-fmt-strike').classList.toggle('active', !!fmt.strike);

        const casing = fmt.casing || window._bcNodeDefaultCasing || 'none';
        const caseBtn = document.getElementById('con-fmt-case-btn');
        if (caseBtn) {
          caseBtn.classList.toggle('active', casing !== 'none');
        }
        const caseDd = document.getElementById('con-ctx-case-dropdown');
        if (caseDd) {
          caseDd.querySelectorAll('.board-casing-item').forEach(item => {
            item.classList.toggle('active', (item.dataset.case || 'none') === casing);
          });
        }

        // Check DB availability for annotation buttons (supports space-separated multi-word nodes)
        const baseWord = node.baseWord || node.el.dataset.baseWord || node.el.textContent.trim();
        const dbEntries = conLookupDbEntries(baseWord, node.dbWord);

        const hasTrans = dbEntries.some(e => !!(e.french || e.translation));
        const hasIpa = dbEntries.some(e => !!e.ipa);

        const transBtn = document.getElementById('con-fmt-trans');
        const ipaBtn = document.getElementById('con-fmt-ipa');

        if (transBtn) {
          transBtn.disabled = !hasTrans;
          transBtn.style.opacity = hasTrans ? '1' : '0.45';
          transBtn.style.cursor = hasTrans ? 'pointer' : 'default';
          transBtn.title = hasTrans
            ? 'Add French translation node(s)'
            : 'No translation available for this word';
        }

        if (ipaBtn) {
          ipaBtn.disabled = !hasIpa;
          ipaBtn.style.opacity = hasIpa ? '1' : '0.45';
          ipaBtn.style.cursor = hasIpa ? 'pointer' : 'default';
          ipaBtn.title = hasIpa
            ? 'Add IPA node(s)'
            : 'No IPA available for this word';
        }

      }

      function boardPositionCasingDropdown(btn, dd) {
        if (!btn || !dd) return;
        dd.style.display = 'flex';
        dd.style.top = '';
        dd.style.bottom = '';
        dd.style.left = '0';
        dd.style.right = '';

        const btnRect = btn.getBoundingClientRect();
        const ddHeight = dd.offsetHeight || 190;
        const spaceBelow = window.innerHeight - btnRect.bottom;
        const spaceAbove = btnRect.top;

        if (spaceBelow < ddHeight + 10 && spaceAbove > spaceBelow) {
          dd.style.top = 'auto';
          dd.style.bottom = 'calc(100% + 4px)';
        } else {
          dd.style.top = 'calc(100% + 4px)';
          dd.style.bottom = 'auto';
        }

        const ddRect = dd.getBoundingClientRect();
        if (ddRect.right > window.innerWidth - 8) {
          dd.style.left = 'auto';
          dd.style.right = '0';
        }
      }
      window.boardPositionCasingDropdown = boardPositionCasingDropdown;

      window.conCtxToggleCaseDropdown = function (event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        const dd = document.getElementById('con-ctx-case-dropdown');
        const btn = document.getElementById('con-fmt-case-btn');
        if (!dd) return;
        const isVisible = dd.style.display !== 'none';
        const wnDd = document.getElementById('wn-sp-case-dropdown');
        if (wnDd) wnDd.style.display = 'none';
        const splitDd = document.getElementById('con-ctx-split-dropdown');
        if (splitDd) splitDd.style.display = 'none';
        if (isVisible) {
          dd.style.display = 'none';
        } else {
          if (conCtxNodeId) {
            const node = conNodes.find(n => n.id === conCtxNodeId);
            if (node) {
              const fmt = conGetNodeFmt(node);
              const casing = fmt.casing || window._bcNodeDefaultCasing || 'none';
              dd.querySelectorAll('.board-casing-item').forEach(item => {
                item.classList.toggle('active', (item.dataset.case || 'none') === casing);
              });
            }
          }
          boardPositionCasingDropdown(btn, dd);
        }
      };

      window.conCtxSetCasing = function (casingKey) {
        const dd = document.getElementById('con-ctx-case-dropdown');
        if (dd) dd.style.display = 'none';
        if (!conCtxNodeId) return;
        conPushUndo();
        const targets = (conMultiSelected && conMultiSelected.size > 1 && conMultiSelected.has(conCtxNodeId))
          ? conNodes.filter(n => conMultiSelected.has(n.id))
          : [conNodes.find(n => n.id === conCtxNodeId)].filter(Boolean);

        targets.forEach(node => {
          const fmt = conGetNodeFmt(node);
          fmt.casing = casingKey;
          conRenderNodeLabel(node);
        });
        const activeNode = conNodes.find(n => n.id === conCtxNodeId);
        if (activeNode) conSyncFmtButtons(activeNode);
        conRedrawEdges();
      };

      window.conCtxToggleFmt = function (type) {
        if (!conCtxNodeId) return;
        const node = conNodes.find(n => n.id === conCtxNodeId);
        if (!node) return;
        conPushUndo();
        const fmt = conGetNodeFmt(node);
        fmt[type] = !fmt[type];
        conRenderNodeLabel(node);
        conSyncFmtButtons(node);
        conRedrawEdges();
      };

      window.conCtxToggleAnnotation = function (type) {
        if (!conCtxNodeId) return;
        const node = conNodes.find(n => n.id === conCtxNodeId);
        if (!node) return;
        const baseWord = node.baseWord || node.el.dataset.baseWord || node.el.textContent.trim();
        const dbEntries = conLookupDbEntries(baseWord, node.dbWord);

        if (type === 'translation') {
          if (!dbEntries.some(e => !!(e.french || e.translation))) return;
          const choices = conGetTranslationChoices(dbEntries);
          conTransPickerOpen(node, baseWord, choices, 'translation');
          return;
        } else if (type === 'ipa') {
          if (!dbEntries.some(e => !!e.ipa)) return;
          const choices = conGetIpaChoices(dbEntries);
          conTransPickerOpen(node, baseWord, choices, 'ipa');
          return;
        } else if (type === 'etymology') {
          if (!dbEntries.some(e => Array.isArray(e.etymology) ? e.etymology.some(x => String(x || '').trim()) : !!String(e.etymology || '').trim())) return;
          const choices = conGetEtymologyChoices(dbEntries);
          conTransPickerOpen(node, baseWord, choices, 'etymology');
          return;
        }
      };

      window.conCtxToggleMask = function () {
        const id = conCtxNodeId || conSelected;
        const node = conNodes.find(n => n.id === id);
        conCtxClose();
        if (!node) return;
        conPushUndo();
        node.masked = !node.masked;
        node.el.classList.toggle('con-masked', node.masked);
        if (typeof conRedrawEdges === 'function') conRedrawEdges();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'node-mask', nodeId: String(node.id), masked: node.masked });
        }
        if (!node.masked) {
          conPlayRevealAnimation('node', node, node.el);
        }
      };

      // ---- Star / unstar a node's DB entry ----
      function conAddNodeStarBtn(nodeObj) {
        if (typeof vocabBank === 'undefined') return;
        const dbEntry = nodeObj.dbWord
          ? vocabBank.find(w => w.word === nodeObj.dbWord)
          : vocabBank.find(w => stripParens(w.word).toLowerCase() === stripParens(nodeObj.baseWord || '').toLowerCase());
        if (!dbEntry) return;
        if (nodeObj.el.querySelector('.con-node-star-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'con-node-star-btn' + (dbEntry.starred ? ' active' : '');
        btn.textContent = dbEntry.starred ? '★' : '☆';
        btn.title = dbEntry.starred ? 'Unstar' : 'Star in DB';
        btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); conToggleNodeStarDirect(nodeObj); });
        nodeObj.el.appendChild(btn);
      }
      window.conAddNodeStarBtn = conAddNodeStarBtn;

      function conSyncNodeStarState(nodeObj) {
        const btn = nodeObj.el && nodeObj.el.querySelector('.con-node-star-btn');
        if (!btn || typeof vocabBank === 'undefined') return;
        const dbEntry = nodeObj.dbWord
          ? vocabBank.find(w => w.word === nodeObj.dbWord)
          : vocabBank.find(w => stripParens(w.word).toLowerCase() === stripParens(nodeObj.baseWord || '').toLowerCase());
        if (!dbEntry) { btn.remove(); return; }
        btn.textContent = dbEntry.starred ? '★' : '☆';
        btn.classList.toggle('active', !!dbEntry.starred);
        btn.title = dbEntry.starred ? 'Unstar' : 'Star in DB';
      }

      function conRefreshAllNodeStarBtns() {
        const list = (typeof conNodes !== 'undefined' && Array.isArray(conNodes)) ? conNodes : (window.conNodes || []);
        list.forEach(n => {
          if (!n || !n.el) return;
          conAddNodeStarBtn(n);
          conSyncNodeStarState(n);
        });
      }
      window.conRefreshAllNodeStarBtns = global.conRefreshAllNodeStarBtns = conRefreshAllNodeStarBtns;

      // Cross-module exports
      window.conFormatDurationSec = global.conFormatDurationSec = conFormatDurationSec;
      window.conParseTimerSyntax = global.conParseTimerSyntax = conParseTimerSyntax;
      window.conPromptTimerConversion = global.conPromptTimerConversion = conPromptTimerConversion;
      window.conRollRandomNode = global.conRollRandomNode = conRollRandomNode;
      window.conOpenRandomPopover = global.conOpenRandomPopover = conOpenRandomPopover;
      window.conCloseRandomPopover = global.conCloseRandomPopover = conCloseRandomPopover;
      window.conOpenTimerPopover = global.conOpenTimerPopover = conOpenTimerPopover;
      window.conCloseTimerPopover = global.conCloseTimerPopover = conCloseTimerPopover;
      window.conOpenSoundPopover = global.conOpenSoundPopover = conOpenSoundPopover;
      window.conCloseSoundPopover = global.conCloseSoundPopover = conCloseSoundPopover;
      window.conOpenVideoPopover = global.conOpenVideoPopover = conOpenVideoPopover;
      window.conCloseVideoPopover = global.conCloseVideoPopover = conCloseVideoPopover;
      window._conSyncWebBookmark = global._conSyncWebBookmark = _conSyncWebBookmark;
      window.conAddLinkNodeAt = global.conAddLinkNodeAt = conAddLinkNodeAt;
      window.conActivateLinkNode = global.conActivateLinkNode = conActivateLinkNode;
      window.conFindFreePosition = global.conFindFreePosition = conFindFreePosition;
      window.conAddWordAt = global.conAddWordAt = conAddWordAt;
      window.conDuplicateNodeById = global.conDuplicateNodeById = conDuplicateNodeById;
      window.conGetMultiSelectedTargets = global.conGetMultiSelectedTargets = conGetMultiSelectedTargets;
      window.conSyncNodeBasePosition = global.conSyncNodeBasePosition = conSyncNodeBasePosition;
      window.conLookupDbEntries = global.conLookupDbEntries = conLookupDbEntries;
      window.conGetNodeFmt = global.conGetNodeFmt = conGetNodeFmt;
      window.conRenderNodeLabel = global.conRenderNodeLabel = conRenderNodeLabel;
      window.conSyncFmtButtons = global.conSyncFmtButtons = conSyncFmtButtons;
      window.conAddNodeStarBtn = global.conAddNodeStarBtn = conAddNodeStarBtn;
      window.conSyncNodeStarState = global.conSyncNodeStarState = conSyncNodeStarState;

    })();

})(typeof window !== "undefined" ? window : this);
