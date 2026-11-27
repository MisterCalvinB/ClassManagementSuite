(function (root) {
  'use strict';

  var TYPE_TO_IMPORT_DEST = {
    wordbanks: 'wordbank',
    quotebanks: 'quote',
    dictations: 'dictation',
    grammarbanks: 'grammar',
    gapfillbanks: 'gapfill',
    errorbanks: 'error',
    sentencebanks: 'sentence',
    storybanks: 'story',
    quizzes: 'quiz',
    competences: 'competences'
  };

  function tr(key, fallback) {
    try {
      if (root.i18n && typeof root.i18n.t === 'function') {
        var v = root.i18n.t(key);
        if (v && v !== key) return v;
      }
      if (typeof root.t === 'function') {
        var v2 = root.t(key);
        if (v2 && v2 !== key) return v2;
      }
    } catch (_) {}
    return fallback !== undefined ? fallback : key;
  }

  function openImportToolForActiveType(destOverride) {
    var dest = destOverride || '';
    if (!dest && root.S && root.S.typeKey && TYPE_TO_IMPORT_DEST[root.S.typeKey]) {
      dest = TYPE_TO_IMPORT_DEST[root.S.typeKey];
    }
    var page = dest ? ('import-tool.html?dest=' + encodeURIComponent(dest)) : 'import-tool.html';
    if (root.Desktop && typeof root.Desktop.isElectron === 'function' && root.Desktop.isElectron()) {
      root.Desktop.openTool(page);
    } else {
      window.location.href = page;
    }
  }

  function openCompleteImportModal() {
    var bg = document.getElementById('mdb-import-modal-bg');
    if (!bg) {
      openImportToolForActiveType();
      return;
    }
    var ctxEl = document.getElementById('mdb-import-context-text');
    if (ctxEl) {
      var activeType = (root.S && root.S.typeKey) ? root.S.typeKey : '';
      var activeFile = (root.S && root.S.activeFile) ? root.S.activeFile : '';
      if (activeType) {
        ctxEl.textContent = tr('mdbImportContextActive', 'Active database') + ': ' + activeType + (activeFile ? (' / ' + activeFile) : '');
      } else {
        ctxEl.textContent = tr('mdbImportContextNone', 'No database selected yet — choose an import workflow below.');
      }
    }
    var mergeCard = document.getElementById('mdb-imp-card-merge');
    if (mergeCard) {
      var hasActiveType = Boolean(root.S && root.S.typeKey);
      mergeCard.disabled = !hasActiveType;
      mergeCard.style.opacity = hasActiveType ? '1' : '0.55';
    }
    bg.classList.remove('hidden');
  }

  function closeCompleteImportModal() {
    var bg = document.getElementById('mdb-import-modal-bg');
    if (bg) bg.classList.add('hidden');
  }

  function launchDocumentWordbankWizard() {
    closeCompleteImportModal();
    if (!root.DocumentWordbankWizard) return;
    var defaultFile = (root.S && root.S.typeKey === 'wordbanks' && root.S.activeFile) ? root.S.activeFile : '';
    root.DocumentWordbankWizard.open({
      defaultTargetFile: defaultFile,
      onSaved: async function (res) {
        if (typeof root.typeCache === 'object' && root.typeCache) {
          delete root.typeCache.wordbanks;
        }
        if (root.S && root.S.typeKey === 'wordbanks') {
          root.S.typeKey = null;
        }
        if (typeof root.selectType === 'function') {
          await root.selectType('wordbanks');
          if (res && res.filename && root.S && Array.isArray(root.S.files)) {
            var idx = root.S.files.findIndex(function (f) { return f.filename === res.filename; });
            if (idx !== -1 && typeof root.toggleFile === 'function') {
              await root.toggleFile(idx);
            }
          }
        }
      }
    });
  }

  function bindImportModalEvents() {
    var bg = document.getElementById('mdb-import-modal-bg');
    if (!bg) return;

    bg.addEventListener('click', function (ev) {
      if (ev.target === bg) closeCompleteImportModal();
    });

    var closeBtn = document.getElementById('mdb-import-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeCompleteImportModal);

    var cancelBtn = document.getElementById('mdb-import-modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeCompleteImportModal);

    var docCard = document.getElementById('mdb-imp-card-doc-wizard');
    if (docCard) docCard.addEventListener('click', launchDocumentWordbankWizard);

    var toolCard = document.getElementById('mdb-imp-card-full-tool');
    if (toolCard) {
      toolCard.addEventListener('click', function () {
        closeCompleteImportModal();
        openImportToolForActiveType();
      });
    }

    var mergeCard = document.getElementById('mdb-imp-card-merge');
    if (mergeCard) {
      mergeCard.addEventListener('click', function () {
        if (mergeCard.disabled) return;
        closeCompleteImportModal();
        if (typeof root.openMerge === 'function') root.openMerge();
      });
    }

    var studioBtn = document.getElementById('mdb-imp-open-studio');
    if (studioBtn) {
      studioBtn.addEventListener('click', function () {
        closeCompleteImportModal();
        if (root.Desktop && typeof root.Desktop.isElectron === 'function' && root.Desktop.isElectron()) {
          root.Desktop.openTool('database-converter.html');
        } else {
          window.location.href = 'database-converter.html';
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindImportModalEvents();
    var params = new URLSearchParams(window.location.search);
    if (params.get('openDocWizard') === '1') {
      setTimeout(launchDocumentWordbankWizard, 150);
    }
  });

  root.openCompleteImportModal = openCompleteImportModal;
  root.closeCompleteImportModal = closeCompleteImportModal;
  root.launchDocumentWordbankWizard = launchDocumentWordbankWizard;
  root.openImportToolForActiveType = openImportToolForActiveType;
})(typeof window !== 'undefined' ? window : globalThis);
