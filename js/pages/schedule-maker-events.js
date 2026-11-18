// Migrated static HTML event handlers from pages/schedule-maker.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-smev-1]');
      if (!el) return;
      var handler = function (event) { ShortcutsModal.open({title:t('skmTitle'),rows:[],noShortcutsText:t('skmNone')}) };
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
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
