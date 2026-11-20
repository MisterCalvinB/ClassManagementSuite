// Migrated static HTML event handlers from pages/database-converter.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-dcev-1]');
      if (!el) return;
      var handler = function (event) { openConverterShortcuts() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-2]');
      if (!el) return;
      var handler = function (event) { startConverterTour() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-3]');
      if (!el) return;
      var handler = function (event) { resetToTaskChooser() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-4]');
      if (!el) return;
      var handler = function (event) { loadSampleData() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-5]');
      if (!el) return;
      var handler = function (event) { clearAllData() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-6]');
      if (!el) return;
      var handler = function (event) { switchInputTab('file') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-7]');
      if (!el) return;
      var handler = function (event) { switchInputTab('paste') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-8]');
      if (!el) return;
      var handler = function (event) { handleFileSelect(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-9]');
      if (!el) return;
      var handler = function (event) { handlePasteParse() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-10]');
      if (!el) return;
      var handler = function (event) { handleSheetChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-11]');
      if (!el) return;
      var handler = function (event) { handleHeaderRowChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-12]');
      if (!el) return;
      var handler = function (event) { toggleSchemaPanel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-13]');
      if (!el) return;
      var handler = function (event) { handleModelPresetChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-14]');
      if (!el) return;
      var handler = function (event) { autoMatchCurrentModelHeaders() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-15]');
      if (!el) return;
      var handler = function (event) { resetSchemaHeadersToSource() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-16]');
      if (!el) return;
      var handler = function (event) { setTableDensity('fit') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-17]');
      if (!el) return;
      var handler = function (event) { setTableDensity('truncate') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-18]');
      if (!el) return;
      var handler = function (event) { setTableDensity('scroll') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-19]');
      if (!el) return;
      var handler = function (event) { handleTableSearch(event) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-20]');
      if (!el) return;
      var handler = function (event) { handleRowsPerPageChange(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-21]');
      if (!el) return;
      var handler = function (event) { changePage(-1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-22]');
      if (!el) return;
      var handler = function (event) { changePage(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-23]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('csv') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-24]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('xlsx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-25]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('json') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-26]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('tsv') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-27]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('ods') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-28]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('jsonl') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-29]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('sql') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-30]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('xml') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-31]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-32]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('markdown') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-33]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('app-grade-criteria') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-34]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('app-competences') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-35]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('app-class-groups') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-36]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('app-wordbank') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-37]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('app-quiz') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-38]');
      if (!el) return;
      var handler = function (event) { selectTargetFormat('app-admin-groups') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-39]');
      if (!el) return;
      var handler = function (event) { updateOutput() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-40]');
      if (!el) return;
      var handler = function (event) { updateOutput() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-41]');
      if (!el) return;
      var handler = function (event) { updateOutput() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-42]');
      if (!el) return;
      var handler = function (event) { updateOutput() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-43]');
      if (!el) return;
      var handler = function (event) { updateOutput() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-44]');
      if (!el) return;
      var handler = function (event) { updateOutput() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-45]');
      if (!el) return;
      var handler = function (event) { updateOutput() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-46]');
      if (!el) return;
      var handler = function (event) { updateOutput() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-47]');
      if (!el) return;
      var handler = function (event) { updateOutput() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-48]');
      if (!el) return;
      var handler = function (event) { updateOutput() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-49]');
      if (!el) return;
      var handler = function (event) { autoMatchCurrentModelHeaders() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-50]');
      if (!el) return;
      var handler = function (event) { copyOutputToClipboard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-51]');
      if (!el) return;
      var handler = function (event) { exportConvertedFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-dcev-52]');
      if (!el) return;
      el.addEventListener('click', function () { selectWorkflowMode('convert'); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-53]');
      if (!el) return;
      el.addEventListener('click', function () { selectWorkflowMode('cmt'); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-54]');
      if (!el) return;
      el.addEventListener('click', function () { selectWorkflowMode('clean'); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-55]');
      if (!el) return;
      el.addEventListener('click', function () { goToStep(1); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-56]');
      if (!el) return;
      el.addEventListener('click', function () { goToStep(2); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-57]');
      if (!el) return;
      el.addEventListener('click', function () { goToStep(3); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-58]');
      if (!el) return;
      el.addEventListener('click', function () { goToStep(2); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-59]');
      if (!el) return;
      el.addEventListener('click', function () { goToStep(1); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-60]');
      if (!el) return;
      el.addEventListener('click', function () { goToStep(3); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-61]');
      if (!el) return;
      el.addEventListener('click', function () { switchPreviewTab('table'); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-62]');
      if (!el) return;
      el.addEventListener('click', function () { switchPreviewTab('code'); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-63]');
      if (!el) return;
      el.addEventListener('click', function () { goToStep(2); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-64]');
      if (!el) return;
      el.addEventListener('change', function () { selectTargetFormat(this.value); });
    })();
    (function () {
      var el = document.querySelector('[data-dcev-65]');
      if (!el) return;
      el.addEventListener('click', function () { selectWorkflowMode('import'); });
    })();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
