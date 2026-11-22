    'use strict';

    // ── Constants ──────────────────────────────────────────────────────────────
    var PRESET_COLORS = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
      '#6366f1', '#14b8a6', '#84cc16', '#e11d48'
    ];
    var GS_DEFAULT_THRESHOLDS = {
      '6': 93.33, '5.5': 86.67, '5': 80, '4.5': 73.33, '4': 66.67,
      '3.5': 53.33, '3': 40, '2.5': 26.67, '2': 13.33, '1.5': 6.67, '1': 0
    };
    var GS_DEFAULT_POINTS = {
      '6': 0, '5.5': 0, '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0
    };

    // ── Terms-per-year helpers ─────────────────────────────────────────────────
    function getTermsPerYear() {
      try {
        var c = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
        return Math.max(2, Math.min(4, parseInt(c.termsPerYear, 10) || 2));
      } catch (e) { return 2; }
    }
    function setTermsPerYear(n) {
      try {
        var c = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
        c.termsPerYear = Number(n);
        localStorage.setItem('cmt-general-config', JSON.stringify(c));
      } catch (e) { }
    }
    function buildClassSemCheckboxes() {
      var n = getTermsPerYear();
      var container = document.getElementById('cls-sems-container');
      if (!container) return;
      container.innerHTML = '';
      for (var i = 1; i <= n; i++) {
        var label = document.createElement('label');
        label.className = 'cb-label';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = 'cls-sem' + i;
        cb.checked = true;
        var span = document.createElement('span');
        span.textContent = typeof tFmt === 'function' ? tFmt('pl_classSemNum', { n: i }) : 'Term ' + i;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' '));
        label.appendChild(span);
        container.appendChild(label);
      }
    }
    function onPlannerTermsPerYearChange(val) {
      setTermsPerYear(Number(val) || 2);
      buildClassSemCheckboxes();
    }

    // ── State ──────────────────────────────────────────────────────────────────
    var cfg = { semesters: [], classes: {}, customFields: [], customTypes: [], subscriptions: [] };
    var BUILT_IN_TYPES = ['lesson', 'test', 'assignment', 'holiday', 'no-class'];
    var activeSemId = '';
    var entries = [];
    var plannerPins = [];
    var _legacyMigration = false;
    var classGroups = {};
    var classGroupsMeta = {};
    var partDates = {};
    var boardSessionsByEntryId = {};
    var plannerBoardFilesList = [];
    var _currentSubscribedEvent = null;
    window.PLANNER_SUBSCRIPTION_CACHE = window.PLANNER_SUBSCRIPTION_CACHE || {};
    var plannerKnownClassFiles = window.__plannerKnownClassFiles || {};
    var plannerDeletedClassFiles = window.__plannerDeletedClassFiles || {};
    window.__plannerKnownClassFiles = plannerKnownClassFiles;
    window.__plannerDeletedClassFiles = plannerDeletedClassFiles;
    var filterClasses = new Set();
    var filterUnassigned = false;
    var searchQuery = '';
    var filterTypes = new Set();
    var showPast = false;
    var showOutsideTerm = false;
    var viewMode = 'list';
    var viewAnchorDate = new Date().toISOString().slice(0, 10);
    var tableView = false;
    var editingId = null;
    var editingSemId = null;
    var _editingRecurScope = null; // 'this' | 'all' | 'future' | null
    var _recurScopeAction = null; // 'edit' | 'delete'
    var _recurScopeEntryId = null;
    var activeClsSetup = '';
    var viewOpts = {
      time: true,
      classPill: true,
      badges: true,
      topic: true,
      linkedBadges: true,
      details: false,
      custom: false,
      emptySlots: true,
      holidays: true,
      subscribed: true,
      todos: true,
      weekends: true
    };

    // ── Multi-Select Logic ──────────────────────────────────────────────────────
    var multiSelectMode = false;
    var selectedEntryIds = new Set();

    // ── Drag-to-copy state ──────────────────────────────────────────────────────
    var _dragSourceEntryId = null;
    var _dragPayload = null;
    var _dragTargetEl = null;

    function isEntryEmpty(e) {
      if (!e) return true;
      if (e.type && e.type !== 'lesson') return false;
      if (e.topic && e.topic.trim()) return false;
      if (e.notes && e.notes.trim()) return false;
      if (e.objectives && e.objectives.length) return false;
      if (e.readings && e.readings.trim()) return false;
      if (e.activities && e.activities.trim()) return false;
      if (e.homework && e.homework.trim()) return false;
      if (e.customFields && Object.keys(e.customFields).some(function (k) { return e.customFields[k]; })) return false;
      return true;
    }

    function toggleMultiSelectMode() {
      if (multiSelectMode) {
        exitMultiSelectMode();
      } else {
        multiSelectMode = true;
        selectedEntryIds.clear();
        var msBtn = document.getElementById('multiSelectBtn');
        if (msBtn) {
          msBtn.classList.add('active');
          msBtn.textContent = t('btnCancel');
        }
        var baBtn = document.getElementById('batchActionBtn');
        if (baBtn) {
          baBtn.style.display = 'inline-block';
          baBtn.disabled = true;
        }
        render();
      }
    }

    function exitMultiSelectMode() {
      entries = entries.filter(function (e) {
        if (selectedEntryIds.has(e.id) && isEntryEmpty(e)) {
          return false;
        }
        return true;
      });
      multiSelectMode = false;
      selectedEntryIds.clear();
      var msBtn = document.getElementById('multiSelectBtn');
      if (msBtn) {
        msBtn.classList.remove('active');
        msBtn.textContent = t('pl_btnMultiSelect');
      }
      var baBtn = document.getElementById('batchActionBtn');
      if (baBtn) {
        baBtn.style.display = 'none';
        baBtn.disabled = true;
      }
      render();
    }

    function toggleEntrySelection(entryId) {
      if (!entryId) return;
      if (selectedEntryIds.has(entryId)) {
        selectedEntryIds.delete(entryId);
        var entryIdx = entries.findIndex(function (e) { return e.id === entryId; });
        if (entryIdx !== -1 && isEntryEmpty(entries[entryIdx])) {
          entries.splice(entryIdx, 1);
        }
      } else {
        selectedEntryIds.add(entryId);
      }
      var baBtn = document.getElementById('batchActionBtn');
      if (baBtn) {
        baBtn.disabled = (selectedEntryIds.size === 0);
      }
      render();
    }

    function openBatchActionModal() {
      if (selectedEntryIds.size === 0) return;
      var msgEl = document.getElementById('batch-selected-count-msg');
      if (msgEl) {
        msgEl.textContent = selectedEntryIds.size + ' ' + (selectedEntryIds.size === 1 ? 'entry selected.' : 'entries selected.');
      }
      var actSel = document.getElementById('batch-action-select');
      if (actSel) actSel.value = '';
      onBatchActionSelectChange();
      var clsSel = document.getElementById('batch-new-class');
      if (clsSel) {
        clsSel.innerHTML = '';
        var optNone = document.createElement('option');
        optNone.value = '';
        optNone.textContent = t('pl_unassigned');
        clsSel.appendChild(optNone);
        Object.keys(cfg.classes).forEach(function (cid) {
          var opt = document.createElement('option');
          opt.value = cid;
          opt.textContent = plannerClassDisplayName(cid);
          clsSel.appendChild(opt);
        });
      }
      var lpSel = document.getElementById('batch-select-lesson-plan');
      if (lpSel) {
        lpSel.innerHTML = '';
        if (!plannerLessonPlansList.length) {
          var optEmpty = document.createElement('option');
          optEmpty.value = '';
          optEmpty.textContent = t('pl_noSavedLessonPlans') || '-- No saved lesson plans found --';
          lpSel.appendChild(optEmpty);
        } else {
          var optNone = document.createElement('option');
          optNone.value = '';
          optNone.textContent = '-- ' + (t('pl_linkLessonPlan') || 'Select saved plan') + ' --';
          lpSel.appendChild(optNone);
          plannerLessonPlansList.forEach(function (p) {
            var opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = (p.title || 'Untitled') + ' (' + (plannerClassDisplayName(p.classId) || 'All') + ' | ' + (p.date || '') + ' | ' + (p.totalDuration || 0) + 'm)';
            lpSel.appendChild(opt);
          });
        }
      }
      var bfSel = document.getElementById('batch-select-board-file');
      if (bfSel) {
        bfSel.innerHTML = '';
        if (!plannerBoardFilesList.length) {
          var optBfEmpty = document.createElement('option');
          optBfEmpty.value = '';
          optBfEmpty.textContent = t('pl_noSavedBoardFiles') || '-- No saved Board files found --';
          bfSel.appendChild(optBfEmpty);
        } else {
          var optBfNone = document.createElement('option');
          optBfNone.value = '';
          optBfNone.textContent = '-- ' + (t('pl_linkBoardFile') || 'Select saved Board file') + ' --';
          bfSel.appendChild(optBfNone);
          plannerBoardFilesList.forEach(function (bf) {
            var optBf = document.createElement('option');
            optBf.value = bf.relativePath;
            var clsPart = bf.classGroup ? (plannerClassDisplayName(bf.classGroup) || bf.classGroup) : '';
            var slotCount = Array.isArray(bf.plannerEntryIds) ? bf.plannerEntryIds.length : 0;
            optBf.textContent = (bf.name || bf.filename) + (clsPart ? ' (' + clsPart + ')' : '') + (slotCount > 0 ? ' [' + slotCount + ' slot' + (slotCount > 1 ? 's' : '') + ']' : '');
            bfSel.appendChild(optBf);
          });
        }
      }
      openModal('batchActionModal');
    }

    function onBatchActionSelectChange() {
      var actSel = document.getElementById('batch-action-select');
      var val = actSel ? actSel.value : '';
      document.getElementById('batch-opt-shift').style.display = (val === 'shift_dates' ? 'block' : 'none');
      document.getElementById('batch-opt-class').style.display = (val === 'change_class' ? 'block' : 'none');
      document.getElementById('batch-opt-type').style.display = (val === 'change_type' ? 'block' : 'none');
      var lpOpt = document.getElementById('batch-opt-lesson-plan');
      if (lpOpt) lpOpt.style.display = (val === 'apply_lesson_plan' ? 'block' : 'none');
      var bfOpt = document.getElementById('batch-opt-board-file');
      if (bfOpt) bfOpt.style.display = (val === 'apply_board_file' ? 'block' : 'none');
    }

    async function commitBatchAction() {
      var actSel = document.getElementById('batch-action-select');
      var val = actSel ? actSel.value : '';
      if (!val) return;
      if (val === 'delete') {
        var count = selectedEntryIds.size;
        showConfirm(tFmt('pl_confirmBatchDelete', { n: count }), async function () {
          for (var id of selectedEntryIds) {
            var entry = entries.find(function (e) { return e.id === id; });
            if (entry && entry.gsLink) {
              try {
                await removeTestFromGradeSheet(entry);
              } catch (e) {
                console.error("Failed to remove test from grade sheet for entry " + id, e);
              }
            }
          }
          entries = entries.filter(function (e) {
            return !selectedEntryIds.has(e.id);
          });
          await persistEntries();
          exitMultiSelectMode();
          closeModal('batchActionModal');
          render();
        });
      }
      else if (val === 'shift_dates') {
        var daysInput = document.getElementById('batch-shift-days');
        var days = daysInput ? parseInt(daysInput.value, 10) : 0;
        if (isNaN(days) || days === 0) {
          closeModal('batchActionModal');
          return;
        }
        for (var e of entries) {
          if (selectedEntryIds.has(e.id)) {
            var oldSem = e.date ? getGsSemesterForDate(e.date) : null;
            if (e.date) {
              var d = new Date(e.date + 'T12:00:00');
              d.setDate(d.getDate() + days);
              e.date = d.toISOString().slice(0, 10);
            }
            if (e.dateTo) {
              var dTo = new Date(e.dateTo + 'T12:00:00');
              dTo.setDate(dTo.getDate() + days);
              e.dateTo = dTo.toISOString().slice(0, 10);
            }
            if (e.type === 'test' && e.gsLink) {
              var newSem = getGsSemesterForDate(e.date);
              if (oldSem !== newSem) {
                await removeTestFromGradeSheet(e);
                e.gsLink = null;
                await syncTestToGradeSheet(e, false);
              } else {
                await syncTestToGradeSheet(e, true);
              }
            }
          }
        }
        await persistEntries();
        exitMultiSelectMode();
        closeModal('batchActionModal');
        render();
      }
      else if (val === 'change_class') {
        var classInput = document.getElementById('batch-new-class');
        var newClassId = classInput ? classInput.value : '';
        for (var e of entries) {
          if (selectedEntryIds.has(e.id)) {
            var oldClassId = e.classId;
            e.classId = newClassId;
            if (e.classIds && e.classIds.length) {
              e.classIds = [newClassId];
            }
            if (e.type === 'test' && e.gsLink && oldClassId !== newClassId) {
              await removeTestFromGradeSheet(e);
              e.gsLink = null;
              await syncTestToGradeSheet(e, false);
            }
          }
        }
        await persistEntries();
        exitMultiSelectMode();
        closeModal('batchActionModal');
        render();
      }
      else if (val === 'change_type') {
        var typeInput = document.getElementById('batch-new-type');
        var newType = typeInput ? typeInput.value : 'lesson';
        for (var e of entries) {
          if (selectedEntryIds.has(e.id)) {
            var oldType = e.type;
            e.type = newType;
            if (oldType === 'test' && newType !== 'test' && e.gsLink) {
              await removeTestFromGradeSheet(e);
              e.gsLink = null;
            } else if (oldType !== 'test' && newType === 'test' && !e.gsLink) {
              await syncTestToGradeSheet(e, false);
            }
          }
        }
        await persistEntries();
        exitMultiSelectMode();
        closeModal('batchActionModal');
        render();
      }
      else if (val === 'apply_lesson_plan') {
        var planSelect = document.getElementById('batch-select-lesson-plan');
        var chosenPlanId = planSelect ? planSelect.value : '';
        if (!chosenPlanId) {
          closeModal('batchActionModal');
          return;
        }
        for (var e of entries) {
          if (selectedEntryIds.has(e.id)) {
            e.lessonPlanId = chosenPlanId;
          }
        }
        await persistEntries();
        exitMultiSelectMode();
        closeModal('batchActionModal');
        await loadSavedLessonPlans();
        render();
        showToast(t('saved'));
      }
      else if (val === 'unlink_lesson_plan') {
        for (var e of entries) {
          if (selectedEntryIds.has(e.id)) {
            e.lessonPlanId = null;
          }
        }
        await persistEntries();
        exitMultiSelectMode();
        closeModal('batchActionModal');
        await loadSavedLessonPlans();
        render();
        showToast(t('pl_lessonPlanUnlinked') || 'Lesson plan unlinked');
      }
      else if (val === 'apply_board_file') {
        var bfSelect = document.getElementById('batch-select-board-file');
        var chosenRelPath = bfSelect ? bfSelect.value : '';
        if (!chosenRelPath) {
          closeModal('batchActionModal');
          return;
        }
        var targetSlotIds = Array.from(selectedEntryIds).filter(Boolean);
        if (targetSlotIds.length) {
          await plannerUpdateBoardFileSlotsOnDisk(chosenRelPath, { addIds: targetSlotIds });
        }
        await persistEntries();
        exitMultiSelectMode();
        closeModal('batchActionModal');
        await loadBoardSessions();
        render();
        showToast(t('saved'));
      }
      else if (val === 'unlink_board_file') {
        var unlinkSlotIds = Array.from(selectedEntryIds).filter(Boolean);
        var filesToUpdate = new Set();
        unlinkSlotIds.forEach(function (sid) {
          var sessList = boardSessionsByEntryId[sid] || [];
          sessList.forEach(function (s) {
            if (s && s.relativePath) filesToUpdate.add(s.relativePath);
          });
        });
        for (var relP of filesToUpdate) {
          await plannerUpdateBoardFileSlotsOnDisk(relP, { removeIds: unlinkSlotIds });
        }
        exitMultiSelectMode();
        closeModal('batchActionModal');
        await loadBoardSessions();
        render();
        showToast(t('pl_boardUnlinked') || 'Board file unlinked');
      }
      else if (val === 'duplicate') {
        var newEntries = [];
        for (var e of entries) {
          if (selectedEntryIds.has(e.id)) {
            var newId = uid();
            var copy = Object.assign({}, e, {
              id: newId,
              gsLink: null,
              lessonPlanId: null,
              recurrenceId: undefined,
              recurrenceIndex: undefined,
              recurrenceRule: undefined
            });
            var lpLink = plannerLessonPlanForSlot({ classId: e.classId, date: e.date, time: e.time }, e);
            if (lpLink && lpLink.plan) {
              try {
                var clonedPlan = JSON.parse(JSON.stringify(lpLink.plan));
                var newPlanId = 'lp-' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0') + '-' + Date.now().toString(16);
                clonedPlan.id = newPlanId;
                clonedPlan.plannerEntryId = newId;
                clonedPlan.classId = copy.classId || clonedPlan.classId || '';
                clonedPlan.date = copy.date || clonedPlan.date || '';
                var slug = (clonedPlan.title || 'lesson').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
                var saveFilename = 'lp_' + (clonedPlan.classId || 'general') + '_' + (clonedPlan.date || 'date') + '_' + slug + '_' + newPlanId + '.json';
                clonedPlan._filename = saveFilename;
                clonedPlan._relPath = 'lessons/' + saveFilename;
                if (window.Desktop && Desktop.isElectron()) {
                  if (typeof Desktop.saveJson === 'function') {
                    await Desktop.saveJson('lessons', saveFilename, clonedPlan);
                  } else if (typeof Desktop.saveText === 'function') {
                    await Desktop.saveText('user', 'lessons/' + saveFilename, JSON.stringify(clonedPlan, null, 2));
                  }
                } else {
                  localStorage.setItem('cmt-lesson-' + newPlanId, JSON.stringify(clonedPlan));
                }
                copy.lessonPlanId = newPlanId;
                plannerLessonPlansByEntryId[String(newPlanId)] = clonedPlan;
                plannerLessonPlansByEntryId[String(newId)] = clonedPlan;
              } catch (_) {}
            }
            newEntries.push(copy);
          }
        }
        entries = entries.concat(newEntries);
        await persistEntries();
        exitMultiSelectMode();
        closeModal('batchActionModal');
        await loadSavedLessonPlans();
        render();
      }
    }

    function loadViewOpts() {
      try {
        var raw = localStorage.getItem('cmt-planner-viewopts');
        if (raw) {
          var stored = JSON.parse(raw);
          viewOpts = Object.assign(viewOpts, stored);
          if (stored.showPast !== undefined) showPast = !!stored.showPast;
          if (stored.showOutsideTerm !== undefined) showOutsideTerm = !!stored.showOutsideTerm;
          if (stored.viewMode && ['list', 'day', 'week', 'month', 'year'].indexOf(stored.viewMode) !== -1) {
            viewMode = stored.viewMode;
            tableView = (viewMode === 'week');
          }
          if (stored.filterTypes !== undefined && Array.isArray(stored.filterTypes)) {
            filterTypes = new Set(stored.filterTypes);
          } else if (stored.filterType !== undefined && stored.filterType) {
            filterTypes = new Set([stored.filterType]);
          } else {
            filterTypes = new Set();
          }
        }
      } catch (e) { }
      var voMap = {
        'vo-time': 'time',
        'vo-classPill': 'classPill',
        'vo-badges': 'badges',
        'vo-topic': 'topic',
        'vo-linkedBadges': 'linkedBadges',
        'vo-details': 'details',
        'vo-custom': 'custom',
        'vo-emptySlots': 'emptySlots',
        'vo-holidays': 'holidays',
        'vo-subscribed': 'subscribed',
        'vo-todos': 'todos',
        'vo-weekends': 'weekends'
      };
      Object.keys(voMap).forEach(function (elId) {
        var el = document.getElementById(elId);
        if (el) el.checked = !!viewOpts[voMap[elId]];
      });
      var si = document.getElementById('entry-search-input');
      if (si) si.value = searchQuery;
      rebuildTypeFilterChips();
      syncToggleSeg('pastBtn', showPast ? 'show' : 'hide');
      syncToggleSeg('outsideBtn', showOutsideTerm ? 'all' : 'active');
      syncToggleSeg('viewBtn', viewMode);
    }
    function saveViewFlags() {
      try {
        var raw = localStorage.getItem('cmt-planner-viewopts');
        var stored = raw ? JSON.parse(raw) : {};
        stored.showPast = showPast;
        stored.showOutsideTerm = showOutsideTerm;
        stored.viewMode = viewMode;
        stored.filterUnassigned = filterUnassigned;
        stored.searchQuery = searchQuery;
        stored.filterTypes = Array.from(filterTypes);
        stored.filterType = filterTypes.size === 1 ? Array.from(filterTypes)[0] : '';
        localStorage.setItem('cmt-planner-viewopts', JSON.stringify(stored));
      } catch (e) { }
    }
    function setViewOpt(key, val) {
      viewOpts[key] = !!val;
      try {
        var raw = localStorage.getItem('cmt-planner-viewopts');
        var stored = raw ? JSON.parse(raw) : {};
        stored[key] = !!val;
        localStorage.setItem('cmt-planner-viewopts', JSON.stringify(stored));
      } catch (e) { }
      render();
    }
    function setAutoEnd5Min(val) {
      if (!cfg.reminderSettings) cfg.reminderSettings = {};
      cfg.reminderSettings.autoLessonEnd5Min = !!val;
      persistCfg();
      if (window.Desktop && typeof Desktop.reloadPlannerReminders === 'function') Desktop.reloadPlannerReminders();
    }
    function setSubFutureOnly(val) {
      cfg.subFutureOnly = !!val;
      persistCfg();
      render();
    }

    // ── Toolbar Auto-collapse ──────────────────────────────────────────────────
    var _TOOLBAR_AUTOCOLLAPSE_KEY = 'planner_toolbar_autocollapse';

    function applyToolbarAutoCollapse(enabled) {
      var wrap = document.getElementById('toolbar-wrap');
      var btn = document.getElementById('toolbarAutoCollapseBtn');
      if (wrap) wrap.classList.toggle('autocollapse', !!enabled);
      if (btn) {
        btn.classList.toggle('active', !!enabled);
        btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      }
    }

    function toggleToolbarAutoCollapse(forceState) {
      var wrap = document.getElementById('toolbar-wrap');
      var current = wrap ? wrap.classList.contains('autocollapse') : false;
      var next = typeof forceState === 'boolean' ? forceState : !current;
      applyToolbarAutoCollapse(next);
      try { localStorage.setItem(_TOOLBAR_AUTOCOLLAPSE_KEY, next ? '1' : '0'); } catch (_) { }
    }

    function initToolbarAutoCollapse() {
      var saved = false;
      try { saved = localStorage.getItem(_TOOLBAR_AUTOCOLLAPSE_KEY) === '1'; } catch (_) { }
      applyToolbarAutoCollapse(saved);
    }

    // ── Tutorial ───────────────────────────────────────────────────────────────
    function startPlTutorial() {
      var tbWrap = document.getElementById('toolbar-wrap');
      if (tbWrap && tbWrap.classList.contains('autocollapse')) {
        tbWrap.classList.add('force-open');
      }
      if (!_todoPanelOpen) toggleTodoPanel();
      var labels = { next: t('tutNext'), prev: t('tutPrev'), skip: t('tutSkip'), done: t('tutDone') };
      Tutorial.start([
        { selector: 'button[data-i18n="pl_btnAddSem"]', title: t('tutPl1Title'), text: t('tutPl1Text') },
        { selector: 'button[data-i18n="pl_btnClasses"]', title: t('tutPl2Title'), text: t('tutPl2Text') },
        { selector: '#viewBtn', title: t('tutPlViewTitle'), text: t('tutPlViewText') },
        { selector: '#dispWrap', title: t('tutPlDispTitle'), text: t('tutPlDispText') },
        { selector: '#class-filter-chips', title: t('tutPl3Title'), text: t('tutPl3Text') },
        { selector: 'button[data-i18n="pl_btnAddEntry"]', title: t('tutPl4Title'), text: t('tutPl4Text') },
        { selector: '#main', title: t('tutPl5Title'), text: t('tutPl5Text') },
        { selector: 'button[data-i18n="pl_btnExport"]', title: t('tutPl6Title'), text: t('tutPl6Text') },
        { selector: '#tp-tab-btn', title: t('tutPl7Title'), text: t('tutPl7Text') },
        { selector: '.tp-header', title: t('tutPl8Title'), text: t('tutPl8Text') },
        { selector: '#td-list', title: t('tutPl9Title'), text: t('tutPl9Text') }
      ], labels);
      if (tbWrap && tbWrap.classList.contains('force-open')) {
        var obs = new MutationObserver(function () {
          if (!document.getElementById('tut-overlay')) {
            tbWrap.classList.remove('force-open');
            obs.disconnect();
          }
        });
        obs.observe(document.body, { childList: true });
      }
    }

    function startTodoModalTour() {
      var labels = { next: t('tutNext'), prev: t('tutPrev'), skip: t('tutSkip'), done: t('tutDone') };
      Tutorial.start([
        { selector: '#td-text', title: t('tutPlTd1Title'), text: t('tutPlTd1Text') },
        { selector: '.td-2col', title: t('tutPlTd2Title'), text: t('tutPlTd2Text') },
        { selector: '#td-reminder-wrap', title: t('tutPlTd3Title'), text: t('tutPlTd3Text') },
        { selector: '#td-links-wrap', title: t('tutPlTd4Title'), text: t('tutPlTd4Text') },
        { selector: '#td-subtasks-wrap', title: t('tutPlTd5Title'), text: t('tutPlTd5Text') },
        { selector: '.td-modal-ft', title: t('tutPlTd6Title'), text: t('tutPlTd6Text') }
      ], labels);
    }

    // ── Boot ───────────────────────────────────────────────────────────────────
    var _plannerBooted = false;

    window.addEventListener('DOMContentLoaded', async function () {
      initHamburger('hmWrap');
      applyTranslations();
      window._cmtApplyNavBrand();
      initToolbarAutoCollapse();
      loadViewOpts();
      await loadData();
      render();

      var params = new URLSearchParams(window.location.search);
      var qClassId = params.get('classId');
      if (qClassId && cfg && cfg.classes && cfg.classes[qClassId]) {
        filterClasses.add(qClassId);
        rebuildFilterChips(getPlannerClassIds());
        render();
      }
      var qTodo = params.get('openTodo');
      if (qTodo) {
        localStorage.setItem('cmt-planner-todo', qTodo);
      }
      var qEntryId = params.get('entryId');
      if (qEntryId) {
        var targetEntry = entries.find(function (e) { return e && e.id === qEntryId; });
        if (!targetEntry && window.PLANNER_ENTRIES_BY_CLASS) {
          var allLists = Object.values(window.PLANNER_ENTRIES_BY_CLASS);
          for (var i = 0; i < allLists.length; i++) {
            if (Array.isArray(allLists[i])) {
              var found = allLists[i].find(function (e) { return e && e.id === qEntryId; });
              if (found) { targetEntry = found; break; }
            }
          }
        }
        if (targetEntry && targetEntry.date) {
          localStorage.setItem('cmt-planner-nav', JSON.stringify({
            date: targetEntry.date,
            classId: targetEntry.classId || '',
            time: targetEntry.time || '',
            entryId: targetEntry.id
          }));
        }
      }
      var qDate = params.get('navDate');
      if (qDate && !qEntryId) {
        localStorage.setItem('cmt-planner-nav', JSON.stringify({
          date: qDate,
          classId: params.get('navClassId') || '',
          time: params.get('navTime') || ''
        }));
      }

      navigateToPending();
      navigateToPendingTodo();
      if (qEntryId && params.get('openLinks') === '1') {
        setTimeout(function () { openPlannerEntryLinks(qEntryId); }, 400);
      }
      _plannerBooted = true;

      window.addEventListener('cmt-links-changed', function () {
        if (typeof plannerUpdateEntryLinkBadges === 'function') {
          plannerUpdateEntryLinkBadges();
        }
      });

      // ── Drag-to-copy: set up delegated listeners on #agenda ────────────
      (function initAgendaDragListeners() {
        var agendaEl = document.getElementById('agenda');
        if (!agendaEl || agendaEl._dragCopyBound) return;
        agendaEl._dragCopyBound = true;

        agendaEl.addEventListener('dragstart', function (e) {
          if (multiSelectMode) return;
          var targetEl = e.target;
          var pill = targetEl.closest ? targetEl.closest('.entry-detail-pill') : null;
          var typeBadge = targetEl.closest ? targetEl.closest('.entry-type-badge[draggable="true"]') : null;
          var lpBadge = targetEl.closest ? targetEl.closest('.lesson-plan-badge[draggable="true"]') : null;
          var boardBadge = targetEl.closest ? targetEl.closest('.board-session-badge[draggable="true"]') : null;
          var srcRow = targetEl.closest ? targetEl.closest('.entry-row[data-entry-id], .at-cell[data-entry-id]') : null;

          if (pill) {
            var srcId = pill.getAttribute('data-entry-id') || (srcRow ? srcRow.getAttribute('data-entry-id') : null);
            if (!srcId) { e.preventDefault(); return; }
            _dragSourceEntryId = srcId;
            _dragPayload = {
              type: 'field',
              srcEntryId: srcId,
              fieldType: pill.getAttribute('data-field-type') || 'notes',
              fieldKey: pill.getAttribute('data-field-key') || '',
              fieldVal: pill.getAttribute('data-field-val') || ''
            };
            pill.classList.add('pill-dragging');
          } else if (typeBadge) {
            var srcId = typeBadge.getAttribute('data-entry-id') || (srcRow ? srcRow.getAttribute('data-entry-id') : null);
            if (!srcId) { e.preventDefault(); return; }
            _dragSourceEntryId = srcId;
            _dragPayload = {
              type: 'entry-type',
              srcEntryId: srcId,
              entryType: typeBadge.getAttribute('data-entry-type') || 'lesson'
            };
            typeBadge.classList.add('badge-dragging');
          } else if (lpBadge) {
            var srcId = lpBadge.getAttribute('data-entry-id') || (srcRow ? srcRow.getAttribute('data-entry-id') : null);
            _dragSourceEntryId = srcId || '__lp__';
            _dragPayload = {
              type: 'lesson-plan',
              srcEntryId: srcId,
              planId: lpBadge.getAttribute('data-plan-id')
            };
            lpBadge.classList.add('badge-dragging');
          } else if (boardBadge) {
            var srcId = boardBadge.getAttribute('data-entry-id') || (srcRow ? srcRow.getAttribute('data-entry-id') : null);
            _dragSourceEntryId = srcId || '__board__';
            _dragPayload = {
              type: 'board-session',
              srcEntryId: srcId,
              boardRelPath: boardBadge.getAttribute('data-board-relpath') || '',
              boardName: boardBadge.getAttribute('data-board-name') || ''
            };
            boardBadge.classList.add('badge-dragging');
          } else if (srcRow) {
            _dragSourceEntryId = srcRow.getAttribute('data-entry-id');
            _dragPayload = {
              type: 'entry',
              srcEntryId: _dragSourceEntryId
            };
            srcRow.classList.add('drag-source');
          } else {
            e.preventDefault();
            return;
          }

          e.dataTransfer.effectAllowed = 'copy';
          try {
            e.dataTransfer.setData('text/plain', JSON.stringify(_dragPayload));
          } catch (_) {}
          _clearDragPopover();
        });

        agendaEl.addEventListener('dragend', function (e) {
          _dragSourceEntryId = null;
          _dragPayload = null;
          agendaEl.querySelectorAll('.drag-source').forEach(function (el) { el.classList.remove('drag-source'); });
          agendaEl.querySelectorAll('.drag-over-target').forEach(function (el) { el.classList.remove('drag-over-target'); });
          agendaEl.querySelectorAll('.pill-dragging').forEach(function (el) { el.classList.remove('pill-dragging'); });
          agendaEl.querySelectorAll('.badge-dragging').forEach(function (el) { el.classList.remove('badge-dragging'); });
          _dragTargetEl = null;
        });

        agendaEl.addEventListener('dragover', function (e) {
          if (!_dragPayload || multiSelectMode) return;
          var tgt = e.target && e.target.closest
            ? e.target.closest('.entry-row, .at-cell[data-entry-id], .at-cell-empty[data-date]')
            : null;
          if (!tgt) return;
          if (tgt.getAttribute('data-entry-id') && tgt.getAttribute('data-entry-id') === _dragPayload.srcEntryId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (_dragTargetEl && _dragTargetEl !== tgt) {
            _dragTargetEl.classList.remove('drag-over-target');
          }
          tgt.classList.add('drag-over-target');
          _dragTargetEl = tgt;
        });

        agendaEl.addEventListener('dragleave', function (e) {
          var tgt = e.target && e.target.closest
            ? e.target.closest('.entry-row, .at-cell[data-entry-id], .at-cell-empty[data-date]')
            : null;
          if (!tgt) return;
          if (!tgt.contains(e.relatedTarget)) {
            tgt.classList.remove('drag-over-target');
          }
        });

        agendaEl.addEventListener('drop', function (e) {
          if (!_dragPayload || multiSelectMode) return;
          var tgt = e.target && e.target.closest
            ? e.target.closest('.entry-row, .at-cell[data-entry-id], .at-cell-empty[data-date]')
            : null;
          if (!tgt) return;
          var payload = _dragPayload;
          if (tgt.getAttribute('data-entry-id') && tgt.getAttribute('data-entry-id') === payload.srcEntryId) return;
          e.preventDefault();
          tgt.classList.remove('drag-over-target');
          _dragTargetEl = null;

          var targetEntryId = tgt.getAttribute('data-entry-id') || '';
          if (targetEntryId) {
            _showDragCopyPopover(payload, { entryId: targetEntryId, classId: tgt.getAttribute('data-classid') || '', date: tgt.getAttribute('data-date') || '' }, tgt, e);
          } else {
            var slotInfo = {
              classId: tgt.getAttribute('data-classid') || '',
              date: tgt.getAttribute('data-date') || '',
              time: tgt.getAttribute('data-time') || '',
              timeEnd: tgt.getAttribute('data-timeend') || ''
            };
            _showDragCopyPopover(payload, slotInfo, tgt, e);
          }
        });
      })();
    });

    // When the window is already open and focused from launcher, process any pending nav keys.
    // Guard with _plannerBooted so focus events that fire during the async initial load
    // do not consume the localStorage keys before the DOM is ready.
    window.addEventListener('focus', function () {
      if (!_plannerBooted) return;
      navigateToPending();
      navigateToPendingTodo();
    });

    var _navHighlightNav = null;
    var _navHighlightUntil = 0;

    function navigateToPending() {
      var raw = localStorage.getItem('cmt-planner-nav');
      if (!raw) return;
      localStorage.removeItem('cmt-planner-nav');
      var nav;
      try { nav = JSON.parse(raw); } catch (e) { return; }
      if (!nav || !nav.date) return;
      _navHighlightNav = nav;
      _navHighlightUntil = Date.now() + 5000;
      setTimeout(function () { _navHighlightNav = null; }, 5500);
      _applyNavHighlight(true);
    }

    // Re-apply the nav highlight after any renderAgenda/renderTable call that replaces DOM nodes.
    function _applyNavHighlight(doScroll) {
      if (!_navHighlightNav || Date.now() > _navHighlightUntil) { _navHighlightNav = null; return; }
      var nav = _navHighlightNav;
      var el = null;
      if (nav.entryId) {
        el = document.querySelector('.entry-row[data-entry-id="' + nav.entryId + '"], .at-cell[data-entry-id="' + nav.entryId + '"]');
      }
      if (!el) {
        var sel = '.entry-row[data-date="' + nav.date + '"]';
        if (nav.classId) sel += '[data-classid="' + nav.classId + '"]';
        if (nav.time) sel += '[data-time="' + nav.time + '"]';
        el = document.querySelector(sel);
        if (!el && nav.classId) el = document.querySelector('.entry-row[data-date="' + nav.date + '"][data-classid="' + nav.classId + '"]');
        if (!el) el = document.querySelector('.entry-row[data-date="' + nav.date + '"]');
      }
      if (!el) return;
      var group = el.closest('.week-group, .at-week-block');
      if (group && group.classList.contains('collapsed')) {
        group.classList.remove('collapsed');
      }
      if (doScroll) {
        var mainEl = document.getElementById('main');
        if (mainEl) {
          var mainRect = mainEl.getBoundingClientRect();
          var elRect = el.getBoundingClientRect();
          var target = mainEl.scrollTop + (elRect.top - mainRect.top) - mainEl.clientHeight / 2 + el.offsetHeight / 2;
          mainEl.scrollTop = Math.max(0, target);
        }
      }
      el.classList.remove('entry-focus-blink');
      void el.offsetWidth; // force reflow so animation restarts from the beginning
      el.classList.add('entry-focus-blink');
    }

    function navigateToPendingTodo() {
      var id = localStorage.getItem('cmt-planner-todo');
      if (!id) {
        try {
          var params = new URLSearchParams(window.location.search);
          id = params.get('openTodo') || params.get('todoId');
        } catch (_) {}
      }
      if (!id) return;
      localStorage.removeItem('cmt-planner-todo');
      if (!_todoPanelOpen) toggleTodoPanel();
      openEditTodo(id);
    }

    async function loadData() {
      if (window.__plannerBoot) await window.__plannerBoot;

      if (window.LinksService) {
        try {
          await LinksService.loadRegistry();
        } catch (_) {}
      }

      try {
        if (window.Pins) {
          plannerPins = await Pins.getPins();
        }
      } catch (e) {
        plannerPins = [];
      }

      // CLASS_GROUPS_DATA uses const — accessible as bare global, or on window
      var _cgd = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : (window.CLASS_GROUPS_DATA || null);
      if (_cgd) {
        classGroups = _cgd.classGroups || {};
        classGroupsMeta = _cgd.classGroupsMeta || {};
      }
      if (!classGroups || !Object.keys(classGroups).length) {
        if (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS) classGroups = CLASS_GROUPS;
        else if (window.CLASS_GROUPS) classGroups = window.CLASS_GROUPS;
      }
      if (!classGroupsMeta || !Object.keys(classGroupsMeta).length) {
        if (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) classGroupsMeta = CLASS_GROUPS_META;
        else if (window.CLASS_GROUPS_META) classGroupsMeta = window.CLASS_GROUPS_META;
      }
      window.classGroups = classGroups;
      window.classGroupsMeta = classGroupsMeta;
      window.CLASS_GROUPS = classGroups;
      window.CLASS_GROUPS_META = classGroupsMeta;
      if (_cgd && !window.CLASS_GROUPS_DATA) window.CLASS_GROUPS_DATA = _cgd;
      if (window.PLANNER_CONFIG) {
        var raw = window.PLANNER_CONFIG;
        // Migrate old single-semester format → new multi-semester format
        if (!raw.semesters) {
          cfg.classes = raw.classes || {};
          if (raw.semesterStart || raw.semesterEnd) {
            var sem = makeSem(t('pl_semDefault'));
            sem.semesterStart = raw.semesterStart || '';
            sem.semesterEnd = raw.semesterEnd || '';
            sem.holidays = raw.holidays || [];
            cfg.semesters = [sem];
            activeSemId = sem.id;
          }
        } else {
          cfg = Object.assign(cfg, raw);
          if (!cfg.classes) cfg.classes = {};
          if (!cfg.semesters) cfg.semesters = [];
          if (!cfg.customFields) cfg.customFields = [];
          if (!cfg.customTypes) cfg.customTypes = [];
          if (!cfg.subscriptions) cfg.subscriptions = [];
          if (cfg.semesters.length) activeSemId = cfg.activeSemesterId || cfg.semesters[0].id;
        }
      }
      if (!cfg.subscriptions) cfg.subscriptions = [];
      await loadSubscriptionsCache();
      if ((cfg.subscriptions || []).some(function (s) { return s.enabled !== false && s.autoSync !== false; })) {
        syncAllSubscriptions(true).catch(function () { });
      }
      var _ebcKeys = Object.keys(window.PLANNER_ENTRIES_BY_CLASS || {});
      var _hasClassData = _ebcKeys.some(function (k) { return k !== ''; });
      if (_hasClassData) {
        entries = [];
        _ebcKeys.forEach(function (cid) {
          var arr = window.PLANNER_ENTRIES_BY_CLASS[cid];
          if (Array.isArray(arr)) entries = entries.concat(arr);
        });
      } else if (window.PLANNER_ENTRIES) {
        entries = window.PLANNER_ENTRIES;
        _legacyMigration = true;
        var _unassigned = (window.PLANNER_ENTRIES_BY_CLASS || {})[''];
        if (Array.isArray(_unassigned)) entries = entries.concat(_unassigned);
      } else {
        var _unassigned = (window.PLANNER_ENTRIES_BY_CLASS || {})[''];
        if (Array.isArray(_unassigned)) entries = _unassigned.slice();
      }

      // One-time migration: mark pre-existing planner-only classes as manual:true
      if (!cfg._manualMigrated) {
        Object.keys(cfg.classes).forEach(function (id) {
          if (!classGroupsMeta[id] && !classGroups[id]) cfg.classes[id].manual = true;
        });
        cfg._manualMigrated = true;
        persistCfg();
      }

      populateSelects();
      updateSemToolbar();
      loadPartDates(); // non-blocking
      loadBoardSessions(); // non-blocking
      loadSavedLessonPlans(); // non-blocking

      // Sync auto-end-reminder checkbox from cfg
      var aeEl = document.getElementById('vo-auto-end5');
      if (aeEl) aeEl.checked = !!(cfg.reminderSettings ? cfg.reminderSettings.autoLessonEnd5Min !== false : true);
      var subFutEl = document.getElementById('vo-sub-future');
      if (subFutEl) subFutEl.checked = cfg.subFutureOnly !== false;

      loadTodos();
      validateGradeSheetLinks(); // non-blocking link integrity check

      // Prune orphaned planner entry and to-do pins
      (async function() {
        if (!window.Pins) return;
        var pins = plannerPins;
        var changed = false;
        
        // Planner entries
        if (entries.length) {
          var entryPins = pins.filter(function(p) { return p.type === 'planner-entry'; });
          for (var i = 0; i < entryPins.length; i++) {
            var p = entryPins[i];
            if (!entries.some(function(e) { return e.id === p.entryId; })) {
              await Pins.unpinItem({ type: 'planner-entry', entryId: p.entryId });
              changed = true;
            }
          }
        }
        
        // To-dos
        if (todos.length) {
          var todoPins = pins.filter(function(p) { return p.type === 'todo'; });
          for (var i = 0; i < todoPins.length; i++) {
            var p = todoPins[i];
            if (!todos.some(function(t) { return t.id === p.id; })) {
              await Pins.unpinItem({ type: 'todo', id: p.id });
              changed = true;
            }
          }
        }
        
        if (changed) {
          plannerPins = await Pins.getPins();
          if (typeof plannerUpdatePinButtons === 'function') plannerUpdatePinButtons();
        }
      })();
    }

    function plannerClassIdFromPlannerPath(relPath) {
      var p = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
      if (!p || p.indexOf('planner/') !== 0) return null;
      var base = p.split('/').pop() || '';
      if (!/\.js$/i.test(base)) return null;
      var cid = base.replace(/\.js$/i, '');
      return cid === '__unassigned' ? '' : cid;
    }

    function plannerClassIdFromPlannerFilename(filename) {
      var base = String(filename || '');
      if (!/\.js$/i.test(base)) return null;
      var cid = base.replace(/\.js$/i, '');
      return cid === '__unassigned' ? '' : cid;
    }

    function plannerClassIdFromDeleteEvent(data) {
      if (!data || data.target !== 'user') return null;
      if (data.action === 'delete-by-path') return plannerClassIdFromPlannerPath(data.relativePath);
      if (data.action === 'delete-file' && String(data.subdir || '').replace(/\\/g, '/') === 'planner') {
        return plannerClassIdFromPlannerFilename(data.filename);
      }
      return null;
    }

    function plannerMarkClassFileDeleted(classId) {
      if (classId == null) return;
      var cid = String(classId);
      plannerDeletedClassFiles[cid] = true;
      delete plannerKnownClassFiles[cid];
      if (window.PLANNER_ENTRIES_BY_CLASS && Object.prototype.hasOwnProperty.call(window.PLANNER_ENTRIES_BY_CLASS, cid)) {
        delete window.PLANNER_ENTRIES_BY_CLASS[cid];
      }
      var before = entries.length;
      entries = entries.filter(function (e) { return String(e.classId || '') !== cid; });
      if (before !== entries.length) render();
    }

    async function plannerRefreshDeletedClassFiles() {
      if (!window.Desktop || !Desktop.isElectron()) return;
      var cids = Object.keys(plannerKnownClassFiles || {});
      for (var i = 0; i < cids.length; i++) {
        var cid = cids[i];
        var relPath = 'planner/' + (cid || '__unassigned') + '.js';
        try {
          var st = await Desktop.statByPath('user', relPath);
          if (!st || !st.ok || st.exists !== true) {
            plannerDeletedClassFiles[cid] = true;
            delete plannerKnownClassFiles[cid];
          }
        } catch (_e) {
          plannerDeletedClassFiles[cid] = true;
          delete plannerKnownClassFiles[cid];
        }
      }
    }

    async function loadPartDates() {
      if (!window.Desktop || !Desktop.isElectron()) return;
      var ids = getActiveClassIds();
      if (!ids.length) return;
      var hadDates = false;
      await Promise.all(ids.map(async function (cid) {
        try {
          var r = await Desktop.readText('groupParticipation', cid + '.js');
          if (!r || !r.ok || !r.content) return;
          var dates = new Set(), re = /"id"\s*:\s*"(\d{4}-\d{2}-\d{2})/g, m;
          while ((m = re.exec(r.content)) !== null) dates.add(m[1]);
          if (dates.size > 0) {
            partDates[cid] = dates;
            hadDates = true;
          }
        } catch (e) { }
      }));
      if (hadDates && typeof plannerUpdateParticipationDots === 'function') plannerUpdateParticipationDots();
    }

    var _plannerBoardMetaCache = (function () {
      try {
        return JSON.parse(sessionStorage.getItem('cmt-planner-board-cache') || '{}');
      } catch (e) { return {}; }
    })();

    function _savePlannerBoardMetaCache() {
      try {
        sessionStorage.setItem('cmt-planner-board-cache', JSON.stringify(_plannerBoardMetaCache));
      } catch (e) { }
    }

    // ── In-place DOM Badge Updates (Zero Full Rebuilds) ──────────────────────────
    function _plannerCreateBoardBadge(linkId, sessions) {
      if (!sessions || !sessions.length) return null;
      var _bLatest = sessions.slice().sort(function (a, b) { return b.savedAt - a.savedAt; })[0];
      var _bTitle = t('pl_boardLinked') + (sessions.length > 1 ? ' (' + sessions.length + ')' : '') + ': ' + _bLatest.name + ' (Click to open · Drag to link to another slot)';
      var span = document.createElement('span');
      span.className = 'board-session-badge';
      span.title = _bTitle;
      span.textContent = t('pl_boardOpen');
      if (_bLatest.relativePath) {
        span.setAttribute('draggable', 'true');
        span.setAttribute('data-drag-type', 'board-session');
        span.setAttribute('data-board-relpath', _bLatest.relativePath);
        span.setAttribute('data-board-name', _bLatest.name || '');
        span.setAttribute('data-entry-id', linkId || '');
      }
      span.onclick = function (e) { e.stopPropagation(); openLinkedBoard(linkId); };
      return span;
    }

    function _plannerCreateLessonPlanBadge(linkId, plan, classId, date, entryId, topic) {
      if (!plan) return null;
      var _lpTitle = t('pl_lessonPlanLinked') + ': ' + (plan.title || 'Untitled') + (entryId ? ' (Click to open · Drag to duplicate)' : '');
      var span = document.createElement('span');
      span.className = 'lesson-plan-badge';
      span.title = _lpTitle;
      span.textContent = t('pl_lessonPlanBadge');
      if (entryId) {
        span.setAttribute('draggable', 'true');
        span.setAttribute('data-drag-type', 'lesson-plan');
        span.setAttribute('data-plan-id', plan.id || '');
        span.setAttribute('data-entry-id', entryId);
      }
      span.onclick = function (e) {
        e.stopPropagation();
        openLinkedLessonPlan(plan.id || '', classId || '', date || '', entryId || '', topic || '');
      };
      return span;
    }

    function plannerUpdateLinkedBoardBadges(changedLinkIds) {
      if (!changedLinkIds || !changedLinkIds.size) return;
      // 1. Update Agenda view entries
      var agendaRows = document.querySelectorAll('.entry-row');
      agendaRows.forEach(function (row) {
        var entryId = row.getAttribute('data-entry-id') || '';
        var classId = row.getAttribute('data-classid') || '';
        var date = row.getAttribute('data-date') || '';
        var time = row.getAttribute('data-time') || '';
        var linkId = entryId ? entryId : plannerBoardLinkId({ classId: classId, date: date, time: time }, null);
        if (!linkId || !changedLinkIds.has(linkId)) return;

        var inner = row.querySelector('.entry-inner');
        if (!inner) return;
        var existingBadge = inner.querySelector('.board-session-badge');
        var sessions = boardSessionsByEntryId[linkId];
        if (sessions && sessions.length) {
          var newBadge = _plannerCreateBoardBadge(linkId, sessions);
          if (existingBadge) {
            inner.replaceChild(newBadge, existingBadge);
          } else {
            var actions = inner.querySelector('.entry-actions');
            if (actions) inner.insertBefore(newBadge, actions);
            else inner.appendChild(newBadge);
          }
        } else if (existingBadge) {
          existingBadge.remove();
        }
      });

      // 2. Update Timetable / Matrix view cells
      var cells = document.querySelectorAll('.at-cell, .at-cell-empty');
      cells.forEach(function (cell) {
        var entryId = cell.getAttribute('data-entry-id') || '';
        var classId = cell.getAttribute('data-classid') || '';
        var date = cell.getAttribute('data-date') || '';
        var time = cell.getAttribute('data-time') || '';
        var linkId = entryId ? entryId : plannerBoardLinkId({ classId: classId, date: date, time: time }, null);
        if (!linkId || !changedLinkIds.has(linkId)) return;

        var badgeHost = cell.querySelector('.at-badges-row') || cell;
        var existingBadge = badgeHost.querySelector('.board-session-badge');
        var sessions = boardSessionsByEntryId[linkId];
        if (sessions && sessions.length) {
          var newBadge = _plannerCreateBoardBadge(linkId, sessions);
          if (existingBadge) {
            badgeHost.replaceChild(newBadge, existingBadge);
          } else {
            badgeHost.appendChild(newBadge);
          }
        } else if (existingBadge) {
          existingBadge.remove();
        }
        var cuesEl = cell.querySelector('.at-cues');
        if (cuesEl) {
          var existingCue = cuesEl.querySelector('.at-cue-board');
          if (sessions && sessions.length) {
            if (!existingCue) {
              existingCue = document.createElement('span');
              existingCue.className = 'at-cue at-cue-board';
              existingCue.setAttribute('data-pl-action', 'open-board');
              existingCue.setAttribute('data-pl-linkid', linkId);
              var tagCue = cuesEl.querySelector('.at-cue-tag');
              if (tagCue) cuesEl.insertBefore(existingCue, tagCue);
              else cuesEl.appendChild(existingCue);
            }
            existingCue.title = t('pl_boardLinked');
            existingCue.textContent = 'B' + (sessions.length > 1 ? sessions.length : '');
          } else if (existingCue) {
            existingCue.remove();
          }
        }
      });
    }

    function plannerUpdateLinkedLessonPlanBadges(changedPlanIds, changedSlotKeys) {
      var planSet = changedPlanIds instanceof Set ? changedPlanIds : new Set(changedPlanIds || []);
      var slotSet = changedSlotKeys instanceof Set ? changedSlotKeys : new Set(changedSlotKeys || []);
      if (!planSet.size && !slotSet.size) return;

      // 1. Agenda View
      var agendaRows = document.querySelectorAll('.entry-row');
      agendaRows.forEach(function (row) {
        var entryId = row.getAttribute('data-entry-id') || '';
        var classId = row.getAttribute('data-classid') || '';
        var date = row.getAttribute('data-date') || '';
        var time = row.getAttribute('data-time') || '';
        var slotKey = classId + ':' + date;
        var entry = entryId ? (Array.isArray(entries) ? entries.find(function (e) { return e && e.id === entryId; }) : null) : null;
        var affectsThis = (entryId && planSet.has(entryId)) || slotSet.has(slotKey) || (entry && entry.lessonPlanId && planSet.has(entry.lessonPlanId));
        if (!affectsThis && !planSet.has('__all__')) return;

        var inner = row.querySelector('.entry-inner');
        if (!inner) return;
        var existingBadge = inner.querySelector('.lesson-plan-badge');
        var lpLink = plannerLessonPlanForSlot({ classId: classId, date: date, time: time }, entry);
        if (lpLink && lpLink.plan) {
          var topic = entry && entry.topic ? entry.topic : '';
          var newBadge = _plannerCreateLessonPlanBadge(lpLink.linkId, lpLink.plan, classId, date, entryId, topic);
          if (existingBadge) {
            inner.replaceChild(newBadge, existingBadge);
          } else {
            var boardBadge = inner.querySelector('.board-session-badge');
            var actions = inner.querySelector('.entry-actions');
            if (boardBadge) inner.insertBefore(newBadge, boardBadge);
            else if (actions) inner.insertBefore(newBadge, actions);
            else inner.appendChild(newBadge);
          }
        } else if (existingBadge) {
          existingBadge.remove();
        }
      });

      // 2. Timetable View
      var cells = document.querySelectorAll('.at-cell, .at-cell-empty');
      cells.forEach(function (cell) {
        var entryId = cell.getAttribute('data-entry-id') || '';
        var classId = cell.getAttribute('data-classid') || '';
        var date = cell.getAttribute('data-date') || '';
        var time = cell.getAttribute('data-time') || '';
        var slotKey = classId + ':' + date;
        var entry = entryId ? (Array.isArray(entries) ? entries.find(function (e) { return e && e.id === entryId; }) : null) : null;
        var affectsThis = (entryId && planSet.has(entryId)) || slotSet.has(slotKey) || (entry && entry.lessonPlanId && planSet.has(entry.lessonPlanId));
        if (!affectsThis && !planSet.has('__all__')) return;

        var badgeHost = cell.querySelector('.at-badges-row') || cell;
        var existingBadge = badgeHost.querySelector('.lesson-plan-badge');
        var lpLink = plannerLessonPlanForSlot({ classId: classId, date: date, time: time }, entry);
        if (lpLink && lpLink.plan) {
          var topic = entry && entry.topic ? entry.topic : '';
          var newBadge = _plannerCreateLessonPlanBadge(lpLink.linkId, lpLink.plan, classId, date, entryId, topic);
          if (existingBadge) {
            badgeHost.replaceChild(newBadge, existingBadge);
          } else {
            var boardBadge = badgeHost.querySelector('.board-session-badge');
            if (boardBadge) badgeHost.insertBefore(newBadge, boardBadge);
            else badgeHost.appendChild(newBadge);
          }
        } else if (existingBadge) {
          existingBadge.remove();
        }
        var cuesEl = cell.querySelector('.at-cues');
        if (cuesEl) {
          var existingCue = cuesEl.querySelector('.at-cue-lp');
          if (lpLink && lpLink.plan) {
            if (!existingCue) {
              existingCue = document.createElement('span');
              existingCue.className = 'at-cue at-cue-lp';
              existingCue.setAttribute('data-pl-action', 'open-lp');
              existingCue.textContent = 'LP';
              var refCue = cuesEl.querySelector('.at-cue-board, .at-cue-tag');
              if (refCue) cuesEl.insertBefore(existingCue, refCue);
              else cuesEl.appendChild(existingCue);
            }
            existingCue.setAttribute('data-pl-plan', lpLink.plan.id || '');
            existingCue.setAttribute('data-pl-class', classId || '');
            existingCue.setAttribute('data-pl-date', date || '');
            existingCue.setAttribute('data-pl-entry', entryId || '');
            existingCue.setAttribute('data-pl-topic', (entry && entry.topic) || '');
            existingCue.title = t('pl_lessonPlanLinked') + ': ' + (lpLink.plan.title || 'Untitled');
          } else if (existingCue) {
            existingCue.remove();
          }
        }
      });
    }

    function plannerUpdateParticipationDots() {
      var rows = document.querySelectorAll('.entry-row');
      rows.forEach(function (row) {
        var cid = row.getAttribute('data-classid') || '';
        var dt = row.getAttribute('data-date') || '';
        var inner = row.querySelector('.entry-inner');
        if (!inner) return;
        var existingDot = inner.querySelector('.part-dot');
        var showDot = !!(cid && partDates[cid] && !partDates[cid].has(dt));
        if (showDot) {
          if (!existingDot) {
            var dot = document.createElement('span');
            dot.className = 'part-dot';
            dot.title = t('pl_missingPart');
            var refEl = inner.querySelector('.gs-badge, .lesson-plan-badge, .board-session-badge, .entry-actions');
            if (refEl) inner.insertBefore(dot, refEl);
            else inner.appendChild(dot);
          }
        } else if (existingDot) {
          existingDot.remove();
        }
      });
    }

    function plannerUpdatePinButtons() {
      var rows = document.querySelectorAll('.entry-row[data-entry-id]');
      rows.forEach(function (row) {
        var entryId = row.getAttribute('data-entry-id');
        if (!entryId) return;
        var btn = row.querySelector('.entry-btn[onclick*="toggleEntryPin"]');
        if (!btn) return;
        var isPinned = (plannerPins || []).some(function(p) {
          return p && p.type === 'planner-entry' && p.entryId === entryId;
        });
        btn.classList.toggle('pinned', isPinned);
        btn.title = isPinned ? 'Unpin from sidebar' : 'Pin to sidebar';
        btn.innerHTML = '<img src="../assets/icons/pin.svg" class="btn-icon" width="12" height="12" alt="" />';
      });
      if (typeof renderTodos === 'function') renderTodos();
    }

    function plannerUpdateGradeSheetBadges(changedEntryIds) {
      var idSet = changedEntryIds instanceof Set ? changedEntryIds : new Set(changedEntryIds || []);
      var rows = document.querySelectorAll('.entry-row[data-entry-id]');
      rows.forEach(function (row) {
        var entryId = row.getAttribute('data-entry-id');
        if (!entryId || (!idSet.has('__all__') && idSet.size && !idSet.has(entryId))) return;
        var inner = row.querySelector('.entry-inner');
        if (!inner) return;
        var entry = entries.find(function (e) { return e && e.id === entryId; });
        var existingBadge = inner.querySelector('.gs-badge');
        var linked = isGradeSheetLinked(entry);
        if (linked) {
          if (!existingBadge) {
            var badge = document.createElement('span');
            badge.className = 'gs-badge';
            badge.title = t('pl_gsLinked');
            badge.textContent = 'GS';
            badge.onclick = function (e) { e.stopPropagation(); openLinkedGradeSheet(entryId); };
            var refEl = inner.querySelector('.lesson-plan-badge, .board-session-badge, .entry-actions');
            if (refEl) inner.insertBefore(badge, refEl);
            else inner.appendChild(badge);
          } else {
            existingBadge.onclick = function (e) { e.stopPropagation(); openLinkedGradeSheet(entryId); };
          }
        } else if (existingBadge) {
          existingBadge.remove();
        }
      });

      var cells = document.querySelectorAll('.at-cell[data-entry-id]');
      cells.forEach(function (cell) {
        var entryId = cell.getAttribute('data-entry-id');
        if (!entryId || (!idSet.has('__all__') && idSet.size && !idSet.has(entryId))) return;
        var entry = entries.find(function (e) { return e && e.id === entryId; });
        var badgeHost = cell.querySelector('.at-badges-row') || cell;
        var existingBadge = badgeHost.querySelector('.gs-badge');
        var linked = isGradeSheetLinked(entry);
        if (linked) {
          if (!existingBadge) {
            var badge = document.createElement('span');
            badge.className = 'gs-badge';
            badge.title = t('pl_gsLinked');
            badge.textContent = 'GS';
            badge.onclick = function (e) { e.stopPropagation(); openLinkedGradeSheet(entryId); };
            var refEl = badgeHost.querySelector('.lesson-plan-badge, .board-session-badge');
            if (refEl) badgeHost.insertBefore(badge, refEl);
            else badgeHost.appendChild(badge);
          } else {
            existingBadge.onclick = function (e) { e.stopPropagation(); openLinkedGradeSheet(entryId); };
          }
        } else if (existingBadge) {
          existingBadge.remove();
        }
        var cuesEl = cell.querySelector('.at-cues');
        if (cuesEl) {
          var existingCue = cuesEl.querySelector('.at-cue-gs');
          if (linked) {
            if (!existingCue) {
              existingCue = document.createElement('span');
              existingCue.className = 'at-cue at-cue-gs';
              existingCue.setAttribute('data-pl-action', 'open-gs');
              existingCue.setAttribute('data-pl-entry', entryId);
              existingCue.title = t('pl_gsLinked');
              existingCue.textContent = 'GS';
              var refCue = cuesEl.querySelector('.at-cue-lp, .at-cue-board, .at-cue-tag');
              if (refCue) cuesEl.insertBefore(existingCue, refCue);
              else cuesEl.appendChild(existingCue);
            }
          } else if (existingCue) {
            existingCue.remove();
          }
        }
      });
    }

    function _plannerNormalizeEntryIds() {
      var out = [];
      var seen = new Set();
      function addVal(v) {
        if (Array.isArray(v)) { v.forEach(addVal); return; }
        if (typeof v !== 'string' && typeof v !== 'number') return;
        String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (p) {
          if (!seen.has(p)) { seen.add(p); out.push(p); }
        });
      }
      for (var i = 0; i < arguments.length; i++) addVal(arguments[i]);
      return out;
    }

    async function loadBoardSessions() {
      if (!window.Desktop || !Desktop.isElectron()) return;
      var nextBoardSessionsByEntryId = {};
      var nextBoardFilesList = [];

      function addLinkedBoardSession(linkId, session, dedupe) {
        if (!linkId || !session) return false;
        if (!nextBoardSessionsByEntryId[linkId]) nextBoardSessionsByEntryId[linkId] = [];
        var key = String(dedupe || session.id || '') + '|' + String(session.openKind || 'local');
        var arr = nextBoardSessionsByEntryId[linkId];
        if (arr.some(function (x) { return (String(x._k || '') === key); })) return false;
        var cloned = Object.assign({}, session, { _k: key });
        arr.push(cloned);
        return true;
      }

      function extractPlannerEntryIds(content) {
        var txt = String(content || '');
        var ids = [];
        var arrMatch = txt.match(/"_?plannerEntryIds"\s*:\s*\[([^\]]*)\]/);
        if (arrMatch && arrMatch[1]) {
          var strMatches = arrMatch[1].match(/"([^"]+)"/g) || [];
          strMatches.forEach(function (s) {
            var clean = s.slice(1, -1).trim();
            if (clean) ids.push(clean);
          });
        }
        var m = txt.match(/"_plannerEntryId"\s*:\s*"([^"]*)"/);
        if (!m) m = txt.match(/"plannerEntryId"\s*:\s*"([^"]*)"/);
        if (m && m[1]) ids.push(String(m[1]).trim());
        return _plannerNormalizeEntryIds(ids);
      }

      function isMindmapSessionFile(file) {
        var rel = String((file && (file.relativePath || file.filename)) || '').replace(/\\/g, '/');
        if (rel.toLowerCase().startsWith('templates/')) return false;
        var parts = rel.split('/').filter(Boolean);
        var filename = String((file && file.filename) || (parts.length ? parts[parts.length - 1] : ''));
        if (!filename) return false;
        if (/\.(cstz|zip)$/i.test(filename)) {
          if (rel.indexOf('/history/') !== -1 || rel.startsWith('history/')) return false;
          if (rel.indexOf('/archived/') !== -1 || rel.startsWith('archived/')) return false;
          return true;
        }
        if (parts.length <= 1) return true;
        if (parts.length === 2) {
          var folder = parts[0];
          return filename.replace(/\.(js|json|cstz|zip)$/i, '').toLowerCase() === folder.toLowerCase();
        }
        return false;
      }

      try {
        var r = await Desktop.readJson('user', 'board-sessions-backup.json');
        var store = (r && r.ok && r.data) ? r.data : null;
        if (store) {
          ['constellation', 'textanalysis', 'notes'].forEach(function (section) {
            var list = Array.isArray(store[section]) ? store[section] : [];
            list.forEach(function (e) {
              if (!e || !e.id) return;
              // Constellation links in Planner must be file-backed to avoid reopening stale
              // local backup entries that can recreate deleted files via board silent-save.
              if (section === 'constellation') return;
              var eids = _plannerNormalizeEntryIds(
                e.plannerEntryIds,
                e.plannerEntryId,
                e.data && e.data._plannerEntryIds,
                e.data && e.data.plannerEntryIds,
                e.data && e.data._plannerEntryId,
                e.data && e.data.plannerEntryId
              );
              eids.forEach(function (eid) {
                addLinkedBoardSession(eid, {
                  id: String(e.id),
                  name: String(e.name || ''),
                  section: section,
                  savedAt: Number(e.savedAt) || 0,
                  openKind: 'local'
                }, section + ':' + String(e.id));
              });
            });
          });
        }

        if (typeof Desktop.listByPath === 'function') {
          var filesRes = await Desktop.listByPath('mindmaps', '.', { extensions: ['.js', '.json', '.cstz', '.zip'], recursive: true });
          var files = (filesRes && filesRes.ok && Array.isArray(filesRes.files)) ? filesRes.files : [];
          var candidates = files.filter(isMindmapSessionFile);
          var cacheUpdated = false;

          var BATCH = 8;
          for (var i = 0; i < candidates.length; i += BATCH) {
            var batch = candidates.slice(i, i + BATCH);
            await Promise.all(batch.map(async function (f) {
              var relPath = String((f && (f.relativePath || f.filename)) || '').replace(/\\/g, '/');
              if (!relPath) return;
              var cacheKey = relPath + ':' + (f.mtimeMs || f.size || 0);
              var peids = _plannerNormalizeEntryIds(f.plannerEntryIds, f.plannerEntryId);
              var cGroup = String(f.classGroup || '').trim();

              if (!peids.length && _plannerBoardMetaCache && typeof _plannerBoardMetaCache[cacheKey] === 'string') {
                peids = _plannerNormalizeEntryIds(_plannerBoardMetaCache[cacheKey]);
              } else if (!peids.length) {
                try {
                  var isArchive = relPath.endsWith('.cstz') || relPath.endsWith('.zip');
                  if (isArchive && typeof Desktop.inspectBoardArchive === 'function') {
                    var inspectRes = await Desktop.inspectBoardArchive('mindmaps', relPath);
                    if (inspectRes && inspectRes.ok) {
                      peids = _plannerNormalizeEntryIds(
                        inspectRes.plannerEntryIds,
                        inspectRes.plannerEntryId,
                        inspectRes.manifest && inspectRes.manifest.plannerEntryIds,
                        inspectRes.manifest && inspectRes.manifest.plannerEntryId
                      );
                      if (!cGroup && inspectRes.classGroup) cGroup = inspectRes.classGroup;
                    }
                  } else if (typeof Desktop.readByPath === 'function') {
                    var fileRes = await Desktop.readByPath('mindmaps', relPath);
                    if (fileRes && fileRes.ok && fileRes.content) {
                      peids = extractPlannerEntryIds(fileRes.content);
                    }
                  }
                  _plannerBoardMetaCache[cacheKey] = peids.join(',');
                  cacheUpdated = true;
                } catch (_fileErr) { }
              } else {
                _plannerBoardMetaCache[cacheKey] = peids.join(',');
              }

              var label = String(f.filename || relPath.split('/').pop() || relPath).replace(/\.(js|json|cstz|zip)$/i, '');
              nextBoardFilesList.push({
                id: 'path:' + relPath,
                name: label,
                filename: String(f.filename || relPath.split('/').pop() || ''),
                relativePath: relPath,
                classGroup: cGroup,
                plannerEntryIds: peids,
                savedAt: Number(f.savedAt || f.mtimeMs) || 0
              });

              if (!peids.length) return;
              peids.forEach(function (peid) {
                addLinkedBoardSession(peid, {
                  id: 'path:' + relPath,
                  name: label,
                  section: 'constellation',
                  savedAt: Number(f.mtimeMs) || 0,
                  openKind: 'file',
                  target: 'mindmaps',
                  filename: String(f.filename || relPath.split('/').pop() || ''),
                  relativePath: relPath,
                  plannerEntryIds: peids
                }, 'file:' + relPath);
                if (peid && typeof LinksService !== 'undefined' && typeof LinksService.cascadeLessonCompetencesToBoardAndPlanner === 'function') {
                  var bUrn = LinksService.makeUrn('board', relPath);
                  var pUrn = LinksService.makeUrn('planner', peid);
                  LinksService.cascadeLessonCompetencesToBoardAndPlanner(bUrn, pUrn).catch(function () {});
                }
              });
            }));
          }
          if (cacheUpdated) _savePlannerBoardMetaCache();
        }
      } catch (_) { }

      nextBoardFilesList.sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
      plannerBoardFilesList = nextBoardFilesList;

      // Compute fine-grained diff of changed link IDs
      var allLinkIds = new Set([].concat(Object.keys(boardSessionsByEntryId || {}), Object.keys(nextBoardSessionsByEntryId)));
      var changedLinkIds = new Set();
      allLinkIds.forEach(function (linkId) {
        var prevArr = boardSessionsByEntryId[linkId] || [];
        var nextArr = nextBoardSessionsByEntryId[linkId] || [];
        var prevKeys = prevArr.map(function (x) { return String(x._k || x.id || ''); }).sort().join('::');
        var nextKeys = nextArr.map(function (x) { return String(x._k || x.id || ''); }).sort().join('::');
        if (prevKeys !== nextKeys) {
          changedLinkIds.add(linkId);
        }
      });

      boardSessionsByEntryId = nextBoardSessionsByEntryId;
      if (typeof tdPruneMissingMindmapLinks === 'function') tdPruneMissingMindmapLinks();
      if (changedLinkIds.size > 0) {
        plannerUpdateLinkedBoardBadges(changedLinkIds);
      }
    }

    function openLinkedBoard(entryId) {
      var sessions = boardSessionsByEntryId[entryId];
      if (!sessions || !sessions.length) return;
      var files = sessions.filter(function (x) { return x && x.openKind === 'file' && x.target && x.relativePath; });
      var s = (files.length ? files : sessions).slice().sort(function (a, b) { return b.savedAt - a.savedAt; })[0];
      if (!window.Desktop || !Desktop.isElectron()) return;
      if (s.openKind === 'file' && s.target && s.relativePath) {
        Desktop.openTool('board.html', {
          query: {
            openSession: '1',
            openTarget: s.target,
            openFilename: s.filename || (String(s.relativePath).split('/').pop() || ''),
            openRelPath: s.relativePath
          }
        });
        return;
      }
      Desktop.openTool('board.html', { query: { openLocalSession: '1', openLocalMode: s.section, openLocalEntryId: s.id } });
    }

    function plannerBoardLinkId(slot, entry) {
      if (entry && entry.id) return String(entry.id);
      if (!slot || !slot.classId || !slot.date) return '';
      return 'sched:' + String(slot.classId) + ':' + String(slot.date) + ':' + String(slot.time || '');
    }

    function plannerBoardSessionsForSlot(slot, entry) {
      var linkId = plannerBoardLinkId(slot, entry);
      if (!linkId) return { linkId: '', sessions: null };
      var sessions = boardSessionsByEntryId[linkId];
      return { linkId: linkId, sessions: Array.isArray(sessions) ? sessions : null };
    }

    // ── Lesson Plan Linking & Indexing ──────────────────────────────────────────
    var plannerLessonPlansByEntryId = {};
    var plannerLessonPlansBySlotKey = {};
    var plannerLessonPlansList = [];
    var _plannerLessonPlanMetaCache = {};

    async function loadSavedLessonPlans() {
      if (!window.Desktop || !Desktop.isElectron()) return;
      try {
        var filesRes = await Desktop.listByPath('user', 'lessons', { extensions: ['.json'] });
        var files = (filesRes && filesRes.ok && Array.isArray(filesRes.files)) ? filesRes.files : [];

        var newByEntryId = {};
        var newBySlotKey = {};
        var newList = [];

        var activePaths = new Set();
        var BATCH = 8;
        for (var i = 0; i < files.length; i += BATCH) {
          var batch = files.slice(i, i + BATCH);
          await Promise.all(batch.map(async function (f) {
            var relPath = String((f && (f.relativePath || f.filename)) || '').replace(/\\/g, '/');
            if (!relPath || !relPath.endsWith('.json')) return;
            activePaths.add(relPath);
            var cacheKey = relPath + ':' + (f.mtimeMs || f.size || 0);
            var planData = null;

            if (_plannerLessonPlanMetaCache && _plannerLessonPlanMetaCache[cacheKey]) {
              planData = _plannerLessonPlanMetaCache[cacheKey];
            } else {
              try {
                var readTarget = relPath.startsWith('lessons/') ? relPath : ('lessons/' + relPath);
                var r = await Desktop.readByPath('user', readTarget);
                if (r && r.ok && r.content) {
                  planData = JSON.parse(r.content);
                  if (planData) {
                    planData._relPath = relPath;
                    planData._filename = f.filename || relPath.split('/').pop();
                    _plannerLessonPlanMetaCache[cacheKey] = planData;
                  }
                }
              } catch (_) {}
            }

            if (planData && planData.id) {
              newList.push(planData);
              if (planData.plannerEntryId) {
                newByEntryId[String(planData.plannerEntryId)] = planData;
              }
              newByEntryId[String(planData.id)] = planData;
              if (planData.classId && planData.date) {
                var slotKey = String(planData.classId) + ':' + String(planData.date);
                if (!newBySlotKey[slotKey]) newBySlotKey[slotKey] = [];
                newBySlotKey[slotKey].push(planData);
              }
            }
          }));
        }

        // Evict deleted files from cache
        for (var k in _plannerLessonPlanMetaCache) {
          var pth = k.split(':')[0];
          if (!activePaths.has(pth)) delete _plannerLessonPlanMetaCache[k];
        }

        var prevEntryKeys = Object.keys(plannerLessonPlansByEntryId || {});
        var nextEntryKeys = Object.keys(newByEntryId);
        var changedPlanIds = new Set();
        var changedSlotKeys = new Set();

        var allEids = new Set([].concat(prevEntryKeys, nextEntryKeys));
        allEids.forEach(function (eid) {
          var p1 = plannerLessonPlansByEntryId[eid];
          var p2 = newByEntryId[eid];
          if (!p1 || !p2 || p1.id !== p2.id || p1.title !== p2.title || p1.mtimeMs !== p2.mtimeMs || p1._relPath !== p2._relPath) {
            changedPlanIds.add(eid);
            if (p1 && p1.classId && p1.date) changedSlotKeys.add(p1.classId + ':' + p1.date);
            if (p2 && p2.classId && p2.date) changedSlotKeys.add(p2.classId + ':' + p2.date);
          }
        });

        plannerLessonPlansByEntryId = newByEntryId;
        plannerLessonPlansBySlotKey = newBySlotKey;
        plannerLessonPlansList = newList.sort(function (a, b) {
          return String(b.date || '').localeCompare(String(a.date || '')) || String(a.title || '').localeCompare(String(b.title || ''));
        });

        // Automatically sync lessonPlanId on matching planner entries if not already set
        var entriesModified = false;
        if (Array.isArray(entries)) {
          entries.forEach(function (e) {
            if (!e || e.lessonPlanId === '__unlinked__') return;
            if (!e.lessonPlanId) {
              var lp = plannerLessonPlanForSlot(null, e);
              if (lp && lp.plan && lp.plan.id) {
                e.lessonPlanId = lp.plan.id;
                entriesModified = true;
              }
            }
          });
        }
        if (entriesModified && typeof persistEntries === 'function') {
          persistEntries().catch(function () {});
        }

        if (changedPlanIds.size > 0 || changedSlotKeys.size > 0) {
          plannerUpdateLinkedLessonPlanBadges(changedPlanIds, changedSlotKeys);
        }
      } catch (_) {}
    }

    var _entriesById = Object.create(null);
    function _rebuildEntriesIndex() {
      _entriesById = Object.create(null);
      if (Array.isArray(entries)) {
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          if (e && e.id) _entriesById[e.id] = e;
        }
      }
    }

    function plannerLessonPlanForSlot(slot, entry) {
      if (entry) {
        if (entry.lessonPlanId === '__unlinked__') {
          return { linkId: '', plan: null };
        }
        if (entry.lessonPlanId && plannerLessonPlansByEntryId[String(entry.lessonPlanId)]) {
          return { linkId: String(entry.lessonPlanId), plan: plannerLessonPlansByEntryId[String(entry.lessonPlanId)] };
        }
        if (entry.id && plannerLessonPlansByEntryId[String(entry.id)]) {
          return { linkId: String(entry.id), plan: plannerLessonPlansByEntryId[String(entry.id)] };
        }
        if (entry.classId && entry.date) {
          var list = plannerLessonPlansBySlotKey[String(entry.classId) + ':' + String(entry.date)];
          if (list && list.length) {
            var matchingPlan = list.find(function (p) {
              if (!p.plannerEntryId) return true;
              return p.plannerEntryId === entry.id || !_entriesById[p.plannerEntryId];
            });
            if (matchingPlan) {
              return { linkId: matchingPlan.id, plan: matchingPlan };
            }
          }
        }
        return { linkId: '', plan: null };
      }
      if (slot && slot.classId && slot.date) {
        var list = plannerLessonPlansBySlotKey[String(slot.classId) + ':' + String(slot.date)];
        if (list && list.length) {
          var matchingPlan = list.find(function (p) {
            if (!p.plannerEntryId) return true;
            return !_entriesById[p.plannerEntryId];
          });
          if (matchingPlan) {
            return { linkId: matchingPlan.id, plan: matchingPlan };
          }
        }
      }
      return { linkId: '', plan: null };
    }

    function openLinkedLessonPlan(planId, classId, date, plannerEntryId, topic) {
      if (!window.Desktop || !Desktop.isElectron()) return;
      if (planId) {
        Desktop.openTool('lesson-creator.html', {
          query: { planId: String(planId) }
        });
      } else {
        Desktop.openTool('lesson-creator.html', {
          query: {
            classId: String(classId || ''),
            date: String(date || ''),
            plannerEntryId: String(plannerEntryId || ''),
            title: String(topic || '')
          }
        });
      }
    }

    function openLinkedGradeSheet(entryId) {
      if (!entryId) return;
      var entry = entries.find(function (e) { return e && e.id === entryId; });
      if (!entry && window.PLANNER_ENTRIES_BY_CLASS) {
        var allLists = Object.values(window.PLANNER_ENTRIES_BY_CLASS);
        for (var i = 0; i < allLists.length; i++) {
          if (Array.isArray(allLists[i])) {
            var found = allLists[i].find(function (e) { return e && e.id === entryId; });
            if (found) { entry = found; break; }
          }
        }
      }
      if (!entry) return;

      var clsId = (entry.gsLink && entry.gsLink.classId) || entry.classId || '';
      var clsSlug = (entry.gsLink && entry.gsLink.classSlug) || '';
      var clsName = (typeof plannerClassDisplayName === 'function' ? plannerClassDisplayName(clsId) : '') || '';

      var navPayload = {
        class: clsName || clsSlug || clsId,
        classId: clsId,
        groupId: clsId,
        group: clsId,
        classSlug: clsSlug,
        className: clsName,
        sem: (entry.gsLink && entry.gsLink.semester) || (typeof getGsSemesterForDate === 'function' ? getGsSemesterForDate(entry.date) : 'sem1') || 'sem1',
        testIndex: (entry.gsLink && typeof entry.gsLink.testIndex === 'number') ? String(entry.gsLink.testIndex) : '',
        date: entry.date || '',
        testName: entry.topic || '',
        plannerEntryId: entry.id
      };

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          var ch = new BroadcastChannel('cmt-gradesheet-nav');
          ch.postMessage(navPayload);
          setTimeout(function () { try { ch.close(); } catch (_) {} }, 1000);
        } catch (_) {}
      }

      if (!window.Desktop || !Desktop.isElectron()) {
        var params = new URLSearchParams();
        for (var k in navPayload) {
          if (navPayload.hasOwnProperty(k) && navPayload[k] !== undefined && navPayload[k] !== null && navPayload[k] !== '') {
            params.set(k, String(navPayload[k]));
          }
        }
        var qs = params.toString();
        window.open('grade-sheet.html' + (qs ? '?' + qs : ''), '_blank');
        return;
      }

      Desktop.openTool('grade-sheet.html', { query: navPayload });
    }

    // ── Universal Cross-Tool Linking & Tagging Integration ───────────────────
    function plannerOpenUrn(urn) {
      if (window.LinksService && typeof LinksService.openUrn === 'function') {
        return LinksService.openUrn(urn);
      }
      return false;
    }

    function openPlannerEntryLinks(entryId, event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      var entry = entries.find(function (e) { return e && e.id === entryId; });
      if (!entry && window.PLANNER_ENTRIES_BY_CLASS) {
        var allLists = Object.values(window.PLANNER_ENTRIES_BY_CLASS);
        for (var i = 0; i < allLists.length; i++) {
          if (Array.isArray(allLists[i])) {
            var found = allLists[i].find(function (e) { return e && e.id === entryId; });
            if (found) { entry = found; break; }
          }
        }
      }
      if (!entry) return;

      var urn = 'cmt:planner:' + entry.id;
      var clsName = (typeof plannerClassDisplayName === 'function' ? plannerClassDisplayName(entry.classId) : '') || '';
      if (clsName && window.LinksService && window.LinksService.isUuid && window.LinksService.isUuid(clsName)) {
        clsName = '';
      }
      var typeTxt = (typeof typeLabel === 'function' ? typeLabel(entry.type) : '') || entry.type || 'Lesson';
      var title = (entry.topic || typeTxt) + (clsName ? ' (' + clsName + ')' : '');
      var subtitle = (entry.date || '') + (entry.time ? ' ' + entry.time : '') + (clsName ? ' • ' + clsName : '');

      if (window.TagLinkModal && typeof TagLinkModal.open === 'function') {
        TagLinkModal.open({
          urn: urn,
          title: title,
          subtitle: subtitle,
          classId: entry.classId || null,
          className: clsName || null,
          onUpdate: function () {
            plannerUpdateEntryLinkBadges(new Set([entry.id]));
          }
        });
      }
    }

    function plannerOpenLinksModalFromEntryModal() {
      if (!editingId) return;
      openPlannerEntryLinks(editingId);
    }

    function plannerOpenLinksModalAction() {
      var id = String(_plannerBoardMenuEntryId || '').trim();
      plannerHideBoardEntryMenu();
      if (!id) return;
      openPlannerEntryLinks(id);
    }

    function plannerOpenLinkedDocAction() {
      var btn = document.getElementById('planner-open-doc-menu-btn');
      var urn = btn ? btn._targetUrn : null;
      plannerHideBoardEntryMenu();
      if (urn && window.LinksService) {
        LinksService.openUrn(urn);
      }
    }

    function plannerOpenLinkedFileAction() {
      var btn = document.getElementById('planner-open-file-menu-btn');
      var urn = btn ? btn._targetUrn : null;
      plannerHideBoardEntryMenu();
      if (urn && window.LinksService) {
        LinksService.openUrn(urn);
      }
    }

    function plannerEntryLinkCount(entry) {
      if (!entry || !entry.id || !window.LinksService) return 0;
      var urn = 'cmt:planner:' + entry.id;
      return (LinksService.getLinksForSync(urn) || []).length;
    }

    function buildPlannerEntryLinkBadgesHtml(entry) {
      if (!entry || !entry.id || !window.LinksService) return '';
      var urn = 'cmt:planner:' + entry.id;
      var tags = LinksService.getTagsForSync(urn) || [];

      if (!tags.length) return '';

      var html = '<span class="planner-badges-wrap" data-links-urn="' + esc(urn) + '">';

      // Plain-text Tag Badges (up to 3 tags, then overflow badge)
      var maxTags = 3;
      for (var ti = 0; ti < Math.min(tags.length, maxTags); ti++) {
        var tg = tags[ti];
        html += '<span class="planner-tag-badge" data-pl-action="open-entry-links" data-pl-entry="' + esc(entry.id) + '" title="Tag: ' + esc(tg) + '">[' + esc(tg) + ']</span>';
      }
      if (tags.length > maxTags) {
        html += '<span class="planner-tag-badge" data-pl-action="open-entry-links" data-pl-entry="' + esc(entry.id) + '" title="' + esc(tags.slice(maxTags).join(', ')) + '">[+' + (tags.length - maxTags) + ']</span>';
      }

      html += '</span>';
      return html;
    }

    function plannerUpdateEntryLinkBadges(changedEntryIds) {
      if (!window.LinksService) return;
      var idSet = (changedEntryIds instanceof Set) ? changedEntryIds : (Array.isArray(changedEntryIds) ? new Set(changedEntryIds) : null);

      // Update tag badges wrap
      var rows = document.querySelectorAll('.entry-row[data-entry-id]');
      rows.forEach(function (row) {
        var entryId = row.getAttribute('data-entry-id');
        if (!entryId) return;
        if (idSet && !idSet.has('__all__') && !idSet.has(entryId)) return;
        var inner = row.querySelector('.entry-inner');
        if (!inner) return;
        var entry = entries.find(function (e) { return e && e.id === entryId; });
        if (!entry) return;

        // Update tag badges
        var existingWrap = inner.querySelector('.planner-badges-wrap');
        var newHtml = buildPlannerEntryLinkBadgesHtml(entry);
        if (newHtml) {
          if (existingWrap) {
            existingWrap.outerHTML = newHtml;
          } else {
            var actionsEl = inner.querySelector('.entry-actions');
            if (actionsEl) {
              actionsEl.insertAdjacentHTML('beforebegin', newHtml);
            } else {
              inner.insertAdjacentHTML('beforeend', newHtml);
            }
          }
        } else if (existingWrap) {
          existingWrap.remove();
        }

        // Update link count on the links button
        var linksBtn = row.querySelector('.planner-links-btn');
        if (linksBtn) {
          var count = plannerEntryLinkCount(entry);
          var countEl = linksBtn.querySelector('.planner-links-count');
          if (count > 0) {
            if (countEl) {
              countEl.textContent = count;
            } else {
              linksBtn.insertAdjacentHTML('beforeend', '<span class="planner-links-count">' + count + '</span>');
            }
            linksBtn.classList.add('has-links');
          } else {
            if (countEl) countEl.remove();
            linksBtn.classList.remove('has-links');
          }
        }
      });

      var cells = document.querySelectorAll('.at-cell[data-entry-id]');
      cells.forEach(function (cell) {
        var entryId = cell.getAttribute('data-entry-id');
        if (!entryId) return;
        if (idSet && !idSet.has('__all__') && !idSet.has(entryId)) return;
        var entry = entries.find(function (e) { return e && e.id === entryId; });
        if (!entry) return;

        var badgeHost = cell.querySelector('.at-badges-row') || cell;
        var existingWrap = badgeHost.querySelector('.planner-badges-wrap');
        var newHtml = buildPlannerEntryLinkBadgesHtml(entry);
        if (newHtml) {
          if (existingWrap) {
            existingWrap.outerHTML = newHtml;
          } else {
            badgeHost.insertAdjacentHTML('beforeend', newHtml);
          }
        } else if (existingWrap) {
          existingWrap.remove();
        }
        var cuesEl = cell.querySelector('.at-cues');
        if (cuesEl) {
          var entryTags = LinksService.getTagsForSync('cmt:planner:' + entryId) || [];
          var existingCue = cuesEl.querySelector('.at-cue-tag');
          if (entryTags.length) {
            if (!existingCue) {
              existingCue = document.createElement('span');
              existingCue.className = 'at-cue at-cue-tag';
              existingCue.setAttribute('data-pl-action', 'open-entry-links');
              existingCue.setAttribute('data-pl-entry', entryId);
              cuesEl.appendChild(existingCue);
            }
            existingCue.title = entryTags.join(', ');
            existingCue.textContent = '#' + entryTags.length;
          } else if (existingCue) {
            existingCue.remove();
          }
        }
      });
    }

    async function syncPlannerEntryToLinksService(entry) {
      if (!window.LinksService || !entry || !entry.id) return;
      try {
        var urn = 'cmt:planner:' + entry.id;
        var clsName = (typeof plannerClassDisplayName === 'function' ? plannerClassDisplayName(entry.classId) : '') || '';
        if (clsName && window.LinksService && window.LinksService.isUuid && window.LinksService.isUuid(clsName)) {
          clsName = '';
        }
        var typeTxt = (typeof typeLabel === 'function' ? typeLabel(entry.type) : '') || entry.type || 'Lesson';
        var title = (entry.topic || typeTxt) + (clsName ? ' (' + clsName + ')' : '');
        var subtitle = (entry.date || '') + (entry.time ? ' ' + entry.time : '') + (clsName ? ' • ' + clsName : '');

        await LinksService.registerEntity(urn, {
          title: title,
          subtitle: subtitle,
          type: 'planner',
          target: 'user',
          relativePath: 'planner/' + (entry.classId || '__unassigned') + '.js',
          meta: {
            classId: entry.classId,
            className: clsName,
            date: entry.date,
            time: entry.time,
            timeEnd: entry.timeEnd,
            type: entry.type,
            topic: entry.topic
          }
        });

        if (entry.gsLink && entry.gsLink.classId) {
          var sem = entry.gsLink.semester || 'sem1';
          var testIdx = entry.gsLink.testIndex || 0;
          var evalUrn = 'cmt:eval:' + entry.gsLink.classId + ':' + sem + ':' + testIdx;
          await LinksService.addLink(urn, evalUrn, {
            relation: 'eval',
            meta: { category: 'gradesheet', auto: true }
          });
        }

        if (entry.lessonPlanId && entry.lessonPlanId !== '__unlinked__') {
          var lessonUrn = 'cmt:lesson:' + entry.lessonPlanId;
          await LinksService.addLink(urn, lessonUrn, {
            relation: 'lesson',
            meta: { category: 'lessons', auto: true }
          });
        }
      } catch (err) {
        console.warn('syncPlannerEntryToLinksService error:', err);
      }
    }

    async function cleanPlannerEntryFromLinksService(entryId) {
      if (!window.LinksService || !entryId) return;
      try {
        var urn = 'cmt:planner:' + entryId;
        var links = await LinksService.getLinksFor(urn);
        for (var i = 0; i < links.length; i++) {
          await LinksService.removeLink(urn, links[i].otherUrn);
        }
      } catch (_) {}
    }

    // ── Active-class helpers ───────────────────────────────────────────────────
    function plannerClassDisplayName(id) {
      if (!id) return '';
      // 1. Authoritative: planner's own loaded classGroupsMeta / window.CLASS_GROUPS_META
      if (typeof classGroupsMeta !== 'undefined' && classGroupsMeta && classGroupsMeta[id] && classGroupsMeta[id].name) {
        return classGroupsMeta[id].name;
      }
      if (window.CLASS_GROUPS_META && window.CLASS_GROUPS_META[id] && window.CLASS_GROUPS_META[id].name) {
        return window.CLASS_GROUPS_META[id].name;
      }
      if (window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroupsMeta && window.CLASS_GROUPS_DATA.classGroupsMeta[id] && window.CLASS_GROUPS_DATA.classGroupsMeta[id].name) {
        return window.CLASS_GROUPS_DATA.classGroupsMeta[id].name;
      }
      // 2. Authoritative: planner's own config (cfg.classes)
      if (typeof cfg !== 'undefined' && cfg && cfg.classes && cfg.classes[id] && cfg.classes[id].name) {
        return cfg.classes[id].name;
      }
      // 3. LinksService resolution
      if (window.LinksService && typeof window.LinksService.resolveClassName === 'function') {
        var rName = window.LinksService.resolveClassName(id);
        var isU = (window.LinksService.isUuid ? window.LinksService.isUuid(rName) : (/^(ge-|st-|cls-|class-|uuid:|[0-9a-f]{8}-[0-9a-f]{4})/i.test(rName)));
        if (rName && rName !== id && !isU) return rName;
      }
      // 4. Legacy human-readable class name (if id itself is already the readable name)
      var isIdUuid = (window.LinksService && window.LinksService.isUuid) ? window.LinksService.isUuid(id) : (/^(ge-|st-|cls-|class-|uuid:|[0-9a-f]{8}-[0-9a-f]{4})/i.test(id));
      if (!isIdUuid && typeof classGroups !== 'undefined' && classGroups && classGroups[id]) {
        return id;
      }
      return id;
    }

    function _byDisplayName(a, b) {
      return plannerClassDisplayName(a).localeCompare(plannerClassDisplayName(b));
    }

    function getActiveClassIds() {
      // Filter classes that are archived in Group Editor
      const allIds = Object.keys(classGroupsMeta).length ? Object.keys(classGroupsMeta) : Object.keys(classGroups);
      return allIds.filter(function (id) {
        return !(classGroupsMeta[id] || {}).archived;
      }).sort(_byDisplayName);
    }

    function getPlannerClassIds() {
      var active = getActiveClassIds();
      var plannerOwn = Object.keys(cfg.classes).filter(function (id) {
        return active.indexOf(id) < 0 && cfg.classes[id].manual === true;
      });
      return active.concat(plannerOwn).sort(_byDisplayName);
    }

    function getActiveSem() {
      return cfg.semesters.find(function (s) { return s.id === activeSemId; }) || null;
    }

    function getSemToggleKeyFor(semOrId) {
      var sem = (typeof semOrId === 'string')
        ? (cfg.semesters || []).find(function (s) { return s.id === semOrId; })
        : semOrId;
      if (!sem) return null;

      var termsPerYear = getTermsPerYear();
      var year = sem.year || '';
      var sameYear = (cfg.semesters || []).filter(function (s) { return (s.year || '') === year; });
      var idxInYear = sameYear.findIndex(function (s) { return s.id === sem.id; });
      if (idxInYear < 0) {
        var fallbackIdx = (cfg.semesters || []).findIndex(function (s) { return s.id === sem.id; });
        if (fallbackIdx < 0) return null;
        idxInYear = fallbackIdx;
      }

      return 'sem' + ((idxInYear % termsPerYear) + 1);
    }

    function makeSem(label) {
      return { id: 'sem-' + uid(), label: label || '', semesterStart: '', semesterEnd: '', holidays: [] };
    }

    function getTotalWeeks(sem) {
      if (!sem || !sem.semesterStart || !sem.semesterEnd) return 0;
      var s = new Date(sem.semesterStart + 'T12:00:00');
      var e = new Date(sem.semesterEnd + 'T12:00:00');
      var diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
      return Math.ceil(diffDays / 7);
    }

    function getWeekNumber(dateStr, semStartStr) {
      var d = new Date(dateStr + 'T12:00:00');
      var s = new Date(semStartStr + 'T12:00:00');
      return Math.floor((d - s) / (7 * 24 * 60 * 60 * 1000)) + 1;
    }

    function isPlannerWeekPast(weekNum, sem, lastDate) {
      if (!sem || !sem.semesterStart || weekNum == null) {
        if (lastDate) {
          var todayStr = new Date().toISOString().slice(0, 10);
          return lastDate < todayStr;
        }
        return false;
      }
      var wn = parseInt(weekNum, 10);
      if (isNaN(wn)) return false;
      var semStart = new Date(sem.semesterStart + 'T00:00:00');
      var weekEnd = new Date(semStart.getTime() + wn * 7 * 24 * 60 * 60 * 1000);
      return new Date() >= weekEnd;
    }

    function isPlannerWeekCollapsed(weekNum, isPast) {
      if (weekNum == null) return false;
      var key = (activeSemId || '') + ':' + weekNum;
      if (window._plannerManualWeekCollapse && typeof window._plannerManualWeekCollapse[key] === 'boolean') {
        return window._plannerManualWeekCollapse[key];
      }
      return !!isPast;
    }

    function togglePlannerWeek(headerEl, event) {
      if (event && event.target && event.target.closest('button, a, input, select')) return;
      var group = headerEl.closest('.week-group, .at-week-block');
      if (!group) return;
      var isCollapsed = group.classList.toggle('collapsed');
      var weekAttr = headerEl.getAttribute('data-week');
      if (weekAttr != null && activeSemId) {
        if (!window._plannerManualWeekCollapse) window._plannerManualWeekCollapse = {};
        window._plannerManualWeekCollapse[activeSemId + ':' + weekAttr] = isCollapsed;
      }
    }

    // ── Select population ──────────────────────────────────────────────────────
    function populateSelects() {
      var ids = getPlannerClassIds();
      var expCls = document.getElementById('exp-cls');
      if (expCls) {
        while (expCls.options.length > 2) expCls.remove(2);
        ids.forEach(function (id) { expCls.add(new Option(plannerClassDisplayName(id), id)); });
      }
      document.getElementById('no-cls-msg').style.display = ids.length ? 'none' : '';
      renderClassSetupChips(ids, activeClsSetup);
      rebuildFilterChips(ids);
      renderExportClassChips();
      rebuildTypeFilterChips();
    }

    function rebuildFilterChips(ids) {
      var bar = document.getElementById('class-filter-chips');
      if (!bar) return;
      bar.innerHTML = '';
      var hasAnyClassFilter = filterClasses.size > 0 || filterUnassigned;
      var allChip = document.createElement('span');
      allChip.className = 'cls-chip all-chip' + (!hasAnyClassFilter ? ' active' : '');
      allChip.setAttribute('data-i18n', 'pl_allClasses');
      allChip.textContent = t('pl_allClasses');
      allChip.onclick = clearClassFilter;
      bar.appendChild(allChip);
      var uncChip = document.createElement('span');
      uncChip.className = 'cls-chip' + (filterUnassigned ? ' active' : '');
      uncChip.textContent = t('pl_unassigned');
      uncChip.onclick = toggleUnassignedFilter;
      bar.appendChild(uncChip);
      ids.forEach(function (id) {
        var color = (cfg.classes[id] || {}).color || '#aaa';
        var chip = document.createElement('span');
        chip.className = 'cls-chip' + (filterClasses.has(id) ? ' active' : '');
        chip.style.setProperty('--chip-color', color);
        chip.textContent = plannerClassDisplayName(id);
        chip.onclick = function () { toggleClassFilter(id); };
        bar.appendChild(chip);
      });
    }

    function updateSemToolbar() {
      var bar = document.getElementById('sem-chips');
      if (!bar) return;
      var hasSems = cfg.semesters.length > 0;
      bar.style.display = hasSems ? '' : 'none';
      bar.innerHTML = '';
      if (!hasSems) return;
      var activeWeeks = getTotalWeeks(getActiveSem());

      // Group semesters by year (preserve insertion order within each year)
      var groups = {}, yearOrder = [];
      cfg.semesters.forEach(function (s) {
        var yr = s.year || '';
        if (!groups[yr]) { groups[yr] = []; yearOrder.push(yr); }
        groups[yr].push(s);
      });

      yearOrder.forEach(function (yr, gi) {
        if (yr) {
          var lbl = document.createElement('span');
          lbl.className = 'sem-year-label';
          lbl.textContent = yr;
          bar.appendChild(lbl);
        }
        groups[yr].forEach(function (s) {
          var isActive = s.id === activeSemId;
          var chip = document.createElement('span');
          chip.className = 'sem-chip cls-chip' + (isActive ? ' active' : '');
          var label = s.label || s.id;
          if (isActive && activeWeeks > 0) label += ' · ' + tFmt('pl_weekCount', { n: activeWeeks });
          var labelSpan = document.createElement('span');
          labelSpan.textContent = label;
          labelSpan.onclick = (function (id) { return function () { switchSem(id); }; })(s.id);
          var editSpan = document.createElement('span');
          editSpan.className = 'sem-chip-edit';
          editSpan.textContent = '✎';
          editSpan.onclick = (function (id) { return function (e) { e.stopPropagation(); openSemModal(id); }; })(s.id);
          chip.appendChild(labelSpan);
          chip.appendChild(editSpan);
          bar.appendChild(chip);
        });
        if (gi < yearOrder.length - 1) {
          var sep = document.createElement('span');
          sep.className = 'sem-year-sep';
          bar.appendChild(sep);
        }
      });
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    function render() { renderAgenda(); }

    function updateWeekNav() {
      var listEl = document.getElementById('wn-list');
      if (!listEl) return;
      listEl.innerHTML = '';

      var activeSem = getActiveSem();

      if (viewMode !== 'list') {
        if (!activeSem || !activeSem.semesterStart || !activeSem.semesterEnd) {
          var emptySpan = document.createElement('span');
          emptySpan.className = 'wn-empty';
          emptySpan.textContent = t('pl_noWeeks') || 'No weeks available';
          listEl.appendChild(emptySpan);
          return;
        }
        var totalW = getTotalWeeks(activeSem);
        var semStartD = new Date(activeSem.semesterStart + 'T12:00:00');
        var semStartMon = new Date(semStartD.getTime() - ((semStartD.getDay() + 6) % 7) * 86400000);
        var curWeek = getWeekNumber(viewAnchorDate, activeSem.semesterStart);
        for (var wn = 1; wn <= Math.max(1, totalW); wn++) {
          var wkMon = new Date(semStartMon.getTime() + (wn - 1) * 7 * 86400000);
          var wkDateStr = wkMon.toISOString().slice(0, 10);
          var isPast = isPlannerWeekPast(wn, activeSem, wkDateStr);
          var item = document.createElement('a');
          item.className = 'wn-item' + (isPast ? ' wn-past' : '') + (curWeek === wn ? ' active' : '');
          var wLbl = totalW > 0 ? tFmt('pl_weekLabel', { n: wn, total: totalW }) : ('Week ' + wn);
          item.textContent = wLbl;
          item.title = wLbl;
          item.onclick = (function (ds) {
            return function (e) {
              e.preventDefault();
              viewAnchorDate = ds;
              if (viewMode === 'month' || viewMode === 'year') {
                setViewMode('week');
              } else {
                renderAgenda();
              }
            };
          })(wkDateStr);
          listEl.appendChild(item);
        }
        return;
      }

      var headers = document.querySelectorAll('.week-header, .at-week-title');
      if (!headers.length) {
        var emptySpan2 = document.createElement('span');
        emptySpan2.className = 'wn-empty';
        emptySpan2.textContent = t('pl_noWeeks') || 'No weeks available';
        listEl.appendChild(emptySpan2);
        return;
      }

      headers.forEach(function (hdr, idx) {
        var weekId = hdr.id;
        if (!weekId) {
          weekId = 'week-hdr-' + idx;
          hdr.id = weekId;
        }

        var weekNumAttr = hdr.getAttribute('data-week');
        var isPast = isPlannerWeekPast(weekNumAttr, activeSem);

        if (isPast) {
          hdr.classList.add('week-hdr-past');
        } else {
          hdr.classList.remove('week-hdr-past');
        }

        var item = document.createElement('a');
        item.className = 'wn-item';
        if (isPast) {
          item.classList.add('wn-past');
        }
        var titleSpan = hdr.querySelector('.week-hdr-title');
        var text = titleSpan ? titleSpan.textContent : hdr.textContent;
        item.textContent = text;
        item.title = text;
        item.onclick = function (e) {
          e.preventDefault();
          var group = hdr.closest('.week-group, .at-week-block');
          if (group && group.classList.contains('collapsed')) {
            group.classList.remove('collapsed');
            var weekAttr = hdr.getAttribute('data-week');
            if (weekAttr != null && activeSemId) {
              if (!window._plannerManualWeekCollapse) window._plannerManualWeekCollapse = {};
              window._plannerManualWeekCollapse[activeSemId + ':' + weekAttr] = false;
            }
          }
          hdr.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        listEl.appendChild(item);
      });
    }

    function updateCalNavBar(activeSem) {
      var mainEl = document.getElementById('main');
      if (mainEl) mainEl.classList.toggle('cal-fit-view', viewMode !== 'list');
      var bar = document.getElementById('cal-nav-bar');
      if (!bar) return;
      if (viewMode === 'list') {
        bar.classList.remove('visible');
        return;
      }
      bar.classList.add('visible');
      var titleEl = document.getElementById('cal-nav-title');
      var subEl = document.getElementById('cal-nav-sub');
      var d = new Date(viewAnchorDate + 'T12:00:00');
      if (isNaN(d.getTime())) {
        d = new Date();
        viewAnchorDate = d.toISOString().slice(0, 10);
      }
      var title = '';
      var sub = '';
      if (viewMode === 'day') {
        title = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (activeSem && activeSem.semesterStart) {
          var wn = getWeekNumber(viewAnchorDate, activeSem.semesterStart);
          var tw = getTotalWeeks(activeSem);
          if (wn > 0) sub = tw > 0 ? tFmt('pl_weekLabel', { n: wn, total: tw }) : ('Week ' + wn);
        }
      } else if (viewMode === 'week') {
        var dow = (d.getDay() + 6) % 7;
        var mon = new Date(d.getTime() - dow * 86400000);
        var sun = new Date(mon.getTime() + (viewOpts.weekends ? 6 : 4) * 86400000);
        var mStr = mon.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        var sStr = sun.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        title = mStr + ' – ' + sStr;
        if (activeSem && activeSem.semesterStart) {
          var wn2 = getWeekNumber(mon.toISOString().slice(0, 10), activeSem.semesterStart);
          var tw2 = getTotalWeeks(activeSem);
          if (wn2 > 0) sub = tw2 > 0 ? tFmt('pl_weekLabel', { n: wn2, total: tw2 }) : ('Week ' + wn2);
        }
      } else if (viewMode === 'month') {
        title = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      } else if (viewMode === 'year') {
        title = String(d.getFullYear());
      }
      if (titleEl) titleEl.textContent = title;
      if (subEl) {
        subEl.textContent = sub;
        subEl.style.display = sub ? '' : 'none';
      }
    }

    function renderAgenda() {
      var el = document.getElementById('agenda');

      if (!el._plannerBoardMenuBound) {
        el._plannerBoardMenuBound = true;
        el.addEventListener('contextmenu', function (event) {
          var target = event.target && event.target.closest ? event.target.closest('.entry-row[data-date], .at-cell[data-entry-id], .at-cell-empty[data-date], .month-entry-chip[data-date]') : null;
          if (!target) return;
          var entryId = target.getAttribute('data-entry-id') || '';
          if (entryId) {
            plannerShowBoardEntryMenu(event, entryId, null);
            return;
          }
          plannerShowBoardEntryMenu(event, '', {
            classId: target.getAttribute('data-classid') || '',
            date: target.getAttribute('data-date') || '',
            time: target.getAttribute('data-time') || '',
            timeEnd: target.getAttribute('data-timeend') || ''
          });
        });
      }

      if (!el._calFitResizeObserver && typeof ResizeObserver === 'function') {
        var _calFitRaf = 0;
        el._calFitResizeObserver = new ResizeObserver(function () {
          if (viewMode !== 'day' && viewMode !== 'week') return;
          if (_calFitRaf) cancelAnimationFrame(_calFitRaf);
          _calFitRaf = requestAnimationFrame(function () {
            _calFitRaf = 0;
            fitTimeGridToViewport(el);
          });
        });
        el._calFitResizeObserver.observe(el);
      }

      var activeSem = getActiveSem();
      updateCalNavBar(activeSem);

      if (viewMode === 'day') { renderDayView(el, activeSem); return; }
      if (viewMode === 'week' || tableView) { renderWeekView(el, activeSem); return; }
      if (viewMode === 'month') { renderMonthView(el, activeSem); return; }
      if (viewMode === 'year') { renderYearView(el, activeSem); return; }

      if (!activeSem) {
        el.innerHTML =
          '<div class="empty-state">' +
          '<p class="es-title">' + esc(t('pl_semNotSet')) + '</p>' +
          '<p class="es-hint">' + esc(t('pl_semNotSetHint')) + '</p></div>';
        return;
      }

      var slots = getFilteredViewSlots(activeSem);
      var todosByDate = getTodosByDateMap();
      if (!slots.length) {
        el.innerHTML =
          '<div class="empty-state">' +
          '<p class="es-title">' + esc(t('pl_noEntries')) + '</p>' +
          '<p class="es-hint">' + esc(t('pl_noEntriesHint')) + '</p></div>';
        return;
      }

      // Group by date
      var dates = [], byDate = {};
      slots.forEach(function (s) {
        if (!byDate[s.date]) { dates.push(s.date); byDate[s.date] = []; }
        byDate[s.date].push(s);
      });

      var totalWeeks = getTotalWeeks(activeSem);
      var html = '';
      var prevWeek = null;
      var todayStr = new Date().toISOString().slice(0, 10);
      var _dateLabelCache = Object.create(null);
      var _weekNumCache = Object.create(null);

      function _getDateLabel(dtStr) {
        if (_dateLabelCache[dtStr]) return _dateLabelCache[dtStr];
        var d = new Date(dtStr + 'T12:00:00');
        var lbl = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        _dateLabelCache[dtStr] = lbl;
        return lbl;
      }

      function _getWeekNum(dtStr) {
        if (!activeSem.semesterStart) return null;
        if (_weekNumCache[dtStr] !== undefined) return _weekNumCache[dtStr];
        var wn = getWeekNumber(dtStr, activeSem.semesterStart);
        _weekNumCache[dtStr] = wn;
        return wn;
      }

      dates.forEach(function (date) {
        var weekNum = _getWeekNum(date);
        if (weekNum !== prevWeek) {
          if (prevWeek !== null) html += '</div>'; // close week-group
          prevWeek = weekNum;
          var isPast = isPlannerWeekPast(weekNum, activeSem, date);
          var isCollapsed = isPlannerWeekCollapsed(weekNum, isPast);
          html += '<div class="week-group' + (isCollapsed ? ' collapsed' : '') + (isPast ? ' week-past' : '') + '" data-week="' + (weekNum != null ? weekNum : '') + '">';
          if (weekNum !== null) {
            var weekLabel = totalWeeks > 0 ? tFmt('pl_weekLabel', { n: weekNum, total: totalWeeks }) : ('Week ' + weekNum);
            html += '<div class="week-header' + (isPast ? ' week-hdr-past' : '') + '" id="week-hdr-' + weekNum + '" data-week="' + weekNum + '" data-pl-action="toggle-week">' +
              '<span class="week-hdr-title">' + esc(weekLabel) + '</span>' +
              '</div>';
          }
        }
        var isPastDay = date < todayStr;
        var label = _getDateLabel(date);
        html += '<div class="date-group' + (isPastDay ? ' day-past' : '') + '" data-date="' + esc(date) + '">';
        html += '<div class="date-header' + (isPastDay ? ' day-past' : '') + '"><span class="dh-date">' + esc(label) + '</span><span class="dh-line"></span></div>';
        if (viewOpts.todos && todosByDate[date] && todosByDate[date].length) {
          html += '<div class="date-todos-bar">' + renderTodoCalChipsHtml(todosByDate[date]) + '</div>';
        }
        byDate[date].forEach(function (s) { html += renderSlot(s); });
        html += '</div>';
      });
      if (prevWeek !== null) html += '</div>'; // close last week-group
      el.innerHTML = html;
      _applyNavHighlight(false);
      updateWeekNav();
    }

    function isGradeSheetLinked(entry) {
      return !!(entry && entry.type === 'test' && entry.gsLink);
    }

    function renderSlot(s) {
      if (s.isGlobalHoliday) {
        var hlabel = s.holidayLabel || t('pl_typeHoliday');
        var hhtml = '<div class="holiday-row">' + esc(hlabel);
        if (s.dateTo) {
          var hd1 = new Date(s.date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
          var hd2 = new Date(s.dateTo + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
          hhtml += '<span style="font-weight:500;color:#999;font-size:.85em;margin-left:6px">(' + esc(hd1) + ' – ' + esc(hd2) + ')</span>';
        }
        return hhtml + '</div>';
      }

      var isUnassigned = !s.classId;
      var clsCfg = cfg.classes[s.classId] || {};
      var color = isUnassigned ? '#888' : (clsCfg.color || '#aaa');
      var entry = s.entry;
      var type = entry ? entry.type : null;

      var badgeCls = typeBadgeCls(type);
      var badgeText = typeLabel(type);

      var today = new Date().toISOString().slice(0, 10);
      var isNoclass = type === 'no-class';
      var showDot = !isUnassigned && entry && s.date < today && type !== 'holiday' && type !== 'assignment' && !isNoclass;
      if (showDot) { var pd = partDates[s.classId]; showDot = pd ? !pd.has(s.date) : false; }

      var topicText = entry && entry.topic ? entry.topic : '';
      var topicCls = topicText ? 'entry-topic' : 'entry-topic empty-topic';
      var topicDisp = topicText;

      var isSubscribed = !!(entry && (entry._isSubscribed || String(entry.id || '').startsWith('sub_')));
      var timeLabel = s.time || '';
      if (s.timeEnd) timeLabel += '–' + s.timeEnd;
      var isSelected = entry && selectedEntryIds.has(entry.id);
      var r = '<div class="entry-row' + (isNoclass ? ' entry-noclass' : '') + (isSubscribed ? ' entry-subscribed' : '') + (isSelected ? ' selected' : '') + '" data-date="' + esc(s.date) + '" data-classid="' + esc(s.classId || '') + '" data-time="' + esc(s.time || '') + '" data-timeend="' + esc(s.timeEnd || '') + '"' + (entry ? ' data-entry-id="' + esc(entry.id) + '"' + (isSubscribed ? '' : ' draggable="true"') : '') + ' style="--cls-color:' + color + '" data-pl-action="row-click">';
      r += '<div class="entry-color-bar"></div>';
      if (entry && !isSubscribed) r += '<span class="drag-handle" title="Drag to copy content" draggable="false">&#8942;</span>';
      if (multiSelectMode && entry) {
        r += '<input type="checkbox" class="entry-select-cb" ' + (isSelected ? 'checked' : '') + ' data-pl-action="toggle-select" data-pl-entry="' + esc(entry.id) + '">';
      }
      r += '<div class="entry-content">';
      r += '<div class="entry-inner">';
      if (viewOpts.time && timeLabel)
        r += '<span class="entry-time">' + esc(timeLabel) + '</span>';
      if (viewOpts.classPill) {
        if (!isUnassigned)
          r += '<span class="entry-class-pill" style="background:' + color + '">' + esc(plannerClassDisplayName(s.classId)) + '</span>';
        else
          r += '<span class="entry-class-pill" style="background:#888">' + esc(t('pl_noClass')) + '</span>';
      }
      if (isSubscribed) {
        r += '<span class="sub-feed-badge" title="' + esc(entry.subName || t('pl_subEventBadge')) + '"><img src="../assets/icons/feed.svg" class="sub-badge-icon" style="width:12px; height:12px;" alt="" />' + esc(entry.subName || t('pl_subEventBadge')) + '</span>';
      }
      if (viewOpts.badges && badgeText) {
        var typeDragAttr = (entry && !isSubscribed)
          ? ' draggable="true" data-drag-type="entry-type" data-entry-type="' + esc(type) + '" data-entry-id="' + esc(entry.id) + '" title="Drag to duplicate / set type"'
          : '';
        r += '<span class="entry-type-badge ' + badgeCls + '"' + typeDragAttr + '>' + esc(badgeText) + '</span>';
      }
      if (viewOpts.topic && topicDisp)
        r += '<span class="' + topicCls + '">' + esc(topicDisp) + '</span>';
      if (entry && entry.dateTo && entry.dateTo !== entry.date) {
        var _dtEnd = new Date(entry.dateTo + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        r += '<span class="entry-type-badge" style="background:#f0fdf4;color:#166534;border:1.5px dashed #86efac;font-size:.62rem">→ ' + esc(_dtEnd) + '</span>';
      }
      if (entry && entry.recurrenceId) {
        r += '<span class="recur-badge" title="' + esc(t('pl_recurBadgeTitle')) + '">↻</span>';
      }
      if (showDot) r += '<span class="part-dot" title="' + esc(t('pl_missingPart')) + '"></span>';
      if (viewOpts.linkedBadges) {
        if (isGradeSheetLinked(entry)) r += '<span class="gs-badge" data-pl-action="open-gs" data-pl-entry="' + esc(entry.id) + '" title="' + esc(t('pl_gsLinked')) + '">GS</span>';
        var _lpLink = plannerLessonPlanForSlot(s, entry);
        if (_lpLink && _lpLink.plan) {
          var _lp = _lpLink.plan;
          var _lpTitle = t('pl_lessonPlanLinked') + ': ' + (_lp.title || 'Untitled') + ' (Click to open · Drag to duplicate)';
          var _lpDragAttr = ' draggable="true" data-drag-type="lesson-plan" data-plan-id="' + esc(_lp.id) + '" data-entry-id="' + esc(entry ? entry.id : '') + '"';
          r += '<span class="lesson-plan-badge"' + _lpDragAttr + ' data-pl-action="open-lp" data-pl-plan="' + esc(_lp.id) + '" data-pl-class="' + esc(s.classId || '') + '" data-pl-date="' + esc(s.date || '') + '" data-pl-entry="' + esc(entry ? entry.id : '') + '" data-pl-topic="' + esc(entry && entry.topic ? entry.topic : '') + '" title="' + esc(_lpTitle) + '">' + esc(t('pl_lessonPlanBadge')) + '</span>';
        }
        var _boardLink = plannerBoardSessionsForSlot(s, entry);
        var _bSess = _boardLink.sessions;
        if (_bSess && _bSess.length) {
          var _bLatest = _bSess.slice().sort(function (a, b) { return b.savedAt - a.savedAt; })[0];
          var _bTitle = t('pl_boardLinked') + (_bSess.length > 1 ? ' (' + _bSess.length + ')' : '') + ': ' + _bLatest.name + ' (Click to open · Drag to link to another slot)';
          var _bDragAttr = _bLatest.relativePath ? (' draggable="true" data-drag-type="board-session" data-board-relpath="' + esc(_bLatest.relativePath) + '" data-board-name="' + esc(_bLatest.name || '') + '" data-entry-id="' + esc(_boardLink.linkId) + '"') : '';
          r += '<span class="board-session-badge"' + _bDragAttr + ' data-pl-action="open-board" data-pl-linkid="' + esc(_boardLink.linkId) + '" title="' + esc(_bTitle) + '">' + esc(t('pl_boardOpen')) + '</span>';
        }
        r += buildPlannerEntryLinkBadgesHtml(entry);
      }
      r += '<div class="entry-actions" data-pl-stop="1">';
      if (entry) {
        if (isSubscribed) {
          r += '<button class="entry-btn" data-pl-action="open-sub-event" data-pl-entry="' + esc(entry.id) + '" title="' + esc(t('pl_subEventDetailTitle')) + '"><img src="../assets/icons/eye.svg" class="btn-icon" alt="" /></button>';
        } else {
          var isPinned = plannerPins.some(function(p) {
            return p.type === 'planner-entry' && p.entryId === entry.id;
          });
          var pinTitle = isPinned ? 'Unpin from sidebar' : 'Pin to sidebar';
          var pinIcon = '<img src="../assets/icons/pin.svg" class="btn-icon" width="12" height="12" alt="" />';
          r += '<button class="entry-btn ' + (isPinned ? 'pinned' : '') + '" data-pl-action="toggle-pin" data-pl-entry="' + esc(entry.id) + '" data-pl-class="' + esc(s.classId) + '" data-pl-date="' + esc(s.date) + '" data-pl-time="' + esc(s.time || '') + '" data-pl-timeend="' + esc(s.timeEnd || '') + '" title="' + esc(pinTitle) + '">' + pinIcon + '</button>';
          var _linkCount = plannerEntryLinkCount(entry);
          r += '<button class="entry-btn planner-links-btn' + (_linkCount > 0 ? ' has-links' : '') + '" data-pl-action="open-entry-links" data-pl-entry="' + esc(entry.id) + '" title="' + esc(t('pl_linksAndTags')) + '"><img src="../assets/icons/links.svg" class="btn-icon" width="16" height="16" alt="" />' + (_linkCount > 0 ? '<span class="planner-links-count">' + _linkCount + '</span>' : '') + '</button>';
          r += '<button class="entry-btn" data-pl-action="edit-entry" data-pl-entry="' + esc(entry.id) + '" title="Edit">✏</button>';
        }
      } else
        r += '<button class="entry-btn add-btn" data-pl-action="add-entry" data-pl-class="' + esc(s.classId) +
          '" data-pl-date="' + esc(s.date) + '" data-pl-time="' + esc(s.time || '') + '" data-pl-timeend="' + esc(s.timeEnd || '') + '">+</button>';
      r += '</div></div>';
      // Detail row
      if (entry && (viewOpts.details || viewOpts.custom)) {
        var pillsHtml = '';
        if (viewOpts.details && entry.notes) {
          var noteVal = entry.notes.slice(0, 80);
          pillsHtml += '<span class="entry-detail-pill" draggable="true" data-drag-type="field" data-field-type="notes" data-field-val="' + esc(entry.notes) + '" data-entry-id="' + esc(entry.id) + '" title="Drag to duplicate notes">' +
            '<span class="pill-label">' + esc(t('pl_entryNotes')) + ':</span> <span class="pill-val">' + esc(noteVal) + '</span></span>';
        }
        if (viewOpts.custom && entry.customFields) {
          Object.keys(entry.customFields).forEach(function (k) {
            var val = entry.customFields[k];
            if (val) {
              var valStr = String(val);
              pillsHtml += '<span class="entry-detail-pill" draggable="true" data-drag-type="field" data-field-type="custom" data-field-key="' + esc(k) + '" data-field-val="' + esc(valStr) + '" data-entry-id="' + esc(entry.id) + '" title="Drag to duplicate ' + esc(k) + '">' +
                '<span class="pill-label">' + esc(k) + ':</span> <span class="pill-val">' + esc(valStr.slice(0, 80)) + '</span></span>';
            }
          });
        }
        if (pillsHtml)
          r += '<div class="entry-detail-row" data-pl-stop="1">' + pillsHtml + '</div>';
      }
      r += '</div></div>';
      return r;
    }

    function rowClick(event, classId, date, time, timeEnd, entryId) {
      if (multiSelectMode) {
        if (entryId) {
          toggleEntrySelection(entryId);
        } else {
          var newId = uid();
          var newEntry = {
            id: newId,
            classId: classId || '',
            date: date,
            time: time || '',
            timeEnd: timeEnd || '',
            type: 'lesson',
            topic: ''
          };
          entries.push(newEntry);
          selectedEntryIds.add(newId);
          var baBtn = document.getElementById('batchActionBtn');
          if (baBtn) baBtn.disabled = false;
          render();
        }
        return;
      }
      if (entryId) {
        var _subEv = getSubscribedEntryById(entryId);
        if (_subEv) {
          openSubscribedEventModal(_subEv);
          return;
        }
        openEditEntry(entryId);
      } else {
        openAddEntry(classId, date, time, timeEnd);
      }
    }

    function atCellClick(event, entryId) {
      if (multiSelectMode) {
        if (entryId) toggleEntrySelection(entryId);
        return;
      }
      var _subEv = getSubscribedEntryById(entryId);
      if (_subEv) {
        openSubscribedEventModal(_subEv);
        return;
      }
      openEditEntry(entryId);
    }

    function atCellEmptyClick(event, classId, date, time, timeEnd) {
      if (multiSelectMode) {
        var newId = uid();
        var newEntry = {
          id: newId,
          classId: classId || '',
          date: date,
          time: time || '',
          timeEnd: timeEnd || '',
          type: 'lesson',
          topic: ''
        };
        entries.push(newEntry);
        selectedEntryIds.add(newId);
        var baBtn = document.getElementById('batchActionBtn');
        if (baBtn) baBtn.disabled = false;
        render();
        return;
      }
      openAddEntry(classId, date, time, timeEnd);
    }

    // ── Slot generation ─────────────────────────────────────────────────────────
    function buildSlots(activeSem, forceShowPast) {
      var slots = [];
      if (!activeSem || !activeSem.semesterStart || !activeSem.semesterEnd) return slots;
      var effectiveShowPast = forceShowPast ? true : showPast;

      var start = new Date(activeSem.semesterStart + 'T12:00:00');
      var end = new Date(activeSem.semesterEnd + 'T12:00:00');
      var today = new Date(); today.setHours(12, 0, 0, 0);

      // Build holiday data: holDates blocks individual days; holRanges supplies one collapsed slot each
      var holDates = new Set();
      var holRanges = [];
      (activeSem.holidays || []).forEach(function (h) {
        if (!h.date) return;
        var hStart = new Date(h.date + 'T12:00:00');
        var hEnd = h.dateTo ? new Date(h.dateTo + 'T12:00:00') : hStart;
        var visStart = new Date(Math.max(hStart.getTime(), start.getTime()));
        var visEnd = new Date(Math.min(hEnd.getTime(), end.getTime()));
        if (visStart > visEnd) return;
        // Block every day in the semester-clamped range
        var hd = new Date(visStart);
        while (hd <= visEnd) { holDates.add(hd.toISOString().slice(0, 10)); hd.setDate(hd.getDate() + 1); }
        // First visible day (respects showPast)
        var dispStart = effectiveShowPast ? visStart : new Date(Math.max(visStart.getTime(), today.getTime()));
        if (dispStart > visEnd) return;
        var ds0 = dispStart.toISOString().slice(0, 10);
        var ds1 = visEnd.toISOString().slice(0, 10);
        holRanges.push({
          date: ds0, dateTo: ds1 !== ds0 ? ds1 : null,
          isGlobalHoliday: true, holidayLabel: h.label
        });
      });

      var emap = {}, consumed = {};
      var allCombinedEntries = entries.slice();
      if (viewOpts.subscribed !== false) {
        var subEvents = getActiveSubscribedEntries();
        subEvents.forEach(function (se) { allCombinedEntries.push(se); });
      }
      allCombinedEntries.forEach(function (e) {
        var cids = entryClassIds(e);
        var dates = expandEntryDates(e);
        if (!cids.length) {
          dates.forEach(function (ds) {
            var k = ds + '|__' + e.id;
            if (!emap[k]) emap[k] = [];
            emap[k].push(e);
          });
        } else {
          dates.forEach(function (ds) {
            cids.forEach(function (cid) {
              var k = ds + '|' + cid;
              if (!emap[k]) emap[k] = [];
              emap[k].push(e);
            });
          });
        }
      });

      _rebuildEntriesIndex();

      var classIds = Object.keys(cfg.classes);
      var hasAnyClassFilter = filterClasses.size > 0 || filterUnassigned;
      if (hasAnyClassFilter) classIds = classIds.filter(function (id) { return filterClasses.has(id); });
      // Hide archived classes from agenda
      classIds = classIds.filter(function (id) { return !(classGroupsMeta[id] || {}).archived; });
      // Hide classes not active in the current term
      var semKey = getSemToggleKeyFor(activeSem);
      if (semKey) {
        classIds = classIds.filter(function (id) {
          var sems = (cfg.classes[id] || {}).semesters;
          return !sems || sems[semKey] !== false;
        });
      }

      // Pre-index schedules per class and day-of-week: [cid][dow] -> array of slots
      var classSchedByDow = {};
      classIds.forEach(function (cid) {
        classSchedByDow[cid] = {};
        var sched = (cfg.classes[cid] || {}).schedule || [];
        for (var d_idx = 0; d_idx < 7; d_idx++) {
          classSchedByDow[cid][d_idx] = sched.filter(function (s) { return parseInt(s.day) === d_idx; });
        }
      });

      var d = new Date(start);
      while (d <= end) {
        var ds = d.toISOString().slice(0, 10);
        var dow = d.getDay();

        if (!effectiveShowPast && d < today) { d.setDate(d.getDate() + 1); continue; }

        if (holDates.has(ds)) { d.setDate(d.getDate() + 1); continue; }

        classIds.forEach(function (cid) {
          var todaySlots = classSchedByDow[cid] ? classSchedByDow[cid][dow] : null;
          if (todaySlots && todaySlots.length > 0) {
            var k = ds + '|' + cid;
            consumed[k] = true;
            var dayEntries = emap[k] || [];
            var matchedEntries = new Set();

            todaySlots.forEach(function (s) {
              // 1. Match by exact time first
              var matches = dayEntries.filter(function (e) {
                return !matchedEntries.has(e.id) && e.time === s.time;
              });
              if (matches.length > 0) {
                matches.forEach(function (e) {
                  matchedEntries.add(e.id);
                  slots.push({
                    date: ds,
                    classId: cid,
                    time: e.time || s.time,
                    timeEnd: e.timeEnd || s.timeEnd || '',
                    entry: e,
                    isGlobalHoliday: false
                  });
                });
              } else {
                // 2. Try matching a leftover entry that has no time
                var noTimeMatch = dayEntries.find(function (e) {
                  return !matchedEntries.has(e.id) && !e.time;
                });
                if (noTimeMatch) {
                  matchedEntries.add(noTimeMatch.id);
                  slots.push({
                    date: ds,
                    classId: cid,
                    time: s.time,
                    timeEnd: s.timeEnd || '',
                    entry: noTimeMatch,
                    isGlobalHoliday: false
                  });
                } else {
                  // No entry matched this slot
                  slots.push({
                    date: ds,
                    classId: cid,
                    time: s.time,
                    timeEnd: s.timeEnd || '',
                    entry: null,
                    isGlobalHoliday: false
                  });
                }
              }
            });

            // 3. Push any leftover entries (unscheduled times) for this class
            dayEntries.forEach(function (e) {
              if (!matchedEntries.has(e.id)) {
                slots.push({
                  date: ds,
                  classId: cid,
                  time: e.time || '',
                  timeEnd: e.timeEnd || '',
                  entry: e,
                  isGlobalHoliday: false
                });
              }
            });
          }
        });

        d.setDate(d.getDate() + 1);
      }

      // Inject collapsed holiday slots
      holRanges.forEach(function (hr) { slots.push(hr); });

      // Compute semester-slot key for orphan filtering (same logic as main loop)
      var activeSemKey = getSemToggleKeyFor(activeSem);

      // Orphan entries (clamped to semester range; excluded from holiday dates)
      allCombinedEntries.forEach(function (e) {
        var cids = entryClassIds(e);
        var dates = expandEntryDates(e);
        var hasAnyClassFilter = filterClasses.size > 0 || filterUnassigned;
        if (!cids.length) {
          if (hasAnyClassFilter && !filterUnassigned) return;
          dates.forEach(function (ds) {
            var k = ds + '|__' + e.id;
            if (consumed[k]) return;
            if (!showOutsideTerm && (ds < activeSem.semesterStart || ds > activeSem.semesterEnd)) return;
            if (holDates.has(ds)) return;
            var ed = new Date(ds + 'T12:00:00');
            if (!showPast && ed < today) return;
            slots.push({ date: ds, classId: '', time: e.time || '', timeEnd: e.timeEnd || '', entry: e, isGlobalHoliday: false });
            consumed[k] = true;
          });
        } else {
          dates.forEach(function (ds) {
            cids.forEach(function (cid) {
              var k = ds + '|' + cid;
              if (consumed[k]) return;
              if (hasAnyClassFilter && !filterClasses.has(cid)) return;
              if ((classGroupsMeta[cid] || {}).archived) return;
              if (activeSemKey) {
                var sems = (cfg.classes[cid] || {}).semesters;
                if (sems && sems[activeSemKey] === false) return;
              }
              if (!showOutsideTerm && (ds < activeSem.semesterStart || ds > activeSem.semesterEnd)) return;
              if (holDates.has(ds)) return;
              var ed = new Date(ds + 'T12:00:00');
              if (!showPast && ed < today) return;
              var arr = emap[k] || [e];
              arr.forEach(function (ent) {
                slots.push({ date: ds, classId: cid, time: ent.time || '', timeEnd: ent.timeEnd || '', entry: ent, isGlobalHoliday: false });
              });
              consumed[k] = true;
            });
          });
        }
      });

      slots.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        if (a.isGlobalHoliday !== b.isGlobalHoliday) return a.isGlobalHoliday ? -1 : 1;
        return (a.time || '') < (b.time || '') ? -1 : 1;
      });
      return slots;
    }

    // ── Semester modal ─────────────────────────────────────────────────────────
    function openSemModal(semId) {
      editingSemId = semId;
      var isEdit = semId != null;
      var sem = isEdit ? cfg.semesters.find(function (s) { return s.id === semId; }) : null;

      document.getElementById('sem-modal-title').textContent =
        isEdit ? t('pl_editSemTitle') : t('pl_addSemTitle');
      document.getElementById('del-sem-btn').style.display = isEdit ? '' : 'none';
      document.getElementById('sem-label').value = sem ? (sem.label || '') : '';
      document.getElementById('sem-start').value = sem ? (sem.semesterStart || '') : '';
      document.getElementById('sem-end').value = sem ? (sem.semesterEnd || '') : '';

      var list = document.getElementById('hol-list');
      list.innerHTML = '';
      (sem ? sem.holidays : []).forEach(function (h) { list.appendChild(makeHolRow(h.date, h.dateTo || '', h.label)); });

      // Show Group Editor date hint only when creating (not editing)
      var cgd = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : (window.CLASS_GROUPS_DATA || null);
      document.getElementById('sem-year').value = sem ? (sem.year || '') : ((cgd && cgd.activeYear && PL_YEAR_RE.test(cgd.activeYear)) ? cgd.activeYear : '');
      var cgdStart = cgd && cgd.activeSemesterStart;
      var cgdEnd = cgd && cgd.activeSemesterEnd;
      var hintEl = document.getElementById('pl-cgd-hint');
      if (!isEdit && hintEl && (cgdStart || cgdEnd)) {
        document.getElementById('pl-cgd-hint-text').textContent =
          tFmt('pl_useGroupDatesHint', { start: cgdStart || '?', end: cgdEnd || '?' });
        hintEl.style.display = 'flex';
      } else if (hintEl) {
        hintEl.style.display = 'none';
      }

      openModal('semModal');
    }

    function fillDatesFromGroupEditor() {
      var cgd = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : (window.CLASS_GROUPS_DATA || null);
      if (!cgd) return;
      if (cgd.activeSemesterStart) document.getElementById('sem-start').value = cgd.activeSemesterStart;
      if (cgd.activeSemesterEnd) document.getElementById('sem-end').value = cgd.activeSemesterEnd;
      document.getElementById('pl-cgd-hint').style.display = 'none';
    }

    function makeHolRow(date, dateTo, label) {
      var div = document.createElement('div');
      div.className = 'hol-item';
      div.innerHTML =
        '<input type="date" class="field-input hol-date" value="' + esc(date) + '">' +
        '<span class="range-sep">–</span>' +
        '<input type="date" class="field-input hol-date-end" value="' + esc(dateTo || '') + '">' +
        '<input type="text" class="field-input hol-label" value="' + esc(label || '') +
        '" placeholder="' + esc(t('pl_holidayLabelPlaceholder')) + '">' +
        '<button class="rm-btn" data-pl-rm=".hol-item"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>';
      return div;
    }
    function addHolRow() { document.getElementById('hol-list').appendChild(makeHolRow('', '', '')); }

    function saveSemModal() {
      var label = document.getElementById('sem-label').value.trim();
      var year = document.getElementById('sem-year').value.trim();
      var start = document.getElementById('sem-start').value;
      var end = document.getElementById('sem-end').value;
      if (!PL_YEAR_RE.test(year)) { showToast(t('cpToastInvalidYear')); document.getElementById('sem-year').focus(); return; }
      var hols = [];
      document.querySelectorAll('#hol-list .hol-item').forEach(function (item) {
        var d = item.querySelector('.hol-date').value;
        var d2 = item.querySelector('.hol-date-end').value;
        var l = item.querySelector('.hol-label').value.trim();
        if (d) hols.push({ date: d, dateTo: d2 || d, label: l });
      });

      if (editingSemId) {
        var sem = cfg.semesters.find(function (s) { return s.id === editingSemId; });
        if (sem) { sem.label = label; sem.year = year; sem.semesterStart = start; sem.semesterEnd = end; sem.holidays = hols; }
      } else {
        var newSem = makeSem(label || t('pl_semDefault'));
        newSem.year = year; newSem.semesterStart = start; newSem.semesterEnd = end; newSem.holidays = hols;
        cfg.semesters.push(newSem);
        activeSemId = newSem.id;
      }
      cfg.activeSemesterId = activeSemId;
      persistCfg();
      closeModal('semModal');
      updateSemToolbar();
      render();
    }

    function deleteActiveSem() {
      if (!editingSemId) return;
      showConfirm(t('pl_confirmDeleteSem'), function () {
        cfg.semesters = cfg.semesters.filter(function (s) { return s.id !== editingSemId; });
        if (activeSemId === editingSemId)
          activeSemId = cfg.semesters.length ? cfg.semesters[0].id : '';
        cfg.activeSemesterId = activeSemId;
        persistCfg();
        closeModal('semModal');
        updateSemToolbar();
        render();
      });
    }

    function switchSem(id) {
      activeSemId = id;
      cfg.activeSemesterId = id;
      window._plannerManualWeekCollapse = {};
      persistCfg();
      updateSemToolbar();
      render();
    }

    // ── Custom fields modal ────────────────────────────────────────────────────
    function openFieldsModal() {
      var fList = document.getElementById('fields-list');
      fList.innerHTML = '';
      (cfg.customFields || []).forEach(function (name) { addCustomFieldRow(name); });
      var tList = document.getElementById('types-list');
      tList.innerHTML = '';
      (cfg.customTypes || []).forEach(function (name) { addCustomTypeRow(name); });
      openModal('fieldsModal');
    }
    function addCustomFieldRow(name) {
      var div = document.createElement('div'); div.className = 'obj-item';
      div.innerHTML = '<input type="text" class="field-input" value="' + esc(name || '') +
        '" placeholder="' + esc(t('pl_customFieldNamePlaceholder')) + '">' +
        '<button class="rm-btn" data-pl-rm=".obj-item"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>';
      document.getElementById('fields-list').appendChild(div);
    }
    function addCustomTypeRow(name) {
      var div = document.createElement('div'); div.className = 'obj-item';
      div.innerHTML = '<input type="text" class="field-input" value="' + esc(name || '') +
        '" placeholder="' + esc(t('pl_customTypeNamePlaceholder')) + '">' +
        '<button class="rm-btn" data-pl-rm=".obj-item"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>';
      document.getElementById('types-list').appendChild(div);
    }
    function saveCustomFields() {
      var names = [];
      document.querySelectorAll('#fields-list .obj-item input').forEach(function (inp) {
        var v = inp.value.trim(); if (v) names.push(v);
      });
      var types = [];
      document.querySelectorAll('#types-list .obj-item input').forEach(function (inp) {
        var v = inp.value.trim(); if (v) types.push(v);
      });
      cfg.customFields = names;
      cfg.customTypes = types;
      persistCfg();
      rebuildTypeFilterChips();
      closeModal('fieldsModal');
    }

    // ── Search & Filter helpers ─────────────────────────────────────────────
    var _searchDebounceTimer = null;
    function onSearchInput(val) {
      searchQuery = val || '';
      saveViewFlags();
      if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
      _searchDebounceTimer = setTimeout(function () {
        render();
      }, 120);
    }

    function rebuildTypeFilterChips() {
      var bar = document.getElementById('type-filter-chips');
      if (!bar) return;
      bar.innerHTML = '';

      var allChip = document.createElement('span');
      allChip.className = 'cls-chip all-chip' + (filterTypes.size === 0 ? ' active' : '');
      allChip.setAttribute('data-i18n', 'pl_allTypes');
      allChip.textContent = t('pl_allTypes') || 'All types';
      allChip.onclick = clearTypeFilter;
      bar.appendChild(allChip);

      var builtIns = [
        { id: 'lesson', label: t('pl_typeLesson') || 'Lesson', color: '#3b82f6' },
        { id: 'test', label: t('pl_typeTest') || 'Test', color: '#ef4444' },
        { id: 'assignment', label: t('pl_typeAssignment') || 'Assignment Due', color: '#f59e0b' },
        { id: 'holiday', label: t('pl_typeHoliday') || 'Holiday', color: '#10b981' },
        { id: 'no-class', label: t('pl_typeNoclass') || 'No Class', color: '#6b7280' }
      ];

      builtIns.forEach(function (bt) {
        var chip = document.createElement('span');
        chip.className = 'cls-chip' + (filterTypes.has(bt.id) ? ' active' : '');
        chip.style.setProperty('--chip-color', bt.color);
        chip.textContent = bt.label;
        chip.onclick = function () { toggleTypeFilter(bt.id); };
        bar.appendChild(chip);
      });

      (cfg.customTypes || []).forEach(function (name) {
        var chip = document.createElement('span');
        chip.className = 'cls-chip' + (filterTypes.has(name) ? ' active' : '');
        chip.style.setProperty('--chip-color', '#8b5cf6');
        chip.textContent = name;
        chip.onclick = function () { toggleTypeFilter(name); };
        bar.appendChild(chip);
      });
    }

    function toggleTypeFilter(typeId) {
      if (filterTypes.has(typeId)) {
        filterTypes.delete(typeId);
      } else {
        filterTypes.add(typeId);
      }
      saveViewFlags();
      rebuildTypeFilterChips();
      render();
    }

    function clearTypeFilter() {
      filterTypes.clear();
      saveViewFlags();
      rebuildTypeFilterChips();
      render();
    }

    function filterSlots(slots) {
      var q = searchQuery ? searchQuery.trim().toLowerCase() : '';
      var hasTypeFilter = filterTypes && filterTypes.size > 0;
      if (!q && !hasTypeFilter) return slots;

      return slots.filter(function (s) {
        // 1. Type Filter (Multiselect)
        if (hasTypeFilter) {
          if (s.isGlobalHoliday) {
            if (!filterTypes.has('holiday')) return false;
          } else if (s.entry) {
            var entryType = s.entry.type || 'lesson';
            if (!filterTypes.has(entryType)) return false;
          } else {
            // Empty schedule slot defaults to lesson
            if (!filterTypes.has('lesson')) return false;
          }
        }

        // 2. Search Query
        if (q) {
          if (s.isGlobalHoliday) {
            var hLabel = (s.holidayLabel || t('pl_typeHoliday')).toLowerCase();
            if (!hLabel.includes(q)) return false;
          } else if (s.entry) {
            var e = s.entry;
            var clsName = s.classId ? plannerClassDisplayName(s.classId).toLowerCase() : '';
            var topic = (e.topic || '').toLowerCase();
            var notes = (e.notes || '').toLowerCase();
            var obj = (e.objective || (Array.isArray(e.objectives) ? e.objectives.join(' ') : '') || '').toLowerCase();
            var typeTxt = typeLabel(e.type || 'lesson').toLowerCase();
            var customTxt = e.customFields ? Object.values(e.customFields).join(' ').toLowerCase() : '';

            var match = clsName.includes(q) || topic.includes(q) || notes.includes(q) ||
                        obj.includes(q) || typeTxt.includes(q) || customTxt.includes(q);
            if (!match) return false;
          } else {
            var clsName = s.classId ? plannerClassDisplayName(s.classId).toLowerCase() : '';
            var match = clsName.includes(q);
            if (!match) return false;
          }
        }

        return true;
      });
    }

    function getFilteredViewSlots(activeSem, forceShowPast) {
      var slots = buildSlots(activeSem, !!forceShowPast);
      slots = filterSlots(slots);
      return slots.filter(function (s) {
        if (s.isGlobalHoliday && viewOpts.holidays === false) return false;
        if (!s.isGlobalHoliday && !s.entry && viewOpts.emptySlots === false) return false;
        return true;
      });
    }

    function getHolidayDatesMap(activeSem) {
      var map = Object.create(null);
      if (!activeSem || viewOpts.holidays === false) return map;
      (activeSem.holidays || []).forEach(function (h) {
        if (!h.date) return;
        var d = new Date(h.date + 'T12:00:00');
        var end = h.dateTo ? new Date(h.dateTo + 'T12:00:00') : d;
        var guard = 0;
        while (d <= end && guard++ < 400) {
          var ds = d.toISOString().slice(0, 10);
          map[ds] = h.label || t('pl_typeHoliday');
          d.setDate(d.getDate() + 1);
        }
      });
      return map;
    }

    function getTodosByDateMap() {
      var map = Object.create(null);
      if (viewOpts.todos === false || !Array.isArray(todos)) return map;
      var showDoneEl = document.getElementById('td-show-archived');
      var showArchived = !!(showDoneEl && showDoneEl.checked);
      todos.forEach(function (td) {
        if (!td || !td.dueDate) return;
        if (!showArchived && td.archivedAt) return;
        if (!map[td.dueDate]) map[td.dueDate] = [];
        map[td.dueDate].push(td);
      });
      return map;
    }

    function renderTodoCalChipsHtml(list) {
      if (!list || !list.length) return '';
      return list.map(function (td) {
        var isDone = !!td.archivedAt;
        return '<span class="todo-cal-chip' + (isDone ? ' is-done' : '') + '" data-pl-action="edit-todo" data-pl-tdid="' + esc(td.id) + '" title="' + esc(td.text || '') + '">' +
          '<img src="../assets/icons/check.svg" style="width:11px;height:11px;flex-shrink:0" alt="" />' +
          '<span>' + esc(td.text || '') + '</span></span>';
      }).join('');
    }

    // ── Class setup modal ──────────────────────────────────────────────────────
    // ── Class-setup chip helpers ───────────────────────────────────────────────
    var PL_YEAR_RE = /^20\d{2}-20\d{2}$/;

    function getExistingPlannerYears() {
      var years = new Set();
      Object.keys(cfg.classes || {}).forEach(function (id) {
        var y = (cfg.classes[id] || {}).year;
        if (y && PL_YEAR_RE.test(y)) years.add(y);
      });
      try {
        var cgd = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : (window.CLASS_GROUPS_DATA || null);
        if (cgd && cgd.activeYear && PL_YEAR_RE.test(cgd.activeYear)) years.add(cgd.activeYear);
        var meta = (cgd && cgd.classGroupsMeta) ? cgd.classGroupsMeta : {};
        Object.keys(meta).forEach(function (g) {
          if (meta[g] && meta[g].year && PL_YEAR_RE.test(meta[g].year)) years.add(meta[g].year);
        });
      } catch (e) { }
      return Array.from(years).sort();
    }

    function renderClassSetupChips(ids, selId) {
      var container = document.getElementById('cls-sel-chips');
      if (!container) return;
      container.innerHTML = '';
      ids.forEach(function (id) {
        var chip = document.createElement('span');
        chip.className = 'pl-pick-chip' + (id === selId ? ' selected' : '');
        chip.textContent = plannerClassDisplayName(id);
        chip.dataset.cid = id;
        chip.onclick = function () {
          container.querySelectorAll('.pl-pick-chip').forEach(function (c) { c.classList.remove('selected'); });
          chip.classList.add('selected');
          loadClassPanel(id);
        };
        container.appendChild(chip);
      });
    }

    function renderPlannerYearChips(container, years, sel) {
      container.innerHTML = '';
      years.forEach(function (y) {
        var chip = document.createElement('span');
        chip.className = 'pl-pick-chip' + (y === sel ? ' selected' : '');
        chip.textContent = y;
        chip.dataset.year = y;
        chip.onclick = function () {
          container.querySelectorAll('.pl-pick-chip').forEach(function (c) { c.classList.remove('selected'); });
          chip.classList.add('selected');
        };
        container.appendChild(chip);
      });
    }

    function addPlannerYearChip() {
      var input = document.getElementById('cls-year-new');
      var val = (input.value || '').trim();
      if (!PL_YEAR_RE.test(val)) {
        input.classList.add('invalid');
        showToast(t('cpToastInvalidYear'));
        input.focus();
        return;
      }
      input.classList.remove('invalid');
      var container = document.getElementById('cls-year-chips');
      var chips = Array.from(container.querySelectorAll('.pl-pick-chip'));
      var existing = chips.find(function (c) { return c.dataset.year === val; });
      if (existing) {
        chips.forEach(function (c) { c.classList.remove('selected'); });
        existing.classList.add('selected');
      } else {
        var allYears = chips.map(function (c) { return c.dataset.year; });
        allYears.push(val);
        allYears.sort();
        renderPlannerYearChips(container, allYears, val);
      }
      input.value = '';
    }

    function openClassModal() {
      populateSelects();
      var tpyEl = document.getElementById('pl-terms-per-year');
      if (tpyEl) tpyEl.value = String(getTermsPerYear());
      buildClassSemCheckboxes();
      loadClassPanel('');
      openModal('classModal');
    }

    function loadClassPanel(cid) {
      activeClsSetup = cid;
      // Keep chip selection in sync
      var chipsContainer = document.getElementById('cls-sel-chips');
      if (chipsContainer) {
        chipsContainer.querySelectorAll('.pl-pick-chip').forEach(function (c) {
          c.classList.toggle('selected', c.dataset.cid === cid);
        });
      }
      var panel = document.getElementById('cls-panel');
      var delBtn = document.getElementById('del-cls-btn');
      if (!cid) {
        panel.style.display = 'none';
        if (delBtn) delBtn.style.display = 'none';
        return;
      }
      panel.style.display = 'flex';
      var clsCfg = cfg.classes[cid] || {};
      if (delBtn) delBtn.style.display = clsCfg.manual ? '' : 'none';
      // Year chips
      var planYear = clsCfg.year || '';
      var years = getExistingPlannerYears();
      var allYears = (planYear && years.indexOf(planYear) < 0) ? years.concat([planYear]).sort() : years;
      renderPlannerYearChips(document.getElementById('cls-year-chips'), allYears, planYear);
      var clsYearNew = document.getElementById('cls-year-new');
      if (clsYearNew) { clsYearNew.value = ''; clsYearNew.classList.remove('invalid'); }
      var sems = clsCfg.semesters || {};
      var n = getTermsPerYear();
      for (var i = 1; i <= n; i++) {
        var semCb = document.getElementById('cls-sem' + i);
        if (semCb) semCb.checked = sems['sem' + i] !== false;
      }
      renderColorRow(clsCfg.color || PRESET_COLORS[0]);
      renderSchedList(clsCfg.schedule || []);
      renderObjList(clsCfg.objectives || []);
    }

    function deleteManualClass() {
      if (!activeClsSetup || !(cfg.classes[activeClsSetup] || {}).manual) return;
      var cid = activeClsSetup;
      showConfirm(tFmt('pl_confirmDeleteClass', { cls: cid }), function () {
        delete cfg.classes[cid];
        entries = entries.filter(function (e) { return e.classId !== cid; });
        if (window.PLANNER_ENTRIES_BY_CLASS) delete window.PLANNER_ENTRIES_BY_CLASS[cid];
        persistCfg();
        persistEntries();
        if (window.Desktop && Desktop.isElectron()) {
          Desktop.deleteByPath('user', 'planner/' + cid + '.js').catch(function () { });
        }
        closeModal('classModal');
        populateSelects();
        render();
      });
    }

    function renderColorRow(selected) {
      var el = document.getElementById('color-row');
      var html = PRESET_COLORS.map(function (c) {
        return '<div class="color-swatch' + (c === selected ? ' selected' : '') +
          '" style="background:' + c + '" title="' + c + '" data-pl-action="pick-color" data-pl-color="' + esc(c) + '"></div>';
      }).join('');
      html += '<div class="custom-color-wrap"><input type="color" id="custom-color" data-color-css="' + esc(selected) + '" value="' + esc(selected) +
        '" data-pl-input="pick-color"><label for="custom-color">' + esc(t('pl_customColor')) + '</label></div>';
      el.innerHTML = html;
      var customEl = document.getElementById('custom-color');
      if (customEl && window.UnifiedColorPicker) {
        window.UnifiedColorPicker.setValue(customEl, selected);
      }
    }
    function pickColor(c) {
      var customEl = document.getElementById('custom-color');
      var resolved = c;
      if (customEl && window.UnifiedColorPicker && !c) {
        resolved = window.UnifiedColorPicker.getValue(customEl);
      }
      document.querySelectorAll('#color-row .color-swatch').forEach(function (s) { s.classList.toggle('selected', s.title === resolved); });
      if (customEl) {
        if (window.UnifiedColorPicker) window.UnifiedColorPicker.setValue(customEl, resolved);
        else customEl.value = resolved;
      }
    }
    function getPickedColor() {
      var sel = document.querySelector('#color-row .color-swatch.selected');
      if (sel) return sel.title;
      var customEl = document.getElementById('custom-color');
      return (customEl && window.UnifiedColorPicker) ? window.UnifiedColorPicker.getValue(customEl) : (customEl ? customEl.value : '#5b8fcc');
    }

    var DAY_KEYS = ['pl_daySun', 'pl_dayMon', 'pl_dayTue', 'pl_dayWed', 'pl_dayThu', 'pl_dayFri', 'pl_daySat'];

    function renderSchedList(schedule) {
      var el = document.getElementById('sched-list'); el.innerHTML = '';
      schedule.forEach(function (s) { el.appendChild(makeSchedRow(s.day, s.time, s.timeEnd, s.halfGroup || null)); });
    }
    function _schedHasHalves() {
      var meta = classGroupsMeta[activeClsSetup];
      return !!(meta && meta.halfGroups &&
        ((meta.halfGroups.A && meta.halfGroups.A.length) || (meta.halfGroups.B && meta.halfGroups.B.length)));
    }
    function makeSchedRow(day, time, timeEnd, halfGroup) {
      var opts = DAY_KEYS.map(function (k, i) {
        return '<option value="' + i + '"' + (parseInt(day) === i ? ' selected' : '') + '>' + esc(t(k)) + '</option>';
      }).join('');
      var halfSel = _schedHasHalves()
        ? '<select class="field-select half-sel" style="min-width:70px">' +
        '<option value="">' + esc(t('pl_halfBoth')) + '</option>' +
        '<option value="A"' + (halfGroup === 'A' ? ' selected' : '') + '>' + esc(t('pl_halfA')) + '</option>' +
        '<option value="B"' + (halfGroup === 'B' ? ' selected' : '') + '>' + esc(t('pl_halfB')) + '</option>' +
        '</select>'
        : '';
      var div = document.createElement('div'); div.className = 'sched-item';
      div.innerHTML = '<select class="field-select day-sel">' + opts + '</select>' +
        '<input type="time" class="field-input time-inp" value="' + esc(time || '') + '">' +
        '<span class="range-sep">–</span>' +
        '<input type="time" class="field-input time-end-inp" value="' + esc(timeEnd || '') + '">' +
        halfSel +
        '<button class="rm-btn" data-pl-rm=".sched-item"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>';
      return div;
    }
    function addSchedRow() { document.getElementById('sched-list').appendChild(makeSchedRow(1, '08:00', '09:00', null)); }

    function renderObjList(objectives) {
      var el = document.getElementById('obj-list'); el.innerHTML = '';
      objectives.forEach(function (o) { el.appendChild(makeObjRow(o)); });
    }
    function makeObjRow(text) {
      var div = document.createElement('div'); div.className = 'obj-item';
      div.innerHTML = '<input type="text" class="field-input" value="' + esc(text) +
        '" placeholder="' + esc(t('pl_objectivePlaceholder')) + '">' +
        '<button class="rm-btn" data-pl-rm=".obj-item"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>';
      return div;
    }
    function addObjRow(text) { document.getElementById('obj-list').appendChild(makeObjRow(text || '')); }

    function saveClassPanel() {
      if (!activeClsSetup) { closeModal('classModal'); return; }
      var yearChip = document.querySelector('#cls-year-chips .pl-pick-chip.selected');
      var year = yearChip ? yearChip.dataset.year : '';
      if (!year) { showToast(t('cpToastSelectYear')); return; }
      var schedule = [], objectives = [];
      document.querySelectorAll('#sched-list .sched-item').forEach(function (row) {
        var timeEndEl = row.querySelector('.time-end-inp');
        var halfSelEl = row.querySelector('.half-sel');
        var slot = { day: parseInt(row.querySelector('.day-sel').value), time: row.querySelector('.time-inp').value, timeEnd: timeEndEl ? timeEndEl.value : '' };
        if (halfSelEl && halfSelEl.value) slot.halfGroup = halfSelEl.value;
        schedule.push(slot);
      });
      document.querySelectorAll('#obj-list .obj-item input[type="text"]').forEach(function (inp) {
        var v = inp.value.trim(); if (v) objectives.push(v);
      });
      var wasManual = !!(cfg.classes[activeClsSetup] || {}).manual;
      cfg.classes[activeClsSetup] = {
        color: getPickedColor(),
        year: year,
        semesters: (function () {
          var d = {}, n = getTermsPerYear();
          for (var i = 1; i <= n; i++) {
            var el = document.getElementById('cls-sem' + i);
            d['sem' + i] = el ? el.checked : true;
          }
          return d;
        }()),
        schedule: schedule,
        objectives: objectives
      };
      if (wasManual) cfg.classes[activeClsSetup].manual = true;
      persistCfg();
      closeModal('classModal');
      render();
    }

    // ── Entry modal ────────────────────────────────────────────────────────────
    function populateTypeSelect(currentType) {
      var sel = document.getElementById('e-type');
      Array.from(sel.options).forEach(function (o) {
        if (o.dataset.custom) sel.remove(o.index);
      });
      (cfg.customTypes || []).forEach(function (name) {
        var o = new Option(name, name);
        o.dataset.custom = '1';
        sel.add(o);
      });
      if (currentType) sel.value = currentType;
      onEntryTypeChange();
    }

    function populateEntryClassPills(selectedIds) {
      var container = document.getElementById('e-class-pills');
      if (!container) return;
      container.innerHTML = '';
      var ids = getPlannerClassIds();
      ids.forEach(function (id) {
        var color = (cfg.classes[id] || {}).color || '#aaa';
        var chip = document.createElement('span');
        chip.className = 'entry-cls-pill' + (selectedIds && selectedIds.indexOf(id) >= 0 ? ' selected' : '');
        chip.style.setProperty('--pill-color', color);
        chip.dataset.classId = id;
        chip.textContent = plannerClassDisplayName(id);
        chip.onclick = function () {
          chip.classList.toggle('selected');
          onEntryClassChange();
        };
        container.appendChild(chip);
      });
    }

    function getSelectedEntryClassIds() {
      var container = document.getElementById('e-class-pills');
      if (!container) return [];
      return Array.from(container.querySelectorAll('.entry-cls-pill.selected')).map(function (c) { return c.dataset.classId; });
    }

    function onEntryTypeChange() {
      var type = document.getElementById('e-type').value;
      var contentFields = document.getElementById('e-content-fields');
      if (contentFields) contentFields.style.display = type === 'no-class' ? 'none' : 'flex';
    }

    function renderCustomFieldInputs(entry) {
      var section = document.getElementById('e-custom-section');
      var container = document.getElementById('e-custom-fields');
      var fields = cfg.customFields || [];
      section.style.display = fields.length ? '' : 'none';
      container.innerHTML = '';
      fields.forEach(function (name) {
        var div = document.createElement('div'); div.className = 'field-group';
        var label = document.createElement('label'); label.textContent = name;
        var inp = document.createElement('textarea'); inp.className = 'field-textarea';
        inp.dataset.cfKey = name;
        inp.value = (entry && entry.customFields && entry.customFields[name]) || '';
        div.appendChild(label); div.appendChild(inp);
        container.appendChild(div);
      });
    }

    function openAddEntry(classId, date, time, timeEnd) {
      editingId = null;
      _editingRecurScope = null;
      document.getElementById('entry-modal-title').textContent = t('pl_entryModalAdd');
      document.getElementById('del-entry-btn').style.display = 'none';
      document.getElementById('dup-entry-btn').style.display = 'none';
      var linksBtn = document.getElementById('links-entry-btn');
      if (linksBtn) linksBtn.style.display = 'none';
      var classGrp = document.getElementById('e-class-field-group');
      if (classGrp) classGrp.style.display = '';
      var slotGrp = document.getElementById('dup-slot-picker-group');
      if (slotGrp) slotGrp.style.display = 'none';
      var defaultClass = classId || (filterClasses.size === 1 ? [...filterClasses][0] : '') || '';
      populateEntryClassPills(defaultClass ? [defaultClass] : []);
      document.getElementById('e-date').value = date || new Date().toISOString().slice(0, 10);
      document.getElementById('e-date-to').value = '';
      document.getElementById('e-time').value = time || '';
      document.getElementById('e-time-end').value = timeEnd || '';
      populateEntryRecurFields(null);
      document.getElementById('e-recur-row').style.display = '';
      populateTypeSelect('lesson');
      document.getElementById('e-topic').value = '';

      document.getElementById('e-notes').value = '';
      document.getElementById('e-reminder').value = '';
      document.getElementById('e-reminder-end').value = '';
      document.getElementById('e-obj-custom').style.display = 'none';
      renderCustomFieldInputs(null);
      onEntryClassChange();
      document.getElementById('e-obj-sel').value = '';
      plannerUpdateBoardEntryControls(null);
      openModal('entryModal');
    }

    async function toggleEntryPin(event, entryId, classId, date, time, timeEnd) {
      if (event) event.stopPropagation();
      var entry = entries.find(function (e) { return e.id === entryId; });
      if (!entry) return;
      var itemInfo = {
        type: 'planner-entry',
        entryId: entryId
      };
      
      var isPinned = plannerPins.some(function(p) {
        return p.type === 'planner-entry' && p.entryId === entryId;
      });

      if (isPinned) {
        await Pins.unpinItem(itemInfo);
        showToast(' Unpinned from sidebar');
      } else {
        var displayTitle = (entry.topic || t('pl_emptySlot')).trim();
        var className = plannerClassDisplayName(classId);
        if (className) displayTitle = className + ': ' + displayTitle;
        await Pins.pinItem({
          type: 'planner-entry',
          title: displayTitle,
          classId: classId,
          date: date,
          time: time || '',
          timeEnd: timeEnd || '',
          entryId: entryId
        });
        showToast(' Pinned to sidebar');
      }
      plannerPins = await Pins.getPins();
      plannerUpdatePinButtons();
    }

    async function toggleTodoPin(event, id) {
      if (event) event.stopPropagation();
      var td = todos.find(function (t) { return t.id === id; });
      if (!td) return;
      var itemInfo = {
        type: 'todo',
        id: id
      };
      
      var isPinned = plannerPins.some(function(p) {
        return p.type === 'todo' && p.id === id;
      });

      if (isPinned) {
        await Pins.unpinItem(itemInfo);
        showToast(' Unpinned from sidebar');
      } else {
        var displayTitle = (td.text || 'To-do').trim();
        var className = plannerClassDisplayName(td.classId);
        if (className) displayTitle = '[' + className + '] ' + displayTitle;
        await Pins.pinItem({
          type: 'todo',
          title: displayTitle,
          id: id
        });
        showToast(' Pinned to sidebar');
      }
      plannerPins = await Pins.getPins();
      renderTodos();
    }

    function openEditEntry(id) {
      var e = entries.find(function (x) { return x.id === id; });
      if (!e) return;
      if (e.recurrenceId && !_editingRecurScope) {
        openRecurScopeModal('edit', id);
        return;
      }
      editingId = id;
      document.getElementById('entry-modal-title').textContent = t('pl_entryModalEdit');
      document.getElementById('del-entry-btn').style.display = '';
      document.getElementById('dup-entry-btn').style.display = '';
      var classGrp = document.getElementById('e-class-field-group');
      if (classGrp) classGrp.style.display = '';
      var slotGrp = document.getElementById('dup-slot-picker-group');
      if (slotGrp) slotGrp.style.display = 'none';
      populateEntryClassPills(entryClassIds(e));
      document.getElementById('e-date').value = e.date || '';
      document.getElementById('e-date-to').value = e.dateTo || '';
      document.getElementById('e-time').value = e.time || '';
      document.getElementById('e-time-end').value = e.timeEnd || '';
      var recurRow = document.getElementById('e-recur-row');
      if (_editingRecurScope === 'this') {
        if (recurRow) recurRow.style.display = 'none';
      } else {
        if (recurRow) recurRow.style.display = '';
        populateEntryRecurFields(e);
      }
      populateTypeSelect(e.type || 'lesson');
      document.getElementById('e-topic').value = e.topic || '';
      document.getElementById('e-notes').value = e.notes || '';
      document.getElementById('e-reminder').value = (e.reminder && e.reminder.minutesBefore) ? String(e.reminder.minutesBefore) : '';
      document.getElementById('e-reminder-end').value = (e.reminderEnd && e.reminderEnd.minutesBefore) ? String(e.reminderEnd.minutesBefore) : '';
      renderCustomFieldInputs(e);
      onEntryClassChange();
      var objSel = document.getElementById('e-obj-sel'), objCustom = document.getElementById('e-obj-custom');
      var objVal = e.objective || '';
      var opts = Array.from(objSel.options).map(function (o) { return o.value; });
      if (opts.indexOf(objVal) >= 0) { objSel.value = objVal; objCustom.style.display = 'none'; }
      else if (objVal) { objSel.value = '__other__'; objCustom.value = objVal; objCustom.style.display = ''; }
      else { objSel.value = ''; objCustom.style.display = 'none'; }
      plannerUpdateBoardEntryControls(e);
      var linksBtn = document.getElementById('links-entry-btn');
      if (linksBtn) {
        linksBtn.style.display = '';
        if (window.LinksService) {
          var _lUrn = 'cmt:planner:' + id;
          var _lCount = (LinksService.getLinksForSync(_lUrn) || []).length;
          var _tCount = (LinksService.getTagsForSync(_lUrn) || []).length;
          if (_lCount > 0 || _tCount > 0) {
            linksBtn.textContent = '[LINKS: ' + _lCount + ' · TAGS: ' + _tCount + ']';
          } else {
            linksBtn.textContent = '[LINKS & TAGS]';
          }
        }
      }
      openModal('entryModal');
    }

    var _plannerBoardMenuEntryId = '';
    var _plannerBoardMenuSlot = null;

    function plannerBoardEntryBaseName(entry) {
      if (!entry) return 'planner-entry';
      var bits = [];
      if (entry.date) bits.push(String(entry.date));
      if (entry.classId) bits.push(plannerClassDisplayName(entry.classId));
      if (entry.time) bits.push(String(entry.time).replace(/:/g, '-'));
      if (entry.topic) bits.push(String(entry.topic).trim());
      var base = bits.filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
      return base || 'planner-entry';
    }

    function plannerBoardEntryFileName(entry) {
      return plannerBoardEntryBaseName(entry) + '.js';
    }

    function plannerBoardEntryFolderName(entry) {
      return plannerBoardEntryBaseName(entry);
    }

    function plannerBoardEntrySessionData(entry, plannerLinkId) {
      var now = Date.now();
      var linkId = String(plannerLinkId || (entry && entry.id) || '').trim();
      return {
        _type: 'constellation',
        _version: 1,
        _createdAt: now,
        _savedAt: now,
        _plannerEntryIds: linkId ? [linkId] : [],
        _plannerEntryId: linkId,
        _classGroup: String(entry && entry.classId || ''),
        dateCreated: new Date(now).toISOString(),
        title: plannerBoardEntryBaseName(entry),
        attachments: [],
        currentPage: 0,
        nodes: [],
        edges: [],
        groups: [],
        masks: [],
        notes: [],
        drawings: [],
        shapes: [],
        tables: [],
        media: [],
        backgroundPdf: null,
        boardBg: null,
        boardBgColor: null,
        boardBackgroundColor: null
      };
    }

    function plannerBoardEntryFileContent(entry, plannerLinkId) {
      return 'window.CONSTELLATION_SESSION_EXPORT = ' + JSON.stringify(plannerBoardEntrySessionData(entry, plannerLinkId), null, 2) + ';\n';
    }

    function plannerBoardDraftEntryFromSlot(slot) {
      if (!slot || !slot.classId || !slot.date) return null;
      return {
        id: '',
        classId: String(slot.classId || ''),
        date: String(slot.date || ''),
        time: String(slot.time || ''),
        timeEnd: String(slot.timeEnd || ''),
        topic: '',
        notes: '',
        type: 'lesson'
      };
    }

    function plannerBoardDraftEntryFromModal() {
      var modal = document.getElementById('entryModal');
      if (!modal || !modal.classList.contains('active')) return null;
      var date = (document.getElementById('e-date') || {}).value || '';
      if (!date) return null;
      var classIds = getSelectedEntryClassIds();
      var classId = classIds[0] || '';
      if (!classId) return null;
      return {
        id: '',
        classId: classId,
        date: date,
        time: (document.getElementById('e-time') || {}).value || '',
        timeEnd: (document.getElementById('e-time-end') || {}).value || '',
        topic: (document.getElementById('e-topic') || {}).value || '',
        notes: (document.getElementById('e-notes') || {}).value || '',
        type: (document.getElementById('e-type') || {}).value || 'lesson'
      };
    }

    function plannerUpdateBoardEntryControls(entry) {
      var btn = document.getElementById('board-entry-btn');
      var linkBtn = document.getElementById('board-link-entry-btn');
      var menuBtn = document.getElementById('planner-board-menu-btn');
      var lpBtn = document.getElementById('lp-entry-btn');
      var draft = !entry ? plannerBoardDraftEntryFromModal() : null;
      var linkId = entry && entry.id ? String(entry.id) : (draft ? plannerBoardLinkId({ classId: draft.classId, date: draft.date, time: draft.time }, null) : '');
      var canCreate = !!linkId;
      var linked = !!(linkId && boardSessionsByEntryId[linkId] && boardSessionsByEntryId[linkId].length);
      var label = linked ? t('pl_boardOpen') : t('pl_boardCreate');
      if (btn) {
        btn.style.display = canCreate ? '' : 'none';
        btn.textContent = label;
      }
      if (linkBtn) {
        linkBtn.style.display = canCreate ? '' : 'none';
      }
      if (menuBtn) menuBtn.textContent = label;

      // Update Lesson Plan entry modal button
      if (lpBtn) {
        var source = entry || draft;
        var lpLink = source ? plannerLessonPlanForSlot(source, entry) : null;
        var hasLp = !!(lpLink && lpLink.plan);
        lpBtn.style.display = (source && (source.classId || source.date)) ? '' : 'none';
        lpBtn.textContent = hasLp ? (t('pl_openLessonPlan') || 'Open Lesson Plan') : (t('pl_createLessonPlan') || 'Create Lesson Plan');
      }

      // Update Class Management entry modal button
      var cmBtn = document.getElementById('cm-entry-btn');
      if (cmBtn) {
        var sourceForCm = entry || draft;
        cmBtn.style.display = (sourceForCm && sourceForCm.classId) ? '' : 'none';
      }

      // Update Grade Sheet entry modal button
      var gsBtn = document.getElementById('gs-entry-btn');
      if (gsBtn) {
        var sourceForGs = entry || draft;
        var isGs = !!(sourceForGs && (sourceForGs.type === 'test' || sourceForGs.gsLink || sourceForGs.isCorrectionDeadline || sourceForGs._gradeRef));
        gsBtn.style.display = isGs ? '' : 'none';
      }
    }

    function plannerHideBoardEntryMenu() {
      var menu = document.getElementById('planner-board-menu');
      if (menu) menu.classList.remove('active');
    }

    function plannerShowBoardEntryMenu(event, entryId, slot) {
      var entry = entryId ? entries.find(function (e) { return e.id === entryId; }) : null;
      var slotDraft = plannerBoardDraftEntryFromSlot(slot);
      if (!entry && !slotDraft) return false;
      event.preventDefault();
      event.stopPropagation();
      _plannerBoardMenuEntryId = entry ? String(entry.id) : '';
      _plannerBoardMenuSlot = slotDraft ? {
        classId: slotDraft.classId,
        date: slotDraft.date,
        time: slotDraft.time,
        timeEnd: slotDraft.timeEnd
      } : null;
      var menuBtn = document.getElementById('planner-board-menu-btn');
      var boardUnlinkBtn = document.getElementById('planner-board-unlink-btn');
      var linkId = entry ? String(entry.id) : plannerBoardLinkId(_plannerBoardMenuSlot, null);
      var linked = !!(linkId && boardSessionsByEntryId[linkId] && boardSessionsByEntryId[linkId].length);
      if (menuBtn) menuBtn.textContent = linked ? t('pl_boardOpen') : t('pl_boardCreate');
      if (boardUnlinkBtn) boardUnlinkBtn.style.display = linked ? 'block' : 'none';

      // Update Links & Tags context menu buttons
      var linksMenuBtn = document.getElementById('planner-links-menu-btn');
      var openDocBtn = document.getElementById('planner-open-doc-menu-btn');
      var openFileBtn = document.getElementById('planner-open-file-menu-btn');
      if (linksMenuBtn) {
        linksMenuBtn.style.display = entry ? 'block' : 'none';
        if (entry && window.LinksService) {
          var _lUrn = 'cmt:planner:' + entry.id;
          var _lList = LinksService.getLinksForSync(_lUrn) || [];
          var _tList = LinksService.getTagsForSync(_lUrn) || [];
          if (_lList.length > 0 || _tList.length > 0) {
            linksMenuBtn.textContent = t('pl_linksAndTags') + ' [' + _lList.length + '/' + _tList.length + ']';
          } else {
            linksMenuBtn.textContent = t('pl_linksAndTags');
          }

          var firstDoc = _lList.find(function (l) { return l.otherUrn.startsWith('cmt:doc:'); });
          if (openDocBtn) {
            openDocBtn.style.display = firstDoc ? 'block' : 'none';
            if (firstDoc) {
              var docName = (firstDoc.targetMeta && firstDoc.targetMeta.title) || firstDoc.otherUrn.split('/').pop() || 'Doc';
              openDocBtn.textContent = t('pl_openLinkedDoc') + ' (' + (docName.length > 18 ? docName.slice(0, 16) + '…' : docName) + ')';
              openDocBtn._targetUrn = firstDoc.otherUrn;
            }
          }

          var firstFile = _lList.find(function (l) { return l.otherUrn.startsWith('cmt:file:'); });
          if (openFileBtn) {
            openFileBtn.style.display = firstFile ? 'block' : 'none';
            if (firstFile) {
              var fnName = (firstFile.targetMeta && firstFile.targetMeta.title) || firstFile.otherUrn.split(/[\\/]/).pop() || 'File';
              openFileBtn.textContent = t('pl_openLinkedFile') + ' (' + (fnName.length > 18 ? fnName.slice(0, 16) + '…' : fnName) + ')';
              openFileBtn._targetUrn = firstFile.otherUrn;
            }
          }
        } else {
          if (openDocBtn) openDocBtn.style.display = 'none';
          if (openFileBtn) openFileBtn.style.display = 'none';
        }
      }

      // Update Class Management menu button
      var cmMenuBtn = document.getElementById('planner-cm-menu-btn');
      if (cmMenuBtn) {
        var hasClass = !!(_plannerBoardMenuSlot && _plannerBoardMenuSlot.classId) || !!(entry && entry.classId);
        cmMenuBtn.style.display = hasClass ? 'block' : 'none';
      }

      // Update Grade Sheet menu button
      var gsMenuBtn = document.getElementById('planner-gs-menu-btn');
      if (gsMenuBtn) {
        var isTestOrLinked = !!((entry && (entry.type === 'test' || entry.gsLink || entry.isCorrectionDeadline || entry._gradeRef)) || (slotDraft && slotDraft.type === 'test'));
        gsMenuBtn.style.display = isTestOrLinked ? 'block' : 'none';
      }

      // Update Lesson Plan menu button
      var lpMenuBtn = document.getElementById('planner-lp-menu-btn');
      var lpUnlinkBtn = document.getElementById('planner-lp-unlink-btn');
      var lpDeleteBtn = document.getElementById('planner-lp-delete-btn');
      var lpLink = plannerLessonPlanForSlot(_plannerBoardMenuSlot || (entry ? { classId: entry.classId, date: entry.date, time: entry.time } : null), entry);
      var hasLp = !!(lpLink && lpLink.plan);
      if (lpMenuBtn) {
        lpMenuBtn.textContent = hasLp ? (t('pl_openLessonPlan') || 'Open Lesson Plan') : (t('pl_createLessonPlan') || 'Create Lesson Plan');
      }
      if (lpUnlinkBtn) {
        lpUnlinkBtn.style.display = hasLp ? 'block' : 'none';
      }
      if (lpDeleteBtn) {
        lpDeleteBtn.style.display = hasLp ? 'block' : 'none';
      }

      var menu = document.getElementById('planner-board-menu');
      if (!menu) return false;
      var x = Math.max(8, Math.min(event.clientX || 0, window.innerWidth - 220));
      var y = Math.max(8, Math.min(event.clientY || 0, window.innerHeight - 120));
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
      menu.classList.add('active');
      return false;
    }

    function plannerOpenGradeSheetAction(entryId) {
      var id = String(entryId || _plannerBoardMenuEntryId || editingId || '').trim();
      plannerHideBoardEntryMenu();
      if (id) {
        openLinkedGradeSheet(id);
        return;
      }
      var slotDraft = plannerBoardDraftEntryFromSlot(_plannerBoardMenuSlot);
      if (!slotDraft || !slotDraft.classId) return;
      var clsName = (typeof plannerClassDisplayName === 'function' ? plannerClassDisplayName(slotDraft.classId) : '') || '';
      var query = {
        class: clsName || slotDraft.classId,
        classId: slotDraft.classId,
        groupId: slotDraft.classId,
        group: slotDraft.classId,
        className: clsName,
        sem: (typeof getGsSemesterForDate === 'function' ? getGsSemesterForDate(slotDraft.date) : 'sem1') || 'sem1',
        date: slotDraft.date || '',
        testName: slotDraft.topic || ''
      };

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          var ch = new BroadcastChannel('cmt-gradesheet-nav');
          ch.postMessage(query);
          setTimeout(function () { try { ch.close(); } catch (_) {} }, 1000);
        } catch (_) {}
      }

      if (!window.Desktop || !Desktop.isElectron()) {
        var params = new URLSearchParams(query);
        window.open('grade-sheet.html?' + params.toString(), '_blank');
        return;
      }
      Desktop.openTool('grade-sheet.html', { query: query });
    }

    function plannerOpenGradeSheetModalAction() {
      var id = String(editingId || '').trim();
      if (id) {
        openLinkedGradeSheet(id);
        return;
      }
      var draft = plannerBoardDraftEntryFromModal();
      if (!draft || !draft.classId) return;
      var clsName = (typeof plannerClassDisplayName === 'function' ? plannerClassDisplayName(draft.classId) : '') || '';
      var query = {
        class: clsName || draft.classId,
        classId: draft.classId,
        groupId: draft.classId,
        group: draft.classId,
        className: clsName,
        sem: (typeof getGsSemesterForDate === 'function' ? getGsSemesterForDate(draft.date) : 'sem1') || 'sem1',
        date: draft.date || '',
        testName: draft.topic || ''
      };

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          var ch = new BroadcastChannel('cmt-gradesheet-nav');
          ch.postMessage(query);
          setTimeout(function () { try { ch.close(); } catch (_) {} }, 1000);
        } catch (_) {}
      }

      if (!window.Desktop || !Desktop.isElectron()) {
        var params = new URLSearchParams(query);
        window.open('grade-sheet.html?' + params.toString(), '_blank');
        return;
      }
      Desktop.openTool('grade-sheet.html', { query: query });
    }

    function plannerOpenClassManagementAction(entryId) {
      var id = String(entryId || _plannerBoardMenuEntryId || editingId || '').trim();
      plannerHideBoardEntryMenu();
      var entry = id ? entries.find(function (e) { return e.id === id; }) : null;
      var draft = !entry ? plannerBoardDraftEntryFromModal() : null;
      var slotDraft = (!entry && !draft) ? plannerBoardDraftEntryFromSlot(_plannerBoardMenuSlot) : null;
      var source = entry || draft || slotDraft;
      if (!source) return;

      var cId = source.classId || '';
      if (!cId) return;
      var dateVal = source.date || '';
      var entId = (entry && entry.id) || (source && source.id) || '';

      if (window.Desktop && Desktop.isElectron()) {
        Desktop.openTool('class-management.html', {
          query: {
            classId: String(cId),
            date: String(dateVal),
            plannerEntryId: String(entId)
          }
        });
      } else {
        try {
          localStorage.setItem('cmt-cm-nav', JSON.stringify({ classId: cId, date: dateVal, plannerEntryId: entId }));
        } catch (_) {}
        window.open('class-management.html', '_blank');
      }
    }

    function plannerOpenClassManagementModalAction() {
      var id = String(editingId || '').trim();
      var entry = id ? entries.find(function (e) { return e.id === id; }) : null;
      var draft = plannerBoardDraftEntryFromModal();
      var source = entry || draft;
      if (!source) return;

      var cId = source.classId || '';
      if (!cId) return;
      var dateVal = source.date || '';
      var entId = (entry && entry.id) || (source && source.id) || '';

      if (window.Desktop && Desktop.isElectron()) {
        Desktop.openTool('class-management.html', {
          query: {
            classId: String(cId),
            date: String(dateVal),
            plannerEntryId: String(entId)
          }
        });
      } else {
        try {
          localStorage.setItem('cmt-cm-nav', JSON.stringify({ classId: cId, date: dateVal, plannerEntryId: entId }));
        } catch (_) {}
        window.open('class-management.html', '_blank');
      }
    }

    function plannerLessonPlanEntryAction(entryId) {
      var id = String(entryId || _plannerBoardMenuEntryId || editingId || '').trim();
      plannerHideBoardEntryMenu();
      var entry = id ? entries.find(function (e) { return e.id === id; }) : null;
      var draft = !entry ? plannerBoardDraftEntryFromModal() : null;
      var slotDraft = (!entry && !draft) ? plannerBoardDraftEntryFromSlot(_plannerBoardMenuSlot) : null;
      var source = entry || draft || slotDraft;
      if (!source) return;

      var lpLink = plannerLessonPlanForSlot(_plannerBoardMenuSlot || source, entry);
      if (lpLink && lpLink.plan && lpLink.plan.id) {
        openLinkedLessonPlan(lpLink.plan.id);
      } else {
        if (!entry && source.date && source.classId) {
          entry = {
            id: uid(),
            classId: source.classId,
            date: source.date,
            time: source.time || '',
            timeEnd: source.timeEnd || '',
            type: 'lesson',
            topic: source.topic || '',
            lessonPlanId: ''
          };
          entries.push(entry);
          persistEntries();
        }
        openLinkedLessonPlan('', source.classId, source.date, entry ? entry.id : '', source.topic || '');
      }
    }

    async function plannerLessonPlanUnlinkAction(entryId) {
      var id = String(entryId || _plannerBoardMenuEntryId || editingId || '').trim();
      plannerHideBoardEntryMenu();
      var entry = id ? entries.find(function (e) { return e.id === id; }) : null;
      var draft = !entry ? plannerBoardDraftEntryFromModal() : null;
      var slotDraft = (!entry && !draft) ? plannerBoardDraftEntryFromSlot(_plannerBoardMenuSlot) : null;
      var source = entry || draft || slotDraft;
      if (!source) return;

      var lpLink = plannerLessonPlanForSlot(_plannerBoardMenuSlot || source, entry);
      var planToUnlink = lpLink ? lpLink.plan : null;

      if (entry) {
        entry.lessonPlanId = '__unlinked__';
        await persistEntries();
        delete plannerLessonPlansByEntryId[String(entry.id)];
      }

      // Clear plannerEntryId / slot date on disk if bound
      if (window.Desktop && Desktop.isElectron() && planToUnlink) {
        try {
          var planToUpdate = JSON.parse(JSON.stringify(planToUnlink));
          var wasModified = false;
          if (entry && planToUpdate.plannerEntryId === entry.id) {
            planToUpdate.plannerEntryId = '';
            wasModified = true;
          }
          if (source && source.date && planToUpdate.date === source.date) {
            planToUpdate.date = '';
            wasModified = true;
          }
          if (wasModified) {
            var filename = planToUnlink._filename || (planToUnlink._relPath ? planToUnlink._relPath.split('/').pop() : ('lp_' + planToUnlink.id + '.json'));
            if (typeof Desktop.saveJson === 'function') {
              await Desktop.saveJson('lessons', filename, planToUpdate);
            } else if (typeof Desktop.saveText === 'function') {
              await Desktop.saveText('user', 'lessons/' + filename, JSON.stringify(planToUpdate, null, 2));
            }
          }
        } catch (_) {}
      }

      _plannerLessonPlanMetaCache = {};
      await loadSavedLessonPlans();
      render();
      showToast(t('pl_lessonPlanUnlinked') || 'Lesson plan unlinked');
    }

    async function plannerLessonPlanDeleteAction(entryId) {
      var id = String(entryId || _plannerBoardMenuEntryId || editingId || '').trim();
      plannerHideBoardEntryMenu();
      var entry = id ? entries.find(function (e) { return e.id === id; }) : null;
      var draft = !entry ? plannerBoardDraftEntryFromModal() : null;
      var slotDraft = (!entry && !draft) ? plannerBoardDraftEntryFromSlot(_plannerBoardMenuSlot) : null;
      var source = entry || draft || slotDraft;
      if (!source) return;

      var lpLink = plannerLessonPlanForSlot(_plannerBoardMenuSlot || source, entry);
      if (!lpLink || !lpLink.plan) return;

      var planTitle = lpLink.plan.title || 'Untitled';
      var planId = lpLink.plan.id;
      var confirmMsg = (t('pl_confirmDeleteLessonPlan') || 'Are you sure you want to delete this lesson plan?') + '\n\n"' + planTitle + '"';

      var ok = await showConfirm(confirmMsg);
      if (!ok) return;

      if (entry) {
        entry.lessonPlanId = null;
        await persistEntries();
      }

      var otherLinked = entries.filter(function (e) { return e.lessonPlanId === planId; });
      if (otherLinked.length) {
        otherLinked.forEach(function (e) { e.lessonPlanId = null; });
        await persistEntries();
      }

      // Delete the plan file from user/lessons/
      var fn = lpLink.plan._filename || (lpLink.plan._relPath ? lpLink.plan._relPath.split('/').pop() : ('lp_' + planId + '.json'));
      if (window.Desktop && Desktop.isElectron()) {
        try {
          if (typeof Desktop.deleteFile === 'function') {
            await Desktop.deleteFile('lessons', fn);
          }
          if (typeof Desktop.deleteByPath === 'function') {
            await Desktop.deleteByPath('lessons', fn);
            await Desktop.deleteByPath('user', 'lessons/' + fn);
          }
          if (typeof Desktop.notifyDataChanged === 'function') {
            Desktop.notifyDataChanged({ target: 'lessons', filename: fn });
          }
        } catch (delErr) {
          console.warn('Failed to delete lesson plan file:', delErr);
        }
      } else {
        localStorage.removeItem('cmt-lesson-' + planId);
      }

      delete plannerLessonPlansByEntryId[String(planId)];
      if (entry && entry.id) delete plannerLessonPlansByEntryId[String(entry.id)];
      _plannerLessonPlanMetaCache = {};

      await loadSavedLessonPlans();
      render();
      showToast(t('pl_lessonPlanDeleted') || 'Lesson plan deleted');
    }

    function plannerLessonPlanEntryModalAction() {
      var id = String(editingId || '').trim();
      var entry = id ? entries.find(function (e) { return e.id === id; }) : null;
      var draft = plannerBoardDraftEntryFromModal();
      var source = entry || draft;
      if (!source) return;

      var lpLink = plannerLessonPlanForSlot(source, entry);
      if (lpLink && lpLink.plan && lpLink.plan.id) {
        openLinkedLessonPlan(lpLink.plan.id);
      } else {
        if (!entry && draft && draft.date && draft.classId) {
          entry = {
            id: uid(),
            classId: draft.classId,
            date: draft.date,
            time: draft.time || '',
            timeEnd: draft.timeEnd || '',
            type: draft.type || 'lesson',
            topic: draft.topic || '',
            lessonPlanId: ''
          };
          entries.push(entry);
          editingId = entry.id;
          persistEntries();
        }
        openLinkedLessonPlan('', source.classId, source.date, entry ? entry.id : '', source.topic || '');
      }
    }

    function plannerLessonPlanLinkPickerAction(entryId) {
      var id = String(entryId || _plannerBoardMenuEntryId || editingId || '').trim();
      plannerHideBoardEntryMenu();
      var entry = id ? entries.find(function (e) { return e.id === id; }) : null;
      var draft = !entry ? plannerBoardDraftEntryFromModal() : null;
      var slotDraft = (!entry && !draft) ? plannerBoardDraftEntryFromSlot(_plannerBoardMenuSlot) : null;
      var source = entry || draft || slotDraft;
      if (!source) return;

      openLessonPlanLinkModal(source, entry);
    }

    var _pendingLpLinkSource = null;
    var _pendingLpLinkEntry = null;

    function openLessonPlanLinkModal(source, entry) {
      _pendingLpLinkSource = source;
      _pendingLpLinkEntry = entry;
      var infoEl = document.getElementById('lp-link-slot-info');
      var clsName = source.classId ? plannerClassDisplayName(source.classId) : t('pl_noClass');
      var dateStr = source.date || '';
      var topicStr = source.topic || (entry && entry.topic) || '';
      if (infoEl) {
        infoEl.innerHTML = '<strong>' + esc(clsName) + '</strong> &bull; ' + esc(dateStr) + (topicStr ? ' &bull; <em>' + esc(topicStr) + '</em>' : '');
      }
      var sel = document.getElementById('lp-link-plan-select');
      if (sel) {
        sel.innerHTML = '';
        if (!plannerLessonPlansList.length) {
          var optEmpty = document.createElement('option');
          optEmpty.value = '';
          optEmpty.textContent = t('pl_noSavedLessonPlans') || '-- No saved lesson plans found --';
          sel.appendChild(optEmpty);
        } else {
          var optNone = document.createElement('option');
          optNone.value = '';
          optNone.textContent = '-- ' + (t('pl_linkLessonPlan') || 'Select saved plan') + ' --';
          sel.appendChild(optNone);
          plannerLessonPlansList.forEach(function (p) {
            var opt = document.createElement('option');
            opt.value = p.id;
            var desc = (p.title || 'Untitled') + ' (' + (plannerClassDisplayName(p.classId) || 'All') + ' | ' + (p.date || '') + ' | ' + (p.totalDuration || 0) + 'm)';
            opt.textContent = desc;
            sel.appendChild(opt);
          });
        }
        var existingLink = plannerLessonPlanForSlot(source, entry);
        if (existingLink && existingLink.plan) {
          sel.value = existingLink.plan.id;
        }
      }
      var unlinkBtn = document.getElementById('lp-unlink-btn');
      var deleteBtn = document.getElementById('lp-delete-btn');
      var existingLink = plannerLessonPlanForSlot(source, entry);
      var hasExisting = !!(existingLink && existingLink.plan);
      if (unlinkBtn) unlinkBtn.style.display = hasExisting ? 'inline-block' : 'none';
      if (deleteBtn) deleteBtn.style.display = hasExisting ? 'inline-block' : 'none';

      openModal('lpLinkModal');
    }

    async function lpLinkConfirmAction() {
      var sel = document.getElementById('lp-link-plan-select');
      var chosenPlanId = sel ? sel.value : '';
      if (!chosenPlanId) {
        closeModal('lpLinkModal');
        return;
      }
      if (_pendingLpLinkEntry) {
        _pendingLpLinkEntry.lessonPlanId = chosenPlanId;
        await persistEntries();
      } else if (_pendingLpLinkSource && _pendingLpLinkSource.date) {
        var newE = {
          id: uid(),
          classId: _pendingLpLinkSource.classId || '',
          date: _pendingLpLinkSource.date,
          time: _pendingLpLinkSource.time || '',
          timeEnd: _pendingLpLinkSource.timeEnd || '',
          type: 'lesson',
          topic: _pendingLpLinkSource.topic || '',
          lessonPlanId: chosenPlanId
        };
        entries.push(newE);
        await persistEntries();
      }
      closeModal('lpLinkModal');
      await loadSavedLessonPlans();
      render();
      showToast(t('saved'));
    }

    async function lpLinkUnlinkAction() {
      var source = _pendingLpLinkSource;
      var entry = _pendingLpLinkEntry;
      var lpLink = plannerLessonPlanForSlot(source, entry);
      var planToUnlink = lpLink ? lpLink.plan : null;

      if (entry) {
        entry.lessonPlanId = '__unlinked__';
        await persistEntries();
        delete plannerLessonPlansByEntryId[String(entry.id)];
      }

      // Clear plannerEntryId / slot date on disk if bound
      if (window.Desktop && Desktop.isElectron() && planToUnlink) {
        try {
          var planToUpdate = JSON.parse(JSON.stringify(planToUnlink));
          var wasModified = false;
          if (entry && planToUpdate.plannerEntryId === entry.id) {
            planToUpdate.plannerEntryId = '';
            wasModified = true;
          }
          if (source && source.date && planToUpdate.date === source.date) {
            planToUpdate.date = '';
            wasModified = true;
          }
          if (wasModified) {
            var filename = planToUnlink._filename || (planToUnlink._relPath ? planToUnlink._relPath.split('/').pop() : ('lp_' + planToUnlink.id + '.json'));
            if (typeof Desktop.saveJson === 'function') {
              await Desktop.saveJson('lessons', filename, planToUpdate);
            } else if (typeof Desktop.saveText === 'function') {
              await Desktop.saveText('user', 'lessons/' + filename, JSON.stringify(planToUpdate, null, 2));
            }
          }
        } catch (_) {}
      }

      closeModal('lpLinkModal');
      _plannerLessonPlanMetaCache = {};
      await loadSavedLessonPlans();
      render();
      showToast(t('pl_lessonPlanUnlinked') || 'Lesson plan unlinked');
    }

    async function lpLinkDeleteAction() {
      var source = _pendingLpLinkSource;
      var entry = _pendingLpLinkEntry;
      var lpLink = plannerLessonPlanForSlot(source, entry);
      if (!lpLink || !lpLink.plan) {
        closeModal('lpLinkModal');
        return;
      }
      var planTitle = lpLink.plan.title || 'Untitled';
      var planId = lpLink.plan.id;
      var confirmMsg = (t('pl_confirmDeleteLessonPlan') || 'Are you sure you want to delete this lesson plan?') + '\n\n"' + planTitle + '"';

      var ok = await showConfirm(confirmMsg);
      if (!ok) return;

      closeModal('lpLinkModal');

      if (entry) {
        entry.lessonPlanId = null;
        await persistEntries();
      }

      var otherLinked = entries.filter(function (e) { return e.lessonPlanId === planId; });
      if (otherLinked.length) {
        otherLinked.forEach(function (e) { e.lessonPlanId = null; });
        await persistEntries();
      }

      var fn = lpLink.plan._filename || (lpLink.plan._relPath ? lpLink.plan._relPath.split('/').pop() : ('lp_' + planId + '.json'));
      if (window.Desktop && Desktop.isElectron()) {
        try {
          if (typeof Desktop.deleteFile === 'function') {
            await Desktop.deleteFile('lessons', fn);
          }
          if (typeof Desktop.deleteByPath === 'function') {
            await Desktop.deleteByPath('lessons', fn);
            await Desktop.deleteByPath('user', 'lessons/' + fn);
          }
          if (typeof Desktop.notifyDataChanged === 'function') {
            Desktop.notifyDataChanged({ target: 'lessons', filename: fn });
          }
        } catch (delErr) {
          console.warn('Failed to delete lesson plan file:', delErr);
        }
      } else {
        localStorage.removeItem('cmt-lesson-' + planId);
      }

      delete plannerLessonPlansByEntryId[String(planId)];
      if (entry && entry.id) delete plannerLessonPlansByEntryId[String(entry.id)];
      _plannerLessonPlanMetaCache = {};

      await loadSavedLessonPlans();
      render();
      showToast(t('pl_lessonPlanDeleted') || 'Lesson plan deleted');
    }

    function lpLinkCreateNewAction() {
      var src = _pendingLpLinkSource;
      var ent = _pendingLpLinkEntry;
      closeModal('lpLinkModal');
      if (src) {
        if (!ent && src.date && src.classId) {
          ent = {
            id: uid(),
            classId: src.classId,
            date: src.date,
            time: src.time || '',
            timeEnd: src.timeEnd || '',
            type: 'lesson',
            topic: src.topic || '',
            lessonPlanId: ''
          };
          entries.push(ent);
          persistEntries();
        }
        openLinkedLessonPlan('', src.classId, src.date, ent ? ent.id : '', src.topic || '');
      }
    }

    async function plannerBoardEntryAction(entryId) {
      var id = String(entryId || _plannerBoardMenuEntryId || editingId || '').trim();
      plannerHideBoardEntryMenu();
      var entry = id ? entries.find(function (e) { return e.id === id; }) : null;
      var draft = !entry ? plannerBoardDraftEntryFromModal() : null;
      var slotDraft = (!entry && !draft) ? plannerBoardDraftEntryFromSlot(_plannerBoardMenuSlot) : null;
      var source = entry || draft || slotDraft;
      if (!source) return;
      var linkId = entry && entry.id ? String(entry.id) : plannerBoardLinkId({ classId: source.classId, date: source.date, time: source.time }, null);
      if (!linkId) return;
      if (boardSessionsByEntryId[linkId] && boardSessionsByEntryId[linkId].length) {
        openLinkedBoard(linkId);
        return;
      }
      if (!(window.Desktop && Desktop.isElectron() && (typeof Desktop.saveBoardArchive === 'function' || typeof Desktop.saveFiles === 'function'))) {
        mdbToast(' ' + t('pl_boardCreateErr'));
        return;
      }
      try {
        var baseName = plannerBoardEntryBaseName(source);
        if (typeof Desktop.saveBoardArchive === 'function') {
          var sessionData = plannerBoardEntrySessionData(source, linkId);
          var now = Date.now();
          var manifest = {
            version: 1,
            format: 'cstz',
            title: baseName,
            classGroup: String(source && source.classId || ''),
            plannerEntryIds: linkId ? [linkId] : [],
            plannerEntryId: linkId,
            pageCount: 1,
            nodeCount: 0,
            createdAt: Number(sessionData && sessionData._createdAt) || now,
            dateCreated: (sessionData && sessionData.dateCreated) || new Date(now).toISOString(),
            updatedAt: now,
            savedAt: now
          };
          var archiveEntries = [
            { name: 'manifest.json', data: JSON.stringify(manifest, null, 2), encoding: 'utf8', store: true },
            { name: 'board.json', data: JSON.stringify(sessionData, null, 2), encoding: 'utf8', store: true }
          ];
          var classSubdir = (source && source.classId)
            ? String(plannerClassDisplayName(source.classId) || '').trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_')
            : '';
          var result = await Desktop.saveBoardArchive('mindmaps', baseName + '.cstz', archiveEntries, classSubdir || undefined);
          if (!result || result.ok === false) {
            throw new Error(result && result.error ? result.error : t('pl_boardCreateErr'));
          }
        } else {
          var result = await Desktop.saveFiles('mindmaps', [{
            filename: plannerBoardEntryFileName(source),
            subdir: plannerBoardEntryFolderName(source),
            content: plannerBoardEntryFileContent(source, linkId),
            encoding: 'utf8'
          }]);
          if (!result || result.ok === false) {
            throw new Error(result && result.error ? result.error : t('pl_boardCreateErr'));
          }
        }
        await loadBoardSessions();
        plannerUpdateBoardEntryControls(source);
        openLinkedBoard(linkId);
      } catch (err) {
        mdbToast(' ' + (err && err.message ? err.message : t('pl_boardCreateErr')));
      }
    }

    async function plannerUpdateBoardFileSlotsOnDisk(relativePath, patch) {
      if (!relativePath || !window.Desktop || !Desktop.isElectron()) return false;
      var normRel = String(relativePath).replace(/\\/g, '/');
      try {
        var res = null;
        if (typeof Desktop.updateBoardArchiveMeta === 'function') {
          res = await Desktop.updateBoardArchiveMeta('mindmaps', normRel, {
            plannerEntryIds: patch && Array.isArray(patch.setIds) ? patch.setIds : undefined,
            addPlannerEntryIds: patch && patch.addIds ? patch.addIds : undefined,
            removePlannerEntryIds: patch && patch.removeIds ? patch.removeIds : undefined,
            classGroup: patch && patch.classGroup ? patch.classGroup : undefined
          });
        }
        // Invalidate cache keys for this relativePath
        Object.keys(_plannerBoardMetaCache || {}).forEach(function (k) {
          if (k === normRel || k.startsWith(normRel + ':')) {
            delete _plannerBoardMetaCache[k];
          }
        });
        _savePlannerBoardMetaCache();

        if (window.LinksService) {
          var bUrn = LinksService.makeUrn('board', normRel);
          if (patch && patch.addIds && typeof LinksService.addLink === 'function') {
            _plannerNormalizeEntryIds(patch.addIds).forEach(function (sid) {
              LinksService.addLink(bUrn, LinksService.makeUrn('planner', sid), { relation: 'planner_slot' }).catch(function () {});
            });
          }
          if (patch && patch.removeIds && typeof LinksService.removeLink === 'function') {
            _plannerNormalizeEntryIds(patch.removeIds).forEach(function (sid) {
              LinksService.removeLink(bUrn, LinksService.makeUrn('planner', sid)).catch(function () {});
            });
          }
        }
        return !!(res && res.ok);
      } catch (err) {
        console.warn('plannerUpdateBoardFileSlotsOnDisk error:', err);
        return false;
      }
    }

    var _pendingBoardLinkSource = null;
    var _pendingBoardLinkEntry = null;
    var _pendingBoardLinkSlotSet = new Set();

    function plannerBoardLinkPickerAction(entryId) {
      var id = String(entryId || _plannerBoardMenuEntryId || editingId || '').trim();
      plannerHideBoardEntryMenu();
      var entry = id ? entries.find(function (e) { return e.id === id; }) : null;
      var draft = !entry ? plannerBoardDraftEntryFromModal() : null;
      var slotDraft = (!entry && !draft) ? plannerBoardDraftEntryFromSlot(_plannerBoardMenuSlot) : null;
      var source = entry || draft || slotDraft;
      if (!source) return;
      openBoardLinkModal(source, entry);
    }

    function plannerBoardLinkPickerModalAction() {
      var id = String(editingId || '').trim();
      var entry = id ? entries.find(function (e) { return e.id === id; }) : null;
      var draft = plannerBoardDraftEntryFromModal();
      var source = entry || draft;
      if (!source) return;
      openBoardLinkModal(source, entry);
    }

    async function plannerBoardUnlinkAction(entryId) {
      var id = String(entryId || _plannerBoardMenuEntryId || editingId || '').trim();
      plannerHideBoardEntryMenu();
      var entry = id ? entries.find(function (e) { return e.id === id; }) : null;
      var draft = !entry ? plannerBoardDraftEntryFromModal() : null;
      var slotDraft = (!entry && !draft) ? plannerBoardDraftEntryFromSlot(_plannerBoardMenuSlot) : null;
      var source = entry || draft || slotDraft;
      if (!source) return;

      var linkId = entry && entry.id ? String(entry.id) : plannerBoardLinkId({ classId: source.classId, date: source.date, time: source.time }, null);
      if (!linkId) return;
      var sessions = boardSessionsByEntryId[linkId] || [];
      for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        if (s && s.relativePath) {
          await plannerUpdateBoardFileSlotsOnDisk(s.relativePath, { removeIds: [linkId] });
        }
      }
      await loadBoardSessions();
      plannerUpdateBoardEntryControls(source);
      render();
      showToast(t('pl_boardUnlinked') || 'Board file unlinked');
    }

    async function openBoardLinkModal(source, entry) {
      _pendingBoardLinkSource = source;
      _pendingBoardLinkEntry = entry;
      if (!plannerBoardFilesList.length) {
        await loadBoardSessions();
      }
      var infoEl = document.getElementById('board-link-slot-info');
      var clsName = source.classId ? plannerClassDisplayName(source.classId) : t('pl_noClass');
      var dateStr = source.date || '';
      var topicStr = source.topic || (entry && entry.topic) || '';
      if (infoEl) {
        infoEl.innerHTML = '<strong>' + esc(clsName) + '</strong> &bull; ' + esc(dateStr) + (topicStr ? ' &bull; <em>' + esc(topicStr) + '</em>' : '');
      }

      var curLinkId = entry && entry.id ? String(entry.id) : plannerBoardLinkId({ classId: source.classId, date: source.date, time: source.time }, null);
      var existingSessions = (curLinkId && boardSessionsByEntryId[curLinkId]) ? boardSessionsByEntryId[curLinkId] : [];
      var existingRelPath = (existingSessions.length && existingSessions[0].relativePath) ? existingSessions[0].relativePath : '';

      var sel = document.getElementById('board-link-file-select');
      if (sel) {
        sel.innerHTML = '';
        if (!plannerBoardFilesList.length) {
          var optEmpty = document.createElement('option');
          optEmpty.value = '';
          optEmpty.textContent = t('pl_noSavedBoardFiles') || '-- No saved Board files found --';
          sel.appendChild(optEmpty);
        } else {
          var optNone = document.createElement('option');
          optNone.value = '';
          optNone.textContent = '-- ' + (t('pl_linkBoardFile') || 'Select saved Board file') + ' --';
          sel.appendChild(optNone);
          plannerBoardFilesList.forEach(function (bf) {
            var opt = document.createElement('option');
            opt.value = bf.relativePath;
            var clsPart = bf.classGroup ? (plannerClassDisplayName(bf.classGroup) || bf.classGroup) : '';
            var slotCount = Array.isArray(bf.plannerEntryIds) ? bf.plannerEntryIds.length : 0;
            opt.textContent = (bf.name || bf.filename) + (clsPart ? ' (' + clsPart + ')' : '') + (slotCount > 0 ? ' [' + slotCount + ' slot' + (slotCount > 1 ? 's' : '') + ']' : '');
            sel.appendChild(opt);
          });
        }
        if (existingRelPath) {
          sel.value = existingRelPath;
        }
      }

      var unlinkBtn = document.getElementById('board-unlink-btn');
      if (unlinkBtn) unlinkBtn.style.display = existingSessions.length ? 'inline-block' : 'none';

      onBoardLinkFileSelectChange();
      openModal('boardLinkModal');
    }

    function onBoardLinkFileSelectChange() {
      var sel = document.getElementById('board-link-file-select');
      var sectionEl = document.getElementById('board-link-multi-slots-section');
      var listEl = document.getElementById('board-link-multi-slots-list');
      if (!sel || !sectionEl || !listEl) return;
      var chosenRelPath = sel.value;
      if (!chosenRelPath) {
        sectionEl.style.display = 'none';
        _pendingBoardLinkSlotSet = new Set();
        return;
      }

      var bf = plannerBoardFilesList.find(function (x) { return x.relativePath === chosenRelPath; });
      var currentSlotId = '';
      if (_pendingBoardLinkEntry && _pendingBoardLinkEntry.id) {
        currentSlotId = String(_pendingBoardLinkEntry.id);
      } else if (_pendingBoardLinkSource) {
        currentSlotId = plannerBoardLinkId({ classId: _pendingBoardLinkSource.classId, date: _pendingBoardLinkSource.date, time: _pendingBoardLinkSource.time }, null);
      }

      _pendingBoardLinkSlotSet = new Set(bf && Array.isArray(bf.plannerEntryIds) ? bf.plannerEntryIds : []);
      if (currentSlotId) _pendingBoardLinkSlotSet.add(currentSlotId);

      // Build list of candidate slots (currently linked slots + slots from active/target class)
      var targetClassId = (_pendingBoardLinkSource && _pendingBoardLinkSource.classId) || (bf && bf.classGroup) || '';
      var candidateEntries = entries.filter(function (e) {
        if (!e || !e.id) return false;
        if (_pendingBoardLinkSlotSet.has(e.id)) return true;
        if (targetClassId && e.classId === targetClassId) return true;
        return false;
      }).slice().sort(function (a, b) {
        return String(a.date || '').localeCompare(String(b.date || '')) || String(a.time || '').localeCompare(String(b.time || ''));
      });

      listEl.innerHTML = '';
      if (!candidateEntries.length && currentSlotId) {
        var singleRow = document.createElement('label');
        singleRow.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:0.78rem;font-weight:700;padding:4px 6px;border-radius:4px;background:#e4f2ea;border:1.5px solid #333;cursor:pointer;';
        var cb0 = document.createElement('input');
        cb0.type = 'checkbox';
        cb0.checked = true;
        cb0.onchange = function () {
          if (cb0.checked) _pendingBoardLinkSlotSet.add(currentSlotId);
          else _pendingBoardLinkSlotSet.delete(currentSlotId);
        };
        var txt0 = document.createElement('span');
        txt0.textContent = (_pendingBoardLinkSource && _pendingBoardLinkSource.date ? _pendingBoardLinkSource.date : currentSlotId) + (_pendingBoardLinkSource && _pendingBoardLinkSource.topic ? ' · ' + _pendingBoardLinkSource.topic : '');
        singleRow.appendChild(cb0);
        singleRow.appendChild(txt0);
        listEl.appendChild(singleRow);
      } else {
        candidateEntries.forEach(function (e) {
          var isChecked = _pendingBoardLinkSlotSet.has(e.id);
          var row = document.createElement('label');
          row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:0.78rem;font-weight:' + (isChecked ? '800' : '600') + ';padding:4px 6px;border-radius:4px;background:' + (isChecked ? '#e4f2ea' : '#fff') + ';border:1.5px solid ' + (isChecked ? '#333' : '#ccc') + ';cursor:pointer;';
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = isChecked;
          cb.onchange = function () {
            if (cb.checked) _pendingBoardLinkSlotSet.add(e.id);
            else _pendingBoardLinkSlotSet.delete(e.id);
            row.style.background = cb.checked ? '#e4f2ea' : '#fff';
            row.style.borderColor = cb.checked ? '#333' : '#ccc';
            row.style.fontWeight = cb.checked ? '800' : '600';
          };
          var clsLbl = e.classId ? plannerClassDisplayName(e.classId) : '';
          var lblTxt = (e.date || '') + (e.time ? ' ' + e.time : '') + (clsLbl ? ' · ' + clsLbl : '') + (e.topic ? ' · ' + e.topic : '');
          var span = document.createElement('span');
          span.textContent = lblTxt;
          row.appendChild(cb);
          row.appendChild(span);
          listEl.appendChild(row);
        });
      }
      sectionEl.style.display = 'block';
    }

    async function boardLinkConfirmAction() {
      var sel = document.getElementById('board-link-file-select');
      var chosenRelPath = sel ? sel.value : '';
      if (!chosenRelPath) {
        closeModal('boardLinkModal');
        return;
      }

      var ent = _pendingBoardLinkEntry;
      var src = _pendingBoardLinkSource;
      if (!ent && src && src.date && src.classId) {
        var oldSchedId = plannerBoardLinkId({ classId: src.classId, date: src.date, time: src.time }, null);
        ent = {
          id: uid(),
          classId: src.classId || '',
          date: src.date,
          time: src.time || '',
          timeEnd: src.timeEnd || '',
          type: 'lesson',
          topic: src.topic || ''
        };
        entries.push(ent);
        await persistEntries();
        if (oldSchedId && _pendingBoardLinkSlotSet.has(oldSchedId)) {
          _pendingBoardLinkSlotSet.delete(oldSchedId);
        }
        _pendingBoardLinkSlotSet.add(ent.id);
      }

      var finalIds = Array.from(_pendingBoardLinkSlotSet).filter(Boolean);
      await plannerUpdateBoardFileSlotsOnDisk(chosenRelPath, {
        setIds: finalIds,
        classGroup: (src && src.classId) || undefined
      });

      closeModal('boardLinkModal');
      await loadBoardSessions();
      if (src) plannerUpdateBoardEntryControls(ent || src);
      render();
      showToast(t('saved'));
    }

    async function boardLinkUnlinkAction() {
      var src = _pendingBoardLinkSource;
      var ent = _pendingBoardLinkEntry;
      var linkId = ent && ent.id ? String(ent.id) : (src ? plannerBoardLinkId({ classId: src.classId, date: src.date, time: src.time }, null) : '');
      closeModal('boardLinkModal');
      if (!linkId) return;
      var sessions = boardSessionsByEntryId[linkId] || [];
      for (var i = 0; i < sessions.length; i++) {
        if (sessions[i] && sessions[i].relativePath) {
          await plannerUpdateBoardFileSlotsOnDisk(sessions[i].relativePath, { removeIds: [linkId] });
        }
      }
      await loadBoardSessions();
      if (src) plannerUpdateBoardEntryControls(ent || src);
      render();
      showToast(t('pl_boardUnlinked') || 'Board file unlinked');
    }

    async function boardLinkCreateNewAction() {
      var src = _pendingBoardLinkSource;
      var ent = _pendingBoardLinkEntry;
      closeModal('boardLinkModal');
      if (!src) return;
      if (!ent && src.date && src.classId) {
        ent = {
          id: uid(),
          classId: src.classId,
          date: src.date,
          time: src.time || '',
          timeEnd: src.timeEnd || '',
          type: 'lesson',
          topic: src.topic || ''
        };
        entries.push(ent);
        await persistEntries();
      }
      if (ent && ent.id) {
        await plannerBoardEntryAction(ent.id);
      }
    }

    if (!document._plannerBoardMenuDismissBound) {
      document._plannerBoardMenuDismissBound = true;
      document.addEventListener('click', function (event) {
        if (!event.target || !event.target.closest || !event.target.closest('#planner-board-menu')) {
          _plannerBoardMenuEntryId = '';
          _plannerBoardMenuSlot = null;
          plannerHideBoardEntryMenu();
        }
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          var menu = document.getElementById('planner-board-menu');
          if (menu && menu.style.display !== 'none') {
            _plannerBoardMenuEntryId = '';
            _plannerBoardMenuSlot = null;
            plannerHideBoardEntryMenu();
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          }
        }
      });
    }

    function onEntryClassChange() {
      var selectedIds = getSelectedEntryClassIds();
      var cid = selectedIds[0] || '';
      var sel = document.getElementById('e-obj-sel'), prev = sel.value;
      while (sel.options.length > 2) sel.remove(1);
      ((cfg.classes[cid] || {}).objectives || []).forEach(function (o) {
        sel.insertBefore(new Option(o, o), sel.options[sel.options.length - 1]);
      });
      var found = Array.from(sel.options).some(function (o) { return o.value === prev; });
      sel.value = found ? prev : '';
      document.getElementById('e-obj-custom').style.display = sel.value === '__other__' ? '' : 'none';
      if (!editingId) plannerUpdateBoardEntryControls(null);
    }
    function onObjSelChange() {
      document.getElementById('e-obj-custom').style.display =
        document.getElementById('e-obj-sel').value === '__other__' ? '' : 'none';
    }

    // ── Recurrence helpers ────────────────────────────────────────────────────────
    function onEntryRecurChange() {
      var freq = document.getElementById('e-recur-freq').value;
      var show = !!freq;
      var ig = document.getElementById('e-recur-interval-grp');
      var eg = document.getElementById('e-recur-end-grp');
      if (ig) ig.style.display = show ? '' : 'none';
      if (eg) eg.style.display = show ? '' : 'none';
      var lbl = document.getElementById('e-recur-freq-lbl');
      if (lbl) {
        var map = { daily: t('pl_recurDays'), weekly: t('pl_recurWeeks'), monthly: t('pl_recurMonths') };
        lbl.textContent = map[freq] || '';
      }
    }
    function onEntryRecurEndChange() {
      var isCount = document.getElementById('e-recur-end-count') && document.getElementById('e-recur-end-count').checked;
      var cEl = document.getElementById('e-recur-count');
      var uEl = document.getElementById('e-recur-until');
      if (cEl) cEl.disabled = !isCount;
      if (uEl) uEl.disabled = !!isCount;
    }
    function getEntryRecurRule() {
      var freq = (document.getElementById('e-recur-freq') || {}).value;
      if (!freq) return null;
      var interval = Math.max(1, parseInt((document.getElementById('e-recur-interval') || {}).value) || 1);
      var isCount = document.getElementById('e-recur-end-count') && document.getElementById('e-recur-end-count').checked;
      if (isCount) {
        return {
          freq: freq, interval: interval, endType: 'count',
          count: Math.max(1, parseInt((document.getElementById('e-recur-count') || {}).value) || 5)
        };
      } else {
        return {
          freq: freq, interval: interval, endType: 'until',
          until: (document.getElementById('e-recur-until') || {}).value || ''
        };
      }
    }
    function populateEntryRecurFields(entry) {
      var freqEl = document.getElementById('e-recur-freq');
      if (!freqEl) return;
      var rule = entry && entry.recurrenceRule;
      freqEl.value = (rule && rule.freq) || '';
      if (rule && rule.interval) document.getElementById('e-recur-interval').value = rule.interval;
      if (rule && rule.endType === 'until') {
        document.getElementById('e-recur-end-until').checked = true;
        document.getElementById('e-recur-until').value = rule.until || '';
      } else {
        document.getElementById('e-recur-end-count').checked = true;
        if (rule && rule.count) document.getElementById('e-recur-count').value = rule.count;
      }
      onEntryRecurChange();
      onEntryRecurEndChange();
    }
    function generateRecurringDates(startDate, rule) {
      var dates = [], d = new Date(startDate + 'T12:00:00');
      var limit = rule.endType === 'count' ? Math.min(rule.count, 365) : 365;
      var endDt = rule.endType === 'until' && rule.until ? new Date(rule.until + 'T12:00:00') : null;
      for (var i = 0; i < limit; i++) {
        if (endDt && d > endDt) break;
        dates.push(d.toISOString().slice(0, 10));
        if (rule.freq === 'daily') d.setDate(d.getDate() + rule.interval);
        else if (rule.freq === 'weekly') d.setDate(d.getDate() + 7 * rule.interval);
        else if (rule.freq === 'monthly') d.setMonth(d.getMonth() + rule.interval);
      }
      return dates;
    }
    function openRecurScopeModal(action, entryId) {
      _recurScopeAction = action;
      _recurScopeEntryId = entryId;
      var titleEl = document.getElementById('recur-scope-title');
      if (titleEl) titleEl.textContent = action === 'delete' ? t('pl_recurScopeDeleteTitle') : t('pl_recurScopeEditTitle');
      document.getElementById('recurScopeModal').style.display = 'flex';
    }
    function cancelRecurScope() {
      _recurScopeAction = _recurScopeEntryId = _editingRecurScope = null;
      document.getElementById('recurScopeModal').style.display = 'none';
    }
    async function applyRecurScope(scope) {
      var action = _recurScopeAction;
      var entryId = _recurScopeEntryId;
      document.getElementById('recurScopeModal').style.display = 'none';
      _recurScopeAction = _recurScopeEntryId = null;

      if (action === 'delete') {
        var entry = entries.find(function (e) { return e.id === entryId; });
        if (!entry) return;
        var rid = entry.recurrenceId;
        if (scope === 'this') {
          entries = entries.filter(function (e) { return e.id !== entryId; });
        } else if (scope === 'all') {
          entries = entries.filter(function (e) { return e.recurrenceId !== rid; });
        } else {
          var cutDate = entry.date;
          entries = entries.filter(function (e) { return !(e.recurrenceId === rid && e.date >= cutDate); });
        }
        await persistEntries();
        closeModal('entryModal');
        render();
      } else {
        _editingRecurScope = scope;
        openEditEntry(entryId);
      }
    }

    function commitEntry() {
      var classIds = getSelectedEntryClassIds();
      var classId = classIds[0] || '';
      var date = document.getElementById('e-date').value;
      if (!date) return;
      var objSel = document.getElementById('e-obj-sel').value;
      var objective = objSel === '__other__' ? document.getElementById('e-obj-custom').value.trim() : objSel;
      var prevEntry = editingId ? entries.find(function (e) { return e.id === editingId; }) : null;
      var prevType = prevEntry ? prevEntry.type : null;
      var newType = document.getElementById('e-type').value;
      var recurRule = _editingRecurScope === 'this' ? null : getEntryRecurRule();

      var customFields = {};
      document.querySelectorAll('#e-custom-fields textarea[data-cf-key]').forEach(function (inp) {
        var v = inp.value.trim(); if (v) customFields[inp.dataset.cfKey] = v;
      });

      function makeEntryBase(overrideId, overrideDate, recurId, recurIndex) {
        return {
          id: overrideId || uid(),
          classId: classId,
          classIds: classIds.length > 1 ? classIds : undefined,
          date: overrideDate || date,
          dateTo: (function () { var v = document.getElementById('e-date-to').value; return (v && v > (overrideDate || date)) ? v : undefined; })(),
          time: document.getElementById('e-time').value,
          timeEnd: document.getElementById('e-time-end').value,
          type: newType,
          topic: document.getElementById('e-topic').value.trim(),
          objective: objective,
          notes: document.getElementById('e-notes').value.trim(),
          reminder: (function () { var v = document.getElementById('e-reminder').value; return v ? { minutesBefore: parseInt(v, 10) } : null; })(),
          reminderEnd: (function () { var v = document.getElementById('e-reminder-end').value; return v ? { minutesBefore: parseInt(v, 10) } : null; })(),
          customFields: Object.keys(customFields).length ? customFields : undefined,
          gsLink: (newType === 'test' && prevEntry && prevEntry.gsLink) ? prevEntry.gsLink : null,
          recurrenceId: recurId || undefined,
          recurrenceIndex: recurIndex != null ? recurIndex : undefined,
          recurrenceRule: recurId && recurRule ? recurRule : undefined
        };
      }

      var scope = _editingRecurScope;
      _editingRecurScope = null;

      // Multi-class "No Class": update matching entries and fill matching schedule slots.
      if (!editingId && !scope && !recurRule && newType === 'no-class' && classIds.length > 1) {
        var dateToVal = document.getElementById('e-date-to').value || '';
        var targetDateTo = (dateToVal && dateToVal > date) ? dateToVal : date;
        var targetDates = [];
        var td = new Date(date + 'T12:00:00');
        var tdEnd = new Date(targetDateTo + 'T12:00:00');
        while (td <= tdEnd) {
          targetDates.push(td.toISOString().slice(0, 10));
          td.setDate(td.getDate() + 1);
        }
        var targetTime = document.getElementById('e-time').value || '';
        var targetTimeEnd = document.getElementById('e-time-end').value || '';
        var hasTimeFilter = !!(targetTime || targetTimeEnd);
        var updatedAny = false;

        entries = entries.map(function (e) {
          var cids = entryClassIds(e);
          if (!cids.length) return e;

          var hasClassMatch = cids.some(function (cid) { return classIds.indexOf(cid) >= 0; });
          if (!hasClassMatch) return e;

          var dates = expandEntryDates(e);
          var hasDateMatch = targetDates.some(function (ds) { return dates.indexOf(ds) >= 0; });
          if (!hasDateMatch) return e;

          if (hasTimeFilter) {
            if ((e.time || '') !== targetTime) return e;
            if ((e.timeEnd || '') !== targetTimeEnd) return e;
          }

          updatedAny = true;
          return Object.assign({}, e, { type: 'no-class' });
        });

        // Also apply to matching scheduled class lesson slots across the target date range.
        targetDates.forEach(function (targetDate) {
          var targetDow = new Date(targetDate + 'T12:00:00').getDay();
          classIds.forEach(function (cid) {
            var sched = (cfg.classes[cid] || {}).schedule || [];
            var matchingSlots = sched.filter(function (s) {
              if (parseInt(s.day, 10) !== targetDow) return false;
              if (!hasTimeFilter) return true;
              return (s.time || '') === targetTime && (s.timeEnd || '') === targetTimeEnd;
            });
            if (!matchingSlots.length) return;

            matchingSlots.forEach(function (slot) {
              var slotTime = slot.time || '';
              var slotTimeEnd = slot.timeEnd || '';
              var hasCoveringEntry = entries.some(function (e) {
                var cids = entryClassIds(e);
                if (cids.indexOf(cid) < 0) return false;
                var dates = expandEntryDates(e);
                if (dates.indexOf(targetDate) < 0) return false;
                return (e.time || '') === slotTime && (e.timeEnd || '') === slotTimeEnd;
              });
              if (hasCoveringEntry) return;

              entries.push({
                id: uid(),
                classId: cid,
                date: targetDate,
                time: slotTime,
                timeEnd: slotTimeEnd,
                type: 'no-class',
                topic: '',
                objective: '',
                notes: '',
                customFields: undefined,
                gsLink: null
              });
              updatedAny = true;
            });
          });
        });

        if (!updatedAny) {
          showToast(t('pl_noEntries'));
          return;
        }

        persistEntries();
        closeModal('entryModal');
        render();
        return;
      }

      if (recurRule) {
        // ── Recurring save ────────────────────────────────────────────────────────
        var rid;
        var startDate = date;
        if (scope === 'all' && prevEntry && prevEntry.recurrenceId) {
          rid = prevEntry.recurrenceId;
          // Find series start
          var seriesDates = entries.filter(function (e) { return e.recurrenceId === rid; }).map(function (e) { return e.date; }).sort();
          startDate = seriesDates[0] || date;
          entries = entries.filter(function (e) { return e.recurrenceId !== rid; });
        } else if (scope === 'future' && prevEntry && prevEntry.recurrenceId) {
          rid = prevEntry.recurrenceId;
          entries = entries.filter(function (e) { return !(e.recurrenceId === rid && e.date >= date); });
        } else {
          rid = 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
          if (editingId) entries = entries.filter(function (e) { return e.id !== editingId; });
        }
        var dates = generateRecurringDates(startDate, recurRule);
        dates.forEach(function (ds, idx) {
          entries.push(makeEntryBase(null, ds, rid, idx));
        });
      } else if (scope === 'all' && prevEntry && prevEntry.recurrenceId) {
        // ── Edit all — no recurrence, update all instances' content ──────────────
        var rid2 = prevEntry.recurrenceId;
        entries = entries.map(function (e) {
          if (e.recurrenceId !== rid2) return e;
          return makeEntryBase(e.id, e.date, rid2, e.recurrenceIndex);
        });
      } else if (scope === 'future' && prevEntry && prevEntry.recurrenceId) {
        var rid3 = prevEntry.recurrenceId;
        entries = entries.map(function (e) {
          if (!(e.recurrenceId === rid3 && e.date >= date)) return e;
          return makeEntryBase(e.id, e.date, rid3, e.recurrenceIndex);
        });
      } else {
        // ── Single entry save ────────────────────────────────────────────────────
        var singleId = scope === 'this' ? uid() : (editingId || uid());
        var entry = makeEntryBase(singleId, date, null, null);
        if (editingId) {
          var idx = entries.findIndex(function (e) { return e.id === editingId; });
          if (idx >= 0) entries[idx] = entry; else entries.push(entry);
        } else {
          entries.push(entry);
        }
      }

      persistEntries();

      // If the saved entry falls outside the active semester, reveal it automatically
      var _semForSave = getActiveSem();
      if (!showOutsideTerm && _semForSave && date &&
        (date < _semForSave.semesterStart || date > _semForSave.semesterEnd)) {
        showOutsideTerm = true;
        syncToggleSeg('outsideBtn', 'all');
        saveViewFlags();
      }

      closeModal('entryModal');
      render();

      // Grade-sheet sync (async, non-blocking) — only for single entries
      if (!recurRule) {
        var syncEntry = entries.find(function (e) { return e.id === singleId; }) || prevEntry;
        if (prevType === 'test' && newType !== 'test') {
          if (prevEntry && prevEntry.gsLink) removeTestFromGradeSheet(prevEntry);
          if (syncEntry) syncEntry.gsLink = null;
        } else if (newType === 'test' && syncEntry) {
          if (syncEntry.gsLink) {
            var curSem = getGsSemesterForDate(syncEntry.date);
            var classChanged = prevEntry && (prevEntry.classId !== syncEntry.classId);
            var semChanged = syncEntry.gsLink.semester && (syncEntry.gsLink.semester !== curSem);
            if (classChanged || semChanged) {
              if (prevEntry && prevEntry.gsLink) removeTestFromGradeSheet(prevEntry);
              syncEntry.gsLink = null;
              syncTestToGradeSheet(syncEntry, false);
            } else {
              syncTestToGradeSheet(syncEntry, true);
            }
          } else {
            syncTestToGradeSheet(syncEntry, false);
          }
        }
      }

      var targetSyncEntry = entries.find(function (e) { return e.id === (singleId || editingId); });
      if (targetSyncEntry && typeof syncPlannerEntryToLinksService === 'function') {
        syncPlannerEntryToLinksService(targetSyncEntry);
        if (typeof plannerUpdateEntryLinkBadges === 'function') {
          plannerUpdateEntryLinkBadges(new Set([targetSyncEntry.id]));
        }
      }
    }

    function deleteCurrentEntry() {
      if (!editingId) return;
      var entry = entries.find(function (e) { return e.id === editingId; });
      if (entry && entry.recurrenceId) {
        openRecurScopeModal('delete', editingId);
        return;
      }
      var doDelete = async function () {
        var toDeleteId = editingId;
        entries = entries.filter(function (e) { return e.id !== toDeleteId; });
        await persistEntries();
        closeModal('entryModal');
        render();
        if (entry && entry.gsLink) removeTestFromGradeSheet(entry);
        if (typeof cleanPlannerEntryFromLinksService === 'function') cleanPlannerEntryFromLinksService(toDeleteId);
      };
      if (entry && entry.gsLink) {
        showConfirm(t('pl_confirmDeleteTest'), doDelete);
      } else {
        doDelete();
      }
    }

    function getUpcomingTargetSlots(srcEntry) {
      var sem = getActiveSem();
      if (!sem || !sem.semesterStart || !sem.semesterEnd) return [];

      var prevShowPast = showPast;
      var prevShowOutsideTerm = showOutsideTerm;
      var prevFilterClasses = filterClasses;
      var prevFilterUnassigned = filterUnassigned;

      try {
        showPast = true;
        showOutsideTerm = true;
        filterUnassigned = false;
        filterClasses = new Set();

        var allSlots = buildSlots(sem) || [];
        var today = new Date().toISOString().slice(0, 10);

        var upcoming = allSlots.filter(function (s) {
          if (s.isGlobalHoliday) return false;
          return s.date >= today;
        });

        upcoming.sort(function (a, b) {
          if (a.date !== b.date) return a.date < b.date ? -1 : 1;
          var at = a.time || '';
          var bt = b.time || '';
          return at < bt ? -1 : at > bt ? 1 : 0;
        });

        return upcoming.slice(0, 80);
      } finally {
        showPast = prevShowPast;
        showOutsideTerm = prevShowOutsideTerm;
        filterUnassigned = prevFilterUnassigned;
        filterClasses = prevFilterClasses;
      }
    }

    function populateDupSlotPicker(srcEntry) {
      var sel = document.getElementById('dup-slot-select');
      var summaryEl = document.getElementById('dup-slot-summary');
      if (!sel) return;

      sel.innerHTML = '<option value="">' + esc(t('pl_selectTargetSlot')) + '</option>';
      if (summaryEl) summaryEl.textContent = '';

      var slots = getUpcomingTargetSlots(srcEntry);
      var selectedVal = '';

      slots.forEach(function (s) {
        var clsName = s.classId ? plannerClassDisplayName(s.classId) : t('pl_noClass');
        var dObj = new Date(s.date + 'T12:00:00');
        var dateFmt = isNaN(dObj.getTime()) ? s.date : dObj.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        var timeFmt = (s.time || '') + (s.timeEnd ? '–' + s.timeEnd : '');
        var statusTxt = s.entry ? (' (' + t('pl_slotOccupied') + ': ' + (s.entry.topic || t('pl_typeLesson')).slice(0, 25) + ')') : (' (' + t('pl_slotEmpty') + ')');

        var label = dateFmt + (timeFmt ? ' · ' + timeFmt : '') + ' · ' + clsName + statusTxt;
        var valObj = {
          classId: s.classId || '',
          date: s.date,
          time: s.time || '',
          timeEnd: s.timeEnd || ''
        };
        var valStr = JSON.stringify(valObj);

        var opt = document.createElement('option');
        opt.value = valStr;
        opt.textContent = label;

        if (!selectedVal && !s.entry && (s.date !== srcEntry.date || s.classId !== srcEntry.classId)) {
          selectedVal = valStr;
        }

        sel.appendChild(opt);
      });

      if (selectedVal) {
        sel.value = selectedVal;
        onDupSlotSelectChange(selectedVal);
      }
    }

    function onDupSlotSelectChange(valStr) {
      var summaryEl = document.getElementById('dup-slot-summary');
      if (!valStr) {
        if (summaryEl) summaryEl.textContent = '';
        return;
      }
      try {
        var info = JSON.parse(valStr);
        if (info.classId) populateEntryClassPills([info.classId]);
        else populateEntryClassPills([]);
        document.getElementById('e-date').value = info.date || '';
        document.getElementById('e-date-to').value = '';
        document.getElementById('e-time').value = info.time || '';
        document.getElementById('e-time-end').value = info.timeEnd || '';

        if (summaryEl) {
          var clsName = info.classId ? plannerClassDisplayName(info.classId) : t('pl_noClass');
          var dObj = new Date(info.date + 'T12:00:00');
          var dateFmt = isNaN(dObj.getTime()) ? info.date : dObj.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
          summaryEl.textContent = '→ Target: ' + clsName + ' on ' + dateFmt + (info.time ? (' (' + info.time + (info.timeEnd ? '–' + info.timeEnd : '') + ')') : '');
        }
      } catch (e) { }
    }

    function duplicateCurrentEntry() {
      if (!editingId) return;
      var src = entries.find(function (e) { return e.id === editingId; });
      if (!src) return;
      _editingRecurScope = null;

      // Switch to add-mode with all fields cloned (no gsLink or recurrence on copy)
      editingId = null;
      document.getElementById('entry-modal-title').textContent = t('pl_entryModalDuplicate');
      document.getElementById('del-entry-btn').style.display = 'none';
      document.getElementById('dup-entry-btn').style.display = 'none';

      // Hide class selector pills and show Target Slot & Date picker
      var classGrp = document.getElementById('e-class-field-group');
      if (classGrp) classGrp.style.display = 'none';
      var slotGrp = document.getElementById('dup-slot-picker-group');
      if (slotGrp) slotGrp.style.display = 'block';

      populateDupSlotPicker(src);

      document.getElementById('e-date').value = src.date || '';
      document.getElementById('e-date-to').value = src.dateTo || '';
      document.getElementById('e-time').value = src.time || '';
      populateEntryRecurFields(null);
      document.getElementById('e-recur-row').style.display = '';
      document.getElementById('e-time-end').value = src.timeEnd || '';
      populateTypeSelect(src.type || 'lesson');
      document.getElementById('e-topic').value = src.topic || '';
      document.getElementById('e-notes').value = src.notes || '';
      document.getElementById('e-reminder').value = (src.reminder && src.reminder.minutesBefore) ? String(src.reminder.minutesBefore) : '';
      document.getElementById('e-reminder-end').value = (src.reminderEnd && src.reminderEnd.minutesBefore) ? String(src.reminderEnd.minutesBefore) : '';
      renderCustomFieldInputs(src);
      onEntryClassChange();
      var objSel = document.getElementById('e-obj-sel');
      var objCustom = document.getElementById('e-obj-custom');
      var objVal = src.objective || '';
      var opts = Array.from(objSel.options).map(function (o) { return o.value; });
      if (opts.indexOf(objVal) >= 0) { objSel.value = objVal; objCustom.style.display = 'none'; }
      else if (objVal) { objSel.value = '__other__'; objCustom.value = objVal; objCustom.style.display = ''; }
      else { objSel.value = ''; objCustom.style.display = 'none'; }
    }

    // ── Grade-sheet sync ───────────────────────────────────────────────────────
    function slugifyForPath(name) {
      return String(name || '').trim()
        .replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim()
        .replace(/^\.+/, '_') || '_unnamed';
    }

    function parseGradeFileContent(content) {
      try {
        var sandbox = {};
        new Function('window', content)(sandbox);
        return sandbox.GRADE_TEST_DATA || sandbox.GRADE_CLASS || null;
      } catch (e) { return null; }
    }

    async function findGradeSheetClass(classId) {
      if (!window.Desktop || !Desktop.isElectron()) return null;
      if (!classId || isUnassignedExportClassFilter(classId)) return null;

      var listResult = await Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js'] });
      if (listResult && listResult.ok && Array.isArray(listResult.files)) {
        var classFiles = listResult.files.filter(function (f) { return f.filename === '_class.js'; });
        var displayName = plannerClassDisplayName(classId);
        for (var i = 0; i < classFiles.length; i++) {
          var cf = classFiles[i];
          var res = await Desktop.readByPath('grades', cf.relativePath);
          if (res && res.content) {
            var meta = parseGradeFileContent(res.content);
            if (meta && (meta.groupId === classId || meta.className === displayName || meta.classId === classId)) {
              var classSlug = cf.relativePath.split('/')[0];
              return { meta: meta, classSlug: classSlug };
            }
          }
        }
      }

      // Auto-create Grade Sheet _class.js if not yet present
      var cName = plannerClassDisplayName(classId);
      if (!cName) return null;
      var cSlug = slugifyForPath(cName);
      var newMeta = {
        _savedAt: Date.now(),
        classId: classId,
        groupId: classId,
        className: cName,
        testCounts: { sem1: 0, sem2: 0 },
        students: []
      };
      var content = '// _savedAt: ' + newMeta._savedAt + '\nwindow.GRADE_CLASS = ' + JSON.stringify(newMeta, null, 2) + ';\n';
      await Desktop.saveText('grades', '_class.js', content, cSlug);
      return { meta: newMeta, classSlug: cSlug };
    }

    // Determine which GS semester (sem1/sem2) a date belongs to, based on planner semester order
    function getGsSemesterForDate(date) {
      var semKey = getSemToggleKeyFor(activeSemId);
      if (!semKey) return 'sem1';
      var n = parseInt(String(semKey).replace('sem', ''), 10);
      if (!isFinite(n) || n <= 0) return 'sem1';
      return (n % 2 === 0) ? 'sem2' : 'sem1';
    }

    async function syncTestToGradeSheet(entry, isUpdate) {
      try {
        if (!window.Desktop || !Desktop.isElectron()) return;
        var gsInfo = await findGradeSheetClass(entry.classId);
        if (!gsInfo) {
          showToast(tFmt('pl_gsNoClass', { cls: plannerClassDisplayName(entry.classId) }), 3500);
          return;
        }

        var gsSem = getGsSemesterForDate(entry.date);

        if (isUpdate && entry.gsLink) {
          // Update existing test file
          var link = entry.gsLink;
          var testLabel = link.semester + '-test-' + String(link.testIndex + 1).padStart(2, '0');
          var existing = await Desktop.readByPath('grades', link.classSlug + '/' + testLabel + '.js');
          if (existing && existing.content) {
            var data = parseGradeFileContent(existing.content);
            if (data && data.testConfig) {
              data.testConfig.testName = entry.topic || t('pl_typeTest');
              data.testConfig.testDate = entry.date;
              data.testConfig.scope = entry.objective || '';
              var content = '// _savedAt: ' + Date.now() + '\nwindow.GRADE_TEST_DATA = ' + JSON.stringify(data, null, 2) + ';\n';
              await Desktop.saveText('grades', testLabel + '.js', content, link.classSlug);
              showToast(t('pl_gsUpdated'));
              return;
            }
          }
          // If file not found on disk, fallback to creating a new test slot
        }

        // Create: find next empty slot
        var listResult = await Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js'] });
        var testFiles = (listResult.files || []).filter(function (f) {
          return f.relativePath.startsWith(gsInfo.classSlug + '/') &&
            f.filename !== '_class.js' &&
            f.filename.startsWith(gsSem + '-test-');
        });
        var usedIndices = new Set();
        testFiles.forEach(function (f) {
          var m = f.filename.match(/test-(\d+)\.js$/);
          if (m) usedIndices.add(parseInt(m[1]) - 1);
        });
        var testIndex = -1;
        for (var i = 0; i < 8; i++) { if (!usedIndices.has(i)) { testIndex = i; break; } }
        if (testIndex < 0) { showToast(tFmt('pl_gsSlotsFull', { cls: (typeof plannerClassDisplayName === 'function' ? plannerClassDisplayName(entry.classId) : entry.classId) || entry.classId }), 3500); return; }

        var testData = {
          _savedAt: Date.now(),
          classId: gsInfo.meta.classId,
          semester: gsSem,
          testIndex: testIndex,
          testConfig: {
            coefficient: 1, fixedWeight: null,
            testName: entry.topic || t('pl_typeTest'),
            testDate: entry.date,
            scope: entry.objective || '',
            type: '', nextGradeHighlightPoints: 0,
            criteria: [], observationSections: [],
            grading: {
              mode: 'formula', passPercentGrade4: 66.67,
              modelKey: 'linear', pendingModelKey: 'linear',
              manualInputMode: 'percent',
              manualThresholds: GS_DEFAULT_THRESHOLDS,
              manualPoints: GS_DEFAULT_POINTS
            }
          },
          results: []
        };

        var testLabel = gsSem + '-test-' + String(testIndex + 1).padStart(2, '0');
        var content = '// _savedAt: ' + Date.now() + '\nwindow.GRADE_TEST_DATA = ' + JSON.stringify(testData, null, 2) + ';\n';
        var r = await Desktop.saveText('grades', testLabel + '.js', content, gsInfo.classSlug);

        if (r && r.ok) {
          // Bump testCounts in _class.js so grade-sheet shows the new column
          try {
            var classRes = await Desktop.readByPath('grades', gsInfo.classSlug + '/_class.js');
            if (classRes && classRes.content) {
              var classMeta = parseGradeFileContent(classRes.content);
              if (classMeta) {
                if (!classMeta.testCounts) classMeta.testCounts = { sem1: 0, sem2: 0 };
                if ((classMeta.testCounts[gsSem] || 0) <= testIndex) {
                  classMeta.testCounts[gsSem] = testIndex + 1;
                  classMeta._savedAt = Date.now();
                  var classContent = '// _savedAt: ' + classMeta._savedAt + '\nwindow.GRADE_CLASS = ' + JSON.stringify(classMeta, null, 2) + ';\n';
                  await Desktop.saveText('grades', '_class.js', classContent, gsInfo.classSlug);
                }
              }
            }
          } catch (e) { console.warn('planner: could not update _class.js testCounts', e); }

          // Persist the link back onto the entry
          var idx = entries.findIndex(function (e) { return e.id === entry.id; });
          if (idx >= 0) {
            entries[idx].gsLink = {
              classId: gsInfo.meta.classId, classSlug: gsInfo.classSlug,
              semester: gsSem, testIndex: testIndex
            };
            persistEntries();
            plannerUpdateGradeSheetBadges([entry.id]);
            if (window.LinksService && entry.id) {
              var pUrn = 'cmt:planner:' + entry.id;
              var eUrn = 'cmt:eval:' + gsInfo.meta.classId + ':' + gsSem + ':' + testIndex;
              var cName = (typeof plannerClassDisplayName === 'function' ? plannerClassDisplayName(entry.classId) : '') || entry.classId || '';
              var tName = entry.topic || t('pl_typeTest');
              LinksService.addLink(pUrn, eUrn, {
                relation: 'eval',
                meta: { category: 'gradesheet', auto: true, testIndex: testIndex, semester: gsSem, classId: gsInfo.meta.classId },
                sourceMeta: { type: 'planner', title: tName + (cName ? ' (' + cName + ')' : ''), subtitle: entry.date || '' },
                targetMeta: { type: 'eval', title: tName + ' (' + cName + ' • ' + (gsSem === 'sem1' ? 'Sem 1' : 'Sem 2') + ')', subtitle: 'Grade Sheet Evaluation • ' + (entry.date || '') }
              }).then(function () {
                if (typeof plannerUpdateEntryLinkBadges === 'function') plannerUpdateEntryLinkBadges(new Set([entry.id]));
              }).catch(function () {});
            }
          }
          showToast(t('pl_gsWriteOk'));
        }
      } catch (e) { console.warn('syncTestToGradeSheet error:', e); }
    }

    async function removeTestFromGradeSheet(entry) {
      if (!entry || !entry.gsLink) return;
      try {
        var link = entry.gsLink;
        var testLabel = link.semester + '-test-' + String(link.testIndex + 1).padStart(2, '0');
        var relPath = link.classSlug + '/' + testLabel + '.js';
        var existing = await Desktop.readByPath('grades', relPath);
        if (existing && existing.content) {
          var data = parseGradeFileContent(existing.content);
          var hasScores = data && (data.results || []).some(function (r) { return r.score !== null; });
          if (hasScores) {
            // Scores already entered — clear metadata, keep scores
            data.testConfig.testName = '';
            data.testConfig.testDate = '';
            var content = '// _savedAt: ' + Date.now() + '\nwindow.GRADE_TEST_DATA = ' + JSON.stringify(data, null, 2) + ';\n';
            await Desktop.saveText('grades', testLabel + '.js', content, link.classSlug);
          } else {
            await Desktop.deleteByPath('grades', relPath, { force: true });
          }
        }

        if (window.LinksService && entry.id && link.classId) {
          var pUrn = 'cmt:planner:' + entry.id;
          var eUrn = 'cmt:eval:' + link.classId + ':' + link.semester + ':' + link.testIndex;
          LinksService.removeLink(pUrn, eUrn).then(function () {
            if (typeof plannerUpdateEntryLinkBadges === 'function') plannerUpdateEntryLinkBadges(new Set([entry.id]));
          }).catch(function () {});
        }

        // Recalculate testCounts in Grade Sheet's _class.js so the column is completely deleted
        try {
          var classRes = await Desktop.readByPath('grades', link.classSlug + '/_class.js');
          if (classRes && classRes.content) {
            var classMeta = parseGradeFileContent(classRes.content);
            if (classMeta) {
              if (!classMeta.testCounts) classMeta.testCounts = { sem1: 0, sem2: 0 };
              var listRes = await Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js'] });
              var maxIndex = -1;
              (listRes.files || []).forEach(function (f) {
                if (f.relativePath.startsWith(link.classSlug + '/') && f.filename !== '_class.js' && f.filename.startsWith(link.semester + '-test-')) {
                  var m = f.filename.match(/test-(\d+)\.js$/);
                  if (m) {
                    var idxVal = parseInt(m[1], 10) - 1;
                    if (idxVal > maxIndex) maxIndex = idxVal;
                  }
                }
              });
              classMeta.testCounts[link.semester] = maxIndex + 1;
              classMeta._savedAt = Date.now();
              var classContent = '// _savedAt: ' + classMeta._savedAt + '\nwindow.GRADE_CLASS = ' + JSON.stringify(classMeta, null, 2) + ';\n';
              await Desktop.saveText('grades', '_class.js', classContent, link.classSlug);
            }
          }
        } catch (e) { console.warn('removeTestFromGradeSheet _class.js update error:', e); }

      } catch (e) { console.warn('removeTestFromGradeSheet error:', e); }

      entry.gsLink = null;
      var matchIdx = entries.findIndex(function (e) { return e.id === entry.id; });
      if (matchIdx >= 0) {
        entries[matchIdx].gsLink = null;
      }
      persistEntries();
      plannerUpdateGradeSheetBadges([entry.id]);
    }

    async function validateGradeSheetLinks() {
      if (!window.Desktop || !Desktop.isElectron()) return;
      var modified = false;
      var listResult = null;
      try {
        listResult = await Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js'] });
      } catch (e) { return; }
      if (!listResult || !listResult.ok || !Array.isArray(listResult.files)) return;

      var gradeFiles = listResult.files.map(function (f) {
        return (f.relativePath || '').replace(/\\/g, '/').toLowerCase();
      });

      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (e.type !== 'test' && e.gsLink) {
          e.gsLink = null;
          modified = true;
        } else if (e.type === 'test') {
          if (e.gsLink) {
            var link = e.gsLink;
            if (!link.semester || link.testIndex == null) {
              e.gsLink = null;
              modified = true;
              continue;
            }
            var testLabel = link.semester + '-test-' + String(link.testIndex + 1).padStart(2, '0') + '.js';
            var slugPath = (link.classSlug ? link.classSlug + '/' + testLabel : '').toLowerCase();
            var idPath = (link.classId ? link.classId + '/' + testLabel : '').toLowerCase();
            var fileExists = gradeFiles.some(function (p) {
              return (slugPath && p === slugPath) || (idPath && p === idPath) || p.endsWith('/' + testLabel.toLowerCase());
            });
            if (!fileExists) {
              await syncTestToGradeSheet(e, false);
            }
          }
        }
      }

      if (modified) {
        await persistEntries();
        plannerUpdateGradeSheetBadges(['__all__']);
      }
    }

    // ── Export ─────────────────────────────────────────────────────────────────
    var selectedExportClasses = new Set();

    function renderExportClassChips() {
      var container = document.getElementById('exp-class-chips');
      if (!container) return;
      container.innerHTML = '';

      var ids = getPlannerClassIds();

      // "All Classes" chip
      var isAll = selectedExportClasses.size === 0;
      var allChip = document.createElement('div');
      allChip.className = 'exp-chip' + (isAll ? ' active' : '');
      allChip.textContent = t('pl_allClasses') || 'All Classes';
      allChip.onclick = function () {
        selectedExportClasses.clear();
        syncExpClsSelect();
        renderExportClassChips();
      };
      container.appendChild(allChip);

      // "No assigned class" chip
      var isUnassignedSel = selectedExportClasses.has(EXPORT_CLASS_FILTER_UNASSIGNED);
      var unassignedChip = document.createElement('div');
      unassignedChip.className = 'exp-chip' + (isUnassignedSel ? ' active' : '');
      unassignedChip.textContent = t('pl_unassigned') || 'Unassigned';
      unassignedChip.onclick = function () {
        if (selectedExportClasses.has(EXPORT_CLASS_FILTER_UNASSIGNED)) {
          selectedExportClasses.delete(EXPORT_CLASS_FILTER_UNASSIGNED);
        } else {
          selectedExportClasses.add(EXPORT_CLASS_FILTER_UNASSIGNED);
        }
        syncExpClsSelect();
        renderExportClassChips();
      };
      container.appendChild(unassignedChip);

      // Individual class chips
      ids.forEach(function (cid) {
        var isSel = selectedExportClasses.has(cid);
        var chip = document.createElement('div');
        chip.className = 'exp-chip' + (isSel ? ' active' : '');
        chip.textContent = plannerClassDisplayName(cid);
        chip.onclick = function () {
          if (selectedExportClasses.has(cid)) {
            selectedExportClasses.delete(cid);
          } else {
            selectedExportClasses.add(cid);
          }
          syncExpClsSelect();
          renderExportClassChips();
        };
        container.appendChild(chip);
      });

      var count = selectedExportClasses.size === 0 ? (ids.length + 1) : selectedExportClasses.size;
      var sepGrp = document.getElementById('exp-sep-tables-group');
      var sepFilesGrp = document.getElementById('exp-sep-files-group');
      if (sepGrp) sepGrp.style.display = count >= 2 ? 'inline-flex' : 'none';
      if (sepFilesGrp) sepFilesGrp.style.display = count >= 2 ? 'inline-flex' : 'none';
    }

    function syncExpClsSelect() {
      var clsSel = document.getElementById('exp-cls');
      if (!clsSel) return;
      if (selectedExportClasses.size === 1) {
        clsSel.value = Array.from(selectedExportClasses)[0];
      } else {
        clsSel.value = '';
      }
    }

    function openExportModal() {
      var wrap = document.getElementById('exp-custom-types');
      wrap.innerHTML = '';
      (cfg.customTypes || []).forEach(function (name) {
        var id = 'exp-t-custom-' + name.replace(/\s+/g, '_');
        var lbl = document.createElement('label'); lbl.className = 'cb-label';
        lbl.innerHTML = '<input type="checkbox" id="' + esc(id) + '" checked data-custom-type="' + esc(name) + '"> <span>' + esc(name) + '</span>';
        wrap.appendChild(lbl);
      });

      selectedExportClasses.clear();
      if (filterClasses && filterClasses.size > 0) {
        filterClasses.forEach(function (cid) { selectedExportClasses.add(cid); });
      } else if (filterUnassigned) {
        selectedExportClasses.add(EXPORT_CLASS_FILTER_UNASSIGNED);
      }
      syncExpClsSelect();
      renderExportClassChips();
      renderExportStyleControls();

      if (window.ExportStylesService) {
        ExportStylesService.renderStyleSelector(document.getElementById('pl-export-style-selector-wrap'), {
          toolKey: 'planner',
          onChange: function (styleId) {
            var ifr = document.getElementById('plPreviewIframe');
            if (ifr && document.getElementById('pl-preview-modal').style.display === 'flex') {
              ExportStylesService.applyStyleToIframe(ifr, styleId);
            }
          }
        });
      }

      openModal('exportModal');
    }

    function getExportFilenameBase(clsFilter) {
      var datePart = new Date().toISOString().slice(0, 10);
      if (clsFilter && !isUnassignedExportClassFilter(clsFilter)) {
        var classTitle = plannerClassDisplayName(clsFilter) || clsFilter;
        return classTitle + ' - Planner';
      }
      if (isUnassignedExportClassFilter(clsFilter)) {
        return (t('pl_unassigned') || 'Unassigned') + ' - Planner';
      }
      return 'Planner - ' + datePart;
    }

    function getSeparateExportClassList() {
      if (selectedExportClasses.size > 0) {
        return Array.from(selectedExportClasses);
      }
      var ids = getPlannerClassIds();
      return ids.length ? ids : [''];
    }

    function getExportFilters() {
      function chk(id) { var el = document.getElementById(id); return !el || el.checked; }
      var types = {
        lesson: chk('exp-t-lesson'), test: chk('exp-t-test'),
        assignment: chk('exp-t-assignment'), holiday: chk('exp-t-holiday'),
        'no-class': chk('exp-t-noclass')
      };
      document.querySelectorAll('#exp-custom-types input[data-custom-type]').forEach(function (cb) {
        types[cb.dataset.customType] = cb.checked;
      });
      return {
        types: types,
        includeLessonSlots: chk('exp-include-slots'),
        pdfFitOnePage: chk('exp-pdf-fit-page'),
        separateClassTables: chk('exp-sep-classes'),
        separateClassFiles: chk('exp-sep-files'),
        fields: {
          topic: chk('exp-f-topic'), objective: chk('exp-f-objective'),
          notes: chk('exp-f-notes'),
          custom: chk('exp-f-custom')
        }
      };
    }

    var EXPORT_CLASS_FILTER_UNASSIGNED = '__no_class__';

    function isUnassignedExportClassFilter(clsFilter) {
      return clsFilter === EXPORT_CLASS_FILTER_UNASSIGNED;
    }

    function entryMatchesExportClassFilter(entry, clsFilter) {
      var cids = entryClassIds(entry);
      if (!clsFilter) return true;
      if (isUnassignedExportClassFilter(clsFilter)) return cids.length === 0;
      return cids.indexOf(clsFilter) >= 0;
    }

    function getExportSlotRows(clsFilter, typeFilter) {
      var sem = getActiveSem();
      if (!sem || !sem.semesterStart || !sem.semesterEnd) return [];
      if (typeFilter && !typeFilter.lesson) return [];

      var prevShowPast = showPast;
      var prevShowOutsideTerm = showOutsideTerm;
      var prevFilterClasses = filterClasses;
      var prevFilterUnassigned = filterUnassigned;

      try {
        showPast = true;
        showOutsideTerm = true;
        filterUnassigned = false;
        filterClasses = new Set();
        if (clsFilter && !isUnassignedExportClassFilter(clsFilter)) {
          filterClasses.add(clsFilter);
        }

        return (buildSlots(sem) || []).filter(function (s) {
          if (s.isGlobalHoliday) return false;
          if (s.entry) return false;
          if (!clsFilter) return true;
          if (isUnassignedExportClassFilter(clsFilter)) return !s.classId;
          return s.classId === clsFilter;
        }).map(function (s) {
          return {
            date: s.date,
            kind: 'slot',
            slot: {
              classId: s.classId || '',
              time: s.time || '',
              timeEnd: s.timeEnd || ''
            }
          };
        });
      } finally {
        showPast = prevShowPast;
        showOutsideTerm = prevShowOutsideTerm;
        filterUnassigned = prevFilterUnassigned;
        filterClasses = prevFilterClasses;
      }
    }

    // ── Shared export data builder ─────────────────────────────────────────────
    function getExportData(clsFilter, typeFilter, options) {
      options = options || {};
      var sem = getActiveSem();
      var semStart = sem && sem.semesterStart || '';
      var semEnd = sem && sem.semesterEnd || '';
      var rows = [];

      // Entries in active semester
      entries.filter(function (e) {
        if (!entryMatchesExportClassFilter(e, clsFilter)) return false;
        if ((classGroupsMeta[e.classId] || {}).archived) return false;
        if (semStart && e.date < semStart) return false;
        if (semEnd && e.date > semEnd) return false;
        if (typeFilter && !typeFilter[e.type || 'lesson']) return false;
        return true;
      }).forEach(function (e) { rows.push({ date: e.date, kind: 'entry', entry: e }); });

      // Holidays — one row per holiday (range kept as dateTo)
      if (sem && (!typeFilter || typeFilter.holiday)) {
        (sem.holidays || []).forEach(function (h) {
          if (!h.date) return;
          if (semStart && h.date < semStart && (!h.dateTo || h.dateTo < semStart)) return;
          if (semEnd && h.date > semEnd) return;
          rows.push({ date: h.date, dateTo: (h.dateTo && h.dateTo !== h.date) ? h.dateTo : null, kind: 'holiday', label: h.label });
        });
      }

      if (options.includeLessonSlots) {
        rows = rows.concat(getExportSlotRows(clsFilter, typeFilter));
      }

      rows.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        if (a.kind !== b.kind) return a.kind === 'holiday' ? -1 : 1;
        var at = (a.entry && a.entry.time) || (a.slot && a.slot.time) || '';
        var bt = (b.entry && b.entry.time) || (b.slot && b.slot.time) || '';
        return at < bt ? -1 : at > bt ? 1 : 0;
      });
      return { sem: sem, rows: rows };
    }

    // ── ICS export ─────────────────────────────────────────────────────────────
    function doExportIcs() {
      var clsFilter = document.getElementById('exp-cls').value;
      var fileBase = getExportFilenameBase(clsFilter);
      var now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Class Management Tools//Planner//EN',
        'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];

      function vevent(uid_, dtstart, dtend, summary, desc) {
        var ev = ['BEGIN:VEVENT', 'UID:' + uid_ + '@cmt-planner', 'DTSTAMP:' + now,
          'DTSTART' + dtstart, 'DTEND' + dtend, 'SUMMARY:' + icsEsc(summary)];
        if (desc) ev.push('DESCRIPTION:' + icsEsc(desc));
        ev.push('END:VEVENT');
        lines = lines.concat(ev);
      }

      cfg.semesters.forEach(function (s) {
        if (s.semesterStart)
          vevent('sem-start-' + s.id, ';VALUE=DATE:' + s.semesterStart.replace(/-/g, ''),
            ';VALUE=DATE:' + datePlus1(s.semesterStart), esc(s.label) + ' – ' + t('pl_icsSemStart'), '');
        if (s.semesterEnd)
          vevent('sem-end-' + s.id, ';VALUE=DATE:' + s.semesterEnd.replace(/-/g, ''),
            ';VALUE=DATE:' + datePlus1(s.semesterEnd), esc(s.label) + ' – ' + t('pl_icsSemEnd'), '');
        (s.holidays || []).forEach(function (h) {
          var holDtend = h.dateTo && h.dateTo !== h.date
            ? ';VALUE=DATE:' + datePlus1(h.dateTo)
            : ';VALUE=DATE:' + datePlus1(h.date);
          vevent('hol-' + h.date + '-' + (h.dateTo || h.date),
            ';VALUE=DATE:' + h.date.replace(/-/g, ''), holDtend, h.label || t('pl_typeHoliday'), '');
        });
      });

      var icsFilters = getExportFilters();
      entries.forEach(function (e) {
        if (e.type === 'no-class') return;
        if (!entryMatchesExportClassFilter(e, clsFilter)) return;
        if (!icsFilters.types[e.type || 'lesson']) return;
        var prefix = e.type === 'test' ? 'TEST: ' : e.type === 'assignment' ? 'DUE: ' : '';
        var clsLabel = entryClassIds(e).map(plannerClassDisplayName).join(', ') || e.classId || t('pl_noClass');
        var summary = prefix + clsLabel + (e.topic ? ' – ' + e.topic : '');
        var dtstart, dtend;
        var icsEndDate = (e.dateTo && e.dateTo > e.date) ? e.dateTo : null;
        if (icsEndDate) {
          dtstart = ';VALUE=DATE:' + e.date.replace(/-/g, '');
          dtend = ';VALUE=DATE:' + datePlus1(icsEndDate);
        } else if (e.time) {
          dtstart = ':' + e.date.replace(/-/g, '') + 'T' + e.time.replace(':', '') + '00';
          dtend = e.timeEnd
            ? ':' + e.date.replace(/-/g, '') + 'T' + e.timeEnd.replace(':', '') + '00'
            : ':' + e.date.replace(/-/g, '') + 'T' + timeAddHour(e.time) + '00';
        } else {
          dtstart = ';VALUE=DATE:' + e.date.replace(/-/g, '');
          dtend = ';VALUE=DATE:' + datePlus1(e.date);
        }
        var fi = icsFilters.fields;
        var descParts = [
          fi.objective && e.objective,
          fi.notes && e.notes && ('Notes: ' + e.notes)
        ];
        if (fi.custom && e.customFields) {
          Object.keys(e.customFields).forEach(function (k) {
            if (e.customFields[k]) descParts.push(k + ': ' + e.customFields[k]);
          });
        }
        var desc = descParts.filter(Boolean).join('\\n');
        vevent('entry-' + e.id, dtstart, dtend, summary, desc);
      });

      if (icsFilters.includeLessonSlots) {
        getExportSlotRows(clsFilter, icsFilters.types).forEach(function (row) {
          var s = row.slot;
          var clsLabel = s.classId ? plannerClassDisplayName(s.classId) : t('pl_noClass');
          var summary = clsLabel + ' – ' + t('pl_exportLessonSlotLabel');
          var dtstart, dtend;
          if (s.time) {
            dtstart = ':' + row.date.replace(/-/g, '') + 'T' + s.time.replace(':', '') + '00';
            var endT = s.timeEnd || timeAddHour(s.time);
            dtend = ':' + row.date.replace(/-/g, '') + 'T' + endT.replace(':', '') + '00';
          } else {
            dtstart = ';VALUE=DATE:' + row.date.replace(/-/g, '');
            dtend = ';VALUE=DATE:' + datePlus1(row.date);
          }
          vevent('slot-' + row.date + '-' + (s.classId || 'noclass') + '-' + (s.time || 'all'), dtstart, dtend, summary, '');
        });
      }

      lines.push('END:VCALENDAR');
      if (window.Desktop && Desktop.isElectron()) {
        Desktop.saveToDisk({
          title: 'Save Calendar File',
          defaultPath: fileBase + '.ics',
          filters: [{ name: 'Calendar Files', extensions: ['ics'] }],
          content: lines.join('\r\n'),
          encoding: 'utf8'
        }).then(function (result) {
          if (result && result.ok) {
            if (window.showExportSuccessPopup) showExportSuccessPopup(result.path, fileBase + '.ics');
          } else if (result && !result.ok && !result.canceled) {
            showToast('Save failed: ' + (result.error || 'unknown'), true);
          }
        });
      } else {
        var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = fileBase + '.ics';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      closeModal('exportModal');
    }

    function cleanPart(p) {
      if (p == null) return '';
      var s = String(p).trim();
      return s.replace(/\.+$/, '');
    }

    function slugifyForClass(str) {
      return String(str || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
    }

    function getExportStyle(key) {
      if (!cfg.exportStyles) cfg.exportStyles = {};
      return cfg.exportStyles[key] || { color: '', weight: 'normal', underline: false, italic: false };
    }

    function setExportStyle(key, prop, val) {
      if (!cfg.exportStyles) cfg.exportStyles = {};
      if (!cfg.exportStyles[key]) cfg.exportStyles[key] = { color: '', weight: 'normal', underline: false, italic: false };
      cfg.exportStyles[key][prop] = val;
      persistCfg();
      renderExportStyleControls();
    }

    function toggleExportStyle(key, prop) {
      var st = getExportStyle(key);
      setExportStyle(key, prop, !st[prop]);
    }

    function resetExportStyleItem(key) {
      if (!cfg.exportStyles) return;
      delete cfg.exportStyles[key];
      persistCfg();
      renderExportStyleControls();
    }

    function resetExportStyles() {
      cfg.exportStyles = {};
      persistCfg();
      renderExportStyleControls();
    }

    function getExportStyleCss() {
      var styles = cfg.exportStyles || {};
      var rules = [];

      Object.keys(styles).forEach(function (key) {
        var st = styles[key];
        if (!st) return;
        var cssProps = [];
        if (st.color) cssProps.push('color:' + st.color + ' !important');
        if (st.weight && st.weight !== 'normal') cssProps.push('font-weight:' + st.weight + ' !important');
        if (st.underline) cssProps.push('text-decoration:underline !important');
        if (st.italic) cssProps.push('font-style:italic !important');

        if (!cssProps.length) return;

        var selector = '';
        if (key.indexOf('type_') === 0) {
          var tName = slugifyForClass(key.replace('type_', ''));
          selector = '.exp-type-' + tName;
        } else if (key.indexOf('field_') === 0) {
          var fName = key.replace('field_', '');
          selector = '.exp-' + fName;
        } else if (key.indexOf('custom_') === 0) {
          var cName = slugifyForClass(key.replace('custom_', ''));
          selector = '.exp-custom-field-' + cName;
        } else if (key.indexOf('class_') === 0) {
          var clsId = slugifyForClass(key.replace('class_', ''));
          selector = '.exp-class-' + clsId;
        } else if (key === 'sched_week') {
          selector = '.exp-week';
        } else if (key === 'sched_date') {
          selector = '.exp-date';
        } else if (key === 'sched_time') {
          selector = '.exp-time';
        }

        if (selector) {
          rules.push(selector + '{' + cssProps.join(';') + '}');
        }
      });

      return rules.join('\n');
    }

    function renderExportStyleControls() {
      var acc = document.getElementById('exp-style-accordion');
      if (!acc) return;

      var categories = [
        {
          title: 'Entry Types',
          items: [
            { key: 'type_lesson', label: t('pl_typeLesson') },
            { key: 'type_test', label: t('pl_typeTest') },
            { key: 'type_assignment', label: t('pl_typeAssignment') },
            { key: 'type_holiday', label: t('pl_typeHoliday') },
            { key: 'type_noclass', label: t('pl_typeNoclass') }
          ].concat((cfg.customTypes || []).map(function (name) {
            return { key: 'type_custom_' + name, label: name };
          }))
        },
        {
          title: 'Entry Fields',
          items: [
            { key: 'field_topic', label: t('pl_exportFieldTopic') },
            { key: 'field_objective', label: t('pl_exportFieldObjective') },
            { key: 'field_notes', label: t('pl_exportFieldNotes') }
          ]
        },
        {
          title: 'Custom Fields',
          items: (cfg.customFields || []).map(function (name) {
            return { key: 'custom_' + name, label: name };
          })
        },
        {
          title: 'Class Groups',
          items: [
            { key: 'class_default', label: 'Default Class' }
          ].concat(getPlannerClassIds().map(function (cid) {
            return { key: 'class_' + cid, label: plannerClassDisplayName(cid) };
          }))
        },
        {
          title: 'Schedule & Date/Time',
          items: [
            { key: 'sched_week', label: t('pl_weeksTitle') },
            { key: 'sched_date', label: t('pl_entryDate') },
            { key: 'sched_time', label: t('pl_time') }
          ]
        }
      ];

      var html = '';
      categories.forEach(function (cat, catIdx) {
        if (!cat.items.length) return;
        html += '<div class="exp-style-group">' +
          '<div class="exp-style-group-header" data-pl-action="toggle-exp-group">' +
          '<span>' + esc(cat.title) + ' (' + cat.items.length + ')</span><span>▾</span>' +
          '</div>' +
          '<div class="exp-style-group-body" style="display:' + (catIdx === 0 ? 'flex' : 'none') + '">';

        cat.items.forEach(function (it) {
          var st = getExportStyle(it.key);
          var colorVal = st.color || '#000000';
          var isBold = st.weight === 'bold';
          var isUnderline = !!st.underline;
          var isItalic = !!st.italic;

          var previewStyle = '';
          if (st.color) previewStyle += 'color:' + st.color + ';';
          if (st.weight) previewStyle += 'font-weight:' + st.weight + ';';
          if (st.underline) previewStyle += 'text-decoration:underline;';
          if (st.italic) previewStyle += 'font-style:italic;';

          html += '<div class="exp-style-row">' +
            '<div class="exp-style-label">' +
            '<span>' + esc(it.label) + '</span>' +
            '<span class="exp-preview-pill" style="' + esc(previewStyle) + '">' + esc(it.label) + '</span>' +
            '</div>' +
            '<div class="exp-style-controls">' +
            '<input type="color" class="exp-style-color" value="' + esc(colorVal) + '" data-pl-change="exp-style-color" data-pl-key="' + esc(it.key) + '" title="Color">' +
            '<select class="exp-style-select" data-pl-change="exp-style-weight" data-pl-key="' + esc(it.key) + '">' +
            '<option value="normal"' + (isBold ? '' : ' selected') + '>Normal</option>' +
            '<option value="bold"' + (isBold ? ' selected' : '') + '>Bold</option>' +
            '</select>' +
            '<button type="button" class="style-toggle-btn ' + (isUnderline ? 'active' : '') + '" data-pl-action="toggle-exp-style" data-pl-key="' + esc(it.key) + '" data-pl-prop="underline" title="Underline"><u>U</u></button>' +
            '<button type="button" class="style-toggle-btn ' + (isItalic ? 'active' : '') + '" data-pl-action="toggle-exp-style" data-pl-key="' + esc(it.key) + '" data-pl-prop="italic" title="Italics"><i>I</i></button>' +
            '<button type="button" class="style-reset-btn" data-pl-action="reset-exp-style" data-pl-key="' + esc(it.key) + '" title="Reset item"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>' +
            '</div></div>';
        });

        html += '</div></div>';
      });

      acc.innerHTML = html;
    }

    function getExportRowDateAndSlot(row, isHtml) {
      var dateLabel = formatExportDate(row.date);
      if (row.kind === 'holiday') {
        if (row.dateTo) {
          var d2 = new Date(row.dateTo + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
          dateLabel += ' – ' + d2;
        }
        return isHtml ? '<span class="exp-date">' + esc(dateLabel) + '</span>' : dateLabel;
      }
      if (row.kind === 'slot') {
        var s = row.slot || {};
        var slotTime = (s.time || '') + (s.timeEnd ? '–' + s.timeEnd : '');
        if (isHtml) {
          var h = '<span class="exp-date">' + esc(dateLabel) + '</span>';
          if (slotTime) h += ' <span class="exp-time">· ' + esc(slotTime) + '</span>';
          return h;
        }
        return dateLabel + (slotTime ? ' · ' + slotTime : '');
      }
      var e = row.entry || {};
      var timeLabel = (e.time || '') + (e.timeEnd ? '–' + e.timeEnd : '');
      if (isHtml) {
        var h = '<span class="exp-date">' + esc(dateLabel) + '</span>';
        if (timeLabel) h += ' <span class="exp-time">· ' + esc(timeLabel) + '</span>';
        return h;
      }
      return dateLabel + (timeLabel ? ' · ' + timeLabel : '');
    }

    function formatExportRowDetails(row, fi, customNames, isHtml, hideClass) {
      fi = fi || {};
      if (row.kind === 'holiday') {
        var holStr = row.label || t('pl_typeHoliday');
        if (row.dateTo) {
          var d1 = new Date(row.date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
          var d2 = new Date(row.dateTo + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
          holStr += ' (' + d1 + ' – ' + d2 + ')';
        }
        if (isHtml) {
          return '<span class="exp-type exp-type-holiday">' + esc(t('pl_typeHoliday')) + '</span>. <span class="exp-topic">' + esc(holStr) + '</span>';
        }
        var hParts = [t('pl_typeHoliday'), holStr];
        return hParts.map(cleanPart).filter(Boolean).join('. ');
      }
      if (row.kind === 'slot') {
        var s = row.slot || {};
        var slotClass = s.classId ? plannerClassDisplayName(s.classId) : t('pl_noClass');
        var clsIdClass = s.classId ? ('exp-class-' + slugifyForClass(s.classId)) : 'exp-class-noclass';
        if (isHtml) {
          if (hideClass) return '';
          return '<span class="exp-class exp-class-default ' + clsIdClass + '">' + esc(slotClass) + '</span>';
        }
        var sParts = hideClass ? [] : [slotClass];
        return sParts.map(cleanPart).filter(Boolean).join('. ');
      }

      var e = row.entry || {};
      var cids = entryClassIds(e);
      var rawType = e.type || 'lesson';
      var typeClass = 'exp-type-' + slugifyForClass(rawType);
      var tLabel = typeLabel(rawType);

      if (isHtml) {
        var htmlParts = [];
        if (!hideClass) {
          if (cids.length) {
            var clsHtml = cids.map(function (cid) {
              return '<span class="exp-class exp-class-default exp-class-' + slugifyForClass(cid) + '">' + esc(plannerClassDisplayName(cid)) + '</span>';
            }).join(', ');
            htmlParts.push(clsHtml);
          } else {
            htmlParts.push('<span class="exp-class exp-class-default exp-class-noclass">' + esc(t('pl_noClass')) + '</span>');
          }
        }
        htmlParts.push('<span class="exp-type ' + typeClass + '">' + esc(tLabel) + '</span>');

        if (fi.topic && e.topic) htmlParts.push('<span class="exp-topic">' + esc(e.topic) + '</span>');
        if (fi.objective && e.objective) htmlParts.push('<span class="exp-objective">' + esc(e.objective) + '</span>');
        if (fi.notes && e.notes) htmlParts.push('<span class="exp-notes">' + esc(e.notes) + '</span>');
        if (fi.custom && e.customFields) {
          (customNames || []).forEach(function (n) {
            if (e.customFields[n]) {
              var cKey = slugifyForClass(n);
              htmlParts.push('<span class="exp-custom exp-custom-field-' + cKey + '">' + esc(n + ': ' + e.customFields[n]) + '</span>');
            }
          });
        }
        return htmlParts.join('. ');
      }

      var clsLabel = cids.map(plannerClassDisplayName).join(', ') || t('pl_noClass');
      var parts = hideClass ? [tLabel] : [clsLabel, tLabel];
      if (fi.topic && e.topic) parts.push(e.topic);
      if (fi.objective && e.objective) parts.push(e.objective);
      if (fi.notes && e.notes) parts.push(e.notes);
      if (fi.custom && e.customFields) {
        (customNames || []).forEach(function (n) {
          if (e.customFields[n]) parts.push(e.customFields[n]);
        });
      }

      return parts.map(cleanPart).filter(Boolean).join('. ');
    }

    function getExportClassList(clsFilter, separateTables) {
      if (!separateTables) {
        return [clsFilter];
      }
      if (selectedExportClasses.size > 0) {
        return Array.from(selectedExportClasses);
      }
      var ids = getPlannerClassIds();
      return ids.length ? ids : [''];
    }

    function getExportTitle(clsFilter, sem) {
      var semLabel = sem ? (sem.label || 'Planner') : 'Planner';
      if (clsFilter) {
        var clsName = isUnassignedExportClassFilter(clsFilter)
          ? (t('pl_unassigned') || 'Unassigned')
          : (plannerClassDisplayName(clsFilter) || clsFilter);
        return clsName + ' – ' + semLabel;
      }
      return semLabel;
    }

    function getPreparedExportRows(data, sem, totalWeeks, fi, customNames, clsFilter) {
      var prepared = [];
      (data.rows || []).forEach(function (row) {
        var weekInfo = getWeekGroupInfo(row.date, sem, totalWeeks);
        prepared.push({
          row: row,
          weekLabel: weekInfo ? weekInfo.label : '',
          dateHtml: getExportRowDateAndSlot(row, true),
          dateText: getExportRowDateAndSlot(row, false),
          detailsHtml: formatExportRowDetails(row, fi, customNames, true, !!clsFilter),
          detailsText: formatExportRowDetails(row, fi, customNames, false, !!clsFilter)
        });
      });

      var groups = [];
      var cur = null;
      prepared.forEach(function (item) {
        if (!cur || cur.weekLabel !== item.weekLabel) {
          cur = { weekLabel: item.weekLabel, count: 1, items: [item] };
          groups.push(cur);
        } else {
          cur.count++;
          cur.items.push(item);
        }
      });
      return groups;
    }

    // ── Live Preview Modal for Planner ─────────────────────────────────────────
    function openPlannerPreviewModal() {
      var modal = document.getElementById('pl-preview-modal');
      var iframe = document.getElementById('plPreviewIframe');
      if (!modal || !iframe) return;

      var clsFilter = document.getElementById('exp-cls').value;
      var filters = getExportFilters();
      var previewFilters = Object.assign({}, filters, { separateClassFiles: false });
      var html = buildExportHtml(clsFilter, previewFilters);

      iframe.srcdoc = html;
      iframe.onload = function () {
        if (window.ExportStylesService) {
          var sId = ExportStylesService.getSelectedStyle('planner');
          ExportStylesService.applyStyleToIframe(iframe, sId);
        }
      };

      modal.style.display = 'flex';

      if (window.ExportStylesService) {
        ExportStylesService.renderStyleSelector(document.getElementById('pl-preview-style-selector-wrap'), {
          toolKey: 'planner',
          onChange: function (styleId) {
            var ifr = document.getElementById('plPreviewIframe');
            if (ifr) ExportStylesService.applyStyleToIframe(ifr, styleId);
          }
        });
      }
    }

    function closePlannerPreviewModal() {
      var modal = document.getElementById('pl-preview-modal');
      if (modal) modal.style.display = 'none';
    }

    function plPrintPreviewIframe() {
      var ifr = document.getElementById('plPreviewIframe');
      if (ifr && ifr.contentWindow) {
        try {
          ifr.contentWindow.focus();
          ifr.contentWindow.print();
        } catch (_) {
          window.print();
        }
      }
    }

    async function plOpenPreviewInExternalBrowser() {
      var clsFilter = document.getElementById('exp-cls').value;
      var filters = getExportFilters();
      var previewFilters = Object.assign({}, filters, { separateClassFiles: false });
      var html = buildExportHtml(clsFilter, previewFilters);
      if (window.ExportStylesService) {
        html = await ExportStylesService.injectStyleIntoHtml(html, ExportStylesService.getSelectedStyle('planner'));
      }
      if (window.Desktop && Desktop.isElectron()) {
        try {
          var tempName = '_preview_planner.html';
          var result = await Desktop.saveText('toPrint', tempName, html);
          var filePath = (result && result.path) || (result && result.file && result.file.path);
          if (filePath && typeof Desktop.openNative === 'function') {
            await Desktop.openNative({ absolutePath: filePath });
          }
        } catch (err) {
          showToast('Could not open external browser: ' + err.message, true);
        }
      } else {
        var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    }

    function doExportHtmlFromPreview() {
      closePlannerPreviewModal();
      doExportHtml();
    }

    function doExportPdfFromPreview() {
      closePlannerPreviewModal();
      doExportPdf();
    }

    // ── HTML table export ───────────────────────────────────────────────────────
    async function doExportHtml() {
      var clsFilter = document.getElementById('exp-cls').value;
      var filters = getExportFilters();

      if (filters.separateClassFiles) {
        var classes = getSeparateExportClassList();
        closeModal('exportModal');
        for (var i = 0; i < classes.length; i++) {
          var cf = classes[i];
          var fileBase = getExportFilenameBase(cf);
          var singleFilters = Object.assign({}, filters, { separateClassTables: false, separateClassFiles: false });
          var html = buildExportHtml(cf, singleFilters);
          if (window.ExportStylesService) {
            html = await ExportStylesService.injectStyleIntoHtml(html, ExportStylesService.getSelectedStyle('planner'));
          }
          await downloadText(html, fileBase + '.html', 'text/html;charset=utf-8');
        }
        return;
      }

      var fileBase = getExportFilenameBase(clsFilter);
      var fi = filters.fields;
      var separateTables = !!filters.separateClassTables;
      var classList = getExportClassList(clsFilter, separateTables);
      var mainSem = getActiveSem();
      var title = (separateTables && classList.length > 1)
        ? (mainSem ? (mainSem.label || 'Planner') : 'Planner')
        : getExportTitle(clsFilter, mainSem);

      var headers = [t('pl_weeksTitle') || 'Week', (t('pl_entryDate') || 'Date') + ' / Time', t('pl_exportActivitiesCol') || 'Details'];

      var colControls = headers.map(function (h, idx) {
        return '<label class="col-opt"><input type="checkbox" class="col-toggle" data-col="' + idx + '" checked> ' + esc(h) + '</label>';
      }).join('');

      var colGroup = '<colgroup>' + headers.map(function (_h, idx) {
        return '<col data-col="' + idx + '">';
      }).join('') + '</colgroup>';

      var tableHead = headers.map(function (h, idx) {
        return '<th contenteditable="true" data-col="' + idx + '"><span class="th-label">' + esc(h) + '</span><span class="col-resizer" data-col="' + idx + '" title="Drag to resize"></span></th>';
      }).join('');

      var sectionsHtml = '';

      classList.forEach(function (cf, cIdx) {
        var data = getExportData(cf, filters.types, { includeLessonSlots: filters.includeLessonSlots });
        var cSem = data.sem;
        var classTitle = getExportTitle(cf, cSem);
        var totalWeeks = cSem && cSem.semesterStart && cSem.semesterEnd ? getTotalWeeks(cSem) : 0;
        var customNames = (cfg.customFields || []).filter(function (n) { return fi.custom; });
        var groups = getPreparedExportRows(data, cSem, totalWeeks, fi, customNames, cf);
        var rows = [];

        groups.forEach(function (grp) {
          grp.items.forEach(function (item, idx) {
            var r = '<tr>';
            if (idx === 0) {
              r += '<td contenteditable="true" data-col="0" rowspan="' + grp.count + '"><span class="exp-week">' + esc(item.weekLabel) + '</span></td>';
            }
            r += '<td contenteditable="true" data-col="1">' + item.dateHtml + '</td>';
            r += '<td contenteditable="true" data-col="2">' + item.detailsHtml + '</td>';
            r += '</tr>';
            rows.push(r);
          });
        });

        if (!rows.length) {
          rows.push('<tr><td data-col="0" colspan="3">' + esc(t('pl_noEntries')) + '</td></tr>');
        }

        var breakStyle = (separateTables && cIdx > 0) ? ' class="class-page-break"' : '';
        var secHeading = (separateTables && classList.length > 1) ? ('<h2 class="class-heading">' + esc(classTitle) + '</h2>') : '';

        sectionsHtml += '<div' + breakStyle + '>' + secHeading +
          '<table id="planner-export-table-' + cIdx + '" class="planner-export-table">' + colGroup + '<thead><tr>' + tableHead + '</tr></thead>' +
          '<tbody>' + rows.join('') + '</tbody></table></div>';
      });

      var topHeaderHtml = (separateTables && classList.length > 1)
        ? ''
        : ('<h1>' + esc(title) + '</h1><p class="meta">' + esc(formatExportDate(new Date().toISOString().slice(0, 10))) + '</p>');

      var html = '' +
        '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
        '<style>' +
        '* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
        'body { font-family: \'Lexend\', system-ui, -apple-system, sans-serif; font-size: 13px; color: #222222; background: #f5f5f0; padding: 24px; line-height: 1.4; }\n' +
        'h1 { font-size: 22px; font-weight: 800; color: #222222; border-bottom: 2px solid #333333; padding-bottom: 6px; margin: 0 0 8px; }\n' +
        'h2, .class-heading { font-size: 18px; font-weight: 800; color: #222222; border-bottom: 2px solid #333333; padding-bottom: 4px; margin: 20px 0 10px; }\n' +
        '.meta { font-size: 12px; color: #475569; margin: 0 0 16px; font-weight: 600; }\n' +
        '.table-toolbar { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin: 0 0 16px; padding: 10px 14px; border: 2px solid #333333; background: #ffffff; border-radius: 6px; box-shadow: 3px 3px 0 #555555; }\n' +
        '.tb-label { font-size: 11px; color: #222222; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.9; }\n' +
        '.col-options { display: flex; gap: 10px 14px; flex-wrap: wrap; align-items: center; }\n' +
        '.col-opt { font-size: 12px; color: #222222; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; user-select: none; }\n' +
        'table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; margin-bottom: 20px; border: 2px solid #333333; background: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 3px 3px 0 #555555; }\n' +
        'th, td { border: 1.5px solid #333333; padding: 8px 10px; vertical-align: top; text-align: left; word-break: break-word; color: #222222; }\n' +
        'thead th { background: #fafaf7; font-weight: 800; color: #222222; text-transform: uppercase; letter-spacing: 0.05em; position: relative; border-bottom: 2px solid #333333; }\n' +
        '.th-label { display: block; padding-right: 10px; }\n' +
        '.col-resizer { position: absolute; top: 0; right: -4px; width: 8px; height: 100%; cursor: col-resize; user-select: none; touch-action: none; z-index: 2; }\n' +
        '.col-resizer::after { content: ""; position: absolute; right: 3px; top: 18%; bottom: 18%; width: 1.5px; background: #333333; }\n' +
        'tbody tr:nth-child(even) td { background: #f8fafc; }\n' +
        '.class-page-break { page-break-before: always; break-before: page; margin-top: 24px; }\n' +
        '[contenteditable="true"]:focus { outline: 2px solid #e2c96e; background: #fafaf7; }\n' +
        '.col-hidden { display: none !important; }\n' +
        '@page { margin: 12mm 10mm; size: auto; }\n' +
        '@media print {\n' +
        ' *, *:before, *:after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }\n' +
        ' body { padding: 0 !important; background: #ffffff !important; }\n' +
        ' .table-toolbar { display: none !important; }\n' +
        ' table { width: 100% !important; box-shadow: none !important; border-collapse: collapse !important; page-break-inside: auto !important; break-inside: auto !important; }\n' +
        ' thead { display: table-header-group !important; }\n' +
        ' tr { page-break-inside: avoid !important; break-inside: avoid !important; }\n' +
        ' th[style*="display: none"], td[style*="display: none"], col[style*="display: none"], .col-hidden { display: none !important; }\n' +
        '}\n' +
        getExportStyleCss() +
        '</style></head><body>' +
        topHeaderHtml +
        '<div class="table-toolbar"><span class="tb-label">Columns</span><div class="col-options">' + colControls + '</div></div>' +
        sectionsHtml +
        '<script>(function(){' +
        'var tables=document.querySelectorAll(".planner-export-table");if(!tables.length)return;' +
        'function setColVisible(colIndex,visible){' +
        'tables.forEach(function(table){' +
        'var colEl=table.querySelector("col[data-col=\'"+colIndex+"\']");if(colEl){colEl.style.display=visible?"":"none";colEl.classList.toggle("col-hidden",!visible);}' +
        'var cells=table.querySelectorAll("th[data-col=\'"+colIndex+"\'],td[data-col=\'"+colIndex+"\']");' +
        'for(var i=0;i<cells.length;i++){cells[i].style.display=visible?"":"none";cells[i].classList.toggle("col-hidden",!visible);}' +
        '});' +
        '}' +
        'var toggles=document.querySelectorAll(".col-toggle");' +
        'for(var t=0;t<toggles.length;t++){' +
        'toggles[t].addEventListener("change",function(e){' +
        'var col=e.target.getAttribute("data-col");setColVisible(col,!!e.target.checked);' +
        '});' +
        '}' +
        '})();<\/script>' +
        '</body></html>';

      if (window.ExportStylesService) {
        html = await ExportStylesService.injectStyleIntoHtml(html, ExportStylesService.getSelectedStyle('planner'));
      }

      await downloadText(html,
        fileBase + '.html', 'text/html;charset=utf-8');
      closeModal('exportModal');
    }

    // ── CSV export ─────────────────────────────────────────────────────────────
    function doExportCsv() {
      var clsFilter = document.getElementById('exp-cls').value;
      var filters = getExportFilters();

      if (filters.separateClassFiles) {
        var classes = getSeparateExportClassList();
        var fi = filters.fields;
        var customNames = (cfg.customFields || []).filter(function (n) { return fi.custom; });
        var header = [t('pl_weeksTitle') || 'Week', (t('pl_entryDate') || 'Date') + ' / Time', t('pl_exportActivitiesCol') || 'Details'];
        closeModal('exportModal');

        (async function () {
          for (var c = 0; c < classes.length; c++) {
            var cf = classes[c];
            var fileBase = getExportFilenameBase(cf);
            var data = getExportData(cf, filters.types, { includeLessonSlots: filters.includeLessonSlots });
            var sem = data.sem;
            var totalWeeks = sem && sem.semesterStart && sem.semesterEnd ? getTotalWeeks(sem) : 0;
            var groups = getPreparedExportRows(data, sem, totalWeeks, fi, customNames, cf);
            var rows = [header];

            groups.forEach(function (grp) {
              grp.items.forEach(function (item, idx) {
                var wLabel = idx === 0 ? item.weekLabel : '';
                rows.push([wLabel, item.dateText, item.detailsText]);
              });
            });

            var csv = rows.map(function (row) {
              return row.map(function (cell) {
                var s = String(cell).replace(/"/g, '""');
                return /[,"\n\r]/.test(s) ? '"' + s + '"' : s;
              }).join(',');
            }).join('\r\n');

            await downloadText('﻿' + csv, fileBase + '.csv', 'text/csv;charset=utf-8');
          }
        })();
        return;
      }

      var fileBase = getExportFilenameBase(clsFilter);
      var fi = filters.fields;
      var separateTables = !!filters.separateClassTables;
      var classList = getExportClassList(clsFilter, separateTables);
      var customNames = (cfg.customFields || []).filter(function (n) { return fi.custom; });
      var header = [t('pl_weeksTitle') || 'Week', (t('pl_entryDate') || 'Date') + ' / Time', t('pl_exportActivitiesCol') || 'Details'];

      var rows = [];

      classList.forEach(function (cf, cIdx) {
        var data = getExportData(cf, filters.types, { includeLessonSlots: filters.includeLessonSlots });
        var sem = data.sem;
        var classTitle = getExportTitle(cf, sem);
        var totalWeeks = sem && sem.semesterStart && sem.semesterEnd ? getTotalWeeks(sem) : 0;
        var groups = getPreparedExportRows(data, sem, totalWeeks, fi, customNames, cf);

        if (separateTables && classList.length > 1) {
          if (cIdx > 0) rows.push([]);
          rows.push([classTitle]);
        }
        rows.push(header);

        groups.forEach(function (grp) {
          grp.items.forEach(function (item, idx) {
            var wLabel = idx === 0 ? item.weekLabel : '';
            rows.push([wLabel, item.dateText, item.detailsText]);
          });
        });
      });

      var csv = rows.map(function (row) {
        return row.map(function (cell) {
          var s = String(cell).replace(/"/g, '""');
          return /[,"\n\r]/.test(s) ? '"' + s + '"' : s;
        }).join(',');
      }).join('\r\n');

      downloadText('﻿' + csv,
        fileBase + '.csv', 'text/csv;charset=utf-8');
      closeModal('exportModal');
    }

    // ── PDF export ─────────────────────────────────────────────────────────────
    var pdfExportModalCallback = null;

    function closePdfExportModal(choice) {
      closeModal('pdfExportModal');
      var cb = pdfExportModalCallback;
      pdfExportModalCallback = null;
      if (cb) cb(choice);
    }

    function openPdfExportModal() {
      var titleEl = document.getElementById('pdf-export-modal-title');
      var textEl = document.getElementById('pdf-export-modal-text');
      var toPrintBtn = document.getElementById('btn-pdf-export-to-print');
      var pickerBtn = document.getElementById('btn-pdf-export-picker');

      if (titleEl) titleEl.textContent = t('deExportPdfDestinationTitle') || 'Export PDF';
      if (textEl) textEl.textContent = t('deExportPdfDestinationPrompt') || 'Where do you want to save the PDF?';
      if (toPrintBtn) toPrintBtn.textContent = t('deExportPdfToPrintFolder') || 'Export to Print folder';
      if (pickerBtn) pickerBtn.textContent = t('deExportPdfFilePicker') || 'Choose with file picker';

      if (pdfExportModalCallback) pdfExportModalCallback(null);
      return new Promise(function (resolve) {
        pdfExportModalCallback = resolve;
        openModal('pdfExportModal');
      });
    }

    async function doExportPdf() {
      if (!window.Desktop || !Desktop.isElectron()) {
        showToast(t('pl_exportPdfLabel') + ': desktop only'); return;
      }
      var clsFilter = document.getElementById('exp-cls').value;
      var filters = getExportFilters();

      const destination = await openPdfExportModal();
      if (!destination) return;

      closeModal('exportModal');

      var pdfSettings = getPdfExportSettings();
      var pdfOpts = { pageSize: pdfSettings.pageSize, landscape: pdfSettings.isLandscape };

      if (filters.separateClassFiles) {
        var classes = getSeparateExportClassList();
        if (classes.length === 0) return;

        if (destination === 'to-print') {
          let successCount = 0;
          let lastPath = '';
          let lastName = '';
          for (var i = 0; i < classes.length; i++) {
            var cf = classes[i];
            var fileBase = getExportFilenameBase(cf);
            var singleFilters = Object.assign({}, filters, { separateClassTables: false, separateClassFiles: false });
            var html = buildExportHtml(cf, singleFilters);
            if (window.ExportStylesService) {
              html = await ExportStylesService.injectStyleIntoHtml(html, ExportStylesService.getSelectedStyle('planner'));
            }
            const result = await Desktop.printPdf({
              html: html,
              target: 'toPrint',
              filename: fileBase + '.pdf',
              pdfOptions: pdfOpts
            });
            if (result && result.ok) {
              successCount++;
              lastPath = result.path;
              lastName = result.name || (fileBase + '.pdf');
            }
          }
          if (successCount > 0) {
            showToast((t('deExportPdfToPrintSuccess') || 'PDF saved to Print folder: ') + (successCount === 1 ? lastName : (successCount + ' PDFs')));
            if (window.showExportSuccessPopup && lastPath) {
              showExportSuccessPopup(lastPath, successCount === 1 ? lastName : (successCount + ' PDFs'));
            }
          }
          return;
        }

        // Multiple files with file/folder picker: Ask ONCE for destination directory
        if (classes.length > 1) {
          const folderRes = await Desktop.pickFolder({
            title: t('pl_exportChooseFolder') || 'Export PDFs – choose destination folder',
            buttonLabel: t('btnExport') || 'Export here'
          });
          if (!folderRes || !folderRes.ok || folderRes.canceled || !folderRes.folderPath) return;

          const destDir = folderRes.folderPath;
          let successCount = 0;
          let lastPath = '';
          let lastName = '';
          for (var i = 0; i < classes.length; i++) {
            var cf = classes[i];
            var fileBase = getExportFilenameBase(cf);
            var singleFilters = Object.assign({}, filters, { separateClassTables: false, separateClassFiles: false });
            var html = buildExportHtml(cf, singleFilters);
            if (window.ExportStylesService) {
              html = await ExportStylesService.injectStyleIntoHtml(html, ExportStylesService.getSelectedStyle('planner'));
            }
            var absPath = destDir.replace(/[\\/]+$/, '') + '/' + fileBase + '.pdf';
            const result = await Desktop.printPdf({
              html: html,
              absolutePath: absPath,
              pdfOptions: pdfOpts
            });
            if (result && result.ok) {
              successCount++;
              lastPath = result.path || absPath;
              lastName = result.name || (fileBase + '.pdf');
            }
          }
          if (successCount > 0) {
            showToast(t('deExportPdfSuccess') || 'PDF exported');
            if (window.showExportSuccessPopup && lastPath) {
              showExportSuccessPopup(lastPath, successCount === 1 ? lastName : (successCount + ' PDFs'));
            }
          }
          return;
        }

        // Single class separate file fallback
        var cf = classes[0];
        var fileBase = getExportFilenameBase(cf);
        var singleFilters = Object.assign({}, filters, { separateClassTables: false, separateClassFiles: false });
        var html = buildExportHtml(cf, singleFilters);
        if (window.ExportStylesService) {
          html = await ExportStylesService.injectStyleIntoHtml(html, ExportStylesService.getSelectedStyle('planner'));
        }
        const result = await Desktop.printPdf({
          html: html,
          defaultName: fileBase + '.pdf',
          pdfOptions: pdfOpts
        });
        if (result && result.ok) {
          showToast(t('deExportPdfSuccess') || 'PDF exported');
          if (window.showExportSuccessPopup && result.path) {
            showExportSuccessPopup(result.path, result.name || (fileBase + '.pdf'));
          }
        } else if (result && !result.ok && !result.canceled) {
          showToast((t('deExportPdfFailed') || 'PDF export failed: ') + (result.error || 'unknown'), true);
        }
        return;
      }

      // Combined single PDF file export
      var fileBase = getExportFilenameBase(clsFilter);
      var html = buildExportHtml(clsFilter, filters);
      if (window.ExportStylesService) {
        html = await ExportStylesService.injectStyleIntoHtml(html, ExportStylesService.getSelectedStyle('planner'));
      }
      var pdfReq = { html: html, pdfOptions: pdfOpts };
      if (destination === 'to-print') {
        pdfReq.target = 'toPrint';
        pdfReq.filename = fileBase + '.pdf';
      } else {
        pdfReq.defaultName = fileBase + '.pdf';
      }
      const result = await Desktop.printPdf(pdfReq);
      if (result && result.ok) {
        showToast(
          destination === 'to-print'
            ? ((t('deExportPdfToPrintSuccess') || 'PDF saved to Print folder: ') + (result.name || (fileBase + '.pdf')))
            : (t('deExportPdfSuccess') || 'PDF exported')
        );
        if (window.showExportSuccessPopup && result.path) {
          showExportSuccessPopup(result.path, result.name || (fileBase + '.pdf'));
        }
      } else if (result && !result.ok && !result.canceled) {
        showToast((t('deExportPdfFailed') || 'PDF export failed: ') + (result.error || 'unknown'), true);
      }
    }

    function mdEscCell(s) {
      return String(s == null ? '' : s)
        .replace(/\|/g, '\\|')
        .replace(/\r?\n/g, ' ')
        .trim();
    }

    function getPdfExportSettings() {
      var cfg = (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG)
        ? CLASS_MANAGEMENT_CONFIG
        : (window.CLASS_MANAGEMENT_CONFIG || {});
      var exp = cfg.export || {};
      
      var margin = '16mm 14mm';
      if (exp.pdfMargin) {
        if (typeof exp.pdfMargin === 'string') margin = exp.pdfMargin;
        else if (typeof exp.pdfMargin === 'number') margin = exp.pdfMargin + 'mm';
        else if (typeof exp.pdfMargin === 'object') {
          var t = exp.pdfMargin.top || '16mm';
          var r = exp.pdfMargin.right || '14mm';
          var b = exp.pdfMargin.bottom || '16mm';
          var l = exp.pdfMargin.left || '14mm';
          margin = t + ' ' + r + ' ' + b + ' ' + l;
        }
      } else if (exp.margin) {
        if (typeof exp.margin === 'string') margin = exp.margin;
        else if (typeof exp.margin === 'number') margin = exp.margin + 'mm';
      }

      var orientation = (exp.orientation || exp.pdfOrientation || 'portrait').toLowerCase();
      if (orientation !== 'landscape' && orientation !== 'portrait') orientation = 'portrait';

      var pageSize = (exp.pageSize || exp.size || 'A4').trim();

      return {
        margin: margin,
        orientation: orientation,
        isLandscape: orientation === 'landscape',
        pageSize: pageSize
      };
    }

    function buildExportDocxMarkdown(clsFilter, filters) {
      filters = filters || {
        types: null, includeLessonSlots: false, pdfFitOnePage: false,
        fields: { topic: true, objective: true, notes: true, custom: true }
      };

      var fi = filters.fields || {};
      var separateTables = !!filters.separateClassTables;
      var classList = getExportClassList(clsFilter, separateTables);
      var mainSem = getActiveSem();
      var title = (separateTables && classList.length > 1)
        ? (mainSem ? (mainSem.label || 'Planner') : 'Planner')
        : getExportTitle(clsFilter, mainSem);

      var lines = [];
      lines.push('# ' + title);
      lines.push('');
      lines.push(formatExportDate(new Date().toISOString().slice(0, 10)));
      lines.push('');

      var weekColHeader = t('pl_weeksTitle') || 'Week';
      var dateColHeader = (t('pl_entryDate') || 'Date') + ' / Time';
      var detailsColHeader = t('pl_exportActivitiesCol') || 'Details';

      classList.forEach(function (cf, cIdx) {
        var data = getExportData(cf, filters.types, { includeLessonSlots: !!filters.includeLessonSlots });
        var sem = data.sem;
        var classTitle = getExportTitle(cf, sem);
        var totalWeeks = sem && sem.semesterStart && sem.semesterEnd ? getTotalWeeks(sem) : 0;
        var customNames = (cfg.customFields || []).filter(function (n) { return fi.custom; });

        if (separateTables && classList.length > 1) {
          if (cIdx > 0) {
            lines.push('');
            lines.push('<div style="page-break-before: always;"></div>');
            lines.push('');
          }
          lines.push('## ' + classTitle);
          lines.push('');
        }

        lines.push('| ' + mdEscCell(weekColHeader) + ' | ' + mdEscCell(dateColHeader) + ' | ' + mdEscCell(detailsColHeader) + ' |');
        lines.push('| --- | --- | --- |');

        if (!data.rows.length) {
          lines.push('| ' + mdEscCell(t('pl_noEntries')) + ' | | |');
        } else {
          var groups = getPreparedExportRows(data, sem, totalWeeks, fi, customNames, cf);
          groups.forEach(function (grp) {
            grp.items.forEach(function (item, idx) {
              var wLabel = idx === 0 ? item.weekLabel : '';
              lines.push('| ' + mdEscCell(wLabel) + ' | ' + mdEscCell(item.dateText) + ' | ' + mdEscCell(item.detailsText) + ' |');
            });
          });
        }
      });

      return lines.join('\n');
    }

    async function doExportDocx() {
      if (!window.Desktop || !Desktop.isElectron()) {
        showToast(t('pl_exportDocxLabel') + ': desktop only'); return;
      }
      var dest = window.promptExportDestination ? await window.promptExportDestination() : 'custom';
      if (!dest) return;

      var clsFilter = document.getElementById('exp-cls').value;
      var filters = getExportFilters();

      if (filters.separateClassFiles) {
        var classes = getSeparateExportClassList();
        closeModal('exportModal');
        var fit = !!filters.pdfFitOnePage;
        for (var i = 0; i < classes.length; i++) {
          var cf = classes[i];
          var fileBase = getExportFilenameBase(cf);
          var singleFilters = Object.assign({}, filters, { separateClassTables: false, separateClassFiles: false });
          var markdown = buildExportDocxMarkdown(cf, singleFilters);
          await window.saveExportWithDestination({
            filename: fileBase + '.docx',
            destination: dest,
            docxRequest: {
              markdown: markdown,
              defaultName: fileBase,
              fontFamily: 'Segoe UI',
              fontSize: fit ? '8pt' : '10pt',
              lineHeight: fit ? '1.1' : '1.25',
              margins: fit
                ? { top: 8, right: 8, bottom: 8, left: 8 }
                : { top: 18, right: 16, bottom: 18, left: 16 },
              size: 'A4',
              orientation: 'portrait'
            }
          });
        }
        return;
      }

      var fileBase = getExportFilenameBase(clsFilter);
      var markdown = buildExportDocxMarkdown(clsFilter, filters);
      closeModal('exportModal');
      var fit = !!filters.pdfFitOnePage;
      await window.saveExportWithDestination({
        filename: fileBase + '.docx',
        destination: dest,
        docxRequest: {
          markdown: markdown,
          defaultName: fileBase,
          fontFamily: 'Segoe UI',
          fontSize: fit ? '8pt' : '10pt',
          lineHeight: fit ? '1.1' : '1.25',
          margins: fit
            ? { top: 8, right: 8, bottom: 8, left: 8 }
            : { top: 18, right: 16, bottom: 18, left: 16 },
          size: 'A4',
          orientation: 'portrait'
        }
      });
    }

    function buildExportHtml(clsFilter, filters) {
      filters = filters || { types: null, fields: { topic: true, objective: true, notes: true, custom: true } };
      var fi = filters.fields;
      var fitOnePage = !!filters.pdfFitOnePage;
      var separateTables = !!filters.separateClassTables;
      var classList = getExportClassList(clsFilter, separateTables);
      var mainSem = getActiveSem();
      var title = (separateTables && classList.length > 1)
        ? (mainSem ? (mainSem.label || 'Planner') : 'Planner')
        : getExportTitle(clsFilter, mainSem);

      var tablesHtml = '';

      classList.forEach(function (cf, cIdx) {
        var data = getExportData(cf, filters.types, { includeLessonSlots: !!filters.includeLessonSlots });
        var sem = data.sem;
        var classTitle = getExportTitle(cf, sem);
        var totalWeeks = sem && sem.semesterStart && sem.semesterEnd ? getTotalWeeks(sem) : 0;
        var customNames = (cfg.customFields || []).filter(function (n) { return fi.custom; });

        var weekColHeader = t('pl_weeksTitle') || 'Week';
        var dateColHeader = (t('pl_entryDate') || 'Date') + ' / Time';
        var detailsColHeader = t('pl_exportActivitiesCol') || 'Details';

        var breakStyle = (separateTables && cIdx > 0) ? ' class="class-page-break"' : '';
        var secHeading = (separateTables && classList.length > 1) ? ('<h2 class="class-heading">' + esc(classTitle) + '</h2>') : '';

        var sectionHtml = '<div' + breakStyle + '>' + secHeading +
          '<table class="exp-table planner-export-table"><thead><tr><th class="col-week">' +
          esc(weekColHeader) + '</th><th class="col-date">' +
          esc(dateColHeader) + '</th><th class="col-acts">' +
          esc(detailsColHeader) + '</th></tr></thead><tbody>';

        if (!data.rows.length) {
          sectionHtml += '<tr><td colspan="3" class="empty-row">' + esc(t('pl_noEntries')) + '</td></tr>';
        } else {
          var groups = getPreparedExportRows(data, sem, totalWeeks, fi, customNames, cf);
          groups.forEach(function (grp) {
            grp.items.forEach(function (item, idx) {
              sectionHtml += '<tr>';
              if (idx === 0) {
                sectionHtml += '<td class="col-week" rowspan="' + grp.count + '"><div class="week-main"><span class="exp-week">' + esc(item.weekLabel) + '</span></div></td>';
              }
              sectionHtml += '<td class="col-date"><div class="date-main">' + item.dateHtml + '</div></td>' +
                '<td class="col-acts"><div class="act-main">' + item.detailsHtml + '</div></td></tr>';
            });
          });
        }

        sectionHtml += '</tbody></table></div>';
        tablesHtml += sectionHtml;
      });

      var pdfSettings = getPdfExportSettings();
      var pageMargin = fitOnePage ? '5mm' : pdfSettings.margin;
      var bodyFont = fitOnePage ? '7pt' : '9pt';
      var orientation = pdfSettings.orientation;
      var pageSize = pdfSettings.pageSize || 'A4';
      var titleSize = fitOnePage ? '10pt' : '14pt';
      var metaSize = fitOnePage ? '6.4pt' : '8pt';
      var cellPad = fitOnePage ? '2px 3px' : '4px 6px';
      var thSize = fitOnePage ? '6.4pt' : '8pt';
      var dateMainSize = fitOnePage ? '6.6pt' : '8.8pt';
      var actMainSize = fitOnePage ? '6.4pt' : '8.6pt';
      var colWeekWidth = fitOnePage ? '18%' : '20%';
      var colDateWidth = fitOnePage ? '22%' : '24%';

      var css = '@page{size:' + pageSize + ' ' + orientation + ';margin:' + pageMargin + '}'
        + '* {box-sizing:border-box;margin:0;padding:0}'
        + 'html,body{width:100%;' + (fitOnePage ? 'height:100%' : '') + '}'
        + 'body{font-family:\'Lexend\',system-ui,-apple-system,sans-serif;font-size:' + bodyFont + ';color:#222222;background:#ffffff;margin:0;padding:0' + (fitOnePage ? ';display:flex;flex-direction:column;overflow:hidden' : '') + '}'
        + 'h1{font-size:' + titleSize + ';font-weight:800;color:#222222;border-bottom:2px solid #333333;padding-bottom:4px;margin-bottom:6px;line-height:1.1}'
        + '.class-heading{font-size:' + (fitOnePage ? '11pt' : '15pt') + ';font-weight:800;margin-bottom:4px;color:#222222;border-bottom:2px solid #333333;padding-bottom:2px}'
        + '.meta{font-size:' + metaSize + ';color:#475569;margin-bottom:' + (fitOnePage ? '4px' : '10px') + ';line-height:1.1;font-weight:600}'
        + '.exp-table{width:100%;border-collapse:collapse;table-layout:fixed;border:2px solid #333333' + (fitOnePage ? ';flex:1;height:100%' : '') + '}'
        + '.exp-table thead{display:table-header-group}'
        + '.exp-table tr{page-break-inside:avoid;break-inside:avoid}'
        + '.exp-table th,.exp-table td{border:1.5px solid #333333;vertical-align:top;padding:' + cellPad + ';color:#222222}'
        + '.exp-table th{background:#fafaf7;font-size:' + thSize + ';font-weight:800;text-transform:uppercase;letter-spacing:.05em;text-align:left;height:24px;color:#222222;border-bottom:2px solid #333333}'
        + '.exp-table tbody tr{height:' + (fitOnePage ? '1%' : 'auto') + '}'
        + '.exp-table tbody tr:nth-child(even) td{background:#f8fafc}'
        + '.col-week{width:' + colWeekWidth + '}'
        + '.col-date{width:' + colDateWidth + '}'
        + '.date-main,.week-main{font-weight:700;font-size:' + dateMainSize + ';line-height:1.15;color:#222222}'
        + '.act-main{font-size:' + actMainSize + ';line-height:1.25;color:#222222}'
        + '.empty-row{text-align:center;color:#64748b;font-style:italic}\n'
        + '.class-page-break{page-break-before:always;break-before:page;margin-top:24px}\n'
        + '.planner-export-footer{margin-top:20px;padding-top:8px;border-top:1.5px solid #333333;display:flex;align-items:center;justify-content:space-between;font-size:8pt;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;page-break-inside:avoid;break-inside:avoid}\n'
        + '.exp-footer-left{text-align:left}\n'
        + '.exp-footer-center{text-align:center;font-weight:700;color:#222222}\n'
        + '.exp-footer-right{text-align:right;white-space:nowrap}\n'
        + getExportStyleCss();

      var topHeaderHtml = (separateTables && classList.length > 1)
        ? ''
        : ('<h1>' + esc(title) + '</h1>');

      var teacherName = (typeof window.getAppTeacherName === 'function') ? window.getAppTeacherName() : '';
      var todayStr = new Date().toLocaleDateString();
      var footerHtml = '<footer class="exp-footer planner-export-footer">'
        + '<span class="exp-footer-left">' + esc(title) + ' | Class Management Tools</span>'
        + (teacherName ? ('<span class="exp-footer-center">' + esc(teacherName) + '</span>') : '')
        + '<span class="exp-footer-right">Exported: ' + esc(todayStr) + '</span>'
        + '</footer>';

      return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + esc(title) + '</title>'
        + '<style>' + css + '</style></head><body>'
        + topHeaderHtml
        + tablesHtml
        + footerHtml + '</body></html>';
    }


    function downloadText(content, filename, mime) {
      var ext = (filename.split('.').pop() || '').toLowerCase();
      var filterName = ext.toUpperCase() + ' Files';
      if (ext === 'html') filterName = 'HTML Document';
      else if (ext === 'csv') filterName = 'CSV Spreadsheet';
      else if (ext === 'ics') filterName = 'iCalendar File';

      if (window.saveExportWithDestination) {
        return window.saveExportWithDestination({
          filename: filename,
          content: content,
          encoding: 'utf8',
          mimeType: mime || 'text/plain;charset=utf-8',
          filters: [{ name: filterName, extensions: [ext] }, { name: 'All Files', extensions: ['*'] }],
          title: 'Save ' + filename
        });
      }

      var blob = new Blob([content], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return Promise.resolve({ ok: true });
    }

    function datePlus1(dateStr) {
      var d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10).replace(/-/g, '');
    }
    function timeAddHour(t_) {
      var p = t_.split(':');
      return String((parseInt(p[0]) + 1) % 24).padStart(2, '0') + (p[1] || '00');
    }
    function icsEsc(s) {
      return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    }

    function formatExportDate(dateStr) {
      if (!dateStr) return '';
      var d = new Date(dateStr + 'T12:00:00');
      if (isNaN(d.getTime())) return dateStr;
      var weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return weekdays[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    function getWeekGroupInfo(dateStr, sem, totalWeeks) {
      if (sem && sem.semesterStart && sem.semesterEnd && dateStr >= sem.semesterStart && dateStr <= sem.semesterEnd && totalWeeks > 0) {
        var wn = getWeekNumber(dateStr, sem.semesterStart);
        return {
          key: 'sem-' + wn,
          label: tFmt('pl_weekLabel', { n: wn, total: totalWeeks })
        };
      }
      var d = new Date(dateStr + 'T12:00:00');
      var m = new Date(d.getTime());
      var day = m.getDay();
      var diff = m.getDate() - day + (day === 0 ? -6 : 1);
      m.setDate(diff);
      var yyyy = m.getFullYear();
      var mm = String(m.getMonth() + 1).padStart(2, '0');
      var dd = String(m.getDate()).padStart(2, '0');
      var mondayStr = yyyy + '-' + mm + '-' + dd;

      var isFr = (t('pl_weekLabel') || '').toLowerCase().indexOf('semaine') >= 0;
      var prefix = isFr ? 'Semaine du ' : 'Week of ';

      return {
        key: 'mon-' + mondayStr,
        label: prefix + formatExportDate(mondayStr)
      };
    }

    // ── Drag-to-copy helpers ────────────────────────────────────
    function _clearDragPopover() {
      var el = document.getElementById('drag-copy-popover');
      if (el) el.style.display = 'none';
    }

    function _showDragCopyPopover(payloadOrSrcId, targetInfo, anchorEl, dropEvent) {
      var payload = (typeof payloadOrSrcId === 'object' && payloadOrSrcId !== null)
        ? payloadOrSrcId
        : { type: 'entry', srcEntryId: payloadOrSrcId };

      var srcId = payload.srcEntryId;
      var srcEntry = entries.find(function (e) { return e.id === srcId; });
      var srcLabel = (srcEntry && srcEntry.topic) ? srcEntry.topic.slice(0, 40) : (srcEntry ? plannerClassDisplayName(srcEntry.classId) || t('pl_emptySlot') : t('pl_emptySlot'));

      var tgtLabel = t('pl_emptySlot');
      if (targetInfo.entryId) {
        var tgtEntry = entries.find(function (e) { return e.id === targetInfo.entryId; });
        tgtLabel = (tgtEntry && tgtEntry.topic) ? tgtEntry.topic.slice(0, 40) : (tgtEntry ? plannerClassDisplayName(tgtEntry.classId) || t('pl_emptySlot') : t('pl_emptySlot'));
      }

      var msg = '';
      if (payload.type === 'field') {
        var fieldName = payload.fieldType === 'notes' ? t('pl_entryNotes') : (payload.fieldKey || t('pl_customField'));
        if (targetInfo.entryId) {
          msg = tFmt('pl_dragCopyFieldMsg', { field: fieldName, src: srcLabel, tgt: tgtLabel });
        } else {
          msg = tFmt('pl_dragCopyFieldSlot', { field: fieldName, src: srcLabel });
        }
      } else if (payload.type === 'entry-type') {
        var tLabel = typeLabel(payload.entryType);
        if (targetInfo.entryId) {
          msg = tFmt('pl_dragCopyTypeMsg', { type: tLabel, tgt: tgtLabel });
        } else {
          msg = tFmt('pl_dragCopyTypeSlot', { type: tLabel });
        }
      } else if (payload.type === 'lesson-plan') {
        var lpObj = (typeof plannerLessonPlansByEntryId !== 'undefined' && plannerLessonPlansByEntryId[String(payload.planId)]) ||
                    (typeof plannerLessonPlansList !== 'undefined' && plannerLessonPlansList.find(function (p) { return p.id === payload.planId; })) ||
                    (srcEntry ? (plannerLessonPlanForSlot({ classId: srcEntry.classId, date: srcEntry.date, time: srcEntry.time }, srcEntry) || {}).plan : null);
        var lpTitle = (lpObj && lpObj.title) ? lpObj.title.slice(0, 40) : t('pl_lessonPlanBadge');
        if (targetInfo.entryId) {
          msg = tFmt('pl_dragCopyLpMsg', { plan: lpTitle, tgt: tgtLabel });
        } else {
          msg = tFmt('pl_dragCopyLpSlot', { plan: lpTitle });
        }
      } else if (payload.type === 'board-session') {
        var bFile = (typeof plannerBoardFilesList !== 'undefined' && plannerBoardFilesList.find(function (f) { return f.relativePath === payload.boardRelPath; })) || null;
        var bTitle = (bFile && bFile.title) ? bFile.title.slice(0, 40) : (payload.boardRelPath ? payload.boardRelPath.split('/').pop() : t('pl_boardOpen'));
        if (targetInfo.entryId) {
          msg = tFmt('pl_dragCopyBoardMsg', { board: bTitle, tgt: tgtLabel }) || ('Link Board "' + bTitle + '" to "' + tgtLabel + '"?');
        } else {
          msg = tFmt('pl_dragCopyBoardSlot', { board: bTitle }) || ('Link Board "' + bTitle + '" to this slot?');
        }
      } else {
        if (targetInfo.entryId) {
          msg = tFmt('pl_dragCopyMsg', { src: srcLabel, tgt: tgtLabel });
        } else {
          msg = tFmt('pl_dragCopyMsgSlot', { src: srcLabel });
        }
      }

      var popover = document.getElementById('drag-copy-popover');
      if (!popover) return;
      document.getElementById('dcp-msg').textContent = msg;
      popover.style.display = 'block';

      // Position near the drop target
      var rect = anchorEl ? anchorEl.getBoundingClientRect() : null;
      var px = rect ? Math.min(rect.left + 8, window.innerWidth - 340) : (dropEvent ? dropEvent.clientX : 100);
      var py = rect ? (rect.bottom + 6) : (dropEvent ? dropEvent.clientY + 10 : 100);
      if (py + 100 > window.innerHeight) py = (rect ? rect.top : py) - 90;
      popover.style.left = Math.max(8, px) + 'px';
      popover.style.top = Math.max(8, py) + 'px';

      // Capture for confirm/cancel
      popover._pendingPayload = payload;
      popover._pendingTargetInfo = targetInfo;
    }

    async function _applyDragCopy(payloadOrSrcId, targetInfo) {
      var payload = (typeof payloadOrSrcId === 'object' && payloadOrSrcId !== null)
        ? payloadOrSrcId
        : { type: 'entry', srcEntryId: payloadOrSrcId };

      var srcEntry = entries.find(function (e) { return e.id === payload.srcEntryId; });
      var updatedEntry = null;
      var activeCls = (filterClasses && filterClasses.size === 1) ? Array.from(filterClasses)[0] : '';

      if (payload.type === 'field') {
        if (targetInfo && targetInfo.entryId) {
          var tgtEntry = entries.find(function (e) { return e.id === targetInfo.entryId; });
          if (!tgtEntry) return;
          if (payload.fieldType === 'notes') {
            tgtEntry.notes = payload.fieldVal || '';
          } else if (payload.fieldType === 'custom') {
            tgtEntry.customFields = tgtEntry.customFields ? Object.assign({}, tgtEntry.customFields) : {};
            tgtEntry.customFields[payload.fieldKey] = payload.fieldVal || '';
          }
          updatedEntry = tgtEntry;
        } else if (targetInfo && targetInfo.date) {
          var newEntry = {
            id: uid(),
            classId: targetInfo.classId || (srcEntry ? srcEntry.classId : '') || activeCls,
            date: targetInfo.date,
            time: targetInfo.time || '',
            timeEnd: targetInfo.timeEnd || '',
            type: 'lesson',
            topic: '',
            objective: '',
            notes: payload.fieldType === 'notes' ? (payload.fieldVal || '') : '',
            customFields: payload.fieldType === 'custom' ? { [payload.fieldKey]: payload.fieldVal || '' } : undefined,
            gsLink: null,
            lessonPlanId: null
          };
          entries.push(newEntry);
          updatedEntry = newEntry;
        }
        await persistEntries();
        render();
        showToast(t('pl_dragCopyFieldDone') || 'Field copied');
        return;
      }

      if (payload.type === 'entry-type') {
        if (targetInfo && targetInfo.entryId) {
          var tgtEntry = entries.find(function (e) { return e.id === targetInfo.entryId; });
          if (!tgtEntry) return;
          if (tgtEntry.type === 'test' && payload.entryType !== 'test' && tgtEntry.gsLink) {
            var ok = await showConfirm(t('pl_confirmOverwriteTestEntry') || 'This slot contains a test linked to Grade Sheet. Changing its type will unlink the Grade Sheet test. Continue?');
            if (!ok) return;
            await removeTestFromGradeSheet(tgtEntry);
            tgtEntry.gsLink = null;
          }
          tgtEntry.type = payload.entryType;
          updatedEntry = tgtEntry;
        } else if (targetInfo && targetInfo.date) {
          var newEntry = {
            id: uid(),
            classId: targetInfo.classId || (srcEntry ? srcEntry.classId : '') || activeCls,
            date: targetInfo.date,
            time: targetInfo.time || '',
            timeEnd: targetInfo.timeEnd || '',
            type: payload.entryType,
            topic: '',
            objective: '',
            notes: '',
            gsLink: null,
            lessonPlanId: null
          };
          entries.push(newEntry);
          updatedEntry = newEntry;
        }
        if (updatedEntry && updatedEntry.type === 'test') {
          if (!updatedEntry.classId) {
            updatedEntry.classId = (srcEntry ? srcEntry.classId : '') || ((filterClasses && filterClasses.size === 1) ? Array.from(filterClasses)[0] : '');
          }
          if (updatedEntry.classId) {
            await syncTestToGradeSheet(updatedEntry, false);
          }
        }
        await persistEntries();
        render();
        showToast(t('pl_dragCopyTypeDone') || 'Entry type updated');
        return;
      }

      if (payload.type === 'lesson-plan') {
        var sourcePlan = null;
        if (payload.planId) {
          sourcePlan = (typeof plannerLessonPlansByEntryId !== 'undefined' && plannerLessonPlansByEntryId[String(payload.planId)]) ||
                       (typeof plannerLessonPlansList !== 'undefined' && plannerLessonPlansList.find(function (p) { return p.id === payload.planId; }));
        }
        if (!sourcePlan && srcEntry) {
          var lpSlotLink = plannerLessonPlanForSlot({ classId: srcEntry.classId, date: srcEntry.date, time: srcEntry.time }, srcEntry);
          if (lpSlotLink && lpSlotLink.plan) sourcePlan = lpSlotLink.plan;
        }
        if (!sourcePlan) {
          showToast('Lesson plan not found', true);
          return;
        }

        if (targetInfo && targetInfo.entryId) {
          var tgtEntry = entries.find(function (e) { return e.id === targetInfo.entryId; });
          if (!tgtEntry) return;
          updatedEntry = tgtEntry;
        } else if (targetInfo && targetInfo.date) {
          var newEntry = {
            id: uid(),
            classId: targetInfo.classId || (srcEntry ? srcEntry.classId : '') || activeCls,
            date: targetInfo.date,
            time: targetInfo.time || '',
            timeEnd: targetInfo.timeEnd || '',
            type: 'lesson',
            topic: sourcePlan.title || '',
            objective: sourcePlan.objective || '',
            notes: '',
            gsLink: null,
            lessonPlanId: null
          };
          entries.push(newEntry);
          updatedEntry = newEntry;
        }

        if (updatedEntry) {
          try {
            var clonedPlan = JSON.parse(JSON.stringify(sourcePlan));
            var newPlanId = 'lp-' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0') + '-' + Date.now().toString(16);
            clonedPlan.id = newPlanId;
            clonedPlan.plannerEntryId = updatedEntry.id;
            clonedPlan.classId = updatedEntry.classId || clonedPlan.classId || '';
            clonedPlan.date = updatedEntry.date || clonedPlan.date || '';
            var slug = (clonedPlan.title || 'lesson').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
            var saveFilename = 'lp_' + (clonedPlan.classId || 'general') + '_' + (clonedPlan.date || 'date') + '_' + slug + '_' + newPlanId + '.json';
            clonedPlan._filename = saveFilename;
            clonedPlan._relPath = 'lessons/' + saveFilename;

            if (window.Desktop && Desktop.isElectron()) {
              if (typeof Desktop.saveJson === 'function') {
                await Desktop.saveJson('lessons', saveFilename, clonedPlan);
              } else if (typeof Desktop.saveText === 'function') {
                await Desktop.saveText('user', 'lessons/' + saveFilename, JSON.stringify(clonedPlan, null, 2));
              }
            } else {
              localStorage.setItem('cmt-lesson-' + newPlanId, JSON.stringify(clonedPlan));
            }

            updatedEntry.lessonPlanId = newPlanId;
            if (typeof plannerLessonPlansByEntryId !== 'undefined') {
              plannerLessonPlansByEntryId[String(newPlanId)] = clonedPlan;
              plannerLessonPlansByEntryId[String(updatedEntry.id)] = clonedPlan;
            }
            if (typeof plannerLessonPlansBySlotKey !== 'undefined') {
              var newSlotKey = String(clonedPlan.classId) + ':' + String(clonedPlan.date);
              if (!plannerLessonPlansBySlotKey[newSlotKey]) plannerLessonPlansBySlotKey[newSlotKey] = [];
              plannerLessonPlansBySlotKey[newSlotKey].push(clonedPlan);
            }
            if (typeof plannerLessonPlansList !== 'undefined') {
              plannerLessonPlansList.push(clonedPlan);
            }

            if (typeof loadSavedLessonPlans === 'function') {
              await loadSavedLessonPlans();
            }
          } catch (copyErr) {
            console.warn('Failed to duplicate lesson plan:', copyErr);
          }
        }
        await persistEntries();
        render();
        showToast(t('pl_dragCopyLpDone') || 'Lesson plan duplicated');
        return;
      }

      if (payload.type === 'board-session') {
        var boardRelPath = payload.boardRelPath || '';
        if (!boardRelPath && payload.boardLinkId) {
          var bSessList = plannerBoardSessions[String(payload.boardLinkId)] || [];
          if (bSessList.length && bSessList[0].relativePath) boardRelPath = bSessList[0].relativePath;
        }
        if (!boardRelPath) {
          showToast(t('pl_noSavedBoardFiles') || 'Board file not found', true);
          return;
        }

        if (targetInfo && targetInfo.entryId) {
          var tgtEntryB = entries.find(function (e) { return e.id === targetInfo.entryId; });
          if (!tgtEntryB) return;
          updatedEntry = tgtEntryB;
        } else if (targetInfo && targetInfo.date) {
          var bFileInfo = (typeof plannerBoardFilesList !== 'undefined' && plannerBoardFilesList.find(function (f) { return f.relativePath === boardRelPath; })) || null;
          var newEntryB = {
            id: uid(),
            classId: targetInfo.classId || (srcEntry ? srcEntry.classId : '') || activeCls,
            date: targetInfo.date,
            time: targetInfo.time || '',
            timeEnd: targetInfo.timeEnd || '',
            type: 'lesson',
            topic: (bFileInfo && bFileInfo.title) ? bFileInfo.title : '',
            objective: '',
            notes: '',
            gsLink: null,
            lessonPlanId: null
          };
          entries.push(newEntryB);
          updatedEntry = newEntryB;
        }

        if (updatedEntry) {
          await plannerUpdateBoardFileSlotsOnDisk(boardRelPath, {
            addIds: [updatedEntry.id],
            classGroup: updatedEntry.classId || ''
          });
          await persistEntries();
          await loadBoardSessions();
          render();
          showToast(t('pl_dragCopyBoardDone') || 'Board file linked to slot');
        }
        return;
      }

      // ── Whole Entry Duplicate (type === 'entry') ─────────────
      if (!srcEntry) return;

      if (targetInfo && targetInfo.entryId) {
        // ── Overwrite existing entry ──────────────────────────
        var tgtEntry = entries.find(function (e) { return e.id === targetInfo.entryId; });
        if (!tgtEntry || tgtEntry.id === payload.srcEntryId) return;

        var confirmMsg = (tgtEntry.type === 'test' || tgtEntry.gsLink)
          ? (t('pl_confirmOverwriteTestEntry') || 'This slot contains a test linked to Grade Sheet. Overwriting it will affect the Grade Sheet test. Continue?')
          : (t('pl_confirmOverwriteEntry') || 'An entry already exists in this slot. Overwrite it?');

        var ok = await showConfirm(confirmMsg);
        if (!ok) return;

        if (tgtEntry.gsLink) {
          await removeTestFromGradeSheet(tgtEntry);
          tgtEntry.gsLink = null;
        }

        tgtEntry.classId = targetInfo.classId || tgtEntry.classId || srcEntry.classId || activeCls;
        tgtEntry.type = srcEntry.type;
        tgtEntry.topic = srcEntry.topic || '';
        tgtEntry.objective = srcEntry.objective || '';
        tgtEntry.notes = srcEntry.notes || '';
        tgtEntry.customFields = srcEntry.customFields
          ? Object.assign({}, srcEntry.customFields) : undefined;
        tgtEntry.gsLink = null;

        updatedEntry = tgtEntry;
      } else if (targetInfo && targetInfo.date) {
        // ── Create new entry in empty slot ───────────────────
        var newEntry = {
          id: uid(),
          classId: targetInfo.classId || srcEntry.classId || activeCls,
          date: targetInfo.date,
          time: targetInfo.time || '',
          timeEnd: targetInfo.timeEnd || '',
          type: srcEntry.type,
          topic: srcEntry.topic || '',
          objective: srcEntry.objective || '',
          notes: srcEntry.notes || '',
          customFields: srcEntry.customFields
            ? Object.assign({}, srcEntry.customFields) : undefined,
          gsLink: null,
          lessonPlanId: null
        };
        entries.push(newEntry);
        updatedEntry = newEntry;
      } else {
        return;
      }

      // Check if source entry had a linked lesson plan; duplicate it for the new entry!
      var srcSlot = { classId: srcEntry.classId, date: srcEntry.date, time: srcEntry.time };
      var srcLpLink = plannerLessonPlanForSlot(srcSlot, srcEntry);
      if (srcLpLink && srcLpLink.plan) {
        try {
          var clonedPlan = JSON.parse(JSON.stringify(srcLpLink.plan));
          var newPlanId = 'lp-' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0') + '-' + Date.now().toString(16);
          clonedPlan.id = newPlanId;
          clonedPlan.plannerEntryId = updatedEntry.id;
          clonedPlan.classId = updatedEntry.classId || clonedPlan.classId || '';
          clonedPlan.date = updatedEntry.date || clonedPlan.date || '';
          var slug = (clonedPlan.title || 'lesson').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
          var saveFilename = 'lp_' + (clonedPlan.classId || 'general') + '_' + (clonedPlan.date || 'date') + '_' + slug + '_' + newPlanId + '.json';
          clonedPlan._filename = saveFilename;
          clonedPlan._relPath = 'lessons/' + saveFilename;

          if (window.Desktop && Desktop.isElectron()) {
            if (typeof Desktop.saveJson === 'function') {
              await Desktop.saveJson('lessons', saveFilename, clonedPlan);
            } else if (typeof Desktop.saveText === 'function') {
              await Desktop.saveText('user', 'lessons/' + saveFilename, JSON.stringify(clonedPlan, null, 2));
            }
          } else {
            localStorage.setItem('cmt-lesson-' + newPlanId, JSON.stringify(clonedPlan));
          }

          updatedEntry.lessonPlanId = newPlanId;

          // Register in local lookup structures immediately
          if (typeof plannerLessonPlansByEntryId !== 'undefined') {
            plannerLessonPlansByEntryId[String(newPlanId)] = clonedPlan;
            plannerLessonPlansByEntryId[String(updatedEntry.id)] = clonedPlan;
          }
          if (typeof plannerLessonPlansBySlotKey !== 'undefined') {
            var newSlotKey = String(clonedPlan.classId) + ':' + String(clonedPlan.date);
            if (!plannerLessonPlansBySlotKey[newSlotKey]) plannerLessonPlansBySlotKey[newSlotKey] = [];
            plannerLessonPlansBySlotKey[newSlotKey].push(clonedPlan);
          }
          if (typeof plannerLessonPlansList !== 'undefined') {
            plannerLessonPlansList.push(clonedPlan);
          }

          if (typeof loadSavedLessonPlans === 'function') {
            await loadSavedLessonPlans();
          }
        } catch (copyErr) {
          console.warn('Failed to duplicate linked lesson plan:', copyErr);
        }
      }

      // Check if source entry had linked Board sessions; link them to the new entry too!
      var srcBoardLink = plannerBoardSessionsForSlot(srcSlot, srcEntry);
      if (srcBoardLink && Array.isArray(srcBoardLink.sessions) && srcBoardLink.sessions.length > 0 && updatedEntry && updatedEntry.id) {
        try {
          var seenBoardRelPaths = new Set();
          for (var bIdx = 0; bIdx < srcBoardLink.sessions.length; bIdx++) {
            var bSess = srcBoardLink.sessions[bIdx];
            var bRel = bSess && bSess.relativePath ? bSess.relativePath : '';
            if (bRel && !seenBoardRelPaths.has(bRel)) {
              seenBoardRelPaths.add(bRel);
              await plannerUpdateBoardFileSlotsOnDisk(bRel, {
                addIds: [updatedEntry.id],
                classGroup: updatedEntry.classId || ''
              });
            }
          }
          if (seenBoardRelPaths.size > 0) {
            await loadBoardSessions();
          }
        } catch (bErr) {
          console.warn('Failed to link board sessions to duplicated entry:', bErr);
        }
      }

      await persistEntries();
      render();

      if (updatedEntry && updatedEntry.type === 'test') {
        if (!updatedEntry.classId) {
          updatedEntry.classId = srcEntry.classId || ((filterClasses && filterClasses.size === 1) ? Array.from(filterClasses)[0] : '');
        }
        if (updatedEntry.classId) {
          await syncTestToGradeSheet(updatedEntry, false);
        }
      }

      showToast(t('pl_dragCopyDone'));
    }

    async function dragCopyConfirm() {
      var popover = document.getElementById('drag-copy-popover');
      if (!popover) return;
      var payload = popover._pendingPayload || popover._pendingSrcId;
      var targetInfo = popover._pendingTargetInfo;
      _clearDragPopover();
      await _applyDragCopy(payload, targetInfo);
    }

    function dragCopyCancel() {
      _clearDragPopover();
    }

    // ── Persist ────────────────────────────────────────────────────────────────
    async function persistCfg() {
      setStatus(t('loading'));
      if (!window.Desktop || !Desktop.isElectron()) { setStatus(''); return; }
      var content = 'window.PLANNER_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n';
      var r = await Desktop.saveText('user', 'planner-config.js', content);
      setStatus(r && r.ok ? t('saved') : '!');
      setTimeout(function () { setStatus(''); }, 1800);
    }
    async function persistEntries() {
      if (!window.Desktop || !Desktop.isElectron()) return;
      await plannerRefreshDeletedClassFiles();
      var byClass = {};
      entries.forEach(function (e) {
        if (!byClass[e.classId]) byClass[e.classId] = [];
        byClass[e.classId].push(e);
      });
      var persistedByClass = {};
      var cids = Object.keys(byClass);
      for (var i = 0; i < cids.length; i++) {
        var cid = cids[i];
        if (plannerDeletedClassFiles[cid]) continue;
        persistedByClass[cid] = byClass[cid];
        var content = 'window.PLANNER_ENTRIES_BY_CLASS = window.PLANNER_ENTRIES_BY_CLASS || {};\n' +
          'window.PLANNER_ENTRIES_BY_CLASS[' + JSON.stringify(cid) + '] = ' +
          JSON.stringify(byClass[cid], null, 2) + ';\n';
        await Desktop.saveText('user', (cid || '__unassigned') + '.js', content, 'planner');
        plannerKnownClassFiles[cid] = true;
      }

      // Remove stale planner files for classes that no longer have entries.
      var knownCids = Object.keys(plannerKnownClassFiles || {});
      for (var j = 0; j < knownCids.length; j++) {
        var knownCid = knownCids[j];
        if (plannerDeletedClassFiles[knownCid]) continue;
        if (Object.prototype.hasOwnProperty.call(byClass, knownCid)) continue;
        try {
          await Desktop.deleteByPath('user', 'planner/' + (knownCid || '__unassigned') + '.js');
        } catch (e) { }
        delete plannerKnownClassFiles[knownCid];
      }

      window.PLANNER_ENTRIES_BY_CLASS = persistedByClass;
      if (_legacyMigration) {
        try { await Desktop.deleteFile('user', 'planner-entries.js'); } catch (e) { }
        _legacyMigration = false;
      }
    }
    function setStatus(msg) { var el = document.getElementById('save-status'); if (el) el.textContent = msg; }

    // ── Toast ──────────────────────────────────────────────────────────────────
    var _toastTimer = null;
    function showToast(msg, isErrorOrDur) {
      if (typeof window._dlgShowToast === 'function') {
        window._dlgShowToast(msg, isErrorOrDur);
      } else {
        var el = document.getElementById('gs-toast');
        if (el) {
          el.textContent = msg; el.classList.add('show');
          clearTimeout(_toastTimer);
          var dur = typeof isErrorOrDur === 'number' ? isErrorOrDur : 2500;
          _toastTimer = setTimeout(function () { el.classList.remove('show'); }, dur);
        }
      }
    }


    // ── Confirm popup ──────────────────────────────────────────────────────────
    var _confirmCb = null;
    function showConfirm(msg, onOk) {
      if (typeof window._dlgShowConfirm === 'function') {
        window._dlgShowConfirm(msg).then(function (ok) {
          if (ok && onOk) onOk();
        });
      } else {
        _confirmCb = onOk;
        document.getElementById('confirm-msg').textContent = msg;
        openModal('confirmModal');
      }
    }
    function resolveConfirm(ok) {
      closeModal('confirmModal');
      var cb = _confirmCb; _confirmCb = null;
      if (ok && cb) cb();
    }

    // ── Toolbar actions ────────────────────────────────────────────────────────
    function toggleClassFilter(id) {
      if (filterClasses.has(id)) filterClasses.delete(id);
      else filterClasses.add(id);
      rebuildFilterChips(getPlannerClassIds());
      renderAgenda();
    }
    function toggleUnassignedFilter() {
      filterUnassigned = !filterUnassigned;
      saveViewFlags();
      rebuildFilterChips(getPlannerClassIds());
      renderAgenda();
    }
    function clearClassFilter() {
      filterClasses.clear();
      filterUnassigned = false;
      saveViewFlags();
      rebuildFilterChips(getPlannerClassIds());
      renderAgenda();
    }

    function syncToggleSeg(id, activeState) {
      var wrap = document.getElementById(id);
      if (!wrap) return;
      var btns = wrap.querySelectorAll('.tb-seg-opt');
      for (var i = 0; i < btns.length; i++) {
        var isOn = btns[i].getAttribute('data-state') === activeState;
        btns[i].classList.toggle('active', isOn);
        btns[i].setAttribute('aria-pressed', isOn ? 'true' : 'false');
      }
    }

    function setShowPast(val) {
      showPast = !!val;
      syncToggleSeg('pastBtn', showPast ? 'show' : 'hide');
      saveViewFlags();
      renderAgenda();
    }

    function toggleShowPast() {
      setShowPast(!showPast);
    }

    function setShowOutsideTerm(val) {
      showOutsideTerm = !!val;
      syncToggleSeg('outsideBtn', showOutsideTerm ? 'all' : 'active');
      saveViewFlags();
      renderAgenda();
    }

    function toggleShowOutsideTerm() {
      setShowOutsideTerm(!showOutsideTerm);
    }

    function setViewMode(mode) {
      if (['list', 'day', 'week', 'month', 'year'].indexOf(mode) === -1) mode = 'list';
      viewMode = mode;
      tableView = (mode === 'week');
      syncToggleSeg('viewBtn', viewMode);
      saveViewFlags();
      renderAgenda();
    }

    function navigateView(delta) {
      var d = new Date(viewAnchorDate + 'T12:00:00');
      if (isNaN(d.getTime())) d = new Date();
      if (viewMode === 'day') {
        d.setDate(d.getDate() + delta);
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() + delta * 7);
      } else if (viewMode === 'month') {
        d.setDate(1);
        d.setMonth(d.getMonth() + delta);
      } else if (viewMode === 'year') {
        d.setFullYear(d.getFullYear() + delta);
      }
      viewAnchorDate = d.toISOString().slice(0, 10);
      renderAgenda();
    }

    function goToToday() {
      var todayStr = new Date().toISOString().slice(0, 10);
      viewAnchorDate = todayStr;
      if (viewMode === 'list') {
        var groups = document.querySelectorAll('#agenda .date-group[data-date]');
        var target = null;
        for (var i = 0; i < groups.length; i++) {
          var d = groups[i].getAttribute('data-date');
          if (d && d >= todayStr) { target = groups[i]; break; }
        }
        if (!target && groups.length) target = groups[groups.length - 1];
        if (target) {
          var wg = target.closest('.week-group');
          if (wg && wg.classList.contains('collapsed')) {
            wg.classList.remove('collapsed');
            var wkAttr = wg.getAttribute('data-week');
            if (wkAttr != null && activeSemId) {
              if (!window._plannerManualWeekCollapse) window._plannerManualWeekCollapse = {};
              window._plannerManualWeekCollapse[activeSemId + ':' + wkAttr] = false;
            }
          }
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      renderAgenda();
      var mainEl = document.getElementById('main');
      if (mainEl) mainEl.scrollTop = 0;
    }

    function drillDownToView(mode, dateStr) {
      if (dateStr) viewAnchorDate = dateStr;
      setViewMode(mode);
    }

    function setTableView(val) {
      setViewMode(val ? 'week' : 'list');
    }

    function toggleView() {
      setViewMode(viewMode === 'week' ? 'list' : 'week');
    }

    // ── Shared Time-Grid Helpers ──────────────────────────────────────────────
    function plHmToMin(hm) {
      var s = String(hm || '').trim();
      if (!/^\d{1,2}:\d{2}$/.test(s)) return null;
      var p = s.split(':');
      var h = parseInt(p[0], 10);
      var m = parseInt(p[1], 10);
      if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
      return h * 60 + m;
    }

    function plMinToHm(mins) {
      var m = Math.max(0, parseInt(mins, 10) || 0);
      var hh = Math.floor(m / 60);
      var mm = m % 60;
      return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    }

    function plAssignOverlapLanes(items) {
      var lanesEnd = [];
      items.forEach(function (it) {
        var lane = -1;
        for (var i = 0; i < lanesEnd.length; i++) {
          if (it.start >= lanesEnd[i]) { lane = i; break; }
        }
        if (lane < 0) {
          lane = lanesEnd.length;
          lanesEnd.push(it.end);
        } else {
          lanesEnd[lane] = it.end;
        }
        it._lane = lane;
      });
      var total = Math.max(1, lanesEnd.length);
      items.forEach(function (it) { it._laneCount = total; });
    }

    // ── Day View ────────────────────────────────────────────────────────────────
    function computeInitialTimeGridRowHeight(el, rowCount) {
      var avail = el && el.clientHeight > 0 ? el.clientHeight : Math.max(320, (window.innerHeight || 768) - 220);
      var estGridAvail = Math.max(120, avail - 48);
      return Math.max(22, Math.min(84, Math.floor(estGridAvail / Math.max(1, rowCount))));
    }

    function fitTimeGridToViewport(el) {
      if (!el || (viewMode !== 'day' && viewMode !== 'week')) return;
      var scaleEl = el.querySelector('.at-time-scale[data-row-count]');
      if (!scaleEl) return;
      var availTotal = el.clientHeight;
      if (!(availTotal > 0)) return;
      var rowCount = parseInt(scaleEl.getAttribute('data-row-count'), 10) || 1;
      var gridStart = parseInt(scaleEl.getAttribute('data-grid-start'), 10) || 0;
      var stepMin = parseInt(scaleEl.getAttribute('data-step-min'), 10) || 60;

      var nonGrid = 4;
      var allday = el.querySelector('.allday-strip');
      if (allday) nonGrid += allday.offsetHeight + 6;
      var thead = el.querySelector('.agenda-table thead');
      if (thead) nonGrid += thead.offsetHeight;
      var weekAllday = el.querySelector('.week-allday-row');
      if (weekAllday) nonGrid += weekAllday.offsetHeight;

      var availGridH = Math.max(120, availTotal - nonGrid);
      var newRowH = Math.max(22, Math.min(84, Math.floor(availGridH / rowCount)));
      var curRowH = parseFloat(scaleEl.getAttribute('data-row-h')) || 0;
      if (Math.abs(newRowH - curRowH) < 1) return;

      var newGridH = rowCount * newRowH;
      var containers = el.querySelectorAll('.at-time-scale, .at-day-lane');
      for (var i = 0; i < containers.length; i++) {
        containers[i].style.height = newGridH + 'px';
        containers[i].style.setProperty('--row-h', newRowH + 'px');
        containers[i].setAttribute('data-row-h', String(newRowH));
      }

      var ticks = scaleEl.querySelectorAll('.at-time-tick[data-tick-min]');
      for (var j = 0; j < ticks.length; j++) {
        var m = parseFloat(ticks[j].getAttribute('data-tick-min'));
        if (!isNaN(m)) {
          ticks[j].style.top = (((m - gridStart) / stepMin) * newRowH) + 'px';
        }
      }

      var cells = el.querySelectorAll('.at-day-lane .at-cell[data-start-min], .at-day-lane .at-cell-empty[data-start-min]');
      for (var k = 0; k < cells.length; k++) {
        var cell = cells[k];
        var st = parseFloat(cell.getAttribute('data-start-min'));
        var en = parseFloat(cell.getAttribute('data-end-min'));
        if (isNaN(st) || isNaN(en)) continue;
        var top = ((st - gridStart) / stepMin) * newRowH;
        var h = ((en - st) / stepMin) * newRowH;
        if (!(h > 0)) h = newRowH;
        h = Math.max(22, h - 4);
        cell.style.top = top + 'px';
        cell.style.height = h + 'px';
        if (cell.classList.contains('at-cell')) {
          cell.classList.toggle('at-cell-micro', h < 38);
          cell.classList.toggle('at-cell-compact', h >= 38 && h < 56);
          cell.classList.toggle('at-cell-tall', h >= 92);
        }
      }
    }

    function renderDayView(el, activeSem) {
      var ABS_STEP_MIN = 60;
      var dateStr = viewAnchorDate;
      var todayStr = new Date().toISOString().slice(0, 10);
      var allSlots = activeSem ? getFilteredViewSlots(activeSem, true) : [];
      var daySlots = allSlots.filter(function (s) { return !s.isGlobalHoliday && s.date === dateStr; });
      var holMap = getHolidayDatesMap(activeSem);
      var todosByDate = getTodosByDateMap();
      var dayTodos = todosByDate[dateStr] || [];
      var holLabel = holMap[dateStr] || '';

      var timedItems = [];
      var untimedSlots = [];
      var minStart = 8 * 60;
      var maxEnd = 17 * 60;

      daySlots.forEach(function (s) {
        var st = plHmToMin(s.time || '');
        if (st == null) {
          untimedSlots.push(s);
          return;
        }
        var en = plHmToMin(s.timeEnd || '');
        if (en == null || en <= st) en = st + ABS_STEP_MIN;
        minStart = Math.min(minStart, st);
        maxEnd = Math.max(maxEnd, en);
        timedItems.push({ slot: s, start: st, end: en });
      });

      timedItems.sort(function (a, b) {
        if (a.start !== b.start) return a.start - b.start;
        if (a.end !== b.end) return a.end - b.end;
        return plannerClassDisplayName(a.slot.classId || '').localeCompare(plannerClassDisplayName(b.slot.classId || ''));
      });
      plAssignOverlapLanes(timedItems);

      var gridStart = Math.floor(minStart / ABS_STEP_MIN) * ABS_STEP_MIN;
      var gridEnd = Math.ceil(maxEnd / ABS_STEP_MIN) * ABS_STEP_MIN;
      if (gridEnd <= gridStart) gridEnd = gridStart + ABS_STEP_MIN;
      var rowCount = Math.max(1, Math.ceil((gridEnd - gridStart) / ABS_STEP_MIN));
      var ABS_ROW_HEIGHT = computeInitialTimeGridRowHeight(el, rowCount);
      var gridHeight = rowCount * ABS_ROW_HEIGHT;

      var html = '<div class="day-view-wrap">';
      if (holLabel || dayTodos.length || untimedSlots.length) {
        html += '<div class="allday-strip">';
        html += '<span class="allday-label">' + esc(t('pl_allDay')) + '</span>';
        if (holLabel) {
          html += '<span class="allday-pill is-holiday">' + esc(holLabel) + '</span>';
        }
        if (dayTodos.length) {
          html += renderTodoCalChipsHtml(dayTodos);
        }
        untimedSlots.forEach(function (s) {
          var clsName = s.classId ? plannerClassDisplayName(s.classId) : t('pl_noClass');
          var topic = s.entry && s.entry.topic ? s.entry.topic : '';
          var lbl = (viewOpts.classPill ? clsName : '') + (viewOpts.topic && topic ? (viewOpts.classPill ? ': ' : '') + topic : '');
          if (!lbl) lbl = t('pl_allDay');
          var eid = s.entry ? s.entry.id : '';
          html += '<span class="allday-pill" style="cursor:pointer" data-pl-action="' + (eid ? 'at-cell-click' : 'at-cell-empty') + '" data-pl-entry="' + esc(eid) + '" data-pl-class="' + esc(s.classId || '') + '" data-pl-date="' + esc(dateStr) + '" data-pl-time="" data-pl-timeend="">' + esc(lbl) + '</span>';
        });
        html += '</div>';
      }

      var _timeHdr = t('pl_time');
      if (!_timeHdr || _timeHdr === 'pl_time') _timeHdr = 'Time';
      var dow = new Date(dateStr + 'T12:00:00').getDay();
      var isPast = dateStr < todayStr;

      html += '<table class="agenda-table day-view-table"><thead><tr>';
      html += '<th class="at-time-cell">' + esc(_timeHdr) + '</th>';
      html += '<th class="' + (isPast ? 'at-day-hdr-past' : '') + '">' + esc(t(DAY_KEYS[dow])) + ' · ' + esc(dateStr) + '</th>';
      html += '</tr></thead><tbody><tr>';
      html += '<td class="at-time-col"><div class="at-time-scale" data-grid-start="' + gridStart + '" data-step-min="' + ABS_STEP_MIN + '" data-row-count="' + rowCount + '" data-row-h="' + ABS_ROW_HEIGHT + '" style="height:' + gridHeight + 'px;--row-h:' + ABS_ROW_HEIGHT + 'px">';
      for (var m = gridStart; m <= gridEnd; m += ABS_STEP_MIN) {
        var top = ((m - gridStart) / ABS_STEP_MIN) * ABS_ROW_HEIGHT;
        html += '<div class="at-time-tick" data-tick-min="' + m + '" style="top:' + top + 'px">' + esc(plMinToHm(m)) + '</div>';
      }
      html += '</div></td>';

      html += '<td class="at-day-col' + (isPast ? ' at-day-col-past' : '') + '"><div class="at-day-lane" data-row-h="' + ABS_ROW_HEIGHT + '" style="height:' + gridHeight + 'px;--row-h:' + ABS_ROW_HEIGHT + 'px">';
      timedItems.forEach(function (it) {
        html += renderTableMatrixEntry(it.slot, {
          gridStart: gridStart,
          stepMin: ABS_STEP_MIN,
          rowHeight: ABS_ROW_HEIGHT,
          lane: it._lane || 0,
          laneCount: it._laneCount || 1,
          start: it.start,
          end: it.end
        });
      });
      html += '</div></td></tr></tbody></table></div>';

      el.innerHTML = html;
      fitTimeGridToViewport(el);
      _applyNavHighlight(false);
      updateWeekNav();
    }

    // ── Week View (Single Focused Week Timetable) ───────────────────────────────
    function renderTable() { renderWeekView(document.getElementById('agenda'), getActiveSem()); }

    function renderWeekView(el, activeSem) {
      var ABS_STEP_MIN = 60;
      var anchor = new Date(viewAnchorDate + 'T12:00:00');
      if (isNaN(anchor.getTime())) anchor = new Date();
      var fromMon = (anchor.getDay() + 6) % 7;
      var mondayDate = new Date(anchor.getTime() - fromMon * 86400000);

      var dayOrder = viewOpts.weekends ? [1, 2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5];
      var weekDateStrs = [];
      var dateToDow = Object.create(null);
      dayOrder.forEach(function (dow) {
        var offset = (dow + 6) % 7;
        var dd = new Date(mondayDate.getTime() + offset * 86400000);
        var ds = dd.toISOString().slice(0, 10);
        weekDateStrs.push(ds);
        dateToDow[ds] = dow;
      });
      var weekDateSet = new Set(weekDateStrs);

      var allSlots = activeSem ? getFilteredViewSlots(activeSem, true) : [];
      var holMap = getHolidayDatesMap(activeSem);
      var todosByDate = getTodosByDateMap();

      var byDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      var untimedByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      var minStart = 8 * 60;
      var maxEnd = 17 * 60;

      allSlots.forEach(function (s) {
        if (s.isGlobalHoliday || !weekDateSet.has(s.date)) return;
        var dow = dateToDow[s.date];
        if (dow === undefined) return;
        var st = plHmToMin(s.time || '');
        if (st == null) {
          untimedByDay[dow].push(s);
          return;
        }
        var en = plHmToMin(s.timeEnd || '');
        if (en == null || en <= st) en = st + ABS_STEP_MIN;
        minStart = Math.min(minStart, st);
        maxEnd = Math.max(maxEnd, en);
        byDay[dow].push({ slot: s, start: st, end: en });
      });

      dayOrder.forEach(function (dow) {
        var arr = byDay[dow];
        arr.sort(function (a, b) {
          if (a.start !== b.start) return a.start - b.start;
          if (a.end !== b.end) return a.end - b.end;
          return plannerClassDisplayName(a.slot.classId || '').localeCompare(plannerClassDisplayName(b.slot.classId || ''));
        });
        plAssignOverlapLanes(arr);
      });

      var gridStart = Math.floor(minStart / ABS_STEP_MIN) * ABS_STEP_MIN;
      var gridEnd = Math.ceil(maxEnd / ABS_STEP_MIN) * ABS_STEP_MIN;
      if (gridEnd <= gridStart) gridEnd = gridStart + ABS_STEP_MIN;
      var rowCount = Math.max(1, Math.ceil((gridEnd - gridStart) / ABS_STEP_MIN));
      var ABS_ROW_HEIGHT = computeInitialTimeGridRowHeight(el, rowCount);
      var gridHeight = rowCount * ABS_ROW_HEIGHT;
      var todayStr = new Date().toISOString().slice(0, 10);

      var hasAnyAllDay = weekDateStrs.some(function (ds) {
        var dow = dateToDow[ds];
        return !!holMap[ds] || (todosByDate[ds] && todosByDate[ds].length) || untimedByDay[dow].length;
      });

      var _timeHdr = t('pl_time');
      if (!_timeHdr || _timeHdr === 'pl_time') _timeHdr = 'Time';

      var html = '<div class="at-week-block"><div class="table-wrap"><table class="agenda-table"><thead><tr>';
      html += '<th class="at-time-cell">' + esc(_timeHdr) + '</th>';
      weekDateStrs.forEach(function (ds) {
        var dow = dateToDow[ds];
        var isDowPast = ds < todayStr;
        var shortD = new Date(ds + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        html += '<th class="' + (isDowPast ? 'at-day-hdr-past' : '') + '" style="cursor:pointer" data-pl-action="drill-day" data-pl-date="' + esc(ds) + '">' +
          esc(t(DAY_KEYS[dow])) + ' <span style="font-weight:500;opacity:0.75">' + esc(shortD) + '</span></th>';
      });
      html += '</tr></thead><tbody>';

      if (hasAnyAllDay) {
        html += '<tr class="week-allday-row"><th>' + esc(t('pl_allDay')) + '</th>';
        weekDateStrs.forEach(function (ds) {
          var dow = dateToDow[ds];
          html += '<td><div class="week-allday-stack">';
          if (holMap[ds]) html += '<span class="allday-pill is-holiday">' + esc(holMap[ds]) + '</span>';
          if (todosByDate[ds] && todosByDate[ds].length) html += renderTodoCalChipsHtml(todosByDate[ds]);
          untimedByDay[dow].forEach(function (s) {
            var clsName = s.classId ? plannerClassDisplayName(s.classId) : t('pl_noClass');
            var topic = s.entry && s.entry.topic ? s.entry.topic : '';
            var lbl = (viewOpts.classPill ? clsName : '') + (viewOpts.topic && topic ? (viewOpts.classPill ? ': ' : '') + topic : '');
            if (!lbl) lbl = t('pl_allDay');
            var eid = s.entry ? s.entry.id : '';
            html += '<span class="allday-pill" style="cursor:pointer" data-pl-action="' + (eid ? 'at-cell-click' : 'at-cell-empty') + '" data-pl-entry="' + esc(eid) + '" data-pl-class="' + esc(s.classId || '') + '" data-pl-date="' + esc(ds) + '" data-pl-time="" data-pl-timeend="">' + esc(lbl) + '</span>';
          });
          html += '</div></td>';
        });
        html += '</tr>';
      }

      html += '<tr><td class="at-time-col"><div class="at-time-scale" data-grid-start="' + gridStart + '" data-step-min="' + ABS_STEP_MIN + '" data-row-count="' + rowCount + '" data-row-h="' + ABS_ROW_HEIGHT + '" style="height:' + gridHeight + 'px;--row-h:' + ABS_ROW_HEIGHT + 'px">';
      for (var m = gridStart; m <= gridEnd; m += ABS_STEP_MIN) {
        var top = ((m - gridStart) / ABS_STEP_MIN) * ABS_ROW_HEIGHT;
        html += '<div class="at-time-tick" data-tick-min="' + m + '" style="top:' + top + 'px">' + esc(plMinToHm(m)) + '</div>';
      }
      html += '</div></td>';

      weekDateStrs.forEach(function (ds) {
        var dow = dateToDow[ds];
        var isDowPast = ds < todayStr;
        var dayItems = byDay[dow] || [];
        html += '<td class="at-day-col' + (isDowPast ? ' at-day-col-past' : '') + '"><div class="at-day-lane" data-row-h="' + ABS_ROW_HEIGHT + '" style="height:' + gridHeight + 'px;--row-h:' + ABS_ROW_HEIGHT + 'px">';
        dayItems.forEach(function (it) {
          html += renderTableMatrixEntry(it.slot, {
            gridStart: gridStart,
            stepMin: ABS_STEP_MIN,
            rowHeight: ABS_ROW_HEIGHT,
            lane: it._lane || 0,
            laneCount: it._laneCount || 1,
            start: it.start,
            end: it.end
          });
        });
        html += '</div></td>';
      });

      html += '</tr></tbody></table></div></div>';
      el.innerHTML = html;
      fitTimeGridToViewport(el);
      _applyNavHighlight(false);
      updateWeekNav();
    }

    // ── Month View ──────────────────────────────────────────────────────────────
    function renderMonthView(el, activeSem) {
      var anchor = new Date(viewAnchorDate + 'T12:00:00');
      if (isNaN(anchor.getTime())) anchor = new Date();
      var year = anchor.getFullYear();
      var month = anchor.getMonth();
      var firstOfMonth = new Date(year, month, 1, 12, 0, 0);
      var lastOfMonth = new Date(year, month + 1, 0, 12, 0, 0);
      var startDowOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
      var gridStart = new Date(firstOfMonth.getTime() - startDowOffset * 86400000);
      var endDowOffset = (lastOfMonth.getDay() + 6) % 7;
      var gridEnd = new Date(lastOfMonth.getTime() + (6 - endDowOffset) * 86400000);

      var allSlots = activeSem ? getFilteredViewSlots(activeSem, true) : [];
      var slotsByDate = Object.create(null);
      allSlots.forEach(function (s) {
        if (s.isGlobalHoliday) return;
        if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
        slotsByDate[s.date].push(s);
      });
      var holMap = getHolidayDatesMap(activeSem);
      var todosByDate = getTodosByDateMap();
      var todayStr = new Date().toISOString().slice(0, 10);
      var dayOrder = viewOpts.weekends ? [1, 2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5];
      var noWkClass = viewOpts.weekends ? '' : ' no-weekends';
      var weekRows = Math.max(4, Math.round((Math.round((gridEnd - gridStart) / 86400000) + 1) / 7));
      var availMonthH = el && el.clientHeight > 0 ? el.clientHeight - 36 : Math.max(300, (window.innerHeight || 768) - 250);
      var estCellH = Math.floor(availMonthH / weekRows);
      var maxMonthItems = Math.max(1, Math.min(4, Math.floor((estCellH - 30) / 22)));

      var html = '<div class="month-grid-wrap">';
      html += '<div class="month-dow-row' + noWkClass + '">';
      dayOrder.forEach(function (dow) {
        html += '<div class="month-dow-cell">' + esc(t(DAY_KEYS[dow])) + '</div>';
      });
      html += '</div><div class="month-grid' + noWkClass + '">';

      var cur = new Date(gridStart);
      var guard = 0;
      while (cur <= gridEnd && guard++ < 50) {
        var dow = cur.getDay();
        if (viewOpts.weekends || (dow !== 0 && dow !== 6)) {
          var ds = cur.toISOString().slice(0, 10);
          var isOutside = cur.getMonth() !== month;
          var isToday = ds === todayStr;
          var holLbl = holMap[ds] || '';
          var daySlots = slotsByDate[ds] || [];
          var dayTodos = todosByDate[ds] || [];

          html += '<div class="month-cell' + (isOutside ? ' outside' : '') + (isToday ? ' is-today' : '') + (holLbl ? ' is-holiday' : '') + '" data-pl-action="month-add" data-pl-date="' + esc(ds) + '">';
          html += '<div class="month-cell-hd">';
          html += '<span class="month-day-num" data-pl-action="drill-day" data-pl-date="' + esc(ds) + '">' + cur.getDate() + '</span>';
          if (holLbl) html += '<span class="allday-pill is-holiday" style="font-size:0.65rem;padding:1px 5px">' + esc(holLbl) + '</span>';
          html += '</div>';

          html += '<div class="month-cell-items">';
          var maxItems = maxMonthItems;
          var shown = 0;
          for (var i = 0; i < daySlots.length && shown < maxItems; i++) {
            var s = daySlots[i];
            var entry = s.entry;
            var color = (cfg.classes[s.classId] || {}).color || '#888888';
            var clsLabel = s.classId ? plannerClassDisplayName(s.classId) : t('pl_noClass');
            var isSub = !!(entry && (entry._isSubscribed || String(entry.id || '').startsWith('sub_')));
            html += '<div class="month-entry-chip' + (!entry ? ' is-empty' : '') + (isSub ? ' is-subscribed' : '') + '" data-date="' + esc(ds) + '" data-classid="' + esc(s.classId || '') + '"' + (entry ? ' data-entry-id="' + esc(entry.id) + '"' : '') + ' data-time="' + esc(s.time || '') + '" data-timeend="' + esc(s.timeEnd || '') + '" style="--col:' + color + '" data-pl-action="' + (entry ? 'at-cell-click' : 'at-cell-empty') + '">';
            if (viewOpts.time && s.time) html += '<span class="month-chip-time">' + esc(s.time) + '</span>';
            if (viewOpts.classPill) html += '<span class="month-chip-cls">' + esc(clsLabel) + '</span>';
            if (viewOpts.badges && entry && entry.type) html += '<span class="entry-type-badge ' + typeBadgeCls(entry.type) + '" style="font-size:0.58rem;padding:0 4px">' + esc(typeLabel(entry.type)) + '</span>';
            if (viewOpts.topic && entry && entry.topic) html += '<span class="month-chip-topic">' + esc(entry.topic) + '</span>';
            html += '</div>';
            shown++;
          }
          for (var j = 0; j < dayTodos.length && shown < maxItems; j++) {
            html += renderTodoCalChipsHtml([dayTodos[j]]);
            shown++;
          }
          var totalCount = daySlots.length + dayTodos.length;
          if (totalCount > shown) {
            html += '<button type="button" class="month-more-btn" data-pl-action="drill-day" data-pl-date="' + esc(ds) + '">' + esc(tFmt('pl_moreCount', { n: totalCount - shown })) + '</button>';
          }
          html += '</div></div>';
        }
        cur.setDate(cur.getDate() + 1);
      }

      html += '</div></div>';
      el.innerHTML = html;
      _applyNavHighlight(false);
      updateWeekNav();
    }

    // ── Year View ───────────────────────────────────────────────────────────────
    function renderYearView(el, activeSem) {
      var anchor = new Date(viewAnchorDate + 'T12:00:00');
      if (isNaN(anchor.getTime())) anchor = new Date();
      var year = anchor.getFullYear();

      var allSlots = activeSem ? getFilteredViewSlots(activeSem, true) : [];
      var countsByDate = Object.create(null);
      allSlots.forEach(function (s) {
        if (s.isGlobalHoliday) return;
        if (!countsByDate[s.date]) countsByDate[s.date] = { entries: 0, tests: 0, empty: 0, todos: 0 };
        if (!s.entry) countsByDate[s.date].empty++;
        else if (s.entry.type === 'test') countsByDate[s.date].tests++;
        else countsByDate[s.date].entries++;
      });
      var todosByDate = getTodosByDateMap();
      Object.keys(todosByDate).forEach(function (ds) {
        if (!countsByDate[ds]) countsByDate[ds] = { entries: 0, tests: 0, empty: 0, todos: 0 };
        countsByDate[ds].todos += todosByDate[ds].length;
      });
      var holMap = getHolidayDatesMap(activeSem);
      var todayStr = new Date().toISOString().slice(0, 10);
      var miniDow = [1, 2, 3, 4, 5, 6, 0];

      var html = '<div class="year-grid">';
      for (var m = 0; m < 12; m++) {
        var mFirst = new Date(year, m, 1, 12, 0, 0);
        var mLast = new Date(year, m + 1, 0, 12, 0, 0);
        var mTitle = mFirst.toLocaleDateString(undefined, { month: 'long' });
        var mStartStr = mFirst.toISOString().slice(0, 10);
        var startOff = (mFirst.getDay() + 6) % 7;

        html += '<div class="year-month-card">';
        html += '<div class="year-month-title" data-pl-action="drill-month" data-pl-date="' + esc(mStartStr) + '"><span>' + esc(mTitle) + '</span><span>' + year + '</span></div>';
        html += '<div class="year-mini-dow">';
        miniDow.forEach(function (dow) {
          html += '<div class="year-mini-dow-cell">' + esc((t(DAY_KEYS[dow]) || '').slice(0, 2)) + '</div>';
        });
        html += '</div><div class="year-mini-grid">';

        for (var pad = 0; pad < startOff; pad++) {
          html += '<div class="year-day-cell outside"></div>';
        }
        for (var dayNum = 1; dayNum <= mLast.getDate(); dayNum++) {
          var dObj = new Date(year, m, dayNum, 12, 0, 0);
          var ds = dObj.toISOString().slice(0, 10);
          var c = countsByDate[ds];
          var holLbl = holMap[ds] || '';
          var isToday = ds === todayStr;
          var tipParts = [ds];
          if (holLbl) tipParts.push(holLbl);
          if (c) {
            if (c.entries) tipParts.push(c.entries + ' ' + t('pl_typeLesson'));
            if (c.tests) tipParts.push(c.tests + ' ' + t('pl_typeTest'));
            if (c.todos) tipParts.push(c.todos + ' ' + t('td_todoTitle'));
          }
          html += '<div class="year-day-cell' + (isToday ? ' is-today' : '') + (holLbl ? ' is-holiday' : '') + '" title="' + esc(tipParts.join(' · ')) + '" data-pl-action="drill-day" data-pl-date="' + esc(ds) + '">';
          html += '<span>' + dayNum + '</span>';
          html += '<div class="year-day-dots">';
          if (c) {
            if (c.entries) html += '<span class="year-dot year-dot-entry"></span>';
            if (c.tests) html += '<span class="year-dot year-dot-test"></span>';
            if (c.todos) html += '<span class="year-dot year-dot-todo"></span>';
            if (!c.entries && !c.tests && c.empty) html += '<span class="year-dot year-dot-empty"></span>';
          }
          html += '</div></div>';
        }
        html += '</div></div>';
      }
      html += '</div>';
      el.innerHTML = html;
      _applyNavHighlight(false);
      updateWeekNav();
    }

    function renderTableMatrixEntry(s, layout) {
      var entry = s.entry;
      var color = (cfg.classes[s.classId] || {}).color || '#aaa';
      var classLabel = s.classId ? plannerClassDisplayName(s.classId) : t('pl_noClass');
      var dateLabel = new Date(s.date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      var top = ((layout.start - layout.gridStart) / layout.stepMin) * layout.rowHeight;
      var h = ((layout.end - layout.start) / layout.stepMin) * layout.rowHeight;
      if (!(h > 0)) h = layout.rowHeight;
      h = Math.max(22, h - 4);
      var laneCount = Math.max(1, parseInt(layout.laneCount, 10) || 1);
      var lane = Math.max(0, parseInt(layout.lane, 10) || 0);
      var leftPct = (lane * 100) / laneCount;
      var widthPct = 100 / laneCount;
      var blockPos = 'top:' + top + 'px;height:' + h + 'px;left:calc(' + leftPct.toFixed(4) + '% + 2px);width:calc(' + widthPct.toFixed(4) + '% - 4px)';
      if (!entry) {
        var emptyInfo = '';
        if (viewOpts.details || viewOpts.custom) emptyInfo = '<span class="at-cell-detail">' + esc(dateLabel) + '</span>';
        return '<div class="at-cell-empty" data-start-min="' + layout.start + '" data-end-min="' + layout.end + '" data-classid="' + esc(s.classId || '') + '" data-date="' + esc(s.date) + '" data-time="' + esc(s.time || '') + '" data-timeend="' + esc(s.timeEnd || '') + '" style="--col:' + color + ';' + blockPos + '" data-pl-action="at-cell-empty">' +
          '<span class="at-class-title">' + esc(classLabel) + '</span>' +
          emptyInfo +
          '<span class="at-add">+</span>' +
          '</div>';
      }
      var type = entry.type || '';
      var badgeCls = type ? 'entry-type-badge ' + typeBadgeCls(type) : '';
      var badgeText = type ? typeLabel(type) : '';
      var _boardLink = plannerBoardSessionsForSlot(s, entry);
      var _atBSess = _boardLink.sessions;
      var detailParts = [];
      if (viewOpts.details) {
        detailParts.push(dateLabel);
        if (entry.notes) detailParts.push(entry.notes.slice(0, 60));
      }
      if (viewOpts.custom && entry.customFields) {
        Object.keys(entry.customFields).forEach(function (k) {
          var v = entry.customFields[k];
          if (v) detailParts.push(k + ': ' + String(v).slice(0, 40));
        });
      }

      var timeLabel = (s.time || '') + (s.timeEnd ? '–' + s.timeEnd : '');
      var isSubscribed = !!(entry && (entry._isSubscribed || String(entry.id || '').startsWith('sub_')));
      var isSelected = selectedEntryIds.has(entry.id);
      var sizeCls = '';
      if (h < 38) sizeCls = ' at-cell-micro';
      else if (h < 56) sizeCls = ' at-cell-compact';
      else if (h >= 92) sizeCls = ' at-cell-tall';

      var gsLinked = viewOpts.linkedBadges && isGradeSheetLinked(entry);
      var _lpMatrixLink = viewOpts.linkedBadges ? plannerLessonPlanForSlot(s, entry) : null;
      var _lpM = (_lpMatrixLink && _lpMatrixLink.plan) ? _lpMatrixLink.plan : null;
      var _lpMTitle = _lpM ? (t('pl_lessonPlanLinked') + ': ' + (_lpM.title || 'Untitled') + ' (Click to open · Drag to duplicate)') : '';
      var _entryTags = (viewOpts.linkedBadges && window.LinksService && entry && entry.id)
        ? (LinksService.getTagsForSync('cmt:planner:' + entry.id) || [])
        : [];

      var cuesHtml = '<span class="at-cues">';
      if (isSubscribed) {
        cuesHtml += '<span class="at-cue at-cue-sub" title="' + esc(entry.subName || t('pl_subEventBadge')) + '"><img src="../assets/icons/feed.svg" class="at-cue-icon" alt="" /></span>';
      }
      if (viewOpts.badges && badgeText) {
        cuesHtml += '<span class="at-cue at-cue-type ' + typeBadgeCls(type) + '" title="' + esc(badgeText) + '">' + esc(badgeText.charAt(0).toUpperCase()) + '</span>';
      }
      if (gsLinked) {
        cuesHtml += '<span class="at-cue at-cue-gs" data-pl-action="open-gs" data-pl-entry="' + esc(entry.id) + '" title="' + esc(t('pl_gsLinked')) + '">GS</span>';
      }
      if (_lpM) {
        cuesHtml += '<span class="at-cue at-cue-lp" data-pl-action="open-lp" data-pl-plan="' + esc(_lpM.id) + '" data-pl-class="' + esc(s.classId || '') + '" data-pl-date="' + esc(s.date || '') + '" data-pl-entry="' + esc(entry ? entry.id : '') + '" data-pl-topic="' + esc(entry && entry.topic ? entry.topic : '') + '" title="' + esc(_lpMTitle) + '">LP</span>';
      }
      if (viewOpts.linkedBadges && _atBSess && _atBSess.length) {
        cuesHtml += '<span class="at-cue at-cue-board" data-pl-action="open-board" data-pl-linkid="' + esc(_boardLink.linkId) + '" title="' + esc(t('pl_boardLinked')) + '">B' + (_atBSess.length > 1 ? _atBSess.length : '') + '</span>';
      }
      if (_entryTags.length) {
        cuesHtml += '<span class="at-cue at-cue-tag" data-pl-action="open-entry-links" data-pl-entry="' + esc(entry.id) + '" title="' + esc(_entryTags.join(', ')) + '">#' + _entryTags.length + '</span>';
      }
      cuesHtml += '</span>';

      var r = '<div class="at-cell' + sizeCls + (isSubscribed ? ' at-cell-subscribed' : '') + (isSelected ? ' selected' : '') + '" data-start-min="' + layout.start + '" data-end-min="' + layout.end + '" data-entry-id="' + esc(entry.id) + '" data-classid="' + esc(s.classId || '') + '" data-date="' + esc(s.date) + '" data-time="' + esc(s.time || '') + '" data-timeend="' + esc(s.timeEnd || '') + '"' + (isSubscribed ? '' : ' draggable="true"') + ' style="--col:' + color + ';' + blockPos + '" data-pl-action="at-cell-click">';
      r += '<div class="at-cell-head">';
      if (multiSelectMode) {
        r += '<input type="checkbox" class="entry-select-cb" ' + (isSelected ? 'checked' : '') + ' data-pl-action="toggle-select" data-pl-entry="' + esc(entry.id) + '">';
      }
      if (viewOpts.time && timeLabel) {
        r += '<span class="at-time">' + esc(timeLabel) + '</span>';
      }
      if (viewOpts.classPill) {
        r += '<span class="at-class-title">' + esc(classLabel) + '</span>';
      }
      r += cuesHtml;
      r += '</div>';
      if (viewOpts.topic && entry.topic) r += '<span class="at-topic" title="' + esc(entry.topic) + '">' + esc(entry.topic) + '</span>';
      if (detailParts.length) r += '<span class="at-cell-detail">' + esc(detailParts.join(' · ')) + '</span>';
      r += '<div class="at-badges-row">';
      if (isSubscribed) {
        r += '<span class="sub-feed-badge" title="' + esc(entry.subName || t('pl_subEventBadge')) + '"><img src="../assets/icons/feed.svg" class="sub-badge-icon" style="width:11px; height:11px;" alt="" />' + esc(entry.subName || t('pl_subEventBadge')) + '</span>';
      }
      if (viewOpts.badges && badgeText) {
        var typeDragAttr = (entry && !isSubscribed)
          ? ' draggable="true" data-drag-type="entry-type" data-entry-type="' + esc(type) + '" data-entry-id="' + esc(entry.id) + '" title="Drag to duplicate / set type"'
          : '';
        r += '<span class="' + badgeCls + '"' + typeDragAttr + '>' + esc(badgeText) + '</span>';
      }
      if (viewOpts.linkedBadges) {
        if (gsLinked) r += '<span class="gs-badge" data-pl-action="open-gs" data-pl-entry="' + esc(entry.id) + '" title="' + esc(t('pl_gsLinked')) + '">GS</span>';
        if (_lpM) {
          var _lpMDragAttr = ' draggable="true" data-drag-type="lesson-plan" data-plan-id="' + esc(_lpM.id) + '" data-entry-id="' + esc(entry ? entry.id : '') + '"';
          r += '<span class="lesson-plan-badge"' + _lpMDragAttr + ' data-pl-action="open-lp" data-pl-plan="' + esc(_lpM.id) + '" data-pl-class="' + esc(s.classId || '') + '" data-pl-date="' + esc(s.date || '') + '" data-pl-entry="' + esc(entry ? entry.id : '') + '" data-pl-topic="' + esc(entry && entry.topic ? entry.topic : '') + '" title="' + esc(_lpMTitle) + '">' + esc(t('pl_lessonPlanBadge')) + '</span>';
        }
        if (_atBSess && _atBSess.length) {
          var _bMRel = _atBSess[0] && _atBSess[0].relativePath ? _atBSess[0].relativePath : '';
          var _bMDragAttr = ' draggable="true" data-drag-type="board-session" data-board-relpath="' + esc(_bMRel) + '" data-board-linkid="' + esc(_boardLink.linkId) + '" data-entry-id="' + esc(entry ? entry.id : '') + '"';
          r += '<span class="board-session-badge"' + _bMDragAttr + ' data-pl-action="open-board" data-pl-linkid="' + esc(_boardLink.linkId) + '" title="' + esc(t('pl_boardLinked')) + '">' + esc(t('pl_boardOpen')) + (_atBSess.length > 1 ? ' (' + _atBSess.length + ')' : '') + '</span>';
        }
        r += buildPlannerEntryLinkBadgesHtml(entry);
      }
      r += '</div>';
      r += '</div>';
      return r;
    }

    function renderTableCell(s) {
      var entry = s.entry;
      var color = (cfg.classes[s.classId] || {}).color || '#aaa';
      var timeLabel = (s.time || '') + (s.timeEnd ? '–' + s.timeEnd : '');
      var _boardLink = plannerBoardSessionsForSlot(s, entry);
      var _atBSess = _boardLink.sessions;
      var _lpCellLink = plannerLessonPlanForSlot(s, entry);

      if (!entry) {
        var _empty = '<div class="at-cell-empty" data-classid="' + esc(s.classId) + '" data-date="' + esc(s.date) + '" data-time="' + esc(s.time || '') + '" data-timeend="' + esc(s.timeEnd || '') + '" data-pl-action="at-cell-empty">' +
          (timeLabel ? '<span class="at-time">' + esc(timeLabel) + '</span>' : '') +
          '<span class="at-add">+</span>';
        if (_lpCellLink && _lpCellLink.plan) {
          var _lpCEmpty = _lpCellLink.plan;
          var _lpCEmptyTitle = t('pl_lessonPlanLinked') + ': ' + (_lpCEmpty.title || 'Untitled');
          _empty += '<span class="lesson-plan-badge" data-pl-action="open-lp" data-pl-plan="' + esc(_lpCEmpty.id) + '" data-pl-class="' + esc(s.classId || '') + '" data-pl-date="' + esc(s.date || '') + '" data-pl-entry="" data-pl-topic="" title="' + esc(_lpCEmptyTitle) + '">' + esc(t('pl_lessonPlanBadge')) + '</span>';
        }
        if (_atBSess && _atBSess.length) {
          var _bERel = _atBSess[0] && _atBSess[0].relativePath ? _atBSess[0].relativePath : '';
          var _bEDragAttr = ' draggable="true" data-drag-type="board-session" data-board-relpath="' + esc(_bERel) + '" data-board-linkid="' + esc(_boardLink.linkId) + '" data-entry-id=""';
          _empty += '<span class="board-session-badge"' + _bEDragAttr + ' data-pl-action="open-board" data-pl-linkid="' + esc(_boardLink.linkId) + '" title="' + esc(t('pl_boardLinked')) + '">' + esc(t('pl_boardOpen')) + (_atBSess.length > 1 ? ' (' + _atBSess.length + ')' : '') + '</span>';
        }
        return _empty + '</div>';
      }

      var type = entry.type || '';
      var badgeCls = type ? 'entry-type-badge ' + typeBadgeCls(type) : '';
      var badgeText = type ? typeLabel(type) : '';

      var isSelected = selectedEntryIds.has(entry.id);
      var r = '<div class="at-cell' + (isSelected ? ' selected' : '') + '" data-entry-id="' + esc(entry.id) + '" style="--col:' + color + '" data-pl-action="at-cell-click">';
      if (multiSelectMode) {
        r += '<input type="checkbox" class="entry-select-cb" ' + (isSelected ? 'checked' : '') + ' data-pl-action="toggle-select" data-pl-entry="' + esc(entry.id) + '">';
      }
      if (timeLabel) r += '<span class="at-time">' + esc(timeLabel) + '</span>';
      if (badgeText) {
        var typeDragAttr = (entry && !isSubscribed)
          ? ' draggable="true" data-drag-type="entry-type" data-entry-type="' + esc(type) + '" data-entry-id="' + esc(entry.id) + '" title="Drag to duplicate / set type"'
          : '';
        r += '<span class="' + badgeCls + '"' + typeDragAttr + '>' + esc(badgeText) + '</span>';
      }
      if (entry.topic) r += '<span class="at-topic">' + esc(entry.topic) + '</span>';
      if (isGradeSheetLinked(entry)) r += '<span class="gs-badge" data-pl-action="open-gs" data-pl-entry="' + esc(entry.id) + '" title="' + esc(t('pl_gsLinked')) + '">GS</span>';
      if (_lpCellLink && _lpCellLink.plan) {
        var _lpC = _lpCellLink.plan;
        var _lpCTitle = t('pl_lessonPlanLinked') + ': ' + (_lpC.title || 'Untitled') + ' (Click to open · Drag to duplicate)';
        var _lpCDragAttr = ' draggable="true" data-drag-type="lesson-plan" data-plan-id="' + esc(_lpC.id) + '" data-entry-id="' + esc(entry ? entry.id : '') + '"';
        r += '<span class="lesson-plan-badge"' + _lpCDragAttr + ' data-pl-action="open-lp" data-pl-plan="' + esc(_lpC.id) + '" data-pl-class="' + esc(s.classId || '') + '" data-pl-date="' + esc(s.date || '') + '" data-pl-entry="' + esc(entry ? entry.id : '') + '" data-pl-topic="' + esc(entry && entry.topic ? entry.topic : '') + '" title="' + esc(_lpCTitle) + '">' + esc(t('pl_lessonPlanBadge')) + '</span>';
      }
      if (_atBSess && _atBSess.length) {
        var _bCRel = _atBSess[0] && _atBSess[0].relativePath ? _atBSess[0].relativePath : '';
        var _bCDragAttr = ' draggable="true" data-drag-type="board-session" data-board-relpath="' + esc(_bCRel) + '" data-board-linkid="' + esc(_boardLink.linkId) + '" data-entry-id="' + esc(entry ? entry.id : '') + '"';
        r += '<span class="board-session-badge"' + _bCDragAttr + ' data-pl-action="open-board" data-pl-linkid="' + esc(_boardLink.linkId) + '" title="' + esc(t('pl_boardLinked')) + '">' + esc(t('pl_boardOpen')) + (_atBSess.length > 1 ? ' (' + _atBSess.length + ')' : '') + '</span>';
      }
      r += buildPlannerEntryLinkBadgesHtml(entry);
      r += '</div>';
      return r;
    }

    // ── Modal helpers ──────────────────────────────────────────────────────────
    var _plannerOpenModalStack = [];
    function openModal(id) {
      var el = document.getElementById(id);
      if (el) el.classList.add('active');
      var idx = _plannerOpenModalStack.indexOf(id);
      if (idx !== -1) _plannerOpenModalStack.splice(idx, 1);
      _plannerOpenModalStack.push(id);
    }
    function closeModal(id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('active');
      var idx = _plannerOpenModalStack.indexOf(id);
      if (idx !== -1) _plannerOpenModalStack.splice(idx, 1);
    }
    function toggleDispPopover() { document.getElementById('dispWrap').classList.toggle('open'); }
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#dispWrap')) document.getElementById('dispWrap').classList.remove('open');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var dispWrap = document.getElementById('dispWrap');
        if (dispWrap && dispWrap.classList.contains('open')) {
          dispWrap.classList.remove('open');
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          return;
        }

        while (_plannerOpenModalStack.length > 0) {
          var topId = _plannerOpenModalStack.pop();
          var el = document.getElementById(topId);
          if (el && el.classList.contains('active')) {
            closeModal(topId);
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            return;
          }
        }

        var activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
          activeModal.classList.remove('active');
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          return;
        }
      }
    });

    // ── Utils ──────────────────────────────────────────────────────────────────
    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function entryClassIds(e) {
      if (e.classIds && e.classIds.length) return e.classIds.slice();
      if (e.classId) return [e.classId];
      return [];
    }
    function expandEntryDates(e) {
      if (!e.dateTo || e.dateTo <= e.date) return [e.date];
      var result = [];
      var d = new Date(e.date + 'T12:00:00');
      var end = new Date(e.dateTo + 'T12:00:00');
      while (d <= end) { result.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
      return result;
    }
    function typeLabel(type) {
      if (!type) return '—';
      if (type === 'no-class') return t('pl_typeNoclass');
      if (BUILT_IN_TYPES.indexOf(type) >= 0) return t('pl_type' + capitalize(type));
      return type;
    }
    function typeBadgeCls(type) {
      if (!type) return 'badge-empty';
      if (type === 'no-class') return 'badge-noclass';
      if (BUILT_IN_TYPES.indexOf(type) >= 0) return 'badge-' + type;
      return 'badge-custom';
    }
    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── ICS Import ──────────────────────────────────────────────────────────────

    var _icsParsed = []; // flat list of expanded occurrences from the last parsed file

    // Returns the effective class ID: the selected existing class, or the typed new-class name.
    function icsResolveClassId() {
      var sel = document.getElementById('ics-imp-class');
      if (sel.value === '__new__') return document.getElementById('ics-new-class-input').value.trim();
      return sel.value;
    }

    function onIcsClassChange() {
      var sel = document.getElementById('ics-imp-class');
      var inp = document.getElementById('ics-new-class-input');
      inp.style.display = sel.value === '__new__' ? '' : 'none';
      if (sel.value === '__new__') inp.focus();
      renderIcsPreview();
    }

    function openIcsImportModal() {
      var sel = document.getElementById('ics-imp-class');
      while (sel.options.length > 1) sel.remove(1);
      getPlannerClassIds().forEach(function (id) { sel.add(new Option(plannerClassDisplayName(id), id)); });
      sel.add(new Option(t('pl_icsImpNewClass'), '__new__'));
      if (filterClasses.size === 1) sel.value = [...filterClasses][0];

      var newInp = document.getElementById('ics-new-class-input');
      newInp.value = '';
      newInp.style.display = 'none';

      var typeSel = document.getElementById('ics-imp-type');
      for (var i = typeSel.options.length - 1; i >= 0; i--) {
        if (typeSel.options[i].dataset.custom) typeSel.remove(i);
      }
      (cfg.customTypes || []).forEach(function (name) {
        var o = new Option(name, name); o.dataset.custom = '1'; typeSel.add(o);
      });

      document.getElementById('ics-imp-file').value = '';
      document.getElementById('ics-preview').style.display = 'none';
      document.getElementById('ics-import-btn').style.display = 'none';
      document.getElementById('ics-parse-status').textContent = '';
      _icsParsed = [];
      openModal('icsImportModal');
    }

    function onIcsFileChange() {
      var file = document.getElementById('ics-imp-file').files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        _icsParsed = [];
        try {
          _icsParsed = parseIcsFile(e.target.result);
          if (!_icsParsed.length) {
            document.getElementById('ics-parse-status').textContent = t('pl_icsImpNone');
            document.getElementById('ics-preview').style.display = 'none';
            document.getElementById('ics-import-btn').style.display = 'none';
          } else {
            document.getElementById('ics-parse-status').textContent = tFmt('pl_icsImpCount', { n: _icsParsed.length });
            renderIcsPreview();
          }
        } catch (err) {
          console.warn('ICS parse error:', err);
          document.getElementById('ics-parse-status').textContent = t('pl_icsImpError');
          document.getElementById('ics-preview').style.display = 'none';
          document.getElementById('ics-import-btn').style.display = 'none';
        }
      };
      reader.readAsText(file, 'utf-8');
    }

    // ── ICS file parser ──────────────────────────────────────────────────────────

    function parseIcsFile(text, options) {
      options = options || {};
      var minDateStr = options.minDate || '';
      var maxLimit = typeof options.maxLimit === 'number' ? options.maxLimit : 25000;

      // Unfold RFC 5545 line continuations (CRLF/LF + whitespace = continuation)
      var unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\r[ \t]/g, '').replace(/\n[ \t]/g, '');
      var lines = unfolded.split(/\r\n|\r|\n/);

      var calTzid = null;
      var inEvent = false;
      var cur = null;
      var rawEvents = [];

      lines.forEach(function (line) {
        if (!line.trim()) return;
        var prop = icsLineProp(line);
        if (!prop) return;

        if (prop.name === 'BEGIN' && prop.value.toUpperCase() === 'VEVENT') {
          inEvent = true;
          cur = { summary: '', description: '', dtstart: null, dtend: null, rrule: null, exdates: [] };
          return;
        }
        if (prop.name === 'END' && prop.value.toUpperCase() === 'VEVENT') {
          if (cur && cur.dtstart) rawEvents.push(cur);
          inEvent = false; cur = null;
          return;
        }
        if (!inEvent) {
          if (prop.name === 'X-WR-TIMEZONE') calTzid = prop.value;
          return;
        }

        switch (prop.name) {
          case 'SUMMARY': cur.summary = icsUnescape(prop.value); break;
          case 'DESCRIPTION': cur.description = icsUnescape(prop.value); break;
          case 'DTSTART': cur.dtstart = icsDateParse(prop, calTzid); break;
          case 'DTEND': cur.dtend = icsDateParse(prop, calTzid); break;
          case 'RRULE': cur.rrule = prop.value; break;
          case 'EXDATE':
            icsExDateParse(prop, calTzid).forEach(function (d) { cur.exdates.push(d); });
            break;
        }
      });

      var activeSem = getActiveSem();
      var semStart = activeSem && activeSem.semesterStart || '';
      var semEnd = activeSem && activeSem.semesterEnd || '';

      var expanded = [];

      rawEvents.forEach(function (ev) {
        if (expanded.length >= maxLimit) return;

        // Time component of dtend applies to all recurrences
        var timeEnd = (ev.dtend && !ev.dtend.allDay && ev.dtend.time) ? ev.dtend.time : '';

        var occurrences;
        if (ev.rrule) {
          // Expand up to 2 years into the future from today or past semesterEnd
          var maxFuture = new Date();
          maxFuture.setFullYear(maxFuture.getFullYear() + 2);
          if (semEnd) {
            var sEndD = new Date(semEnd + 'T23:59:59');
            if (sEndD > maxFuture) maxFuture = sEndD;
          }
          occurrences = icsExpandRRule(ev.rrule, ev.dtstart.date, ev.dtstart.time, ev.dtstart.allDay,
            maxFuture.toISOString().slice(0, 10), ev.exdates, minDateStr);
        } else {
          if (!minDateStr || ev.dtstart.date >= minDateStr) {
            occurrences = [{ date: ev.dtstart.date, time: ev.dtstart.time, allDay: ev.dtstart.allDay }];
          } else {
            occurrences = [];
          }
        }

        occurrences.forEach(function (occ) {
          if (expanded.length >= maxLimit) return;
          var inSem = semStart && semEnd
            ? (occ.date >= semStart && occ.date <= semEnd)
            : true;
          expanded.push({
            date: occ.date,
            time: occ.time || '',
            timeEnd: occ.allDay ? '' : timeEnd,
            allDay: !!occ.allDay,
            summary: ev.summary,
            description: ev.description,
            inSem: inSem
          });
        });
      });

      expanded.sort(function (a, b) {
        return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time < b.time ? -1 : 1);
      });
      return expanded;
    }

    // Parse a raw ICS property line → {name, params, value}
    function icsLineProp(line) {
      var colon = line.indexOf(':');
      if (colon < 0) return null;
      var namePart = line.slice(0, colon);
      var value = line.slice(colon + 1);
      var segs = namePart.split(';');
      var name = segs[0].toUpperCase();
      var params = {};
      for (var i = 1; i < segs.length; i++) {
        var eq = segs[i].indexOf('=');
        if (eq >= 0) params[segs[i].slice(0, eq).toUpperCase()] = segs[i].slice(eq + 1);
      }
      return { name: name, params: params, value: value };
    }

    // Parse a DTSTART/DTEND property → {date:'YYYY-MM-DD', time:'HH:MM', allDay:bool}
    function icsDateParse(prop, calTzid) {
      var val = (prop.value || '').trim();
      var tzid = (prop.params && prop.params.TZID) || calTzid || null;
      var isDate = prop.params && prop.params.VALUE === 'DATE';

      // All-day: pure YYYYMMDD
      if (isDate || /^\d{8}$/.test(val)) {
        return {
          date: val.slice(0, 4) + '-' + val.slice(4, 6) + '-' + val.slice(6, 8),
          time: '',
          allDay: true
        };
      }

      // Date-time: YYYYMMDDTHHmmss[Z]
      var isUtc = val.endsWith('Z');
      var base = val.replace(/Z$/, '');
      var y = base.slice(0, 4), mo = base.slice(4, 6), d = base.slice(6, 8);
      var h = base.slice(9, 11), mi = base.slice(11, 13), s = base.slice(13, 15) || '00';
      var dt;

      if (isUtc) {
        dt = new Date(y + '-' + mo + '-' + d + 'T' + h + ':' + mi + ':' + s + 'Z');
      } else if (tzid) {
        dt = icsTzToUtc(+y, +mo, +d, +h, +mi, +s, tzid);
      } else {
        dt = new Date(y + '-' + mo + '-' + d + 'T' + h + ':' + mi + ':' + s);
      }

      if (!dt || isNaN(dt.getTime())) return null;

      var localDate = dt.getFullYear() + '-' +
        String(dt.getMonth() + 1).padStart(2, '0') + '-' +
        String(dt.getDate()).padStart(2, '0');
      var localTime = String(dt.getHours()).padStart(2, '0') + ':' +
        String(dt.getMinutes()).padStart(2, '0');

      return { date: localDate, time: localTime, allDay: false };
    }

    // Convert a local datetime in a named IANA timezone to a UTC Date object.
    // Uses Intl.DateTimeFormat to derive the UTC offset at that moment.
    function icsTzToUtc(y, mo, d, h, mi, s, tzid) {
      try {
        var assumed = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
        var fmt = new Intl.DateTimeFormat('en', {
          timeZone: tzid,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        var parts = fmt.formatToParts(assumed);
        var p = {};
        parts.forEach(function (x) { p[x.type] = +x.value; });
        var shown = new Date(Date.UTC(p.year, p.month - 1, p.day,
          p.hour === 24 ? 0 : p.hour, p.minute, p.second));
        // offsetMs: how much the timezone is "ahead" of the value we assumed was UTC
        var offsetMs = assumed.getTime() - shown.getTime();
        return new Date(assumed.getTime() + offsetMs);
      } catch (e) {
        // Fallback: treat as local floating time
        return new Date(y, mo - 1, d, h, mi, s);
      }
    }

    // Parse an EXDATE property → array of 'YYYY-MM-DD' strings
    function icsExDateParse(prop, calTzid) {
      return prop.value.split(',').map(function (v) {
        var parsed = icsDateParse({ value: v.trim(), params: prop.params || {} }, calTzid);
        return parsed ? parsed.date : null;
      }).filter(Boolean);
    }

    // Unescape ICS text field values
    function icsUnescape(s) {
      return String(s || '')
        .replace(/\\n/gi, '\n').replace(/\\,/g, ',')
        .replace(/\\;/g, ';').replace(/\\\\/g, '\\');
    }

    // ── RRULE expander ──────────────────────────────────────────────────────────

    var _ICS_DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

    function icsExpandRRule(rruleStr, startDateStr, startTime, startAllDay, limitDateStr, exdates, minDateStr) {
      var exSet = new Set(exdates || []);

      // Parse RRULE params; uppercase both keys and values for uniform comparisons
      var params = {};
      rruleStr.split(';').forEach(function (p) {
        var eq = p.indexOf('=');
        if (eq >= 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).toUpperCase();
      });

      var freq = params.FREQ || '';
      var interval = Math.max(1, parseInt(params.INTERVAL) || 1);
      var count = params.COUNT ? parseInt(params.COUNT) : null;
      var wkstKey = params.WKST || 'MO';
      var wkstDay = _ICS_DAYS[wkstKey] !== undefined ? _ICS_DAYS[wkstKey] : 1;

      // Parse UNTIL (may be UTC or local)
      var until = null;
      if (params.UNTIL) {
        var u = params.UNTIL;
        var uBase = u.replace(/Z$/, '');
        var uIso = uBase.slice(0, 4) + '-' + uBase.slice(4, 6) + '-' + uBase.slice(6, 8);
        if (uBase.length > 8) {
          uIso += 'T' + uBase.slice(9, 11) + ':' + uBase.slice(11, 13) + ':' + (uBase.slice(13, 15) || '00');
          if (u.endsWith('Z')) uIso += 'Z';
        } else {
          uIso += 'T23:59:59';
        }
        until = new Date(uIso);
        if (isNaN(until)) until = null;
      }

      // Parse BYDAY (strip ordinal prefixes like "2MO" → "MO")
      var byDay = null;
      if (params.BYDAY) {
        byDay = params.BYDAY.split(',').map(function (d) {
          return _ICS_DAYS[d.replace(/^[+-]?\d+/, '')];
        }).filter(function (d) { return d !== undefined && d !== null; });
      }

      var limitDate = new Date(limitDateStr + 'T23:59:59');
      if (until && until < limitDate) limitDate = until;

      // Use noon to sidestep DST boundary issues with setDate/setMonth
      var startDate = new Date(startDateStr + 'T12:00:00');
      var results = [];

      function push(d) {
        var ds = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
        if (minDateStr && ds < minDateStr) return;
        if (!exSet.has(ds)) {
          results.push({ date: ds, time: startTime || '', allDay: !!startAllDay });
        }
      }

      function overLimit() {
        return results.length >= 5000 || (count !== null && results.length >= count);
      }

      if (freq === 'DAILY') {
        var cur = new Date(startDate);
        var iters = 0;
        while (cur <= limitDate && !overLimit() && iters < 10000) {
          if (!byDay || byDay.indexOf(cur.getDay()) >= 0) push(cur);
          cur.setDate(cur.getDate() + interval);
          iters++;
        }

      } else if (freq === 'WEEKLY') {
        if (byDay && byDay.length > 0) {
          // Advance week-by-week (INTERVAL weeks at a time), generating all BYDAY days per window
          var weekBaseDow = (startDate.getDay() - wkstDay + 7) % 7;
          var weekBase = new Date(startDate);
          weekBase.setDate(weekBase.getDate() - weekBaseDow);

          var wk = new Date(weekBase);
          var iters = 0;
          while (wk <= limitDate && !overLimit() && iters < 5000) {
            byDay.forEach(function (dow) {
              var off = (dow - wkstDay + 7) % 7;
              var occ = new Date(wk);
              occ.setDate(occ.getDate() + off);
              occ.setHours(12, 0, 0, 0);
              if (occ < startDate || occ > limitDate) return;
              if (!overLimit()) push(occ);
            });
            wk.setDate(wk.getDate() + 7 * interval);
            iters++;
          }
        } else {
          var cur = new Date(startDate);
          var iters = 0;
          while (cur <= limitDate && !overLimit() && iters < 5000) {
            push(cur);
            cur.setDate(cur.getDate() + 7 * interval);
            iters++;
          }
        }

      } else if (freq === 'MONTHLY') {
        var cur = new Date(startDate);
        var iters = 0;
        while (cur <= limitDate && !overLimit() && iters < 1000) {
          push(cur);
          cur.setMonth(cur.getMonth() + interval);
          iters++;
        }

      } else if (freq === 'YEARLY') {
        var cur = new Date(startDate);
        var iters = 0;
        while (cur <= limitDate && !overLimit() && iters < 100) {
          push(cur);
          cur.setFullYear(cur.getFullYear() + interval);
          iters++;
        }
      }

      results.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      return results;
    }

    // ── ICS preview renderer ──────────────────────────────────────────────────────

    function renderIcsPreview() {
      if (!_icsParsed.length) return;
      var classId = document.getElementById('ics-imp-class').value;

      var inSem = _icsParsed.filter(function (e) { return e.inSem; });
      var outSem = _icsParsed.filter(function (e) { return !e.inSem; });

      function isDup(ev) {
        var cid = icsResolveClassId();
        if (!cid) return false;
        return entries.some(function (e) {
          return e.classId === cid && e.date === ev.date && (e.time || '') === (ev.time || '');
        });
      }

      function buildTable(evs, checkedByDefault) {
        if (!evs.length) {
          return '<p style="font-size:.8rem;color:#aaa;padding:8px 10px;text-align:center">' +
            esc(t('pl_icsImpNone')) + '</p>';
        }
        var html = '<table style="width:100%;border-collapse:collapse;font-size:.78rem">'
          + '<thead><tr style="position:sticky;top:0;background:#f0f0f0;z-index:1">'
          + '<th style="padding:4px 6px;text-align:center;border-bottom:1.5px solid #bbb;width:28px"></th>'
          + '<th style="padding:4px 8px;text-align:left;border-bottom:1.5px solid #bbb;white-space:nowrap">' + esc(t('pl_icsColDate')) + '</th>'
          + '<th style="padding:4px 8px;text-align:left;border-bottom:1.5px solid #bbb;white-space:nowrap">' + esc(t('pl_icsColTime')) + '</th>'
          + '<th style="padding:4px 8px;text-align:left;border-bottom:1.5px solid #bbb">' + esc(t('pl_icsColTopic')) + '</th>'
          + '<th style="padding:4px 8px;text-align:left;border-bottom:1.5px solid #bbb;width:70px"></th>'
          + '</tr></thead><tbody>';

        evs.forEach(function (ev) {
          var idx = _icsParsed.indexOf(ev);
          var dup = isDup(ev);
          var d = new Date(ev.date + 'T12:00:00');
          var dateLabel = d.toLocaleDateString(undefined,
            { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
          var timeLabel = ev.time ? (ev.time + (ev.timeEnd ? '–' + ev.timeEnd : '')) : '';
          var title = esc(ev.summary) + (ev.description ? ' | ' + esc(ev.description.slice(0, 100)) : '');
          var shouldCheck = checkedByDefault && !dup;
          html += '<tr style="border-bottom:1px solid #eee">'
            + '<td style="padding:3px 6px;text-align:center">'
            + '<input type="checkbox" data-idx="' + idx + '"' + (shouldCheck ? ' checked' : '') + '>'
            + '</td>'
            + '<td style="padding:3px 8px;white-space:nowrap">' + esc(dateLabel) + '</td>'
            + '<td style="padding:3px 8px;white-space:nowrap;color:#666;font-size:.74rem">' + esc(timeLabel) + '</td>'
            + '<td style="padding:3px 8px;max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + title + '">'
            + esc(ev.summary || '—') + '</td>'
            + '<td style="padding:3px 8px">'
            + (dup
              ? '<span style="font-size:.65rem;font-weight:800;background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:3px;white-space:nowrap">'
              + esc(t('pl_icsImpDuplicate')) + '</span>'
              : '')
            + '</td></tr>';
        });
        html += '</tbody></table>';
        return html;
      }

      // In-semester events: checked by default (non-duplicates)
      // Out-of-semester events: unchecked by default (become orphan entries until a term is created)
      document.getElementById('ics-preview-in').innerHTML = buildTable(inSem, true);
      document.getElementById('ics-preview-out').innerHTML = buildTable(outSem, false);
      document.getElementById('ics-outside-section').style.display = outSem.length ? '' : 'none';
      document.getElementById('ics-preview').style.display = '';
      document.getElementById('ics-import-btn').style.display = '';
    }

    function icsSelectAll(checked, group) {
      var id = group === 'in' ? 'ics-preview-in' : 'ics-preview-out';
      document.getElementById(id).querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
        cb.checked = checked;
      });
    }

    // ── ICS import commit ────────────────────────────────────────────────────────

    function doImportIcs() {
      var classId = icsResolveClassId();
      if (!classId) { showToast(t('pl_icsImpNoClass')); return; }

      var type = document.getElementById('ics-imp-type').value || 'lesson';

      var toImport = [];
      document.querySelectorAll(
        '#ics-preview-in input[type="checkbox"]:checked, ' +
        '#ics-preview-out input[type="checkbox"]:checked'
      ).forEach(function (cb) {
        var idx = parseInt(cb.getAttribute('data-idx'), 10);
        if (!isNaN(idx) && _icsParsed[idx]) toImport.push(_icsParsed[idx]);
      });

      if (!toImport.length) { showToast(t('pl_icsImpNone')); return; }

      // Ensure the class has a config entry (don't overwrite an existing one)
      if (!cfg.classes[classId]) {
        cfg.classes[classId] = { color: PRESET_COLORS[0], schedule: [], objectives: [], manual: true };
        persistCfg();
      }

      toImport.forEach(function (ev) {
        entries.push({
          id: uid(),
          classId: classId,
          date: ev.date,
          time: ev.time || '',
          timeEnd: ev.timeEnd || '',
          type: type,
          topic: ev.summary || '',
          objective: '',
          notes: ev.description || '',
          customFields: undefined,
          gsLink: null
        });
      });

      persistEntries();
      populateSelects();

      var _today = new Date().toISOString().slice(0, 10);
      if (!showPast && toImport.some(function (ev) { return ev.date < _today; })) {
        showPast = true;
        syncToggleSeg('pastBtn', 'show');
      }
      var _activeSemForImp = getActiveSem();
      if (!showOutsideTerm && _activeSemForImp && toImport.some(function (ev) {
        return ev.date < _activeSemForImp.semesterStart || ev.date > _activeSemForImp.semesterEnd;
      })) {
        showOutsideTerm = true;
        syncToggleSeg('outsideBtn', 'all');
      }

      closeModal('icsImportModal');
      render();
      showToast(tFmt('pl_icsImpDone', { n: toImport.length }));
    }

    // ── Calendar Subscriptions (Google / iCal Feeds) ───────────────────────────

    function getActiveSubscribedEntries() {
      var list = [];
      var subs = cfg.subscriptions || [];
      var activeSem = getActiveSem();
      var semStart = activeSem && activeSem.semesterStart || '';
      var semEnd = activeSem && activeSem.semesterEnd || '';
      var todayStr = new Date().toISOString().slice(0, 10);
      var globalFutureOnly = cfg.subFutureOnly !== false;

      subs.forEach(function (sub) {
        if (sub.enabled === false) return;
        var cache = (window.PLANNER_SUBSCRIPTION_CACHE || {})[sub.id];
        if (cache && Array.isArray(cache.events)) {
          var isSubFutureOnly = sub.futureOnly !== undefined ? (sub.futureOnly !== false) : globalFutureOnly;
          cache.events.forEach(function (ev) {
            // If future-only is active on this feed or globally, filter out events before today
            if (isSubFutureOnly && ev.date < todayStr) {
              return;
            }
            // Apply assigned or auto-matched class ID
            var cid = sub.assignMode === 'fixed' ? (sub.classId || '') : (ev.classId || '');
            list.push(Object.assign({}, ev, {
              classId: cid,
              subName: sub.name || cache.calName || t('pl_subFeedHeaderFallback'),
              type: ev.type || sub.defaultType || 'lesson',
              _isSubscribed: true
            }));
          });
        }
      });
      return list;
    }

    function getSubscribedEntryById(id) {
      if (!id) return null;
      var subs = cfg.subscriptions || [];
      for (var i = 0; i < subs.length; i++) {
        var sub = subs[i];
        var cache = (window.PLANNER_SUBSCRIPTION_CACHE || {})[sub.id];
        if (cache && Array.isArray(cache.events)) {
          var found = cache.events.find(function (e) { return e.id === id; });
          if (found) {
            var cid = sub.assignMode === 'fixed' ? (sub.classId || '') : (found.classId || '');
            return Object.assign({}, found, {
              classId: cid,
              subName: sub.name || cache.calName || t('pl_subFeedHeaderFallback'),
              type: found.type || sub.defaultType || 'lesson',
              _isSubscribed: true
            });
          }
        }
      }
      return null;
    }

    async function loadSubscriptionsCache() {
      if (window.PLANNER_SUBSCRIPTION_CACHE && Object.keys(window.PLANNER_SUBSCRIPTION_CACHE).length) return;
      window.PLANNER_SUBSCRIPTION_CACHE = window.PLANNER_SUBSCRIPTION_CACHE || {};
      if (!window.Desktop || !Desktop.isElectron()) return;
      try {
        var r = await Desktop.readByPath('user', 'planner/subscription-cache.json');
        if (r && r.ok && r.content) {
          window.PLANNER_SUBSCRIPTION_CACHE = JSON.parse(r.content);
        }
      } catch (e) { }
    }

    async function persistSubscriptionsCache() {
      if (!window.Desktop || !Desktop.isElectron()) return;
      try {
        var content = JSON.stringify(window.PLANNER_SUBSCRIPTION_CACHE || {}, null, 2);
        await Desktop.saveText('user', 'subscription-cache.json', content, 'planner');
      } catch (e) {
        console.warn('Could not persist subscription cache:', e);
      }
    }

    function openSubscriptionsModal(triggerEvent) {
      if (window.CmtWizard && !(triggerEvent && triggerEvent.shiftKey)) {
        openSubscriptionsWizard();
        return;
      }
      openLegacySubscriptionsModal();
    }

    function openSubscriptionsWizard() {
      var tr = function (k, fb) {
        try { if (window.i18n && i18n.t) { var v = i18n.t(k); if (v && v !== k) return v; } } catch (_) {}
        return fb;
      };
      CmtWizard.open({
        id: 'pl-sub-wizard',
        title: tr('plSubWizTitle', 'Connect External Calendar'),
        icon: 'calendar-sync.svg',
        width: '700px',
        initialState: {
          provider: 'google',
          name: '',
          url: '',
          entryType: 'lesson',
          autoSync: true
        },
        quickModeToggle: {
          label: tr('wizQuickAdvanced', 'Manage Existing Feeds'),
          icon: 'settings.svg',
          onClick: function (w) {
            w.close();
            openLegacySubscriptionsModal();
          }
        },
        steps: [
          {
            id: 'provider',
            label: tr('plSubWizStep1', '1. Calendar'),
            render: function (container, st, ctx) {
              container.innerHTML =
                '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('plSubWizProvHeading', 'Which calendar do you want to connect?')) + '</h3>' +
                '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('plSubWizProvSub', 'Pick your calendar service to see where to find your share link.')) + '</p>';
              ctx.renderCards(container, [
                { id: 'google', icon: 'calendar.svg', badge: 'Google', title: tr('plSubOptGoogle', 'Google Calendar'), desc: tr('plSubOptGoogleDesc', 'Settings → Integrate calendar → Secret address in iCal format.') },
                { id: 'outlook', icon: 'calendar.svg', badge: 'Outlook', title: tr('plSubOptOutlook', 'Microsoft Outlook / 365'), desc: tr('plSubOptOutlookDesc', 'Settings → Shared calendars → Publish a calendar → ICS link.') },
                { id: 'apple', icon: 'calendar.svg', badge: 'iCloud', title: tr('plSubOptApple', 'Apple iCloud Calendar'), desc: tr('plSubOptAppleDesc', 'Share icon next to calendar → Public Calendar → Copy Link.') },
                { id: 'other', icon: 'globe.svg', badge: '.ICS', title: tr('plSubOptOther', 'Other School / Web Calendar'), desc: tr('plSubOptOtherDesc', 'Any .ics or webcal:// calendar feed URL.') }
              ], st.provider, function (item) { st.provider = item.id; });
            }
          },
          {
            id: 'details',
            label: tr('plSubWizStep2', '2. Link & Options'),
            render: function (container, st, ctx) {
              var hintMap = {
                google: tr('plSubHintGoogle', 'In Google Calendar: open Settings (gear) → select your calendar → scroll to "Secret address in iCal format" and copy it.'),
                outlook: tr('plSubHintOutlook', 'In Outlook Web: Settings → Calendar → Shared calendars → Publish a calendar → copy the ICS link.'),
                apple: tr('plSubHintApple', 'In iCloud Calendar: click the share icon next to your calendar, enable Public Calendar, and copy the link.'),
                other: tr('plSubHintOther', 'Paste the .ics or webcal:// link provided by your school or timetable tool.')
              };
              container.innerHTML =
                '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('plSubWizLinkHeading', 'Paste your calendar link')) + '</h3>' +
                '<p class="cmt-wiz-step-sub">' + ctx.escHtml(hintMap[st.provider] || hintMap.other) + '</p>' +
                '<div class="cmt-wiz-section">' +
                  '<label class="cmt-wiz-label">' + ctx.escHtml(tr('plSubNameLabel', 'Calendar Name')) + '</label>' +
                  '<input type="text" class="cmt-wiz-input" id="pl-wiz-sub-name" placeholder="e.g. School Timetable" value="' + ctx.escHtml(st.name) + '" style="margin-bottom:10px;">' +
                  '<label class="cmt-wiz-label">' + ctx.escHtml(tr('plSubUrlLabel', 'Calendar Link (.ics or webcal://)')) + '</label>' +
                  '<input type="text" class="cmt-wiz-input" id="pl-wiz-sub-url" placeholder="https://... or webcal://..." value="' + ctx.escHtml(st.url) + '" style="margin-bottom:10px;">' +
                  '<label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;font-weight:600;cursor:pointer;">' +
                    '<input type="checkbox" id="pl-wiz-sub-auto" ' + (st.autoSync ? 'checked' : '') + ' style="width:15px;height:15px;accent-color:#222;">' +
                    '<span>' + ctx.escHtml(tr('plSubAutoSyncLabel', 'Automatically refresh events when opening Planner')) + '</span>' +
                  '</label>' +
                '</div>';
              container.querySelector('#pl-wiz-sub-name').addEventListener('input', function () { st.name = this.value; });
              container.querySelector('#pl-wiz-sub-url').addEventListener('input', function () { st.url = this.value.trim(); });
              container.querySelector('#pl-wiz-sub-auto').addEventListener('change', function () { st.autoSync = this.checked; });
            },
            validate: function (st) {
              if (!st.url) return tr('plSubErrUrl', 'Please paste a calendar link (.ics or webcal://).');
              return true;
            }
          }
        ],
        finishLabel: tr('plSubWizFinish', 'Add & Sync Calendar'),
        finishIcon: 'check.svg',
        onFinish: function (st) {
          openLegacySubscriptionsModal();
          var urlEl = document.getElementById('sub-url-input');
          var nameEl = document.getElementById('sub-name-input');
          var autoEl = document.getElementById('sub-autosync-cb');
          var saveBtn = document.getElementById('sub-save-btn');
          if (urlEl) urlEl.value = st.url;
          if (nameEl) nameEl.value = st.name || 'Calendar';
          if (autoEl) autoEl.checked = !!st.autoSync;
          if (saveBtn) saveBtn.click();
        }
      });
    }

    function openLegacySubscriptionsModal() {
      // Populate class assignment dropdown
      var sel = document.getElementById('sub-assign-select');
      if (sel) {
        while (sel.options.length > 2) sel.remove(2);
        getPlannerClassIds().forEach(function (id) {
          sel.add(new Option(plannerClassDisplayName(id), id));
        });
      }

      // Populate custom types
      var typeSel = document.getElementById('sub-type-select');
      if (typeSel) {
        for (var i = typeSel.options.length - 1; i >= 0; i--) {
          if (typeSel.options[i].dataset.custom) typeSel.remove(i);
        }
        (cfg.customTypes || []).forEach(function (name) {
          var o = new Option(name, name);
          o.dataset.custom = '1';
          typeSel.add(o);
        });
      }

      resetSubscriptionForm();
      renderSubscriptionsModalList();
      openModal('subscriptionsModal');
    }

    function resetSubscriptionForm() {
      document.getElementById('sub-edit-id').value = '';
      document.getElementById('sub-url-input').value = '';
      document.getElementById('sub-name-input').value = '';
      document.getElementById('sub-assign-select').value = 'auto';
      document.getElementById('sub-type-select').value = 'lesson';
      document.getElementById('sub-futureonly-cb').checked = true;
      document.getElementById('sub-autosync-cb').checked = true;
      document.getElementById('sub-form-title').textContent = t('pl_subAddTitle');
      document.getElementById('sub-save-btn-text').textContent = t('pl_subBtnAdd');
      document.getElementById('sub-cancel-edit-btn').style.display = 'none';
      document.getElementById('sub-global-status').textContent = '';
    }

    function renderSubscriptionsModalList() {
      var listEl = document.getElementById('sub-feed-list');
      if (!listEl) return;
      var subs = cfg.subscriptions || [];

      if (!subs.length) {
        listEl.innerHTML = '<div style="padding:16px;text-align:center;color:#64748b;font-size:.82rem;font-weight:600;">' + esc(t('pl_subNoFeeds')) + '</div>';
        return;
      }

      var html = '';
      subs.forEach(function (sub) {
        var cache = (window.PLANNER_SUBSCRIPTION_CACHE || {})[sub.id] || {};
        var evCount = (cache.events || []).length;
        var displayName = sub.name || cache.calName || t('pl_subFeedHeaderFallback');
        var isEnabled = sub.enabled !== false;
        
        var classTag = '';
        if (sub.assignMode === 'fixed' && sub.classId) {
          classTag = '<span style="background:#f1f5f9;color:#334155;padding:1px 6px;border-radius:4px;font-size:.68rem;font-weight:700;">' + esc(plannerClassDisplayName(sub.classId)) + '</span>';
        } else if (sub.assignMode === 'auto') {
          var matchedName = cache.calName || 'Auto';
          classTag = '<span style="background:#eff6ff;color:#1d4ed8;padding:1px 6px;border-radius:4px;font-size:.68rem;font-weight:700;">' + esc(tFmt('pl_subFeedNameAutoMatched', { cls: matchedName })) + '</span>';
        } else {
          classTag = '<span style="background:#f8fafc;color:#64748b;padding:1px 6px;border-radius:4px;font-size:.68rem;font-weight:700;">' + esc(t('pl_subAssignUnassigned')) + '</span>';
        }

        var syncTimeText = sub.lastSync ? tFmt('pl_subLastSync', { time: new Date(sub.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }) : t('pl_subNeverSynced');

        html += '<div class="feed-item' + (!isEnabled ? ' feed-item-disabled' : '') + '" id="feed-item-' + esc(sub.id) + '">'
          + '<div class="feed-info">'
          + '<div class="feed-title-row">'
          + '<span class="feed-title">' + esc(displayName) + '</span>'
          + classTag
          + '</div>'
          + '<div class="feed-meta">'
          + '<span class="feed-meta-url" title="' + esc(sub.url) + '">' + esc(sub.url) + '</span>'
          + '<span>• ' + esc(evCount + ' ' + (evCount === 1 ? 'event' : 'events')) + '</span>'
          + '<span>• ' + esc(syncTimeText) + '</span>'
          + (sub.lastStatus === 'error' ? '<span style="color:#b91c1c;font-weight:700;">• ' + esc(sub.errorMsg || 'Error') + '</span>' : '')
          + '</div>'
          + '</div>'
          + '<div class="feed-actions">'
          + '<button class="tb-btn" data-pl-action="sub-sync" data-pl-sub="' + esc(sub.id) + '" title="' + esc(t('pl_subSyncNow')) + '"><img src="../assets/icons/refresh.svg" class="btn-icon" id="sync-icon-' + esc(sub.id) + '" alt="" /> <span data-i18n="pl_subSyncNow">' + esc(t('pl_subSyncNow')) + '</span></button>'
          + '<button class="tb-btn" data-pl-action="sub-edit" data-pl-sub="' + esc(sub.id) + '" title="Edit"><img src="../assets/icons/edit-word.svg" class="btn-icon" alt="" /></button>'
          + '<button class="tb-btn" data-pl-action="sub-toggle" data-pl-sub="' + esc(sub.id) + '" title="' + (isEnabled ? 'Disable' : 'Enable') + '"><img src="../assets/icons/' + (isEnabled ? 'eye.svg' : 'lock.svg') + '" class="btn-icon" alt="" /></button>'
          + '<button class="tb-btn" data-pl-action="sub-delete" data-pl-sub="' + esc(sub.id) + '" title="Delete"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button>'
          + '</div>'
          + '</div>';
      });

      listEl.innerHTML = html;
    }

    async function saveSubscriptionForm() {
      var urlInput = document.getElementById('sub-url-input');
      var url = (urlInput.value || '').trim();
      if (!url) {
        showToast(t('pl_subUrlHint'), true);
        urlInput.focus();
        return;
      }

      var editId = document.getElementById('sub-edit-id').value;
      var name = document.getElementById('sub-name-input').value.trim();
      var assignMode = document.getElementById('sub-assign-select').value;
      var classId = (assignMode !== 'auto' && assignMode !== '__unassigned__') ? assignMode : '';
      var defaultType = document.getElementById('sub-type-select').value || 'lesson';
      var futureOnly = document.getElementById('sub-futureonly-cb').checked;
      var autoSync = document.getElementById('sub-autosync-cb').checked;

      if (!cfg.subscriptions) cfg.subscriptions = [];

      var subObj;
      if (editId) {
        subObj = cfg.subscriptions.find(function (s) { return s.id === editId; });
        if (subObj) {
          subObj.url = url;
          subObj.name = name;
          subObj.assignMode = assignMode === 'auto' ? 'auto' : (assignMode === '__unassigned__' ? 'unassigned' : 'fixed');
          subObj.classId = classId;
          subObj.defaultType = defaultType;
          subObj.futureOnly = futureOnly;
          subObj.autoSync = autoSync;
        }
      } else {
        subObj = {
          id: uid(),
          url: url,
          name: name,
          assignMode: assignMode === 'auto' ? 'auto' : (assignMode === '__unassigned__' ? 'unassigned' : 'fixed'),
          classId: classId,
          defaultType: defaultType,
          futureOnly: futureOnly,
          autoSync: autoSync,
          enabled: true,
          lastSync: null,
          lastStatus: null,
          errorMsg: null
        };
        cfg.subscriptions.push(subObj);
      }

      await persistCfg();
      resetSubscriptionForm();
      renderSubscriptionsModalList();

      // Trigger immediate sync for this subscription
      if (subObj) {
        syncSubscription(subObj.id);
      }
    }

    function editSubscription(id) {
      var sub = (cfg.subscriptions || []).find(function (s) { return s.id === id; });
      if (!sub) return;

      document.getElementById('sub-edit-id').value = sub.id;
      document.getElementById('sub-url-input').value = sub.url || '';
      document.getElementById('sub-name-input').value = sub.name || '';
      
      var assignSel = document.getElementById('sub-assign-select');
      if (sub.assignMode === 'auto') assignSel.value = 'auto';
      else if (sub.assignMode === 'unassigned') assignSel.value = '__unassigned__';
      else assignSel.value = sub.classId || 'auto';

      document.getElementById('sub-type-select').value = sub.defaultType || 'lesson';
      document.getElementById('sub-futureonly-cb').checked = sub.futureOnly !== false;
      document.getElementById('sub-autosync-cb').checked = sub.autoSync !== false;

      document.getElementById('sub-form-title').textContent = t('pl_subEditTitle');
      document.getElementById('sub-save-btn-text').textContent = t('saved');
      document.getElementById('sub-cancel-edit-btn').style.display = 'inline-flex';
      document.getElementById('sub-url-input').focus();
    }

    function deleteSubscription(id) {
      showConfirm(t('pl_subDeleteConfirm'), async function () {
        cfg.subscriptions = (cfg.subscriptions || []).filter(function (s) { return s.id !== id; });
        if (window.PLANNER_SUBSCRIPTION_CACHE) {
          delete window.PLANNER_SUBSCRIPTION_CACHE[id];
        }
        await persistCfg();
        await persistSubscriptionsCache();
        renderSubscriptionsModalList();
        render();
      });
    }

    async function toggleSubscription(id) {
      var sub = (cfg.subscriptions || []).find(function (s) { return s.id === id; });
      if (!sub) return;
      sub.enabled = !(sub.enabled !== false);
      await persistCfg();
      renderSubscriptionsModalList();
      render();
    }

    async function fetchSubscriptionFeed(sub) {
      var rawUrl = (sub.url || '').trim();
      if (!rawUrl) throw new Error('Missing URL');

      var fetchUrl = rawUrl;
      if (fetchUrl.startsWith('webcal://')) {
        fetchUrl = 'https://' + fetchUrl.slice(9);
      }

      var icsText = '';
      if (window.Desktop && typeof Desktop.fetchUrl === 'function') {
        var r = await Desktop.fetchUrl(fetchUrl);
        if (!r || !r.ok) {
          throw new Error(r ? (r.error || 'HTTP ' + r.status) : 'Network error');
        }
        icsText = r.content || '';
      } else {
        var resp = await fetch(fetchUrl, { method: 'GET', cache: 'no-cache' });
        if (!resp.ok) {
          throw new Error('HTTP ' + resp.status + ' ' + (resp.statusText || ''));
        }
        icsText = await resp.text();
      }

      return parseSubscriptionIcs(icsText, sub);
    }

    function parseSubscriptionIcs(text, sub) {
      if (!text || typeof text !== 'string') {
        throw new Error('Empty response from calendar feed');
      }

      if (/^\s*<!DOCTYPE\s+html/i.test(text) || /^\s*<html/i.test(text)) {
        throw new Error('Received HTML webpage instead of an .ics calendar. Please copy the "Secret address in iCal format" from Google Calendar Settings.');
      }

      if (text.indexOf('BEGIN:VCALENDAR') === -1 && text.indexOf('BEGIN:VEVENT') === -1) {
        throw new Error('Feed does not contain valid iCal (RFC 5545) data.');
      }

      var calName = '';
      var mName = text.match(/X-WR-CALNAME:(.+)/i);
      if (mName && mName[1]) {
        calName = icsUnescape(mName[1].trim());
      }

      var targetClassId = '';
      if (sub.assignMode === 'fixed') {
        targetClassId = sub.classId || '';
      } else if (sub.assignMode === 'unassigned') {
        targetClassId = '';
      } else {
        // Auto-match mode: match against existing classes by name or id
        var searchName = (calName || sub.name || '').trim().toLowerCase();
        if (searchName) {
          var allCids = getPlannerClassIds();
          for (var i = 0; i < allCids.length; i++) {
            var cid = allCids[i];
            var dName = plannerClassDisplayName(cid).trim().toLowerCase();
            if (dName === searchName || cid.toLowerCase() === searchName) {
              targetClassId = cid;
              break;
            }
          }
          // If no matching class exists, create a planner class dynamically
          if (!targetClassId && calName) {
            targetClassId = calName;
            if (!cfg.classes[targetClassId]) {
              cfg.classes[targetClassId] = {
                color: PRESET_COLORS[Object.keys(cfg.classes).length % PRESET_COLORS.length],
                schedule: [],
                objectives: [],
                manual: true
              };
              persistCfg();
              populateSelects();
            }
          }
        }
      }

      var todayStr = new Date().toISOString().slice(0, 10);
      var minDate = (sub && sub.futureOnly !== false) ? todayStr : '';
      var rawParsed = parseIcsFile(text, { minDate: minDate, maxLimit: 25000 });
      var events = [];
      rawParsed.forEach(function (ev, idx) {
        events.push({
          id: 'sub_' + sub.id + '_' + ev.date + '_' + (ev.time ? ev.time.replace(':', '') : 'all') + '_' + idx,
          subId: sub.id,
          subName: sub.name || calName || t('pl_subFeedHeaderFallback'),
          calName: calName,
          classId: targetClassId,
          date: ev.date,
          time: ev.time || '',
          timeEnd: ev.timeEnd || '',
          type: sub.defaultType || 'lesson',
          topic: ev.summary || '',
          notes: [ev.description, ev.location ? ('Location: ' + ev.location) : ''].filter(Boolean).join('\n'),
          location: ev.location || '',
          _isSubscribed: true
        });
      });

      return { calName: calName, resolvedClassId: targetClassId, events: events };
    }

    async function syncSubscription(id) {
      var sub = (cfg.subscriptions || []).find(function (s) { return s.id === id; });
      if (!sub) return;

      var iconEl = document.getElementById('sync-icon-' + id);
      if (iconEl) iconEl.classList.add('spinning');
      var statusEl = document.getElementById('sub-global-status');
      if (statusEl) statusEl.textContent = t('pl_subSyncing');

      try {
        var res = await fetchSubscriptionFeed(sub);
        window.PLANNER_SUBSCRIPTION_CACHE = window.PLANNER_SUBSCRIPTION_CACHE || {};
        window.PLANNER_SUBSCRIPTION_CACHE[sub.id] = {
          calName: res.calName,
          resolvedClassId: res.resolvedClassId,
          lastSync: new Date().toISOString(),
          events: res.events
        };
        sub.lastSync = new Date().toISOString();
        sub.lastStatus = 'ok';
        sub.errorMsg = null;

        await persistCfg();
        await persistSubscriptionsCache();

        var activeSem = getActiveSem();
        var semStart = activeSem && activeSem.semesterStart || '';
        var semEnd = activeSem && activeSem.semesterEnd || '';
        var hasInSem = semStart && semEnd ? res.events.some(function (ev) { return ev.date >= semStart && ev.date <= semEnd; }) : true;
        if (!showOutsideTerm && !hasInSem && res.events.length > 0) {
          showOutsideTerm = true;
          syncToggleSeg('outsideBtn', 'all');
        }

        renderSubscriptionsModalList();
        render();
        showToast(tFmt('pl_subSyncSuccess', { n: res.events.length }));
      } catch (err) {
        console.warn('Subscription sync error:', err);
        sub.lastStatus = 'error';
        sub.errorMsg = err.message || 'Network error';
        await persistCfg();
        renderSubscriptionsModalList();
        showToast(tFmt('pl_subSyncFail', { err: sub.errorMsg }), true);
      } finally {
        if (iconEl) iconEl.classList.remove('spinning');
        if (statusEl) statusEl.textContent = '';
      }
    }

    async function syncAllSubscriptions(silent) {
      var subs = (cfg.subscriptions || []).filter(function (s) { return s.enabled !== false; });
      if (!subs.length) return;

      var allBtn = document.getElementById('sub-sync-all-btn');
      var allIcon = allBtn ? allBtn.querySelector('img') : null;
      if (allIcon) allIcon.classList.add('spinning');

      var totalEvents = 0;
      var errors = [];

      for (var i = 0; i < subs.length; i++) {
        var sub = subs[i];
        try {
          var res = await fetchSubscriptionFeed(sub);
          window.PLANNER_SUBSCRIPTION_CACHE = window.PLANNER_SUBSCRIPTION_CACHE || {};
          window.PLANNER_SUBSCRIPTION_CACHE[sub.id] = {
            calName: res.calName,
            resolvedClassId: res.resolvedClassId,
            lastSync: new Date().toISOString(),
            events: res.events
          };
          sub.lastSync = new Date().toISOString();
          sub.lastStatus = 'ok';
          sub.errorMsg = null;
          totalEvents += res.events.length;
        } catch (err) {
          sub.lastStatus = 'error';
          sub.errorMsg = err.message || 'Network error';
          errors.push(sub.name || 'Feed #' + (i + 1));
        }
      }

      await persistCfg();
      await persistSubscriptionsCache();
      renderSubscriptionsModalList();
      render();

      if (allIcon) allIcon.classList.remove('spinning');

      if (!silent) {
        if (errors.length) {
          showToast(tFmt('pl_subSyncFail', { err: errors.join(', ') }), true);
        } else {
          showToast(tFmt('pl_subSyncSuccess', { n: totalEvents }));
        }
      }
    }

    function openSubscribedEventModal(entryOrId) {
      var entry = typeof entryOrId === 'string' ? getSubscribedEntryById(entryOrId) : entryOrId;
      if (!entry) return;
      _currentSubscribedEvent = entry;

      var bodyEl = document.getElementById('sub-event-modal-body');
      if (!bodyEl) return;

      var d = new Date(entry.date + 'T12:00:00');
      var dateLabel = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      var timeLabel = entry.time ? (entry.time + (entry.timeEnd ? ' – ' + entry.timeEnd : '')) : t('pl_allDay');
      var className = entry.classId ? plannerClassDisplayName(entry.classId) : t('pl_noClass');

      var html = '<div style="display:flex;flex-direction:column;gap:10px;">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #e2e8f0;padding-bottom:8px;">'
        + '<div><div style="font-size:1.05rem;font-weight:800;color:#0f172a;">' + esc(entry.topic || 'Untitled Event') + '</div>'
        + '<div style="font-size:.76rem;color:#64748b;font-weight:600;margin-top:2px;">' + esc(dateLabel) + ' • ' + esc(timeLabel) + '</div></div>'
        + '<span class="sub-feed-badge" style="font-size:.75rem;padding:3px 8px;"><img src="../assets/icons/feed.svg" class="sub-badge-icon" style="width:12px; height:12px;" alt="" /> ' + esc(entry.subName || 'Calendar Feed') + '</span>'
        + '</div>'
        + '<div style="display:flex;gap:12px;font-size:.78rem;color:#475569;">'
        + '<div><strong>Class:</strong> ' + esc(className) + '</div>'
        + '<div><strong>Type:</strong> ' + esc(typeLabel(entry.type || 'lesson')) + '</div>'
        + '</div>';

      if (entry.notes) {
        html += '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;font-size:.8rem;color:#334155;white-space:pre-wrap;max-height:160px;overflow-y:auto;">'
          + esc(entry.notes)
          + '</div>';
      }

      html += '<div style="font-size:.74rem;color:#64748b;font-style:italic;">'
        + 'This event is synchronized from an external Google / iCal calendar feed. Click below to convert it into an editable local planner entry.'
        + '</div>'
        + '</div>';

      bodyEl.innerHTML = html;
      openModal('subscribedEventModal');
    }

    function convertCurrentSubscribedToLocal() {
      if (!_currentSubscribedEvent) return;
      var subEv = _currentSubscribedEvent;

      var newEntry = {
        id: uid(),
        classId: subEv.classId || '',
        date: subEv.date,
        time: subEv.time || '',
        timeEnd: subEv.timeEnd || '',
        type: subEv.type || 'lesson',
        topic: subEv.topic || '',
        objective: '',
        notes: subEv.notes || '',
        customFields: undefined,
        gsLink: null
      };

      if (newEntry.classId && !cfg.classes[newEntry.classId]) {
        cfg.classes[newEntry.classId] = {
          color: PRESET_COLORS[Object.keys(cfg.classes).length % PRESET_COLORS.length],
          schedule: [],
          objectives: [],
          manual: true
        };
        persistCfg();
      }

      entries.push(newEntry);
      persistEntries();
      populateSelects();
      closeModal('subscribedEventModal');
      render();
      showToast(t('pl_subConvertedSuccess'));
    }

    (function () {
      if (!window.Desktop || typeof Desktop.onDataChanged !== 'function') return;

      window._cmtHotReload = async function (data) {
        try {
          // Re-read the changed file so loadData() picks up the updated globals
          if (data.filename === 'planner-config.js') {
            var r = await Desktop.readText('user', 'planner-config.js');
            if (r && r.ok) {
              // eslint-disable-next-line no-new-func
              try { new Function(r.content)(); } catch (e) { }
            }
          } else if (data.filename === 'class-groups.js') {
            var rg = await Desktop.readText('user', 'class-groups.js');
            if (rg && rg.ok) {
              // eslint-disable-next-line no-new-func
              try { new Function(rg.content)(); } catch (e) { }
            }
          } else if (data.subdir === 'planner' && data.filename) {
            var re = await Desktop.readText('user', data.filename);
            if (re && re.ok) {
              // eslint-disable-next-line no-new-func
              try { new Function(re.content)(); } catch (e) { }
            }
          }
          if (typeof loadData === 'function') await loadData();
          if (typeof render === 'function') render();
        } catch (e) { location.reload(); }
      };

      Desktop.onDataChanged(function (data) {
        var deletedCid = plannerClassIdFromDeleteEvent(data);
        if (deletedCid !== null) {
          plannerMarkClassFileDeleted(deletedCid);
          return;
        }
        if (data && data.target === 'mindmaps') {
          if (typeof loadBoardSessions === 'function') loadBoardSessions();
          return;
        }
        if (data && data.filename === 'board-sessions-backup.json') {
          if (typeof loadBoardSessions === 'function') loadBoardSessions();
          return;
        }
        if (data && (data.target === 'lessons' || data.subdir === 'lessons' || (data.filename && data.filename.startsWith('lp_')))) {
          _plannerLessonPlanMetaCache = {};
          if (typeof loadSavedLessonPlans === 'function') {
            loadSavedLessonPlans();
          }
          return;
        }
        if (data && data.filename === 'pinned-items.json') {
          if (window.Pins && typeof Pins.getPins === 'function') {
            Pins.getPins().then(function(pins) {
              plannerPins = pins || [];
              if (typeof plannerUpdatePinButtons === 'function') plannerUpdatePinButtons();
            });
          }
          return;
        }
        if (data && (data.target === 'grades' || data.subdir === 'grades')) {
          if (typeof validateGradeSheetLinks === 'function') validateGradeSheetLinks();
          return;
        }
        if (data && (data.filename === 'planner-config.js' || data.filename === 'class-groups.js' || data.subdir === 'planner')) {
          showDataChangedBanner(data);
        }
      });

      // (Focus listener consolidated at line 1658 with debounce & zero full-rebuild diffing)
    })();

    // ── Todo list ─────────────────────────────────────────────────────────────────

    var todos = [];
    var _editingTodoId = null;
    var _todoPanelOpen = false;
    var _tdModalSubtodos = [];
    var _tdModalSelectedClassIds = new Set();

    function loadTodos() {
      todos = Array.isArray(window.TODOS) ? window.TODOS.slice() : [];
      tdPruneMissingMindmapLinks();
      renderTodos();
    }

    function tdGetKnownMindmapLinkIds() {
      var ids = new Set();
      Object.keys(boardSessionsByEntryId || {}).forEach(function (eid) {
        (boardSessionsByEntryId[eid] || []).forEach(function (s) {
          if (s && s.id) ids.add(String(s.id));
        });
      });
      return ids;
    }

    function tdPruneMissingMindmapLinks() {
      if (!Array.isArray(todos) || !todos.length) return;
      var knownIds = tdGetKnownMindmapLinkIds();
      var changed = false;
      todos.forEach(function (td) {
        if (!td || !td.links || !td.links.mindmapPath) return;
        var id = String(td.links.mindmapPath);
        if (knownIds.has(id)) return;
        td.links.mindmapPath = null;
        changed = true;
      });
      if (changed) {
        persistTodos();
        renderTodos();
      }
    }

    async function persistTodos() {
      if (!window.Desktop || !Desktop.isElectron()) return;
      window.TODOS = todos;
      await Desktop.saveText('user', 'todos.js', 'window.TODOS = ' + JSON.stringify(todos, null, 2) + ';\n');
      if (Desktop.reloadPlannerReminders) Desktop.reloadPlannerReminders();
    }

    function toggleTodoPanel() {
      _todoPanelOpen = !_todoPanelOpen;
      var panel = document.getElementById('todo-panel');
      if (panel) panel.classList.toggle('tp-open', _todoPanelOpen);
    }

    function renderTodos() {
      var list = document.getElementById('td-list');
      if (!list) return;
      var showDone = document.getElementById('td-show-archived');
      var showArchived = showDone && showDone.checked;
      var today = new Date().toISOString().slice(0, 10);

      var visible = todos.filter(function (td) {
        return showArchived ? !!td.archivedAt : !td.archivedAt;
      });
      visible.sort(function (a, b) {
        var aOver = !a.archivedAt && a.dueDate && a.dueDate < today;
        var bOver = !b.archivedAt && b.dueDate && b.dueDate < today;
        if (aOver !== bOver) return aOver ? -1 : 1;
        if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return (a.createdAt || 0) - (b.createdAt || 0);
      });

      if (!visible.length) {
        var emptyKey = showArchived ? 'td_emptyDone' : 'td_emptyTodos';
        list.innerHTML = '<div class="td-empty">' + esc(t(emptyKey)) + '</div>';
        return;
      }
      list.innerHTML = '';
      visible.forEach(function (td) {
        var overdue = !td.archivedAt && td.dueDate && td.dueDate < today;
        var done = !!td.archivedAt;
        var item = document.createElement('div');
        item.className = 'td-item' + (overdue ? ' td-overdue' : '') + (done ? ' td-done' : '');

        var checkCls = 'td-check' + (done ? ' td-checked' : '');
        var metaParts = [];
        if (td.dueDate) {
          metaParts.push('<span class="td-due">' + esc(fmtShortDate(td.dueDate)) + '</span>');
        }
        var cids = Array.isArray(td.classIds) && td.classIds.length ? td.classIds : (td.classId ? [td.classId] : []);
        if (cids.length) {
          cids.forEach(function (cid) {
            metaParts.push('<span class="td-badge td-badge-class">' + esc(plannerClassDisplayName(cid)) + '</span>');
          });
        }
        var hasLinks = td.links && (td.links.entryId || td.links.mindmapPath || td.links.gsClassId);
        if (hasLinks) {
          metaParts.push('<span class="td-badge td-badge-link">' + esc(t('td_linked')) + '</span>');
        }
        var subs = td.subtodos || [];
        if (subs.length) {
          var subDone = subs.filter(function (s) { return s.done; }).length;
          metaParts.push('<span class="td-badge" style="color:#888">' + subDone + '/' + subs.length + '</span>');
        }
        var subtodosHtml = '';
        if (subs.length) {
          subtodosHtml = '<div class="td-subtodos" data-parent="' + esc(td.id) + '">' +
            subs.map(function (st) {
              return '<div class="std-item">' +
                '<div class="std-check' + (st.done ? ' std-checked' : '') + '" data-pl-action="toggle-subtodo" data-pl-tdid="' + esc(td.id) + '" data-pl-subid="' + esc(st.id) + '"></div>' +
                '<span class="std-text' + (st.done ? ' std-done-text' : '') + '" data-parent="' + esc(td.id) + '" data-sub="' + esc(st.id) + '" data-pl-action="edit-subtodo">' + esc(st.text) + '</span>' +
                '<button class="std-del" data-pl-action="del-subtodo" data-pl-tdid="' + esc(td.id) + '" data-pl-subid="' + esc(st.id) + '">×</button>' +
                '</div>';
            }).join('') +
            '</div>';
        }

        var isTdPinned = plannerPins.some(function(p) {
          return p.type === 'todo' && p.id === td.id;
        });
        var tdPinTitle = isTdPinned ? 'Unpin from sidebar' : 'Pin to sidebar';
        var tdPinIcon = isTdPinned ? '' : '';
        var tdPinHtml = '<button class="td-act-btn ' + (isTdPinned ? 'pinned' : '') + '" data-pl-action="toggle-td-pin" data-pl-tdid="' + esc(td.id) + '" title="' + esc(tdPinTitle) + '">' + tdPinIcon + '</button>';

        item.setAttribute('data-tdid', td.id);
        item.innerHTML =
          '<div class="td-check ' + checkCls + '" data-pl-action="toggle-td" data-pl-tdid="' + esc(td.id) + '"></div>' +
          '<div class="td-body">' +
          '<div class="td-text">' + esc(td.text) + '</div>' +
          (metaParts.length ? '<div class="td-meta">' + metaParts.join('') + '</div>' : '') +
          subtodosHtml +
          '<button class="std-add-btn" data-pl-action="add-subtodo" data-pl-tdid="' + esc(td.id) + '">' + esc(t('td_addSubtodo')) + '</button>' +
          '</div>' +
          '<div class="td-actions">' +
          tdPinHtml +
          '<button class="td-act-btn" data-pl-action="edit-todo" data-pl-tdid="' + esc(td.id) + '" title="' + esc(t('td_editTodo')) + '">✎</button>' +
          (td.links && td.links.entryId ? '<button class="td-act-btn" data-pl-action="td-open-entry" data-pl-entry="' + esc(td.links.entryId) + '" title="→">→</button>' : '') +
          '<button class="td-act-btn td-del-btn" data-pl-action="del-todo" data-pl-tdid="' + esc(td.id) + '"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>' +
          '</div>';
        list.appendChild(item);
      });
    }

    function fmtShortDate(iso) {
      if (!iso) return '';
      var d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }

    function toggleTodoDone(id) {
      var td = todos.find(function (t) { return t.id === id; });
      if (!td) return;
      if (td.archivedAt) {
        td.archivedAt = null;
      } else {
        td.archivedAt = Date.now();
      }
      persistTodos();
      renderTodos();
    }

    function deleteTodo(id) {
      todos = todos.filter(function (t) { return t.id !== id; });
      persistTodos();
      renderTodos();
      if (typeof LinksService !== 'undefined' && typeof LinksService.removeLinksFor === 'function') {
        LinksService.removeLinksFor(LinksService.makeUrn('todo', id)).catch(function () {});
      }
    }

    function tdOpenEntry(entryId) {
      var entry = entries.find(function (e) { return e.id === entryId; });
      if (entry) openEditEntry(entryId);
    }

    function openAddTodo(linkEntryId) {
      _editingTodoId = null;
      _tdModalFill({ id: null, text: '', dueDate: '', reminderAt: null, classIds: [], classId: '', links: { entryId: linkEntryId || '', mindmapPath: '', gsClassId: '' } });
      document.getElementById('td-modal-title').setAttribute('data-i18n', 'td_addTodo');
      document.getElementById('td-modal-title').textContent = t('td_addTodo');
      document.getElementById('td-modal').style.display = 'flex';
      var ta = document.getElementById('td-text');
      if (ta) ta.focus();
    }

    function openEditTodo(id) {
      var td = todos.find(function (t) { return t.id === id; });
      if (!td) return;
      _editingTodoId = id;
      _tdModalFill(td);
      document.getElementById('td-modal-title').setAttribute('data-i18n', 'td_editTodo');
      document.getElementById('td-modal-title').textContent = t('td_editTodo');
      document.getElementById('td-modal').style.display = 'flex';
    }

    function _tdRenderModalSubtodos() {
      var container = document.getElementById('td-subtodos-list');
      if (!container) return;
      container.innerHTML = '';
      _tdModalSubtodos.forEach(function (st, idx) {
        var row = document.createElement('div');
        row.className = 'td-sub-row';
        var check = document.createElement('div');
        check.className = 'std-check' + (st.done ? ' std-checked' : '');
        check.onclick = function () { _tdModalFlushTexts(); _tdModalSubtodos[idx].done = !_tdModalSubtodos[idx].done; _tdRenderModalSubtodos(); };
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'td-sub-text' + (st.done ? ' std-done-text' : '');
        input.value = st.text;
        var del = document.createElement('button');
        del.className = 'std-del';
        del.textContent = '×';
        del.onclick = function () { _tdModalFlushTexts(); _tdModalSubtodos.splice(idx, 1); _tdRenderModalSubtodos(); };
        row.appendChild(check); row.appendChild(input); row.appendChild(del);
        container.appendChild(row);
      });
    }
    function _tdModalFlushTexts() {
      var inputs = document.querySelectorAll('#td-subtodos-list .td-sub-text');
      inputs.forEach(function (inp, i) { if (_tdModalSubtodos[i]) _tdModalSubtodos[i].text = inp.value; });
    }
    function _tdModalAddSub() {
      var addInput = document.getElementById('td-subtask-add');
      if (!addInput) return;
      var val = addInput.value.trim();
      if (!val) { addInput.focus(); return; }
      _tdModalFlushTexts();
      _tdModalSubtodos.push({ id: 'std-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5), text: val, done: false });
      addInput.value = '';
      _tdRenderModalSubtodos();
      addInput.focus();
    }

    function _tdRenderClassChips() {
      var container = document.getElementById('td-class-chips');
      if (!container) return;
      container.innerHTML = '';
      var classIds = getPlannerClassIds();
      if (!classIds.length) {
        var hint = document.createElement('div');
        hint.className = 'td-no-classes-hint';
        hint.textContent = t('td_noClassesSelected', 'No classes available');
        container.appendChild(hint);
        return;
      }
      classIds.forEach(function (cid) {
        var isSelected = _tdModalSelectedClassIds.has(cid);
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'td-class-chip' + (isSelected ? ' is-selected' : '');
        chip.setAttribute('data-cid', cid);
        var check = isSelected ? ' ' : '○ ';
        var name = plannerClassDisplayName(cid);
        chip.textContent = check + name;
        chip.onclick = function () {
          if (_tdModalSelectedClassIds.has(cid)) {
            _tdModalSelectedClassIds.delete(cid);
          } else {
            _tdModalSelectedClassIds.add(cid);
          }
          _tdRenderClassChips();
        };
        container.appendChild(chip);
      });
    }

    function _tdSelectAllClasses() {
      getPlannerClassIds().forEach(function (cid) { _tdModalSelectedClassIds.add(cid); });
      _tdRenderClassChips();
    }

    function _tdClearAllClasses() {
      _tdModalSelectedClassIds.clear();
      _tdRenderClassChips();
    }

    function _tdModalFill(td) {
      document.getElementById('td-text').value = td.text || '';
      document.getElementById('td-due').value = td.dueDate || '';
      _tdModalSubtodos = (td.subtodos || []).map(function (s) { return { id: s.id, text: s.text, done: !!s.done }; });
      _tdRenderModalSubtodos();
      var addInput = document.getElementById('td-subtask-add');
      if (addInput) addInput.value = '';

      // Multi-class selection
      _tdModalSelectedClassIds = new Set();
      var cids = Array.isArray(td.classIds) && td.classIds.length ? td.classIds : (td.classId ? [td.classId] : []);
      cids.forEach(function (cid) { if (cid) _tdModalSelectedClassIds.add(cid); });
      _tdRenderClassChips();

      // Reminder
      var remType = document.getElementById('td-reminder-type');
      var remDt = document.getElementById('td-reminder-dt');
      if (td.reminderAt) {
        remType.value = 'fixed';
        remDt.style.display = '';
        remDt.value = td.reminderAt.slice(0, 16);
      } else {
        remType.value = 'none';
        remDt.style.display = 'none';
        remDt.value = '';
      }

      // Entry link
      var links = td.links || {};
      var entrySel = document.getElementById('td-link-entry');
      entrySel.innerHTML = '<option value="">' + esc(t('td_noLink')) + '</option>';
      var today = new Date().toISOString().slice(0, 10);
      var recent = entries.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 60);
      recent.forEach(function (e) {
        var lbl = (e.date || '') + (e.classId ? ' · ' + plannerClassDisplayName(e.classId) : '') + (e.topic ? ' · ' + e.topic : '');
        var opt = document.createElement('option');
        opt.value = e.id; opt.textContent = lbl;
        if (e.id === links.entryId) opt.selected = true;
        entrySel.appendChild(opt);
      });

      // Mindmap link (deduplicated from boardSessionsByEntryId)
      var mmSel = document.getElementById('td-link-mm');
      mmSel.innerHTML = '<option value="">' + esc(t('td_noLink')) + '</option>';
      var _seenMm = {};
      Object.keys(boardSessionsByEntryId).forEach(function (eid) {
        (boardSessionsByEntryId[eid] || []).forEach(function (s) {
          if (!s.id || _seenMm[s.id]) return;
          _seenMm[s.id] = true;
          var nm = s.name || s.id || '';
          var opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = nm;
          if (s.id === links.mindmapPath) opt.selected = true;
          mmSel.appendChild(opt);
        });
      });

      // Grade sheet link
      var gsSel = document.getElementById('td-link-gs');
      gsSel.innerHTML = '<option value="">' + esc(t('td_noLink')) + '</option>';
      getPlannerClassIds().forEach(function (cid) {
        var opt = document.createElement('option');
        opt.value = cid; opt.textContent = plannerClassDisplayName(cid);
        if (cid === links.gsClassId) opt.selected = true;
        gsSel.appendChild(opt);
      });
    }

    function tdToggleReminderFields() {
      var type = document.getElementById('td-reminder-type').value;
      var dtEl = document.getElementById('td-reminder-dt');
      if (dtEl) dtEl.style.display = (type === 'fixed') ? '' : 'none';
    }

    function closeTodoModal() {
      document.getElementById('td-modal').style.display = 'none';
    }

    function saveTodo() {
      var text = (document.getElementById('td-text').value || '').trim();
      if (!text) { document.getElementById('td-text').focus(); return; }

      var remType = document.getElementById('td-reminder-type').value;
      var remAt = null;
      if (remType === 'fixed') {
        var v = document.getElementById('td-reminder-dt').value;
        if (v) remAt = v.length === 16 ? v + ':00' : v;
      }

      _tdModalFlushTexts();
      var cleanSubs = _tdModalSubtodos.filter(function (s) { return s.text.trim(); });
      var selectedClassIds = Array.from(_tdModalSelectedClassIds);

      var td = {
        id: _editingTodoId || ('td-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
        text: text,
        archivedAt: null,
        createdAt: Date.now(),
        dueDate: document.getElementById('td-due').value || null,
        reminderAt: remAt,
        classIds: selectedClassIds,
        classId: selectedClassIds[0] || null,
        links: {
          entryId: document.getElementById('td-link-entry').value || null,
          mindmapPath: document.getElementById('td-link-mm').value || null,
          gsClassId: document.getElementById('td-link-gs').value || null
        },
        subtodos: cleanSubs.length ? cleanSubs.map(function (s) {
          return { id: s.id || ('std-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5)), text: s.text.trim(), done: !!s.done };
        }) : undefined
      };

      if (_editingTodoId) {
        var idx = todos.findIndex(function (t) { return t.id === _editingTodoId; });
        if (idx !== -1) {
          td.createdAt = todos[idx].createdAt;
          td.archivedAt = todos[idx].archivedAt;
          todos[idx] = td;
        }
      } else {
        todos.push(td);
      }

      closeTodoModal();
      persistTodos();
      renderTodos();
      if (!_todoPanelOpen) toggleTodoPanel();

      if (typeof LinksService !== 'undefined' && typeof LinksService.addLink === 'function') {
        var todoUrn = LinksService.makeUrn('todo', td.id);
        var metaObj = { title: td.text, text: td.text, type: 'todo' };
        if (typeof LinksService.registerEntity === 'function') {
          LinksService.registerEntity(todoUrn, metaObj).catch(function () {});
        }
        if (typeof LinksService.removeLinksFor === 'function') {
          LinksService.removeLinksFor(todoUrn).then(async function () {
            if (td.links && td.links.entryId) {
              await LinksService.addLink(todoUrn, LinksService.makeUrn('slot', td.links.entryId), { relation: 'planner_entry' });
            }
            if (td.links && td.links.mindmapPath) {
              var mmTitle = String(td.links.mindmapPath).split('/').pop().replace(/\.[^.]+$/, '').replace(/_/g, ' ');
              await LinksService.addLink(todoUrn, LinksService.makeUrn('board', td.links.mindmapPath), { relation: 'mindmap', targetMeta: { title: mmTitle } });
            }
            if (td.links && td.links.gsClassId) {
              var gsName = (typeof plannerClassDisplayName === 'function' ? plannerClassDisplayName(td.links.gsClassId) : '') || td.links.gsClassId;
              await LinksService.addLink(todoUrn, LinksService.makeUrn('gradesheet', td.links.gsClassId), { relation: 'gradesheet', targetMeta: { title: gsName + ' Grade Sheet' } });
            }
            if (Array.isArray(td.classIds)) {
              for (var i = 0; i < td.classIds.length; i++) {
                var cid = td.classIds[i];
                if (cid) {
                  var cName = (typeof plannerClassDisplayName === 'function' ? plannerClassDisplayName(cid) : '') || cid;
                  await LinksService.addLink(todoUrn, LinksService.makeUrn('class', cid), { relation: 'class', targetMeta: { title: cName } });
                }
              }
            }
          }).catch(function (e) {
            console.warn('LinksService: Error synchronizing todo links:', e);
          });
        }
      }
    }

    function toggleSubtodoDone(parentId, subId) {
      var td = todos.find(function (t) { return t.id === parentId; });
      if (!td || !td.subtodos) return;
      var st = td.subtodos.find(function (s) { return s.id === subId; });
      if (!st) return;
      st.done = !st.done;
      persistTodos();
      renderTodos();
    }

    function deleteSubtodo(parentId, subId) {
      var td = todos.find(function (t) { return t.id === parentId; });
      if (!td || !td.subtodos) return;
      td.subtodos = td.subtodos.filter(function (s) { return s.id !== subId; });
      persistTodos();
      renderTodos();
    }

    function inlineEditSubtodo(parentId, subId) {
      var span = document.querySelector('.std-text[data-parent="' + parentId + '"][data-sub="' + subId + '"]');
      if (!span || span.tagName === 'INPUT') return;
      var orig = span.textContent;
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'td-subtodo-input';
      input.value = orig;
      span.parentNode.replaceChild(input, span);
      input.focus(); input.select();
      var committed = false;
      function commit() {
        if (committed) return; committed = true;
        var val = input.value.trim();
        if (val && val !== orig) {
          var td = todos.find(function (t) { return t.id === parentId; });
          if (td && td.subtodos) {
            var st = td.subtodos.find(function (s) { return s.id === subId; });
            if (st) { st.text = val; persistTodos(); }
          }
        }
        renderTodos();
      }
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { committed = true; renderTodos(); }
      });
    }

    function startAddSubtodo(parentId) {
      var item = document.querySelector('.td-item[data-tdid="' + parentId + '"]');
      if (!item) return;
      var body = item.querySelector('.td-body');
      if (!body || body.querySelector('.td-subtodo-input')) return;
      var container = body.querySelector('.td-subtodos');
      if (!container) {
        container = document.createElement('div');
        container.className = 'td-subtodos';
        container.setAttribute('data-parent', parentId);
        var addBtn = body.querySelector('.std-add-btn');
        body.insertBefore(container, addBtn || null);
      }
      var row = document.createElement('div');
      row.className = 'std-item';
      var check = document.createElement('div');
      check.className = 'std-check';
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'td-subtodo-input';
      input.setAttribute('placeholder', t('td_subtodoPlaceholder'));
      row.appendChild(check);
      row.appendChild(input);
      container.appendChild(row);
      input.focus();
      var committed = false;
      function commit() {
        if (committed) return; committed = true;
        var val = input.value.trim();
        if (val) {
          var td = todos.find(function (t) { return t.id === parentId; });
          if (td) {
            if (!td.subtodos) td.subtodos = [];
            td.subtodos.push({ id: 'std-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5), text: val, done: false });
            persistTodos();
          }
        }
        renderTodos();
      }
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { committed = true; renderTodos(); }
      });
    }

    function getAllClassIds() {
      var ids = Object.keys(cfg.classes || {});
      Object.keys(classGroupsMeta || {}).forEach(function (id) {
        if (ids.indexOf(id) === -1) ids.push(id);
      });
      return ids;
    }

    (function () {
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          var pop = document.getElementById('drag-copy-popover');
          if (pop && pop.style.display !== 'none') {
            if (typeof dragCopyCancel === 'function') dragCopyCancel();
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          }
        }
      });
      document.addEventListener('mousedown', function (e) {
        var pop = document.getElementById('drag-copy-popover');
        if (!pop || pop.style.display === 'none') return;
        if (!pop.contains(e.target)) {
          if (typeof dragCopyCancel === 'function') dragCopyCancel();
        }
      });
    })();
