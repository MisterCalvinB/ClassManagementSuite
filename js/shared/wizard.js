// Shared Light Neobrutalist Step-by-Step Wizard Component
// Exposes window.CmtWizard.open(config)
(function (root) {
  'use strict';

  function getIconPrefix() {
    if (typeof location !== 'undefined' && /\/pages\//.test(location.pathname)) {
      return '../assets/icons/';
    }
    return 'assets/icons/';
  }

  function iconHtml(name, cls) {
    if (!name) return '';
    var file = name.endsWith('.svg') ? name : (name + '.svg');
    return '<img src="' + getIconPrefix() + file + '" class="' + (cls || '') + '" alt="" />';
  }

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

  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  var _activeOverlay = null;
  var _activeKeyHandler = null;

  function closeActive() {
    if (_activeKeyHandler) {
      document.removeEventListener('keydown', _activeKeyHandler);
      _activeKeyHandler = null;
    }
    if (_activeOverlay) {
      _activeOverlay.remove();
      _activeOverlay = null;
    }
  }

  function open(config) {
    closeActive();
    var cfg = config || {};
    var steps = Array.isArray(cfg.steps) ? cfg.steps : [];
    if (!steps.length) return null;

    var state = Object.assign({}, cfg.initialState || {});
    var currentIdx = Math.max(0, Math.min(steps.length - 1, cfg.initialStep || 0));
    var maxVisitedIdx = currentIdx;
    var customFinishLabel = null;
    var nextEnabled = true;

    var overlay = document.createElement('div');
    overlay.className = 'cmt-wiz-overlay open';
    if (cfg.id) overlay.id = cfg.id;

    var maxW = cfg.width || '700px';
    overlay.innerHTML =
      '<div class="cmt-wiz-dialog" style="max-width:min(' + escHtml(maxW) + ',calc(100vw - 24px))" role="dialog" aria-modal="true">' +
        '<div class="cmt-wiz-header">' +
          '<div class="cmt-wiz-title-wrap">' +
            (cfg.icon ? iconHtml(cfg.icon, 'cmt-wiz-title-icon') : '') +
            '<h2 class="cmt-wiz-title">' + escHtml(cfg.title || tr('wizDefaultTitle', 'Guided Assistant')) + '</h2>' +
          '</div>' +
          '<button type="button" class="cmt-wiz-close" aria-label="' + escHtml(tr('close', 'Close')) + '">' +
            iconHtml('close.svg') +
          '</button>' +
        '</div>' +
        '<div class="cmt-wiz-stepper"></div>' +
        '<div class="cmt-wiz-body">' +
          '<div class="cmt-wiz-error" role="alert"></div>' +
          '<div class="cmt-wiz-step-content"></div>' +
        '</div>' +
        '<div class="cmt-wiz-footer">' +
          '<div class="cmt-wiz-footer-left"></div>' +
          '<div class="cmt-wiz-footer-right">' +
            '<button type="button" class="cmt-wiz-btn cmt-wiz-btn-back">' +
              iconHtml('arrow-left.svg') + ' <span>' + escHtml(tr('wizBack', 'Back')) + '</span>' +
            '</button>' +
            '<button type="button" class="cmt-wiz-btn cmt-wiz-btn-primary cmt-wiz-btn-next">' +
              '<span>' + escHtml(tr('wizNext', 'Next')) + '</span> ' + iconHtml('arrow-right.svg') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var stepperEl = overlay.querySelector('.cmt-wiz-stepper');
    var errorEl = overlay.querySelector('.cmt-wiz-error');
    var contentEl = overlay.querySelector('.cmt-wiz-step-content');
    var footerLeftEl = overlay.querySelector('.cmt-wiz-footer-left');
    var backBtn = overlay.querySelector('.cmt-wiz-btn-back');
    var nextBtn = overlay.querySelector('.cmt-wiz-btn-next');
    var closeBtn = overlay.querySelector('.cmt-wiz-close');

    function setError(msg) {
      if (!msg) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
      } else {
        errorEl.textContent = msg;
        errorEl.classList.add('show');
      }
    }

    function renderStepper() {
      stepperEl.innerHTML = '';
      steps.forEach(function (st, idx) {
        var pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'cmt-wiz-step-pill';
        var isDone = idx < currentIdx || (idx <= maxVisitedIdx && idx !== currentIdx);
        if (idx === currentIdx) pill.classList.add('is-active');
        else if (isDone) pill.classList.add('is-done');

        var numHtml = isDone
          ? '<span class="cmt-wiz-step-num">' + iconHtml('check.svg') + '</span>'
          : '<span class="cmt-wiz-step-num">' + (idx + 1) + '</span>';

        pill.innerHTML = numHtml + '<span>' + escHtml(st.label || ('Step ' + (idx + 1))) + '</span>';
        if (idx < currentIdx || idx <= maxVisitedIdx) {
          pill.addEventListener('click', function () {
            if (idx < currentIdx) {
              goTo(idx);
            } else if (idx > currentIdx && idx <= maxVisitedIdx) {
              attemptAdvanceTo(idx);
            }
          });
        }
        stepperEl.appendChild(pill);
      });
    }

    function renderFooter() {
      backBtn.style.display = currentIdx === 0 ? 'none' : 'inline-flex';
      var isLast = currentIdx === steps.length - 1;
      nextBtn.className = 'cmt-wiz-btn ' + (isLast ? 'cmt-wiz-btn-finish' : 'cmt-wiz-btn-primary') + ' cmt-wiz-btn-next';
      if (isLast) {
        var finishLbl = customFinishLabel || cfg.finishLabel || tr('wizFinish', 'Finish');
        var finishIcon = cfg.finishIcon || 'check.svg';
        nextBtn.innerHTML = iconHtml(finishIcon) + ' <span>' + escHtml(finishLbl) + '</span>';
      } else {
        nextBtn.innerHTML = '<span>' + escHtml(tr('wizNext', 'Next')) + '</span> ' + iconHtml('arrow-right.svg');
      }
      nextBtn.disabled = !nextEnabled;

      footerLeftEl.innerHTML = '';
      if (cfg.quickModeToggle && typeof cfg.quickModeToggle.onClick === 'function') {
        var showOnAll = !!cfg.quickModeToggle.alwaysShow;
        if (showOnAll || currentIdx === 0) {
          var qBtn = document.createElement('button');
          qBtn.type = 'button';
          qBtn.className = 'cmt-wiz-btn cmt-wiz-btn-subtle';
          qBtn.innerHTML = iconHtml(cfg.quickModeToggle.icon || 'settings.svg') +
            ' <span>' + escHtml(cfg.quickModeToggle.label || tr('wizQuickAdvanced', 'Quick / Advanced')) + '</span>';
          qBtn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            cfg.quickModeToggle.onClick(api, ev);
          });
          footerLeftEl.appendChild(qBtn);
        }
      }
    }

    function renderStep() {
      setError('');
      nextEnabled = true;
      renderStepper();
      var step = steps[currentIdx];
      contentEl.innerHTML = '';
      if (typeof step.onEnter === 'function') {
        step.onEnter(state, api);
      }
      if (typeof step.render === 'function') {
        step.render(contentEl, state, api);
      }
      renderFooter();
    }

    function goTo(idx) {
      if (idx < 0 || idx >= steps.length) return;
      currentIdx = idx;
      if (currentIdx > maxVisitedIdx) maxVisitedIdx = currentIdx;
      renderStep();
    }

    function attemptAdvanceTo(targetIdx) {
      var step = steps[currentIdx];
      if (typeof step.validate === 'function') {
        var res = step.validate(state, api);
        if (res !== true) {
          setError(typeof res === 'string' ? res : tr('wizValidationErr', 'Please complete this step before continuing.'));
          return false;
        }
      }
      goTo(targetIdx);
      return true;
    }

    async function handleNextOrFinish() {
      var step = steps[currentIdx];
      if (typeof step.validate === 'function') {
        var res = step.validate(state, api);
        if (res !== true) {
          setError(typeof res === 'string' ? res : tr('wizValidationErr', 'Please complete this step before continuing.'));
          return;
        }
      }
      if (currentIdx < steps.length - 1) {
        goTo(currentIdx + 1);
      } else if (typeof cfg.onFinish === 'function') {
        nextBtn.disabled = true;
        try {
          var out = await cfg.onFinish(state, api);
          if (out !== false) {
            close();
          }
        } catch (err) {
          setError(err && err.message ? err.message : String(err));
        } finally {
          nextBtn.disabled = !nextEnabled;
        }
      } else {
        close();
      }
    }

    function close() {
      closeActive();
      if (typeof cfg.onClose === 'function') {
        try { cfg.onClose(state); } catch (_) {}
      }
    }

    var api = {
      state: state,
      getStepIndex: function () { return currentIdx; },
      setState: function (patch) { Object.assign(state, patch || {}); },
      next: function () { return handleNextOrFinish(); },
      back: function () { if (currentIdx > 0) goTo(currentIdx - 1); },
      goTo: goTo,
      refresh: renderStep,
      close: close,
      setError: setError,
      setNextEnabled: function (val) {
        nextEnabled = !!val;
        nextBtn.disabled = !nextEnabled;
      },
      setFinishLabel: function (lbl) {
        customFinishLabel = lbl;
        if (currentIdx === steps.length - 1) renderFooter();
      },
      iconHtml: iconHtml,
      escHtml: escHtml,
      tr: tr,
      renderCards: function (container, items, selectedId, onSelect) {
        var grid = document.createElement('div');
        grid.className = 'cmt-wiz-cards';
        (items || []).forEach(function (item) {
          var card = document.createElement('button');
          card.type = 'button';
          card.className = 'cmt-wiz-card' + (item.id === selectedId ? ' is-selected' : '');
          card.innerHTML =
            '<div class="cmt-wiz-card-top">' +
              '<span class="cmt-wiz-card-icon-wrap">' + iconHtml(item.icon || 'file-text.svg') + '</span>' +
              (item.badge ? '<span class="cmt-wiz-card-badge">' + escHtml(item.badge) + '</span>' : '') +
            '</div>' +
            '<div class="cmt-wiz-card-title">' + escHtml(item.title) + '</div>' +
            (item.desc ? '<div class="cmt-wiz-card-desc">' + escHtml(item.desc) + '</div>' : '');
          card.addEventListener('click', function () {
            grid.querySelectorAll('.cmt-wiz-card').forEach(function (c) { c.classList.remove('is-selected'); });
            card.classList.add('is-selected');
            if (typeof onSelect === 'function') onSelect(item, card);
          });
          grid.appendChild(card);
        });
        container.appendChild(grid);
        return grid;
      }
    };

    backBtn.addEventListener('click', function () { api.back(); });
    nextBtn.addEventListener('click', function () { handleNextOrFinish(); });
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) close();
    });

    _activeKeyHandler = function (ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', _activeKeyHandler);

    document.body.appendChild(overlay);
    _activeOverlay = overlay;
    renderStep();
    return api;
  }

  root.CmtWizard = {
    open: open,
    close: closeActive
  };
})(typeof window !== 'undefined' ? window : this);
