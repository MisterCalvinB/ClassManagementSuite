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
      'z-index:999999;pointer-events:none;',
      'opacity:0;transition:transform .25s,opacity .25s;',
      'max-width:80vw;text-align:center;white-space:pre-wrap;',
    '}',
    '#cmt-toast.show{transform:translateX(-50%) translateY(0);opacity:1;}',
    '#cmt-toast.error{background:#c00;}',
    '.cmt-overlay{',
      'display:none;position:fixed;inset:0;',
      'background:rgba(0,0,0,.45);',
      'z-index:999998;align-items:center;justify-content:center;',
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
    '}',
    '.cmt-dialog-btns{display:flex;gap:10px;justify-content:flex-end;}',
    '.cmt-btn-cancel,.cmt-btn-ok{',
      'padding:6px 18px;border-radius:6px;border:1.5px solid #000;',
      'font-size:.85rem;font-weight:700;cursor:pointer;',
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
    '}',
    '#cmt-sync-banner.cmt-sync-show{top:0;}',
    '#cmt-sync-banner .cmt-sync-icon{font-size:.95rem;flex-shrink:0;}',
    '#cmt-sync-banner .cmt-sync-msg{flex:1;overflow:hidden;text-overflow:ellipsis;}',
    '#cmt-sync-banner .cmt-sync-btns{display:flex;gap:6px;flex-shrink:0;}',
    '#cmt-sync-banner button{',
      'padding:4px 10px;border-radius:5px;border:1px solid #4a6fa5;',
      'font-size:.78rem;font-weight:700;cursor:pointer;background:#253450;color:#e8e8f0;',
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

  window.showToast = function (msg, isError) {
    ensureToast();
    toastEl.textContent = msg;
    toastEl.classList.toggle('error', !!isError);
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2500);
  };

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

  // ── i18n ─────────────────────────────────────────────────────────────────
  var _LABELS = {
    en: { ok: 'OK', cancel: 'Cancel' },
    fr: { ok: 'OK', cancel: 'Annuler' },
    de: { ok: 'OK', cancel: 'Abbrechen' },
    it: { ok: 'OK', cancel: 'Annulla' }
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
    if (typeof window.t === 'function') {
      try { return window.t(key) || lm[key] || key; } catch (e) {}
    }
    return lm[key] || key;
  }

  function ensureSyncBanner() {
    if (syncBanner) return;
    syncBanner = document.createElement('div');
    syncBanner.id = 'cmt-sync-banner';
    syncBanner.innerHTML =
      '<span class="cmt-sync-icon">🔄</span>' +
      '<span class="cmt-sync-msg"></span>' +
      '<div class="cmt-sync-btns">' +
        '<button class="cmt-sync-save-reload" style="display:none"></button>' +
        '<button class="cmt-sync-reload"></button>' +
        '<button class="cmt-sync-dismiss"></button>' +
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
})();
