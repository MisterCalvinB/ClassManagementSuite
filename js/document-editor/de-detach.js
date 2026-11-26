/**
 * DeDetach - Detachable panel windows (CSS Editor, Script Editor, Mini DB)
 * synchronized with the main Document Editor window via BroadcastChannel.
 */
(function (global) {
  'use strict';

  const params = new URLSearchParams(global.location.search || '');
  const detachPanel = params.get('detach'); // 'css' | 'script' | 'minidb' | null
  const isDetached = detachPanel === 'css' || detachPanel === 'script' || detachPanel === 'minidb';

  const sessionId = isDetached
    ? (params.get('sessionId') || 'default')
    : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7));

  const channel = (typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('cmt-de-detach-' + sessionId)
    : null;

  const detachedPanels = new Set();
  let _applyingRemote = false;

  function _tr(key, fallback) {
    try {
      if (global.i18n && typeof global.i18n.t === 'function') {
        const v = global.i18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (_) {}
    return fallback;
  }

  function _panelTitle(panel) {
    if (panel === 'css') return _tr('deCssEditorBtn', 'CSS Editor');
    if (panel === 'script') return _tr('deScriptEditor', 'Script Editor');
    if (panel === 'minidb') return _tr('deMiniDbTitle', 'Mini DB');
    return 'Document Editor';
  }

  function _applyDetachedModeClasses() {
    if (!isDetached) return;
    document.body.classList.add('de-detached-mode', 'de-detach-' + detachPanel);
    const titleEl = document.getElementById('de-detached-title');
    if (titleEl) titleEl.textContent = _panelTitle(detachPanel);
    document.title = _panelTitle(detachPanel) + ' — Document Editor';
  }

  function _dockHideMainPanel(panel, isOut) {
    if (isDetached) return;
    if (panel === 'css') {
      if (isOut && typeof global.toggleCssEditor === 'function' && global.cssEditorVisible) {
        global.toggleCssEditor(false);
      }
      const btn = document.getElementById('btn-toggle-css-editor');
      if (btn) btn.classList.toggle('is-detached', isOut);
    } else if (panel === 'script') {
      if (isOut && typeof global.toggleScriptEditor === 'function' && global.scriptEditorVisible) {
        global.toggleScriptEditor(false);
      }
      const btn = document.getElementById('btn-toggle-script-editor');
      if (btn) btn.classList.toggle('is-detached', isOut);
    } else if (panel === 'minidb') {
      if (isOut && global.DeMiniDb && typeof global.DeMiniDb.togglePanel === 'function') {
        global.DeMiniDb.togglePanel(false);
      }
      const btn = document.getElementById('btn-toggle-db-panel');
      if (btn) btn.classList.toggle('is-detached', isOut);
    }
  }

  function _getCssEd() { return (typeof cssEditor !== 'undefined' && cssEditor) ? cssEditor : global.cssEditor; }
  function _getScriptEd() { return (typeof scriptEditor !== 'undefined' && scriptEditor) ? scriptEditor : global.scriptEditor; }

  function _applyRemoteCss(cssText) {
    const ed = _getCssEd();
    if (!ed) return;
    if (ed.getValue() === cssText) return;
    _applyingRemote = true;
    try {
      if (typeof global.deSetCssEditorValue === 'function') {
        global.deSetCssEditorValue(cssText, true);
      } else {
        ed.setValue(cssText || '');
      }
      if (!isDetached && typeof global.scheduleRender === 'function') {
        global.scheduleRender();
      }
    } finally {
      _applyingRemote = false;
    }
  }

  function _applyRemoteScript(scriptText) {
    const val = String(scriptText || '');
    const ed = _getScriptEd();
    _applyingRemote = true;
    try {
      if (ed && ed.getValue() !== val) {
        if (typeof global.deSetScriptEditorValue === 'function') {
          global.deSetScriptEditorValue(val);
        } else {
          ed.setValue(val);
        }
      } else {
        global.deScriptTextCache = val;
      }
      if (!isDetached) {
        global.scriptModified = true;
        global.docModified = true;
        if (typeof global.updateDocIndicator === 'function') global.updateDocIndicator();
      }
    } finally {
      _applyingRemote = false;
    }
  }

  function _applyRemoteMiniDb(state) {
    if (!global.DeMiniDb || typeof global.DeMiniDb.applyExternalState !== 'function') return;
    _applyingRemote = true;
    try {
      global.DeMiniDb.applyExternalState(state);
    } finally {
      _applyingRemote = false;
    }
  }

  function _sendInitState() {
    if (!channel || isDetached) return;
    const cssEd = _getCssEd();
    const scriptEd = _getScriptEd();
    const docNameVal = (typeof currentDocName !== 'undefined' && currentDocName) ? currentDocName : (global.currentDocName || 'Untitled');
    const docTypeVal = (typeof currentDocType !== 'undefined' && currentDocType) ? currentDocType : (global.currentDocType || 'md');
    channel.postMessage({
      type: 'init-state',
      docName: docNameVal,
      docType: docTypeVal,
      css: cssEd ? cssEd.getValue() : '',
      script: scriptEd ? scriptEd.getValue() : ((typeof deScriptTextCache !== 'undefined' ? deScriptTextCache : global.deScriptTextCache) || ''),
      miniDb: (global.DeMiniDb && typeof global.DeMiniDb.getState === 'function') ? global.DeMiniDb.getState() : null
    });
  }

  function _layoutDetachedEditor() {
    if (!isDetached) return;
    const doLayout = () => {
      const cssEd = _getCssEd();
      const scriptEd = _getScriptEd();
      if (detachPanel === 'css' && cssEd) cssEd.layout();
      if (detachPanel === 'script' && scriptEd) scriptEd.layout();
    };
    requestAnimationFrame(doLayout);
    setTimeout(doLayout, 60);
  }

  if (channel) {
    channel.addEventListener('message', (ev) => {
      const msg = ev.data;
      if (!msg || typeof msg !== 'object') return;

      if (!isDetached) {
        if (msg.type === 'hello') {
          if (msg.panel) {
            detachedPanels.add(msg.panel);
            _dockHideMainPanel(msg.panel, true);
          }
          _sendInitState();
        } else if (msg.type === 'bye') {
          if (msg.panel) {
            detachedPanels.delete(msg.panel);
            _dockHideMainPanel(msg.panel, false);
          }
        } else if (msg.type === 'css-update') {
          _applyRemoteCss(msg.css);
          global.docModified = true;
          global.cssModified = true;
          if (typeof global.updateDocIndicator === 'function') global.updateDocIndicator();
        } else if (msg.type === 'script-update') {
          _applyRemoteScript(msg.script);
        } else if (msg.type === 'minidb-update') {
          _applyRemoteMiniDb(msg.state);
          global.docModified = true;
          if (typeof global.updateDocIndicator === 'function') global.updateDocIndicator();
          if (typeof global.scheduleRender === 'function') global.scheduleRender();
        } else if (msg.type === 'insert-tag' && msg.tag) {
          if (typeof global.mpInsertTagAtCursor === 'function') {
            global.mpInsertTagAtCursor(msg.tag);
          } else if (typeof global.insertTextAtCursor === 'function') {
            global.insertTextAtCursor(msg.tag);
          }
        } else if (msg.type === 'open-batch-export') {
          if (typeof global.mpOpenExportModal === 'function') {
            global.mpOpenExportModal('@minidb@');
          }
        } else if (msg.type === 'open-connect-classes') {
          if (typeof global.mpOpenConnectModal === 'function') {
            global.mpOpenConnectModal();
          }
        } else if (msg.type === 'request-save') {
          if (typeof global.saveDoc === 'function') {
            Promise.resolve(global.saveDoc()).then(() => {
              if (channel) {
                const docNameVal = (typeof currentDocName !== 'undefined' && currentDocName) ? currentDocName : (global.currentDocName || 'Untitled');
                channel.postMessage({ type: 'save-ack', docName: docNameVal });
              }
            });
          }
        }
      } else {
        if (msg.type === 'init-state') {
          const docEl = document.getElementById('de-detached-doc-name');
          if (docEl) docEl.textContent = msg.docName || 'Untitled';
          if (detachPanel === 'css' && typeof msg.css === 'string') {
            _applyRemoteCss(msg.css);
          } else if (detachPanel === 'script' && typeof msg.script === 'string') {
            _applyRemoteScript(msg.script);
          } else if (detachPanel === 'minidb' && msg.miniDb) {
            _applyRemoteMiniDb(msg.miniDb);
          }
          _layoutDetachedEditor();
        } else if (msg.type === 'save-ack') {
          const docEl = document.getElementById('de-detached-doc-name');
          if (docEl && msg.docName) docEl.textContent = msg.docName;
          if (typeof global.showToast === 'function') {
            global.showToast((msg.docName ? msg.docName + ' — ' : '') + _tr('btnSave', 'Saved'));
          }
        } else if (msg.type === 'css-update' && detachPanel === 'css') {
          _applyRemoteCss(msg.css);
        } else if (msg.type === 'script-update' && detachPanel === 'script') {
          _applyRemoteScript(msg.script);
        } else if (msg.type === 'minidb-update' && detachPanel === 'minidb') {
          _applyRemoteMiniDb(msg.miniDb);
        }
      }
    });
  }

  function detach(panel) {
    if (isDetached) return;
    if (panel !== 'css' && panel !== 'script' && panel !== 'minidb') return;

    const reuseId = 'de-detach-' + panel + '-' + sessionId;
    if (global.electronApi && typeof global.electronApi.openHtml === 'function') {
      global.electronApi.openHtml({
        file: 'document-editor.html',
        query: { detach: panel, sessionId },
        width: 920,
        height: 640,
        reuseId
      });
    } else {
      const url = 'document-editor.html?detach=' + encodeURIComponent(panel) + '&sessionId=' + encodeURIComponent(sessionId);
      global.open(url, reuseId, 'width=920,height=640');
    }
    detachedPanels.add(panel);
    _dockHideMainPanel(panel, true);
  }

  function notifyCssChanged(cssText) {
    if (_applyingRemote || !channel) return;
    if (!isDetached && !detachedPanels.has('css')) return;
    channel.postMessage({ type: 'css-update', css: cssText });
  }

  function notifyScriptChanged(scriptText) {
    if (_applyingRemote || !channel) return;
    if (!isDetached && !detachedPanels.has('script')) return;
    channel.postMessage({ type: 'script-update', script: scriptText });
  }

  function notifyMiniDbChanged(state) {
    if (_applyingRemote || !channel) return;
    if (!isDetached && !detachedPanels.has('minidb')) return;
    channel.postMessage({ type: 'minidb-update', state });
  }

  function sendInsertTag(tag) {
    if (!isDetached || !channel || !tag) return false;
    channel.postMessage({ type: 'insert-tag', tag });
    return true;
  }

  function sendOpenBatchExport() {
    if (!isDetached || !channel) return false;
    channel.postMessage({ type: 'open-batch-export' });
    return true;
  }

  function sendOpenConnectClasses() {
    if (!isDetached || !channel) return false;
    channel.postMessage({ type: 'open-connect-classes' });
    return true;
  }

  function requestSave() {
    if (!isDetached || !channel) return false;
    channel.postMessage({ type: 'request-save' });
    return true;
  }

  function announceReady() {
    if (!isDetached || !channel) return;
    channel.postMessage({ type: 'hello', panel: detachPanel });
    _layoutDetachedEditor();
  }

  function wireButtons() {
    if (isDetached) {
      _applyDetachedModeClasses();
      const dockBtn = document.getElementById('btn-de-dock-back');
      if (dockBtn) {
        dockBtn.addEventListener('click', () => {
          global.close();
        });
      }
      global.addEventListener('beforeunload', () => {
        if (channel) channel.postMessage({ type: 'bye', panel: detachPanel });
      });
      if (detachPanel === 'minidb') {
        setTimeout(announceReady, 80);
      }
    } else {
      const bindDetach = (id, panel) => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            detach(panel);
          });
        }
      };
      bindDetach('btn-detach-css', 'css');
      bindDetach('btn-detach-script', 'script');
      bindDetach('btn-detach-minidb', 'minidb');
      wirePanelResizers();
    }
  }

  function wirePanelResizers() {
    const resizers = document.querySelectorAll('.de-panel-resizer[data-resize-target]');
    resizers.forEach((handle) => {
      const targetId = handle.getAttribute('data-resize-target');
      const panelEl = targetId ? document.getElementById(targetId) : null;
      if (!panelEl) return;

      try {
        const savedH = parseInt(localStorage.getItem('cmt-de-panel-h-' + targetId), 10);
        if (Number.isFinite(savedH) && savedH >= 100) {
          panelEl.style.height = Math.min(savedH, Math.max(260, global.innerHeight - 200)) + 'px';
        }
      } catch (_) {}

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startH = panelEl.getBoundingClientRect().height;
        const maxH = Math.max(260, global.innerHeight - 200);
        let rafPending = false;
        let lastH = startH;

        handle.classList.add('active');
        document.body.classList.add('de-resizing-panel');

        const layoutEditor = () => {
          if (targetId === 'css-editor-wrapper') {
            const ed = _getCssEd();
            if (ed) ed.layout();
          } else if (targetId === 'script-editor-wrapper') {
            const ed = _getScriptEd();
            if (ed) ed.layout();
          }
        };

        const onMove = (ev) => {
          lastH = Math.max(100, Math.min(maxH, Math.round(startH + (ev.clientY - startY))));
          if (rafPending) return;
          rafPending = true;
          requestAnimationFrame(() => {
            rafPending = false;
            panelEl.style.height = lastH + 'px';
            layoutEditor();
          });
        };

        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          handle.classList.remove('active');
          document.body.classList.remove('de-resizing-panel');
          panelEl.style.height = lastH + 'px';
          layoutEditor();
          try { localStorage.setItem('cmt-de-panel-h-' + targetId, String(lastH)); } catch (_) {}
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons);
  } else {
    wireButtons();
  }

  global.DeDetach = {
    isDetached: () => isDetached,
    getPanel: () => detachPanel,
    isApplyingRemote: () => _applyingRemote,
    detach,
    announceReady,
    notifyCssChanged,
    notifyScriptChanged,
    notifyMiniDbChanged,
    sendInsertTag,
    sendOpenBatchExport,
    sendOpenConnectClasses,
    requestSave
  };
})(typeof window !== 'undefined' ? window : this);
