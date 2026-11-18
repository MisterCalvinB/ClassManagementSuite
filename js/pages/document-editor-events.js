// Migrated static HTML event handlers from pages/document-editor.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-deev-1]');
      if (!el) return;
      var handler = function (event) { startDeTutorial() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-2]');
      if (!el) return;
      var handler = function (event) { dePromptInsertSpreadsheet() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-3]');
      if (!el) return;
      var handler = function (event) { deHandleSpreadsheetSelect(event) };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-4]');
      if (!el) return;
      var handler = function (event) { deBookLoadSelected() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-5]');
      if (!el) return;
      var handler = function (event) { deOpenUniversalImportModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-6]');
      if (!el) return;
      var handler = function (event) { deToggleCssPanel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-7]');
      if (!el) return;
      var handler = function (event) { deOpenPullLessonModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-8]');
      if (!el) return;
      var handler = function (event) { deAttachReferenceFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-9]');
      if (!el) return;
      var handler = function (event) { deLookupWordInDictionary() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-10]');
      if (!el) return;
      var handler = function (event) { deConvertOutlineToMindmap() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-11]');
      if (!el) return;
      var handler = function (event) { deToggleCssPanel() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-12]');
      if (!el) return;
      var handler = function (event) { deOpenClassLinkModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-13]');
      if (!el) return;
      var handler = function (event) { deOpenLinkedGradeSheet() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-14]');
      if (!el) return;
      var handler = function (event) { deOpenLinkedRefFile() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-15]');
      if (!el) return;
      var handler = function (event) { deOpenDocLinksModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-16]');
      if (!el) return;
      var handler = function (event) { openDeShortcuts() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-17]');
      if (!el) return;
      var handler = function (event) { ShortcutsModal.open({title:t('tourBtnLabel'),rows:[],noShortcutsText:t('skmTourSoon')}) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-18]');
      if (!el) return;
      var handler = function (event) { if(event.target===this)deBookCloseModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-19]');
      if (!el) return;
      var handler = function (event) { deBookInsertSelection() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-20]');
      if (!el) return;
      var handler = function (event) { deBookCloseModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-21]');
      if (!el) return;
      var handler = function (event) { deBookSearchRun() };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-22]');
      if (!el) return;
      var handler = function (event) { deBookSearchKey(event) };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-23]');
      if (!el) return;
      var handler = function (event) { deBookSearchStep(-1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-24]');
      if (!el) return;
      var handler = function (event) { deBookSearchStep(1) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-25]');
      if (!el) return;
      var handler = function (event) { deClosePullLessonModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-26]');
      if (!el) return;
      var handler = function (event) { deOnLessonSelected() };
      el.addEventListener('change', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-27]');
      if (!el) return;
      var handler = function (event) { deClosePullLessonModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-28]');
      if (!el) return;
      var handler = function (event) { deExecutePullLesson() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-29]');
      if (!el) return;
      var handler = function (event) { deCloseMindmapModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-30]');
      if (!el) return;
      var handler = function (event) { deMindmapSetSelection('all') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-31]');
      if (!el) return;
      var handler = function (event) { deMindmapSetSelection('none') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-32]');
      if (!el) return;
      var handler = function (event) { deMindmapSetSelection('headings') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-33]');
      if (!el) return;
      var handler = function (event) { deCloseMindmapModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-34]');
      if (!el) return;
      var handler = function (event) { deExecuteMindmapExport() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-35]');
      if (!el) return;
      var handler = function (event) { deCloseClassLinkModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-36]');
      if (!el) return;
      var handler = function (event) { deUnlinkCurrentClass() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-37]');
      if (!el) return;
      var handler = function (event) { deCloseClassLinkModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-deev-38]');
      if (!el) return;
      var handler = function (event) { deConfirmClassLink() };
      el.addEventListener('click', handler);
    })();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
