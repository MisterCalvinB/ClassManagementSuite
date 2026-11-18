// Migrated static HTML event handlers from pages/lesson-creator.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-lcev-1]');
      if (!el) return;
      var handler = function (event) { lcNewPlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-2]');
      if (!el) return;
      var handler = function (event) { lcOpenPlanPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-3]');
      if (!el) return;
      var handler = function (event) { lcSavePlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-4]');
      if (!el) return;
      var handler = function (event) { lcDuplicatePlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-5]');
      if (!el) return;
      var handler = function (event) { lcUnlinkPlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-6]');
      if (!el) return;
      var handler = function (event) { lcDeletePlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-7]');
      if (!el) return;
      var handler = function (event) { lcOpenSequenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-8]');
      if (!el) return;
      var handler = function (event) { lcOpenTemplatePicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-9]');
      if (!el) return;
      var handler = function (event) { lcSaveAsTemplate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-10]');
      if (!el) return;
      var handler = function (event) { lcResetPlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-11]');
      if (!el) return;
      var handler = function (event) { lcAddPhase() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-12]');
      if (!el) return;
      var handler = function (event) { lcPromptAddCustomFieldToAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-13]');
      if (!el) return;
      var handler = function (event) { lcOpenOutlineModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-14]');
      if (!el) return;
      var handler = function (event) { lcOpenTeamModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-15]');
      if (!el) return;
      var handler = function (event) { lcOpenSoundModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-16]');
      if (!el) return;
      var handler = function (event) { lcToggleTimelineViewMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-17]');
      if (!el) return;
      var handler = function (event) { lcOpenOutlineModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-18]');
      if (!el) return;
      var handler = function (event) { lcToggleDrawer('competences') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-19]');
      if (!el) return;
      var handler = function (event) { lcToggleDrawer('activities') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-20]');
      if (!el) return;
      var handler = function (event) { lcOpenFloatingCompanion() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-21]');
      if (!el) return;
      var handler = function (event) { lcOpenCoverageModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-22]');
      if (!el) return;
      var handler = function (event) { lcOpenPillsGuideModal('activities') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-23]');
      if (!el) return;
      var handler = function (event) { lcRunInClassManagement() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-24]');
      if (!el) return;
      var handler = function (event) { lcOpenFloatingCompanion() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-25]');
      if (!el) return;
      var handler = function (event) { lcOpenBoardExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-26]');
      if (!el) return;
      var handler = function (event) { lcOpenPlannerLinkModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-27]');
      if (!el) return;
      var handler = function (event) { lcOpenCompetencePortfolio() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-28]');
      if (!el) return;
      var handler = function (event) { lcOpenDescriptorDb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-29]');
      if (!el) return;
      var handler = function (event) { lcOpenPhaseDb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-30]');
      if (!el) return;
      var handler = function (event) { lcOpenDescriptorImporter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-31]');
      if (!el) return;
      var handler = function (event) { lcOpenExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-32]');
      if (!el) return;
      var handler = function (event) { lcOpenSequenceExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-33]');
      if (!el) return;
      var handler = function (event) { lcOpenExportModal('pdf') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-34]');
      if (!el) return;
      var handler = function (event) { lcOpenExportModal('html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-35]');
      if (!el) return;
      var handler = function (event) { lcOpenExportModal('xlsx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-36]');
      if (!el) return;
      var handler = function (event) { lcOpenExportModal('csv') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-37]');
      if (!el) return;
      var handler = function (event) { lcOpenExportModal('json') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-38]');
      if (!el) return;
      var handler = function (event) { lcOpenCopyTextModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-39]');
      if (!el) return;
      var handler = function (event) { lcOpenShortcuts() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-40]');
      if (!el) return;
      var handler = function (event) { lcStartTutorial() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-41]');
      if (!el) return;
      var handler = function (event) { lcNavSequence(-1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-42]');
      if (!el) return;
      var handler = function (event) { lcNavSequence(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-43]');
      if (!el) return;
      var handler = function (event) { lcOpenSequenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-44]');
      if (!el) return;
      var handler = function (event) { lcOnPlanDirty() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-45]');
      if (!el) return;
      var handler = function (event) { lcOnSubjectChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-46]');
      if (!el) return;
      var handler = function (event) { lcOnClassChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-47]');
      if (!el) return;
      var handler = function (event) { lcOnYearLevelChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-48]');
      if (!el) return;
      var handler = function (event) { lcOnPlanDirty() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-49]');
      if (!el) return;
      var handler = function (event) { lcOnPlanDirty() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-50]');
      if (!el) return;
      var handler = function (event) { lcOnDurationChange() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-51]');
      if (!el) return;
      var handler = function (event) { lcOpenPlanLinksModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-52]');
      if (!el) return;
      var handler = function (event) { lcOpenPlannerSlotLink() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-53]');
      if (!el) return;
      var handler = function (event) { lcRunInClassManagement() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-54]');
      if (!el) return;
      var handler = function (event) { lcOpenFloatingCompanion() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-55]');
      if (!el) return;
      var handler = function (event) { lcSavePlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-56]');
      if (!el) return;
      var handler = function (event) { lcToggleDrawer('competences') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-57]');
      if (!el) return;
      var handler = function (event) { lcToggleDrawer('activities') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-58]');
      if (!el) return;
      var handler = function (event) { lcOnTagKeyDown(event) };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-59]');
      if (!el) return;
      var handler = function (event) { lcOpenSequenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-60]');
      if (!el) return;
      var handler = function (event) { lcOpenTeamModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-61]');
      if (!el) return;
      var handler = function (event) { lcOpenCoverageModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-62]');
      if (!el) return;
      var handler = function (event) { lcSetTimelineViewMode('detailed') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-63]');
      if (!el) return;
      var handler = function (event) { lcSetTimelineViewMode('compact') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-64]');
      if (!el) return;
      var handler = function (event) { lcOpenOutlineModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-65]');
      if (!el) return;
      var handler = function (event) { lcOpenFloatingCompanion() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-66]');
      if (!el) return;
      var handler = function (event) { lcOpenTemplatePicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-67]');
      if (!el) return;
      var handler = function (event) { lcAddPhase() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-68]');
      if (!el) return;
      var handler = function (event) { lcAddPhase() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-69]');
      if (!el) return;
      var handler = function (event) { lcOpenTemplatePicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-70]');
      if (!el) return;
      var handler = function (event) { lcSwitchDrawerTab('competences') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-71]');
      if (!el) return;
      var handler = function (event) { lcSwitchDrawerTab('activities') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-72]');
      if (!el) return;
      var handler = function (event) { lcSwitchDrawerTab('wordbank') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-73]');
      if (!el) return;
      var handler = function (event) { lcOpenCompetenceCustomizeModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-74]');
      if (!el) return;
      var handler = function (event) { lcFilterDrawer() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-75]');
      if (!el) return;
      var handler = function (event) { lcFilterDrawer() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-76]');
      if (!el) return;
      var handler = function (event) { lcFilterDrawer() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-77]');
      if (!el) return;
      var handler = function (event) { lcOnDrawerCategoryChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-78]');
      if (!el) return;
      var handler = function (event) { lcFilterDrawer() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-79]');
      if (!el) return;
      var handler = function (event) { lcFilterDrawer() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-80]');
      if (!el) return;
      var handler = function (event) { lcOpenDescriptorDb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-81]');
      if (!el) return;
      var handler = function (event) { lcOpenDescriptorImporter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-82]');
      if (!el) return;
      var handler = function (event) { lcSetActivityPreset('detailed') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-83]');
      if (!el) return;
      var handler = function (event) { lcSetActivityPreset('compact') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-84]');
      if (!el) return;
      var handler = function (event) { lcSetActivityPreset('minimal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-85]');
      if (!el) return;
      var handler = function (event) { lcToggleAllActivitiesExpanded() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-86]');
      if (!el) return;
      var handler = function (event) { lcOpenActivityCustomizeModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-87]');
      if (!el) return;
      var handler = function (event) { lcOpenPhaseDb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-88]');
      if (!el) return;
      var handler = function (event) { lcFilterActivityDrawer() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-89]');
      if (!el) return;
      var handler = function (event) { lcFilterActivityDrawer() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-90]');
      if (!el) return;
      var handler = function (event) { lcFilterActivityDrawer() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-91]');
      if (!el) return;
      var handler = function (event) { lcFilterActivityDrawer() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-92]');
      if (!el) return;
      var handler = function (event) { lcFilterActivityDrawer() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-93]');
      if (!el) return;
      var handler = function (event) { lcOnWordBankFileChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-94]');
      if (!el) return;
      var handler = function (event) { lcFilterWordBankDrawer() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-95]');
      if (!el) return;
      var handler = function (event) { lcFilterWordBankDrawer() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-96]');
      if (!el) return;
      var handler = function (event) { lcFilterWordBankDrawer() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-97]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('competenceCustomizeModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-98]');
      if (!el) return;
      var handler = function (event) { lcOnPresetChange('detailed') };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-99]');
      if (!el) return;
      var handler = function (event) { lcOnPresetChange('compact') };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-100]');
      if (!el) return;
      var handler = function (event) { lcOnPresetChange('minimal') };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-101]');
      if (!el) return;
      var handler = function (event) { lcResetCompetenceConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-102]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('competenceCustomizeModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-103]');
      if (!el) return;
      var handler = function (event) { lcSaveCompetenceConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-104]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('activityCustomizeModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-105]');
      if (!el) return;
      var handler = function (event) { lcOnActivityPresetChange('detailed') };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-106]');
      if (!el) return;
      var handler = function (event) { lcOnActivityPresetChange('compact') };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-107]');
      if (!el) return;
      var handler = function (event) { lcOnActivityPresetChange('minimal') };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-108]');
      if (!el) return;
      var handler = function (event) { lcResetActivityConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-109]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('activityCustomizeModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-110]');
      if (!el) return;
      var handler = function (event) { lcSaveActivityConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-111]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('coverageModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-112]');
      if (!el) return;
      var handler = function (event) { lcRenderCoverageMatrix() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-113]');
      if (!el) return;
      var handler = function (event) { lcRenderCoverageMatrix() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-114]');
      if (!el) return;
      var handler = function (event) { lcOpenCompetencePortfolio() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-115]');
      if (!el) return;
      var handler = function (event) { lcExportCoverageCsv() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-116]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('coverageModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-117]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('teamModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-118]');
      if (!el) return;
      var handler = function (event) { lcOnTeamToggle() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-119]');
      if (!el) return;
      var handler = function (event) { lcAddTeamRole() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-120]');
      if (!el) return;
      var handler = function (event) { lcSaveTeamConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-121]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('pillsGuideModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-122]');
      if (!el) return;
      var handler = function (event) { lcSwitchPillsGuideTab('activities') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-123]');
      if (!el) return;
      var handler = function (event) { lcSwitchPillsGuideTab('modes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-124]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('pillsGuideModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-125]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('outlineModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-126]');
      if (!el) return;
      var handler = function (event) { lcAutoBalanceDurations() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-127]');
      if (!el) return;
      var handler = function (event) { lcReversePhases() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-128]');
      if (!el) return;
      var handler = function (event) { lcAddPhaseFromOutline() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-129]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('outlineModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-130]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('splitModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-131]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('splitModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-132]');
      if (!el) return;
      var handler = function (event) { lcApplySplitPhase() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-133]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('exportPlanModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-134]');
      if (!el) return;
      var handler = function (event) { lcSelectExportFormat('html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-135]');
      if (!el) return;
      var handler = function (event) { lcSelectExportFormat('pdf') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-136]');
      if (!el) return;
      var handler = function (event) { lcSelectExportFormat('docx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-137]');
      if (!el) return;
      var handler = function (event) { lcSelectExportFormat('xlsx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-138]');
      if (!el) return;
      var handler = function (event) { lcSelectExportFormat('ods') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-139]');
      if (!el) return;
      var handler = function (event) { lcSelectExportFormat('csv') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-140]');
      if (!el) return;
      var handler = function (event) { lcSelectExportFormat('json') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-141]');
      if (!el) return;
      var handler = function (event) { lcSelectExportFormat('text') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-142]');
      if (!el) return;
      var handler = function (event) { lcApplyExportPreset('full') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-143]');
      if (!el) return;
      var handler = function (event) { lcApplyExportPreset('teacher') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-144]');
      if (!el) return;
      var handler = function (event) { lcApplyExportPreset('student') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-145]');
      if (!el) return;
      var handler = function (event) { lcApplyExportPreset('outline') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-146]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-147]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-148]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-149]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-150]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-151]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-152]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-153]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-154]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-155]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-156]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-157]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-158]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-159]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-160]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-161]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-162]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-163]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-164]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-165]');
      if (!el) return;
      var handler = function (event) { lcSetExportCompFieldsPreset('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-166]');
      if (!el) return;
      var handler = function (event) { lcSetExportCompFieldsPreset('standard') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-167]');
      if (!el) return;
      var handler = function (event) { lcSetExportCompFieldsPreset('minimal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-168]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-169]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-170]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-171]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-172]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-173]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-174]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-175]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-176]');
      if (!el) return;
      var handler = function (event) { lcOnExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-177]');
      if (!el) return;
      var handler = function (event) { lcExportToggleAllPhases(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-178]');
      if (!el) return;
      var handler = function (event) { lcExportToggleAllPhases(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-179]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('exportPlanModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-180]');
      if (!el) return;
      var handler = function (event) { lcPreviewExportInBrowser() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-181]');
      if (!el) return;
      var handler = function (event) { lcExecuteCurrentExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-182]');
      if (!el) return;
      var handler = function (event) { lcCloseDestinationModal(null) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-183]');
      if (!el) return;
      var handler = function (event) { lcCloseDestinationModal('to-print') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-184]');
      if (!el) return;
      var handler = function (event) { lcCloseDestinationModal('custom') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-185]');
      if (!el) return;
      var handler = function (event) { lcCloseDestinationModal(null) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-186]');
      if (!el) return;
      var handler = function (event) { lcOpenPreviewInExternalBrowser() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-187]');
      if (!el) return;
      var handler = function (event) { lcPrintPreviewIframe() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-188]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('exportPreviewModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-189]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('exportPreviewModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-190]');
      if (!el) return;
      var handler = function (event) { lcExecuteFromPreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-191]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('copyTextModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-192]');
      if (!el) return;
      var handler = function (event) { lcApplyCopyTextPreset('full') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-193]');
      if (!el) return;
      var handler = function (event) { lcApplyCopyTextPreset('summary') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-194]');
      if (!el) return;
      var handler = function (event) { lcApplyCopyTextPreset('phasesOnly') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-195]');
      if (!el) return;
      var handler = function (event) { lcUpdateCopyTextPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-196]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-197]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-198]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-199]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-200]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-201]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-202]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-203]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-204]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-205]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-206]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-207]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-208]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-209]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-210]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-211]');
      if (!el) return;
      var handler = function (event) { lcOnCopyToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-212]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('copyTextModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-213]');
      if (!el) return;
      var handler = function (event) { lcDownloadPlanTxt() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-214]');
      if (!el) return;
      var handler = function (event) { lcExecuteCopyToClipboard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-215]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('boardExportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-216]');
      if (!el) return;
      var handler = function (event) { lcOnBoardModeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-217]');
      if (!el) return;
      var handler = function (event) { lcOnBoardModeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-218]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('boardExportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-219]');
      if (!el) return;
      var handler = function (event) { lcExecuteBoardExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-220]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('soundModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-221]');
      if (!el) return;
      var handler = function (event) { lcPreviewSound() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-222]');
      if (!el) return;
      var handler = function (event) { lcSaveSoundSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-223]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('templateModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-224]');
      if (!el) return;
      var handler = function (event) { lcSaveAsTemplate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-225]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('templateModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-226]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('openPlanModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-227]');
      if (!el) return;
      var handler = function (event) { lcFilterSavedPlans() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-228]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('openPlanModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-229]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('sequenceModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-230]');
      if (!el) return;
      var handler = function (event) { lcOnSavedSequenceSelectChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-231]');
      if (!el) return;
      var handler = function (event) { lcOpenSelectedSequence() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-232]');
      if (!el) return;
      var handler = function (event) { lcStartNewSequence() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-233]');
      if (!el) return;
      var handler = function (event) { lcSaveSequence() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-234]');
      if (!el) return;
      var handler = function (event) { lcCreateTestForUnit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-235]');
      if (!el) return;
      var handler = function (event) { lcOpenSequenceExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-236]');
      if (!el) return;
      var handler = function (event) { lcSetSeqPickerFilterType('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-237]');
      if (!el) return;
      var handler = function (event) { lcSetSeqPickerFilterType('lessons') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-238]');
      if (!el) return;
      var handler = function (event) { lcSetSeqPickerFilterType('tests') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-239]');
      if (!el) return;
      var handler = function (event) { lcFilterSeqPicker() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-240]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('sequenceModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-241]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('sequenceExportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-242]');
      if (!el) return;
      var handler = function (event) { lcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-243]');
      if (!el) return;
      var handler = function (event) { lcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-244]');
      if (!el) return;
      var handler = function (event) { lcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-245]');
      if (!el) return;
      var handler = function (event) { lcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-246]');
      if (!el) return;
      var handler = function (event) { lcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-247]');
      if (!el) return;
      var handler = function (event) { lcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-248]');
      if (!el) return;
      var handler = function (event) { lcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-249]');
      if (!el) return;
      var handler = function (event) { lcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-250]');
      if (!el) return;
      var handler = function (event) { lcOnSeqCssThemeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-251]');
      if (!el) return;
      var handler = function (event) { lcOnSeqCssThemeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-252]');
      if (!el) return;
      var handler = function (event) { lcOnSeqCssThemeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-253]');
      if (!el) return;
      var handler = function (event) { lcSwitchSeqExportTab('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-254]');
      if (!el) return;
      var handler = function (event) { lcSwitchSeqExportTab('toc') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-255]');
      if (!el) return;
      var handler = function (event) { lcSwitchSeqExportTab('lessons') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-256]');
      if (!el) return;
      var handler = function (event) { lcSwitchSeqExportTab('tests') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-257]');
      if (!el) return;
      var handler = function (event) { lcOnSeqAnswerKeysChange(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-258]');
      if (!el) return;
      var handler = function (event) { lcApplySeqLessonPreset('full') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-259]');
      if (!el) return;
      var handler = function (event) { lcApplySeqLessonPreset('teacher') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-260]');
      if (!el) return;
      var handler = function (event) { lcApplySeqLessonPreset('student') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-261]');
      if (!el) return;
      var handler = function (event) { lcApplySeqLessonPreset('outline') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-262]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('sequenceExportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-263]');
      if (!el) return;
      var handler = function (event) { lcPreviewSequenceExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-264]');
      if (!el) return;
      var handler = function (event) { lcExecuteSequenceExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-265]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('descriptorImportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-266]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('descriptorImportModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-267]');
      if (!el) return;
      var handler = function (event) { lcExecuteDescriptorImport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-268]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('exportPhaseModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-269]');
      if (!el) return;
      var handler = function (event) { lcOnExportFileChoiceChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-270]');
      if (!el) return;
      var handler = function (event) { document.getElementById('exportChoiceNew').checked = true; lcOnExportFileChoiceChange(); };
      el.addEventListener('focus', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-271]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('exportPhaseModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-272]');
      if (!el) return;
      var handler = function (event) { lcConfirmExportPhase() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-273]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('phaseMindmapModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-274]');
      if (!el) return;
      var handler = function (event) { lcOnPhaseMindmapFileChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-275]');
      if (!el) return;
      var handler = function (event) { lcRemovePhaseMindmapLink() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-276]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('phaseMindmapModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-277]');
      if (!el) return;
      var handler = function (event) { lcSavePhaseMindmapLink() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-278]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('plannerLinkModal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-279]');
      if (!el) return;
      var handler = function (event) { lcFilterPlannerSlotsList() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-280]');
      if (!el) return;
      var handler = function (event) { lcFilterPlannerSlotsList() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-281]');
      if (!el) return;
      var handler = function (event) { lcUnlinkPlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-lcev-282]');
      if (!el) return;
      var handler = function (event) { lcCloseModal('plannerLinkModal') };
      el.addEventListener('click', handler);
    })();

    // Delegated handlers for dynamically rendered UI
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-lc-action]');
      if (!el) return;
      var act = el.getAttribute('data-lc-action');
      var idx = parseInt(el.getAttribute('data-lc-idx'), 10);
      var delta = parseInt(el.getAttribute('data-lc-delta'), 10);
      var val = el.getAttribute('data-lc-val') || '';
      var cf = el.getAttribute('data-lc-cf') || '';

      switch (act) {
        case 'remove-tag': lcRemoveTag(idx); break;
        case 'move-top': lcMovePhaseToTop(idx); break;
        case 'move-bottom': lcMovePhaseToBottom(idx); break;
        case 'move-rel': lcMovePhaseRelative(idx, delta); break;
        case 'move-rel-stop': e.stopPropagation(); lcMovePhaseRelative(idx, delta); break;
        case 'outline-dup': lcDuplicatePhase(idx); renderOutlineModalList(); break;
        case 'outline-del': lcDeletePhase(idx); renderOutlineModalList(); break;
        case 'cf-fmt': lcSetCustomFieldFormat(idx, cf, val); break;
        case 'cf-view': lcToggleCustomFieldView(idx, cf, val); break;
        case 'cf-dup-all': lcDuplicateCustomFieldToAll(idx, cf); break;
        case 'cf-remove': lcRemoveCustomField(idx, cf); break;
        case 'toggle-expand': lcTogglePhaseExpand(idx); break;
        case 'open-mindmap': lcOpenPhaseMindmapLink(idx); break;
        case 'open-export-phase': lcOpenExportPhaseModal(idx); break;
        case 'open-split': lcOpenSplitModal(idx); break;
        case 'dup-phase': lcDuplicatePhase(idx); break;
        case 'del-phase': lcDeletePhase(idx); break;
        case 'pills-guide': lcOpenPillsGuideModal(val); break;
        case 'add-cf': lcAddCustomField(idx); break;
        case 'toggle-act': lcTogglePhaseActivity(idx, val); break;
        case 'toggle-mode': lcTogglePhaseMode(idx, val); break;
        case 'open-detail': lcOpenDetailPopover(e, idx, val); break;
        case 'remove-desc': e.stopPropagation(); lcRemoveDescriptorFromPhase(idx, val); break;
        case 'clear-filter': lcClearActiveFilter(val); break;
        case 'reset-drawer-filters': lcResetAllDrawerFilters(); break;
        case 'tag-desc': lcTagDescriptorToActivePhase(val); break;
        case 'expand-desc-card':
          e.stopPropagation();
          el.parentElement.classList.toggle('expanded');
          el.textContent = el.parentElement.classList.contains('expanded') ? 'Details ▲' : 'Details ▾';
          break;
        case 'open-phase-db': lcOpenPhaseDb(); break;
        case 'toggle-act-card': e.stopPropagation(); lcToggleSingleActivityCard(el); break;
        case 'insert-bank-phase': e.stopPropagation(); lcInsertPhaseFromBank(val); break;
        case 'remove-team-role': lcRemoveTeamRole(idx); break;
        case 'open-seq-test': lcOpenSequenceMemberTest(val, el.getAttribute('data-lc-file') || ''); break;
        case 'open-seq-lesson': lcOpenSequenceMemberLesson(val); break;
        case 'seq-move': lcMoveLessonInSequence(idx, delta); break;
        case 'seq-remove': lcRemoveLessonFromSequence(idx); break;
        case 'seq-add': lcAddLessonToSequence(val, el.getAttribute('data-lc-type') || ''); break;
        case 'select-planner-slot':
          lcSelectPlannerSlot(
            el.getAttribute('data-lc-id') || '',
            el.getAttribute('data-lc-date') || '',
            el.getAttribute('data-lc-time') || '',
            el.getAttribute('data-lc-class') || '',
            el.getAttribute('data-lc-topic') || ''
          );
          break;
        case 'insert-wb-item': lcInsertWordBankItemToPhase(idx); break;
        case 'del-custom-tpl': lcDeleteCustomTemplate(val, e); break;
      }
    });

    document.addEventListener('input', function (e) {
      var el = e.target.closest('[data-lc-input]');
      if (!el) return;
      var act = el.getAttribute('data-lc-input');
      var idx = parseInt(el.getAttribute('data-lc-idx'), 10);
      var cf = el.getAttribute('data-lc-cf') || '';
      if (act === 'outline-title') {
        lcOnPhaseTitleChange(idx, el.value);
        if (document.getElementById('outlinePacingBar')) renderOutlineModalList();
      } else if (act === 'outline-duration') {
        lcOnPhaseDurationChange(idx, el.value);
        renderOutlineModalList();
      } else if (act === 'cf-title') {
        lcOnCustomFieldTitleChange(idx, cf, el.value);
      } else if (act === 'cf-content') {
        lcOnCustomFieldContentChange(idx, cf, el.value);
        lcAutoResizeField(el);
      } else if (act === 'phase-title') {
        lcOnPhaseTitleChange(idx, el.value);
      } else if (act === 'phase-duration') {
        lcOnPhaseDurationChange(idx, el.value);
      } else if (act === 'phase-field') {
        lcOnPhaseFieldChange(idx, el.getAttribute('data-lc-field') || '', el.value);
        lcAutoResizeField(el);
      }
    });

    document.addEventListener('change', function (e) {
      var el = e.target.closest('[data-lc-change]');
      if (!el) return;
      var act = el.getAttribute('data-lc-change');
      var idx = parseInt(el.getAttribute('data-lc-idx'), 10);
      if (act === 'detail-line') lcToggleDetailLine(el);
      else if (act === 'export-file-choice') lcOnExportFileChoiceChange();
      else if (act === 'team-role-name' && window.tempTeamRoles && window.tempTeamRoles[idx]) window.tempTeamRoles[idx].name = el.value;
      else if (act === 'team-role-desc' && window.tempTeamRoles && window.tempTeamRoles[idx]) window.tempTeamRoles[idx].desc = el.value;
    });

    document.addEventListener('dragstart', function (e) {
      var el = e.target.closest('[data-lc-wb-drag]');
      if (!el || !e.dataTransfer) return;
      var origIdx = parseInt(el.getAttribute('data-lc-wb-drag'), 10);
      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'wordbank-item', itemIdx: origIdx }));
      e.dataTransfer.setData('text/plain', 'wordbank:' + origIdx);
      e.dataTransfer.effectAllowed = 'copy';
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
