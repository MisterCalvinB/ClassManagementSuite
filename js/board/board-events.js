// Migrated static HTML event handlers from pages/board.html
(function () {
  'use strict';
  function bindBoardEvents() {
    (function () {
      var el = document.querySelector('[data-bev-1]');
      if (!el) return;
      var handler = function (event) { navTo('constellation-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-2]');
      if (!el) return;
      var handler = function (event) { navTo('constellation-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-3]');
      if (!el) return;
      var handler = function (event) { navTo('search-section') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-4]');
      if (!el) return;
      var handler = function (event) { openHistoryModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-5]');
      if (!el) return;
      var handler = function (event) { boardOpenLinkedLessonPlan(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-6]');
      if (!el) return;
      var handler = function (event) { toggleSaveSyncMenu() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-7]');
      if (!el) return;
      var handler = function (event) { downloadData(); closeSaveSyncMenu() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-8]');
      if (!el) return;
      var handler = function (event) { uploadData(); closeSaveSyncMenu() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-9]');
      if (!el) return;
      var handler = function (event) { syncData(); closeSaveSyncMenu() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-10]');
      if (!el) return;
      var handler = function (event) { boardTogglePin(); closeSaveSyncMenu() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-11]');
      if (!el) return;
      var handler = function (event) { boardCustomiseOpen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-12]');
      if (!el) return;
      var handler = function (event) { openBoardShortcuts() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-13]');
      if (!el) return;
      var handler = function (event) { showBoardTour() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-14]');
      if (!el) return;
      var handler = function (event) { this.style.display='none' };
      el.addEventListener('error', handler);
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0) handler.call(el, new Event('error'));
    })();
    (function () {
      var el = document.querySelector('[data-bev-15]');
      if (!el) return;
      var handler = function (event) { boardSttChangeLanguage(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-16]');
      if (!el) return;
      var handler = function (event) { openWhisperModelManager() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-17]');
      if (!el) return;
      var handler = function (event) { boardSttInsertAsNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-18]');
      if (!el) return;
      var handler = function (event) { boardSttSearch() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-19]');
      if (!el) return;
      var handler = function (event) { boardSttCopy() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-20]');
      if (!el) return;
      var handler = function (event) { boardSttClear() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-21]');
      if (!el) return;
      var handler = function (event) { boardStopDictation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-22]');
      if (!el) return;
      var handler = function (event) { boardVideoTogglePause() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-23]');
      if (!el) return;
      var handler = function (event) { boardVideoStop() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-24]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)boardVideoCloseSetup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-25]');
      if (!el) return;
      var handler = function (event) { boardVideoCloseSetup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-26]');
      if (!el) return;
      var handler = function (event) { boardVideoOnMicSelectChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-27]');
      if (!el) return;
      var handler = function (event) { boardVideoOnFpsSelectChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-28]');
      if (!el) return;
      var handler = function (event) { boardVideoCloseSetup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-29]');
      if (!el) return;
      var handler = function (event) { boardVideoConfirmStart() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-30]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)boardVideoPromptClosePreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-31]');
      if (!el) return;
      var handler = function (event) { boardVideoPromptClosePreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-32]');
      if (!el) return;
      var handler = function (event) { boardVideoPromptClosePreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-33]');
      if (!el) return;
      var handler = function (event) { boardVideoOpenInConverter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-34]');
      if (!el) return;
      var handler = function (event) { boardVideoExportMp3() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-35]');
      if (!el) return;
      var handler = function (event) { boardVideoExportFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-36]');
      if (!el) return;
      var handler = function (event) { boardVideoSaveAndAttach() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-37]');
      if (!el) return;
      var handler = function (event) { boardToggleIpaCollapse() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-38]');
      if (!el) return;
      var handler = function (event) { boardCloseIpaKeyboard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-39]');
      if (!el) return;
      var handler = function (event) { window.ipaState && (window.ipaState.buffer = this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-40]');
      if (!el) return;
      var handler = function (event) { boardIpaBackspaceBuffer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-41]');
      if (!el) return;
      var handler = function (event) { boardIpaClearBuffer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-42]');
      if (!el) return;
      var handler = function (event) { boardIpaCopyBuffer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-43]');
      if (!el) return;
      var handler = function (event) { boardIpaWrapSlashes() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-44]');
      if (!el) return;
      var handler = function (event) { boardIpaWrapBrackets() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-45]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-46]');
      if (!el) return;
      var handler = function (event) { handleKeyClick('ˈ') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-47]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-48]');
      if (!el) return;
      var handler = function (event) { handleKeyClick('ˌ') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-49]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-50]');
      if (!el) return;
      var handler = function (event) { handleKeyClick('ː') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-51]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-52]');
      if (!el) return;
      var handler = function (event) { handleKeyClick('.') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-53]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-54]');
      if (!el) return;
      var handler = function (event) { handleKeyClick(' ') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-55]');
      if (!el) return;
      var handler = function (event) { boardIpaInsertInNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-56]');
      if (!el) return;
      var handler = function (event) { boardIpaInsertInNode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-57]');
      if (!el) return;
      var handler = function (event) { boardIpaCreateAsNode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-58]');
      if (!el) return;
      var handler = function (event) { boardIpaCreateAsNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-59]');
      if (!el) return;
      var handler = function (event) { boardIpaSetDirectInsert(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-60]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conCloseLearningImportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-61]');
      if (!el) return;
      var handler = function (event) { if(typeof conOpenLearningToolsTour==='function')conOpenLearningToolsTour(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-62]');
      if (!el) return;
      var handler = function (event) { conCloseLearningImportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-63]');
      if (!el) return;
      var handler = function (event) { conSwitchLearningTab('quizzes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-64]');
      if (!el) return;
      var handler = function (event) { conSwitchLearningTab('vocab') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-65]');
      if (!el) return;
      var handler = function (event) { conSwitchLearningTab('grammar') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-66]');
      if (!el) return;
      var handler = function (event) { conRefreshQuizTabList() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-67]');
      if (!el) return;
      var handler = function (event) { conRefreshQuizTabList() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-68]');
      if (!el) return;
      var handler = function (event) { conRefreshQuizTabList() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-69]');
      if (!el) return;
      var handler = function (event) { conDebouncedRefreshQuizTabList() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-70]');
      if (!el) return;
      var handler = function (event) { conQuizSelectAll(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-71]');
      if (!el) return;
      var handler = function (event) { conQuizSelectAll(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-72]');
      if (!el) return;
      var handler = function (event) { conSetVocabGameMode('match') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-73]');
      if (!el) return;
      var handler = function (event) { conSetVocabGameMode('hangman') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-74]');
      if (!el) return;
      var handler = function (event) { conSetVocabGameMode('scramble') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-75]');
      if (!el) return;
      var handler = function (event) { conSetVocabGameMode('wordquest') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-76]');
      if (!el) return;
      var handler = function (event) { conSetVocabGameMode('phonetic') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-77]');
      if (!el) return;
      var handler = function (event) { conSetVocabGameMode('synant') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-78]');
      if (!el) return;
      var handler = function (event) { conSetVocabGameMode('flashcards') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-79]');
      if (!el) return;
      var handler = function (event) { conSetVocabGameMode('wordsearch') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-80]');
      if (!el) return;
      var handler = function (event) { conRefreshVocabTabList() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-81]');
      if (!el) return;
      var handler = function (event) { conRefreshVocabTabList() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-82]');
      if (!el) return;
      var handler = function (event) { conRefreshVocabTabList() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-83]');
      if (!el) return;
      var handler = function (event) { conRefreshVocabTabList() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-84]');
      if (!el) return;
      var handler = function (event) { conDebouncedRefreshVocabTabList() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-85]');
      if (!el) return;
      var handler = function (event) { conVocabSelectAll(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-86]');
      if (!el) return;
      var handler = function (event) { conVocabSelectAll(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-87]');
      if (!el) return;
      var handler = function (event) { conSetGrammarTool('sentence') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-88]');
      if (!el) return;
      var handler = function (event) { conSetGrammarTool('gapfill') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-89]');
      if (!el) return;
      var handler = function (event) { conSetGrammarTool('error') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-90]');
      if (!el) return;
      var handler = function (event) { conSetGrammarTool('dictation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-91]');
      if (!el) return;
      var handler = function (event) { conSetGrammarTool('order') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-92]');
      if (!el) return;
      var handler = function (event) { conSetGrammarTool('quote') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-93]');
      if (!el) return;
      var handler = function (event) { conSetGrammarTool('werewolf') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-94]');
      if (!el) return;
      var handler = function (event) { conRefreshGrammarTabList() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-95]');
      if (!el) return;
      var handler = function (event) { conRefreshGrammarTabList() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-96]');
      if (!el) return;
      var handler = function (event) { conDebouncedRefreshGrammarTabList() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-97]');
      if (!el) return;
      var handler = function (event) { conGrammarSelectAll(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-98]');
      if (!el) return;
      var handler = function (event) { conGrammarSelectAll(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-99]');
      if (!el) return;
      var handler = function (event) { conCloseLearningImportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-100]');
      if (!el) return;
      var handler = function (event) { conConfirmLearningImport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-101]');
      if (!el) return;
      var handler = function (event) { window.scrollTo({top:0,behavior:'smooth'}) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-102]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)unknownWordsClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-103]');
      if (!el) return;
      var handler = function (event) { unknownWordsClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-104]');
      if (!el) return;
      var handler = function (event) { unknownWordsCopy() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-105]');
      if (!el) return;
      var handler = function (event) { unknownWordsClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-106]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conPdfPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-107]');
      if (!el) return;
      var handler = function (event) { conPdfPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-108]');
      if (!el) return;
      var handler = function (event) { conPdfPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-109]');
      if (!el) return;
      var handler = function (event) { _doConExportPDF() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-110]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conPdfPagePickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-111]');
      if (!el) return;
      var handler = function (event) { conPdfPagePickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-112]');
      if (!el) return;
      var handler = function (event) { conPdfToggleImageOptions() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-113]');
      if (!el) return;
      var handler = function (event) { conPdfUpdateFormatControls() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-114]');
      if (!el) return;
      var handler = function (event) { document.getElementById('con-pdf-quality-val').textContent = this.value + '%' };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-115]');
      if (!el) return;
      var handler = function (event) { conPdfPagePickerSelectAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-116]');
      if (!el) return;
      var handler = function (event) { conPdfPagePickerSelectNone() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-117]');
      if (!el) return;
      var handler = function (event) { conPdfPagePickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-118]');
      if (!el) return;
      var handler = function (event) { conPdfPagePickerConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-119]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conImgConvertClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-120]');
      if (!el) return;
      var handler = function (event) { conImgConvertClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-121]');
      if (!el) return;
      var handler = function (event) { conImgUpdateFormatControls() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-122]');
      if (!el) return;
      var handler = function (event) { document.getElementById('con-img-conv-quality-val').textContent = this.value + '%' };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-123]');
      if (!el) return;
      var handler = function (event) { conImgConvertClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-124]');
      if (!el) return;
      var handler = function (event) { conImgConvertKeepOriginal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-125]');
      if (!el) return;
      var handler = function (event) { conImgConvertConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-126]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conCloseExportSettingsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-127]');
      if (!el) return;
      var handler = function (event) { conCloseExportSettingsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-128]');
      if (!el) return;
      var handler = function (event) { conOnExportSettingsChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-129]');
      if (!el) return;
      var handler = function (event) { conOnExportSettingsChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-130]');
      if (!el) return;
      var handler = function (event) { conOnExportSettingsChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-131]');
      if (!el) return;
      var handler = function (event) { conOnExportSettingsChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-132]');
      if (!el) return;
      var handler = function (event) { conOnExportSettingsChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-133]');
      if (!el) return;
      var handler = function (event) { conOnExportQualitySlider(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-134]');
      if (!el) return;
      var handler = function (event) { conApplyExportQualityPreset(65) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-135]');
      if (!el) return;
      var handler = function (event) { conApplyExportQualityPreset(82) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-136]');
      if (!el) return;
      var handler = function (event) { conApplyExportQualityPreset(92) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-137]');
      if (!el) return;
      var handler = function (event) { conApplyExportQualityPreset(100) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-138]');
      if (!el) return;
      var handler = function (event) { conCloseExportSettingsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-139]');
      if (!el) return;
      var handler = function (event) { conExecuteExportWithOptions() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-140]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)characterNetworkCloseModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-141]');
      if (!el) return;
      var handler = function (event) { characterNetworkCloseModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-142]');
      if (!el) return;
      var handler = function (event) { characterNetworkOnBookChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-143]');
      if (!el) return;
      var handler = function (event) { characterNetworkScanText() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-144]');
      if (!el) return;
      var handler = function (event) { characterNetworkToggleAll(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-145]');
      if (!el) return;
      var handler = function (event) { characterNetworkToggleAll(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-146]');
      if (!el) return;
      var handler = function (event) { characterNetworkAddCustomChar() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-147]');
      if (!el) return;
      var handler = function (event) { characterNetworkMergeSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-148]');
      if (!el) return;
      var handler = function (event) { document.getElementById('char-net-min-cooc-val').textContent=this.value };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-149]');
      if (!el) return;
      var handler = function (event) { characterNetworkCloseModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-150]');
      if (!el) return;
      var handler = function (event) { characterNetworkGenerate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-151]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)characterNetworkCloseExcerpts() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-152]');
      if (!el) return;
      var handler = function (event) { characterNetworkCloseExcerpts() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-153]');
      if (!el) return;
      var handler = function (event) { characterNetworkCloseExcerpts() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-154]');
      if (!el) return;
      var handler = function (event) { conCtxClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-155]');
      if (!el) return;
      var handler = function (event) { conCtxAddBaseWord() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-156]');
      if (!el) return;
      var handler = function (event) { conCtxExtractPdfPageToCanvas() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-157]');
      if (!el) return;
      var handler = function (event) { conCtxSlowDownSound(0.85) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-158]');
      if (!el) return;
      var handler = function (event) { conCtxNormalizeVoice() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.getElementById('con-ctx-transcript-btn');
      if (!el) return;
      var handler = function (event) { if (typeof window.conCtxTranscribeSound === 'function') window.conCtxTranscribeSound(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-159]');
      if (!el) return;
      var handler = function (event) { conCtxExtractAudioToSoundNode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-160]');
      if (!el) return;
      var handler = function (event) { conCtxOpenInMediaConverter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-161]');
      if (!el) return;
      var handler = function (event) { conCtxMediaOpenNative() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-162]');
      if (!el) return;
      var handler = function (event) { conCtxMediaOpenFolder() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-163]');
      if (!el) return;
      var handler = function (event) { conCtxAddRelated('synonyms') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-164]');
      if (!el) return;
      var handler = function (event) { conCtxAddRelated('antonyms') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-165]');
      if (!el) return;
      var handler = function (event) { conCtxAddDefinition() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.getElementById('con-fmt-ety');
      if (!el) return;
      var handler = function (event) { conCtxToggleAnnotation('etymology') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-166]');
      if (!el) return;
      var handler = function (event) { conCtxToggleAnnotation('translation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-167]');
      if (!el) return;
      var handler = function (event) { conCtxToggleAnnotation('ipa') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-168]');
      if (!el) return;
      var handler = function (event) { conCtxOpenNetworkModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.getElementById('con-ctx-ai-studio-btn');
      if (!el) return;
      var handler = function (event) { if (typeof boardAiOpenPopover === 'function') boardAiOpenPopover({}, this); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-171]');
      if (!el) return;
      var handler = function (event) { conCtxOpenCompetenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-172]');
      if (!el) return;
      var handler = function (event) { conCtxOpenLinksModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-173]');
      if (!el) return;
      var handler = function (event) { conCtxOpenLinkEditModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-174]');
      if (!el) return;
      var handler = function (event) { conCtxOpenDictionary() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-175]');
      if (!el) return;
      var handler = function (event) { conCtxAddConnectedWord() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-176]');
      if (!el) return;
      var handler = function (event) { conCtxAddConnectedWord('forward') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-177]');
      if (!el) return;
      var handler = function (event) { conCtxAddConnectedWord('backward') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-178]');
      if (!el) return;
      var handler = function (event) { conCtxAddConnectedWord('both') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-179]');
      if (!el) return;
      var handler = function (event) { conCtxRemoveFromGroup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-180]');
      if (!el) return;
      var handler = function (event) { conOpenPresetEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-181]');
      if (!el) return;
      var handler = function (event) { conSwitchFontUnit('pt') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-182]');
      if (!el) return;
      var handler = function (event) { conSwitchFontUnit('px') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-183]');
      if (!el) return;
      var handler = function (event) { conCtxApplySize(); };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-184]');
      if (!el) return;
      var handler = function (event) { conCtxApplyMaxWidth(this.value); document.getElementById('con-ctx-max-width-display').textContent = (parseInt(this.value) > 0 ? this.value + 'px' : '\u2014'); };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-185]');
      if (!el) return;
      var handler = function (event) { conCtxSetShape('oval') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-186]');
      if (!el) return;
      var handler = function (event) { conCtxSetShape('circle') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-187]');
      if (!el) return;
      var handler = function (event) { conCtxSetShape('square') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-188]');
      if (!el) return;
      var handler = function (event) { conCtxSetShape('rectangle') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-189]');
      if (!el) return;
      var handler = function (event) { conCtxSetRotation(0) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-190]');
      if (!el) return;
      var handler = function (event) { conCtxSetRotation(90) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-191]');
      if (!el) return;
      var handler = function (event) { conCtxSetRotation(180) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-192]');
      if (!el) return;
      var handler = function (event) { conCtxSetRotation(270) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-193]');
      if (!el) return;
      var handler = function (event) { conCtxPromptCustomRotation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-194]');
      if (!el) return;
      var handler = function (event) { conCtxApplyBorderWidth(); document.getElementById('con-ctx-border-width-display').textContent=this.value; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-195]');
      if (!el) return;
      var handler = function (event) { conCtxApplyBorderStyle('solid') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-196]');
      if (!el) return;
      var handler = function (event) { conCtxApplyBorderStyle('dashed') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-197]');
      if (!el) return;
      var handler = function (event) { conCtxApplyBorderStyle('dotted') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-198]');
      if (!el) return;
      var handler = function (event) { conCtxApplyBorderStyle('double') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-199]');
      if (!el) return;
      var handler = function (event) { conCtxApplyBorderColor(this.value); document.getElementById('con-ctx-border-color-text').value=this.value.toUpperCase(); };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-200]');
      if (!el) return;
      var handler = function (event) { if(/^#[0-9a-fA-F]{6}$/.test(this.value)){document.getElementById('con-ctx-border-color').value=this.value; conCtxApplyBorderColor(this.value);} };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-201]');
      if (!el) return;
      var handler = function (event) { conCtxToggleFmt('bold') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-202]');
      if (!el) return;
      var handler = function (event) { conCtxToggleFmt('italic') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-203]');
      if (!el) return;
      var handler = function (event) { conCtxToggleFmt('underline') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-204]');
      if (!el) return;
      var handler = function (event) { conCtxToggleFmt('strike') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-205]');
      if (!el) return;
      var handler = function (event) { conCtxToggleCaseDropdown(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-206]');
      if (!el) return;
      var handler = function (event) { conCtxSetCasing('none') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-207]');
      if (!el) return;
      var handler = function (event) { conCtxSetCasing('uppercase') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-208]');
      if (!el) return;
      var handler = function (event) { conCtxSetCasing('lowercase') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-209]');
      if (!el) return;
      var handler = function (event) { conCtxSetCasing('titlecase') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-210]');
      if (!el) return;
      var handler = function (event) { conCtxSetCasing('sentencecase') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-211]');
      if (!el) return;
      var handler = function (event) { conCtxSetCasing('smallcaps') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-212]');
      if (!el) return;
      var handler = function (event) { conCtxMultiToggleFmt('bold') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-213]');
      if (!el) return;
      var handler = function (event) { conCtxMultiToggleFmt('italic') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-214]');
      if (!el) return;
      var handler = function (event) { conCtxMultiToggleFmt('underline') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-215]');
      if (!el) return;
      var handler = function (event) { conClipboardCopy() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-216]');
      if (!el) return;
      var handler = function (event) { conClipboardCut() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-217]');
      if (!el) return;
      var handler = function (event) { conClipboardPaste() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-218]');
      if (!el) return;
      var handler = function (event) { conToggleMaskSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-219]');
      if (!el) return;
      var handler = function (event) { conCtxToggleArrangeMenu('align', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-220]');
      if (!el) return;
      var handler = function (event) { conCtxToggleArrangeMenu('distribute', event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-221]');
      if (!el) return;
      var handler = function (event) { conCtxConnectSelected('none') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-222]');
      if (!el) return;
      var handler = function (event) { conCtxConnectSelected('forward') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-223]');
      if (!el) return;
      var handler = function (event) { conCtxConnectSelected('both') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-224]');
      if (!el) return;
      var handler = function (event) { if (typeof window.conOpenAxisPicker === 'function') window.conOpenAxisPicker('spread', event); else conCtxSpreadSelected(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-225]');
      if (!el) return;
      var handler = function (event) { if (typeof window.conOpenAxisPicker === 'function') window.conOpenAxisPicker('compact', event); else conCtxCompactSelected(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-226]');
      if (!el) return;
      var handler = function (event) { conRotateSelectedNodes(90) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-227]');
      if (!el) return;
      var handler = function (event) { conGroupSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-228]');
      if (!el) return;
      var handler = function (event) { conCtxMergeSelected(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-229]');
      if (!el) return;
      var handler = function (event) { conSaveSelectionToLibraryPrompt() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.getElementById('con-ctx-multi-ai-studio-btn');
      if (!el) return;
      var handler = function (event) { if (typeof boardAiOpenPopover === 'function') boardAiOpenPopover({}, this); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-232]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('vertical','left') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-233]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('vertical','middle') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-234]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('vertical','right') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-235]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('horizontal','top') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-236]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('horizontal','centre') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-237]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('horizontal','bottom') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-238]');
      if (!el) return;
      var handler = function (event) { conCtxDistributeSelected('horizontal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-239]');
      if (!el) return;
      var handler = function (event) { conCtxDistributeSelected('vertical') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-240]');
      if (!el) return;
      var handler = function (event) { conCtxGridSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-241]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('vertical','left') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-242]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('vertical','middle') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-243]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('vertical','right') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-244]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('horizontal','top') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-245]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('horizontal','centre') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-246]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('horizontal','bottom') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-247]');
      if (!el) return;
      var handler = function (event) { conCtxDistributeSelected('horizontal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-248]');
      if (!el) return;
      var handler = function (event) { conCtxDistributeSelected('vertical') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-249]');
      if (!el) return;
      var handler = function (event) { conCtxGridSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-250]');
      if (!el) return;
      var handler = function (event) { conCtxToggleMask() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-251]');
      if (!el) return;
      var handler = function (event) { conCtxAddNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-252]');
      if (!el) return;
      var handler = function (event) { conCtxConvertToNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-253]');
      if (!el) return;
      var handler = function (event) { conCtxSetPage() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-254]');
      if (!el) return;
      var handler = function (event) { conCtxToggleLock() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-255]');
      if (!el) return;
      var handler = function (event) { conCtxDuplicate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-256]');
      if (!el) return;
      var handler = function (event) { conCtxToggleSplitDropdown(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-257]');
      if (!el) return;
      var handler = function (event) { conCtxToggleStar() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-258]');
      if (!el) return;
      var handler = function (event) { conCtxViewCard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-259]');
      if (!el) return;
      var handler = function (event) { conCtxOpenDictionary() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-260]');
      if (!el) return;
      var handler = function (event) { conCtxOpenIpaKeyboard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-261]');
      if (!el) return;
      var handler = function (event) { conSaveNodeToLibrary() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-262]');
      if (!el) return;
      var handler = function (event) { conCtxEditWord() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-263]');
      if (!el) return;
      var handler = function (event) { conCtxToggleAnim() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-264]');
      if (!el) return;
      var handler = function (event) { conTriggerEntityNumbering(); conCtxClose(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-265]');
      if (!el) return;
      var handler = function (event) { conClearEntityNumbers('selection'); conCtxClose(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-266]');
      if (!el) return;
      var handler = function (event) { conCtxRemove() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-267]');
      if (!el) return;
      var handler = function (event) { conCtxSetAnimation(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-268]');
      if (!el) return;
      var handler = function (event) { conCtxSetRevealAnimation(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-269]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-270]');
      if (!el) return;
      var handler = function (event) { conCtxExecuteSplit('space', false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-271]');
      if (!el) return;
      var handler = function (event) { conCtxExecuteSplit('letter', false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-272]');
      if (!el) return;
      var handler = function (event) { conCtxExecuteSplit('space', false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-273]');
      if (!el) return;
      var handler = function (event) { conCtxExecuteSplit('letter', false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-274]');
      if (!el) return;
      var handler = function (event) { conCtxExecuteSplit('space', true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-275]');
      if (!el) return;
      var handler = function (event) { conCtxExecuteSplit('letter', true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-276]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-277]');
      if (!el) return;
      var handler = function (event) { conNodeCardOpenDictionary() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-278]');
      if (!el) return;
      var handler = function (event) { conCloseNodeWordCard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-279]');
      if (!el) return;
      var handler = function (event) { conNodeCardEditInDbManager() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-280]');
      if (!el) return;
      var handler = function (event) { conNodeCardCopyAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-281]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-282]');
      if (!el) return;
      var handler = function (event) { if(typeof conBoardCtxSuggestDbWords==='function')conBoardCtxSuggestDbWords(this.value); };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-283]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'){conBoardCtxConfirm();}if(event.key==='Escape'){conBoardCtxClose();} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-284]');
      if (!el) return;
      var handler = function (event) { conBoardCtxConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-285]');
      if (!el) return;
      var handler = function (event) { conSetBoardCtxLayout('horizontal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-286]');
      if (!el) return;
      var handler = function (event) { conSetBoardCtxLayout('vertical') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-287]');
      if (!el) return;
      var handler = function (event) { conSetBoardCtxLayout('circle') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-288]');
      if (!el) return;
      var handler = function (event) { conSetBoardCtxLayout('cluster') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-289]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'){conBoardCtxConfirmNote();}if(event.key==='Escape'){conBoardCtxClose();} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-290]');
      if (!el) return;
      var handler = function (event) { conBoardCtxConfirmNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-291]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'){conBoardCtxAddTable();}if(event.key==='Escape'){conBoardCtxClose();} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-292]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'){conBoardCtxAddTable();}if(event.key==='Escape'){conBoardCtxClose();} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-293]');
      if (!el) return;
      var handler = function (event) { conBoardCtxAddTable() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-294]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose(); conOpenUniversalImportModal(null, null, { x: window._boardCtxNoteX, y: window._boardCtxNoteY }); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-295]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose(); boardOpenIpaKeyboard({ x: window._boardCtxNoteX, y: window._boardCtxNoteY }); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-296]');
      if (!el) return;
      var handler = function (event) { conBoardCtxImportText() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-297]');
      if (!el) return;
      var handler = function (event) { boardAiOpenPopover({ tab: 'expand', preset: 'related' }, this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-298]');
      if (!el) return;
      var handler = function (event) { conBoardCtxOpenStudentNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-299]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose();conToggleDrawMode(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-300]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose();conToggleEraserMode(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-301]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose();laserToggle(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-302]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose();conBoardCtxOpenRecord(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-303]');
      if (!el) return;
      var handler = function (event) { conBoardCtxAddMask() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-304]');
      if (!el) return;
      var handler = function (event) { conBoardCtxCreateGroup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-305]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose();conBoardCtxAddLink(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-306]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose();conOpenPremadeLibraryModal({ x: window._boardCtxNoteX, y: window._boardCtxNoteY }); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-307]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose();conBoardCtxSpreadRegion(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-308]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose();conBoardCtxCompactRegion(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-309]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose();conTriggerEntityNumbering(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-310]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose();conClearEntityNumbers('all'); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-311]');
      if (!el) return;
      var handler = function (event) { conResetBoardBackgroundColor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-312]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose(); boardCustomiseOpen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-313]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose(); boardCustomiseOpen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-314]');
      if (!el) return;
      var handler = function (event) { conBoardCtxClose();conSaveSelectionToLibraryPrompt(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-315]');
      if (!el) return;
      var handler = function (event) { conTableStyleClose(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-316]');
      if (!el) return;
      var handler = function (event) { conTableCtxClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-317]');
      if (!el) return;
      var handler = function (event) { conTableCtxAddRowAbove() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-318]');
      if (!el) return;
      var handler = function (event) { conTableCtxAddRowBelow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-319]');
      if (!el) return;
      var handler = function (event) { conTableCtxRemoveRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-320]');
      if (!el) return;
      var handler = function (event) { conTableCtxAddColLeft() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-321]');
      if (!el) return;
      var handler = function (event) { conTableCtxAddColRight() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-322]');
      if (!el) return;
      var handler = function (event) { conTableCtxRemoveCol() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-323]');
      if (!el) return;
      var handler = function (event) { conTableCtxApplyCellBg(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-324]');
      if (!el) return;
      var handler = function (event) { conTableCtxApplyCellColor(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-325]');
      if (!el) return;
      var handler = function (event) { conTableCtxApplyCellFs(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-326]');
      if (!el) return;
      var handler = function (event) { conTableCtxCellAlign('left') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-327]');
      if (!el) return;
      var handler = function (event) { conTableCtxCellAlign('center') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-328]');
      if (!el) return;
      var handler = function (event) { conTableCtxCellAlign('right') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-329]');
      if (!el) return;
      var handler = function (event) { conTableCtxClearCell() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-330]');
      if (!el) return;
      var handler = function (event) { conTableCtxToggleLock() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-331]');
      if (!el) return;
      var handler = function (event) { conTableCtxDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-332]');
      if (!el) return;
      var handler = function (event) { conMaskStyleClose(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-333]');
      if (!el) return;
      var handler = function (event) { conMaskCtxClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-334]');
      if (!el) return;
      var handler = function (event) { if(/^#[0-9a-fA-F]{6}$/.test(this.value)){document.getElementById('con-mask-ctx-color').value=this.value;} };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-335]');
      if (!el) return;
      var handler = function (event) { document.getElementById('con-mask-ctx-opacity-val').textContent=Math.round(this.value*100)+'%' };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-336]');
      if (!el) return;
      var handler = function (event) { conMaskCtxDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-337]');
      if (!el) return;
      var handler = function (event) { conMaskCtxClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-338]');
      if (!el) return;
      var handler = function (event) { conShapeStyleClose(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-339]');
      if (!el) return;
      var handler = function (event) { conShapeCtxClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-340]');
      if (!el) return;
      var handler = function (event) { conShapeCtxSetFill('none') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-341]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('mm') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-342]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('pt') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-343]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('px') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-344]');
      if (!el) return;
      var handler = function (event) { conShapeCtxSaveToLibrary() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-345]');
      if (!el) return;
      var handler = function (event) { conShapeCtxDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-346]');
      if (!el) return;
      var handler = function (event) { conDrawingStyleClose(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-347]');
      if (!el) return;
      var handler = function (event) { conDrawingCtxClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-348]');
      if (!el) return;
      var handler = function (event) { (function(v){if(/^#[0-9a-fA-F]{6}$/.test(v)){document.getElementById('con-drawing-ctx-color').value=v;document.getElementById('con-drawing-ctx-color').dispatchEvent(new Event('input'));}})(this.value.trim()) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-349]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('mm') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-350]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('pt') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-351]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('px') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-352]');
      if (!el) return;
      var handler = function (event) { conDrawingCtxLink() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-353]');
      if (!el) return;
      var handler = function (event) { conDrawingCtxSaveToLibrary() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-354]');
      if (!el) return;
      var handler = function (event) { conDrawingCtxDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-355]');
      if (!el) return;
      var handler = function (event) { conGroupCtxClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-356]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'){conGroupCtxAddNode();}if(event.key==='Escape'){this.value='';} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-357]');
      if (!el) return;
      var handler = function (event) { conGroupCtxAddNode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-358]');
      if (!el) return;
      var handler = function (event) { conGroupCtxToggleInvisible() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-359]');
      if (!el) return;
      var handler = function (event) { conGroupCtxToggleMask() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-360]');
      if (!el) return;
      var handler = function (event) { conGroupCtxDuplicate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-361]');
      if (!el) return;
      var handler = function (event) { conGroupCtxResetSize() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-362]');
      if (!el) return;
      var handler = function (event) { conGroupCtxSaveToLibrary() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-363]');
      if (!el) return;
      var handler = function (event) { conGroupCtxBlink() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-364]');
      if (!el) return;
      var handler = function (event) { conClipboardCopy() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-365]');
      if (!el) return;
      var handler = function (event) { conClipboardCut() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-366]');
      if (!el) return;
      var handler = function (event) { conClipboardPaste() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-367]');
      if (!el) return;
      var handler = function (event) { conGroupCtxDissolve() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-368]');
      if (!el) return;
      var handler = function (event) { conGroupCtxSetAnimation(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-369]');
      if (!el) return;
      var handler = function (event) { conGroupCtxSetRevealAnimation(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-370]');
      if (!el) return;
      var handler = function (event) { conPagePopupCommit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-371]');
      if (!el) return;
      var handler = function (event) { conPagePopupRemove() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-372]');
      if (!el) return;
      var handler = function (event) { conPagePopupCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-373]');
      if (!el) return;
      var handler = function (event) { conPageDelPopupClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-374]');
      if (!el) return;
      var handler = function (event) { conCloseTimerPopover() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-375]');
      if (!el) return;
      var handler = function (event) { conTimerConvertModalCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-376]');
      if (!el) return;
      var handler = function (event) { conCloseRandomPopover() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-377]');
      if (!el) return;
      var handler = function (event) { conCloseSoundPopover() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-378]');
      if (!el) return;
      var handler = function (event) { conHandleSoundSeek(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-379]');
      if (!el) return;
      var handler = function (event) { conHandleSoundPlayPause() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-380]');
      if (!el) return;
      var handler = function (event) { conHandleSoundStop() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-381]');
      if (!el) return;
      var handler = function (event) { conSoundNodeOpenNative() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-382]');
      if (!el) return;
      var handler = function (event) { conSoundNodeOpenFolder() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-383]');
      if (!el) return;
      var handler = function (event) { conCloseVideoPopover() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-384]');
      if (!el) return;
      var handler = function (event) { conHandleVideoPlayPause() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-385]');
      if (!el) return;
      var handler = function (event) { conHandleVideoSeek(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-386]');
      if (!el) return;
      var handler = function (event) { conHandleVideoPlayPause() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-387]');
      if (!el) return;
      var handler = function (event) { conHandleVideoStop() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-388]');
      if (!el) return;
      var handler = function (event) { conHandleVideoMute() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-389]');
      if (!el) return;
      var handler = function (event) { conHandleVideoFullscreen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-390]');
      if (!el) return;
      var handler = function (event) { conConvertActiveVideoNodeToCanvas() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-391]');
      if (!el) return;
      var handler = function (event) { conVideoNodeOpenNative() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-392]');
      if (!el) return;
      var handler = function (event) { conVideoNodeOpenFolder() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-393]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxClose)window.conEdgeCtxClose(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-394]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'){if(window.conEdgeCtxSave)window.conEdgeCtxSave();}if(event.key==='Escape'){if(window.conEdgeCtxClose)window.conEdgeCtxClose(false);} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-395]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetPreset)window.conEdgeCtxSetPreset(this.textContent) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-396]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetPreset)window.conEdgeCtxSetPreset(this.textContent) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-397]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetPreset)window.conEdgeCtxSetPreset(this.textContent) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-398]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetPreset)window.conEdgeCtxSetPreset(this.textContent) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-399]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetPreset)window.conEdgeCtxSetPreset(this.textContent) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-400]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxApplyLive)window.conEdgeCtxApplyLive() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-401]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxApplyLive)window.conEdgeCtxApplyLive() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-402]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxApplyLive)window.conEdgeCtxApplyLive() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-403]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetStroke)window.conEdgeCtxSetStroke('solid') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-404]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetStroke)window.conEdgeCtxSetStroke('dashed') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-405]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetStroke)window.conEdgeCtxSetStroke('dotted') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-406]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetStroke)window.conEdgeCtxSetStroke('double') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-407]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetStroke)window.conEdgeCtxSetStroke('wavy') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-408]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetRouting)window.conEdgeCtxSetRouting('straight') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-409]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetRouting)window.conEdgeCtxSetRouting('curved') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-410]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetRouting)window.conEdgeCtxSetRouting('orthogonal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-411]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetDir)window.conEdgeCtxSetDir('none') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-412]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetDir)window.conEdgeCtxSetDir('forward') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-413]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetDir)window.conEdgeCtxSetDir('backward') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-414]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetDir)window.conEdgeCtxSetDir('both') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-415]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxApplyLive)window.conEdgeCtxApplyLive() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-416]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxAddWaypoint)window.conEdgeCtxAddWaypoint() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-417]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxClearWaypoints)window.conEdgeCtxClearWaypoints() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-418]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxSetAutoColor)window.conEdgeCtxSetAutoColor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-419]');
      if (!el) return;
      var handler = function (event) { characterNetworkOpenExcerptsFromActiveEdge() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-420]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxDelete)window.conEdgeCtxDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-421]');
      if (!el) return;
      var handler = function (event) { if(window.conEdgeCtxClose)window.conEdgeCtxClose(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-422]');
      if (!el) return;
      var handler = function (event) { conImportClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-423]');
      if (!el) return;
      var handler = function (event) { conImportRender() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-424]');
      if (!el) return;
      var handler = function (event) { conImportRender() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-425]');
      if (!el) return;
      var handler = function (event) { conImportRender() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-426]');
      if (!el) return;
      var handler = function (event) { conImportRender() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-427]');
      if (!el) return;
      var handler = function (event) { conImportRender() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-428]');
      if (!el) return;
      var handler = function (event) { conImportRender() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-429]');
      if (!el) return;
      var handler = function (event) { conImportRender() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-430]');
      if (!el) return;
      var handler = function (event) { conImportSelectAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-431]');
      if (!el) return;
      var handler = function (event) { conImportClearSel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-432]');
      if (!el) return;
      var handler = function (event) { conImportClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-433]');
      if (!el) return;
      var handler = function (event) { conImportConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-434]');
      if (!el) return;
      var handler = function (event) { conImportTrayClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-435]');
      if (!el) return;
      var handler = function (event) { conImportTrayDropAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-436]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)hideWordDetail() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-437]');
      if (!el) return;
      var handler = function (event) { detZoom(-1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-438]');
      if (!el) return;
      var handler = function (event) { detZoom(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-439]');
      if (!el) return;
      var handler = function (event) { detToggleEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-440]');
      if (!el) return;
      var handler = function (event) { detSaveEdit('memory') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-441]');
      if (!el) return;
      var handler = function (event) { detSaveEdit('main') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-442]');
      if (!el) return;
      var handler = function (event) { detSaveEdit('custom') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-443]');
      if (!el) return;
      var handler = function (event) { detDeleteEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-444]');
      if (!el) return;
      var handler = function (event) { detCancelEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-445]');
      if (!el) return;
      var handler = function (event) { detNavPrev() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-446]');
      if (!el) return;
      var handler = function (event) { detNavBack() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-447]');
      if (!el) return;
      var handler = function (event) { detNavNext() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-448]');
      if (!el) return;
      var handler = function (event) { hideWordDetail() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-449]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeHistoryModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-450]');
      if (!el) return;
      var handler = function (event) { closeHistoryModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-451]');
      if (!el) return;
      var handler = function (event) { window.historyOnSectionHover && window.historyOnSectionHover() };
      el.addEventListener('mouseenter', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-452]');
      if (!el) return;
      var handler = function (event) { historySetViewTab('manual') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-453]');
      if (!el) return;
      var handler = function (event) { historySetViewTab('archived') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-454]');
      if (!el) return;
      var handler = function (event) { historyExportSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-455]');
      if (!el) return;
      var handler = function (event) { historyArchiveSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-456]');
      if (!el) return;
      var handler = function (event) { historyUnarchiveSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-457]');
      if (!el) return;
      var handler = function (event) { historyZipSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-458]');
      if (!el) return;
      var handler = function (event) { historyDeleteSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-459]');
      if (!el) return;
      var handler = function (event) { historyDeleteAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-460]');
      if (!el) return;
      var handler = function (event) { historyRefreshList() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-461]');
      if (!el) return;
      var handler = function (event) { historySetFilterDate('from', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-462]');
      if (!el) return;
      var handler = function (event) { historySetFilterDate('to', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-463]');
      if (!el) return;
      var handler = function (event) { historySetFilterClass(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-464]');
      if (!el) return;
      var handler = function (event) { historyClearFilters() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-465]');
      if (!el) return;
      var handler = function (event) { historySetFilterText(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-466]');
      if (!el) return;
      var handler = function (event) { historySelectAll(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-467]');
      if (!el) return;
      var handler = function (event) { historySetSort('name') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-468]');
      if (!el) return;
      var handler = function (event) { historySetSort('classGroup') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-469]');
      if (!el) return;
      var handler = function (event) { historySetSort('date') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-470]');
      if (!el) return;
      var handler = function (event) { historySetSort('modified') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-471]');
      if (!el) return;
      var handler = function (event) { historySetSort('size') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-472]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter') searchPerform() };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-473]');
      if (!el) return;
      var handler = function (event) { searchPerform() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-474]');
      if (!el) return;
      var handler = function (event) { searchClear() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-475]');
      if (!el) return;
      var handler = function (event) { searchOpenImport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-476]');
      if (!el) return;
      var handler = function (event) { searchLoadShortcutBook() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-477]');
      if (!el) return;
      var handler = function (event) { searchInitShortcutMenu() };
      el.addEventListener('focus', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-478]');
      if (!el) return;
      var handler = function (event) { wfaOpen('search') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-479]');
      if (!el) return;
      var handler = function (event) { characterNetworkOpenModal(searchBookText) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-480]');
      if (!el) return;
      var handler = function (event) { conClearAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-481]');
      if (!el) return;
      var handler = function (event) { conExport(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-482]');
      if (!el) return;
      var handler = function (event) { boardNewSession('constellation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-483]');
      if (!el) return;
      var handler = function (event) { conOpenNewBoardWindow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-484]');
      if (!el) return;
      var handler = function (event) { conSaveSession() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-485]');
      if (!el) return;
      var handler = function (event) { conDuplicateCurrentFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-486]');
      if (!el) return;
      var handler = function (event) { conOpenCurrentFileNative() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-487]');
      if (!el) return;
      var handler = function (event) { conOpenCurrentFileLocationFolder() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-488]');
      if (!el) return;
      var handler = function (event) { openSessionLoadPopup('constellation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-489]');
      if (!el) return;
      var handler = function (event) { conCloseSession() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-490]');
      if (!el) return;
      var handler = function (event) { conOpenTemplatePopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-491]');
      if (!el) return;
      var handler = function (event) { conOpenPremadeLibraryModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-492]');
      if (!el) return;
      var handler = function (event) { conLoadWelcomeShowcaseBoard(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-493]');
      if (!el) return;
      var handler = function (event) { conOpenManageMediaChooser(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-494]');
      if (!el) return;
      var handler = function (event) { conOpenCompetenceModal('board') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-495]');
      if (!el) return;
      var handler = function (event) { boardOpenSessionLinksModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-496]');
      if (!el) return;
      var handler = function (event) { if (typeof conOpenImportWizard === 'function' && !event.shiftKey) conOpenImportWizard(); else conOpenUniversalImportModal(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-497]');
      if (!el) return;
      var handler = function (event) { conLoadSession(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-498]');
      if (!el) return;
      var handler = function (event) { conHandleAttachmentInput(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-499]');
      if (!el) return;
      var handler = function (event) { if (typeof window.conOpenAxisPicker === 'function') window.conOpenAxisPicker('spread', event, 'board'); else if (typeof window.conSpreadNodes === 'function') window.conSpreadNodes(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-500]');
      if (!el) return;
      var handler = function (event) { if (typeof window.conOpenAxisPicker === 'function') window.conOpenAxisPicker('compact', event, 'board'); else if (typeof window.conCompactNodes === 'function') window.conCompactNodes(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-501]');
      if (!el) return;
      var handler = function (event) { conToggleMaskAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-502]');
      if (!el) return;
      var handler = function (event) { conAddMask() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-503]');
      if (!el) return;
      var handler = function (event) { conAddTableDialog() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-504]');
      if (!el) return;
      var handler = function (event) { conBoardCtxCreateGroup(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-505]');
      if (!el) return;
      var handler = function (event) { conToggleSnap() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-506]');
      if (!el) return;
      var handler = function (event) { conTriggerEntityNumbering() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-507]');
      if (!el) return;
      var handler = function (event) { conImportOpen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-508]');
      if (!el) return;
      var handler = function (event) { unknownWordsOpen('constellation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-509]');
      if (!el) return;
      var handler = function (event) { conToggleAllIpa() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-510]');
      if (!el) return;
      var handler = function (event) { boardToggleIpaKeyboard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-511]');
      if (!el) return;
      var handler = function (event) { conToggleAllFrench() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-512]');
      if (!el) return;
      var handler = function (event) { conDbExportOpen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-513]');
      if (!el) return;
      var handler = function (event) { conGenerateMindmapFromDb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-514]');
      if (!el) return;
      var handler = function (event) { conSyncNewNodesToDb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-515]');
      if (!el) return;
      var handler = function (event) { conOpenLearningImportModal('vocab') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-516]');
      if (!el) return;
      var handler = function (event) { characterNetworkOpenModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-517]');
      if (!el) return;
      var handler = function (event) { boardAiOpenPopover(null, this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-518]');
      if (!el) return;
      var handler = function (event) { openSlmModelManager() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-519]');
      if (!el) return;
      var handler = function (event) { updateZoom(window.conCurrentZoom - 0.1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-520]');
      if (!el) return;
      var handler = function (event) { updateZoom(window.conCurrentZoom + 0.1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-521]');
      if (!el) return;
      var handler = function (event) { conSetDefaultWordFontSize(this.value, true) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-522]');
      if (!el) return;
      var handler = function (event) { conSwitchFontUnit('pt') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-523]');
      if (!el) return;
      var handler = function (event) { conSwitchFontUnit('px') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-524]');
      if (!el) return;
      var handler = function (event) { conOpenMirrorWindow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-525]');
      if (!el) return;
      var handler = function (event) { conCloseMirrorWindow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-526]');
      if (!el) return;
      var handler = function (event) { conToggleMirrorPointer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-527]');
      if (!el) return;
      var handler = function (event) { conToggleMirrorFreeze() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-528]');
      if (!el) return;
      var handler = function (event) { boardToggleDictation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-529]');
      if (!el) return;
      var handler = function (event) { boardVideoOpenSetup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-530]');
      if (!el) return;
      var handler = function (event) { conOpenSearchModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-531]');
      if (!el) return;
      var handler = function (event) { window.conAddPage() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-532]');
      if (!el) return;
      var handler = function (event) { window.conCopyPage() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-533]');
      if (!el) return;
      var handler = function (event) { window.conPastePage() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-534]');
      if (!el) return;
      var handler = function (event) { conOpenPagePreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-535]');
      if (!el) return;
      var handler = function (event) { openBoardShortcuts() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-536]');
      if (!el) return;
      var handler = function (event) { conSetTitle(this.value); if(typeof window.conMarkBoardDirty==='function')window.conMarkBoardDirty(); if(typeof conUpdateRenameButtonVisibility==='function')conUpdateRenameButtonVisibility(); };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-537]');
      if (!el) return;
      var handler = function (event) { conSetTitle(this.value); if(typeof window.conMarkBoardDirty==='function')window.conMarkBoardDirty(); if(typeof conUpdateRenameButtonVisibility==='function')conUpdateRenameButtonVisibility(); };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-538]');
      if (!el) return;
      var handler = function (event) { conRenameCurrentFileFromInput() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-539]');
      if (!el) return;
      var handler = function (event) { bpOpen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-540]');
      if (!el) return;
      var handler = function (event) { bpShowAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-541]');
      if (!el) return;
      var handler = function (event) { bpClear() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-542]');
      if (!el) return;
      var handler = function (event) { conToggleClassDropdown() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-543]');
      if (!el) return;
      var handler = function (event) { if(typeof conToggleMirrorFreeze==='function')conToggleMirrorFreeze(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-544]');
      if (!el) return;
      var handler = function (event) { setBoardMode('text') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-545]');
      if (!el) return;
      var handler = function (event) { setBoardMode('drawings') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-546]');
      if (!el) return;
      var handler = function (event) { setBoardMode('hand') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-547]');
      if (!el) return;
      var handler = function (event) { setBoardMode('laser') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-548]');
      if (!el) return;
      var handler = function (event) { conToggleToolbarPin() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-549]');
      if (!el) return;
      var handler = function (event) { window.conGoToPrevPage() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-550]');
      if (!el) return;
      var handler = function (event) { window.conGoToNextPage() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-551]');
      if (!el) return;
      var handler = function (event) { window.conAddPage() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-552]');
      if (!el) return;
      var handler = function (event) { conDrawToggleMenu('shapes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-553]');
      if (!el) return;
      var handler = function (event) { conShapeSetDrawFill('none') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-554]');
      if (!el) return;
      var handler = function (event) { conShapeSetDrawFill(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-555]');
      if (!el) return;
      var handler = function (event) { conDrawSetArrowheadSize(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-556]');
      if (!el) return;
      var handler = function (event) { conDrawToggleMenu('colour') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-557]');
      if (!el) return;
      var handler = function (event) { conDrawSetColor(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-558]');
      if (!el) return;
      var handler = function (event) { conDrawToggleMenu('line') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-559]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('mm') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-560]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('pt') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-561]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('px') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-562]');
      if (!el) return;
      var handler = function (event) { conDrawSetThickness(this.value, true) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-563]');
      if (!el) return;
      var handler = function (event) { conDrawSetOpacity(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-564]');
      if (!el) return;
      var handler = function (event) { conDrawToggleEraser() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-565]');
      if (!el) return;
      var handler = function (event) { conDrawToggleMenu('eraser') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-566]');
      if (!el) return;
      var handler = function (event) { conDrawSetEraserType('partial') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-567]');
      if (!el) return;
      var handler = function (event) { conDrawSetEraserType('stroke') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-568]');
      if (!el) return;
      var handler = function (event) { conDrawSetEraserRadius(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-569]');
      if (!el) return;
      var handler = function (event) { conToggleDrawMode() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-570]');
      if (!el) return;
      var handler = function (event) { conOnPeekHandleClick(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-571]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); conToggleToolbarPin(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-572]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)noteStudentPopupClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-573]');
      if (!el) return;
      var handler = function (event) { noteStudentPopupClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-574]');
      if (!el) return;
      var handler = function (event) { _noteStudentSetMode('local') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-575]');
      if (!el) return;
      var handler = function (event) { _noteStudentSetMode('external') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-576]');
      if (!el) return;
      var handler = function (event) { noteStudentRefreshAddressPreview() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-577]');
      if (!el) return;
      var handler = function (event) { noteStudentConnect() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-578]');
      if (!el) return;
      var handler = function (event) { noteStudentDisconnect() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-579]');
      if (!el) return;
      var handler = function (event) { noteStudentCopyJoinUrl() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-580]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)taCloseImport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-581]');
      if (!el) return;
      var handler = function (event) { taImportFileLoaded(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-582]');
      if (!el) return;
      var handler = function (event) { document.getElementById('ta-imp-file-input').click() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-583]');
      if (!el) return;
      var handler = function (event) { taImportConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-584]');
      if (!el) return;
      var handler = function (event) { taCloseImport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-585]');
      if (!el) return;
      var handler = function (event) { taImportFolderUp() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-586]');
      if (!el) return;
      var handler = function (event) { taImportSelectFolder(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-587]');
      if (!el) return;
      var handler = function (event) { taImportSelectFolder('') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-588]');
      if (!el) return;
      var handler = function (event) { taImportLoadShortcutBook() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-589]');
      if (!el) return;
      var handler = function (event) { taImportToggleSearchScope() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-590]');
      if (!el) return;
      var handler = function (event) { taImportSearchRun() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-591]');
      if (!el) return;
      var handler = function (event) { taImportSearchKey(event) };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-592]');
      if (!el) return;
      var handler = function (event) { taImportSearchStep(-1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-593]');
      if (!el) return;
      var handler = function (event) { taImportSearchStep(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-594]');
      if (!el) return;
      var handler = function (event) { taImportToggleSearchResults() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-595]');
      if (!el) return;
      var handler = function (event) { taImportJumpToPageInput() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-596]');
      if (!el) return;
      var handler = function (event) { wnStyleClose(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-597]');
      if (!el) return;
      var handler = function (event) { wnStyleDismiss() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-598]');
      if (!el) return;
      var handler = function (event) { wnOpenDictionaryForSelectedWord() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-599]');
      if (!el) return;
      var handler = function (event) { conSwitchFontUnit('pt') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-600]');
      if (!el) return;
      var handler = function (event) { conSwitchFontUnit('px') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-601]');
      if (!el) return;
      var handler = function (event) { wnStyleSetSize(this.value, true) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-602]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-603]');
      if (!el) return;
      var handler = function (event) { wnStyleToggle('bold') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-604]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-605]');
      if (!el) return;
      var handler = function (event) { wnStyleToggle('italic') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-606]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-607]');
      if (!el) return;
      var handler = function (event) { wnStyleToggle('underline') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-608]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-609]');
      if (!el) return;
      var handler = function (event) { wnStyleToggle('wavy') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-610]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-611]');
      if (!el) return;
      var handler = function (event) { wnStyleToggle('strike') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-612]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-613]');
      if (!el) return;
      var handler = function (event) { wnStyleToggleCaseDropdown(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-614]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-615]');
      if (!el) return;
      var handler = function (event) { wnStyleSetCasing('none') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-616]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-617]');
      if (!el) return;
      var handler = function (event) { wnStyleSetCasing('uppercase') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-618]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-619]');
      if (!el) return;
      var handler = function (event) { wnStyleSetCasing('lowercase') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-620]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-621]');
      if (!el) return;
      var handler = function (event) { wnStyleSetCasing('titlecase') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-622]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-623]');
      if (!el) return;
      var handler = function (event) { wnStyleSetCasing('sentencecase') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-624]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-625]');
      if (!el) return;
      var handler = function (event) { wnStyleSetCasing('smallcaps') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-626]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-627]');
      if (!el) return;
      var handler = function (event) { wnInsertList('insertUnorderedList') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-628]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-629]');
      if (!el) return;
      var handler = function (event) { wnInsertList('insertOrderedList') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-630]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-631]');
      if (!el) return;
      var handler = function (event) { wnInsertCheckboxList() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-632]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-633]');
      if (!el) return;
      var handler = function (event) { wnOutdentList() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-634]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-635]');
      if (!el) return;
      var handler = function (event) { wnIndentList() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-636]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-637]');
      if (!el) return;
      var handler = function (event) { wnLinkOpen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-638]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-639]');
      if (!el) return;
      var handler = function (event) { wnStyleSetAlign('left') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-640]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-641]');
      if (!el) return;
      var handler = function (event) { wnStyleSetAlign('center') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-642]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-643]');
      if (!el) return;
      var handler = function (event) { wnStyleSetAlign('right') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-644]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-645]');
      if (!el) return;
      var handler = function (event) { wnStyleSetAlign('justify') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-646]');
      if (!el) return;
      var handler = function (event) { wnStyleCountWords() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-647]');
      if (!el) return;
      var handler = function (event) { noteOpenPresetEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-648]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('mm') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-649]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('pt') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-650]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit('px') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-651]');
      if (!el) return;
      var handler = function (event) { wnStyleSetBorderWidth(this.value, true) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-652]');
      if (!el) return;
      var handler = function (event) { wnStyleSetBorderStyle('solid') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-653]');
      if (!el) return;
      var handler = function (event) { wnStyleSetBorderStyle('dashed') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-654]');
      if (!el) return;
      var handler = function (event) { wnStyleSetBorderStyle('dotted') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-655]');
      if (!el) return;
      var handler = function (event) { wnStyleSetBorderStyle('double') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-656]');
      if (!el) return;
      var handler = function (event) { wnStyleSetBorderColor(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-657]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-658]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('vertical','left') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-659]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-660]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('vertical','middle') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-661]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-662]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('vertical','right') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-663]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-664]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('horizontal','top') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-665]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-666]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('horizontal','centre') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-667]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-668]');
      if (!el) return;
      var handler = function (event) { conCtxAlignSelected('horizontal','bottom') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-669]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-670]');
      if (!el) return;
      var handler = function (event) { conCtxDistributeSelected('horizontal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-671]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-672]');
      if (!el) return;
      var handler = function (event) { conCtxDistributeSelected('vertical') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-673]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-674]');
      if (!el) return;
      var handler = function (event) { conCtxGridSelected() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-675]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-676]');
      if (!el) return;
      var handler = function (event) { wnStyleClearSelectedFormat() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-677]');
      if (!el) return;
      var handler = function (event) { wnStyleToggleLock() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-678]');
      if (!el) return;
      var handler = function (event) { wnStyleToggleHide() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-679]');
      if (!el) return;
      var handler = function (event) { wnStyleBlink() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-680]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-681]');
      if (!el) return;
      var handler = function (event) { wnStyleFitText() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-682]');
      if (!el) return;
      var handler = function (event) { wnStyleDuplicateNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-683]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-684]');
      if (!el) return;
      var handler = function (event) { wnStyleSplitNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-685]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-686]');
      if (!el) return;
      var handler = function (event) { wnStyleMergeNotes() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-687]');
      if (!el) return;
      var handler = function (event) { wnStyleCountWords() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-688]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-689]');
      if (!el) return;
      var handler = function (event) { wnOpenIpaKeyboard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-690]');
      if (!el) return;
      var handler = function (event) { wnOpenDictionaryForNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-691]');
      if (!el) return;
      var handler = function (event) { wnStyleConvertToNode(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.getElementById('wn-sp-ai-studio-btn');
      if (!el) return;
      var handler = function (event) { if (typeof boardAiOpenPopover === 'function') boardAiOpenPopover({}, this); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-694]');
      if (!el) return;
      var handler = function (event) { wnStyleEditNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-695]');
      if (!el) return;
      var handler = function (event) { wnSaveNoteToLibrary() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-696]');
      if (!el) return;
      var handler = function (event) { wnpOpen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-697]');
      if (!el) return;
      var handler = function (event) { wnStyleOpenStudentInput() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-698]');
      if (!el) return;
      var handler = function (event) { wnStyleStopStudentInput() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-699]');
      if (!el) return;
      var handler = function (event) { wnStyleDeleteNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-700]');
      if (!el) return;
      var handler = function (event) { wnStyleSetAnimation(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-701]');
      if (!el) return;
      var handler = function (event) { wnStyleSetRevealAnimation(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-702]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-703]');
      if (!el) return;
      var handler = function (event) { conNoteConvertChoose('entire') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-704]');
      if (!el) return;
      var handler = function (event) { conNoteConvertChoose('lines') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-705]');
      if (!el) return;
      var handler = function (event) { conNoteConvertChoose('sentences') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-706]');
      if (!el) return;
      var handler = function (event) { conNoteConvertChoose('words') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-707]');
      if (!el) return;
      var handler = function (event) { conNoteConvertModalCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-708]');
      if (!el) return;
      var handler = function (event) { wnLinkDialogOverlayClick(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-709]');
      if (!el) return;
      var handler = function (event) { wnLinkClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-710]');
      if (!el) return;
      var handler = function (event) { wnLinkKeydown(event) };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-711]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-712]');
      if (!el) return;
      var handler = function (event) { wnLinkRemove() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-713]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-714]');
      if (!el) return;
      var handler = function (event) { wnLinkClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-715]');
      if (!el) return;
      var handler = function (event) { event.preventDefault() };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-716]');
      if (!el) return;
      var handler = function (event) { wnLinkApply() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-717]');
      if (!el) return;
      var handler = function (event) { searchCtxClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-718]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)historyDeleteCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-719]');
      if (!el) return;
      var handler = function (event) { historyDeleteCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-720]');
      if (!el) return;
      var handler = function (event) { historyDeleteConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-721]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)historyDuplicateCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-722]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter')historyDuplicateCommit();if(event.key==='Escape')historyDuplicateCancel() };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-723]');
      if (!el) return;
      var handler = function (event) { historyDuplicateCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-724]');
      if (!el) return;
      var handler = function (event) { historyDuplicateCommit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-725]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)historyRenameCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-726]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter')historyRenameCommit();if(event.key==='Escape')historyRenameCancel() };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-727]');
      if (!el) return;
      var handler = function (event) { historyRenameCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-728]');
      if (!el) return;
      var handler = function (event) { historyRenameCommit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-729]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)newSessionConfirmCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-730]');
      if (!el) return;
      var handler = function (event) { newSessionConfirmCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-731]');
      if (!el) return;
      var handler = function (event) { newSessionConfirmDiscard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-732]');
      if (!el) return;
      var handler = function (event) { newSessionConfirmSave() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-733]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeTourChoice() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-734]');
      if (!el) return;
      var handler = function (event) { closeTourChoice() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-735]');
      if (!el) return;
      var handler = function (event) { startTourChoice('main') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-736]');
      if (!el) return;
      var handler = function (event) { startTourChoice('history') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-737]');
      if (!el) return;
      var handler = function (event) { startTourChoice('board') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-738]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conCloseCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-739]');
      if (!el) return;
      var handler = function (event) { conCloseCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-740]');
      if (!el) return;
      var handler = function (event) { conCloseDiscard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-741]');
      if (!el) return;
      var handler = function (event) { conCloseSave() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-742]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)sfnCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-743]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter')sfnConfirm();if(event.key==='Escape')sfnCancel() };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-744]');
      if (!el) return;
      var handler = function (event) { sfnCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-745]');
      if (!el) return;
      var handler = function (event) { sfnConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-746]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeSessionLoadPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-747]');
      if (!el) return;
      var handler = function (event) { closeSessionLoadPopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-748]');
      if (!el) return;
      var handler = function (event) { sessionLoadFromFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-749]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conCloseTemplatePopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-750]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter')conSaveTemplate() };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-751]');
      if (!el) return;
      var handler = function (event) { conSaveTemplate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-752]');
      if (!el) return;
      var handler = function (event) { conLoadTemplateFromFile(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-753]');
      if (!el) return;
      var handler = function (event) { conCloseTemplatePopup() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-754]');
      if (!el) return;
      var handler = function (event) { document.getElementById('con-template-load-input').click() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-755]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conCloseCompetenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-756]');
      if (!el) return;
      var handler = function (event) { conCloseCompetenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-757]');
      if (!el) return;
      var handler = function (event) { conApplyPlannerSuggestedCompetences() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-758]');
      if (!el) return;
      var handler = function (event) { conFilterCompetencePicker() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-759]');
      if (!el) return;
      var handler = function (event) { conFilterCompetencePicker() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-760]');
      if (!el) return;
      var handler = function (event) { conFilterCompetencePicker() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-761]');
      if (!el) return;
      var handler = function (event) { conFilterCompetencePicker() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-762]');
      if (!el) return;
      var handler = function (event) { conFilterCompetencePicker() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-763]');
      if (!el) return;
      var handler = function (event) { conToggleCompFilterSelected(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-764]');
      if (!el) return;
      var handler = function (event) { conSelectAllVisibleCompetences(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-765]');
      if (!el) return;
      var handler = function (event) { conSelectAllVisibleCompetences(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-766]');
      if (!el) return;
      var handler = function (event) { conCloseCompetenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-767]');
      if (!el) return;
      var handler = function (event) { conApplySelectedCompetences() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-768]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conCloseClassImportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-769]');
      if (!el) return;
      var handler = function (event) { conCloseClassImportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-770]');
      if (!el) return;
      var handler = function (event) { conSwitchClassImportTab('roster') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-771]');
      if (!el) return;
      var handler = function (event) { conSwitchClassImportTab('plan') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-772]');
      if (!el) return;
      var handler = function (event) { conSwitchClassImportTab('teams') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-773]');
      if (!el) return;
      var handler = function (event) { conToggleClassImportPlannerFilter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-774]');
      if (!el) return;
      var handler = function (event) { conOnRosterClassSelect(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-775]');
      if (!el) return;
      var handler = function (event) { conOnNameFormatChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-776]');
      if (!el) return;
      var handler = function (event) { conSelectAllRosterStudents(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-777]');
      if (!el) return;
      var handler = function (event) { conSelectAllRosterStudents(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-778]');
      if (!el) return;
      var handler = function (event) { conOnPlanClassSelect(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-779]');
      if (!el) return;
      var handler = function (event) { conOnNameFormatChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-780]');
      if (!el) return;
      var handler = function (event) { conOnPlanSelect(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-781]');
      if (!el) return;
      var handler = function (event) { conOnTeamsClassSelect(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-782]');
      if (!el) return;
      var handler = function (event) { conOnNameFormatChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-783]');
      if (!el) return;
      var handler = function (event) { conOnTeamsModeChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-784]');
      if (!el) return;
      var handler = function (event) { conOnTeamsModeChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-785]');
      if (!el) return;
      var handler = function (event) { conOnTeamsSetupSelect(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-786]');
      if (!el) return;
      var handler = function (event) { conOnTeamsCountSelect(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-787]');
      if (!el) return;
      var handler = function (event) { conReshuffleRandomTeams() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-788]');
      if (!el) return;
      var handler = function (event) { conCloseClassImportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-789]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conMergeChoiceCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-790]');
      if (!el) return;
      var handler = function (event) { conMergeChoiceCancel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-791]');
      if (!el) return;
      var handler = function (event) { conMergeChoiceExecute('phrase') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-792]');
      if (!el) return;
      var handler = function (event) { conMergeChoiceExecute('single') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-793]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)boardCustomiseClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-794]');
      if (!el) return;
      var handler = function (event) { boardCustomiseClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-795]');
      if (!el) return;
      var handler = function (event) { boardCustomiseSetTab('nodes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-796]');
      if (!el) return;
      var handler = function (event) { boardCustomiseSetTab('notes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-797]');
      if (!el) return;
      var handler = function (event) { boardCustomiseSetTab('canvas') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-798]');
      if (!el) return;
      var handler = function (event) { boardCustomiseSetTab('tools') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-799]');
      if (!el) return;
      var handler = function (event) { boardCustomiseSetTab('shortcuts') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-800]');
      if (!el) return;
      var handler = function (event) { boardCustomiseSetTab('sounds') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-801]');
      if (!el) return;
      var handler = function (event) { boardCustomiseSetTab('animation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-802]');
      if (!el) return;
      var handler = function (event) { boardCustomiseExpandAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-803]');
      if (!el) return;
      var handler = function (event) { boardCustomiseCollapseAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-804]');
      if (!el) return;
      var handler = function (event) { conPresetEditorAddRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-805]');
      if (!el) return;
      var handler = function (event) { conPresetEditorSave() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-806]');
      if (!el) return;
      var handler = function (event) { if(typeof bcUpdateNumberBadgePreview==='function')bcUpdateNumberBadgePreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-807]');
      if (!el) return;
      var handler = function (event) { if(typeof bcUpdateNumberBadgePreview==='function')bcUpdateNumberBadgePreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-808]');
      if (!el) return;
      var handler = function (event) { if(typeof bcSyncColorInput==='function')bcSyncColorInput('bc-entity-num-bg', this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-809]');
      if (!el) return;
      var handler = function (event) { if(typeof bcSyncColorPicker==='function')bcSyncColorPicker('bc-entity-num-bg-picker', this.value); if(typeof bcUpdateNumberBadgePreview==='function')bcUpdateNumberBadgePreview() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-810]');
      if (!el) return;
      var handler = function (event) { if(typeof bcSyncColorPicker==='function')bcSyncColorPicker('bc-entity-num-bg-picker', this.value); if(typeof bcUpdateNumberBadgePreview==='function')bcUpdateNumberBadgePreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-811]');
      if (!el) return;
      var handler = function (event) { if(typeof bcSyncColorInput==='function')bcSyncColorInput('bc-entity-num-color', this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-812]');
      if (!el) return;
      var handler = function (event) { if(typeof bcSyncColorPicker==='function')bcSyncColorPicker('bc-entity-num-color-picker', this.value); if(typeof bcUpdateNumberBadgePreview==='function')bcUpdateNumberBadgePreview() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-813]');
      if (!el) return;
      var handler = function (event) { if(typeof bcSyncColorPicker==='function')bcSyncColorPicker('bc-entity-num-color-picker', this.value); if(typeof bcUpdateNumberBadgePreview==='function')bcUpdateNumberBadgePreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-814]');
      if (!el) return;
      var handler = function (event) { if(typeof bcSyncColorInput==='function')bcSyncColorInput('bc-entity-num-border', this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-815]');
      if (!el) return;
      var handler = function (event) { if(typeof bcSyncColorPicker==='function')bcSyncColorPicker('bc-entity-num-border-picker', this.value); if(typeof bcUpdateNumberBadgePreview==='function')bcUpdateNumberBadgePreview() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-816]');
      if (!el) return;
      var handler = function (event) { if(typeof bcSyncColorPicker==='function')bcSyncColorPicker('bc-entity-num-border-picker', this.value); if(typeof bcUpdateNumberBadgePreview==='function')bcUpdateNumberBadgePreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-817]');
      if (!el) return;
      var handler = function (event) { if(typeof bcUpdateNumberBadgePreview==='function')bcUpdateNumberBadgePreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-818]');
      if (!el) return;
      var handler = function (event) { notePresetEditorAddRow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-819]');
      if (!el) return;
      var handler = function (event) { notePresetEditorSave() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-820]');
      if (!el) return;
      var handler = function (event) { conSwitchFontUnit(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-821]');
      if (!el) return;
      var handler = function (event) { conSwitchThicknessUnit(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-822]');
      if (!el) return;
      var handler = function (event) { boardFilterShortcutsTable() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-823]');
      if (!el) return;
      var handler = function (event) { boardFilterShortcutsTable() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-824]');
      if (!el) return;
      var handler = function (event) { resetBoardShortcutsToDefault() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-825]');
      if (!el) return;
      var handler = function (event) { boardSoundToggleMasterEnable(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-826]');
      if (!el) return;
      var handler = function (event) { document.getElementById('bc-sound-master-vol-val').textContent = this.value + '%' };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-827]');
      if (!el) return;
      var handler = function (event) { boardSoundRescanFiles() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-828]');
      if (!el) return;
      var handler = function (event) { boardFilterSoundTable() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-829]');
      if (!el) return;
      var handler = function (event) { boardFilterSoundTable() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-830]');
      if (!el) return;
      var handler = function (event) { boardSoundSelectAll(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-831]');
      if (!el) return;
      var handler = function (event) { boardSoundSelectAll(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-832]');
      if (!el) return;
      var handler = function (event) { resetBoardSoundsToDefault() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-833]');
      if (!el) return;
      var handler = function (event) { document.getElementById('bc-anim-color').value=this.value; bcUpdateAnimPreview(); };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-834]');
      if (!el) return;
      var handler = function (event) { if(/^#[0-9a-fA-F]{6}$/.test(this.value)) document.getElementById('bc-anim-color-picker').value=this.value; bcUpdateAnimPreview(); };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-835]');
      if (!el) return;
      var handler = function (event) { bcUpdateAnimPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-836]');
      if (!el) return;
      var handler = function (event) { document.getElementById('bc-anim-duration-val').textContent=parseFloat(this.value).toFixed(1)+'s'; bcUpdateAnimPreview(); };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-837]');
      if (!el) return;
      var handler = function (event) { document.getElementById('bc-anim-intensity-val').textContent=Math.round(parseFloat(this.value)*100)+'%'; bcUpdateAnimPreview(); };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-838]');
      if (!el) return;
      var handler = function (event) { bcUpdateAnimPreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-839]');
      if (!el) return;
      var handler = function (event) { document.getElementById('bc-active-color').value=this.value; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-840]');
      if (!el) return;
      var handler = function (event) { if(/^#[0-9a-fA-F]{6}$/.test(this.value)) document.getElementById('bc-active-color-picker').value=this.value; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-841]');
      if (!el) return;
      var handler = function (event) { document.getElementById('bc-active-width-val').textContent=this.value+'px'; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-842]');
      if (!el) return;
      var handler = function (event) { document.getElementById('bc-active-glow-val').textContent=Math.round(parseFloat(this.value)*100)+'%'; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-843]');
      if (!el) return;
      var handler = function (event) { boardCustomiseClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-844]');
      if (!el) return;
      var handler = function (event) { boardCustomiseSave() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-845]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conClosePagePreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-846]');
      if (!el) return;
      var handler = function (event) { conClosePagePreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-847]');
      if (!el) return;
      var handler = function (event) { window.conPreviewCopySelectedPages() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-848]');
      if (!el) return;
      var handler = function (event) { window.conPreviewPasteCopiedPagesPrompt() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-849]');
      if (!el) return;
      var handler = function (event) { window.conPreviewMergeSelectedPagesPrompt() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-850]');
      if (!el) return;
      var handler = function (event) { window.conPreviewDeleteSelectedPages(this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-851]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conCloseSearchModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-852]');
      if (!el) return;
      var handler = function (event) { conCloseSearchModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-853]');
      if (!el) return;
      var handler = function (event) { conExecuteSearchDebounced() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-854]');
      if (!el) return;
      var handler = function (event) { conSearchInputKeyDown(event) };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-855]');
      if (!el) return;
      var handler = function (event) { boardSttTriggerSearchMic() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-856]');
      if (!el) return;
      var handler = function (event) { conClearSearchInput() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-857]');
      if (!el) return;
      var handler = function (event) { conSetSearchScope('current') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-858]');
      if (!el) return;
      var handler = function (event) { conSetSearchScope('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-859]');
      if (!el) return;
      var handler = function (event) { conSetSearchTypeFilter('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-860]');
      if (!el) return;
      var handler = function (event) { conSetSearchTypeFilter('node') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-861]');
      if (!el) return;
      var handler = function (event) { conSetSearchTypeFilter('note') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-862]');
      if (!el) return;
      var handler = function (event) { conSetSearchTypeFilter('table') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-863]');
      if (!el) return;
      var handler = function (event) { conSetSearchTypeFilter('group') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-864]');
      if (!el) return;
      var handler = function (event) { conOpenSearchTermInNewWindow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-865]');
      if (!el) return;
      var handler = function (event) { conJumpToItem() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-866]');
      if (!el) return;
      var handler = function (event) { conOpenSearchTermInNewWindow() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-867]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conClosePageMergeModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-868]');
      if (!el) return;
      var handler = function (event) { conClosePageMergeModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-869]');
      if (!el) return;
      var handler = function (event) { conClosePageMergeModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-870]');
      if (!el) return;
      var handler = function (event) { conExecutePageMerge() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-871]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conClosePremadeLibraryModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-872]');
      if (!el) return;
      var handler = function (event) { conSaveSelectionToLibraryPrompt() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-873]');
      if (!el) return;
      var handler = function (event) { conClosePremadeLibraryModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-874]');
      if (!el) return;
      var handler = function (event) { conRenderPremadeLibraryList() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-875]');
      if (!el) return;
      var handler = function (event) { conSetPremadeLibraryCategory('all', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-876]');
      if (!el) return;
      var handler = function (event) { conSetPremadeLibraryCategory('templates', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-877]');
      if (!el) return;
      var handler = function (event) { conSetPremadeLibraryCategory('widgets', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-878]');
      if (!el) return;
      var handler = function (event) { conSetPremadeLibraryCategory('callouts', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-879]');
      if (!el) return;
      var handler = function (event) { conSetPremadeLibraryCategory('custom', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-880]');
      if (!el) return;
      var handler = function (event) { conSetPremadeLibraryCategory('pinned', this) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-881]');
      if (!el) return;
      var handler = function (event) { historyPreviewClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-882]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)cwdbClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-883]');
      if (!el) return;
      var handler = function (event) { cwdbClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-884]');
      if (!el) return;
      var handler = function (event) { cwdbSave('memory') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-885]');
      if (!el) return;
      var handler = function (event) { cwdbSave('main') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-886]');
      if (!el) return;
      var handler = function (event) { cwdbSave('custom') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-887]');
      if (!el) return;
      var handler = function (event) { cwdbDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-888]');
      if (!el) return;
      var handler = function (event) { cwdbClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-889]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conDefPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-890]');
      if (!el) return;
      var handler = function (event) { conDefPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-891]');
      if (!el) return;
      var handler = function (event) { conDefPickerSelectAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-892]');
      if (!el) return;
      var handler = function (event) { conDefPickerClearAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-893]');
      if (!el) return;
      var handler = function (event) { conDefPickerConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-894]');
      if (!el) return;
      var handler = function (event) { conDefPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-895]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conTransPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-896]');
      if (!el) return;
      var handler = function (event) { conTransPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-897]');
      if (!el) return;
      var handler = function (event) { conTransPickerSelectAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-898]');
      if (!el) return;
      var handler = function (event) { conTransPickerClearAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-899]');
      if (!el) return;
      var handler = function (event) { conTransPickerConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-900]');
      if (!el) return;
      var handler = function (event) { conTransPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-901]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conNetworkClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-902]');
      if (!el) return;
      var handler = function (event) { conNetworkClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-903]');
      if (!el) return;
      var handler = function (event) { conNetworkSetDepth(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-904]');
      if (!el) return;
      var handler = function (event) { conNetworkSetDepth(2) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-905]');
      if (!el) return;
      var handler = function (event) { conNetworkSetDepth(3) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-906]');
      if (!el) return;
      var handler = function (event) { conNetworkSpawn() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-907]');
      if (!el) return;
      var handler = function (event) { conNetworkClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-908]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conRelPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-909]');
      if (!el) return;
      var handler = function (event) { conRelPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-910]');
      if (!el) return;
      var handler = function (event) { conRelPickerSelectAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-911]');
      if (!el) return;
      var handler = function (event) { conRelPickerClearAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-912]');
      if (!el) return;
      var handler = function (event) { conRelPickerConfirm() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-913]');
      if (!el) return;
      var handler = function (event) { conRelPickerClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-914]');
      if (!el) return;
      var handler = function (event) { wfaClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-915]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)closeCreditsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-916]');
      if (!el) return;
      var handler = function (event) { closeCreditsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-917]');
      if (!el) return;
      var handler = function (event) { conRecordSaveAndProceed() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-918]');
      if (!el) return;
      var handler = function (event) { conRecordToggle() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-919]');
      if (!el) return;
      var handler = function (event) { conRecordClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-920]');
      if (!el) return;
      var handler = function (event) { conRecordSave() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-921]');
      if (!el) return;
      var handler = function (event) { conTrimPlayAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-922]');
      if (!el) return;
      var handler = function (event) { conTrimPlaySelection() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-923]');
      if (!el) return;
      var handler = function (event) { conTrimStop() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-924]');
      if (!el) return;
      var handler = function (event) { conTrimClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-925]');
      if (!el) return;
      var handler = function (event) { conTrimSave() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-926]');
      if (!el) return;
      var handler = function (event) { conImgStyleClose(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-927]');
      if (!el) return;
      var handler = function (event) { conImgStyleDismiss() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-928]');
      if (!el) return;
      var handler = function (event) { conImgSpSetBorderWidth(+this.value);document.getElementById('con-img-sp-border-width-val').textContent=this.value+'px'; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-929]');
      if (!el) return;
      var handler = function (event) { conImgSpSetBorderStyle('solid') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-930]');
      if (!el) return;
      var handler = function (event) { conImgSpSetBorderStyle('dashed') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-931]');
      if (!el) return;
      var handler = function (event) { conImgSpSetBorderStyle('dotted') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-932]');
      if (!el) return;
      var handler = function (event) { conImgSpSetBorderStyle('double') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-933]');
      if (!el) return;
      var handler = function (event) { conImgSpSetBorderColor(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-934]');
      if (!el) return;
      var handler = function (event) { conImgSpSetRotation(0) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-935]');
      if (!el) return;
      var handler = function (event) { conImgSpSetRotation(90) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-936]');
      if (!el) return;
      var handler = function (event) { conImgSpSetRotation(180) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-937]');
      if (!el) return;
      var handler = function (event) { conImgSpSetRotation(270) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-938]');
      if (!el) return;
      var handler = function (event) { conImgSpSetOpacity(+this.value);document.getElementById('con-img-sp-opacity-val').textContent=Math.round(this.value*100)+'%'; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-939]');
      if (!el) return;
      var handler = function (event) { conImgSpSetBrightness(+this.value);document.getElementById('con-img-sp-brightness-val').textContent=this.value+'%'; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-940]');
      if (!el) return;
      var handler = function (event) { conImgSpSetContrast(+this.value);document.getElementById('con-img-sp-contrast-val').textContent=this.value+'%'; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-941]');
      if (!el) return;
      var handler = function (event) { conImgSpSetSaturation(+this.value);document.getElementById('con-img-sp-saturation-val').textContent=this.value+'%'; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-942]');
      if (!el) return;
      var handler = function (event) { conImgSpSetPreset('bw') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-943]');
      if (!el) return;
      var handler = function (event) { conImgSpResetFilters() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-944]');
      if (!el) return;
      var handler = function (event) { conImgSpLink() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-945]');
      if (!el) return;
      var handler = function (event) { conImgSpToggleBlink() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-946]');
      if (!el) return;
      var handler = function (event) { conImgSpToggleFullscreen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-947]');
      if (!el) return;
      var handler = function (event) { conImgSpToggleLock() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-948]');
      if (!el) return;
      var handler = function (event) { conImgSpToggleHide() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-949]');
      if (!el) return;
      var handler = function (event) { conImgSpAddEmoji() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-950]');
      if (!el) return;
      var handler = function (event) { conImgSpDuplicate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-951]');
      if (!el) return;
      var handler = function (event) { conImgSpCrop() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-952]');
      if (!el) return;
      var handler = function (event) { conImgSpOpenFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-953]');
      if (!el) return;
      var handler = function (event) { conImgSpOpenFolder() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-954]');
      if (!el) return;
      var handler = function (event) { conImgSpDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-955]');
      if (!el) return;
      var handler = function (event) { conImgSpSetRevealAnimation(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-956]');
      if (!el) return;
      var handler = function (event) { conPdfStyleClose(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-957]');
      if (!el) return;
      var handler = function (event) { conPdfStyleDismiss() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-958]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetBorderWidth(+this.value);document.getElementById('con-pdf-sp-border-width-val').textContent=this.value+'px'; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-959]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetBorderStyle('solid') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-960]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetBorderStyle('dashed') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-961]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetBorderStyle('dotted') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-962]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetBorderStyle('double') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-963]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetBorderColor(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-964]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetRotation(0) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-965]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetRotation(90) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-966]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetRotation(180) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-967]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetRotation(270) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-968]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetOpacity(+this.value);document.getElementById('con-pdf-sp-opacity-val').textContent=Math.round(this.value*100)+'%'; };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-969]');
      if (!el) return;
      var handler = function (event) { conImgSpLink() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-970]');
      if (!el) return;
      var handler = function (event) { conPdfSpToggleBlink() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-971]');
      if (!el) return;
      var handler = function (event) { conPdfSpToggleFullscreen() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-972]');
      if (!el) return;
      var handler = function (event) { conPdfSpToggleLock() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-973]');
      if (!el) return;
      var handler = function (event) { conPdfSpToggleHide() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-974]');
      if (!el) return;
      var handler = function (event) { conPdfSpToggleLockFit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-975]');
      if (!el) return;
      var handler = function (event) { conPdfSpAddEmoji() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-976]');
      if (!el) return;
      var handler = function (event) { conPdfSpDuplicate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-977]');
      if (!el) return;
      var handler = function (event) { conPdfSpOpenFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-978]');
      if (!el) return;
      var handler = function (event) { conPdfSpOpenFolder() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-979]');
      if (!el) return;
      var handler = function (event) { conPdfSpDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-980]');
      if (!el) return;
      var handler = function (event) { conPdfSpSetRevealAnimation(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-981]');
      if (!el) return;
      var handler = function (event) { conSoundStyleClose(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-982]');
      if (!el) return;
      var handler = function (event) { conSoundStyleDismiss() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-983]');
      if (!el) return;
      var handler = function (event) { conSoundSpTranscribe() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-984]');
      if (!el) return;
      var handler = function (event) { conSoundSpTrim() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-985]');
      if (!el) return;
      var handler = function (event) { conSoundSpToggleLock() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-986]');
      if (!el) return;
      var handler = function (event) { conSoundSpOpenFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-987]');
      if (!el) return;
      var handler = function (event) { conSoundSpOpenFolder() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-988]');
      if (!el) return;
      var handler = function (event) { conSoundSpDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-989]');
      if (!el) return;
      var handler = function (event) { conLinkStyleClose(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-990]');
      if (!el) return;
      var handler = function (event) { conLinkStyleDismiss() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-991]');
      if (!el) return;
      var handler = function (event) { conLinkSpOpenInApp() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-992]');
      if (!el) return;
      var handler = function (event) { conLinkSpOpenBrowser() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-993]');
      if (!el) return;
      var handler = function (event) { conLinkSpJumpCanvas() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-994]');
      if (!el) return;
      var handler = function (event) { conLinkSpOpenNewBoard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-995]');
      if (!el) return;
      var handler = function (event) { conLinkSpLoadCurrentBoard() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-996]');
      if (!el) return;
      var handler = function (event) { conLinkSpCopy() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-997]');
      if (!el) return;
      var handler = function (event) { conLinkSpEdit() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-998]');
      if (!el) return;
      var handler = function (event) { conLinkSpToggleLock() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-999]');
      if (!el) return;
      var handler = function (event) { conLinkSpDelete() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1000]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)conCloseLinkEditModal(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1001]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1002]');
      if (!el) return;
      var handler = function (event) { conCloseLinkEditModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1003]');
      if (!el) return;
      var handler = function (event) { conLinkModalSwitchTab('web') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1004]');
      if (!el) return;
      var handler = function (event) { conLinkModalSwitchTab('canvas') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1005]');
      if (!el) return;
      var handler = function (event) { conLinkModalSwitchTab('board') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1006]');
      if (!el) return;
      var handler = function (event) { conLinkModalSwitchTab('doc') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1007]');
      if (!el) return;
      var handler = function (event) { conLinkModalSwitchTab('suite') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1008]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'){event.preventDefault();conSaveLinkEditModal();} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1009]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'){event.preventDefault();conSaveLinkEditModal();} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1010]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'){event.preventDefault();conSaveLinkEditModal();} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1011]');
      if (!el) return;
      var handler = function (event) { conLinkCanvasFilter(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1012]');
      if (!el) return;
      var handler = function (event) { conLinkModalFilter('board', this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1013]');
      if (!el) return;
      var handler = function (event) { conLinkModalNavUp('board') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1014]');
      if (!el) return;
      var handler = function (event) { conLinkModalFilter('doc', this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1015]');
      if (!el) return;
      var handler = function (event) { conLinkModalNavUp('doc') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1016]');
      if (!el) return;
      var handler = function (event) { conCloseLinkEditModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1017]');
      if (!el) return;
      var handler = function (event) { conSaveLinkEditModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1018]');
      if (!el) return;
      var handler = function (event) { conAudioImportPillTranscribe() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1019]');
      if (!el) return;
      var handler = function (event) { conDismissAudioImportPill() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1020]');
      if (!el) return;
      var handler = function (event) { conTranscriptOverlayClick(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1021]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1022]');
      if (!el) return;
      var handler = function (event) { conTranscriptChangeLanguage(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1023]');
      if (!el) return;
      var handler = function (event) { conTranscriptChangeModel(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1024]');
      if (!el) return;
      var handler = function (event) { openWhisperModelManager() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1025]');
      if (!el) return;
      var handler = function (event) { conCloseTranscriptModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1026]');
      if (!el) return;
      var handler = function (event) { conCancelTranscript() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1027]');
      if (!el) return;
      var handler = function (event) { conTranscriptCopy() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1028]');
      if (!el) return;
      var handler = function (event) { conTranscriptExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1029]');
      if (!el) return;
      var handler = function (event) { conTranscriptUpdateWordCount() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1030]');
      if (!el) return;
      var handler = function (event) { conRerunTranscript() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1031]');
      if (!el) return;
      var handler = function (event) { conCloseTranscriptModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1032]');
      if (!el) return;
      var handler = function (event) { conTranscriptInsertAsNote() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1033]');
      if (!el) return;
      var handler = function (event) { conTranscriptInsertAsNodes() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1034]');
      if (!el) return;
      var handler = function (event) { conTranscriptSaveToItem() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1035]');
      if (!el) return;
      var handler = function (event) { conDbExportClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1036]');
      if (!el) return;
      var handler = function (event) { conDbExportRefresh() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1037]');
      if (!el) return;
      var handler = function (event) { conDbExportRefresh() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1038]');
      if (!el) return;
      var handler = function (event) { conDbExportSelectAll(true) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1039]');
      if (!el) return;
      var handler = function (event) { conDbExportSelectAll(false) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1040]');
      if (!el) return;
      var handler = function (event) { conDbExportClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1041]');
      if (!el) return;
      var handler = function (event) { conDbExportSave() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1042]');
      if (!el) return;
      var handler = function (event) { window.conCloseCropOverlay() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1043]');
      if (!el) return;
      var handler = function (event) { window.conConfirmCrop() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1044]');
      if (!el) return;
      var handler = function (event) { bpAllClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1045]');
      if (!el) return;
      var handler = function (event) { wnpClose() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-bev-1046]');
      if (!el) return;
      var handler = function (event) { wnpSave() };
      el.addEventListener('click', handler);
    })();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindBoardEvents);
  } else {
    bindBoardEvents();
  }
})();
