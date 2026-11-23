// Migrated static HTML event handlers from pages/schedule-maker.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-smev-1]');
      if (!el) return;
      var handler = function (event) {
        ShortcutsModal.open({
          title: t('skmTitle'),
          rows: [
            { section: t('smTitle') || 'Schedule Maker' },
            { keys: ['Ctrl', 'S'], alt: ['Cmd', 'S'], desc: t('smShortcutSaveDesc') || 'Save schedule' },
            { keys: ['Ctrl', 'Shift', 'S'], alt: ['Cmd', 'Shift', 'S'], desc: t('smShortcutSaveAsDesc') || 'Save schedule as…' },
            { keys: ['Ctrl', 'O'], alt: ['Cmd', 'O'], desc: t('smShortcutOpenDesc') || 'Open saved schedule' },
            { keys: ['Ctrl', 'N'], alt: ['Cmd', 'N'], desc: t('smShortcutNewDesc') || 'New schedule' },
            { keys: ['Esc'], desc: t('smShortcutEscDesc') || 'Close open modal' }
          ],
          noShortcutsText: t('skmNone')
        });
      };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-2]');
      if (!el) return;
      var handler = function (event) { startSmTutorial() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-3]');
      if (!el) return;
      var handler = function (event) { goBack() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var map = {
        '[data-smev-nav-new]': function () { newSchedule(); },
        '[data-smev-nav-1]': function () { openLoadModal(); },
        '[data-smev-nav-2]': function () { saveSchedule(); },
        '[data-smev-nav-saveas]': function () { saveScheduleAs(); },
        '[data-smev-nav-dup]': function () { duplicateSchedule(); },
        '[data-smev-nav-3]': function () { smTogglePin(); },
        '[data-smev-nav-4]': function () { goBack(); },
        '[data-smev-nav-5]': function () { applyConfig(); },
        '[data-smev-nav-6]': function () { addBreak(); },
        '[data-smev-nav-7]': function () { openGroupModal('manual'); },
        '[data-smev-nav-8]': function () { openGroupModal('auto'); },
        '[data-smev-nav-9]': function () { handleExportClick('pdf'); },
        '[data-smev-nav-10]': function () { handleExportClick('csv'); },
        '[data-smev-nav-11]': function () { handleExportClick('xlsx'); },
        '[data-smev-nav-12]': function () { handleExportClick('ods'); },
        '[data-smev-nav-13]': function () { handleExportClick('docx'); },
        '[data-smev-nav-14]': function () { handleExportClick('html'); }
      };
      Object.keys(map).forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) el.addEventListener('click', map[sel]);
      });
    })();
    (function () {
      var el = document.querySelector('[data-smev-4]');
      if (!el) return;
      var handler = function (event) { smOnGroupChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-5]');
      if (!el) return;
      var handler = function (event) { applyConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-6]');
      if (!el) return;
      var handler = function (event) { addBreak() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-7]');
      if (!el) return;
      var handler = function (event) { openGroupModal('manual') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-8]');
      if (!el) return;
      var handler = function (event) { openGroupModal('auto') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-9]');
      if (!el) return;
      var handler = function (event) { toggleExportMenu(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-10]');
      if (!el) return;
      var handler = function (event) { handleExportClick('pdf') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-11]');
      if (!el) return;
      var handler = function (event) { handleExportClick('csv') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-12]');
      if (!el) return;
      var handler = function (event) { handleExportClick('xlsx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-13]');
      if (!el) return;
      var handler = function (event) { handleExportClick('ods') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-14]');
      if (!el) return;
      var handler = function (event) { handleExportClick('docx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-15]');
      if (!el) return;
      var handler = function (event) { handleExportClick('html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-16]');
      if (!el) return;
      var handler = function (event) { saveSchedule() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-17]');
      if (!el) return;
      var handler = function (event) { openLoadModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-18]');
      if (!el) return;
      var handler = function (event) { smTogglePin() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-19]');
      if (!el) return;
      var handler = function (event) { closeLoadModal(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-20]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-21]');
      if (!el) return;
      var handler = function (event) { closeLoadModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-22]');
      if (!el) return;
      var handler = function (event) { closeGroupModal(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-23]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-24]');
      if (!el) return;
      var handler = function (event) { smSwitchGroupTab('manual') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-25]');
      if (!el) return;
      var handler = function (event) { smSwitchGroupTab('auto') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-26]');
      if (!el) return;
      var handler = function (event) { closeGroupModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-27]');
      if (!el) return;
      var handler = function (event) { confirmCreateGroup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-28]');
      if (!el) return;
      var handler = function (event) { smUpdateAutoPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-29]');
      if (!el) return;
      var handler = function (event) { smOnAutoModeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-30]');
      if (!el) return;
      var handler = function (event) { smUpdateAutoPreview() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-31]');
      if (!el) return;
      var handler = function (event) { smOnAutoModeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-32]');
      if (!el) return;
      var handler = function (event) { smUpdateAutoPreview() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-33]');
      if (!el) return;
      var handler = function (event) { smUpdateAutoPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-34]');
      if (!el) return;
      var handler = function (event) { smUpdateAutoPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-35]');
      if (!el) return;
      var handler = function (event) { smUpdateAutoPreview() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-36]');
      if (!el) return;
      var handler = function (event) { closeGroupModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-37]');
      if (!el) return;
      var handler = function (event) { confirmAutoGenerateGroups() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-38]');
      if (!el) return;
      var handler = function (event) { closeExportModal(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-39]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-40]');
      if (!el) return;
      var handler = function (event) { applySmExportPreset('examiner') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-41]');
      if (!el) return;
      var handler = function (event) { applySmExportPreset('student') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-42]');
      if (!el) return;
      var handler = function (event) { applySmExportPreset('custom') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-43]');
      if (!el) return;
      var handler = function (event) { onSmExportOptionChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-44]');
      if (!el) return;
      var handler = function (event) { onSmExportOptionChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-45]');
      if (!el) return;
      var handler = function (event) { onSmExportOptionChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-46]');
      if (!el) return;
      var handler = function (event) { onSmExportOptionChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-47]');
      if (!el) return;
      var handler = function (event) { onSmExportOptionChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-48]');
      if (!el) return;
      var handler = function (event) { onSmExportOptionChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-49]');
      if (!el) return;
      var handler = function (event) { onSmExportOptionChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-50]');
      if (!el) return;
      var handler = function (event) { onSmExportOptionChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-51]');
      if (!el) return;
      var handler = function (event) { closeExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-52]');
      if (!el) return;
      var handler = function (event) { openSmPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-53]');
      if (!el) return;
      var handler = function (event) { confirmSmExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-54]');
      if (!el) return;
      var handler = function (event) { smOpenPreviewInExternalBrowser() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-55]');
      if (!el) return;
      var handler = function (event) { smPrintPreviewIframe() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-56]');
      if (!el) return;
      var handler = function (event) { closeSmPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-57]');
      if (!el) return;
      var handler = function (event) { closeSmPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-58]');
      if (!el) return;
      var handler = function (event) { confirmSmExportFromPreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-smev-multi-toggle]');
      if (el) el.addEventListener('change', function () { toggleMultiMode(this.checked); });
    })();
    (function () {
      var el = document.querySelector('[data-smev-add-session]');
      if (el) el.addEventListener('click', function () { addMultiSession(); });
    })();
    (function () {
      var el = document.querySelector('[data-smev-quick-sort]');
      if (el) el.addEventListener('change', function () { quickSortOrder(this.value); });
      var rBtn = document.querySelector('[data-smev-reshuffle]');
      if (rBtn) rBtn.addEventListener('click', function () { reshuffleWithinGroups(); });
      var tBtn = document.querySelector('[data-smev-toggle-table]');
      if (tBtn) tBtn.addEventListener('click', function () {
        var panel = document.querySelector('.sm-schedule-panel');
        if (panel) panel.classList.toggle('collapsed');
      });
    })();
    (function () {
      var el = document.querySelector('[data-smev-split-even]');
      if (el) el.addEventListener('click', function () { splitAllEvenly(); });
    })();
    (function () {
      var elLast = document.querySelector('[data-smev-auto-last]');
      if (elLast) elLast.addEventListener('change', function () { smUpdateAutoPreview(); });
      var elCust = document.querySelector('[data-smev-auto-custom]');
      if (elCust) elCust.addEventListener('change', function () { smUpdateAutoPreview(); });
    })();
    (function () {
      var pBtn = document.querySelector('[data-smev-link-planner]');
      if (pBtn) pBtn.addEventListener('click', function () { if (window.ScheduleMakerLinks) ScheduleMakerLinks.openPlannerLinkModal(); });
      var pBadge = document.querySelector('[data-smev-open-planner]');
      if (pBadge) pBadge.addEventListener('click', function () { if (window.ScheduleMakerLinks) ScheduleMakerLinks.openInPlanner(window.smLinkedPlannerEntries); });
      var gBtn = document.querySelector('[data-smev-link-gs]');
      if (gBtn) gBtn.addEventListener('click', function () { if (window.ScheduleMakerLinks) ScheduleMakerLinks.openGradeSheetLinkModal(); });
      var gBadge = document.querySelector('[data-smev-open-gs]');
      if (gBadge) gBadge.addEventListener('click', function () { if (window.ScheduleMakerLinks) ScheduleMakerLinks.openInGradeSheet(window.smLinkedGradeTest); });
      var omBtn = document.querySelector('[data-smev-open-om]');
      if (omBtn) omBtn.addEventListener('click', function () { if (window.ScheduleMakerLinks) ScheduleMakerLinks.openInOralMarking(); });
      var ov = document.querySelector('[data-smev-link-overlay]');
      if (ov) ov.addEventListener('click', function (e) { if (e.target === ov && window.ScheduleMakerLinks) ScheduleMakerLinks.closeModal(); });
      var box = document.querySelector('[data-smev-link-box]');
      if (box) box.addEventListener('click', function (e) { e.stopPropagation(); });
      var cl = document.querySelector('[data-smev-link-close]');
      if (cl) cl.addEventListener('click', function () { if (window.ScheduleMakerLinks) ScheduleMakerLinks.closeModal(); });
    })();

    if (!window._smShortcutsBound) {
      window._smShortcutsBound = true;
      document.addEventListener('keydown', function (e) {
        var isMod = e.ctrlKey || e.metaKey;
        var key = (e.key || '').toLowerCase();
        if (isMod && !e.altKey && key === 's') {
          e.preventDefault();
          if (e.shiftKey) {
            if (typeof saveScheduleAs === 'function') saveScheduleAs();
          } else {
            if (typeof saveSchedule === 'function') saveSchedule();
          }
          return;
        }
        if (isMod && !e.altKey && !e.shiftKey && key === 'o') {
          e.preventDefault();
          if (typeof openLoadModal === 'function') openLoadModal();
          return;
        }
        if (isMod && !e.altKey && !e.shiftKey && key === 'n') {
          e.preventDefault();
          if (typeof newSchedule === 'function') newSchedule();
          return;
        }
        if (e.key === 'Escape') {
          var prevModal = document.getElementById('sm-preview-modal');
          if (prevModal && prevModal.style.display === 'flex') {
            if (typeof closeSmPreviewModal === 'function') closeSmPreviewModal();
            return;
          }
          if (document.getElementById('sm-link-modal')?.classList.contains('open')) {
            if (window.ScheduleMakerLinks) ScheduleMakerLinks.closeModal();
            return;
          }
          if (document.getElementById('sm-export-modal')?.classList.contains('open')) {
            if (typeof closeExportModal === 'function') closeExportModal();
            return;
          }
          if (document.getElementById('sm-group-modal')?.classList.contains('open')) {
            if (typeof closeGroupModal === 'function') closeGroupModal();
            return;
          }
          if (document.getElementById('sm-load-modal')?.classList.contains('open')) {
            if (typeof closeLoadModal === 'function') closeLoadModal();
          }
        }
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
