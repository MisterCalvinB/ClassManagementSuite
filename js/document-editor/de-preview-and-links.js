function deCleanWordForLookup(raw) {
  if (!raw) return '';
  let str = String(raw).trim();
  str = str.replace(/^[\s"'“”‘’«»()\[\]{}.,:;!?¿¡…—–*`#<>~|+=\/\\]+|[\s"'“”‘’«»()\[\]{}.,:;!?¿¡…—–*`#<>~|+=\/\\]+$/g, '').trim();
  const words = str.split(/\s+/).filter(Boolean);
  if (words.length > 3) {
    str = words[0];
  } else {
    str = words.join(' ');
  }
  return str.replace(/^[\s"'“”‘’«»()\[\]{}.,:;!?¿¡…—–*`#<>~|+=\/\\]+|[\s"'“”‘’«»()\[\]{}.,:;!?¿¡…—–*`#<>~|+=\/\\]+$/g, '').trim();
}

function deLookupWordInDictionary(explicitText) {
  let candidate = '';
  if (typeof explicitText === 'string' && explicitText.trim()) {
    candidate = explicitText;
  } else if (mdEditor && mdEditor.hasTextFocus && mdEditor.hasTextFocus()) {
    const sel = mdEditor.getSelection();
    if (sel && !sel.isEmpty()) {
      candidate = mdEditor.getModel().getValueInRange(sel);
    }
  }

  if (!candidate) {
    const winSel = window.getSelection();
    if (winSel && winSel.toString().trim()) {
      candidate = winSel.toString();
    }
  }

  const word = deCleanWordForLookup(candidate);

  if (window.electronBridge && typeof window.electronBridge.openDictionary === 'function') {
    window.electronBridge.openDictionary(word);
  } else if (window.electronApi && typeof window.electronApi.openHtml === 'function') {
    window.electronApi.openHtml({
      file: 'dictionary.html',
      query: word ? { q: word } : undefined,
      width: 880,
      height: 680,
      reuseId: 'dictionary'
    });
  } else {
    const url = 'dictionary.html' + (word ? '?q=' + encodeURIComponent(word) : '');
    window.open(url, 'cmt_quick_dictionary');
  }
}

function initPreviewDictionaryLookup() {
  const dictPill = document.getElementById('de-dict-selection-pill');
  const lookupBtn = document.getElementById('btn-de-dict-pill-lookup');

  if (lookupBtn) {
    lookupBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deLookupWordInDictionary();
      if (dictPill) dictPill.style.display = 'none';
    });
  }

  function updateDictPillPosition() {
    if (!dictPill) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      dictPill.style.display = 'none';
      return;
    }

    const previewContainer = document.getElementById('preview-content') || document.getElementById('preview-scroll');
    const fullPreviewContainer = document.getElementById('full-preview-content');
    const anchorNode = sel.anchorNode;

    const isInsidePreview = (previewContainer && previewContainer.contains(anchorNode)) ||
                            (fullPreviewContainer && fullPreviewContainer.contains(anchorNode));

    if (!isInsidePreview) {
      dictPill.style.display = 'none';
      return;
    }

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        dictPill.style.left = (rect.left + rect.width / 2) + 'px';
        dictPill.style.top = Math.max(10, rect.top) + 'px';
        dictPill.style.display = 'flex';
        return;
      }
    } catch (_) {}
    dictPill.style.display = 'none';
  }

  document.addEventListener('selectionchange', () => {
    requestAnimationFrame(updateDictPillPosition);
  });

  document.addEventListener('pointerdown', (e) => {
    if (dictPill && !dictPill.contains(e.target)) {
      dictPill.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      deLookupWordInDictionary();
    }
  });
}

// ── Persistence ───────────────────────────────────────────
function saveSplitState() {
  try { localStorage.setItem('cmt-doceditor-split', String(splitFraction)); } catch (e) { }
}

let previewZoom = 1;
let previewExactPdfMode = false;
let _exactPdfPaneSeq = 0;
const PREVIEW_ZOOM_MIN = 0.25;
const PREVIEW_ZOOM_MAX = 2.5;
const PREVIEW_ZOOM_STEP = 0.1;

function syncExactPdfButton() {
  const btn = document.getElementById('btn-preview-exact-pdf');
  if (btn) btn.classList.toggle('active', !!previewExactPdfMode);
}

function togglePreviewExactPdf() {
  if (!window.Desktop || !Desktop.isElectron()) {
    showToast(t('dePreviewExactPdfNoElectron') || 'Exact PDF preview requires the Electron desktop app.', true);
    return;
  }
  previewExactPdfMode = !previewExactPdfMode;
  syncExactPdfButton();
  if (previewExactPdfMode) {
    if (typeof deClearInspectorHighlights === 'function') deClearInspectorHighlights();
    const drawer = document.getElementById('de-inspector-drawer');
    if (drawer) drawer.setAttribute('hidden', '');
  }
  try { localStorage.setItem('cmt-doceditor-preview-exact-pdf', previewExactPdfMode ? '1' : '0'); } catch (e) { }
  renderPreview();
}

async function renderExactPdfInPane(container, html) {
  if (!container || !window.Desktop || !Desktop.isElectron()) return;
  const seq = ++_exactPdfPaneSeq;
  const scrollEl = document.getElementById('preview-scroll');
  const prevScrollTop = scrollEl ? scrollEl.scrollTop : 0;
  const exactBtn = document.getElementById('btn-preview-exact-pdf');
  if (exactBtn) exactBtn.classList.add('is-loading');

  try {
    const printData = await deBuildPrintDocumentHtml(null, html);
    if (seq !== _exactPdfPaneSeq || !previewExactPdfMode) return;

    const result = await Desktop.printPdf({
      html: printData.html,
      pdfOptions: printData.pdfOptions,
      previewOnly: true
    });
    if (seq !== _exactPdfPaneSeq || !previewExactPdfMode) return;

    if (result && result.ok && result.base64) {
      const pdfjsLib = await deEnsurePdfjsLib();
      if (seq !== _exactPdfPaneSeq || !previewExactPdfMode) return;

      const binaryStr = atob(result.base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const pdfDoc = await pdfjsLib.getDocument({
        data: bytes,
        standardFontDataUrl: new URL('../modules/standard_fonts/', location.href).href,
        wasmUrl: new URL('../modules/wasm/', location.href).href,
        disableFontFace: false
      }).promise;
      if (seq !== _exactPdfPaneSeq || !previewExactPdfMode) return;

      const dpr = Math.max(window.devicePixelRatio || 1, 2);
      const renderedPages = [];

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        if (seq !== _exactPdfPaneSeq || !previewExactPdfMode) return;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const displayWidth = Math.round(unscaledViewport.width * (96 / 72));
        const displayHeight = Math.round(unscaledViewport.height * (displayWidth / unscaledViewport.width));
        const scale = (displayWidth / unscaledViewport.width) * dpr;
        const viewport = page.getViewport({ scale });

        const offscreen = document.createElement('canvas');
        offscreen.width = viewport.width;
        offscreen.height = viewport.height;
        const ctx = offscreen.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (seq !== _exactPdfPaneSeq || !previewExactPdfMode) return;

        renderedPages.push({ displayWidth, displayHeight, offscreen });
      }

      if (seq !== _exactPdfPaneSeq || !previewExactPdfMode) return;

      container.classList.add('doc-preview', 'paged-mode');
      container.classList.remove('doc-pages-container');

      const existingWrapper = container.querySelector('.full-preview-pdf-pages');
      if (existingWrapper) {
        // In-place canvas update to avoid DOM teardown and flicker
        const existingWraps = Array.from(existingWrapper.querySelectorAll('.full-preview-pdf-canvas-wrap'));
        for (let i = 0; i < renderedPages.length; i++) {
          const item = renderedPages[i];
          let wrap = existingWraps[i];
          let canvas = wrap ? wrap.querySelector('canvas') : null;
          if (!wrap || !canvas) {
            wrap = document.createElement('div');
            wrap.className = 'full-preview-pdf-canvas-wrap';
            canvas = document.createElement('canvas');
            canvas.className = 'full-preview-pdf-canvas';
            wrap.appendChild(canvas);
            existingWrapper.appendChild(wrap);
          }
          wrap.style.width = item.displayWidth + 'px';
          if (canvas.width !== item.offscreen.width) canvas.width = item.offscreen.width;
          if (canvas.height !== item.offscreen.height) canvas.height = item.offscreen.height;
          canvas.style.width = item.displayWidth + 'px';
          canvas.style.height = item.displayHeight + 'px';
          const targetCtx = canvas.getContext('2d');
          targetCtx.clearRect(0, 0, canvas.width, canvas.height);
          targetCtx.drawImage(item.offscreen, 0, 0);
        }
        for (let i = renderedPages.length; i < existingWraps.length; i++) {
          existingWraps[i].remove();
        }
      } else {
        const pagesWrapper = document.createElement('div');
        pagesWrapper.className = 'full-preview-pdf-pages';
        renderedPages.forEach(item => {
          const wrap = document.createElement('div');
          wrap.className = 'full-preview-pdf-canvas-wrap';
          wrap.style.width = item.displayWidth + 'px';
          item.offscreen.className = 'full-preview-pdf-canvas';
          item.offscreen.style.width = item.displayWidth + 'px';
          item.offscreen.style.height = item.displayHeight + 'px';
          wrap.appendChild(item.offscreen);
          pagesWrapper.appendChild(wrap);
        });
        container.replaceChildren(pagesWrapper);
      }

      if (scrollEl) scrollEl.scrollTop = prevScrollTop;
      return;
    }
  } catch (err) {
    console.warn('Exact PDF pane preview fallback:', err);
  } finally {
    if (exactBtn && seq === _exactPdfPaneSeq) exactBtn.classList.remove('is-loading');
  }

  if (seq === _exactPdfPaneSeq) {
    await deRenderPagedPreview(container, html);
  }
}

function applyPreviewZoom(zoomVal, persist = true) {
  const clamped = Math.max(PREVIEW_ZOOM_MIN, Math.min(PREVIEW_ZOOM_MAX, Math.round(zoomVal * 100) / 100));
  previewZoom = clamped;
  const content = document.getElementById('preview-content');
  if (content) {
    content.style.zoom = clamped === 1 ? '' : String(clamped);
  }
  const resetBtn = document.getElementById('btn-preview-zoom-reset');
  if (resetBtn) {
    resetBtn.textContent = Math.round(clamped * 100) + '%';
  }
  const outBtn = document.getElementById('btn-preview-zoom-out');
  const inBtn = document.getElementById('btn-preview-zoom-in');
  if (outBtn) outBtn.disabled = clamped <= PREVIEW_ZOOM_MIN;
  if (inBtn) inBtn.disabled = clamped >= PREVIEW_ZOOM_MAX;
  if (persist) {
    try { localStorage.setItem('cmt-doceditor-preview-zoom', String(clamped)); } catch (e) { }
  }
}

function fitPreviewZoomToWidth() {
  const scrollEl = document.getElementById('preview-scroll');
  if (!scrollEl) return;
  const availW = Math.max(120, scrollEl.clientWidth - 40);
  let targetW = 794;
  if (typeof getPageDims === 'function') {
    const dims = getPageDims();
    if (dims && dims.w) targetW = Math.round(dims.w * 3.7795);
  }
  const sheet = document.querySelector('#preview-content .doc-page-sheet, #preview-content .full-preview-pdf-canvas-wrap');
  if (sheet && sheet.offsetWidth > 0) {
    targetW = sheet.offsetWidth;
  }
  applyPreviewZoom(availW / targetW);
}

async function loadPersistedState() {
  try {
    const s = localStorage.getItem('cmt-doceditor-split');
    if (s) splitFraction = Math.max(0.15, Math.min(0.85, parseFloat(s) || 0.5));
  } catch (e) { }
  applySplit();
  try {
    previewExactPdfMode = localStorage.getItem('cmt-doceditor-preview-exact-pdf') === '1' && !!(window.Desktop && Desktop.isElectron());
  } catch (e) { previewExactPdfMode = false; }
  syncExactPdfButton();
  try {
    const z = parseFloat(localStorage.getItem('cmt-doceditor-preview-zoom'));
    if (!Number.isNaN(z) && z >= PREVIEW_ZOOM_MIN && z <= PREVIEW_ZOOM_MAX) {
      applyPreviewZoom(z, false);
    } else {
      applyPreviewZoom(1, false);
    }
  } catch (e) { applyPreviewZoom(1, false); }
  deConfigureInlineStylesheetUi();
  await loadEditorSettings();
  applyEditorPrefs();
  applyShortcuts();
  applySnippetCompletions();
  if (!currentDocName && mdEditor && !mdEditor.getValue().trim()) {
    resetPageLayout();
    syncPopupToState();
    applyPageLayoutToPreview();
    updatePreviewFooter();
    deSyncCssEditorWithLayout(false);
  }
}

// ── Modals ────────────────────────────────────────────────
const _deOpenModalStack = [];
function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.removeAttribute('hidden');
  const idx = _deOpenModalStack.indexOf(id);
  if (idx !== -1) _deOpenModalStack.splice(idx, 1);
  _deOpenModalStack.push(id);
  if (el) el.style.zIndex = 2000 + _deOpenModalStack.length * 10;
}

function hideModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.setAttribute('hidden', '');
    el.style.zIndex = '';
  }
  const idx = _deOpenModalStack.indexOf(id);
  if (idx !== -1) _deOpenModalStack.splice(idx, 1);
}

function closeSettingsModal() {
  hideModal('settings-modal');
  disposeStgCssRuleEditor();
}

function openSaveModal(title, ext, callback) {
  document.getElementById('save-modal-title').textContent = title;
  document.getElementById('save-modal-label').textContent = 'Filename (' + ext + ')';
  document.getElementById('save-filename-input').placeholder = 'my-document' + ext;
  document.getElementById('save-filename-input').value = '';
  saveModalCallback = callback;
  showModal('save-modal');
  setTimeout(() => document.getElementById('save-filename-input').focus(), 40);
}

// ── Helpers ───────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


function updateDocIndicator() {
  const el = document.getElementById('doc-name-indicator');
  const name = currentDocName ? currentDocName.replace(/\.(md|html|typ|typst)$/i, '') : 'Untitled';
  el.textContent = name;
  document.title = (docModified ? '● ' : '') + name + ' — Document Editor';
  el.classList.toggle('modified', docModified);
  updatePinButtonState();
  updateDeDocLinksBadge();
  dePersistActiveDocState();
  if (window.Desktop && typeof Desktop.updateSessionContext === 'function') {
    let ctx = null;
    if (currentOpenedDiskPath) {
      ctx = {
        target: null,
        diskPath: currentOpenedDiskPath,
        relativePath: currentOpenedDiskPath,
        filename: currentDocName || 'Untitled.md',
        isDirty: !!docModified
      };
    } else if (currentEditTarget && currentEditRelPath) {
      ctx = {
        target: currentEditTarget,
        relativePath: currentEditRelPath,
        filename: currentDocName || currentEditRelPath.split(/[\/\\]/).pop(),
        isDirty: !!docModified
      };
    } else if (currentDocName && (currentDocStoredInDocs || currentDocSubdir)) {
      const relPath = currentDocSubdir ? (currentDocSubdir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') + '/' + currentDocName) : currentDocName;
      ctx = {
        target: 'docEditorDocs',
        relativePath: relPath,
        filename: currentDocName,
        isDirty: !!docModified
      };
    } else if (currentDocName && currentDocName !== 'Untitled.md' && currentDocName !== 'Untitled') {
      ctx = {
        target: 'docEditorDocs',
        relativePath: currentDocName,
        filename: currentDocName,
        isDirty: !!docModified
      };
    } else {
      ctx = {
        target: null,
        relativePath: '',
        filename: '',
        isDirty: !!docModified
      };
    }
    Desktop.updateSessionContext(ctx).catch(() => {});
  }
}

function dePersistActiveDocState() {
  if (!_initialLoadDone) return;
  try {
    if (currentOpenedDiskPath) {
      localStorage.setItem('cmt-doceditor-last-open', JSON.stringify({ diskPath: currentOpenedDiskPath, name: currentDocName }));
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + '?editAbsPath=' + encodeURIComponent(currentOpenedDiskPath));
      }
    } else if (currentEditTarget && currentEditRelPath) {
      localStorage.setItem('cmt-doceditor-last-open', JSON.stringify({ target: currentEditTarget, relPath: currentEditRelPath, name: currentDocName, subdir: currentDocSubdir, isDocs: currentDocStoredInDocs }));
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + '?editTarget=' + encodeURIComponent(currentEditTarget) + '&editRelPath=' + encodeURIComponent(currentEditRelPath));
      }
    } else if (currentDocStoredInDocs && currentDocName) {
      const relPath = currentDocSubdir ? (currentDocSubdir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') + '/' + currentDocName) : currentDocName;
      localStorage.setItem('cmt-doceditor-last-open', JSON.stringify({ target: 'docEditorDocs', relPath: relPath, name: currentDocName, subdir: currentDocSubdir, isDocs: true }));
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + '?editTarget=docEditorDocs&editRelPath=' + encodeURIComponent(relPath));
      }
    } else if (currentDocName) {
      localStorage.setItem('cmt-doceditor-last-open', JSON.stringify({ target: 'docEditorDocs', relPath: currentDocName, name: currentDocName, isDocs: true }));
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + '?editTarget=docEditorDocs&editRelPath=' + encodeURIComponent(currentDocName));
      }
    } else {
      localStorage.removeItem('cmt-doceditor-last-open');
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  } catch (_) {}
}

async function updatePinButtonState() {
  const pinBtn = document.getElementById('btn-pin-doc');
  const pinSep = document.getElementById('doc-pin-sep');
  if (!pinBtn) return;
  if (currentEditTarget && currentEditRelPath) {
    if (pinSep) pinSep.style.display = '';
    pinBtn.style.display = '';
    const pinned = await Pins.isPinned({
      type: 'doc',
      relativePath: currentEditRelPath,
      target: currentEditTarget
    });
    const key = pinned ? 'deUnpinDoc' : 'dePinDoc';
    const label = window.t ? t(key) : (pinned ? 'Unpin Document' : 'Pin Document');
    pinBtn.innerHTML = '<img src="../assets/icons/pin.svg" class="btn-icon" alt="" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;" /><span data-i18n="' + key + '">' + label + '</span>';
  } else {
    if (pinSep) pinSep.style.display = 'none';
    pinBtn.style.display = 'none';
  }
}

// ── Cross-App Document Tagging & Linking (Section 3.D) ────
let _deLinkedGradeUrn = null;
let _deLinkedRefFile = null;
let _deLinkedClassId = null;
let _deLinkedClassName = null;
let _deAllSavedLessons = [];
let _deSelectedLessonData = null;

function getDeActiveDocUrn() {
  if (currentOpenedDiskPath) {
    return 'cmt:file:' + currentOpenedDiskPath.replace(/\\/g, '/');
  }
  if (currentEditTarget && currentEditRelPath) {
    let normRel = currentEditRelPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (currentEditTarget === 'user' && normRel.startsWith('document-editor/docs/')) {
      normRel = normRel.slice('document-editor/docs/'.length);
      return 'cmt:doc:docEditorDocs/' + normRel;
    }
    if (currentEditTarget === 'user' && normRel.startsWith('doceditor/')) {
      normRel = normRel.slice('doceditor/'.length);
      return 'cmt:doc:docEditorDocs/' + normRel;
    }
    return 'cmt:doc:' + currentEditTarget + '/' + normRel;
  }
  if (currentDocSubdir) {
    const sub = currentDocSubdir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    return 'cmt:doc:docEditorDocs/' + (sub ? sub + '/' : '') + (currentDocName || 'doc.md');
  }
  if (currentDocName) {
    return 'cmt:doc:docEditorDocs/' + currentDocName;
  }
  return null;
}

function deResolveClassName(classId, fallbackName) {
  if (!classId) return fallbackName || '';
  const liveMeta = (mpState && mpState.classesMeta) ? mpState.classesMeta[classId] : null;
  if (liveMeta && liveMeta.name) return liveMeta.name;
  if (typeof LinksService !== 'undefined' && typeof LinksService.resolveClassName === 'function') {
    const resolved = LinksService.resolveClassName(classId);
    if (resolved && resolved !== classId) return resolved;
  }
  return fallbackName || classId;
}

async function updateDeDocLinksBadge(opts = {}) {
  const btn = document.getElementById('btn-de-doc-links');
  const textSpan = document.getElementById('btn-de-doc-links-text');
  const classBtn = document.getElementById('btn-de-class-tag');
  const classLabel = document.getElementById('de-class-tag-label');
  const gradeBtn = document.getElementById('btn-de-linked-grade');
  const gradeLabel = document.getElementById('de-linked-grade-label');
  const fileBtn = document.getElementById('btn-de-linked-file');
  const fileLabel = document.getElementById('de-linked-file-label');

  const urn = getDeActiveDocUrn();
  if (!urn || typeof LinksService === 'undefined') {
    if (btn) btn.style.display = 'none';
    if (classBtn) classBtn.style.display = 'none';
    if (gradeBtn) gradeBtn.style.display = 'none';
    if (fileBtn) fileBtn.style.display = 'none';
    return;
  }

  if (btn) btn.style.display = 'inline-flex';

  try {
    const links = await LinksService.getLinksFor(urn);
    const tags = await LinksService.getTagsFor(urn);
    const tagPart = tags.length ? ` | TAGS: ${tags.length}` : '';
    if (textSpan) {
      textSpan.textContent = `[LINKS: ${links.length}${tagPart}]`;
    } else if (btn) {
      btn.innerHTML = `<img src="../assets/icons/links.svg" class="btn-icon" alt="" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;" />[LINKS: ${links.length}${tagPart}]`;
    }

    // 1. Class Group Link(s)
    const classLinks = links.filter(l => l.otherUrn && l.otherUrn.startsWith('cmt:class:'));
    let classLink = classLinks[0];
    if (classLinks.length > 0) {
      const linkedIds = classLinks.map(l => l.otherUrn.slice('cmt:class:'.length)).filter(Boolean);
      _deLinkedClassId = linkedIds[0];
      if (typeof mpInit === 'function' && !mpState.loaded) {
        await mpInit();
      }
      if (window.mpState) {
        if (typeof mpConnectClasses === 'function') {
          const activeId = (mpState.connectedClassId && linkedIds.includes(mpState.connectedClassId))
            ? mpState.connectedClassId
            : linkedIds[0];
          mpConnectClasses(linkedIds, activeId, {
            silent: true,
            skipLinkSync: true,
            skipMiniDbSync: !(opts && opts.syncFromLinks)
          });
          if (opts && opts.syncFromLinks && mpState.previewEnabled && typeof renderPreview === 'function') {
            renderPreview();
          }
        } else if (!mpState.connectedClassId && typeof mpConnectClass === 'function') {
          mpConnectClass(_deLinkedClassId, { silent: true, skipLinkSync: true });
        }
      }
      let cName = deResolveClassName(_deLinkedClassId, classLink.meta && classLink.meta.className);
      _deLinkedClassName = linkedIds.length > 1 ? `${cName} +${linkedIds.length - 1}` : cName;
      if (classBtn) {
        classBtn.style.display = 'inline-flex';
        classBtn.style.background = '#fef08a';
        classBtn.style.color = '#713f12';
        classBtn.style.borderColor = '#000';
        if (classLabel) classLabel.textContent = `[CLASS: ${_deLinkedClassName}]`;
      }
    } else if (opts && opts.syncFromLinks) {
      _deLinkedClassId = null;
      _deLinkedClassName = null;
      if (window.mpState && typeof mpConnectClasses === 'function') {
        mpConnectClasses([], null, { silent: true, skipLinkSync: true });
        if (mpState.previewEnabled && typeof renderPreview === 'function') renderPreview();
      }
      if (classBtn) {
        classBtn.style.display = 'inline-flex';
        classBtn.style.background = '#f8fafc';
        classBtn.style.color = '#475569';
        classBtn.style.borderColor = '#000';
        if (classLabel) classLabel.textContent = `[+ CLASS]`;
      }
    } else if (mpState && mpState.connectedClassId) {
      _deLinkedClassId = mpState.connectedClassId;
      const baseName = (mpState.connectedClass && mpState.connectedClass.name) || mpState.connectedClassId;
      const extraCount = Array.isArray(mpState.connectedClassIds) && mpState.connectedClassIds.length > 1
        ? mpState.connectedClassIds.length - 1
        : 0;
      _deLinkedClassName = extraCount > 0 ? `${baseName} +${extraCount}` : baseName;
      if (classBtn) {
        classBtn.style.display = 'inline-flex';
        classBtn.style.background = '#fef08a';
        classBtn.style.color = '#713f12';
        classBtn.style.borderColor = '#000';
        if (classLabel) classLabel.textContent = `[CLASS: ${_deLinkedClassName}]`;
      }
    } else {
      _deLinkedClassId = null;
      _deLinkedClassName = null;
      if (classBtn) {
        classBtn.style.display = 'inline-flex';
        classBtn.style.background = '#f8fafc';
        classBtn.style.color = '#475569';
        classBtn.style.borderColor = '#000';
        if (classLabel) classLabel.textContent = `[+ CLASS]`;
      }
    }

    // 2. Grade Sheet Test Link
    let gradeLink = links.find(l => {
      if (!l.otherUrn) return false;
      return l.otherUrn.startsWith('cmt:grade:') ||
        l.otherUrn.startsWith('cmt:gradesheet:') ||
        l.otherUrn.startsWith('cmt:test:') ||
        l.otherUrn.startsWith('cmt:eval:');
    });
    if (gradeLink) {
      _deLinkedGradeUrn = gradeLink.otherUrn;
      let testName = (gradeLink.meta && (gradeLink.meta.testTitle || gradeLink.meta.label)) ||
        (gradeLink.targetMeta && gradeLink.targetMeta.title) ||
        'Evaluation';
      if (testName.length > 16) testName = testName.slice(0, 15) + '…';
      if (gradeBtn) {
        gradeBtn.style.display = 'inline-flex';
        gradeBtn.title = (t('deLinkedGradeSheet') || 'GRADE SHEET') + ': ' + testName;
        if (gradeLabel) gradeLabel.textContent = `[GRADE: ${testName}]`;
      }
    } else {
      _deLinkedGradeUrn = null;
      if (gradeBtn) gradeBtn.style.display = 'none';
    }

    // 3. Attached Reference File / PDF
    let fileLink = links.find(l => {
      if (!l.otherUrn) return false;
      const u = l.otherUrn.toLowerCase();
      return u.startsWith('cmt:file:') ||
        u.endsWith('.pdf') ||
        u.endsWith('.docx') ||
        u.endsWith('.doc') ||
        (l.meta && (l.meta.isAttachment || l.relation === 'reference_attachment' || l.relation === 'attachment'));
    });
    if (fileLink) {
      _deLinkedRefFile = fileLink.otherUrn;
      let rawName = (fileLink.meta && fileLink.meta.filename) ||
        fileLink.otherUrn.split(/[\\/]/).pop() ||
        'File';
      const isPdf = rawName.toLowerCase().endsWith('.pdf');
      let shortName = rawName.replace(/\.[^.]+$/, '');
      if (shortName.length > 14) shortName = shortName.slice(0, 13) + '…';
      if (fileBtn) {
        fileBtn.style.display = 'inline-flex';
        fileBtn.title = (isPdf ? (t('deAttachedPdf') || 'ATTACHED PDF') : (t('deAttachedFile') || 'ATTACHED FILE')) + ': ' + rawName;
        if (fileLabel) fileLabel.textContent = `[${isPdf ? 'PDF' : 'FILE'}: ${shortName}]`;
      }
    } else {
      _deLinkedRefFile = null;
      if (fileBtn) fileBtn.style.display = 'none';
    }

  } catch (_) {
    if (textSpan) textSpan.textContent = `[LINKS: 0]`;
  }
}
window.updateDeDocLinksBadge = updateDeDocLinksBadge;

function deOpenDocLinksModal() {
  const urn = getDeActiveDocUrn();
  if (!urn || typeof TagLinkModal === 'undefined') {
    if (typeof showToast === 'function') {
      showToast(t('dePleaseSaveBeforeLinking') || 'Please save the document before linking', true);
    }
    return;
  }
  const label = currentDocName || 'Document';
  TagLinkModal.open({
    urn: urn,
    label: label,
    type: 'document',
    onUpdate: function () {
      updateDeDocLinksBadge({ syncFromLinks: true });
    }
  });
}
window.deOpenDocLinksModal = deOpenDocLinksModal;

async function deSyncClassLinksToService(classIds) {
  const urn = getDeActiveDocUrn();
  if (!urn || typeof LinksService === 'undefined') return;
  const targetIds = Array.from(new Set((Array.isArray(classIds) ? classIds : []).filter(Boolean)));
  const targetSet = new Set(targetIds);
  try {
    const links = await LinksService.getLinksFor(urn);
    const existingClassIds = links
      .filter(l => l.otherUrn && l.otherUrn.startsWith('cmt:class:'))
      .map(l => l.otherUrn.slice('cmt:class:'.length));
    const existingSet = new Set(existingClassIds);

    for (const oldId of existingClassIds) {
      if (!targetSet.has(oldId)) {
        await LinksService.removeLink(urn, 'cmt:class:' + oldId);
      }
    }
    const metas = (window.mpState && mpState.classesMeta) || {};
    for (const newId of targetIds) {
      if (!existingSet.has(newId)) {
        const cMeta = metas[newId];
        const cName = cMeta ? (cMeta.name || newId) : newId;
        await LinksService.addLink(urn, 'cmt:class:' + newId, {
          relation: 'curriculum_class',
          meta: {
            className: cName,
            docTitle: (typeof currentDocName !== 'undefined' && currentDocName) || 'Document'
          }
        });
      }
    }
    await updateDeDocLinksBadge();
  } catch (_) {}
}
window.deSyncClassLinksToService = deSyncClassLinksToService;

// ── Class Group Linking (Feature 1) ──────────────────────
async function deOpenClassLinkModal() {
  const urn = getDeActiveDocUrn();
  if (!urn) {
    showToast(t('dePleaseSaveBeforeLinking') || 'Please save document before linking.', true);
    return;
  }
  if (typeof mpInit === 'function') await mpInit();
  const container = document.getElementById('de-link-class-toggles');
  const unlinkBtn = document.getElementById('btn-de-unlink-class');
  let linkedSet = new Set();
  if (typeof LinksService !== 'undefined') {
    try {
      const links = await LinksService.getLinksFor(urn);
      links.forEach(l => {
        if (l.otherUrn && l.otherUrn.startsWith('cmt:class:')) {
          linkedSet.add(l.otherUrn.slice('cmt:class:'.length));
        }
      });
    } catch (_) {}
  } else if (window.mpState && Array.isArray(mpState.connectedClassIds)) {
    mpState.connectedClassIds.forEach(id => linkedSet.add(id));
  } else if (_deLinkedClassId) {
    linkedSet.add(_deLinkedClassId);
  }

  if (container) {
    const metas = (window.mpState && mpState.classesMeta) || {};
    const keys = Object.keys(metas).filter(cid => {
      const c = metas[cid];
      return c && !c.archived && !c.isArchived;
    });
    container.innerHTML = keys.map(cid => {
      const c = metas[cid];
      const count = Array.isArray(c.students) ? c.students.length : 0;
      const checked = linkedSet.has(cid);
      return `<label class="mp-multi-class-chip${checked ? ' is-checked' : ''}">` +
        `<input type="checkbox" value="${escHtml(cid)}" ${checked ? 'checked' : ''} />` +
        `<span>${escHtml(c.name || cid)} (${count})</span>` +
        `</label>`;
    }).join('');
    if (!container._deDelegated) {
      container._deDelegated = true;
      container.addEventListener('change', (e) => {
        const cb = e.target.closest('input[type="checkbox"]');
        if (!cb) return;
        const chip = cb.closest('.mp-multi-class-chip');
        if (chip) chip.classList.toggle('is-checked', cb.checked);
      });
    }
  }
  if (unlinkBtn) {
    unlinkBtn.style.display = linkedSet.size > 0 ? 'inline-block' : 'none';
  }
  showModal('de-class-link-modal');
}
window.deOpenClassLinkModal = deOpenClassLinkModal;

function deCloseClassLinkModal() {
  hideModal('de-class-link-modal');
}
window.deCloseClassLinkModal = deCloseClassLinkModal;

async function deConfirmClassLink() {
  const container = document.getElementById('de-link-class-toggles');
  const checkedIds = container
    ? Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value)
    : [];
  const urn = getDeActiveDocUrn();
  if (!urn) return;

  if (checkedIds.length === 0) {
    await deUnlinkCurrentClass();
    return;
  }

  await deSyncClassLinksToService(checkedIds);

  if (typeof mpConnectClasses === 'function') {
    const activeId = (window.mpState && mpState.connectedClassId && checkedIds.includes(mpState.connectedClassId))
      ? mpState.connectedClassId
      : checkedIds[0];
    mpConnectClasses(checkedIds, activeId, { silent: true, skipLinkSync: true });
    if (window.mpState && mpState.previewEnabled && typeof renderPreview === 'function') {
      renderPreview();
    }
  }

  const metas = (window.mpState && mpState.classesMeta) || {};
  const firstMeta = metas[checkedIds[0]];
  const firstName = firstMeta ? (firstMeta.name || checkedIds[0]) : checkedIds[0];
  _deLinkedClassId = checkedIds[0];
  _deLinkedClassName = checkedIds.length > 1 ? `${firstName} +${checkedIds.length - 1}` : firstName;
  hideModal('de-class-link-modal');
  await updateDeDocLinksBadge();
  showToast((t('deClassLinked') || 'Class linked to document: ') + _deLinkedClassName);
}
window.deConfirmClassLink = deConfirmClassLink;

async function deUnlinkCurrentClass() {
  await deSyncClassLinksToService([]);
  if (typeof mpConnectClasses === 'function') {
    mpConnectClasses([], null, { silent: true, skipLinkSync: true });
    if (window.mpState && mpState.previewEnabled && typeof renderPreview === 'function') {
      renderPreview();
    }
  }
  _deLinkedClassId = null;
  _deLinkedClassName = null;
  hideModal('de-class-link-modal');
  await updateDeDocLinksBadge();
  showToast(t('deClassUnlinked') || 'Class unlinked from document');
}
window.deUnlinkCurrentClass = deUnlinkCurrentClass;

// ── Grade Sheet Quick Launch (Feature 3) ──────────────────
async function deOpenLinkedGradeSheet() {
  if (!_deLinkedGradeUrn) return;
  if (typeof LinksService !== 'undefined') {
    await LinksService.openUrn(_deLinkedGradeUrn);
  }
}
window.deOpenLinkedGradeSheet = deOpenLinkedGradeSheet;

// ── Reference File / PDF Quick Launch & Attach (Feature 4) ─
async function deOpenLinkedRefFile() {
  if (!_deLinkedRefFile) return;
  let filePath = _deLinkedRefFile;
  if (filePath.startsWith('cmt:file:')) {
    filePath = filePath.slice('cmt:file:'.length);
  }
  if (window.Desktop && typeof Desktop.openNative === 'function') {
    Desktop.openNative({ absolutePath: filePath });
  } else {
    window.open(filePath, '_blank');
  }
}
window.deOpenLinkedRefFile = deOpenLinkedRefFile;

async function deAttachReferenceFile() {
  if (!window.Desktop || !Desktop.isElectron()) {
    showToast(t('deOpenFromDiskNoElectron') || 'File linking requires the desktop app.', true);
    return;
  }
  const r = await Desktop.pickAndReadFile([
    { name: t('deDocFilterName') || 'Documents & PDFs', extensions: ['pdf', 'docx', 'doc', 'txt', 'html', 'md'] },
    { name: t('deAllFilesFilter') || 'All Files', extensions: ['*'] }
  ]);
  if (!r || r.canceled || !r.path) return;

  const urn = getDeActiveDocUrn();
  if (!urn) {
    showToast(t('dePleaseSaveBeforeLinking') || 'Please save document before attaching files.', true);
    return;
  }

  const fileUrn = 'cmt:file:' + r.path.replace(/\\/g, '/');
  if (typeof LinksService !== 'undefined') {
    await LinksService.addLink(urn, fileUrn, {
      relation: 'reference_attachment',
      meta: {
        filename: r.name,
        isAttachment: true,
        docTitle: currentDocName || 'Document'
      }
    });
    updateDeDocLinksBadge();
    showToast(t('deRefFileAttached') || 'Reference file attached and linked to document!');
  }
}
window.deAttachReferenceFile = deAttachReferenceFile;

// ── Pull Lesson & Generate Handout (Feature 2) ─────────────
async function deOpenPullLessonModal() {
  const modal = document.getElementById('de-pull-lesson-modal');
  if (!modal) return;
  showModal('de-pull-lesson-modal');

  const sel = document.getElementById('de-lesson-select');
  if (sel) sel.innerHTML = '<option value="">' + (t('commonLoading') || 'Loading…') + '</option>';
  const previewBox = document.getElementById('de-lesson-preview-box');
  if (previewBox) previewBox.style.display = 'none';

  _deAllSavedLessons = [];
  const isElec = window.Desktop && (typeof Desktop.isElectron === 'function' ? Desktop.isElectron() : !!Desktop.isElectron);

  if (isElec && typeof Desktop.listFiles === 'function') {
    try {
      const res = await Desktop.listFiles('lessons', { extensions: ['.json'] });
      const list = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
      for (let i = 0; i < list.length; i++) {
        const fn = typeof list[i] === 'string' ? list[i] : (list[i].filename || list[i].name);
        if (!fn) continue;
        try {
          const rText = await Desktop.readText('lessons', fn);
          if (rText && rText.ok && rText.content) {
            const parsed = JSON.parse(rText.content);
            if (parsed) {
              _deAllSavedLessons.push({
                filename: fn,
                title: parsed.title || fn.replace(/\.json$/i, ''),
                subject: parsed.subject || '',
                classId: parsed.classId || '',
                data: parsed
              });
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  if (!_deAllSavedLessons.length) {
    try {
      const raw = localStorage.getItem('cmt_lesson_plans');
      if (raw) {
        const localList = JSON.parse(raw);
        if (Array.isArray(localList)) {
          localList.forEach((l, idx) => {
            _deAllSavedLessons.push({
              filename: 'local_lesson_' + (l.id || idx) + '.json',
              title: l.title || ('Lesson ' + (idx + 1)),
              subject: l.subject || '',
              classId: l.classId || '',
              data: l
            });
          });
        }
      }
    } catch (_) {}
  }

  if (typeof mpInit === 'function' && !mpState.loaded) {
    await mpInit();
  }
  const execBtn = document.getElementById('de-btn-exec-handout');
  if (sel) {
    if (!_deAllSavedLessons.length) {
      sel.innerHTML = '<option value="">' + (t('deNoLessonPlansFound') || 'No saved lesson plans found.') + '</option>';
      if (execBtn) execBtn.disabled = true;
    } else {
      if (execBtn) execBtn.disabled = false;
      sel.innerHTML = '<option value="">' + (t('deSelectLessonPrompt') || 'Select a lesson plan…') + '</option>' +
        _deAllSavedLessons.map((l, idx) => {
          const subPart = l.subject ? (' • ' + l.subject) : '';
          const clsName = l.classId ? deResolveClassName(l.classId, l.data && l.data.className) : '';
          const clsPart = clsName ? (' [' + clsName + ']') : '';
          return '<option value="' + idx + '">' + escHtml(l.title + subPart + clsPart) + '</option>';
        }).join('');

      if (_deLinkedClassId) {
        const matchingIdx = _deAllSavedLessons.findIndex(l => l.classId === _deLinkedClassId);
        if (matchingIdx >= 0) {
          sel.value = matchingIdx;
          deOnLessonSelected();
        }
      }
    }
  }
}
window.deOpenPullLessonModal = deOpenPullLessonModal;

function deClosePullLessonModal() {
  hideModal('de-pull-lesson-modal');
}
window.deClosePullLessonModal = deClosePullLessonModal;

function deOnLessonSelected() {
  const sel = document.getElementById('de-lesson-select');
  const idx = sel ? parseInt(sel.value, 10) : -1;
  const previewBox = document.getElementById('de-lesson-preview-box');
  if (isNaN(idx) || idx < 0 || !_deAllSavedLessons[idx]) {
    _deSelectedLessonData = null;
    if (previewBox) previewBox.style.display = 'none';
    return;
  }
  const lesson = _deAllSavedLessons[idx];
  _deSelectedLessonData = lesson;

  if (previewBox) previewBox.style.display = 'block';
  document.getElementById('de-lesson-preview-title').textContent = lesson.title || 'Lesson';
  const previewClsName = lesson.classId ? deResolveClassName(lesson.classId, lesson.data && lesson.data.className) : '';
  document.getElementById('de-lesson-preview-meta').textContent = (lesson.subject || 'Subject') + (previewClsName ? (' • Class ' + previewClsName) : '');

  const d = lesson.data || {};
  let words = [];
  if (Array.isArray(d.vocabulary)) words = d.vocabulary;
  else if (typeof d.vocabulary === 'string') words = d.vocabulary.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  if (Array.isArray(d.keyConcepts)) words = words.concat(d.keyConcepts);
  else if (typeof d.keyConcepts === 'string') words = words.concat(d.keyConcepts.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean));

  const vEl = document.getElementById('de-lesson-preview-vocab');
  if (vEl) {
    if (words.length) {
      vEl.innerHTML = words.slice(0, 15).map(w => {
        const term = typeof w === 'string' ? w : (w.word || w.term || JSON.stringify(w));
        return '<span style="background:#fef08a;border:1px solid #000;color:#000;font-size:0.75rem;padding:2px 6px;border-radius:2px;font-weight:700;">' + escHtml(term) + '</span>';
      }).join('');
    } else {
      vEl.innerHTML = '<span style="color:#888;font-size:0.75rem;">No explicit vocabulary list recorded in this lesson.</span>';
    }
  }

  const pEl = document.getElementById('de-lesson-preview-phases');
  const sections = Array.isArray(d.sections) ? d.sections : (Array.isArray(d.phases) ? d.phases : []);
  if (pEl) {
    if (sections.length) {
      pEl.innerHTML = sections.map((s, sIdx) => {
        const sTitle = s.title || ('Phase ' + (sIdx + 1));
        const sObj = s.objective || s.description || '';
        return '<div style="margin-bottom:3px;"><strong>' + escHtml(sTitle) + ':</strong> ' + escHtml(sObj || 'Core activity') + '</div>';
      }).join('');
    } else {
      pEl.innerHTML = '<span style="color:#888;font-size:0.75rem;">No detailed phases found.</span>';
    }
  }
}
window.deOnLessonSelected = deOnLessonSelected;

async function deExecutePullLesson() {
  if (!_deSelectedLessonData) return;
  const d = _deSelectedLessonData.data || {};
  const doHeader = document.getElementById('de-opt-header').checked;
  const doObjectives = document.getElementById('de-opt-objectives').checked;
  const doVocab = document.getElementById('de-opt-vocab').checked;
  const doPhases = document.getElementById('de-opt-phases').checked;
  const doHomework = document.getElementById('de-opt-homework').checked;

  const modeRadio = document.querySelector('input[name="de-insert-mode"]:checked');
  const mode = modeRadio ? modeRadio.value : 'cursor';

  const title = _deSelectedLessonData.title || 'Student Handout';
  const subject = _deSelectedLessonData.subject || '';
  const classId = _deSelectedLessonData.classId || '';
  if (classId && typeof mpInit === 'function' && !mpState.loaded) {
    await mpInit();
  }
  const classDisplayName = classId ? deResolveClassName(classId, d.className || _deSelectedLessonData.className) : '';
  const objectives = d.objectives || d.goals || [];
  const sections = Array.isArray(d.sections) ? d.sections : (Array.isArray(d.phases) ? d.phases : []);

  let words = [];
  if (Array.isArray(d.vocabulary)) words = d.vocabulary;
  else if (typeof d.vocabulary === 'string') words = d.vocabulary.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  if (Array.isArray(d.keyConcepts)) words = words.concat(d.keyConcepts);
  else if (typeof d.keyConcepts === 'string') words = words.concat(d.keyConcepts.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean));

  let generated = '';
  const isHtml = currentDocType === 'html';

  if (isHtml) {
    // Semantic HTML output
    if (doHeader) {
      generated += `<div class="handout-header" style="border:2px solid #000;padding:12px;margin-bottom:20px;background:#fef08a;">\n` +
        ` <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.85rem;font-weight:bold;">\n` +
        ` <span>${escHtml(subject)} • ${escHtml(classDisplayName ? ('Class ' + classDisplayName) : '')}</span>\n` +
        ` <span>Date: ________________________</span>\n` +
        ` </div>\n` +
        ` <h1 style="margin:4px 0 8px 0;font-size:1.6rem;text-transform:uppercase;">${escHtml(title)}</h1>\n` +
        ` <div style="font-size:0.9rem;font-weight:bold;">Student Name: __________________________________________________</div>\n` +
        `</div>\n\n`;
    }

    if (doObjectives) {
      generated += `<section class="handout-objectives" style="margin-bottom:20px;">\n` +
        ` <h2>Learning Objectives</h2>\n` +
        ` <ul>\n`;
      if (Array.isArray(objectives) && objectives.length) {
        objectives.forEach(obj => {
          const text = typeof obj === 'string' ? obj : (obj.title || obj.objective || JSON.stringify(obj));
          generated += ` <li>${escHtml(text)}</li>\n`;
        });
      } else if (typeof objectives === 'string' && objectives.trim()) {
        generated += ` <li>${escHtml(objectives)}</li>\n`;
      } else {
        generated += ` <li>Understand and master the core notions and vocabulary of this lesson.</li>\n` +
          ` <li>Apply key concepts through guided activities and structured practice.</li>\n`;
      }
      generated += ` </ul>\n</section>\n\n`;
    }

    if (doVocab && words.length) {
      generated += `<section class="handout-vocab" style="margin-bottom:20px;">\n` +
        ` <h2>Key Vocabulary &amp; Terminology</h2>\n` +
        ` <table style="width:100%;border-collapse:collapse;border:2px solid #000;margin-top:8px;">\n` +
        ` <thead>\n` +
        ` <tr style="background:#000;color:#fff;">\n` +
        ` <th style="padding:6px 10px;text-align:left;border:1px solid #000;width:35%;">Term</th>\n` +
        ` <th style="padding:6px 10px;text-align:left;border:1px solid #000;">Definition &amp; Application</th>\n` +
        ` </tr>\n` +
        ` </thead>\n` +
        ` <tbody>\n`;
      words.forEach(w => {
        const raw = typeof w === 'string' ? w : ((w.word || w.term || '') + (w.definition ? (' = ' + w.definition) : ''));
        const parts = raw.split('=');
        const term = parts[0].trim();
        const def = parts[1] ? parts[1].trim() : '_____________________________________________________';
        generated += ` <tr>\n` +
          ` <td style="padding:6px 10px;border:1px solid #000;font-weight:bold;">${escHtml(term)}</td>\n` +
          ` <td style="padding:6px 10px;border:1px solid #000;">${escHtml(def)}</td>\n` +
          ` </tr>\n`;
      });
      generated += ` </tbody>\n </table>\n</section>\n\n`;
    }

    if (doPhases && sections.length) {
      generated += `<section class="handout-activities" style="margin-bottom:20px;">\n` +
        ` <h2>Classroom Activities</h2>\n`;
      sections.forEach((s, idx) => {
        const sTitle = s.title || ('Activity ' + (idx + 1));
        const sObj = s.objective || s.description || 'Complete the exercise according to instructions.';
        generated += ` <div class="activity-block" style="border:2px solid #000;padding:12px;margin-bottom:14px;background:#fff;">\n` +
          ` <h3 style="margin-top:0;">${idx + 1}. ${escHtml(sTitle)}</h3>\n` +
          ` <p style="font-weight:500;"><strong>Task:</strong> ${escHtml(sObj)}</p>\n` +
          ` <div style="min-height:70px;border-bottom:1px dashed #94a3b8;margin-top:10px;"></div>\n` +
          ` <div style="min-height:30px;border-bottom:1px dashed #94a3b8;margin-top:10px;"></div>\n` +
          ` </div>\n`;
      });
      generated += `</section>\n\n`;
    }

    if (doHomework) {
      const hwText = d.homework || d.followUp || 'Review the vocabulary and key notions covered in today\'s lesson.';
      generated += `<section class="handout-homework" style="border:2px dashed #000;padding:12px;background:#f8fafc;margin-top:20px;">\n` +
        ` <h3 style="margin-top:0;">Homework &amp; Self-Study</h3>\n` +
        ` <p>${escHtml(hwText)}</p>\n` +
        ` <p style="font-size:0.85rem;color:#475569;">Due Date: ________________________</p>\n` +
        `</section>\n`;
    }

  } else {
    // Markdown / Typst output
    if (doHeader) {
      generated += `# ${title}\n\n` +
        `**Subject:** ${subject} | **Class:** ${classDisplayName} | **Date:** ________________________ \n` +
        `**Student Name:** __________________________________________________ \n\n---\n\n`;
    }

    if (doObjectives) {
      generated += `## Learning Objectives\n\n`;
      if (Array.isArray(objectives) && objectives.length) {
        objectives.forEach(obj => {
          const text = typeof obj === 'string' ? obj : (obj.title || obj.objective || JSON.stringify(obj));
          generated += `- ${text}\n`;
        });
      } else if (typeof objectives === 'string' && objectives.trim()) {
        generated += `- ${objectives}\n`;
      } else {
        generated += `- Understand and master the key concepts and vocabulary of this unit.\n` +
          `- Apply these principles in structured classroom exercises.\n`;
      }
      generated += `\n`;
    }

    if (doVocab && words.length) {
      generated += `## Key Vocabulary\n\n` +
        `| Term | Definition & Application |\n` +
        `| :--- | :--- |\n`;
      words.forEach(w => {
        const raw = typeof w === 'string' ? w : ((w.word || w.term || '') + (w.definition ? (' = ' + w.definition) : ''));
        const parts = raw.split('=');
        const term = parts[0].trim();
        const def = parts[1] ? parts[1].trim() : '_____________________________________________________';
        generated += `| **${term}** | ${def} |\n`;
      });
      generated += `\n`;
    }

    if (doPhases && sections.length) {
      generated += `## Guided Activities\n\n`;
      sections.forEach((s, idx) => {
        const sTitle = s.title || ('Activity ' + (idx + 1));
        const sObj = s.objective || s.description || 'Complete the following exercise.';
        generated += `### ${idx + 1}. ${sTitle}\n\n` +
          `**Instructions:** ${sObj}\n\n` +
          `*Your notes and answers:*\n\n` +
          `_____________________________________________________________________\n\n` +
          `_____________________________________________________________________\n\n`;
      });
    }

    if (doHomework) {
      const hwText = d.homework || d.followUp || 'Review today\'s lesson notes and practice with the vocabulary list.';
      generated += `## Homework & Follow-up\n\n` +
        `> ${hwText}\n\n` +
        `**Due Date:** ________________________\n\n`;
    }
  }

  // Apply to editor
  if (mode === 'replace') {
    if (mdEditor) {
      mdEditor.setValue(generated);
      docModified = true;
      updateDocIndicator();
    }
  } else {
    if (mdEditor) {
      const sel = mdEditor.getSelection();
      mdEditor.executeEdits('pull-lesson', [{ range: sel, text: generated, forceMoveMarkers: true }]);
      docModified = true;
      updateDocIndicator();
    }
  }

  // Bidirectional Link in LinksService
  const docUrn = getDeActiveDocUrn() || ('cmt:doc:docEditorDocs/' + (currentDocName || 'handout_' + Date.now() + '.' + currentDocType));
  const lessonUrn = 'cmt:lesson:' + _deSelectedLessonData.filename;
  if (typeof LinksService !== 'undefined') {
    await LinksService.addLink(docUrn, lessonUrn, {
      relation: 'handout_for_lesson',
      meta: {
        lessonTitle: _deSelectedLessonData.title,
        docTitle: currentDocName || title
      }
    });
    if (classId && !_deLinkedClassId) {
      const resolvedClassName = classDisplayName || deResolveClassName(classId, _deSelectedLessonData.className);
      await LinksService.addLink(docUrn, 'cmt:class:' + classId, {
        relation: 'curriculum_class',
        meta: {
          className: resolvedClassName,
          docTitle: currentDocName || title
        }
      });
    }
    updateDeDocLinksBadge();
  }

  deClosePullLessonModal();
  showToast(t('deGenHandoutSuccess') || 'Student handout generated from lesson plan!');
}
window.deExecutePullLesson = deExecutePullLesson;

// ── Convert Outline to Mindmap (Feature 5) ─────────────────
let deOutlineExportState = {
  items: [],
  docTitle: '',
  rootTitle: '',
  layout: 'radial'
};

