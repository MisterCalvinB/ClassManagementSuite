// Live Audit Console & Verbose Diagnostic Logging IPC module
'use strict';

function registerAuditIpc(ctx) {
  const {
    app,
    BrowserWindow,
    ipcMain,
    path,
    fsSync,
    ROOT_DIR,
    PAGE_FILES,
    getLoadedPageFile,
    getWritableRootDir,
    setupWindowExternalLinkHandling,
    getClassroomServerStatus
  } = ctx;

  const RING_BUFFER_MAX = 5000;
  const BATCH_FLUSH_MS = 60;
  const MAX_PAYLOAD_CHARS = 8192;
  const PERF_SAMPLE_MS = 1000;
  const MAX_PERF_HISTORY = 60;
  const MAX_SPIKES = 200;

  const _ringBuffer = [];
  let _nextId = 1;
  let _nextSpikeId = 1;
  let _auditWin = null;
  let _auditEnabled = false;
  let _startOnLaunch = false;
  let _pendingBatch = [];
  let _flushTimer = null;
  let _consoleHooked = false;
  let _ipcInstrumented = false;

  let _perfTimer = null;
  let _lastTickTarget = 0;
  let _lastCpuPct = 0;
  let _lastWorkingSetMB = 0;
  let _lastRssMB = 0;
  let _lastSpikeTs = { cpu: 0, memory: 0, 'event-loop': 0 };
  const _perfHistory = [];
  const _spikes = [];
  const _peaks = {
    cpuPct: 0,
    cpuTs: 0,
    cpuProcess: '',
    heapUsedMB: 0,
    heapTs: 0,
    rssMB: 0,
    rssTs: 0,
    workingSetMB: 0,
    workingSetTs: 0,
    workingSetProcess: '',
    eventLoopLagMs: 0,
    lagTs: 0
  };
  let _currentPerf = {
    cpuPct: 0,
    heapUsedMB: 0,
    rssMB: 0,
    workingSetMB: 0,
    eventLoopLagMs: 0,
    topProcess: 'main'
  };

  const _origConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };

  function _getAuditConfigPath() {
    try {
      const rootDir = typeof getWritableRootDir === 'function' ? getWritableRootDir() : ROOT_DIR;
      return path.join(rootDir, 'user', 'audit-config.json');
    } catch (_) {
      return path.join(ROOT_DIR, 'user', 'audit-config.json');
    }
  }

  function _loadAuditConfig() {
    try {
      const cfgPath = _getAuditConfigPath();
      if (fsSync && fsSync.existsSync(cfgPath)) {
        const raw = fsSync.readFileSync(cfgPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.startOnLaunch === 'boolean') {
          _startOnLaunch = parsed.startOnLaunch;
          if (_startOnLaunch) _auditEnabled = true;
        }
      }
    } catch (_) {}
  }

  function _saveAuditConfig() {
    try {
      const cfgPath = _getAuditConfigPath();
      const dir = path.dirname(cfgPath);
      if (fsSync && !fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
      }
      if (fsSync) {
        fsSync.writeFileSync(cfgPath, JSON.stringify({ startOnLaunch: _startOnLaunch }, null, 2), 'utf8');
      }
    } catch (_) {}
  }

  function _safeSerialize(val) {
    if (val === undefined) return undefined;
    if (val === null || typeof val === 'boolean' || typeof val === 'number') return val;
    if (typeof val === 'string') {
      return val.length > MAX_PAYLOAD_CHARS ? val.slice(0, MAX_PAYLOAD_CHARS) + '... [truncated]' : val;
    }
    if (val instanceof Error) {
      return { name: val.name, message: val.message, stack: val.stack };
    }
    try {
      const seen = new WeakSet();
      const str = JSON.stringify(val, (_k, v) => {
        if (typeof v === 'bigint') return v.toString();
        if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack };
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[Circular]';
          seen.add(v);
        }
        return v;
      }, 2);
      if (!str) return undefined;
      if (str.length > MAX_PAYLOAD_CHARS) {
        return str.slice(0, MAX_PAYLOAD_CHARS) + '\n... [truncated]';
      }
      return JSON.parse(str);
    } catch (_) {
      try {
        return String(val).slice(0, MAX_PAYLOAD_CHARS);
      } catch (__) {
        return '[Unserializable]';
      }
    }
  }

  function _formatArgs(args) {
    const parts = [];
    let payload = null;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (typeof a === 'string') {
        parts.push(a);
      } else if (a instanceof Error) {
        parts.push(a.message || String(a));
        if (!payload) payload = _safeSerialize(a);
      } else if (typeof a === 'object' && a !== null) {
        try {
          const s = JSON.stringify(a);
          parts.push(s && s.length <= 140 ? s : '[Object]');
        } catch (_) {
          parts.push('[Object]');
        }
        if (payload === null) payload = _safeSerialize(a);
      } else {
        parts.push(String(a));
      }
    }
    return {
      message: parts.join(' '),
      payload
    };
  }

  function _flushBatch() {
    _flushTimer = null;
    if (_pendingBatch.length === 0) return;
    const batch = _pendingBatch.splice(0, _pendingBatch.length);
    if (_auditWin && !_auditWin.isDestroyed() && _auditWin.webContents && !_auditWin.webContents.isDestroyed()) {
      try {
        _auditWin.webContents.send('audit:log-batch', batch);
      } catch (_) {}
    }
  }

  function auditLog(entry) {
    if (!entry || typeof entry !== 'object') return;
    const item = {
      id: _nextId++,
      ts: typeof entry.ts === 'number' ? entry.ts : Date.now(),
      level: String(entry.level || 'log'),
      source: String(entry.source || 'main'),
      message: String(entry.message || ''),
      payload: entry.payload !== undefined ? _safeSerialize(entry.payload) : undefined,
      durationMs: typeof entry.durationMs === 'number' ? entry.durationMs : undefined
    };

    _ringBuffer.push(item);
    if (_ringBuffer.length > RING_BUFFER_MAX) {
      _ringBuffer.splice(0, _ringBuffer.length - RING_BUFFER_MAX);
    }

    if (_auditWin && !_auditWin.isDestroyed()) {
      _pendingBatch.push(item);
      if (!_flushTimer) {
        _flushTimer = setTimeout(_flushBatch, BATCH_FLUSH_MS);
      }
    }
  }

  function isAuditActive() {
    return _auditEnabled || !!(_auditWin && !_auditWin.isDestroyed());
  }

  function _broadcastModeChanged() {
    const active = isAuditActive();
    if (active) _startPerfSampler();
    else _stopPerfSampler();
    for (const win of BrowserWindow.getAllWindows()) {
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        try {
          win.webContents.send('audit:mode-changed', { enabled: active, startOnLaunch: _startOnLaunch });
        } catch (_) {}
      }
    }
  }

  function _getPidLabelMap() {
    const map = new Map();
    try {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) continue;
        const pid = typeof win.webContents.getOSProcessId === 'function' ? win.webContents.getOSProcessId() : null;
        if (pid) {
          map.set(pid, getLoadedPageFile(win) || `win#${win.id}`);
        }
      }
    } catch (_) {}
    return map;
  }

  function _collectCorrelatedEvents(nowTs, lookbackMs = 2500) {
    const cutoff = nowTs - lookbackMs;
    const recent = [];
    for (let i = _ringBuffer.length - 1; i >= 0 && recent.length < 12; i--) {
      const item = _ringBuffer[i];
      if (!item || item.ts < cutoff) break;
      if (item.level === 'perf') continue;
      recent.push({
        id: item.id,
        ts: item.ts,
        level: item.level,
        source: item.source,
        message: item.message,
        durationMs: item.durationMs
      });
    }
    return recent.reverse();
  }

  function _buildRemedyHint(kind, metrics, correlated) {
    const counts = Object.create(null);
    let slowItem = null;
    let hasAiEvent = false;
    for (let i = 0; i < correlated.length; i++) {
      const ev = correlated[i];
      const key = `${ev.source}:${ev.level}`;
      counts[key] = (counts[key] || 0) + 1;
      if (ev.level === 'ai' || /\[(SlmWorker|SLM|Whisper|SpeechTranscriber|AI)\]/i.test(ev.message || '')) {
        hasAiEvent = true;
      }
      if (typeof ev.durationMs === 'number' && (!slowItem || ev.durationMs > slowItem.durationMs)) {
        slowItem = ev;
      }
    }
    if (hasAiEvent && (kind === 'cpu' || kind === 'memory' || kind === 'event-loop')) {
      return `AI model activity (SLM/Whisper) detected during ${kind} spike (${metrics.cpuPct}% CPU, ${metrics.workingSetMB} MB RAM). Consider switching to a lighter model tier or unloading idle AI workers.`;
    }
    if (kind === 'slow-ipc' && slowItem) {
      return `Slow IPC (${slowItem.durationMs}ms) from ${slowItem.source}: consider offloading heavy disk/CPU work to a worker thread or chunking the payload.`;
    }
    if (kind === 'event-loop') {
      return slowItem
        ? `Main thread blocked (~${metrics.eventLoopLagMs}ms) near "${slowItem.message}". Avoid synchronous disk/JSON/compression calls on the Main process.`
        : `Main event loop lagged by ${metrics.eventLoopLagMs}ms. Check for synchronous Main-process loops or large JSON parsing.`;
    }
    if (kind === 'memory') {
      return `Memory jumped in ${metrics.topProcess || 'process'} (${metrics.workingSetMB} MB total). Check for unclosed listeners, large cached arrays, or unthrottled DOM nodes.`;
    }
    if (correlated.length >= 8) {
      let topKey = '';
      let topCnt = 0;
      for (const k of Object.keys(counts)) {
        if (counts[k] > topCnt) { topCnt = counts[k]; topKey = k; }
      }
      return `High event burst (${correlated.length} events in 2.5s, mostly ${topKey}). Consider debouncing or rAF-throttling triggers.`;
    }
    return `CPU peaked at ${metrics.cpuPct}% in ${metrics.topProcess || 'app'}. Inspect active animations, intervals, or heavy rendering in that window.`;
  }

  function _recordSpike(kind, severity, summary, metrics, explicitCorrelated) {
    const nowTs = Date.now();
    if (kind !== 'slow-ipc' && _lastSpikeTs[kind] && (nowTs - _lastSpikeTs[kind] < 3000)) {
      return;
    }
    if (kind !== 'slow-ipc') _lastSpikeTs[kind] = nowTs;

    const correlated = explicitCorrelated || _collectCorrelatedEvents(nowTs, 2500);
    const remedyHint = _buildRemedyHint(kind, metrics, correlated);
    const spike = {
      id: _nextSpikeId++,
      ts: nowTs,
      kind,
      severity,
      summary,
      metrics,
      correlatedEvents: correlated,
      remedyHint
    };
    _spikes.push(spike);
    if (_spikes.length > MAX_SPIKES) {
      _spikes.splice(0, _spikes.length - MAX_SPIKES);
    }

    auditLog({
      ts: nowTs,
      level: 'perf',
      source: metrics.topProcess || 'main',
      message: `${summary} — ${remedyHint}`,
      payload: { metrics, correlatedCount: correlated.length, spikeId: spike.id }
    });

    if (_auditWin && !_auditWin.isDestroyed() && _auditWin.webContents && !_auditWin.webContents.isDestroyed()) {
      try {
        _auditWin.webContents.send('audit:spike', spike);
      } catch (_) {}
    }
  }

  function _samplePerf() {
    if (!isAuditActive()) return;
    const nowTs = Date.now();
    const lagMs = _lastTickTarget ? Math.max(0, nowTs - _lastTickTarget) : 0;
    _lastTickTarget = nowTs + PERF_SAMPLE_MS;

    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / (1024 * 1024));
    const rssMB = Math.round(mem.rss / (1024 * 1024));

    let totalCpu = 0;
    let totalWorkingSetKB = 0;
    let topProcName = 'main';
    let topProcScore = -1;

    try {
      const pidMap = _getPidLabelMap();
      const metricsList = typeof app.getAppMetrics === 'function' ? app.getAppMetrics() : [];
      for (let i = 0; i < metricsList.length; i++) {
        const m = metricsList[i];
        const cpu = m && m.cpu && typeof m.cpu.percentCPUUsage === 'number' ? m.cpu.percentCPUUsage : 0;
        const wsKB = m && m.memory && typeof m.memory.workingSetSize === 'number' ? m.memory.workingSetSize : 0;
        totalCpu += cpu;
        totalWorkingSetKB += wsKB;

        const label = pidMap.get(m.pid) || (m.type === 'Browser' ? 'main' : (m.type || `pid:${m.pid}`));
        const score = cpu * 4 + (wsKB / 10240);
        if (score > topProcScore) {
          topProcScore = score;
          topProcName = label;
        }
      }
    } catch (_) {}

    const cpuPct = Math.round(totalCpu * 10) / 10;
    const workingSetMB = Math.round(totalWorkingSetKB / 1024);

    _currentPerf = {
      ts: nowTs,
      cpuPct,
      heapUsedMB,
      rssMB,
      workingSetMB,
      eventLoopLagMs: lagMs,
      topProcess: topProcName
    };

    _perfHistory.push(_currentPerf);
    if (_perfHistory.length > MAX_PERF_HISTORY) {
      _perfHistory.splice(0, _perfHistory.length - MAX_PERF_HISTORY);
    }

    if (cpuPct > _peaks.cpuPct) {
      _peaks.cpuPct = cpuPct;
      _peaks.cpuTs = nowTs;
      _peaks.cpuProcess = topProcName;
    }
    if (heapUsedMB > _peaks.heapUsedMB) {
      _peaks.heapUsedMB = heapUsedMB;
      _peaks.heapTs = nowTs;
    }
    if (rssMB > _peaks.rssMB) {
      _peaks.rssMB = rssMB;
      _peaks.rssTs = nowTs;
    }
    if (workingSetMB > _peaks.workingSetMB) {
      _peaks.workingSetMB = workingSetMB;
      _peaks.workingSetTs = nowTs;
      _peaks.workingSetProcess = topProcName;
    }
    if (lagMs > _peaks.eventLoopLagMs) {
      _peaks.eventLoopLagMs = lagMs;
      _peaks.lagTs = nowTs;
    }

    // Spike checks (skip very first baseline sample)
    if (_perfHistory.length > 1) {
      if (cpuPct >= 45 || (cpuPct - _lastCpuPct) >= 30) {
        _recordSpike(
          'cpu',
          cpuPct >= 75 ? 'error' : 'warn',
          `CPU spike: ${cpuPct}% (${topProcName})`,
          _currentPerf
        );
      }
      if ((workingSetMB - _lastWorkingSetMB) >= 40 || (rssMB - _lastRssMB) >= 35) {
        const deltaWS = workingSetMB - _lastWorkingSetMB;
        _recordSpike(
          'memory',
          deltaWS >= 80 ? 'error' : 'warn',
          `Memory jump: +${Math.max(deltaWS, rssMB - _lastRssMB)} MB (Total ${workingSetMB} MB)`,
          _currentPerf
        );
      }
      if (lagMs >= 120) {
        _recordSpike(
          'event-loop',
          lagMs >= 300 ? 'error' : 'warn',
          `Main event loop lag: ${lagMs}ms`,
          _currentPerf
        );
      }
    }

    _lastCpuPct = cpuPct;
    _lastWorkingSetMB = workingSetMB;
    _lastRssMB = rssMB;
  }

  function _startPerfSampler() {
    if (_perfTimer) return;
    _lastTickTarget = Date.now() + PERF_SAMPLE_MS;
    _samplePerf();
    _perfTimer = setInterval(_samplePerf, PERF_SAMPLE_MS);
  }

  function _stopPerfSampler() {
    if (_perfTimer) {
      clearInterval(_perfTimer);
      _perfTimer = null;
    }
    _lastTickTarget = 0;
  }

  function _getPerfSnapshot() {
    return {
      current: _currentPerf,
      peaks: Object.assign({}, _peaks),
      history: _perfHistory.slice(),
      spikes: _spikes.slice()
    };
  }

  function _hookMainConsole() {
    if (_consoleHooked) return;
    _consoleHooked = true;
    ['log', 'info', 'warn', 'error'].forEach((lvl) => {
      console[lvl] = (...args) => {
        _origConsole[lvl](...args);
        try {
          const { message, payload } = _formatArgs(args);
          auditLog({
            level: lvl,
            source: 'main',
            message,
            payload
          });
        } catch (_) {}
      };
    });
  }

  function instrumentIpcMain(targetIpcMain) {
    if (_ipcInstrumented || !targetIpcMain) return;
    _ipcInstrumented = true;

    const origHandle = targetIpcMain.handle.bind(targetIpcMain);
    targetIpcMain.handle = (channel, listener) => {
      if (typeof channel === 'string' && channel.startsWith('audit:')) {
        return origHandle(channel, listener);
      }
      return origHandle(channel, async (event, ...args) => {
        if (!isAuditActive()) {
          return listener(event, ...args);
        }
        const t0 = Date.now();
        let sourceWin = 'unknown';
        try {
          const win = BrowserWindow.fromWebContents(event.sender);
          if (win && !win.isDestroyed()) {
            sourceWin = getLoadedPageFile(win) || `win#${win.id}`;
          }
        } catch (_) {}
        try {
          const res = await listener(event, ...args);
          const dt = Date.now() - t0;
          const isIo = /^app:(save-|read-|delete-|list-|copy-|move-|rename-|create-dir|run-sync|run-backup)/.test(channel);
          const isAi = /^(slm|whisper):/.test(channel);
          const lvl = isAi ? 'ai' : (isIo ? 'io' : 'ipc');
          auditLog({
            level: lvl,
            source: sourceWin,
            message: `${lvl === 'ipc' ? 'invoke' : lvl} ${channel} (${dt}ms)`,
            durationMs: dt,
            payload: args.length ? { args: args.length === 1 ? args[0] : args, result: res } : { result: res }
          });
          if (dt >= 250) {
            _recordSpike(
              'slow-ipc',
              dt >= 750 ? 'error' : 'warn',
              `Slow IPC: ${channel} took ${dt}ms (${sourceWin})`,
              Object.assign({}, _currentPerf, { topProcess: sourceWin }),
              [{
                id: _nextId - 1,
                ts: Date.now(),
                level: lvl,
                source: sourceWin,
                message: `${lvl === 'ipc' ? 'invoke' : lvl} ${channel} (${dt}ms)`,
                durationMs: dt
              }]
            );
          }
          return res;
        } catch (err) {
          const dt = Date.now() - t0;
          auditLog({
            level: 'error',
            source: sourceWin,
            message: `invoke ${channel} FAILED (${dt}ms): ${err && err.message ? err.message : String(err)}`,
            durationMs: dt,
            payload: { args, error: err }
          });
          throw err;
        }
      });
    };

    const origOn = targetIpcMain.on.bind(targetIpcMain);
    targetIpcMain.on = (channel, listener) => {
      if (typeof channel === 'string' && channel.startsWith('audit:')) {
        return origOn(channel, listener);
      }
      return origOn(channel, (event, ...args) => {
        if (isAuditActive()) {
          let sourceWin = 'unknown';
          try {
            const win = BrowserWindow.fromWebContents(event.sender);
            if (win && !win.isDestroyed()) {
              sourceWin = getLoadedPageFile(win) || `win#${win.id}`;
            }
          } catch (_) {}
          auditLog({
            level: 'ipc',
            source: sourceWin,
            message: `send ${channel}`,
            payload: args.length ? (args.length === 1 ? args[0] : args) : undefined
          });
        }
        return listener(event, ...args);
      });
    };
  }

  function attachWindowAudit(win) {
    if (!win || win.isDestroyed() || win.__auditAttached) return;
    win.__auditAttached = true;

    const getLabel = () => {
      try {
        if (win.isDestroyed()) return 'destroyed';
        return getLoadedPageFile(win) || `win#${win.id}`;
      } catch (_) {
        return `win#${win.id}`;
      }
    };

    if (isAuditActive()) {
      auditLog({ level: 'info', source: 'main', message: `Window created (id=${win.id})` });
    }

    win.on('ready-to-show', () => {
      if (isAuditActive()) {
        auditLog({ level: 'info', source: getLabel(), message: `Window ready-to-show (id=${win.id})` });
      }
    });

    win.on('closed', () => {
      if (isAuditActive()) {
        auditLog({ level: 'info', source: 'main', message: `Window closed (id=${win.id})` });
      }
    });

    win.on('unresponsive', () => {
      auditLog({ level: 'warn', source: getLabel(), message: `Window became unresponsive (id=${win.id})` });
    });

    win.on('responsive', () => {
      auditLog({ level: 'info', source: getLabel(), message: `Window became responsive again (id=${win.id})` });
    });

    if (win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.on('did-finish-load', () => {
        const label = getLabel();
        if (isAuditActive()) {
          auditLog({ level: 'info', source: label, message: `Loaded page: ${label}` });
          try {
            win.webContents.send('audit:mode-changed', { enabled: true, startOnLaunch: _startOnLaunch });
          } catch (_) {}
        }
      });

      win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        auditLog({
          level: 'error',
          source: getLabel(),
          message: `did-fail-load (${errorCode}): ${errorDescription}`,
          payload: { url: validatedURL }
        });
      });

      win.webContents.on('render-process-gone', (_event, details) => {
        auditLog({
          level: 'error',
          source: getLabel(),
          message: `Render process gone: ${details && details.reason ? details.reason : 'unknown'}`,
          payload: details
        });
      });
    }
  }

  function getAuditStats() {
    const wins = BrowserWindow.getAllWindows().filter((w) => w && !w.isDestroyed());
    const mem = process.memoryUsage();
    let serverStatus = { running: false, port: null };
    if (typeof getClassroomServerStatus === 'function') {
      try {
        serverStatus = getClassroomServerStatus() || serverStatus;
      } catch (_) {}
    }
    return {
      enabled: isAuditActive(),
      startOnLaunch: _startOnLaunch,
      windowCount: wins.length,
      windows: wins.map((w) => ({
        id: w.id,
        pageFile: getLoadedPageFile(w) || 'unknown',
        title: w.getTitle() || ''
      })),
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / (1024 * 1024)),
        heapTotalMB: Math.round(mem.heapTotal / (1024 * 1024)),
        rssMB: Math.round(mem.rss / (1024 * 1024))
      },
      server: serverStatus,
      bufferSize: _ringBuffer.length,
      perf: _getPerfSnapshot()
    };
  }

  function openAuditConsole() {
    if (_auditWin && !_auditWin.isDestroyed()) {
      if (_auditWin.isMinimized()) _auditWin.restore();
      _auditWin.focus();
      return { ok: true, windowId: _auditWin.id };
    }

    const win = new BrowserWindow({
      width: 1140,
      height: 760,
      minWidth: 780,
      minHeight: 500,
      title: 'Audit Console',
      autoHideMenuBar: true,
      backgroundColor: '#f5f5f0',
      webPreferences: {
        preload: path.join(ROOT_DIR, 'electron-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false
      }
    });

    _auditWin = win;
    _auditWin.__isAuditConsole = true;

    if (typeof setupWindowExternalLinkHandling === 'function') {
      setupWindowExternalLinkHandling(win);
    }

    const pagePath = path.join(ROOT_DIR, 'pages', PAGE_FILES.auditConsole || 'audit-console.html');
    win.loadFile(pagePath).catch((err) => {
      _origConsole.error('Failed to load audit-console.html:', err);
    });

    _broadcastModeChanged();
    auditLog({ level: 'info', source: 'main', message: 'Audit Console opened (verbose logging active).' });

    win.on('closed', () => {
      if (_auditWin === win) {
        _auditWin = null;
      }
      _auditEnabled = _startOnLaunch;
      _broadcastModeChanged();
    });

    return { ok: true, windowId: win.id };
  }

  // Initialize config & main console hook immediately
  _loadAuditConfig();
  _hookMainConsole();
  if (isAuditActive()) _startPerfSampler();

  // Attach to any already-existing and future windows
  for (const w of BrowserWindow.getAllWindows()) {
    attachWindowAudit(w);
  }
  if (app && typeof app.on === 'function') {
    app.on('browser-window-created', (_event, win) => {
      attachWindowAudit(win);
    });
  }

  // Register audit IPC channels
  ipcMain.handle('audit:open-console', () => {
    return openAuditConsole();
  });

  ipcMain.handle('audit:get-snapshot', () => {
    return {
      ok: true,
      enabled: isAuditActive(),
      startOnLaunch: _startOnLaunch,
      logs: _ringBuffer.slice(),
      stats: getAuditStats()
    };
  });

  ipcMain.handle('audit:get-stats', () => {
    return { ok: true, stats: getAuditStats() };
  });

  ipcMain.handle('audit:clear', () => {
    _ringBuffer.length = 0;
    _pendingBatch.length = 0;
    return { ok: true };
  });

  ipcMain.handle('audit:reset-peaks', () => {
    _peaks.cpuPct = 0; _peaks.cpuTs = 0; _peaks.cpuProcess = '';
    _peaks.heapUsedMB = 0; _peaks.heapTs = 0;
    _peaks.rssMB = 0; _peaks.rssTs = 0;
    _peaks.workingSetMB = 0; _peaks.workingSetTs = 0; _peaks.workingSetProcess = '';
    _peaks.eventLoopLagMs = 0; _peaks.lagTs = 0;
    _spikes.length = 0;
    return { ok: true, perf: _getPerfSnapshot() };
  });

  ipcMain.handle('audit:set-enabled', (_event, flag) => {
    _auditEnabled = !!flag;
    _broadcastModeChanged();
    return { ok: true, enabled: isAuditActive() };
  });

  ipcMain.handle('audit:set-start-on-launch', (_event, flag) => {
    _startOnLaunch = !!flag;
    if (_startOnLaunch) _auditEnabled = true;
    _saveAuditConfig();
    _broadcastModeChanged();
    return { ok: true, startOnLaunch: _startOnLaunch, enabled: isAuditActive() };
  });

  ipcMain.handle('audit:set-always-on-top', (_event, flag) => {
    if (_auditWin && !_auditWin.isDestroyed()) {
      _auditWin.setAlwaysOnTop(!!flag, 'floating');
      return { ok: true, isAlwaysOnTop: _auditWin.isAlwaysOnTop() };
    }
    return { ok: false };
  });

  ipcMain.handle('audit:is-enabled', () => {
    return { ok: true, enabled: isAuditActive(), startOnLaunch: _startOnLaunch };
  });

  ipcMain.on('audit:renderer-log', (event, entries) => {
    if (!isAuditActive()) return;
    let fallbackSource = 'renderer';
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        fallbackSource = getLoadedPageFile(win) || `win#${win.id}`;
      }
    } catch (_) {}

    const list = Array.isArray(entries) ? entries : [entries];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item || typeof item !== 'object') continue;
      auditLog({
        ts: item.ts,
        level: item.level || 'log',
        source: item.source || fallbackSource,
        message: item.message || '',
        payload: item.payload
      });
    }
  });

  return {
    auditLog,
    instrumentIpcMain,
    attachWindowAudit,
    openAuditConsole,
    isAuditActive,
    getAuditStats
  };
}

module.exports = { registerAuditIpc };
