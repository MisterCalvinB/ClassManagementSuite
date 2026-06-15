// Shared dialog utilities — toast, confirm modal, prompt modal.
// Include this script in any page to get showToast(), showConfirm(), showPrompt().
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
})();
