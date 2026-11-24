// Board Guided Wizards (Import Hub + Export Wizard + Character Network Helper)
// Uses window.CmtWizard from js/shared/wizard.js
(function (root) {
  'use strict';

  function tr(key, fallback) {
    try {
      if (root.i18n && typeof root.i18n.t === 'function') {
        var val = root.i18n.t(key);
        if (val && val !== key) return val;
      }
      if (typeof root.t === 'function') {
        var v2 = root.t(key);
        if (v2 && v2 !== key) return v2;
      }
    } catch (_) {}
    return fallback !== undefined ? fallback : key;
  }

  function conOpenImportWizard() {
    if (!root.CmtWizard) {
      if (typeof root.conOpenUniversalImportModal === 'function') root.conOpenUniversalImportModal();
      return;
    }

    root.CmtWizard.open({
      id: 'board-import-wizard',
      title: tr('boardImpWizTitle', 'Import to Board'),
      icon: 'import.svg',
      width: '720px',
      initialState: {
        source: 'database'
      },
      quickModeToggle: {
        label: tr('wizQuickUniversal', 'Direct Database Importer'),
        icon: 'manage-database.svg',
        onClick: function (wiz) {
          wiz.close();
          if (typeof root.conOpenUniversalImportModal === 'function') {
            root.conOpenUniversalImportModal();
          }
        }
      },
      steps: [
        {
          id: 'pick-source',
          label: tr('boardImpWizStep1', '1. Choose Content'),
          render: function (container, st, ctx) {
            container.innerHTML =
              '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('boardImpWizHeading', 'What would you like to add to your Board?')) + '</h3>' +
              '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('boardImpWizSub', 'Pick what you have ready, and we will guide you through the next step.')) + '</p>';

            var options = [
              {
                id: 'database',
                icon: 'manage-database.svg',
                badge: tr('boardImpBadgeDb', 'Words / Class'),
                title: tr('boardImpOptDb', 'Vocabulary, Quiz, or Class Roster'),
                desc: tr('boardImpOptDbDesc', 'Pull words, definitions, questions, or student lists from your saved databases.')
              },
              {
                id: 'media',
                icon: 'media.svg',
                badge: 'PDF / IMG / MP3',
                title: tr('boardImpOptMedia', 'Document, Image, Audio, or Video'),
                desc: tr('boardImpOptMediaDesc', 'Add PDF pages, pictures, audio recordings (with optional transcript), or video clips.')
              },
              {
                id: 'book',
                icon: 'book.svg',
                badge: 'DOCX / EPUB / TXT',
                title: tr('boardImpOptBook', 'Book or Text Passage'),
                desc: tr('boardImpOptBookDesc', 'Browse a book or Word/EPUB file and turn excerpts into notes or word nodes.')
              },
              {
                id: 'storymap',
                icon: 'users.svg',
                badge: tr('boardImpBadgeMap', 'Story Map'),
                title: tr('boardImpOptStory', 'Novel Character Map'),
                desc: tr('boardImpOptStoryDesc', 'Automatically find characters in a novel and draw how they connect.')
              },
              {
                id: 'session',
                icon: 'folder.svg',
                badge: '.CSTZ / .JS',
                title: tr('boardImpOptSession', 'Saved Board or Template'),
                desc: tr('boardImpOptSessionDesc', 'Load a previously saved Board file or reusable template from your computer.')
              }
            ];

            ctx.renderCards(container, options, st.source, function (item) {
              st.source = item.id;
            });
          }
        },
        {
          id: 'launch-guidance',
          label: tr('boardImpWizStep2', '2. Prepare & Open'),
          render: function (container, st, ctx) {
            var infoMap = {
              database: {
                heading: tr('boardImpPrepDbTitle', 'Ready to browse your Databases'),
                desc: tr('boardImpPrepDbDesc', 'In the next window, filter by topic, language, or class, check the items you want, and click Insert.'),
                btn: tr('boardImpBtnOpenDb', 'Open Database Browser')
              },
              media: {
                heading: tr('boardImpPrepMediaTitle', 'Choose your file'),
                desc: tr('boardImpPrepMediaDesc', 'Pick an image, PDF, audio, or video file. For PDFs, you can choose which pages to add; for audio, you can generate a transcript.'),
                btn: tr('boardImpBtnPickFile', 'Choose File from Computer')
              },
              book: {
                heading: tr('boardImpPrepBookTitle', 'Open Book & Text Importer'),
                desc: tr('boardImpPrepBookDesc', 'Select a saved book or upload a .docx, .epub, .pdf, or .txt file, then highlight the passage you want on your Board.'),
                btn: tr('boardImpBtnOpenBook', 'Open Text Importer')
              },
              storymap: {
                heading: tr('boardImpPrepStoryTitle', 'Build a Character Network'),
                desc: tr('boardImpPrepStoryDesc', 'Pick a novel, scan for character names, merge any nicknames, and generate a visual relationship map.'),
                btn: tr('boardImpBtnOpenStory', 'Open Character Map Builder')
              },
              session: {
                heading: tr('boardImpPrepSessionTitle', 'Load a Saved Board'),
                desc: tr('boardImpPrepSessionDesc', 'Choose a .cstz, .js, or .json Board file from your computer to open it.'),
                btn: tr('boardImpBtnLoadBoard', 'Choose Board File')
              }
            };
            var info = infoMap[st.source] || infoMap.database;
            ctx.setFinishLabel(info.btn);
            container.innerHTML =
              '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(info.heading) + '</h3>' +
              '<p class="cmt-wiz-step-sub">' + ctx.escHtml(info.desc) + '</p>' +
              '<div class="cmt-wiz-summary-box">' +
                '<strong>' + ctx.escHtml(tr('boardImpTipLabel', 'Tip:')) + '</strong> ' +
                ctx.escHtml(tr('boardImpTipDrop', 'You can also drag and drop images, PDFs, audio, or video files directly onto the Board canvas anytime.')) +
              '</div>';
          }
        }
      ],
      finishLabel: tr('wizContinue', 'Continue'),
      finishIcon: 'arrow-right.svg',
      onFinish: function (st) {
        if (st.source === 'database') {
          if (typeof root.conOpenUniversalImportModal === 'function') root.conOpenUniversalImportModal();
        } else if (st.source === 'media') {
          if (typeof root.conPickAttachments === 'function') root.conPickAttachments();
        } else if (st.source === 'book') {
          if (typeof root.taOpenImport === 'function') root.taOpenImport();
        } else if (st.source === 'storymap') {
          if (typeof root.characterNetworkOpenModal === 'function') root.characterNetworkOpenModal();
        } else if (st.source === 'session') {
          if (typeof root.sessionLoadFromFile === 'function') root.sessionLoadFromFile();
        }
      }
    });
  }

  function conOpenExportWizard(triggerEvent) {
    if (!root.CmtWizard) {
      if (typeof root.conOpenLegacyExportChooser === 'function') root.conOpenLegacyExportChooser(triggerEvent);
      return;
    }

    root.CmtWizard.open({
      id: 'board-export-wizard',
      title: tr('boardExpWizTitle', 'Export Board'),
      icon: 'export.svg',
      width: '700px',
      initialState: {
        goal: 'handout',
        pdfMode: 'vector',
        pdfScope: 'all',
        imageAction: 'png',
        vocabFormat: 'pdf',
        qualityPreset: 'balanced'
      },
      quickModeToggle: {
        label: tr('wizQuickAdvanced', 'Quick / Advanced Menu'),
        icon: 'settings.svg',
        onClick: function (wiz) {
          wiz.close();
          if (typeof root.conOpenLegacyExportChooser === 'function') {
            root.conOpenLegacyExportChooser(triggerEvent);
          }
        }
      },
      steps: [
        {
          id: 'goal',
          label: tr('boardExpWizStep1', '1. Purpose'),
          render: function (container, st, ctx) {
            container.innerHTML =
              '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('boardExpWizHeading', 'How do you want to use this export?')) + '</h3>' +
              '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('boardExpWizSub', 'Choose your goal below, or open the Quick / Advanced Menu for direct one-click formats.')) + '</p>';
            var goals = [
              { id: 'handout', icon: 'printer.svg', badge: 'PDF', title: tr('boardExpGoalPdf', 'Printable PDF Booklet'), desc: tr('boardExpGoalPdfDesc', 'Create a clean PDF of your board pages to print or share with students.') },
              { id: 'image', icon: 'media.svg', badge: 'PNG / WebP', title: tr('boardExpGoalImg', 'Picture for Slides or Docs'), desc: tr('boardExpGoalImgDesc', 'Save the current board as an image file or copy it straight to your clipboard.') },
              { id: 'vocab', icon: 'table.svg', badge: 'PDF / CSV', title: tr('boardExpGoalVocab', 'Vocabulary / Word List'), desc: tr('boardExpGoalVocabDesc', 'Extract the words and definitions from your board as a printable table or spreadsheet.') },
              { id: 'backup', icon: 'save.svg', badge: '.JS', title: tr('boardExpGoalBackup', 'Shareable Board File'), desc: tr('boardExpGoalBackupDesc', 'Save a portable Board file to open on another computer or share with a colleague.') }
            ];
            ctx.renderCards(container, goals, st.goal, function (item) {
              st.goal = item.id;
            });
          }
        },
        {
          id: 'options',
          label: tr('boardExpWizStep2', '2. Options'),
          render: function (container, st, ctx) {
            if (st.goal === 'handout') {
              container.innerHTML =
                '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('boardExpPdfOptHeading', 'PDF Style & Pages')) + '</h3>' +
                '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('boardExpPdfOptSub', 'Choose whether text stays sharp & selectable, or looks identical to your screen.')) + '</p>';
              var modes = [
                { id: 'vector', icon: 'file-text.svg', badge: tr('wizRecommended', 'Recommended'), title: tr('boardExpPdfVector', 'Crisp Text & Shapes (Vector)'), desc: tr('boardExpPdfVectorDesc', 'Best for printing and small file sizes. Text stays sharp at any zoom.') },
                { id: 'snapshots', icon: 'snap.svg', badge: 'Snapshot', title: tr('boardExpPdfSnap', 'Exact Screen Snapshot'), desc: tr('boardExpPdfSnapDesc', 'Captures drawings, backgrounds, and complex layouts exactly as shown.') }
              ];
              ctx.renderCards(container, modes, st.pdfMode, function (item) { st.pdfMode = item.id; });
            } else if (st.goal === 'image') {
              container.innerHTML =
                '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('boardExpImgOptHeading', 'Image Format')) + '</h3>' +
                '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('boardExpImgOptSub', 'Pick how you want to save or copy the current board view.')) + '</p>';
              var imgOpts = [
                { id: 'png', icon: 'media.svg', badge: 'PNG', title: tr('boardExpImgPng', 'Save PNG Picture'), desc: tr('boardExpImgPngDesc', 'Standard image format compatible with Word, PowerPoint, and Google Slides.') },
                { id: 'copy', icon: 'copy.svg', badge: 'Clipboard', title: tr('boardExpImgCopy', 'Copy Picture to Clipboard'), desc: tr('boardExpImgCopyDesc', 'Paste directly into an email, slide deck, or document with Ctrl+V.') },
                { id: 'webp', icon: 'compact.svg', badge: 'WebP', title: tr('boardExpImgWebp', 'Compact Web Image (WebP)'), desc: tr('boardExpImgWebpDesc', 'Smaller file size with quality and resolution options.') }
              ];
              ctx.renderCards(container, imgOpts, st.imageAction, function (item) { st.imageAction = item.id; });
            } else if (st.goal === 'vocab') {
              container.innerHTML =
                '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('boardExpVocabOptHeading', 'Word List Format')) + '</h3>' +
                '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('boardExpVocabOptSub', 'Choose how you want to export the words on your board.')) + '</p>';
              var vOpts = [
                { id: 'pdf', icon: 'printer.svg', badge: 'PDF', title: tr('boardExpVocabPdf', 'Printable Vocabulary Table'), desc: tr('boardExpVocabPdfDesc', 'Lets you choose which columns (Word, Translation, IPA, Definition) to print.') },
                { id: 'csv', icon: 'table.svg', badge: 'CSV', title: tr('boardExpVocabCsv', 'Spreadsheet Table (.csv)'), desc: tr('boardExpVocabCsvDesc', 'Opens in Excel or LibreOffice Calc for further editing.') }
              ];
              ctx.renderCards(container, vOpts, st.vocabFormat, function (item) { st.vocabFormat = item.id; });
            } else {
              container.innerHTML =
                '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('boardExpBackupHeading', 'Shareable Board File')) + '</h3>' +
                '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('boardExpBackupSub', 'This saves all pages, nodes, notes, and drawings into a portable file.')) + '</p>' +
                '<div class="cmt-wiz-summary-box">' + ctx.escHtml(tr('boardExpBackupInfo', 'Click Export below to choose where to save your Board file.')) + '</div>';
            }
          }
        },
        {
          id: 'confirm',
          label: tr('boardExpWizStep3', '3. Export'),
          render: function (container, st, ctx) {
            var desc = '';
            if (st.goal === 'handout') desc = st.pdfMode === 'vector' ? 'PDF (Vector)' : 'PDF (Snapshot Options)';
            else if (st.goal === 'image') desc = st.imageAction.toUpperCase();
            else if (st.goal === 'vocab') desc = st.vocabFormat === 'pdf' ? 'Words Table PDF' : 'CSV Spreadsheet';
            else desc = 'Board File (.js)';

            container.innerHTML =
              '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('boardExpConfirmHeading', 'Ready to export')) + '</h3>' +
              '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('boardExpConfirmSub', 'Click Export to generate your file.')) + '</p>' +
              '<div class="cmt-wiz-summary-box">' +
                '<div><strong>' + ctx.escHtml(tr('boardExpSummaryChoice', 'Selected Export:')) + '</strong> ' + ctx.escHtml(desc) + '</div>' +
              '</div>';
          }
        }
      ],
      finishLabel: tr('btnExport', 'Export'),
      finishIcon: 'export.svg',
      onFinish: function (st) {
        if (st.goal === 'handout') {
          if (st.pdfMode === 'vector') {
            if (typeof root.conExportPagesPDF === 'function') root.conExportPagesPDF('vector');
          } else {
            if (typeof root.conOpenExportSettingsModal === 'function') root.conOpenExportSettingsModal('pdf_snapshots');
          }
        } else if (st.goal === 'image') {
          if (st.imageAction === 'png' && typeof root.conExportPNG === 'function') root.conExportPNG();
          else if (st.imageAction === 'copy' && typeof root.conCopyPNG === 'function') root.conCopyPNG();
          else if (st.imageAction === 'webp' && typeof root.conOpenExportSettingsModal === 'function') root.conOpenExportSettingsModal('webp');
        } else if (st.goal === 'vocab') {
          if (st.vocabFormat === 'pdf' && typeof root.conExportPDF === 'function') root.conExportPDF();
          else if (st.vocabFormat === 'csv' && typeof root.conExportCSV === 'function') root.conExportCSV();
        } else if (st.goal === 'backup') {
          if (typeof root.conExportJS === 'function') root.conExportJS();
        }
      }
    });
  }

  root.conOpenImportWizard = conOpenImportWizard;
  root.conOpenExportWizard = conOpenExportWizard;
})(typeof window !== 'undefined' ? window : this);
