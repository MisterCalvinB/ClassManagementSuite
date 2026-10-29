/**
 * js/whisper-model-modal.js
 * On-Demand Whisper Speech Recognition Model Manager Modal
 * Handles switching, 1-click downloading, and deleting Whisper models.
 * Strictly adheres to the Light Neobrutalist design system and smooth-dom-sync.
 */

(function (global) {
  'use strict';

  var _whisperModalActiveOptions = null;
  var _activeDownloadModelId = null;

  function _t(key, fallback) {
    if (global.i18n && typeof global.i18n.t === 'function') {
      var val = global.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function _ensureModalElements() {
    if (document.getElementById('whisper-model-overlay')) return;

    var styleEl = document.createElement('style');
    styleEl.id = 'whisper-model-styles';
    styleEl.textContent = `
      .whisper-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 13500;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
      }
      .whisper-modal-dialog {
        background: #f5f5f0;
        border: 2px solid #333333;
        border-radius: 10px;
        box-shadow: 4px 4px 0 #555555;
        width: 100%;
        max-width: 680px;
        max-height: 88vh;
        display: flex;
        flex-direction: column;
        color: #222222;
        font-family: inherit;
        overflow: hidden;
        animation: whisperModalPop 0.16s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes whisperModalPop {
        from { transform: scale(0.96); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .whisper-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        background: #ffffff;
        border-bottom: 2px solid #333333;
        flex-shrink: 0;
      }
      .whisper-modal-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .whisper-modal-icon {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }
      .whisper-modal-title {
        margin: 0;
        font-size: 1.02rem;
        font-weight: 800;
        color: #111111;
        letter-spacing: -0.01em;
      }
      .whisper-modal-subtitle {
        margin: 2px 0 0 0;
        font-size: 0.76rem;
        color: #666666;
        font-weight: 600;
      }
      .whisper-modal-close-btn {
        background: #f5f5f0;
        border: 2px solid #333333;
        border-radius: 6px;
        box-shadow: 2px 2px 0 #555555;
        cursor: pointer;
        padding: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.1s ease, box-shadow 0.1s ease;
      }
      .whisper-modal-close-btn:hover {
        background: #e5e5dc;
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 #555555;
      }
      .whisper-modal-close-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 #555555;
      }
      .whisper-modal-close-btn img {
        width: 14px;
        height: 14px;
      }
      .whisper-modal-body {
        padding: 16px 18px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .whisper-model-card {
        background: #ffffff;
        border: 2px solid #333333;
        border-radius: 8px;
        box-shadow: 3px 3px 0 #555555;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: transform 0.12s ease;
      }
      .whisper-model-card.highlighted {
        border-color: #5b8fcc;
        box-shadow: 3px 3px 0 #5b8fcc;
      }
      .whisper-model-card.is-active {
        background: #fafffa;
        border-color: #337a4e;
      }
      .whisper-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .whisper-card-name {
        font-weight: 800;
        font-size: 0.95rem;
        color: #111111;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .whisper-badge {
        font-size: 0.68rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 2px 8px;
        border-radius: 4px;
        border: 1.5px solid #333333;
      }
      .whisper-badge.badge-active {
        background: #6abf8e;
        color: #ffffff;
      }
      .whisper-badge.badge-installed {
        background: #f0f0ea;
        color: #444444;
      }
      .whisper-badge.badge-download {
        background: #e2c96e;
        color: #222222;
      }
      .whisper-card-desc {
        font-size: 0.8rem;
        color: #555555;
        line-height: 1.35;
        margin: 0;
      }
      .whisper-specs-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        font-size: 0.74rem;
        font-weight: 700;
        color: #444444;
        margin-top: 2px;
      }
      .whisper-spec-chip {
        background: #f5f5f0;
        border: 1.5px solid #444444;
        border-radius: 4px;
        padding: 2px 7px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .whisper-spec-chip span.label {
        color: #777777;
        font-weight: 600;
      }
      .whisper-progress-wrap {
        display: none;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
      }
      .whisper-progress-track {
        background: #ecece6;
        border: 2px solid #333333;
        border-radius: 6px;
        height: 14px;
        overflow: hidden;
        position: relative;
      }
      .whisper-progress-fill {
        background: #5b8fcc;
        height: 100%;
        width: 0%;
        transition: width 0.15s ease;
      }
      .whisper-progress-labels {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.72rem;
        font-weight: 700;
        color: #444444;
      }
      .whisper-card-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
      }
      .whisper-btn {
        background: #ffffff;
        border: 2px solid #333333;
        border-radius: 6px;
        box-shadow: 2px 2px 0 #555555;
        font-family: inherit;
        font-size: 0.8rem;
        font-weight: 700;
        padding: 6px 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #222222;
        transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
      }
      .whisper-btn:hover:not(:disabled) {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 #555555;
      }
      .whisper-btn:active:not(:disabled) {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 #555555;
      }
      .whisper-btn:disabled {
        opacity: 0.65;
        cursor: default;
      }
      .whisper-btn-primary {
        background: #5b8fcc;
        color: #ffffff;
      }
      .whisper-btn-primary:hover:not(:disabled) {
        background: #4a7ebb;
      }
      .whisper-btn-download {
        background: #e2c96e;
        color: #111111;
      }
      .whisper-btn-download:hover:not(:disabled) {
        background: #d4b958;
      }
      .whisper-btn-active-state {
        background: #e2f4ea;
        color: #24683c;
        border-color: #337a4e;
        box-shadow: none;
        cursor: default;
      }
      .whisper-btn-delete {
        background: #fff;
        border-color: #c96b6b;
        color: #c96b6b;
      }
      .whisper-btn-delete:hover:not(:disabled) {
        background: #fdf2f2;
      }
      .whisper-btn img {
        width: 14px;
        height: 14px;
      }
      .whisper-modal-footer {
        padding: 12px 18px;
        background: #f5f5f0;
        border-top: 2px solid #333333;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        gap: 12px;
      }
      .whisper-footer-note {
        font-size: 0.72rem;
        color: #666666;
        font-weight: 600;
        line-height: 1.3;
        margin: 0;
      }
    `;
    document.head.appendChild(styleEl);

    var overlay = document.createElement('div');
    overlay.id = 'whisper-model-overlay';
    overlay.className = 'whisper-modal-overlay';
    overlay.style.display = 'none';
    overlay.onclick = function (e) {
      if (e.target === overlay) {
        window.closeWhisperModelManager();
      }
    };

    overlay.innerHTML = `
      <div id="whisper-model-dialog" class="whisper-modal-dialog" onclick="event.stopPropagation()">
        <div class="whisper-modal-header">
          <div class="whisper-modal-header-left">
            <img src="../assets/icons/dictation.svg" class="whisper-modal-icon" alt="" />
            <div>
              <h3 class="whisper-modal-title" data-i18n="whisperModelManagerTitle">${_t('whisperModelManagerTitle', 'Speech Recognition Models (Whisper AI)')}</h3>
              <p class="whisper-modal-subtitle" data-i18n="whisperModelManagerSubtitle">${_t('whisperModelManagerSubtitle', 'Select, download and switch between offline speech models.')}</p>
            </div>
          </div>
          <button type="button" class="whisper-modal-close-btn" onclick="closeWhisperModelManager()" title="${_t('btnClose', 'Close')}">
            <img src="../assets/icons/clear.svg" alt="" />
          </button>
        </div>
        <div class="whisper-modal-body" id="whisper-models-list">
          <!-- Dynamically populated model cards -->
        </div>
        <div class="whisper-modal-footer">
          <p class="whisper-footer-note">
            🔒 100% Offline AI. All transcription occurs on your device without sending voice data to the cloud.
          </p>
          <button type="button" class="whisper-btn" onclick="closeWhisperModelManager()">
            <span data-i18n="btnClose">${_t('btnClose', 'Close')}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  /**
   * Render model list cards into modal body
   */
  async function _renderModelsList() {
    var container = document.getElementById('whisper-models-list');
    if (!container) return;

    var result;
    if (global.SpeechTranscriber && typeof global.SpeechTranscriber.listAvailableModels === 'function') {
      result = await global.SpeechTranscriber.listAvailableModels();
    } else if (global.Desktop && typeof global.Desktop.whisperListModels === 'function') {
      result = await global.Desktop.whisperListModels();
    } else {
      result = { ok: true, activeModel: 'whisper-tiny', models: [] };
    }

    var models = (result && result.models) || [];
    var activeModelId = (result && result.activeModel) || (global.SpeechTranscriber && global.SpeechTranscriber.getActiveModel()) || 'whisper-tiny';

    container.innerHTML = '';

    models.forEach(function (m) {
      var card = document.createElement('div');
      card.className = 'whisper-model-card' + (m.id === activeModelId ? ' is-active' : '');
      card.id = 'whisper-card-' + m.id;

      if (_whisperModalActiveOptions && _whisperModalActiveOptions.highlightModelId === m.id) {
        card.classList.add('highlighted');
      }

      var badgeClass = 'badge-download';
      var badgeText = _t('whisperNotInstalled', 'Download Available');
      if (m.id === activeModelId) {
        badgeClass = 'badge-active';
        badgeText = _t('whisperActive', 'Active');
      } else if (m.isInstalled) {
        badgeClass = 'badge-installed';
        badgeText = _t('whisperInstalled', 'Installed');
      }

      var descKey = m.descriptionKey || (m.id === 'whisper-tiny' ? 'whisperTinyDesc' : (m.id === 'whisper-base' ? 'whisperBaseDesc' : 'whisperSmallDesc'));
      var descText = _t(descKey, m.name);

      var actionsHtml = '';
      if (m.id === activeModelId) {
        actionsHtml = `
          <button type="button" class="whisper-btn whisper-btn-active-state" disabled>
            <img src="../assets/icons/check.svg" alt="" />
            <span>${_t('whisperActive', 'Active')}</span>
          </button>
        `;
      } else if (m.isInstalled) {
        actionsHtml = `
          <button type="button" class="whisper-btn whisper-btn-primary" onclick="whisperManagerSelectModel('${m.id}')">
            <span>${_t('whisperSelectModel', 'Select as Active')}</span>
          </button>
        `;
        if (!m.isBundled) {
          actionsHtml += `
            <button type="button" class="whisper-btn whisper-btn-delete" onclick="whisperManagerDeleteModel('${m.id}')" title="${_t('whisperDeleteModelBtn', 'Delete Model')}">
              <img src="../assets/icons/delete.svg" alt="" />
            </button>
          `;
        }
      } else {
        if (m.webDisabled) {
          actionsHtml = `<span style="font-size:0.75rem;color:#888;">Desktop Only</span>`;
        } else {
          actionsHtml = `
            <button type="button" class="whisper-btn whisper-btn-download" id="whisper-dl-btn-${m.id}" onclick="whisperManagerDownloadModel('${m.id}')">
              <img src="../assets/icons/download.svg" alt="" />
              <span>${_t('whisperDownloadModelBtn', 'Download Model')}</span>
            </button>
          `;
        }
      }

      card.innerHTML = `
        <div class="whisper-card-top">
          <div class="whisper-card-name">
            <span>${m.name}</span>
          </div>
          <span class="whisper-badge ${badgeClass}">${badgeText}</span>
        </div>
        <p class="whisper-card-desc">${descText}</p>
        <div class="whisper-specs-row">
          <div class="whisper-spec-chip">
            <span class="label">${_t('whisperRelativeSpeed', 'Speed')}:</span>
            <span>${m.speedRating || '⚡⚡'} (${m.relativeSpeed || '1.0×'})</span>
          </div>
          <div class="whisper-spec-chip">
            <span class="label">${_t('whisperRamEstimate', 'RAM')}:</span>
            <span>${m.ramEstimate || '~200 MB'}</span>
          </div>
          <div class="whisper-spec-chip">
            <span class="label">${_t('whisperDiskSize', 'Size')}:</span>
            <span>${m.diskSize || '~50 MB'}</span>
          </div>
        </div>
        <div class="whisper-progress-wrap" id="whisper-progress-${m.id}">
          <div class="whisper-progress-track">
            <div class="whisper-progress-fill" id="whisper-fill-${m.id}"></div>
          </div>
          <div class="whisper-progress-labels">
            <span id="whisper-status-${m.id}">${_t('whisperDownloading', 'Downloading Speech Model...')}</span>
            <span id="whisper-pct-${m.id}">0%</span>
          </div>
        </div>
        <div class="whisper-card-actions" id="whisper-actions-${m.id}">
          ${actionsHtml}
        </div>
      `;

      container.appendChild(card);
    });
  }

  /**
   * Switch the active model
   */
  async function whisperManagerSelectModel(modelId) {
    try {
      if (global.SpeechTranscriber && typeof global.SpeechTranscriber.setActiveModel === 'function') {
        await global.SpeechTranscriber.setActiveModel(modelId);
      } else if (global.Desktop && typeof global.Desktop.whisperSetActiveModel === 'function') {
        await global.Desktop.whisperSetActiveModel(modelId);
      }

      _syncActiveModelEverywhere(modelId);
      await _renderModelsList();

      if (typeof global.showToast === 'function') {
        global.showToast(_t('whisperModelReady', 'Speech model ready for transcription!'));
      }
      if (_whisperModalActiveOptions && typeof _whisperModalActiveOptions.onModelChanged === 'function') {
        _whisperModalActiveOptions.onModelChanged(modelId);
      }
    } catch (err) {
      if (typeof global.showToast === 'function') {
        global.showToast('Failed to activate model: ' + (err.message || err), true);
      }
    }
  }

  /**
   * 1-Click Download model with live progress
   */
  async function whisperManagerDownloadModel(modelId) {
    if (_activeDownloadModelId) return;
    _activeDownloadModelId = modelId;

    var progWrap = document.getElementById('whisper-progress-' + modelId);
    var progFill = document.getElementById('whisper-fill-' + modelId);
    var progStatus = document.getElementById('whisper-status-' + modelId);
    var progPct = document.getElementById('whisper-pct-' + modelId);
    var dlBtn = document.getElementById('whisper-dl-btn-' + modelId);

    if (progWrap) progWrap.style.display = 'flex';
    if (dlBtn) dlBtn.disabled = true;

    try {
      if (global.SpeechTranscriber && typeof global.SpeechTranscriber.downloadModel === 'function') {
        await global.SpeechTranscriber.downloadModel(modelId, function (prog) {
          if (progFill) progFill.style.width = (prog.percent || 0) + '%';
          if (progPct) progPct.textContent = Math.round(prog.percent || 0) + '%';
          if (progStatus) {
            if (prog.phase === 'extracting') {
              progStatus.textContent = _t('whisperExtracting', 'Extracting model files...');
            } else {
              progStatus.textContent = _t('whisperDownloading', 'Downloading Speech Model...');
            }
          }
        });
      } else {
        throw new Error('SpeechTranscriber download API unavailable');
      }

      // Model successfully downloaded, automatically select it!
      _activeDownloadModelId = null;
      await whisperManagerSelectModel(modelId);
    } catch (err) {
      console.error('[WhisperModelModal] Download error:', err);
      _activeDownloadModelId = null;
      if (progWrap) progWrap.style.display = 'none';
      if (dlBtn) dlBtn.disabled = false;
      if (typeof global.showToast === 'function') {
        global.showToast(_t('whisperDownloadFailed', 'Model download failed') + ': ' + (err.message || err), true);
      }
    }
  }

  /**
   * Delete an installed model
   */
  async function whisperManagerDeleteModel(modelId) {
    var confirmMsg = _t('whisperConfirmDelete', 'Are you sure you want to delete this model to free up disk space? You can re-download it anytime.');
    var ok = false;
    if (typeof global.showConfirm === 'function') {
      ok = await global.showConfirm(confirmMsg);
    } else {
      ok = global.confirm(confirmMsg);
    }
    if (!ok) return;

    try {
      if (global.SpeechTranscriber && typeof global.SpeechTranscriber.deleteModel === 'function') {
        await global.SpeechTranscriber.deleteModel(modelId);
      } else if (global.Desktop && typeof global.Desktop.whisperDeleteModel === 'function') {
        await global.Desktop.whisperDeleteModel(modelId);
      }

      var currentActive = (global.SpeechTranscriber && global.SpeechTranscriber.getActiveModel()) || 'whisper-tiny';
      _syncActiveModelEverywhere(currentActive);
      await _renderModelsList();

      if (typeof global.showToast === 'function') {
        global.showToast('Model deleted successfully');
      }
      if (_whisperModalActiveOptions && typeof _whisperModalActiveOptions.onModelChanged === 'function') {
        _whisperModalActiveOptions.onModelChanged(currentActive);
      }
    } catch (err) {
      if (typeof global.showToast === 'function') {
        global.showToast('Failed to delete model: ' + (err.message || err), true);
      }
    }
  }

  /**
   * Sync active model labels across any widgets open on current page
   */
  function _syncActiveModelEverywhere(modelId) {
    // 1. Board dictation floating pill chip
    var pillName = document.getElementById('board-stt-model-name');
    if (pillName) {
      var shortName = 'Tiny';
      if (modelId === 'whisper-base') shortName = 'Base';
      if (modelId === 'whisper-small') shortName = 'Small';
      pillName.textContent = shortName;
    }

    // 2. Audio Transcript Studio dropdown
    var studioSelect = document.getElementById('con-transcript-model');
    if (studioSelect) {
      studioSelect.value = modelId;
    }
  }

  /**
   * Open the Model Manager Modal
   */
  function openWhisperModelManager(options) {
    _whisperModalActiveOptions = options || {};
    _ensureModalElements();

    var overlay = document.getElementById('whisper-model-overlay');
    if (overlay) overlay.style.display = 'flex';

    _renderModelsList();
  }

  /**
   * Close the Model Manager Modal
   */
  function closeWhisperModelManager() {
    var overlay = document.getElementById('whisper-model-overlay');
    if (overlay) overlay.style.display = 'none';
    _whisperModalActiveOptions = null;
  }

  // Global window exports
  global.openWhisperModelManager = openWhisperModelManager;
  global.closeWhisperModelManager = closeWhisperModelManager;
  global.whisperManagerSelectModel = whisperManagerSelectModel;
  global.whisperManagerDownloadModel = whisperManagerDownloadModel;
  global.whisperManagerDeleteModel = whisperManagerDeleteModel;

})(typeof window !== 'undefined' ? window : this);

