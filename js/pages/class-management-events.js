// Migrated static HTML event handlers from pages/class-management.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-cmev-1]');
      if (!el) return;
      var handler = function (event) { openDatetimeOverlay() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-2]');
      if (!el) return;
      var handler = function (event) { toggleObjectivesBar() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-3]');
      if (!el) return;
      var handler = function (event) { toggleDbPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-4]');
      if (!el) return;
      var handler = function (event) { toggleSettingsPopup(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-5]');
      if (!el) return;
      var handler = function (event) { openRemoteModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-6]');
      if (!el) return;
      var handler = function (event) { openCmsShortcutsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-7]');
      if (!el) return;
      var handler = function (event) { startCmsTutorial() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-8]');
      if (!el) return;
      var handler = function (event) { handleRosterContextAction('highlight') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-9]');
      if (!el) return;
      var handler = function (event) { handleRosterContextAction('absent') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-10]');
      if (!el) return;
      var handler = function (event) { handleRosterContextAction('exam-session') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-11]');
      if (!el) return;
      var handler = function (event) { clearStudentManualFlags(rosterContextStudentId) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-12]');
      if (!el) return;
      var handler = function (event) { openRoleChangePopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-13]');
      if (!el) return;
      var handler = function (event) { openStudentStatsPopup(rosterContextStudentId) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-14]');
      if (!el) return;
      var handler = function (event) { openInParticipationTracker(rosterContextStudentId) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-15]');
      if (!el) return;
      var handler = function (event) { openStudentDossierPopup(rosterContextStudentId) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-16]');
      if (!el) return;
      var handler = function (event) { openStudentGradesPopup(rosterContextStudentId) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-17]');
      if (!el) return;
      var handler = function (event) { openInGradeSheet(rosterContextStudentId) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-18]');
      if (!el) return;
      var handler = function (event) { copyRosterPlainText() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.getElementById('ctx-badges-grid');
      if (!el) return;
      el.addEventListener('click', function (event) {
        if (typeof handleRosterContextBadgeClick === 'function') {
          handleRosterContextBadgeClick(event);
        }
      });
    })();
    (function () {
      var el = document.querySelector('[data-cmev-19]');
      if (!el) return;
      var handler = function (event) { closeMp3Picker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-20]');
      if (!el) return;
      var handler = function (event) { closeDbPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-21]');
      if (!el) return;
      var handler = function (event) { openTimeMachine(); closeDbPopup(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-22]');
      if (!el) return;
      var handler = function (event) { openHistoryModal(); closeDbPopup(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-23]');
      if (!el) return;
      var handler = function (event) { copyData() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-24]');
      if (!el) return;
      var handler = function (event) { exportToCSV() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-25]');
      if (!el) return;
      var handler = function (event) { saveAllToDb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-26]');
      if (!el) return;
      var handler = function (event) { saveDbToFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-27]');
      if (!el) return;
      var handler = function (event) { downloadData() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-28]');
      if (!el) return;
      var handler = function (event) { uploadData() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-29]');
      if (!el) return;
      var handler = function (event) { exportDb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-30]');
      if (!el) return;
      var handler = function (event) { importDb(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-31]');
      if (!el) return;
      var handler = function (event) { clearDbLocalStorage() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-32]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeSettingsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-33]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-34]');
      if (!el) return;
      var handler = function (event) { closeSettingsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-35]');
      if (!el) return;
      var handler = function (event) { switchSettingsTab('general') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-36]');
      if (!el) return;
      var handler = function (event) { switchSettingsTab('teams') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-37]');
      if (!el) return;
      var handler = function (event) { switchSettingsTab('badges') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-38]');
      if (!el) return;
      var handler = function (event) { switchSettingsTab('sounds') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-39]');
      if (!el) return;
      var handler = function (event) { switchSettingsTab('modes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-40]');
      if (!el) return;
      var handler = function (event) { switchSettingsTab('roles') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-41]');
      if (!el) return;
      var handler = function (event) { switchSettingsTab('autoflag') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-42]');
      if (!el) return;
      var handler = function (event) { switchSettingsTab('shortcuts') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-43]');
      if (!el) return;
      var handler = function (event) { saveNameDisplayMode(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-44]');
      if (!el) return;
      var handler = function (event) { saveNameDisplayMode(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-45]');
      if (!el) return;
      var handler = function (event) { saveNameDisplayMode(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-46]');
      if (!el) return;
      var handler = function (event) { saveNameDisplayMode(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-47]');
      if (!el) return;
      var handler = function (event) { setRosterSortOrder(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-48]');
      if (!el) return;
      var handler = function (event) { setRosterSortOrder(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-49]');
      if (!el) return;
      var handler = function (event) { setLessonRunnerLayout(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-50]');
      if (!el) return;
      var handler = function (event) { setLessonRunnerLayout(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-51]');
      if (!el) return;
      var handler = function (event) { setLessonRunnerLayout(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-52]');
      if (!el) return;
      var handler = function (event) { closeSettingsModal(); openAppLink('import-tool.html'); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-53]');
      if (!el) return;
      var handler = function (event) { closeSettingsModal(); openAppLink('group-editor.html'); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-54]');
      if (!el) return;
      var handler = function (event) { closeSettingsModal(); Desktop.openTool('class-plan.html', selectedGroupName ? { query: { classId: selectedGroupName } } : undefined); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-55]');
      if (!el) return;
      var handler = function (event) { closeSettingsModal(); openManageDatabase(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-56]');
      if (!el) return;
      var handler = function (event) { addTeamDefinitionRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-57]');
      if (!el) return;
      var handler = function (event) { saveTeamSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-58]');
      if (!el) return;
      var handler = function (event) { resetTeamSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-59]');
      if (!el) return;
      var handler = function (event) { onEditBadgesSetChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-60]');
      if (!el) return;
      var handler = function (event) { openManageDatabaseForBadges() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-61]');
      if (!el) return;
      var handler = function (event) { selectAllClassesForBadgeSet(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-62]');
      if (!el) return;
      var handler = function (event) { selectAllClassesForBadgeSet(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-63]');
      if (!el) return;
      var handler = function (event) { addBadgeDefinitionRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-64]');
      if (!el) return;
      var handler = function (event) { saveBadgeSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-65]');
      if (!el) return;
      var handler = function (event) { resetBadgeSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-66]');
      if (!el) return;
      var handler = function (event) { importSoundFiles() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-67]');
      if (!el) return;
      var handler = function (event) { refreshSoundFileList(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-68]');
      if (!el) return;
      var handler = function (event) { saveSoundSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-69]');
      if (!el) return;
      var handler = function (event) { resetSoundSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-70]');
      if (!el) return;
      var handler = function (event) { onModeSetChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-71]');
      if (!el) return;
      var handler = function (event) { toggleModeSetDefaultAll(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-72]');
      if (!el) return;
      var handler = function (event) { openManageDatabaseForModes() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-73]');
      if (!el) return;
      var handler = function (event) { createNewMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-74]');
      if (!el) return;
      var handler = function (event) { copyConfigModesToDatabaseFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-75]');
      if (!el) return;
      var handler = function (event) { resetModesToDefault() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-76]');
      if (!el) return;
      var handler = function (event) { addLibraryRole() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-77]');
      if (!el) return;
      var handler = function (event) { saveRolesLibrary(); showToast('Roles saved'); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-78]');
      if (!el) return;
      var handler = function (event) { resetRolesToDefault() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-79]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); document.getElementById('af-tl-weeks').checked=true; };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-80]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); document.getElementById('af-tl-date').checked=true; };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-81]');
      if (!el) return;
      var handler = function (event) { addAutoFlagRule() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-82]');
      if (!el) return;
      var handler = function (event) { saveAutoFlagSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-83]');
      if (!el) return;
      var handler = function (event) { resetAutoFlagRules() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-84]');
      if (!el) return;
      var handler = function (event) { filterShortcutsTable() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-85]');
      if (!el) return;
      var handler = function (event) { filterShortcutsTable() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-86]');
      if (!el) return;
      var handler = function (event) { resetCmsShortcutsToDefault() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-87]');
      if (!el) return;
      var handler = function (event) { startupLoadDbFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-88]');
      if (!el) return;
      var handler = function (event) { startupLoadDbFolder() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-89]');
      if (!el) return;
      var handler = function (event) { dismissStartupBanner() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-90]');
      if (!el) return;
      var handler = function (event) { startupImportDbFromInput(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-91]');
      if (!el) return;
      var handler = function (event) { startupImportDbFromInput(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-92]');
      if (!el) return;
      var handler = function (event) { toggleClassSelectionPopup(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-93]');
      if (!el) return;
      var handler = function (event) { closeClassSelectionPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-94]');
      if (!el) return;
      var handler = function (event) { handleGroupSearch(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-95]');
      if (!el) return;
      var handler = function (event) { toggleGroupView() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-96]');
      if (!el) return;
      var handler = function (event) { toggleTimerPopup(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-97]');
      if (!el) return;
      var handler = function (event) { closeTimerPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-98]');
      if (!el) return;
      var handler = function (event) { setTimerMode('timer') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-99]');
      if (!el) return;
      var handler = function (event) { setTimerMode('stopwatch') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-100]');
      if (!el) return;
      var handler = function (event) { setTimerMode('interval') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-101]');
      if (!el) return;
      var handler = function (event) { openTimerFullscreen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-102]');
      if (!el) return;
      var handler = function (event) { detachTimerWindow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-103]');
      if (!el) return;
      var handler = function (event) { onTimerBeepsInputChanged(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-104]');
      if (!el) return;
      var handler = function (event) { onTimerBeepsInputChanged(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-105]');
      if (!el) return;
      var handler = function (event) { setTimerQuickPreset(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-106]');
      if (!el) return;
      var handler = function (event) { setTimerQuickPreset(3) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-107]');
      if (!el) return;
      var handler = function (event) { setTimerQuickPreset(5) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-108]');
      if (!el) return;
      var handler = function (event) { setTimerQuickPreset(10) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-109]');
      if (!el) return;
      var handler = function (event) { setTimerQuickPreset(15) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-110]');
      if (!el) return;
      var handler = function (event) { onIntervalPresetSelected(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-111]');
      if (!el) return;
      var handler = function (event) { saveIntervalPreset() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.getElementById('interval-import-plan-btn');
      if (!el) return;
      el.addEventListener('click', function () {
        if (typeof window.importLessonPlanToSequence === 'function') {
          window.importLessonPlanToSequence();
        }
      });
    })();
    (function () {
      var el = document.querySelector('[data-cmev-112]');
      if (!el) return;
      var handler = function (event) { deleteIntervalPreset() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-113]');
      if (!el) return;
      var handler = function (event) { addIntervalStep() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-114]');
      if (!el) return;
      var handler = function (event) { updateIntervalCycles(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-115]');
      if (!el) return;
      var handler = function (event) { updateIntervalCycles(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-116]');
      if (!el) return;
      var handler = function (event) { toggleIntervalInfinite() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-117]');
      if (!el) return;
      var handler = function (event) { popupStartTimer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-118]');
      if (!el) return;
      var handler = function (event) { timerTogglePause() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-119]');
      if (!el) return;
      var handler = function (event) { timerSubtract30s() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-120]');
      if (!el) return;
      var handler = function (event) { timerAdd30s() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-121]');
      if (!el) return;
      var handler = function (event) { intervalSkipStep() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-122]');
      if (!el) return;
      var handler = function (event) { popupStopTimer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-123]');
      if (!el) return;
      var handler = function (event) { toggleScoreMute() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-124]');
      if (!el) return;
      var handler = function (event) { toggleWhiteNoise() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-125]');
      if (!el) return;
      var handler = function (event) { setNoiseType('white') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-126]');
      if (!el) return;
      var handler = function (event) { setNoiseType('pink') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-127]');
      if (!el) return;
      var handler = function (event) { setNoiseType('brown') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-128]');
      if (!el) return;
      var handler = function (event) { showMp3Picker(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-129]');
      if (!el) return;
      var handler = function (event) { toggleWhiteNoiseMute() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-130]');
      if (!el) return;
      var handler = function (event) { setWhiteNoiseVolume(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-131]');
      if (!el) return;
      var handler = function (event) { openModeManager() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-132]');
      if (!el) return;
      var handler = function (event) { restoreMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-133]');
      if (!el) return;
      var handler = function (event) { closeMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-134]');
      if (!el) return;
      var handler = function (event) { activateMode('quiet') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-135]');
      if (!el) return;
      var handler = function (event) { activateMode('conversation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-136]');
      if (!el) return;
      var handler = function (event) { activateMode('group') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-137]');
      if (!el) return;
      var handler = function (event) { toggleCmsPresentationFromHub() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-138]');
      if (!el) return;
      var handler = function (event) { toggleFreezePresentation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-139]');
      if (!el) return;
      var handler = function (event) { toggleAlwaysOnTopPresentation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-140]');
      if (!el) return;
      var handler = function (event) { cmsPresentationResizeWindow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-141]');
      if (!el) return;
      var handler = function (event) { cmsPresentationDefaultSize() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-142]');
      if (!el) return;
      var handler = function (event) { cmsPresentationMaximize() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-143]');
      if (!el) return;
      var handler = function (event) { cmsPresentationDockLeft() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-144]');
      if (!el) return;
      var handler = function (event) { cmsPresentationDockRight() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-145]');
      if (!el) return;
      var handler = function (event) { cmsPresentationClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-146]');
      if (!el) return;
      var handler = function (event) { toggleRosterSettingsPopup(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-147]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-148]');
      if (!el) return;
      var handler = function (event) { switchRosterSettingsTab(event, 'display') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-149]');
      if (!el) return;
      var handler = function (event) { switchRosterSettingsTab(event, 'grouping') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-150]');
      if (!el) return;
      var handler = function (event) { switchRosterSettingsTab(event, 'tools') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-151]');
      if (!el) return;
      var handler = function (event) { changeNameSize(-1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-152]');
      if (!el) return;
      var handler = function (event) { resetNameSize() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-153]');
      if (!el) return;
      var handler = function (event) { changeNameSize(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-154]');
      if (!el) return;
      var handler = function (event) { setRosterSortOrder('first') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-155]');
      if (!el) return;
      var handler = function (event) { setRosterSortOrder('last') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-156]');
      if (!el) return;
      var handler = function (event) { toggleScoreMute() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-157]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); toggleSenVisibility() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-158]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); toggleRolesVisibility() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-159]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); toggleBadgesVisibility() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-160]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); toggleAutoFlagVisibility() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-161]');
      if (!el) return;
      var handler = function (event) { toggleAnimations() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-162]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); toggleRosterPlanView() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-163]');
      if (!el) return;
      var handler = function (event) { setLessonRunnerLayout('compact') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-164]');
      if (!el) return;
      var handler = function (event) { setLessonRunnerLayout('collapsible') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-165]');
      if (!el) return;
      var handler = function (event) { setLessonRunnerLayout('single') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-166]');
      if (!el) return;
      var handler = function (event) { openCmsPresentation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-167]');
      if (!el) return;
      var handler = function (event) { toggleFreezePresentation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-168]');
      if (!el) return;
      var handler = function (event) { cmsPresentationClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-169]');
      if (!el) return;
      var handler = function (event) { cmsPresentationFullscreen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-170]');
      if (!el) return;
      var handler = function (event) { cmsPresentationMaximize() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-171]');
      if (!el) return;
      var handler = function (event) { cmsPresentationMinimize() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-172]');
      if (!el) return;
      var handler = function (event) { cmsPresentationDockRight() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-173]');
      if (!el) return;
      var handler = function (event) { changePresentationNameSize(-1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-174]');
      if (!el) return;
      var handler = function (event) { resetPresentationNameSize() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-175]');
      if (!el) return;
      var handler = function (event) { changePresentationNameSize(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-176]');
      if (!el) return;
      var handler = function (event) { togglePresSetting('sen') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-177]');
      if (!el) return;
      var handler = function (event) { togglePresSetting('roles') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-178]');
      if (!el) return;
      var handler = function (event) { togglePresSetting('badges') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-179]');
      if (!el) return;
      var handler = function (event) { togglePresSetting('autoflag') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-180]');
      if (!el) return;
      var handler = function (event) { togglePresSetting('anim') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-181]');
      if (!el) return;
      var handler = function (event) { togglePresSetting('plan') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-182]');
      if (!el) return;
      var handler = function (event) { togglePresSetting('lessonPlan') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-183]');
      if (!el) return;
      var handler = function (event) { togglePresSetting('modes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-184]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); createTeams() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-185]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); reshuffleTeams() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-186]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); clearTeams() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-187]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); openAssignedRolesInfo() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-188]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); openRolesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-189]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); reassignRolesFromUtility() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-190]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); clearAssignedRolesFromUtility() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-191]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); addStudentToGroup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-192]');
      if (!el) return;
      var handler = function (event) { copyRosterPlainText() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-193]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); openResultsRankingModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-194]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); manualResetFull() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-195]');
      if (!el) return;
      var handler = function (event) { closeRosterSettingsPopup(); resetStrikesOnly() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-196]');
      if (!el) return;
      var handler = function (event) { toggleTimerPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-197]');
      if (!el) return;
      var handler = function (event) { CmsLessonRunner.startActivityNow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-198]');
      if (!el) return;
      var handler = function (event) { CmsLessonRunner.prevPhase() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-199]');
      if (!el) return;
      var handler = function (event) { CmsLessonRunner.nextPhase() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-200]');
      if (!el) return;
      var handler = function (event) { CmsLessonRunner.completePhase() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.getElementById('clr-load-sequence-btn');
      if (!el) return;
      el.addEventListener('click', function () {
        if (window.CmsLessonRunner && typeof CmsLessonRunner.sendToSequenceTimer === 'function') {
          CmsLessonRunner.sendToSequenceTimer(false);
        }
      });
    })();
    (function () {
      var el = document.querySelector('[data-cmev-201]');
      if (!el) return;
      var handler = function (event) { CmsLessonRunner.toggleCollapse() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-202]');
      if (!el) return;
      var handler = function (event) { CmsLessonRunner.unloadPlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-203]');
      if (!el) return;
      var handler = function (event) { CmsLessonRunner.dismissDetectedModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-204]');
      if (!el) return;
      var handler = function (event) { CmsLessonRunner.dismissDetectedModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-205]');
      if (!el) return;
      var handler = function (event) { openObjectivesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-206]');
      if (!el) return;
      var handler = function (event) { openObjectivesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-207]');
      if (!el) return;
      var handler = function (event) { openEditBadgesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-208]');
      if (!el) return;
      var handler = function (event) { cmsOpenLinkedPlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-209]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); cmsOpenLinkedPlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-210]');
      if (!el) return;
      var handler = function (event) { cpAutoGroupByTeams() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-211]');
      if (!el) return;
      var handler = function (event) { cpResetToOriginalPlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-212]');
      if (!el) return;
      var handler = function (event) { cpSavePlanSeats() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-213]');
      if (!el) return;
      var handler = function (event) { openLinkedGradeSheetForSession() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-214]');
      if (!el) return;
      var handler = function (event) { toggleExamSessionMode(selectedGroupName) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-215]');
      if (!el) return;
      var handler = function (event) { pickStudent() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-216]');
      if (!el) return;
      var handler = function (event) { pickTeam() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-217]');
      if (!el) return;
      var handler = function (event) { toggleHelp() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-218]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-219]');
      if (!el) return;
      var handler = function (event) { toggleHelp() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-220]');
      if (!el) return;
      var handler = function (event) { closeResultsRankingModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-221]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-222]');
      if (!el) return;
      var handler = function (event) { closeResultsRankingModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-223]');
      if (!el) return;
      var handler = function (event) { setOverlayView('timer') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-224]');
      if (!el) return;
      var handler = function (event) { setOverlayView('stopwatch') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-225]');
      if (!el) return;
      var handler = function (event) { setOverlayView('clock') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-226]');
      if (!el) return;
      var handler = function (event) { toggleOverlayMergedView() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-227]');
      if (!el) return;
      var handler = function (event) { toggleOverlayTheaterMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-228]');
      if (!el) return;
      var handler = function (event) { toggleOverlayNoisePanel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-229]');
      if (!el) return;
      var handler = function (event) { closeTimerFullscreen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.getElementById('timer-overlay-minimize-btn');
      if (!el) return;
      el.addEventListener('click', function () { minimizeTimerFullscreen(); });
    })();
    (function () {
      var pill = document.getElementById('timer-minimized-pill');
      if (pill) {
        pill.addEventListener('click', function () { restoreTimerFullscreen(); });
      }
      var restoreBtn = document.querySelector('#timer-minimized-pill .timer-pill-restore-btn');
      if (restoreBtn) {
        restoreBtn.addEventListener('click', function (event) { event.stopPropagation(); restoreTimerFullscreen(); });
      }
      var closeBtn = document.querySelector('#timer-minimized-pill .timer-pill-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', function (event) { event.stopPropagation(); closeTimerFullscreen(); });
      }
    })();
    (function () {
      var el = document.querySelector('[data-cmev-230]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('white', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-231]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('pink', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-232]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('brown', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-233]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('file', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-234]');
      if (!el) return;
      var handler = function (event) { overlayNoiseVolume(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-235]');
      if (!el) return;
      var handler = function (event) { closeTeamModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-236]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-237]');
      if (!el) return;
      var handler = function (event) { closeTeamModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-238]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(1, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-239]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(2, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-240]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(3, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-241]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(4, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-242]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(5, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-243]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(6, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-244]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(7, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-245]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(8, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-246]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(9, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-247]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(10, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-248]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(11, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-249]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(12, 'total') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-250]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(1, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-251]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(2, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-252]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(3, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-253]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(4, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-254]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(5, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-255]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(6, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-256]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(7, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-257]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(8, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-258]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(9, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-259]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(10, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-260]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(11, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-261]');
      if (!el) return;
      var handler = function (event) { processTeamCreation(12, 'perTeam') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-262]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-263]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(2) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-264]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(3) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-265]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(4) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-266]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(5) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-267]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(6) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-268]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(7) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-269]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(8) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-270]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(9) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-271]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(10) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-272]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(11) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-273]');
      if (!el) return;
      var handler = function (event) { processEmptyTeamCreation(12) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-274]');
      if (!el) return;
      var handler = function (event) { saveCurrentTeamSetup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-275]');
      if (!el) return;
      var handler = function (event) { closeTeamModal(); reshuffleTeams() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-276]');
      if (!el) return;
      var handler = function (event) { closeTeamModal(); clearTeams() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-277]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-278]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-279]');
      if (!el) return;
      var handler = function (event) { document.getElementById('roles-modal').style.display='none' };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-280]');
      if (!el) return;
      var handler = function (event) { assignRoles() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-281]');
      if (!el) return;
      var handler = function (event) { assignRandomRanks() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-282]');
      if (!el) return;
      var handler = function (event) { saveCurrentRolesSetup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-283]');
      if (!el) return;
      var handler = function (event) { clearAllRoles() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-284]');
      if (!el) return;
      var handler = function (event) { closeAssignedRolesInfo() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-285]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-286]');
      if (!el) return;
      var handler = function (event) { closeAssignedRolesInfo() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-287]');
      if (!el) return;
      var handler = function (event) { closeHistoryModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-288]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-289]');
      if (!el) return;
      var handler = function (event) { closeHistoryModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-290]');
      if (!el) return;
      var handler = function (event) { exportHistoryCSV() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-291]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111';this.style.color='#fff' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-292]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#111' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-293]');
      if (!el) return;
      var handler = function (event) { clearHistory() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-294]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111';this.style.color='#fff';this.style.borderColor='#111' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-295]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#888';this.style.borderColor='#ccc' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-296]');
      if (!el) return;
      var handler = function (event) { document.getElementById('role-change-popup').classList.remove('open') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-297]');
      if (!el) return;
      var handler = function (event) { closeStudentStatsPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-298]');
      if (!el) return;
      var handler = function (event) { closeStudentGradesPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-299]');
      if (!el) return;
      var handler = function (event) { saveComment() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-300]');
      if (!el) return;
      var handler = function (event) { closeCommentPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-301]');
      if (!el) return;
      var handler = function (event) { closeObjectivesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-302]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-303]');
      if (!el) return;
      var handler = function (event) { closeObjectivesModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-304]');
      if (!el) return;
      var handler = function (event) { saveObjectives() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-305]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#111' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-306]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111';this.style.color='#fff' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-307]');
      if (!el) return;
      var handler = function (event) { clearObjectives() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-308]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111';this.style.color='#fff';this.style.borderColor='#111' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-309]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#888';this.style.borderColor='#ccc' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-310]');
      if (!el) return;
      var handler = function (event) { closeAddStudentsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-311]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-312]');
      if (!el) return;
      var handler = function (event) { closeAddStudentsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-313]');
      if (!el) return;
      var handler = function (event) { autoResizeEgStudents(this) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-314]');
      if (!el) return;
      var handler = function (event) { confirmAddStudents() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-315]');
      if (!el) return;
      var handler = function (event) { this.style.background='#fff';this.style.color='#111' };
      el.addEventListener('mouseover', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-316]');
      if (!el) return;
      var handler = function (event) { this.style.background='#111';this.style.color='#fff' };
      el.addEventListener('mouseout', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-317]');
      if (!el) return;
      var handler = function (event) { closeAddStudentsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-318]');
      if (!el) return;
      var handler = function (event) { closeModePicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-319]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-320]');
      if (!el) return;
      var handler = function (event) { closeModePicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-321]');
      if (!el) return;
      var handler = function (event) { activateMode('quiet') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-322]');
      if (!el) return;
      var handler = function (event) { activateMode('conversation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-323]');
      if (!el) return;
      var handler = function (event) { activateMode('group') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-324]');
      if (!el) return;
      var handler = function (event) { closeModePicker(); openModeManager(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-325]');
      if (!el) return;
      var handler = function (event) { closeModeEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-326]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-327]');
      if (!el) return;
      var handler = function (event) { closeModeEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-328]');
      if (!el) return;
      var handler = function (event) { switchModeEditorTab('general', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-329]');
      if (!el) return;
      var handler = function (event) { switchModeEditorTab('text', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-330]');
      if (!el) return;
      var handler = function (event) { switchModeEditorTab('picture', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-331]');
      if (!el) return;
      var handler = function (event) { switchModeEditorTab('sound', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-332]');
      if (!el) return;
      var handler = function (event) { togglePictureTypeFields() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-333]');
      if (!el) return;
      var handler = function (event) { handleModeImageUpload(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-334]');
      if (!el) return;
      var handler = function (event) { toggleSoundTypeFields() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-335]');
      if (!el) return;
      var handler = function (event) { handleModeAudioUpload(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-336]');
      if (!el) return;
      var handler = function (event) { onModeEditorVolumeInput(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-337]');
      if (!el) return;
      var handler = function (event) { playModeChime() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-338]');
      if (!el) return;
      var handler = function (event) { toggleModeEditorTestSound() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-339]');
      if (!el) return;
      var handler = function (event) { closeModeEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-340]');
      if (!el) return;
      var handler = function (event) { saveModeFromEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-341]');
      if (!el) return;
      var handler = function (event) { closeMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-342]');
      if (!el) return;
      var handler = function (event) { minimizeMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-343]');
      if (!el) return;
      var handler = function (event) { openTimerFullscreen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-344]');
      if (!el) return;
      var handler = function (event) { overlayPlayPauseTimer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-345]');
      if (!el) return;
      var handler = function (event) { timerAdd30s() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-346]');
      if (!el) return;
      var handler = function (event) { overlaySkipIntervalStep() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-347]');
      if (!el) return;
      var handler = function (event) { overlayStopTimer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-348]');
      if (!el) return;
      var handler = function (event) { syncOverlaySettingsToPopup() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-349]');
      if (!el) return;
      var handler = function (event) { syncOverlaySettingsToPopup() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-350]');
      if (!el) return;
      var handler = function (event) { onTimerBeepsInputChanged(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-351]');
      if (!el) return;
      var handler = function (event) { onTimerBeepsInputChanged(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-352]');
      if (!el) return;
      var handler = function (event) { overlayPlayPauseTimer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-353]');
      if (!el) return;
      var handler = function (event) { overlayStopTimer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-354]');
      if (!el) return;
      var handler = function (event) { timerSubtract30s() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-355]');
      if (!el) return;
      var handler = function (event) { timerAdd30s() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-356]');
      if (!el) return;
      var handler = function (event) { overlaySkipIntervalStep() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-357]');
      if (!el) return;
      var handler = function (event) { activateMode('quiet') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-358]');
      if (!el) return;
      var handler = function (event) { activateMode('conversation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-359]');
      if (!el) return;
      var handler = function (event) { activateMode('group') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-360]');
      if (!el) return;
      var handler = function (event) { syncModeOverlayToPopup() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-361]');
      if (!el) return;
      var handler = function (event) { syncModeOverlayToPopup() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-362]');
      if (!el) return;
      var handler = function (event) { onTimerBeepsInputChanged(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-363]');
      if (!el) return;
      var handler = function (event) { onTimerBeepsInputChanged(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-364]');
      if (!el) return;
      var handler = function (event) { toggleOverlayStopwatchMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-365]');
      if (!el) return;
      var handler = function (event) { overlayPlayPauseTimer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-366]');
      if (!el) return;
      var handler = function (event) { overlayStopTimer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-367]');
      if (!el) return;
      var handler = function (event) { modeOverlaySubtract30s() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-368]');
      if (!el) return;
      var handler = function (event) { modeOverlayAdd30s() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-369]');
      if (!el) return;
      var handler = function (event) { overlaySkipIntervalStep() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-370]');
      if (!el) return;
      var handler = function (event) { activateMode('quiet') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-371]');
      if (!el) return;
      var handler = function (event) { activateMode('conversation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-372]');
      if (!el) return;
      var handler = function (event) { activateMode('group') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-373]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('white', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-374]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('pink', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-375]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('brown', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-376]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('file', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-377]');
      if (!el) return;
      var handler = function (event) { overlayNoiseVolume(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-378]');
      if (!el) return;
      var handler = function (event) { restoreMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-379]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); restoreMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-380]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); closeMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-381]');
      if (!el) return;
      var handler = function (event) { toggleWhiteNoiseMute() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-382]');
      if (!el) return;
      var handler = function (event) { setWhiteNoiseVolume(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-383]');
      if (!el) return;
      var handler = function (event) { stopWhiteNoise() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-384]');
      if (!el) return;
      var handler = function (event) { toggleFreezePresentation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-385]');
      if (!el) return;
      var handler = function (event) { toggleAlwaysOnTopPresentation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-386]');
      if (!el) return;
      var handler = function (event) { cmsPresentationResizeWindow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-387]');
      if (!el) return;
      var handler = function (event) { cmsPresentationDefaultSize() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-388]');
      if (!el) return;
      var handler = function (event) { cmsPresentationMaximize() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-389]');
      if (!el) return;
      var handler = function (event) { cmsPresentationDockLeft() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-390]');
      if (!el) return;
      var handler = function (event) { cmsPresentationDockRight() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-391]');
      if (!el) return;
      var handler = function (event) { cmsPresentationClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-392]');
      if (!el) return;
      var handler = function (event) { toggleUnifiedDockCollapse(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-393]');
      if (!el) return;
      var handler = function (event) { toggleUnifiedDockCollapse(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-394]');
      if (!el) return;
      var handler = function (event) { toggleTimerPopup(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-395]');
      if (!el) return;
      var handler = function (event) { closeTimeMachine() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-396]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-397]');
      if (!el) return;
      var handler = function (event) { closeTimeMachine() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-398]');
      if (!el) return;
      var handler = function (event) { exitTimeMachineView() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-399]');
      if (!el) return;
      var handler = function (event) { closeDatetimeOverlay() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-400]');
      if (!el) return;
      var handler = function (event) { closeDatetimeOverlay() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-401]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-402]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('white', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-403]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('pink', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-404]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('brown', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-405]');
      if (!el) return;
      var handler = function (event) { overlaySetNoise('file', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-406]');
      if (!el) return;
      var handler = function (event) { overlayNoiseVolume(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-407]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)cpCloseManager() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-408]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-409]');
      if (!el) return;
      var handler = function (event) { cpCloseManager() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-410]');
      if (!el) return;
      var handler = function (event) { cpOpenNewPlanConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-411]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)cpCloseConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-412]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-413]');
      if (!el) return;
      var handler = function (event) { cpCloseConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-414]');
      if (!el) return;
      var handler = function (event) { savePlanAbbrevLenSetting(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-415]');
      if (!el) return;
      var handler = function (event) { cpAddScheduleSlot() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-416]');
      if (!el) return;
      var handler = function (event) { cpCloseConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-417]');
      if (!el) return;
      var handler = function (event) { cpConfirmConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-418]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)cpCloseEditor(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-419]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-420]');
      if (!el) return;
      var handler = function (event) { cpCloseEditor(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-421]');
      if (!el) return;
      var handler = function (event) { cpEditorRemoveRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-422]');
      if (!el) return;
      var handler = function (event) { cpEditorAddRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-423]');
      if (!el) return;
      var handler = function (event) { cpEditorRemoveCol() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-424]');
      if (!el) return;
      var handler = function (event) { cpEditorAddCol() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-425]');
      if (!el) return;
      var handler = function (event) { cpEditorRandomAssign() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-426]');
      if (!el) return;
      var handler = function (event) { cpPrintPlan() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-427]');
      if (!el) return;
      var handler = function (event) { cpCloseEditor(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-428]');
      if (!el) return;
      var handler = function (event) { cpSaveEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-429]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeCreditsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-430]');
      if (!el) return;
      var handler = function (event) { closeCreditsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-431]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeRemoteModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-432]');
      if (!el) return;
      var handler = function (event) { closeRemoteModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-433]');
      if (!el) return;
      var handler = function (event) { _remoteSetMode('local') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-434]');
      if (!el) return;
      var handler = function (event) { _remoteSetMode('external') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-435]');
      if (!el) return;
      var handler = function (event) { _remoteStartServer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-436]');
      if (!el) return;
      var handler = function (event) { _remoteCopyUrl() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-437]');
      if (!el) return;
      var handler = function (event) { _remoteNewToken() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-cmev-438]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-cmev-439]');
      if (!el) return;
      var handler = function (event) { _remoteStopServer() };
      el.addEventListener('click', handler);
    })();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
