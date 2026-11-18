// FTP, Google Drive, WebDAV sync and .bak recovery IPC handlers extracted from electron-main.js
'use strict';

function registerCloudSyncIpc(ctx) {
  const {
    ipcMain,
    fs,
    path,
    getWritableRootDir,
    loadFtpConfig,
    saveFtpConfig,
    startFtpAutoSyncTimer,
    runFtpTransfer,
    loadDriveConfig,
    saveDriveConfig,
    startDriveOAuthFlow,
    runDriveTransfer,
    loadWebdavConfig,
    saveWebdavConfig,
    startWebdavAutoSyncTimer,
    runWebdavTransfer
  } = ctx;

ipcMain.handle('app:ftp-get-config', async () => {
  const cfg = await loadFtpConfig();
  const safe = { ...cfg };
  safe.hasPassword = !!cfg.password;
  delete safe.password; // password never leaves main process
  return { ok: true, config: safe };
});

ipcMain.handle('app:ftp-save-config', async (_event, incoming = {}) => {
  const existing = await loadFtpConfig();
  const merged = { ...existing, ...incoming };
  // If the renderer sent the placeholder '***' back (masked), keep existing password
  if (incoming.password === '***') merged.password = existing.password || '';
  await saveFtpConfig(merged);
  await startFtpAutoSyncTimer();
  return { ok: true };
});

ipcMain.handle('app:ftp-test', async () => {
  const cfg = await loadFtpConfig();
  if (!cfg.host) return { ok: false, error: 'No host configured.' };
  const { Client } = require('basic-ftp');
  const ftp = new Client(15000);
  try {
    await ftp.access({ host: cfg.host, port: cfg.port || 21, user: cfg.user || '', password: cfg.password || '', secure: cfg.secure === true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    ftp.close();
  }
});

ipcMain.handle('app:ftp-upload',   async () => runFtpTransfer('upload'));
ipcMain.handle('app:ftp-download', async () => runFtpTransfer('download'));

// ── Google Drive Sync IPC ─────────────────────────────────────────────────────

ipcMain.handle('app:drive-get-config', async () => {
  const cfg = await loadDriveConfig();
  return {
    ok: true,
    config: {
      clientId: cfg.clientId || '',
      clientSecretSet: !!(cfg.clientSecret),
      driveFolderName: cfg.driveFolderName || 'Class Management Tools',
      subfolders: cfg.subfolders || [],
      isConnected: !!(cfg.tokens && cfg.tokens.refresh_token),
      userEmail: cfg.userEmail || '',
    },
  };
});

ipcMain.handle('app:drive-save-credentials', async (_event, { clientId, clientSecret, driveFolderName, subfolders } = {}) => {
  const existing = await loadDriveConfig();
  const updated = { ...existing };
  if (typeof clientId     === 'string') updated.clientId     = clientId;
  if (typeof driveFolderName === 'string') updated.driveFolderName = driveFolderName || 'Class Management Tools';
  if (Array.isArray(subfolders)) updated.subfolders = subfolders;
  if (typeof clientSecret === 'string' && clientSecret) updated.clientSecret = clientSecret;
  await saveDriveConfig(updated);
  return { ok: true };
});

ipcMain.handle('app:drive-auth-start', async () => {
  const cfg = await loadDriveConfig();
  if (!cfg.clientId || !cfg.clientSecret) {
    return { ok: false, error: 'Enter your Client ID and Client Secret first.' };
  }
  try {
    return await startDriveOAuthFlow(cfg);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('app:drive-disconnect', async () => {
  const cfg = await loadDriveConfig();
  const { tokens: _t, userEmail: _e, driveFolderId: _f, ...rest } = cfg;
  await saveDriveConfig(rest);
  return { ok: true };
});

ipcMain.handle('app:drive-upload',   async () => runDriveTransfer('upload'));
ipcMain.handle('app:drive-download', async () => runDriveTransfer('download'));

// ── WebDAV Sync IPC ───────────────────────────────────────────────────────────

ipcMain.handle('app:webdav-get-config', async () => {
  const cfg = await loadWebdavConfig();
  const safe = { ...cfg };
  delete safe.password;
  return { ok: true, config: safe };
});

ipcMain.handle('app:webdav-save-config', async (_event, incoming = {}) => {
  const existing = await loadWebdavConfig();
  const merged = { ...existing, ...incoming };
  if (incoming.password === '***') merged.password = existing.password || '';
  await saveWebdavConfig(merged);
  await startWebdavAutoSyncTimer();
  return { ok: true };
});

ipcMain.handle('app:webdav-test', async () => {
  const cfg = await loadWebdavConfig();
  if (!cfg.serverUrl) return { ok: false, error: 'No server URL configured.' };
  try {
    const { createClient } = require('webdav');
    const client = createClient(cfg.serverUrl, { username: cfg.username || '', password: cfg.password || '' });
    await client.getQuota(); // lightweight connectivity check
    return { ok: true };
  } catch (err) {
    // Fall back to checking if root path exists — getQuota not supported on all servers
    try {
      const { createClient } = require('webdav');
      const client = createClient(cfg.serverUrl, { username: cfg.username || '', password: cfg.password || '' });
      await client.exists('/');
      return { ok: true };
    } catch (err2) {
      return { ok: false, error: err2.message };
    }
  }
});

ipcMain.handle('app:webdav-upload',   async () => runWebdavTransfer('upload'));
ipcMain.handle('app:webdav-download', async () => runWebdavTransfer('download'));

// ── Backup file management ────────────────────────────────────────────────────

const BAK_RE = /\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}\.bak$/;

ipcMain.handle('app:list-bak-files', async () => {
  const userDir = path.join(getWritableRootDir(), 'user');
  const results = [];
  async function scan(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scan(full);
      } else if (BAK_RE.test(entry.name)) {
        const stat = await fs.stat(full).catch(() => null);
        const originalFull = full.replace(BAK_RE, '');
        const tsMatch = entry.name.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2})\.bak$/);
        const ts = tsMatch ? tsMatch[1].replace('T', ' ').replace(/-(\d{2})$/, ':$1') : '';
        const originalExists = await fs.access(originalFull).then(() => true).catch(() => false);
        results.push({
          path: full,
          relativePath: path.relative(userDir, full).replace(/\\/g, '/'),
          originalName: path.basename(originalFull),
          timestamp: ts,
          size: stat ? stat.size : 0,
          originalExists,
        });
      }
    }
  }
  await scan(userDir);
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { ok: true, files: results };
});

ipcMain.handle('app:delete-bak-files', async (_event, { paths: filePaths = [] } = {}) => {
  const userDir = path.join(getWritableRootDir(), 'user');
  let deleted = 0;
  const errors = [];
  for (const p of filePaths) {
    if (!p.startsWith(userDir + path.sep) || !BAK_RE.test(path.basename(p))) {
      errors.push({ path: p, error: 'Not a valid backup file path.' });
      continue;
    }
    try { await fs.unlink(p); deleted++; }
    catch (e) { errors.push({ path: p, error: e.message }); }
  }
  return { ok: true, deleted, errors };
});

ipcMain.handle('app:restore-bak-file', async (_event, { path: bakPath } = {}) => {
  const userDir = path.join(getWritableRootDir(), 'user');
  if (!bakPath.startsWith(userDir + path.sep) || !BAK_RE.test(path.basename(bakPath))) {
    return { ok: false, error: 'Not a valid backup file path.' };
  }
  const originalPath = bakPath.replace(BAK_RE, '');
  const alreadyExists = await fs.access(originalPath).then(() => true).catch(() => false);
  if (alreadyExists) return { ok: false, error: 'original_exists' };
  try {
    await fs.rename(bakPath, originalPath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

}

module.exports = { registerCloudSyncIpc };
