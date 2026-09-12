// Shared dialog utilities — toast, confirm modal, prompt modal, data-sync banner.
// Include this script in any page to get showToast(), showConfirm(), showPrompt(), showDataChangedBanner().
(function () {
  'use strict';

  // ── Injected CSS ───────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#cmt-toast{',
      'position:fixed;bottom:18px;left:50%;',
      'transform:translateX(-50%) translateY(60px);',
      'background:#1a1a1a;color:#fff;',
      'padding:8px 20px;border-radius:20px;',
      'font-size:.82rem;font-weight:700;',
      'z-index:10000002;pointer-events:none;',
      'opacity:0;transition:transform .25s,opacity .25s;',
      'max-width:80vw;text-align:center;white-space:pre-wrap;',
      'user-select:none;-webkit-user-select:none;',
    '}',
    '#cmt-toast.show{transform:translateX(-50%) translateY(0);opacity:1;}',
    '#cmt-toast.error{background:#c00;}',
    '.cmt-overlay{',
      'display:none;position:fixed;inset:0;',
      'background:rgba(0,0,0,.45);',
      'z-index:10000000;align-items:center;justify-content:center;',
      'user-select:none;-webkit-user-select:none;',
    '}',
    '.cmt-overlay.open{display:flex;}',
    '.cmt-dialog-box{',
      'background:#fff;border:2px solid #000;border-radius:10px;',
      'box-shadow:4px 4px 0 rgba(0,0,0,.2);',
      'padding:24px 28px 18px;min-width:280px;max-width:420px;',
      'box-sizing:border-box;',
    '}',
    '.cmt-dialog-msg{',
      'margin:0 0 16px;font-size:.95rem;',
      'white-space:pre-wrap;line-height:1.45;',
    '}',
    '.cmt-dialog-input{',
      'width:100%;box-sizing:border-box;',
      'border:1.5px solid #aaa;border-radius:6px;',
      'padding:6px 10px;font-size:.9rem;margin-bottom:14px;',
      'user-select:text;-webkit-user-select:text;',
    '}',
    '.cmt-dialog-btns{display:flex;gap:10px;justify-content:flex-end;user-select:none;-webkit-user-select:none;}',
    '.cmt-btn-cancel,.cmt-btn-ok{',
      'padding:6px 18px;border-radius:6px;border:1.5px solid #000;',
      'font-size:.85rem;font-weight:700;cursor:pointer;',
      'user-select:none;-webkit-user-select:none;',
    '}',
    '.cmt-btn-cancel{background:#fff;}',
    '.cmt-btn-ok{background:#000;color:#fff;}',
    // Data-sync banner
    '#cmt-sync-banner{',
      'position:fixed;top:-90px;left:50%;transform:translateX(-50%);',
      'background:#1a1a2e;color:#e8e8f0;',
      'border:1.5px solid #4a6fa5;border-radius:0 0 10px 10px;',
      'box-shadow:0 4px 18px rgba(0,0,0,.45);',
      'padding:10px 16px 10px 14px;',
      'display:flex;align-items:center;gap:10px;',
      'font-size:.82rem;z-index:999997;',
      'transition:top .3s cubic-bezier(.22,1,.36,1);',
      'max-width:90vw;white-space:nowrap;',
      'user-select:none;-webkit-user-select:none;',
    '}',
    '#cmt-sync-banner.cmt-sync-show{top:0;}',
    '#cmt-sync-banner .cmt-sync-icon{font-size:.95rem;flex-shrink:0;}',
    '#cmt-sync-banner .cmt-sync-msg{flex:1;overflow:hidden;text-overflow:ellipsis;}',
    '#cmt-sync-banner .cmt-sync-btns{display:flex;gap:6px;flex-shrink:0;}',
    '#cmt-sync-banner button{',
      'padding:4px 10px;border-radius:5px;border:1px solid #4a6fa5;',
      'font-size:.78rem;font-weight:700;cursor:pointer;background:#253450;color:#e8e8f0;',
      'user-select:none;-webkit-user-select:none;',
    '}',
    '#cmt-sync-banner button:hover{background:#4a6fa5;}',
    '#cmt-sync-banner .cmt-sync-dismiss{',
      'background:transparent;border-color:#555;color:#999;',
    '}',
    '#cmt-sync-banner .cmt-sync-dismiss:hover{background:#333;color:#e8e8f0;}',
  ].join('');
  document.head.appendChild(style);

  // ── Toast ──────────────────────────────────────────────────────────────────
  var toastEl = null;
  var toastTimer = null;

  function ensureToast() {
    if (toastEl) return;
    toastEl = document.createElement('div');
    toastEl.id = 'cmt-toast';
    document.body.appendChild(toastEl);
  }

  window.showToast = function (msg, isErrorOrDur) {
    ensureToast();
    toastEl.textContent = msg;
    var isErr = isErrorOrDur === true;
    var dur = typeof isErrorOrDur === 'number' ? isErrorOrDur : 2500;
    toastEl.classList.toggle('error', isErr);
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, dur);
  };
  window._dlgShowToast = window.showToast;


  // ── Confirm modal ──────────────────────────────────────────────────────────
  var confirmOverlay = null;
  var confirmResolve = null;

  function ensureConfirm() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement('div');
    confirmOverlay.className = 'cmt-overlay';
    confirmOverlay.innerHTML =
      '<div class="cmt-dialog-box">' +
        '<p class="cmt-dialog-msg"></p>' +
        '<div class="cmt-dialog-btns">' +
          '<button class="cmt-btn-cancel">Cancel</button>' +
          '<button class="cmt-btn-ok">OK</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(confirmOverlay);

    confirmOverlay.querySelector('.cmt-btn-ok').addEventListener('click', function () { resolveConfirm(true); });
    confirmOverlay.querySelector('.cmt-btn-cancel').addEventListener('click', function () { resolveConfirm(false); });
    confirmOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  { e.preventDefault(); resolveConfirm(true);  }
      if (e.key === 'Escape') { e.preventDefault(); resolveConfirm(false); }
    });
  }

  function resolveConfirm(val) {
    if (!confirmOverlay) return;
    confirmOverlay.classList.remove('open');
    if (confirmResolve) { var r = confirmResolve; confirmResolve = null; r(val); }
  }

  function _dlgConfirm(msg) {
    ensureConfirm();
    confirmOverlay.querySelector('.cmt-dialog-msg').textContent = msg;
    applyDialogI18n(confirmOverlay);
    confirmOverlay.classList.add('open');
    setTimeout(function () {
      var ok = confirmOverlay.querySelector('.cmt-btn-ok');
      if (ok) ok.focus();
    }, 50);
    return new Promise(function (resolve) { confirmResolve = resolve; });
  }
  window.showConfirm = _dlgConfirm;
  window._dlgShowConfirm = _dlgConfirm;

  // ── Prompt modal ───────────────────────────────────────────────────────────
  var promptOverlay = null;
  var promptResolve = null;

  function ensurePrompt() {
    if (promptOverlay) return;
    promptOverlay = document.createElement('div');
    promptOverlay.className = 'cmt-overlay';
    promptOverlay.innerHTML =
      '<div class="cmt-dialog-box">' +
        '<p class="cmt-dialog-msg"></p>' +
        '<input class="cmt-dialog-input" type="text">' +
        '<div class="cmt-dialog-btns">' +
          '<button class="cmt-btn-cancel">Cancel</button>' +
          '<button class="cmt-btn-ok">OK</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(promptOverlay);

    var input = promptOverlay.querySelector('.cmt-dialog-input');
    promptOverlay.querySelector('.cmt-btn-ok').addEventListener('click', function () { resolvePrompt(input.value); });
    promptOverlay.querySelector('.cmt-btn-cancel').addEventListener('click', function () { resolvePrompt(null); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  { e.preventDefault(); resolvePrompt(input.value); }
      if (e.key === 'Escape') { e.preventDefault(); resolvePrompt(null); }
    });
  }

  function resolvePrompt(val) {
    if (!promptOverlay) return;
    promptOverlay.classList.remove('open');
    if (promptResolve) { var r = promptResolve; promptResolve = null; r(val); }
  }

  function _dlgPrompt(msg, defaultVal) {
    ensurePrompt();
    promptOverlay.querySelector('.cmt-dialog-msg').textContent = msg;
    var input = promptOverlay.querySelector('.cmt-dialog-input');
    input.value = defaultVal != null ? String(defaultVal) : '';
    applyDialogI18n(promptOverlay);
    promptOverlay.classList.add('open');
    setTimeout(function () { input.focus(); input.select(); }, 50);
    return new Promise(function (resolve) { promptResolve = resolve; });
  }
  window.showPrompt = _dlgPrompt;
  window._dlgShowPrompt = _dlgPrompt;

  // ── Timed Confirm modal (e.g. Autosave before close) ──────────────────────
  var timedConfirmOverlay = null;
  var timedConfirmResolve = null;
  var timedConfirmTimer = null;
  var timedConfirmRemaining = 0;

  function ensureTimedConfirm() {
    if (timedConfirmOverlay) return;
    timedConfirmOverlay = document.createElement('div');
    timedConfirmOverlay.className = 'cmt-overlay';
    timedConfirmOverlay.innerHTML =
      '<div class="cmt-dialog-box" style="text-align: center; max-width: 420px; padding: 24px 26px 20px;">' +
        '<div style="font-size: 2rem; margin-bottom: 10px; line-height: 1;">💾</div>' +
        '<h3 class="cmt-timed-title" style="margin: 0 0 10px; font-size: 1.1rem; font-weight: 800; color: inherit;"></h3>' +
        '<p class="cmt-timed-msg" style="margin: 0 0 12px; font-size: .92rem; line-height: 1.45; color: inherit; white-space: pre-wrap;"></p>' +
        '<div class="cmt-timed-countdown" style="margin-bottom: 18px; font-size: .84rem; font-weight: 600; color: #888;"></div>' +
        '<div class="cmt-dialog-btns" style="justify-content: center; gap: 14px;">' +
          '<button class="cmt-btn-cancel cmt-timed-btn-no" style="min-width: 90px; padding: 8px 18px;"></button>' +
          '<button class="cmt-btn-ok cmt-timed-btn-yes" style="min-width: 90px; padding: 8px 18px;"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(timedConfirmOverlay);

    timedConfirmOverlay.querySelector('.cmt-timed-btn-yes').addEventListener('click', function () { resolveTimedConfirm(true); });
    timedConfirmOverlay.querySelector('.cmt-timed-btn-no').addEventListener('click', function () { resolveTimedConfirm(false); });
    timedConfirmOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  { e.preventDefault(); resolveTimedConfirm(true);  }
      if (e.key === 'Escape') { e.preventDefault(); resolveTimedConfirm(false); }
    });
  }

  function resolveTimedConfirm(val) {
    if (timedConfirmTimer) {
      clearInterval(timedConfirmTimer);
      timedConfirmTimer = null;
    }
    if (!timedConfirmOverlay) return;
    timedConfirmOverlay.classList.remove('open');
    if (timedConfirmResolve) {
      var r = timedConfirmResolve;
      timedConfirmResolve = null;
      r(val);
    }
  }

  function _dlgTimedConfirm(opts) {
    opts = opts || {};
    ensureTimedConfirm();

    var lbl = _getLabels();
    var lang = 'en';
    try {
      var cfg = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
      if (cfg.language) lang = cfg.language;
      var page = (location.pathname.split('/').pop() || '').replace('.html', '') || 'launcher';
      var override = localStorage.getItem('cmt-lang-' + page);
      if (override) lang = override;
    } catch (e) {}

    var defCountdown = {
      en: 'Saving automatically in {seconds}s...',
      fr: 'Sauvegarde automatique dans {seconds}s...',
      de: 'Automatisches Speichern in {seconds}s...',
      it: 'Salvataggio automatico tra {seconds}s...'
    };
    var defTitle = {
      en: 'Unsaved Changes',
      fr: 'Modifications non enregistrées',
      de: 'Ungespeicherte Änderungen',
      it: 'Modifiche non salvate'
    };
    var defMsg = {
      en: 'The board has unsaved changes. Would you like to save before closing?',
      fr: 'Le tableau comporte des modifications non enregistrées. Voulez-vous enregistrer avant de fermer ?',
      de: 'Das Board enthält ungespeicherte Änderungen. Möchten Sie vor dem Schließen speichern?',
      it: 'La lavagna contiene modifiche non salvate. Vuoi salvare prima di chiudere?'
    };

    var title = opts.title || (typeof window.t === 'function' ? window.t('conAutosaveCloseTitle') : (defTitle[lang] || defTitle.en));
    var msg = opts.msg || (typeof window.t === 'function' ? window.t('conAutosaveOnClosePrompt') : (defMsg[lang] || defMsg.en));
    var yesLabel = opts.yesText || (typeof window.t === 'function' ? window.t('btnYes') : (lbl.yes || 'Yes'));
    var noLabel = opts.noText || (typeof window.t === 'function' ? window.t('btnNo') : (lbl.no || 'No'));
    var countdownTemplate = opts.countdownMsg || (typeof window.t === 'function' ? window.t('conAutosaveCountdown') : (defCountdown[lang] || defCountdown.en));
    var seconds = typeof opts.timeoutSeconds === 'number' ? opts.timeoutSeconds : 10;
    var defaultChoice = typeof opts.defaultChoice === 'boolean' ? opts.defaultChoice : true;

    timedConfirmOverlay.querySelector('.cmt-timed-title').textContent = title;
    timedConfirmOverlay.querySelector('.cmt-timed-msg').textContent = msg;
    timedConfirmOverlay.querySelector('.cmt-timed-btn-yes').textContent = yesLabel;
    timedConfirmOverlay.querySelector('.cmt-timed-btn-no').textContent = noLabel;

    var countdownEl = timedConfirmOverlay.querySelector('.cmt-timed-countdown');
    timedConfirmRemaining = seconds;

    function updateCountdown() {
      countdownEl.textContent = countdownTemplate.replace('{seconds}', timedConfirmRemaining);
    }
    updateCountdown();

    if (timedConfirmTimer) {
      clearInterval(timedConfirmTimer);
      timedConfirmTimer = null;
    }

    timedConfirmTimer = setInterval(function () {
      timedConfirmRemaining--;
      if (timedConfirmRemaining <= 0) {
        clearInterval(timedConfirmTimer);
        timedConfirmTimer = null;
        resolveTimedConfirm(defaultChoice);
      } else {
        updateCountdown();
      }
    }, 1000);

    timedConfirmOverlay.classList.add('open');
    setTimeout(function () {
      var yesBtn = timedConfirmOverlay.querySelector('.cmt-timed-btn-yes');
      if (yesBtn) yesBtn.focus();
    }, 50);

    return new Promise(function (resolve) { timedConfirmResolve = resolve; });
  }
  window.showTimedConfirm = _dlgTimedConfirm;
  window._dlgShowTimedConfirm = _dlgTimedConfirm;

  // ── i18n ─────────────────────────────────────────────────────────────────
  var _LABELS = {
    en: { ok: 'OK', cancel: 'Cancel', yes: 'Yes', no: 'No' },
    fr: { ok: 'OK', cancel: 'Annuler', yes: 'Oui', no: 'Non' },
    de: { ok: 'OK', cancel: 'Abbrechen', yes: 'Ja', no: 'Nein' },
    it: { ok: 'OK', cancel: 'Annulla', yes: 'Sì', no: 'No' }
  };

  function _getLabels() {
    var lang = 'en';
    try {
      var cfg = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
      if (cfg.language) lang = cfg.language;
      var page = (location.pathname.split('/').pop() || '').replace('.html', '') || 'launcher';
      var override = localStorage.getItem('cmt-lang-' + page);
      if (override) lang = override;
    } catch (e) {}
    return _LABELS[lang] || _LABELS.en;
  }

  function applyDialogI18n(el) {
    var lbl = _getLabels();
    el.querySelectorAll('.cmt-btn-ok').forEach(function (n) { n.textContent = lbl.ok; });
    el.querySelectorAll('.cmt-btn-cancel').forEach(function (n) { n.textContent = lbl.cancel; });
  }

  // ── Data-sync banner ───────────────────────────────────────────────────────
  var syncBanner = null;
  var syncHideTimer = null;

  function _syncT(key) {
    var lang = 'en';
    try {
      var cfg = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
      if (cfg.language) lang = cfg.language;
      var page = (location.pathname.split('/').pop() || '').replace('.html', '') || 'launcher';
      var override = localStorage.getItem('cmt-lang-' + page);
      if (override) lang = override;
    } catch (e) {}
    // Inline fallback map so the banner works even before i18n.js loads
    var map = {
      en: { dataSyncReload: 'Reload data', dataSyncSaveReload: 'Save & reload', dataSyncDismiss: 'Dismiss', dataSyncMsg: '{source} updated shared data.' },
      fr: { dataSyncReload: 'Recharger', dataSyncSaveReload: 'Sauvegarder & recharger', dataSyncDismiss: 'Ignorer', dataSyncMsg: '{source} a mis à jour des données partagées.' },
      de: { dataSyncReload: 'Neu laden', dataSyncSaveReload: 'Speichern & neu laden', dataSyncDismiss: 'Schließen', dataSyncMsg: '{source} hat gemeinsame Daten aktualisiert.' },
      it: { dataSyncReload: 'Ricarica', dataSyncSaveReload: 'Salva e ricarica', dataSyncDismiss: 'Ignora', dataSyncMsg: '{source} ha aggiornato i dati condivisi.' }
    };
    var lm = map[lang] || map.en;
    if (typeof window.i18nT === 'function') {
      try {
        var res = window.i18nT(key);
        if (res && res !== key) return res;
      } catch (e) {}
    }
    if (typeof window.t === 'function') {
      try {
        var res2 = window.t(key);
        if (res2 && res2 !== key) return res2;
      } catch (e) {}
    }
    return lm[key] || key;
  }

  function ensureSyncBanner() {
    if (syncBanner) return;
    syncBanner = document.createElement('div');
    syncBanner.id = 'cmt-sync-banner';
    syncBanner.innerHTML =
      '<span class="cmt-sync-icon">🔄</span>' +
      '<span class="cmt-sync-msg" data-i18n="dataSyncMsg"></span>' +
      '<div class="cmt-sync-btns">' +
        '<button class="cmt-sync-save-reload" data-i18n="dataSyncSaveReload" style="display:none"></button>' +
        '<button class="cmt-sync-reload" data-i18n="dataSyncReload"></button>' +
        '<button class="cmt-sync-dismiss" data-i18n="dataSyncDismiss"></button>' +
      '</div>';
    document.body.appendChild(syncBanner);
  }

  function _hideSyncBanner() {
    if (!syncBanner) return;
    syncBanner.classList.remove('cmt-sync-show');
    clearTimeout(syncHideTimer);
  }

  window.showDataChangedBanner = function (data, opts) {
    opts = opts || {};
    ensureSyncBanner();

    var source = (data && data.sourceTitle) || '?';
    var pageTitleKeys = {
      'Board': 'app_board_title',
      'Class Management': 'app_classManagement_title',
      'Group Editor': 'app_groupEditor_title',
      'Grade Sheet': 'app_gradeSheet_title',
      'Learning Tools': 'app_learningTools_title',
      'Manage Database': 'app_manageDatabase_title',
      'DB Manager v2': 'app_manageDatabase_title',
      'Learning DB': 'app_manageDatabase_title',
      'Participation Tracker': 'app_participationTracker_title',
      'Launcher': 'app_launcher_title',
      'General Config': 'app_generalConfig_title',
      'File Manager': 'app_fileManager_title',
      'How To': 'btnHeaderHowTo',
      'About': 'btnHeaderAbout',
      'Schedule Maker': 'app_scheduleMaker_title',
      'Class Plan': 'app_classPlan_title',
      'Document Editor': 'app_documentEditor_title',
      'Planner': 'app_planner_title',
      'Import Tool': 'app_importTool_title',
      'Import': 'app_importTool_title',
      'Oral Marking': 'app_oralMarking_title'
    };
    if (pageTitleKeys[source]) {
      var trSource = _syncT(pageTitleKeys[source]);
      if (trSource && trSource !== pageTitleKeys[source]) source = trSource;
    }
    var msg = _syncT('dataSyncMsg').replace('{source}', source);

    syncBanner.querySelector('.cmt-sync-msg').textContent = msg;

    var saveBtn = syncBanner.querySelector('.cmt-sync-save-reload');
    var reloadBtn = syncBanner.querySelector('.cmt-sync-reload');
    var dismissBtn = syncBanner.querySelector('.cmt-sync-dismiss');

    reloadBtn.textContent = _syncT('dataSyncReload');
    dismissBtn.textContent = _syncT('dataSyncDismiss');

    var hasSaveHook = typeof window._cmtSaveBeforeRefresh === 'function';
    if (hasSaveHook) {
      saveBtn.textContent = _syncT('dataSyncSaveReload');
      saveBtn.style.display = '';
    } else {
      saveBtn.style.display = 'none';
    }

    // Remove old listeners by cloning buttons
    var newSaveBtn = saveBtn.cloneNode(true);
    var newReloadBtn = reloadBtn.cloneNode(true);
    var newDismissBtn = dismissBtn.cloneNode(true);
    saveBtn.replaceWith(newSaveBtn);
    reloadBtn.replaceWith(newReloadBtn);
    dismissBtn.replaceWith(newDismissBtn);

    newDismissBtn.addEventListener('click', _hideSyncBanner);

    newReloadBtn.addEventListener('click', function () {
      _hideSyncBanner();
      if (typeof window._cmtHotReload === 'function') {
        Promise.resolve(window._cmtHotReload(data)).catch(function (e) {
          console.warn('[data-sync] Hot-reload failed:', e);
          location.reload();
        });
      } else {
        location.reload();
      }
    });

    if (hasSaveHook) {
      newSaveBtn.addEventListener('click', function () {
        _hideSyncBanner();
        Promise.resolve(window._cmtSaveBeforeRefresh()).then(function () {
          if (typeof window._cmtHotReload === 'function') {
            return Promise.resolve(window._cmtHotReload(data));
          }
          location.reload();
        }).catch(function (e) {
          console.warn('[data-sync] Save-before-refresh failed:', e);
          location.reload();
        });
      });
    }

    clearTimeout(syncHideTimer);
    syncBanner.classList.add('cmt-sync-show');
    // Auto-dismiss after 30s if no action
    syncHideTimer = setTimeout(_hideSyncBanner, 30000);
  };

  // ── Drag-select guard ──────────────────────────────────────────────────────
  // Prevents outside-click dismiss handlers from firing after a text-selection
  // drag that starts inside an editable field and ends outside it.
  // Idempotency flag lets inline guards on pages like board.html skip safely.
  if (!window._cmtDragGuard) {
    window._cmtDragGuard = true;

    function isEditableTarget(el) {
      if (!el || el.nodeType !== 1) return false;
      if (el.closest('[contenteditable="true"]')) return true;
      var ctrl = el.closest('input, textarea, select');
      if (!ctrl) return false;
      if (ctrl.tagName === 'INPUT') {
        var t = String(ctrl.type || 'text').toLowerCase();
        return !['button','checkbox','color','file','hidden','image','radio','range','reset','submit'].includes(t);
      }
      return true;
    }

    function hasEditableSelection() {
      var ae = document.activeElement;
      if (!ae) return false;
      if (ae.matches && ae.matches('input, textarea')) {
        try { return Number(ae.selectionStart) !== Number(ae.selectionEnd); } catch (_) { return false; }
      }
      if (ae.isContentEditable || (ae.closest && ae.closest('[contenteditable="true"]'))) {
        var sel = window.getSelection ? window.getSelection() : null;
        return !!(sel && sel.rangeCount && !sel.isCollapsed);
      }
      return false;
    }

    var _downInEditable = false;
    var _dragStartX = 0;
    var _dragStartY = 0;
    var _dragged = false;
    var _suppressNextOutsideClick = false;

    document.addEventListener('mousedown', function (e) {
      _downInEditable = isEditableTarget(e.target);
      _dragStartX = e.clientX; _dragStartY = e.clientY;
      _dragged = false;
    }, true);

    document.addEventListener('mousemove', function (e) {
      if (!_downInEditable || _dragged) return;
      if (Math.abs(e.clientX - _dragStartX) > 3 || Math.abs(e.clientY - _dragStartY) > 3) _dragged = true;
    }, true);

    document.addEventListener('mouseup', function () {
      if (!_downInEditable) return;
      if (_dragged || hasEditableSelection()) _suppressNextOutsideClick = true;
      _downInEditable = false; _dragged = false;
    }, true);

    document.addEventListener('click', function (e) {
      if (!_suppressNextOutsideClick) return;
      _suppressNextOutsideClick = false;
      if (isEditableTarget(e.target)) return;
      e.stopImmediatePropagation();
      e.stopPropagation();
    }, true);
  }

  // ── Export destination modal ("to-print" vs "custom") ─────────────────────
  var destinationOverlay = null;
  var _destinationResolver = null;

  function ensureDestinationOverlay() {
    if (destinationOverlay) return;
    destinationOverlay = document.createElement('div');
    destinationOverlay.className = 'cmt-overlay';
    destinationOverlay.innerHTML =
      '<div class="cmt-dialog-box" style="text-align: left; max-width: 440px; padding: 24px 22px 18px; border: 2.5px solid #000; box-shadow: 4px 4px 0 #000; border-radius: 8px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<img src="../assets/icons/folder.svg" style="width:20px;height:20px;" alt="">' +
            '<h3 class="cmt-dest-title" style="margin: 0; font-size: 1.12rem; font-weight: 800; font-family: inherit; color: #111;">Choose Export Location</h3>' +
          '</div>' +
          '<button type="button" class="cmt-dest-close-x" style="background:none;border:none;font-size:1.3rem;font-weight:700;cursor:pointer;line-height:1;padding:2px 6px;color:#444;">&times;</button>' +
        '</div>' +
        '<p class="cmt-dest-prompt" style="margin: 0 0 16px; font-size: .86rem; line-height: 1.45; color: #555; font-family: inherit;">Where do you want to save the exported file?</p>' +
        '<div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">' +
          '<button type="button" class="cmt-btn-dest-print" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#fff;border:2px solid #000;box-shadow:3px 3px 0 #000;border-radius:6px;cursor:pointer;text-align:left;transition:transform .08s,box-shadow .08s,background .12s;outline:none;font-family:inherit;">' +
            '<div style="width:36px;height:36px;border:1.5px solid #000;border-radius:4px;background:#fde047;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
              '<img src="../assets/icons/printer.svg" style="width:20px;height:20px;" alt="">' +
            '</div>' +
            '<div style="flex:1;">' +
              '<div class="cmt-dest-print-title" style="font-size:0.92rem;font-weight:800;color:#000;">Print Folder (user/to-print)</div>' +
              '<div class="cmt-dest-print-desc" style="font-size:0.75rem;color:#555;font-weight:600;margin-top:2px;">Direct save into the local print folder without browsing</div>' +
            '</div>' +
          '</button>' +
          '<button type="button" class="cmt-btn-dest-custom" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#fff;border:2px solid #000;box-shadow:3px 3px 0 #000;border-radius:6px;cursor:pointer;text-align:left;transition:transform .08s,box-shadow .08s,background .12s;outline:none;font-family:inherit;">' +
            '<div style="width:36px;height:36px;border:1.5px solid #000;border-radius:4px;background:#93c5fd;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
              '<img src="../assets/icons/folder.svg" style="width:20px;height:20px;" alt="">' +
            '</div>' +
            '<div style="flex:1;">' +
              '<div class="cmt-dest-custom-title" style="font-size:0.92rem;font-weight:800;color:#000;">Choose Other Folder (File Picker)</div>' +
              '<div class="cmt-dest-custom-desc" style="font-size:0.75rem;color:#555;font-weight:600;margin-top:2px;">Select any folder or drive on your computer using the system dialog</div>' +
            '</div>' +
          '</button>' +
        '</div>' +
        '<div style="display:flex;justify-content:flex-end;">' +
          '<button type="button" class="cmt-btn-dest-cancel" style="padding:6px 16px;border:1.5px solid #000;border-radius:6px;background:#fff;font-weight:700;font-size:0.84rem;cursor:pointer;font-family:inherit;">Cancel</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(destinationOverlay);

    var btnPrint = destinationOverlay.querySelector('.cmt-btn-dest-print');
    var btnCustom = destinationOverlay.querySelector('.cmt-btn-dest-custom');
    var btnCancel = destinationOverlay.querySelector('.cmt-btn-dest-cancel');
    var btnCloseX = destinationOverlay.querySelector('.cmt-dest-close-x');

    function closeWith(res) {
      destinationOverlay.classList.remove('open');
      if (_destinationResolver) {
        var fn = _destinationResolver;
        _destinationResolver = null;
        fn(res);
      }
    }

    btnPrint.addEventListener('click', function () { closeWith('to-print'); });
    btnCustom.addEventListener('click', function () { closeWith('custom'); });
    btnCancel.addEventListener('click', function () { closeWith(null); });
    btnCloseX.addEventListener('click', function () { closeWith(null); });

    [btnPrint, btnCustom].forEach(function (btn) {
      btn.addEventListener('mouseenter', function () { btn.style.background = '#f9fafb'; });
      btn.addEventListener('mouseleave', function () { btn.style.background = '#fff'; });
      btn.addEventListener('mousedown', function () { btn.style.transform = 'translate(1px, 1px)'; btn.style.boxShadow = '2px 2px 0 #000'; });
      btn.addEventListener('mouseup', function () { btn.style.transform = 'none'; btn.style.boxShadow = '3px 3px 0 #000'; });
    });

    destinationOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeWith(null); }
    });
  }

  function _promptExportDestination(options) {
    if (!window.Desktop || !Desktop.isElectron()) {
      return Promise.resolve('browser');
    }
    ensureDestinationOverlay();
    var opts = options || {};
    destinationOverlay.querySelector('.cmt-dest-title').textContent = opts.title || _getExportText('exportDestinationTitle', 'Choose Export Location');
    destinationOverlay.querySelector('.cmt-dest-prompt').textContent = opts.prompt || _getExportText('exportDestinationPrompt', 'Where do you want to save the exported file?');
    destinationOverlay.querySelector('.cmt-dest-print-title').textContent = _getExportText('exportToPrintFolder', 'Print Folder (user/to-print)');
    destinationOverlay.querySelector('.cmt-dest-print-desc').textContent = _getExportText('exportToPrintDesc', 'Direct save into the local print folder without browsing');
    destinationOverlay.querySelector('.cmt-dest-custom-title').textContent = _getExportText('exportCustomLocation', 'Choose Other Folder (File Picker)');
    destinationOverlay.querySelector('.cmt-dest-custom-desc').textContent = _getExportText('exportCustomDesc', 'Select any folder or drive on your computer using the system dialog');
    destinationOverlay.querySelector('.cmt-btn-dest-cancel').textContent = _getExportText('btnCancel', 'Cancel');

    return new Promise(function (resolve) {
      if (_destinationResolver) {
        var old = _destinationResolver;
        _destinationResolver = null;
        old(null);
      }
      _destinationResolver = resolve;
      destinationOverlay.classList.add('open');
    });
  }

  async function _saveExportWithDestination(config) {
    if (!config) return { ok: false, canceled: true };
    var filename = config.filename || 'export';
    var content = config.content;
    var dest = config.destination;

    if (!dest) {
      dest = await _promptExportDestination({
        title: config.modalTitle,
        prompt: config.modalPrompt
      });
      if (!dest) return { ok: false, canceled: true };
    }

    if (dest === 'browser' || !window.Desktop || !Desktop.isElectron()) {
      try {
        var blob = content instanceof Blob
          ? content
          : new Blob([content], { type: config.mimeType || 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 200);
        return { ok: true, path: filename, name: filename };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }

    var result = null;
    try {
      if (dest === 'to-print') {
        if (config.docxRequest) {
          var req = Object.assign({}, config.docxRequest, { target: 'toPrint', defaultName: filename.replace(/\.docx$/i, '') });
          result = await Desktop.exportDocx(req);
        } else if (typeof content === 'string') {
          result = await Desktop.saveText('toPrint', filename, content);
        } else if (content instanceof Blob) {
          result = await Desktop.saveBlob('toPrint', filename, content);
        } else if (content instanceof ArrayBuffer || (content && content.buffer instanceof ArrayBuffer)) {
          var bytes = content instanceof Uint8Array ? content : new Uint8Array(content);
          var blob2 = new Blob([bytes], { type: config.mimeType || 'application/octet-stream' });
          result = await Desktop.saveBlob('toPrint', filename, blob2);
        } else {
          result = await Desktop.saveText('toPrint', filename, String(content || ''));
        }

        if (result && typeof result.file === 'string' && result.file) {
          result.path = result.file;
        } else if (result && result.file && result.file.path) {
          result.path = result.file.path;
        }
        if (result && !result.name) result.name = filename;
      } else {
        if (config.docxRequest) {
          result = await Desktop.exportDocx(config.docxRequest);
        } else {
          var saveContent = content;
          var encoding = config.encoding || 'utf8';
          if (content instanceof Blob) {
            var ab = await content.arrayBuffer();
            var b = new Uint8Array(ab);
            var bin = '';
            for (var j = 0; j < b.length; j += 8192) {
              bin += String.fromCharCode.apply(null, b.subarray(j, Math.min(j + 8192, b.length)));
            }
            saveContent = btoa(bin);
            encoding = 'base64';
          } else if (content instanceof ArrayBuffer || (content && content.buffer instanceof ArrayBuffer)) {
            var b2 = content instanceof Uint8Array ? content : new Uint8Array(content);
            var bin2 = '';
            for (var k = 0; k < b2.length; k += 8192) {
              bin2 += String.fromCharCode.apply(null, b2.subarray(k, Math.min(k + 8192, b2.length)));
            }
            saveContent = btoa(bin2);
            encoding = 'base64';
          }
          result = await Desktop.saveToDisk({
            title: config.title || ('Save ' + filename),
            defaultPath: filename,
            filters: config.filters || [{ name: 'All Files', extensions: ['*'] }],
            content: saveContent,
            encoding: encoding
          });
        }
      }

      if (result && result.ok) {
        if (config.showSuccessPopup !== false && result.path) {
          _showExportSuccessPopup(result.path, result.name || filename);
        }
      } else if (result && !result.ok && !result.canceled) {
        if (typeof showToast === 'function') {
          showToast('Could not save file: ' + (result.error || 'unknown error'), true);
        }
      }
      return result;
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('Export failed: ' + err.message, true);
      }
      return { ok: false, error: err.message };
    }
  }

  // ── Export success modal ───────────────────────────────────────────────────
  var exportOverlay = null;

  function ensureExportOverlay() {
    if (exportOverlay) return;
    exportOverlay = document.createElement('div');
    exportOverlay.className = 'cmt-overlay';
    exportOverlay.innerHTML =
      '<div class="cmt-dialog-box" style="text-align: center; max-width: 420px; padding: 28px 24px 20px; border: 2.5px solid #000; box-shadow: 4px 4px 0 #000; border-radius: 8px;">' +
        '<div style="font-size: 2.2rem; margin-bottom: 12px; line-height: 1;">🎉</div>' +
        '<h3 class="cmt-export-title" style="margin: 0 0 10px; font-size: 1.15rem; font-weight: 800; font-family: inherit; color: #111;">Export Complete</h3>' +
        '<p class="cmt-export-msg" style="margin: 0 0 22px; font-size: .88rem; line-height: 1.5; color: #555; word-break: break-all; font-family: inherit; font-weight: 500;"></p>' +
        '<div class="cmt-dialog-btns" style="display: flex; flex-direction: column; gap: 8px; align-items: stretch; justify-content: center; width: 100%;">' +
          '<button class="cmt-btn-open-file" style="padding: 10px 18px; border-radius: 6px; border: 2px solid #000; font-size: .85rem; font-weight: 700; cursor: pointer; background: #000; color: #fff; box-shadow: 2px 2px 0 #000; transition: background .12s, transform .08s, box-shadow .08s; outline: none; font-family: inherit;">Open File</button>' +
          '<button class="cmt-btn-open-doc-editor" style="display: none; padding: 10px 18px; border-radius: 6px; border: 2px solid #000; font-size: .85rem; font-weight: 700; cursor: pointer; background: #fef08a; color: #000; box-shadow: 2px 2px 0 #000; transition: background .12s, transform .08s, box-shadow .08s; outline: none; font-family: inherit;">Open with Document Editor</button>' +
          '<button class="cmt-btn-show-in-folder" style="padding: 10px 18px; border-radius: 6px; border: 2px solid #000; font-size: .85rem; font-weight: 700; cursor: pointer; background: #fff; color: #000; box-shadow: 2px 2px 0 #000; transition: background .12s, transform .08s, box-shadow .08s; outline: none; font-family: inherit;">Open Folder</button>' +
          '<button class="cmt-btn-close-export" style="padding: 6px 18px; border-radius: 6px; border: none; font-size: .82rem; font-weight: 600; cursor: pointer; background: transparent; color: #777; transition: color .12s; margin-top: 4px; outline: none; font-family: inherit;">Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(exportOverlay);

    // Key event listener for dialog
    exportOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeExportOverlay(); }
      if (e.key === 'Enter') {
        e.preventDefault();
        var primaryBtn = exportOverlay.querySelector('.cmt-btn-open-file');
        if (primaryBtn && primaryBtn.style.display !== 'none') primaryBtn.click();
        else {
          var folderBtn = exportOverlay.querySelector('.cmt-btn-show-in-folder');
          if (folderBtn) folderBtn.click();
        }
      }
    });
  }

  function closeExportOverlay() {
    if (!exportOverlay) return;
    exportOverlay.classList.remove('open');
  }

  function _showExportSuccessPopup(filePath, fileName, isFolder) {
    if (!window.Desktop || !Desktop.isElectron()) {
      // Browsers do standard downloads, so bypass
      return;
    }
    ensureExportOverlay();

    var name = fileName || filePath.split(/[\\/]/).pop();
    var titleText = _getExportText('exportSuccessTitle', 'Export Complete');
    var defaultMsg = '"{name}" has been successfully exported.';
    if (isFolder) {
      defaultMsg = 'Folder "{name}" has been successfully exported.';
    }
    var msgText = _getExportText(isFolder ? 'exportSuccessMessageFolder' : 'exportSuccessMessage', defaultMsg).replace('{name}', name);

    exportOverlay.querySelector('.cmt-export-title').textContent = titleText;
    exportOverlay.querySelector('.cmt-export-msg').textContent = msgText;

    var openBtn = exportOverlay.querySelector('.cmt-btn-open-file');
    var docEditorBtn = exportOverlay.querySelector('.cmt-btn-open-doc-editor');
    var showBtn = exportOverlay.querySelector('.cmt-btn-show-in-folder');
    var closeBtn = exportOverlay.querySelector('.cmt-btn-close-export');

    var ext = String(filePath || '').split('?')[0].split('.').pop().toLowerCase();
    var isDoc = !isFolder && (ext === 'md' || ext === 'html' || ext === 'typ');

    if (isFolder) {
      openBtn.style.display = 'none';
      docEditorBtn.style.display = 'none';
      showBtn.style.display = 'block';
      showBtn.textContent = _getExportText('exportOpenFolderBtn', 'Open Folder');
    } else {
      openBtn.style.display = 'block';
      openBtn.textContent = _getExportText('exportOpenBtn', 'Open File');
      showBtn.style.display = 'block';
      showBtn.textContent = _getExportText('exportOpenFolderBtn', 'Open Folder');

      if (isDoc) {
        docEditorBtn.style.display = 'block';
        docEditorBtn.textContent = _getExportText('exportOpenWithDocEditorBtn', 'Open with Document Editor');
      } else {
        docEditorBtn.style.display = 'none';
      }
    }
    closeBtn.textContent = _getExportText('exportCloseBtn', 'Close');

    // Clone nodes to easily clean up previous listeners
    var newOpenBtn = openBtn.cloneNode(true);
    var newDocEditorBtn = docEditorBtn.cloneNode(true);
    var newShowBtn = showBtn.cloneNode(true);
    var newCloseBtn = closeBtn.cloneNode(true);
    openBtn.replaceWith(newOpenBtn);
    docEditorBtn.replaceWith(newDocEditorBtn);
    showBtn.replaceWith(newShowBtn);
    closeBtn.replaceWith(newCloseBtn);

    // Rebind styles/hovers on cloned nodes
    newOpenBtn.addEventListener('mouseenter', function () { newOpenBtn.style.background = '#222'; });
    newOpenBtn.addEventListener('mouseleave', function () { newOpenBtn.style.background = '#000'; });
    newOpenBtn.addEventListener('mousedown', function () { newOpenBtn.style.transform = 'translate(1px, 1px)'; newOpenBtn.style.boxShadow = '1px 1px 0 #000'; });
    newOpenBtn.addEventListener('mouseup', function () { newOpenBtn.style.transform = 'none'; newOpenBtn.style.boxShadow = '2px 2px 0 #000'; });

    newDocEditorBtn.addEventListener('mouseenter', function () { newDocEditorBtn.style.background = '#fde047'; });
    newDocEditorBtn.addEventListener('mouseleave', function () { newDocEditorBtn.style.background = '#fef08a'; });
    newDocEditorBtn.addEventListener('mousedown', function () { newDocEditorBtn.style.transform = 'translate(1px, 1px)'; newDocEditorBtn.style.boxShadow = '1px 1px 0 #000'; });
    newDocEditorBtn.addEventListener('mouseup', function () { newDocEditorBtn.style.transform = 'none'; newDocEditorBtn.style.boxShadow = '2px 2px 0 #000'; });

    newShowBtn.addEventListener('mouseenter', function () { newShowBtn.style.background = '#f3f4f6'; });
    newShowBtn.addEventListener('mouseleave', function () { newShowBtn.style.background = '#fff'; });
    newShowBtn.addEventListener('mousedown', function () { newShowBtn.style.transform = 'translate(1px, 1px)'; newShowBtn.style.boxShadow = '1px 1px 0 #000'; });
    newShowBtn.addEventListener('mouseup', function () { newShowBtn.style.transform = 'none'; newShowBtn.style.boxShadow = '2px 2px 0 #000'; });

    newCloseBtn.addEventListener('mouseenter', function () { newCloseBtn.style.color = '#111'; });
    newCloseBtn.addEventListener('mouseleave', function () { newCloseBtn.style.color = '#777'; });

    newCloseBtn.addEventListener('click', closeExportOverlay);

    newOpenBtn.addEventListener('click', function () {
      closeExportOverlay();
      Desktop.openNative({ absolutePath: filePath }).catch(function (err) {
        var errMsg = err && err.message ? err.message : String(err);
        if (typeof window.showToast === 'function') {
          showToast('Could not open: ' + errMsg, true);
        } else if (typeof window.mdbToast === 'function') {
          mdbToast('⚠️ Could not open: ' + errMsg);
        } else {
          alert('Could not open: ' + errMsg);
        }
      });
    });

    newDocEditorBtn.addEventListener('click', function () {
      closeExportOverlay();
      if (window.Desktop && typeof Desktop.openTool === 'function') {
        Desktop.openTool('document-editor.html', { query: { editAbsPath: filePath } });
      }
    });

    newShowBtn.addEventListener('click', function () {
      closeExportOverlay();
      Desktop.showInFolder({ absolutePath: filePath });
    });

    exportOverlay.classList.add('open');
    setTimeout(function () {
      if (isDoc) {
        newDocEditorBtn.focus();
      } else if (!isFolder && newOpenBtn.style.display !== 'none') {
        newOpenBtn.focus();
      } else {
        newShowBtn.focus();
      }
    }, 50);
  }

  function _getExportText(key, defaultVal) {
    var lang = 'en';
    try {
      var cfg = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
      if (cfg.language) lang = cfg.language;
      var page = (location.pathname.split('/').pop() || '').replace('.html', '') || 'launcher';
      var override = localStorage.getItem('cmt-lang-' + page);
      if (override) lang = override;
    } catch (e) {}

    var map = {
      en: {
        exportSuccessTitle: 'Export Complete',
        exportSuccessMessage: '"{name}" has been successfully exported.',
        exportSuccessMessageFolder: 'Folder "{name}" has been successfully exported.',
        exportOpenBtn: 'Open File',
        exportOpenWithDocEditorBtn: 'Open with Document Editor',
        exportOpenFolderBtn: 'Open Folder',
        exportShowInFolderBtn: 'Show in Folder',
        exportCloseBtn: 'Close',
        exportDestinationTitle: 'Choose Export Location',
        exportDestinationPrompt: 'Where do you want to save the exported file?',
        exportToPrintFolder: 'Print Folder (user/to-print)',
        exportToPrintDesc: 'Direct save into the local print folder without browsing',
        exportCustomLocation: 'Choose Other Folder (File Picker)',
        exportCustomDesc: 'Select any folder or drive on your computer using the system dialog',
        btnCancel: 'Cancel'
      },
      fr: {
        exportSuccessTitle: 'Exportation Terminée',
        exportSuccessMessage: '"{name}" a été exporté avec succès.',
        exportSuccessMessageFolder: 'Le dossier "{name}" a été exporté avec succès.',
        exportOpenBtn: 'Ouvrir le fichier',
        exportOpenWithDocEditorBtn: "Ouvrir dans l'éditeur de documents",
        exportOpenFolderBtn: 'Ouvrir le dossier',
        exportShowInFolderBtn: 'Afficher dans le dossier',
        exportCloseBtn: 'Fermer',
        exportDestinationTitle: "Choisir l'emplacement d'exportation",
        exportDestinationPrompt: 'Où souhaitez-vous enregistrer le fichier exporté ?',
        exportToPrintFolder: "Dossier d'impression (user/to-print)",
        exportToPrintDesc: "Enregistrement direct dans le dossier d'impression local sans navigation",
        exportCustomLocation: 'Choisir un autre dossier (Sélecteur de fichiers)',
        exportCustomDesc: 'Sélectionnez n\'importe quel dossier ou disque sur votre ordinateur à l\'aide de la boîte de dialogue système',
        btnCancel: 'Annuler'
      },
      de: {
        exportSuccessTitle: 'Export abgeschlossen',
        exportSuccessMessage: '"{name}" wurde erfolgreich exportiert.',
        exportSuccessMessageFolder: 'Der Ordner "{name}" wurde erfolgreich exportiert.',
        exportOpenBtn: 'Datei öffnen',
        exportOpenWithDocEditorBtn: 'Im Dokument-Editor öffnen',
        exportOpenFolderBtn: 'Ordner öffnen',
        exportShowInFolderBtn: 'Im Ordner anzeigen',
        exportCloseBtn: 'Schließen',
        exportDestinationTitle: 'Speicherort auswählen',
        exportDestinationPrompt: 'Wo möchten Sie die exportierte Datei speichern?',
        exportToPrintFolder: 'Druckordner (user/to-print)',
        exportToPrintDesc: 'Direktes Speichern im lokalen Druckordner ohne Auswahldialog',
        exportCustomLocation: 'Anderen Ordner wählen (Dateiauswahl)',
        exportCustomDesc: 'Wählen Sie einen beliebigen Ordner oder ein Laufwerk über den Systemdialog aus',
        btnCancel: 'Abbrechen'
      },
      it: {
        exportSuccessTitle: 'Esportazione Completata',
        exportSuccessMessage: '"{name}" è stato esportato con successo.',
        exportSuccessMessageFolder: 'La cartella "{name}" è stata esportata con successo.',
        exportOpenBtn: 'Apri file',
        exportOpenWithDocEditorBtn: "Apri nell'editor de documenti",
        exportOpenFolderBtn: 'Apri cartella',
        exportShowInFolderBtn: 'Mostra nella cartella',
        exportCloseBtn: 'Chiudi',
        exportDestinationTitle: 'Scegli percorso di esportazione',
        exportDestinationPrompt: 'Dove desideri salvare il file esportato?',
        exportToPrintFolder: 'Cartella di stampa (user/to-print)',
        exportToPrintDesc: 'Salvataggio diretto nella cartella di stampa locale senza sfogliare',
        exportCustomLocation: 'Scegli altra cartella (File Picker)',
        exportCustomDesc: 'Seleziona qualsiasi cartella o unità sul computer utilizzando la finestra di dialogo del sistema',
        btnCancel: 'Annulla'
      }
    };
    var lm = map[lang] || map.en;
    if (window.i18n && typeof window.i18n.t === 'function') {
      try {
        var r = window.i18n.t(key);
        if (r && r !== key) return r;
      } catch (e) {}
    }
    if (typeof window.t === 'function') {
      try {
        var res = window.t(key);
        if (res && res !== key) return res;
      } catch (e) {}
    }
    return lm[key] || defaultVal;
  }

  async function checkPreviousSessionCrash() {
    try {
      if (!window.electronApi || typeof window.electronApi.getLatestCrashDump !== 'function') return;
      const res = await window.electronApi.getLatestCrashDump();
      if (res && res.ok && res.dump) {
        const dump = res.dump;
        const dumpTime = new Date(dump.timestamp).getTime();
        const lastDismissed = Number(localStorage.getItem('cmt_last_dismissed_crash') || 0);
        if (dumpTime > lastDismissed) {
          const msg = `Notice: A crash or memory warning was recorded on ${new Date(dump.timestamp).toLocaleString()} (${dump.crashType}).`;
          if (typeof showToast === 'function') {
            showToast(msg, true);
          }
          localStorage.setItem('cmt_last_dismissed_crash', String(dumpTime));
        }
      }
    } catch (e) {}
  }

  async function checkScheduledBackupPrompt() {
    try {
      if (!window.electronApi || typeof window.electronApi.checkScheduledBackup !== 'function') return;
      if (sessionStorage.getItem('cmt_scheduled_backup_prompted') === 'true') return;

      const res = await window.electronApi.checkScheduledBackup();
      if (res && res.ok && res.due) {
        sessionStorage.setItem('cmt_scheduled_backup_prompted', 'true');

        let daysText = res.daysElapsed || res.intervalDays || 7;
        let msg = '';
        if (typeof window.t === 'function') {
          msg = window.t('scheduledBackupPromptMsg');
        }
        if (!msg || msg === 'scheduledBackupPromptMsg') {
          msg = `A scheduled backup has not been created in over ${daysText} day(s). Would you like to create a backup ZIP archive now?`;
        } else {
          msg = msg.replace('{days}', daysText);
        }

        const confirmed = await window.showConfirm(msg);
        if (confirmed) {
          if (typeof showToast === 'function') {
            showToast(typeof window.t === 'function' ? window.t('gcBackingUp') : 'Backing up...', 3000);
          }
          const backupRes = await window.electronApi.runBackup({ format: 'zip' });
          if (backupRes && backupRes.ok) {
            const successMsg = typeof window.t === 'function' ? window.t('scheduledBackupSuccessToast') : 'Scheduled ZIP backup successfully created!';
            if (typeof showToast === 'function') {
              showToast(successMsg, 4000);
            }
          } else {
            const errText = (backupRes && backupRes.error) || (typeof window.t === 'function' ? window.t('gcBackupFailed') : 'Backup failed');
            if (typeof showToast === 'function') {
              showToast(errText, true);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to check scheduled backup:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(checkPreviousSessionCrash, 2000);
      setTimeout(checkScheduledBackupPrompt, 1200);
    });
  } else {
    setTimeout(checkPreviousSessionCrash, 2000);
    setTimeout(checkScheduledBackupPrompt, 1200);
  }

  window.checkPreviousSessionCrash = checkPreviousSessionCrash;
  window.checkScheduledBackupPrompt = checkScheduledBackupPrompt;
  window.showExportSuccessPopup = _showExportSuccessPopup;
  window.promptExportDestination = _promptExportDestination;
  window.saveExportWithDestination = _saveExportWithDestination;
})();
