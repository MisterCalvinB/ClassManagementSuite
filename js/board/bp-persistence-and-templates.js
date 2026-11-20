/**
 * Class Management Tools — Board Multi-Page & Snapshot Engine
 * Manages multi-page tabs, in-memory detached DOM cache, page navigation, merging, and snapshots.
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

  var CON_PALETTES = global.CON_PALETTES = global.CON_PALETTES || [];
  var conDrawingSelected = global.conDrawingSelected = global.conDrawingSelected || new Set();
  var conMultiSelected = global.conMultiSelected = global.conMultiSelected || new Set();
  var conNoteSelected = global.conNoteSelected = global.conNoteSelected || new Set();
  var _conShapeSelected = global._conShapeSelected = global._conShapeSelected || new Set();
  var conTableSelected = global.conTableSelected = global.conTableSelected || new Set();
  // _conPageSnapshotPngs is shared globally via board-state.js descriptors
  var _conCopiedPages = global._conCopiedPages = global._conCopiedPages || [];
  var conDrawings = global.conDrawings = global.conDrawings || [];
  var conShapes = global.conShapes = global.conShapes || [];
  var conNotes = global.conNotes = global.conNotes || [];
  var conGroups = global.conGroups = global.conGroups || [];
  // Active session file and folder names are bound globally in board-state.js

  var boardEscapeHtml = global.boardEscapeHtml = window.boardEscapeHtml || function (text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var escapeSearchHtml = global.escapeSearchHtml = window.escapeSearchHtml || boardEscapeHtml;
  var conEscapeSearchHtml = global.conEscapeSearchHtml = window.conEscapeSearchHtml || escapeSearchHtml;
  var conTitle = global.conTitle = window.conTitle = (typeof window.conTitle !== 'undefined' ? window.conTitle : '');
  var wnRenderMathHtml = global.wnRenderMathHtml = window.wnRenderMathHtml || function (html) { return html; };
  var boardBuildPersistedSessionData = function (...args) {
    if (typeof window !== 'undefined' && typeof window.boardBuildPersistedSessionData === 'function') {
      return window.boardBuildPersistedSessionData(...args);
    }
    return args[1] || {};
  };
  var boardSourceLabel = function (source) {
    if (typeof window !== 'undefined' && typeof window.boardSourceLabel === 'function') {
      return window.boardSourceLabel(source);
    }
    return source || '';
  };
  var boardFormatWhen = function (ts) {
    if (typeof window !== 'undefined' && typeof window.boardFormatWhen === 'function') {
      return window.boardFormatWhen(ts);
    }
    return String(ts || '');
  };
  var boardSectionLabel = function (section) {
    if (typeof window !== 'undefined' && typeof window.boardSectionLabel === 'function') {
      return window.boardSectionLabel(section);
    }
    return section || '';
  };
  var boardPersistLocalSession = function (...args) {
    if (typeof window !== 'undefined' && typeof window.boardPersistLocalSession === 'function') {
      return window.boardPersistLocalSession(...args);
    }
  };
  var boardSetAutosaveFingerprint = function (...args) {
    if (typeof window !== 'undefined' && typeof window.boardSetAutosaveFingerprint === 'function') {
      return window.boardSetAutosaveFingerprint(...args);
    }
  };

  var conResolvePdfBackgroundAttachment = global.conResolvePdfBackgroundAttachment || window.conResolvePdfBackgroundAttachment || function (bg) {
    if (typeof window !== 'undefined' && typeof window.conResolvePdfBackgroundAttachment === 'function' && window.conResolvePdfBackgroundAttachment !== conResolvePdfBackgroundAttachment) {
      return window.conResolvePdfBackgroundAttachment(bg);
    }
    return null;
  };
  var conRenderPagePdfBackground = global.conRenderPagePdfBackground || window.conRenderPagePdfBackground || function (opts) {
    if (typeof window !== 'undefined' && typeof window.conRenderPagePdfBackground === 'function' && window.conRenderPagePdfBackground !== conRenderPagePdfBackground) {
      return window.conRenderPagePdfBackground(opts);
    }
  };
  var conRenderBoardBg = global.conRenderBoardBg || window.conRenderBoardBg || function (opts) {
    if (typeof window !== 'undefined' && typeof window.conRenderBoardBg === 'function' && window.conRenderBoardBg !== conRenderBoardBg) {
      return window.conRenderBoardBg(opts);
    }
  };
  var conApplyBoardBgColor = global.conApplyBoardBgColor || window.conApplyBoardBgColor || function () {
    if (typeof window !== 'undefined' && typeof window.conApplyBoardBgColor === 'function' && window.conApplyBoardBgColor !== conApplyBoardBgColor) {
      return window.conApplyBoardBgColor();
    }
  };
  var conNormalizeColorHex = global.conNormalizeColorHex || window.conNormalizeColorHex || function (hex) {
    if (typeof window !== 'undefined' && typeof window.conNormalizeColorHex === 'function' && window.conNormalizeColorHex !== conNormalizeColorHex) {
      return window.conNormalizeColorHex(hex);
    }
    return String(hex || '');
  };

      // ---- Mini-Thumb context menu & Drag-and-Drop reorder ----
      let _conMiniThumbDragIdx = null;

    async function conSaveCurrentPageSnapshotPng(pageIndex, options = {}) {
      const idx = (typeof pageIndex === 'number') ? pageIndex : conCurrentPageIndex;
      if (typeof idx !== 'number' || idx < 0) return;
      let dataUrl = '';

      const snap = (idx === conCurrentPageIndex && typeof conBuildPageSnapshot === 'function')
        ? conBuildPageSnapshot()
        : (conPageSnapshots && conPageSnapshots[idx]);

      // Fast-path: use lightweight vector thumbnail renderer (sub-millisecond)
      if (options.fast && snap && typeof conBuildPageThumbnailDataUrl === 'function') {
        dataUrl = conBuildPageThumbnailDataUrl(snap, 480, 320);
      }

      // High-res path: only render full board canvas when not in fast mode
      if (!dataUrl && !options.fast && idx === conCurrentPageIndex && typeof _conBuildBoardCanvas === 'function') {
        try {
          const liveRes = await _conBuildBoardCanvas();
          if (liveRes && liveRes.canvas) {
            if (typeof _conBuildThumbnailDataUrl === 'function') {
              dataUrl = _conBuildThumbnailDataUrl(liveRes.canvas, 600);
            } else {
              let url = liveRes.canvas.toDataURL('image/webp', 0.82);
              if (!url || !url.startsWith('data:image/webp')) url = liveRes.canvas.toDataURL('image/png');
              dataUrl = url;
            }
          }
        } catch (_) {}
      }
      if (!dataUrl && snap) {
        dataUrl = (typeof conBuildPageThumbnailDataUrl === 'function')
          ? conBuildPageThumbnailDataUrl(snap, 480, 320)
          : '';
      }
      if (!dataUrl) return;

      if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
      _conPageSnapshotPngs[idx] = dataUrl;

      // Update thumbnail image in mini-strip immediately in DOM
      const strip = document.getElementById('con-page-mini-strip');
      if (strip) {
        const thumbs = strip.querySelectorAll('.con-page-mini-thumb');
        if (thumbs[idx]) {
          const img = thumbs[idx].querySelector('img');
          const canvas = thumbs[idx].querySelector('canvas');
          if (img) {
            const applyImg = function () {
              if (canvas) canvas.style.display = 'none';
              img.style.display = 'block';
              img.dataset.pngLoaded = '1';
            };
            img.onload = applyImg;
            img.src = dataUrl;
            if (img.complete && img.naturalWidth > 0) {
              applyImg();
            }
          }
        }
      }
    }

    let _conPageSnapshotSaveTimer = null;
    let _conPageSnapshotSaveQueued = null;
    function conQueueCurrentPageSnapshotPng(pageIndex) {
      const targetIdx = (typeof pageIndex === 'number') ? pageIndex : conCurrentPageIndex;
      if (typeof targetIdx !== 'number' || targetIdx < 0) return;
      _conPageSnapshotSaveQueued = targetIdx;

      // Immediately produce fast vector thumbnail with zero lag
      try {
        conSaveCurrentPageSnapshotPng(targetIdx, { fast: true });
      } catch (_) {}

      // Debounce heavy raster canvas build to avoid freezing UI during active page navigation
      if (_conPageSnapshotSaveTimer) clearTimeout(_conPageSnapshotSaveTimer);
      _conPageSnapshotSaveTimer = setTimeout(async function () {
        _conPageSnapshotSaveTimer = null;
        const nextIndex = _conPageSnapshotSaveQueued;
        _conPageSnapshotSaveQueued = null;
        if (nextIndex === null || nextIndex === undefined) return;
        try {
          await conSaveCurrentPageSnapshotPng(nextIndex);
        } catch (_) { }
      }, 2500);
    }

    let _conLiveSnapshotDebounceTimer = null;
    function conTriggerLivePageSnapshot(delayMs = 1200) {
      if (typeof conCurrentPageIndex !== 'number') return;
      if (_conLiveSnapshotDebounceTimer) clearTimeout(_conLiveSnapshotDebounceTimer);
      _conLiveSnapshotDebounceTimer = setTimeout(() => {
        _conLiveSnapshotDebounceTimer = null;
        if (typeof conQueueCurrentPageSnapshotPng === 'function') {
          conQueueCurrentPageSnapshotPng(conCurrentPageIndex);
        }
      }, delayMs);
    }
    window.conTriggerLivePageSnapshot = conTriggerLivePageSnapshot;

    let _conSaveBundlePromise = Promise.resolve();

    async function conSaveSessionFolderBundle(sessionFilename, persistedData, options = {}) {
      const prevPromise = _conSaveBundlePromise;
      let currentResolve, currentReject;
      _conSaveBundlePromise = new Promise((resolve, reject) => {
        currentResolve = resolve;
        currentReject = reject;
      });

      try {
        await prevPromise.catch(() => {});
        const res = await _conSaveSessionFolderBundleImpl(sessionFilename, persistedData, options);
        currentResolve(res);
        return res;
      } catch (err) {
        currentReject(err);
        throw err;
      }
    }

    async function _conSaveSessionFolderBundleImpl(sessionFilename, persistedData, options = {}) {
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.saveBoardArchive === 'function') {
        const archiveBundle = await conBuildSessionArchiveBundle(sessionFilename, persistedData, options);
        let targetSubdir = '';
        if (typeof options.subdir === 'string') {
          targetSubdir = options.subdir.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        } else if (options.useClassSubdir) {
          const cg = (persistedData && (persistedData._classGroup || persistedData.classGroup)) || (typeof activeClassGroup === 'string' ? activeClassGroup : '');
          targetSubdir = typeof boardGetClassSubdirForGroup === 'function' ? boardGetClassSubdirForGroup(cg) : '';
        } else {
          targetSubdir = String(_conCurrentFolderName || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        }
        const result = await Desktop.saveBoardArchive('mindmaps', archiveBundle.filename, archiveBundle.entries, targetSubdir || undefined);
        if (!result || !result.ok) {
          throw new Error(result && result.error ? result.error : 'Could not save Constellation archive.');
        }

        if (!options.preserveCurrentSession) {
          _conCurrentFileName = archiveBundle.filename;
          _conCurrentFolderName = targetSubdir || null;
          if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();
          conSetAttachmentsFromSession(archiveBundle.attachments);
          if (window.conUpdatePageBar) window.conUpdatePageBar();
        }
        if (typeof historyUpsertEntry === 'function') {
          const relPath = targetSubdir ? (targetSubdir + '/' + archiveBundle.filename) : archiveBundle.filename;
          historyUpsertEntry('mindmaps', archiveBundle.filename, relPath, archiveBundle.data, options);
        }
        return {
          filename: archiveBundle.filename,
          folderName: targetSubdir || null,
          data: archiveBundle.data
        };
      }

      const bundle = await conBuildSessionFolderBundle(sessionFilename, persistedData, options);

      const result = await Desktop.saveFiles('mindmaps', bundle.files);
      if (!result || !result.ok) {
        throw new Error(result && result.error ? result.error : 'Could not save Constellation bundle.');
      }

      if (!options.preserveCurrentSession) {
        _conCurrentFileName = bundle.filename;
        _conCurrentFolderName = bundle.folderName;
        if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();
        conSetAttachmentsFromSession(bundle.attachments);
        if (window.conUpdatePageBar) window.conUpdatePageBar();
      }
      if (typeof historyUpsertEntry === 'function') {
        const rel = bundle.folderName ? (bundle.folderName + '/' + bundle.filename) : bundle.filename;
        historyUpsertEntry('mindmaps', bundle.filename, rel, bundle.data, options);
      }
      return {
        filename: bundle.filename,
        folderName: bundle.folderName,
        data: bundle.data
      };
    }

    let _conSilentInitialSavePromise = null;
    function conTrySilentInitialSave() {
      if (new URLSearchParams(location.search).get('mirror') === '1' || window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') return null;
      if (!(window.Desktop && Desktop.isElectron())) return null;
      if (!_conCurrentFileName && !_conCurrentFolderName) return null;
      if (_conSilentInitialSavePromise) return _conSilentInitialSavePromise;

      const data = conBuildSessionData();
      if (!conSessionHasMeaningfulContent(data)) return null;

      const titleVal = (window.conGetTitle ? window.conGetTitle() : '').trim();
      const requestedName = boardDefaultFileName('constellation', titleVal);
      const persistedData = boardBuildPersistedSessionData('constellation', data);

      boardShowAutosaveToast();
      _conSilentInitialSavePromise = conSaveSessionFolderBundle(requestedName, persistedData, { isAutosave: true, useClassSubdir: !_conCurrentFolderName })
        .then(saved => {
          boardPersistLocalSession('constellation', saved.data, {
            source: 'autosave',
            name: saved.filename
          });
          boardSetAutosaveFingerprint('constellation', saved.data);
          boardHideAutosaveToast(true);
          return saved;
        })
        .catch((err) => {
          boardHideAutosaveToast(false);
          return null;
        })
        .finally(() => {
          _conSilentInitialSavePromise = null;
        });

      return _conSilentInitialSavePromise;
    }

    function conSaveSession() {
      if (window._isPageWindow || new URLSearchParams(location.search).get('pageWindow') === '1') {
        const msg = (typeof t === 'function' ? t('conPageWindowSaveDisabled') : 'Saving is disabled in secondary page windows to prevent overwriting the main session.');
        if (typeof showToast === 'function') {
          showToast(msg, false);
        } else if (typeof mdbToast === 'function') {
          mdbToast(' ' + msg);
        }
        return;
      }
      const data = conBuildSessionData();
      if (!conSessionHasContent(data)) {
        mdbToast(' Nothing to save yet. Add at least one node, note, or title first.');
        return;
      }

      const now = Date.now();
      const fp = boardComputeFingerprint('constellation', data);
      const isRecentSave = (now - _conLastSaveTimestamp < 1500);

      // Cooldown / deduplication: if identical fingerprint and saved recently, acknowledge without duplicate disk I/O
      if (!_boardIsDirty && boardAutosaveFingerprint['constellation'] === fp && isRecentSave) {
        boardSetDirty(false, { justSaved: true });
        return;
      }

      // If a save is already in flight, flag a pending manual save to run after current one finishes
      if (_conIsSaving) {
        _conPendingManualSave = true;
        return;
      }

      _conIsSaving = true;
      if (global._boardMutationTimer) {
        clearTimeout(global._boardMutationTimer);
        global._boardMutationTimer = null;
      }
      _boardMutationFirstDirtyAt = 0;

      const persistedData = boardBuildPersistedSessionData('constellation', data);
      const blob = boardBuildSessionBlob(persistedData, 'CONSTELLATION_SESSION_EXPORT');
      const titleVal = window.conGetTitle ? window.conGetTitle() : '';
      const filename = boardDefaultFileName('constellation', titleVal);

      const _onSaveSuccess = (savedName, folderName, finalData) => {
        _conIsSaving = false;
        _conLastSaveTimestamp = Date.now();
        _boardMutationFirstDirtyAt = 0;
        if (global._boardMutationTimer) {
          clearTimeout(global._boardMutationTimer);
          global._boardMutationTimer = null;
        }
        boardAutosaveFingerprint['constellation'] = fp;
        if (savedName) _conCurrentFileName = savedName;
        _conCurrentFolderName = folderName || null;
        if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();
        boardPersistLocalSession('constellation', finalData || persistedData, { source: 'manual-save', name: savedName });
        boardSetDirty(false, { justSaved: true });
        mdbToast(' Saved: ' + savedName);
        if (folderName || savedName) conSaveHistorySnapshot(folderName, savedName, finalData || persistedData);
        if (typeof boardReportActiveFileContext === 'function') boardReportActiveFileContext();
        else if (typeof window.boardReportActiveFileContext === 'function') window.boardReportActiveFileContext();

        if (_conPendingManualSave) {
          _conPendingManualSave = false;
          setTimeout(() => conSaveSession(), 100);
        }
      };

      const _onSaveError = (err) => {
        _conIsSaving = false;
        _conPendingManualSave = false;
        mdbToast(' Could not save Constellation: ' + (err && err.message ? err.message : String(err)));
      };

      if (window.Desktop && Desktop.isElectron()) {
        if (_conCurrentFileName) {
          conSaveSessionFolderBundle(_conCurrentFileName, persistedData, { isManualSave: true })
            .then(saved => {
              _onSaveSuccess(saved.filename, saved.folderName, saved.data);
            })
            .catch(_onSaveError);
          return;
        }

        sfnOpen(filename, blob, 'mindmaps', savedName => {
          if (savedName) _conCurrentFileName = savedName;
        }, {
          customSave: async function (requestedName) {
            try {
              const saved = await conSaveSessionFolderBundle(requestedName, persistedData, { isManualSave: true, useClassSubdir: true });
              _onSaveSuccess(saved.filename, saved.folderName, saved.data);
              return saved.filename;
            } catch (err) {
              _onSaveError(err);
              throw err;
            }
          }
        });
        return;
      }

      if (_conCurrentFileName && window.Desktop && Desktop.isElectron()) {
        Desktop.saveBlob('mindmaps', _conCurrentFileName, blob)
          .then(() => {
            _onSaveSuccess(_conCurrentFileName, null, persistedData);
          })
          .catch(() => {
            _conIsSaving = false;
            sfnOpen(filename, blob, 'mindmaps', savedName => {
              if (savedName) {
                _conCurrentFileName = savedName;
                _onSaveSuccess(savedName, null, persistedData);
              }
            });
          });
        return;
      }

      sfnOpen(filename, blob, 'mindmaps', savedName => {
        if (savedName) {
          _conCurrentFileName = savedName;
          _onSaveSuccess(savedName, null, persistedData);
        } else {
          _conIsSaving = false;
        }
      });
    }

    async function conSuggestDuplicateFilename(baseName, targetSubdir = '') {
      const sourceBase = boardStripJsonExt(String(baseName || '').trim()) || 'constellation';
      const ext = (baseName && baseName.endsWith('.js')) ? '.js' : '.cstz';
      const normalizedSubdir = String(targetSubdir || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
      const takenBases = new Set();

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.listByPath === 'function') {
        try {
          const listed = await Desktop.listByPath('mindmaps', '.', {
            extensions: ['.js', '.json', '.cstz', '.zip'],
            recursive: true,
            excludeDirs: ['archived', 'history', 'pics', 'sounds', 'videos', 'pdf', 'templates']
          });
          const files = (listed && listed.ok && Array.isArray(listed.files)) ? listed.files : [];
          files.forEach(file => {
            const rel = String((file && (file.relativePath || file.filename)) || '').replace(/\\/g, '/');
            if (!rel) return;
            const parts = rel.split('/').filter(Boolean);
            const leaf = parts.length ? parts[parts.length - 1] : '';
            const leafBase = boardStripJsonExt(leaf).toLowerCase();
            if (!leafBase) return;
            const parentDir = parts.length > 1 ? parts.slice(0, -1).join('/').toLowerCase() : '';
            if (normalizedSubdir) {
              if (parentDir === normalizedSubdir) {
                takenBases.add(leafBase);
              }
              return;
            }
            if (parts.length === 2 && boardStripJsonExt(parts[1]).toLowerCase() === parts[0].toLowerCase()) {
              takenBases.add(parts[0].toLowerCase());
              return;
            }
            if (parts.length === 1) {
              takenBases.add(leafBase);
            }
          });
        } catch (_) { }
      }

      const baseLower = sourceBase.toLowerCase();
      let candidate = sourceBase + ' (copy)';
      if (candidate.toLowerCase() === baseLower) candidate = sourceBase + ' (copy 2)';
      if (!takenBases.has(candidate.toLowerCase())) return candidate + ext;

      for (let i = 2; i <= 999; i++) {
        const numbered = sourceBase + ' (copy ' + i + ')';
        if (!takenBases.has(numbered.toLowerCase())) return numbered + ext;
      }

      return sourceBase + ' (copy ' + Date.now() + ')' + ext;
    }

    async function conDuplicateCurrentFile() {
      if (!(window.Desktop && Desktop.isElectron())) {
        mdbToast(' Duplicating files requires the Electron desktop app.');
        return;
      }
      if (typeof Desktop.saveFiles !== 'function' && typeof Desktop.saveBoardArchive !== 'function') {
        mdbToast(' Duplicate is not available in this app version.');
        return;
      }

      const data = conBuildSessionData();
      if (!conSessionHasContent(data)) {
        mdbToast(' Nothing to duplicate yet. Add at least one node, note, or title first.');
        return;
      }

      if (!_conCurrentFileName && !_conCurrentFolderName) {
        mdbToast(' Save this board first, then duplicate the file.');
        return;
      }

      let relinkAfterDuplicate = false;
      if (activePlannerEntryId) {
        const linkedEntry = bpGetAllEntries().find(e => e.id === activePlannerEntryId);
        const linkedLabel = linkedEntry ? ('\n\nCurrent link: ' + bpBuildLabel(linkedEntry)) : '';
        const promptMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
          ? i18n.t('boardDuplicatePlannerRelinkPrompt')
          : 'This board is linked to a Planner class timeslot.\nDo you want to link the duplicated board to a new timeslot in the new window?';
        relinkAfterDuplicate = await showConfirm(
          promptMsg
          + linkedLabel
          + '\n\nOK = open class timeslot picker in the new window'
          + '\nCancel = keep duplicate unlinked'
        );
      }

      try {
        const sourceName = _conCurrentFileName || (_conCurrentFolderName ? (_conCurrentFolderName + '.js') : (boardDefaultFileName('constellation', window.conGetTitle ? window.conGetTitle() : '') + '.cstz'));
        const dupSubdir = (typeof boardGetClassSubdirForGroup === 'function' ? boardGetClassSubdirForGroup(activeClassGroup) : '') || _conCurrentFolderName || '';
        const duplicateFilename = await conSuggestDuplicateFilename(sourceName, dupSubdir);

        const persistedData = boardBuildPersistedSessionData('constellation', data);
        delete persistedData._plannerEntryIds;
        delete persistedData.plannerEntryIds;
        delete persistedData._plannerEntryId;
        delete persistedData.plannerEntryId;

        const saved = await conSaveSessionFolderBundle(duplicateFilename, persistedData, {
          isManualSave: true,
          preserveCurrentSession: true,
          subdir: dupSubdir
        });

        if (typeof historyRenderList === 'function') historyRenderList();

        const toastMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function' ? i18n.t('boardDuplicatedNewWindow') : 'Duplicated and opened in new window: ') + saved.filename;
        mdbToast(' ' + toastMsg);

        if (typeof boardOpenSessionInNewWindow === 'function') {
          const entry = {
            target: 'mindmaps',
            filename: saved.filename,
            relativePath: saved.folderName ? (saved.folderName + '/' + saved.filename) : saved.filename,
            section: 'constellation'
          };
          await boardOpenSessionInNewWindow({
            type: 'file',
            entry,
            openPlannerRelink: relinkAfterDuplicate
          });
        }
      } catch (error) {
        mdbToast(' Could not duplicate file: ' + (error && error.message ? error.message : String(error)));
      }
    }

    async function conOpenCurrentFileLocationFolder() {
      if (!(window.Desktop && Desktop.isElectron())) {
        mdbToast(' Opening file locations is only available in the Desktop application.');
        return;
      }
      try {
        if (_conCurrentFileName) {
          const rel = _conCurrentFolderName ? (_conCurrentFolderName + '/' + _conCurrentFileName) : _conCurrentFileName;
          await Desktop.showInFolder('mindmaps', rel);
        } else if (_conCurrentFolderName) {
          await Desktop.showInFolder('mindmaps', _conCurrentFolderName);
        } else {
          await Desktop.showInFolder('mindmaps', '');
        }
      } catch (err) {
        console.warn('[Board] Could not show in folder:', err);
        mdbToast(' Could not open location folder: ' + (err && err.message ? err.message : String(err)));
      }
    }
    window.conOpenCurrentFileLocationFolder = conOpenCurrentFileLocationFolder;

    async function conOpenCurrentFileNative() {
      if (!(window.Desktop && Desktop.isElectron())) {
        mdbToast(' Opening files natively is only available in the Desktop application.');
        return;
      }
      try {
        if (!_conCurrentFileName && !_conCurrentFolderName) {
          const msg = typeof i18n !== 'undefined' && i18n.t ? (i18n.t('conSaveFirstToOpenFile') || 'Please save the board first to open the file.') : 'Please save the board first to open the file.';
          mdbToast(' ' + msg);
          return;
        }
        const rel = _conCurrentFolderName ? (_conCurrentFolderName + '/' + (_conCurrentFileName || 'index.html')) : _conCurrentFileName;
        const res = await Desktop.openNative('mindmaps', rel || _conCurrentFolderName);
        if (res && res.ok === false) {
          mdbToast(' Could not open file: ' + (res.error || ''));
        }
      } catch (err) {
        console.warn('[Board] Could not open file natively:', err);
        mdbToast(' Could not open file: ' + (err && err.message ? err.message : String(err)));
      }
    }
    window.conOpenCurrentFileNative = conOpenCurrentFileNative;

    function conOpenNewBoardWindow() {
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.openTool === 'function') {
        Desktop.openTool('board.html', { forceNewWindow: true });
      } else {
        window.open('board.html', '_blank');
      }
    }
    window.conOpenNewBoardWindow = conOpenNewBoardWindow;

    function conFormatVersionDate(filename) {
      const m = String(filename).match(/\.v(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.js$/i);
      if (!m) return filename;
      const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
      const loc = typeof getLocale === 'function' ? getLocale() : ((typeof getLang === 'function' && { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' }[getLang()]) || 'fr-FR');
      return dt.toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' })
        + ' — ' + dt.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    async function conSaveHistorySnapshot(folderName, filename, data) {
      if (!(window.Desktop && Desktop.isElectron())) return;
      if (!folderName) return; // For .cstz archives without companion folders, skip loose disk snapshots
      try {
        const base = boardStripJsonExt(filename);
        const now = new Date();
        const p = n => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
        const histFilename = `${base}.v${ts}.js`;
        const content = boardBuildSessionFileContent(data, 'CONSTELLATION_SESSION_EXPORT');
        await Desktop.saveFiles('mindmaps', [{ filename: histFilename, subdir: folderName + '/history', content, encoding: 'utf8' }]);
        if (typeof Desktop.listByPath === 'function') {
          const listed = await Desktop.listByPath('mindmaps', folderName + '/history', { extensions: ['.js', '.json'], recursive: false });
          const vFiles = (listed && listed.ok && Array.isArray(listed.files)) ? listed.files : [];
          if (vFiles.length > 20) {
            const sorted = vFiles.slice().sort((a, b) => (a.mtimeMs || 0) - (b.mtimeMs || 0));
            for (const f of sorted.slice(0, sorted.length - 20)) {
              await Desktop.deleteByPath('mindmaps', f.relativePath).catch(() => { });
            }
          }
        }
      } catch (e) { /* silent — history is best-effort */ }
    }

    function conGetVersionModal() {
      let modal = document.getElementById('con-version-history-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'con-version-history-modal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;';
        modal.innerHTML = '<div style="background:#fff;border-radius:10px;max-width:520px;width:93%;max-height:78vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,.35);">'
          + '<div style="display:flex;align-items:center;padding:14px 18px;border-bottom:1px solid #e0e0e0;">'
          + '<span id="con-version-history-title" style="flex:1;font-size:.95rem;font-weight:800;"></span>'
          + '<button onclick="document.getElementById(\'con-version-history-modal\').style.display=\'none\'" style="background:none;border:none;font-size:1.1rem;cursor:pointer;padding:2px 8px;color:#666;line-height:1;"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>'
          + '</div>'
          + '<div id="con-version-history-body" style="overflow-y:auto;flex:1;min-height:80px;"></div>'
          + '</div>';
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.style.display = 'none'; });
        document.body.appendChild(modal);
      }
      return modal;
    }

    async function conShowVersionHistory(entry) {
      if (!entry || entry.target !== 'mindmaps') return;
      const relPath = historyEntryRelativePath(entry);
      const folderName = relPath.includes('/') ? relPath.split('/')[0] : boardStripJsonExt(entry.filename || '');
      if (!folderName) return;

      const modal = conGetVersionModal();
      const title = document.getElementById('con-version-history-title');
      const body = document.getElementById('con-version-history-body');
      title.textContent = 'Version History — ' + (entry.baseName || entry.filename);
      body.innerHTML = '<div style="padding:24px;text-align:center;color:#888;font-size:.85rem;">Loading versions…</div>';
      modal.style.display = 'flex';

      let files = [];
      try {
        if (typeof Desktop.listByPath === 'function') {
          const r = await Desktop.listByPath('mindmaps', folderName + '/history', { extensions: ['.js', '.json'], recursive: false });
          files = (r && r.ok && Array.isArray(r.files)) ? r.files : [];
        }
      } catch (e) { }

      files.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));

      if (!files.length) {
        body.innerHTML = '<div style="padding:24px;text-align:center;color:#888;font-size:.85rem;">No saved versions yet.<br>Versions are created on every manual save.</div>';
        return;
      }

      body.innerHTML = '';
      const list = document.createElement('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:12px;';

      files.forEach(f => {
        const rp = f.relativePath || '';
        const fname = f.filename || rp.split('/').pop() || '';
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;border:1.5px solid #e0e0e0;border-radius:7px;padding:8px 12px;';

        const label = document.createElement('span');
        label.style.cssText = 'flex:1;font-size:.83rem;font-weight:600;';
        label.textContent = conFormatVersionDate(fname);

        const size = document.createElement('span');
        size.style.cssText = 'font-size:.72rem;color:#999;white-space:nowrap;flex-shrink:0;';
        size.textContent = f.size ? historyFormatSize(f.size) : '';

        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'action-btn btn-grey';
        restoreBtn.textContent = 'Restore';
        restoreBtn.onclick = async () => {
          if (!await showConfirm('Restore this version? The current board content will be replaced.')) return;
          try {
            const r = await Desktop.readByPath('mindmaps', rp);
            if (!r || !r.ok || !r.content) throw new Error('Could not read version file.');
            const data = boardParseSessionText(r.content);
            if (!data || (data._type !== 'constellation' && !String(data._type || '').endsWith('-constellation'))) {
              throw new Error('File does not look like a Constellation session.');
            }
            _conRestoreSession(data);
            boardSetSessionFileMetaFromData('constellation', data);
            setTimeout(() => {
              boardSetAutosaveFingerprint('constellation', conBuildSessionData());
              _boardIsDirty = false;
            }, 200);
            modal.style.display = 'none';
            mdbToast(' Version restored — save to keep the changes.');
          } catch (e) { mdbToast(' Could not restore: ' + (e && e.message ? e.message : String(e))); }
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn btn-red';
        delBtn.textContent = 'Delete';
        delBtn.onclick = async () => {
          if (!await showConfirm('Delete this version?')) return;
          try {
            await Desktop.deleteByPath('mindmaps', rp);
            row.remove();
            if (!list.children.length) {
              body.innerHTML = '<div style="padding:24px;text-align:center;color:#888;font-size:.85rem;">No saved versions.</div>';
            }
          } catch (e) { mdbToast(' Could not delete version.'); }
        };

        row.appendChild(label);
        row.appendChild(size);
        row.appendChild(restoreBtn);
        row.appendChild(delBtn);
        list.appendChild(row);
      });

      body.appendChild(list);
    }

    async function conLoadSession(event) {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;

      const isArchive = file.name.endsWith('.cstz') || file.name.endsWith('.zip');
      if (isArchive) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const parsed = await conParseBoardArchiveArrayBuffer(arrayBuffer);
          if (!parsed || !parsed.boardData) {
            mdbToast(' Could not read .cstz archive.');
            return;
          }
          const data = parsed.boardData;
          if (data._type !== 'constellation' && !String(data._type || '').endsWith('-constellation')) {
            mdbToast(' This file does not look like a Constellation save file.');
            return;
          }
          _conCurrentFileName = file.name;
          _conCurrentFolderName = null;
          data._mediaMap = parsed.media || null;
          data._thumbnails = parsed.thumbnails || null;
          if (Array.isArray(data.attachments)) {
            conSetAttachmentsFromSession(data.attachments, parsed.media);
          }
          boardSetSessionFileMetaFromData('constellation', data);
          _conRestoreSession(data);
          setActiveClassGroup(data._classGroup || '', { preserveBoardState: true });
          if (typeof bpSetFromEntryIds === 'function') {
            bpSetFromEntryIds((parsed.manifest && (parsed.manifest.plannerEntryIds || parsed.manifest.plannerEntryId)) || data._plannerEntryIds || data.plannerEntryIds || data._plannerEntryId || data.plannerEntryId || []);
          }
          const _conAutoTitle = boardStripJsonExt(file.name);
          if (window.conSetTitle) window.conSetTitle(_conAutoTitle);
          const _conTitleEl = document.getElementById('con-title-input');
          if (_conTitleEl) _conTitleEl.value = _conAutoTitle;
          boardPersistLocalSession('constellation', data, {
            source: 'file-load',
            name: _conAutoTitle
          });
          setTimeout(() => {
            boardSetAutosaveFingerprint('constellation', conBuildSessionData());
            if (typeof boardSetDirty === 'function') boardSetDirty(false);
            else _boardIsDirty = false;
            if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();
          }, 200);
          return;
        } catch (err) {
          mdbToast(' Could not parse .cstz archive: ' + (err && err.message ? err.message : String(err)));
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = e => {
        let data;
        try { data = boardParseSessionText(e.target.result); }
        catch { mdbToast(' Could not read file — make sure it is a valid Constellation .js, .json, or .cstz file.'); return; }
        if (data && !data._type && (Array.isArray(data.nodes) || Array.isArray(data.pages))) {
          data._type = 'constellation';
        }
        if (data && Array.isArray(data.links) && !Array.isArray(data.edges)) {
          data.edges = data.links.map(l => ({
            id: l.id,
            a: l.a || l.from,
            b: l.b || l.to,
            type: l.type || 'none',
            label: l.label || '',
            thickness: l.thickness || 2,
            strokeType: l.strokeType || 'solid'
          }));
        }
        if (data._type !== 'constellation' && !String(data._type || '').endsWith('-constellation')) {
          mdbToast(' This file does not look like a Constellation save file.'); return;
        }
        _conCurrentFileName = file.name.endsWith('.js') ? file.name : boardStripJsonExt(file.name) + '.js';
        _conCurrentFolderName = null;
        boardSetSessionFileMetaFromData('constellation', data);
        _conRestoreSession(data);
        setActiveClassGroup(data._classGroup || '', { preserveBoardState: true });
        if (typeof bpSetFromEntryIds === 'function') {
          bpSetFromEntryIds(data._plannerEntryIds || data.plannerEntryIds || data._plannerEntryId || data.plannerEntryId || []);
        }
        // Always update title from the loaded filename (override what _conRestoreSession set from data.title)
        const _conAutoTitle = boardStripJsonExt(file.name);
        if (window.conSetTitle) window.conSetTitle(_conAutoTitle);
        const _conTitleEl = document.getElementById('con-title-input');
        if (_conTitleEl) _conTitleEl.value = _conAutoTitle;
        boardPersistLocalSession('constellation', data, {
          source: 'file-load',
          name: boardStripJsonExt(file.name)
        });
        setTimeout(() => {
          boardSetAutosaveFingerprint('constellation', conBuildSessionData());
          if (typeof boardSetDirty === 'function') boardSetDirty(false);
          else _boardIsDirty = false;
          if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();
        }, 200);
      };
      reader.readAsText(file);
    }

    // ── BOARD TEMPLATES ──────────────────────────────────────────────
    function conOpenTemplatePopup() {
      const titleVal = window.conGetTitle ? window.conGetTitle() : '';
      document.getElementById('con-template-name-input').value = boardStripJsonExt(titleVal.trim());
      conRenderTemplateList();
      document.getElementById('con-template-overlay').classList.add('active');
    }

    function conCloseTemplatePopup() {
      document.getElementById('con-template-overlay').classList.remove('active');
    }

    async function conSaveTemplate() {
      const nameInput = document.getElementById('con-template-name-input');
      const name = (nameInput.value || '').trim();
      if (!name) { nameInput.focus(); return; }
      const data = conBuildSessionData();
      if (!conSessionHasContent(data)) {
        mdbToast(' Nothing to save as a template. Add at least one word first.');
        return;
      }
      const templateData = Object.assign({}, data, { _type: 'constellation-template', _templateName: name });
      const filename = name.endsWith('.js') ? name : boardStripJsonExt(name) + '.js';
      const blob = boardBuildSessionBlob(templateData, 'CONSTELLATION_TEMPLATE_EXPORT');
      if (window.Desktop && Desktop.isElectron()) {
        await Desktop.saveBlob('constellationTemplates', filename, blob);
        conRenderTemplateList();
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    }

    async function conRenderTemplateList() {
      const listEl = document.getElementById('con-template-list');
      listEl.innerHTML = '';
      if (!(window.Desktop && Desktop.isElectron())) {
        const note = document.createElement('div');
        note.className = 'session-load-empty';
        note.textContent = 'Open in Electron to browse saved templates. Use "Load from file" to load a template .js file.';
        listEl.appendChild(note);
        return;
      }
      let files = [];
      try {
        const r = await Desktop.listFiles('constellationTemplates', { extensions: ['.js', '.json'] });
        files = (r && Array.isArray(r.files)) ? r.files : [];
      } catch {
        const err = document.createElement('div');
        err.className = 'session-load-empty';
        err.textContent = 'Could not load template list.';
        listEl.appendChild(err);
        return;
      }
      if (!files.length) {
        const empty = document.createElement('div');
        empty.className = 'session-load-empty';
        empty.textContent = 'No templates saved yet. Save the current board as a template above.';
        listEl.appendChild(empty);
        return;
      }
      files.forEach(f => {
        const row = document.createElement('div');
        row.className = 'con-template-item';
        const nameEl = document.createElement('div');
        nameEl.className = 'con-template-item-name';
        nameEl.textContent = boardStripJsonExt(f.filename);
        const metaEl = document.createElement('div');
        metaEl.className = 'con-template-item-meta';
        metaEl.textContent = boardFormatWhen(f.mtimeMs);
        const loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.className = 'action-btn btn-grey';
        loadBtn.style.cssText = 'font-size:0.72rem;padding:4px 9px;white-space:nowrap;';
        loadBtn.textContent = ' Load';
        loadBtn.onclick = () => conLoadTemplateByFilename(f.filename);
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'con-template-del-btn';
        delBtn.title = 'Delete template';
        delBtn.textContent = 'x';
        delBtn.onclick = () => conDeleteTemplate(f.filename);
        row.appendChild(nameEl);
        row.appendChild(metaEl);
        row.appendChild(loadBtn);
        row.appendChild(delBtn);
        listEl.appendChild(row);
      });
    }

    async function conLoadTemplateByFilename(filename) {
      if (!(window.Desktop && Desktop.isElectron())) return;
      const r = await Desktop.readText('constellationTemplates', filename);
      if (!r || !r.ok) { mdbToast(' Could not read template file.'); return; }
      let data;
      try { data = boardParseSessionText(r.content); }
      catch { mdbToast(' Template file is not valid session data.'); return; }
      if (data._type !== 'constellation-template' && data._type !== 'constellation' && !String(data._type || '').endsWith('-constellation')) {
        mdbToast(' This does not look like a valid Constellation template file.'); return;
      }
      conCloseTemplatePopup();
      _conRestoreSession(data);
      boardSetAutosaveFingerprint('constellation', data);
    }

    function conLoadTemplateFromFile(event) {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        let data;
        try { data = boardParseSessionText(e.target.result); }
        catch { mdbToast(' Could not read file — make sure it is a valid template .js or .json file.'); return; }
        if (data && !data._type && (Array.isArray(data.nodes) || Array.isArray(data.pages))) {
          data._type = 'constellation';
        }
        if (data._type !== 'constellation-template' && data._type !== 'constellation' && !String(data._type || '').endsWith('-constellation')) {
          mdbToast(' This file does not look like a Constellation template or session file.'); return;
        }
        conCloseTemplatePopup();
        _conRestoreSession(data);
        boardSetAutosaveFingerprint('constellation', data);
      };
      reader.readAsText(file);
    }

    async function conDeleteTemplate(filename) {
      if (!await showConfirm('Delete template "' + boardStripJsonExt(filename) + '"?')) return;
      if (!(window.Desktop && Desktop.isElectron())) return;
      await Desktop.deleteFile('constellationTemplates', filename);
      conRenderTemplateList();
    }
    // ────────────────────────────────────────────────────────────────

    let _conLayoutRefreshRaf = null;
    function conScheduleLayoutRefresh() {
      const run = () => {
        if (typeof window.conGroupRefitAll === 'function') window.conGroupRefitAll();
        if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
      };
      run();
      if (_conLayoutRefreshRaf) cancelAnimationFrame(_conLayoutRefreshRaf);
      _conLayoutRefreshRaf = requestAnimationFrame(() => {
        _conLayoutRefreshRaf = null;
        run();
      });
      if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
        document.fonts.ready.then(() => { run(); }).catch(() => {});
      }
    }
    window.conScheduleLayoutRefresh = conScheduleLayoutRefresh;

    if (typeof ResizeObserver !== 'undefined') {
      let _conLastObservedW = 0, _conLastObservedH = 0;
      const _conSectionObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          if (cr && cr.width > 0 && cr.height > 0 && (_conLastObservedW === 0 || _conLastObservedH === 0)) {
            _conLastObservedW = cr.width;
            _conLastObservedH = cr.height;
            conScheduleLayoutRefresh();
          } else if (cr) {
            _conLastObservedW = cr.width;
            _conLastObservedH = cr.height;
          }
        }
      });
      const _attachBoardSectionObserver = () => {
        const boardSection = document.getElementById('constellation-section');
        if (boardSection) _conSectionObserver.observe(boardSection);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _attachBoardSectionObserver);
      } else {
        _attachBoardSectionObserver();
      }
    }

    function conGetBoardContentBottomFromData(data) {
      if (!data) return 0;
      let maxBottom = 0;
      (data.nodes || []).forEach(n => {
        const fs = parseFloat(n.fontSize) || 16;
        const h = fs * 2.5 + 20;
        const b = (Number(n.y) || 0) + h;
        if (b > maxBottom) maxBottom = b;
      });
      (data.notes || []).forEach(n => {
        const h = Number(n.height) || (Number(n.fontSize) || 14) * 4 + 30;
        const b = (Number(n.y) || 0) + h;
        if (b > maxBottom) maxBottom = b;
      });
      (data.media || []).forEach(m => {
        const b = (Number(m.y) || 0) + (Number(m.h) || 100);
        if (b > maxBottom) maxBottom = b;
      });
      (data.shapes || []).forEach(s => {
        const b = (Number(s.y) || 0) + (Number(s.h) || 50);
        if (b > maxBottom) maxBottom = b;
      });
      (data.drawings || []).forEach(d => {
        const b = (Number(d.y) || 0) + (Number(d.h) || 50);
        if (b > maxBottom) maxBottom = b;
      });
      return maxBottom;
    }

    // ── COMPETENCE TAGGING SYSTEM ────────────────────────────────────
  // Cross-module exports
  window.conQueueCurrentPageSnapshotPng = global.conQueueCurrentPageSnapshotPng = conQueueCurrentPageSnapshotPng;
  window.conTriggerLivePageSnapshot = global.conTriggerLivePageSnapshot = conTriggerLivePageSnapshot;
  window.conSaveSessionFolderBundle = global.conSaveSessionFolderBundle = conSaveSessionFolderBundle;
  window.conTrySilentInitialSave = global.conTrySilentInitialSave = conTrySilentInitialSave;
  window.conSaveSession = global.conSaveSession = conSaveSession;
  window.conDuplicateCurrentFile = global.conDuplicateCurrentFile = conDuplicateCurrentFile;
  window.conShowVersionHistory = global.conShowVersionHistory = conShowVersionHistory;
  window.conLoadSession = global.conLoadSession = conLoadSession;
  window.conOpenTemplatePopup = global.conOpenTemplatePopup = conOpenTemplatePopup;
  window.conCloseTemplatePopup = global.conCloseTemplatePopup = conCloseTemplatePopup;
  window.conSaveTemplate = global.conSaveTemplate = conSaveTemplate;
  window.conLoadTemplateFromFile = global.conLoadTemplateFromFile = conLoadTemplateFromFile;
  window.conScheduleLayoutRefresh = global.conScheduleLayoutRefresh = conScheduleLayoutRefresh;
  window.conGetBoardContentBottomFromData = global.conGetBoardContentBottomFromData = conGetBoardContentBottomFromData;

})(typeof window !== "undefined" ? window : this);
