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

    global._conCurrentCompetences = global._conCurrentCompetences || [];
    let _conAvailableCompetences = [];
    let _conLoadingCompetences = false;
    let _conCompModalTarget = { type: 'board', id: null };
    let _conCompSelectedIds = new Set();
    let _conCompSelectedObjects = new Map();
    let _conCompFilterSelectedOnly = false;
    let _conPlannerSuggestedCompetences = [];
    let _conCompPopupSelectedSet = new Set();

    function conRenderHeaderCompetenceBar() {
      const bar = document.getElementById('con-header-competence-bar');
      if (!bar) return;

      const t_ = (k, fb) => (typeof t === 'function' ? t(k) : fb);
      const hasComps = global._conCurrentCompetences && global._conCurrentCompetences.length > 0;

      /* --- Reuse existing button + popup if already rendered, mutate in-place --- */
      let btn = bar.querySelector('.con-comp-group-btn');
      let popup = bar.querySelector('.con-comp-popup');

      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'con-comp-group-btn';
        btn.id = 'con-comp-group-toggle';
        bar.appendChild(btn);
      }

      if (!popup) {
        popup = document.createElement('div');
        popup.className = 'con-comp-popup';
        popup.id = 'con-comp-group-popup';
        bar.appendChild(popup);

        /* Close when clicking outside (defensively ignore clicks inside popover) */
        document.addEventListener('mousedown', function _conCompPopupOutside(e) {
          const popover = document.getElementById('con-comp-note-popover');
          if (popover && popover.contains(e.target)) return;
          if (!bar.contains(e.target)) {
            popup.classList.remove('con-comp-popup-open');
          }
        }, true);
      }

      /* Clean stale selection IDs if competences list changed */
      if (hasComps) {
        const liveCodes = new Set(global._conCurrentCompetences.map(c => String(c.id || c.code || c.title || '')));
        for (const selId of Array.from(_conCompPopupSelectedSet)) {
          if (!liveCodes.has(selId)) _conCompPopupSelectedSet.delete(selId);
        }
      } else {
        _conCompPopupSelectedSet.clear();
      }

      /* --- Update toggle button label --- */
      if (hasComps) {
        btn.className = 'con-comp-group-btn';
        btn.title = t_('btnCompetenceTags', 'Competences');
        btn.innerHTML = `<img src="../assets/icons/award.svg" alt="" /><span>${t_('btnCompetenceTags', 'Competences')}</span><span class="con-comp-group-badge">${global._conCurrentCompetences.length}</span>`;
      } else {
        btn.className = 'con-comp-group-btn con-comp-group-btn-empty';
        btn.title = t_('compTagsNone', 'No competence tags') + ' — Click to add';
        btn.innerHTML = `<img src="../assets/icons/award.svg" alt="" /><span>+ ${t_('btnCompetenceTags', 'Competences')}</span>`;
      }

      /* Toggle popup on click */
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!hasComps) {
          conOpenCompetenceModal('board');
          return;
        }
        popup.classList.toggle('con-comp-popup-open');
      };

      /* --- Build popup content --- */
      popup.innerHTML = '';

      /* Header */
      const hdr = document.createElement('div');
      hdr.className = 'con-comp-popup-header';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'con-comp-popup-close';
      closeBtn.type = 'button';
      closeBtn.title = 'Close';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = (e) => { e.stopPropagation(); popup.classList.remove('con-comp-popup-open'); };
      hdr.innerHTML = `<span>${t_('compPopupTitle', 'Board Competences')}</span>`;
      hdr.appendChild(closeBtn);
      popup.appendChild(hdr);

      /* Multi-select Toolbar */
      let countSpan = null;
      let selectAllCb = null;
      let addNotesBtn = null;

      function updatePopupAddBtnState() {
        if (!addNotesBtn) return;
        const selectedCount = _conCompPopupSelectedSet.size;
        if (selectedCount > 0) {
          addNotesBtn.innerHTML = `<img src="../assets/icons/note.svg" alt="" /><span>${t_('compPopupAddSelected', 'Add Selected ({count}) to Board').replace('{count}', selectedCount)}</span>`;
          if (countSpan) countSpan.textContent = selectedCount + ' / ' + global._conCurrentCompetences.length;
          if (selectAllCb) selectAllCb.checked = (selectedCount === global._conCurrentCompetences.length);
        } else {
          addNotesBtn.innerHTML = `<img src="../assets/icons/note.svg" alt="" /><span>${t_('compPopupAddAll', 'Add All to Board')}</span>`;
          if (countSpan) countSpan.textContent = '';
          if (selectAllCb) selectAllCb.checked = false;
        }
      }

      if (hasComps && global._conCurrentCompetences.length > 1) {
        const toolbar = document.createElement('div');
        toolbar.className = 'con-comp-popup-toolbar';

        const selectAllLbl = document.createElement('label');
        selectAllLbl.className = 'con-comp-popup-select-all';
        selectAllCb = document.createElement('input');
        selectAllCb.type = 'checkbox';
        selectAllCb.id = 'con-comp-popup-check-all';
        selectAllCb.checked = (global._conCurrentCompetences.length > 0 && _conCompPopupSelectedSet.size === global._conCurrentCompetences.length);
        selectAllCb.onchange = () => {
          if (selectAllCb.checked) {
            global._conCurrentCompetences.forEach(c => _conCompPopupSelectedSet.add(String(c.id || c.code || c.title || '')));
          } else {
            _conCompPopupSelectedSet.clear();
          }
          list.querySelectorAll('.con-comp-popup-item').forEach(liEl => {
            const chkEl = liEl.querySelector('.con-comp-popup-item-check');
            if (chkEl) chkEl.checked = selectAllCb.checked;
            liEl.classList.toggle('is-selected', selectAllCb.checked);
          });
          updatePopupAddBtnState();
        };

        const selectAllSpan = document.createElement('span');
        selectAllSpan.textContent = t_('compPopupSelectAll', 'Select all');
        selectAllLbl.appendChild(selectAllCb);
        selectAllLbl.appendChild(selectAllSpan);

        countSpan = document.createElement('span');
        countSpan.className = 'con-comp-popup-selected-count';

        toolbar.appendChild(selectAllLbl);
        toolbar.appendChild(countSpan);
        popup.appendChild(toolbar);
      }

      /* List */
      const list = document.createElement('ul');
      list.className = 'con-comp-popup-list';
      if (hasComps) {
        global._conCurrentCompetences.forEach(c => {
          if (!c) return;
          const cId = String(c.id || c.code || c.title || '');
          const code = String(c.code || c.title || c.id || '');
          const title = String(c.title || code);
          const isFromLesson = !!(c.autoLinkedFrom || c.cascadeType === 'lesson_competence');
          const lessonBadge = isFromLesson ? `<span class="con-comp-from-lesson-badge" style="display:inline-block;margin-left:6px;font-size:0.65rem;background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:3px;font-weight:700;">${t_('compFromLessonTag', 'From Lesson')}</span>` : '';
          
          const isChecked = _conCompPopupSelectedSet.has(cId);
          const li = document.createElement('li');
          li.className = 'con-comp-popup-item' + (isChecked ? ' is-selected' : '');
          li.title = t_('compNotePopoverTitle', 'Copy competence to board');

          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.className = 'con-comp-popup-item-check';
          chk.checked = isChecked;
          chk.title = t_('compShowSelected', 'Select');
          chk.onclick = (e) => e.stopPropagation();
          chk.onchange = () => {
            if (chk.checked) _conCompPopupSelectedSet.add(cId);
            else _conCompPopupSelectedSet.delete(cId);
            li.classList.toggle('is-selected', chk.checked);
            updatePopupAddBtnState();
          };

          const body = document.createElement('div');
          body.className = 'con-comp-popup-item-body';
          body.innerHTML = `<div class="con-comp-popup-item-header"><span class="con-comp-popup-item-code">${boardEscapeHtml(code)}</span>${lessonBadge}</div>${title && title !== code ? `<div class="con-comp-popup-item-title">${boardEscapeHtml(title)}</div>` : ''}`;

          const actionBtn = document.createElement('button');
          actionBtn.type = 'button';
          actionBtn.className = 'con-comp-popup-item-action';
          actionBtn.title = t_('compNotePopoverTitle', 'Copy to Board as Note');
          actionBtn.innerHTML = '<img src="../assets/icons/note.svg" alt="" />';
          actionBtn.onclick = (e) => {
            e.stopPropagation();
            conOpenCompetenceNotePopover(c, li);
          };

          li.appendChild(chk);
          li.appendChild(body);
          li.appendChild(actionBtn);

          /* Clicking the item opens the popover to copy elements to board */
          li.onclick = (e) => {
            if (e.target === chk) return;
            e.preventDefault();
            e.stopPropagation();
            conOpenCompetenceNotePopover(c, li);
          };

          list.appendChild(li);
        });
      }
      popup.appendChild(list);

      /* Footer */
      const footer = document.createElement('div');
      footer.className = 'con-comp-popup-footer';
      const manageBtn = document.createElement('button');
      manageBtn.type = 'button';
      manageBtn.className = 'con-comp-popup-manage-btn';
      manageBtn.textContent = t_('compPopupManage', 'Manage Tags');
      manageBtn.onclick = (e) => { e.stopPropagation(); popup.classList.remove('con-comp-popup-open'); conOpenCompetenceModal('board'); };
      footer.appendChild(manageBtn);

      if (hasComps) {
        addNotesBtn = document.createElement('button');
        addNotesBtn.type = 'button';
        addNotesBtn.className = 'con-comp-popup-add-btn';
        updatePopupAddBtnState();
        addNotesBtn.onclick = (e) => {
          e.stopPropagation();
          const selectedComps = _conCompPopupSelectedSet.size > 0
            ? global._conCurrentCompetences.filter(c => _conCompPopupSelectedSet.has(String(c.id || c.code || c.title || '')))
            : global._conCurrentCompetences.slice();
          conOpenCompetenceNotePopover(selectedComps, addNotesBtn, { isBatch: true });
        };
        footer.appendChild(addNotesBtn);
      }

      popup.appendChild(footer);
    }

    // ── Competence Note Popover & Board Export Helpers ─────────────────
    let _conActiveCompNotePopover = null;

    async function conResolveFullCompetence(comp) {
      if (!comp) return null;
      if (!_conAvailableCompetences || !_conAvailableCompetences.length) {
        try {
          await conLoadAvailableCompetences();
        } catch (_) {}
      }
      const idStr = String(comp.id || '').trim().toLowerCase();
      const codeStr = String(comp.code || '').trim().toLowerCase();
      const titleStr = String(comp.title || '').trim().toLowerCase();

      const hit = (_conAvailableCompetences || []).find(ac => {
        if (!ac) return false;
        const acId = String(ac.id || '').trim().toLowerCase();
        const acCode = String(ac.code || '').trim().toLowerCase();
        const acTitle = String(ac.title || '').trim().toLowerCase();
        return (idStr && acId && acId === idStr) ||
               (codeStr && acCode && acCode === codeStr) ||
               (titleStr && acTitle && acTitle === titleStr);
      });
      const merged = Object.assign({}, hit || {}, comp);

      let detailed = [];
      if (window.CompetenceAggregatorService && typeof CompetenceAggregatorService.getDetailedLines === 'function') {
        detailed = CompetenceAggregatorService.getDetailedLines(merged);
        if (!detailed.length && hit) detailed = CompetenceAggregatorService.getDetailedLines(hit);
      }
      if (!detailed.length) {
        const raw = merged.detailedDescription || (hit && hit.detailedDescription);
        detailed = Array.isArray(raw)
          ? raw.map(s => String(s).trim()).filter(Boolean)
          : (raw ? String(raw).split(/\r?\n/).map(s => s.trim()).filter(Boolean) : []);
      }
      merged.detailedDescription = detailed;
      return merged;
    }

    function conBuildCompetenceNoteHtml(c, options = {}) {
      const text = conBuildCompetenceNoteText(c, options);
      if (!text) return '';
      return `<div class="con-comp-card-content" style="font-family:inherit;line-height:1.45;white-space:pre-wrap;font-weight:400;color:#111111;">${boardEscapeHtml(text)}</div>`;
    }

    function conBuildCompetenceNoteText(c, options = {}) {
      if (!c) return '';
      const t_ = (k, fb) => (typeof t === 'function' ? t(k) : fb);
      const code = String(c.code || c.id || '').trim();
      const title = String(c.title || code).trim();
      const cat = String(c.category || c.domain || c.strand || '').trim();
      const level = [c.level, c.yearLevel].filter(Boolean).map(s => String(s).trim()).filter(Boolean).join(' • ');
      const desc = String(c.description || c.statement || '').trim();
      const tasks = String(c.sampleTasks || c.examples || '').trim();
      const rawTags = Array.isArray(c.tags) ? c.tags : (c.tags ? String(c.tags).split(',') : []);
      const tagsStr = rawTags.map(t => String(t).trim()).filter(Boolean).map(t => t.startsWith('#') ? t : ('#' + t)).join(' ');

      const lines = [];
      const head = [];
      if (options.code && code) head.push(`[${code}]`);
      if (options.title && title) head.push(title);
      if (head.length) lines.push(head.join(' '));

      const meta = [];
      if (options.category && cat) meta.push(`${t_('compDomain', 'Domain')}: ${cat}`);
      if (options.level && level) meta.push(`${t_('compLevel', 'Level')}: ${level}`);
      if (meta.length) lines.push(meta.join(' • '));

      if (options.desc && desc) lines.push(desc);

      const detailedLines = Array.isArray(c.detailedDescription)
        ? c.detailedDescription.map(s => String(s).trim()).filter(Boolean)
        : (c.detailedDescription ? String(c.detailedDescription).split(/\r?\n/).map(s => s.trim()).filter(Boolean) : []);

      let activeDetailedLines = detailedLines;
      if (options.selectedDetailedLines && Array.isArray(options.selectedDetailedLines)) {
        activeDetailedLines = detailedLines.filter(l => options.selectedDetailedLines.includes(l));
      } else if (options.selectedDetailedLines && typeof options.selectedDetailedLines === 'object') {
        const cKey = String(c.id || c.code || c.title || '');
        const specificLines = options.selectedDetailedLines[cKey] || options.selectedDetailedLines[c.id] || options.selectedDetailedLines[c.code];
        if (Array.isArray(specificLines)) {
          activeDetailedLines = detailedLines.filter(l => specificLines.includes(l));
        }
      }

      if (options.detailedDesc && activeDetailedLines.length > 0) {
        lines.push(`${t_('compNoteElDetailedDesc', 'Detailed Description')}:\n` + activeDetailedLines.map(l => `- ${l}`).join('\n'));
      }

      if (options.tasks && tasks) lines.push(`${t_('compNoteElTasks', 'Tasks')}: ${tasks}`);
      if (options.tags && tagsStr) lines.push(tagsStr);

      return lines.join('\n\n');
    }

    function conBuildCombinedCompetenceNoteHtml(compsList, options = {}) {
      const text = conBuildCombinedCompetenceNoteText(compsList, options);
      if (!text) return '';
      return `<div class="con-comp-combined-card" style="font-family:inherit;line-height:1.45;white-space:pre-wrap;font-weight:400;color:#111111;">${boardEscapeHtml(text)}</div>`;
    }

    function conBuildCombinedCompetenceNoteText(compsList, options = {}) {
      const t_ = (k, fb) => (typeof t === 'function' ? t(k) : fb);
      const title = t_('compPopupTitle', 'Board Competences');
      return `${title} (${compsList.length})\n\n` + compsList.map(c => conBuildCompetenceNoteText(c, options)).join('\n\n\n');
    }

    function conCloseCompetenceNotePopover() {
      if (_conActiveCompNotePopover) {
        if (_conActiveCompNotePopover._cleanup) {
          _conActiveCompNotePopover._cleanup();
        }
        _conActiveCompNotePopover.remove();
        _conActiveCompNotePopover = null;
      }
    }

    async function conOpenCompetenceNotePopover(targetCompOrList, anchorEl, popoverOpts = {}) {
      conCloseCompetenceNotePopover();

      const t_ = (k, fb) => (typeof t === 'function' ? t(k) : fb);

      // Determine initial selection
      let singleComp = null;
      let multiComps = [];
      let isBatchInitial = !!popoverOpts.isBatch;

      if (Array.isArray(targetCompOrList)) {
        multiComps = targetCompOrList.slice();
        singleComp = multiComps[0] || null;
      } else {
        singleComp = targetCompOrList;
        multiComps = [targetCompOrList];
      }

      // Pre-resolve full competence details for all candidates
      const resolvedMap = new Map();
      const allToResolve = [singleComp, ...multiComps, ...(global._conCurrentCompetences || [])].filter(Boolean);
      await Promise.all(allToResolve.map(async (c) => {
        const key = String(c.id || c.code || c.title || '');
        if (!key || resolvedMap.has(key)) return;
        const res = await conResolveFullCompetence(c);
        resolvedMap.set(key, res);
      }));
      if (singleComp) {
        const sKey = String(singleComp.id || singleComp.code || singleComp.title || '');
        singleComp = resolvedMap.get(sKey) || singleComp;
      }
      multiComps = multiComps.map(c => {
        const key = String(c.id || c.code || c.title || '');
        return resolvedMap.get(key) || c;
      });

      // Load saved user preferences
      let elemPrefs = { code: true, title: true, desc: true, detailedDesc: false, category: false, level: false, tasks: false, tags: false };
      try {
        const stored = localStorage.getItem('cmt-comp-note-elements-pref');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            elemPrefs = Object.assign(elemPrefs, parsed);
          }
        }
      } catch (_) {}

      let chosenColor = '#ffffff';
      try {
        const storedColor = localStorage.getItem('cmt-comp-note-color-pref');
        if (storedColor) chosenColor = storedColor;
      } catch (_) {}

      let chosenMode = 'separate';
      try {
        const storedMode = localStorage.getItem('cmt-comp-note-mode-pref');
        if (storedMode === 'combined' || storedMode === 'separate') chosenMode = storedMode;
      } catch (_) {}

      // Scope: 'single', 'selected', or 'all'
      const totalBoardComps = (global._conCurrentCompetences || []).length;
      const selectedPopupCount = _conCompPopupSelectedSet.size;
      let currentScope = (isBatchInitial || !singleComp)
        ? (selectedPopupCount > 0 ? 'selected' : 'all')
        : 'single';

      function getEffectiveCompetenceList() {
        let list = [];
        if (currentScope === 'single' && singleComp) {
          list = [singleComp];
        } else if (currentScope === 'selected' && selectedPopupCount > 0) {
          list = (global._conCurrentCompetences || []).filter(c => _conCompPopupSelectedSet.has(String(c.id || c.code || c.title || '')));
        } else {
          list = (global._conCurrentCompetences || []).slice();
        }
        return list.map(c => {
          const key = String(c.id || c.code || c.title || '');
          return resolvedMap.get(key) || c;
        });
      }

      // Create Popover element
      const pop = document.createElement('div');
      pop.id = 'con-comp-note-popover';
      pop.className = 'con-comp-note-popover';
      _conActiveCompNotePopover = pop;

      // Header
      const hdr = document.createElement('div');
      hdr.className = 'con-comp-note-popover-hdr';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'con-comp-note-popover-title-wrap';
      const hdrIcon = document.createElement('img');
      hdrIcon.src = '../assets/icons/award.svg';
      hdrIcon.alt = '';
      const hdrText = document.createElement('span');
      titleWrap.appendChild(hdrIcon);
      titleWrap.appendChild(hdrText);

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'con-comp-note-popover-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = 'Close';
      closeBtn.onclick = (e) => { e.stopPropagation(); conCloseCompetenceNotePopover(); };

      hdr.appendChild(titleWrap);
      hdr.appendChild(closeBtn);
      pop.appendChild(hdr);

      // Body
      const body = document.createElement('div');
      body.className = 'con-comp-note-popover-body';

      // 1. Scope selection (only if more than 1 competence on the board)
      let scopeWrap = null;
      if (totalBoardComps > 1) {
        scopeWrap = document.createElement('div');
        const scopeTitle = document.createElement('div');
        scopeTitle.className = 'con-comp-note-section-title';
        scopeTitle.textContent = t_('compNoteScopeTitle', 'Apply To');
        scopeWrap.appendChild(scopeTitle);

        const scopeGroup = document.createElement('div');
        scopeGroup.className = 'con-comp-note-scope-group';

        // Single option
        if (singleComp) {
          const singleCode = String(singleComp.code || singleComp.id || singleComp.title || '');
          const lblSingle = document.createElement('label');
          lblSingle.className = 'con-comp-note-radio-label';
          const rSingle = document.createElement('input');
          rSingle.type = 'radio';
          rSingle.name = 'conCompNoteScope';
          rSingle.value = 'single';
          rSingle.checked = (currentScope === 'single');
          rSingle.onchange = () => { if (rSingle.checked) { currentScope = 'single'; onStateChanged(); } };
          const spanSingle = document.createElement('span');
          spanSingle.textContent = t_('compNoteScopeSingle', 'This competence only') + ` (${singleCode})`;
          lblSingle.appendChild(rSingle);
          lblSingle.appendChild(spanSingle);
          scopeGroup.appendChild(lblSingle);
        }

        // Selected option
        if (selectedPopupCount > 0) {
          const lblSelected = document.createElement('label');
          lblSelected.className = 'con-comp-note-radio-label';
          const rSelected = document.createElement('input');
          rSelected.type = 'radio';
          rSelected.name = 'conCompNoteScope';
          rSelected.value = 'selected';
          rSelected.checked = (currentScope === 'selected');
          rSelected.onchange = () => { if (rSelected.checked) { currentScope = 'selected'; onStateChanged(); } };
          const spanSelected = document.createElement('span');
          spanSelected.textContent = t_('compNoteScopeSelected', 'Selected competences ({count})').replace('{count}', selectedPopupCount);
          lblSelected.appendChild(rSelected);
          lblSelected.appendChild(spanSelected);
          scopeGroup.appendChild(lblSelected);
        }

        // All option
        const lblAll = document.createElement('label');
        lblAll.className = 'con-comp-note-radio-label';
        const rAll = document.createElement('input');
        rAll.type = 'radio';
        rAll.name = 'conCompNoteScope';
        rAll.value = 'all';
        rAll.checked = (currentScope === 'all');
        rAll.onchange = () => { if (rAll.checked) { currentScope = 'all'; onStateChanged(); } };
        const spanAll = document.createElement('span');
        spanAll.textContent = t_('compNoteScopeAll', 'All board competences ({count})').replace('{count}', totalBoardComps);
        lblAll.appendChild(rAll);
        lblAll.appendChild(spanAll);
        scopeGroup.appendChild(lblAll);

        scopeWrap.appendChild(scopeGroup);
        body.appendChild(scopeWrap);
      }

      // 2. Elements to include checklist
      const elemWrap = document.createElement('div');
      const elemTitle = document.createElement('div');
      elemTitle.className = 'con-comp-note-section-title';
      elemTitle.textContent = t_('compNoteElementsTitle', 'Elements to include in note:');
      elemWrap.appendChild(elemTitle);

      const elemGrid = document.createElement('div');
      elemGrid.className = 'con-comp-note-elements-grid';

      const elementDefs = [
        { key: 'code', label: t_('compNoteElCode', 'Code') },
        { key: 'title', label: t_('compNoteElTitle', 'Title') },
        { key: 'desc', label: t_('compNoteElDesc', 'Description') },
        { key: 'detailedDesc', label: t_('compNoteElDetailedDesc', 'Detailed Description') },
        { key: 'category', label: t_('compNoteElCategory', 'Domain / Category') },
        { key: 'level', label: t_('compNoteElLevel', 'Level / Year') },
        { key: 'tasks', label: t_('compNoteElTasks', 'Sample Tasks') },
        { key: 'tags', label: t_('compNoteElTags', 'Tags') }
      ];

      elementDefs.forEach(def => {
        const lbl = document.createElement('label');
        lbl.className = 'con-comp-note-check-label';
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = !!elemPrefs[def.key];
        chk.onchange = () => {
          elemPrefs[def.key] = chk.checked;
          try {
            localStorage.setItem('cmt-comp-note-elements-pref', JSON.stringify(elemPrefs));
          } catch (_) {}
          onStateChanged();
        };
        const txt = document.createElement('span');
        txt.textContent = def.label;
        lbl.appendChild(chk);
        lbl.appendChild(txt);
        elemGrid.appendChild(lbl);
      });
      elemWrap.appendChild(elemGrid);

      // Interactive Detailed Description Lines box
      const detailedLinesBox = document.createElement('div');
      detailedLinesBox.className = 'con-comp-note-detailed-box';
      detailedLinesBox.style.display = 'none';

      const initialTargetComp = singleComp || (multiComps && multiComps[0]);
      let availableDetailedLines = (initialTargetComp && Array.isArray(initialTargetComp.detailedDescription))
        ? initialTargetComp.detailedDescription.slice()
        : [];
      const selectedDetailedLinesSet = new Set(availableDetailedLines);
      let lastDetailedCompKey = initialTargetComp ? String(initialTargetComp.id || initialTargetComp.code || initialTargetComp.title || '') : '';

      function refreshDetailedLinesUi() {
        const targets = getEffectiveCompetenceList();
        const isMulti = targets.length > 1;

        if (!elemPrefs.detailedDesc || isMulti) {
          detailedLinesBox.style.display = 'none';
          return;
        }

        const activeComp = targets[0] || singleComp;
        const currentCompKey = activeComp ? String(activeComp.id || activeComp.code || activeComp.title || '') : '';
        if (currentCompKey && currentCompKey !== lastDetailedCompKey) {
          lastDetailedCompKey = currentCompKey;
          selectedDetailedLinesSet.clear();
          const newLines = (activeComp && Array.isArray(activeComp.detailedDescription))
            ? activeComp.detailedDescription.slice()
            : [];
          newLines.forEach(l => selectedDetailedLinesSet.add(l));
        }

        const currentLines = (activeComp && Array.isArray(activeComp.detailedDescription))
          ? activeComp.detailedDescription.slice()
          : [];

        if (!currentLines.length) {
          detailedLinesBox.style.display = 'none';
          return;
        }

        detailedLinesBox.style.display = 'flex';
        detailedLinesBox.innerHTML = '';

        const dHdr = document.createElement('div');
        dHdr.className = 'con-comp-note-detailed-hdr';
        const dTitle = document.createElement('span');
        const activeCount = currentLines.filter(l => selectedDetailedLinesSet.has(l)).length;
        dTitle.textContent = t_('compNoteDetailedLines', 'Detailed Description Lines') + ` (${activeCount}/${currentLines.length})`;
        
        const dToggleBtn = document.createElement('button');
        dToggleBtn.type = 'button';
        dToggleBtn.className = 'con-comp-note-detailed-quick-btn';
        const allChecked = activeCount === currentLines.length;
        dToggleBtn.textContent = allChecked ? t_('compDeselectVisible', 'Deselect all') : t_('compSelectVisible', 'Select all');
        dToggleBtn.onclick = (e) => {
          e.stopPropagation();
          if (allChecked) {
            currentLines.forEach(l => selectedDetailedLinesSet.delete(l));
          } else {
            currentLines.forEach(l => selectedDetailedLinesSet.add(l));
          }
          refreshDetailedLinesUi();
          onStateChanged();
        };

        dHdr.appendChild(dTitle);
        dHdr.appendChild(dToggleBtn);
        detailedLinesBox.appendChild(dHdr);

        currentLines.forEach(line => {
          const row = document.createElement('label');
          row.className = 'con-comp-note-detailed-line';
          const lineChk = document.createElement('input');
          lineChk.type = 'checkbox';
          lineChk.checked = selectedDetailedLinesSet.has(line);
          lineChk.onchange = () => {
            if (lineChk.checked) selectedDetailedLinesSet.add(line);
            else selectedDetailedLinesSet.delete(line);
            const newCount = currentLines.filter(l => selectedDetailedLinesSet.has(l)).length;
            dTitle.textContent = t_('compNoteDetailedLines', 'Detailed Description Lines') + ` (${newCount}/${currentLines.length})`;
            dToggleBtn.textContent = newCount === currentLines.length
              ? t_('compDeselectVisible', 'Deselect all')
              : t_('compSelectVisible', 'Select all');
            onStateChanged();
          };
          const lineTxt = document.createElement('span');
          lineTxt.textContent = line;
          row.appendChild(lineChk);
          row.appendChild(lineTxt);
          detailedLinesBox.appendChild(row);
        });
      }

      elemWrap.appendChild(detailedLinesBox);
      body.appendChild(elemWrap);

      // 3. Multi-note mode selection (separate vs combined)
      const modeWrap = document.createElement('div');
      const modeTitle = document.createElement('div');
      modeTitle.className = 'con-comp-note-section-title';
      modeTitle.textContent = t_('compNoteModeTitle', 'Creation mode:');
      modeWrap.appendChild(modeTitle);

      const modeGroup = document.createElement('div');
      modeGroup.className = 'con-comp-note-mode-group';

      const lblSep = document.createElement('label');
      lblSep.className = 'con-comp-note-radio-label';
      const rSep = document.createElement('input');
      rSep.type = 'radio';
      rSep.name = 'conCompNoteMode';
      rSep.value = 'separate';
      rSep.checked = (chosenMode === 'separate');
      rSep.onchange = () => {
        if (rSep.checked) {
          chosenMode = 'separate';
          try { localStorage.setItem('cmt-comp-note-mode-pref', 'separate'); } catch (_) {}
          onStateChanged();
        }
      };
      const spanSep = document.createElement('span');
      spanSep.textContent = t_('compNoteModeSeparate', 'Separate note for each competence');
      lblSep.appendChild(rSep);
      lblSep.appendChild(spanSep);

      const lblComb = document.createElement('label');
      lblComb.className = 'con-comp-note-radio-label';
      const rComb = document.createElement('input');
      rComb.type = 'radio';
      rComb.name = 'conCompNoteMode';
      rComb.value = 'combined';
      rComb.checked = (chosenMode === 'combined');
      rComb.onchange = () => {
        if (rComb.checked) {
          chosenMode = 'combined';
          try { localStorage.setItem('cmt-comp-note-mode-pref', 'combined'); } catch (_) {}
          onStateChanged();
        }
      };
      const spanComb = document.createElement('span');
      spanComb.textContent = t_('compNoteModeCombined', 'Single combined summary note');
      lblComb.appendChild(rComb);
      lblComb.appendChild(spanComb);

      modeGroup.appendChild(lblSep);
      modeGroup.appendChild(lblComb);
      modeWrap.appendChild(modeGroup);
      body.appendChild(modeWrap);

      // 4. Color selection
      const colorWrap = document.createElement('div');
      const colorTitle = document.createElement('div');
      colorTitle.className = 'con-comp-note-section-title';
      colorTitle.textContent = t_('compNoteColorTitle', 'Card color:');
      colorWrap.appendChild(colorTitle);

      const colorsRow = document.createElement('div');
      colorsRow.className = 'con-comp-note-colors-row';

      const colorOptions = [
        { hex: '#ffffff', title: 'White' },
        { hex: '#fef9c3', title: 'Yellow' },
        { hex: '#e0f2fe', title: 'Blue' },
        { hex: '#dcfce7', title: 'Green' },
        { hex: '#f3e8ff', title: 'Purple' }
      ];

      colorOptions.forEach(opt => {
        const chip = document.createElement('div');
        chip.className = 'con-comp-note-color-chip' + (chosenColor === opt.hex ? ' is-active' : '');
        chip.style.backgroundColor = opt.hex;
        chip.title = opt.title;
        chip.onclick = () => {
          chosenColor = opt.hex;
          try { localStorage.setItem('cmt-comp-note-color-pref', opt.hex); } catch (_) {}
          colorsRow.querySelectorAll('.con-comp-note-color-chip').forEach(c => c.classList.remove('is-active'));
          chip.classList.add('is-active');
          onStateChanged();
        };
        colorsRow.appendChild(chip);
      });
      colorWrap.appendChild(colorsRow);
      body.appendChild(colorWrap);

      // 5. Live Preview
      const prevWrap = document.createElement('div');
      const prevTitle = document.createElement('div');
      prevTitle.className = 'con-comp-note-section-title';
      prevTitle.textContent = t_('compNotePreviewTitle', 'Live Preview:');
      prevWrap.appendChild(prevTitle);

      const previewBox = document.createElement('div');
      previewBox.className = 'con-comp-note-preview-box';
      prevWrap.appendChild(previewBox);
      body.appendChild(prevWrap);

      pop.appendChild(body);

      // Footer
      const ftr = document.createElement('div');
      ftr.className = 'con-comp-note-popover-ftr';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'con-comp-note-btn con-comp-note-btn-secondary';
      copyBtn.innerHTML = `<img src="../assets/icons/copy.svg" alt="" /><span>${t_('compNoteBtnCopyText', 'Copy Text')}</span>`;
      copyBtn.onclick = async (e) => {
        e.stopPropagation();
        const targets = getEffectiveCompetenceList();
        const isMulti = targets.length > 1;
        const isCombined = (chosenMode === 'combined' && isMulti);
        const resolved = await Promise.all(targets.map(c => conResolveFullCompetence(c)));
        const activeOpts = Object.assign({}, elemPrefs, {
          selectedDetailedLines: isMulti ? null : (selectedDetailedLinesSet.size > 0 ? Array.from(selectedDetailedLinesSet) : [])
        });
        const textToCopy = isCombined
          ? conBuildCombinedCompetenceNoteText(resolved, activeOpts)
          : conBuildCompetenceNoteText(resolved[0], activeOpts);

        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(textToCopy);
            if (typeof showToast === 'function') {
              showToast(t_('compNoteToastCopied', 'Competence note text copied to clipboard.'));
            }
          } catch (_) {}
        }
      };

      const ftrRight = document.createElement('div');
      ftrRight.className = 'con-comp-note-ftr-right';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'con-comp-note-btn con-comp-note-btn-secondary';
      cancelBtn.textContent = t_('btnCancel', 'Cancel');
      cancelBtn.onclick = (e) => { e.stopPropagation(); conCloseCompetenceNotePopover(); };

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'con-comp-note-btn con-comp-note-btn-primary';
      addBtn.innerHTML = `<img src="../assets/icons/note.svg" alt="" /><span>${t_('compNoteBtnAdd', 'Add Note to Board')}</span>`;
      addBtn.onclick = async (e) => {
        e.stopPropagation();
        const targets = getEffectiveCompetenceList();
        const isMulti = targets.length > 1;
        conCloseCompetenceNotePopover();
        const popupEl = document.getElementById('con-comp-group-popup');
        if (popupEl) popupEl.classList.remove('con-comp-popup-open');

        await conExecuteAddCompetenceNotes(targets, {
          mode: chosenMode,
          bg: chosenColor,
          code: !!elemPrefs.code,
          title: !!elemPrefs.title,
          desc: !!elemPrefs.desc,
          detailedDesc: !!elemPrefs.detailedDesc,
          selectedDetailedLines: isMulti ? null : (selectedDetailedLinesSet.size > 0 ? Array.from(selectedDetailedLinesSet) : []),
          category: !!elemPrefs.category,
          level: !!elemPrefs.level,
          tasks: !!elemPrefs.tasks,
          tags: !!elemPrefs.tags
        });
      };

      ftrRight.appendChild(cancelBtn);
      ftrRight.appendChild(addBtn);
      ftr.appendChild(copyBtn);
      ftr.appendChild(ftrRight);
      pop.appendChild(ftr);

      // Live updates & preview refresh
      function onStateChanged() {
        const targets = getEffectiveCompetenceList();
        const isMulti = targets.length > 1;

        // Title update
        if (isMulti) {
          hdrText.textContent = t_('compNotePopoverTitleMulti', 'Copy Competences to Board') + ` (${targets.length})`;
          modeWrap.style.display = 'block';
        } else {
          const sample = targets[0] || singleComp;
          const code = sample ? String(sample.code || sample.id || sample.title || '') : '';
          hdrText.textContent = t_('compNotePopoverTitle', 'Copy Competence to Board') + (code ? `: ${code}` : '');
          modeWrap.style.display = 'none';
        }

        refreshDetailedLinesUi();

        const activeOpts = Object.assign({}, elemPrefs, {
          selectedDetailedLines: isMulti ? null : (selectedDetailedLinesSet.size > 0 ? Array.from(selectedDetailedLinesSet) : [])
        });

        // Preview box styling & content
        previewBox.style.backgroundColor = chosenColor;
        const sampleComp = targets[0] || singleComp;
        if (chosenMode === 'combined' && isMulti) {
          previewBox.innerHTML = conBuildCombinedCompetenceNoteHtml(targets.slice(0, 3), activeOpts) +
            (targets.length > 3 ? `<div style="font-size:0.75rem;color:#888;text-align:center;margin-top:6px;">… and ${targets.length - 3} more</div>` : '');
        } else if (sampleComp) {
          previewBox.innerHTML = conBuildCompetenceNoteHtml(sampleComp, activeOpts);
        } else {
          previewBox.innerHTML = '<div style="color:#888;font-style:italic;">No competence selected</div>';
        }

        // Add button label
        if (isMulti) {
          addBtn.innerHTML = `<img src="../assets/icons/note.svg" alt="" /><span>${t_('compNoteBtnAdd', 'Add to Board')} (${targets.length})</span>`;
        } else {
          addBtn.innerHTML = `<img src="../assets/icons/note.svg" alt="" /><span>${t_('compNoteBtnAdd', 'Add Note to Board')}</span>`;
        }
      }

      onStateChanged();

      // Mount into DOM
      document.body.appendChild(pop);

      // Positioning logic
      const anchorRect = anchorEl && anchorEl.getBoundingClientRect
        ? anchorEl.getBoundingClientRect()
        : { left: window.innerWidth / 2 - 150, top: 100, bottom: 140, right: window.innerWidth / 2 + 150 };

      const popW = pop.offsetWidth || 380;
      const popH = pop.offsetHeight || 440;

      let left = Math.round(anchorRect.right + 12);
      if (left + popW > window.innerWidth - 12) {
        left = Math.max(12, Math.round(anchorRect.left - popW - 12));
        if (left < 12) {
          left = Math.max(12, Math.round((window.innerWidth - popW) / 2));
        }
      }

      let top = Math.max(12, Math.min(Math.round(anchorRect.top), window.innerHeight - popH - 12));
      pop.style.left = left + 'px';
      pop.style.top = top + 'px';

      // Defensive click outside & Escape listeners
      const onOutsideClick = (e) => {
        if (!pop.contains(e.target) && (!anchorEl || !anchorEl.contains(e.target))) {
          conCloseCompetenceNotePopover();
        }
      };

      const onKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          conCloseCompetenceNotePopover();
        }
      };

      pop._cleanup = () => {
        document.removeEventListener('mousedown', onOutsideClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
      };

      setTimeout(() => {
        if (!_conActiveCompNotePopover) return;
        document.addEventListener('mousedown', onOutsideClick, true);
        document.addEventListener('keydown', onKeyDown, true);
      }, 0);
    }

    async function conExecuteAddCompetenceNotes(compsToAdd, options = {}) {
      if (!compsToAdd || !compsToAdd.length) return;
      const board = document.getElementById('constellation-board');
      if (!board) return;

      const t_ = (k, fb) => (typeof t === 'function' ? t(k) : fb);

      if (typeof window.conPushUndo === 'function') window.conPushUndo();

      const zoom = (typeof window.conGetZoom === 'function' ? window.conGetZoom() : 1) || 1;
      const bW = board.clientWidth || 800;
      const bH = board.clientHeight || 600;
      const scrollL = board.scrollLeft || 0;
      const scrollT = board.scrollTop || 0;
      const centerX = Math.round((scrollL + bW / 2) / zoom);
      const centerY = Math.round((scrollT + bH / 2) / zoom);

      // Resolve full records for all targets
      const resolvedList = await Promise.all(compsToAdd.map(c => conResolveFullCompetence(c)));
      const isCombined = options.mode === 'combined' && resolvedList.length > 1;

      if (isCombined) {
        const text = conBuildCombinedCompetenceNoteText(resolvedList, options);
        const noteData = {
          id: null,
          nodeId: null,
          text: text,
          html: '',
          x: Math.max(40, centerX - 180),
          y: Math.max(40, centerY - 120),
          color: '#111111',
          bg: options.bg || '#ffffff',
          borderWidth: 0,
          borderColor: '',
          borderStyle: '',
          fontSize: 16,
          bold: false, italic: false, underline: false, strike: false,
          hidden: false, locked: false, manualSize: false,
          width: 360, height: null
        };
        if (typeof window.conAddNoteObject === 'function') {
          window.conAddNoteObject(noteData);
          if (typeof window.conSelectNote === 'function' && noteData.id) {
            window.conSelectNote(noteData.id);
          }
        }
      } else {
        const cols = Math.min(3, Math.max(1, Math.floor(bW / (340 * zoom))));
        resolvedList.forEach((comp, idx) => {
          const text = conBuildCompetenceNoteText(comp, options);
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const startX = centerX - Math.round((cols * 340) / 2);
          const noteX = Math.max(40, startX + (col * 350));
          const noteY = Math.max(40, centerY - 100 + (row * 190));

          const noteData = {
            id: null,
            nodeId: null,
            text: text,
            html: '',
            x: noteX,
            y: noteY,
            color: '#111111',
            bg: options.bg || '#ffffff',
            borderWidth: 0,
            borderColor: '',
            borderStyle: '',
            fontSize: 16,
            bold: false, italic: false, underline: false, strike: false,
            hidden: false, locked: false, manualSize: false,
            width: 320, height: null
          };
          if (typeof window.conAddNoteObject === 'function') {
            window.conAddNoteObject(noteData);
            if (idx === 0 && typeof window.conSelectNote === 'function' && noteData.id) {
              window.conSelectNote(noteData.id);
            }
          }
        });
      }

      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      if (typeof window.boardSetDirty === 'function') window.boardSetDirty(true);
      if (typeof BoardAudioService !== 'undefined' && typeof BoardAudioService.playAction === 'function') {
        BoardAudioService.playAction('create_note');
      }
      if (typeof showToast === 'function') {
        showToast(t_('compNoteToastAdded', 'Added {count} competence note(s) to board.').replace('{count}', resolvedList.length));
      }
    }

    function conUpdateNodeCompetenceBadge(nodeObj) {
      if (!nodeObj || !nodeObj.el) return;
      let badge = nodeObj.el.querySelector('.con-node-comp-badge');
      const compList = Array.isArray(nodeObj.competences) ? nodeObj.competences : (Array.isArray(nodeObj.competenceTags) ? nodeObj.competenceTags : []);
      if (compList.length > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'con-node-comp-badge';
          badge.onclick = (e) => {
            e.stopPropagation();
            conOpenCompetenceModal('node', nodeObj.id);
          };
          nodeObj.el.appendChild(badge);
        }
        const codes = compList.map(c => c.code || c.title || c.id).filter(Boolean);
        badge.title = (typeof tFmt === 'function' ? tFmt('compNodeBadgeTitle', { codes: codes.join(', ') }) : ('Competences: ' + codes.join(', ')));
        badge.innerHTML = `<img src="../assets/icons/award.svg" alt="" /> ${compList.length === 1 ? (boardEscapeHtml(codes[0]) || '1') : compList.length}`;
      } else if (badge) {
        badge.remove();
      }
    }

    function conParseCompetenceRecords(content) {
      if (!content || typeof content !== 'string') return [];
      const trimmed = content.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const obj = JSON.parse(trimmed);
          if (Array.isArray(obj)) return obj;
          if (Array.isArray(obj.competences)) return obj.competences;
          if (Array.isArray(obj.customCompetenceBank)) return obj.customCompetenceBank;
          if (Array.isArray(obj.descriptors)) return obj.descriptors;
          if (Array.isArray(obj.records)) return obj.records;
        } catch (_) {}
      }
      try {
        const fn = new Function(content + '\n;try{if(typeof customCompetenceBank!=="undefined")return customCompetenceBank;if(typeof window!=="undefined"&&window.customCompetenceBank)return window.customCompetenceBank;if(typeof customDescriptorBank!=="undefined")return customDescriptorBank;if(typeof window!=="undefined"&&window.customDescriptorBank)return window.customDescriptorBank;}catch(e){}return [];');
        const res = fn();
        if (Array.isArray(res) && res.length > 0) return res;
      } catch (_) {}
      return [];
    }

    async function conLoadAvailableCompetences(forceReload = false) {
      if (_conAvailableCompetences.length && !_conLoadingCompetences && !forceReload) {
        return _conAvailableCompetences;
      }
      _conLoadingCompetences = true;
      const compMap = new Map();

      function addOrUpdateComp(item) {
        if (!item || typeof item !== 'object') return;
        const id = String(item.id || item.code || item.title || '').trim();
        if (!id) return;
        const code = String(item.code || '').trim();
        const title = String(item.title || item.name || '').trim();
        const subjectId = String(item.subjectId || item.subject || '').trim();
        const category = String(item.category || item.domain || item.competence || item.subject || item.strand || '').trim();
        const level = String(item.level || '').trim();
        const yearLevel = String(item.yearLevel || item.year || item.grade || '').trim();
        const description = String(item.description || item.statement || '').trim();
        const rawDetailed = item.detailedDescription || item.detailedLines || item.details;
        const detailedDescription = Array.isArray(rawDetailed)
          ? rawDetailed.map(s => String(s).trim()).filter(Boolean)
          : (rawDetailed ? String(rawDetailed).split(/\r?\n/).map(s => s.trim()).filter(Boolean) : []);
        const sampleTasks = String(item.sampleTasks || item.sampleTask || item.examples || '').trim();
        const tags = Array.isArray(item.tags) ? item.tags : (item.tags ? String(item.tags).split(',').map(s => s.trim()).filter(Boolean) : []);

        if (!compMap.has(id)) {
          compMap.set(id, {
            id,
            code: code || id,
            title: title || code || id,
            subjectId,
            category,
            level,
            yearLevel,
            description,
            detailedDescription,
            sampleTasks,
            tags
          });
        } else {
          const existing = compMap.get(id);
          if (!existing.code && code) existing.code = code;
          if (!existing.title && title) existing.title = title;
          if (!existing.subjectId && subjectId) existing.subjectId = subjectId;
          if (!existing.category && category) existing.category = category;
          if (!existing.level && level) existing.level = level;
          if (!existing.yearLevel && yearLevel) existing.yearLevel = yearLevel;
          if (!existing.description && description) existing.description = description;
          if ((!existing.detailedDescription || !existing.detailedDescription.length) && detailedDescription.length) {
            existing.detailedDescription = detailedDescription;
          }
          if (!existing.sampleTasks && sampleTasks) existing.sampleTasks = sampleTasks;
        }
      }

      if (window.Desktop && typeof Desktop.listFiles === 'function') {
        try {
          const res = await Desktop.listFiles('customCompetences', { extensions: ['.js', '.json'] });
          const flist = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
          for (const item of flist) {
            const fn = typeof item === 'string' ? item : (item && item.filename);
            if (!fn) continue;
            const readRes = await Desktop.readText('customCompetences', fn);
            if (readRes && readRes.ok && readRes.content) {
              conParseCompetenceRecords(readRes.content).forEach(addOrUpdateComp);
            }
          }
        } catch (_) {}

        try {
          const res = await Desktop.listFiles('customDescriptors', { extensions: ['.js', '.json'] });
          const flist = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
          for (const item of flist) {
            const fn = typeof item === 'string' ? item : (item && item.filename);
            if (!fn) continue;
            const readRes = await Desktop.readText('customDescriptors', fn);
            if (readRes && readRes.ok && readRes.content) {
              conParseCompetenceRecords(readRes.content).forEach(addOrUpdateComp);
            }
          }
        } catch (_) {}

        try {
          let r = await Desktop.readText('user', 'lesson-competences.json');
          if (!r || !r.ok) r = await Desktop.readText('user', 'lesson-descriptors.json');
          if (r && r.ok && r.content) {
            conParseCompetenceRecords(r.content).forEach(addOrUpdateComp);
          }
        } catch (_) {}
      }

      try {
        const stored = localStorage.getItem('cmt-lesson-competences') || localStorage.getItem('cmt-lesson-descriptors');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) parsed.forEach(addOrUpdateComp);
        }
      } catch (_) {}

      _conAvailableCompetences = Array.from(compMap.values());
      _conLoadingCompetences = false;
      return _conAvailableCompetences;
    }

    function conGetPlannerSuggestedCompetences() {
      const results = [];
      const seen = new Set();
      const addComp = (c) => {
        if (!c) return;
        const code = String(typeof c === 'object' ? (c.code || c.id || c.title) : c).trim();
        if (code && !seen.has(code.toLowerCase())) {
          seen.add(code.toLowerCase());
          results.push(c);
        }
      };

      // 1. From linked planner entries
      const activePids = (typeof bpGetEntryIds === 'function')
        ? bpGetEntryIds()
        : (activePlannerEntryId ? [activePlannerEntryId] : []);
      if (activePids.length && window.PLANNER_ENTRIES_BY_CLASS) {
        const byClass = window.PLANNER_ENTRIES_BY_CLASS;
        const pidSet = new Set(activePids);
        for (const cid of Object.keys(byClass)) {
          const list = Array.isArray(byClass[cid]) ? byClass[cid] : [];
          list.forEach(e => {
            if (e && pidSet.has(e.id)) {
              if (Array.isArray(e.competences)) e.competences.forEach(addComp);
              if (Array.isArray(e.competenceIds)) e.competenceIds.forEach(addComp);
            }
          });
        }
      }

      // 2. From linked lesson or competences in LinksService
      if (typeof LinksService !== 'undefined' && typeof boardGetActiveSessionUrn === 'function') {
        const sessionUrn = boardGetActiveSessionUrn();
        const links = LinksService.getLinksForSync(sessionUrn) || [];
        links.forEach(l => {
          const p = LinksService.parseUrn(l.otherUrn);
          if (p && (p.type === 'competence' || p.type === 'competences')) {
            addComp(l.targetMeta || { code: p.id, id: p.id, title: (l.targetMeta && l.targetMeta.title) || p.id });
          }
        });
      }

      return results;
    }

    async function conOpenCompetenceModal(targetType = 'board', targetId = null) {
      _conCompModalTarget = { type: targetType, id: targetId };
      _conCompSelectedIds = new Set();
      _conCompSelectedObjects = new Map();
      _conCompFilterSelectedOnly = false;

      const overlay = document.getElementById('con-competence-overlay');
      const badgeEl = document.getElementById('con-comp-modal-target-badge');
      const searchInput = document.getElementById('con-comp-search-input');
      const selectedFilterBtn = document.getElementById('con-comp-filter-selected-btn');
      const suggestionBanner = document.getElementById('con-comp-planner-suggestion');
      const suggestionText = document.getElementById('con-comp-planner-suggestion-text');

      if (selectedFilterBtn) selectedFilterBtn.classList.remove('active');
      if (searchInput) searchInput.value = '';

      let initialList = [];
      if (targetType === 'node') {
        const nodes = (typeof conGetNodes === 'function' ? conGetNodes() : window.conNodes) || [];
        const node = nodes.find(n => n.id === targetId);
        const nodeLabel = (node && (node.baseWord || (node.el && node.el.textContent.trim()))) || targetId || '';
        if (badgeEl) badgeEl.textContent = (typeof t === 'function' ? t('targetConstellationNode') : 'Selected Node') + (nodeLabel ? `: "${nodeLabel}"` : '');
        initialList = (node && Array.isArray(node.competences)) ? node.competences : ((node && Array.isArray(node.competenceTags)) ? node.competenceTags : []);
      } else {
        const currentTitle = (typeof window.conGetTitle === 'function' ? window.conGetTitle() : '') || _conCurrentFileName || 'Board File';
        if (badgeEl) badgeEl.textContent = (typeof t === 'function' ? t('targetBoardFile') : 'Board File') + `: ${currentTitle}`;
        initialList = Array.isArray(global._conCurrentCompetences) ? global._conCurrentCompetences : [];
      }

      initialList.forEach(item => {
        if (!item) return;
        const id = String(item.id || item.code || item.title || '').trim();
        if (id) {
          _conCompSelectedIds.add(id);
          _conCompSelectedObjects.set(id, item);
        }
      });

      // Check planner suggestions
      _conPlannerSuggestedCompetences = conGetPlannerSuggestedCompetences();
      if (suggestionBanner && suggestionText) {
        if (_conPlannerSuggestedCompetences.length > 0) {
          const suggestedCodes = _conPlannerSuggestedCompetences.map(c => typeof c === 'string' ? c : (c.code || c.title || c.id)).filter(Boolean);
          suggestionText.textContent = (typeof t === 'function' ? t('suggestFromPlanner') : 'Suggest from linked Planner lesson') + ` (${suggestedCodes.join(', ')})`;
          suggestionBanner.style.display = 'flex';
        } else {
          suggestionBanner.style.display = 'none';
        }
      }

      overlay.style.display = 'flex';

      const listEl = document.getElementById('con-comp-picker-list');
      if (listEl) listEl.innerHTML = '<div style="text-align:center;color:#888;padding:20px;font-size:0.85rem;">Loading competences…</div>';

      const comps = await conLoadAvailableCompetences();

      // Populate filters
      const subjectSelect = document.getElementById('con-comp-filter-subject');
      const domainSelect = document.getElementById('con-comp-filter-domain');
      const levelSelect = document.getElementById('con-comp-filter-level');
      const yearSelect = document.getElementById('con-comp-filter-year');

      const subjects = new Set();
      const domains = new Set();
      const levels = new Set();
      const years = new Set();

      comps.forEach(c => {
        if (c.subjectId) subjects.add(c.subjectId);
        if (c.category) domains.add(c.category);
        if (c.level) levels.add(c.level);
        if (c.yearLevel) years.add(c.yearLevel);
      });

      if (subjectSelect) {
        subjectSelect.innerHTML = `<option value="all">${typeof t === 'function' ? t('lcAllSubjects') : 'All Subjects'}</option>`;
        Array.from(subjects).sort().forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          subjectSelect.appendChild(opt);
        });
        subjectSelect.value = 'all';
      }

      if (domainSelect) {
        domainSelect.innerHTML = `<option value="all">${typeof t === 'function' ? t('compAllDomains') : 'All Domains'}</option>`;
        Array.from(domains).sort().forEach(d => {
          const opt = document.createElement('option');
          opt.value = d;
          opt.textContent = d;
          domainSelect.appendChild(opt);
        });
        domainSelect.value = 'all';
      }

      if (levelSelect) {
        levelSelect.innerHTML = `<option value="all">${typeof t === 'function' ? t('compAllLevels') : 'All Levels'}</option>`;
        Array.from(levels).sort().forEach(l => {
          const opt = document.createElement('option');
          opt.value = l;
          opt.textContent = l;
          levelSelect.appendChild(opt);
        });
        levelSelect.value = 'all';
      }

      if (yearSelect) {
        yearSelect.innerHTML = `<option value="all">${typeof t === 'function' ? t('compAllYears') : 'All Years'}</option>`;
        Array.from(years).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).forEach(y => {
          const opt = document.createElement('option');
          opt.value = y;
          opt.textContent = y;
          yearSelect.appendChild(opt);
        });
        yearSelect.value = 'all';
      }

      // Auto-prefilter by active board class or linked class/lesson/planner in LinksService
      let boardClassId = (typeof activeClassGroup === 'string' && activeClassGroup.trim())
        ? activeClassGroup.trim()
        : ((typeof _conGetActiveClassId === 'function' ? _conGetActiveClassId() : null) || (window._conCurrentBoard && (window._conCurrentBoard.activeClassId || window._conCurrentBoard.classId)) || null);
      let resolvedCtxLevel = '';

      if (!boardClassId && typeof activePlannerEntryId === 'string' && activePlannerEntryId.trim() && window.PLANNER_ENTRIES_BY_CLASS) {
        const pid = activePlannerEntryId.trim();
        for (const cid of Object.keys(window.PLANNER_ENTRIES_BY_CLASS)) {
          const arr = window.PLANNER_ENTRIES_BY_CLASS[cid];
          if (Array.isArray(arr) && arr.some(e => e && e.id === pid)) {
            boardClassId = cid;
            break;
          }
        }
      }

      if (typeof LinksService !== 'undefined' && typeof boardGetActiveSessionUrn === 'function') {
        try {
          const sessionUrn = boardGetActiveSessionUrn();
          if (!boardClassId && typeof LinksService.getLinksFor === 'function') {
            const sLinks = await LinksService.getLinksFor(sessionUrn);
            const clsLink = (sLinks || []).find(l => {
              const p = LinksService.parseUrn(l.otherUrn);
              return p && (p.type === 'class' || p.type === 'classes');
            });
            if (clsLink) {
              const p = LinksService.parseUrn(clsLink.otherUrn);
              if (p && p.id) boardClassId = p.id;
            }
            if (!boardClassId) {
              for (const l of (sLinks || [])) {
                const p = LinksService.parseUrn(l.otherUrn);
                if (p && (p.type === 'lesson' || p.type === 'planner' || p.type === 'slot')) {
                  const tm = l.targetMeta || l.meta || {};
                  if (tm.classId || tm.classGroup) {
                    boardClassId = tm.classId || tm.classGroup;
                    break;
                  }
                }
              }
            }
          }
          if (typeof LinksService.resolveContext === 'function') {
            const ctx = await LinksService.resolveContext({ urn: sessionUrn, classId: boardClassId || undefined });
            if (ctx && ctx.level) resolvedCtxLevel = String(ctx.level).trim();
          }
        } catch (_) {}
      }

      if ((boardClassId || resolvedCtxLevel) && typeof CompetenceAggregatorService !== 'undefined') {
        try {
          const meta = boardClassId ? await CompetenceAggregatorService.getGroupMetadata(boardClassId) : null;
          if (meta && meta.subject && subjectSelect) {
            const targetSubj = String(meta.subject).toLowerCase().trim();
            for (let i = 0; i < subjectSelect.options.length; i++) {
              const v = subjectSelect.options[i].value.toLowerCase().trim();
              const txt = subjectSelect.options[i].textContent.toLowerCase().trim();
              if (v !== 'all' && v !== '' && (v === targetSubj || txt === targetSubj || (v.length > 2 && targetSubj.includes(v)) || (targetSubj.length > 2 && v.includes(targetSubj)))) {
                subjectSelect.selectedIndex = i;
                break;
              }
            }
          }
          const rawLvl = (meta && (meta.level || meta.yearLevel || meta.year)) || resolvedCtxLevel || '';
          if (rawLvl) {
            const targetLvl = String(rawLvl).toLowerCase().trim();
            let matchedYear = false;
            // 1. Try exact match on yearSelect
            if (yearSelect) {
              for (let i = 0; i < yearSelect.options.length; i++) {
                const v = yearSelect.options[i].value.toLowerCase().trim();
                const txt = yearSelect.options[i].textContent.toLowerCase().trim();
                if (v !== 'all' && v !== '' && (v === targetLvl || txt === targetLvl)) {
                  yearSelect.selectedIndex = i;
                  matchedYear = true;
                  break;
                }
              }
              // Normalized token match (e.g. "4", "4e", "4ème", "Grade 4")
              if (!matchedYear) {
                const numMatch = targetLvl.match(/(?:^|\D)([1-6])(?:\D|$)/);
                const targetNum = numMatch ? numMatch[1] : null;
                for (let i = 0; i < yearSelect.options.length; i++) {
                  const v = yearSelect.options[i].value.toLowerCase().trim();
                  const txt = yearSelect.options[i].textContent.toLowerCase().trim();
                  if (v !== 'all' && v !== '') {
                    if (targetNum && (new RegExp('(?:^|\\D)' + targetNum + '(?:[eè]me?|e|th)?(?:\\D|$)', 'i').test(v) || new RegExp('(?:^|\\D)' + targetNum + '(?:[eè]me?|e|th)?(?:\\D|$)', 'i').test(txt))) {
                      yearSelect.selectedIndex = i;
                      matchedYear = true;
                      break;
                    }
                  }
                }
              }
            }
            // 2. Try match on levelSelect (CEFR / grade levels)
            if (levelSelect) {
              for (let i = 0; i < levelSelect.options.length; i++) {
                const v = levelSelect.options[i].value.toLowerCase().trim();
                const txt = levelSelect.options[i].textContent.toLowerCase().trim();
                if (v !== 'all' && v !== '' && (v === targetLvl || txt === targetLvl || (targetLvl.length >= 2 && (v.includes(targetLvl) || targetLvl.includes(v))))) {
                  levelSelect.selectedIndex = i;
                  break;
                }
              }
            }
          }
        } catch (_) {}
      }

      conFilterCompetencePicker();
    }

    function conCloseCompetenceModal() {
      const overlay = document.getElementById('con-competence-overlay');
      if (overlay) overlay.style.display = 'none';
      _conCompModalTarget = { type: 'board', id: null };
    }

    function conToggleCompFilterSelected(btn) {
      _conCompFilterSelectedOnly = !_conCompFilterSelectedOnly;
      if (btn) btn.classList.toggle('active', _conCompFilterSelectedOnly);
      conFilterCompetencePicker();
    }

    function conFilterCompetencePicker() {
      const searchVal = (document.getElementById('con-comp-search-input')?.value || '').trim().toLowerCase();
      const subjectVal = document.getElementById('con-comp-filter-subject')?.value || 'all';
      const domainVal = document.getElementById('con-comp-filter-domain')?.value || 'all';
      const levelVal = document.getElementById('con-comp-filter-level')?.value || 'all';
      const yearVal = document.getElementById('con-comp-filter-year')?.value || 'all';
      const listEl = document.getElementById('con-comp-picker-list');
      const countEl = document.getElementById('con-comp-picker-count');

      if (!listEl) return;

      const filtered = _conAvailableCompetences.filter(c => {
        const id = String(c.id || c.code || c.title || '');
        if (_conCompFilterSelectedOnly && !_conCompSelectedIds.has(id)) return false;
        if (subjectVal !== 'all') {
          const cSubj = (c.subjectId || c.category || '').toLowerCase();
          if (!cSubj.includes(subjectVal.toLowerCase())) return false;
        }
        if (domainVal !== 'all' && c.category !== domainVal) return false;
        if (levelVal !== 'all' && c.level !== levelVal) return false;
        if (yearVal !== 'all' && c.yearLevel !== yearVal) return false;
        if (searchVal) {
          const matchCode = (c.code || '').toLowerCase().includes(searchVal);
          const matchTitle = (c.title || '').toLowerCase().includes(searchVal);
          const matchCat = (c.category || '').toLowerCase().includes(searchVal);
          const matchDesc = (c.description || '').toLowerCase().includes(searchVal);
          if (!matchCode && !matchTitle && !matchCat && !matchDesc) return false;
        }
        return true;
      });

      if (!filtered.length) {
        listEl.innerHTML = '<div style="text-align:center;color:#888;padding:24px;font-size:0.85rem;">No competences found matching filters.</div>';
      } else {
        const createConCompRow = (c) => {
          const id = String(c.id || c.code || c.title || '');
          const row = document.createElement('div');
          row.className = 'con-comp-picker-item';
          row.dataset.compId = id;

          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.style.cursor = 'pointer';
          chk.style.marginTop = '3px';
          chk.onclick = (e) => {
            e.stopPropagation();
            conToggleCompSelection(c, chk.checked);
          };

          const body = document.createElement('div');
          body.style.display = 'flex';
          body.style.flexDirection = 'column';
          body.style.gap = '3px';
          body.style.flex = '1';
          body.style.minWidth = '0';

          const topRow = document.createElement('div');
          topRow.style.display = 'flex';
          topRow.style.alignItems = 'center';
          topRow.style.gap = '6px';
          topRow.style.flexWrap = 'wrap';

          const codeBadge = document.createElement('span');
          codeBadge.className = 'con-comp-badge-code';
          codeBadge.textContent = c.code || c.title;
          topRow.appendChild(codeBadge);

          const titleSpan = document.createElement('span');
          titleSpan.style.fontWeight = '700';
          titleSpan.style.fontSize = '0.85rem';
          titleSpan.style.color = '#111';
          titleSpan.textContent = c.title;
          topRow.appendChild(titleSpan);

          if (c.category) {
            const catChip = document.createElement('span');
            catChip.className = 'con-comp-tag-chip';
            catChip.textContent = c.category;
            topRow.appendChild(catChip);
          }
          if (c.level) {
            const lvlChip = document.createElement('span');
            lvlChip.className = 'con-comp-tag-chip';
            lvlChip.style.background = '#fef3c7';
            lvlChip.style.color = '#92400e';
            lvlChip.style.borderColor = '#fde68a';
            lvlChip.textContent = c.level;
            topRow.appendChild(lvlChip);
          }
          if (c.yearLevel) {
            const yrChip = document.createElement('span');
            yrChip.className = 'con-comp-tag-chip';
            yrChip.textContent = 'Yr ' + c.yearLevel;
            topRow.appendChild(yrChip);
          }

          body.appendChild(topRow);

          if (c.description) {
            const desc = document.createElement('div');
            desc.style.fontSize = '0.75rem';
            desc.style.color = '#64748b';
            desc.style.lineHeight = '1.3';
            desc.textContent = c.description;
            body.appendChild(desc);
          }

          row.appendChild(chk);
          row.appendChild(body);

          row.onclick = () => {
            const nextState = !_conCompSelectedIds.has(id);
            chk.checked = nextState;
            conToggleCompSelection(c, nextState);
          };
          return row;
        };

        const updateConCompRow = (row, c) => {
          const id = String(c.id || c.code || c.title || '');
          const isSelected = _conCompSelectedIds.has(id);
          row.classList.toggle('selected', isSelected);
          const chk = row.querySelector('input[type="checkbox"]');
          if (chk && chk.checked !== isSelected) chk.checked = isSelected;
        };

        if (window.DomSync && typeof window.DomSync.patchListByKey === 'function') {
          window.DomSync.patchListByKey(listEl, filtered, c => String(c.id || c.code || c.title || ''), createConCompRow, updateConCompRow);
        } else {
          listEl.innerHTML = '';
          filtered.forEach(c => {
            const row = createConCompRow(c);
            updateConCompRow(row, c);
            listEl.appendChild(row);
          });
        }
      }

      if (countEl) {
        const count = _conCompSelectedIds.size;
        countEl.textContent = typeof tFmt === 'function' ? tFmt('compCountSelected', { count }) : `${count} selected`;
      }
    }

    function conToggleCompSelection(comp, forceState, skipPrompt = false) {
      if (!comp) return;
      const id = String(comp.id || comp.code || comp.title || '').trim();
      if (!id) return;
      const shouldSelect = typeof forceState === 'boolean' ? forceState : !_conCompSelectedIds.has(id);
      if (shouldSelect) {
        _conCompSelectedIds.add(id);
        _conCompSelectedObjects.set(id, comp);

        if (!skipPrompt && typeof CompetenceAggregatorService !== 'undefined' && typeof CompetenceAggregatorService.promptAddLinkedCompetences === 'function') {
          CompetenceAggregatorService.promptAddLinkedCompetences(comp, _conCompSelectedIds, {
            onAdd: (linkedToAdd) => {
              linkedToAdd.forEach(lc => {
                conToggleCompSelection(lc, true, true);
              });
            }
          });
        }
      } else {
        _conCompSelectedIds.delete(id);
        _conCompSelectedObjects.delete(id);
      }

  
      const row = document.querySelector(`.con-comp-picker-item[data-comp-id="${id}"]`);
      if (row) {
        row.classList.toggle('selected', shouldSelect);
        const chk = row.querySelector('input[type="checkbox"]');
        if (chk) chk.checked = shouldSelect;
      }

      const countEl = document.getElementById('con-comp-picker-count');
      if (countEl) {
        const count = _conCompSelectedIds.size;
        countEl.textContent = typeof tFmt === 'function' ? tFmt('compCountSelected', { count }) : `${count} selected`;
      }
    }

    function conSelectAllVisibleCompetences(select) {
      const rows = document.querySelectorAll('.con-comp-picker-item');
      rows.forEach(r => {
        const id = r.dataset.compId;
        const comp = _conAvailableCompetences.find(c => String(c.id || c.code || c.title || '') === id);
        if (comp) conToggleCompSelection(comp, select);
      });
    }

    function conApplyPlannerSuggestedCompetences() {
      if (!_conPlannerSuggestedCompetences || !_conPlannerSuggestedCompetences.length) return;
      _conPlannerSuggestedCompetences.forEach(sug => {
        const sugCode = typeof sug === 'string' ? sug : (sug.code || sug.title || sug.id);
        const hit = _conAvailableCompetences.find(c =>
          String(c.id || '').toLowerCase() === String(sugCode).toLowerCase() ||
          String(c.code || '').toLowerCase() === String(sugCode).toLowerCase() ||
          String(c.title || '').toLowerCase() === String(sugCode).toLowerCase()
        );
        if (hit) {
          conToggleCompSelection(hit, true);
        } else if (typeof sug === 'object' && sug) {
          const id = String(sug.id || sug.code || sug.title || '');
          if (id) {
            _conCompSelectedIds.add(id);
            _conCompSelectedObjects.set(id, sug);
          }
        }
      });
      conFilterCompetencePicker();
    }

    function conApplySelectedCompetences() {
      const selectedList = Array.from(_conCompSelectedObjects.values());
      const targetType = _conCompModalTarget.type;
      const targetId = _conCompModalTarget.id;

      if (targetType === 'node') {
        const nodes = (typeof conGetNodes === 'function' ? conGetNodes() : window.conNodes) || [];
        const node = nodes.find(n => n.id === targetId);
        if (node) {
          node.competences = selectedList;
          conUpdateNodeCompetenceBadge(node);
          if (typeof window.boardSetDirty === 'function') boardSetDirty(true);
          else if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
          mdbToast(typeof tFmt === 'function' ? tFmt('compNodeBadgeTitle', { codes: selectedList.map(c => c.code || c.title).join(', ') }) : 'Competence tags applied to node.');
        }
      } else {
        global._conCurrentCompetences = selectedList;
        conRenderHeaderCompetenceBar();
        if (typeof window.boardSetDirty === 'function') boardSetDirty(true);
        else if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        mdbToast(typeof tFmt === 'function' ? tFmt('compAttachedToBoard', { codes: selectedList.map(c => c.code || c.title).join(', ') }) : 'Competence tags attached to board file.');
      }

      conCloseCompetenceModal();
    }

    function conCtxOpenCompetenceModal() {
      const nodeId = (typeof conGetCtxNodeId === 'function' ? conGetCtxNodeId() : null) || (window.conSelected ? window.conSelected : null);
      if (typeof conCtxClose === 'function') conCtxClose();
      if (nodeId) {
        conOpenCompetenceModal('node', nodeId);
      } else {
        conOpenCompetenceModal('board');
      }
    }

    function _conRestoreSession(data) {
      _conIsRestoringSession = true;
      if (data && Array.isArray(data.links) && !Array.isArray(data.edges)) {
        data.edges = data.links.map(l => ({
          id: l.id,
          a: l.a || l.from,
          b: l.b || l.to,
          type: l.type || 'none',
          label: l.label || '',
          thickness: l.thickness || 2,
          strokeType: l.strokeType || 'solid'
        }));
      }
      try {
        const isPageRestore = !!data._isPageRestore;
        const isMirrorSync = !!data._isMirrorSync;
        const isUndoRedo = !!data._isUndoRedo;
        if (!isPageRestore) {
          if (typeof window.conExitNumberingMode === 'function') window.conExitNumberingMode();
          if (typeof _conClearPageDomCache === 'function') _conClearPageDomCache();
          _conUndoStack = []; _conRedoStack = [];
          if (window._conPdfDocCache) {
            window._conPdfDocCache.forEach(doc => {
              if (doc && typeof doc.destroy === 'function') {
                try { doc.destroy(); } catch (_) { }
              }
            });
            window._conPdfDocCache.clear();
          }
          if (window._conAttachmentBufferCache) window._conAttachmentBufferCache.clear();
          if (typeof _mirrorSentAttachmentKeys !== 'undefined' && _mirrorSentAttachmentKeys.clear) {
            _mirrorSentAttachmentKeys.clear();
          }
          if (typeof _attachmentDataUrlCache !== 'undefined' && _attachmentDataUrlCache.clear) {
            _attachmentDataUrlCache.clear();
          }
        }
        if (!isPageRestore) {
          global._conCurrentCompetences = Array.isArray(data.competences)
            ? data.competences.slice()
            : (Array.isArray(data.competenceTags) ? data.competenceTags.slice() : []);
          if (typeof conRenderHeaderCompetenceBar === 'function') conRenderHeaderCompetenceBar();

          const mediaMap = (data && (data._mediaMap || data.mediaMap || data.media)) || null;
          conSetAttachmentsFromSession((data && data.attachments) || [], mediaMap);
          _conPageSnapshotPngs = [];
          const thumbMap = (data && (data._thumbnails || data.thumbnails)) || null;
          const totalP = (Array.isArray(data.pages) && data.pages.length > 0) ? data.pages.length : 1;
          for (let i = 0; i < totalP; i++) {
            const padded = String(i + 1).padStart(3, '0');
            let val = null;
            if (thumbMap && typeof thumbMap === 'object') {
              val = thumbMap['page-snapshots/page-' + padded + '.webp']
                || thumbMap['page-snapshots/page-' + padded + '.png']
                || thumbMap['page-' + padded + '.webp']
                || thumbMap['page-' + padded + '.png']
                || (i === 0 ? (thumbMap['thumbnail.webp'] || thumbMap['thumbnail.png'] || thumbMap['thumbnails/page-001.webp'] || thumbMap['thumbnails/page-001.png']) : null);
            }
            if (!val && typeof conBuildPageThumbnailDataUrl === 'function') {
              const pData = (Array.isArray(data.pages) && data.pages[i]) || (i === 0 ? data : null);
              if (pData) {
                try {
                  val = conBuildPageThumbnailDataUrl(pData, 480, 320);
                } catch (_) {}
              }
            }
            _conPageSnapshotPngs[i] = val || null;
          }
        }

        // ---- Multi-page format detection ----
        if (!isPageRestore) {
          if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
            const restoreIdx = Math.max(0, Math.min(Number(data.currentPage) || 0, data.pages.length - 1));
            conPageSnapshots = data.pages.map(p => p ? {
              nodes: p.nodes || [],
              edges: p.edges || [],
              groups: p.groups || [],
              masks: p.masks || [],
              notes: p.notes || [],
              drawings: p.drawings || [],
              shapes: p.shapes || [],
              tables: p.tables || [],
              media: p.media || [],
              backgroundPdf: p.backgroundPdf || null,
              boardBg: p.boardBg || null,
              boardBgColor: p.boardBgColor || p.boardBackgroundColor || p.backgroundColor || null,
              boardBackgroundColor: p.boardBgColor || p.boardBackgroundColor || p.backgroundColor || null,
              boardStickers: p.boardStickers || [],
              boardHeight: (p && p.boardHeight) || null
            } : {});
            conCurrentPageIndex = restoreIdx;
            const pageData = conPageSnapshots[restoreIdx];
            // Flatten the current page into a single-page data object for the restore below
            data = {
              _type: data._type || 'constellation',
              dateCreated: data.dateCreated,
              title: data.title || '',
              boardHeight: pageData.boardHeight || null,
              nodes: pageData.nodes,
              edges: pageData.edges,
              groups: pageData.groups,
              masks: pageData.masks,
              notes: pageData.notes,
              drawings: pageData.drawings,
              shapes: pageData.shapes,
              tables: pageData.tables || [],
              media: pageData.media || [],
              backgroundPdf: pageData.backgroundPdf || null,
              boardBg: pageData.boardBg || null,
              boardBgColor: pageData.boardBgColor || pageData.boardBackgroundColor || pageData.backgroundColor || null,
              boardBackgroundColor: pageData.boardBgColor || pageData.boardBackgroundColor || pageData.backgroundColor || null,
              boardStickers: pageData.boardStickers || []
            };
          } else {
            // Single-page format — reset to one page
            const singleSnap = conBuildEmptyPageSnapshot();
            if (data && data.boardHeight) singleSnap.boardHeight = data.boardHeight;
            conPageSnapshots = [singleSnap];
            conCurrentPageIndex = 0;
          }

          // Build PNG previews on startup/restore for all pages that don't have one
          if (!Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs = [];
          for (let i = 0; i < conPageSnapshots.length; i++) {
            if (!_conPageSnapshotPngs[i] && conPageSnapshots[i]) {
              if (typeof conBuildPageThumbnailDataUrl === 'function') {
                const url = conBuildPageThumbnailDataUrl(conPageSnapshots[i]);
                if (url) _conPageSnapshotPngs[i] = url;
              }
            }
          }
        }

        const resolvedCreatedAt = Number(data._createdAt || data.createdAt)
          || (data.dateCreated ? Date.parse(String(data.dateCreated).replace(/_\d+$/, '')) : 0)
          || 0;
        data.dateCreated = boardNormalizeDateCreated('constellation', data.dateCreated || (resolvedCreatedAt ? resolvedCreatedAt : ''));
        if (resolvedCreatedAt) {
          data._createdAt = resolvedCreatedAt;
          boardSetSessionFileMeta('constellation', resolvedCreatedAt, Number(data._savedAt || data.savedAt) || 0);
        }

        if (isMirrorSync || isUndoRedo) {
          window._conSuppressMirrorObserver = true;
          // ── Non-destructive in-place reconciliation for Mirror Presentation Mode & Undo/Redo ──
          const brd = conGetBoard();
          if (brd) {
            if (data && data.boardHeight && Number(data.boardHeight) > 0) {
              brd.style.height = data.boardHeight + 'px';
            } else if (window._bcBoardLayoutConfig && window._bcBoardLayoutConfig.dims && window._bcBoardLayoutConfig.dims.h) {
              brd.style.height = window._bcBoardLayoutConfig.dims.h + 'px';
            } else {
              brd.style.height = '';
            }
          }
          if (!isMirrorSync) {
            const curPIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
            if (typeof conPageSnapshots !== 'undefined' && conPageSnapshots[curPIdx]) {
              conPageSnapshots[curPIdx].boardHeight = (data && data.boardHeight && Number(data.boardHeight) > 0) ? Number(data.boardHeight) : null;
            }
          }

          // Advance numeric IDs past snapshot and all pages so subsequent additions don't collide
          const pagesToScan = [data];
          if (Array.isArray(data.pages)) pagesToScan.push(...data.pages);
          if (typeof conPageSnapshots !== 'undefined' && Array.isArray(conPageSnapshots)) pagesToScan.push(...conPageSnapshots);
          let allNumericIds = [];
          pagesToScan.forEach(p => {
            if (!p) return;
            const masks = Array.isArray(p.masks) ? p.masks : (Array.isArray(p.conMasks) ? p.conMasks : []);
            allNumericIds = allNumericIds
              .concat((p.nodes || []).map(n => n && n.id))
              .concat((p.edges || []).map(e => e && [e.id, e.a, e.b]).flat())
              .concat((p.groups || []).map(g => g && g.id))
              .concat(masks.map(m => m && m.id))
              .concat((p.drawings || []).map(d => d && d.id))
              .concat((p.shapes || []).map(s => s && s.id))
              .concat((p.tables || []).map(t => t && t.id));
          });
          let maxNum = 0;
          allNumericIds.forEach(id => {
            if (!id) return;
            const m = String(id).match(/\d+$/);
            if (m) maxNum = Math.max(maxNum, parseInt(m[0], 10));
          });
          if (window.conSetNextId) window.conSetNextId(maxNum + 2);
          if (typeof window.conSyncGroupNextId === 'function') window.conSyncGroupNextId(maxNum + 2);

          let maxNoteNum = -1;
          pagesToScan.forEach(p => {
            if (!p) return;
            (p.notes || []).forEach(n => {
              if (n && n.id) {
                const m = String(n.id).match(/^cnn(\d+)$/);
                if (m) {
                  const val = parseInt(m[1], 10);
                  if (!isNaN(val) && val > maxNoteNum) maxNoteNum = val;
                }
              }
            });
          });
          if (maxNoteNum >= 0) {
            if (typeof window.conSyncNoteNextId === 'function') window.conSyncNoteNextId(maxNoteNum + 1);
            else if (typeof conNoteNextId !== 'undefined') conNoteNextId = Math.max(conNoteNextId, maxNoteNum + 1);
          }

          const existingNodes = conGetNodes();
          const existingNodeMap = new Map(existingNodes.map(n => [n.id, n]));
          const keepNodeIds = new Set();
          const nextNodes = [];

          (data.nodes || []).forEach(n => {
            keepNodeIds.add(n.id);
            const existing = existingNodeMap.get(n.id);
            if (existing && existing.el) {
              existing.x = n.x;
              existing.y = n.y;
              existing.baseX = n.x;
              existing.baseY = n.y;
              if (typeof n.w === 'number' && n.w > 0) existing.w = n.w;
              if (typeof n.h === 'number' && n.h > 0) existing.h = n.h;
              if (typeof n._cachedW === 'number' && n._cachedW > 0) existing._cachedW = n._cachedW;
              if (typeof n._cachedH === 'number' && n._cachedH > 0) existing._cachedH = n._cachedH;
              existing.el.style.left = n.x + 'px';
              existing.el.style.top = n.y + 'px';
              if (n.bg) existing.el.style.background = n.bg;
              if (n.color) existing.el.style.color = n.color;
              if (n.border) existing.el.style.borderColor = n.border;
              if (n.fontFamily) existing.el.style.fontFamily = n.fontFamily;
              conApplyTextStrokeStyle(existing.el, n.textStrokeWidth, n.textStrokeColor);

              existing.dbWord = n.dbWord || null;
              existing.baseWord = n.baseWord || '';
            existing.sourceWord = n.sourceWord || null;
            existing.relation = n.relation || null;
            existing.aiDef = n.aiDef || null;
            existing.aiPos = n.aiPos || null;
            existing.fmt = n.fmt || {};
            existing.locked = !!n.locked;
            existing.pageNum = n.pageNum != null ? n.pageNum : null;
            existing.isNodeAct = !!n.isNodeAct;
            existing.actNodeId = n.actNodeId || null;
            existing.actParentId = n.actParentId || null;
            existing.phraseOrder = n.phraseOrder != null ? n.phraseOrder : null;
            if (existing.phraseOrder == null && existing.el) {
              if (typeof window.conClearNodePhraseClasses === 'function') {
                window.conClearNodePhraseClasses(existing);
              } else {
                existing.el.classList.remove('con-phrase-node', 'con-phrase-first', 'con-phrase-middle', 'con-phrase-last', 'con-phrase-only');
              }
            }
            existing.emoji = n.emoji || null;
            existing.isTimer = !!n.isTimer;
            existing.durationSec = n.durationSec || null;
            existing.remainingSec = n.remainingSec != null ? n.remainingSec : null;
            existing.timerState = n.timerState || 'idle';
            existing.timerTarget = (n.timerTarget === 'cms' || n.timerTarget === 'board') ? n.timerTarget : null;
            if (existing.isTimer && existing.timerState === 'running') {
              existing.timerEndTime = Date.now() + (existing.remainingSec || existing.durationSec || 60) * 1000;
            }
            existing.isRandom = !!n.isRandom;
            if (existing.isRandom) {
              existing.randomMin = (n.randomMin != null) ? n.randomMin : 1;
              existing.randomMax = (n.randomMax != null) ? n.randomMax : 100;
              existing.randomValue = (n.randomValue != null) ? n.randomValue : existing.randomMin;
            }
            existing.isSound = !!n.isSound;
            existing.soundAttachmentId = n.soundAttachmentId || null;
            existing.soundName = n.soundName || null;
            existing.soundDuration = (typeof n.soundDuration === 'number') ? n.soundDuration : null;
            existing.isVideo = !!n.isVideo;
            existing.videoAttachmentId = n.videoAttachmentId || null;
            existing.videoName = n.videoName || null;
            existing.videoDuration = (typeof n.videoDuration === 'number') ? n.videoDuration : null;
            existing.isLink = !!(n.isLink || n.isBookmark);
            existing.linkType = n.linkType || null;
            existing.linkTarget = n.linkTarget || null;
            existing.linkTitle = n.linkTitle || null;
            existing.linkSubTitle = n.linkSubTitle || null;
            existing.linkUrn = n.linkUrn || null;
            existing.bookmarkId = n.bookmarkId || null;
            existing.tags = Array.isArray(n.tags) ? n.tags.slice() : [];
            existing.shape = (window.conNormalizeNodeShape ? window.conNormalizeNodeShape(n.shape || 'rectangle') : conNormalizeNodeShapeSafe(n.shape || 'rectangle'));
            existing.borderWidth = n.borderWidth || null;
            existing.borderStyle = n.borderStyle || null;
            existing.highlight = n.highlight || null;
            existing.preset = n.preset || null;
            existing.fontFamily = n.fontFamily || null;
            existing.fontSize = n.fontSize || '16px';
            existing.textStrokeColor = n.textStrokeColor || null;
            existing.textStrokeWidth = n.textStrokeWidth || null;
            existing.anim = n.anim || '';
            existing.revealAnim = n.revealAnim || '';
            if (typeof window.conApplyEntityAnimClass === 'function') window.conApplyEntityAnimClass(existing.el, existing.anim, false);
            existing.competences = Array.isArray(n.competences) ? n.competences.slice() : (Array.isArray(n.competenceTags) ? n.competenceTags.slice() : []);
            if (typeof conUpdateNodeCompetenceBadge === 'function') conUpdateNodeCompetenceBadge(existing);
            existing.nodeNumber = n.nodeNumber != null ? n.nodeNumber : null;
            existing.nodeNumberFormat = n.nodeNumberFormat || null;
            if (existing.nodeNumber != null && typeof window.conApplyEntityBadge === 'function') {
              window.conApplyEntityBadge(existing.el, existing.nodeNumber, existing.nodeNumberFormat, 'node');
            } else if (typeof window.conRemoveEntityBadge === 'function') {
              window.conRemoveEntityBadge(existing.el);
            }

            window.conRenderNodeLabel(existing);
            if (window.conSetNodeBaseFontSize) window.conSetNodeBaseFontSize(existing, n.fontSize || '16px');
            conApplyNodeShape(existing, existing.shape);
            if (existing.el && existing.el.offsetWidth > 0) {
              existing._cachedW = existing.el.offsetWidth;
              existing._cachedH = existing.el.offsetHeight;
            }
            existing.rotation = (typeof n.rotation === 'number') ? ((typeof window.conNormalizeNodeRotation === 'function') ? window.conNormalizeNodeRotation(n.rotation) : n.rotation) : 0;
            if (typeof conApplyNodeRotation === 'function') conApplyNodeRotation(existing, existing.rotation);
            existing.el.dataset.baseWord = n.baseWord || '';
            if (existing.emoji && window.conEmojiRestoreNodeDotAndBadge) window.conEmojiRestoreNodeDotAndBadge(existing);
            if (n.masked) {
              existing.masked = true;
              existing.el.classList.add('con-masked');
            } else {
              existing.masked = false;
              existing.el.classList.remove('con-masked');
            }
            if (window.conSyncNodeLockState) window.conSyncNodeLockState(existing);
            nextNodes.push(existing);
          } else {
            conAppendNodeFromData(n, brd, nextNodes);
          }
        });

        // Remove only deleted nodes
        existingNodeMap.forEach((node, id) => {
          if (!keepNodeIds.has(id)) {
            if (node && node.el) node.el.remove();
          }
        });
        existingNodes.length = 0;
        existingNodes.push(...nextNodes);

        // Word notes reconciliation
        const _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
        const existingNotesMap = new Map(_liveNotes.map(n => [String(n.id), n]));
        const keepNoteIds = new Set();
        const nextNotes = [];

        (data.notes || []).forEach(n => {
          const nid = String(n.id);
          keepNoteIds.add(nid);
          const numMatch = nid.match(/^cnn(\d+)$/);
          if (numMatch) {
            const num = parseInt(numMatch[1], 10);
            if (!isNaN(num)) {
              if (typeof window.conSyncNoteNextId === 'function') window.conSyncNoteNextId(num + 1);
              else if (typeof conNoteNextId !== 'undefined') conNoteNextId = Math.max(conNoteNextId, num + 1);
            }
          }
          const existing = existingNotesMap.get(nid);
          const noteEl = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nid) : document.querySelector('.con-word-note[data-id="' + nid + '"]');

          if (existing && noteEl) {
            Object.assign(existing, {
              x: n.x, y: n.y,
              text: n.text, html: n.html || '',
              color: n.color, bg: n.bg,
              fontSize: n.fontSize,
              fontFamily: n.fontFamily || null,
              bold: !!n.bold, italic: !!n.italic, underline: !!n.underline,
              strike: !!n.strike, hidden: !!n.hidden, locked: !!n.locked, lockRatio: !!n.lockRatio,
              manualSize: !!n.manualSize,
              width: typeof n.width === 'number' ? n.width : (typeof n.liveBaseWidth === 'number' ? n.liveBaseWidth : (typeof n.w === 'number' ? n.w : null)),
              height: typeof n.height === 'number' ? n.height : (typeof n.liveBaseHeight === 'number' ? n.liveBaseHeight : (typeof n.h === 'number' ? n.h : null)),
              liveBaseWidth: n.liveBaseWidth != null ? n.liveBaseWidth : (typeof n.width === 'number' ? n.width : (typeof n.w === 'number' ? n.w : null)),
              liveBaseHeight: n.liveBaseHeight != null ? n.liveBaseHeight : (typeof n.height === 'number' ? n.height : (typeof n.h === 'number' ? n.h : null)),
              w: n.w != null ? n.w : (n.liveBaseWidth != null ? n.liveBaseWidth : n.width),
              h: n.h != null ? n.h : (n.liveBaseHeight != null ? n.liveBaseHeight : n.height),
              _cachedW: n._cachedW != null ? n._cachedW : (n.liveBaseWidth != null ? n.liveBaseWidth : (n.width != null ? n.width : n.w)),
              _cachedH: n._cachedH != null ? n._cachedH : (n.liveBaseHeight != null ? n.liveBaseHeight : (n.height != null ? n.height : n.h)),
              borderWidth: n.borderWidth || null,
              borderStyle: n.borderStyle || null,
              borderColor: n.borderColor || null,
              preset: n.preset || null,
              blink: !!n.blink,
              studentInput: !!n.studentInput,
              textAlign: n.textAlign || null
            });
            noteEl.style.left = n.x + 'px';
            noteEl.style.top = n.y + 'px';
            const editorEl = noteEl.querySelector('.wn-note-editor');
            if (editorEl) {
              const content = n.html ? String(n.html) : boardEscapeHtml(n.text || '').replace(/\n/g, '<br>');
              const rendered = (typeof wnRenderMathHtml === 'function') ? wnRenderMathHtml(content) : content;
              if (editorEl.innerHTML !== rendered) editorEl.innerHTML = rendered;
            }
            if (existing._applyStyle) existing._applyStyle();
            if (existing._updateContent) existing._updateContent();
            if (editorEl) {
              const _scale = (typeof conGetZoom === 'function' ? conGetZoom() : (window.conGetZoom ? window.conGetZoom() : 1)) || 1;
              if (existing.manualSize && typeof wnApplyStoredSize === 'function') {
                wnApplyStoredSize(noteEl, editorEl, existing, _scale);
              } else if (typeof conNoteAutosize === 'function') {
                conNoteAutosize(editorEl, existing);
              }
            }
            if (typeof conNoteRebuildAllStickers === 'function') conNoteRebuildAllStickers(existing, noteEl);
            nextNotes.push(existing);
          } else {
            conAppendNoteFromData(n, nextNotes);
          }
        });

        // Remove deleted notes and any orphan DOM note elements
        const seenNoteIds = new Set();
        const allDomNotes = document.querySelectorAll('#constellation-board .con-word-note');
        allDomNotes.forEach(el => {
          const did = el.dataset ? el.dataset.id : null;
          if (!did || !keepNoteIds.has(did) || seenNoteIds.has(did)) {
            el.remove();
          } else {
            seenNoteIds.add(did);
          }
        });
        _liveNotes.length = 0;
        _liveNotes.push(...nextNotes);

        // ── Reconcile Edges In-Place (Zero SVG Teardown) ──
        const existingEdges = window.conGetEdges ? window.conGetEdges() : [];
        const existingEdgesById = new Map();
        const existingEdgesByEndpoints = new Map();
        existingEdges.forEach(e => {
          if (e && e.id) existingEdgesById.set(String(e.id), e);
          if (e && e.a && e.b) existingEdgesByEndpoints.set(String(e.a) + '->' + String(e.b), e);
        });
        const keepEdges = new Set();
        const seenEdgeIdsInIncoming = new Set();

        (data.edges || []).forEach(e => {
          if (!e || !e.a || !e.b) return;
          let edgeId = e.id ? String(e.id) : null;
          // If edgeId is duplicate within incoming data, generate a fresh non-colliding ID
          if (edgeId && seenEdgeIdsInIncoming.has(edgeId)) {
            let nextNum = window.conGetNextId ? window.conGetNextId() : Date.now();
            edgeId = 'ce' + nextNum;
            while (seenEdgeIdsInIncoming.has(edgeId) || existingEdgesById.has(edgeId)) {
              nextNum = window.conGetNextId ? window.conGetNextId() : (++nextNum);
              edgeId = 'ce' + nextNum;
            }
          }
          if (edgeId) seenEdgeIdsInIncoming.add(edgeId);

          // Find candidate existing edge
          let existing = null;
          if (edgeId && existingEdgesById.has(edgeId)) {
            const cand = existingEdgesById.get(edgeId);
            if (cand && !keepEdges.has(cand) && cand.a === e.a && cand.b === e.b) {
              existing = cand;
            }
          }
          if (!existing) {
            const epKey = String(e.a) + '->' + String(e.b);
            const cand = existingEdgesByEndpoints.get(epKey);
            if (cand && !keepEdges.has(cand)) {
              existing = cand;
            }
          }

          if (existing && existing.g) {
            if (edgeId) existing.id = edgeId;
            existing.type = e.type || 'none';
            existing.label = e.label || '';
            existing.labelSize = Number(e.labelSize) || 16;
            existing.labelColor = e.labelColor || '#333333';
            existing.labelWeight = Number(e.labelWeight) || 600;
            existing.thickness = Number(e.thickness) > 0 ? Number(e.thickness) : null;
            existing.dashStyle = e.dashStyle || null;
            existing.strokeType = e.strokeType || (e.dashStyle === 'dashed' ? 'dashed' : (e.dashStyle === 'dotted' ? 'dotted' : 'solid'));
            existing.routing = e.routing || 'straight';
            existing.curvature = (typeof e.curvature === 'number') ? e.curvature : 0;
            existing.opacity = (typeof e.opacity === 'number') ? e.opacity : 1;
            existing.terminator = e.terminator || 'arrow';
            existing.animated = !!e.animated;
            existing.labelBgActive = !!e.labelBg;
            existing.anchorA = e.anchorA || null;
            existing.anchorB = e.anchorB || null;
            existing.colorMode = (e.colorMode === 'auto' || e.colorMode === 'manual') ? e.colorMode : undefined;
            existing.strokeColor = e.strokeColor || null;
            existing.points = Array.isArray(e.points) ? e.points.map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })) : [];
            existing.avoidObstacles = !!e.avoidObstacles;
            if (existing.labelEl) {
              existing.labelEl.textContent = existing.label;
            }
            if (existing.g) {
              existing.g.dataset.eid = existing.id;
              existing.g.style.display = '';
            }
            keepEdges.add(existing);
          } else {
            const restored = _conRestoreEdge(e.a, e.b, e.type, e.label || '', e.labelSize, e.labelColor, e.labelWeight, e.thickness, e.dashStyle || null, edgeId, e.strokeType, e.routing, e.curvature, e.opacity, e.terminator, e.animated, e.labelBg, e.anchorA, e.anchorB, e.colorMode, e.strokeColor, e.points, e.avoidObstacles);
            const targetEdge = restored || existingEdges[existingEdges.length - 1];
            if (targetEdge) keepEdges.add(targetEdge);
          }
        });

        for (let i = existingEdges.length - 1; i >= 0; i--) {
          const e = existingEdges[i];
          if (!keepEdges.has(e)) {
            if (e.g && e.g.remove) e.g.remove();
            existingEdges.splice(i, 1);
          }
        }

        // ── Reconcile Groups In-Place (Zero Group Teardown) ──
        const existingGroups = window.conGetGroups ? window.conGetGroups() : [];
        const existingGroupsMap = new Map(existingGroups.map(g => [String(g.id), g]));
        const keepGroupIds = new Set();
        (data.groups || []).forEach(g => {
          const gid = String(g.id);
          keepGroupIds.add(gid);
          const validIds = (g.nodeIds || []).filter(id => conGetNodes().find(n => n.id === id));
          const noteIds = g.noteIds || [];
          const drawingIds = g.drawingIds || [];
          const shapeIds = g.shapeIds || [];
          const mediaIds = g.mediaIds || [];
          const existing = existingGroupsMap.get(gid);
          if (existing && existing.el) {
            const wasPhraseGroup = !!existing.phraseGroup;
            const prevNodeIds = Array.isArray(existing.nodeIds) ? existing.nodeIds.slice() : [];
            existing.nodeIds = [...validIds];
            existing.noteIds = [...noteIds];
            existing.drawingIds = [...drawingIds];
            existing.shapeIds = [...shapeIds];
            existing.mediaIds = [...mediaIds];
            existing.title = g.title || '';
            existing.paletteIdx = g.paletteIdx || 0;
            existing.invisible = !!g.invisible;
            existing.blink = !!g.blink;
            existing.drawingGroup = !!g.drawingGroup;
            existing.phraseGroup = !!g.phraseGroup;
            existing.el.classList.toggle('con-group-drawing', existing.drawingGroup);
            existing.el.classList.toggle('con-phrase-group', existing.phraseGroup);
            if (wasPhraseGroup) {
              const validSet = new Set(validIds.map(String));
              const liveNodes = window.conGetNodes ? window.conGetNodes() : [];
              prevNodeIds.forEach(nid => {
                if (!existing.phraseGroup || !validSet.has(String(nid))) {
                  const node = liveNodes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
                  if (node) {
                    if (typeof window.conClearNodePhraseClasses === 'function') {
                      window.conClearNodePhraseClasses(node);
                    } else {
                      if (node.el) node.el.classList.remove('con-phrase-node', 'con-phrase-first', 'con-phrase-middle', 'con-phrase-last', 'con-phrase-only');
                      node.phraseOrder = null;
                    }
                  }
                }
              });
            }
            existing._manualW = (g.manualW != null ? g.manualW : null);
            existing._manualH = (g.manualH != null ? g.manualH : null);
            existing._px = (g.x != null ? g.x : null);
            existing._py = (g.y != null ? g.y : null);
            existing.groupNumber = g.groupNumber != null ? g.groupNumber : null;
            existing.groupNumberFormat = g.groupNumberFormat || null;
            if (existing.groupNumber != null && typeof window.conApplyEntityBadge === 'function') {
              window.conApplyEntityBadge(existing.el, existing.groupNumber, existing.groupNumberFormat, 'group');
            } else if (typeof window.conRemoveEntityBadge === 'function') {
              window.conRemoveEntityBadge(existing.el);
            }
            if (!existing.drawingGroup && !existing.phraseGroup) {
              if (existing.invisible) {
                existing.el.classList.add('con-group-invisible');
                existing.el.style.borderColor = 'transparent';
                existing.el.style.background = 'transparent';
              } else {
                existing.el.classList.remove('con-group-invisible');
                const CON_PALETTES_REF = window.CON_PALETTES || [];
                const pal = CON_PALETTES_REF[existing.paletteIdx] || ['rgba(240,240,240,0.5)', '#111', '#111'];
                existing.el.style.borderColor = pal[2] || '#111';
                existing.el.style.color = pal[1] || '#111';
                const bgRaw = pal[0] || '#ffffff';
                if (bgRaw === '#ffffff') {
                  existing.el.style.background = 'rgba(240,240,240,0.5)';
                } else {
                  const r = parseInt(bgRaw.slice(1, 3), 16);
                  const gv = parseInt(bgRaw.slice(3, 5), 16);
                  const b = parseInt(bgRaw.slice(5, 7), 16);
                  existing.el.style.background = `rgba(${r},${gv},${b},0.28)`;
                }
              }
            }
            if (existing.phraseGroup && typeof window.conPhraseGroupLayout === 'function') {
              window.conPhraseGroupLayout(existing);
            }
          } else {
            if (validIds.length >= 1 || noteIds.length >= 1 || drawingIds.length >= 1 || shapeIds.length >= 1 || mediaIds.length >= 1 || (g.manualW != null && g.manualH != null)) {
              _conRestoreGroup({ ...g, noteIds, drawingIds, shapeIds, mediaIds }, validIds);
            }
          }
        });
        for (let i = existingGroups.length - 1; i >= 0; i--) {
          const g = existingGroups[i];
          if (!keepGroupIds.has(String(g.id))) {
            if (g.phraseGroup && Array.isArray(g.nodeIds)) {
              const liveNodes = window.conGetNodes ? window.conGetNodes() : [];
              g.nodeIds.forEach(nid => {
                const node = liveNodes.find(n => n && (n.id === nid || String(n.id) === String(nid)));
                if (node) {
                  if (typeof window.conClearNodePhraseClasses === 'function') {
                    window.conClearNodePhraseClasses(node);
                  } else {
                    if (node.el) node.el.classList.remove('con-phrase-node', 'con-phrase-first', 'con-phrase-middle', 'con-phrase-last', 'con-phrase-only');
                    node.phraseOrder = null;
                  }
                }
              });
            }
            if (g.el && g.el.remove) g.el.remove();
            existingGroups.splice(i, 1);
          }
        }

        // ── Reconcile Masks In-Place ──
        const savedMasksList = Array.isArray(data.masks) ? data.masks : (Array.isArray(data.conMasks) ? data.conMasks : []);
        const existingMasks = window.conGetMasks ? window.conGetMasks() : [];
        const existingMasksMap = new Map(existingMasks.map(m => [String(m.id), m]));
        const keepMaskIds = new Set();
        const activeBoardEl = document.getElementById('constellation-board');
        savedMasksList.forEach(src => {
          const mid = String(src.id);
          keepMaskIds.add(mid);
          const existing = existingMasksMap.get(mid);
          if (existing && existing.el && activeBoardEl && activeBoardEl.contains(existing.el)) {
            existing.x = Number(src.x) || 0;
            existing.y = Number(src.y) || 0;
            existing.width = Number(src.width) || 160;
            existing.height = Number(src.height) || 64;
            existing.color = src.color || '#111111';
            existing.opacity = Number(src.opacity) || 0.95;
            existing.el.style.left = existing.x + 'px';
            existing.el.style.top = existing.y + 'px';
            existing.el.style.width = existing.width + 'px';
            existing.el.style.height = existing.height + 'px';
            existing.el.style.background = existing.color;
            existing.el.style.backgroundColor = existing.color;
            existing.el.style.opacity = String(existing.opacity);
          } else {
            if (existing && existing.el && existing.el.remove) {
              existing.el.remove();
            }
            if (window.conAddMaskFromData) window.conAddMaskFromData(src);
          }
        });
        for (let i = existingMasks.length - 1; i >= 0; i--) {
          const m = existingMasks[i];
          if (!keepMaskIds.has(String(m.id))) {
            if (m.el && m.el.remove) m.el.remove();
            existingMasks.splice(i, 1);
          }
        }

        // ── Reconcile Drawings In-Place (Zero Path Destruction) ──
        const existingDrawings = window.conGetDrawings ? window.conGetDrawings() : [];
        const existingDrawingsMap = new Map(existingDrawings.map(d => [String(d.id), d]));
        const keepDrawingIds = new Set();
        (data.drawings || []).forEach(src => {
          const did = String(src.id);
          keepDrawingIds.add(did);
          const existing = existingDrawingsMap.get(did);
          if (existing && existing.el) {
            existing.x = Number(src.x) || 0;
            existing.y = Number(src.y) || 0;
            existing.w = Number(src.w) || 1;
            existing.h = Number(src.h) || 1;
            existing.color = src.color || '#e53935';
            existing.thickness = Number(src.thickness) || 4;
            existing.opacity = Number.isFinite(Number(src.opacity)) && Number(src.opacity) > 0 ? Number(src.opacity) : 1;
            existing.points = (src.points || []).map(p => (p === null || p === undefined) ? null : ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
            const PAD = Math.max(existing.thickness + 4, 12);
            existing.pad = PAD;
            existing.el.style.left = (existing.x - PAD) + 'px';
            existing.el.style.top = (existing.y - PAD) + 'px';
            existing.el.style.width = (existing.w + 2 * PAD) + 'px';
            existing.el.style.height = (existing.h + 2 * PAD) + 'px';
            if (existing.visPath) {
              existing.visPath.setAttribute('stroke', existing.color);
              existing.visPath.setAttribute('stroke-width', String(existing.thickness));
              existing.visPath.setAttribute('opacity', String(existing.opacity));
            }
            if (existing.hitPath) {
              existing.hitPath.setAttribute('stroke-width', String(Math.max(20, existing.thickness + 10)));
            }
            if (typeof _conBuildPathD === 'function') {
              const pathD = _conBuildPathD(existing.points.map(p => p === null ? null : ({ x: p.x + PAD, y: p.y + PAD })));
              if (existing.hitPath) existing.hitPath.setAttribute('d', pathD);
              if (existing.visPath) existing.visPath.setAttribute('d', pathD);
            }
          } else {
            if (window.conDrawingFromData) window.conDrawingFromData(src);
          }
        });
        for (let i = existingDrawings.length - 1; i >= 0; i--) {
          const d = existingDrawings[i];
          if (!keepDrawingIds.has(String(d.id))) {
            if (d.el && d.el.remove) d.el.remove();
            existingDrawings.splice(i, 1);
          }
        }

        // ── Reconcile Shapes In-Place (Zero Shape Destruction) ──
        const existingShapes = window.conGetShapes ? window.conGetShapes() : [];
        const existingShapesMap = new Map(existingShapes.map(s => [String(s.id), s]));
        const keepShapeIds = new Set();
        (data.shapes || []).forEach(src => {
          const sid = String(src.id);
          keepShapeIds.add(sid);
          const existing = existingShapesMap.get(sid);
          if (existing && existing.el) {
            existing.type = src.type || existing.type || 'rect';
            existing.x = Number(src.x) || 0;
            existing.y = Number(src.y) || 0;
            existing.w = Math.max(2, Number(src.w) || 40);
            existing.h = Math.max(2, Number(src.h) || 40);
            existing.lx1 = (src.lx1 != null && !isNaN(Number(src.lx1))) ? Number(src.lx1) : existing.x;
            existing.ly1 = (src.ly1 != null && !isNaN(Number(src.ly1))) ? Number(src.ly1) : existing.y;
            existing.lx2 = (src.lx2 != null && !isNaN(Number(src.lx2))) ? Number(src.lx2) : existing.x + existing.w;
            existing.ly2 = (src.ly2 != null && !isNaN(Number(src.ly2))) ? Number(src.ly2) : existing.y + existing.h;
            existing.color = src.color || existing.color || '#333333';
            existing.fillColor = src.fillColor || 'none';
            existing.thickness = Number(src.thickness) || 3;
            existing.opacity = Number.isFinite(Number(src.opacity)) && Number(src.opacity) > 0 ? Number(src.opacity) : 1;
            existing.dashStyle = src.dashStyle || 'solid';
            existing.arrowheadSize = Number(src.arrowheadSize) || null;
            existing.pts = Array.isArray(src.pts) ? src.pts.map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })) : null;
            if (typeof conShapeFullRebuild === 'function') {
              conShapeFullRebuild(existing);
            } else if (existing.el) {
              existing.el.style.left = existing.x + 'px';
              existing.el.style.top = existing.y + 'px';
              existing.el.style.width = existing.w + 'px';
              existing.el.style.height = existing.h + 'px';
            }
          } else {
            if (window.conShapeFromData) window.conShapeFromData(src);
          }
        });
        for (let i = existingShapes.length - 1; i >= 0; i--) {
          const s = existingShapes[i];
          if (!keepShapeIds.has(String(s.id))) {
            if (s.el && s.el.remove) s.el.remove();
            existingShapes.splice(i, 1);
          }
        }

        // ── Reconcile Tables In-Place (Zero Table Destruction for move/edit) ──
        const existingTables = window.conGetTables ? window.conGetTables() : (typeof conTables !== 'undefined' ? conTables : []);
        const existingTablesMap = new Map(existingTables.map(t => [String(t.id), t]));
        const keepTableIds = new Set();
        (data.tables || []).forEach(src => {
          const tid = String(src.id);
          keepTableIds.add(tid);
          const existing = existingTablesMap.get(tid);
          if (existing && existing.el) {
            existing.x = Number(src.x) || 0;
            existing.y = Number(src.y) || 0;
            existing.el.style.left = existing.x + 'px';
            existing.el.style.top = existing.y + 'px';
            existing.locked = !!src.locked;
            existing.hasHeader = !!src.hasHeader;
            if (existing.locked) existing.el.classList.add('tbl-locked');
            else existing.el.classList.remove('tbl-locked');
            if (existing.rows === src.rows && existing.cols === src.cols && Array.isArray(src.cells) && Array.isArray(existing.cells)) {
              if (Array.isArray(src.colWidths)) existing.colWidths = [...src.colWidths];
              if (Array.isArray(src.rowHeights)) existing.rowHeights = [...src.rowHeights];
              const gridWrap = existing.el.querySelector('.con-table-grid-wrap');
              if (gridWrap && typeof _totalW === 'function' && typeof _totalH === 'function') {
                gridWrap.style.width = _totalW(existing) + 'px';
                gridWrap.style.height = _totalH(existing) + 'px';
              }
              src.cells.forEach((sc, idx) => {
                const ec = existing.cells[idx];
                if (ec) {
                  Object.assign(ec, sc);
                  if (typeof _applyCellStyle === 'function') {
                    const r = Math.floor(idx / existing.cols);
                    const c = idx % existing.cols;
                    _applyCellStyle(existing, r, c);
                  }
                }
              });
            } else {
              existing.el.remove();
              Object.assign(existing, src);
              if (typeof _buildDOM === 'function') _buildDOM(existing);
            }
          } else {
            if (window.conAddTableFromData) window.conAddTableFromData(src);
          }
        });
        for (let i = existingTables.length - 1; i >= 0; i--) {
          const t = existingTables[i];
          if (!keepTableIds.has(String(t.id))) {
            if (t.el && t.el.remove) t.el.remove();
            existingTables.splice(i, 1);
          }
        }

        conRestoreMediaItems(data.media || []);
        conPageBackgroundPdf = data.backgroundPdf ? {
          attachmentId: String(data.backgroundPdf.attachmentId || ''),
          name: String(data.backgroundPdf.name || 'background.pdf'),
          mime: String(data.backgroundPdf.mime || 'application/pdf'),
          relativePath: String(data.backgroundPdf.relativePath || ''),
          pageNumber: Math.max(1, Number(data.backgroundPdf.pageNumber) || 1),
          file: null
        } : null;
        conRenderPagePdfBackground({ silent: true });
        _conBoardBg = (data.boardBg && data.boardBg.attachmentId)
          ? { attachmentId: String(data.boardBg.attachmentId), pageNumber: Math.max(1, Number(data.boardBg.pageNumber) || 1) }
          : null;
        conRenderBoardBg({ silent: true });
        _conBoardBgColor = conNormalizeColorHex(data.boardBgColor || data.boardBackgroundColor || data.backgroundColor || '') || window._bcBoardDefaultBgColor || '';
        conApplyBoardBgColor();

        // Restore board-level emoji stickers (placed near nodes)
        const _brdHost = document.getElementById('constellation-board');
        if (_brdHost) {
          const hasIncomingStickers = Array.isArray(data.boardStickers) && data.boardStickers.length > 0;
          const existingStickers = _brdHost.querySelectorAll(':scope > .wn-emoji-sticker');
          if (existingStickers.length > 0 || hasIncomingStickers) {
            existingStickers.forEach(s => s.remove());
            if (hasIncomingStickers) {
              window._conBoardStickers = data.boardStickers.map(s => ({ id: s.id, emoji: s.emoji, x: Number(s.x) || 0, y: Number(s.y) || 0, size: Number(s.size) || 40 }));
              window._conBoardStickers.forEach(sd => {
                if (typeof conNoteBuildSticker === 'function') conNoteBuildSticker(sd, { emojiStickers: window._conBoardStickers }, _brdHost);
              });
            } else {
              window._conBoardStickers = [];
            }
          }
        }

        // Selection hygiene: remove IDs of deleted elements from selections
        if (typeof conMultiSelected !== 'undefined' && conMultiSelected && conMultiSelected.size) {
          const survivingNodeIds = new Set((window.conGetNodes ? window.conGetNodes() : []).map(n => n.id));
          conMultiSelected.forEach(id => {
            if (!survivingNodeIds.has(id)) conMultiSelected.delete(id);
          });
        }
        if (typeof conNoteSelected !== 'undefined' && conNoteSelected && conNoteSelected.size) {
          const survivingNoteIds = new Set((window.conGetNotes ? window.conGetNotes() : []).map(n => String(n.id)));
          conNoteSelected.forEach(id => {
            if (!survivingNoteIds.has(String(id))) conNoteSelected.delete(id);
          });
        }
        if (typeof conDrawingSelected !== 'undefined' && conDrawingSelected && conDrawingSelected.size) {
          const survivingDrawIds = new Set((window.conGetDrawings ? window.conGetDrawings() : []).map(d => String(d.id)));
          conDrawingSelected.forEach(id => {
            if (!survivingDrawIds.has(String(id))) conDrawingSelected.delete(id);
          });
        }
        if (typeof _conShapeSelected !== 'undefined' && _conShapeSelected && _conShapeSelected.size) {
          const survivingShapeIds = new Set((window.conGetShapes ? window.conGetShapes() : []).map(s => String(s.id)));
          _conShapeSelected.forEach(id => {
            if (!survivingShapeIds.has(String(id))) _conShapeSelected.delete(id);
          });
        }

        if (window.conGroupRefitAll) window.conGroupRefitAll();
        window.conRedrawEdges();
        if (window.conUpdatePageBar) window.conUpdatePageBar();
        conScheduleLayoutRefresh();
        if (typeof window._conSyncDrawOverlaySize === 'function') window._conSyncDrawOverlaySize();

        if (!isMirrorSync && typeof conQueueCurrentPageSnapshotPng === 'function') {
          conQueueCurrentPageSnapshotPng(conCurrentPageIndex);
        }
        if (!isMirrorSync && typeof window._conMirrorBroadcast === 'function') {
          window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
        }
        return;
      }

      // Clear existing board without confirm
      const nodes = conGetNodes();
      nodes.slice().forEach(n => n.el.remove());
      nodes.length = 0;
      const edges = window.conGetEdges ? window.conGetEdges() : [];
      const groups = window.conGetGroups ? window.conGetGroups() : [];
      edges.forEach(e => e.g && e.g.remove());
      edges.length = 0;
      groups.forEach(g => g.el && g.el.remove());
      groups.length = 0;
      document.getElementById('constellation-svg').innerHTML = '';
      if (window.conMasksClear) window.conMasksClear();
      if (window.conNotesClear) window.conNotesClear();
      if (window.conDrawingsClear) window.conDrawingsClear();
      if (window.conTablesClear) window.conTablesClear();
      if (!isMirrorSync && window.conMediaClear) window.conMediaClear();
      // Clear board-level emoji stickers (added via node emoji picker)
      const _boardEl = document.getElementById('constellation-board');
      if (_boardEl) _boardEl.querySelectorAll(':scope > .wn-emoji-sticker').forEach(s => s.remove());
      window._conBoardStickers = [];
      conPageBackgroundPdf = null;
      conRenderPagePdfBackground({ silent: true });
      _conBoardBg = null;
      conRenderBoardBg({ silent: true });
      _conBoardBgColor = '';
      conApplyBoardBgColor();

      const savedMasks = Array.isArray(data.masks)
        ? data.masks
        : (Array.isArray(data.conMasks) ? data.conMasks : []);

      // Advance conNextId past all saved ids across all pages so new additions don't collide
      const pagesToScan = [data];
      if (Array.isArray(data.pages)) pagesToScan.push(...data.pages);
      if (typeof conPageSnapshots !== 'undefined' && Array.isArray(conPageSnapshots)) pagesToScan.push(...conPageSnapshots);

      let allNumericIds = [];
      pagesToScan.forEach(p => {
        if (!p) return;
        const pageMasks = Array.isArray(p.masks) ? p.masks : (Array.isArray(p.conMasks) ? p.conMasks : []);
        allNumericIds = allNumericIds
          .concat((p.nodes || []).map(n => n && n.id))
          .concat((p.edges || []).map(e => e && [e.id, e.a, e.b]).flat())
          .concat((p.groups || []).map(g => g && g.id))
          .concat(pageMasks.map(m => m && m.id))
          .concat((p.drawings || []).map(d => d && d.id))
          .concat((p.shapes || []).map(s => s && s.id))
          .concat((p.tables || []).map(t => t && t.id));
      });
      let maxNum = 0;
      allNumericIds.forEach(id => {
        if (!id) return;
        const m = String(id).match(/\d+$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[0], 10));
      });
      if (window.conSetNextId) window.conSetNextId(maxNum + 2);
      if (typeof window.conSyncGroupNextId === 'function') window.conSyncGroupNextId(maxNum + 2);

      let maxNoteNum = -1;
      pagesToScan.forEach(p => {
        if (!p) return;
        (p.notes || []).forEach(n => {
          if (n && n.id) {
            const m = String(n.id).match(/^cnn(\d+)$/);
            if (m) {
              const val = parseInt(m[1], 10);
              if (!isNaN(val) && val > maxNoteNum) maxNoteNum = val;
            }
          }
        });
      });
      if (maxNoteNum >= 0) {
        if (typeof window.conSyncNoteNextId === 'function') window.conSyncNoteNextId(maxNoteNum + 1);
        else if (typeof conNoteNextId !== 'undefined') conNoteNextId = Math.max(conNoteNextId, maxNoteNum + 1);
      }

      const brd = conGetBoard();
      const contentBottom = conGetBoardContentBottomFromData(data);
      let resolvedHeight = (data && Number(data.boardHeight) > 0) ? Number(data.boardHeight) : null;
      if (!resolvedHeight) {
        try {
          const pIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
          const s = sessionStorage.getItem('cmt-board-expanded-height-' + pIdx) || sessionStorage.getItem('cmt-board-expanded-height');
          const v = parseInt(s, 10);
          if (!isNaN(v) && v > 0) resolvedHeight = v;
        } catch (_) { }
      }
      if (contentBottom > 0 && (!resolvedHeight || resolvedHeight < contentBottom + 120)) {
        const minNeeded = Math.round(contentBottom + 120);
        const defaultH = (brd ? (brd.offsetHeight || brd.clientHeight) : 0) || (window.innerHeight * 2);
        if (minNeeded > defaultH) resolvedHeight = minNeeded;
      }
      if (brd) {
        if (resolvedHeight && resolvedHeight > 0) {
          brd.style.height = resolvedHeight + 'px';
        } else if (window._bcBoardLayoutConfig && window._bcBoardLayoutConfig.dims && window._bcBoardLayoutConfig.dims.h) {
          brd.style.height = window._bcBoardLayoutConfig.dims.h + 'px';
        } else {
          brd.style.height = '';
        }
      }
      const curPIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
      if (typeof conPageSnapshots !== 'undefined' && conPageSnapshots[curPIdx]) {
        conPageSnapshots[curPIdx].boardHeight = resolvedHeight || null;
      }
      if (resolvedHeight && resolvedHeight > 0) {
        try {
          sessionStorage.setItem('cmt-board-expanded-height-' + curPIdx, String(resolvedHeight));
          sessionStorage.setItem('cmt-board-expanded-height', String(resolvedHeight));
        } catch (_) { }
      } else {
        try {
          sessionStorage.removeItem('cmt-board-expanded-height-' + curPIdx);
        } catch (_) { }
      }

      // Restore title
      if (window.conSetTitle) window.conSetTitle(data.title || '');
      const titleInput = document.getElementById('con-title-input');
      if (titleInput) titleInput.value = (window.conGetTitle ? window.conGetTitle() : '');

      // Restore nodes
      (data.nodes || []).forEach(n => {
        const dbMatch = (typeof vocabBank !== 'undefined')
          ? vocabBank.find(i => i.word.toLowerCase() === (n.dbWord || n.baseWord || '').toLowerCase())
          : null;
        const el = document.createElement('div');
        el.className = 'con-node' + (dbMatch ? ' con-node-matched' : '');
        el.id = n.id;
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
        if (n.bg) el.style.background = n.bg;
        if (n.color) el.style.color = n.color;
        if (n.border) el.style.borderColor = n.border;
        if (n.fontFamily) el.style.fontFamily = n.fontFamily;
        conApplyTextStrokeStyle(el, n.textStrokeWidth, n.textStrokeColor);
        brd.appendChild(el);
        const nodeObj = {
          id: n.id, el, x: n.x, y: n.y, baseX: n.x, baseY: n.y,
          w: (typeof n.w === 'number' && n.w > 0) ? n.w : undefined,
          h: (typeof n.h === 'number' && n.h > 0) ? n.h : undefined,
          _cachedW: (typeof n._cachedW === 'number' && n._cachedW > 0) ? n._cachedW : ((typeof n.w === 'number' && n.w > 0) ? n.w : undefined),
          _cachedH: (typeof n._cachedH === 'number' && n._cachedH > 0) ? n._cachedH : ((typeof n.h === 'number' && n.h > 0) ? n.h : undefined),
          dbWord: n.dbWord || null,
          baseWord: n.baseWord || '',
          sourceWord: n.sourceWord || null,
          relation: n.relation || null,
          aiDef: n.aiDef || null,
          aiPos: n.aiPos || null,
          fmt: n.fmt || {},
          locked: !!n.locked,
          pageNum: n.pageNum != null ? n.pageNum : null,
          isNodeAct: !!n.isNodeAct,
          actNodeId: n.actNodeId || null,
          actParentId: n.actParentId || null,
          phraseOrder: n.phraseOrder != null ? n.phraseOrder : null,
          emoji: n.emoji || null,
          isTimer: !!n.isTimer,
          durationSec: n.durationSec || null,
          remainingSec: n.remainingSec != null ? n.remainingSec : null,
          timerState: n.timerState || 'idle',
          timerTarget: (n.timerTarget === 'cms' || n.timerTarget === 'board') ? n.timerTarget : null,
          isRandom: !!n.isRandom,
          randomMin: n.isRandom ? (n.randomMin != null ? n.randomMin : 1) : null,
          randomMax: n.isRandom ? (n.randomMax != null ? n.randomMax : 100) : null,
          randomValue: n.isRandom ? (n.randomValue != null ? n.randomValue : (n.randomMin != null ? n.randomMin : 1)) : null,
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
          tags: Array.isArray(n.tags) ? n.tags.slice() : [],
          shape: (window.conNormalizeNodeShape ? window.conNormalizeNodeShape(n.shape || 'rectangle') : conNormalizeNodeShapeSafe(n.shape || 'rectangle')),
          borderWidth: n.borderWidth || null,
          borderStyle: n.borderStyle || null,
          highlight: n.highlight || null,
          preset: n.preset || null,
          fontFamily: n.fontFamily || null,
          fontSize: n.fontSize || '16px',
          textStrokeColor: n.textStrokeColor || null,
          textStrokeWidth: n.textStrokeWidth || null,
          competences: Array.isArray(n.competences) ? n.competences.slice() : (n.competences ? [n.competences] : (Array.isArray(n.competenceTags) ? n.competenceTags.slice() : [])),
          nodeNumber: n.nodeNumber != null ? n.nodeNumber : null,
          nodeNumberFormat: n.nodeNumberFormat || null,
          anim: n.anim || '',
          revealAnim: n.revealAnim || ''
        };
        if (nodeObj.anim && typeof window.conApplyEntityAnimClass === 'function') {
          window.conApplyEntityAnimClass(el, nodeObj.anim, false);
        }
        if (nodeObj.isTimer && nodeObj.timerState === 'running') {
          nodeObj.timerEndTime = Date.now() + (nodeObj.remainingSec || nodeObj.durationSec || 60) * 1000;
        }
        conGetNodes().push(nodeObj);
        if (typeof window.conAttachNode === 'function') {
          window.conAttachNode(n.id, el);
        } else if (typeof window.conAttachNodeEvents === 'function') {
          window.conAttachNodeEvents(n.id, el);
        }
        // Rebuild innerHTML with formatting + annotations + page badge
        window.conRenderNodeLabel(nodeObj);
        if (nodeObj.nodeNumber != null && typeof window.conApplyEntityBadge === 'function') {
          window.conApplyEntityBadge(el, nodeObj.nodeNumber, nodeObj.nodeNumberFormat, 'node');
        }
        if (window.conSetNodeBaseFontSize) window.conSetNodeBaseFontSize(nodeObj, n.fontSize || '16px');
        conApplyNodeShape(nodeObj, nodeObj.shape);
        if (el.offsetWidth > 0) {
          nodeObj._cachedW = el.offsetWidth;
          nodeObj._cachedH = el.offsetHeight;
        }
        nodeObj.rotation = (typeof n.rotation === 'number') ? ((typeof window.conNormalizeNodeRotation === 'function') ? window.conNormalizeNodeRotation(n.rotation) : n.rotation) : 0;
        if (typeof conApplyNodeRotation === 'function') conApplyNodeRotation(nodeObj, nodeObj.rotation);
        el.dataset.baseWord = n.baseWord || '';
        // Restore emoji badge/dot state if emoji was saved
        if (nodeObj.emoji && window.conEmojiRestoreNodeDotAndBadge) window.conEmojiRestoreNodeDotAndBadge(nodeObj);
        // Attach star button if node has a db entry
        if (window.conAddNodeStarBtn) window.conAddNodeStarBtn(nodeObj);
        // Restore competence badge
        if (typeof conUpdateNodeCompetenceBadge === 'function') conUpdateNodeCompetenceBadge(nodeObj);
        // Restore masked state
        if (n.masked) {
          nodeObj.masked = true;
          el.classList.add('con-masked');
        }
        if (window.conSyncNodeLockState) window.conSyncNodeLockState(nodeObj);
      });

      // Restore edges
      (data.edges || []).forEach(e => {
        if (e.a && e.b) {
          _conRestoreEdge(
            e.a,
            e.b,
            e.type,
            e.label || '',
            e.labelSize,
            e.labelColor,
            e.labelWeight,
            e.thickness,
            e.dashStyle || null,
            e.id || null,
            e.strokeType,
            e.routing,
            e.curvature,
            e.opacity,
            e.terminator,
            e.animated,
            e.labelBg,
            e.anchorA,
            e.anchorB,
            e.colorMode,
            e.strokeColor,
            e.points,
            e.avoidObstacles
          );
        }
      });

      // Restore groups
      // NOTE: notes/drawings/shapes are restored AFTER groups, so we cannot filter by their
      // current existence here ÔÇö _conGroupRefit handles missing members gracefully and
      // conGroupRefitAll() is called at the end once everything is in place.
      if (data.groups) {
        data.groups.forEach(g => {
          const validIds = (g.nodeIds || []).filter(id => conGetNodes().find(n => n.id === id));
          const noteIds = g.noteIds || [];
          const drawingIds = g.drawingIds || [];
          const shapeIds = g.shapeIds || [];
          const mediaIds = g.mediaIds || [];
          if (validIds.length >= 1 || noteIds.length >= 1 || drawingIds.length >= 1 || shapeIds.length >= 1 || mediaIds.length >= 1 || (g.manualW != null && g.manualH != null))
            _conRestoreGroup({ ...g, noteIds, drawingIds, shapeIds, mediaIds }, validIds);
        });
      }

      // Restore masks
      savedMasks.forEach(m => {
        if (window.conAddMaskFromData) window.conAddMaskFromData(m);
      });

      // Restore notes
      conNoteNextId = 0;
      const _liveNotes = window.conGetNotes ? window.conGetNotes() : [];
      (data.notes || []).forEach(n => {
        const noteData = {
          fontSize: 14, bold: false, italic: false, underline: false, strike: false,
          color: '#111111', bg: '#ffffff',
          hidden: false, locked: false,
          manualSize: false, width: null, height: null,
          noteNumber: n.noteNumber != null ? n.noteNumber : null,
          noteNumberFormat: n.noteNumberFormat || null,
          ...n
        };
        const resolvedNoteW = Number(n.liveBaseWidth != null ? n.liveBaseWidth : (n.width != null ? n.width : (n.w != null ? n.w : n.styleWidth))) || null;
        const resolvedNoteH = Number(n.liveBaseHeight != null ? n.liveBaseHeight : (n.height != null ? n.height : (n.h != null ? n.h : n.styleHeight))) || null;
        if (resolvedNoteW) {
          noteData.width = resolvedNoteW;
          noteData.w = resolvedNoteW;
          noteData.liveBaseWidth = resolvedNoteW;
          noteData._cachedW = resolvedNoteW;
        }
        if (resolvedNoteH) {
          noteData.height = resolvedNoteH;
          noteData.h = resolvedNoteH;
          noteData.liveBaseHeight = resolvedNoteH;
          noteData._cachedH = resolvedNoteH;
        }
        _liveNotes.push(noteData);
        conNoteBuild(noteData);
        const num = parseInt(String(n.id).replace(/^cn+/, ''));
        if (!isNaN(num)) {
          if (typeof window.conSyncNoteNextId === 'function') window.conSyncNoteNextId(num + 1);
          else if (typeof conNoteNextId !== 'undefined') conNoteNextId = Math.max(conNoteNextId, num + 1);
        }
        if (n.nodeId) {
          const linkedNode = conGetNodes().find(nd => nd.id === n.nodeId);
          if (linkedNode) linkedNode.el.classList.add('has-con-note');
        }
      });
      // Re-apply styles after DOM layout settles (fixes size/weight not showing on load)
      requestAnimationFrame(() => {
        const _notesForStyle = window.conGetNotes ? window.conGetNotes() : [];
        _notesForStyle.forEach(nd => {
          if (nd._applyStyle) nd._applyStyle();
          if (nd.noteNumber != null && typeof window.conApplyEntityBadge === 'function') {
            const _nel = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nd.id) : document.querySelector('.con-word-note[data-id="' + nd.id + '"]');
            if (_nel) window.conApplyEntityBadge(_nel, nd.noteNumber, nd.noteNumberFormat, 'note');
          }
        });
        if (typeof window.conGroupRefitAll === 'function') window.conGroupRefitAll();
        if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
      });

      // Restore drawings
      if (window.conDrawingsClear) window.conDrawingsClear();
      (data.drawings || []).forEach(d => {
        if (window.conDrawingFromData) window.conDrawingFromData(d);
      });

      // Restore shapes
      if (window.conShapesClear) window.conShapesClear();
      (data.shapes || []).forEach(s => {
        if (window.conShapeFromData) window.conShapeFromData(s);
      });

      // Restore tables
      (data.tables || []).forEach(t => {
        if (window.conAddTableFromData) window.conAddTableFromData(t);
      });

      conRestoreMediaItems(data.media || []);
      conPageBackgroundPdf = data.backgroundPdf
        ? {
          attachmentId: String(data.backgroundPdf.attachmentId || ''),
          name: String(data.backgroundPdf.name || 'background.pdf'),
          mime: String(data.backgroundPdf.mime || 'application/pdf'),
          relativePath: String(data.backgroundPdf.relativePath || ''),
          pageNumber: Math.max(1, Number(data.backgroundPdf.pageNumber) || 1),
          file: null
        }
        : null;
      conRenderPagePdfBackground({ silent: true });
      _conBoardBg = (data.boardBg && data.boardBg.attachmentId)
        ? { attachmentId: String(data.boardBg.attachmentId), pageNumber: Math.max(1, Number(data.boardBg.pageNumber) || 1) }
        : null;
      conRenderBoardBg({ silent: true });
      _conBoardBgColor = conNormalizeColorHex(data.boardBgColor || data.boardBackgroundColor || data.backgroundColor || '') || window._bcBoardDefaultBgColor || '';
      conApplyBoardBgColor();

      if (window.conGroupRefitAll) window.conGroupRefitAll();
      window.conRedrawEdges();
      if (window.conUpdatePageBar) window.conUpdatePageBar();
      conScheduleLayoutRefresh();
      if (typeof window._conSyncDrawOverlaySize === 'function') window._conSyncDrawOverlaySize();

      // Restore board-level emoji stickers (placed near nodes)
      const _brd = document.getElementById('constellation-board');
      if (_brd && Array.isArray(data.boardStickers) && data.boardStickers.length) {
        window._conBoardStickers = data.boardStickers.map(s => ({ id: s.id, emoji: s.emoji, x: Number(s.x) || 0, y: Number(s.y) || 0, size: Number(s.size) || 40 }));
        window._conBoardStickers.forEach(sd => {
          if (typeof conNoteBuildSticker === 'function') conNoteBuildSticker(sd, { emojiStickers: window._conBoardStickers }, _brd);
        });
      }

      if (!isMirrorSync && typeof conQueueCurrentPageSnapshotPng === 'function') {
        conQueueCurrentPageSnapshotPng(conCurrentPageIndex);
      }
      if (!isMirrorSync && !isPageRestore && !window._conMirrorFrozen && typeof window._conMirrorBroadcast === 'function') {
        window._conMirrorBroadcast({ bumpRevision: true, forceRender: true });
      }
    } finally {
      setTimeout(() => {
        _conIsRestoringSession = false;
        window._conSuppressMirrorObserver = false;
      }, 150);
    }
  }

    // Helper: restore a single edge (mirrors conAddEdge inside IIFE)
    function _conRestoreEdge(aId, bId, type, label, labelSize, labelColor, labelWeight, thickness, dashStyle, existingId, strokeType, routing, curvature, opacity, terminator, animated, labelBg, anchorA, anchorB, colorMode, strokeColor, points, avoidObstacles) {
      if (window.conEnsureSvgDefs) window.conEnsureSvgDefs();
      const svgEl = document.getElementById('constellation-svg');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'con-line-group');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('class', 'con-line');
      line.setAttribute('fill', 'none');
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hit.setAttribute('class', 'con-line-hit');
      hit.setAttribute('fill', 'none');
      const labelBgEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      labelBgEl.setAttribute('class', 'con-line-label-bg');
      labelBgEl.setAttribute('rx', '4');
      labelBgEl.setAttribute('ry', '4');
      labelBgEl.style.display = 'none';
      const labelEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelEl.setAttribute('class', 'con-line-label');
      labelEl.style.pointerEvents = 'all';
      labelEl.style.cursor = 'pointer';
      let edgeId = existingId || ('ce' + (window.conGetNextId ? window.conGetNextId() : Date.now()));
      const curEdges = window.conGetEdges ? window.conGetEdges() : [];
      if (!existingId || curEdges.some(e => e.id === edgeId)) {
        while (curEdges.some(e => e.id === edgeId)) {
          const nextNum = window.conGetNextId ? window.conGetNextId() : Date.now();
          edgeId = 'ce' + nextNum;
        }
      }
      g.dataset.eid = edgeId;
      g.appendChild(line);
      g.appendChild(labelBgEl);
      g.appendChild(labelEl);
      g.appendChild(hit);
      svgEl.appendChild(g);

      hit.addEventListener('click', function (e) {
        if (typeof conMode !== 'undefined' && conMode === 'delete') {
          if (window.conPushUndo) window.conPushUndo();
          if (window.conRemoveEdge) window.conRemoveEdge(edgeId);
          return;
        }
        e.stopPropagation();
        const nextSelected = (window._conSelectedEdgeId === edgeId) ? null : edgeId;
        if (nextSelected) {
          if (typeof window.conDeselectAll === 'function') {
            window.conDeselectAll();
          } else if (typeof window.conSelect === 'function') {
            window.conSelect(null);
          }
        }
        window._conSelectedEdgeId = nextSelected;
        if (typeof window.conMirrorSyncSelection === 'function') window.conMirrorSyncSelection();
        if (window.conRedrawEdges) window.conRedrawEdges();
      });
      hit.addEventListener('dblclick', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.conEdgeCtxOpen) window.conEdgeCtxOpen(e, edgeId);
      });
      labelEl.addEventListener('dblclick', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.conEdgeCtxOpen) window.conEdgeCtxOpen(e, edgeId);
      });
      hit.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.conEdgeCtxOpen) window.conEdgeCtxOpen(e, edgeId);
      });
      labelEl.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.conEdgeCtxOpen) window.conEdgeCtxOpen(e, edgeId);
      });

      const _restoreThickness = (thickness > 0) ? Number(thickness) : ((window._conDefaultLinkThickness > 0) ? window._conDefaultLinkThickness : 2);
      const sType = strokeType || (dashStyle === 'dashed' ? 'dashed' : (dashStyle === 'dotted' ? 'dotted' : (window._conDefaultLinkStrokeType || 'solid')));
      const edge = {
        id: edgeId,
        a: aId,
        b: bId,
        type: type || (window._conDefaultLinkDirection || 'none'),
        label: label || '',
        labelSize: Number(labelSize) || (window._conDefaultLinkLabelSize > 0 ? window._conDefaultLinkLabelSize : 16),
        labelColor: labelColor || window._conDefaultLinkColor || '#333333',
        labelWeight: Number(labelWeight) || 600,
        thickness: _restoreThickness,
        dashStyle: (sType === 'dashed' || sType === 'dotted') ? sType : null,
        strokeType: sType,
        routing: routing || window._conDefaultLinkRouting || 'straight',
        curvature: (typeof curvature === 'number') ? curvature : 0,
        opacity: (typeof opacity === 'number') ? opacity : ((typeof window._conDefaultLinkOpacity === 'number') ? window._conDefaultLinkOpacity : 1),
        terminator: terminator || window._conDefaultLinkTerminator || 'arrow',
        animated: (typeof animated !== 'undefined') ? !!animated : !!window._conDefaultLinkAnimated,
        labelBgActive: (typeof labelBg !== 'undefined') ? !!labelBg : !!window._conDefaultLinkLabelBg,
        anchorA: anchorA || null,
        anchorB: anchorB || null,
        // Link colour mode: 'auto' (derived from endpoints) | 'manual'. Left undefined for
        // legacy saves so conApplyEdgeLabelStyle can infer it once both endpoints exist.
        colorMode: (colorMode === 'auto' || colorMode === 'manual') ? colorMode : undefined,
        strokeColor: strokeColor || null,
        points: Array.isArray(points) ? points.map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })) : [],
        avoidObstacles: !!avoidObstacles,
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
      line.style.strokeWidth = String(_restoreThickness);
      hit.style.strokeWidth = String(Math.max(16, _restoreThickness + 10));
      const edgesArr = window.conGetEdges ? window.conGetEdges() : [];
      edgesArr.push(edge);
      labelEl.textContent = edge.label;
      if (window.conApplyEdgeLabelStyle) window.conApplyEdgeLabelStyle(edge);
      return edge;
    }
    window._conRestoreEdge = _conRestoreEdge;

    // Helper: append a single node from serialized data without touching existing nodes
    function conAppendNodeFromData(n, targetBrd, targetNodes) {
      if (!n || !n.id) return null;
      const brd = targetBrd || document.getElementById('constellation-board');
      if (!brd) return null;
      const nodesArr = targetNodes || (window.conGetNodes ? window.conGetNodes() : []);
      if (nodesArr.some(x => x && x.id === n.id) || document.getElementById(n.id)) return null;
      const dbMatch = (typeof vocabBank !== 'undefined')
        ? vocabBank.find(i => i.word.toLowerCase() === (n.dbWord || n.baseWord || '').toLowerCase())
        : null;
      const el = document.createElement('div');
      el.className = 'con-node' + (dbMatch ? ' con-node-matched' : '');
      el.id = n.id;
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
      if (n.bg) el.style.background = n.bg;
      if (n.color) el.style.color = n.color;
      if (n.border) el.style.borderColor = n.border;
      if (n.fontFamily) el.style.fontFamily = n.fontFamily;
      conApplyTextStrokeStyle(el, n.textStrokeWidth, n.textStrokeColor);
      brd.appendChild(el);
      const nodeObj = {
        id: n.id, el, x: n.x, y: n.y, baseX: n.x, baseY: n.y,
        w: (typeof n.w === 'number' && n.w > 0) ? n.w : undefined,
        h: (typeof n.h === 'number' && n.h > 0) ? n.h : undefined,
        _cachedW: (typeof n._cachedW === 'number' && n._cachedW > 0) ? n._cachedW : ((typeof n.w === 'number' && n.w > 0) ? n.w : undefined),
        _cachedH: (typeof n._cachedH === 'number' && n._cachedH > 0) ? n._cachedH : ((typeof n.h === 'number' && n.h > 0) ? n.h : undefined),
        dbWord: n.dbWord || null,
        baseWord: n.baseWord || '',
        sourceWord: n.sourceWord || null,
        relation: n.relation || null,
        aiDef: n.aiDef || null,
        aiPos: n.aiPos || null,
        fmt: n.fmt || {},
        locked: !!n.locked,
        pageNum: n.pageNum != null ? n.pageNum : null,
        isNodeAct: !!n.isNodeAct,
        actNodeId: n.actNodeId || null,
        actParentId: n.actParentId || null,
        phraseOrder: n.phraseOrder != null ? n.phraseOrder : null,
        emoji: n.emoji || null,
        isTimer: !!n.isTimer,
        durationSec: n.durationSec || null,
        remainingSec: n.remainingSec != null ? n.remainingSec : null,
        timerState: n.timerState || 'idle',
        timerTarget: (n.timerTarget === 'cms' || n.timerTarget === 'board') ? n.timerTarget : null,
        isRandom: !!n.isRandom,
        randomMin: n.isRandom ? (n.randomMin != null ? n.randomMin : 1) : null,
        randomMax: n.isRandom ? (n.randomMax != null ? n.randomMax : 100) : null,
        randomValue: n.isRandom ? (n.randomValue != null ? n.randomValue : (n.randomMin != null ? n.randomMin : 1)) : null,
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
        tags: Array.isArray(n.tags) ? n.tags.slice() : [],
        shape: (window.conNormalizeNodeShape ? window.conNormalizeNodeShape(n.shape || 'rectangle') : conNormalizeNodeShapeSafe(n.shape || 'rectangle')),
        borderWidth: n.borderWidth || null,
        borderStyle: n.borderStyle || null,
        highlight: n.highlight || null,
        preset: n.preset || null,
        fontFamily: n.fontFamily || null,
        fontSize: n.fontSize || '16px',
        textStrokeColor: n.textStrokeColor || null,
        textStrokeWidth: n.textStrokeWidth || null,
        competences: Array.isArray(n.competences) ? n.competences.slice() : (Array.isArray(n.competenceTags) ? n.competenceTags.slice() : []),
        nodeNumber: n.nodeNumber != null ? n.nodeNumber : null,
        nodeNumberFormat: n.nodeNumberFormat || null,
        anim: n.anim || '',
        revealAnim: n.revealAnim || ''
      };
      if (nodeObj.anim && typeof window.conApplyEntityAnimClass === 'function') {
        window.conApplyEntityAnimClass(el, nodeObj.anim, false);
      }
      if (nodeObj.isTimer && nodeObj.timerState === 'running') {
        nodeObj.timerEndTime = Date.now() + (nodeObj.remainingSec || nodeObj.durationSec || 60) * 1000;
      }
      nodesArr.push(nodeObj);
      if (typeof window.conAttachNode === 'function') {
        window.conAttachNode(n.id, el);
      } else if (typeof window.conAttachNodeEvents === 'function') {
        window.conAttachNodeEvents(n.id, el);
      }
      window.conRenderNodeLabel(nodeObj);
      if (nodeObj.nodeNumber != null && typeof window.conApplyEntityBadge === 'function') {
        window.conApplyEntityBadge(el, nodeObj.nodeNumber, nodeObj.nodeNumberFormat, 'node');
      }
      if (window.conSetNodeBaseFontSize) window.conSetNodeBaseFontSize(nodeObj, n.fontSize || '16px');
      conApplyNodeShape(nodeObj, nodeObj.shape);
      if (el.offsetWidth > 0) {
        nodeObj._cachedW = el.offsetWidth;
        nodeObj._cachedH = el.offsetHeight;
      }
      nodeObj.rotation = (typeof n.rotation === 'number') ? ((typeof window.conNormalizeNodeRotation === 'function') ? window.conNormalizeNodeRotation(n.rotation) : n.rotation) : 0;
      if (typeof conApplyNodeRotation === 'function') conApplyNodeRotation(nodeObj, nodeObj.rotation);
      el.dataset.baseWord = n.baseWord || '';
      if (nodeObj.emoji && window.conEmojiRestoreNodeDotAndBadge) window.conEmojiRestoreNodeDotAndBadge(nodeObj);
      if (window.conAddNodeStarBtn) window.conAddNodeStarBtn(nodeObj);
      if (n.masked) {
        nodeObj.masked = true;
        el.classList.add('con-masked');
      }
      if (window.conSyncNodeLockState) window.conSyncNodeLockState(nodeObj);
      if (typeof conUpdateNodeCompetenceBadge === 'function') conUpdateNodeCompetenceBadge(nodeObj);
      return nodeObj;
    }
    window.conAppendNodeFromData = conAppendNodeFromData;

    // Helper: append a single note from serialized data without touching existing notes
    function conAppendNoteFromData(n, targetNotes) {
      if (!n || !n.id) return null;
      const notesArr = targetNotes || (window.conGetNotes ? window.conGetNotes() : []);
      if (notesArr.some(x => x && String(x.id) === String(n.id))) return null;
      const noteData = {
        fontSize: 14, bold: false, italic: false, underline: false, strike: false,
        color: '#111111', bg: '#ffffff',
        hidden: false, locked: false,
        manualSize: false, width: null, height: null,
        ...n
      };
      const resolvedNoteW = Number(n.liveBaseWidth != null ? n.liveBaseWidth : (n.width != null ? n.width : (n.w != null ? n.w : n.styleWidth))) || null;
      const resolvedNoteH = Number(n.liveBaseHeight != null ? n.liveBaseHeight : (n.height != null ? n.height : (n.h != null ? n.h : n.styleHeight))) || null;
      if (resolvedNoteW) {
        noteData.width = resolvedNoteW;
        noteData.w = resolvedNoteW;
        noteData.liveBaseWidth = resolvedNoteW;
        noteData._cachedW = resolvedNoteW;
      }
      if (resolvedNoteH) {
        noteData.height = resolvedNoteH;
        noteData.h = resolvedNoteH;
        noteData.liveBaseHeight = resolvedNoteH;
        noteData._cachedH = resolvedNoteH;
      }
      notesArr.push(noteData);
      if (typeof conNoteBuild === 'function') conNoteBuild(noteData);
      const num = parseInt(String(n.id).replace(/^cn+/, ''));
      if (!isNaN(num)) {
        if (typeof window.conSyncNoteNextId === 'function') window.conSyncNoteNextId(num + 1);
        else if (typeof conNoteNextId !== 'undefined') conNoteNextId = Math.max(conNoteNextId, num + 1);
      }
      if (n.nodeId) {
        const linkedNode = conGetNodes().find(nd => nd.id === n.nodeId);
        if (linkedNode && linkedNode.el) {
          linkedNode.el.classList.add('has-con-note');
          if (typeof conUpdateNodeNoteButton === 'function') conUpdateNodeNoteButton(linkedNode);
        }
      }
      return noteData;
    }
    window.conAppendNoteFromData = conAppendNoteFromData;

    // Helper: restore a group
    function _conRestoreGroup(g, validIds) {
      const brd = conGetBoard();
      const groupsArr = window.conGetGroups ? window.conGetGroups() : (typeof conGroups !== 'undefined' ? conGroups : []);
      let gid = g.id;
      if (!gid || groupsArr.some(existing => existing.id === gid)) {
        gid = (typeof conGenerateGroupId === 'function') ? conGenerateGroupId(gid) : (gid || ('cg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)));
      }
      const m = String(gid).match(/cg(\d+)$/i) || String(gid).match(/(\d+)$/);
      if (m) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && typeof conSyncGroupNextId === 'function') conSyncGroupNextId(num + 1);
      }
      const el = document.createElement('div');
      el.className = 'con-group' + (g.drawingGroup ? ' con-group-drawing' : '') + (g.phraseGroup ? ' con-phrase-group' : '');
      el.dataset.gid = gid;
      const svgEl = document.getElementById('constellation-svg');
      // Insert after existing groups so restored groups stack in save order
      let _ri = null;
      let _rc = svgEl.nextSibling;
      while (_rc) {
        if (!_rc.classList || !_rc.classList.contains('con-group')) { _ri = _rc; break; }
        _rc = _rc.nextSibling;
      }
      brd.insertBefore(el, _ri);

      if (!g.drawingGroup && !g.phraseGroup) {
        if (g.invisible) {
          el.classList.add('con-group-invisible');
          el.style.borderColor = 'transparent';
          el.style.background = 'transparent';
        } else {
          const CON_PALETTES_REF = window.CON_PALETTES || [];
          const pal = CON_PALETTES_REF[g.paletteIdx] || ['rgba(240,240,240,0.5)', '#111', '#111'];
          el.style.borderColor = pal[2] || '#111';
          el.style.color = pal[1] || '#111';
          const bgRaw = pal[0] || '#ffffff';
          if (bgRaw === '#ffffff') {
            el.style.background = 'rgba(240,240,240,0.5)';
          } else {
            const r = parseInt(bgRaw.slice(1, 3), 16);
            const gv = parseInt(bgRaw.slice(3, 5), 16);
            const b = parseInt(bgRaw.slice(5, 7), 16);
            el.style.background = `rgba(${r},${gv},${b},0.28)`;
          }
        }
      }

      // Resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'con-group-resizer';
      el.appendChild(resizeHandle);

      const groupObj = {
        id: gid, nodeIds: [...validIds], noteIds: [...(g.noteIds || [])], drawingIds: [...(g.drawingIds || [])], shapeIds: [...(g.shapeIds || [])], mediaIds: [...(g.mediaIds || [])],
        title: g.title || '', blink: !!g.blink, paletteIdx: g.paletteIdx || 0, invisible: !!g.invisible, drawingGroup: !!g.drawingGroup, phraseGroup: !!g.phraseGroup, el,
        _manualW: (g.manualW != null ? g.manualW : null),
        _manualH: (g.manualH != null ? g.manualH : null),
        _px: g.x != null ? g.x : null,
        _py: g.y != null ? g.y : null,
        _titleX: g.titleX != null ? g.titleX : null,
        _titleY: g.titleY != null ? g.titleY : null,
        _titleW: g.titleW != null ? g.titleW : null,
        _titleFS: g.titleFS != null ? g.titleFS : null,
        groupNumber: g.groupNumber != null ? g.groupNumber : null,
        groupNumberFormat: g.groupNumberFormat || null
      };
      groupsArr.push(groupObj);
      if (typeof window.conGroupAttach === 'function') {
        window.conGroupAttach(groupObj);
      } else if (typeof window.conGroupAttachEvents === 'function') {
        window.conGroupAttachEvents(groupObj);
      }
      if (groupObj.groupNumber != null && typeof window.conApplyEntityBadge === 'function') {
        window.conApplyEntityBadge(el, groupObj.groupNumber, groupObj.groupNumberFormat, 'group');
      }
      if (groupObj.anim || groupObj.blink) {
        if (typeof window.conApplyEntityAnimClass === 'function') {
          window.conApplyEntityAnimClass(el, groupObj.anim, !!groupObj.blink);
        } else if (groupObj.blink) {
          el.classList.add('con-group-blink');
        }
      }
      if (groupObj.phraseGroup) {
        requestAnimationFrame(() => {
          if (window.conPhraseGroupLayout) window.conPhraseGroupLayout(groupObj);
        });
      }
      if (typeof window.conGroupRefit === 'function') window.conGroupRefit(groupObj);
      else _conGroupRefit(groupObj);
    }
    window._conRestoreGroup = _conRestoreGroup;

    function _conGroupRefit(group) {
      if (typeof window.conGroupRefit === 'function') {
        window.conGroupRefit(group);
        return;
      }
      const PAD = 18;
      // Respect manual size
      if (group._manualW != null && group._manualH != null) {
        group.el.style.width = group._manualW + 'px';
        group.el.style.height = group._manualH + 'px';
        if (group._px != null) group.el.style.left = group._px + 'px';
        if (group._py != null) group.el.style.top = group._py + 'px';
        return;
      }
      const allRects = [];
      conGetNodes().filter(n => group.nodeIds.includes(n.id)).forEach(n => {
        const nw = (n.el && n.el.offsetWidth > 0) ? n.el.offsetWidth : (parseFloat(n.el.style.width) || 80);
        const nh = (n.el && n.el.offsetHeight > 0) ? n.el.offsetHeight : (parseFloat(n.el.style.height) || 28);
        allRects.push({ x: n.x, y: n.y, w: nw, h: nh });
      });
      (group.noteIds || []).forEach(nid => {
        const nd = (typeof conNotes !== 'undefined' ? conNotes : []).find(n => n.id === nid);
        const el = (typeof wnGetNoteElementById === 'function') ? wnGetNoteElementById(nid) : document.querySelector(`.con-word-note[data-id="${nid}"]`);
        if (nd) {
          const nw = (el && el.offsetWidth > 0) ? el.offsetWidth : (typeof nd.width === 'number' && nd.width > 0 ? nd.width : 80);
          const nh = (el && el.offsetHeight > 0) ? el.offsetHeight : (typeof nd.height === 'number' && nd.height > 0 ? nd.height : 28);
          allRects.push({ x: nd.x, y: nd.y, w: nw, h: nh });
        }
      });
      const drawings = window.conGetDrawings ? window.conGetDrawings() : [];
      (group.drawingIds || []).forEach(did => {
        const dr = drawings.find(d => d.id === did);
        if (dr) allRects.push({ x: dr.x, y: dr.y, w: dr.w || 40, h: dr.h || 40 });
      });
      if (!allRects.length) return;
      const minX = Math.min(...allRects.map(r => r.x)) - PAD;
      const minY = Math.min(...allRects.map(r => r.y)) - PAD;
      const maxX = Math.max(...allRects.map(r => r.x + r.w)) + PAD;
      const maxY = Math.max(...allRects.map(r => r.y + r.h)) + PAD;
      group.el.style.left = minX + 'px';
      group.el.style.top = minY + 'px';
      group.el.style.width = (maxX - minX) + 'px';
      group.el.style.height = (maxY - minY) + 'px';
    }


  Board.pages = Board.pages || {};

  // Backward compatibility exports for HTML attributes & cross-module calls
  window.openSessionLoadPopup = global.openSessionLoadPopup = openSessionLoadPopup;
  window.closeSessionLoadPopup = global.closeSessionLoadPopup = closeSessionLoadPopup;
  window.sessionLoadFromFile = global.sessionLoadFromFile = sessionLoadFromFile;
  window.conExport = global.conExport = conExport;
  window.conPdfPickerClose = global.conPdfPickerClose = conPdfPickerClose;
  window._doConExportPDF = global._doConExportPDF = _doConExportPDF;
  window.conCloseExportSettingsModal = global.conCloseExportSettingsModal = conCloseExportSettingsModal;
  window.conOnExportQualitySlider = global.conOnExportQualitySlider = conOnExportQualitySlider;
  window.conApplyExportQualityPreset = global.conApplyExportQualityPreset = conApplyExportQualityPreset;
  window.conOnExportSettingsChange = global.conOnExportSettingsChange = conOnExportSettingsChange;
  window.conExecuteExportWithOptions = global.conExecuteExportWithOptions = conExecuteExportWithOptions;
  window.conSaveSession = global.conSaveSession = conSaveSession;
  window.conDuplicateCurrentFile = global.conDuplicateCurrentFile = conDuplicateCurrentFile;
  window.conLoadSession = global.conLoadSession = conLoadSession;
  window.conOpenTemplatePopup = global.conOpenTemplatePopup = conOpenTemplatePopup;
  window.conCloseTemplatePopup = global.conCloseTemplatePopup = conCloseTemplatePopup;
  window.conSaveTemplate = global.conSaveTemplate = conSaveTemplate;
  window.conLoadTemplateFromFile = global.conLoadTemplateFromFile = conLoadTemplateFromFile;
  window.conOpenCompetenceModal = global.conOpenCompetenceModal = conOpenCompetenceModal;
  window.conCloseCompetenceModal = global.conCloseCompetenceModal = conCloseCompetenceModal;
  window.conToggleCompFilterSelected = global.conToggleCompFilterSelected = conToggleCompFilterSelected;
  window.conFilterCompetencePicker = global.conFilterCompetencePicker = conFilterCompetencePicker;
  window.conSelectAllVisibleCompetences = global.conSelectAllVisibleCompetences = conSelectAllVisibleCompetences;
  window.conApplyPlannerSuggestedCompetences = global.conApplyPlannerSuggestedCompetences = conApplyPlannerSuggestedCompetences;
  window.conApplySelectedCompetences = global.conApplySelectedCompetences = conApplySelectedCompetences;
  window.conCtxOpenCompetenceModal = global.conCtxOpenCompetenceModal = conCtxOpenCompetenceModal;
  window.conBuildPageSnapshot = global.conBuildPageSnapshot = conBuildPageSnapshot;
  window._conRestorePageToBoard = global._conRestorePageToBoard = _conRestorePageToBoard;
  window.conRestorePageToBoard = global.conRestorePageToBoard = _conRestorePageToBoard;
  window.conTitle = global.conTitle = window.conTitle || conTitle;

  window.boardSetDirty = global.boardSetDirty = boardSetDirty;
  window._conCurrentCompetences = global._conCurrentCompetences = global._conCurrentCompetences;
  window.conRenderHeaderCompetenceBar = global.conRenderHeaderCompetenceBar = conRenderHeaderCompetenceBar;
  window.conOpenCompetenceNotePopover = global.conOpenCompetenceNotePopover = conOpenCompetenceNotePopover;
  window.conCloseCompetenceNotePopover = global.conCloseCompetenceNotePopover = conCloseCompetenceNotePopover;
  window.conUpdateNodeCompetenceBadge = global.conUpdateNodeCompetenceBadge = conUpdateNodeCompetenceBadge;
  window.conBuildSessionData = global.conBuildSessionData = conBuildSessionData;
  window.renderSessionLoadPopup = global.renderSessionLoadPopup = renderSessionLoadPopup;
  window.boardResetAutosaveInterval = global.boardResetAutosaveInterval = boardResetAutosaveInterval;
  window.conShowVersionHistory = global.conShowVersionHistory = conShowVersionHistory;
  window._conRestoreSession = global._conRestoreSession = _conRestoreSession;
  window.boardUpdateDocumentTitle = global.boardUpdateDocumentTitle = boardUpdateDocumentTitle;
  window.boardRestoreLocalSessionEntry = global.boardRestoreLocalSessionEntry = boardRestoreLocalSessionEntry;
  window.conSessionHasContent = global.conSessionHasContent = conSessionHasContent;
  window.taBuildSessionData = global.taBuildSessionData = taBuildSessionData;
  window.taSessionHasContent = global.taSessionHasContent = taSessionHasContent;
  window.conSaveSessionFolderBundle = global.conSaveSessionFolderBundle = conSaveSessionFolderBundle;
  window.conExportJS = global.conExportJS = conExportJS;
  window._boardScheduleSave = global._boardScheduleSave = _boardScheduleSave;
  window._conBuildBoardCanvas = global._conBuildBoardCanvas = _conBuildBoardCanvas;
  window.conResolveMiniPageSnapshotUrl = global.conResolveMiniPageSnapshotUrl = global.conResolveMiniPageSnapshotUrl || (typeof conResolveMiniPageSnapshotUrl !== 'undefined' ? conResolveMiniPageSnapshotUrl : undefined);
  window.boardAutosaveSection = global.boardAutosaveSection = boardAutosaveSection;
  window.conQueueCurrentPageSnapshotPng = global.conQueueCurrentPageSnapshotPng = conQueueCurrentPageSnapshotPng;
  window.boardAutosaveAllNow = global.boardAutosaveAllNow = boardAutosaveAllNow;
  window.sessionLoadHandleClassGroupChange = global.sessionLoadHandleClassGroupChange = sessionLoadHandleClassGroupChange;
  window._conPageSnapshotPngs = global._conPageSnapshotPngs = global._conPageSnapshotPngs || window._conPageSnapshotPngs;
  window.initBoardSessionAutosave = global.initBoardSessionAutosave = initBoardSessionAutosave;
  window.initBoardCloseUnsavedGuard = global.initBoardCloseUnsavedGuard = initBoardCloseUnsavedGuard;
  window.conPerformAutosaveOnClose = global.conPerformAutosaveOnClose = conPerformAutosaveOnClose;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBoardCloseUnsavedGuard);
    } else {
      initBoardCloseUnsavedGuard();
    }
  }

})(typeof window !== "undefined" ? window : this);

