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


    window.onload = async () => {
      await Promise.resolve(window.__boardUserBootstrapPromise).catch(function () { });
      // Refresh class groups from user data target in case files changed during runtime.
      if (window.Desktop && typeof Desktop.readText === 'function') {
        try {
          const gr = await Desktop.readText('user', 'class-groups.js');
          if (gr?.ok && gr.content) {
            try {
              const fn = new Function('window', gr.content + '\nif (typeof CLASS_GROUPS !== "undefined") window.CLASS_GROUPS = CLASS_GROUPS;\nif (typeof CLASS_GROUPS_META !== "undefined") window.CLASS_GROUPS_META = CLASS_GROUPS_META;\nif (typeof CLASS_GROUPS_DATA !== "undefined") window.CLASS_GROUPS_DATA = CLASS_GROUPS_DATA;');
              fn(window);
            } catch (_) {}
          }
        } catch (e) { /* ignore */ }
      }
      // Restore custom content and settings from backup files if localStorage is missing them
      if (window.Desktop && Desktop.isElectron()) {
        const _restoreArrIfEmpty = async (lsKey, target, file) => {
          try {
            if (localStorage.getItem(lsKey)) return;
            const r = await Desktop.readJson(target, file);
            if (r && r.ok && Array.isArray(r.data) && r.data.length)
              localStorage.setItem(lsKey, JSON.stringify(r.data));
          } catch (e) { }
        };
        await Promise.all([
          _restoreArrIfEmpty(AW_STORAGE_KEY, 'customWordbanks', 'custom-words-backup.json'),
          _restoreArrIfEmpty(MDB_DELETED_KEY, 'customWordbanks', 'deleted-words-backup.json'),
          (async () => {
            try {
              if (localStorage.getItem(BOARD_SAVED_SESSIONS_KEY)) return;
              const r = await Desktop.readJson('user', 'board-sessions-backup.json');
              if (r && r.ok && r.data) localStorage.setItem(BOARD_SAVED_SESSIONS_KEY, JSON.stringify(r.data));
            } catch (e) { }
          })(),
          (async () => {
            try {
              if (localStorage.getItem('app_font_size')) return;
              const r = await Desktop.readJson('user', 'ui-prefs.json');
              if (r && r.ok && r.data && r.data.fontSize) {
                applyFontSize(r.data.fontSize, false);
                try { localStorage.setItem('app_font_size', r.data.fontSize); } catch (e) { }
              }
            } catch (e) { }
          })(),
        ]);
      }
      // Merge custom words from localStorage into vocabBank
      if (typeof window.awLoadCustomWords === 'function') window.awLoadCustomWords();
      if (typeof window.historyInit === 'function') window.historyInit();
      if (typeof window.initClassGroupSelector === 'function') window.initClassGroupSelector();
      if (typeof window.bpUpdateBtn === 'function') window.bpUpdateBtn();
      if (typeof window.initBoardSessionAutosave === 'function') window.initBoardSessionAutosave();
      if (typeof window.boardConsumePendingOpenRequestFromQuery === 'function') await window.boardConsumePendingOpenRequestFromQuery();
      const _initBrd = document.getElementById('constellation-board');
      if (_initBrd) {
        const _pIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
        const _initSnapH = (typeof conPageSnapshots !== 'undefined' && conPageSnapshots[_pIdx]?.boardHeight)
          || (() => {
            try {
              const s = sessionStorage.getItem('cmt-board-expanded-height-' + _pIdx) || sessionStorage.getItem('cmt-board-expanded-height');
              const v = parseInt(s, 10);
              return (!isNaN(v) && v > 0) ? v : null;
            } catch (_) { return null; }
          })();
        if (_initSnapH && _initSnapH > 0) {
          _initBrd.style.height = _initSnapH + 'px';
          if (conPageSnapshots && conPageSnapshots[_pIdx]) {
            conPageSnapshots[_pIdx].boardHeight = _initSnapH;
          }
        }
      }
      // Set timestamp title on fresh load if no title was restored
      const _initTitleInput = document.getElementById('con-title-input');
      if (_initTitleInput && !_initTitleInput.value.trim()) {
        const _initTs = (typeof conMakeTimestampTitle === 'function' ? conMakeTimestampTitle() : (typeof window.conMakeTimestampTitle === 'function' ? window.conMakeTimestampTitle() : ''));
        _initTitleInput.value = _initTs;
        if (window.conSetTitle) window.conSetTitle(_initTs);
      }
      setTimeout(() => {
        if (typeof boardSetAutosaveFingerprint === 'function' && typeof conBuildSessionData === 'function') {
          boardSetAutosaveFingerprint('constellation', conBuildSessionData());
        }
        if (typeof _boardIsDirty !== 'undefined') _boardIsDirty = false;
        window._boardIsDirty = false;
        if (typeof _boardInitComplete !== 'undefined') _boardInitComplete = true;
        window._boardInitComplete = true;
      }, 250);
      setTimeout(() => {
        if (typeof populateAllThemeMenus === 'function') populateAllThemeMenus();
        else if (typeof window.populateAllThemeMenus === 'function') window.populateAllThemeMenus();

        if (typeof populateGrammarMenu === 'function') populateGrammarMenu();
        else if (typeof window.populateGrammarMenu === 'function') window.populateGrammarMenu();

        if (typeof renderTeamSetup === 'function') renderTeamSetup();
        else if (typeof window.renderTeamSetup === 'function') window.renderTeamSetup();

        if (typeof renderMainScoreboard === 'function') renderMainScoreboard();
        else if (typeof window.renderMainScoreboard === 'function') window.renderMainScoreboard();

        if (typeof conImportPopulateThemes === 'function') conImportPopulateThemes();
        else if (typeof window.conImportPopulateThemes === 'function') window.conImportPopulateThemes();

        if (typeof searchInitShortcutMenu === 'function') searchInitShortcutMenu();
        else if (typeof window.searchInitShortcutMenu === 'function') window.searchInitShortcutMenu();

        if (typeof dictPopulateThemeFilter === 'function') dictPopulateThemeFilter();
        else if (typeof window.dictPopulateThemeFilter === 'function') window.dictPopulateThemeFilter();
      }, 0);

      // Defer loading large custom-data DB files until after first paint.
      setTimeout(() => {
        if (typeof scheduleCustomDatabasesInit === 'function') scheduleCustomDatabasesInit();
        else if (typeof window.scheduleCustomDatabasesInit === 'function') window.scheduleCustomDatabasesInit();
      }, 0);

    };

    // ================================================================
    // CONSTELLATION IMPORT FROM VOCAB BANK
    // ================================================================
    let conImportSelected = new Set();
    let conImportFilteredItems = [];
    let conImportShownCount = 200;

    function conNormalizeSourceId(sourceId) {
      const s = String(sourceId || '').trim();
      if (!s) return '';
      if (/^worddb$/i.test(s)) return 'worddb';
      if (/^custom$/i.test(s)) return 'custom';
      return s;
    }

    function conGetItemSourceIds(item) {
      const arr = Array.isArray(item && item._sources) && item._sources.length ? item._sources : [item && item._source];
      return [...new Set(arr.map(conNormalizeSourceId).filter(Boolean))];
    }

    function conImportPopulateThemes() {
      const sel = document.getElementById('con-import-theme');
      if (!sel) return;
      const current = sel.value;
      // Remove all options except the first ("All Themes")
      while (sel.options.length > 1) sel.remove(1);
      const themes = [...new Set(vocabBank.flatMap(i => getItemThemes(i)))].sort();
      themes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = t;
        sel.appendChild(opt);
      });
      // Restore previously selected value if still valid
      if (current && [...sel.options].some(o => o.value === current)) sel.value = current;
    }

    function conImportPopulateKeywords() {
      const sel = document.getElementById('con-import-keyword');
      if (!sel || sel.options.length > 1) return;
      const keywords = [...new Set(vocabBank.flatMap(i => (i.keywords || [])).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      keywords.forEach(k => {
        const opt = document.createElement('option');
        opt.value = k; opt.textContent = k;
        sel.appendChild(opt);
      });
    }

    function conImportPopulateSources() {
      const sel = document.getElementById('con-import-source');
      if (!sel) return;
      const SOURCE_LABELS = { worddb: 'Word DB', custom: 'Custom Added' };
      const sources = [...new Set([
        ...vocabBank.flatMap(conGetItemSourceIds),
        ..._customDbSources.map(conNormalizeSourceId).filter(Boolean)
      ])].sort((a, b) => a.localeCompare(b));
      const current = sel.value;
      sel.innerHTML = '<option value="all">All Sources</option>';
      sources.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = SOURCE_LABELS[s] || s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        sel.appendChild(opt);
      });
      sel.value = sources.includes(current) ? current : 'all';
    }

    function conImportOpen() {
      if (typeof conOpenUniversalImportModal === 'function') {
        conOpenUniversalImportModal('learning', 'wordbanks');
        return;
      }
      conImportSelected.clear();
      conImportPopulateKeywords();
      conImportPopulateSources();
      conImportRender();
      document.getElementById('con-import-overlay').classList.add('active');
    }

    function conImportClose() {
      document.getElementById('con-import-overlay').classList.remove('active');
      conImportSelected.clear();
    }

    function wildcardMatch(pattern, str) {
      if (!pattern) return true;
      const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return re.test(str);
    }

    function wildcardTest(q, ...fields) {
      if (!q) return true;
      const lower = q.toLowerCase();
      const toStr = f => Array.isArray(f) ? f.join(' ') : String(f == null ? '' : f);
      const isWild = lower.includes('*') || lower.includes('?');
      if (isWild) return fields.some(f => wildcardMatch(lower, toStr(f).toLowerCase()));
      return fields.some(f => toStr(f).toLowerCase().includes(lower));
    }

    function conImportGetFiltered() {
      const lvl = document.getElementById('con-import-lvl').value;
      const theme = document.getElementById('con-import-theme').value;
      const pos = document.getElementById('con-import-pos').value;
      const keyword = document.getElementById('con-import-keyword').value;
      const srcSel = document.getElementById('con-import-source');
      const source = srcSel ? conNormalizeSourceId(srcSel.value) : 'all';
      const q = document.getElementById('con-import-search').value.trim().toLowerCase();
      const starredOnly = !!(document.getElementById('con-import-starred-only') && document.getElementById('con-import-starred-only').checked);
      return vocabBank.filter(item => {
        if (lvl !== 'all' && (!item.level || item.level.toLowerCase() !== lvl)) return false;
        if (theme !== 'all' && !getItemThemes(item).includes(theme)) return false;
        if (pos !== 'all' && (!item.partOfSpeech || !(Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [item.partOfSpeech]).some(p => p.toLowerCase() === pos))) return false;
        if (keyword !== 'all' && !(item.keywords || []).includes(keyword)) return false;
        if (source !== 'all' && !conGetItemSourceIds(item).includes(source)) return false;
        if (q && !wildcardTest(q, item.word, item.french, item.german, item.italian, item.english)) return false;
        if (starredOnly && !item.starred) return false;
        return true;
      });
    }

    function conImportRender() {
      conImportFilteredItems = conImportGetFiltered();
      const list = document.getElementById('con-import-word-list');
      if (conImportFilteredItems.length === 0) {
        list.innerHTML = '<em style="color:#999;font-size:0.9rem;">No words match these filters.</em>';
        conImportUpdateCount();
        conImportUpdateFilterCounts();
        return;
      }
      conImportFilteredItems.sort((a, b) => a.word.localeCompare(b.word));

      conImportShownCount = 200;
      const visibleSlice = conImportFilteredItems.slice(0, Math.min(conImportShownCount, conImportFilteredItems.length));
      if (window.DomSync && typeof window.DomSync.patchListByKey === 'function') {
        const oldMore = document.getElementById('con-import-show-more-btn');
        if (oldMore) oldMore.remove();
        window.DomSync.patchListByKey(
          list,
          visibleSlice,
          item => item.word,
          item => {
            const chip = document.createElement('div');
            chip.className = 'con-import-chip';
            const _chipTrans = getTranslation(item);
            chip.innerHTML = item.word + (_chipTrans ? '<span class="chip-translation">(' + _chipTrans + ')</span>' : '');
            chip.onclick = function () {
              if (conImportSelected.has(item.word)) {
                conImportSelected.delete(item.word);
                chip.classList.remove('selected');
              } else {
                conImportSelected.add(item.word);
                chip.classList.add('selected');
              }
              conImportUpdateCount();
            };
            return chip;
          },
          (chip, item) => {
            chip.classList.toggle('selected', conImportSelected.has(item.word));
            chip.classList.toggle('starred', !!item.starred);
          }
        );
      } else {
        list.innerHTML = '';
        conImportRenderChipRange(list, 0, visibleSlice.length);
      }
      conImportAppendShowMore(list);
      conImportUpdateCount();
      conImportUpdateFilterCounts();
    }

    function conImportRenderChipRange(list, start, end) {
      const toRender = conImportFilteredItems.slice(start, end);
      toRender.forEach(item => {
        const chip = document.createElement('div');
        chip.className = 'con-import-chip' + (conImportSelected.has(item.word) ? ' selected' : '') + (item.starred ? ' starred' : '');
        const _chipTrans = getTranslation(item);
        chip.innerHTML = item.word
          + (_chipTrans ? '<span class="chip-translation">(' + _chipTrans + ')</span>' : '');
        chip.onclick = function () {
          if (conImportSelected.has(item.word)) {
            conImportSelected.delete(item.word);
            chip.classList.remove('selected');
          } else {
            conImportSelected.add(item.word);
            chip.classList.add('selected');
          }
          conImportUpdateCount();
        };
        list.appendChild(chip);
      });
    }

    function conImportAppendShowMore(list) {
      const remaining = conImportFilteredItems.length - conImportShownCount;
      if (remaining <= 0) return;
      const wrap = document.createElement('div');
      wrap.id = 'con-import-show-more-btn';
      wrap.style.cssText = 'text-align:center;padding:14px 0 6px;';
      wrap.innerHTML = `<button class="action-btn" onclick="conImportShowMore()">Show ${Math.min(200, remaining)} more <span style="opacity:0.55;font-weight:400;">(${remaining} remaining)</span></button>`;
      list.appendChild(wrap);
    }

    function conImportShowMore() {
      const btn = document.getElementById('con-import-show-more-btn');
      if (btn) btn.remove();
      const list = document.getElementById('con-import-word-list');
      const start = conImportShownCount;
      conImportShownCount = Math.min(conImportShownCount + 200, conImportFilteredItems.length);
      conImportRenderChipRange(list, start, conImportShownCount);
      conImportAppendShowMore(list);
    }

    function conImportUpdateCount() {
      const n = conImportSelected.size;
      document.getElementById('con-import-count').textContent =
        n === 0 ? 'No words selected' : n + ' word' + (n > 1 ? 's' : '') + ' selected';
    }

    function conImportUpdateFilterCounts() {
      const lvl = document.getElementById('con-import-lvl').value;
      const theme = document.getElementById('con-import-theme').value;
      const pos = document.getElementById('con-import-pos').value;
      const keyword = document.getElementById('con-import-keyword').value;
      const srcEl = document.getElementById('con-import-source');
      const source = srcEl ? conNormalizeSourceId(srcEl.value) : 'all';
      const q = document.getElementById('con-import-search').value.trim().toLowerCase();

      function bankWithout(skip) {
        return vocabBank.filter(item => {
          if (skip !== 'lvl' && lvl !== 'all' && (!item.level || item.level.toLowerCase() !== lvl)) return false;
          if (skip !== 'theme' && theme !== 'all' && !getItemThemes(item).includes(theme)) return false;
          if (skip !== 'pos' && pos !== 'all' && !(item.partOfSpeech && (Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [item.partOfSpeech]).some(p => p.toLowerCase() === pos))) return false;
          if (skip !== 'keyword' && keyword !== 'all' && !(item.keywords || []).includes(keyword)) return false;
          if (skip !== 'source' && source !== 'all' && !conGetItemSourceIds(item).includes(source)) return false;
          if (q && !wildcardTest(q, item.word, item.french)) return false;
          return true;
        });
      }

      function applyToSelect(selId, bank, getCounts) {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const counts = getCounts(bank);
        [...sel.options].forEach(opt => {
          const base = opt.text.replace(/\s*\(\d+\)$/, '');
          const c = opt.value === 'all' ? bank.length : (counts[opt.value] || 0);
          opt.text = base + ' (' + c + ')';
          if (opt.value !== 'all') {
            opt.disabled = c === 0;
            opt.style.color = c === 0 ? '#bbb' : '';
          }
        });
      }

      applyToSelect('con-import-lvl', bankWithout('lvl'), bank => {
        const m = {};
        bank.forEach(item => { if (item.level) { const v = item.level.toLowerCase(); m[v] = (m[v] || 0) + 1; } });
        return m;
      });

      applyToSelect('con-import-theme', bankWithout('theme'), bank => {
        const m = {};
        bank.forEach(item => getItemThemes(item).forEach(t => { m[t] = (m[t] || 0) + 1; }));
        return m;
      });

      applyToSelect('con-import-pos', bankWithout('pos'), bank => {
        const m = {};
        bank.forEach(item => {
          (item.partOfSpeech ? (Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [item.partOfSpeech]) : []).filter(Boolean).forEach(p => { const v = p.toLowerCase(); m[v] = (m[v] || 0) + 1; });
        });
        return m;
      });

      applyToSelect('con-import-keyword', bankWithout('keyword'), bank => {
        const m = {};
        bank.forEach(item => (item.keywords || []).forEach(k => { if (k) m[k] = (m[k] || 0) + 1; }));
        return m;
      });

      if (srcEl) {
        applyToSelect('con-import-source', bankWithout('source'), bank => {
          const m = {};
          bank.forEach(item => {
            conGetItemSourceIds(item).forEach(s => {
              m[s] = (m[s] || 0) + 1;
            });
          });
          return m;
        });
      }
    }

    function conImportSelectAll() {
      conImportGetFiltered().forEach(item => conImportSelected.add(item.word));
      conImportRender();
    }

    function conImportClearSel() {
      conImportSelected.clear();
      conImportRender();
    }

    // ================================================================
    // CONSTELLATION — SPREAD / EQUALISE (defined inside IIFE — see above)
    // ================================================================
    function conSpreadNodes_UNUSED() {
      const nodes = conGetNodes();
      if (nodes.length < 2) return;
      const brd = conGetBoard();
      const bw = brd.clientWidth;
      const bh = brd.clientHeight;

      const groups = typeof conGroups !== 'undefined' ? conGroups : [];
      const GROUP_PAD = 18;

      // Build "units" — either a group (rigid body) or a lone node
      // Each unit has: cx, cy, w, h, and a list of members to move
      const units = [];
      const assignedNodeIds = new Set();

      groups.forEach(g => {
        const members = nodes.filter(n => g.nodeIds.includes(n.id));
        if (members.length === 0) return;
        members.forEach(n => assignedNodeIds.add(n.id));
        // Bounding box of the group
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        members.forEach(n => {
          const w = n.el.offsetWidth || 80;
          const h = n.el.offsetHeight || 28;
          minX = Math.min(minX, n.x);
          minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x + w);
          maxY = Math.max(maxY, n.y + h);
        });
        const gw = maxX - minX + GROUP_PAD * 2;
        const gh = maxY - minY + GROUP_PAD * 2;
        units.push({
          cx: (minX + maxX) / 2,
          cy: (minY + maxY) / 2,
          w: gw, h: gh,
          isGroup: true,
          group: g,
          members,
          // Offsets of each member centre relative to group centre
          memberOffsets: members.map(n => ({
            n,
            dx: (n.x + (n.el.offsetWidth || 80) / 2) - (minX + maxX) / 2,
            dy: (n.y + (n.el.offsetHeight || 28) / 2) - (minY + maxY) / 2,
            w: n.el.offsetWidth || 80,
            h: n.el.offsetHeight || 28,
          })),
        });
      });

      // Lone nodes (not in any group)
      nodes.forEach(n => {
        if (assignedNodeIds.has(n.id)) return;
        const w = n.el.offsetWidth || 80;
        const h = n.el.offsetHeight || 28;
        units.push({
          cx: n.x + w / 2,
          cy: n.y + h / 2,
          w, h,
          isGroup: false,
          node: n,
        });
      });

      if (units.length < 2) return;

      const PADDING = 16;
      const ITERATIONS = 120;
      const REPULSE_STRENGTH = 1.0;

      for (let iter = 0; iter < ITERATIONS; iter++) {
        const forces = units.map(() => ({ fx: 0, fy: 0 }));

        for (let i = 0; i < units.length; i++) {
          for (let j = i + 1; j < units.length; j++) {
            const a = units[i], b = units[j];
            const dx = b.cx - a.cx;
            const dy = b.cy - a.cy;
            const overlapX = (a.w / 2 + b.w / 2 + PADDING) - Math.abs(dx);
            const overlapY = (a.h / 2 + b.h / 2 + PADDING) - Math.abs(dy);
            if (overlapX > 0 && overlapY > 0) {
              let pushX = 0, pushY = 0;
              if (overlapX < overlapY) {
                pushX = (overlapX / 2 + 0.5) * Math.sign(dx || 1) * REPULSE_STRENGTH;
              } else {
                pushY = (overlapY / 2 + 0.5) * Math.sign(dy || 1) * REPULSE_STRENGTH;
              }
              forces[i].fx -= pushX; forces[i].fy -= pushY;
              forces[j].fx += pushX; forces[j].fy += pushY;
            }
          }
        }

        for (let i = 0; i < units.length; i++) {
          units[i].cx += forces[i].fx;
          units[i].cy += forces[i].fy;
          const hw = units[i].w / 2, hh = units[i].h / 2;
          units[i].cx = Math.max(hw + 4, Math.min(bw - hw - 4, units[i].cx));
          units[i].cy = Math.max(hh + 4, Math.min(bh - hh - 4, units[i].cy));
        }
      }

      // Intra-group repulsion: spread members within each group
      units.forEach(unit => {
        if (!unit.isGroup || unit.memberOffsets.length < 2) return;
        const members = unit.memberOffsets.map(m => ({
          ...m,
          cx: unit.cx + m.dx,
          cy: unit.cy + m.dy,
        }));
        const INTRA_PAD = 12;
        const INTRA_ITER = 80;
        for (let iter = 0; iter < INTRA_ITER; iter++) {
          const forces = members.map(() => ({ fx: 0, fy: 0 }));
          for (let i = 0; i < members.length; i++) {
            for (let j = i + 1; j < members.length; j++) {
              const a = members[i], b = members[j];
              const dx = b.cx - a.cx;
              const dy = b.cy - a.cy;
              const overlapX = (a.w / 2 + b.w / 2 + INTRA_PAD) - Math.abs(dx);
              const overlapY = (a.h / 2 + b.h / 2 + INTRA_PAD) - Math.abs(dy);
              if (overlapX > 0 && overlapY > 0) {
                let pushX = 0, pushY = 0;
                if (overlapX < overlapY) {
                  pushX = (overlapX / 2 + 0.5) * Math.sign(dx || 1);
                } else {
                  pushY = (overlapY / 2 + 0.5) * Math.sign(dy || 1);
                }
                forces[i].fx -= pushX; forces[i].fy -= pushY;
                forces[j].fx += pushX; forces[j].fy += pushY;
              }
            }
          }
          members.forEach((m, i) => { m.cx += forces[i].fx; m.cy += forces[i].fy; });
        }
        // Write back new offsets relative to group centre (centre of mass stays fixed)
        members.forEach((m, i) => {
          unit.memberOffsets[i].dx = m.cx - unit.cx;
          unit.memberOffsets[i].dy = m.cy - unit.cy;
        });
        // Expand group bounding box to fit new member positions
        let maxHW = 0, maxHH = 0;
        unit.memberOffsets.forEach(m => {
          maxHW = Math.max(maxHW, Math.abs(m.dx) + m.w / 2);
          maxHH = Math.max(maxHH, Math.abs(m.dy) + m.h / 2);
        });
        unit.w = (maxHW + GROUP_PAD) * 2;
        unit.h = (maxHH + GROUP_PAD) * 2;
      });

      // Apply final positions
      units.forEach(unit => {
        if (unit.isGroup) {
          // Move each member to its offset from the new group centre
          unit.memberOffsets.forEach(({ n, dx, dy, w, h }) => {
            if (conIsNodeLocked(n)) return;
            const nx = unit.cx + dx - w / 2;
            const ny = unit.cy + dy - h / 2;
            n.x = nx; n.y = ny;
            n.el.style.transition = 'left 0.4s ease, top 0.4s ease';
            n.el.style.left = nx + 'px';
            n.el.style.top = ny + 'px';
          });
        } else {
          if (!unit.locked) {
            const nx = unit.cx - unit.w / 2;
            const ny = unit.cy - unit.h / 2;
            unit.node.x = nx; unit.node.y = ny;
            unit.node.el.style.transition = 'left 0.4s ease, top 0.4s ease';
            unit.node.el.style.left = nx + 'px';
            unit.node.el.style.top = ny + 'px';
          }
        }
      });

      conRedrawEdges();
      if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
      setTimeout(() => {
        units.forEach(unit => {
          if (unit.isGroup) unit.memberOffsets.forEach(({ n }) => { n.el.style.transition = ''; });
          else unit.node.el.style.transition = '';
        });
        conRedrawEdges();
        if (typeof conGroupRefitAll === 'function') conGroupRefitAll();
      }, 450);
    }

    function conImportConfirm() {
      if (conImportSelected.size === 0) return;
      const words = [...conImportSelected].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      conImportClose();
      conImportTrayOpen(words);
    }

    // ================================================================
    // IMPORT STAGING TRAY
    // ================================================================
    let _trayWords = [];
    let _trayDragWord = null;
    let _trayDragChip = null;

    function conImportTrayOpen(words) {
      _trayWords = words.slice();
      _conTrayRender();
      document.getElementById('con-import-tray').classList.add('active');
    }

    function conImportTrayClose() {
      document.getElementById('con-import-tray').classList.remove('active');
      _trayWords = [];
    }

    function _conTrayRender() {
      const list = document.getElementById('con-import-tray-list');
      if (!list) return;
      list.innerHTML = '';
      _trayWords.forEach(word => {
        const chip = document.createElement('div');
        chip.className = 'con-tray-chip';
        chip.textContent = word;
        chip.addEventListener('mousedown', _conTrayChipDown);
        list.appendChild(chip);
      });
      const countEl = document.getElementById('con-import-tray-count');
      if (countEl) countEl.textContent = _trayWords.length;
      if (_trayWords.length === 0) conImportTrayClose();
    }

    function _conTrayChipDown(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      _trayDragWord = e.currentTarget.textContent.trim();
      _trayDragChip = e.currentTarget;
      _trayDragChip.classList.add('tray-dragging');
      const ghost = document.getElementById('con-import-ghost');
      ghost.textContent = _trayDragWord;
      ghost.style.left = (e.clientX + 12) + 'px';
      ghost.style.top = (e.clientY - 16) + 'px';
      ghost.style.display = 'block';
      document.addEventListener('mousemove', _conTrayMouseMove);
      document.addEventListener('mouseup', _conTrayMouseUp);
    }

    function _conTrayMouseMove(e) {
      const ghost = document.getElementById('con-import-ghost');
      ghost.style.left = (e.clientX + 12) + 'px';
      ghost.style.top = (e.clientY - 16) + 'px';
      const brd = document.getElementById('constellation-board');
      if (brd) {
        const r = brd.getBoundingClientRect();
        const over = e.clientX >= r.left && e.clientX <= r.right
          && e.clientY >= r.top && e.clientY <= r.bottom;
        ghost.classList.toggle('over-board', over);
      }
    }

    function _conTrayMouseUp(e) {
      document.removeEventListener('mousemove', _conTrayMouseMove);
      document.removeEventListener('mouseup', _conTrayMouseUp);
      const ghost = document.getElementById('con-import-ghost');
      ghost.style.display = 'none';
      ghost.classList.remove('over-board');
      if (_trayDragChip) { _trayDragChip.classList.remove('tray-dragging'); _trayDragChip = null; }
      const word = _trayDragWord;
      _trayDragWord = null;
      if (!word) return;
      const brd = document.getElementById('constellation-board');
      if (!brd) return;
      const r = brd.getBoundingClientRect();
      const over = e.clientX >= r.left && e.clientX <= r.right
        && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!over) return;
      if (typeof window.conPushUndo === 'function') window.conPushUndo();
      const x = e.clientX - r.left + brd.scrollLeft;
      const y = e.clientY - r.top + brd.scrollTop;
      if (typeof window.conAddWordAt === 'function') window.conAddWordAt(word, x, y);
      _trayWords = _trayWords.filter(w => w !== word);
      _conTrayRender();
    }

    function conImportTrayDropAll() {
      if (!_trayWords.length) return;
      const brd = document.getElementById('constellation-board');
      if (!brd) return;
      if (typeof window.conPushUndo === 'function') window.conPushUndo();
      const startX = brd.scrollLeft + 40;
      const startY = brd.scrollTop + Math.max(40, Math.round(brd.clientHeight / 2 - (_trayWords.length * 44) / 2));
      _trayWords.forEach((word, i) => {
        if (typeof window.conAddWordAt === 'function') window.conAddWordAt(word, startX, startY + i * 44);
      });
      _trayWords = [];
      _conTrayRender();
    }

    // ── Stubs for variables from the removed textual-analysis section ──
    let taWordNotes = [];
    let taLines = [];
    function taFindToken() { return null; }
    function taGetTitle() { return ''; }

    // ================================================================
    // EMOJI REACTION SYSTEM (nodes & notes)
    // ================================================================
    (function () {
      const CON_EMOJIS = [
        { e: '❤', label: 'Heart' },
        { e: '', label: 'Happy' },
        { e: '', label: 'Sad' },
        { e: '', label: 'Surprised' },
        { e: '', label: 'Puzzled' },
        { e: '', label: 'Angry' },
        { e: '', label: 'Disgust' },
        { e: '', label: 'Shocked' },
        { e: '', label: 'Scared' },
        { e: '', label: 'Sad / Down' },
        { e: '', label: 'Relieved' },
        { e: '', label: 'In love' },
        { e: '', label: 'Frustrated' },
        { e: '', label: 'Nervous' },
        { e: '', label: 'Excited' }
      ];

      let _emojiTarget = null; // { type: 'node'|'note', id }

      function _pickerClose() {
        const picker = document.getElementById('con-emoji-picker');
        if (picker) picker.classList.remove('active');
        _emojiTarget = null;
      }

      function _pickerOpen(e, type, id) {
        e.preventDefault(); e.stopPropagation();
        const picker = document.getElementById('con-emoji-picker');
        if (!picker) return;
        _emojiTarget = { type, id };
        picker.classList.add('active');
        const rect = e.currentTarget.getBoundingClientRect();
        const pw = picker.offsetWidth || 110;
        const ph = picker.offsetHeight || 110;
        let x = rect.right + 6;
        let y = rect.top;
        if (x + pw > window.innerWidth - 4) x = rect.left - pw - 6;
        if (y + ph > window.innerHeight - 4) y = window.innerHeight - ph - 4;
        picker.style.left = Math.max(4, x) + 'px';
        picker.style.top = Math.max(4, y) + 'px';
      }

      function _applyEmoji(type, id, emoji) {
        if (type === 'node') {
          const node = (window.conGetNodes ? window.conGetNodes() : []).find(n => n.id === id);
          if (!node || !node.el) return;
          _updateNodeDot(node);
          // Place a board-level draggable sticker near the node
          if (emoji) {
            const board = document.getElementById('constellation-board');
            if (board) {
              if (!window._conBoardStickers) window._conBoardStickers = [];
              const sd = {
                id: 'bms' + Date.now(),
                emoji: emoji,
                x: (Number(node.x) || parseInt(node.el.style.left) || 0) + (node.el.offsetWidth || 0) - 10,
                y: (Number(node.y) || parseInt(node.el.style.top) || 0) - 10,
                size: 40
              };
              window._conBoardStickers.push(sd);
              if (typeof conNoteBuildSticker === 'function') {
                conNoteBuildSticker(sd, { emojiStickers: window._conBoardStickers }, board);
              }
              if (window._conMirrorSend) {
                window._conMirrorSend({ type: 'sticker-add', target: 'board', sticker: sd });
              }
            }
          }
        } else if (type === 'note') {
          const note = typeof conNotes !== 'undefined' ? conNotes.find(n => n.id === id) : null;
          if (note) {
            note.emoji = emoji || null;
            const noteEl = typeof wnGetNoteElementById === 'function' ? wnGetNoteElementById(id) : null;
            if (noteEl) _updateNoteDot(noteEl, emoji);
          }
          if (emoji && window.conNoteAddEmojiSticker) {
            window.conNoteAddEmojiSticker(id, emoji);
          }
        }
      }

      function _updateNodeDot(node) {
        if (!node || !node.el) return;
        const dot = node.el.querySelector('.con-emoji-dot');
        if (!dot) return;
        dot.textContent = '•';
        dot.classList.remove('has-emoji');
        dot.title = 'Add reaction';
      }

      function _updateNoteDot(noteEl, emoji) {
        if (!noteEl) return;
        const dot = noteEl.querySelector('.con-emoji-dot');
        if (!dot) return;
        dot.textContent = emoji || '•';
        dot.classList.toggle('has-emoji', !!emoji);
        dot.title = emoji ? 'Change reaction' : 'Add reaction';
      }

      function _makeEmojiDot(type, id) {
        const dot = document.createElement('button');
        dot.className = 'con-emoji-dot';
        dot.textContent = '•';
        dot.title = 'Add reaction';
        dot.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
        dot.addEventListener('click', e => _pickerOpen(e, type, id));
        return dot;
      }

      // Called from conAttachNodeEvents
      window.conEmojiAttachNodeDot = function (id, el) {
        el.appendChild(_makeEmojiDot('node', id));
      };

      // Called from conNoteBuild
      window.conEmojiAttachNoteDot = function (id, noteEl) {
        noteEl.appendChild(_makeEmojiDot('note', id));
      };

      // Called after conRenderNodeLabel (re-syncs dot that was preserved)
      window.conEmojiRestoreNodeDotAndBadge = function (node) {
        if (!node || !node.el) return;
        if (!node.el.querySelector('.con-emoji-dot')) {
          window.conEmojiAttachNodeDot(node.id, node.el);
        }
        _updateNodeDot(node);
      };

      // Build picker buttons once DOM is ready
      function _initPicker() {
        const picker = document.getElementById('con-emoji-picker');
        if (!picker || picker.dataset.built) return;
        picker.dataset.built = '1';
        CON_EMOJIS.forEach(({ e, label }) => {
          const btn = document.createElement('button');
          btn.textContent = e;
          btn.title = label;
          btn.addEventListener('click', ev => {
            ev.stopPropagation();
            if (!_emojiTarget) return;
            _applyEmoji(_emojiTarget.type, _emojiTarget.id, e);
            _pickerClose();
          });
          picker.appendChild(btn);
        });
        // Remove reaction button (spans full width in 4th row)
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'x';
        removeBtn.title = 'Remove reaction';
        removeBtn.style.cssText = 'grid-column: 1/-1; font-size:13px; color:#888; border-top:1px solid #eee; border-radius:0 0 6px 6px;';
        removeBtn.addEventListener('click', ev => {
          ev.stopPropagation();
          if (!_emojiTarget) return;
          _applyEmoji(_emojiTarget.type, _emojiTarget.id, null);
          _pickerClose();
        });
        picker.appendChild(removeBtn);
        document.addEventListener('mousedown', ev => {
          if (!picker.classList.contains('active')) return;
          if (!picker.contains(ev.target)) _pickerClose();
        }, true);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initPicker);
      } else {
        _initPicker();
      }
    })();
    // ================================================================
    // END EMOJI REACTION SYSTEM
    // ================================================================

    // ================================================================
    // BOARD CUSTOMISE
    // ================================================================

    const _BC_NOTE_TEXT_DEFAULTS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#111111'];
    const _BC_NODE_BORDER_DEFAULTS = ['#111111', '#555555', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0d9488', '#2563eb', '#0284c7', '#7c3aed', '#db2777'];
    const _BC_NOTE_BORDER_DEFAULTS = ['#111111', '#555555', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0d9488', '#2563eb', '#0284c7', '#7c3aed', '#db2777'];
    const _BC_PEN_PRESET_DEFAULTS = [
      { name: 'Red', color: '#e53935', opacity: 1, thickness: 4, shape: '' },
      { name: 'Highlighter', color: '#fdd835', opacity: 0.4, thickness: 16, shape: '' },
      { name: 'Blue thin', color: '#1e88e5', opacity: 1, thickness: 2, shape: '' },
    ];
    const _BC_PEN_SHAPE_OPTIONS = [
      { value: '', label: ' Freehand' },
      { value: 'rect', label: '▭ Rect' },
      { value: 'circle', label: '⬭ Ellipse' },
      { value: 'diamond', label: '◇ Diamond' },
      { value: 'polygon', label: '⬡ Polygon' },
      { value: 'line', label: '╲ Line' },
      { value: 'arrow', label: '→ Arrow' },
    ];

    // 20 font options: 10 serif, 5 sans-serif, 5 quirky
    const _BC_FONT_OPTIONS = [
      // ── Serif ─────────────────────────────────────────────────────────
      { group: 'Serif', label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
      { group: 'Serif', label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
      { group: 'Serif', label: 'Garamond', value: 'Garamond, "EB Garamond", "Times New Roman", serif' },
      { group: 'Serif', label: 'Palatino', value: '"Palatino Linotype", Palatino, "Book Antiqua", serif' },
      { group: 'Serif', label: 'Cambria', value: 'Cambria, "Hoefler Text", serif' },
      { group: 'Serif', label: 'Constantia', value: 'Constantia, Palatino, serif' },
      { group: 'Serif', label: 'Baskerville', value: 'Baskerville, "Baskerville Old Face", "Times New Roman", serif' },
      { group: 'Serif', label: 'Didot / Bodoni', value: 'Didot, "Bodoni MT", "Times New Roman", serif' },
      { group: 'Serif', label: 'Calisto MT', value: '"Calisto MT", "Bookman Old Style", Georgia, serif' },
      { group: 'Serif', label: 'Book Antiqua', value: '"Book Antiqua", Palatino, serif' },
      // ── Sans-serif ────────────────────────────────────────────────────
      { group: 'Sans-serif', label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
      { group: 'Sans-serif', label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
      { group: 'Sans-serif', label: 'Segoe UI', value: '"Segoe UI", Tahoma, sans-serif' },
      { group: 'Sans-serif', label: 'Calibri', value: 'Calibri, Candara, sans-serif' },
      { group: 'Sans-serif', label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
      // ── Quirky ────────────────────────────────────────────────────────
      { group: 'Quirky', label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
      { group: 'Quirky', label: 'Comic Sans', value: '"Comic Sans MS", "Comic Sans", cursive' },
      { group: 'Quirky', label: 'Papyrus', value: 'Papyrus, fantasy' },
      { group: 'Quirky', label: 'Courier New', value: '"Courier New", Courier, monospace' },
      { group: 'Quirky', label: 'Copperplate', value: '"Copperplate", "Copperplate Gothic Light", fantasy' },
    ];

    function _bcBuildFontSelect(id, selectedValue, onchangeExpr) {
      const sel = document.createElement('select');
      sel.id = id;
      sel.className = 'bc-select bc-font-select';
      if (onchangeExpr) sel.setAttribute('onchange', onchangeExpr);
      // Default / inherit option
      const defOpt = document.createElement('option');
      defOpt.value = '';
      defOpt.textContent = '— Default (inherit) —';
      sel.appendChild(defOpt);
      let currentGroup = '';
      _BC_FONT_OPTIONS.forEach(f => {
        if (f.group !== currentGroup) {
          currentGroup = f.group;
          const og = document.createElement('optgroup');
          og.label = currentGroup;
          sel.appendChild(og);
        }
        const opt = document.createElement('option');
        opt.value = f.value;
        opt.textContent = f.label;
        opt.style.fontFamily = f.value;
        sel.lastChild.appendChild(opt);
      });
      if (selectedValue) sel.value = selectedValue;
      return sel;
    }

    function _bcFontSelectHtml(idAttr) {
      let html = `<select id="${idAttr}" class="bc-select bc-font-select"><option value="">— Default (inherit) —</option>`;
      let currentGroup = '';
      _BC_FONT_OPTIONS.forEach(f => {
        if (f.group !== currentGroup) {
          if (currentGroup) html += '</optgroup>';
          currentGroup = f.group;
          html += `<optgroup label="${f.group}">`;
        }
        html += `<option value="${f.value}" style="font-family:${f.value}">${f.label}</option>`;
      });
      if (currentGroup) html += '</optgroup>';
      html += '</select>';
      return html;
    }

    // ── Pen preset list (Customise modal) ────────────────────────────────
    function _bcBuildPenPresetList(containerId, presets) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';

      function makeRow(p) {
        const row = document.createElement('div');
        row.className = 'bc-swatch-row';
        row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';

        const dragHandle = document.createElement('span');
        dragHandle.className = 'bc-drag-handle';
        dragHandle.textContent = '\u2807';
        dragHandle.title = 'Drag to reorder';

        const preview = document.createElement('div');
        preview.style.cssText = 'width:18px;height:18px;border-radius:3px;flex-shrink:0;border:1.5px solid #ccc;';
        preview.style.background = p.color || '#e53935';
        preview.style.opacity = p.opacity !== undefined ? p.opacity : 1;

        const colorPick = document.createElement('input');
        colorPick.type = 'color';
        colorPick.value = p.color || '#e53935';
        colorPick.title = 'Pen colour';
        colorPick.style.cssText = 'width:28px;height:22px;border:1px solid #ccc;border-radius:3px;cursor:pointer;padding:0;flex-shrink:0;';
        colorPick.oninput = () => { preview.style.background = colorPick.value; };

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = p.name || '';
        nameInput.placeholder = 'Name…';
        nameInput.className = 'bc-swatch-input';
        nameInput.style.cssText = 'flex:1;min-width:60px;max-width:90px;';

        // Opacity
        const opLabel = document.createElement('span');
        opLabel.textContent = 'Opacity';
        opLabel.style.cssText = 'font-size:0.62rem;color:#888;white-space:nowrap;';
        const opInput = document.createElement('input');
        opInput.type = 'range';
        opInput.min = '0.05'; opInput.max = '1'; opInput.step = '0.05';
        opInput.value = p.opacity !== undefined ? p.opacity : 1;
        opInput.style.cssText = 'width:60px;accent-color:#111;cursor:pointer;';
        const opVal = document.createElement('span');
        opVal.textContent = Math.round((p.opacity !== undefined ? p.opacity : 1) * 100) + '%';
        opVal.style.cssText = 'font-size:0.72rem;color:#555;width:30px;text-align:right;flex-shrink:0;';
        opInput.oninput = () => {
          opVal.textContent = Math.round(parseFloat(opInput.value) * 100) + '%';
          preview.style.opacity = opInput.value;
        };

        // Thickness
        const thLabel = document.createElement('span');
        thLabel.textContent = 'Size';
        thLabel.style.cssText = 'font-size:0.62rem;color:#888;white-space:nowrap;';

        const thUnitSel = document.createElement('select');
        thUnitSel.className = 'bc-select pe-pen-unit';
        thUnitSel.title = 'Thickness unit (mm, pt, px)';
        thUnitSel.style.cssText = 'font-size:0.68rem;padding:1px 3px;';
        ['mm', 'pt', 'px'].forEach(u => {
          const opt = document.createElement('option');
          opt.value = u; opt.textContent = u;
          thUnitSel.appendChild(opt);
        });
        const currentThickUnit = p.thicknessUnit || window.conThicknessUnit || 'mm';
        thUnitSel.value = currentThickUnit;
        thUnitSel.dataset.lastUnit = currentThickUnit;

        const thInput = document.createElement('input');
        thInput.type = 'range';
        thInput.className = 'pe-pen-thickness';
        if (typeof _conSetupThicknessSlider === 'function') {
          _conSetupThicknessSlider(thInput, currentThickUnit, 'drawing');
        }
        const canonicalPx = p.thickness || 4;
        thInput.dataset.rawPx = String(canonicalPx);
        thInput.value = String((typeof conPxToThicknessUnit === 'function') ? conPxToThicknessUnit(canonicalPx, currentThickUnit) : canonicalPx);
        thInput.style.cssText = 'width:60px;accent-color:#111;cursor:pointer;';

        const thVal = document.createElement('span');
        thVal.textContent = (typeof conFormatThickness === 'function') ? conFormatThickness(canonicalPx, currentThickUnit) : (canonicalPx + 'px');
        thVal.style.cssText = 'font-size:0.72rem;color:#555;width:40px;text-align:right;flex-shrink:0;';

        thInput.oninput = () => {
          const unit = thUnitSel.value;
          const pxVal = (typeof conThicknessUnitToPx === 'function') ? conThicknessUnitToPx(parseFloat(thInput.value) || 0, unit) : parseFloat(thInput.value);
          thInput.dataset.rawPx = String(pxVal);
          thVal.textContent = thInput.value + ' ' + unit;
        };

        thUnitSel.onchange = () => {
          const newUnit = thUnitSel.value;
          const rawPx = parseFloat(thInput.dataset.rawPx) || 4;
          if (typeof _conSetupThicknessSlider === 'function') {
            _conSetupThicknessSlider(thInput, newUnit, 'drawing');
          }
          thInput.value = String((typeof conPxToThicknessUnit === 'function') ? conPxToThicknessUnit(rawPx, newUnit) : rawPx);
          thVal.textContent = (typeof conFormatThickness === 'function') ? conFormatThickness(rawPx, newUnit) : (rawPx + ' ' + newUnit);
          thUnitSel.dataset.lastUnit = newUnit;
        };

        // Shape selector
        const shapeSelect = document.createElement('select');
        shapeSelect.className = 'bc-select pe-pen-shape';
        shapeSelect.title = 'Shape tool';
        shapeSelect.style.cssText = 'font-size:0.72rem;padding:2px 4px;';
        _BC_PEN_SHAPE_OPTIONS.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          shapeSelect.appendChild(o);
        });
        shapeSelect.value = p.shape || '';

        // Line type selector (solid / dashed / dotted)
        const dashSelect = document.createElement('select');
        dashSelect.className = 'bc-select pe-pen-dash';
        dashSelect.title = 'Line type';
        dashSelect.style.cssText = 'font-size:0.72rem;padding:2px 4px;';
        [
          { value: 'solid', label: 'Solid' },
          { value: 'dashed', label: 'Dashed' },
          { value: 'dotted', label: 'Dotted' }
        ].forEach(opt => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          dashSelect.appendChild(o);
        });
        dashSelect.value = p.dashStyle || 'solid';

        // Icon selector
        const iconSelect = document.createElement('select');
        iconSelect.className = 'bc-select pe-pen-icon';
        iconSelect.title = 'Preset icon';
        iconSelect.style.cssText = 'font-size:0.72rem;padding:2px 4px;';
        const ICON_OPTS = [
          { value: '', label: 'Auto Icon' },
          { value: 'pen.svg', label: 'Pen' },
          { value: 'highlighter.svg', label: 'Highlighter' },
          { value: 'pen-thin.svg', label: 'Fine Pen' },
          { value: 'draw.svg', label: 'Nib' },
          { value: 'shape-rect.svg', label: 'Rect' },
          { value: 'shape-circle.svg', label: 'Circle' },
          { value: 'shape-diamond.svg', label: 'Diamond' },
          { value: 'shape-polygon.svg', label: 'Polygon' },
          { value: 'shape-line.svg', label: 'Line' },
          { value: 'shape-arrow.svg', label: 'Arrow' }
        ];
        ICON_OPTS.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          iconSelect.appendChild(o);
        });
        iconSelect.value = p.icon || '';

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '\u2715';
        removeBtn.className = 'bc-swatch-remove';
        removeBtn.title = 'Remove preset';
        removeBtn.style.cssText = 'width:22px;height:22px;display:flex;align-items:center;justify-content:center;padding:0;font-size:0.7rem;';
        removeBtn.onclick = () => row.remove();

        row.appendChild(dragHandle);
        row.appendChild(preview);
        row.appendChild(colorPick);
        row.appendChild(nameInput);
        row.appendChild(opLabel);
        row.appendChild(opInput);
        row.appendChild(opVal);
        row.appendChild(thLabel);
        row.appendChild(thInput);
        row.appendChild(thVal);
        row.appendChild(thUnitSel);
        row.appendChild(shapeSelect);
        row.appendChild(dashSelect);
        row.appendChild(iconSelect);
        row.appendChild(removeBtn);
        return row;
      }

      presets.forEach(p => container.appendChild(makeRow(p)));

      const addBtn = document.createElement('button');
      addBtn.textContent = '\uff0b Add preset';
      addBtn.className = 'action-btn btn-grey bc-add-btn';
      addBtn.onclick = () => {
        container.insertBefore(makeRow({ name: '', color: '#111111', opacity: 1, thickness: 4, shape: '', dashStyle: 'solid', icon: '' }), addBtn);
        _bcEnableDragReorder(container, '.bc-swatch-row');
      };
      container.appendChild(addBtn);
      _bcEnableDragReorder(container, '.bc-swatch-row');
    }

    function _bcGetPenPresets() {
      const rows = document.querySelectorAll('#bc-pen-preset-list .bc-swatch-row');
      return Array.from(rows).map(row => {
        const colorPick = row.querySelector('input[type="color"]');
        const nameInput = row.querySelector('.bc-swatch-input');
        const opInput = row.querySelectorAll('input[type="range"]')[0];
        const thInput = row.querySelector('.pe-pen-thickness') || row.querySelectorAll('input[type="range"]')[1];
        const thUnitSel = row.querySelector('.pe-pen-unit');
        const shapeSelect = row.querySelector('.pe-pen-shape');
        const dashSelect = row.querySelector('.pe-pen-dash');
        const iconSelect = row.querySelector('.pe-pen-icon');

        const unit = thUnitSel ? thUnitSel.value : 'mm';
        const rawSliderVal = thInput ? parseFloat(thInput.value) : 4;
        const thicknessPx = (thInput && thInput.dataset.rawPx) ? parseFloat(thInput.dataset.rawPx) : ((typeof conThicknessUnitToPx === 'function') ? conThicknessUnitToPx(rawSliderVal, unit) : rawSliderVal);

        return {
          name: nameInput ? nameInput.value.trim() : '',
          color: colorPick ? colorPick.value : '#111111',
          opacity: opInput ? parseFloat(opInput.value) : 1,
          thickness: Math.round(thicknessPx * 10) / 10,
          thicknessUnit: unit,
          shape: shapeSelect ? shapeSelect.value : '',
          dashStyle: dashSelect ? dashSelect.value : 'solid',
          icon: iconSelect ? iconSelect.value : '',
        };
      }).filter(p => p.name || p.color !== '#111111');
    }

    // ── Pen preset icon resolver ─────────────────────────────────────────
    function _conGetPresetIconName(p) {
      if (!p) return 'pen.svg';
      if (p.icon) {
        return p.icon.endsWith('.svg') ? p.icon : (p.icon + '.svg');
      }
      const s = String(p.shape || '').trim().toLowerCase();
      if (s === 'rect' || s === 'rectangle') return 'shape-rect.svg';
      if (s === 'circle' || s === 'ellipse') return 'shape-circle.svg';
      if (s === 'diamond') return 'shape-diamond.svg';
      if (s === 'polygon') return 'shape-polygon.svg';
      if (s === 'line') return 'shape-line.svg';
      if (s === 'arrow') return 'shape-arrow.svg';

      // Freehand pen variations
      const name = String(p.name || '').toLowerCase();
      const op = p.opacity !== undefined ? Number(p.opacity) : 1;
      const th = p.thickness !== undefined ? Number(p.thickness) : 4;
      if (op < 0.75 || th >= 10 || /high|fluo|marker|surlign/i.test(name)) {
        return 'highlighter.svg';
      }
      if (th <= 2 || /thin|fine|fin/i.test(name)) {
        return 'pen-thin.svg';
      }
      return 'pen.svg';
    }
    window._conGetPresetIconName = _conGetPresetIconName;

    // ── Pen preset toolbar (Draw panel) ──────────────────────────────────
    function conDrawInitPenPresets() {
      const container = document.getElementById('con-draw-preset-btns');
      const emptyHint = document.getElementById('con-draw-no-presets');
      if (!container) return;
      container.innerHTML = '';
      const presets = window._bcPenPresets || [];
      if (!presets.length) {
        if (emptyHint) emptyHint.style.display = 'block';
        return;
      }
      if (emptyHint) emptyHint.style.display = 'none';

      presets.forEach((p, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'action-btn btn-grey con-draw-preset-icon-btn';
        btn.dataset.presetIdx = String(idx);
        const iconName = _conGetPresetIconName(p);
        const shapeLabel = p.shape ? (p.shape.charAt(0).toUpperCase() + p.shape.slice(1)) : 'Freehand';
        const dashLabel = (p.dashStyle && p.dashStyle !== 'solid') ? (' · ' + p.dashStyle.charAt(0).toUpperCase() + p.dashStyle.slice(1)) : '';
        const thickVal = p.thickness || 4;
        const thickUnit = p.thicknessUnit || window.conThicknessUnit || 'mm';
        const opVal = Math.round((p.opacity !== undefined ? p.opacity : 1) * 100);
        const titleText = (p.name || 'Preset') + ' (' + shapeLabel + dashLabel + ' · ' + ((typeof conFormatThickness === 'function') ? conFormatThickness(thickVal, thickUnit) : (thickVal + 'px')) + ' · ' + opVal + '%)';
        btn.title = titleText;
        btn.setAttribute('aria-label', titleText);

        const iconImg = document.createElement('img');
        iconImg.src = '../assets/icons/' + iconName;
        iconImg.className = 'btn-icon con-draw-preset-icon-img';
        iconImg.alt = p.name || 'Preset';

        const swatch = document.createElement('span');
        swatch.className = 'con-draw-preset-swatch';
        const swatchCol = p.color || '#111111';
        if (p.dashStyle === 'dashed') {
          swatch.style.background = `repeating-linear-gradient(90deg, ${swatchCol} 0 4px, transparent 4px 6px)`;
        } else if (p.dashStyle === 'dotted') {
          swatch.style.background = `repeating-linear-gradient(90deg, ${swatchCol} 0 2px, transparent 2px 4px)`;
        } else {
          swatch.style.background = swatchCol;
        }
        swatch.style.opacity = p.opacity !== undefined ? p.opacity : 1;
        const barH = Math.min(5, Math.max(2, Math.round(thickVal / 3)));
        swatch.style.height = barH + 'px';

        btn.appendChild(iconImg);
        btn.appendChild(swatch);

        btn.onclick = () => {
          window.conDrawApplyPenPreset(p, idx);
        };
        container.appendChild(btn);
      });
    }
    window.conDrawInitPenPresets = conDrawInitPenPresets;

    window.conDrawApplyPenPreset = function (p, idx) {
      _conDrawHandMode = false;
      _conDrawEraserMode = false;
      if (typeof _conSyncEraserToolbarBtn === 'function') _conSyncEraserToolbarBtn();
      if (typeof _conDrawSyncOverlayCursor === 'function') _conDrawSyncOverlayCursor();

      if (typeof window.conDrawSetColor === 'function') window.conDrawSetColor(p.color || '#111111');
      if (typeof window.conDrawSetThickness === 'function') window.conDrawSetThickness(p.thickness || 4);
      const tSlider = document.getElementById('con-draw-thickness');
      if (tSlider) tSlider.value = p.thickness || 4;
      if (typeof window.conDrawSetOpacity === 'function') window.conDrawSetOpacity(p.opacity !== undefined ? p.opacity : 1);
      const oSlider = document.getElementById('con-draw-opacity');
      if (oSlider) oSlider.value = p.opacity !== undefined ? p.opacity : 1;
      if (typeof window.conDrawSetShapeDirect === 'function') window.conDrawSetShapeDirect(p.shape || null);
      if (typeof window.conShapeSetDrawDash === 'function') window.conShapeSetDrawDash(p.dashStyle || 'solid');

      const container = document.getElementById('con-draw-preset-btns');
      if (container) {
        container.querySelectorAll('.con-draw-preset-icon-btn').forEach((b, i) => {
          b.classList.toggle('con-panel-active', idx !== undefined ? i === idx : false);
        });
      }
      if (typeof window.conDrawCloseAllMenus === 'function') window.conDrawCloseAllMenus();
    };

    const _BC_A4_SIZE_PX = {
      landscape: { w: 1123, h: 794 },
      portrait: { w: 794, h: 1123 }
    };

    function _bcNormalizeBoardLayoutPreset(v) {
      const s = String(v || '').trim().toLowerCase();
      if (s === 'a4-landscape' || s === 'a4-portrait' || s === 'custom') return s;
      return 'flex';
    }

    function _bcNormalizeBoardOrientation(v) {
      return String(v || '').trim().toLowerCase() === 'portrait' ? 'portrait' : 'landscape';
    }

    function _bcClampBoardDimension(v, fallback) {
      const n = Math.round(Number(v));
      if (!Number.isFinite(n)) return fallback;
      return Math.max(320, Math.min(12000, n));
    }

    function _bcResolveBoardLayoutSettings(cfg) {
      const src = cfg || {};
      const preset = _bcNormalizeBoardLayoutPreset(src.boardLayoutPreset);
      const customOrientation = _bcNormalizeBoardOrientation(src.boardCustomOrientation);
      let customWidth = _bcClampBoardDimension(src.boardCustomWidthPx, 1600);
      let customHeight = _bcClampBoardDimension(src.boardCustomHeightPx, 1000);

      if (customOrientation === 'landscape' && customHeight > customWidth) {
        [customWidth, customHeight] = [customHeight, customWidth];
      } else if (customOrientation === 'portrait' && customWidth > customHeight) {
        [customWidth, customHeight] = [customHeight, customWidth];
      }

      let dims = null;
      if (preset === 'a4-landscape') dims = { ..._BC_A4_SIZE_PX.landscape };
      else if (preset === 'a4-portrait') dims = { ..._BC_A4_SIZE_PX.portrait };
      else if (preset === 'custom') dims = { w: customWidth, h: customHeight };

      return {
        preset,
        customOrientation,
        customWidth,
        customHeight,
        dims
      };
    }

    function _bcApplyBoardLayout(layout, opts = {}) {
      if (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('con-mirror-mode')) return;
      if (typeof location !== 'undefined' && location.search && location.search.indexOf('mirror=1') !== -1) return;
      const board = document.getElementById('constellation-board');
      const section = document.getElementById('constellation-section');
      if (!board) return;
      if (section && section.classList.contains('con-fullscreen')) return;

      const pIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
      const expandBtn = document.getElementById('con-board-expand-btn');

      function _resetOverlays() {
        if (typeof conMode === 'undefined' || conMode !== 'draw') {
          const conSvg = document.getElementById('constellation-svg');
          const liveSvg = document.getElementById('con-draw-live-svg');
          const drawOverlay = document.getElementById('con-draw-overlay');
          if (conSvg) { conSvg.style.width = '100%'; conSvg.style.height = '100%'; }
          if (liveSvg) { liveSvg.style.width = '100%'; liveSvg.style.height = '100%'; }
          if (drawOverlay) { drawOverlay.style.width = '100%'; drawOverlay.style.height = '100%'; }
        }
      }

      if (!layout || !layout.dims) {
        const savedH = (opts && opts.resetHeight) ? null : ((typeof conPageSnapshots !== 'undefined' && conPageSnapshots[pIdx]?.boardHeight)
          || (() => {
            try {
              const s = sessionStorage.getItem('cmt-board-expanded-height-' + pIdx) || sessionStorage.getItem('cmt-board-expanded-height');
              const v = parseInt(s, 10);
              return (!isNaN(v) && v > 0) ? v : null;
            } catch (_) { return null; }
          })());

        board.style.width = '100%';
        board.style.maxWidth = '';
        board.style.height = (savedH && savedH > 0) ? (savedH + 'px') : 'calc(100vh - 180px)';
        board.style.minHeight = '600px';
        board.style.marginLeft = '';
        board.style.marginRight = '';
        board.style.overflowX = 'auto';
        board.style.overflowY = 'auto';
        if (expandBtn) expandBtn.style.display = '';
        _resetOverlays();
        return;
      }

      const dims = layout.dims;
      board.style.width = '100%';
      board.style.maxWidth = dims.w + 'px';
      board.style.minHeight = '';

      let targetH = dims.h;
      if (!opts || !opts.resetHeight) {
        const savedH = (typeof conPageSnapshots !== 'undefined' && conPageSnapshots[pIdx]?.boardHeight)
          || (() => {
            try {
              const s = sessionStorage.getItem('cmt-board-expanded-height-' + pIdx) || sessionStorage.getItem('cmt-board-expanded-height');
              const v = parseInt(s, 10);
              return (!isNaN(v) && v > 0) ? v : null;
            } catch (_) { return null; }
          })();
        if (savedH && savedH > dims.h) targetH = savedH;
      }
      board.style.height = targetH + 'px';
      board.style.marginLeft = 'auto';
      board.style.marginRight = 'auto';

      board.style.overflowX = 'hidden';
      board.style.overflowY = 'hidden';

      if (expandBtn) expandBtn.style.display = 'none';

      _resetOverlays();
    }

    function _bcApplyCustomOrientationInInputs() {
      const orientationEl = document.getElementById('bc-board-custom-orientation');
      const widthEl = document.getElementById('bc-board-custom-width');
      const heightEl = document.getElementById('bc-board-custom-height');
      if (!orientationEl || !widthEl || !heightEl) return;

      const orientation = _bcNormalizeBoardOrientation(orientationEl.value);
      let width = _bcClampBoardDimension(widthEl.value, 1600);
      let height = _bcClampBoardDimension(heightEl.value, 1000);
      if (orientation === 'landscape' && height > width) {
        [width, height] = [height, width];
      } else if (orientation === 'portrait' && width > height) {
        [width, height] = [height, width];
      }
      widthEl.value = width;
      heightEl.value = height;
    }

    function _bcSyncBoardLayoutControls() {
      const presetEl = document.getElementById('bc-board-layout-preset');
      const orientationEl = document.getElementById('bc-board-custom-orientation');
      const widthEl = document.getElementById('bc-board-custom-width');
      const heightEl = document.getElementById('bc-board-custom-height');
      if (!presetEl || !orientationEl || !widthEl || !heightEl) return;

      const preset = _bcNormalizeBoardLayoutPreset(presetEl.value);
      const isCustom = preset === 'custom';
      const isA4 = preset === 'a4-landscape' || preset === 'a4-portrait';

      orientationEl.disabled = !isCustom;
      widthEl.disabled = !isCustom;
      heightEl.disabled = !isCustom;

      if (isA4) {
        const dims = preset === 'a4-portrait' ? _BC_A4_SIZE_PX.portrait : _BC_A4_SIZE_PX.landscape;
        widthEl.value = dims.w;
        heightEl.value = dims.h;
      } else if (isCustom) {
        _bcApplyCustomOrientationInInputs();
      }
    }

    window.conApplyDefaultBoardLayout = function () {
      const cfg = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : {};
      const layout = _bcResolveBoardLayoutSettings(cfg);
      window._bcBoardLayoutConfig = layout;
      _bcApplyBoardLayout(layout);
    };


  Board.nodes = Board.nodes || {};

  // Backward compatibility exports for HTML attributes & cross-module calls
  window.conGroupSelected = global.conGroupSelected = conGroupSelected;
  window.conImportOpen = global.conImportOpen = conImportOpen;
  window.conImportClose = global.conImportClose = conImportClose;
  window.conImportRender = global.conImportRender = conImportRender;
  window.conImportSelectAll = global.conImportSelectAll = conImportSelectAll;
  window.conImportClearSel = global.conImportClearSel = conImportClearSel;
  window.conImportConfirm = global.conImportConfirm = conImportConfirm;
  window.conImportTrayClose = global.conImportTrayClose = conImportTrayClose;
  window.conImportTrayDropAll = global.conImportTrayDropAll = conImportTrayDropAll;
  window.conInitSwatches = global.conInitSwatches = conInitSwatches;
  window.conAttachNodeEvents = global.conAttachNodeEvents = conAttachNodeEvents;
  window.conAttachNode = global.conAttachNode = conAttachNodeEvents;
  window.conattachnode = global.conattachnode = conAttachNodeEvents;
  window.conGetCtxNodeId = global.conGetCtxNodeId = function () { return (typeof conCtxNodeId !== 'undefined' ? conCtxNodeId : null); };
  window.conSetNextId = global.conSetNextId = function (n) { if (typeof conNextId !== 'undefined' && n > conNextId) conNextId = n; };
  window.conGetNextId = global.conGetNextId = function () { return conNextId++; };
  window.taGetLines = global.taGetLines = function () { return (typeof taLines !== 'undefined') ? taLines : []; };
  window.conComputeEdgeGeometry = global.conComputeEdgeGeometry = conComputeEdgeGeometry;
  window.conAddEdge = global.conAddEdge = conAddEdge;
  window.conEnsureSvgDefs = global.conEnsureSvgDefs = conEnsureSvgDefs;
  window.conUpdateEdge = global.conUpdateEdge = conUpdateEdge;
  window.conRedrawEdges = global.conRedrawEdges = conRedrawEdges;
  window.conRenderNodeLabel = global.conRenderNodeLabel = conRenderNodeLabel;
  window.conIsNodeLocked = global.conIsNodeLocked = conIsNodeLocked;
  window.conSyncNodeLockState = global.conSyncNodeLockState = conSyncNodeLockState;

  window.conImportTrayOpen = global.conImportTrayOpen = conImportTrayOpen;
  window.conImportPopulateThemes = global.conImportPopulateThemes = conImportPopulateThemes;
  window.conImportPopulateSources = global.conImportPopulateSources = conImportPopulateSources;
  window.conCtxOpenDictionary = global.conCtxOpenDictionary = window.conCtxOpenDictionary;
  window.conNodeCardOpenDictionary = global.conNodeCardOpenDictionary = window.conNodeCardOpenDictionary;


  window._BC_A4_SIZE_PX = global._BC_A4_SIZE_PX = _BC_A4_SIZE_PX;
  window._bcNormalizeBoardLayoutPreset = global._bcNormalizeBoardLayoutPreset = _bcNormalizeBoardLayoutPreset;
  window._bcNormalizeBoardOrientation = global._bcNormalizeBoardOrientation = _bcNormalizeBoardOrientation;
  window._bcClampBoardDimension = global._bcClampBoardDimension = _bcClampBoardDimension;
  window._bcResolveBoardLayoutSettings = global._bcResolveBoardLayoutSettings = _bcResolveBoardLayoutSettings;
  window._bcApplyBoardLayout = global._bcApplyBoardLayout = _bcApplyBoardLayout;
  window._bcApplyCustomOrientationInInputs = global._bcApplyCustomOrientationInInputs = _bcApplyCustomOrientationInInputs;
  window._bcSyncBoardLayoutControls = global._bcSyncBoardLayoutControls = _bcSyncBoardLayoutControls;
  window._BC_NOTE_TEXT_DEFAULTS = global._BC_NOTE_TEXT_DEFAULTS = _BC_NOTE_TEXT_DEFAULTS;
  window._BC_NODE_BORDER_DEFAULTS = global._BC_NODE_BORDER_DEFAULTS = _BC_NODE_BORDER_DEFAULTS;
  window._BC_NOTE_BORDER_DEFAULTS = global._BC_NOTE_BORDER_DEFAULTS = _BC_NOTE_BORDER_DEFAULTS;
  window._BC_PEN_PRESET_DEFAULTS = global._BC_PEN_PRESET_DEFAULTS = _BC_PEN_PRESET_DEFAULTS;
  window._BC_PEN_SHAPE_OPTIONS = global._BC_PEN_SHAPE_OPTIONS = _BC_PEN_SHAPE_OPTIONS;
  window._BC_FONT_OPTIONS = global._BC_FONT_OPTIONS = _BC_FONT_OPTIONS;
  window._bcBuildFontSelect = global._bcBuildFontSelect = _bcBuildFontSelect;
  window._bcFontSelectHtml = global._bcFontSelectHtml = _bcFontSelectHtml;
  window._bcBuildPenPresetList = global._bcBuildPenPresetList = _bcBuildPenPresetList;
  window._bcGetPenPresets = global._bcGetPenPresets = _bcGetPenPresets;

})(typeof window !== "undefined" ? window : this);
