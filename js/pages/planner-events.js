// Migrated static HTML event handlers from pages/planner.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-plev-1]');
      if (!el) return;
      var handler = function (event) { ShortcutsModal.open({title:t('skmTitle'),rows:[],noShortcutsText:t('skmNone')}) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-2]');
      if (!el) return;
      var handler = function (event) { startPlTutorial() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-3]');
      if (!el) return;
      var handler = function (event) { openSemModal(null) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-4]');
      if (!el) return;
      var handler = function (event) { openClassModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-5]');
      if (!el) return;
      var handler = function (event) { openFieldsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-6]');
      if (!el) return;
      var handler = function (event) { setShowPast(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-7]');
      if (!el) return;
      var handler = function (event) { setShowPast(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-8]');
      if (!el) return;
      var handler = function (event) { setShowOutsideTerm(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-9]');
      if (!el) return;
      var handler = function (event) { setShowOutsideTerm(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-10]');
      if (!el) return;
      var handler = function (event) { setViewMode('list') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-11]');
      if (!el) return;
      var handler = function (event) { setViewMode('day') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-12]');
      if (!el) return;
      var handler = function (event) { setViewMode('week') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-13]');
      if (!el) return;
      var handler = function (event) { setViewMode('month') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-14]');
      if (!el) return;
      var handler = function (event) { setViewMode('year') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-15]');
      if (!el) return;
      var handler = function (event) { goToToday() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-16]');
      if (!el) return;
      var handler = function (event) { toggleDispPopover() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-17]');
      if (!el) return;
      var handler = function (event) { setViewOpt('time',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-18]');
      if (!el) return;
      var handler = function (event) { setViewOpt('classPill',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-19]');
      if (!el) return;
      var handler = function (event) { setViewOpt('badges',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-20]');
      if (!el) return;
      var handler = function (event) { setViewOpt('topic',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-21]');
      if (!el) return;
      var handler = function (event) { setViewOpt('linkedBadges',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-22]');
      if (!el) return;
      var handler = function (event) { setViewOpt('details',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-23]');
      if (!el) return;
      var handler = function (event) { setViewOpt('custom',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-24]');
      if (!el) return;
      var handler = function (event) { setViewOpt('emptySlots',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-25]');
      if (!el) return;
      var handler = function (event) { setViewOpt('holidays',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-26]');
      if (!el) return;
      var handler = function (event) { setViewOpt('subscribed',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-27]');
      if (!el) return;
      var handler = function (event) { setViewOpt('todos',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-28]');
      if (!el) return;
      var handler = function (event) { setViewOpt('weekends',this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-29]');
      if (!el) return;
      var handler = function (event) { setSubFutureOnly(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-30]');
      if (!el) return;
      var handler = function (event) { setAutoEnd5Min(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-31]');
      if (!el) return;
      var handler = function (event) { openAddEntry(null,null,null) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-32]');
      if (!el) return;
      var handler = function (event) { openExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-33]');
      if (!el) return;
      var handler = function (event) { openIcsImportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-34]');
      if (!el) return;
      var handler = function (event) { openSubscriptionsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-35]');
      if (!el) return;
      var handler = function (event) { toggleMultiSelectMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-36]');
      if (!el) return;
      var handler = function (event) { openBatchActionModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-37]');
      if (!el) return;
      var handler = function (event) { clearClassFilter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-38]');
      if (!el) return;
      var handler = function (event) { toggleUnassignedFilter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-39]');
      if (!el) return;
      var handler = function (event) { onSearchInput(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-40]');
      if (!el) return;
      var handler = function (event) { toggleToolbarAutoCollapse() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-41]');
      if (!el) return;
      var handler = function (event) { navigateView(-1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-42]');
      if (!el) return;
      var handler = function (event) { goToToday() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-43]');
      if (!el) return;
      var handler = function (event) { navigateView(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-44]');
      if (!el) return;
      var handler = function (event) { toggleTodoPanel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-45]');
      if (!el) return;
      var handler = function (event) { openAddTodo() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-46]');
      if (!el) return;
      var handler = function (event) { toggleTodoPanel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-47]');
      if (!el) return;
      var handler = function (event) { renderTodos() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-48]');
      if (!el) return;
      var handler = function (event) { startTodoModalTour() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-49]');
      if (!el) return;
      var handler = function (event) { closeTodoModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-50]');
      if (!el) return;
      var handler = function (event) { tdToggleReminderFields() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-51]');
      if (!el) return;
      var handler = function (event) { _tdSelectAllClasses() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-52]');
      if (!el) return;
      var handler = function (event) { _tdClearAllClasses() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-53]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'){event.preventDefault();_tdModalAddSub()} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-54]');
      if (!el) return;
      var handler = function (event) { _tdModalAddSub() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-55]');
      if (!el) return;
      var handler = function (event) { closeTodoModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-56]');
      if (!el) return;
      var handler = function (event) { saveTodo() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-57]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeModal('batchActionModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-58]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-59]');
      if (!el) return;
      var handler = function (event) { closeModal('batchActionModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-60]');
      if (!el) return;
      var handler = function (event) { onBatchActionSelectChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-61]');
      if (!el) return;
      var handler = function (event) { closeModal('batchActionModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-62]');
      if (!el) return;
      var handler = function (event) { commitBatchAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-63]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeModal('semModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-64]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-65]');
      if (!el) return;
      var handler = function (event) { closeModal('semModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-66]');
      if (!el) return;
      var handler = function (event) { fillDatesFromGroupEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-67]');
      if (!el) return;
      var handler = function (event) { addHolRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.getElementById('add-noclass-range-btn');
      if (!el) return;
      el.addEventListener('click', function () { addNoClassRow(); });
    })();
    (function () {
      var list = document.getElementById('noclass-list');
      if (!list) return;
      list.addEventListener('click', function (e) {
        var chip = e.target.closest('.pl-pick-chip');
        if (!chip) return;
        var row = chip.closest('.noclass-cls-row');
        if (!row) return;
        var allChip = row.querySelector('[data-nc-all="1"]');
        var clsChips = Array.from(row.querySelectorAll('[data-nc-cid]'));
        if (chip.getAttribute('data-nc-all') === '1') {
          if (chip.classList.contains('selected') && clsChips.length) {
            // Clicking "All classes" while already active: select all individual chips so user can uncheck specific ones
            chip.classList.remove('selected');
            clsChips.forEach(function (c) { c.classList.add('selected'); });
          } else {
            clsChips.forEach(function (c) { c.classList.remove('selected'); });
            chip.classList.add('selected');
          }
        } else {
          chip.classList.toggle('selected');
          var anySelected = clsChips.some(function (c) { return c.classList.contains('selected'); });
          if (allChip) allChip.classList.toggle('selected', !anySelected);
        }
      });
    })();
    (function () {
      var el = document.querySelector('[data-plev-68]');
      if (!el) return;
      var handler = function (event) { deleteActiveSem() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-69]');
      if (!el) return;
      var handler = function (event) { closeModal('semModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-70]');
      if (!el) return;
      var handler = function (event) { saveSemModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-71]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeModal('classModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-72]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-73]');
      if (!el) return;
      var handler = function (event) { closeModal('classModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-74]');
      if (!el) return;
      var handler = function (event) { addPlannerYearChip() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-75]');
      if (!el) return;
      var handler = function (event) { onPlannerTermsPerYearChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-76]');
      if (!el) return;
      var handler = function (event) { addSchedRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-77]');
      if (!el) return;
      var handler = function (event) { addObjRow('') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-78]');
      if (!el) return;
      var handler = function (event) { deleteManualClass() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-79]');
      if (!el) return;
      var handler = function (event) { closeModal('classModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-80]');
      if (!el) return;
      var handler = function (event) { saveClassPanel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-81]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeModal('entryModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-82]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-83]');
      if (!el) return;
      var handler = function (event) { closeModal('entryModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-84]');
      if (!el) return;
      var handler = function (event) { onDupSlotSelectChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-85]');
      if (!el) return;
      var handler = function (event) { onEntryRecurChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-86]');
      if (!el) return;
      var handler = function (event) { onEntryRecurEndChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-87]');
      if (!el) return;
      var handler = function (event) { onEntryRecurEndChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-88]');
      if (!el) return;
      var handler = function (event) { onEntryTypeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-89]');
      if (!el) return;
      var handler = function (event) { onObjSelChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-90]');
      if (!el) return;
      var handler = function (event) { deleteCurrentEntry() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-91]');
      if (!el) return;
      var handler = function (event) { plannerOpenLinksModalFromEntryModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-92]');
      if (!el) return;
      var handler = function (event) { plannerOpenGradeSheetModalAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-93]');
      if (!el) return;
      var handler = function (event) { plannerOpenClassManagementModalAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-94]');
      if (!el) return;
      var handler = function (event) { plannerLessonPlanEntryModalAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-95]');
      if (!el) return;
      var handler = function (event) { plannerBoardEntryAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-96]');
      if (!el) return;
      var handler = function (event) { plannerBoardLinkPickerModalAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-97]');
      if (!el) return;
      var handler = function (event) { duplicateCurrentEntry() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-98]');
      if (!el) return;
      var handler = function (event) { closeModal('entryModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-99]');
      if (!el) return;
      var handler = function (event) { commitEntry() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-100]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-101]');
      if (!el) return;
      var handler = function (event) { plannerOpenLinksModalAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-102]');
      if (!el) return;
      var handler = function (event) { plannerOpenLinkedDocAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-103]');
      if (!el) return;
      var handler = function (event) { plannerOpenLinkedFileAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-104]');
      if (!el) return;
      var handler = function (event) { plannerOpenGradeSheetAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-105]');
      if (!el) return;
      var handler = function (event) { plannerOpenClassManagementAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-106]');
      if (!el) return;
      var handler = function (event) { plannerLessonPlanEntryAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-107]');
      if (!el) return;
      var handler = function (event) { plannerLessonPlanLinkPickerAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-108]');
      if (!el) return;
      var handler = function (event) { plannerLessonPlanUnlinkAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-109]');
      if (!el) return;
      var handler = function (event) { plannerLessonPlanDeleteAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-110]');
      if (!el) return;
      var handler = function (event) { plannerBoardEntryAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-111]');
      if (!el) return;
      var handler = function (event) { plannerBoardLinkPickerAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-112]');
      if (!el) return;
      var handler = function (event) { plannerBoardUnlinkAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-113]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeModal('boardLinkModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-114]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-115]');
      if (!el) return;
      var handler = function (event) { closeModal('boardLinkModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-116]');
      if (!el) return;
      var handler = function (event) { onBoardLinkFileSelectChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-117]');
      if (!el) return;
      var handler = function (event) { boardLinkCreateNewAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-118]');
      if (!el) return;
      var handler = function (event) { boardLinkUnlinkAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-119]');
      if (!el) return;
      var handler = function (event) { closeModal('boardLinkModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-120]');
      if (!el) return;
      var handler = function (event) { boardLinkConfirmAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-121]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeModal('lpLinkModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-122]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-123]');
      if (!el) return;
      var handler = function (event) { closeModal('lpLinkModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-124]');
      if (!el) return;
      var handler = function (event) { lpLinkCreateNewAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-125]');
      if (!el) return;
      var handler = function (event) { lpLinkUnlinkAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-126]');
      if (!el) return;
      var handler = function (event) { lpLinkDeleteAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-127]');
      if (!el) return;
      var handler = function (event) { closeModal('lpLinkModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-128]');
      if (!el) return;
      var handler = function (event) { lpLinkConfirmAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-129]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)resolveConfirm(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-130]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-131]');
      if (!el) return;
      var handler = function (event) { resolveConfirm(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-132]');
      if (!el) return;
      var handler = function (event) { resolveConfirm(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-133]');
      if (!el) return;
      var handler = function (event) { cancelRecurScope() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-134]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-135]');
      if (!el) return;
      var handler = function (event) { applyRecurScope('this') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-136]');
      if (!el) return;
      var handler = function (event) { applyRecurScope('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-137]');
      if (!el) return;
      var handler = function (event) { applyRecurScope('future') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-138]');
      if (!el) return;
      var handler = function (event) { cancelRecurScope() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-139]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeModal('exportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-140]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-141]');
      if (!el) return;
      var handler = function (event) { closeModal('exportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-142]');
      if (!el) return;
      var handler = function (event) { resetExportStyles() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.getElementById('exp-date-clear');
      if (!el) return;
      el.addEventListener('click', function () {
        var fromEl = document.getElementById('exp-date-from');
        var toEl = document.getElementById('exp-date-to');
        if (fromEl) fromEl.value = '';
        if (toEl) toEl.value = '';
      });
    })();
    (function () {
      var el = document.querySelector('[data-plev-143]');
      if (!el) return;
      var handler = function (event) { doExportIcs() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-144]');
      if (!el) return;
      var handler = function (event) { doExportHtml() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-145]');
      if (!el) return;
      var handler = function (event) { doExportCsv() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-146]');
      if (!el) return;
      var handler = function (event) { doExportPdf() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-147]');
      if (!el) return;
      var handler = function (event) { doExportDocx() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-148]');
      if (!el) return;
      var handler = function (event) { closeModal('exportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-149]');
      if (!el) return;
      var handler = function (event) { openPlannerPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-150]');
      if (!el) return;
      var handler = function (event) { plOpenPreviewInExternalBrowser() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-151]');
      if (!el) return;
      var handler = function (event) { plPrintPreviewIframe() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-152]');
      if (!el) return;
      var handler = function (event) { closePlannerPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-153]');
      if (!el) return;
      var handler = function (event) { closePlannerPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-154]');
      if (!el) return;
      var handler = function (event) { doExportHtmlFromPreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-155]');
      if (!el) return;
      var handler = function (event) { doExportPdfFromPreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-156]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closePdfExportModal(null) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-157]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-158]');
      if (!el) return;
      var handler = function (event) { closePdfExportModal(null) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-159]');
      if (!el) return;
      var handler = function (event) { closePdfExportModal('to-print') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-160]');
      if (!el) return;
      var handler = function (event) { closePdfExportModal('picker') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-161]');
      if (!el) return;
      var handler = function (event) { closePdfExportModal(null) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-162]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeModal('icsImportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-163]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-164]');
      if (!el) return;
      var handler = function (event) { closeModal('icsImportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-165]');
      if (!el) return;
      var handler = function (event) { onIcsClassChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-166]');
      if (!el) return;
      var handler = function (event) { renderIcsPreview() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-167]');
      if (!el) return;
      var handler = function (event) { onIcsFileChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-168]');
      if (!el) return;
      var handler = function (event) { icsSelectAll(true,'in') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-169]');
      if (!el) return;
      var handler = function (event) { icsSelectAll(false,'in') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-170]');
      if (!el) return;
      var handler = function (event) { icsSelectAll(true,'out') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-171]');
      if (!el) return;
      var handler = function (event) { icsSelectAll(false,'out') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-172]');
      if (!el) return;
      var handler = function (event) { closeModal('icsImportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-173]');
      if (!el) return;
      var handler = function (event) { doImportIcs() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-174]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeModal('fieldsModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-175]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-176]');
      if (!el) return;
      var handler = function (event) { closeModal('fieldsModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-177]');
      if (!el) return;
      var handler = function (event) { addCustomFieldRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-178]');
      if (!el) return;
      var handler = function (event) { addCustomTypeRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-179]');
      if (!el) return;
      var handler = function (event) { closeModal('fieldsModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-180]');
      if (!el) return;
      var handler = function (event) { saveCustomFields() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-181]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeModal('subscriptionsModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-182]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-183]');
      if (!el) return;
      var handler = function (event) { closeModal('subscriptionsModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-184]');
      if (!el) return;
      var handler = function (event) { resetSubscriptionForm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-185]');
      if (!el) return;
      var handler = function (event) { saveSubscriptionForm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-186]');
      if (!el) return;
      var handler = function (event) { syncAllSubscriptions(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-187]');
      if (!el) return;
      var handler = function (event) { closeModal('subscriptionsModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-188]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeModal('subscribedEventModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-189]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-190]');
      if (!el) return;
      var handler = function (event) { closeModal('subscribedEventModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-191]');
      if (!el) return;
      var handler = function (event) { closeModal('subscribedEventModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-192]');
      if (!el) return;
      var handler = function (event) { convertCurrentSubscribedToLocal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-193]');
      if (!el) return;
      var handler = function (event) { dragCopyCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-plev-194]');
      if (!el) return;
      var handler = function (event) { dragCopyConfirm() };
      el.addEventListener('click', handler);
    })();

    // Delegated remove-row handler (capture phase so modal-box stopPropagation() never blocks it)
    document.addEventListener('click', function (e) {
      var rmBtn = e.target.closest('button[data-pl-rm]');
      if (!rmBtn) return;
      var sel = rmBtn.getAttribute('data-pl-rm');
      var parent = rmBtn.closest(sel);
      if (parent) parent.remove();
    }, true);

    // Delegated handlers for dynamically rendered planner UI
    document.addEventListener('click', function (e) {

      var el = e.target.closest('[data-pl-action]');
      if (!el) return;
      var act = el.getAttribute('data-pl-action');

      // Respect inner stopPropagation containers for row-level clicks
      if ((act === 'row-click' || act === 'month-add') && e.target.closest('[data-pl-stop]')) return;

      var entryId = el.getAttribute('data-pl-entry') || el.getAttribute('data-entry-id') || '';
      var classId = el.getAttribute('data-pl-class') || el.getAttribute('data-classid') || '';
      var date = el.getAttribute('data-pl-date') || el.getAttribute('data-date') || '';
      var time = el.getAttribute('data-pl-time') || el.getAttribute('data-time') || '';
      var timeEnd = el.getAttribute('data-pl-timeend') || el.getAttribute('data-timeend') || '';
      var tdId = el.getAttribute('data-pl-tdid') || el.getAttribute('data-parent') || '';
      var subId = el.getAttribute('data-pl-subid') || el.getAttribute('data-sub') || '';
      var subFeedId = el.getAttribute('data-pl-sub') || '';

      switch (act) {
        case 'open-entry-links': e.stopPropagation(); openPlannerEntryLinks(entryId, e); break;
        case 'toggle-week': togglePlannerWeek(el, e); break;
        case 'row-click': rowClick(e, classId, date, time, timeEnd, entryId); break;
        case 'toggle-select': e.stopPropagation(); toggleEntrySelection(entryId); break;
        case 'open-gs': e.stopPropagation(); openLinkedGradeSheet(entryId); break;
        case 'open-lp':
          e.stopPropagation();
          openLinkedLessonPlan(el.getAttribute('data-pl-plan') || '', classId, date, entryId, el.getAttribute('data-pl-topic') || '');
          break;
        case 'open-board': e.stopPropagation(); openLinkedBoard(el.getAttribute('data-pl-linkid') || ''); break;
        case 'open-sub-event': openSubscribedEventModal(entryId); break;
        case 'toggle-pin': toggleEntryPin(e, entryId, classId, date, time, timeEnd); break;
        case 'edit-entry': openEditEntry(entryId); break;
        case 'add-entry': openAddEntry(classId, date, time, timeEnd); break;
        case 'edit-todo': e.stopPropagation(); openEditTodo(tdId); break;
        case 'pick-color': pickColor(el.getAttribute('data-pl-color') || ''); break;
        case 'toggle-exp-group':
          if (el.nextElementSibling) {
            el.nextElementSibling.style.display = (el.nextElementSibling.style.display === 'none' ? 'flex' : 'none');
          }
          break;
        case 'toggle-exp-style': toggleExportStyle(el.getAttribute('data-pl-key') || '', el.getAttribute('data-pl-prop') || ''); break;
        case 'reset-exp-style': resetExportStyleItem(el.getAttribute('data-pl-key') || ''); break;
        case 'at-cell-click': e.stopPropagation(); atCellClick(e, entryId); break;
        case 'at-cell-empty': e.stopPropagation(); atCellEmptyClick(e, classId, date, time, timeEnd); break;
        case 'drill-day': e.stopPropagation(); drillDownToView('day', date); break;
        case 'drill-month': drillDownToView('month', date); break;
        case 'month-add': openAddEntry('', date, '', ''); break;
        case 'sub-sync': syncSubscription(subFeedId); break;
        case 'sub-edit': editSubscription(subFeedId); break;
        case 'sub-toggle': toggleSubscription(subFeedId); break;
        case 'sub-delete': deleteSubscription(subFeedId); break;
        case 'toggle-subtodo': toggleSubtodoDone(tdId, subId); break;
        case 'edit-subtodo': inlineEditSubtodo(tdId, subId); break;
        case 'del-subtodo': deleteSubtodo(tdId, subId); break;
        case 'toggle-td-pin': toggleTodoPin(e, tdId); break;
        case 'toggle-td': toggleTodoDone(tdId); break;
        case 'add-subtodo': startAddSubtodo(tdId); break;
        case 'td-open-entry': tdOpenEntry(entryId); break;
        case 'del-todo': deleteTodo(tdId); break;
      }
    });

    document.addEventListener('input', function (e) {
      var el = e.target.closest('[data-pl-input]');
      if (!el) return;
      if (el.getAttribute('data-pl-input') === 'pick-color') pickColor(el.value);
    });

    document.addEventListener('change', function (e) {
      var el = e.target.closest('[data-pl-change]');
      if (!el) return;
      var act = el.getAttribute('data-pl-change');
      var key = el.getAttribute('data-pl-key') || '';
      if (act === 'exp-style-color') setExportStyle(key, 'color', el.value);
      else if (act === 'exp-style-weight') setExportStyle(key, 'weight', el.value);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
