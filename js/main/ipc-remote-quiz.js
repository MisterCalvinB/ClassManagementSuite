// Local classroom server, CMS remote relay, and quiz multiplayer IPC handlers extracted from electron-main.js
'use strict';

function registerRemoteQuizIpc(ctx) {
  const {
    app,
    BrowserWindow,
    ipcMain,
    fs,
    path,
    http,
    os,
    crypto,
    spawn,
    ROOT_DIR,
    PAGE_FILES,
    isPresentationWindow,
    getLoadedPageFile,
    getRequestingPage,
    resolveAllowedTargetPath
  } = ctx;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED LOCAL CLASSROOM SERVER  (spawned child process, used by both CMS
// remote and quiz / note features)
// ─────────────────────────────────────────────────────────────────────────────

let _localServerProc = null;
let _localServerPort = 8787;

function _localServerRunning() {
  return !!(_localServerProc && !_localServerProc.killed && _localServerProc.exitCode == null);
}

async function ensureLocalServerRunning(port) {
  const requestedPort = Number(port) || 8787;

  if (_localServerRunning()) {
    if (_localServerPort === requestedPort) {
      return { ok: true, port: _localServerPort };
    }
    if (_localServerProc) {
      try { _localServerProc.kill(); } catch (_) {}
      _localServerProc = null;
    }
  }

  const scriptPath    = path.join(ROOT_DIR, 'js', 'classroom-server.js');

  try { await fs.access(scriptPath); } catch (_) { return { ok: false, error: 'classroom-server.js not found.' }; }

  _localServerPort = requestedPort;
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(requestedPort) };

  try {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: ROOT_DIR, env, detached: false, stdio: 'ignore', windowsHide: true
    });
    child.on('exit',  () => { if (_localServerProc === child) _localServerProc = null; });
    child.on('error', () => { if (_localServerProc === child) _localServerProc = null; });
    _localServerProc = child;

    // Brief wait for the server process to bind its port
    await new Promise(resolve => setTimeout(resolve, 450));

    // Best-effort: open Windows Firewall
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const ruleName = 'CMT Classroom Server';
      exec(
        `netsh advfirewall firewall delete rule name="${ruleName}" >nul 2>&1 & ` +
        `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow ` +
        `protocol=TCP localport=${requestedPort} profile=any`,
        () => {}
      );
    }

    return { ok: true, port: _localServerPort };
  } catch (err) {
    _localServerProc = null;
    return { ok: false, error: err && err.message ? err.message : 'Failed to start server.' };
  }
}

function stopLocalServerIfUnused() {
  if (_cmsRelayConnected) return; // keep the server alive while CMS is connected
  if (_localServerProc) { try { _localServerProc.kill(); } catch (_) {} _localServerProc = null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// CMS REMOTE RELAY CLIENT
// ─────────────────────────────────────────────────────────────────────────────

let _cmsRelayWs        = null;
let _cmsRelayConnected = false;
let _cmsRelayMode      = 'local';   // 'local' | 'external'
let _cmsRelayServerUrl = '';        // external server URL, kept for status responses
let _remoteToken       = null;      // 6-char student token shown to phones
let _remoteHostSecret  = null;      // host secret used to authenticate with relay
let _cmsConnectedCount = 0;

function _remoteGenToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let t = '';
  for (let i = 0; i < 6; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

function _remoteGenSecret() {
  return crypto.randomBytes(16).toString('hex');
}

function _remoteGetLocalIp() {
  const ifaces = os.networkInterfaces();
  // Words in adapter names that indicate virtual/tunnel/VPN adapters to skip
  const skipWords = ['wsl', 'hyper-v', 'vmware', 'virtualbox', 'docker',
                     'vethernet', 'virtual', 'pseudo', 'tap-windows',
                     'npcap', 'teredo', 'isatap', 'vpn', 'tunnel'];
  const candidates = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const iface of addrs) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      const lname = name.toLowerCase();
      if (skipWords.some(w => lname.includes(w))) continue;
      // Score: prefer Wi-Fi, then Ethernet, then anything else
      const score =
        (lname.includes('wi-fi') || lname.includes('wifi') ||
         lname.includes('wireless') || lname.includes('wlan')) ? 3 :
        (lname.includes('ethernet') || lname.includes('local area')) ? 2 : 1;
      candidates.push({ ip: iface.address, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.length > 0 ? candidates[0].ip : '127.0.0.1';
}

function _cmsFindClassManagementWindow() {
  const mainWin = BrowserWindow.getAllWindows().find(
    w => !w.isDestroyed() && !isPresentationWindow(w) && getLoadedPageFile(w) === PAGE_FILES.classManagement
  );
  if (mainWin) return mainWin;
  return BrowserWindow.getAllWindows().find(
    w => !w.isDestroyed() && getLoadedPageFile(w) === PAGE_FILES.classManagement
  ) || null;
}

function _cmsNotifyStatus() {
  const win = _cmsFindClassManagementWindow();
  if (!win) return;
  win.webContents.executeJavaScript(
    `window._cmsRemoteStatusUpdate && window._cmsRemoteStatusUpdate(${_cmsConnectedCount})`
  ).catch(() => {});
}

const _CMS_ALLOWED_ACTIONS = new Set(['score', 'badge_add', 'badge_remove']);

function _cmsDispatchAction(msg) {
  const { action, studentId, groupName, delta, icon, label, tone } = msg;
  if (!_CMS_ALLOWED_ACTIONS.has(action)) return;
  if (studentId === undefined || studentId === null || typeof groupName !== 'string') return;

  const sId  = JSON.stringify(studentId);
  const sGrp = JSON.stringify(String(groupName).substring(0, 128));
  let jsCall;

  if (action === 'score') {
    const d = (Number(delta) < 0) ? -1 : 1;
    jsCall = `window._cmsRemoteAction && window._cmsRemoteAction({action:'score',studentId:${sId},groupName:${sGrp},delta:${d}})`;
  } else if (action === 'badge_add') {
    const sIcon  = JSON.stringify(String(icon  || '').substring(0, 8));
    const sLabel = JSON.stringify(String(label || '').substring(0, 64));
    const sTone  = (tone === 'negative') ? '"negative"' : '"positive"';
    jsCall = `window._cmsRemoteAction && window._cmsRemoteAction({action:'badge_add',studentId:${sId},groupName:${sGrp},icon:${sIcon},label:${sLabel},tone:${sTone}})`;
  } else if (action === 'badge_remove') {
    const sIcon = JSON.stringify(String(icon || '').substring(0, 8));
    jsCall = `window._cmsRemoteAction && window._cmsRemoteAction({action:'badge_remove',studentId:${sId},groupName:${sGrp},icon:${sIcon}})`;
  }

  if (jsCall) {
    const win = _cmsFindClassManagementWindow();
    if (win) win.webContents.executeJavaScript(jsCall).catch(() => {});
  }
}

function _cmsRelayDisconnect() {
  if (_cmsRelayWs) { try { _cmsRelayWs.close(); } catch (_) {} _cmsRelayWs = null; }
  _cmsRelayConnected = false;
  _cmsConnectedCount = 0;
  _cmsRelayServerUrl = '';
}

function _cmsBuildWsUrl(serverUrl) {
  const s = String(serverUrl || '').trim().replace(/\/+$/, '');
  if (!s) throw new Error('No server URL');
  if (/^wss?:\/\//i.test(s)) return /\/cms-ws$/i.test(s) ? s : s + '/cms-ws';
  const withProto = /^https?:\/\//i.test(s) ? s : 'https://' + s;
  const u = new URL(withProto);
  return (u.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + u.host + '/cms-ws';
}

function _cmsBuildHttpUrl(serverUrl) {
  const s = String(serverUrl || '').trim().replace(/\/+$/, '');
  if (!s) throw new Error('No server URL');
  let base = s;
  if (/^wss?:\/\//i.test(s)) base = s.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:').replace(/\/cms-ws$/i, '');
  if (!/^https?:\/\//i.test(base)) base = 'https://' + base;
  return base.replace(/\/+$/, '') + '/remote.html';
}

async function _connectCmsRelay(wsUrl, secret, token) {
  _cmsRelayDisconnect();

  let WS;
  try { WS = require('ws'); }
  catch { return { ok: false, error: "'ws' package not available — run: npm install" }; }

  return new Promise((resolve) => {
    const ws = new WS(wsUrl);
    let settled = false;
    let pingInterval = null;

    const fail = (reason) => {
      if (settled) return;
      settled = true;
      clearInterval(pingInterval);
      try { ws.close(); } catch (_) {}
      resolve({ ok: false, error: reason });
    };

    ws.on('open', () => {
      try { ws.send(JSON.stringify({ type: 'host_hello', secret, token })); } catch (_) {}
      // Keepalive: prevents nginx/proxy from closing idle WS connections
      pingInterval = setInterval(() => {
        if (ws.readyState === 1) {
          try { ws.send(JSON.stringify({ type: 'ping' })); } catch (_) {}
        }
      }, 20000);
    });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (!settled) {
        if (msg.type === 'host_welcome') {
          settled = true;
          _cmsRelayWs        = ws;
          _cmsRelayConnected = true;
          _cmsConnectedCount = Number(msg.clientCount || 0);
          resolve({ ok: true });
        } else if (msg.type === 'host_error') {
          fail(msg.reason || 'Authentication failed');
        }
        return;
      }

      if (msg.type === 'client_count') {
        _cmsConnectedCount = Number(msg.count || 0);
        _cmsNotifyStatus();
      } else if (msg.type === 'action') {
        _cmsDispatchAction(msg);
      } else if (msg.type === 'request_state') {
        const cmsWin = _cmsFindClassManagementWindow();
        if (cmsWin) {
          cmsWin.webContents.executeJavaScript(
            'window._remotePushStateDebounced && window._remotePushStateDebounced()'
          ).catch(() => {});
        }
      }
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      const wasConnected = _cmsRelayConnected;
      _cmsRelayWs        = null;
      _cmsRelayConnected = false;
      if (wasConnected) _cmsNotifyStatus();
      if (!settled) fail('Connection closed before authentication');
    });

    ws.on('error', (err) => {
      if (!settled) fail(err && err.message ? err.message : 'WebSocket error');
    });

    setTimeout(() => fail('Connection timed out'), 8000);
  });
}

// Remote Control IPC handlers

ipcMain.handle('app:remote-start', async (_event, opts = {}) => {
  const { port, mode, serverUrl, hostSecret } = opts;
  _cmsRelayMode   = mode === 'external' ? 'external' : 'local';
  _remoteToken    = _remoteGenToken();

  if (_cmsRelayMode === 'local') {
    _remoteHostSecret = _remoteGenSecret(); // ephemeral secret, not user-visible
    const srv = await ensureLocalServerRunning(port || 8787);
    if (!srv.ok) return srv;
    const wsUrl  = `ws://127.0.0.1:${_localServerPort}/cms-ws`;
    const result = await _connectCmsRelay(wsUrl, _remoteHostSecret, _remoteToken);
    if (!result.ok) return result;
    const ip = _remoteGetLocalIp();
    return { ok: true, mode: 'local', port: _localServerPort, ip, token: _remoteToken, connected: 0 };
  }

  // External mode
  _remoteHostSecret = String(hostSecret || '').trim();
  if (!_remoteHostSecret) return { ok: false, error: 'Host secret required for external mode.' };

  let wsUrl;
  try { wsUrl = _cmsBuildWsUrl(serverUrl); }
  catch (e) { return { ok: false, error: 'Invalid server URL.' }; }

  const result = await _connectCmsRelay(wsUrl, _remoteHostSecret, _remoteToken);
  if (!result.ok) return result;

  _cmsRelayServerUrl = serverUrl;
  let httpUrl = '';
  try { httpUrl = _cmsBuildHttpUrl(serverUrl); } catch (_) {}
  return { ok: true, mode: 'external', serverUrl, httpUrl, token: _remoteToken, connected: 0 };
});

ipcMain.handle('app:remote-stop', async () => {
  _cmsRelayDisconnect();
  _remoteToken = null;
  stopLocalServerIfUnused();
  return { ok: true };
});

ipcMain.handle('app:remote-status', async () => {
  if (!_cmsRelayConnected) return { running: false };
  const ip = _remoteGetLocalIp();
  let httpUrl = '';
  if (_cmsRelayMode === 'external' && _cmsRelayServerUrl) {
    try { httpUrl = _cmsBuildHttpUrl(_cmsRelayServerUrl); } catch (_) {}
  }
  return {
    running: true, mode: _cmsRelayMode,
    port: _localServerPort, ip, token: _remoteToken, connected: _cmsConnectedCount,
    httpUrl
  };
});

ipcMain.handle('app:remote-push-state', async (_event, stateData) => {
  if (_cmsRelayConnected && _cmsRelayWs && stateData) {
    try { _cmsRelayWs.send(JSON.stringify({ type: 'state', ...stateData })); } catch (_) {}
  }
  return { ok: true };
});

ipcMain.handle('app:remote-new-token', async () => {
  if (!_cmsRelayConnected) return { ok: false, error: 'Not connected to relay' };
  _remoteToken = _remoteGenToken();
  try { _cmsRelayWs.send(JSON.stringify({ type: 'new_token', token: _remoteToken })); } catch (_) {}
  _cmsConnectedCount = 0;
  _cmsNotifyStatus();
  const ip = _remoteGetLocalIp();
  return { ok: true, token: _remoteToken, mode: _cmsRelayMode, port: _localServerPort, ip };
});

ipcMain.handle('app:remote-config-read', async (event) => {
  const pageFile = getRequestingPage(event);
  try {
    const { fullPath } = resolveAllowedTargetPath(pageFile, 'user', 'remote-config.js');
    const raw = await fs.readFile(fullPath, 'utf8');
    const match = raw.match(/globalThis\.__REMOTE_CONFIG\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      try { return { ok: true, config: JSON.parse(match[1]) }; } catch (_) {}
    }
    return { ok: true, config: {} };
  } catch (_) {
    return { ok: true, config: {} };
  }
});

ipcMain.handle('app:remote-config-save', async (event, config) => {
  const pageFile = getRequestingPage(event);
  const safe = config && typeof config === 'object' ? config : {};
  const content =
    'globalThis.__REMOTE_CONFIG = ' + JSON.stringify(safe, null, 2) + ';\n' +
    'if (typeof module !== "undefined" && module.exports) ' +
    '{ module.exports = { __REMOTE_CONFIG: globalThis.__REMOTE_CONFIG }; }\n';
  try {
    const { fullPath } = resolveAllowedTargetPath(pageFile, 'user', 'remote-config.js');
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'Write failed' };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ MULTIPLAYER SERVER  (uses the shared combined classroom-server.js)
// ─────────────────────────────────────────────────────────────────────────────

function _quizStatus() {
  const ip      = _remoteGetLocalIp();
  const running = _localServerRunning();
  return {
    running,
    port:      _localServerPort,
    ip,
    hostUrl:   `http://${ip}:${_localServerPort}/learning-tools.html`,
    playerUrl: `http://${ip}:${_localServerPort}/quiz-player.html`
  };
}

async function startQuizServer(port) {
  const srv = await ensureLocalServerRunning(port || 8787);
  if (!srv.ok) return { ok: false, error: srv.error };
  return { ok: true, ..._quizStatus() };
}

function stopQuizServer() {
  // Only stop if CMS relay is also inactive
  if (!_cmsRelayConnected) stopLocalServerIfUnused();
  return { ok: true, ..._quizStatus() };
}

ipcMain.handle('app:quiz-server-start', async (_event, { port } = {}) => {
  return startQuizServer(port || 8787);
});

ipcMain.handle('app:quiz-server-stop', async () => {
  return stopQuizServer();
});

ipcMain.handle('app:quiz-server-status', async () => {
  return _quizStatus();
});

ipcMain.handle('app:quiz-save-result', async (event, resultPayload) => {
  const pageFile = getRequestingPage(event);
  const payload  = resultPayload && typeof resultPayload === 'object' ? resultPayload : {};
  const entry = {
    savedAt:         Date.now(),
    winner:          payload.winner  || null,
    totalPlayers:    Number(payload.totalPlayers    || 0),
    questionsPlayed: Number(payload.questionsPlayed || 0),
    finishedAt:      Number(payload.finishedAt      || Date.now()),
    leaderboard:     Array.isArray(payload.leaderboard) ? payload.leaderboard : []
  };
  const line = 'globalThis.GAME_RESULTS_LOG.push(' + JSON.stringify(entry) + ');\n';
  const header =
    'globalThis.GAME_RESULTS_LOG = globalThis.GAME_RESULTS_LOG || [];\n' +
    'if (typeof module !== "undefined" && module.exports) ' +
    '{ module.exports = { GAME_RESULTS_LOG: globalThis.GAME_RESULTS_LOG }; }\n';
  try {
    const { fullPath } = resolveAllowedTargetPath(pageFile, 'gameResults', 'game-results.js');
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    // Initialise file if missing
    let exists = false;
    try { await fs.access(fullPath); exists = true; } catch (_) {}
    if (!exists) await fs.writeFile(fullPath, header, 'utf8');
    await fs.appendFile(fullPath, line, 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'Write failed' };
  }
});


  return {
    stopQuizServer,
    findClassManagementWindow: _cmsFindClassManagementWindow
  };
}

module.exports = { registerRemoteQuizIpc };
