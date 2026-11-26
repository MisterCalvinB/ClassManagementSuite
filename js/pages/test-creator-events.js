// Migrated static HTML event handlers from pages/test-creator.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-tcev-1]');
      if (!el) return;
      var handler = function (event) { tcNewTest() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-2]');
      if (!el) return;
      var handler = function (event) { tcOpenTemplatePicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-3]');
      if (!el) return;
      var handler = function (event) { tcOpenTestPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-4]');
      if (!el) return;
      var handler = function (event) { tcBrowseTestFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-5]');
      if (!el) return;
      var handler = function (event) { tcSaveTest() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-6]');
      if (!el) return;
      var handler = function (event) { tcSaveAsTemplate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-7]');
      if (!el) return;
      var handler = function (event) { tcDuplicateTest() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-8]');
      if (!el) return;
      var handler = function (event) { tcOpenSequenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-9]');
      if (!el) return;
      var handler = function (event) { tcResetTest() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-10]');
      if (!el) return;
      var handler = function (event) { tcOpenHeaderCustomizerModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-11]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('cloze') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-12]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('mcq') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-13]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('open_question') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-14]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('composition') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-15]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('matching') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-16]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('transformation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-17]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('translation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-18]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('picture_description') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-19]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('table_completion') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-20]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('odd_one_out') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-21]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('reading_comprehension') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-22]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_competences') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-23]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_criteria') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-24]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_grading_scale') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-25]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_custom') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-26]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_lines') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-27]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_pdf') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-28]');
      if (!el) return;
      var handler = function (event) { tcOpenPrintPreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-29]');
      if (!el) return;
      var handler = function (event) { tcToggleDrawer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-30]');
      if (!el) return;
      var handler = function (event) { tcOpenVariantMatrixModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-31]');
      if (!el) return;
      var handler = function (event) { tcOpenGradeSheetModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-32]');
      if (!el) return;
      var handler = function (event) { tcSyncWithCompetencePortfolio() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-33]');
      if (!el) return;
      var handler = function (event) { tcSaveAllExercisesToDb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-34]');
      if (!el) return;
      var handler = function (event) { tcOpenManageDatabase() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-35]');
      if (!el) return;
      var handler = function (event) { tcOpenSequenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-36]');
      if (!el) return;
      var handler = function (event) { tcOpenPullFromLessonModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-37]');
      if (!el) return;
      var handler = function (event) { tcGenerateRevisionMindmap() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-38]');
      if (!el) return;
      var handler = function (event) { tcOpenExportModal(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-39]');
      if (!el) return;
      var handler = function (event) { tcOpenSequenceExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-40]');
      if (!el) return;
      var handler = function (event) { tcOpenGlobalStyleModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-41]');
      if (!el) return;
      var handler = function (event) { tcOpenPrintPreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-42]');
      if (!el) return;
      var handler = function (event) { tcDirectExport('html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-43]');
      if (!el) return;
      var handler = function (event) { tcDirectExport('docx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-44]');
      if (!el) return;
      var handler = function (event) { tcDirectExport('odt') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-45]');
      if (!el) return;
      var handler = function (event) { tcDirectExport('md') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-46]');
      if (!el) return;
      var handler = function (event) { tcExportToDocumentEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-47]');
      if (!el) return;
      var handler = function (event) { tcOpenShortcuts() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-48]');
      if (!el) return;
      var handler = function (event) { tcStartTutorial() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-49]');
      if (!el) return;
      var handler = function (event) { tcOnDirty() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-50]');
      if (!el) return;
      var handler = function (event) { tcOnSubjectChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-51]');
      if (!el) return;
      var handler = function (event) { tcOnClassChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-52]');
      if (!el) return;
      var handler = function (event) { tcOpenGlobalStyleModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-53]');
      if (!el) return;
      var handler = function (event) { tcToggleDrawer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-54]');
      if (!el) return;
      var handler = function (event) { tcOpenTemplatePicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-55]');
      if (!el) return;
      var handler = function (event) { tcOpenTestPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-56]');
      if (!el) return;
      var handler = function (event) { tcSaveTest() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-57]');
      if (!el) return;
      var handler = function (event) { tcOpenGradeSheetModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-58]');
      if (!el) return;
      var handler = function (event) { tcOpenSequenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-59]');
      if (!el) return;
      var handler = function (event) { tcOpenTestLinksModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-60]');
      if (!el) return;
      var handler = function (event) { tcToggleBlockCard('blockExamHeader') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-61]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); tcOpenBlockHtmlEditor('header'); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-62]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); tcSaveHeaderToDb(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-63]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); tcOpenHeaderCustomizerModal(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-64]');
      if (!el) return;
      var handler = function (event) { tcOnDirty() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-65]');
      if (!el) return;
      var handler = function (event) { tcOnDirty() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-66]');
      if (!el) return;
      var handler = function (event) { tcOnDirty() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-67]');
      if (!el) return;
      var handler = function (event) { tcOnDirty() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-68]');
      if (!el) return;
      var handler = function (event) { tcOpenVariantMatrixModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-69]');
      if (!el) return;
      var handler = function (event) { tcSyncHeaderBlockToState() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-70]');
      if (!el) return;
      var handler = function (event) { tcSyncHeaderBlockToState() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-71]');
      if (!el) return;
      var handler = function (event) { tcSyncHeaderBlockToState() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-72]');
      if (!el) return;
      var handler = function (event) { tcSyncHeaderBlockToState() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-73]');
      if (!el) return;
      var handler = function (event) { tcSyncHeaderBlockToState() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-74]');
      if (!el) return;
      var handler = function (event) { tcSyncHeaderBlockToState() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-75]');
      if (!el) return;
      var handler = function (event) { tcSyncHeaderBlockToState() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-76]');
      if (!el) return;
      var handler = function (event) { tcSyncHeaderBlockToState() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-77]');
      if (!el) return;
      var handler = function (event) { tcSyncHeaderBlockToState() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-78]');
      if (!el) return;
      var handler = function (event) { tcSyncHeaderBlockToState() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-79]');
      if (!el) return;
      var handler = function (event) { tcToggleBlockCard('blockCompetences') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-80]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); tcBrowseCompetences('__exam__'); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-81]');
      if (!el) return;
      var handler = function (event) { tcOpenCompetenceLayoutModal('__exam__') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-82]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_competences') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-83]');
      if (!el) return;
      var handler = function (event) { tcToggleCompetencesPrintOnTest(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-84]');
      if (!el) return;
      var handler = function (event) { tcToggleCompetenceDescriptionsPrint(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-85]');
      if (!el) return;
      var handler = function (event) { tcRemoveAllTestCompetences() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-86]');
      if (!el) return;
      var handler = function (event) { tcToggleBlockCard('blockCriteria') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-87]');
      if (!el) return;
      var handler = function (event) { event.stopPropagation(); tcBrowseCriteria('__exam__'); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-88]');
      if (!el) return;
      var handler = function (event) { tcOpenRubricLayoutModal('__exam__') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-89]');
      if (!el) return;
      var handler = function (event) { tcOpenRubricMatrixModal('__exam__') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-90]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_criteria') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-91]');
      if (!el) return;
      var handler = function (event) { tcToggleCriteriaPrintOnTest(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-92]');
      if (!el) return;
      var handler = function (event) { tcToggleCriteriaDescPrint(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-93]');
      if (!el) return;
      var handler = function (event) { tcRemoveAllTestCriteria() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-94]');
      if (!el) return;
      var handler = function (event) { tcToggleBlockCard('blockGradeScale') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-95]');
      if (!el) return;
      var handler = function (event) { tcOnDirty() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-96]');
      if (!el) return;
      var handler = function (event) { tcOpenScaleLayoutModal('__exam__') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-97]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_grading_scale') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-98]');
      if (!el) return;
      var handler = function (event) { tcToggleScalePrintOnTest(this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-99]');
      if (!el) return;
      var handler = function (event) { tcRemoveTestScale() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-100]');
      if (!el) return;
      var handler = function (event) { tcOpenGlobalStyleModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-101]');
      if (!el) return;
      var handler = function (event) { tcOpenAddExerciseModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-102]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('cloze') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-103]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('mcq') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-104]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('open_question') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-105]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('composition') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-106]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('matching') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-107]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('transformation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-108]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('translation') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-109]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('picture_description') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-110]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('table_completion') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-111]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('odd_one_out') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-112]');
      if (!el) return;
      var handler = function (event) { tcQuickAddExercise('reading_comprehension') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-113]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_competences') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-114]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_criteria') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-115]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_grading_scale') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-116]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_custom') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-117]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_lines') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-118]');
      if (!el) return;
      var handler = function (event) { tcAddSectionBlockToExam('section_pdf') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-119]');
      if (!el) return;
      var handler = function (event) { tcToggleDrawer() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-120]');
      if (!el) return;
      var handler = function (event) { tcSwitchDrawerTab('testbank') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-121]');
      if (!el) return;
      var handler = function (event) { tcSwitchDrawerTab('learningdb') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-122]');
      if (!el) return;
      var handler = function (event) { tcSwitchDrawerTab('criteriadb') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-123]');
      if (!el) return;
      var handler = function (event) { tcSwitchDrawerTab('competences') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-124]');
      if (!el) return;
      var handler = function (event) { tcSwitchDrawerTab('scales') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-125]');
      if (!el) return;
      var handler = function (event) { tcFilterTestBank() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-126]');
      if (!el) return;
      var handler = function (event) { tcOpenPullFromLessonModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-127]');
      if (!el) return;
      var handler = function (event) { tcLoadLearningDbSource() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-128]');
      if (!el) return;
      var handler = function (event) { tcOpenAutoGeneratorModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-129]');
      if (!el) return;
      var handler = function (event) { tcFilterLearningDb() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-130]');
      if (!el) return;
      var handler = function (event) { tcFilterLearningDb() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-131]');
      if (!el) return;
      var handler = function (event) { tcFilterLearningDb() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-132]');
      if (!el) return;
      var handler = function (event) { tcFilterLearningDb() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-133]');
      if (!el) return;
      var handler = function (event) { tcFilterLearningDb() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-134]');
      if (!el) return;
      var handler = function (event) { tcFilterLearningDb() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-135]');
      if (!el) return;
      var handler = function (event) { tcResetWordbankFilters() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-136]');
      if (!el) return;
      var handler = function (event) { tcFilterLearningDb() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-137]');
      if (!el) return;
      var handler = function (event) { tcLoadCriteriaBankSource() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-138]');
      if (!el) return;
      var handler = function (event) { tcOnCriteriaTargetChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-139]');
      if (!el) return;
      var handler = function (event) { tcFilterCriteriaDb() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-140]');
      if (!el) return;
      var handler = function (event) { tcOpenCompetenceCustomizeModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-141]');
      if (!el) return;
      var handler = function (event) { tcAttachClassObjectives() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-142]');
      if (!el) return;
      var handler = function (event) { tcOnCompetenceTargetChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-143]');
      if (!el) return;
      var handler = function (event) { tcFilterCompetences() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-144]');
      if (!el) return;
      var handler = function (event) { tcFilterCompetences() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-145]');
      if (!el) return;
      var handler = function (event) { tcFilterCompetences() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-146]');
      if (!el) return;
      var handler = function (event) { tcOnCompCategoryChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-147]');
      if (!el) return;
      var handler = function (event) { tcFilterCompetences() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-148]');
      if (!el) return;
      var handler = function (event) { tcFilterCompetences() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-149]');
      if (!el) return;
      var handler = function (event) { tcOpenCompetenceDb() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-150]');
      if (!el) return;
      var handler = function (event) { tcOpenCompetenceImporter() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-151]');
      if (!el) return;
      var handler = function (event) { tcLoadScaleBankSource() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-152]');
      if (!el) return;
      var handler = function (event) { tcOnScaleTargetChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-153]');
      if (!el) return;
      var handler = function (event) { tcFilterScalesDb() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-154]');
      if (!el) return;
      var handler = function (event) { tcToggleFreezePreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-155]');
      if (!el) return;
      var handler = function (event) { tcForceRefreshPreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-156]');
      if (!el) return;
      var handler = function (event) { tcUpdatePrintPreview({ force: true }) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-157]');
      if (!el) return;
      var handler = function (event) { tcUpdatePrintPreview({ force: true }) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-158]');
      if (!el) return;
      var handler = function (event) { tcOnPreviewThemeChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-159]');
      if (!el) return;
      var handler = function (event) { tcOnPreviewMarginsChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-160]');
      if (!el) return;
      var handler = function (event) { tcSetPreviewZoom(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-161]');
      if (!el) return;
      var handler = function (event) { tcPrintDocument() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-162]');
      if (!el) return;
      var handler = function (event) { tcOpenExportModal(event) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-163]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-164]');
      if (!el) return;
      var handler = function (event) { tcCloseExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-165]');
      if (!el) return;
      var handler = function (event) { tcSetExportFormat('pdf') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-166]');
      if (!el) return;
      var handler = function (event) { tcSetExportFormat('html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-167]');
      if (!el) return;
      var handler = function (event) { tcSetExportFormat('docx') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-168]');
      if (!el) return;
      var handler = function (event) { tcSetExportFormat('odt') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-169]');
      if (!el) return;
      var handler = function (event) { tcSetExportFormat('md') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-170]');
      if (!el) return;
      var handler = function (event) { tcOnExportThemeChange(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-171]');
      if (!el) return;
      var handler = function (event) { tcCloseExportModal();tcOpenHeaderCustomizerModal(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-172]');
      if (!el) return;
      var handler = function (event) { tcCloseExportModal();tcOpenGlobalStyleModal(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-173]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-174]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-175]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-176]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-177]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-178]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-179]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-180]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-181]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-182]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-183]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-184]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-185]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-186]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-187]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-188]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-189]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-190]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-191]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-192]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-193]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-194]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-195]');
      if (!el) return;
      var handler = function (event) { tcOnQuickExportToggleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-196]');
      if (!el) return;
      var handler = function (event) { tcOnBatchToggle() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-197]');
      if (!el) return;
      var handler = function (event) { tcExportToDocumentEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-198]');
      if (!el) return;
      var handler = function (event) { tcPreviewExportInBrowser() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-199]');
      if (!el) return;
      var handler = function (event) { tcCloseExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-200]');
      if (!el) return;
      var handler = function (event) { tcExecuteExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-201]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseExportPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-202]');
      if (!el) return;
      var handler = function (event) { tcOpenPreviewInExternalBrowser() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-203]');
      if (!el) return;
      var handler = function (event) { tcPrintPreviewIframe() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-204]');
      if (!el) return;
      var handler = function (event) { tcCloseExportPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-205]');
      if (!el) return;
      var handler = function (event) { tcCloseExportPreviewModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-206]');
      if (!el) return;
      var handler = function (event) { tcExecuteFromPreview() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-207]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseSequenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-208]');
      if (!el) return;
      var handler = function (event) { tcCloseSequenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-209]');
      if (!el) return;
      var handler = function (event) { tcOnSavedSequenceSelectChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-210]');
      if (!el) return;
      var handler = function (event) { tcAssignSelectedSequence() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-211]');
      if (!el) return;
      var handler = function (event) { tcStartNewSequence() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-212]');
      if (!el) return;
      var handler = function (event) { tcSaveSequence() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-213]');
      if (!el) return;
      var handler = function (event) { tcOpenSequenceExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-214]');
      if (!el) return;
      var handler = function (event) { tcSetSeqPickerFilter('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-215]');
      if (!el) return;
      var handler = function (event) { tcSetSeqPickerFilter('lessons') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-216]');
      if (!el) return;
      var handler = function (event) { tcSetSeqPickerFilter('tests') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-217]');
      if (!el) return;
      var handler = function (event) { tcFilterSeqPicker() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-218]');
      if (!el) return;
      var handler = function (event) { tcCloseSequenceModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-219]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcClosePullLessonModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-220]');
      if (!el) return;
      var handler = function (event) { tcClosePullLessonModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-221]');
      if (!el) return;
      var handler = function (event) { tcSetPullSourceMode('single') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-222]');
      if (!el) return;
      var handler = function (event) { tcSetPullSourceMode('unit') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-223]');
      if (!el) return;
      var handler = function (event) { tcOnLessonSelected() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-224]');
      if (!el) return;
      var handler = function (event) { tcOnUnitSelected() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-225]');
      if (!el) return;
      var handler = function (event) { tcClosePullLessonModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-226]');
      if (!el) return;
      var handler = function (event) { tcExecutePullFromLesson() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-227]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseSequenceExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-228]');
      if (!el) return;
      var handler = function (event) { tcCloseSequenceExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-229]');
      if (!el) return;
      var handler = function (event) { tcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-230]');
      if (!el) return;
      var handler = function (event) { tcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-231]');
      if (!el) return;
      var handler = function (event) { tcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-232]');
      if (!el) return;
      var handler = function (event) { tcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-233]');
      if (!el) return;
      var handler = function (event) { tcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-234]');
      if (!el) return;
      var handler = function (event) { tcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-235]');
      if (!el) return;
      var handler = function (event) { tcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-236]');
      if (!el) return;
      var handler = function (event) { tcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-237]');
      if (!el) return;
      var handler = function (event) { tcOnSeqExportFormatChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-238]');
      if (!el) return;
      var handler = function (event) { tcOnSeqCssThemeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-239]');
      if (!el) return;
      var handler = function (event) { tcOnSeqCssThemeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-240]');
      if (!el) return;
      var handler = function (event) { tcOnSeqCssThemeChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-241]');
      if (!el) return;
      var handler = function (event) { tcSwitchSeqExportTab('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-242]');
      if (!el) return;
      var handler = function (event) { tcSwitchSeqExportTab('toc') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-243]');
      if (!el) return;
      var handler = function (event) { tcSwitchSeqExportTab('lessons') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-244]');
      if (!el) return;
      var handler = function (event) { tcSwitchSeqExportTab('tests') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-245]');
      if (!el) return;
      var handler = function (event) { tcApplySeqLessonPreset('full') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-246]');
      if (!el) return;
      var handler = function (event) { tcApplySeqLessonPreset('teacher') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-247]');
      if (!el) return;
      var handler = function (event) { tcApplySeqLessonPreset('student') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-248]');
      if (!el) return;
      var handler = function (event) { tcApplySeqLessonPreset('outline') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-249]');
      if (!el) return;
      var handler = function (event) { tcCloseSequenceExportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-250]');
      if (!el) return;
      var handler = function (event) { tcPreviewSequenceExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-251]');
      if (!el) return;
      var handler = function (event) { tcExecuteSequenceExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-252]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseGlobalStyleModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-253]');
      if (!el) return;
      var handler = function (event) { tcCloseGlobalStyleModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-254]');
      if (!el) return;
      var handler = function (event) { tcCloseGlobalStyleModal(); tcOpenHeaderCustomizerModal(); };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-255]');
      if (!el) return;
      var handler = function (event) { tcOnGlobalStyleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-256]');
      if (!el) return;
      var handler = function (event) { tcOnGlobalStyleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-257]');
      if (!el) return;
      var handler = function (event) { tcOnGlobalStyleChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-258]');
      if (!el) return;
      var handler = function (event) { tcSetMarginPreset('narrow') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-259]');
      if (!el) return;
      var handler = function (event) { tcSetMarginPreset('normal') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-260]');
      if (!el) return;
      var handler = function (event) { tcSetMarginPreset('wide') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-261]');
      if (!el) return;
      var handler = function (event) { tcOnGlobalStyleChange(); };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-262]');
      if (!el) return;
      var handler = function (event) { tcOnGlobalStyleChange(); };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-263]');
      if (!el) return;
      var handler = function (event) { tcOnGlobalStyleChange(); };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-264]');
      if (!el) return;
      var handler = function (event) { tcCloseGlobalStyleModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-265]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseExerciseStyleModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-266]');
      if (!el) return;
      var handler = function (event) { tcCloseExerciseStyleModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-267]');
      if (!el) return;
      var handler = function (event) { tcOnExStyleCustomToggle() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-268]');
      if (!el) return;
      var handler = function (event) { tcCloseExerciseStyleModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-269]');
      if (!el) return;
      var handler = function (event) { tcSaveExerciseStyle() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-270]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseExerciseSettingsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-271]');
      if (!el) return;
      var handler = function (event) { tcCloseExerciseSettingsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-272]');
      if (!el) return;
      var handler = function (event) { tcCloseExerciseSettingsModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-273]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseHeaderCustomizerModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-274]');
      if (!el) return;
      var handler = function (event) { tcCloseHeaderCustomizerModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-275]');
      if (!el) return;
      var handler = function (event) { tcApplyHeaderStylePreset(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-276]');
      if (!el) return;
      var handler = function (event) { tcOnHeaderTemplateSelectChange() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-277]');
      if (!el) return;
      var handler = function (event) { tcApplySelectedHeaderTemplate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-278]');
      if (!el) return;
      var handler = function (event) { tcSaveCurrentHeaderAsTemplate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-279]');
      if (!el) return;
      var handler = function (event) { tcDeleteSelectedHeaderTemplate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-280]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showTitle', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-281]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showSubtitle', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-282]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showStudentName', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-283]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showClass', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-284]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showDate', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-285]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showTeacher', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-286]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showDuration', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-287]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showTotalPoints', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-288]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showScope', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-289]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showMaterials', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-290]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showVariantBadge', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-291]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showGradingScale', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-292]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showCompetences', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-293]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showCriteria', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-294]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('showInstructions', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-295]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('subtitleText', this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-296]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderCfg('instructionsText', this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-297]');
      if (!el) return;
      var handler = function (event) { tcUpdateHeaderMaterialsDisplayMode(this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-298]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'){event.preventDefault();tcAddCustomMaterial();} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-299]');
      if (!el) return;
      var handler = function (event) { tcAddCustomMaterial() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-300]');
      if (!el) return;
      var handler = function (event) { tcClearAllMaterials() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-301]');
      if (!el) return;
      var handler = function (event) { tcResetHeaderToDefault() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-302]');
      if (!el) return;
      var handler = function (event) { tcCloseHeaderCustomizerModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-303]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseBlockHtmlEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-304]');
      if (!el) return;
      var handler = function (event) { tcCloseBlockHtmlEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-305]');
      if (!el) return;
      var handler = function (event) { tcUbhUpdatePreview() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-306]');
      if (!el) return;
      var handler = function (event) { tcUbhSyncFromBlock() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-307]');
      if (!el) return;
      var handler = function (event) { tcUbhResetToStructured() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-308]');
      if (!el) return;
      var handler = function (event) { tcSwitchUbhTab('wysiwyg') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-309]');
      if (!el) return;
      var handler = function (event) { tcSwitchUbhTab('code') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-310]');
      if (!el) return;
      var handler = function (event) { tcSwitchUbhTab('preview') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-311]');
      if (!el) return;
      var handler = function (event) { if(this.value){tcUbhInsertPlaceholder(this.value); this.value='';} };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-312]');
      if (!el) return;
      var handler = function (event) { if(this.value){tcUbhExec('formatBlock', this.value); this.value='';} };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-313]');
      if (!el) return;
      var handler = function (event) { if(this.value){tcUbhExec('fontName', this.value); this.value='';} };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-314]');
      if (!el) return;
      var handler = function (event) { if(this.value){tcUbhSetFontSize(this.value); this.value='';} };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-315]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('bold') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-316]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('italic') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-317]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('underline') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-318]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('strikeThrough') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-319]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('superscript') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-320]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('subscript') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-321]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('removeFormat') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-322]');
      if (!el) return;
      var handler = function (event) {
        var col = window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(this) : this.value;
        tcUbhExec('foreColor', col);
      };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-323]');
      if (!el) return;
      var handler = function (event) {
        var col = window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(this) : this.value;
        tcUbhExec('hiliteColor', col);
      };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-324]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('undo') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-325]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('redo') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-326]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('justifyLeft') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-327]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('justifyCenter') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-328]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('justifyRight') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-329]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('justifyFull') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-330]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('insertUnorderedList') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-331]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('insertOrderedList') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-332]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('indent') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-333]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('outdent') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-334]');
      if (!el) return;
      var handler = function (event) { tcUbhInsertColumns(2) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-335]');
      if (!el) return;
      var handler = function (event) { tcUbhInsertColumns(3) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-336]');
      if (!el) return;
      var handler = function (event) { tcUbhInsertTable() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-337]');
      if (!el) return;
      var handler = function (event) { tcUbhTableOp('addRow') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-338]');
      if (!el) return;
      var handler = function (event) { tcUbhTableOp('addCol') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-339]');
      if (!el) return;
      var handler = function (event) { tcUbhTableOp('delRow') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-340]');
      if (!el) return;
      var handler = function (event) { tcUbhInsertLines() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-341]');
      if (!el) return;
      var handler = function (event) { tcUbhInsertCallout() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-342]');
      if (!el) return;
      var handler = function (event) { tcUbhExec('insertHorizontalRule') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-343]');
      if (!el) return;
      var handler = function (event) { tcUbhInsertPageBreak() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-344]');
      if (!el) return;
      var handler = function (event) { tcUbhInsertImage() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-345]');
      if (!el) return;
      var handler = function (event) { tcUbhInsertLink() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-346]');
      if (!el) return;
      var handler = function (event) { tcUbhSyncFromWysiwyg() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-347]');
      if (!el) return;
      var handler = function (event) { tcUbhSyncFromCode() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-348]');
      if (!el) return;
      var handler = function (event) { tcUbhAddCssSnippet('columns2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-349]');
      if (!el) return;
      var handler = function (event) { tcUbhAddCssSnippet('columns3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-350]');
      if (!el) return;
      var handler = function (event) { tcUbhAddCssSnippet('noBorder') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-351]');
      if (!el) return;
      var handler = function (event) { tcUbhAddCssSnippet('solidBorder') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-352]');
      if (!el) return;
      var handler = function (event) { tcUbhAddCssSnippet('shaded') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-353]');
      if (!el) return;
      var handler = function (event) { tcUbhMarkCustomEnabled(); tcUbhUpdatePreview() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-354]');
      if (!el) return;
      var handler = function (event) { tcCloseBlockHtmlEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-355]');
      if (!el) return;
      var handler = function (event) { tcSaveBlockHtmlEditor() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-356]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseGradeSheetModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-357]');
      if (!el) return;
      var handler = function (event) { tcCloseGradeSheetModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-358]');
      if (!el) return;
      var handler = function (event) { tcCloseGradeSheetModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-359]');
      if (!el) return;
      var handler = function (event) { tcSubmitGradeSheetRegistration() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-360]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseVariantMatrixModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-361]');
      if (!el) return;
      var handler = function (event) { tcCloseVariantMatrixModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-362]');
      if (!el) return;
      var handler = function (event) { tcAutoAssignVariants('alternating') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-363]');
      if (!el) return;
      var handler = function (event) { tcAutoAssignVariants('seating') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-364]');
      if (!el) return;
      var handler = function (event) { tcAutoAssignVariants('all_a') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-365]');
      if (!el) return;
      var handler = function (event) { tcCloseVariantMatrixModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-366]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseBulkAddModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-367]');
      if (!el) return;
      var handler = function (event) { tcCloseBulkAddModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-368]');
      if (!el) return;
      var handler = function (event) { tcApplyBulkCount(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-369]');
      if (!el) return;
      var handler = function (event) { tcApplyBulkCount(3) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-370]');
      if (!el) return;
      var handler = function (event) { tcApplyBulkCount(5) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-371]');
      if (!el) return;
      var handler = function (event) { tcApplyBulkCount(10) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-372]');
      if (!el) return;
      var handler = function (event) { tcCloseBulkAddModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-373]');
      if (!el) return;
      var handler = function (event) { tcConfirmBulkAdd() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-374]');
      if (!el) return;
      var handler = function (event) { tcImportTestFromFile(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-375]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseTestPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-376]');
      if (!el) return;
      var handler = function (event) { tcCloseTestPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-377]');
      if (!el) return;
      var handler = function (event) { tcFilterTestPicker() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-378]');
      if (!el) return;
      var handler = function (event) { tcBrowseAndLoadFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-379]');
      if (!el) return;
      var handler = function (event) { tcLoadTestPickerList() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-380]');
      if (!el) return;
      var handler = function (event) { tcBrowseAndLoadFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-381]');
      if (!el) return;
      var handler = function (event) { tcCloseTestPicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-382]');
      if (!el) return;
      var handler = function (event) { tcImportTemplateFromFile(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-383]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseTemplatePicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-384]');
      if (!el) return;
      var handler = function (event) { tcCloseTemplatePicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-385]');
      if (!el) return;
      var handler = function (event) { tcFilterTemplatePicker() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-386]');
      if (!el) return;
      var handler = function (event) { document.getElementById('tcTemplateFileInput').click() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-387]');
      if (!el) return;
      var handler = function (event) { tcSaveAsTemplate() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-388]');
      if (!el) return;
      var handler = function (event) { tcSetTemplateTab('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-389]');
      if (!el) return;
      var handler = function (event) { tcSetTemplateTab('builtin') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-390]');
      if (!el) return;
      var handler = function (event) { tcSetTemplateTab('custom') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-391]');
      if (!el) return;
      var handler = function (event) { tcCloseTemplatePicker() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-392]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseDrawerItemModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-393]');
      if (!el) return;
      var handler = function (event) { tcCloseDrawerItemModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-394]');
      if (!el) return;
      var handler = function (event) { tcCloseDrawerItemModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-395]');
      if (!el) return;
      var handler = function (event) { tcModalCreateNewEx() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-396]');
      if (!el) return;
      var handler = function (event) { event.preventDefault(); tcApplyFormatToActiveInput('bold'); };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-397]');
      if (!el) return;
      var handler = function (event) { event.preventDefault(); tcApplyFormatToActiveInput('italic'); };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-398]');
      if (!el) return;
      var handler = function (event) { event.preventDefault(); tcApplyFormatToActiveInput('underline'); };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-399]');
      if (!el) return;
      var handler = function (event) { event.preventDefault(); tcApplyFormatToActiveInput('strike'); };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-400]');
      if (!el) return;
      var handler = function (event) { event.preventDefault(); tcApplyFormatToActiveInput('sup'); };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-401]');
      if (!el) return;
      var handler = function (event) { event.preventDefault(); tcApplyFormatToActiveInput('sub'); };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-402]');
      if (!el) return;
      var handler = function (event) { event.preventDefault(); tcApplyFormatToActiveInput('mark'); };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-403]');
      if (!el) return;
      var handler = function (event) { event.preventDefault(); tcApplyFormatToActiveInput('color', '#dc2626'); };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-404]');
      if (!el) return;
      var handler = function (event) { event.preventDefault(); tcApplyFormatToActiveInput('color', '#2563eb'); };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-405]');
      if (!el) return;
      var handler = function (event) { event.preventDefault(); tcApplyFormatToActiveInput('color', '#16a34a'); };
      el.addEventListener('mousedown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-406]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseCompetenceCustomizeModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-407]');
      if (!el) return;
      var handler = function (event) { tcCloseCompetenceCustomizeModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-408]');
      if (!el) return;
      var handler = function (event) { tcOnCompPresetChange('detailed') };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-409]');
      if (!el) return;
      var handler = function (event) { tcOnCompPresetChange('compact') };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-410]');
      if (!el) return;
      var handler = function (event) { tcOnCompPresetChange('minimal') };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-411]');
      if (!el) return;
      var handler = function (event) { tcResetCompetenceConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-412]');
      if (!el) return;
      var handler = function (event) { tcCloseCompetenceCustomizeModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-413]');
      if (!el) return;
      var handler = function (event) { tcSaveCompetenceConfig() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-414]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseRubricMatrixModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-415]');
      if (!el) return;
      var handler = function (event) { tcCloseRubricMatrixModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-416]');
      if (!el) return;
      var handler = function (event) { tcCloseRubricMatrixModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-417]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseRubricLayoutModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-418]');
      if (!el) return;
      var handler = function (event) { tcCloseRubricLayoutModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-419]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('rubricTitle', this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-420]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('rubricDisplayMode', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-421]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('rubricBg', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-422]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('rubricPadding', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-423]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('rubricBorder', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-424]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('pageOrientation', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-425]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('showCriterionCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-426]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('showLevelsCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-427]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('showRubricDescriptions', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-428]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('showMaxCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-429]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('showScoreCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-430]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('showCommentsCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-431]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('separatePage', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-432]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalRubricOption('showRubric', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-433]');
      if (!el) return;
      var handler = function (event) { tcAddCustomRubricLevelSub() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-434]');
      if (!el) return;
      var handler = function (event) { tcClearRubricLevelSubs() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-435]');
      if (!el) return;
      var handler = function (event) { tcResetRubricLayoutOptions() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-436]');
      if (!el) return;
      var handler = function (event) { tcCloseRubricLayoutModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-437]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseCompetenceLayoutModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-438]');
      if (!el) return;
      var handler = function (event) { tcCloseCompetenceLayoutModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-439]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('compTitle', this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-440]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('displayMode', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-441]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('background', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-442]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('padding', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-443]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('border', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-444]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('pageOrientation', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-445]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('showCodeCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-446]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('showTitleCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-447]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('showDescriptions', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-448]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('showLevelCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-449]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('showScoreCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-450]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('showCommentsCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-451]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalCompOption('separatePage', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-452]');
      if (!el) return;
      var handler = function (event) { tcResetCompLayoutOptions() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-453]');
      if (!el) return;
      var handler = function (event) { tcCloseCompetenceLayoutModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-454]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcCloseScaleLayoutModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-455]');
      if (!el) return;
      var handler = function (event) { tcCloseScaleLayoutModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-456]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalScaleOption('scaleTitle', this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-457]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalScaleOption('displayMode', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-458]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalScaleOption('background', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-459]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalScaleOption('padding', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-460]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalScaleOption('border', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-461]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalScaleOption('pageOrientation', this.value) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-462]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalScaleOption('showGradeCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-463]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalScaleOption('showThresholdCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-464]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalScaleOption('showPointsCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-465]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalScaleOption('showNotesCol', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-466]');
      if (!el) return;
      var handler = function (event) { tcUpdateModalScaleOption('separatePage', this.checked) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-467]');
      if (!el) return;
      var handler = function (event) { tcResetScaleLayoutOptions() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-468]');
      if (!el) return;
      var handler = function (event) { tcCloseScaleLayoutModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-469]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)tcClosePdfZoomModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-tcev-470]');
      if (!el) return;
      var handler = function (event) { tcClosePdfZoomModal() };
      el.addEventListener('click', handler);
    })();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
