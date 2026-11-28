// Folder sync, scheduled backup, and FTP/Drive/WebDAV transport engine + IPC handlers extracted from electron-main.js
'use strict';

const { runBackupWorker } = require('./backup-worker-client');
const { readSyncPair, writeMergedSyncFile } = require('./sync-diff-merge');

function registerBackupSyncIpc(ctx) {
  const {
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    fs,
    fsSync,
    path,
    zlib,
    http,
    crypto,
    ROOT_DIR,
    getWritableRootDir,
    _broadcastDataChanged
  } = ctx;

  let _autoSyncWatcher = null;
  let _autoSyncTimer = null;
  let _autoSyncRunning = false;

  function getBackupLocationConfigPath() {
    return path.join(app.getPath('userData'), 'backup-location.json');
  }

  async function loadSavedBackupConfig() {
    try {
      const raw = await fs.readFile(getBackupLocationConfigPath(), 'utf8');
      const parsed = JSON.parse(raw);
      return {
        backupLocation: String(parsed?.backupLocation || '').trim() || null,
        backupFormat: ['folder', 'zip', 'targz'].includes(parsed?.backupFormat) ? parsed.backupFormat : 'folder',
        backupScheduleEnabled: Boolean(parsed?.backupScheduleEnabled),
        backupIntervalDays: Number.isFinite(parsed?.backupIntervalDays) ? Math.max(1, Math.min(365, parseInt(parsed.backupIntervalDays, 10))) : 7,
        lastBackupTime: parsed?.lastBackupTime || null
      };
    } catch {
      return { backupLocation: null, backupFormat: 'folder', backupScheduleEnabled: false, backupIntervalDays: 7, lastBackupTime: null };
    }
  }

  async function loadSavedBackupLocation() {
    const cfg = await loadSavedBackupConfig();
    return cfg.backupLocation;
  }

  async function saveBackupConfig(updates = {}) {
    try {
      await fs.mkdir(app.getPath('userData'), { recursive: true });
      const current = await loadSavedBackupConfig();
      const newConfig = {
        backupLocation: updates.backupLocation !== undefined ? updates.backupLocation : current.backupLocation,
        backupFormat: updates.backupFormat !== undefined ? updates.backupFormat : current.backupFormat,
        backupScheduleEnabled: updates.backupScheduleEnabled !== undefined ? updates.backupScheduleEnabled : current.backupScheduleEnabled,
        backupIntervalDays: updates.backupIntervalDays !== undefined ? updates.backupIntervalDays : current.backupIntervalDays,
        lastBackupTime: updates.lastBackupTime !== undefined ? updates.lastBackupTime : current.lastBackupTime
      };
      await fs.writeFile(
        getBackupLocationConfigPath(),
        JSON.stringify(newConfig, null, 2),
        'utf8'
      );
      return newConfig;
    } catch (err) {
      console.error('Failed to save backup config:', err);
      return { backupLocation: null, backupFormat: 'folder', backupScheduleEnabled: false, backupIntervalDays: 7, lastBackupTime: null };
    }
  }

  async function saveBackupLocation(dirPath) {
    return saveBackupConfig({ backupLocation: dirPath });
  }

  async function createZipBackup(sourceDir, destZipFile) {
    return runBackupWorker({
      op: 'zip',
      sourceDir,
      destFile: destZipFile,
      rootPrefix: 'user',
      includeMeta: false
    });
  }

  async function createTarGzBackup(sourceDir, destTarGzFile) {
    return runBackupWorker({
      op: 'targz',
      sourceDir,
      destFile: destTarGzFile,
      rootPrefix: 'user'
    });
  }

  function getSyncLocationConfigPath() {
    return path.join(app.getPath('userData'), 'sync-location.json');
  }

  async function loadSavedSyncLocation() {
    try {
      const raw = await fs.readFile(getSyncLocationConfigPath(), 'utf8');
      const parsed = JSON.parse(raw);
      const saved = String(parsed?.syncLocation || '').trim();
      return saved || null;
    } catch {
      return null;
    }
  }

  async function saveSyncLocation(dirPath) {
    try {
      await fs.mkdir(app.getPath('userData'), { recursive: true });
      // Preserve any existing fields (e.g. autoSync) when updating syncLocation.
      let existing = {};
      try {
        const raw = await fs.readFile(getSyncLocationConfigPath(), 'utf8');
        existing = JSON.parse(raw);
      } catch { }
      existing.syncLocation = dirPath;
      await fs.writeFile(
        getSyncLocationConfigPath(),
        JSON.stringify(existing, null, 2),
        'utf8'
      );
    } catch (err) {
      console.error('Failed to save sync location config:', err);
    }
  }

  async function loadAutoSyncEnabled() {
    try {
      const raw = await fs.readFile(getSyncLocationConfigPath(), 'utf8');
      const parsed = JSON.parse(raw);
      return parsed?.autoSync === true;
    } catch {
      return false;
    }
  }

  async function saveAutoSyncEnabled(enabled) {
    try {
      await fs.mkdir(app.getPath('userData'), { recursive: true });
      let config = {};
      try {
        const raw = await fs.readFile(getSyncLocationConfigPath(), 'utf8');
        config = JSON.parse(raw);
      } catch { }
      config.autoSync = enabled;
      await fs.writeFile(
        getSyncLocationConfigPath(),
        JSON.stringify(config, null, 2),
        'utf8'
      );
    } catch (err) {
      console.error('Failed to save autoSync setting:', err);
    }
  }

  async function loadStartupSyncConfig() {
    try {
      const raw = await fs.readFile(getSyncLocationConfigPath(), 'utf8');
      const parsed = JSON.parse(raw);
      return {
        startupSync: parsed?.startupSync === true,
        startupSyncMode: (parsed?.startupSyncMode === 'auto') ? 'auto' : 'prompt'
      };
    } catch {
      return { startupSync: false, startupSyncMode: 'prompt' };
    }
  }

  async function saveStartupSyncConfig(enabled, mode) {
    try {
      await fs.mkdir(app.getPath('userData'), { recursive: true });
      let config = {};
      try {
        const raw = await fs.readFile(getSyncLocationConfigPath(), 'utf8');
        config = JSON.parse(raw);
      } catch { }
      config.startupSync = enabled === true;
      if (mode) config.startupSyncMode = (mode === 'auto') ? 'auto' : 'prompt';
      await fs.writeFile(
        getSyncLocationConfigPath(),
        JSON.stringify(config, null, 2),
        'utf8'
      );
    } catch (err) {
      console.error('Failed to save startupSync setting:', err);
    }
  }

  async function checkSyncLocationAccessible(dirPath) {
    if (!dirPath || typeof dirPath !== 'string') return false;
    try {
      await fs.access(path.resolve(dirPath), fsSync.constants.R_OK | fsSync.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  // ── Sync baseline (FreeFileSync-style last-known-state) ──────────────────────
  // Stored in userData so it never appears as a sync conflict itself.
  // Each entry: relativePath (with sub-dir prefix) → { mtimeMs, size }
  // After a successful sync, both sides have an identical file; we record
  // that agreed state here so future syncs can detect which side changed.

  function getSyncBaselinePath() {
    return path.join(app.getPath('userData'), 'sync-baseline.json');
  }

  function getLegacySyncBaselinePath() {
    return path.join(getWritableRootDir(), 'user', 'sync-baseline.json');
  }

  async function loadSyncBaseline() {
    for (const p of [getSyncBaselinePath(), getLegacySyncBaselinePath()]) {
      try {
        const raw = await fs.readFile(p, 'utf8');
        const parsed = JSON.parse(raw);
        return new Map(Object.entries(parsed || {}));
      } catch { }
    }
    return new Map();
  }

  async function saveSyncBaseline(baselineMap) {
    try {
      await fs.mkdir(path.dirname(getSyncBaselinePath()), { recursive: true });
      const obj = Object.fromEntries(baselineMap);
      const tmp = getSyncBaselinePath() + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
      try { await fs.unlink(getSyncBaselinePath()); } catch { }
      await fs.rename(tmp, getSyncBaselinePath());
    } catch (err) {
      console.error('Failed to save sync baseline:', err);
    }
  }

  async function resetSyncBaseline() {
    _pendingBaselineEntries = [];
    try {
      try { await fs.unlink(getSyncBaselinePath()); } catch { }
      try { await fs.unlink(getLegacySyncBaselinePath()); } catch { }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  // Pending baseline entries collected during a sync run; committed after all
  // conflicts are resolved (or immediately if there are none).
  let _pendingBaselineEntries = [];

  const MAX_SYNC_LOG_ENTRIES = 200;

  function getSyncLogPath() {
    return path.join(app.getPath('userData'), 'sync-log.json');
  }

  async function loadSyncLog() {
    try {
      const raw = await fs.readFile(getSyncLogPath(), 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function writeSyncLog(entries) {
    try {
      const logPath = getSyncLogPath();
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      const tmp = logPath + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(entries, null, 2), 'utf8');
      try { await fs.unlink(logPath); } catch { }
      await fs.rename(tmp, logPath);
    } catch (err) {
      console.error('Failed to save sync log:', err);
    }
  }

  async function appendSyncLog(entry) {
    try {
      const entries = await loadSyncLog();
      const record = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
        timestamp: new Date().toISOString(),
        type: entry.type || 'local',
        mode: entry.mode || 'both',
        target: entry.target || '',
        saved: Array.isArray(entry.saved) ? entry.saved : [],
        deleted: Array.isArray(entry.deleted) ? entry.deleted : [],
        archived: Array.isArray(entry.archived) ? entry.archived : [],
        errors: Array.isArray(entry.errors) ? entry.errors : []
      };
      entries.unshift(record);
      if (entries.length > MAX_SYNC_LOG_ENTRIES) {
        entries.length = MAX_SYNC_LOG_ENTRIES;
      }
      await writeSyncLog(entries);
      return record;
    } catch (err) {
      console.error('Failed to append sync log:', err);
      return null;
    }
  }

  async function clearSyncLog() {
    await writeSyncLog([]);
    return { ok: true };
  }

  function stopAutoSyncWatcher() {
    if (_autoSyncTimer) {
      clearTimeout(_autoSyncTimer);
      _autoSyncTimer = null;
    }
    if (_autoSyncWatcher) {
      _autoSyncWatcher.close();
      _autoSyncWatcher = null;
    }
  }

  async function runAutoSync() {
    _autoSyncTimer = null;
    if (_autoSyncRunning) return;
    const syncLocation = await loadSavedSyncLocation();
    if (!syncLocation) return;
    try {
      await fs.access(syncLocation, fsSync.constants.W_OK);
    } catch {
      return; // target inaccessible — skip silently
    }
    _autoSyncRunning = true;
    try {
      const writableRoot = getWritableRootDir();
      const srcDir = path.join(writableRoot, 'user');
      const destDir = await resolveSyncDestDir(syncLocation);
      const baselineMap = await loadSyncBaseline();
      const result = await syncTrees(srcDir, destDir, 'to-target', {
        autoNew: true,
        baseline: { map: baselineMap, prefix: '' }
      });
      const savedFiles = [...(result.savedFiles || [])];
      const autoErrors = [...(result.errors || [])];
      let baselineChanged = false;
      for (const relPath of (result.added || [])) {
        try {
          const stat = await fs.stat(path.join(destDir, relPath));
          baselineMap.set(relPath, { mtimeMs: stat.mtimeMs, size: stat.size });
          baselineChanged = true;
        } catch { }
      }
      // Auto-resolve conflicts: source always wins
      for (const c of result.conflicts) {
        const relPath = c.relativePath.replace(/\\/g, '/');
        if (relPath.split('/').some(seg => seg === '..' || seg === '.')) continue;
        try {
          const srcPath = path.join(srcDir, relPath);
          const destPath = path.join(destDir, relPath);
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(srcPath, destPath);
          const stat = await fs.stat(srcPath);
          await fs.utimes(destPath, stat.atime, stat.mtime).catch(() => { });
          const destStat = await fs.stat(destPath);
          baselineMap.set(relPath, { mtimeMs: destStat.mtimeMs, size: destStat.size });
          baselineChanged = true;
          savedFiles.push({ path: relPath, direction: 'to-target', action: 'copied', size: stat.size });
        } catch (err) {
          autoErrors.push({ path: relPath, error: String(err?.message || err) });
        }
      }
      if (baselineChanged) {
        await saveSyncBaseline(baselineMap);
      }
      if (savedFiles.length > 0 || autoErrors.length > 0) {
        await appendSyncLog({
          type: 'local',
          mode: 'auto',
          target: syncLocation,
          saved: savedFiles,
          deleted: [],
          archived: [],
          errors: autoErrors
        });
      }
      _broadcastDataChanged(null, 'general-config.html', {
        action: 'sync-complete',
        target: 'user',
        auto: true
      });
    } catch (err) {
      console.error('Auto-sync error:', err);
    } finally {
      _autoSyncRunning = false;
    }
  }

  function startAutoSyncWatcher() {
    stopAutoSyncWatcher();
    const writableRoot = getWritableRootDir();
    const dir = path.join(writableRoot, 'user');
    try {
      const isWinOrMac = process.platform === 'win32' || process.platform === 'darwin';
      const w = fsSync.watch(dir, isWinOrMac ? { recursive: true } : {}, (_eventType, filename) => {
        if (_autoSyncRunning) return;
        if (filename && (String(filename).endsWith('sync-baseline.json') || String(filename).endsWith('.tmp'))) return;
        if (_autoSyncTimer) clearTimeout(_autoSyncTimer);
        _autoSyncTimer = setTimeout(runAutoSync, 3000);
      });
      w.on('error', () => { }); // ignore watch errors silently
      _autoSyncWatcher = { close: () => { try { w.close(); } catch { } } };
    } catch {
      // Directory may not exist yet; ignore.
    }
  }

  // ── Remote Sync: shared folder catalogue ─────────────────────────────────────
  // Each entry maps a UI checkbox id to the relative path under writableRoot/user/.
  const REMOTE_SYNC_FOLDERS = [
    { id: 'config', rel: null },               // root-level .js/.json files
    { id: 'grades', rel: 'grades' },
    { id: 'groups', rel: 'group-participation' },
    { id: 'mindmaps', rel: 'mindmaps' },
    { id: 'customData', rel: 'custom-data' },
    { id: 'classPlans', rel: 'class-plans' },
    { id: 'documents', rel: 'document-editor' },
  ];

  // Build a list of { localPath, remoteSuffix, isDir } items for selected folder ids.
  // If subfolders is empty/null the entire user dir is synced as one item.
  async function collectRemoteItems(userDir, subfolders) {
    const selected = Array.isArray(subfolders) && subfolders.length > 0 ? subfolders : null;
    if (!selected) return [{ localPath: userDir, remoteSuffix: '', isDir: true }];

    const results = [];
    for (const { id, rel } of REMOTE_SYNC_FOLDERS) {
      if (!selected.includes(id)) continue;
      if (rel === null) {
        // Root-level config files
        let entries = [];
        try { entries = await fs.readdir(userDir, { withFileTypes: true }); } catch { }
        for (const e of entries) {
          if (e.isFile() && (e.name.endsWith('.js') || e.name.endsWith('.json'))) {
            results.push({ localPath: path.join(userDir, e.name), remoteSuffix: e.name, isDir: false });
          }
        }
      } else {
        const p = path.join(userDir, rel);
        try { await fs.access(p); results.push({ localPath: p, remoteSuffix: rel, isDir: true }); } catch { }
      }
    }
    return results;
  }

  // ── FTP Sync ──────────────────────────────────────────────────────────────────

  function getFtpConfigPath() {
    return path.join(app.getPath('userData'), 'ftp-config.json');
  }

  async function loadFtpConfig() {
    try { return JSON.parse(await fs.readFile(getFtpConfigPath(), 'utf8')) || {}; } catch { return {}; }
  }

  async function saveFtpConfig(cfg) {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(getFtpConfigPath(), JSON.stringify(cfg, null, 2), 'utf8');
  }

  function getFtpManifestPath() {
    return path.join(app.getPath('userData'), 'ftp-manifest.json');
  }

  async function loadFtpManifest() {
    try { return JSON.parse(await fs.readFile(getFtpManifestPath(), 'utf8')); } catch { return { version: 1, files: {} }; }
  }

  async function saveFtpManifest(manifest) {
    await fs.writeFile(getFtpManifestPath(), JSON.stringify(manifest, null, 2), 'utf8');
  }

  async function hashFile(filePath) {
    const { createHash } = require('crypto');
    const buf = await fs.readFile(filePath);
    return createHash('sha256').update(buf).digest('hex');
  }

  let _ftpAutoSyncTimer = null;
  let _ftpQuitSyncPending = false;
  let _ftpTransferRunning = false;

  function stopFtpAutoSyncTimer() {
    if (_ftpAutoSyncTimer) { clearInterval(_ftpAutoSyncTimer); _ftpAutoSyncTimer = null; }
  }

  async function startFtpAutoSyncTimer() {
    stopFtpAutoSyncTimer();
    const cfg = await loadFtpConfig();
    if (!cfg.autoSync || !cfg.host) return;
    const intervalMs = Math.max(5, cfg.syncIntervalMinutes || 30) * 60 * 1000;
    _ftpAutoSyncTimer = setInterval(() => { runFtpTransfer('upload').catch(() => { }); }, intervalMs);
  }

  // Rename localPath → localPath.YYYY-MM-DDTHH-MM.bak before overwriting.
  // Each call produces a uniquely-timestamped name so previous backups are never deleted.
  async function bakIfExists(localPath) {
    try {
      await fs.access(localPath);
      const ts = new Date().toISOString().slice(0, 16).replace(/:/g, '-');
      await fs.rename(localPath, `${localPath}.${ts}.bak`);
    } catch { }
  }

  function bakTimestamp() {
    return new Date().toISOString().slice(0, 16).replace(/:/g, '-');
  }

  async function ftpUploadDir(ftp, localDir, remotePath, remoteBase, manifest, updated, savedFiles) {
    await ftp.ensureDir(remotePath);
    let entries = [];
    try { entries = await fs.readdir(localDir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const lp = path.join(localDir, entry.name);
      const rp = remotePath.replace(/\/+$/, '') + '/' + entry.name;
      if (entry.isDirectory()) {
        await ftpUploadDir(ftp, lp, rp, remoteBase, manifest, updated, savedFiles);
      } else {
        const key = rp.slice(remoteBase.length).replace(/^\//, '');
        const hash = await hashFile(lp);
        if (manifest.files[key] === hash) continue;
        await ftp.cd(remotePath);
        await ftp.uploadFrom(lp, entry.name);
        updated.files[key] = hash;
        updated._changed = true;
        if (savedFiles) savedFiles.push({ path: key, direction: 'to-target', action: 'copied' });
      }
    }
  }

  async function ftpDownloadDir(ftp, remoteAbsPath, localDir, remoteBase, remoteManifest, savedFiles) {
    await fs.mkdir(localDir, { recursive: true });
    let items = [];
    try {
      await ftp.cd(remoteAbsPath);
      items = await ftp.list();
    } catch (e) {
      if (!String(e.message).includes('550')) throw e;
      return;
    }
    for (const item of items) {
      if (item.name === 'cmt-manifest.json') continue;
      const localPath = path.join(localDir, item.name);
      const remoteChild = remoteAbsPath.replace(/\/+$/, '') + '/' + item.name;
      if (item.isDirectory) {
        await ftpDownloadDir(ftp, remoteChild, localPath, remoteBase, remoteManifest, savedFiles);
        await ftp.cd(remoteAbsPath);
      } else {
        const key = remoteChild.slice(remoteBase.length).replace(/^\//, '');
        const remoteHash = remoteManifest.files[key];
        if (remoteHash) {
          try {
            const localHash = await hashFile(localPath);
            if (localHash === remoteHash) continue;
          } catch { } // file doesn't exist locally — download it
        }
        await ftp.cd(remoteAbsPath);
        await ftp.downloadTo(localPath, item.name);
        if (savedFiles) savedFiles.push({ path: key, direction: 'to-source', action: 'copied' });
      }
    }
  }

  async function runFtpTransfer(direction) {
    if (_ftpTransferRunning) return { ok: false, error: 'FTP transfer already in progress.' };
    const cfg = await loadFtpConfig();
    if (!cfg.host) return { ok: false, error: 'No FTP host configured.' };
    _ftpTransferRunning = true;
    const { Client } = require('basic-ftp');
    const ftp = new Client(60000);
    const savedFiles = [];
    try {
      await ftp.access({
        host: cfg.host,
        port: cfg.port || 21,
        user: cfg.user || '',
        password: cfg.password || '',
        secure: cfg.secure === true,
      });
      const userDir = path.join(getWritableRootDir(), 'user');
      const remoteBase = ((cfg.remotePath || '/').replace(/\\/g, '/').replace(/\/+$/, '') || '/');
      const items = await collectRemoteItems(userDir, cfg.subfolders);

      if (direction === 'upload') {
        const manifest = await loadFtpManifest();
        const updated = { version: 1, files: { ...manifest.files }, _changed: false };

        for (const item of items) {
          const remoteDest = item.remoteSuffix
            ? (remoteBase + '/' + item.remoteSuffix).replace(/\/+/g, '/')
            : remoteBase;
          if (item.isDir) {
            await ftpUploadDir(ftp, item.localPath, remoteDest, remoteBase, manifest, updated, savedFiles);
          } else {
            const key = item.remoteSuffix;
            const hash = await hashFile(item.localPath);
            if (manifest.files[key] === hash) continue;
            const remoteDir = remoteDest.substring(0, remoteDest.lastIndexOf('/')) || '/';
            await ftp.ensureDir(remoteDir);
            await ftp.cd(remoteDir);
            await ftp.uploadFrom(item.localPath, path.basename(remoteDest));
            updated.files[key] = hash;
            updated._changed = true;
            savedFiles.push({ path: key, direction: 'to-target', action: 'copied' });
          }
        }

        if (updated._changed) {
          delete updated._changed;
          const { Readable } = require('stream');
          await ftp.cd(remoteBase);
          await ftp.uploadFrom(Readable.from([JSON.stringify(updated, null, 2)]), 'cmt-manifest.json');
          await saveFtpManifest(updated);
        }
      } else {
        let remoteManifest = { version: 1, files: {} };
        try {
          const { Writable } = require('stream');
          const chunks = [];
          const ws = new Writable({ write(c, _, cb) { chunks.push(c); cb(); } });
          await ftp.cd(remoteBase);
          await ftp.downloadTo(ws, 'cmt-manifest.json');
          remoteManifest = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch { }

        for (const item of items) {
          const remoteDest = item.remoteSuffix
            ? (remoteBase + '/' + item.remoteSuffix).replace(/\/+/g, '/')
            : remoteBase;
          if (item.isDir) {
            await ftpDownloadDir(ftp, remoteDest, item.localPath, remoteBase, remoteManifest, savedFiles);
          } else {
            const key = item.remoteSuffix;
            const remoteHash = remoteManifest.files[key];
            if (remoteHash) {
              try {
                const localHash = await hashFile(item.localPath);
                if (localHash === remoteHash) continue;
              } catch { }
            }
            const remoteDir = remoteDest.substring(0, remoteDest.lastIndexOf('/')) || '/';
            try {
              await ftp.cd(remoteDir);
              await ftp.downloadTo(item.localPath, item.remoteSuffix);
              savedFiles.push({ path: key, direction: 'to-source', action: 'copied' });
            } catch (e) {
              if (!String(e.message).includes('550')) throw e;
            }
          }
        }
        await saveFtpManifest(remoteManifest);
      }
      if (savedFiles.length > 0) {
        await appendSyncLog({
          type: 'ftp',
          mode: 'ftp-' + direction,
          target: cfg.host + (cfg.remotePath || '/'),
          saved: savedFiles,
          deleted: [],
          archived: [],
          errors: []
        });
      }
      if (direction === 'download') {
        _broadcastDataChanged(null, 'general-config.html', {
          action: 'sync-complete',
          target: 'user',
          remote: 'ftp'
        });
      }
      return { ok: true, copied: savedFiles.length };
    } catch (err) {
      await appendSyncLog({
        type: 'ftp',
        mode: 'ftp-' + direction,
        target: cfg.host + (cfg.remotePath || '/'),
        saved: savedFiles,
        deleted: [],
        archived: [],
        errors: [{ path: '', error: err.message }]
      });
      return { ok: false, error: err.message };
    } finally {
      ftp.close();
      _ftpTransferRunning = false;
    }
  }

  // ── Google Drive Sync ─────────────────────────────────────────────────────────

  function getDriveConfigPath() {
    return path.join(app.getPath('userData'), 'drive-config.json');
  }

  async function loadDriveConfig() {
    try { return JSON.parse(await fs.readFile(getDriveConfigPath(), 'utf8')) || {}; } catch { return {}; }
  }

  async function saveDriveConfig(cfg) {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(getDriveConfigPath(), JSON.stringify(cfg, null, 2), 'utf8');
  }

  function buildOAuth2Client(clientId, clientSecret, redirectPort) {
    const { auth } = require('@googleapis/drive');
    return new auth.OAuth2(clientId, clientSecret, `http://localhost:${redirectPort}`);
  }

  async function startDriveOAuthFlow(cfg) {
    return new Promise((resolve, reject) => {
      const server = http.createServer();
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        const oauth2 = buildOAuth2Client(cfg.clientId, cfg.clientSecret, port);
        const authUrl = oauth2.generateAuthUrl({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/drive.file'],
          prompt: 'consent',
        });

        let authWin = new BrowserWindow({
          width: 620, height: 720,
          title: 'Connect to Google Drive',
          webPreferences: { nodeIntegration: false, contextIsolation: true },
        });

        let handled = false;

        server.on('request', async (req, res) => {
          if (handled) return;
          const urlObj = new URL(req.url, `http://localhost:${port}`);
          const code = urlObj.searchParams.get('code');
          const oauthError = urlObj.searchParams.get('error');
          const msg = oauthError ? 'Authorization cancelled.' : 'Authorization successful! You can close this window.';
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>${msg}</h2></body></html>`);
          setTimeout(() => { try { authWin && authWin.close(); } catch { } }, 1600);
          server.close();
          handled = true;

          if (oauthError || !code) { reject(new Error(oauthError || 'No authorization code received')); return; }

          try {
            const { tokens } = await oauth2.getToken(code);
            oauth2.setCredentials(tokens);
            let email = '';
            try {
              const info = await oauth2.request({ url: 'https://www.googleapis.com/oauth2/v2/userinfo' });
              email = (info.data && info.data.email) || '';
            } catch { }
            const updated = { ...cfg, tokens, userEmail: email };
            await saveDriveConfig(updated);
            resolve({ ok: true, email });
          } catch (err) { reject(err); }
        });

        server.on('error', (err) => { if (!handled) reject(err); });
        authWin.on('closed', () => {
          authWin = null;
          if (!handled) { handled = true; server.close(); reject(new Error('Window closed by user')); }
        });
        authWin.loadURL(authUrl);
      });
    });
  }

  async function getDriveApiClient(cfg) {
    if (!cfg.tokens) throw new Error('Not connected to Google Drive.');
    const { drive } = require('@googleapis/drive');
    const oauth2 = buildOAuth2Client(cfg.clientId, cfg.clientSecret, 0);
    oauth2.setCredentials(cfg.tokens);
    oauth2.on('tokens', async (newTokens) => {
      const latest = await loadDriveConfig();
      await saveDriveConfig({ ...latest, tokens: { ...latest.tokens, ...newTokens } }).catch(() => { });
    });
    return drive({ version: 'v3', auth: oauth2 });
  }

  let _driveTransferRunning = false;

  function getDriveManifestPath() {
    return path.join(app.getPath('userData'), 'drive-manifest.json');
  }

  async function loadDriveManifest() {
    try { return JSON.parse(await fs.readFile(getDriveManifestPath(), 'utf8')); } catch { return { version: 1, files: {} }; }
  }

  async function saveDriveManifest(manifest) {
    await fs.writeFile(getDriveManifestPath(), JSON.stringify(manifest, null, 2), 'utf8');
  }

  function escapeDriveQueryVal(str) {
    return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  async function driveEnsureFolder(drive, name, parentId) {
    const safeName = escapeDriveQueryVal(name);
    const q = `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and trashed=false` +
      (parentId ? ` and '${escapeDriveQueryVal(parentId)}' in parents` : '');
    const res = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive' });
    if (res.data.files.length > 0) return res.data.files[0].id;
    const f = await drive.files.create({
      requestBody: { name, mimeType: 'application/vnd.google-apps.folder', ...(parentId ? { parents: [parentId] } : {}) },
      fields: 'id',
    });
    return f.data.id;
  }

  async function driveUpsertFile(drive, localPath, name, parentId, relKey, manifest, updated, savedFiles) {
    const hash = await hashFile(localPath);
    if (manifest && manifest.files && manifest.files[relKey] === hash) return;
    const safeName = escapeDriveQueryVal(name);
    const safeParent = escapeDriveQueryVal(parentId);
    const res = await drive.files.list({
      q: `name='${safeName}' and '${safeParent}' in parents and trashed=false`,
      fields: 'files(id)',
    });
    const media = { mimeType: 'application/octet-stream', body: fsSync.createReadStream(localPath) };
    if (res.data.files.length > 0) {
      const existingId = res.data.files[0].id;
      // Try to rename the old copy to a timestamped .bak; fall back to update-in-place if it fails.
      let renamed = false;
      try {
        await drive.files.update({ fileId: existingId, requestBody: { name: `${name}.${bakTimestamp()}.bak` } });
        renamed = true;
      } catch { }
      if (renamed) {
        await drive.files.create({ requestBody: { name, parents: [parentId] }, media, fields: 'id' });
      } else {
        await drive.files.update({ fileId: existingId, media });
      }
    } else {
      await drive.files.create({ requestBody: { name, parents: [parentId] }, media, fields: 'id' });
    }
    if (updated) {
      updated.files[relKey] = hash;
      updated._changed = true;
    }
    if (savedFiles) savedFiles.push({ path: relKey, direction: 'to-target', action: 'copied' });
  }

  async function driveUploadDir(drive, localDir, parentId, relPrefix, manifest, updated, savedFiles) {
    let entries = [];
    try { entries = await fs.readdir(localDir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const fullPath = path.join(localDir, e.name);
      const relKey = relPrefix ? `${relPrefix}/${e.name}` : e.name;
      if (e.isDirectory()) {
        const subId = await driveEnsureFolder(drive, e.name, parentId);
        await driveUploadDir(drive, fullPath, subId, relKey, manifest, updated, savedFiles);
      } else {
        await driveUpsertFile(drive, fullPath, e.name, parentId, relKey, manifest, updated, savedFiles);
      }
    }
  }

  async function driveDownloadDir(drive, driveFolderId, localDir, relPrefix, manifest, updated, savedFiles) {
    await fs.mkdir(localDir, { recursive: true });
    const res = await drive.files.list({
      q: `'${escapeDriveQueryVal(driveFolderId)}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType)',
      pageSize: 1000,
    });
    for (const file of res.data.files) {
      const localPath = path.join(localDir, file.name);
      const relKey = relPrefix ? `${relPrefix}/${file.name}` : file.name;
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        await driveDownloadDir(drive, file.id, localPath, relKey, manifest, updated, savedFiles);
      } else {
        if (manifest && manifest.files && manifest.files[relKey]) {
          try {
            const localHash = await hashFile(localPath);
            if (localHash === manifest.files[relKey]) continue;
          } catch { }
        }
        await bakIfExists(localPath);
        const dest = fsSync.createWriteStream(localPath);
        const dl = await drive.files.get({ fileId: file.id, alt: 'media' }, { responseType: 'stream' });
        await new Promise((resolve, reject) => { dl.data.pipe(dest); dest.on('finish', resolve); dest.on('error', reject); });
        if (updated) {
          try { updated.files[relKey] = await hashFile(localPath); updated._changed = true; } catch { }
        }
        if (savedFiles) savedFiles.push({ path: relKey, direction: 'to-source', action: 'copied' });
      }
    }
  }

  async function runDriveTransfer(direction) {
    if (_driveTransferRunning) return { ok: false, error: 'Google Drive transfer already in progress.' };
    const cfg = await loadDriveConfig();
    if (!cfg.tokens) return { ok: false, error: 'Not connected to Google Drive.' };
    _driveTransferRunning = true;
    const savedFiles = [];
    const folderName = cfg.driveFolderName || 'Class Management Tools';
    try {
      const drive = await getDriveApiClient(cfg);
      const rootId = await driveEnsureFolder(drive, folderName, null);
      const userFolderId = await driveEnsureFolder(drive, 'user', rootId);
      const userDir = path.join(getWritableRootDir(), 'user');
      const items = await collectRemoteItems(userDir, cfg.subfolders);
      const manifest = await loadDriveManifest();
      const updated = { version: 1, files: { ...manifest.files }, _changed: false };

      for (const item of items) {
        if (direction === 'upload') {
          if (item.isDir) {
            const subId = await driveEnsureFolder(drive, item.remoteSuffix || 'data', userFolderId);
            await driveUploadDir(drive, item.localPath, subId, item.remoteSuffix || '', manifest, updated, savedFiles);
          } else {
            await driveUpsertFile(drive, item.localPath, item.remoteSuffix, userFolderId, item.remoteSuffix, manifest, updated, savedFiles);
          }
        } else {
          if (item.isDir) {
            const res = await drive.files.list({
              q: `name='${escapeDriveQueryVal(item.remoteSuffix)}' and '${escapeDriveQueryVal(userFolderId)}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
              fields: 'files(id)',
            });
            if (res.data.files.length > 0) {
              await driveDownloadDir(drive, res.data.files[0].id, path.join(userDir, item.remoteSuffix), item.remoteSuffix || '', manifest, updated, savedFiles);
            }
          } else {
            const res = await drive.files.list({
              q: `name='${escapeDriveQueryVal(item.remoteSuffix)}' and '${escapeDriveQueryVal(userFolderId)}' in parents and trashed=false`,
              fields: 'files(id)',
            });
            if (res.data.files.length > 0) {
              const localFilePath = path.join(userDir, item.remoteSuffix);
              const relKey = item.remoteSuffix;
              let skip = false;
              if (manifest.files && manifest.files[relKey]) {
                try {
                  if (await hashFile(localFilePath) === manifest.files[relKey]) skip = true;
                } catch { }
              }
              if (!skip) {
                await bakIfExists(localFilePath);
                const dest = fsSync.createWriteStream(localFilePath);
                const dl = await drive.files.get({ fileId: res.data.files[0].id, alt: 'media' }, { responseType: 'stream' });
                await new Promise((resolve, reject) => { dl.data.pipe(dest); dest.on('finish', resolve); dest.on('error', reject); });
                try { updated.files[relKey] = await hashFile(localFilePath); updated._changed = true; } catch { }
                savedFiles.push({ path: relKey, direction: 'to-source', action: 'copied' });
              }
            }
          }
        }
      }
      if (updated._changed) {
        delete updated._changed;
        await saveDriveManifest(updated);
      }
      await saveDriveConfig({ ...cfg, driveFolderId: rootId });
      if (savedFiles.length > 0) {
        await appendSyncLog({
          type: 'drive',
          mode: 'drive-' + direction,
          target: folderName,
          saved: savedFiles,
          deleted: [],
          archived: [],
          errors: []
        });
      }
      if (direction === 'download') {
        _broadcastDataChanged(null, 'general-config.html', {
          action: 'sync-complete',
          target: 'user',
          remote: 'drive'
        });
      }
      return { ok: true, copied: savedFiles.length };
    } catch (err) {
      await appendSyncLog({
        type: 'drive',
        mode: 'drive-' + direction,
        target: folderName,
        saved: savedFiles,
        deleted: [],
        archived: [],
        errors: [{ path: '', error: err.message }]
      });
      return { ok: false, error: err.message };
    } finally {
      _driveTransferRunning = false;
    }
  }

  // ── WebDAV Sync ───────────────────────────────────────────────────────────────

  function getWebdavConfigPath() {
    return path.join(app.getPath('userData'), 'webdav-config.json');
  }

  async function loadWebdavConfig() {
    try { return JSON.parse(await fs.readFile(getWebdavConfigPath(), 'utf8')) || {}; } catch { return {}; }
  }

  async function saveWebdavConfig(cfg) {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(getWebdavConfigPath(), JSON.stringify(cfg, null, 2), 'utf8');
  }

  let _webdavAutoSyncTimer = null;
  let _webdavTransferRunning = false;

  function getWebdavManifestPath() {
    return path.join(app.getPath('userData'), 'webdav-manifest.json');
  }

  async function loadWebdavManifest() {
    try { return JSON.parse(await fs.readFile(getWebdavManifestPath(), 'utf8')); } catch { return { version: 1, files: {} }; }
  }

  async function saveWebdavManifest(manifest) {
    await fs.writeFile(getWebdavManifestPath(), JSON.stringify(manifest, null, 2), 'utf8');
  }

  function stopWebdavAutoSyncTimer() {
    if (_webdavAutoSyncTimer) { clearInterval(_webdavAutoSyncTimer); _webdavAutoSyncTimer = null; }
  }

  async function startWebdavAutoSyncTimer() {
    stopWebdavAutoSyncTimer();
    const cfg = await loadWebdavConfig();
    if (!cfg.autoSync || !cfg.serverUrl) return;
    const intervalMs = Math.max(5, cfg.syncIntervalMinutes || 30) * 60 * 1000;
    _webdavAutoSyncTimer = setInterval(() => { runWebdavTransfer('upload').catch(() => { }); }, intervalMs);
  }

  async function webdavEnsureDir(client, remotePath) {
    const parts = remotePath.replace(/\/+$/, '').split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current += '/' + part;
      try { if (!await client.exists(current)) await client.createDirectory(current); } catch { }
    }
  }

  async function webdavBakRemote(client, remotePath) {
    try {
      await client.moveFile(remotePath, `${remotePath}.${bakTimestamp()}.bak`);
    } catch { }
  }

  async function webdavUploadDir(client, localDir, remotePath, relPrefix, manifest, updated, savedFiles) {
    await webdavEnsureDir(client, remotePath);
    let entries = [];
    try { entries = await fs.readdir(localDir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const lp = path.join(localDir, entry.name);
      const rp = remotePath.replace(/\/+$/, '') + '/' + entry.name;
      const relKey = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await webdavUploadDir(client, lp, rp, relKey, manifest, updated, savedFiles);
      } else {
        const hash = await hashFile(lp);
        if (manifest && manifest.files && manifest.files[relKey] === hash) continue;
        await webdavBakRemote(client, rp);
        const content = await fs.readFile(lp);
        await client.putFileContents(rp, content, { overwrite: true });
        if (updated) { updated.files[relKey] = hash; updated._changed = true; }
        if (savedFiles) savedFiles.push({ path: relKey, direction: 'to-target', action: 'copied' });
      }
    }
  }

  async function webdavDownloadDir(client, remotePath, localDir, relPrefix, manifest, updated, savedFiles) {
    await fs.mkdir(localDir, { recursive: true });
    let items = [];
    try { items = await client.getDirectoryContents(remotePath); } catch { return; }
    for (const item of items) {
      const lp = path.join(localDir, item.basename);
      const relKey = relPrefix ? `${relPrefix}/${item.basename}` : item.basename;
      if (item.type === 'directory') {
        await webdavDownloadDir(client, item.filename, lp, relKey, manifest, updated, savedFiles);
      } else {
        if (manifest && manifest.files && manifest.files[relKey]) {
          try {
            if (await hashFile(lp) === manifest.files[relKey]) continue;
          } catch { }
        }
        await bakIfExists(lp);
        const content = await client.getFileContents(item.filename);
        await fs.writeFile(lp, Buffer.isBuffer(content) ? content : Buffer.from(content));
        if (updated) {
          try { updated.files[relKey] = await hashFile(lp); updated._changed = true; } catch { }
        }
        if (savedFiles) savedFiles.push({ path: relKey, direction: 'to-source', action: 'copied' });
      }
    }
  }

  async function runWebdavTransfer(direction) {
    if (_webdavTransferRunning) return { ok: false, error: 'WebDAV transfer already in progress.' };
    const cfg = await loadWebdavConfig();
    if (!cfg.serverUrl) return { ok: false, error: 'No server URL configured.' };
    _webdavTransferRunning = true;
    const savedFiles = [];
    try {
      const { createClient } = require('webdav');
      const client = createClient(cfg.serverUrl, {
        username: cfg.username || '',
        password: cfg.password || '',
      });
      const userDir = path.join(getWritableRootDir(), 'user');
      const remoteBase = (cfg.remotePath || '/classtools').replace(/\/+$/, '') || '/classtools';
      const items = await collectRemoteItems(userDir, cfg.subfolders);
      const manifest = await loadWebdavManifest();
      const updated = { version: 1, files: { ...manifest.files }, _changed: false };

      for (const item of items) {
        const remoteDest = item.remoteSuffix
          ? (remoteBase + '/' + item.remoteSuffix).replace(/\/+/g, '/')
          : remoteBase;
        if (direction === 'upload') {
          if (item.isDir) {
            await webdavUploadDir(client, item.localPath, remoteDest, item.remoteSuffix || '', manifest, updated, savedFiles);
          } else {
            const relKey = item.remoteSuffix;
            const hash = await hashFile(item.localPath);
            if (manifest.files && manifest.files[relKey] === hash) continue;
            const remoteDir = remoteDest.substring(0, remoteDest.lastIndexOf('/')) || '/';
            await webdavEnsureDir(client, remoteDir);
            await webdavBakRemote(client, remoteDest);
            const content = await fs.readFile(item.localPath);
            await client.putFileContents(remoteDest, content, { overwrite: true });
            updated.files[relKey] = hash;
            updated._changed = true;
            savedFiles.push({ path: relKey, direction: 'to-target', action: 'copied' });
          }
        } else {
          if (item.isDir) {
            await webdavDownloadDir(client, remoteDest, item.localPath, item.remoteSuffix || '', manifest, updated, savedFiles);
          } else {
            try {
              const relKey = item.remoteSuffix;
              let skip = false;
              if (manifest.files && manifest.files[relKey]) {
                try {
                  if (await hashFile(item.localPath) === manifest.files[relKey]) skip = true;
                } catch { }
              }
              if (!skip) {
                await bakIfExists(item.localPath);
                const content = await client.getFileContents(remoteDest);
                await fs.writeFile(item.localPath, Buffer.isBuffer(content) ? content : Buffer.from(content));
                try { updated.files[relKey] = await hashFile(item.localPath); updated._changed = true; } catch { }
                savedFiles.push({ path: relKey, direction: 'to-source', action: 'copied' });
              }
            } catch (e) {
              if (!String(e.message).includes('404') && !String(e.message).includes('Not Found')) throw e;
            }
          }
        }
      }
      if (updated._changed) {
        delete updated._changed;
        await saveWebdavManifest(updated);
      }
      if (savedFiles.length > 0) {
        await appendSyncLog({
          type: 'webdav',
          mode: 'webdav-' + direction,
          target: cfg.serverUrl,
          saved: savedFiles,
          deleted: [],
          archived: [],
          errors: []
        });
      }
      if (direction === 'download') {
        _broadcastDataChanged(null, 'general-config.html', {
          action: 'sync-complete',
          target: 'user',
          remote: 'webdav'
        });
      }
      return { ok: true, copied: savedFiles.length };
    } catch (err) {
      await appendSyncLog({
        type: 'webdav',
        mode: 'webdav-' + direction,
        target: cfg.serverUrl,
        saved: savedFiles,
        deleted: [],
        archived: [],
        errors: [{ path: '', error: err.message }]
      });
      return { ok: false, error: err.message };
    } finally {
      _webdavTransferRunning = false;
    }
  }

  // Resolve the effective destination directory for sync.
  // The user picks a sync folder that should directly mirror writableRoot/user/.
  // For backward compat, if syncLocation/user/ already has content, use that
  // (old installs that synced to a parent folder).
  async function resolveSyncDestDir(syncLocation) {
    const nestedUserPath = path.join(syncLocation, 'user');
    try {
      const entries = (await fs.readdir(nestedUserPath)).filter(e => e !== 'sync-baseline.json');
      if (entries.length > 0) return nestedUserPath;
    } catch { }
    return syncLocation;
  }

  // mode: 'to-target' | 'to-source' | 'both'
  // source = writableRoot/user, dest = resolved sync destination
  // baseline: { map: Map<string,{mtimeMs,size}>, prefix: string } | null
  //   map keys are relative paths within srcDir; prefix is prepended (empty = no prefix).
  async function syncTrees(srcDir, destDir, mode, { autoNew = true, baseline = null, mtimeTolMs = 0 } = {}) {
    let copied = 0;
    const errors = [];
    const conflicts = [];
    const added = [];
    const newFiles = [];
    const synced = []; // files auto-resolved via baseline; entries: { relativePath, mtimeMs, size }
    const savedFiles = []; // files actually copied/updated during this sync run

    function sameFile(a, b) {
      const diff = Math.abs(a.mtimeMs - b.mtimeMs);
      if (diff < 1000) return true;
      if (isTzOnlyDiff(a, b)) return true;
      return mtimeTolMs > 0 && diff <= mtimeTolMs && a.size === b.size;
    }

    function changedVsBase(entry, base) {
      if (entry.size !== base.size) return true;
      const diff = Math.abs(entry.mtimeMs - base.mtimeMs);
      return diff >= 1000 && (mtimeTolMs === 0 || diff > mtimeTolMs);
    }

    async function collectFiles(dir, prefix) {
      const result = new Map();
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return result;
      }
      for (const entry of entries) {
        // Never sync the baseline file — it is machine-specific
        if (entry.isFile() && entry.name === 'sync-baseline.json') continue;
        const rel = prefix ? prefix + '/' + entry.name : entry.name;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const sub = await collectFiles(fullPath, rel);
          for (const [k, v] of sub) result.set(k, v);
        } else if (entry.isFile()) {
          try {
            const stat = await fs.stat(fullPath);
            result.set(rel, { fullPath, mtimeMs: stat.mtimeMs, size: stat.size });
          } catch {
            result.set(rel, { fullPath, mtimeMs: 0, size: 0 });
          }
        }
      }
      return result;
    }

    async function copyOne(fromPath, toPath) {
      await fs.mkdir(path.dirname(toPath), { recursive: true });
      await fs.copyFile(fromPath, toPath);
      const stat = await fs.stat(fromPath);
      await fs.utimes(toPath, stat.atime, stat.mtime).catch(() => { });
    }

    const srcFiles = await collectFiles(srcDir, '');
    const destFiles = await collectFiles(destDir, '');

    // FAT32 / Windows filesystems store timestamps in local time; on Linux these appear
    // offset by a whole number of hours (commonly 1 or 2 h) compared to an ext4 folder.
    // If sizes match and the diff is exactly a multiple of 3 600 s, treat files as identical.
    function isTzOnlyDiff(a, b) {
      if (a.size !== b.size) return false;
      const diffMs = Math.abs(a.mtimeMs - b.mtimeMs);
      return diffMs > 0 && diffMs % 3_600_000 === 0;
    }

    const deleted = [];

    async function deleteAndPrune(targetDir, relativePath) {
      const fullPath = path.join(targetDir, relativePath);
      try {
        await fs.unlink(fullPath);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      let dir = path.dirname(fullPath);
      const resolvedTarget = path.resolve(targetDir);
      while (dir.startsWith(resolvedTarget) && dir !== resolvedTarget) {
        try {
          const entries = await fs.readdir(dir);
          if (entries.length === 0) {
            await fs.rmdir(dir);
            dir = path.dirname(dir);
          } else {
            break;
          }
        } catch {
          break;
        }
      }
    }

    if (mode === 'mirror-to-target') {
      // 1. Copy / update from src (user/) to dest (sync target)
      for (const [rel, srcEntry] of srcFiles) {
        const destEntry = destFiles.get(rel);
        if (!destEntry || !sameFile(srcEntry, destEntry)) {
          try {
            await copyOne(srcEntry.fullPath, path.join(destDir, rel));
            const stat = await fs.stat(path.join(destDir, rel));
            copied++;
            synced.push({ relativePath: rel, mtimeMs: stat.mtimeMs, size: stat.size });
            savedFiles.push({ path: rel, direction: 'to-target', action: 'copied', size: stat.size });
          } catch (err) {
            errors.push({ path: rel, error: String(err?.message || err) });
          }
        } else {
          synced.push({ relativePath: rel, mtimeMs: destEntry.mtimeMs, size: destEntry.size });
        }
      }
      // 2. Delete any files in dest that do not exist in src
      for (const [rel, destEntry] of destFiles) {
        if (!srcFiles.has(rel)) {
          try {
            await deleteAndPrune(destDir, rel);
            deleted.push(rel);
          } catch (err) {
            errors.push({ path: rel, error: String(err?.message || err) });
          }
        }
      }
    } else if (mode === 'mirror-to-source') {
      // 1. Copy / update from dest (sync target) to src (user/)
      for (const [rel, destEntry] of destFiles) {
        const srcEntry = srcFiles.get(rel);
        if (!srcEntry || !sameFile(srcEntry, destEntry)) {
          try {
            await copyOne(destEntry.fullPath, path.join(srcDir, rel));
            const stat = await fs.stat(path.join(srcDir, rel));
            copied++;
            synced.push({ relativePath: rel, mtimeMs: stat.mtimeMs, size: stat.size });
            savedFiles.push({ path: rel, direction: 'to-source', action: 'copied', size: stat.size });
          } catch (err) {
            errors.push({ path: rel, error: String(err?.message || err) });
          }
        } else {
          synced.push({ relativePath: rel, mtimeMs: srcEntry.mtimeMs, size: srcEntry.size });
        }
      }
      // 2. Delete any files in src that do not exist in dest
      for (const [rel, srcEntry] of srcFiles) {
        if (!destFiles.has(rel)) {
          try {
            await deleteAndPrune(srcDir, rel);
            deleted.push(rel);
          } catch (err) {
            errors.push({ path: rel, error: String(err?.message || err) });
          }
        }
      }
    } else if (mode === 'to-target') {
      for (const [rel, srcEntry] of srcFiles) {
        const destEntry = destFiles.get(rel);
        if (!destEntry) {
          if (autoNew) {
            // new file on source side -> copy to dest automatically
            try { await copyOne(srcEntry.fullPath, path.join(destDir, rel)); copied++; added.push(rel); savedFiles.push({ path: rel, direction: 'to-target', action: 'copied', size: srcEntry.size }); }
            catch (err) { errors.push({ path: rel, error: String(err?.message || err) }); }
          } else {
            newFiles.push({ relativePath: rel, kind: 'new', side: 'src-only', changeType: 'new', srcSize: srcEntry.size, srcMtimeMs: srcEntry.mtimeMs, destSize: null, destMtimeMs: null });
          }
        } else if (!sameFile(srcEntry, destEntry)) {
          conflicts.push({
            relativePath: rel,
            kind: 'conflict',
            sideChanged: 'src',
            srcSize: srcEntry.size, srcMtimeMs: srcEntry.mtimeMs,
            destSize: destEntry.size, destMtimeMs: destEntry.mtimeMs
          });
        }
        // same timestamp (or tz-only offset with same size) → skip
      }
    } else if (mode === 'to-source') {
      for (const [rel, destEntry] of destFiles) {
        const srcEntry = srcFiles.get(rel);
        if (!srcEntry) {
          if (autoNew) {
            // new file in sync folder -> copy to source automatically
            try { await copyOne(destEntry.fullPath, path.join(srcDir, rel)); copied++; added.push(rel); savedFiles.push({ path: rel, direction: 'to-source', action: 'copied', size: destEntry.size }); }
            catch (err) { errors.push({ path: rel, error: String(err?.message || err) }); }
          } else {
            newFiles.push({ relativePath: rel, kind: 'new', side: 'dest-only', changeType: 'new', srcSize: null, srcMtimeMs: null, destSize: destEntry.size, destMtimeMs: destEntry.mtimeMs });
          }
        } else if (!sameFile(srcEntry, destEntry)) {
          conflicts.push({
            relativePath: rel,
            kind: 'conflict',
            sideChanged: 'dest',
            srcSize: srcEntry.size, srcMtimeMs: srcEntry.mtimeMs,
            destSize: destEntry.size, destMtimeMs: destEntry.mtimeMs
          });
        }
      }
    } else {
      // both: 2-way sync with comprehensive diff detection (additions, deletions, modifications, conflicts)
      const allRels = new Set([...srcFiles.keys(), ...destFiles.keys()]);
      // Also clean up obsolete baseline entries where file was deleted on BOTH sides
      if (baseline && baseline.map) {
        for (const [baseKey] of baseline.map) {
          const rel = baseline.prefix && baseKey.startsWith(baseline.prefix + '/')
            ? baseKey.slice(baseline.prefix.length + 1)
            : baseKey;
          if (!srcFiles.has(rel) && !destFiles.has(rel)) {
            baseline.map.delete(baseKey);
          }
        }
      }

      let relIdx = 0;
      for (const rel of allRels) {
        if (++relIdx % 200 === 0) {
          await new Promise(r => setImmediate(r));
        }
        const srcEntry = srcFiles.get(rel);
        const destEntry = destFiles.get(rel);
        const baseKey = baseline ? (baseline.prefix ? baseline.prefix + '/' + rel : rel) : null;
        const base = (baseline && baseKey) ? baseline.map.get(baseKey) : null;

        try {
          if (srcEntry && !destEntry) {
            if (autoNew) {
              await copyOne(srcEntry.fullPath, path.join(destDir, rel)); copied++; added.push(rel);
              savedFiles.push({ path: rel, direction: 'to-target', action: 'copied', size: srcEntry.size });
            } else {
              if (base) {
                const srcChanged = changedVsBase(srcEntry, base);
                if (!srcChanged) {
                  // File in baseline and unchanged on src, but missing on dest → Deleted on dest (Sync)
                  newFiles.push({
                    relativePath: rel,
                    kind: 'deleted-dest',
                    side: 'src-only',
                    changeType: 'deleted-dest',
                    srcSize: srcEntry.size,
                    srcMtimeMs: srcEntry.mtimeMs,
                    destSize: null,
                    destMtimeMs: null,
                    baseSize: base.size,
                    baseMtimeMs: base.mtimeMs
                  });
                } else {
                  // File modified on src, but deleted on dest → Delete vs Modify conflict
                  conflicts.push({
                    relativePath: rel,
                    kind: 'conflict-delete-dest',
                    side: 'src-only',
                    changeType: 'conflict-delete-dest',
                    sideChanged: 'both',
                    srcSize: srcEntry.size,
                    srcMtimeMs: srcEntry.mtimeMs,
                    destSize: null,
                    destMtimeMs: null
                  });
                }
              } else {
                // No baseline → Brand new file added on App
                newFiles.push({
                  relativePath: rel,
                  kind: 'new',
                  side: 'src-only',
                  changeType: 'new',
                  srcSize: srcEntry.size,
                  srcMtimeMs: srcEntry.mtimeMs,
                  destSize: null,
                  destMtimeMs: null
                });
              }
            }
          } else if (!srcEntry && destEntry) {
            if (autoNew) {
              await copyOne(destEntry.fullPath, path.join(srcDir, rel)); copied++; added.push(rel);
              savedFiles.push({ path: rel, direction: 'to-source', action: 'copied', size: destEntry.size });
            } else {
              if (base) {
                const destChanged = changedVsBase(destEntry, base);
                if (!destChanged) {
                  // File in baseline and unchanged on dest, but missing on src → Deleted on src (App)
                  newFiles.push({
                    relativePath: rel,
                    kind: 'deleted-src',
                    side: 'dest-only',
                    changeType: 'deleted-src',
                    srcSize: null,
                    srcMtimeMs: null,
                    destSize: destEntry.size,
                    destMtimeMs: destEntry.mtimeMs,
                    baseSize: base.size,
                    baseMtimeMs: base.mtimeMs
                  });
                } else {
                  // File modified on dest, but deleted on src → Delete vs Modify conflict
                  conflicts.push({
                    relativePath: rel,
                    kind: 'conflict-delete-src',
                    side: 'dest-only',
                    changeType: 'conflict-delete-src',
                    sideChanged: 'both',
                    srcSize: null,
                    srcMtimeMs: null,
                    destSize: destEntry.size,
                    destMtimeMs: destEntry.mtimeMs
                  });
                }
              } else {
                // No baseline → Brand new file added on Sync
                newFiles.push({
                  relativePath: rel,
                  kind: 'new',
                  side: 'dest-only',
                  changeType: 'new',
                  srcSize: null,
                  srcMtimeMs: null,
                  destSize: destEntry.size,
                  destMtimeMs: destEntry.mtimeMs
                });
              }
            }
          } else if (srcEntry && destEntry) {
            if (sameFile(srcEntry, destEntry)) continue;

            if (base) {
              const srcChanged = changedVsBase(srcEntry, base);
              const destChanged = changedVsBase(destEntry, base);

              if (!srcChanged && !destChanged) {
                // Platform rounding artefact — files are effectively identical
                continue;
              }

              const sideChanged = (srcChanged && destChanged) ? 'both' : (srcChanged ? 'src' : 'dest');
              const kind = (srcChanged && destChanged) ? 'conflict' : (srcChanged ? 'modified-src' : 'modified-dest');

              conflicts.push({
                relativePath: rel,
                kind: kind,
                sideChanged: sideChanged,
                srcSize: srcEntry.size,
                srcMtimeMs: srcEntry.mtimeMs,
                destSize: destEntry.size,
                destMtimeMs: destEntry.mtimeMs
              });
            } else {
              // No baseline record: treat differing file as conflict
              conflicts.push({
                relativePath: rel,
                kind: 'conflict',
                sideChanged: 'both',
                srcSize: srcEntry.size,
                srcMtimeMs: srcEntry.mtimeMs,
                destSize: destEntry.size,
                destMtimeMs: destEntry.mtimeMs
              });
            }
          }
        } catch (err) {
          errors.push({ path: rel, error: String(err?.message || err) });
        }
      }
    }
    return { copied, errors, conflicts, added, newFiles, synced, deleted, savedFiles };
  }

  async function copyTreeForBackup(sourceDir, destDir, options = {}) {
    return runBackupWorker({
      op: 'folder',
      sourceDir,
      destDir,
      excludeRedownloadable: Boolean(options.excludeRedownloadable)
    });
  }

  ipcMain.handle('app:get-backup-location', async () => {
    const cfg = await loadSavedBackupConfig();
    return {
      ok: true,
      backupLocation: cfg.backupLocation,
      backupFormat: cfg.backupFormat,
      backupScheduleEnabled: cfg.backupScheduleEnabled,
      backupIntervalDays: cfg.backupIntervalDays,
      lastBackupTime: cfg.lastBackupTime
    };
  });

  ipcMain.handle('app:set-backup-format', async (_event, { format } = {}) => {
    const valid = ['folder', 'zip', 'targz'].includes(format) ? format : 'folder';
    await saveBackupConfig({ backupFormat: valid });
    return { ok: true, backupFormat: valid };
  });

  ipcMain.handle('app:set-backup-schedule', async (_event, { enabled, intervalDays } = {}) => {
    const validInterval = Number.isFinite(intervalDays) ? Math.max(1, Math.min(365, parseInt(intervalDays, 10))) : 7;
    const cfg = await saveBackupConfig({
      backupScheduleEnabled: Boolean(enabled),
      backupIntervalDays: validInterval
    });
    return { ok: true, backupScheduleEnabled: cfg.backupScheduleEnabled, backupIntervalDays: cfg.backupIntervalDays };
  });

  ipcMain.handle('app:check-scheduled-backup', async () => {
    const cfg = await loadSavedBackupConfig();
    if (!cfg.backupScheduleEnabled || !cfg.backupLocation) {
      return { ok: true, due: false, backupScheduleEnabled: cfg.backupScheduleEnabled, backupLocation: cfg.backupLocation };
    }
    const intervalMs = (cfg.backupIntervalDays || 7) * 24 * 60 * 60 * 1000;
    let due = false;
    let daysElapsed = 0;
    if (!cfg.lastBackupTime) {
      due = true;
      daysElapsed = cfg.backupIntervalDays;
    } else {
      const lastMs = new Date(cfg.lastBackupTime).getTime();
      if (isNaN(lastMs)) {
        due = true;
        daysElapsed = cfg.backupIntervalDays;
      } else {
        const diffMs = Date.now() - lastMs;
        daysElapsed = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        if (diffMs >= intervalMs) {
          due = true;
        }
      }
    }
    return {
      ok: true,
      due,
      daysElapsed,
      intervalDays: cfg.backupIntervalDays,
      lastBackupTime: cfg.lastBackupTime,
      backupLocation: cfg.backupLocation
    };
  });

  ipcMain.handle('app:pick-backup-location', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Choose a folder for backups',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Use this folder'
    });

    if (canceled || !filePaths?.[0]) {
      return { ok: false, canceled: true };
    }

    const selected = path.resolve(String(filePaths[0]));

    try {
      await fs.access(selected, fsSync.constants.W_OK);
    } catch {
      return { ok: false, canceled: false, error: 'Selected folder is not writable.' };
    }

    const cfg = await saveBackupConfig({ backupLocation: selected });
    return { ok: true, canceled: false, backupLocation: selected, backupFormat: cfg.backupFormat };
  });

  ipcMain.handle('app:run-backup', async (_event, request = {}) => {
    const cfg = await loadSavedBackupConfig();
    const backupLocation = cfg.backupLocation;
    if (!backupLocation) {
      return { ok: false, error: 'No backup location configured.' };
    }

    try {
      await fs.access(backupLocation, fsSync.constants.W_OK);
    } catch {
      return { ok: false, error: 'Backup folder is not accessible or not writable.' };
    }

    const format = ['folder', 'zip', 'targz'].includes(request?.format)
      ? request.format
      : cfg.backupFormat;

    const writableRoot = getWritableRootDir();
    const userDir = path.join(writableRoot, 'user');

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;

    let response;
    if (format === 'zip') {
      const targetFile = path.join(backupLocation, `backup_${timestamp}.zip`);
      const result = await createZipBackup(userDir, targetFile);
      response = { ok: result.ok, copied: result.copied, errors: result.errors, backupLocation: targetFile };
    } else if (format === 'targz') {
      const targetFile = path.join(backupLocation, `backup_${timestamp}.tar.gz`);
      const result = await createTarGzBackup(userDir, targetFile);
      response = { ok: result.ok, copied: result.copied, errors: result.errors, backupLocation: targetFile };
    } else {
      const sources = [
        { dir: userDir, prefix: 'user' }
      ];
      const destRoot = path.join(backupLocation, timestamp);
      let totalCopied = 0;
      const allErrors = [];

      for (const { dir, prefix } of sources) {
        const destDir = path.join(destRoot, prefix);
        const result = await copyTreeForBackup(dir, destDir, { excludeRedownloadable: true });
        totalCopied += result.copied;
        allErrors.push(...result.errors);
      }

      response = { ok: true, copied: totalCopied, errors: allErrors, backupLocation: destRoot };
    }

    if (response && response.ok) {
      await saveBackupConfig({ lastBackupTime: now.toISOString() });
    }

    return response;
  });

  ipcMain.handle('app:get-sync-location', async () => {
    const syncLocation = await loadSavedSyncLocation();
    const accessible = syncLocation ? await checkSyncLocationAccessible(syncLocation) : false;
    const startupCfg = await loadStartupSyncConfig();
    const autoSync = await loadAutoSyncEnabled();
    return {
      ok: true,
      syncLocation,
      accessible,
      autoSync,
      startupSync: startupCfg.startupSync,
      startupSyncMode: startupCfg.startupSyncMode
    };
  });

  ipcMain.handle('app:set-startup-sync', async (_event, { enabled, mode } = {}) => {
    const startupSync = enabled === true;
    const startupSyncMode = (mode === 'auto') ? 'auto' : 'prompt';
    await saveStartupSyncConfig(startupSync, startupSyncMode);
    return { ok: true, startupSync, startupSyncMode };
  });

  ipcMain.handle('app:check-sync-accessibility', async (_event, { path: checkPath } = {}) => {
    const target = checkPath || (await loadSavedSyncLocation());
    const accessible = await checkSyncLocationAccessible(target);
    return { ok: true, syncLocation: target, accessible };
  });

  ipcMain.handle('app:pick-sync-location', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Choose a folder to sync with',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Use this folder'
    });

    if (canceled || !filePaths?.[0]) {
      return { ok: false, canceled: true };
    }

    const selected = path.resolve(String(filePaths[0]));
    const userDir = path.resolve(path.join(getWritableRootDir(), 'user'));
    const resolvedDest = path.resolve(await resolveSyncDestDir(selected));
    if (
      selected === userDir ||
      selected.startsWith(userDir + path.sep) ||
      resolvedDest === userDir ||
      resolvedDest.startsWith(userDir + path.sep)
    ) {
      return { ok: false, canceled: false, error: 'Cannot sync the active data folder with itself.' };
    }

    try {
      await fs.access(selected, fsSync.constants.R_OK);
    } catch {
      return { ok: false, canceled: false, error: 'Selected folder is not accessible.' };
    }

    await saveSyncLocation(selected);
    return { ok: true, canceled: false, syncLocation: selected, accessible: true };
  });

  ipcMain.handle('app:reset-sync-baseline', async () => {
    return resetSyncBaseline();
  });

  ipcMain.handle('app:get-sync-log', async () => {
    const entries = await loadSyncLog();
    return { ok: true, entries, logPath: getSyncLogPath() };
  });

  ipcMain.handle('app:clear-sync-log', async () => {
    return clearSyncLog();
  });

  ipcMain.handle('app:run-sync', async (_event, { mode, mtimeTolMs = 0 } = {}) => {
    const syncLocation = await loadSavedSyncLocation();
    if (!syncLocation) {
      return { ok: false, error: 'No sync location configured.' };
    }

    const validModes = ['to-target', 'to-source', 'both', 'mirror-to-target', 'mirror-to-source'];
    const syncMode = validModes.includes(mode) ? mode : 'to-target';

    try {
      await fs.access(syncLocation, fsSync.constants.R_OK);
    } catch {
      return { ok: false, error: 'Sync folder is not accessible.' };
    }

    if (syncMode === 'to-target' || syncMode === 'both' || syncMode === 'mirror-to-target') {
      try {
        await fs.access(syncLocation, fsSync.constants.W_OK);
      } catch {
        return { ok: false, error: 'Sync folder is not writable.' };
      }
    }

    const writableRoot = getWritableRootDir();
    const srcDir = path.join(writableRoot, 'user');
    const destDir = await resolveSyncDestDir(syncLocation);

    const baselineMap = await loadSyncBaseline();

    const result = await syncTrees(srcDir, destDir, syncMode, {
      autoNew: false,
      baseline: { map: baselineMap, prefix: '' },
      mtimeTolMs: Math.max(0, mtimeTolMs)
    });

    const allErrors = result.errors;
    const allConflicts = result.conflicts;
    const allNewFiles = result.newFiles;
    const allAdded = result.added;
    const allDeleted = result.deleted || [];

    if (syncMode === 'mirror-to-target' || syncMode === 'mirror-to-source') {
      for (const e of result.synced) {
        baselineMap.set(e.relativePath, { mtimeMs: e.mtimeMs, size: e.size });
      }
      for (const d of allDeleted) {
        baselineMap.delete(d);
      }
      await saveSyncBaseline(baselineMap);
      _pendingBaselineEntries = [];

      const deletedSide = syncMode === 'mirror-to-target' ? 'target' : 'source';
      await appendSyncLog({
        type: 'local',
        mode: syncMode,
        target: syncLocation,
        saved: result.savedFiles || [],
        deleted: allDeleted.map(p => ({ path: p, side: deletedSide })),
        archived: [],
        errors: allErrors
      });


      _broadcastDataChanged(_event, 'general-config.html', {
        action: 'sync-complete',
        mode: syncMode,
        copied: result.copied,
        deleted: allDeleted.length,
        target: 'user',
        deletedFiles: allDeleted
      });

      return {
        ok: true,
        copied: result.copied,
        deleted: allDeleted.length,
        deletedFiles: allDeleted,
        errors: allErrors,
        conflicts: [],
        newFiles: [],
        added: allAdded,
        syncLocation
      };
    }

    // Save pending entries for baseline update after conflict resolution.
    // If there are no conflicts the baseline is committed immediately.
    _pendingBaselineEntries = result.synced.map(s => ({ relativePath: s.relativePath, mtimeMs: s.mtimeMs, size: s.size }));

    if (allConflicts.length === 0 && allNewFiles.length === 0) {
      await appendSyncLog({
        type: 'local',
        mode: syncMode,
        target: syncLocation,
        saved: result.savedFiles || [],
        deleted: [],
        archived: [],
        errors: allErrors
      });
      _broadcastDataChanged(_event, 'general-config.html', {
        action: 'sync-complete',
        target: 'user',
        mode: syncMode,
        copied: result.copied,
        added: allAdded
      });
      // All done — commit baseline now
      for (const e of _pendingBaselineEntries) {
        baselineMap.set(e.relativePath, { mtimeMs: e.mtimeMs, size: e.size });
      }
      await saveSyncBaseline(baselineMap);
      _pendingBaselineEntries = [];
    }

    return { ok: true, copied: result.copied, deleted: allDeleted.length, deletedFiles: allDeleted, errors: allErrors, conflicts: allConflicts, newFiles: allNewFiles, added: allAdded, syncLocation };
  });

  ipcMain.handle('app:read-sync-pair', async (_event, { relativePath } = {}) => {
    const syncLocation = await loadSavedSyncLocation();
    if (!syncLocation) {
      return { ok: false, error: 'No sync location configured.' };
    }
    try {
      await fs.access(syncLocation, fsSync.constants.R_OK);
    } catch {
      return { ok: false, error: 'Sync folder is not accessible.' };
    }

    const relPath = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!relPath || relPath.split('/').some(seg => seg === '..' || seg === '.')) {
      return { ok: false, error: 'Invalid path.' };
    }

    const writableRoot = getWritableRootDir();
    const srcDir = path.resolve(path.join(writableRoot, 'user'));
    const destDir = path.resolve(await resolveSyncDestDir(syncLocation));
    const srcPath = path.resolve(path.join(srcDir, relPath));
    const destPath = path.resolve(path.join(destDir, relPath));

    if (!srcPath.startsWith(srcDir + path.sep) && srcPath !== srcDir) {
      return { ok: false, error: 'Path is outside data root.' };
    }
    if (!destPath.startsWith(destDir + path.sep) && destPath !== destDir) {
      return { ok: false, error: 'Path is outside sync root.' };
    }

    try {
      const pair = await readSyncPair({ fs, path, crypto }, srcPath, destPath);
      return { ...pair, relativePath: relPath };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('app:apply-sync-choices', async (_event, { decisions = [] } = {}) => {
    const syncLocation = await loadSavedSyncLocation();
    if (!syncLocation) {
      return { ok: false, error: 'No sync location configured.' };
    }
    try {
      await fs.access(syncLocation, fsSync.constants.R_OK | fsSync.constants.W_OK);
    } catch {
      return { ok: false, error: 'Sync folder is not accessible or not writable.' };
    }

    const writableRoot = getWritableRootDir();
    const srcDir = path.join(writableRoot, 'user');
    const destDir = await resolveSyncDestDir(syncLocation);

    async function copyOne(fromPath, toPath) {
      await fs.mkdir(path.dirname(toPath), { recursive: true });
      await fs.copyFile(fromPath, toPath);
      const stat = await fs.stat(fromPath);
      await fs.utimes(toPath, stat.atime, stat.mtime).catch(() => { });
    }

    async function deleteAndPrune(targetDir, relativePath) {
      const fullPath = path.join(targetDir, relativePath);
      try {
        await fs.unlink(fullPath);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      let dir = path.dirname(fullPath);
      const resolvedTarget = path.resolve(targetDir);
      while (dir.startsWith(resolvedTarget) && dir !== resolvedTarget) {
        try {
          const entries = await fs.readdir(dir);
          if (entries.length === 0) {
            await fs.rmdir(dir);
            dir = path.dirname(dir);
          } else {
            break;
          }
        } catch {
          break;
        }
      }
    }

    let applied = 0;
    const errors = [];
    const archivedAllPaths = []; // paths where files were deleted/archived on both sides — removed from baseline
    const savedFiles = [];
    const deletedFiles = [];
    const archivedFiles = [];

    for (const decision of decisions) {
      if (decision.action === 'skip') continue;

      const relPath = String(decision.relativePath || '').replace(/\\/g, '/');
      // Validate: must not contain traversal segments
      if (relPath.split('/').some(seg => seg === '..' || seg === '.')) {
        errors.push({ relativePath: relPath, error: 'Invalid path.' });
        continue;
      }

      const srcPath = path.join(srcDir, relPath);
      const destPath = path.join(destDir, relPath);

      // Confirm resolved paths stay within their roots
      if (!srcPath.startsWith(srcDir + path.sep) && srcPath !== srcDir) {
        errors.push({ relativePath: relPath, error: 'Path is outside data root.' });
        continue;
      }
      if (!destPath.startsWith(destDir + path.sep) && destPath !== destDir) {
        errors.push({ relativePath: relPath, error: 'Path is outside sync root.' });
        continue;
      }

      try {
        if (decision.action === 'keep-source') {
          const srcExists = await fs.access(srcPath).then(() => true).catch(() => false);
          if (srcExists) {
            await copyOne(srcPath, destPath);
            applied++;
            try {
              const stat = await fs.stat(destPath);
              _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: stat.mtimeMs, size: stat.size });
              savedFiles.push({ path: relPath, direction: 'to-target', action: 'copied', size: stat.size });
            } catch {
              savedFiles.push({ path: relPath, direction: 'to-target', action: 'copied' });
            }
          } else {
            await deleteAndPrune(destDir, relPath);
            archivedAllPaths.push(relPath);
            deletedFiles.push({ path: relPath, side: 'target' });
            applied++;
          }
        } else if (decision.action === 'keep-target') {
          const destExists = await fs.access(destPath).then(() => true).catch(() => false);
          if (destExists) {
            await copyOne(destPath, srcPath);
            applied++;
            try {
              const stat = await fs.stat(srcPath);
              _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: stat.mtimeMs, size: stat.size });
              savedFiles.push({ path: relPath, direction: 'to-source', action: 'copied', size: stat.size });
            } catch {
              savedFiles.push({ path: relPath, direction: 'to-source', action: 'copied' });
            }
          } else {
            await deleteAndPrune(srcDir, relPath);
            archivedAllPaths.push(relPath);
            deletedFiles.push({ path: relPath, side: 'source' });
            applied++;
          }
        } else if (decision.action === 'delete-source') {
          await deleteAndPrune(srcDir, relPath);
          archivedAllPaths.push(relPath);
          deletedFiles.push({ path: relPath, side: 'source' });
          applied++;
        } else if (decision.action === 'delete-target') {
          await deleteAndPrune(destDir, relPath);
          archivedAllPaths.push(relPath);
          deletedFiles.push({ path: relPath, side: 'target' });
          applied++;
        } else if (decision.action === 'archive-older') {
          const [srcStat, destStat] = await Promise.all([
            fs.stat(srcPath).catch(() => null),
            fs.stat(destPath).catch(() => null),
          ]);
          if (srcStat && destStat) {
            if (srcStat.mtimeMs < destStat.mtimeMs) {
              // src is strictly older — archive it, copy dest -> src
              await bakIfExists(srcPath);
              await copyOne(destPath, srcPath);
              const s = await fs.stat(srcPath);
              _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: s.mtimeMs, size: s.size });
              archivedFiles.push({ path: relPath, side: 'source' });
              savedFiles.push({ path: relPath, direction: 'to-source', action: 'copied', size: s.size });
            } else if (destStat.mtimeMs < srcStat.mtimeMs) {
              // dest is strictly older — archive it, copy src -> dest
              await bakIfExists(destPath);
              await copyOne(srcPath, destPath);
              const s = await fs.stat(destPath);
              _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: s.mtimeMs, size: s.size });
              archivedFiles.push({ path: relPath, side: 'target' });
              savedFiles.push({ path: relPath, direction: 'to-target', action: 'copied', size: s.size });
            } else {
              // identical timestamps — archive both, neither wins
              await bakIfExists(srcPath);
              await bakIfExists(destPath);
              archivedAllPaths.push(relPath);
              archivedFiles.push({ path: relPath, side: 'both' });
            }
          } else if (srcStat) {
            await bakIfExists(srcPath);
            archivedAllPaths.push(relPath);
            archivedFiles.push({ path: relPath, side: 'source' });
          } else if (destStat) {
            await bakIfExists(destPath);
            archivedAllPaths.push(relPath);
            archivedFiles.push({ path: relPath, side: 'target' });
          }
          applied++;
        } else if (decision.action === 'archive-all') {
          await bakIfExists(srcPath);
          await bakIfExists(destPath);
          archivedAllPaths.push(relPath);
          archivedFiles.push({ path: relPath, side: 'both' });
          applied++;
        } else if (decision.action === 'bak-source') {
          // Rename app (source) file to .bak, then copy sync -> app if sync file exists
          await bakIfExists(srcPath);
          archivedFiles.push({ path: relPath, side: 'source' });
          const destExists = await fs.access(destPath).then(() => true).catch(() => false);
          if (destExists) {
            await copyOne(destPath, srcPath);
            const stat = await fs.stat(srcPath);
            _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: stat.mtimeMs, size: stat.size });
            savedFiles.push({ path: relPath, direction: 'to-source', action: 'copied', size: stat.size });
          } else {
            archivedAllPaths.push(relPath);
          }
          applied++;
        } else if (decision.action === 'bak-target') {
          // Rename sync (target) file to .bak, then copy app -> sync if app file exists
          await bakIfExists(destPath);
          archivedFiles.push({ path: relPath, side: 'target' });
          const srcExists = await fs.access(srcPath).then(() => true).catch(() => false);
          if (srcExists) {
            await copyOne(srcPath, destPath);
            const stat = await fs.stat(destPath);
            _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: stat.mtimeMs, size: stat.size });
            savedFiles.push({ path: relPath, direction: 'to-target', action: 'copied', size: stat.size });
          } else {
            archivedAllPaths.push(relPath);
          }
          applied++;
        } else if (decision.action === 'merge') {
          if (typeof decision.mergedContent !== 'string') {
            errors.push({ relativePath: relPath, error: 'Missing merged content.' });
            continue;
          }
          const backupBeforeMerge = Boolean(decision.backupBeforeMerge);
          const stat = await writeMergedSyncFile(
            { fs, path },
            srcPath,
            destPath,
            decision.mergedContent,
            { backupBeforeMerge, bakIfExists }
          );
          if (backupBeforeMerge) {
            archivedFiles.push({ path: relPath, side: 'both' });
          }
          _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: stat.mtimeMs, size: stat.size });
          savedFiles.push({ path: relPath, direction: 'both', action: 'merged', size: stat.size });
          applied++;
        }
      } catch (err) {
        errors.push({ relativePath: relPath, error: String(err?.message || err) });
      }
    }

    // Commit the baseline
    try {
      const baselineMap = await loadSyncBaseline();
      for (const e of _pendingBaselineEntries) {
        baselineMap.set(e.relativePath, { mtimeMs: e.mtimeMs, size: e.size });
      }
      for (const p of archivedAllPaths) baselineMap.delete(p);
      await saveSyncBaseline(baselineMap);
    } catch (err) {
      console.error('Failed to update sync baseline after apply:', err);
    } finally {
      _pendingBaselineEntries = [];
    }

    if (savedFiles.length > 0 || deletedFiles.length > 0 || archivedFiles.length > 0 || errors.length > 0) {
      await appendSyncLog({
        type: 'local',
        mode: 'conflicts-resolved',
        target: syncLocation,
        saved: savedFiles,
        deleted: deletedFiles,
        archived: archivedFiles,
        errors
      });
    }

    _broadcastDataChanged(_event, 'general-config.html', {
      action: 'sync-complete',
      applied,
      target: 'user'
    });

    return { ok: true, applied, errors };
  });

  ipcMain.handle('app:get-auto-sync', async () => {
    const [autoSync, syncLocation] = await Promise.all([
      loadAutoSyncEnabled(),
      loadSavedSyncLocation()
    ]);
    return { ok: true, autoSync, syncLocation };
  });

  ipcMain.handle('app:set-auto-sync', async (_event, { enabled } = {}) => {
    const autoSync = enabled === true;
    await saveAutoSyncEnabled(autoSync);
    if (autoSync) {
      startAutoSyncWatcher();
    } else {
      stopAutoSyncWatcher();
    }
    return { ok: true, autoSync };
  });

  return {
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
    runWebdavTransfer,
    loadAutoSyncEnabled,
    startAutoSyncWatcher
  };
}

module.exports = { registerBackupSyncIpc };
