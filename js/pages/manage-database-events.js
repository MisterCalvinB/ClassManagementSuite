// Migrated static HTML event handlers from pages/manage-database.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-mdbev-1]');
      if (!el) return;
      var handler = function (event) { if(window.Desktop&&Desktop.isElectron())Desktop.openTool('import-tool.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-2]');
      if (!el) return;
      var handler = function (event) { ShortcutsModal.open({title:t('skmTitle'),rows:[],noShortcutsText:t('skmNone')}) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-3]');
      if (!el) return;
      var handler = function (event) { startMdbTutorial() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-4]');
      if (!el) return;
      var handler = function (event) { mdbGlobalSearchDebounced(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-5]');
      if (!el) return;
      var handler = function (event) { openAdd() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-6]');
      if (!el) return;
      var handler = function (event) { openNewFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-7]');
      if (!el) return;
      var handler = function (event) { openAddColumnModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-8]');
      if (!el) return;
      var handler = function (event) { openMdbAiStudio() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-9]');
      if (!el) return;
      var handler = function (event) { copyAIPrompt(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-10]');
      if (!el) return;
      var handler = function (event) { toggleViewMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-11]');
      if (!el) return;
      var handler = function (event) { deduplicateRecords() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-12]');
      if (!el) return;
      var handler = function (event) { openMerge() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-13]');
      if (!el) return;
      var handler = function (event) { openActiveFileLinksModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-14]');
      if (!el) return;
      var handler = function (event) { toggleExportMenu(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-15]');
      if (!el) return;
      var handler = function (event) { handleExportClick('csv') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-16]');
      if (!el) return;
      var handler = function (event) { handleExportClick('pdf') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-17]');
      if (!el) return;
      var handler = function (event) { handleExportClick('html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-18]');
      if (!el) return;
      var handler = function (event) { handleExportClick('html-filter') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-19]');
      if (!el) return;
      var handler = function (event) { handleExportClick('md') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-20]');
      if (!el) return;
      var handler = function (event) { handleExportClick('xlsx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-21]');
      if (!el) return;
      var handler = function (event) { handleExportClick('ods') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-22]');
      if (!el) return;
      var handler = function (event) { handleExportClick('docx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-23]');
      if (!el) return;
      var handler = function (event) { batchSelectAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-24]');
      if (!el) return;
      var handler = function (event) { batchClearSelection() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-25]');
      if (!el) return;
      var handler = function (event) { toggleBatchPanel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-26]');
      if (!el) return;
      var handler = function (event) { openBatchAutofillModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-27]');
      if (!el) return;
      var handler = function (event) { openBatchCopyToModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-28]');
      if (!el) return;
      var handler = function (event) { deleteSelectedBatch() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-29]');
      if (!el) return;
      var handler = function (event) { changePage(-1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-30]');
      if (!el) return;
      var handler = function (event) { changePage(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-31]');
      if (!el) return;
      var handler = function (event) { setPageSize(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-32]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-33]');
      if (!el) return;
      var handler = function (event) { closeEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-34]');
      if (!el) return;
      var handler = function (event) { openRecordTagLinkModalFromEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-35]');
      if (!el) return;
      var handler = function (event) { openCopyToModalFromEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-36]');
      if (!el) return;
      var handler = function (event) { closeEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-37]');
      if (!el) return;
      var handler = function (event) { submitEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-38]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeAutofill() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-39]');
      if (!el) return;
      var handler = function (event) { closeAutofill() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-40]');
      if (!el) return;
      var handler = function (event) { closeAutofill() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-41]');
      if (!el) return;
      var handler = function (event) { applyAutofillSuggestions() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-42]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeBatchAutofillModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-43]');
      if (!el) return;
      var handler = function (event) { closeBatchAutofillModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-44]');
      if (!el) return;
      var handler = function (event) { updateBatchAutofillPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-45]');
      if (!el) return;
      var handler = function (event) { updateBatchAutofillPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-46]');
      if (!el) return;
      var handler = function (event) { updateBatchAutofillPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-47]');
      if (!el) return;
      var handler = function (event) { updateBatchAutofillPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-48]');
      if (!el) return;
      var handler = function (event) { updateBatchAutofillPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-49]');
      if (!el) return;
      var handler = function (event) { batchAutofillSelectAllFields(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-50]');
      if (!el) return;
      var handler = function (event) { batchAutofillSelectAllFields(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-51]');
      if (!el) return;
      var handler = function (event) { updateBatchAutofillPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-52]');
      if (!el) return;
      var handler = function (event) { updateBatchAutofillPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-53]');
      if (!el) return;
      var handler = function (event) { updateBatchAutofillPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-54]');
      if (!el) return;
      var handler = function (event) { closeBatchAutofillModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-55]');
      if (!el) return;
      var handler = function (event) { executeBatchAutofill() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-56]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeMdbAiStudio() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-57]');
      if (!el) return;
      var handler = function (event) { if(typeof openSlmModelManager==='function')openSlmModelManager(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-58]');
      if (!el) return;
      var handler = function (event) { closeMdbAiStudio() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-59]');
      if (!el) return;
      var handler = function (event) { MdbAi.switchStudioMode('topic') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-60]');
      if (!el) return;
      var handler = function (event) { MdbAi.switchStudioMode('text') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-61]');
      if (!el) return;
      var handler = function (event) { if(window.SlmService)window.SlmService.abort(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-62]');
      if (!el) return;
      var handler = function (event) { MdbAi.runStudioGeneration() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-63]');
      if (!el) return;
      var handler = function (event) { MdbAi.copyPromptTemplate(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-64]');
      if (!el) return;
      var handler = function (event) { MdbAi.studioSelectAll(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-65]');
      if (!el) return;
      var handler = function (event) { MdbAi.studioSelectAll(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-66]');
      if (!el) return;
      var handler = function (event) { closeMdbAiStudio() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-67]');
      if (!el) return;
      var handler = function (event) { MdbAi.insertStudioRecords() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-68]');
      if (!el) return;
      var handler = function (event) { closeDel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-69]');
      if (!el) return;
      var handler = function (event) { doDel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-70]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeMerge() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-71]');
      if (!el) return;
      var handler = function (event) { closeMerge() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-72]');
      if (!el) return;
      var handler = function (event) { updateMergeTarget() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-73]');
      if (!el) return;
      var handler = function (event) { updateMergeTarget() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-74]');
      if (!el) return;
      var handler = function (event) { closeMerge() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-75]');
      if (!el) return;
      var handler = function (event) { doMerge() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-76]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeCopyModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-77]');
      if (!el) return;
      var handler = function (event) { closeCopyModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-78]');
      if (!el) return;
      var handler = function (event) { handleCopyTargetChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-79]');
      if (!el) return;
      var handler = function (event) { closeCopyModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-80]');
      if (!el) return;
      var handler = function (event) { submitCopyModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-81]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeMdbCompPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-82]');
      if (!el) return;
      var handler = function (event) { closeMdbCompPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-83]');
      if (!el) return;
      var handler = function (event) { filterMdbCompPicker() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-84]');
      if (!el) return;
      var handler = function (event) { filterMdbCompPicker() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-85]');
      if (!el) return;
      var handler = function (event) { filterMdbCompPicker() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-86]');
      if (!el) return;
      var handler = function (event) { filterMdbCompPicker() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-87]');
      if (!el) return;
      var handler = function (event) { toggleMdbCompShowSelected(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-88]');
      if (!el) return;
      var handler = function (event) { selectMdbCompVisible(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-89]');
      if (!el) return;
      var handler = function (event) { selectMdbCompVisible(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-90]');
      if (!el) return;
      var handler = function (event) { closeMdbCompPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-91]');
      if (!el) return;
      var handler = function (event) { applyMdbCompPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-92]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeNF() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-93]');
      if (!el) return;
      var handler = function (event) { closeNF() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-94]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter')doCreateFile() };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-95]');
      if (!el) return;
      var handler = function (event) { closeNF() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-96]');
      if (!el) return;
      var handler = function (event) { doCreateFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-97]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeColPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-98]');
      if (!el) return;
      var handler = function (event) { closeColPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-99]');
      if (!el) return;
      var handler = function (event) { colPickerToggleAll(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-100]');
      if (!el) return;
      var handler = function (event) { colPickerToggleAll(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-101]');
      if (!el) return;
      var handler = function (event) { closeColPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-102]');
      if (!el) return;
      var handler = function (event) { colPickerConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-103]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeAddColumnModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-104]');
      if (!el) return;
      var handler = function (event) { closeAddColumnModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-105]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter')submitAddColumn() };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-106]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter')submitAddColumn() };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-107]');
      if (!el) return;
      var handler = function (event) { handleAddColTypeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-108]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter')submitAddColumn() };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-109]');
      if (!el) return;
      var handler = function (event) { closeAddColumnModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-110]');
      if (!el) return;
      var handler = function (event) { submitAddColumn() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-111]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeWordUsageModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-112]');
      if (!el) return;
      var handler = function (event) { closeWordUsageModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-mdbev-113]');
      if (!el) return;
      var handler = function (event) { closeWordUsageModal() };
      el.addEventListener('click', handler);
    })();

    // Delegated handlers for dynamically rendered database UI
    document.addEventListener('click', function (e) {
      var dz = e.target.closest('[data-mdb-dropzone-id]');
      if (dz && !e.target.closest('img')) {
        var fileInp = document.getElementById(dz.getAttribute('data-mdb-dropzone-id') + '-file');
        if (fileInp) fileInp.click();
        return;
      }

      var el = e.target.closest('[data-mdb-action]');
      if (!el) return;
      var act = el.getAttribute('data-mdb-action');
      var id = el.getAttribute('data-mdb-id') || '';
      var key = el.getAttribute('data-mdb-key') || '';
      var fi = parseInt(el.getAttribute('data-mdb-fi'), 10);
      var ri = parseInt(el.getAttribute('data-mdb-ri'), 10);

      switch (act) {
        case 'apply-swatch': mdbApplySwatch(id, el.getAttribute('data-mdb-color') || ''); break;
        case 'traffic-light': mdbApplyTrafficLightGradient(id); break;
        case 'select-type': selectType(key); break;
        case 'toggle-section': toggleSection(id); break;
        case 'toggle-source': toggleSource(el.getAttribute('data-mdb-name') || ''); break;
        case 'download-file': e.stopPropagation(); downloadFile(fi); break;
        case 'delete-file': e.stopPropagation(); deleteDBFile(fi); break;
        case 'toggle-all-sources': toggleAllSources(); break;
        case 'toggle-dropdown': toggleMdbDropdown(key, e); break;
        case 'ms-select-all': mdbMsSelectAll(key, e); break;
        case 'ms-clear': mdbMsClear(key, e); break;
        case 'reset-filters': resetFilters(); break;
        case 'set-sort': setSort(key); break;
        case 'open-col-menu': openColMenu(e, key, el.getAttribute('data-mdb-custom') === 'true'); break;
        case 'open-add-col': openAddColumnModal(); break;
        case 'open-edit': openEdit(fi, ri); break;
        case 'open-tag-link': e.stopPropagation(); openRecordTagLinkModal(fi, ri); break;
        case 'word-usage': openWordReverseLookup(fi, ri); break;
        case 'dup-rec': duplicateRecord(fi, ri); break;
        case 'copy-to': openCopyToModal(fi, ri); break;
        case 'confirm-del': confirmDel(fi, ri); break;
        case 'pic-lightbox': e.stopPropagation(); mdbOpenPictureLightbox(el.src); break;
        case 'col-autofit': autoFitColumn(key); closeAllColMenus(); break;
        case 'col-reset-w': resetColumnWidth(S.typeKey, key); closeAllColMenus(); break;
        case 'col-reset-all-w': resetAllColumnWidths(S.typeKey); closeAllColMenus(); break;
        case 'col-delete': deleteCustomColumn(key); closeAllColMenus(); break;
        case 'form-ai-autofill':
          if (typeof mdbTriggerFormAiAutofill === 'function') mdbTriggerFormAiAutofill();
          else if (typeof triggerWordAutofill === 'function') triggerWordAutofill();
          break;
        case 'comp-picker': openMdbCompetencePicker(key); break;
        case 'field-ai-autofill': mdbTriggerFieldAiAutofill(key); break;
        case 'pic-choose': document.getElementById(id + '-file')?.click(); break;
        case 'pic-clear': mdbClearWordPicture(id); break;
        case 'close-lightbox': mdbClosePictureLightbox(); break;
        case 'open-slm-manager': if (typeof openSlmModelManager === 'function') openSlmModelManager(); break;
        case 'switch-add-tab': switchAddTab(el.getAttribute('data-mdb-tab') || 'single'); break;
        case 'remove-comp-chip': removeFormCompChip(el.getAttribute('data-mdb-cid') || ''); break;
        case 'word-tag-link': openWordTagLinkModal(el.getAttribute('data-mdb-word') || ''); break;
        case 'jump-board': jumpToBoardWord(el.getAttribute('data-mdb-file') || '', el.getAttribute('data-mdb-node') || ''); break;
        case 'jump-test': jumpToTestExercise(el.getAttribute('data-mdb-file') || '', el.getAttribute('data-mdb-ex') || ''); break;
        case 'jump-lesson': jumpToLessonPlan(el.getAttribute('data-mdb-file') || ''); break;
        case 'close-batch': closeBatchPanel(); break;
        case 'apply-batch': applyBatchEdit(); break;
        case 'batch-autofill': openBatchAutofillModal(); break;
        case 'global-result': openGlobalResult(el.dataset.typeKey, el.dataset.filename, +el.dataset.recordIndex); break;
      }
    });

    document.addEventListener('input', function (e) {
      var el = e.target.closest('[data-mdb-input]');
      if (!el) return;
      var act = el.getAttribute('data-mdb-input');
      var id = el.getAttribute('data-mdb-id') || '';
      if (act === 'color-picker') mdbOnColorPickerInput(id, el.value);
      else if (act === 'color-text') mdbOnColorTextInput(id, el.value);
      else if (act === 'grade-color') mdbOnGradePickerChange(id, el.getAttribute('data-mdb-grade') || '', window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(el) : el.value);
      else if (act === 'all-search') setAllFieldsFilterDebounced(el.value);
      else if (act === 'ms-filter') mdbMsFilterList(el);
      else if (act === 'col-filter') setFilterDebounced(el.getAttribute('data-filter-key') || '', el.value);
      else if (act === 'inline-color-picker') {
        var wrap = el.closest('.cell-inline-color-wrap');
        var txtEl = wrap ? wrap.querySelector('.cell-inline-input') : null;
        if (txtEl) txtEl.value = window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(el) : el.value;
      }
      else if (act === 'inline-color-text') {
        var wrap2 = el.closest('.cell-inline-color-wrap');
        var pkrEl = wrap2 ? wrap2.querySelector('.cell-inline-color-picker') : null;
        if (pkrEl && window.UnifiedColorPicker && window.UnifiedColorPicker.isValidColor(el.value)) {
          window.UnifiedColorPicker.setValue(pkrEl, el.value);
        } else if (pkrEl && /^#[0-9a-fA-F]{6}$/.test(el.value)) {
          pkrEl.value = el.value;
        }
      }
      else if (act === 'sync-grade-colors') mdbSyncGradeColorsFromText(id);
      else if (act === 'word-pic') mdbOnWordPictureInput(id);
    });

    document.addEventListener('change', function (e) {
      var el = e.target.closest('[data-mdb-change]');
      if (!el) return;
      var act = el.getAttribute('data-mdb-change');
      var id = el.getAttribute('data-mdb-id') || '';
      var key = el.getAttribute('data-mdb-key') || '';
      var fi = parseInt(el.getAttribute('data-mdb-fi'), 10);
      var ri = parseInt(el.getAttribute('data-mdb-ri'), 10);
      if (act === 'search-scope') setSearchScope(el.value);
      else if (act === 'ms-toggle') mdbMsToggle(key, el.value, el.checked);
      else if (act === 'starred-filter') setFilter('_starred', el.checked ? '1' : '');
      else if (act === 'batch-check-all') handleBatchCheckAll(el);
      else if (act === 'batch-select') toggleBatchSelect(fi, ri);
      else if (act === 'word-pic-file') mdbHandleWordPictureFile(id, el);
      else if (act === 'baf-preview') updateBatchAutofillPreview();
      else if (act === 'merge-info') updateMergeInfo();
    });

    document.addEventListener('dragover', function (e) {
      var dz = e.target.closest('[data-mdb-dropzone-id]');
      if (!dz) return;
      e.preventDefault();
      dz.classList.add('drag-over');
    });
    document.addEventListener('dragleave', function (e) {
      var dz = e.target.closest('[data-mdb-dropzone-id]');
      if (dz) dz.classList.remove('drag-over');
    });
    document.addEventListener('drop', function (e) {
      var dz = e.target.closest('[data-mdb-dropzone-id]');
      if (!dz) return;
      mdbOnWordPictureDrop(e, dz.getAttribute('data-mdb-dropzone-id'));
    });
    document.addEventListener('paste', function (e) {
      var dz = e.target.closest('[data-mdb-dropzone-id]');
      if (!dz) return;
      mdbOnWordPicturePaste(e, dz.getAttribute('data-mdb-dropzone-id'));
    });

    document.addEventListener('error', function (e) {
      var img = e.target;
      if (!img || img.tagName !== 'IMG') return;
      if (img.classList.contains('mdb-cell-pic-thumb')) {
        img.style.display = 'none';
        if (img.nextElementSibling) img.nextElementSibling.style.display = 'inline';
      } else if (img.classList.contains('mdb-chip-pic-thumb') || img.classList.contains('mdb-pic-preview-img')) {
        img.style.display = 'none';
      }
    }, true);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
