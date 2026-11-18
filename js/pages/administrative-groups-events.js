// Migrated static HTML event handlers from pages/administrative-groups.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-agev-1]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-2]');
      if (!el) return;
      var handler = function (event) { ShortcutsModal.open({title:t('skmTitle', 'Keyboard Shortcuts'), rows:[], noShortcutsText:t('skmNone')}) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-3]');
      if (!el) return;
      var handler = function (event) { startAgTutorial() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-4]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-5]');
      if (!el) return;
      var handler = function (event) { window.handleDirectFile(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-6]');
      if (!el) return;
      var handler = function (event) { window.triggerDirectImport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-7]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-8]');
      if (!el) return;
      var handler = function (event) { window.openExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-9]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-10]');
      if (!el) return;
      var handler = function (event) { window.print() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-11]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-12]');
      if (!el) return;
      var handler = function (event) { window.openSettingsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-13]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-14]');
      if (!el) return;
      var handler = function (event) { window.onPeriodFilterChanged(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-15]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-16]');
      if (!el) return;
      var handler = function (event) { if(window.Desktop&&Desktop.isElectron())Desktop.openTool('group-editor.html');else window.location.href='group-editor.html'; };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-17]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-18]');
      if (!el) return;
      var handler = function (event) { if(window.Desktop&&Desktop.isElectron())Desktop.openTool('import-tool.html?dest=adminGroups');else window.location.href='import-tool.html?dest=adminGroups'; };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-19]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-20]');
      if (!el) return;
      var handler = function (event) { window.openResetAllModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-21]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-22]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-23]');
      if (!el) return;
      var handler = function (event) { window.closeStudentModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-24]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-25]');
      if (!el) return;
      var handler = function (event) { window.attachPdfToCurrentStudent() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-26]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-27]');
      if (!el) return;
      var handler = function (event) { window.openCurrentStudentLinks() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-28]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-29]');
      if (!el) return;
      var handler = function (event) { window.generateQuickStudentReport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-30]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-31]');
      if (!el) return;
      var handler = function (event) { window.openQuickActionMenu() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-32]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-33]');
      if (!el) return;
      var handler = function (event) { window.promptEraseStudent() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-34]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-35]');
      if (!el) return;
      var handler = function (event) { window.closeStudentModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-36]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-37]');
      if (!el) return;
      var handler = function (event) { window.closeNewActionModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-38]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-39]');
      if (!el) return;
      var handler = function (event) { window.closeNewActionModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-40]');
      if (!el) return;
      var handler = function (event) { window.submitNewAction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-41]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-42]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-43]');
      if (!el) return;
      var handler = function (event) { window.closeExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-44]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-45]');
      if (!el) return;
      var handler = function (event) { window.selectReportScope('whole_class') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-46]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-47]');
      if (!el) return;
      var handler = function (event) { window.selectReportScope('student_dossier') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-48]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-49]');
      if (!el) return;
      var handler = function (event) { window.selectReportScope('multi_student') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-50]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-51]');
      if (!el) return;
      var handler = function (event) { window.selectReportScope('category_table') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-52]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-53]');
      if (!el) return;
      var handler = function (event) { window.toggleAllReportStudents(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-54]');
      if (!el) return;
      var handler = function (event) { window.toggleAllReportStudents(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-55]');
      if (!el) return;
      var handler = function (event) { window.selectExportFormat('preview') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-56]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-57]');
      if (!el) return;
      var handler = function (event) { window.selectExportFormat('html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-58]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-59]');
      if (!el) return;
      var handler = function (event) { window.selectExportFormat('pdf') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-60]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-61]');
      if (!el) return;
      var handler = function (event) { window.selectExportFormat('xlsx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-62]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-63]');
      if (!el) return;
      var handler = function (event) { window.selectExportFormat('csv') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-64]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-65]');
      if (!el) return;
      var handler = function (event) { window.selectExportFormat('docx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-66]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-67]');
      if (!el) return;
      var handler = function (event) { window.closeExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-68]');
      if (!el) return;
      var handler = function (event) { window.executeExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-69]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-70]');
      if (!el) return;
      var handler = function (event) { window.printPreviewReport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-71]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-72]');
      if (!el) return;
      var handler = function (event) { window.downloadPreviewHtml() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-73]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-74]');
      if (!el) return;
      var handler = function (event) { window.exportPreviewXlsx() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-75]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-76]');
      if (!el) return;
      var handler = function (event) { window.closeReportPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-77]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-78]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-79]');
      if (!el) return;
      var handler = function (event) { window.closePeriodChipsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-80]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-81]');
      if (!el) return;
      var handler = function (event) { window.selectPeriodChipPreset('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-82]');
      if (!el) return;
      var handler = function (event) { window.selectPeriodChipPreset('any_period') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-83]');
      if (!el) return;
      var handler = function (event) { window.closePeriodChipsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-84]');
      if (!el) return;
      var handler = function (event) { window.applyPeriodChipsSelection() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-85]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-86]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-87]');
      if (!el) return;
      var handler = function (event) { window.closeSettingsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-88]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-89]');
      if (!el) return;
      var handler = function (event) { window.switchSettingsTab('tabs') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-90]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-91]');
      if (!el) return;
      var handler = function (event) { window.switchSettingsTab('columns') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-92]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-93]');
      if (!el) return;
      var handler = function (event) { window.switchSettingsTab('sanctions') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-94]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-95]');
      if (!el) return;
      var handler = function (event) { window.switchSettingsTab('periods') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-96]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-97]');
      if (!el) return;
      var handler = function (event) { window.addSettingTab() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-98]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-99]');
      if (!el) return;
      var handler = function (event) { window.addSettingColumn() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-100]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-101]');
      if (!el) return;
      var handler = function (event) { window.addSettingInfractionColumn() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-102]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-103]');
      if (!el) return;
      var handler = function (event) { window.addSettingAccommodationColumn() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-104]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-105]');
      if (!el) return;
      var handler = function (event) { window.toggleAllColumns(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-106]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-107]');
      if (!el) return;
      var handler = function (event) { window.toggleAllColumns(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-108]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-109]');
      if (!el) return;
      var handler = function (event) { window.addSettingSanction() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-110]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-111]');
      if (!el) return;
      var handler = function (event) { window.addSettingPeriod() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-112]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-113]');
      if (!el) return;
      var handler = function (event) { window.generatePeriodsPreset('trimesters') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-114]');
      if (!el) return;
      var handler = function (event) { window.generatePeriodsPreset('semesters') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-115]');
      if (!el) return;
      var handler = function (event) { window.generatePeriodsPreset('custom', document.getElementById('agCustomPeriodsCountInput').value) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-116]');
      if (!el) return;
      var handler = function (event) { window.resetSettingsToDefault() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-117]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-118]');
      if (!el) return;
      var handler = function (event) { window.closeSettingsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-119]');
      if (!el) return;
      var handler = function (event) { window.saveSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-120]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-121]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-122]');
      if (!el) return;
      var handler = function (event) { window.closeImportConfirmModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-123]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-124]');
      if (!el) return;
      var handler = function (event) { window.onAgImportStartRowChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-125]');
      if (!el) return;
      var handler = function (event) { window.onImportPeriodSelectChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-126]');
      if (!el) return;
      var handler = function (event) { window.closeImportConfirmModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-127]');
      if (!el) return;
      var handler = function (event) { window.executeConfirmedImport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-128]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-129]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-130]');
      if (!el) return;
      var handler = function (event) { window.closeEraseStudentModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-131]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-132]');
      if (!el) return;
      var handler = function (event) { window.executeEraseStudent('archive') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-133]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-134]');
      if (!el) return;
      var handler = function (event) { window.executeEraseStudent('admin-only') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-135]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-136]');
      if (!el) return;
      var handler = function (event) { window.executeEraseStudent('everywhere') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-137]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-138]');
      if (!el) return;
      var handler = function (event) { window.closeEraseStudentModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-139]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-140]');
      if (!el) return;
      var handler = function (event) { window.closeResetAllModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-141]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-142]');
      if (!el) return;
      var handler = function (event) { window.executeResetAll('archive') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-143]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-144]');
      if (!el) return;
      var handler = function (event) { window.executeResetAll('admin-only') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-145]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-146]');
      if (!el) return;
      var handler = function (event) { window.executeResetAll('everywhere') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-147]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-148]');
      if (!el) return;
      var handler = function (event) { window.closeResetAllModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-149]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-150]');
      if (!el) return;
      var handler = function (event) { window.closePeriodAttachmentsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-151]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-152]');
      if (!el) return;
      var handler = function (event) { window.onPeriodModalSelectChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-153]');
      if (!el) return;
      var handler = function (event) { window.attachPdfToModalPeriod() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-154]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-155]');
      if (!el) return;
      var handler = function (event) { window.openModalPeriodLinks() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-agev-156]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-agev-157]');
      if (!el) return;
      var handler = function (event) { window.closePeriodAttachmentsModal() };
      el.addEventListener('click', handler);
    })();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
