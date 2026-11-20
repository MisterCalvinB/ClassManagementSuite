// Migrated static HTML event handlers from pages/group-editor.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-geev-1]');
      if (!el) return;
      var handler = function (event) { ShortcutsModal.open({title:t('skmTitle'),rows:[],noShortcutsText:t('skmNone')}) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-2]');
      if (!el) return;
      var handler = function (event) { startGeTutorial() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-3]');
      if (!el) return;
      var handler = function (event) { goBack() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-4]');
      if (!el) return;
      var handler = function (event) { openAllStudentsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-5]');
      if (!el) return;
      var handler = function (event) { this.remove() };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-geev-6]');
      if (!el) return;
      var handler = function (event) { checkAndMergeDuplicateStudents() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-7]');
      if (!el) return;
      var handler = function (event) { this.remove() };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-geev-8]');
      if (!el) return;
      var handler = function (event) { if(window.Desktop && Desktop.isElectron()) Desktop.openTool('import-tool.html'); else window.open('../pages/import-tool.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-9]');
      if (!el) return;
      var handler = function (event) { exportCsv() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-10]');
      if (!el) return;
      var handler = function (event) { handleCsvImport(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var map = {
        '[data-geev-modal-1]': function (e) { closeGeEditModal(e); },
        '[data-geev-modal-3]': function () { closeGeEditModal(); },
        '[data-geev-modal-4]': function () { closeGeEditModal(); },
        '[data-geev-modal-5]': function () { applyGeEditModal(); },
        '[data-geev-modal-6]': function (e) { closeGeStudentsModal(e); },
        '[data-geev-modal-8]': function () { closeGeStudentsModal(); },
        '[data-geev-modal-9]': function () { closeGeStudentsModal(); },
        '[data-geev-modal-10]': function () { openAddGroupModal(); },
        '[data-geev-modal-11]': function (e) { closeAddGroupModal(e); },
        '[data-geev-modal-13]': function () { closeAddGroupModal(); },
        '[data-geev-modal-14]': function () { closeAddGroupModal(); },
        '[data-geev-modal-15]': function () { openActiveContextModal(); },
        '[data-geev-modal-16]': function (e) { closeActiveContextModal(e); },
        '[data-geev-modal-18]': function () { closeActiveContextModal(); },
        '[data-geev-modal-19]': function () { closeActiveContextModal(); }
      };
      Object.keys(map).forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) el.addEventListener('click', map[sel]);
      });
      ['[data-geev-modal-2]', '[data-geev-modal-7]', '[data-geev-modal-12]', '[data-geev-modal-17]'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) el.addEventListener('click', function (e) { e.stopPropagation(); });
      });
    })();
    (function () {
      var el = document.querySelector('[data-geev-11]');
      if (!el) return;
      var handler = function (event) { onTermsPerYearChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-12]');
      if (!el) return;
      var handler = function (event) { syncFromPlanner() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-13]');
      if (!el) return;
      var handler = function (event) { syncFromPlanner() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-14]');
      if (!el) return;
      var handler = function (event) { openPlannerTermForm(null) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-15]');
      if (!el) return;
      var handler = function (event) { addPlannerHolRow('','','') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-16]');
      if (!el) return;
      var handler = function (event) { savePlannerTerm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-17]');
      if (!el) return;
      var handler = function (event) { this.style.background='#1e4f8a' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-18]');
      if (!el) return;
      var handler = function (event) { this.style.background='#2563a8' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-19]');
      if (!el) return;
      var handler = function (event) { closePlannerTermForm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-20]');
      if (!el) return;
      var handler = function (event) { deletePlannerTerm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-21]');
      if (!el) return;
      var handler = function (event) { this.style.background='#c33';this.style.color='#fff' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-22]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#c33' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-23]');
      if (!el) return;
      var handler = function (event) { eosArchive() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-24]');
      if (!el) return;
      var handler = function (event) { eosDismiss() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-25]');
      if (!el) return;
      var handler = function (event) { autoResizeStudents(this) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-26]');
      if (!el) return;
      var handler = function (event) { addNewGroupRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-27]');
      if (!el) return;
      var handler = function (event) { saveGroupsToFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-28]');
      if (!el) return;
      var handler = function (event) { exportPickerToggleAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-29]');
      if (!el) return;
      var handler = function (event) { closeExportPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-30]');
      if (!el) return;
      var handler = function (event) { this.style.background='#000';this.style.color='#fff' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-31]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#000' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-32]');
      if (!el) return;
      var handler = function (event) { confirmExportCsv() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-33]');
      if (!el) return;
      var handler = function (event) { this.style.background='#333' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-34]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-35]');
      if (!el) return;
      var handler = function (event) { closePlannerPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-36]');
      if (!el) return;
      var handler = function (event) { this.style.background='#000';this.style.color='#fff' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-37]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#000' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-38]');
      if (!el) return;
      var handler = function (event) { cancelDeleteWarn() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-39]');
      if (!el) return;
      var handler = function (event) { this.style.background='#000';this.style.color='#fff' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-40]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#000' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-41]');
      if (!el) return;
      var handler = function (event) { archiveDeleteWarn() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-42]');
      if (!el) return;
      var handler = function (event) { this.style.background='#e67700';this.style.color='#fff' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-43]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#e67700' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-44]');
      if (!el) return;
      var handler = function (event) { confirmDeleteWarn() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-45]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#c0392b' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-46]');
      if (!el) return;
      var handler = function (event) { this.style.background='#c0392b';this.style.color='#fff' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-47]');
      if (!el) return;
      var handler = function (event) { cancelConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-48]');
      if (!el) return;
      var handler = function (event) { this.style.background='#000';this.style.color='#fff' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-49]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#000' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-50]');
      if (!el) return;
      var handler = function (event) { okConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-51]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#111' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-52]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111';this.style.color='#fff' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-53]');
      if (!el) return;
      var handler = function (event) { geMatchSetAll('reuse') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-54]');
      if (!el) return;
      var handler = function (event) { geMatchSetAll('new') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-55]');
      if (!el) return;
      var handler = function (event) { geMatchSetAll('ignore') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-56]');
      if (!el) return;
      var handler = function (event) { window._geMatchCancelCb && window._geMatchCancelCb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-57]');
      if (!el) return;
      var handler = function (event) { window._geMatchConfirmCb && window._geMatchConfirmCb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-58]');
      if (!el) return;
      var handler = function (event) { geMergeSetAll('primary') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-59]');
      if (!el) return;
      var handler = function (event) { geMergeSetAll('ignore') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-60]');
      if (!el) return;
      var handler = function (event) { closeMergeModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-61]');
      if (!el) return;
      var handler = function (event) { closeMergeModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-62]');
      if (!el) return;
      var handler = function (event) { applyStudentMerges() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-63]');
      if (!el) return;
      var handler = function (event) { closeAllStudentsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-64]');
      if (!el) return;
      var handler = function (event) { renderAllStudentsTable() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-65]');
      if (!el) return;
      var handler = function (event) { setAllStudentsFilter('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-66]');
      if (!el) return;
      var handler = function (event) { setAllStudentsFilter('unassigned') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-67]');
      if (!el) return;
      var handler = function (event) { setAllStudentsFilter('groups') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-68]');
      if (!el) return;
      var handler = function (event) { archiveAllUnassigned() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-69]');
      if (!el) return;
      var handler = function (event) { deleteAllUnassigned() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-70]');
      if (!el) return;
      var handler = function (event) { toggleAllStudentsSelection(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-71]');
      if (!el) return;
      var handler = function (event) { mergeSelectedStudents() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-72]');
      if (!el) return;
      var handler = function (event) { archiveSelectedStudents() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-73]');
      if (!el) return;
      var handler = function (event) { deleteSelectedStudents() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-geev-74]');
      if (!el) return;
      var handler = function (event) { closeAllStudentsModal() };
      el.addEventListener('click', handler);
    })();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
