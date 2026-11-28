// Window Reorder & Arrangement IPC handlers extracted from electron-main.js
'use strict';

function registerWindowsIpc(ctx) {
  const {
    BrowserWindow,
    ipcMain,
    screen,
    fs,
    path,
    getWritableRootDir,
    PAGE_FILES,
    PAGE_LABELS,
    getLoadedPageFile,
    isPresentationWindow,
    getAssociatedPresenterWindow,
    getAssociatedSourceWindow,
    mapWindowBoundsToDisplay,
    _applySafeBounds,
    _teardownLinkedResize,
    createToolWindow
  } = ctx;

  let _notifyTimer = null;

  function _getDisplayIndexMap() {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const map = new Map();
    displays.forEach((d, idx) => {
      map.set(d.id, {
        id: d.id,
        index: idx,
        isPrimary: primary ? d.id === primary.id : idx === 0,
        bounds: d.bounds,
        workArea: d.workArea
      });
    });
    return { displays, map, primary };
  }

  function _getVisualBounds(win) {
    let bounds = { x: 0, y: 0, width: 800, height: 600 };
    try {
      const ob = win.getBounds();
      bounds = { x: ob.x, y: ob.y, width: ob.width, height: ob.height };
      if (process.platform === 'win32' && !win.isMinimized() && typeof win.getContentBounds === 'function') {
        const cb = win.getContentBounds();
        if (cb && cb.width > 0 && cb.height > 0) {
          const rawL = cb.x - ob.x;
          const rawR = (ob.x + ob.width) - (cb.x + cb.width);
          const rawB = (ob.y + ob.height) - (cb.y + cb.height);
          const insetL = (rawL >= 0 && rawL < 50) ? rawL : 0;
          const insetR = (rawR >= 0 && rawR < 50) ? rawR : 0;
          const insetB = (rawB >= 0 && rawB < 50) ? rawB : 0;
          if (insetL > 0 || insetR > 0 || insetB > 0) {
            bounds.x += insetL;
            bounds.width = Math.max(1, bounds.width - insetL - insetR);
            bounds.height = Math.max(1, bounds.height - insetB);
          }
        }
      }
    } catch (_) {}
    return bounds;
  }

  function _buildWindowsSnapshot(senderWin = null) {
    const { displays, map, primary } = _getDisplayIndexMap();
    const allWins = BrowserWindow.getAllWindows().filter((w) => w && !w.isDestroyed());
    const validPages = new Set(Object.values(PAGE_FILES || {}));

    const windows = [];
    for (const win of allWins) {
      let pageFile = 'unknown';
      try {
        pageFile = getLoadedPageFile(win) || 'unknown';
      } catch (_) {}

      const isPres = isPresentationWindow(win);
      if (!isPres && pageFile !== 'unknown' && !validPages.has(pageFile)) {
        continue;
      }

      const bounds = _getVisualBounds(win);

      const matchedDisplay = screen.getDisplayMatching(bounds) || primary;
      const dispMeta = matchedDisplay && map.has(matchedDisplay.id)
        ? map.get(matchedDisplay.id)
        : (displays[0] ? map.get(displays[0].id) : { id: 0, index: 0 });

      const assocSource = isPres ? getAssociatedSourceWindow(win) : null;
      const assocMirror = !isPres ? getAssociatedPresenterWindow(win) : null;

      let title = '';
      try {
        title = win.getTitle() || '';
      } catch (_) {}
      if (!title && pageFile && PAGE_LABELS && PAGE_LABELS[pageFile]) {
        title = PAGE_LABELS[pageFile];
      }

      windows.push({
        id: win.id,
        title: title || pageFile,
        pageFile,
        role: isPres ? 'mirror' : 'main',
        sourceWindowId: assocSource && !assocSource.isDestroyed() ? assocSource.id : null,
        mirrorWindowId: assocMirror && !assocMirror.isDestroyed() ? assocMirror.id : null,
        displayId: dispMeta ? dispMeta.id : 0,
        displayIndex: dispMeta ? dispMeta.index : 0,
        bounds,
        isFocused: typeof win.isFocused === 'function' ? win.isFocused() : false,
        isMinimized: typeof win.isMinimized === 'function' ? win.isMinimized() : false,
        isMaximized: typeof win.isMaximized === 'function' ? win.isMaximized() : false,
        isFullScreen: typeof win.isFullScreen === 'function' ? win.isFullScreen() : false,
        isAlwaysOnTop: typeof win.isAlwaysOnTop === 'function' ? win.isAlwaysOnTop() : false,
        isCurrent: Boolean(senderWin && win === senderWin)
      });
    }

    const displayList = displays.map((d, idx) => ({
      id: d.id,
      index: idx,
      isPrimary: primary ? d.id === primary.id : idx === 0,
      bounds: d.bounds,
      workArea: d.workArea
    }));

    return { ok: true, displays: displayList, windows };
  }

  function notifyWindowsChanged() {
    if (_notifyTimer) clearTimeout(_notifyTimer);
    _notifyTimer = setTimeout(() => {
      _notifyTimer = null;
      try {
        const snapshot = _buildWindowsSnapshot(null);
        for (const win of BrowserWindow.getAllWindows()) {
          if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
            try {
              win.webContents.send('app:windows-changed', snapshot);
            } catch (_) {}
          }
        }
      } catch (_) {}
    }, 60);
  }

  function _prepareWindowForBounds(win) {
    if (!win || win.isDestroyed()) return false;
    if (win.isMinimized()) win.restore();
    if (win.isFullScreen()) win.setFullScreen(false);
    if (win.isMaximized()) win.unmaximize();
    return true;
  }

  function _normalizeRatio(val, fallback = 0.5) {
    const num = Number(val);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    const r = num > 1 ? num / 100 : num;
    return Math.max(0.1, Math.min(0.95, r));
  }

  function _splitSpan(start, total, count, gap) {
    const segs = [];
    if (count <= 0) return segs;
    const totalGap = gap * Math.max(0, count - 1);
    const usable = Math.max(count * 100, total - totalGap);
    const each = Math.floor(usable / count);
    let cursor = start;
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const size = isLast ? (start + total - cursor) : each;
      segs.push({ pos: cursor, size: Math.max(100, size) });
      cursor += size + gap;
    }
    return segs;
  }

  function _computeLayoutRects(count, workArea, layout, options = {}) {
    const rects = [];
    if (count <= 0 || !workArea) return rects;
    const gap = Math.max(0, Math.min(48, Math.round(Number(options.gap) || 0)));
    const x = workArea.x + gap;
    const y = workArea.y + gap;
    const width = Math.max(260, workArea.width - 2 * gap);
    const height = Math.max(200, workArea.height - 2 * gap);

    if (count === 1) {
      rects.push({ x, y, width, height });
      return rects;
    }

    if (layout === 'vertical') {
      const rows = _splitSpan(y, height, count, gap);
      rows.forEach((r) => rects.push({ x, y: r.pos, width, height: r.size }));
      return rects;
    }

    if (layout === 'grid') {
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const colSpans = _splitSpan(x, width, cols, gap);
      const rowSpans = _splitSpan(y, height, rows, gap);
      for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const isLastItem = i === count - 1;
        const stretchLast = isLastItem && count % cols !== 0;
        const cellX = colSpans[c].pos;
        const cellW = stretchLast ? (x + width - cellX) : colSpans[c].size;
        rects.push({
          x: cellX,
          y: rowSpans[r].pos,
          width: cellW,
          height: rowSpans[r].size
        });
      }
      return rects;
    }

    if (layout === 'cascade') {
      const stepX = Math.min(36, Math.floor((width * 0.28) / Math.max(1, count - 1)));
      const stepY = Math.min(32, Math.floor((height * 0.24) / Math.max(1, count - 1)));
      const winW = Math.max(360, Math.round(width * 0.72));
      const winH = Math.max(260, Math.round(height * 0.76));
      for (let i = 0; i < count; i++) {
        rects.push({
          x: Math.min(x + width - winW, x + i * stepX),
          y: Math.min(y + height - winH, y + i * stepY),
          width: winW,
          height: winH
        });
      }
      return rects;
    }

    if (layout === 'main-stack') {
      const firstRatio = _normalizeRatio(options.ratio, 0.65);
      const firstW = Math.max(260, Math.min(width - 260 - gap, Math.round((width - gap) * firstRatio)));
      rects.push({ x, y, width: firstW, height });
      const remX = x + firstW + gap;
      const remW = Math.max(200, width - firstW - gap);
      const rows = _splitSpan(y, height, count - 1, gap);
      rows.forEach((r) => rects.push({ x: remX, y: r.pos, width: remW, height: r.size }));
      return rects;
    }

    const splitRatios = {
      'split-20-80': 0.20,
      'split-25-75': 0.25,
      'split-30-70': 0.30,
      'split-70-30': 0.70,
      'split-75-25': 0.75,
      'split-80-20': 0.80
    };
    if (Object.prototype.hasOwnProperty.call(splitRatios, layout) || layout === 'split-custom') {
      const firstRatio = layout === 'split-custom'
        ? _normalizeRatio(options.ratio, 0.5)
        : splitRatios[layout];
      const remCount = count - 1;
      const usableW = Math.max(460, width - gap * remCount);
      const firstW = Math.max(220, Math.min(usableW - 200 * remCount, Math.round(usableW * firstRatio)));
      rects.push({ x, y, width: firstW, height });
      const remStart = x + firstW + gap;
      const remTotalW = Math.max(200, x + width - remStart);
      const remCols = _splitSpan(remStart, remTotalW, remCount, gap);
      remCols.forEach((c) => rects.push({ x: c.pos, y, width: c.size, height }));
      return rects;
    }

    // Default: 'horizontal' (equal columns)
    const cols = _splitSpan(x, width, count, gap);
    cols.forEach((c) => rects.push({ x: c.pos, y, width: c.size, height }));
    return rects;
  }

  ipcMain.handle('app:open-split', async (_event, request = {}) => {
    const knownPages = new Set(Object.values(PAGE_FILES || {}));
    const pageFile1 = String(request.pageFile1 || '');
    const pageFile2 = String(request.pageFile2 || '');
    if (!pageFile1 || !knownPages.has(pageFile1)) return { ok: false, error: `Unknown page: ${pageFile1}` };
    if (!pageFile2 || !knownPages.has(pageFile2)) return { ok: false, error: `Unknown page: ${pageFile2}` };
    if (typeof createToolWindow !== 'function') return { ok: false, error: 'no-create-tool-window' };

    if (typeof _teardownLinkedResize === 'function') {
      _teardownLinkedResize();
    }

    const win1 = createToolWindow(pageFile1);
    const win2 = createToolWindow(pageFile2);
    await new Promise((resolve) => setImmediate(resolve));

    const displays = screen.getAllDisplays();
    let targetDisplay = null;
    if (request.displayId !== undefined && request.displayId !== null) {
      targetDisplay = displays.find((d) => d.id === Number(request.displayId)) || null;
    }
    if (!targetDisplay) targetDisplay = screen.getPrimaryDisplay();

    const ratio = _normalizeRatio(request.fraction ?? request.ratio, 0.5);
    const gap = Math.max(0, Math.min(48, Math.round(Number(request.gap) || 0)));
    const rects = _computeLayoutRects(2, targetDisplay.workArea, 'split-custom', { ratio, gap });

    if (win1 && !win1.isDestroyed() && _prepareWindowForBounds(win1)) {
      _applySafeBounds(win1, rects[0]);
    }
    if (win2 && !win2.isDestroyed() && _prepareWindowForBounds(win2)) {
      _applySafeBounds(win2, rects[1]);
    }
    if (win2 && !win2.isDestroyed()) {
      try { win2.focus(); } catch (_) {}
    }
    notifyWindowsChanged();
    return { ok: true };
  });

  ipcMain.handle('app:get-windows-state', (event) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    return _buildWindowsSnapshot(senderWin);
  });

  ipcMain.handle('app:reorder-windows', (event, request = {}) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    const orderedIds = Array.isArray(request.orderedIds) ? request.orderedIds : [];
    const layout = String(request.layout || 'horizontal');
    const allWins = BrowserWindow.getAllWindows().filter((w) => w && !w.isDestroyed());
    const byId = new Map(allWins.map((w) => [w.id, w]));

    const targets = orderedIds.map((id) => byId.get(Number(id))).filter(Boolean);
    if (targets.length === 0) {
      return { ok: false, error: 'no-target-windows' };
    }

    if (typeof _teardownLinkedResize === 'function') {
      _teardownLinkedResize();
    }

    const displays = screen.getAllDisplays();
    let targetDisplay = null;
    if (request.displayId !== undefined && request.displayId !== null) {
      targetDisplay = displays.find((d) => d.id === Number(request.displayId)) || null;
    }
    if (!targetDisplay) {
      try {
        targetDisplay = screen.getDisplayMatching(targets[0].getBounds());
      } catch (_) {}
    }
    if (!targetDisplay) {
      targetDisplay = screen.getPrimaryDisplay();
    }

    const rects = _computeLayoutRects(targets.length, targetDisplay.workArea, layout, {
      gap: request.gap,
      ratio: request.ratio
    });
    targets.forEach((win, idx) => {
      if (!_prepareWindowForBounds(win)) return;
      _applySafeBounds(win, rects[idx]);
    });

    // Keep sender focused if it is among targets or main windows so the teacher can continue
    if (senderWin && !senderWin.isDestroyed()) {
      try { senderWin.focus(); } catch (_) {}
    }

    notifyWindowsChanged();
    return { ok: true, count: targets.length };
  });

  ipcMain.handle('app:apply-window-preset', async (event, request = {}) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    const slots = Array.isArray(request.slots) ? request.slots : [];
    const openMissing = Boolean(request.openMissing);
    if (slots.length === 0) return { ok: false, error: 'empty-preset' };

    if (typeof _teardownLinkedResize === 'function') {
      _teardownLinkedResize();
    }

    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const allWins = BrowserWindow.getAllWindows().filter((w) => w && !w.isDestroyed());
    const usedIds = new Set();
    let applied = 0;

    for (const slot of slots) {
      if (!slot || !slot.pageFile) continue;
      const desiredRole = slot.role === 'mirror' ? 'mirror' : 'main';

      let win = allWins.find((w) => {
        if (usedIds.has(w.id) || w.isDestroyed()) return false;
        const pf = getLoadedPageFile(w);
        const role = isPresentationWindow(w) ? 'mirror' : 'main';
        return pf === slot.pageFile && role === desiredRole;
      });

      if (!win && openMissing && desiredRole === 'main' && typeof createToolWindow === 'function') {
        const validPages = new Set(Object.values(PAGE_FILES || {}));
        if (validPages.has(slot.pageFile)) {
          win = createToolWindow(slot.pageFile);
          await new Promise((resolve) => setImmediate(resolve));
        }
      }

      if (!win || win.isDestroyed()) continue;
      usedIds.add(win.id);

      const dispIdx = typeof slot.displayIndex === 'number' ? slot.displayIndex : 0;
      const targetDisplay = displays[dispIdx] || primary;
      const wa = targetDisplay.workArea;

      _prepareWindowForBounds(win);

      let rect = null;
      const snap = String(slot.snap || '');
      const unit = slot.unit === '%' ? '%' : 'px';

      if (snap === 'full') {
        _applySafeBounds(win, { x: wa.x, y: wa.y, width: wa.width, height: wa.height });
        win.maximize();
      } else if (snap === 'left' || snap === 'right' || snap === 'top' || snap === 'bottom' || snap === 'center') {
        const isHoriz = snap === 'left' || snap === 'right';
        const defW = isHoriz ? (unit === '%' ? 50 : Math.floor(wa.width / 2)) : (snap === 'center' ? (unit === '%' ? 75 : Math.round(wa.width * 0.75)) : (unit === '%' ? 100 : wa.width));
        const defH = !isHoriz && snap !== 'center' ? (unit === '%' ? 50 : Math.floor(wa.height / 2)) : (snap === 'center' ? (unit === '%' ? 85 : Math.round(wa.height * 0.85)) : (unit === '%' ? 100 : wa.height));
        const rawW = slot.bounds && typeof slot.bounds.width === 'number' ? slot.bounds.width : defW;
        const rawH = slot.bounds && typeof slot.bounds.height === 'number' ? slot.bounds.height : defH;
        const w = unit === '%'
          ? Math.max(260, Math.min(wa.width, Math.round(wa.width * (rawW / 100))))
          : Math.max(260, Math.min(wa.width, Math.round(rawW)));
        const h = unit === '%'
          ? Math.max(200, Math.min(wa.height, Math.round(wa.height * (rawH / 100))))
          : Math.max(200, Math.min(wa.height, Math.round(rawH)));
        let x = wa.x;
        let y = wa.y;
        if (snap === 'right') x = wa.x + wa.width - w;
        else if (snap === 'bottom') y = wa.y + wa.height - h;
        else if (snap === 'center') {
          x = wa.x + Math.round((wa.width - w) / 2);
          y = wa.y + Math.round((wa.height - h) / 2);
        }
        rect = { x, y, width: w, height: h };
        _applySafeBounds(win, rect);
      } else if (unit === '%' && slot.bounds) {
        const w = Math.max(260, Math.min(wa.width, Math.round(wa.width * ((Number(slot.bounds.width) || 50) / 100))));
        const h = Math.max(200, Math.min(wa.height, Math.round(wa.height * ((Number(slot.bounds.height) || 100) / 100))));
        const x = Math.max(wa.x, Math.min(wa.x + wa.width - w, wa.x + Math.round(wa.width * ((Number(slot.bounds.x) || 0) / 100))));
        const y = Math.max(wa.y, Math.min(wa.y + wa.height - h, wa.y + Math.round(wa.height * ((Number(slot.bounds.y) || 0) / 100))));
        rect = { x, y, width: w, height: h };
        _applySafeBounds(win, rect);
      } else if (slot.bounds && (snap === 'custom' || !slot.relBounds)) {
        const w = Math.max(260, Math.min(wa.width, Math.round(slot.bounds.width || 800)));
        const h = Math.max(200, Math.min(wa.height, Math.round(slot.bounds.height || 600)));
        const x = Math.max(wa.x, Math.min(wa.x + wa.width - w, Math.round(slot.bounds.x ?? wa.x)));
        const y = Math.max(wa.y, Math.min(wa.y + wa.height - h, Math.round(slot.bounds.y ?? wa.y)));
        rect = { x, y, width: w, height: h };
        _applySafeBounds(win, rect);
      } else if (slot.relBounds && typeof slot.relBounds.rw === 'number' && typeof slot.relBounds.rh === 'number') {
        const w = Math.max(260, Math.min(wa.width, Math.round(wa.width * slot.relBounds.rw)));
        const h = Math.max(200, Math.min(wa.height, Math.round(wa.height * slot.relBounds.rh)));
        const x = Math.max(wa.x, Math.min(wa.x + wa.width - w, wa.x + Math.round(wa.width * (slot.relBounds.rx || 0))));
        const y = Math.max(wa.y, Math.min(wa.y + wa.height - h, wa.y + Math.round(wa.height * (slot.relBounds.ry || 0))));
        rect = { x, y, width: w, height: h };
        _applySafeBounds(win, rect);
      }

      if (slot.isMaximized && snap !== 'full') {
        win.maximize();
      }
      if (typeof slot.isAlwaysOnTop === 'boolean') {
        win.setAlwaysOnTop(slot.isAlwaysOnTop, 'floating');
      }
      applied++;
    }

    if (senderWin && !senderWin.isDestroyed()) {
      try { senderWin.focus(); } catch (_) {}
    }

    notifyWindowsChanged();
    return { ok: true, applied };
  });

  ipcMain.handle('app:window-action', (event, request = {}) => {
    const action = String(request.action || '');
    const allWins = BrowserWindow.getAllWindows().filter((w) => w && !w.isDestroyed());
    const win = allWins.find((w) => w.id === Number(request.windowId));

    if (action === 'minimize-others') {
      const senderWin = BrowserWindow.fromWebContents(event.sender);
      const keepId = Number(request.windowId) || (senderWin && !senderWin.isDestroyed() ? senderWin.id : -1);
      allWins.forEach((w) => {
        if (w.id !== keepId && !w.isMinimized()) w.minimize();
      });
      notifyWindowsChanged();
      return { ok: true };
    }

    if (action === 'unpin-all') {
      allWins.forEach((w) => {
        if (w.isAlwaysOnTop()) w.setAlwaysOnTop(false);
      });
      notifyWindowsChanged();
      return { ok: true };
    }

    if (action === 'swap-pair') {
      const winA = allWins.find((w) => w.id === Number(request.windowId));
      const winB = allWins.find((w) => w.id === Number(request.pairWindowId));
      if (!winA || !winB || winA.isDestroyed() || winB.isDestroyed()) {
        return { ok: false, error: 'pair-not-found' };
      }
      if (typeof _teardownLinkedResize === 'function') _teardownLinkedResize();
      const boundsA = winA.getBounds();
      const boundsB = winB.getBounds();
      const maxA = winA.isMaximized();
      const maxB = winB.isMaximized();
      const dispA = screen.getDisplayMatching(boundsA) || screen.getPrimaryDisplay();
      const dispB = screen.getDisplayMatching(boundsB) || screen.getPrimaryDisplay();

      _prepareWindowForBounds(winA);
      _prepareWindowForBounds(winB);

      if (dispA.id === dispB.id) {
        winA.setBounds(boundsB);
        winB.setBounds(boundsA);
      } else {
        const mappedA = mapWindowBoundsToDisplay(boundsA, dispA, dispB) || dispB.workArea;
        const mappedB = mapWindowBoundsToDisplay(boundsB, dispB, dispA) || dispA.workArea;
        winA.setBounds(mappedA);
        winB.setBounds(mappedB);
      }
      if (maxB) winA.maximize();
      if (maxA) winB.maximize();
      notifyWindowsChanged();
      return { ok: true };
    }

    if (!win || win.isDestroyed()) {
      return { ok: false, error: 'window-not-found' };
    }

    switch (action) {
      case 'focus':
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        break;
      case 'minimize':
        win.minimize();
        break;
      case 'maximize':
        if (win.isFullScreen()) win.setFullScreen(false);
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
        break;
      case 'snap-left':
      case 'snap-right':
      case 'snap-top':
      case 'snap-bottom':
      case 'center': {
        if (typeof _teardownLinkedResize === 'function') _teardownLinkedResize();
        const curBounds = win.getBounds();
        const disp = screen.getDisplayMatching(curBounds) || screen.getPrimaryDisplay();
        const wa = disp.workArea;
        _prepareWindowForBounds(win);
        if (action === 'center') {
          const wr = _normalizeRatio(request.wRatio || request.ratio, 0.75);
          const hr = _normalizeRatio(request.hRatio, 0.85);
          const cw = Math.max(320, Math.min(wa.width, Math.round(wa.width * wr)));
          const ch = Math.max(240, Math.min(wa.height, Math.round(wa.height * hr)));
          _applySafeBounds(win, {
            x: wa.x + Math.round((wa.width - cw) / 2),
            y: wa.y + Math.round((wa.height - ch) / 2),
            width: cw,
            height: ch
          });
        } else if (action === 'snap-left' || action === 'snap-right') {
          const r = _normalizeRatio(request.ratio, 0.5);
          const w = Math.max(260, Math.min(wa.width, Math.round(wa.width * r)));
          _applySafeBounds(win, action === 'snap-left'
            ? { x: wa.x, y: wa.y, width: w, height: wa.height }
            : { x: wa.x + wa.width - w, y: wa.y, width: w, height: wa.height });
        } else {
          const r = _normalizeRatio(request.ratio, 0.5);
          const h = Math.max(200, Math.min(wa.height, Math.round(wa.height * r)));
          _applySafeBounds(win, action === 'snap-top'
            ? { x: wa.x, y: wa.y, width: wa.width, height: h }
            : { x: wa.x, y: wa.y + wa.height - h, width: wa.width, height: h });
        }
        break;
      }
      case 'toggle-pin': {
        const nextTop = !win.isAlwaysOnTop();
        win.setAlwaysOnTop(nextTop, 'floating');
        notifyWindowsChanged();
        return { ok: true, alwaysOnTop: win.isAlwaysOnTop() };
      }
      case 'move-to-display': {
        const displays = screen.getAllDisplays();
        const targetDisplay = displays.find((d) => d.id === Number(request.targetDisplayId));
        if (!targetDisplay) return { ok: false, error: 'display-not-found' };
        const wasMax = win.isMaximized();
        const curBounds = win.getBounds();
        const curDisplay = screen.getDisplayMatching(curBounds) || screen.getPrimaryDisplay();
        _prepareWindowForBounds(win);
        const mapped = mapWindowBoundsToDisplay(curBounds, curDisplay, targetDisplay) || targetDisplay.workArea;
        win.setBounds(mapped);
        if (wasMax) win.maximize();
        break;
      }
      case 'close':
        win.close();
        break;
      default:
        return { ok: false, error: 'unknown-action' };
    }

    notifyWindowsChanged();
    return { ok: true };
  });

  function _getPresetsPath() {
    const root = typeof getWritableRootDir === 'function' ? getWritableRootDir() : '';
    return root ? path.join(root, 'user', 'window-presets.json') : null;
  }

  ipcMain.handle('app:get-window-presets', async () => {
    try {
      const filePath = _getPresetsPath();
      if (!filePath || !fs) return { ok: false, presets: [] };
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return { ok: true, presets: Array.isArray(parsed && parsed.presets) ? parsed.presets : [] };
    } catch (err) {
      if (err && err.code === 'ENOENT') return { ok: true, presets: [] };
      return { ok: false, presets: [], error: String(err) };
    }
  });

  ipcMain.handle('app:save-window-presets', async (_event, request = {}) => {
    try {
      const filePath = _getPresetsPath();
      if (!filePath || !fs) return { ok: false, error: 'no-presets-path' };
      const presets = Array.isArray(request.presets) ? request.presets : [];
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify({ version: 1, presets }, null, 2), 'utf8');
      return { ok: true, count: presets.length };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  return { notifyWindowsChanged };
}

module.exports = { registerWindowsIpc };
