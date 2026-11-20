'use strict';

// Test Creator — Orchestrator, Floating Toolbar, Tour & Initialization
window.tcOpenShortcuts = function () {
  if (window.ShortcutsModal) {
    ShortcutsModal.open({
      title: 'Test Creator Shortcuts',
      rows: [
        { key: 'Ctrl + S', desc: 'Save Test' },
        { key: 'Ctrl + O', desc: 'Open Saved Test' },
        { key: 'Ctrl + N', desc: 'New Blank Test' },
        { key: 'Ctrl + P', desc: 'Print / PDF Preview' },
        { key: 'Ctrl + E', desc: 'Export Exam' },
        { key: 'Ctrl + B', desc: 'Bold text in inputs (or Toggle Drawer)' },
        { key: 'Ctrl + I', desc: 'Italic text in inputs' },
        { key: 'Ctrl + U', desc: 'Underline text in inputs' },
        { key: 'Ctrl + H', desc: 'Header & Materials Customizer' }
      ]
    });
  }
};

window.tcStartTutorial = function () {
  if (window.Tutorial) {
    Tutorial.start([
      { element: '#testTitle', title: 'Header Details', text: 'Set your test title, subject, target class, date, and duration here.' },
      { element: '#exerciseCardsList', title: 'Exercise Builder', text: 'Add, drag to reorder, configure points, rubrics, and answer keys for 11 exercise types.' },
      { element: '#testDrawer', title: 'Resource Drawer', text: 'Pull from Test Banks, custom learning databases, correction criteria, or curriculum competences.' },
      { element: '#totalPointsBadge', title: 'Live Points Score', text: 'Dynamic calculation of points with scale models.' }
    ]);
  }
};

// ── Floating Toolbar & Selection Formatting ───────────────────────────
var _lastFocusedInput = null;

document.addEventListener('focusin', function (e) {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
    _lastFocusedInput = e.target;
  }
});

window.tcApplyFormatToActiveInput = function (fmt, arg) {
  var target = _lastFocusedInput || document.activeElement;
  if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return;
  tcInsertFormat(target, fmt, arg);
  tcUpdateFloatingToolbarPosition();
};

function tcUpdateFloatingToolbarPosition() {
  var bar = document.getElementById('tcFloatingFmtBar');
  if (!bar) return;
  var el = document.activeElement;
  if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) {
    bar.style.display = 'none';
    return;
  }
  var start = el.selectionStart;
  var end = el.selectionEnd;
  if (start === undefined || end === undefined || start === end) {
    bar.style.display = 'none';
    return;
  }

  var rect = el.getBoundingClientRect();
  bar.style.display = 'inline-flex';
  bar.style.left = Math.max(8, (rect.left + window.scrollX)) + 'px';
  bar.style.top = Math.max(8, (rect.top + window.scrollY - 34)) + 'px';
}

document.addEventListener('selectionchange', function () {
  tcUpdateFloatingToolbarPosition();
});

document.addEventListener('mouseup', function () {
  setTimeout(tcUpdateFloatingToolbarPosition, 20);
});

document.addEventListener('keyup', function (e) {
  if (e.key === 'Escape') {
    var bar = document.getElementById('tcFloatingFmtBar');
    if (bar) bar.style.display = 'none';
  } else {
    setTimeout(tcUpdateFloatingToolbarPosition, 20);
  }
});

// ── Universal Keyboard Shortcuts ─────────────────────────────────────
document.addEventListener('focusin', function (e) {
  var card = e.target && e.target.closest ? e.target.closest('.exercise-card-item') : null;
  if (card) {
    window._lastActiveExerciseId = card.id.replace(/^card-/, '');
    window._lastFocusedInput = e.target;
  }
});
document.addEventListener('click', function (e) {
  var card = e.target && e.target.closest ? e.target.closest('.exercise-card-item') : null;
  if (card) {
    window._lastActiveExerciseId = card.id.replace(/^card-/, '');
  }
});

window.addEventListener('keydown', function (e) {
  var isCtrl = e.ctrlKey || e.metaKey;
  if (!isCtrl) return;

  var activeEl = document.activeElement;
  var isTextInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

  if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    tcSaveTest();
  } else if (e.key === 'o' || e.key === 'O') {
    e.preventDefault();
    tcOpenTestPicker();
  } else if (e.key === 'b' || e.key === 'B') {
    e.preventDefault();
    if (isTextInput) {
      tcInsertFormat(activeEl, 'bold');
    } else {
      tcToggleDrawer();
    }
  } else if (e.key === 'i' || e.key === 'I') {
    if (isTextInput) {
      e.preventDefault();
      tcInsertFormat(activeEl, 'italic');
    }
  } else if (e.key === 'u' || e.key === 'U') {
    if (isTextInput) {
      e.preventDefault();
      tcInsertFormat(activeEl, 'underline');
    }
  } else if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    tcOpenPrintPreview();
  } else if (e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    tcOpenExportModal();
  } else if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    tcNewTest();
  } else if (e.key === 'h' || e.key === 'H') {
    e.preventDefault();
    tcOpenHeaderCustomizerModal();
  } else if ((e.key === 'r' || e.key === 'R') && !isTextInput) {
    e.preventDefault();
    tcForceRefreshPreview();
  }
});

window.addEventListener('keydown', function (e) {
  if (e.key === 'F5') {
    e.preventDefault();
    tcForceRefreshPreview();
  }
});

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    var _langChannel = new BroadcastChannel('cmt_lang_channel');
    _langChannel.onmessage = function (ev) {
      if (ev && ev.data && (ev.data.type === 'lang_changed' || ev.data.action === 'change_lang' || ev.data.type === 'language_change')) {
        if (typeof applyTranslations === 'function') applyTranslations();
        if (typeof tcPopulateThemeDropdowns === 'function') tcPopulateThemeDropdowns();
        if (typeof tcUpdateFreezePreviewUI === 'function') tcUpdateFreezePreviewUI();
        renderTestMeta();
        renderExerciseCards();
        if (typeof tcUpdatePrintPreview === 'function') {
          tcUpdatePrintPreview({ force: true });
        }
      }
    };
  } catch (_) {}
  try {
    var _dataChannel = new BroadcastChannel('cmt_data_sync');
    _dataChannel.onmessage = async function (ev) {
      if (ev && ev.data && (ev.data.file === 'class-groups.js' || ev.data.type === 'class-groups')) {
        await loadInitialData();
        await tcLoadAllAvailableSubjects();
        if (typeof showDataChangedBanner === 'function') {
          showDataChangedBanner({ file: 'class-groups.js', label: 'Class Groups' });
        }
      }
    };
  } catch (_) {}
}

