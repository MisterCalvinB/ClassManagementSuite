/**
 * Class Management Tools — Board Session I/O & History Browser
 * Handles file saving, loading, .cstz archives, history browser, preview, and dropzones.
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

  // Active session file and folder names are bound globally in board-state.js
  var BOARD_SAVED_SESSIONS_KEY = global.BOARD_SAVED_SESSIONS_KEY || 'board_saved_sessions_v1';

    // ================================================================
    // CONSTELLATION — SAVE / LOAD SESSION
    // ================================================================

    let _noteCurrentFileName = null; // set when a .js file is loaded; enables direct overwrite on Save

    function boardReportActiveFileContext() {
      if (_conCurrentFileName) {
        const rel = _conCurrentFolderName ? (_conCurrentFolderName + '/' + _conCurrentFileName) : _conCurrentFileName;
        try {
          sessionStorage.setItem('cmt-board-active-open-request', JSON.stringify({
            target: 'mindmaps',
            filename: _conCurrentFileName,
            relativePath: rel,
            section: 'constellation'
          }));
        } catch (_) { }
        if (window.Desktop && typeof Desktop.updateSessionContext === 'function') {
          Desktop.updateSessionContext({
            target: 'mindmaps',
            filename: _conCurrentFileName,
            relativePath: rel,
            section: 'constellation'
          }).catch(() => {});
        }
      } else {
        try { sessionStorage.removeItem('cmt-board-active-open-request'); } catch (_) { }
        if (window.Desktop && typeof Desktop.updateSessionContext === 'function') {
          Desktop.updateSessionContext(null).catch(() => {});
        }
      }
    }

    BOARD_SAVED_SESSIONS_KEY = global.BOARD_SAVED_SESSIONS_KEY || 'board_saved_sessions_v1';
    function boardGetAutosaveDebounceMs() {
      const cfg = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : {};
      if (typeof cfg.autosaveDebounceSec === 'number') {
        if (cfg.autosaveDebounceSec <= 0) return 0; // Disabled
        return Math.max(5000, cfg.autosaveDebounceSec * 1000);
      }
      return 45000;
    }
    function boardGetAutosaveMaxWaitMs(debounceMs) {
      if (debounceMs <= 0) return 0;
      return Math.max(debounceMs + 10000, Math.round(debounceMs * 1.33));
    }
    const BOARD_AUTOSAVE_DEBOUNCE_MS = 45000;
    const BOARD_AUTOSAVE_MAX_WAIT_MS = 60000;
    const BOARD_MAX_SESSIONS_PER_CLASS = 12;
    const BOARD_MAX_SESSIONS_PER_SECTION = 50;
    let _conUserPointerDown = false;
    let _conLastKeyInteractionTime = 0;

    window.addEventListener('pointerdown', () => { _conUserPointerDown = true; }, { passive: true, capture: true });
    window.addEventListener('pointerup', () => { _conUserPointerDown = false; }, { passive: true, capture: true });
    window.addEventListener('pointercancel', () => { _conUserPointerDown = false; }, { passive: true, capture: true });
    window.addEventListener('keydown', () => { _conLastKeyInteractionTime = Date.now(); }, { passive: true, capture: true });

    function boardIsUserInteracting() {
      if (_conUserPointerDown) return true;
      if (typeof _recIsRecording !== 'undefined' && _recIsRecording) return true;
      if (Date.now() - _conLastKeyInteractionTime < 1500) return true;
      const activeOverlay = document.querySelector('.con-sp-overlay.active, .modal.active, #save-filename-overlay.active, #con-close-overlay.active, #new-session-overlay.active, #con-merge-choice-overlay.active, #con-img-convert-overlay.active');
      if (activeOverlay) return true;
      return false;
    }

    let sessionLoadMode = null;
    let boardSessionCreationCounter = 0;
    const boardAutosaveFingerprint = global.boardAutosaveFingerprint || {
      constellation: '',
      textanalysis: '',
      notes: ''
    };
    const boardSessionDateCreated = {
      constellation: '',
      textanalysis: '',
      notes: ''
    };
    const boardSessionFileMeta = {
      constellation: { createdAt: 0, savedAt: 0 },
      textanalysis: { createdAt: 0, savedAt: 0 },
      notes: { createdAt: 0, savedAt: 0 }
    };

    function boardGenerateUniqueDateCreated() {
      boardSessionCreationCounter += 1;
      return new Date().toISOString() + '_' + boardSessionCreationCounter.toString(36);
    }

    function boardNormalizeDateCreated(section, value) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        const iso = new Date(value).toISOString();
        boardSessionDateCreated[section] = iso;
        return iso;
      }
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (trimmed) {
        boardSessionDateCreated[section] = trimmed;
        return trimmed;
      }
      const generated = boardGenerateUniqueDateCreated();
      boardSessionDateCreated[section] = generated;
      return generated;
    }

    function boardStartNewSessionDate(section) {
      boardSessionDateCreated[section] = boardGenerateUniqueDateCreated();
      return boardSessionDateCreated[section];
    }

    function boardSessionMeta(section) {
      return boardSessionFileMeta[section] || { createdAt: 0, savedAt: 0 };
    }

    function boardResetSessionFileMeta(section) {
      if (!boardSessionFileMeta[section]) return;
      boardSessionFileMeta[section] = { createdAt: 0, savedAt: 0 };
    }

    function boardSetSessionFileMeta(section, createdAt, savedAt) {
      if (!boardSessionFileMeta[section]) return;
      boardSessionFileMeta[section] = {
        createdAt: Number(createdAt) || 0,
        savedAt: Number(savedAt) || 0
      };
    }

    function boardSetSessionFileMetaFromData(section, data) {
      if (!data || typeof data !== 'object') {
        boardResetSessionFileMeta(section);
        return;
      }
      const createdAt = Number(data._createdAt || data.createdAt)
        || (data.dateCreated ? Date.parse(String(data.dateCreated).replace(/_\d+$/, '')) : 0)
        || 0;
      const savedAt = Number(data._savedAt || data.savedAt || data.updatedAt) || 0;
      boardSetSessionFileMeta(section, createdAt, savedAt);
    }

    function boardBuildPersistedSessionData(section, data, now = Date.now()) {
      const meta = boardSessionMeta(section);
      const createdAt = Number(data && (data._createdAt || data.createdAt))
        || Number(meta.createdAt)
        || ((data && data.dateCreated) ? Date.parse(String(data.dateCreated).replace(/_\d+$/, '')) : 0)
        || (boardSessionDateCreated[section] ? Date.parse(String(boardSessionDateCreated[section]).replace(/_\d+$/, '')) : 0)
        || now;
      const savedAt = Number(now) || Date.now();
      const persisted = Object.assign({
        _type: boardSessionType(section),
        _classGroup: activeClassGroup || undefined,
        _plannerEntryId: activePlannerEntryId || undefined,
        _createdAt: createdAt,
        _savedAt: savedAt
      }, data, {
        _createdAt: createdAt,
        _savedAt: savedAt,
        _plannerEntryId: activePlannerEntryId || undefined,
        _classGroup: activeClassGroup || undefined
      });
      boardSetSessionFileMeta(section, createdAt, savedAt);
      return persisted;
    }

    boardStartNewSessionDate('constellation');
    boardStartNewSessionDate('textanalysis');
    boardStartNewSessionDate('notes');

    function boardSessionType(section) {
      if (section === 'constellation') return 'constellation';
      if (section === 'notes') return 'notes';
      return 'textanalysis';
    }

    function boardSectionLabel(section) {
      if (section === 'constellation') return 'Constellation';
      if (section === 'notes') return 'Notes';
      return 'Textual Analysis';
    }

    function boardEscapeHtml(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    global.boardEscapeHtml = window.boardEscapeHtml = boardEscapeHtml;

    function wnRenderMathFragment(text) {
      const frag = document.createDocumentFragment();
      const source = String(text || '');
      const pattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
      let lastIndex = 0;
      let match;

      while ((match = pattern.exec(source))) {
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(source.slice(lastIndex, match.index)));
        }

        const displayMode = !!match[1];
        const tex = String(match[1] || match[2] || '');
        const span = document.createElement('span');
        span.className = displayMode ? 'wn-katex-display' : 'wn-katex-inline';
        span.dataset.katexTex = tex;
        span.dataset.katexDisplayMode = displayMode ? '1' : '0';

        try {
          if (typeof katex !== 'undefined' && katex && typeof katex.renderToString === 'function') {
            span.innerHTML = katex.renderToString(tex, {
              displayMode,
              throwOnError: false
            });
          } else {
            span.textContent = tex;
          }
        } catch (err) {
          span.className = 'wn-katex-error';
          span.textContent = tex;
        }

        frag.appendChild(span);
        lastIndex = pattern.lastIndex;
      }

      if (lastIndex < source.length) {
        frag.appendChild(document.createTextNode(source.slice(lastIndex)));
      }

      return frag;
    }

    function wnRenderMathHtml(html) {
      const source = String(html || '');
      if (!source || typeof document === 'undefined') return source;
      if (typeof katex === 'undefined' || !katex || typeof katex.renderToString !== 'function') return source;

      const root = document.createElement('div');
      root.innerHTML = source;

      const walk = node => {
        Array.from(node.childNodes).forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            child.replaceWith(wnRenderMathFragment(child.nodeValue));
            return;
          }
          if (child.nodeType !== Node.ELEMENT_NODE) return;
          if (child.classList.contains('katex')) return;
          const tag = child.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE' || tag === 'PRE') return;
          walk(child);
        });
      };

      walk(root);
      return root.innerHTML;
    }
    global.wnRenderMathFragment = window.wnRenderMathFragment = wnRenderMathFragment;
    global.wnRenderMathHtml = window.wnRenderMathHtml = wnRenderMathHtml;

    function wnShowKatexHelp() {
      if (typeof ShortcutsModal === 'undefined') return;
      const rows = [
        { section: t('katexHelpSecUsage') },
        { keys: ['$', '...', '$'], desc: t('katexHelpInlineDesc') },
        { keys: ['$$', '...', '$$'], desc: t('katexHelpBlockDesc') },
        { section: t('katexHelpSecExamples') },
        { keys: ['a^b'], desc: t('katexHelpExponent') },
        { keys: ['a_b'], desc: t('katexHelpSubscript') },
        { keys: ['\\frac{a}{b}'], desc: t('katexHelpFraction') },
        { keys: ['\\sqrt{x}'], desc: t('katexHelpSqrt') },
        { keys: ['\\sum'], desc: t('katexHelpSum') },
        { keys: ['\\alpha', '\\beta', '\\pi'], desc: t('katexHelpGreek') },
        { keys: ['\\times', '\\pm', '\\neq'], desc: t('katexHelpSymbols') }
      ];
      ShortcutsModal.open({
        title: t('katexHelpTitle'),
        rows: rows
      });
    }

    function boardMakeSessionId(section) {
      return section + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    function boardStripJsonExt(name) {
      return String(name || '').replace(/\.(json|js|cstz|zip)$/i, '');
    }

    function boardSanitizeFilenameKeepSpaces(raw) {
      return String(raw || '')
        .trim()
        .replace(/[\\/:*?"<>|]/g, '');
    }

    function boardNormalizeNameForDedup(name) {
      return boardStripJsonExt(String(name || ''))
        .toLowerCase()
        .replace(/[_\s]+/g, ' ')
        .trim();
    }

    function boardBuildSessionFileContent(data, exportName = 'BOARD_SESSION_EXPORT') {
      const safeName = String(exportName || 'BOARD_SESSION_EXPORT').replace(/[^A-Za-z0-9_$]/g, '_') || 'BOARD_SESSION_EXPORT';
      return 'window.' + safeName + ' = ' + JSON.stringify(data, null, 2) + ';\n';
    }

    function boardBuildSessionBlob(data, exportName = 'BOARD_SESSION_EXPORT') {
      return new Blob([boardBuildSessionFileContent(data, exportName)], { type: 'text/javascript;charset=utf-8' });
    }

    function boardParseSessionText(rawText) {
      const raw = String(rawText || '').replace(/^\uFEFF/, '').trim();
      if (!raw) throw new Error('Empty file.');
      try { return JSON.parse(raw); } catch (e) { }
      // Strip leading comment lines (e.g. // _createdAt: ... / // _savedAt: ...)
      const stripped = raw.replace(/^(\/\/[^\n]*\n?)+/, '').trim();
      const src = stripped || raw;
      const match = src.match(/^(?:window\.[A-Za-z_$][\w$]*\s*=\s*|const\s+[A-Za-z_$][\w$]*\s*=\s*|let\s+[A-Za-z_$][\w$]*\s*=\s*|var\s+[A-Za-z_$][\w$]*\s*=\s*|export\s+default\s+)([\s\S]*?)\s*;?\s*$/);
      if (match) return JSON.parse(match[1].trim());
      throw new Error('Invalid session file.');
    }

    function boardDefaultSessionName(section) {
      if (section === 'constellation') return 'constellation_session';
      if (section === 'notes') return 'notes_session';
      return 'textanalysis_session';
    }

    function boardDefaultFileName(section, preferredName = '') {
      const cleanName = boardStripJsonExt(String(preferredName || '').trim());
      const safeName = boardSanitizeFilenameKeepSpaces(cleanName);
      if (safeName) return safeName;
      if (section === 'constellation') return 'constellation';
      if (section === 'notes') return 'notes';
      return 'textanalysis';
    }

    function boardAutosaveName(section, data, classGroup = activeClassGroup) {
      const groupLabel = getClassGroupLabel(classGroup);
      if (section === 'constellation') {
        const title = boardStripJsonExt(data && data.title ? String(data.title).trim() : '');
        return title ? (groupLabel + ' - ' + title + ' - Autosave') : (groupLabel + ' - Constellation Autosave');
      }
      if (section === 'notes') {
        const title = boardStripJsonExt(data && data.title ? String(data.title).trim() : '');
        return title ? (groupLabel + ' - ' + title + ' - Autosave') : (groupLabel + ' - Notes Autosave');
      }
      if (section === 'textanalysis') {
        const title = boardStripJsonExt(data && data.title ? String(data.title).trim() : '');
        return title ? (groupLabel + ' - ' + title + ' - Autosave') : (groupLabel + ' - Textual Analysis Autosave');
      }
      return groupLabel + ' - Textual Analysis Autosave';
    }

    function boardSourceLabel(source) {
      if (source === 'autosave') return 'Autosave';
      if (source === 'manual-save') return 'Manual save';
      if (source === 'file-load') return 'Loaded from file';
      if (source === 'drag-drop') return 'Loaded by drag and drop';
      return 'Saved session';
    }

    function boardFormatWhen(ts) {
      const d = new Date(Number(ts) || Date.now());
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return y + '-' + m + '-' + day + ' ' + h + ':' + min;
    }

    function boardEmptyStore() {
      return { constellation: [], textanalysis: [], notes: [] };
    }

    function boardNormalizeEntry(section, entry) {
      if (!entry || typeof entry !== 'object') return null;
      const expectedType = boardSessionType(section);
      if (!entry.data || entry.data._type !== expectedType) return null;
      const savedAt = Number(entry.savedAt) || Date.now();
      return {
        id: String(entry.id || boardMakeSessionId(section)),
        classGroup: String(entry.classGroup || ''),
        plannerEntryId: String(entry.plannerEntryId || ''),
        source: String(entry.source || 'manual-save'),
        name: String(entry.name || boardDefaultSessionName(section)),
        savedAt,
        createdAt: Number(entry.createdAt) || savedAt,
        data: entry.data
      };
    }

    function boardGetSaveEntriesForExport(store = boardReadStore()) {
      const out = [];
      ['constellation', 'textanalysis', 'notes'].forEach(section => {
        const list = Array.isArray(store[section]) ? store[section] : [];
        list.forEach(entry => {
          if (!entry || entry.source !== 'manual-save') return;
          out.push({ section, entry });
        });
      });
      return out;
    }

    function boardApplyClassPrefixForGroup(name, classGroup) {
      const clean = String(name || '').trim() || 'session';
      const displayName = _cgDisplayName(classGroup) || classGroup;
      const safeGroup = sanitizeFilenamePart(displayName);
      if (!safeGroup) return clean;
      const prefix = safeGroup + '_';
      return clean.startsWith(prefix) ? clean : (prefix + clean);
    }

    function boardBuildExportBaseName(section, entry) {
      const rawName = boardStripJsonExt(String(entry && entry.name ? entry.name : boardDefaultSessionName(section)));
      if (entry && entry.source === 'autosave') {
        return sanitizeFilenamePart(rawName) || boardDefaultSessionName(section);
      }
      const prefixed = boardApplyClassPrefixForGroup(rawName, entry && entry.classGroup ? entry.classGroup : '');
      return boardSanitizeFilenameKeepSpaces(prefixed) || boardDefaultSessionName(section);
    }

    function boardExportTargetForSection(section) {
      if (section === 'textanalysis') return 'textualAnalyses';
      if (section === 'notes') return 'notes';
      return 'mindmaps';
    }

    function boardBuildExportFiles(store = boardReadStore()) {
      const entries = boardGetSaveEntriesForExport(store)
        .sort((a, b) => (Number(b.entry.savedAt) || 0) - (Number(a.entry.savedAt) || 0));
      const byTarget = {
        mindmaps: [],
        textualAnalyses: [],
        notes: []
      };
      const usedNamesByTarget = {
        mindmaps: new Set(),
        textualAnalyses: new Set(),
        notes: new Set()
      };

      entries.forEach(({ section, entry }) => {
        const target = boardExportTargetForSection(section);
        const usedNames = usedNamesByTarget[target];
        const candidate = boardBuildExportBaseName(section, entry);
        const dedupKey = boardNormalizeNameForDedup(candidate);
        if (usedNames.has(dedupKey)) return;
        usedNames.add(dedupKey);
        const exportData = Object.assign({}, entry.data, {
          _createdAt: Number(entry.createdAt) || Number(entry.savedAt) || Date.now(),
          _savedAt: Number(entry.savedAt) || Date.now()
        });
        const exportFileEntry = {
          filename: candidate + '.js',
          content: boardBuildSessionFileContent(exportData, 'BOARD_SESSION_EXPORT'),
          encoding: 'utf8',
          mtimeMs: Number(entry.savedAt) || Date.now()
        };
        if (section === 'constellation') {
          exportFileEntry.subdir = candidate;
        }
        byTarget[target].push(exportFileEntry);
      });

      return byTarget;
    }

    async function boardExportSessionsBeforeQuit() {
      return { ok: true };
    }

    window.boardExportSessionsBeforeQuit = boardExportSessionsBeforeQuit;

    function boardReadStore() {
      let raw = '';
      try { raw = localStorage.getItem(BOARD_SAVED_SESSIONS_KEY) || ''; } catch (e) { }
      if (!raw) return boardEmptyStore();
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) { return boardEmptyStore(); }
      const out = boardEmptyStore();
      ['constellation', 'textanalysis'].forEach(section => {
        const list = Array.isArray(parsed && parsed[section]) ? parsed[section] : [];
        out[section] = list
          .map(entry => boardNormalizeEntry(section, entry))
          .filter(Boolean)
          .sort((a, b) => b.savedAt - a.savedAt);
      });
      return out;
    }

    function boardTryWriteStore(store) {
      try {
        localStorage.setItem(BOARD_SAVED_SESSIONS_KEY, JSON.stringify(store));
        return true;
      } catch (e) {
        return false;
      }
    }

    function boardTrimSectionEntries(entries) {
      const byClass = {};
      const out = [];
      const sorted = [...entries].sort((a, b) => b.savedAt - a.savedAt);
      sorted.forEach(entry => {
        const key = entry.classGroup || '';
        if (!byClass[key]) byClass[key] = { autosaveKept: false, kept: 0 };
        const bucket = byClass[key];
        if (entry.source === 'autosave') {
          if (bucket.autosaveKept) return;
          bucket.autosaveKept = true;
          out.push(entry);
          return;
        }
        if (bucket.kept >= BOARD_MAX_SESSIONS_PER_CLASS) return;
        bucket.kept += 1;
        out.push(entry);
      });
      return out.slice(0, BOARD_MAX_SESSIONS_PER_SECTION);
    }

    function boardWriteStoreWithFallback(store) {
      if (boardTryWriteStore(store)) return true;
      let guard = 0;
      while (guard < 120) {
        guard += 1;
        let candidate = null;
        ['constellation', 'textanalysis'].forEach(section => {
          const list = store[section] || [];
          list.forEach((entry, idx) => {
            const item = {
              section,
              idx,
              savedAt: Number(entry.savedAt) || 0,
              autosave: entry.source === 'autosave'
            };
            if (!candidate) {
              candidate = item;
              return;
            }
            if (item.autosave !== candidate.autosave) {
              if (item.autosave) candidate = item;
              return;
            }
            if (item.savedAt < candidate.savedAt) candidate = item;
          });
        });
        if (!candidate) return false;
        store[candidate.section].splice(candidate.idx, 1);
        if (boardTryWriteStore(store)) return true;
      }
      return false;
    }

    function boardPersistLocalSession(section, data, options = {}) {
      const expectedType = boardSessionType(section);
      if (!data || data._type !== expectedType) return;
      const store = boardReadStore();
      const list = Array.isArray(store[section]) ? store[section] : [];
      const classGroup = typeof options.classGroup === 'string' ? options.classGroup : (activeClassGroup || '');
      const source = options.source || 'manual-save';
      const name = String(options.name || boardDefaultSessionName(section));
      const now = Date.now();

      if (source === 'autosave') {
        const existingIdx = list.findIndex(e => e.classGroup === classGroup && e.source === 'autosave');
        const id = existingIdx >= 0 ? list[existingIdx].id : boardMakeSessionId(section);
        const createdAt = existingIdx >= 0 ? (Number(list[existingIdx].createdAt) || now) : now;
        const autosaveEntry = { id, classGroup, plannerEntryId: activePlannerEntryId, source, name, savedAt: now, createdAt, data };
        if (existingIdx >= 0) list.splice(existingIdx, 1, autosaveEntry);
        else list.push(autosaveEntry);
      } else if (source === 'manual-save') {
        const normalizedName = boardNormalizeNameForDedup(name);
        const existingIdx = list.findIndex(e =>
          e &&
          e.source === 'manual-save' &&
          e.classGroup === classGroup &&
          boardNormalizeNameForDedup(e.name) === normalizedName
        );
        const id = existingIdx >= 0 ? list[existingIdx].id : boardMakeSessionId(section);
        const createdAt = existingIdx >= 0 ? (Number(list[existingIdx].createdAt) || now) : now;
        const manualEntry = { id, classGroup, plannerEntryId: activePlannerEntryId, source, name, savedAt: now, createdAt, data };
        if (existingIdx >= 0) list.splice(existingIdx, 1, manualEntry);
        else list.push(manualEntry);
      } else {
        list.push({
          id: boardMakeSessionId(section),
          classGroup,
          plannerEntryId: activePlannerEntryId,
          source,
          name,
          savedAt: now,
          createdAt: now,
          data
        });
      }

      store[section] = boardTrimSectionEntries(
        list
          .map(entry => boardNormalizeEntry(section, entry))
          .filter(Boolean)
      );
      boardWriteStoreWithFallback(store);

      if (sessionLoadMode === section) renderSessionLoadPopup();
    }

    function boardComputeFingerprint(section, data) {
      if (section !== 'constellation') return '';
      try {
        const sessionData = (data && !data._isPageRestore) ? data : (typeof conBuildSessionData === 'function' ? conBuildSessionData() : null);
        if (!sessionData) return '';
        const clean = JSON.parse(JSON.stringify(sessionData));
        delete clean._savedAt;
        delete clean.savedAt;
        delete clean._createdAt;
        delete clean.dateCreated;
        delete clean._version;
        delete clean._revision;
        delete clean.currentPage;
        delete clean._mediaMap;
        delete clean._thumbnails;

        function cleanPageData(page) {
          if (!page || typeof page !== 'object') return;
          delete page._revision;
          if (Array.isArray(page.notes)) {
            page.notes.forEach(n => {
              if (n) {
                delete n.liveBaseWidth;
                delete n.liveBaseHeight;
              }
            });
          }
        }
        cleanPageData(clean);
        if (Array.isArray(clean.pages)) {
          clean.pages.forEach(cleanPageData);
        }

        const classGroup = typeof activeClassGroup === 'string' ? activeClassGroup : '';
        const plannerId = typeof activePlannerEntryId === 'string' ? activePlannerEntryId : '';
        return JSON.stringify(clean) + '|' + classGroup + '|' + plannerId;
      } catch (e) {
        return String(Date.now());
      }
    }

    function boardSetAutosaveFingerprint(section, data) {
      if (typeof boardSetDirty === 'function') {
        boardSetDirty(false);
      } else if (typeof _boardIsDirty !== 'undefined') {
        _boardIsDirty = false;
      }
      boardAutosaveFingerprint[section] = boardComputeFingerprint(section, data);
      if (typeof boardResetAutosaveInterval === 'function') {
        boardResetAutosaveInterval();
      }
    }



    // ================================================================
    // HISTORY BROWSER (ELECTRON SAVED FILES)
    // ================================================================

    var historyEntries = [];
    var historyLoading = false;
    var historyEnriching = false;
    var historyHasLoaded = false;
    var _historyNeedsRender = false;
    var historySelectedKeys = new Set();
    var historyFilterDateFrom = '';
    var historyFilterDateTo = '';
    var historyFilterClass = '';
    var historyFilterText = '';
    var historyContentCache = new Map();
    var historyContentSearchTimer = null;

    var boardHistoryMetaCacheKey = 'board_history_meta_cache_v1';
    var boardHistoryMetaCache = {};
    try {
      boardHistoryMetaCache = JSON.parse(localStorage.getItem(boardHistoryMetaCacheKey) || '{}') || {};
    } catch (_) { boardHistoryMetaCache = {}; }

    function historySaveMetaCache() {
      try {
        localStorage.setItem(boardHistoryMetaCacheKey, JSON.stringify(boardHistoryMetaCache));
      } catch (_) { }
    }

    function historyUpdateSpinnerUi() {
      const slot = document.getElementById('history-spinner-slot');
      const isBusy = historyLoading || historyEnriching;
      if (slot) {
        slot.innerHTML = isBusy ? '<span class="history-hourglass-spinner" title="Loading history files...">⏳</span>' : '';
      }
    }

    var _historyAutoLoadTimer = null;

    function historyOnSectionHover() {
      if (_historyAutoLoadTimer) {
        clearTimeout(_historyAutoLoadTimer);
        _historyAutoLoadTimer = null;
      }
      if (!historyHasLoaded && !historyLoading && typeof historyRefreshList === 'function') {
        historyRefreshList();
      }
    }
    window.historyOnSectionHover = historyOnSectionHover;

    function historyEntryRelativePath(entry) {
      const raw = String((entry && (entry.relativePath || entry.filename)) || '');
      return raw.replace(/\\/g, '/');
    }

    function historyEntryIsNestedPath(entry) {
      return historyEntryRelativePath(entry).includes('/');
    }

    function historyNormalizeRelativePath(value) {
      return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
    }

    function historyCurrentConstellationPathCandidates() {
      const out = new Set();
      const file = String(_conCurrentFileName || '').trim();
      const folder = String(_conCurrentFolderName || '').trim();
      if (!file) return out;

      if (folder) {
        out.add(historyNormalizeRelativePath(folder + '/' + file));
      } else {
        out.add(historyNormalizeRelativePath(file));
      }
      return out;
    }

    function historyUnlinkDeletedCurrentConstellation(entry) {
      if (!(entry && entry.target === 'mindmaps')) return;
      if (!_conCurrentFileName) return;

      const deletedRel = historyNormalizeRelativePath(historyEntryRelativePath(entry));
      if (!deletedRel) return;

      const candidates = historyCurrentConstellationPathCandidates();
      if (!candidates.has(deletedRel)) return;

      _conCurrentFileName = null;
      _conCurrentFolderName = null;
      global._conCurrentFileName = null;
      global._conCurrentFolderName = null;
      boardResetSessionFileMeta('constellation');
      boardAutosaveFingerprint.constellation = '';
      boardReportActiveFileContext();
      if (window.conUpdatePageBar) window.conUpdatePageBar();
      mdbToast('ℹ️ Current board unlinked from deleted file. It will not be recreated on close.');
    }

    function historyEntryKey(entry) {
      if (!(entry && entry.target)) return null;
      const rel = historyEntryRelativePath(entry);
      return rel ? (entry.target + ':' + rel) : null;
    }

    function historyArchiveMovePaths(entry, mode) {
      if (!entry) return null;
      const rel = historyEntryRelativePath(entry);
      if (!rel) return null;
      const prefix = 'archived/';

      if (mode === 'archive') {
        if (rel.startsWith(prefix)) return null;
        if (entry.target === 'mindmaps' && historyEntryIsNestedPath(entry)) {
          const parts = rel.split('/').filter(Boolean);
          if (parts.length === 2) {
            return { from: parts[0], to: prefix + parts[0] };
          }
        }
        return { from: rel, to: prefix + rel };
      }

      if (mode === 'unarchive') {
        if (!rel.startsWith(prefix)) return null;
        if (entry.target === 'mindmaps' && historyEntryIsNestedPath(entry)) {
          const parts = rel.split('/').filter(Boolean);
          if (parts.length === 3 && parts[0] === 'archived') {
            return { from: parts[0] + '/' + parts[1], to: parts[1] };
          }
        }
        return { from: rel, to: rel.slice(prefix.length) };
      }

      return null;
    }

    function historyUpdateSelectionUI() {
      const exportBtn = document.getElementById('history-export-btn');
      const deleteSelectedBtn = document.getElementById('history-delete-selected-btn');
      const archiveSelectedBtn = document.getElementById('history-archive-selected-btn');
      const unarchiveSelectedBtn = document.getElementById('history-unarchive-selected-btn');
      const hasSelection = historySelectedKeys.size > 0;
      if (exportBtn) exportBtn.classList.toggle('visible', hasSelection);
      if (deleteSelectedBtn) deleteSelectedBtn.classList.toggle('visible', hasSelection);
      if (archiveSelectedBtn) archiveSelectedBtn.classList.toggle('visible', hasSelection && historyViewTab !== 'archived');
      if (unarchiveSelectedBtn) unarchiveSelectedBtn.classList.toggle('visible', hasSelection && historyViewTab === 'archived');
      const zipSelectedBtn = document.getElementById('history-zip-selected-btn');
      if (zipSelectedBtn) zipSelectedBtn.classList.toggle('visible', hasSelection && historyViewTab === 'archived');

      const allChk = document.getElementById('history-select-all');
      if (allChk) {
        const visibleEntries = historyGetSortedEntries();
        const total = visibleEntries.length;
        const selectedCount = visibleEntries.filter(e => historySelectedKeys.has(historyEntryKey(e))).length;
        allChk.checked = total > 0 && selectedCount === total;
        allChk.indeterminate = selectedCount > 0 && selectedCount < total;
      }
    }

    function historyToggleSelect(key, checked) {
      if (!key) return;
      if (checked) {
        historySelectedKeys.add(key);
      } else {
        historySelectedKeys.delete(key);
      }
      historyUpdateSelectionUI();
    }

    function historySelectAll(checked) {
      const visibleEntries = historyGetSortedEntries();
      visibleEntries.forEach(entry => {
        const key = historyEntryKey(entry);
        if (!key) return;
        if (checked) {
          historySelectedKeys.add(key);
        } else {
          historySelectedKeys.delete(key);
        }
      });
      historyRenderList();
    }
    var historySortKey = 'modified';
    var historySortDir = 'desc';
    var historyViewTab = 'manual';

    function historySetFilterDate(which, value) {
      if (which === 'from') historyFilterDateFrom = value || '';
      else historyFilterDateTo = value || '';
      historyRenderList();
    }

    function historySetFilterClass(value) {
      historyFilterClass = value || '';
      historyRenderList();
    }

    function historyNormalizeText(str) {
      if (!str) return '';
      return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function historyGetSnippet(text, query) {
      if (!text || !query) return '';
      const normText = historyNormalizeText(text);
      const normQuery = historyNormalizeText(query);
      let idx = text.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) idx = normText.indexOf(normQuery);
      if (idx === -1) return '';
      const ctx = 55;
      const start = Math.max(0, idx - ctx);
      const end = Math.min(text.length, idx + query.length + ctx);
      let snippet = text.slice(start, end).trim();
      if (start > 0) snippet = '[…] ' + snippet;
      if (end < text.length) snippet += ' […]';
      return snippet;
    }

    function historyExtractSearchText(rawContent) {
      var parts = [];
      var re = /"(?:baseWord|text|label|title|notes|comment|dbWord|sourceWord)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      var m;
      var totalLen = 0;
      while ((m = re.exec(rawContent)) !== null && totalLen < 50000) {
        if (m[1]) {
          var clean = m[1].replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\"/g, '"').trim();
          if (clean) {
            parts.push(clean);
            totalLen += clean.length + 1;
          }
        }
      }
      return parts.join(' ').toLowerCase();
    }

    var historyContentSearchGen = 0;

    function historySetFilterText(value) {
      historyFilterText = (value || '').trim().toLowerCase();
      if (historyContentSearchTimer) clearTimeout(historyContentSearchTimer);
      if (!historyFilterText) { historyRenderList(); return; }
      historyContentSearchTimer = setTimeout(historyRunContentSearch, 300);
    }

    async function historyRunContentSearch() {
      historyContentSearchTimer = null;
      if (!historyFilterText) { historyRenderList(); return; }
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function')) {
        historyRenderList(); return;
      }
      const currentGen = ++historyContentSearchGen;
      const toRead = historyEntries.filter(e => {
        const key = historyEntryKey(e);
        return key && !historyContentCache.has(key);
      });
      if (toRead.length > 0) {
        historySetStatus('Searching content… (0/' + toRead.length + ')');
        let done = 0;
        const BATCH = 8;
        for (let i = 0; i < toRead.length; i += BATCH) {
          if (historyContentSearchGen !== currentGen) return;
          const batch = toRead.slice(i, i + BATCH);
          await Promise.all(batch.map(async entry => {
            const key = historyEntryKey(entry);
            const rel = historyEntryRelativePath(entry);
            const isArchive = rel && (rel.endsWith('.cstz') || rel.endsWith('.zip'));
            try {
              if (isArchive) {
                if (entry.searchText) {
                  historyContentCache.set(key, entry.searchText);
                } else if (typeof Desktop.inspectBoardArchive === 'function') {
                  const inspectRes = await Desktop.inspectBoardArchive(entry.target, rel);
                  const st = (inspectRes && (inspectRes.searchText || (inspectRes.manifest && inspectRes.manifest.searchText))) || '';
                  entry.searchText = st;
                  historyContentCache.set(key, st);
                } else {
                  historyContentCache.set(key, '');
                }
              } else {
                const result = await Desktop.readByPath(entry.target, entry.relativePath);
                historyContentCache.set(key, historyExtractSearchText(result && result.content ? result.content : ''));
              }
            } catch (e) {
              historyContentCache.set(key, '');
            }
          }));
          if (historyContentSearchGen !== currentGen) return;
          done = Math.min(i + BATCH, toRead.length);
          if (historyFilterText) historySetStatus('Searching content… (' + done + '/' + toRead.length + ')');
          // Yield to event loop to keep UI thread fluid at 60fps
          await new Promise(r => setTimeout(r, 0));
        }
      }
      if (historyContentSearchGen === currentGen) {
        historyRenderList();
      }
    }

    function historyClearFilters() {
      historyFilterDateFrom = '';
      historyFilterDateTo = '';
      historyFilterClass = '';
      historyFilterText = '';
      if (historyContentSearchTimer) { clearTimeout(historyContentSearchTimer); historyContentSearchTimer = null; }
      const fromEl = document.getElementById('history-filter-date-from');
      const toEl = document.getElementById('history-filter-date-to');
      const classEl = document.getElementById('history-filter-class');
      const textEl = document.getElementById('history-filter-text');
      if (fromEl) fromEl.value = '';
      if (toEl) toEl.value = '';
      if (classEl) classEl.value = '';
      if (textEl) textEl.value = '';
      historyRenderList();
    }

    function historyRenderFilters() {
      const classEl = document.getElementById('history-filter-class');
      if (!classEl) return;
      // Collect unique class groups from non-archived entries
      const groups = new Map();
      historyEntries.forEach(entry => {
        if (!entry || entry.source === 'archived') return;
        const key = entry.classGroup || '';
        const label = entry.classLabel || '';
        if (!groups.has(key)) groups.set(key, label || key || '(No class)');
      });
      // Rebuild options preserving current selection
      const current = historyFilterClass;
      classEl.innerHTML = '<option value="">All classes</option>';
      Array.from(groups.entries())
        .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }))
        .forEach(([key, label]) => {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = label;
          opt.selected = key === current;
          classEl.appendChild(opt);
        });
    }

    async function historyExecuteArchiveMove(entry, mode) {
      if (!entry || !entry.target) throw new Error('Invalid history entry.');
      const rel = historyEntryRelativePath(entry);
      if (!rel) throw new Error('Archive path could not be resolved.');

      if (mode === 'archive') {
        if (rel.startsWith('archived/')) return;
        if (entry.target === 'mindmaps') {
          const parts = rel.split('/').filter(Boolean);
          const baseName = boardStripJsonExt(entry.filename || (parts.length ? parts[parts.length - 1] : ''));

          if (parts.length === 2) {
            const folderName = parts[0];
            const res = await Desktop.renameByPath('mindmaps', folderName, 'archived/' + folderName);
            if (!res || !res.ok) throw new Error((res && res.error) ? res.error : 'Could not archive session folder.');

            const rootFile = baseName + '.js';
            try {
              const stat = await Desktop.statByPath('mindmaps', rootFile);
              if (stat && stat.ok && stat.exists && stat.isFile) {
                await Desktop.renameByPath('mindmaps', rootFile, 'archived/' + rootFile);
              }
            } catch (_) { }
          } else {
            const res = await Desktop.renameByPath('mindmaps', rel, 'archived/' + rel);
            if (!res || !res.ok) throw new Error((res && res.error) ? res.error : 'Could not archive file.');

            if (baseName) {
              try {
                const stat = await Desktop.statByPath('mindmaps', baseName);
                if (stat && stat.ok && stat.exists && stat.isDirectory) {
                  await Desktop.renameByPath('mindmaps', baseName, 'archived/' + baseName);
                }
              } catch (_) { }
            }
          }
        } else {
          const res = await Desktop.renameByPath(entry.target, rel, 'archived/' + rel);
          if (!res || !res.ok) throw new Error((res && res.error) ? res.error : 'Could not archive file.');
        }
      } else if (mode === 'unarchive') {
        if (!rel.startsWith('archived/')) return;
        const unarchivedRel = rel.slice('archived/'.length);

        if (entry.target === 'mindmaps') {
          const parts = rel.split('/').filter(Boolean);
          const baseName = boardStripJsonExt(entry.filename || (parts.length ? parts[parts.length - 1] : ''));

          if (parts.length === 3 && parts[0] === 'archived') {
            const folderName = parts[1];
            const res = await Desktop.renameByPath('mindmaps', 'archived/' + folderName, folderName);
            if (!res || !res.ok) throw new Error((res && res.error) ? res.error : 'Could not unarchive session folder.');

            const rootFile = 'archived/' + baseName + '.js';
            try {
              const stat = await Desktop.statByPath('mindmaps', rootFile);
              if (stat && stat.ok && stat.exists && stat.isFile) {
                await Desktop.renameByPath('mindmaps', rootFile, baseName + '.js');
              }
            } catch (_) { }
          } else {
            const res = await Desktop.renameByPath('mindmaps', rel, unarchivedRel);
            if (!res || !res.ok) throw new Error((res && res.error) ? res.error : 'Could not unarchive file.');

            if (baseName) {
              try {
                const stat = await Desktop.statByPath('mindmaps', 'archived/' + baseName);
                if (stat && stat.ok && stat.exists && stat.isDirectory) {
                  await Desktop.renameByPath('mindmaps', 'archived/' + baseName, baseName);
                }
              } catch (_) { }
            }
          }
        } else {
          const res = await Desktop.renameByPath(entry.target, rel, unarchivedRel);
          if (!res || !res.ok) throw new Error((res && res.error) ? res.error : 'Could not unarchive file.');
        }
      }
    }

    async function historyArchiveEntry(entry) {
      if (!entry || !entry.target) return;
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.renameByPath === 'function')) {
        mdbToast('⚠️ Archiving requires the Electron desktop app.');
        return;
      }
      try {
        await historyExecuteArchiveMove(entry, 'archive');
        mdbToast('✔ Archived.');
        historyUpdateArchiveState(entry, 'archive');
      } catch (error) {
        mdbToast('⚠️ Could not archive: ' + (error && error.message ? error.message : String(error)));
      }
    }

    async function historyUnarchiveEntry(entry) {
      if (!entry || !entry.target) return;
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.renameByPath === 'function')) {
        mdbToast('⚠️ Unarchiving requires the Electron desktop app.');
        return;
      }
      try {
        await historyExecuteArchiveMove(entry, 'unarchive');
        mdbToast('✔ Unarchived.');
        historyUpdateArchiveState(entry, 'unarchive');
      } catch (error) {
        mdbToast('⚠️ Could not unarchive: ' + (error && error.message ? error.message : String(error)));
      }
    }

    async function historyArchiveSelected() {
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.renameByPath === 'function')) {
        mdbToast('⚠️ Archiving requires the Electron desktop app.');
        return;
      }
      const toArchive = historyGetSortedEntries().filter(e => historySelectedKeys.has(historyEntryKey(e)));
      if (!toArchive.length) { mdbToast('No files selected.'); return; }
      let done = 0; let failed = 0;
      const succeeded = [];
      for (const entry of toArchive) {
        try {
          await historyExecuteArchiveMove(entry, 'archive');
          done++;
          succeeded.push(entry);
        } catch (e) {
          console.warn('Archive failed for entry:', entry, e);
          failed++;
        }
      }
      mdbToast(failed ? '⚠️ Archived ' + done + ', ' + failed + ' failed.' : '✔ Archived ' + done + ' file(s).');
      if (succeeded.length) {
        historyUpdateArchiveState(succeeded, 'archive');
      }
    }

    async function historyUnarchiveSelected() {
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.renameByPath === 'function')) {
        mdbToast('⚠️ Unarchiving requires the Electron desktop app.');
        return;
      }
      const toUnarchive = historyGetSortedEntries().filter(e => historySelectedKeys.has(historyEntryKey(e)));
      if (!toUnarchive.length) { mdbToast('No files selected.'); return; }
      let done = 0; let failed = 0;
      const succeeded = [];
      for (const entry of toUnarchive) {
        try {
          await historyExecuteArchiveMove(entry, 'unarchive');
          done++;
          succeeded.push(entry);
        } catch (e) {
          console.warn('Unarchive failed for entry:', entry, e);
          failed++;
        }
      }
      mdbToast(failed ? '⚠️ Unarchived ' + done + ', ' + failed + ' failed.' : '✔ Unarchived ' + done + ' file(s).');
      if (succeeded.length) {
        historyUpdateArchiveState(succeeded, 'unarchive');
      }
    }

    async function historyZipSingleEntry(entry) {
      if (!entry) return;
      await historyZipArchivedEntries([entry]);
    }

    async function historyZipSelected() {
      const toZip = historyGetSortedEntries().filter(e => e && e.source === 'archived' && historySelectedKeys.has(historyEntryKey(e)));
      if (!toZip.length) {
        mdbToast('No archived files selected.');
        return;
      }
      await historyZipArchivedEntries(toZip);
    }

    async function historyZipArchivedEntries(entries) {
      if (!Array.isArray(entries) || !entries.length) return;
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.zipAndDeleteArchived === 'function')) {
        mdbToast('⚠️ Zipping archived files requires the Electron desktop app.');
        return;
      }

      let defaultZipName = '';
      if (entries.length === 1) {
        const base = entries[0].baseName || boardStripJsonExt(entries[0].filename) || 'archive';
        defaultZipName = base + '.zip';
      } else {
        const dateStr = new Date().toISOString().slice(0, 10);
        defaultZipName = 'archived_sessions_' + dateStr + '.zip';
      }

      const promptMsg = (typeof i18n !== 'undefined' && i18n.t)
        ? i18n.t('historyZipPrompt')
        : 'Enter name for the ZIP archive (files will be zipped and originals deleted):';

      let requestedName = defaultZipName;
      if (typeof window.showPrompt === 'function') {
        const entered = await window.showPrompt(promptMsg, defaultZipName);
        if (entered === null || entered === undefined) return;
        requestedName = String(entered).trim();
      }

      if (!requestedName) requestedName = defaultZipName;
      if (!requestedName.toLowerCase().endsWith('.zip')) {
        requestedName += '.zip';
      }

      const target = entries[0].target || 'mindmaps';
      const items = entries.map(e => ({
        target: e.target || target,
        filename: e.filename,
        relativePath: historyEntryRelativePath(e)
      }));

      try {
        const res = await Desktop.zipAndDeleteArchived(target, items, requestedName, 'archived');
        if (!res || !res.ok) {
          throw new Error(res && res.error ? res.error : 'Zip creation failed.');
        }

        const count = res.deletedCount || res.count || entries.length;
        mdbToast('✔ Created ' + res.zipFilename + ' and deleted ' + count + ' original file(s).');
        historySelectedKeys.clear();
        historyRecordZipped(entries, res.zipFilename || requestedName, 'archived/' + (res.zipFilename || requestedName), target);
      } catch (error) {
        mdbToast('⚠️ Could not zip files: ' + (error && error.message ? error.message : String(error)));
      }
    }

    function historyInit() {
      historyRenderViewTabs();
      historyRenderList();

      if (!_historyAutoLoadTimer && !historyHasLoaded) {
        _historyAutoLoadTimer = setTimeout(() => {
          _historyAutoLoadTimer = null;
          if (!historyHasLoaded && !historyLoading && typeof historyRefreshList === 'function') {
            historyRefreshList();
          }
        }, 1200);
      }
    }

    async function historySetViewTab(tab) {
      const next = tab === 'archived' ? 'archived' : 'manual';
      historyViewTab = next;
      historyRenderViewTabs();
      if (next === 'archived' && !historyArchivedLoaded && !historyArchivedLoading) {
        await historyLoadArchivedFiles();
      } else {
        historyRenderList();
      }
    }

    function historyRenderViewTabs() {
      const manualBtn = document.getElementById('history-tab-manual');
      const archivedBtn = document.getElementById('history-tab-archived');
      if (manualBtn) manualBtn.classList.toggle('btn-grey', historyViewTab !== 'manual');
      if (archivedBtn) archivedBtn.classList.toggle('btn-grey', historyViewTab !== 'archived');
      const filterBar = document.getElementById('history-filter-bar');
      if (filterBar) filterBar.style.display = historyViewTab === 'archived' ? 'none' : '';
    }

    function historySectionFromTarget(target) {
      if (target === 'mindmaps') return 'constellation';
      if (target === 'notes') return 'notes';
      return 'textanalysis';
    }

    function historySectionLabel(section) {
      if (section === 'constellation') return 'Constellation';
      if (section === 'notes') return 'Notes';
      return 'Textual Analysis';
    }

    function historyDateKeyFromTimestamp(ts) {
      const d = new Date(Number(ts) || Date.now());
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    }

    function historyExtractDateKey(baseName, fallbackTs) {
      const m = String(baseName || '').match(/(20\d{2})[-_](\d{2})[-_](\d{2})/);
      if (m) {
        return m[1] + '-' + m[2] + '-' + m[3];
      }
      return historyDateKeyFromTimestamp(fallbackTs);
    }

    function historyNormalizeForCompare(value) {
      return sanitizeFilenamePart(value).toLowerCase();
    }

    function historyInferClassGroup(baseName) {
      const name = String(baseName || '').trim();
      if (!name) return '';
      const nameLower = name.toLowerCase();
      const noneSafe = historyNormalizeForCompare('No class prefix');
      if (nameLower === noneSafe || nameLower.startsWith(noneSafe + '_') || nameLower.startsWith(noneSafe + ' - ')) {
        return '';
      }

      const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META)
        ? CLASS_GROUPS_META
        : (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA && CLASS_GROUPS_DATA.classGroupsMeta)
          ? CLASS_GROUPS_DATA.classGroupsMeta
          : (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS ? CLASS_GROUPS : null);

      if (meta) {
        const groupCandidates = Object.keys(meta).map(key => {
          const m = meta[key];
          const dispName = (m && m.name) ? m.name : (typeof _cgDisplayName === 'function' ? _cgDisplayName(key) : key);
          return {
            key,
            dispName: String(dispName || ''),
            dispLower: String(dispName || '').toLowerCase(),
            safe: historyNormalizeForCompare(dispName || key)
          };
        }).filter(item => !!item.dispLower)
          .sort((a, b) => b.dispLower.length - a.dispLower.length);

        // Check hyphen-separated slot filename tokens: e.g. "2026-08-21 - 5B - 08-30 - Topic"
        const parts = name.split(/\s*-\s*/);
        for (const part of parts) {
          const partLower = part.trim().toLowerCase();
          for (const item of groupCandidates) {
            if (partLower === item.dispLower || partLower === item.key.toLowerCase()) {
              return item.key;
            }
          }
        }

        // Check prefix matches (e.g. "5B_Topic", "5B - Topic")
        for (const item of groupCandidates) {
          if (nameLower === item.safe || nameLower.startsWith(item.safe + '_') || nameLower.startsWith(item.dispLower + ' - ') || nameLower.startsWith(item.dispLower + '_')) {
            return item.key;
          }
        }
      }

      const autosaveMatch = name.match(/^(.*)_-_.*_Autosave$/i) || name.match(/^(.*)\s+-\s+.*Autosave$/i);
      if (autosaveMatch && autosaveMatch[1]) {
        const autosaveGroup = autosaveMatch[1].replace(/_/g, ' ').trim();
        if (!autosaveGroup || autosaveGroup.toLowerCase() === 'no class prefix') {
          return '';
        }
        return autosaveGroup;
      }

      return '';
    }

    function historyBuildEntry(target, file) {
      const filename = String((file && file.filename) || '');
      const relativePath = String((file && (file.relativePath || file.filename)) || filename).replace(/\\/g, '/');
      const baseName = boardStripJsonExt(filename);
      const fallbackMs = Date.now();
      const modifiedAt = Number(file && (file.savedAt || file.updatedAt || file.mtimeMs || file.ctimeMs || file.birthtimeMs)) || fallbackMs;
      const fsCreatedAt = Number(file && (file.birthtimeMs || file.ctimeMs)) || 0;
      const metaCreatedAt = Number(file && (file.createdAt || file._createdAt))
        || (file && file.dateCreated ? Date.parse(String(file.dateCreated).replace(/_\d+$/, '')) : 0)
        || 0;
      let createdAt = metaCreatedAt || fsCreatedAt;
      if (createdAt && modifiedAt && createdAt === modifiedAt && fsCreatedAt && fsCreatedAt !== modifiedAt) {
        createdAt = fsCreatedAt;
      }
      const cached = boardHistoryMetaCache[relativePath];
      let classGroup = (file && file.classGroup) || (cached && cached.classGroup) || historyInferClassGroup(baseName);
      let plannerEntryId = (file && file.plannerEntryId) || (cached && cached.plannerEntryId) || '';
      let competences = (file && file.competences) || (cached && cached.competences) || (file && file.data && file.data.competences) || [];
      if (!classGroup && plannerEntryId && window.PLANNER_ENTRIES_BY_CLASS) {
        const byClass = window.PLANNER_ENTRIES_BY_CLASS || {};
        for (const cid of Object.keys(byClass)) {
          const arr = Array.isArray(byClass[cid]) ? byClass[cid] : [];
          if (arr.some(e => e.id === plannerEntryId)) {
            classGroup = cid;
            break;
          }
        }
      }
      const isArchived = relativePath.startsWith('archived/');
      const source = isArchived ? 'archived'
        : ((file && file.source === 'autosave') || /autosave/i.test(baseName))
          ? 'autosave'
          : 'manual-save';
      const entry = {
        target,
        section: historySectionFromTarget(target),
        source,
        filename,
        relativePath,
        baseName,
        classGroup,
        plannerEntryId,
        competences: Array.isArray(competences) ? competences : [],
        classLabel: getClassGroupLabel(classGroup),
        dateKey: historyExtractDateKey(baseName, createdAt || modifiedAt),
        createdAt,
        modifiedAt,
        size: Number(file && file.size) || 0
      };
      if (classGroup) entry._enrichAttempted = true;
      return entry;
    }

    function historyFindEntryIndex(target, relOrFilename) {
      if (!relOrFilename) return -1;
      target = target || 'mindmaps';
      const normRel = historyNormalizeRelativePath(relOrFilename);
      const normBase = boardStripJsonExt(relOrFilename).toLowerCase();
      const normFile = String(relOrFilename || '').replace(/\\/g, '/').split('/').pop().toLowerCase();
      return historyEntries.findIndex(e => {
        if (!e || e.target !== target) return false;
        const eRel = historyNormalizeRelativePath(historyEntryRelativePath(e));
        if (eRel === normRel) return true;
        const eFile = String(e.filename || '').toLowerCase();
        if (eFile === normFile) return true;
        const eBase = String(e.baseName || '').toLowerCase();
        if (eBase === normBase) return true;
        return false;
      });
    }

    function historyUpsertEntry(target, filename, relativePath, sessionData, options = {}) {
      if (!filename) return;
      target = target || 'mindmaps';
      const rel = String(relativePath || filename).replace(/\\/g, '/');
      const baseName = boardStripJsonExt(filename);
      const existingIdx = historyFindEntryIndex(target, rel);

      const now = Date.now();
      let classGroup = (sessionData && (sessionData._classGroup || sessionData.classGroup)) || historyInferClassGroup(baseName);
      let plannerEntryId = (sessionData && (sessionData._plannerEntryId || sessionData.plannerEntryId)) || '';
      if (!classGroup && plannerEntryId && window.PLANNER_ENTRIES_BY_CLASS) {
        const byClass = window.PLANNER_ENTRIES_BY_CLASS || {};
        for (const cid of Object.keys(byClass)) {
          const arr = Array.isArray(byClass[cid]) ? byClass[cid] : [];
          if (arr.some(e => e.id === plannerEntryId)) {
            classGroup = cid;
            break;
          }
        }
      }
      const isArchived = rel.startsWith('archived/');
      const source = isArchived ? 'archived' : (options.isAutosave ? 'autosave' : 'manual-save');
      const createdAt = (sessionData && Number(sessionData._createdAt || sessionData.createdAt)) || now;

      const entryData = {
        target,
        section: historySectionFromTarget(target),
        source,
        filename,
        relativePath: rel,
        baseName,
        classGroup,
        plannerEntryId,
        competences: (sessionData && (sessionData.competences || sessionData.competenceTags)) || (Array.isArray(_conCurrentCompetences) ? _conCurrentCompetences.slice() : []),
        classLabel: getClassGroupLabel(classGroup),
        dateKey: historyExtractDateKey(baseName, createdAt),
        createdAt,
        modifiedAt: now,
        size: Number(options.size) || 0
      };

      if (existingIdx !== -1) {
        const existing = historyEntries[existingIdx];
        entryData.createdAt = existing.createdAt || entryData.createdAt;
        entryData.size = (options.size !== undefined && options.size !== null && Number(options.size) > 0) ? Number(options.size) : (existing.size || 0);
        historyEntries[existingIdx] = Object.assign(existing, entryData);
        const key = historyEntryKey(existing);
        if (key) historyContentCache.delete(key);
      } else {
        historyEntries.unshift(entryData);
      }

      if (rel && (classGroup || plannerEntryId || (entryData.competences && entryData.competences.length))) {
        boardHistoryMetaCache[rel] = {
          classGroup: classGroup || '',
          plannerEntryId: plannerEntryId || '',
          competences: Array.isArray(entryData.competences) ? entryData.competences : [],
          createdAt: entryData.createdAt || 0,
          modifiedAt: now
        };
        historySaveMetaCache();

        if (typeof LinksService !== 'undefined' && typeof LinksService.addLink === 'function') {
          const bUrn = LinksService.makeUrn('board', rel);
          if (plannerEntryId) {
            LinksService.addLink(bUrn, LinksService.makeUrn('planner', plannerEntryId), {
              relation: 'planner_slot',
              sourceMeta: { title: baseName, relativePath: rel, target },
              targetMeta: { classId: classGroup || '' }
            }).catch(() => {});
          }
          if (classGroup) {
            LinksService.addLink(bUrn, LinksService.makeUrn('class', classGroup), {
              relation: 'class_session',
              sourceMeta: { title: baseName, relativePath: rel, target }
            }).catch(() => {});
          }
        }
      }

      _historyNeedsRender = true;
      const historySec = document.getElementById('history-section') || document.getElementById('main-menu');
      if (historySec && !historySec.classList.contains('hidden')) {
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(() => {
            if (_historyNeedsRender) {
              _historyNeedsRender = false;
              historyRenderList();
            }
          });
        } else {
          setTimeout(() => {
            if (_historyNeedsRender) {
              _historyNeedsRender = false;
              historyRenderList();
            }
          }, 50);
        }
      }
    }

    function historyRemoveEntry(target, relOrFilename) {
      const idx = historyFindEntryIndex(target, relOrFilename);
      if (idx !== -1) {
        const entry = historyEntries[idx];
        const key = historyEntryKey(entry);
        if (key) {
          historySelectedKeys.delete(key);
          historyContentCache.delete(key);
        }
        const rel = historyEntryRelativePath(entry);
        if (rel && boardHistoryMetaCache[rel]) {
          delete boardHistoryMetaCache[rel];
          historySaveMetaCache();
        }
        historyEntries.splice(idx, 1);
        historyRenderList();
      }
    }

    function historyRemoveEntries(entries) {
      if (!Array.isArray(entries) || !entries.length) return;
      const toRemoveKeys = new Set(entries.map(e => historyEntryKey(e)).filter(Boolean));
      historyEntries = historyEntries.filter(e => {
        const k = historyEntryKey(e);
        if (k && toRemoveKeys.has(k)) {
          historySelectedKeys.delete(k);
          historyContentCache.delete(k);
          return false;
        }
        return true;
      });
      historyRenderList();
    }

    function historyUpdateRenamedEntry(target, oldRelOrFilename, newFilename, newRelativePath) {
      const idx = historyFindEntryIndex(target, oldRelOrFilename);
      if (idx === -1) return;
      const entry = historyEntries[idx];
      const oldKey = historyEntryKey(entry);
      if (oldKey) {
        historySelectedKeys.delete(oldKey);
        historyContentCache.delete(oldKey);
      }
      const rel = (newRelativePath || newFilename).replace(/\\/g, '/');
      entry.filename = newFilename;
      entry.relativePath = rel;
      entry.baseName = boardStripJsonExt(newFilename);
      entry.classGroup = historyInferClassGroup(entry.baseName) || entry.classGroup;
      entry.classLabel = getClassGroupLabel(entry.classGroup);
      entry.dateKey = historyExtractDateKey(entry.baseName, entry.createdAt || entry.modifiedAt);
      entry.modifiedAt = Date.now();
      historyRenderList();
    }

    function historyUpdateArchiveState(entries, mode) {
      if (!Array.isArray(entries)) entries = [entries];
      entries.forEach(entry => {
        if (!entry) return;
        const oldKey = historyEntryKey(entry);
        if (oldKey) {
          historySelectedKeys.delete(oldKey);
          historyContentCache.delete(oldKey);
        }
        const rel = historyEntryRelativePath(entry);
        if (mode === 'archive') {
          if (!rel.startsWith('archived/')) {
            entry.relativePath = 'archived/' + rel;
            entry.source = 'archived';
          }
        } else if (mode === 'unarchive') {
          if (rel.startsWith('archived/')) {
            entry.relativePath = rel.slice('archived/'.length);
            entry.source = 'manual-save';
          }
        }
      });
      historyRenderList();
    }

    function historyRecordZipped(deletedEntries, zipFilename, zipRelativePath, target) {
      historyRemoveEntries(deletedEntries);
      target = target || 'mindmaps';
      const rel = (zipRelativePath || ('archived/' + zipFilename)).replace(/\\/g, '/');
      const baseName = boardStripJsonExt(zipFilename);
      const now = Date.now();
      historyEntries.unshift({
        target,
        section: historySectionFromTarget(target),
        source: 'archived',
        filename: zipFilename,
        relativePath: rel,
        baseName,
        classGroup: '',
        plannerEntryId: '',
        classLabel: '',
        dateKey: historyExtractDateKey(baseName, now),
        createdAt: now,
        modifiedAt: now,
        size: 0
      });
      historyRenderList();
    }

    function historySetStatus(text) {
      const status = document.getElementById('history-status');
      if (!status) return;
      const textStr = String(text || '');
      if (historyLoading || historyEnriching) {
        status.innerHTML = '<span class="history-hourglass-spinner">⏳</span>' + boardEscapeHtml(textStr);
      } else {
        status.textContent = textStr;
      }
      historyUpdateSpinnerUi();
    }

    function historyFormatSize(size) {
      const bytes = Number(size) || 0;
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function historyCompareText(a, b) {
      return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
    }

    function historyGetSortedEntries() {
      const q = historyFilterText;
      const entries = historyEntries.filter(entry => {
        if (!entry) return false;
        if (q) {
          // Text search: include all sources (including archived), filter by filename, extension, relative path, class label, or cached content
          const normQ = historyNormalizeText(q);
          const fn = (entry.filename || '').toLowerCase();
          if (fn.indexOf(q) !== -1 || historyNormalizeText(fn).indexOf(normQ) !== -1) return true;
          const base = (entry.baseName || '').toLowerCase();
          if (base.indexOf(q) !== -1 || historyNormalizeText(base).indexOf(normQ) !== -1) return true;
          const rel = (entry.relativePath || '').toLowerCase();
          if (rel.indexOf(q) !== -1 || historyNormalizeText(rel).indexOf(normQ) !== -1) return true;
          const classLbl = (entry.classLabel || '').toLowerCase();
          if (classLbl.indexOf(q) !== -1 || historyNormalizeText(classLbl).indexOf(normQ) !== -1) return true;
          const key = historyEntryKey(entry);
          if (key && historyContentCache.has(key)) {
            const content = historyContentCache.get(key) || '';
            if (content.indexOf(q) !== -1 || historyNormalizeText(content).indexOf(normQ) !== -1) return true;
          }
          return false;
        }
        if (historyViewTab === 'archived') return entry.source === 'archived';
        if (entry.source === 'archived') return false;
        if (historyFilterDateFrom && entry.dateKey < historyFilterDateFrom) return false;
        if (historyFilterDateTo && entry.dateKey > historyFilterDateTo) return false;
        if (historyFilterClass && entry.classGroup !== historyFilterClass) return false;
        return true;
      });
      const dir = historySortDir === 'asc' ? 1 : -1;
      entries.sort((a, b) => {
        let cmp = 0;
        if (historySortKey === 'name') {
          cmp = historyCompareText(a.baseName || a.filename, b.baseName || b.filename);
        } else if (historySortKey === 'classGroup') {
          cmp = historyCompareText(a.classLabel, b.classLabel);
        } else if (historySortKey === 'date') {
          cmp = (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0);
        } else if (historySortKey === 'size') {
          cmp = (Number(a.size) || 0) - (Number(b.size) || 0);
        } else {
          cmp = (Number(a.modifiedAt) || 0) - (Number(b.modifiedAt) || 0);
        }

        if (cmp === 0) {
          cmp = historyCompareText(a.baseName || a.filename, b.baseName || b.filename);
        }
        return cmp * dir;
      });
      return entries;
    }

    function historyRenderSortIndicators() {
      ['name', 'classGroup', 'date', 'modified', 'size'].forEach(key => {
        const el = document.getElementById('history-sort-' + key);
        if (!el) return;
        el.textContent = key === historySortKey ? (historySortDir === 'asc' ? '↑' : '↓') : '';
      });
    }

    function historySetSort(key) {
      if (historySortKey === key) {
        historySortDir = historySortDir === 'asc' ? 'desc' : 'asc';
      } else {
        historySortKey = key;
        historySortDir = key === 'name' || key === 'classGroup' ? 'asc' : 'desc';
      }
      historyRenderList();
    }

    function historyDisplayBaseName(entry) {
      const base = String(entry.baseName || entry.filename || '');
      const cg = entry.classGroup || '';
      if (!cg) return base;
      const safePrefix = sanitizeFilenamePart(cg) + '_';
      if (base.toLowerCase().startsWith(safePrefix.toLowerCase())) {
        return base.slice(safePrefix.length) || base;
      }
      return base;
    }

    function historyRenderList() {
      const list = document.getElementById('history-list');
      if (!list) return;
      historyRenderViewTabs();
      historyRenderFilters();

      if (!(window.Desktop && Desktop.isElectron())) {
        historySetStatus('History browsing is available in the Electron desktop app.');
        list.innerHTML = '<div class="history-empty">Open this board in Electron to browse files in the mindmaps and textual analyses folders.</div>';
        return;
      }

      if (historyLoading) {
        historySetStatus('Loading saved files...');
        list.innerHTML = '<tr><td class="history-empty" colspan="7">Loading...</td></tr>';
        historyRenderSortIndicators();
        return;
      }

      const entries = historyGetSortedEntries();
      const allArchived = historyEntries.filter(entry => entry && entry.source === 'archived').length;
      const allManual = historyEntries.length - allArchived;
      if (historyFilterText) {
        historySetStatus(
          entries.length + ' result' + (entries.length === 1 ? '' : 's') + ' for "' + historyFilterText + '" (all files searched, including archived)'
        );
      } else {
        const currentLabel = historyViewTab === 'archived' ? 'archived' : 'saved files';
        historySetStatus(
          entries.length + ' ' + currentLabel + ' shown · '
          + allManual + ' active · '
          + allArchived + ' archived'
        );
      }
      historyRenderSortIndicators();

      list.innerHTML = '';
      if (!entries.length) {
        const emptyText = historyFilterText
          ? 'No files match "' + historyFilterText + '". Content search is loading — try again in a moment if results seem incomplete.'
          : historyViewTab === 'archived'
            ? 'No archived files. Use the 🗄 Archive button on a file to move it here.'
            : 'No saved files found.';
        list.innerHTML = '<tr><td class="history-empty" colspan="7">' + emptyText + '</td></tr>';
        historyUpdateSelectionUI();
        return;
      }

      const frag = document.createDocumentFragment();
      entries.forEach(entry => {
        const row = document.createElement('tr');
        const key = historyEntryKey(entry);

        const checkTd = document.createElement('td');
        checkTd.className = 'history-row-check';
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = !!(key && historySelectedKeys.has(key));
        chk.onchange = () => historyToggleSelect(key, chk.checked);
        checkTd.appendChild(chk);

        const nameTd = document.createElement('td');
        nameTd.className = 'history-row-name history-row-name-clickable';
        nameTd.textContent = historyDisplayBaseName(entry);
        nameTd.onclick = () => historyLoadSavedFile(entry);
        if (historyFilterText) {
          const cacheKey = historyEntryKey(entry);
          const cached = historyContentCache.get(cacheKey);
          if (cached) {
            const snippet = historyGetSnippet(cached, historyFilterText);
            if (snippet) {
              const snEl = document.createElement('div');
              snEl.style.cssText = 'font-size:0.73rem;color:#555;font-style:italic;margin-top:3px;white-space:normal;max-width:400px;';
              snEl.textContent = snippet;
              nameTd.appendChild(snEl);
            }
          }
        }

        const classTd = document.createElement('td');
        classTd.className = 'history-row-class';
        classTd.textContent = entry.classLabel;

        const dateTd = document.createElement('td');
        dateTd.className = 'history-row-date';
        dateTd.textContent = entry.createdAt ? boardFormatWhen(entry.createdAt) : 'Unknown';

        const modifiedTd = document.createElement('td');
        modifiedTd.className = 'history-row-date';
        modifiedTd.textContent = boardFormatWhen(entry.modifiedAt);

        const sizeTd = document.createElement('td');
        sizeTd.className = 'history-row-size';
        sizeTd.textContent = historyFormatSize(entry.size);

        const actionTd = document.createElement('td');
        actionTd.className = 'history-row-actions';

        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'history-actions-wrap';

        const actionsBtn = document.createElement('button');
        actionsBtn.className = 'action-btn btn-grey';
        actionsBtn.textContent = 'Actions ▾';

        function openActionsMenu(ev) {
          if (ev) ev.stopPropagation();
          const isOpen = menu.classList.contains('open');
          document.querySelectorAll('.history-actions-menu.open').forEach(m => m.classList.remove('open'));
          if (!isOpen) {
            menu.classList.add('open');
            setTimeout(() => document.addEventListener('click', function _close() {
              menu.classList.remove('open');
              document.removeEventListener('click', _close);
            }), 0);
          }
        }

        actionsBtn.onclick = openActionsMenu;

        row.addEventListener('contextmenu', (ev) => {
          ev.preventDefault();
          openActionsMenu(ev);
        });

        const menu = document.createElement('div');
        menu.className = 'history-actions-menu';

        function menuItem(label, action, danger, iconSvg) {
          const btn = document.createElement('button');
          if (iconSvg) {
            const img = document.createElement('img');
            img.src = iconSvg;
            img.className = 'btn-icon';
            img.alt = '';
            btn.appendChild(img);
            btn.appendChild(document.createTextNode(' ' + label));
          } else {
            btn.textContent = label;
          }
          if (danger) btn.className = 'danger';
          btn.onclick = (ev) => {
            if (ev) { ev.preventDefault(); ev.stopPropagation(); }
            menu.classList.remove('open');
            setTimeout(() => { action(); }, 0);
          };
          menu.appendChild(btn);
        }

        menuItem('Open', () => historyLoadSavedFile(entry), false, '../assets/icons/board.svg');
        menuItem('Open in New Window', () => boardOpenSessionInNewWindow({ type: 'file', entry }), false, '../assets/icons/board.svg');
        if (window.Desktop && Desktop.isElectron()) {
          menuItem('Show in Folder', () => {
            const rel = historyEntryRelativePath(entry);
            const folderPath = historyEntryIsNestedPath(entry) ? rel.split('/')[0] : rel;
            Desktop.showInFolder(entry.target, folderPath);
          }, false, '../assets/icons/file-manager.svg');
        }

        if (entry.source === 'archived') {
          menuItem('Unarchive', () => historyUnarchiveEntry(entry), false, '../assets/icons/unarchive.svg');
          menuItem(typeof i18n !== 'undefined' && i18n.t ? i18n.t('historyZipSingle') : 'Zip to Archive', () => historyZipSingleEntry(entry), false, '../assets/icons/archive.svg');
        } else {
          if (entry.target === 'mindmaps') {
            menuItem('Versions', () => conShowVersionHistory(entry), false, '../assets/icons/history.svg');
          }
          menuItem('Preview', () => historyPreviewEntry(entry), false, '../assets/icons/search.svg');
          menuItem('Rename', () => historyRenameEntry(entry), false, '../assets/icons/general-config.svg');
          menuItem('Duplicate', () => historyDuplicateEntry(entry), false, '../assets/icons/duplicate.svg');
          menuItem('Archive', () => historyArchiveEntry(entry), false, '../assets/icons/archive.svg');
        }

        const hr = document.createElement('hr');
        menu.appendChild(hr);
        menuItem('Delete', () => historyDeleteEntry(entry), true, '../assets/icons/delete.svg');

        actionsWrap.appendChild(actionsBtn);
        actionsWrap.appendChild(menu);
        actionTd.appendChild(actionsWrap);
        row.appendChild(checkTd);
        row.appendChild(nameTd);
        row.appendChild(classTd);
        row.appendChild(dateTd);
        row.appendChild(modifiedTd);
        row.appendChild(sizeTd);
        row.appendChild(actionTd);
        frag.appendChild(row);
      });
      list.appendChild(frag);
      historyUpdateSelectionUI();
    }

    let historyArchivedLoaded = false;
    let historyArchivedLoading = false;

    async function historyLoadArchivedFiles() {
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.listByPath === 'function')) {
        historyArchivedLoaded = true;
        historyRenderList();
        return;
      }
      historyArchivedLoading = true;
      historySetStatus('Scanning archived files…');
      historyUpdateSpinnerUi();
      try {
        const res = await Desktop.listByPath('mindmaps', 'archived', {
          extensions: ['.js', '.json', '.cstz', '.zip'],
          recursive: true,
          excludeDirs: ['history', 'pics', 'sounds', 'videos', 'pdf', 'templates']
        });
        const files = Array.isArray(res && res.files) ? res.files : [];
        const filtered = files.filter(file => {
          const rel = String((file && (file.relativePath || file.filename)) || '').replace(/\\/g, '/');
          const parts = rel.split('/').filter(Boolean);
          const filename = String((file && file.filename) || (parts.length ? parts[parts.length - 1] : ''));
          if (!filename) return false;
          if (filename.toLowerCase().endsWith('.cstz') || filename.toLowerCase().endsWith('.zip')) return true;
          if (parts.length === 3 && parts[0] === 'archived') {
            return boardStripJsonExt(filename).toLowerCase() === parts[1].toLowerCase();
          }
          if (parts.length === 2 && parts[0] === 'archived') return true;
          if (parts.length === 1) return true;
          if (parts.length === 2) {
            return boardStripJsonExt(filename).toLowerCase() === parts[0].toLowerCase();
          }
          return false;
        });

        historyEntries = historyEntries.filter(e => e && e.source !== 'archived');
        const newArchivedEntries = filtered.map(file => {
          const rawRel = String((file && (file.relativePath || file.filename)) || '').replace(/\\/g, '/');
          const normRel = rawRel.startsWith('archived/') ? rawRel : ('archived/' + rawRel);
          return historyBuildEntry('mindmaps', Object.assign({}, file, { relativePath: normRel, source: 'archived' }));
        });

        historyEntries = historyEntries.concat(newArchivedEntries);
        historyArchivedLoaded = true;
      } catch (e) {
        console.warn('Could not scan archived files:', e);
      } finally {
        historyArchivedLoading = false;
        historyRenderList();
        setTimeout(() => { historyEnrichEntryClassGroups(); }, 60);
      }
    }

    async function historyRefreshList() {
      if (_historyAutoLoadTimer) {
        clearTimeout(_historyAutoLoadTimer);
        _historyAutoLoadTimer = null;
      }

      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.listFiles === 'function')) {
        historyEntries = [];
        historySelectedKeys.clear();
        historyRenderList();
        return;
      }

      historyContentCache.clear();
      historySelectedKeys.clear();
      historyLoading = true;
      historyRenderList();

      try {
        const mindmapsRes = (typeof Desktop.listByPath === 'function')
          ? await Desktop.listByPath('mindmaps', '.', {
              extensions: ['.js', '.json', '.cstz', '.zip'],
              recursive: true,
              excludeDirs: ['archived', 'history', 'pics', 'sounds', 'videos', 'pdf', 'templates']
            })
          : await Desktop.listFiles('mindmaps', { extensions: ['.js', '.json', '.cstz', '.zip'] });

        const mindmapsFiles = Array.isArray(mindmapsRes && mindmapsRes.files) ? mindmapsRes.files : [];

        const filteredMindmapsFiles = mindmapsFiles.filter(file => {
          const rel = String((file && (file.relativePath || file.filename)) || '').replace(/\\/g, '/');
          const parts = rel.split('/').filter(Boolean);
          const filename = String((file && file.filename) || (parts.length ? parts[parts.length - 1] : ''));
          if (!filename) return false;
          if (filename.toLowerCase().endsWith('.cstz') || filename.toLowerCase().endsWith('.zip')) return true;
          if (parts.length <= 1) return true;
          if (parts.length === 2) {
            const folder = parts[0];
            return boardStripJsonExt(filename).toLowerCase() === folder.toLowerCase();
          }
          return false;
        });

        const existingArchived = historyArchivedLoaded ? historyEntries.filter(e => e && e.source === 'archived') : [];
        const activeEntries = filteredMindmapsFiles.map(file => historyBuildEntry('mindmaps', file));
        historyEntries = activeEntries.concat(existingArchived);

        if (historyViewTab === 'archived' && !historyArchivedLoaded && !historyArchivedLoading) {
          setTimeout(() => { historyLoadArchivedFiles(); }, 0);
        }
      } catch (error) {
        historyEntries = [];
        historySetStatus('Could not load history files.');
        const list = document.getElementById('history-list');
        if (list) {
          list.innerHTML = '<tr><td class="history-empty" colspan="7">Failed to read saved files: '
            + boardEscapeHtml(error && error.message ? error.message : String(error))
            + '</td></tr>';
        }
      } finally {
        historyLoading = false;
        historyHasLoaded = true;
        historyRenderList();
        setTimeout(() => { historyEnrichEntryClassGroups(); }, 60);
      }
    }

    async function historyEnrichEntryClassGroups() {
      if (!(window.Desktop && Desktop.isElectron())) return;
      const toEnrich = historyEntries.filter(e => !e.classGroup && !e._enrichAttempted);
      if (!toEnrich.length) return;
      toEnrich.forEach(e => { e._enrichAttempted = true; });
      historyEnriching = true;
      historyUpdateSpinnerUi();
      const BATCH = 6;
      let changed = false;
      try {
        for (let i = 0; i < toEnrich.length; i += BATCH) {
          const batch = toEnrich.slice(i, i + BATCH);
          await Promise.all(batch.map(async entry => {
            try {
              const rel = historyEntryRelativePath(entry);
              const isArchive = rel.endsWith('.cstz') || rel.endsWith('.zip');
              if (isArchive && typeof Desktop.inspectBoardArchive === 'function') {
                const inspectRes = await Desktop.inspectBoardArchive(entry.target, rel);
                if (inspectRes && inspectRes.ok) {
                  const cg = inspectRes.classGroup || (inspectRes.manifest && inspectRes.manifest.classGroup);
                  if (cg) {
                    entry.classGroup = cg;
                    entry.classLabel = getClassGroupLabel(cg);
                    changed = true;
                  }
                  const inspCreatedAt = Number(inspectRes.createdAt || (inspectRes.manifest && (inspectRes.manifest.createdAt || inspectRes.manifest._createdAt))) || 0;
                  if (inspCreatedAt) {
                    entry.createdAt = inspCreatedAt;
                    entry.dateKey = historyExtractDateKey(entry.baseName, inspCreatedAt);
                    changed = true;
                  }
                  const inspSavedAt = Number(inspectRes.savedAt || inspectRes.mtimeMs || (inspectRes.manifest && (inspectRes.manifest.updatedAt || inspectRes.manifest.savedAt))) || 0;
                  if (inspSavedAt) {
                    entry.modifiedAt = inspSavedAt;
                    changed = true;
                  }
                  if (inspectRes.plannerEntryId) {
                    const pid = inspectRes.plannerEntryId;
                    entry.plannerEntryId = pid;
                    const byClass = window.PLANNER_ENTRIES_BY_CLASS || {};
                    for (const cid of Object.keys(byClass)) {
                      const arr = Array.isArray(byClass[cid]) ? byClass[cid] : [];
                      if (arr.some(e => e.id === pid)) {
                        entry.classGroup = cid;
                        entry.classLabel = getClassGroupLabel(cid);
                        changed = true;
                        break;
                      }
                    }
                  }
                  if (entry.classGroup || entry.plannerEntryId) {
                    boardHistoryMetaCache[rel] = {
                      classGroup: entry.classGroup || '',
                      plannerEntryId: entry.plannerEntryId || '',
                      createdAt: entry.createdAt || 0,
                      modifiedAt: entry.modifiedAt || 0
                    };
                    historySaveMetaCache();
                  }
                  const st = inspectRes.searchText || (inspectRes.manifest && inspectRes.manifest.searchText) || '';
                  if (st) {
                    entry.searchText = st;
                    const eKey = historyEntryKey(entry);
                    if (eKey) historyContentCache.set(eKey, st);
                  }
                  return;
                }
                return;
              }

              if (typeof Desktop.readByPath !== 'function') return;
              const result = await Desktop.readByPath(entry.target, rel, { encoding: 'utf8' });
              if (!(result && result.ok && result.content)) return;
              const content = result.content;
              const cgMatch = content.match(/"_classGroup"\s*:\s*"([^"]*)"/);
              if (cgMatch && cgMatch[1]) {
                entry.classGroup = cgMatch[1];
                entry.classLabel = getClassGroupLabel(cgMatch[1]);
                changed = true;
              }
              const pidMatch = content.match(/"_plannerEntryId"\s*:\s*"([^"]*)"/);
              if (pidMatch && pidMatch[1]) {
                const pid = pidMatch[1];
                entry.plannerEntryId = pid;
                const byClass = window.PLANNER_ENTRIES_BY_CLASS || {};
                for (const cid of Object.keys(byClass)) {
                  const arr = Array.isArray(byClass[cid]) ? byClass[cid] : [];
                  if (arr.some(e => e.id === pid)) {
                    entry.classGroup = cid;
                    entry.classLabel = getClassGroupLabel(cid);
                    changed = true;
                    break;
                  }
                }
              }
              if (entry.classGroup || entry.plannerEntryId) {
                boardHistoryMetaCache[rel] = {
                  classGroup: entry.classGroup || '',
                  plannerEntryId: entry.plannerEntryId || '',
                  createdAt: entry.createdAt || 0,
                  modifiedAt: entry.modifiedAt || 0
                };
                historySaveMetaCache();
              }
            } catch { }
          }));
          await new Promise(r => setTimeout(r, 16));
        }
      } finally {
        historyEnriching = false;
        historyUpdateSpinnerUi();
      }
      if (changed) {
        historyRenderFilters();
        historyRenderList();
      }
    }

    async function historyReadEntryText(entry) {
      if (!entry || !entry.target) {
        return { ok: false, error: 'Invalid history entry.' };
      }

      if (historyEntryIsNestedPath(entry) && typeof Desktop.readByPath === 'function') {
        return Desktop.readByPath(entry.target, historyEntryRelativePath(entry), { encoding: 'utf8' });
      }

      return Desktop.readText(entry.target, entry.filename);
    }

    async function historyReadEntryJson(entry) {
      if (!entry || !entry.target) {
        return { ok: false, error: 'Invalid history entry.' };
      }

      const rel = historyEntryRelativePath(entry) || entry.filename || '';
      const isArchive = rel.endsWith('.cstz') || rel.endsWith('.zip');

      if (isArchive && window.Desktop && typeof Desktop.readBoardArchive === 'function') {
        const r = await Desktop.readBoardArchive(entry.target, rel);
        if (r && r.ok && r.boardData) {
          r.boardData._mediaMap = r.media || null;
          r.boardData._thumbnails = r.thumbnails || null;
          if (r.manifest) {
            if (!r.boardData._createdAt && (r.manifest.createdAt || r.manifest._createdAt)) {
              r.boardData._createdAt = Number(r.manifest.createdAt || r.manifest._createdAt);
            }
            if (!r.boardData._savedAt && (r.manifest.updatedAt || r.manifest.savedAt || r.manifest._savedAt)) {
              r.boardData._savedAt = Number(r.manifest.updatedAt || r.manifest.savedAt || r.manifest._savedAt);
            }
            if (!r.boardData.dateCreated && r.manifest.dateCreated) {
              r.boardData.dateCreated = r.manifest.dateCreated;
            }
          }
          if (Array.isArray(r.boardData.attachments)) {
            conSetAttachmentsFromSession(r.boardData.attachments, r.media);
          }
          return { ok: true, data: r.boardData, file: rel, repair: null, isArchive: true };
        }
      }

      if (!historyEntryIsNestedPath(entry)) {
        return Desktop.readJson(entry.target, entry.filename);
      }

      const readResult = await historyReadEntryText(entry);
      if (!readResult || !readResult.ok) {
        return readResult;
      }

      try {
        const data = boardParseSessionText(readResult.content || '');
        return { ok: true, data, file: readResult.file || historyEntryRelativePath(entry), repair: null };
      } catch (error) {
        return { ok: false, error: error && error.message ? error.message : String(error) };
      }
    }

    async function historyExportSelected() {
      if (historySelectedKeys.size === 0) return;
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.exportFiles === 'function')) {
        mdbToast('⚠️ Exporting files requires the Electron desktop app.');
        return;
      }

      const files = [];
      for (const entry of historyEntries) {
        if (!(entry && historySelectedKeys.has(historyEntryKey(entry)))) continue;
        const relPath = historyEntryRelativePath(entry);
        files.push({
          target: entry.target,
          filename: entry.filename,
          relativePath: relPath,
          relativeExportPath: relPath
        });
        // For mindmap sessions stored in a subfolder, include all companion folder contents
        if (entry.target === 'mindmaps' && historyEntryIsNestedPath(entry) && typeof Desktop.listByPath === 'function') {
          const folderPath = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : null;
          if (folderPath) {
            try {
              const folderRes = await Desktop.listByPath(entry.target, folderPath, { recursive: true });
              const folderFiles = Array.isArray(folderRes && folderRes.files) ? folderRes.files : [];
              for (const f of folderFiles) {
                const fRelPath = String((f.relativePath || f.filename) || '').replace(/\\/g, '/');
                if (!fRelPath || fRelPath === relPath) continue;
                files.push({
                  target: entry.target,
                  filename: f.filename,
                  relativePath: fRelPath,
                  relativeExportPath: fRelPath
                });
              }
            } catch { }
          }
        }
      }

      if (!files.length) return;

      try {
        const result = await Desktop.exportFiles(files);
        if (!result) return;
        if (result.canceled) return;
        if (!result.ok) {
          throw new Error(result.error || 'Export failed.');
        }
        const count = Array.isArray(result.exported) ? result.exported.length : 0;
        const errCount = Array.isArray(result.errors) ? result.errors.length : 0;
        if (errCount > 0) {
          mdbToast('⚠️ Exported ' + count + ' file(s) with ' + errCount + ' error(s).');
        } else {
          mdbToast('✔ Exported ' + count + ' file(s) to folder.');
        }
        historySelectedKeys.clear();
        historyRenderList();
      } catch (error) {
        mdbToast('⚠️ Could not export files: ' + (error && error.message ? error.message : String(error)));
      }
    }

    async function historyDeleteSelected() {
      if (historySelectedKeys.size === 0) return;
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.deleteFile === 'function')) {
        mdbToast('⚠️ Deleting files requires the Electron desktop app.');
        return;
      }

      const entriesToDelete = historyEntries.filter(entry => entry && historySelectedKeys.has(historyEntryKey(entry)));
      if (!entriesToDelete.length) return;

      historyBulkDeleteOpen('Delete ' + entriesToDelete.length + ' selected file(s)? This cannot be undone.', async () => {
        let deleted = 0;
        let failed = 0;
        const deletedEntries = [];
        for (const entry of entriesToDelete) {
          try {
            const result = await historyDeleteSavedEntry(entry);
            if (result && result.ok) {
              deleted += 1;
              deletedEntries.push(entry);
            } else {
              failed += 1;
            }
          } catch {
            failed += 1;
          }
        }
        if (failed > 0) {
          mdbToast('⚠️ Deleted ' + deleted + ' file(s), ' + failed + ' failed.');
        } else {
          mdbToast('✔ Deleted ' + deleted + ' selected file(s).');
        }
        historyRemoveEntries(deletedEntries);
      });
    }

    async function historyDeleteAll() {
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.deleteFile === 'function')) {
        mdbToast('⚠️ Deleting files requires the Electron desktop app.');
        return;
      }

      const entriesToDelete = historyGetSortedEntries();
      if (!entriesToDelete.length) {
        mdbToast('No files to delete in this view.');
        return;
      }

      const scopeLabel = historyViewTab === 'archived' ? 'all archived files' : 'all saved files';
      historyBulkDeleteOpen('Delete ' + entriesToDelete.length + ' file(s) in this view (' + scopeLabel + ')? This cannot be undone.', async () => {
        let deleted = 0;
        let failed = 0;
        const deletedEntries = [];
        for (const entry of entriesToDelete) {
          try {
            const result = await historyDeleteSavedEntry(entry);
            if (result && result.ok) {
              deleted += 1;
              deletedEntries.push(entry);
            } else {
              failed += 1;
            }
          } catch {
            failed += 1;
          }
        }
        if (failed > 0) {
          mdbToast('⚠️ Deleted ' + deleted + ' file(s), ' + failed + ' failed.');
        } else {
          mdbToast('✔ Deleted ' + deleted + ' file(s).');
        }
        historyRemoveEntries(deletedEntries);
      });
    }

    async function historyDeleteSavedEntry(entry) {
      if (!entry || !entry.target || !entry.filename) {
        return { ok: false, error: 'Invalid history entry.' };
      }

      if (historyEntryIsNestedPath(entry) && typeof Desktop.deleteByPath === 'function') {
        const rel = historyEntryRelativePath(entry);
        const result = await Desktop.deleteByPath(entry.target, rel, { recursive: false, force: true });

        if (entry.target === 'mindmaps') {
          const parts = rel.split('/').filter(Boolean);
          if (parts.length >= 2) {
            try {
              const folderToDelete = (parts[0] === 'archived' && parts.length >= 3)
                ? (parts[0] + '/' + parts[1])
                : parts[0];
              await Desktop.deleteByPath(entry.target, folderToDelete, { recursive: true, force: true });
            } catch { }
          }
        }

        if (result && result.ok) {
          historyUnlinkDeletedCurrentConstellation(entry);
        }
        return result;
      }

      const shouldDeleteCompanionFolder = entry.target === 'mindmaps';
      const result = await Desktop.deleteFile(
        entry.target,
        entry.filename,
        { deleteCompanionFolder: shouldDeleteCompanionFolder }
      );

      // Fallback for older desktop builds that do not support deleteCompanionFolder.
      if (shouldDeleteCompanionFolder
        && result && result.ok
        && window.Desktop
        && typeof Desktop.deleteByPath === 'function') {
        const companionPath = boardStripJsonExt(entry.filename);
        if (companionPath) {
          try {
            await Desktop.deleteByPath(entry.target, companionPath, { recursive: true, force: true });
          } catch { }
        }
      }

      if (result && result.ok) {
        historyUnlinkDeletedCurrentConstellation(entry);
      }

      return result;
    }

    async function boardOpenSessionInNewWindow(request = {}) {
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.openTool === 'function')) {
        mdbToast('⚠️ Opening in a new window requires the Electron desktop app.');
        return false;
      }

      const query = {};

      if (request.type === 'local') {
        const mode = request.mode === 'constellation' || request.mode === 'notes' || request.mode === 'textanalysis'
          ? request.mode
          : '';
        const entryId = String(request.entryId || '').trim();
        if (!mode || !entryId) {
          mdbToast('⚠️ Could not open this session in a new window.');
          return false;
        }
        query.openLocalSession = '1';
        query.openLocalMode = mode;
        query.openLocalEntryId = entryId;
      } else {
        const entry = request.entry;
        if (!(entry && entry.target && entry.filename)) {
          mdbToast('⚠️ Could not open this file in a new window.');
          return false;
        }
        query.openSession = '1';
        query.openTarget = entry.target;
        query.openFilename = entry.filename;
        query.openRelPath = historyEntryRelativePath(entry);
        query.openSection = entry.section || historySectionFromTarget(entry.target);
      }

      try {
        if (typeof closeSessionLoadPopup === 'function') closeSessionLoadPopup();
        const result = await Desktop.openTool('board.html', { query, newWindow: true });
        if (!result || !result.ok) {
          throw new Error(result && result.error ? result.error : 'Could not open a new board window.');
        }
        return true;
      } catch (error) {
        mdbToast('⚠️ Could not open new window: ' + (error && error.message ? error.message : String(error)));
        return false;
      }
    }

    function boardClearPendingOpenQueryParams(params) {
      const search = params instanceof URLSearchParams ? params : new URLSearchParams(location.search);
      [
        'openSession', 'openTarget', 'openFilename', 'openRelPath', 'openSection',
        'openLocalSession', 'openLocalMode', 'openLocalEntryId'
      ].forEach(key => search.delete(key));
      const nextQuery = search.toString();
      const nextUrl = location.pathname + (nextQuery ? ('?' + nextQuery) : '') + (location.hash || '');
      history.replaceState(null, '', nextUrl);
    }

    async function boardConsumePageWindowPayload() {
      const params = new URLSearchParams(location.search);
      const token = params.get('pwToken');
      const targetPageIdx = Math.max(0, parseInt(params.get('viewPage') || '0', 10) || 0);
      let payload = null;
      if (token) {
        try {
          const raw = localStorage.getItem('cmt_board_pw_' + token);
          if (raw) {
            payload = JSON.parse(raw);
            localStorage.removeItem('cmt_board_pw_' + token);
          }
        } catch (e) {
          console.warn('Could not read page window payload from localStorage', e);
        }
      }

      window._isPageWindow = true;
      _boardIsDirty = false;

      // Switch view directly to constellation section so the board appears immediately
      if (typeof navTo === 'function') {
        navTo('constellation-section');
      }

      if (payload && payload.session) {
        try {
          if (typeof _conRestoreSession === 'function') {
            _conRestoreSession(payload.session);
          }
          if (typeof window.conGoToPage === 'function') {
            window.conGoToPage(targetPageIdx);
          }
          if (payload.sourceTitle && typeof window.conSetTitle === 'function') {
            window.conSetTitle(payload.sourceTitle);
          }
        } catch (err) {
          console.warn('Error restoring page window payload', err);
        }
      } else {
        if (typeof window.conGoToPage === 'function') {
          window.conGoToPage(targetPageIdx);
        }
      }

      // Detach active file references so no background autosave or close save can target the file
      _conCurrentFileName = '';
      _conCurrentFolderName = '';
      global._conCurrentFileName = '';
      global._conCurrentFolderName = '';
      _boardIsDirty = false;

      boardUpdateDocumentTitle();
      boardRenderPageWindowBadge(targetPageIdx);

      if (typeof window.conScheduleLayoutRefresh === 'function') {
        window.conScheduleLayoutRefresh();
      }

      setTimeout(() => {
        const saveBtn = document.querySelector('button[onclick*="conSaveSession"]');
        if (saveBtn) {
          saveBtn.style.opacity = '0.6';
          saveBtn.title = typeof t === 'function' ? t('conPageWindowSaveDisabled') : 'Saving is disabled in secondary page windows to prevent overwriting the main session.';
        }
      }, 100);
    }

    function boardRenderPageWindowBadge(pageIndex) {
      if (document.getElementById('con-page-window-badge')) return;
      const badge = document.createElement('div');
      badge.id = 'con-page-window-badge';
      badge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:#fef08a;color:#111;border:2px solid #000;box-shadow:2px 2px 0 #000;font-size:0.75rem;font-weight:800;border-radius:4px;margin-left:8px;flex-shrink:0;user-select:none;';
      const label = typeof t === 'function' ? t('conPageWindowBadge') : 'Secondary Window (Saving Disabled)';
      badge.innerHTML = `<img src="../assets/icons/monitor.svg" style="width:13px;height:13px;flex-shrink:0;" alt="" /> <span id="con-page-window-badge-text">Page ${pageIndex + 1} • ${escapeSearchHtml(label)}</span>`;
      const titleWrap = document.getElementById('con-title-input')?.parentElement;
      if (titleWrap) {
        titleWrap.appendChild(badge);
      } else {
        const tbLeft = document.querySelector('.con-tb-left');
        if (tbLeft) tbLeft.appendChild(badge);
      }
    }

    async function boardConsumePendingOpenRequestFromQuery() {
      if (new URLSearchParams(location.search).get('mirror') === '1') return;
      if (new URLSearchParams(location.search).get('pageWindow') === '1') {
        await boardConsumePageWindowPayload();
        return;
      }

      const params = new URLSearchParams(location.search);
      const pendingNodeId = params.get('nodeId');
      const wantsFile = params.get('openSession') === '1' || params.has('open') || params.has('file');
      const wantsLocal = params.get('openLocalSession') === '1';
      if (!wantsFile && !wantsLocal) {
        if (pendingNodeId) {
          setTimeout(() => {
            if (typeof conFocusAndHighlightNode === 'function') {
              conFocusAndHighlightNode(pendingNodeId);
            }
          }, 400);
        }
        try {
          const raw = sessionStorage.getItem('cmt-board-active-open-request');
          if (raw) {
            const req = JSON.parse(raw);
            if (req && req.target && req.filename) {
              await historyLoadSavedFile(req);
              if (pendingNodeId || req.nodeId) {
                setTimeout(() => {
                  if (typeof conFocusAndHighlightNode === 'function') {
                    conFocusAndHighlightNode(pendingNodeId || req.nodeId);
                  }
                }, 350);
              }
              return;
            }
          }
        } catch (_) { }

        try {
          const savedH = parseInt(sessionStorage.getItem('cmt-board-expanded-height-0') || sessionStorage.getItem('cmt-board-expanded-height'), 10);
          if (savedH && savedH > 0) {
            const b = document.getElementById('constellation-board');
            if (b) b.style.height = savedH + 'px';
            if (typeof conPageSnapshots !== 'undefined' && conPageSnapshots[0]) {
              conPageSnapshots[0].boardHeight = savedH;
            }
          }
        } catch (_) { }
        if (window.BoardWelcomeShowcase && typeof window.BoardWelcomeShowcase.checkAndAutoLoadOnFirstOpen === 'function') {
          await window.BoardWelcomeShowcase.checkAndAutoLoadOnFirstOpen();
        }
        return;
      }

      if (wantsFile) {
        const target = params.get('openTarget') || (params.has('open') || params.has('file') ? 'mindmaps' : '');
        const filename = params.get('openFilename') || params.get('open') || params.get('file') || '';
        const relativePath = params.get('openRelPath') || filename;
        const section = params.get('openSection') || historySectionFromTarget(target);
        boardClearPendingOpenQueryParams(params);
        if (!target || !filename) {
          mdbToast('⚠️ Missing file details for opening this session.');
          return;
        }
        try {
          sessionStorage.setItem('cmt-board-active-open-request', JSON.stringify({ target, filename, relativePath, section, nodeId: pendingNodeId }));
        } catch (_) { }
        await historyLoadSavedFile({ target, filename, relativePath, section });
        if (pendingNodeId) {
          setTimeout(() => {
            if (typeof conFocusAndHighlightNode === 'function') {
              conFocusAndHighlightNode(pendingNodeId);
            }
          }, 350);
        }
        return;
      }

      const mode = params.get('openLocalMode') || '';
      const entryId = params.get('openLocalEntryId') || '';
      boardClearPendingOpenQueryParams(params);
      if (!(mode === 'constellation' || mode === 'notes' || mode === 'textanalysis') || !entryId) {
        mdbToast('⚠️ Missing local session details for opening this session.');
        return;
      }

      const store = boardReadStore();
      const entries = Array.isArray(store[mode]) ? store[mode] : [];
      const entry = entries.find(e => String(e && e.id) === String(entryId));
      if (!entry) {
        mdbToast('⚠️ This saved session is no longer available.');
        return;
      }
      boardRestoreLocalSessionEntry(mode, entry, { closePopup: false });
    }

    async function historyLoadSavedFile(entry) {
      if (!entry || !entry.target || !entry.filename) return;
      try {
        sessionStorage.setItem('cmt-board-active-open-request', JSON.stringify({
          target: entry.target,
          filename: entry.filename,
          relativePath: entry.relativePath || entry.filename,
          section: entry.section || 'constellation'
        }));
      } catch (_) { }
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.readJson === 'function')) {
        mdbToast('⚠️ Opening history files requires the Electron desktop app.');
        return;
      }

      try {
        const result = await historyReadEntryJson(entry);
        if (!result || !result.ok || !result.data) {
          throw new Error(result && result.error ? result.error : 'Could not parse file.');
        }

        const data = result.data;
        const hadLegacyTypeKey = !!(data && !data._type && data._typ);
        if (hadLegacyTypeKey) {
          data._type = data._typ;
          delete data._typ;
        }
        let sessionType = data && data._type;
        if (!sessionType && data && (Array.isArray(data.nodes) || Array.isArray(data.pages))) {
          data._type = 'constellation';
          sessionType = 'constellation';
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
        const isConstellationCompatible = sessionType === 'constellation'
          || sessionType === 'constellation-template'
          || String(sessionType || '').endsWith('-constellation');
        const shouldRepairAndResave = !!(hadLegacyTypeKey || (result.repair && result.repair.recommended));

        async function maybeRepairAndResave() {
          if (!shouldRepairAndResave) return;
          if (historyEntryIsNestedPath(entry)) return;
          if (!(window.Desktop && typeof Desktop.saveJson === 'function')) return;
          try {
            await Desktop.saveJson(entry.target, entry.filename, data);
          } catch { }
        }

        if (entry.section === 'constellation') {
          if (!data || !isConstellationCompatible) {
            throw new Error('This file is not a valid Constellation session.');
          }
          await maybeRepairAndResave();
          const relPathVal = historyEntryRelativePath(entry) || entry.filename || '';
          const isArchiveFile = relPathVal.endsWith('.cstz') || relPathVal.endsWith('.zip');
          _conCurrentFileName = global._conCurrentFileName = entry.filename ? (isArchiveFile ? entry.filename : (entry.filename.endsWith('.js') ? entry.filename : boardStripJsonExt(entry.filename) + '.js')) : null;
          _conCurrentFolderName = global._conCurrentFolderName = isArchiveFile ? null : (historyEntryIsNestedPath(entry)
            ? (historyEntryRelativePath(entry).split('/')[0] || null)
            : (entry.filename ? boardStripJsonExt(entry.filename) : null));
          boardReportActiveFileContext();
          boardSetSessionFileMetaFromData('constellation', data);
          _conRestoreSession(data);
          setActiveClassGroup(data._classGroup || '', { preserveBoardState: true });
          bpSetFromEntryId(data._plannerEntryId || '');
          // Always update title from loaded filename
          const _conHAutoTitle = boardStripJsonExt(entry.filename || '');
          if (_conHAutoTitle) {
            if (window.conSetTitle) window.conSetTitle(_conHAutoTitle);
            const _conHTitleEl = document.getElementById('con-title-input');
            if (_conHTitleEl) _conHTitleEl.value = _conHAutoTitle;
          }
          boardPersistLocalSession('constellation', data, {
            source: 'file-load',
            name: boardStripJsonExt(entry.filename)
          });
          setTimeout(() => {
            boardSetAutosaveFingerprint('constellation', conBuildSessionData());
            if (typeof boardSetDirty === 'function') boardSetDirty(false);
            else if (typeof window.boardSetDirty === 'function') window.boardSetDirty(false);
            else _boardIsDirty = false;
            if (typeof conUpdateRenameButtonVisibility === 'function') conUpdateRenameButtonVisibility();
            else if (typeof window.conUpdateRenameButtonVisibility === 'function') window.conUpdateRenameButtonVisibility();
            if (typeof boardUpdateToolbarLinksCount === 'function') boardUpdateToolbarLinksCount();
            if (typeof conUpdateAllNodeLinkBadges === 'function') conUpdateAllNodeLinkBadges();
          }, 200);
          navTo('constellation-section');
          return;
        }

        mdbToast('⚠️ This section is no longer available.');
      } catch (error) {
        mdbToast('⚠️ Could not load saved file: ' + (error && error.message ? error.message : String(error)));
      }
    }

    let _historyRenameEntry = null;

    async function historyRenameEntry(entry) {
      if (!entry) return;
      _historyRenameEntry = entry;
      const oldName = entry.baseName || boardStripJsonExt(entry.filename);

      if (typeof window.showPrompt === 'function') {
        const result = await window.showPrompt('Rename session:', oldName);
        if (result === null) return;
        const input = document.getElementById('history-rename-input');
        if (input) input.value = result;
        await historyRenameCommit();
        return;
      }

      const input = document.getElementById('history-rename-input');
      if (input) input.value = oldName;
      const overlay = document.getElementById('history-rename-overlay');
      if (overlay) {
        if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
        overlay.classList.add('active');
        overlay.style.display = 'flex';
        overlay.style.zIndex = '999999';
      }
      if (input) { input.focus(); input.select(); }
    }

    function historyRenameCancel() {
      _historyRenameEntry = null;
      const overlay = document.getElementById('history-rename-overlay');
      if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
      }
    }

    async function historyRenameCommit() {
      const entry = _historyRenameEntry;
      if (!entry) return;
      const input = document.getElementById('history-rename-input');
      if (!input) return;
      const rawName = String(input.value || '').trim();
      if (!rawName) { input.focus(); return; }
      // Keep the .js extension for saved sessions
      const newFilename = rawName.endsWith('.js') ? rawName : boardStripJsonExt(rawName) + '.js';
      if (newFilename === entry.filename) { historyRenameCancel(); return; }

      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.renameFile === 'function')) {
        mdbToast('⚠️ Renaming files requires the Electron desktop app.');
        return;
      }

      historyRenameCancel();
      try {
        let result;
        if (historyEntryIsNestedPath(entry) && typeof Desktop.renameByPath === 'function') {
          const rel = historyEntryRelativePath(entry);
          const parts = rel.split('/').filter(Boolean);
          if (entry.target === 'mindmaps' && parts.length === 2) {
            const oldFolder = parts[0];
            const oldInnerFile = parts[1];
            const newFolder = boardStripJsonExt(newFilename);
            if (newFolder && newFolder !== oldFolder) {
              await Desktop.renameByPath(entry.target, oldFolder, newFolder);
            }
            if (oldInnerFile !== newFilename) {
              const fromRel = (newFolder || oldFolder) + '/' + oldInnerFile;
              const toRel = (newFolder || oldFolder) + '/' + newFilename;
              await Desktop.renameByPath(entry.target, fromRel, toRel);
            }
            // Rename version history files that carry the old base name
            const oldBase = boardStripJsonExt(oldInnerFile);
            const newBase = boardStripJsonExt(newFilename);
            if (oldBase !== newBase && typeof Desktop.listByPath === 'function') {
              const activeFolder = newFolder || oldFolder;
              const histPath = activeFolder + '/history';
              try {
                const listed = await Desktop.listByPath(entry.target, histPath, { extensions: ['.js', '.json'], recursive: false });
                const vFiles = (listed && listed.ok && Array.isArray(listed.files)) ? listed.files : [];
                for (const vf of vFiles) {
                  const vfname = (vf.relativePath || '').split('/').pop() || vf.filename || '';
                  if (vfname.startsWith(oldBase + '.v')) {
                    const suffix = vfname.slice(oldBase.length);
                    await Desktop.renameByPath(entry.target, histPath + '/' + vfname, histPath + '/' + newBase + suffix).catch(() => { });
                  }
                }
              } catch (e) { /* version renames are best-effort */ }
            }
            result = { ok: true };
          } else {
            const parent = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
            const toRel = parent ? (parent + '/' + newFilename) : newFilename;
            result = await Desktop.renameByPath(entry.target, rel, toRel);
          }
        } else {
          result = await Desktop.renameFile(entry.target, entry.filename, newFilename);
        }
        if (!result || !result.ok) {
          throw new Error(result && result.error ? result.error : 'Rename failed.');
        }
        let newRelPath = newFilename;
        if (historyEntryIsNestedPath(entry)) {
          const rel = historyEntryRelativePath(entry);
          const parts = rel.split('/').filter(Boolean);
          if (entry.target === 'mindmaps' && parts.length === 2) {
            const newFolder = boardStripJsonExt(newFilename);
            newRelPath = (newFolder || parts[0]) + '/' + newFilename;
          } else {
            const parent = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
            newRelPath = parent ? (parent + '/' + newFilename) : newFilename;
          }
        }
        historyUpdateRenamedEntry(entry.target, historyEntryRelativePath(entry), newFilename, newRelPath);
      } catch (error) {
        mdbToast('⚠️ Could not rename file: ' + (error && error.message ? error.message : String(error)));
      }
    }

    let _historyDeleteEntry = null;
    let _historyDeleteBulkFn = null;

    async function historyBulkDeleteOpen(msg, fn) {
      _historyDeleteBulkFn = fn;
      if (typeof window.showConfirm === 'function') {
        const confirmed = await window.showConfirm(msg);
        if (confirmed && fn) {
          await fn();
        }
        return;
      }
      const label = document.getElementById('history-delete-label');
      if (label) label.textContent = msg;
      const overlay = document.getElementById('history-delete-overlay');
      if (overlay) {
        if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
        overlay.classList.add('active');
        overlay.style.display = 'flex';
        overlay.style.zIndex = '999999';
      }
    }

    async function historyDeleteEntry(entry) {
      if (!entry) return;
      _historyDeleteEntry = entry;
      const msg = 'Delete "' + (entry.baseName || entry.filename) + '"? This cannot be undone.';
      if (typeof window.showConfirm === 'function') {
        const confirmed = await window.showConfirm(msg);
        if (confirmed) {
          await historyDeleteConfirm();
        }
        return;
      }
      const label = document.getElementById('history-delete-label');
      if (label) label.textContent = msg;
      const overlay = document.getElementById('history-delete-overlay');
      if (overlay) {
        if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
        overlay.classList.add('active');
        overlay.style.display = 'flex';
        overlay.style.zIndex = '999999';
      }
    }

    function historyDeleteCancel() {
      _historyDeleteEntry = null;
      _historyDeleteBulkFn = null;
      const overlay = document.getElementById('history-delete-overlay');
      if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
      }
    }

    async function historyDeleteConfirm() {
      const entry = _historyDeleteEntry;
      const bulkFn = _historyDeleteBulkFn;
      historyDeleteCancel();
      if (bulkFn) { await bulkFn(); return; }
      if (!entry) return;

      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.deleteFile === 'function')) {
        mdbToast('⚠️ Deleting files requires the Electron desktop app.');
        return;
      }

      try {
        const result = await historyDeleteSavedEntry(entry);
        if (!result || !result.ok) {
          throw new Error(result && result.error ? result.error : 'Delete failed.');
        }
        historyRemoveEntry(entry.target, historyEntryRelativePath(entry));
      } catch (error) {
        mdbToast('⚠️ Could not delete file: ' + (error && error.message ? error.message : String(error)));
      }
    }

    function historyDuplicateFilename(entry) {
      const baseName = boardStripJsonExt(entry && entry.filename ? entry.filename : 'session') || 'session';
      const extension = '.js';
      const lowerTaken = new Set(
        historyEntries
          .filter(item => item && item.target === entry.target)
          .map(item => String(item.filename || '').toLowerCase())
      );

      let candidate = baseName + ' (copy)' + extension;
      if (!lowerTaken.has(candidate.toLowerCase())) {
        return candidate;
      }

      for (let i = 2; i <= 999; i++) {
        candidate = baseName + ' (copy ' + i + ')' + extension;
        if (!lowerTaken.has(candidate.toLowerCase())) {
          return candidate;
        }
      }

      return baseName + ' (copy ' + Date.now() + ')' + extension;
    }

    let _historyDuplicateEntry = null;

    async function historyDuplicateEntry(entry) {
      if (!entry || !entry.target || !entry.filename) return;
      _historyDuplicateEntry = entry;

      // Show just the bare session title (no class prefix) in the name input
      const rawBase = boardStripJsonExt(entry.filename || '');
      const bareTitle = historyDisplayBaseName({ baseName: rawBase, classGroup: entry.classGroup });

      if (typeof window.showPrompt === 'function') {
        const result = await window.showPrompt('Duplicate session — enter new title:', bareTitle);
        if (result === null) return;
        const input = document.getElementById('history-duplicate-input');
        if (input) input.value = result;
        const sel = document.getElementById('history-duplicate-class');
        if (sel) sel.value = entry.classGroup || '';
        await historyDuplicateCommit();
        return;
      }

      const input = document.getElementById('history-duplicate-input');
      if (input) input.value = bareTitle;

      // Populate class selector
      const sel = document.getElementById('history-duplicate-class');
      if (sel) {
        sel.innerHTML = '<option value="">— No class —</option>';
        const groupKeys = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META)
          ? Object.keys(CLASS_GROUPS_META)
            .filter(k => !(CLASS_GROUPS_META[k] && CLASS_GROUPS_META[k].archived))
            .sort((a, b) => _cgDisplayName(a).localeCompare(_cgDisplayName(b)))
          : [];
        groupKeys.forEach(key => {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = _cgDisplayName(key);
          sel.appendChild(opt);
        });
        sel.value = entry.classGroup || '';
      }

      const overlay = document.getElementById('history-duplicate-overlay');
      if (overlay) {
        if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
        overlay.classList.add('active');
        overlay.style.display = 'flex';
        overlay.style.zIndex = '999999';
      }
      if (input) { input.focus(); input.select(); }
    }

    function historyDuplicateCancel() {
      _historyDuplicateEntry = null;
      const overlay = document.getElementById('history-duplicate-overlay');
      if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
      }
    }

    async function historyDuplicateCommit() {
      const entry = _historyDuplicateEntry;
      historyDuplicateCancel();
      if (!entry || !entry.target || !entry.filename) return;

      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.readText === 'function' && typeof Desktop.saveText === 'function')) {
        mdbToast('⚠️ Duplicating files requires the Electron desktop app.');
        return;
      }

      const input = document.getElementById('history-duplicate-input');
      const sel = document.getElementById('history-duplicate-class');
      const newClassGroup = sel ? (sel.value || '') : '';

      // bare title from input (strip any accidental prefix the user may have typed)
      let bareTitle = input ? input.value.trim() : '';
      if (!bareTitle) {
        bareTitle = historyDisplayBaseName({ baseName: boardStripJsonExt(entry.filename || ''), classGroup: entry.classGroup });
      }
      bareTitle = boardStripJsonExt(bareTitle);

      // Apply the new class display-name prefix
      const newDisplayName = _cgDisplayName(newClassGroup) || '';
      const safePrefix = sanitizeFilenamePart(newDisplayName);
      const prefixedName = safePrefix ? (safePrefix + '_' + bareTitle) : bareTitle;
      const duplicateFilename = (prefixedName || 'session') + '.js';

      try {
        const readResult = await historyReadEntryText(entry);
        if (!readResult || !readResult.ok) {
          throw new Error(readResult && readResult.error ? readResult.error : 'Could not read file.');
        }

        let duplicateContent = String(readResult.content || '');
        let relinkAfterDuplicate = false;
        if (entry.section === 'constellation') {
          let parsed = null;
          try { parsed = boardParseSessionText(duplicateContent); } catch (e) { }
          if (parsed && typeof parsed === 'object') {
            const linkedId = String(parsed._plannerEntryId || parsed.plannerEntryId || '').trim();
            if (linkedId) {
              const linkedEntry = bpGetAllEntries().find(e => e.id === linkedId);
              const linkedLabel = linkedEntry ? ('\n\nCurrent link: ' + bpBuildLabel(linkedEntry)) : '';
              const proceed = await showConfirm(
                'This file is linked to a Planner class timeslot.'
                + '\nDuplicating it will break that link in the duplicate file.'
                + linkedLabel
                + '\n\nContinue with duplication?'
              );
              if (!proceed) return;

              relinkAfterDuplicate = await showConfirm(
                'After duplicating, do you want to create a new Planner link for the duplicate file?'
                + '\n\nOK = open class timeslot picker'
                + '\nCancel = keep duplicate unlinked'
              );
            }
            delete parsed._plannerEntryId;
            delete parsed.plannerEntryId;
            duplicateContent = boardBuildSessionFileContent(parsed, 'CONSTELLATION_SESSION_EXPORT');
          }
        }

        let saveResult;
        if (entry.target === 'mindmaps' && historyEntryIsNestedPath(entry) && typeof Desktop.saveFiles === 'function') {
          saveResult = await Desktop.saveFiles(entry.target, [{
            filename: duplicateFilename,
            subdir: boardStripJsonExt(duplicateFilename),
            content: duplicateContent,
            encoding: 'utf8'
          }]);
        } else {
          saveResult = await Desktop.saveText(entry.target, duplicateFilename, duplicateContent);
        }
        if (!saveResult || !saveResult.ok) {
          throw new Error(saveResult && saveResult.error ? saveResult.error : 'Duplicate failed.');
        }

        const dupRelPath = (entry.target === 'mindmaps' && historyEntryIsNestedPath(entry))
          ? (boardStripJsonExt(duplicateFilename) + '/' + duplicateFilename)
          : duplicateFilename;
        let parsedData = null;
        try { parsedData = boardParseSessionText(duplicateContent); } catch (e) { }
        historyUpsertEntry(entry.target, duplicateFilename, dupRelPath, parsedData || {});

        if (entry.section === 'constellation' && relinkAfterDuplicate) {
          const relPath = (entry.target === 'mindmaps' && historyEntryIsNestedPath(entry))
            ? (boardStripJsonExt(duplicateFilename) + '/' + duplicateFilename)
            : duplicateFilename;
          await historyLoadSavedFile({
            target: entry.target,
            filename: duplicateFilename,
            relativePath: relPath,
            section: 'constellation'
          });
          _conPendingDuplicateRelinkRename = true;
          mdbToast('📅 Choose a class timeslot to link this duplicate file.');
          bpShowAll();
        }
      } catch (error) {
        mdbToast('⚠️ Could not duplicate file: ' + (error && error.message ? error.message : String(error)));
      }
    }

    // ================================================================
    // HISTORY PREVIEW
    // ================================================================

    let _historyPreviewEntry = null;

    async function historyPreviewEntry(entry) {
      if (!entry || !entry.target || !entry.filename) return;
      _historyPreviewEntry = entry;

      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.readJson === 'function')) {
        mdbToast('⚠️ Preview requires the Electron desktop app.');
        return;
      }

      const content = document.getElementById('history-preview-content');
      if (!content) return;

      content.innerHTML = '<div style="padding:20px;color:#888;font-size:0.82rem;">Loading preview…</div>';

      // Open the pane immediately so the user sees the loading state
      let backdrop = document.getElementById('history-preview-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'history-preview-backdrop';
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:999998;display:none;';
        backdrop.onclick = historyPreviewClose;
        document.body.appendChild(backdrop);
      }
      backdrop.style.display = 'block';
      const pane = document.getElementById('history-preview-pane');
      if (pane) {
        if (pane.parentNode !== document.body) document.body.appendChild(pane);
        pane.style.zIndex = '999999';
        pane.style.display = 'flex';
        pane.style.right = '0';
      }

      try {
        const result = await historyReadEntryJson(entry);
        if (!result || !result.ok || !result.data) {
          throw new Error(result && result.error ? result.error : 'Could not parse file.');
        }

        const data = result.data;
        content.innerHTML = '';

        // ── Meta header ────────────────────────────────────────────
        const meta = document.createElement('div');
        meta.style.cssText = 'padding-bottom:10px;border-bottom:1px solid #eee;margin-bottom:10px;';

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-weight:700;font-size:0.88rem;margin-bottom:3px;word-break:break-word;';
        titleEl.textContent = entry.baseName || entry.filename;
        meta.appendChild(titleEl);

        const datesEl = document.createElement('div');
        datesEl.style.cssText = 'font-size:0.72rem;color:#999;';
        datesEl.textContent =
          (entry.createdAt ? 'Created: ' + boardFormatWhen(entry.createdAt) + '  ·  ' : '') +
          'Saved: ' + boardFormatWhen(entry.modifiedAt);
        meta.appendChild(datesEl);
        content.appendChild(meta);

        // ── Thumbnails / content ────────────────────────────────────
        if (entry.section === 'constellation') {
          // Collect pages: multi-page uses data.pages, single-page uses the root object
          const pages = (data.pages && Array.isArray(data.pages) && data.pages.length > 0)
            ? data.pages
            : [data];

          // Derive the session folder name from the relativePath (e.g. "mySession/mySession.js" → "mySession")
          const relParts = (entry.relativePath || '').replace(/\\/g, '/').split('/').filter(Boolean);
          const folderName = relParts.length >= 2 ? relParts[0] : null;

          // Try to load real WebP / PNG snapshots saved under page-snapshots/
          const pngDataUrls = new Array(pages.length).fill(null);
          if (folderName && window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function') {
            await Promise.all(pages.map(async (_, idx) => {
              const padded = String(idx + 1).padStart(3, '0');
              const webpPath = folderName + '/page-snapshots/page-' + padded + '.webp';
              const pngPath = folderName + '/page-snapshots/page-' + padded + '.png';
              try {
                let res = await Desktop.readByPath('mindmaps', webpPath, { encoding: 'base64' });
                let mime = 'image/webp';
                if (!(res && res.ok && res.content)) {
                  res = await Desktop.readByPath('mindmaps', pngPath, { encoding: 'base64' });
                  mime = 'image/png';
                }
                if (res && res.ok && res.content) {
                  pngDataUrls[idx] = 'data:' + mime + ';base64,' + res.content;
                }
              } catch { }
            }));
          }

          const pageCountEl = document.createElement('div');
          pageCountEl.style.cssText = 'font-size:0.72rem;color:#999;margin-bottom:8px;';
          pageCountEl.textContent = pages.length + ' page' + (pages.length !== 1 ? 's' : '');
          content.appendChild(pageCountEl);

          const grid = document.createElement('div');
          grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:8px;';

          pages.forEach((snap, idx) => {
            const cell = document.createElement('div');
            cell.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

            if (pngDataUrls[idx]) {
              // Real PNG screenshot
              const img = document.createElement('img');
              img.src = pngDataUrls[idx];
              img.style.cssText = 'width:100%;display:block;border:1px solid #ddd;border-radius:3px;background:#fff;';
              cell.appendChild(img);
            } else {
              // Fallback: canvas thumbnail drawn from snapshot data
              const canvas = document.createElement('canvas');
              canvas.width = 360;
              canvas.height = 240;
              canvas.style.cssText = 'width:100%;aspect-ratio:3/2;display:block;border:1px solid #ddd;border-radius:3px;background:#fff;';
              if (typeof window.conRenderPageThumbnail === 'function') {
                window.conRenderPageThumbnail(snap, canvas);
              } else {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(0, 0, 360, 240);
                ctx.fillStyle = '#bbb';
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Page ' + (idx + 1), 180, 125);
              }
              cell.appendChild(canvas);
            }

            const lbl = document.createElement('div');
            lbl.style.cssText = 'font-size:0.68rem;color:#888;margin-top:3px;';
            lbl.textContent = 'Page ' + (idx + 1);

            cell.appendChild(lbl);
            grid.appendChild(cell);
          });

          content.appendChild(grid);

        } else if (entry.section === 'textanalysis') {
          const textContent = String(data.text || data.rawText || '');
          const paper = document.createElement('div');
          paper.style.cssText = 'background:#fafafa;border:1px solid #e0e0e0;border-radius:4px;padding:10px 12px;font-size:0.75rem;line-height:1.55;color:#444;max-height:320px;overflow:hidden;position:relative;white-space:pre-wrap;word-wrap:break-word;user-select:text;';
          paper.textContent = textContent.substring(0, 900) || '(no text content)';
          if (textContent.length > 900) {
            const fade = document.createElement('div');
            fade.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:40px;background:linear-gradient(transparent,#fafafa);pointer-events:none;';
            paper.appendChild(fade);
          }
          content.appendChild(paper);
          if (textContent.length > 0) {
            const wc = textContent.trim().split(/\s+/).filter(Boolean).length;
            const wcEl = document.createElement('div');
            wcEl.style.cssText = 'font-size:0.7rem;color:#aaa;margin-top:5px;';
            wcEl.textContent = wc.toLocaleString() + ' word' + (wc !== 1 ? 's' : '');
            content.appendChild(wcEl);
          }

        } else if (entry.section === 'notes') {
          const htmlContent = String(data.html || '');
          const paper = document.createElement('div');
          paper.style.cssText = 'background:#fffde7;border:1px solid #e8e0a0;border-radius:4px;padding:10px 12px;font-size:0.8rem;line-height:1.55;color:#444;max-height:320px;overflow:hidden;position:relative;';
          if (htmlContent) {
            // Strip scripts/styles before rendering HTML
            const sanitized = htmlContent
              .replace(new RegExp('<script[\\s\\S]*?<\\/script>', 'gi'), '')
              .replace(new RegExp('<style[\\s\\S]*?<\\/style>', 'gi'), '');
            paper.innerHTML = sanitized;
            const plainLen = htmlContent.replace(/<[^>]*>/g, '').trim().length;
            if (plainLen > 400) {
              const fade = document.createElement('div');
              fade.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:40px;background:linear-gradient(transparent,#fffde7);pointer-events:none;';
              paper.appendChild(fade);
            }
          } else {
            paper.style.fontStyle = 'italic';
            paper.style.color = '#bbb';
            paper.textContent = '(empty notes)';
          }
          content.appendChild(paper);

        } else {
          // Generic fallback
          const jsonStr = JSON.stringify(data, null, 2);
          const pre = document.createElement('div');
          pre.style.cssText = 'font-family:monospace;font-size:0.72rem;color:#333;white-space:pre-wrap;word-wrap:break-word;user-select:text;';
          pre.textContent = jsonStr.substring(0, 4000);
          if (jsonStr.length > 4000) pre.textContent += '\n\n[… truncated …]';
          content.appendChild(pre);
        }

        // ── Open button ─────────────────────────────────────────────
        const loadRow = document.createElement('div');
        loadRow.style.cssText = 'margin-top:14px;';
        const loadBtn = document.createElement('button');
        loadBtn.className = 'action-btn';
        loadBtn.textContent = '📂 Open Session';
        loadBtn.onclick = () => { historyPreviewClose(); historyLoadSavedFile(entry); };
        loadRow.appendChild(loadBtn);
        content.appendChild(loadRow);

      } catch (error) {
        content.innerHTML = '';
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'color:#c00;font-size:0.8rem;padding:8px 0;';
        errDiv.textContent = '⚠️ Error loading preview: ' + (error && error.message ? error.message : String(error));
        content.appendChild(errDiv);
      }
    }

    function historyPreviewClose() {
      const pane = document.getElementById('history-preview-pane');
      if (pane) {
        pane.style.right = '-400px';
      }
      const backdrop = document.getElementById('history-preview-backdrop');
      if (backdrop) backdrop.style.display = 'none';
      _historyPreviewEntry = null;
    }

    // ================================================================
    // SEARCH
    // ================================================================



    let searchBookText = '';  // The full text of the imported book
    let searchParagraphs = [];
    let searchResults = [];   // Array of search result objects
    let searchAvailableBooks = [];

    function searchBuildParagraphs(text) {
      const paragraphs = [];

      function pushParagraph(start, end) {
        while (start < end && /\s/.test(text[start])) start++;
        while (end > start && /\s/.test(text[end - 1])) end--;
        if (end > start) paragraphs.push({ start, end });
      }

      let cursor = 0;
      let match;
      const newlineSeparator = /\r?\n+/g;
      while ((match = newlineSeparator.exec(text)) !== null) {
        pushParagraph(cursor, match.index);
        cursor = newlineSeparator.lastIndex;
      }
      pushParagraph(cursor, text.length);

      return paragraphs;
    }

    function searchFindParagraphIndex(position) {
      if (!searchParagraphs.length) return -1;
      const clamped = Math.max(0, Math.min(position, Math.max(0, searchBookText.length - 1)));
      for (let i = 0; i < searchParagraphs.length; i++) {
        const para = searchParagraphs[i];
        if (clamped < para.start) return Math.max(0, i - 1);
        if (clamped >= para.start && clamped < para.end) return i;
      }
      return searchParagraphs.length - 1;
    }

    function searchFindParagraphIndexForRangeStart(position) {
      let pos = Math.max(0, position);
      while (pos < searchBookText.length && /\s/.test(searchBookText[pos])) pos++;
      return searchFindParagraphIndex(pos);
    }

    function searchFindParagraphIndexForRangeEnd(position) {
      let pos = Math.max(0, position - 1);
      while (pos > 0 && /\s/.test(searchBookText[pos])) pos--;
      return searchFindParagraphIndex(pos);
    }

    function searchUpdateResultParagraphWindow(result, startIndex, endIndex) {
      if (!searchParagraphs.length || startIndex < 0 || endIndex < 0) return;
      result.paragraphStartIndex = startIndex;
      result.paragraphEndIndex = endIndex;
      result.contextStart = searchParagraphs[startIndex].start;
      result.contextEnd = searchParagraphs[endIndex].end;
      result.contextText = searchBookText.slice(result.contextStart, result.contextEnd);
    }

    function searchEscapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function searchEscapeRegExp(text) {
      return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function searchRenderContextHtml(text, searchWord) {
      // Tokenise into words and non-words, wrap words in spans for WFA hover
      const lowerSearch = searchWord ? searchWord.toLowerCase() : '';
      const chunks = text.match(/[\w\u2018\u2019'''\-]+|[^\w]+/g) || [];
      return chunks.map(chunk => {
        if (!/[\w]/.test(chunk)) return searchEscapeHtml(chunk);
        const esc = searchEscapeHtml(chunk);
        const lower = chunk.toLowerCase().replace(/['''\u2018\u2019]/g, '');
        let spanAttr = '';
        if (typeof wfaStem === 'function' && typeof WFA_STOPWORDS !== 'undefined' && !WFA_STOPWORDS.has(lower) && lower.length > 1) {
          spanAttr = ` data-stem="${searchEscapeHtml(wfaStem(lower))}"`;
        }
        const inner = spanAttr ? `<span class="wfa-tok"${spanAttr}>${esc}</span>` : esc;
        if (lowerSearch && chunk.toLowerCase().includes(lowerSearch)) return `<mark>${inner}</mark>`;
        return inner;
      }).join('');
    }

    function searchExpandResultParagraph(index, direction) {
      const result = searchResults[index];
      if (!result || !searchParagraphs.length) return;

      if (direction < 0) {
        if (result.paragraphStartIndex <= 0) return;
        searchUpdateResultParagraphWindow(result, result.paragraphStartIndex - 1, result.paragraphEndIndex);
      } else {
        if (result.paragraphEndIndex >= searchParagraphs.length - 1) return;
        searchUpdateResultParagraphWindow(result, result.paragraphStartIndex, result.paragraphEndIndex + 1);
      }

      searchRenderResults(document.getElementById('search-word').value.trim());
    }

    async function searchInitShortcutMenu() {
      const select = document.getElementById('search-book-select');
      if (!select) return;

      const previousValue = select.value;
      searchAvailableBooks = [];

      const canList = !!(
        window.Desktop &&
        Desktop.isElectron &&
        Desktop.isElectron() &&
        typeof Desktop.listFiles === 'function'
      );

      if (canList) {
        try {
          const result = await Desktop.listFiles('customBooks', {
            extensions: ['.epub', '.html', '.htm', '.xhtml', '.txt']
          });
          const files = result && result.ok && Array.isArray(result.files) ? result.files : [];
          files.forEach(file => {
            const relPath = file.relativePath || file.filename;
            const label = String(file.filename || '').replace(/\.(epub|html?|xhtml|txt)$/i, '');
            searchAvailableBooks.push({
              id: 'customBooks:' + relPath,
              label: label || file.filename,
              fileName: file.filename,
              path: relPath,
              target: 'customBooks',
              isCustom: true
            });
          });
        } catch (e) {
          console.warn('Could not list customBooks for search menu:', e);
        }
      }

      select.innerHTML = '<option value="">Books folder…</option>';

      searchAvailableBooks.forEach(book => {
        const opt = document.createElement('option');
        opt.value = book.id;
        opt.textContent = book.label;
        select.appendChild(opt);
      });

      if (previousValue && searchAvailableBooks.some(b => b.id === previousValue)) {
        select.value = previousValue;
      }

      if (!searchBookText) {
        searchSetBookStatus('No book loaded.');
      }
    }

    function searchSetBookStatus(message, state = '') {
      const status = document.getElementById('search-book-status');
      if (!status) return;
      status.textContent = message;
      status.className = state;
    }

    function searchResetResults() {
      document.getElementById('search-results').innerHTML = '';
      searchResults = [];
      searchCtxClose();
    }

    function searchSyncShortcutSelection(path = '') {
      const select = document.getElementById('search-book-select');
      if (!select) return;
      const match = searchAvailableBooks.find(b => b.path === path || b.id === path);
      select.value = match ? match.id : '';
    }

    function searchApplyBookText(text, label, sourcePath = '') {
      searchBookText = text;
      searchParagraphs = searchBuildParagraphs(text);
      searchResetResults();
      searchSyncShortcutSelection(sourcePath);
      searchSetBookStatus(`Loaded: ${label}`, 'is-ready');
    }

    async function searchReadShortcutBook(relativePath, target = 'customBooks') {
      const normalizedPath = relativePath.replace(/\\/g, '/');
      const lowerPath = normalizedPath.toLowerCase();
      const canReadViaDesktop = !!(
        window.Desktop &&
        Desktop.isElectron &&
        Desktop.isElectron() &&
        typeof Desktop.readByPath === 'function'
      );

      if (canReadViaDesktop) {
        const readTarget = target || (normalizedPath.startsWith('books/') ? 'data' : 'customBooks');
        const result = await Desktop.readByPath(readTarget, normalizedPath, {
          encoding: 'base64'
        });
        if (!result || !result.ok || !result.content) {
          throw new Error(result && result.error ? result.error : 'Could not read book file.');
        }

        const binary = atob(result.content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        if (lowerPath.endsWith('.epub')) {
          return taEpubExtractTextAsync(bytes.buffer);
        }

        const rawText = new TextDecoder('utf-8').decode(bytes);
        if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm') || lowerPath.endsWith('.xhtml')) {
          return taImportHtmlToText(rawText);
        }
        return rawText.trim();
      }

      const requestPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(requestPath);
      if (!response.ok) {
        throw new Error(`Could not load file (${response.status}).`);
      }

      if (lowerPath.endsWith('.epub')) {
        return taEpubExtractTextAsync(await response.arrayBuffer());
      }

      const rawText = await response.text();
      if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm') || lowerPath.endsWith('.xhtml')) {
        return taImportHtmlToText(rawText);
      }
      return rawText.trim();
    }

    async function searchLoadShortcutBook() {
      const select = document.getElementById('search-book-select');
      if (!select || !select.value) {
        searchSetBookStatus(searchBookText ? 'Book still loaded. Choose another book to replace it.' : 'No book loaded.');
        return;
      }

      const item = searchAvailableBooks.find(b => b.id === select.value);
      const label = item ? item.label : select.options[select.selectedIndex].textContent;
      const relPath = item ? item.path : select.value;
      const target = item ? item.target : (relPath.startsWith('books/') ? 'data' : 'customBooks');

      try {
        select.disabled = true;
        searchSetBookStatus(`Loading ${label}…`, 'is-loading');
        const text = await searchReadShortcutBook(relPath, target);
        if (!text) throw new Error('The selected file did not produce readable text.');
        searchApplyBookText(text, label, select.value);
      } catch (err) {
        console.error(err);
        const blockedByRuntime = window.location.protocol === 'file:';
        const message = blockedByRuntime
          ? `Could not load ${label}. Use Import Book if local-file loading is blocked.`
          : `Could not load ${label}. Use Import Book if needed.`;
        searchSetBookStatus(message, 'is-error');
      } finally {
        select.disabled = false;
      }
    }

    // ---- HTML / EPUB Import core ----
    let _taImportRawText = '';
    let _taImportBooks = [];
    window._conImportTextCallback = null;
    let _taImportSearchMatches = [];
    let _taImportSearchIdx = -1;

    function taImportApplyText(text, fileLabel) {
      _taImportRawText = text;

      const titleEl = document.getElementById('ta-imp-title');
      if (titleEl) titleEl.textContent = '📂 ' + (fileLabel || 'Imported book');

      const ta = document.getElementById('ta-imp-text');
      if (ta) {
        ta.value = text;
        ta.onselect = ta.onmouseup = ta.onkeyup = taImportUpdateInsertBtn;
        ta.onkeydown = function (e) {
          if (e.key === 'Enter') { e.preventDefault(); taImportSearchStep(e.shiftKey ? -1 : 1); }
        };
      }

      const searchInput = document.getElementById('ta-imp-search-input');
      if (searchInput) searchInput.value = '';

      const searchCount = document.getElementById('ta-imp-search-count');
      if (searchCount) searchCount.textContent = '';

      const prevBtn = document.getElementById('ta-imp-search-prev');
      if (prevBtn) prevBtn.disabled = true;

      const nextBtn = document.getElementById('ta-imp-search-next');
      if (nextBtn) nextBtn.disabled = true;

      _taImportSearchMatches = [];
      _taImportSearchIdx = -1;

      taImportUpdateInsertBtn();
    }

    function taImportUpdateInsertBtn() {
      const ta = document.getElementById('ta-imp-text');
      const btn = document.getElementById('ta-imp-confirm-btn');
      if (!ta || !btn) return;
      if (!_taImportRawText) {
        btn.disabled = true;
        btn.textContent = window._conImportTextCallback ? 'Import' : 'Import Book';
        return;
      }
      btn.disabled = false;
      const isConstellation = !!window._conImportTextCallback;
      if (ta.selectionStart === ta.selectionEnd) {
        btn.textContent = isConstellation ? 'Import all' : 'Import all';
      } else {
        btn.textContent = isConstellation ? 'Import selection' : 'Import selection';
      }
    }

    async function taImportPopulateBookShortcuts() {
      const select = document.getElementById('ta-imp-book-shortcut');
      if (!select) return;
      _taImportBooks = [];
      select.innerHTML = '<option value="">Books folder…</option>';
      select.style.display = 'none';
      const canList = !!(window.Desktop && Desktop.isElectron && Desktop.isElectron() && typeof Desktop.listFiles === 'function');
      if (!canList) return;
      try {
        const result = await Desktop.listFiles('customBooks', { extensions: ['.epub', '.html', '.htm', '.xhtml', '.txt'] });
        const files = result && result.ok && Array.isArray(result.files) ? result.files : [];
        if (!files.length) return;
        _taImportBooks = files.map(file => ({
          fileName: file.filename,
          relativePath: file.relativePath || file.filename,
          label: String(file.filename || '').replace(/\.(epub|html?|xhtml|txt)$/i, '')
        }));
        _taImportBooks.forEach(book => {
          const option = document.createElement('option');
          option.value = book.relativePath;
          option.textContent = book.label || book.fileName;
          select.appendChild(option);
        });
        select.style.display = 'block';
      } catch (error) {
        console.warn('Could not list customBooks for import shortcuts:', error);
      }
    }

    async function taImportLoadShortcutBook() {
      const select = document.getElementById('ta-imp-book-shortcut');
      if (!select || !select.value) return;
      const selectedPath = select.value;
      const selectedBook = _taImportBooks.find(book => book.relativePath === selectedPath);
      const label = selectedBook ? selectedBook.label : select.options[select.selectedIndex].textContent;
      try {
        select.disabled = true;
        const fileInput = document.getElementById('ta-imp-file-input');
        if (fileInput) fileInput.value = '';

        const ta = document.getElementById('ta-imp-text');
        if (ta) ta.value = 'Loading ' + label + '…';

        const titleEl = document.getElementById('ta-imp-title');
        if (titleEl) titleEl.textContent = '📂 Loading…';

        const lowerPath = selectedPath.toLowerCase();
        const result = await Desktop.readByPath('customBooks', selectedPath, { encoding: 'base64' });
        if (!result || !result.ok || !result.content) throw new Error(result && result.error ? result.error : 'Could not read book file.');
        const binary = atob(result.content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        let text;
        if (lowerPath.endsWith('.epub')) {
          text = await taEpubExtractTextAsync(bytes.buffer);
        } else {
          text = taImportHtmlToText(new TextDecoder('utf-8').decode(bytes));
        }
        if (!text) throw new Error('The selected book did not produce readable text.');
        taImportApplyText(text, selectedBook ? selectedBook.fileName : label);
      } catch (error) {
        const ta = document.getElementById('ta-imp-text');
        if (ta) ta.value = '⚠ Could not load book: ' + (error && error.message ? error.message : String(error));
      } finally {
        select.disabled = false;
      }
    }

    function taOpenImport() {
      searchOpenImport();
    }

    function taCloseImport() {
      const overlay = document.getElementById('ta-import-overlay');
      if (overlay) overlay.classList.remove('active');
      window._conImportTextCallback = null;
    }

    function taImportFileLoaded(evt) {
      const file = evt.target.files[0];
      if (!file) return;

      const shortcutSelect = document.getElementById('ta-imp-book-shortcut');
      if (shortcutSelect) shortcutSelect.value = '';

      const ta = document.getElementById('ta-imp-text');
      if (ta) ta.value = 'Reading file…';

      const titleEl = document.getElementById('ta-imp-title');
      if (titleEl) titleEl.textContent = '📂 Reading…';

      const isEpub = file.name.toLowerCase().endsWith('.epub');
      const reader = new FileReader();
      reader.onload = e => {
        try {
          if (isEpub) {
            taEpubExtractTextAsync(e.target.result).then(text => {
              taImportApplyText(text, file.name);
            }).catch(err => {
              if (ta) ta.value = '⚠ EPUB error: ' + err.message;
            });
          } else {
            taImportApplyText(taImportHtmlToText(e.target.result), file.name);
          }
        } catch (err) {
          if (ta) ta.value = '⚠ Could not read file: ' + err.message;
        }
      };
      if (isEpub) reader.readAsArrayBuffer(file);
      else reader.readAsText(file, 'UTF-8');
    }

    // ---- ZIP / EPUB extraction ----
    function taZipParse(arrayBuffer) {
      const buf = new Uint8Array(arrayBuffer);
      const view = new DataView(arrayBuffer);
      const u16 = o => view.getUint16(o, true);
      const u32 = o => view.getUint32(o, true);
      let eocd = -1;
      for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
        if (u32(i) === 0x06054b50) { eocd = i; break; }
      }
      if (eocd === -1) throw new Error('Not a valid ZIP/EPUB file.');
      const cdOffset = u32(eocd + 16);
      const cdCount = u16(eocd + 10);
      const entries = [];
      let pos = cdOffset;
      for (let i = 0; i < cdCount; i++) {
        if (u32(pos) !== 0x02014b50) break;
        const compMethod = u16(pos + 10);
        const compSize = u32(pos + 20);
        const nameLen = u16(pos + 28);
        const extraLen = u16(pos + 30);
        const commentLen = u16(pos + 32);
        const localOffset = u32(pos + 42);
        const name = new TextDecoder('utf-8').decode(buf.slice(pos + 46, pos + 46 + nameLen));
        entries.push({ name, compMethod, compSize, localOffset });
        pos += 46 + nameLen + extraLen + commentLen;
      }
      return { entries, buf, view, u16, u32 };
    }

    async function taDecompressDeflate(compressedBytes) {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      writer.write(compressedBytes);
      writer.close();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { out.set(c, off); off += c.length; }
      return out;
    }

    async function taEpubExtractTextAsync(arrayBuffer) {
      const zip = taZipParse(arrayBuffer);
      const { buf, view, u16, u32 } = zip;
      async function extractBytes(entry) {
        const lh = entry.localOffset;
        const lNameLen = u16(lh + 26);
        const lExtraLen = u16(lh + 28);
        const dataStart = lh + 30 + lNameLen + lExtraLen;
        const compressed = buf.slice(dataStart, dataStart + entry.compSize);
        if (entry.compMethod === 0) return compressed;
        if (entry.compMethod === 8) return await taDecompressDeflate(compressed);
        throw new Error('Unsupported compression: ' + entry.compMethod);
      }
      async function extractText(entry) {
        return new TextDecoder('utf-8').decode(await extractBytes(entry));
      }
      const containerEntry = zip.entries.find(e => e.name === 'META-INF/container.xml');
      let opfPath = null;
      if (containerEntry) {
        const m = (await extractText(containerEntry)).match(/full-path="([^"]+\.opf)"/i);
        if (m) opfPath = m[1];
      }
      let orderedHtmlEntries = [];
      if (opfPath) {
        const opfEntry = zip.entries.find(e => e.name === opfPath);
        if (opfEntry) {
          const opfXml = await extractText(opfEntry);
          const manifest = {};
          const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
          let mm;
          const manifestRe = /<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"[^>]*>/gi;
          while ((mm = manifestRe.exec(opfXml)) !== null) manifest[mm[1]] = opfDir + mm[2];
          const spineRe = /<itemref[^>]+idref="([^"]+)"/gi;
          let sm;
          while ((sm = spineRe.exec(opfXml)) !== null) {
            const href = manifest[sm[1]];
            if (href) {
              const e = zip.entries.find(en => en.name === href || en.name === href.replace(/^\//, ''));
              if (e) orderedHtmlEntries.push(e);
            }
          }
        }
      }
      if (!orderedHtmlEntries.length) {
        orderedHtmlEntries = zip.entries.filter(e =>
          /\.(xhtml|html|htm)$/i.test(e.name) && !e.name.includes('toc') && !e.name.includes('nav')
        ).sort((a, b) => a.name.localeCompare(b.name));
      }
      const parts = [];
      for (const entry of orderedHtmlEntries) parts.push(taImportHtmlToText(await extractText(entry)));
      return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    function taEpubExtractText(arrayBuffer) {
      taEpubExtractTextAsync(arrayBuffer).then(text => {
        const titleEl = document.getElementById('ta-imp-title');
        const fileLabel = titleEl ? titleEl.textContent.replace('📂 ', '') : 'Book';
        taImportApplyText(text, fileLabel);
      }).catch(err => {
        const ta = document.getElementById('ta-imp-text');
        if (ta) ta.value = '⚠ EPUB error: ' + err.message;
      });
      return '';
    }

    function taImportHtmlToText(html) {
      // Strip <img> and <source> tags before parsing to avoid browser ERR_FILE_NOT_FOUND for relative book images
      const sanitizedHtml = String(html || '')
        .replace(/<img\b[^>]*>/gi, '')
        .replace(/<source\b[^>]*>/gi, '');
      const tmp = document.createElement('div');
      tmp.innerHTML = sanitizedHtml;
      tmp.querySelectorAll('p, div, br, h1, h2, h3, h4, h5, h6, li, tr, blockquote').forEach(el => {
        el.insertAdjacentText('afterend', '\n');
      });
      tmp.querySelectorAll('script, style, noscript').forEach(el => el.remove());
      return tmp.innerText
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    function searchOpenImport() {
      const fileInput = document.getElementById('ta-imp-file-input');
      if (fileInput) fileInput.value = '';

      const bsEl = document.getElementById('ta-imp-book-shortcut');
      if (bsEl) { bsEl.value = ''; bsEl.style.display = 'none'; }

      const ta = document.getElementById('ta-imp-text');
      if (ta) ta.value = '';

      const searchInput = document.getElementById('ta-imp-search-input');
      if (searchInput) searchInput.value = '';

      const searchCount = document.getElementById('ta-imp-search-count');
      if (searchCount) searchCount.textContent = '';

      const titleEl = document.getElementById('ta-imp-title');
      if (titleEl) titleEl.textContent = '📂 Import Book';

      const prevBtn = document.getElementById('ta-imp-search-prev');
      if (prevBtn) prevBtn.disabled = true;

      const nextBtn = document.getElementById('ta-imp-search-next');
      if (nextBtn) nextBtn.disabled = true;

      _taImportRawText = '';
      _taImportSearchMatches = [];
      _taImportSearchIdx = -1;

      taImportUpdateInsertBtn();

      const overlay = document.getElementById('ta-import-overlay');
      if (overlay) overlay.classList.add('active');

      taImportPopulateBookShortcuts();

      if (searchInput) searchInput.focus();
    }

    function taImportSearchRun() {
      const query = document.getElementById('ta-imp-search-input').value;
      const ta = document.getElementById('ta-imp-text');
      const countEl = document.getElementById('ta-imp-search-count');
      _taImportSearchMatches = [];
      _taImportSearchIdx = -1;
      if (!query || !ta) {
        if (countEl) countEl.textContent = '';
        const prevBtn = document.getElementById('ta-imp-search-prev');
        if (prevBtn) prevBtn.disabled = true;
        const nextBtn = document.getElementById('ta-imp-search-next');
        if (nextBtn) nextBtn.disabled = true;
        return;
      }
      const text = ta.value;
      const lower = text.toLowerCase();
      const q = query.toLowerCase();
      let pos = 0;
      while (true) {
        const idx = lower.indexOf(q, pos);
        if (idx === -1) break;
        _taImportSearchMatches.push(idx);
        pos = idx + 1;
      }
      const hasMatches = _taImportSearchMatches.length > 0;
      const prevBtn = document.getElementById('ta-imp-search-prev');
      if (prevBtn) prevBtn.disabled = !hasMatches;
      const nextBtn = document.getElementById('ta-imp-search-next');
      if (nextBtn) nextBtn.disabled = !hasMatches;

      if (hasMatches) {
        _taImportSearchIdx = 0;
        taImportSearchHighlight(query.length);
        if (countEl) countEl.textContent = _taImportSearchMatches.length + ' match' + (_taImportSearchMatches.length !== 1 ? 'es' : '') + ' — press Enter ↵';
      } else {
        if (countEl) countEl.textContent = 'No matches';
      }
    }

    function taImportSearchStep(dir) {
      if (!_taImportSearchMatches.length) return;
      _taImportSearchIdx = (_taImportSearchIdx + dir + _taImportSearchMatches.length) % _taImportSearchMatches.length;
      const query = document.getElementById('ta-imp-search-input').value;
      taImportSearchHighlight(query.length);
      const ta = document.getElementById('ta-imp-text');
      if (ta) ta.focus();
    }

    function taImportScrollToPos(pos) {
      const ta = document.getElementById('ta-imp-text');
      if (!ta) return;
      const style = window.getComputedStyle(ta);
      const mirror = document.createElement('div');
      mirror.style.cssText =
        'position:absolute;visibility:hidden;overflow:hidden;white-space:pre-wrap;word-wrap:break-word;' +
        'width:' + ta.clientWidth + 'px;' +
        'padding:' + style.padding + ';' +
        'font:' + style.font + ';' +
        'line-height:' + style.lineHeight + ';';
      mirror.textContent = ta.value.substring(0, pos);
      document.body.appendChild(mirror);
      const top = mirror.scrollHeight;
      document.body.removeChild(mirror);
      ta.scrollTop = Math.max(0, top - ta.clientHeight / 3);
    }

    function taImportSearchHighlight(len) {
      const ta = document.getElementById('ta-imp-text');
      if (!ta) return;
      const start = _taImportSearchMatches[_taImportSearchIdx];
      ta.setSelectionRange(start, start + len);
      taImportScrollToPos(start);
      taImportUpdateInsertBtn();
      const countEl = document.getElementById('ta-imp-search-count');
      if (countEl) countEl.textContent = (_taImportSearchIdx + 1) + ' / ' + _taImportSearchMatches.length;
    }

    function taImportSearchKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        taImportSearchStep(e.shiftKey ? -1 : 1);
      }
    }

    function taImportConfirm() {
      const ta = document.getElementById('ta-imp-text');
      if (!ta || !_taImportRawText) return;

      let text = ta.value.substring(ta.selectionStart, ta.selectionEnd).trim();
      // If nothing selected, import all text
      if (!text) {
        text = _taImportRawText.trim();
      }

      if (!text) return;

      if (window._conImportTextCallback) {
        window._conImportTextCallback(text);
        taCloseImport();
        mdbToast('📝 Text imported into Constellation.');
      } else {
        const titleEl = document.getElementById('ta-imp-title');
        const fileLabel = titleEl ? titleEl.textContent.replace('📂 ', '') : 'Book';
        searchApplyBookText(text, fileLabel, '');
        taCloseImport();
        searchInitShortcutMenu();
        mdbToast('📖 Book imported. You can now search for words.');
      }
    }

    function searchPerform() {
      const word = document.getElementById('search-word').value.trim().toLowerCase();
      if (!word) {
        mdbToast('⚠️ Please enter a word to search.');
        return;
      }
      if (!searchBookText) {
        mdbToast('⚠️ Please import a book first.');
        return;
      }

      const scope = document.querySelector('input[name="search-scope"]:checked').value;
      searchResults = searchFindOccurrences(word, scope);
      searchRenderResults(word);
    }

    function searchFindOccurrences(word, scope) {
      const results = [];
      const seenContexts = new Set();
      const lowerText = searchBookText.toLowerCase();
      const lowerWord = word.toLowerCase();
      let index = lowerText.indexOf(lowerWord);

      while (index !== -1) {
        const actualWord = searchBookText.substring(index, index + word.length);
        let contextStart, contextEnd, contextText;

        if (scope === 'paragraph') {
          const paragraphIndex = searchFindParagraphIndex(index);
          if (paragraphIndex === -1) break;
          contextStart = searchParagraphs[paragraphIndex].start;
          contextEnd = searchParagraphs[paragraphIndex].end;
          contextText = searchBookText.substring(contextStart, contextEnd);
        } else { // within 200 words
          // Count words backwards
          let wordCount = 0;
          let startPos = index;
          while (startPos > 0 && wordCount < 200) {
            startPos--;
            if (searchBookText[startPos] === ' ' || searchBookText[startPos] === '\n') wordCount++;
          }

          // Count words forwards
          wordCount = 0;
          let endPos = index + word.length;
          while (endPos < searchBookText.length && wordCount < 200) {
            endPos++;
            if (searchBookText[endPos] === ' ' || searchBookText[endPos] === '\n') wordCount++;
          }

          contextStart = startPos;
          contextEnd = endPos;
          contextText = searchBookText.substring(startPos, endPos);
        }

        // Check if this context has already been seen
        if (!seenContexts.has(contextText.trim())) {
          seenContexts.add(contextText.trim());
          const paragraphStartIndex = searchFindParagraphIndexForRangeStart(contextStart);
          const paragraphEndIndex = searchFindParagraphIndexForRangeEnd(contextEnd);
          results.push({
            word: actualWord,
            startIndex: index,
            contextStart,
            contextEnd,
            contextText,
            paragraphStartIndex,
            paragraphEndIndex
          });
        }

        index = lowerText.indexOf(lowerWord, index + 1);
      }

      return results;
    }

    function searchGetParagraphPositionPercent(result) {
      if (!result || !searchParagraphs.length) return null;
      if (searchParagraphs.length === 1) return 0;
      const startIdx = Number.isFinite(result.paragraphStartIndex) ? result.paragraphStartIndex : 0;
      const endIdx = Number.isFinite(result.paragraphEndIndex) ? result.paragraphEndIndex : startIdx;
      const midIdx = (startIdx + endIdx) / 2;
      const ratio = midIdx / (searchParagraphs.length - 1);
      return Math.max(0, Math.min(100, Math.round(ratio * 100)));
    }

    function searchRenderResults(searchWord) {
      const resultsDiv = document.getElementById('search-results');
      resultsDiv.innerHTML = '';

      if (searchResults.length === 0) {
        resultsDiv.innerHTML = '<p>No results found.</p>';
        return;
      }

      searchResults.forEach((result, index) => {
        const div = document.createElement('div');
        div.className = 'search-result';
        div.dataset.searchIndex = String(index);
        const paraPct = searchGetParagraphPositionPercent(result);
        const paraInfo = paraPct === null ? '' : ` · Paragraph: ${paraPct}%`;
        const canAddPrevious = result.paragraphStartIndex > 0;
        const canAddNext = result.paragraphEndIndex < searchParagraphs.length - 1;
        div.innerHTML = `
          <div class="search-result-header">Result ${index + 1}: "${result.word}"${paraInfo}</div>
          <div class="search-result-context">
            <button class="search-result-expand" onclick="searchExpandResultParagraph(${index}, -1)" ${canAddPrevious ? '' : 'disabled'} title="Add previous paragraph">+</button>
            <div class="search-result-text">${searchRenderContextHtml(result.contextText, searchWord)}</div>
            <button class="search-result-expand" onclick="searchExpandResultParagraph(${index}, 1)" ${canAddNext ? '' : 'disabled'} title="Add next paragraph">+</button>
          </div>
        `;
        resultsDiv.appendChild(div);
      });
    }

    function searchClear() {
      document.getElementById('search-word').value = '';
      searchResetResults();
    }

    // ---- Search Context Menu ----
    let searchCtxIndex = -1;

    function searchCtxShow(e, index) {
      e.preventDefault();
      e.stopPropagation();
      searchCtxIndex = index;
      const menu = document.getElementById('search-ctx-menu');
      menu.style.display = 'block';

      // Fixed-position menu should use viewport coordinates (clientX/clientY),
      // then clamp so it always stays visible.
      let x = typeof e.clientX === 'number' ? e.clientX : 0;
      let y = typeof e.clientY === 'number' ? e.clientY : 0;
      if ((x === 0 && y === 0) && e.target && e.target.getBoundingClientRect) {
        const r = e.target.getBoundingClientRect();
        x = r.left + 12;
        y = r.top + 12;
      }
      const pad = 8;
      const mw = menu.offsetWidth || 220;
      const mh = menu.offsetHeight || 120;
      x = Math.max(pad, Math.min(x, window.innerWidth - mw - pad));
      y = Math.max(pad, Math.min(y, window.innerHeight - mh - pad));
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
      menu.style.display = 'block';
    }

    function searchCtxClose() {
      document.getElementById('search-ctx-menu').style.display = 'none';
      searchCtxIndex = -1;
    }

    // Delegated right-click handler (survives result re-renders)
    document.addEventListener('contextmenu', function (e) {
      const resultsContainer = e.target.closest('#search-results');
      if (!resultsContainer) return;
      const card = e.target.closest('.search-result');
      if (!card) return;
      const idx = parseInt(card.dataset.searchIndex, 10);
      if (Number.isNaN(idx)) return;
      searchCtxShow(e, idx);
    });

    // Close context menu when clicking elsewhere
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#search-ctx-menu')) {
        searchCtxClose();
      }
    });


    // ================================================================
    // NEW SESSION — save-then-clear flow for all three sections
    // ================================================================
    let _newSection = null, _newData = null, _newBlob = null, _newTarget = null, _newFilename = null;

    function boardNewSession(section, options = {}) {
      let data, hasContent, blob, target, filename;

      if (section === 'constellation') {
        data = conBuildSessionData();
        hasContent = conSessionHasContent(data);
        const titleVal = window.conGetTitle ? window.conGetTitle() : '';
        filename = boardDefaultFileName('constellation', titleVal);
        data = boardBuildPersistedSessionData('constellation', data);
        blob = boardBuildSessionBlob(data, 'CONSTELLATION_SESSION_EXPORT');
        target = 'mindmaps';
      } else if (section === 'textanalysis') {
        data = taBuildSessionData();
        hasContent = taSessionHasContent(data);
        filename = boardDefaultFileName('textanalysis', taGetTitle() || _taCurrentFileName);
        data = boardBuildPersistedSessionData('textanalysis', data);
        blob = boardBuildSessionBlob(data, 'TEXTANALYSIS_SESSION_EXPORT');
        target = 'textualAnalyses';
      } else if (section === 'notes') {
        data = noteBuildSessionData();
        hasContent = noteSessionHasContent(data);
        filename = boardDefaultFileName('notes', data.title);
        blob = boardBuildSessionBlob(data, 'NOTES_SESSION_EXPORT');
        target = 'notes';
      } else { return; }

      const skipPrompt = options && (options.force || options.skipPrompt || options.skipConfirm);
      if (!hasContent || skipPrompt) { _boardNewSessionClear(section); return; }

      _newSection = section; _newData = data; _newBlob = blob;
      _newTarget = target; _newFilename = filename;
      const sectionName = section === 'constellation' ? 'Constellation'
        : section === 'textanalysis' ? 'Textual Analysis' : 'Notes';
      document.getElementById('new-session-label').textContent =
        'Save current ' + sectionName + ' before creating a new one?';
      document.getElementById('new-session-overlay').classList.add('active');
    }

    function conCloseSession() {
      const data = conBuildSessionData();
      if (!conSessionHasContent(data)) {
        _boardNewSessionClear('constellation');
        return;
      }
      document.getElementById('con-close-overlay').classList.add('active');
    }

    function conCloseCancel() {
      document.getElementById('con-close-overlay').classList.remove('active');
    }

    function conCloseDiscard() {
      document.getElementById('con-close-overlay').classList.remove('active');
      _boardNewSessionClear('constellation');
    }

    function conCloseSave() {
      document.getElementById('con-close-overlay').classList.remove('active');
      conSaveSession();
      _boardNewSessionClear('constellation');
    }

    function _boardNewSessionClear(section) {
      if (section === 'constellation') {
        if (typeof window.conClearAll === 'function') {
          window.conClearAll({ skipConfirm: true, resetTitle: true });
        } else if (typeof conClearAll === 'function') {
          conClearAll({ skipConfirm: true, resetTitle: true });
        }
        _conCurrentFileName = null;
        _conCurrentFolderName = null;
        global._conCurrentFileName = null;
        global._conCurrentFolderName = null;
        if (typeof boardResetSessionFileMeta === 'function') boardResetSessionFileMeta('constellation');
        if (typeof boardReportActiveFileContext === 'function') boardReportActiveFileContext();
      } else if (section === 'textanalysis') {
        if (typeof window.taClear === 'function') window.taClear();
        else if (typeof taClear === 'function') taClear();
      } else if (section === 'notes') {
        if (typeof window.noteClear === 'function') window.noteClear({ skipConfirm: true });
        else if (typeof noteClear === 'function') noteClear({ skipConfirm: true });
        _noteCurrentFileName = null;
      }
      boardStartNewSessionDate(section);
    }

    function _boardNewSessionReset() {
      _newSection = null; _newData = null; _newBlob = null;
      _newTarget = null; _newFilename = null;
      document.getElementById('new-session-overlay').classList.remove('active');
    }

    function newSessionConfirmSave() {
      const section = _newSection, data = _newData, blob = _newBlob,
        target = _newTarget, filename = _newFilename;
      _boardNewSessionReset();
      boardPersistLocalSession(section, data, { source: 'manual-save', name: filename });
      boardSetAutosaveFingerprint(section, data);
      if (section === 'constellation' && window.Desktop && Desktop.isElectron()) {
        sfnOpen(filename, blob, target, () => _boardNewSessionClear(section), {
          customSave: async function (requestedName) {
            const saved = await conSaveSessionFolderBundle(requestedName, data);
            mdbToast('✅ Saved: ' + saved.folderName + '/' + saved.filename);
            return saved.filename;
          }
        });
        return;
      }
      sfnOpen(filename, blob, target, () => _boardNewSessionClear(section));
    }

    function newSessionConfirmDiscard() {
      const section = _newSection;
      _boardNewSessionReset();
      _boardNewSessionClear(section);
    }

    function newSessionConfirmCancel() {
      _boardNewSessionReset();
    }

    // ================================================================
    // SHARED SAVE FILENAME DIALOG
    // ================================================================
    let _sfnBlob = null;
    let _sfnTarget = null;
    let _sfnOnDone = null;
    let _sfnCustomSave = null;

    function sfnOpen(defaultName, blob, target, onDone, options = {}) {
      _sfnBlob = blob;
      _sfnTarget = target || null;
      _sfnOnDone = (typeof onDone === 'function') ? onDone : null;
      _sfnCustomSave = options && typeof options.customSave === 'function' ? options.customSave : null;
      const input = document.getElementById('save-filename-input');
      input.value = defaultName;
      document.getElementById('save-filename-overlay').classList.add('active');
      setTimeout(() => {
        input.focus();
        input.select();
      }, 30);
    }

    async function sfnConfirm() {
      if (!_sfnBlob) return;
      let name = (document.getElementById('save-filename-input').value || 'session').trim();
      if (!name.endsWith('.js')) name = boardStripJsonExt(name) + '.js';

      if (_sfnCustomSave) {
        const saveFn = _sfnCustomSave;
        const resolvedName = await saveFn(name);
        _sfnBlob = null;
        _sfnCustomSave = null;
        const cb = _sfnOnDone; _sfnOnDone = null;
        sfnCancel();
        if (cb) cb(resolvedName || name);
        return;
      }

      if (_sfnTarget && window.Desktop && Desktop.isElectron()) {
        await Desktop.saveBlob(_sfnTarget, name, _sfnBlob);
        _sfnBlob = null;
        const cb = _sfnOnDone; _sfnOnDone = null;
        sfnCancel();
        if (cb) cb(name);
        return;
      }

      // Try File System API first (if available)
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: name,
            types: [{
              description: 'JavaScript Files',
              accept: { 'text/javascript': ['.js'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(_sfnBlob);
          await writable.close();
          _sfnBlob = null;
          const cb = _sfnOnDone; _sfnOnDone = null;
          sfnCancel();
          if (cb) cb(name);
          return;
        } catch (err) {
          // User cancelled or error occurred, fall through to download
          if (err.name !== 'AbortError') {
            console.error('File System API error:', err);
          }
        }
      }

      // Fallback to standard download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(_sfnBlob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      _sfnBlob = null;
      const cb = _sfnOnDone; _sfnOnDone = null;
      sfnCancel();
      if (cb) cb(name);
    }

    function sfnCancel() {
      _sfnBlob = null;
      _sfnTarget = null;
      _sfnOnDone = null;
      _sfnCustomSave = null;
      document.getElementById('save-filename-overlay').classList.remove('active');
    }

    // ================================================================
    // SESSION DROP ZONES — drag & drop .json to load
    // ================================================================
    (function () {
      function initDropzone(zoneId, loadFn) {
        const zone = document.getElementById(zoneId);
        if (!zone) return;

        zone.addEventListener('dragenter', e => {
          e.preventDefault();
          zone.classList.add('drag-over');
        });
        zone.addEventListener('dragover', e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', e => {
          // Only remove if leaving the zone itself, not a child
          if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', e => {
          e.preventDefault();
          zone.classList.remove('drag-over');
          const file = e.dataTransfer.files[0];
          if (!file) return;
          if (!/\.(js|json)$/i.test(file.name || '')) {
            mdbToast('⚠️ Please drop a .js or .json session file.'); return;
          }
          const reader = new FileReader();
          reader.onload = ev => {
            let data;
            try { data = boardParseSessionText(ev.target.result); }
            catch { mdbToast('⚠️ Could not read file — make sure it is a valid session .js or .json file.'); return; }
            loadFn(data, file);
          };
          reader.readAsText(file);
        });
      }

      initDropzone('con-dropzone', (data, file) => {
        if (data._type !== 'constellation' && !String(data._type || '').endsWith('-constellation')) {
          mdbToast('⚠️ This file does not look like a Constellation save file.'); return;
        }
        _conCurrentFileName = global._conCurrentFileName = file && file.name ? (file.name.endsWith('.js') ? file.name : boardStripJsonExt(file.name) + '.js') : null;
        _conCurrentFolderName = global._conCurrentFolderName = null;
        _conRestoreSession(data);
        // Always update title from dropped filename
        const _conDAutoTitle = boardStripJsonExt((file && file.name) || '');
        if (_conDAutoTitle) {
          if (window.conSetTitle) window.conSetTitle(_conDAutoTitle);
          const _conDTitleEl = document.getElementById('con-title-input');
          if (_conDTitleEl) _conDTitleEl.value = _conDAutoTitle;
        }
        boardPersistLocalSession('constellation', data, {
          name: boardStripJsonExt(file && file.name)
        });
        boardSetAutosaveFingerprint('constellation', data);
      });

      initDropzone('ta-dropzone', (data, file) => {
        if (data._type !== 'textanalysis') {
          mdbToast('⚠️ This file does not look like a Textual Analysis save file.'); return;
        }
        _taCurrentFileName = file && file.name ? (file.name.endsWith('.js') ? file.name : boardStripJsonExt(file.name) + '.js') : null;
        _taRestoreSession(data);
        // Always update title from dropped filename
        const _taDAutoTitle = boardStripJsonExt((file && file.name) || '');
        if (_taDAutoTitle) taSetTitle(_taDAutoTitle);
        boardPersistLocalSession('textanalysis', data, {
          name: boardStripJsonExt(file && file.name)
        });
        boardSetAutosaveFingerprint('textanalysis', data);
      });
    })();


  Board.io = Board.io || {};

  // Backward compatibility exports for HTML attributes & cross-module calls
  window.historySelectAll = global.historySelectAll = historySelectAll;
  window.historySetFilterDate = global.historySetFilterDate = historySetFilterDate;
  window.historySetFilterClass = global.historySetFilterClass = historySetFilterClass;
  window.historySetFilterText = global.historySetFilterText = historySetFilterText;
  window.historyClearFilters = global.historyClearFilters = historyClearFilters;
  window.historyArchiveSelected = global.historyArchiveSelected = historyArchiveSelected;
  window.historyUnarchiveSelected = global.historyUnarchiveSelected = historyUnarchiveSelected;
  window.historyZipSelected = global.historyZipSelected = historyZipSelected;
  window.historySetViewTab = global.historySetViewTab = historySetViewTab;
  window.historySetSort = global.historySetSort = historySetSort;
  window.historyRefreshList = global.historyRefreshList = historyRefreshList;
  window.historyExportSelected = global.historyExportSelected = historyExportSelected;
  window.historyDeleteSelected = global.historyDeleteSelected = historyDeleteSelected;
  window.historyDeleteAll = global.historyDeleteAll = historyDeleteAll;
  window.historyRenameCancel = global.historyRenameCancel = historyRenameCancel;
  window.historyRenameCommit = global.historyRenameCommit = historyRenameCommit;
  window.historyDeleteCancel = global.historyDeleteCancel = historyDeleteCancel;
  window.historyDeleteConfirm = global.historyDeleteConfirm = historyDeleteConfirm;
  window.historyDuplicateCancel = global.historyDuplicateCancel = historyDuplicateCancel;
  window.historyDuplicateCommit = global.historyDuplicateCommit = historyDuplicateCommit;
  window.historyPreviewClose = global.historyPreviewClose = historyPreviewClose;
  window.historyPreviewEntry = global.historyPreviewEntry = historyPreviewEntry;
  window.searchInitShortcutMenu = global.searchInitShortcutMenu = searchInitShortcutMenu;
  window.searchLoadShortcutBook = global.searchLoadShortcutBook = searchLoadShortcutBook;
  window.taImportLoadShortcutBook = global.taImportLoadShortcutBook = taImportLoadShortcutBook;
  window.taCloseImport = global.taCloseImport = taCloseImport;
  window.taImportFileLoaded = global.taImportFileLoaded = taImportFileLoaded;
  window.searchOpenImport = global.searchOpenImport = searchOpenImport;
  window.taImportSearchRun = global.taImportSearchRun = taImportSearchRun;
  window.taImportSearchStep = global.taImportSearchStep = taImportSearchStep;
  window.taImportSearchKey = global.taImportSearchKey = taImportSearchKey;
  window.taImportConfirm = global.taImportConfirm = taImportConfirm;
  window.searchPerform = global.searchPerform = searchPerform;
  window.searchClear = global.searchClear = searchClear;
  window.searchCtxClose = global.searchCtxClose = searchCtxClose;
  window.boardNewSession = global.boardNewSession = boardNewSession;
  window.conCloseSession = global.conCloseSession = conCloseSession;
  window.conCloseCancel = global.conCloseCancel = conCloseCancel;
  window.conCloseDiscard = global.conCloseDiscard = conCloseDiscard;
  window.conCloseSave = global.conCloseSave = conCloseSave;
  window.newSessionConfirmSave = global.newSessionConfirmSave = newSessionConfirmSave;
  window.newSessionConfirmDiscard = global.newSessionConfirmDiscard = newSessionConfirmDiscard;
  window.newSessionConfirmCancel = global.newSessionConfirmCancel = newSessionConfirmCancel;
  window.sfnConfirm = global.sfnConfirm = sfnConfirm;
  window.sfnCancel = global.sfnCancel = sfnCancel;
  window.boardReportActiveFileContext = global.boardReportActiveFileContext = boardReportActiveFileContext;
  window.boardDefaultSessionName = global.boardDefaultSessionName = boardDefaultSessionName;
  window.boardDefaultFileName = global.boardDefaultFileName = boardDefaultFileName;
  window.boardBuildPersistedSessionData = global.boardBuildPersistedSessionData = boardBuildPersistedSessionData;
  window.boardPersistLocalSession = global.boardPersistLocalSession = boardPersistLocalSession;
  window.boardSetAutosaveFingerprint = global.boardSetAutosaveFingerprint = boardSetAutosaveFingerprint;
  window.boardSessionType = global.boardSessionType = boardSessionType;
  window.boardSectionLabel = global.boardSectionLabel = boardSectionLabel;
  window.boardSourceLabel = global.boardSourceLabel = boardSourceLabel;
  window.boardFormatWhen = global.boardFormatWhen = boardFormatWhen;
  window.boardConsumePendingOpenRequestFromQuery = global.boardConsumePendingOpenRequestFromQuery = boardConsumePendingOpenRequestFromQuery;
  window.historyInit = global.historyInit = historyInit;
  window.boardResetSessionFileMeta = global.boardResetSessionFileMeta = boardResetSessionFileMeta;
  window.boardMakeSessionId = global.boardMakeSessionId = boardMakeSessionId;
  window.boardSanitizeFilenameKeepSpaces = global.boardSanitizeFilenameKeepSpaces = boardSanitizeFilenameKeepSpaces;

  window.historyUpsertEntry = global.historyUpsertEntry = historyUpsertEntry;
  window.historyBuildEntry = global.historyBuildEntry = historyBuildEntry;
  window.historyLoadSavedFile = global.historyLoadSavedFile = historyLoadSavedFile;
  window.historyRenderList = global.historyRenderList = historyRenderList;
  window.historyRefreshList = global.historyRefreshList = historyRefreshList;
  window.historyEntryRelativePath = global.historyEntryRelativePath = historyEntryRelativePath;
  window.historyFormatSize = global.historyFormatSize = historyFormatSize;
  window.historyHasLoaded = global.historyHasLoaded = historyHasLoaded;
  window._historyNeedsRender = global._historyNeedsRender = _historyNeedsRender;
  window.historyUpdateRenamedEntry = global.historyUpdateRenamedEntry = historyUpdateRenamedEntry;
  window.boardOpenSessionInNewWindow = global.boardOpenSessionInNewWindow = boardOpenSessionInNewWindow;
  window.boardSetSessionFileMeta = global.boardSetSessionFileMeta = boardSetSessionFileMeta;
  window.boardSetSessionFileMetaFromData = global.boardSetSessionFileMetaFromData = boardSetSessionFileMetaFromData;
  window.boardParseSessionText = global.boardParseSessionText = boardParseSessionText;
  window.boardReadStore = global.boardReadStore = boardReadStore;
  window.boardWriteStoreWithFallback = global.boardWriteStoreWithFallback = boardWriteStoreWithFallback;
  window.boardStartNewSessionDate = global.boardStartNewSessionDate = boardStartNewSessionDate;
  window.boardSessionDateCreated = global.boardSessionDateCreated = boardSessionDateCreated;
  window.boardNormalizeDateCreated = global.boardNormalizeDateCreated = boardNormalizeDateCreated;
  window.boardSessionMeta = global.boardSessionMeta = boardSessionMeta;
  window.boardAutosaveFingerprint = global.boardAutosaveFingerprint = boardAutosaveFingerprint;
  window.boardGetAutosaveDebounceMs = global.boardGetAutosaveDebounceMs = boardGetAutosaveDebounceMs;
  window._boardMutationFirstDirtyAt = global._boardMutationFirstDirtyAt = _boardMutationFirstDirtyAt;
  window.boardGetAutosaveMaxWaitMs = global.boardGetAutosaveMaxWaitMs = boardGetAutosaveMaxWaitMs;
  window.boardIsUserInteracting = global.boardIsUserInteracting = boardIsUserInteracting;
  window._conIsSaving = global._conIsSaving = _conIsSaving;
  window.boardComputeFingerprint = global.boardComputeFingerprint = boardComputeFingerprint;
  window._conLastSaveTimestamp = global._conLastSaveTimestamp = _conLastSaveTimestamp;
  window.boardExportTargetForSection = global.boardExportTargetForSection = boardExportTargetForSection;
  window.boardAutosaveName = global.boardAutosaveName = boardAutosaveName;
  window.boardBuildSessionFileContent = global.boardBuildSessionFileContent = boardBuildSessionFileContent;
  window.boardBuildSessionBlob = global.boardBuildSessionBlob = boardBuildSessionBlob;
  window._conPendingManualSave = global._conPendingManualSave = _conPendingManualSave;
  window.wnShowKatexHelp = global.wnShowKatexHelp = wnShowKatexHelp;
  window.taOpenImport = global.taOpenImport = taOpenImport;
  window.sessionLoadMode = global.sessionLoadMode = sessionLoadMode;
  window.sfnOpen = global.sfnOpen = sfnOpen;
  window.searchBookText = global.searchBookText = searchBookText;
  window.searchAvailableBooks = global.searchAvailableBooks = searchAvailableBooks;
  window.searchReadShortcutBook = global.searchReadShortcutBook = searchReadShortcutBook;

})(typeof window !== "undefined" ? window : this);