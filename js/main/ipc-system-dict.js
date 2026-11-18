// Crash dumps, session context, screen capture, and quick dictionary IPC handlers extracted from electron-main.js
'use strict';

const { createDictionaryService } = require('../dictionary-service');

function registerSystemDictIpc(ctx) {
  const {
    BrowserWindow,
    desktopCapturer,
    ipcMain,
    shell,
    fs,
    path,
    ROOT_DIR,
    PAGE_FILES,
    getMirrorWindow,
    _windowSessionContexts,
    writeCrashDump,
    scheduleSaveSessionState,
    isPresentationWindow,
    getLoadedPageFile,
    _areBoardFilesEqual,
    _isMultiWindowFileTool,
    _areToolFilesEqual,
    readSavedSessionState,
    getCrashDumpsDir,
    getSaveTargets,
    getBundledDataRoot
  } = ctx;

  ipcMain.handle('app:report-renderer-error', async (_event, data) => {
    try {
      const errObj = data?.error || {};
      const page = data?.page || 'unknown';
      writeCrashDump('renderer-error', { page, url: data?.url, line: data?.line, col: data?.col }, {
        message: errObj.message || data?.message || 'Renderer Error',
        name: errObj.name || 'RendererError',
        stack: errObj.stack || ''
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('app:update-session-context', async (event, context = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      if (context && typeof context === 'object' && Object.keys(context).length > 0) {
        _windowSessionContexts.set(win.id, context);
      } else {
        _windowSessionContexts.delete(win.id);
      }
      scheduleSaveSessionState(300);
    }
    return { ok: true };
  });

  ipcMain.handle('app:check-board-file-open', async (event, query = {}) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    const boardWins = BrowserWindow.getAllWindows().filter(
      w => !w.isDestroyed() && !isPresentationWindow(w) && getLoadedPageFile(w) === PAGE_FILES.board && w !== senderWin
    );
    for (const w of boardWins) {
      const ctx = _windowSessionContexts.get(w.id);
      if (_areBoardFilesEqual(ctx, query)) {
        if (w.isMinimized()) w.restore();
        w.focus();
        return { ok: true, isOpen: true, windowId: w.id };
      }
    }
    return { ok: true, isOpen: false };
  });

  ipcMain.handle('app:check-file-open', async (event, request = {}) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    let rawPage = request.pageFile || (senderWin ? getLoadedPageFile(senderWin) : null);
    if (typeof rawPage === 'string') rawPage = rawPage.replace(/^[./\\]*pages[/\\]/, '');
    const targetPageFile = PAGE_FILES[rawPage] || rawPage;
    if (!targetPageFile || !_isMultiWindowFileTool(targetPageFile)) {
      return { ok: true, isOpen: false };
    }
    const toolWins = BrowserWindow.getAllWindows().filter(
      w => !w.isDestroyed() && !isPresentationWindow(w) && getLoadedPageFile(w) === targetPageFile && w !== senderWin
    );
    for (const w of toolWins) {
      const ctx = _windowSessionContexts.get(w.id);
      if (_areToolFilesEqual(targetPageFile, ctx, request)) {
        if (w.isMinimized()) w.restore();
        w.focus();
        return { ok: true, isOpen: true, windowId: w.id };
      }
    }
    return { ok: true, isOpen: false };
  });

  ipcMain.handle('app:get-session-state', async () => {
    return { ok: true, session: readSavedSessionState() };
  });

  ipcMain.handle('app:get-crash-dumps', async () => {
    try {
      const dir = getCrashDumpsDir();
      try { await fs.access(dir); } catch (_) { return { ok: true, dumps: [] }; }
      const files = (await fs.readdir(dir))
        .filter(f => f.startsWith('crash-dump_') && f.endsWith('.json'))
        .sort()
        .reverse();
      const dumps = [];
      for (const file of files.slice(0, 20)) {
        try {
          const content = await fs.readFile(path.join(dir, file), 'utf8');
          dumps.push({ filename: file, data: JSON.parse(content) });
        } catch (e) { }
      }
      return { ok: true, dumps };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('app:open-crash-dumps-dir', async () => {
    try {
      const dir = getCrashDumpsDir();
      shell.openPath(dir);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('app:get-latest-crash-dump', async () => {
    try {
      const dir = getCrashDumpsDir();
      const latestPath = path.join(dir, 'latest-crash-dump.json');
      try { await fs.access(latestPath); } catch (_) { return { ok: true, dump: null }; }
      const content = await fs.readFile(latestPath, 'utf8');
      return { ok: true, dump: JSON.parse(content) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('app:get-screen-sources', async (event, request = {}) => {
    try {
      const types = request.types || ['screen', 'window'];
      const sources = await desktopCapturer.getSources({
        types,
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true
      });
      const senderWin = BrowserWindow.fromWebContents(event.sender);
      const senderMediaId = (senderWin && !senderWin.isDestroyed() && typeof senderWin.getMediaSourceId === 'function')
        ? senderWin.getMediaSourceId()
        : null;
      const mirrorMediaId = (getMirrorWindow() && !getMirrorWindow().isDestroyed() && typeof getMirrorWindow().getMediaSourceId === 'function')
        ? getMirrorWindow().getMediaSourceId()
        : null;

      return {
        ok: true,
        senderMediaId,
        mirrorMediaId,
        sources: sources.map(s => ({
          id: s.id,
          name: s.name,
          thumbnail: s.thumbnail ? s.thumbnail.toDataURL() : '',
          appIcon: s.appIcon ? s.appIcon.toDataURL() : '',
          isSender: senderMediaId ? s.id === senderMediaId : false,
          isMirror: mirrorMediaId ? s.id === mirrorMediaId : false
        }))
      };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  // ── Board recording: direct WebContents (tab) capture target ─────────────────
  // OS-level window capture (desktopCapturer window sources) on Windows stops
  // receiving frames / returns black as soon as a Chromium window loses focus or
  // becomes occluded. Tab capture pulls frames straight from the renderer's
  // compositor and keeps the captured page awake, regardless of focus.
  const pendingDisplayCaptureTargets = new Map(); // senderWebContentsId -> { target, expires }

  ipcMain.handle('app:set-display-capture-target', (event, request = {}) => {
    const target = request && typeof request.target === 'string' ? request.target : '';
    if (!target) {
      pendingDisplayCaptureTargets.delete(event.sender.id);
      return { ok: true };
    }
    if (target === 'mirror' && (!getMirrorWindow() || getMirrorWindow().isDestroyed())) {
      return { ok: false, reason: 'mirror-not-open' };
    }
    pendingDisplayCaptureTargets.set(event.sender.id, { target, expires: Date.now() + 15000 });
    return { ok: true };
  });

  function resolveRequestWebContents(request) {
    try {
      const { webContents: wcModule } = require('electron');
      if (request && request.frame && typeof wcModule.fromFrame === 'function') {
        const wc = wcModule.fromFrame(request.frame);
        if (wc) return wc;
      }
    } catch (_) { }
    return (request && (request.frame?.webContents || request.webContents)) || null;
  }

  // ── Media Converter IPC Handlers & Engine ────────────────────────────────────
  const _activeMediaJobs = new Map(); // jobId -> { process, outputPath }


  // ── Quick Dictionary (worker-thread backed word bank search) ─────────────────
  const _dictionaryService = createDictionaryService({
    workerPath: path.join(ROOT_DIR, 'js', 'dictionary-worker.js'),
    getBankDirs: () => [
      getSaveTargets().customWordbanks,
      path.join(getBundledDataRoot(), 'wordbanks')
    ]
  });

  ipcMain.handle('dictionary:list-banks', async () => {
    try {
      return { ok: true, banks: await _dictionaryService.listBanks(), status: _dictionaryService.getStatus() };
    } catch (err) {
      return { ok: false, error: err?.message || String(err), banks: [] };
    }
  });

  ipcMain.handle('dictionary:set-banks', async (event, request = {}) => {
    try {
      const names = Array.isArray(request?.banks) ? request.banks : [];
      return { ok: true, status: await _dictionaryService.setBanks(names) };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle('dictionary:search', async (event, request = {}) => {
    try {
      const limit = Math.max(1, Math.min(200, Number(request?.limit) || 50));
      const outcome = await _dictionaryService.search({ q: request?.q, scope: request?.scope, limit });
      return Object.assign({ ok: true }, outcome);
    } catch (err) {
      return { ok: false, error: err?.message || String(err), results: [], total: 0, suggestions: [] };
    }
  });

  ipcMain.handle('dictionary:status', async () => ({ ok: true, status: _dictionaryService.getStatus() }));

  ipcMain.handle('dictionary:dispose', async () => {
    _dictionaryService.dispose();
    return { ok: true };
  });

  return {
    resolveRequestWebContents,
    dictionaryService: _dictionaryService,
    pendingDisplayCaptureTargets
  };
}

module.exports = { registerSystemDictIpc };
