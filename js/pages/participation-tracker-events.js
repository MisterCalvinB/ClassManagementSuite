// Migrated static HTML event handlers from pages/participation-tracker.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-ptev-1]');
      if (!el) return;
      var handler = function (event) { ShortcutsModal.open({title:t('skmTitle'),rows:[],noShortcutsText:t('skmNone')}) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-2]');
      if (!el) return;
      var handler = function (event) { showPtTour() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-3]');
      if (!el) return;
      var handler = function (event) { openRulesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-4]');
      if (!el) return;
      var handler = function (event) { openPtExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-5]');
      if (!el) return;
      var handler = function (event) { toggleShowArchived() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-6]');
      if (!el) return;
      var handler = function (event) { openColumnsConfigModal('historyTable') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-7]');
      if (!el) return;
      var handler = function (event) { openSessionTimelineModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-8]');
      if (!el) return;
      var handler = function (event) { closeSessionTimelinePanel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-9]');
      if (!el) return;
      var handler = function (event) { onTimelinePlannerSlotChange(this.value, false) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-10]');
      if (!el) return;
      var handler = function (event) { onTimelineSlotDurationChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-11]');
      if (!el) return;
      var handler = function (event) { onTimelineTimeDisplayChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-12]');
      if (!el) return;
      var handler = function (event) { onTimelineStudentFilterChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-13]');
      if (!el) return;
      var handler = function (event) { exportTimelinePng() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-14]');
      if (!el) return;
      var handler = function (event) { exportTimelineSvg() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-15]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('points', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-16]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('picks', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-17]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('timers', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-18]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('teams', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-19]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('badges', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-20]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('attendance', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-21]');
      if (!el) return;
      var handler = function (event) { openColumnsConfigModal('classOverviewTable') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-22]');
      if (!el) return;
      var handler = function (event) { toggleSelectedSessionExam() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-23]');
      if (!el) return;
      var handler = function (event) { setStudentChartType('points') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-24]');
      if (!el) return;
      var handler = function (event) { setStudentChartType('cumulative') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-25]');
      if (!el) return;
      var handler = function (event) { openColumnsConfigModal('studentTable') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-26]');
      if (!el) return;
      var handler = function (event) { closeRulesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-27]');
      if (!el) return;
      var handler = function (event) { showPtRulesTour() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-28]');
      if (!el) return;
      var handler = function (event) { onRulesModalGroupChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-29]');
      if (!el) return;
      var handler = function (event) { setModalDatePreset('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-30]');
      if (!el) return;
      var handler = function (event) { setModalDatePreset('30days') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-31]');
      if (!el) return;
      var handler = function (event) { setModalDatePreset('7days') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-32]');
      if (!el) return;
      var handler = function (event) { setModalDatePreset('semester') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-33]');
      if (!el) return;
      var handler = function (event) { onModalDateChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-34]');
      if (!el) return;
      var handler = function (event) { onModalDateChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-35]');
      if (!el) return;
      var handler = function (event) { addRuleRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-36]');
      if (!el) return;
      var handler = function (event) { this.style.borderColor='#111';this.style.color='#111'; };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-37]');
      if (!el) return;
      var handler = function (event) { this.style.borderColor='#ddd';this.style.color='#555'; };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-38]');
      if (!el) return;
      var handler = function (event) { updateProvisionalGradesPreview() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-39]');
      if (!el) return;
      var handler = function (event) { updateProvisionalGradesPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-40]');
      if (!el) return;
      var handler = function (event) { copyProvisionalGrades() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-41]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#111' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-42]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111';this.style.color='#fff' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-43]');
      if (!el) return;
      var handler = function (event) { exportGradesToGradeSheet(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-44]');
      if (!el) return;
      var handler = function (event) { exportGradesToGradeSheet(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-45]');
      if (!el) return;
      var handler = function (event) { openGradeSheetTool() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-46]');
      if (!el) return;
      var handler = function (event) { this.style.borderColor='#111';this.style.color='#111'; };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-47]');
      if (!el) return;
      var handler = function (event) { this.style.borderColor='#ddd';this.style.color='#555'; };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-48]');
      if (!el) return;
      var handler = function (event) { closeRulesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-49]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111';this.style.color='#fff';this.style.borderColor='#111' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-50]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#888';this.style.borderColor='#ccc' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-51]');
      if (!el) return;
      var handler = function (event) { confirmNewRules() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-52]');
      if (!el) return;
      var handler = function (event) { this.style.background='#c33';this.style.color='#fff';this.style.borderColor='#c33' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-53]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#c33';this.style.borderColor='#ecc' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-54]');
      if (!el) return;
      var handler = function (event) { openExportRulesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-55]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111';this.style.color='#fff' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-56]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#111' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-57]');
      if (!el) return;
      var handler = function (event) { loadRulesConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-58]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111';this.style.color='#fff' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-59]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#111' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-60]');
      if (!el) return;
      var handler = function (event) { saveRulesConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-61]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#111' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-62]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111';this.style.color='#fff' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-63]');
      if (!el) return;
      var handler = function (event) { closeConfirmNewRulesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-64]');
      if (!el) return;
      var handler = function (event) { closeConfirmNewRulesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-65]');
      if (!el) return;
      var handler = function (event) { clearAndStartNewRules() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-66]');
      if (!el) return;
      var handler = function (event) { closeSavedRulesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-67]');
      if (!el) return;
      var handler = function (event) { saveCurrentRulesAsPreset() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-68]');
      if (!el) return;
      var handler = function (event) { closeSavedRulesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-69]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closePtPdfExportModal(null) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-70]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-71]');
      if (!el) return;
      var handler = function (event) { closePtPdfExportModal(null) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-72]');
      if (!el) return;
      var handler = function (event) { closePtPdfExportModal('to-print') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-73]');
      if (!el) return;
      var handler = function (event) { closePtPdfExportModal('picker') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-74]');
      if (!el) return;
      var handler = function (event) { closePtPdfExportModal(null) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-75]');
      if (!el) return;
      var handler = function (event) { closeExportRulesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-76]');
      if (!el) return;
      var handler = function (event) { updateRulesExportHint() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-77]');
      if (!el) return;
      var handler = function (event) { updateRulesExportHint() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-78]');
      if (!el) return;
      var handler = function (event) { updateRulesExportHint() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-79]');
      if (!el) return;
      var handler = function (event) { closeExportRulesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-80]');
      if (!el) return;
      var handler = function (event) { previewExportRules() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-81]');
      if (!el) return;
      var handler = function (event) { executeExportRules() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-82]');
      if (!el) return;
      var handler = function (event) { openStudentSessionTimelineFromModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-83]');
      if (!el) return;
      var handler = function (event) { showPtDetailTour() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-84]');
      if (!el) return;
      var handler = function (event) { closeDetailModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-85]');
      if (!el) return;
      var handler = function (event) { closeDetailModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-86]');
      if (!el) return;
      var handler = function (event) { confirmSaveNotes() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-87]');
      if (!el) return;
      var handler = function (event) { closeConfirmModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-88]');
      if (!el) return;
      var handler = function (event) { closeConfirmModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-89]');
      if (!el) return;
      var handler = function (event) { confirmAndSaveNotes() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-90]');
      if (!el) return;
      var handler = function (event) { closeResetModal1() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-91]');
      if (!el) return;
      var handler = function (event) { closeResetModal1() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-92]');
      if (!el) return;
      var handler = function (event) { proceedResetStep2() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-93]');
      if (!el) return;
      var handler = function (event) { closeResetModal2() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-94]');
      if (!el) return;
      var handler = function (event) { closeResetModal2() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-95]');
      if (!el) return;
      var handler = function (event) { executeReset() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-96]');
      if (!el) return;
      var handler = function (event) { closeImportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-97]');
      if (!el) return;
      var handler = function (event) { closeImportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-98]');
      if (!el) return;
      var handler = function (event) { confirmImportAndMerge() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-99]');
      if (!el) return;
      var handler = function (event) { closeCompareGroupsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-100]');
      if (!el) return;
      var handler = function (event) { setCompareGroupsSelection(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-101]');
      if (!el) return;
      var handler = function (event) { setCompareGroupsSelection(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-102]');
      if (!el) return;
      var handler = function (event) { closeCompareGroupsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-103]');
      if (!el) return;
      var handler = function (event) { applyCompareGroupsSelection() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-104]');
      if (!el) return;
      var handler = function (event) { closeColumnsConfigModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-105]');
      if (!el) return;
      var handler = function (event) { showAllColumnsInModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-106]');
      if (!el) return;
      var handler = function (event) { resetColumnsOrderAndWidthsInModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-107]');
      if (!el) return;
      var handler = function (event) { closeColumnsConfigModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-108]');
      if (!el) return;
      var handler = function (event) { closePtExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-109]');
      if (!el) return;
      var handler = function (event) { togglePtReportSubOptions() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-110]');
      if (!el) return;
      var handler = function (event) { togglePtReportSubOptions() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-111]');
      if (!el) return;
      var handler = function (event) { togglePtReportSubOptions() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-112]');
      if (!el) return;
      var handler = function (event) { togglePtReportSubOptions() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-113]');
      if (!el) return;
      var handler = function (event) { togglePtReportSubOptions() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-114]');
      if (!el) return;
      var handler = function (event) { togglePtReportSubOptions() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-115]');
      if (!el) return;
      var handler = function (event) { closePtExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-116]');
      if (!el) return;
      var handler = function (event) { previewPtExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-117]');
      if (!el) return;
      var handler = function (event) { executePtExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-118]');
      if (!el) return;
      var handler = function (event) { closePtExportPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-119]');
      if (!el) return;
      var handler = function (event) { closePtExportPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-120]');
      if (!el) return;
      var handler = function (event) { confirmExportFromPreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-121]');
      if (!el) return;
      var handler = function (event) { exportTimelinePng() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-122]');
      if (!el) return;
      var handler = function (event) { exportTimelineSvg() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-123]');
      if (!el) return;
      var handler = function (event) { closeSessionTimelineModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-124]');
      if (!el) return;
      var handler = function (event) { onTimelinePlannerSlotChange(this.value, true) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-125]');
      if (!el) return;
      var handler = function (event) { onTimelineSlotDurationChange(this.value, true) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-126]');
      if (!el) return;
      var handler = function (event) { onTimelineTimeDisplayChange(this.value, true) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-127]');
      if (!el) return;
      var handler = function (event) { onTimelineStudentFilterChange(this.value, true) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-128]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('points', this, true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-129]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('picks', this, true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-130]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('timers', this, true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-131]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('teams', this, true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-132]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('badges', this, true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-133]');
      if (!el) return;
      var handler = function (event) { toggleTimelineFilter('attendance', this, true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-134]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeCreditsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ptev-135]');
      if (!el) return;
      var handler = function (event) { closeCreditsModal() };
      el.addEventListener('click', handler);
    })();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
