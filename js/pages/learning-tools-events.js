// Migrated static HTML event handlers from pages/learning-tools.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-ltev-1]');
      if (!el) return;
      var handler = function (event) { toggleMute() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-2]');
      if (!el) return;
      var handler = function (event) { ShortcutsModal.open({title:t('skmTitle'),rows:[{keys:['Enter'],desc:t('skmLtSubmit')},{keys:['A-Z'],desc:t('skmLtHangmanType')}],noShortcutsText:t('skmNone')}) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-3]');
      if (!el) return;
      var handler = function (event) { startLtTutorial() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-4]');
      if (!el) return;
      var handler = function (event) { window.scrollTo({top:0,behavior:'smooth'}) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-5]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeActiveWordsPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-6]');
      if (!el) return;
      var handler = function (event) { closeActiveWordsPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-7]');
      if (!el) return;
      var handler = function (event) { timerCloseSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-8]');
      if (!el) return;
      var handler = function (event) { timerCloseSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-9]');
      if (!el) return;
      var handler = function (event) { timerSaveAndStart() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-10]');
      if (!el) return;
      var handler = function (event) { timerStop(); timerCloseSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-11]');
      if (!el) return;
      var handler = function (event) { hideSuccess(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-12]');
      if (!el) return;
      var handler = function (event) { showCurrentWordDetail() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-13]');
      if (!el) return;
      var handler = function (event) { hideFailure() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-14]');
      if (!el) return;
      var handler = function (event) { showCurrentWordDetail() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-15]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)hideWordDetail() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-16]');
      if (!el) return;
      var handler = function (event) { detZoom(-1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-17]');
      if (!el) return;
      var handler = function (event) { detZoom(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-18]');
      if (!el) return;
      var handler = function (event) { ltSpeakWord(document.getElementById('det-word').textContent) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-19]');
      if (!el) return;
      var handler = function (event) { detToggleEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-20]');
      if (!el) return;
      var handler = function (event) { detSaveEdit('memory') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-21]');
      if (!el) return;
      var handler = function (event) { detSaveEdit('main') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-22]');
      if (!el) return;
      var handler = function (event) { detSaveEdit('custom') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-23]');
      if (!el) return;
      var handler = function (event) { detCancelEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-24]');
      if (!el) return;
      var handler = function (event) { detNavPrev() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-25]');
      if (!el) return;
      var handler = function (event) { detNavBack() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-26]');
      if (!el) return;
      var handler = function (event) { detNavNext() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-27]');
      if (!el) return;
      var handler = function (event) { hideWordDetail() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-28]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeHelp() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-29]');
      if (!el) return;
      var handler = function (event) { closeHelp() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-30]');
      if (!el) return;
      var handler = function (event) { closeHelp() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-31]');
      if (!el) return;
      var handler = function (event) { setActiveClassGroup(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-32]');
      if (!el) return;
      var handler = function (event) { setActiveHalfGroup(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-33]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)mdbClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-34]');
      if (!el) return;
      var handler = function (event) { mdbClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-35]');
      if (!el) return;
      var handler = function (event) { mdbShowTab('manage') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-36]');
      if (!el) return;
      var handler = function (event) { mdbShowTab('add') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-37]');
      if (!el) return;
      var handler = function (event) { mdbShowTab('themes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-38]');
      if (!el) return;
      var handler = function (event) { mdbShowTab('dupes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-39]');
      if (!el) return;
      var handler = function (event) { mdbShowTab('delete') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-40]');
      if (!el) return;
      var handler = function (event) { mdbRenderWords() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-41]');
      if (!el) return;
      var handler = function (event) { mdbRenderWords() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-42]');
      if (!el) return;
      var handler = function (event) { mdbRenderWords() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-43]');
      if (!el) return;
      var handler = function (event) { mdbSelectAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-44]');
      if (!el) return;
      var handler = function (event) { mdbClearSel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-45]');
      if (!el) return;
      var handler = function (event) { mdbRequestDeleteSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-46]');
      if (!el) return;
      var handler = function (event) { mdbScanDuplicates() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-47]');
      if (!el) return;
      var handler = function (event) { mdbUpdateRenameCount() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-48]');
      if (!el) return;
      var handler = function (event) { mdbUpdateRenameCount() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-49]');
      if (!el) return;
      var handler = function (event) { mdbRenameTheme() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-50]');
      if (!el) return;
      var handler = function (event) { mdbUpdateMergePreview() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-51]');
      if (!el) return;
      var handler = function (event) { mdbMergeThemes() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-52]');
      if (!el) return;
      var handler = function (event) { awSetTab('form') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-53]');
      if (!el) return;
      var handler = function (event) { awSetTab('quote') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-54]');
      if (!el) return;
      var handler = function (event) { awSetTab('gap') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-55]');
      if (!el) return;
      var handler = function (event) { awSetTab('error') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-56]');
      if (!el) return;
      var handler = function (event) { awSetTab('bulk') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-57]');
      if (!el) return;
      var handler = function (event) { awWikiLookup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-58]');
      if (!el) return;
      var handler = function (event) { awCancelEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-59]');
      if (!el) return;
      var handler = function (event) { awSubmitForm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-60]');
      if (!el) return;
      var handler = function (event) { awClearForm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-61]');
      if (!el) return;
      var handler = function (event) { awSubmitBulk() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-62]');
      if (!el) return;
      var handler = function (event) { document.getElementById('aw-bulk-json').value='' };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-63]');
      if (!el) return;
      var handler = function (event) { awCancelEditQuote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-64]');
      if (!el) return;
      var handler = function (event) { awSubmitQuote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-65]');
      if (!el) return;
      var handler = function (event) { awClearQuote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-66]');
      if (!el) return;
      var handler = function (event) { awCancelEditGap() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-67]');
      if (!el) return;
      var handler = function (event) { awSubmitGap() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-68]');
      if (!el) return;
      var handler = function (event) { awClearGap() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-69]');
      if (!el) return;
      var handler = function (event) { awCancelEditError() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-70]');
      if (!el) return;
      var handler = function (event) { awSubmitError() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-71]');
      if (!el) return;
      var handler = function (event) { awClearError() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-72]');
      if (!el) return;
      var handler = function (event) { awDownloadDB() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-73]');
      if (!el) return;
      var handler = function (event) { awDeleteAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-74]');
      if (!el) return;
      var handler = function (event) { awSetManageTab('words') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-75]');
      if (!el) return;
      var handler = function (event) { awSetManageTab('quotes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-76]');
      if (!el) return;
      var handler = function (event) { awSetManageTab('gaps') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-77]');
      if (!el) return;
      var handler = function (event) { awSetManageTab('errors') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-78]');
      if (!el) return;
      var handler = function (event) { mdbConfirmDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-79]');
      if (!el) return;
      var handler = function (event) { mdbCancelDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-80]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-81]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-82]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-83]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-84]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-85]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-86]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-87]');
      if (!el) return;
      var handler = function (event) { ltToggleStarredFilter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-88]');
      if (!el) return;
      var handler = function (event) { showActiveWordsPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-89]');
      if (!el) return;
      var handler = function (event) { resetAllFilters() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-90]');
      if (!el) return;
      var handler = function (event) { addTeam() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-91]');
      if (!el) return;
      var handler = function (event) { resetTeams() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-92]');
      if (!el) return;
      var handler = function (event) { clearAllTeams() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-93]');
      if (!el) return;
      var handler = function (event) { navTo('match-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-94]');
      if (!el) return;
      var handler = function (event) { navTo('hangman-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-95]');
      if (!el) return;
      var handler = function (event) { navTo('scramble-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-96]');
      if (!el) return;
      var handler = function (event) { navTo('clue-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-97]');
      if (!el) return;
      var handler = function (event) { navTo('ipa-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-98]');
      if (!el) return;
      var handler = function (event) { navTo('synonym-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-99]');
      if (!el) return;
      var handler = function (event) { navTo('wordsearch-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-100]');
      if (!el) return;
      var handler = function (event) { navTo('sentence-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-101]');
      if (!el) return;
      var handler = function (event) { navTo('gap-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-102]');
      if (!el) return;
      var handler = function (event) { navTo('error-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-103]');
      if (!el) return;
      var handler = function (event) { navTo('dictation-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-104]');
      if (!el) return;
      var handler = function (event) { navTo('order-sentences-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-105]');
      if (!el) return;
      var handler = function (event) { navTo('quiz-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-106]');
      if (!el) return;
      var handler = function (event) { navTo('werewolf-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-107]');
      if (!el) return;
      var handler = function (event) { navTo('grammar-practice-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-108]');
      if (!el) return;
      var handler = function (event) { navTo('words-seen-today-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-109]');
      if (!el) return;
      var handler = function (event) { navTo('flip-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-110]');
      if (!el) return;
      var handler = function (event) { navTo('quote-game-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-111]');
      if (!el) return;
      var handler = function (event) { navTo('story-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-112]');
      if (!el) return;
      var handler = function (event) { openHelp() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-113]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-114]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-115]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-116]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-117]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-118]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-119]');
      if (!el) return;
      var handler = function (event) { themePickerToggle(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-120]');
      if (!el) return;
      var handler = function (event) { ltToggleStarredFilter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-121]');
      if (!el) return;
      var handler = function (event) { showActiveWordsPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-122]');
      if (!el) return;
      var handler = function (event) { resetAllFilters() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-123]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-124]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-125]');
      if (!el) return;
      var handler = function (event) { matchSetPairs(4) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-126]');
      if (!el) return;
      var handler = function (event) { matchSetPairs(6) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-127]');
      if (!el) return;
      var handler = function (event) { matchSetPairs(8) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-128]');
      if (!el) return;
      var handler = function (event) { matchSetPairs(10) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-129]');
      if (!el) return;
      var handler = function (event) { matchSetPairs(12) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-130]');
      if (!el) return;
      var handler = function (event) { matchSetMode('def') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-131]');
      if (!el) return;
      var handler = function (event) { matchSetMode('trans') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-132]');
      if (!el) return;
      var handler = function (event) { matchSetMode('syn') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-133]');
      if (!el) return;
      var handler = function (event) { initMatchGame() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-134]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-135]');
      if (!el) return;
      var handler = function (event) { flipSetCount(6) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-136]');
      if (!el) return;
      var handler = function (event) { flipSetCount(8) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-137]');
      if (!el) return;
      var handler = function (event) { flipSetCount(12) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-138]');
      if (!el) return;
      var handler = function (event) { flipToggleAllCards() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-139]');
      if (!el) return;
      var handler = function (event) { initFlipGame() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-140]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-141]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-142]');
      if (!el) return;
      var handler = function (event) { hSetMaxMistakes(4) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-143]');
      if (!el) return;
      var handler = function (event) { hSetMaxMistakes(6) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-144]');
      if (!el) return;
      var handler = function (event) { hSetMaxMistakes(8) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-145]');
      if (!el) return;
      var handler = function (event) { hSetMaxMistakes(10) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-146]');
      if (!el) return;
      var handler = function (event) { hSetMaxMistakes(12) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-147]');
      if (!el) return;
      var handler = function (event) { hangmanHandleTyping(event) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-148]');
      if (!el) return;
      var handler = function (event) { hangmanHandleKey(event) };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-149]');
      if (!el) return;
      var handler = function (event) { revealHangmanClue() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-150]');
      if (!el) return;
      var handler = function (event) { revealHangmanAnswer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-151]');
      if (!el) return;
      var handler = function (event) { selectRandomWord() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-152]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-153]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-154]');
      if (!el) return;
      var handler = function (event) { scrambleHandleTyping(event) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-155]');
      if (!el) return;
      var handler = function (event) { scrambleHandleKey(event) };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-156]');
      if (!el) return;
      var handler = function (event) { initScrambleGame() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-157]');
      if (!el) return;
      var handler = function (event) { clearScrambleAnswer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-158]');
      if (!el) return;
      var handler = function (event) { revealScrambleNextLetter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-159]');
      if (!el) return;
      var handler = function (event) { revealScrambleClue() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-160]');
      if (!el) return;
      var handler = function (event) { checkScramble() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-161]');
      if (!el) return;
      var handler = function (event) { revealScrambleAnswer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-162]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-163]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-164]');
      if (!el) return;
      var handler = function (event) { checkClueGuess() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-165]');
      if (!el) return;
      var handler = function (event) { unlockClue() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-166]');
      if (!el) return;
      var handler = function (event) { revealClueAnswer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-167]');
      if (!el) return;
      var handler = function (event) { initClueGame() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-168]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-169]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-170]');
      if (!el) return;
      var handler = function (event) { clearSentenceAttempt() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-171]');
      if (!el) return;
      var handler = function (event) { getWordHint() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-172]');
      if (!el) return;
      var handler = function (event) { revealSentenceAnswer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-173]');
      if (!el) return;
      var handler = function (event) { selectRandomSentence() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-174]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-175]');
      if (!el) return;
      var handler = function (event) { checkQuoteAnalysis() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-176]');
      if (!el) return;
      var handler = function (event) { handleQuoteClue() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-177]');
      if (!el) return;
      var handler = function (event) { revealFullAnalysis() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-178]');
      if (!el) return;
      var handler = function (event) { nextTeamTurn(); initQuoteGame(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-179]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-180]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-181]');
      if (!el) return;
      var handler = function (event) { clearGapUsed(); initGapGame() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-182]');
      if (!el) return;
      var handler = function (event) { clearGapUsed(); initGapGame() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-183]');
      if (!el) return;
      var handler = function (event) { onGapSourceChanged() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-184]');
      if (!el) return;
      var handler = function (event) { clearGapUsed(); initGapGame() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-185]');
      if (!el) return;
      var handler = function (event) { checkGap() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-186]');
      if (!el) return;
      var handler = function (event) { revealGapClue() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-187]');
      if (!el) return;
      var handler = function (event) { revealGap() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-188]');
      if (!el) return;
      var handler = function (event) { initGapGame() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-189]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-190]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-191]');
      if (!el) return;
      var handler = function (event) { setErrorMode('spot') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-192]');
      if (!el) return;
      var handler = function (event) { setErrorMode('rewrite') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-193]');
      if (!el) return;
      var handler = function (event) { checkErrorChoice('A') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-194]');
      if (!el) return;
      var handler = function (event) { checkErrorChoice('B') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-195]');
      if (!el) return;
      var handler = function (event) { checkRewrite() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-196]');
      if (!el) return;
      var handler = function (event) { resetRewriteInput() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-197]');
      if (!el) return;
      var handler = function (event) { showErrorHint() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-198]');
      if (!el) return;
      var handler = function (event) { revealError() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-199]');
      if (!el) return;
      var handler = function (event) { nextTeamTurn(); initErrorGame(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-200]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-201]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-202]');
      if (!el) return;
      var handler = function (event) { ipaSetMode('mcq') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-203]');
      if (!el) return;
      var handler = function (event) { ipaSetMode('type') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-204]');
      if (!el) return;
      var handler = function (event) { if(ipaWordObj)ltSpeakWord(ipaWordObj.word) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-205]');
      if (!el) return;
      var handler = function (event) { ipaCheckType() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-206]');
      if (!el) return;
      var handler = function (event) { ipaRevealHint() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-207]');
      if (!el) return;
      var handler = function (event) { ipaRevealAnswer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-208]');
      if (!el) return;
      var handler = function (event) { initIpaGame() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-209]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-210]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-211]');
      if (!el) return;
      var handler = function (event) { synSetMode('mcq') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-212]');
      if (!el) return;
      var handler = function (event) { synSetMode('type') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-213]');
      if (!el) return;
      var handler = function (event) { synSetRelation('synonym') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-214]');
      if (!el) return;
      var handler = function (event) { synSetRelation('antonym') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-215]');
      if (!el) return;
      var handler = function (event) { synSetRelation('both') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-216]');
      if (!el) return;
      var handler = function (event) { if(synWordObj)ltSpeakWord(synWordObj.word) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-217]');
      if (!el) return;
      var handler = function (event) { synToggleDefClue() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-218]');
      if (!el) return;
      var handler = function (event) { synCheckType() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-219]');
      if (!el) return;
      var handler = function (event) { synRevealHint() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-220]');
      if (!el) return;
      var handler = function (event) { synRevealAnswer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-221]');
      if (!el) return;
      var handler = function (event) { initSynGame() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-222]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-223]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-224]');
      if (!el) return;
      var handler = function (event) { wsSetSize(10) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-225]');
      if (!el) return;
      var handler = function (event) { wsSetSize(15) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-226]');
      if (!el) return;
      var handler = function (event) { wsSetSize(20) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-227]');
      if (!el) return;
      var handler = function (event) { wsSetCount(5) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-228]');
      if (!el) return;
      var handler = function (event) { wsSetCount(8) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-229]');
      if (!el) return;
      var handler = function (event) { wsSetCount(10) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-230]');
      if (!el) return;
      var handler = function (event) { wsSetDirMode('easy') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-231]');
      if (!el) return;
      var handler = function (event) { wsSetDirMode('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-232]');
      if (!el) return;
      var handler = function (event) { initWordSearch() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-233]');
      if (!el) return;
      var handler = function (event) { wsHintFirstLetter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-234]');
      if (!el) return;
      var handler = function (event) { wsRevealAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-235]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-236]');
      if (!el) return;
      var handler = function (event) { onStorySourceChanged() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-237]');
      if (!el) return;
      var handler = function (event) { storyGoBackStep() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-238]');
      if (!el) return;
      var handler = function (event) { storyBackToLibrary() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-239]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-240]');
      if (!el) return;
      var handler = function (event) { gpSetMode('reference') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-241]');
      if (!el) return;
      var handler = function (event) { gpSetMode('quiz') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-242]');
      if (!el) return;
      var handler = function (event) { gpSetMode('browse') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-243]');
      if (!el) return;
      var handler = function (event) { gpApplyFilters() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-244]');
      if (!el) return;
      var handler = function (event) { gpApplyFilters() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-245]');
      if (!el) return;
      var handler = function (event) { gpApplyFilters() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-246]');
      if (!el) return;
      var handler = function (event) { gpCheckAnswer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-247]');
      if (!el) return;
      var handler = function (event) { gpShowHint() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-248]');
      if (!el) return;
      var handler = function (event) { gpRevealAnswer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-249]');
      if (!el) return;
      var handler = function (event) { gpNextQuiz() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-250]');
      if (!el) return;
      var handler = function (event) { document.getElementById('gp-topic-detail').classList.add('hidden'); document.getElementById('gp-browse-list').style.display='grid'; };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-251]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-252]');
      if (!el) return;
      var handler = function (event) { toggleWordsSeenHistory() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-253]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-254]');
      if (!el) return;
      var handler = function (event) { dictRenderSetup() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-255]');
      if (!el) return;
      var handler = function (event) { dictRenderSetup() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-256]');
      if (!el) return;
      var handler = function (event) { dictSetDifficulty('easy') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-257]');
      if (!el) return;
      var handler = function (event) { dictSetDifficulty('medium') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-258]');
      if (!el) return;
      var handler = function (event) { dictSetDifficulty('hard') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-259]');
      if (!el) return;
      var handler = function (event) { dictStartGame() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-260]');
      if (!el) return;
      var handler = function (event) { dictSpeakFullText() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-261]');
      if (!el) return;
      var handler = function (event) { dictSpeakCurrentSentence() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-262]');
      if (!el) return;
      var handler = function (event) { dictStopSpeech() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-263]');
      if (!el) return;
      var handler = function (event) { dictCheckAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-264]');
      if (!el) return;
      var handler = function (event) { dictRevealAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-265]');
      if (!el) return;
      var handler = function (event) { dictRehideAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-266]');
      if (!el) return;
      var handler = function (event) { dictReset() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-267]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-268]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-269]');
      if (!el) return;
      var handler = function (event) { osCheck() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-270]');
      if (!el) return;
      var handler = function (event) { osReveal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-271]');
      if (!el) return;
      var handler = function (event) { osInit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-272]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-273]');
      if (!el) return;
      var handler = function (event) { timerOpenSettings() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-274]');
      if (!el) return;
      var handler = function (event) { quizApplyModeUi() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-275]');
      if (!el) return;
      var handler = function (event) { _quizMpSetMode('local') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-276]');
      if (!el) return;
      var handler = function (event) { _quizMpSetMode('external') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-277]');
      if (!el) return;
      var handler = function (event) { quizMpConnect() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-278]');
      if (!el) return;
      var handler = function (event) { quizMpDisconnect() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-279]');
      if (!el) return;
      var handler = function (event) { quizMpEndGame() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-280]');
      if (!el) return;
      var handler = function (event) { quizSortModeChanged() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-281]');
      if (!el) return;
      var handler = function (event) { quizFilterFieldChanged() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-282]');
      if (!el) return;
      var handler = function (event) { quizFilterChanged() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-283]');
      if (!el) return;
      var handler = function (event) { quizMpSelectClass(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-284]');
      if (!el) return;
      var handler = function (event) { quizMpUpdateJoinDisplay() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-285]');
      if (!el) return;
      var handler = function (event) { quizRevealAnswer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-286]');
      if (!el) return;
      var handler = function (event) { quizNextQuestion() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-287]');
      if (!el) return;
      var handler = function (event) { navTo('main-menu') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-288]');
      if (!el) return;
      var handler = function (event) { wwAddExtraStep() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-289]');
      if (!el) return;
      var handler = function (event) { wwOnAutoSettingsChanged() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-290]');
      if (!el) return;
      var handler = function (event) { wwOnAutoSettingsChanged() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-291]');
      if (!el) return;
      var handler = function (event) { wwOnVoteTimerSettingsChanged() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-292]');
      if (!el) return;
      var handler = function (event) { wwOnVoteTimerSettingsChanged() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-293]');
      if (!el) return;
      var handler = function (event) { wwOnKillSoundChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-294]');
      if (!el) return;
      var handler = function (event) { wwLoadKillSounds(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-295]');
      if (!el) return;
      var handler = function (event) { wwPlayKillSound() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-296]');
      if (!el) return;
      var handler = function (event) { presentationToggle('werewolf-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-297]');
      if (!el) return;
      var handler = function (event) { wwSaveCustomConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-298]');
      if (!el) return;
      var handler = function (event) { wwLoadCustomConfig(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-299]');
      if (!el) return;
      var handler = function (event) { wwSetGroup(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-300]');
      if (!el) return;
      var handler = function (event) { wwUseActiveClassGroup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-301]');
      if (!el) return;
      var handler = function (event) { wwClearStrikes() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-302]');
      if (!el) return;
      var handler = function (event) { wwOpenRoleAssignments() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-303]');
      if (!el) return;
      var handler = function (event) { wwResetAllRoles() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-304]');
      if (!el) return;
      var handler = function (event) { wwStartNight() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-305]');
      if (!el) return;
      var handler = function (event) { wwNextTurn() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-306]');
      if (!el) return;
      var handler = function (event) { wwResetRound() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-307]');
      if (!el) return;
      var handler = function (event) { wwHandleTurnSoundChoiceOverlayClick(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-308]');
      if (!el) return;
      var handler = function (event) { wwResolveTurnSoundChoice(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-309]');
      if (!el) return;
      var handler = function (event) { wwResolveTurnSoundChoice(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-310]');
      if (!el) return;
      var handler = function (event) { pregameToggleTimer() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-311]');
      if (!el) return;
      var handler = function (event) { pregameCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-312]');
      if (!el) return;
      var handler = function (event) { pregameStart() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-313]');
      if (!el) return;
      var handler = function (event) { endgameClose(); navTo('main-menu'); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-314]');
      if (!el) return;
      var handler = function (event) { endgameClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-315]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeCreditsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-ltev-316]');
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
