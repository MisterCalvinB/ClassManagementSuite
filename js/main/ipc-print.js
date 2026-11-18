// HTML and PDF printing IPC handlers extracted from electron-main.js
'use strict';

function registerPrintIpc(ctx) {
  const {
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    fs,
    fsSync,
    os,
    path,
    ROOT_DIR,
    getWritableRootDir,
    getRequestingPage,
    writeAllowedFile
  } = ctx;

  ipcMain.handle('app:print-html', async (event, request = {}) => {
    const html = typeof request === 'string' ? request : String((request && request.html) || '');
    const win = new BrowserWindow({
      show: true,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(ROOT_DIR, 'electron-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    let result = { ok: false };
    const tmpFile = path.join(os.tmpdir(), `cmt-print-${Date.now()}.html`);
    try {
      await fs.writeFile(tmpFile, html, 'utf8');
      await win.loadFile(tmpFile);
      result = await new Promise((resolve) => {
        win.webContents.once('did-finish-load', () => {
          win.webContents.print({ printBackground: true }, (success, failureReason) => {
            resolve({ ok: !!success, success: !!success, failureReason: failureReason || null });
          });
        });
      });
    } catch (err) {
      console.error('Print failed', err);
      result = { ok: false, error: String(err && err.message ? err.message : err) };
    } finally {
      fs.unlink(tmpFile).catch(() => { });
      try { win.close(); } catch { }
    }

    return result;
  });

  function getDefaultPdfExportOptions() {
    try {
      const configPath = path.join(getWritableRootDir(), 'user', 'config.js');
      if (fsSync.existsSync(configPath)) {
        const content = fsSync.readFileSync(configPath, 'utf8');
        const match = content.match(/CLASS_MANAGEMENT_CONFIG\s*=\s*(\{[\s\S]*?\});/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          if (parsed && parsed.export) {
            const exp = parsed.export;
            const isLandscape = (exp.orientation || exp.pdfOrientation || '').toLowerCase() === 'landscape';
            return {
              pageSize: (exp.pageSize || exp.size || 'A4').trim(),
              landscape: isLandscape
            };
          }
        }
      }
    } catch (err) {
      // ignore
    }
    return { pageSize: 'A4', landscape: false };
  }

  ipcMain.handle('app:print-pdf', async (event, request = {}) => {
    const html = String(request.html || '');
    const tmpFile = path.join(os.tmpdir(), `cmt-pdf-${Date.now()}.html`);
    const pageFile = getRequestingPage(event);
    try {
      const win = new BrowserWindow({
        show: false, webPreferences: {
          preload: path.join(ROOT_DIR, 'electron-preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false
        }
      });

      await fs.writeFile(tmpFile, html, 'utf8');
      await win.loadFile(tmpFile);

      // Ensure document.title reflects the requested title or file name
      const resolvedTitle = (typeof request.title === 'string' && request.title.trim())
        ? request.title.trim()
        : (typeof request.defaultName === 'string' && request.defaultName.trim()
          ? request.defaultName.trim().replace(/\.pdf$/i, '')
          : '');
      const explicitTitle = (typeof request.title === 'string' && request.title.trim())
        ? request.title.trim()
        : '';

      // Wait for layout/images/fonts so printToPDF captures fully rendered pages.
      await win.webContents.executeJavaScript(`
      (async () => {
        const expTitle = ${JSON.stringify(explicitTitle)};
        const fbTitle = ${JSON.stringify(resolvedTitle)};
        if (expTitle) {
          document.title = expTitle;
        } else if (fbTitle && (!document.title || document.title.startsWith('cmt-pdf-'))) {
          document.title = fbTitle;
        }

        const waitMs = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const htmlImgs = Array.from(document.images || []);
        const svgImgs = Array.from(document.querySelectorAll('image') || []);
        const pending = htmlImgs
          .filter(img => !(img && img.complete))
          .concat(svgImgs.filter(img => {
            const src = img.getAttribute('href') || img.getAttribute('xlink:href') || '';
            return src && !src.startsWith('data:');
          }))
          .map(img => new Promise(resolve => {
            const done = () => resolve(true);
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          }));

        const fontsReady = (document.fonts && document.fonts.ready)
          ? document.fonts.ready.catch(() => {})
          : Promise.resolve();

        await Promise.race([
          Promise.all(pending.concat([fontsReady])),
          waitMs(5000)
        ]);
        await waitMs(120);
        return true;
      })();
    `, true);

      const reqOpts = (request.pdfOptions && typeof request.pdfOptions === 'object') ? { ...request.pdfOptions } : {};
      if (reqOpts.margins && typeof reqOpts.margins === 'object') {
        const hasNumericMargins = ['top', 'bottom', 'left', 'right'].some(k => typeof reqOpts.margins[k] === 'number');
        if (!hasNumericMargins) {
          const mt = String(reqOpts.margins.marginType || '').toLowerCase();
          if (mt === 'none') reqOpts.marginsType = 1;
          else if (mt === 'minimum') reqOpts.marginsType = 2;
          else if (mt === 'custom') reqOpts.marginsType = 3;
          else if (mt === 'default') reqOpts.marginsType = 0;
          delete reqOpts.margins;
        }
      }
      const defaultExportOpts = getDefaultPdfExportOptions();
      const pdfOptions = Object.assign(
        { landscape: defaultExportOpts.landscape, pageSize: defaultExportOpts.pageSize, marginsType: 1, preferCSSPageSize: true },
        reqOpts,
        { printBackground: true }
      );
      // Electron 20+ removed marginsType in favor of margins: { top, bottom, left, right } (in inches).
      // When marginsType === 1 ('none') is requested and no explicit numeric margins are set, pass 0-inch margins so @page CSS controls exact margins.
      if (pdfOptions.marginsType === 1 && !pdfOptions.margins) {
        pdfOptions.margins = { top: 0, bottom: 0, left: 0, right: 0 };
      }
      const pdfBuffer = await win.webContents.printToPDF(pdfOptions);

      if (request.previewOnly) {
        try { win.close(); } catch { }
        return { ok: true, base64: pdfBuffer.toString('base64') };
      }

      // Ask user where to save
      const dateStr = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const defaultName = (typeof request.defaultName === 'string' && request.defaultName.trim())
        ? request.defaultName.trim()
        : `results-${dateStr}.pdf`;

      if (typeof request.absolutePath === 'string' && request.absolutePath.trim()) {
        const absolutePath = path.resolve(request.absolutePath.trim());
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, pdfBuffer);
        try { win.close(); } catch { }
        return { ok: true, path: absolutePath, name: path.basename(absolutePath) };
      }

      if (request.target) {
        const savedFile = await writeAllowedFile(pageFile, request.target, {
          filename: typeof request.filename === 'string' && request.filename.trim()
            ? request.filename.trim()
            : defaultName,
          subdir: request.subdir ? String(request.subdir) : null,
          content: pdfBuffer.toString('base64'),
          encoding: 'base64'
        });
        try { win.close(); } catch { }
        return { ok: true, path: savedFile.path, name: savedFile.filename };
      }

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save PDF',
        defaultPath: path.join(app.getPath('downloads'), defaultName),
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      });

      if (canceled || !filePath) {
        try { win.close(); } catch { }
        return { ok: false, canceled: true };
      }

      await fs.writeFile(filePath, pdfBuffer);
      try { win.close(); } catch { }
      return { ok: true, path: filePath };
    } catch (err) {
      console.error('print-pdf failed', err);
      return { ok: false, error: String(err && err.message ? err.message : err) };
    } finally {
      fs.unlink(tmpFile).catch(() => { });
    }
  });

}

module.exports = { registerPrintIpc };
