/**
 * js/slm-model-modal.js
 * On-Demand Offline Small Language Model (SLM) Manager Modal
 * Handles switching, 1-click downloading, and deleting local SLM tiers.
 * Strictly adheres to the Light Neobrutalist design system, electron-best-practices, and smooth-dom-sync.
 */

(function (global) {
  'use strict';

  var _slmModalActiveOptions = null;
  var _activeDownloadModelId = null;

  function _t(key, fallback) {
    if (global.i18n && typeof global.i18n.t === 'function') {
      var val = global.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function _resolveIconPath(iconFile) {
    try {
      var pathName = global.location && global.location.pathname ? global.location.pathname : '';
      if (pathName.indexOf('/pages/') === -1 && pathName.indexOf('\\pages\\') === -1) {
        return 'assets/icons/' + iconFile;
      }
    } catch (_) {}
    return '../assets/icons/' + iconFile;
  }

  function _ensureModalElements() {
    if (document.getElementById('slm-model-overlay')) return;

    var styleEl = document.createElement('style');
    styleEl.id = 'slm-model-styles';
    styleEl.textContent = [
      '.slm-modal-overlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 13600;',
      '  background: rgba(0, 0, 0, 0.45);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 16px;',
      '  box-sizing: border-box;',
      '}',
      '.slm-modal-dialog {',
      '  background: #f5f5f0;',
      '  border: 2px solid #333333;',
      '  border-radius: 10px;',
      '  box-shadow: 4px 4px 0 #555555;',
      '  width: 100%;',
      '  max-width: 700px;',
      '  max-height: 88vh;',
      '  display: flex;',
      '  flex-direction: column;',
      '  color: #222222;',
      '  font-family: inherit;',
      '  overflow: hidden;',
      '  animation: slmModalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1);',
      '}',
      '@keyframes slmModalPop {',
      '  from { transform: scale(0.96); opacity: 0; }',
      '  to { transform: scale(1); opacity: 1; }',
      '}',
      '.slm-modal-header {',
      '  padding: 14px 18px;',
      '  background: #ffffff;',
      '  border-bottom: 2px solid #333333;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  gap: 12px;',
      '  flex-shrink: 0;',
      '}',
      '.slm-modal-header-left {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 12px;',
      '}',
      '.slm-modal-icon {',
      '  width: 28px;',
      '  height: 28px;',
      '  padding: 5px;',
      '  background: #e2c96e;',
      '  border: 2px solid #333333;',
      '  border-radius: 6px;',
      '  box-shadow: 2px 2px 0 #555555;',
      '  box-sizing: border-box;',
      '}',
      '.slm-modal-title {',
      '  margin: 0;',
      '  font-size: 1.05rem;',
      '  font-weight: 800;',
      '  color: #222222;',
      '}',
      '.slm-modal-subtitle {',
      '  margin: 2px 0 0;',
      '  font-size: 0.76rem;',
      '  color: #666666;',
      '  font-weight: 600;',
      '}',
      '.slm-modal-close-btn {',
      '  background: #f5f5f0;',
      '  border: 2px solid #333333;',
      '  border-radius: 6px;',
      '  box-shadow: 2px 2px 0 #555555;',
      '  cursor: pointer;',
      '  padding: 6px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  user-select: none;',
      '  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;',
      '}',
      '.slm-modal-close-btn:hover {',
      '  background: #e5e5dc;',
      '  transform: translate(-1px, -1px);',
      '  box-shadow: 3px 3px 0 #555555;',
      '}',
      '.slm-modal-close-btn:active {',
      '  transform: translate(1px, 1px);',
      '  box-shadow: 1px 1px 0 #555555;',
      '}',
      '.slm-modal-close-btn img {',
      '  width: 14px;',
      '  height: 14px;',
      '}',
      '.slm-modal-body {',
      '  padding: 16px 18px;',
      '  overflow-y: auto;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 12px;',
      '}',
      '.slm-model-card {',
      '  background: #ffffff;',
      '  border: 2px solid #333333;',
      '  border-radius: 10px;',
      '  box-shadow: 3px 3px 0 #555555;',
      '  padding: 14px 16px;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 8px;',
      '  transition: transform 0.12s ease;',
      '}',
      '.slm-model-card.highlighted {',
      '  border-color: #5b8fcc;',
      '  box-shadow: 3px 3px 0 #5b8fcc;',
      '}',
      '.slm-model-card.is-active {',
      '  background: #fafffa;',
      '  border-color: #337a4e;',
      '}',
      '.slm-card-top {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  gap: 8px;',
      '}',
      '.slm-card-name {',
      '  font-weight: 800;',
      '  font-size: 0.95rem;',
      '  color: #111111;',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '}',
      '.slm-badge {',
      '  font-size: 0.68rem;',
      '  font-weight: 800;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.04em;',
      '  padding: 2px 8px;',
      '  border-radius: 4px;',
      '  border: 1.5px solid #333333;',
      '}',
      '.slm-badge.badge-active {',
      '  background: #6abf8e;',
      '  color: #ffffff;',
      '}',
      '.slm-badge.badge-installed {',
      '  background: #f0f0ea;',
      '  color: #444444;',
      '}',
      '.slm-badge.badge-download {',
      '  background: #e2c96e;',
      '  color: #222222;',
      '}',
      '.slm-card-desc {',
      '  font-size: 0.8rem;',
      '  color: #555555;',
      '  line-height: 1.38;',
      '  margin: 0;',
      '}',
      '.slm-specs-row {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 10px;',
      '  flex-wrap: wrap;',
      '  font-size: 0.74rem;',
      '  font-weight: 700;',
      '  color: #444444;',
      '  margin-top: 2px;',
      '}',
      '.slm-spec-chip {',
      '  background: #f5f5f0;',
      '  border: 1.5px solid #333333;',
      '  border-radius: 4px;',
      '  padding: 2px 8px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 5px;',
      '  box-shadow: 2px 2px 0 #888888;',
      '}',
      '.slm-spec-chip img {',
      '  width: 12px;',
      '  height: 12px;',
      '}',
      '.slm-spec-chip span.label {',
      '  color: #666666;',
      '  font-weight: 600;',
      '}',
      '.slm-progress-wrap {',
      '  display: none;',
      '  flex-direction: column;',
      '  gap: 4px;',
      '  margin-top: 4px;',
      '}',
      '.slm-progress-track {',
      '  background: #ecece6;',
      '  border: 2px solid #333333;',
      '  border-radius: 6px;',
      '  height: 14px;',
      '  overflow: hidden;',
      '  position: relative;',
      '}',
      '.slm-progress-fill {',
      '  background: #5b8fcc;',
      '  height: 100%;',
      '  width: 0%;',
      '  transition: transform 0.15s ease;',
      '}',
      '.slm-progress-labels {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  font-size: 0.72rem;',
      '  font-weight: 700;',
      '  color: #444444;',
      '}',
      '.slm-card-actions {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: flex-end;',
      '  gap: 8px;',
      '  margin-top: 4px;',
      '}',
      '.slm-btn {',
      '  background: #ffffff;',
      '  border: 2px solid #333333;',
      '  border-radius: 6px;',
      '  box-shadow: 3px 3px 0 #555555;',
      '  font-family: inherit;',
      '  font-size: 0.8rem;',
      '  font-weight: 700;',
      '  padding: 6px 12px;',
      '  cursor: pointer;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '  color: #222222;',
      '  user-select: none;',
      '  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;',
      '}',
      '.slm-btn:hover:not(:disabled) {',
      '  transform: translate(-1px, -1px);',
      '  box-shadow: 4px 4px 0 #555555;',
      '}',
      '.slm-btn:active:not(:disabled) {',
      '  transform: translate(1px, 1px);',
      '  box-shadow: 1px 1px 0 #888888;',
      '}',
      '.slm-btn:disabled {',
      '  opacity: 0.65;',
      '  cursor: default;',
      '}',
      '.slm-btn-primary {',
      '  background: #5b8fcc;',
      '  color: #ffffff;',
      '}',
      '.slm-btn-primary:hover:not(:disabled) {',
      '  background: #4a7ebb;',
      '}',
      '.slm-btn-download {',
      '  background: #e2c96e;',
      '  color: #111111;',
      '}',
      '.slm-btn-download:hover:not(:disabled) {',
      '  background: #d4b958;',
      '}',
      '.slm-btn-active-state {',
      '  background: #e2f4ea;',
      '  color: #24683c;',
      '  border-color: #337a4e;',
      '  box-shadow: none;',
      '  cursor: default;',
      '}',
      '.slm-btn-delete {',
      '  background: #ffffff;',
      '  border-color: #c96b6b;',
      '  color: #c96b6b;',
      '}',
      '.slm-btn-delete:hover:not(:disabled) {',
      '  background: #fdf2f2;',
      '}',
      '.slm-btn img {',
      '  width: 14px;',
      '  height: 14px;',
      '}',
      '.slm-modal-footer {',
      '  padding: 12px 18px;',
      '  background: #f5f5f0;',
      '  border-top: 2px solid #333333;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  flex-shrink: 0;',
      '  gap: 12px;',
      '}',
      '.slm-footer-note {',
      '  font-size: 0.72rem;',
      '  color: #555555;',
      '  font-weight: 600;',
      '  line-height: 1.35;',
      '  margin: 0;',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '}',
      '.slm-footer-note img {',
      '  width: 14px;',
      '  height: 14px;',
      '  flex-shrink: 0;',
      '}'
    ].join('\n');
    document.head.appendChild(styleEl);

    var overlay = document.createElement('div');
    overlay.id = 'slm-model-overlay';
    overlay.className = 'slm-modal-overlay';
    overlay.style.display = 'none';

    overlay.innerHTML = [
      '<div id="slm-model-dialog" class="slm-modal-dialog">',
      '  <div class="slm-modal-header">',
      '    <div class="slm-modal-header-left">',
      '      <img src="' + _resolveIconPath('sparkles.svg') + '" class="slm-modal-icon" alt="" />',
      '      <div>',
      '        <h3 class="slm-modal-title" data-i18n="slmModelManagerTitle">' + _t('slmModelManagerTitle', 'Offline Language Models (SLM AI)') + '</h3>',
      '        <p class="slm-modal-subtitle" data-i18n="slmModelManagerSubtitle">' + _t('slmModelManagerSubtitle', 'Download and switch local AI models for Board mind mapping, textual analysis, and Database autofill.') + '</p>',
      '      </div>',
      '    </div>',
      '    <button type="button" class="slm-modal-close-btn" data-slm-action="close" title="' + _t('btnClose', 'Close') + '">',
      '      <img src="' + _resolveIconPath('clear.svg') + '" alt="" />',
      '    </button>',
      '  </div>',
      '  <div class="slm-modal-body" id="slm-models-list"></div>',
      '  <div class="slm-modal-footer">',
      '    <p class="slm-footer-note">',
      '      <img src="' + _resolveIconPath('lock.svg') + '" alt="" />',
      '      <span data-i18n="slmOfflinePrivacyNote">' + _t('slmOfflinePrivacyNote', '100% Offline AI. All text generation and database autofill run locally on your computer.') + '</span>',
      '    </p>',
      '    <button type="button" class="slm-btn" data-slm-action="close">',
      '      <span data-i18n="btnClose">' + _t('btnClose', 'Close') + '</span>',
      '    </button>',
      '  </div>',
      '</div>'
    ].join('\n');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        closeSlmModelManager();
        return;
      }
      var actionBtn = e.target.closest('[data-slm-action]');
      if (!actionBtn) return;
      var act = actionBtn.getAttribute('data-slm-action');
      var modelId = actionBtn.getAttribute('data-model-id') || '';
      if (act === 'close') {
        closeSlmModelManager();
      } else if (act === 'select' && modelId) {
        slmManagerSelectModel(modelId);
      } else if (act === 'download' && modelId) {
        slmManagerDownloadModel(modelId);
      } else if (act === 'delete' && modelId) {
        slmManagerDeleteModel(modelId);
      }
    });

    document.body.appendChild(overlay);
  }

  async function _renderModelsList() {
    var container = document.getElementById('slm-models-list');
    if (!container) return;

    var result;
    if (global.SlmService && typeof global.SlmService.listAvailableModels === 'function') {
      result = await global.SlmService.listAvailableModels();
    } else if (global.Desktop && typeof global.Desktop.slmListModels === 'function') {
      result = await global.Desktop.slmListModels();
    } else {
      result = { ok: true, activeModel: '', models: [] };
    }

    var models = (result && result.models) || [];
    var activeModelId = (result && result.activeModel) || (global.SlmService && global.SlmService.getActiveModel()) || '';

    container.innerHTML = '';

    models.forEach(function (m) {
      var isActive = Boolean(activeModelId && m.id === activeModelId && m.isInstalled);
      var card = document.createElement('div');
      card.className = 'slm-model-card' + (isActive ? ' is-active' : '');
      card.id = 'slm-card-' + m.id;

      if (_slmModalActiveOptions && _slmModalActiveOptions.highlightModelId === m.id) {
        card.classList.add('highlighted');
      }

      var badgeClass = 'badge-download';
      var badgeText = _t('slmNotInstalled', 'Download Available');
      if (isActive) {
        badgeClass = 'badge-active';
        badgeText = _t('slmActive', 'Active');
      } else if (m.isInstalled) {
        badgeClass = 'badge-installed';
        badgeText = _t('slmInstalled', 'Installed');
      }

      var descKey = m.descriptionKey || (m.id === 'slm-ultra' ? 'slmUltraFastDesc' : (m.id === 'slm-fast' ? 'slmFastDesc' : (m.id === 'slm-balanced' ? 'slmBalancedDesc' : 'slmDeepDesc')));
      var defaultDesc = m.id === 'slm-ultra'
        ? 'Ultra-compact model (~370 MB, ~450 MB RAM). Highest token generation speed (~15–20 tok/s). Perfect for quick brainstorming, word definitions, and fast autofill.'
        : (m.id === 'slm-fast'
          ? 'Ultra-fast multilingual model (EN, FR, DE, IT). Ideal for instant node expansion, lexical fields, and quick autofill on any laptop.'
          : (m.id === 'slm-balanced'
            ? 'Recommended balance of speed and reasoning. Great for multi-field JSON database autofill, cohesive paragraphs, and gap-fills.'
            : 'Deep instruction model for nuanced literary analysis, thematic bridging, and rich pedagogical explanations.'));
      var descText = _t(descKey, defaultDesc);

      var actionsHtml = '';
      if (isActive) {
        actionsHtml = [
          '<button type="button" class="slm-btn slm-btn-active-state" disabled>',
          '  <img src="' + _resolveIconPath('check.svg') + '" alt="" />',
          '  <span>' + _t('slmActive', 'Active') + '</span>',
          '</button>',
          '<button type="button" class="slm-btn slm-btn-delete" data-slm-action="delete" data-model-id="' + m.id + '" title="' + _t('slmDeleteModelBtn', 'Delete Model') + '">',
          '  <img src="' + _resolveIconPath('delete.svg') + '" alt="" />',
          '</button>'
        ].join('');
      } else if (m.isInstalled) {
        actionsHtml = [
          '<button type="button" class="slm-btn slm-btn-primary" data-slm-action="select" data-model-id="' + m.id + '">',
          '  <span>' + _t('slmSelectModel', 'Select as Active') + '</span>',
          '</button>',
          '<button type="button" class="slm-btn slm-btn-delete" data-slm-action="delete" data-model-id="' + m.id + '" title="' + _t('slmDeleteModelBtn', 'Delete Model') + '">',
          '  <img src="' + _resolveIconPath('delete.svg') + '" alt="" />',
          '</button>'
        ].join('');
      } else {
        if (m.webDisabled) {
          actionsHtml = '<span style="font-size:0.75rem;color:#666666;font-weight:700;">' + _t('slmDesktopOnly', 'Desktop App Required') + '</span>';
        } else {
          actionsHtml = [
            '<button type="button" class="slm-btn slm-btn-download" id="slm-dl-btn-' + m.id + '" data-slm-action="download" data-model-id="' + m.id + '">',
            '  <img src="' + _resolveIconPath('download.svg') + '" alt="" />',
            '  <span>' + _t('slmDownloadModelBtn', 'Download Model') + '</span>',
            '</button>'
          ].join('');
        }
      }

      card.innerHTML = [
        '<div class="slm-card-top">',
        '  <div class="slm-card-name">',
        '    <span>' + m.name + '</span>',
        '  </div>',
        '  <span class="slm-badge ' + badgeClass + '">' + badgeText + '</span>',
        '</div>',
        '<p class="slm-card-desc">' + descText + '</p>',
        '<div class="slm-specs-row">',
        '  <div class="slm-spec-chip">',
        '    <img src="' + _resolveIconPath('zap.svg') + '" alt="" />',
        '    <span class="label">' + _t('slmRelativeSpeed', 'Speed') + ':</span>',
        '    <span>' + (m.speedRating || '2/3') + ' (' + (m.relativeSpeed || '1.0×') + ')</span>',
        '  </div>',
        '  <div class="slm-spec-chip">',
        '    <span class="label">' + _t('slmRamEstimate', 'RAM') + ':</span>',
        '    <span>' + (m.ramEstimate || '~800 MB') + '</span>',
        '  </div>',
        '  <div class="slm-spec-chip">',
        '    <img src="' + _resolveIconPath('storage.svg') + '" alt="" />',
        '    <span class="label">' + _t('slmDiskSize', 'Size') + ':</span>',
        '    <span>' + (m.diskSize || '~495 MB') + '</span>',
        '  </div>',
        '</div>',
        '<div class="slm-progress-wrap" id="slm-progress-' + m.id + '">',
        '  <div class="slm-progress-track">',
        '    <div class="slm-progress-fill" id="slm-fill-' + m.id + '"></div>',
        '  </div>',
        '  <div class="slm-progress-labels">',
        '    <span id="slm-status-' + m.id + '">' + _t('slmDownloading', 'Downloading AI Model...') + '</span>',
        '    <span id="slm-pct-' + m.id + '">0%</span>',
        '  </div>',
        '</div>',
        '<div class="slm-card-actions" id="slm-actions-' + m.id + '">',
        actionsHtml,
        '</div>'
      ].join('\n');

      container.appendChild(card);
    });
  }

  async function slmManagerSelectModel(modelId) {
    try {
      if (global.SlmService && typeof global.SlmService.setActiveModel === 'function') {
        await global.SlmService.setActiveModel(modelId);
      } else if (global.Desktop && typeof global.Desktop.slmSetActiveModel === 'function') {
        await global.Desktop.slmSetActiveModel(modelId);
      }

      _syncActiveSlmEverywhere(modelId);
      await _renderModelsList();

      if (typeof global.showToast === 'function') {
        global.showToast(_t('slmModelReady', 'Offline AI model activated and ready!'));
      }
      if (_slmModalActiveOptions) {
        if (typeof _slmModalActiveOptions.onModelChanged === 'function') {
          _slmModalActiveOptions.onModelChanged(modelId);
        }
        if (typeof _slmModalActiveOptions.onSelectModel === 'function') {
          _slmModalActiveOptions.onSelectModel(modelId);
        }
      }
    } catch (err) {
      if (typeof global.showToast === 'function') {
        global.showToast('Failed to activate AI model: ' + (err.message || err), true);
      }
    }
  }

  async function slmManagerDownloadModel(modelId) {
    if (_activeDownloadModelId) return;
    _activeDownloadModelId = modelId;

    var progWrap = document.getElementById('slm-progress-' + modelId);
    var progFill = document.getElementById('slm-fill-' + modelId);
    var progStatus = document.getElementById('slm-status-' + modelId);
    var progPct = document.getElementById('slm-pct-' + modelId);
    var dlBtn = document.getElementById('slm-dl-btn-' + modelId);

    if (progWrap) progWrap.style.display = 'flex';
    if (dlBtn) dlBtn.disabled = true;

    try {
      if (global.SlmService && typeof global.SlmService.downloadModel === 'function') {
        await global.SlmService.downloadModel(modelId, function (prog) {
          var pct = Math.max(0, Math.min(100, Number(prog.percent) || 0));
          if (progFill) progFill.style.width = pct + '%';
          if (progPct) progPct.textContent = Math.round(pct) + '%';
          if (progStatus) {
            if (prog.phase === 'extracting') {
              progStatus.textContent = _t('slmExtracting', 'Verifying model files...');
            } else if (prog.currentFile) {
              progStatus.textContent = _t('slmDownloading', 'Downloading AI Model...') + ' (' + prog.currentFile + ')';
            } else {
              progStatus.textContent = _t('slmDownloading', 'Downloading AI Model...');
            }
          }
        });
      } else {
        throw new Error('SlmService download API unavailable');
      }

      _activeDownloadModelId = null;
      await slmManagerSelectModel(modelId);
    } catch (err) {
      console.error('[SlmModelModal] Download error:', err);
      _activeDownloadModelId = null;
      if (progWrap) progWrap.style.display = 'none';
      if (dlBtn) dlBtn.disabled = false;
      if (typeof global.showToast === 'function') {
        global.showToast(_t('slmDownloadFailed', 'AI model download failed') + ': ' + (err.message || err), true);
      }
    }
  }

  async function slmManagerDeleteModel(modelId) {
    var confirmMsg = _t('slmConfirmDelete', 'Are you sure you want to delete this AI model to free up disk space? You can re-download it anytime.');
    var ok = false;
    if (typeof global.showConfirm === 'function') {
      ok = await global.showConfirm(confirmMsg);
    } else {
      ok = global.confirm(confirmMsg);
    }
    if (!ok) return;

    try {
      var res;
      if (global.SlmService && typeof global.SlmService.deleteModel === 'function') {
        res = await global.SlmService.deleteModel(modelId);
      } else if (global.Desktop && typeof global.Desktop.slmDeleteModel === 'function') {
        res = await global.Desktop.slmDeleteModel(modelId);
      }

      var currentActive = (res && res.activeModel) || (global.SlmService && global.SlmService.getActiveModel()) || '';
      _syncActiveSlmEverywhere(currentActive);
      await _renderModelsList();

      if (typeof global.showToast === 'function') {
        global.showToast(_t('slmModelDeleted', 'AI model deleted successfully.'));
      }
    } catch (err) {
      if (typeof global.showToast === 'function') {
        global.showToast('Failed to delete AI model: ' + (err.message || err), true);
      }
    }
  }

  function _syncActiveSlmEverywhere(modelId) {
    var badges = document.querySelectorAll('[data-slm-active-label]');
    var shortLabel = _t('slmNoModelShort', 'No Model');
    if (modelId === 'slm-ultra') shortLabel = 'SmolLM2 360M (Ultra)';
    else if (modelId === 'slm-fast') shortLabel = 'Qwen 0.5B (Fast)';
    else if (modelId === 'slm-balanced') shortLabel = 'Qwen 1.5B (Balanced)';
    else if (modelId === 'slm-deep') shortLabel = 'Qwen 1.8B (Deep)';

    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = shortLabel;
    }
  }

  function openSlmModelManager(options) {
    _slmModalActiveOptions = options || {};
    _ensureModalElements();

    var overlay = document.getElementById('slm-model-overlay');
    if (overlay) overlay.style.display = 'flex';

    _renderModelsList();
  }

  function closeSlmModelManager() {
    var overlay = document.getElementById('slm-model-overlay');
    if (overlay) overlay.style.display = 'none';
    if (_slmModalActiveOptions && typeof _slmModalActiveOptions.onClose === 'function') {
      try { _slmModalActiveOptions.onClose(); } catch (_) {}
    }
    _slmModalActiveOptions = null;
  }

  global.openSlmModelManager = openSlmModelManager;
  global.closeSlmModelManager = closeSlmModelManager;
  global.slmManagerSelectModel = slmManagerSelectModel;
  global.slmManagerDownloadModel = slmManagerDownloadModel;
  global.slmManagerDeleteModel = slmManagerDeleteModel;
  global.syncActiveSlmEverywhere = _syncActiveSlmEverywhere;

})(typeof window !== 'undefined' ? window : this);
