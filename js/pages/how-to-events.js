// Migrated static HTML event handlers from pages/how-to.html
(function () {
  'use strict';
  function bindEvents() {
    (function () {
      var el = document.querySelector('[data-htev-1]');
      if (!el) return;
      var handler = function (event) { switchLang('en') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-2]');
      if (!el) return;
      var handler = function (event) { switchLang('fr') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-3]');
      if (!el) return;
      var handler = function (event) { switchLang('it') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-4]');
      if (!el) return;
      var handler = function (event) { switchLang('de') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-5]');
      if (!el) return;
      var handler = function (event) { expandAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-6]');
      if (!el) return;
      var handler = function (event) { collapseAll() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-7]');
      if (!el) return;
      var handler = function (event) { goBack() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-8]');
      if (!el) return;
      var handler = function (event) { openSearchModal(this.value) };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-9]');
      if (!el) return;
      var handler = function (event) { openSearchModal(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-10]');
      if (!el) return;
      var handler = function (event) { if(event.key==='Enter'||event.key===' '){event.preventDefault();openSearchModal(this.value);} };
      el.addEventListener('keydown', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-11]');
      if (!el) return;
      var handler = function (event) { navTo('intro') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-12]');
      if (!el) return;
      var handler = function (event) { navTo('how-to-begin') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-13]');
      if (!el) return;
      var handler = function (event) { toggleSidebarChildren('nav-how-to-begin') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-14]');
      if (!el) return;
      var handler = function (event) { navToAccordion('how-to-begin','acc-htb-folder') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-15]');
      if (!el) return;
      var handler = function (event) { navToAccordion('how-to-begin','acc-htb-classes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-16]');
      if (!el) return;
      var handler = function (event) { navToAccordion('how-to-begin','acc-htb-session') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-17]');
      if (!el) return;
      var handler = function (event) { navTo('connected-tools') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-18]');
      if (!el) return;
      var handler = function (event) { navTo('setup-wizard') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-19]');
      if (!el) return;
      var handler = function (event) { navTo('general-config') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-20]');
      if (!el) return;
      var handler = function (event) { navTo('board') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-21]');
      if (!el) return;
      var handler = function (event) { navTo('class-management') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-22]');
      if (!el) return;
      var handler = function (event) { navTo('group-editor') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-23]');
      if (!el) return;
      var handler = function (event) { navTo('import-tool') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-24]');
      if (!el) return;
      var handler = function (event) { navTo('database-converter') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-25]');
      if (!el) return;
      var handler = function (event) { navTo('media-converter') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-26]');
      if (!el) return;
      var handler = function (event) { navTo('dictionary') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-27]');
      if (!el) return;
      var handler = function (event) { navTo('planner') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-28]');
      if (!el) return;
      var handler = function (event) { navTo('lesson-creator') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-29]');
      if (!el) return;
      var handler = function (event) { navTo('test-creator') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-30]');
      if (!el) return;
      var handler = function (event) { navTo('participation-tracker') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-31]');
      if (!el) return;
      var handler = function (event) { navTo('grade-sheet') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-32]');
      if (!el) return;
      var handler = function (event) { navTo('competence-portfolio') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-33]');
      if (!el) return;
      var handler = function (event) { navTo('learning-tools') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-34]');
      if (!el) return;
      var handler = function (event) { navTo('manage-database') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-35]');
      if (!el) return;
      var handler = function (event) { navTo('file-manager') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-36]');
      if (!el) return;
      var handler = function (event) { navTo('class-plan') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-37]');
      if (!el) return;
      var handler = function (event) { navTo('schedule-maker') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-38]');
      if (!el) return;
      var handler = function (event) { navTo('oral-marking') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-39]');
      if (!el) return;
      var handler = function (event) { navTo('document-editor') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-40]');
      if (!el) return;
      var handler = function (event) { navTo('pdf-viewer') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-41]');
      if (!el) return;
      var handler = function (event) { navTo('administrative-groups') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-42]');
      if (!el) return;
      var handler = function (event) { navTo('how-to-begin') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-43]');
      if (!el) return;
      var handler = function (event) { navTo('board') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-44]');
      if (!el) return;
      var handler = function (event) { navTo('planner') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-45]');
      if (!el) return;
      var handler = function (event) { navTo('grade-sheet') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-46]');
      if (!el) return;
      var handler = function (event) { navToAccordion('general-config','acc-gc-storage') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-47]');
      if (!el) return;
      var handler = function (event) { navTo('how-to-begin') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-48]');
      if (!el) return;
      var handler = function (event) { navToAccordion('connected-tools','acc-ct-screen') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-49]');
      if (!el) return;
      var handler = function (event) { navToAccordion('import-tool','acc-it-students') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-50]');
      if (!el) return;
      var handler = function (event) { navToAccordion('general-config','acc-gc-storage') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-51]');
      if (!el) return;
      var handler = function (event) { navTo('grade-sheet') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-52]');
      if (!el) return;
      var handler = function (event) { openReadme() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-53]');
      if (!el) return;
      var handler = function (event) { openReadme() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-54]');
      if (!el) return;
      var handler = function (event) { revealReadme() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-55]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-htb-folder') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-56]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-htb-classes') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-57]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-htb-session') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-58]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ct-rename') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-59]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ct-links') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-60]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ct-screen') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-61]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-sw-open') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-62]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-sw-demo') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-63]');
      if (!el) return;
      var handler = function (event) { openTool('general-config.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-64]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gc-lang') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-65]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gc-storage') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-66]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gc-startup') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-67]');
      if (!el) return;
      var handler = function (event) { openTool('board.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-68]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-69]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-70]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-71]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-72]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-73]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-74]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-7') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-75]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-8') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-76]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-9') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-77]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-10') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-78]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-11') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-79]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-12') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-80]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-13') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-81]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-14') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-82]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-board-15') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-83]');
      if (!el) return;
      var handler = function (event) { openTool('class-management.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-84]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-85]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-86]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-87]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-88]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-89]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-90]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-7') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-91]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-8') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-92]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-9') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-93]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-10') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-94]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-11') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-95]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cm-12') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-96]');
      if (!el) return;
      var handler = function (event) { openTool('group-editor.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-97]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ge-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-98]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ge-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-99]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ge-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-100]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ge-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-101]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ge-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-102]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ge-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-103]');
      if (!el) return;
      var handler = function (event) { openTool('import-tool.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-104]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-it-students') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-105]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-it-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-106]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-it-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-107]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-it-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-108]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-it-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-109]');
      if (!el) return;
      var handler = function (event) { openTool('database-converter.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-110]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-dc-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-111]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-dc-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-112]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-dc-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-113]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-dc-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-114]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-dc-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-115]');
      if (!el) return;
      var handler = function (event) { openTool('media-converter.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-116]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-mc-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-117]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-mc-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-118]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-mc-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-119]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-mc-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-120]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-mc-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-121]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-mc-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-122]');
      if (!el) return;
      var handler = function (event) { openTool('dictionary.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-123]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-qd-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-124]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-qd-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-125]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-qd-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-126]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-qd-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-127]');
      if (!el) return;
      var handler = function (event) { openTool('planner.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-128]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pl-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-129]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pl-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-130]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pl-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-131]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pl-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-132]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pl-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-133]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pl-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-134]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pl-7') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-135]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pl-8') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-136]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pl-9') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-137]');
      if (!el) return;
      var handler = function (event) { openTool('lesson-creator.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-138]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lc-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-139]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lc-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-140]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lc-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-141]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lc-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-142]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lc-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-143]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lc-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-144]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lc-7') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-145]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lc-8') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-146]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lc-9') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-147]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lc-10') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-148]');
      if (!el) return;
      var handler = function (event) { openTool('test-creator.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-149]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-tc-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-150]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-tc-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-151]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-tc-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-152]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-tc-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-153]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-tc-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-154]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-tc-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-155]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-tc-7') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-156]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-tc-8') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-157]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-tc-9') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-158]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-tc-10') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-159]');
      if (!el) return;
      var handler = function (event) { openTool('participation-tracker.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-160]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pt-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-161]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pt-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-162]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pt-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-163]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pt-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-164]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pt-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-165]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pt-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-166]');
      if (!el) return;
      var handler = function (event) { openTool('grade-sheet.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-167]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-168]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-169]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-170]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-171]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-172]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-173]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-7') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-174]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-8') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-175]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-9') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-176]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-10') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-177]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-11') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-178]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-gs-12') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-179]');
      if (!el) return;
      var handler = function (event) { openTool('competence-portfolio.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-180]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cp-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-181]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cp-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-182]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cp-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-183]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cp-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-184]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cp-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-185]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cp-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-186]');
      if (!el) return;
      var handler = function (event) { openTool('learning-tools.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-187]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lt-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-188]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lt-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-189]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lt-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-190]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lt-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-191]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lt-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-192]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lt-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-193]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lt-7') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-194]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-lt-8') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-195]');
      if (!el) return;
      var handler = function (event) { openTool('manage-database.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-196]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-db-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-197]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-db-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-198]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-db-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-199]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-db-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-200]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-db-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-201]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-db-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-202]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-db-7') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-203]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-db-8') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-204]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-db-9') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-205]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-db-10') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-206]');
      if (!el) return;
      var handler = function (event) { openTool('file-manager.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-207]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-fm-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-208]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-fm-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-209]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-fm-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-210]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-fm-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-211]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-fm-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-212]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-fm-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-213]');
      if (!el) return;
      var handler = function (event) { openTool('class-plan.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-214]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cp2-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-215]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cp2-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-216]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cp2-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-217]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cp2-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-218]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-cp2-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-219]');
      if (!el) return;
      var handler = function (event) { openTool('schedule-maker.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-220]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-sm-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-221]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-sm-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-222]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-sm-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-223]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-sm-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-224]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-sm-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-225]');
      if (!el) return;
      var handler = function (event) { openTool('oral-marking.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-226]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-om-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-227]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-om-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-228]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-om-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-229]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-om-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-230]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-om-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-231]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-om-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-232]');
      if (!el) return;
      var handler = function (event) { openTool('document-editor.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-233]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-de-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-234]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-de-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-235]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-de-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-236]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-de-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-237]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-de-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-238]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-de-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-239]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-de-7') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-240]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-de-8') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-241]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-de-9') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-242]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-de-10') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-243]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-de-11') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-244]');
      if (!el) return;
      var handler = function (event) { openTool('pdf-viewer.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-245]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pdf-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-246]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pdf-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-247]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pdf-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-248]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pdf-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-249]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-pdf-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-250]');
      if (!el) return;
      var handler = function (event) { openTool('administrative-groups.html') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-251]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ag-1') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-252]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ag-2') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-253]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ag-3') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-254]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ag-4') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-255]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ag-5') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-256]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ag-6') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-257]');
      if (!el) return;
      var handler = function (event) { toggleAccordion('acc-ag-7') };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-258]');
      if (!el) return;
      var handler = function (event) { if(event.target===this) closeSearchModal() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-259]');
      if (!el) return;
      var handler = function (event) { executeModalSearch(this.value) };
      el.addEventListener('input', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-260]');
      if (!el) return;
      var handler = function (event) { clearModalSearch() };
      el.addEventListener('click', handler);
    })();
    (function () {
      var el = document.querySelector('[data-htev-261]');
      if (!el) return;
      var handler = function (event) { closeSearchModal() };
      el.addEventListener('click', handler);
    })();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
