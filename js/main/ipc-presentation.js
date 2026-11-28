// Presentation and mirror window IPC handlers extracted from electron-main.js
'use strict';

function registerPresentationIpc(ctx) {
  const {
    BrowserWindow,
    ipcMain,
    screen,
    path,
    ROOT_DIR,
    PAGE_FILES,
    winRefs,
    getToolPath,
    getExtendedDisplayForBounds,
    readUserLauncherCardConfig,
    getPresentationDefaultBounds,
    mapWindowBoundsToDisplay,
    setupWindowExternalLinkHandling,
    syncTargetWindowToSource,
    applyPresentationDefaultBounds,
    dockTargetWindow,
    maximizePresenterWindow,
    notifyWindowsChanged
  } = ctx;
  const _notify = typeof notifyWindowsChanged === 'function' ? notifyWindowsChanged : () => {};

  ipcMain.handle('app:has-second-display', async () => {
    return screen.getAllDisplays().length > 1;
  });

  ipcMain.handle('app:open-mirror-window', async (event, request = {}) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    const targetChannel = (request && request.channel) ? String(request.channel).trim() : '';
    const query = { mirror: '1' };
    if (targetChannel) {
      query.mirrorChannel = targetChannel;
    }

    if (winRefs.mirror && !winRefs.mirror.isDestroyed()) {
      if (winRefs.mirrorSource !== senderWin || targetChannel) {
        winRefs.mirrorSource = senderWin || null;
        try {
          await winRefs.mirror.loadFile(getToolPath(PAGE_FILES.board), { query });
        } catch (err) {
          console.error('app:open-mirror-window reload failed', err);
        }
      }
      winRefs.mirror.focus();
      return { ok: true, alreadyOpen: true };
    }
    const sBounds = senderWin ? senderWin.getBounds() : null;
    winRefs.mirrorSource = senderWin || null;

    // Detect second screen relative to sender window
    const secondDisplay = getExtendedDisplayForBounds(sBounds);
    const primaryDisplay = screen.getPrimaryDisplay();

    const cardCfg = (request && request.cardConfig) || readUserLauncherCardConfig('board') || {};
    const hasCustomPres = !!(cardCfg.presWindowSize || cardCfg.presWindowPosition);
    const defaultBounds = hasCustomPres ? getPresentationDefaultBounds('board', null, senderWin, cardCfg) : null;

    let winOpts;
    if (hasCustomPres && defaultBounds) {
      winOpts = {
        x: defaultBounds.x, y: defaultBounds.y, width: defaultBounds.width, height: defaultBounds.height,
        autoHideMenuBar: true,
        title: 'Board – Presentation Mode',
        webPreferences: {
          preload: path.join(ROOT_DIR, 'electron-preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          backgroundThrottling: false
        }
      };
    } else if (secondDisplay) {
      // Mirror the same relative position and size ratio from the main window's display onto the second display
      const srcDisplay = sBounds
        ? (screen.getDisplayMatching(sBounds) || primaryDisplay)
        : primaryDisplay;
      const mappedBounds = mapWindowBoundsToDisplay(sBounds, srcDisplay, secondDisplay)
        || { x: secondDisplay.workArea.x, y: secondDisplay.workArea.y, width: 1200, height: 800 };

      winOpts = {
        x: mappedBounds.x, y: mappedBounds.y, width: mappedBounds.width, height: mappedBounds.height,
        autoHideMenuBar: true,
        title: 'Board – Presentation Mode',
        webPreferences: {
          preload: path.join(ROOT_DIR, 'electron-preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          backgroundThrottling: false
        }
      };
    } else {
      const width = sBounds ? sBounds.width : (Number(request.width) || 1200);
      const height = sBounds ? sBounds.height : (Number(request.height) || 800);
      winOpts = {
        width, height,
        autoHideMenuBar: true,
        title: 'Board – Presentation Mode',
        webPreferences: {
          preload: path.join(ROOT_DIR, 'electron-preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          backgroundThrottling: false
        }
      };
      // Place beside the main window when no second screen is available
      if (sBounds) { winOpts.x = sBounds.x + sBounds.width + 10; winOpts.y = sBounds.y; }
    }

    winRefs.mirror = new BrowserWindow(winOpts);
    if (defaultBounds && defaultBounds.maximize) {
      winRefs.mirror.maximize();
    }
    setupWindowExternalLinkHandling(winRefs.mirror);
    winRefs.mirror.on('closed', () => {
      winRefs.mirror = null;
      winRefs.mirrorSource = null;
      _notify();
    });
    // When no second screen and no custom presentation size: keep presentation window the same size as the main window
    if (!secondDisplay && !hasCustomPres && senderWin) {
      const _syncSize = () => {
        if (!winRefs.mirror || winRefs.mirror.isDestroyed()) return;
        const b = senderWin.getBounds();
        winRefs.mirror.setSize(b.width, b.height);
      };
      senderWin.on('resize', _syncSize);
      winRefs.mirror.once('closed', () => senderWin.off('resize', _syncSize));
    }
    try {
      await winRefs.mirror.loadFile(getToolPath(PAGE_FILES.board), { query });
    } catch (err) {
      console.error('app:open-mirror-window load failed', err);
      return { ok: false, error: String(err) };
    }
    if (senderWin && !senderWin.isDestroyed() && winRefs.mirror && !winRefs.mirror.isDestroyed()) {
      try {
        const srcZoom = senderWin.webContents.getZoomFactor();
        winRefs.mirror.webContents.setZoomFactor(srcZoom);
      } catch (_) { }
    }
    _notify();
    return { ok: true };
  });

  ipcMain.handle('app:mirror-window-command', (event, command) => {
    if (!winRefs.mirror || winRefs.mirror.isDestroyed()) return { ok: false, reason: 'not-open' };
    switch (command) {
      case 'close':
        winRefs.mirror.close();
        break;
      case 'resize-window':
        syncTargetWindowToSource(winRefs.mirror, winRefs.mirrorSource);
        break;
      case 'default-size':
        applyPresentationDefaultBounds(winRefs.mirror, winRefs.mirrorSource, 'board');
        break;
      case 'dock-left':
        dockTargetWindow(winRefs.mirror, 'left', 0.2, winRefs.mirrorSource);
        break;
      case 'dock-right':
        dockTargetWindow(winRefs.mirror, 'right', 0.2, winRefs.mirrorSource);
        break;
      case 'maximise':
      case 'maximize':
        maximizePresenterWindow(winRefs.mirror, winRefs.mirrorSource);
        break;
      case 'ensure-visible':
        if (winRefs.mirror.isMinimized()) winRefs.mirror.restore();
        winRefs.mirror.show();
        if (winRefs.mirrorSource && !winRefs.mirrorSource.isDestroyed()) {
          winRefs.mirrorSource.focus();
        }
        break;
      case 'toggle-always-on-top': {
        const nextTop = !winRefs.mirror.isAlwaysOnTop();
        winRefs.mirror.setAlwaysOnTop(nextTop, 'floating');
        _notify();
        return { ok: true, alwaysOnTop: winRefs.mirror.isAlwaysOnTop() };
      }
      case 'get-always-on-top':
        return { ok: true, alwaysOnTop: winRefs.mirror.isAlwaysOnTop() };
      default:
        return { ok: false, reason: 'unknown-command' };
    }
    _notify();
    return { ok: true };
  });

  ipcMain.handle('app:open-cms-presentation', async (event, request = {}) => {
    if (winRefs.cms && !winRefs.cms.isDestroyed()) {
      winRefs.cms.focus();
      return { ok: true, alreadyOpen: true };
    }
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    const sBounds = senderWin ? senderWin.getBounds() : null;
    winRefs.cmsSource = senderWin || null;

    const secondDisplay = getExtendedDisplayForBounds(sBounds);

    const cardCfg = (request && request.cardConfig) || readUserLauncherCardConfig('classManagement') || readUserLauncherCardConfig('class-management') || {};
    const hasCustomPres = !!(cardCfg.presWindowSize || cardCfg.presWindowPosition);
    const defaultBounds = hasCustomPres ? getPresentationDefaultBounds('classManagement', null, senderWin, cardCfg) : null;

    let winOpts;
    if (hasCustomPres && defaultBounds) {
      winOpts = {
        x: defaultBounds.x, y: defaultBounds.y, width: defaultBounds.width, height: defaultBounds.height,
        autoHideMenuBar: true,
        title: 'Class Management – Presentation',
        webPreferences: {
          preload: path.join(ROOT_DIR, 'electron-preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          backgroundThrottling: false
        }
      };
    } else if (secondDisplay) {
      const sourceDisplay = sBounds
        ? (screen.getDisplayMatching(sBounds) || screen.getPrimaryDisplay())
        : screen.getPrimaryDisplay();
      const mappedBounds = mapWindowBoundsToDisplay(sBounds, sourceDisplay, secondDisplay)
        || { x: secondDisplay.workArea.x, y: secondDisplay.workArea.y, width: 1200, height: 800 };
      winOpts = {
        x: mappedBounds.x, y: mappedBounds.y, width: mappedBounds.width, height: mappedBounds.height,
        autoHideMenuBar: true,
        title: 'Class Management – Presentation',
        webPreferences: {
          preload: path.join(ROOT_DIR, 'electron-preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          backgroundThrottling: false
        }
      };
    } else {
      const width = sBounds ? sBounds.width : 1200;
      const height = sBounds ? sBounds.height : 800;
      winOpts = {
        width, height,
        autoHideMenuBar: true,
        title: 'Class Management – Presentation',
        webPreferences: {
          preload: path.join(ROOT_DIR, 'electron-preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          backgroundThrottling: false
        }
      };
      // Place beside the main window when no second screen is available
      if (sBounds) { winOpts.x = sBounds.x + sBounds.width + 10; winOpts.y = sBounds.y; }
    }

    winRefs.cms = new BrowserWindow(winOpts);
    if (defaultBounds && defaultBounds.maximize) {
      winRefs.cms.maximize();
    }
    setupWindowExternalLinkHandling(winRefs.cms);
    winRefs.cms.on('closed', () => {
      winRefs.cms = null;
      _notify();
    });

    try {
      await winRefs.cms.loadFile(
        getToolPath(PAGE_FILES.classManagement),
        { query: { presentation: '1' } }
      );
    } catch (err) {
      console.error('app:open-cms-presentation load failed', err);
      return { ok: false, error: String(err) };
    }
    if (senderWin && !senderWin.isDestroyed() && winRefs.cms && !winRefs.cms.isDestroyed()) {
      try {
        const srcZoom = senderWin.webContents.getZoomFactor();
        winRefs.cms.webContents.setZoomFactor(srcZoom);
      } catch (_) { }
    }
    _notify();
    return { ok: true };
  });

  ipcMain.handle('app:cms-presentation-open', () => {
    return !!(winRefs.cms && !winRefs.cms.isDestroyed());
  });

  ipcMain.handle('app:cms-presentation-command', (event, command) => {
    if (!winRefs.cms || winRefs.cms.isDestroyed()) return { ok: false, reason: 'not-open' };
    switch (command) {
      case 'close': winRefs.cms.close(); break;
      case 'fullscreen': winRefs.cms.setFullScreen(!winRefs.cms.isFullScreen()); break;
      case 'resize-window': syncTargetWindowToSource(winRefs.cms, winRefs.cmsSource); break;
      case 'default-size': applyPresentationDefaultBounds(winRefs.cms, winRefs.cmsSource, 'classManagement'); break;
      case 'maximize':
      case 'maximise': maximizePresenterWindow(winRefs.cms, winRefs.cmsSource); break;
      case 'minimize': winRefs.cms.minimize(); break;
      case 'dock-left': dockTargetWindow(winRefs.cms, 'left', 0.2, winRefs.cmsSource); break;
      case 'dock-right': dockTargetWindow(winRefs.cms, 'right', 0.2, winRefs.cmsSource); break;
      case 'toggle-always-on-top': {
        const nextTop = !winRefs.cms.isAlwaysOnTop();
        winRefs.cms.setAlwaysOnTop(nextTop, 'floating');
        _notify();
        return { ok: true, alwaysOnTop: winRefs.cms.isAlwaysOnTop() };
      }
      case 'get-always-on-top':
        return { ok: true, alwaysOnTop: winRefs.cms.isAlwaysOnTop() };
      default: return { ok: false, reason: 'unknown-command' };
    }
    _notify();
    return { ok: true };
  });

  ipcMain.handle('app:learning-tools-presentation-command', (event, command) => {
    if (!winRefs.learning || winRefs.learning.isDestroyed()) {
      return { ok: false, reason: 'not-open' };
    }
    switch (command) {
      case 'close':
        winRefs.learning.close();
        break;
      case 'fullscreen':
        winRefs.learning.setFullScreen(!winRefs.learning.isFullScreen());
        break;
      case 'resize-window':
        syncTargetWindowToSource(winRefs.learning, winRefs.learningSource);
        break;
      case 'default-size':
        applyPresentationDefaultBounds(winRefs.learning, winRefs.learningSource, 'learningTools');
        break;
      case 'dock-left':
        dockTargetWindow(winRefs.learning, 'left', 0.2, winRefs.learningSource);
        break;
      case 'dock-right':
        dockTargetWindow(winRefs.learning, 'right', 0.2, winRefs.learningSource);
        break;
      case 'maximize':
      case 'maximise':
        maximizePresenterWindow(winRefs.learning, winRefs.learningSource);
        break;
      default:
        return { ok: false, reason: 'unknown-command' };
    }
    return { ok: true };
  });

  // ── Oral Marking Presenter Window ─────────────────────────────────────────────
  ipcMain.handle('app:open-oral-presenter', async (event, request = {}) => {
    if (winRefs.oral && !winRefs.oral.isDestroyed()) {
      winRefs.oral.focus();
      return { ok: true, alreadyOpen: true };
    }
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    winRefs.oralSource = senderWin || null;
    const sBounds = senderWin ? senderWin.getBounds() : null;
    const secondDisplay = getExtendedDisplayForBounds(sBounds);
    let winOpts;
    if (secondDisplay) {
      const sourceDisplay = sBounds
        ? (screen.getDisplayMatching(sBounds) || screen.getPrimaryDisplay())
        : screen.getPrimaryDisplay();
      const mappedBounds = mapWindowBoundsToDisplay(sBounds, sourceDisplay, secondDisplay)
        || { x: secondDisplay.workArea.x, y: secondDisplay.workArea.y, width: 1200, height: 800 };
      winOpts = {
        x: mappedBounds.x, y: mappedBounds.y, width: mappedBounds.width, height: mappedBounds.height,
        autoHideMenuBar: true, title: 'Oral Marking – Presenter',
        webPreferences: { preload: path.join(ROOT_DIR, 'electron-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
      };
    } else {
      const width = sBounds ? sBounds.width : 1200;
      const height = sBounds ? sBounds.height : 800;
      winOpts = {
        width, height, autoHideMenuBar: true, title: 'Oral Marking – Presenter',
        webPreferences: { preload: path.join(ROOT_DIR, 'electron-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
      };
      if (sBounds) { winOpts.x = sBounds.x + sBounds.width + 10; winOpts.y = sBounds.y; }
    }
    winRefs.oral = new BrowserWindow(winOpts);
    setupWindowExternalLinkHandling(winRefs.oral);
    winRefs.oral.on('closed', () => { winRefs.oral = null; });
    try {
      await winRefs.oral.loadFile(getToolPath(PAGE_FILES.oralMarking), { query: { presentation: '1' } });
    } catch (err) {
      console.error('app:open-oral-presenter load failed', err);
      return { ok: false, error: String(err) };
    }
    if (senderWin && !senderWin.isDestroyed() && winRefs.oral && !winRefs.oral.isDestroyed()) {
      try {
        const srcZoom = senderWin.webContents.getZoomFactor();
        winRefs.oral.webContents.setZoomFactor(srcZoom);
      } catch (_) { }
    }
    return { ok: true };
  });

  ipcMain.handle('app:oral-presenter-open', () => {
    return !!(winRefs.oral && !winRefs.oral.isDestroyed());
  });

  ipcMain.handle('app:oral-presenter-command', (event, command) => {
    if (!winRefs.oral || winRefs.oral.isDestroyed()) return { ok: false, reason: 'not-open' };
    switch (command) {
      case 'close': winRefs.oral.close(); break;
      case 'fullscreen': winRefs.oral.setFullScreen(!winRefs.oral.isFullScreen()); break;
      case 'maximize':
      case 'maximise': maximizePresenterWindow(winRefs.oral, winRefs.oralSource); break;
      case 'minimize': winRefs.oral.minimize(); break;
      default: return { ok: false, reason: 'unknown-command' };
    }
    return { ok: true };
  });

  // ── Document Editor Presentation Window ────────────────────────────────────────
  ipcMain.handle('app:open-doc-presentation', async (event, request = {}) => {
    if (winRefs.doc && !winRefs.doc.isDestroyed()) {
      winRefs.doc.focus();
      return { ok: true, alreadyOpen: true };
    }
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    winRefs.docSource = senderWin || null;
    const sBounds = senderWin ? senderWin.getBounds() : null;
    const secondDisplay = getExtendedDisplayForBounds(sBounds);
    let winOpts;
    if (secondDisplay) {
      const sourceDisplay = sBounds
        ? (screen.getDisplayMatching(sBounds) || screen.getPrimaryDisplay())
        : screen.getPrimaryDisplay();
      const mappedBounds = mapWindowBoundsToDisplay(sBounds, sourceDisplay, secondDisplay)
        || { x: secondDisplay.workArea.x, y: secondDisplay.workArea.y, width: 1200, height: 800 };
      winOpts = {
        x: mappedBounds.x, y: mappedBounds.y, width: mappedBounds.width, height: mappedBounds.height,
        autoHideMenuBar: true, title: 'Document – Presentation Mode',
        webPreferences: { preload: path.join(ROOT_DIR, 'electron-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
      };
    } else {
      const width = sBounds ? sBounds.width : 1200;
      const height = sBounds ? sBounds.height : 800;
      winOpts = {
        width, height, autoHideMenuBar: true, title: 'Document – Presentation Mode',
        webPreferences: { preload: path.join(ROOT_DIR, 'electron-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
      };
      if (sBounds) { winOpts.x = sBounds.x + sBounds.width + 10; winOpts.y = sBounds.y; }
    }

    winRefs.doc = new BrowserWindow(winOpts);
    setupWindowExternalLinkHandling(winRefs.doc);
    winRefs.doc.on('closed', () => { winRefs.doc = null; });

    try {
      await winRefs.doc.loadFile(
        getToolPath(PAGE_FILES.documentEditor),
        { query: { presentation: '1' } }
      );
    } catch (err) {
      console.error('app:open-doc-presentation load failed', err);
      return { ok: false, error: String(err) };
    }
    if (senderWin && !senderWin.isDestroyed() && winRefs.doc && !winRefs.doc.isDestroyed()) {
      try {
        const srcZoom = senderWin.webContents.getZoomFactor();
        winRefs.doc.webContents.setZoomFactor(srcZoom);
      } catch (_) { }
    }
    return { ok: true };
  });

  ipcMain.handle('app:doc-presentation-open', () => {
    return !!(winRefs.doc && !winRefs.doc.isDestroyed());
  });

  ipcMain.handle('app:doc-presentation-command', (event, command) => {
    if (!winRefs.doc || winRefs.doc.isDestroyed()) return { ok: false, reason: 'not-open' };
    switch (command) {
      case 'close': winRefs.doc.close(); break;
      case 'fullscreen': winRefs.doc.setFullScreen(!winRefs.doc.isFullScreen()); break;
      case 'maximize':
      case 'maximise': maximizePresenterWindow(winRefs.doc, winRefs.docSource); break;
      case 'resize-window': syncTargetWindowToSource(winRefs.doc, winRefs.docSource); break;
      case 'dock-left': dockTargetWindow(winRefs.doc, 'left', 0.2, winRefs.docSource); break;
      case 'dock-right': dockTargetWindow(winRefs.doc, 'right', 0.2, winRefs.docSource); break;
      default: return { ok: false, reason: 'unknown-command' };
    }
    return { ok: true };
  });

  // ── PDF Viewer Presentation Window ──────────────────────────────────────────
  ipcMain.handle('app:open-pdf-presentation', async (event, request = {}) => {
    if (winRefs.pdf && !winRefs.pdf.isDestroyed()) {
      winRefs.pdf.focus();
      return { ok: true, alreadyOpen: true };
    }
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    winRefs.pdfSource = senderWin || null;
    const sBounds = senderWin ? senderWin.getBounds() : null;
    const secondDisplay = getExtendedDisplayForBounds(sBounds);
    let winOpts;
    if (secondDisplay) {
      const sourceDisplay = sBounds
        ? (screen.getDisplayMatching(sBounds) || screen.getPrimaryDisplay())
        : screen.getPrimaryDisplay();
      const mappedBounds = mapWindowBoundsToDisplay(sBounds, sourceDisplay, secondDisplay)
        || { x: secondDisplay.workArea.x, y: secondDisplay.workArea.y, width: 1200, height: 800 };
      winOpts = {
        x: mappedBounds.x, y: mappedBounds.y, width: mappedBounds.width, height: mappedBounds.height,
        autoHideMenuBar: true, title: 'Viewer – Presentation Mode',
        webPreferences: { preload: path.join(ROOT_DIR, 'electron-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
      };
    } else {
      const width = sBounds ? sBounds.width : 1200;
      const height = sBounds ? sBounds.height : 800;
      winOpts = {
        width, height, autoHideMenuBar: true, title: 'Viewer – Presentation Mode',
        webPreferences: { preload: path.join(ROOT_DIR, 'electron-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
      };
      if (sBounds) { winOpts.x = sBounds.x + sBounds.width + 10; winOpts.y = sBounds.y; }
    }

    winRefs.pdf = new BrowserWindow(winOpts);
    setupWindowExternalLinkHandling(winRefs.pdf);
    winRefs.pdf.on('closed', () => {
      winRefs.pdf = null;
      if (winRefs.pdfSource && !winRefs.pdfSource.isDestroyed()) {
        try {
          winRefs.pdfSource.webContents.send('app:pdf-presentation-closed');
        } catch (_) { }
      }
    });

    const query = { presentation: '1' };
    if (request.openTarget) query.openTarget = request.openTarget;
    if (request.openRelPath) query.openRelPath = request.openRelPath;
    if (request.openAbsPath) query.openAbsPath = request.openAbsPath;
    if (request.currentPage) query.currentPage = String(request.currentPage);

    try {
      await winRefs.pdf.loadFile(
        getToolPath(PAGE_FILES.pdfViewer),
        { query }
      );
    } catch (err) {
      console.error('app:open-pdf-presentation load failed', err);
      return { ok: false, error: String(err) };
    }
    if (winRefs.pdf && !winRefs.pdf.isDestroyed()) {
      try {
        winRefs.pdf.webContents.setZoomLevel(0);
        winRefs.pdf.webContents.setZoomFactor(1.0);
      } catch (_) { }
    }
    return { ok: true };
  });

  ipcMain.handle('app:pdf-presentation-open', () => {
    return !!(winRefs.pdf && !winRefs.pdf.isDestroyed());
  });

  ipcMain.handle('app:pdf-presentation-command', (event, command) => {
    if (!winRefs.pdf || winRefs.pdf.isDestroyed()) return { ok: false, reason: 'not-open' };
    switch (command) {
      case 'close': winRefs.pdf.close(); break;
      case 'fullscreen': winRefs.pdf.setFullScreen(!winRefs.pdf.isFullScreen()); break;
      case 'maximize':
      case 'maximise': maximizePresenterWindow(winRefs.pdf, winRefs.pdfSource); break;
      case 'resize-window': syncTargetWindowToSource(winRefs.pdf, winRefs.pdfSource); break;
      default: return { ok: false, reason: 'unknown-command' };
    }
    return { ok: true };
  });

}

module.exports = { registerPresentationIpc };
