// Shared dialog utilities — toast, confirm modal, prompt modal, data-sync banner.
// Include this script in any page to get showToast(), showConfirm(), showPrompt(), showDataChangedBanner().
(function () {
  'use strict';

  // ── Injected CSS ───────────────────────────────────────────────────────────
  var _dlgIconPrefix = (typeof location !== 'undefined' && /\/pages\//.test(location.pathname)) ? '../assets/icons/' : 'assets/icons/';
  var style = document.createElement('style');
  style.textContent = [
    '#cmt-toast{',
    'position:fixed;bottom:18px;left:50%;',
    'transform:translateX(-50%) translateY(60px);',
    'background:var(--neo-dark,#222222);color:#ffffff;',
    'border:2px solid var(--neo-border-color,#333333);',
    'box-shadow:var(--neo-shadow-md,3px 3px 0 #555555);',
    'padding:8px 20px;border-radius:var(--neo-radius-md,6px);',
    'font-size:.84rem;font-weight:700;',
    'z-index:10000002;pointer-events:none;',
    'opacity:0;transition:transform .2s ease,opacity .2s ease;',
    'max-width:min(88vw,540px);text-align:center;white-space:pre-wrap;',
    'user-select:none;-webkit-user-select:none;',
    '}',
    '#cmt-toast.show{transform:translateX(-50%) translateY(0);opacity:1;}',
    '#cmt-toast.error{background:var(--neo-red,#c96b6b);color:#ffffff;}',
    '.cmt-overlay{',
    'display:none;position:fixed;inset:0;padding:12px;',
    'background:rgba(20,20,20,.45);',
    'z-index:10000000;align-items:center;justify-content:center;',
    'box-sizing:border-box;',
    'user-select:none;-webkit-user-select:none;',
    '}',
    '.cmt-overlay.open{display:flex;}',
    '.cmt-dialog-box{',
    'background:var(--neo-card-bg,#ffffff);color:var(--neo-dark,#222222);',
    'border:2px solid var(--neo-border-color,#333333);',
    'border-radius:var(--neo-radius-lg,10px);',
    'box-shadow:6px 6px 0 var(--neo-dark,#222222);',
    'padding:20px 22px 18px;width:100%;max-width:min(440px,calc(100vw - 24px));',
    'max-height:calc(100dvh - 24px);overflow-y:auto;overscroll-behavior:contain;',
    'box-sizing:border-box;',
    '}',
    '.cmt-dialog-msg{',
    'margin:0 0 14px;font-size:.92rem;font-weight:600;',
    'white-space:pre-wrap;line-height:1.45;',
    '}',
    '.cmt-dialog-input{',
    'width:100%;box-sizing:border-box;',
    'border:2px solid var(--neo-border-color,#333333);',
    'border-radius:var(--neo-radius-md,6px);',
    'background:#ffffff;color:var(--neo-dark,#222222);',
    'padding:7px 11px;font-family:inherit;font-size:.9rem;margin-bottom:14px;',
    'user-select:text;-webkit-user-select:text;',
    'transition:border-color .12s ease,box-shadow .12s ease;',
    '}',
    '.cmt-dialog-input:focus{outline:none;border-color:var(--neo-dark,#222222);box-shadow:0 0 0 2px var(--neo-yellow,#e2c96e);}',
    '.cmt-dialog-btns{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;user-select:none;-webkit-user-select:none;}',
    '.cmt-btn-cancel,.cmt-btn-ok{',
    'font-family:inherit;padding:7px 16px;',
    'border-radius:var(--neo-radius-md,6px);',
    'border:2px solid var(--neo-border-color,#333333);',
    'box-shadow:var(--neo-shadow-sm,2px 2px 0 #888888);',
    'font-size:.85rem;font-weight:700;cursor:pointer;',
    'user-select:none;-webkit-user-select:none;',
    'transition:transform .12s ease,box-shadow .12s ease,background-color .12s ease;',
    '}',
    '.cmt-btn-cancel{background:var(--neo-card-bg,#ffffff);color:var(--neo-dark,#222222);}',
    '.cmt-btn-cancel:hover{background:var(--neo-bg,#f5f5f0);transform:translate(-1px,-1px);box-shadow:var(--neo-shadow-md,3px 3px 0 #555555);}',
    '.cmt-btn-ok{background:var(--neo-yellow,#e2c96e);color:#111111;}',
    '.cmt-btn-ok:hover{background:#ebd47c;transform:translate(-1px,-1px);box-shadow:var(--neo-shadow-md,3px 3px 0 #555555);}',
    // Data-sync banner
    '#cmt-sync-banner{',
    'position:fixed;top:-90px;left:50%;transform:translateX(-50%);',
    'background:var(--neo-dark,#222222);color:#ffffff;',
    'border:2px solid var(--neo-border-color,#333333);border-top:none;border-radius:0 0 10px 10px;',
    'box-shadow:var(--neo-shadow-lg,4px 4px 0 #555555);',
    'padding:10px 16px 10px 14px;',
    'display:flex;align-items:center;gap:10px;flex-wrap:wrap;',
    'font-size:.82rem;z-index:999997;',
    'transition:top .3s cubic-bezier(.22,1,.36,1);',
    'max-width:min(92vw,720px);',
    'user-select:none;-webkit-user-select:none;',
    '}',
    '#cmt-sync-banner.cmt-sync-show{top:0;}',
    '#cmt-sync-banner .cmt-sync-icon{font-size:.95rem;flex-shrink:0;}',
    '#cmt-sync-banner .cmt-sync-msg{flex:1;overflow:hidden;text-overflow:ellipsis;}',
    '#cmt-sync-banner .cmt-sync-btns{display:flex;gap:6px;flex-shrink:0;}',
    '#cmt-sync-banner button{',
    'padding:4px 10px;border-radius:var(--neo-radius-sm,4px);border:1.5px solid var(--neo-blue,#5b8fcc);',
    'font-family:inherit;font-size:.78rem;font-weight:700;cursor:pointer;background:var(--neo-blue,#5b8fcc);color:#ffffff;',
    'user-select:none;-webkit-user-select:none;',
    '}',
    '#cmt-sync-banner button:hover{filter:brightness(1.08);}',
    '#cmt-sync-banner .cmt-sync-dismiss{',
    'background:transparent;border-color:#666666;color:#cccccc;',
    '}',
    '#cmt-sync-banner .cmt-sync-dismiss:hover{background:#333333;color:#ffffff;}',
  ].join('');
  document.head.appendChild(style);

  // ── Universal HTML Escaping Utility ─────────────────────────────────────────
  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  if (typeof window !== 'undefined' && !window.escapeHtml) {
    window.escapeHtml = escapeHtml;
  }

  // ── Universal Modal / Popover Escape Stack Manager ─────────────────────────
  window.cmtEscapeStack = window.cmtEscapeStack || [];

  window.cmtPushEscapeHandler = function (handlerOrOpts) {
    if (!handlerOrOpts) return function () { };
    var entry = typeof handlerOrOpts === 'function' ? { close: handlerOrOpts, el: null } : handlerOrOpts;
    if (typeof entry.close !== 'function') return function () { };

    // Remove any existing duplicate
    window.cmtRemoveEscapeHandler(entry);
    window.cmtEscapeStack.push(entry);

    var removed = false;
    return function unregister() {
      if (removed) return;
      removed = true;
      window.cmtRemoveEscapeHandler(entry);
    };
  };

  window.cmtRemoveEscapeHandler = function (handlerOrOpts) {
    if (!window.cmtEscapeStack || !window.cmtEscapeStack.length) return;
    for (var i = window.cmtEscapeStack.length - 1; i >= 0; i--) {
      var item = window.cmtEscapeStack[i];
      if (item === handlerOrOpts || (item && item.close === handlerOrOpts) || (item && handlerOrOpts && item.el && item.el === handlerOrOpts.el)) {
        window.cmtEscapeStack.splice(i, 1);
        break;
      }
    }
  };

  // Global capture-phase Escape key handler ensures ONLY the topmost modal/popover closes
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    // Process explicit cmtEscapeStack from top (last opened) to bottom
    while (window.cmtEscapeStack && window.cmtEscapeStack.length > 0) {
      var entry = window.cmtEscapeStack.pop();
      if (!entry) continue;

      // If tied to an element, verify element is still attached and visible
      if (entry.el) {
        if (!document.body || !document.body.contains(entry.el)) continue;
        try {
          var cs = window.getComputedStyle(entry.el);
          if (entry.el.classList.contains('hidden') || cs.display === 'none' || cs.visibility === 'hidden') {
            continue;
          }
        } catch (err) { }
      }

      if (typeof entry.close === 'function') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        try {
          entry.close(e);
        } catch (err) {
          console.warn('[EscapeManager] Error closing item:', err);
        }
        return; // Handled topmost item only! Stop all other handlers.
      }
    }
  }, true);

  // ── Unified Modal Lifecycle Controller (CmtModal) ──────────────────────────
  function _resolveModalEl(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.getElementById(target) || document.querySelector(target);
    return target;
  }

  function _getFocusable(root) {
    if (!root) return null;
    return root.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not(.neo-close-btn), [tabindex]:not([tabindex="-1"])')
      || root.querySelector('button:not([disabled])');
  }

  function _bindSafeBackdrop(overlay, onClose) {
    if (!overlay || overlay._cmtSafeBackdropBound) return;
    overlay._cmtSafeBackdropBound = true;
    var downOnOverlay = false;
    overlay.addEventListener('mousedown', function (e) {
      downOnOverlay = (e.target === overlay);
    });
    overlay.addEventListener('click', function (e) {
      if (downOnOverlay && e.target === overlay && overlay._cmtBackdropClose !== false) {
        onClose();
      }
      downOnOverlay = false;
    });
  }

  window.CmtModal = {
    open: function (target, opts) {
      var el = _resolveModalEl(target);
      if (!el) return null;
      opts = opts || {};
      el._cmtPrevFocus = document.activeElement && typeof document.activeElement.focus === 'function' ? document.activeElement : null;
      el._cmtOnClose = typeof opts.onClose === 'function' ? opts.onClose : null;
      el._cmtBackdropClose = opts.backdropClose !== false;
      if (!el.hasAttribute('role')) el.setAttribute('role', 'dialog');
      if (!el.hasAttribute('aria-modal')) el.setAttribute('aria-modal', 'true');
      if (el.style.display === 'none') {
        el._cmtUsedDisplay = true;
        el.style.display = 'flex';
      }
      el.classList.add('open', 'is-open');
      _bindSafeBackdrop(el, function () { window.CmtModal.close(el); });
      if (typeof window.cmtPushEscapeHandler === 'function') {
        el._cmtEscUnreg = window.cmtPushEscapeHandler({
          el: el,
          close: function () { window.CmtModal.close(el); }
        });
      }
      setTimeout(function () {
        var focusTarget = opts.initialFocus ? _resolveModalEl(opts.initialFocus) : _getFocusable(el);
        if (focusTarget && typeof focusTarget.focus === 'function') {
          try { focusTarget.focus(); } catch (_) { }
        }
      }, 20);
      return el;
    },
    close: function (target) {
      var el = _resolveModalEl(target);
      if (!el) return;
      if (el._cmtEscUnreg) {
        try { el._cmtEscUnreg(); } catch (_) { }
        el._cmtEscUnreg = null;
      }
      el.classList.remove('open', 'is-open');
      if (el._cmtUsedDisplay) el.style.display = 'none';
      if (el._cmtPrevFocus && document.body && document.body.contains(el._cmtPrevFocus)) {
        try { el._cmtPrevFocus.focus(); } catch (_) { }
      }
      el._cmtPrevFocus = null;
      if (typeof el._cmtOnClose === 'function') {
        var cb = el._cmtOnClose;
        el._cmtOnClose = null;
        try { cb(el); } catch (_) { }
      }
    },
    toggleMaximize: function (modalOrBtn, btnEl) {
      var modal = _resolveModalEl(modalOrBtn);
      if (!modal) return false;
      if (!modal.classList.contains('neo-modal')) {
        modal = modal.closest('.neo-modal') || modal.querySelector('.neo-modal') || modal;
      }
      var isMax = modal.classList.toggle('is-maximized');
      var btn = btnEl || modal.querySelector('[data-neo-modal-max], .neo-max-btn');
      if (btn) {
        btn.setAttribute('aria-pressed', isMax ? 'true' : 'false');
        var img = btn.querySelector('img');
        if (img) {
          img.src = _dlgIconPrefix + (isMax ? 'minimize.svg' : 'maximize.svg');
        }
      }
      return isMax;
    }
  };

  document.addEventListener('click', function (e) {
    var closeBtn = e.target && typeof e.target.closest === 'function' ? e.target.closest('[data-neo-modal-close]') : null;
    if (closeBtn) {
      var overlay = closeBtn.closest('.neo-modal-overlay, .cmt-overlay, .modal-overlay, .modal-bg');
      if (overlay) window.CmtModal.close(overlay);
      return;
    }
    var maxBtn = e.target && typeof e.target.closest === 'function' ? e.target.closest('[data-neo-modal-max]') : null;
    if (maxBtn) {
      var modalBox = maxBtn.closest('.neo-modal');
      if (modalBox) window.CmtModal.toggleMaximize(modalBox, maxBtn);
    }
  });

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
    confirmOverlay.setAttribute('role', 'dialog');
    confirmOverlay.setAttribute('aria-modal', 'true');
    confirmOverlay.innerHTML =
      '<div class="cmt-dialog-box">' +
      '<p class="cmt-dialog-msg"></p>' +
      '<div class="cmt-dialog-btns">' +
      '<button type="button" class="cmt-btn-cancel">Cancel</button>' +
      '<button type="button" class="cmt-btn-ok">OK</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(confirmOverlay);

    confirmOverlay.querySelector('.cmt-btn-ok').addEventListener('click', function () { resolveConfirm(true); });
    confirmOverlay.querySelector('.cmt-btn-cancel').addEventListener('click', function () { resolveConfirm(false); });
    _bindSafeBackdrop(confirmOverlay, function () { resolveConfirm(false); });
    confirmOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); resolveConfirm(true); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); resolveConfirm(false); }
    });
  }

  var _confirmEscUnreg = null;
  function resolveConfirm(val) {
    if (_confirmEscUnreg) { _confirmEscUnreg(); _confirmEscUnreg = null; }
    if (!confirmOverlay) return;
    confirmOverlay.classList.remove('open');
    if (confirmResolve) { var r = confirmResolve; confirmResolve = null; r(val); }
  }

  function _dlgConfirm(msg) {
    ensureConfirm();
    confirmOverlay.querySelector('.cmt-dialog-msg').textContent = msg;
    applyDialogI18n(confirmOverlay);
    confirmOverlay.classList.add('open');
    if (window.cmtPushEscapeHandler) {
      _confirmEscUnreg = window.cmtPushEscapeHandler({
        el: confirmOverlay,
        close: function () { resolveConfirm(false); }
      });
    }
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
    promptOverlay.setAttribute('role', 'dialog');
    promptOverlay.setAttribute('aria-modal', 'true');
    promptOverlay.innerHTML =
      '<div class="cmt-dialog-box">' +
      '<p class="cmt-dialog-msg"></p>' +
      '<input class="cmt-dialog-input" type="text">' +
      '<div class="cmt-dialog-btns">' +
      '<button type="button" class="cmt-btn-cancel">Cancel</button>' +
      '<button type="button" class="cmt-btn-ok">OK</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(promptOverlay);

    var input = promptOverlay.querySelector('.cmt-dialog-input');
    promptOverlay.querySelector('.cmt-btn-ok').addEventListener('click', function () { resolvePrompt(input.value); });
    promptOverlay.querySelector('.cmt-btn-cancel').addEventListener('click', function () { resolvePrompt(null); });
    _bindSafeBackdrop(promptOverlay, function () { resolvePrompt(null); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); resolvePrompt(input.value); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); resolvePrompt(null); }
    });
  }

  var _promptEscUnreg = null;
  function resolvePrompt(val) {
    if (_promptEscUnreg) { _promptEscUnreg(); _promptEscUnreg = null; }
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
    if (window.cmtPushEscapeHandler) {
      _promptEscUnreg = window.cmtPushEscapeHandler({
        el: promptOverlay,
        close: function () { resolvePrompt(null); }
      });
    }
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
  var _timedConfirmHasCancel = false;

  function ensureTimedConfirm() {
    if (timedConfirmOverlay) return;
    timedConfirmOverlay = document.createElement('div');
    timedConfirmOverlay.className = 'cmt-overlay';
    timedConfirmOverlay.setAttribute('role', 'dialog');
    timedConfirmOverlay.setAttribute('aria-modal', 'true');
    timedConfirmOverlay.innerHTML =
      '<div class="cmt-dialog-box" style="text-align: center; max-width: 440px; padding: 24px 26px 20px;">' +
      '<div style="margin-bottom: 10px; line-height: 1;"><img src="' + _dlgIconPrefix + 'save.svg" class="neo-icon" alt="" style="width: 28px; height: 28px;" /></div>' +
      '<h3 class="cmt-timed-title" style="margin: 0 0 10px; font-size: 1.1rem; font-weight: 800; color: inherit;"></h3>' +
      '<p class="cmt-timed-msg" style="margin: 0 0 12px; font-size: .92rem; line-height: 1.45; color: inherit; white-space: pre-wrap;"></p>' +
      '<div class="cmt-timed-countdown" style="margin-bottom: 18px; font-size: .84rem; font-weight: 600; color: var(--neo-gray-dark,#475569);"></div>' +
      '<div class="cmt-dialog-btns" style="justify-content: center; gap: 12px; flex-wrap: wrap;">' +
      '<button type="button" class="cmt-btn-cancel cmt-timed-btn-no" style="min-width: 90px; padding: 8px 18px;"></button>' +
      '<button type="button" class="cmt-btn-cancel cmt-timed-btn-cancel" style="min-width: 90px; padding: 8px 18px; display: none;"></button>' +
      '<button type="button" class="cmt-btn-ok cmt-timed-btn-yes" style="min-width: 90px; padding: 8px 18px;"></button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(timedConfirmOverlay);

    timedConfirmOverlay.querySelector('.cmt-timed-btn-yes').addEventListener('click', function () { resolveTimedConfirm(true); });
    timedConfirmOverlay.querySelector('.cmt-timed-btn-no').addEventListener('click', function () { resolveTimedConfirm(false); });
    timedConfirmOverlay.querySelector('.cmt-timed-btn-cancel').addEventListener('click', function () { resolveTimedConfirm('cancel'); });
    timedConfirmOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); resolveTimedConfirm(true); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); resolveTimedConfirm(_timedConfirmHasCancel ? 'cancel' : false); }
    });
  }

  var _timedConfirmEscUnreg = null;
  function resolveTimedConfirm(val) {
    if (_timedConfirmEscUnreg) { _timedConfirmEscUnreg(); _timedConfirmEscUnreg = null; }
    if (timedConfirmTimer) {
      clearInterval(timedConfirmTimer);
      timedConfirmTimer = null;
    }
    _timedConfirmHasCancel = false;
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
    } catch (e) { }

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
    var cancelLabel = opts.cancelText || null;
    var countdownTemplate = opts.countdownMsg || (typeof window.t === 'function' ? window.t('conAutosaveCountdown') : (defCountdown[lang] || defCountdown.en));
    var seconds = typeof opts.timeoutSeconds === 'number' ? opts.timeoutSeconds : 10;
    var defaultChoice = typeof opts.defaultChoice === 'boolean' ? opts.defaultChoice : true;

    timedConfirmOverlay.querySelector('.cmt-timed-title').textContent = title;
    timedConfirmOverlay.querySelector('.cmt-timed-msg').textContent = msg;
    timedConfirmOverlay.querySelector('.cmt-timed-btn-yes').textContent = yesLabel;
    timedConfirmOverlay.querySelector('.cmt-timed-btn-no').textContent = noLabel;

    var cancelBtn = timedConfirmOverlay.querySelector('.cmt-timed-btn-cancel');
    if (cancelLabel) {
      _timedConfirmHasCancel = true;
      cancelBtn.textContent = cancelLabel;
      cancelBtn.style.display = 'inline-block';
    } else {
      _timedConfirmHasCancel = false;
      cancelBtn.style.display = 'none';
    }

    var countdownEl = timedConfirmOverlay.querySelector('.cmt-timed-countdown');
    timedConfirmRemaining = seconds;

    function updateCountdown() {
      var template = String(countdownTemplate || '');
      countdownEl.textContent = template.replace(/\{seconds\}|\{sec\}|\{count\}|\{time\}|\{\}/gi, timedConfirmRemaining);
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
    if (window.cmtPushEscapeHandler) {
      _timedConfirmEscUnreg = window.cmtPushEscapeHandler({
        el: timedConfirmOverlay,
        close: function () { resolveTimedConfirm(_timedConfirmHasCancel ? 'cancel' : false); }
      });
    }
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
    } catch (e) { }
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
    } catch (e) { }
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
      } catch (e) { }
    }
    if (typeof window.t === 'function') {
      try {
        var res2 = window.t(key);
        if (res2 && res2 !== key) return res2;
      } catch (e) { }
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
      'Oral Marking': 'app_oralMarking_title',
      'PDF Viewer': 'app_pdfViewer_title',
      'PDF Studio': 'app_pdfViewer_title'
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
        return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(t);
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

  // ── Export destination modal ("to-print" vs "custom" vs "doc-editor") ────
  var destinationOverlay = null;
  var _destinationResolver = null;
  var _destinationEscUnreg = null;
  var _currentExportDefaultExt = '';
  var _currentExportDefaultName = '';
  var _currentExportOpts = null;

  function _closeDestinationOverlay(res, explicitFilename) {
    if (_destinationEscUnreg) {
      _destinationEscUnreg();
      _destinationEscUnreg = null;
    }
    if (destinationOverlay) {
      destinationOverlay.classList.remove('open');
    }
    if (_destinationResolver) {
      var fn = _destinationResolver;
      _destinationResolver = null;
      if (!res) {
        fn(null);
      } else {
        var filenameInput = destinationOverlay ? destinationOverlay.querySelector('#cmt-dest-filename-input') : null;
        var rawName = explicitFilename || (filenameInput ? filenameInput.value : '');
        var cleanName = _sanitizeExportFilename(rawName, _currentExportDefaultExt, _currentExportDefaultName);
        var langSel = destinationOverlay ? destinationOverlay.querySelector('#cmt-dest-lang-select') : null;
        var langWrap = destinationOverlay ? destinationOverlay.querySelector('.cmt-dest-lang-wrap') : null;
        var chosenLang = (langSel && langWrap && langWrap.style.display !== 'none') ? langSel.value : undefined;
        fn({ destination: res, filename: cleanName, lang: chosenLang });
      }
    }
  }

  function _appendTimestampToFilename(filename) {
    var now = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    var ts = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '_' +
      pad(now.getHours()) + '-' + pad(now.getMinutes()) + '-' + pad(now.getSeconds());
    var dot = filename.lastIndexOf('.');
    if (dot > 0) {
      return filename.slice(0, dot) + '_' + ts + filename.slice(dot);
    }
    return filename + '_' + ts;
  }

  async function _checkExportFileExists(dest, filename, opts) {
    if (!window.Desktop || !Desktop.isElectron() || !filename) return false;
    try {
      if (opts && opts.customTarget) {
        if (typeof Desktop.statByPath === 'function') {
          var sub = opts.customSubdir ? String(opts.customSubdir).replace(/^[\\/]+|[\\/]+$/g, '') : '';
          var rel = sub ? (sub + '/' + filename) : filename;
          var stCustom = await Desktop.statByPath(opts.customTarget, rel);
          return !!(stCustom && stCustom.ok && stCustom.exists);
        }
      } else if (dest === 'doc-editor' || dest === 'doceditor') {
        if (typeof Desktop.statByPath === 'function') {
          var stDoc = await Desktop.statByPath('docEditorDocs', filename);
          return !!(stDoc && stDoc.ok && stDoc.exists);
        }
      } else if (dest === 'to-print') {
        if (typeof Desktop.statByPath === 'function') {
          var stPrint = await Desktop.statByPath('toPrint', filename);
          return !!(stPrint && stPrint.ok && stPrint.exists);
        }
      } else if (typeof dest === 'string' && dest.indexOf('exportRoot:') === 0) {
        if (typeof Desktop.statByPath === 'function') {
          var stRoot = await Desktop.statByPath(dest, filename);
          return !!(stRoot && stRoot.ok && stRoot.exists);
        }
      } else if (dest === 'same-folder' && opts && opts.sameFolderPath) {
        if (typeof Desktop.statDiskFile === 'function') {
          var sep = opts.sameFolderPath.indexOf('\\') !== -1 ? '\\' : '/';
          var base = opts.sameFolderPath.replace(/[\\/]+$/, '');
          var stDisk = await Desktop.statDiskFile(base + sep + filename);
          return !!(stDisk && stDisk.ok && stDisk.exists);
        }
      }
    } catch (_) {
      return false;
    }
    return false;
  }

  async function _resolveExportFilenameConflict(options) {
    if (!options || !options.filename || !window.Desktop || !Desktop.isElectron()) {
      return { canceled: false, filename: options && options.filename };
    }
    var filename = options.filename;
    var target = options.target || '';
    var subdir = options.subdir ? String(options.subdir).replace(/^[\\/]+|[\\/]+$/g, '') : '';
    var absPath = options.absolutePath || '';
    var dot = String(filename).lastIndexOf('.');
    _currentExportDefaultExt = dot > 0 ? String(filename).slice(dot + 1).toLowerCase() : '';
    _currentExportDefaultName = filename;

    var checkOpts = null;
    if (absPath) {
      var norm = absPath.replace(/\\/g, '/');
      var idx = norm.lastIndexOf('/');
      var dir = idx > 0 ? absPath.slice(0, idx) : '';
      checkOpts = { sameFolderPath: dir };
    } else if (target) {
      checkOpts = { customTarget: target, customSubdir: subdir };
    }

    var destKey = absPath ? 'same-folder' : (target === 'docEditorDocs' ? 'doc-editor' : (target === 'toPrint' ? 'to-print' : target));
    var exists = await _checkExportFileExists(destKey, filename, checkOpts);
    if (!exists) {
      return { canceled: false, filename: filename };
    }

    var conflictRes = await _promptExportConflict(filename, destKey, checkOpts);
    if (!conflictRes || !conflictRes.filename) {
      return { canceled: true };
    }
    return { canceled: false, filename: conflictRes.filename, action: conflictRes.action };
  }

  var exportConflictOverlay = null;
  var _conflictResolver = null;
  var _conflictEscUnreg = null;

  function _closeConflictOverlay(res) {
    if (_conflictEscUnreg) {
      _conflictEscUnreg();
      _conflictEscUnreg = null;
    }
    if (exportConflictOverlay) {
      exportConflictOverlay.classList.remove('open');
    }
    if (_conflictResolver) {
      var fn = _conflictResolver;
      _conflictResolver = null;
      fn(res || null);
    }
  }

  function ensureExportConflictOverlay() {
    if (exportConflictOverlay) return;
    exportConflictOverlay = document.createElement('div');
    exportConflictOverlay.className = 'cmt-overlay';
    exportConflictOverlay.setAttribute('role', 'dialog');
    exportConflictOverlay.setAttribute('aria-modal', 'true');
    exportConflictOverlay.style.zIndex = '10000010';
    exportConflictOverlay.innerHTML =
      '<div class="cmt-dialog-box" style="text-align: left; max-width: min(440px, calc(100vw - 24px)); padding: 22px 22px 18px; border: 2px solid var(--neo-border-color, #333333); box-shadow: 6px 6px 0 var(--neo-dark, #222222); border-radius: var(--neo-radius-lg, 10px);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
      '<div style="width:32px;height:32px;border-radius:var(--neo-radius-sm,4px);border:2px solid var(--neo-border-color,#333333);background:var(--neo-yellow,#e2c96e);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
      '<img src="' + _dlgIconPrefix + 'error.svg" style="width:18px;height:18px;" alt="" />' +
      '</div>' +
      '<h3 class="cmt-conflict-title" style="margin:0;font-size:1.06rem;font-weight:800;font-family:inherit;color:var(--neo-dark,#222222);">File Already Exists</h3>' +
      '</div>' +
      '<button type="button" class="cmt-conflict-close-x neo-icon-btn neo-close-btn" aria-label="Close"><img src="' + _dlgIconPrefix + 'close.svg" class="neo-icon" alt="" /></button>' +
      '</div>' +
      '<p class="cmt-conflict-msg" style="margin:0 0 16px;font-size:.88rem;line-height:1.5;color:var(--neo-gray-dark,#475569);word-break:break-word;font-family:inherit;"></p>' +
      '<div class="cmt-conflict-rename-wrap" style="display:none;margin-bottom:14px;">' +
      '<label class="cmt-conflict-rename-label neo-label" for="cmt-conflict-rename-input" style="display:block;margin-bottom:5px;">File Name:</label>' +
      '<div style="display:flex;gap:8px;align-items:center;">' +
      '<input type="text" id="cmt-conflict-rename-input" class="cmt-conflict-rename-input neo-input" style="flex:1;font-weight:700;" />' +
      '<button type="button" class="cmt-btn-conflict-rename-confirm neo-btn neo-btn-dark" style="white-space:nowrap;">Save</button>' +
      '</div>' +
      '</div>' +
      '<div class="cmt-conflict-actions" style="display:flex;flex-direction:column;gap:8px;">' +
      '<button type="button" class="cmt-btn-conflict-overwrite neo-btn" style="width:100%;justify-content:center;background:#fee2e2;color:#991b1b;border-color:#333333;">Overwrite Existing File</button>' +
      '<button type="button" class="cmt-btn-conflict-rename neo-btn neo-btn-primary" style="width:100%;justify-content:center;gap:8px;"><img src="' + _dlgIconPrefix + 'edit.svg" style="width:16px;height:16px;" alt="" /><span class="cmt-conflict-rename-text">Choose New Name</span></button>' +
      '<button type="button" class="cmt-btn-conflict-timestamp neo-btn" style="width:100%;justify-content:center;gap:8px;"><img src="' + _dlgIconPrefix + 'clock.svg" style="width:16px;height:16px;" alt="" /><span class="cmt-conflict-timestamp-text">Add Timestamp</span></button>' +
      '<button type="button" class="cmt-btn-conflict-cancel neo-btn neo-btn-ghost" style="width:100%;justify-content:center;margin-top:2px;">Cancel</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(exportConflictOverlay);

    exportConflictOverlay.querySelector('.cmt-conflict-close-x').addEventListener('click', function () { _closeConflictOverlay(null); });
    exportConflictOverlay.querySelector('.cmt-btn-conflict-cancel').addEventListener('click', function () { _closeConflictOverlay(null); });
    exportConflictOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        _closeConflictOverlay(null);
      }
    });
  }

  function _promptExportConflict(initialFilename, dest, opts) {
    ensureExportConflictOverlay();
    var currentName = initialFilename;
    var msgEl = exportConflictOverlay.querySelector('.cmt-conflict-msg');
    var titleEl = exportConflictOverlay.querySelector('.cmt-conflict-title');
    var renameWrap = exportConflictOverlay.querySelector('.cmt-conflict-rename-wrap');
    var renameInput = exportConflictOverlay.querySelector('#cmt-conflict-rename-input');
    var renameLabel = exportConflictOverlay.querySelector('.cmt-conflict-rename-label');
    var btnOverwrite = exportConflictOverlay.querySelector('.cmt-btn-conflict-overwrite');
    var btnRename = exportConflictOverlay.querySelector('.cmt-btn-conflict-rename');
    var btnTimestamp = exportConflictOverlay.querySelector('.cmt-btn-conflict-timestamp');
    var btnRenameConfirm = exportConflictOverlay.querySelector('.cmt-btn-conflict-rename-confirm');
    var btnCancel = exportConflictOverlay.querySelector('.cmt-btn-conflict-cancel');

    titleEl.textContent = _getExportText('exportFileExistsTitle', 'File Already Exists');
    renameLabel.textContent = _getExportText('exportFileNameLabel', 'File Name:');
    btnOverwrite.textContent = _getExportText('exportConflictOverwrite', 'Overwrite Existing File');
    exportConflictOverlay.querySelector('.cmt-conflict-rename-text').textContent = _getExportText('exportConflictRename', 'Choose New Name');
    exportConflictOverlay.querySelector('.cmt-conflict-timestamp-text').textContent = _getExportText('exportConflictTimestamp', 'Add Timestamp');
    btnRenameConfirm.textContent = _getExportText('exportConflictSaveNewName', 'Save with New Name');
    btnCancel.textContent = _getExportText('btnCancel', 'Cancel');

    function updateMessage(name) {
      currentName = name;
      msgEl.textContent = _getExportText(
        'exportFileExistsMsg',
        'A file named "{name}" already exists in this location. What would you like to do?'
      ).replace('{name}', name);
    }

    updateMessage(currentName);
    renameWrap.style.display = 'none';
    renameInput.value = currentName;

    btnOverwrite.onclick = function () {
      _closeConflictOverlay({ action: 'overwrite', filename: currentName });
    };

    btnTimestamp.onclick = async function () {
      var tsName = _appendTimestampToFilename(currentName);
      if (await _checkExportFileExists(dest, tsName, opts)) {
        var dot = tsName.lastIndexOf('.');
        var stem = dot > 0 ? tsName.slice(0, dot) : tsName;
        var ext = dot > 0 ? tsName.slice(dot) : '';
        tsName = stem + '_' + Math.floor(Math.random() * 900 + 100) + ext;
      }
      _closeConflictOverlay({ action: 'timestamp', filename: tsName });
    };

    btnRename.onclick = function () {
      renameWrap.style.display = 'block';
      renameInput.value = currentName;
      setTimeout(function () {
        renameInput.focus();
        var dot = currentName.lastIndexOf('.');
        if (dot > 0) {
          try { renameInput.setSelectionRange(0, dot); } catch (_) { }
        } else {
          renameInput.select();
        }
      }, 30);
    };

    async function submitNewName() {
      var newName = _sanitizeExportFilename(renameInput.value, _currentExportDefaultExt, currentName);
      if (await _checkExportFileExists(dest, newName, opts)) {
        updateMessage(newName);
        renameWrap.style.display = 'none';
        return;
      }
      _closeConflictOverlay({ action: 'rename', filename: newName });
    }

    btnRenameConfirm.onclick = submitNewName;
    renameInput.onkeydown = function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        submitNewName();
      }
    };

    return new Promise(function (resolve) {
      if (_conflictResolver) {
        var old = _conflictResolver;
        _conflictResolver = null;
        if (_conflictEscUnreg) { _conflictEscUnreg(); _conflictEscUnreg = null; }
        old(null);
      }
      _conflictResolver = resolve;
      exportConflictOverlay.classList.add('open');
      if (window.cmtPushEscapeHandler) {
        _conflictEscUnreg = window.cmtPushEscapeHandler({
          el: exportConflictOverlay,
          close: function () { _closeConflictOverlay(null); }
        });
      }
      setTimeout(function () { btnRename.focus(); }, 40);
    });
  }

  function _sanitizeExportFilename(inputVal, defaultExt, defaultName) {
    var str = (inputVal || '').trim();
    if (!str) str = defaultName || 'export';
    str = str.replace(/[/\\?%*:|"<>]/g, '_');
    if (defaultExt) {
      var cleanExt = defaultExt.replace(/^\./, '').toLowerCase();
      if (!str.toLowerCase().endsWith('.' + cleanExt)) {
        str += '.' + cleanExt;
      }
    }
    return str;
  }

  function ensureDestinationOverlay() {
    if (destinationOverlay) return;
    destinationOverlay = document.createElement('div');
    destinationOverlay.className = 'cmt-overlay';
    destinationOverlay.setAttribute('role', 'dialog');
    destinationOverlay.setAttribute('aria-modal', 'true');
    destinationOverlay.innerHTML =
      '<div class="cmt-dialog-box" style="text-align: left; max-width: min(460px, calc(100vw - 24px)); padding: 22px 22px 18px; border: 2px solid var(--neo-border-color, #333333); box-shadow: 6px 6px 0 var(--neo-dark, #222222); border-radius: var(--neo-radius-lg, 10px);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<img src="' + _dlgIconPrefix + 'folder.svg" style="width:20px;height:20px;" alt="">' +
      '<h3 class="cmt-dest-title" style="margin: 0; font-size: 1.08rem; font-weight: 800; font-family: inherit; color: var(--neo-dark, #222222);">Choose Export Location</h3>' +
      '</div>' +
      '<button type="button" class="cmt-dest-close-x neo-icon-btn neo-close-btn" aria-label="Close"><img src="' + _dlgIconPrefix + 'close.svg" class="neo-icon" alt="" /></button>' +
      '</div>' +
      '<p class="cmt-dest-prompt" style="margin: 0 0 12px; font-size: .86rem; line-height: 1.45; color: var(--neo-gray-dark, #475569); font-family: inherit;">Where do you want to save the exported file?</p>' +
      '<div class="cmt-dest-filename-wrap" style="margin-bottom: 14px;">' +
      '<label class="cmt-dest-filename-label neo-label" for="cmt-dest-filename-input" style="display:block;margin-bottom:5px;">File Name:</label>' +
      '<input type="text" id="cmt-dest-filename-input" class="cmt-dest-filename-input neo-input" style="font-weight:700;" />' +
      '</div>' +
      '<div class="cmt-dest-lang-wrap" style="display:none;margin-bottom: 14px;">' +
      '<label class="cmt-dest-lang-label neo-label" for="cmt-dest-lang-select" style="display:block;margin-bottom:5px;">Export Language:</label>' +
      '<select id="cmt-dest-lang-select" class="cmt-dest-lang-select neo-input" style="width:100%;font-weight:700;"></select>' +
      '</div>' +
      '<div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">' +
      '<button type="button" class="cmt-btn-dest-doceditor" style="display:none;align-items:center;gap:12px;padding:12px 14px;background:#fef9c3;border:2px solid var(--neo-border-color,#333333);box-shadow:var(--neo-shadow-md,3px 3px 0 #555555);border-radius:var(--neo-radius-md,6px);cursor:pointer;text-align:left;transition:transform .12s ease,box-shadow .12s ease,background .12s ease;outline:none;font-family:inherit;">' +
      '<div style="width:36px;height:36px;border:1.5px solid var(--neo-border-color,#333333);border-radius:var(--neo-radius-sm,4px);background:var(--neo-yellow,#e2c96e);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
      '<img src="' + _dlgIconPrefix + 'document-editor.svg" style="width:20px;height:20px;" alt="">' +
      '</div>' +
      '<div style="flex:1;">' +
      '<div class="cmt-dest-doceditor-title" style="font-size:0.92rem;font-weight:800;color:var(--neo-dark,#222222);">Document Editor (user/document-editor/docs)</div>' +
      '<div class="cmt-dest-doceditor-desc" style="font-size:0.75rem;color:var(--neo-gray-dark,#475569);font-weight:600;margin-top:2px;">Direct save into documents and open immediately in Document Editor</div>' +
      '</div>' +
      '</button>' +
      '<button type="button" class="cmt-btn-dest-samefolder" style="display:none;align-items:center;gap:12px;padding:12px 14px;background:#ffffff;border:2px solid var(--neo-border-color,#333333);box-shadow:var(--neo-shadow-md,3px 3px 0 #555555);border-radius:var(--neo-radius-md,6px);cursor:pointer;text-align:left;transition:transform .12s ease,box-shadow .12s ease,background .12s ease;outline:none;font-family:inherit;">' +
      '<div style="width:36px;height:36px;border:1.5px solid var(--neo-border-color,#333333);border-radius:var(--neo-radius-sm,4px);background:var(--neo-green,#6abf8e);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
      '<img src="' + _dlgIconPrefix + 'media.svg" style="width:20px;height:20px;" alt="">' +
      '</div>' +
      '<div style="flex:1;">' +
      '<div class="cmt-dest-samefolder-title" style="font-size:0.92rem;font-weight:800;color:var(--neo-dark,#222222);">Same Folder as Original Media</div>' +
      '<div class="cmt-dest-samefolder-desc" style="font-size:0.75rem;color:var(--neo-gray-dark,#475569);font-weight:600;margin-top:2px;">Save in the original source folder</div>' +
      '</div>' +
      '</button>' +
      '<button type="button" class="cmt-btn-dest-print" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#fff;border:2px solid #000;box-shadow:3px 3px 0 #000;border-radius:6px;cursor:pointer;text-align:left;transition:transform .08s,box-shadow .08s,background .12s;outline:none;font-family:inherit;">' +
      '<div style="width:36px;height:36px;border:1.5px solid #000;border-radius:4px;background:#fde047;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
      '<img src="../assets/icons/printer.svg" style="width:20px;height:20px;" alt="">' +
      '</div>' +
      '<div style="flex:1;">' +
      '<div class="cmt-dest-print-title" style="font-size:0.92rem;font-weight:800;color:#000;">Print Folder (user/to-print)</div>' +
      '<div class="cmt-dest-print-desc" style="font-size:0.75rem;color:#555;font-weight:600;margin-top:2px;">Direct save into the local print folder without browsing</div>' +
      '</div>' +
      '</button>' +
      '<div class="cmt-dest-custom-roots" style="display:none;flex-direction:column;gap:8px;max-height:190px;overflow-y:auto;padding-right:2px;"></div>' +
      '<button type="button" class="cmt-btn-dest-new-root" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 12px;background:#f8fafc;border:2px dashed var(--neo-border-color,#333333);border-radius:6px;cursor:pointer;font-size:0.84rem;font-weight:700;color:var(--neo-dark,#222222);font-family:inherit;transition:background .12s;">' +
      '<img src="' + _dlgIconPrefix + 'plus.svg" style="width:15px;height:15px;" alt="">' +
      '<span class="cmt-dest-new-root-label">New Root Folder...</span>' +
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

    var btnDocEditor = destinationOverlay.querySelector('.cmt-btn-dest-doceditor');
    var btnSameFolder = destinationOverlay.querySelector('.cmt-btn-dest-samefolder');
    var btnPrint = destinationOverlay.querySelector('.cmt-btn-dest-print');
    var customRootsWrap = destinationOverlay.querySelector('.cmt-dest-custom-roots');
    var btnNewRoot = destinationOverlay.querySelector('.cmt-btn-dest-new-root');
    var btnCustom = destinationOverlay.querySelector('.cmt-btn-dest-custom');
    var btnCancel = destinationOverlay.querySelector('.cmt-btn-dest-cancel');
    var btnCloseX = destinationOverlay.querySelector('.cmt-dest-close-x');
    var filenameInput = destinationOverlay.querySelector('#cmt-dest-filename-input');

    destinationOverlay._handleExportDestSelect = handleSelect;
    if (btnNewRoot) {
      btnNewRoot.addEventListener('mouseenter', function () { btnNewRoot.style.background = '#fef9c3'; });
      btnNewRoot.addEventListener('mouseleave', function () { btnNewRoot.style.background = '#f8fafc'; });
      btnNewRoot.addEventListener('click', async function () {
        var created = await _promptAndCreateCustomExportRoot();
        if (created) {
          await _renderCustomExportRootsInto(customRootsWrap, handleSelect);
          var newBtn = customRootsWrap && customRootsWrap.querySelector('[data-export-root-id="' + created.id + '"]');
          if (newBtn) newBtn.focus();
        }
      });
    }

    var closeWith = _closeDestinationOverlay;
    var _destChecking = false;

    async function handleSelect(dest) {
      if (_destChecking) return;
      if (!dest || dest === 'custom' || !window.Desktop || !Desktop.isElectron()) {
        closeWith(dest);
        return;
      }
      var cleanName = _sanitizeExportFilename(
        filenameInput ? filenameInput.value : '',
        _currentExportDefaultExt,
        _currentExportDefaultName
      );
      _destChecking = true;
      try {
        var exists = await _checkExportFileExists(dest, cleanName, _currentExportOpts);
        if (!exists) {
          closeWith(dest, cleanName);
          return;
        }
        var conflictRes = await _promptExportConflict(cleanName, dest, _currentExportOpts);
        if (conflictRes && conflictRes.filename) {
          if (filenameInput) filenameInput.value = conflictRes.filename;
          closeWith(dest, conflictRes.filename);
        }
      } finally {
        _destChecking = false;
      }
    }

    if (btnSameFolder) {
      btnSameFolder.addEventListener('click', function () { handleSelect('same-folder'); });
      btnSameFolder.addEventListener('mouseenter', function () { btnSameFolder.style.background = '#f0fdf4'; });
      btnSameFolder.addEventListener('mouseleave', function () { btnSameFolder.style.background = '#fff'; });
      btnSameFolder.addEventListener('mousedown', function () { btnSameFolder.style.transform = 'translate(1px, 1px)'; btnSameFolder.style.boxShadow = '2px 2px 0 #000'; });
      btnSameFolder.addEventListener('mouseup', function () { btnSameFolder.style.transform = 'none'; btnSameFolder.style.boxShadow = '3px 3px 0 #000'; });
    }
    btnDocEditor.addEventListener('click', function () { handleSelect('doc-editor'); });
    btnPrint.addEventListener('click', function () { handleSelect('to-print'); });
    btnCustom.addEventListener('click', function () { closeWith('custom'); });
    btnCancel.addEventListener('click', function () { closeWith(null); });
    btnCloseX.addEventListener('click', function () { closeWith(null); });

    btnDocEditor.addEventListener('mouseenter', function () { btnDocEditor.style.background = '#fde047'; });
    btnDocEditor.addEventListener('mouseleave', function () { btnDocEditor.style.background = '#fef08a'; });
    btnDocEditor.addEventListener('mousedown', function () { btnDocEditor.style.transform = 'translate(1px, 1px)'; btnDocEditor.style.boxShadow = '2px 2px 0 #000'; });
    btnDocEditor.addEventListener('mouseup', function () { btnDocEditor.style.transform = 'none'; btnDocEditor.style.boxShadow = '3px 3px 0 #000'; });

    [btnPrint, btnCustom].forEach(function (btn) {
      btn.addEventListener('mouseenter', function () { btn.style.background = '#f9fafb'; });
      btn.addEventListener('mouseleave', function () { btn.style.background = '#fff'; });
      btn.addEventListener('mousedown', function () { btn.style.transform = 'translate(1px, 1px)'; btn.style.boxShadow = '2px 2px 0 #000'; });
      btn.addEventListener('mouseup', function () { btn.style.transform = 'none'; btn.style.boxShadow = '3px 3px 0 #000'; });
    });

    if (filenameInput) {
      filenameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSelect(btnDocEditor.style.display !== 'none' ? 'doc-editor' : 'to-print');
        }
      });
    }

    destinationOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); closeWith(null); }
    });
  }

  function _promptExportDestination(options) {
    if (!window.Desktop || !Desktop.isElectron()) {
      return Promise.resolve({ destination: 'browser', filename: (options && options.filename) || 'export' });
    }
    ensureDestinationOverlay();
    var opts = options || {};
    _currentExportOpts = opts;
    var rawFilename = opts.filename || 'export';
    _currentExportDefaultName = rawFilename;
    var ext = String(rawFilename).split('?')[0].split('.').pop().toLowerCase();
    _currentExportDefaultExt = ext;
    var isDoc = (ext === 'html' || ext === 'md' || ext === 'htm' || ext === 'typ' || ext === 'odt');

    destinationOverlay.querySelector('.cmt-dest-title').textContent = opts.title || _getExportText('exportDestinationTitle', 'Choose Export Location');
    destinationOverlay.querySelector('.cmt-dest-prompt').textContent = opts.prompt || _getExportText('exportDestinationPrompt', 'Where do you want to save the exported file?');
    destinationOverlay.querySelector('.cmt-dest-filename-label').textContent = _getExportText('exportFileNameLabel', 'File Name:');

    var btnDocEditor = destinationOverlay.querySelector('.cmt-btn-dest-doceditor');
    if (btnDocEditor) {
      destinationOverlay.querySelector('.cmt-dest-doceditor-title').textContent = _getExportText('exportToDocEditor', 'Document Editor (user/document-editor/docs)');
      destinationOverlay.querySelector('.cmt-dest-doceditor-desc').textContent = _getExportText('exportToDocEditorDesc', 'Direct save into documents and open immediately in Document Editor');
      if (isDoc && opts.allowDocEditor !== false) {
        btnDocEditor.style.display = 'flex';
      } else {
        btnDocEditor.style.display = 'none';
      }
    }

    var btnSameFolder = destinationOverlay.querySelector('.cmt-btn-dest-samefolder');
    if (btnSameFolder) {
      if (opts.allowSameFolder && opts.sameFolderPath) {
        btnSameFolder.style.display = 'flex';
        destinationOverlay.querySelector('.cmt-dest-samefolder-title').textContent = opts.sameFolderTitle || _getExportText('exportToSameFolder', 'Same Folder as Original Media');
        destinationOverlay.querySelector('.cmt-dest-samefolder-desc').textContent = opts.sameFolderDesc || (_getExportText('exportToSameFolderDesc', 'Save in: ') + opts.sameFolderPath);
      } else {
        btnSameFolder.style.display = 'none';
      }
    }

    destinationOverlay.querySelector('.cmt-dest-print-title').textContent = _getExportText('exportToPrintFolder', 'Print Folder (user/to-print)');
    destinationOverlay.querySelector('.cmt-dest-print-desc').textContent = _getExportText('exportToPrintDesc', 'Direct save into the local print folder without browsing');
    var newRootLabel = destinationOverlay.querySelector('.cmt-dest-new-root-label');
    if (newRootLabel) newRootLabel.textContent = _getExportText('exportNewRootFolder', 'New Root Folder...');
    destinationOverlay.querySelector('.cmt-dest-custom-title').textContent = _getExportText('exportCustomLocation', 'Choose Other Folder (File Picker)');
    destinationOverlay.querySelector('.cmt-dest-custom-desc').textContent = _getExportText('exportCustomDesc', 'Select any folder or drive on your computer using the system dialog');
    destinationOverlay.querySelector('.cmt-btn-dest-cancel').textContent = _getExportText('btnCancel', 'Cancel');

    var customRootsWrap = destinationOverlay.querySelector('.cmt-dest-custom-roots');
    if (customRootsWrap && typeof destinationOverlay._handleExportDestSelect === 'function') {
      _renderCustomExportRootsInto(customRootsWrap, destinationOverlay._handleExportDestSelect);
    }

    var filenameInput = destinationOverlay.querySelector('#cmt-dest-filename-input');
    if (filenameInput) {
      filenameInput.value = rawFilename;
    }

    var langWrap = destinationOverlay.querySelector('.cmt-dest-lang-wrap');
    var langSel = destinationOverlay.querySelector('#cmt-dest-lang-select');
    if (langWrap && langSel) {
      if (opts.showLangSelector) {
        langWrap.style.display = 'block';
        destinationOverlay.querySelector('.cmt-dest-lang-label').textContent = _getExportText('exportLangLabel', 'Export Language:');
        var currentLang = opts.defaultLang || (opts.toolKey && window.ExportLangService ? window.ExportLangService.getSelectedLang(opts.toolKey) : 'app');
        var uiLang = (window.i18n && typeof window.i18n.getUiLang === 'function') ? window.i18n.getUiLang() : 'fr';
        var langNames = {
          en: _getExportText('langNameEn', 'English'),
          fr: _getExportText('langNameFr', 'French'),
          de: _getExportText('langNameDe', 'German'),
          it: _getExportText('langNameIt', 'Italian')
        };
        var sameLabel = _getExportText('exportLangSameAsApp', 'Same as app') + ' (' + (langNames[uiLang] || uiLang.toUpperCase()) + ')';
        langSel.innerHTML =
          '<option value="app">' + sameLabel + '</option>' +
          '<option value="en">' + langNames.en + '</option>' +
          '<option value="fr">' + langNames.fr + '</option>' +
          '<option value="de">' + langNames.de + '</option>' +
          '<option value="it">' + langNames.it + '</option>';
        langSel.value = currentLang || 'app';
        langSel.onchange = function () {
          if (opts.toolKey && window.ExportLangService) {
            window.ExportLangService.setSelectedLang(opts.toolKey, langSel.value);
          }
        };
      } else {
        langWrap.style.display = 'none';
      }
    }

    return new Promise(function (resolve) {
      if (_destinationResolver) {
        var old = _destinationResolver;
        _destinationResolver = null;
        if (_destinationEscUnreg) {
          _destinationEscUnreg();
          _destinationEscUnreg = null;
        }
        old(null);
      }
      _destinationResolver = resolve;
      destinationOverlay.classList.add('open');
      if (window.cmtPushEscapeHandler) {
        _destinationEscUnreg = window.cmtPushEscapeHandler({
          el: destinationOverlay,
          close: function () { _closeDestinationOverlay(null); }
        });
      }

      if (filenameInput) {
        setTimeout(function () {
          filenameInput.focus();
          var dot = rawFilename.lastIndexOf('.');
          if (dot > 0) {
            try { filenameInput.setSelectionRange(0, dot); } catch (e) { }
          } else {
            filenameInput.select();
          }
        }, 60);
      }
    });
  }

  async function _saveExportWithDestination(config) {
    if (!config) return { ok: false, canceled: true };
    var filename = config.filename || 'export';
    var content = config.content;
    var dest = config.destination;
    var hasDynamicBuilder = typeof config.buildContent === 'function' || typeof config.buildDocxRequest === 'function' || typeof config.buildOdtRequest === 'function';
    var chosenLang = config.lang || (config.toolKey && window.ExportLangService ? window.ExportLangService.getSelectedLang(config.toolKey) : 'app');

    if (!dest) {
      var destRes = await _promptExportDestination({
        title: config.modalTitle,
        prompt: config.modalPrompt,
        filename: filename,
        allowDocEditor: config.allowDocEditor,
        showLangSelector: config.showLangSelector !== undefined ? config.showLangSelector : hasDynamicBuilder,
        toolKey: config.toolKey,
        defaultLang: chosenLang
      });
      if (!destRes || destRes.canceled) return { ok: false, canceled: true };
      if (typeof destRes === 'string') {
        dest = destRes;
      } else {
        dest = destRes.destination;
        if (destRes.filename) filename = destRes.filename;
        if (destRes.lang) chosenLang = destRes.lang;
      }
    }

    if (hasDynamicBuilder) {
      var runBuilders = async function (resolvedLang) {
        if (typeof config.buildContent === 'function') {
          content = await config.buildContent(resolvedLang);
        }
        if (typeof config.buildDocxRequest === 'function') {
          config.docxRequest = await config.buildDocxRequest(resolvedLang);
        }
        if (typeof config.buildOdtRequest === 'function') {
          config.odtRequest = await config.buildOdtRequest(resolvedLang);
        }
      };
      if (window.i18n && typeof window.i18n.withExportLang === 'function') {
        await window.i18n.withExportLang(chosenLang, runBuilders);
      } else {
        await runBuilders(chosenLang);
      }
    }

    if (dest === 'browser' || !window.Desktop || !Desktop.isElectron()) {
      if (dest === 'doc-editor' || dest === 'doceditor') {
        try {
          sessionStorage.setItem('cmt_doc_editor_draft', JSON.stringify({
            filename: filename,
            content: typeof content === 'string' ? content : '',
            format: filename.endsWith('.md') ? 'md' : 'html'
          }));
          window.location.href = 'document-editor.html?importPending=draft';
          return { ok: true, path: filename, name: filename, destination: 'doc-editor' };
        } catch (err) { }
      }
      if (config.odtRequest && (!window.OdtConverter || !window.JSZip)) {
        if (typeof showToast === 'function') {
          showToast(_getExportText('deOdtRequiresElectron', 'ODT export requires the Electron desktop app.'), true);
        }
        return { ok: false, error: 'ODT export requires Electron' };
      }
      if (config.docxRequest && (!window.Desktop || !Desktop.isElectron())) {
        if (typeof showToast === 'function') {
          showToast('DOCX export requires the Electron desktop app.', true);
        }
        return { ok: false, error: 'DOCX export requires Electron' };
      }
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
      if (dest === 'doc-editor' || dest === 'doceditor') {
        var docRes = null;
        if (config.odtRequest) {
          var reqOdtDoc = Object.assign({}, config.odtRequest, { target: 'docEditorDocs', defaultName: filename.replace(/\.odt$/i, '') });
          docRes = await Desktop.exportOdt(reqOdtDoc);
        } else if (config.docxRequest) {
          var reqDocxDoc = Object.assign({}, config.docxRequest, { target: 'docEditorDocs', defaultName: filename.replace(/\.docx$/i, '') });
          docRes = await Desktop.exportDocx(reqDocxDoc);
        } else if (typeof content === 'string') {
          docRes = await Desktop.saveText('docEditorDocs', filename, content);
        } else if (content instanceof Blob) {
          docRes = await Desktop.saveBlob('docEditorDocs', filename, content);
        } else if (content instanceof ArrayBuffer || (content && content.buffer instanceof ArrayBuffer)) {
          var bytes2 = content instanceof Uint8Array ? content : new Uint8Array(content);
          var b2 = new Blob([bytes2], { type: config.mimeType || 'text/html;charset=utf-8' });
          docRes = await Desktop.saveBlob('docEditorDocs', filename, b2);
        } else {
          docRes = await Desktop.saveText('docEditorDocs', filename, String(content || ''));
        }

        if (docRes && docRes.ok) {
          if (typeof Desktop.openTool === 'function') {
            Desktop.openTool('document-editor.html', {
              query: { editTarget: 'docEditorDocs', editRelPath: filename, editAbsPath: docRes.path || undefined }
            });
          }
          var openedMsg = _getExportText('exportOpenedInDocEditor', 'Opened in Document Editor: "{name}"').replace('{name}', filename);
          if (typeof window.showToast === 'function') {
            window.showToast(openedMsg);
          } else if (typeof window.mdbToast === 'function') {
            window.mdbToast(openedMsg);
          }
          return {
            ok: true,
            path: (docRes.file && docRes.file.path) || docRes.path || ('user/document-editor/docs/' + filename),
            name: filename,
            target: 'docEditorDocs',
            destination: 'doc-editor'
          };
        } else {
          var errText = (docRes && docRes.error) || 'Failed to save to Document Editor';
          if (typeof window.showToast === 'function') window.showToast(errText, true);
          return { ok: false, error: errText };
        }
      } else if (dest === 'to-print' || (typeof dest === 'string' && dest.indexOf('exportRoot:') === 0)) {
        var exportTarget = (dest === 'to-print') ? 'toPrint' : dest;
        if (config.odtRequest) {
          var reqOdtPrint = Object.assign({}, config.odtRequest, { target: exportTarget, defaultName: filename.replace(/\.odt$/i, '') });
          result = await Desktop.exportOdt(reqOdtPrint);
        } else if (config.docxRequest) {
          var req = Object.assign({}, config.docxRequest, { target: exportTarget, defaultName: filename.replace(/\.docx$/i, '') });
          result = await Desktop.exportDocx(req);
        } else if (typeof content === 'string') {
          result = await Desktop.saveText(exportTarget, filename, content);
        } else if (content instanceof Blob) {
          result = await Desktop.saveBlob(exportTarget, filename, content);
        } else if (content instanceof ArrayBuffer || (content && content.buffer instanceof ArrayBuffer)) {
          var bytes = content instanceof Uint8Array ? content : new Uint8Array(content);
          var blob2 = new Blob([bytes], { type: config.mimeType || 'application/octet-stream' });
          result = await Desktop.saveBlob(exportTarget, filename, blob2);
        } else {
          result = await Desktop.saveText(exportTarget, filename, String(content || ''));
        }

        if (result && typeof result.file === 'string' && result.file) {
          result.path = result.file;
        } else if (result && result.file && result.file.path) {
          result.path = result.file.path;
        }
        if (result && !result.name) result.name = filename;
      } else {
        if (config.odtRequest) {
          var reqOdtCustom = Object.assign({}, config.odtRequest, { defaultName: filename.replace(/\.odt$/i, '') });
          result = await Desktop.exportOdt(reqOdtCustom);
        } else if (config.docxRequest) {
          var reqCustom = Object.assign({}, config.docxRequest, { defaultName: filename.replace(/\.docx$/i, '') });
          result = await Desktop.exportDocx(reqCustom);
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
        showToast('Export failed: ' + (err.message || String(err)), true);
      }
      return { ok: false, error: err.message };
    }
  }

  async function _sendToDocumentEditor(options) {
    if (!options) return { ok: false, canceled: true };
    var content = options.content || '';
    var filename = options.filename;
    var format = options.format || (filename && filename.endsWith('.md') ? 'md' : 'html');
    if (!filename) {
      var ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      var safeTitle = (options.title || 'document').toLowerCase().replace(/[^a-z0-9_\-]+/g, '_');
      filename = safeTitle + '_' + ts + '.' + format;
    }
    return _saveExportWithDestination({
      filename: filename,
      content: content,
      destination: 'doc-editor',
      showSuccessPopup: false
    });
  }

  // ── Export success modal ───────────────────────────────────────────────────
  var exportOverlay = null;

  function ensureExportOverlay() {
    if (exportOverlay) return;
    var iconPrefix = (location.pathname.indexOf('/pages/') !== -1 || location.pathname.indexOf('\\pages\\') !== -1) ? '../assets/icons/' : 'assets/icons/';
    exportOverlay = document.createElement('div');
    exportOverlay.className = 'cmt-overlay';
    exportOverlay.setAttribute('role', 'dialog');
    exportOverlay.setAttribute('aria-modal', 'true');
    exportOverlay.innerHTML =
      '<div class="cmt-dialog-box" style="text-align: center; max-width: min(420px, calc(100vw - 24px)); padding: 26px 22px 20px; border: 2px solid var(--neo-border-color, #333333); box-shadow: 6px 6px 0 var(--neo-dark, #222222); border-radius: var(--neo-radius-lg, 10px);">' +
      '<div style="display: flex; justify-content: center; margin-bottom: 12px;">' +
      '<div style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--neo-border-color, #333333); background: var(--neo-green, #6abf8e); display: flex; align-items: center; justify-content: center; box-shadow: var(--neo-shadow-sm, 2px 2px 0 #888888);">' +
      '<img src="' + iconPrefix + 'check.svg" style="width: 22px; height: 22px;" alt="" />' +
      '</div>' +
      '</div>' +
      '<h3 class="cmt-export-title" style="margin: 0 0 10px; font-size: 1.12rem; font-weight: 800; font-family: inherit; color: var(--neo-dark, #222222);">Export Complete</h3>' +
      '<p class="cmt-export-msg" style="margin: 0 0 20px; font-size: .88rem; line-height: 1.5; color: var(--neo-gray-dark, #475569); word-break: break-all; font-family: inherit; font-weight: 500;"></p>' +
      '<div class="cmt-dialog-btns" style="display: flex; flex-direction: column; gap: 8px; align-items: stretch; justify-content: center; width: 100%;">' +
      '<button type="button" class="cmt-btn-open-file neo-btn neo-btn-dark" style="width: 100%; justify-content: center;">Open File</button>' +
      '<button type="button" class="cmt-btn-open-doc-editor neo-btn neo-btn-primary" style="display: none; width: 100%; justify-content: center;">Open with Document Editor</button>' +
      '<button type="button" class="cmt-btn-open-pdf-viewer neo-btn neo-btn-primary" style="display: none; width: 100%; justify-content: center;">Open with PDF Viewer</button>' +
      '<button type="button" class="cmt-btn-show-in-folder neo-btn" style="width: 100%; justify-content: center;">Open Folder</button>' +
      '<button type="button" class="cmt-btn-close-export neo-btn neo-btn-ghost" style="width: 100%; justify-content: center; margin-top: 2px;">Close</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(exportOverlay);

    // Key event listener for dialog
    exportOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); closeExportOverlay(); }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        var pdfBtn = exportOverlay.querySelector('.cmt-btn-open-pdf-viewer');
        var docBtn = exportOverlay.querySelector('.cmt-btn-open-doc-editor');
        var primaryBtn = exportOverlay.querySelector('.cmt-btn-open-file');
        if (pdfBtn && pdfBtn.style.display !== 'none') pdfBtn.click();
        else if (docBtn && docBtn.style.display !== 'none') docBtn.click();
        else if (primaryBtn && primaryBtn.style.display !== 'none') primaryBtn.click();
        else {
          var folderBtn = exportOverlay.querySelector('.cmt-btn-show-in-folder');
          if (folderBtn) folderBtn.click();
        }
      }
    });
  }

  var _exportEscUnreg = null;
  function closeExportOverlay() {
    if (_exportEscUnreg) { _exportEscUnreg(); _exportEscUnreg = null; }
    if (!exportOverlay) return;
    exportOverlay.classList.remove('open');
  }

  function _showExportSuccessPopup(filePathOrOptions, fileName, isFolder) {
    if (!window.Desktop || !Desktop.isElectron()) {
      // Browsers do standard downloads, so bypass
      return;
    }
    ensureExportOverlay();

    var filePath = '';
    var customTitle = '';
    var target = '';
    var relativePath = '';
    if (filePathOrOptions && typeof filePathOrOptions === 'object') {
      filePath = filePathOrOptions.filePath || filePathOrOptions.path || '';
      fileName = filePathOrOptions.fileName || fileName;
      target = filePathOrOptions.target || '';
      relativePath = filePathOrOptions.relativePath || filePathOrOptions.relPath || '';
      isFolder = filePathOrOptions.isFolder !== undefined ? filePathOrOptions.isFolder : isFolder;
      customTitle = filePathOrOptions.title || '';
    } else {
      filePath = String(filePathOrOptions || '');
    }

    var name = fileName || (filePath ? filePath.split(/[\\/]/).pop() : 'export');
    var titleText = customTitle || _getExportText('exportSuccessTitle', 'Export Complete');
    var defaultMsg = '"{name}" has been successfully exported.';
    if (isFolder) {
      defaultMsg = 'Folder "{name}" has been successfully exported.';
    }
    var msgText = _getExportText(isFolder ? 'exportSuccessMessageFolder' : 'exportSuccessMessage', defaultMsg).replace('{name}', name);

    exportOverlay.querySelector('.cmt-export-title').textContent = titleText;
    exportOverlay.querySelector('.cmt-export-msg').textContent = msgText;

    var openBtn = exportOverlay.querySelector('.cmt-btn-open-file');
    var docEditorBtn = exportOverlay.querySelector('.cmt-btn-open-doc-editor');
    var pdfViewerBtn = exportOverlay.querySelector('.cmt-btn-open-pdf-viewer');
    var showBtn = exportOverlay.querySelector('.cmt-btn-show-in-folder');
    var closeBtn = exportOverlay.querySelector('.cmt-btn-close-export');

    var ext = '';
    if (filePath) {
      ext = String(filePath).split('?')[0].split('.').pop().toLowerCase();
    }
    if ((!ext || ext === String(filePath).toLowerCase()) && fileName) {
      ext = String(fileName).split('?')[0].split('.').pop().toLowerCase();
    }

    var isDoc = !isFolder && (ext === 'md' || ext === 'html' || ext === 'typ' || ext === 'odt');
    var isPdf = !isFolder && (ext === 'pdf');

    if (isFolder) {
      openBtn.style.display = 'none';
      docEditorBtn.style.display = 'none';
      pdfViewerBtn.style.display = 'none';
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

      if (isPdf) {
        pdfViewerBtn.style.display = 'block';
        pdfViewerBtn.textContent = _getExportText('exportOpenWithPdfViewerBtn', 'Open with PDF Viewer');
      } else {
        pdfViewerBtn.style.display = 'none';
      }
    }
    closeBtn.textContent = _getExportText('exportCloseBtn', 'Close');

    // Clone nodes to easily clean up previous listeners
    var newOpenBtn = openBtn.cloneNode(true);
    var newDocEditorBtn = docEditorBtn.cloneNode(true);
    var newPdfViewerBtn = pdfViewerBtn.cloneNode(true);
    var newShowBtn = showBtn.cloneNode(true);
    var newCloseBtn = closeBtn.cloneNode(true);
    openBtn.replaceWith(newOpenBtn);
    docEditorBtn.replaceWith(newDocEditorBtn);
    pdfViewerBtn.replaceWith(newPdfViewerBtn);
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

    newPdfViewerBtn.addEventListener('mouseenter', function () { newPdfViewerBtn.style.background = '#fde047'; });
    newPdfViewerBtn.addEventListener('mouseleave', function () { newPdfViewerBtn.style.background = '#fef08a'; });
    newPdfViewerBtn.addEventListener('mousedown', function () { newPdfViewerBtn.style.transform = 'translate(1px, 1px)'; newPdfViewerBtn.style.boxShadow = '1px 1px 0 #000'; });
    newPdfViewerBtn.addEventListener('mouseup', function () { newPdfViewerBtn.style.transform = 'none'; newPdfViewerBtn.style.boxShadow = '2px 2px 0 #000'; });

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

    newPdfViewerBtn.addEventListener('click', function () {
      closeExportOverlay();
      if (window.Desktop && typeof Desktop.openTool === 'function') {
        var query = { openAbsPath: filePath };
        if (target && relativePath) {
          query.openTarget = target;
          query.openRelPath = relativePath;
        }
        Desktop.openTool('pdf-viewer.html', { query: query });
      }
    });

    newShowBtn.addEventListener('click', function () {
      closeExportOverlay();
      Desktop.showInFolder({ absolutePath: filePath });
    });

    exportOverlay.classList.add('open');
    if (window.cmtPushEscapeHandler) {
      _exportEscUnreg = window.cmtPushEscapeHandler({
        el: exportOverlay,
        close: closeExportOverlay
      });
    }
    setTimeout(function () {
      if (isDoc) {
        newDocEditorBtn.focus();
      } else if (isPdf) {
        newPdfViewerBtn.focus();
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
    } catch (e) { }

    var map = {
      en: {
        exportSuccessTitle: 'Export Complete',
        exportSuccessMessage: '"{name}" has been successfully exported.',
        exportSuccessMessageFolder: 'Folder "{name}" has been successfully exported.',
        exportOpenBtn: 'Open File',
        exportOpenWithDocEditorBtn: 'Open with Document Editor',
        exportOpenWithPdfViewerBtn: 'Open with PDF Viewer',
        exportOpenFolderBtn: 'Open Folder',
        exportShowInFolderBtn: 'Show in Folder',
        exportCloseBtn: 'Close',
        exportDestinationTitle: 'Choose Export Location',
        exportDestinationPrompt: 'Where do you want to save the exported file?',
        exportToPrintFolder: 'Print Folder (user/to-print)',
        exportToPrintDesc: 'Direct save into the local print folder without browsing',
        exportCustomLocation: 'Choose Other Folder (File Picker)',
        exportCustomDesc: 'Select any folder or drive on your computer using the system dialog',
        exportFileNameLabel: 'File Name:',
        exportToDocEditor: 'Document Editor (user/document-editor/docs)',
        exportToDocEditorDesc: 'Direct save into documents and open immediately in Document Editor',
        exportToSameFolder: 'Same Folder as Original Media',
        exportToSameFolderDesc: 'Save in the same folder alongside the original file: ',
        exportOpenedInDocEditor: 'Opened in Document Editor: "{name}"',
        btnCancel: 'Cancel'
      },
      fr: {
        exportSuccessTitle: 'Exportation Terminée',
        exportSuccessMessage: '"{name}" a été exporté avec succès.',
        exportSuccessMessageFolder: 'Le dossier "{name}" a été exporté avec succès.',
        exportOpenBtn: 'Ouvrir le fichier',
        exportOpenWithDocEditorBtn: "Ouvrir dans l'éditeur de documents",
        exportOpenWithPdfViewerBtn: "Ouvrir avec le lecteur PDF",
        exportOpenFolderBtn: 'Ouvrir le dossier',
        exportShowInFolderBtn: 'Afficher dans le dossier',
        exportCloseBtn: 'Fermer',
        exportDestinationTitle: "Choisir l'emplacement d'exportation",
        exportDestinationPrompt: 'Où souhaitez-vous enregistrer le fichier exporté ?',
        exportToPrintFolder: "Dossier d'impression (user/to-print)",
        exportToPrintDesc: "Enregistrement direct dans le dossier d'impression local sans navigation",
        exportCustomLocation: 'Choisir un autre dossier (Sélecteur de fichiers)',
        exportCustomDesc: 'Sélectionnez n\'importe quel dossier ou disque sur votre ordinateur à l\'aide de la boîte de dialogue système',
        exportFileNameLabel: 'Nom du fichier :',
        exportToDocEditor: "Éditeur de documents (user/document-editor/docs)",
        exportToDocEditorDesc: "Enregistrement direct dans les documents et ouverture immédiate dans l'Éditeur de documents",
        exportToSameFolder: "Même dossier que le média d'origine",
        exportToSameFolderDesc: "Enregistrer dans le même dossier à côté du fichier d'origine : ",
        exportOpenedInDocEditor: 'Ouvert dans l\'Éditeur de documents : "{name}"',
        btnCancel: 'Annuler'
      },
      de: {
        exportSuccessTitle: 'Export abgeschlossen',
        exportSuccessMessage: '"{name}" wurde erfolgreich exportiert.',
        exportSuccessMessageFolder: 'Der Ordner "{name}" wurde erfolgreich exportiert.',
        exportOpenBtn: 'Datei öffnen',
        exportOpenWithDocEditorBtn: 'Im Dokument-Editor öffnen',
        exportOpenWithPdfViewerBtn: 'In PDF-Viewer öffnen',
        exportOpenFolderBtn: 'Ordner öffnen',
        exportShowInFolderBtn: 'Im Ordner anzeigen',
        exportCloseBtn: 'Schließen',
        exportDestinationTitle: 'Speicherort auswählen',
        exportDestinationPrompt: 'Wo möchten Sie die exportierte Datei speichern?',
        exportToPrintFolder: 'Druckordner (user/to-print)',
        exportToPrintDesc: 'Direktes Speichern im lokalen Druckordner ohne Auswahldialog',
        exportCustomLocation: 'Anderen Ordner wählen (Dateiauswahl)',
        exportCustomDesc: 'Wählen Sie einen beliebigen Ordner oder ein Laufwerk über den Systemdialog aus',
        exportFileNameLabel: 'Dateiname:',
        exportToDocEditor: 'Dokument-Editor (user/document-editor/docs)',
        exportToDocEditorDesc: 'Direkt in Dokumente speichern und sofort im Dokument-Editor öffnen',
        exportToSameFolder: 'Gleicher Ordner wie Originalmedium',
        exportToSameFolderDesc: 'Im selben Ordner neben der Originaldatei speichern: ',
        exportOpenedInDocEditor: 'Im Dokument-Editor geöffnet: "{name}"',
        btnCancel: 'Abbrechen'
      },
      it: {
        exportSuccessTitle: 'Esportazione Completata',
        exportSuccessMessage: '"{name}" è stato esportato con successo.',
        exportSuccessMessageFolder: 'La cartella "{name}" è stata esportata con successo.',
        exportOpenBtn: 'Apri file',
        exportOpenWithDocEditorBtn: "Apri nell'editor de documenti",
        exportOpenWithPdfViewerBtn: "Apri con PDF Viewer",
        exportOpenFolderBtn: 'Apri cartella',
        exportShowInFolderBtn: 'Mostra nella cartella',
        exportCloseBtn: 'Chiudi',
        exportDestinationTitle: 'Scegli percorso di esportazione',
        exportDestinationPrompt: 'Dove desideri salvare il file esportato?',
        exportToPrintFolder: 'Cartella di stampa (user/to-print)',
        exportToPrintDesc: 'Salvataggio diretto nella cartella di stampa locale senza sfogliare',
        exportCustomLocation: 'Scegli altra cartella (File Picker)',
        exportCustomDesc: 'Seleziona qualsiasi cartella o unità sul computer utilizzando la finestra di dialogo del sistema',
        exportFileNameLabel: 'Nome file:',
        exportToDocEditor: 'Editor di documenti (user/document-editor/docs)',
        exportToDocEditorDesc: "Salva direttamente nei documenti e apri immediatamente nell'Editor",
        exportToSameFolder: 'Stessa cartella del file originale',
        exportToSameFolderDesc: 'Salva nella stessa cartella accanto al file originale: ',
        exportOpenedInDocEditor: 'Aperto nell\'Editor di documenti: "{name}"',
        btnCancel: 'Annulla'
      }
    };
    var lm = map[lang] || map.en;
    if (window.i18n && typeof window.i18n.t === 'function') {
      try {
        var r = window.i18n.t(key);
        if (r && r !== key) return r;
      } catch (e) { }
    }
    if (typeof window.t === 'function') {
      try {
        var res = window.t(key);
        if (res && res !== key) return res;
      } catch (e) { }
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
    } catch (e) { }
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

  async function _fetchCustomExportRoots() {
    if (window.ExportRootsService && typeof window.ExportRootsService.list === 'function') {
      return window.ExportRootsService.list();
    }
    if (window.Desktop && typeof Desktop.getExportRoots === 'function') {
      try {
        var res = await Desktop.getExportRoots();
        if (res && res.ok && Array.isArray(res.roots)) return res.roots;
      } catch (_) { }
    }
    return [];
  }

  function _slugifyExportRoot(raw) {
    if (window.ExportRootsService && typeof window.ExportRootsService.slugify === 'function') {
      return window.ExportRootsService.slugify(raw);
    }
    var reserved = new Set([
      'to-print', 'lessons', 'mindmaps', 'custom-data', 'data', 'grades',
      'group-participation', 'document-editor', 'class-plans', 'game-results',
      'log', 'tests', 'export-css', 'trash', 'history', 'backups', 'node_modules'
    ]);
    var s = String(raw || '').trim().toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) { }
    s = s.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!s || s === '.' || s === '..' || reserved.has(s)) return '';
    return s;
  }

  async function _promptAndCreateCustomExportRoot() {
    if (window.ExportRootsService && typeof window.ExportRootsService.promptNewRootFolder === 'function') {
      return window.ExportRootsService.promptNewRootFolder();
    }
    var label = await _showPrompt(
      _getExportText('exportNewRootFolderPrompt', 'Enter a name for the new export root folder (created under user/):'),
      ''
    );
    if (!label || !String(label).trim()) return null;
    var cleanLabel = String(label).trim();
    var folderName = _slugifyExportRoot(cleanLabel);
    if (!folderName) {
      if (typeof window.showToast === 'function') {
        window.showToast(_getExportText('exportRootReservedName', 'That folder name is reserved or invalid.'), true);
      }
      return null;
    }
    var current = await _fetchCustomExportRoots();
    if (current.some(function (r) { return r.folderName.toLowerCase() === folderName.toLowerCase(); })) {
      if (typeof window.showToast === 'function') {
        window.showToast(_getExportText('exportRootFolderExists', 'An export root folder with that name already exists.'), true);
      }
      return null;
    }
    var newRoot = { id: folderName, label: cleanLabel, folderName: folderName };
    var next = current.concat([newRoot]);
    if (window.Desktop && typeof Desktop.saveExportRoots === 'function') {
      var res = await Desktop.saveExportRoots({ roots: next });
      if (!res || !res.ok) {
        if (typeof window.showToast === 'function') window.showToast((res && res.error) || 'Failed to create folder.', true);
        return null;
      }
    }
    if (typeof window.showToast === 'function') {
      window.showToast(_getExportText('exportRootFolderAdded', 'Export root folder "{name}" created.').replace('{name}', cleanLabel));
    }
    return newRoot;
  }

  async function _renderCustomExportRootsInto(containerEl, onSelect, opts) {
    if (!containerEl) return;
    var roots = await _fetchCustomExportRoots();
    containerEl.innerHTML = '';
    if (!roots.length) {
      containerEl.style.display = 'none';
      return;
    }
    containerEl.style.display = 'flex';
    var compact = !!(opts && opts.compact);
    var descText = _getExportText('exportToCustomRootDesc', 'Direct save into this folder without browsing');
    roots.forEach(function (root) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-export-root-id', root.id);
      if (compact) {
        btn.className = (opts && opts.buttonClass) || 'btn';
        btn.style.cssText = 'display:flex;align-items:center;gap:8px;padding:9px 12px;justify-content:flex-start;width:100%;text-align:left;background:#fff;border:2px solid var(--neo-border-color,#333333);border-radius:6px;cursor:pointer;font-family:inherit;font-weight:700;font-size:0.88rem;color:var(--neo-dark,#222222);';
        var img = document.createElement('img');
        img.src = _dlgIconPrefix + 'folder.svg';
        img.alt = '';
        img.style.cssText = 'width:16px;height:16px;flex-shrink:0;';
        var span = document.createElement('span');
        span.textContent = root.label + ' (user/' + root.folderName + ')';
        btn.appendChild(img);
        btn.appendChild(span);
      } else {
        btn.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 14px;background:#fff;border:2px solid var(--neo-border-color,#333333);box-shadow:var(--neo-shadow-md,3px 3px 0 #555555);border-radius:var(--neo-radius-md,6px);cursor:pointer;text-align:left;transition:transform .08s,box-shadow .08s,background .12s;outline:none;font-family:inherit;';
        var iconBox = document.createElement('div');
        iconBox.style.cssText = 'width:34px;height:34px;border:1.5px solid var(--neo-border-color,#333333);border-radius:var(--neo-radius-sm,4px);background:#e0f2fe;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        var iconImg = document.createElement('img');
        iconImg.src = _dlgIconPrefix + 'folder.svg';
        iconImg.alt = '';
        iconImg.style.cssText = 'width:18px;height:18px;';
        iconBox.appendChild(iconImg);

        var textBox = document.createElement('div');
        textBox.style.cssText = 'flex:1;min-width:0;';
        var titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-size:0.9rem;font-weight:800;color:var(--neo-dark,#222222);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        titleDiv.textContent = root.label + ' (user/' + root.folderName + ')';
        var descDiv = document.createElement('div');
        descDiv.style.cssText = 'font-size:0.74rem;color:var(--neo-gray-dark,#475569);font-weight:600;margin-top:2px;';
        descDiv.textContent = descText;
        textBox.appendChild(titleDiv);
        textBox.appendChild(descDiv);

        btn.appendChild(iconBox);
        btn.appendChild(textBox);
        btn.addEventListener('mouseenter', function () { btn.style.background = '#f0f9ff'; });
        btn.addEventListener('mouseleave', function () { btn.style.background = '#fff'; });
        btn.addEventListener('mousedown', function () { btn.style.transform = 'translate(1px, 1px)'; btn.style.boxShadow = '2px 2px 0 #555555'; });
        btn.addEventListener('mouseup', function () { btn.style.transform = 'none'; btn.style.boxShadow = '3px 3px 0 #555555'; });
      }
      btn.addEventListener('click', function () {
        if (typeof onSelect === 'function') onSelect('exportRoot:' + root.id, root);
      });
      containerEl.appendChild(btn);
    });
  }

  function _isManagedExportDest(dest) {
    return dest === 'to-print' || (typeof dest === 'string' && dest.indexOf('exportRoot:') === 0);
  }

  function _resolveExportTarget(dest) {
    if (dest === 'to-print') return 'toPrint';
    if (typeof dest === 'string' && dest.indexOf('exportRoot:') === 0) return dest;
    return null;
  }

  async function _bindExportRootsInModal(containerEl, onSelect, opts) {
    if (!containerEl) return;
    var rootsWrap = containerEl.querySelector('.cmt-modal-custom-roots');
    if (!rootsWrap) {
      rootsWrap = document.createElement('div');
      rootsWrap.className = 'cmt-modal-custom-roots';
      rootsWrap.style.cssText = 'display:none;flex-direction:column;gap:8px;max-height:170px;overflow-y:auto;';
      containerEl.appendChild(rootsWrap);
    }
    var newBtn = containerEl.querySelector('.cmt-modal-new-root-btn');
    if (!newBtn) {
      newBtn = document.createElement('button');
      newBtn.type = 'button';
      newBtn.className = (opts && opts.newBtnClass) || 'btn';
      newBtn.classList.add('cmt-modal-new-root-btn');
      newBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 12px;background:#f8fafc;border:2px dashed var(--neo-border-color,#333333);border-radius:6px;cursor:pointer;font-size:0.84rem;font-weight:700;color:var(--neo-dark,#222222);width:100%;font-family:inherit;';
      var img = document.createElement('img');
      img.src = _dlgIconPrefix + 'plus.svg';
      img.alt = '';
      img.style.cssText = 'width:14px;height:14px;';
      var span = document.createElement('span');
      span.className = 'cmt-modal-new-root-label';
      newBtn.appendChild(img);
      newBtn.appendChild(span);
      containerEl.appendChild(newBtn);
    }
    var lbl = newBtn.querySelector('.cmt-modal-new-root-label');
    if (lbl) lbl.textContent = _getExportText('exportNewRootFolder', 'New Root Folder...');
    newBtn.onclick = async function () {
      var created = await _promptAndCreateCustomExportRoot();
      if (created) {
        await _renderCustomExportRootsInto(rootsWrap, onSelect, opts);
        var createdBtn = rootsWrap.querySelector('[data-export-root-id="' + created.id + '"]');
        if (createdBtn) createdBtn.focus();
      }
    };
    await _renderCustomExportRootsInto(rootsWrap, onSelect, opts);
  }

  window.checkPreviousSessionCrash = checkPreviousSessionCrash;
  window.checkScheduledBackupPrompt = checkScheduledBackupPrompt;
  window.showExportSuccessPopup = _showExportSuccessPopup;
  window.promptExportDestination = _promptExportDestination;
  window.saveExportWithDestination = _saveExportWithDestination;
  window.sendToDocumentEditor = _sendToDocumentEditor;
  window.resolveExportFilenameConflict = _resolveExportFilenameConflict;
  window.cmtRenderExportRootButtons = _renderCustomExportRootsInto;
  window.cmtPromptNewExportRoot = _promptAndCreateCustomExportRoot;
  window.cmtBindExportRootsInModal = _bindExportRootsInModal;
  window.cmtIsManagedExportDest = _isManagedExportDest;
  window.cmtResolveExportTarget = _resolveExportTarget;

  // ── Light Neobrutalist Hover Helper Card ──────────────────────────────────
  (function initHoverHelperCard() {
    if (typeof document === 'undefined') return;
    var hcStyle = document.createElement('style');
    hcStyle.textContent = [
      '#cmt-hover-card{',
      'position:fixed;top:0;left:0;',
      'max-width:220px;width:max-content;',
      'padding:5px 9px;',
      'background:#fafaf7;color:#222222;',
      'border:1.5px solid #333333;',
      'border-left:3px solid #e2c96e;',
      'border-radius:5px;',
      'box-shadow:2px 2px 0 #888888;',
      'font-family:"Lexend",system-ui,-apple-system,sans-serif;',
      'font-size:0.72rem;font-weight:500;line-height:1.35;',
      'z-index:10000005;pointer-events:none;',
      'opacity:0;will-change:opacity;',
      'transform:translate3d(var(--hc-x,0px),var(--hc-y,0px),0);',
      'transition:opacity 0.16s cubic-bezier(0.22,1,0.36,1);',
      'white-space:normal;word-wrap:break-word;',
      'user-select:none;-webkit-user-select:none;',
      '}',
      '#cmt-hover-card.cmt-hc-visible{',
      'opacity:0.96;',
      '}',
      '#cmt-hover-card .cmt-hc-title{',
      'font-weight:800;font-size:0.74rem;color:#111111;',
      'margin-bottom:2px;letter-spacing:0.2px;',
      '}',
      '#cmt-hover-card .cmt-hc-body{',
      'color:#334155;font-weight:500;',
      '}',
      '#cmt-hover-card strong{font-weight:700;color:#111111;}',
      '#cmt-hover-card em{font-style:italic;}',
      '#cmt-hover-card .cmt-hc-c-red{color:#9c2f2f;}',
      '#cmt-hover-card .cmt-hc-c-green{color:#1f6f43;}',
      '#cmt-hover-card .cmt-hc-c-blue{color:#2b5e99;}',
      '#cmt-hover-card .cmt-hc-c-amber{color:#8a6a10;}',
      '#cmt-hover-card .cmt-hc-c-purple{color:#574799;}',
      '#cmt-hover-card .cmt-hc-c-muted{color:#64748b;}'
    ].join('');
    document.head.appendChild(hcStyle);

    var cardEl = null;
    var titleEl = null;
    var bodyEl = null;
    var activeTarget = null;
    var showTimer = null;

    function ensureCard() {
      if (cardEl) return cardEl;
      cardEl = document.createElement('div');
      cardEl.id = 'cmt-hover-card';
      cardEl.setAttribute('role', 'tooltip');
      titleEl = document.createElement('div');
      titleEl.className = 'cmt-hc-title';
      titleEl.style.display = 'none';
      bodyEl = document.createElement('div');
      bodyEl.className = 'cmt-hc-body';
      cardEl.appendChild(titleEl);
      cardEl.appendChild(bodyEl);
      document.body.appendChild(cardEl);
      return cardEl;
    }

    function positionCard(target) {
      if (!cardEl || !target) return;
      var rect = target.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) return;
      var pad = 8;
      var gap = 8;
      var cardRect = cardEl.getBoundingClientRect();
      var cw = cardRect.width || 220;
      var ch = cardRect.height || 48;
      var x = rect.left + (rect.width - cw) / 2;
      if (x < pad) x = pad;
      if (x + cw > window.innerWidth - pad) x = Math.max(pad, window.innerWidth - cw - pad);
      var y = rect.bottom + gap;
      if (y + ch > window.innerHeight - pad) {
        var aboveY = rect.top - ch - gap;
        if (aboveY >= pad) y = aboveY;
        else y = Math.max(pad, window.innerHeight - ch - pad);
      }
      cardEl.style.setProperty('--hc-x', Math.round(x) + 'px');
      cardEl.style.setProperty('--hc-y', Math.round(y) + 'px');
    }

    var HC_COLORS = {
      red: '#c96b6b',
      green: '#6abf8e',
      blue: '#5b8fcc',
      amber: '#e2c96e',
      purple: '#8b7cc2'
    };

    function formatHoverText(raw) {
      var safe = String(raw)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      safe = safe.replace(/\\n|\r?\n/g, '<br>');
      safe = safe.replace(/\{(red|green|blue|amber|purple|muted):([^\n{}]+)\}/g, function (_, color, inner) {
        return '<span class="cmt-hc-c-' + color + '">' + inner + '</span>';
      });
      safe = safe.replace(/\*\*([^\s*](?:[^*\n]*?[^\s*])?)\*\*/g, '<strong>$1</strong>');
      safe = safe.replace(/(^|[^*\w])\*([^\s*](?:[^*\n]*?[^\s*])?)\*(?!\w)/g, '$1<em>$2</em>');
      return safe;
    }

    function showFor(target) {
      var text = target.getAttribute('data-hover-help');
      if (!text) return;
      var card = ensureCard();
      var accent = target.getAttribute('data-hover-help-accent');
      if (accent && HC_COLORS[accent]) {
        card.style.borderLeftColor = HC_COLORS[accent];
      } else if (accent && /^#[0-9a-fA-F]{3,8}$/.test(accent.trim())) {
        card.style.borderLeftColor = accent.trim();
      } else {
        card.style.borderLeftColor = '';
      }
      var titleText = target.getAttribute('data-hover-help-title');
      if (titleText) {
        titleEl.innerHTML = formatHoverText(titleText);
        titleEl.style.display = '';
      } else {
        titleEl.textContent = '';
        titleEl.style.display = 'none';
      }
      bodyEl.innerHTML = formatHoverText(text);
      positionCard(target);
      void card.offsetWidth;
      requestAnimationFrame(function () {
        if (activeTarget === target && cardEl) {
          positionCard(target);
          cardEl.classList.add('cmt-hc-visible');
        }
      });
    }

    function hideCard() {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      activeTarget = null;
      if (cardEl) cardEl.classList.remove('cmt-hc-visible');
    }

    function findHelpTarget(node) {
      if (!node || typeof node.closest !== 'function') return null;
      var neoAll = document.body && document.body.getAttribute('data-neo-hover-all') === '1';
      if (neoAll) {
        var titled = node.closest('[title]');
        if (titled && titled.tagName !== 'IFRAME') {
          var tVal = titled.getAttribute('title');
          titled.removeAttribute('title');
          if (tVal && tVal.trim()) {
            titled.setAttribute('data-hover-help', tVal.trim());
          }
        }
      }
      return node.closest('[data-hover-help]');
    }

    document.addEventListener('pointerover', function (e) {
      var target = findHelpTarget(e.target);
      if (!target) return;
      if (activeTarget === target) return;
      hideCard();
      activeTarget = target;
      showTimer = setTimeout(function () {
        if (activeTarget === target) showFor(target);
      }, 550);
    }, true);

    document.addEventListener('pointerout', function (e) {
      if (!activeTarget) return;
      var related = e.relatedTarget;
      if (related && activeTarget.contains(related)) return;
      if (findHelpTarget(e.target) === activeTarget) hideCard();
    }, true);

    document.addEventListener('focusin', function (e) {
      var target = findHelpTarget(e.target);
      if (!target) return;
      if (activeTarget === target) return;
      hideCard();
      activeTarget = target;
      showTimer = setTimeout(function () {
        if (activeTarget === target) showFor(target);
      }, 550);
    }, true);

    document.addEventListener('focusout', function () {
      if (activeTarget) hideCard();
    }, true);

    document.addEventListener('pointerdown', hideCard, true);
    document.addEventListener('scroll', hideCard, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideCard();
    }, true);
  })();
})();
